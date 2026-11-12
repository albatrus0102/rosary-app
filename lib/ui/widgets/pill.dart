import 'package:flutter/material.dart';

/// 작은 상태 배지. M3 [Chip](비대화형)에 색 역할 기본값만 더한 얇은 래퍼.
///
/// [background]/[foreground]를 생략하면 secondaryContainer/onSecondaryContainer.
class Pill extends StatelessWidget {
  const Pill({
    super.key,
    required this.label,
    this.background,
    this.foreground,
    this.icon,
    this.leading,
    this.dense = false,
  });

  final String label;
  final Color? background;
  final Color? foreground;
  final IconData? icon;

  /// [icon] 대신 임의의 앞쪽 위젯(예: 깜빡이는 점)을 둔다.
  final Widget? leading;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fg = foreground ?? scheme.onSecondaryContainer;
    final bg = background ?? scheme.secondaryContainer;
    return Chip(
      label: Text(label),
      labelStyle: Theme.of(context).textTheme.labelMedium?.copyWith(color: fg),
      avatar:
          leading ?? (icon == null ? null : Icon(icon, size: 18, color: fg)),
      backgroundColor: bg,
      side: BorderSide.none,
      visualDensity: dense ? VisualDensity.compact : VisualDensity.standard,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}
