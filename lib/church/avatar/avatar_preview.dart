import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import 'avatar_config.dart';

/// 3D 아바타와 같은 부드러운 "클레이/비닐 토이" 스타일의 2D 미리보기(상반신 + 이름표).
///
/// 비율과 색은 웹(`assets/church/avatar.js`)과 같은 수치를 쓴다: 큰 둥근 머리([_headScale]배),
/// 작은 점 눈(반짝임)과 가는 눈썹, 아주 작은 코와 미소, 볼 홍조, 윤기 띠가 있는 매끈한 머리카락,
/// 단색 웃옷 + 크림색 깃(남성은 단추 3개). 외형 기준: docs/church/AVATAR_LOOK.md.
/// 성별마다 머리 모양 4종, 어깨·허리·엉덩이 폭, 턱선, 목, 눈썹 굵기가 조금씩 다르다.
class AvatarPreview extends StatelessWidget {
  const AvatarPreview({
    super.key,
    required this.config,
    this.height = 240,
    this.showName = true,
  });

  final AvatarConfig config;

  /// 그림의 높이(이름표 제외). 가로는 높이의 0.8배.
  final double height;
  final bool showName;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final name = config.nameText;
    final figure = SizedBox(
      width: height * 0.8,
      height: height,
      child: CustomPaint(painter: AvatarPainter(config)),
    );
    return Semantics(
      label:
          '아바타 미리보기, ${AvatarConfig.genderNames[config.gender]}, '
          '${config.styleNameList[config.style]}, 세례명 $name',
      container: true,
      excludeSemantics: true,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          figure,
          if (showName) ...[
            const SizedBox(height: 8),
            DecoratedBox(
              decoration: BoxDecoration(
                color: scheme.secondaryContainer,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 6,
                ),
                child: Text(
                  name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: scheme.onSecondaryContainer,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// 머리 모양을 고르는 칩 안에 넣는 작은 얼굴 그림(머리·목·어깨 윗부분만 크게).
class AvatarHeadThumb extends StatelessWidget {
  const AvatarHeadThumb({super.key, required this.config, this.height = 64});

  final AvatarConfig config;

  /// 그림 높이. 가로는 높이의 0.8배.
  final double height;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: SizedBox(
      width: height * 0.8,
      height: height,
      child: CustomPaint(painter: AvatarPainter(config, headFocus: true)),
    ),
  );
}

Color _shade(Color c, double amount) {
  final hsl = HSLColor.fromColor(c);
  return hsl.withLightness((hsl.lightness + amount).clamp(0.0, 1.0)).toColor();
}

Color _mix(Color a, Color b, double t) => Color.lerp(a, b, t)!;

// 웹 avatar.js의 머리 형상과 같은 값(머리 중심 기준 m).
const double _hh = 0.110, _ww = 0.078;

// 큰 머리: 웹의 HEAD_S·HEAD_PIV 와 같다(목 위를 중심으로 머리·얼굴·머리카락을 키운다).
const double _headScale = 1.55, _headPivot = 1.468;

/// 옷 트림 색(웹 palette.js의 `trim`): 깃·소맷부리 크림, 아랫단·단추 금색.
const Color _trimCream = Color(0xFFF0E6D0), _trimGold = Color(0xFFC6A562);

double _smooth(double t) {
  final c = t.clamp(0.0, 1.0);
  return c * c * (3 - 2 * c);
}

/// 높이 y에서의 머리 반폭(웹 `headWD`와 같은 식). 남성은 턱이 조금 각지고 여성은 갸름하다.
double _headHalfW(double y, int gender) {
  final t = (y / _hh).clamp(-1.0, 1.0);
  final p = t < 0 ? 2.3 : 2.0;
  final s = math.pow(math.max(0.0, 1 - math.pow(t.abs(), p)), 1 / p).toDouble();
  var m = 1 + 0.025 * t - 0.085 * math.pow(math.max(0.0, -t - 0.15), 1.2);
  m *= 1 + (gender == 1 ? 0.035 : -0.02) * _smooth((-y - 0.035) / 0.075);
  return _ww * s * m;
}

/// 상반신 초상을 그린다. 그림 영역은 가로:세로 = 4:5.
class AvatarPainter extends CustomPainter {
  const AvatarPainter(this.config, {this.headFocus = false});

  final AvatarConfig config;

  /// 머리와 어깨 윗부분만 크게 그린다(머리 모양 칩용).
  final bool headFocus;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.clipRect(Offset.zero & size);
    _Pen(size, config, headFocus).paintAll(canvas);
  }

  @override
  bool shouldRepaint(AvatarPainter oldDelegate) =>
      oldDelegate.config != config || oldDelegate.headFocus != headFocus;
}

class _Pen {
  _Pen(this.size, this.config, this.headFocus) {
    final h = size.height;
    // 키운 머리(정수리~목 위 약 0.37m)가 그림 높이의 절반쯤(머리 칩에서는 대부분)을 차지하게 잡는다.
    final double pivotY; // 목 위(머리를 키우는 중심)의 화면 y
    if (headFocus) {
      s = h / 0.62; // m -> px
      pivotY = h * 0.67;
    } else {
      s = h * 1.34;
      pivotY = h * 0.535;
    }
    cy = pivotY - (_hc - _headPivot) * s; // 키우기 전 머리 중심
    cx = size.width * 0.5;
    skin = config.skinColor;
    hair = config.hairColor;
    outfit = config.outfitColor;
    skinDeep = _mix(_shade(skin, -0.12), const Color(0xFFB8452E), 0.18);
    blush = _mix(skin, const Color(0xFFFF6F6F), 0.55);
    hairDark = _mix(hair, const Color(0xFF000000), 0.12);
  }

  final Size size;
  final AvatarConfig config;
  final bool headFocus;
  int get g => config.gender;
  late final double s, cx, cy;
  late final Color skin, hair, outfit, skinDeep, blush, hairDark;

  static const double _hc = 1.5785;
  static const Color _ink = Color(0xFF2A2830);

  // 머리 좌표(중심 기준 m, 위 +) -> 화면
  Offset hp(double x, double y) => Offset(cx + x * s, cy - y * s);
  // 절대 높이 좌표 -> 화면
  Offset bp(double x, double yAbs) => Offset(cx + x * s, cy + (_hc - yAbs) * s);

  Paint fill(Color c) => Paint()
    ..style = PaintingStyle.fill
    ..color = c
    ..isAntiAlias = true;

  Paint stroke(Color c, double wm) => Paint()
    ..style = PaintingStyle.stroke
    ..color = c
    ..strokeWidth = wm * s
    ..strokeCap = StrokeCap.round
    ..strokeJoin = StrokeJoin.round
    ..isAntiAlias = true;

  Paint blurFill(Color c, double sigmaM) => Paint()
    ..style = PaintingStyle.fill
    ..color = c
    ..maskFilter = MaskFilter.blur(BlurStyle.normal, sigmaM * s);

  /// 말랑한 클레이 느낌: 왼쪽 위가 밝고 오른쪽 아래가 살짝 어두운 부드러운 방사형 그라데이션.
  Paint clay(
    Color base,
    Rect bounds, {
    double light = 0.07,
    double dark = 0.09,
  }) {
    return Paint()
      ..isAntiAlias = true
      ..shader = ui.Gradient.radial(
        Offset(
          bounds.left + bounds.width * 0.36,
          bounds.top + bounds.height * 0.30,
        ),
        math.max(bounds.width, bounds.height) * 0.95,
        [_shade(base, light), base, _shade(base, -dark)],
        const [0.0, 0.5, 1.0],
      );
  }

  Path smooth(List<Offset> pts, {bool closed = true}) {
    final path = Path();
    if (pts.length < 2) return path;
    path.moveTo(pts.first.dx, pts.first.dy);
    final n = pts.length;
    final end = closed ? n : n - 1;
    for (var i = 0; i < end; i++) {
      final p0 = pts[(i - 1 + n) % n];
      final p1 = pts[i % n];
      final p2 = pts[(i + 1) % n];
      final p3 = pts[(i + 2) % n];
      final a = (!closed && i == 0) ? p1 : p0;
      final d = (!closed && i + 2 >= n) ? p2 : p3;
      final c1 = p1 + (p2 - a) / 6;
      final c2 = p2 - (d - p1) / 6;
      path.cubicTo(c1.dx, c1.dy, c2.dx, c2.dy, p2.dx, p2.dy);
    }
    if (closed) path.close();
    return path;
  }

  /// 머리 가장자리 점(표면에서 [d]만큼 바깥). sign=+1 오른쪽.
  Offset edge(double y, double sign, double d) {
    final x = sign * _headHalfW(y, g);
    final gx = x / (_ww * _ww), gy = y / (_hh * _hh);
    final l = math.sqrt(gx * gx + gy * gy);
    if (l < 1e-9) return hp(0, y + d);
    return hp(x + gx / l * d, y + gy / l * d);
  }

  Path headPath() {
    final pts = <Offset>[];
    const n = 28;
    for (var k = 0; k <= n; k++) {
      final y = _hh * math.cos(math.pi * k / n) * 0.9995;
      pts.add(edge(y, 1, 0));
    }
    for (var k = n - 1; k >= 1; k--) {
      final y = _hh * math.cos(math.pi * k / n) * 0.9995;
      pts.add(edge(y, -1, 0));
    }
    return smooth(pts);
  }

  // ====================================================================
  void paintAll(Canvas canvas) {
    final w = size.width, h = size.height;
    if (!headFocus) {
      canvas.drawOval(
        Rect.fromCenter(
          center: Offset(cx, h * 0.985),
          width: w * 0.8,
          height: h * 0.05,
        ),
        blurFill(const Color(0x14000000), 0.02),
      );
    }
    void big(void Function() draw) {
      final p = bp(0, _headPivot);
      canvas.save();
      canvas.translate(p.dx, p.dy);
      canvas.scale(_headScale);
      canvas.translate(-p.dx, -p.dy);
      draw();
      canvas.restore();
    }

    big(() => _hairBack(canvas));
    _body(canvas);
    _neck(canvas);
    big(() {
      _ears(canvas);
      _head(canvas);
      _face(canvas);
      _hairFront(canvas);
    });
  }

  // ---- 웃옷 --------------------------------------------------------
  // 웹 avatar.js의 TORSO_UP·TORSO_LOW 와 같은 값: [y, 여성 반폭, 남성 반폭].
  static const List<List<double>> _torso = [
    [1.444, 0.056, 0.056],
    [1.432, 0.074, 0.074],
    [1.416, 0.1106, 0.1163],
    [1.395, 0.1425, 0.1568],
    [1.372, 0.1558, 0.1714],
    [1.300, 0.153, 0.166],
    [1.200, 0.143, 0.156],
    [1.100, 0.134, 0.151],
    [1.000, 0.148, 0.156],
  ];

  void _body(Canvas canvas) {
    final bottom = size.height + 0.07 * s;
    // 몸통 윤곽
    final right = <Offset>[], left = <Offset>[];
    for (var k = 0; k < _torso.length; k++) {
      final r = _torso[k];
      final w = r[1 + g];
      right.add(bp(w, r[0]));
      left.add(bp(-w, r[0]));
    }
    final torso = smooth([...left.reversed, ...right], closed: false)
      ..lineTo(right.last.dx, bottom)
      ..lineTo(left.last.dx, bottom)
      ..close();
    final tb = Rect.fromLTRB(
      left.last.dx,
      bp(0, 1.444).dy,
      right.last.dx,
      bottom,
    );
    canvas.drawPath(torso, clay(outfit, tb, light: 0.08, dark: 0.10));

    // 소매(둥글게 부푼 팔)
    for (final sg in [-1.0, 1.0]) {
      final c = bp(sg * 0.176, 1.392);
      final armTop = c.dy - 0.045 * s;
      final r = 0.053 * s * (g == 1 ? 1.045 : 0.95);
      final arm = RRect.fromLTRBR(
        c.dx - r,
        armTop,
        c.dx + r,
        bottom,
        Radius.circular(r),
      );
      final path = Path()..addRRect(arm);
      canvas.drawPath(
        path,
        clay(outfit, arm.outerRect, light: 0.06, dark: 0.12),
      );
      // 팔과 몸통 사이의 부드러운 그늘
      canvas.drawLine(
        Offset(c.dx - sg * r * 0.95, armTop + r * 1.2),
        Offset(c.dx - sg * r * 0.95, bottom),
        Paint()
          ..color = _shade(outfit, -0.16).withValues(alpha: 0.45)
          ..strokeWidth = 0.007 * s
          ..strokeCap = StrokeCap.round
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, 0.004 * s),
      );
    }
  }

  void _neck(Canvas canvas) {
    final nw = 0.047 * (g == 1 ? 1.07 : 0.92);
    final r = Rect.fromLTRB(
      bp(-nw, 1.50).dx,
      bp(0, 1.52).dy,
      bp(nw, 1.50).dx,
      bp(0, 1.425).dy,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(r, Radius.circular(0.02 * s)),
      fill(_shade(skin, -0.03)),
    );
    // 턱 아래 그늘
    canvas.save();
    canvas.clipRRect(RRect.fromRectAndRadius(r, Radius.circular(0.02 * s)));
    canvas.drawOval(
      Rect.fromCenter(center: hp(0, -0.112), width: 0.17 * s, height: 0.05 * s),
      blurFill(skinDeep.withValues(alpha: 0.55), 0.012),
    );
    canvas.restore();
    // 둥글게 말린 칼라
    final collar = smooth([
      bp(-0.066, 1.450),
      bp(-0.042, 1.431),
      bp(0, 1.424),
      bp(0.042, 1.431),
      bp(0.066, 1.450),
    ], closed: false);
    // 가는 깃 트림: 어두운 옷에는 크림색, 밝은 옷에는 옷보다 조금 짙은 모래색
    final trim = outfit.computeLuminance() > 0.5
        ? _mix(_shade(outfit, -0.12), _trimGold, 0.25)
        : _trimCream;
    canvas.drawPath(collar, stroke(_shade(trim, -0.10), 0.024));
    canvas.drawPath(collar, stroke(trim, 0.017));
    // 남성 웃옷: 앞 중심의 작은 단추
    if (g == 1 && !headFocus) {
      for (final y in const [1.325, 1.225, 1.125]) {
        canvas.drawCircle(bp(0, y), 0.0095 * s, fill(_shade(trim, -0.08)));
        canvas.drawCircle(bp(0, y), 0.0075 * s, fill(trim));
      }
    }
  }

  void _ears(Canvas canvas) {
    for (final sg in [-1.0, 1.0]) {
      final c = hp(sg * (_ww + 0.002), -0.008);
      final rect = Rect.fromCenter(
        center: c,
        width: 0.026 * s,
        height: 0.046 * s,
      );
      canvas.drawOval(rect, clay(_shade(skin, -0.02), rect));
      canvas.drawOval(
        Rect.fromCenter(center: c, width: 0.011 * s, height: 0.026 * s),
        fill(blush.withValues(alpha: 0.45)),
      );
    }
  }

  void _head(Canvas canvas) {
    final path = headPath();
    final b = path.getBounds();
    canvas.drawPath(path, clay(skin, b, light: 0.045, dark: 0.07));
  }

  void _face(Canvas canvas) {
    // 볼터치
    for (final sg in [-1.0, 1.0]) {
      final c = hp(sg * 0.052, -0.034);
      canvas.drawCircle(
        c,
        0.026 * s,
        Paint()
          ..shader = ui.Gradient.radial(c, 0.026 * s, [
            blush.withValues(alpha: 0.6),
            blush.withValues(alpha: 0.0),
          ]),
      );
    }
    // 눈썹(가는 알약): 여성은 가늘고 부드러운 아치, 남성은 조금 굵고 곧게
    final browArchY = g == 1 ? 0.0300 : 0.0335;
    for (final sg in [-1.0, 1.0]) {
      final path = Path()
        ..moveTo(hp(sg * 0.024, 0.025).dx, hp(sg * 0.024, 0.025).dy)
        ..quadraticBezierTo(
          hp(sg * 0.036, browArchY).dx,
          hp(sg * 0.036, browArchY).dy,
          hp(sg * 0.048, 0.024).dx,
          hp(sg * 0.048, 0.024).dy,
        );
      canvas.drawPath(path, stroke(hairDark, g == 1 ? 0.0064 : 0.0044));
    }
    // 코(아주 작은 혹)
    final nc = hp(0, -0.031);
    final nose = Rect.fromCenter(
      center: nc,
      width: 0.0135 * s,
      height: 0.0120 * s,
    );
    canvas.drawOval(
      nose,
      clay(_mix(skin, blush, 0.18), nose, light: 0.07, dark: 0.05),
    );
    // 눈(작은 점 + 반짝임): 낮고 넓게
    for (final sg in [-1.0, 1.0]) {
      canvas.drawOval(
        Rect.fromCenter(
          center: hp(sg * 0.0345, -0.008),
          width: 0.0138 * s,
          height: 0.0170 * s,
        ),
        fill(_ink),
      );
      canvas.drawCircle(
        hp(sg * 0.0345 + 0.0022, -0.005),
        0.0019 * s,
        fill(const Color(0xFFF2F2F2)),
      );
    }
    // 아주 작은 미소
    final sp = hp(-0.0135, -0.0500),
        ep = hp(0.0135, -0.0500),
        cp = hp(0, -0.0590);
    final smile = Path()
      ..moveTo(sp.dx, sp.dy)
      ..quadraticBezierTo(cp.dx, cp.dy, ep.dx, ep.dy);
    canvas.drawPath(
      smile,
      stroke(_mix(skin, const Color(0xFF6B2A24), 0.72), 0.0026),
    );
  }

  // ---- 머리카락 ------------------------------------------------------
  Paint hairPaint(Rect b) => clay(hair, b, light: 0.09, dark: 0.10);

  void _gloss(
    Canvas canvas,
    Path clip,
    Offset c,
    double w,
    double h, {
    double alpha = 0.22,
  }) {
    canvas.save();
    canvas.clipPath(clip);
    canvas.drawOval(
      Rect.fromCenter(center: c, width: w * s, height: h * s),
      blurFill(_shade(hair, 0.22).withValues(alpha: alpha), 0.008),
    );
    canvas.restore();
  }

  /// 둥근 끝을 가진 굵은 곡선(포니테일 꼬리). [pts]는 머리 좌표, [radii]는 m.
  void _tube(Canvas canvas, List<Offset> pts, List<double> radii) {
    final bounds = Rect.fromPoints(pts.first, pts.last).inflate(0.03 * s);
    final paint = hairPaint(bounds);
    const steps = 24;
    final path = smooth(pts, closed: false);
    final metrics = path.computeMetrics().toList();
    if (metrics.isEmpty) return;
    final m = metrics.first;
    for (var k = 0; k <= steps; k++) {
      final t = k / steps;
      final pos = m.getTangentForOffset(m.length * t)?.position;
      if (pos == null) continue;
      final seg = t * (radii.length - 1);
      final i = seg.floor().clamp(0, radii.length - 2);
      final r = radii[i] + (radii[i + 1] - radii[i]) * (seg - i);
      canvas.drawCircle(pos, r * s, paint);
    }
  }

  void _hairBack(Canvas canvas) {
    if (g == 0) {
      switch (config.style) {
        case 0: // 단발: 턱선 길이, 끝이 안으로 살짝 말린 보브
          final p = smooth([
            hp(0, 0.130),
            hp(0.080, 0.100),
            hp(0.100, 0.030),
            hp(0.102, -0.040),
            hp(0.098, -0.082),
            hp(0.080, -0.095),
            hp(0, -0.098),
            hp(-0.080, -0.095),
            hp(-0.098, -0.082),
            hp(-0.102, -0.040),
            hp(-0.100, 0.030),
            hp(-0.080, 0.100),
          ]);
          canvas.drawPath(p, hairPaint(p.getBounds()));
        case 1: // 어깨 길이 생머리
          final p = smooth([
            hp(0, 0.130),
            hp(0.082, 0.100),
            hp(0.102, 0.030),
            hp(0.104, -0.060),
            hp(0.106, -0.130),
            hp(0.096, -0.158),
            hp(0.060, -0.164),
            hp(0, -0.166),
            hp(-0.060, -0.164),
            hp(-0.096, -0.158),
            hp(-0.106, -0.130),
            hp(-0.104, -0.060),
            hp(-0.102, 0.030),
            hp(-0.082, 0.100),
          ]);
          canvas.drawPath(p, hairPaint(p.getBounds()));
        case 2: // 포니테일: 목 옆으로 늘어진 꼬리
          _tube(
            canvas,
            [
              hp(0.008, 0.040),
              hp(0.016, 0.004),
              hp(0.036, -0.056),
              hp(0.056, -0.110),
              hp(0.068, -0.146),
            ],
            const [0.019, 0.025, 0.023, 0.017, 0.008],
          );
      }
    }
  }

  // 앞머리 선(왼쪽 → 오른쪽). 성별·모양별로 이마가 드러나는 정도가 다르다.
  List<Offset> _hairLine() {
    List<Offset> mk(List<List<double>> v) => [
      for (final p in v) hp(p[0], p[1]),
    ];
    if (g == 0) {
      switch (config.style) {
        case 0: // 단발: 이마를 반쯤 덮는 앞머리
          return mk([
            [-0.074, 0.000],
            [-0.066, 0.040],
            [-0.040, 0.057],
            [0, 0.061],
            [0.040, 0.057],
            [0.066, 0.040],
            [0.074, 0.000],
          ]);
        case 1:
          return mk([
            [-0.074, 0.010],
            [-0.064, 0.050],
            [-0.036, 0.064],
            [0, 0.067],
            [0.036, 0.064],
            [0.064, 0.050],
            [0.074, 0.010],
          ]);
        default: // 뒤로 묶은 머리: 이마가 시원하게 드러난다
          return mk([
            [-0.074, 0.022],
            [-0.060, 0.056],
            [-0.034, 0.068],
            [0, 0.071],
            [0.034, 0.068],
            [0.060, 0.056],
            [0.074, 0.022],
          ]);
      }
    }
    switch (config.style) {
      case 0: // 짧게 친 머리
        return mk([
          [-0.074, 0.030],
          [-0.062, 0.066],
          [-0.034, 0.078],
          [0, 0.080],
          [0.034, 0.078],
          [0.062, 0.066],
          [0.074, 0.030],
        ]);
      case 1: // 가르마
        return mk([
          [-0.074, 0.030],
          [-0.060, 0.060],
          [-0.034, 0.072],
          [-0.010, 0.074],
          [0.034, 0.072],
          [0.060, 0.060],
          [0.074, 0.030],
        ]);
      case 2: // 웨이브
        return mk([
          [-0.074, 0.010],
          [-0.062, 0.050],
          [-0.034, 0.064],
          [0, 0.067],
          [0.034, 0.064],
          [0.062, 0.050],
          [0.074, 0.010],
        ]);
      default: // 넓은 이마: M자로 물러난 이마 선
        return mk([
          [-0.074, 0.030],
          [-0.066, 0.056],
          [-0.050, 0.076],
          [-0.036, 0.086],
          [-0.016, 0.078],
          [0, 0.072],
          [0.016, 0.078],
          [0.036, 0.086],
          [0.050, 0.076],
          [0.066, 0.056],
          [0.074, 0.030],
        ]);
    }
  }

  void _hairFront(Canvas canvas) {
    // 머리카락 두께와 옆머리 내려오는 높이
    final double d;
    final double yb;
    var wave = 0.0;
    if (g == 0) {
      d = const [0.014, 0.014, 0.012, 0.012][config.style];
      yb = const [-0.040, -0.012, 0.012, 0.012][config.style];
    } else {
      d = const [0.007, 0.012, 0.017, 0.006][config.style];
      yb = const [0.026, 0.024, 0.004, 0.022][config.style];
      if (config.style == 2) wave = 0.0035;
    }
    // 바깥 윤곽(옆머리 아래 끝에서 정수리를 지나 반대쪽까지)
    final outer = <Offset>[];
    final k0 = math.acos(yb / _hh);
    for (var k = 16; k >= 0; k--) {
      outer.add(
        edge(
          _hh * math.cos(k0 * k / 16) * 0.9995,
          -1,
          d + wave * math.sin(k * 1.9),
        ),
      );
    }
    for (var k = 1; k <= 16; k++) {
      outer.add(
        edge(
          _hh * math.cos(k0 * k / 16) * 0.9995,
          1,
          d + wave * math.sin(k * 1.9 + 1),
        ),
      );
    }
    final line = _hairLine();
    final all = <Offset>[...outer, ...line.reversed];
    final path = smooth(all);
    canvas.drawPath(path, hairPaint(path.getBounds()));
    // 윤기 띠(정수리 아래를 두르는 밝은 고리)
    _gloss(canvas, path, hp(0, 0.086), 0.20, 0.020, alpha: 0.30);

    // 모양마다의 작은 덩어리
    if (g == 1 && config.style == 1) {
      // 옆으로 넘긴 앞머리 덩어리
      final q = Rect.fromCenter(
        center: hp(-0.016, 0.097),
        width: 0.112 * s,
        height: 0.040 * s,
      );
      canvas.save();
      canvas.translate(q.center.dx, q.center.dy);
      canvas.rotate(0.16);
      final local = Rect.fromCenter(
        center: Offset.zero,
        width: q.width,
        height: q.height,
      );
      canvas.drawOval(local, hairPaint(local));
      canvas.restore();
    } else if (g == 1 && config.style == 2) {
      final q = Rect.fromCenter(
        center: hp(0, 0.100),
        width: 0.112 * s,
        height: 0.048 * s,
      );
      canvas.drawOval(q, hairPaint(q));
    }
  }
}
