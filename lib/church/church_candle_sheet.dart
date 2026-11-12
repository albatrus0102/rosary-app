import 'package:flutter/material.dart';

import 'church_constants.dart';

/// 봉헌 초 지향을 고르는 모달 바텀 시트. 고른 지향 인덱스(0..7)를 돌려준다.
Future<int?> showCandleSheet(BuildContext context) {
  return showModalBottomSheet<int>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    // 시스템 내비게이션 바(3버튼·제스처 막대)에 버튼이 가려지지 않게 한다.
    builder: (context) => const SafeArea(top: false, child: CandleSheet()),
  );
}

class CandleSheet extends StatefulWidget {
  const CandleSheet({super.key});

  @override
  State<CandleSheet> createState() => _CandleSheetState();
}

class _CandleSheetState extends State<CandleSheet> {
  int _selected = 0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 4),
          child: Text('누구를 위해 초를 켤까요?', style: theme.textTheme.titleMedium),
        ),
        const SizedBox(height: 8),
        Flexible(
          child: ListView.builder(
            shrinkWrap: true,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: candleIntentions.length,
            itemBuilder: (context, i) {
              final selected = i == _selected;
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: ListTile(
                  key: ValueKey('intention-$i'),
                  selected: selected,
                  selectedTileColor: scheme.secondaryContainer,
                  selectedColor: scheme.onSecondaryContainer,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  leading: Icon(
                    selected
                        ? Icons.radio_button_checked
                        : Icons.radio_button_unchecked,
                  ),
                  title: Text(candleIntentions[i]),
                  onTap: () => setState(() => _selected = i),
                ),
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          child: FilledButton.icon(
            onPressed: () => Navigator.of(context).pop(_selected),
            icon: const Icon(Icons.local_fire_department),
            label: const Text('초 켜기'),
          ),
        ),
      ],
    );
  }
}
