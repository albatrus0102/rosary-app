import 'package:flutter/material.dart';

import '../app/theme.dart';
import 'auth_service.dart';
import 'auth_state.dart';
import 'auth_widgets.dart';
import 'email_auth_sheet.dart';
import 'legal_screen.dart';
import 'legal_texts.dart';

/// 카카오 브랜드 색(공식 가이드). 고정 브랜드 색이 허용되는 유일한 자리.
const Color kakaoYellow = Color(0xFFFEE500);
const Color kakaoLabel = Color(0xFF191919);

/// 로그인 화면: 카카오 · Google · 이메일.
///
/// 게스트 우선 흐름에서는 더보기 > 계정 > '기록 지키기'의 '이미 계정이 있어요'로만 열린다
/// (이미 가진 계정으로 돌아가기). 로그인에 성공하면 스스로 닫힌다. 로그인이 필수인 설정
/// ([AuthConfig.requireLogin] true)에서는 [AuthGate]의 첫 화면이다.
///
/// TODO(release): 각 공급자의 공식 로그인 버튼 자산·문구 가이드(카카오, Google)를
/// 적용한다. 지금은 일반 아이콘만 쓴다.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.authService});

  final AuthService authService;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  LoginProvider? _busy;
  String? _lastShownError;

  @override
  void initState() {
    super.initState();
    widget.authService.state.addListener(_onState);
    WidgetsBinding.instance.addPostFrameCallback((_) => _onState());
  }

  @override
  void dispose() {
    widget.authService.state.removeListener(_onState);
    super.dispose();
  }

  /// 로그인 콜백 실패 같은 서비스 쪽 오류 문구를 SnackBar로 알린다.
  void _onState() {
    if (!mounted) return;
    final state = widget.authService.state.value;
    // 계정 화면에서 열린 경우: 실제 계정으로 로그인되면 닫는다.
    if (state.isRealAccount) {
      final nav = Navigator.of(context);
      if (nav.canPop()) nav.pop();
      return;
    }
    final msg = state.errorMessage;
    if (msg != null && msg != _lastShownError) {
      _lastShownError = msg;
      showAuthSnack(context, msg);
    } else if (msg == null) {
      _lastShownError = null;
    }
  }

  Future<void> _run(
    LoginProvider provider,
    Future<void> Function() action,
  ) async {
    if (_busy != null) return;
    setState(() => _busy = provider);
    try {
      await action();
    } on AuthFailure catch (e) {
      if (mounted) showAuthSnack(context, e.message);
    } catch (_) {
      if (mounted) showAuthSnack(context, '문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  void _openLegal(String title, String body) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        settings: const RouteSettings(name: 'legal'),
        builder: (_) => LegalScreen(title: title, body: body),
      ),
    );
  }

  Future<void> _openEmail() {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => SafeArea(
        top: false,
        child: EmailAuthSheet(authService: widget.authService),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final text = theme.textTheme;
    final busy = _busy != null;

    ButtonStyle style({
      Color? background,
      Color? foreground,
      BorderSide? side,
    }) => ButtonStyle(
      minimumSize: const WidgetStatePropertyAll(
        Size.fromHeight(AppTheme.largeButtonHeight),
      ),
      shape: const WidgetStatePropertyAll(AppShape.full),
      backgroundColor: background == null
          ? null
          : WidgetStateProperty.resolveWith(
              (states) => states.contains(WidgetState.disabled)
                  ? background.withValues(alpha: 0.6)
                  : background,
            ),
      foregroundColor: foreground == null
          ? null
          : WidgetStateProperty.resolveWith(
              (states) => states.contains(WidgetState.disabled)
                  ? foreground.withValues(alpha: 0.6)
                  : foreground,
            ),
      side: WidgetStateProperty.resolveWith(
        (states) => focusSide(states, scheme, base: side),
      ),
    );

    Widget label(LoginProvider p, String s, IconData icon) {
      if (_busy == p) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2.5),
            ),
            const SizedBox(width: AppSpace.xs),
            Flexible(child: Text('$s…')),
          ],
        );
      }
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 22),
          const SizedBox(width: AppSpace.xs),
          Flexible(child: Text(s)),
        ],
      );
    }

    return Scaffold(
      appBar: Navigator.of(context).canPop() ? AppBar() : null,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: AuthColumn(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpace.md,
                  vertical: AppSpace.md,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Card.filled(
                        shape: AppShape.extraLargeBorder,
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpace.sm),
                          child: Image.asset(
                            'assets/images/rosary.png',
                            width: 96,
                            height: 96,
                            fit: BoxFit.contain,
                            excludeFromSemantics: true,
                            errorBuilder: (_, _, _) => Icon(
                              Icons.favorite_border,
                              size: 64,
                              color: scheme.primary,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpace.md),
                    Semantics(
                      header: true,
                      child: Text(
                        '묵주기도',
                        textAlign: TextAlign.center,
                        style: text.headlineLarge,
                      ),
                    ),
                    const SizedBox(height: AppSpace.xs),
                    Text(
                      '이미 계정이 있다면 로그인해 주세요.',
                      textAlign: TextAlign.center,
                      style: text.bodyLarge?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: AppSpace.lg),
                    FilledButton(
                      key: const Key('login-kakao'),
                      onPressed: busy
                          ? null
                          : () => _run(
                              LoginProvider.kakao,
                              widget.authService.signInWithKakao,
                            ),
                      style: style(
                        background: kakaoYellow,
                        foreground: kakaoLabel,
                      ),
                      child: label(
                        LoginProvider.kakao,
                        '카카오로 시작하기',
                        Icons.chat_bubble,
                      ),
                    ),
                    const SizedBox(height: AppSpace.xs + 4),
                    OutlinedButton(
                      key: const Key('login-google'),
                      onPressed: busy
                          ? null
                          : () => _run(
                              LoginProvider.google,
                              widget.authService.signInWithGoogle,
                            ),
                      style: style(side: BorderSide(color: scheme.outline)),
                      child: label(
                        LoginProvider.google,
                        'Google로 시작하기',
                        Icons.g_mobiledata,
                      ),
                    ),
                    const SizedBox(height: AppSpace.xs + 4),
                    FilledButton.tonal(
                      key: const Key('login-email'),
                      onPressed: busy ? null : _openEmail,
                      style: style(),
                      child: label(
                        LoginProvider.email,
                        '이메일로 시작하기',
                        Icons.mail_outline,
                      ),
                    ),
                    const SizedBox(height: AppSpace.md),
                    Text(
                      '로그인하면 그 계정에 저장된 동의와 기록을 불러와요.',
                      textAlign: TextAlign.center,
                      style: text.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: AppSpace.xs),
                    Wrap(
                      alignment: WrapAlignment.center,
                      children: [
                        TextButton(
                          key: const Key('login-terms'),
                          onPressed: () =>
                              _openLegal(legalTermsTitle, legalTermsBody),
                          child: const Text('이용약관'),
                        ),
                        TextButton(
                          key: const Key('login-privacy'),
                          onPressed: () =>
                              _openLegal(legalPrivacyTitle, legalPrivacyBody),
                          child: const Text('개인정보처리방침'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
