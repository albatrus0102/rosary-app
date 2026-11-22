import 'package:flutter/material.dart';

import '../app/theme.dart';

/// '가기' 시트에서 고를 수 있는 곳. 웹 장면의 스테이션 종류와 같다(`ChurchAPI.walkTo`의 kind).
enum ChurchGoTarget {
  candle('candle', '촛불 봉헌대', Icons.local_fire_department_outlined),
  altar('altar', '제대 앞', Icons.church_outlined),

  /// 성모상 앞 기도 자리(shrine.js). 성모상 앞에 서서 성모상을 바라본다.
  shrine('shrine', '성모상', Icons.favorite_border),
  seat('seat', '가까운 빈 자리', Icons.event_seat_outlined),
  entrance('entrance', '입구', Icons.door_front_door_outlined),
  font('font', '성수대', Icons.water_drop_outlined),

  /// 십자가의 길: 1처 판 앞으로 걸어가 순례를 시작한다(`walkTo{kind:'cross', index:0}`).
  cross('cross', '십자가의 길', Icons.route_outlined, '1처부터 14처까지 걸으며 묵상'),

  /// 여러 층 성당(아시시)의 층: 그 층까지 계단을 걸어간다(`walkTo{kind:'level', index}`). 층마다 한 줄.
  level('level', '층', Icons.stairs_outlined);

  const ChurchGoTarget(this.kind, this.label, this.icon, [this.subtitle]);

  /// 웹 `walkTo`의 kind.
  final String kind;
  final String label;
  final IconData icon;
  final String? subtitle;
}

/// '가기' 시트에서 고른 것: 목적지 종류와(층 줄이면) 몇 번째 층인지.
@immutable
class ChurchGoChoice {
  const ChurchGoChoice(this.target, [this.index = 0]);
  final ChurchGoTarget target;

  /// [ChurchGoTarget.level]일 때 층 번호(0부터, 웹 `layout.levels` 순서).
  final int index;

  @override
  bool operator ==(Object other) =>
      other is ChurchGoChoice && other.target == target && other.index == index;

  @override
  int get hashCode => Object.hash(target, index);
}

/// '어디로 갈까요?' 바텀 시트. 고른 곳을 돌려준다(닫으면 null).
/// 성수대는 그 성당에 있을 때만([hasFont]), 십자가의 길은 14처 판이 걸린 성당에서만([hasCross]) 줄이 나온다.
/// 여러 층 성당이면 [levels](층 이름)마다 줄이 하나씩 더 나온다.
Future<ChurchGoChoice?> showChurchGoSheet(
  BuildContext context, {
  bool hasFont = false,
  bool hasCross = false,
  bool hasShrine = false,
  String? shrineLabel,
  List<String> levels = const [],
}) {
  return showModalBottomSheet<ChurchGoChoice>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    // 시스템 내비게이션 바(3버튼·제스처 막대)에 줄이 가려지지 않게 한다.
    builder: (context) => SafeArea(
      top: false,
      child: ChurchGoSheet(
        hasFont: hasFont,
        hasCross: hasCross,
        hasShrine: hasShrine,
        shrineLabel: shrineLabel,
        levels: levels,
      ),
    ),
  );
}

class ChurchGoSheet extends StatelessWidget {
  const ChurchGoSheet({
    super.key,
    this.hasFont = false,
    this.hasCross = false,
    this.hasShrine = false,
    this.shrineLabel,
    this.levels = const [],
  });

  final bool hasFont;

  /// 여러 층 성당의 층 이름(없으면 층 줄이 없다).
  final List<String> levels;
  final bool hasCross;

  /// 성모상 앞 기도 자리가 있는 성당이면 '성모상' 줄이 나온다([shrineLabel]로 이름을 바꿀 수 있다).
  final bool hasShrine;
  final String? shrineLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final targets = [
      for (final t in ChurchGoTarget.values)
        if ((t != ChurchGoTarget.font || hasFont) &&
            (t != ChurchGoTarget.cross || hasCross) &&
            (t != ChurchGoTarget.shrine || hasShrine) &&
            t != ChurchGoTarget.level)
          ChurchGoChoice(t),
      for (var i = 0; i < levels.length; i++)
        ChurchGoChoice(ChurchGoTarget.level, i),
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
              for (final c in targets)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: ListTile(
                    key: ValueKey(
                      c.target == ChurchGoTarget.level
                          ? 'go-level-${c.index}'
                          : 'go-${c.target.kind}',
                    ),
                    minTileHeight: 56,
                    shape: RoundedRectangleBorder(borderRadius: AppShape.large),
                    leading: Icon(c.target.icon),
                    title: Text(
                      c.target == ChurchGoTarget.shrine
                          ? (shrineLabel ?? c.target.label)
                          : c.target == ChurchGoTarget.level
                          ? levels[c.index]
                          : c.target.label,
                    ),
                    subtitle: c.target.subtitle == null
                        ? null
                        : Text(c.target.subtitle!),
                    onTap: () => Navigator.of(context).pop(c),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
