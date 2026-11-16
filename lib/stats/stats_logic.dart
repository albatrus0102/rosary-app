/// 통계 화면의 순수 계산(위젯 없음). 독서공방 통계 로직의 이식:
///
/// | 여기 | 독서공방 |
/// |---|---|
/// | [dayAggregates] · [heatmapGrid] · [heatLevel] | `heatmapHTML` (날짜별 집계 맵 → 격자·농도) |
/// | [bestSpanIn] · [currentStreak] | `statsStreakInfo` / `streakBestSpanIn` |
/// | [presetRange] · [shiftRange] · [rangeLabelParts] | `statsRangePreset` / `statsRangeShift` / `statsRangeLabel` |
/// | [periodCore] | `statsPeriodCore(inP)` — 기간 판정 함수 하나로 합계를 낸다 |
/// | [mysteryShares] · [kindShares] | `sgDonutBlock` 의 행 계산(백분율 합이 100) |
/// | [buildRecap] | `weekMonCard` / `monthRecapShare` / `recapCard` 의 재료 |
///
/// 모든 날짜는 [dayKey] 논리 날짜 키('YYYY-MM-DD')다.
library;

import '../domain/prayer_data.dart';
import 'logical_day.dart';
import 'prayer_goal.dart';
import 'prayer_record.dart';

// ---------------------------------------------------------------- 날짜별 집계

/// 하루(논리 날짜)의 합계.
class DayAgg {
  int decades = 0;
  int hailMarys = 0;
  int seconds = 0;

  /// 끝까지 바친 묵주기도 수.
  int rosaries = 0;
  int sessions = 0;
}

/// 진행이 있는 기록만 날짜별로 모은다(진행 없는 기록은 통계에서 무시된다).
Map<String, DayAgg> dayAggregates(
  Iterable<PrayerRecord> records, {
  int startHour = defaultDayStartHour,
}) {
  final out = <String, DayAgg>{};
  for (final r in records) {
    if (!r.hasProgress) continue;
    final a = out.putIfAbsent(dayKey(r.at, startHour: startHour), DayAgg.new);
    a.decades += r.decades;
    a.hailMarys += r.hailMarys;
    a.seconds += r.seconds;
    if (r.completed) a.rosaries++;
    a.sessions++;
  }
  return out;
}

/// 목표 계산에 쓰는 날: 목표가 없으면 기도한 날, 있으면 '목표만큼 바친 날'
/// (`goalMetDaySet`). 연속과 통계 '이어 온 날'이 이 집합을 쓴다.
Set<String> streakDays(Map<String, DayAgg> days, PrayerGoal goal) {
  if (goal.isOff) return days.keys.toSet();
  return {
    for (final e in days.entries)
      if (goal.isMet(decades: e.value.decades, seconds: e.value.seconds)) e.key,
  };
}

// ---------------------------------------------------------------- 연속

/// 이어 온 날 구간.
class StreakSpan {
  const StreakSpan(this.s, this.e, this.n);
  final String s;
  final String e;
  final int n;
}

/// [inP]를 만족하는 날만 보고, 가장 길게 이어 온 구간(같으면 더 최근 것).
/// 하루뿐이어도 돌려주며, 화면은 2일 이상일 때만 보인다(`sp.n>=2`).
StreakSpan? bestSpanIn(Set<String> days, bool Function(String) inP) {
  final keys = days.where(inP).toList()..sort();
  StreakSpan? best;
  String? runStart;
  String? prev;
  var run = 0;
  for (final k in keys) {
    if (prev != null && shiftDayKey(prev, 1) == k) {
      run++;
    } else {
      runStart = k;
      run = 1;
    }
    if (best == null || run >= best.n) best = StreakSpan(runStart!, k, run);
    prev = k;
  }
  return best;
}

/// 지금 이어 오는 날 수. 오늘 아직 기도 전이어도 어제까지 이어졌다면 그대로 센다.
int currentStreak(Set<String> days, String today) {
  var k = today;
  if (!days.contains(k)) {
    k = shiftDayKey(today, -1);
    if (!days.contains(k)) return 0;
  }
  var n = 0;
  while (days.contains(k)) {
    n++;
    k = shiftDayKey(k, -1);
  }
  return n;
}

// ---------------------------------------------------------------- 히트맵

/// 일요일에 시작하는 주 단위 격자. 맨 앞·끝 주의 범위 밖 칸은 null.
class HeatmapGrid {
  const HeatmapGrid(this.startKey, this.endKey, this.weeks);
  final String startKey;
  final String endKey;
  final List<List<String?>> weeks;
}

int _sundayOffset(DateTime d) => d.weekday % 7; // 일=0 … 토=6

/// [today]에서 거슬러 365일(52주+). 열은 일요일 시작.
HeatmapGrid heatmapGrid(String today, {int days = 365}) {
  final end = parseDayKey(today);
  final first = DateTime(end.year, end.month, end.day - (days - 1));
  final gridStart = DateTime(
    first.year,
    first.month,
    first.day - _sundayOffset(first),
  );
  final startKey = ymdKey(first);
  final weeks = <List<String?>>[];
  var d = gridStart;
  while (!d.isAfter(end)) {
    final w = <String?>[];
    for (var i = 0; i < 7; i++) {
      final cur = DateTime(d.year, d.month, d.day + i);
      w.add(cur.isBefore(first) || cur.isAfter(end) ? null : ymdKey(cur));
    }
    weeks.add(w);
    d = DateTime(d.year, d.month, d.day + 7);
  }
  return HeatmapGrid(startKey, today, weeks);
}

/// 칸의 농도 0~4. 단 수와 분 중 센 쪽을 따른다. 목표가 있으면 채운 날은 3 이상으로 진하게,
/// 채우지 않은 날은 2를 넘지 않게 그린다(못 채웠다는 뜻이 아니라 '목표만큼 바친 날'을 돋보이게 할 뿐이다).
int heatLevel(DayAgg? a, PrayerGoal goal) {
  if (a == null || (a.decades <= 0 && a.seconds <= 0 && a.hailMarys <= 0)) {
    return 0;
  }
  final m = a.seconds ~/ 60;
  final lvMin = m <= 0 ? 0 : m < 10 ? 1 : m < 20 ? 2 : m < 40 ? 3 : 4;
  final d = a.decades;
  final lvDec = d <= 0 ? 0 : d == 1 ? 1 : d == 2 ? 2 : d <= 4 ? 3 : 4;
  var lv = lvMin > lvDec ? lvMin : lvDec;
  if (lv == 0) lv = 1; // 성모송만 바친 날도 칠한다
  if (goal.isOff) return lv;
  if (goal.isMet(decades: a.decades, seconds: a.seconds)) return lv < 3 ? 3 : lv;
  return lv > 2 ? 2 : lv;
}

// ---------------------------------------------------------------- 기간

enum StatsPreset { l7, l30, l90, thisMonth, thisYear, all, custom }

/// 닫힌 구간 [s, e] (논리 날짜 키).
class StatsRange {
  const StatsRange(this.s, this.e);
  final String s;
  final String e;

  int get days => dayGap(s, e) + 1;
  bool contains(String k) => k.compareTo(s) >= 0 && k.compareTo(e) <= 0;

  @override
  bool operator ==(Object other) =>
      other is StatsRange && other.s == s && other.e == e;

  @override
  int get hashCode => Object.hash(s, e);

  @override
  String toString() => 'StatsRange($s~$e)';
}

/// 프리셋의 기간. [earliest]는 가장 이른 기도한 날(전체 보기의 시작).
StatsRange? presetRange(StatsPreset p, String today, {String? earliest}) {
  final t = parseDayKey(today);
  switch (p) {
    case StatsPreset.l7:
      return StatsRange(shiftDayKey(today, -6), today);
    case StatsPreset.l30:
      return StatsRange(shiftDayKey(today, -29), today);
    case StatsPreset.l90:
      return StatsRange(shiftDayKey(today, -89), today);
    case StatsPreset.thisMonth:
      return StatsRange(ymdKey(DateTime(t.year, t.month)), today);
    case StatsPreset.thisYear:
      return StatsRange(ymdKey(DateTime(t.year)), today);
    case StatsPreset.all:
      return StatsRange(earliest ?? today, today);
    case StatsPreset.custom:
      return null;
  }
}

StatsPreset presetOf(StatsRange r, String today, {String? earliest}) {
  for (final p in const [
    StatsPreset.l7,
    StatsPreset.l30,
    StatsPreset.l90,
    StatsPreset.thisMonth,
    StatsPreset.thisYear,
    StatsPreset.all,
  ]) {
    if (presetRange(p, today, earliest: earliest) == r) return p;
  }
  return StatsPreset.custom;
}

/// ‹ › : 같은 길이만큼(정확히 달 단위 1일~말일이면 달 단위로) 옮긴다. 끝이 오늘을 넘으면
/// 오늘에서 자르고, 시작이 첫 기록 전이면 ‹ 는 멈춘다. 못 가면 null.
StatsRange? shiftRange(
  StatsRange r,
  int dir,
  String today, {
  String? earliest,
}) {
  final s = parseDayKey(r.s), e = parseDayKey(r.e);
  if (dir < 0) {
    if (earliest == null || r.s.compareTo(earliest) <= 0) return null;
  } else if (r.e.compareTo(today) >= 0) {
    return null;
  }
  String ns, ne;
  final lastOfE = DateTime(e.year, e.month + 1, 0).day;
  if (s.day == 1 && e.day == lastOfE) {
    final mn = (e.year * 12 + e.month) - (s.year * 12 + s.month) + 1;
    final a = DateTime(s.year, s.month + dir * mn);
    final b = DateTime(a.year, a.month + mn, 0);
    ns = ymdKey(a);
    ne = ymdKey(b);
  } else {
    final n = r.days;
    ns = shiftDayKey(r.s, dir * n);
    ne = shiftDayKey(r.e, dir * n);
  }
  if (ns.compareTo(today) > 0) return null;
  if (ne.compareTo(today) > 0) ne = today;
  return StatsRange(ns, ne);
}

/// 기간 머리글자 [시작, ' ~ ', 끝]. 시작·끝은 각각 한 덩어리라 날짜 가운데서 꺾이지 않는다.
/// 올해가 아닌 해가 끼면 연도까지. [compact]면 '10/3' 꼴.
List<String> rangeLabelParts(StatsRange r, String today, {bool compact = false}) {
  final s = parseDayKey(r.s), e = parseDayKey(r.e), t = parseDayKey(today);
  final otherYear = s.year != t.year || e.year != t.year;
  String f(DateTime d) {
    if (otherYear) {
      return compact
          ? '${d.year % 100}.${d.month}.${d.day}'
          : '${d.year}년 ${d.month}월 ${d.day}일';
    }
    return compact ? '${d.month}/${d.day}' : '${d.month}월 ${d.day}일';
  }

  return [f(s), compact ? '~' : ' ~ ', f(e)];
}

String rangeLabel(StatsRange r, String today, {bool compact = false}) =>
    rangeLabelParts(r, today, compact: compact).join();

// ---------------------------------------------------------------- 기간 합계

class PeriodTotals {
  const PeriodTotals({
    this.rosaries = 0,
    this.decades = 0,
    this.hailMarys = 0,
    this.seconds = 0,
    this.days = 0,
    this.goalDays = 0,
  });

  /// 끝까지 바친 묵주기도.
  final int rosaries;
  final int decades;
  final int hailMarys;
  final int seconds;

  /// 기도한 날.
  final int days;

  /// 목표만큼 바친 날(목표가 없으면 0).
  final int goalDays;

  int get minutes => seconds ~/ 60;
}

/// 기간 판정 함수 하나([inP], 논리 날짜 키)로 합계를 낸다(`statsPeriodCore`).
/// 월·연·사용자 지정 기간 모두 같은 함수를 쓰므로 합이 서로 어긋나지 않는다.
PeriodTotals periodCore(
  Map<String, DayAgg> days,
  bool Function(String dayKey) inP, {
  PrayerGoal goal = PrayerGoal.off,
}) {
  var rosaries = 0, decades = 0, hail = 0, sec = 0, n = 0, met = 0;
  for (final e in days.entries) {
    if (!inP(e.key)) continue;
    final a = e.value;
    rosaries += a.rosaries;
    decades += a.decades;
    hail += a.hailMarys;
    sec += a.seconds;
    n++;
    if (goal.isMet(decades: a.decades, seconds: a.seconds)) met++;
  }
  return PeriodTotals(
    rosaries: rosaries,
    decades: decades,
    hailMarys: hail,
    seconds: sec,
    days: n,
    goalDays: met,
  );
}

// ---------------------------------------------------------------- 막대

enum BucketUnit { day, week, month }

/// 막대 하나(하루·한 주·한 달).
class BarBucket {
  const BarBucket({
    required this.startKey,
    required this.endKey,
    required this.label,
    required this.fullLabel,
    required this.decades,
    required this.seconds,
  });

  final String startKey;
  final String endKey;

  /// 축에 찍는 짧은 글자('3', '10/3', '11월').
  final String label;

  /// 선택했을 때 읽어 주는 글자('11월 3일').
  final String fullLabel;
  final int decades;
  final int seconds;

  int get minutes => seconds ~/ 60;
}

BucketUnit bucketUnitFor(StatsRange r) =>
    r.days <= 31 ? BucketUnit.day : r.days <= 120 ? BucketUnit.week : BucketUnit.month;

List<BarBucket> periodBuckets(
  Map<String, DayAgg> days,
  StatsRange r, {
  BucketUnit? unit,
}) {
  final u = unit ?? bucketUnitFor(r);
  final out = <BarBucket>[];
  (int, int) sum(String a, String b) {
    var d = 0, s = 0;
    for (final e in days.entries) {
      if (e.key.compareTo(a) >= 0 && e.key.compareTo(b) <= 0) {
        d += e.value.decades;
        s += e.value.seconds;
      }
    }
    return (d, s);
  }

  var cur = r.s;
  while (cur.compareTo(r.e) <= 0) {
    final d = parseDayKey(cur);
    String end;
    String label, full;
    switch (u) {
      case BucketUnit.day:
        end = cur;
        label = '${d.day}';
        full = '${d.month}월 ${d.day}일';
      case BucketUnit.week:
        end = shiftDayKey(cur, 6 - _sundayOffset(d));
        label = '${d.month}/${d.day}';
        final ed = parseDayKey(end.compareTo(r.e) > 0 ? r.e : end);
        full = '${d.month}월 ${d.day}일 ~ ${ed.month}월 ${ed.day}일';
      case BucketUnit.month:
        end = ymdKey(DateTime(d.year, d.month + 1, 0));
        label = '${d.month}월';
        full = '${d.year}년 ${d.month}월';
    }
    if (end.compareTo(r.e) > 0) end = r.e;
    final (dec, sec) = sum(cur, end);
    out.add(
      BarBucket(
        startKey: cur,
        endKey: end,
        label: label,
        fullLabel: full,
        decades: dec,
        seconds: sec,
      ),
    );
    cur = shiftDayKey(end, 1);
  }
  return out;
}

// ---------------------------------------------------------------- 도넛

class DonutSlice {
  const DonutSlice({
    required this.key,
    required this.label,
    required this.n,
    required this.pct,
    required this.unit,
  });

  final String key;
  final String label;
  final int n;

  /// 정수 백분율(전체 합이 정확히 100).
  final int pct;
  final String unit;
}

/// 가장 큰 나머지 방식으로 합이 100 이 되게 한다.
List<int> percentages(List<int> values) {
  final total = values.fold<int>(0, (a, b) => a + b);
  if (total <= 0) return List<int>.filled(values.length, 0);
  final base = [for (final v in values) v * 100 ~/ total];
  var left = 100 - base.fold<int>(0, (a, b) => a + b);
  final order = List<int>.generate(values.length, (i) => i)
    ..sort((a, b) {
      final ra = values[a] * 100 % total, rb = values[b] * 100 % total;
      return rb != ra ? rb.compareTo(ra) : a.compareTo(b);
    });
  for (final i in order) {
    if (left <= 0) break;
    if (values[i] > 0) {
      base[i]++;
      left--;
    }
  }
  return base;
}

const Map<MysterySet, String> mysteryShortName = {
  MysterySet.joyful: '환희의 신비',
  MysterySet.luminous: '빛의 신비',
  MysterySet.sorrowful: '고통의 신비',
  MysterySet.glorious: '영광의 신비',
};

const Map<String, String> kindName = {
  PrayerRecord.kindRosary: '묵주기도',
  PrayerRecord.kindStations: '십자가의 길',
  PrayerRecord.kindShort: '짧은 기도',
};

/// 신비별 바친 단(기간 안). 0단인 신비도 줄은 있고 [DonutSlice.n] 이 0 이다.
List<DonutSlice> mysteryShares(
  Iterable<PrayerRecord> records,
  bool Function(String dayKey) inP, {
  int startHour = defaultDayStartHour,
}) {
  final n = {for (final s in MysterySet.values) s: 0};
  for (final r in records) {
    if (!r.hasProgress || !inP(dayKey(r.at, startHour: startHour))) continue;
    n[r.set] = n[r.set]! + r.decades;
  }
  final pct = percentages([for (final s in MysterySet.values) n[s]!]);
  return [
    for (var i = 0; i < MysterySet.values.length; i++)
      DonutSlice(
        key: MysterySet.values[i].name,
        label: mysteryShortName[MysterySet.values[i]]!,
        n: n[MysterySet.values[i]]!,
        pct: pct[i],
        unit: '단',
      ),
  ];
}

/// 기도 종류별 기도 횟수(진행이 있는 기록 수).
List<DonutSlice> kindShares(
  Iterable<PrayerRecord> records,
  bool Function(String dayKey) inP, {
  int startHour = defaultDayStartHour,
}) {
  final n = {for (final k in PrayerRecord.kinds) k: 0};
  for (final r in records) {
    if (!r.hasProgress || !inP(dayKey(r.at, startHour: startHour))) continue;
    n[r.kind] = n[r.kind]! + 1;
  }
  final pct = percentages([for (final k in PrayerRecord.kinds) n[k]!]);
  return [
    for (var i = 0; i < PrayerRecord.kinds.length; i++)
      DonutSlice(
        key: PrayerRecord.kinds[i],
        label: kindName[PrayerRecord.kinds[i]]!,
        n: n[PrayerRecord.kinds[i]]!,
        pct: pct[i],
        unit: '번',
      ),
  ];
}

// ---------------------------------------------------------------- 돌아보기

enum RecapKind { week, month, year }

/// 한 주·한 달·한 해 돌아보기 재료.
class RecapData {
  const RecapData({
    required this.kind,
    required this.range,
    required this.title,
    required this.periodLabel,
    required this.totals,
    required this.bars,
    required this.bestSpan,
    required this.topSet,
    required this.goal,
  });

  final RecapKind kind;
  final StatsRange range;

  /// '이번 주' · '11월' · '2026년' 등.
  final String title;
  final String periodLabel;
  final PeriodTotals totals;
  final List<BarBucket> bars;

  /// 이 기간에 가장 길게 이어 온 날(2일 이상일 때만).
  final StreakSpan? bestSpan;

  /// 이 기간에 가장 자주 바친 신비(없으면 null).
  final MysterySet? topSet;
  final PrayerGoal goal;

  bool get isEmpty => totals.days == 0;
}

/// [offset]: 0 이면 이번, -1 이면 지난 주/달/해.
RecapData buildRecap(
  Iterable<PrayerRecord> records,
  RecapKind kind,
  String today, {
  int offset = 0,
  int startHour = defaultDayStartHour,
  PrayerGoal goal = PrayerGoal.off,
}) {
  final t = parseDayKey(today);
  late StatsRange range;
  late String title;
  late String label;
  late BucketUnit unit;
  switch (kind) {
    case RecapKind.week:
      final start = DateTime(t.year, t.month, t.day - _sundayOffset(t) + offset * 7);
      range = StatsRange(ymdKey(start), shiftDayKey(ymdKey(start), 6));
      title = offset == 0 ? '이번 주' : offset == -1 ? '지난주' : '${-offset}주 전';
      unit = BucketUnit.day;
    case RecapKind.month:
      final m = DateTime(t.year, t.month + offset);
      range = StatsRange(ymdKey(m), ymdKey(DateTime(m.year, m.month + 1, 0)));
      title = offset == 0 ? '이번 달' : '${m.year == t.year ? '' : '${m.year}년 '}${m.month}월';
      unit = BucketUnit.day;
    case RecapKind.year:
      final y = t.year + offset;
      range = StatsRange('$y-01-01', '$y-12-31');
      title = '$y년';
      unit = BucketUnit.month;
  }
  label = switch (kind) {
    RecapKind.year => '${t.year + offset}년',
    _ => rangeLabel(range, today),
  };
  final days = dayAggregates(records, startHour: startHour);
  final totals = periodCore(days, range.contains, goal: goal);
  final sd = streakDays(days, goal);
  var span = bestSpanIn(sd, range.contains);
  if (span != null && span.n < 2) span = null;
  final sets = {for (final s in MysterySet.values) s: 0};
  for (final r in records) {
    if (!r.hasProgress || !range.contains(dayKey(r.at, startHour: startHour))) continue;
    sets[r.set] = sets[r.set]! + r.decades;
  }
  MysterySet? top;
  var topN = 0;
  for (final s in MysterySet.values) {
    if (sets[s]! > topN) {
      top = s;
      topN = sets[s]!;
    }
  }
  return RecapData(
    kind: kind,
    range: range,
    title: title,
    periodLabel: label,
    totals: totals,
    bars: periodBuckets(days, range, unit: unit),
    bestSpan: span,
    topSet: top,
    goal: goal,
  );
}
