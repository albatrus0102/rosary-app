/// 이메일·비밀번호 입력 검증(한국어 메시지). 통과하면 null.
final RegExp _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');

const int minPasswordLength = 8;

String? validateEmail(String? value) {
  final v = (value ?? '').trim();
  if (v.isEmpty) return '이메일을 입력해 주세요.';
  if (!_emailPattern.hasMatch(v)) {
    return '이메일 형식이 올바르지 않아요. 예: name@example.com';
  }
  return null;
}

String? validatePassword(String? value) {
  final v = value ?? '';
  if (v.isEmpty) return '비밀번호를 입력해 주세요.';
  if (v.length < minPasswordLength) {
    return '비밀번호는 $minPasswordLength자 이상이어야 해요.';
  }
  return null;
}
