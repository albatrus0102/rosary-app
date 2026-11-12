import 'package:flutter/foundation.dart';

/// 로그인 방법.
enum LoginProvider {
  kakao('카카오', 'kakao'),
  google('Google', 'google'),
  email('이메일', 'email');

  const LoginProvider(this.label, this.id);

  /// 화면에 보이는 이름.
  final String label;

  /// Supabase `app_metadata.provider` 값.
  final String id;

  static LoginProvider? fromId(String? id) {
    for (final p in values) {
      if (p.id == id) return p;
    }
    return null;
  }
}

enum AuthStatus {
  /// 저장된 세션을 확인하는 중(앱 시작 직후).
  loading,
  signedOut,
  signedIn,
}

/// 인증 상태. 불변.
@immutable
class AuthState {
  const AuthState._(
    this.status, {
    this.userId,
    this.email,
    this.provider,
    this.isAnonymous = false,
    this.errorMessage,
  });

  const AuthState.loading() : this._(AuthStatus.loading);

  const AuthState.signedOut({String? errorMessage})
    : this._(AuthStatus.signedOut, errorMessage: errorMessage);

  const AuthState.signedIn({
    required String userId,
    String? email,
    LoginProvider? provider,
    bool isAnonymous = false,
  }) : this._(
         AuthStatus.signedIn,
         userId: userId,
         email: email,
         provider: provider,
         isAnonymous: isAnonymous,
       );

  final AuthStatus status;
  final String? userId;
  final String? email;
  final LoginProvider? provider;

  /// 게스트(Supabase 익명 로그인) 사용자인지. 게스트도 실제 `auth.users` 행이 있으므로
  /// [isSignedIn]은 true이고 [userId]도 있다. 계정을 연결하면 같은 [userId]로 false가 된다.
  final bool isAnonymous;

  /// 한국어 오류 문구(예: 로그인 콜백 실패). 화면이 SnackBar로 보여 준다.
  final String? errorMessage;

  bool get isLoading => status == AuthStatus.loading;
  bool get isSignedIn => status == AuthStatus.signedIn;
  bool get isSignedOut => status == AuthStatus.signedOut;

  /// 로그인(소셜·이메일)으로 연결된 실제 계정인지. 게스트는 false.
  bool get isRealAccount => isSignedIn && !isAnonymous;

  /// 설정 화면 등에 보여 줄 한 줄 이름: 게스트 / 로그인 방법 / 로그인하지 않음.
  String get accountLabel {
    if (!isSignedIn) return '로그인하지 않음';
    if (isAnonymous) return '게스트';
    return provider?.label ?? '로그인됨';
  }

  @override
  bool operator ==(Object other) =>
      other is AuthState &&
      other.status == status &&
      other.userId == userId &&
      other.email == email &&
      other.provider == provider &&
      other.isAnonymous == isAnonymous &&
      other.errorMessage == errorMessage;

  @override
  int get hashCode =>
      Object.hash(status, userId, email, provider, isAnonymous, errorMessage);

  // 토큰·이메일·ID가 로그에 남지 않도록 상태 이름만 낸다.
  @override
  String toString() => 'AuthState(${status.name})';
}

/// 실패 종류(게스트 시작 화면이 오프라인과 서버 설정 문제를 구분한다).
enum AuthFailureKind {
  generic,

  /// 네트워크에 연결할 수 없음(오프라인·시간 초과).
  network,

  /// 서버에서 익명 로그인이 꺼져 있거나 CAPTCHA 등으로 막힘.
  guestUnavailable,
}

/// 인증 작업 실패. [message]는 사용자에게 그대로 보여 줘도 되는 한국어 문구.
class AuthFailure implements Exception {
  const AuthFailure(this.message, {this.kind = AuthFailureKind.generic});
  final String message;
  final AuthFailureKind kind;

  @override
  String toString() => 'AuthFailure';
}

/// 이메일 가입 결과.
enum EmailSignUpOutcome {
  /// 바로 로그인됨.
  signedIn,

  /// 확인 메일의 링크를 눌러야 로그인할 수 있음.
  confirmationRequired,
}
