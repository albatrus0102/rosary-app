import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/speech/amen_matcher.dart';
import 'package:rosary_app/speech/fuzzy_amen.dart';

void main() {
  late AmenMatcher m;
  setUp(() => m = AmenMatcher());

  List<String> all(List<String> partials) => [
    for (final t in partials) ...m.onPartial(t),
  ];

  test('growing partials count a single 아멘 once', () {
    expect(all([' 아', ' 아멘', ' 아멘 ']), ['아멘']);
  });

  test('flicker does not double count', () {
    expect(all([' 아멘', ' 아', ' 아멘']), ['아멘']);
  });

  test('two in one segment', () {
    expect(m.onPartial('아멘 아멘'), ['아멘', '아멘']);
    expect(m.onPartial('아멘 아멘'), isEmpty);
  });

  test('second 아멘 added later returns only the increase', () {
    expect(m.onPartial(' 아멘'), ['아멘']);
    expect(m.onPartial(' 아멘 아멘'), ['아멘']);
  });

  test('space inside is ignored', () {
    expect(m.onPartial('아 멘'), ['아멘']);
  });

  test('아맨 variant is normalized to 아멘', () {
    expect(m.onPartial('아맨'), ['아멘']);
  });

  test('아멘 and 아맨 flicker is not double counted', () {
    expect(all([' 아멘', ' 아맨', ' 아멘']), ['아멘']);
  });

  test('punctuation is ignored', () {
    expect(m.onPartial('아멘.'), ['아멘']);
    expect(AmenMatcher().onPartial('아, 멘!'), ['아멘']);
  });

  test('no match returns empty', () {
    expect(m.onPartial(' 성모님 은총이 가득하신'), isEmpty);
    expect(m.onPartial(''), isEmpty);
  });

  test('돌보소서 phrase is detected once', () {
    expect(all([' 가장 버림받은 영혼을 돌보', ' 영혼을 돌보소서', ' 영혼을 돌보소서.']), ['돌보소서']);
  });

  test('돌보소서 followed by 아멘 yields both', () {
    expect(m.onPartial(' 영혼을 돌보소서'), ['돌보소서']);
    expect(m.onPartial(' 영혼을 돌보소서 아멘'), ['아멘']);
  });

  test('onEndpoint resets so the next segment counts again', () {
    expect(m.onPartial(' 아멘'), ['아멘']);
    expect(m.onPartial(' 아멘'), isEmpty);
    expect(m.onEndpoint(' 아멘'), isEmpty);
    expect(m.onPartial(' 아멘'), ['아멘']);
  });

  test('custom patterns', () {
    final c = AmenMatcher(patterns: const ['아멘'], aliases: const {});
    expect(c.onPartial('아맨'), isEmpty);
    expect(c.onPartial('아멘'), ['아멘']);
  });

  group('rule A (partials)', () {
    const variants = [
      '아멘', '아맨', '라멘', '에멘', '남맨', '남멘', '암엔', '엄앤', '엄멘', //
      '하멘', '애멘', '아멩', '아 멘', '아, 멘!',
    ];
    for (final v in variants) {
      test('"$v" counts as 아멘', () {
        expect(AmenMatcher().onPartial(v), ['아멘']);
        expect(ruleA(v), 1);
      });
    }

    for (final v in ['아버지', '마리아', '아들', '어머니', '하늘', '연옥영혼을돌보시며']) {
      test('"$v" is not 아멘', () {
        expect(AmenMatcher().onPartial(v), isEmpty);
        expect(AmenMatcher().onEndpoint(v), isEmpty);
      });
    }

    test('A-variant flicker is not double counted', () {
      expect(all([' 아', ' 아맨', ' 아멘', ' 엄멘', ' 하멘']), ['아멘']);
    });

    test('two variants in one segment', () {
      expect(m.onPartial('아맨 라멘'), ['아멘', '아멘']);
      expect(m.onPartial('아맨 라멘'), isEmpty);
    });

    test('non-overlapping count', () {
      expect(ruleA('아멘아멘아멘'), 3);
      expect(ruleA(''), 0);
    });

    test('rule T shapes are NOT counted on partials', () {
      for (final v in ['암', '남', '밤에', '멘', '맨', '메', '멩', '아메']) {
        expect(AmenMatcher().onPartial(v), isEmpty, reason: v);
      }
    });

    test('custom pattern lists stay exact', () {
      final c = AmenMatcher(patterns: const ['아멘'], aliases: const {});
      expect(c.onPartial('아먼'), isEmpty);
      expect(c.onPartial('하멘'), isEmpty);
      expect(c.onEndpoint('암'), isEmpty);
      expect(c.onPartial('아멘'), ['아멘']);
      final f = AmenMatcher(
        patterns: const ['아멘'],
        aliases: const {},
        fuzzy: true,
      );
      expect(f.onPartial('하멘'), ['아멘']);
    });
  });

  group('rule T (endpoint only)', () {
    const variants = [
      '암', '남', '밤', '엄', '암호', '암에', '암은', '밤에', '남의', '아메', //
      '멘', '맨', '메', '멩', '네, 암', '. 밤에.',
    ];
    for (final v in variants) {
      test('"$v" counts as one 아멘 at endpoint only', () {
        final x = AmenMatcher();
        expect(x.onPartial(v), isEmpty);
        expect(x.onEndpoint(v), ['아멘']);
        // 구간이 리셋된 뒤 다음 구간도 같다.
        expect(x.onPartial(v), isEmpty);
        expect(x.onEndpoint(v), ['아멘']);
      });
    }

    test('not applied when the segment already had a rule-A hit', () {
      expect(m.onPartial('엄멘 아멘'), ['아멘', '아멘']);
      expect(m.onEndpoint('엄멘 아멘 암'), isEmpty);
    });

    test('not applied when the final text itself has a rule-A hit', () {
      expect(m.onEndpoint('하멘 암'), ['아멘']); // A로 한 번, T는 추가되지 않는다.
    });

    test('rule T fires once even if partials flickered', () {
      expect(all(['암', '남', '밤']), isEmpty);
      expect(m.onEndpoint('밤'), ['아멘']);
    });

    for (final v in ['아버지', '마리아', '어머니', '연옥영혼을돌보시며', '', '   ', '하늘']) {
      test('"$v" is not T at endpoint', () {
        expect(AmenMatcher().onEndpoint(v), isEmpty);
      });
    }

    test('A hit in an earlier segment does not suppress T later', () {
      expect(m.onPartial('아멘'), ['아멘']);
      expect(m.onEndpoint('아멘'), isEmpty);
      expect(m.onEndpoint('암'), ['아멘']);
    });

    test('ruleT is false for a plain 아멘-less sentence tail', () {
      expect(ruleT('성모님 은총이 가득하신'), isFalse);
    });
  });

  group('rule F (Fatima ending)', () {
    for (final v in [
      '버림받은 영혼을 돌보썼어',
      '가장 버림받은 영혼을 돌보썼어',
      '영혼을 돌보줬어',
      '받은 영혼을 돌보써서',
      '어림받은',
    ]) {
      test('"$v" emits 돌보소서', () {
        expect(AmenMatcher().onPartial(v), ['돌보소서']);
      });
    }

    test('emitted at most once per segment', () {
      expect(m.onPartial('버림받은 영혼을 돌보썼어'), ['돌보소서']);
      expect(m.onPartial('버림받은 영혼을 돌보썼어 영혼을 돌보줬어'), isEmpty);
      expect(m.onEndpoint('버림받은 영혼을 돌보썼어'), isEmpty);
      expect(m.onPartial('버림받은'), ['돌보소서']); // 다음 구간
    });

    test('exact 돌보소서 also counts once', () {
      expect(m.onPartial('돌보소서 돌보소서'), ['돌보소서']);
    });

    test('negatives', () {
      expect(AmenMatcher().onPartial('연옥영혼을돌보시며'), isEmpty);
      expect(AmenMatcher().onPartial('연옥 영혼을 돌보시며'), isEmpty);
      expect(AmenMatcher().onPartial('아버지'), isEmpty);
    });

    test('custom pattern lists do not use rule F', () {
      final c = AmenMatcher(patterns: const ['아멘'], aliases: const {});
      expect(c.onPartial('버림받은 영혼을 돌보썼어'), isEmpty);
    });

    test('돌보소서 then 아멘 in the same segment emits both in order', () {
      expect(m.onPartial('영혼을 돌보썼어 하멘'), ['돌보소서', '아멘']);
    });
  });

  group('prayer texts', () {
    final texts = <String>[
      for (final p in Prayers.all) ...[p.title, p.text],
      for (final mys in Mysteries.all) ...[mys.title, mys.meditation],
    ];

    test('no false positives for rule A', () {
      expect(texts, isNotEmpty);
      var exactTotal = 0;
      var fuzzyTotal = 0;
      for (final t in texts) {
        final fresh = AmenMatcher().onPartial(t).where((p) => p == '아멘');
        final exact = AmenMatcher.normalize(t).split('아멘').length - 1;
        exactTotal += exact;
        fuzzyTotal += fresh.length;
        expect(fresh.length, exact, reason: 'false positive in: $t');
        expect(ruleA(t), exact, reason: 'ruleA false positive in: $t');
      }
      expect(fuzzyTotal, exactTotal);
      expect(exactTotal, greaterThan(0));
    });

    test('no false positives for rule F (fires only where 돌보소서 is spoken)', () {
      var fired = 0;
      for (final t in texts) {
        final has = AmenMatcher.normalize(t).contains('돌보소서');
        final got = AmenMatcher().onPartial(t).where((p) => p == '돌보소서');
        expect(got.length, has ? 1 : 0, reason: 'rule F on: $t');
        expect(ruleF(t), has, reason: 'ruleF on: $t');
        fired += got.length;
      }
      expect(fired, 1); // 파티마 기도 하나
    });

    test('rule T has no false positives at line boundaries', () {
      var lines = 0;
      for (final t in texts) {
        for (final line in t.split('\n')) {
          if (AmenMatcher.normalize(line).isEmpty) continue;
          lines++;
          final got = AmenMatcher().onEndpoint(line).where((p) => p == '아멘');
          final expected = ruleA(line); // 줄 끝의 '아멘'만 정당한 적중
          expect(
            got.length,
            expected,
            reason: 'rule T false positive at line end: $line',
          );
        }
      }
      expect(lines, greaterThan(50));
    });
  });
}
