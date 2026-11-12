import 'dart:ui';

import 'package:flutter/foundation.dart';

import 'analytics.dart';
import 'analytics_redact.dart';

/// 처리되지 않은 오류를 `error` 이벤트로 보낸다(`diagnostics` 동의가 켜져 있을 때만).
///
/// `FlutterError.onError`와 `PlatformDispatcher.instance.onError`에 **이어 붙인다**
/// (기존 핸들러를 그대로 호출). 분당 최대 5건, 같은 문구는 1분 안에 한 번만,
/// 기기 경로·긴 숫자열·이메일·URL·UUID는 가리고, 절대 던지지 않는다.
class ErrorReporter {
  ErrorReporter._(this._analytics, this._consent, this._now, this.maxPerMinute);

  /// 이어 붙인다. 반환된 객체의 [uninstall]로 원래 핸들러를 되돌릴 수 있다.
  static ErrorReporter install({
    Analytics? analytics,
    required ConsentGate consent,
    DateTime Function()? now,
    int maxPerMinute = 5,
  }) {
    final r = ErrorReporter._(
      analytics,
      consent,
      now ?? DateTime.now,
      maxPerMinute,
    );
    r._hook();
    return r;
  }

  final Analytics? _analytics;
  final ConsentGate _consent;
  final DateTime Function() _now;
  final int maxPerMinute;

  FlutterExceptionHandler? _prevFlutter;
  ErrorCallback? _prevPlatform;
  FlutterExceptionHandler? _myFlutter;
  ErrorCallback? _myPlatform;

  final List<DateTime> _sent = [];
  final Map<String, DateTime> _recent = {};

  Analytics get _a => _analytics ?? Analytics.instance;

  void _hook() {
    _prevFlutter = FlutterError.onError;
    _prevPlatform = PlatformDispatcher.instance.onError;
    _myFlutter = (FlutterErrorDetails details) {
      report('flutter', details.exception, details.stack);
      _prevFlutter?.call(details);
    };
    _myPlatform = (Object error, StackTrace stack) {
      report('platform', error, stack);
      return _prevPlatform?.call(error, stack) ?? false;
    };
    FlutterError.onError = _myFlutter;
    PlatformDispatcher.instance.onError = _myPlatform;
  }

  /// 설치 전 핸들러를 되돌린다(내 핸들러가 아직 맨 위일 때만).
  void uninstall() {
    if (identical(FlutterError.onError, _myFlutter)) {
      FlutterError.onError = _prevFlutter;
    }
    if (identical(PlatformDispatcher.instance.onError, _myPlatform)) {
      PlatformDispatcher.instance.onError = _prevPlatform;
    }
  }

  /// 오류 하나를 보고한다. 조건에 맞지 않으면 아무 일도 하지 않으며 던지지 않는다.
  void report(String where, Object error, StackTrace? stack) {
    try {
      if (!_consent(ConsentKinds.diagnostics)) return;
      final now = _now();
      final message = _cut(Redactor.redact(error.toString()), 200);
      final key = '$where|$message';

      _sent.removeWhere((t) => now.difference(t) >= const Duration(minutes: 1));
      _recent.removeWhere(
        (_, t) => now.difference(t) >= const Duration(minutes: 1),
      );
      if (_recent.containsKey(key)) return;
      if (_sent.length >= maxPerMinute) return;
      _recent[key] = now;
      _sent.add(now);

      _a.track('error', {
        'where': where,
        'message': message,
        'stack': _cut(Redactor.redact(stack?.toString() ?? ''), 1000),
      });
    } catch (_) {
      // 오류 보고가 또 다른 오류를 만들지 않는다.
    }
  }

  static String _cut(String s, int max) =>
      s.length <= max ? s : s.substring(0, max);
}
