import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/stats/logical_day.dart';
import 'package:rosary_app/stats/prayer_goal.dart';
import 'package:rosary_app/stats/prayer_record.dart';
import 'package:rosary_app/stats/stats_logic.dart';
import 'package:rosary_app/stats/stats_painters.dart';

PrayerRecord rec(
  DateTime at, {
  MysterySet set = MysterySet.joyful,
  int decades = 5,
  bool completed = true,
  int seconds = 600,
  String kind = PrayerRecord.kindRosary,
}) => PrayerRecord(
  at: at,
  set: set,
  decades: decades,
  hailMarys: decades * 10,
  completed: completed,
  seconds: seconds,
  kind: kind,
);

double contrast(Color a, Color b) {
  final la = a.computeLuminance(), lb = b.computeLuminance();
  final hi = la > lb ? la : lb, lo = la > lb ? lb : la;
  return (hi + 0.05) / (lo + 0.05);
}

void main() {
  group('논리 날짜', () {
    test('하루 시작 전(새벽)은 전날로 센다', () {
      expect(dayKey(DateTime(2026, 11, 12, 3, 59)), '2026-11-11');
      expect(dayKey(DateTime(2026, 11, 12, 4, 0)), '2026-11-12');
      expect(dayKey(DateTime(2026, 11, 12, 0, 30), startHour: 0), '2026-11-12');
      expect(dayKey(DateTime(2026, 11, 12, 6, 59), startHour: 7), '2026-11-11');
    });

    test('달·해 경계를 넘는다', () {
      expect(dayKey(DateTime(2026, 12, 1, 1)), '2026-11-30');
      expect(dayKey(DateTime(2027, 1, 1, 2)), '2026-12-31');
      expect(dayKey(DateTime(2028, 3, 1, 3)), '2028-02-29'); // 윤년
    });

    test('키 유틸', () {
      expect(shiftDayKey('2026-03-01', -1), '2026-02-28');
      expect(shiftDayKey('2026-12-31', 1), '2027-01-01');
      expect(dayGap('2026-11-01', '2026-11-16'), 15);
      expect(tryParseDayKey('2026-02-30'), isNull);
      expect(tryParseDayKey('abc'), isNull);
      expect(ymdKey(DateTime(2026, 1, 5)), '2026-01-05');
    });

    test('설정값 위생', () {
      expect(sanitizeDayStartHour(3), 3);
      expect(sanitizeDayStartHour(9), defaultDayStartHour);
      expect(sanitizeDayStartHour(-1), defaultDayStartHour);
      expect(sanitizeDayStartHour('x'), defaultDayStartHour);
      expect(sanitizeDayStartHour(null), defaultDayStartHour);
    });

    test('자정 직후 기도는 전날 집계에 들어간다', () {
      final days = dayAggregates([
        rec(DateTime(2026, 11, 12, 0, 40)),
        rec(DateTime(2026, 11, 12, 9)),
      ]);
      expect(days.keys.toSet(), {'2026-11-11', '2026-11-12'});
      expect(days['2026-11-11']!.rosaries, 1);
    });
  });

  group('연속', () {
    final set = {'2026-11-10', '2026-11-11', '2026-11-12', '2026-11-05', '2026-11-06'};

    test('오늘 전이면 어제까지 이어진 것을 센다', () {
      expect(currentStreak(set, '2026-11-12'), 3);
      expect(currentStreak(set, '2026-11-13'), 3);
      expect(currentStreak(set, '2026-11-14'), 0);
      expect(currentStreak({}, '2026-11-14'), 0);
    });

    test('기간 안 가장 길게 이어 온 구간, 같으면 최근 것', () {
      final s = bestSpanIn(set, (_) => true)!;
      expect((s.s, s.e, s.n), ('2026-11-10', '2026-11-12', 3));
      final tie = bestSpanIn({'2026-01-01', '2026-01-02', '2026-02-01', '2026-02-02'}, (_) => true)!;
      expect(tie.s, '2026-02-01');
      expect(bestSpanIn(set, (k) => k.compareTo('2026-11-07') < 0)!.n, 2);
      expect(bestSpanIn({}, (_) => true), isNull);
    });

    test('연도 경계를 잇는다', () {
      expect(bestSpanIn({'2025-12-31', '2026-01-01'}, (_) => true)!.n, 2);
    });
  });

  group('목표', () {
    test('값 위생(sanitizeGoalFields)', () {
      final g = PrayerGoal.sanitized(decades: 'x', minutes: 99999);
      expect(g.decades, 0);
      expect(g.minutes, PrayerGoal.maxMinutes);
      expect(PrayerGoal.sanitized(decades: -3, minutes: double.nan).isOff, isTrue);
      expect(PrayerGoal.sanitized(decades: 2.6).decades, 3);
      expect(PrayerGoal.fromJson('이상한 값').isOff, isTrue);
      expect(PrayerGoal.fromJson({'decades': 2, 'minutes': 10}), const PrayerGoal(decades: 2, minutes: 10));
    });

    test('둘 다 정하면 하나만 채워도 목표만큼 바친 날', () {
      const g = PrayerGoal(decades: 3, minutes: 20);
      expect(g.isMet(decades: 3, seconds: 0), isTrue);
      expect(g.isMet(decades: 1, seconds: 1200), isTrue);
      expect(g.isMet(decades: 2, seconds: 600), isFalse);
      expect(PrayerGoal.off.isMet(decades: 99, seconds: 9999), isFalse);
    });

    test('연속은 목표를 정하면 목표만큼 바친 날로, 아니면 기도한 날로 센다', () {
      final days = dayAggregates([
        rec(DateTime(2026, 11, 10, 9), decades: 5),
        rec(DateTime(2026, 11, 11, 9), decades: 1, completed: false, seconds: 60),
        rec(DateTime(2026, 11, 12, 9), decades: 5),
      ]);
      expect(streakDays(days, PrayerGoal.off).length, 3);
      final met = streakDays(days, const PrayerGoal(decades: 2));
      expect(met, {'2026-11-10', '2026-11-12'});
      expect(currentStreak(met, '2026-11-12'), 1);
      expect(currentStreak(streakDays(days, PrayerGoal.off), '2026-11-12'), 3);
    });

    test('히트맵 농도: 목표만큼 바친 날은 진하게, 아닌 날은 2 이하', () {
      final a = DayAgg()..decades = 1..seconds = 120;
      final b = DayAgg()..decades = 3..seconds = 600;
      expect(heatLevel(null, PrayerGoal.off), 0);
      expect(heatLevel(a, PrayerGoal.off), 1);
      expect(heatLevel(b, PrayerGoal.off), 3);
      const g = PrayerGoal(decades: 1);
      expect(heatLevel(a, g), 3); // 1단 목표를 채움
      expect(heatLevel(b, const PrayerGoal(decades: 9)), 2);
    });

    test('설정 묶음 JSON 왕복과 오염 값 복구(백업용)', () {
      const p = StatsPrefs(dayStartHour: 5, goal: PrayerGoal(decades: 2), goalPrompted: true);
      final back = StatsPrefs.fromJson(p.toJson());
      expect(back.dayStartHour, 5);
      expect(back.goal, const PrayerGoal(decades: 2));
      expect(back.goalPrompted, isTrue);
      final bad = StatsPrefs.fromJson({'dayStartHour': 99, 'goal': {'decades': 'a', 'minutes': -5}});
      expect(bad.dayStartHour, defaultDayStartHour);
      expect(bad.goal.isOff, isTrue);
      expect(bad.goalPrompted, isFalse);
      expect(StatsPrefs.fromJson(null).goalPrompted, isFalse);
    });
  });

  group('기간', () {
    test('프리셋', () {
      expect(presetRange(StatsPreset.l7, '2026-11-16'), const StatsRange('2026-11-10', '2026-11-16'));
      expect(presetRange(StatsPreset.l30, '2026-11-16')!.days, 30);
      expect(presetRange(StatsPreset.l90, '2026-11-16')!.days, 90);
      expect(presetRange(StatsPreset.thisMonth, '2026-11-16'), const StatsRange('2026-11-01', '2026-11-16'));
      expect(presetRange(StatsPreset.thisYear, '2026-11-16'), const StatsRange('2026-01-01', '2026-11-16'));
      expect(presetRange(StatsPreset.all, '2026-11-16', earliest: '2025-02-03'), const StatsRange('2025-02-03', '2026-11-16'));
      expect(presetOf(const StatsRange('2026-11-10', '2026-11-16'), '2026-11-16'), StatsPreset.l7);
      expect(presetOf(const StatsRange('2026-11-11', '2026-11-16'), '2026-11-16'), StatsPreset.custom);
    });

    test('이동: 같은 길이, 정확한 달이면 달 단위, 오늘에서 자르고 첫 기록에서 멈춘다', () {
      const r = StatsRange('2026-11-04', '2026-11-10');
      expect(shiftRange(r, -1, '2026-11-16', earliest: '2026-01-01'), const StatsRange('2026-10-28', '2026-11-03'));
      expect(shiftRange(r, 1, '2026-11-16'), const StatsRange('2026-11-11', '2026-11-16')); // 오늘에서 자름
      expect(shiftRange(const StatsRange('2026-11-11', '2026-11-16'), 1, '2026-11-16'), isNull);
      const oct = StatsRange('2026-10-01', '2026-10-31');
      expect(shiftRange(oct, -1, '2026-11-16', earliest: '2026-01-01'), const StatsRange('2026-09-01', '2026-09-30'));
      expect(shiftRange(oct, 1, '2026-11-16'), const StatsRange('2026-11-01', '2026-11-16'));
      expect(shiftRange(oct, -1, '2026-11-16', earliest: '2026-10-01'), isNull);
      expect(shiftRange(oct, -1, '2026-11-16'), isNull);
    });

    test('라벨: 올해는 월·일, 다른 해가 끼면 연도까지, 큰 글씨용 짧은 꼴', () {
      expect(rangeLabel(const StatsRange('2026-03-04', '2026-04-26'), '2026-11-16'), '3월 4일 ~ 4월 26일');
      expect(rangeLabel(const StatsRange('2026-03-04', '2026-04-26'), '2026-11-16', compact: true), '3/4~4/26');
      expect(rangeLabel(const StatsRange('2025-12-30', '2026-01-02'), '2026-11-16'), '2025년 12월 30일 ~ 2026년 1월 2일');
    });

    test('periodCore: 기간 판정 하나로 합계(단·성모송·분·묵주기도·날)', () {
      final days = dayAggregates([
        rec(DateTime(2026, 11, 10, 9), seconds: 600),
        rec(DateTime(2026, 11, 10, 20), decades: 2, completed: false, seconds: 300),
        rec(DateTime(2026, 11, 12, 9), seconds: 900),
        rec(DateTime(2026, 10, 1, 9)),
      ]);
      const r = StatsRange('2026-11-01', '2026-11-30');
      final t = periodCore(days, r.contains, goal: const PrayerGoal(decades: 5));
      expect(t.rosaries, 2);
      expect(t.decades, 12);
      expect(t.hailMarys, 120);
      expect(t.seconds, 1800);
      expect(t.minutes, 30);
      expect(t.days, 2);
      expect(t.goalDays, 2);
      expect(periodCore(days, (_) => true).days, 3);
      expect(periodCore(days, (_) => false).days, 0);
    });

    test('막대 묶음: 31일 이하는 하루, 120일 이하는 주, 그 이상은 달', () {
      final days = dayAggregates([rec(DateTime(2026, 11, 10, 9)), rec(DateTime(2026, 9, 2, 9), decades: 1)]);
      final week = periodBuckets(days, presetRange(StatsPreset.l7, '2026-11-16')!);
      expect(week.length, 7);
      expect(week.fold<int>(0, (a, b) => a + b.decades), 5);
      expect(periodBuckets(days, presetRange(StatsPreset.l90, '2026-11-16')!).first.label.contains('/'), isTrue);
      final year = periodBuckets(days, presetRange(StatsPreset.thisYear, '2026-11-16')!);
      expect(year.length, 11);
      expect(year.fold<int>(0, (a, b) => a + b.decades), 6);
      expect(year[8].decades, 1); // 9월
    });
  });

  group('히트맵 격자', () {
    test('365일, 일요일 시작 열, 마지막 칸이 오늘', () {
      final g = heatmapGrid('2026-11-16'); // 월요일
      expect(g.weeks.last[1], '2026-11-16');
      expect(g.weeks.last[2], isNull);
      expect(g.weeks.every((w) => w.length == 7), isTrue);
      final keys = [for (final w in g.weeks) ...w.whereType<String>()];
      expect(keys.length, 365);
      expect(keys.first, g.startKey);
      expect(heatmapMonthLabels(g).length, greaterThan(8));
    });
  });

  group('도넛', () {
    test('백분율 합은 항상 100', () {
      expect(percentages([1, 1, 1]).fold<int>(0, (a, b) => a + b), 100);
      expect(percentages([0, 0, 0, 0]), [0, 0, 0, 0]);
      expect(percentages([7, 0, 0, 0]), [100, 0, 0, 0]);
      final p = percentages([33, 33, 34, 0]);
      expect(p.fold<int>(0, (a, b) => a + b), 100);
      expect(p[3], 0);
    });

    test('신비별 단 수와 기간 필터', () {
      final recs = [
        rec(DateTime(2026, 11, 10, 9), set: MysterySet.joyful, decades: 5),
        rec(DateTime(2026, 11, 11, 9), set: MysterySet.glorious, decades: 5),
        rec(DateTime(2026, 11, 12, 9), set: MysterySet.glorious, decades: 2, completed: false),
        rec(DateTime(2026, 10, 1, 9), set: MysterySet.sorrowful, decades: 5),
      ];
      final s = mysteryShares(recs, const StatsRange('2026-11-01', '2026-11-30').contains);
      expect([for (final x in s) x.n], [5, 0, 0, 7]);
      expect([for (final x in s) x.pct], [42, 0, 0, 58]);
      expect(s.first.label, '환희의 신비');
      expect(mysteryShares(recs, (_) => false).every((x) => x.n == 0), isTrue);
    });

    test('종류별은 진행이 있는 기록 수', () {
      final recs = [
        rec(DateTime(2026, 11, 10, 9)),
        rec(DateTime(2026, 11, 11, 9), kind: PrayerRecord.kindStations, decades: 0, completed: true),
        rec(DateTime(2026, 11, 12, 9), kind: PrayerRecord.kindShort),
        rec(DateTime(2026, 11, 12, 10), kind: PrayerRecord.kindShort),
      ];
      final s = kindShares(recs, (_) => true);
      expect([for (final x in s) x.n], [1, 1, 2]);
      expect(s.fold<int>(0, (a, b) => a + b.pct), 100);
    });

    test('기록의 종류는 저장·복원되고 옛 기록은 묵주기도', () {
      final r = rec(DateTime(2026, 11, 1, 9), kind: PrayerRecord.kindStations);
      expect(PrayerRecord.tryParse(r.toJson())!.kind, PrayerRecord.kindStations);
      final legacy = r.toJson()..remove('kind');
      expect(PrayerRecord.tryParse(legacy)!.kind, PrayerRecord.kindRosary);
      final odd = r.toJson()..['kind'] = 'zzz';
      expect(PrayerRecord.tryParse(odd)!.kind, PrayerRecord.kindRosary);
    });
  });

  group('돌아보기', () {
    final recs = [
      rec(DateTime(2026, 11, 8, 9)), // 일
      rec(DateTime(2026, 11, 9, 9), set: MysterySet.glorious),
      rec(DateTime(2026, 11, 10, 9), set: MysterySet.glorious),
      rec(DateTime(2026, 11, 14, 0, 30)), // 13일 밤
      rec(DateTime(2026, 11, 1, 9)),
      rec(DateTime(2025, 6, 1, 9)),
    ];

    test('이번 주(일요일 시작)', () {
      final r = buildRecap(recs, RecapKind.week, '2026-11-16');
      // 11월 16일은 월요일 → 주는 15~21일
      expect(r.range.s, '2026-11-15');
      expect(r.totals.days, 0);
      final last = buildRecap(recs, RecapKind.week, '2026-11-16', offset: -1);
      expect(last.range, const StatsRange('2026-11-08', '2026-11-14'));
      expect(last.totals.days, 4); // 8, 9, 10, 13(새벽 00:30 → 전날)
      expect(last.bars.length, 7);
      expect(last.bestSpan!.n, 3);
      expect(last.topSet, MysterySet.joyful);
      expect(last.title, '지난주');
    });

    test('이번 달과 올해', () {
      final m = buildRecap(recs, RecapKind.month, '2026-11-16');
      expect(m.totals.days, 5);
      expect(m.bars.length, 30);
      final y = buildRecap(recs, RecapKind.year, '2026-11-16');
      expect(y.totals.days, 5);
      expect(y.bars.length, 12);
      final prev = buildRecap(recs, RecapKind.year, '2026-11-16', offset: -1);
      expect(prev.totals.days, 1);
      expect(prev.title, '2025년');
      expect(buildRecap(const [], RecapKind.year, '2026-11-16').isEmpty, isTrue);
    });
  });

  group('범주색 대비', () {
    for (final b in Brightness.values) {
      test('${b.name}: 카드 표면 대비 3:1 이상', () {
        final bg = AppTheme.seedScheme(b).surfaceContainerLow;
        for (final s in MysterySet.values) {
          expect(
            contrast(StatsColors.mystery(s, b), bg),
            greaterThanOrEqualTo(3.0),
            reason: '${s.name} ${b.name}',
          );
        }
      });
    }
  });
}
