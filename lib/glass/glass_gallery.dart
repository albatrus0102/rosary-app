import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import '../app/track.dart';
import '../app/window_class.dart';
import '../domain/prayer_data.dart';
import 'glass_catalog.dart';
import 'glass_filters.dart';
import 'glass_widgets.dart';

/// 갤러리 홈(G-06): 오늘의 창, 필터, 창 본래 비율 그대로의 카드 격자.
///
/// 창을 여는 일([onOpen])과 기도로 가는 일([onOpenPrayer])은 호출한 쪽이 한다.
class GlassGallery extends StatefulWidget {
  const GlassGallery({
    super.key,
    required this.catalog,
    required this.onOpen,
    this.onOpenPrayer,
    this.now,
  });

  final GlassCatalog catalog;

  /// 창 카드를 눌렀다. [from]은 'today'(오늘의 창 카드) | 'gallery'(격자).
  final void Function(GlassWindow window, String from) onOpen;

  /// 오늘의 묵주기도 띠·'이 창 앞에서 기도'. 없으면 띠를 숨긴다.
  final void Function(GlassWindow? window)? onOpenPrayer;

  /// 시험용: '오늘'을 정한다.
  final DateTime Function()? now;

  @override
  State<GlassGallery> createState() => _GlassGalleryState();
}

class _GlassGalleryState extends State<GlassGallery> {
  GlassFilters _filters = const GlassFilters();

  List<GlassWindow> get _visible => widget.catalog.visible;

  void _toggle(GlassFilterKind kind, Object value, String eventValue) {
    final next = _filters.toggled(kind, value);
    final turnedOn = next.countOf(kind) > _filters.countOf(kind);
    setState(() => _filters = next);
    if (turnedOn) Track.glassFilter(kind.key, eventValue);
  }

  void _clear() => setState(() => _filters = const GlassFilters());

  Future<void> _openFilterSheet(GlassFilterKind kind) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      constraints: const BoxConstraints(maxWidth: 640),
      builder: (context) => _FilterSheet(
        kind: kind,
        catalog: widget.catalog,
        initial: _filters,
        onToggle: _toggle,
        onClear: _clear,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final wc = windowClassOf(context);
    final width = MediaQuery.sizeOf(context).width;
    final margin = wc.margin;
    final side = math.max(margin, (width - 1100) / 2);
    final scale = MediaQuery.textScalerOf(context);
    final filtered = _filters.apply(_visible);
    final today = widget.catalog.windowOfTheDay((widget.now ?? DateTime.now)());
    final cols = scale.scale(14) > 21 && wc.isCompact
        ? 1
        : switch (wc) {
            WindowClass.compact => 2,
            WindowClass.medium => 3,
            WindowClass.expanded => 4,
          };

    return Column(
      children: [
        Expanded(
          child: CustomScrollView(
            key: const ValueKey('glass-gallery-scroll'),
            slivers: [
              // 필터를 켜면 결과가 바로 위에 보이도록 오늘의 창 카드는 접는다.
              if (today != null && _filters.isEmpty)
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(side, 4, side, 8),
                  sliver: SliverToBoxAdapter(
                    child: _TodayCard(
                      window: today,
                      onOpen: () => widget.onOpen(today, 'today'),
                      onPray: widget.onOpenPrayer == null
                          ? null
                          : () => widget.onOpenPrayer!(today),
                    ),
                  ),
                ),
              SliverPadding(
                padding: EdgeInsets.fromLTRB(side, 4, side, 0),
                sliver: SliverToBoxAdapter(
                  child: _FilterBar(
                    filters: _filters,
                    onOpenKind: _openFilterSheet,
                    onRemove: (f) =>
                        setState(() => _filters = _filters.without(f)),
                    onClear: _clear,
                    shown: filtered.length,
                    total: _visible.length,
                  ),
                ),
              ),
              if (filtered.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: _EmptyState(onClear: _clear),
                )
              else
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(side, 8, side, 16),
                  sliver: SliverGrid(
                    key: ValueKey('glass-grid-$cols'),
                    gridDelegate: _MasonryDelegate(
                      aspects: [for (final w in filtered) w.aspect],
                      columns: cols,
                      gap: 10,
                      captionHeight: GlassCard.captionHeight(scale),
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, i) {
                        final w = filtered[i];
                        return GlassCard(
                          key: ValueKey('glass-card-${w.id}'),
                          window: w,
                          onTap: () => widget.onOpen(w, 'gallery'),
                        );
                      },
                      childCount: filtered.length,
                      findChildIndexCallback: (key) {
                        if (key is ValueKey<String>) {
                          final id = key.value.replaceFirst('glass-card-', '');
                          final i = filtered.indexWhere((w) => w.id == id);
                          return i < 0 ? null : i;
                        }
                        return null;
                      },
                    ),
                  ),
                ),
            ],
          ),
        ),
        if (widget.onOpenPrayer != null)
          _PrayerStrip(onTap: () => widget.onOpenPrayer!(null)),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// 마소닉 격자: 열마다 가장 짧은 곳에 다음 카드를 둔다. 카드 높이는 폭·창 비율·글자 크기로
// 미리 정해지므로 SliverGrid의 사용자 정의 배치로 보이는 것만 만든다(게으른 로딩).
// ---------------------------------------------------------------------------

/// 카드 사진 칸의 비율 한계(가로÷세로). 아주 길쭉한 창도 칸은 이 안으로 두고 사진은
/// 칸 안에서 본래 비율로 보여 준다.
const double kTileMinAspect = 0.45;
const double kTileMaxAspect = 1.6;

double glassTileAspect(double aspect) =>
    aspect.clamp(kTileMinAspect, kTileMaxAspect).toDouble();

class _MasonryDelegate extends SliverGridDelegate {
  const _MasonryDelegate({
    required this.aspects,
    required this.columns,
    required this.gap,
    required this.captionHeight,
  });

  final List<double> aspects;
  final int columns;
  final double gap;
  final double captionHeight;

  @override
  SliverGridLayout getLayout(SliverConstraints constraints) {
    final colW = (constraints.crossAxisExtent - gap * (columns - 1)) / columns;
    return _MasonryLayout(
      colWidth: colW,
      gap: gap,
      columns: columns,
      heights: [
        for (final a in aspects) colW / glassTileAspect(a) + captionHeight,
      ],
    );
  }

  @override
  bool shouldRelayout(_MasonryDelegate old) =>
      old.columns != columns ||
      old.gap != gap ||
      old.captionHeight != captionHeight ||
      !_sameList(old.aspects, aspects);

  static bool _sameList(List<double> a, List<double> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}

class _MasonryLayout extends SliverGridLayout {
  _MasonryLayout({
    required this.colWidth,
    required this.gap,
    required this.columns,
    required this.heights,
  }) {
    final colBottom = List<double>.filled(columns, 0);
    tops = List<double>.filled(heights.length, 0);
    col = List<int>.filled(heights.length, 0);
    for (var i = 0; i < heights.length; i++) {
      var c = 0;
      for (var k = 1; k < columns; k++) {
        if (colBottom[k] < colBottom[c] - 0.01) c = k;
      }
      tops[i] = colBottom[c];
      col[i] = c;
      colBottom[c] += heights[i] + gap;
    }
    total = colBottom.fold<double>(0, math.max);
    // 앞에서부터 본 바닥의 최댓값(스크롤 위치에서 처음 보이는 카드를 찾는 데 쓴다).
    preMaxBottom = List<double>.filled(heights.length, 0);
    var m = 0.0;
    for (var i = 0; i < heights.length; i++) {
      m = math.max(m, tops[i] + heights[i]);
      preMaxBottom[i] = m;
    }
  }

  final double colWidth;
  final double gap;
  final int columns;
  final List<double> heights;
  late final List<double> tops;
  late final List<int> col;
  late final List<double> preMaxBottom;
  late final double total;

  @override
  int getMinChildIndexForScrollOffset(double scrollOffset) {
    // 바닥이 scrollOffset보다 아래인 첫 카드. preMaxBottom은 줄지 않으므로 이진 탐색한다.
    var lo = 0, hi = heights.length;
    while (lo < hi) {
      final mid = (lo + hi) >> 1;
      if (preMaxBottom[mid] > scrollOffset) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    return math.max(0, math.min(lo, heights.length - 1));
  }

  @override
  int getMaxChildIndexForScrollOffset(double scrollOffset) {
    // 카드의 top은 앞에서 뒤로 줄지 않는다: scrollOffset 위에서 시작하는 마지막 카드.
    var lo = 0, hi = heights.length;
    while (lo < hi) {
      final mid = (lo + hi) >> 1;
      if (tops[mid] < scrollOffset) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return math.max(0, math.min(lo - 1, heights.length - 1));
  }

  @override
  SliverGridGeometry getGeometryForChildIndex(int index) => SliverGridGeometry(
    scrollOffset: tops[index],
    crossAxisOffset: col[index] * (colWidth + gap),
    mainAxisExtent: heights[index],
    crossAxisExtent: colWidth,
  );

  @override
  double computeMaxScrollOffset(int childCount) =>
      childCount == 0 ? 0 : math.max(0, total - gap);
}

// ---------------------------------------------------------------------------
// 카드
// ---------------------------------------------------------------------------

/// 창 카드: 돌 바탕 위에 창 사진(본래 비율), 이름·소재지·시대. 높이는 [captionHeight]와
/// 폭·비율로 정해진다.
class GlassCard extends StatelessWidget {
  const GlassCard({super.key, required this.window, required this.onTap});

  final GlassWindow window;
  final VoidCallback onTap;

  static const double _titleSize = 14;
  static const double _metaSize = 12;
  static const double _titleLine = 1.3;
  static const double _metaLine = 1.35;
  static const double _captionPad = 10;
  static const double _picturePad = 6;

  /// 글자 크기 배율에 따른 글 칸 높이(제목 2줄 + 소재지·시대 2줄).
  static double captionHeight(TextScaler scaler) =>
      _captionPad +
      scaler.scale(_titleSize) * _titleLine * 2 +
      4 +
      scaler.scale(_metaSize) * _metaLine * 2 +
      4;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final w = window;
    final dpr = MediaQuery.devicePixelRatioOf(context);
    final era = w.era?.label;
    final meta = [w.shortPlace, ?era].join(' · ');
    return Semantics(
      button: true,
      excludeSemantics: true,
      label:
          '${w.titleKo}, ${w.place}, ${glassFormText(w)}, '
          '${GlassPlacementBadge.labelOf(w.placementKind)}',
      hint: '눌러서 감상하기',
      onTap: onTap,
      child: Card.filled(
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        color: scheme.surfaceContainerLow,
        child: InkWell(
          onTap: onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: LayoutBuilder(
                  builder: (context, c) => ColoredBox(
                    color: kGlassStone,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(_picturePad),
                          child: GlassPicture(
                            // 카드는 소형 썸네일만 디코드한다(1k 원본은 감상 화면용).
                            path: w.galleryFile.path,
                            cacheBox: glassCacheBox(
                              Size(
                                c.maxWidth - 2 * _picturePad,
                                c.maxHeight - 2 * _picturePad,
                              ),
                              dpr,
                            ),
                          ),
                        ),
                        Positioned(
                          left: 6,
                          top: 6,
                          right: 6,
                          child: Align(
                            alignment: Alignment.topLeft,
                            child: GlassPlacementBadge(
                              w.placementKind,
                              onDark: true,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              SizedBox(
                height: captionHeight(MediaQuery.textScalerOf(context)),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(10, 6, 10, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        w.titleKo,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        strutStyle: const StrutStyle(
                          fontSize: _titleSize,
                          height: _titleLine,
                          forceStrutHeight: true,
                        ),
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontSize: _titleSize,
                          height: _titleLine,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        meta,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        strutStyle: const StrutStyle(
                          fontSize: _metaSize,
                          height: _metaLine,
                          forceStrutHeight: true,
                        ),
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontSize: _metaSize,
                          height: _metaLine,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TodayCard extends StatelessWidget {
  const _TodayCard({required this.window, required this.onOpen, this.onPray});

  final GlassWindow window;
  final VoidCallback onOpen;
  final VoidCallback? onPray;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final w = window;
    final width = MediaQuery.sizeOf(context).width;
    final dpr = MediaQuery.devicePixelRatioOf(context);
    final wide = width >= 600;
    final image = Semantics(
      button: true,
      label: '오늘의 창, ${w.titleKo}. 눌러서 감상하기',
      excludeSemantics: true,
      onTap: onOpen,
      child: InkWell(
        onTap: onOpen,
        child: ColoredBox(
          color: kGlassStone,
          child: SizedBox(
            height: wide ? 280 : 232,
            width: double.infinity,
            child: Padding(
              padding: const EdgeInsets.all(12),
              // 칸에 실제로 그려지는 크기까지만 디코드한다. 예전의 `cacheWidth: 600 × 배율`은
              // 세로로 긴 창을 원본의 몇 배(수십 MB)로 확대 디코드했다.
              child: LayoutBuilder(
                builder: (context, c) => GlassPicture(
                  path: w.galleryFile.path,
                  cacheBox: glassCacheBox(c.biggest, dpr),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    final info = Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Wrap(
            spacing: 6,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Icon(Icons.wb_twilight, size: 18, color: scheme.primary),
              Text(
                '오늘의 창',
                style: theme.textTheme.labelLarge?.copyWith(
                  color: scheme.primary,
                ),
              ),
              GlassPlacementBadge(w.placementKind),
            ],
          ),
          const SizedBox(height: 8),
          Text(w.titleKo, style: theme.textTheme.titleMedium),
          const SizedBox(height: 2),
          Text(
            [w.place, w.dateText].join(' · '),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                key: const ValueKey('today-open'),
                onPressed: onOpen,
                icon: const Icon(Icons.visibility_outlined),
                label: const Text('감상하기'),
              ),
              if (onPray != null)
                OutlinedButton(
                  key: const ValueKey('today-pray'),
                  onPressed: onPray,
                  child: const Text('이 창 앞에서 기도'),
                ),
            ],
          ),
        ],
      ),
    );
    return Card.filled(
      key: const ValueKey('glass-today'),
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      color: scheme.surfaceContainerLow,
      child: wide
          ? Row(
              children: [
                Expanded(flex: 5, child: image),
                Expanded(flex: 4, child: info),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [image, info],
            ),
    );
  }
}

// ---------------------------------------------------------------------------
// 필터
// ---------------------------------------------------------------------------

class _FilterBar extends StatelessWidget {
  const _FilterBar({
    required this.filters,
    required this.onOpenKind,
    required this.onRemove,
    required this.onClear,
    required this.shown,
    required this.total,
  });

  final GlassFilters filters;
  final void Function(GlassFilterKind) onOpenKind;
  final void Function(GlassActiveFilter) onRemove;
  final VoidCallback onClear;
  final int shown;
  final int total;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final active = filters.active;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final k in GlassFilterKind.values) ...[
                FilterChip(
                  key: ValueKey('filter-${k.key}'),
                  selected: filters.countOf(k) > 0,
                  showCheckmark: false,
                  label: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        filters.countOf(k) > 0
                            ? '${k.label} ${filters.countOf(k)}'
                            : k.label,
                      ),
                      const Icon(Icons.arrow_drop_down, size: 18),
                    ],
                  ),
                  tooltip: '${k.label} 고르기',
                  onSelected: (_) => onOpenKind(k),
                ),
                const SizedBox(width: 8),
              ],
            ],
          ),
        ),
        if (active.isNotEmpty) ...[
          const SizedBox(height: 4),
          Wrap(
            spacing: 8,
            runSpacing: 0,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              for (final f in active)
                InputChip(
                  key: ValueKey('active-${f.kind.key}-${f.value}'),
                  label: Text(f.label),
                  onDeleted: () => onRemove(f),
                  deleteButtonTooltipMessage: '${f.label} 필터 끄기',
                ),
              TextButton(
                key: const ValueKey('filter-clear-all'),
                onPressed: onClear,
                child: const Text('모두 지우기'),
              ),
            ],
          ),
        ],
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            active.isEmpty ? '창 $total개' : '창 $total개 중 $shown개',
            key: const ValueKey('glass-count'),
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      ],
    );
  }
}

class _FilterSheet extends StatefulWidget {
  const _FilterSheet({
    required this.kind,
    required this.catalog,
    required this.initial,
    required this.onToggle,
    required this.onClear,
  });

  final GlassFilterKind kind;
  final GlassCatalog catalog;
  final GlassFilters initial;
  final void Function(GlassFilterKind, Object, String) onToggle;
  final VoidCallback onClear;

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late GlassFilters _f = widget.initial;

  void _toggle(Object value, String eventValue) {
    widget.onToggle(widget.kind, value, eventValue);
    setState(() => _f = _f.toggled(widget.kind, value));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final all = widget.catalog.visible;
    final chips = <Widget>[];
    void add(
      String label,
      int n,
      bool selected,
      VoidCallback onTap,
      String id,
    ) {
      chips.add(
        FilterChip(
          key: ValueKey('opt-$id'),
          label: Text('$label $n'),
          selected: selected,
          onSelected: (_) => onTap(),
        ),
      );
    }

    switch (widget.kind) {
      case GlassFilterKind.church:
        for (final s in widget.catalog.sites) {
          add(
            s,
            all.where((w) => w.site == s).length,
            _f.sites.contains(s),
            () => _toggle(s, glassSiteKey(s)),
            glassSiteKey(s),
          );
        }
      case GlassFilterKind.era:
        for (final e in GlassEra.values) {
          final n = all.where((w) => w.era == e).length;
          if (n > 0) {
            add(
              e.label,
              n,
              _f.eras.contains(e),
              () => _toggle(e, e.name),
              e.name,
            );
          }
        }
      case GlassFilterKind.shape:
        for (final s in GlassForm.values) {
          final n = all.where((w) => w.shape == s).length;
          if (n > 0) {
            add(
              s.label,
              n,
              _f.shapes.contains(s),
              () => _toggle(s, s.name),
              s.name,
            );
          }
        }
      case GlassFilterKind.color:
        for (final c in GlassColorTag.values) {
          final n = all.where((w) => w.colors.contains(c)).length;
          if (n > 0) {
            add(
              c.label,
              n,
              _f.colors.contains(c),
              () => _toggle(c, c.name),
              c.name,
            );
          }
        }
    }
    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '${widget.kind.label} 고르기',
              style: theme.textTheme.titleMedium,
            ),
            if (widget.kind == GlassFilterKind.color)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  '사진 설명에 적힌 주요 색으로 나눈 것입니다.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 8, children: chips),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: _f.isEmpty
                      ? null
                      : () {
                          widget.onClear();
                          setState(() => _f = const GlassFilters());
                        },
                  child: const Text('모두 지우기'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  key: const ValueKey('filter-done'),
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('완료'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onClear});

  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.filter_alt_off_outlined,
              size: 48,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 12),
            Text(
              '조건에 맞는 창이 없습니다',
              key: const ValueKey('glass-empty'),
              style: theme.textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              '필터를 줄이면 더 많은 창을 볼 수 있어요.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton.tonal(
              key: const ValueKey('empty-clear'),
              onPressed: onClear,
              child: const Text('필터 모두 지우기'),
            ),
          ],
        ),
      ),
    );
  }
}

/// 아래 얇은 띠: 오늘의 묵주기도로 한 번에 가기(기도는 조용한 중심).
class _PrayerStrip extends StatelessWidget {
  const _PrayerStrip({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final set = mysterySetForWeekday(DateTime.now().weekday);
    return Material(
      color: scheme.surfaceContainer,
      child: InkWell(
        key: const ValueKey('glass-prayer-strip'),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 52),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Icon(Icons.self_improvement, size: 20, color: scheme.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    '오늘의 묵주기도 · ${set.koreanName}',
                    style: theme.textTheme.labelLarge,
                  ),
                ),
                const Icon(Icons.chevron_right),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
