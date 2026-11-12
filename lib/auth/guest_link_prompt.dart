import 'package:shared_preferences/shared_preferences.dart';

/// '기록 지키기'(게스트 → 로그인 연결)를 슬쩍 권해도 되는 때를 정하는 도우미.
///
/// UI 자리는 이 모듈을 쓰는 화면이 정한다. 여기서는 판단과 기록만 한다:
///  * 처음 쓴 지 [linkSuggestAfterDays]일 이상이거나 기도 기록이 [linkSuggestAfterRecords]개
///    이상이면 권한다.
///  * 한 번 권한 뒤에는 [linkSuggestMinGapDays]일 안에 다시 권하지 않는다(최대
///    [linkSuggestMaxCount]번).
const int linkSuggestAfterDays = 7;
const int linkSuggestAfterRecords = 7;
const int linkSuggestMinGapDays = 30;
const int linkSuggestMaxCount = 3;

const String _kFirstSeen = 'guest.first_seen';
const String _kLastSuggested = 'guest.link_suggested_at';
const String _kSuggestCount = 'guest.link_suggested_count';

/// 순수 규칙(테스트용). [lastSuggested]가 null이면 아직 권한 적이 없다.
bool linkSuggestionDue({
  required DateTime firstSeen,
  required int records,
  required DateTime now,
  DateTime? lastSuggested,
  int suggestedCount = 0,
}) {
  if (suggestedCount >= linkSuggestMaxCount) return false;
  final usedDays = now.difference(firstSeen).inDays;
  final enough =
      usedDays >= linkSuggestAfterDays || records >= linkSuggestAfterRecords;
  if (!enough) return false;
  if (lastSuggested != null &&
      now.difference(lastSuggested).inDays < linkSuggestMinGapDays) {
    return false;
  }
  return true;
}

DateTime? _readTime(SharedPreferences prefs, String key) {
  final ms = prefs.getInt(key);
  return ms == null ? null : DateTime.fromMillisecondsSinceEpoch(ms);
}

/// 지금 '기록 지키기'를 권해야 하는가(게스트일 때만 부를 것). 이 호출은 아무것도 쓰지
/// 않는다. 실제로 보여 줬으면 [markLinkingSuggested]를 부른다.
///
/// [firstSeen]은 [guestFirstSeen]의 값, [records]는 지금까지 쌓인 기도 기록 수.
/// 저장소를 읽지 못하면 false(권하지 않는다).
Future<bool> shouldSuggestLinking({
  required DateTime firstSeen,
  required int records,
  DateTime? now,
  SharedPreferences? prefs,
}) async {
  try {
    final p = prefs ?? await SharedPreferences.getInstance();
    return linkSuggestionDue(
      firstSeen: firstSeen,
      records: records,
      now: now ?? DateTime.now(),
      lastSuggested: _readTime(p, _kLastSuggested),
      suggestedCount: p.getInt(_kSuggestCount) ?? 0,
    );
  } catch (_) {
    return false;
  }
}

/// 권유를 보여 줬음을 기록한다(30일 안에는 다시 권하지 않는다).
Future<void> markLinkingSuggested({
  DateTime? now,
  SharedPreferences? prefs,
}) async {
  try {
    final p = prefs ?? await SharedPreferences.getInstance();
    await p.setInt(
      _kLastSuggested,
      (now ?? DateTime.now()).millisecondsSinceEpoch,
    );
    await p.setInt(_kSuggestCount, (p.getInt(_kSuggestCount) ?? 0) + 1);
  } catch (_) {}
}

/// 이 기기에서 게스트로 처음 쓴 시각. 없으면 지금을 기록해 돌려준다.
Future<DateTime> guestFirstSeen({
  DateTime? now,
  SharedPreferences? prefs,
}) async {
  final t = now ?? DateTime.now();
  try {
    final p = prefs ?? await SharedPreferences.getInstance();
    final existing = _readTime(p, _kFirstSeen);
    if (existing != null) return existing;
    await p.setInt(_kFirstSeen, t.millisecondsSinceEpoch);
  } catch (_) {}
  return t;
}
