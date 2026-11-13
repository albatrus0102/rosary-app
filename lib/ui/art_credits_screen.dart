import 'package:flutter/material.dart';

import '../app/theme.dart';
import '../domain/art_credits.dart';
import 'widgets/section_header.dart';

/// '성화 출처': 기도 배경과 십자가의 길 그림의 작가·소장처·라이선스(모두 Public domain 또는 CC0).
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
                  '그림은 모두 작가 사후 70년이 지난 퍼블릭 도메인 작품을 그대로 찍은 사진이거나 '
                  '미술관이 CC0으로 공개한 사진입니다. 화면에 맞게 자르고 크기를 줄였습니다.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                const SectionHeader('십자가의 길'),
                Card.filled(
                  margin: EdgeInsets.zero,
                  color: scheme.surfaceContainerLow,
                  child: tile(stationsArtCredit),
                ),
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
