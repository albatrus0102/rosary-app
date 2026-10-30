import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

/// 종소리/틱 소리 재생. 마이크 녹음과 동시에 재생되도록 오디오 컨텍스트를 설정한다.
class SoundPlayer {
  AudioPlayer? _chime;
  AudioPlayer? _tick;
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;
    try {
      await AudioPlayer.global.setAudioContext(
        AudioContext(
          iOS: AudioContextIOS(
            category: AVAudioSessionCategory.playAndRecord,
            options: const {
              AVAudioSessionOptions.defaultToSpeaker,
              AVAudioSessionOptions.allowBluetooth,
            },
          ),
          android: const AudioContextAndroid(
            usageType: AndroidUsageType.media,
            contentType: AndroidContentType.sonification,
            // 포커스를 요청하지 않아 마이크 녹음을 끊거나 낮추지 않는다.
            audioFocus: AndroidAudioFocus.none,
          ),
        ),
      );
      _chime = AudioPlayer()..setPlayerMode(PlayerMode.lowLatency);
      _tick = AudioPlayer()..setPlayerMode(PlayerMode.lowLatency);
    } catch (e) {
      debugPrint('SoundPlayer.init failed: $e');
    }
  }

  Future<void> playDecadeChime() => _play(_chime, 'sounds/decade_chime.wav');

  Future<void> playBeadTick() => _play(_tick, 'sounds/bead_tick.wav');

  Future<void> _play(AudioPlayer? player, String asset) async {
    if (player == null) return;
    try {
      await player.stop();
      await player.play(AssetSource(asset));
    } catch (e) {
      debugPrint('SoundPlayer.play($asset) failed: $e');
    }
  }

  Future<void> dispose() async {
    final chime = _chime;
    final tick = _tick;
    _chime = null;
    _tick = null;
    await chime?.dispose();
    await tick?.dispose();
  }
}
