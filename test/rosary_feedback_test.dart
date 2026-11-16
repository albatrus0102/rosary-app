import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/domain/rosary_session.dart';
import 'package:rosary_app/rosary3d/rosary_feedback.dart';
import 'package:rosary_app/rosary3d/rosary_model.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeClip implements RosaryClip {
  _FakeClip(this.asset, this.log);
  final String asset;
  final List<String> log;
  @override
  Future<void> load() async => log.add('load $asset');
  @override
  Future<void> play(double volume) async => log.add('play $asset');
  @override
  Future<void> dispose() async => log.add('dispose $asset');
}

Future<AppSettings> _settings(Map<String, Object> v) async {
  SharedPreferences.setMockInitialValues(v);
  return AppSettings.load();
}

Future<void> _settle() async {
  for (var i = 0; i < 5; i++) {
    await Future<void>.delayed(Duration.zero);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('한 칸 앞으로 넘길 때마다 신호는 정확히 하나', () async {
    final s = await _settings({});
    final session = RosarySession(buildRosarySequence(MysterySet.joyful));
    final fb = RecordingRosaryFeedback();
    var before = session.index;
    var advanced = 0;
    while (true) {
      session.next();
      if (session.isFinished) break;
      playRosaryStepCue(fb, session, s, before, session.index);
      advanced++;
      expect(fb.played.length, advanced, reason: '$before→${session.index}');
      before = session.index;
    }
    expect(advanced, greaterThan(60));
    // 10번째 성모송을 넘길 때는 알 소리(bead)가 아니라 완료 종 하나만.
    final i10 = session.steps.indexWhere(
      (t) => t.kind == StepKind.hailMary && t.beadIndex == 10,
    );
    expect(
      rosaryCueFor(session.steps[i10], session.steps[i10 + 1], forward: true),
      RosaryCue.tenComplete,
    );
  });

  test('소리만 설정이면 진동 없이 소리만 낸다', () async {
    final s = await _settings({'rosary3d_feedback': RosaryFeedback.sound.name});
    final session = RosarySession(buildRosarySequence(MysterySet.joyful))
      ..next();
    final fb = RecordingRosaryFeedback();
    playRosaryStepCue(fb, session, s, 0, 1);
    expect(fb.played.single.$2, isFalse, reason: 'vibrate');
    expect(fb.played.single.$3, isTrue, reason: 'sound');
  });

  test('기기 구현: 소리만이면 진동 호출 없음, 재생기는 한 번만 만들고 탭마다 닫지 않는다', () async {
    final log = <String>[];
    final vibes = <RosaryCue>[];
    final fb = DeviceRosaryFeedback(
      clipFactory: (a) => _FakeClip(a, log),
      vibrateImpl: (c, _) async => vibes.add(c),
    );
    for (var i = 0; i < 6; i++) {
      fb.play(
        i.isEven ? RosaryCue.bead : RosaryCue.minor,
        vibrate: false,
        sound: true,
        strength: 1,
        volume: 0.8,
      );
    }
    await _settle();
    expect(vibes, isEmpty);
    expect(log.where((e) => e.startsWith('load')).length, 1);
    expect(log.where((e) => e == 'play sounds/r_bead.wav').length, 6);
    expect(log.any((e) => e.startsWith('dispose')), isFalse);

    fb.play(
      RosaryCue.bead,
      vibrate: true,
      sound: false,
      strength: 1,
      volume: 1,
    );
    await _settle();
    expect(vibes, [RosaryCue.bead]);
    await fb.dispose();
    expect(log.where((e) => e.startsWith('dispose')).length, 1);
  });

  test('preload 는 소리 5개를 한 번씩만 올리고 재생 때 다시 올리지 않는다', () async {
    final log = <String>[];
    final fb = DeviceRosaryFeedback(
      clipFactory: (a) => _FakeClip(a, log),
      vibrateImpl: (_, _) async {},
    );
    await fb.preload();
    fb.play(
      RosaryCue.ourFather,
      vibrate: false,
      sound: true,
      strength: 1,
      volume: 1,
    );
    await _settle();
    expect(log.where((e) => e.startsWith('load')).length, 5);
    await fb.dispose();
  });
}
