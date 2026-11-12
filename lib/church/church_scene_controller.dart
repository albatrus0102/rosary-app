import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

/// 웹 장면(three.js)이 Flutter로 보내는 이벤트 (`FlutterChurch` 채널).
sealed class SceneEvent {
  const SceneEvent();

  /// 채널 메시지(JSON 문자열)를 해석한다. 알 수 없거나 깨진 메시지는 null.
  static SceneEvent? parse(String raw) {
    try {
      final j = jsonDecode(raw);
      if (j is! Map) return null;
      switch (j['e']) {
        case 'ready':
          return const SceneReady();
        case 'near':
          final seat = j['seat'];
          final candle = j['candle'];
          final station = j['station'];
          return SceneNear(
            seat: seat is String ? seat : null,
            candle: candle is num ? candle.toInt() : null,
            station: station is String ? station : null,
          );
        case 'seated':
          final seat = j['seat'];
          return SceneSeated(seat is String ? seat : '');
        case 'stood':
          return const SceneStood();
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
      }
    } catch (_) {}
    return null;
  }
}

class SceneReady extends SceneEvent {
  const SceneReady();
}

/// 가까이 있는 것. [seat]은 앉을 수 있는 빈 좌석, [candle]은 촛불 슬롯,
/// [station]은 서 있는 스테이션('altar' 제대 앞, 'font' 성수대)이다.
class SceneNear extends SceneEvent {
  const SceneNear({this.seat, this.candle, this.station});
  final String? seat;
  final int? candle;
  final String? station;

  @override
  bool operator ==(Object other) =>
      other is SceneNear &&
      other.seat == seat &&
      other.candle == candle &&
      other.station == station;

  @override
  int get hashCode => Object.hash(seat, candle, station);
}

/// 성당을 불러온 뒤 한 번: 갈 수 있는 스테이션 개수(성수대는 없는 성당이 있다).
class SceneStations extends SceneEvent {
  const SceneStations({this.candle = 0, this.altar = 0, this.font = 0});
  final int candle;
  final int altar;
  final int font;
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

class ScenePos extends SceneEvent {
  const ScenePos(this.x, this.z, this.r, this.moving);
  final double x;
  final double z;
  final double r;
  final bool moving;
}

/// 웹의 성능 표본. [fps]는 구간 평균(첫 표본은 입장 4초 뒤, 이후 5초마다),
/// [tier]는 화질 단계('low'|'high'), [seated]는 앉아 있었는지.
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

/// 웹 장면의 로딩 상태.
enum SceneLoad { loading, ready, error }

/// 웹 장면과의 브리지 추상화. 실제 구현은 [WebViewChurchSceneController],
/// 테스트는 [FakeChurchSceneController].
///
/// Flutter→웹 호출은 모두 [invoke]를 거치며(`window.ChurchAPI.<method>(<json>)`),
/// `init`이 끝나기 전의 호출은 순서대로 쌓아 두었다가 `init` 직후 보낸다.
abstract class ChurchSceneController {
  final StreamController<SceneEvent> _events =
      StreamController<SceneEvent>.broadcast();
  final ValueNotifier<SceneLoad> _load = ValueNotifier(SceneLoad.loading);
  final List<(String, Map<String, Object?>)> _queue = [];
  bool _initDone = false;
  bool _disposed = false;

  /// 웹 → Flutter 이벤트.
  Stream<SceneEvent> get events => _events.stream;

  /// 로딩/오류 상태(오류면 화면이 다시 시도 버튼을 보여 준다).
  ValueListenable<SceneLoad> get loadState => _load;

  bool get isDisposed => _disposed;
  bool get initDone => _initDone;

  /// 실제 JS 호출. 구현체가 만든다.
  @protected
  Future<void> invoke(String method, Map<String, Object?> args);

  /// 3D 화면 위젯.
  Widget buildView(BuildContext context);

  /// 오류 상태에서 다시 불러온다.
  Future<void> reload() async {
    _initDone = false;
    _queue.clear();
    _load.value = SceneLoad.loading;
  }

  /// 구현체가 웹 메시지/이벤트를 받았을 때 부른다.
  @protected
  void dispatch(SceneEvent e) {
    if (_disposed) return;
    if (e is SceneReady) _load.value = SceneLoad.ready;
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
          method == 'cancelWalk' ||
          method == 'resetView' ||
          method == 'endView') {
        return;
      }
      if (_queue.length < 300) _queue.add((method, args));
      return;
    }
    await invoke(method, args);
    if (method == 'init') {
      _initDone = true;
      final pending = List.of(_queue);
      _queue.clear();
      for (final (m, a) in pending) {
        if (_disposed) return;
        await invoke(m, a);
      }
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

  Future<void> setJoystick(double x, double y) =>
      _call('setJoystick', {'x': x, 'y': y});
  Future<void> sit({String? seat}) => _call('sit', {'seat': ?seat});
  Future<void> stand() => _call('stand', const {});
  Future<void> setPraying({required bool on, required int ms}) =>
      _call('setPraying', {'on': on, 'ms': ms});
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
  Future<void> peerPraying(String id, {required bool on, required int ms}) =>
      _call('peerPraying', {'id': id, 'on': on, 'ms': ms});
  Future<void> peerEmote(String id, int e) =>
      _call('peerEmote', {'id': id, 'e': e});
  Future<void> setCandles(List<Map<String, Object?>> candles) =>
      _call('setCandles', {'candles': candles});
  Future<void> lightCandle({
    required int slot,
    required int until,
    required int intention,
  }) => _call('lightCandle', {
    'slot': slot,
    'until': until,
    'intention': intention,
  });
  Future<void> setAmbient({required bool on}) =>
      _call('setAmbient', {'on': on});
  Future<void> setHour(double hour) => _call('setHour', {'hour': hour});
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

  /// 왼쪽 절반 터치는 Flutter가 가로채므로, 거기서 일어난 탭을 화면 좌표(논리 픽셀)로 웹에 넘긴다.
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

  /// 서버가 좌석 요청을 거부했을 때(웹이 앉기를 취소하고 일어서도록).
  Future<void> setSeatTaken(String seat) =>
      _call('setSeatTaken', {'seat': seat});

  @mustCallSuper
  void dispose() {
    _disposed = true;
    _queue.clear();
    _events.close();
    _load.dispose();
  }
}

/// `window.ChurchAPI.<method>(<json>)` 문자열을 만든다.
/// JSON을 그대로 JS 표현식으로 쓰므로, JS 파서가 줄바꿈으로 취급하는
/// U+2028/2029만 이스케이프하면 안전하다.
String churchApiScript(String method, Map<String, Object?> args) {
  final json = jsonEncode(args)
      .replaceAll('\u2028', r'\u2028')
      .replaceAll('\u2029', r'\u2029');
  return 'try{if(window.ChurchAPI&&window.ChurchAPI.$method){'
      'window.ChurchAPI.$method($json);}}catch(e){}';
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
      ..setBackgroundColor(Colors.transparent)
      ..addJavaScriptChannel(
        'FlutterChurch',
        onMessageReceived: (m) {
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
    unawaited(
      _controller.loadFlutterAsset(assetPath).catchError((Object e) {
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
  Future<void> invoke(String method, Map<String, Object?> args) async {
    try {
      await _controller.runJavaScript(churchApiScript(method, args));
    } catch (e) {
      debugPrint('ChurchAPI.$method failed: $e');
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

  /// 웹에서 온 이벤트를 흉내 낸다.
  void emit(SceneEvent e) => dispatch(e);

  void failLoad() => setLoadError();

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
  Widget buildView(BuildContext context) =>
      const ColoredBox(key: ValueKey('fake-scene'), color: Color(0xFF202020));
}
