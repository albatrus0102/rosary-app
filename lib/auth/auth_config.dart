/// 로그인 정책 상수.
abstract final class AuthConfig {
  /// 앱을 쓰려면 로그인이 필요한지(기본 false = 게스트 우선).
  ///
  /// false이면 첫 실행에서 동의 한 화면을 거친 뒤 Supabase 익명 로그인으로 게스트가
  /// 만들어지고, 로그인(카카오·Google·이메일)은 더보기 > 계정의 '기록 지키기'에서 나중에
  /// 연결한다. true이면 예전처럼 로그아웃 상태에서 [LoginScreen]이 앞을 막는다.
  static const bool requireLogin = false;
}
