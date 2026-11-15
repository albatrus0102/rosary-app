import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../app/theme.dart';
import '../app/track.dart';
import '../domain/stations_of_cross.dart';
import '../domain/stations_series.dart';
import 'stations_guide.dart';
import 'widgets/single_art_image.dart';
import 'widgets/stations_series_picker.dart';
import 'widgets/stations_prayer_view.dart';

/// 묵상 시트를 어디서 열었는지(분석 `from` 값, 열거형 영문 키).
enum StationsFrom { more, today, church }

/// 시트의 쓰임.
enum StationsSheetMode {
  /// 성당 밖: 시트 안에서 이전/다음 처로 넘기며 읽는다.
  browse,

  /// 성당 안 순례: '다음 처로'를 누르면 시트를 닫고 다음 처 판 앞까지 걸어간다.
  pilgrimage,
}

/// 시트가 끝난 방식. 그냥 닫으면 시트는 null 을 돌려준다.
enum StationsSheetAction {
  /// 순례: [StationsSheetResult.n] 다음 처로 걸어가기.
  next,

  /// 14처 뒤 마침 화면까지 마쳤다.
  complete,

  /// 순례: [StationsSheetResult.n]처부터 '함께 바치기'로 바꾼다.
  guide,
}

class StationsSheetResult {
  const StationsSheetResult(this.action, this.n);
  final StationsSheetAction action;

  /// 그 동작을 누른 처(1..14).
  final int n;
}

/// 십자가의 길 묵상 시트(M3 모달 바텀시트)를 연다. [start]처부터.
///
/// [series]는 보여 줄 그림 연작(성당 안에서는 그 성당의 연작). 없으면 기본 연작(푸겔).
Future<StationsSheetResult?> showStationsSheet(
  BuildContext context, {
  int start = 1,
  StationsSeries? series,
  StationsSheetMode mode = StationsSheetMode.browse,
  StationsFrom from = StationsFrom.more,
  bool logOpen = true,
}) {
  if (logOpen) Track.event('stations_open', {'from': from.name});
  unawaited(StationsSeriesChoice.load());
  return showModalBottomSheet<StationsSheetResult>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    builder: (context) => SafeArea(
      top: false,
      child: StationsSheet(
        start: start,
        mode: mode,
        from: from,
        series: series,
      ),
    ),
  );
}

/// 그림, 처 번호·명칭, 성경 근거, 공식 기도문(1처는 시작 기도 포함), 접힌 '묵상', 이전/다음(또는
/// '다음 처로'), 14처 뒤 마침 화면.
class StationsSheet extends StatefulWidget {
  const StationsSheet({
    super.key,
    this.start = 1,
    this.mode = StationsSheetMode.browse,
    this.from = StationsFrom.more,
    this.series,
  });

  final int start;
  final StationsSheetMode mode;
  final StationsFrom from;

  /// 그림 연작(대체 성화). null 이면 기본 연작.
  final StationsSeries? series;

  @override
  State<StationsSheet> createState() => _StationsSheetState();
}

class _StationsSheetState extends State<StationsSheet> {
  late int _n = widget.start.clamp(1, StationsOfCross.all.length);
  bool _closing = false;
  final _scroll = ScrollController();

  static const int _last = 14;

  bool get _pilgrim => widget.mode == StationsSheetMode.pilgrimage;

  // 고른 그림 연작이 바뀌면 다시 그린다(성당 밖에서만 고를 수 있다).
  void _onSeries() => setState(() {});

  @override
  void initState() {
    super.initState();
    StationsSeriesChoice.selected.addListener(_onSeries);
  }

  @override
  void dispose() {
    StationsSeriesChoice.selected.removeListener(_onSeries);
    _scroll.dispose();
    super.dispose();
  }

  void _go(int n) {
    setState(() {
      _n = n;
      _closing = false;
    });
    if (_scroll.hasClients) _scroll.jumpTo(0);
  }

  void _next() {
    if (_n >= _last) {
      setState(() => _closing = true);
      if (_scroll.hasClients) _scroll.jumpTo(0);
      return;
    }
    Track.event('stations_next', {'n': _n + 1});
    if (_pilgrim) {
      Navigator.of(context)
          .pop(StationsSheetResult(StationsSheetAction.next, _n));
    } else {
      _go(_n + 1);
    }
  }

  /// '바치는 법' 안내. 거기서 '함께 바치기'를 고르면 이 처부터 안내 화면을 연다.
  Future<void> _howTo() async {
    final guide = await showStationsHowTo(context);
    if (!guide || !mounted) return;
    if (_pilgrim) {
      // 성당 안: 시트를 닫고 성당 화면이 안내 화면을 연다(다음 처로 걷기를 잇는다).
      Navigator.of(context)
          .pop(StationsSheetResult(StationsSheetAction.guide, _n));
    } else {
      await showStationsGuide(context, start: _n, series: widget.series);
    }
  }

  void _complete() {
    Track.event('stations_complete', {'from': widget.from.name});
    Navigator.of(context)
        .pop(const StationsSheetResult(StationsSheetAction.complete, _last));
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: size.height * 0.92),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _header(context),
          Flexible(
            child: SingleChildScrollView(
              key: const ValueKey('stations-scroll'),
              controller: _scroll,
              padding: const EdgeInsets.fromLTRB(
                AppSpace.md,
                AppSpace.xs,
                AppSpace.md,
                AppSpace.sm,
              ),
              child: _closing ? _closingBody(context) : _body(context),
            ),
          ),
          _actions(context),
        ],
      ),
    );
  }

  Widget _header(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpace.md, 0, AppSpace.xs, 0),
      child: Row(
        children: [
          Expanded(
            child: Text(
              '십자가의 길',
              style: theme.textTheme.titleMedium?.copyWith(
                color: scheme.primary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text(
            _closing ? '마침' : '$_n / $_last',
            key: const ValueKey('stations-progress'),
            style: theme.textTheme.labelLarge?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
          IconButton(
            key: const ValueKey('stations-close'),
            tooltip: '닫기',
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.of(context).maybePop(),
          ),
        ],
      ),
    );
  }

  Widget _body(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final st = StationsOfCross.byNumber(_n);
    final size = MediaQuery.sizeOf(context);
    // 그림은 화면 높이의 34%(글자 1.4배 넘으면 26%)를 넘지 않게 해 본문이 보이게, 폭은 그 비율대로.
    final big = MediaQuery.textScalerOf(context).scale(10) > 14;
    // 성당 안 순례는 그 성당에 배정된 연작, 성당 밖은 사용자가 고른 연작(없으면 자동).
    final series = _pilgrim
        ? (widget.series ?? StationsSeriesCatalog.fallback)
        : StationsSeriesChoice.resolve(widget.series);
    var imgH = math.min(340.0, size.height * (big ? 0.26 : 0.34));
    var imgW = imgH * 600 / 742;
    if (!series.cover) {
      // 비율을 지켜 다 보이게: 가로로 긴 연작은 시트 폭에 맞추고 높이를 줄인다.
      final maxW = math.max(120.0, size.width - AppSpace.md * 2);
      imgW = imgH * series.aspect;
      if (imgW > maxW) {
        imgW = maxW;
        imgH = imgW / series.aspect;
      }
    }
    final (fx, fy) = st.focus;
    return Column(
      key: ValueKey('station-$_n'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: ClipRRect(
            borderRadius: AppShape.large,
            child: SizedBox(
              width: imgW,
              height: imgH,
              child: ColoredBox(
                color: scheme.surfaceContainerHighest,
                child: SingleArtImage(
                  asset: series.imageAsset(st.n),
                  decodeWidth: SingleArtImage.decodeWidthFor(
                    context,
                    imgW,
                    600,
                  ),
                  fit: series.cover ? BoxFit.cover : BoxFit.contain,
                  alignment: series.cover
                      ? Alignment(fx * 2 - 1, fy * 2 - 1)
                      : Alignment.center,
                  semanticLabel: '${st.label} 그림',
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: AppSpace.sm),
        Text(
          st.label,
          style: theme.textTheme.titleSmall?.copyWith(color: scheme.primary),
        ),
        const SizedBox(height: AppSpace.xxs),
        Text(
          st.title,
          key: const ValueKey('stations-title'),
          style: theme.textTheme.titleLarge,
        ),
        const SizedBox(height: AppSpace.xxs),
        Text(
          st.tradition ? st.refs : '성경 ${st.refs}',
          style: theme.textTheme.bodySmall?.copyWith(
            color: scheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: AppSpace.sm),
        // 공식 기도문(『가톨릭 기도서』). 1처에서는 시작 기도를 먼저 바친다.
        if (st.n == 1) ...[
          const StationsOpeningPrayer(),
          const SizedBox(height: AppSpace.sm),
        ],
        StationsPrayerSection(n: st.n),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            key: const ValueKey('stations-howto-link'),
            style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
            icon: const Icon(Icons.help_outline),
            label: const Text('바치는 법'),
            onPressed: _howTo,
          ),
        ),
        const SizedBox(height: AppSpace.xs),
        // 앱에서 쓴 보조 묵상은 접어 둔다.
        StationsMeditationTile(station: st),
        const SizedBox(height: AppSpace.sm),
        StationsArtNote(series: series),
        if (!_pilgrim) ...[
          const SizedBox(height: AppSpace.xs),
          StationsSeriesButton(auto: widget.series),
        ],
      ],
    );
  }

  Widget _closingBody(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Column(
      key: const ValueKey('stations-closing'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: AppSpace.xs),
        Center(
          child: Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: scheme.secondaryContainer,
            ),
            child: Icon(
              Icons.wb_twilight,
              size: 36,
              color: scheme.onSecondaryContainer,
            ),
          ),
        ),
        const SizedBox(height: AppSpace.sm),
        Text(
          '십자가의 길을 마치며',
          style: theme.textTheme.titleLarge,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: AppSpace.sm),
        Text(
          StationsOfCross.closing,
          style: theme.textTheme.bodyLarge,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: AppSpace.sm),
        // 공식 기도서에는 마침 기도가 따로 없다: 위 글이 앱의 글임을 밝힌다.
        Text(
          '『가톨릭 기도서』의 십자가의 길은 제14처 기도로 끝납니다. '
          '위 글은 로사리움이 덧붙인 마침 묵상이며 공식 기도문이 아닙니다.',
          key: const ValueKey('stations-closing-note'),
          style: theme.textTheme.bodySmall?.copyWith(
            color: scheme.onSurfaceVariant,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _actions(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final Widget left;
    final Widget right;
    if (_closing) {
      left = TextButton(
        key: const ValueKey('stations-back'),
        style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
        onPressed: () => setState(() => _closing = false),
        child: const Text('14처로'),
      );
      right = FilledButton.icon(
        key: const ValueKey('stations-finish'),
        style: FilledButton.styleFrom(minimumSize: const Size(64, 48)),
        icon: const Icon(Icons.check),
        label: Text(_pilgrim ? '순례 마치기' : '마치기'),
        onPressed: _complete,
      );
    } else if (_pilgrim) {
      left = TextButton(
        key: const ValueKey('stations-dismiss'),
        style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
        onPressed: () => Navigator.of(context).maybePop(),
        child: const Text('닫기'),
      );
      right = FilledButton.icon(
        key: const ValueKey('stations-next'),
        style: FilledButton.styleFrom(minimumSize: const Size(64, 48)),
        icon: Icon(_n >= _last ? Icons.wb_twilight : Icons.directions_walk),
        label: Text(_n >= _last ? '마치며' : '다음 처로'),
        onPressed: _next,
      );
    } else {
      left = OutlinedButton.icon(
        key: const ValueKey('stations-prev'),
        style: OutlinedButton.styleFrom(minimumSize: const Size(64, 48)),
        icon: const Icon(Icons.chevron_left),
        label: const Text('이전'),
        onPressed: _n > 1 ? () => _go(_n - 1) : null,
      );
      right = FilledButton.icon(
        key: const ValueKey('stations-next'),
        style: FilledButton.styleFrom(minimumSize: const Size(64, 48)),
        icon: Icon(_n >= _last ? Icons.wb_twilight : Icons.chevron_right),
        label: Text(_n >= _last ? '마치며' : '다음'),
        onPressed: _next,
      );
    }
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: scheme.outlineVariant)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpace.sm,
          AppSpace.xs,
          AppSpace.sm,
          AppSpace.xs,
        ),
        // 글자가 커서 한 줄에 안 들어가면 두 단추를 위아래로 둔다.
        child: Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          runSpacing: AppSpace.xs,
          spacing: AppSpace.xs,
          children: [left, right],
        ),
      ),
    );
  }
}

/// 성당 밖에서 14처를 목록으로 보는 화면(더보기 → 십자가의 길). 처를 누르면 같은 묵상 시트를 연다.
class StationsOfCrossScreen extends StatelessWidget {
  const StationsOfCrossScreen({
    super.key,
    this.from = StationsFrom.more,
    this.series,
  });

  static const routeName = 'stations_of_cross';

  final StationsFrom from;

  /// 그림 연작(마지막으로 들른 성당의 연작). null 이면 기본 연작.
  final StationsSeries? series;

  StationsSeries get _series => StationsSeriesChoice.resolve(series);

  void _open(BuildContext context, int n) {
    unawaited(showStationsSheet(context, start: n, from: from, series: series));
  }

  @override
  Widget build(BuildContext context) {
    unawaited(StationsSeriesChoice.load());
    return ValueListenableBuilder<String?>(
      valueListenable: StationsSeriesChoice.selected,
      builder: (context, _, _) => _build(context),
    );
  }

  Widget _build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          const SliverAppBar.large(title: Text('십자가의 길')),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(
              AppSpace.sm,
              0,
              AppSpace.sm,
              AppSpace.lg,
            ),
            sliver: SliverList.list(
              children: [
                StationsHowToCard(
                  onTap: () async {
                    final guide = await showStationsHowTo(context);
                    if (guide && context.mounted) {
                      await showStationsGuide(context, series: series);
                    }
                  },
                ),
                const SizedBox(height: AppSpace.xs),
                const Card.outlined(
                  child: Padding(
                    padding: EdgeInsets.all(AppSpace.sm),
                    child: StationsOpeningPrayer(),
                  ),
                ),
                const SizedBox(height: AppSpace.sm),
                Wrap(
                  spacing: AppSpace.xs,
                  runSpacing: AppSpace.xs,
                  children: [
                    FilledButton.icon(
                      key: const ValueKey('stations-guide'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(64, 48),
                      ),
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('함께 바치기'),
                      onPressed: () =>
                          showStationsGuide(context, series: series),
                    ),
                    OutlinedButton.icon(
                      key: const ValueKey('stations-start'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(64, 48),
                      ),
                      icon: const Icon(Icons.menu_book_outlined),
                      label: const Text('1처부터 묵상하기'),
                      onPressed: () => _open(context, 1),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpace.xxs),
                StationsSeriesButton(auto: series),
                const SizedBox(height: AppSpace.xs),
                Card.filled(
                  margin: EdgeInsets.zero,
                  color: scheme.surfaceContainerLow,
                  child: Column(
                    children: [
                      for (final st in StationsOfCross.all)
                        ListTile(
                          key: ValueKey('stations-item-${st.n}'),
                          leading: ClipRRect(
                            borderRadius: AppShape.small,
                            child: ColoredBox(
                              color: scheme.surfaceContainerHighest,
                              child: Image.asset(
                                _series.imageAsset(st.n),
                                width: 48,
                                height: 48,
                                cacheWidth: 144,
                                fit: BoxFit.cover,
                                alignment: _series.cover
                                    ? Alignment(
                                        st.focus.$1 * 2 - 1,
                                        st.focus.$2 * 2 - 1,
                                      )
                                    : Alignment.center,
                                excludeFromSemantics: true,
                                errorBuilder: (context, error, stack) =>
                                    const SizedBox(width: 48, height: 48),
                              ),
                            ),
                          ),
                          title: Text(st.title),
                          subtitle: Text(st.label),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => _open(context, st.n),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpace.sm),
                StationsArtNote(series: _series),
                const SizedBox(height: AppSpace.sm),
                const StationsPrayerLegend(),
                const SizedBox(height: AppSpace.sm),
                Text(
                  '각 처의 ‘묵상’에 접혀 있는 글은 성경과 전승을 바탕으로 로사리움이 새로 쓴 '
                  '짧은 글이며 공식 기도문이 아닙니다. '
                  '성당 탭에서 성당 안 14처 판 앞을 걸으며 순례할 수도 있어요.',
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
  }
}

/// 그림 출처 한 줄(작가·연도·촬영자·라이선스)과 '대체 성화' 안내. 그림을 보여 주는 곳마다 함께 둔다.
class StationsArtNote extends StatelessWidget {
  const StationsArtNote({super.key, required this.series});

  final StationsSeries series;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final style = theme.textTheme.bodySmall?.copyWith(
      color: scheme.onSurfaceVariant,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          '그림: ${series.creditLine}',
          key: const ValueKey('stations-art-credit'),
          style: style,
        ),
        const SizedBox(height: AppSpace.xxs),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.info_outline, size: 16, color: scheme.onSurfaceVariant),
            const SizedBox(width: AppSpace.xxs),
            Expanded(
              child: Text(
                StationsSeriesCatalog.disclosure,
                key: const ValueKey('stations-art-disclosure'),
                style: style,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
