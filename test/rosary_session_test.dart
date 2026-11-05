import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/domain/rosary_session.dart';

RosarySession newSession() =>
    RosarySession(buildRosarySequence(MysterySet.joyful));

void main() {
  test('next advances through intro', () {
    final s = newSession();
    for (var i = 0; i < 7; i++) {
      expect(s.index, i);
      s.next();
    }
    expect(s.index, 7);
    expect(s.current.decade, 1);
    s.dispose();
  });

  test('full run emits 5 decadeCompleted and 1 finished', () async {
    final s = newSession();
    final collected = <SessionEvent>[];
    final sub = s.events.listen(collected.add);

    while (!s.isFinished) {
      s.next();
    }
    await Future<void>.delayed(Duration.zero);

    expect(
      collected.where((e) => e == SessionEvent.decadeCompleted),
      hasLength(5),
    );
    expect(collected.where((e) => e == SessionEvent.finished), hasLength(1));
    expect(collected.last, SessionEvent.finished);
    expect(collected, hasLength(73));
    expect(s.index, 72);

    // Further input after finishing is ignored.
    s.next();
    await Future<void>.delayed(Duration.zero);
    expect(collected.where((e) => e == SessionEvent.finished), hasLength(1));

    await sub.cancel();
    s.dispose();
  });

  test(
    'hailMarysCompleted fires 5 times, right after the 10th hail mary',
    () async {
      final s = newSession();
      final collected = <SessionEvent>[];
      final sub = s.events.listen(collected.add);

      // Walk to decade 1's 10th hail mary (intro hail marys never fire it).
      final tenth = s.steps.indexWhere(
        (x) => x.decade == 1 && x.beadIndex == 10,
      );
      while (s.index < tenth) {
        s.next();
      }
      await Future<void>.delayed(Duration.zero);
      expect(collected, isNot(contains(SessionEvent.hailMarysCompleted)));
      s.next();
      await Future<void>.delayed(Duration.zero);
      expect(collected.last, SessionEvent.hailMarysCompleted);
      expect(s.current.kind, StepKind.gloryBe);
      expect(s.current.decade, 1);

      while (!s.isFinished) {
        s.next();
      }
      await Future<void>.delayed(Duration.zero);
      expect(
        collected.where((e) => e == SessionEvent.hailMarysCompleted),
        hasLength(5),
      );
      expect(
        collected.where((e) => e == SessionEvent.decadeCompleted),
        hasLength(5),
      );
      await sub.cancel();
      s.dispose();
    },
  );

  test('events via expectLater', () async {
    final s = newSession();
    final future = expectLater(
      s.events,
      emitsInOrder([SessionEvent.bead, SessionEvent.bead]),
    );
    s.next();
    s.next();
    await future;
    s.dispose();
  });

  test(
    'decadeCompleted fires crossing fatima, not intro to decade 1',
    () async {
      final s = newSession();
      final events = <SessionEvent>[];
      final sub = s.events.listen(events.add);
      s.jumpTo(6);
      s.next(); // intro glory -> decade 1: just a bead
      s.jumpTo(7 + 12); // decade 1 fatima
      s.next(); // -> decade 2
      s.jumpTo(71); // decade 5 fatima
      s.next(); // -> closing
      await Future<void>.delayed(Duration.zero);
      expect(events, [
        SessionEvent.bead,
        SessionEvent.decadeCompleted,
        SessionEvent.decadeCompleted,
      ]);
      await sub.cancel();
      s.dispose();
    },
  );

  test('back at 0 is a no-op', () {
    final s = newSession();
    var notified = 0;
    s.addListener(() => notified++);
    s.back();
    expect(s.index, 0);
    expect(notified, 0);
    s.dispose();
  });

  test('back from finished stays on last step and clears finished', () {
    final s = newSession();
    s.jumpTo(72);
    s.next();
    expect(s.isFinished, isTrue);
    s.back();
    expect(s.isFinished, isFalse);
    expect(s.index, 72);
    s.back();
    expect(s.index, 71);
    s.dispose();
  });

  test('restart resets', () {
    final s = newSession();
    for (var i = 0; i < 20; i++) {
      s.next();
    }
    s.restart();
    expect(s.index, 0);
    expect(s.isFinished, isFalse);

    s.jumpTo(72);
    s.next();
    expect(s.isFinished, isTrue);
    s.restart();
    expect(s.isFinished, isFalse);
    expect(s.index, 0);
    s.dispose();
  });

  test(
    'next() through the whole sequence emits the completion events',
    () async {
      final s = newSession();
      final events = <SessionEvent>[];
      final sub = s.events.listen(events.add);
      while (!s.isFinished) {
        s.next();
      }
      await Future<void>.delayed(Duration.zero);
      int count(SessionEvent e) => events.where((x) => x == e).length;
      expect(count(SessionEvent.hailMarysCompleted), 5);
      expect(count(SessionEvent.decadeCompleted), 5);
      expect(count(SessionEvent.finished), 1);
      await sub.cancel();
      s.dispose();
    },
  );
}
