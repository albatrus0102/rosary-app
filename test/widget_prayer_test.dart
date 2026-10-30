import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/domain/prayer_data.dart';
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
    SharedPreferences.setMockInitialValues({'voice_enabled': false});
    final settings = await AppSettings.load();
    expect(settings.voiceEnabled, isFalse);

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

    SharedPreferences.setMockInitialValues({'voice_enabled': false});
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
    expect(height, closeTo(640 * 0.34, 0.01));
    expect(find.text('서두'), findsOneWidget);

    // 서두, 1단 시작(긴 묵상 문구), 성모송, 영광송까지 넘겨 본다.
    for (var i = 0; i < 12; i++) {
      await tester.tap(find.text('다음'));
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.takeException(), isNull, reason: 'after $i taps');
    }
    expect(find.text('1단 · 5/10'), findsOneWidget);

    // 지도를 탭하면 전체 화면 시트가 열리고 닫을 수 있다.
    await tester.tap(map);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.byTooltip('닫기'), findsOneWidget);
    expect(find.byType(RosaryMap), findsNWidgets(2));
    expect(tester.takeException(), isNull);
    await tester.tap(find.byTooltip('닫기'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.byTooltip('닫기'), findsNothing);
    expect(find.byType(RosaryMap), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
