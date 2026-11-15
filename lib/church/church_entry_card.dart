import 'dart:async';

import 'package:flutter/material.dart';

import '../app/settings.dart';
import '../app/theme.dart';
import '../app/window_class.dart';
import '../ui/widgets/ornament.dart';
import 'church_catalog.dart';
import 'church_entry_art.dart';

/// '성당' 탭의 첫 화면('입구', C-02): 고른 성당의 큰 카드(대표 그림·이름·위치·[상세 보기]·[입장하기])와
/// 그 아래 '다른 성당 고르기' 가로 캐러셀.
///
/// 캐러셀에서 카드를 누르면 큰 카드가 그 성당으로 바뀌고([onSelect]), [입장하기]를 한 번 누르면
/// 들어간다([onEnter]). 검색·필터가 있는 전체 목록([ChurchSelectScreen])은 [onPick]으로 연다.
/// 그림 자산과 대체 규칙은 [ChurchEntryArt] 한 곳에 있다.
class ChurchEntryCard extends StatefulWidget {
  const ChurchEntryCard({
    super.key,
    required this.info,
    required this.onEnter,
    required this.onPick,
    this.settings,
    this.churches = const [],
    this.onSelect,
    this.onDetail,
    this.lastId,
    this.firstVisit = false,
  });

  /// 큰 카드에 보이는(지금 고른) 성당.
  final ChurchInfo info;
  final VoidCallback onEnter;

  /// 전체 성당 목록(검색·필터)을 연다.
  final VoidCallback onPick;

  /// 즐겨찾기(책갈피)를 읽고 바꾼다. 없으면 책갈피 버튼을 두지 않는다.
  final AppSettings? settings;

  /// 캐러셀에 보일 성당(들어갈 수 있는 성당, 카탈로그 순서). 비어 있으면 캐러셀이 없다.
  final List<ChurchInfo> churches;

  /// 캐러셀에서 성당을 골랐다.
  final ValueChanged<ChurchInfo>? onSelect;

  /// [상세 보기]. 없으면 버튼을 두지 않는다.
  final VoidCallback? onDetail;

  /// 마지막으로 다녀온 성당 id(제목이 '마지막으로 다녀온 성당'인지 '선택한 성당'인지 정한다).
  final String? lastId;

  /// 아직 성당에 들어간 적이 없다('처음 오셨나요?').
  final bool firstVisit;

  /// 마지막 성당 id가 쓸 수 있는 성당이면 그 성당, 아니면 쓸 수 있는 첫 성당(기본 성당 우선).
  static ChurchInfo lastChurch(AppSettings settings, Set<String> available) {
    final saved = ChurchCatalog.resolve(settings.churchId);
    if (available.contains(saved.id)) return saved;
    final fallback = available.contains(ChurchCatalog.defaultId)
        ? ChurchCatalog.defaultId
        : (available.isEmpty ? ChurchCatalog.defaultId : available.first);
    return ChurchCatalog.resolve(fallback);
  }

  /// 본문 최대 폭(넓은 화면에서 카드가 끝없이 늘어나지 않게).
  static const double maxContentWidth = 960;

  @override
  State<ChurchEntryCard> createState() => _ChurchEntryCardState();
}

class _ChurchEntryCardState extends State<ChurchEntryCard> {
  @override
  void initState() {
    super.initState();
    if (!ChurchEntryArt.isLoaded) {
      // 자산 목록을 읽으면 성당별 그림(대표 그림·외관 썸네일)을 정확히 고른다.
      unawaited(
        ChurchEntryArt.load().then((_) {
          if (mounted) setState(() {});
        }),
      );
    }
  }

  String get _title {
    if (widget.firstVisit) return '처음 오셨나요?';
    final last = widget.lastId;
    return last == null || last == widget.info.id ? '마지막으로 다녀온 성당' : '선택한 성당';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final wc = windowClassOf(context);
    final margin = wc.margin;
    return Scaffold(
      // 머리말의 배경 장식과 같은 종이 위에 놓이도록 바탕은 성당 탭이 칠한다.
      backgroundColor: Colors.transparent,
      body: SafeArea(
        // 다른 탭과 같이 위에서부터 쌓는다(가운데 정렬은 큰 화면에서 위가 휑하다).
        child: Align(
          alignment: Alignment.topCenter,
          child: SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(
              margin,
              AppSpace.xs,
              margin,
              AppSpace.md,
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(
                maxWidth: ChurchEntryCard.maxContentWidth,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 탭 머리줄이 이미 '가상 성당'이므로 여기는 섹션 제목만 둔다.
                  Semantics(
                    header: true,
                    child: Row(
                      children: [
                        Icon(Icons.church_outlined, color: scheme.primary),
                        const SizedBox(width: AppSpace.xs),
                        Expanded(
                          child: Text(
                            _title,
                            key: const ValueKey('entry-title'),
                            style: theme.textTheme.titleLarge,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _BigCard(
                    info: widget.info,
                    settings: widget.settings,
                    wide: wc.isWide,
                    onEnter: widget.onEnter,
                    onDetail: widget.onDetail,
                  ),
                  if (widget.churches.length > 1) ...[
                    const SizedBox(height: AppSpace.md),
                    const OrnamentTitle('다른 성당 고르기'),
                    const SizedBox(height: AppSpace.sm),
                    _Carousel(
                      churches: widget.churches,
                      selectedId: widget.info.id,
                      wide: wc.isWide,
                      onSelect: widget.onSelect,
                    ),
                  ],
                  const SizedBox(height: AppSpace.xs),
                  Center(
                    child: TextButton.icon(
                      key: const ValueKey('entry-pick'),
                      onPressed: widget.onPick,
                      style: TextButton.styleFrom(
                        minimumSize: const Size(64, 48),
                      ),
                      icon: const Icon(Icons.search),
                      label: Text(
                        widget.churches.length > 1 ? '모든 성당 보기' : '다른 성당 고르기',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 고른 성당의 큰 카드: 대표 그림(+책갈피), 이름·위치·[상세 보기], [입장하기].
class _BigCard extends StatelessWidget {
  const _BigCard({
    required this.info,
    required this.settings,
    required this.wide,
    required this.onEnter,
    required this.onDetail,
  });

  final ChurchInfo info;
  final AppSettings? settings;
  final bool wide;
  final VoidCallback onEnter;
  final VoidCallback? onDetail;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final settings = this.settings;
    final pad = wide ? AppSpace.md : AppSpace.sm;
    return Card.outlined(
      key: const ValueKey('entry-card'),
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      color: scheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(
        borderRadius: AppShape.extraLarge,
        side: BorderSide(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _HeroBox(
            wide: wide,
            child: Stack(
              fit: StackFit.expand,
              children: [
                AnimatedSwitcher(
                  duration: AppMotion.of(context, Durations.short4),
                  switchInCurve: Easing.standard,
                  switchOutCurve: Easing.standard,
                  layoutBuilder: (current, previous) => Stack(
                    fit: StackFit.expand,
                    children: [...previous, ?current],
                  ),
                  child: ChurchEntryImage(
                    key: ValueKey('entry-hero-${info.id}'),
                    candidates: ChurchEntryArt.heroCandidates(info.id),
                    semanticLabel: '${info.nameKo} 내부 모습',
                    iconSize: 56,
                  ),
                ),
                if (settings != null)
                  Align(
                    alignment: Alignment.topRight,
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpace.xs),
                      child: ListenableBuilder(
                        listenable: settings,
                        builder: (context, _) {
                          final fav = settings.isChurchFavorite(info.id);
                          return IconButton.filledTonal(
                            key: const ValueKey('entry-fav'),
                            tooltip: fav ? '즐겨찾기 해제' : '즐겨찾기',
                            isSelected: fav,
                            icon: const Icon(Icons.bookmark_border),
                            selectedIcon: const Icon(Icons.bookmark),
                            onPressed: () =>
                                settings.toggleChurchFavorite(info.id),
                          );
                        },
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(pad, AppSpace.sm, pad, AppSpace.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 이름·위치와 [상세 보기]: 한 줄에 들어가면 나란히, 아니면(좁은 화면·큰 글자) 아래로.
                OverflowBar(
                  alignment: MainAxisAlignment.spaceBetween,
                  overflowAlignment: OverflowBarAlignment.start,
                  overflowSpacing: AppSpace.xs,
                  spacing: AppSpace.sm,
                  children: [
                    _NameBlock(info: info),
                    if (onDetail != null)
                      OutlinedButton(
                        key: const ValueKey('entry-detail'),
                        onPressed: onDetail,
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('상세 보기'),
                            SizedBox(width: AppSpace.xxs),
                            Icon(Icons.chevron_right, size: 18),
                          ],
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: AppSpace.sm),
                Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxWidth: wide ? 560 : double.infinity,
                    ),
                    child: FilledButton(
                      key: const ValueKey('entry-enter'),
                      onPressed: onEnter,
                      style: AppTheme.heroButtonStyle(context),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.directions_walk),
                          SizedBox(width: AppSpace.xs),
                          Flexible(child: Text('입장하기')),
                          SizedBox(width: AppSpace.xxs),
                          Icon(Icons.chevron_right),
                        ],
                      ),
                    ),
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

/// 대표 그림 자리: 넓은 화면에서는 시안처럼 낮고 넓게(9:4), 폰에서는 16:9. 낮은 화면(폰 가로·
/// 가로로 긴 태블릿)에서는 카드 전체가 한눈에 들어오도록 화면 높이의 40%를 넘지 않는다.
class _HeroBox extends StatelessWidget {
  const _HeroBox({required this.wide, required this.child});

  final bool wide;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final screen = MediaQuery.sizeOf(context).height;
    return LayoutBuilder(
      builder: (context, constraints) {
        final natural = constraints.maxWidth / (wide ? 9 / 4 : 16 / 9);
        final cap = screen * 0.4 < 160 ? 160.0 : screen * 0.4;
        return SizedBox(height: natural < cap ? natural : cap, child: child);
      },
    );
  }
}

/// 성당 아이콘 + 이름 + 위치.
class _NameBlock extends StatelessWidget {
  const _NameBlock({required this.info});

  final ChurchInfo info;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    // 큰 글자에서는 이름이 들어갈 자리를 위해 아이콘을 접는다.
    final showIcon = MediaQuery.textScalerOf(context).scale(10) <= 13;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (showIcon) ...[
          ExcludeSemantics(
            child: CircleAvatar(
              radius: 24,
              backgroundColor: scheme.secondaryContainer,
              foregroundColor: scheme.onSecondaryContainer,
              child: const Icon(Icons.church),
            ),
          ),
          const SizedBox(width: AppSpace.sm),
        ],
        Flexible(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                info.nameKo,
                key: const ValueKey('entry-name'),
                style: theme.textTheme.headlineSmall,
              ),
              const SizedBox(height: AppSpace.xxs),
              Row(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.place, size: 20, color: scheme.primary),
                  const SizedBox(width: AppSpace.xxs),
                  Flexible(
                    child: Text(
                      '${info.place} · ${info.kind}',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// '다른 성당 고르기' 가로 캐러셀: 썸네일 카드 + 이름 + 도시, 고른 카드는 금색 테두리.
/// 아래 점이 지금 쪽을 알려 준다. 넓은 화면에서 카드가 한 줄에 다 들어가지 않으면 오른쪽에
/// **화살표 전용 자리**를 두어(카드는 그 아래로 지나가지 않는다) 버튼으로도 넘긴다: 끝까지 가면
/// 같은 자리의 버튼이 '처음으로'가 된다.
class _Carousel extends StatefulWidget {
  const _Carousel({
    required this.churches,
    required this.selectedId,
    required this.wide,
    required this.onSelect,
  });

  final List<ChurchInfo> churches;
  final String selectedId;
  final bool wide;
  final ValueChanged<ChurchInfo>? onSelect;

  @override
  State<_Carousel> createState() => _CarouselState();
}

class _CarouselState extends State<_Carousel> {
  final ScrollController _scroll = ScrollController();

  /// 쪽 수와 지금 쪽(스크롤 범위가 정해진 뒤에 안다).
  int _pages = 1;
  int _page = 0;
  bool _canBack = false;
  bool _canForward = false;

  static const double _gap = AppSpace.sm;

  /// 화살표 버튼 자리(48dp 버튼 + 카드와의 간격 8dp).
  static const double _arrowSlot = 48 + AppSpace.xs;

  /// 카드 하나 + 간격(화살표가 카드 단위로 넘기도록 build 에서 맞춘다).
  double _itemExtent = 0;

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  bool _onMetrics(ScrollMetrics m) {
    if (m.axis != Axis.horizontal) return false;
    final view = m.viewportDimension;
    final max = m.maxScrollExtent;
    final pages = view <= 0 || max <= 0 ? 1 : (max / view).ceil() + 1;
    final page = max <= 0
        ? 0
        : ((m.pixels / max) * (pages - 1)).round().clamp(0, pages - 1);
    final back = m.pixels > 0.5;
    final forward = m.pixels < max - 0.5;
    if (pages != _pages ||
        page != _page ||
        back != _canBack ||
        forward != _canForward) {
      // 배치 도중에 알림이 올 수 있으므로 다음 프레임에 반영한다.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        setState(() {
          _pages = pages;
          _page = page;
          _canBack = back;
          _canForward = forward;
        });
      });
    }
    return false;
  }

  /// 다음 쪽으로(카드가 잘리지 않게 카드 단위로). [toStart]면 처음으로 돌아간다.
  void _step({bool toStart = false}) {
    if (!_scroll.hasClients) return;
    final p = _scroll.position;
    final extent = _itemExtent <= 0 ? p.viewportDimension : _itemExtent;
    final cards = ((p.viewportDimension + _gap) / extent).floor();
    final target = toStart
        ? 0.0
        : (p.pixels + (cards < 1 ? 1 : cards) * extent).clamp(
            0.0,
            p.maxScrollExtent,
          );
    unawaited(
      p.animateTo(
        target,
        duration: AppMotion.of(context, Durations.medium2),
        curve: Easing.standard,
      ),
    );
  }

  /// 카드 폭: 넓은 화면은 다섯 장, 폰은 두 장 반이 보이게(다음 카드가 살짝 보여 넘길 수 있음을 알린다).
  /// 큰 글자에서는 이름이 들어가도록 조금 넓힌다.
  double _itemWidth(double viewport, double textScale) {
    final count = widget.wide ? 5 : 2.4;
    final base = (viewport - _gap * (count.ceil() - 1)) / count;
    final grown = base * textScale.clamp(1.0, 1.4);
    return grown.clamp(widget.wide ? 96.0 : 112.0, 200.0);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final textScale = MediaQuery.textScalerOf(context).scale(14) / 14;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        LayoutBuilder(
          builder: (context, constraints) {
            final full = constraints.maxWidth;
            final n = widget.churches.length;
            // 넓은 화면에서 카드가 한 줄에 다 들어가지 않으면 오른쪽에 화살표 자리를 따로 둔다.
            final fullW = _itemWidth(full, textScale);
            final arrow =
                widget.wide && n * fullW + (n - 1) * _gap > full + 0.5;
            final w = arrow ? _itemWidth(full - _arrowSlot, textScale) : fullW;
            _itemExtent = w + _gap;
            final Widget cards =
                NotificationListener<ScrollMetricsNotification>(
                  onNotification: (n) => _onMetrics(n.metrics),
                  child: NotificationListener<ScrollUpdateNotification>(
                    onNotification: (n) => _onMetrics(n.metrics),
                    child: SingleChildScrollView(
                      key: const ValueKey('entry-carousel'),
                      controller: _scroll,
                      scrollDirection: Axis.horizontal,
                      // 고른 카드의 테두리가 잘리지 않게 위아래 여백을 둔다.
                      padding: const EdgeInsets.symmetric(
                        vertical: AppSpace.xxs,
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          for (final (i, c) in widget.churches.indexed) ...[
                            if (i > 0) const SizedBox(width: _gap),
                            SizedBox(
                              width: w,
                              child: _CarouselItem(
                                info: c,
                                selected: c.id == widget.selectedId,
                                onTap: widget.onSelect == null
                                    ? null
                                    : () => widget.onSelect!(c),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
            // 폰은 쓸어 넘긴다(다음 카드가 살짝 보인다).
            if (!arrow) return cards;
            // 끝까지 갔으면 같은 자리의 버튼이 '처음으로'가 된다.
            final atEnd = !_canForward && _canBack;
            // 버튼은 썸네일(4:3) 높이의 가운데에 둔다.
            final thumbHeight = w * 3 / 4;
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: cards),
                const SizedBox(width: AppSpace.xs),
                Padding(
                  padding: EdgeInsets.only(
                    top:
                        AppSpace.xxs +
                        (thumbHeight > 48 ? (thumbHeight - 48) / 2 : 0),
                  ),
                  child: atEnd
                      ? IconButton.outlined(
                          key: const ValueKey('entry-carousel-rewind'),
                          tooltip: '처음으로',
                          onPressed: () => _step(toStart: true),
                          icon: const Icon(Icons.first_page),
                        )
                      : IconButton.outlined(
                          key: const ValueKey('entry-carousel-next'),
                          tooltip: '다음 성당들',
                          onPressed: _canForward ? _step : null,
                          icon: const Icon(Icons.chevron_right),
                        ),
                ),
              ],
            );
          },
        ),
        const SizedBox(height: AppSpace.xs),
        // 쪽 점(장식: 화면 낭독은 카드의 '선택됨'으로 충분하다).
        ExcludeSemantics(
          child: SizedBox(
            height: AppSpace.xs,
            child: Row(
              key: const ValueKey('entry-carousel-dots'),
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < _pages; i++)
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpace.xxs,
                    ),
                    child: AnimatedContainer(
                      duration: AppMotion.of(context, Durations.short3),
                      width: AppSpace.xs,
                      height: AppSpace.xs,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: i == _page
                            ? scheme.primary
                            : scheme.outlineVariant,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _CarouselItem extends StatelessWidget {
  const _CarouselItem({
    required this.info,
    required this.selected,
    required this.onTap,
  });

  final ChurchInfo info;
  final bool selected;
  final VoidCallback? onTap;

  /// '도시, 나라' → 도시.
  String get _city => info.place.split(',').first.trim();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final gold = AppDecor.of(context).gold;
    // 카드 하나가 한 덩어리로 읽힌다: '이름, 도시, 버튼, 선택됨'(누르기 동작 포함).
    return MergeSemantics(
      child: Semantics(
        button: true,
        selected: selected,
        label: '${info.nameKo}, $_city',
        child: Card(
          key: ValueKey('entry-thumb-${info.id}'),
          semanticContainer: false,
          margin: EdgeInsets.zero,
          elevation: 0,
          color: Colors.transparent,
          shape: AppShape.mediumBorder,
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onTap,
            child: ExcludeSemantics(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // 썸네일: 고른 카드는 금색 테두리(2dp), 나머지는 가는 윤곽선.
                  DecoratedBox(
                    position: DecorationPosition.foreground,
                    decoration: BoxDecoration(
                      borderRadius: AppShape.medium,
                      border: Border.all(
                        color: selected ? gold : scheme.outlineVariant,
                        width: selected ? 2 : 1,
                      ),
                    ),
                    child: ClipRRect(
                      borderRadius: AppShape.medium,
                      child: AspectRatio(
                        aspectRatio: 4 / 3,
                        child: ChurchEntryImage(
                          candidates: ChurchEntryArt.thumbCandidates(info.id),
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpace.xxs,
                      AppSpace.xs,
                      AppSpace.xxs,
                      AppSpace.xxs,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          info.nameKo,
                          textAlign: TextAlign.center,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleSmall?.copyWith(
                            color: selected ? scheme.primary : scheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: AppSpace.xxs),
                        Text(
                          _city,
                          textAlign: TextAlign.center,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
