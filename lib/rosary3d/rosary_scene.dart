import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// 3D 묵주 장면(assets/rosary3d/index.html)과의 다리. Flutter 가 상태·제스처·햅틱을 맡고 웹은 그리기만 한다.
///
/// 웹이 준비되기 전의 상태 변경은 [state]에 모았다가 'ready' 때 한 번에 `init` 으로 보낸다.
/// 끌기 값처럼 잦은 호출은 한 번에 하나만 보내고, 그 사이에 온 값은 마지막 것만 보낸다.
class RosaryScene extends ChangeNotifier {
  RosaryScene();

  /// 웹에 보낼 현재 상태(init 인자와 같은 모양).
  final Map<String, Object?> state = {
    'rosary': 'olive',
    'step': 0,
    'view': 'c',
    'theme': 'navy',
    'hand': 'center',
    'quality': 'high',
    'reduceMotion': false,
    'gallery': false,
    'compact': false,
  };

  bool _ready = false;
  bool _failed = false;
  bool get ready => _ready;
  bool get failed => _failed;

  /// 웹이 한 번 그린 시간(ms) 등 진단.
  int? lastBuildMs;

  void setStep(int step, {bool animate = true}) {
    state['step'] = step;
    _call('setStep', {'step': step, 'animate': animate});
  }

  void setDrag(double offset, {required bool active}) =>
      _callLatest('setDrag', {'offset': offset, 'active': active});

  void setFullView(bool full) {
    state['view'] = full ? 'a' : 'c';
    _call('setView', {'view': state['view']});
    notifyListeners();
  }

  bool get fullView => state['view'] == 'a';

  void setRosary(String id) {
    if (state['rosary'] == id) return;
    state['rosary'] = id;
    _call('setRosary', {'id': id});
  }

  void setTheme(String theme) {
    if (state['theme'] == theme) return;
    state['theme'] = theme;
    _call('setTheme', {'theme': theme});
  }

  void setHand(String hand) {
    if (state['hand'] == hand) return;
    state['hand'] = hand;
    _call('setHand', {'hand': hand});
  }

  void setReduceMotion(bool on) {
    if (state['reduceMotion'] == on) return;
    state['reduceMotion'] = on;
    _call('setReduceMotion', {'on': on});
  }

  void setOrbit(double yaw, double pitch, double zoom) =>
      _callLatest('setOrbit', {'yaw': yaw, 'pitch': pitch, 'zoom': zoom});

  /// 웹에서 온 메시지(JSON 문자열).
  @protected
  void onWebMessage(String raw) {
    Map<String, Object?> m;
    try {
      m = (jsonDecode(raw) as Map).cast<String, Object?>();
    } catch (_) {
      return;
    }
    switch (m['e']) {
      case 'ready':
        _ready = true;
        unawaited(invoke('init', state));
        notifyListeners();
      case 'built':
        lastBuildMs = (m['ms'] as num?)?.toInt();
        notifyListeners();
      case 'error':
        debugPrint('rosary3d error: ${m['msg']}');
    }
  }

  @protected
  void setFailed() {
    _failed = true;
    notifyListeners();
  }

  void _call(String method, Map<String, Object?> args) {
    if (!_ready) return; // init 때 state 로 한꺼번에 간다
    unawaited(invoke(method, args));
  }

  final Map<String, Map<String, Object?>> _pending = {};
  final Set<String> _inFlight = {};
  void _callLatest(String method, Map<String, Object?> args) {
    if (!_ready) return;
    if (_inFlight.contains(method)) {
      _pending[method] = args;
      return;
    }
    _inFlight.add(method);
    unawaited(
      invoke(method, args).whenComplete(() {
        _inFlight.remove(method);
        final next = _pending.remove(method);
        if (next != null) _callLatest(method, next);
      }),
    );
  }

  /// 웹의 `RosaryAPI.<method>(args)` 를 부른다. 테스트 가짜는 기록만 한다.
  @protected
  Future<void> invoke(String method, Map<String, Object?> args) async {}

  /// 그릴 위젯. 가짜는 빈 상자.
  Widget buildView(BuildContext context) => const SizedBox.expand();

  /// WebView 가 없는 환경(위젯 테스트)에서는 가짜를 쓴다.
  static RosaryScene create() =>
      WebViewPlatform.instance == null ? FakeRosaryScene() : WebRosaryScene();
}

/// 실제 WebView 장면. 성당 WebView 와 같은 자산 로딩(loadFlutterAsset, file://)이다.
class WebRosaryScene extends RosaryScene {
  WebRosaryScene() {
    final c = WebViewController();
    _controller = c;
    c
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF1E2842))
      ..addJavaScriptChannel(
        'FlutterRosary',
        onMessageReceived: (m) => onWebMessage(m.message),
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onWebResourceError: (err) {
            if (err.isForMainFrame ?? true) setFailed();
          },
        ),
      );
    unawaited(
      c.loadFlutterAsset('assets/rosary3d/index.html').catchError((Object e) {
        debugPrint('rosary3d load failed: $e');
        setFailed();
      }),
    );
  }

  late final WebViewController _controller;

  @override
  Future<void> invoke(String method, Map<String, Object?> args) async {
    try {
      await _controller.runJavaScript(
        'window.RosaryAPI&&RosaryAPI.$method(${jsonEncode(args)})',
      );
    } catch (e) {
      debugPrint('RosaryAPI.$method failed: $e');
    }
  }

  @override
  Widget buildView(BuildContext context) =>
      WebViewWidget(controller: _controller);
}

/// 테스트용 가짜: 웹 호출을 기록하고, 곧바로 준비된 것처럼 군다.
class FakeRosaryScene extends RosaryScene {
  FakeRosaryScene() {
    onWebMessage('{"e":"ready"}');
  }

  final List<(String, Map<String, Object?>)> calls = [];

  @override
  Future<void> invoke(String method, Map<String, Object?> args) async {
    calls.add((method, Map.of(args)));
  }
}
