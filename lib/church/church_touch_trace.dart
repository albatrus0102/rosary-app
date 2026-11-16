import 'dart:async';
import 'dart:collection';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';

import '../app/theme.dart';
import 'church_theme.dart';
import 'dev_glass.dart';

/// 성당 터치·입력 기록(개발용 APK 전용, [DevGlass.enabled]).
///
/// 기기에서만 일어나는 입력 고장(예: 조이스틱을 잡은 채 다른 손가락으로 시점 돌리기)을 사용자가 말로 설명하지 않고
/// 파일 하나로 보낼 수 있게, 성당 안에 있는 동안 다음을 고리 버퍼(최근 [capacity]개 또는 [window])에 쌓는다.
///
/// * `s:'f'`  Flutter 가 본 포인터(down/move/up/cancel: 시각·id·종류·위치·누가 받았나 = stick/look/pinch/view/hud/web)와 분류 결정(`k:'dec'`).
/// * `s:'tx'` 웹으로 보낸 입력 메시지(setJoystick·setInput·tapAt·cancelWalk: 내용·시각, 실패·init 전 버림).
/// * `s:'js'` 웹이 받은 포인터 이벤트·setInput, 그 결과 yaw/pitch, 자동 따라가기가 yaw 를 바꿨는가, 카메라 리그 상태(main.js 가 0.5초마다 묶어 보냄).
///
/// 내보내기는 JSON Lines: 첫 줄은 머리(`type:'header'`: 기기·화면·접힘·웹뷰·앱 빌드), 그 뒤 한 줄에 한 사건.
/// `tools/church_web/analyze_touch_trace.mjs` 가 읽어 요약한다. 일반 빌드에서는 [on]이 false 라 아무것도 쌓지 않는다.
class ChurchTouchTrace {
  ChurchTouchTrace({
    this.capacity = 5000,
    this.window = const Duration(minutes: 2),
    int Function()? clock,
  }) : _clock = clock ?? _wallMs;

  static int _wallMs() => DateTime.now().millisecondsSinceEpoch;

  /// 앱 전체에서 하나.
  static final ChurchTouchTrace instance = ChurchTouchTrace();

  /// 시험에서만 켠다(개발용 빌드가 아니어도 기록).
  @visibleForTesting
  static bool debugForce = false;

  /// 기록 중인가(개발용 빌드). 일반 빌드에서는 컴파일 상수 false 와 같다.
  static bool get on => DevGlass.enabled || debugForce;

  /// 웹뷰 패키지(안드로이드 구현) 판. 웹뷰 자체 판(Chrome/…)은 웹이 보낸 userAgent 로 머리에 들어간다.
  static const String webviewPlugin =
      'webview_flutter 4.14.1 / webview_flutter_android 4.14.1';

  /// 개발용 빌드가 넣는 빌드 표시(tools/build_dev_apk.sh: 커밋·시각).
  static const String buildId = String.fromEnvironment('ROSARIUM_BUILD_ID');

  final int capacity;
  final Duration window;
  final int Function() _clock;
  final ListQueue<Map<String, Object?>> _buf = ListQueue();

  /// 지금 닿아 있는 손가락과 그것을 맡은 쪽(진단 표시·기록용). 전체 화면 입력 층이 정한다.
  final Map<int, String> roles = {};

  /// 전체 화면 입력 층(ChurchMoveZone)이 이미 기록한 손가락. 바깥 기록 층([ChurchTouchTraceLayer])은 이것을 건너뛴다.
  final Set<int> claimed = {};

  // --- 진단 표시용 셈(누적) ---
  int sentLook = 0;
  int sentPinch = 0;
  int sentJoy = 0;
  int sendFail = 0;
  int dropped = 0;
  String? lastError;
  final Set<String> apiMissing = {};

  /// 웹이 마지막으로 보낸 요약(main.js traceFlush 의 `s`)과 받은 시각.
  Map<String, Object?> js = const {};
  int jsAt = 0;

  Map<String, Object?> _device = const {};
  Map<String, Object?> _web = const {};

  int get length => _buf.length;
  List<Map<String, Object?>> get entries => List.unmodifiable(_buf);

  /// 한 사건을 쌓는다. [t]가 없으면 지금 시각.
  void add(String s, String k, [Map<String, Object?>? data, int? t]) {
    if (!on) return;
    final now = _clock();
    final e = <String, Object?>{'t': t ?? now, 's': s, 'k': k, ...?data};
    _buf.addLast(e);
    while (_buf.length > capacity) {
      _buf.removeFirst();
    }
    final oldest = now - window.inMilliseconds;
    while (_buf.isNotEmpty && ((_buf.first['t'] as int?) ?? now) < oldest) {
      _buf.removeFirst();
    }
  }

  /// Flutter 가 본 포인터 하나.
  void pointer(PointerEvent e, String role) {
    if (!on) return;
    final type = switch (e) {
      PointerDownEvent() => 'down',
      PointerMoveEvent() => 'move',
      PointerUpEvent() => 'up',
      PointerCancelEvent() => 'cancel',
      _ => 'other',
    };
    add('f', 'p', {
      'ty': type,
      'id': e.pointer,
      'kind': e.kind.name,
      'x': _r1(e.position.dx),
      'y': _r1(e.position.dy),
      'ts': e.timeStamp.inMilliseconds,
      'r': role,
    });
  }

  /// 입력 층의 분류 결정(손잡이 잡기·시점 시작·핀치 시작·탭 넘김…).
  void decision(String what, [Map<String, Object?>? data]) {
    if (!on) return;
    add('f', 'dec', {'what': what, ...?data});
  }

  /// 웹으로 보낸 입력 메시지. [error]가 있으면 실패, [dropped]면 init 전이라 버림.
  void sent(
    String method,
    Map<String, Object?> args, {
    String? error,
    bool drop = false,
  }) {
    if (!on) return;
    if (error != null) {
      sendFail++;
      lastError = '$method: $error';
    } else if (drop) {
      dropped++;
    } else if (method == 'setJoystick') {
      sentJoy++;
    } else if (method == 'setInput') {
      if (args.containsKey('dx') || args.containsKey('dy')) sentLook++;
      if (args.containsKey('k')) sentPinch++;
    }
    add('tx', error != null ? 'fail' : (drop ? 'drop' : 'msg'), {
      'm': method,
      'a': args,
      'err': ?error,
    });
  }

  /// 웹 → Flutter 의 기록 메시지(`{e:'trace'}`·`{e:'apiMissing'}`)를 처리한다. 처리했으면 true(화면 이벤트로 만들지 않는다).
  static bool handleRaw(String raw) => instance._handleRaw(raw);

  bool _handleRaw(String raw) {
    final trace = raw.startsWith('{"e":"trace"');
    final missing = raw.startsWith('{"e":"apiMissing"');
    if (!trace && !missing) return false;
    try {
      final j = jsonDecode(raw);
      if (j is! Map) return true;
      if (missing) {
        final m = '${j['m']}';
        debugPrint('ChurchAPI.$m 없음: 웹에 그 메서드가 없어 호출이 버려졌다');
        if (!on) return true;
        apiMissing.add(m);
        add('js', 'apiMissing', {'m': m});
        return true;
      }
      if (!on) return true;
      final s = j['s'];
      if (s is Map) {
        js = s.cast<String, Object?>();
        jsAt = _clock();
      }
      final items = j['items'];
      if (items is List) {
        for (final it in items) {
          if (it is! Map) continue;
          final m = it.cast<String, Object?>();
          final k = '${m['k'] ?? '?'}';
          if (k == 'hdr') _web = Map.of(m)..remove('k');
          final t = m['t'];
          add(
            'js',
            k,
            Map.of(m)
              ..remove('k')
              ..remove('t'),
            t is num ? t.toInt() : null,
          );
        }
      }
      final drop = j['drop'];
      if (drop is num && drop > 0) add('js', 'drop', {'n': drop.toInt()});
    } catch (e) {
      debugPrint('touch trace parse failed: $e');
    }
    return true;
  }

  /// 기기·앱 정보(한 번). 실패해도 기록은 계속된다.
  Future<void> collectDevice() async {
    if (!on || _device.isNotEmpty) return;
    final d = <String, Object?>{'platform': defaultTargetPlatform.name};
    try {
      if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
        final a = await DeviceInfoPlugin().androidInfo;
        d.addAll({
          'android': a.version.release,
          'sdk': a.version.sdkInt,
          'manufacturer': a.manufacturer,
          'model': a.model,
          'device': a.device,
          'product': a.product,
        });
      }
    } catch (e) {
      d['deviceError'] = '$e';
    }
    try {
      final p = await PackageInfo.fromPlatform();
      d['app'] = '${p.version}+${p.buildNumber}';
    } catch (_) {}
    _device = d;
  }

  /// 화면(크기·DPR·접힘/경첩)을 지금 값으로 읽는다.
  static Map<String, Object?> screenInfo() {
    final views = ui.PlatformDispatcher.instance.views;
    if (views.isEmpty) return const {};
    final v = views.first;
    final dpr = v.devicePixelRatio;
    return {
      'physical': [v.physicalSize.width, v.physicalSize.height],
      'dpr': dpr,
      'logical': [
        _r1(v.physicalSize.width / dpr),
        _r1(v.physicalSize.height / dpr),
      ],
      'padding': [
        _r1(v.padding.left / dpr),
        _r1(v.padding.top / dpr),
        _r1(v.padding.right / dpr),
        _r1(v.padding.bottom / dpr),
      ],
      // 접는 폰: 접힘선(fold)·경첩(hinge)과 자세(flat/halfOpened). 펼친 Galaxy Fold 는 fold 하나가 보인다.
      'features': [
        for (final f in v.displayFeatures)
          {
            'type': f.type.name,
            'state': f.state.name,
            'bounds': [
              _r1(f.bounds.left / dpr),
              _r1(f.bounds.top / dpr),
              _r1(f.bounds.right / dpr),
              _r1(f.bounds.bottom / dpr),
            ],
          },
      ],
    };
  }

  Map<String, Object?> header() => {
    'type': 'header',
    'format': 'rosarium-touch-trace',
    'v': 1,
    'exportedAt': DateTime.fromMillisecondsSinceEpoch(_clock())
        .toIso8601String(),
    'buildId': buildId,
    'devBuild': DevGlass.enabled,
    'device': _device,
    'screen': screenInfo(),
    'webview': {'plugin': webviewPlugin, ..._web},
    'count': _buf.length,
    'capacity': capacity,
    'windowSec': window.inSeconds,
    'counters': {
      'sentLook': sentLook,
      'sentPinch': sentPinch,
      'sentJoy': sentJoy,
      'sendFail': sendFail,
      'dropped': dropped,
      'apiMissing': apiMissing.toList(),
    },
    'jsSummary': js,
  };

  /// JSON Lines 문자열(머리 + 사건들).
  String exportJsonl() {
    final b = StringBuffer()..writeln(jsonEncode(header()));
    for (final e in _buf) {
      b.writeln(jsonEncode(e));
    }
    return b.toString();
  }

  /// 앱 문서 폴더의 `church_touch_trace.jsonl` 에 쓴다.
  Future<File> writeFile({Directory? dir}) async {
    final d = dir ?? await getApplicationDocumentsDirectory();
    final f = File('${d.path}/church_touch_trace.jsonl');
    await f.writeAsString(exportJsonl(), flush: true);
    return f;
  }

  void clear() {
    _buf.clear();
    claimed.removeWhere((id) => !roles.containsKey(id));
    sentLook = sentPinch = sentJoy = sendFail = dropped = 0;
    lastError = null;
    apiMissing.clear();
  }

  static double _r1(double v) => (v * 10).roundToDouble() / 10;
}

/// 개발용 '터치 진단' 표시(성당 화면 왼쪽 위, 개발용 APK 에서만). 0.5초마다 고쳐 그린다.
///
/// Flutter 가 본 손가락(수·역할), 보낸 시점 메시지 수/초, 웹이 받은 시점 메시지 수와 지금 yaw 를 보여 주고,
/// '터치 기록 보내기'(파일을 공유 시트로)·'기록 지우기' 단추를 둔다. 휴대폰에서 고장이 나면 이 표시를 찍어 보내거나 기록을 보낸다.
class ChurchTouchDiagPanel extends StatefulWidget {
  const ChurchTouchDiagPanel({super.key, this.onClose, this.trace});

  final VoidCallback? onClose;

  /// 시험용 주입. 기본은 [ChurchTouchTrace.instance].
  final ChurchTouchTrace? trace;

  @override
  State<ChurchTouchDiagPanel> createState() => _ChurchTouchDiagPanelState();
}

class _ChurchTouchDiagPanelState extends State<ChurchTouchDiagPanel> {
  Timer? _tick;
  int _prevLook = 0, _prevPinch = 0, _prevJoy = 0, _prevJsLook = 0;
  double _lookRate = 0, _pinchRate = 0, _joyRate = 0, _jsLookRate = 0;
  bool _busy = false;

  ChurchTouchTrace get _t => widget.trace ?? ChurchTouchTrace.instance;

  @override
  void initState() {
    super.initState();
    _prevLook = _t.sentLook;
    _prevPinch = _t.sentPinch;
    _prevJoy = _t.sentJoy;
    _prevJsLook = _jsLooks;
    _tick = Timer.periodic(const Duration(milliseconds: 500), (_) {
      if (!mounted) return;
      setState(() {
        _lookRate = (_t.sentLook - _prevLook) * 2.0;
        _pinchRate = (_t.sentPinch - _prevPinch) * 2.0;
        _joyRate = (_t.sentJoy - _prevJoy) * 2.0;
        _jsLookRate = (_jsLooks - _prevJsLook) * 2.0;
        _prevLook = _t.sentLook;
        _prevPinch = _t.sentPinch;
        _prevJoy = _t.sentJoy;
        _prevJsLook = _jsLooks;
      });
    });
  }

  int get _jsLooks => (_t.js['looks'] as num?)?.toInt() ?? 0;

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  Future<void> _export() async {
    if (_busy) return;
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.maybeOf(context);
    try {
      final shown = await exportChurchTouchTrace(_t);
      messenger
        ?..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text('터치 기록을 저장했어요: $shown')));
    } catch (e) {
      messenger
        ?..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text('터치 기록을 보내지 못했어요: $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    const scheme = ChurchTheme.scheme;
    final t = _t;
    final style = Theme.of(context).textTheme.labelSmall
        ?.copyWith(color: scheme.onSurface, height: 1.35);
    final warn = style?.copyWith(color: scheme.error);
    final rolesTxt = t.roles.isEmpty
        ? '없음'
        : t.roles.entries.map((e) => '#${e.key} ${e.value}').join(', ');
    final js = t.js;
    final jsAge = t.jsAt == 0
        ? null
        : DateTime.now().millisecondsSinceEpoch - t.jsAt;
    String n(Object? v) => v is num ? v.toStringAsFixed(2) : '-';
    final lines = <(String, bool)>[
      ('Flutter 손가락 ${t.roles.length}: $rolesTxt', false),
      (
        '보냄 시점 ${_lookRate.toStringAsFixed(0)}/s · 확대 ${_pinchRate.toStringAsFixed(0)}/s · '
            '이동 ${_joyRate.toStringAsFixed(0)}/s',
        false,
      ),
      (
        '웹 받음 시점 ${js['looks'] ?? 0} (${_jsLookRate.toStringAsFixed(0)}/s) · '
            'yaw ${n(js['yaw'])} · pitch ${n(js['pitch'])}',
        false,
      ),
      (
        '웹 ext ${js['ext'] ?? '-'} · look ${js['xl'] ?? '-'} · 끌기 ${js['dr'] ?? '-'} · '
            '웹 손가락 ${js['wp'] ?? '-'} · 따라가기 ${js['fol'] ?? 0}',
        false,
      ),
      ('기록 ${t.length}개', false),
      if (jsAge == null)
        ('웹 기록 응답 없음(setInput 이 웹에 닿지 않음?)', true)
      else if (jsAge > 2000)
        ('웹 기록 ${(jsAge / 1000).toStringAsFixed(0)}초째 없음', true),
      if (t.apiMissing.isNotEmpty)
        ('웹에 없는 메서드: ${t.apiMissing.join(', ')}', true),
      if (t.sendFail > 0) ('보내기 실패 ${t.sendFail}: ${t.lastError}', true),
    ];
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 300),
      child: Material(
        key: const ValueKey('touch-diag'),
        color: scheme.surfaceContainerHigh.withValues(alpha: 0.9),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: scheme.outlineVariant),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpace.sm,
            AppSpace.xs,
            AppSpace.xxs,
            AppSpace.xxs,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '터치 진단(개발용)',
                      style: style?.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ),
                  if (widget.onClose != null)
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      tooltip: '터치 진단 닫기',
                      icon: const Icon(Icons.close, size: 18),
                      onPressed: widget.onClose,
                    ),
                ],
              ),
              for (final (s, bad) in lines)
                Text(s, style: bad ? warn : style, softWrap: true),
              Wrap(
                spacing: AppSpace.xs,
                children: [
                  TextButton(
                    key: const ValueKey('touch-trace-export'),
                    onPressed: _busy ? null : _export,
                    child: const Text('터치 기록 보내기'),
                  ),
                  TextButton(
                    key: const ValueKey('touch-trace-clear'),
                    onPressed: () => setState(t.clear),
                    child: const Text('기록 지우기'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 개발용 공유 채널(android MainActivity: 다운로드 폴더에 저장 후 공유 시트).
const MethodChannel _devShare = MethodChannel('rosarium/devshare');

/// 기록을 파일로 쓰고 공유 시트를 연다. 보여 줄 저장 위치를 돌려준다
/// (안드로이드 10+ 는 '다운로드/<이름>', 그 밖에는 앱 문서 폴더의 파일 경로).
Future<String> exportChurchTouchTrace(ChurchTouchTrace t) async {
  await t.collectDevice();
  final f = await t.writeFile();
  final stamp = DateTime.now()
      .toIso8601String()
      .replaceAll(RegExp(r'[^0-9T]'), '')
      .replaceFirst('T', '_');
  final name =
      'rosarium_touch_${stamp.substring(0, stamp.length.clamp(0, 15))}.jsonl';
  try {
    final shown = await _devShare.invokeMethod<String>('shareFile', {
      'path': f.path,
      'name': name,
      'mime': 'text/plain',
    });
    if (shown != null && shown.isNotEmpty) return shown;
  } on MissingPluginException {
    // 채널이 없는 플랫폼(시험·데스크톱): 문서 폴더 경로만 알린다.
  } on PlatformException catch (e) {
    debugPrint('touch trace share failed: $e');
  }
  return f.path;
}

/// 앱 전체 포인터의 기록 경로(개발용). [GestureBinding]의 전역 경로는 모든 위젯이 이벤트를 받은 **뒤에** 불리므로,
/// 입력 층(ChurchMoveZone)이 맡아 이미 기록한 손가락([ChurchTouchTrace.claimed])은 건너뛰고, 나머지 — HUD 단추·시트
/// ([walking] 중) 또는 웹 장면(앉아 있을 때, 웹뷰가 직접 받음) — 만 기록한다. 아무 터치도 가로채지 않는다.
class ChurchTouchTraceRoute {
  ChurchTouchTraceRoute({required this.walking, ChurchTouchTrace? trace})
    : _t = trace ?? ChurchTouchTrace.instance;

  /// 지금 걷는 중인가(입력 층이 있는가).
  final bool Function() walking;
  final ChurchTouchTrace _t;
  final Map<int, int> _lastMove = {};
  bool _on = false;

  void start() {
    if (_on || !ChurchTouchTrace.on) return;
    _on = true;
    GestureBinding.instance.pointerRouter.addGlobalRoute(_route);
  }

  void stop() {
    if (!_on) return;
    _on = false;
    GestureBinding.instance.pointerRouter.removeGlobalRoute(_route);
  }

  void _route(PointerEvent e) {
    if (e is! PointerDownEvent &&
        e is! PointerMoveEvent &&
        e is! PointerUpEvent &&
        e is! PointerCancelEvent) {
      return;
    }
    final id = e.pointer;
    final end = e is PointerUpEvent || e is PointerCancelEvent;
    if (_t.claimed.contains(id)) {
      if (end) _t.claimed.remove(id);
      return;
    }
    final role = walking() ? 'hud' : 'web';
    if (e is PointerMoveEvent) {
      final ms = e.timeStamp.inMilliseconds;
      if (ms - (_lastMove[id] ?? -1000) < 33) return;
      _lastMove[id] = ms;
    }
    if (e is PointerDownEvent) _t.roles[id] = role;
    _t.pointer(e, role);
    if (end) {
      _t.roles.remove(id);
      _lastMove.remove(id);
    }
  }
}
