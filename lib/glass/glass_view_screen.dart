import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app/settings.dart';
import '../app/track.dart';
import '../church/avatar/avatar_config.dart';
import '../church/church_catalog.dart';
import '../church/church_scene_controller.dart';
import 'glass_catalog.dart';
import 'glass_chrome.dart';
import 'glass_flat_viewer.dart';
import 'glass_info_sheet.dart';
import 'glass_widgets.dart';

/// 빛 선택(브리지 `light` 값과 분석 `light` 값이 같다).
enum GlassLight {
  ref('ref', '기준광', Icons.light_mode_outlined),
  sun('sun', '햇빛', Icons.wb_sunny_outlined),
  night('night', '밤', Icons.nightlight_outlined);

  const GlassLight(this.key, this.label, this.icon);
  final String key;
  final String label;
  final IconData icon;
}

enum _Phase { loading, ready, error }

enum _Mode { room, flat }

/// 창 감상 화면(전체 화면 라우트).
///
/// 3D 감상실 장면(WebView, `init`의 church = `glass_room`, 혼자·실시간 접속 없음)에 브리지로
/// `viewWindow`를 보내 창을 연다. 덮개 UI(뒤로·정보·빛)는 3초 가만히 있으면 사라진다.
/// 장면이 `ViewReady`를 보내기 전에는 번들 1k 사진 위에 반짝이는 자리표시를 보인다.
/// WebGL·메모리 오류(`ViewError`)나 WebView 로딩 실패에서는 평면 보기([GlassFlatViewer])로
/// 내려가고, 그 밖의 오류는 '다시 시도'와 '평면 보기'를 보여 준다.
class GlassViewScreen extends StatefulWidget {
  const GlassViewScreen({
    super.key,
    required this.window,
    this.settings,
    this.from = 'gallery',
    this.scene,
    this.onPray,
    this.startFlat,
    this.loadTimeout = const Duration(seconds: 25),
    this.endTimeout = const Duration(milliseconds: 400),
    this.immersive = true,
    this.chromeIdle = const Duration(seconds: 3),
  });

  final GlassWindow window;

  /// 아바타·화질 설정. 없으면 기본값(시험·단독 사용).
  final AppSettings? settings;

  /// 분석 `glass_open.from`: gallery | today | church | widget | collection.
  final String from;

  /// 시험용 주입. 없으면 WebView 장면을 만들고 화면이 정리한다.
  final ChurchSceneController? scene;

  /// '기도' 버튼. 화면을 닫은 뒤 호출한다. 없으면 버튼을 숨긴다.
  final VoidCallback? onPray;

  /// 처음부터 평면 보기로 연다. 없으면 설정이 '간단 모드'일 때만 평면 보기.
  final bool? startFlat;

  /// `ViewReady`가 오지 않는 최대 시간.
  final Duration loadTimeout;

  /// 나갈 때 `ViewEnd`를 기다리는 최대 시간.
  final Duration endTimeout;

  /// 시스템 바를 숨긴다(시험에서는 끌 수 있다).
  final bool immersive;

  final Duration chromeIdle;

  @override
  State<GlassViewScreen> createState() => _GlassViewScreenState();
}

class _GlassViewScreenState extends State<GlassViewScreen> {
  late final GlassChromeController _chrome = GlassChromeController(
    idle: widget.chromeIdle,
  );
  ChurchSceneController? _scene;
  bool _ownsScene = false;
  StreamSubscription<SceneEvent>? _sub;
  Timer? _loadTimer;

  late _Mode _mode;
  _Phase _phase = _Phase.loading;
  String? _flatNotice;
  GlassLight _light = GlassLight.ref;
  bool _nightNote = false;
  Timer? _nightTimer;
  static bool _nightNoteShown = false;

  final Stopwatch _watch = Stopwatch()..start();
  Stopwatch _loadWatch = Stopwatch()..start();
  double _zoomMax = 1;
  bool _panned = false;
  double _fpsSum = 0;
  int _fpsN = 0;
  bool _ended = false;
  bool _leaving = false;
  bool _inited = false;

  GlassWindow get _w => widget.window;

  @override
  void initState() {
    super.initState();
    final flat =
        widget.startFlat ?? widget.settings?.churchQuality == ChurchQuality.low;
    _mode = flat ? _Mode.flat : _Mode.room;
    Track.glassOpen(_w.id, from: widget.from, view: flat ? 'flat' : 'room');
    if (widget.immersive) _setImmersive(true);
    if (_mode == _Mode.room) _startRoom();
  }

  void _setImmersive(bool on) {
    try {
      unawaited(
        SystemChrome.setEnabledSystemUIMode(
          on ? SystemUiMode.immersiveSticky : SystemUiMode.edgeToEdge,
        ).catchError((Object e) => debugPrint('system ui mode failed: $e')),
      );
    } catch (e) {
      debugPrint('system ui mode failed: $e');
    }
  }

  // --- 3D 감상실 ---

  void _startRoom() {
    _ownsScene = widget.scene == null;
    final scene = _scene = widget.scene ?? WebViewChurchSceneController();
    _sub = scene.events.listen(_onScene);
    scene.loadState.addListener(_onLoadState);
    _loadWatch = Stopwatch()..start();
    _armLoadTimer();
    _chrome.pinned = true; // 불러오는 동안은 덮개를 숨기지 않는다.
  }

  void _armLoadTimer() {
    _loadTimer?.cancel();
    _loadTimer = Timer(widget.loadTimeout, () {
      if (_phase == _Phase.loading && mounted) {
        Track.glassLoad(
          _w.id,
          tier: 't1',
          ms: _loadWatch.elapsedMilliseconds,
          ok: false,
        );
        _fail();
      }
    });
  }

  void _onLoadState() {
    final scene = _scene;
    if (scene == null || !mounted) return;
    if (scene.loadState.value == SceneLoad.error && _phase == _Phase.loading) {
      // WebView가 장면 페이지를 못 불러옴: 다시 그려도 소용이 없으니 평면 보기로.
      Track.glassLoad(
        _w.id,
        tier: 't1',
        ms: _loadWatch.elapsedMilliseconds,
        ok: false,
      );
      _fallbackToFlat('3D 장면을 열 수 없어 평면으로 보여 드려요.');
    }
  }

  void _onScene(SceneEvent e) {
    if (!mounted || _mode != _Mode.room) return;
    switch (e) {
      case SceneReady():
        _initScene();
      case ViewReady() when e.win == _w.id || e.win.isEmpty:
        _loadTimer?.cancel();
        Track.glassLoad(
          _w.id,
          tier: e.tier,
          ms: e.ms > 0 ? e.ms : _loadWatch.elapsedMilliseconds,
          ok: true,
        );
        setState(() => _phase = _Phase.ready);
        _chrome.pinned = false;
        _chrome.show();
      case ViewError() when e.win == _w.id || e.win.isEmpty:
        _loadTimer?.cancel();
        Track.glassLoad(
          _w.id,
          tier: 't1',
          ms: _loadWatch.elapsedMilliseconds,
          ok: false,
        );
        if (e.reason.needsFlatFallback) {
          _fallbackToFlat('이 기기에서는 3D 감상이 어려워 평면으로 보여 드려요.');
        } else {
          _fail();
        }
      case ViewGesture():
        if (e.kind != ViewGestureKind.reset) _chrome.hide();
        if (e.kind == ViewGestureKind.pan) _panned = true;
        if (e.kind == ViewGestureKind.zoom && _zoomMax < 2) _zoomMax = 2;
      case ViewPerf():
        _fpsSum += e.fps;
        _fpsN++;
      case ViewEnd():
        break; // 나갈 때 _leave가 직접 기다린다.
      default:
        break;
    }
  }

  /// 장면 페이지가 준비되면 감상실을 초기화하고 창을 연다(솔로 장면, 접속 없음).
  void _initScene() {
    final scene = _scene;
    if (scene == null || _inited) return;
    _inited = true;
    final now = DateTime.now();
    final hour = now.hour + now.minute / 60;
    final avatar = (widget.settings?.churchAvatar ?? AvatarConfig.defaultConfig)
        .toJson();
    unawaited(() async {
      await scene.init(
        avatar: avatar,
        hour: hour,
        ambient: false,
        solo: true,
        quality: (widget.settings?.churchQuality ?? ChurchQuality.high).name,
        church: ChurchCatalog.glassRoomId,
      );
      await scene.viewWindow(win: _w.id, light: _light.key);
    }());
  }

  void _fail() {
    if (!mounted) return;
    setState(() => _phase = _Phase.error);
    _chrome.pinned = true;
  }

  void _retry() {
    final scene = _scene;
    if (scene == null) return;
    setState(() => _phase = _Phase.loading);
    _loadWatch = Stopwatch()..start();
    _armLoadTimer();
    _inited = false;
    unawaited(scene.reload());
  }

  void _disposeScene() {
    _loadTimer?.cancel();
    unawaited(_sub?.cancel());
    _sub = null;
    final scene = _scene;
    if (scene != null) {
      scene.loadState.removeListener(_onLoadState);
      if (_ownsScene) scene.dispose();
    }
    _scene = null;
  }

  /// 평면 보기로 내려간다(WebGL·메모리 오류, WebView 실패, 사용자 선택).
  void _fallbackToFlat(String? notice) {
    if (!mounted || _mode == _Mode.flat) return;
    final scene = _scene;
    if (scene != null && !scene.isDisposed && _phase == _Phase.ready) {
      unawaited(scene.endView());
    }
    _disposeScene();
    setState(() {
      _mode = _Mode.flat;
      _flatNotice = notice;
      _phase = _Phase.ready;
    });
    _chrome.pinned = false;
    _chrome.show();
  }

  // --- 조작 ---

  void _setLight(GlassLight l) {
    if (l == _light || _phase != _Phase.ready) return;
    setState(() {
      _light = l;
      if (l == GlassLight.night && !_nightNoteShown) {
        _nightNoteShown = true;
        _nightNote = true;
        _nightTimer?.cancel();
        _nightTimer = Timer(const Duration(seconds: 5), () {
          if (mounted) setState(() => _nightNote = false);
        });
      }
    });
    final now = DateTime.now();
    final hour = (now.hour + now.minute / 60).clamp(6.0, 20.0);
    unawaited(
      _scene?.setViewLight(
            light: l.key,
            hour: l == GlassLight.sun ? hour : null,
          ) ??
          Future<void>.value(),
    );
    _chrome.bump();
  }

  Future<void> _openInfo() async {
    _chrome.pinned = true;
    await showGlassInfoSheet(
      context,
      _w,
      onPray: widget.onPray == null ? null : () => unawaited(_pray()),
    );
    if (mounted) _chrome.pinned = _phase != _Phase.ready;
  }

  Future<void> _pray() async {
    Track.glassPray(_w.id, 'rosary');
    await _leave();
    widget.onPray?.call();
  }

  /// 나간다. 3D 장면이면 `endView`를 보내고 `ViewEnd`(머문 시간·확대·이동)를 잠깐 기다린다.
  Future<void> _leave() async {
    if (_leaving) return;
    _leaving = true;
    ViewEnd? end;
    final scene = _scene;
    if (_mode == _Mode.room &&
        scene != null &&
        !scene.isDisposed &&
        _phase == _Phase.ready) {
      final reply = scene.events
          .where((e) => e is ViewEnd)
          .cast<ViewEnd>()
          .first
          .timeout(widget.endTimeout);
      unawaited(scene.endView());
      try {
        end = await reply;
      } catch (_) {
        end = null;
      }
    }
    _finishTrack(end);
    if (mounted) Navigator.of(context).pop();
  }

  void _finishTrack(ViewEnd? end) {
    if (_ended) return;
    _ended = true;
    if (_fpsN > 0 && _mode == _Mode.room) {
      Track.event('perf', {
        'fps_avg': (_fpsSum / _fpsN).round(),
        'church': ChurchCatalog.glassRoomId,
      });
    }
    Track.glassViewEnd(
      _w.id,
      seconds: end?.seconds ?? _watch.elapsed.inSeconds,
      zoomMax: end?.zoomMax ?? _zoomMax,
      panned: end?.panned ?? _panned,
      light: _light.key,
    );
  }

  @override
  void dispose() {
    _finishTrack(null);
    _nightTimer?.cancel();
    _chrome.dispose();
    _disposeScene();
    if (widget.immersive) _setImmersive(false);
    super.dispose();
  }

  // --- 화면 ---

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) unawaited(_leave());
      },
      child: Scaffold(
        backgroundColor: kGlassStone,
        body: _mode == _Mode.flat ? _buildFlat() : _buildRoom(context),
      ),
    );
  }

  Widget _buildFlat() {
    return GlassFlatViewer(
      window: _w,
      notice: _flatNotice,
      onBack: () => unawaited(_leave()),
      onInfo: () => unawaited(_openInfo()),
      onZoom: (z) {
        if (z > _zoomMax) _zoomMax = z;
      },
      onPan: () => _panned = true,
      onLoaded: () {
        if (_flatNotice == null) {
          // 처음부터 평면으로 연 경우만 '불러오기 성공'을 기록한다(대체는 실패가 이미 기록됨).
          Track.glassLoad(
            _w.id,
            tier: 't2',
            ms: _loadWatch.elapsedMilliseconds,
            ok: true,
          );
        }
      },
    );
  }

  Widget _buildRoom(BuildContext context) {
    final scene = _scene;
    final theme = Theme.of(context);
    final reduce =
        MediaQuery.disableAnimationsOf(context) ||
        MediaQuery.accessibleNavigationOf(context);
    return GlassChromeLayer(
      controller: _chrome,
      top: GlassTopBar(
        title: _w.titleKo,
        onBack: () => unawaited(_leave()),
        onInfo: () => unawaited(_openInfo()),
        menu: PopupMenuButton<String>(
          key: const ValueKey('view-menu'),
          tooltip: '더보기',
          iconColor: kGlassOnStone,
          icon: const Icon(Icons.more_vert, color: kGlassOnStone),
          style: IconButton.styleFrom(
            backgroundColor: Colors.black38,
            minimumSize: const Size(48, 48),
          ),
          onSelected: (v) {
            switch (v) {
              case 'reset':
                unawaited(_scene?.resetView() ?? Future<void>.value());
              case 'flat':
                _fallbackToFlat(null);
            }
          },
          itemBuilder: (_) => [
            if (_phase == _Phase.ready)
              const PopupMenuItem(value: 'reset', child: Text('처음 구도로')),
            const PopupMenuItem(value: 'flat', child: Text('평면 원본 보기')),
          ],
        ),
      ),
      bottom: GlassBottomBar(
        children: [
          if (_nightNote)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                '밤에는 바깥 빛이 없어 창이 어둡습니다.',
                key: const ValueKey('night-note'),
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: kGlassOnStone,
                ),
              ),
            ),
          Text(
            '${_w.place} · ${glassSizeText(_w)}',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodyMedium?.copyWith(color: kGlassOnStone),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              _LightToggle(
                value: _light,
                enabled: _phase == _Phase.ready,
                onChanged: _setLight,
              ),
              if (widget.onPray != null)
                FilledButton.tonalIcon(
                  key: const ValueKey('view-pray'),
                  onPressed: () => unawaited(_pray()),
                  icon: const Icon(Icons.self_improvement),
                  label: const Text('기도'),
                ),
            ],
          ),
        ],
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (scene != null) scene.buildView(context),
          // 불러오는 동안·오류일 때 장면을 덮는다.
          if (_phase == _Phase.loading)
            _LoadingCover(window: _w, animate: !reduce)
          else if (_phase == _Phase.error)
            _ErrorCover(
              window: _w,
              onRetry: _retry,
              onFlat: () => _fallbackToFlat(null),
            ),
        ],
      ),
    );
  }
}

class _LightToggle extends StatelessWidget {
  const _LightToggle({
    required this.value,
    required this.enabled,
    required this.onChanged,
  });

  final GlassLight value;
  final bool enabled;
  final ValueChanged<GlassLight> onChanged;

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(
        segmentedButtonTheme: SegmentedButtonThemeData(
          style: SegmentedButton.styleFrom(
            foregroundColor: kGlassOnStone,
            backgroundColor: Colors.black45,
            selectedForegroundColor: Colors.black,
            selectedBackgroundColor: kGlassOnStone,
            disabledForegroundColor: kGlassOnStone.withValues(alpha: 0.5),
            side: const BorderSide(color: Colors.white38),
          ),
        ),
      ),
      child: SegmentedButton<GlassLight>(
        key: const ValueKey('view-light'),
        showSelectedIcon: false,
        segments: [
          for (final l in GlassLight.values)
            ButtonSegment(
              value: l,
              label: Text(l.label),
              icon: Icon(l.icon, size: 18),
              enabled: enabled,
            ),
        ],
        selected: {value},
        onSelectionChanged: (s) => onChanged(s.first),
      ),
    );
  }
}

/// 장면이 준비되기 전: 번들 1k 사진을 어둡게 깔고 빛이 훑고 지나가는 자리표시.
class _LoadingCover extends StatefulWidget {
  const _LoadingCover({required this.window, required this.animate});

  final GlassWindow window;
  final bool animate;

  @override
  State<_LoadingCover> createState() => _LoadingCoverState();
}

class _LoadingCoverState extends State<_LoadingCover>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1600),
  );

  @override
  void initState() {
    super.initState();
    if (widget.animate) _c.repeat();
  }

  @override
  void didUpdateWidget(_LoadingCover old) {
    super.didUpdateWidget(old);
    if (widget.animate && !_c.isAnimating) {
      _c.repeat();
    } else if (!widget.animate && _c.isAnimating) {
      _c.stop();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      liveRegion: true,
      label: '${widget.window.titleKo} 불러오는 중',
      child: ColoredBox(
        key: const ValueKey('view-loading'),
        color: kGlassStone,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 96, 24, 140),
              child: AnimatedBuilder(
                animation: _c,
                builder: (context, child) {
                  if (!widget.animate) return child!;
                  final t = _c.value;
                  return ShaderMask(
                    blendMode: BlendMode.srcATop,
                    shaderCallback: (r) => LinearGradient(
                      begin: Alignment(-1.5 + 3 * t, -0.6),
                      end: Alignment(-0.5 + 3 * t, 0.6),
                      colors: const [
                        Color(0x00FFFFFF),
                        Color(0x55FFFFFF),
                        Color(0x00FFFFFF),
                      ],
                    ).createShader(r),
                    child: child,
                  );
                },
                child: GlassPicture(
                  path: widget.window.file1k.path,
                  opacity: 0.55,
                ),
              ),
            ),
            Center(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: Text(
                    '창을 불러오는 중…',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: kGlassOnStone,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorCover extends StatelessWidget {
  const _ErrorCover({
    required this.window,
    required this.onRetry,
    required this.onFlat,
  });

  final GlassWindow window;
  final VoidCallback onRetry;
  final VoidCallback onFlat;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ColoredBox(
      key: const ValueKey('view-error'),
      color: kGlassStone,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: kGlassOnStone),
              const SizedBox(height: 12),
              Text(
                '창을 불러오지 못했습니다',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: kGlassOnStone,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                '평면 원본으로는 언제든 볼 수 있어요.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: kGlassOnStone.withValues(alpha: 0.8),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              Wrap(
                spacing: 12,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: [
                  OutlinedButton(
                    key: const ValueKey('view-retry'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: kGlassOnStone,
                      side: const BorderSide(color: Colors.white54),
                    ),
                    onPressed: onRetry,
                    child: const Text('다시 시도'),
                  ),
                  FilledButton(
                    key: const ValueKey('view-flat'),
                    style: FilledButton.styleFrom(
                      backgroundColor: kGlassOnStone,
                      foregroundColor: Colors.black,
                    ),
                    onPressed: onFlat,
                    child: const Text('평면 보기'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
