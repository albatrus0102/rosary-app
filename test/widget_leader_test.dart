import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/leader_audio_store.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/ui/home_screen.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 파일 시스템 없이 메모리에서만 동작하는 가짜 저장소.
class FakeLeaderAudioStore extends LeaderAudioStore {
  FakeLeaderAudioStore([Set<String> recorded = const {}])
    : _recorded = {...recorded};

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
  testWidgets('responder mode with no recordings still renders and advances', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'voice_enabled': false,
      'prayer_mode': 'responder',
    });
    final settings = await AppSettings.load();
    expect(settings.leaderAudioEnabled, isTrue);

    await tester.pumpWidget(
      MaterialApp(
        home: PrayerScreen(
          settings: settings,
          mysterySet: MysterySet.joyful,
          soundPlayer: _SilentSoundPlayer(),
          leaderAudio: FakeLeaderAudioStore(),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('성호경'), findsOneWidget);
    expect(find.text('선창 재생 중'), findsNothing);

    await tester.tap(find.text('다음'));
    await tester.pump();
    expect(find.text('사도신경'), findsOneWidget);
    expect(find.text('내 차례: 뒷단'), findsOneWidget);
  });

  testWidgets('leader audio disabled ignores recordings', (tester) async {
    SharedPreferences.setMockInitialValues({
      'voice_enabled': false,
      'prayer_mode': 'responder',
      'leader_audio': false,
    });
    final settings = await AppSettings.load();
    expect(settings.leaderAudioEnabled, isFalse);

    await tester.pumpWidget(
      MaterialApp(
        home: PrayerScreen(
          settings: settings,
          mysterySet: MysterySet.joyful,
          soundPlayer: _SilentSoundPlayer(),
          leaderAudio: FakeLeaderAudioStore({'sign_of_cross'}),
        ),
      ),
    );
    await tester.pump();
    expect(find.text('선창 재생 중'), findsNothing);
  });

  testWidgets('home shows leader audio card only in responder mode', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final settings = await AppSettings.load();
    final store = FakeLeaderAudioStore({'sign_of_cross', 'hail_mary'});

    await tester.pumpWidget(
      MaterialApp(
        home: HomeScreen(settings: settings, leaderAudio: store),
      ),
    );
    await tester.pump();
    expect(find.text('선창 녹음 관리'), findsNothing);

    final responder = find.text('후창(뒷단)');
    await tester.ensureVisible(responder);
    await tester.pump();
    await tester.tap(responder);
    await tester.pump();

    expect(find.text('선창 음성'), findsOneWidget);
    expect(find.text('26개 중 2개 녹음됨'), findsOneWidget);
    expect(find.text('선창 녹음 관리'), findsOneWidget);

    await tester.ensureVisible(find.text('선창 음성'));
    await tester.pump();
    await tester.tap(find.byType(Switch).first);
    await tester.pump();
    expect(settings.leaderAudioEnabled, isFalse);
  });

  testWidgets('선창 녹음 관리 opens the record screen', (tester) async {
    SharedPreferences.setMockInitialValues({'prayer_mode': 'responder'});
    final settings = await AppSettings.load();

    await tester.pumpWidget(
      MaterialApp(
        home: HomeScreen(
          settings: settings,
          leaderAudio: FakeLeaderAudioStore({'fatima'}),
        ),
      ),
    );
    await tester.pump();

    final button = find.text('선창 녹음 관리');
    await tester.ensureVisible(button);
    await tester.pump();
    await tester.tap(button);
    await tester.pumpAndSettle();

    expect(find.text('26개 중 1개 녹음됨'), findsOneWidget);
    expect(find.text('성호경'), findsWidgets);
  });
}
