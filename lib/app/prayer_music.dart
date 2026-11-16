import 'dart:async';
import 'dart:math';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/widgets.dart';

import '../church/church_liturgy.dart';
import '../domain/liturgical_season.dart';
import '../domain/prayer_music_tracks.dart';
import 'settings.dart';

/// 배경 음악을 실제로 내는 쪽. 테스트는 가짜를 넣는다([PrayerMusic.debugBackendFactory]).
abstract class MusicBackend {
  /// [asset]을 처음부터 한 번 재생한다(끝나면 [onComplete]).
  Future<void> play(String asset, double volume);
  Future<void> setVolume(double volume);
  Future<void> pause();
  Future<void> resume();
  Future<void> stop();
  Stream<void> get onComplete;
  Future<void> dispose();
}

/// `audioplayers` 로 재생한다. 오디오 포커스를 요청하지 않는 전역 설정(SoundPlayer)을 그대로 써서
/// 선창 음성·효과음·마이크를 끊지 않는다.
class AudioplayersMusicBackend implements MusicBackend {
  final AudioPlayer _player = AudioPlayer(playerId: 'prayer_music')
    ..setReleaseMode(ReleaseMode.stop);

  @override
  Future<void> play(String asset, double volume) async {
    await _player.stop();
    await _player.setVolume(volume);
    // AssetSource 는 'assets/' 를 뺀 경로를 받는다.
    await _player.play(AssetSource(asset.replaceFirst('assets/', '')));
  }

  @override
  Future<void> setVolume(double volume) => _player.setVolume(volume);

  @override
  Future<void> pause() => _player.pause();

  @override
  Future<void> resume() => _player.resume();

  @override
  Future<void> stop() => _player.stop();

  @override
  Stream<void> get onComplete => _player.onPlayerComplete;

  @override
  Future<void> dispose() => _player.dispose();
}

/// 음악을 붙잡고 있는 화면 하나(기도 화면·성당 묵주 패널·성당·미리 듣기). [release]로 놓는다.
class MusicHold {
  MusicHold._(this._owner, this.tag);

  final PrayerMusic _owner;

  /// 어디서 잡았는지(디버그용).
  final String tag;

  void release() => _owner._release(this);
}

/// 기도 중 배경 성가(오르간). 앱에 하나만 있다([PrayerMusic.of]).
///
/// 소리가 나는 조건: 설정이 켜져 있고(기본 꺼짐), 기도 화면 등이 [hold]로 붙잡고 있고,
/// 앱이 앞에 있고, 성삼일 침묵(성목요일 저녁 ~ 부활 성야 전)이 아닐 때.
/// 선창·후창 음성이 말하는 동안([setSpeaking]·[duckWhile])에는 소리를 낮췄다가 끝나면 되돌린다.
class PrayerMusic extends ChangeNotifier with WidgetsBindingObserver {
  PrayerMusic(
    this.settings, {
    MusicBackend Function()? backend,
    bool Function()? silent,
    Random? random,
    DateTime Function()? clock,
    this.fade = const Duration(milliseconds: 450),
    this.observeLifecycle = true,
  }) : _backendFactory = backend,
       _silentNow = silent ?? ChurchLiturgy.silentNow,
       _clock = clock ?? DateTime.now,
       _random = random ?? Random() {
    settings.addListener(_sync);
    ChurchLiturgy.preview.addListener(_sync);
  }

  /// 말소리가 날 때의 음량 비율.
  static const double duckFactor = 0.25;

  /// 테스트에서 기본 재생기를 바꾼다.
  @visibleForTesting
  static MusicBackend Function()? debugBackendFactory;

  static final Expando<PrayerMusic> _instances = Expando('prayerMusic');

  /// [settings]에 딸린 하나뿐인 인스턴스.
  static PrayerMusic of(AppSettings settings) =>
      _instances[settings] ??= PrayerMusic(settings);

  final AppSettings settings;
  final Duration fade;
  final MusicBackend Function()? _backendFactory;
  final bool Function() _silentNow;
  final DateTime Function() _clock;
  final Random _random;

  /// 앱이 뒤로 가면 스스로 멈출지(테스트에서는 끄고 [didChangeAppLifecycleState]를 직접 부른다).
  final bool observeLifecycle;

  final Set<MusicHold> _holds = {};
  final Set<Object> _speakers = {};
  MusicBackend? _backend;
  StreamSubscription<void>? _completeSub;
  Future<void> _queue = Future.value();
  Timer? _fadeTimer;
  Timer? _liturgyTimer;
  bool _observing = false;
  bool _background = false;
  bool _disposed = false;

  MusicTrack? _track;
  bool _started = false; // 재생기에 곡을 올렸는지
  bool _paused = false; // 올린 곡이 멈춰 있는지
  double _level = 0; // 재생기에 마지막으로 준 음량
  String? _lastChoice;

  /// 지금 올려 둔 곡(없으면 null).
  MusicTrack? get current => _track;

  /// 성삼일 침묵 중인지(이때는 켜져 있어도 울리지 않는다).
  bool get silent => _silentNow();

  /// 설정이 켜져 있고 어느 화면이 붙잡고 있는지.
  bool get wanted => settings.prayerMusic && _holds.isNotEmpty;

  /// 지금 실제로 소리가 나야 하는지.
  bool get audible => wanted && !_background && !silent;

  /// 말소리 때문에 낮춘 상태인지.
  bool get ducked => _speakers.isNotEmpty;

  /// 지금 목표 음량(0..1).
  double get targetVolume =>
      settings.prayerMusicVolume * (ducked ? duckFactor : 1.0);

  /// 음악을 붙잡는다. 화면이 닫힐 때 [MusicHold.release].
  MusicHold hold(String tag) {
    final h = MusicHold._(this, tag);
    _holds.add(h);
    _sync();
    return h;
  }

  void _release(MusicHold h) {
    if (!_holds.remove(h)) return;
    _sync();
  }

  /// [source]가 말하는 중인지 알린다(선창·후창 음성). 말하는 동안 음악을 낮춘다.
  void setSpeaking(Object source, bool speaking) {
    final changed = speaking ? _speakers.add(source) : _speakers.remove(source);
    if (changed) _sync();
  }

  /// [speech]가 끝날 때까지 음악을 낮춘다(음성 제목 안내 등).
  Future<T> duckWhile<T>(Future<T> speech) {
    final token = Object();
    setSpeaking(token, true);
    return speech.whenComplete(() => setSpeaking(token, false));
  }

  /// 다음 곡으로(섞어 듣기일 때는 다른 곡, 한 곡 고정이면 처음부터).
  void next() {
    if (!audible) return;
    _startTrack(_pick(advance: true));
    notifyListeners();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // 앱이 앞에 있지 않으면(전화·다른 앱·화면 꺼짐) 멈춘다.
    final bg = state != AppLifecycleState.resumed;
    if (bg == _background) return;
    _background = bg;
    _sync();
  }

  MusicTrack _pick({bool advance = false}) {
    const tracks = prayerMusicTracks;
    final fixed = musicTrackById(settings.prayerMusicTrack);
    if (fixed != null) return fixed;
    if (tracks.length == 1) return tracks.first;
    final prev = _track;
    if (prev == null && !advance) return tracks[_random.nextInt(tracks.length)];
    final others = [
      for (final t in tracks)
        if (t.id != prev?.id) t,
    ];
    return others[_random.nextInt(others.length)];
  }

  void _run(Future<void> Function(MusicBackend b) op) {
    final b = _backend;
    if (b == null) return;
    _queue = _queue.then((_) async {
      try {
        await op(b);
      } catch (e) {
        debugPrint('prayer music failed: $e');
      }
    });
  }

  void _startTrack(MusicTrack t) {
    var b = _backend;
    if (b == null) {
      b = _backend =
          (_backendFactory ??
          debugBackendFactory ??
          AudioplayersMusicBackend.new)();
      _completeSub = b.onComplete.listen((_) => _onComplete());
    }
    _track = t;
    _started = true;
    _paused = false;
    _fadeTimer?.cancel();
    _fadeTimer = null;
    final v = _level = targetVolume;
    _run((b) => b.play(t.asset, v));
  }

  void _onComplete() {
    if (_disposed || !_started || _paused || !audible) return;
    _startTrack(_pick(advance: true));
    notifyListeners();
  }

  /// 조건이 바뀔 때마다 부른다: 켜고·멈추고·이어 틀고·음량을 맞춘다.
  void _sync() {
    if (_disposed) return;
    _watch(wanted);
    final choice = settings.prayerMusicTrack;
    final choiceChanged = _lastChoice != null && _lastChoice != choice;
    _lastChoice = choice;

    if (!wanted) {
      _teardown();
    } else if (!audible) {
      // 뒤로 갔거나 성삼일 침묵: 자리만 기억하고 멈춘다.
      if (_started && !_paused) {
        _paused = true;
        _fadeTimer?.cancel();
        _fadeTimer = null;
        _run((b) => b.pause());
      }
    } else if (!_started) {
      _startTrack(_pick());
    } else if (choiceChanged && _pick().id != _track?.id) {
      _startTrack(_pick());
    } else {
      if (_paused) {
        _paused = false;
        final v = _level = targetVolume;
        _run((b) async {
          await b.setVolume(v);
          await b.resume();
        });
      }
      _rampTo(targetVolume);
    }
    notifyListeners();
  }

  /// 음량을 [fade] 동안 부드럽게 옮긴다(낮추기·되돌리기·설정 변경).
  void _rampTo(double target) {
    if ((target - _level).abs() < 0.001) {
      _fadeTimer?.cancel();
      _fadeTimer = null;
      return;
    }
    _fadeTimer?.cancel();
    if (fade <= Duration.zero) {
      _level = target;
      _run((b) => b.setVolume(target));
      return;
    }
    const tick = Duration(milliseconds: 50);
    final steps = max(1, fade.inMilliseconds ~/ tick.inMilliseconds);
    final from = _level;
    var i = 0;
    _fadeTimer = Timer.periodic(tick, (t) {
      i++;
      final v = _level = from + (target - from) * (i / steps);
      _run((b) => b.setVolume(v));
      if (i >= steps) {
        t.cancel();
        _fadeTimer = null;
      }
    });
  }

  /// 아무도 붙잡지 않거나 설정이 꺼졌다: 멈추고 재생기를 놓는다.
  void _teardown() {
    _fadeTimer?.cancel();
    _fadeTimer = null;
    final b = _backend;
    if (b == null) return;
    _backend = null;
    _started = false;
    _paused = false;
    _track = null;
    _level = 0;
    unawaited(_completeSub?.cancel());
    _completeSub = null;
    _queue = _queue.then((_) async {
      try {
        await b.stop();
        await b.dispose();
      } catch (e) {
        debugPrint('prayer music stop failed: $e');
      }
    });
  }

  /// 켜져 있고 붙잡힌 동안만 앱 상태와 성삼일 침묵 시각을 지켜본다.
  void _watch(bool on) {
    if (on == _observing) return;
    _observing = on;
    if (on) {
      if (observeLifecycle) {
        final binding = WidgetsBinding.instance;
        binding.addObserver(this);
        final s = binding.lifecycleState;
        _background = s != null && s != AppLifecycleState.resumed;
      }
      _armLiturgy();
    } else {
      if (observeLifecycle) WidgetsBinding.instance.removeObserver(this);
      _liturgyTimer?.cancel();
      _liturgyTimer = null;
    }
  }

  void _armLiturgy() {
    _liturgyTimer?.cancel();
    final wait =
        untilNextLiturgyCheck(_clock()) +
        const Duration(seconds: 1);
    _liturgyTimer = Timer(wait, () {
      _armLiturgy();
      _sync();
    });
  }

  @override
  void dispose() {
    if (_disposed) return;
    _holds.clear();
    _watch(false);
    _teardown();
    _disposed = true;
    settings.removeListener(_sync);
    ChurchLiturgy.preview.removeListener(_sync);
    super.dispose();
  }
}
