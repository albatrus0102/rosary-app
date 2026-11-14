// 십자가의 길 그림 연작(대체 성화)과 성당별 배정.
//
// 각 성당에 실제로 걸린 14처는 쓸 수 없어(대부분 미확인·현대 저작물) 저작권이 끝난 여러 시대의
// 연작을 성당마다 나눠 건다. 그래서 앱 안 어디서나 '대체 성화'임을 밝힌다([StationsSeriesCatalog.disclosure]).
// 원본은 `data/stations_series.json`, `stations_series_data.dart`는 생성 파일이다
// (`python3 tools/stations/build_stations.py`). 그림 파일은 `tools/stations/build_series.py`가 만든다.

part 'stations_series_data.dart';

/// 번들에 허용하는 라이선스(이 밖의 것은 생성기가 거부한다).
enum StationsLicense {
  /// 퍼블릭 도메인(작가 사후 70년 경과·오래된 간행물).
  pd,

  /// CC0 1.0.
  cc0,

  /// CC BY(촬영자·라이선스 링크·변경 여부 표기 의무).
  ccBy,
}

/// 한 화가(또는 한 책)의 14처 연작.
class StationsSeries {
  const StationsSeries({
    required this.id,
    required this.title,
    required this.short,
    required this.artist,
    required this.year,
    required this.artistDeath,
    required this.place,
    required this.photographer,
    required this.license,
    required this.licenseLabel,
    required this.licenseUrl,
    required this.source,
    required this.changes,
    required this.rights,
    required this.rightsNote,
    required this.aspect,
    required this.cover,
    required this.assetDir,
    required this.fileUrls,
  });

  final String id;

  /// '가에타노 프레비아티 〈십자가의 길〉'.
  final String title;

  /// 짧은 이름(목록·칩). '프레비아티 연작'.
  final String short;
  final String artist;

  /// 제작(발행) 연도 표기. '1901–02'.
  final String year;

  /// 작가 사망 연도(모르면 null).
  final int? artistDeath;

  /// 소장처 또는 실린 책.
  final String place;

  /// 사진을 찍은(스캔한) 사람·기관.
  final String photographer;
  final StationsLicense license;

  /// 'CC BY 3.0', 'Public domain' 등.
  final String licenseLabel;
  final String licenseUrl;

  /// 연작 출처(분류·책) 주소.
  final String source;

  /// 원본에서 바꾼 점(CC BY 표기 항목).
  final String changes;

  /// 권리 확인 상태: '확인' 또는 '출시 전 확인'.
  final String rights;
  final String rightsNote;

  /// 그림의 대략 가로/세로 비.
  final double aspect;

  /// true 면 틀에 맞춰 잘라 채운다(푸겔), false 면 비율을 지켜 다 보이게 한다.
  final bool cover;
  final String assetDir;

  /// 1~14처 원본 파일 설명 쪽 주소.
  final List<String> fileUrls;

  /// [n]처(1..14) 그림(가로 600px 이하 WebP).
  String imageAsset(int n) =>
      '$assetDir/station_${n.clamp(1, 14).toString().padLeft(2, '0')}.webp';

  /// [n]처 원본 파일 주소.
  String fileUrl(int n) => fileUrls[n.clamp(1, 14) - 1];

  /// 묵상 시트의 출처 한 줄: 작가·작품·연도·소장처·촬영자·라이선스(·변경).
  String get creditLine =>
      '$title, $year, $place. 사진·스캔 $photographer. $licenseLabel. $changes.';
}

/// 연작 목록과 성당 id → 연작 배정.
abstract final class StationsSeriesCatalog {
  static const List<StationsSeries> all = _series;

  /// 성당 id → 연작 id.
  static const Map<String, String> assignments = _assignments;

  /// 그림을 보여 주는 모든 곳에 함께 적는 안내.
  static const String disclosure = _disclosure;

  /// 기본 연작(배정이 없는 성당·성당 밖).
  static StationsSeries get fallback => byId(_defaultSeriesId);

  static StationsSeries byId(String? id) => all.firstWhere(
    (s) => s.id == id,
    orElse: () => all.firstWhere((s) => s.id == _defaultSeriesId),
  );

  /// [churchId] 성당에 거는 연작(모르는 성당이면 기본 연작).
  static StationsSeries forChurch(String? churchId) =>
      byId(assignments[churchId]);

  /// [series]를 거는 성당 id 들.
  static List<String> churchesOf(StationsSeries series) => [
    for (final e in assignments.entries)
      if (e.value == series.id) e.key,
  ];
}
