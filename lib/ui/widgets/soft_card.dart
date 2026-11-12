import 'package:flutter/material.dart';

import '../../app/theme.dart';

/// 호환용 얇은 래퍼: M3 [Card]를 그대로 쓴다.
///
/// 새 코드는 `Card.filled`/`Card.outlined`를 직접 쓴다. [borderColor]를 주면
/// 윤곽선 카드, 아니면 [color]를 쓰는 채운(tonal) 카드로 그린다. 탭 가능하면
/// 상태 레이어(hover/focus/pressed)가 있는 [InkWell]을 쓴다.
class SoftCard extends StatelessWidget {
  const SoftCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.color,
    this.borderColor,
    this.borderWidth = 1,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final Color? borderColor;
  final double borderWidth;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final content = onTap == null
        ? Padding(padding: padding, child: child)
        : InkWell(
            onTap: onTap,
            child: Padding(padding: padding, child: child),
          );
    final side = borderColor;
    if (side != null && side != Colors.transparent) {
      return Card.outlined(
        color: color,
        shape: RoundedRectangleBorder(
          borderRadius: AppShape.medium,
          side: BorderSide(color: side, width: borderWidth),
        ),
        child: content,
      );
    }
    return Card.filled(color: color, child: content);
  }
}
