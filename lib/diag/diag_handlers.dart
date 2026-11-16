import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'diag_recorder.dart';

/// 처리되지 않은 오류를 오류 기록([DiagRecorder])에 남기는 전역 처리기. `main()`이 가장 먼저 단다.
///
/// * `FlutterError.onError`(빌드·배치·그리기·제스처 등 프레임워크가 잡은 오류)와
///   `PlatformDispatcher.instance.onError`(어디서도 기다리지 않은 Future 등 뿌리 존의 오류)에 **이어 붙인다** —
///   기존 처리기(디버그 콘솔 출력 `FlutterError.presentError`, 분석의 `ErrorReporter`)는 그대로 불린다.
/// * `runZonedGuarded`는 쓰지 않는다: `PlatformDispatcher.onError`가 같은 오류를 받고, 존을 하나 더 두면
///   `ensureInitialized`와 `runApp`의 존이 어긋나는 경고가 난다(Flutter 문서의 권장 방식).
class DiagHandlers {
  DiagHandlers._(this._recorder);

  /// 이미 달았으면 그것을 돌려준다.
  static DiagHandlers install({DiagRecorder? recorder}) {
    final cur = _current;
    if (cur != null) return cur;
    final h = DiagHandlers._(recorder);
    h._hook();
    return _current = h;
  }

  static DiagHandlers? _current;

  final DiagRecorder? _recorder;
  DiagRecorder get _r => _recorder ?? DiagRecorder.instance;

  FlutterExceptionHandler? _prevFlutter;
  ErrorCallback? _prevPlatform;
  FlutterExceptionHandler? _myFlutter;
  ErrorCallback? _myPlatform;

  /// 흔한 네트워크 오류(서버·연결 문제) — 기록은 하되 「문제가 생겼어요」 안내는 띄우지 않는다.
  static final RegExp _benign = RegExp(
    r'^(SocketException|TimeoutException|HttpException|ClientException|HandshakeException|'
    r'WebSocketChannelException|AuthRetryableFetchException|AuthException|PostgrestException|'
    r'RealtimeSubscribeException|StorageException|FunctionException)',
  );

  void _hook() {
    _prevFlutter = FlutterError.onError;
    _prevPlatform = PlatformDispatcher.instance.onError;
    _myFlutter = (FlutterErrorDetails d) {
      try {
        _r.error(
          'flutter',
          d.exception,
          stack: d.stack,
          lib: d.library,
          // silent: 이미지 불러오기처럼 프레임워크가 스스로 「조용히」라 표시한 것은 안내하지 않는다.
          unexpectedError:
              !d.silent &&
              !_benign.hasMatch(d.exception.runtimeType.toString()),
        );
      } catch (_) {}
      final prev = _prevFlutter;
      if (prev != null) {
        prev(d);
      } else {
        FlutterError.presentError(d);
      }
    };
    _myPlatform = (Object error, StackTrace stack) {
      try {
        _r.error(
          'platform',
          error,
          stack: stack,
          unexpectedError: !_benign.hasMatch(error.runtimeType.toString()),
        );
      } catch (_) {}
      return _prevPlatform?.call(error, stack) ?? false;
    };
    FlutterError.onError = _myFlutter;
    PlatformDispatcher.instance.onError = _myPlatform;
  }

  /// 단 처리기를 뗀다(내 처리기가 아직 맨 위일 때만 되돌린다).
  void uninstall() {
    if (identical(FlutterError.onError, _myFlutter)) {
      FlutterError.onError = _prevFlutter;
    }
    if (identical(PlatformDispatcher.instance.onError, _myPlatform)) {
      PlatformDispatcher.instance.onError = _prevPlatform;
    }
    if (identical(_current, this)) _current = null;
  }
}

/// 앱 생명주기(나감·돌아옴·닫힘)를 발자취로 남긴다 — 오류 직전에 앱이 백그라운드였는지 보인다.
class DiagLifecycle with WidgetsBindingObserver {
  DiagLifecycle._();

  static DiagLifecycle? _current;

  static void install() {
    if (_current != null) return;
    final l = _current = DiagLifecycle._();
    WidgetsBinding.instance.addObserver(l);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.hidden) {
      return; // 잠깐 가려짐은 너무 잦다
    }
    Diag.crumb('life', {'s': state.name});
  }

  @override
  void didHaveMemoryPressure() => Diag.data('memory_pressure');
}
