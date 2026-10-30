import 'dart:async';
import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

import '../domain/leader_cues.dart';
import '../domain/prayer_data.dart';
import '../domain/prayer_splits.dart';
import '../domain/rosary_sequence.dart';
import 'leader_audio_store.dart';
import 'sound_player.dart';

/// 후창 모드에서 앞단(선창)을 들려주는 소스.
enum LeaderVoiceSource { tts, recorded }

extension LeaderVoiceSourceInfo on LeaderVoiceSource {
  String get label => switch (this) {
    LeaderVoiceSource.tts => 'AI 음성',
    LeaderVoiceSource.recorded => '직접 녹음',
  };
}

/// 스텝의 앞단을 말하거나 재생하는 객체.
abstract class LeaderVoice {
  Future<void> init();

  /// [step]의 큐를 순서대로 말/재생하고 끝나면 완료한다.
  /// 이미 말하는 중이면 먼저 끊는다. 중간에 [stop]이 오면 즉시 끝난다.
  Future<void> speakStep(RosaryStep step);

  Future<void> stop();

  Future<void> dispose();

  /// 말/재생 중이면 true.
  ValueListenable<bool> get isSpeaking;
}

/// OS 내장 TTS(`flutter_tts`)로 한국어 앞단을 읽어 준다.
class TtsLeaderVoice implements LeaderVoice {
  /// [rate]는 호출할 때마다 현재 말하기 속도(0.3~0.7)를 돌려준다.
  TtsLeaderVoice({double Function()? rate}) : _rate = rate ?? (() => 0.45);

  static const _language = 'ko-KR';
  static const _speakTimeout = Duration(seconds: 120);

  final double Function() _rate;
  final ValueNotifier<bool> _speaking = ValueNotifier(false);
  FlutterTts? _tts;
  Future<void>? _initFuture;
  int _gen = 0;
  bool _disposed = false;

  @override
  ValueListenable<bool> get isSpeaking => _speaking;

  @override
  Future<void> init() => _initFuture ??= _init();

  Future<void> _init() async {
    try {
      final tts = FlutterTts();
      _tts = tts;
      await tts.setLanguage(_language);
      await tts.awaitSpeakCompletion(true);
      if (!kIsWeb && Platform.isIOS) {
        // 마이크 인식과 동시에 말할 수 있도록 오디오 세션을 맞춘다.
        await tts.setIosAudioCategory(
          IosTextToSpeechAudioCategory.playAndRecord,
          const [
            IosTextToSpeechAudioCategoryOptions.defaultToSpeaker,
            IosTextToSpeechAudioCategoryOptions.allowBluetooth,
            IosTextToSpeechAudioCategoryOptions.mixWithOthers,
          ],
        );
      }
    } catch (e) {
      debugPrint('TtsLeaderVoice.init failed: $e');
    }
  }

  /// 기기에 한국어 음성이 있는지. 알 수 없으면(오류 포함) true로 본다.
  Future<bool> koreanAvailable() async {
    try {
      await init();
      final tts = _tts;
      if (tts == null) return true;
      final r = await tts.isLanguageAvailable(_language);
      if (r is bool) return r;
      if (r is num) return r != 0;
      return true;
    } catch (e) {
      debugPrint('TtsLeaderVoice.koreanAvailable failed: $e');
      return true;
    }
  }

  /// 성모송 앞단을 읽어 목소리/속도를 미리 들려준다.
  Future<void> preview() => _speakTexts([splitPrayer(Prayers.hailMary).leader]);

  @override
  Future<void> speakStep(RosaryStep step) {
    final byId = {for (final c in allLeaderCues) c.id: c.text};
    return _speakTexts([
      for (final id in step.leaderCueIds)
        if (byId[id] != null) byId[id]!,
    ]);
  }

  Future<void> _speakTexts(List<String> texts) async {
    final gen = ++_gen;
    await init();
    if (gen != _gen || _disposed) return;
    final tts = _tts;
    if (tts == null || texts.isEmpty) {
      await _stopEngine();
      if (gen == _gen) _speaking.value = false;
      return;
    }
    _speaking.value = true;
    try {
      await _stopEngine();
      if (gen != _gen || _disposed) return;
      await tts.setSpeechRate(_rate());
      for (final text in texts) {
        if (gen != _gen || _disposed) return;
        await tts.speak(text).timeout(_speakTimeout);
      }
    } catch (e) {
      debugPrint('TtsLeaderVoice.speak failed: $e');
    } finally {
      if (gen == _gen && !_disposed) _speaking.value = false;
    }
  }

  Future<void> _stopEngine() async {
    try {
      await _tts?.stop();
    } catch (_) {}
  }

  @override
  Future<void> stop() async {
    _gen++;
    if (!_disposed) _speaking.value = false;
    await _stopEngine();
  }

  @override
  Future<void> dispose() async {
    _gen++;
    _disposed = true;
    await _stopEngine();
    _speaking.dispose();
  }
}

/// 사용자가 녹음한 앞단 파일을 재생한다([LeaderAudioStore]).
class RecordedLeaderVoice implements LeaderVoice {
  RecordedLeaderVoice(this.store);

  final LeaderAudioStore store;

  static const _cueTimeoutFallback = Duration(seconds: 90);

  final ValueNotifier<bool> _speaking = ValueNotifier(false);
  AudioPlayer? _player;
  StreamSubscription<void>? _completeSub;
  StreamSubscription<Duration>? _durationSub;
  Timer? _watchdog;
  Completer<void>? _cueDone;
  int _gen = 0;
  bool _disposed = false;

  @override
  ValueListenable<bool> get isSpeaking => _speaking;

  @override
  Future<void> init() async {
    try {
      await store.init();
    } catch (e) {
      debugPrint('LeaderAudioStore.init failed: $e');
    }
  }

  AudioPlayer _ensurePlayer() {
    final existing = _player;
    if (existing != null) return existing;
    final player = AudioPlayer();
    _player = player;
    _completeSub = player.onPlayerComplete.listen((_) => _finishCue());
    _durationSub = player.onDurationChanged.listen((d) {
      if (d > Duration.zero && _cueDone != null) {
        _armWatchdog(d + const Duration(seconds: 3));
      }
    });
    return player;
  }

  void _armWatchdog(Duration after) {
    _watchdog?.cancel();
    _watchdog = Timer(after, _finishCue);
  }

  void _finishCue() {
    _watchdog?.cancel();
    final done = _cueDone;
    if (done != null && !done.isCompleted) done.complete();
  }

  @override
  Future<void> speakStep(RosaryStep step) async {
    final gen = ++_gen;
    _finishCue();
    await init();
    if (gen != _gen || _disposed) return;
    final paths = [
      for (final id in step.leaderCueIds)
        if (store.has(id)) store.pathFor(id),
    ];
    try {
      await _player?.stop();
    } catch (e) {
      debugPrint('leader stop failed: $e');
    }
    if (gen != _gen || _disposed) return;
    if (paths.isEmpty) {
      _speaking.value = false;
      return;
    }

    _speaking.value = true;
    try {
      try {
        await SoundPlayer.configureGlobalAudioContext();
      } catch (_) {}
      for (final path in paths) {
        if (gen != _gen || _disposed) return;
        final done = Completer<void>();
        _cueDone = done;
        try {
          _armWatchdog(_cueTimeoutFallback);
          await _ensurePlayer().play(DeviceFileSource(path));
          await done.future;
        } catch (e) {
          debugPrint('leader play failed: $e');
        }
      }
    } finally {
      _watchdog?.cancel();
      if (gen == _gen && !_disposed) {
        _cueDone = null;
        _speaking.value = false;
      }
    }
  }

  @override
  Future<void> stop() async {
    _gen++;
    _finishCue();
    if (!_disposed) _speaking.value = false;
    try {
      await _player?.stop();
    } catch (_) {}
  }

  @override
  Future<void> dispose() async {
    _gen++;
    _disposed = true;
    _watchdog?.cancel();
    _finishCue();
    await _completeSub?.cancel();
    await _durationSub?.cancel();
    final player = _player;
    _player = null;
    if (player != null) {
      try {
        await player.stop();
      } catch (_) {}
      await player.dispose();
    }
    _speaking.dispose();
  }
}
