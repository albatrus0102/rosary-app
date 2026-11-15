import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/domain/rosary_session.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _Silent extends SoundPlayer {
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
  Future<RosarySession> open(
    WidgetTester tester, {
    required bool church,
  }) async {
    tester.view.devicePixelRatio = 2;
    tester.view.physicalSize = const Size(720, 1600);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    SharedPreferences.setMockInitialValues({'leader_audio': false});
    final settings = await AppSettings.load();
    final session = RosarySession(buildRosarySequence(MysterySet.joyful))
      ..jumpTo(5);
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => PrayerScreen(
                    settings: settings,
                    mysterySet: MysterySet.joyful,
                    session: session,
                    soundPlayer: _Silent(),
                    returnToChurch: church,
                  ),
                ),
              ),
              child: const Text('OPEN'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('OPEN'));
    await tester.pumpAndSettle();
    return session;
  }

  const churchBtn = ValueKey('prayer-header-church');

  testWidgets('성당 맥락: 머리줄 성당으로 → 확인 없이 닫히고 진행 유지', (tester) async {
    final session = await open(tester, church: true);
    expect(find.byKey(churchBtn), findsOneWidget);
    expect(find.text('성당으로'), findsOneWidget);
    expect(find.byKey(const ValueKey('prayer-header-back')), findsNothing);
    expect(
      tester.getSize(find.byKey(churchBtn)).height,
      greaterThanOrEqualTo(48),
    );
    await tester.tap(find.byKey(churchBtn));
    await tester.pumpAndSettle();
    expect(find.text('기도를 중단할까요?'), findsNothing);
    expect(find.byType(PrayerScreen), findsNothing);
    expect(find.text('OPEN'), findsOneWidget);
    expect(session.index, 5);
    expect(session.isFinished, isFalse);
  });

  testWidgets('성당 맥락: 시스템 뒤로도 확인 없이 닫힌다', (tester) async {
    final session = await open(tester, church: true);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('기도를 중단할까요?'), findsNothing);
    expect(find.byType(PrayerScreen), findsNothing);
    expect(session.index, 5);
  });

  testWidgets('성당 밖: 기존대로 뒤로 → 중단 확인', (tester) async {
    await open(tester, church: false);
    expect(find.byKey(churchBtn), findsNothing);
    expect(find.byKey(const ValueKey('prayer-header-back')), findsOneWidget);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('기도를 중단할까요?'), findsOneWidget);
    expect(find.byType(PrayerScreen), findsOneWidget);
  });

  testWidgets('성당 맥락: 완료 화면의 버튼은 성당으로 돌아간다', (tester) async {
    final session = await open(tester, church: true);
    session.jumpTo(session.steps.length - 1);
    session.next();
    await tester.pumpAndSettle();
    expect(session.isFinished, isTrue);
    await tester.tap(find.byKey(const ValueKey('finished-close')));
    await tester.pumpAndSettle();
    expect(find.byType(PrayerScreen), findsNothing);
  });
}
