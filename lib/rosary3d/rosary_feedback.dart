import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';

import '../app/prayer_music.dart';
import '../app/settings.dart';
import '../domain/rosary_session.dart';
import 'rosary_model.dart';

/// 묵주 화면의 촉각·소리·음성 제목 안내를 내보낸다. 테스트는 [RecordingRosaryFeedback]을 쓴다.
abstract class RosaryFeedbackSink {
  void play(
    RosaryCue cue, {
    required bool vibrate,
    required bool sound,
    required double strength,
    required double volume,
  });

  /// 음성 제목 안내. 말을 마치면 끝나는 Future(앞단 음성을 그 뒤에 잇기 위해).
  Future<void> announce(String text);

  Future<void> dispose();
}

/// 실제 기기: 안드로이드는 플랫폼 채널 `rosarium/vibrate`(VibrationEffect 파형·세기)로 차등 진동,
/// 채널이 없으면(iOS·데스크톱) Flutter 기본 HapticFeedback 으로 대신한다. 효과음은 코드로 합성한 WAV(assets/sounds/r_*).
class DeviceRosaryFeedback implements RosaryFeedbackSink {
  static const MethodChannel _vibe = MethodChannel('rosarium/vibrate');
  AudioPlayer? _tick;
  AudioPlayer? _bell;
  FlutterTts? _tts;
  bool _channelMissing = false;

  AudioPlayer _player(bool tick) {
    final p = tick ? _tick : _bell;
    if (p != null) return p;
    final n = AudioPlayer()..setPlayerMode(PlayerMode.lowLatency);
    if (tick) {
      _tick = n;
    } else {
      _bell = n;
    }
    return n;
  }

  @override
  void play(
    RosaryCue cue, {
    required bool vibrate,
    required bool sound,
    required double strength,
    required double volume,
  }) {
    if (vibrate) unawaited(_vibrate(cue, strength));
    if (sound) unawaited(_sound(cue, volume));
  }

  Future<void> _vibrate(RosaryCue cue, double strength) async {
    if (!_channelMissing) {
      try {
        await _vibe.invokeMethod<void>('pattern', {
          'timings': rosaryVibePattern(cue),
          'amplitude': (strength * 255).round().clamp(1, 255),
        });
        return;
      } on MissingPluginException {
        _channelMissing = true;
      } catch (e) {
        debugPrint('vibrate failed: $e');
        return;
      }
    }
    try {
      switch (cue) {
        case RosaryCue.minor:
          await HapticFeedback.selectionClick();
        case RosaryCue.bead:
          await HapticFeedback.lightImpact();
        case RosaryCue.ourFather || RosaryCue.gloryBe:
          await HapticFeedback.mediumImpact();
        case RosaryCue.tenComplete:
          await HapticFeedback.mediumImpact();
          await Future<void>.delayed(const Duration(milliseconds: 120));
          await HapticFeedback.mediumImpact();
        case RosaryCue.mystery:
          await HapticFeedback.heavyImpact();
        case RosaryCue.rosaryComplete:
          for (var i = 0; i < 3; i++) {
            await HapticFeedback.heavyImpact();
            await Future<void>.delayed(const Duration(milliseconds: 380));
          }
      }
    } catch (e) {
      debugPrint('haptic failed: $e');
    }
  }

  Future<void> _sound(RosaryCue cue, double volume) async {
    final asset = switch (cue) {
      RosaryCue.bead || RosaryCue.minor => 'sounds/r_bead.wav',
      RosaryCue.ourFather || RosaryCue.gloryBe => 'sounds/r_low.wav',
      RosaryCue.tenComplete => 'sounds/r_bells2.wav',
      RosaryCue.mystery => 'sounds/r_bell_soft.wav',
      RosaryCue.rosaryComplete => 'sounds/r_bell_end.wav',
    };
    final tick = cue == RosaryCue.bead || cue == RosaryCue.minor;
    try {
      final p = _player(tick);
      await p.stop();
      await p.setVolume(cue == RosaryCue.minor ? volume * 0.5 : volume);
      await p.play(AssetSource(asset));
    } catch (e) {
      debugPrint('rosary sound failed: $e');
    }
  }

  bool _ttsReady = false;

  @override
  Future<void> announce(String text) async {
    try {
      final tts = _tts ??= FlutterTts();
      if (!_ttsReady) {
        _ttsReady = true;
        await tts.setLanguage('ko-KR');
        await tts.setSpeechRate(0.5);
        // speak() 가 말을 마칠 때 끝나게 한다(앞단 음성과 겹치지 않게 잇는다).
        await tts.awaitSpeakCompletion(true);
      }
      await tts.stop();
      await tts
          .speak(text)
          .timeout(const Duration(seconds: 8), onTimeout: () => null);
    } catch (e) {
      debugPrint('voice title failed: $e');
    }
  }

  @override
  Future<void> dispose() async {
    await _tick?.dispose();
    await _bell?.dispose();
    await _tts?.stop();
  }
}

/// 테스트용: 낸 신호를 기록만 한다.
class RecordingRosaryFeedback implements RosaryFeedbackSink {
  final List<(RosaryCue, bool vibrate, bool sound)> played = [];
  final List<String> announced = [];

  @override
  void play(
    RosaryCue cue, {
    required bool vibrate,
    required bool sound,
    required double strength,
    required double volume,
  }) => played.add((cue, vibrate, sound));

  @override
  Future<void> announce(String text) async => announced.add(text);

  @override
  Future<void> dispose() async {}
}

/// 한 칸 이동의 신호를 설정(알림 방식·세기·완료 알림만·음성 제목)대로 낸다. 기도 화면과 성당 묵주 패널이 같이 쓴다.
/// [before]→[now] 가 한 칸이 아니면(지도·이어하기 점프) 아무것도 내지 않는다. [voiceBusy]면 음성 제목은 건너뛴다.
void playRosaryStepCue(
  RosaryFeedbackSink sink,
  RosarySession session,
  AppSettings s,
  int before,
  int now, {
  bool voiceBusy = false,
}) {
  if ((now - before).abs() != 1 || session.isFinished) return;
  final cue = rosaryCueFor(
    session.steps[before],
    session.steps[now],
    forward: now > before,
  );
  if (s.rosaryDecadeOnly && !rosaryCueIsMilestone(cue)) return;
  sink.play(
    cue,
    vibrate:
        s.rosaryFeedback == RosaryFeedback.both ||
        s.rosaryFeedback == RosaryFeedback.vibrate,
    sound:
        s.rosaryFeedback == RosaryFeedback.both ||
        s.rosaryFeedback == RosaryFeedback.sound,
    strength: s.rosaryVibeStrength,
    volume: s.chimeVolume,
  );
  if (s.rosaryVoiceTitle && !voiceBusy) {
    unawaited(
      PrayerMusic.of(
        s,
      ).duckWhile(sink.announce(rosaryVoiceTitle(session.current))),
    );
  }
}
