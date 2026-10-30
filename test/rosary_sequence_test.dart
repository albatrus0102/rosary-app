import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';

void main() {
  final steps = buildRosarySequence(MysterySet.joyful);

  test('has 73 steps for every mystery set', () {
    for (final set in MysterySet.values) {
      expect(buildRosarySequence(set), hasLength(73));
    }
  });

  test('first and last steps', () {
    expect(steps.first.kind, StepKind.signOfCross);
    expect(steps.first.title, '성호경');
    expect(steps[1].kind, StepKind.apostlesCreed);
    expect(steps[2].kind, StepKind.ourFather);
    expect(steps[3].title, '성모송 1/3');
    expect(steps[5].title, '성모송 3/3');
    expect(steps[6].kind, StepKind.gloryBe);
    expect(steps.last.kind, StepKind.closing);
    expect(steps.last.title, '마침 성호경');
    expect(steps.last.decade, isNull);
  });

  test('decade 1 starts with the joyful mystery 1 heading', () {
    final first = steps.firstWhere((s) => s.decade == 1);
    final m = Mysteries.joyful.first;
    expect(first.kind, StepKind.ourFather);
    expect(first.heading, '${m.title}\n${m.meditation}');
    expect(first.heading, startsWith('환희의 신비 1단\n'));
    expect(steps.where((s) => s.heading != null), hasLength(5));
  });

  test('every hail mary has a beadIndex, others do not', () {
    for (final s in steps) {
      if (s.kind == StepKind.hailMary) {
        expect(s.beadIndex, isNotNull);
        expect(
          s.title,
          endsWith('${s.beadIndex}/${s.decade == null ? 3 : 10}'),
        );
      } else {
        expect(s.beadIndex, isNull);
      }
    }
    for (var d = 1; d <= 5; d++) {
      final beads = steps
          .where((s) => s.decade == d && s.kind == StepKind.hailMary)
          .map((s) => s.beadIndex)
          .toList();
      expect(beads, [for (var i = 1; i <= 10; i++) i]);
    }
  });

  test('fatima triggers include 돌보소서; all others only 아멘', () {
    final fatima = steps.where((s) => s.kind == StepKind.fatima).toList();
    expect(fatima, hasLength(5));
    for (final s in fatima) {
      expect(s.triggerPhrases, contains('돌보소서'));
      expect(s.triggerPhrases, contains('아멘'));
      expect(s.title, Prayers.fatima.title);
    }
    for (final s in steps.where((s) => s.kind != StepKind.fatima)) {
      expect(s.triggerPhrases, ['아멘']);
      expect(s.advancesByVoice, isTrue);
    }
  });

  test('each decade has 13 steps', () {
    for (var d = 1; d <= 5; d++) {
      expect(steps.where((s) => s.decade == d), hasLength(13));
    }
  });
}
