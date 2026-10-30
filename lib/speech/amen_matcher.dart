import 'fuzzy_amen.dart';

/// 스트리밍 인식기의 부분 결과 텍스트에서 트리거 문구("아멘" 등)가
/// 새로 등장한 횟수를 판정한다.
///
/// 부분 결과는 한 발화 구간(endpoint 사이)에서 늘어나기도, 흔들리기도 한다.
/// 구간 내 문구별 등장 횟수의 최대값을 기억하고, 새 횟수가 그 최대값을 넘을 때만
/// 차이를 반환하므로 같은 문구가 중복 집계되지 않는다.
///
/// 별칭(예: '아맨')은 정규 문구('아멘')로 합산·정규화해서 내보낸다.
///
/// [fuzzy]가 켜져 있으면(기본 문구 목록일 때 기본값) 실험으로 검증된 음운 규칙을 쓴다.
///  - 규칙 A([ruleA]): 부분 결과마다 '아멘'(아맨·라멘·엄멘·하멘·아멩 등) 횟수를 센다.
///  - 규칙 T([ruleT]): 구간이 끝날 때([onEndpoint])만, 그 구간에서 규칙 A가 0건이었고
///    마지막 텍스트가 '암', '밤에', '멘' 같은 느슨한 꼴이면 '아멘' 한 번으로 센다.
///  - 규칙 F([ruleF]): 파티마 기도 끝맺음("버림받은 영혼을 돌보써서" 등)이 나오면
///    구간당 한 번 '돌보소서'로 센다. 모델이 '돌보소서'를 그대로 적지 않기 때문이다.
/// 사용자 정의 문구 목록은 정확 일치로만 판정한다.
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
    if (useFuzzy) {
      _fuzzyAmen = _max.containsKey(amen);
      _fuzzyDolbo = _max.containsKey(dolbo);
    }
  }

  static const amen = '아멘';
  static const dolbo = '돌보소서';

  bool _fuzzyAmen = false;
  bool _fuzzyDolbo = false;

  /// 민감도 높임: 구간이 끝날 때 규칙 A/T가 모두 아무것도 못 찾았으면, 정규화한 텍스트가
  /// [looseEndings] 중 하나로 끝나는 구간도 '아멘'으로 센다(기본 문구 목록일 때만).
  /// 실행 중에도 바꿀 수 있다.
  bool highSensitivity = false;

  /// 민감도 높임에서 '아멘'으로 보는 구간 끝 글자. 단독 '아'도 포함한다.
  static const looseEndings = ['아', '맘엔', '마멘', '암멘', '아매', '하매', '아맹'];

  /// [segment]가 [looseEndings] 중 하나로 끝나는지(정규화 후).
  static bool endsLoosely(String segment) {
    final t = normalize(segment);
    if (t.isEmpty) return false;
    return looseEndings.any(t.endsWith);
  }

  static const defaultPatterns = [amen, '아맨', dolbo];
  static const defaultAliases = {'아맨': amen};

  final List<({String pattern, String canonical})> _patterns = [];
  // 정규 문구 → 이번 구간에서 관측한 최대 등장 횟수 (삽입 순서 유지)
  final Map<String, int> _max = {};

  /// 공백과 문장부호를 모두 제거한 텍스트.
  static String normalize(String text) => norm(text);

  /// 부분 결과가 들어올 때마다 호출한다.
  /// 이번 호출로 새로 확정된 문구(정규 문구)를 등장 횟수만큼 반복해 반환한다.
  /// 없으면 빈 리스트.
  List<String> onPartial(String text) {
    final t = normalize(text);
    final counts = <String, int>{};
    for (final p in _patterns) {
      // 퍼지 대상 문구는 아래 음운 규칙으로 센다(정확 일치는 그 규칙에 포함되거나 따로 더한다).
      if (p.canonical == amen && _fuzzyAmen) continue;
      counts[p.canonical] =
          (counts[p.canonical] ?? 0) + _countNonOverlapping(t, p.pattern);
    }
    if (_fuzzyAmen) counts[amen] = ruleA(t);
    if (_fuzzyDolbo) {
      // 규칙 F: 구간당 최대 한 번.
      counts[dolbo] = (counts[dolbo] ?? 0) > 0 || ruleF(t) ? 1 : 0;
    }
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

  /// 인식기가 endpoint를 감지하면 호출한다. [finalText]는 그 구간의 마지막 텍스트.
  /// 구간 끝에서만 판정하는 규칙 T를 적용하고(구간의 규칙 A가 0건일 때), 구간 상태를
  /// 리셋한다. 새로 확정된 문구를 [onPartial]과 같은 형식으로 반환한다.
  List<String> onEndpoint(String finalText) {
    // 마지막 텍스트도 부분 결과처럼 한 번 더 판정한다(이미 센 것은 중복되지 않는다).
    final added = onPartial(finalText);
    if (_fuzzyAmen && (_max[amen] ?? 0) == 0) {
      if (ruleT(finalText) || (highSensitivity && endsLoosely(finalText))) {
        added.add(amen);
      }
    }
    reset();
    return added;
  }

  /// 구간 상태를 버린다(인식 시작/정지 때). 문구는 내보내지 않는다.
  void reset() {
    for (final k in _max.keys.toList()) {
      _max[k] = 0;
    }
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
