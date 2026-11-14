import 'package:flutter/material.dart';

import '../app/theme.dart';
import '../church/church_catalog.dart';
import '../domain/art_credits.dart';
import '../domain/stations_series.dart';
import 'widgets/section_header.dart';

/// '성화 출처': 기도 배경과 십자가의 길 그림의 작가·소장처·촬영자·라이선스.
///
/// 십자가의 길은 성당마다 다른 연작(대체 성화)이라 연작마다 카드 하나를 둔다. CC BY 연작은
/// 촬영자·라이선스 주소·변경 여부·파일별 원본 주소를 모두 적는다(표기 의무).
class ArtCreditsScreen extends StatelessWidget {
  const ArtCreditsScreen({super.key});

  static const routeName = 'art_credits';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    Widget tile(ArtCredit c) => ListTile(
      title: Text(c.use),
      subtitle: Text('${c.credit}\n${c.license}'),
      isThreeLine: true,
    );
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          const SliverAppBar.large(title: Text('성화 출처')),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(
              AppSpace.sm,
              0,
              AppSpace.sm,
              AppSpace.lg,
            ),
            sliver: SliverList.list(
              children: [
                Text(
                  '그림은 작가 사후 70년이 지났거나 오래전에 펴낸 퍼블릭 도메인 작품의 사진·스캔, '
                  '미술관·촬영자가 CC0으로 공개한 사진, 그리고 촬영자 표시 조건(CC BY)으로 공개된 사진입니다. '
                  '화면에 맞게 자르고 크기를 줄였습니다.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                const SectionHeader('십자가의 길'),
                Text(
                  '성당 안 14처 판과 묵상 그림은 그 성당에 실제로 걸린 작품이 아니라 '
                  '로사리움이 고른 대체 성화입니다. 성당마다 다른 시대의 연작을 걸었습니다.',
                  key: const ValueKey('art-credits-disclosure'),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: AppSpace.xs),
                for (final s in stationsSeriesCredits) ...[
                  _SeriesCard(series: s),
                  const SizedBox(height: AppSpace.xs),
                ],
                const SectionHeader('기도 배경'),
                Card.filled(
                  margin: EdgeInsets.zero,
                  color: scheme.surfaceContainerLow,
                  child: Column(
                    children: [for (final c in mysteryArtCredits) tile(c)],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 연작 하나의 출처: 작가·연도·소장처, 촬영자, 라이선스(주소), 출처 주소, 변경 여부, 쓰는 성당.
class _SeriesCard extends StatelessWidget {
  const _SeriesCard({required this.series});

  final StationsSeries series;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final small = theme.textTheme.bodySmall?.copyWith(
      color: scheme.onSurfaceVariant,
    );
    final churches = [
      for (final id in StationsSeriesCatalog.churchesOf(series))
        ChurchCatalog.byId[id]?.nameKo ?? id,
    ];
    final death = series.artistDeath;
    Widget row(String label, String value) => Padding(
      padding: const EdgeInsets.only(top: AppSpace.xxs),
      child: Text.rich(
        TextSpan(
          children: [
            TextSpan(
              text: '$label  ',
              style: theme.textTheme.labelMedium?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
            TextSpan(text: value),
          ],
        ),
        style: theme.textTheme.bodyMedium,
      ),
    );
    return Card.filled(
      key: ValueKey('art-series-${series.id}'),
      margin: EdgeInsets.zero,
      color: scheme.surfaceContainerLow,
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(series.title, style: theme.textTheme.titleMedium),
            row(
              '작가',
              death == null
                  ? '${series.artist}, ${series.year}'
                  : '${series.artist}($death년 사망), ${series.year}',
            ),
            row('소장·출전', series.place),
            row('사진·스캔', series.photographer),
            row('라이선스', '${series.licenseLabel} — ${series.licenseUrl}'),
            row('출처', series.source),
            row('변경', series.changes),
            row('쓰는 곳', churches.isEmpty ? '쓰지 않음' : churches.join(', ')),
            if (series.license == StationsLicense.ccBy)
              Theme(
                // 카드 안 펼침 목록: 위아래 구분선을 없앤다.
                data: theme.copyWith(dividerColor: Colors.transparent),
                child: ExpansionTile(
                  key: ValueKey('art-series-files-${series.id}'),
                  tilePadding: EdgeInsets.zero,
                  childrenPadding: const EdgeInsets.only(bottom: AppSpace.xs),
                  expandedCrossAxisAlignment: CrossAxisAlignment.stretch,
                  title: Text(
                    '파일별 원본 주소(14)',
                    style: theme.textTheme.labelLarge,
                  ),
                  children: [
                    for (var n = 1; n <= 14; n++)
                      SelectableText('$n처  ${series.fileUrl(n)}', style: small),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
