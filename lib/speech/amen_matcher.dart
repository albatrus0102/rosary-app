/// 스트리밍 인식기의 부분 결과 텍스트에서 트리거 문구("아멘" 등)가
/// 새로 등장한 횟수를 판정한다.
///
/// 부분 결과는 한 발화 구간(endpoint 사이)에서 늘어나기도, 흔들리기도 한다.
/// 구간 내 문구별 등장 횟수의 최대값을 기억하고, 새 횟수가 그 최대값을 넘을 때만
/// 차이를 반환하므로 같은 문구가 중복 집계되지 않는다.
///
/// 별칭(예: '아맨')은 정규 문구('아멘')로 합산·정규화해서 내보낸다.
///
/// [fuzzy]가 켜져 있으면 '아멘'은 정확한 문자열 대신 음운 단위로 판정한다.
/// 한글 음절을 초성/중성/종성으로 분해해,
///  - 첫 음절: 초성 ㅇ/ㅎ, 중성 ㅏ/ㅐ/ㅑ, 종성 없음 또는 ㅇ
///  - 둘째 음절: 초성 ㅁ, 중성 ㅔ/ㅐ/ㅓ/ㅣ/ㅖ, 종성 ㄴ/ㅇ/ㅁ/없음
/// 이면 '아멘'으로 센다(아맨·아먼·아민·하멘·애멘·아멩 등 인식 오류 흡수).
class AmenMatcher {
  AmenMatcher({
    List<String> patterns = defaultPatterns,
    Map<String, String> aliases = defaultAliases,
    bool? fuzzy,
  }) {
    // 정규 문구(canonical) 순서를 유지하면서, 별칭 → 정규 문구 매핑을 만든다.
    for (final raw in patterns) {
      final p = normalize(raw);
      if (p.isEmpty) continue;
      final canonical = normalize(aliases[raw] ?? aliases[p] ?? p);
      _patterns.add((pattern: p, canonical: canonical));
      _max.putIfAbsent(canonical, () => 0);
    }
    // 기본 문구 목록을 쓸 때만 기본으로 퍼지 매칭을 켠다(사용자 정의 목록은 정확 일치).
    final useFuzzy = fuzzy ?? identical(patterns, defaultPatterns);
    if (useFuzzy && _max.containsKey(_amen)) _fuzzyCanonical = _amen;
  }

  static const _amen = '아멘';
  String? _fuzzyCanonical;

  static const defaultPatterns = ['아멘', '아맨', '돌보소서'];
  static const defaultAliases = {'아맨': '아멘'};

  final List<({String pattern, String canonical})> _patterns = [];
  // 정규 문구 → 이번 구간에서 관측한 최대 등장 횟수 (삽입 순서 유지)
  final Map<String, int> _max = {};

  // 공백, 문장부호, 기호를 모두 제거한다.
  static final RegExp _noise = RegExp(r'[\s\p{P}\p{S}\p{Z}]', unicode: true);

  /// 공백과 문장부호를 모두 제거한 텍스트.
  static String normalize(String text) => text.replaceAll(_noise, '');

  /// 부분 결과가 들어올 때마다 호출한다.
  /// 이번 호출로 새로 확정된 문구(정규 문구)를 등장 횟수만큼 반복해 반환한다.
  /// 없으면 빈 리스트.
  List<String> onPartial(String text) {
    final t = normalize(text);
    final counts = <String, int>{};
    for (final p in _patterns) {
      // 퍼지 매칭 대상 문구는 아래에서 음운 규칙으로 센다(정확 일치를 포함한다).
      if (p.canonical == _fuzzyCanonical) continue;
      counts[p.canonical] =
          (counts[p.canonical] ?? 0) + _countNonOverlapping(t, p.pattern);
    }
    final fuzzyKey = _fuzzyCanonical;
    if (fuzzyKey != null) counts[fuzzyKey] = countFuzzyAmen(t);
    final added = <String>[];
    for (final entry in counts.entries) {
      final prev = _max[entry.key] ?? 0;
      if (entry.value > prev) {
        _max[entry.key] = entry.value;
        for (var i = prev; i < entry.value; i++) {
          added.add(entry.key);
        }
      }
    }
    return added;
  }

  /// 인식기가 endpoint를 감지하면 호출한다. 구간 상태를 리셋한다.
  void onEndpoint() {
    for (final k in _max.keys.toList()) {
      _max[k] = 0;
    }
  }

  /// 이미 정규화된 텍스트에서 음운 규칙으로 '아멘'이 나온 횟수(겹치지 않게).
  static int countFuzzyAmen(String normalized) {
    final units = normalized.codeUnits;
    var count = 0;
    var i = 0;
    while (i + 1 < units.length) {
      if (_isFirstSyllable(units[i]) && _isSecondSyllable(units[i + 1])) {
        count++;
        i += 2;
      } else {
        i++;
      }
    }
    return count;
  }

  static const _hangulBase = 0xAC00;
  static const _hangulEnd = 0xD7A3;

  // 초성 인덱스: ㅁ=6, ㅇ=11, ㅎ=18
  // 중성 인덱스: ㅏ=0 ㅐ=1 ㅑ=2 ㅓ=4 ㅔ=5 ㅖ=7 ㅣ=20
  // 종성 인덱스: 없음=0 ㄴ=4 ㅁ=16 ㅇ=21
  static bool _isFirstSyllable(int c) {
    if (c < _hangulBase || c > _hangulEnd) return false;
    final code = c - _hangulBase;
    final initial = code ~/ 588;
    final vowel = (code % 588) ~/ 28;
    final fin = code % 28;
    return (initial == 11 || initial == 18) &&
        (vowel == 0 || vowel == 1 || vowel == 2) &&
        (fin == 0 || fin == 21);
  }

  static bool _isSecondSyllable(int c) {
    if (c < _hangulBase || c > _hangulEnd) return false;
    final code = c - _hangulBase;
    final initial = code ~/ 588;
    final vowel = (code % 588) ~/ 28;
    final fin = code % 28;
    return initial == 6 &&
        (vowel == 5 || vowel == 1 || vowel == 4 || vowel == 20 || vowel == 7) &&
        (fin == 0 || fin == 4 || fin == 16 || fin == 21);
  }

  static int _countNonOverlapping(String text, String pattern) {
    var count = 0;
    var from = 0;
    while (true) {
      final i = text.indexOf(pattern, from);
      if (i < 0) return count;
      count++;
      from = i + pattern.length;
    }
  }
}
