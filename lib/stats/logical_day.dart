/// 논리 날짜(하루의 시작 시각 기준). 독서공방 `dayKey`/`ymdKey`/`parseDayKey`/`shiftDayKey`/`dayGap` 이식.
///
/// 새벽에 바친 기도를 전날로 세기 위해 하루는 [defaultDayStartHour]시(설정 가능)에 시작한다.
/// 모든 통계 날짜는 이 파일의 함수를 거친다(`DateTime.day` 를 직접 쓰지 않는다). 키는
/// 'YYYY-MM-DD' 문자열이라 사전순 비교가 곧 날짜 순서다.
library;

/// 하루의 시작 시각 기본값(새벽 4시).
const int defaultDayStartHour = 4;

/// 설정 가능한 하루 시작 시각 범위(0~7시).
const int maxDayStartHour = 7;

/// 범위 밖·이상한 값은 기본값으로 되돌린다(`dayStartHour()` 의 위생).
int sanitizeDayStartHour(Object? v) {
  final n = v is num && v.isFinite ? v.round() : null;
  if (n == null || n < 0 || n > maxDayStartHour) return defaultDayStartHour;
  return n;
}

/// 이미 '하루'를 가리키는 날짜를 'YYYY-MM-DD'로. 격자처럼 날짜를 직접 훑는 쪽에서 쓴다
/// (여기에 [dayKey]를 걸면 한 번 더 밀린다).
String ymdKey(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-'
    '${d.day.toString().padLeft(2, '0')}';

/// 기도한 시각 [at]이 속한 논리 날짜 키. 벽시계 기준으로 [startHour]시 전이면 전날이다
/// (서머타임 전환일에도 달력 그대로 맞는다).
String dayKey(DateTime at, {int startHour = defaultDayStartHour}) {
  final d = at.hour < startHour
      ? DateTime(at.year, at.month, at.day - 1)
      : DateTime(at.year, at.month, at.day);
  return ymdKey(d);
}

/// [dayKey]와 같은 날을 자정 00:00 로컬 날짜로.
DateTime logicalDate(DateTime at, {int startHour = defaultDayStartHour}) =>
    parseDayKey(dayKey(at, startHour: startHour));

/// 'YYYY-MM-DD' → 로컬 날짜. 형식이 틀리면 null.
DateTime? tryParseDayKey(String k) {
  final p = k.split('-');
  if (p.length != 3) return null;
  final y = int.tryParse(p[0]), m = int.tryParse(p[1]), d = int.tryParse(p[2]);
  if (y == null || m == null || d == null) return null;
  final out = DateTime(y, m, d);
  return ymdKey(out) == k ? out : null;
}

DateTime parseDayKey(String k) =>
    tryParseDayKey(k) ?? (throw FormatException('날짜 키가 아니에요', k));

/// [k]에서 달력으로 [days]일 뒤(음수는 앞)의 키.
String shiftDayKey(String k, int days) {
  final d = parseDayKey(k);
  return ymdKey(DateTime(d.year, d.month, d.day + days));
}

/// [b] - [a] 일수(달력 기준; 서머타임에도 정확하도록 UTC 로 센다).
int dayGap(String a, String b) {
  final x = parseDayKey(a), y = parseDayKey(b);
  return DateTime.utc(y.year, y.month, y.day)
      .difference(DateTime.utc(x.year, x.month, x.day))
      .inDays;
}
