import 'package:flutter/material.dart';

import '../../app/theme.dart';

/// 금색 장식선(시안의 머리말 십자 장식선·섹션 제목 양옆 선). 색은 [AppDecor.gold].
/// 장식일 뿐이라 화면 낭독에서 뺀다.
class OrnamentLine extends StatelessWidget {
  /// 가운데 작은 십자가 있는 장식선(머리말 위).
  const OrnamentLine.cross({super.key, this.width = 176})
    : _kind = _OrnamentKind.cross;

  /// 한쪽 끝에 마름모가 달린 선. [diamondAtEnd]가 true 면 오른쪽 끝, false 면 왼쪽 끝.
  const OrnamentLine.rule({super.key, bool diamondAtEnd = true})
    : width = double.infinity,
      _kind = diamondAtEnd ? _OrnamentKind.ruleEnd : _OrnamentKind.ruleStart;

  final double width;
  final _OrnamentKind _kind;

  /// 장식선 높이(4dp 격자).
  static const double height = 16;

  @override
  Widget build(BuildContext context) {
    final gold = AppDecor.of(context).gold;
    return ExcludeSemantics(
      child: SizedBox(
        width: width,
        height: height,
        child: CustomPaint(painter: _OrnamentPainter(gold, _kind)),
      ),
    );
  }
}

enum _OrnamentKind { cross, ruleStart, ruleEnd }

class _OrnamentPainter extends CustomPainter {
  const _OrnamentPainter(this.color, this.kind);

  final Color color;
  final _OrnamentKind kind;

  @override
  void paint(Canvas canvas, Size size) {
    final cy = size.height / 2;
    final line = Paint()
      ..color = color
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;
    final fill = Paint()..color = color;

    void fadeLine(double from, double to) {
      // 바깥쪽 끝으로 갈수록 옅어지는 가는 선.
      final rect = Rect.fromLTRB(
        from < to ? from : to,
        cy - 1,
        from < to ? to : from,
        cy + 1,
      );
      final paint = Paint()
        ..strokeWidth = 1
        ..shader = LinearGradient(
          begin: from < to ? Alignment.centerLeft : Alignment.centerRight,
          end: from < to ? Alignment.centerRight : Alignment.centerLeft,
          colors: [color, color.withValues(alpha: 0)],
        ).createShader(rect);
      canvas.drawLine(Offset(from, cy), Offset(to, cy), paint);
    }

    void diamond(double cx, double r) {
      canvas.drawPath(
        Path()
          ..moveTo(cx - r, cy)
          ..lineTo(cx, cy - r)
          ..lineTo(cx + r, cy)
          ..lineTo(cx, cy + r)
          ..close(),
        fill,
      );
    }

    switch (kind) {
      case _OrnamentKind.cross:
        final cx = size.width / 2;
        const gap = 14.0;
        fadeLine(cx - gap, 0);
        fadeLine(cx + gap, size.width);
        diamond(cx - gap, 2);
        diamond(cx + gap, 2);
        // 가운데 작은 십자(세로가 긴 라틴 십자).
        final cross = Paint()
          ..color = color
          ..strokeWidth = 2
          ..strokeCap = StrokeCap.round;
        canvas.drawLine(Offset(cx, 1), Offset(cx, size.height - 1), cross);
        canvas.drawLine(Offset(cx - 4, cy - 2), Offset(cx + 4, cy - 2), cross);
      case _OrnamentKind.ruleEnd:
        fadeLine(size.width - 6, 0);
        diamond(size.width - 4, 3);
        canvas.drawCircle(Offset(size.width - 4, cy), 5, line);
      case _OrnamentKind.ruleStart:
        fadeLine(6, size.width);
        diamond(4, 3);
        canvas.drawCircle(Offset(4, cy), 5, line);
    }
  }

  @override
  bool shouldRepaint(_OrnamentPainter old) =>
      old.color != color || old.kind != kind;
}

/// 양옆에 장식선이 있는 가운데 정렬 섹션 제목('다른 성당 고르기').
class OrnamentTitle extends StatelessWidget {
  const OrnamentTitle(this.title, {super.key});

  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      header: true,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Flexible(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 96),
              child: const OrnamentLine.rule(),
            ),
          ),
          Flexible(
            flex: 3,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
              child: Text(
                title,
                textAlign: TextAlign.center,
                style: theme.textTheme.titleMedium,
              ),
            ),
          ),
          Flexible(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 96),
              child: const OrnamentLine.rule(diamondAtEnd: false),
            ),
          ),
        ],
      ),
    );
  }
}
