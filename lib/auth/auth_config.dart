/// 로그인 정책 상수.
abstract final class AuthConfig {
  /// 앱을 쓰려면 로그인이 필요한지(기본 true). 스토어 심사 대응 등으로 로그인을
  /// 선택 사항으로 바꿔야 할 때 이 값 하나만 false로 바꾼다.
  /// false이면 [AuthGate]는 로그아웃 상태에서도 앱 본문을 바로 보여 준다.
  static const bool requireLogin = true;
}
