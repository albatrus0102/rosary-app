import 'logical_day.dart';
import 'prayer_goal.dart';
import 'prayer_record.dart';
import 'share/share_card.dart';
import 'stats_format.dart';
import 'stats_logic.dart';

/// 통계 화면 한 번의 계산 재료(기록 + 하루 시작 시각 + 목표 + 지금).
class StatsData {
  StatsData({
    required this.records,
    required this.now,
    this.startHour = defaultDayStartHour,
    this.goal = PrayerGoal.off,
  }) : today = dayKey(now, startHour: startHour),
       days = dayAggregates(records, startHour: startHour) {
    String? e;
    for (final k in days.keys) {
      if (e == null || k.compareTo(e) < 0) e = k;
    }
    earliest = e;
  }

  final List<PrayerRecord> records;
  final DateTime now;
  final int startHour;
  final PrayerGoal goal;

  /// 지금의 논리 날짜 키.
  final String today;

  /// 날짜별 합계(진행이 있는 기록만).
  final Map<String, DayAgg> days;

  /// 가장 이른 기도한 날(없으면 null).
  late final String? earliest;

  /// 연속·'이어 온 날'에 쓰는 날 집합(목표가 있으면 목표만큼 바친 날).
  late final Set<String> streakSet = streakDays(days, goal);

  HeatmapGrid get grid => heatmapGrid(today);

  /// 최근 1년 안에서 가장 길게 이어 온 구간(2일 이상일 때만).
  StreakSpan? get yearSpan {
    final g = grid;
    final s = bestSpanIn(
      streakSet,
      (k) => k.compareTo(g.startKey) >= 0 && k.compareTo(g.endKey) <= 0,
    );
    return s != null && s.n >= 2 ? s : null;
  }

  int get current => currentStreak(streakSet, today);

  /// 최근 1년 안에서 기도한 날 수.
  int get prayedDaysInYear {
    final g = grid;
    return days.keys
        .where((k) => k.compareTo(g.startKey) >= 0 && k.compareTo(g.endKey) <= 0)
        .length;
  }
}

String _unitDays(int n) => '$n일';

/// 이미지 카드에 담을 글. 말투는 담백하게 — 순위·점수·'최장' 같은 말은 쓰지 않는다.
abstract final class ShareContents {
  static ShareCardContent streak(StatsData d) {
    final g = d.grid;
    final total = d.days.entries
        .where((e) => e.key.compareTo(g.startKey) >= 0 && e.key.compareTo(g.endKey) <= 0)
        .fold<int>(0, (a, e) => a + e.value.decades);
    final span = d.yearSpan;
    return ShareCardContent(
      eyebrow: '기도의 발자취',
      period: '지난 1년 · ${rangeLabel(StatsRange(g.startKey, g.endKey), d.today)}',
      bigNumber: '${d.prayedDaysInYear}',
      bigUnit: '일 기도했어요',
      caption: d.current >= 2
          ? '${d.current}일째 이어서 기도하고 있어요'
          : null,
      rows: [
        ('지금 이어 온 날', _unitDays(d.current)),
        if (span != null) ('길게 이어 온 날', _unitDays(span.n)),
        ('바친 단', '$total단'),
        if (!d.goal.isOff)
          (
            '목표만큼 바친 날',
            _unitDays(
              d.days.entries
                  .where((e) =>
                      e.key.compareTo(g.startKey) >= 0 &&
                      d.goal.isMet(decades: e.value.decades, seconds: e.value.seconds))
                  .length,
            ),
          ),
      ],
      visual: HeatVisual(
        grid: g,
        days: d.days,
        goal: d.goal,
        today: d.today,
        streak: span,
      ),
    );
  }

  static ShareCardContent period(StatsData d, StatsRange r) {
    final t = periodCore(d.days, r.contains, goal: d.goal);
    final buckets = periodBuckets(d.days, r);
    return ShareCardContent(
      eyebrow: '기도의 기록',
      period: rangeLabel(r, d.today),
      bigNumber: '${t.decades}',
      bigUnit: '단을 바쳤어요',
      rows: [
        ('기도한 날', _unitDays(t.days)),
        ('끝까지 바친 묵주기도', '${t.rosaries}번'),
        ('기도 시간', formatDurationKo(t.seconds)),
        if (!d.goal.isOff)
          ('목표만큼 바친 날', _unitDays(t.goalDays))
        else
          ('성모송', '${t.hailMarys}번'),
      ],
      visual: BarsVisual(
        values: [for (final b in buckets) b.decades],
        labels: [for (final b in buckets) b.label],
      ),
    );
  }

  static ShareCardContent donut(
    StatsData d,
    StatsRange r,
    List<DonutSlice> slices, {
    required bool kinds,
  }) {
    final total = slices.fold<int>(0, (a, s) => a + s.n);
    final even = !kinds && slices.every((s) => s.n > 0);
    return ShareCardContent(
      eyebrow: kinds ? '기도의 종류' : '신비별 기도',
      period: rangeLabel(r, d.today),
      bigNumber: '$total',
      bigUnit: kinds ? '번 기도했어요' : '단을 바쳤어요',
      caption: even ? '네 가지 신비를 고루 묵상했어요' : null,
      visual: DonutVisual(slices),
    );
  }

  static ShareCardContent recap(RecapData r) {
    final t = r.totals;
    final eyebrow = switch (r.kind) {
      RecapKind.week => '${r.title}의 기도',
      RecapKind.month => '${r.title}의 기도',
      RecapKind.year => '${r.title}의 기도',
    };
    final caption = r.kind == RecapKind.year
        ? '한 해 동안 바친 기도를 돌아봐요'
        : r.bestSpan != null
        ? '${r.bestSpan!.n}일을 이어서 기도했어요'
        : null;
    return ShareCardContent(
      eyebrow: eyebrow,
      period: r.periodLabel,
      bigNumber: '${t.days}',
      bigUnit: '일 기도했어요',
      caption: caption,
      rows: [
        ('바친 단', '${t.decades}단'),
        ('끝까지 바친 묵주기도', '${t.rosaries}번'),
        ('기도 시간', formatDurationKo(t.seconds)),
        if (!r.goal.isOff)
          ('목표만큼 바친 날', _unitDays(t.goalDays))
        else if (r.topSet != null)
          ('자주 바친 신비', mysteryShortName[r.topSet]!),
      ],
      visual: BarsVisual(
        values: [for (final b in r.bars) b.decades],
        labels: [for (final b in r.bars) b.label],
      ),
    );
  }
}
