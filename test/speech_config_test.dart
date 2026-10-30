import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/speech/speech_config.dart';

void main() {
  const fakeTokens = '''
<blk> 0
<sos/eos> 1
<unk> 2
▁ 3
▁아 4
멘 5
맨 6
▁돌 7
보 8
소 9
서 10
''';

  test('parseTokens reads token column', () {
    final t = SpeechConfig.parseTokens(fakeTokens);
    expect(t, containsAll(['<blk>', '▁아', '멘', '▁돌']));
    expect(t.contains('4'), isFalse);
    expect(t.length, 11);
  });

  test('defaults', () {
    const c = SpeechConfig();
    expect(c.decodingMethod, 'modified_beam_search');
    expect(c.hotwordsScore, 2.0);
    expect(c.hotwords, ['▁아 멘', '▁아 맨', '▁돌 보 소 서']);
    expect(c.rule1, 2.0);
    expect(c.rule2, 0.8);
    expect(c.rule3, 20);
    expect(c.numThreads, 2);
    expect(c.usesHotwords, isTrue);
    expect(c.copyWith(decodingMethod: 'greedy_search').usesHotwords, isFalse);
  });

  test('filterHotwords keeps lines whose tokens all exist', () {
    final tokens = SpeechConfig.parseTokens(fakeTokens);
    final skipped = <String>[];
    final kept = SpeechConfig.filterHotwords(
      const SpeechConfig().hotwords,
      tokens,
      onSkipped: (line, missing) => skipped.add('$line|$missing'),
    );
    // '▁아 맨'은 토큰이 모두 있다. fakeTokens에 '맨'이 있으므로 3줄 모두 유지.
    expect(kept, ['▁아 멘', '▁아 맨', '▁돌 보 소 서']);
    expect(skipped, isEmpty);
  });

  test('filterHotwords drops lines with a missing token', () {
    final tokens = SpeechConfig.parseTokens(fakeTokens.replaceAll('맨 6\n', ''));
    final skipped = <String>[];
    final kept = SpeechConfig.filterHotwords(
      const ['▁아 멘', '▁아 맨', '▁돌 보 소 서', '▁없는 토큰', '', '  '],
      tokens,
      onSkipped: (line, missing) => skipped.add('$line|$missing'),
    );
    expect(kept, ['▁아 멘', '▁돌 보 소 서']);
    expect(skipped, ['▁아 맨|맨', '▁없는 토큰|▁없는']);
  });

  test('filterHotwords normalizes whitespace and ignores :score', () {
    final tokens = SpeechConfig.parseTokens(fakeTokens);
    expect(SpeechConfig.filterHotwords(const ['  ▁아   멘 :3.0 '], tokens), [
      '▁아 멘 :3.0',
    ]);
  });

  test('tokensToPlainWord strips markers for bpe mode', () {
    expect(SpeechConfig.tokensToPlainWord('▁아 멘'), '아멘');
    expect(SpeechConfig.tokensToPlainWord('▁돌 보 소 서'), '돌보소서');
  });
}
