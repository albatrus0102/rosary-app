import '../analytics/analytics_redact.dart';

/// 오류 기록(lib/diag)에 들어가는 값을 거른다. **사용자가 쓴 글·이름·계정 값은 어디에도 싣지 않는다.**
///
/// 독서공방 `rjLogVal`·`errlogScrub`(결정 #656 Q5)를 옮겼다:
/// * 사건 값([value]): 숫자·참거짓·짧은 코드(영숫자 `_ . : -`, 40자)만 그대로, 그 밖의 문자열은 길이(`<n>`)만.
/// * 오류 문구([text]): [Redactor](이메일·URL·UUID·기기 경로·긴 숫자열·긴 토큰) + 따옴표 조각을 길이로 +
///   한글 덩어리를 길이로(기도 의향·세례명은 한글이다) + 첫 줄만(`FormatException`은 둘째 줄부터 입력 원문을 싣는다).
/// * 절대 던지지 않는다. 거르기에 실패하면 원문 대신 빈 문자열을 돌려준다.
abstract final class DiagSanitize {
  static final RegExp _code = RegExp(r'^[A-Za-z0-9_.:\-]{0,40}$');
  static final RegExp _hangul = RegExp(r'[ᄀ-ᇿ㄰-㆏가-힣]+');
  static final RegExp _dq = RegExp(r'"(?:[^"\\\n]|\\.)*"');
  static final RegExp _sq = RegExp(r"'([^'\n]*)'");
  static final RegExp _ident = RegExp(r'^[\w$.\-\[\]#:]{1,60}$');
  static final RegExp _lenMark = RegExp(r'^<\d+>$');

  /// 짧은 코드(열거형 이름·사유 코드·id)인가.
  static bool isCode(String s) => _code.hasMatch(s);

  /// 사건 값 하나.
  static Object value(Object? v) {
    if (v == null) return '-';
    if (v is bool) return v;
    if (v is int) return v;
    if (v is num) return v.isFinite ? (v * 1000).round() / 1000 : '$v';
    if (v is Enum) return v.name;
    if (v is Type) return typeName(v, isType: true);
    if (v is Duration) return v.inMilliseconds;
    if (v is DateTime) return v.millisecondsSinceEpoch;
    if (v is Iterable) return 'list:${v.length}';
    if (v is Map) return 'map:${v.length}';
    if (v is String) return isCode(v) ? v : '<${v.length}>';
    // 오류·그 밖의 객체는 종류 이름만(내용 금지).
    return typeName(v);
  }

  /// 사건 세부(키 24자·12칸까지). 키도 영숫자만.
  static Map<String, Object> detail(Map<String, Object?>? d) {
    if (d == null || d.isEmpty) return const {};
    final out = <String, Object>{};
    for (final e in d.entries) {
      if (out.length >= 12) break;
      var k = e.key.replaceAll(RegExp(r'[^\w]'), '');
      if (k.isEmpty) continue;
      if (k.length > 24) k = k.substring(0, 24);
      out[k] = value(e.value);
    }
    return out;
  }

  /// 사건·화면 이름: 영문 소문자·숫자·`_ . : -`만, 60자.
  static String name(String? s) {
    final v = (s ?? '').trim().replaceAll(RegExp(r'[^A-Za-z0-9_.:\-]'), '_');
    if (v.isEmpty) return '-';
    return v.length > 60 ? v.substring(0, 60) : v;
  }

  /// 객체의 종류 이름(`StateError`, `_TypeError` …). 제네릭 인자는 뗀다. [isType]이면 [o]가 곧 종류(`e.runtimeType`).
  static String typeName(Object? o, {bool isType = false}) {
    if (o == null) return 'Null';
    final t = isType ? o.toString() : o.runtimeType.toString();
    final i = t.indexOf('<');
    final base = i > 0 ? t.substring(0, i) : t;
    return name(base.length > 40 ? base.substring(0, 40) : base);
  }

  /// 오류 문구(한 줄, [max]자).
  static String text(String? s, {int max = 300}) {
    try {
      var v = (s ?? '').replaceAll('\r', '');
      final nl = v.indexOf('\n');
      if (nl >= 0) {
        final more = '\n'.allMatches(v).length;
        v = '${v.substring(0, nl)} <+$more lines>';
      }
      v = _scrub(v);
      return v.length > max ? '${v.substring(0, max)}…' : v;
    } catch (_) {
      return '';
    }
  }

  /// 스택(앞 [lines]줄, 줄마다 200자). 각 줄을 [text]와 같은 규칙으로 거른다.
  static String stack(Object? st, {int lines = 12}) {
    try {
      final raw = st?.toString() ?? '';
      if (raw.isEmpty) return '';
      final out = <String>[];
      for (final l in raw.split('\n')) {
        final t = l.trimRight();
        if (t.isEmpty) continue;
        final s = _scrub(t);
        out.add(s.length > 200 ? s.substring(0, 200) : s);
        if (out.length >= lines) break;
      }
      return out.join('\n');
    } catch (_) {
      return '';
    }
  }

  // 스택의 `file:///…/x.dart:12:3` 은 파일 이름만 남기고, 그 밖의 `scheme://…`(content:// 저장소 주소 등)는 통째로 가린다.
  static final RegExp _fileUri = RegExp(r"""file://[^\s'")>\]]*""");
  static final RegExp _anyUri = RegExp(
    r"""\b[A-Za-z][A-Za-z0-9+.\-]*://[^\s'")>\]]*""",
  );

  static String _scrub(String input) {
    var s = input.replaceAllMapped(_fileUri, (m) {
      final base = m[0]!.split('/').last;
      return base.isEmpty ? '<path>' : '<path>/$base';
    });
    s = s.replaceAll(_anyUri, '<url>');
    s = Redactor.redact(s);
    s = s.replaceAllMapped(
      _dq,
      (m) => _lenMark.hasMatch(m[0]!.substring(1, m[0]!.length - 1))
          ? m[0]!
          : '"<${m[0]!.length - 2}>"',
    );
    s = s.replaceAllMapped(_sq, (m) {
      final x = m[1]!;
      return _ident.hasMatch(x) || _lenMark.hasMatch(x)
          ? m[0]!
          : "'<${x.length}>'";
    });
    s = s.replaceAllMapped(_hangul, (m) => '<ko${m[0]!.length}>');
    return s;
  }
}
