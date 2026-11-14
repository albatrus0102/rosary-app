import 'package:flutter/material.dart';

import 'church_constants.dart';
import '../app/theme.dart';

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
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 4),
          child: Text('누구를 위해 초를 켤까요?', style: theme.textTheme.titleMedium),
        ),
        const SizedBox(height: 8),
        // M3 라디오 목록(RadioGroup + RadioListTile): 하나만 고르는 의미·키보드 탐색이 자동.
        Flexible(
          child: RadioGroup<int>(
            groupValue: _selected,
            onChanged: (v) {
              if (v != null) setState(() => _selected = v);
            },
            child: ListView.builder(
              shrinkWrap: true,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: candleIntentions.length,
              itemBuilder: (context, i) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: RadioListTile<int>(
                  key: ValueKey('intention-$i'),
                  value: i,
                  selected: i == _selected,
                  selectedTileColor: scheme.secondaryContainer,
                  shape: const RoundedRectangleBorder(
                    borderRadius: AppShape.large,
                  ),
                  title: Text(candleIntentions[i]),
                ),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 4),
          child: FilledButton.icon(
            onPressed: () => Navigator.of(context).pop(_selected),
            icon: const Icon(Icons.local_fire_department_outlined),
            label: const Text('초 켜기'),
          ),
        ),
        // 걸어서 도착하면 저절로 열리는 시트이므로, 부담 없이 닫을 수 있게 한다.
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
          child: TextButton(
            key: const ValueKey('candle-later'),
            onPressed: () => Navigator.of(context).pop(),
            style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
            child: const Text('나중에'),
          ),
        ),
      ],
    );
  }
}
