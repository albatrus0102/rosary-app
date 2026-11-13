import 'package:flutter/material.dart';

import '../app/theme.dart';

/// '가기' 시트에서 고를 수 있는 곳. 웹 장면의 스테이션 종류와 같다(`ChurchAPI.walkTo`의 kind).
enum ChurchGoTarget {
  candle('candle', '촛불 봉헌대', Icons.local_fire_department),
  altar('altar', '제대 앞', Icons.church),
  seat('seat', '가까운 빈 자리', Icons.event_seat),
  entrance('entrance', '입구', Icons.door_front_door),
  font('font', '성수대', Icons.water_drop);

  const ChurchGoTarget(this.kind, this.label, this.icon);

  /// 웹 `walkTo`의 kind.
  final String kind;
  final String label;
  final IconData icon;
}

/// '어디로 갈까요?' 바텀 시트. 고른 곳을 돌려준다(닫으면 null).
/// 성수대는 그 성당에 있을 때만([hasFont]) 줄이 나온다.
Future<ChurchGoTarget?> showChurchGoSheet(
  BuildContext context, {
  bool hasFont = false,
}) {
  return showModalBottomSheet<ChurchGoTarget>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    // 시스템 내비게이션 바(3버튼·제스처 막대)에 줄이 가려지지 않게 한다.
    builder: (context) =>
        SafeArea(top: false, child: ChurchGoSheet(hasFont: hasFont)),
  );
}

class ChurchGoSheet extends StatelessWidget {
  const ChurchGoSheet({super.key, this.hasFont = false});

  final bool hasFont;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final targets = [
      for (final t in ChurchGoTarget.values)
        if (t != ChurchGoTarget.font || hasFont) t,
    ];
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 4),
          child: Text('어디로 갈까요?', style: theme.textTheme.titleMedium),
        ),
        const SizedBox(height: 8),
        Flexible(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
            children: [
              for (final t in targets)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: ListTile(
                    key: ValueKey('go-${t.kind}'),
                    minTileHeight: 56,
                    shape: RoundedRectangleBorder(borderRadius: AppShape.large),
                    leading: Icon(t.icon),
                    title: Text(t.label),
                    onTap: () => Navigator.of(context).pop(t),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
