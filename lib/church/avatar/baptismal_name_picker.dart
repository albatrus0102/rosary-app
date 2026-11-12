import 'dart:math';

import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart';

import '../church_constants.dart';

/// 세례명 고르기 화면을 전체 화면(M3 full-screen dialog)으로 열고, 고른 이름의 인덱스(성별
/// 목록 기준)를 돌려준다. 닫으면 null. 성별은 호출한 화면에서 정하므로 여기서는 보여 주기만 한다.
Future<int?> showBaptismalNamePicker(
  BuildContext context, {
  required int gender,
  required int selected,
}) {
  return Navigator.of(context).push<int>(
    MaterialPageRoute<int>(
      fullscreenDialog: true,
      builder: (_) => BaptismalNameScreen(gender: gender, selected: selected),
    ),
  );
}

/// 색인 첫 칸(많이 쓰는 이름)의 식별자.
const String _popularId = '★';

/// 세례명 고르기: 위에 검색창, 아래에 '많이 쓰는 이름'과 초성(ㄱ ㄴ ㄷ…)별 구역으로 나뉜 목록,
/// 오른쪽에 초성 색인 띠. 이름을 한 번 누르면 고르고 닫힌다.
class BaptismalNameScreen extends StatefulWidget {
  const BaptismalNameScreen({
    super.key,
    required this.gender,
    required this.selected,
  });

  final int gender;
  final int selected;

  @override
  State<BaptismalNameScreen> createState() => _BaptismalNameScreenState();
}

/// 구역(많이 쓰는 이름 또는 초성 하나)과 목록 안에서의 시작 위치.
class _Section {
  const _Section(this.id, this.indices, this.offset);

  final String id;
  final List<int> indices;
  final double offset;

  bool get popular => id == _popularId;
}

class _Metrics {
  _Metrics(this.sections, this.itemExtent, this.headerExtent, this.tail) {
    var h = tail;
    for (final s in sections) {
      h += headerExtent + s.indices.length * itemExtent;
    }
    total = h;
  }

  final List<_Section> sections;
  final double itemExtent;
  final double headerExtent;
  final double tail;
  late final double total;

  /// 구역 [k] 안에서 이름 칸 [row]의 위쪽 위치.
  double tileTop(int k, int row) =>
      sections[k].offset + headerExtent + row * itemExtent;

  /// 스크롤 위치 [pixels]에 걸쳐 있는 구역.
  int sectionAt(double pixels) {
    var k = 0;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offset <= pixels + 1) k = i;
    }
    return k;
  }
}

class _BaptismalNameScreenState extends State<BaptismalNameScreen> {
  final TextEditingController _query = TextEditingController();
  late final List<({String initial, List<int> indices})> _groups =
      groupBaptismalNames(widget.gender);

  ScrollController? _scroll;
  late _Metrics _metrics;
  final ValueNotifier<int> _current = ValueNotifier<int>(0);

  /// 색인으로 건너뛴 구역. 끝에 닿아 머리글이 맨 위에 못 오는 경우에도 그 글자를 강조한다.
  int? _pinned;

  @override
  void dispose() {
    _scroll?.dispose();
    _query.dispose();
    _current.dispose();
    super.dispose();
  }

  void _pick(int i) => Navigator.of(context).pop(i);

  _Metrics _computeMetrics(BuildContext context) {
    final scaler = MediaQuery.textScalerOf(context);
    final itemExtent = max(60.0, scaler.scale(16) * 1.5 + 20);
    final headerExtent = max(40.0, scaler.scale(14) * 1.5 + 18);
    final tail = MediaQuery.paddingOf(context).bottom + 16;
    final popular = [for (var i = 0; i < popularBaptismalShown; i++) i];
    final entries = <(String, List<int>)>[
      (_popularId, popular),
      for (final g in _groups) (g.initial, g.indices),
    ];
    final sections = <_Section>[];
    var offset = 0.0;
    for (final e in entries) {
      sections.add(_Section(e.$1, e.$2, offset));
      offset += headerExtent + e.$2.length * itemExtent;
    }
    return _Metrics(sections, itemExtent, headerExtent, tail);
  }

  /// 처음 열 때의 스크롤 위치: 고른 이름이 '많이 쓰는 이름'에 있으면 맨 위, 아니면 가나다
  /// 목록 안의 그 이름이 화면 가운데쯤 오게 한다.
  double _initialOffset(double viewport) {
    if (widget.selected < popularBaptismalShown) return 0;
    for (var k = 1; k < _metrics.sections.length; k++) {
      final row = _metrics.sections[k].indices.indexOf(widget.selected);
      if (row >= 0) {
        final top = _metrics.tileTop(k, row);
        final centered = top - (viewport - _metrics.itemExtent) / 2;
        return centered.clamp(0.0, max(0.0, _metrics.total - viewport));
      }
    }
    return 0;
  }

  ScrollController _ensureController(double viewport) {
    var c = _scroll;
    if (c == null) {
      final initial = _initialOffset(viewport);
      c = ScrollController(initialScrollOffset: initial);
      c.addListener(_onScroll);
      _current.value = _metrics.sectionAt(initial);
      _scroll = c;
    }
    return c;
  }

  void _onScroll() {
    final c = _scroll;
    if (c == null || !c.hasClients || _pinned != null) return;
    final k = _metrics.sectionAt(c.position.pixels);
    if (_current.value != k) _current.value = k;
  }

  void _jumpToSection(int k) {
    final c = _scroll;
    if (c == null || !c.hasClients) return;
    final target = _metrics.sections[k].offset.clamp(
      0.0,
      c.position.maxScrollExtent,
    );
    _pinned = k;
    _current.value = k;
    c.jumpTo(target);
  }

  Widget _tile(
    BuildContext context,
    int i, {
    required Key key,
    String? subtitle,
  }) {
    final scheme = Theme.of(context).colorScheme;
    final names = baptismalNamesFor(widget.gender);
    final selected = i == widget.selected;
    final letter = names[i].characters.first;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: ListTile(
        key: key,
        selected: selected,
        selectedColor: scheme.onSecondaryContainer,
        selectedTileColor: scheme.secondaryContainer,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        contentPadding: const EdgeInsetsDirectional.only(start: 16, end: 16),
        minTileHeight: 56,
        leading: CircleAvatar(
          radius: 20,
          backgroundColor: selected
              ? scheme.primary
              : scheme.surfaceContainerHighest,
          foregroundColor: selected
              ? scheme.onPrimary
              : scheme.onSurfaceVariant,
          child: Text(
            letter,
            textScaler: TextScaler.linear(
              min(1.2, MediaQuery.textScalerOf(context).scale(16) / 16),
            ),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: selected ? scheme.onPrimary : scheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        title: Text(
          names[i],
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
        subtitle: subtitle == null ? null : Text(subtitle),
        trailing: selected
            ? Icon(Icons.check, color: scheme.onSecondaryContainer)
            : null,
        onTap: () => _pick(i),
      ),
    );
  }

  Widget _header(BuildContext context, _Section s) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Semantics(
      header: true,
      label: s.popular ? '많이 쓰는 이름' : '초성 ${s.id}',
      excludeSemantics: true,
      child: Container(
        key: ValueKey('name-header-${s.id}'),
        height: _metrics.headerExtent,
        color: scheme.surface,
        padding: const EdgeInsetsDirectional.only(start: 24, end: 16),
        alignment: AlignmentDirectional.centerStart,
        child: Row(
          children: [
            if (s.popular) ...[
              Icon(Icons.star_rounded, size: 18, color: scheme.primary),
              const SizedBox(width: 6),
            ],
            Flexible(
              child: Text(
                s.popular ? '많이 쓰는 이름' : s.id,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: text.titleSmall?.copyWith(
                  color: scheme.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _groupedList(BuildContext context, double viewport) {
    final controller = _ensureController(viewport);
    return NotificationListener<ScrollStartNotification>(
      onNotification: (n) {
        if (n.dragDetails != null) _pinned = null;
        return false;
      },
      child: CustomScrollView(
        key: const ValueKey('name-list'),
        controller: controller,
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        slivers: [
          for (final s in _metrics.sections)
            SliverMainAxisGroup(
              slivers: [
                PinnedHeaderSliver(child: _header(context, s)),
                SliverFixedExtentList(
                  itemExtent: _metrics.itemExtent,
                  delegate: SliverChildBuilderDelegate((context, row) {
                    final i = s.indices[row];
                    return _tile(
                      context,
                      i,
                      key: ValueKey(
                        s.popular ? 'name-popular-$i' : 'name-tile-$i',
                      ),
                    );
                  }, childCount: s.indices.length),
                ),
              ],
            ),
          SliverToBoxAdapter(child: SizedBox(height: _metrics.tail)),
        ],
      ),
    );
  }

  Widget _searchResults(BuildContext context, List<int> results) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    if (results.isEmpty) {
      return LayoutBuilder(
        builder: (context, box) => SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: box.maxHeight),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  key: const ValueKey('name-empty'),
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.search_off,
                      size: 48,
                      color: scheme.onSurfaceVariant,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '찾는 이름이 없어요',
                      textAlign: TextAlign.center,
                      style: text.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '다른 철자로 찾아 보세요',
                      textAlign: TextAlign.center,
                      style: text.bodyMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 16),
                    FilledButton.tonal(
                      key: const ValueKey('name-clear-query'),
                      onPressed: _clearQuery,
                      child: const Text('검색어 지우기'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }
    return ListView.builder(
      key: const ValueKey('name-results'),
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: EdgeInsets.only(
        bottom: MediaQuery.paddingOf(context).bottom + 16,
      ),
      itemCount: results.length,
      itemBuilder: (context, k) {
        final i = results[k];
        final alias = baptismalAliasMatch(widget.gender, i, _query.text);
        return _tile(
          context,
          i,
          key: ValueKey('name-tile-$i'),
          subtitle: alias == null ? null : '비슷한 표기: $alias',
        );
      },
    );
  }

  void _clearQuery() => setState(_query.clear);

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final names = baptismalNamesFor(widget.gender);
    final female = widget.gender != avatarMale;
    final searching = _query.text.trim().isNotEmpty;
    final results = searching
        ? searchBaptismalNames(widget.gender, _query.text)
        : const <int>[];
    _metrics = _computeMetrics(context);
    final scale = MediaQuery.textScalerOf(context).scale(16) / 16;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: '닫기',
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: const Text('세례명 고르기'),
      ),
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: SearchBar(
                  key: const ValueKey('name-search'),
                  controller: _query,
                  hintText: '이름 검색 (예: 요, 마리)',
                  elevation: const WidgetStatePropertyAll(0),
                  backgroundColor: WidgetStatePropertyAll(
                    scheme.surfaceContainerHigh,
                  ),
                  constraints: const BoxConstraints(minHeight: 56),
                  textInputAction: TextInputAction.search,
                  onChanged: (_) => setState(() {}),
                  leading: const Icon(Icons.search),
                  trailing: [
                    if (searching)
                      IconButton(
                        tooltip: '지우기',
                        icon: const Icon(Icons.close),
                        onPressed: _clearQuery,
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
                child: Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: Wrap(
                    spacing: 12,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Chip(
                        key: const ValueKey('name-gender'),
                        avatar: Icon(female ? Icons.female : Icons.male),
                        label: Text(
                          '${female ? '여성' : '남성'} 세례명 ${names.length}개',
                        ),
                        visualDensity: VisualDensity.compact,
                      ),
                      if (searching)
                        Text(
                          '찾은 이름 ${results.length}개',
                          key: const ValueKey('name-result-count'),
                          style: Theme.of(context).textTheme.labelLarge
                              ?.copyWith(color: scheme.onSurfaceVariant),
                        ),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: LayoutBuilder(
                  builder: (context, box) {
                    final railIds = [
                      _popularId,
                      for (final g in _groups) g.initial,
                    ];
                    // 글자 칸이 20dp 아래로 좁아지면(큰 글씨 + 낮은 화면) 색인 띠를 숨긴다.
                    final railItem = min(28.0, box.maxHeight / railIds.length);
                    final showRail = !searching && railItem >= 20;
                    return Stack(
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(
                              child: Stack(
                                children: [
                                  Offstage(
                                    offstage: searching,
                                    child: _groupedList(context, box.maxHeight),
                                  ),
                                  if (searching)
                                    Positioned.fill(
                                      child: _searchResults(context, results),
                                    ),
                                ],
                              ),
                            ),
                            if (showRail)
                              _IndexRail(
                                ids: railIds,
                                itemHeight: railItem,
                                areaHeight: box.maxHeight,
                                current: _current,
                                pinned: () => _pinned,
                                textScale: min(scale, 1.3),
                                onSelect: _jumpToSection,
                              ),
                          ],
                        ),
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _railLabel(String id) {
  if (id == _popularId) return '많이 쓰는 이름으로 이동';
  // 'ㄹ' 뒤에만 '로', 나머지 자음 이름(기역, 니은…)은 '으로'.
  return '초성 $id${id == 'ㄹ' ? '로' : '으로'} 이동';
}

/// 오른쪽 가장자리의 초성 색인 띠(빠른 이동). 글자를 누르거나 위아래로 끌면 그 구역으로
/// 건너뛰고, 끄는 동안 큰 말풍선이 현재 글자를 보여 준다.
class _IndexRail extends StatefulWidget {
  const _IndexRail({
    required this.ids,
    required this.itemHeight,
    required this.areaHeight,
    required this.current,
    required this.pinned,
    required this.textScale,
    required this.onSelect,
  });

  final List<String> ids;
  final double itemHeight;
  final double areaHeight;
  final ValueListenable<int> current;
  final int? Function() pinned;
  final double textScale;
  final ValueChanged<int> onSelect;

  @override
  State<_IndexRail> createState() => _IndexRailState();
}

class _IndexRailState extends State<_IndexRail> {
  static const double _width = 28;
  int? _active;

  int _indexAt(double dy) =>
      (dy / widget.itemHeight).floor().clamp(0, widget.ids.length - 1);

  void _touch(double dy) {
    final i = _indexAt(dy);
    if (_active != i) {
      setState(() => _active = i);
      widget.onSelect(i);
    }
  }

  void _end() {
    if (_active != null) setState(() => _active = null);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final n = widget.ids.length;
    final railHeight = widget.itemHeight * n;
    final dot = min(24.0, widget.itemHeight - 2);
    return SizedBox(
      width: _width + 8,
      height: widget.areaHeight,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            top: (widget.areaHeight - railHeight) / 2,
            right: 4,
            width: _width,
            height: railHeight,
            child: GestureDetector(
              key: const ValueKey('name-rail'),
              behavior: HitTestBehavior.opaque,
              onTapDown: (d) => _touch(d.localPosition.dy),
              onTapUp: (_) => _end(),
              onTapCancel: _end,
              onVerticalDragStart: (d) => _touch(d.localPosition.dy),
              onVerticalDragUpdate: (d) => _touch(d.localPosition.dy),
              onVerticalDragEnd: (_) => _end(),
              onVerticalDragCancel: _end,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: _active == null
                      ? null
                      : scheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(_width / 2),
                ),
                child: ValueListenableBuilder<int>(
                  valueListenable: widget.current,
                  builder: (context, current, _) {
                    final shown = _active ?? widget.pinned() ?? current;
                    return Column(
                      children: [
                        for (var i = 0; i < n; i++)
                          SizedBox(
                            height: widget.itemHeight,
                            child: Semantics(
                              button: true,
                              selected: i == shown,
                              label: _railLabel(widget.ids[i]),
                              excludeSemantics: true,
                              onTap: () => widget.onSelect(i),
                              child: Center(
                                child: Container(
                                  key: ValueKey('name-rail-${widget.ids[i]}'),
                                  width: dot,
                                  height: dot,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: i == shown
                                        ? scheme.secondaryContainer
                                        : null,
                                  ),
                                  child: widget.ids[i] == _popularId
                                      ? Icon(
                                          Icons.star_rounded,
                                          size: 16,
                                          color: i == shown
                                              ? scheme.onSecondaryContainer
                                              : scheme.onSurfaceVariant,
                                        )
                                      : Text(
                                          widget.ids[i],
                                          textScaler: TextScaler.linear(
                                            widget.textScale,
                                          ),
                                          style: text.labelMedium?.copyWith(
                                            color: i == shown
                                                ? scheme.onSecondaryContainer
                                                : scheme.onSurfaceVariant,
                                            fontWeight: i == shown
                                                ? FontWeight.w700
                                                : FontWeight.w500,
                                          ),
                                        ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ),
          if (_active != null)
            Positioned(
              right: _width + 16,
              top:
                  ((widget.areaHeight - railHeight) / 2 +
                          (_active! + 0.5) * widget.itemHeight -
                          32)
                      .clamp(0.0, max(0.0, widget.areaHeight - 64)),
              child: IgnorePointer(
                child: Container(
                  key: const ValueKey('name-rail-bubble'),
                  width: 64,
                  height: 64,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: scheme.primaryContainer,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: scheme.shadow.withValues(alpha: 0.2),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: widget.ids[_active!] == _popularId
                      ? Icon(
                          Icons.star_rounded,
                          size: 36,
                          color: scheme.onPrimaryContainer,
                        )
                      : Text(
                          widget.ids[_active!],
                          textScaler: TextScaler.noScaling,
                          style: text.headlineMedium?.copyWith(
                            color: scheme.onPrimaryContainer,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
