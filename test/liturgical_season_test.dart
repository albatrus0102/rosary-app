import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/domain/liturgical_season.dart';
import 'package:rosary_app/domain/stations_of_cross.dart' show easterSunday;

LiturgicalDay day(int y, int m, int d) => LiturgicalDay.of(DateTime(y, m, d));

void main() {
  // 알려진 부활 대축일(2024~2040)
  const easters = {
    2024: (3, 31), 2025: (4, 20), 2026: (4, 5), 2027: (3, 28), 2028: (4, 16),
    2029: (4, 1), 2030: (4, 21), 2031: (4, 13), 2032: (3, 28), 2033: (4, 17),
    2034: (4, 9), 2035: (3, 25), 2036: (4, 13), 2037: (4, 5), 2038: (4, 25),
    2039: (4, 10), 2040: (4, 1), //
  };

  test('부활 대축일: 2024~2040 알려진 날짜', () {
    easters.forEach((y, md) {
      expect(easterSunday(y), DateTime(y, md.$1, md.$2), reason: '$y');
      final e = day(y, md.$1, md.$2);
      expect(e.season, LiturgicalSeason.easter);
      expect(e.feast, LiturgicalFeast.easter);
      expect(e.color, LiturgicalColor.white);
      expect(e.week, 1);
    });
  });

  test('대림 제1주일·그리스도 왕·주님 세례', () {
    expect(firstSundayOfAdvent(2024), DateTime(2024, 12, 1));
    expect(firstSundayOfAdvent(2025), DateTime(2025, 11, 30));
    expect(firstSundayOfAdvent(2026), DateTime(2026, 11, 29));
    expect(firstSundayOfAdvent(2027), DateTime(2027, 11, 28));
    expect(firstSundayOfAdvent(2028), DateTime(2028, 12, 3));
    expect(firstSundayOfAdvent(2033), DateTime(2033, 11, 27));
    expect(christTheKing(2026), DateTime(2026, 11, 22));
    expect(baptismOfTheLord(2026), DateTime(2026, 1, 11));
    expect(baptismOfTheLord(2024), DateTime(2024, 1, 7));
    expect(baptismOfTheLord(2030), DateTime(2030, 1, 13));
    expect(pentecostSunday(2026), DateTime(2026, 5, 24));
  });

  test('2026년 한 해의 시기 경계', () {
    expect(day(2026, 1, 1).season, LiturgicalSeason.christmas);
    expect(day(2026, 1, 1).feast, LiturgicalFeast.maryMotherOfGod);
    expect(day(2026, 1, 6).feast, LiturgicalFeast.epiphany);
    expect(day(2026, 1, 11).season, LiturgicalSeason.christmas);
    expect(day(2026, 1, 11).feast, LiturgicalFeast.baptismOfTheLord);
    expect(day(2026, 1, 12).season, LiturgicalSeason.ordinary);
    expect(day(2026, 1, 12).color, LiturgicalColor.green);
    expect(day(2026, 2, 17).season, LiturgicalSeason.ordinary);
    // 재의 수요일 2026-02-18
    final ash = day(2026, 2, 18);
    expect(ash.season, LiturgicalSeason.lent);
    expect(ash.feast, LiturgicalFeast.ashWednesday);
    expect(ash.color, LiturgicalColor.violet);
    expect(ash.week, 0);
    expect(day(2026, 2, 22).week, 1); // 사순 제1주일
    // 사순 제4주일(즐거워하여라) 2026-03-15: 장미색
    expect(day(2026, 3, 15).color, LiturgicalColor.rose);
    expect(day(2026, 3, 16).color, LiturgicalColor.violet);
    // 성지 주일
    expect(day(2026, 3, 29).feast, LiturgicalFeast.palmSunday);
    expect(day(2026, 3, 29).color, LiturgicalColor.red);
    expect(day(2026, 3, 29).season, LiturgicalSeason.lent);
    expect(day(2026, 4, 1).season, LiturgicalSeason.lent); // 성주간 수요일
    // 성삼일
    expect(day(2026, 4, 2).season, LiturgicalSeason.triduum);
    expect(day(2026, 4, 2).color, LiturgicalColor.white);
    expect(day(2026, 4, 3).feast, LiturgicalFeast.goodFriday);
    expect(day(2026, 4, 3).color, LiturgicalColor.red);
    expect(day(2026, 4, 4).season, LiturgicalSeason.triduum);
    expect(day(2026, 4, 4).color, LiturgicalColor.violet);
    // 부활 시기
    expect(day(2026, 4, 5).season, LiturgicalSeason.easter);
    expect(day(2026, 4, 12).week, 2);
    expect(day(2026, 5, 14).feast, LiturgicalFeast.ascension);
    final pen = day(2026, 5, 24);
    expect(pen.season, LiturgicalSeason.easter);
    expect(pen.feast, LiturgicalFeast.pentecost);
    expect(pen.color, LiturgicalColor.red);
    expect(pen.week, 7);
    expect(day(2026, 5, 25).season, LiturgicalSeason.ordinary);
    expect(day(2026, 5, 25).color, LiturgicalColor.green);
    expect(day(2026, 5, 31).feast, LiturgicalFeast.trinity);
    expect(day(2026, 6, 4).feast, LiturgicalFeast.corpusChristi);
    expect(day(2026, 6, 12).feast, LiturgicalFeast.sacredHeart);
    expect(day(2026, 8, 15).feast, LiturgicalFeast.assumption);
    expect(day(2026, 8, 15).color, LiturgicalColor.white);
    expect(day(2026, 9, 20).color, LiturgicalColor.red);
    // 11월
    expect(day(2026, 11, 1).feast, LiturgicalFeast.allSaints);
    expect(day(2026, 11, 1).color, LiturgicalColor.white);
    expect(day(2026, 11, 2).feast, LiturgicalFeast.allSouls);
    expect(day(2026, 11, 2).color, LiturgicalColor.violet);
    expect(day(2026, 11, 22).feast, LiturgicalFeast.christTheKing);
    expect(day(2026, 11, 22).color, LiturgicalColor.white);
    expect(day(2026, 11, 28).season, LiturgicalSeason.ordinary);
    // 대림
    final a1 = day(2026, 11, 29);
    expect(a1.season, LiturgicalSeason.advent);
    expect(a1.week, 1);
    expect(a1.color, LiturgicalColor.violet);
    expect(day(2026, 12, 8).feast, LiturgicalFeast.immaculateConception);
    expect(day(2026, 12, 13).color, LiturgicalColor.rose); // 대림 제3주일
    expect(day(2026, 12, 13).week, 3);
    expect(day(2026, 12, 14).color, LiturgicalColor.violet);
    expect(day(2026, 12, 24).season, LiturgicalSeason.advent);
    expect(day(2026, 12, 24).week, 4);
    expect(day(2026, 12, 25).season, LiturgicalSeason.christmas);
    expect(day(2026, 12, 25).feast, LiturgicalFeast.christmas);
    expect(day(2026, 12, 31).season, LiturgicalSeason.christmas);
  });

  test('12월 8일이 대림 주일이면 9일로 옮긴다(2024)', () {
    expect(DateTime(2024, 12, 8).weekday, DateTime.sunday);
    expect(day(2024, 12, 8).feast, isNull);
    expect(day(2024, 12, 8).color, LiturgicalColor.violet);
    expect(day(2024, 12, 9).feast, LiturgicalFeast.immaculateConception);
  });

  test('2024~2040 모든 날: 시기 순서·주차·색이 규칙에 맞는다', () {
    const order = [
      LiturgicalSeason.christmas,
      LiturgicalSeason.ordinary,
      LiturgicalSeason.lent,
      LiturgicalSeason.triduum,
      LiturgicalSeason.easter,
      LiturgicalSeason.ordinary,
      LiturgicalSeason.advent,
      LiturgicalSeason.christmas,
    ];
    for (var y = 2024; y <= 2040; y++) {
      var idx = 0;
      final count = <LiturgicalSeason, int>{};
      for (
        var d = DateTime(y, 1, 1);
        d.year == y;
        d = DateTime(d.year, d.month, d.day + 1)
      ) {
        final l = LiturgicalDay.of(d);
        while (order[idx] != l.season) {
          idx++;
          expect(idx < order.length, isTrue, reason: '시기 순서가 어긋남: $l');
        }
        count[l.season] = (count[l.season] ?? 0) + 1;
        expect(l.date, d);
        switch (l.season) {
          case LiturgicalSeason.advent:
            expect(l.week, inInclusiveRange(1, 4), reason: '$l');
          case LiturgicalSeason.lent:
            expect(l.week, inInclusiveRange(0, 6), reason: '$l');
          case LiturgicalSeason.easter:
            expect(l.week, inInclusiveRange(1, 7), reason: '$l');
          default:
            expect(l.week, 0, reason: '$l');
        }
        if (l.feast != null) expect(l.color, l.feast!.color, reason: '$l');
        if (l.color == LiturgicalColor.green) {
          expect(l.season, LiturgicalSeason.ordinary, reason: '$l');
        }
        if (l.color == LiturgicalColor.rose) {
          expect(d.weekday, DateTime.sunday, reason: '$l');
        }
        // 장면 인자: 값은 정해진 이름만
        final a = l.toSceneArgs();
        expect(
          LiturgicalSeason.values.map((s) => s.name),
          contains(a['season']),
        );
        expect(LiturgicalColor.values.map((s) => s.name), contains(a['color']));
      }
      expect(idx, order.length - 1, reason: '$y: 모든 시기를 지나야 한다');
      expect(count[LiturgicalSeason.triduum], 3, reason: '$y');
      expect(count[LiturgicalSeason.lent], 43, reason: '$y'); // 재의 수요일~성주간 수요일
      expect(count[LiturgicalSeason.easter], 50, reason: '$y');
      expect(
        count[LiturgicalSeason.advent],
        inInclusiveRange(22, 28),
        reason: '$y',
      );
      // 장미 주일은 해마다 꼭 둘
      var rose = 0;
      for (
        var d = DateTime(y, 1, 1);
        d.year == y;
        d = DateTime(d.year, d.month, d.day + 1)
      ) {
        if (LiturgicalDay.of(d).color == LiturgicalColor.rose) rose++;
      }
      expect(rose, 2, reason: '$y');
    }
  });

  test('위령 성월: 11월의 연중 평일은 자색 기조 + 추모 장식, 대림이 오면 끝', () {
    final w = day(2026, 11, 14);
    expect(w.season, LiturgicalSeason.ordinary);
    expect(w.color, LiturgicalColor.green);
    expect(w.devotion, MonthDevotion.souls);
    expect(w.isMemorialMonth, isTrue);
    expect(w.decorColor, LiturgicalColor.violet);
    expect(w.chipLabel, '연중 시기 · 위령 성월');
    expect(w.toSceneArgs(), {
      'season': 'ordinary',
      'color': 'violet',
      'memorial': true,
    });
    // 모든 성인: 백색 그대로 + 추모 장식
    expect(day(2026, 11, 1).toSceneArgs(), {
      'season': 'ordinary',
      'color': 'white',
      'feast': 'allSaints',
      'memorial': true, //
    });
    expect(day(2026, 11, 1).chipLabel, '모든 성인 대축일');
    // 대림 제1주일(11월 29일)부터는 대림 장식
    final a = day(2026, 11, 29);
    expect(a.isMemorialMonth, isFalse);
    expect(a.toSceneArgs(), {'season': 'advent', 'color': 'violet', 'week': 1});
    expect(a.chipLabel, '대림 시기');
    // 10월: 성월 이름만 덧붙고 색은 녹색
    expect(day(2026, 10, 7).chipLabel, '연중 시기 · 묵주 기도 성월');
    expect(day(2026, 10, 7).decorColor, LiturgicalColor.green);
    expect(day(2026, 7, 7).chipLabel, '연중 시기');
    expect(day(2026, 3, 3).chipLabel, '사순 시기');
  });

  test('KST 자정 경계', () {
    // 2026-02-17 15:00 UTC = 2026-02-18 00:00 KST(재의 수요일 시작)
    final before = DateTime.utc(2026, 2, 17, 14, 59, 59);
    final at = DateTime.utc(2026, 2, 17, 15);
    expect(kstDate(before), DateTime(2026, 2, 17));
    expect(kstDate(at), DateTime(2026, 2, 18));
    expect(LiturgicalDay.now(before).season, LiturgicalSeason.ordinary);
    expect(LiturgicalDay.now(at).season, LiturgicalSeason.lent);
    expect(untilNextKstMidnight(before), const Duration(seconds: 1));
    expect(untilNextKstMidnight(at), const Duration(hours: 24));
    // 연말: 2026-12-31 15:00 UTC = 2027-01-01 00:00 KST
    expect(kstDate(DateTime.utc(2026, 12, 31, 15)), DateTime(2027, 1, 1));
    expect(
      LiturgicalDay.now(DateTime.utc(2026, 12, 31, 15)).feast,
      LiturgicalFeast.maryMotherOfGod,
    );
    // 성탄 전야 → 성탄
    expect(
      LiturgicalDay.now(DateTime.utc(2026, 12, 24, 14, 59)).season,
      LiturgicalSeason.advent,
    );
    expect(
      LiturgicalDay.now(DateTime.utc(2026, 12, 24, 15)).season,
      LiturgicalSeason.christmas,
    );
  });

  test('미리 보기 선택지: 해마다 그 시기의 대표 날을 준다', () {
    for (var y = 2024; y <= 2040; y++) {
      final now = DateTime.utc(y, 6, 15, 3);
      expect(LiturgyPreview.today.resolve(now).date, DateTime(y, 6, 15));
      final adv = LiturgyPreview.advent.resolve(now);
      expect(adv.season, LiturgicalSeason.advent, reason: '$y');
      expect(adv.week, 2);
      expect(
        adv.decorColor,
        anyOf(LiturgicalColor.violet, LiturgicalColor.white),
      );
      final x = LiturgyPreview.christmas.resolve(now);
      expect(
        (x.season, x.color),
        (LiturgicalSeason.christmas, LiturgicalColor.white),
      );
      final l = LiturgyPreview.lent.resolve(now);
      expect(
        (l.season, l.color, l.feast),
        (LiturgicalSeason.lent, LiturgicalColor.violet, null),
      );
      final e = LiturgyPreview.easter.resolve(now);
      expect(
        (e.season, e.color),
        (LiturgicalSeason.easter, LiturgicalColor.white),
      );
      final o = LiturgyPreview.ordinary.resolve(now);
      expect(
        (o.season, o.color, o.feast, o.isMemorialMonth),
        (LiturgicalSeason.ordinary, LiturgicalColor.green, null, false),
        reason: '$y $o',
      );
      final s = LiturgyPreview.souls.resolve(now);
      expect(
        (s.season, s.decorColor, s.isMemorialMonth),
        (LiturgicalSeason.ordinary, LiturgicalColor.violet, true),
      );
    }
  });
}
