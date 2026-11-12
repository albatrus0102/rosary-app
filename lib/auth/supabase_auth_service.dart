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
  final anonymous = user.isAnonymous;
  // 게스트를 연결하면 app_metadata.provider는 처음 값(anonymous)으로 남을 수 있으므로
  // 연결된 identity도 함께 본다.
  LoginProvider? provider;
  if (!anonymous) {
    for (final identity in user.identities ?? const <UserIdentity>[]) {
      provider ??= LoginProvider.fromId(identity.provider);
    }
    provider ??= LoginProvider.fromId(user.appMetadata['provider'] as String?);
    final providers = user.appMetadata['providers'];
    if (provider == null && providers is List) {
      for (final p in providers) {
        provider ??= LoginProvider.fromId('$p');
      }
    }
  }
  return AuthState.signedIn(
    userId: user.id,
    email: user.email != null && user.email!.isNotEmpty ? user.email : null,
    provider: provider,
    isAnonymous: anonymous,
  );
}

/// 게스트 시작이 서버 설정 때문에 막혔을 때의 문구(설정 방법은 사용자에게 보이지 않는다).
const String guestUnavailableMessage =
    '지금은 게스트로 시작할 수 없어요. 잠시 후 다시 시도하거나, 이 기기에서만 쓰는 모드로 계속할 수 있어요.';

/// 예외를 사용자에게 보여 줄 한국어 문구로 바꾼다(원문·토큰은 노출하지 않는다).
String localizeAuthError(Object error) {
  if (error is AuthFailure) return error.message;
  if (error is AuthException) {
    final code = (error.code ?? '').toLowerCase();
    switch (code) {
      case 'anonymous_provider_disabled':
      case 'captcha_failed':
        return guestUnavailableMessage;
      case 'identity_already_exists':
        return '이미 다른 계정에 연결된 로그인이에요. 그 계정으로 로그인하려면 \'이미 계정이 있어요\'를 눌러 주세요.';
      case 'manual_linking_disabled':
        return '지금은 계정을 연결할 수 없어요. 잠시 후 다시 시도해 주세요.';
    }
  }
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

/// 예외를 [AuthFailure]로 바꾸고 종류(오프라인·게스트 불가)를 붙인다.
AuthFailure authFailureFrom(Object error) {
  if (error is AuthFailure) return error;
  final message = localizeAuthError(error);
  final code = error is AuthException ? (error.code ?? '').toLowerCase() : '';
  final kind =
      error is SocketException ||
          error is TimeoutException ||
          error is AuthRetryableFetchException
      ? AuthFailureKind.network
      : (code == 'anonymous_provider_disabled' || code == 'captcha_failed')
      ? AuthFailureKind.guestUnavailable
      : AuthFailureKind.generic;
  return AuthFailure(message, kind: kind);
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

  // ---- 게스트 시작 · 계정 연결 ------------------------------------------

  @override
  Future<void> signInAnonymously({String? captchaToken}) async {
    if (_client.auth.currentSession != null) return;
    try {
      await _client.auth.signInAnonymously(captchaToken: captchaToken);
    } catch (e) {
      throw authFailureFrom(e);
    }
  }

  void _requireGuest() {
    final user = _client.auth.currentUser;
    if (user == null || !user.isAnonymous) {
      throw const AuthFailure('게스트로 쓰는 중일 때만 연결할 수 있어요.');
    }
  }

  Future<void> _link(OAuthProvider provider) async {
    _requireGuest();
    try {
      final launched = await _client.auth.linkIdentity(
        provider,
        redirectTo: redirectTo,
        authScreenLaunchMode: LaunchMode.externalApplication,
      );
      if (!launched) {
        throw const AuthFailure('브라우저를 열 수 없어요. 다시 시도해 주세요.');
      }
    } catch (e) {
      throw authFailureFrom(e);
    }
  }

  @override
  Future<void> linkWithKakao() => _link(OAuthProvider.kakao);

  @override
  Future<void> linkWithGoogle() => _link(OAuthProvider.google);

  @override
  Future<EmailSignUpOutcome> linkWithEmail(
    String email,
    String password,
  ) async {
    _requireGuest();
    try {
      final res = await _client.auth.updateUser(
        UserAttributes(email: email.trim(), password: password),
        emailRedirectTo: redirectTo,
      );
      final linked = res.user?.isAnonymous == false;
      _state.value = authStateFromSession(_client.auth.currentSession);
      return linked
          ? EmailSignUpOutcome.signedIn
          : EmailSignUpOutcome.confirmationRequired;
    } catch (e) {
      throw authFailureFrom(e);
    }
  }

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
