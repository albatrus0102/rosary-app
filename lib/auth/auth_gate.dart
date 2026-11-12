import 'dart:async';

import 'package:flutter/material.dart';

import '../app/theme.dart';
import 'auth_config.dart';
import 'auth_service.dart';
import 'auth_state.dart';
import 'backend_config.dart';
import 'consent_screen.dart';
import 'consent_store.dart';
import 'guest_start.dart';
import 'guest_start_screen.dart';
import 'login_screen.dart';

/// 게이트가 보여 주는 단계.
///
/// 게스트 우선 흐름: splash → consent(첫 실행) → child. [login]은 로그인이 필수인
/// 설정([AuthConfig.requireLogin] true)일 때만 나온다. [guestError]는 게스트 시작이
/// 서버 설정 때문에 막혔을 때(다시 시도 / 이 기기에서만 사용) 나온다.
enum AuthGateStage { child, splash, login, consent, guestError }

/// 상태 → 단계 규칙(테스트 가능하도록 순수 함수로 분리).
///
/// - 백엔드 미설정 → 항상 [AuthGateStage.child](개발용 우회)
/// - 인증 확인 중 → splash
/// - 로그아웃: 로그인 필수 → login. 아니면 필수 동의 미완 → consent(로그인 전에 받아 로컬에
///   저장, 게스트 시작 후 서버로), 동의 완료 → 게스트 시작 중 splash / 막힘 guestError /
///   오프라인 child
/// - 로그인(게스트 포함) + 필수 동의 미완(또는 버전 불일치) → consent
///   (서버의 기존 동의를 확인하는 동안에는 splash)
/// - 그 외 → child
AuthGateStage resolveAuthGateStage({
  required bool backendConfigured,
  required bool requireLogin,
  required AuthState auth,
  required ConsentStore consentStore,
  GuestStartStatus guest = GuestStartStatus.idle,
}) {
  if (!backendConfigured) return AuthGateStage.child;
  if (auth.isLoading) return AuthGateStage.splash;
  if (auth.isSignedOut) {
    if (requireLogin) return AuthGateStage.login;
    if (consentStore.needsConsent) return AuthGateStage.consent;
    return switch (guest) {
      GuestStartStatus.idle ||
      GuestStartStatus.starting => AuthGateStage.splash,
      GuestStartStatus.failed => AuthGateStage.guestError,
      GuestStartStatus.offline => AuthGateStage.child,
    };
  }
  if (consentStore.isCheckingServer) return AuthGateStage.splash;
  if (consentStore.needsConsent) return AuthGateStage.consent;
  return AuthGateStage.child;
}

/// 앱 본문 앞의 관문. `MaterialApp.home`을 이것으로 감싼다(Navigator 아래에 있어야 한다).
class AuthGate extends StatefulWidget {
  const AuthGate({
    super.key,
    required this.child,
    required this.authService,
    required this.consentStore,
    this.requireLogin = AuthConfig.requireLogin,
    this.backendConfigured,
  });

  final Widget child;
  final AuthService authService;
  final ConsentStore consentStore;
  final bool requireLogin;

  /// 백엔드 설정 여부. null이면 [BackendConfig.isConfigured](테스트에서 덮어쓴다).
  final bool? backendConfigured;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> with WidgetsBindingObserver {
  AuthGateStage? _lastStage;
  late GuestStartController _guest;

  bool get _configured =>
      widget.backendConfigured ?? BackendConfig.isConfigured;

  @override
  void initState() {
    super.initState();
    _guest = GuestStartController(widget.authService);
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didUpdateWidget(AuthGate old) {
    super.didUpdateWidget(old);
    if (old.authService != widget.authService) {
      _guest.dispose();
      _guest = GuestStartController(widget.authService);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _guest.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _configured) {
      unawaited(_guest.retryIfOffline());
    }
  }

  AuthGateStage _stage() => resolveAuthGateStage(
    backendConfigured: _configured,
    requireLogin: widget.requireLogin,
    auth: widget.authService.state.value,
    consentStore: widget.consentStore,
    guest: _guest.status,
  );

  /// 로그아웃 상태 + 동의 완료 + 아직 시도 전이면 게스트로 시작한다.
  void _maybeStartGuest() {
    if (!_configured || widget.requireLogin) return;
    final auth = widget.authService.state.value;
    if (!auth.isSignedOut ||
        widget.consentStore.needsConsent ||
        _guest.status != GuestStartStatus.idle) {
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _guest.status != GuestStartStatus.idle) return;
      unawaited(_guest.start());
    });
  }

  /// 단계가 바뀌면(예: 로그아웃) 본문 위에 쌓인 화면(계정 화면, 시트 등)을 걷어 낸다.
  void _afterStageChange(AuthGateStage stage) {
    final previous = _lastStage;
    _lastStage = stage;
    if (previous == null || previous == stage) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      Navigator.maybeOf(context)?.popUntil((r) => r.isFirst);
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([
        widget.authService.state,
        widget.consentStore,
        _guest,
      ]),
      builder: (context, _) {
        final stage = _stage();
        _afterStageChange(stage);
        _maybeStartGuest();
        final Widget page = switch (stage) {
          AuthGateStage.child => widget.child,
          AuthGateStage.splash => const _Splash(),
          AuthGateStage.login => LoginScreen(authService: widget.authService),
          AuthGateStage.consent => ConsentScreen(
            authService: widget.authService,
            consentStore: widget.consentStore,
          ),
          AuthGateStage.guestError => GuestStartErrorScreen(controller: _guest),
        };
        return AnimatedSwitcher(
          duration: AppMotion.of(context, Durations.medium2),
          switchInCurve: Easing.emphasizedDecelerate,
          switchOutCurve: Easing.emphasizedAccelerate,
          child: KeyedSubtree(key: ValueKey(stage), child: page),
        );
      },
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Semantics(
          label: '불러오는 중',
          child: const CircularProgressIndicator(),
        ),
      ),
    );
  }
}
