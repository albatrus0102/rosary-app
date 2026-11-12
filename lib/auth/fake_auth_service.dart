import 'dart:async';

import 'package:flutter/foundation.dart';

import 'auth_service.dart';
import 'auth_state.dart';

/// 테스트·미리보기용 인증 서비스. 네트워크를 쓰지 않는다.
class FakeAuthService implements AuthService {
  FakeAuthService({
    AuthState initial = const AuthState.signedOut(),
    this.latency = Duration.zero,
    this.autoCompleteSignIn = true,
  }) : _state = ValueNotifier(initial);

  final ValueNotifier<AuthState> _state;

  /// 각 작업이 끝나기까지 걸리는 시간(로딩 표시 테스트용).
  final Duration latency;

  /// true이면 소셜·이메일 로그인이 즉시 signedIn으로 끝난다(실제 OAuth는 딥링크
  /// 복귀 뒤에 끝나지만 테스트에서는 단순화).
  final bool autoCompleteSignIn;

  /// 다음 작업을 이 메시지로 실패시킨다(한 번 쓰이고 비워진다).
  String? failNextWith;

  /// [failNextWith]로 만드는 실패의 종류(예: 오프라인 흉내는 `network`).
  AuthFailureKind failNextKind = AuthFailureKind.generic;

  /// 호출 기록. 예: `signInWithKakao`, `signUpWithEmail:a@b.co`.
  final List<String> calls = <String>[];

  EmailSignUpOutcome signUpOutcome = EmailSignUpOutcome.signedIn;

  /// [linkWithEmail]의 결과. confirmationRequired이면 [completeLink]를 불러야 연결이 끝난다.
  EmailSignUpOutcome linkEmailOutcome = EmailSignUpOutcome.signedIn;
  int _guestCount = 0;
  String exportJson = '{\n  "profile": {},\n  "consents": []\n}';
  bool accountDeleted = false;

  @override
  ValueListenable<AuthState> get state => _state;

  @override
  AuthState get current => _state.value;

  /// 테스트에서 상태를 직접 바꾼다.
  void emit(AuthState next) => _state.value = next;

  void emitSignedIn({
    String userId = 'user-1',
    String? email = 'tester@example.com',
    LoginProvider provider = LoginProvider.email,
  }) => emit(
    AuthState.signedIn(userId: userId, email: email, provider: provider),
  );

  Future<void> _op(String call) async {
    calls.add(call);
    if (latency > Duration.zero) await Future<void>.delayed(latency);
    final fail = failNextWith;
    if (fail != null) {
      failNextWith = null;
      final kind = failNextKind;
      failNextKind = AuthFailureKind.generic;
      throw AuthFailure(fail, kind: kind);
    }
  }

  Future<void> _social(String call, LoginProvider provider) async {
    await _op(call);
    if (autoCompleteSignIn) {
      emitSignedIn(
        userId: 'user-${provider.id}',
        email: null,
        provider: provider,
      );
    }
  }

  /// 게스트로 시작: 새 익명 사용자(`guest-1`, `guest-2`, …)로 로그인한다.
  @override
  Future<void> signInAnonymously({String? captchaToken}) async {
    await _op('signInAnonymously');
    if (current.isSignedIn) return;
    if (autoCompleteSignIn) {
      emit(
        AuthState.signedIn(userId: 'guest-${++_guestCount}', isAnonymous: true),
      );
    }
  }

  Future<void> _link(
    String call,
    LoginProvider provider, {
    String? email,
    bool complete = true,
  }) async {
    await _op(call);
    final s = current;
    if (!s.isSignedIn || !s.isAnonymous) {
      throw const AuthFailure('게스트로 쓰는 중일 때만 연결할 수 있어요.');
    }
    if (autoCompleteSignIn && complete) completeLink(provider, email: email);
  }

  /// 연결 완료를 흉내 낸다(실제로는 딥링크 복귀·메일 확인 뒤). 사용자 id는 그대로다.
  void completeLink(LoginProvider provider, {String? email}) {
    final s = current;
    emit(
      AuthState.signedIn(
        userId: s.userId ?? 'guest-1',
        email: email,
        provider: provider,
      ),
    );
  }

  @override
  Future<void> linkWithKakao() => _link('linkWithKakao', LoginProvider.kakao);

  @override
  Future<void> linkWithGoogle() =>
      _link('linkWithGoogle', LoginProvider.google);

  @override
  Future<EmailSignUpOutcome> linkWithEmail(
    String email,
    String password,
  ) async {
    await _link(
      'linkWithEmail:$email',
      LoginProvider.email,
      email: email,
      complete: linkEmailOutcome == EmailSignUpOutcome.signedIn,
    );
    return linkEmailOutcome;
  }

  @override
  Future<void> signInWithKakao() =>
      _social('signInWithKakao', LoginProvider.kakao);

  @override
  Future<void> signInWithGoogle() =>
      _social('signInWithGoogle', LoginProvider.google);

  @override
  Future<EmailSignUpOutcome> signUpWithEmail(
    String email,
    String password,
  ) async {
    await _op('signUpWithEmail:$email');
    if (signUpOutcome == EmailSignUpOutcome.signedIn && autoCompleteSignIn) {
      emitSignedIn(email: email);
    }
    return signUpOutcome;
  }

  @override
  Future<void> signInWithEmail(String email, String password) async {
    await _op('signInWithEmail:$email');
    if (autoCompleteSignIn) emitSignedIn(email: email);
  }

  @override
  Future<void> resetPassword(String email) => _op('resetPassword:$email');

  @override
  Future<void> signOut() async {
    await _op('signOut');
    emit(const AuthState.signedOut());
  }

  @override
  Future<void> deleteAccount() async {
    await _op('deleteAccount');
    accountDeleted = true;
    emit(const AuthState.signedOut());
  }

  @override
  Future<String> exportMyData() async {
    await _op('exportMyData');
    return exportJson;
  }

  @override
  void dispose() => _state.dispose();
}
