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

    expect(find.text('묵주기도'), findsWidgets);
    expect(find.text('기도 시작'), findsOneWidget);
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
    expect(find.text('선창 음성은 설정 > 선창 음성에서 바꿀 수 있어요'), findsOneWidget);

    await tester.ensureVisible(find.text('설정 열기'));
    await tester.pump();
    await tester.tap(find.text('설정 열기'));
    expect(opened, 1);
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
      final settings = await _load({
        'voice_enabled': false,
        'onboarding_done': true,
      });
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
      final settings = await _load({
        'voice_enabled': false,
        'onboarding_done': true,
      });
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

  group('onboarding sheet', () {
    testWidgets('appears on first start and dismissing does not start', (
      tester,
    ) async {
      final settings = await _load();
      await _pumpHome(tester, settings);

      await tester.tap(find.text('기도 시작'));
      await tester.pumpAndSettle();
      expect(find.text('"아멘"으로 자동으로 넘겨 드려요'), findsOneWidget);
      expect(find.text('음성으로 넘기기 사용'), findsOneWidget);
      expect(find.text('버튼으로만 사용'), findsOneWidget);

      // 바깥을 눌러 닫는다.
      await tester.tapAt(const Offset(10, 10));
      await tester.pumpAndSettle();
      expect(find.text('"아멘"으로 자동으로 넘겨 드려요'), findsNothing);
      expect(find.byType(PrayerScreen), findsNothing);
      expect(settings.onboardingDone, isFalse);
      expect(settings.voiceEnabled, isTrue);
    });

    testWidgets('버튼으로만 사용 turns voice off and starts the prayer', (
      tester,
    ) async {
      final settings = await _load();
      await _pumpHome(tester, settings);

      await tester.tap(find.text('기도 시작'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('버튼으로만 사용'));
      await _pumpRoute(tester);

      expect(settings.voiceEnabled, isFalse);
      expect(settings.onboardingDone, isTrue);
      expect(find.byType(PrayerScreen), findsOneWidget);
    });

    testWidgets('not shown when voice is off or already done', (tester) async {
      final settings = await _load({'voice_enabled': false});
      await _pumpHome(tester, settings);
      await tester.tap(find.text('기도 시작'));
      await _pumpRoute(tester);
      expect(find.text('음성으로 넘기기 사용'), findsNothing);
      expect(find.byType(PrayerScreen), findsOneWidget);
    });
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
}
