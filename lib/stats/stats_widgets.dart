import 'package:flutter/material.dart';

import '../domain/prayer_data.dart';
import 'prayer_stats_store.dart';
import '../app/theme.dart';

DateTime Function() _clock(DateTime Function()? now) => now ?? DateTime.now;

Duration _motion(BuildContext context, Duration d) =>
    MediaQuery.disableAnimationsOf(context) ? Duration.zero : d;

/// 홈 화면용 요약 카드: '이번 달 · 올해 · 전체' 묵주기도 완주 횟수.
class StatsSummaryCard extends StatelessWidget {
  const StatsSummaryCard({
    super.key,
    required this.store,
    this.onTap,
    this.now,
  });

  final PrayerStatsStore store;

  /// 카드를 눌렀을 때(보통 [StatsScreen]을 연다).
  final VoidCallback? onTap;

  /// 테스트용 시계 주입.
  final DateTime Function()? now;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        final today = _clock(now)();
        final calc = store.calc;
        final month = calc.completedInMonth(today.year, today.month);
        final year = calc.completedInYear(today.year);
        final all = calc.completedAll();
        final streak = calc.currentStreak(today);
        final empty = store.records.isEmpty;
        final scheme = Theme.of(context).colorScheme;
        final text = Theme.of(context).textTheme;

        final label = empty
            ? '나의 기도 기록. 아직 기록이 없어요. 첫 묵주기도를 바쳐 보세요.'
            : '나의 기도 기록. 이번 달 $month회, 올해 $year회, 전체 $all회'
                  '${streak >= 1 ? '. 연속 $streak일 기도 중' : ''}';

        return Semantics(
          container: true,
          button: onTap != null,
          onTap: onTap,
          label: label,
          excludeSemantics: true,
          child: Card.filled(
            color: scheme.primaryContainer,
            margin: EdgeInsets.zero,
            clipBehavior: Clip.antiAlias,
            shape: RoundedRectangleBorder(borderRadius: AppShape.large),
            child: InkWell(
              onTap: onTap,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 48),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              '나의 기도 기록',
                              style: text.titleMedium?.copyWith(
                                color: scheme.onPrimaryContainer,
                              ),
                            ),
                          ),
                          if (onTap != null)
                            Icon(
                              Icons.chevron_right,
                              color: scheme.onPrimaryContainer,
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (empty)
                        Text(
                          '아직 기록이 없어요. 첫 묵주기도를 바쳐 보세요.',
                          style: text.bodyMedium?.copyWith(
                            color: scheme.onPrimaryContainer,
                          ),
                        )
                      else ...[
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _BigNumber(label: '이번 달', value: month),
                            _BigNumber(label: '올해', value: year),
                            _BigNumber(label: '전체', value: all),
                          ],
                        ),
                        if (streak >= 1) ...[
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Icon(
                                Icons.local_fire_department_rounded,
                                size: 18,
                                color: scheme.onPrimaryContainer,
                              ),
                              const SizedBox(width: 6),
                              Flexible(
                                child: Text(
                                  '연속 $streak일 기도 중',
                                  style: text.labelLarge?.copyWith(
                                    color: scheme.onPrimaryContainer,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _BigNumber extends StatelessWidget {
  const _BigNumber({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: text.labelMedium?.copyWith(color: scheme.onPrimaryContainer),
          ),
          const SizedBox(height: 2),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(text: '$value', style: text.headlineMedium),
                  TextSpan(text: '회', style: text.titleSmall),
                ],
              ),
              style: TextStyle(color: scheme.onPrimaryContainer),
              maxLines: 1,
            ),
          ),
        ],
      ),
    );
  }
}

/// 1~12월 막대그래프(외부 차트 패키지 없음). [highlightMonth]는 기본 색
/// (primary)으로 강조되고 나머지는 secondaryContainer다. 막대를 누르거나
/// 길게 누르면 정확한 값을 툴팁으로 보여 준다.
class MonthBarChart extends StatelessWidget {
  const MonthBarChart({
    super.key,
    required this.values,
    this.highlightMonth,
    this.height = 180,
    this.unit = '회',
  }) : assert(values.length == 12);

  /// 1월..12월 값 (길이 12).
  final List<int> values;

  /// 1..12. 강조할 달.
  final int? highlightMonth;

  /// 값 라벨·막대 영역의 높이(축 라벨 제외).
  final double height;

  /// 값 뒤에 붙는 단위. 툴팁과 접근성 라벨에 쓰인다.
  final String unit;

  static const double _labelHeight = 20;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final maxValue = values.fold<int>(1, (a, b) => b > a ? b : a);
    final barArea = height - _labelHeight;
    final duration = _motion(context, Durations.medium2);

    final spoken = [
      for (var i = 0; i < 12; i++)
        if (values[i] > 0) '${i + 1}월 ${values[i]}$unit',
    ];
    final semanticLabel = spoken.isEmpty
        ? '월별 막대그래프. 기록 없음'
        : '월별 막대그래프. ${spoken.join(', ')}';

    return Semantics(
      container: true,
      label: semanticLabel,
      child: ExcludeSemantics(
        child: SizedBox(
          height: height + _labelHeight,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var i = 0; i < 12; i++)
                Expanded(
                  child: Tooltip(
                    message: '${i + 1}월 · ${values[i]}$unit',
                    triggerMode: TooltipTriggerMode.tap,
                    child: Column(
                      children: [
                        Expanded(
                          child: Align(
                            alignment: Alignment.bottomCenter,
                            child: TweenAnimationBuilder<double>(
                              tween: Tween<double>(
                                begin: 0,
                                end: values[i] <= 0
                                    ? 0
                                    : (values[i] / maxValue).clamp(0.0, 1.0),
                              ),
                              duration: duration,
                              curve: Easing.emphasizedDecelerate,
                              builder: (context, t, _) {
                                final isHighlight = highlightMonth == i + 1;
                                return Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    SizedBox(
                                      height: _labelHeight,
                                      child: FittedBox(
                                        fit: BoxFit.scaleDown,
                                        child: Text(
                                          '${values[i]}',
                                          style: text.labelSmall?.copyWith(
                                            color: isHighlight
                                                ? scheme.primary
                                                : scheme.onSurfaceVariant,
                                            fontWeight: isHighlight
                                                ? FontWeight.w700
                                                : null,
                                          ),
                                        ),
                                      ),
                                    ),
                                    Container(
                                      width: double.infinity,
                                      height: 4 + (barArea - 4) * t,
                                      margin: const EdgeInsets.symmetric(
                                        horizontal: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: isHighlight
                                            ? scheme.primary
                                            : scheme.secondaryContainer,
                                        borderRadius:
                                            const BorderRadius.vertical(
                                              top: Radius.circular(4),
                                            ),
                                      ),
                                    ),
                                  ],
                                );
                              },
                            ),
                          ),
                        ),
                        SizedBox(
                          height: _labelHeight,
                          child: Center(
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                '${i + 1}월',
                                style: text.labelSmall?.copyWith(
                                  color: highlightMonth == i + 1
                                      ? scheme.primary
                                      : scheme.onSurfaceVariant,
                                  fontWeight: highlightMonth == i + 1
                                      ? FontWeight.w700
                                      : null,
                                ),
                              ),
                            ),
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

/// 한 달 달력(일요일 시작). 기도한 날은 primary 채운 원, 오늘은 외곽선.
class MonthCalendar extends StatefulWidget {
  const MonthCalendar({
    super.key,
    required this.store,
    this.now,
    this.initialMonth,
    this.onMonthChanged,
  });

  final PrayerStatsStore store;

  /// 테스트용 시계 주입.
  final DateTime Function()? now;

  /// 처음 보여 줄 달(없으면 이번 달). 일은 무시된다.
  final DateTime? initialMonth;

  final ValueChanged<DateTime>? onMonthChanged;

  @override
  State<MonthCalendar> createState() => _MonthCalendarState();
}

class _MonthCalendarState extends State<MonthCalendar> {
  late DateTime _month;

  DateTime get _today => _clock(widget.now)();

  @override
  void initState() {
    super.initState();
    final base = widget.initialMonth ?? _today;
    _month = DateTime(base.year, base.month);
  }

  void _go(int delta) {
    setState(() => _month = DateTime(_month.year, _month.month + delta));
    widget.onMonthChanged?.call(_month);
  }

  static const _weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return ListenableBuilder(
      listenable: widget.store,
      builder: (context, _) {
        final today = _today;
        final thisMonth = DateTime(today.year, today.month);
        final canNext = _month.isBefore(thisMonth);
        final calc = widget.store.calc;
        final prayed = calc.daysWithPrayer(_month.year, _month.month);
        final completed = calc.completedInMonth(_month.year, _month.month);
        final daysInMonth = DateTime(_month.year, _month.month + 1, 0).day;
        final offset = DateTime(_month.year, _month.month).weekday % 7;
        final rows = ((offset + daysInMonth) / 7).ceil();
        final title = '${_month.year}년 ${_month.month}월';

        Widget cell(int slot) {
          final day = slot - offset + 1;
          if (day < 1 || day > daysInMonth) {
            return const Expanded(child: SizedBox());
          }
          final did = prayed.contains(day);
          final isToday =
              _month.year == today.year &&
              _month.month == today.month &&
              day == today.day;
          return Expanded(
            child: Semantics(
              label:
                  '${_month.month}월 $day일${isToday ? ', 오늘' : ''}'
                  '${did ? ', 기도함' : ''}',
              excludeSemantics: true,
              child: SizedBox(
                height: 44,
                child: Center(
                  child: Container(
                    width: 38,
                    height: 38,
                    padding: isToday ? const EdgeInsets.all(3) : null,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: isToday
                          ? Border.all(color: scheme.primary, width: 2)
                          : null,
                    ),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: did ? scheme.primary : null,
                      ),
                      child: Center(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            '$day',
                            style: text.bodyMedium?.copyWith(
                              color: did ? scheme.onPrimary : scheme.onSurface,
                              fontWeight: did || isToday
                                  ? FontWeight.w700
                                  : null,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        }

        final grid = Column(
          key: ValueKey(_month),
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var r = 0; r < rows; r++)
              Row(children: [for (var c = 0; c < 7; c++) cell(r * 7 + c)]),
          ],
        );

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                IconButton(
                  tooltip: '이전 달',
                  onPressed: () => _go(-1),
                  icon: const Icon(Icons.chevron_left),
                ),
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Column(
                      children: [
                        Text(
                          title,
                          style: text.titleMedium,
                          textAlign: TextAlign.center,
                        ),
                        Text(
                          '이 달 완주 $completed회',
                          style: text.bodySmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
                IconButton(
                  tooltip: '다음 달',
                  onPressed: canNext ? () => _go(1) : null,
                  icon: const Icon(Icons.chevron_right),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ExcludeSemantics(
              child: Row(
                children: [
                  for (final l in _weekdayLabels)
                    Expanded(
                      child: Center(
                        child: Text(
                          l,
                          style: text.labelMedium?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            AnimatedSwitcher(
              duration: _motion(context, Durations.short4),
              switchInCurve: Easing.emphasizedDecelerate,
              switchOutCurve: Easing.emphasizedAccelerate,
              child: grid,
            ),
          ],
        );
      },
    );
  }
}

/// 신비별 비율 막대(환희/빛/고통/영광)와 범례.
class MysteryDistributionBar extends StatelessWidget {
  const MysteryDistributionBar({
    super.key,
    required this.counts,
    this.unit = '단',
  });

  /// 신비별 값(없는 신비는 0으로 본다).
  final Map<MysterySet, int> counts;
  final String unit;

  static Color colorOf(ColorScheme scheme, MysterySet set) => switch (set) {
    MysterySet.joyful => scheme.primary,
    MysterySet.luminous => scheme.tertiary,
    MysterySet.sorrowful => scheme.error,
    MysterySet.glorious => scheme.secondary,
  };

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    int countOf(MysterySet s) => counts[s] ?? 0;
    final total = MysterySet.values.fold<int>(0, (a, s) => a + countOf(s));
    final shown = [
      for (final s in MysterySet.values)
        if (countOf(s) > 0) s,
    ];

    final summary = total == 0
        ? '신비별 비율. 기록 없음'
        : '신비별 비율. ${[for (final s in MysterySet.values) '${s.koreanName} ${countOf(s)}$unit'].join(', ')}';

    return Semantics(
      container: true,
      label: summary,
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ClipRRect(
              borderRadius: AppShape.small,
              child: SizedBox(
                height: 16,
                child: total == 0
                    ? ColoredBox(color: scheme.surfaceContainerHighest)
                    : Row(
                        children: [
                          for (var i = 0; i < shown.length; i++) ...[
                            if (i > 0) const SizedBox(width: 2),
                            Expanded(
                              flex: countOf(shown[i]),
                              child: ColoredBox(
                                color: colorOf(scheme, shown[i]),
                              ),
                            ),
                          ],
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final s in MysterySet.values)
                  Chip(
                    visualDensity: VisualDensity.compact,
                    avatar: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: colorOf(scheme, s),
                        shape: BoxShape.circle,
                      ),
                    ),
                    label: Text(
                      '${s.koreanName.replaceAll('의 신비', '')} ${countOf(s)}$unit',
                      style: text.labelLarge,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
