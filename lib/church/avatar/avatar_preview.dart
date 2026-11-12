import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../church_constants.dart';
import 'avatar_config.dart';

/// 3D 아바타와 같은 모양의 2D 미리보기(큰 머리 인형 + 이름표).
class AvatarPreview extends StatelessWidget {
  const AvatarPreview({
    super.key,
    required this.config,
    this.height = 240,
    this.showName = true,
  });

  final AvatarConfig config;

  /// 인형 그림의 높이(이름표 제외).
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

/// 머리 인형을 그린다. 그림 영역은 가로:세로 = 4:5.
class AvatarPainter extends CustomPainter {
  const AvatarPainter(this.config);

  final AvatarConfig config;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final skin = config.skinColor;
    final hair = config.hairColor;
    final outfit = config.outfitColor;
    final fill = Paint()..style = PaintingStyle.fill;

    // 바닥 그림자.
    fill.color = const Color(0x22000000);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(w * 0.5, h * 0.965),
        width: w * 0.62,
        height: h * 0.06,
      ),
      fill,
    );

    // 신발.
    fill.color = const Color(0xFFFFFFFF);
    final shoeStroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.006
      ..color = const Color(0x33000000);
    for (final dx in const [-0.12, 0.12]) {
      final r = RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(w * (0.5 + dx), h * 0.935),
          width: w * 0.2,
          height: h * 0.07,
        ),
        Radius.circular(w * 0.06),
      );
      canvas.drawRRect(r, fill);
      canvas.drawRRect(r, shoeStroke);
    }

    // 팔(후드티 소매) + 손.
    for (final side in const [-1.0, 1.0]) {
      fill.color = _shade(outfit, -0.06);
      final arm = RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(w * (0.5 + side * 0.27), h * 0.745),
          width: w * 0.13,
          height: h * 0.2,
        ),
        Radius.circular(w * 0.065),
      );
      canvas.drawRRect(arm, fill);
      fill.color = skin;
      canvas.drawCircle(
        Offset(w * (0.5 + side * 0.27), h * 0.85),
        w * 0.06,
        fill,
      );
    }

    // 몸통(후드티).
    fill.color = outfit;
    final body = RRect.fromRectAndCorners(
      Rect.fromLTWH(w * 0.28, h * 0.62, w * 0.44, h * 0.29),
      topLeft: Radius.circular(w * 0.14),
      topRight: Radius.circular(w * 0.14),
      bottomLeft: Radius.circular(w * 0.07),
      bottomRight: Radius.circular(w * 0.07),
    );
    canvas.drawRRect(body, fill);
    // 후드(목 둘레).
    fill.color = _shade(outfit, -0.08);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(w * 0.5, h * 0.635),
        width: w * 0.3,
        height: h * 0.09,
      ),
      fill,
    );
    // 앞주머니와 끈.
    final line = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.01
      ..strokeCap = StrokeCap.round
      ..color = _shade(outfit, -0.14);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.37, h * 0.79, w * 0.26, h * 0.075),
        Radius.circular(w * 0.03),
      ),
      line,
    );
    canvas.drawLine(
      Offset(w * 0.46, h * 0.665),
      Offset(w * 0.46, h * 0.73),
      line,
    );
    canvas.drawLine(
      Offset(w * 0.54, h * 0.665),
      Offset(w * 0.54, h * 0.73),
      line,
    );

    // 머리.
    final headC = Offset(w * 0.5, h * 0.36);
    final headR = w * 0.4;
    _paintHairBack(canvas, headC, headR, hair, fill);

    fill.color = skin;
    canvas.drawCircle(headC, headR, fill);
    // 귀.
    for (final side in const [-1.0, 1.0]) {
      canvas.drawCircle(
        Offset(headC.dx + side * headR * 0.97, headC.dy + headR * 0.12),
        headR * 0.1,
        fill,
      );
    }

    _paintHairFront(canvas, headC, headR, hair, fill);

    // 볼.
    fill.color = const Color(0x66FF8FA3);
    for (final side in const [-1.0, 1.0]) {
      canvas.drawOval(
        Rect.fromCenter(
          center: Offset(
            headC.dx + side * headR * 0.52,
            headC.dy + headR * 0.4,
          ),
          width: headR * 0.28,
          height: headR * 0.17,
        ),
        fill,
      );
    }
    // 눈 + 하이라이트.
    for (final side in const [-1.0, 1.0]) {
      final eye = Offset(
        headC.dx + side * headR * 0.34,
        headC.dy + headR * 0.2,
      );
      fill.color = const Color(0xFF1A1A1A);
      canvas.drawOval(
        Rect.fromCenter(center: eye, width: headR * 0.2, height: headR * 0.26),
        fill,
      );
      fill.color = const Color(0xFFFFFFFF);
      canvas.drawCircle(
        eye.translate(-headR * 0.035, -headR * 0.06),
        headR * 0.05,
        fill,
      );
      canvas.drawCircle(
        eye.translate(headR * 0.03, headR * 0.05),
        headR * 0.022,
        fill,
      );
    }
    // 코.
    fill.color = _shade(skin, -0.12);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(headC.dx, headC.dy + headR * 0.4),
        width: headR * 0.09,
        height: headR * 0.07,
      ),
      fill,
    );
    // 입.
    final mouth = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = headR * 0.035
      ..strokeCap = StrokeCap.round
      ..color = const Color(0xFF7A3B2E);
    canvas.drawArc(
      Rect.fromCenter(
        center: Offset(headC.dx, headC.dy + headR * 0.5),
        width: headR * 0.2,
        height: headR * 0.12,
      ),
      0.2,
      math.pi - 0.4,
      false,
      mouth,
    );
  }

  /// 머리 뒤쪽(단발·올림머리·곱슬의 뒷머리).
  void _paintHairBack(
    Canvas canvas,
    Offset c,
    double r,
    Color hair,
    Paint fill,
  ) {
    fill.color = _shade(hair, -0.05);
    switch (config.style) {
      case 1: // 단발
        canvas.drawRRect(
          RRect.fromRectAndCorners(
            Rect.fromLTRB(
              c.dx - r * 1.05,
              c.dy - r * 0.2,
              c.dx + r * 1.05,
              c.dy + r * 0.85,
            ),
            bottomLeft: Radius.circular(r * 0.4),
            bottomRight: Radius.circular(r * 0.4),
            topLeft: Radius.circular(r * 0.9),
            topRight: Radius.circular(r * 0.9),
          ),
          fill,
        );
      case 2: // 올림머리: 머리 위 묶음
        canvas.drawCircle(Offset(c.dx, c.dy - r * 1.08), r * 0.32, fill);
      case 3: // 곱슬: 부풀린 뒷머리
        for (var i = 0; i < 9; i++) {
          final a = math.pi * (1.0 + i / 8);
          canvas.drawCircle(
            Offset(
              c.dx + math.cos(a) * r * 1.0,
              c.dy + math.sin(a) * r * 0.98 + r * 0.25,
            ),
            r * 0.28,
            fill,
          );
        }
    }
  }

  /// 머리 앞쪽(머리 윗부분 덮개).
  void _paintHairFront(
    Canvas canvas,
    Offset c,
    double r,
    Color hair,
    Paint fill,
  ) {
    fill.color = hair;
    final rect = Rect.fromCircle(center: c, radius: r * 1.02);
    switch (config.style) {
      case 0: // 짧은 머리
        canvas.drawArc(rect, math.pi * 1.06, math.pi * 0.88, true, fill);
        // 앞머리 윤곽을 둥글게.
        canvas.drawOval(
          Rect.fromCenter(
            center: Offset(c.dx, c.dy - r * 0.62),
            width: r * 1.7,
            height: r * 0.72,
          ),
          fill,
        );
      case 1: // 단발
        canvas.drawArc(rect, math.pi * 1.0, math.pi, true, fill);
        canvas.drawOval(
          Rect.fromCenter(
            center: Offset(c.dx, c.dy - r * 0.55),
            width: r * 1.9,
            height: r * 0.9,
          ),
          fill,
        );
      case 2: // 올림머리
        canvas.drawArc(rect, math.pi * 1.04, math.pi * 0.92, true, fill);
        canvas.drawOval(
          Rect.fromCenter(
            center: Offset(c.dx, c.dy - r * 0.6),
            width: r * 1.75,
            height: r * 0.8,
          ),
          fill,
        );
      case 3: // 곱슬: 윗머리의 곱슬 덩어리
        canvas.drawArc(rect, math.pi * 1.04, math.pi * 0.92, true, fill);
        for (var i = 0; i < 7; i++) {
          final a = math.pi * (1.08 + 0.84 * i / 6);
          canvas.drawCircle(
            Offset(
              c.dx + math.cos(a) * r * 0.95,
              c.dy + math.sin(a) * r * 0.95,
            ),
            r * 0.24,
            fill,
          );
        }
    }
  }

  @override
  bool shouldRepaint(AvatarPainter oldDelegate) => oldDelegate.config != config;
}
