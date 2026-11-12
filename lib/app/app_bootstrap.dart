import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../analytics/analytics.dart';
import '../analytics/device_reporter.dart';
import '../analytics/error_reporter.dart';
import '../analytics/supabase_event_uploader.dart';
import '../auth/auth_bootstrap.dart';
import '../auth/auth_service.dart';
import '../auth/consent_store.dart';
import '../auth/fake_auth_service.dart';
import '../auth/supabase_auth_service.dart';
import '../stats/prayer_stats_store.dart';
import '../sync/prayer_sync.dart';
import 'app_services.dart';
import 'app_wiring.dart';
import 'settings.dart';

/// 앱 시작 때 서비스를 만들고 서로 연결한다(`main()`이 부른다).
///
/// 순서: Supabase 초기화(설정된 경우에만) → 설정·기도 기록 읽기 → 인증/동의 서비스 →
/// 분석·오류 보고·기기 정보·기도 기록 동기화(설정된 경우에만).
/// Supabase 설정이 없거나 초기화에 실패하면 로그인 없이 열리고 아무것도 올리지 않는다.
Future<AppServices> bootstrapServices() async {
  var configured = false;
  try {
    configured = await AuthBootstrap.init();
  } catch (_) {
    // 이벤트 이름만 남긴다(주소·키·예외 내용 금지). 로그인 없이 계속한다.
    debugPrint('app: auth bootstrap failed, continuing without backend');
  }

  final settings = await AppSettings.load();
  final stats = await PrayerStatsStore.load();
  final prefs = await SharedPreferences.getInstance();

  if (!configured) {
    // 개발용: 로그인 없이 열린다. 동의·인증은 가짜이고 업로드는 없다.
    final auth = FakeAuthService();
    return AppServices(
      settings: settings,
      stats: stats,
      auth: auth,
      consent: ConsentStore(
        prefs: prefs,
        authService: auth,
        backend: InMemoryConsentBackend(),
      ),
      backendConfigured: false,
    );
  }

  late final AppWiring wiring;
  final AuthService auth = SupabaseAuthService(
    onLocalDataCleared: () => wiring.onAccountDeleted(),
  );
  final consent = ConsentStore(
    prefs: prefs,
    authService: auth,
    backend: SupabaseConsentBackend(),
  );
  final uploader = SupabaseEventUploader();
  bool gate(String kind) => consent.has(kind);

  final sync = PrayerSync(
    uploader: uploader,
    consent: gate,
    store: PrayerStatsStoreRepository(stats),
    userId: () => auth.current.userId,
  );
  final services = AppServices(
    settings: settings,
    stats: stats,
    auth: auth,
    consent: consent,
    backendConfigured: true,
    sync: sync,
  );

  try {
    String version;
    try {
      final pkg = await PackageInfo.fromPlatform();
      version = '${pkg.version}+${pkg.buildNumber}';
    } catch (_) {
      version = 'unknown';
    }
    await Analytics.init(
      uploader: uploader,
      consent: gate,
      userId: auth.current.userId,
      appVersion: version,
    );
    ErrorReporter.install(consent: gate);
  } catch (_) {
    debugPrint('app: analytics init failed, continuing without analytics');
  }

  wiring = AppWiring(
    services,
    reportDevice: () => DeviceReporter.report(
      uploader: uploader,
      consent: gate,
      deviceIdStore: PrefsDeviceIdStore(),
    ),
  )..start();
  return services;
}
