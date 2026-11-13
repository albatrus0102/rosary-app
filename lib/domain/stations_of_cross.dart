// 십자가의 길(14처) 데이터와 전례 시기 계산(부활절·사순 시기).
//
// 문구의 원본은 `data/stations_of_cross.json`이고 `stations_of_cross_data.dart`는 생성 파일이다
// (`python3 tools/stations/build_stations.py`). 모든 문구는 사제·교구 검수 전 초안이다
// (`docs/ux/STATIONS_OF_CROSS.md`). 성경은 장·절 표시만 적고 본문은 옮기지 않는다.

part 'stations_of_cross_data.dart';

/// 십자가의 길의 한 처.
class StationOfCross {
  const StationOfCross({
    required this.n,
    required this.title,
    required this.short,
    required this.refs,
    required this.tradition,
    required this.meditation,
    required this.petition,
  });

  /// 1..14
  final int n;

  /// 전통 명칭. 예: '예수님께서 사형 선고를 받으심'.
  final String title;

  /// 짧은 이름(칩·목록 보조). 예: '사형 선고'.
  final String short;

  /// 성경 근거(장·절 표시만) 또는 '전승(…)'.
  final String refs;

  /// 성경에 직접 나오지 않는 전승의 처(3·4·6·7·9처).
  final bool tradition;

  /// 짧은 묵상(복음 사건 서술, 2문장 안팎).
  final String meditation;

  /// 한 줄 청원.
  final String petition;

  /// '제3처'.
  String get label => '제$n처';

  /// 로마 숫자(성당 3D 판과 같다).
  String get roman => StationsOfCross.romanNumerals[n - 1];

  /// 묵상 시트·기도 배경에 쓰는 그림(가로 600px WebP).
  String get imageAsset =>
      'assets/images/stations/station_${n.toString().padLeft(2, '0')}.webp';

  /// 그림의 초점(0..1, 왼쪽 위 0/0). `BoxFit.cover`로 자를 때 인물이 남게 한다.
  (double, double) get focus => StationsOfCross._focus[n - 1];
}

/// 십자가의 길 14처 목록과 공통 문구.
abstract final class StationsOfCross {
  static const List<StationOfCross> all = _stations;

  /// 데이터 판(원본 JSON의 version).
  static const int dataVersion = _dataVersion;

  /// 각 처 앞의 짧은 전통 환호(검수 필요).
  static const String acclamation = _acclamation;

  /// 시작 기도(새로 쓴 짧은 문구, 검수 필요).
  static const String opening = _opening;

  /// 마침 기도(새로 쓴 짧은 문구, 검수 필요).
  static const String closing = _closing;

  /// 14점 공통 그림 출처 표시.
  static const String artCredit = _artCredit;

  static const List<String> romanNumerals = [
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', //
    'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV',
  ];

  // docs/ux/ART_REFERENCES.md §3 의 초점 x/y.
  static const List<(double, double)> _focus = [
    (0.80, 0.20), (0.47, 0.50), (0.55, 0.62), (0.45, 0.28), (0.62, 0.22), //
    (0.50, 0.30), (0.68, 0.80), (0.42, 0.28), (0.72, 0.72), (0.58, 0.20),
    (0.70, 0.83), (0.55, 0.17), (0.72, 0.68), (0.20, 0.48),
  ];

  /// [n]처(1..14). 범위를 벗어나면 가장 가까운 처.
  static StationOfCross byNumber(int n) => all[(n.clamp(1, all.length)) - 1];
}

/// 그레고리력 부활 대축일(익명 그레고리력 계산법, Meeus/Jones/Butcher).
DateTime easterSunday(int year) {
  final a = year % 19;
  final b = year ~/ 100;
  final c = year % 100;
  final d = b ~/ 4;
  final e = b % 4;
  final f = (b + 8) ~/ 25;
  final g = (b - f + 1) ~/ 3;
  final h = (19 * a + b - d - g + 15) % 30;
  final i = c ~/ 4;
  final k = c % 4;
  final l = (32 + 2 * e + 2 * i - h - k) % 7;
  final m = (a + 11 * h + 22 * l) ~/ 451;
  final month = (h + l - 7 * m + 114) ~/ 31;
  final day = ((h + l - 7 * m + 114) % 31) + 1;
  return DateTime(year, month, day);
}

/// 재의 수요일(부활절 46일 전).
DateTime ashWednesday(int year) {
  final e = easterSunday(year);
  return DateTime(e.year, e.month, e.day - 46);
}

/// 주님 수난 성금요일(부활절 2일 전).
DateTime goodFriday(int year) {
  final e = easterSunday(year);
  return DateTime(e.year, e.month, e.day - 2);
}

/// 십자가의 길을 권하는 기간: 재의 수요일부터 성금요일까지(양 끝 포함, 날짜만 본다).
bool isStationsSeason(DateTime date) {
  final d = DateTime(date.year, date.month, date.day);
  return !d.isBefore(ashWednesday(date.year)) &&
      !d.isAfter(goodFriday(date.year));
}
