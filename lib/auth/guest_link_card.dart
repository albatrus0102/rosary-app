import 'package:flutter/material.dart';

import '../app/theme.dart';
import 'auth_service.dart';
import 'auth_state.dart';
import 'auth_widgets.dart';
import 'consent_store.dart';
import 'email_auth_sheet.dart';
import 'login_screen.dart';

/// '기록 지키기' 카드: 게스트가 카카오·Google·이메일을 연결해 같은 사용자 id로
/// 기록을 이어 가게 한다. 게스트가 아니면(로그인 계정이거나 로그아웃) 아무것도 그리지 않는다.
///
/// 계정 화면이 쓰고, 다른 화면(예: 기록·통계의 권유 배너)도 그대로 넣을 수 있다.
class GuestLinkCard extends StatefulWidget {
  const GuestLinkCard({
    super.key,
    required this.authService,
    this.consentStore,
    this.onLinkStarted,
    this.showExistingAccount = true,
  });

  final AuthService authService;

  /// 있으면 기도 기록 동기화(`sync`) 동의가 꺼져 있을 때 안내 한 줄을 더한다.
  final ConsentStore? consentStore;

  /// 연결을 시작한 직후(브라우저가 열리거나 이메일을 보낸 뒤) 호출된다.
  final VoidCallback? onLinkStarted;

  /// '이미 계정이 있어요' 링크를 보일지.
  final bool showExistingAccount;

  @override
  State<GuestLinkCard> createState() => _GuestLinkCardState();
}

class _GuestLinkCardState extends State<GuestLinkCard> {
  LoginProvider? _busy;

  AuthService get _auth => widget.authService;

  Future<void> _link(LoginProvider p, Future<void> Function() action) async {
    if (_busy != null) return;
    setState(() => _busy = p);
    try {
      await action();
      widget.onLinkStarted?.call();
    } on AuthFailure catch (e) {
      if (mounted) showAuthSnack(context, e.message);
    } catch (_) {
      if (mounted) showAuthSnack(context, '문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _openEmail() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => SafeArea(
        top: false,
        child: EmailAuthSheet(authService: _auth, linkGuest: true),
      ),
    );
    widget.onLinkStarted?.call();
  }

  Future<void> _existingAccount() async {
    final go = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('이미 계정이 있나요?'),
        content: const Text(
          '그 계정으로 로그인하면 이 게스트의 기록은 이 기기에서 사라지고, '
          '그 계정에 저장된 기록을 보게 돼요. 이 게스트 기록을 지키려면 위의 \'연결\'을 쓰세요.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('취소'),
          ),
          FilledButton(
            key: const Key('guest-existing-confirm'),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('로그인하러 가기'),
          ),
        ],
      ),
    );
    if (go != true || !mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        settings: const RouteSettings(name: 'login'),
        builder: (_) => LoginScreen(authService: _auth),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([_auth.state, ?widget.consentStore]),
      builder: (context, _) {
        final s = _auth.current;
        if (!s.isSignedIn || !s.isAnonymous) return const SizedBox.shrink();
        return _buildCard(context);
      },
    );
  }

  Widget _buildCard(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final text = theme.textTheme;
    final busy = _busy != null;
    final syncOff =
        widget.consentStore != null &&
        !widget.consentStore!.has(ConsentKind.sync);

    Widget label(LoginProvider p, String s, IconData icon) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _busy == p
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              )
            : Icon(icon, size: 22),
        const SizedBox(width: AppSpace.xs),
        Flexible(child: Text(_busy == p ? '$s…' : s)),
      ],
    );

    final size = WidgetStatePropertyAll(
      Size.fromHeight(AppTheme.largeButtonHeight),
    );

    return Card.filled(
      key: const Key('guest-link-card'),
      color: scheme.secondaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(Icons.shield_outlined, color: scheme.onSecondaryContainer),
                const SizedBox(width: AppSpace.xs),
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text(
                      '기록 지키기',
                      style: text.titleMedium?.copyWith(
                        color: scheme.onSecondaryContainer,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.xs),
            Text(
              '지금은 게스트예요. 기록이 이 기기의 로그인 정보에 묶여 있어서, 앱을 지우거나 '
              '기기를 바꾸면 사라질 수 있어요. 아래 중 하나를 연결하면 같은 기록 그대로 '
              '계속 이어 쓸 수 있어요.',
              style: text.bodyMedium?.copyWith(
                color: scheme.onSecondaryContainer,
              ),
            ),
            if (syncOff) ...[
              const SizedBox(height: AppSpace.xxs),
              Text(
                '기도 기록을 서버에도 보관하려면 아래 선택 동의에서 \'기도 기록 동기화\'를 켜 주세요.',
                key: const Key('guest-link-sync-hint'),
                style: text.bodySmall?.copyWith(
                  color: scheme.onSecondaryContainer,
                ),
              ),
            ],
            const SizedBox(height: AppSpace.sm),
            FilledButton(
              key: const Key('link-kakao'),
              onPressed: busy
                  ? null
                  : () => _link(LoginProvider.kakao, _auth.linkWithKakao),
              style: ButtonStyle(
                minimumSize: size,
                shape: const WidgetStatePropertyAll(AppShape.full),
                backgroundColor: const WidgetStatePropertyAll(kakaoYellow),
                foregroundColor: const WidgetStatePropertyAll(kakaoLabel),
              ),
              child: label(LoginProvider.kakao, '카카오 연결', Icons.chat_bubble),
            ),
            const SizedBox(height: AppSpace.xs),
            OutlinedButton(
              key: const Key('link-google'),
              onPressed: busy
                  ? null
                  : () => _link(LoginProvider.google, _auth.linkWithGoogle),
              style: ButtonStyle(
                minimumSize: size,
                shape: const WidgetStatePropertyAll(AppShape.full),
              ),
              child: label(
                LoginProvider.google,
                'Google 연결',
                Icons.g_mobiledata,
              ),
            ),
            const SizedBox(height: AppSpace.xs),
            FilledButton.tonal(
              key: const Key('link-email'),
              onPressed: busy ? null : _openEmail,
              style: ButtonStyle(
                minimumSize: size,
                shape: const WidgetStatePropertyAll(AppShape.full),
              ),
              child: label(LoginProvider.email, '이메일 연결', Icons.mail_outline),
            ),
            if (widget.showExistingAccount)
              TextButton(
                key: const Key('guest-existing-account'),
                onPressed: busy ? null : _existingAccount,
                child: const Text('이미 계정이 있어요'),
              ),
          ],
        ),
      ),
    );
  }
}
