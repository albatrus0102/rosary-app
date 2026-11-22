import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

import '../diag/diag_sources.dart';
import 'church_diagnostics.dart';
import 'church_rosary_looks.g.dart';
import 'church_theme.dart';
import 'church_touch_trace.dart';
import 'dev_glass.dart';

export 'church_diagnostics.dart';

/// 웹 장면(three.js)이 Flutter로 보내는 이벤트 (`FlutterChurch` 채널).
sealed class SceneEvent {
  const SceneEvent();

  /// 사진 창 id 형식(웹 `glass_math.js`의 ID_RE와 같다).
  static final RegExp _glassId = RegExp(r'^[a-z0-9_]{1,40}$');

  /// 채널 메시지(JSON 문자열)를 해석한다. 알 수 없거나 깨진 메시지는 null.
  static SceneEvent? parse(String raw) {
    try {
      final j = jsonDecode(raw);
      if (j is! Map) return null;
      switch (j['e']) {
        case 'ready':
          return const SceneReady();
        case 'firstFrame':
          return const SceneFirstFrame();
        case 'near':
          final seat = j['seat'];
          final candle = j['candle'];
          final station = j['station'];
          return SceneNear(
            seat: seat is String ? seat : null,
            candle: candle is num ? candle.toInt() : null,
            station: station is String ? station : null,
            shrine: j['shrine'] == true,
          );
        case 'seated':
          final seat = j['seat'];
          return SceneSeated(seat is String ? seat : '');
        case 'stood':
          return const SceneStood();
        case 'posture':
          final posture = j['posture'];
          if (posture != 'sit' && posture != 'kneel') return null;
          return ScenePosture(kneel: posture == 'kneel');
        case 'pos':
          final x = j['x'];
          final z = j['z'];
          final r = j['r'];
          if (x is! num || z is! num) return null;
          return ScenePos(
            x.toDouble(),
            z.toDouble(),
            r is num ? r.toDouble() : 0,
            j['m'] == 1 || j['m'] == true,
          );
        case 'stations':
          int n(Object? v) => v is num ? v.toInt() : 0;
          return SceneStations(
            candle: n(j['candle']),
            altar: n(j['altar']),
            font: n(j['font']),
            cross: n(j['cross']),
            shrine: n(j['shrine']),
            shrineLabel: j['shrineLabel'] is String
                ? j['shrineLabel'] as String
                : null,
            levels: [
              if (j['levels'] is List)
                for (final l in j['levels'] as List)
                  if (l is String && l.isNotEmpty && l.length <= 40) l,
            ],
          );
        case 'walkStart':
          final kind = j['kind'];
          return kind is String ? SceneWalkStart(kind) : null;
        case 'walkDone':
          final kind = j['kind'];
          final index = j['index'];
          final seat = j['seat'];
          if (kind is! String) return null;
          return SceneWalkDone(
            kind,
            index: index is num ? index.toInt() : 0,
            seat: seat is String ? seat : null,
          );
        case 'walkFail':
          final kind = j['kind'];
          return kind is String ? SceneWalkFail(kind) : null;
        case 'walkCancel':
          final kind = j['kind'];
          return kind is String ? SceneWalkCancel(kind) : null;
        case 'perf':
          final fps = j['fps'];
          if (fps is! num) return null;
          final tier = j['tier'];
          return ScenePerf(
            fps.toDouble(),
            tier: tier is String ? tier : null,
            seated: j['sat'] == 1 || j['sat'] == true,
            auto: j['a'] == 1 || j['a'] == true,
          );
        // --- 창 감상(viewWindow) 이벤트 ---
        case 'viewReady':
          final win = j['win'];
          if (win is! String) return null;
          final tier = j['tier'];
          final ms = j['ms'];
          return ViewReady(
            win: win,
            tier: tier is String ? tier : 't1',
            ms: ms is num ? ms.toInt() : 0,
          );
        case 'viewEnd':
          final win = j['win'];
          if (win is! String) return null;
          final seconds = j['seconds'];
          final zoomMax = j['zoomMax'] ?? j['zoom_max'];
          return ViewEnd(
            win: win,
            seconds: seconds is num ? seconds.toDouble() : 0,
            zoomMax: zoomMax is num ? zoomMax.toDouble() : 1,
            panned: j['panned'] == 1 || j['panned'] == true,
          );
        case 'viewError':
          final win = j['win'];
          if (win is! String) return null;
          return ViewError(
            win: win,
            reason: ViewErrorReason.parse(j['reason']),
          );
        case 'viewPerf':
          final win = j['win'];
          final fps = j['fps'];
          if (win is! String || fps is! num) return null;
          final texMb = j['texMb'] ?? j['tex_mb'];
          return ViewPerf(
            win: win,
            fps: fps.toDouble(),
            texMb: texMb is num ? texMb.toDouble() : 0,
          );
        case 'viewGesture':
          final kind = ViewGestureKind.parse(j['kind']);
          return kind == null ? null : ViewGesture(kind);
        // --- 일시정지·복원 ---
        case 'state':
          final church = j['church'];
          final x = j['x'];
          final z = j['z'];
          if (church is! String || x is! num || z is! num) return null;
          double? d(Object? v) => v is num ? v.toDouble() : null;
          final seat = j['seat'];
          final walk = j['walk'];
          final wk = walk is Map ? walk['kind'] : null;
          final wi = walk is Map ? walk['index'] : null;
          final ws = walk is Map ? walk['seat'] : null;
          return SceneState(
            church: church,
            x: x.toDouble(),
            z: z.toDouble(),
            r: d(j['r']) ?? 0,
            seat: seat is String ? seat : null,
            kneel: j['posture'] == 'kneel',
            rosary: j['rosary'] == 1 || j['rosary'] == true,
            camYaw: d(j['cy']),
            camPitch: d(j['cp']),
            camZoom: d(j['cz']),
            camLook: d(j['cl']),
            walkKind: wk is String ? wk : null,
            walkIndex: wi is num ? wi.toInt() : 0,
            walkSeat: ws is String ? ws : null,
            y: d(j['y']),
          );
        case 'restored':
          final seat = j['seat'];
          final x = j['x'];
          final z = j['z'];
          final r = j['r'];
          if (x is! num || z is! num) return null;
          return SceneRestored(
            seat: seat is String ? seat : null,
            lost: j['lost'] == 1 || j['lost'] == true,
            x: x.toDouble(),
            z: z.toDouble(),
            r: r is num ? r.toDouble() : 0,
          );
        // --- 성당 안 진본 창(G-29) ---
        case 'glassNear':
          final id = j['id'];
          final slot = j['slot'];
          if (id != null && (id is! String || !_glassId.hasMatch(id))) {
            return null;
          }
          return SceneGlassNear(
            id: id as String?,
            slot: slot is String ? slot : null,
          );
        case 'glassTap':
          final id = j['id'];
          final slot = j['slot'];
          if (id is! String || !_glassId.hasMatch(id)) return null;
          return SceneGlassTap(id: id, slot: slot is String ? slot : null);
        // --- 십자가의 길 14처 판(SPEC §32) ---
        case 'crossNear':
          final n = j['n'];
          if (n == null) return const SceneCrossNear(null);
          if (n is! num || n < 1 || n > 14) return null;
          return SceneCrossNear(n.toInt());
      }
    } catch (_) {}
    return null;
  }
}

/// 페이지(HTML)가 다 읽혔다. 장면은 아직 없다 — `init` 을 받아야 짓기 시작한다.
class SceneReady extends SceneEvent {
  const SceneReady();
}

/// 장면의 첫 프레임을 그렸다(웹 `firstFrame`). 이때까지 앱은 입장 화면을 덮어 둔다
/// (장면을 짓는 3~4초 동안 웹뷰가 빈 흰 화면으로 보이던 문제).
class SceneFirstFrame extends SceneEvent {
  const SceneFirstFrame();
}

/// 가까이 있는 것. [seat]은 앉을 수 있는 빈 좌석, [candle]은 촛불 슬롯,
/// [station]은 서 있는 스테이션('altar' 제대 앞, 'font' 성수대)이다.
class SceneNear extends SceneEvent {
  const SceneNear({this.seat, this.candle, this.station, this.shrine = false});
  final String? seat;
  final int? candle;
  final String? station;

  /// [station]이 'altar'이고 그 자리가 성모상 앞(shrine.js)이면 true: 묵주기도를 서서 한다.
  final bool shrine;

  @override
  bool operator ==(Object other) =>
      other is SceneNear &&
      other.seat == seat &&
      other.candle == candle &&
      other.station == station &&
      other.shrine == shrine;

  @override
  int get hashCode => Object.hash(seat, candle, station, shrine);
}

/// 성당을 불러온 뒤 한 번: 갈 수 있는 스테이션 개수(성수대는 없는 성당이 있다).
/// [cross]는 십자가의 길 판 개수(14 또는 0: 판을 걸 자리가 없는 성당).
class SceneStations extends SceneEvent {
  const SceneStations({
    this.candle = 0,
    this.altar = 0,
    this.font = 0,
    this.cross = 0,
    this.shrine = 0,
    this.shrineLabel,
    this.levels = const [],
  });

  /// 여러 층 성당(아시시: 상부 성당·하부 성당·지하 묘소)의 층 이름. '가기' 시트에 층마다 줄이 나오고
  /// 고르면 `walkTo{kind:'level', index}`로 그 층까지 계단을 걸어간다. 한 층 성당은 빈 목록.
  final List<String> levels;

  /// 성모상 앞(기도 자리)이 있으면 1. '가기' 시트에 성모상 줄이 나온다.
  final int shrine;

  /// '가기' 시트의 성모상 줄 이름(없으면 '성모상').
  final String? shrineLabel;
  final int candle;
  final int altar;
  final int font;
  final int cross;
}

/// 십자가의 길 [n]처(1..14) 판 앞 서는 자리에 들어옴. 벗어나면 null.
class SceneCrossNear extends SceneEvent {
  const SceneCrossNear(this.n);
  final int? n;
}

/// 자동 걷기 시작(걷는 중 표시).
class SceneWalkStart extends SceneEvent {
  const SceneWalkStart(this.kind);
  final String kind;
}

/// 자동 걷기 도착. [kind]는 candle|altar|seat|entrance|font.
class SceneWalkDone extends SceneEvent {
  const SceneWalkDone(this.kind, {this.index = 0, this.seat});
  final String kind;
  final int index;
  final String? seat;
}

/// 길을 못 찾았거나 갈 곳이 없음.
class SceneWalkFail extends SceneEvent {
  const SceneWalkFail(this.kind);
  final String kind;
}

/// 걷던 중 사용자가 끊음(스틱·터치·앉기).
class SceneWalkCancel extends SceneEvent {
  const SceneWalkCancel(this.kind);
  final String kind;
}

class SceneSeated extends SceneEvent {
  const SceneSeated(this.seat);
  final String seat;
}

class SceneStood extends SceneEvent {
  const SceneStood();
}

/// 기도 자세 전환이 끝났다(`setPrayerPosture` 의 완료 이벤트).
class ScenePosture extends SceneEvent {
  const ScenePosture({required this.kneel});
  final bool kneel;
}

class ScenePos extends SceneEvent {
  const ScenePos(this.x, this.z, this.r, this.moving);
  final double x;
  final double z;
  final double r;
  final bool moving;
}

/// 웹의 성능 표본. [fps]는 구간 평균(첫 표본은 입장 4초 뒤, 이후 5초마다),
/// [tier]는 화질 단계('low'|'mid'|'high'), [seated]는 앉아 있었는지.
/// [auto]가 true면 웹이 스스로 화질을 낮췄다는 알림이고 [fps]는 순간값이다.
class ScenePerf extends SceneEvent {
  const ScenePerf(
    this.fps, {
    this.tier,
    this.seated = false,
    this.auto = false,
  });
  final double fps;
  final String? tier;
  final bool seated;
  final bool auto;
}

/// 창 감상 장면이 첫 화면을 그렸다. [tier]는 질감 단계('t1'|'t2'|'t3'|'tile'),
/// [ms]는 `viewWindow` 호출부터 걸린 시간.
class ViewReady extends SceneEvent {
  const ViewReady({required this.win, this.tier = 't1', this.ms = 0});
  final String win;
  final String tier;
  final int ms;
}

/// 감상을 끝냈다(`endView` 응답). [seconds]는 머문 시간, [zoomMax]는 가장 크게 확대한 배율,
/// [panned]는 끌어서 옮겨 본 적이 있는지.
class ViewEnd extends SceneEvent {
  const ViewEnd({
    required this.win,
    this.seconds = 0,
    this.zoomMax = 1,
    this.panned = false,
  });
  final String win;
  final double seconds;
  final double zoomMax;
  final bool panned;
}

/// 감상 장면 오류의 종류. 값은 웹이 보내는 문자열과 같다.
enum ViewErrorReason {
  texture,
  webgl,
  memory,
  unknown;

  static ViewErrorReason parse(Object? v) {
    for (final r in values) {
      if (r.name == v) return r;
    }
    return unknown;
  }

  /// WebGL·메모리 문제는 같은 창을 다시 그려도 소용이 없어 평면 보기로 내려간다.
  bool get needsFlatFallback => this == webgl || this == memory;
}

class ViewError extends SceneEvent {
  const ViewError({required this.win, required this.reason});
  final String win;
  final ViewErrorReason reason;
}

/// 감상 중 성능 표본. [texMb]는 질감 회계(MB).
class ViewPerf extends SceneEvent {
  const ViewPerf({required this.win, required this.fps, this.texMb = 0});
  final String win;
  final double fps;
  final double texMb;
}

enum ViewGestureKind {
  zoom,
  pan,
  reset;

  static ViewGestureKind? parse(Object? v) {
    for (final k in values) {
      if (k.name == v) return k;
    }
    return null;
  }
}

/// 감상 중 사용자 제스처(확대·이동·두 번 탭 복귀). 덮개 UI를 숨기는 신호로 쓴다.
class ViewGesture extends SceneEvent {
  const ViewGesture(this.kind);
  final ViewGestureKind kind;
}

/// 성당 안을 걷다가 진본 사진 창이 가까이·시야 안에 들어왔다(G-29). [id]가 null이면 벗어났다.
/// [id]는 스테인드글라스 카탈로그 id, [slot]은 그 성당 안의 자리 이름.
class SceneGlassNear extends SceneEvent {
  const SceneGlassNear({this.id, this.slot});
  final String? id;
  final String? slot;
}

/// 성당 안의 진본 사진 창을 눌렀다(G-29).
class SceneGlassTap extends SceneEvent {
  const SceneGlassTap({required this.id, this.slot});
  final String id;
  final String? slot;
}

/// 장면의 지금 상태(`pause`·`getState`의 답): 위치·방향·좌석·자세·카메라·걷던 목적지.
/// 보이지 않게 될 때 받아 두었다가 장면을 새로 만들어야 하면 `restore`로 되돌린다.
class SceneState extends SceneEvent {
  const SceneState({
    required this.church,
    required this.x,
    required this.z,
    this.r = 0,
    this.seat,
    this.kneel = false,
    this.rosary = false,
    this.camYaw,
    this.camPitch,
    this.camZoom,
    this.camLook,
    this.walkKind,
    this.walkIndex = 0,
    this.walkSeat,
    this.y,
  });
  final String church;
  final double x;
  final double z;
  final double r;
  final String? seat;
  final bool kneel;

  /// 여러 층 성당에서 발 높이(층). 한 층 성당은 null.
  final double? y;

  /// 묵주를 들고 있었는지(`rosary:1`).
  final bool rosary;
  final double? camYaw;
  final double? camPitch;
  final double? camZoom;
  final double? camLook;
  final String? walkKind;
  final int walkIndex;
  final String? walkSeat;
}

/// `restore`를 적용했다. [seat]은 다시 앉은 좌석(서 있으면 null), [lost]는 앉아 있던 자리에
/// 이미 누가 있어 통로에 세웠다는 뜻. [x]·[z]·[r]은 적용된 위치.
class SceneRestored extends SceneEvent {
  const SceneRestored({
    this.seat,
    this.lost = false,
    this.x = 0,
    this.z = 0,
    this.r = 0,
  });
  final String? seat;
  final bool lost;
  final double x;
  final double z;
  final double r;
}

/// 웹 장면의 로딩 상태.
enum SceneLoad { loading, ready, error }

/// 웹 장면과의 브리지 추상화. 실제 구현은 [WebViewChurchSceneController],
/// 테스트는 [FakeChurchSceneController].
///
/// Flutter→웹 호출은 모두 [invoke]를 거치며(`window.ChurchAPI.<method>(<json>)`),
/// `init`이 끝나기 전의 호출은 순서대로 쌓아 두었다가 `init` 직후 보낸다.
abstract class ChurchSceneController {
  ChurchSceneController() {
    ChurchDiagnostics.perfHud.addListener(_onPerfHud);
  }

  void _onPerfHud() {
    if (_disposed || !_initDone) return;
    unawaited(_call('setPerfHud', {'on': ChurchDiagnostics.perfHud.value}));
  }

  final StreamController<SceneEvent> _events =
      StreamController<SceneEvent>.broadcast();
  final ValueNotifier<SceneLoad> _load = ValueNotifier(SceneLoad.loading);
  final ValueNotifier<bool> _firstFrame = ValueNotifier(false);
  final List<(String, Map<String, Object?>)> _queue = [];
  bool _initDone = false;
  bool _disposed = false;

  /// 웹 → Flutter 이벤트.
  Stream<SceneEvent> get events => _events.stream;

  /// 로딩/오류 상태(오류면 화면이 다시 시도 버튼을 보여 준다).
  ValueListenable<SceneLoad> get loadState => _load;

  /// 장면이 첫 프레임을 그렸는가. false 인 동안 화면은 '성당에 들어가는 중' 입장 화면으로 덮는다.
  ValueListenable<bool> get firstFrame => _firstFrame;

  bool get isDisposed => _disposed;
  bool get initDone => _initDone;

  /// 실제 JS 호출. 구현체가 만든다.
  @protected
  Future<void> invoke(String method, Map<String, Object?> args);

  /// 3D 화면 위젯.
  Widget buildView(BuildContext context);

  /// 장면(웹 페이지)이 아직 살아 있는가. 앱이 백그라운드에 있는 동안 시스템이 WebView 의 렌더
  /// 프로세스를 정리하면 빈 화면만 남는다: 돌아왔을 때 이것이 false 면 화면이 장면을 새로 만든다.
  Future<bool> isAlive() async => true;

  /// 오류 상태에서 다시 불러온다.
  Future<void> reload() async {
    _initDone = false;
    _queue.clear();
    _load.value = SceneLoad.loading;
    _firstFrame.value = false;
  }

  /// 구현체가 웹 메시지/이벤트를 받았을 때 부른다.
  @protected
  void dispatch(SceneEvent e) {
    if (_disposed) return;
    if (e is SceneReady) _load.value = SceneLoad.ready;
    if (e is SceneFirstFrame) _firstFrame.value = true;
    _events.add(e);
  }

  @protected
  void setLoadError() {
    if (_disposed) return;
    _load.value = SceneLoad.error;
  }

  Future<void> _call(String method, Map<String, Object?> args) async {
    if (_disposed) return;
    if (method != 'init' && !_initDone) {
      // 걷기 입력·탭·걷기 취소는 오래된 값이 의미가 없으니 쌓지 않는다.
      if (method == 'setJoystick' ||
          method == 'tapAt' ||
          (method == 'setInput' &&
              !args.containsKey('ext') &&
              !args.containsKey('stick')) ||
          method == 'cancelWalk' ||
          method == 'resetView' ||
          method == 'endView') {
        if (ChurchTouchTrace.on && _traced(method)) {
          ChurchTouchTrace.instance.sent(method, args, drop: true);
        }
        return;
      }
      if (_queue.length < 300) _queue.add((method, args));
      return;
    }
    await _invoke(method, args);
    if (method == 'init') {
      _initDone = true;
      if (ChurchDiagnostics.perfHud.value) {
        await _invoke('setPerfHud', const {'on': true});
      }
      // 개발용 빌드: 웹도 받은 포인터·입력·yaw 를 기록해 보낸다(터치 기록, church_touch_trace.dart).
      if (ChurchTouchTrace.on) await _invoke('setInput', const {'trace': true});
      final pending = List.of(_queue);
      _queue.clear();
      for (final (m, a) in pending) {
        if (_disposed) return;
        await _invoke(m, a);
      }
    }
  }

  static bool _traced(String m) =>
      m == 'setJoystick' ||
      m == 'setInput' ||
      m == 'tapAt' ||
      m == 'cancelWalk';

  /// 실제 호출 한 번. 실패는 삼키되(화면은 계속) 로그와 터치 기록에 남긴다.
  Future<void> _invoke(String method, Map<String, Object?> args) async {
    final traced = ChurchTouchTrace.on && _traced(method);
    if (traced) ChurchTouchTrace.instance.sent(method, args);
    try {
      await invoke(method, args);
    } catch (e) {
      debugPrint('ChurchAPI.$method failed: $e');
      if (traced) ChurchTouchTrace.instance.sent(method, args, error: '$e');
    }
  }

  // --- Flutter → 웹 (SPEC §3) ---
  Future<void> init({
    required Map<String, Object?> avatar,
    required double hour,
    required bool ambient,
    required bool solo,
    required String quality,
    String church = 'basic',
  }) => _call('init', {
    'church': church,
    'avatar': avatar,
    'hour': hour,
    'ambient': ambient,
    'solo': solo,
    'quality': quality,
  });

  /// 조이스틱 값은 웹뷰 호출(runJavaScript)이 끝나기 전에 새 값이 오면 마지막 값만 보낸다.
  /// 손가락 이동 이벤트마다(초당 100번 이상) 플랫폼 채널 호출이 쌓여 웹뷰 메인 스레드·
  /// 입력 지연을 늘리던 것을 줄인다(PERF_SCALE.md §2). 놓을 때의 (0, 0)도 마지막 값이라 반드시 간다.
  Future<void> setJoystick(double x, double y) async {
    _joyNext = (x, y);
    if (_joyBusy) return;
    _joyBusy = true;
    try {
      while (_joyNext != null && !_disposed) {
        final (jx, jy) = _joyNext!;
        _joyNext = null;
        await _call('setJoystick', {'x': jx, 'y': jy});
      }
    } finally {
      _joyBusy = false;
    }
  }

  (double, double)? _joyNext;
  bool _joyBusy = false;
  Future<void> sit({String? seat}) => _call('sit', {'seat': ?seat});
  Future<void> stand() => _call('stand', const {});
  Future<void> setPraying({
    required bool on,
    required int ms,
    bool stand = false,
  }) => _call('setPraying', {'on': on, 'ms': ms, if (stand) 'stand': true});

  /// 내 아바타가 묵주를 든다/내려놓는다(SPEC §32). 서 있을 때(자리로 걸어가는 동안)도 든다.
  ///
  /// [look]: 든 묵주의 색·재질(T-86, `rosary_looks.js` 와 같은 표). 들고 있는 중에 다시 보내면 바로 바뀐다(기도 중 묵주 바꾸기).
  Future<void> setRosary({required bool on, ChurchRosaryLook? look}) =>
      _call('setRosary', {'on': on, if (look != null) 'look': look.toJson()});

  /// 화면 아래를 덮는 패널의 높이 비율(0..0.6). 장면을 그만큼 위로 올려 그리고, 앉은 뒤 '자리 시점' 대신
  /// 아바타를 가운데 두어 패널 위에 아바타(앉음·무릎 꿇음)가 보이게 한다. 0 이면 원래대로.
  Future<void> setViewInset(double bottom) =>
      _call('setViewInset', {'bottom': bottom});

  /// 기도 자세: 앉아서 | 무릎 꿇고. 앉아 있지 않으면 장면이 무시한다.
  Future<void> setPrayerPosture({required bool kneel}) =>
      _call('setPrayerPosture', {'posture': kneel ? 'kneel' : 'sit'});
  Future<void> setAvatar(Map<String, Object?> avatar) =>
      _call('setAvatar', {'avatar': avatar});
  Future<void> setPeers(
    List<Map<String, Object?>> peers,
    Map<String, String> seats,
  ) => _call('setPeers', {'peers': peers, 'seats': seats});
  Future<void> peerJoin(Map<String, Object?> peer) =>
      _call('peerJoin', {'peer': peer});
  Future<void> peerLeave(String id, {bool aoi = false}) =>
      _call('peerLeave', {'id': id, if (aoi) 'aoi': true});
  Future<void> peerSnap(List<List<Object?>> p) => _call('peerSnap', {'p': p});
  Future<void> peerSeat(String id, String seat) =>
      _call('peerSeat', {'id': id, 'seat': seat});
  Future<void> peerStand(String id) => _call('peerStand', {'id': id});
  Future<void> peerPraying(
    String id, {
    required bool on,
    required int ms,
    bool kneel = false,
    bool rosary = false,
    String? rosaryStyle,
  }) => _call('peerPraying', {
    'id': id,
    'on': on,
    'ms': ms,
    if (on && kneel) 'k': 1,
    if (on && rosary) 'r': 1,
    if (on && rosary && rosaryStyle != null) 'rs': rosaryStyle,
  });
  Future<void> peerEmote(String id, int e) =>
      _call('peerEmote', {'id': id, 'e': e});
  Future<void> setCandles(List<Map<String, Object?>> candles) =>
      _call('setCandles', {'candles': candles});
  Future<void> lightCandle({
    required int slot,
    required int until,
    required int intention,
    int? color,
    bool mine = false,
  }) => _call('lightCandle', {
    'slot': slot,
    'until': until,
    'intention': intention,
    'color': ?color,
    // 내가 방금 켠 초: 장면이 켜는 동작(손 뻗기·성호경)과 '내 초' 표시를 한다.
    if (mine) 'mine': true,
  });
  Future<void> setAmbient({required bool on}) =>
      _call('setAmbient', {'on': on});

  /// 발소리: [on] 성당 소리(침묵·백그라운드면 false), [chant] 앱 성가가 울리는 중, [volume] 음악 음량 설정(0..1).
  /// 웹이 크기를 늘 음악보다 작게 맞춘다(assets/church/audio.js stepGain, docs/church/WALK_GAIT.md).
  Future<void> setSteps({
    required bool on,
    required bool chant,
    required double volume,
  }) => _call('setSteps', {'on': on, 'chant': chant, 'vol': volume});

  /// 카메라 설정(설정 > 성당 > 카메라): {autoZoom, dist, follow}. docs/church/CAMERA.md
  Future<void> setCamera(Map<String, Object> args) => _call('setCamera', args);
  Future<void> setHour(double hour) => _call('setHour', {'hour': hour});

  /// 전례 시기 장식(SPEC §33). [args]는 `LiturgicalDay.toSceneArgs()`.
  Future<void> setLiturgy(Map<String, Object?> args) =>
      _call('setLiturgy', args);
  Future<void> setSolo({required bool on}) => _call('setSolo', {'on': on});
  Future<void> setQuality(String quality) =>
      _call('setQuality', {'quality': quality});
  Future<void> emote(int e) => _call('emote', {'e': e});

  /// 스테이션으로 걸어간다(자동 걷기). [kind]는 candle|altar|seat|entrance|font.
  /// 웹이 walkStart → walkDone/walkFail/walkCancel 이벤트로 결과를 알린다.
  Future<void> walkTo(String kind, {int? index, String? seat}) =>
      _call('walkTo', {'kind': kind, 'index': ?index, 'seat': ?seat});

  /// 자동 걷기를 멈춘다.
  Future<void> cancelWalk() => _call('cancelWalk', const {});

  /// 이동 손잡이는 앱(Flutter)이 그린다고 웹에 알린다: 웹은 화면 어디서든 한 손가락 끌기 = 시점 회전,
  /// 두 손가락 = 확대/축소로만 쓰고 자기 스틱(왼쪽 절반)을 만들지 않는다.
  Future<void> setAppStick() => _call('setInput', {'ext': true});

  /// 앱이 그린 이동 손잡이 원(웹 화면 좌표 = 논리 픽셀)을 웹에 알린다. 웹은 이 원 밖의 터치를 모두
  /// 시점 끌기·확대로 쓴다. 접는 화면을 펴고 접을 때·안전 영역이 바뀔 때마다 다시 보낸다.
  Future<void> setStickZone(double cx, double cy, double r) =>
      _call('setInput', {
        'stick': {'cx': cx, 'cy': cy, 'r': r},
      });

  /// 걷는 동안 앱이 3D 화면 위의 손가락을 모두 맡아 읽은 시점·확대 입력을 웹에 보낸다(ChurchMoveZone).
  ///
  /// * [on]: 시점 손가락이 닿기 시작(true)/모두 떨어짐(false). 그동안 웹은 자동 따라가기로 시점을 빼앗지 않는다.
  /// * [dx]·[dy]: 한 손가락 끌기량(논리 픽셀 = 웹 CSS 픽셀, 웹이 받는 그대로 yaw/pitch 로 바뀐다).
  /// * [k]: 두 손가락 사이 거리의 변화 배율(>1 벌림 = 다가감).
  ///
  /// [setJoystick]처럼 웹뷰 호출이 끝나기 전에 온 입력은 합쳐(끌기량은 더하고 배율은 곱하고 on/off 는 마지막 값) 한 번에 보낸다.
  /// 손가락 이동 이벤트(초당 120~240번)마다 플랫폼 채널 호출이 쌓이지 않게 하면서, 지연 없이 다음 프레임에 닿게 한다.
  Future<void> appLook({
    bool? on,
    double dx = 0,
    double dy = 0,
    double k = 1,
  }) async {
    if (on != null) _lookOn = on;
    if (dx.isFinite) _lookDx += dx;
    if (dy.isFinite) _lookDy += dy;
    if (k.isFinite && k > 0) _lookK *= k;
    if (_lookBusy) return;
    _lookBusy = true;
    try {
      while (!_disposed) {
        final on0 = _lookOn;
        final dx0 = _lookDx, dy0 = _lookDy, k0 = _lookK;
        _lookOn = null;
        _lookDx = _lookDy = 0;
        _lookK = 1;
        final moved = dx0 != 0 || dy0 != 0;
        final zoomed = (k0 - 1).abs() > 1e-6;
        if (on0 == null && !moved && !zoomed) break;
        await _call('setInput', {
          'look': ?on0,
          // 두 축을 늘 함께 보낸다(한 축만 보내면 옛 웹은 다른 축을 NaN 으로 읽어 끌기를 버렸다).
          if (moved) 'dx': dx0,
          if (moved) 'dy': dy0,
          if (zoomed) 'k': k0,
        });
      }
    } finally {
      _lookBusy = false;
    }
  }

  bool? _lookOn;
  double _lookDx = 0;
  double _lookDy = 0;
  double _lookK = 1;
  bool _lookBusy = false;

  /// 손잡이 위에서 일어난 탭은 Flutter가 가로채므로, 거기서 일어난 탭을 화면 좌표(논리 픽셀)로 웹에 넘긴다.
  /// 웹이 표식(촛불 봉헌대·제대 앞 등)을 맞히면 그곳으로 걷기 시작한다.
  Future<void> tapAt(double x, double y) => _call('tapAt', {'x': x, 'y': y});

  // --- 창 감상 브리지(GLASS_APP_PLAN §3). 응답은 View* 이벤트로 온다. ---

  /// 창 [win](카탈로그 id)을 감상 모드로 연다. [mode]는 'room'(감상실, `init`의 church가
  /// 'glass_room')|'church'(성당 안 창), [tier]는 질감 단계 't1'|'t2'|'t3',
  /// [light]는 'ref'(기준광)|'sun'|'night'. [hour]는 'sun'일 때의 시각(6~20).
  Future<void> viewWindow({
    required String win,
    String mode = 'room',
    String tier = 't1',
    String light = 'ref',
    double? hour,
  }) => _call('viewWindow', {
    'win': win,
    'mode': mode,
    'tier': tier,
    'light': light,
    'hour': ?hour,
  });

  /// 감상을 끝낸다. 웹이 [ViewEnd]로 머문 시간·확대·이동 여부를 알린다.
  Future<void> endView() => _call('endView', const {});

  /// 빛을 바꾼다('ref'|'sun'|'night').
  Future<void> setViewLight({required String light, double? hour}) =>
      _call('setViewLight', {'light': light, 'hour': ?hour});

  /// 질감 단계를 바꾼다('t1'|'t2'|'t3').
  Future<void> setViewTier(String tier) => _call('setViewTier', {'tier': tier});

  /// 확대·이동을 처음 구도로 되돌린다.
  Future<void> resetView() => _call('resetView', const {});

  // --- 일시정지·복원 ---

  /// 보이지 않는 동안: 그리기 고리(rAF)·애니메이션·소리를 멈춘다. 웹이 [SceneState]로 지금 상태를 알린다.
  Future<void> pause() => _call('pause', const {});

  /// 다시 보일 때: 멈춘 자리에서 잇는다.
  Future<void> resume() => _call('resume', const {});

  /// 새로 만든 장면에 저장해 둔 상태(`ChurchResumeState.toSceneArgs`)를 적용한다.
  /// 웹이 (앉았으면 [SceneSeated] 다음에) [SceneRestored]로 결과를 알린다.
  Future<void> restore(Map<String, Object?> state) => _call('restore', state);

  /// 서버가 좌석 요청을 거부했을 때(웹이 앉기를 취소하고 일어서도록).
  Future<void> setSeatTaken(String seat) =>
      _call('setSeatTaken', {'seat': seat});

  @mustCallSuper
  void dispose() {
    _disposed = true;
    ChurchDiagnostics.perfHud.removeListener(_onPerfHud);
    _queue.clear();
    _events.close();
    _load.dispose();
    _firstFrame.dispose();
  }
}

/// `window.ChurchAPI.<method>(<json>)` 문자열을 만든다.
/// JSON을 그대로 JS 표현식으로 쓰므로, JS 파서가 줄바꿈으로 취급하는
/// U+2028/2029만 이스케이프하면 안전하다.
String churchApiScript(String method, Map<String, Object?> args) {
  final json = jsonEncode(args)
      .replaceAll('\u2028', r'\u2028')
      .replaceAll('\u2029', r'\u2029');
  // 웹에 그 메서드가 없으면(목록 bridge.js METHODS 에서 빠짐) 조용히 버리지 않고 {e:'apiMissing'} 로 알린다.
  return 'try{if(window.ChurchAPI&&window.ChurchAPI.$method){'
      'window.ChurchAPI.$method($json);}'
      'else if(window.ChurchAPI&&window.ChurchBridge){'
      'var o={e:"apiMissing"};o.m="$method";window.ChurchBridge.post(o);}}catch(e){}';
}

/// webview_flutter 기반 구현.
class WebViewChurchSceneController extends ChurchSceneController {
  WebViewChurchSceneController({
    this.assetPath = 'assets/church/index.html',
    this.readyTimeout = const Duration(seconds: 25),
  }) {
    final PlatformWebViewControllerCreationParams params;
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      params = WebKitWebViewControllerCreationParams(
        allowsInlineMediaPlayback: true,
        mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
      );
    } else {
      params = const PlatformWebViewControllerCreationParams();
    }
    final c = WebViewController.fromPlatformCreationParams(params);
    _controller = c;
    c
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      // 흰 화면 방지: 장면을 짓는 동안 웹뷰 바탕이 투명/흰색으로 비치지 않게 성당 먹색으로 칠한다.
      ..setBackgroundColor(ChurchTheme.scheme.surface)
      ..addJavaScriptChannel(
        'FlutterChurch',
        onMessageReceived: (m) {
          // 개발용 터치 기록·없는 메서드 알림(일반 빌드에서는 기록하지 않고 버린다)
          // 웹 장면의 JS 오류 → 오류 기록(lib/diag). 모든 빌드에서 기록한다(기기 안에만).
          if (DiagJs.handleRaw(m.message)) return;
          if (ChurchTouchTrace.handleRaw(m.message)) return;
          if (ChurchDiagnostics.handleRaw(m.message)) return;
          // 개발용 임시 유리 표시(일반 빌드에서는 무시)
          if (DevGlass.handleRaw(m.message)) return;
          final e = SceneEvent.parse(m.message);
          if (e == null) return;
          if (e is SceneReady) _readyTimer?.cancel();
          dispatch(e);
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onWebResourceError: (err) {
            if (err.isForMainFrame ?? true) _fail();
          },
        ),
      );
    _tryConfigure(() => c.enableZoom(false));
    _tryConfigure(() => c.setOverScrollMode(WebViewOverScrollMode.never));
    final platform = c.platform;
    if (platform is AndroidWebViewController) {
      // 조이스틱은 Flutter 쪽 터치라 웹이 제스처를 받지 못한다. 오디오 자동 재생 허용.
      _tryConfigure(() => platform.setMediaPlaybackRequiresUserGesture(false));
    }
    _load0();
  }

  final String assetPath;
  final Duration readyTimeout;
  late final WebViewController _controller;
  Timer? _readyTimer;

  static void _tryConfigure(Future<void> Function() f) {
    try {
      f().catchError((Object e) => debugPrint('webview option failed: $e'));
    } catch (e) {
      debugPrint('webview option failed: $e');
    }
  }

  void _load0() {
    _readyTimer?.cancel();
    _readyTimer = Timer(readyTimeout, _fail);
    // 개발용 빌드(ROSARIUM_DEV_GLASS)에서만 같은 자산을 `?devglass=1` 로 연다(일반 빌드는 dev == null).
    final dev = DevGlass.sceneUri(assetPath);
    unawaited(
      (dev != null
              ? _controller.loadRequest(dev)
              : _controller.loadFlutterAsset(assetPath))
          .catchError((Object e) {
            debugPrint('church asset load failed: $e');
            _fail();
          }),
    );
  }

  void _fail() {
    _readyTimer?.cancel();
    setLoadError();
  }

  @override
  Future<void> reload() async {
    await super.reload();
    _load0();
  }

  @override
  Future<void> invoke(String method, Map<String, Object?> args) =>
      // 실패는 부르는 쪽(ChurchSceneController._invoke)이 로그·터치 기록에 남긴다.
      _controller.runJavaScript(churchApiScript(method, args));

  @override
  Future<bool> isAlive() async {
    if (isDisposed) return false;
    // 아직 불러오는 중이거나 이미 오류 화면이면 따로 판단하지 않는다(다시 시도 버튼이 있다).
    if (loadState.value != SceneLoad.ready) return true;
    try {
      final r = await _controller
          .runJavaScriptReturningResult('window.ChurchAPI?1:0')
          .timeout(const Duration(seconds: 4));
      return '$r' == '1' || r == 1 || r == 1.0;
    } catch (e) {
      debugPrint('church scene not alive: $e');
      return false;
    }
  }

  @override
  Widget buildView(BuildContext context) =>
      WebViewWidget(controller: _controller);

  @override
  void dispose() {
    _readyTimer?.cancel();
    super.dispose();
  }
}

/// 테스트용 가짜: 모든 호출을 기록하고, 웹 이벤트는 [emit]으로 흉내 낸다.
class FakeChurchSceneController extends ChurchSceneController {
  /// 실제로 웹에 전달됐을 호출들(이름, 인자).
  final List<(String, Map<String, Object?>)> calls = [];

  @override
  Future<void> invoke(String method, Map<String, Object?> args) async {
    calls.add((method, args));
  }

  /// true 면 [SceneReady] 직후 첫 프레임([SceneFirstFrame])도 온 것으로 친다(입장 화면 덮개가 곧바로 걷힌다).
  /// 입장 화면을 시험할 때만 false 로 둔다.
  bool autoFirstFrame = true;

  /// 웹에서 온 이벤트를 흉내 낸다.
  void emit(SceneEvent e) {
    dispatch(e);
    if (e is SceneReady && autoFirstFrame) dispatch(const SceneFirstFrame());
  }

  void failLoad() => setLoadError();

  /// 렌더 프로세스가 정리된 것을 흉내 낸다([isAlive]가 false).
  bool alive = true;

  @override
  Future<bool> isAlive() async => alive;

  /// 어떤 [SceneEvent]든 웹에서 온 것처럼 흉내 낸다.
  void dispatchForTest(SceneEvent e) => dispatch(e);

  // --- 창 감상 ---
  void emitViewReady({String win = '', String tier = 't1', int ms = 300}) =>
      dispatch(ViewReady(win: win, tier: tier, ms: ms));
  void emitViewEnd({
    String win = '',
    double seconds = 10,
    double zoomMax = 1,
    bool panned = false,
  }) => dispatch(
    ViewEnd(win: win, seconds: seconds, zoomMax: zoomMax, panned: panned),
  );
  void emitViewError(ViewErrorReason reason, {String win = ''}) =>
      dispatch(ViewError(win: win, reason: reason));

  /// 마지막 `viewWindow` 인자.
  Map<String, Object?>? get lastView => lastArgs('viewWindow');

  /// `endView`가 오면 이 이벤트로 바로 응답한다(없으면 응답 없음).
  ViewEnd? endViewReply;

  @override
  Future<void> endView() async {
    await super.endView();
    final r = endViewReply;
    if (r != null) dispatch(r);
  }

  /// `walkTo`로 요청한 kind들(순서대로).
  List<String> get walkKinds => [
    for (final a in argsOf('walkTo')) a['kind'] as String,
  ];

  int count(String method) => calls.where((c) => c.$1 == method).length;
  List<Map<String, Object?>> argsOf(String method) => [
    for (final c in calls)
      if (c.$1 == method) c.$2,
  ];
  Map<String, Object?>? lastArgs(String method) {
    final l = argsOf(method);
    return l.isEmpty ? null : l.last;
  }

  int reloads = 0;

  @override
  Future<void> reload() async {
    reloads++;
    await super.reload();
  }

  @override
  Widget buildView(BuildContext context) => Listener(
    // 웹뷰(플랫폼 뷰) 자리에 닿은 손가락 수: 걷는 동안은 앱 입력 층이 다 맡아 0 이어야 한다.
    onPointerDown: (_) => viewPointerDowns++,
    child: ColoredBox(
      key: const ValueKey('fake-scene'),
      // 시험용 가짜 장면: 어두운 3D 장면 자리표시(고정 색 대신 테마의 scrim 역할).
      color: Theme.of(context).colorScheme.scrim,
    ),
  );

  /// 장면 자리(실제로는 웹뷰)가 받은 손가락 수.
  int viewPointerDowns = 0;
}
