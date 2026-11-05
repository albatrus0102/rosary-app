import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/bundled_leader_voice.dart';
import 'package:rosary_app/app/leader_voice.dart';
import 'package:rosary_app/domain/leader_cues.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';

/// 소리 없이 재생 기록만 남기는 클립 재생기.
class _FakeClipPlayer implements ClipPlayer {
  _FakeClipPlayer({this.failPlay = false});

  final bool failPlay;
  final _complete = StreamController<void>.broadcast();
  final _duration = StreamController<Duration>.broadcast();
  final played = <String>[];
  int stops = 0;
  bool disposed = false;

  @override
  Stream<void> get onComplete => _complete.stream;

  @override
  Stream<Duration> get onDuration => _duration.stream;

  @override
  Future<void> prepare() async {}

  @override
  Future<void> playAsset(String assetKey) async {
    if (failPlay) throw StateError('cannot play');
    played.add(assetKey);
  }

  @override
  Future<void> stop() async => stops++;

  @override
  Future<void> dispose() async => disposed = true;

  void finish() => _complete.add(null);

  void reportDuration(Duration d) => _duration.add(d);
}

/// 큐별로 [finish]를 부를 때까지 끝나지 않는 가짜 기기 음성.
class _FakeFallback implements LeaderVoice {
  final spoken = <List<String>>[];
  int stops = 0;
  final _pending = <Completer<void>>[];
  final _speaking = ValueNotifier<bool>(false);

  @override
  ValueListenable<bool> get isSpeaking => _speaking;

  @override
  Future<void> init() async {}

  @override
  Future<void> speakStep(RosaryStep step) {
    spoken.add(step.leaderCueIds);
    final c = Completer<void>();
    _pending.add(c);
    return c.future;
  }

  void finish() => _pending.removeLast().complete();

  @override
  Future<void> stop() async {
    stops++;
    for (final c in _pending) {
      if (!c.isCompleted) c.complete();
    }
    _pending.clear();
  }

  @override
  Future<void> dispose() async {}
}

void main() {
  final steps = buildRosarySequence(MysterySet.joyful);
  final signOfCross = steps.first;
  final creed = steps[1];
  // 신비 묵상 + 주님의 기도: 큐가 두 개인 스텝.
  final twoCueStep = steps.firstWhere((s) => s.leaderCueIds.length == 2);

  late List<_FakeClipPlayer> players;
  late _FakeFallback fallback;
  late Set<String> existing;
  late List<String> checked;

  BundledLeaderVoice make({
    LeaderVoicePersona persona = LeaderVoicePersona.sister,
    bool failPlay = false,
  }) {
    return BundledLeaderVoice(
      persona: persona,
      fallback: fallback,
      assetExists: (path) async {
        checked.add(path);
        return existing.contains(path);
      },
      playerFactory: () {
        final p = _FakeClipPlayer(failPlay: failPlay);
        players.add(p);
        return p;
      },
    );
  }

  String sister(String id) => 'assets/leader_voice/sister/$id.mp3';

  setUp(() {
    players = [];
    fallback = _FakeFallback();
    existing = {};
    checked = [];
  });

  test('asset paths use the persona directory', () {
    expect(
      BundledLeaderVoice.assetPath(LeaderVoicePersona.priest, 'hail_mary'),
      'assets/leader_voice/priest/hail_mary.mp3',
    );
    expect(
      BundledLeaderVoice.assetKey(LeaderVoicePersona.sister, 'hail_mary'),
      'leader_voice/sister/hail_mary.mp3',
    );
  });

  test('availableClipCount counts per persona', () async {
    final present = {
      for (final c in allLeaderCues.take(5))
        'assets/leader_voice/priest/${c.id}.mp3',
      sister('hail_mary'),
    };
    Future<bool> exists(String path) async => present.contains(path);
    expect(allLeaderCues, hasLength(26));
    expect(
      await BundledLeaderVoice.availableClipCount(
        LeaderVoicePersona.priest,
        assetExists: exists,
      ),
      5,
    );
    expect(
      await BundledLeaderVoice.availableClipCount(
        LeaderVoicePersona.sister,
        assetExists: exists,
      ),
      1,
    );
    expect(
      await BundledLeaderVoice.availableClipCount(
        LeaderVoicePersona.sister,
        assetExists: (_) async => false,
      ),
      0,
    );
  });

  test('present clip plays from the persona directory and completes', () async {
    existing = {
      'assets/leader_voice/priest/sign_of_cross.mp3',
      sister('sign_of_cross'),
    };
    final voice = make(persona: LeaderVoicePersona.priest);
    var done = false;
    unawaited(voice.speakStep(signOfCross).then((_) => done = true));
    await pumpEventQueue();
    expect(checked, ['assets/leader_voice/priest/sign_of_cross.mp3']);
    expect(players.single.played, ['leader_voice/priest/sign_of_cross.mp3']);
    expect(voice.isSpeaking.value, isTrue);
    expect(done, isFalse);

    players.single.finish();
    await pumpEventQueue();
    expect(done, isTrue);
    expect(voice.isSpeaking.value, isFalse);
    expect(players.single.disposed, isTrue);
    expect(fallback.spoken, isEmpty);
    await voice.dispose();
  });

  test('clips of a step play in order, one after another', () async {
    existing = {for (final id in twoCueStep.leaderCueIds) sister(id)};
    final voice = make();
    var done = false;
    unawaited(voice.speakStep(twoCueStep).then((_) => done = true));
    await pumpEventQueue();
    expect(players, hasLength(1));
    expect(players[0].played, [
      'leader_voice/sister/${twoCueStep.leaderCueIds[0]}.mp3',
    ]);

    players[0].finish();
    await pumpEventQueue();
    expect(players, hasLength(2));
    expect(players[1].played, [
      'leader_voice/sister/${twoCueStep.leaderCueIds[1]}.mp3',
    ]);
    expect(voice.isSpeaking.value, isTrue);
    expect(done, isFalse);

    players[1].finish();
    await pumpEventQueue();
    expect(done, isTrue);
    expect(voice.isSpeaking.value, isFalse);
    expect(fallback.spoken, isEmpty);
    await voice.dispose();
  });

  test(
    'missing clip falls back to the device voice for that cue only',
    () async {
      final ids = twoCueStep.leaderCueIds;
      existing = {sister(ids[1])}; // 신비 큐는 없고 기도 큐만 있다.
      final voice = make();
      var done = false;
      unawaited(voice.speakStep(twoCueStep).then((_) => done = true));
      await pumpEventQueue();
      expect(fallback.spoken, [
        [ids[0]],
      ]);
      expect(players, isEmpty);
      expect(voice.isSpeaking.value, isTrue);

      fallback.finish();
      await pumpEventQueue();
      expect(players.single.played, ['leader_voice/sister/${ids[1]}.mp3']);
      expect(fallback.spoken, hasLength(1));

      players.single.finish();
      await pumpEventQueue();
      expect(done, isTrue);
      expect(voice.isSpeaking.value, isFalse);
      await voice.dispose();
    },
  );

  test('with no clips at all every cue is read by the fallback', () async {
    final voice = make();
    var done = false;
    unawaited(voice.speakStep(twoCueStep).then((_) => done = true));
    await pumpEventQueue();
    fallback.finish();
    await pumpEventQueue();
    fallback.finish();
    await pumpEventQueue();
    expect(fallback.spoken, [
      [twoCueStep.leaderCueIds[0]],
      [twoCueStep.leaderCueIds[1]],
    ]);
    expect(players, isEmpty);
    expect(done, isTrue);
    expect(voice.isSpeaking.value, isFalse);
    await voice.dispose();
  });

  test('a clip that fails to play falls back to the device voice', () async {
    existing = {sister('sign_of_cross')};
    final voice = make(failPlay: true);
    unawaited(voice.speakStep(signOfCross));
    await pumpEventQueue();
    expect(fallback.spoken, [
      ['sign_of_cross'],
    ]);
    expect(players.single.disposed, isTrue);
    fallback.finish();
    await pumpEventQueue();
    expect(voice.isSpeaking.value, isFalse);
    await voice.dispose();
  });

  test('stop() interrupts a playing clip', () async {
    existing = {sister('sign_of_cross')};
    final voice = make();
    var done = false;
    unawaited(voice.speakStep(signOfCross).then((_) => done = true));
    await pumpEventQueue();
    expect(voice.isSpeaking.value, isTrue);

    await voice.stop();
    await pumpEventQueue();
    expect(done, isTrue);
    expect(voice.isSpeaking.value, isFalse);
    expect(players.single.stops, greaterThan(0));
    expect(players.single.disposed, isTrue);
    await voice.dispose();
  });

  test('stop() interrupts the fallback voice too', () async {
    final voice = make();
    var done = false;
    unawaited(voice.speakStep(signOfCross).then((_) => done = true));
    await pumpEventQueue();
    expect(voice.isSpeaking.value, isTrue);

    await voice.stop();
    await pumpEventQueue();
    expect(fallback.stops, 1);
    expect(done, isTrue);
    expect(voice.isSpeaking.value, isFalse);
    await voice.dispose();
  });

  test(
    'fast step change: stale completion does not release the new step',
    () async {
      existing = {sister('sign_of_cross'), sister('apostles_creed')};
      final voice = make();
      final changes = <bool>[];
      voice.isSpeaking.addListener(() => changes.add(voice.isSpeaking.value));

      var firstDone = false;
      unawaited(voice.speakStep(signOfCross).then((_) => firstDone = true));
      await pumpEventQueue();
      var secondDone = false;
      unawaited(voice.speakStep(creed).then((_) => secondDone = true));
      await pumpEventQueue();

      expect(firstDone, isTrue);
      expect(secondDone, isFalse);
      expect(players, hasLength(2));
      expect(players[1].played.single, contains('apostles_creed'));
      expect(voice.isSpeaking.value, isTrue);
      expect(changes, [true]); // 스텝 사이에 false로 떨어지지 않는다.

      // 이전 클립의 '재생 끝' 신호가 뒤늦게 와도 새 스텝은 계속된다.
      players[0].finish();
      await pumpEventQueue();
      expect(secondDone, isFalse);
      expect(voice.isSpeaking.value, isTrue);

      players[1].finish();
      await pumpEventQueue();
      expect(secondDone, isTrue);
      expect(voice.isSpeaking.value, isFalse);
      expect(changes, [true, false]);
      await voice.dispose();
    },
  );

  test('step change while the fallback is speaking stops it', () async {
    existing = {sister('apostles_creed')};
    final voice = make();
    unawaited(voice.speakStep(signOfCross)); // 클립 없음 -> 기기 음성
    await pumpEventQueue();
    expect(fallback.spoken, hasLength(1));

    var secondDone = false;
    unawaited(voice.speakStep(creed).then((_) => secondDone = true));
    await pumpEventQueue();
    expect(fallback.stops, 1);
    expect(players.single.played.single, contains('apostles_creed'));
    expect(voice.isSpeaking.value, isTrue);

    players.single.finish();
    await pumpEventQueue();
    expect(secondDone, isTrue);
    expect(voice.isSpeaking.value, isFalse);
    await voice.dispose();
  });

  testWidgets('known duration arms a watchdog that releases a stuck clip', (
    tester,
  ) async {
    existing = {sister('sign_of_cross')};
    final voice = make();
    var done = false;
    unawaited(voice.speakStep(signOfCross).then((_) => done = true));
    await tester.pump();
    players.single.reportDuration(const Duration(seconds: 2));
    await tester.pump();
    await tester.pump(const Duration(seconds: 4));
    expect(done, isFalse);
    // 길이 + 3초가 지나면 '재생 끝' 신호가 없어도 풀린다.
    await tester.pump(const Duration(seconds: 2));
    expect(done, isTrue);
    expect(voice.isSpeaking.value, isFalse);
    await voice.dispose();
  });

  test('speakStep with no cues is a no-op', () async {
    final voice = make();
    await voice.speakStep(
      const RosaryStep(
        kind: StepKind.closing,
        title: '끝',
        text: '',
        leaderText: '',
        responderText: '',
      ),
    );
    expect(voice.isSpeaking.value, isFalse);
    expect(players, isEmpty);
    await voice.dispose();
  });
}
