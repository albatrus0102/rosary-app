import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/auth/auth_service.dart';
import 'package:rosary_app/auth/consent_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 네트워크 없이 서버 동의 표를 흉내 내는 백엔드.
class FakeConsentBackend implements ConsentBackend {
  /// false이면 모든 호출이 실패한다(오프라인).
  bool online = true;

  /// 서버에 있다고 가정하는 최신 기록.
  final Map<String, ConsentRecord> server = {};

  /// 서버가 받은 기록(순서 유지).
  final List<ConsentChange> received = [];
  final List<String> receivedVersions = [];

  @override
  Future<void> setConsent({
    required String kind,
    required bool granted,
    required String version,
    required String source,
  }) async {
    if (!online) throw Exception('offline');
    received.add(ConsentChange(kind, granted));
    receivedVersions.add(version);
    server[kind] = ConsentRecord(
      kind: kind,
      granted: granted,
      version: version,
      at: DateTime.now(),
    );
  }

  @override
  Future<List<ConsentRecord>> fetchLatest() async {
    if (!online) throw Exception('offline');
    return server.values.toList();
  }
}

Future<ConsentStore> makeConsentStore(
  AuthService auth, {
  FakeConsentBackend? backend,
  String version = consentVersion,
  SharedPreferences? prefs,
}) async {
  final p = prefs ?? await _freshPrefs();
  return ConsentStore(
    prefs: p,
    authService: auth,
    backend: backend,
    version: version,
  );
}

Future<SharedPreferences> _freshPrefs() async {
  SharedPreferences.setMockInitialValues({});
  return SharedPreferences.getInstance();
}

/// 앱 테마를 씌운 테스트 호스트. [textScale]로 글자 확대를 흉내 낸다.
Widget authHost(Widget home, {double textScale = 1.0, Brightness? brightness}) {
  return MaterialApp(
    theme: brightness == Brightness.dark ? AppTheme.dark() : AppTheme.light(),
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(context)
          .copyWith(textScaler: TextScaler.linear(textScale)),
      child: child!,
    ),
    home: home,
  );
}

void setScreen(WidgetTester tester, Size size) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

/// 같은 테스트 안에서 '앱 재시작'을 흉내 내기 위해 prefs를 공유한다.
abstract final class SharedPreferencesHolder {
  static SharedPreferences? _prefs;

  static void reset() {
    SharedPreferences.setMockInitialValues({});
    _prefs = null;
  }

  static Future<SharedPreferences> get() async =>
      _prefs ??= await SharedPreferences.getInstance();
}
