import 'dart:collection';
import 'dart:convert';

import 'package:flutter/foundation.dart';

import 'diag_sanitize.dart';
import 'diag_store.dart';

/// 오류 기록(「더보기 › 문제 알리기 › 오류 기록 보내기」의 재료). **기기 안에만 쌓고, 자동으로 보내지 않는다.**
///
/// 두 고리 버퍼:
/// * 발자취(breadcrumb) 최근 [maxCrumbs]개 — 화면 이동·기도 시작/끝·성당 들어감/나감·백업·공유 같은 동작과
///   데이터 경로의 결과(저장 실패·자동 백업 사유 코드 no_folder/no_perm/gone·가져오기 오류).
/// * 오류 최근 [maxErrors]개 — Flutter·Dart 처리되지 않은 오류, 성당 웹 장면의 JS 오류, 안드로이드 쪽 예외.
///
/// 한 줄 = JSON 하나(JSON Lines)로 앱 전용 폴더 파일에 덧붙여([attach]) 앱이 죽어도 다음 실행에 남는다.
/// 같은 오류는 [dupWindow] 안에서 한 줄로 세고(`n`), 새 오류는 1분에 [maxNewErrorsPerMinute]개까지만.
/// 값은 [DiagSanitize]를 지난 것만 들어간다(글·이름·계정 값 없음). 절대 던지지 않는다.
///
/// 줄 모양:
/// * 파일 머리 `{k:'m', sess}` — 압축할 때 맨 앞에(실행 번호)
/// * 발자취 `{k:'c', t:ms, lv:'i'|'d'|'w', ev:'prayer_start', d:{set:'joyful', …}}` — lv: i=동작, d=데이터 경로, w=주의
/// * 오류 `{k:'e', id, t:ms, src:'flutter'|'platform'|'js'|'native'|'native_crash'|'caught', type, msg, stack, lib?, n, last?, x?}`
///   (x=true: 예상하지 못한 오류 — 「문제가 생겼어요」 안내를 띄운 종류)
class DiagRecorder {
  DiagRecorder({
    this.maxCrumbs = 500,
    this.maxErrors = 100,
    this.dupWindow = const Duration(seconds: 60),
    this.maxNewErrorsPerMinute = 30,
    int Function()? clock,
  }) : _clock = clock ?? _wallMs {
    _bootMs = _clock();
  }

  static int _wallMs() => DateTime.now().millisecondsSinceEpoch;

  /// 앱 전체에서 하나. 시험은 [debugReplace]로 바꾼다.
  static DiagRecorder get instance => _instance;
  static DiagRecorder _instance = DiagRecorder();

  @visibleForTesting
  static DiagRecorder debugReplace(DiagRecorder r) => _instance = r;

  final int maxCrumbs;
  final int maxErrors;
  final Duration dupWindow;
  final int maxNewErrorsPerMinute;
  final int Function() _clock;
  late final int _bootMs;

  final ListQueue<Map<String, Object?>> _crumbs = ListQueue();
  final ListQueue<Map<String, Object?>> _errors = ListQueue();
  final Map<String, Map<String, Object?>> _recent = {};
  final ListQueue<int> _newAt = ListQueue();
  int _seq = 0;

  DiagStore? _store;
  int _fileLines = 0;

  /// 이번 실행 번호(파일에 남은 지난 실행 수 + 1). [attach] 전에는 0.
  int session = 0;

  /// 1분 상한에 걸려 버린 새 오류 수(이번 실행).
  int dropped = 0;

  /// 예상하지 못한 오류가 생길 때마다 하나씩 는다(「문제가 생겼어요」 안내가 듣는다).
  final ValueNotifier<int> unexpected = ValueNotifier(0);

  /// 이번 실행에서 생긴 예상하지 못한 오류 수.
  int get unexpectedCount => unexpected.value;

  bool get attached => _store != null;

  /// 오래된 것부터.
  List<Map<String, Object?>> get crumbs => List.unmodifiable(_crumbs);
  List<Map<String, Object?>> get errors => List.unmodifiable(_errors);

  // ---- 발자취 ---------------------------------------------------------------

  /// 동작·사건 하나. [lv]: `i` 동작, `d` 데이터 경로 결과, `w` 주의.
  void crumb(String ev, [Map<String, Object?>? d, String lv = 'i']) {
    try {
      final e = <String, Object?>{
        'k': 'c',
        't': _clock(),
        'lv': lv,
        'ev': DiagSanitize.name(ev),
      };
      final det = DiagSanitize.detail(d);
      if (det.isNotEmpty) e['d'] = det;
      _crumbs.addLast(e);
      while (_crumbs.length > maxCrumbs) {
        _crumbs.removeFirst();
      }
      _persist(e);
    } catch (_) {
      // 기록이 본 동작을 막지 않는다.
    }
  }

  // ---- 오류 ------------------------------------------------------------------

  /// 오류 객체 하나를 기록한다. [unexpectedError]면 「문제가 생겼어요」 안내 대상이다.
  void error(
    String src,
    Object error, {
    StackTrace? stack,
    String? lib,
    bool unexpectedError = false,
  }) {
    try {
      add(
        src: src,
        type: DiagSanitize.typeName(error),
        message: error.toString(),
        stack: stack?.toString(),
        lib: lib,
        unexpectedError: unexpectedError,
      );
    } catch (_) {}
  }

  /// 이미 글로 된 오류(웹·네이티브가 보낸 것)를 기록한다. 문구·스택은 여기서 거른다.
  void add({
    required String src,
    required String type,
    String? message,
    String? stack,
    String? lib,
    Map<String, Object?>? extra,
    bool unexpectedError = false,
    int? at,
  }) {
    try {
      final now = at ?? _clock();
      final msg = DiagSanitize.text(message);
      final s = DiagSanitize.name(src);
      final ty = DiagSanitize.name(type);
      final key = '$s|$ty|${msg.length > 120 ? msg.substring(0, 120) : msg}';
      _recent.removeWhere(
        (_, e) =>
            now - ((e['last'] ?? e['t']) as int) > dupWindow.inMilliseconds,
      );
      final dup = _recent[key];
      if (dup != null) {
        final n = ((dup['n'] as int?) ?? 1) + 1;
        dup['n'] = n;
        dup['last'] = now;
        // 같은 오류가 몰려도 파일은 1·2·4·8…번째에만 고쳐 쓴다(읽을 때 같은 id의 마지막 줄이 이긴다).
        if (n & (n - 1) == 0) _persist(dup);
        return;
      }
      while (_newAt.isNotEmpty && now - _newAt.first > 60000) {
        _newAt.removeFirst();
      }
      if (_newAt.length >= maxNewErrorsPerMinute) {
        dropped++;
        return;
      }
      _newAt.addLast(now);
      final e = <String, Object?>{
        'k': 'e',
        'id': '$_bootMs.${_seq++}',
        't': now,
        'src': s,
        'type': ty,
        'msg': msg,
        'n': 1,
      };
      final st = DiagSanitize.stack(stack);
      if (st.isNotEmpty) e['stack'] = st;
      if (lib != null && lib.isNotEmpty) {
        e['lib'] = DiagSanitize.text(lib, max: 60);
      }
      final ex = DiagSanitize.detail(extra);
      if (ex.isNotEmpty) e['d'] = ex;
      if (unexpectedError) e['x'] = true;
      _errors.addLast(e);
      while (_errors.length > maxErrors) {
        _errors.removeFirst();
      }
      _recent[key] = e;
      _persist(e);
      if (unexpectedError) unexpected.value = unexpected.value + 1;
    } catch (_) {}
  }

  // ---- 저장 ------------------------------------------------------------------

  /// 디스크 저장소를 붙인다(실행마다 한 번). 지난 실행의 기록을 읽어 앞에 두고, 붙기 전에 쌓인 것을 뒤에
  /// 이어 붙인 뒤 파일을 한 번 압축한다. 이번 실행의 첫 발자취는 `app_start{sess}`.
  void attach(DiagStore store) {
    if (_store != null) return;
    try {
      final early = [..._crumbs, ..._errors]
        ..sort((a, b) => (a['t'] as int).compareTo(b['t'] as int));
      _crumbs.clear();
      _errors.clear();
      final byId = <String, Map<String, Object?>>{};
      var lastSess = 0;
      for (final line in store.readLines()) {
        Map<String, Object?> m;
        try {
          final j = jsonDecode(line);
          if (j is! Map) continue;
          m = j.cast<String, Object?>();
        } catch (_) {
          continue; // 끝이 잘린 줄(쓰는 중 종료) — 버린다
        }
        if (m['k'] == 'm') {
          // 파일 머리(압축 때 쓴다): 지난 실행 번호 — 발자취 고리에서 app_start 가 밀려나도 번호가 이어진다.
          final sNo = m['sess'];
          if (sNo is int && sNo > lastSess) lastSess = sNo;
          continue;
        }
        if (m['t'] is! int) continue;
        if (m['k'] == 'c') {
          _crumbs.addLast(m);
          if (m['ev'] == 'app_start') {
            final d = m['d'];
            final sNo = d is Map ? d['sess'] : null;
            if (sNo is int && sNo > lastSess) lastSess = sNo;
          }
        } else if (m['k'] == 'e' && m['id'] is String) {
          final id = m['id'] as String;
          final old = byId[id];
          if (old != null) {
            old
              ..clear()
              ..addAll(m);
          } else {
            byId[id] = m;
            _errors.addLast(m);
          }
        }
      }
      session = lastSess + 1;
      _crumbs.addLast(<String, Object?>{
        'k': 'c',
        't': _bootMs,
        'lv': 'i',
        'ev': 'app_start',
        'd': {'sess': session},
      });
      for (final e in early) {
        (e['k'] == 'e' ? _errors : _crumbs).addLast(e);
      }
      while (_crumbs.length > maxCrumbs) {
        _crumbs.removeFirst();
      }
      while (_errors.length > maxErrors) {
        _errors.removeFirst();
      }
      _store = store;
      _compact();
    } catch (_) {}
  }

  void _persist(Map<String, Object?> e) {
    final s = _store;
    if (s == null) return;
    try {
      s.append(jsonEncode(e));
      _fileLines++;
      if (_fileLines > 2 * (maxCrumbs + maxErrors)) _compact();
    } catch (_) {}
  }

  void _compact() {
    final s = _store;
    if (s == null) return;
    final all = [..._errors, ..._crumbs]
      ..sort((a, b) => (a['t'] as int).compareTo(b['t'] as int));
    s.rewrite([
      jsonEncode({'k': 'm', 'sess': session}),
      for (final e in all) jsonEncode(e),
    ]);
    _fileLines = all.length + 1;
  }

  /// 모두 지운다(메모리·파일).
  void clear() {
    _crumbs.clear();
    _errors.clear();
    _recent.clear();
    _newAt.clear();
    dropped = 0;
    _store?.rewrite(const []);
    _fileLines = 0;
  }
}

/// 어디서나 한 줄로 부르는 입구(초기화 전에도 메모리에 쌓인다. 절대 던지지 않는다).
///
/// * [crumb]  사용자 동작 — 기도 시작/끝, 성당 들어감/나감, 백업·공유 단추
/// * [data]   데이터 경로 결과 — 저장 실패, 자동 백업 사유 코드, 가져오기 오류
/// * [caught] 잡아서 처리한 예외 중 남겨 둘 것(안내는 띄우지 않는다)
///
/// 세부 값은 열거형 이름·숫자·참거짓·짧은 코드만 남고, 그 밖의 글은 길이(`<n>`)로 바뀐다.
abstract final class Diag {
  static void crumb(String ev, [Map<String, Object?>? d]) =>
      DiagRecorder.instance.crumb(ev, d);

  static void data(String ev, [Map<String, Object?>? d]) =>
      DiagRecorder.instance.crumb(ev, d, 'd');

  static final Map<String, int> _onceAt = {};

  /// [data]를 같은 [key]로는 [period]에 한 번만(저장마다 되풀이되는 실패가 발자취를 덮지 않게 — 독서공방 rjLogOnce).
  static bool dataOnce(
    String key,
    Duration period,
    String ev, [
    Map<String, Object?>? d,
  ]) {
    final now = DateTime.now().millisecondsSinceEpoch;
    final last = _onceAt[key];
    if (last != null && now - last < period.inMilliseconds) return false;
    _onceAt[key] = now;
    data(ev, d);
    return true;
  }

  static void caught(String where, Object error, [StackTrace? stack]) =>
      DiagRecorder.instance.add(
        src: 'caught',
        type: DiagSanitize.typeName(error),
        message: error.toString(),
        stack: stack?.toString(),
        lib: where,
      );
}
