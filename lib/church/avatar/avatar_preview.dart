import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../church_constants.dart';
import 'avatar_config.dart';

/// 3D 아바타와 같은 부드러운 "클레이/비닐 토이" 스타일의 2D 미리보기(상반신 + 이름표).
///
/// 비율과 색은 웹(`assets/church/avatar.js`)과 같은 수치를 쓴다: 둥근 머리, 점 눈과 알약 눈썹,
/// 둥근 코, 가는 미소, 볼터치, 매끈한 덩어리 머리카락, 말랑한 후디(둥근 칼라).
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
    final name =
        baptismalNames[config.name.clamp(0, baptismalNames.length - 1)];
    final figure = SizedBox(
      width: height * 0.8,
      height: height,
      child: CustomPaint(painter: AvatarPainter(config)),
    );
    return Semantics(
      label: '아바타 미리보기, 세례명 $name',
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

Color _shade(Color c, double amount) {
  final hsl = HSLColor.fromColor(c);
  return hsl.withLightness((hsl.lightness + amount).clamp(0.0, 1.0)).toColor();
}

Color _mix(Color a, Color b, double t) => Color.lerp(a, b, t)!;

// 웹 avatar.js의 머리 형상과 같은 값(머리 중심 기준 m).
const double _hh = 0.110, _ww = 0.078;

/// 높이 y에서의 머리 반폭(웹 `headWD`와 같은 식).
double _headHalfW(double y) {
  final t = (y / _hh).clamp(-1.0, 1.0);
  final p = t < 0 ? 2.3 : 2.0;
  final s = math.pow(math.max(0.0, 1 - math.pow(t.abs(), p)), 1 / p).toDouble();
  final m = 1 + 0.025 * t - 0.12 * math.pow(math.max(0.0, -t - 0.15), 1.2);
  return _ww * s * m;
}

/// 상반신 초상을 그린다. 그림 영역은 가로:세로 = 4:5.
class AvatarPainter extends CustomPainter {
  const AvatarPainter(this.config);

  final AvatarConfig config;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.clipRect(Offset.zero & size);
    _Pen(size, config).paintAll(canvas);
  }

  @override
  bool shouldRepaint(AvatarPainter oldDelegate) => oldDelegate.config != config;
}

class _Pen {
  _Pen(this.size, this.config) {
    final h = size.height;
    s = (h * 0.36) / 0.222; // m -> px
    cx = size.width * 0.5;
    cy = h * 0.37; // 머리 중심
    skin = config.skinColor;
    hair = config.hairColor;
    outfit = config.outfitColor;
    skinDeep = _mix(_shade(skin, -0.12), const Color(0xFFB8452E), 0.18);
    blush = _mix(skin, const Color(0xFFFF6F6F), 0.55);
    hairDark = _mix(hair, const Color(0xFF000000), 0.12);
  }

  final Size size;
  final AvatarConfig config;
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
    final x = sign * _headHalfW(y);
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
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(cx, h * 0.985),
        width: w * 0.8,
        height: h * 0.05,
      ),
      blurFill(const Color(0x14000000), 0.02),
    );
    _hairBack(canvas);
    _body(canvas);
    _neck(canvas);
    _ears(canvas);
    _head(canvas);
    _face(canvas);
    _hairFront(canvas);
  }

  // ---- 후디 ----------------------------------------------------------
  static const List<List<double>> _torso = [
    [1.444, 0.056],
    [1.432, 0.074],
    [1.416, 0.116],
    [1.395, 0.156],
    [1.372, 0.168],
    [1.300, 0.160],
    [1.200, 0.152],
    [1.100, 0.150],
  ];

  void _body(Canvas canvas) {
    final bottom = size.height + 0.07 * s;
    // 뒤 후드(목 뒤로 둥글게 솟은 모자)
    final hood = Rect.fromCenter(
      center: bp(0, 1.424),
      width: 0.17 * s,
      height: 0.095 * s,
    );
    canvas.drawOval(hood, fill(_shade(outfit, -0.12)));

    // 몸통 윤곽
    final right = <Offset>[], left = <Offset>[];
    for (final r in _torso) {
      right.add(bp(r[1], r[0]));
      left.add(bp(-r[1], r[0]));
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
      final r = 0.050 * s;
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
    final r = Rect.fromLTRB(
      bp(-0.047, 1.50).dx,
      bp(0, 1.50).dy,
      bp(0.047, 1.50).dx,
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
    canvas.drawPath(collar, stroke(_shade(outfit, -0.07), 0.030));
    canvas.drawPath(
      smooth([
        bp(-0.058, 1.452),
        bp(-0.038, 1.437),
        bp(0, 1.431),
        bp(0.038, 1.437),
        bp(0.058, 1.452),
      ], closed: false),
      stroke(_shade(outfit, 0.05), 0.013),
    );
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
      final c = hp(sg * 0.052, -0.030);
      canvas.drawCircle(
        c,
        0.030 * s,
        Paint()
          ..shader = ui.Gradient.radial(c, 0.030 * s, [
            blush.withValues(alpha: 0.6),
            blush.withValues(alpha: 0.0),
          ]),
      );
    }
    // 눈썹(알약)
    for (final sg in [-1.0, 1.0]) {
      final path = Path()
        ..moveTo(hp(sg * 0.019, 0.037).dx, hp(sg * 0.019, 0.037).dy)
        ..quadraticBezierTo(
          hp(sg * 0.038, 0.0475).dx,
          hp(sg * 0.038, 0.0475).dy,
          hp(sg * 0.056, 0.036).dx,
          hp(sg * 0.056, 0.036).dy,
        );
      canvas.drawPath(path, stroke(hairDark, 0.0105));
    }
    // 코(둥근 혹)
    final nc = hp(0, -0.027);
    canvas.drawOval(
      Rect.fromCenter(
        center: hp(0.002, -0.0365),
        width: 0.030 * s,
        height: 0.012 * s,
      ),
      blurFill(skinDeep.withValues(alpha: 0.35), 0.005),
    );
    final nose = Rect.fromCenter(
      center: nc,
      width: 0.025 * s,
      height: 0.023 * s,
    );
    canvas.drawOval(
      nose,
      clay(_mix(skin, blush, 0.18), nose, light: 0.07, dark: 0.05),
    );
    // 눈(납작한 짙은 타원)
    for (final sg in [-1.0, 1.0]) {
      canvas.drawOval(
        Rect.fromCenter(
          center: hp(sg * 0.032, 0.002),
          width: 0.0185 * s,
          height: 0.0225 * s,
        ),
        fill(_ink),
      );
    }
    // 가는 미소
    final sp = hp(-0.027, -0.0503),
        ep = hp(0.027, -0.0503),
        cp = hp(0, -0.0725);
    final smile = Path()
      ..moveTo(sp.dx, sp.dy)
      ..quadraticBezierTo(cp.dx, cp.dy, ep.dx, ep.dy);
    canvas.drawPath(
      smile,
      stroke(_mix(skin, const Color(0xFF6B2A24), 0.72), 0.0030),
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

  void _hairBack(Canvas canvas) {
    switch (config.style) {
      case 1: // 단발
        final p = smooth([
          hp(0, 0.126),
          hp(0.088, 0.075),
          hp(0.108, 0.0),
          hp(0.116, -0.07),
          hp(0.106, -0.106),
          hp(0.06, -0.113),
          hp(0, -0.108),
          hp(-0.06, -0.113),
          hp(-0.106, -0.106),
          hp(-0.116, -0.07),
          hp(-0.108, 0.0),
          hp(-0.088, 0.075),
        ]);
        canvas.drawPath(p, hairPaint(p.getBounds()));
      case 2: // 올림머리
        final c = hp(0, 0.150);
        final r = Rect.fromCircle(center: c, radius: 0.052 * s);
        canvas.drawOval(r, hairPaint(r));
        _gloss(canvas, Path()..addOval(r), hp(-0.016, 0.168), 0.045, 0.022);
      case 3: // 길고 물결치는 머리
        final p = smooth([
          hp(0, 0.126),
          hp(0.088, 0.075),
          hp(0.108, 0.0),
          hp(0.113, -0.07),
          hp(0.121, -0.13),
          hp(0.108, -0.172),
          hp(0.082, -0.190),
          hp(0.050, -0.172),
          hp(0.020, -0.190),
          hp(-0.020, -0.172),
          hp(-0.050, -0.190),
          hp(-0.082, -0.172),
          hp(-0.108, -0.190),
          hp(-0.121, -0.13),
          hp(-0.113, -0.07),
          hp(-0.108, 0.0),
          hp(-0.088, 0.075),
        ]);
        canvas.drawPath(p, hairPaint(p.getBounds()));
    }
  }

  void _hairFront(Canvas canvas) {
    const d = 0.013;
    // 바깥 윤곽(옆머리 아래 끝에서 정수리를 지나 반대쪽까지)
    final outer = <Offset>[];
    const yb = -0.012;
    final k0 = math.acos(yb / _hh);
    for (var k = 16; k >= 0; k--) {
      outer.add(edge(_hh * math.cos(k0 * k / 16) * 0.9995, -1, d));
    }
    for (var k = 1; k <= 16; k++) {
      outer.add(edge(_hh * math.cos(k0 * k / 16) * 0.9995, 1, d));
    }
    // 이마 선(왼쪽 → 오른쪽)
    final List<Offset> line;
    switch (config.style) {
      case 1:
        line = [
          hp(-0.074, 0.022),
          hp(-0.058, 0.060),
          hp(-0.03, 0.074),
          hp(0, 0.077),
          hp(0.03, 0.074),
          hp(0.058, 0.060),
          hp(0.074, 0.022),
        ];
      case 3:
        line = [
          hp(-0.074, 0.022),
          hp(-0.060, 0.056),
          hp(-0.034, 0.082),
          hp(0, 0.094),
          hp(0.034, 0.082),
          hp(0.060, 0.056),
          hp(0.074, 0.022),
        ];
      case 0:
        line = [
          hp(-0.074, 0.022),
          hp(-0.060, 0.062),
          hp(-0.034, 0.082),
          hp(0.000, 0.080),
          hp(0.034, 0.072),
          hp(0.060, 0.056),
          hp(0.074, 0.022),
        ];
      default:
        line = [
          hp(-0.074, 0.022),
          hp(-0.060, 0.056),
          hp(-0.034, 0.076),
          hp(0, 0.084),
          hp(0.034, 0.076),
          hp(0.060, 0.056),
          hp(0.074, 0.022),
        ];
    }
    final all = <Offset>[...outer, ...line.reversed];
    // 시계 방향을 맞춰 닫힌 곡선
    final path = smooth(all);
    canvas.drawPath(path, hairPaint(path.getBounds()));
    _gloss(canvas, path, hp(-0.030, 0.108), 0.07, 0.024);

    switch (config.style) {
      case 0:
        // 위로 말아 올린 앞머리 덩어리 + 작은 컬
        final q = Rect.fromCenter(
          center: hp(0.008, 0.123),
          width: 0.108 * s,
          height: 0.056 * s,
        );
        canvas.save();
        canvas.translate(q.center.dx, q.center.dy);
        canvas.rotate(-0.12);
        final local = Rect.fromCenter(
          center: Offset.zero,
          width: q.width,
          height: q.height,
        );
        canvas.drawOval(local, hairPaint(local));
        canvas.restore();
        _gloss(
          canvas,
          Path()..addOval(
            Rect.fromCenter(
              center: hp(0.008, 0.123),
              width: 0.108 * s,
              height: 0.056 * s,
            ),
          ),
          hp(-0.012, 0.133),
          0.05,
          0.016,
          alpha: 0.26,
        );
        final curl = Path();
        final c0 = hp(-0.018, 0.150);
        for (var k = 0; k <= 22; k++) {
          final t = k / 22;
          final a = t * math.pi * 3.0 + 0.4;
          final r = (0.020 * (1 - 0.8 * t)) * s;
          final pt = Offset(
            c0.dx + math.cos(a) * r,
            c0.dy - math.sin(a) * r * 0.78,
          );
          if (k == 0) {
            curl.moveTo(pt.dx, pt.dy);
          } else {
            curl.lineTo(pt.dx, pt.dy);
          }
        }
        canvas.drawPath(curl, stroke(_shade(hair, 0.03), 0.0115));
      case 2:
        // 묶음 끈
        final tie = Rect.fromCenter(
          center: hp(0, 0.118),
          width: 0.082 * s,
          height: 0.022 * s,
        );
        canvas.drawOval(
          tie,
          clay(_mix(outfit, const Color(0xFFFFFFFF), 0.12), tie),
        );
    }
  }
}
