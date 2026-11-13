import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app_services.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
import 'package:rosary_app/ui/widgets/rosary_map.dart';
import 'package:shared_preferences/shared_preferences.dart';

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

void main() {
  testWidgets('PrayerScreen shows first step and advances on 다음', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final settings = await AppSettings.load();

    await tester.pumpWidget(
      MaterialApp(
        home: PrayerScreen(
          settings: settings,
          mysterySet: MysterySet.joyful,
          soundPlayer: _SilentSoundPlayer(),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('성호경'), findsOneWidget);
    expect(find.text('환희의 신비 · 서두'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('prayer-next')));
    await tester.pump();

    expect(find.text('사도신경'), findsOneWidget);
    expect(find.text('성호경'), findsNothing);
  });
  testWidgets('PrayerScreen keeps the map out of the way on a 360x640 screen', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 2;
    tester.view.physicalSize = const Size(720, 1280);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    SharedPreferences.setMockInitialValues({});
    final settings = await AppSettings.load();

    await tester.pumpWidget(
      MaterialApp(
        home: PrayerScreen(
          settings: settings,
          mysterySet: MysterySet.joyful,
          soundPlayer: _SilentSoundPlayer(),
        ),
      ),
    );
    await tester.pump();

    // 세로 화면에는 지도가 없다(띠만). 지도는 '묵주 전체 보기' 시트에서 연다.
    expect(find.byType(RosaryMap), findsNothing);
    expect(find.byKey(const ValueKey('mapHandle')), findsNothing);
    expect(find.text('서두'), findsOneWidget);

    // 서두, 1단 시작(긴 묵상 문구), 성모송, 영광송까지 넘겨 본다.
    for (var i = 0; i < 12; i++) {
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.takeException(), isNull, reason: 'after $i taps');
    }
    expect(find.text('성모송 5/10'), findsOneWidget);
    expect(find.text('1/5단'), findsOneWidget);
  });

  Future<AppSettings> loadSettings([
    Map<String, Object> extra = const {},
  ]) async {
    SharedPreferences.setMockInitialValues({...extra});
    return AppSettings.load();
  }

  Widget app(AppSettings settings, {int initialIndex = 0, double? textScale}) {
    final screen = PrayerScreen(
      settings: settings,
      mysterySet: MysterySet.joyful,
      initialIndex: initialIndex,
      soundPlayer: _SilentSoundPlayer(),
    );
    return MaterialApp(
      builder: textScale == null
          ? null
          : (context, child) => MediaQuery(
              data: MediaQuery.of(context)
                  .copyWith(textScaler: TextScaler.linear(textScale)),
              child: child!,
            ),
      home: screen,
    );
  }

  void phoneSize(WidgetTester tester) {
    tester.view.devicePixelRatio = 2;
    tester.view.physicalSize = const Size(720, 1280);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  testWidgets('has no overflow at text scale 1.5 on 360x640', (tester) async {
    phoneSize(tester);
    final settings = await loadSettings();
    await tester.pumpWidget(app(settings, textScale: 1.5));
    await tester.pump();
    expect(tester.takeException(), isNull);

    for (var i = 0; i < 12; i++) {
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.takeException(), isNull, reason: 'after $i taps');
    }
    // 큰 글자 설정까지 겹쳐도 넘치지 않는다.
    settings.prayerTextScale = AppSettings.maxTextScale;
    await tester.pump(const Duration(milliseconds: 300));
    expect(tester.takeException(), isNull);
  });

  testWidgets('wide layout shows text and map side by side without a handle', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(900, 700);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final settings = await loadSettings();
    await tester.pumpWidget(app(settings));
    await tester.pump();

    expect(find.byType(RosaryMap), findsOneWidget);
    expect(find.text('서두'), findsOneWidget);
    final map = tester.getRect(find.byType(RosaryMap));
    final text = tester.getRect(
      find.byKey(const ValueKey('prayer-text-scroll')),
    );
    expect(text.right, lessThanOrEqualTo(map.left));
    expect(map.height, greaterThan(300));
    // 지도가 이미 보이므로 띠에는 지도 열기 버튼이 없다.
    expect(find.byKey(const ValueKey('prayer-strip')), findsNothing);

    // 크기 조절 손잡이 띠가 없다(지도 위 끌기는 구슬 넘기기용).
    expect(find.byKey(const ValueKey('mapHandle')), findsNothing);
    expect(find.bySemanticsLabel('묵주 크기 조절'), findsNothing);

    for (var i = 0; i < 12; i++) {
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.takeException(), isNull, reason: 'after $i taps');
    }
    // 끌어올리는 패널이 없으므로 지도 크기는 그대로다.
    expect(
      tester.getRect(find.byType(RosaryMap)).height,
      closeTo(map.height, 0.5),
    );
  });

  testWidgets('initialIndex starts at that step and progress is saved', (
    tester,
  ) async {
    phoneSize(tester);
    final settings = await loadSettings();
    expect(settings.savedPrayer, isNull);
    await tester.pumpWidget(app(settings, initialIndex: 8));
    await tester.pump();
    expect(find.text('환희의 신비 · 1단'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('prayer-next')));
    await tester.pump();
    expect(settings.savedPrayer?.stepIndex, 9);
    expect(settings.savedPrayer?.mysterySet, MysterySet.joyful);

    await tester.tap(find.text('이전'));
    await tester.pump();
    expect(settings.savedPrayer?.stepIndex, 8);
  });

  testWidgets('out-of-range initialIndex falls back to the first step', (
    tester,
  ) async {
    phoneSize(tester);
    final settings = await loadSettings();
    await tester.pumpWidget(app(settings, initialIndex: 9999));
    await tester.pump();
    expect(find.text('성호경'), findsOneWidget);
  });

  testWidgets('haptic feedback follows the setting', (tester) async {
    phoneSize(tester);
    final calls = <String>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'HapticFeedback.vibrate') {
          calls.add(call.arguments as String);
        }
        return null;
      },
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      ),
    );

    final settings = await loadSettings();
    expect(settings.hapticOnAdvance, isTrue);
    await tester.pumpWidget(app(settings));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('prayer-next')));
    await tester.pump();
    await tester.pump();
    // 성호경 -> 사도신경: 큰 구슬은 중간 세기.
    expect(calls, ['HapticFeedbackType.mediumImpact']);

    settings.hapticOnAdvance = false;
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('prayer-next')));
    await tester.pump();
    await tester.pump();
    expect(calls, hasLength(1));
  });

  testWidgets('text size sheet changes the setting', (tester) async {
    phoneSize(tester);
    final settings = await loadSettings();
    await tester.pumpWidget(app(settings));
    await tester.pump();

    await tester.tap(find.byTooltip('글자 크기'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.text('은총이 가득하신 마리아님, 기뻐하소서!'), findsOneWidget);
    expect(find.byType(Slider), findsOneWidget);

    await tester.drag(find.byType(Slider), const Offset(300, 0));
    await tester.pump(const Duration(milliseconds: 500));
    expect(settings.prayerTextScale, greaterThan(AppSettings.defaultTextScale));

    await tester.tap(find.text('기본 크기'));
    await tester.pump(const Duration(milliseconds: 500));
    expect(settings.prayerTextScale, AppSettings.defaultTextScale);
    expect(tester.takeException(), isNull);
  });

  testWidgets('scaling the prayer text enlarges the text', (tester) async {
    phoneSize(tester);
    final settings = await loadSettings();
    await tester.pumpWidget(app(settings));
    await tester.pump();
    double sizeOfText() => tester
        .widget<Text>(find.textContaining('성부와 성자와').first)
        .style!
        .fontSize!;
    final before = sizeOfText();
    settings.prayerTextScale = 1.5;
    await tester.pump();
    expect(sizeOfText(), closeTo(before * 1.5, 0.01));
  });

  testWidgets('a long drag on the map moves exactly one bead', (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(900, 700);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final settings = await loadSettings({'haptic_on_advance': false});
    await tester.pumpWidget(app(settings, initialIndex: 10));
    await tester.pump();
    final mapFinder = find.byType(RosaryMap);
    int shown() => settings.savedPrayer?.stepIndex ?? 10;

    Future<void> drag(double dy, {int moves = 12}) async {
      final g = await tester.startGesture(tester.getCenter(mapFinder));
      for (var i = 0; i < moves; i++) {
        await g.moveBy(Offset(0, dy));
        await tester.pump(const Duration(milliseconds: 16));
      }
      await g.up();
      await tester.pump(const Duration(milliseconds: 400));
    }

    // 아래로 길게(240px) 끌어도 한 칸만 앞으로.
    await drag(20);
    expect(shown(), 11);
    expect(tester.takeException(), isNull);

    // 손을 떼고 다시 끌면 또 한 칸.
    await drag(20);
    expect(shown(), 12);

    // 위로 길게 끌어도 한 칸만 뒤로.
    await drag(-20);
    expect(shown(), 11);
    expect(tester.takeException(), isNull);
  });

  testWidgets('dragging down never finishes the prayer', (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(900, 700);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final settings = await loadSettings();
    final last =
        // 마지막 스텝 직전이 아니라 마지막 스텝에서 시작.
        buildRosarySequence(MysterySet.joyful).length - 1;
    await tester.pumpWidget(app(settings, initialIndex: last));
    await tester.pump();
    final gesture = await tester.startGesture(
      tester.getCenter(find.byType(RosaryMap)),
    );
    for (var i = 0; i < 10; i++) {
      await gesture.moveBy(const Offset(0, 30));
      await tester.pump(const Duration(milliseconds: 16));
    }
    await gesture.up();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('묵주기도를 마쳤습니다'), findsNothing);
  });

  testWidgets('has no overflow at the maximum text scale 2.0 on 360x640', (
    tester,
  ) async {
    expect(AppSettings.maxTextScale, 2.0);
    phoneSize(tester);
    final settings = await loadSettings({'prayer_text_scale': 2.0});
    expect(settings.prayerTextScale, 2.0);
    // 앱 글자 배율 2.0 + 기도문 배율 2.0이 겹쳐도 넘치지 않는다.
    await tester.pumpWidget(app(settings, textScale: 2.0));
    await tester.pump();
    expect(tester.takeException(), isNull);
    for (var i = 0; i < 25; i++) {
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.takeException(), isNull, reason: 'after $i taps');
    }
  });

  testWidgets('text size slider reaches 200%', (tester) async {
    phoneSize(tester);
    final settings = await loadSettings();
    await tester.pumpWidget(app(settings));
    await tester.pump();
    await tester.tap(find.byTooltip('글자 크기'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    await tester.drag(find.byType(Slider), const Offset(600, 0));
    await tester.pump(const Duration(milliseconds: 500));
    expect(settings.prayerTextScale, 2.0);
  });

  testWidgets('haptic strength differs by bead type', (tester) async {
    phoneSize(tester);
    final calls = <String>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'HapticFeedback.vibrate') {
          calls.add(call.arguments as String);
        }
        return null;
      },
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      ),
    );
    final settings = await loadSettings();
    await tester.pumpWidget(app(settings));
    await tester.pump();

    final steps = buildRosarySequence(MysterySet.joyful);
    // 한 단 + 단 끝까지 진행하며 도착한 구슬 종류별 진동을 모은다.
    final byKind = <StepKind, Set<String>>{};
    for (var i = 1; i < 20; i++) {
      calls.clear();
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump();
      await tester.pump();
      expect(calls, hasLength(1), reason: 'step $i');
      byKind.putIfAbsent(steps[i].kind, () => {}).add(calls.single);
    }
    expect(byKind[StepKind.hailMary], {'HapticFeedbackType.lightImpact'});
    expect(byKind[StepKind.ourFather], {'HapticFeedbackType.mediumImpact'});
    expect(byKind[StepKind.apostlesCreed], {'HapticFeedbackType.mediumImpact'});

    // 단 끝은 강하게.
    var guard = 0;
    calls.clear();
    while (guard++ < 200) {
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump();
      await tester.pump();
      if (calls.contains('HapticFeedbackType.heavyImpact')) break;
    }
    expect(calls, contains('HapticFeedbackType.heavyImpact'));
  });

  group('volume keys', () {
    Future<void> press(WidgetTester tester, LogicalKeyboardKey key) async {
      await tester.sendKeyEvent(key);
      await tester.pump();
    }

    testWidgets('are ignored by default', (tester) async {
      phoneSize(tester);
      final settings = await loadSettings();
      expect(settings.volumeKeyAdvance, isFalse);
      await tester.pumpWidget(app(settings));
      await tester.pump();
      await press(tester, LogicalKeyboardKey.audioVolumeDown);
      expect(find.text('성호경'), findsWidgets);
      expect(settings.savedPrayer, isNull);
    });

    testWidgets('advance (down) and go back (up) when enabled', (tester) async {
      phoneSize(tester);
      final settings = await loadSettings({'volume_key_advance': true});
      await tester.pumpWidget(app(settings));
      await tester.pump();
      final steps = buildRosarySequence(MysterySet.joyful);
      expect(find.text(steps[0].title), findsWidgets);

      await press(tester, LogicalKeyboardKey.audioVolumeDown);
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text(steps[1].title), findsWidgets);
      expect(settings.savedPrayer?.stepIndex, 1);

      await press(tester, LogicalKeyboardKey.audioVolumeDown);
      await tester.pump(const Duration(milliseconds: 300));
      expect(settings.savedPrayer?.stepIndex, 2);

      await press(tester, LogicalKeyboardKey.audioVolumeUp);
      await tester.pump(const Duration(milliseconds: 300));
      expect(settings.savedPrayer?.stepIndex, 1);
    });
  });

  group('completion screen', () {
    Future<void> finish(WidgetTester tester) async {
      final total = buildRosarySequence(MysterySet.joyful).length;
      for (var i = 0; i < total; i++) {
        await tester.tap(find.byKey(const ValueKey('prayer-next')));
        await tester.pump(const Duration(milliseconds: 50));
      }
      await tester.pump(const Duration(milliseconds: 400));
    }

    Widget appWithServices(AppServices services, {VoidCallback? onStats}) =>
        AppServicesScope(
          services: services,
          child: MaterialApp(
            home: Builder(
              builder: (context) => Scaffold(
                body: Center(
                  child: TextButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => PrayerScreen(
                          settings: services.settings,
                          mysterySet: MysterySet.joyful,
                          soundPlayer: _SilentSoundPlayer(),
                          onOpenStats: onStats,
                        ),
                      ),
                    ),
                    child: const Text('open'),
                  ),
                ),
              ),
            ),
          ),
        );

    testWidgets('shows 기록됨 · 이번 달 n번째, 기록 보기 and 닫기', (tester) async {
      phoneSize(tester);
      final settings = await loadSettings();
      final now = DateTime.now();
      final stats = PrayerStatsStore.inMemory([
        PrayerRecord(
          at: DateTime(now.year, now.month),
          set: MysterySet.glorious,
          decades: 5,
          hailMarys: 50,
          completed: true,
          seconds: 900,
        ),
      ]);
      final services = AppServices.inMemory(settings, stats: stats);
      addTearDown(services.disposeInMemory);
      var statsOpened = 0;
      await tester.pumpWidget(
        appWithServices(services, onStats: () => statsOpened++),
      );
      await tester.tap(find.text('open'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));

      await finish(tester);
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('묵주기도를 마쳤습니다'), findsOneWidget);
      // 미리 있던 1건 + 방금 완주 = 이번 달 2번째. 점수·순위는 없다.
      expect(find.text('기록됨 · 이번 달 2번째'), findsOneWidget);
      expect(find.textContaining('점'), findsNothing);
      expect(find.textContaining('순위'), findsNothing);
      expect(find.text('기록 보기'), findsOneWidget);
      expect(find.text('닫기'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.tap(find.text('기록 보기'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      expect(find.byType(PrayerScreen), findsNothing);
      expect(statsOpened, 1);
    });

    testWidgets('닫기 pops back', (tester) async {
      phoneSize(tester);
      final settings = await loadSettings();
      final services = AppServices.inMemory(settings);
      addTearDown(services.disposeInMemory);
      await tester.pumpWidget(appWithServices(services));
      await tester.tap(find.text('open'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      await finish(tester);
      expect(find.text('기록됨 · 이번 달 1번째'), findsOneWidget);
      await tester.tap(find.text('닫기'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      expect(find.byType(PrayerScreen), findsNothing);
    });
  });
}
