import 'package:flutter/foundation.dart';

import 'auth_state.dart';

/// 인증 서비스 추상. 화면·게이트는 이 인터페이스만 안다(테스트에서는
/// `FakeAuthService`).
///
/// 모든 실패는 [AuthFailure](한국어 문구)로 던진다.
abstract class AuthService {
  /// 현재 인증 상태. `onAuthStateChange`로 갱신된다.
  ValueListenable<AuthState> get state;

  AuthState get current => state.value;

  /// 브라우저 로그인 흐름을 연다. 완료는 딥링크로 돌아온 뒤 [state]가
  /// signedIn으로 바뀌는 것으로 알 수 있다(이 Future는 브라우저를 연 시점에 끝난다).
  Future<void> signInWithKakao();
  Future<void> signInWithGoogle();

  /// 게스트로 시작한다(Supabase 익명 로그인). 같은 기기의 세션이 복원되면 부르지 않는다.
  /// 성공하면 [state]가 `isAnonymous` signedIn으로 바뀐다.
  /// 실패는 [AuthFailure]: 오프라인이면 `kind == network`, 서버에서 익명 로그인이 꺼져
  /// 있으면 `kind == guestUnavailable`.
  Future<void> signInAnonymously({String? captchaToken});

  /// 게스트를 소셜·이메일 계정에 연결한다('기록 지키기'). 사용자 id가 그대로 유지되어
  /// 서버 데이터가 이어진다. 소셜은 [signInWithKakao]처럼 브라우저를 열고, 끝나면
  /// [state]의 `isAnonymous`가 false로 바뀐다. 게스트가 아니면 [AuthFailure].
  Future<void> linkWithKakao();
  Future<void> linkWithGoogle();

  /// 이메일·비밀번호를 연결한다. 확인 메일이 필요하면 [EmailSignUpOutcome.confirmationRequired]
  /// (메일의 링크를 누르면 연결이 끝난다).
  Future<EmailSignUpOutcome> linkWithEmail(String email, String password);

  Future<EmailSignUpOutcome> signUpWithEmail(String email, String password);
  Future<void> signInWithEmail(String email, String password);
  Future<void> resetPassword(String email);

  Future<void> signOut();

  /// 서버의 `delete_my_account` RPC를 부르고 로그아웃한 뒤 로컬 캐시를 지운다.
  Future<void> deleteAccount();

  /// 서버의 `export_my_data` RPC 결과를 보기 좋은 JSON 문자열로 돌려준다.
  Future<String> exportMyData();

  void dispose();
}
