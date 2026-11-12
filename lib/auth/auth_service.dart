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
