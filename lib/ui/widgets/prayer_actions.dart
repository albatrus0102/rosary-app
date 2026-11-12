import 'package:flutter/material.dart';

/// 하단 고정 조작 영역(76dp): 큰 [다음]과 작은 [이전]. 엄지가 닿는 자리에 둔다.
///
/// 글자는 부르는 쪽이 정한 시스템 글자 배율(보통 1.3 상한)을 따르고, 높이는 늘지 않는다.
class PrayerActions extends StatelessWidget {
  const PrayerActions({
    super.key,
    required this.canGoBack,
    required this.onBack,
    required this.onNext,
    this.maxWidth = 560,
  });

  final bool canGoBack;
  final VoidCallback onBack;
  final VoidCallback onNext;
  final double maxWidth;

  static const double height = 76;
  static const double buttonHeight = 60;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return DecoratedBox(
      key: const ValueKey('prayer-actions'),
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(top: BorderSide(color: scheme.outlineVariant)),
      ),
      child: SizedBox(
        height: height,
        child: Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: FilledButton.tonal(
                      key: const ValueKey('prayer-back'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(64, buttonHeight),
                        maximumSize: const Size(double.infinity, buttonHeight),
                        textStyle: theme.textTheme.titleMedium,
                      ),
                      onPressed: canGoBack ? onBack : null,
                      child: const Text('이전'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 3,
                    child: FilledButton(
                      key: const ValueKey('prayer-next'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(64, buttonHeight),
                        maximumSize: const Size(double.infinity, buttonHeight),
                        textStyle: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      onPressed: onNext,
                      child: const Text('다음'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
