import 'package:flutter/material.dart';

import '../app/theme.dart';
import '../domain/stations_guide.dart';
import '../domain/stations_of_cross.dart';
import '../domain/stations_prayers.dart';
import '../domain/stations_series.dart';
import 'widgets/stations_prayer_view.dart';
import 'widgets/stations_series_picker.dart';

/// '바치는 법' 안내 시트(M3 모달 바텀시트). [canGuide]면 아래에 '함께 바치기' 단추가 있고,
/// 그 단추를 누르면 true 를 돌려준다.
Future<bool> showStationsHowTo(
  BuildContext context, {
  bool canGuide = true,
}) async {
  final r = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    builder: (context) =>
        SafeArea(top: false, child: StationsHowToSheet(canGuide: canGuide)),
  );
  return r ?? false;
}

/// '함께 바치기' 화면을 연다. [theme]을 주면 그 테마(성당 안: 성당 테마)로 그린다.
/// 끝까지 마치면 true.
Future<bool> showStationsGuide(
  BuildContext context, {
  int start = 0,
  StationsSeries? series,
  bool fixedSeries = false,
  ThemeData? theme,
  ValueChanged<int>? onStation,
}) async {
  final r = await Navigator.of(context).push<bool>(
    MaterialPageRoute(
      settings: const RouteSettings(name: StationsGuideScreen.routeName),
      fullscreenDialog: true,
      builder: (_) {
        final screen = StationsGuideScreen(
          start: start,
          series: series,
          fixedSeries: fixedSeries,
          onStation: onStation,
        );
        return theme == null ? screen : Theme(data: theme, child: screen);
      },
    ),
  );
  return r ?? false;
}

/// 목록 화면 맨 위의 '처음이신가요? 바치는 법' 카드.
class StationsHowToCard extends StatelessWidget {
  const StationsHowToCard({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Card.filled(
      key: const ValueKey('stations-howto-card'),
      margin: EdgeInsets.zero,
      color: scheme.secondaryContainer,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Semantics(
          button: true,
          child: Padding(
            padding: const EdgeInsets.all(AppSpace.sm),
            child: Row(
              children: [
                Icon(Icons.help_outline, color: scheme.onSecondaryContainer),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '처음이신가요? 바치는 법',
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: scheme.onSecondaryContainer,
                        ),
                      ),
                      const SizedBox(height: AppSpace.xxs),
                      Text(
                        '순서와 기호, 절하는 곳을 쉽게 알려 드려요',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: scheme.onSecondaryContainer,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: scheme.onSecondaryContainer),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class StationsHowToSheet extends StatelessWidget {
  const StationsHowToSheet({super.key, this.canGuide = true});

  final bool canGuide;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final body = theme.textTheme.bodyLarge;
    Widget head(String s) => Padding(
      padding: const EdgeInsets.only(top: AppSpace.sm, bottom: AppSpace.xxs),
      child: Semantics(
        header: true,
        child: Text(
          s,
          style: theme.textTheme.titleSmall?.copyWith(color: scheme.primary),
        ),
      ),
    );
    Widget item(String lead, String s) => Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.xxs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(lead, style: body?.copyWith(color: scheme.primary)),
          const SizedBox(width: AppSpace.xs),
          Expanded(child: Text(s, style: body)),
        ],
      ),
    );
    return ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.92,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.md, 0, AppSpace.xs, 0),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '십자가의 길 바치는 법',
                    style: theme.textTheme.titleLarge,
                  ),
                ),
                IconButton(
                  key: const ValueKey('howto-close'),
                  tooltip: '닫기',
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
              ],
            ),
          ),
          Flexible(
            child: SingleChildScrollView(
              key: const ValueKey('howto-scroll'),
              padding: const EdgeInsets.fromLTRB(
                AppSpace.md,
                0,
                AppSpace.md,
                AppSpace.sm,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(StationsHowTo.what, style: body),
                  const SizedBox(height: AppSpace.xxs),
                  StationsRubricText(StationsPrayers.introRubrics.first),
                  head('순서 (기도서 본문 그대로)'),
                  for (final (i, s) in StationsHowTo.order.indexed)
                    item('${i + 1}.', s),
                  head('기호'),
                  for (final r in StationsPrayers.rolesUsed)
                    Semantics(
                      label: '${r.label}, ${r.official}',
                      child: ExcludeSemantics(
                        child: item(r.glyph, '${r.label} (${r.official})'),
                      ),
                    ),
                  head('동작 (기도서 지시문)'),
                  for (final s in StationsHowTo.gestures) item('•', s),
                  Card.outlined(
                    key: const ValueKey('howto-customs'),
                    margin: const EdgeInsets.only(top: AppSpace.sm),
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpace.sm),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            StationsHowTo.customsNote,
                            style: theme.textTheme.titleSmall,
                          ),
                          const SizedBox(height: AppSpace.xs),
                          for (final s in StationsHowTo.customs) item('•', s),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpace.sm),
                  Text(
                    StationsHowTo.source,
                    key: const ValueKey('howto-source'),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (canGuide)
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpace.sm,
                AppSpace.xs,
                AppSpace.sm,
                AppSpace.xs,
              ),
              child: FilledButton.icon(
                key: const ValueKey('howto-guide'),
                style: FilledButton.styleFrom(minimumSize: const Size(64, 48)),
                icon: const Icon(Icons.play_arrow),
                label: const Text('함께 바치기'),
                onPressed: () => Navigator.of(context).pop(true),
              ),
            ),
        ],
      ),
    );
  }
}

/// '함께 바치기': 시작 기도부터 14처·마침까지 한 화면에 한 단계씩 넘긴다. 공식 기도문만 보여 준다.
class StationsGuideScreen extends StatefulWidget {
  const StationsGuideScreen({
    super.key,
    this.start = 0,
    this.series,
    this.fixedSeries = false,
    this.onStation,
  });

  static const routeName = 'stations_guide';

  /// 시작할 처(1..14). 0이면 시작 기도부터.
  final int start;

  /// 그림 연작(성당의 연작). null 이면 기본 연작.
  final StationsSeries? series;

  /// true 면 [series]를 그대로 쓴다(성당 안). false 면 사용자가 고른 연작이 우선.
  final bool fixedSeries;

  /// '제N처로 가며' 단계로 넘어갈 때 불린다(성당 안: 아바타가 그 처 판 앞으로 걷는다).
  final ValueChanged<int>? onStation;

  @override
  State<StationsGuideScreen> createState() => _StationsGuideScreenState();
}

class _StationsGuideScreenState extends State<StationsGuideScreen> {
  static final _steps = StationsGuide.steps;
  late int _i = widget.start <= 0
      ? 0
      : StationsGuide.indexOfStation(widget.start);
  final _scroll = ScrollController();

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _to(int i) {
    final forward = i > _i;
    setState(() => _i = i);
    if (_scroll.hasClients) _scroll.jumpTo(0);
    final s = _steps[i];
    if (forward && s.kind == StationsGuideKind.move) {
      widget.onStation?.call(s.station);
    }
  }

  void _next() {
    if (_i >= _steps.length - 1) {
      Navigator.of(context).pop(true);
      return;
    }
    _to(_i + 1);
  }

  StationsSeries get _series => widget.fixedSeries
      ? (widget.series ?? StationsSeriesCatalog.fallback)
      : StationsSeriesChoice.resolve(widget.series);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final s = _steps[_i];
    final inStation = s.station >= 1 && s.station <= 14;
    final String nextLabel;
    if (s.kind == StationsGuideKind.closing) {
      nextLabel = '마치기';
    } else if (s.kind == StationsGuideKind.after) {
      nextLabel = s.station >= 14 ? '마침' : '다음 처로';
    } else if (s.kind == StationsGuideKind.opening) {
      nextLabel = '제1처로';
    } else {
      nextLabel = '다음';
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('함께 바치기'),
        actions: [
          IconButton(
            key: const ValueKey('guide-howto'),
            tooltip: '바치는 법',
            icon: const Icon(Icons.help_outline),
            onPressed: () => showStationsHowTo(context, canGuide: false),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            LinearProgressIndicator(
              value: (_i + 1) / _steps.length,
              semanticsLabel: '진행',
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpace.sm,
                AppSpace.xs,
                AppSpace.sm,
                0,
              ),
              child: Row(
                children: [
                  if (inStation) ...[
                    _thumb(scheme, s.station),
                    const SizedBox(width: AppSpace.sm),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          switch (s.kind) {
                            StationsGuideKind.opening => '시작 기도',
                            StationsGuideKind.closing => '마침',
                            _ => '제${s.station}처 / 14',
                          },
                          key: const ValueKey('guide-progress'),
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: scheme.primary,
                          ),
                        ),
                        if (inStation)
                          Text(
                            StationsOfCross.byNumber(s.station).title,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: scheme.onSurfaceVariant,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                key: const ValueKey('guide-scroll'),
                controller: _scroll,
                padding: const EdgeInsets.all(AppSpace.sm),
                child: _stepBody(context, s),
              ),
            ),
            DecoratedBox(
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: scheme.outlineVariant)),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpace.sm,
                  vertical: AppSpace.xs,
                ),
                child: Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: AppSpace.xs,
                  runSpacing: AppSpace.xs,
                  children: [
                    OutlinedButton.icon(
                      key: const ValueKey('guide-prev'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(64, 48),
                      ),
                      icon: const Icon(Icons.chevron_left),
                      label: const Text('이전'),
                      onPressed: _i > 0 ? () => _to(_i - 1) : null,
                    ),
                    FilledButton.icon(
                      key: const ValueKey('guide-next'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(64, 48),
                      ),
                      icon: Icon(
                        s.kind == StationsGuideKind.closing
                            ? Icons.check
                            : s.kind == StationsGuideKind.after ||
                                  s.kind == StationsGuideKind.opening
                            ? Icons.directions_walk
                            : Icons.chevron_right,
                      ),
                      label: Text(nextLabel),
                      onPressed: _next,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _thumb(ColorScheme scheme, int n) {
    final series = _series;
    final (fx, fy) = StationsOfCross.byNumber(n).focus;
    return ClipRRect(
      borderRadius: AppShape.small,
      child: ColoredBox(
        color: scheme.surfaceContainerHighest,
        child: Image.asset(
          series.imageAsset(n),
          key: const ValueKey('guide-thumb'),
          width: 56,
          height: 56,
          cacheWidth: 168,
          fit: BoxFit.cover,
          alignment: series.cover
              ? Alignment(fx * 2 - 1, fy * 2 - 1)
              : Alignment.center,
          excludeFromSemantics: true,
          errorBuilder: (context, error, stack) =>
              const SizedBox(width: 56, height: 56),
        ),
      ),
    );
  }

  Widget _stepBody(BuildContext context, StationsGuideStep s) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    const gap = SizedBox(height: AppSpace.sm);
    return Column(
      key: ValueKey('guide-step-$_i'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 지금 할 일(크게). 단계가 바뀌면 화면 낭독기가 읽어 준다.
        Card.filled(
          margin: EdgeInsets.zero,
          color: scheme.primaryContainer,
          child: Padding(
            padding: const EdgeInsets.all(AppSpace.sm),
            child: Semantics(
              liveRegion: true,
              child: Text(
                s.action,
                key: const ValueKey('guide-action'),
                style: theme.textTheme.titleLarge?.copyWith(
                  color: scheme.onPrimaryContainer,
                ),
              ),
            ),
          ),
        ),
        if (s.bow) ...[
          const SizedBox(height: AppSpace.xs),
          Row(
            key: const ValueKey('guide-bow'),
            children: [
              Icon(Icons.accessibility_new, color: scheme.tertiary),
              const SizedBox(width: AppSpace.xs),
              Expanded(
                child: Text(
                  '‘예수 그리스도님,’ 다음에 깊은 절을 하세요',
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: scheme.tertiary,
                  ),
                ),
              ),
            ],
          ),
        ],
        gap,
        for (final r in s.rubrics) StationsRubricText(r),
        if (s.rubrics.isNotEmpty) const SizedBox(height: AppSpace.xs),
        if (s.announce != null)
          Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: '제${s.station}처 ',
                  style: TextStyle(
                    color: scheme.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                TextSpan(text: s.announce),
              ],
            ),
            key: const ValueKey('guide-announce'),
            style: theme.textTheme.titleMedium,
          ),
        for (final p in s.parts) ...[
          // 기호 뜻을 글로도 보여 준다(낭독은 아래 기도문 위젯이 역할 이름으로 읽는다).
          ExcludeSemantics(
            child: Text(
              p.role.label,
              style: theme.textTheme.labelLarge?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
          ),
          StationsPrayerPartView(part: p),
          gap,
        ],
        if (s.kind == StationsGuideKind.closing) ...[
          Text(
            '『가톨릭 기도서』의 십자가의 길은 제14처 기도와 '
            '주님의 기도, 성모송, 영광송으로 끝납니다. 따로 정해진 마침 기도는 없습니다.',
            key: const ValueKey('guide-closing-note'),
            style: theme.textTheme.bodyLarge,
          ),
          gap,
          Text(
            '일반적인 관습: 성호경을 그으며 마칩니다.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
          gap,
          const StationsPrayerLegend(),
        ],
      ],
    );
  }
}
