import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/leader_audio_store.dart';
import 'package:rosary_app/app/leader_voice.dart';
import 'package:rosary_app/app/licenses.dart';
import 'package:rosary_app/app/rosary_style.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/ui/rosary_style_screen.dart';
import 'package:rosary_app/ui/settings_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeStore extends LeaderAudioStore {
  _FakeStore([Set<String> recorded = const {}]) : _recorded = {...recorded};

  final Set<String> _recorded;

  @override
  Future<void> init() async {}

  @override
  bool has(String cueId) => _recorded.contains(cueId);

  @override
  String pathFor(String cueId) => '/nonexistent/$cueId.m4a';

  @override
  int get recordedCount => _recorded.length;
}

/// 항상 '한국어 음성 없음'이라고 답하는 TTS.
class _NoKoreanTts extends TtsLeaderVoice {
  @override
  Future<bool> koreanAvailable() async => false;

  @override
  Future<void> preview() async {}

  @override
  Future<void> stop() async {}

  @override
  Future<void> dispose() async {}
}

class _FakeBundledVoice implements LeaderVoice {
  _FakeBundledVoice(this.persona, this.spoken);

  final LeaderVoicePersona persona;
  final List<String> spoken;
  final _speaking = ValueNotifier<bool>(false);

  @override
  ValueListenable<bool> get isSpeaking => _speaking;

  @override
  Future<void> init() async {}

  @override
  Future<void> speakStep(RosaryStep step) async =>
      spoken.add('${persona.name}:${step.leaderCueIds.join(',')}');

  @override
  Future<void> speakResponder(RosaryStep step) async =>
      spoken.add('${persona.name}:resp:${step.responderCueId}');

  @override
  Future<void> stop() async {}

  @override
  Future<void> dispose() async {}
}

Widget _app(Widget home, {double textScale = 1.0}) => MaterialApp(
  theme: AppTheme.light(),
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(context)
        .copyWith(textScaler: TextScaler.linear(textScale)),
    child: child!,
  ),
  home: home,
);

void main() {
  testWidgets('registerFontLicenses adds the Pretendard license only', (
    tester,
  ) async {
    registerFontLicenses();
    final packages = <String>{};
    await for (final entry in LicenseRegistry.licenses) {
      packages.addAll(entry.packages);
    }
    expect(packages, contains('Pretendard'));
    expect(packages, isNot(contains('Noto Serif KR')));
  });

  testWidgets('settings: section headers and basic switches', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final settings = await AppSettings.load();
    tester.view.physicalSize = const Size(800, 3200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(SettingsScreen(settings: settings, leaderAudio: _FakeStore())),
    );
    await tester.pump();

    for (final title in ['소리 · 진동', '기도 화면', '상대 목소리', '정보']) {
      expect(find.text(title), findsWidgets, reason: title);
    }
    expect(find.text('설정'), findsWidgets);
    expect(find.text('오픈소스 라이선스'), findsOneWidget);
    expect(find.textContaining('가톨릭 기도서'), findsOneWidget);

    expect(settings.hapticOnAdvance, isTrue);
    await tester.tap(find.text('넘길 때 진동'));
    await tester.pump();
    expect(settings.hapticOnAdvance, isFalse);

    // P-02: 볼륨 키로 넘기기는 기본 꺼짐.
    expect(settings.volumeKeyAdvance, isFalse);
    await tester.tap(find.text('볼륨 키로 넘기기'));
    await tester.pump();
    expect(settings.volumeKeyAdvance, isTrue);

    expect(find.text('음성 인식'), findsNothing);
    expect(find.text('마이크 테스트'), findsNothing);
  });

  testWidgets('settings: text size slider updates settings and preview', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final settings = await AppSettings.load();
    tester.view.physicalSize = const Size(800, 3200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(SettingsScreen(settings: settings, leaderAudio: _FakeStore())),
    );
    await tester.pump();

    final slider = find.byWidgetPredicate(
      (w) => w is Slider && w.max == AppSettings.maxTextScale,
    );
    expect(slider, findsOneWidget);
    // 슬라이더 오른쪽 끝을 눌러 최대로.
    final rect = tester.getRect(slider);
    await tester.tapAt(Offset(rect.right - 2, rect.center.dy));
    await tester.pump();
    expect(settings.prayerTextScale, closeTo(AppSettings.maxTextScale, 0.06));
    expect(settings.prayerTextScale, greaterThan(1.4));

    await tester.pump(const Duration(milliseconds: 300));
    final style = DefaultTextStyle.of(
      tester.element(find.byKey(const ValueKey('text_scale_preview'))),
    ).style;
    expect(style.fontSize, greaterThan(24 * 1.4));

    // 기본으로 되돌리기.
    await tester.tap(find.text('기본'));
    await tester.pump();
    expect(settings.prayerTextScale, AppSettings.defaultTextScale);
  });

  testWidgets(
    'settings: font defaults to gothic; system choice drops fontFamily',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      final settings = await AppSettings.load();
      expect(settings.prayerFont, PrayerFont.gothic);
      tester.view.physicalSize = const Size(800, 3200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(
        _app(SettingsScreen(settings: settings, leaderAudio: _FakeStore())),
      );
      await tester.pump();
      expect(find.text('글꼴'), findsOneWidget);
      expect(find.text('고딕'), findsOneWidget);
      expect(find.text('시스템 글꼴'), findsOneWidget);
      expect(find.text('명조'), findsNothing);

      // 미리보기 글꼴은 AnimatedDefaultTextStyle이 내려주는 기본 스타일에 있다.
      String? previewFamily() => DefaultTextStyle.of(
        tester.element(find.byKey(const ValueKey('text_scale_preview'))),
      ).style.fontFamily;
      expect(previewFamily(), AppTheme.sansFamily);

      await tester.tap(find.text('시스템 글꼴'));
      await tester.pumpAndSettle();
      expect(settings.prayerFont, PrayerFont.system);
      expect(previewFamily(), isNull);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('prayer_font'), 'system');

      await tester.tap(find.text('고딕'));
      await tester.pumpAndSettle();
      expect(settings.prayerFont, PrayerFont.gothic);
      expect(previewFamily(), AppTheme.sansFamily);
    },
  );

  test(
    'settings: stale or unknown prayer_font values load as gothic',
    () async {
      for (final stale in const ['serif', 'sans', 'nonsense', '']) {
        SharedPreferences.setMockInitialValues({
          'prayer_font': stale,
          'prayer_text_scale': 1.4,
        });
        final settings = await AppSettings.load();
        expect(settings.prayerFont, PrayerFont.gothic, reason: stale);
        expect(settings.prayerTextScale, closeTo(1.4, 1e-9));
      }
      SharedPreferences.setMockInitialValues({'prayer_font': 'system'});
      expect((await AppSettings.load()).prayerFont, PrayerFont.system);
    },
  );

  testWidgets('settings: leader voice card (device TTS then recorded)', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({'leader_voice_source': 'tts'});
    final settings = await AppSettings.load();
    expect(settings.leaderVoiceSource, LeaderVoiceSource.tts);
    tester.view.physicalSize = const Size(800, 3200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(
        SettingsScreen(
          settings: settings,
          leaderAudio: _FakeStore({'sign_of_cross', 'hail_mary'}),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('AI 음성(고품질)'), findsOneWidget);
    expect(find.text('기기 음성'), findsOneWidget);
    expect(find.text('직접 녹음'), findsOneWidget);
    expect(find.text('말하기 속도'), findsOneWidget);
    expect(
      find.byWidgetPredicate((w) => w is Slider && w.max == 0.7),
      findsOneWidget,
    );
    expect(find.text('미리 듣기'), findsOneWidget);
    expect(find.text('선창 녹음 관리'), findsNothing);
    // 플러그인이 없는 테스트 환경에서는 경고를 띄우지 않는다.
    expect(find.textContaining('한국어 음성이 설치되어'), findsNothing);

    // 플러그인 없이 미리 듣기를 눌러도 죽지 않는다.
    await tester.tap(find.text('미리 듣기'));
    await tester.pump();

    await tester.tap(find.text('직접 녹음'));
    await tester.pumpAndSettle();
    expect(settings.leaderVoiceSource, LeaderVoiceSource.recorded);
    expect(
      find.byWidgetPredicate((w) => w is Slider && w.max == 0.7),
      findsNothing,
    );
    expect(find.text('26개 중 2개 녹음됨'), findsOneWidget);
    expect(find.text('선창 녹음 관리'), findsOneWidget);

    await tester.tap(find.text('선창 녹음 관리'));
    await tester.pumpAndSettle();
    expect(find.text('성호경'), findsWidgets);
  });

  test('settings: defaults to bundled voice with the sister persona', () async {
    SharedPreferences.setMockInitialValues({});
    final settings = await AppSettings.load();
    expect(settings.leaderVoiceSource, LeaderVoiceSource.bundled);
    expect(settings.leaderPersona, LeaderVoicePersona.sister);
  });

  test(
    'settings: stored source and persona names load; unknown -> default',
    () async {
      SharedPreferences.setMockInitialValues({
        'leader_voice_source': 'recorded',
        'leader_persona': 'priest',
      });
      var settings = await AppSettings.load();
      expect(settings.leaderVoiceSource, LeaderVoiceSource.recorded);
      expect(settings.leaderPersona, LeaderVoicePersona.priest);

      SharedPreferences.setMockInitialValues({'leader_voice_source': 'tts'});
      settings = await AppSettings.load();
      expect(settings.leaderVoiceSource, LeaderVoiceSource.tts);

      SharedPreferences.setMockInitialValues({
        'leader_voice_source': 'nonsense',
        'leader_persona': 'nonsense',
      });
      settings = await AppSettings.load();
      expect(settings.leaderVoiceSource, LeaderVoiceSource.bundled);
      expect(settings.leaderPersona, LeaderVoicePersona.sister);
    },
  );

  test('settings: persona persists across loads', () async {
    SharedPreferences.setMockInitialValues({});
    var settings = await AppSettings.load();
    settings.leaderPersona = LeaderVoicePersona.priest;
    settings = await AppSettings.load();
    expect(settings.leaderPersona, LeaderVoicePersona.priest);
  });

  testWidgets('settings: bundled voice with 0 clips (default source)', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final settings = await AppSettings.load();
    tester.view.physicalSize = const Size(800, 3200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final spoken = <String>[];

    await tester.pumpWidget(
      _app(
        SettingsScreen(
          settings: settings,
          leaderAudio: _FakeStore(),
          ttsVoice: _NoKoreanTts(),
          bundledClipCount: (_) async => 0,
          bundledVoiceFactory: (persona, _) =>
              _FakeBundledVoice(persona, spoken),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 선택 단추 3개, 순서대로.
    final labels = ['AI 음성(고품질)', '기기 음성', '직접 녹음'];
    for (final l in labels) {
      expect(find.text(l), findsOneWidget, reason: l);
    }
    final xs = [for (final l in labels) tester.getTopLeft(find.text(l)).dx];
    expect(xs, orderedEquals([...xs]..sort()));
    expect(find.byType(SegmentedButton<LeaderVoiceSource>), findsOneWidget);

    // 화자 선택 단추와 안내 문구.
    expect(find.text('여성 목소리(AI)'), findsOneWidget);
    expect(find.text('남성 목소리(AI)'), findsOneWidget);
    expect(find.text(aiVoiceDisclosure), findsNWidgets(2)); // 설명 + 정보
    expect(find.text(aiVoiceNotice), findsOneWidget); // D-01 한 줄 고지
    expect(find.text('자연스러운 음성 파일 0개 / 26개'), findsOneWidget);
    expect(find.text('아직 음성 파일이 없어 기기 음성으로 읽어 드려요'), findsOneWidget);
    expect(find.text('26개 미만이면', skipOffstage: false), findsNothing);
    // 말하기 속도는 기기 음성에서만.
    expect(find.text('말하기 속도'), findsNothing);
    // 클립이 없어 기기 음성으로 읽는데 한국어 음성이 없다면 경고.
    expect(find.textContaining('한국어 음성이 설치되어'), findsOneWidget);

    await tester.tap(find.text('미리 듣기'));
    await tester.pump();
    expect(spoken, ['sister:hail_mary']);

    await tester.tap(find.text('남성 목소리(AI)'));
    await tester.pumpAndSettle();
    expect(settings.leaderPersona, LeaderVoicePersona.priest);
    await tester.tap(find.text('미리 듣기'));
    await tester.pump();
    expect(spoken, ['sister:hail_mary', 'priest:hail_mary']);
  });

  testWidgets('settings: bundled voice with some clips shows count and note', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final settings = await AppSettings.load();
    tester.view.physicalSize = const Size(800, 3200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(
        SettingsScreen(
          settings: settings,
          leaderAudio: _FakeStore(),
          bundledClipCount: (p) async =>
              p == LeaderVoicePersona.sister ? 10 : 26,
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('자연스러운 음성 파일 10개 / 26개'), findsOneWidget);
    expect(find.text('아직 음성 파일이 없어 기기 음성으로 읽어 드려요'), findsNothing);
    expect(find.text('26개 미만이면 부족한 부분은 기기 음성으로 읽어요'), findsOneWidget);

    // 남성 목소리는 26개가 다 있다: 개수만 보이고 안내는 사라진다.
    await tester.tap(find.text('남성 목소리(AI)'));
    await tester.pumpAndSettle();
    expect(find.text('자연스러운 음성 파일 26개 / 26개'), findsOneWidget);
    expect(find.text('26개 미만이면 부족한 부분은 기기 음성으로 읽어요'), findsNothing);

    // 기기 음성으로 바꾸면 말하기 속도가 보인다.
    await tester.tap(find.text('기기 음성'));
    await tester.pumpAndSettle();
    expect(settings.leaderVoiceSource, LeaderVoiceSource.tts);
    expect(find.text('말하기 속도'), findsOneWidget);
    expect(find.text('여성 목소리(AI)'), findsNothing);
  });

  testWidgets('settings: leader voice switch hides controls', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final settings = await AppSettings.load();
    tester.view.physicalSize = const Size(800, 3200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(SettingsScreen(settings: settings, leaderAudio: _FakeStore())),
    );
    await tester.pump();
    await tester.tap(
      find.text('후창 모드에서는 앞단을, 선창 모드에서는 뒷단을 앱이 들려줍니다. 끄면 소리가 나지 않습니다'),
    );
    await tester.pumpAndSettle();
    expect(settings.leaderAudioEnabled, isFalse);
    expect(find.text('기기 음성'), findsNothing);
  });

  testWidgets('settings: warns when Korean TTS voice is missing', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({'leader_voice_source': 'tts'});
    final settings = await AppSettings.load();
    tester.view.physicalSize = const Size(800, 3200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(
        SettingsScreen(
          settings: settings,
          leaderAudio: _FakeStore(),
          ttsVoice: _NoKoreanTts(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('한국어 음성이 설치되어'), findsOneWidget);
  });

  testWidgets('settings: no overflow at 360x640 with 1.5x system text', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({'leader_voice_source': 'tts'});
    final settings = await AppSettings.load();
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(
        SettingsScreen(settings: settings, leaderAudio: _FakeStore()),
        textScale: 1.5,
      ),
    );
    await tester.pump();
    // 끝까지 스크롤하며 오버플로 예외가 없는지 확인한다.
    for (var i = 0; i < 12; i++) {
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -400));
      await tester.pump();
    }
    expect(tester.takeException(), isNull);

    settings.leaderVoiceSource = LeaderVoiceSource.recorded;
    await tester.pumpAndSettle();
    for (var i = 0; i < 12; i++) {
      await tester.drag(find.byType(CustomScrollView), const Offset(0, 400));
      await tester.pump();
    }
    expect(tester.takeException(), isNull);

    settings.leaderVoiceSource = LeaderVoiceSource.bundled;
    await tester.pumpAndSettle();
    for (var i = 0; i < 12; i++) {
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -400));
      await tester.pump();
    }
    expect(tester.takeException(), isNull);
  });

  testWidgets('style screen: tapping a cell changes rosaryStyle', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final settings = await AppSettings.load();
    tester.view.physicalSize = const Size(400, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_app(RosaryStyleScreen(settings: settings)));
    await tester.pump();

    expect(find.text('묵주 고르기'), findsWidgets);
    expect(find.text(RosaryStyle.bead.description), findsOneWidget);
    for (final style in RosaryStyle.values) {
      expect(find.widgetWithText(InkWell, style.label), findsOneWidget);
    }

    await tester.tap(find.widgetWithText(InkWell, RosaryStyle.fatima.label));
    await tester.pumpAndSettle();
    expect(settings.rosaryStyle, RosaryStyle.fatima);
    expect(find.text(RosaryStyle.fatima.description), findsOneWidget);
    expect(find.text(RosaryStyle.bead.description), findsNothing);
    // 선택된 칸에만 체크 배지.
    expect(find.byIcon(Icons.check), findsOneWidget);
  });

  for (final width in [360.0, 700.0, 1000.0]) {
    testWidgets('style screen: no overflow at ${width.round()}dp, 1.5x text', (
      tester,
    ) async {
      SharedPreferences.setMockInitialValues({});
      final settings = await AppSettings.load();
      tester.view.physicalSize = Size(width, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(
        _app(RosaryStyleScreen(settings: settings), textScale: 1.5),
      );
      await tester.pump();
      for (var i = 0; i < 6; i++) {
        await tester.drag(find.byType(CustomScrollView), const Offset(0, -500));
        await tester.pump();
      }
      expect(tester.takeException(), isNull);
    });
  }
}
