/// 사이버 성당 공용 상수 (SPEC §1, §2, §4).
library;

/// 서버 설정. [serverUrl]이 빈 문자열이면 혼자 모드만 동작한다.
///
/// 배포 후 빌드 시 `--dart-define=CHURCH_SERVER_URL=wss://host/ws` 로 주입하거나
/// 이 기본값을 바꾼다.
abstract final class ChurchConfig {
  static const String serverUrl = String.fromEnvironment('CHURCH_SERVER_URL');

  /// 프로토콜 버전.
  static const int protocolVersion = 1;

  /// 방 용량.
  static const int roomCapacity = 30;

  /// 방 번호 상한.
  static const int maxRoomNumber = 50;

  /// 방 이름 `<churchId>-<N>` (예 `stpeter-1`).
  static String roomName(String churchId, int n) => '$churchId-$n';

  /// 방 이름을 `(churchId, N)`으로 나눈다. 형식이 틀리면 null.
  static ({String churchId, int n})? parseRoomName(String room) {
    final m = RegExp(r'^([a-z]+)-(\d+)$').firstMatch(room);
    if (m == null) return null;
    final n = int.parse(m.group(2)!);
    if (n < 1 || n > maxRoomNumber) return null;
    return (churchId: m.group(1)!, n: n);
  }
}

/// 아바타 성별 값(와이어 `g`): 0 여성, 1 남성.
const int avatarFemale = 0;
const int avatarMale = 1;

/// 세례명 인덱스 상한(서버 `NAME_MAX`와 같다). 와이어의 `name`은 0..[baptismalNameMaxIndex].
///
/// 방식: `name`은 **성별(`g`)별 목록 안의 인덱스**다. `g=0`이면 [femaleBaptismalNames],
/// `g=1`이면 [maleBaptismalNames]를 본다. 두 목록은 각각 100개 이하여야 한다.
/// `g`가 없는 옛 클라이언트의 `name`은 [legacyBaptismalNames] 인덱스(0..39)다.
const int baptismalNameMaxIndex = 99;

/// 인기 순으로 칩에 크게 보여 줄 세례명 개수(각 목록의 앞쪽).
const int popularBaptismalCount = 12;

/// 세례명 고르기 화면의 '많이 쓰는 이름' 구역에 보여 줄 개수(각 목록의 앞쪽).
const int popularBaptismalShown = 8;

/// 여성 세례명(앞 12개가 인기순 상위). 순서 고정: 인덱스가 곧 와이어 값이다.
const List<String> femaleBaptismalNames = [
  '마리아',
  '안나',
  '엘리사벳',
  '데레사',
  '아녜스',
  '루치아',
  '마르타',
  '클라라',
  '카타리나',
  '체칠리아',
  '비비안나',
  '율리안나',
  '헬레나',
  '모니카',
  '로사',
  '막달레나',
  '소피아',
  '젬마',
  '베로니카',
  '에밀리아',
  '아가타',
  '바르바라',
  '마르가리타',
  '도로테아',
  '프란체스카',
  '로살리아',
  '리디아',
  '마틸다',
  '브리지다',
  '사비나',
  '수산나',
  '스콜라스티카',
  '안젤라',
  '에디타',
  '오틸리아',
  '우르술라',
  '유스티나',
  '이레네',
  '크리스티나',
  '파비올라',
  '프리스카',
  '필로메나',
  '율리아',
  '레지나',
  '베아트리체',
  '클라우디아',
  '라우라',
  '마리나',
  '마르첼라',
  '데보라',
  '레베카',
  '리타',
  '사라',
  '아나스타시아',
  '에우페미아',
  '에스테르',
  '요안나',
  '카롤리나',
  '카밀라',
  '콜레타',
  '테클라',
  '펠리치타스',
  '플로라',
  '힐데가르트',
  '게르트루다',
];

/// 남성 세례명(앞 12개가 인기순 상위). 순서 고정: 인덱스가 곧 와이어 값이다.
const List<String> maleBaptismalNames = [
  '요셉',
  '베드로',
  '바오로',
  '요한',
  '안드레아',
  '토마스',
  '프란치스코',
  '미카엘',
  '가브리엘',
  '라파엘',
  '스테파노',
  '마르코',
  '루카',
  '마태오',
  '야고보',
  '필립보',
  '바르톨로메오',
  '시몬',
  '유다 타대오',
  '마티아',
  '이냐시오',
  '알로이시오',
  '도미니코',
  '베네딕토',
  '아우구스티노',
  '요아킴',
  '라우렌시오',
  '세바스티아노',
  '니콜라오',
  '다니엘',
  '안토니오',
  '빈첸시오',
  '레오',
  '비오',
  '그레고리오',
  '암브로시오',
  '바실리오',
  '보나벤투라',
  '예로니모',
  '클레멘스',
  '막시밀리아노',
  '마르티노',
  '루도비코',
  '로베르토',
  '가롤로',
  '카밀로',
  '펠릭스',
  '다미아노',
  '에드문도',
  '에우세비오',
  '아드리아노',
  '알베르토',
  '엘리야',
  '율리오',
  '디오니시오',
  '이시도로',
  '크리스토포로',
  '에우제니오',
  '치릴로',
  '메토디오',
  '라자로',
  '모세',
  '레오나르도',
  '안셀모',
  '베르나르도',
  '보니파시오',
  '실베스테르',
  '마르첼로',
  '아타나시오',
  '스타니슬라오',
  '파트리치오',
];

/// 성별 `g`에 맞는 세례명 목록(0 여성, 그 밖은 남성).
List<String> baptismalNamesFor(int gender) =>
    gender == avatarMale ? maleBaptismalNames : femaleBaptismalNames;

/// 옛 클라이언트(성별 필드 `g` 없음)가 쓰던 세례명 목록(인덱스 0..39).
/// 0..19는 여성, 20..39는 남성이었다. 옛 저장값·옛 상대방을 읽을 때만 쓴다.
const List<String> legacyBaptismalNames = [
  '마리아',
  '안나',
  '엘리사벳',
  '마르타',
  '데레사',
  '아녜스',
  '체칠리아',
  '클라라',
  '루치아',
  '막달레나',
  '소피아',
  '로사',
  '카타리나',
  '베로니카',
  '젬마',
  '모니카',
  '비비안나',
  '율리안나',
  '헬레나',
  '에밀리아',
  '베드로',
  '바오로',
  '요한',
  '요셉',
  '안드레아',
  '토마스',
  '프란치스코',
  '미카엘',
  '가브리엘',
  '라파엘',
  '스테파노',
  '마르코',
  '루카',
  '마태오',
  '야고보',
  '필립보',
  '시몬',
  '다미아노',
  '아우구스티노',
  '베네딕토',
];

/// 검색 때 같은 이름으로 취급하는 다른 표기(개신교·외래식 표기 포함). 정식 이름 → 별칭.
const Map<String, List<String>> baptismalNameAliases = {
  '루치아': ['루시아'],
  '체칠리아': ['세실리아', '세실'],
  '율리안나': ['율리아나', '줄리아나'],
  '데레사': ['테레사', '테레지아'],
  '아녜스': ['아네스', '아그네스'],
  '엘리사벳': ['엘리자벳', '엘리자베스'],
  '카타리나': ['가타리나', '캐서린'],
  '비비안나': ['비비아나'],
  '막달레나': ['막달라'],
  '헬레나': ['엘레나'],
  '프란체스카': ['프랜시스'],
  '베드로': ['피터', '페트로'],
  '바오로': ['바울', '파울로', '폴'],
  '요셉': ['조셉', '요세프'],
  '요한': ['존', '요하네'],
  '안드레아': ['안드레'],
  '토마스': ['토마', '토머스'],
  '프란치스코': ['프란시스코', '프란체스코'],
  '미카엘': ['미가엘', '마이클'],
  '스테파노': ['스데반', '스테판', '스티븐'],
  '마르코': ['마가', '마크'],
  '루카': ['누가', '루가'],
  '마태오': ['마태', '마테오', '마태우스'],
  '야고보': ['야곱', '제임스'],
  '필립보': ['필립', '빌립'],
  '바르톨로메오': ['바르톨로메'],
  '유다 타대오': ['유다', '타대오', '다대오'],
  '마티아': ['맛디아'],
  '이냐시오': ['이그나시오'],
  '도미니코': ['도미니크'],
  '베네딕토': ['베네딕트'],
  '아우구스티노': ['어거스틴', '아우구스티누스'],
  '라우렌시오': ['로렌스', '로렌조'],
  '세바스티아노': ['세바스찬'],
  '니콜라오': ['니콜라스'],
  '요아킴': ['요하킴'],
  '알로이시오': ['알로이시우스'],
};

/// 세례명 검색. [query]가 비면 전체를 돌려준다. 앞부분이 맞는 이름을 먼저, 그다음 포함하는
/// 이름(별칭 포함)을 원래(인기) 순서대로 돌려준다. 공백은 무시한다. 결과는 목록 인덱스.
List<int> searchBaptismalNames(int gender, String query) {
  final names = baptismalNamesFor(gender);
  final q = query.replaceAll(RegExp(r'\s+'), '');
  if (q.isEmpty) return [for (var i = 0; i < names.length; i++) i];
  final starts = <int>[], contains = <int>[];
  for (var i = 0; i < names.length; i++) {
    final terms = [
      names[i],
      ...?baptismalNameAliases[names[i]],
    ].map((t) => t.replaceAll(' ', '')).toList();
    if (terms.any((t) => t.startsWith(q))) {
      starts.add(i);
    } else if (terms.any((t) => t.contains(q))) {
      contains.add(i);
    }
  }
  return [...starts, ...contains];
}

/// 세례명 고르기의 초성 색인 글자(가나다순). 쌍자음은 기본 자음 아래에 묶는다.
const List<String> baptismalInitials = [
  'ㄱ',
  'ㄴ',
  'ㄷ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅅ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
];

// 한글 음절의 초성 19개(유니코드 순서)를 [baptismalInitials]의 기본 자음으로 옮긴다.
const List<String> _choseongBase = [
  'ㄱ', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅂ', 'ㅅ', //
  'ㅅ', 'ㅇ', 'ㅈ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

/// 이름의 첫 글자 초성(쌍자음은 기본 자음). 한글 음절이 아니면 빈 문자열.
String baptismalInitial(String name) {
  if (name.isEmpty) return '';
  final code = name.runes.first - 0xAC00;
  if (code < 0 || code > 11171) return '';
  return _choseongBase[code ~/ 588];
}

/// 성별 [gender] 목록을 초성별로 묶는다. 있는 초성만 가나다순으로, 묶음 안은 가나다순 인덱스.
List<({String initial, List<int> indices})> groupBaptismalNames(int gender) {
  final names = baptismalNamesFor(gender);
  final order = [for (var i = 0; i < names.length; i++) i]
    ..sort((a, b) => names[a].compareTo(names[b]));
  final groups = <String, List<int>>{};
  for (final i in order) {
    groups.putIfAbsent(baptismalInitial(names[i]), () => []).add(i);
  }
  return [
    for (final ini in baptismalInitials)
      if (groups[ini] != null) (initial: ini, indices: groups[ini]!),
  ];
}

/// 검색어 [query]가 이름 자체가 아니라 다른 표기(별칭)로만 맞았을 때 그 표기. 아니면 null.
String? baptismalAliasMatch(int gender, int index, String query) {
  final q = query.replaceAll(RegExp(r'\s+'), '');
  if (q.isEmpty) return null;
  final name = baptismalNamesFor(gender)[index];
  if (name.replaceAll(' ', '').contains(q)) return null;
  for (final a in baptismalNameAliases[name] ?? const <String>[]) {
    if (a.replaceAll(' ', '').contains(q)) return a;
  }
  return null;
}

/// 성별 [gender] 목록에서 [name]의 인덱스. 없으면 -1.
int baptismalIndexOf(int gender, String name) =>
    baptismalNamesFor(gender).indexOf(name);

/// 성별을 바꿀 때의 세례명 인덱스: 같은 이름이 새 목록에 있으면 그것을, 없으면 가장 인기 있는
/// 첫 이름(0)을 쓴다.
int convertBaptismalName(int fromGender, int index, int toGender) {
  if (fromGender == toGender) return index;
  final from = baptismalNamesFor(fromGender);
  if (index < 0 || index >= from.length) return 0;
  final i = baptismalIndexOf(toGender, from[index]);
  return i < 0 ? 0 : i;
}

/// 촛불 지향 프리셋(인덱스 0..7).
const List<String> candleIntentions = [
  '가족과 이웃을 위해',
  '아픈 이들을 위해',
  '세상의 평화를 위해',
  '돌아가신 이들을 위해',
  '감사의 마음으로',
  '시험과 일을 위해',
  '통회와 용서를 위해',
  '나라와 교회를 위해',
];

/// 신비 이름(`ms` 0..3: 환희, 빛, 고통, 영광).
const List<String> churchMysteryNames = ['환희의 신비', '빛의 신비', '고통의 신비', '영광의 신비'];

/// 신자석 줄 수, 줄당 좌석 수, 촛불 슬롯 수.
const int churchRowCount = 12;
const int churchSeatsPerRow = 6;
const int churchCandleSlots = 24;

/// 줄 r의 z 위치(미터).
double churchRowZ(int row) => -10 + 1.9 * row;

/// 좌석 id. [side]는 `'L'` 또는 `'R'`, [row] 0..11, [idx] 0..5. 예: `L03-2`.
String seatId(String side, int row, int idx) {
  assert(side == 'L' || side == 'R');
  return '$side${row.toString().padLeft(2, '0')}-$idx';
}

/// 파싱된 좌석.
class ChurchSeat {
  const ChurchSeat(this.side, this.row, this.idx);

  final String side;
  final int row;
  final int idx;

  String get id => seatId(side, row, idx);

  /// 좌석 중심 x (L: -3.2 - idx, R: 3.2 + idx).
  double get x => side == 'L' ? -3.2 - idx : 3.2 + idx;

  /// 좌석 중심 z (줄 z + 0.35).
  double get z => churchRowZ(row) + 0.35;

  @override
  bool operator ==(Object other) =>
      other is ChurchSeat &&
      other.side == side &&
      other.row == row &&
      other.idx == idx;

  @override
  int get hashCode => Object.hash(side, row, idx);

  @override
  String toString() => 'ChurchSeat($id)';
}

final RegExp _seatPattern = RegExp(r'^([LR])(\d{2})-(\d)$');

/// 좌석 id를 해석한다. 형식이나 범위가 틀리면 null.
ChurchSeat? parseSeat(String id) {
  final m = _seatPattern.firstMatch(id);
  if (m == null) return null;
  final row = int.parse(m.group(2)!);
  final idx = int.parse(m.group(3)!);
  if (row >= churchRowCount || idx >= churchSeatsPerRow) return null;
  return ChurchSeat(m.group(1)!, row, idx);
}
