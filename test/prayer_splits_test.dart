import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/prayer_mode.dart';
import 'package:rosary_app/domain/prayer_splits.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';

void main() {
  const expectedFirstResponderLine = {
    'apostles_creed': '그리로부터 산 이와 죽은 이를 심판하러 오시리라 믿나이다.',
    'our_father': '오늘 저희에게 일용할 양식을 주시고',
    'hail_mary': '천주의 성모 마리아님,',
    'glory_be': '처음과 같이',
    'fatima': '연옥 영혼을 돌보시며',
  };

  final prayers = [
    Prayers.signOfCross,
    Prayers.apostlesCreed,
    Prayers.ourFather,
    Prayers.hailMary,
    Prayers.gloryBe,
    Prayers.fatima,
  ];

  test('leader + responder reassembles the text for split prayers', () {
    for (final p in prayers.where(
      (p) => responderStartLine.containsKey(p.id),
    )) {
      final parts = splitPrayer(p);
      expect(parts.leader, isNotEmpty, reason: p.id);
      expect(parts.responder, isNotEmpty, reason: p.id);
      expect('${parts.leader}\n${parts.responder}', p.text, reason: p.id);
    }
  });

  test('sign of cross is not split', () {
    final parts = splitPrayer(Prayers.signOfCross);
    expect(parts.responder, '');
    expect(parts.leader, Prayers.signOfCross.text);
  });

  test('first responder line matches the spec', () {
    expect(
      responderStartLine.keys.toSet(),
      expectedFirstResponderLine.keys.toSet(),
    );
    for (final p in prayers) {
      final expected = expectedFirstResponderLine[p.id];
      if (expected == null) continue;
      expect(
        splitPrayer(p).responder.split('\n').first,
        expected,
        reason: p.id,
      );
    }
  });

  test('every step has leaderText; reassembles to text', () {
    for (final set in MysterySet.values) {
      for (final s in buildRosarySequence(set)) {
        expect(s.leaderText, isNotEmpty, reason: s.title);
        final joined = s.responderText.isEmpty
            ? s.leaderText
            : '${s.leaderText}\n${s.responderText}';
        expect(joined, s.text, reason: s.title);
      }
    }
    final closing = buildRosarySequence(MysterySet.joyful).last;
    expect(closing.responderText, '');
  });

  test('prayer mode labels', () {
    expect(PrayerMode.solo.label, '혼자');
    expect(PrayerMode.leader.label, '선창(앞단)');
    expect(PrayerMode.responder.label, '후창(뒷단)');
    for (final m in PrayerMode.values) {
      expect(m.description, isNotEmpty);
    }
  });
}
