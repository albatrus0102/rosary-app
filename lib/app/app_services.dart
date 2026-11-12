import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../auth/auth_service.dart';
import '../auth/consent_store.dart';
import '../auth/fake_auth_service.dart';
import '../stats/prayer_stats_store.dart';
import '../sync/prayer_sync.dart';
import 'settings.dart';

/// 앱 전체가 함께 쓰는 서비스 묶음. `main()`이 만들어 [RosaryApp]에 넘기고,
/// 화면은 [AppServicesScope]로 꺼내 쓴다.
///
/// 백엔드가 설정되지 않은 빌드([backendConfigured] == false)에서는 로그인도
/// 업로드도 없다(SPEC §0). 이때 [auth]·[consent]는 네트워크를 쓰지 않는 가짜다.
class AppServices {
  const AppServices({
    required this.settings,
    required this.stats,
    required this.auth,
    required this.consent,
    required this.backendConfigured,
    this.sync,
  });

  /// 네트워크도 디스크도 쓰지 않는 기본 묶음(테스트·백엔드 미설정 개발용).
  factory AppServices.inMemory(
    AppSettings settings, {
    AuthService? auth,
    PrayerStatsStore? stats,
    ConsentBackend? consentBackend,
    bool backendConfigured = false,
  }) {
    final authService = auth ?? FakeAuthService();
    return AppServices(
      settings: settings,
      stats: stats ?? PrayerStatsStore.inMemory(),
      auth: authService,
      consent: ConsentStore(
        prefs: _MemoryPrefs(),
        authService: authService,
        backend: consentBackend ?? InMemoryConsentBackend(),
      ),
      backendConfigured: backendConfigured,
    );
  }

  final AppSettings settings;
  final PrayerStatsStore stats;
  final AuthService auth;
  final ConsentStore consent;

  /// Supabase가 설정되어 초기화되었는지. false이면 로그인 없이 열리고 업로드하지 않는다.
  final bool backendConfigured;

  /// 기도 기록 동기화(백엔드가 설정되었을 때만).
  final PrayerSync? sync;

  /// 이 묶음이 직접 만든 가짜 서비스를 정리한다(주입받은 것은 건드리지 않는다).
  void disposeInMemory() {
    consent.dispose();
    auth.dispose();
  }
}

/// 서버 없이 동의 기록을 메모리에만 두는 [ConsentBackend].
class InMemoryConsentBackend implements ConsentBackend {
  final Map<String, ConsentRecord> _latest = {};

  @override
  Future<void> setConsent({
    required String kind,
    required bool granted,
    required String version,
    required String source,
  }) async {
    _latest[kind] = ConsentRecord(
      kind: kind,
      granted: granted,
      version: version,
      at: DateTime.now(),
    );
  }

  @override
  Future<List<ConsentRecord>> fetchLatest() async => _latest.values.toList();
}

/// [ConsentStore]가 쓰는 메서드만 구현한 메모리 저장소(기본 서비스 묶음 전용).
class _MemoryPrefs implements SharedPreferences {
  final Map<String, String> _strings = {};

  @override
  String? getString(String key) => _strings[key];

  @override
  Future<bool> setString(String key, String value) async {
    _strings[key] = value;
    return true;
  }

  @override
  Future<bool> remove(String key) async {
    _strings.remove(key);
    return true;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// 위젯 트리 위쪽(`MaterialApp` 위)에서 [AppServices]를 내려 준다.
class AppServicesScope extends InheritedWidget {
  const AppServicesScope({
    super.key,
    required this.services,
    required super.child,
  });

  final AppServices services;

  /// 없으면 null. 서비스 없이 만든 위젯(단독 위젯 테스트)은 통계·계정 기능만 빠진다.
  static AppServices? maybeOf(BuildContext context) =>
      context.getInheritedWidgetOfExactType<AppServicesScope>()?.services;

  static AppServices of(BuildContext context) {
    final s = maybeOf(context);
    assert(s != null, 'AppServicesScope가 위젯 트리에 없습니다.');
    return s!;
  }

  @override
  bool updateShouldNotify(AppServicesScope old) => services != old.services;
}
