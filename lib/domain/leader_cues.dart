import 'prayer_data.dart';
import 'prayer_splits.dart';

/// 후창 모드에서 재생할 선창(앞단) 음성 한 건. 사용자가 직접 녹음한다.
class LeaderCue {
  const LeaderCue({required this.id, required this.title, required this.text});

  /// 파일 이름에도 쓰이는 식별자. 예: 'hail_mary', 'mystery_joyful_1'.
  final String id;

  /// 목록에 보여줄 제목. 예: '성모송', '환희의 신비 1단'.
  final String title;

  /// 녹음할 문구(앞단).
  final String text;
}

/// 기도의 선창 큐 id. 기도 id와 같다.
String prayerCueId(Prayer prayer) => prayer.id;

/// 신비 한 단의 선창 큐 id. 예: 'mystery_joyful_1'.
String mysteryCueId(Mystery mystery) =>
    'mystery_${mystery.set.name}_${mystery.index}';

/// 선창 큐 전체(26개). 기도 6개가 먼저, 이어서 신비 20개(환희, 빛, 고통, 영광 순).
final List<LeaderCue> allLeaderCues = List.unmodifiable([
  for (final prayer in const [
    Prayers.signOfCross,
    Prayers.apostlesCreed,
    Prayers.ourFather,
    Prayers.hailMary,
    Prayers.gloryBe,
    Prayers.fatima,
  ])
    LeaderCue(
      id: prayerCueId(prayer),
      title: prayer.title,
      text: splitPrayer(prayer).leader,
    ),
  for (final set in MysterySet.values)
    for (final mystery in set.mysteries)
      LeaderCue(
        id: mysteryCueId(mystery),
        title: mystery.title,
        text: '${mystery.title}\n${mystery.meditation}',
      ),
]);

/// 기도 큐(앞의 6개) 개수.
const int leaderPrayerCueCount = 6;
