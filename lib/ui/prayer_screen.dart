import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../app/app_services.dart';
import '../app/bundled_leader_voice.dart';
import '../app/release_gate.dart';
import '../app/leader_audio_store.dart';
import '../app/leader_voice.dart';
import '../app/prayer_music.dart';
import '../app/prayer_tracking.dart';
import '../app/settings.dart';
import '../app/sound_player.dart';
import '../app/theme.dart';
import '../app/track.dart';
import '../app/window_class.dart';
import '../domain/mystery_art.dart';
import '../domain/prayer_data.dart';
import '../domain/prayer_mode.dart';
import '../domain/rosary_sequence.dart';
import '../domain/rosary_session.dart';
import '../rosary3d/rosary_feedback.dart';
import '../rosary3d/rosary_gallery_screen.dart';
import '../rosary3d/rosary_model.dart';
import '../rosary3d/rosary_prayer_view.dart';
import '../rosary3d/rosary_scene.dart';
import '../stats/prayer_stats_store.dart';
import '../stats/stats_screen.dart';
import 'prayer_music_sheet.dart';
import 'widgets/prayer_actions.dart';
import 'widgets/prayer_background.dart';
import 'widgets/prayer_bead_strip.dart';
import 'widgets/coach_tour.dart';
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
    this.rosaryScene,
    this.rosaryFeedback,
    this.returnToChurch = false,
  });

  /// 사이버 성당에서 연 전체 화면 기도. 같은 세션이 성당 패널에서 이어지므로, 머리줄에
  /// '성당으로' 단추를 두고 뒤로 가기(시스템·제스처 포함)가 기도를 끝내지 않고 바로 성당으로 돌아간다.
  final bool returnToChurch;

  /// 묵주 화면(T-81) 3D 장면. 테스트용 주입, 없으면 화면이 만든다.
  final RosaryScene? rosaryScene;

  /// 묵주 화면 촉각·소리. 테스트용 주입, 없으면 기기 것을 쓴다.
  final RosaryFeedbackSink? rosaryFeedback;

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

class _PrayerScreenState extends State<PrayerScreen>
    with WidgetsBindingObserver {
  late final RosarySession _session;
  late final bool _ownsSession;
  late final SoundPlayer _sound;
  late final bool _ownsSound;
  StreamSubscription<SessionEvent>? _eventSub;

  /// 기도 기록·분석. 세션의 주인(이 화면이 세션을 만든 경우)만 만든다. 성당 기도 카드가
  /// 연 전체 화면 기도는 카드 쪽 컨트롤러가 이미 기록하므로 여기서는 만들지 않는다.
  PrayerTracking? _tracking;

  // 앱이 들려주는 상대 목소리: 후창 모드에서는 앞단(스텝에 들어갈 때 자동),
  // 선창 모드에서는 뒷단(사용자가 앞단을 마치고 넘길 때, 끝나면 자동으로 다음 스텝).
  LeaderVoice? _voice;
  LeaderAudioStore? _ownedStore;
  bool _ownsVoice = false;
  int _lastIndex = 0;
  bool _disposed = false;

  /// 선창 모드: 뒷단을 재생 중인지. true인 동안 화면은 '뒷단 듣는 중…'을 보인다.
  bool _responding = false;

  /// 뒷단 재생 시도의 번호. 취소·스텝 변경·화면 정리 때 올려서, 늦게 도착한 이전 재생의
  /// 완료가 새 스텝을 넘기지 못하게 한다.
  int _respGen = 0;

  // 묵주 전체 보기를 연 단추(띠, ⋮). 시트를 닫으면 포커스를 돌려준다.
  final FocusNode _stripFocus = FocusNode(debugLabel: 'prayer-strip');
  final FocusNode _menuFocus = FocusNode(debugLabel: 'prayer-menu');

  /// 후창 모드: 스텝에 들어갈 때 앞단을 들려준다.
  bool get _leaderAudioActive =>
      _settings.prayerMode == PrayerMode.responder &&
      _settings.leaderAudioEnabled;

  /// 선창 모드: 사용자가 넘길 때 뒷단을 받아 준다.
  bool get _responderAudioActive =>
      _settings.prayerMode == PrayerMode.leader && _settings.leaderAudioEnabled;

  bool _speaksResponder = false;

  /// 음성 인도 설정(모드·켜짐)이 바뀌면 화면 안에서 목소리를 다시 꾸린다(묵주 화면의 음성 칩).
  (PrayerMode, bool)? _voiceKey;

  /// 음성 제목 → 앞단 음성 잇기의 차례 번호(스텝이 또 바뀌면 이전 것은 버린다).
  int _titleGen = 0;

  /// 묵주 화면(손안의 묵주)으로 그리는지. 화면을 여는 순간의 설정으로 정한다.
  late final bool _rosaryMode;
  RosaryScene? _scene;
  RosaryFeedbackSink? _fb;
  int _fbLast = 0;

  AppSettings get _settings => widget.settings;

  // 첫 사용 안내(코치 마크): 처음 열 때 한 번, 메뉴 '사용법 보기'로 다시. 떠 있는 동안 뒤로 가기는 안내부터 닫는다.
  bool _tourOpen = false;
  int _tourRun = 0;
  final GlobalKey _tourAreaKey = GlobalKey(debugLabel: 'tour-area');
  final GlobalKey _tourTextKey = GlobalKey(debugLabel: 'tour-text');
  final GlobalKey _tourTextToggleKey = GlobalKey(
    debugLabel: 'tour-text-toggle',
  );
  final GlobalKey _tourFullKey = GlobalKey(debugLabel: 'tour-full');
  final GlobalKey _tourSizeKey = GlobalKey(debugLabel: 'tour-size');
  final GlobalKey _tourMenuKey = GlobalKey(debugLabel: 'tour-menu');

  /// 배경 성가(기본 꺼짐). 이 화면이 열려 있는 동안 붙잡고, 목소리가 나올 때는 낮춘다.
  late final PrayerMusic _music = PrayerMusic.of(_settings);
  MusicHold? _musicHold;

  @override
  void initState() {
    super.initState();
    _musicHold = _music.hold('prayer');
    _ownsSession = widget.session == null;
    _session =
        widget.session ?? RosarySession(buildRosarySequence(widget.mysterySet));
    _tourOpen = !_settings.prayerScreenTourDone && !_session.isFinished;
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

    _rosaryMode = _settings.prayerView == PrayerView.rosary;
    if (_rosaryMode) {
      final scene = _scene = widget.rosaryScene ?? RosaryScene.create();
      scene.state
        ..['rosary'] = _settings.rosaryId
        ..['step'] = _session.index
        ..['theme'] = _settings.rosaryBackdrop.name
        ..['hand'] = _settings.rosaryHand.name
        // 저사양: 성당 화질을 '간단'으로 둔 기기는 묵주도 가볍게(픽셀 비율·그림자·텍스처 낮춤).
        ..['quality'] = _settings.churchQuality == ChurchQuality.low
            ? 'low'
            : 'high';
      scene.setStep(_session.index, animate: false);
      _fb = widget.rosaryFeedback ?? (DeviceRosaryFeedback()..preload());
      _fbLast = _session.index;
      _session.addListener(_onRosaryStep);
      _settings.addListener(_onRosarySettings);
    }
    _eventSub = _session.events.listen(_onSessionEvent);
    _session.addListener(_onProgress);
    HardwareKeyboard.instance.addHandler(_onKey);
    WidgetsBinding.instance.addObserver(this);

    _speaksResponder = _responderAudioActive;
    _voiceKey = (_settings.prayerMode, _settings.leaderAudioEnabled);
    if (_leaderAudioActive || _speaksResponder) {
      _setUpLeaderVoice();
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeSuggestShort());
  }

  void _setUpLeaderVoice() {
    var voice = widget.leaderVoice;
    if (voice == null) {
      _ownsVoice = true;
      // 직접 녹음은 앞단뿐이라, 선창 모드의 뒷단은 AI 음성(없는 부분은 기기 음성)으로 들려준다.
      // 검수용(출시) 빌드는 AI 음성을 쓰지 않으므로 기기 음성이 읽는다(ReleaseGate.aiVoiceClips).
      final source =
          _speaksResponder &&
              _settings.leaderVoiceSource == LeaderVoiceSource.recorded
          ? (ReleaseGate.aiVoiceClips
                ? LeaderVoiceSource.bundled
                : LeaderVoiceSource.tts)
          : _settings.leaderVoiceSource;
      voice = switch (source) {
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
    // 선창 모드는 스텝에 들어갈 때 아무것도 들려주지 않는다(사용자가 앞단을 한다).
    if (!_speaksResponder) unawaited(_startLeaderVoice(voice));
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

  /// 묵주 화면: 스텝이 바뀌면 3D 를 옮기고, 한 칸 이동이면 요구서 표대로 진동·소리·음성 제목을 낸다.
  void _onRosaryStep() {
    final scene = _scene;
    if (scene == null || _session.isFinished) return;
    final now = _session.index, before = _fbLast;
    if (now == before) return;
    _fbLast = now;
    scene.setStep(now, animate: !MediaQuery.disableAnimationsOf(context));
    final fb = _fb;
    if (fb == null) return;
    // 후창 모드(앱이 앞단을 들려줌)에서는 제목 안내를 _onSessionChanged 가 앞단 앞에 잇는다(겹치지 않게).
    playRosaryStepCue(
      fb,
      _session,
      _settings,
      before,
      now,
      voiceBusy: _voice != null && !_speaksResponder,
    );
  }

  /// 묵주 화면에서 음성 인도(끔·선창·후창)를 바꾸면 목소리를 다시 꾸린다. 진행 위치는 그대로.
  void _maybeReconfigureVoice() {
    final key = (_settings.prayerMode, _settings.leaderAudioEnabled);
    if (key == _voiceKey) return;
    _voiceKey = key;
    _cancelResponder();
    final old = _voice;
    if (old != null) {
      old.isSpeaking.removeListener(_onSpeakingChanged);
      _music.setSpeaking(this, false);
      _session.removeListener(_onSessionChanged);
      if (_ownsVoice) {
        unawaited(old.dispose());
      } else {
        unawaited(old.stop());
      }
      _voice = null;
      _ownsVoice = false;
    }
    _speaksResponder = _responderAudioActive;
    if (_leaderAudioActive || _speaksResponder) _setUpLeaderVoice();
    if (mounted) setState(() {});
  }

  void _onRosarySettings() {
    _maybeReconfigureVoice();
    final scene = _scene;
    if (scene == null) return;
    scene
      ..setRosary(_settings.rosaryId)
      ..setTheme(_settings.rosaryBackdrop.name)
      ..setHand(_settings.rosaryHand.name);
  }

  void _toggleFullView() {
    final scene = _scene;
    if (scene == null) return;
    scene.setFullView(!scene.fullView);
  }

  /// 기도 중 묵주 바꾸기(⋮ · 묵주 길게 누르기): 갤러리에서 고르면 진행 위치는 그대로, 3D 묵주만 바뀐다.
  void _openGallery() {
    unawaited(
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          settings: const RouteSettings(name: 'rosary_gallery'),
          builder: (_) => RosaryGalleryScreen(settings: _settings),
        ),
      ),
    );
  }

  void _onSpeakingChanged() {
    _music.setSpeaking(this, _voice?.isSpeaking.value ?? false);
    if (mounted) setState(() {});
  }

  void _onSessionChanged() {
    // 탭/이전/다음/스와이프 어느 쪽으로든 스텝이 바뀌면 현재 말을 끊고 새 스텝을 말한다.
    final voice = _voice;
    if (voice == null) return;
    if (_session.isFinished) {
      _cancelResponder();
      unawaited(voice.stop());
      return;
    }
    if (_session.index == _lastIndex) return;
    _lastIndex = _session.index;
    if (_speaksResponder) {
      // 뒷단을 듣는 중에 이전/지도 등으로 스텝이 바뀌면 재생을 멈추고 넘기지 않는다.
      _cancelResponder();
      return;
    }
    final fb = _fb;
    final idx = _session.index;
    if (_rosaryMode && _settings.rosaryVoiceTitle && fb != null) {
      // 음성 제목('성모송 열 번째입니다') → 앞단 음성 순서로 잇는다.
      final gen = ++_titleGen;
      unawaited(voice.stop());
      unawaited(
        _music
            .duckWhile(fb.announce(rosaryVoiceTitle(_session.current)))
            .then((_) async {
              if (gen != _titleGen || _disposed || _session.index != idx) {
                return;
              }
              await voice.speakStep(_session.current);
            })
            .catchError((Object e) {
              debugPrint('leader voice failed: $e');
            }),
      );
      return;
    }
    unawaited(
      voice.speakStep(_session.current).catchError((Object e) {
        debugPrint('leader voice failed: $e');
      }),
    );
  }

  /// 큰 '다음 구슬' 단추·글 탭·볼륨 키가 부르는 '다음으로'.
  ///
  /// 선창 모드(목소리 켜짐)에서는 뒷단이 있는 스텝이면 앱이 뒷단을 먼저 들려주고, 끝나면
  /// 자동으로 다음 스텝으로 넘어간다. 재생 중에 다시 부르면 재생을 멈추고 바로 넘어간다.
  /// 뒷단이 없는 스텝(성호경·마침)이나 목소리를 끈 경우는 곧바로 넘어간다.
  void _advance() {
    if (_responding) {
      _cancelResponder();
      _session.next();
      return;
    }
    final voice = _voice;
    if (!_speaksResponder ||
        voice == null ||
        _session.isFinished ||
        _session.current.responderCueId == null) {
      _session.next();
      return;
    }
    unawaited(_playResponderThenNext(voice));
  }

  Future<void> _playResponderThenNext(LeaderVoice voice) async {
    final gen = ++_respGen;
    final index = _session.index;
    final step = _session.current;
    setState(() => _responding = true);
    try {
      await voice.init();
      if (gen != _respGen || _disposed) return;
      await voice.speakResponder(step);
    } catch (e) {
      debugPrint('responder voice failed: $e');
    }
    // 그 사이 취소·스텝 변경·화면 정리가 있었으면 넘기지 않는다(늦은 완료 신호 무시).
    if (gen != _respGen || _disposed || _session.index != index) return;
    _respGen++;
    if (mounted) setState(() => _responding = false);
    _session.next();
  }

  /// 뒷단 재생을 멈추고 자동 넘김을 취소한다. 재생 중이 아니면 아무 일도 하지 않는다.
  void _cancelResponder() {
    if (!_responding) return;
    _respGen++;
    _responding = false;
    if (mounted && !_disposed) setState(() {});
    final voice = _voice;
    if (voice != null) unawaited(voice.stop());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // 앱이 뒤로 가면(화면 꺼짐 포함) 뒷단 재생을 멈추고 자동 넘김을 취소한다.
    if (state == AppLifecycleState.paused) _cancelResponder();
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
    if (_rosaryMode) return; // 묵주 화면은 _onRosaryStep 이 차등 진동·소리를 낸다(중복 없음).
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
        _advance();
      } else {
        _session.back();
      }
    }
    return true; // 누르고 있는 반복 입력도 삼켜 볼륨이 바뀌지 않게 한다.
  }

  @override
  void dispose() {
    _disposed = true;
    _respGen++;
    _closeSnack();
    WidgetsBinding.instance.removeObserver(this);
    HardwareKeyboard.instance.removeHandler(_onKey);
    _tracking?.dispose(); // 진행이 있으면 기록 1건을 남긴다. 세션 정리보다 먼저.
    _music.setSpeaking(this, false);
    _musicHold?.release();
    _session.removeListener(_onSessionChanged);
    _session.removeListener(_onProgress);
    if (_rosaryMode) {
      _session.removeListener(_onRosaryStep);
      _settings.removeListener(_onRosarySettings);
      if (widget.rosaryScene == null) _scene?.dispose();
      if (widget.rosaryFeedback == null) unawaited(_fb?.dispose());
    }
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
        final rosary = _rosaryMode && !finished;
        final page = PopScope(
          canPop: !_tourOpen && (finished || widget.returnToChurch),
          onPopInvokedWithResult: (didPop, _) {
            if (didPop) return;
            // 첫 사용 안내가 떠 있으면 뒤로 가기는 안내부터 닫는다.
            if (_tourOpen) {
              _closeTour(true);
            } else {
              _confirmExit();
            }
          },
          child: Scaffold(
            backgroundColor: rosary
                ? rosaryBackdropColor(_settings.rosaryBackdrop)
                : null,
            // 기도 배경 그림(설정 '기도 배경 그림', 기본 켬): 그 단의 성화를 낮은 대비로 맨 아래에 깐다.
            body: Stack(
              children: [
                Positioned.fill(
                  child: PrayerBackground(
                    enabled:
                        _settings.prayerBackground && !finished && !_rosaryMode,
                    art: visibleMysteryArtFor(
                      widget.mysterySet,
                      _session.current.decade,
                    ),
                    child: SafeArea(
                      child: finished
                          ? Column(
                              children: [
                                _clampChrome(
                                  _PrayerHeader(
                                    title: widget.mysterySet.koreanName,
                                    returnToChurch: widget.returnToChurch,
                                    onBack: () =>
                                        Navigator.of(context).maybePop(),
                                  ),
                                ),
                                Expanded(child: _buildFinished(context)),
                              ],
                            )
                          : _buildPrayer(context),
                    ),
                  ),
                ),
                if (_tourOpen && !finished)
                  Positioned.fill(
                    child: CoachTour(
                      key: ValueKey('prayer-tour-$_tourRun'),
                      steps: _tourSteps(),
                      onClose: _closeTour,
                    ),
                  ),
              ],
            ),
          ),
        );
        if (!rosary) return page;
        return Theme(
          data: rosaryTheme(_settings.rosaryBackdrop, _settings.prayerFont),
          child: page,
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

  /// 첫 사용 안내의 단계. 화면에 없는 위젯의 단계는 안내가 알아서 건너뛴다.
  List<CoachStep> _tourSteps() => [
    CoachStep(
      target: _tourAreaKey,
      text: '묵주를 아래로 내리면 다음 기도, 위로 올리면 이전 기도예요',
      showFinger: true,
    ),
    CoachStep(
      target: _tourTextKey,
      text: '지금 바칠 기도문이 여기 나와요',
      altTarget: _tourTextToggleKey,
      altText: '기도문 펼치기를 누르면 지금 바칠 기도문이 나와요',
    ),
    CoachStep(target: _tourFullKey, text: '묵주 전체를 보며 어디쯤인지 확인할 수 있어요'),
    CoachStep(target: _tourSizeKey, text: '기도문 글자 크기를 바꿀 수 있어요'),
    CoachStep(target: _tourMenuKey, text: '성가 듣기·선창 음성 설정은 여기 있어요'),
  ];

  /// 안내를 닫는다. 한 번이라도 보였으면(마침·건너뛰기·뒤로 가기) 다음부터 처음 안내는 나오지 않는다.
  void _closeTour(bool shown) {
    if (!_tourOpen) return;
    if (shown) _settings.prayerScreenTourDone = true;
    if (mounted) setState(() => _tourOpen = false);
  }

  /// 메뉴 '사용법 보기': 안내를 다시 열고 아래로 내리기 안내도 다시 보이게 한다.
  void _replayGuide() {
    _settings.resetBeadSwipeHint();
    setState(() {
      _tourRun++;
      _tourOpen = true;
    });
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
      case _PrayerMenu.gallery:
        _openGallery();
      case _PrayerMenu.music:
        togglePrayerMusic(context, _settings);
      case _PrayerMenu.musicOptions:
        unawaited(showPrayerMusicSheet(context, _settings));
      case _PrayerMenu.guide:
        _replayGuide();
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
          builder: (_) =>
              SettingsStatsScreen(store: services.stats, settings: _settings),
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
                child: Text(widget.returnToChurch ? '성당으로' : '닫기'),
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
      leaderSpeaking: !_speaksResponder && (_voice?.isSpeaking.value ?? false),
      responderPlaying: _responding,
      onAdvance: _advance,
    );
    // 마지막 기도에서는 큰 단추가 기도를 마친다.
    final nextLabel = _session.index == _session.steps.length - 1
        ? PrayerActions.finishLabel
        : PrayerActions.defaultNextLabel;
    final actions = PrayerActions(
      canGoBack: _session.index > 0,
      onBack: _session.back,
      onNext: _advance,
      nextLabel: nextLabel,
    );

    final header = _PrayerHeader(
      title: _appBarTitle(step),
      subtitle: _subtitle(step),
      returnToChurch: widget.returnToChurch,
      onBack: () => Navigator.of(context).maybePop(),
      onTextSize: () => _showTextSizeSheet(context),
      menuBuilder: (context) => [
        const PopupMenuItem(value: _PrayerMenu.map, child: Text('묵주 전체 보기')),
        if (_rosaryMode)
          const PopupMenuItem(
            value: _PrayerMenu.gallery,
            child: Text('묵주 바꾸기'),
          ),
        CheckedPopupMenuItem(
          value: _PrayerMenu.shortPrayers,
          checked: _settings.shortPrayers,
          child: const Text('외운 기도 짧게 보기'),
        ),
        CheckedPopupMenuItem(
          key: const ValueKey('prayer-menu-music'),
          value: _PrayerMenu.music,
          checked: _settings.prayerMusic,
          child: const Text('♪ 성가 듣기'),
        ),
        const PopupMenuItem(
          key: ValueKey('prayer-menu-music-options'),
          value: _PrayerMenu.musicOptions,
          child: Text('성가 고르기 · 음량'),
        ),
        const PopupMenuItem(
          key: ValueKey('prayer-menu-guide'),
          value: _PrayerMenu.guide,
          child: Text('사용법 보기'),
        ),
        const PopupMenuItem(value: _PrayerMenu.end, child: Text('기도 끝내기')),
      ],
      onMenu: _onMenu,
      textSizeKey: _tourSizeKey,
      menuKey: _tourMenuKey,
      menuFocusNode: _menuFocus,
      extra: _scene == null
          ? null
          : KeyedSubtree(
              key: _tourFullKey,
              child: IconButton(
                key: const ValueKey('rosary-full-toggle'),
                tooltip: _scene!.fullView ? '손안의 묵주로' : '전체 묵주 보기',
                isSelected: _scene!.fullView,
                icon: const Icon(Icons.radio_button_checked_outlined),
                selectedIcon: const Icon(Icons.adjust),
                onPressed: _toggleFullView,
              ),
            ),
    );

    final scene = _scene;
    if (scene != null) {
      return _clampChrome(
        RosaryPrayerView(
          session: _session,
          settings: _settings,
          mysterySet: widget.mysterySet,
          scene: scene,
          header: ListenableBuilder(
            listenable: scene,
            builder: (_, _) => header,
          ),
          textView: KeyedSubtree(key: _tourTextKey, child: text),
          actions: actions,
          onNext: _advance,
          onBack: _session.back,
          onChangeRosary: _openGallery,
          areaKey: _tourAreaKey,
          textToggleKey: _tourTextToggleKey,
          showSwipeHint: !_tourOpen,
        ),
      );
    }

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
            Expanded(
              child: KeyedSubtree(key: _tourTextKey, child: text),
            ),
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
                Expanded(
                  flex: 5,
                  child: KeyedSubtree(key: _tourTextKey, child: text),
                ),
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
                          onNext: _advance,
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

enum _PrayerMenu { map, shortPrayers, end, gallery, music, musicOptions, guide }

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
    this.extra,
    this.returnToChurch = false,
    this.textSizeKey,
    this.menuKey,
  });

  /// 첫 사용 안내가 글자 크기·메뉴 단추의 위치를 재는 키.
  final GlobalKey? textSizeKey;
  final GlobalKey? menuKey;

  /// 성당에서 연 화면: 뒤로 단추 대신 아이콘+글자 '성당으로'.
  final bool returnToChurch;

  /// 글자 크기 앞에 놓는 추가 단추(묵주 화면의 ◎ 전체 보기).
  final Widget? extra;

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
          if (returnToChurch)
            Semantics(
              button: true,
              label: '성당으로 돌아가기, 기도는 이어집니다',
              excludeSemantics: true,
              child: TextButton.icon(
                key: const ValueKey('prayer-header-church'),
                style: TextButton.styleFrom(
                  minimumSize: const Size(48, 48),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                ),
                onPressed: onBack,
                icon: const Icon(Icons.church_outlined),
                label: const Text('성당으로'),
              ),
            )
          else
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
          ?extra,
          if (onTextSize != null)
            KeyedSubtree(
              key: textSizeKey,
              child: IconButton(
                key: const ValueKey('prayer-text-size'),
                tooltip: '글자 크기',
                icon: const Icon(Icons.text_fields),
                onPressed: onTextSize,
              ),
            ),
          if (menuBuilder != null)
            // 묵주 전체 보기를 메뉴에서 열었다 닫으면 포커스가 이 단추로 돌아온다.
            KeyedSubtree(
              key: menuKey,
              child: Focus(
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
            ),
          if (onTextSize == null && menuBuilder == null)
            const SizedBox(width: 48),
        ],
      ),
    );
  }
}
