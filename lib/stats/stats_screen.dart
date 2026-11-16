import 'package:flutter/material.dart';

import '../app/settings.dart';
import '../app/track.dart';
import '../app/window_class.dart';
import '../domain/prayer_data.dart';
import 'goal_sheet.dart';
import 'logical_day.dart';
import 'prayer_goal.dart';
import 'prayer_stats_store.dart';
import 'share/image_share.dart';
import 'share/share_card.dart';
import 'share/share_sheet.dart';
import 'stats_data.dart';
import 'stats_format.dart';
import 'stats_logic.dart';
import 'stats_sections.dart';
import 'stats_widgets.dart';

/// 기도 기록(통계) 화면. 위에서부터 기도의 발자취(연속·히트맵) → 기간별 기도(막대) →
/// 신비별 기도(도넛) → 돌아보기(주·달·해) 카드, 그 아래 달력·최근 기록. 구역마다 카드로 나누기 단추가 있다.
///
/// 하단 '기록' 탭에 넣을 때는 [embedded]를 켠다(뒤로 가기 버튼 없음). 라우트로 열 때는
/// 기본값 그대로 쓰면 앱바에 뒤로 가기가 생긴다.
class StatsScreen extends StatefulWidget {
  const StatsScreen({
    super.key,
    required this.store,
    this.now,
    this.embedded = false,
    this.dayStartHour = defaultDayStartHour,
    this.goal = PrayerGoal.off,
    this.goalPrompted = true,
    this.onGoalChanged,
    this.onGoalPrompted,
    this.shareChannel,
  });

  final PrayerStatsStore store;

  /// 탭 안에 들어 있는지.
  final bool embedded;

  /// 테스트용 시계 주입.
  final DateTime Function()? now;

  /// 하루의 시작 시각(이 시각 전의 기도는 전날로 센다).
  final int dayStartHour;

  /// 오늘의 기도 목표(없으면 [PrayerGoal.off]).
  final PrayerGoal goal;

  /// 목표 안내를 이미 보여 줬는지. false 이면 처음 열 때 한 번만 시트를 띄운다.
  final bool goalPrompted;

  /// 목표를 바꿨을 때(끄기 포함).
  final ValueChanged<PrayerGoal>? onGoalChanged;

  /// 목표 안내를 보여 줬을 때(다시 띄우지 않도록 저장).
  final VoidCallback? onGoalPrompted;

  /// 공유 경로(테스트에서 가짜로 교체).
  final ImageShareChannel? shareChannel;

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

/// 설정([AppSettings])과 연결된 통계 화면: 하루 시작 시각·목표가 바뀌면 다시 그린다.
class SettingsStatsScreen extends StatelessWidget {
  const SettingsStatsScreen({
    super.key,
    required this.store,
    required this.settings,
    this.embedded = false,
  });

  final PrayerStatsStore store;
  final AppSettings settings;
  final bool embedded;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: settings,
      builder: (context, _) => StatsScreen(
        store: store,
        embedded: embedded,
        dayStartHour: settings.dayStartHour,
        goal: settings.prayerGoal,
        goalPrompted: settings.goalPrompted,
        onGoalChanged: (g) => settings.prayerGoal = g,
        onGoalPrompted: settings.markGoalPrompted,
      ),
    );
  }
}

class _StatsScreenState extends State<StatsScreen> {
  static const double _maxWidth = 720;
  static const double _maxWideWidth = 1120;

  StatsRange? _range;
  late PrayerGoal _goal = widget.goal;

  DateTime get _now => (widget.now ?? DateTime.now)();

  @override
  void initState() {
    super.initState();
    Track.event('stats_open', {'range': 'month'});
    if (!widget.goalPrompted && widget.onGoalChanged != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        if (!mounted) return;
        widget.onGoalPrompted?.call(); // 건너뛰어도 다시 묻지 않는다
        await _openGoal(onboarding: true);
      });
    }
  }

  @override
  void didUpdateWidget(StatsScreen old) {
    super.didUpdateWidget(old);
    if (old.goal != widget.goal) _goal = widget.goal;
  }

  Future<void> _openGoal({bool onboarding = false}) async {
    final r = await showGoalSheet(context, current: _goal, onboarding: onboarding);
    if (r == null || !mounted) return;
    setState(() => _goal = r);
    widget.onGoalChanged?.call(r);
  }

  void _share(ShareCardContent content, String name) {
    showShareSheet(
      context,
      content: content,
      fileName: name,
      channel: widget.shareChannel,
    );
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
              // 스크롤 중에 차트·카드 전체를 매 프레임 다시 그리지 않게 경계를 둔다.
              return SliverToBoxAdapter(
                child: RepaintBoundary(
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
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, bool wide) {
    final data = StatsData(
      records: widget.store.records,
      now: _now,
      startHour: widget.dayStartHour,
      goal: _goal,
    );
    final range =
        _range ?? presetRange(StatsPreset.l30, data.today)!;

    final heat = StreakHeatmapSection(
      data: data,
      onGoal: _openGoal,
      onShare: () => _share(ShareContents.streak(data), 'rosarium_trail'),
    );
    final period = PeriodSection(
      data: data,
      range: range,
      onRange: (r) {
        setState(() => _range = r);
        Track.event('stats_open', {
          'range': switch (presetOf(r, data.today, earliest: data.earliest)) {
            StatsPreset.l7 => 'week',
            StatsPreset.thisYear => 'year',
            StatsPreset.all => 'all',
            StatsPreset.custom => 'custom',
            _ => 'month',
          },
        });
      },
      onShare: () => _share(ShareContents.period(data, range), 'rosarium_period'),
    );
    final donut = DonutSection(
      data: data,
      range: range,
      onShare: (slices, kinds) => _share(
        ShareContents.donut(data, range, slices, kinds: kinds),
        'rosarium_mystery',
      ),
    );
    final recap = RecapSection(
      data: data,
      onShare: (r) => _share(ShareContents.recap(r), 'rosarium_${r.kind.name}'),
    );
    final calendar = StatsSectionCard(
      title: '기도한 날',
      child: MonthCalendar(
        store: widget.store,
        now: widget.now,
        startHour: widget.dayStartHour,
      ),
    );
    final recent = StatsSectionCard(
      title: '최근 기록',
      child: Column(
        children: [
          for (final r in widget.store.calc.recent(20))
            _RecordTile(record: r),
        ],
      ),
    );
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
              Expanded(child: stack([heat, period, calendar])),
              const SizedBox(width: 24),
              Expanded(child: stack([donut, recap, recent])),
            ],
          ),
          const SizedBox(height: 16),
          clear,
        ],
      );
    }
    return stack([heat, period, donut, recap, calendar, recent, clear]);
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

class _RecordTile extends StatelessWidget {
  const _RecordTile({required this.record});

  final PrayerRecord record;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final r = record;
    final progress = r.completed
        ? '끝까지 바침'
        : r.decades >= 1
        ? '${r.decades}단까지'
        : '성모송 ${r.hailMarys}번';
    final parts = <String>[
      progress,
      if (r.seconds > 0) formatDurationKo(r.seconds),
      if (r.source == PrayerRecord.sourceChurch) '성당',
    ];
    return ListTile(
      leading: Icon(
        r.completed ? Icons.check_circle : Icons.timelapse,
        color: r.completed ? scheme.primary : scheme.onSurfaceVariant,
      ),
      title: Text('${formatDateKo(r.at)} · ${r.set.koreanName}'),
      subtitle: Text(parts.join(' · ')),
    );
  }
}
