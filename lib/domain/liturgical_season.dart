/// 전례력: 날짜 → 전례 시기·전례 색·주요 대축일(docs/church/LITURGICAL_DECOR.md).
///
/// 기준: **한국천주교주교회의 전례력**(로마 보편 전례력 + 한국 교회 규정).
/// 한국 교회는 주님 공현을 1월 2~8일 사이 주일, 주님 승천을 부활 제7주일, 성체 성혈을
/// 삼위일체 다음 주일로 옮겨 지낸다(주교회의 2026년 전례력으로 확인: docs/church/CATHOLIC_NORMS_AUDIT.md).
/// 날짜 경계는 한국 표준시(KST) 자정이다([kstDate]).
library;

import 'stations_of_cross.dart' show easterSunday;

/// 전례 시기.
enum LiturgicalSeason {
  advent('대림 시기'),
  christmas('성탄 시기'),
  ordinary('연중 시기'),
  lent('사순 시기'),
  triduum('파스카 성삼일'),
  easter('부활 시기');

  const LiturgicalSeason(this.labelKo);
  final String labelKo;
}

/// 전례 색. [rose] 는 대림 제3주일(기뻐하여라)·사순 제4주일(즐거워하여라).
enum LiturgicalColor {
  violet('자색'),
  white('백색'),
  green('녹색'),
  red('홍색'),
  rose('장미색');

  const LiturgicalColor(this.labelKo);
  final String labelKo;
}

/// 색이나 장식이 달라지는 주요 대축일·축일.
enum LiturgicalFeast {
  maryMotherOfGod('천주의 성모 마리아 대축일', LiturgicalColor.white),
  epiphany('주님 공현 대축일', LiturgicalColor.white),
  baptismOfTheLord('주님 세례 축일', LiturgicalColor.white),
  presentation('주님 봉헌 축일', LiturgicalColor.white),
  joseph('복되신 동정 마리아의 배필 성 요셉 대축일', LiturgicalColor.white),
  annunciation('주님 탄생 예고 대축일', LiturgicalColor.white),
  ashWednesday('재의 수요일', LiturgicalColor.violet),
  palmSunday('주님 수난 성지 주일', LiturgicalColor.red),
  holyThursday('주님 만찬 성목요일', LiturgicalColor.white),
  goodFriday('주님 수난 성금요일', LiturgicalColor.red),
  holySaturday('성토요일', LiturgicalColor.violet),
  easter('주님 부활 대축일', LiturgicalColor.white),
  ascension('주님 승천 대축일', LiturgicalColor.white),
  pentecost('성령 강림 대축일', LiturgicalColor.red),
  trinity('지극히 거룩하신 삼위일체 대축일', LiturgicalColor.white),
  corpusChristi('성체 성혈 대축일', LiturgicalColor.white),
  sacredHeart('예수 성심 대축일', LiturgicalColor.white),
  johnBaptistBirth('성 요한 세례자 탄생 대축일', LiturgicalColor.white),
  peterAndPaul('성 베드로와 성 바오로 사도 대축일', LiturgicalColor.red),
  transfiguration('주님의 거룩한 변모 축일', LiturgicalColor.white),
  assumption('성모 승천 대축일', LiturgicalColor.white),
  exaltationOfCross('성 십자가 현양 축일', LiturgicalColor.red),
  koreanMartyrs('한국 순교 성인 대축일', LiturgicalColor.red),
  allSaints('모든 성인 대축일', LiturgicalColor.white),
  allSouls('위령의 날', LiturgicalColor.violet),
  lateranDedication('라테라노 대성전 봉헌 축일', LiturgicalColor.white),
  christTheKing('그리스도 왕 대축일', LiturgicalColor.white),
  immaculateConception('원죄 없이 잉태되신 복되신 동정 마리아 대축일', LiturgicalColor.white),
  christmas('주님 성탄 대축일', LiturgicalColor.white),
  holyFamily('예수, 마리아, 요셉의 성가정 축일', LiturgicalColor.white);

  const LiturgicalFeast(this.labelKo, this.color);
  final String labelKo;
  final LiturgicalColor color;
}

/// 한국 교회의 성월(신심의 달). 전례 시기와 별개로 부제에 덧붙인다.
enum MonthDevotion {
  joseph(3, '성 요셉 성월'),
  mary(5, '성모 성월'),
  sacredHeart(6, '예수 성심 성월'),
  martyrs(9, '순교자 성월'),
  rosary(10, '묵주 기도 성월'),
  souls(11, '위령 성월');

  const MonthDevotion(this.month, this.labelKo);
  final int month;
  final String labelKo;

  static MonthDevotion? ofMonth(int month) {
    for (final d in values) {
      if (d.month == month) return d;
    }
    return null;
  }
}

/// [instant] 가 속한 한국 표준시(UTC+9) 달력 날짜(자정, 시간대 없는 값).
DateTime kstDate(DateTime instant) {
  final k = instant.toUtc().add(const Duration(hours: 9));
  return DateTime(k.year, k.month, k.day);
}

/// [instant] 부터 다음 KST 자정까지 남은 시간(0보다 크고 24시간 이하).
Duration untilNextKstMidnight(DateTime instant) {
  final k = instant.toUtc().add(const Duration(hours: 9));
  final next = DateTime.utc(k.year, k.month, k.day + 1);
  return next.difference(k);
}

/// 성삼일 침묵이 시작되는 KST 시각(성목요일 주님 만찬 미사 뒤로 본다).
const kTriduumSilenceStartHour = 20;

/// 성삼일 침묵이 끝나는 KST 시각(성토요일, 부활 성야 전).
const kTriduumSilenceEndHour = 19;

/// 성삼일 침묵(docs/church/REVERENCE.md): 성목요일 주님 만찬 미사 뒤 ~ 부활 성야 전에는
/// 성당의 오르간·음악을 울리지 않고, 감실을 비우고 성체등을 끈다.
/// [day]의 축일과 [instant]의 KST 시각으로 정한다(본당마다 미사 시각이 달라 보수적으로 잡았다: 교구 검수 항목).
bool isTriduumSilence(LiturgicalDay day, DateTime instant) {
  final h = instant.toUtc().add(const Duration(hours: 9)).hour;
  return switch (day.feast) {
    LiturgicalFeast.holyThursday => h >= kTriduumSilenceStartHour,
    LiturgicalFeast.goodFriday => true,
    LiturgicalFeast.holySaturday => h < kTriduumSilenceEndHour,
    _ => false,
  };
}

/// [instant] 부터 다음 '다시 계산할' KST 시각(자정, 성삼일 침묵 시작·끝 시각 중 가장 가까운 것)까지.
Duration untilNextLiturgyCheck(DateTime instant) {
  final k = instant.toUtc().add(const Duration(hours: 9));
  Duration? best;
  for (final h in [kTriduumSilenceEndHour, kTriduumSilenceStartHour, 24]) {
    final t = DateTime.utc(k.year, k.month, k.day, h);
    final d = t.difference(k);
    if (d > Duration.zero && (best == null || d < best)) best = d;
  }
  return best ?? untilNextKstMidnight(instant);
}

DateTime _d(int y, int m, int d) => DateTime.utc(y, m, d);
DateTime _plus(DateTime d, int days) => _d(d.year, d.month, d.day + days);

/// [d] 당일이거나 그 뒤의 첫 주일.
DateTime _sundayOnOrAfter(DateTime d) => _plus(d, (7 - d.weekday % 7) % 7);

/// 대림 제1주일: 성탄(12월 25일) 전 넷째 주일(11월 27일~12월 3일).
DateTime firstSundayOfAdvent(int year) {
  final d = _sundayOnOrAfter(_d(year, 11, 27));
  return DateTime(d.year, d.month, d.day);
}

/// 주님 공현 대축일(한국): 1월 2일~8일 사이의 주일.
DateTime epiphanySunday(int year) {
  final d = _sundayOnOrAfter(_d(year, 1, 2));
  return DateTime(d.year, d.month, d.day);
}

/// 주님 세례 축일(한국): 주님 공현 대축일 다음 주일. 공현이 1월 7일·8일이면 다음 날(월요일).
/// 성탄 시기의 마지막 날(1월 8일~13일).
DateTime baptismOfTheLord(int year) {
  final e = epiphanySunday(year);
  return DateTime(e.year, e.month, e.day + (e.day >= 7 ? 1 : 7));
}

/// 성령 강림 대축일(부활 후 50일째). 부활 시기의 마지막 날.
DateTime pentecostSunday(int year) {
  final e = easterSunday(year);
  return DateTime(e.year, e.month, e.day + 49);
}

/// 그리스도 왕 대축일(연중 마지막 주일 = 대림 제1주일 한 주 전).
DateTime christTheKing(int year) {
  final a = firstSundayOfAdvent(year);
  return DateTime(a.year, a.month, a.day - 7);
}

/// 하루의 전례 정보.
class LiturgicalDay {
  const LiturgicalDay._({
    required this.date,
    required this.season,
    required this.color,
    required this.week,
    this.feast,
    this.devotion,
  });

  /// 달력 날짜(연·월·일만 쓴다. 시각·시간대는 보지 않는다).
  factory LiturgicalDay.of(DateTime date) => _compute(date);

  /// 지금(또는 [instant])의 KST 날짜로 계산한다.
  factory LiturgicalDay.now([DateTime? instant]) =>
      _compute(kstDate(instant ?? DateTime.now()));

  final DateTime date;
  final LiturgicalSeason season;

  /// 그날의 전례 색(대축일·장미 주일 반영).
  final LiturgicalColor color;

  /// 시기 안의 주차(대림 1~4, 사순 1~6(재의 수요일 주간은 0), 부활 1~7). 그 밖에는 0.
  final int week;

  final LiturgicalFeast? feast;

  /// 그 달의 성월. 대림·성탄·사순·성삼일·부활 시기와 겹쳐도 값은 준다(표시는 [chipLabel] 이 정한다).
  final MonthDevotion? devotion;

  /// 위령 성월의 '추모' 장식을 하는 날: 11월이고 아직 연중 시기일 때(대림이 시작되면 끝).
  bool get isMemorialMonth =>
      devotion == MonthDevotion.souls && season == LiturgicalSeason.ordinary;

  /// 성당 장식(제대 앞 보·독서대 보)의 색 = 그날의 전례 색.
  /// 위령 성월에도 연중 평일·주일의 전례 색은 녹색이다(주교회의 전례력 [녹], 『로마 미사 경본 총지침』 346항).
  /// 위령 성월은 색을 바꾸지 않고 추모 촛불 장식([isMemorialMonth])만 더한다.
  LiturgicalColor get decorColor => color;

  /// 상태 칩 부제: 대축일이면 그 이름, 아니면 시기 이름(연중 시기에는 성월을 덧붙인다).
  String get chipLabel {
    final f = feast;
    if (f != null) return f.labelKo;
    final dv = devotion;
    if (season == LiturgicalSeason.ordinary && dv != null) {
      return '${season.labelKo} · ${dv.labelKo}';
    }
    return season.labelKo;
  }

  /// 3D 장면 `ChurchAPI.setLiturgy` 인자(SPEC §33).
  Map<String, Object?> toSceneArgs() => {
    'season': season.name,
    'color': decorColor.name,
    if (week > 0) 'week': week,
    if (feast != null) 'feast': feast!.name,
    if (isMemorialMonth) 'memorial': true,
  };

  static LiturgicalDay _compute(DateTime date) {
    final y = date.year;
    final d = _d(y, date.month, date.day);
    final out = DateTime(y, date.month, date.day);
    final e0 = easterSunday(y);
    final easter = _d(y, e0.month, e0.day);
    int since(DateTime a) => d.difference(a).inDays;
    final se = since(easter); // 부활 대축일로부터 며칠째(음수: 전)
    final a0 = firstSundayOfAdvent(y);
    final advent1 = _d(y, a0.month, a0.day);
    final b0 = baptismOfTheLord(y);
    final baptism = _d(y, b0.month, b0.day);
    final xmas = _d(y, 12, 25);

    LiturgicalSeason season;
    var week = 0;
    if (!d.isAfter(baptism) || !d.isBefore(xmas)) {
      season = LiturgicalSeason.christmas;
    } else if (se < -46) {
      season = LiturgicalSeason.ordinary;
    } else if (se < -3) {
      season = LiturgicalSeason.lent;
      // 사순 제1주일 = 부활 42일 전. 재의 수요일~토요일은 0주.
      week = se < -42 ? 0 : (se + 42) ~/ 7 + 1;
    } else if (se < 0) {
      season = LiturgicalSeason.triduum;
    } else if (se <= 49) {
      season = LiturgicalSeason.easter;
      week = (se ~/ 7 + 1).clamp(1, 7);
    } else if (d.isBefore(advent1)) {
      season = LiturgicalSeason.ordinary;
    } else {
      season = LiturgicalSeason.advent;
      week = (since(advent1) ~/ 7 + 1).clamp(1, 4);
    }

    final feast = _feastOf(d, y, se, advent1, baptism);
    final sunday = d.weekday == DateTime.sunday;
    LiturgicalColor color;
    if (feast != null) {
      color = feast.color;
    } else if (season == LiturgicalSeason.advent && sunday && week == 3) {
      color = LiturgicalColor.rose;
    } else if (season == LiturgicalSeason.lent && sunday && week == 4) {
      color = LiturgicalColor.rose;
    } else {
      color = switch (season) {
        LiturgicalSeason.advent ||
        LiturgicalSeason.lent => LiturgicalColor.violet,
        LiturgicalSeason.christmas ||
        LiturgicalSeason.easter => LiturgicalColor.white,
        LiturgicalSeason.triduum => LiturgicalColor.violet,
        LiturgicalSeason.ordinary => LiturgicalColor.green,
      };
    }
    return LiturgicalDay._(
      date: out,
      season: season,
      color: color,
      week: week,
      feast: feast,
      devotion: MonthDevotion.ofMonth(date.month),
    );
  }

  static LiturgicalFeast? _feastOf(
    DateTime d,
    int y,
    int se,
    DateTime advent1,
    DateTime baptism,
  ) {
    // 부활 대축일 기준 이동 축일(주님 승천·성체 성혈은 한국 교회 규정대로 주일)
    switch (se) {
      case -46:
        return LiturgicalFeast.ashWednesday;
      case -7:
        return LiturgicalFeast.palmSunday;
      case -3:
        return LiturgicalFeast.holyThursday;
      case -2:
        return LiturgicalFeast.goodFriday;
      case -1:
        return LiturgicalFeast.holySaturday;
      case 0:
        return LiturgicalFeast.easter;
      case 42:
        return LiturgicalFeast.ascension;
      case 49:
        return LiturgicalFeast.pentecost;
      case 56:
        return LiturgicalFeast.trinity;
      case 63:
        return LiturgicalFeast.corpusChristi;
      case 68:
        return LiturgicalFeast.sacredHeart;
    }
    if (d == _plus(advent1, -7)) return LiturgicalFeast.christTheKing;
    if (d == baptism) return LiturgicalFeast.baptismOfTheLord;
    final ep = epiphanySunday(y);
    if (d == _d(y, ep.month, ep.day)) return LiturgicalFeast.epiphany;
    final easter = _plus(d, -se);
    if (d == _josephDate(y, easter)) return LiturgicalFeast.joseph;
    if (d == _annunciationDate(y, easter)) return LiturgicalFeast.annunciation;
    // 6월 24일이 예수 성심 대축일과 겹치면 하루 앞당긴다(위 switch 가 성심을 먼저 준다).
    final jb = _d(y, 6, 24);
    final jbDay = jb == _plus(easter, 68) ? _d(y, 6, 23) : jb;
    if (d == jbDay) return LiturgicalFeast.johnBaptistBirth;
    final m = d.month, day = d.day;
    if (m == 1 && day == 1) return LiturgicalFeast.maryMotherOfGod;
    if (m == 2 && day == 2) return LiturgicalFeast.presentation;
    if (m == 6 && day == 29) return LiturgicalFeast.peterAndPaul;
    if (m == 8 && day == 6) return LiturgicalFeast.transfiguration;
    if (m == 8 && day == 15) return LiturgicalFeast.assumption;
    if (m == 9 && day == 14) return LiturgicalFeast.exaltationOfCross;
    if (m == 9 && day == 20) return LiturgicalFeast.koreanMartyrs;
    if (m == 11 && day == 1) return LiturgicalFeast.allSaints;
    if (m == 11 && day == 2) return LiturgicalFeast.allSouls;
    if (m == 11 && day == 9) return LiturgicalFeast.lateranDedication;
    if (m == 12 && day == 25) return LiturgicalFeast.christmas;
    // 성가정: 성탄 팔일 축제 안의 주일, 없으면(성탄이 주일) 12월 30일.
    if (m == 12 && day > 25) {
      final sun = _sundayOnOrAfter(_d(y, 12, 26));
      final hf = sun.year == y ? sun : _d(y, 12, 30);
      if (d == hf) return LiturgicalFeast.holyFamily;
    }
    // 12월 8일이 대림 주일이면 다음 날(월요일)로 옮긴다.
    final dec8 = _d(y, 12, 8);
    final ic = dec8.weekday == DateTime.sunday ? _d(y, 12, 9) : dec8;
    if (d == ic) return LiturgicalFeast.immaculateConception;
    return null;
  }

  /// 성 요셉 대축일(3월 19일): 사순 주일이면 다음 날(월), 성주간에 들면 성지 주일 전 토요일.
  static DateTime _josephDate(int y, DateTime easter) {
    final j = _d(y, 3, 19);
    final palm = _plus(easter, -7);
    if (!j.isBefore(palm)) return _plus(palm, -1);
    return j.weekday == DateTime.sunday ? _plus(j, 1) : j;
  }

  /// 주님 탄생 예고 대축일(3월 25일): 사순 주일이면 다음 날(월),
  /// 성주간·부활 팔일 축제에 들면 부활 제2주일 다음 월요일.
  static DateTime _annunciationDate(int y, DateTime easter) {
    final a = _d(y, 3, 25);
    final palm = _plus(easter, -7);
    if (!a.isBefore(palm) && !a.isAfter(_plus(easter, 7))) {
      return _plus(easter, 8);
    }
    return a.weekday == DateTime.sunday ? _plus(a, 1) : a;
  }

  @override
  String toString() =>
      'LiturgicalDay(${date.year}-${date.month}-${date.day} ${season.name} '
      '${color.name} w$week ${feast?.name ?? '-'})';
}

/// '전례 시기 미리 보기' 선택지. [today] 가 기본(오늘 날짜대로).
enum LiturgyPreview {
  today('오늘 날짜'),
  advent('대림 시기'),
  christmas('성탄 시기'),
  lent('사순 시기'),
  easter('부활 시기'),
  ordinary('연중 시기'),
  souls('위령 성월');

  const LiturgyPreview(this.labelKo);
  final String labelKo;

  /// 이 선택지를 대표하는 날의 전례 정보. [today] 는 [now](기본: 지금)의 KST 날짜.
  LiturgicalDay resolve([DateTime? now]) {
    final t = kstDate(now ?? DateTime.now());
    final y = t.year;
    final e = easterSunday(y);
    final a = firstSundayOfAdvent(y);
    return LiturgicalDay.of(switch (this) {
      LiturgyPreview.today => t,
      // 대림 제2주간 화요일(초 둘, 자색)
      LiturgyPreview.advent => DateTime(a.year, a.month, a.day + 9),
      LiturgyPreview.christmas => DateTime(y, 12, 25),
      // 사순 제1주일
      LiturgyPreview.lent => DateTime(e.year, e.month, e.day - 42),
      LiturgyPreview.easter => e,
      // 성령 강림 뒤 연중 평일(부활 후 80일째: 대축일·성월과 겹치지 않는 7월 무렵)
      LiturgyPreview.ordinary => _ordinarySample(e),
      // 11월 둘째 주(위령 성월: 녹색 + 추모 장식)
      LiturgyPreview.souls => DateTime(y, 11, 10),
    });
  }

  static DateTime _ordinarySample(DateTime e) {
    var d = DateTime(e.year, e.month, e.day + 80);
    // 성월이 없는 달(7·8월)의, 축일이 아닌 평일로 맞춘다.
    while (MonthDevotion.ofMonth(d.month) != null ||
        d.weekday == DateTime.sunday ||
        LiturgicalDay.of(d).feast != null) {
      d = DateTime(d.year, d.month, d.day + 1);
    }
    return d;
  }
}
