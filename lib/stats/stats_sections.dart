import 'package:flutter/material.dart';

import '../app/theme.dart';
import 'logical_day.dart';
import 'stats_data.dart';
import 'stats_format.dart';
import 'stats_logic.dart';
import 'stats_painters.dart';
import 'text_fit.dart';

/// 통계 화면의 구역들: 발자취(연속·히트맵) → 기간 막대 → 신비 도넛 → 돌아보기 카드.
/// 구역마다 오른쪽 위에 '카드로 나누기' 단추가 있다.

/// 구역 카드(제목 + 나누기 단추).
class StatsSectionCard extends StatelessWidget {
  const StatsSectionCard({
    super.key,
    required this.title,
    required this.child,
    this.onShare,
    this.shareLabel,
  });

  final String title;
  final Widget child;
  final VoidCallback? onShare;
  final String? shareLabel;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Card.filled(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 8, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text(
                      title,
                      style: text.titleMedium,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
                if (onShare != null)
                  IconButton(
                    tooltip: shareLabel ?? '$title 카드로 나누기',
                    onPressed: onShare,
                    icon: const Icon(Icons.ios_share),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(right: 8, top: 4),
              child: child,
            ),
          ],
        ),
      ),
    );
  }
}

// ================================================================ 발자취

/// 연속 카드 + 히트맵(독서공방 `statsStreakCardHTML`/`statsStreakLegendHTML`/`heatmapHTML`).
class StreakHeatmapSection extends StatelessWidget {
  const StreakHeatmapSection({
    super.key,
    required this.data,
    required this.onShare,
    required this.onGoal,
  });

  final StatsData data;
  final VoidCallback onShare;
  final VoidCallback onGoal;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final gold = AppDecor.of(context).gold;
    final goal = data.goal;
    final span = data.yearSpan;
    final colors = HeatColors.of(scheme, gold);
    final cur = data.current;
    final label = goal.isOff ? '이어 온 날' : '목표만큼 이어 온 날';
    final summary = StringBuffer('지난 1년 동안 ${data.prayedDaysInYear}일 기도했어요');
    return StatsSectionCard(
      title: '기도의 발자취',
      onShare: onShare,
      shareLabel: '기도의 발자취 카드로 나누기',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            keepAll(summary.toString()),
            style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
            semanticsLabel: summary.toString(),
          ),
          const SizedBox(height: 12),
          Semantics(
            container: true,
            label: cur > 0 ? '$label $cur일' : '$label 없음',
            excludeSemantics: true,
            child: Card.filled(
              color: scheme.primaryContainer,
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.local_fire_department_rounded,
                      size: 32,
                      color: scheme.onPrimaryContainer,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            keepAll(label),
                            style: text.labelMedium?.copyWith(
                              color: scheme.onPrimaryContainer,
                            ),
                          ),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: Text(
                              cur > 0 ? '$cur일' : '오늘부터 다시',
                              maxLines: 1,
                              style: text.headlineSmall?.copyWith(
                                color: scheme.onPrimaryContainer,
                              ),
                            ),
                          ),
                          if (span != null) ...[
                            const SizedBox(height: 8),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Padding(
                                  padding: const EdgeInsets.only(top: 3),
                                  child: Container(
                                    width: 12,
                                    height: 12,
                                    decoration: BoxDecoration(
                                      color: scheme.primary.withValues(alpha: 0.5),
                                      borderRadius: BorderRadius.circular(3),
                                      border: Border.all(color: gold, width: 1.5),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    keepAll(
                                      '길게 이어 온 때 · ${span.n}일 · '
                                      '${rangeLabel(StatsRange(span.s, span.e), data.today)}',
                                    ),
                                    style: text.bodySmall?.copyWith(
                                      color: scheme.onPrimaryContainer,
                                    ),
                                    maxLines: 3,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          PrayerHeatmap(data: data, colors: colors, streak: span),
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: onGoal,
              icon: const Icon(Icons.flag_outlined, size: 18),
              label: Text(
                goal.isOff
                    ? '오늘의 기도 목표 정하기'
                    : '오늘의 기도 목표 · ${goal.summaryKo}',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
            ),
          ),
        ],
      ),
    );
  }
}

/// 최근 1년 히트맵. 오른쪽 끝이 오늘이고 처음 열면 오늘 쪽을 보여 준다.
class PrayerHeatmap extends StatelessWidget {
  const PrayerHeatmap({
    super.key,
    required this.data,
    required this.colors,
    this.streak,
  });

  final StatsData data;
  final HeatColors colors;
  final StreakSpan? streak;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final scaler = MediaQuery.textScalerOf(context);
    final grid = data.grid;
    final size = HeatmapPainter.sizeFor(grid);
    final labels = heatmapMonthLabels(grid);
    final labelStyle = text.labelSmall!.copyWith(color: scheme.onSurfaceVariant);
    final labelH = scaler.scale(labelStyle.fontSize ?? 11) * 1.4 + 2;
    final goal = data.goal;
    final desc = '최근 1년 기도 달력. ${data.prayedDaysInYear}일 기도했어요.'
        '${goal.isOff ? '' : ' 목표만큼 바친 날은 더 진하게 보여요.'}';
    Widget swatch(Color c) => Container(
      width: 12,
      height: 12,
      decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(3)),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          container: true,
          label: desc,
          excludeSemantics: true,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            reverse: true,
            child: SizedBox(
              width: size.width + 24,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    height: labelH,
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        for (final (col, month) in labels)
                          Positioned(
                            left: col * HeatmapPainter.pitch,
                            top: 0,
                            child: Text(
                              '$month월',
                              maxLines: 1,
                              softWrap: false,
                              style: labelStyle,
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  CustomPaint(
                    size: size,
                    painter: HeatmapPainter(
                      grid: grid,
                      days: data.days,
                      goal: goal,
                      colors: colors,
                      today: data.today,
                      streak: streak,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 4,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text('적음', style: labelStyle),
            swatch(colors.empty),
            for (final c in colors.levels) swatch(c),
            Text('많음', style: labelStyle),
            Text(
              keepAll('· 오른쪽 끝이 오늘이에요'),
              style: labelStyle,
            ),
          ],
        ),
      ],
    );
  }
}

// ================================================================ 기간

/// 지표 칸.
class StatTile extends StatelessWidget {
  const StatTile({super.key, required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Semantics(
      container: true,
      label: '$label $value',
      excludeSemantics: true,
      child: Card.filled(
        color: scheme.surfaceContainerHigh,
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 22, color: scheme.primary),
              const SizedBox(height: 8),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  value,
                  maxLines: 1,
                  style: text.titleLarge?.copyWith(color: scheme.onSurface),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                keepAll(label),
                style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 기간 고르기 + 막대 + 합계(독서공방 `statsRangeGet/Preset/Shift/Label` + `statsPeriodCore`).
class PeriodSection extends StatefulWidget {
  const PeriodSection({
    super.key,
    required this.data,
    required this.range,
    required this.onRange,
    required this.onShare,
  });

  final StatsData data;
  final StatsRange range;
  final ValueChanged<StatsRange> onRange;
  final VoidCallback onShare;

  @override
  State<PeriodSection> createState() => _PeriodSectionState();
}

class _PeriodSectionState extends State<PeriodSection> {
  bool _minutes = false;
  int? _selected;

  static const _chips = <(StatsPreset, String)>[
    (StatsPreset.l7, '최근 7일'),
    (StatsPreset.l30, '최근 30일'),
    (StatsPreset.l90, '최근 90일'),
    (StatsPreset.thisMonth, '이번 달'),
    (StatsPreset.thisYear, '올해'),
    (StatsPreset.all, '전체'),
  ];

  @override
  void didUpdateWidget(PeriodSection old) {
    super.didUpdateWidget(old);
    if (old.range != widget.range) _selected = null;
  }

  Future<void> _pickCustom() async {
    final d = widget.data;
    final today = parseDayKey(d.today);
    final first = parseDayKey(d.earliest ?? shiftDayKey(d.today, -365));
    final picked = await showDateRangePicker(
      context: context,
      firstDate: first.isAfter(today) ? today : first,
      lastDate: today,
      initialDateRange: DateTimeRange(
        start: parseDayKey(widget.range.s),
        end: parseDayKey(widget.range.e),
      ),
      helpText: '기간 고르기',
      saveText: '확인',
    );
    if (picked == null) return;
    widget.onRange(StatsRange(ymdKey(picked.start), ymdKey(picked.end)));
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final d = widget.data;
    final r = widget.range;
    final preset = presetOf(r, d.today, earliest: d.earliest);
    final totals = periodCore(d.days, r.contains, goal: d.goal);
    final buckets = periodBuckets(d.days, r);
    final prev = shiftRange(r, -1, d.today, earliest: d.earliest);
    final next = shiftRange(r, 1, d.today, earliest: d.earliest);
    final parts = rangeLabelParts(r, d.today);
    final values = [for (final b in buckets) _minutes ? b.minutes : b.decades];
    final unit = _minutes ? '분' : '단';
    final sel = _selected != null && _selected! < buckets.length ? _selected : null;
    final goalLine = d.goal.isOff || bucketUnitFor(r) != BucketUnit.day
        ? null
        : (_minutes
              ? (d.goal.hasMinutes ? d.goal.minutes : null)
              : (d.goal.hasDecades ? d.goal.decades : null));
    return StatsSectionCard(
      title: '기간별 기도',
      onShare: widget.onShare,
      shareLabel: '기간별 기도 카드로 나누기',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final (p, label) in _chips)
                ChoiceChip(
                  label: Text(label),
                  selected: preset == p,
                  onSelected: (_) {
                    final nr = presetRange(p, d.today, earliest: d.earliest);
                    if (nr != null) widget.onRange(nr);
                  },
                ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              IconButton(
                tooltip: '이전 기간',
                onPressed: prev == null ? null : () => widget.onRange(prev),
                icon: const Icon(Icons.chevron_left),
              ),
              Expanded(
                child: TextButton.icon(
                  onPressed: _pickCustom,
                  icon: const Icon(Icons.calendar_month_outlined, size: 18),
                  label: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(text: parts[0]),
                        TextSpan(text: parts[1]),
                        TextSpan(text: parts[2]),
                      ],
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    semanticsLabel: '기간 ${parts.join()}. 눌러서 달력으로 고르기',
                  ),
                  style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                ),
              ),
              IconButton(
                tooltip: '다음 기간',
                onPressed: next == null ? null : () => widget.onRange(next),
                icon: const Icon(Icons.chevron_right),
              ),
            ],
          ),
          Text(
            keepAll('${r.days}일 중 ${totals.days}일 기도했어요'
                '${d.goal.isOff ? '' : ' · 목표만큼 바친 날 ${totals.goalDays}일'}'),
            style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
          ),
          const SizedBox(height: 12),
          _TileRow(
            a: StatTile(
              icon: Icons.verified_outlined,
              label: '끝까지 바친 묵주기도',
              value: '${totals.rosaries}번',
            ),
            b: StatTile(
              icon: Icons.filter_5_outlined,
              label: '바친 단',
              value: '${totals.decades}단',
            ),
          ),
          const SizedBox(height: 10),
          _TileRow(
            a: StatTile(
              icon: Icons.favorite_border,
              label: '성모송',
              value: '${totals.hailMarys}번',
            ),
            b: StatTile(
              icon: Icons.schedule,
              label: '기도 시간',
              value: formatDurationKo(totals.seconds),
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            children: [
              ChoiceChip(
                label: const Text('단'),
                selected: !_minutes,
                onSelected: (_) => setState(() => _minutes = false),
              ),
              ChoiceChip(
                label: const Text('분'),
                selected: _minutes,
                onSelected: (_) => setState(() => _minutes = true),
              ),
            ],
          ),
          const SizedBox(height: 8),
          PeriodBars(
            values: values,
            labels: [for (final b in buckets) b.label],
            fullLabels: [for (final b in buckets) b.fullLabel],
            unit: unit,
            selected: sel,
            goalLine: goalLine,
            onSelect: (i) => setState(() => _selected = i == _selected ? null : i),
          ),
          const SizedBox(height: 6),
          Text(
            sel == null
                ? '막대를 누르면 자세히 보여 줘요'
                : '${buckets[sel].fullLabel} · ${values[sel]}$unit',
            style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _TileRow extends StatelessWidget {
  const _TileRow({required this.a, required this.b});
  final Widget a;
  final Widget b;

  @override
  Widget build(BuildContext context) => IntrinsicHeight(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(child: a),
        const SizedBox(width: 10),
        Expanded(child: b),
      ],
    ),
  );
}

/// 막대 그래프(하루/주/달). 큰 글씨에서는 축 글자를 드문드문 찍는다.
class PeriodBars extends StatelessWidget {
  const PeriodBars({
    super.key,
    required this.values,
    required this.labels,
    required this.fullLabels,
    required this.unit,
    this.selected,
    this.goalLine,
    this.onSelect,
    this.height = 150,
  });

  final List<int> values;
  final List<String> labels;
  final List<String> fullLabels;
  final String unit;
  final int? selected;
  final int? goalLine;
  final ValueChanged<int>? onSelect;
  final double height;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final scaler = MediaQuery.textScalerOf(context);
    final style = text.labelSmall!.copyWith(color: scheme.onSurfaceVariant);
    final total = values.fold<int>(0, (a, b) => a + b);
    final h = height + BarsPainter.labelHeight(style, scaler);
    return Semantics(
      container: true,
      label: '기간 막대그래프. 모두 $total$unit',
      excludeSemantics: true,
      child: LayoutBuilder(
        builder: (context, c) => GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: onSelect == null || values.isEmpty
              ? null
              : (d) {
                  final i = (d.localPosition.dx / (c.maxWidth / values.length))
                      .floor()
                      .clamp(0, values.length - 1);
                  onSelect!(i);
                },
          child: SizedBox(
            width: c.maxWidth,
            height: h,
            child: CustomPaint(
              painter: BarsPainter(
                values: values,
                labels: labels,
                bar: scheme.primary.withValues(alpha: 0.78),
                selectedBar: scheme.tertiary,
                axis: scheme.outlineVariant,
                labelStyle: style,
                scaler: scaler,
                selected: selected,
                goalLine: goalLine,
                goalColor: AppDecor.of(context).gold,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ================================================================ 도넛

/// 신비별(·종류별) 도넛(독서공방 `sgDonutSVG`/`sgDonutBlock`).
class DonutSection extends StatefulWidget {
  const DonutSection({
    super.key,
    required this.data,
    required this.range,
    required this.onShare,
  });

  final StatsData data;
  final StatsRange range;
  final void Function(List<DonutSlice> slices, bool kinds) onShare;

  @override
  State<DonutSection> createState() => _DonutSectionState();
}

class _DonutSectionState extends State<DonutSection> {
  bool _kinds = false;

  @override
  Widget build(BuildContext context) {
    final d = widget.data;
    final r = widget.range;
    final mystery = mysteryShares(d.records, r.contains, startHour: d.startHour);
    final kinds = kindShares(d.records, r.contains, startHour: d.startHour);
    final kindsAvailable = kinds.where((k) => k.n > 0).length >= 2;
    final showKinds = _kinds && kindsAvailable;
    final slices = showKinds ? kinds : mystery;
    return StatsSectionCard(
      title: showKinds ? '기도 종류' : '신비별 기도',
      onShare: () => widget.onShare(slices, showKinds),
      shareLabel: '신비별 기도 카드로 나누기',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            rangeLabel(r, d.today),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          if (kindsAvailable) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                ChoiceChip(
                  label: const Text('신비'),
                  selected: !showKinds,
                  onSelected: (_) => setState(() => _kinds = false),
                ),
                ChoiceChip(
                  label: const Text('종류'),
                  selected: showKinds,
                  onSelected: (_) => setState(() => _kinds = true),
                ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          DonutBlock(slices: slices),
        ],
      ),
    );
  }
}

/// 도넛 + 범례. 범례 한 줄은 이름·값을 두 줄로 쌓아 큰 글씨에서도 겹치지 않는다.
class DonutBlock extends StatelessWidget {
  const DonutBlock({super.key, required this.slices});

  final List<DonutSlice> slices;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final b = Theme.of(context).brightness;
    final total = slices.fold<int>(0, (a, s) => a + s.n);
    if (total <= 0) {
      return Text(
        '이 기간에는 아직 기록이 없어요',
        style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
      );
    }
    final shown = [for (final s in slices) if (s.n > 0) s];
    final colors = [for (final s in shown) StatsColors.forSlice(s, b)];
    final donut = SizedBox(
      width: 128,
      height: 128,
      child: CustomPaint(
        painter: DonutPainter(
          values: [for (final s in shown) s.n],
          colors: colors,
          track: scheme.outlineVariant.withValues(alpha: 0.4),
        ),
      ),
    );
    final legend = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < shown.length; i++)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Semantics(
              container: true,
              label: '${shown[i].label} ${shown[i].n}${shown[i].unit}, ${shown[i].pct}%',
              excludeSemantics: true,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 5),
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(color: colors[i], shape: BoxShape.circle),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          keepAll(shown[i].label),
                          style: text.bodyMedium,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          '${shown[i].n}${shown[i].unit} · ${shown[i].pct}%',
                          style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
    return LayoutBuilder(
      builder: (context, c) {
        final narrow = c.maxWidth < 300 || MediaQuery.textScalerOf(context).scale(14) > 20;
        if (narrow) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [Center(child: donut), const SizedBox(height: 12), legend],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [donut, const SizedBox(width: 20), Expanded(child: legend)],
        );
      },
    );
  }
}

// ================================================================ 돌아보기

/// 이번 주 · 이번 달 · 올해의 기도 카드(독서공방 `weekMonCard`/`monthRecapShare`/`recapCard`).
class RecapSection extends StatefulWidget {
  const RecapSection({super.key, required this.data, required this.onShare});

  final StatsData data;
  final void Function(RecapData recap) onShare;

  @override
  State<RecapSection> createState() => _RecapSectionState();
}

class _RecapSectionState extends State<RecapSection> {
  final Map<RecapKind, int> _offset = {for (final k in RecapKind.values) k: 0};

  RecapData _build(RecapKind k, int offset) => buildRecap(
    widget.data.records,
    k,
    widget.data.today,
    offset: offset,
    startHour: widget.data.startHour,
    goal: widget.data.goal,
  );

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final d = widget.data;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
          child: Semantics(
            header: true,
            child: Text('돌아보기', style: text.titleMedium),
          ),
        ),
        for (final k in RecapKind.values) ...[
          if (k != RecapKind.week) const SizedBox(height: 12),
          _RecapTile(
            recap: _build(k, _offset[k]!),
            canPrev: d.earliest != null &&
                _build(k, _offset[k]! - 1).range.e.compareTo(d.earliest!) >= 0,
            canNext: _offset[k]! < 0,
            onPrev: () => setState(() => _offset[k] = _offset[k]! - 1),
            onNext: () => setState(() => _offset[k] = _offset[k]! + 1),
            onShare: widget.onShare,
          ),
        ],
      ],
    );
  }
}

class _RecapTile extends StatelessWidget {
  const _RecapTile({
    required this.recap,
    required this.canPrev,
    required this.canNext,
    required this.onPrev,
    required this.onNext,
    required this.onShare,
  });

  final RecapData recap;
  final bool canPrev;
  final bool canNext;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  final void Function(RecapData) onShare;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final t = recap.totals;
    final style = text.labelSmall!.copyWith(color: scheme.onSurfaceVariant);
    final heading = '${recap.title}의 기도';
    final pills = <String>[
      '${t.decades}단',
      '끝까지 바친 묵주기도 ${t.rosaries}번',
      '기도 시간 ${formatDurationKo(t.seconds)}',
      if (!recap.goal.isOff) '목표만큼 바친 날 ${t.goalDays}일',
    ];
    return Card.filled(
      color: scheme.surfaceContainerLow,
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 8, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text(
                      heading,
                      style: text.titleMedium,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: '$heading 카드로 나누기',
                  onPressed: () => onShare(recap),
                  icon: const Icon(Icons.ios_share),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      IconButton(
                        tooltip: '이전',
                        onPressed: canPrev ? onPrev : null,
                        icon: const Icon(Icons.chevron_left),
                      ),
                      Expanded(
                        child: Text(
                          recap.periodLabel,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                        ),
                      ),
                      IconButton(
                        tooltip: '다음',
                        onPressed: canNext ? onNext : null,
                        icon: const Icon(Icons.chevron_right),
                      ),
                    ],
                  ),
                  Semantics(
                    container: true,
                    label: '${t.days}일 기도했어요',
                    excludeSemantics: true,
                    child: Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: '${t.days}',
                            style: text.displaySmall?.copyWith(color: scheme.primary),
                          ),
                          TextSpan(text: '일 기도했어요', style: text.titleSmall),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  PeriodBars(
                    values: [for (final b in recap.bars) b.decades],
                    labels: [for (final b in recap.bars) b.label],
                    fullLabels: [for (final b in recap.bars) b.fullLabel],
                    unit: '단',
                    height: 56,
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      for (final p in pills)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: scheme.secondaryContainer,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 260),
                            child: Text(
                              keepAll(p),
                              style: text.labelMedium?.copyWith(
                                color: scheme.onSecondaryContainer,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                    ],
                  ),
                  if (recap.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        keepAll('이 기간에는 기록이 없어요. 편안할 때 다시 바쳐 보세요.'),
                        style: style,
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
