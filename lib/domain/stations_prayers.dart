// 십자가의 길 공식 기도문(한국천주교주교회의 『가톨릭 기도서』 개정판 ‘십자가의 길’).
//
// 원본은 `data/stations_prayers.json`이고 `stations_prayers_data.dart`는 생성 파일이다
// (`python3 tools/stations/build_stations.py`). 글자·줄 나눔·기호는 주교회의 누리집 전자 본문
// 그대로이며 앱에서 고치지 않는다(대조표 `docs/church/PRAYER_VERIFICATION.md`).
//
// 기호의 뜻은 같은 기도서 일러두기 4항을 따른다: ┼ 집전자 또는 주송자, ○ 계 또는 선창자,
// ● 응, ◎ 합송. 지시문(공식 본문의 붉은 글씨)은 [StationsPrayerLine.rubric]으로 구분한다.

part 'stations_prayers_data.dart';

/// 기도문 앞 기호가 뜻하는 역할(『가톨릭 기도서』 일러두기 4항).
enum StationsPrayerRole {
  /// ┼ 집전자 또는 주송자.
  leader,

  /// ○ 계 또는 선창자.
  cantor,

  /// ● 응.
  response,

  /// ◎ 합송.
  all;

  /// 공식 기호. '┼', '○', '●', '◎'.
  String get glyph => _markers[index].$1;

  /// 일러두기에 적힌 뜻 그대로. 예: '집전자 또는 주송자'.
  String get official => _markers[index].$2;

  /// 화면 범례·화면 낭독용 짧은 이름. 예: '주송자', '다 함께'.
  String get label => _markers[index].$3;
}

/// 기도문 한 줄. [rubric]이면 지시문(예: '깊은 절을 하며')이다.
class StationsPrayerLine {
  const StationsPrayerLine(this.text) : rubric = false;
  const StationsPrayerLine.rubric(this.text) : rubric = true;

  final String text;
  final bool rubric;
}

/// 기호 하나가 이끄는 기도문 한 덩어리.
class StationsPrayerPart {
  const StationsPrayerPart({required this.role, required this.lines});

  final StationsPrayerRole role;
  final List<StationsPrayerLine> lines;

  /// 지시문을 뺀 기도문 줄.
  List<String> get spoken => [
    for (final l in lines)
      if (!l.rubric) l.text,
  ];
}

/// 한 처에서 바치는 공식 기도문(순서대로).
class StationPrayer {
  const StationPrayer({
    required this.n,
    required this.movingRubric,
    required this.moving,
    required this.announce,
    required this.verse,
    required this.prayer,
    required this.after,
  });

  /// 1..14
  final int n;

  /// 지시문 '제N처로 가며'.
  final String movingRubric;

  /// ◎ 어머니께 청하오니 … (공식 본문은 2처부터 줄여 적지만 같은 두 줄이다).
  final StationsPrayerPart moving;

  /// '예수님께서 사형 선고 받으심을 묵상합시다.' (공식 본문에서 '제N처' 뒤에 오는 문장).
  final String announce;

  /// ┼ 주님께서는 … / ◎ 예수 그리스도님, … (모든 처 공통).
  final List<StationsPrayerPart> verse;

  /// ○ 처별 기도.
  final StationsPrayerPart prayer;

  /// 기도 뒤 지시문: '잠깐 묵상한다.', '주님의 기도, 성모송, 영광송.'
  final List<String> after;

  /// 기호가 붙는 덩어리 전부(순서대로).
  List<StationsPrayerPart> get parts => [moving, ...verse, prayer];
}

/// 십자가의 길 공식 기도문과 출처.
abstract final class StationsPrayers {
  /// 데이터 판(원본 JSON의 version).
  static const int dataVersion = _prayersVersion;

  /// 시작 전 지시문 2줄(바치는 때, '먼저 깊이 뉘우치고 아래의 기도를 바친다.').
  static const List<String> introRubrics = _introRubrics;

  /// ┼ 시작 기도('주 예수님, …').
  static const StationsPrayerPart opening = _openingPart;

  /// 지시문 '먼저 깊이 뉘우치고 아래의 기도를 바친다.'
  static String get openingRubric => _introRubrics.last;

  /// [n]처(1..14)의 기도문. 범위를 벗어나면 가장 가까운 처.
  static StationPrayer of(int n) {
    final i = n.clamp(1, _stationPrayers.length);
    final (announce, lines) = _stationPrayers[i - 1];
    return StationPrayer(
      n: i,
      movingRubric: _toStationRubric.replaceAll('{n}', '$i'),
      moving: _toStationPart,
      announce: announce,
      verse: _versePart,
      prayer: StationsPrayerPart(
        role: StationsPrayerRole.cantor,
        lines: [for (final l in lines) StationsPrayerLine(l)],
      ),
      after: _afterRubrics,
    );
  }

  /// 14처 전부.
  static List<StationPrayer> get all => [
    for (var n = 1; n <= _stationPrayers.length; n++) of(n),
  ];

  /// 십자가의 길 기도문에 실제로 나오는 기호(범례용, 나오는 순서).
  static const List<StationsPrayerRole> rolesUsed = [
    StationsPrayerRole.leader,
    StationsPrayerRole.all,
    StationsPrayerRole.cantor,
  ];

  /// '『가톨릭 기도서』(개정판)'.
  static const String sourceTitle = _sourceTitle;

  /// '한국천주교주교회의'.
  static const String sourcePublisher = _sourcePublisher;

  /// 판본. '주교회의 2017년 추계 정기 총회 승인, 2018년 4월 1일 펴냄'.
  static const String sourceEdition = _sourceEdition;

  /// 공식 게시본 주소.
  static const String sourceUrl = _sourceUrl;

  /// 저작권 표기.
  static const String sourceCopyright = _sourceCopyright;

  /// 기도문 아래 한 줄 출처.
  static const String sourceCredit = _sourceCredit;
}
