/// 스트리밍 인식기의 부분 결과 텍스트에서 트리거 문구("아멘" 등)가
/// 새로 등장한 횟수를 판정한다.
///
/// 부분 결과는 한 발화 구간(endpoint 사이)에서 늘어나기도, 흔들리기도 한다.
/// 구간 내 문구별 등장 횟수의 최대값을 기억하고, 새 횟수가 그 최대값을 넘을 때만
/// 차이를 반환하므로 같은 문구가 중복 집계되지 않는다.
///
/// 별칭(예: '아맨')은 정규 문구('아멘')로 합산·정규화해서 내보낸다.
class AmenMatcher {
  AmenMatcher({
    List<String> patterns = defaultPatterns,
    Map<String, String> aliases = defaultAliases,
  }) {
    // 정규 문구(canonical) 순서를 유지하면서, 별칭 → 정규 문구 매핑을 만든다.
    for (final raw in patterns) {
      final p = normalize(raw);
      if (p.isEmpty) continue;
      final canonical = normalize(aliases[raw] ?? aliases[p] ?? p);
      _patterns.add((pattern: p, canonical: canonical));
      _max.putIfAbsent(canonical, () => 0);
    }
  }

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
      counts[p.canonical] =
          (counts[p.canonical] ?? 0) + _countNonOverlapping(t, p.pattern);
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

  /// 인식기가 endpoint를 감지하면 호출한다. 구간 상태를 리셋한다.
  void onEndpoint() {
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
