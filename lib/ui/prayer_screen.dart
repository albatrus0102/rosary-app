import 'dart:async';

import 'package:flutter/material.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../app/leader_audio_store.dart';
import '../app/leader_voice.dart';
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
    this.leaderVoice,
  });

  final AppSettings settings;
  final MysterySet mysterySet;

  /// 테스트용 주입. 없으면 화면이 직접 만들고 정리한다.
  final SoundPlayer? soundPlayer;

  /// 테스트용 주입. 없고 음성이 켜져 있으면 [SherpaAmenDetector]를 만든다.
  final AmenDetector? detector;

  /// 선창 음성 저장소. 없으면 화면이 직접 만들고 정리한다.
  final LeaderAudioStore? leaderAudio;

  /// 테스트용 주입. 없으면 설정의 소스(AI 음성/직접 녹음)에 맞게 만든다.
  /// 주입한 객체는 화면이 정리하지 않는다(말하기만 멈춘다).
  final LeaderVoice? leaderVoice;

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

  // 선창 음성(후창 모드 전용).
  static const _muteAfterPlayback = Duration(milliseconds: 600);
  LeaderVoice? _voice;
  LeaderAudioStore? _ownedStore;
  bool _ownsVoice = false;
  int _lastIndex = 0;
  Timer? _muteTimer;
  bool _muted = false;
  bool _wasSpeaking = false;
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

    if (_leaderAudioActive) {
      _setUpLeaderVoice();
    }

    if (_settings.voiceEnabled) {
      final detector = widget.detector ?? SherpaAmenDetector();
      _detector = detector;
      _phraseSub = detector.phraseEvents.listen(_onPhrase);
      unawaited(detector.start());
    }
  }

  void _setUpLeaderVoice() {
    var voice = widget.leaderVoice;
    if (voice == null) {
      _ownsVoice = true;
      voice = switch (_settings.leaderVoiceSource) {
        LeaderVoiceSource.tts => TtsLeaderVoice(rate: () => _settings.ttsRate),
        LeaderVoiceSource.recorded => RecordedLeaderVoice(
          widget.leaderAudio ?? (_ownedStore = LeaderAudioStore()),
        ),
      };
    }
    _voice = voice;
    _lastIndex = _session.index;
    voice.isSpeaking.addListener(_onSpeakingChanged);
    _session.addListener(_onSessionChanged);
    unawaited(_startLeaderVoice(voice));
  }

  Future<void> _startLeaderVoice(LeaderVoice voice) async {
    try {
      await voice.init();
      if (_disposed) return;
      await voice.speakStep(_session.current);
    } catch (e) {
      debugPrint('leader voice failed: $e');
    }
  }

  /// 말이 끝나면 그 뒤 잠시 동안도 음성 이벤트를 무시한다(스피커 소리가 마이크에 남아 있을 수 있다).
  void _onSpeakingChanged() {
    final speaking = _voice?.isSpeaking.value ?? false;
    if (_wasSpeaking && !speaking) {
      _muted = true;
      _muteTimer?.cancel();
      _muteTimer = Timer(_muteAfterPlayback, () => _muted = false);
    }
    _wasSpeaking = speaking;
    if (mounted) setState(() {});
  }

  /// 선창이 말하는 중이거나 막 끝난 직후에는 스피커 소리를 아멘으로 오인하지 않도록 무시한다.
  void _onPhrase(String phrase) {
    final speaking = _voice?.isSpeaking.value ?? false;
    if (speaking || _muted) return;
    _session.onPhrase(phrase);
  }

  void _onSessionChanged() {
    // 음성/탭/이전/다음 어느 쪽으로든 스텝이 바뀌면 현재 말을 끊고 새 스텝을 말한다.
    final voice = _voice;
    if (voice == null) return;
    if (_session.isFinished) {
      unawaited(voice.stop());
      return;
    }
    if (_session.index == _lastIndex) return;
    _lastIndex = _session.index;
    unawaited(
      voice.speakStep(_session.current).catchError((Object e) {
        debugPrint('leader voice failed: $e');
      }),
    );
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
    _muteTimer?.cancel();
    _session.removeListener(_onSessionChanged);
    final voice = _voice;
    if (voice != null) {
      voice.isSpeaking.removeListener(_onSpeakingChanged);
      if (_ownsVoice) {
        unawaited(voice.dispose());
      } else {
        unawaited(voice.stop());
      }
    }
    _ownedStore?.dispose();
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
                    if (_voice?.isSpeaking.value ?? false)
                      const _LeaderPlayingBadge(),
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
