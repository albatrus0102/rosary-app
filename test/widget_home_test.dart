import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/ui/home_screen.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
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

Future<AppSettings> _load([Map<String, Object> values = const {}]) async {
  SharedPreferences.setMockInitialValues(values);
  return AppSettings.load();
}

Future<void> _pumpHome(
  WidgetTester tester,
  AppSettings settings, {
  VoidCallback? onOpenSettings,
  VoidCallback? onOpenStyles,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      home: HomeScreen(
        settings: settings,
        soundPlayer: _SilentSoundPlayer(),
        onOpenSettings: onOpenSettings,
        onOpenStyles: onOpenStyles,
      ),
    ),
  );
  await tester.pump();
}

/// PrayerScreen에는 끝나지 않는 애니메이션이 있어 pumpAndSettle을 쓸 수 없다.
Future<void> _pumpRoute(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 600));
}

void main() {
  test('relativeTimeKo', () {
    final now = DateTime(2026, 3, 10, 15, 0);
    expect(
      relativeTimeKo(now.subtract(const Duration(seconds: 20)), now),
      '방금',
    );
    expect(
      relativeTimeKo(now.subtract(const Duration(minutes: 5)), now),
      '5분 전',
    );
    expect(
      relativeTimeKo(now.subtract(const Duration(hours: 3)), now),
      '3시간 전',
    );
    expect(relativeTimeKo(DateTime(2026, 3, 9, 8), now), '어제');
    expect(relativeTimeKo(DateTime(2026, 3, 9, 23, 30), now), '어제');
    expect(relativeTimeKo(DateTime(2026, 3, 6, 9), now), '4일 전');
  });

  testWidgets('HomeScreen shows start button, mysteries and prayer modes', (
    tester,
  ) async {
    final settings = await _load();
    await _pumpHome(tester, settings);

    expect(find.text('로사리움'), findsWidgets);
    expect(find.textContaining('신비 시작'), findsOneWidget);
    for (final set in MysterySet.values) {
      expect(find.text(set.koreanName), findsOneWidget);
    }
    for (final label in ['혼자', '선창', '후창']) {
      expect(find.text(label), findsOneWidget);
    }
    // 소리·글꼴 설정은 설정 화면으로 옮겨졌다.
    expect(find.byType(Switch), findsNothing);
    expect(find.byType(Slider), findsNothing);
    expect(find.text('이어서 기도하기'), findsNothing);
    expect(find.text('설정 열기'), findsNothing);

    await tester.tap(find.text('빛의 신비'));
    await tester.pump();
    expect(settings.mysterySet, MysterySet.luminous);
  });

  testWidgets('responder mode shows settings hint and opens settings', (
    tester,
  ) async {
    final settings = await _load();
    var opened = 0;
    await _pumpHome(tester, settings, onOpenSettings: () => opened++);

    await tester.ensureVisible(find.text('후창'));
    await tester.pump();
    await tester.tap(find.text('후창'));
    await tester.pumpAndSettle();
    expect(settings.prayerMode.name, 'responder');
    expect(find.text('상대 목소리는 설정 > 상대 목소리에서 바꿀 수 있어요'), findsOneWidget);

    await tester.ensureVisible(find.text('설정 열기'));
    await tester.pump();
    await tester.tap(find.text('설정 열기'));
    expect(opened, 1);
  });

  testWidgets('leader mode says the app answers; voice off says no sound', (
    tester,
  ) async {
    final settings = await _load({'prayer_mode': 'leader'});
    await _pumpHome(tester, settings);
    await tester.ensureVisible(find.text('선창'));
    expect(find.text('앞단을 선창하면 뒷단은 앱이 목소리로 받아 줍니다'), findsOneWidget);
    expect(find.text('상대 목소리는 설정 > 상대 목소리에서 바꿀 수 있어요'), findsOneWidget);

    settings.leaderAudioEnabled = false;
    await tester.pumpAndSettle();
    expect(find.textContaining('소리는 나지 않습니다'), findsOneWidget);
  });

  testWidgets('hero image tap calls onOpenStyles', (tester) async {
    final settings = await _load();
    var opened = 0;
    await _pumpHome(tester, settings, onOpenStyles: () => opened++);
    await tester.ensureVisible(find.text('묵주 바꾸기'));
    await tester.pump();
    await tester.tap(find.text('묵주 바꾸기'));
    expect(opened, 1);
  });

  group('resume card', () {
    testWidgets('hidden without saved progress', (tester) async {
      final settings = await _load();
      await _pumpHome(tester, settings);
      expect(find.text('이어서 기도하기'), findsNothing);
      expect(find.text('이어서 기도'), findsNothing);
    });

    testWidgets('hidden when saved progress is older than 7 days', (
      tester,
    ) async {
      final old = DateTime.now().subtract(const Duration(days: 8));
      final settings = await _load({
        'resume_set': 'sorrowful',
        'resume_index': 10,
        'resume_at': old.millisecondsSinceEpoch,
      });
      expect(settings.savedPrayer, isNotNull);
      await _pumpHome(tester, settings);
      expect(find.text('이어서 기도하기'), findsNothing);
    });

    testWidgets('shown with set, decade, step and relative time', (
      tester,
    ) async {
      final yesterday = DateTime.now().subtract(const Duration(days: 1));
      final settings = await _load({
        'resume_set': 'sorrowful',
        'resume_index': 13, // 1단 성모송 6/10
        'resume_at': yesterday.millisecondsSinceEpoch,
      });
      await _pumpHome(tester, settings);
      expect(find.text('이어서 기도하기'), findsOneWidget);
      expect(find.text('고통의 신비 · 1단 · 성모송 6/10 · 어제'), findsOneWidget);
      expect(find.text('이어서 기도'), findsOneWidget);
      expect(find.text('처음부터'), findsOneWidget);
    });

    testWidgets('이어서 기도 opens PrayerScreen at the saved index', (tester) async {
      final settings = await _load();
      settings.saveProgress(MysterySet.sorrowful, 13);
      await _pumpHome(tester, settings);

      await tester.tap(find.text('이어서 기도'));
      await _pumpRoute(tester);
      final screen = tester.widget<PrayerScreen>(find.byType(PrayerScreen));
      expect(screen.initialIndex, 13);
      expect(screen.mysterySet, MysterySet.sorrowful);
      expect(find.text('성모송 6/10'), findsWidgets);
    });

    testWidgets('처음부터 clears progress and starts from the beginning', (
      tester,
    ) async {
      final settings = await _load();
      settings.saveProgress(MysterySet.glorious, 20);
      await _pumpHome(tester, settings);

      await tester.tap(find.text('처음부터'));
      await _pumpRoute(tester);
      final screen = tester.widget<PrayerScreen>(find.byType(PrayerScreen));
      expect(screen.initialIndex, 0);
      expect(screen.mysterySet, MysterySet.glorious);
      expect(find.text('성호경'), findsWidgets);
    });
  });

  testWidgets('기도 시작 starts the prayer directly', (tester) async {
    final settings = await _load();
    await _pumpHome(tester, settings);

    await tester.tap(find.textContaining('신비 시작'));
    await _pumpRoute(tester);

    expect(find.byType(PrayerScreen), findsOneWidget);
    expect(find.text('성호경'), findsWidgets);
  });

  testWidgets('no overflow at 360x640 with text scale 1.5', (tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final settings = await _load({'prayer_mode': 'responder'});
    settings.saveProgress(MysterySet.sorrowful, 13);

    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: const TextScaler.linear(1.5)),
          child: child!,
        ),
        home: HomeScreen(settings: settings, onOpenSettings: () {}),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);

    await tester.drag(find.byType(CustomScrollView), const Offset(0, -2000));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('설정 열기'), findsOneWidget);
  });

  testWidgets('시작 버튼에 오늘의 신비 이름이 보이고, 바꾸면 오늘로 칩이 나온다 (P-01)', (tester) async {
    final settings = await _load();
    final today = mysterySetForWeekday(DateTime.now().weekday);
    await _pumpHome(tester, settings);

    expect(find.text('오늘의 신비 · ${today.koreanName} 시작'), findsOneWidget);
    expect(find.byKey(const ValueKey('reset-to-today')), findsNothing);

    final other = MysterySet.values.firstWhere((s) => s != today);
    await tester.tap(find.text(other.koreanName));
    await tester.pump();
    expect(settings.mysterySet, other);
    expect(find.text('${other.koreanName} 시작'), findsOneWidget);
    expect(find.text('오늘의 신비 · ${today.koreanName} 시작'), findsNothing);
    expect(find.byKey(const ValueKey('reset-to-today')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('reset-to-today')));
    await tester.pump();
    expect(settings.mysterySet, today);
    expect(find.text('오늘의 신비 · ${today.koreanName} 시작'), findsOneWidget);
    expect(find.byKey(const ValueKey('reset-to-today')), findsNothing);
  });

  testWidgets('시작 버튼이 큰 글씨 2.0에서도 넘치지 않는다', (tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final settings = await _load();
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: const TextScaler.linear(2.0)),
          child: child!,
        ),
        home: HomeScreen(settings: settings, soundPlayer: _SilentSoundPlayer()),
      ),
    );
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(find.textContaining('신비 시작'), findsOneWidget);
  });
}
