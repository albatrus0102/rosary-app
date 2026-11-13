import 'package:flutter/material.dart';

/// 하단 고정 조작 영역(76dp): 큰 [다음 구슬]과 작은 [이전]. 엄지가 닿는 자리에 둔다.
///
/// 이 단추들은 **구슬을 옮긴다**. 같은 기도문 안에서 아래로 내리는 '기도문 계속 읽기'
/// (글 칸 바로 아래의 테두리 알약)와 이름·모양·자리가 다르다.
///
/// 글자는 부르는 쪽이 정한 시스템 글자 배율(보통 1.3 상한)을 따르고, 높이는 늘지 않는다.
class PrayerActions extends StatelessWidget {
  const PrayerActions({
    super.key,
    required this.canGoBack,
    required this.onBack,
    required this.onNext,
    this.maxWidth = 560,
    this.bordered = true,
    this.nextLabel = defaultNextLabel,
  });

  final bool canGoBack;
  final VoidCallback onBack;
  final VoidCallback onNext;
  final double maxWidth;

  /// 위쪽 경계선. 카드 밖 아래에 붙일 때는 끈다.
  final bool bordered;

  /// 큰 단추의 글. 마지막 기도에서는 부르는 쪽이 [finishLabel]로 바꾼다.
  final String nextLabel;

  static const String defaultNextLabel = '다음 구슬';
  static const String finishLabel = '기도 마치기';

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
        border: bordered
            ? Border(top: BorderSide(color: scheme.outlineVariant))
            : null,
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
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(nextLabel, maxLines: 1),
                      ),
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
