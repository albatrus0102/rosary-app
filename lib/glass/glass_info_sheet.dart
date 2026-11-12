import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app/track.dart';
import '../church/church_catalog.dart';
import 'glass_catalog.dart';
import 'glass_policy.dart';
import 'glass_widgets.dart';

/// 창 정보 시트(G-09). 아래에서 올라오는 M3 시트로, 감상 화면의 ⓘ와 갤러리에서 연다.
///
/// - 설명은 `verify`(1차 자료로 확인하지 못한 내용)가 있으면 '확인 중'을 붙여 보여 준다.
/// - 묵상 글은 [kWindowMeditationsEnabled]가 true가 되기 전에는 나오지 않는다.
/// - 원본 링크는 url_launcher가 의존성에 없으므로 선택·복사할 수 있는 글로 보여 준다.
Future<void> showGlassInfoSheet(
  BuildContext context,
  GlassWindow window, {
  VoidCallback? onPray,
}) {
  Track.screen('glass_info');
  Track.glassInfo(window.id, 'about');
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    constraints: const BoxConstraints(maxWidth: 640),
    builder: (context) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.82,
      minChildSize: 0.4,
      maxChildSize: 1,
      builder: (context, controller) => SafeArea(
        top: false,
        child: GlassInfoContent(
          window: window,
          controller: controller,
          onPray: onPray == null
              ? null
              : () {
                  Navigator.of(context).pop();
                  onPray();
                },
        ),
      ),
    ),
  );
}

/// 시트 안쪽(시험·스크린샷에서 시트 없이도 쓸 수 있게 따로 둔다).
class GlassInfoContent extends StatelessWidget {
  const GlassInfoContent({
    super.key,
    required this.window,
    this.controller,
    this.onPray,
  });

  final GlassWindow window;
  final ScrollController? controller;
  final VoidCallback? onPray;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final w = window;
    final authentic = w.isAuthentic;

    final churchNames = [
      for (final id in w.authenticChurches)
        ChurchCatalog.byId[id]?.nameKo ?? id,
    ];

    return SingleChildScrollView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(w.titleKo, style: theme.textTheme.titleLarge),
          if (w.titleEn.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                w.titleEn,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ),
          const SizedBox(height: 12),
          _Fact('위치', w.location),
          _Fact('연대 · 작가', '${w.dateText} · ${w.authorText}'),
          _Fact('형태', glassFormText(w)),
          _Fact(
            '실제 크기',
            glassSizeText(w),
            trailing: glassSizeNeedsCheck(w) && !w.size.isUnknown
                ? const _Tag('추정 · 확인 필요')
                : null,
          ),
          const _Heading('이 창에 대해'),
          if (w.hasVerify)
            const Align(
              alignment: Alignment.centerLeft,
              child: _Tag('확인 중', emphasized: true),
            ),
          if (w.hasVerify) const SizedBox(height: 6),
          Text(
            w.description.isEmpty ? '설명을 준비하고 있습니다.' : w.description,
            style: theme.textTheme.bodyLarge?.copyWith(height: 1.5),
          ),
          if (w.hasVerify)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                '확인이 필요한 부분: ${w.verify}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ),
          if (kWindowMeditationsEnabled) ...[
            const _Heading('묵상'),
            // 지도 신부 승인 전에는 이 구역이 만들어지지 않는다(kWindowMeditationsEnabled = false).
            const Text('묵상 글은 승인 후 제공됩니다.'),
          ],
          const _Heading('보이는 모습'),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GlassPlacementBadge(w.placementKind),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  authentic
                      ? '이 창은 ${churchNames.join(' · ')}의 실제 창입니다.'
                      : '같은 양식의 다른 성당 창을 참고 배치했습니다. '
                            '이 창의 원래 자리는 ${w.place}입니다.',
                  style: theme.textTheme.bodyMedium,
                ),
              ),
            ],
          ),
          if (w.heritage != GlassHeritage.none)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: _Note(kGlassHeritageNote, icon: Icons.account_balance),
            ),
          const _Heading('보정 내역'),
          Text(kGlassRetouchPolicy, style: theme.textTheme.bodyMedium),
          if (w.limitations.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              w.limitations,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
          ],
          if (w.restoration.isNotEmpty)
            Theme(
              data: theme.copyWith(dividerColor: Colors.transparent),
              child: ExpansionTile(
                key: const ValueKey('info-restoration'),
                tilePadding: EdgeInsets.zero,
                childrenPadding: const EdgeInsets.only(bottom: 8),
                title: Text('보정 기록 자세히', style: theme.textTheme.labelLarge),
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      w.restoration,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          const _Heading('사진 · 라이선스'),
          _CreditBlock(window: w),
          const _Heading('검토'),
          _ReviewBlock(window: w),
          const SizedBox(height: 16),
          _Note(kGlassUnofficialNote, icon: Icons.info_outline),
          if (onPray != null) ...[
            const SizedBox(height: 16),
            FilledButton.tonalIcon(
              key: const ValueKey('info-pray'),
              onPressed: onPray,
              icon: const Icon(Icons.self_improvement),
              label: const Text('이 창 앞에서 기도'),
            ),
          ],
        ],
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 20, bottom: 8),
      child: Text(
        text,
        style: Theme.of(context).textTheme.titleSmall
            ?.copyWith(color: Theme.of(context).colorScheme.primary),
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact(this.label, this.value, {this.trailing});

  final String label;
  final String value;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 84,
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(
            child: Wrap(
              spacing: 8,
              runSpacing: 4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(value, style: theme.textTheme.bodyMedium),
                ?trailing,
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag(this.text, {this.emphasized = false});

  final String text;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: emphasized
            ? scheme.tertiaryContainer
            : scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        child: Text(
          text,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
            color: emphasized
                ? scheme.onTertiaryContainer
                : scheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note(this.text, {required this.icon});

  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                text,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 사진 출처 칸. 문구는 카탈로그 `source.credit`를 **그대로** 쓴다(CC BY는 필수).
class _CreditBlock extends StatelessWidget {
  const _CreditBlock({required this.window});

  final GlassWindow window;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final s = window.source;
    final required = s.licenseKind?.attributionRequired ?? false;
    return DecoratedBox(
      key: const ValueKey('info-credit'),
      decoration: BoxDecoration(
        color: required
            ? scheme.primaryContainer.withValues(alpha: 0.55)
            : scheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (required)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  '작가 표시가 필요한 사진입니다',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: scheme.onPrimaryContainer,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            SelectableText(
              s.credit,
              onTap: () => Track.glassInfo(window.id, 'credit'),
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 8),
            _Fact('사진', s.author),
            _Fact('라이선스', s.license),
            if (s.licenseUrl.isNotEmpty)
              _LinkRow(label: '라이선스 링크', url: s.licenseUrl),
            // 표시 문구에 변경 여부가 이미 들어 있으면 되풀이하지 않는다.
            if (required && !s.credit.contains(kGlassChangeNote))
              _Fact('변경', kGlassChangeNote),
            if (s.url.isNotEmpty)
              _LinkRow(
                label: '원본 보기',
                url: s.url,
                onCopy: () => Track.glassInfo(window.id, 'credit'),
              ),
          ],
        ),
      ),
    );
  }
}

/// 링크는 앱 안에서 열지 않고(외부 열기 의존성 없음) 선택·복사할 수 있게 보여 준다.
class _LinkRow extends StatelessWidget {
  const _LinkRow({required this.label, required this.url, this.onCopy});

  final String label;
  final String url;
  final VoidCallback? onCopy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 84,
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(
            child: SelectableText(
              url,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.primary,
                decoration: TextDecoration.underline,
              ),
            ),
          ),
          IconButton(
            tooltip: '$label 복사',
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.copy, size: 18),
            onPressed: () {
              unawaited(Clipboard.setData(ClipboardData(text: url)));
              onCopy?.call();
              ScaffoldMessenger.maybeOf(context)
                  ?.showSnackBar(const SnackBar(content: Text('링크를 복사했습니다')));
            },
          ),
        ],
      ),
    );
  }
}

class _ReviewBlock extends StatelessWidget {
  const _ReviewBlock({required this.window});

  final GlassWindow window;

  @override
  Widget build(BuildContext context) {
    final r = window.review;
    String st(bool ok) => ok ? '검토 완료' : '검토 대기';
    final theme = Theme.of(context);
    return InkWell(
      key: const ValueKey('info-review'),
      onTap: () => Track.glassInfo(window.id, 'review'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Fact('미술사', st(r.artHistorianApproved)),
          _Fact('사제', st(r.priestApproved)),
          if (window.hasVerify)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                '설명 중 일부는 1차 자료로 확인하는 중입니다.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
