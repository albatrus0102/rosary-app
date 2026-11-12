import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/stats/prayer_stats_calc.dart';
import 'package:rosary_app/stats/prayer_record.dart';

PrayerRecord rec(
  DateTime at, {
  MysterySet set = MysterySet.joyful,
  int decades = 5,
  int hailMarys = 53,
  bool completed = true,
  int seconds = 600,
}) => PrayerRecord(
  at: at,
  set: set,
  decades: decades,
  hailMarys: hailMarys,
  completed: completed,
  seconds: seconds,
);

void main() {
  group('월/년 경계', () {
    final calc = PrayerStatsCalc([
      rec(DateTime(2025, 12, 31, 23, 59)),
      rec(DateTime(2026, 1, 1, 0, 0)),
      rec(DateTime(2026, 1, 31, 23, 59, 59)),
      rec(DateTime(2026, 2, 1)),
      rec(DateTime(2026, 11, 12, 8)),
      rec(DateTime(2026, 11, 13), completed: false, decades: 2, hailMarys: 23),
    ]);

    test('월 집계', () {
      expect(calc.completedInMonth(2026, 1), 2);
      expect(calc.completedInMonth(2026, 2), 1);
      expect(calc.completedInMonth(2025, 12), 1);
      expect(calc.completedInMonth(2026, 11), 1);
      expect(calc.completedInMonth(2026, 12), 0);
    });

    test('년/전체 집계', () {
      expect(calc.completedInYear(2026), 4);
      expect(calc.completedInYear(2025), 1);
      expect(calc.completedAll(), 5);
    });

    test('범위 합계는 반개구간', () {
      final (from, to) = PrayerStatsCalc.monthRange(2026, 1);
      expect(calc.decades(from: from, to: to), 10);
      expect(calc.hailMarys(from: from, to: to), 106);
      expect(calc.seconds(from: from, to: to), 1200);
      // 12월 범위는 13월로 넘겨도 정규화된다.
      final (f2, t2) = PrayerStatsCalc.monthRange(2025, 12);
      expect(t2, DateTime(2026));
      expect(calc.completedCount(from: f2, to: t2), 1);
    });

    test('윤일 2월 29일', () {
      final leap = PrayerStatsCalc([
        rec(DateTime(2028, 2, 29, 12)),
        rec(DateTime(2028, 3, 1)),
      ]);
      expect(leap.completedInMonth(2028, 2), 1);
      expect(leap.completedInMonth(2028, 3), 1);
      expect(leap.daysWithPrayer(2028, 2), {29});
      final (from, to) = PrayerStatsCalc.monthRange(2028, 2);
      expect(to, DateTime(2028, 3));
      expect(to.difference(from).inDays, 29);
    });
  });

  test('월별 12칸 배열', () {
    final calc = PrayerStatsCalc([
      rec(DateTime(2026, 1, 5)),
      rec(DateTime(2026, 1, 6)),
      rec(DateTime(2026, 12, 31, 23, 59)),
      rec(DateTime(2025, 6, 1)),
      rec(DateTime(2026, 3, 3), completed: false),
    ]);
    final per = calc.completedPerMonth(2026);
    expect(per, hasLength(12));
    expect(per[0], 2);
    expect(per[2], 0);
    expect(per[11], 1);
    expect(per.fold<int>(0, (a, b) => a + b), 3);
  });

  group('연속 기도', () {
    test('연말 → 연초 연속', () {
      final calc = PrayerStatsCalc([
        rec(DateTime(2025, 12, 30, 9)),
        rec(DateTime(2025, 12, 31, 20)),
        rec(DateTime(2026, 1, 1, 7)),
      ]);
      expect(calc.currentStreak(DateTime(2026, 1, 1, 22)), 3);
      expect(calc.longestStreak(), 3);
    });

    test('윤일을 건너는 연속', () {
      final calc = PrayerStatsCalc([
        rec(DateTime(2028, 2, 28)),
        rec(DateTime(2028, 2, 29)),
        rec(DateTime(2028, 3, 1)),
      ]);
      expect(calc.currentStreak(DateTime(2028, 3, 1, 23)), 3);
    });

    test('오늘 기록이 없어도 어제가 있으면 이어진다', () {
      final calc = PrayerStatsCalc([
        rec(DateTime(2026, 11, 10)),
        rec(DateTime(2026, 11, 11)),
      ]);
      expect(calc.currentStreak(DateTime(2026, 11, 12, 6)), 2);
      // 그저께까지만 있으면 끊긴다.
      expect(calc.currentStreak(DateTime(2026, 11, 13, 6)), 0);
    });

    test('같은 날 여러 기록은 하루, 최장 연속', () {
      final calc = PrayerStatsCalc([
        rec(DateTime(2026, 5, 1, 7)),
        rec(DateTime(2026, 5, 1, 21)),
        rec(DateTime(2026, 5, 2)),
        rec(DateTime(2026, 5, 4)),
        rec(DateTime(2026, 5, 5)),
        rec(DateTime(2026, 5, 6)),
        rec(DateTime(2026, 5, 7)),
        rec(DateTime(2026, 5, 20)),
      ]);
      expect(calc.longestStreak(), 4);
      expect(calc.currentStreak(DateTime(2026, 5, 20)), 1);
    });

    test('기록이 없으면 0', () {
      final calc = PrayerStatsCalc(const []);
      expect(calc.currentStreak(DateTime(2026, 1, 1)), 0);
      expect(calc.longestStreak(), 0);
    });

    test('성모송·단이 없는 기록은 기도한 날이 아니다', () {
      final calc = PrayerStatsCalc([
        PrayerRecord(at: DateTime(2026, 5, 1), set: MysterySet.joyful),
        rec(DateTime(2026, 5, 2), completed: false, decades: 0, hailMarys: 1),
      ]);
      expect(calc.daysWithPrayer(2026, 5), {2});
    });
  });

  test('신비별 분포(단 기준)와 최근 기록', () {
    final calc = PrayerStatsCalc([
      rec(DateTime(2026, 11, 1), set: MysterySet.joyful),
      rec(
        DateTime(2026, 11, 2),
        set: MysterySet.glorious,
        decades: 3,
        completed: false,
      ),
      rec(DateTime(2026, 11, 3), set: MysterySet.joyful),
      rec(DateTime(2026, 10, 3), set: MysterySet.sorrowful),
    ]);
    final (from, to) = PrayerStatsCalc.monthRange(2026, 11);
    final dist = calc.decadesBySet(from: from, to: to);
    expect(dist[MysterySet.joyful], 10);
    expect(dist[MysterySet.glorious], 3);
    expect(dist[MysterySet.luminous], 0);
    expect(dist[MysterySet.sorrowful], 0);
    expect(calc.decadesBySet()[MysterySet.sorrowful], 5);

    final recent = calc.recent(2);
    expect(recent.map((r) => r.at.day), [3, 2]);
    expect(calc.recent(), hasLength(4));
  });
}
