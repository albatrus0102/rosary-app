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
import 'widgets/prayer_actions.dart';
import 'widgets/prayer_bead_strip.dart';
import 'widgets/prayer_text_view.dart';
import 'widgets/rosary_map.dart';
import 'widgets/rosary_map_sheet.dart';

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

  // 묵주 전체 보기를 연 단추(띠, ⋮). 시트를 닫으면 포커스를 돌려준다.
  final FocusNode _stripFocus = FocusNode(debugLabel: 'prayer-strip');
  final FocusNode _menuFocus = FocusNode(debugLabel: 'prayer-menu');

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
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeSuggestShort());
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
    _closeSnack();
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
    _stripFocus.dispose();
    _menuFocus.dispose();
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

  /// 머리줄 부제: 이번 단의 신비 묵상 문구('…을 묵상합시다.'를 뺀 것). 서두·마침에는 없다.
  String? _subtitle(RosaryStep step) {
    final decade = step.decade;
    if (decade == null || step.kind == StepKind.closing) return null;
    final text = widget.mysterySet.mysteries[decade - 1].meditation;
    return text.replaceFirst(RegExp(r'[을를] 묵상합시다\.$'), '');
  }

  /// 기도문에 적용할 글자 배율: 앱 설정과 시스템 배율 중 큰 쪽(둘을 곱하지 않는다).
  double _prayerScale(BuildContext context) {
    final system = MediaQuery.textScalerOf(context).scale(24) / 24;
    return math
        .max(_settings.prayerTextScale, system)
        .clamp(AppSettings.minTextScale, AppSettings.maxTextScale)
        .toDouble();
  }

  /// 기도문 글자 크기를 바로 바꿔 볼 수 있는 시트.
  Future<void> _showTextSizeSheet(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) => SafeArea(
        top: false,
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
                      child: MediaQuery.withNoTextScaling(
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
                  SwitchListTile(
                    key: const ValueKey('sheet-short-prayers'),
                    contentPadding: EdgeInsets.zero,
                    title: const Text('외운 기도 짧게 보기'),
                    subtitle: const Text(
                      '성모송 같은 반복 기도를 첫머리만 보여 줍니다. '
                      '성호경·사도신경·신비 안내·영광송은 늘 전문입니다',
                    ),
                    value: _settings.shortPrayers,
                    onChanged: (v) {
                      _settings.shortPrayers = v;
                      Track.setting('short_prayers');
                    },
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
    if (mounted) _maybeSuggestShort();
  }

  /// 글자가 아주 클 때(배율 1.6 이상) '외운 기도 짧게 보기'를 딱 한 번 권한다.
  /// 보여 주는 순간 '물어봄'으로 기록해 다시는 띄우지 않는다.
  void _maybeSuggestShort() {
    if (!mounted || _session.isFinished) return;
    if (_settings.shortPrayersAsked || _settings.shortPrayers) return;
    if (_prayerScale(context) < shortSuggestScale) return;
    _settings.markShortPrayersAsked();
    final scheme = Theme.of(context).colorScheme;
    final wide = _isWide(context);
    final bottom = wide
        ? 16.0
        : PrayerActions.height + MediaQuery.paddingOf(context).bottom + 8;
    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) return;
    final snack = messenger.showSnackBar(
      SnackBar(
        key: const ValueKey('short-suggest'),
        behavior: SnackBarBehavior.floating,
        margin: EdgeInsets.fromLTRB(16, 0, 16, bottom),
        duration: const Duration(seconds: 15),
        content: MediaQuery.withClampedTextScaling(
          maxScaleFactor: 1.3,
          child: Row(
            children: [
              const Expanded(child: Text('외운 기도는 첫머리만 보여 드릴까요?')),
              TextButton(
                onPressed: _closeSnack,
                style: TextButton.styleFrom(
                  foregroundColor: scheme.onInverseSurface,
                  minimumSize: const Size(48, 48),
                ),
                child: const Text('그대로'),
              ),
            ],
          ),
        ),
        action: SnackBarAction(
          label: '켜기',
          onPressed: () {
            _settings.shortPrayers = true;
            Track.setting('short_prayers');
          },
        ),
      ),
    );
    _snack = snack;
    unawaited(
      snack.closed.then((_) {
        if (identical(_snack, snack)) _snack = null;
      }),
    );
  }

  /// 이 글자 배율 이상이면 짧게 보기를 권한다.
  static const double shortSuggestScale = 1.6;

  ScaffoldFeatureController<SnackBar, SnackBarClosedReason>? _snack;

  void _closeSnack() {
    final snack = _snack;
    _snack = null;
    if (snack == null) return;
    try {
      snack.close();
    } catch (_) {
      // 이미 닫혔거나 화면과 함께 정리되는 중이다.
    }
  }

  bool _isWide(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    return windowClassOf(context).isWide || size.width > size.height * 1.1;
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([_session, _settings]),
      builder: (context, _) {
        final finished = _session.isFinished;
        return PopScope(
          canPop: finished,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) _confirmExit();
          },
          child: Scaffold(
            body: SafeArea(
              child: finished
                  ? Column(
                      children: [
                        _clampChrome(
                          _PrayerHeader(
                            title: widget.mysterySet.koreanName,
                            onBack: () => Navigator.of(context).maybePop(),
                          ),
                        ),
                        Expanded(child: _buildFinished(context)),
                      ],
                    )
                  : _buildPrayer(context),
            ),
          ),
        );
      },
    );
  }

  /// 틀(머리·띠·버튼)은 시스템 글자 배율을 1.3까지만 따른다. 기도문은 따로 [_prayerScale].
  Widget _clampChrome(Widget child) =>
      MediaQuery.withClampedTextScaling(maxScaleFactor: 1.3, child: child);

  /// 지도를 손가락으로 끌어 구슬을 한 칸씩 넘긴다(넓은 화면의 지도). 끌다가 기도가 끝나 버리지 않도록
  /// 마지막 스텝에서는 앞으로 넘기지 않는다(마치려면 '기도 마치기' 버튼).
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

  /// 묵주 전체 보기를 연다. 닫히면 포커스가 [opener](연 단추)로 돌아온다.
  void _openMap([FocusNode? opener]) {
    unawaited(
      showRosaryMapSheet(
        context,
        session: _session,
        style: _settings.rosaryStyle,
        restoreFocus: opener ?? _stripFocus,
      ),
    );
  }

  void _onMenu(_PrayerMenu item) {
    switch (item) {
      case _PrayerMenu.map:
        _openMap(_menuFocus);
      case _PrayerMenu.shortPrayers:
        _settings.shortPrayers = !_settings.shortPrayers;
        Track.setting('short_prayers');
      case _PrayerMenu.end:
        unawaited(_confirmExit());
    }
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
                    // M3: 컨테이너 위 아이콘은 짝 역할(onSecondaryContainer), 임의 투명 테두리 없음.
                    color: scheme.secondaryContainer,
                  ),
                  child: Icon(
                    Icons.check_rounded,
                    size: 64,
                    color: scheme.onSecondaryContainer,
                  ),
                ),
              ),
              const SizedBox(height: AppSpace.md),
              Text(
                '묵주기도를 마쳤습니다',
                style: theme.textTheme.headlineSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpace.xs),
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
              const SizedBox(height: AppSpace.lg),
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

  Widget _buildPrayer(BuildContext context) {
    final step = _session.current;
    final wide = _isWide(context);
    final scale = _prayerScale(context);
    final text = PrayerTextView(
      step: step,
      stepIndex: _session.index,
      mode: _settings.prayerMode,
      font: _settings.prayerFont,
      scale: scale,
      short: _settings.shortPrayers,
      leaderSpeaking: _voice?.isSpeaking.value ?? false,
      onAdvance: _session.next,
    );
    // 마지막 기도에서는 큰 단추가 기도를 마친다.
    final nextLabel = _session.index == _session.steps.length - 1
        ? PrayerActions.finishLabel
        : PrayerActions.defaultNextLabel;
    final actions = PrayerActions(
      canGoBack: _session.index > 0,
      onBack: _session.back,
      onNext: _session.next,
      nextLabel: nextLabel,
    );

    final header = _PrayerHeader(
      title: _appBarTitle(step),
      subtitle: _subtitle(step),
      onBack: () => Navigator.of(context).maybePop(),
      onTextSize: () => _showTextSizeSheet(context),
      menuBuilder: (context) => [
        const PopupMenuItem(value: _PrayerMenu.map, child: Text('묵주 전체 보기')),
        CheckedPopupMenuItem(
          value: _PrayerMenu.shortPrayers,
          checked: _settings.shortPrayers,
          child: const Text('외운 기도 짧게 보기'),
        ),
        const PopupMenuItem(value: _PrayerMenu.end, child: Text('기도 끝내기')),
      ],
      onMenu: _onMenu,
      menuFocusNode: _menuFocus,
    );

    if (!wide) {
      return _clampChrome(
        Column(
          children: [
            header,
            PrayerBeadStrip(
              step: step,
              onOpenMap: _openMap,
              focusNode: _stripFocus,
            ),
            Expanded(child: text),
            actions,
          ],
        ),
      );
    }

    // 넓은 화면(태블릿·가로): 왼쪽 기도문, 오른쪽 띠 + 큰 묵주 지도 + 버튼.
    final scheme = Theme.of(context).colorScheme;
    return _clampChrome(
      Column(
        children: [
          header,
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(flex: 5, child: text),
                Expanded(
                  flex: 4,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(0, 8, 16, 8),
                    child: Column(
                      children: [
                        Expanded(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: scheme.surfaceContainerLow,
                              borderRadius: AppShape.extraLarge,
                            ),
                            child: Column(
                              children: [
                                Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: PrayerBeadStrip(step: step),
                                ),
                                Expanded(
                                  child: Padding(
                                    padding: const EdgeInsets.fromLTRB(
                                      12,
                                      8,
                                      12,
                                      12,
                                    ),
                                    child: RosaryMap(
                                      step: step,
                                      style: _settings.rosaryStyle,
                                      showLabel: false,
                                      onStep: _scrubStep,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        PrayerActions(
                          canGoBack: _session.index > 0,
                          onBack: _session.back,
                          onNext: _session.next,
                          nextLabel: nextLabel,
                          bordered: false,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

enum _PrayerMenu { map, shortPrayers, end }

/// 고정 48dp 머리줄: 뒤로, 제목(+부제), 글자 크기, ⋮.
class _PrayerHeader extends StatelessWidget {
  const _PrayerHeader({
    required this.title,
    required this.onBack,
    this.subtitle,
    this.onTextSize,
    this.menuBuilder,
    this.onMenu,
    this.menuFocusNode,
  });

  final String title;
  final String? subtitle;
  final VoidCallback onBack;
  final VoidCallback? onTextSize;
  final List<PopupMenuEntry<_PrayerMenu>> Function(BuildContext)? menuBuilder;
  final ValueChanged<_PrayerMenu>? onMenu;
  final FocusNode? menuFocusNode;

  static const double height = 48;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    // 글자가 1.15배를 넘으면 48dp에 두 줄이 들어가지 않으므로 부제를 뺀다.
    final showSubtitle =
        subtitle != null && MediaQuery.textScalerOf(context).scale(12) <= 14;
    return SizedBox(
      key: const ValueKey('prayer-header'),
      height: height,
      child: Row(
        children: [
          // AppBar와 같은 BackButton(48dp). 누르면 Navigator.maybePop → PopScope.
          BackButton(
            key: const ValueKey('prayer-header-back'),
            onPressed: onBack,
          ),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (showSubtitle)
                  Text(
                    subtitle!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
              ],
            ),
          ),
          if (onTextSize != null)
            IconButton(
              key: const ValueKey('prayer-text-size'),
              tooltip: '글자 크기',
              icon: const Icon(Icons.text_fields),
              onPressed: onTextSize,
            ),
          if (menuBuilder != null)
            // 묵주 전체 보기를 메뉴에서 열었다 닫으면 포커스가 이 단추로 돌아온다.
            Focus(
              focusNode: menuFocusNode,
              skipTraversal: true,
              child: PopupMenuButton<_PrayerMenu>(
                key: const ValueKey('prayer-menu'),
                tooltip: '메뉴',
                icon: const Icon(Icons.more_vert),
                onSelected: onMenu,
                itemBuilder: menuBuilder!,
              ),
            ),
          if (onTextSize == null && menuBuilder == null)
            const SizedBox(width: 48),
        ],
      ),
    );
  }
}
