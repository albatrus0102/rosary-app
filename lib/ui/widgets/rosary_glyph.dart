import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../app/release_gate.dart';
import '../../app/rosary_style.dart';

/// 묵주 그림 자리: 개발용 빌드에서는 번들 그림을, 검수용(출시) 빌드에서는 단순한 도형을 그린다.
///
/// 출처 미확인 묵주 그림 25장은 검수용 빌드의 번들에 없다([ReleaseGate.rosaryPhotos]).
/// 그 자리에는 묵주 색의 구슬 고리와 아래 십자가를 그려 화면이 비어 보이지 않게 한다.
class RosaryStyleImage extends StatelessWidget {
  const RosaryStyleImage({
    super.key,
    required this.style,
    required this.size,
    this.imageKey,
    this.cacheWidth,
    this.fit = BoxFit.contain,
    this.photo,
  });

  final RosaryStyle style;
  final double size;

  /// 개발용 빌드의 그림에만 붙는 키(시험용).
  final Key? imageKey;
  final int? cacheWidth;
  final BoxFit fit;

  /// 쓸 그림 경로(기본은 [RosaryStyleAssets.fullImage]).
  final String? photo;

  @override
  Widget build(BuildContext context) {
    final glyph = RosaryGlyph(style: style, size: size);
    if (!ReleaseGate.rosaryPhotos) return glyph;
    return Image.asset(
      photo ?? style.fullImage,
      key: imageKey,
      width: size,
      height: size,
      cacheWidth: cacheWidth,
      fit: fit,
      excludeFromSemantics: true,
      errorBuilder: (_, _, _) => glyph,
    );
  }
}

/// 구슬 고리 + 십자가. 구슬은 [RosaryStyle.beadColor], 십자가는 [RosaryStyle.accentColor].
class RosaryGlyph extends StatelessWidget {
  const RosaryGlyph({super.key, required this.style, required this.size});

  final RosaryStyle style;
  final double size;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ExcludeSemantics(
      child: SizedBox(
        key: const ValueKey('rosary-glyph'),
        width: size,
        height: size,
        child: CustomPaint(
          painter: _GlyphPainter(
            bead: style.beadColor,
            accent: style.accentColor,
            outline: scheme.outline,
          ),
        ),
      ),
    );
  }
}

class _GlyphPainter extends CustomPainter {
  const _GlyphPainter({
    required this.bead,
    required this.accent,
    required this.outline,
  });

  final Color bead;
  final Color accent;
  final Color outline;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.shortestSide;
    final c = Offset(size.width / 2, s * 0.40);
    final r = s * 0.30;
    final dot = s * 0.045;
    final fill = Paint()..color = bead;
    final edge = Paint()
      ..color = outline.withValues(alpha: 0.55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = math.max(0.5, s * 0.008);
    final chain = Paint()
      ..color = accent
      ..style = PaintingStyle.stroke
      ..strokeWidth = math.max(1, s * 0.012);
    canvas.drawCircle(c, r, chain);
    const n = 20;
    for (var i = 0; i < n; i++) {
      final a = -math.pi / 2 + i * 2 * math.pi / n;
      final big = i % 5 == 0;
      final p = c + Offset(math.cos(a), math.sin(a)) * r;
      canvas.drawCircle(p, big ? dot * 1.5 : dot, fill);
      canvas.drawCircle(p, big ? dot * 1.5 : dot, edge);
    }
    // 아래 십자가
    final top = c + Offset(0, r);
    final cx = top.dx;
    final y0 = top.dy + dot * 1.5;
    final stem = s * 0.14;
    canvas.drawLine(top, Offset(cx, y0), chain);
    final cross = Paint()
      ..color = accent
      ..style = PaintingStyle.stroke
      ..strokeWidth = math.max(1.5, s * 0.03)
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(cx, y0), Offset(cx, y0 + stem), cross);
    canvas.drawLine(
      Offset(cx - stem * 0.38, y0 + stem * 0.3),
      Offset(cx + stem * 0.38, y0 + stem * 0.3),
      cross,
    );
  }

  @override
  bool shouldRepaint(_GlyphPainter o) =>
      o.bead != bead || o.accent != accent || o.outline != outline;
}
