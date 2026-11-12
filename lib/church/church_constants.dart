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

/// 세례명 목록(인덱스 0..39, 순서 고정).
const List<String> baptismalNames = [
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
