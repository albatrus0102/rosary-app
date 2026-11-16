import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';

/// 통계 화면·스크린샷 시험용 예시 기록: 최근 약 10개월, 요일별 신비, 중간에 쉬어 간 달과
/// 이어 기도한 주, 새벽(00~03시) 기도, 가끔 부분 기도(2~3단)를 섞는다. 난수 없이 결정적이다.
List<PrayerRecord> sampleRecords(DateTime now) {
  final out = <PrayerRecord>[];
  final today = DateTime(now.year, now.month, now.day);
  for (var i = 0; i < 300; i++) {
    final day = DateTime(today.year, today.month, today.day - i);
    // 쉬어 간 구간(약 3주)과 듬성듬성한 구간.
    if (i >= 60 && i < 82) continue;
    final h = (i * 7 + 3) % 11;
    if (i > 100 && h > 4) continue;
    if (i > 30 && h == 9) continue;
    final set = mysterySetForWeekday(day.weekday);
    final partial = (i * 13) % 5 == 2;
    final hour = (i % 9 == 4) ? 0 : (i % 3 == 0 ? 6 : 21); // 가끔 자정 직후
    final minute = 10 + (i * 11) % 40;
    final decades = partial ? 2 + i % 2 : 5;
    out.add(
      PrayerRecord(
        id: 'sample-$i',
        at: DateTime(day.year, day.month, day.day, hour, minute),
        set: set,
        decades: decades,
        hailMarys: decades * 10 + (partial ? 0 : 3),
        completed: !partial,
        seconds: decades * 170 + (i % 4) * 40,
        source: i % 6 == 0 ? PrayerRecord.sourceChurch : PrayerRecord.sourceApp,
      ),
    );
  }
  return out;
}

PrayerStatsStore sampleStore(DateTime now) =>
    PrayerStatsStore.inMemory(sampleRecords(now));
