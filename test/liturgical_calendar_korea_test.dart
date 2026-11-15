// 한국 교회 전례력 대조(작업 Q, docs/church/CATHOLIC_NORMS_AUDIT.md).
// 1) 주교회의가 공개한 2026년 전례력(test/fixtures/cbck_calendar_2026.tsv)의 365일과 앱의 계산을 날마다 맞춘다.
// 2) 2024~2030년 한국 이동 축일(주님 공현·주님 세례·주님 승천·성체 성혈 등)의 실제 날짜와 맞춘다
//    (2026년 외 연도는 GCatholic 한국 전례력 https://gcatholic.org/calendar/<연도>/KR-ko 로 확인).
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/domain/liturgical_season.dart';

LiturgicalDay day(int y, int m, int d) => LiturgicalDay.of(DateTime(y, m, d));

/// 앱의 축일 → 주교회의 전례력의 공식 이름.
const officialNames = {
  LiturgicalFeast.maryMotherOfGod: '천주의 성모 마리아 대축일',
  LiturgicalFeast.epiphany: '주님 공현 대축일',
  LiturgicalFeast.baptismOfTheLord: '주님 세례 축일',
  LiturgicalFeast.presentation: '주님 봉헌 축일',
  LiturgicalFeast.joseph: '복되신 동정 마리아의 배필 성 요셉 대축일',
  LiturgicalFeast.annunciation: '주님 탄생 예고 대축일',
  LiturgicalFeast.ashWednesday: '재의 수요일',
  LiturgicalFeast.palmSunday: '주님 수난 성지 주일',
  LiturgicalFeast.holyThursday: '주님 만찬 성목요일',
  LiturgicalFeast.goodFriday: '주님 수난 성금요일',
  LiturgicalFeast.holySaturday: '성토요일',
  LiturgicalFeast.easter: '주님 부활 대축일',
  LiturgicalFeast.ascension: '주님 승천 대축일',
  LiturgicalFeast.pentecost: '성령 강림 대축일',
  LiturgicalFeast.trinity: '지극히 거룩하신 삼위일체 대축일',
  LiturgicalFeast.corpusChristi: '지극히 거룩하신 그리스도의 성체 성혈 대축일',
  LiturgicalFeast.sacredHeart: '지극히 거룩하신 예수 성심 대축일',
  LiturgicalFeast.johnBaptistBirth: '성 요한 세례자 탄생 대축일',
  LiturgicalFeast.peterAndPaul: '성 베드로와 성 바오로 사도 대축일',
  LiturgicalFeast.transfiguration: '주님의 거룩한 변모 축일',
  LiturgicalFeast.assumption: '성모 승천 대축일',
  LiturgicalFeast.exaltationOfCross: '성 십자가 현양 축일',
  LiturgicalFeast.koreanMartyrs: '성 김대건 안드레아 사제와 성 정하상 바오로와 동료 순교자들 대축일',
  LiturgicalFeast.allSaints: '모든 성인 대축일',
  LiturgicalFeast.allSouls: '죽은 모든 이를 기억하는 위령의 날',
  LiturgicalFeast.lateranDedication: '라테라노 대성전 봉헌 축일',
  LiturgicalFeast.christTheKing: '온 누리의 임금이신 우리 주 예수 그리스도 왕 대축일',
  LiturgicalFeast.immaculateConception: '한국 교회의 수호자, 원죄 없이 잉태되신 복되신 동정 마리아 대축일',
  LiturgicalFeast.christmas: '주님 성탄 대축일',
  LiturgicalFeast.holyFamily: '예수, 마리아, 요셉의 성가정 축일',
};

const colorCodes = {
  '백': LiturgicalColor.white,
  '홍': LiturgicalColor.red,
  '녹': LiturgicalColor.green,
  '자': LiturgicalColor.violet,
};

/// 전례력 이름에서 시기를 읽는다(성인 기념일처럼 시기 표지가 없으면 null).
LiturgicalSeason? seasonOfTitle(String t) {
  if (t == '주님 만찬 성목요일' || t == '주님 수난 성금요일' || t == '성토요일') {
    return LiturgicalSeason.triduum;
  }
  if (RegExp('사순|재의|성주간|성지 주일').hasMatch(t)) return LiturgicalSeason.lent;
  if (RegExp('부활|주님 승천|성령 강림').hasMatch(t)) return LiturgicalSeason.easter;
  if (t.contains('대림') || RegExp(r'^12월 (1[7-9]|2[0-4])일').hasMatch(t)) {
    return LiturgicalSeason.advent;
  }
  if (RegExp('성탄|공현|주님 세례|성가정|천주의 성모').hasMatch(t)) {
    return LiturgicalSeason.christmas;
  }
  if (t.startsWith('연중 제')) return LiturgicalSeason.ordinary;
  return null;
}

/// 시기의 평일·주일(성인 기념일이 아닌 날)인가: 첫 거행의 색이 그날의 시기 색이다.
bool isTemporal(String t) =>
    RegExp(r'^(연중|대림|사순|부활|성주간) 제?\d*주|^12월 \d+일|팔일 축제|재의 예식|공현 대축일 [전후]')
        .hasMatch(t);

void main() {
  final rows = File('test/fixtures/cbck_calendar_2026.tsv')
      .readAsLinesSync()
      .where((l) => l.isNotEmpty && !l.startsWith('#'))
      .map((l) {
        final p = l.split('\t');
        final m = RegExp(r'^\[(.)\] (.*?)(?: 또는 .*)?$').firstMatch(p[1])!;
        return (DateTime.parse(p[0]), colorCodes[m.group(1)]!, m.group(2)!);
      })
      .toList();

  test('주교회의 2026년 전례력: 365일 모두 있다', () {
    expect(rows.length, 365);
    expect(rows.first.$1, DateTime(2026));
    expect(rows.last.$1, DateTime(2026, 12, 31));
  });

  test('주교회의 2026년 전례력: 앱이 표시하는 축일의 날짜가 모두 같다', () {
    final byName = {for (final e in officialNames.entries) e.value: e.key};
    for (final (date, _, title) in rows) {
      final app = LiturgicalDay.of(date).feast;
      expect(app, byName[title], reason: '$date $title');
    }
    // 앱의 모든 축일이 2026년에 한 번씩 나온다.
    final seen = rows.map((r) => LiturgicalDay.of(r.$1).feast).toSet();
    expect(seen.containsAll(LiturgicalFeast.values), isTrue);
  });

  test('주교회의 2026년 전례력: 시기·전례 색이 날마다 같다', () {
    var compared = 0;
    for (final (date, color, title) in rows) {
      final l = LiturgicalDay.of(date);
      final s = seasonOfTitle(title);
      if (s != null) expect(l.season, s, reason: '$date $title');
      if (l.feast != null || isTemporal(title)) {
        compared++;
        // 대림 제3주일·사순 제4주일: 전례력은 자색, 장미색은 『로마 미사 경본 총지침』 346항 f의 선택.
        final ok =
            l.color == color ||
            (l.color == LiturgicalColor.rose &&
                color == LiturgicalColor.violet);
        expect(ok, isTrue, reason: '$date $title: 앱 ${l.color}');
        // 장식 색도 그날의 전례 색을 따른다(위령 성월의 녹색 평일 포함).
        expect(l.decorColor, l.color, reason: '$date');
      }
    }
    expect(compared, greaterThan(280)); // 2026년: 288일(나머지는 성인 기념일·축일)
  });

  test('한국 이동 축일 2024~2030(GCatholic 한국 전례력)', () {
    // 주님 공현(1월 2~8일 사이 주일) · 주님 세례(공현이 7·8일이면 월요일)
    const epi = {
      2024: (7, 8), 2025: (5, 12), 2026: (4, 11), 2027: (3, 10),
      2028: (2, 9), 2029: (7, 8), 2030: (6, 13), //
    };
    epi.forEach((y, v) {
      expect(epiphanySunday(y), DateTime(y, 1, v.$1), reason: '$y');
      expect(day(y, 1, v.$1).feast, LiturgicalFeast.epiphany, reason: '$y');
      expect(day(y, 1, 6).feast == LiturgicalFeast.epiphany, v.$1 == 6);
      expect(baptismOfTheLord(y), DateTime(y, 1, v.$2), reason: '$y');
      expect(day(y, 1, v.$2).season, LiturgicalSeason.christmas);
      expect(day(y, 1, v.$2 + 1).season, LiturgicalSeason.ordinary);
    });
    // 주님 승천(부활 제7주일) · 성체 성혈(삼위일체 다음 주일)
    const asc = {
      2024: ((5, 12), (6, 2)), 2025: ((6, 1), (6, 22)),
      2027: ((5, 9), (5, 30)), 2028: ((5, 28), (6, 18)),
      2029: ((5, 13), (6, 3)), //
    };
    asc.forEach((y, v) {
      final a = day(y, v.$1.$1, v.$1.$2), c = day(y, v.$2.$1, v.$2.$2);
      expect(a.feast, LiturgicalFeast.ascension, reason: '$y');
      expect(c.feast, LiturgicalFeast.corpusChristi, reason: '$y');
      expect(a.date.weekday, DateTime.sunday);
      expect(c.date.weekday, DateTime.sunday);
    });
  });

  test('옮겨 지내는 대축일·성가정 2024~2029(GCatholic 한국 전례력)', () {
    // 성 요셉: 2028년 3월 19일이 사순 제3주일 → 20일(월)
    expect(day(2028, 3, 19).feast, isNull);
    expect(day(2028, 3, 19).color, LiturgicalColor.violet);
    expect(day(2028, 3, 20).feast, LiturgicalFeast.joseph);
    expect(day(2027, 3, 19).feast, LiturgicalFeast.joseph);
    // 주님 탄생 예고: 성주간·부활 팔일 축제에 들면 부활 제2주일 다음 월요일
    expect(day(2024, 4, 8).feast, LiturgicalFeast.annunciation);
    expect(day(2024, 3, 25).feast, isNull);
    expect(day(2027, 4, 5).feast, LiturgicalFeast.annunciation);
    expect(day(2027, 3, 25).feast, LiturgicalFeast.holyThursday);
    expect(day(2029, 4, 9).feast, LiturgicalFeast.annunciation);
    expect(day(2029, 3, 25).feast, LiturgicalFeast.palmSunday);
    expect(day(2025, 3, 25).feast, LiturgicalFeast.annunciation);
    expect(day(2025, 3, 25).color, LiturgicalColor.white);
    // 성 요한 세례자 탄생: 2028년 예수 성심(6/23)과 다른 날
    expect(day(2028, 6, 23).feast, LiturgicalFeast.sacredHeart);
    expect(day(2028, 6, 24).feast, LiturgicalFeast.johnBaptistBirth);
    // 주일에 온 주님 축일(2025): 주님 봉헌·성 십자가 현양(홍색)·라테라노
    expect(day(2025, 2, 2).feast, LiturgicalFeast.presentation);
    expect(day(2025, 9, 14).color, LiturgicalColor.red);
    expect(day(2025, 11, 9).feast, LiturgicalFeast.lateranDedication);
    expect(day(2025, 11, 2).feast, LiturgicalFeast.allSouls); // 주일이어도 위령의 날
    // 성가정: 2024 12/29, 2025 12/28, 2027 12/26, 2028 12/31, 2029 12/30(주일), 2022 12/30(성탄이 주일 → 금요일)
    for (final (y, d) in [
      (2024, 29),
      (2025, 28),
      (2027, 26),
      (2028, 31),
      (2029, 30),
      (2022, 30),
    ]) {
      expect(day(y, 12, d).feast, LiturgicalFeast.holyFamily, reason: '$y');
    }
    // 원죄 없이 잉태되신 복되신 동정 마리아: 대림 제2주일이면 월요일(2024년 12월 9일)
    expect(day(2024, 12, 9).feast, LiturgicalFeast.immaculateConception);
    expect(day(2025, 12, 8).feast, LiturgicalFeast.immaculateConception);
  });
}
