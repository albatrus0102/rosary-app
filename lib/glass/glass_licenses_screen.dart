import 'package:flutter/material.dart';

import 'glass_catalog.dart';
import 'glass_policy.dart';

/// 더보기 > 스테인드글라스 출처(G-15). 창마다 사진 출처 문구를 카탈로그에서 만든다.
/// 작가 표시가 필수인 CC BY 사진을 먼저, 강조해서 보여 준다.
class GlassLicensesScreen extends StatelessWidget {
  const GlassLicensesScreen({super.key, this.catalog});

  /// 시험용 주입. 없으면 앱 번들의 카탈로그를 읽는다.
  final Future<GlassCatalog>? catalog;

  /// 라우트 이름(분석 화면 id `glass_licenses`).
  static const routeName = 'glass_licenses';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('스테인드글라스 출처')),
      body: FutureBuilder<GlassCatalog>(
        future: catalog ?? GlassCatalog.shared(),
        builder: (context, snap) {
          if (snap.hasError) {
            return const Center(child: Text('출처 목록을 불러오지 못했습니다.'));
          }
          final c = snap.data;
          if (c == null) {
            return const Center(child: CircularProgressIndicator());
          }
          return _Body(catalog: c);
        },
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.catalog});

  final GlassCatalog catalog;

  @override
  Widget build(BuildContext context) {
    final all = catalog.all;
    final ccBy = [
      for (final w in all)
        if (w.source.licenseKind == GlassLicense.ccBy) w,
    ];
    final free = [
      for (final w in all)
        if (w.source.licenseKind != GlassLicense.ccBy) w,
    ];
    int n(GlassLicense l) => all.where((w) => w.source.licenseKind == l).length;

    final rows = <Widget>[
      const _NoticeCard(),
      Padding(
        padding: const EdgeInsets.only(top: 20, bottom: 4),
        child: Text(
          '창 사진 ${all.length}점 · CC BY ${n(GlassLicense.ccBy)}점 · '
          'CC0 ${n(GlassLicense.cc0)}점 · 공개 도메인 ${n(GlassLicense.publicDomain)}점',
          key: const ValueKey('licenses-summary'),
          style: Theme.of(context).textTheme.bodySmall
              ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
      ),
      if (ccBy.isNotEmpty)
        const _SectionTitle(
          '작가 표시가 필요한 사진 (CC BY)',
          sub: '아래 문구는 라이선스에 따라 그대로 표시해야 합니다.',
        ),
      for (final w in ccBy) _CreditCard(window: w, highlighted: true),
      if (free.isNotEmpty)
        const _SectionTitle('CC0 · 공개 도메인', sub: '표시 의무는 없지만 작가와 출처를 함께 밝힙니다.'),
      for (final w in free) _CreditCard(window: w, highlighted: false),
    ];

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 720),
        child: ListView.builder(
          key: const ValueKey('licenses-list'),
          padding: EdgeInsets.fromLTRB(
            16,
            8,
            16,
            24 + MediaQuery.paddingOf(context).bottom,
          ),
          itemCount: rows.length,
          itemBuilder: (context, i) => rows[i],
        ),
      ),
    );
  }
}

class _NoticeCard extends StatelessWidget {
  const _NoticeCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    Widget item(IconData icon, String title, String body) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: scheme.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: theme.textTheme.titleSmall),
                const SizedBox(height: 2),
                Text(
                  body,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );

    return Card.filled(
      key: const ValueKey('licenses-notice'),
      color: scheme.surfaceContainerLow,
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            item(Icons.info_outline, '공식 서비스가 아닙니다', kGlassUnofficialNote),
            item(Icons.account_balance, '이탈리아·바티칸 문화재', kGlassHeritageNote),
            item(
              Icons.place_outlined,
              '원래 자리와 참고 배치',
              '$kGlassAuthenticMeaning $kGlassReferenceMeaning',
            ),
            item(Icons.photo_filter, '사진 보정', kGlassRetouchPolicy),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title, {required this.sub});

  final String title;
  final String sub;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 20, bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            header: true,
            child: Text(
              title,
              style: theme.textTheme.titleSmall?.copyWith(
                color: theme.colorScheme.primary,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            sub,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _CreditCard extends StatelessWidget {
  const _CreditCard({required this.window, required this.highlighted});

  final GlassWindow window;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final s = window.source;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Card.filled(
        key: ValueKey('credit-${window.id}'),
        margin: EdgeInsets.zero,
        color: highlighted
            ? scheme.primaryContainer.withValues(alpha: 0.55)
            : scheme.surfaceContainerLow,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      window.titleKo,
                      style: theme.textTheme.titleSmall,
                    ),
                  ),
                  if (highlighted)
                    Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: scheme.primary,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          child: Text(
                            s.license,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: scheme.onPrimary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              // 카탈로그의 표시 문구 그대로(CC BY는 필수).
              SelectableText(s.credit, style: theme.textTheme.bodyMedium),
              if (highlighted && !s.credit.contains(kGlassChangeNote)) ...[
                const SizedBox(height: 4),
                Text(
                  '변경: $kGlassChangeNote',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
              if (s.url.isNotEmpty) ...[
                const SizedBox(height: 4),
                SelectableText(
                  s.url,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: scheme.primary,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ],
              if (!highlighted && s.licenseUrl.isNotEmpty)
                SelectableText(
                  '${s.license} · ${s.licenseUrl}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
