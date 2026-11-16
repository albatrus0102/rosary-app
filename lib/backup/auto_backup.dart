import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'backup_format.dart';
import 'backup_platform.dart';
import 'backup_registry.dart';

/// 시계가 크게 앞서 있던 때 적힌 시각은 믿지 않는다(독서공방 backupClockAhead, H11). 한 시간 여유는
/// 기기 사이 작은 어긋남 몫. 안 보면 「마지막 백업」이 미래라 자동 백업·안내가 그 미래까지 멈춘다.
const Duration backupClockSkew = Duration(hours: 1);

bool backupClockAhead(DateTime? t, DateTime now) =>
    t != null && t.difference(now) > backupClockSkew;

/// 자동 백업 폴더 파일 이름 규칙(순수 함수 — 시험으로 고정). **지우는 대상은 이 형식을 통과한 이름만**:
/// 사용자가 그 폴더에 둔 다른 파일·수동 내보내기(`rosarium-export-…`)는 절대 건드리지 않는다.
abstract final class AutoBackupFiles {
  static const int keepDays = 7;
  static final RegExp _final = RegExp(
    r'^rosarium-backup-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.json$',
  );
  static final RegExp _temp = RegExp(
    r'^rosarium-backup-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.part\.json$',
  );

  static String nameFor(DateTime t) {
    String two(int v) => v.toString().padLeft(2, '0');
    return '${BackupFormat.autoPrefix}${BackupFormat.dayKey(t)}-'
        '${two(t.hour)}${two(t.minute)}${two(t.second)}.json';
  }

  static DateTime? _parse(RegExp re, String name) {
    final m = re.firstMatch(name);
    if (m == null) return null;
    final g = [for (var i = 1; i <= 6; i++) int.parse(m.group(i)!)];
    final t = DateTime(g[0], g[1], g[2], g[3], g[4], g[5]);
    // 실제 달력에 있는 날짜·시각인가(2월 31일·25시 거부).
    if (t.year != g[0] ||
        t.month != g[1] ||
        t.day != g[2] ||
        t.hour != g[3] ||
        t.minute != g[4] ||
        t.second != g[5]) {
      return null;
    }
    return t;
  }

  /// 우리가 만든 자동 백업 파일 이름인가(형식 + 유효한 날짜).
  static DateTime? timeOf(String name) => _parse(_final, name);
  static bool isAutoName(String name) => timeOf(name) != null;

  /// 쓰다 끊긴 임시 파일 이름인가.
  static DateTime? tempTimeOf(String name) => _parse(_temp, name);

  /// 정리할 이름들. 규칙:
  /// - 우리 형식만 본다. 하루에 한 파일(그날 가장 최근 것)만 남기고, 최근 [keep]일 치를 남긴다.
  /// - 「지금+1일」보다 뒤 이름(시계가 앞서 있던 때 만든 것)은 가장 오래된 것으로 친다(B-15).
  /// - [protect](방금 쓴 파일)는 어떤 경우에도 지우지 않는다.
  /// - 한 시간 넘은 임시 파일은 지운다(지금 쓰는 중일 수 있는 최근 것은 남긴다).
  static List<String> toDelete(
    List<String> names, {
    required DateTime now,
    int keep = keepDays,
    String? protect,
  }) {
    final out = <String>[];
    final futureCut = now.add(const Duration(days: 1));
    final staleCut = now.subtract(const Duration(hours: 1));
    final valid = <String, DateTime>{};
    for (final n in names) {
      final t = timeOf(n);
      if (t != null) {
        valid[n] = t;
        continue;
      }
      final tt = tempTimeOf(n);
      if (tt != null && tt.isBefore(staleCut) && n != protect) out.add(n);
    }
    // 날 묶음: 미래 이름은 각자 「가장 오래된」 묶음.
    final byDay = <String, List<String>>{};
    for (final e in valid.entries) {
      final key = e.value.isAfter(futureCut)
          ? '0-future-${e.key}'
          : BackupFormat.dayKey(e.value);
      (byDay[key] ??= []).add(e.key);
    }
    final days = byDay.keys.toList()..sort((a, b) => b.compareTo(a));
    // 방금 쓴 파일의 날은 늘 남는 날에 든다.
    final protectDay = protect == null
        ? null
        : byDay.entries
              .firstWhere(
                (e) => e.value.contains(protect),
                orElse: () => const MapEntry('', []),
              )
              .key;
    final kept = <String>[];
    if (protectDay != null && protectDay.isNotEmpty) kept.add(protectDay);
    for (final d in days) {
      if (kept.length >= keep) break;
      if (!kept.contains(d)) kept.add(d);
    }
    for (final d in days) {
      final files = byDay[d]!..sort((a, b) => valid[b]!.compareTo(valid[a]!));
      if (!kept.contains(d)) {
        out.addAll(files.where((f) => f != protect));
        continue;
      }
      // 남기는 날: 그날 하나만(방금 쓴 것이 그날이면 그것을).
      final keepOne = files.contains(protect) ? protect! : files.first;
      out.addAll(files.where((f) => f != keepOne && f != protect));
    }
    return out;
  }

  /// 최신부터 읽어 볼 순서(미래 이름은 맨 뒤).
  static List<String> readOrder(List<String> names, DateTime now) {
    final futureCut = now.add(const Duration(days: 1));
    final valid = [
      for (final n in names)
        if (timeOf(n) case final t?) (n, t),
    ];
    int rank((String, DateTime) x) =>
        x.$2.isAfter(futureCut) ? 0 : x.$2.millisecondsSinceEpoch;
    valid.sort((a, b) => rank(b).compareTo(rank(a)));
    return [for (final v in valid) v.$1];
  }
}

/// 백업 상태를 담는 내부 키(전부 `backup.` — 등록부에서 기기별로 빠진다).
abstract final class BackupKeys {
  static const _p = BackupRegistry.internalPrefix;
  static const autoEnabled = '${_p}auto.enabled';
  static const lastBackupAt = '${_p}last_at';
  static const lastFileAt = '${_p}manual.last_at';
  static const autoLastOkAt = '${_p}auto.last_ok_at';
  static const autoLastHash = '${_p}auto.last_hash';
  static const autoFailN = '${_p}auto.fail_n';
  static const autoFailCode = '${_p}auto.fail_code';
  static const autoFailAt = '${_p}auto.fail_at';
  static const autoEverOk = '${_p}auto.ever_ok';
  static const nudgeDismissedAt = '${_p}nudge.dismissed_at';
  static const monthlyDismissedAt = '${_p}nudge.monthly_dismissed_at';
}

/// 자동 백업을 확인하는 때.
enum BackupTrigger {
  /// 앱을 열 때.
  launch,

  /// 앱으로 돌아올 때.
  resume,

  /// 앱을 떠날 때(일시정지).
  pause,

  /// 켜는 순간·「지금 백업」 — 주기와 무관.
  force,
}

enum AutoOutcome {
  off,
  noFolder,
  unchanged,
  notDue,
  written,
  failed,

  /// 쓰지 않고 멈췄다: 이 기기가 비어 있는데 폴더에 백업이 있다(새 기기·재설치) — 빈 상태로
  /// 그 백업을 밀어내지 않는다. 또는 금고가 「기록이 줄었어요」를 묻는 중이다.
  held,
}

/// 자동 백업 상태(설정 화면·안내 카드가 읽는다).
class AutoBackupStatus {
  const AutoBackupStatus({
    required this.supported,
    required this.wanted,
    required this.folder,
    required this.lastOkAt,
    required this.failN,
    required this.failCode,
    required this.everOk,
  });

  final bool supported;

  /// 사용자가 켜 두었는가(폴더를 골라야 실제로 켜진다 — [on]).
  final bool wanted;
  final FolderInfo folder;
  final DateTime? lastOkAt;
  final int failN;
  final String failCode;

  /// 이 기기에서 한 번이라도 성공했는가(폴더를 「잃음」과 「아직 안 고름」을 가른다).
  final bool everOk;

  bool get on => wanted && folder.state == FolderState.ok;

  /// 켜 두었는데 폴더를 지금 쓸 수 없다 → 꺼짐으로 보이고 다시 고르기를 안내한다.
  bool get needsFolder =>
      supported &&
      wanted &&
      folder.state != FolderState.ok &&
      folder.state != FolderState.unsupported;

  bool get lost => needsFolder && everOk;
}

/// 자동 백업: 한 번 고른 폴더(SAF)에 하루 한 파일, 최근 7일 치를 남긴다. 폴더 파일은 앱을 지워도 남는다.
///
/// 독서공방 autoBackupDue·autoBackupCheck·autoBackupPayloadB64·autoBackupOn 설계를 옮겼다:
/// - 켜기와 폴더 고르기는 한 흐름([enable]) — 폴더를 골라야 켜진다(폴더 없는 「켜짐」 상태를 만들지 않는다).
/// - 쓰기 직전마다 폴더를 다시 확인(권한 회수·폴더 삭제·재설치).
/// - 판정은 [due] 하나(순수). 바뀐 게 없으면 쓰지 않는다. 같은 때 두 번 돌지 않는다.
/// - 실패는 사유 코드와 횟수로 남기고 화면에 보인다(조용히 삼키지 않는다).
class AutoBackup extends ChangeNotifier {
  AutoBackup({
    required this.platform,
    required this.prefs,
    required this.buildPayload,
    this.holdWrites,
    DateTime Function()? now,
  }) : _now = now ?? DateTime.now;

  final BackupPlatform platform;
  final SharedPreferences prefs;

  /// 지금 저장된 것으로 백업 한 벌을 만든다(금고·내보내기와 같은 것).
  final BackupDocument Function() buildPayload;

  /// true면 쓰지 않는다(금고가 되살리기를 묻는 중 — 줄어든 상태로 폴더의 좋은 백업을 정리하지 않게).
  final bool Function()? holdWrites;
  final DateTime Function() _now;

  FolderInfo _folder = const FolderInfo(FolderState.never);
  Future<AutoOutcome>? _running;

  DateTime? _time(String key) {
    final ms = prefs.getInt(key);
    return ms == null ? null : DateTime.fromMillisecondsSinceEpoch(ms);
  }

  AutoBackupStatus get status => AutoBackupStatus(
    supported: platform.supported,
    wanted: prefs.getBool(BackupKeys.autoEnabled) ?? false,
    folder: platform.supported
        ? _folder
        : const FolderInfo(FolderState.unsupported),
    lastOkAt: _time(BackupKeys.autoLastOkAt),
    failN: prefs.getInt(BackupKeys.autoFailN) ?? 0,
    failCode: prefs.getString(BackupKeys.autoFailCode) ?? '',
    everOk: prefs.getBool(BackupKeys.autoEverOk) ?? false,
  );

  /// 폴더 상태를 다시 확인한다(실행·복귀·고른 뒤·쓰기 전).
  Future<FolderInfo> refreshFolder() async {
    if (!platform.supported) {
      return _folder = const FolderInfo(FolderState.unsupported);
    }
    final before = _folder.state;
    _folder = await platform.folderState();
    if (before != _folder.state) notifyListeners();
    return _folder;
  }

  /// 지금 써야 하나(순수 판정 — 시험이 가짜 시계로 고정한다).
  static bool due({
    required BackupTrigger trigger,
    required DateTime now,
    required DateTime? lastOk,
    required bool changed,
  }) {
    if (trigger == BackupTrigger.force) return true;
    if (lastOk == null || backupClockAhead(lastOk, now)) return true;
    if (!changed) return false;
    if (now.difference(lastOk) >= const Duration(hours: 24)) return true;
    // 앱을 떠날 때는 바뀐 것을 그날 파일로 남긴다(정리가 하루 한 파일로 맞춘다).
    return trigger == BackupTrigger.pause;
  }

  /// 확인하고, 때가 됐으면 쓴다. 이미 도는 중이면 그 결과를 함께 기다린다.
  Future<AutoOutcome> run(BackupTrigger trigger) {
    return _running ??= _run(trigger).whenComplete(() => _running = null);
  }

  Future<AutoOutcome> _run(BackupTrigger trigger) async {
    if (!(prefs.getBool(BackupKeys.autoEnabled) ?? false) ||
        !platform.supported) {
      return AutoOutcome.off;
    }
    final folder = await refreshFolder();
    if (folder.state != FolderState.ok) {
      await _fail('no_folder:${folder.code}');
      return AutoOutcome.noFolder;
    }
    final BackupDocument doc;
    try {
      doc = buildPayload();
    } catch (e) {
      await _fail('build:${e.runtimeType}');
      return AutoOutcome.failed;
    }
    if (holdWrites?.call() ?? false) return AutoOutcome.held;
    if (doc.records.isEmpty &&
        doc.prefs.length <= 3 &&
        await _folderHasRecords()) {
      // 갓 설치한 빈 기기의 첫 백업이 폴더의 진짜 백업을 하루 한 파일 정리로 지우지 않게.
      return AutoOutcome.held;
    }
    final now = _now();
    final hash = doc.dataHash;
    final changed = hash != prefs.getString(BackupKeys.autoLastHash);
    if (!changed && trigger != BackupTrigger.force) {
      final last = _time(BackupKeys.autoLastOkAt);
      if (last != null && !backupClockAhead(last, now)) {
        return AutoOutcome.unchanged;
      }
    }
    if (!due(
      trigger: trigger,
      now: now,
      lastOk: _time(BackupKeys.autoLastOkAt),
      changed: changed,
    )) {
      return AutoOutcome.notDue;
    }
    final name = AutoBackupFiles.nameFor(now);
    final String text;
    try {
      text = doc.encode();
    } catch (e) {
      await _fail('encode:${e.runtimeType}');
      return AutoOutcome.failed;
    }
    final r = await platform.writeFolderFile(name, text);
    if (!r.ok) {
      await _fail(r.code);
      return AutoOutcome.failed;
    }
    final ms = now.millisecondsSinceEpoch;
    await prefs.setInt(BackupKeys.autoLastOkAt, ms);
    await prefs.setInt(BackupKeys.lastBackupAt, ms);
    await prefs.setString(BackupKeys.autoLastHash, hash);
    await prefs.setBool(BackupKeys.autoEverOk, true);
    await prefs.setInt(BackupKeys.autoFailN, 0);
    await prefs.remove(BackupKeys.autoFailCode);
    // 정리는 쓰기 성공 뒤, 결과와 따로 — 정리가 실패해도 방금 쓴 백업은 성공이다(파일이 쌓일 뿐).
    await _prune(protect: name);
    notifyListeners();
    return AutoOutcome.written;
  }

  Future<bool> _folderHasRecords() async {
    final latest = await readLatest();
    return latest != null && latest.$2.records.isNotEmpty;
  }

  Future<void> _prune({required String protect}) async {
    try {
      final list = await platform.listFolderFiles();
      if (!list.ok) {
        debugPrint('auto backup: list failed (${list.code})');
        return;
      }
      final names = [for (final f in list.value!) f.name];
      for (final n in AutoBackupFiles.toDelete(
        names,
        now: _now(),
        protect: protect,
      )) {
        if (!await platform.deleteFolderFile(n)) {
          debugPrint('auto backup: prune delete failed');
        }
      }
    } catch (e) {
      debugPrint('auto backup: prune failed (${e.runtimeType})');
    }
  }

  Future<void> _fail(String code) async {
    final safe = code.replaceAll(RegExp(r'[^A-Za-z0-9_:.-]'), '_');
    debugPrint('auto backup failed: $safe');
    try {
      await prefs.setInt(
        BackupKeys.autoFailN,
        (prefs.getInt(BackupKeys.autoFailN) ?? 0) + 1,
      );
      await prefs.setString(
        BackupKeys.autoFailCode,
        safe.length > 60 ? safe.substring(0, 60) : safe,
      );
      await prefs.setInt(BackupKeys.autoFailAt, _now().millisecondsSinceEpoch);
    } catch (e) {
      debugPrint('auto backup: fail note failed (${e.runtimeType})');
    }
    notifyListeners();
  }

  /// 켜기 = 폴더 고르기까지 한 흐름. 폴더가 이미 쓸 수 있으면 바로 켜고, 아니면 선택기를 연다.
  /// 고르지 않으면 꺼진 채로 둔다. 켜지면 곧바로 첫 백업을 한다.
  Future<EnableResult> enable({bool repick = false}) async {
    if (!platform.supported) return EnableResult.unsupported;
    final folder = repick ? null : await refreshFolder();
    if (folder?.state != FolderState.ok) {
      final picked = await platform.pickFolder();
      if (!picked.ok) {
        await refreshFolder();
        notifyListeners();
        return picked.cancelled ? EnableResult.cancelled : EnableResult.failed;
      }
      _folder = picked.value!;
    }
    await prefs.setBool(BackupKeys.autoEnabled, true);
    notifyListeners();
    final first = await run(BackupTrigger.force);
    return switch (first) {
      AutoOutcome.written => EnableResult.onAndBackedUp,
      AutoOutcome.held => EnableResult.onFoundExisting,
      _ => EnableResult.onButFirstFailed,
    };
  }

  /// 끄기: 폴더 권한도 놓아준다(쓰지 않을 폴더 권한을 붙들지 않는다). 폴더의 파일은 그대로 둔다.
  Future<void> disable() async {
    await prefs.setBool(BackupKeys.autoEnabled, false);
    try {
      await platform.releaseFolder();
    } catch (e) {
      debugPrint('auto backup: release failed (${e.runtimeType})');
    }
    await refreshFolder();
    notifyListeners();
  }

  /// 폴더에서 가장 최근의 **온전한** 백업을 읽는다. 쓰다 끊긴(깨진) 파일은 다음 옛 파일로 물러나되,
  /// 최신이 너무 커서 못 읽으면 옛 파일로 내려가지 않는다(그 사이 기록이 조용히 사라지지 않게).
  Future<(String, BackupDocument)?> readLatest() async {
    final list = await platform.listFolderFiles();
    if (!list.ok) return null;
    final names = [for (final f in list.value!) f.name];
    final sizes = {for (final f in list.value!) f.name: f.size};
    for (final n in AutoBackupFiles.readOrder(names, _now()).take(5)) {
      if ((sizes[n] ?? 0) > BackupFormat.maxFileChars) return null;
      final r = await platform.readFolderFile(n);
      if (r.code == 'too_big') return null;
      if (!r.ok) continue;
      final doc = BackupCodec.decode(r.value!).document;
      if (doc != null) return (n, doc);
    }
    return null;
  }
}

enum EnableResult {
  onAndBackedUp,

  /// 켜졌고, 이 기기는 비어 있는데 폴더에 백업이 있다 — 되살릴지 묻는다.
  onFoundExisting,
  onButFirstFailed,
  cancelled,
  failed,
  unsupported,
}
