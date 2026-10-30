/// 음성 인식기(sherpa-onnx) 설정 값 모음과 핫워드 파일 생성 도우미.
class SpeechConfig {
  const SpeechConfig({
    this.decodingMethod = 'modified_beam_search',
    this.maxActivePaths = 4,
    this.modelingUnit = 'bpe',
    this.hotwordsScore = 2.0,
    this.hotwords = defaultHotwords,
    this.rule1 = 1.5,
    this.rule2 = 0.8,
    this.rule3 = 20,
    this.numThreads = 2,
  });

  /// 'greedy_search' 또는 'modified_beam_search'(핫워드는 후자에서만 동작).
  final String decodingMethod;

  /// modified_beam_search가 유지하는 후보 경로 수.
  final int maxActivePaths;

  /// 핫워드를 쪼개는 단위. 'bpe'(모델 폴더의 bpe.vocab 사용)면 핫워드를 평문 단어로
  /// 적는다. 빈 문자열이면 tokens.txt의 토큰열(예: '▁아 멘')로 적어야 한다.
  final String modelingUnit;

  final double hotwordsScore;

  /// 한 줄에 핫워드 하나. [modelingUnit]이 'bpe'면 평문(예: '아멘').
  final List<String> hotwords;

  /// endpoint 규칙: 말하기 전 무음 / 말한 뒤 무음 / 최대 발화 길이(초).
  final double rule1;
  final double rule2;
  final double rule3;

  final int numThreads;

  /// 인식 모델은 '돌보소서'를 그대로 적지 못해(파티마 끝맺음은 규칙 F가 따로 잡는다)
  /// 핫워드는 '아멘' 하나만 둔다.
  static const defaultHotwords = ['아멘'];

  /// 핫워드가 bpe.vocab으로 쪼개지는 설정인가.
  bool get usesBpe => modelingUnit == 'bpe';

  /// 핫워드를 쓰는 디코딩 방식인가.
  bool get usesHotwords =>
      decodingMethod == 'modified_beam_search' && hotwords.isNotEmpty;

  SpeechConfig copyWith({
    String? decodingMethod,
    int? maxActivePaths,
    String? modelingUnit,
    double? hotwordsScore,
    List<String>? hotwords,
    double? rule1,
    double? rule2,
    double? rule3,
    int? numThreads,
  }) => SpeechConfig(
    decodingMethod: decodingMethod ?? this.decodingMethod,
    maxActivePaths: maxActivePaths ?? this.maxActivePaths,
    modelingUnit: modelingUnit ?? this.modelingUnit,
    hotwordsScore: hotwordsScore ?? this.hotwordsScore,
    hotwords: hotwords ?? this.hotwords,
    rule1: rule1 ?? this.rule1,
    rule2: rule2 ?? this.rule2,
    rule3: rule3 ?? this.rule3,
    numThreads: numThreads ?? this.numThreads,
  );

  @override
  String toString() =>
      'SpeechConfig($decodingMethod, paths: $maxActivePaths, unit: $modelingUnit, '
      'hotwordsScore: $hotwordsScore, '
      'hotwords: $hotwords, rules: $rule1/$rule2/$rule3, threads: $numThreads)';

  /// tokens.txt 내용("토큰 id" 형식, 한 줄에 하나)에서 토큰 집합을 만든다.
  static Set<String> parseTokens(String tokensTxt) {
    final tokens = <String>{};
    for (final raw in tokensTxt.split('\n')) {
      final line = raw.trimRight();
      if (line.isEmpty) continue;
      final i = line.lastIndexOf(' ');
      // 토큰 자체에 공백이 들어 있을 수도 있어 마지막 공백 기준으로 자른다.
      final token = i <= 0 ? line : line.substring(0, i);
      tokens.add(token);
    }
    return tokens;
  }

  /// [tokens]에 없는 토큰이 하나라도 있는 핫워드 줄은 버린다.
  /// 토큰열 핫워드([modelingUnit]이 빈 문자열)일 때만 쓴다. 'bpe'에서는 bpe.vocab이
  /// 평문을 알아서 쪼개므로 거르지 않는다.
  /// (sherpa-onnx는 모르는 토큰이 있는 핫워드 파일을 만나면 인식기 생성에 실패할 수 있다.)
  /// 뒤에 붙는 ` :점수` 표기는 검사하지 않고 그대로 둔다.
  static List<String> filterHotwords(
    List<String> hotwords,
    Set<String> tokens, {
    void Function(String skipped, String missingToken)? onSkipped,
  }) {
    final kept = <String>[];
    for (final raw in hotwords) {
      final line = raw.trim().replaceAll(RegExp(r'\s+'), ' ');
      if (line.isEmpty) continue;
      String? missing;
      for (final part in line.split(' ')) {
        if (part.startsWith(':')) continue; // 점수 표기
        if (!tokens.contains(part)) {
          missing = part;
          break;
        }
      }
      if (missing == null) {
        kept.add(line);
      } else {
        onSkipped?.call(raw, missing);
      }
    }
    return kept;
  }
}
