import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../app/rosary_style.dart';
import '../../app/theme.dart';
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
// 위젯
// ---------------------------------------------------------------------------

/// 묵주 전체를 한눈에 보여 주는 진행 지도. 현재 위치를 마커가 따라 움직인다.
class RosaryMap extends StatefulWidget {
  const RosaryMap({
    super.key,
    required this.step,
    required this.style,
    this.onTap,
    this.showLabel = true,
    this.animate = true,
  });

  final RosaryStep step;
  final RosaryStyle style;

  /// 있으면 탭할 수 있다(보통 전체 화면 지도를 연다).
  final VoidCallback? onTap;

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

class _RosaryMapState extends State<RosaryMap> with TickerProviderStateMixin {
  static const _moveDuration = Duration(milliseconds: 350);
  static const _pulseDuration = Duration(milliseconds: 1200);

  late final AnimationController _move = AnimationController(
    vsync: this,
    duration: _moveDuration,
    value: 1,
  );
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: _pulseDuration,
  );

  late int _curIdx = slotIndexForStep(widget.step);
  int _prevIdx = -1;
  Offset? _fromCenter;
  bool _animate = true;

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
    _syncPulse();
  }

  @override
  void didUpdateWidget(RosaryMap old) {
    super.didUpdateWidget(old);
    _animate = widget.animate && !MediaQuery.disableAnimationsOf(context);
    if (old.style != widget.style) {
      _releaseImage();
      _resolveImage();
    }
    final idx = slotIndexForStep(widget.step);
    if (idx != _curIdx) {
      _fromCenter = _markerCenter();
      _prevIdx = _curIdx;
      _curIdx = idx;
      if (_animate) {
        _move.forward(from: 0);
      } else {
        _move.value = 1;
      }
    }
    _syncPulse();
  }

  /// 마커가 지금 있는 위치(이동 중이면 중간 지점).
  Offset? _markerCenter() {
    final g = _geometry;
    if (g == null) return null;
    final target = g.slots[_curIdx].center;
    final from = _fromCenter ?? target;
    return Offset.lerp(
      from,
      target,
      Curves.easeOutCubic.transform(_move.value),
    );
  }

  void _syncPulse() {
    final want = _animate && !_resting;
    if (want && !_pulse.isAnimating) {
      _pulse.repeat(reverse: true);
    } else if (!want && _pulse.isAnimating) {
      _pulse.stop();
    }
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
    _move.dispose();
    _pulse.dispose();
    super.dispose();
  }

  _Geometry _geometryFor(Size size) {
    final g = _geometry;
    if (g != null && g.size == size) return g;
    // 크기가 바뀌면 이동 중이던 마커는 그냥 제자리로 둔다.
    _fromCenter = null;
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
      label: '묵주 전체 진행, $label',
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onTap,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final size = Size(
              constraints.hasBoundedWidth ? constraints.maxWidth : 240,
              constraints.hasBoundedHeight ? constraints.maxHeight : 240,
            );
            final geometry = _geometryFor(size);
            final painter = _RosaryMapPainter(
              geometry: geometry,
              cur: _curIdx,
              prev: _prevIdx,
              fromCenter: _fromCenter,
              move: _move,
              pulse: _pulse,
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
                      style: (text.labelMedium ?? const TextStyle()).copyWith(
                        fontFamily: AppTheme.sansFamily,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
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
                      color: scheme.onSurfaceVariant.withValues(alpha: 0.7),
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

/// 크기별로 한 번만 만드는 배치와 사슬 경로.
class _Geometry {
  _Geometry(this.size, this.slots) : chain = _buildChain(slots);

  final Size size;
  final List<BeadSlot> slots;
  final Path chain;

  double get smallRadius => slots[RosarySlots.loopStart + 1].radius;
  double get largeRadius => slots[RosarySlots.loopStart].radius;

  static Path _buildChain(List<BeadSlot> slots) {
    final medal = slots[RosarySlots.medal].center;
    final path = Path()
      ..moveTo(
        slots[RosarySlots.crucifix].center.dx,
        slots[RosarySlots.crucifix].center.dy,
      );
    for (var i = 1; i <= RosarySlots.pendantGlory; i++) {
      path.lineTo(slots[i].center.dx, slots[i].center.dy);
    }
    path
      ..lineTo(medal.dx, medal.dy)
      ..moveTo(medal.dx, medal.dy);
    for (var i = RosarySlots.loopStart; i < RosarySlots.medal; i++) {
      path.lineTo(slots[i].center.dx, slots[i].center.dy);
    }
    path.lineTo(medal.dx, medal.dy);
    return path;
  }
}

enum _SlotState { before, current, after }

class _RosaryMapPainter extends CustomPainter {
  _RosaryMapPainter({
    required this.geometry,
    required this.cur,
    required this.prev,
    required this.fromCenter,
    required this.move,
    required this.pulse,
    required this.resting,
    required this.image,
    required this.beadColor,
    required this.accentColor,
    required this.primary,
    required this.secondary,
  }) : super(repaint: Listenable.merge([move, pulse])) {
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
  final Offset? fromCenter;
  final Animation<double> move;
  final Animation<double> pulse;
  final bool resting;
  final ui.Image? image;
  final Color beadColor;
  final Color accentColor;
  final Color primary;
  final Color secondary;

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
    final slots = geometry.slots;
    canvas.drawPath(geometry.chain, _chainPaint);

    final t = Curves.easeOutCubic.transform(move.value);
    for (var i = 0; i < slots.length; i++) {
      if (i == cur) continue;
      final scale = (i == prev && t < 1) ? 1.5 - 0.5 * t : 1.0;
      _drawSlot(
        canvas,
        slots[i],
        i < cur ? _SlotState.before : _SlotState.after,
        scale,
      );
    }

    final target = slots[cur];
    final from = fromCenter ?? target.center;
    final mx = from.dx + (target.center.dx - from.dx) * t;
    final my = from.dy + (target.center.dy - from.dy) * t;
    _drawMarker(canvas, mx, my, target);
    _drawSlot(canvas, target, _SlotState.current, 1 + 0.5 * t);
  }

  void _drawMarker(Canvas canvas, double x, double y, BeadSlot slot) {
    final p = resting ? 0.0 : Curves.easeInOut.transform(pulse.value);
    final base = math.max(slot.radius * 1.5 * 1.4, 9.0);
    final r = base + p * math.max(2.0, slot.radius * 0.45);
    canvas.save();
    canvas.translate(x, y);
    canvas.drawCircle(Offset.zero, r, _glowFill);
    canvas.drawCircle(Offset.zero, r, _glowRing);
    canvas.restore();
  }

  void _drawSlot(Canvas canvas, BeadSlot slot, _SlotState state, double scale) {
    final dim = state == _SlotState.after;
    canvas.save();
    canvas.translate(slot.center.dx, slot.center.dy);
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
      old.fromCenter != fromCenter ||
      old.resting != resting ||
      old.image != image ||
      old.beadColor != beadColor ||
      old.accentColor != accentColor ||
      old.primary != primary ||
      old.secondary != secondary;
}
