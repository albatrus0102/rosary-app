/// 사이버 성당 공용 상수 (SPEC §1, §2, §4).
library;

import 'baptismal_names_data.dart';

export 'baptismal_names_data.dart'
    show baptismalNameCount, defaultBaptismalNameIndex;

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

/// 아바타 성별 값(와이어 `g`): 0 여성, 1 남성. 아바타 외형에만 쓴다(세례명 범위와 무관).
const int avatarFemale = 0;
const int avatarMale = 1;

/// 세례명 인덱스 상한(서버 `NAME_MAX`와 같다). 와이어의 `name`은 0..[baptismalNameMaxIndex].
///
/// 방식: `name`은 성별과 무관한 **통합 세례명 목록**([baptismalNames]) 안의 인덱스다.
/// 아바타 JSON 의 `nv`가 [avatarNameVersion]이면 이 형식이고, `nv`가 없으면 옛 형식
/// (성별별 목록 인덱스, 또는 `g`도 없으면 옛 40개 목록 인덱스)이라 [migrateBaptismalName]으로
/// 옮겨 읽는다.
const int baptismalNameMaxIndex = 4095;

/// 아바타 JSON 의 이름 형식 버전(`nv`). 2 = 통합 목록 인덱스.
const int avatarNameVersion = 2;

/// 첫 입장 때 무작위로 고르는 인기 세례명 개수(성별별 인기순 앞쪽).
const int popularBaptismalCount = 12;

/// 세례명 고르기 화면의 '많이 쓰는 이름' 구역에 보여 줄 개수(성별별 인기순 앞쪽).
const int popularBaptismalShown = 8;

/// 통합 세례명 목록(성별 구분 없음, 가나다순 + 끝에 옛 목록에만 있던 이름). 순서 고정:
/// 인덱스가 곧 와이어 값이다. `tools/names/build_names.py`가 만든 데이터에서 한 번만 푼다.
final List<String> baptismalNames = List.unmodifiable(
  baptismalNamesJoined.split('\n'),
);

final Map<String, int> _nameIndex = {
  for (var i = 0; i < baptismalNames.length; i++) baptismalNames[i]: i,
};

/// 인덱스 [index]의 세례명. 범위를 벗어나면 기본 이름(마리아).
String baptismalNameOf(int index) =>
    baptismalNames[index >= 0 && index < baptismalNames.length
        ? index
        : defaultBaptismalNameIndex];

/// 통합 목록에서 [name]의 인덱스. 없으면 -1.
int baptismalIndexOf(String name) => _nameIndex[name] ?? -1;

/// 성별 [gender]에서 흔히 쓰는 이름들의 통합 목록 인덱스(인기순; 여성 65개, 남성 71개).
/// '많이 쓰는 이름'·무작위 고르기에 쓴다. 이름 선택 범위 자체는 성별과 무관하게 전체다.
List<int> commonBaptismalIndicesFor(int gender) =>
    gender == avatarMale ? oldMaleNameIndices : oldFemaleNameIndices;

/// 성별 [gender]의 인기 이름 [count]개(통합 목록 인덱스, 인기순).
List<int> popularBaptismalIndices(
  int gender, [
  int count = popularBaptismalShown,
]) => commonBaptismalIndicesFor(gender).take(count).toList(growable: false);

/// 옛 형식의 세례명 인덱스를 통합 목록 인덱스로 옮긴다. [gender]가 있으면 옛 성별별 목록
/// 인덱스, null이면 `g`가 없던 옛 40개 목록 인덱스다. 범위를 벗어나면 기본 이름(마리아).
int migrateBaptismalName(int oldIndex, {int? gender}) {
  final table = gender == null
      ? legacyNameIndices
      : commonBaptismalIndicesFor(gender);
  if (oldIndex < 0 || oldIndex >= table.length) {
    return defaultBaptismalNameIndex;
  }
  return table[oldIndex];
}

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

// 가나다순으로 늘어놓은 통합 목록 인덱스(끝에 덧붙인 이름도 제자리에 들어간다). 한 번만 계산.
final List<int> _sortedNameOrder = List.unmodifiable(
  [for (var i = 0; i < baptismalNames.length; i++) i]
    ..sort((a, b) => baptismalNames[a].compareTo(baptismalNames[b])),
);

const String _choseongCompat = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

/// 글의 한글 음절을 초성 글자로 바꾼다(공백 제거, 다른 글자는 그대로). 예: '마리아' → 'ㅁㄹㅇ'.
String baptismalChoseong(String text) {
  final b = StringBuffer();
  for (final r in text.runes) {
    if (r == 0x20) continue;
    final code = r - 0xAC00;
    if (code >= 0 && code <= 11171) {
      b.write(_choseongCompat[code ~/ 588]);
    } else {
      b.writeCharCode(r);
    }
  }
  return b.toString();
}

// 검색용 색인(이름마다 공백 뺀 이름, 초성 줄, 공백 뺀 별칭). 처음 검색할 때 한 번만 만든다.
final List<({String plain, String initials, List<String> aliases})>
_searchIndex = List.unmodifiable([
  for (final n in baptismalNames)
    (
      plain: n.replaceAll(' ', ''),
      initials: baptismalChoseong(n),
      aliases: [
        for (final a in baptismalNameAliases[n] ?? const <String>[])
          a.replaceAll(' ', ''),
      ],
    ),
]);

final RegExp _onlyChoseong = RegExp('^[ㄱ-ㅎ]+\$');

/// 세례명 검색. [query]가 비면 전체(가나다순)를 돌려준다. 앞부분이 맞는 이름을 먼저, 그다음
/// 포함하는 이름(별칭 포함)을 가나다순으로 돌려준다. 공백은 무시한다. 검색어가 자음만이면
/// (예: 'ㅁㄹㅇ') 초성으로 찾는다. 결과는 통합 목록 인덱스.
List<int> searchBaptismalNames(String query) {
  final q = query.replaceAll(RegExp(r'\s+'), '');
  if (q.isEmpty) return _sortedNameOrder;
  final byInitials = _onlyChoseong.hasMatch(q);
  final starts = <int>[], contains = <int>[];
  for (final i in _sortedNameOrder) {
    final e = _searchIndex[i];
    if (byInitials) {
      if (e.initials.startsWith(q)) {
        starts.add(i);
      } else if (e.initials.contains(q)) {
        contains.add(i);
      }
    } else if (e.plain.startsWith(q) || e.aliases.any((t) => t.startsWith(q))) {
      starts.add(i);
    } else if (e.plain.contains(q) || e.aliases.any((t) => t.contains(q))) {
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

/// 한글로 시작하지 않는 이름(숫자·영문 등)을 묶는 구역 이름.
const String baptismalOtherInitial = '#';

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

/// 통합 목록을 초성별로 묶는다. 있는 초성만 가나다순으로, 묶음 안은 가나다순 인덱스.
/// 한글로 시작하지 않는 이름이 있으면 맨 끝 [baptismalOtherInitial] 구역에 모은다.
/// 한 번만 계산해 둔다(이름이 수천 개여도 화면을 열 때마다 다시 정렬하지 않는다).
List<({String initial, List<int> indices})> groupBaptismalNames() =>
    _nameGroups;

final List<({String initial, List<int> indices})> _nameGroups = () {
  final groups = <String, List<int>>{};
  for (final i in _sortedNameOrder) {
    final ini = baptismalInitial(baptismalNames[i]);
    groups
        .putIfAbsent(ini.isEmpty ? baptismalOtherInitial : ini, () => [])
        .add(i);
  }
  return List<({String initial, List<int> indices})>.unmodifiable([
    for (final ini in [...baptismalInitials, baptismalOtherInitial])
      if (groups[ini] != null)
        (initial: ini, indices: List<int>.unmodifiable(groups[ini]!)),
  ]);
}();

/// 검색어 [query]가 이름 자체가 아니라 다른 표기(별칭)로만 맞았을 때 그 표기. 아니면 null.
String? baptismalAliasMatch(int index, String query) {
  final q = query.replaceAll(RegExp(r'\s+'), '');
  if (q.isEmpty || index < 0 || index >= baptismalNames.length) return null;
  final name = baptismalNames[index];
  if (name.replaceAll(' ', '').contains(q)) return null;
  for (final a in baptismalNameAliases[name] ?? const <String>[]) {
    if (a.replaceAll(' ', '').contains(q)) return a;
  }
  return null;
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
