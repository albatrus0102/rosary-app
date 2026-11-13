import 'dart:convert';
import 'dart:io';

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

  group('선창 모드 뒷단 클립 매핑 (resp_<기도 id>)', () {
    final steps = buildRosarySequence(MysterySet.joyful);

    test('the five split prayers map to resp_<id>', () {
      String? idOf(StepKind kind) =>
          steps.firstWhere((s) => s.kind == kind).responderCueId;
      expect(idOf(StepKind.apostlesCreed), 'resp_apostles_creed');
      expect(idOf(StepKind.ourFather), 'resp_our_father');
      expect(idOf(StepKind.hailMary), 'resp_hail_mary');
      expect(idOf(StepKind.gloryBe), 'resp_glory_be');
      expect(idOf(StepKind.fatima), 'resp_fatima');
    });

    test(
      'unsplit prayers (sign of the cross, opening and closing) are null',
      () {
        expect(steps.first.kind, StepKind.signOfCross);
        expect(steps.first.responderCueId, isNull);
        expect(steps.last.kind, StepKind.closing);
        expect(steps.last.responderCueId, isNull);
        expect(responderCueIdForPrayer('sign_of_cross'), isNull);
        expect(responderCueIdForPrayer('salve_regina'), isNull);
      },
    );

    test('every step with a responder part has a clip id and vice versa', () {
      for (final s in steps) {
        expect(
          s.responderCueId != null,
          s.responderText.isNotEmpty,
          reason: s.title,
        );
        if (s.responderCueId != null) {
          expect(allResponderCueIds, contains(s.responderCueId));
        }
      }
      expect(allResponderCueIds.toSet(), {
        for (final s in steps)
          if (s.responderCueId != null) s.responderCueId!,
      });
    });

    test('prayerId matches the prayer of the step', () {
      expect(steps[1].prayerId, Prayers.apostlesCreed.id);
      expect(steps[2].prayerId, Prayers.ourFather.id);
      expect(steps[3].prayerId, Prayers.hailMary.id);
      expect(steps.first.prayerId, Prayers.signOfCross.id);
      expect(steps.last.prayerId, Prayers.signOfCross.id);
    });

    test('the bundled clips exist for both voices and match the script', () {
      final script = (jsonDecode(
        File('tools/leader_voice/responder_cues.json').readAsStringSync(),
      ) as List).cast<Map<String, dynamic>>();
      expect({for (final c in script) c['id']}, allResponderCueIds.toSet());
      for (final persona in ['sister', 'priest']) {
        for (final id in allResponderCueIds) {
          final f = File('assets/leader_voice/$persona/$id.mp3');
          expect(f.existsSync(), isTrue, reason: f.path);
          expect(f.lengthSync(), greaterThan(1000), reason: f.path);
        }
      }
      // 대본의 뒷단 문장이 앱의 뒷단 문장과 같다.
      for (final c in script) {
        final step = steps.firstWhere((s) => s.responderCueId == c['id']);
        expect(c['text'], step.responderText, reason: '${c['id']}');
      }
    });
  });
}
