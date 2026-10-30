import 'package:flutter/material.dart';

/// 알약 모양 작은 배지.
class Pill extends StatelessWidget {
  const Pill({
    super.key,
    required this.label,
    required this.background,
    required this.foreground,
    this.icon,
    this.leading,
    this.dense = false,
  });

  final String label;
  final Color background;
  final Color foreground;
  final IconData? icon;

  /// [icon] 대신 임의의 앞쪽 위젯(예: 깜빡이는 점)을 둔다.
  final Widget? leading;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.labelMedium
        ?.copyWith(color: foreground, fontWeight: FontWeight.w600);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: dense ? 10 : 12,
          vertical: dense ? 3 : 6,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (leading != null) ...[leading!, const SizedBox(width: 6)],
            if (leading == null && icon != null) ...[
              Icon(icon, size: 16, color: foreground),
              const SizedBox(width: 6),
            ],
            Text(label, style: style),
          ],
        ),
      ),
    );
  }
}
