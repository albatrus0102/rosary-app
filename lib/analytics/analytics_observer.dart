import 'package:flutter/widgets.dart';

import 'analytics.dart';

/// 화면 전환을 `screen_view` 이벤트로 기록하는 [NavigatorObserver].
///
/// 화면 id는 `route.settings.name`에서 만든다(`/`는 `home`, 앞의 `/` 제거, 소문자,
/// 영문·숫자·`_` 외 문자는 `_`). 이름 없는 라우트와 `PageRoute`가 아닌 것(다이얼로그,
/// 바텀시트)은 무시한다. 같은 화면이 [debounce] 안에 연달아 기록되는 것은 한 번만 센다.
class AnalyticsObserver extends NavigatorObserver {
  AnalyticsObserver({
    this._analytics,
    this.debounce = const Duration(seconds: 1),
    DateTime Function()? now,
  }) : _now = now ?? DateTime.now;

  final Analytics? _analytics;
  final Duration debounce;
  final DateTime Function() _now;

  String? _lastScreen;
  DateTime? _lastAt;

  Analytics get _a => _analytics ?? Analytics.instance;

  /// `RouteSettings.name` → 화면 id(이름 없으면 null).
  static String? screenIdFor(Route<dynamic>? route) {
    if (route == null || route is! PageRoute) return null;
    final raw = route.settings.name;
    if (raw == null || raw.trim().isEmpty) return null;
    var id = raw.trim().toLowerCase();
    if (id == '/') return 'home';
    id = id.replaceAll(RegExp(r'^/+'), '');
    id = id.replaceAll(RegExp(r'[^a-z0-9_]+'), '_');
    id = id.replaceAll(RegExp(r'^_+|_+$'), '');
    if (id.isEmpty) return null;
    if (id.length > 40) id = id.substring(0, 40);
    return id;
  }

  void _record(Route<dynamic>? route) {
    final id = screenIdFor(route);
    if (id == null) return;
    final now = _now();
    if (id == _lastScreen &&
        _lastAt != null &&
        now.difference(_lastAt!) < debounce) {
      return;
    }
    _lastScreen = id;
    _lastAt = now;
    _a.screen(id);
  }

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      _record(route);

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) =>
      _record(newRoute);

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    // 다이얼로그·바텀시트가 닫힐 때는 화면이 바뀌지 않으므로 기록하지 않는다.
    if (route is! PageRoute) return;
    _record(previousRoute);
  }
}
