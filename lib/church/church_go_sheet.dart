import 'package:flutter/material.dart';

import '../app/theme.dart';

/// '가기' 시트에서 고를 수 있는 곳. 웹 장면의 스테이션 종류와 같다(`ChurchAPI.walkTo`의 kind).
enum ChurchGoTarget {
  candle('candle', '촛불 봉헌대', Icons.local_fire_department_outlined),
  altar('altar', '제대 앞', Icons.church_outlined),
  seat('seat', '가까운 빈 자리', Icons.event_seat_outlined),
  entrance('entrance', '입구', Icons.door_front_door_outlined),
  font('font', '성수대', Icons.water_drop_outlined),

  /// 십자가의 길: 1처 판 앞으로 걸어가 순례를 시작한다(`walkTo{kind:'cross', index:0}`).
  cross('cross', '십자가의 길', Icons.route_outlined, '1처부터 14처까지 걸으며 묵상');

  const ChurchGoTarget(this.kind, this.label, this.icon, [this.subtitle]);

  /// 웹 `walkTo`의 kind.
  final String kind;
  final String label;
  final IconData icon;
  final String? subtitle;
}

/// '어디로 갈까요?' 바텀 시트. 고른 곳을 돌려준다(닫으면 null).
/// 성수대는 그 성당에 있을 때만([hasFont]), 십자가의 길은 14처 판이 걸린 성당에서만([hasCross]) 줄이 나온다.
Future<ChurchGoTarget?> showChurchGoSheet(
  BuildContext context, {
  bool hasFont = false,
  bool hasCross = false,
}) {
  return showModalBottomSheet<ChurchGoTarget>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    // 시스템 내비게이션 바(3버튼·제스처 막대)에 줄이 가려지지 않게 한다.
    builder: (context) => SafeArea(
      top: false,
      child: ChurchGoSheet(hasFont: hasFont, hasCross: hasCross),
    ),
  );
}

class ChurchGoSheet extends StatelessWidget {
  const ChurchGoSheet({super.key, this.hasFont = false, this.hasCross = false});

  final bool hasFont;
  final bool hasCross;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final targets = [
      for (final t in ChurchGoTarget.values)
        if ((t != ChurchGoTarget.font || hasFont) &&
            (t != ChurchGoTarget.cross || hasCross))
          t,
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
                    subtitle: t.subtitle == null ? null : Text(t.subtitle!),
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
