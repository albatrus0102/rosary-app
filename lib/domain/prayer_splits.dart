import 'prayer_data.dart';

/// 기도 id -> 뒷단(후창)이 시작하는 줄 번호(0-based, text를 '\n'으로 나눈 인덱스).
///
/// 목록에 없는 기도(성호경)는 나뉘지 않고 전부 함께 바친다.
const Map<String, int> responderStartLine = {
  'apostles_creed': 8, // 그리로부터 산 이와 죽은 이를 심판하러 오시리라 믿나이다.
  'our_father': 5, // 오늘 저희에게 일용할 양식을 주시고
  'hail_mary': 3, // 천주의 성모 마리아님,
  'glory_be': 1, // 처음과 같이
  'fatima': 2, // 연옥 영혼을 돌보시며
};

/// [p]를 앞단과 뒷단으로 나눈다. 나뉘지 않는 기도는 leader = 전체, responder = ''.
///
/// 나뉘는 경우 `'$leader\n$responder' == p.text` 이다.
({String leader, String responder}) splitPrayer(Prayer p) {
  final start = responderStartLine[p.id];
  if (start == null) return (leader: p.text, responder: '');
  final lines = p.text.split('\n');
  if (start <= 0 || start >= lines.length) {
    return (leader: p.text, responder: '');
  }
  return (
    leader: lines.sublist(0, start).join('\n'),
    responder: lines.sublist(start).join('\n'),
  );
}
