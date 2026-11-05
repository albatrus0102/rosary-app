import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/domain/prayer_data.dart';
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

    await tester.tap(find.text('다음'));
    await tester.pump();

    expect(find.text('사도신경'), findsOneWidget);
    expect(find.text('성호경'), findsNothing);
  });
  testWidgets('PrayerScreen shows the whole-rosary map without overflowing '
      'on a 360x640 screen', (tester) async {
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

    final map = find.byType(RosaryMap);
    expect(map, findsOneWidget);
    final height = tester.getSize(map).height;
    expect(height, closeTo(640 * 0.22, 0.01));
    expect(find.text('서두'), findsOneWidget);

    // 서두, 1단 시작(긴 묵상 문구), 성모송, 영광송까지 넘겨 본다.
    for (var i = 0; i < 12; i++) {
      await tester.tap(find.text('다음'));
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.takeException(), isNull, reason: 'after $i taps');
    }
    expect(find.text('1단 · 5/10'), findsOneWidget);

    // 묵주를 위로 끌어올리면 묵주가 커지고, 다시 내리면 원래 크기로 돌아온다.
    final handle = find.byKey(const ValueKey('mapHandle'));
    await tester.fling(handle, const Offset(0, -300), 1000);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    final expanded = tester.getSize(find.byType(RosaryMap)).height;
    expect(expanded, greaterThan(height * 1.5));
    expect(tester.takeException(), isNull);
    expect(find.text('다음'), findsOneWidget);

    await tester.fling(handle, const Offset(0, 300), 1000);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(tester.getSize(find.byType(RosaryMap)).height, closeTo(height, 0.5));
    expect(tester.takeException(), isNull);
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
      await tester.tap(find.text('다음'));
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.takeException(), isNull, reason: 'after $i taps');
    }
    // 큰 글자 설정까지 겹쳐도 넘치지 않는다.
    settings.prayerTextScale = AppSettings.maxTextScale;
    await tester.pump(const Duration(milliseconds: 300));
    expect(tester.takeException(), isNull);
  });

  testWidgets('wide layout shows map and text side by side without a handle', (
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
    expect(find.text('성호경'), findsOneWidget);
    expect(find.text('서두'), findsOneWidget);
    final map = tester.getRect(find.byType(RosaryMap));
    final text = tester.getRect(find.text('성호경'));
    expect(text.right, lessThan(map.left));
    expect(map.height, greaterThan(300));

    // 크기 조절 손잡이 띠가 없다(지도 위 끌기는 구슬 넘기기용).
    expect(find.byKey(const ValueKey('mapHandle')), findsNothing);
    expect(find.bySemanticsLabel('묵주 크기 조절'), findsNothing);

    for (var i = 0; i < 12; i++) {
      await tester.tap(find.text('다음'));
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

    await tester.tap(find.text('다음'));
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
    await tester.tap(find.text('다음'));
    await tester.pump();
    await tester.pump();
    expect(calls, ['HapticFeedbackType.selectionClick']);

    settings.hapticOnAdvance = false;
    await tester.pump();
    await tester.tap(find.text('다음'));
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
}
