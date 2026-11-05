import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../domain/leader_cues.dart';
import '../domain/rosary_sequence.dart';
import 'leader_voice.dart';
import 'sound_player.dart';

/// 번들 에셋 경로(예: `assets/leader_voice/sister/hail_mary.mp3`)가 앱에 들어 있는지.
typedef AssetExists = Future<bool> Function(String assetPath);

/// 클립 하나를 재생하는 재생기. 테스트에서는 가짜로 바꾼다.
abstract class ClipPlayer {
  /// 재생이 끝까지 간 것을 알린다.
  Stream<void> get onComplete;

  /// 클립 길이가 알려지면 알린다.
  Stream<Duration> get onDuration;

  /// 재생 전에 한 번 부른다(오디오 세션 설정 등).
  Future<void> prepare();

  /// [assetKey]는 `assets/` 아래 경로. 예: `leader_voice/sister/hail_mary.mp3`.
  Future<void> playAsset(String assetKey);

  Future<void> stop();

  Future<void> dispose();
}

/// `audioplayers` 기반 [ClipPlayer]. 자연스러운 속도(1.0)와 최대 볼륨으로 재생한다.
class AudioplayersClipPlayer implements ClipPlayer {
  final AudioPlayer _player = AudioPlayer();

  @override
  Stream<void> get onComplete => _player.onPlayerComplete;

  @override
  Stream<Duration> get onDuration => _player.onDurationChanged;

  @override
  Future<void> prepare() async {
    try {
      await SoundPlayer.configureGlobalAudioContext();
    } catch (_) {}
  }

  @override
  Future<void> playAsset(String assetKey) =>
      _player.play(AssetSource(assetKey), volume: 1.0);

  @override
  Future<void> stop() => _player.stop();

  @override
  Future<void> dispose() => _player.dispose();
}

/// 앱에 미리 넣어 둔 고품질 합성 음성 클립(`assets/leader_voice/<화자>/<cueId>.mp3`)을
/// 재생한다. 클립이 없는 큐는 [fallback](기기 TTS)이 대신 읽는다.
///
/// 클립마다 새 재생기를 만들어 쓴다. 그러면 스텝이 빨리 바뀐 뒤에 늦게 도착한
/// 이전 클립의 '재생 끝' 신호가 새 스텝을 끝내 버릴 수 없다(그 재생기의 구독은 이미 끊겼다).
class BundledLeaderVoice implements LeaderVoice {
  BundledLeaderVoice({
    required this.persona,
    this.fallback,
    this.disposeFallback = false,
    AssetExists? assetExists,
    ClipPlayer Function()? playerFactory,
  }) : _assetExists = assetExists ?? defaultAssetExists,
       _playerFactory = playerFactory ?? AudioplayersClipPlayer.new;

  final LeaderVoicePersona persona;

  /// 클립이 없는 큐를 읽어 줄 음성(보통 기기 TTS).
  final LeaderVoice? fallback;

  /// true면 [dispose]에서 [fallback]도 정리한다(이 객체가 소유할 때).
  final bool disposeFallback;

  final AssetExists _assetExists;
  final ClipPlayer Function() _playerFactory;

  static const _cueTimeoutFallback = Duration(seconds: 90);
  static const _durationSlack = Duration(seconds: 3);

  /// 화자 폴더의 에셋 경로. 예: `assets/leader_voice/sister/hail_mary.mp3`.
  static String assetPath(LeaderVoicePersona persona, String cueId) =>
      'assets/leader_voice/${persona.name}/$cueId.mp3';

  /// `AssetSource`에 넘기는 키(`assets/` 접두어 없음).
  static String assetKey(LeaderVoicePersona persona, String cueId) =>
      'leader_voice/${persona.name}/$cueId.mp3';

  static final Map<String, Future<bool>> _defaultCache = {};

  /// `rootBundle.load`로 에셋이 있는지 본다. 없으면 로드가 예외를 던진다.
  /// 결과는 프로세스 동안 캐시한다.
  static Future<bool> defaultAssetExists(String assetPath) =>
      _defaultCache[assetPath] ??= () async {
        try {
          final data = await rootBundle.load(assetPath);
          return data.lengthInBytes > 0;
        } catch (_) {
          return false;
        }
      }();

  /// [persona]의 클립이 26개 큐 중 몇 개나 앱에 들어 있는지.
  static Future<int> availableClipCount(
    LeaderVoicePersona persona, {
    AssetExists? assetExists,
  }) async {
    final exists = assetExists ?? defaultAssetExists;
    final results = await Future.wait([
      for (final cue in allLeaderCues) exists(assetPath(persona, cue.id)),
    ]);
    return results.where((has) => has).length;
  }

  final ValueNotifier<bool> _speaking = ValueNotifier(false);
  final Map<String, Future<bool>> _exists = {};
  ClipPlayer? _activePlayer;
  void Function()? _finishActive;
  bool _fallbackActive = false;
  int _gen = 0;
  bool _disposed = false;

  @override
  ValueListenable<bool> get isSpeaking => _speaking;

  @override
  Future<void> init() async {}

  Future<bool> _hasClip(String cueId) => _exists[cueId] ??= () async {
    try {
      return await _assetExists(assetPath(persona, cueId));
    } catch (_) {
      return false;
    }
  }();

  @override
  Future<void> speakStep(RosaryStep step) async {
    final gen = ++_gen;
    _finishActive?.call();
    await _stopFallback();
    if (gen != _gen || _disposed) return;
    final player = _activePlayer;
    if (player != null) {
      try {
        await player.stop();
      } catch (e) {
        debugPrint('bundled leader stop failed: $e');
      }
      if (gen != _gen || _disposed) return;
    }
    final ids = step.leaderCueIds;
    if (ids.isEmpty) {
      _speaking.value = false;
      return;
    }

    _speaking.value = true;
    try {
      for (final id in ids) {
        if (gen != _gen || _disposed) return;
        final has = await _hasClip(id);
        if (gen != _gen || _disposed) return;
        final played = has && await _playClip(id, gen);
        if (gen != _gen || _disposed) return;
        if (!played) await _speakWithFallback(id, gen);
      }
    } finally {
      // 다음 스텝이 이미 시작했으면 그쪽 상태를 건드리지 않는다.
      if (gen == _gen && !_disposed) _speaking.value = false;
    }
  }

  /// 클립 하나를 끝까지(또는 중단/워치독까지) 재생한다.
  /// 재생을 시작하지 못하면 false(그 큐는 [fallback]이 읽는다).
  Future<bool> _playClip(String cueId, int gen) async {
    final player = _playerFactory();
    final done = Completer<void>();
    Timer? watchdog;
    void finish() {
      watchdog?.cancel();
      if (!done.isCompleted) done.complete();
    }

    final subs = <StreamSubscription<void>>[
      player.onComplete.listen((_) => finish()),
      player.onDuration.listen((d) {
        if (d > Duration.zero && !done.isCompleted) {
          watchdog?.cancel();
          watchdog = Timer(d + _durationSlack, finish);
        }
      }),
    ];
    _activePlayer = player;
    _finishActive = finish;
    watchdog = Timer(_cueTimeoutFallback, finish);
    try {
      await player.prepare();
      if (gen != _gen || _disposed) return true;
      await player.playAsset(assetKey(persona, cueId));
      await done.future;
      return true;
    } catch (e) {
      debugPrint('bundled leader play failed ($cueId): $e');
      return false;
    } finally {
      watchdog?.cancel();
      for (final sub in subs) {
        unawaited(sub.cancel());
      }
      if (identical(_activePlayer, player)) {
        _activePlayer = null;
        _finishActive = null;
      }
      unawaited(_release(player));
    }
  }

  Future<void> _release(ClipPlayer player) async {
    try {
      await player.stop();
    } catch (_) {}
    try {
      await player.dispose();
    } catch (_) {}
  }

  Future<void> _speakWithFallback(String cueId, int gen) async {
    final voice = fallback;
    if (voice == null) return;
    _fallbackActive = true;
    try {
      await voice.init();
      if (gen != _gen || _disposed) return;
      await voice.speakStep(leaderCueStep(cueId));
    } catch (e) {
      debugPrint('bundled leader fallback failed: $e');
    } finally {
      if (gen == _gen) _fallbackActive = false;
    }
  }

  Future<void> _stopFallback() async {
    if (!_fallbackActive) return;
    _fallbackActive = false;
    try {
      await fallback?.stop();
    } catch (_) {}
  }

  @override
  Future<void> stop() async {
    _gen++;
    final player = _activePlayer;
    _finishActive?.call();
    if (!_disposed) _speaking.value = false;
    await _stopFallback();
    try {
      await player?.stop();
    } catch (_) {}
  }

  @override
  Future<void> dispose() async {
    _gen++;
    _disposed = true;
    final player = _activePlayer;
    _finishActive?.call();
    try {
      await player?.stop();
    } catch (_) {}
    if (disposeFallback) {
      try {
        await fallback?.dispose();
      } catch (_) {}
    } else {
      await _stopFallback();
    }
    _speaking.dispose();
  }
}
