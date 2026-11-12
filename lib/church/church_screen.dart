import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../app/app_services.dart';
import '../app/settings.dart';
import '../app/track.dart';
import '../domain/prayer_data.dart';
import '../domain/rosary_session.dart';
import '../ui/prayer_screen.dart';
import 'avatar/avatar_config.dart';
import 'avatar/avatar_editor_screen.dart';
import 'church_candle_sheet.dart';
import 'church_catalog.dart';
import 'church_constants.dart';
import 'church_hud.dart';
import 'church_prayer_card.dart';
import 'church_scene_controller.dart';
import 'net/church_net.dart';
import 'net/church_net_factory.dart';

/// 사이버 성당 화면: 3D 웹 장면(WebView) 위에 Flutter HUD를 얹는다.
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

  /// 첫 입장 때 세례명을 뽑는 난수(테스트용 주입).
  final Random? random;

  @override
  State<ChurchScreen> createState() => _ChurchScreenState();
}

class _ChurchScreenState extends State<ChurchScreen>
    with WidgetsBindingObserver {
  late final ChurchNet _net;
  late final bool _ownsNet;
  late final ChurchSceneController _scene;
  late final bool _ownsScene;
  StreamSubscription<SceneEvent>? _sceneSub;
  StreamSubscription<ChurchEvent>? _netSub;

  AppSettings get _settings => widget.settings;

  bool _disposed = false;
  bool _background = false;
  bool _sceneReady = false;
  bool _avatarReady = false;
  bool _inited = false;

  String? _you;
  Welcome? _lastWelcome;
  bool _wasOnline = false;

  SceneNear _near = const SceneNear();
  String? _pendingSeat;
  String? _mySeat;

  ChurchPrayerController? _prayer;
  bool _prayerActive = false;
  bool _wasFinished = false;

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
    _net = widget.net ?? createChurchNet(_settings);
    _ownsScene = widget.scene == null;
    _scene = widget.scene ?? WebViewChurchSceneController();
    _lastAmbient = _settings.churchAmbient;
    _lastQuality = _settings.churchQuality;
    _lastAvatar = _settings.churchAvatar.toJsonString();
    _sceneSub = _scene.events.listen(_onScene);
    _netSub = _net.events.listen(_onNet);
    _net.state.addListener(_onNetState);
    _settings.addListener(_onSettings);
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  /// 접속한다. 처음 들어오는 사람에게는 편집기를 강제하지 않고 기본 아바타와
  /// 무작위 세례명을 주며(O-02), 아바타 편집은 HUD의 얼굴 버튼으로 언제든 열 수 있다.
  Future<void> _bootstrap() async {
    if (_disposed || !mounted) return;
    if (!_settings.churchAvatarChosen) _assignFirstAvatar();
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

  void _assignFirstAvatar() {
    final name = (widget.random ?? Random()).nextInt(baptismalNames.length);
    _settings.churchAvatar = AvatarConfig.defaultConfig.copyWith(name: name);
    _settings.churchAvatarChosen = true;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            "세례명은 '${baptismalNames[name]}'이에요. 위쪽 얼굴 버튼에서 바꿀 수 있어요.",
          ),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 5),
        ),
      );
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
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        settings: const RouteSettings(name: 'avatar_editor'),
        fullscreenDialog: true,
        builder:
            widget.avatarEditorBuilder ??
            (context) => AvatarEditorScreen(settings: _settings),
      ),
    );
  }

  double get _hour {
    final n = DateTime.now();
    return n.hour + n.minute / 60;
  }

  void _maybeInit() {
    if (_inited || !_sceneReady || !_avatarReady || _disposed) return;
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
      case SceneNear():
        if (e != _near) setState(() => _near = e);
      case SceneSeated():
        _onSeated(e.seat);
      case SceneStood():
        if (_mySeat != null || _pendingSeat != null) _standUp(tellScene: false);
      case ScenePos():
        if (!_background) _net.sendPos(e.x, e.z, e.r, e.moving);
      case ScenePerf():
        _onPerf(e);
    }
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
    if (_mySeat == null) Track.church('church_sit', widget.churchId);
    _markSat(true);
    _mySeat = seat.isEmpty ? (_pendingSeat ?? '') : seat;
    _pendingSeat = null;
    final p = _prayer ??= _createPrayer();
    p.start();
    _wasFinished = p.finished;
    _prayerActive = true;
    _sendPraying(!p.finished);
    _setWakelock(true);
    setState(() {});
  }

  ChurchPrayerController _createPrayer() {
    final p = ChurchPrayerController(
      settings: _settings,
      stats: AppServicesScope.maybeOf(context)?.stats,
    );
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
    _net.sendPraying(on, p.ms);
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
        if (e.id != _you) unawaited(_scene.peerSeat(e.id, e.seat));
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
          unawaited(_scene.peerPraying(e.id, on: e.on, ms: e.ms));
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
    // 재접속했는데 앉아 있었다면 서버에 다시 알린다.
    final seat = _mySeat;
    if (seat != null && seat.isNotEmpty) {
      _net.requestSit(seat);
      final p = _prayer;
      if (p != null && p.running && !p.finished) _net.sendPraying(true, p.ms);
    }
  }

  void _onSeatDenied(SeatDenied e) {
    if (!mounted) return;
    final mine = e.seat == _pendingSeat || e.seat == _mySeat;
    if (!mine) return;
    unawaited(_scene.setSeatTaken(e.seat));
    _standUp(tellScene: true, tellNet: false);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text('이미 누가 앉아 있어요'),
          behavior: SnackBarBehavior.floating,
        ),
      );
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

  void _onSit() {
    final seat = _near.seat;
    if (seat == null || _pendingSeat != null || _mySeat != null) return;
    setState(() => _pendingSeat = seat);
    unawaited(_scene.setJoystick(0, 0));
    _net.requestSit(seat);
    unawaited(_scene.sit(seat: seat));
  }

  Future<void> _onLight() async {
    final slot = _near.candle;
    if (slot == null) return;
    final intention = await showCandleSheet(context);
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
      ..showSnackBar(
        const SnackBar(
          content: Text('기도를 마쳤습니다'),
          behavior: SnackBarBehavior.floating,
        ),
      );
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
    await Navigator.of(context).push<void>(
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
    );
    // 전체 화면 기도가 끝나면서 화면 켜짐 유지가 풀렸을 수 있다.
    if (!_disposed && _prayerActive) _setWakelock(true);
  }

  void _toggleAmbient() {
    _settings.churchAmbient = !_settings.churchAmbient;
    Track.setting('church_ambient');
  }

  void _emote(int e) {
    _net.emote(e);
    // 접속 중에는 서버 에코가 오면 재생하고, 혼자 모드는 에코가 없으니 바로 재생한다.
    if (_net.state.value != NetState.online) unawaited(_scene.emote(e));
  }

  @override
  void dispose() {
    _disposed = true;
    _perfBannerTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    _settings.removeListener(_onSettings);
    _net.state.removeListener(_onNetState);
    _sceneSub?.cancel();
    _netSub?.cancel();
    // 퇴장: 일어서고, 진행을 저장하고, 접속을 끊는다.
    _markSat(false);
    final enteredAt = _enteredAt;
    if (enteredAt != null) {
      Track.church('church_exit', widget.churchId, {
        'seconds': DateTime.now().difference(enteredAt).inSeconds,
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
    if (_ownsScene) _scene.dispose();
    super.dispose();
  }

  // --- 화면 ---

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final info = ChurchCatalog.resolve(widget.churchId);
    final seatedOrPending = _mySeat != null || _pendingSeat != null;
    final cardOn = _prayerActive && _prayer != null;
    final walking = !seatedOrPending && !cardOn;
    final halfWidth = MediaQuery.sizeOf(context).width / 2;
    return Scaffold(
      backgroundColor: scheme.inverseSurface,
      body: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(child: _scene.buildView(context)),
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
              ),
            ),
          Positioned.fill(child: _LoadOverlay(scene: _scene)),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Flexible(
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: ListenableBuilder(
                            listenable: Listenable.merge([
                              _net.state,
                              _net.count,
                            ]),
                            builder: (context, _) => ChurchStatusChip(
                              churchName: info.nameKo,
                              state: _net.state.value,
                              count: _net.count.value,
                              onChangeChurch: widget.onChangeChurch,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ChurchTopActions(
                        ambientOn: _settings.churchAmbient,
                        onToggleAmbient: _toggleAmbient,
                        onEditAvatar: _openAvatarEditor,
                        onEmote: _emote,
                      ),
                    ],
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
                      onEnd: _endPrayer,
                      onFullScreen: _openFullScreenPrayer,
                    )
                  else if (!seatedOrPending)
                    // 오른쪽 아래: 상황 버튼 하나(앉기 / 초 켜기), 없으면 숨는다.
                    Align(
                      alignment: Alignment.centerRight,
                      child: ChurchContextAction(
                        action: ChurchContextAction.forNear(
                          canSit: _near.seat != null,
                          canLight: _near.candle != null,
                        ),
                        onPressed: _near.seat != null ? _onSit : _onLight,
                      ),
                    ),
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
class _LoadOverlay extends StatelessWidget {
  const _LoadOverlay({required this.scene});

  final ChurchSceneController scene;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<SceneLoad>(
      valueListenable: scene.loadState,
      builder: (context, load, _) {
        if (load == SceneLoad.ready) return const SizedBox.shrink();
        final theme = Theme.of(context);
        final scheme = theme.colorScheme;
        return ColoredBox(
          color: scheme.inverseSurface,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: load == SceneLoad.error
                  ? Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.cloud_off,
                          size: 40,
                          color: scheme.onInverseSurface,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          '성당을 불러오지 못했어요',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: scheme.onInverseSurface,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '잠시 후 다시 시도해 주세요.',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: scheme.onInverseSurface,
                          ),
                        ),
                        const SizedBox(height: 16),
                        FilledButton.icon(
                          onPressed: scene.reload,
                          icon: const Icon(Icons.refresh),
                          label: const Text('다시 시도'),
                        ),
                      ],
                    )
                  : Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 160,
                          child: LinearProgressIndicator(
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          '성당 문을 여는 중…',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: scheme.onInverseSurface,
                          ),
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
