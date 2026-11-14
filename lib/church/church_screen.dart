import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../app/app_services.dart';
import '../app/settings.dart';
import '../app/theme.dart';
import '../app/track.dart';
import '../domain/prayer_data.dart';
import '../domain/rosary_session.dart';
import '../domain/stations_series.dart';
import '../glass/glass_catalog.dart';
import '../glass/glass_info_sheet.dart';
import '../ui/prayer_screen.dart';
import '../ui/stations_sheet.dart';
import 'avatar/avatar_config.dart';
import 'avatar/avatar_editor_screen.dart';
import 'church_candle_sheet.dart';
import 'church_catalog.dart';
import 'church_cross.dart';
import 'church_go_sheet.dart';
import 'church_host.dart';
import 'church_hud.dart';
import 'church_prayer_card.dart';
import 'church_prayer_choice_sheet.dart';
import 'church_presence_sheet.dart';
import 'church_resume_state.dart';
import 'church_scene_controller.dart';
import 'church_theme.dart';
import 'net/church_loads.dart';
import 'net/church_net.dart';
import 'net/church_net_factory.dart';
import 'net/solo_church_net.dart';

/// 사이버 성당 화면: 3D 웹 장면(WebView) 위에 Flutter HUD를 얹는다.
///
/// 이 화면이 사라지는 것(dispose)만이 '성당에서 나가기'다('성당 바꾸기'). 다른 탭·'창' 보기
/// ([ChurchHost.visible] false), 이 화면 위에 연 다른 화면(아바타 편집·전체 화면 기도), 앱
/// 백그라운드는 나가기가 아니라 '보이지 않음'이다. 보이지 않는 동안:
///
/// 1. 장면을 일시정지한다(`ChurchAPI.pause`: 그리기 고리·애니메이션·소리 정지). 접속과 좌석은 그대로.
/// 2. [hiddenDisconnectAfter](3분)가 지나면 접속을 끊는다(서버는 연결이 끊겨야 자리를 비운다).
/// 3. [hiddenReleaseAfter](10분)가 지나면 장면(WebView)도 놓아 메모리를 돌려준다.
///
/// 돌아오면 그 자리에서 잇는다: 장면이 살아 있으면 `resume`, 놓았으면 새로 만들어
/// [ChurchResumeState]를 `restore`로 적용하고, 접속을 끊었으면 같은 성당에 다시 접속해 앉아 있던
/// 자리를 다시 청한다(이미 누가 앉았으면 그 줄 통로에 선다). `church_enter`는 새로 기록하지 않는다.
class ChurchScreen extends StatefulWidget {
  const ChurchScreen({
    super.key,
    required this.settings,
    this.churchId = ChurchCatalog.defaultId,
    this.net,
    this.scene,
    this.avatarEditorBuilder,
    this.prayerScreenBuilder,
    this.onChangeChurch,
    this.onPickChurch,
    this.loads,
    this.sceneFactory,
    this.hiddenDisconnectAfter = const Duration(minutes: 3),
    this.hiddenReleaseAfter = const Duration(minutes: 10),
    @visibleForTesting this.random,
  });

  final AppSettings settings;
  final String churchId;

  /// 테스트용 주입. 없으면 서버 주소에 맞게 만들고 화면이 정리한다.
  final ChurchNet? net;
  final ChurchSceneController? scene;

  /// 아바타 편집 화면 빌더(테스트용 주입).
  final WidgetBuilder? avatarEditorBuilder;

  /// 전체 화면 기도 화면 빌더(테스트용 주입). 같은 [RosarySession]을 넘겨 받는다.
  final Widget Function(
    BuildContext context,
    MysterySet mysterySet,
    RosarySession session,
  )?
  prayerScreenBuilder;

  /// '성당 바꾸기'. 호출 쪽이 이 화면을 닫고(=퇴장 처리) 선택 화면으로 돌아간다.
  final VoidCallback? onChangeChurch;

  /// 접속자 시트의 '전체'에서 다른 성당을 골랐을 때. 호출 쪽이 입장 확인 단계를 거쳐 옮긴다.
  final ValueChanged<String>? onPickChurch;

  /// 성당별 접속 인원(테스트용 주입). 없으면 [ChurchLoads.shared].
  final ChurchLoads? loads;

  /// 장면을 놓았다가 다시 만들 때 쓰는 공장(테스트용 주입). [scene]을 넘겼는데 이것이 없으면
  /// 장면을 놓지 않는다(다시 만들 수 없으므로).
  final ChurchSceneController Function()? sceneFactory;

  /// 보이지 않은 지 이만큼 지나면 접속을 끊는다(돌아오면 같은 자리로 다시 접속).
  final Duration hiddenDisconnectAfter;

  /// 보이지 않은 지 이만큼 지나면 장면(WebView)을 놓는다(돌아오면 새로 만들어 복원).
  final Duration hiddenReleaseAfter;

  /// 첫 입장 설정 화면의 미리 골라 두는 모습을 뽑는 난수(테스트용 주입).
  final Random? random;

  @override
  State<ChurchScreen> createState() => _ChurchScreenState();
}

class _ChurchScreenState extends State<ChurchScreen>
    with WidgetsBindingObserver {
  late final ChurchNet _net;
  late final bool _ownsNet;
  late ChurchSceneController _scene;
  late bool _ownsScene;
  StreamSubscription<SceneEvent>? _sceneSub;
  StreamSubscription<ChurchEvent>? _netSub;

  AppSettings get _settings => widget.settings;

  bool _disposed = false;
  bool _background = false;

  // --- 보이지 않는 동안(다른 탭·다른 화면·앱 백그라운드) ---
  bool _hostVisible = true; // ChurchHost.visible
  bool _appHidden = false; // 앱이 백그라운드(paused/hidden/detached)
  int _covered = 0; // 이 화면 위에 연 불투명 화면 수(아바타 편집·전체 화면 기도)
  bool _coveredByPrayer = false;
  bool _wasHidden = false;
  DateTime? _hiddenAt;
  Duration _hiddenTotal = Duration.zero;
  Timer? _idleNetTimer;
  Timer? _releaseTimer;
  bool _netSuspended = false; // 오래 안 보여서 접속을 끊어 둠
  bool _sceneReleased = false; // 오래 안 보여서 장면을 놓음
  bool _autoPausedPrayer = false;

  /// 마지막으로 알려진 상태(장면을 새로 만들 때 적용한다).
  ChurchResumeState? _resume;
  bool _resumeLoaded = false;

  /// [_resume]이 저장소에서 읽은 것(앱이 종료됐다가 다시 들어옴)이고 아직 적용하지 않았다.
  bool _coldResume = false;

  /// 마지막으로 알려진 내 위치(x, z, yaw). 다시 접속하면 서버는 나를 입구에 두므로 이 값으로 맞춘다.
  (double, double, double)? _lastPos;
  Timer? _catchUpTimer;
  Timer? _farRetryTimer;
  int _farRetries = 0;

  bool get _hidden => !_hostVisible || _appHidden || _covered > 0;
  bool _sceneReady = false;
  bool _avatarReady = false;
  bool _inited = false;

  String? _you;
  Welcome? _lastWelcome;
  bool _wasOnline = false;

  SceneNear _near = const SceneNear();
  SceneStations _stations = const SceneStations();

  // 자동 걷기(스테이션으로 가기). 걷는 동안 칩을 보이고, 도착하면 그 자리의 행동을 보인다.
  String? _walkKind;

  // 성당 안 진본 사진 창(G-29): 가까이 있는 창과 눌러서 고른 창(잠깐). 칩 하나로 보여 준다.
  static const _glassTapHold = Duration(seconds: 8);
  String? _glassNearId;

  /// 십자가의 길: 지금 서 있는 판 앞의 처(1..14, 웹 `crossNear`).
  int? _crossNear;
  String? _glassTapId;
  Timer? _glassTapTimer;
  GlassCatalog? _glassCatalog;
  bool _glassCatalogAsked = false;
  final Set<String> _stationDone = {}; // 이 자리에서 이미 한 스테이션 동작('altar'|'font')
  bool _sheetOpen = false;

  // 첫 방문 안내(한 번만): 'church_walk_hint_seen'을 SharedPreferences에 직접 저장한다.
  static const _hintKey = 'church_walk_hint_seen';
  static const _hintDuration = Duration(seconds: 6);
  bool _hintSeen = true; // 불러오기 전에는 보이지 않는다
  bool _hintLoaded = false;
  bool _hintVisible = false;
  Timer? _hintTimer;

  String? _pendingSeat;
  String? _mySeat;

  ChurchPrayerController? _prayer;
  bool _prayerActive = false;
  bool _wasFinished = false;

  // 묵주기도 하기(SPEC §32): '기도하기' 시트에서 고르면 묵주를 들고 가까운 자리로 걸어가 앉는다.
  /// 묵주기도를 하러 자리로 가는 중(앉으면 풀린다).
  bool _rosaryWalk = false;

  /// 시트에서 고른 신비: 다음에 만드는 기도 세션에 쓴다(없으면 오늘의 신비).
  MysterySet? _rosarySet;

  /// 내 아바타가 묵주를 들고 있는가(장면에 알린 값). 묵주기도 중이거나 그 자리로 가는 중.
  bool _rosaryHeld = false;

  late bool _lastAmbient;
  late ChurchQuality _lastQuality;
  String _lastAvatar = '';

  // 성능(C-04): 입장 후 첫 표본이 이 값보다 느리면 간단 모드를 권한다.
  static const double _slowFps = 15;
  double _perfSum = 0;
  int _perfN = 0;
  String _perfTier = '';
  bool _perfChecked = false;
  bool _perfBanner = false;
  Timer? _perfBannerTimer;

  // 분석(church_exit): 들어온 시각과 앉아 있던 시간.
  DateTime? _enteredAt;
  DateTime? _satSince;
  Duration _satTotal = Duration.zero;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _ownsNet = widget.net == null;
    // 감상실(`glass_room`)은 혼자 보는 곳이라 실시간 접속을 만들지 않는다.
    _net =
        widget.net ??
        (widget.churchId == ChurchCatalog.glassRoomId
            ? SoloChurchNet()
            : createChurchNet(_settings));
    _ownsScene = widget.scene == null;
    _scene = widget.scene ?? WebViewChurchSceneController();
    _lastAmbient = _settings.churchAmbient;
    _lastQuality = _settings.churchQuality;
    _lastAvatar = _settings.churchAvatar.toJsonString();
    _sceneSub = _scene.events.listen(_onScene);
    _netSub = _net.events.listen(_onNet);
    _net.state.addListener(_onNetState);
    _settings.addListener(_onSettings);
    unawaited(_loadHintFlag());
    unawaited(_loadResume());
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _hostVisible = ChurchHost.visibleOf(context);
    _syncVisibility();
  }

  /// 앱이 백그라운드에서 종료됐다가 다시 들어온 경우: 저장해 둔 상태가 같은 성당의 것이고
  /// 오래되지 않았으면 그 자리에서 시작한다. 명시적으로 나갔으면(dispose) 저장분이 없다.
  Future<void> _loadResume() async {
    final saved = await ChurchResumeState.load();
    if (_disposed) return;
    if (_resume == null &&
        saved != null &&
        saved.isFreshFor(widget.churchId, DateTime.now())) {
      _resume = saved;
      _coldResume = true;
    }
    _resumeLoaded = true;
    _maybeInit();
  }

  // --- 보임/보이지 않음 ---

  void _syncVisibility() {
    if (_disposed) return;
    final hidden = _hidden;
    if (hidden == _wasHidden) return;
    _wasHidden = hidden;
    if (hidden) {
      _onHidden();
    } else {
      _onShown();
    }
  }

  bool get _canRecreateScene =>
      widget.scene == null || widget.sceneFactory != null;

  void _onHidden() {
    _hiddenAt = DateTime.now();
    _markSat(false);
    _catchUpTimer?.cancel();
    _catchUpTimer = null;
    unawaited(_scene.setJoystick(0, 0));
    // 그리기 고리·애니메이션·소리를 멈춘다. 웹이 지금 상태(SceneState)를 알려 준다.
    unawaited(_scene.pause());
    // 전체 화면 기도는 같은 세션을 이어 가므로 건드리지 않는다. 그 밖에는 기도 시간을 세지 않는다.
    final p = _prayer;
    if (!_coveredByPrayer && p != null && p.running) {
      p.pause();
      _autoPausedPrayer = true;
    }
    if (_prayerActive && !_coveredByPrayer) _setWakelock(false);
    _idleNetTimer?.cancel();
    _idleNetTimer = Timer(widget.hiddenDisconnectAfter, _suspendNet);
    _releaseTimer?.cancel();
    if (_canRecreateScene) {
      _releaseTimer = Timer(widget.hiddenReleaseAfter, _releaseScene);
    }
  }

  void _onShown() {
    _idleNetTimer?.cancel();
    _idleNetTimer = null;
    _releaseTimer?.cancel();
    _releaseTimer = null;
    final at = _hiddenAt;
    _hiddenAt = null;
    if (at != null) {
      final gone = DateTime.now().difference(at);
      _hiddenTotal += gone;
      // 앱이 얼어 있어 타이머가 돌지 못했더라도 같은 정책을 적용한다.
      if (!_netSuspended && gone >= widget.hiddenDisconnectAfter) _suspendNet();
    }
    if (_sceneReleased) {
      _recreateScene();
    } else {
      unawaited(_scene.resume());
    }
    if (_netSuspended) {
      _netSuspended = false;
      unawaited(
        _net.connect(churchId: widget.churchId).catchError((Object e) {
          debugPrint('church reconnect failed: $e');
        }),
      );
    }
    if (_mySeat != null) _markSat(true);
    final p = _prayer;
    if (_autoPausedPrayer) {
      _autoPausedPrayer = false;
      if (p != null && p.paused && _prayerActive) p.resume();
    }
    if (_prayerActive) _setWakelock(true);
    if (mounted) setState(() {});
  }

  /// 오래 보이지 않았다: 접속을 끊는다(서버가 내 자리를 비운다). 좌석·기도 상태는 기억해 두고
  /// 돌아오면 다시 접속해 같은 자리를 청한다.
  void _suspendNet() {
    _idleNetTimer?.cancel();
    _idleNetTimer = null;
    if (_disposed || _netSuspended) return;
    _netSuspended = true;
    _farRetryTimer?.cancel();
    unawaited(
      _net.disconnect().catchError((Object e) {
        debugPrint('church idle disconnect failed: $e');
      }),
    );
  }

  /// 더 오래 보이지 않았다: 장면(WebView)을 놓는다. 상태를 받아 둔 경우에만(복원할 수 있을 때만).
  void _releaseScene() {
    _releaseTimer = null;
    if (_disposed || _sceneReleased || !_hidden) return;
    if (!_canRecreateScene || _resume == null || !_inited) return;
    _sceneReleased = true;
    _sceneSub?.cancel();
    _sceneSub = null;
    if (_ownsScene) _scene.dispose();
    _sceneReady = false;
    _inited = false;
    if (mounted) setState(() {});
  }

  void _recreateScene() {
    _scene = widget.sceneFactory?.call() ?? WebViewChurchSceneController();
    _ownsScene = true;
    _sceneReleased = false;
    _sceneReady = false;
    _inited = false;
    _near = const SceneNear();
    _glassNearId = null;
    _crossNear = null;
    _walkKind = null;
    _sceneSub = _scene.events.listen(_onScene);
  }

  /// 지금 상태를 기억한다(메모리 + 저장소).
  void _rememberState(SceneState e) {
    if (e.church != widget.churchId) return;
    final st = ChurchResumeState(
      churchId: e.church,
      x: e.x,
      z: e.z,
      r: e.r,
      seat: e.seat,
      kneel: e.kneel,
      rosary: e.rosary,
      camYaw: e.camYaw,
      camPitch: e.camPitch,
      camZoom: e.camZoom,
      camLook: e.camLook,
      walkKind: e.walkKind,
      walkIndex: e.walkIndex,
      walkSeat: e.walkSeat,
      savedAtMs: DateTime.now().millisecondsSinceEpoch,
    );
    _resume = st;
    _coldResume = false;
    _lastPos = (e.x, e.z, e.r);
    unawaited(st.save());
  }

  /// 새 장면에 복원했다.
  void _onRestored(SceneRestored e) {
    _lastPos = (e.x, e.z, e.r);
    final online = _net.state.value == NetState.online;
    if (e.seat == null) {
      final had = _mySeat != null || _pendingSeat != null;
      if (had) _standUp(tellScene: false);
      if ((had || e.lost) && mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(content: Text('앉아 있던 자리에 다른 분이 계셔서 통로에 섰어요')),
          );
      }
      if (online) _startPosCatchUp();
    } else if (online) {
      _startPosCatchUp();
      _net.requestSit(e.seat!);
    }
  }

  /// 다시 접속하면 서버는 나를 입구에 둔다. 서버의 이동 속도 제한(평균 7m/s) 안에서 마지막 위치를
  /// 여러 번 보내 서버 쪽 위치를 따라잡게 한다(다른 사람 화면의 내 위치, 좌석 거리 판정).
  void _startPosCatchUp() {
    _catchUpTimer?.cancel();
    _catchUpTimer = null;
    final p = _lastPos;
    if (p == null || _hidden || _disposed) return;
    var n = 0;
    _net.sendPos(p.$1, p.$2, p.$3, true);
    _catchUpTimer = Timer.periodic(const Duration(milliseconds: 500), (t) {
      n++;
      final done = n >= 16 || _net.state.value != NetState.online;
      _net.sendPos(p.$1, p.$2, p.$3, !done);
      if (done) {
        t.cancel();
        _catchUpTimer = null;
      }
    });
  }

  Future<void> _loadHintFlag() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _hintSeen = prefs.getBool(_hintKey) ?? false;
    } catch (e) {
      debugPrint('church hint flag load failed: $e');
      _hintSeen = true; // 못 읽으면 보이지 않는다(반복해서 뜨는 것보다 낫다).
    }
    _hintLoaded = true;
    _maybeShowHint();
  }

  /// 장면이 준비되고 아직 안내를 본 적 없으면 6초 동안 보인다. 보인 순간 '봤음'으로 저장한다.
  void _maybeShowHint() {
    if (_disposed || !mounted || _hintVisible || _hintSeen) return;
    if (!_hintLoaded || !_sceneReady) return;
    _hintSeen = true;
    _hintVisible = true;
    _hintTimer = Timer(_hintDuration, _hideHint);
    unawaited(_saveHintFlag());
    setState(() {});
  }

  Future<void> _saveHintFlag() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_hintKey, true);
    } catch (e) {
      debugPrint('church hint flag save failed: $e');
    }
  }

  void _hideHint() {
    _hintTimer?.cancel();
    _hintTimer = null;
    if (_hintVisible && mounted) setState(() => _hintVisible = false);
  }

  /// 접속한다. 처음 들어오는 사람에게는 한 페이지짜리 설정 화면(성별·머리 모양·머리색·
  /// 피부색·세례명)을 전체 화면으로 먼저 보여 준다. 값은 미리 골라져 있어 '성당 들어가기'
  /// 한 번이면 된다. 그동안 장면(WebView)은 뒤에서 불러온다. 아바타 편집은 HUD의 얼굴 버튼으로
  /// 언제든 다시 열 수 있다.
  Future<void> _bootstrap() async {
    if (_disposed || !mounted) return;
    if (!_settings.churchAvatarChosen) {
      final done = await _runFirstEntrySetup();
      if (_disposed || !mounted) return;
      if (!done) {
        // 설정 화면에서 뒤로 가면 성당에 들어가지 않고 선택 화면으로 돌아간다.
        // 돌아갈 곳이 없으면(테스트·단독 화면) 미리 골라진 모습으로 들어간다.
        if (widget.onChangeChurch != null) {
          widget.onChangeChurch!();
          return;
        }
        _settings.churchAvatarChosen = true;
      }
    }
    _avatarReady = true;
    _maybeInit();
    try {
      await _net.connect(churchId: widget.churchId);
    } catch (e) {
      debugPrint('church connect failed: $e');
    }
    if (_disposed) return;
    _enteredAt = DateTime.now();
    Track.church('church_enter', widget.churchId, {
      'online': _net.state.value == NetState.online,
    });
  }

  /// 첫 입장 설정 화면. 확인하면 true(설정과 '선택함' 표시는 화면이 저장한다).
  Future<bool> _runFirstEntrySetup() async {
    final result = await _whileCovered(
      () => Navigator.of(context).push<AvatarConfig>(
        MaterialPageRoute(
          settings: const RouteSettings(name: 'avatar_setup'),
          fullscreenDialog: true,
          builder: (context) => ChurchTheme.wrap(
            context,
            AvatarEditorScreen(
              settings: _settings,
              firstEntry: true,
              random: widget.random,
            ),
          ),
        ),
      ),
    );
    return result != null;
  }

  /// 앉은 시간을 센다(앉으면 true, 일어나면 false).
  void _markSat(bool sat) {
    final now = DateTime.now();
    if (sat) {
      _satSince ??= now;
      return;
    }
    final since = _satSince;
    if (since != null) _satTotal += now.difference(since);
    _satSince = null;
  }

  Future<void> _openAvatarEditor() async {
    await _whileCovered(
      () => Navigator.of(context).push<void>(
        MaterialPageRoute(
          settings: const RouteSettings(name: 'avatar_editor'),
          fullscreenDialog: true,
          builder: (context) => ChurchTheme.wrap(
            context,
            Builder(
              builder:
                  widget.avatarEditorBuilder ??
                  (context) => AvatarEditorScreen(settings: _settings),
            ),
          ),
        ),
      ),
    );
  }

  /// 이 화면을 완전히 가리는 화면을 여는 동안 장면을 멈춘다(돌아오면 그 자리에서 잇는다).
  Future<T> _whileCovered<T>(
    Future<T> Function() push, {
    bool prayer = false,
  }) async {
    _covered++;
    if (prayer) _coveredByPrayer = true;
    _syncVisibility();
    try {
      return await push();
    } finally {
      _covered--;
      if (prayer) _coveredByPrayer = false;
      _syncVisibility();
    }
  }

  double get _hour {
    final n = DateTime.now();
    return n.hour + n.minute / 60;
  }

  void _maybeInit() {
    if (_inited || !_sceneReady || !_avatarReady || _disposed) return;
    if (!_resumeLoaded || _sceneReleased) return;
    _inited = true;
    _lastAvatar = _settings.churchAvatar.toJsonString();
    unawaited(
      _scene.init(
        avatar: _settings.churchAvatar.toJson(),
        hour: _hour,
        ambient: _settings.churchAmbient && !_background,
        solo: _net.state.value != NetState.online,
        quality: _settings.churchQuality.name,
        church: widget.churchId,
      ),
    );
    // 새로 만든 장면이면 입구가 아니라 방금 있던 자리에서 시작한다. 좌석은 앱이 아는 상태가 우선
    // (처음 들어온 직후라 앱이 아직 모르면 저장분의 좌석을 쓴다).
    final rs = _resume;
    if (rs != null && rs.churchId == widget.churchId) {
      final cold = _coldResume;
      _coldResume = false;
      // 묵주: 다시 들어온 직후(cold)에는 앉아 있던 경우만 되살린다(앉으면 기도 카드가 다시 열린다).
      final st = cold
          ? rs.withSeat(rs.seat, rosary: rs.seat != null && rs.rosary)
          : rs.withSeat(_mySeat, kneel: _kneel, rosary: _rosaryHeld);
      if (cold && st.seat != null) _pendingSeat = st.seat;
      if (cold) _rosaryHeld = st.rosary;
      unawaited(_scene.restore(st.toSceneArgs()));
    }
    if (_hidden) unawaited(_scene.pause());
    final w = _lastWelcome;
    if (w != null && _net.state.value == NetState.online) _applyWelcome(w);
  }

  // --- 웹 장면 이벤트 ---

  void _onScene(SceneEvent e) {
    if (_disposed) return;
    switch (e) {
      case SceneReady():
        _sceneReady = true;
        _inited = false;
        _maybeInit();
        _maybeShowHint();
      case SceneNear():
        if (e != _near) {
          setState(() {
            _near = e;
            // 그 자리를 벗어나면 다음에 다시 '기도하기'/'성호 긋기'가 나온다.
            if (e.station == null) {
              _stationDone.clear();
            } else {
              _stationDone.removeWhere((k) => k != e.station);
            }
          });
        }
      case SceneStations():
        setState(() => _stations = e);
      case SceneWalkStart():
        setState(() => _walkKind = e.kind);
      case SceneWalkDone():
        _onWalkDone(e);
      case SceneWalkFail():
        _onWalkFail(e);
      case SceneWalkCancel():
        if (_walkKind != null) setState(() => _walkKind = null);
        _dropRosaryWalk();
      case SceneSeated():
        _onSeated(e.seat);
      case SceneStood():
        if (_mySeat != null || _pendingSeat != null) _standUp(tellScene: false);
      case ScenePosture():
        break; // 전환 완료 알림. 상태는 설정(prayerPosture)이 원본이다.
      case ScenePos():
        _lastPos = (e.x, e.z, e.r);
        _catchUpTimer?.cancel();
        _catchUpTimer = null;
        if (!_background) _net.sendPos(e.x, e.z, e.r, e.moving);
      case SceneState():
        _rememberState(e);
      case SceneRestored():
        _onRestored(e);
      case ScenePerf():
        _onPerf(e);
      case SceneGlassNear():
        _ensureGlassCatalog();
        if (e.id != _glassNearId) setState(() => _glassNearId = e.id);
      case SceneGlassTap():
        _ensureGlassCatalog();
        _glassTapTimer?.cancel();
        _glassTapTimer = Timer(_glassTapHold, () {
          if (mounted && _glassTapId != null) {
            setState(() => _glassTapId = null);
          }
        });
        setState(() => _glassTapId = e.id);
      case SceneCrossNear():
        if (e.n != _crossNear) setState(() => _crossNear = e.n);
      case ViewReady() ||
          ViewEnd() ||
          ViewError() ||
          ViewPerf() ||
          ViewGesture():
        break; // 창 감상 이벤트는 GlassViewScreen이 쓴다.
    }
  }

  /// 창 이름·출처는 스테인드글라스 카탈로그(번들)에서 읽는다. 처음 창 이벤트가 올 때 한 번만 부른다.
  void _ensureGlassCatalog() {
    if (_glassCatalogAsked) return;
    _glassCatalogAsked = true;
    GlassCatalog.shared().then(
      (c) {
        if (!_disposed && mounted) setState(() => _glassCatalog = c);
      },
      onError: (Object e) {
        debugPrint('glass catalog load failed: $e');
        _glassCatalogAsked = false;
      },
    );
  }

  /// 지금 칩으로 보여 줄 창(누른 창이 가까운 창보다 먼저). 카탈로그에 없으면 null.
  GlassWindow? get _glassWindow {
    final id = _glassTapId ?? _glassNearId;
    if (id == null) return null;
    return _glassCatalog?.byId(id);
  }

  void _openGlassInfo(GlassWindow w) {
    unawaited(showGlassInfoSheet(_themed, w));
  }

  /// 성능 표본(C-04). 입장 직후 첫 표본이 너무 느리면 간단 모드를 '권한다'(강제하지 않는다).
  void _onPerf(ScenePerf e) {
    if (e.tier != null) _perfTier = e.tier!;
    if (!e.auto) {
      _perfSum += e.fps;
      _perfN++;
    }
    if (_perfChecked) return;
    _perfChecked = true;
    final alreadyLow =
        e.auto ||
        e.tier == 'low' ||
        _settings.churchQuality == ChurchQuality.low;
    if (!alreadyLow && !e.auto && e.fps < _slowFps) {
      setState(() => _perfBanner = true);
      _perfBannerTimer = Timer(const Duration(seconds: 12), _hidePerfBanner);
    }
  }

  void _hidePerfBanner() {
    _perfBannerTimer?.cancel();
    _perfBannerTimer = null;
    if (_perfBanner && mounted) setState(() => _perfBanner = false);
  }

  void _switchToSimple() {
    _hidePerfBanner();
    _lastQuality = ChurchQuality.low;
    _settings.churchQuality = ChurchQuality.low;
    unawaited(_scene.setQuality(ChurchQuality.low.name));
    Track.event('church_mode', {
      'church': widget.churchId,
      'mode': 'simple',
      'on': true,
    });
  }

  void _keepQuality() {
    _hidePerfBanner();
    Track.event('church_mode', {
      'church': widget.churchId,
      'mode': 'simple',
      'on': false,
    });
  }

  void _onSeated(String seat) {
    if (!mounted) return;
    // 장면을 새로 만들어 같은 자리에 다시 앉힌 경우(복원)는 새로 앉은 것이 아니다:
    // 기록하지 않고, 기도 카드의 상태(진행·쉬는 중)도 그대로 둔다.
    final reseat = _mySeat != null && _prayer != null && _prayerActive;
    if (_mySeat == null) Track.church('church_sit', widget.churchId);
    if (!_hidden) _markSat(true);
    _mySeat = seat.isEmpty ? (_pendingSeat ?? '') : seat;
    _pendingSeat = null;
    _rosaryWalk = false; // 자리에 왔다. 이제부터 묵주는 기도 상태를 따른다(_sendPraying).
    final p = _prayer ??= _createPrayer();
    if (!reseat) p.start();
    _wasFinished = p.finished;
    _prayerActive = true;
    _sendPraying(reseat ? p.running && !p.finished : !p.finished);
    // 저장해 둔 기도 자세(앉아서 | 무릎 꿇고)를 앉은 뒤에 적용한다.
    if (_kneel) unawaited(_scene.setPrayerPosture(kneel: true));
    if (_hidden) {
      // 보이지 않는 동안 앉았다(복원 직후 등): 기도 시간은 돌아온 뒤부터 센다.
      if (!_coveredByPrayer && p.running) {
        p.pause();
        _autoPausedPrayer = true;
      }
    } else {
      _setWakelock(true);
    }
    setState(() {});
  }

  ChurchPrayerController _createPrayer() {
    final p = ChurchPrayerController(
      settings: _settings,
      mysterySet: _rosarySet,
      stats: AppServicesScope.maybeOf(context)?.stats,
    );
    _rosarySet = null;
    p.addListener(_onPrayerChanged);
    return p;
  }

  /// 마지막 단 다음으로 넘어가 세션이 끝나면 기도 포즈를 풀고, 되돌리면 다시 취한다.
  void _onPrayerChanged() {
    final p = _prayer;
    if (p == null || _disposed) return;
    if (p.finished != _wasFinished) {
      _wasFinished = p.finished;
      if (p.finished) {
        _sendPraying(false);
      } else if (_prayerActive && !p.paused) {
        p.start();
        _sendPraying(true);
      }
    }
  }

  void _sendPraying(bool on) {
    final p = _prayer;
    if (p == null) return;
    unawaited(_scene.setPraying(on: on, ms: p.ms));
    // 성당의 기도 카드는 묵주기도다: 기도하는 동안 묵주를 들고, 쉬거나 마치면 내려놓는다.
    _setRosary(on);
    _net.sendPraying(on, p.ms, kneel: on && _kneel, rosary: on);
  }

  /// 내 아바타가 묵주를 든다/내려놓는다(바뀔 때만 장면에 알린다).
  void _setRosary(bool on) {
    if (on == _rosaryHeld) return;
    _rosaryHeld = on;
    unawaited(_scene.setRosary(on: on));
  }

  /// 묵주기도 하러 가던 걸음을 그만두면(취소·길 없음) 묵주를 내려놓는다.
  void _dropRosaryWalk() {
    if (!_rosaryWalk || _mySeat != null || _pendingSeat != null) return;
    _rosaryWalk = false;
    _rosarySet = null;
    _setRosary(false);
  }

  bool get _kneel => _settings.prayerPosture == PrayerPosture.kneel;

  /// 기도 카드에서 자세를 고른다: 저장하고, 내 아바타와(기도 중이면) 다른 사람 화면에 알린다.
  void _setPosture(PrayerPosture v) {
    if (v == _settings.prayerPosture) return;
    _settings.prayerPosture = v;
    if (_mySeat == null) return;
    unawaited(_scene.setPrayerPosture(kneel: _kneel));
    final p = _prayer;
    if (p != null && p.running && !p.finished) {
      _net.sendPraying(true, p.ms, kneel: _kneel, rosary: true);
    }
  }

  void _setWakelock(bool on) {
    try {
      final f = on ? WakelockPlus.enable() : WakelockPlus.disable();
      unawaited(
        f.catchError((Object e) {
          debugPrint('wakelock failed: $e');
        }),
      );
    } catch (e) {
      debugPrint('wakelock failed: $e');
    }
  }

  // --- 서버 이벤트 ---

  void _onNet(ChurchEvent e) {
    if (_disposed) return;
    switch (e) {
      case Welcome():
        _you = e.you;
        _lastWelcome = e;
        if (_inited) _applyWelcome(e);
      case Join():
        if (e.peer.id != _you) unawaited(_scene.peerJoin(e.peer.toJson()));
      case Leave():
        unawaited(_scene.peerLeave(e.id, aoi: e.aoi));
      case Snap():
        final list = [
          for (final s in e.list)
            if (s.id != _you) s.toJson(),
        ];
        if (list.isNotEmpty) unawaited(_scene.peerSnap(list));
      case Seated():
        if (e.id != _you) {
          unawaited(_scene.peerSeat(e.id, e.seat));
        } else {
          _farRetries = 0;
          _catchUpTimer?.cancel();
          _catchUpTimer = null;
        }
      case Stood():
        if (e.id == _you) {
          // 서버가 나를 일으켜 세운 경우(오래 입력 없음).
          if (_mySeat != null) _standUp(tellScene: true, tellNet: false);
        } else {
          unawaited(_scene.peerStand(e.id));
        }
      case SeatDenied():
        _onSeatDenied(e);
      case Praying():
        if (e.id != _you) {
          unawaited(
            _scene.peerPraying(
              e.id,
              on: e.on,
              ms: e.ms,
              kneel: e.kneel,
              rosary: e.rosary,
            ),
          );
        }
      case Candle():
        unawaited(
          _scene.lightCandle(
            slot: e.slot,
            until: e.until,
            intention: e.intention,
          ),
        );
      case Emote():
        // 서버는 보낸 사람에게도 에코하므로 내 이모트는 이때 재생한다.
        if (e.id == _you) {
          unawaited(_scene.emote(e.e));
        } else {
          unawaited(_scene.peerEmote(e.id, e.e));
        }
      case Full():
        break; // 재접속은 net이 처리한다.
      case Who():
        break; // 접속자 시트가 직접 듣는다.
    }
  }

  void _applyWelcome(Welcome w) {
    unawaited(
      _scene.setPeers([
        for (final p in w.peers)
          if (p.id != w.you) p.toJson(),
      ], w.seats),
    );
    unawaited(_scene.setCandles([for (final c in w.candles) c.toJson()]));
    // 서버는 새 연결을 입구에 둔다: 마지막 위치를 알려 따라잡게 한다(처음 입장이면 할 일이 없다).
    _farRetries = 0;
    _startPosCatchUp();
    // 재접속했는데 앉아 있었다면 서버에 다시 알린다.
    final seat = _mySeat;
    if (seat != null && seat.isNotEmpty) {
      _net.requestSit(seat);
      final p = _prayer;
      if (p != null && p.running && !p.finished) {
        _net.sendPraying(true, p.ms, kneel: _kneel, rosary: true);
      }
    }
  }

  void _onSeatDenied(SeatDenied e) {
    if (!mounted) return;
    final mine = e.seat == _pendingSeat || e.seat == _mySeat;
    if (!mine) return;
    // 'far': 다시 접속한 직후라 서버가 아는 내 위치가 아직 입구 쪽이다. 자리를 잃은 게 아니니
    // 위치를 따라잡게 하고 잠시 뒤 다시 청한다(끝내 안 되면 아래로 내려가 일어선다).
    if (e.reason == 'far' && _lastPos != null && _farRetries < 24 && !_hidden) {
      _farRetries++;
      final seat = e.seat;
      if (_catchUpTimer == null) _startPosCatchUp();
      _farRetryTimer?.cancel();
      _farRetryTimer = Timer(const Duration(milliseconds: 600), () {
        if (_disposed || _hidden) return;
        if (seat != _pendingSeat && seat != _mySeat) return;
        if (_net.state.value == NetState.online) _net.requestSit(seat);
      });
      return;
    }
    _farRetries = 0;
    unawaited(_scene.setSeatTaken(e.seat));
    _standUp(tellScene: true, tellNet: false);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(const SnackBar(content: Text('이미 누가 앉아 있어요')));
  }

  void _onNetState() {
    if (_disposed) return;
    final online = _net.state.value == NetState.online;
    unawaited(_scene.setSolo(on: !online));
    if (_wasOnline && !online) {
      // 연결이 끊기면 다른 사람들을 치우고 배경 신자(혼자 모드)로 돌아간다.
      // 내 위치는 그대로 둔다.
      unawaited(_scene.setPeers(const [], const {}));
    }
    _wasOnline = online;
    if (mounted) setState(() {});
  }

  void _onSettings() {
    if (_disposed) return;
    final ambient = _settings.churchAmbient;
    if (ambient != _lastAmbient) {
      _lastAmbient = ambient;
      if (!_background) unawaited(_scene.setAmbient(on: ambient));
    }
    final quality = _settings.churchQuality;
    if (quality != _lastQuality) {
      _lastQuality = quality;
      unawaited(_scene.setQuality(quality.name));
    }
    final avatar = _settings.churchAvatar.toJsonString();
    if (avatar != _lastAvatar) {
      _lastAvatar = avatar;
      unawaited(_scene.setAvatar(_settings.churchAvatar.toJson()));
    }
    if (mounted) setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final bg = state != AppLifecycleState.resumed;
    // 화면이 실제로 가려진 상태에서만 장면을 멈춘다(inactive: 알림 창·분할 화면은 계속 보인다).
    _appHidden =
        state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached;
    _syncVisibility();
    if (bg == _background) return;
    _background = bg;
    if (bg) {
      unawaited(_scene.setJoystick(0, 0));
      unawaited(_scene.setAmbient(on: false));
    } else if (_settings.churchAmbient) {
      unawaited(_scene.setAmbient(on: true));
    }
  }

  // --- 사용자 동작 ---

  /// '가기' 시트에서 고른 곳으로 자동 걷기. 그 자리에 도착해야 그곳의 행동(초 켜기·기도하기·앉기)이 나온다.
  Future<void> _onGo() async {
    if (_sheetOpen) return;
    _hideHint();
    _sheetOpen = true;
    final ChurchGoTarget? target;
    try {
      target = await showChurchGoSheet(
        _themed,
        hasFont: _stations.font > 0,
        hasCross: _stations.cross >= StationsOfCrossWalk.count,
      );
    } finally {
      _sheetOpen = false;
    }
    if (target == null || _disposed) return;
    unawaited(_scene.setJoystick(0, 0));
    if (target == ChurchGoTarget.cross) {
      // 순례 시작: 1처 판 앞으로 걷는다. 도착하면 묵상 시트가 열린다(_onWalkDone).
      Track.event('stations_open', {'from': StationsFrom.church.name});
      unawaited(_scene.walkTo(target.kind, index: 0));
      return;
    }
    unawaited(_scene.walkTo(target.kind));
  }

  /// 십자가의 길 [n]처 묵상 시트(순례 모드). '다음 처로'를 누르면 다음 판 앞까지 자동으로 걷는다.
  Future<void> _openCross(int n, {bool logOpen = false}) async {
    if (_sheetOpen || _disposed) return;
    _sheetOpen = true;
    final StationsSheetResult? r;
    try {
      r = await showStationsSheet(
        _themed,
        start: n,
        mode: StationsSheetMode.pilgrimage,
        from: StationsFrom.church,
        logOpen: logOpen,
        // 이 성당 벽의 판과 같은 그림 연작(대체 성화)
        series: StationsSeriesCatalog.forChurch(widget.churchId),
      );
    } finally {
      _sheetOpen = false;
    }
    if (r == null || _disposed) return;
    if (r.action == StationsSheetAction.next &&
        r.n < StationsOfCrossWalk.count) {
      unawaited(_scene.setJoystick(0, 0));
      // walkTo 의 index 는 0부터: n처 다음 = index n.
      unawaited(_scene.walkTo('cross', index: r.n));
    }
  }

  void _cancelWalk() {
    unawaited(_scene.cancelWalk());
    if (_walkKind != null) setState(() => _walkKind = null);
    _dropRosaryWalk();
  }

  void _onWalkDone(SceneWalkDone e) {
    if (_walkKind != null) setState(() => _walkKind = null);
    Track.church('church_gesture', widget.churchId, {'e': 'walk_${e.kind}'});
    // 촛불 봉헌대에 도착하면 봉헌 시트가 저절로 열린다(한 번). 닫아도 '초 켜기' 버튼은 남는다.
    if (e.kind == 'candle' &&
        _near.candle != null &&
        _mySeat == null &&
        _pendingSeat == null) {
      unawaited(_onLight());
    }
    // 십자가의 길 판 앞에 도착하면 그 처의 묵상 시트가 열린다.
    if (e.kind == 'cross' && _mySeat == null && _pendingSeat == null) {
      unawaited(_openCross(e.index + 1));
    }
    // 묵주기도 하러 온 자리: 바로 앉는다(앉으면 묵주기도 카드가 열린다). 자리가 없으면 그만둔다.
    if (e.kind == 'seat' && _rosaryWalk) {
      if (_near.seat != null && _mySeat == null && _pendingSeat == null) {
        _onSit();
      } else {
        _dropRosaryWalk();
      }
    }
  }

  void _onWalkFail(SceneWalkFail e) {
    if (_walkKind != null) setState(() => _walkKind = null);
    _dropRosaryWalk();
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(const SnackBar(content: Text('그곳으로 가는 길을 찾지 못했어요')));
  }

  /// 제대 앞의 '기도하기'(시트: 잠시 기도하기 | 묵주기도 하기) / 성수대의 '성호 긋기'.
  /// 그 자리에 서 있을 때만 나온다.
  void _onStationAction() {
    final station = _near.station;
    if (station == null) return;
    if (station == 'altar') {
      unawaited(_onPrayChoice());
      return;
    }
    setState(() => _stationDone.add(station));
    _emote(1);
  }

  /// 제대 앞 '기도하기' 시트(SPEC §32). 고른 것은 기억해 두었다가 다음에 강조한다.
  Future<void> _onPrayChoice() async {
    if (_sheetOpen || _mySeat != null || _pendingSeat != null) return;
    _hideHint();
    _sheetOpen = true;
    final ChurchPrayerPick? pick;
    try {
      final p = _prayer;
      pick = await showChurchPrayerChoiceSheet(
        _themed,
        settings: _settings,
        // 성당에서 바치다 일어난 묵주기도가 있으면 그 신비로 이어 한다.
        resumeSet: p != null && !p.finished && p.session.index > 0
            ? p.mysterySet
            : null,
      );
    } finally {
      _sheetOpen = false;
    }
    if (pick == null || _disposed || !mounted) return;
    _settings.churchPrayerChoice = pick.kind;
    // 무엇을 골랐는지만 기록한다. 신비·기도 내용은 넘기지 않는다.
    Track.church('church_prayer_choice', widget.churchId, {
      'kind': pick.kind.name,
    });
    switch (pick.kind) {
      case ChurchPrayerChoice.brief:
        // 잠시 기도하기: 그 자리에서 고개 숙여 기도한다(이전의 '기도하기').
        if (_near.station == 'altar') {
          setState(() => _stationDone.add('altar'));
        }
        _emote(2);
      case ChurchPrayerChoice.rosary:
        _startRosary(pick.mysterySet);
    }
  }

  /// 묵주기도 하기: 묵주를 들고 가까운 빈 자리로 걸어가 앉는다. 앉으면 묵주기도 카드가 열린다.
  ///
  /// 서서 카드를 열지 않는 까닭: 서버는 앉아 있을 때만 기도 상태를 받아 주고(다른 사람에게 보이지
  /// 않는다), 기도 카드(자세 선택·일어나기·이어 하기)도 좌석을 전제로 하며, 제대 앞에 오래 서 있으면
  /// 다른 사람의 자리를 막는다.
  void _startRosary(MysterySet? set) {
    if (_mySeat != null || _pendingSeat != null) return;
    // 고른 신비가 하던 세션과 다르면(또는 이미 마쳤으면) 세션을 새로 만든다. 같으면 이어 한다.
    final p = _prayer;
    if (p != null && (p.finished || (set != null && p.mysterySet != set))) {
      _prayer = null;
      p.removeListener(_onPrayerChanged);
      p.dispose();
    }
    _rosarySet = set;
    _rosaryWalk = true;
    _setRosary(true);
    unawaited(_scene.setJoystick(0, 0));
    if (_near.seat != null) {
      _onSit();
    } else {
      unawaited(_scene.walkTo(ChurchGoTarget.seat.kind));
    }
  }

  void _onSit() {
    final seat = _near.seat;
    if (seat == null || _pendingSeat != null || _mySeat != null) return;
    if (_walkKind != null) _walkKind = null;
    setState(() => _pendingSeat = seat);
    unawaited(_scene.setJoystick(0, 0));
    _net.requestSit(seat);
    unawaited(_scene.sit(seat: seat));
  }

  Future<void> _onLight() async {
    final slot = _near.candle;
    if (slot == null || _sheetOpen) return;
    _sheetOpen = true;
    final int? intention;
    try {
      intention = await showCandleSheet(_themed);
    } finally {
      _sheetOpen = false;
    }
    if (intention == null || _disposed) return;
    _net.lightCandle(slot, intention);
    // 촛불을 켰다는 사실만 기록한다. 지향 값은 절대 넘기지 않는다.
    Track.church('church_candle', widget.churchId);
    // 켠 촛불은 꺼지지 않는다(until 0 = 만료 없음).
    unawaited(_scene.lightCandle(slot: slot, until: 0, intention: intention));
  }

  /// 일어난다. 진행은 저장하고 기도 카드를 닫는다.
  void _standUp({
    required bool tellScene,
    bool tellNet = true,
    bool saveProgress = true,
  }) {
    final wasSeated = _mySeat != null || _pendingSeat != null;
    _mySeat = null;
    _pendingSeat = null;
    _prayerActive = false;
    _autoPausedPrayer = false;
    _rosaryWalk = false;
    _rosarySet = null;
    _setRosary(false);
    _farRetries = 0;
    _farRetryTimer?.cancel();
    _markSat(false);
    _prayer?.stop(save: saveProgress);
    if (wasSeated) {
      if (tellNet) _net.sendStand();
      if (tellScene) unawaited(_scene.stand());
    }
    _setWakelock(false);
    if (mounted) setState(() {});
  }

  void _togglePause() {
    final p = _prayer;
    if (p == null) return;
    if (p.paused) {
      p.resume();
      _sendPraying(true);
    } else {
      p.pause();
      _sendPraying(false);
    }
  }

  void _endPrayer() {
    final p = _prayer;
    _settings.clearProgress();
    _standUp(tellScene: true, saveProgress: false);
    _prayer = null;
    p?.removeListener(_onPrayerChanged);
    p?.dispose();
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(const SnackBar(content: Text('기도를 마쳤습니다')));
  }

  void _stopFromCard() {
    final finished = _prayer?.finished ?? false;
    _standUp(tellScene: true);
    if (finished) {
      final p = _prayer;
      _prayer = null;
      p?.removeListener(_onPrayerChanged);
      p?.dispose();
    }
  }

  Future<void> _openFullScreenPrayer() async {
    final p = _prayer;
    if (p == null) return;
    await _whileCovered(
      prayer: true,
      () => Navigator.of(context).push<void>(
        MaterialPageRoute(
          settings: const RouteSettings(name: 'prayer'),
          builder: (context) =>
              widget.prayerScreenBuilder?.call(
                context,
                p.mysterySet,
                p.session,
              ) ??
              PrayerScreen(
                settings: _settings,
                mysterySet: p.mysterySet,
                session: p.session,
              ),
        ),
      ),
    );
    // 전체 화면 기도가 끝나면서 화면 켜짐 유지가 풀렸을 수 있다.
    if (!_disposed && _prayerActive) _setWakelock(true);
  }

  /// 칩의 성당 이름·인원 부분: '지금 접속 중' 시트.
  Future<void> _openPresence() async {
    final picked = await showChurchPresenceSheet(
      _themed,
      net: _net,
      loads: widget.loads ?? ChurchLoads.shared,
      churchId: widget.churchId,
      selfName: _settings.churchAvatar.nameText,
      selfSt: () {
        if (_mySeat == null) return 'w';
        final p = _prayer;
        return p != null && p.running && !p.finished ? 'p' : 's';
      },
      canEnter: widget.onPickChurch == null ? (_) => false : null,
    );
    if (picked != null && mounted && !_disposed) {
      widget.onPickChurch?.call(picked);
    }
  }

  void _toggleAmbient() {
    _settings.churchAmbient = !_settings.churchAmbient;
    Track.setting('church_ambient');
  }

  void _emote(int e) {
    _net.emote(e);
    Track.church('church_gesture', widget.churchId, {'e': e});
    // 접속 중에는 서버 에코가 오면 재생하고, 혼자 모드는 에코가 없으니 바로 재생한다.
    if (_net.state.value != NetState.online) unawaited(_scene.emote(e));
  }

  @override
  void dispose() {
    _disposed = true;
    _perfBannerTimer?.cancel();
    _hintTimer?.cancel();
    _glassTapTimer?.cancel();
    _idleNetTimer?.cancel();
    _releaseTimer?.cancel();
    _catchUpTimer?.cancel();
    _farRetryTimer?.cancel();
    // 명시적으로 나간다: 다음에는 입구에서 새로 입장한다.
    unawaited(ChurchResumeState.clear());
    WidgetsBinding.instance.removeObserver(this);
    _settings.removeListener(_onSettings);
    _net.state.removeListener(_onNetState);
    _sceneSub?.cancel();
    _netSub?.cancel();
    // 퇴장: 일어서고, 진행을 저장하고, 접속을 끊는다.
    _markSat(false);
    final enteredAt = _enteredAt;
    if (enteredAt != null) {
      // 머문 시간은 보이지 않던 시간을 뺀다.
      final now = DateTime.now();
      var hidden = _hiddenTotal;
      final at = _hiddenAt;
      if (at != null) hidden += now.difference(at);
      final stayed = now.difference(enteredAt) - hidden;
      Track.church('church_exit', widget.churchId, {
        'seconds': stayed.isNegative ? 0 : stayed.inSeconds,
        'sat_seconds': _satTotal.inSeconds,
      });
    }
    if (_perfN > 0) {
      // 화질 단계(tier)는 분석 허용 목록에 키가 생기기 전까지는 정리기가 조용히 버린다.
      Track.event('perf', {
        'fps_avg': (_perfSum / _perfN).round(),
        'church': widget.churchId,
        if (_perfTier.isNotEmpty) 'tier': _perfTier,
      });
    }
    if (_mySeat != null || _pendingSeat != null) {
      _net.sendStand();
      unawaited(_scene.stand());
    }
    _prayer?.stop();
    _prayer?.removeListener(_onPrayerChanged);
    _prayer?.dispose();
    _setWakelock(false);
    final disconnect = _net.disconnect();
    if (_ownsNet) {
      unawaited(
        disconnect.whenComplete(_net.dispose).catchError((Object e) {
          debugPrint('church net dispose failed: $e');
        }),
      );
    } else {
      unawaited(
        disconnect.catchError((Object e) {
          debugPrint('church disconnect failed: $e');
        }),
      );
    }
    if (_ownsScene && !_sceneReleased) _scene.dispose();
    super.dispose();
  }

  // --- 화면 ---

  /// 성당 테마 아래의 context(Scaffold). 성당 안에서 여는 시트·메뉴가 같은 어두운 금색 테마를 쓰도록
  /// 시트를 열 때는 State 의 context 대신 이것을 넘긴다.
  final GlobalKey _hudKey = GlobalKey();
  BuildContext get _themed => _hudKey.currentContext ?? context;

  @override
  Widget build(BuildContext context) {
    // 성당 안은 시스템 밝기와 상관없이 어두운 금색 M3 테마(ChurchTheme)를 쓴다.
    return Theme(
      data: ChurchTheme.of(context),
      child: Builder(builder: _build),
    );
  }

  Widget _build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final wide = MediaQuery.sizeOf(context).width >= 600;
    final info = ChurchCatalog.resolve(widget.churchId);
    final seatedOrPending = _mySeat != null || _pendingSeat != null;
    final cardOn = _prayerActive && _prayer != null;
    final walking = !seatedOrPending && !cardOn;
    final halfWidth = MediaQuery.sizeOf(context).width / 2;
    final glassWin = _glassWindow;
    final statusChip = ListenableBuilder(
      listenable: Listenable.merge([_net.state, _net.count]),
      builder: (context, _) => ChurchStatusChip(
        churchName: info.nameKo,
        state: _net.state.value,
        count: _net.count.value,
        onChangeChurch: widget.onChangeChurch,
        onShowPresence: _openPresence,
      ),
    );
    // 도구 줄: 소리·아바타·인사 (+ 걸어 다닐 수 있으면 '가기').
    final topActions = ChurchTopActions(
      ambientOn: _settings.churchAmbient,
      onToggleAmbient: _toggleAmbient,
      onEditAvatar: _openAvatarEditor,
      onEmote: _emote,
      onGo: walking ? _onGo : null,
    );
    return Scaffold(
      key: _hudKey,
      backgroundColor: scheme.surface,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 오래 보이지 않아 장면을 놓았으면(돌아오는 순간 새로 만든다) 빈 바탕만 둔다.
          if (!_sceneReleased)
            Positioned.fill(
              child: KeyedSubtree(
                key: ObjectKey(_scene),
                child: _scene.buildView(context),
              ),
            ),
          // 왼쪽 절반: 떠다니는 이동 스틱(C-01). 오른쪽 절반은 아래 웹 장면이 받아 카메라를 돌린다.
          // HUD(아래 SafeArea)가 이 위에 놓여 버튼이 터치를 먼저 받는다.
          if (walking)
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              width: halfWidth,
              child: ChurchMoveZone(
                hint: '왼쪽 화면을 누르고 끌면 걸어요',
                onChanged: (x, y) => unawaited(_scene.setJoystick(x, y)),
                // 왼쪽 절반을 건드리면 자동 걷기가 끊기고, 짧은 탭은 웹 표식 누르기로 넘긴다.
                onTouchDown: () {
                  if (_walkKind != null) _cancelWalk();
                },
                onTap: (p) => unawaited(_scene.tapAt(p.dx, p.dy)),
              ),
            ),
          if (!_sceneReleased)
            Positioned.fill(
              child: _LoadOverlay(
                key: ObjectKey(_scene),
                scene: _scene,
                churchName: info.nameKo,
              ),
            ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpace.sm,
                AppSpace.xs,
                AppSpace.sm,
                AppSpace.sm,
              ),
              child: Column(
                children: [
                  // 첫 줄: 이름판(왼쪽)과 도구 줄(오른쪽). 폰 폭에서는 이름판이 한 줄을 다 쓰고
                  // (긴 성당 이름·부제가 잘리지 않게) 도구 줄은 그 아래 오른쪽에 놓인다.
                  if (wide)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Flexible(
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: statusChip,
                          ),
                        ),
                        const SizedBox(width: AppSpace.xs),
                        topActions,
                      ],
                    )
                  else ...[
                    Align(alignment: Alignment.centerLeft, child: statusChip),
                    const SizedBox(height: AppSpace.xs),
                    Align(alignment: Alignment.centerRight, child: topActions),
                  ],
                  // 자동 걷기 중이면 왼쪽에 '걷는 중… (취소)' 칩.
                  if (walking && _walkKind != null)
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpace.xs),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: ChurchWalkChip(
                          key: const ValueKey('walk-chip'),
                          onCancel: _cancelWalk,
                        ),
                      ),
                    ),
                  // 셋째 줄(왼쪽): 진본 사진 창 앞이면 '이 창: ○○ · 자세히 보기'(G-29).
                  // 나타나고 사라질 때는 M3 페이드(short4 + 표준 곡선, 동작 줄이기면 즉시).
                  AnimatedSwitcher(
                    duration: AppMotion.of(context, Durations.short4),
                    switchInCurve: Easing.standardDecelerate,
                    switchOutCurve: Easing.standardAccelerate,
                    layoutBuilder: (current, previous) => Stack(
                      alignment: Alignment.topLeft,
                      children: [...previous, ?current],
                    ),
                    child: (walking && glassWin != null)
                        ? Padding(
                            key: const ValueKey('glass-chip-slot'),
                            padding: const EdgeInsets.only(top: AppSpace.xs),
                            child: Align(
                              alignment: Alignment.centerLeft,
                              child: ChurchGlassChip(
                                key: const ValueKey('glass-chip'),
                                title: glassWin.titleKo,
                                onTap: () => _openGlassInfo(glassWin),
                              ),
                            ),
                          )
                        : const SizedBox.shrink(
                            key: ValueKey('glass-chip-none'),
                          ),
                  ),
                  // 넷째 줄(왼쪽): 십자가의 길 판 앞이면 '십자가의 길 n처 · 명칭 — 묵상하기'(창 칩 아래 줄, 자동 걷기 중에는 숨김).
                  AnimatedSwitcher(
                    duration: AppMotion.of(context, Durations.short4),
                    switchInCurve: Easing.standardDecelerate,
                    switchOutCurve: Easing.standardAccelerate,
                    layoutBuilder: (current, previous) => Stack(
                      alignment: Alignment.topLeft,
                      children: [...previous, ?current],
                    ),
                    child: (walking && _walkKind == null && _crossNear != null)
                        ? Padding(
                            key: ValueKey('cross-chip-slot-$_crossNear'),
                            padding: const EdgeInsets.only(top: AppSpace.xs),
                            child: Align(
                              alignment: Alignment.centerLeft,
                              child: ChurchCrossChip(
                                key: const ValueKey('cross-chip'),
                                n: _crossNear!,
                                onTap: () => unawaited(
                                  _openCross(_crossNear!, logOpen: true),
                                ),
                              ),
                            ),
                          )
                        : const SizedBox.shrink(
                            key: ValueKey('cross-chip-none'),
                          ),
                  ),
                  if (_perfBanner)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: ChurchPerfBanner(
                        key: const ValueKey('perf-banner'),
                        onSwitch: _switchToSimple,
                        onKeep: _keepQuality,
                      ),
                    ),
                  const Spacer(),
                  if (cardOn)
                    ChurchPrayerCard(
                      controller: _prayer!,
                      settings: _settings,
                      onTogglePause: _togglePause,
                      onStand: _stopFromCard,
                      onPosture: _setPosture,
                      onEnd: _endPrayer,
                      onFullScreen: _openFullScreenPrayer,
                    )
                  else if (!seatedOrPending) ...[
                    // 처음 한 번 뜨는 '가기' 안내: 위쪽(이름표·표식이 뜨는 곳)이 아니라 오른쪽 아래, 상황 버튼 바로 위에 둔다.
                    // 폭은 왼쪽 이동 안내(맨 왼쪽 140px)와 겹치지 않게 제한한다.
                    if (_hintVisible && walking)
                      const Padding(
                        padding: EdgeInsets.only(bottom: 8),
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: ChurchWalkHint(),
                        ),
                      ),
                    // 오른쪽 아래: 상황 버튼 하나(앉기 / 초 켜기), 없으면 숨는다. 버튼이 없어도 그 높이(64)를 비워 안내가 오르내리지 않게 한다.
                    ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: 64),
                      child: Align(
                        alignment: Alignment.centerRight,
                        child: Builder(
                          builder: (context) {
                            final pending =
                                _near.station != null &&
                                    !_stationDone.contains(_near.station)
                                ? _near.station
                                : null;
                            final action = ChurchContextAction.forNear(
                              canSit: _near.seat != null,
                              canLight: _near.candle != null,
                              station: pending,
                            );
                            return ChurchContextAction(
                              action: action,
                              onPressed: switch (action) {
                                ChurchAction.pray ||
                                ChurchAction.cross => _onStationAction,
                                ChurchAction.sit => _onSit,
                                _ => _onLight,
                              },
                            );
                          },
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 장면을 불러오는 동안의 안내와, 실패했을 때의 다시 시도 카드.
/// 성당 테마의 먹색 바탕 위에 금색 선 아이콘·성당 이름·진행 표시줄을 둔다(문을 여는 동안의 어둠).
class _LoadOverlay extends StatelessWidget {
  const _LoadOverlay({
    super.key,
    required this.scene,
    required this.churchName,
  });

  final ChurchSceneController scene;
  final String churchName;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<SceneLoad>(
      valueListenable: scene.loadState,
      builder: (context, load, _) {
        if (load == SceneLoad.ready) return const SizedBox.shrink();
        final theme = Theme.of(context);
        final scheme = theme.colorScheme;
        final error = load == SceneLoad.error;
        return ColoredBox(
          color: scheme.surface,
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpace.lg,
                vertical: AppSpace.sm,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    error ? Icons.cloud_off_outlined : Icons.church_outlined,
                    size: 40,
                    color: scheme.primary,
                  ),
                  const SizedBox(height: AppSpace.sm),
                  Text(
                    error ? '성당을 불러오지 못했어요' : churchName,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.titleLarge?.copyWith(
                      color: scheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: AppSpace.xxs),
                  Text(
                    error ? '잠시 후 다시 시도해 주세요.' : '성당 문을 여는 중…',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: AppSpace.md),
                  if (error)
                    FilledButton.icon(
                      onPressed: scene.reload,
                      icon: const Icon(Icons.refresh),
                      label: const Text('다시 시도'),
                    )
                  else
                    // 진행 표시줄 모양은 테마(progressIndicatorTheme, M3 2024)에 맡긴다.
                    const SizedBox(
                      width: 160,
                      child: LinearProgressIndicator(),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
