import 'package:flutter/material.dart';

import '../app/track.dart';
import '../app/window_class.dart';
import '../domain/prayer_data.dart';
import 'prayer_stats_store.dart';
import 'stats_format.dart';
import 'stats_widgets.dart';

enum _StatsRange { month, year, all }

/// 기도 기록(통계) 화면: 이번 달 / 올해 / 전체.
///
/// 하단 '기록' 탭에 넣을 때는 [embedded]를 켠다(뒤로 가기 버튼 없음). 라우트로 열 때는
/// 기본값 그대로 쓰면 앱바에 뒤로 가기가 생긴다.
class StatsScreen extends StatefulWidget {
  const StatsScreen({
    super.key,
    required this.store,
    this.now,
    this.embedded = false,
  });

  final PrayerStatsStore store;

  /// 탭 안에 들어 있는지.
  final bool embedded;

  /// 테스트용 시계 주입.
  final DateTime Function()? now;

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends State<StatsScreen> {
  static const double _maxWidth = 720;
  static const double _maxWideWidth = 1120;

  _StatsRange _range = _StatsRange.month;

  DateTime get _now => (widget.now ?? DateTime.now)();

  @override
  void initState() {
    super.initState();
    Track.event('stats_open', {'range': _range.name});
  }

  Future<void> _confirmClear() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(Icons.delete_outline),
        title: const Text('기도 기록을 모두 지울까요?'),
        content: const Text('지운 기록은 되돌릴 수 없어요.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('지우기'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await widget.store.clear();
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('기도 기록을 지웠어요.')));
  }

  @override
  Widget build(BuildContext context) {
    final wide = windowClassOf(context) == WindowClass.expanded;
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar.large(
            title: const Text('기도 기록'),
            automaticallyImplyLeading: !widget.embedded,
          ),
          ListenableBuilder(
            listenable: widget.store,
            builder: (context, _) {
              return SliverToBoxAdapter(
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxWidth: wide ? _maxWideWidth : _maxWidth,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                      child: widget.store.records.isEmpty
                          ? const _EmptyState()
                          : _buildContent(context, wide),
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, bool wide) {
    final now = _now;
    final calc = widget.store.calc;

    final (DateTime?, DateTime?) range = switch (_range) {
      _StatsRange.month => PrayerStatsCalc.monthRange(now.year, now.month),
      _StatsRange.year => PrayerStatsCalc.yearRange(now.year),
      _StatsRange.all => (null, null),
    };
    final (from, to) = range;
    final rangeName = switch (_range) {
      _StatsRange.month => '이번 달',
      _StatsRange.year => '올해',
      _StatsRange.all => '전체',
    };

    final selector = SegmentedButton<_StatsRange>(
      showSelectedIcon: false,
      segments: const [
        ButtonSegment(value: _StatsRange.month, label: Text('이번 달')),
        ButtonSegment(value: _StatsRange.year, label: Text('올해')),
        ButtonSegment(value: _StatsRange.all, label: Text('전체')),
      ],
      selected: {_range},
      onSelectionChanged: (s) {
        setState(() => _range = s.first);
        Track.event('stats_open', {'range': s.first.name});
      },
    );

    final metrics = _MetricGrid(
      semanticsPrefix: rangeName,
      tiles: [
        _Metric(
          icon: Icons.verified_outlined,
          label: '묵주기도 완주',
          value: '${calc.completedCount(from: from, to: to)}회',
        ),
        _Metric(
          icon: Icons.filter_5_outlined,
          label: '기도한 단',
          value: '${calc.decades(from: from, to: to)}개',
        ),
        _Metric(
          icon: Icons.favorite_border,
          label: '성모송',
          value: '${calc.hailMarys(from: from, to: to)}번',
        ),
        _Metric(
          icon: Icons.schedule,
          label: '기도 시간',
          value: formatDurationKo(calc.seconds(from: from, to: to)),
        ),
      ],
    );

    final streakCard = _StreakCard(
      current: calc.currentStreak(now),
      longest: calc.longestStreak(),
    );

    final left = <Widget>[
      selector,
      metrics,
      streakCard,
      if (_range != _StatsRange.all)
        _SectionCard(
          title: '기도한 날',
          child: MonthCalendar(store: widget.store, now: widget.now),
        ),
    ];

    final recent = calc.recent(20);
    final right = <Widget>[
      if (_range == _StatsRange.year)
        _SectionCard(
          title: '${now.year}년 월별 완주',
          child: MonthBarChart(
            values: calc.completedPerMonth(now.year),
            highlightMonth: now.month,
          ),
        ),
      _SectionCard(
        title: '$rangeName 신비별 기도',
        child: MysteryDistributionBar(
          counts: calc.decadesBySet(from: from, to: to),
        ),
      ),
      _SectionCard(
        title: '최근 기록',
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          children: [for (final r in recent) _RecordTile(record: r)],
        ),
      ),
    ];

    final clear = Center(
      child: TextButton.icon(
        onPressed: _confirmClear,
        icon: const Icon(Icons.delete_outline),
        label: const Text('전체 기록 지우기'),
        style: TextButton.styleFrom(
          foregroundColor: Theme.of(context).colorScheme.error,
          minimumSize: const Size(48, 48),
        ),
      ),
    );

    Widget stack(List<Widget> items) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < items.length; i++) ...[
          if (i > 0) const SizedBox(height: 16),
          items[i],
        ],
      ],
    );

    if (wide) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: stack(left)),
              const SizedBox(width: 24),
              Expanded(child: stack(right)),
            ],
          ),
          const SizedBox(height: 16),
          clear,
        ],
      );
    }
    return stack([...left, ...right, clear]);
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Semantics(
        container: true,
        label: '아직 기록이 없어요. 묵주기도를 바치면 여기에 기록이 쌓여요.',
        excludeSemantics: true,
        child: Column(
          children: [
            SizedBox(
              width: 176,
              height: 144,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      color: scheme.primaryContainer,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.auto_stories_rounded,
                      size: 56,
                      color: scheme.onPrimaryContainer,
                    ),
                  ),
                  Positioned(
                    top: 4,
                    right: 8,
                    child: _Bubble(
                      icon: Icons.favorite_rounded,
                      background: scheme.tertiaryContainer,
                      foreground: scheme.onTertiaryContainer,
                    ),
                  ),
                  Positioned(
                    bottom: 4,
                    left: 8,
                    child: _Bubble(
                      icon: Icons.calendar_month_rounded,
                      background: scheme.secondaryContainer,
                      foreground: scheme.onSecondaryContainer,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text('아직 기록이 없어요', style: text.titleLarge),
            const SizedBox(height: 8),
            Text(
              '묵주기도를 바치면 이번 달, 올해, 전체\n기도 횟수가 여기에 쌓여요.',
              style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({
    required this.icon,
    required this.background,
    required this.foreground,
  });

  final IconData icon;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(color: background, shape: BoxShape.circle),
      child: Icon(icon, size: 24, color: foreground),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.child,
    this.padding = const EdgeInsets.all(16),
  });

  final String title;
  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Card.outlined(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: padding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding:
                  padding is EdgeInsets &&
                      (padding as EdgeInsets).horizontal == 0
                  ? const EdgeInsets.symmetric(horizontal: 16)
                  : EdgeInsets.zero,
              child: Semantics(
                header: true,
                child: Text(title, style: text.titleMedium),
              ),
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _Metric {
  const _Metric({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;
}

class _MetricGrid extends StatelessWidget {
  const _MetricGrid({required this.tiles, required this.semanticsPrefix});

  final List<_Metric> tiles;
  final String semanticsPrefix;

  @override
  Widget build(BuildContext context) {
    Widget row(_Metric a, _Metric b) => IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: _MetricTile(metric: a, prefix: semanticsPrefix),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _MetricTile(metric: b, prefix: semanticsPrefix),
          ),
        ],
      ),
    );
    return Column(
      children: [
        row(tiles[0], tiles[1]),
        const SizedBox(height: 12),
        row(tiles[2], tiles[3]),
      ],
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.metric, required this.prefix});

  final _Metric metric;
  final String prefix;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Semantics(
      container: true,
      label: '$prefix ${metric.label} ${metric.value}',
      excludeSemantics: true,
      child: Card.filled(
        color: scheme.surfaceContainerHigh,
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(metric.icon, size: 24, color: scheme.primary),
              const SizedBox(height: 12),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  metric.value,
                  maxLines: 1,
                  style: text.headlineSmall?.copyWith(color: scheme.onSurface),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                metric.label,
                style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StreakCard extends StatelessWidget {
  const _StreakCard({required this.current, required this.longest});

  final int current;
  final int longest;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    Widget cell(String label, int days) => Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: text.labelMedium?.copyWith(color: scheme.onPrimaryContainer),
          ),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              '$days일',
              maxLines: 1,
              style: text.headlineSmall?.copyWith(
                color: scheme.onPrimaryContainer,
              ),
            ),
          ),
        ],
      ),
    );
    return Semantics(
      container: true,
      label: '현재 연속 $current일, 최장 $longest일',
      excludeSemantics: true,
      child: Card.filled(
        color: scheme.primaryContainer,
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(
                Icons.local_fire_department_rounded,
                size: 32,
                color: scheme.onPrimaryContainer,
              ),
              const SizedBox(width: 16),
              cell('현재 연속', current),
              cell('최장', longest),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecordTile extends StatelessWidget {
  const _RecordTile({required this.record});

  final PrayerRecord record;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final r = record;
    final progress = r.completed
        ? '완주'
        : r.decades >= 1
        ? '${r.decades}단까지'
        : '성모송 ${r.hailMarys}번';
    final parts = <String>[
      progress,
      if (r.seconds > 0) formatDurationKo(r.seconds),
      if (r.source == PrayerRecord.sourceChurch) '성당',
    ];
    return ListTile(
      minTileHeight: 56,
      leading: Icon(
        r.completed ? Icons.check_circle : Icons.timelapse,
        color: r.completed ? scheme.primary : scheme.onSurfaceVariant,
      ),
      title: Text('${formatDateKo(r.at)} · ${r.set.koreanName}'),
      subtitle: Text(parts.join(' · ')),
    );
  }
}
