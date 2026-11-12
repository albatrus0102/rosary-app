import '../domain/prayer_data.dart';
import 'prayer_record.dart';

/// 기도 기록의 순수 집계 함수 모음. 월/년 경계는 모두 **로컬 시간** 기준이며
/// 구간은 반개구간 `[from, to)`이다. `from`/`to`가 null이면 그쪽은 제한 없음.
class PrayerStatsCalc {
  PrayerStatsCalc(Iterable<PrayerRecord> records)
    : records = List.unmodifiable(records);

  /// 최신순으로 정렬되어 있을 필요는 없다.
  final List<PrayerRecord> records;

  /// [year]년 [month]월의 `[시작, 다음 달 시작)`. month가 13 이상이어도 정규화된다.
  static (DateTime, DateTime) monthRange(int year, int month) =>
      (DateTime(year, month), DateTime(year, month + 1));

  /// [year]년의 `[1월 1일, 다음 해 1월 1일)`.
  static (DateTime, DateTime) yearRange(int year) =>
      (DateTime(year), DateTime(year + 1));

  static DateTime dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

  Iterable<PrayerRecord> _inRange(DateTime? from, DateTime? to) =>
      records.where(
        (r) =>
            (from == null || !r.at.isBefore(from)) &&
            (to == null || r.at.isBefore(to)),
      );

  // ---- 완주 ----

  int completedCount({DateTime? from, DateTime? to}) =>
      _inRange(from, to).where((r) => r.completed).length;

  int completedInMonth(int year, int month) {
    final (from, to) = monthRange(year, month);
    return completedCount(from: from, to: to);
  }

  int completedInYear(int year) {
    final (from, to) = yearRange(year);
    return completedCount(from: from, to: to);
  }

  int completedAll() => completedCount();

  /// [year]년 1~12월의 완주 횟수 (인덱스 0 = 1월).
  List<int> completedPerMonth(int year) {
    final out = List<int>.filled(12, 0);
    for (final r in records) {
      if (r.completed && r.at.year == year) out[r.at.month - 1]++;
    }
    return out;
  }

  // ---- 합계 ----

  int decades({DateTime? from, DateTime? to}) =>
      _inRange(from, to).fold(0, (a, r) => a + r.decades);

  int hailMarys({DateTime? from, DateTime? to}) =>
      _inRange(from, to).fold(0, (a, r) => a + r.hailMarys);

  int seconds({DateTime? from, DateTime? to}) =>
      _inRange(from, to).fold(0, (a, r) => a + r.seconds);

  /// 신비별 바친 단 수.
  Map<MysterySet, int> decadesBySet({DateTime? from, DateTime? to}) {
    final out = {for (final s in MysterySet.values) s: 0};
    for (final r in _inRange(from, to)) {
      out[r.set] = out[r.set]! + r.decades;
    }
    return out;
  }

  // ---- 기도한 날 / 연속 ----

  /// 기도한 날(성모송·단·완주 중 하나라도 있는 기록의 날짜). 날짜만(00:00 로컬).
  Set<DateTime> prayerDays() => {
    for (final r in records)
      if (r.hasProgress) dateOnly(r.at),
  };

  /// [year]년 [month]월에서 기도한 날짜(일)의 집합.
  Set<int> daysWithPrayer(int year, int month) => {
    for (final r in records)
      if (r.hasProgress && r.at.year == year && r.at.month == month) r.at.day,
  };

  /// 현재 연속 기도 일수. 오늘 기록이 없어도 어제 기록이 있으면 어제까지의
  /// 연속을 센다.
  int currentStreak(DateTime now) {
    final days = prayerDays();
    var day = dateOnly(now);
    if (!days.contains(day)) {
      day = DateTime(day.year, day.month, day.day - 1);
      if (!days.contains(day)) return 0;
    }
    var count = 0;
    while (days.contains(day)) {
      count++;
      day = DateTime(day.year, day.month, day.day - 1);
    }
    return count;
  }

  /// 가장 길었던 연속 기도 일수.
  int longestStreak() {
    final days = prayerDays().toList()..sort();
    var best = 0;
    var run = 0;
    DateTime? prev;
    for (final d in days) {
      if (prev != null && d == DateTime(prev.year, prev.month, prev.day + 1)) {
        run++;
      } else {
        run = 1;
      }
      if (run > best) best = run;
      prev = d;
    }
    return best;
  }

  // ---- 최근 ----

  /// 최신순 최근 기록 (진행이 없는 기록은 제외).
  List<PrayerRecord> recent([int limit = 20]) {
    final sorted = records.where((r) => r.hasProgress).toList()
      ..sort((a, b) => b.at.compareTo(a.at));
    return sorted.length <= limit ? sorted : sorted.sublist(0, limit);
  }
}
