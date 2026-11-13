import 'package:flutter/material.dart';

import '../app/settings.dart';
import '../app/window_class.dart';
import 'church_catalog.dart';

/// 정렬 기준.
enum ChurchSort {
  recommended('추천순'),
  name('이름순'),
  scale('축소 비율순');

  const ChurchSort(this.label);
  final String label;
}

/// 건축 양식 필터 값.
const List<String> churchStyles = ['로마네스크·비잔틴', '고딕', '르네상스·바로크', '근대'];

/// 성당별 대표 건축 양식(필터용 단순 분류).
const Map<String, String> churchStyleById = {
  'stpeter': '르네상스·바로크',
  'lateran': '르네상스·바로크',
  'maggiore': '르네상스·바로크',
  'stpaul': '근대',
  'milan': '고딕',
  'florence': '고딕',
  'myeongdong': '고딕',
  'stmark': '로마네스크·비잔틴',
  'jeondong': '로마네스크·비잔틴',
  'yakhyeon': '고딕',
  'gyesan': '고딕',
  'fatima': '르네상스·바로크',
  'lourdes': '로마네스크·비잔틴',
  'sagrada': '근대',
  'notredame': '고딕',
  'basic': '근대',
};

/// 지역 필터 값(구역 머리글과 같다. '우리 본당'은 제외).
const List<String> churchRegions = ['로마·바티칸', '이탈리아', '한국', '세계'];

/// 성당 고르기 화면: 히어로 헤더, 검색, 필터 칩, 카드 격자.
/// 카드를 누르면 상세 시트에서 '입장'.
class ChurchSelectScreen extends StatefulWidget {
  const ChurchSelectScreen({
    super.key,
    required this.settings,
    required this.onEnter,
    this.available,
    this.onBack,
  });

  /// 내부 3D 모형이 준비된 성당 id. 새 성당 내부가 들어올 때마다 늘린다.
  static const Set<String> availableIds = {
    'basic',
    'stpeter',
    'lateran',
    'maggiore',
    'stpaul',
    'milan',
    'florence',
    'myeongdong',
  };

  final AppSettings settings;

  /// 상세 시트에서 '입장'을 눌렀을 때. 선택은 이미 `settings.churchId`에 저장돼 있다.
  final ValueChanged<ChurchInfo> onEnter;

  /// 테스트용: [availableIds] 대신 쓸 가용 목록.
  final Set<String>? available;

  /// 마지막 성당 카드로 돌아가기(있으면 머리글에 뒤로 가기 버튼이 보인다).
  final VoidCallback? onBack;

  /// 목록을 걸러 정렬한다(즐겨찾기가 항상 먼저, 같은 즐겨찾기 상태 안에서는 정렬 기준대로).
  static List<ChurchInfo> arrange(
    Iterable<ChurchInfo> all, {
    String query = '',
    String? region,
    String? style,
    ChurchSort sort = ChurchSort.recommended,
    Set<String> favorites = const {},
  }) {
    final q = query.trim().toLowerCase();
    final list = [
      for (final c in all)
        if ((q.isEmpty ||
                c.nameKo.toLowerCase().contains(q) ||
                c.place.toLowerCase().contains(q)) &&
            (region == null || c.group == region) &&
            (style == null || churchStyleById[c.id] == style))
          c,
    ];
    final order = {for (var i = 0; i < list.length; i++) list[i].id: i};
    list.sort((a, b) {
      final fa = favorites.contains(a.id) ? 0 : 1;
      final fb = favorites.contains(b.id) ? 0 : 1;
      if (fa != fb) return fa - fb;
      final byKey = switch (sort) {
        ChurchSort.recommended => 0,
        ChurchSort.name => a.nameKo.compareTo(b.nameKo),
        ChurchSort.scale => b.scalePercent - a.scalePercent,
      };
      return byKey != 0 ? byKey : order[a.id]! - order[b.id]!;
    });
    return list;
  }

  @override
  State<ChurchSelectScreen> createState() => _ChurchSelectScreenState();
}

class _ChurchSelectScreenState extends State<ChurchSelectScreen> {
  static const String _note = '실제 건축을 단순화한 3D 모형이며 실제 크기의 %d%%입니다';

  final TextEditingController _search = TextEditingController();
  String _query = '';
  String? _region;
  String? _style;
  ChurchSort _sort = ChurchSort.recommended;

  /// '준비 중 보기': 켜야만 아직 3D 모형이 없는 성당이 목록에 나온다(C-02).
  bool _showUpcoming = false;

  Set<String> get _available =>
      widget.available ?? ChurchSelectScreen.availableIds;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  int _columns(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return switch (windowClassOfWidth(width)) {
      WindowClass.compact => 2,
      WindowClass.medium => 3,
      WindowClass.expanded => 4,
    };
  }

  Future<void> _showDetail(ChurchInfo info) async {
    final enter = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useSafeArea: true,
      builder: (context) => SafeArea(
        top: false,
        child: _DetailSheet(info: info, note: _noteFor(info)),
      ),
    );
    if (enter == true) {
      widget.settings.churchId = info.id;
      widget.onEnter(info);
    }
  }

  static String _noteFor(ChurchInfo info) => info.id == ChurchCatalog.defaultId
      ? '실제 성당이 아닌 가상의 본당입니다'
      : _note.replaceFirst('%d%%', '${info.scalePercent}%');

  void _resetFilters() => setState(() {
    _region = null;
    _style = null;
    _sort = ChurchSort.recommended;
    _query = '';
    _search.clear();
  });

  @override
  Widget build(BuildContext context) {
    final cols = _columns(context);
    return Scaffold(
      body: ListenableBuilder(
        listenable: widget.settings,
        builder: (context, _) {
          final items = ChurchSelectScreen.arrange(
            [
              for (final c in ChurchCatalog.all)
                if (_showUpcoming || _available.contains(c.id)) c,
            ],
            query: _query,
            region: _region,
            style: _style,
            sort: _sort,
            favorites: widget.settings.churchFavorites,
          );
          return CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _Hero(onBack: widget.onBack)),
              SliverToBoxAdapter(child: _searchBar()),
              SliverToBoxAdapter(child: _filterRow()),
              if (items.isEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(
                      '찾는 성당이 없어요',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                )
              else if (_sort == ChurchSort.recommended)
                for (final g in ChurchCatalog.groups)
                  ..._section(context, g, items, cols)
              else
                _grid(items, cols),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          );
        },
      ),
    );
  }

  List<Widget> _section(
    BuildContext context,
    String group,
    List<ChurchInfo> items,
    int cols,
  ) {
    final inGroup = [
      for (final c in items)
        if (c.group == group) c,
    ];
    if (inGroup.isEmpty) return const [];
    return [
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Text(
            group,
            style: Theme.of(context).textTheme.titleMedium
                ?.copyWith(color: Theme.of(context).colorScheme.primary),
          ),
        ),
      ),
      _grid(inGroup, cols),
    ];
  }

  Widget _searchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: SearchBar(
        controller: _search,
        hintText: '성당 이름이나 도시로 검색하기',
        elevation: const WidgetStatePropertyAll(0),
        leading: const Icon(Icons.search),
        trailing: [
          if (_query.isNotEmpty)
            IconButton(
              tooltip: '검색어 지우기',
              icon: const Icon(Icons.close),
              onPressed: () => setState(() {
                _query = '';
                _search.clear();
              }),
            ),
        ],
        onChanged: (v) => setState(() => _query = v),
      ),
    );
  }

  Widget _filterRow() {
    final none = _region == null && _style == null && _query.isEmpty;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Row(
        children: [
          FilterChip(
            avatar: const Icon(Icons.apps),
            label: const Text('전체'),
            selected: none && _sort == ChurchSort.recommended,
            showCheckmark: false,
            onSelected: (_) => _resetFilters(),
          ),
          const SizedBox(width: 8),
          _MenuChip<String?>(
            key: const ValueKey('chip-region'),
            icon: Icons.place_outlined,
            label: '지역',
            value: _region,
            options: [for (final r in churchRegions) (r, r)],
            onSelected: (v) => setState(() => _region = v),
          ),
          const SizedBox(width: 8),
          _MenuChip<String?>(
            key: const ValueKey('chip-style'),
            icon: Icons.account_balance_outlined,
            label: '건축 양식',
            value: _style,
            options: [for (final s in churchStyles) (s, s)],
            onSelected: (v) => setState(() => _style = v),
          ),
          const SizedBox(width: 8),
          FilterChip(
            key: const ValueKey('chip-upcoming'),
            avatar: const Icon(Icons.hourglass_empty),
            label: const Text('준비 중 보기'),
            selected: _showUpcoming,
            showCheckmark: false,
            onSelected: (v) => setState(() => _showUpcoming = v),
          ),
          const SizedBox(width: 8),
          _MenuChip<ChurchSort>(
            key: const ValueKey('chip-sort'),
            icon: Icons.swap_vert,
            label: ChurchSort.recommended.label,
            value: _sort == ChurchSort.recommended ? null : _sort,
            options: [for (final o in ChurchSort.values) (o.label, o)],
            valueLabel: _sort.label,
            onSelected: (v) =>
                setState(() => _sort = v ?? ChurchSort.recommended),
          ),
        ],
      ),
    );
  }

  Widget _grid(List<ChurchInfo> items, int cols) {
    final rows = <List<ChurchInfo>>[
      for (var i = 0; i < items.length; i += cols)
        items.sublist(i, (i + cols).clamp(0, items.length)),
    ];
    return SliverList.builder(
      itemCount: rows.length,
      itemBuilder: (context, r) {
        final row = rows[r];
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var c = 0; c < cols; c++) ...[
                  if (c > 0) const SizedBox(width: 12),
                  Expanded(
                    child: c < row.length
                        ? _ChurchCard(
                            info: row[c],
                            available: _available.contains(row[c].id),
                            selected: widget.settings.churchId == row[c].id,
                            favorite: widget.settings.isChurchFavorite(
                              row[c].id,
                            ),
                            onFavorite: () =>
                                widget.settings.toggleChurchFavorite(row[c].id),
                            onTap: () => _showDetail(row[c]),
                          )
                        : const SizedBox.shrink(),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

/// 부드러운 그라데이션 히어로 헤더.
class _Hero extends StatelessWidget {
  const _Hero({this.onBack});

  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [scheme.primaryContainer, scheme.surface],
        ),
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(32)),
      ),
      child: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Positioned(
              right: 12,
              top: 12,
              child: Icon(
                Icons.church,
                size: 104,
                color: scheme.onPrimaryContainer.withValues(alpha: 0.12),
              ),
            ),
            if (onBack != null)
              Positioned(
                left: 4,
                top: 4,
                child: IconButton(
                  key: const ValueKey('select-back'),
                  tooltip: '마지막 성당으로',
                  onPressed: onBack,
                  icon: const Icon(Icons.arrow_back),
                ),
              ),
            Padding(
              padding: EdgeInsets.fromLTRB(
                24,
                onBack != null ? 48 : 32,
                24,
                28,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '성당 고르기',
                    style: theme.textTheme.headlineLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: scheme.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '마음에 드는 성당을 골라보세요.',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: scheme.onPrimaryContainer.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 누르면 작은 메뉴가 열리는 필터 칩(지역/건축 양식/정렬).
class _MenuChip<T> extends StatelessWidget {
  const _MenuChip({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    required this.options,
    required this.onSelected,
    this.valueLabel,
  });

  final IconData icon;
  final String label;

  /// 선택된 값(없으면 null = 해제).
  final T? value;
  final List<(String, T)> options;
  final ValueChanged<T?> onSelected;
  final String? valueLabel;

  @override
  Widget build(BuildContext context) {
    final selected = value != null;
    final shown = selected
        ? (valueLabel ??
              options
                  .firstWhere(
                    (o) => o.$2 == value,
                    orElse: () => (label, value as T),
                  )
                  .$1)
        : label;
    return MenuAnchor(
      menuChildren: [
        for (final (text, v) in options)
          MenuItemButton(
            leadingIcon: Icon(v == value ? Icons.check : null, size: 18),
            onPressed: () => onSelected(v),
            child: Text(text),
          ),
        if (selected && label != ChurchSort.recommended.label)
          MenuItemButton(
            leadingIcon: const Icon(Icons.close, size: 18),
            onPressed: () => onSelected(null),
            child: const Text('선택 해제'),
          ),
      ],
      builder: (context, controller, _) => FilterChip(
        avatar: Icon(icon),
        label: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(shown),
            const SizedBox(width: 2),
            const Icon(Icons.expand_more, size: 18),
          ],
        ),
        selected: selected,
        showCheckmark: false,
        onSelected: (_) =>
            controller.isOpen ? controller.close() : controller.open(),
      ),
    );
  }
}

class _ChurchCard extends StatelessWidget {
  const _ChurchCard({
    required this.info,
    required this.available,
    required this.selected,
    required this.favorite,
    required this.onFavorite,
    required this.onTap,
  });

  final ChurchInfo info;
  final bool available;
  final bool selected;
  final bool favorite;
  final VoidCallback onFavorite;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final fiction = info.id == ChurchCatalog.defaultId;
    final fg = available ? scheme.onSurface : scheme.onSurfaceVariant;
    return Semantics(
      button: true,
      enabled: available,
      label: available ? info.nameKo : '${info.nameKo}, 준비 중',
      child: Card.filled(
        key: ValueKey('church-card-${info.id}'),
        clipBehavior: Clip.antiAlias,
        margin: EdgeInsets.zero,
        color: selected && available
            ? scheme.secondaryContainer
            : scheme.surfaceContainerHigh,
        child: InkWell(
          onTap: available ? onTap : null,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AspectRatio(
                aspectRatio: 5 / 3,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Opacity(
                      opacity: available ? 1 : 0.5,
                      child: Image.asset(
                        'assets/church_thumbs/${info.id}.webp',
                        fit: BoxFit.cover,
                        excludeFromSemantics: true,
                        errorBuilder: (context, _, _) => ColoredBox(
                          color: scheme.secondaryContainer,
                          child: Icon(
                            Icons.church,
                            size: 40,
                            color: scheme.onSecondaryContainer,
                          ),
                        ),
                      ),
                    ),
                    if (!available)
                      Align(
                        alignment: Alignment.bottomLeft,
                        child: Padding(
                          padding: const EdgeInsets.all(8),
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: scheme.inverseSurface.withValues(
                                alpha: 0.8,
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              child: Text(
                                '준비 중',
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: scheme.onInverseSurface,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    Align(
                      alignment: Alignment.topRight,
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: IconButton.filledTonal(
                          key: ValueKey('fav-${info.id}'),
                          tooltip: favorite ? '즐겨찾기 해제' : '즐겨찾기',
                          isSelected: favorite,
                          icon: const Icon(Icons.bookmark_border),
                          selectedIcon: const Icon(Icons.bookmark),
                          onPressed: onFavorite,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      info.nameKo,
                      style: theme.textTheme.titleSmall?.copyWith(color: fg),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Icon(
                            Icons.place_outlined,
                            size: 14,
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(width: 2),
                        Expanded(
                          child: Text(
                            info.place,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        if (!fiction) _Tag('실제의 ${info.scalePercent}%'),
                        _Tag(info.kind),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelSmall
              ?.copyWith(color: scheme.onSurfaceVariant),
        ),
      ),
    );
  }
}

class _DetailSheet extends StatelessWidget {
  const _DetailSheet({required this.info, required this.note});

  final ChurchInfo info;
  final String note;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final meta = [
      info.place,
      if (info.builtYear != null) '${info.builtYear}년',
      info.kind,
    ].join(' · ');
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Flexible(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(info.nameKo, style: theme.textTheme.headlineSmall),
                const SizedBox(height: 4),
                Text(
                  meta,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  info.blurb.isEmpty ? '설명 준비 중' : info.blurb,
                  style: theme.textTheme.bodyLarge,
                ),
                const SizedBox(height: 16),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 18,
                      color: scheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        note,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
          child: FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('입장'),
          ),
        ),
      ],
    );
  }
}
