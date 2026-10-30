import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/domain/prayer_data.dart';
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
}
