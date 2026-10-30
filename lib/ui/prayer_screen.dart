import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../app/leader_audio_store.dart';
import '../app/settings.dart';
import '../app/sound_player.dart';
import '../domain/prayer_data.dart';
import '../domain/prayer_mode.dart';
import '../domain/rosary_sequence.dart';
import '../domain/rosary_session.dart';
import '../speech/amen_detector.dart';
import '../speech/sherpa_amen_detector.dart';
import 'widgets/bead_indicator.dart';
import 'widgets/mic_status_chip.dart';

/// 기도 진행 화면.
class PrayerScreen extends StatefulWidget {
  const PrayerScreen({
    super.key,
    required this.settings,
    required this.mysterySet,
    this.soundPlayer,
    this.detector,
    this.leaderAudio,
  });

  final AppSettings settings;
  final MysterySet mysterySet;

  /// 테스트용 주입. 없으면 화면이 직접 만들고 정리한다.
  final SoundPlayer? soundPlayer;

  /// 테스트용 주입. 없고 음성이 켜져 있으면 [SherpaAmenDetector]를 만든다.
  final AmenDetector? detector;

  /// 선창 음성 저장소. 없으면 화면이 직접 만들고 정리한다.
  final LeaderAudioStore? leaderAudio;

  @override
  State<PrayerScreen> createState() => _PrayerScreenState();
}

class _PrayerScreenState extends State<PrayerScreen> {
  late final RosarySession _session;
  late final SoundPlayer _sound;
  late final bool _ownsSound;
  AmenDetector? _detector;
  StreamSubscription<String>? _phraseSub;
  StreamSubscription<SessionEvent>? _eventSub;

  // 선창 음성 재생(후창 모드 전용).
  static const _muteAfterPlayback = Duration(milliseconds: 600);
  static const _cueTimeoutFallback = Duration(seconds: 90);
  late final LeaderAudioStore _leaderStore;
  late final bool _ownsLeaderStore;
  AudioPlayer? _leaderPlayer;
  StreamSubscription<void>? _leaderCompleteSub;
  StreamSubscription<Duration>? _leaderDurationSub;
  Timer? _cueWatchdog;
  final ValueNotifier<bool> _leaderPlaying = ValueNotifier(false);
  List<String> _cuePaths = const [];
  int _cuePos = 0;
  int _playGeneration = 0;
  int _lastIndex = 0;
  DateTime _mutedUntil = DateTime.fromMillisecondsSinceEpoch(0);
  bool _disposed = false;

  bool get _leaderAudioActive =>
      _settings.prayerMode == PrayerMode.responder &&
      _settings.leaderAudioEnabled;

  AppSettings get _settings => widget.settings;

  @override
  void initState() {
    super.initState();
    _session = RosarySession(buildRosarySequence(widget.mysterySet));

    _ownsSound = widget.soundPlayer == null;
    _sound = widget.soundPlayer ?? SoundPlayer();
    unawaited(_sound.init());

    unawaited(
      WakelockPlus.enable().catchError((Object e) {
        debugPrint('wakelock enable failed: $e');
      }),
    );

    _eventSub = _session.events.listen(_onSessionEvent);

    _ownsLeaderStore = widget.leaderAudio == null;
    _leaderStore = widget.leaderAudio ?? LeaderAudioStore();
    if (_leaderAudioActive) {
      _lastIndex = _session.index;
      _session.addListener(_onSessionChanged);
      unawaited(_initLeaderAudio());
    }

    if (_settings.voiceEnabled) {
      final detector = widget.detector ?? SherpaAmenDetector();
      _detector = detector;
      _phraseSub = detector.phraseEvents.listen(_onPhrase);
      unawaited(detector.start());
    }
  }

  /// 선창 음성이 재생 중이거나 막 끝난 직후에는 스피커 소리를 아멘으로 오인하지 않도록 무시한다.
  void _onPhrase(String phrase) {
    if (_leaderPlaying.value || DateTime.now().isBefore(_mutedUntil)) return;
    _session.onPhrase(phrase);
  }

  Future<void> _initLeaderAudio() async {
    try {
      await _leaderStore.init();
    } catch (e) {
      debugPrint('LeaderAudioStore.init failed: $e');
      return;
    }
    if (_disposed) return;
    unawaited(_playLeaderCues());
  }

  void _onSessionChanged() {
    // 음성/탭/이전/다음 어느 쪽으로든 스텝이 바뀌면 현재 재생을 끊고 새 스텝의 큐를 재생한다.
    if (_session.index == _lastIndex &&
        !(_session.isFinished && _leaderPlaying.value)) {
      return;
    }
    _lastIndex = _session.index;
    unawaited(_playLeaderCues());
  }

  AudioPlayer _ensureLeaderPlayer() {
    final existing = _leaderPlayer;
    if (existing != null) return existing;
    final player = AudioPlayer();
    _leaderPlayer = player;
    _leaderCompleteSub = player.onPlayerComplete.listen(
      (_) => _onCueFinished(_playGeneration),
    );
    _leaderDurationSub = player.onDurationChanged.listen((d) {
      if (d > Duration.zero && _leaderPlaying.value) {
        _armWatchdog(d + const Duration(seconds: 3));
      }
    });
    return player;
  }

  void _armWatchdog(Duration after) {
    final gen = _playGeneration;
    _cueWatchdog?.cancel();
    _cueWatchdog = Timer(after, () => _onCueFinished(gen));
  }

  /// 현재 재생을 멈추고, 현재 스텝의 녹음된 큐를 순서대로 재생한다.
  Future<void> _playLeaderCues() async {
    final gen = ++_playGeneration;
    final wasPlaying = _leaderPlaying.value;
    _cueWatchdog?.cancel();
    _leaderPlaying.value = false;
    if (wasPlaying) {
      _mutedUntil = DateTime.now().add(_muteAfterPlayback);
      try {
        await _leaderPlayer?.stop();
      } catch (e) {
        debugPrint('leader stop failed: $e');
      }
      if (gen != _playGeneration || _disposed) return;
    }
    if (_session.isFinished) return;

    _cuePaths = [
      for (final id in _session.current.leaderCueIds)
        if (_leaderStore.has(id)) _leaderStore.pathFor(id),
    ];
    _cuePos = 0;
    if (_cuePaths.isEmpty) return;

    _leaderPlaying.value = true;
    try {
      await SoundPlayer.configureGlobalAudioContext();
    } catch (_) {}
    if (gen != _playGeneration || _disposed) return;
    await _playCurrentCue(gen);
  }

  Future<void> _playCurrentCue(int gen) async {
    if (gen != _playGeneration || _disposed) return;
    if (_cuePos >= _cuePaths.length) {
      _endLeaderPlayback();
      return;
    }
    try {
      _armWatchdog(_cueTimeoutFallback);
      await _ensureLeaderPlayer().play(DeviceFileSource(_cuePaths[_cuePos]));
    } catch (e) {
      debugPrint('leader play failed: $e');
      _onCueFinished(gen);
    }
  }

  void _onCueFinished(int gen) {
    if (gen != _playGeneration || _disposed || !_leaderPlaying.value) return;
    _cuePos++;
    unawaited(_playCurrentCue(gen));
  }

  void _endLeaderPlayback() {
    _cueWatchdog?.cancel();
    _mutedUntil = DateTime.now().add(_muteAfterPlayback);
    _leaderPlaying.value = false;
  }

  void _onSessionEvent(SessionEvent e) {
    switch (e) {
      case SessionEvent.hailMarysCompleted:
        if (_settings.chimeOnTenHailMarys) unawaited(_sound.playDecadeChime());
      case SessionEvent.bead:
      case SessionEvent.decadeCompleted:
        if (_settings.tickPerBead) unawaited(_sound.playBeadTick());
      case SessionEvent.finished:
        unawaited(_detector?.stop());
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _playGeneration++;
    _cueWatchdog?.cancel();
    _session.removeListener(_onSessionChanged);
    _leaderCompleteSub?.cancel();
    _leaderDurationSub?.cancel();
    final leaderPlayer = _leaderPlayer;
    if (leaderPlayer != null) {
      unawaited(leaderPlayer.stop().whenComplete(leaderPlayer.dispose));
    }
    _leaderPlaying.dispose();
    if (_ownsLeaderStore) _leaderStore.dispose();
    _phraseSub?.cancel();
    _eventSub?.cancel();
    final detector = _detector;
    if (detector != null) {
      unawaited(detector.stop().then((_) => detector.dispose()));
    }
    _session.dispose();
    if (_ownsSound) unawaited(_sound.dispose());
    unawaited(
      WakelockPlus.disable().catchError((Object e) {
        debugPrint('wakelock disable failed: $e');
      }),
    );
    super.dispose();
  }

  Future<void> _confirmExit() async {
    final leave = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('기도를 중단할까요?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('계속 기도'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('중단'),
          ),
        ],
      ),
    );
    if (leave == true && mounted) Navigator.of(context).pop();
  }

  String _appBarTitle(RosaryStep step) {
    final name = widget.mysterySet.koreanName;
    if (step.kind == StepKind.closing) return '$name · 마침';
    final decade = step.decade;
    return decade == null ? '$name · 서두' : '$name · $decade단';
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _session,
      builder: (context, _) {
        final finished = _session.isFinished;
        return PopScope(
          canPop: finished,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) _confirmExit();
          },
          child: Scaffold(
            appBar: AppBar(
              title: Text(
                finished
                    ? widget.mysterySet.koreanName
                    : _appBarTitle(_session.current),
              ),
              centerTitle: true,
            ),
            body: SafeArea(
              child: finished ? _buildFinished(context) : _buildPrayer(context),
            ),
          ),
        );
      },
    );
  }

  Widget _buildFinished(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.favorite, size: 56, color: theme.colorScheme.primary),
            const SizedBox(height: 16),
            Text(
              '묵주기도를 마쳤습니다',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size(200, 56)),
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('처음으로'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPrayer(BuildContext context) {
    final step = _session.current;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Column(
      children: [
        Expanded(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: _session.next,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: SizedBox(
                width: double.infinity,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_leaderAudioActive)
                      ValueListenableBuilder<bool>(
                        valueListenable: _leaderPlaying,
                        builder: (context, playing, _) => playing
                            ? const _LeaderPlayingBadge()
                            : const SizedBox.shrink(),
                      ),
                    if (step.heading != null)
                      _HeadingCard(heading: step.heading!),
                    Text(
                      step.title,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        color: scheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _PrayerText(step: step, mode: _settings.prayerMode),
                  ],
                ),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              BeadIndicator(step: step, style: _settings.rosaryStyle),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(56),
                        textStyle: const TextStyle(fontSize: 18),
                      ),
                      onPressed: _session.index == 0 ? null : _session.back,
                      child: const Text('이전'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(56),
                        textStyle: const TextStyle(fontSize: 18),
                      ),
                      onPressed: _session.next,
                      child: const Text('다음'),
                    ),
                  ),
                ],
              ),
              if (_detector != null) ...[
                const SizedBox(height: 8),
                MicStatusChip(
                  enabled: _settings.voiceEnabled,
                  state: _detector!.state,
                  lastError: () {
                    final d = _detector;
                    return d is SherpaAmenDetector ? d.lastError : null;
                  },
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _LeaderPlayingBadge extends StatelessWidget {
  const _LeaderPlayingBadge();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Align(
        alignment: Alignment.centerLeft,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: scheme.tertiaryContainer,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.volume_up,
                  size: 18,
                  color: scheme.onTertiaryContainer,
                ),
                const SizedBox(width: 6),
                Text(
                  '선창 재생 중',
                  style: Theme.of(context).textTheme.labelLarge
                      ?.copyWith(color: scheme.onTertiaryContainer),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HeadingCard extends StatelessWidget {
  const _HeadingCard({required this.heading});

  final String heading;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final lines = heading.split('\n');
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      color: scheme.primaryContainer,
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          width: double.infinity,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                lines.first,
                style: theme.textTheme.titleMedium?.copyWith(
                  color: scheme.onPrimaryContainer,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (lines.length > 1) ...[
                const SizedBox(height: 6),
                Text(
                  lines.skip(1).join('\n'),
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: scheme.onPrimaryContainer,
                    height: 1.5,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _PrayerText extends StatelessWidget {
  const _PrayerText({required this.step, required this.mode});

  final RosaryStep step;
  final PrayerMode mode;

  static const double _big = 22;
  static const double _small = 17;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final onSurface = scheme.onSurface;
    final dim = onSurface.withValues(alpha: 0.45);
    final split = step.responderText.isNotEmpty;

    TextStyle style(double size, Color color, {bool bold = false}) => TextStyle(
      fontSize: size,
      height: 1.7,
      color: color,
      fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
    );

    if (mode == PrayerMode.solo) {
      return Text(step.text, style: style(_big, onSurface));
    }

    // 나뉘지 않는 기도(성호경 등)는 모두 함께 바친다.
    if (!split) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _RoleLabel(text: '모두 함께'),
          Text(step.text, style: style(_big, onSurface, bold: true)),
        ],
      );
    }

    final leaderMine = mode == PrayerMode.leader;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _RoleLabel(text: leaderMine ? '내 차례: 앞단' : '내 차례: 뒷단'),
        Text(
          step.leaderText,
          style: leaderMine
              ? style(_big, onSurface, bold: true)
              : style(_small, dim),
        ),
        Text(
          step.responderText,
          style: leaderMine
              ? style(_small, dim)
              : style(_big, onSurface, bold: true),
        ),
      ],
    );
  }
}

class _RoleLabel extends StatelessWidget {
  const _RoleLabel({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: scheme.secondaryContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
          child: Text(
            text,
            style: Theme.of(context).textTheme.labelMedium
                ?.copyWith(color: scheme.onSecondaryContainer),
          ),
        ),
      ),
    );
  }
}
