import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../church_constants.dart';
import 'avatar_config.dart';

/// 3D 아바타와 같은 사실적인 성인 비율의 2D 미리보기(상반신 초상 + 이름표).
///
/// 비율과 색은 웹(`assets/church/avatar.js`)과 같은 수치를 쓴다: 머리 높이 약 23cm,
/// 어깨 너비 약 46cm, 코트(옷 색) 아래로 중립색 셔츠.
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

double _lum(Color c) => c.computeLuminance();

/// 머리 윤곽(웹 avatar.js의 HEAD 표와 같은 값): (머리 중심 기준 y[m], 반폭[m]).
const List<List<double>> _headRows = [
  [0.1175, 0.0],
  [0.1130, 0.030],
  [0.1040, 0.052],
  [0.0920, 0.0635],
  [0.0780, 0.0715],
  [0.0620, 0.075],
  [0.0460, 0.0765],
  [0.0300, 0.077],
  [0.0160, 0.0772],
  [0.0040, 0.0772],
  [-0.0080, 0.0768],
  [-0.0220, 0.075],
  [-0.0360, 0.0715],
  [-0.0500, 0.067],
  [-0.0640, 0.062],
  [-0.0780, 0.0545],
  [-0.0910, 0.045],
  [-0.1020, 0.034],
  [-0.1110, 0.021],
  [-0.1175, 0.0],
];

/// 상반신 초상을 그린다. 그림 영역은 가로:세로 = 4:5.
class AvatarPainter extends CustomPainter {
  const AvatarPainter(this.config);

  final AvatarConfig config;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.clipRect(Offset.zero & size);
    final p = _Pen(size, config);
    p.paintAll(canvas);
  }

  @override
  bool shouldRepaint(AvatarPainter oldDelegate) => oldDelegate.config != config;
}

class _Pen {
  _Pen(this.size, this.config) {
    final h = size.height;
    // 머리 높이(턱~정수리, 약 0.216m)를 그림 높이의 0.36배로.
    s = (h * 0.385) / 0.222;
    cx = size.width * 0.5;
    cy = h * 0.085 + 0.1175 * 0.94 * s + 0.012 * s; // 정수리 + 머리카락 두께
    skin = config.skinColor;
    hair = config.hairColor;
    outfit = config.outfitColor;
    final lum = _lum(outfit);
    inner = lum > 0.34 ? const Color(0xFF37383D) : const Color(0xFFD6D0C4);
    lightHair = config.hair >= 6 && config.hair <= 8;
    iris = config.skin == 3
        ? const Color(0xFF2E1D13)
        : (lightHair ? const Color(0xFF5F7F96) : const Color(0xFF4A2F1F));
    lip = _mix(skin, const Color(0xFF7A2E2E), 0.52);
  }

  final Size size;
  final AvatarConfig config;
  late final double s, cx, cy;
  late final Color skin, hair, outfit, inner, iris, lip;
  late final bool lightHair;

  // 머리 좌표(중심 기준 m) -> 화면. 3D와 같이 위쪽 0.94, 아래쪽 0.90으로 세로 압축.
  Offset hp(double x, double y) =>
      Offset(cx + x * s, cy + (-(y >= 0 ? y * 0.94 : y * 0.90)) * s);

  // 절대 높이(m)의 몸 좌표 -> 화면.
  Offset bp(double x, double yAbs) => Offset(cx + x * s, cy + (_hc - yAbs) * s);

  static const double _hc = 1.5785;

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

  Paint blurStroke(Color c, double wm, double sigmaM) => Paint()
    ..style = PaintingStyle.stroke
    ..color = c
    ..strokeWidth = wm * s
    ..strokeCap = StrokeCap.round
    ..maskFilter = MaskFilter.blur(BlurStyle.normal, sigmaM * s);

  // Catmull-Rom 곡선 경로(점 리스트, 닫힘 여부)
  Path smooth(List<Offset> pts, {bool closed = false}) {
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

  double headW(double y) {
    // 표 보간(선형 + 에르미트 근사)
    if (y >= _headRows.first[0]) return 0;
    if (y <= _headRows.last[0]) return 0;
    for (var i = 0; i < _headRows.length - 1; i++) {
      final a = _headRows[i], b = _headRows[i + 1];
      if (y <= a[0] && y >= b[0]) {
        final t = (a[0] - y) / (a[0] - b[0]);
        final u = t * t * (3 - 2 * t);
        return a[1] + (b[1] - a[1]) * (0.35 * t + 0.65 * u);
      }
    }
    return 0.07;
  }

  List<Offset> headSide(
    double sign, {
    double off = 0,
    double y0 = 0.1175,
    double y1 = -0.1175,
    int n = 26,
  }) {
    final out = <Offset>[];
    for (var i = 0; i <= n; i++) {
      final y = y0 + (y1 - y0) * i / n;
      out.add(hp(sign * (headW(y) + off), y));
    }
    return out;
  }

  Path headPath() {
    final pts = <Offset>[];
    for (final r in _headRows) {
      pts.add(hp(r[1] == 0 ? 0 : r[1], r[0]));
    }
    // 오른쪽 윗부분(정수리 → 턱), 그 다음 왼쪽 아래 → 위
    final right = <Offset>[];
    final left = <Offset>[];
    for (final r in _headRows) {
      right.add(hp(r[1], r[0]));
    }
    for (final r in _headRows.reversed) {
      left.add(hp(-r[1], r[0]));
    }
    // 턱 끝을 둥글게: 끝점 두 개의 폭을 키운다.
    final all = <Offset>[
      ...right.sublist(0, right.length - 1),
      hp(0.012, -0.1170),
      hp(0, -0.1175 * 1.0),
      hp(-0.012, -0.1170),
      ...left.sublist(1),
    ];
    return smooth(all.sublist(0, all.length - 1), closed: true);
  }

  // ====================================================================
  void paintAll(Canvas canvas) {
    final w = size.width, h = size.height;
    // 바닥 그림자(은은하게)
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(cx, h * 0.985),
        width: w * 0.8,
        height: h * 0.05,
      ),
      blurFill(const Color(0x14000000), 0.02),
    );
    _hairBack(canvas);
    _coat(canvas);
    _neck(canvas);
    _ears(canvas);
    _head(canvas);
    _face(canvas);
    _hairFront(canvas);
  }

  // ---- 코트, 소매, 셔츠 ----------------------------------------------
  static const List<List<double>> _torso = [
    [1.444, 0.060],
    [1.434, 0.085],
    [1.420, 0.130],
    [1.402, 0.178],
    [1.380, 0.205],
    [1.300, 0.174],
    [1.200, 0.165],
    [1.080, 0.155],
    [0.980, 0.172],
    [0.880, 0.194],
  ];

  void _coat(Canvas canvas) {
    final yBot = _hc - (size.height - cy) / s - 0.5; // 화면 바닥 한참 아래까지
    // 몸통 윤곽(어깨 → 허리)
    final right = <Offset>[], left = <Offset>[];
    for (final r in _torso) {
      right.add(bp(r[1], r[0]));
      left.add(bp(-r[1], r[0]));
    }
    final body = smooth([
      ...right,
      bp(0.20, yBot),
      bp(-0.20, yBot),
      ...left.reversed,
    ], closed: true);
    final rect = Rect.fromLTRB(
      cx - 0.21 * s,
      bp(0, 1.45).dy,
      cx + 0.21 * s,
      size.height,
    );
    final baseG = ui.Gradient.linear(
      Offset(rect.left, 0),
      Offset(rect.right, 0),
      [
        _shade(outfit, -0.08),
        _shade(outfit, 0.03),
        outfit,
        _shade(outfit, 0.03),
        _shade(outfit, -0.08),
      ],
      [0.0, 0.25, 0.5, 0.75, 1.0],
    );
    canvas.drawPath(
      body,
      Paint()
        ..shader = baseG
        ..isAntiAlias = true,
    );
    // 위에서 아래로 은은한 그림자
    canvas.drawPath(
      body,
      Paint()
        ..shader = ui.Gradient.linear(
          Offset(0, rect.top),
          Offset(0, size.height),
          [
            const Color(0x14FFFFFF),
            const Color(0x00000000),
            const Color(0x26000000),
          ],
          [0.0, 0.35, 1.0],
        ),
    );
    // 셔츠(V 목선)
    final vTop = 1.438, vBot = 1.185;
    final shirt = Path()
      ..moveTo(bp(-0.066, vTop).dx, bp(-0.066, vTop).dy)
      ..lineTo(bp(0.066, vTop).dx, bp(0.066, vTop).dy)
      ..lineTo(bp(0.003, vBot).dx, bp(0.003, vBot).dy)
      ..lineTo(bp(-0.003, vBot).dx, bp(-0.003, vBot).dy)
      ..close();
    canvas.drawPath(
      shirt,
      Paint()
        ..shader = ui.Gradient.linear(bp(0, vTop), bp(0, vBot), [
          _shade(inner, 0.02),
          _shade(inner, -0.07),
        ]),
    );
    // 목선 그림자
    canvas.drawPath(shirt, stroke(const Color(0x22000000), 0.004));
    // 라펠(옷깃)
    for (final sgn in const [-1.0, 1.0]) {
      final lap = Path()
        ..moveTo(bp(sgn * 0.070, 1.440).dx, bp(sgn * 0.070, 1.440).dy)
        ..lineTo(bp(sgn * 0.116, 1.416).dx, bp(sgn * 0.116, 1.416).dy)
        ..lineTo(bp(sgn * 0.034, 1.185).dx, bp(sgn * 0.034, 1.185).dy)
        ..lineTo(bp(sgn * 0.003, 1.185).dx, bp(sgn * 0.003, 1.185).dy)
        ..close();
      canvas.drawPath(
        lap,
        Paint()
          ..shader = ui.Gradient.linear(
            bp(sgn * 0.10, 1.42),
            bp(sgn * 0.02, 1.22),
            [_shade(outfit, 0.06), _shade(outfit, -0.02)],
          ),
      );
      canvas.drawPath(
        lap,
        stroke(_shade(outfit, -0.16).withValues(alpha: 0.55), 0.0025),
      );
    }
    // 소매(양쪽): 어깨선을 따라 내려오는 팔
    for (final sgn in const [-1.0, 1.0]) {
      final sleeve = Path();
      sleeve.moveTo(bp(sgn * 0.128, 1.392).dx, bp(sgn * 0.128, 1.392).dy);
      sleeve.quadraticBezierTo(
        bp(sgn * 0.205, 1.408).dx,
        bp(sgn * 0.205, 1.408).dy,
        bp(sgn * 0.226, 1.372).dx,
        bp(sgn * 0.226, 1.372).dy,
      );
      sleeve.cubicTo(
        bp(sgn * 0.236, 1.33).dx,
        bp(sgn * 0.236, 1.33).dy,
        bp(sgn * 0.228, 1.10).dx,
        bp(sgn * 0.228, 1.10).dy,
        bp(sgn * 0.222, 0.88).dx,
        bp(sgn * 0.222, 0.88).dy,
      );
      sleeve.lineTo(bp(sgn * 0.136, 0.88).dx, bp(sgn * 0.136, 0.88).dy);
      sleeve.cubicTo(
        bp(sgn * 0.132, 1.10).dx,
        bp(sgn * 0.132, 1.10).dy,
        bp(sgn * 0.134, 1.30).dx,
        bp(sgn * 0.134, 1.30).dy,
        bp(sgn * 0.128, 1.392).dx,
        bp(sgn * 0.128, 1.392).dy,
      );
      sleeve.close();
      canvas.drawPath(
        sleeve,
        Paint()
          ..shader = ui.Gradient.linear(
            bp(sgn * 0.13, 1.2),
            bp(sgn * 0.235, 1.2),
            [_shade(outfit, 0.015), outfit, _shade(outfit, -0.09)],
            [0.0, 0.45, 1.0],
          ),
      );
      // 팔과 몸통 사이 그림자
      canvas.drawPath(
        sleeve,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 0.004 * s
          ..color = _shade(outfit, -0.2).withValues(alpha: 0.45),
      );
      // 소맷부리
      final cuff = Rect.fromPoints(
        bp(sgn * 0.136, 0.905),
        bp(sgn * 0.226, 0.878),
      );
      canvas.drawRect(cuff, fill(_shade(outfit, -0.07)));
    }
    // 단추
    for (final y in const [1.10, 0.99, 0.88]) {
      final c = bp(0, y);
      if (c.dy > size.height) continue;
      canvas.drawCircle(c, 0.0075 * s, fill(_shade(outfit, -0.18)));
      canvas.drawCircle(
        c.translate(-0.002 * s, -0.002 * s),
        0.0028 * s,
        fill(_shade(outfit, 0.05)),
      );
    }
    // 코트 칼라 뒷부분(목 뒤)
    final collar = Path()
      ..moveTo(bp(-0.078, 1.436).dx, bp(-0.078, 1.436).dy)
      ..quadraticBezierTo(
        bp(0, 1.468).dx,
        bp(0, 1.468).dy,
        bp(0.078, 1.436).dx,
        bp(0.078, 1.436).dy,
      )
      ..lineTo(bp(0.060, 1.425).dx, bp(0.060, 1.425).dy)
      ..quadraticBezierTo(
        bp(0, 1.445).dx,
        bp(0, 1.445).dy,
        bp(-0.060, 1.425).dx,
        bp(-0.060, 1.425).dy,
      )
      ..close();
    canvas.drawPath(collar, fill(_shade(outfit, -0.05)));
  }

  // ---- 목 --------------------------------------------------------------
  void _neck(Canvas canvas) {
    final path = Path()
      ..moveTo(bp(-0.050, 1.50).dx, bp(-0.050, 1.50).dy)
      ..lineTo(bp(0.050, 1.50).dx, bp(0.050, 1.50).dy)
      ..cubicTo(
        bp(0.053, 1.46).dx,
        bp(0.053, 1.46).dy,
        bp(0.056, 1.43).dx,
        bp(0.056, 1.43).dy,
        bp(0.058, 1.402).dx,
        bp(0.058, 1.402).dy,
      )
      ..quadraticBezierTo(
        bp(0, 1.392).dx,
        bp(0, 1.392).dy,
        bp(-0.058, 1.402).dx,
        bp(-0.058, 1.402).dy,
      )
      ..cubicTo(
        bp(-0.056, 1.43).dx,
        bp(-0.056, 1.43).dy,
        bp(-0.053, 1.46).dx,
        bp(-0.053, 1.46).dy,
        bp(-0.050, 1.50).dx,
        bp(-0.050, 1.50).dy,
      )
      ..close();
    canvas.drawPath(
      path,
      Paint()
        ..shader = ui.Gradient.linear(
          bp(-0.055, 1.45),
          bp(0.055, 1.45),
          [_shade(skin, -0.035), _shade(skin, 0.0), _shade(skin, -0.085)],
          [0.0, 0.45, 1.0],
        ),
    );
    // 턱 아래 그림자
    canvas.save();
    canvas.clipPath(path);
    canvas.drawOval(
      Rect.fromCenter(center: bp(0, 1.488), width: 0.13 * s, height: 0.05 * s),
      blurFill(_shade(skin, -0.22).withValues(alpha: 0.5), 0.012),
    );
    canvas.restore();
    // 코트 칼라(목 양옆으로 서 있는 옷깃)
    for (final sgn in const [-1.0, 1.0]) {
      final w = Path()
        ..moveTo(bp(sgn * 0.052, 1.405).dx, bp(sgn * 0.052, 1.405).dy)
        ..lineTo(bp(sgn * 0.062, 1.452).dx, bp(sgn * 0.062, 1.452).dy)
        ..quadraticBezierTo(
          bp(sgn * 0.085, 1.447).dx,
          bp(sgn * 0.085, 1.447).dy,
          bp(sgn * 0.112, 1.418).dx,
          bp(sgn * 0.112, 1.418).dy,
        )
        ..lineTo(bp(sgn * 0.070, 1.392).dx, bp(sgn * 0.070, 1.392).dy)
        ..close();
      canvas.drawPath(w, fill(_shade(outfit, 0.02)));
      canvas.drawPath(
        w,
        stroke(_shade(outfit, -0.2).withValues(alpha: 0.5), 0.0022),
      );
    }
    // 셔츠 칼라(목 밑동의 가는 띠)
    final band = Path()
      ..moveTo(bp(-0.060, 1.412).dx, bp(-0.060, 1.412).dy)
      ..quadraticBezierTo(
        bp(0, 1.385).dx,
        bp(0, 1.385).dy,
        bp(0.060, 1.412).dx,
        bp(0.060, 1.412).dy,
      );
    canvas.drawPath(
      band,
      stroke(_shade(inner, -0.12).withValues(alpha: 0.8), 0.006),
    );
  }

  // ---- 귀, 머리, 얼굴 ----------------------------------------------------
  void _ears(Canvas canvas) {
    for (final sgn in const [-1.0, 1.0]) {
      final c = hp(sgn * 0.0775, -0.003);
      final rect = Rect.fromCenter(
        center: c,
        width: 0.016 * s,
        height: 0.058 * s,
      );
      canvas.save();
      canvas.translate(c.dx, c.dy);
      canvas.rotate(sgn * -0.10);
      canvas.translate(-c.dx, -c.dy);
      canvas.drawOval(rect, fill(_shade(skin, -0.04)));
      canvas.drawOval(
        rect.deflate(0.0025 * s),
        fill(_mix(skin, const Color(0xFF8A3B33), 0.22)),
      );
      canvas.restore();
    }
  }

  void _head(Canvas canvas) {
    final path = headPath();
    final r = Rect.fromCenter(
      center: hp(0, 0),
      width: 0.17 * s,
      height: 0.24 * s,
    );
    // 기본 피부: 왼쪽 위에서 빛이 오는 방사 그라데이션
    canvas.drawPath(
      path,
      Paint()
        ..shader = ui.Gradient.radial(
          hp(-0.02, 0.02),
          0.13 * s,
          [_shade(skin, 0.035), skin, _shade(skin, -0.065)],
          [0.0, 0.55, 1.0],
        ),
    );
    canvas.save();
    canvas.clipPath(path);
    // 오른쪽 볼 쪽 그늘
    canvas.drawRect(
      r,
      Paint()
        ..shader = ui.Gradient.linear(
          hp(-0.07, 0),
          hp(0.08, 0),
          [
            const Color(0x00000000),
            const Color(0x00000000),
            _shade(skin, -0.32).withValues(alpha: 0.22),
          ],
          [0.0, 0.55, 1.0],
        ),
    );
    // 턱 아래 그늘
    canvas.drawRect(
      r,
      Paint()
        ..shader = ui.Gradient.linear(hp(0, -0.04), hp(0, -0.118), [
          const Color(0x00000000),
          _shade(skin, -0.3).withValues(alpha: 0.30),
        ]),
    );
    // 광대 홍조
    for (final sgn in const [-1.0, 1.0]) {
      canvas.drawOval(
        Rect.fromCenter(
          center: hp(sgn * 0.044, -0.036),
          width: 0.046 * s,
          height: 0.032 * s,
        ),
        blurFill(const Color(0xFFD0615B).withValues(alpha: 0.20), 0.011),
      );
    }
    // 눈두덩 그늘
    for (final sgn in const [-1.0, 1.0]) {
      canvas.drawOval(
        Rect.fromCenter(
          center: hp(sgn * 0.0335, 0.012),
          width: 0.05 * s,
          height: 0.026 * s,
        ),
        blurFill(_shade(skin, -0.28).withValues(alpha: 0.30), 0.007),
      );
    }
    canvas.restore();
  }

  void _face(Canvas canvas) {
    // 코: 오른쪽 그늘, 왼쪽 하이라이트, 코끝과 콧방울
    canvas.drawPath(
      smooth([hp(0.0065, 0.012), hp(0.0085, -0.012), hp(0.0105, -0.032)]),
      blurStroke(_shade(skin, -0.3).withValues(alpha: 0.30), 0.0065, 0.0035),
    );
    canvas.drawPath(
      smooth([hp(-0.0030, 0.010), hp(-0.0035, -0.012), hp(-0.0040, -0.030)]),
      blurStroke(_shade(skin, 0.16).withValues(alpha: 0.30), 0.0045, 0.003),
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: hp(0, -0.0345),
        width: 0.017 * s,
        height: 0.012 * s,
      ),
      blurFill(_shade(skin, 0.1).withValues(alpha: 0.4), 0.003),
    );
    for (final sgn in const [-1.0, 1.0]) {
      canvas.drawPath(
        smooth([
          hp(sgn * 0.0100, -0.031),
          hp(sgn * 0.0118, -0.038),
          hp(sgn * 0.0085, -0.0435),
          hp(sgn * 0.0045, -0.0445),
        ]),
        stroke(_shade(skin, -0.34).withValues(alpha: 0.55), 0.0016),
      );
      canvas.drawOval(
        Rect.fromCenter(
          center: hp(sgn * 0.0050, -0.0442),
          width: 0.0052 * s,
          height: 0.0030 * s,
        ),
        fill(_shade(skin, -0.42).withValues(alpha: 0.85)),
      );
    }
    // 코밑 그림자
    canvas.drawOval(
      Rect.fromCenter(
        center: hp(0, -0.049),
        width: 0.028 * s,
        height: 0.010 * s,
      ),
      blurFill(_shade(skin, -0.3).withValues(alpha: 0.25), 0.004),
    );
    _eyes(canvas);
    _brows(canvas);
    _mouth(canvas);
  }

  void _eyes(Canvas canvas) {
    final lash = _shade(hair, -0.25);
    for (final sgn in const [-1.0, 1.0]) {
      final inner = hp(sgn * 0.0160, 0.0050);
      final outer = hp(sgn * 0.0480, 0.0078);
      final upC = hp(sgn * 0.0320, 0.0155);
      final lowC = hp(sgn * 0.0320, -0.0040);
      final eye = Path()
        ..moveTo(inner.dx, inner.dy)
        ..quadraticBezierTo(upC.dx, upC.dy, outer.dx, outer.dy)
        ..quadraticBezierTo(lowC.dx, lowC.dy, inner.dx, inner.dy)
        ..close();
      // 눈 흰자
      canvas.drawPath(
        eye,
        Paint()
          ..shader = ui.Gradient.linear(hp(0, 0.014), hp(0, -0.004), [
            const Color(0xFFC9C2BA),
            const Color(0xFFF4F0EA),
          ]),
      );
      canvas.save();
      canvas.clipPath(eye);
      final ic = hp(sgn * 0.0315, 0.0070);
      canvas.drawCircle(
        ic,
        0.0072 * s,
        Paint()
          ..shader = ui.Gradient.radial(
            ic.translate(0, -0.002 * s),
            0.0075 * s,
            [_shade(iris, 0.07), iris, _shade(iris, -0.1)],
            [0.0, 0.7, 1.0],
          ),
      );
      canvas.drawCircle(ic, 0.0034 * s, fill(const Color(0xFF0E0C0B)));
      canvas.drawCircle(
        ic.translate(-0.0022 * s, -0.0026 * s),
        0.0014 * s,
        fill(const Color(0xCCFFFFFF)),
      );
      // 윗눈꺼풀이 드리우는 그림자
      canvas.drawPath(
        Path()
          ..moveTo(inner.dx, inner.dy - 0.01 * s)
          ..quadraticBezierTo(
            upC.dx,
            upC.dy - 0.004 * s,
            outer.dx,
            outer.dy - 0.01 * s,
          )
          ..lineTo(outer.dx, outer.dy + 0.002 * s)
          ..quadraticBezierTo(
            upC.dx,
            upC.dy + 0.0035 * s,
            inner.dx,
            inner.dy + 0.002 * s,
          )
          ..close(),
        fill(_shade(skin, -0.25).withValues(alpha: 0.50)),
      );
      canvas.restore();
      // 속눈썹 선 + 쌍꺼풀 선
      canvas.drawPath(
        Path()
          ..moveTo(inner.dx, inner.dy)
          ..quadraticBezierTo(upC.dx, upC.dy, outer.dx, outer.dy),
        stroke(lash.withValues(alpha: 0.95), 0.0018),
      );
      canvas.drawPath(
        Path()
          ..moveTo(hp(sgn * 0.0190, 0.0100).dx, hp(sgn * 0.0190, 0.0100).dy)
          ..quadraticBezierTo(
            hp(sgn * 0.0320, 0.0215).dx,
            hp(sgn * 0.0320, 0.0215).dy,
            hp(sgn * 0.0460, 0.0130).dx,
            hp(sgn * 0.0460, 0.0130).dy,
          ),
        stroke(_shade(skin, -0.25).withValues(alpha: 0.35), 0.0012),
      );
      // 아랫눈꺼풀
      canvas.drawPath(
        Path()
          ..moveTo(inner.dx, inner.dy)
          ..quadraticBezierTo(lowC.dx, lowC.dy, outer.dx, outer.dy),
        stroke(_shade(skin, -0.2).withValues(alpha: 0.35), 0.0011),
      );
    }
  }

  void _brows(Canvas canvas) {
    final c = _mix(hair, const Color(0xFF0A0A0A), 0.15);
    for (final sgn in const [-1.0, 1.0]) {
      final top = <Offset>[], bot = <Offset>[];
      for (var i = 0; i <= 5; i++) {
        final t = i / 5;
        final x = 0.010 + t * 0.046;
        final y = 0.0375 + 0.0075 * math.sin(t * math.pi * 0.85) - 0.004 * t;
        final th = 0.0050 * (1 - 0.55 * t) * (i == 0 ? 0.85 : 1.0);
        top.add(hp(sgn * x, y + th));
        bot.add(hp(sgn * x, y - th));
      }
      final path = smooth(top);
      final b = smooth(bot.reversed.toList());
      path.lineTo(bot.last.dx, bot.last.dy);
      path.addPath(b, Offset.zero);
      path.close();
      canvas.drawPath(path, fill(c.withValues(alpha: lightHair ? 0.75 : 0.88)));
    }
  }

  void _mouth(Canvas canvas) {
    Offset p(double x, double y) => hp(x, y);
    final upper = Path()
      ..moveTo(p(-0.0165, -0.0690).dx, p(-0.0165, -0.0690).dy)
      ..cubicTo(
        p(-0.010, -0.0625).dx,
        p(-0.010, -0.0625).dy,
        p(-0.003, -0.0628).dx,
        p(-0.003, -0.0628).dy,
        p(0, -0.0645).dx,
        p(0, -0.0645).dy,
      )
      ..cubicTo(
        p(0.003, -0.0628).dx,
        p(0.003, -0.0628).dy,
        p(0.010, -0.0625).dx,
        p(0.010, -0.0625).dy,
        p(0.0165, -0.0690).dx,
        p(0.0165, -0.0690).dy,
      )
      ..cubicTo(
        p(0.010, -0.0705).dx,
        p(0.010, -0.0705).dy,
        p(-0.010, -0.0705).dx,
        p(-0.010, -0.0705).dy,
        p(-0.0165, -0.0690).dx,
        p(-0.0165, -0.0690).dy,
      )
      ..close();
    final lower = Path()
      ..moveTo(p(-0.0150, -0.0695).dx, p(-0.0150, -0.0695).dy)
      ..cubicTo(
        p(-0.010, -0.0800).dx,
        p(-0.010, -0.0800).dy,
        p(0.010, -0.0800).dx,
        p(0.010, -0.0800).dy,
        p(0.0150, -0.0695).dx,
        p(0.0150, -0.0695).dy,
      )
      ..cubicTo(
        p(0.008, -0.0708).dx,
        p(0.008, -0.0708).dy,
        p(-0.008, -0.0708).dx,
        p(-0.008, -0.0708).dy,
        p(-0.0150, -0.0695).dx,
        p(-0.0150, -0.0695).dy,
      )
      ..close();
    canvas.drawPath(lower, fill(_shade(lip, 0.03)));
    canvas.drawPath(
      lower,
      blurFill(_shade(lip, 0.14).withValues(alpha: 0.6), 0.002),
    );
    canvas.drawPath(upper, fill(_shade(lip, -0.05)));
    canvas.drawPath(
      Path()
        ..moveTo(p(-0.0170, -0.0690).dx, p(-0.0170, -0.0690).dy)
        ..quadraticBezierTo(
          p(0, -0.0722).dx,
          p(0, -0.0722).dy,
          p(0.0170, -0.0690).dx,
          p(0.0170, -0.0690).dy,
        ),
      stroke(_shade(lip, -0.28).withValues(alpha: 0.9), 0.0014),
    );
    // 입술 아래 그늘
    canvas.drawOval(
      Rect.fromCenter(
        center: p(0, -0.0870),
        width: 0.026 * s,
        height: 0.008 * s,
      ),
      blurFill(_shade(skin, -0.3).withValues(alpha: 0.22), 0.004),
    );
  }

  // ---- 머리카락 ------------------------------------------------------------
  Color hairShade(double a) => _shade(hair, a);

  Paint hairPaint(Rect r) {
    final dark = lightHair ? -0.16 : -0.07;
    return Paint()
      ..shader = ui.Gradient.linear(
        Offset(r.left, r.top),
        Offset(r.right, r.bottom),
        [_shade(hair, lightHair ? 0.05 : 0.09), hair, _shade(hair, dark)],
        [0.0, 0.45, 1.0],
      );
  }

  // 정수리 쪽 바깥 윤곽 점(머리 윤곽 + 두께)
  List<Offset> _cap(
    double sign,
    double yLow,
    double thick, {
    double lift = 0.0,
  }) {
    final out = <Offset>[];
    for (var i = 0; i <= 10; i++) {
      final y = yLow + (0.1175 - yLow) * i / 10;
      final k = math.pow(i / 10, 0.7).toDouble();
      final t = thick * (0.6 + 0.4 * k) + lift * k * k;
      out.add(hp(sign * (headW(y) + t), y + (i == 10 ? t * 0.9 : t * 0.5 * k)));
    }
    return out;
  }

  Path _capShape(double yLow, double thick, double lift) {
    final r = _cap(1, yLow, thick, lift: lift);
    final l = _cap(-1, yLow, thick, lift: lift).reversed.toList();
    final pts = <Offset>[...r, ...l.sublist(1)];
    final path = smooth(pts);
    path.lineTo(l.last.dx, l.last.dy);
    path.close();
    return path;
  }

  Path _window(List<Offset> hairline, {double y1 = -0.30, double off = 0.003}) {
    // 얼굴 창: 이마의 머리선 아래, 얼굴 옆선 안쪽 전체
    final right = <Offset>[];
    final left = <Offset>[];
    for (var i = 0; i <= 20; i++) {
      final y = 0.045 + (-0.118 - 0.045) * i / 20;
      right.add(hp(headW(y) + off, y));
      left.add(hp(-(headW(y) + off), y));
    }
    final path = Path()..moveTo(hairline.first.dx, hairline.first.dy);
    path.addPath(smooth(hairline), Offset.zero);
    path.lineTo(right.first.dx, right.first.dy);
    for (final q in right) {
      path.lineTo(q.dx, q.dy);
    }
    path.lineTo(hp(0.07, y1).dx, hp(0.07, y1).dy);
    path.lineTo(hp(-0.07, y1).dx, hp(-0.07, y1).dy);
    for (final q in left.reversed) {
      path.lineTo(q.dx, q.dy);
    }
    path.lineTo(hairline.first.dx, hairline.first.dy);
    path.close();
    return path;
  }

  void _strands(
    Canvas canvas,
    Path shape, {
    int n = 18,
    double spread = 0.11,
    Offset? origin,
  }) {
    canvas.save();
    canvas.clipPath(shape);
    final o = origin ?? hp(0.012, 0.10);
    final rnd = math.Random(7 + config.style);
    for (var i = 0; i < n; i++) {
      final a = (-1.0 + 2.0 * i / (n - 1)) * 1.25 + rnd.nextDouble() * 0.12;
      final len = (0.09 + rnd.nextDouble() * 0.05) * s;
      final dir = Offset(math.sin(a), 0.45 + 0.5 * math.cos(a));
      final end = o + dir * len * 1.5;
      final mid = o + dir * len * 0.7 + Offset(math.cos(a) * 0.012 * s, 0);
      final c = i.isEven ? _shade(hair, 0.11) : _shade(hair, -0.09);
      canvas.drawPath(
        Path()
          ..moveTo(o.dx, o.dy)
          ..quadraticBezierTo(mid.dx, mid.dy, end.dx, end.dy),
        stroke(c.withValues(alpha: 0.30), 0.0028),
      );
    }
    canvas.restore();
    if (spread < 0) return;
  }

  void _hairBack(Canvas canvas) {
    switch (config.style) {
      case 1: // 단발: 목 옆으로 내려오는 뒷머리
        final path = Path();
        final pts = <Offset>[
          hp(-0.094, 0.02),
          hp(-0.103, -0.03),
          hp(-0.098, -0.090),
          hp(-0.082, -0.112),
          hp(0.082, -0.112),
          hp(0.098, -0.090),
          hp(0.103, -0.03),
          hp(0.094, 0.02),
        ];
        path.addPath(smooth(pts), Offset.zero);
        path.close();
        canvas.drawPath(path, hairPaint(path.getBounds()));
        canvas.drawPath(path, Paint()..color = const Color(0x33000000));
      case 3: // 곱슬: 부풀린 뒷머리
        final path = Path();
        for (final o in const [
          [-0.090, 0.02],
          [-0.098, -0.02],
          [-0.094, -0.06],
          [-0.085, -0.095],
          [0.090, 0.02],
          [0.098, -0.02],
          [0.094, -0.06],
          [0.085, -0.095],
          [0.0, 0.11],
          [-0.06, 0.095],
          [0.06, 0.095],
        ]) {
          path.addOval(
            Rect.fromCircle(center: hp(o[0], o[1]), radius: 0.034 * s),
          );
        }
        canvas.drawPath(path, hairPaint(path.getBounds()));
        canvas.drawPath(path, Paint()..color = const Color(0x40000000));
    }
  }

  void _hairFront(Canvas canvas) {
    final st = config.style;
    late Path shape;
    if (st == 0) {
      // 짧은 머리: 윗부분이 약간 풍성하고 옆은 짧게
      final outer = _capShape(0.012, 0.007, 0.012);
      final hairline = <Offset>[
        hp(-0.074, 0.030),
        hp(-0.066, 0.052),
        hp(-0.046, 0.070),
        hp(-0.012, 0.0765),
        hp(0.020, 0.074),
        hp(0.050, 0.066),
        hp(0.068, 0.050),
        hp(0.074, 0.030),
      ];
      final win = _window(hairline, off: -0.001);
      shape = Path.combine(PathOperation.difference, outer, win);
    } else if (st == 1) {
      // 단발: 정수리~턱 높이로 얼굴 옆을 감싸는 머리
      final top = _capShape(-0.10, 0.012, 0.012);
      final outer = Path.combine(
        PathOperation.union,
        top,
        smooth([
          hp(-0.088, 0.03),
          hp(-0.098, -0.04),
          hp(-0.092, -0.095),
          hp(-0.070, -0.103),
          hp(-0.060, -0.060),
          hp(-0.062, 0.02),
          hp(-0.07, 0.07),
          hp(0.07, 0.07),
          hp(0.062, 0.02),
          hp(0.060, -0.060),
          hp(0.070, -0.103),
          hp(0.092, -0.095),
          hp(0.098, -0.04),
          hp(0.088, 0.03),
        ], closed: true),
      );
      final hairline = <Offset>[
        hp(-0.072, 0.030),
        hp(-0.058, 0.050),
        hp(-0.034, 0.064),
        hp(-0.004, 0.066),
        hp(0.026, 0.063),
        hp(0.054, 0.054),
        hp(0.072, 0.035),
      ];
      // 앞머리가 이마를 살짝 덮고 한쪽으로 쓸어 넘김
      final win = _window(hairline, off: 0.004);
      shape = Path.combine(PathOperation.difference, outer, win);
    } else if (st == 2) {
      // 올림머리: 매끈하게 빗어 올리고 정수리 뒤에 쪽
      final outer = _capShape(0.026, 0.0055, 0.004);
      final hairline = <Offset>[
        hp(-0.074, 0.032),
        hp(-0.067, 0.056),
        hp(-0.046, 0.073),
        hp(-0.012, 0.0785),
        hp(0.020, 0.077),
        hp(0.050, 0.070),
        hp(0.068, 0.054),
        hp(0.074, 0.032),
      ];
      final win = _window(hairline, off: -0.002);
      shape = Path.combine(PathOperation.difference, outer, win);
      // 쪽
      final bun = Rect.fromCenter(
        center: hp(0.0, 0.130),
        width: 0.082 * s,
        height: 0.060 * s,
      );
      final bunPath = Path()..addOval(bun);
      shape = Path.combine(PathOperation.union, shape, bunPath);
    } else {
      // 곱슬: 둥글게 부푼 머리
      final outer = Path();
      final rnd = math.Random(3);
      for (var i = 0; i < 17; i++) {
        final t = i / 16;
        final a = math.pi * (1.0 + t);
        final rx = 0.084 + rnd.nextDouble() * 0.006;
        final x = math.cos(a) * rx;
        final y =
            0.026 +
            math.sin(-a) * 0.108 * 1.02 +
            (t > 0.9 || t < 0.1 ? -0.03 : 0);
        outer.addOval(
          Rect.fromCircle(
            center: hp(x, y),
            radius: (0.034 + rnd.nextDouble() * 0.006) * s,
          ),
        );
      }
      outer.addOval(
        Rect.fromCenter(
          center: hp(0, 0.065),
          width: 0.19 * s,
          height: 0.15 * s,
        ),
      );
      for (final sgn in const [-1.0, 1.0]) {
        for (var k = 0; k < 3; k++) {
          outer.addOval(
            Rect.fromCircle(
              center: hp(sgn * (0.090 - k * 0.003), -0.004 - k * 0.036),
              radius: 0.024 * s,
            ),
          );
        }
      }
      final hairline = <Offset>[
        hp(-0.074, 0.030),
        hp(-0.066, 0.056),
        hp(-0.040, 0.075),
        hp(-0.008, 0.080),
        hp(0.026, 0.077),
        hp(0.054, 0.066),
        hp(0.070, 0.048),
        hp(0.074, 0.030),
      ];
      final win = _window(hairline, off: 0.004);
      shape = Path.combine(PathOperation.difference, outer, win);
    }
    final bounds = shape.getBounds();
    canvas.drawPath(shape, hairPaint(bounds));
    // 안쪽 그림자(두께감) + 하이라이트 띠
    canvas.save();
    canvas.clipPath(shape);
    canvas.drawPath(
      shape,
      stroke(_shade(hair, -0.18).withValues(alpha: 0.55), 0.012)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, 0.006 * s),
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: hp(-0.022, 0.100),
        width: 0.10 * s,
        height: 0.030 * s,
      ),
      blurFill(
        _shade(hair, lightHair ? 0.12 : 0.20).withValues(alpha: 0.55),
        0.010,
      ),
    );
    canvas.restore();
    if (st == 3) {
      // 곱슬 질감
      canvas.save();
      canvas.clipPath(shape);
      final rnd = math.Random(11);
      for (var i = 0; i < 46; i++) {
        final x = (rnd.nextDouble() - 0.5) * 0.2;
        final y = (rnd.nextDouble() - 0.35) * 0.24;
        final c = hp(x, y);
        canvas.drawArc(
          Rect.fromCircle(
            center: c,
            radius: (0.010 + rnd.nextDouble() * 0.008) * s,
          ),
          rnd.nextDouble() * 6,
          3.6,
          false,
          stroke(
            (i.isEven ? _shade(hair, 0.14) : _shade(hair, -0.14)).withValues(
              alpha: 0.35,
            ),
            0.0035,
          ),
        );
      }
      canvas.restore();
    } else {
      _strands(
        canvas,
        shape,
        origin: st == 2 ? hp(0.0, 0.118) : hp(0.012, 0.10),
      );
    }
    if (st == 2) {
      // 쪽의 소용돌이 선
      final c = hp(0.0, 0.130);
      for (var i = 0; i < 3; i++) {
        canvas.drawArc(
          Rect.fromCenter(
            center: c,
            width: (0.060 - i * 0.016) * s,
            height: (0.042 - i * 0.011) * s,
          ),
          0.3 + i * 0.5,
          3.4,
          false,
          stroke(_shade(hair, -0.14).withValues(alpha: 0.45), 0.0030),
        );
      }
    }
  }
}
