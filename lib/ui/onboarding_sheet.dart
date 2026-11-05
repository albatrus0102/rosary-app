import 'package:flutter/material.dart';

/// 첫 실행 안내 시트를 띄운다.
///
/// 반환값: `true`면 음성으로 넘기기 사용, `false`면 버튼으로만 사용,
/// `null`이면 그냥 닫음(기도를 시작하지 않는다).
Future<bool?> showOnboardingSheet(BuildContext context) {
  return showModalBottomSheet<bool>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => const OnboardingSheet(),
  );
}

/// 음성 인식 자동 넘기기를 처음 쓰기 전에 보여 주는 안내.
class OnboardingSheet extends StatelessWidget {
  const OnboardingSheet({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Align(
                  child: Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: scheme.primaryContainer,
                    ),
                    child: Icon(
                      Icons.mic_none,
                      size: 28,
                      color: scheme.onPrimaryContainer,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  '"아멘"으로 자동으로 넘겨 드려요',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                Text(
                  '"아멘"이라고 말하면 다음 구슬로 넘어갑니다. '
                  '소리는 기기 안에서만 처리하고 서버로 보내지 않습니다. '
                  '마이크 권한이 필요해요.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                  ),
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('음성으로 넘기기 사용'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                  ),
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('버튼으로만 사용'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
