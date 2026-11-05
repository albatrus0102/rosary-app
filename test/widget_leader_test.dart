import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/leader_audio_store.dart';
import 'package:rosary_app/app/leader_voice.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/speech/amen_detector.dart';
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

class FakeLeaderVoice implements LeaderVoice {
  final spoken = <String>[];
  final speaking = ValueNotifier<bool>(false);

  @override
  ValueListenable<bool> get isSpeaking => speaking;

  @override
  Future<void> init() async {}

  @override
  Future<void> speakStep(RosaryStep step) async => spoken.add(step.title);

  @override
  Future<void> stop() async {}

  @override
  Future<void> dispose() async {}
}

class FakeDetector implements AmenDetector {
  final _phrases = StreamController<String>.broadcast();
  final _amens = StreamController<int>.broadcast();
  final _state = ValueNotifier(DetectorState.listening);

  void say(String phrase) => _phrases.add(phrase);

  @override
  Stream<String> get phraseEvents => _phrases.stream;
  @override
  Stream<int> get amenEvents => _amens.stream;
  @override
  ValueListenable<DetectorState> get state => _state;
  @override
  String? get lastTranscript => null;
  @override
  Future<void> start() async {}
  @override
  Future<void> stop() async {}
  @override
  Future<void> dispose() async {}
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

  testWidgets('responder: speaks each step and mutes phrases while speaking', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({'prayer_mode': 'responder'});
    final settings = await AppSettings.load();
    expect(settings.leaderVoiceSource, LeaderVoiceSource.tts);
    final voice = FakeLeaderVoice();
    final detector = FakeDetector();

    await tester.pumpWidget(
      MaterialApp(
        home: PrayerScreen(
          settings: settings,
          mysterySet: MysterySet.joyful,
          soundPlayer: _SilentSoundPlayer(),
          leaderAudio: FakeLeaderAudioStore(),
          leaderVoice: voice,
          detector: detector,
        ),
      ),
    );
    await tester.pump();
    expect(voice.spoken, ['성호경']);

    await tester.tap(find.text('다음'));
    await tester.pump();
    expect(voice.spoken, ['성호경', '사도신경']);

    // 말하는 동안의 아멘은 무시한다.
    voice.speaking.value = true;
    await tester.pump();
    expect(find.text('선창 재생 중'), findsOneWidget);
    detector.say('아멘');
    await tester.pump(const Duration(milliseconds: 10));
    expect(find.text('사도신경'), findsOneWidget);

    // 끝난 직후 600ms 동안도 무시한다.
    voice.speaking.value = false;
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('선창 재생 중'), findsNothing);
    detector.say('아멘');
    await tester.pump(const Duration(milliseconds: 10));
    expect(find.text('사도신경'), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 700));
    detector.say('아멘');
    await tester.pump(const Duration(milliseconds: 10));
    expect(find.text('주님의 기도'), findsOneWidget);
    expect(voice.spoken, ['성호경', '사도신경', '주님의 기도']);
  });

  testWidgets('solo mode never calls the leader voice', (tester) async {
    SharedPreferences.setMockInitialValues({'voice_enabled': false});
    final settings = await AppSettings.load();
    final voice = FakeLeaderVoice();
    await tester.pumpWidget(
      MaterialApp(
        home: PrayerScreen(
          settings: settings,
          mysterySet: MysterySet.joyful,
          soundPlayer: _SilentSoundPlayer(),
          leaderVoice: voice,
        ),
      ),
    );
    await tester.pump();
    await tester.tap(find.text('다음'));
    await tester.pump();
    expect(voice.spoken, isEmpty);
  });
}
