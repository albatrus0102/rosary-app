import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/analytics.dart';
import 'package:rosary_app/app/app_services.dart';
import 'package:rosary_app/app/app_wiring.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/auth/auth_state.dart';
import 'package:rosary_app/auth/fake_auth_service.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

List<Map<String, dynamic>> _events([String? name]) => [
  for (final e in Analytics.instance.queuedForTest)
    if (name == null || e['name'] == name) e,
];

Map<String, dynamic> _props(Map<String, dynamic> e) =>
    Map<String, dynamic>.from(e['props'] as Map);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late FakeAuthService auth;
  late AppServices services;
  late AppWiring wiring;

  Future<void> settle() => Future<void>.delayed(Duration.zero);

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final settings = await AppSettings.load();
    auth = FakeAuthService();
    services = AppServices.inMemory(settings, auth: auth);
    Analytics.debugReset();
    await Analytics.init(
      uploader: FakeEventUploader(),
      consent: (_) => true,
      userId: null,
      appVersion: '1.0.0+1',
      platform: 'android',
      store: MemoryQueueStore(),
      observeLifecycle: false,
      trackAppOpen: false,
      throwOnUnknownEvent: true,
      batchSize: 1000,
    );
    wiring = AppWiring(services)..start();
  });

  tearDown(() {
    wiring.dispose();
    services.disposeInMemory();
    Analytics.debugReset();
  });

  Future<void> addRecord() => services.stats.add(
    PrayerRecord(at: DateTime.now(), set: MysterySet.joyful, decades: 1),
  );

  test('게스트 시작(익명 로그인)은 login_success가 아니다', () async {
    await auth.signInAnonymously();
    await settle();
    expect(_events('login_success'), isEmpty);
    expect(_events('guest_link'), isEmpty);
  });

  test('게스트 연결: guest_link{provider}만 남고 login_success는 없다', () async {
    await auth.signInAnonymously();
    await settle();
    await auth.linkWithKakao();
    await settle();
    expect(_events('guest_link').map(_props).toList(), [
      {'provider': 'kakao'},
    ]);
    expect(_events('login_success'), isEmpty);
  });

  test('이메일 연결은 확인 뒤에 완료될 때 guest_link', () async {
    await auth.signInAnonymously();
    auth.linkEmailOutcome = EmailSignUpOutcome.confirmationRequired;
    await auth.linkWithEmail('a@b.co', 'abcd1234');
    await settle();
    expect(_events('guest_link'), isEmpty);
    auth.completeLink(LoginProvider.email, email: 'a@b.co');
    await settle();
    expect(_events('guest_link').map(_props).toList(), [
      {'provider': 'email'},
    ]);
  });

  test('게스트에서 다른 실제 계정으로 로그인하면 login_success', () async {
    await auth.signInAnonymously();
    await settle();
    auth.emitSignedIn(userId: 'other', provider: LoginProvider.google);
    await settle();
    expect(_events('login_success').map(_props).toList(), [
      {'provider': 'google'},
    ]);
    expect(_events('guest_link'), isEmpty);
  });

  test('통계 소유자: 게스트가 같은 id로 연결돼도 기록 유지', () async {
    await addRecord(); // 첫 실행 오프라인에서 쌓은 기록
    await auth.signInAnonymously(); // 처음 로그인한 사용자가 이어받는다
    await settle();
    await settle();
    expect(services.stats.records, hasLength(1));
    await auth.linkGoogle();
    await settle();
    await settle();
    expect(services.stats.records, hasLength(1));
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString(AppWiring.statsOwnerKey), 'guest-1');
  });

  test('통계 소유자: 다른 사용자가 로그인하면 이전 게스트 기록을 비운다', () async {
    await auth.signInAnonymously();
    await settle();
    await addRecord();
    expect(services.stats.records, hasLength(1));
    await auth.signOut();
    await auth.signInAnonymously(); // 새 게스트: guest-2
    await settle();
    await settle();
    expect(services.stats.records, isEmpty);
  });
}

extension on FakeAuthService {
  Future<void> linkGoogle() => linkWithGoogle();
}
