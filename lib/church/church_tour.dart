import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../app/settings.dart';
import '../app/theme.dart';
import '../app/track.dart';
import '../ui/widgets/guide_card.dart';

/// 성당 첫 입장 안내(직접 해 보며 따라하기)의 다섯 단계.
enum ChurchTourStep { walk, look, go, context, menu }

/// 단계마다 사용자가 실제로 하는 동작을 감지하고(걷기·둘러보기·가기), 해내면 '잘하셨어요!'를 잠깐 보인 뒤
/// 다음 단계로 넘기는 상태. 화면(ChurchScreen)이 입력을 [onStick]·[onLook]·[onPos]·[onGoOpened]로 알려 준다.
///
/// 끝까지 마치거나 '그만 보기'를 누르면 [AppSettings.churchTourDone]이 true 가 된다. 도중에 성당을 나가면
/// 완료로 치지 않으므로 다음에 성당에 들어올 때 처음(1단계)부터 다시 시작한다.
class ChurchTourController extends ChangeNotifier {
  ChurchTourController({
    required this.settings,
    this.holdDuration = const Duration(milliseconds: 1500),
    this.praiseDuration = const Duration(milliseconds: 1500),
  });

  final AppSettings settings;

  /// 손잡이를 이만큼 잡고 있으면 '걷기'를 해낸 것으로 본다.
  final Duration holdDuration;

  /// '잘하셨어요!'를 보이는 시간.
  final Duration praiseDuration;

  /// 걸은 거리(장면 좌표)가 이만큼이면 '걷기'를 해낸 것으로 본다.
  static const double walkDistance = 2.0;

  /// 시점 돌리기: 끌기 1픽셀을 이 각도로 보고, 누적이 [lookDegrees]이거나 [lookDrags]번 끌면 해낸 것.
  static const double degreesPerPixel = 0.25;
  static const double lookDegrees = 60;
  static const int lookDrags = 2;

  /// 한 번의 끌기로 칠 최소 움직임(픽셀).
  static const double dragMinPixels = 30;

  static int get stepCount => ChurchTourStep.values.length;

  bool _active = false;
  int _step = 0;
  bool _praise = false;
  Timer? _holdTimer;
  Timer? _praiseTimer;
  bool _disposed = false;

  // 단계별 누적
  double _walked = 0;
  (double, double)? _lastPos;
  double _turned = 0;
  int _drags = 0;
  double _dragPx = 0;

  bool get active => _active;
  int get step => _step;
  ChurchTourStep get current => ChurchTourStep.values[_step];

  /// '잘하셨어요!'를 보이는 중.
  bool get praising => _praise;
  bool get isLast => _step == stepCount - 1;

  /// 안내를 (처음부터) 시작한다.
  void start() {
    if (_active || _disposed) return;
    _active = true;
    _praise = false;
    _resetStep(0);
    Track.tourStart('church');
    notifyListeners();
  }

  void _resetStep(int i) {
    _step = i;
    _holdTimer?.cancel();
    _holdTimer = null;
    _walked = 0;
    _lastPos = null;
    _turned = 0;
    _drags = 0;
    _dragPx = 0;
  }

  /// '다음': 이 단계를 하지 않고 넘어간다(마지막 단계에서는 안내를 마친다).
  void next() {
    if (!_active) return;
    _praiseTimer?.cancel();
    _praise = false;
    if (isLast) {
      finish();
      return;
    }
    _resetStep(_step + 1);
    Track.tourStep('church', _step);
    notifyListeners();
  }

  /// 끝까지 마쳤다.
  void finish() {
    if (!_active) return;
    Track.tourDone('church');
    _end();
  }

  /// '그만 보기': 안내를 끝낸다(다시 나오지 않는다. 더보기·메뉴에서 다시 볼 수 있다).
  void quit() {
    if (!_active) return;
    Track.tourSkip('church', _step);
    _end();
  }

  /// 성당을 나가거나 화면이 닫혀 중간에 멈춘다: 완료로 치지 않는다(다음 입장에서 처음부터).
  void abandon() {
    if (!_active) return;
    _active = false;
    _holdTimer?.cancel();
    _praiseTimer?.cancel();
    _holdTimer = _praiseTimer = null;
  }

  void _end() {
    _active = false;
    _praise = false;
    _holdTimer?.cancel();
    _praiseTimer?.cancel();
    _holdTimer = _praiseTimer = null;
    settings.churchTourDone = true;
    if (!_disposed) notifyListeners();
  }

  /// 해낸 동작이 있으면 '잘하셨어요!'를 잠깐 보이고 다음 단계로 간다.
  void _complete(ChurchTourStep expected) {
    if (!_active || _praise || current != expected) return;
    _holdTimer?.cancel();
    _holdTimer = null;
    _praise = true;
    notifyListeners();
    _praiseTimer?.cancel();
    _praiseTimer = Timer(praiseDuration, () {
      if (_disposed || !_active || !_praise) return;
      next();
    });
  }

  // --- 입력 ---

  /// 이동 손잡이 값(-1..1). 0.3 넘게 밀고 [holdDuration] 동안 잡고 있으면 '걷기' 완료.
  void onStick(double x, double y) {
    if (!_active || current != ChurchTourStep.walk || _praise) return;
    final on = math.sqrt(x * x + y * y) > 0.3;
    if (!on) {
      _holdTimer?.cancel();
      _holdTimer = null;
      return;
    }
    _holdTimer ??= Timer(holdDuration, () {
      _holdTimer = null;
      _complete(ChurchTourStep.walk);
    });
  }

  /// 내 위치(장면 좌표). 걸은 거리가 [walkDistance]를 넘으면 '걷기' 완료.
  void onPos(double x, double z) {
    if (!_active || current != ChurchTourStep.walk || _praise) return;
    final last = _lastPos;
    _lastPos = (x, z);
    if (last == null) return;
    _walked += math.sqrt(math.pow(x - last.$1, 2) + math.pow(z - last.$2, 2));
    if (_walked >= walkDistance) _complete(ChurchTourStep.walk);
  }

  /// 시점 입력. `on` true/false 는 손가락이 닿고/떨어짐, dx·dy 는 끌기량(픽셀).
  void onLook({bool? on, double dx = 0, double dy = 0}) {
    if (!_active || current != ChurchTourStep.look || _praise) return;
    if (on == true) _dragPx = 0;
    if (dx != 0 || dy != 0) {
      _dragPx += math.sqrt(dx * dx + dy * dy);
      _turned += dx.abs() * degreesPerPixel;
      if (_turned >= lookDegrees) {
        _complete(ChurchTourStep.look);
        return;
      }
    }
    if (on == false) {
      if (_dragPx >= dragMinPixels) _drags++;
      _dragPx = 0;
      if (_drags >= lookDrags) _complete(ChurchTourStep.look);
    }
  }

  /// '가기' 시트가 열렸다.
  void onGoOpened() => _complete(ChurchTourStep.go);

  @override
  void dispose() {
    _disposed = true;
    _holdTimer?.cancel();
    _praiseTimer?.cancel();
    super.dispose();
  }
}

/// 위젯 트리에서 [key]를 가진 위젯의 자리(전체 화면 좌표)를 찾는다. 없거나 아직 배치되지 않았으면 null.
Rect? tourRectOfKey(BuildContext scope, Key key) {
  RenderBox? found;
  void visit(Element e) {
    if (found != null) return;
    if (e.widget.key == key) {
      final ro = e.findRenderObject();
      if (ro is RenderBox && ro.attached && ro.hasSize) found = ro;
      return;
    }
    e.visitChildren(visit);
  }

  (scope as Element).visitChildren(visit);
  final box = found;
  if (box == null || box.size.isEmpty) return null;
  // 장면 전환(확대·축소) 중인 위젯도 보이는 모양대로 잰다.
  return MatrixUtils.transformRect(
    box.getTransformTo(null),
    Offset.zero & box.size,
  );
}

/// 단계별 안내 글. (제목, 본문)
const Map<ChurchTourStep, (String, String)> churchTourTexts = {
  ChurchTourStep.walk: (
    '걷기',
    '왼쪽 아래 동그라미를 손가락으로 위로 밀면 앞으로 걸어가요. 한번 해 보세요.',
  ),
  ChurchTourStep.look: ('둘러보기', '오른쪽 화면을 손가락으로 옆으로 밀면 둘레를 둘러봐요.'),
  ChurchTourStep.go: ('가기', '가기를 누르면 촛불 봉헌대나 제대 앞으로 저절로 걸어가요.'),
  ChurchTourStep.context: (
    '할 수 있는 일',
    '제대 앞이나 자리, 촛불대 가까이 가면 오른쪽 아래에 할 수 있는 단추가 나타나요.',
  ),
  ChurchTourStep.menu: ('메뉴', '메뉴에서 성당 바꾸기, 사용법 다시 보기를 할 수 있어요.'),
};

/// 성당 화면 위에 얹는 안내: 가르치는 자리에 테두리와 손가락 그림을 보이고, 반대편에 큰 안내 카드를 둔다.
///
/// 터치를 막지 않는다(카드 밖은 모두 아래 화면으로 간다): 손잡이를 끌고 오른쪽 화면을 밀어 보는 것이 안내 자체다.
/// 이 위젯은 성당 화면의 Stack 맨 위(전체 크기)에 놓는다.
class ChurchTourOverlay extends StatefulWidget {
  const ChurchTourOverlay({
    super.key,
    required this.controller,
    required this.settings,
    required this.scope,
    required this.stickRight,
    this.speakBlocked,
  });

  final ChurchTourController controller;
  final AppSettings settings;

  /// 가르치는 위젯(손잡이·가기·상황 단추·메뉴)을 키로 찾을 범위(성당 화면의 Scaffold).
  final BuildContext Function() scope;

  /// 손잡이가 오른쪽 아래인가(둘러보기 자리와 카드 자리가 그 반대편이 된다).
  final bool stickRight;

  /// 기도 소리가 나는 중이면 true: 안내를 읽지 않는다.
  final bool Function()? speakBlocked;

  @override
  State<ChurchTourOverlay> createState() => _ChurchTourOverlayState();
}

class _ChurchTourOverlayState extends State<ChurchTourOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _loop = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1800),
  );
  bool _reduced = false;
  Rect? _rect;

  /// 가르치는 단추는 나타나는 동안 크기가 바뀌므로(M3 장면 전환) 조금씩 자리를 다시 잰다.
  Timer? _remeasure;

  ChurchTourController get _c => widget.controller;

  @override
  void initState() {
    super.initState();
    _c.addListener(_onChange);
    _remeasure = Timer.periodic(
      const Duration(milliseconds: 250),
      (_) => _measure(),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) => _measure());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduced = MediaQuery.disableAnimationsOf(context);
    if (reduced) {
      _loop.stop();
      _loop.value = 0.5;
    } else if (!_loop.isAnimating) {
      _loop.repeat();
    }
    _reduced = reduced;
  }

  @override
  void dispose() {
    _remeasure?.cancel();
    _c.removeListener(_onChange);
    _loop.dispose();
    super.dispose();
  }

  void _onChange() {
    if (!mounted) return;
    setState(() {});
    WidgetsBinding.instance.addPostFrameCallback((_) => _measure());
  }

  /// 가르치는 자리를 잰다(HUD 가 접히고 펴지거나 상황 단추가 나타나고 사라질 수 있다).
  Rect? _targetRect(Size size, EdgeInsets pad) {
    final scope = widget.scope();
    if (!scope.mounted) return null;
    final self = context.findRenderObject();
    if (self is! RenderBox || !self.hasSize) return null;
    Rect? local(Key k) {
      final r = tourRectOfKey(scope, k);
      if (r == null) return null;
      return r.shift(-self.localToGlobal(Offset.zero));
    }

    switch (_c.current) {
      case ChurchTourStep.walk:
        return local(const ValueKey('joystick-ring'));
      case ChurchTourStep.look:
        // 손잡이 반대편, 화면 위쪽 가운데 높이: 손잡이·상황 단추·아래 카드와 겹치지 않게.
        final w = size.width;
        final h = size.height;
        final left = widget.stickRight ? pad.left + 16 : w * 0.45;
        final right = widget.stickRight ? w * 0.55 : w - pad.right - 16;
        return Rect.fromLTRB(left, h * 0.24, right, h * 0.46);
      case ChurchTourStep.go:
        return local(const ValueKey('go-button'));
      case ChurchTourStep.context:
        for (final k in const ['ctx-sit', 'ctx-light', 'ctx-pray', 'ctx-cross']) {
          final r = local(ValueKey(k));
          if (r != null) return r;
        }
        // 지금은 단추가 없다: 나타날 자리(손잡이 반대편 아래 구석)를 보인다.
        const bw = 168.0;
        const bh = 64.0;
        final x = widget.stickRight
            ? pad.left + AppSpace.sm
            : size.width - pad.right - AppSpace.sm - bw;
        return Rect.fromLTWH(
          x,
          size.height - pad.bottom - AppSpace.sm - bh,
          bw,
          bh,
        );
      case ChurchTourStep.menu:
        final chip = local(const ValueKey('presence-chip'));
        final help = local(const ValueKey('hud-help'));
        final expand = local(const ValueKey('hud-expand'));
        final collapse = local(const ValueKey('hud-collapse'));
        Rect? u;
        for (final r in [chip, help, expand, collapse]) {
          if (r != null) u = u == null ? r : u.expandToInclude(r);
        }
        if (u == null) return null;
        return Rect.fromLTRB(
          pad.left + 12,
          u.top,
          size.width - pad.right - 12,
          u.bottom,
        );
    }
  }

  void _measure() {
    if (!mounted) return;
    final size = (context.findRenderObject() as RenderBox?)?.size;
    if (size == null) return;
    final r = _targetRect(size, MediaQuery.paddingOf(context));
    if (r != _rect) setState(() => _rect = r);
  }

  @override
  Widget build(BuildContext context) {
    final c = _c;
    if (!c.active) return const SizedBox.shrink();
    final scheme = Theme.of(context).colorScheme;
    final pad = MediaQuery.paddingOf(context);
    final step = c.current;
    // 가르치는 단추가 나타나고 사라지거나 메뉴가 접히고 펴져도 자리를 다시 잰다(바뀐 때만 다시 그린다).
    WidgetsBinding.instance.addPostFrameCallback((_) => _measure());
    final (title, body) = churchTourTexts[step]!;
    final rect = _rect;
    // 가르치는 자리가 화면 아래쪽이면 카드는 위, 위쪽이면 카드는 아래(가리지 않게).
    return LayoutBuilder(
      builder: (context, box) {
        final cardAtTop = rect == null
            ? step == ChurchTourStep.walk || step == ChurchTourStep.context
            : rect.center.dy > box.maxHeight / 2;
        final praise = c.praising;
        final card = GuideCard(
          keyPrefix: 'tour',
          counter: '${c.step + 1} / ${ChurchTourController.stepCount}',
          title: praise ? '잘하셨어요!' : title,
          text: praise ? '이제 다음으로 넘어가요.' : body,
          settings: widget.settings,
          speakBlocked: widget.speakBlocked,
          secondaryKey: const ValueKey('tour-quit'),
          secondaryLabel: '그만 보기',
          onSecondary: c.quit,
          primaryKey: const ValueKey('tour-next'),
          primaryLabel: c.isLast ? '시작해요' : '다음',
          onPrimary: c.next,
        );
        return Stack(
          key: const ValueKey('church-tour'),
          fit: StackFit.expand,
          children: [
            if (rect != null)
              Positioned.fill(
                key: const ValueKey('tour-ring-slot'),
                child: IgnorePointer(
                  child: ExcludeSemantics(
                    child: AnimatedBuilder(
                      animation: _loop,
                      builder: (context, _) => CustomPaint(
                        painter: _RingPainter(
                          rect: rect,
                          circle: step == ChurchTourStep.walk,
                          color: scheme.primary,
                          pulse: _reduced ? 0.5 : _loop.value,
                          praise: praise,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            if (rect != null && !praise)
              Positioned.fill(
                key: const ValueKey('tour-hand-slot'),
                child: IgnorePointer(
                  child: ExcludeSemantics(
                    child: AnimatedBuilder(
                      animation: _loop,
                      builder: (context, _) => _TourHand(
                        key: const ValueKey('tour-hand'),
                        rect: rect,
                        screen: box.biggest,
                        step: step,
                        t: _loop.value,
                        reduced: _reduced,
                        color: scheme.onSurface,
                        shadow: scheme.surface,
                      ),
                    ),
                  ),
                ),
              ),
            Positioned(
              key: const ValueKey('tour-card-slot'),
              left: pad.left + AppSpace.sm,
              right: pad.right + AppSpace.sm,
              top: cardAtTop ? pad.top + AppSpace.xs : null,
              bottom: cardAtTop ? null : pad.bottom + AppSpace.xs,
              child: Center(child: card),
            ),
          ],
        );
      },
    );
  }
}

/// 가르치는 자리의 테두리(숨 쉬듯 살짝 커졌다 작아진다. 동작 줄이기면 가만히).
class _RingPainter extends CustomPainter {
  const _RingPainter({
    required this.rect,
    required this.circle,
    required this.color,
    required this.pulse,
    required this.praise,
  });

  final Rect rect;
  final bool circle;
  final Color color;
  final double pulse;
  final bool praise;

  @override
  void paint(Canvas canvas, Size size) {
    final grow = 4 + 4 * math.sin(pulse * 2 * math.pi).abs();
    final r = rect.inflate(grow);
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..color = color;
    final glow = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..color = color.withValues(alpha: 0.25);
    if (circle) {
      final c = r.center;
      final rad = math.min(r.width, r.height) / 2;
      canvas.drawCircle(c, rad, glow);
      canvas.drawCircle(c, rad, stroke);
    } else {
      final rr = RRect.fromRectAndRadius(r, const Radius.circular(20));
      canvas.drawRRect(rr, glow);
      canvas.drawRRect(rr, stroke);
    }
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.rect != rect ||
      old.circle != circle ||
      old.color != color ||
      old.pulse != pulse ||
      old.praise != praise;
}

/// 되풀이 손가락 그림. 걷기: 손잡이 위에서 위로 밀기, 둘러보기: 옆으로 밀기, 그 밖: 누르기.
/// 동작 줄이기에서는 움직이지 않고 동작 방향을 화살표로 보인다.
class _TourHand extends StatelessWidget {
  const _TourHand({
    super.key,
    required this.rect,
    required this.screen,
    required this.step,
    required this.t,
    required this.reduced,
    required this.color,
    required this.shadow,
  });

  final Rect rect;
  final Size screen;
  final ChurchTourStep step;
  final double t;
  final bool reduced;
  final Color color;
  final Color shadow;

  static const double handSize = 56;

  @override
  Widget build(BuildContext context) {
    final e = Curves.easeInOut.transform(t);
    final opacity = reduced
        ? 1.0
        : (t < 0.15 ? t / 0.15 : (t > 0.85 ? (1 - t) / 0.15 : 1.0)).clamp(
            0.0,
            1.0,
          );
    Offset tip;
    IconData? arrow;
    switch (step) {
      case ChurchTourStep.walk:
        final r = math.min(rect.width, rect.height) / 2;
        // 아래쪽에서 위쪽으로 민다.
        final from = rect.center + Offset(0, r * 0.45);
        final to = rect.center - Offset(0, r * 0.45);
        tip = reduced ? from : Offset.lerp(from, to, e)!;
        arrow = Icons.keyboard_double_arrow_up;
      case ChurchTourStep.look:
        final from = Offset(rect.left + rect.width * 0.2, rect.center.dy);
        final to = Offset(rect.right - rect.width * 0.2, rect.center.dy);
        tip = reduced ? from : Offset.lerp(from, to, e)!;
        arrow = Icons.swap_horiz;
      default:
        // 누르기: 살짝 내려갔다 올라온다. 글자를 가리지 않게 손가락 끝을 단추 아래쪽 가장자리에 둔다.
        final dy = reduced ? 0.0 : 8 * math.sin(t * math.pi);
        // 화면 맨 아래 가까이 있는 단추는 손가락이 화면 밖으로 잘리지 않게 오른쪽 가장자리에 둔다.
        tip = rect.bottom > screen.height - 100
            ? Offset(rect.right - 28, rect.center.dy - 12 + dy)
            : Offset(rect.center.dx, rect.bottom - rect.height * 0.12 + dy);
    }
    final icon = Icon(
      Icons.touch_app,
      size: handSize,
      color: color,
      shadows: [Shadow(color: shadow, blurRadius: 6)],
    );
    return Stack(
      children: [
        if (arrow != null)
          Positioned(
            left: rect.center.dx - 18,
            top: rect.center.dy - 18,
            child: Opacity(
              opacity: reduced ? 0.9 : 0.55,
              child: Icon(
                arrow,
                size: 36,
                color: color,
                shadows: [Shadow(color: shadow, blurRadius: 6)],
              ),
            ),
          ),
        // 손가락 끝(아이콘의 위쪽 가운데)이 [tip]에 오게 놓는다.
        Positioned(
          left: tip.dx - handSize * 0.38,
          top: tip.dy - handSize * 0.08,
          child: Opacity(opacity: opacity, child: icon),
        ),
      ],
    );
  }
}
