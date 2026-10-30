import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/leader_voice.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';

/// 'flutter_tts' 채널 가짜. speak()는 [finishSpeak]를 부를 때까지 끝나지 않는다.
/// stop()은 iOS 플러그인처럼 대기 중인 speak()를 끝내 주지 않는다.
class _FakeTtsChannel {
  static const channel = MethodChannel('flutter_tts');

  final calls = <String>[];
  final spoken = <String>[];
  final _pending = <Completer<Object?>>[];

  void install() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) {
          calls.add(call.method);
          if (call.method == 'speak') {
            spoken.add(call.arguments as String);
            final c = Completer<Object?>();
            _pending.add(c);
            return c.future;
          }
          return Future.value(1);
        });
  }

  void uninstall() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  }

  /// 가장 최근 speak()를 정상 완료시킨다.
  void finishSpeak() {
    final c = _pending.removeLast();
    if (!c.isCompleted) c.complete(1);
  }

  /// 네이티브 쪽에서 'speak.onError'를 보낸다(Android는 이때 speak()를 끝내 주지 않는다).
  Future<void> sendError() async {
    await TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .handlePlatformMessage(
          channel.name,
          const StandardMethodCodec().encodeMethodCall(
            const MethodCall('speak.onError', 'synthesis error'),
          ),
          (_) {},
        );
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late _FakeTtsChannel fake;
  final steps = buildRosarySequence(MysterySet.joyful);
  final signOfCross = steps.first;
  final creed = steps[1];

  setUp(() {
    fake = _FakeTtsChannel()..install();
  });
  tearDown(() => fake.uninstall());

  test(
    'stop() ends speakStep even if the engine never resolves speak',
    () async {
      final voice = TtsLeaderVoice();
      var done = false;
      unawaited(voice.speakStep(signOfCross).then((_) => done = true));
      await pumpEventQueue();
      expect(voice.isSpeaking.value, isTrue);
      expect(fake.spoken, [Prayers.signOfCross.text]);

      await voice.stop();
      await pumpEventQueue();
      expect(voice.isSpeaking.value, isFalse);
      expect(done, isTrue);
      await voice.dispose();
    },
  );

  test(
    'engine error releases isSpeaking without waiting for the timeout',
    () async {
      final voice = TtsLeaderVoice();
      var done = false;
      unawaited(voice.speakStep(creed).then((_) => done = true));
      await pumpEventQueue();
      expect(voice.isSpeaking.value, isTrue);

      await fake.sendError();
      await pumpEventQueue();
      expect(voice.isSpeaking.value, isFalse);
      expect(done, isTrue);
      await voice.dispose();
    },
  );

  test(
    'fast step change: old step ends, only the new step keeps speaking',
    () async {
      final voice = TtsLeaderVoice();
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
      expect(voice.isSpeaking.value, isTrue);
      // 스텝 사이에 false로 떨어진 적이 없다(음소거가 풀리지 않는다).
      expect(changes, [true]);
      expect(fake.spoken.last, isNot(Prayers.signOfCross.text));
      expect(
        fake.calls.lastIndexOf('stop'),
        lessThan(fake.calls.lastIndexOf('speak')),
      );

      fake.finishSpeak();
      await pumpEventQueue();
      expect(secondDone, isTrue);
      expect(voice.isSpeaking.value, isFalse);
      expect(changes, [true, false]);
      await voice.dispose();
    },
  );

  test('mystery step speaks the meditation and then the prayer', () async {
    final voice = TtsLeaderVoice();
    final step = steps.firstWhere((s) => s.heading != null);
    var done = false;
    unawaited(voice.speakStep(step).then((_) => done = true));
    await pumpEventQueue();
    expect(fake.spoken, hasLength(1));
    expect(fake.spoken.single, startsWith(Mysteries.joyful.first.title));
    fake.finishSpeak();
    await pumpEventQueue();
    expect(fake.spoken, hasLength(2));
    expect(voice.isSpeaking.value, isTrue);
    fake.finishSpeak();
    await pumpEventQueue();
    expect(done, isTrue);
    expect(voice.isSpeaking.value, isFalse);
    await voice.dispose();
  });
}
