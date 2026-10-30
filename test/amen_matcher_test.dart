import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/speech/amen_matcher.dart';

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
    m.onEndpoint();
    expect(m.onPartial(' 아멘'), ['아멘']);
  });

  test('custom patterns', () {
    final c = AmenMatcher(patterns: const ['아멘'], aliases: const {});
    expect(c.onPartial('아맨'), isEmpty);
    expect(c.onPartial('아멘'), ['아멘']);
  });
}
