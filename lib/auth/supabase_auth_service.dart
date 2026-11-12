import 'dart:async';
import 'dart:convert';
import 'dart:io' show SocketException;

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;
import 'package:supabase_flutter/supabase_flutter.dart' as sb show AuthState;

import 'auth_service.dart';
import 'auth_state.dart';
import 'backend_config.dart';

/// 세션에서 [AuthState]를 만든다. 만료된(그러나 남아 있는) 세션도 로그인
/// 상태로 본다: 오프라인에서 앱을 열 수 있어야 하고, 갱신은 온라인이 되면
/// supabase_flutter가 알아서 한다.
AuthState authStateFromSession(Session? session) {
  final user = session?.user;
  if (user == null) return const AuthState.signedOut();
  final providerId =
      user.appMetadata['provider'] as String? ??
      (user.identities?.isNotEmpty == true
          ? user.identities!.first.provider
          : null);
  return AuthState.signedIn(
    userId: user.id,
    email: user.email != null && user.email!.isNotEmpty ? user.email : null,
    provider: LoginProvider.fromId(providerId),
  );
}

/// 예외를 사용자에게 보여 줄 한국어 문구로 바꾼다(원문·토큰은 노출하지 않는다).
String localizeAuthError(Object error) {
  if (error is AuthFailure) return error.message;
  if (error is SocketException || error is TimeoutException) {
    return '네트워크에 연결할 수 없어요. 연결을 확인하고 다시 시도해 주세요.';
  }
  if (error is AuthRetryableFetchException) {
    return '네트워크에 연결할 수 없어요. 연결을 확인하고 다시 시도해 주세요.';
  }
  if (error is AuthException) {
    final code = (error.code ?? '').toLowerCase();
    final msg = error.message.toLowerCase();
    switch (code) {
      case 'invalid_credentials':
        return '이메일 또는 비밀번호가 올바르지 않아요.';
      case 'user_already_exists':
      case 'email_exists':
        return '이미 가입된 이메일이에요. 로그인해 주세요.';
      case 'weak_password':
        return '비밀번호가 너무 약해요. 더 길고 복잡하게 만들어 주세요.';
      case 'email_not_confirmed':
        return '이메일 확인이 아직 안 됐어요. 받은 편지함의 확인 메일을 눌러 주세요.';
      case 'over_request_rate_limit':
      case 'over_email_send_rate_limit':
        return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
      case 'signup_disabled':
        return '지금은 새로 가입할 수 없어요.';
      case 'provider_disabled':
      case 'validation_failed':
        return '이 로그인 방법은 아직 사용할 수 없어요.';
    }
    if (msg.contains('invalid login credentials')) {
      return '이메일 또는 비밀번호가 올바르지 않아요.';
    }
    if (msg.contains('already registered')) {
      return '이미 가입된 이메일이에요. 로그인해 주세요.';
    }
    if (msg.contains('rate limit')) {
      return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
    }
    return '로그인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
  }
  if (error is PostgrestException) {
    return '서버 요청에 실패했어요. 잠시 후 다시 시도해 주세요.';
  }
  return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
}

/// Supabase 구현. [AuthBootstrap.init]이 설정됨(true)으로 끝난 뒤에만 만든다.
class SupabaseAuthService implements AuthService {
  SupabaseAuthService({
    SupabaseClient? client,
    this.onLocalDataCleared,
    this.redirectTo = BackendConfig.redirectUrl,
  }) : _client = client ?? Supabase.instance.client {
    _state = ValueNotifier(authStateFromSession(_client.auth.currentSession));
    _sub = _client.auth.onAuthStateChange.listen(
      _onEvent,
      onError: (Object e) {
        // 예: 로그인 콜백 실패. 문구를 한 번 알리고 곧바로 현재 세션 상태로 돌아간다.
        debugPrint('auth: error event (${e.runtimeType})');
        _state.value = AuthState.signedOut(errorMessage: localizeAuthError(e));
        _state.value = authStateFromSession(_client.auth.currentSession);
      },
    );
  }

  final SupabaseClient _client;
  final String redirectTo;

  /// 계정 삭제·로그아웃 뒤 호출되는 로컬 캐시 정리 훅(예: 분석 큐, 기도 기록 캐시).
  final Future<void> Function()? onLocalDataCleared;

  late final ValueNotifier<AuthState> _state;
  late final StreamSubscription<sb.AuthState> _sub;

  @override
  ValueListenable<AuthState> get state => _state;

  @override
  AuthState get current => _state.value;

  void _onEvent(sb.AuthState data) {
    // 이벤트 이름만 기록한다(토큰·이메일·ID 금지).
    debugPrint('auth event: ${data.event.name}');
    if (data.event == AuthChangeEvent.signedOut) {
      _state.value = const AuthState.signedOut();
      return;
    }
    _state.value = authStateFromSession(
      data.session ?? _client.auth.currentSession,
    );
  }

  // ---- 소셜 로그인(브라우저 흐름) --------------------------------------

  Future<void> _oauth(OAuthProvider provider) async {
    try {
      final launched = await _client.auth.signInWithOAuth(
        provider,
        redirectTo: redirectTo,
        authScreenLaunchMode: LaunchMode.externalApplication,
      );
      if (!launched) {
        throw const AuthFailure('브라우저를 열 수 없어요. 다시 시도해 주세요.');
      }
    } catch (e) {
      throw AuthFailure(localizeAuthError(e));
    }
  }

  @override
  Future<void> signInWithKakao() => _oauth(OAuthProvider.kakao);

  @override
  Future<void> signInWithGoogle() => _oauth(OAuthProvider.google);

  // ---- 이메일 ----------------------------------------------------------

  @override
  Future<EmailSignUpOutcome> signUpWithEmail(
    String email,
    String password,
  ) async {
    try {
      final res = await _client.auth.signUp(
        email: email.trim(),
        password: password,
        emailRedirectTo: redirectTo,
      );
      return res.session != null
          ? EmailSignUpOutcome.signedIn
          : EmailSignUpOutcome.confirmationRequired;
    } catch (e) {
      throw AuthFailure(localizeAuthError(e));
    }
  }

  @override
  Future<void> signInWithEmail(String email, String password) async {
    try {
      await _client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
    } catch (e) {
      throw AuthFailure(localizeAuthError(e));
    }
  }

  @override
  Future<void> resetPassword(String email) async {
    try {
      await _client.auth.resetPasswordForEmail(
        email.trim(),
        redirectTo: redirectTo,
      );
    } catch (e) {
      throw AuthFailure(localizeAuthError(e));
    }
  }

  // ---- 로그아웃·삭제·내보내기 -----------------------------------------

  @override
  Future<void> signOut() async {
    try {
      await _client.auth.signOut();
    } catch (e) {
      // 오프라인 등으로 서버 폐기가 실패해도 기기에서는 반드시 로그아웃한다.
      debugPrint('auth: global signOut failed (${e.runtimeType}), local only');
      try {
        await _client.auth.signOut(scope: SignOutScope.local);
      } catch (_) {}
    }
    _state.value = const AuthState.signedOut();
  }

  @override
  Future<void> deleteAccount() async {
    try {
      await _client.rpc('delete_my_account');
    } catch (e) {
      throw AuthFailure(
        e is PostgrestException || e is AuthException
            ? '계정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.'
            : localizeAuthError(e),
      );
    }
    try {
      await _client.auth.signOut(scope: SignOutScope.local);
    } catch (_) {
      // 사용자는 이미 서버에서 사라졌다. 로컬 세션만 비운다.
    }
    _state.value = const AuthState.signedOut();
    await onLocalDataCleared?.call();
  }

  @override
  Future<String> exportMyData() async {
    try {
      final data = await _client.rpc('export_my_data');
      return const JsonEncoder.withIndent('  ').convert(data);
    } catch (e) {
      throw AuthFailure(
        e is PostgrestException
            ? '내 데이터를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.'
            : localizeAuthError(e),
      );
    }
  }

  @override
  void dispose() {
    unawaited(_sub.cancel());
    _state.dispose();
  }
}
