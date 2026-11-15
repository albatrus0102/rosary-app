import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';

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

  void announce(String text);

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

  @override
  void announce(String text) {
    unawaited(() async {
      try {
        final tts = _tts ??= FlutterTts();
        await tts.setLanguage('ko-KR');
        await tts.stop();
        await tts.speak(text);
      } catch (e) {
        debugPrint('voice title failed: $e');
      }
    }());
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
  void announce(String text) => announced.add(text);

  @override
  Future<void> dispose() async {}
}
