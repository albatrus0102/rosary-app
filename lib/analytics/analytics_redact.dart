/// 오류 문구 등 자유 문장에서 개인을 식별할 수 있는 값을 가린다. 절대 던지지 않는다.
abstract final class Redactor {
  static final RegExp _email = RegExp(r'[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)+');
  static final RegExp _url = RegExp(
    r'''(?:https?|wss?|ftp|file)://[^\s'")>\]]+''',
    caseSensitive: false,
  );
  static final RegExp _uuid = RegExp(
    r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
  );
  // 기기 안의 절대 경로(`/data/user/0/...`, `C:\Users\...`). `package:a/b.dart`나
  // `dart:async/x.dart`처럼 앞이 글자·`:`인 것은 건드리지 않는다.
  static final RegExp _unixPath = RegExp(
    r'''(?<![\w.:\-/>])(/[^\s:()'",;]+)''',
  );
  static final RegExp _winPath = RegExp(r'''[A-Za-z]:\\[^\s:()'",;]*''');
  static final RegExp _longDigits = RegExp(r'\d{6,}');
  static final RegExp _token = RegExp(r'[A-Za-z0-9_\-]{32,}');

  /// [input]에서 URL, 이메일, UUID, 기기 경로, 긴 숫자열, 긴 토큰을 가린다.
  static String redact(String input) {
    try {
      var s = input;
      s = s.replaceAll(_url, '<url>');
      s = s.replaceAll(_email, '<email>');
      s = s.replaceAll(_uuid, '<uuid>');
      s = s.replaceAllMapped(_winPath, (m) {
        final p = m[0]!;
        final base = p.split('\\').last;
        return base.isEmpty ? '<path>' : '<path>/$base';
      });
      s = s.replaceAllMapped(_unixPath, (m) {
        final base = m[1]!.split('/').last;
        return base.isEmpty ? '<path>' : '<path>/$base';
      });
      s = s.replaceAll(_longDigits, '<n>');
      s = s.replaceAll(_token, '<token>');
      return s;
    } catch (_) {
      return '';
    }
  }

  /// 값이 이메일·UUID·URL·전화번호처럼 보이면 true(짧은 열거형 값 검사용).
  static bool looksIdentifying(String v) {
    if (v.contains('@')) return true;
    if (v.contains('://') || v.contains('/') || v.contains(':')) return true;
    if (_uuid.hasMatch(v)) return true;
    final digits = v.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length >= 7) return true;
    if (RegExp(r'^[\w\-]+\.[A-Za-z]{2,}(?:/|$)').hasMatch(v)) return true;
    return false;
  }
}
