import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/analytics.dart';
import 'package:rosary_app/analytics/analytics_observer.dart';
import 'package:rosary_app/app/app.dart';
import 'package:rosary_app/app/app_bootstrap.dart';
import 'package:rosary_app/app/app_services.dart';
import 'package:rosary_app/app/track.dart';
import 'package:rosary_app/app/app_wiring.dart';
import 'package:rosary_app/app/leader_audio_store.dart';
import 'package:rosary_app/app/leader_voice.dart';
import 'package:rosary_app/app/rosary_style.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/auth/account_screen.dart';
import 'package:rosary_app/auth/auth_state.dart';
import 'package:rosary_app/auth/consent_screen.dart';
import 'package:rosary_app/auth/consent_store.dart';
import 'package:rosary_app/auth/fake_auth_service.dart';
import 'package:rosary_app/auth/login_screen.dart';
import 'package:rosary_app/church/avatar/avatar_editor_screen.dart';
import 'package:rosary_app/church/church_catalog.dart';
import 'package:rosary_app/church/church_constants.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:rosary_app/church/church_tab.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';
import 'package:rosary_app/stats/stats_screen.dart';
import 'package:rosary_app/stats/stats_widgets.dart';
import 'package:rosary_app/ui/home_screen.dart';
import 'package:rosary_app/ui/more_screen.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
import 'package:rosary_app/ui/rosary_style_screen.dart';
import 'package:rosary_app/ui/settings_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';

class _SilentSoundPlayer extends SoundPlayer {
  @override
  Future<void> init() async {}
  @override
  Future<void> playDecadeChime() async {}
  @override
  Future<void> playBeadTick() async {}
  @override
  Future<void> dispose() async {}
}

class _FakeStore extends LeaderAudioStore {
  @override
  Future<void> init() async {}
  @override
  bool has(String cueId) => false;
  @override
  int get recordedCount => 0;
}

class _QuietTts extends TtsLeaderVoice {
  @override
  Future<bool> koreanAvailable() async => true;
  @override
  Future<void> preview() async {}
  @override
  Future<void> stop() async {}
  @override
  Future<void> dispose() async {}
}

Future<AppSettings> _settings([Map<String, Object> values = const {}]) async {
  SharedPreferences.setMockInitialValues(values);
  return AppSettings.load();
}

/// 모든 동의가 켜진 분석을 메모리 큐로 시작한다(테스트가 끝나면 치운다).
Future<FakeEventUploader> _startAnalytics({
  ConsentGate? consent,
  String? userId = 'user-1',
}) async {
  Analytics.debugReset();
  final uploader = FakeEventUploader();
  await Analytics.init(
    uploader: uploader,
    consent: consent ?? (_) => true,
    userId: userId,
    appVersion: '1.0.0+1',
    platform: 'android',
    store: MemoryQueueStore(),
    observeLifecycle: false,
    trackAppOpen: false,
    throwOnUnknownEvent: true,
    batchSize: 1000,
  );
  return uploader;
}

List<Map<String, dynamic>> _events([String? name]) => [
  for (final e in Analytics.instance.queuedForTest)
    if (name == null || e['name'] == name) e,
];

Map<String, dynamic> _props(Map<String, dynamic> e) =>
    Map<String, dynamic>.from(e['props'] as Map);

List<String> _screens() => [
  for (final e in _events('screen_view')) _props(e)['screen'] as String,
];

/// 큐에 쌓인 모든 이벤트가 허용 목록 안의 키만 갖고, 지향·글·이름이 없는지 확인한다.
void _expectNoSensitiveProps() {
  for (final e in Analytics.instance.queuedForTest) {
    final name = e['name'] as String;
    final props = _props(e);
    final allowed = AnalyticsEvents.specs[name]!.keys;
    expect(allowed.containsAll(props.keys), isTrue, reason: '$name $props');
    for (final banned in ['intention', 'text', 'note', 'name', 'email']) {
      expect(props.containsKey(banned), isFalse, reason: '$name has $banned');
    }
  }
  expect(
    jsonEncode(Analytics.instance.queuedForTest),
    isNot(contains('intent')),
  );
}

void _size(WidgetTester tester, [Size size = const Size(800, 3200)]) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}

Widget _scoped(AppServices services, Widget home) => AppServicesScope(
  services: services,
  child: MaterialApp(
    navigatorObservers: const [],
    theme: ThemeData(splashFactory: InkRipple.splashFactory),
    home: home,
  ),
);

/// 첫 단을 마칠 때까지 필요한 '다음' 횟수(구원송까지 넘김).
int _nextsForOneDecade(MysterySet set) =>
    buildRosarySequence(set)
        .indexWhere((s) => s.kind == StepKind.fatima && s.decade == 1) +
    1;

Future<void> _nexts(WidgetTester tester, int count) async {
  for (var i = 0; i < count; i++) {
    await tester.tap(find.text('다음'));
    await tester.pump(const Duration(milliseconds: 50));
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(Analytics.debugReset);
  tearDown(Analytics.debugReset);

  group('앱 서비스 묶음', () {
    test('백엔드 설정이 없으면 bootstrapServices는 가짜 서비스로 열고 아무것도 켜지 않는다', () async {
      SharedPreferences.setMockInitialValues({});
      final services = await bootstrapServices();
      addTearDown(services.disposeInMemory);
      expect(services.backendConfigured, isFalse);
      expect(services.sync, isNull);
      expect(services.auth, isA<FakeAuthService>());
      expect(Analytics.isInitialized, isFalse);
      // 분석이 꺼져 있어도 호출은 안전하다.
      Track.event('stats_open', {'range': 'month'});
      Track.screen('home');
    });

    test('Track.textScale은 0.05 단위로 반올림한다', () async {
      await _startAnalytics();
      Track.textScale(1.0000000000000002);
      Track.textScale(0.9500000000000001);
      Track.textScale(1.23);
      expect(_events('text_scale_change').map((e) => _props(e)['scale']), [
        1.0,
        0.95,
        1.25,
      ]);
      Analytics.debugReset();
    });

    testWidgets('서비스 없이도 앱이 열리고 로그인·계정 항목은 없다', (tester) async {
      _size(tester, const Size(400, 900));
      final settings = await _settings();
      await tester.pumpWidget(RosaryApp(settings));
      await tester.pumpAndSettle();

      expect(find.byType(LoginScreen), findsNothing);
      expect(find.textContaining('신비 시작'), findsOneWidget);
      expect(find.byType(StatsSummaryCard), findsOneWidget);

      await tester.tap(
        find.descendant(
          of: find.byType(NavigationBar),
          matching: find.text('더보기'),
        ),
      );
      await tester.pumpAndSettle();
      // 백엔드가 없으면 '계정'은 숨기고 설정·정보만 보인다.
      expect(find.text('계정'), findsNothing);
      expect(find.byType(AccountScreen), findsNothing);
      expect(find.byKey(const ValueKey('more-settings')), findsOneWidget);
    });

    testWidgets('백엔드가 설정되면 동의 한 화면 → 게스트 시작 → 홈 순서로 보인다(로그인 벽 없음)', (
      tester,
    ) async {
      _size(tester, const Size(400, 900));
      final settings = await _settings();
      final auth = FakeAuthService();
      final services = AppServices.inMemory(
        settings,
        auth: auth,
        backendConfigured: true,
      );
      addTearDown(services.disposeInMemory);

      await tester.pumpWidget(RosaryApp(settings, services: services));
      await tester.pumpAndSettle();
      expect(find.byType(LoginScreen), findsNothing);
      expect(find.byType(ConsentScreen), findsOneWidget);
      expect(find.textContaining('신비 시작'), findsNothing);

      await services.consent.grantRequired();
      await tester.pumpAndSettle();
      expect(auth.calls, ['signInAnonymously']);
      expect(auth.current.isAnonymous, isTrue);
      expect(find.byType(ConsentScreen), findsNothing);
      expect(find.textContaining('신비 시작'), findsOneWidget);

      // 게스트를 로그아웃하면 다시 동의부터(새 게스트).
      await auth.signOut();
      await tester.pumpAndSettle();
      expect(find.byType(ConsentScreen), findsOneWidget);
      expect(find.byType(LoginScreen), findsNothing);
    });

    testWidgets('더보기 > 계정 항목은 설정된 때만 보이고 제공자를 알려 준다', (tester) async {
      _size(tester);
      final settings = await _settings();
      final auth = FakeAuthService(
        initial: const AuthState.signedIn(
          userId: 'u1',
          provider: LoginProvider.google,
        ),
      );
      final services = AppServices.inMemory(
        settings,
        auth: auth,
        backendConfigured: true,
      );
      addTearDown(services.disposeInMemory);
      await _startAnalytics();

      await tester.pumpWidget(
        AppServicesScope(
          services: services,
          child: MaterialApp(
            navigatorObservers: [AnalyticsObserver()],
            home: MoreScreen(
              settings: settings,
              onOpenStyles: () {},
              onOpenSettings: () {},
            ),
          ),
        ),
      );
      await tester.pump();
      expect(find.text('계정'), findsOneWidget);
      expect(find.text('Google'), findsOneWidget);

      await tester.tap(find.text('계정'));
      await tester.pumpAndSettle();
      expect(find.byType(AccountScreen), findsOneWidget);
      expect(_screens(), contains('account'));

      // 로그아웃 상태 표시.
      auth.emit(const AuthState.signedOut());
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('로그인하지 않음'), findsOneWidget);
      Analytics.debugReset();
    });
  });

  group('통계 화면', () {
    testWidgets('홈에 요약 카드가 있고 누르면 통계 화면이 열린다', (tester) async {
      _size(tester, const Size(400, 900));
      final settings = await _settings();
      final stats = PrayerStatsStore.inMemory([
        PrayerRecord(
          at: DateTime.now(),
          set: MysterySet.joyful,
          decades: 5,
          hailMarys: 50,
          completed: true,
          seconds: 1200,
        ),
      ]);
      final services = AppServices.inMemory(settings, stats: stats);
      addTearDown(services.disposeInMemory);
      await _startAnalytics();

      await tester.pumpWidget(
        AppServicesScope(
          services: services,
          child: MaterialApp(
            navigatorObservers: [AnalyticsObserver()],
            home: HomeScreen(settings: settings),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(StatsSummaryCard), findsOneWidget);
      await tester.tap(find.byType(StatsSummaryCard));
      await tester.pumpAndSettle();
      expect(find.byType(StatsScreen), findsOneWidget);
      expect(find.text('기도 기록'), findsWidgets);

      expect(_screens(), ['home', 'stats']);
      expect(_events('stats_open').map(_props).toList(), [
        {'range': 'month'},
      ]);
      Analytics.debugReset();
    });

    testWidgets('내비게이션 옵저버와 탭 선택이 화면 id를 남긴다', (tester) async {
      _size(tester, const Size(400, 900));
      final settings = await _settings();
      await _startAnalytics();

      await tester.pumpWidget(RosaryApp(settings));
      await tester.pumpAndSettle();
      Future<void> tab(String label) async {
        await tester.tap(
          find.descendant(
            of: find.byType(NavigationBar),
            matching: find.text(label),
          ),
        );
        await tester.pumpAndSettle();
      }

      await tab('더보기');
      await tab('기록');
      await tab('오늘');
      // 요약 카드는 새 화면이 아니라 '기록' 탭으로 보낸다.
      await tester.tap(find.byType(StatsSummaryCard));
      await tester.pumpAndSettle();
      expect(find.byType(StatsScreen), findsOneWidget);
      expect(_screens(), [
        'home', // '/' 라우트
        'more',
        'stats',
        'home',
        'stats',
      ]);
      Analytics.debugReset();
    });
  });

  group('통계 기록', () {
    testWidgets('기도 화면에서 한 단을 마치고 나가면 기록이 정확히 1건 남는다', (tester) async {
      _size(tester, const Size(400, 900));
      final settings = await _settings();
      final stats = PrayerStatsStore.inMemory();
      final services = AppServices.inMemory(settings, stats: stats);
      addTearDown(services.disposeInMemory);
      await _startAnalytics();

      await tester.pumpWidget(
        AppServicesScope(
          services: services,
          child: MaterialApp(
            navigatorObservers: [AnalyticsObserver()],
            home: HomeScreen(
              settings: settings,
              soundPlayer: _SilentSoundPlayer(),
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.tap(find.textContaining('신비 시작'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));

      await _nexts(tester, _nextsForOneDecade(settings.mysterySet));
      expect(stats.records, isEmpty); // 아직 나가지 않았다.

      // 나가기: 뒤로 → '중단'.
      await tester.tap(find.byType(BackButton));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.text('중단'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pump(const Duration(milliseconds: 600));

      expect(stats.records, hasLength(1));
      final r = stats.records.single;
      expect(r.set, settings.mysterySet);
      expect(r.decades, 1);
      expect(r.hailMarys, greaterThanOrEqualTo(10));
      expect(r.completed, isFalse);
      expect(r.source, 'app');

      // 분석: 시작 1, 단 완료 1, 끝 1(기록과 같은 값).
      expect(_events('prayer_start').map(_props).toList(), [
        {
          'set': settings.mysterySet.name,
          'mode': 'solo',
          'resumed': false,
          'source': 'app',
        },
      ]);
      expect(_events('decade_complete').map(_props).toList(), [
        {'set': settings.mysterySet.name, 'decade': 1},
      ]);
      final finish = _events('prayer_finish').map(_props).toList();
      expect(finish, hasLength(1));
      expect(finish.single['decades'], 1);
      expect(finish.single['completed'], isFalse);
      expect(finish.single['set'], settings.mysterySet.name);
      expect(finish.single['seconds'], isA<int>());
      expect(_screens(), ['home', 'prayer', 'home']);
      _expectNoSensitiveProps();
      Analytics.debugReset();
    });

    testWidgets('이어 기도하면 resumed가 true이고 기준선 이후만 센다', (tester) async {
      _size(tester, const Size(400, 900));
      final settings = await _settings();
      final stats = PrayerStatsStore.inMemory();
      final services = AppServices.inMemory(settings, stats: stats);
      addTearDown(services.disposeInMemory);
      await _startAnalytics();

      await tester.pumpWidget(
        _scoped(
          services,
          Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => PrayerScreen(
                      settings: settings,
                      mysterySet: MysterySet.sorrowful,
                      initialIndex: 10,
                      soundPlayer: _SilentSoundPlayer(),
                    ),
                  ),
                ),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('open'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      expect(_props(_events('prayer_start').single)['resumed'], isTrue);
      await tester.tap(find.byType(BackButton));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.text('중단'));
      await tester.pump(const Duration(milliseconds: 600));
      // 진행 없이 나갔으니 기록도 prayer_finish도 없다.
      expect(stats.records, isEmpty);
      expect(_events('prayer_finish'), isEmpty);
      Analytics.debugReset();
    });

    testWidgets('성당 카드와 전체 화면 기도가 같은 세션을 쓰면 기록은 한 번만 쓰인다', (tester) async {
      setView(tester, const Size(400, 900));
      final settings = await loadSettings();
      final stats = PrayerStatsStore.inMemory();
      final services = AppServices.inMemory(settings, stats: stats);
      addTearDown(services.disposeInMemory);
      await _startAnalytics();
      final net = FakeChurchNet();
      final scene = FakeChurchSceneController();
      final today = mysterySetForWeekday(DateTime.now().weekday);

      await tester.pumpWidget(
        AppServicesScope(
          services: services,
          child: wrapApp(
            ChurchScreen(
              settings: settings,
              net: net,
              scene: scene,
              // 실제 전체 화면 기도 화면이 같은 세션을 받는다.
              prayerScreenBuilder: (context, set, session) => PrayerScreen(
                settings: settings,
                mysterySet: set,
                session: session,
                soundPlayer: _SilentSoundPlayer(),
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      scene.emit(const SceneReady());
      await tester.pump();

      scene.emit(const SceneNear(seat: 'L03-2'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 20));
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pump();
      await tester.tap(find.text('앉기'));
      await tester.pump();
      scene.emit(const SceneSeated('L03-2'));
      await tester.pump();

      final total = _nextsForOneDecade(today);
      await _nexts(tester, 3); // 카드에서
      // 전체 화면 기도는 카드의 ⋮ 메뉴 안에 있다.
      await tester.tap(find.byKey(const ValueKey('prayer-menu')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('전체 화면으로 기도'));
      // PrayerScreen에는 끝나지 않는 애니메이션이 있어 pumpAndSettle을 쓸 수 없다.
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      expect(find.byType(PrayerScreen), findsOneWidget);
      await _nexts(tester, total - 3); // 전체 화면에서

      await tester.tap(find.byType(BackButton));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.text('중단'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      expect(find.byType(PrayerScreen), findsNothing);
      // 전체 화면이 닫혀도 기록은 아직 없다(세션의 주인은 성당 카드).
      expect(stats.records, isEmpty);

      // 끝내기는 카드의 ⋮ 메뉴 안에 있다.
      await tester.tap(find.byKey(const ValueKey('prayer-menu')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('끝내기'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(stats.records, hasLength(1));
      final r = stats.records.single;
      expect(r.source, 'church');
      expect(r.decades, 1);
      expect(r.set, today);

      expect(_events('prayer_start').map(_props).toList(), [
        {
          'set': today.name,
          'mode': 'solo',
          'resumed': false,
          'source': 'church',
        },
      ]);
      expect(_events('decade_complete'), hasLength(1));
      expect(_events('prayer_finish'), hasLength(1));
      _expectNoSensitiveProps();

      // 화면을 닫아도 더 쓰이지 않는다.
      await tester.pumpWidget(const SizedBox());
      await tester.pump();
      expect(stats.records, hasLength(1));
      Analytics.debugReset();
    });

    testWidgets('세션을 끝까지 마치면 완주 기록 1건과 완주 이벤트', (tester) async {
      _size(tester, const Size(400, 900));
      final settings = await _settings();
      final stats = PrayerStatsStore.inMemory();
      final services = AppServices.inMemory(settings, stats: stats);
      addTearDown(services.disposeInMemory);
      await _startAnalytics();

      await tester.pumpWidget(
        _scoped(
          services,
          PrayerScreen(
            settings: settings,
            mysterySet: MysterySet.glorious,
            soundPlayer: _SilentSoundPlayer(),
          ),
        ),
      );
      await tester.pump();
      final steps = buildRosarySequence(MysterySet.glorious).length;
      await _nexts(tester, steps);
      await tester.pump();
      expect(find.text('묵주기도를 마쳤습니다'), findsOneWidget);
      await tester.pump(const Duration(milliseconds: 100));

      expect(stats.records, hasLength(1));
      expect(stats.records.single.completed, isTrue);
      expect(stats.records.single.decades, 5);
      expect(_events('decade_complete').length, 5);
      expect(
        _events('decade_complete').map((e) => _props(e)['decade']).toList(),
        [1, 2, 3, 4, 5],
      );
      expect(_props(_events('prayer_finish').single)['completed'], isTrue);

      // 나가도 같은 구간이 다시 쓰이지 않는다.
      await tester.pumpWidget(const SizedBox());
      await tester.pump();
      expect(stats.records, hasLength(1));
      expect(_events('prayer_finish'), hasLength(1));
      Analytics.debugReset();
    });
  });

  group('분석 호출 위치', () {
    testWidgets('설정·홈·묵주 화면의 변경이 허용 목록 이벤트로 남는다', (tester) async {
      _size(tester);
      final settings = await _settings();
      await _startAnalytics();

      await tester.pumpWidget(
        MaterialApp(
          home: SettingsScreen(
            settings: settings,
            leaderAudio: _FakeStore(),
            ttsVoice: _QuietTts(),
            bundledClipCount: (_) async => 0,
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('성모송 10번이 끝나면 종소리'));
      await tester.tap(find.text('구슬마다 짧은 소리'));
      await tester.tap(find.text('넘길 때 진동'));
      await tester.tap(find.text('기기 배경화면 색 사용(Material You)'));
      await tester.tap(find.text('명조'));
      // 선창 음성 스위치(머리글 다음 것)를 껐다 켠다. 켜져 있어야 소스·화자 선택이 보인다.
      await tester.tap(find.text('선창 음성').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('선창 음성').last);
      await tester.pumpAndSettle();

      Finder slider(double max) =>
          find.byWidgetPredicate((w) => w is Slider && w.max == max);
      final scale = slider(AppSettings.maxTextScale);
      final rect = tester.getRect(scale);
      await tester.tapAt(Offset(rect.right - 2, rect.center.dy));
      await tester.pump();
      final volume = slider(AppSettings.maxChimeVolume);
      await tester.tapAt(
        Offset(
          tester.getRect(volume).left + 40,
          tester.getRect(volume).center.dy,
        ),
      );
      await tester.pump();

      // 선창 음성 소스·화자(둘 다 현재 값의 이름).
      await tester.tap(find.text(LeaderVoicePersona.priest.voiceLabel));
      await tester.pump();
      await tester.tap(find.text(LeaderVoiceSource.tts.label));
      await tester.pumpAndSettle();
      final rate = slider(AppSettings.maxTtsRate);
      await tester.tapAt(
        Offset(tester.getRect(rate).right - 2, tester.getRect(rate).center.dy),
      );
      await tester.pump();

      final settingKeys = [
        for (final e in _events('setting_change')) _props(e)['key'],
      ];
      expect(
        settingKeys,
        containsAll([
          'chime_ten',
          'tick_bead',
          'haptic',
          'dynamic_color',
          'prayer_font',
          'leader_audio',
          'chime_volume',
          'tts_rate',
        ]),
      );
      final scales = [
        for (final e in _events('text_scale_change')) _props(e)['scale'],
      ];
      expect(scales, hasLength(1));
      expect(((scales.single as num) * 20) % 1, closeTo(0, 1e-9)); // 0.05 단위
      expect(_events('leader_voice_change').map(_props).toList(), [
        {'source': 'bundled', 'persona': 'priest'},
        {'source': 'tts', 'persona': 'priest'},
      ]);
      // 값은 보내지 않는다(어떤 설정인지만).
      for (final e in _events('setting_change')) {
        expect(_props(e).keys, ['key']);
      }
      _expectNoSensitiveProps();
      Analytics.debugReset();
    });

    testWidgets('기도 모드와 묵주 종류 변경', (tester) async {
      _size(tester);
      final settings = await _settings();
      await _startAnalytics();

      await tester.pumpWidget(
        MaterialApp(home: HomeScreen(settings: settings)),
      );
      await tester.pump();
      await tester.ensureVisible(find.text('선창'));
      await tester.tap(find.text('선창'));
      await tester.pump();
      expect(_events('mode_change').map(_props).toList(), [
        {'mode': 'leader'},
      ]);

      await tester.pumpWidget(
        MaterialApp(home: RosaryStyleScreen(settings: settings)),
      );
      await tester.pump();
      await tester.tap(find.widgetWithText(InkWell, RosaryStyle.fatima.label));
      await tester.pump();
      expect(_events('rosary_style_change').map(_props).toList(), [
        {'style': 'fatima'},
      ]);
      Analytics.debugReset();
    });

    testWidgets('성당: 선택·입장·앉기·촛불·퇴장 이벤트에는 지향이 없다', (tester) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings();
      await _startAnalytics();
      final net = FakeChurchNet();
      final scene = FakeChurchSceneController();

      await tester.pumpWidget(
        wrapApp(
          ChurchTab(
            settings: settings,
            net: net,
            scene: scene,
            availableIds: const {'basic', 'stpeter'},
          ),
        ),
      );
      // 마지막 성당 카드가 먼저 보이면 '다른 성당 고르기'로 목록을 연다.
      final pick = find.byKey(const ValueKey('entry-pick'));
      if (pick.evaluate().isNotEmpty) {
        await tester.tap(pick);
        await tester.pumpAndSettle();
      }
      final scrollable = find
          .descendant(
            of: find.byType(CustomScrollView),
            matching: find.byType(Scrollable),
          )
          .first;
      final card = find.byKey(const ValueKey('church-card-stpeter'));
      await tester.scrollUntilVisible(card, 300, scrollable: scrollable);
      await tester.ensureVisible(card);
      await tester.pump();
      await tester.tap(card);
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, '입장'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      scene.emit(const SceneReady());
      await tester.pump();

      // 촛불(지향 선택) → 앉기.
      scene.emit(const SceneNear(candle: 5));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      await tester.tap(find.text('초 켜기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text(candleIntentions[2]));
      await tester.pump();
      await tester.tap(
        find.descendant(
          of: find.byType(BottomSheet),
          matching: find.widgetWithText(FilledButton, '초 켜기'),
        ),
      );
      await tester.pumpAndSettle();
      expect(net.candles, [(5, 2)]); // 서버에는 가지만 분석에는 없다.

      scene.emit(const SceneNear(seat: 'L03-2'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 20));
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pump();
      await tester.tap(find.text('앉기'));
      await tester.pump();
      scene.emit(const SceneSeated('L03-2'));
      await tester.pump();

      // 성당 바꾸기 = 퇴장.
      await tester.tap(find.byTooltip('성당 바꾸기'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      final names = [
        for (final e in Analytics.instance.queuedForTest)
          if ((e['name'] as String).startsWith('church_')) e['name'],
      ];
      expect(names, [
        'church_pick',
        'church_enter',
        'church_candle',
        'church_sit',
        'church_exit',
      ]);
      expect(_props(_events('church_pick').single), {'church': 'stpeter'});
      expect(_props(_events('church_enter').single), {
        'church': 'stpeter',
        'online': false,
      });
      expect(_props(_events('church_candle').single), {'church': 'stpeter'});
      expect(_props(_events('church_sit').single), {'church': 'stpeter'});
      final exit = _props(_events('church_exit').single);
      expect(exit.keys.toSet(), {'church', 'seconds', 'sat_seconds'});
      expect(exit['seconds'], isA<int>());
      expect(exit['sat_seconds'], isA<int>());
      expect(_screens(), [
        'church_entry',
        'church_select',
        'church',
        'church_select',
      ]);
      _expectNoSensitiveProps();
      // 카탈로그의 모든 성당 id는 분석 값 규칙을 통과한다.
      for (final c in ChurchCatalog.all) {
        expect(RegExp(r'^[A-Za-z0-9_\-]{1,40}$').hasMatch(c.id), isTrue);
      }
      Analytics.debugReset();
    });

    testWidgets('아바타 저장은 속성 없이 avatar_save만 남긴다', (tester) async {
      _size(tester);
      final settings = await _settings();
      await _startAnalytics();
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => TextButton(
              onPressed: () => Navigator.of(context).push<void>(
                MaterialPageRoute<void>(
                  builder: (_) => AvatarEditorScreen(settings: settings),
                ),
              ),
              child: const Text('open'),
            ),
          ),
        ),
      );
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();
      expect(_events('avatar_save').map(_props).toList(), [
        <String, dynamic>{},
      ]);
      Analytics.debugReset();
    });

    test('분석 호출 줄에는 지향(intention) 값이 들어가지 않는다', () {
      final pattern = RegExp('(Track\\.|\\.track\\()');
      final offenders = <String>[];
      for (final f in Directory('lib').listSync(recursive: true)) {
        if (f is! File || !f.path.endsWith('.dart')) continue;
        if (f.path.contains('lib/analytics/')) continue;
        final lines = f.readAsLinesSync();
        for (var i = 0; i < lines.length; i++) {
          if (pattern.hasMatch(lines[i]) &&
              lines[i].toLowerCase().contains('intention')) {
            offenders.add('${f.path}:${i + 1}');
          }
        }
      }
      expect(offenders, isEmpty);
    });

    test('분석은 초기화 전·동의 전에도 던지지 않는다', () async {
      Analytics.debugReset();
      final settings = await _settings();
      expect(Analytics.isInitialized, isFalse);
      // 초기화 전: 모두 no-op.
      expect(() => Analytics.instance.screen('home'), returnsNormally);
      final services = AppServices.inMemory(settings);
      addTearDown(services.disposeInMemory);
      final wiring = AppWiring(services)..start();
      addTearDown(wiring.dispose);
      await wiring.onAccountDeleted();
    });
  });

  group('동의·로그인 연결(AppWiring)', () {
    late AppSettings settings;
    late FakeAuthService auth;
    late AppServices services;
    late FakeEventUploader uploader;
    late AppWiring wiring;

    Future<void> setUpWiring({String? userId}) async {
      settings = await _settings();
      auth = FakeAuthService();
      services = AppServices.inMemory(settings, auth: auth);
      addTearDown(services.disposeInMemory);
      uploader = await _startAnalytics(
        consent: services.consent.has,
        userId: userId,
      );
      wiring = AppWiring(services)..start();
      addTearDown(wiring.dispose);
    }

    Future<void> settle() => Future<void>.delayed(Duration.zero);

    test('다른 계정이 로그인하면 이전 사용자의 로컬 기도 기록을 비운다', () async {
      await setUpWiring();
      await services.stats.add(
        PrayerRecord(
          at: DateTime.now(),
          set: MysterySet.joyful,
          decades: 1,
          hailMarys: 10,
          completed: false,
          seconds: 300,
          source: 'app',
        ),
      );
      // 처음 로그인한 계정은 기존 기록을 이어받는다.
      auth.emitSignedIn(userId: 'u1');
      await settle();
      await settle();
      expect(services.stats.records, hasLength(1));
      // 같은 계정이 다시 로그인해도 유지된다.
      auth.emit(const AuthState.signedOut());
      await settle();
      auth.emitSignedIn(userId: 'u1');
      await settle();
      await settle();
      expect(services.stats.records, hasLength(1));
      // 다른 계정이 로그인하면 이전 사용자의 기록은 지워진다.
      auth.emit(const AuthState.signedOut());
      await settle();
      auth.emitSignedIn(userId: 'u2');
      await settle();
      await settle();
      expect(services.stats.records, isEmpty);
    });

    test('usage 동의를 철회하면 쌓인 usage 이벤트만 버린다', () async {
      await setUpWiring();
      auth.emitSignedIn(userId: 'u1');
      await services.consent.setAll({
        ConsentKind.usage: true,
        ConsentKind.church: true,
      });
      await settle();
      expect(_events('consent_change'), hasLength(2));
      Analytics.instance.track('stats_open', {'range': 'month'});
      Analytics.instance.track('church_pick', {'church': 'basic'});
      expect(_events('stats_open'), hasLength(1));

      await services.consent.revoke(ConsentKind.usage);
      await settle();
      // usage 이벤트는 모두 사라지고(철회 자체도 기록하지 않는다) church는 남는다.
      expect(_events().map((e) => e['category']).toSet(), {'church'});
      expect(_events('church_pick'), hasLength(1));
      // 이후의 usage 이벤트도 버려진다.
      Analytics.instance.track('stats_open', {'range': 'year'});
      expect(_events('stats_open'), isEmpty);
      expect(uploader.events, isEmpty); // 아무것도 올라가지 않았다.
      Analytics.debugReset();
    });

    test('로그인하면 login_success, 로그아웃하면 큐를 비운다', () async {
      await setUpWiring();
      auth.emitSignedIn(userId: 'u1', provider: LoginProvider.kakao);
      await services.consent.setAll({ConsentKind.usage: true});
      await settle();
      expect(_events('login_success'), isEmpty); // 그때는 아직 동의 전
      Analytics.instance.track('stats_open', {'range': 'month'});
      expect(_events('stats_open'), hasLength(1));

      await auth.signOut();
      expect(_events(), isEmpty); // 사용자 변경 → 올라가지 않은 이벤트 폐기
      Analytics.instance.track('stats_open', {'range': 'month'});
      expect(_events(), isEmpty); // 로그아웃 상태에서는 기록하지 않는다

      // 같은 사용자가 다시 로그인: 캐시된 동의로 login_success가 남는다.
      auth.emitSignedIn(userId: 'u1', provider: LoginProvider.google);
      expect(_events('login_success').map(_props).toList(), [
        {'provider': 'google'},
      ]);
      Analytics.debugReset();
    });

    test('저장된 세션 복원(loading → signedIn)은 login_success가 아니다', () async {
      settings = await _settings();
      auth = FakeAuthService(initial: const AuthState.loading());
      services = AppServices.inMemory(settings, auth: auth);
      addTearDown(services.disposeInMemory);
      // 동의가 이미 있는 사용자를 흉내 낸다: 한 번 로그인해 동의를 저장한 뒤 loading으로.
      auth.emitSignedIn(userId: 'u1');
      await services.consent.setAll({ConsentKind.usage: true});
      auth.emit(const AuthState.loading());
      await _startAnalytics(consent: services.consent.has, userId: null);
      wiring = AppWiring(services)..start();
      addTearDown(wiring.dispose);
      auth.emitSignedIn(userId: 'u1', provider: LoginProvider.kakao);
      expect(services.consent.has(ConsentKind.usage), isTrue); // 게이트는 열려 있다
      expect(_events('login_success'), isEmpty);
      Analytics.debugReset();
    });

    test('계정 삭제 뒤 기도 기록·동의 캐시·분석 큐를 비운다', () async {
      await setUpWiring();
      await services.stats.add(
        PrayerRecord(at: DateTime.now(), set: MysterySet.joyful, decades: 1),
      );
      auth.emitSignedIn(userId: 'u1');
      await services.consent.setAll({
        ConsentKind.usage: true,
        ConsentKind.sync: true,
      });
      await settle();
      Analytics.instance.track('stats_open', {'range': 'month'});
      expect(_events(), isNotEmpty);
      expect(services.stats.records, hasLength(1));

      // 서버 삭제 + 로그아웃 뒤 훅이 불린다.
      await auth.deleteAccount();
      await wiring.onAccountDeleted();
      expect(services.stats.records, isEmpty);
      expect(_events(), isEmpty);
      // 같은 id로 다시 가입해도 이전 동의는 남아 있지 않다.
      auth.emitSignedIn(userId: 'u1');
      expect(services.consent.has(ConsentKind.usage), isFalse);
      expect(services.consent.has(ConsentKind.sync), isFalse);
      Analytics.debugReset();
    });

    test('올라가는 행은 FakeEventUploader에서 허용된 키만 갖는다', () async {
      await setUpWiring();
      auth.emitSignedIn(userId: 'u1');
      await services.consent.setAll({
        ConsentKind.usage: true,
        ConsentKind.church: true,
      });
      await settle();
      Track.prayerStart(
        set: MysterySet.joyful,
        mode: settings.prayerMode,
        resumed: false,
        source: 'app',
      );
      Track.church('church_candle', 'basic', {'intention': 3, 'note': 'x'});
      Track.setting('haptic');
      await Analytics.instance.flush();
      expect(Analytics.instance.pendingCount, 0);
      final names = uploader.events.map((e) => e['name']).toList();
      expect(
        names,
        containsAll(['prayer_start', 'church_candle', 'setting_change']),
      );
      final candle = uploader.events.firstWhere(
        (e) => e['name'] == 'church_candle',
      );
      expect(candle['props'], {'church': 'basic'}); // 금지 키는 버려진다
      for (final row in uploader.events) {
        expect(row.containsKey('user_id'), isFalse);
        expect(jsonEncode(row), isNot(contains('intention')));
      }
      Analytics.debugReset();
    });

    test('동의 변경은 필수 항목을 기록하지 않고 선택 항목만 기록한다', () async {
      await setUpWiring();
      auth.emitSignedIn(userId: 'u1');
      await services.consent.grantRequired();
      await settle();
      expect(_events('consent_change'), isEmpty);
      await services.consent.grant(ConsentKind.usage);
      await settle();
      expect(_events('consent_change').map(_props).toList(), [
        {'kind': 'usage', 'granted': true},
      ]);
      Analytics.debugReset();
    });
  });
}
