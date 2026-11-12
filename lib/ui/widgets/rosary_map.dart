import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import '../../app/rosary_style.dart';
import '../../domain/rosary_sequence.dart';

// ---------------------------------------------------------------------------
// 구슬 배치(순수 함수)
// ---------------------------------------------------------------------------

/// 지도에 그려지는 조각의 종류.
enum BeadKind { small, large, medal, crucifix }

/// 지도 위 한 조각(구슬, 메달, 십자가)의 위치와 크기.
@immutable
class BeadSlot {
  const BeadSlot({
    required this.center,
    required this.radius,
    required this.kind,
    this.decade,
    this.beadIndex,
  });

  final Offset center;

  /// 구슬은 반지름, 메달은 세로 반지름, 십자가는 세로 길이의 절반.
  final double radius;
  final BeadKind kind;

  /// 이 조각이 속한 단(1..5). 큰 구슬은 "뒤따르는 단". 서두 조각은 null.
  final int? decade;

  /// 단 안의 작은 구슬 번호 1..10, 서두 작은 구슬 1..3. 그 밖에는 null.
  final int? beadIndex;

  @override
  String toString() =>
      'BeadSlot($kind, $center, r=${radius.toStringAsFixed(2)}, '
      'decade=$decade, bead=$beadIndex)';
}

/// [layoutBeads]가 돌려주는 목록의 칸 번호. 목록은 기도 순서와 같다.
abstract final class RosarySlots {
  static const crucifix = 0;

  /// 십자가에 가까운 펜던트 큰 구슬(서두 주님의 기도).
  static const pendantOurFather = 1;

  /// 펜던트 작은 구슬 1..3은 2..4.
  static const pendantHailMary1 = 2;

  /// 메달에 가까운 펜던트 큰 구슬(서두 영광송).
  static const pendantGlory = 5;

  /// 고리의 첫 큰 구슬(1단 앞). 이후 단마다 큰 구슬 1개 + 작은 구슬 10개.
  static const loopStart = 6;
  static const perDecade = 11;
  static const medal = loopStart + 5 * perDecade; // 61
  static const count = medal + 1; // 62

  /// [decade]단 앞의 큰 구슬 칸 번호.
  static int decadeLarge(int decade) => loopStart + (decade - 1) * perDecade;

  /// [decade]단의 [bead]번째(1..10) 작은 구슬 칸 번호.
  static int decadeBead(int decade, int bead) => decadeLarge(decade) + bead;
}

/// 스텝이 가리키는 칸 번호([layoutBeads] 목록의 인덱스).
///
/// 영광송과 구원송은 단의 10번째 구슬에 머문다(마커는 쉬는 모양, [isRestingStep]).
int slotIndexForStep(RosaryStep step) {
  final d = step.decade;
  switch (step.kind) {
    case StepKind.signOfCross:
    case StepKind.apostlesCreed:
      return RosarySlots.crucifix;
    case StepKind.ourFather:
      return d == null
          ? RosarySlots.pendantOurFather
          : RosarySlots.decadeLarge(d);
    case StepKind.hailMary:
      final k = step.beadIndex ?? 1;
      return d == null
          ? RosarySlots.pendantHailMary1 + (k - 1)
          : RosarySlots.decadeBead(d, k);
    case StepKind.gloryBe:
      return d == null
          ? RosarySlots.pendantGlory
          : RosarySlots.decadeBead(d, 10);
    case StepKind.fatima:
      return RosarySlots.decadeBead(d ?? 5, 10);
    case StepKind.closing:
      return RosarySlots.medal;
  }
}

/// [slots]([layoutBeads] 결과)에서 [step]에 해당하는 조각.
BeadSlot slotForStep(List<BeadSlot> slots, RosaryStep step) =>
    slots[slotIndexForStep(step)];

/// 영광송/구원송은 구슬 위에서 쉬는 모양의 마커를 쓴다.
bool isRestingStep(RosaryStep step) =>
    step.decade != null &&
    (step.kind == StepKind.gloryBe || step.kind == StepKind.fatima);

class _UnitLayout {
  const _UnitLayout(this.slots, this.bounds);
  final List<BeadSlot> slots;
  final Rect bounds;
}

const _loopRx = 0.9;
const _loopRy = 1.0;
const _largeK = 1.35;
const _medalK = 1.6;
const _medalWidthK = 0.78;
const _crossK = 2.1;
const _crossWidthK = 0.65;
const _pendantGapK = 0.3;

final _UnitLayout _unit = _buildUnitLayout();

/// 세로 반지름 1인 단위 좌표계에서 전체 배치를 만든다(한 번만 계산).
_UnitLayout _buildUnitLayout() {
  const n = 1440;
  // 아래쪽 가운데에서 시작해 오른쪽으로 도는 타원 위의 점.
  Offset point(double t) {
    final th = math.pi / 2 - t;
    return Offset(_loopRx * math.cos(th), _loopRy * math.sin(th));
  }

  final cum = List<double>.filled(n + 1, 0);
  var prev = point(0);
  for (var i = 1; i <= n; i++) {
    final p = point(2 * math.pi * i / n);
    cum[i] = cum[i - 1] + (p - prev).distance;
    prev = p;
  }
  final perimeter = cum[n];

  Offset atArc(double s) {
    var lo = 0;
    var hi = n;
    while (hi - lo > 1) {
      final mid = (lo + hi) >> 1;
      if (cum[mid] <= s) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    final f = (s - cum[lo]) / (cum[lo + 1] - cum[lo]);
    return point(2 * math.pi * (lo + f) / n);
  }

  // 고리 구슬 55개 + 메달 자리. 첫/마지막 구슬은 메달에서 1.5칸 떨어진다.
  final step = perimeter / 57;
  final r = step * 0.42;
  final slots = List<BeadSlot?>.filled(RosarySlots.count, null);

  var k = 1;
  for (var d = 1; d <= 5; d++) {
    slots[RosarySlots.decadeLarge(d)] = BeadSlot(
      center: atArc((k + 0.5) * step),
      radius: r * _largeK,
      kind: BeadKind.large,
      decade: d,
    );
    k++;
    for (var b = 1; b <= 10; b++) {
      slots[RosarySlots.decadeBead(d, b)] = BeadSlot(
        center: atArc((k + 0.5) * step),
        radius: r,
        kind: BeadKind.small,
        decade: d,
        beadIndex: b,
      );
      k++;
    }
  }

  // 메달(고리 맨 아래)과 그 아래로 늘어진 펜던트.
  const medalCenter = Offset(0, _loopRy);
  final medalR = r * _medalK;
  slots[RosarySlots.medal] = BeadSlot(
    center: medalCenter,
    radius: medalR,
    kind: BeadKind.medal,
  );

  var y = medalCenter.dy + medalR;
  final gap = r * _pendantGapK;
  Offset place(double radius) {
    y += gap + radius;
    final c = Offset(0, y);
    y += radius;
    return c;
  }

  slots[RosarySlots.pendantGlory] = BeadSlot(
    center: place(r * _largeK),
    radius: r * _largeK,
    kind: BeadKind.large,
  );
  for (var b = 3; b >= 1; b--) {
    slots[RosarySlots.pendantHailMary1 + b - 1] = BeadSlot(
      center: place(r),
      radius: r,
      kind: BeadKind.small,
      beadIndex: b,
    );
  }
  slots[RosarySlots.pendantOurFather] = BeadSlot(
    center: place(r * _largeK),
    radius: r * _largeK,
    kind: BeadKind.large,
  );
  slots[RosarySlots.crucifix] = BeadSlot(
    center: place(r * _crossK),
    radius: r * _crossK,
    kind: BeadKind.crucifix,
  );

  final list = List<BeadSlot>.unmodifiable(slots.cast<BeadSlot>());
  Rect? bounds;
  for (final s in list) {
    final hw = switch (s.kind) {
      BeadKind.medal => s.radius * _medalWidthK,
      BeadKind.crucifix => s.radius * _crossWidthK,
      _ => s.radius,
    };
    final box = Rect.fromLTRB(
      s.center.dx - hw,
      s.center.dy - s.radius,
      s.center.dx + hw,
      s.center.dy + s.radius,
    );
    bounds = bounds == null ? box : bounds.expandToInclude(box);
  }
  return _UnitLayout(list, bounds!);
}

/// 묵주 전체(고리 + 펜던트)의 모든 조각 위치를 [size] 안에 가운데 맞춰 계산한다.
///
/// 결과는 [RosarySlots] 순서(= 기도 순서)로 62개: 십자가 1, 펜던트 큰 구슬 2와
/// 작은 구슬 3, 고리의 큰 구슬 5와 단마다 작은 구슬 10, 마지막에 메달.
/// 고리는 메달 오른쪽 옆에서 시작해 한 바퀴 돈다.
List<BeadSlot> layoutBeads(Size size) {
  const pad = 10.0;
  final u = _unit;
  final aw = math.max(size.width - 2 * pad, 1.0);
  final ah = math.max(size.height - 2 * pad, 1.0);
  final s = math.min(aw / u.bounds.width, ah / u.bounds.height);
  final ox = size.width / 2 - u.bounds.center.dx * s;
  final oy = size.height / 2 - u.bounds.center.dy * s;
  return List<BeadSlot>.unmodifiable([
    for (final b in u.slots)
      BeadSlot(
        center: Offset(b.center.dx * s + ox, b.center.dy * s + oy),
        radius: b.radius * s,
        kind: b.kind,
        decade: b.decade,
        beadIndex: b.beadIndex,
      ),
  ]);
}

// ---------------------------------------------------------------------------
// 움직임(순수 함수)
// ---------------------------------------------------------------------------

/// 초점에서 [d]칸 떨어진 구슬이 받는 어안(fisheye) 효과의 세기(0..1).
double fisheyeFalloff(double d) => math.exp(-d * d / 4.5);

/// 초점에서 [d]칸 떨어진 구슬의 확대 배율. 초점은 1.45, 멀수록 1.0.
double fisheyeScale(double d) => 1 + 0.45 * fisheyeFalloff(d);

/// 초점 근처 구슬이 고리 바깥쪽으로 밀리는 거리(반지름 [radius]의 0.35배까지).
double fisheyeNudge(double d, double radius) =>
    0.35 * radius * fisheyeFalloff(d);

/// 도착한 구슬이 튀어 오르는 스프링 배율(1 → 약 1.15 → 1). [u]는 0..1 진행도.
double popScale(double u) {
  if (u <= 0 || u >= 1) return 1;
  return 1 + 0.15 * (math.sin(math.pi * u) * (1 - u) / 0.58);
}

/// 방금 떠난 구슬이 살짝 눌렸다 돌아오는 배율(0.92 → 1). [u]는 0..1 진행도.
double squashScale(double u) {
  if (u <= 0) return 0.92;
  if (u >= 1) return 1;
  return 0.92 + 0.08 * Curves.easeOutCubic.transform(u);
}

/// 파문의 반지름 배수(구슬 반지름 기준). 보통 0.8→3, 큰 파문은 0.8→5.
double rippleRadiusFactor(double u, {bool big = false}) =>
    0.8 +
    ((big ? 5.0 : 3.0) - 0.8) * Curves.easeOutCubic.transform(u.clamp(0, 1));

/// 파문의 투명도(0.35 → 0).
double rippleAlpha(double u) => 0.35 * (1 - u.clamp(0.0, 1.0));

/// 손가락으로 위아래로 끄는 거리를 구슬 한 칸씩의 걸음(step)으로 바꾸는 계산.
///
/// [stride]만큼 끌면 한 걸음(아래 +1, 위 -1)이 된다. 실제 묵주를 넘기듯이 **한 번 끄는 동안은
/// 최대 [maxSteps]걸음**(기본 1)만 넘어가고, 길게 끌어도 더 넘어가지 않는다. 손을 떼고 다시
/// 끌어야([reset]) 다음 걸음이 된다. [maxSteps]가 0이면 제한 없이 거리만큼 넘어간다.
/// 아직 한 걸음이 되지 못한 거리는 [fraction](-1..1)으로 남아 구슬이 손가락을 따라 미끄러지게 한다.
class ScrubTracker {
  ScrubTracker({required this.stride, this.maxSteps = 1})
    : assert(stride > 0),
      assert(maxSteps >= 0);

  final double stride;
  final int maxSteps;
  double _remainder = 0;
  int _fired = 0;

  /// 아직 한 걸음이 되지 못한 거리의 비율. (-1, 1).
  double get fraction => _remainder / stride;

  /// 이번 끌기에서 이미 넘긴 걸음 수.
  int get fired => _fired;

  /// 세로 이동량 [dy]를 더하고, 새로 넘은 걸음 수(부호 있음)를 돌려준다.
  int addDy(double dy) {
    final limited = maxSteps > 0;
    if (limited && _fired >= maxSteps) return 0; // 한 칸 넘겼으면 손을 뗄 때까지 무시
    _remainder += dy;
    var steps = (_remainder / stride).truncate();
    if (limited) {
      final left = maxSteps - _fired;
      steps = steps.clamp(-left, left);
    }
    _remainder -= steps * stride;
    _fired += steps.abs();
    if (limited && _fired >= maxSteps) _remainder = 0;
    return steps;
  }

  /// 가로 이동은 무시하고 세로만 쓴다.
  int add(Offset delta) => addDy(delta.dy);

  void reset() {
    _remainder = 0;
    _fired = 0;
  }
}

/// 초점 이동 곡선: 아주 조금 지나쳤다가 돌아오는 easeOutBack.
const Curve rosaryFocusCurve = Curves.easeOutBack;

/// 출발 초점 [from]에서 [to] 칸으로 [start] 초에 시작한 이동의 [now] 초 시점 값.
double rosaryFocusAt(double from, int to, double start, double now) {
  final u = ((now - start) / 0.38).clamp(0.0, 1.0);
  return (from + (to - from) * rosaryFocusCurve.transform(u)).clamp(
    0.0,
    RosarySlots.count - 1.0,
  );
}

/// 사슬을 따라 [focus] 칸 위치의 점. 정수 칸 사이는 사슬을 따라 보간한다.
/// 펜던트 끝(영광송 칸)에서 고리 첫 구슬로 갈 때는 메달을 거쳐 간다.
Offset pointAlongChain(List<Offset> centers, double focus) {
  final xs = Float64List(centers.length);
  final ys = Float64List(centers.length);
  for (var i = 0; i < centers.length; i++) {
    xs[i] = centers[i].dx;
    ys[i] = centers[i].dy;
  }
  return pointAlongChainXY(xs, ys, focus);
}

/// [pointAlongChain]의 좌표 배열 버전(프레임마다 목록을 만들지 않으려고 쓴다).
Offset pointAlongChainXY(Float64List xs, Float64List ys, double focus) {
  final last = RosarySlots.count - 1;
  final f = focus.clamp(0.0, last.toDouble());
  final i = math.min(f.floor(), last - 1);
  final t = f - i;
  double lerp(double a, double b, double t) => a + (b - a) * t;
  if (i == RosarySlots.pendantGlory) {
    const m = RosarySlots.medal;
    if (t < 0.5) {
      final k = t * 2;
      return Offset(lerp(xs[i], xs[m], k), lerp(ys[i], ys[m], k));
    }
    final k = (t - 0.5) * 2;
    return Offset(lerp(xs[m], xs[i + 1], k), lerp(ys[m], ys[i + 1], k));
  }
  return Offset(lerp(xs[i], xs[i + 1], t), lerp(ys[i], ys[i + 1], t));
}

// ---------------------------------------------------------------------------
// 위젯
// ---------------------------------------------------------------------------

/// 묵주 전체를 한눈에 보여 주는 진행 지도. 현재 위치를 마커가 따라 움직인다.
class RosaryMap extends StatefulWidget {
  const RosaryMap({
    super.key,
    required this.step,
    required this.style,
    this.onTap,
    this.onStep,
    this.showLabel = true,
    this.animate = true,
  });

  final RosaryStep step;
  final RosaryStyle style;

  /// 있으면 탭할 수 있다(보통 전체 화면 지도를 연다).
  final VoidCallback? onTap;

  /// 지도 위에서 손가락을 아래로 끌면 +1, 위로 끌면 -1씩 불린다(구슬을 하나씩 넘기기).
  /// 접근성의 늘리기/줄이기 동작에도 연결된다.
  final void Function(int delta)? onStep;

  /// 왼쪽 아래의 '{d}단 · {k}/10' 표시.
  final bool showLabel;

  /// false면 맥박과 이동 애니메이션을 끈다. 시스템의 '애니메이션 줄이기'도 따른다.
  final bool animate;

  /// 왼쪽 아래에 쓰는 문구.
  static String labelFor(RosaryStep step) {
    if (step.kind == StepKind.closing) return '마침';
    final d = step.decade;
    if (d == null) return '서두';
    final k = switch (step.kind) {
      StepKind.hailMary => step.beadIndex ?? 0,
      StepKind.gloryBe || StepKind.fatima => 10,
      _ => 0,
    };
    return '$d단 · $k/10';
  }

  @override
  State<RosaryMap> createState() => _RosaryMapState();
}

class _RosaryMapState extends State<RosaryMap>
    with SingleTickerProviderStateMixin {
  static const _far = -1e9;

  /// 모든 움직임이 쓰는 시계(초). 한 개의 Ticker가 화면을 다시 그리게 한다.
  final ValueNotifier<double> _time = ValueNotifier<double>(0);
  late final Ticker _ticker = createTicker(
    (elapsed) => _time.value = elapsed.inMicroseconds / 1e6,
  );

  late int _curIdx = slotIndexForStep(widget.step);
  int _prevIdx = -1;
  late double _fromFocus = _curIdx.toDouble();
  double _moveStart = _far;
  double _popStart = _far;
  double _rippleStart = _far;
  bool _rippleBig = false;
  bool _animate = true;

  // 손가락으로 구슬 넘기기.
  final ValueNotifier<double> _scrub = ValueNotifier<double>(0);
  ScrubTracker? _tracker;
  bool _dragging = false;
  double _releaseFrom = 0;
  double _releaseStart = _far;
  double _stride = 40;

  _Geometry? _geometry;

  ImageStream? _stream;
  ui.Image? _image;
  late final ImageStreamListener _listener = ImageStreamListener(
    _onImage,
    onError: _onImageError,
  );

  bool get _resting => isRestingStep(widget.step);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _animate = widget.animate && !MediaQuery.disableAnimationsOf(context);
    _resolveImage();
    _syncTicker();
  }

  @override
  void didUpdateWidget(RosaryMap old) {
    super.didUpdateWidget(old);
    _animate = widget.animate && !MediaQuery.disableAnimationsOf(context);
    if (old.style != widget.style) {
      _releaseImage();
      _resolveImage();
    }
    final now = _time.value;
    final idx = slotIndexForStep(widget.step);
    if (idx != _curIdx) {
      _fromFocus = rosaryFocusAt(_fromFocus, _curIdx, _moveStart, now);
      _prevIdx = _curIdx;
      _curIdx = idx;
      // 끌고 있는 동안에는 초점이 손가락을 따라가므로 이동 애니메이션을 쓰지 않는다.
      _moveStart = _animate && !_dragging ? now : _far;
    } else {
      _prevIdx = -1;
    }
    if (!identical(old.step, widget.step)) {
      if (_animate) {
        _popStart = now;
        _rippleStart = now;
        _rippleBig = _isDecadeBoundary(old.step, widget.step);
      }
    }
    _syncTicker();
  }

  /// 한 단이 끝나거나(10번째 성모송) 새 단의 주님의 기도로 넘어가는 순간인지.
  static bool _isDecadeBoundary(RosaryStep from, RosaryStep to) =>
      (from.kind == StepKind.hailMary && from.beadIndex == 10) ||
      (to.kind == StepKind.ourFather && to.decade != null);

  /// 움직임을 켜면 시계를 돌리고, 끄면(동작 줄이기 등) 멈추고 모든 것을 즉시 최종 모습으로 둔다.
  void _syncTicker() {
    if (_animate) {
      if (!_ticker.isActive) {
        _time.value = 0;
        _ticker.start();
        _moveStart = _popStart = _rippleStart = _releaseStart = _far;
        _fromFocus = _curIdx.toDouble();
      }
    } else {
      if (_ticker.isActive) _ticker.stop();
      _moveStart = _popStart = _rippleStart = _releaseStart = _far;
      _fromFocus = _curIdx.toDouble();
    }
  }

  void _onDragStart(DragStartDetails d) {
    setState(() {
      _tracker = ScrubTracker(stride: _stride);
      _dragging = true;
      _scrub.value = 0;
      _moveStart = _far;
      _fromFocus = _curIdx.toDouble();
    });
  }

  void _onDragUpdate(DragUpdateDetails d) {
    final tracker = _tracker;
    if (tracker == null) return;
    final steps = tracker.add(d.delta);
    final onStep = widget.onStep;
    for (var i = 0; i < steps.abs(); i++) {
      onStep?.call(steps.sign);
    }
    _scrub.value = tracker.fraction;
  }

  void _onDragEnd([Object? _]) {
    if (!_dragging) return;
    setState(() {
      _dragging = false;
      _tracker = null;
      _moveStart = _far;
      _fromFocus = _curIdx.toDouble();
      if (_animate && _scrub.value != 0) {
        _releaseFrom = _scrub.value;
        _releaseStart = _time.value;
      } else {
        _releaseFrom = 0;
      }
      _scrub.value = 0;
    });
  }

  void _resolveImage() {
    final stream = AssetImage(widget.style.unitImage)
        .resolve(createLocalImageConfiguration(context));
    if (stream.key == _stream?.key) return;
    _stream?.removeListener(_listener);
    _stream = stream;
    stream.addListener(_listener);
  }

  void _releaseImage() {
    _stream?.removeListener(_listener);
    _stream = null;
    _image?.dispose();
    _image = null;
  }

  void _onImage(ImageInfo info, bool synchronousCall) {
    final old = _image;
    _image = info.image.clone();
    old?.dispose();
    if (!synchronousCall && mounted) setState(() {});
  }

  void _onImageError(Object error, StackTrace? stack) {
    // 이미지를 못 읽으면 색깔 원으로 그린다.
    if (_image != null) {
      _image!.dispose();
      _image = null;
      if (mounted) setState(() {});
    }
  }

  @override
  void dispose() {
    _releaseImage();
    _ticker.dispose();
    _time.dispose();
    _scrub.dispose();
    super.dispose();
  }

  _Geometry _geometryFor(Size size) {
    final g = _geometry;
    if (g != null && g.size == size) return g;
    return _geometry = _Geometry(size, layoutBeads(size));
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final style = widget.style;
    final label = RosaryMap.labelFor(widget.step);

    return Semantics(
      container: true,
      excludeSemantics: true,
      button: widget.onTap != null,
      onTap: widget.onTap,
      label: '묵주 지도, 현재 $label',
      value: widget.step.title,
      increasedValue: '다음',
      decreasedValue: '이전',
      onIncrease: widget.onStep == null ? null : () => widget.onStep!(1),
      onDecrease: widget.onStep == null ? null : () => widget.onStep!(-1),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onTap,
        onVerticalDragStart: widget.onStep == null ? null : _onDragStart,
        onVerticalDragUpdate: widget.onStep == null ? null : _onDragUpdate,
        onVerticalDragEnd: widget.onStep == null ? null : _onDragEnd,
        onVerticalDragCancel: widget.onStep == null ? null : _onDragEnd,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final size = Size(
              constraints.hasBoundedWidth ? constraints.maxWidth : 240,
              constraints.hasBoundedHeight ? constraints.maxHeight : 240,
            );
            final geometry = _geometryFor(size);
            _stride = (size.shortestSide / 8).clamp(28.0, 56.0);
            final painter = _RosaryMapPainter(
              geometry: geometry,
              cur: _curIdx,
              prev: _prevIdx,
              fromFocus: _fromFocus,
              moveStart: _moveStart,
              popStart: _popStart,
              rippleStart: _rippleStart,
              rippleBig: _rippleBig,
              animate: _animate,
              time: _time,
              scrub: _scrub,
              dragging: _dragging,
              releaseFrom: _releaseFrom,
              releaseStart: _releaseStart,
              resting: _resting,
              image: _image,
              beadColor: style.beadColor,
              accentColor: style.accentColor,
              primary: scheme.primary,
              secondary: scheme.secondary,
            );
            return Stack(
              fit: StackFit.expand,
              children: [
                RepaintBoundary(
                  child: CustomPaint(painter: painter, size: size),
                ),
                if (widget.showLabel)
                  Positioned(
                    left: 6,
                    bottom: 2,
                    child: Text(
                      label,
                      style: text.labelMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                if (widget.onTap != null)
                  Positioned(
                    right: 4,
                    top: 2,
                    child: Icon(
                      Icons.open_in_full_rounded,
                      size: 16,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

/// 크기별로 한 번만 만드는 배치와 프레임마다 다시 쓰는 작업 버퍼.
class _Geometry {
  _Geometry(this.size, this.slots)
    : n = slots.length,
      xs = Float64List(slots.length),
      ys = Float64List(slots.length),
      scales = Float64List(slots.length),
      dirX = Float64List(slots.length),
      dirY = Float64List(slots.length) {
    // 고리 구슬들의 평균을 고리 중심으로 보고, 각 조각이 밀릴 바깥 방향을 미리 구한다.
    var cx = 0.0;
    var cy = 0.0;
    for (var i = RosarySlots.loopStart; i < RosarySlots.medal; i++) {
      cx += slots[i].center.dx;
      cy += slots[i].center.dy;
    }
    final loopCount = RosarySlots.medal - RosarySlots.loopStart;
    center = Offset(cx / loopCount, cy / loopCount);
    for (var i = 0; i < n; i++) {
      final v = slots[i].center - center;
      final len = v.distance;
      dirX[i] = len == 0 ? 0 : v.dx / len;
      dirY[i] = len == 0 ? 1 : v.dy / len;
    }
  }

  final Size size;
  final List<BeadSlot> slots;
  final int n;
  late final Offset center;

  /// 이번 프레임의 조각별 위치와 배율(그리는 동안만 유효).
  final Float64List xs;
  final Float64List ys;
  final Float64List scales;
  final Float64List dirX;
  final Float64List dirY;

  /// 사슬. 조각이 밀리면 함께 움직이도록 프레임마다 다시 채운다.
  final Path chain = Path();

  double get smallRadius => slots[RosarySlots.loopStart + 1].radius;
  double get largeRadius => slots[RosarySlots.loopStart].radius;
}

enum _SlotState { before, current, after }

class _RosaryMapPainter extends CustomPainter {
  _RosaryMapPainter({
    required this.geometry,
    required this.cur,
    required this.prev,
    required this.fromFocus,
    required this.moveStart,
    required this.popStart,
    required this.rippleStart,
    required this.rippleBig,
    required this.animate,
    required this.time,
    required this.scrub,
    required this.dragging,
    required this.releaseFrom,
    required this.releaseStart,
    required this.resting,
    required this.image,
    required this.beadColor,
    required this.accentColor,
    required this.primary,
    required this.secondary,
  }) : super(repaint: Listenable.merge([time, scrub])) {
    final smallR = geometry.smallRadius;
    _chainPaint
      ..color = accentColor.withValues(alpha: 0.35)
      ..style = PaintingStyle.stroke
      ..strokeWidth = math.max(0.8, smallR * 0.22);
    _ring
      ..color = secondary.withValues(alpha: 0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = math.max(0.7, smallR * 0.18);
    _glowFill
      ..color = primary.withValues(alpha: resting ? 0.14 : 0.26)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, math.max(2, smallR));
    _glowRing
      ..color = primary.withValues(alpha: resting ? 0.5 : 0.85)
      ..style = PaintingStyle.stroke
      ..strokeWidth = math.max(1.2, smallR * (resting ? 0.3 : 0.4));
    _ripple
      ..style = PaintingStyle.stroke
      ..strokeWidth = math.max(1.0, smallR * 0.25);
    _stroke.style = PaintingStyle.stroke;
    _cross
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = math.max(1.5, geometry.slots[0].radius * 0.28);
    _imgDim.color = const Color(0x73FFFFFF); // 45%

    _beadFull = beadColor;
    _beadDim = beadColor.withValues(alpha: 0.45);
    _accentFull = accentColor;
    _accentDim = accentColor.withValues(alpha: 0.45);

    final img = image;
    if (img != null) {
      final imgSize = Size(img.width.toDouble(), img.height.toDouble());
      _src = Offset.zero & imgSize;
      _smallDst = _fit(imgSize, smallR);
      _largeDst = _fit(imgSize, geometry.largeRadius);
    }
    final medalR = geometry.slots[RosarySlots.medal].radius;
    _medalRect = Rect.fromCenter(
      center: Offset.zero,
      width: 2 * medalR * _medalWidthK,
      height: 2 * medalR,
    );
    final crossR = geometry.slots[RosarySlots.crucifix].radius;
    _crossPath = Path()
      ..moveTo(0, -crossR)
      ..lineTo(0, crossR)
      ..moveTo(-crossR * _crossWidthK, -crossR * 0.35)
      ..lineTo(crossR * _crossWidthK, -crossR * 0.35);
  }

  final _Geometry geometry;
  final int cur;
  final int prev;
  final double fromFocus;
  final double moveStart;
  final double popStart;
  final double rippleStart;
  final bool rippleBig;
  final bool animate;
  final ValueListenable<double> time;
  final ValueListenable<double> scrub;
  final bool dragging;
  final double releaseFrom;
  final double releaseStart;
  final bool resting;
  final ui.Image? image;
  final Color beadColor;
  final Color accentColor;
  final Color primary;
  final Color secondary;

  static const _popSeconds = 0.42;
  static const _breathSeconds = 7.0;
  static const _breathRadians = 0.5 * math.pi / 180;

  static Rect _fit(Size src, double r) {
    final dest = applyBoxFit(BoxFit.contain, src, Size.square(2 * r));
    return Rect.fromCenter(
      center: Offset.zero,
      width: dest.destination.width,
      height: dest.destination.height,
    );
  }

  // 프레임마다 새로 만들지 않도록 생성 때 한 번만 준비한다.
  final Paint _chainPaint = Paint();
  final Paint _ring = Paint();
  final Paint _glowFill = Paint();
  final Paint _glowRing = Paint();
  final Paint _ripple = Paint();
  final Paint _fill = Paint();
  final Paint _stroke = Paint();
  final Paint _cross = Paint();
  final Paint _img = Paint()..filterQuality = FilterQuality.medium;
  final Paint _imgDim = Paint()..filterQuality = FilterQuality.medium;
  late final Color _beadFull;
  late final Color _beadDim;
  late final Color _accentFull;
  late final Color _accentDim;
  Rect _src = Rect.zero;
  Rect _smallDst = Rect.zero;
  Rect _largeDst = Rect.zero;
  late final Rect _medalRect;
  late final Path _crossPath;

  @override
  void paint(Canvas canvas, Size size) {
    final g = geometry;
    final slots = g.slots;
    final now = time.value;
    final popU = (now - popStart) / _popSeconds;
    final moveU = popU;

    // 손가락으로 넘기는 중이면 현재 칸에서 손가락만큼 앞/뒤로, 놓으면 스프링처럼 돌아온다.
    var s = 0.0;
    if (animate) {
      if (dragging) {
        s = scrub.value;
      } else if (releaseFrom != 0) {
        final u = ((now - releaseStart) / 0.26).clamp(0.0, 1.0);
        s = releaseFrom * (1 - Curves.easeOutBack.transform(u));
      }
    }
    if (cur <= 0) s = math.max(s, -0.4);
    if (cur >= RosarySlots.count - 1) s = math.min(s, 0.4);
    final base = dragging
        ? cur.toDouble()
        : rosaryFocusAt(fromFocus, cur, moveStart, now);
    final focus = (base + s).clamp(0.0, RosarySlots.count - 1.0);

    // 1) 초점 근처 구슬을 키우고 바깥으로 살짝 민다.
    for (var i = 0; i < g.n; i++) {
      final d = (i - focus).abs();
      final slot = slots[i];
      var scale = 1.0;
      var nudge = 0.0;
      if (d < 7) {
        scale = fisheyeScale(d);
        nudge = fisheyeNudge(d, slot.radius);
      }
      if (i == cur) {
        scale *= popScale(popU);
      } else if (i == prev && moveU < 1) {
        scale *= squashScale(moveU);
      }
      g.xs[i] = slot.center.dx + g.dirX[i] * nudge;
      g.ys[i] = slot.center.dy + g.dirY[i] * nudge;
      g.scales[i] = scale;
    }

    canvas.save();
    if (animate) {
      // 아주 느린 숨쉬기: 전체가 ±0.5° 흔들린다.
      final angle =
          _breathRadians * math.sin(2 * math.pi * now / _breathSeconds);
      final c = Offset(size.width / 2, size.height / 2);
      canvas.translate(c.dx, c.dy);
      canvas.rotate(angle);
      canvas.translate(-c.dx, -c.dy);
    }

    _drawChain(canvas);

    for (var i = 0; i < g.n; i++) {
      if (i == cur) continue;
      _drawSlot(
        canvas,
        slots[i],
        i < cur ? _SlotState.before : _SlotState.after,
        g.xs[i],
        g.ys[i],
        g.scales[i],
      );
    }

    _drawRipple(canvas, now);

    final marker = pointAlongChainXY(g.xs, g.ys, focus);
    _drawMarker(canvas, marker.dx, marker.dy, slots[cur], now);
    _drawSlot(
      canvas,
      slots[cur],
      _SlotState.current,
      g.xs[cur],
      g.ys[cur],
      g.scales[cur],
    );
    canvas.restore();
  }

  /// 밀린 위치를 따라 사슬을 다시 잇는다.
  void _drawChain(Canvas canvas) {
    final g = geometry;
    final path = g.chain..reset();
    path.moveTo(g.xs[RosarySlots.crucifix], g.ys[RosarySlots.crucifix]);
    for (var i = 1; i <= RosarySlots.pendantGlory; i++) {
      path.lineTo(g.xs[i], g.ys[i]);
    }
    const m = RosarySlots.medal;
    path
      ..lineTo(g.xs[m], g.ys[m])
      ..moveTo(g.xs[m], g.ys[m]);
    for (var i = RosarySlots.loopStart; i < m; i++) {
      path.lineTo(g.xs[i], g.ys[i]);
    }
    path.lineTo(g.xs[m], g.ys[m]);
    canvas.drawPath(path, _chainPaint);
  }

  /// 도착할 때마다 현재 구슬에서 퍼지는 고리 한 개(단이 바뀔 때는 더 크고 길게).
  void _drawRipple(Canvas canvas, double now) {
    final seconds = rippleBig ? 0.9 : 0.6;
    final u = (now - rippleStart) / seconds;
    if (u < 0 || u >= 1) return;
    final g = geometry;
    final r = g.slots[cur].radius * rippleRadiusFactor(u, big: rippleBig);
    _ripple.color = (rippleBig ? secondary : primary).withValues(
      alpha: rippleAlpha(u),
    );
    canvas.drawCircle(Offset(g.xs[cur], g.ys[cur]), r, _ripple);
  }

  void _drawMarker(
    Canvas canvas,
    double x,
    double y,
    BeadSlot slot,
    double now,
  ) {
    final p = (resting || !animate)
        ? 0.0
        : 0.5 - 0.5 * math.cos(2 * math.pi * now / 2.4);
    final base = math.max(slot.radius * 1.5 * 1.4, 9.0);
    final r = base + p * math.max(2.0, slot.radius * 0.45);
    canvas.save();
    canvas.translate(x, y);
    canvas.drawCircle(Offset.zero, r, _glowFill);
    canvas.drawCircle(Offset.zero, r, _glowRing);
    canvas.restore();
  }

  void _drawSlot(
    Canvas canvas,
    BeadSlot slot,
    _SlotState state,
    double x,
    double y,
    double scale,
  ) {
    final dim = state == _SlotState.after;
    canvas.save();
    canvas.translate(x, y);
    if (scale != 1) canvas.scale(scale);
    switch (slot.kind) {
      case BeadKind.small:
      case BeadKind.large:
        final r = slot.radius;
        final img = image;
        if (img != null) {
          canvas.drawImageRect(
            img,
            _src,
            slot.kind == BeadKind.large ? _largeDst : _smallDst,
            dim ? _imgDim : _img,
          );
        } else {
          canvas.drawCircle(
            Offset.zero,
            r,
            _fill..color = dim ? _beadDim : _beadFull,
          );
          canvas.drawCircle(
            Offset.zero,
            r,
            _stroke
              ..color = dim ? _accentDim : _accentFull
              ..strokeWidth = math.max(0.6, r * 0.14),
          );
        }
        if (state == _SlotState.before) {
          canvas.drawCircle(Offset.zero, r * 1.08, _ring);
        }
      case BeadKind.medal:
        canvas.drawOval(
          _medalRect,
          _fill..color = dim ? _accentDim : _accentFull,
        );
        canvas.drawOval(
          _medalRect.deflate(slot.radius * 0.22),
          _stroke
            ..color = dim ? _beadDim : _beadFull
            ..strokeWidth = math.max(0.6, slot.radius * 0.08),
        );
      case BeadKind.crucifix:
        canvas.drawPath(
          _crossPath,
          _cross..color = dim ? _accentDim : _accentFull,
        );
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_RosaryMapPainter old) =>
      old.geometry != geometry ||
      old.cur != cur ||
      old.prev != prev ||
      old.fromFocus != fromFocus ||
      old.moveStart != moveStart ||
      old.popStart != popStart ||
      old.rippleStart != rippleStart ||
      old.rippleBig != rippleBig ||
      old.animate != animate ||
      old.dragging != dragging ||
      old.releaseFrom != releaseFrom ||
      old.releaseStart != releaseStart ||
      old.resting != resting ||
      old.image != image ||
      old.beadColor != beadColor ||
      old.accentColor != accentColor ||
      old.primary != primary ||
      old.secondary != secondary;
}
