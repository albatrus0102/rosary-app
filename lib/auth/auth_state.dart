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
    this.errorMessage,
  });

  const AuthState.loading() : this._(AuthStatus.loading);

  const AuthState.signedOut({String? errorMessage})
    : this._(AuthStatus.signedOut, errorMessage: errorMessage);

  const AuthState.signedIn({
    required String userId,
    String? email,
    LoginProvider? provider,
  }) : this._(
         AuthStatus.signedIn,
         userId: userId,
         email: email,
         provider: provider,
       );

  final AuthStatus status;
  final String? userId;
  final String? email;
  final LoginProvider? provider;

  /// 한국어 오류 문구(예: 로그인 콜백 실패). 화면이 SnackBar로 보여 준다.
  final String? errorMessage;

  bool get isLoading => status == AuthStatus.loading;
  bool get isSignedIn => status == AuthStatus.signedIn;
  bool get isSignedOut => status == AuthStatus.signedOut;

  @override
  bool operator ==(Object other) =>
      other is AuthState &&
      other.status == status &&
      other.userId == userId &&
      other.email == email &&
      other.provider == provider &&
      other.errorMessage == errorMessage;

  @override
  int get hashCode =>
      Object.hash(status, userId, email, provider, errorMessage);

  // 토큰·이메일·ID가 로그에 남지 않도록 상태 이름만 낸다.
  @override
  String toString() => 'AuthState(${status.name})';
}

/// 인증 작업 실패. [message]는 사용자에게 그대로 보여 줘도 되는 한국어 문구.
class AuthFailure implements Exception {
  const AuthFailure(this.message);
  final String message;

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
