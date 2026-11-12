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
          return SceneNear(
            seat: seat is String ? seat : null,
            candle: candle is num ? candle.toInt() : null,
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
        case 'perf':
          final fps = j['fps'];
          return fps is num ? ScenePerf(fps.toDouble()) : null;
      }
    } catch (_) {}
    return null;
  }
}

class SceneReady extends SceneEvent {
  const SceneReady();
}

class SceneNear extends SceneEvent {
  const SceneNear({this.seat, this.candle});
  final String? seat;
  final int? candle;

  @override
  bool operator ==(Object other) =>
      other is SceneNear && other.seat == seat && other.candle == candle;

  @override
  int get hashCode => Object.hash(seat, candle);
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

class ScenePerf extends SceneEvent {
  const ScenePerf(this.fps);
  final double fps;
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
      // 걷기 입력은 오래된 값이 의미가 없으니 쌓지 않는다.
      if (method == 'setJoystick') return;
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
