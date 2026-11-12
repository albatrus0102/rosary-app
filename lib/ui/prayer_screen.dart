import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../app/app_services.dart';
import '../app/bundled_leader_voice.dart';
import '../app/leader_audio_store.dart';
import '../app/leader_voice.dart';
import '../app/prayer_tracking.dart';
import '../app/settings.dart';
import '../app/sound_player.dart';
import '../app/theme.dart';
import '../app/track.dart';
import '../app/window_class.dart';
import '../domain/prayer_data.dart';
import '../domain/prayer_mode.dart';
import '../domain/rosary_sequence.dart';
import '../domain/rosary_session.dart';
import '../stats/prayer_stats_store.dart';
import '../stats/stats_screen.dart';
import 'widgets/pill.dart';
import 'widgets/rosary_map.dart';
import 'widgets/soft_card.dart';

/// 기도 진행 화면.
class PrayerScreen extends StatefulWidget {
  const PrayerScreen({
    super.key,
    required this.settings,
    required this.mysterySet,
    this.initialIndex = 0,
    this.soundPlayer,
    this.leaderAudio,
    this.leaderVoice,
    this.session,
    this.onOpenStats,
  });

  final AppSettings settings;
  final MysterySet mysterySet;

  /// 이어서 기도할 때 시작할 스텝 인덱스. 범위를 벗어나면 0.
  final int initialIndex;

  /// 테스트용 주입. 없으면 화면이 직접 만들고 정리한다.
  final SoundPlayer? soundPlayer;

  /// 선창 음성 저장소. 없으면 화면이 직접 만들고 정리한다.
  final LeaderAudioStore? leaderAudio;

  /// 테스트용 주입. 없으면 설정의 소스(AI 음성/기기 음성/직접 녹음)에 맞게 만든다.
  /// 주입한 객체는 화면이 정리하지 않는다(말하기만 멈춘다).
  final LeaderVoice? leaderVoice;

  /// 이미 진행 중인 세션(사이버 성당 등). 주어지면 이 세션을 이어서 쓰고,
  /// 화면이 닫혀도 정리(dispose)하지 않는다. [initialIndex]는 무시한다.
  final RosarySession? session;

  /// 완료 화면의 '기록 보기'. 기도 화면을 닫은 뒤 부른다(셸이 '기록' 탭으로 이동).
  /// 없으면 기록 화면을 새 라우트로 연다(기록 서비스가 있을 때만 버튼이 보인다).
  final VoidCallback? onOpenStats;

  @override
  State<PrayerScreen> createState() => _PrayerScreenState();
}

class _PrayerScreenState extends State<PrayerScreen> {
  /// 아래 묵주 패널이 위로 펼쳐진(크게 보는) 상태인지.
  bool _mapExpanded = false;

  /// 손가락으로 끌고 있는 동안의 묵주 높이. 끌지 않을 때는 null.
  double? _mapDragHeight;

  late final RosarySession _session;
  late final bool _ownsSession;
  late final SoundPlayer _sound;
  late final bool _ownsSound;
  StreamSubscription<SessionEvent>? _eventSub;

  /// 기도 기록·분석. 세션의 주인(이 화면이 세션을 만든 경우)만 만든다. 성당 기도 카드가
  /// 연 전체 화면 기도는 카드 쪽 컨트롤러가 이미 기록하므로 여기서는 만들지 않는다.
  PrayerTracking? _tracking;

  // 선창 음성(후창 모드 전용).
  LeaderVoice? _voice;
  LeaderAudioStore? _ownedStore;
  bool _ownsVoice = false;
  int _lastIndex = 0;
  bool _disposed = false;

  bool get _leaderAudioActive =>
      _settings.prayerMode == PrayerMode.responder &&
      _settings.leaderAudioEnabled;

  AppSettings get _settings => widget.settings;

  @override
  void initState() {
    super.initState();
    _ownsSession = widget.session == null;
    _session =
        widget.session ?? RosarySession(buildRosarySequence(widget.mysterySet));
    var resumed = false;
    if (_ownsSession &&
        widget.initialIndex > 0 &&
        widget.initialIndex < _session.steps.length) {
      _session.jumpTo(widget.initialIndex);
      resumed = true;
    }
    if (_ownsSession) {
      // 이어하기 위치로 옮긴 뒤에 붙인다(그 위치가 기준선).
      _tracking = PrayerTracking(
        session: _session,
        mysterySet: widget.mysterySet,
        settings: _settings,
        stats: AppServicesScope.maybeOf(context)?.stats,
        resumed: resumed,
      )..start();
    }

    _ownsSound = widget.soundPlayer == null;
    _sound = widget.soundPlayer ?? SoundPlayer(volume: _settings.chimeVolume);
    _sound.volume = _settings.chimeVolume;
    unawaited(_sound.init());

    unawaited(
      WakelockPlus.enable().catchError((Object e) {
        debugPrint('wakelock enable failed: $e');
      }),
    );

    _eventSub = _session.events.listen(_onSessionEvent);
    _session.addListener(_onProgress);
    HardwareKeyboard.instance.addHandler(_onKey);

    if (_leaderAudioActive) {
      _setUpLeaderVoice();
    }
  }

  void _setUpLeaderVoice() {
    var voice = widget.leaderVoice;
    if (voice == null) {
      _ownsVoice = true;
      voice = switch (_settings.leaderVoiceSource) {
        LeaderVoiceSource.bundled => BundledLeaderVoice(
          persona: _settings.leaderPersona,
          fallback: TtsLeaderVoice(rate: () => _settings.ttsRate),
          disposeFallback: true,
        ),
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

  void _onSpeakingChanged() {
    if (mounted) setState(() {});
  }

  void _onSessionChanged() {
    // 탭/이전/다음/스와이프 어느 쪽으로든 스텝이 바뀌면 현재 말을 끊고 새 스텝을 말한다.
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

  /// 이어서 기도하기를 위해 스텝이 바뀔 때마다 위치를 저장하고, 마치면 지운다.
  void _onProgress() {
    final settings = _settings;
    if (_session.isFinished || _session.index == 0) {
      settings.clearProgress();
    } else {
      settings.saveProgress(widget.mysterySet, _session.index);
    }
  }

  /// 설정이 켜져 있을 때만 진동한다. 실패해도 기도 진행에는 영향이 없다.
  void _haptic(Future<void> Function() feedback) {
    if (!_settings.hapticOnAdvance) return;
    unawaited(
      feedback().catchError((Object e) {
        debugPrint('haptic failed: $e');
      }),
    );
  }

  /// 눈을 감고 바쳐도 구슬 종류를 손끝으로 알 수 있게 진동 세기를 나눈다(P-02).
  /// 성모송 구슬은 약하게, 주님의 기도·영광송 등 큰 구슬은 중간, 단의 끝·마침은 강하게.
  /// 이벤트 직후 [RosarySession.current]는 **도착한** 구슬이다.
  Future<void> Function() _hapticFor(SessionEvent e) {
    switch (e) {
      case SessionEvent.finished:
      case SessionEvent.decadeCompleted:
        return HapticFeedback.heavyImpact;
      case SessionEvent.hailMarysCompleted:
        return HapticFeedback.mediumImpact;
      case SessionEvent.bead:
        return _session.current.kind == StepKind.hailMary
            ? HapticFeedback.lightImpact
            : HapticFeedback.mediumImpact;
    }
  }

  void _onSessionEvent(SessionEvent e) {
    _haptic(_hapticFor(e));
    switch (e) {
      case SessionEvent.hailMarysCompleted:
        _sound.volume = _settings.chimeVolume;
        if (_settings.chimeOnTenHailMarys) unawaited(_sound.playDecadeChime());
      case SessionEvent.bead:
        _sound.volume = _settings.chimeVolume;
        if (_settings.tickPerBead) unawaited(_sound.playBeadTick());
      case SessionEvent.decadeCompleted:
        _sound.volume = _settings.chimeVolume;
        if (_settings.tickPerBead) unawaited(_sound.playBeadTick());
      case SessionEvent.finished:
        break;
    }
  }

  /// 볼륨 키로 넘기기(설정, 기본 꺼짐). 별도 네이티브 코드 없이 Flutter 키 이벤트로 받는다.
  /// 볼륨 ↓ 다음, ↑ 이전. 켜져 있고 이 화면이 맨 위일 때만 키를 가로채(시스템 볼륨은 그대로)
  /// 넘긴다. 다른 화면·시트·꺼짐 상태에서는 아무것도 하지 않아 평소처럼 볼륨이 바뀐다.
  bool _onKey(KeyEvent event) {
    if (!_settings.volumeKeyAdvance || _session.isFinished) return false;
    final route = ModalRoute.of(context);
    if (route == null || !route.isCurrent) return false;
    final key = event.logicalKey;
    final next = key == LogicalKeyboardKey.audioVolumeDown;
    if (!next && key != LogicalKeyboardKey.audioVolumeUp) return false;
    if (event is KeyDownEvent) {
      if (next) {
        _session.next();
      } else {
        _session.back();
      }
    }
    return true; // 누르고 있는 반복 입력도 삼켜 볼륨이 바뀌지 않게 한다.
  }

  @override
  void dispose() {
    _disposed = true;
    HardwareKeyboard.instance.removeHandler(_onKey);
    _tracking?.dispose(); // 진행이 있으면 기록 1건을 남긴다. 세션 정리보다 먼저.
    _session.removeListener(_onSessionChanged);
    _session.removeListener(_onProgress);
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
    _eventSub?.cancel();
    if (_ownsSession) _session.dispose();
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

  /// 기도문 글자 크기를 바로 바꿔 볼 수 있는 시트.
  void _showTextSizeSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (sheetContext) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: ListenableBuilder(
            listenable: _settings,
            builder: (context, _) {
              final theme = Theme.of(context);
              final scale = _settings.prayerTextScale;
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('글자 크기', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 12),
                  Card.filled(
                    color: theme.colorScheme.surfaceContainerHigh,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        '은총이 가득하신 마리아님, 기뻐하소서!',
                        style: AppTheme.prayerStyle(
                          context,
                          _settings.prayerFont,
                          size: 20 * scale,
                        ),
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      Icon(
                        Icons.text_decrease,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      Expanded(
                        child: Slider(
                          value: scale,
                          min: AppSettings.minTextScale,
                          max: AppSettings.maxTextScale,
                          divisions: 23,
                          label: '${(scale * 100).round()}%',
                          semanticFormatterCallback: (v) =>
                              '글자 크기 ${(v * 100).round()}%',
                          onChanged: (v) => _settings.prayerTextScale =
                              (v * 100).roundToDouble() / 100,
                          onChangeEnd: (_) =>
                              Track.textScale(_settings.prayerTextScale),
                        ),
                      ),
                      Icon(
                        Icons.text_increase,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ],
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: scale == AppSettings.defaultTextScale
                          ? null
                          : () {
                              _settings.prayerTextScale =
                                  AppSettings.defaultTextScale;
                              Track.textScale(AppSettings.defaultTextScale);
                            },
                      child: const Text('기본 크기'),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([_session, _settings]),
      builder: (context, _) {
        final finished = _session.isFinished;
        final progress = finished
            ? 1.0
            : _session.index / _session.steps.length;
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
              actions: [
                if (!finished)
                  IconButton(
                    tooltip: '글자 크기',
                    icon: const Icon(Icons.text_fields),
                    onPressed: () => _showTextSizeSheet(context),
                  ),
              ],
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(16),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 10),
                  child: Semantics(
                    container: true,
                    label: '진행률',
                    value: '${(progress * 100).round()}%',
                    child: ExcludeSemantics(
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 5,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            body: SafeArea(
              child: finished ? _buildFinished(context) : _buildPrayer(context),
            ),
          ),
        );
      },
    );
  }

  /// 지도를 손가락으로 끌어 구슬을 한 칸씩 넘긴다. 끌다가 기도가 끝나 버리지 않도록
  /// 마지막 스텝에서는 앞으로 넘기지 않는다(마치려면 '다음' 버튼).
  void _scrubStep(int delta) {
    if (delta > 0) {
      if (_session.index < _session.steps.length - 1) _session.next();
    } else if (delta < 0) {
      _session.back();
    }
  }

  void _restartPrayer() {
    _session.restart();
  }

  /// '기록 보기': 기도 화면을 닫고 셸의 기록 탭으로. 셸 없이 열렸으면 기록 화면을 대신 연다.
  void _openStats(AppServices services) {
    final navigator = Navigator.of(context);
    final callback = widget.onOpenStats;
    if (callback != null) {
      navigator.pop();
      callback();
      return;
    }
    unawaited(
      navigator.pushReplacement(
        MaterialPageRoute<void>(
          settings: const RouteSettings(name: 'stats'),
          builder: (_) => StatsScreen(store: services.stats),
        ),
      ),
    );
  }

  /// '기록됨 · 이번 달 n번째'. 점수·순위 없이 이번 달 완주 횟수만 보여 준다.
  Widget _buildRecordedLine(BuildContext context, PrayerStatsStore stats) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return ListenableBuilder(
      listenable: stats,
      builder: (context, _) {
        final now = DateTime.now();
        final n = stats.calc.completedInMonth(now.year, now.month);
        final text = n > 0 ? '기록됨 · 이번 달 $n번째' : '기록됨';
        return Text(
          text,
          key: const ValueKey('finished-recorded'),
          style: theme.textTheme.titleMedium?.copyWith(color: scheme.primary),
          textAlign: TextAlign.center,
        );
      },
    );
  }

  Widget _buildFinished(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final services = AppServicesScope.maybeOf(context);
    // 기록은 이 화면이 세션 주인일 때만 남는다(성당 기도 카드가 연 화면은 카드가 기록).
    final recorded = services != null && _tracking != null;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 112,
                  height: 112,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: scheme.secondaryContainer,
                    border: Border.all(
                      color: scheme.secondary.withValues(alpha: 0.4),
                      width: 1.5,
                    ),
                  ),
                  child: Icon(
                    Icons.check_rounded,
                    size: 64,
                    color: scheme.secondary,
                  ),
                ),
              ),
              const SizedBox(height: 28),
              Text(
                '묵주기도를 마쳤습니다',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 10),
              Text(
                widget.mysterySet.koreanName,
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              if (recorded) ...[
                const SizedBox(height: AppSpace.sm),
                _buildRecordedLine(context, services.stats),
              ],
              const SizedBox(height: 32),
              if (services != null) ...[
                FilledButton(
                  key: const ValueKey('finished-open-stats'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(64, 56),
                  ),
                  onPressed: () => _openStats(services),
                  child: const Text('기록 보기'),
                ),
                const SizedBox(height: 12),
              ],
              FilledButton.tonal(
                key: const ValueKey('finished-close'),
                style: FilledButton.styleFrom(minimumSize: const Size(64, 56)),
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('닫기'),
              ),
              const SizedBox(height: 12),
              TextButton(
                style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
                onPressed: _restartPrayer,
                child: const Text('다시 기도하기'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 화면 높이의 약 22%(120..190). 본문 칸을 넓게 쓰도록 작게 두고, 탭하면 크게 펼친다.
  double _mapHeight(BuildContext context) {
    final screen = MediaQuery.sizeOf(context).height;
    final min = math.min(120.0, screen * 0.3);
    return (screen * 0.22).clamp(min, 190.0);
  }

  Widget _buildPrayer(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final wide =
        windowClassOf(context).isWide || size.width > size.height * 1.1;
    if (wide) return _buildWide(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        final minH = _mapHeight(context);
        // 펼쳤을 때: 버튼·손잡이를 빼고도 본문이 최소한 보이도록 남긴다.
        final maxH = math.max(
          minH,
          math.min(constraints.maxHeight * 0.72, constraints.maxHeight - 260),
        );
        return _buildPrayerBody(context, minH, maxH);
      },
    );
  }

  /// 탭하면 다음으로 넘어가는 기도문 영역. 스텝이 바뀌면 짧게 페이드인하고 맨 위에서 시작한다.
  Widget _buildStepText(BuildContext context) {
    final step = _session.current;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final scale = _settings.prayerTextScale;
    final reduce = MediaQuery.disableAnimationsOf(context);
    final titleStyle = theme.textTheme.titleSmall;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: _session.next,
      child: TweenAnimationBuilder<double>(
        key: ValueKey(_session.index),
        tween: Tween(begin: 0.25, end: 1),
        duration: reduce ? Duration.zero : const Duration(milliseconds: 160),
        curve: Curves.easeOut,
        builder: (context, value, child) =>
            Opacity(opacity: value, child: child),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 20),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: SizedBox(
                width: double.infinity,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_voice?.isSpeaking.value ?? false)
                      const _LeaderPlayingBadge(),
                    if (step.heading != null)
                      _HeadingCard(heading: step.heading!, scale: scale),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(2, 4, 2, 10),
                      child: Text(
                        step.title,
                        style: titleStyle?.copyWith(
                          fontSize: (titleStyle.fontSize ?? 14) * scale,
                          color: scheme.secondary,
                          letterSpacing: 1,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    _PrayerText(
                      step: step,
                      mode: _settings.prayerMode,
                      font: _settings.prayerFont,
                      scale: scale,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavButtons(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Expanded(
          flex: 2,
          child: FilledButton.tonal(
            style: FilledButton.styleFrom(
              minimumSize: const Size(64, 56),
              textStyle: theme.textTheme.titleMedium,
            ),
            onPressed: _session.index == 0 ? null : _session.back,
            child: const Text('이전'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          flex: 3,
          child: FilledButton(
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(56),
              textStyle: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            onPressed: _session.next,
            child: const Text('다음'),
          ),
        ),
      ],
    );
  }

  /// 넓은 화면: 왼쪽에 기도문, 오른쪽에 항상 큰 묵주 지도와 버튼.
  Widget _buildWide(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final step = _session.current;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(flex: 5, child: _buildStepText(context)),
        Expanded(
          flex: 4,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(0, 8, 16, 16),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: scheme.surface,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: scheme.outlineVariant),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text(
                      RosaryMap.labelFor(step),
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: scheme.secondary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: RosaryMap(
                        step: step,
                        style: _settings.rosaryStyle,
                        showLabel: false,
                        onStep: _scrubStep,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildNavButtons(context),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPrayerBody(BuildContext context, double minH, double maxH) {
    final step = _session.current;
    final scheme = Theme.of(context).colorScheme;
    final dragging = _mapDragHeight != null;
    final mapH = (_mapDragHeight ?? (_mapExpanded ? maxH : minH)).clamp(
      minH,
      maxH,
    );

    void dragStart(DragStartDetails _) => setState(() => _mapDragHeight = mapH);
    void dragUpdate(DragUpdateDetails d) => setState(
      () => _mapDragHeight = ((_mapDragHeight ?? mapH) - d.delta.dy).clamp(
        minH,
        maxH,
      ),
    );
    void dragEnd(DragEndDetails d) {
      final h = _mapDragHeight ?? mapH;
      final v = d.primaryVelocity ?? 0;
      setState(() {
        // 빠르게 위로 끌면 펼치고, 아래로 끌면 접는다. 느리면 가까운 쪽으로.
        _mapExpanded = v < -300
            ? true
            : (v > 300 ? false : h > (minH + maxH) / 2);
        _mapDragHeight = null;
      });
    }

    return Column(
      children: [
        Expanded(child: _buildStepText(context)),
        _ControlBar(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 손잡이 띠를 위아래로 끌면 묵주 패널 크기가 따라서 커지고 작아진다.
              // (지도 위에서 끄는 동작은 구슬 넘기기이므로 크기 조절은 이 띠만 맡는다.)
              GestureDetector(
                key: const ValueKey('mapHandle'),
                behavior: HitTestBehavior.opaque,
                onVerticalDragStart: dragStart,
                onVerticalDragUpdate: dragUpdate,
                onVerticalDragEnd: dragEnd,
                child: Semantics(
                  label: '묵주 크기 조절',
                  child: SizedBox(
                    height: 36,
                    width: double.infinity,
                    child: Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: scheme.outline,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              AnimatedContainer(
                duration: dragging
                    ? Duration.zero
                    : const Duration(milliseconds: 220),
                curve: Curves.easeOutCubic,
                height: mapH,
                width: double.infinity,
                child: RosaryMap(
                  step: step,
                  style: _settings.rosaryStyle,
                  onTap: () => setState(() => _mapExpanded = !_mapExpanded),
                  onStep: _scrubStep,
                ),
              ),
              const SizedBox(height: 10),
              _buildNavButtons(context),
            ],
          ),
        ),
      ],
    );
  }
}

/// 아래쪽 컨트롤 영역: 윗부분만 둥근 크림색 판.
class _ControlBar extends StatelessWidget {
  const _ControlBar({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(
          top: BorderSide(color: scheme.outlineVariant),
          left: BorderSide(color: scheme.outlineVariant),
          right: BorderSide(color: scheme.outlineVariant),
        ),
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
            child: child,
          ),
        ),
      ),
    );
  }
}

class _LeaderPlayingBadge extends StatelessWidget {
  const _LeaderPlayingBadge();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Pill(
          label: '선창 재생 중',
          icon: Icons.volume_up,
          background: scheme.tertiaryContainer,
          foreground: scheme.onTertiaryContainer,
        ),
      ),
    );
  }
}

class _HeadingCard extends StatelessWidget {
  const _HeadingCard({required this.heading, required this.scale});

  final String heading;
  final double scale;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final lines = heading.split('\n');
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: SoftCard(
        color: scheme.secondaryContainer,
        borderColor: Colors.transparent,
        padding: const EdgeInsets.all(18),
        child: SizedBox(
          width: double.infinity,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                lines.first,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontSize:
                      (theme.textTheme.titleMedium?.fontSize ?? 16) * scale,
                  color: scheme.onSecondaryContainer,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (lines.length > 1) ...[
                const SizedBox(height: 6),
                Text(
                  lines.skip(1).join('\n'),
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontSize:
                        (theme.textTheme.bodyLarge?.fontSize ?? 16) * scale,
                    color: scheme.onSecondaryContainer,
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
  const _PrayerText({
    required this.step,
    required this.mode,
    required this.font,
    required this.scale,
  });

  final RosaryStep step;
  final PrayerMode mode;
  final PrayerFont font;

  /// 기도문 글자 크기 배율(설정).
  final double scale;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final onSurface = scheme.onSurface;
    final dim = onSurface.withValues(alpha: 0.45);
    final split = step.responderText.isNotEmpty;
    final big = (font == PrayerFont.serif ? 25.0 : 24.0) * scale;
    final small = big - 6 * scale;

    TextStyle style(double size, Color color, {bool bold = false}) =>
        AppTheme.prayerStyle(
          context,
          font,
          size: size,
          color: color,
          bold: bold,
        );

    if (mode == PrayerMode.solo) {
      return Text(step.text, style: style(big, onSurface));
    }

    // 나뉘지 않는 기도(성호경 등)는 모두 함께 바친다.
    if (!split) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _RoleLabel(text: '모두 함께'),
          Text(step.text, style: style(big, onSurface, bold: true)),
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
              ? style(big, onSurface, bold: true)
              : style(small, dim),
        ),
        Text(
          step.responderText,
          style: leaderMine
              ? style(small, dim)
              : style(big, onSurface, bold: true),
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
      padding: const EdgeInsets.only(bottom: 10),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Pill(
          label: text,
          dense: true,
          background: scheme.secondaryContainer,
          foreground: scheme.onSecondaryContainer,
        ),
      ),
    );
  }
}
