import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/domain/rosary_session.dart';
import 'package:rosary_app/stats/prayer_session_tracker.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';

class _Clock {
  DateTime t = DateTime(2026, 11, 12, 8);
  DateTime call() => t;
  void advance(Duration d) => t = t.add(d);
}

void advance(RosarySession s, int n) {
  for (var i = 0; i < n; i++) {
    s.next();
  }
}

void main() {
  late PrayerStatsStore store;
  late RosarySession session;
  late _Clock clock;
  late PrayerSessionTracker tracker;

  PrayerSessionTracker make({MysterySet set = MysterySet.joyful}) =>
      PrayerSessionTracker(
        store: store,
        session: session,
        mysterySet: set,
        now: clock.call,
      );

  setUp(() {
    store = PrayerStatsStore.inMemory();
    session = RosarySession(buildRosarySequence(MysterySet.joyful));
    clock = _Clock();
    tracker = make()..start();
  });

  tearDown(() => session.dispose());

  test('스텝 구조 가정: 73스텝', () {
    expect(session.steps, hasLength(73));
  });

  test('서두 성모송 3개 → 1단까지 개수 계산', () async {
    advance(session, 6); // 인덱스 6: 서두 성모송 3개 지남
    expect(tracker.hailMarys, 3);
    expect(tracker.decades, 0);
    advance(session, 14); // 인덱스 20: 1단 구원송까지 지남
    expect(tracker.hailMarys, 13);
    expect(tracker.decades, 1);
    await tracker.finish();
    expect(store.records, hasLength(1));
    final r = store.records.single;
    expect((r.decades, r.hailMarys, r.completed), (1, 13, false));
    expect(r.set, MysterySet.joyful);
    expect(r.source, 'app');
  });

  test('앞뒤로 오가도 두 번 세지 않는다', () async {
    advance(session, 20);
    for (var i = 0; i < 5; i++) {
      session.back();
      session.back();
      session.next();
      session.next();
    }
    session.jumpTo(8);
    session.jumpTo(20);
    expect(tracker.hailMarys, 13);
    expect(tracker.decades, 1);
    await tracker.finish();
    expect(store.records.single.hailMarys, 13);
  });

  test('jumpTo 앞으로: 건너뛴 만큼은 최대 인덱스 기준으로 계산', () async {
    session.jumpTo(72);
    expect(tracker.decades, 5);
    expect(tracker.hailMarys, 53);
    session.jumpTo(0);
    expect(tracker.decades, 5);
    await tracker.finish();
    expect(store.records.single.decades, 5);
    expect(store.records.single.completed, isFalse);
  });

  test('이어하기 기준선: 시작 인덱스 이전 것은 세지 않는다', () async {
    final resumed = RosarySession(buildRosarySequence(MysterySet.sorrowful))
      ..jumpTo(20); // 1단까지 끝낸 상태에서 이어서
    final t = PrayerSessionTracker(
      store: store,
      session: resumed,
      mysterySet: MysterySet.sorrowful,
      now: clock.call,
    )..start();
    advance(resumed, 12); // 인덱스 32: 2단 성모송 10개, 구원송은 아직
    expect(t.hailMarys, 10);
    expect(t.decades, 0);
    advance(resumed, 1); // 인덱스 33: 2단 구원송 지남
    expect(t.hailMarys, 10);
    expect(t.decades, 1);
    await t.finish();
    expect(store.records.single.set, MysterySet.sorrowful);
    expect(store.records.single.decades, 1);
    expect(store.records.single.hailMarys, 10);
    resumed.dispose();
  });

  test('끝까지 가면 즉시 완주 기록 1개, finish는 멱등', () async {
    advance(session, 72);
    expect(store.records, isEmpty);
    session.next(); // 마침 다음 -> finished
    await Future<void>.delayed(Duration.zero);
    expect(store.records, hasLength(1));
    final r = store.records.single;
    expect(r.completed, isTrue);
    expect(r.decades, 5);
    expect(r.hailMarys, 53);
    await tracker.finish();
    await tracker.finish();
    expect(store.records, hasLength(1));
  });

  test('완주 후 되돌아가도 완주를 다시 쓰지 않고, restart하면 새 기록', () async {
    advance(session, 73);
    await Future<void>.delayed(Duration.zero);
    expect(store.records, hasLength(1));

    // 끝에서 한 칸 되돌렸다 다시 끝내기: 새 완주로 치지 않는다.
    session.back();
    session.next();
    await tracker.finish().then((_) {});
    expect(store.records, hasLength(1));
  });

  test('restart 후 다시 기도하면 새 기록이 쓰인다', () async {
    advance(session, 73);
    await Future<void>.delayed(Duration.zero);
    expect(store.records, hasLength(1));
    clock.advance(const Duration(minutes: 1));
    session.restart();
    advance(session, 73);
    await Future<void>.delayed(Duration.zero);
    expect(store.records, hasLength(2));
    expect(store.records.where((r) => r.completed), hasLength(2));
    expect(store.calc.completedAll(), 2);
  });

  test('restart 후 중간에 나가면 부분 기록', () async {
    advance(session, 73);
    await Future<void>.delayed(Duration.zero);
    session.restart();
    advance(session, 20);
    await tracker.finish();
    expect(store.records, hasLength(2));
    final partial = store.records.firstWhere((r) => !r.completed);
    expect((partial.decades, partial.hailMarys), (1, 13));
  });

  test('진행이 없으면 아무것도 쓰지 않는다', () async {
    clock.advance(const Duration(minutes: 5));
    session.next(); // 성호경 -> 사도신경: 성모송 0
    session.back();
    await tracker.finish();
    expect(store.records, isEmpty);
  });

  test('start 없이 finish해도 쓰지 않는다', () async {
    final t = make();
    session.jumpTo(30);
    await t.finish();
    expect(store.records, isEmpty);
  });

  test('시간: 공백은 최대 3분으로 제한', () async {
    clock.advance(const Duration(seconds: 60));
    session.next(); // +60
    clock.advance(const Duration(minutes: 30));
    session.next(); // +180 (cap)
    clock.advance(const Duration(seconds: 20));
    advance(session, 4); // 한 번에 4번 같은 순간: +20
    clock.advance(const Duration(minutes: 10));
    await tracker.finish(); // +180 (cap)
    expect(store.records.single.seconds, 60 + 180 + 20 + 180);
  });

  test('쉬는 시간은 제외', () async {
    clock.advance(const Duration(seconds: 30));
    session.next(); // +30
    clock.advance(const Duration(seconds: 20));
    tracker.pause(); // +20
    clock.advance(const Duration(hours: 1));
    expect(tracker.isPaused, isTrue);
    tracker.resume();
    clock.advance(const Duration(seconds: 40));
    advance(session, 5); // +40
    clock.advance(const Duration(seconds: 15));
    await tracker.finish(); // +15
    expect(store.records.single.seconds, 30 + 20 + 40 + 15);
  });

  test('쉬는 중에 끝내면 쉰 시간은 더하지 않는다', () async {
    advance(session, 6);
    clock.advance(const Duration(seconds: 50));
    tracker.pause();
    clock.advance(const Duration(minutes: 2));
    await tracker.finish();
    expect(store.records.single.seconds, 50);
  });

  test('finish 이후 세션 변화는 무시', () async {
    advance(session, 6);
    await tracker.finish();
    expect(store.records, hasLength(1));
    advance(session, 30);
    await tracker.finish();
    expect(store.records, hasLength(1));
  });

  test('dispose는 진행을 기록으로 남긴다', () async {
    advance(session, 8);
    tracker.dispose();
    await tracker.finish();
    expect(store.records, hasLength(1));
    expect(store.records.single.hailMarys, 3);
  });

  test('트래커 기록마다 새 id', () async {
    advance(session, 73);
    await Future<void>.delayed(Duration.zero);
    session.restart();
    advance(session, 20);
    await tracker.finish();
    final ids = store.records.map((r) => r.id).toSet();
    expect(ids, hasLength(2));
  });

  test('source가 기록에 들어간다', () async {
    final t = PrayerSessionTracker(
      store: store,
      session: session,
      mysterySet: MysterySet.glorious,
      source: 'church',
      now: clock.call,
    )..start();
    advance(session, 8);
    await t.finish();
    expect(store.records.single.source, 'church');
    expect(store.records.single.set, MysterySet.glorious);
    await tracker.finish();
  });
}
