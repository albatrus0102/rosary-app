import 'package:flutter/material.dart';

import '../../app/theme.dart';
import '../../domain/stations_of_cross.dart';
import '../../domain/stations_prayers.dart';

/// 십자가의 길 공식 기도문(『가톨릭 기도서』)을 보여 주는 위젯 모음.
///
/// 줄 앞 기호(┼ ○ ◎)는 기도서에 인쇄된 그대로이고, 화면 낭독기에는 기호 대신 역할 이름
/// ('주송자', '선창자', '다 함께')을 읽어 준다. 색은 모두 `Theme`의 색 역할을 쓴다
/// (성당 안에서는 어두운 금색 성당 테마가 그대로 적용된다).

/// 기호 하나 + 그 기호가 이끄는 줄들.
class StationsPrayerPartView extends StatelessWidget {
  const StationsPrayerPartView({super.key, required this.part});

  final StationsPrayerPart part;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final body = theme.textTheme.bodyLarge;
    // 기호 칸 너비는 글자 크기를 따라 커진다(글자 2배에서도 본문과 겹치지 않게).
    final markW = MediaQuery.textScalerOf(context).scale(body?.fontSize ?? 16) *
        1.5;
    return MergeSemantics(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: markW,
            child: Semantics(
              label: part.role.label,
              child: ExcludeSemantics(
                child: Text(
                  part.role.glyph,
                  key: ValueKey('stations-mark-${part.role.name}'),
                  style: body?.copyWith(
                    color: scheme.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final line in part.lines)
                  line.rubric
                      ? _RubricText(line.text)
                      : Text(line.text, style: body),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 지시문(기도서의 붉은 글씨). 본문보다 작고 흐리게 보인다.
class _RubricText extends StatelessWidget {
  const _RubricText(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      label: '지시문, $text',
      child: ExcludeSemantics(
        child: Text(
          text,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}

/// 시작 기도(지시문 + ┼ 주 예수님, …).
class StationsOpeningPrayer extends StatelessWidget {
  const StationsOpeningPrayer({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      key: const ValueKey('stations-opening-prayer'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          '시작 기도',
          style: theme.textTheme.titleSmall?.copyWith(
            color: theme.colorScheme.primary,
          ),
        ),
        const SizedBox(height: AppSpace.xxs),
        _RubricText(StationsPrayers.openingRubric),
        const SizedBox(height: AppSpace.xxs),
        const StationsPrayerPartView(part: StationsPrayers.opening),
      ],
    );
  }
}

/// 한 처의 공식 기도문 전체(처로 가며 → 알림 → 계응 → 처별 기도 → 지시문).
class StationsPrayerSection extends StatelessWidget {
  const StationsPrayerSection({super.key, required this.n});

  /// 1..14
  final int n;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final p = StationsPrayers.of(n);
    const gap = SizedBox(height: AppSpace.xs);
    return Column(
      key: ValueKey('stations-prayer-$n'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          '기도문',
          style: theme.textTheme.titleSmall?.copyWith(color: scheme.primary),
        ),
        const SizedBox(height: AppSpace.xxs),
        _RubricText(p.movingRubric),
        const SizedBox(height: AppSpace.xxs),
        StationsPrayerPartView(part: p.moving),
        gap,
        Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: '제$n처 ',
                style: TextStyle(
                  color: scheme.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
              TextSpan(text: p.announce),
            ],
          ),
          key: const ValueKey('stations-announce'),
          style: theme.textTheme.bodyLarge,
        ),
        gap,
        for (final part in p.verse) ...[
          StationsPrayerPartView(part: part),
          gap,
        ],
        StationsPrayerPartView(part: p.prayer),
        const SizedBox(height: AppSpace.xxs),
        for (final r in p.after) _RubricText(r),
        const SizedBox(height: AppSpace.sm),
        const StationsPrayerLegend(),
      ],
    );
  }
}

/// 기호 범례(┼ 주송자 · ◎ 다 함께 · ○ 선창자)와 기도문 출처 한 줄.
class StationsPrayerLegend extends StatelessWidget {
  const StationsPrayerLegend({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final small = theme.textTheme.bodySmall?.copyWith(
      color: scheme.onSurfaceVariant,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          label: '기호 안내. ${[
            for (final r in StationsPrayers.rolesUsed)
              '${r.label}, ${r.official}',
          ].join('. ')}',
          child: ExcludeSemantics(
            child: Wrap(
              key: const ValueKey('stations-prayer-legend'),
              spacing: AppSpace.sm,
              runSpacing: AppSpace.xxs,
              children: [
                for (final r in StationsPrayers.rolesUsed)
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: '${r.glyph} ',
                          style: TextStyle(
                            color: scheme.primary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        TextSpan(text: r.official),
                      ],
                    ),
                    style: small,
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpace.xxs),
        Text(
          StationsPrayers.sourceCredit,
          key: const ValueKey('stations-prayer-credit'),
          style: small,
        ),
      ],
    );
  }
}

/// 앱에서 쓴 보조 묵상(짧은 묵상 + 한 줄 청원). 접혀 있고, 누르면 펼쳐진다.
class StationsMeditationTile extends StatelessWidget {
  const StationsMeditationTile({super.key, required this.station});

  final StationOfCross station;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Card.outlined(
      child: Theme(
        // 카드 안 펼침 목록: 위아래 구분선을 없앤다.
        data: theme.copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          key: ValueKey('stations-meditation-${station.n}'),
          tilePadding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
          childrenPadding: const EdgeInsets.fromLTRB(
            AppSpace.sm,
            0,
            AppSpace.sm,
            AppSpace.sm,
          ),
          expandedCrossAxisAlignment: CrossAxisAlignment.stretch,
          title: Text('묵상', style: theme.textTheme.titleSmall),
          subtitle: Text(
            '로사리움이 덧붙인 짧은 글(공식 기도문 아님)',
            style: theme.textTheme.bodySmall?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
          children: [
            Text(station.meditation, style: theme.textTheme.bodyLarge),
            const SizedBox(height: AppSpace.sm),
            Card.filled(
              color: scheme.secondaryContainer,
              child: Padding(
                padding: const EdgeInsets.all(AppSpace.sm),
                child: Text(
                  station.petition,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: scheme.onSecondaryContainer,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
