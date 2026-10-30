import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/domain/leader_cues.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/prayer_splits.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';

void main() {
  test('26 cues with unique ids, prayers first', () {
    expect(allLeaderCues, hasLength(26));
    final ids = allLeaderCues.map((c) => c.id).toList();
    expect(ids.toSet(), hasLength(26));
    expect(ids.take(6).toList(), [
      'sign_of_cross',
      'apostles_creed',
      'our_father',
      'hail_mary',
      'glory_be',
      'fatima',
    ]);
    expect(ids[6], 'mystery_joyful_1');
    expect(ids[11], 'mystery_luminous_1');
    expect(ids[16], 'mystery_sorrowful_1');
    expect(ids[21], 'mystery_glorious_1');
    expect(ids.last, 'mystery_glorious_5');
  });

  test('cue texts are the leader parts', () {
    final byId = {for (final c in allLeaderCues) c.id: c};
    expect(byId['sign_of_cross']!.text, Prayers.signOfCross.text);
    expect(byId['hail_mary']!.text, splitPrayer(Prayers.hailMary).leader);
    expect(
      byId['mystery_joyful_1']!.text,
      '${Mysteries.joyful.first.title}\n${Mysteries.joyful.first.meditation}',
    );
    for (final c in allLeaderCues) {
      expect(c.text, isNotEmpty);
      expect(c.title, isNotEmpty);
    }
  });

  test('every sequence step references existing cue ids', () {
    final known = allLeaderCues.map((c) => c.id).toSet();
    for (final set in MysterySet.values) {
      final steps = buildRosarySequence(set);
      for (final step in steps) {
        expect(step.leaderCueIds, isNotEmpty, reason: step.title);
        expect(known.containsAll(step.leaderCueIds), isTrue);
        if (step.heading != null) {
          expect(step.leaderCueIds, hasLength(2));
          expect(step.leaderCueIds.first, startsWith('mystery_${set.name}_'));
          expect(step.leaderCueIds.last, 'our_father');
        } else {
          expect(step.leaderCueIds, hasLength(1));
        }
      }
      expect(steps.first.leaderCueIds, ['sign_of_cross']);
      expect(steps.last.leaderCueIds, ['sign_of_cross']);
      final headings = steps.where((s) => s.heading != null).toList();
      expect(headings.map((s) => s.leaderCueIds.first).toList(), [
        for (var i = 1; i <= 5; i++) 'mystery_${set.name}_$i',
      ]);
    }
  });
}
