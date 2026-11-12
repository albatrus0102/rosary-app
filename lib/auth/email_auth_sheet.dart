import 'package:flutter/material.dart';

import '../app/theme.dart';
import 'auth_service.dart';
import 'auth_state.dart';
import 'auth_validators.dart';
import 'auth_widgets.dart';

enum EmailAuthMode { signIn, signUp }

/// 이메일 가입·로그인 바텀시트: 이메일, 비밀번호(보기 토글), 가입/로그인 전환,
/// 비밀번호 재설정, 한국어 인라인 검증 메시지.
class EmailAuthSheet extends StatefulWidget {
  const EmailAuthSheet({super.key, required this.authService});

  final AuthService authService;

  @override
  State<EmailAuthSheet> createState() => _EmailAuthSheetState();
}

class _EmailAuthSheetState extends State<EmailAuthSheet> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  EmailAuthMode _mode = EmailAuthMode.signIn;
  bool _obscure = true;
  bool _busy = false;
  String? _error;
  String? _info;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  bool get _isSignUp => _mode == EmailAuthMode.signUp;

  Future<void> _submit() async {
    if (_busy) return;
    setState(() {
      _error = null;
      _info = null;
    });
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    try {
      if (_isSignUp) {
        final outcome = await widget.authService.signUpWithEmail(
          _email.text,
          _password.text,
        );
        if (!mounted) return;
        if (outcome == EmailSignUpOutcome.confirmationRequired) {
          setState(() {
            _mode = EmailAuthMode.signIn;
            _info = '확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.';
          });
        } else {
          _close();
        }
      } else {
        await widget.authService.signInWithEmail(_email.text, _password.text);
        if (mounted) _close();
      }
    } on AuthFailure catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = '문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _close() {
    final nav = Navigator.of(context);
    if (nav.canPop()) nav.pop();
  }

  Future<void> _reset() async {
    if (_busy) return;
    setState(() {
      _error = null;
      _info = null;
    });
    final emailError = validateEmail(_email.text);
    if (emailError != null) {
      setState(() => _error = '비밀번호를 다시 설정하려면 먼저 이메일을 입력해 주세요.');
      return;
    }
    setState(() => _busy = true);
    try {
      await widget.authService.resetPassword(_email.text);
      if (mounted) {
        setState(() => _info = '비밀번호 재설정 메일을 보냈어요. 받은 편지함을 확인해 주세요.');
      }
    } on AuthFailure catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = '문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final text = theme.textTheme;
    final viewInsets = MediaQuery.viewInsetsOf(context).bottom;

    return AnimatedPadding(
      duration: AppMotion.of(context, Durations.short3),
      curve: Easing.standard,
      padding: EdgeInsets.only(bottom: viewInsets),
      child: SingleChildScrollView(
        child: AuthColumn(
          padding: const EdgeInsets.fromLTRB(
            AppSpace.md,
            0,
            AppSpace.md,
            AppSpace.md,
          ),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Semantics(
                  header: true,
                  child: Text(
                    _isSignUp ? '이메일로 가입' : '이메일로 로그인',
                    style: text.titleLarge,
                  ),
                ),
                const SizedBox(height: AppSpace.sm),
                SegmentedButton<EmailAuthMode>(
                  key: const Key('email-mode'),
                  segments: const [
                    ButtonSegment(
                      value: EmailAuthMode.signIn,
                      label: Text('로그인'),
                    ),
                    ButtonSegment(
                      value: EmailAuthMode.signUp,
                      label: Text('가입'),
                    ),
                  ],
                  selected: {_mode},
                  onSelectionChanged: _busy
                      ? null
                      : (s) => setState(() {
                          _mode = s.first;
                          _error = null;
                          _info = null;
                        }),
                ),
                const SizedBox(height: AppSpace.sm),
                TextFormField(
                  key: const Key('email-field'),
                  controller: _email,
                  enabled: !_busy,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.email],
                  autocorrect: false,
                  decoration: const InputDecoration(
                    labelText: '이메일',
                    hintText: 'name@example.com',
                    border: OutlineInputBorder(),
                  ),
                  validator: validateEmail,
                ),
                const SizedBox(height: AppSpace.sm),
                TextFormField(
                  key: const Key('password-field'),
                  controller: _password,
                  enabled: !_busy,
                  obscureText: _obscure,
                  textInputAction: TextInputAction.done,
                  autofillHints: [
                    _isSignUp
                        ? AutofillHints.newPassword
                        : AutofillHints.password,
                  ],
                  onFieldSubmitted: (_) => _submit(),
                  decoration: InputDecoration(
                    labelText: '비밀번호',
                    helperText: _isSignUp ? '$minPasswordLength자 이상' : null,
                    border: const OutlineInputBorder(),
                    suffixIcon: IconButton(
                      key: const Key('password-toggle'),
                      tooltip: _obscure ? '비밀번호 보기' : '비밀번호 숨기기',
                      icon: Icon(
                        _obscure ? Icons.visibility : Icons.visibility_off,
                      ),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                  ),
                  validator: (v) {
                    // 로그인은 서버가 판단하므로 비어 있는지만 본다.
                    if (!_isSignUp) {
                      return (v ?? '').isEmpty ? '비밀번호를 입력해 주세요.' : null;
                    }
                    return validatePassword(v);
                  },
                ),
                LiveErrorText(_error),
                if (_info != null)
                  Semantics(
                    liveRegion: true,
                    container: true,
                    child: Padding(
                      padding: const EdgeInsets.only(top: AppSpace.xs),
                      child: Text(
                        _info!,
                        style: text.bodyMedium?.copyWith(color: scheme.primary),
                      ),
                    ),
                  ),
                const SizedBox(height: AppSpace.sm),
                FilledButton(
                  key: const Key('email-submit'),
                  onPressed: _busy ? null : _submit,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(
                      AppTheme.largeButtonHeight,
                    ),
                  ),
                  child: _busy
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.5),
                        )
                      : Text(_isSignUp ? '가입하기' : '로그인'),
                ),
                if (!_isSignUp)
                  TextButton(
                    key: const Key('email-reset'),
                    onPressed: _busy ? null : _reset,
                    child: const Text('비밀번호를 잊으셨나요?'),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
