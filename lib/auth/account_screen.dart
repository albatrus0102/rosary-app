import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app/theme.dart';
import 'auth_service.dart';
import 'auth_state.dart';
import 'auth_widgets.dart';
import 'consent_detail_sheet.dart';
import 'consent_store.dart';
import 'guest_link_card.dart';
import 'legal_screen.dart';
import 'legal_texts.dart';

/// 로그인 방법별 아이콘(공식 로고 아님: 출시 전 공식 자산 적용 TODO).
IconData providerIcon(LoginProvider? p) => switch (p) {
  LoginProvider.kakao => Icons.chat_bubble_outline,
  LoginProvider.google => Icons.g_mobiledata,
  LoginProvider.email => Icons.mail_outline,
  null => Icons.person_outline,
};

/// 선택 동의를 철회했을 때 서버에서 지워지는 것(안내 문구용).
String _revokedDataName(String kind) => switch (kind) {
  ConsentKind.usage => '화면·기능 사용 기록',
  ConsentKind.sync => '기도 기록',
  ConsentKind.church => '성당 이용 기록',
  ConsentKind.diagnostics => '오류·기기 정보',
  _ => '데이터',
};

/// 더보기 > 계정: 프로필(게스트이면 '기록 지키기' 카드), 선택 동의 관리, 내 데이터 내려받기,
/// 약관 링크, 로그아웃, 계정 삭제. 로그인은 여기서 연결하는 것이 유일한 진입점이다.
class AccountScreen extends StatefulWidget {
  const AccountScreen({
    super.key,
    required this.authService,
    required this.consentStore,
  });

  final AuthService authService;
  final ConsentStore consentStore;

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  bool _busy = false;

  AuthService get _auth => widget.authService;
  ConsentStore get _consents => widget.consentStore;

  Future<void> _toggle(String kind, bool value) async {
    final name = _revokedDataName(kind);
    if (value) {
      await _consents.grant(kind, source: 'account');
      if (!mounted) return;
      showAuthSnack(context, '동의했어요. 앞으로 $name이(가) 서버로 전송되어 저장돼요.');
    } else {
      await _consents.revoke(kind, source: 'account');
      if (!mounted) return;
      showAuthSnack(
        context,
        '동의를 철회했어요. 서버에 저장된 $name이(가) 삭제돼요.'
        '${_consents.pendingCount > 0 ? ' (인터넷에 연결되면 처리돼요.)' : ''}',
      );
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

  Future<void> _export() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final json = await _auth.exportMyData();
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (_) => _ExportDialog(json: json),
      );
    } on AuthFailure catch (e) {
      if (mounted) showAuthSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _logout() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(_auth.current.isAnonymous ? '게스트 기록을 지울까요?' : '로그아웃할까요?'),
        content: Text(
          _auth.current.isAnonymous
              ? '게스트는 이 기기의 로그인 정보에 묶여 있어요. 지금 로그아웃하면 이 기록은 다시 볼 수 없고, '
                    '새 게스트로 다시 시작하게 돼요. 기록을 지키려면 먼저 \'기록 지키기\'로 계정을 연결하세요.'
              : '다시 로그인하면 이어서 쓸 수 있어요.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('취소'),
          ),
          FilledButton(
            key: const Key('logout-confirm'),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('로그아웃'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final nav = Navigator.of(context);
    try {
      await _auth.signOut();
      nav.popUntil((r) => r.isFirst);
    } on AuthFailure catch (e) {
      if (mounted) showAuthSnack(context, e.message);
    }
  }

  Future<void> _reconnect() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await _auth.signInAnonymously();
    } on AuthFailure catch (e) {
      if (mounted) showAuthSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _deleteAccount() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => const DeleteAccountDialog(),
    );
    if (ok != true || !mounted) return;
    final nav = Navigator.of(context);
    final uid = _auth.current.userId;
    setState(() => _busy = true);
    try {
      await _auth.deleteAccount();
      await _consents.clearLocalData(uid);
      nav.popUntil((r) => r.isFirst);
    } on AuthFailure catch (e) {
      if (mounted) showAuthSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final text = theme.textTheme;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          const SliverAppBar.large(title: Text('계정')),
          SliverSafeArea(
            top: false,
            sliver: SliverToBoxAdapter(
              child: AuthColumn(
                padding: const EdgeInsets.fromLTRB(
                  AppSpace.sm,
                  0,
                  AppSpace.sm,
                  AppSpace.lg,
                ),
                child: ListenableBuilder(
                  listenable: Listenable.merge([_auth.state, _consents]),
                  builder: (context, _) {
                    final s = _auth.current;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Card.filled(
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpace.sm),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 24,
                                  backgroundColor: scheme.primaryContainer,
                                  foregroundColor: scheme.onPrimaryContainer,
                                  child: Icon(
                                    s.isAnonymous
                                        ? Icons.person_outline
                                        : providerIcon(s.provider),
                                  ),
                                ),
                                const SizedBox(width: AppSpace.sm),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        s.isAnonymous
                                            ? '게스트'
                                            : s.isSignedIn
                                            ? (s.email ?? '소셜 계정')
                                            : '서버에 연결되지 않음',
                                        key: const Key('account-title'),
                                        style: text.titleMedium,
                                        overflow: TextOverflow.ellipsis,
                                        maxLines: 2,
                                      ),
                                      if (s.isAnonymous)
                                        Text(
                                          '로그인 없이 쓰는 중이에요',
                                          style: text.bodyMedium?.copyWith(
                                            color: scheme.onSurfaceVariant,
                                          ),
                                        )
                                      else if (s.provider != null)
                                        Text(
                                          '${s.provider!.label}로 로그인',
                                          style: text.bodyMedium?.copyWith(
                                            color: scheme.onSurfaceVariant,
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (s.isAnonymous) ...[
                          const SizedBox(height: AppSpace.sm),
                          GuestLinkCard(
                            authService: _auth,
                            consentStore: _consents,
                          ),
                        ],
                        if (s.isSignedOut) ...[
                          const SizedBox(height: AppSpace.sm),
                          Card.outlined(
                            child: Padding(
                              padding: const EdgeInsets.all(AppSpace.sm),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text(
                                    '인터넷에 연결되면 게스트로 시작돼요. 그때까지 기록은 이 기기에만 저장돼요.',
                                    style: text.bodyMedium,
                                  ),
                                  const SizedBox(height: AppSpace.xs),
                                  FilledButton(
                                    key: const Key('account-reconnect'),
                                    onPressed: _busy ? null : _reconnect,
                                    child: const Text('다시 연결'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                        if (s.isSignedIn) ...[
                          const SizedBox(height: AppSpace.sm),
                          _header(context, '선택 동의'),
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpace.sm,
                            ),
                            child: Text(
                              '켠 항목만 서버로 전송돼요. 끄면 그 항목의 서버 데이터가 삭제돼요. '
                              '$consentRefusalLine',
                              style: text.bodyMedium?.copyWith(
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpace.xs),
                          Card.outlined(
                            child: Column(
                              children: [
                                for (final kind in ConsentKind.optional)
                                  _consentRow(context, kind),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: AppSpace.sm),
                        _header(context, '내 정보'),
                        Card.outlined(
                          child: Column(
                            children: [
                              if (s.isSignedIn)
                                ListTile(
                                  key: const Key('account-export'),
                                  leading: const Icon(Icons.download_outlined),
                                  title: const Text('내 데이터 내려받기'),
                                  subtitle: const Text(
                                    '서버에 저장된 내 정보를 JSON으로 보여 드려요.',
                                  ),
                                  enabled: !_busy,
                                  onTap: _export,
                                ),
                              ListTile(
                                key: const Key('account-privacy'),
                                leading: const Icon(Icons.privacy_tip_outlined),
                                title: const Text('개인정보처리방침'),
                                trailing: const Icon(Icons.chevron_right),
                                onTap: () => _openLegal(
                                  legalPrivacyTitle,
                                  legalPrivacyBody,
                                ),
                              ),
                              ListTile(
                                key: const Key('account-terms'),
                                leading: const Icon(Icons.description_outlined),
                                title: const Text('이용약관'),
                                trailing: const Icon(Icons.chevron_right),
                                onTap: () =>
                                    _openLegal(legalTermsTitle, legalTermsBody),
                              ),
                            ],
                          ),
                        ),
                        if (s.isSignedIn) ...[
                          const SizedBox(height: AppSpace.sm),
                          _header(context, '계정 관리'),
                          Card.outlined(
                            child: Column(
                              children: [
                                ListTile(
                                  key: const Key('account-logout'),
                                  leading: const Icon(Icons.logout),
                                  title: const Text('로그아웃'),
                                  enabled: !_busy,
                                  onTap: _logout,
                                ),
                                ListTile(
                                  key: const Key('account-delete'),
                                  leading: Icon(
                                    Icons.delete_forever_outlined,
                                    color: scheme.error,
                                  ),
                                  title: Text(
                                    '계정 삭제',
                                    style: TextStyle(color: scheme.error),
                                  ),
                                  subtitle: const Text('계정과 서버의 모든 데이터가 삭제돼요.'),
                                  enabled: !_busy,
                                  onTap: _deleteAccount,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    );
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _header(BuildContext context, String s) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpace.sm,
        AppSpace.xs,
        AppSpace.sm,
        AppSpace.xs,
      ),
      child: Semantics(
        header: true,
        child: Text(
          s,
          style: theme.textTheme.labelLarge?.copyWith(
            color: theme.colorScheme.primary,
          ),
        ),
      ),
    );
  }

  Widget _consentRow(BuildContext context, String kind) {
    final item = consentItemTexts[kind]!;
    return Row(
      children: [
        Expanded(
          child: SwitchListTile(
            key: Key('account-consent-$kind'),
            value: _consents.has(kind),
            onChanged: (v) => _toggle(kind, v),
            title: Text(item.title),
            subtitle: Text(item.summary),
          ),
        ),
        IconButton(
          key: Key('account-consent-detail-$kind'),
          tooltip: '${item.title} 자세히',
          icon: const Icon(Icons.info_outline),
          onPressed: () => showConsentDetailSheet(context, kind),
        ),
      ],
    );
  }
}

/// '내 데이터 내려받기' 결과: 크기와 내용을 보여 주고 복사 버튼을 준다.
class _ExportDialog extends StatelessWidget {
  const _ExportDialog({required this.json});

  final String json;

  static const int _previewChars = 20000;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final bytes = utf8.encode(json).length;
    final size = bytes >= 1024
        ? '${(bytes / 1024).toStringAsFixed(1)}KB'
        : '$bytes바이트';
    final truncated = json.length > _previewChars;
    final shown = truncated ? json.substring(0, _previewChars) : json;
    return AlertDialog(
      title: const Text('내 데이터'),
      content: SizedBox(
        width: 480,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '크기 $size · 복사해서 메모 앱 등에 붙여 넣어 보관할 수 있어요.',
              key: const Key('export-size'),
              style: text.bodyMedium,
            ),
            const SizedBox(height: AppSpace.xs),
            Flexible(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpace.xs),
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHighest,
                  borderRadius: AppShape.small,
                ),
                child: SingleChildScrollView(
                  child: SelectableText(
                    truncated ? '$shown\n… (이하 생략, 복사하면 전체가 복사돼요)' : shown,
                    style: text.bodySmall?.copyWith(fontFamily: 'monospace'),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          key: const Key('export-copy'),
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: json));
            if (context.mounted) showAuthSnack(context, '복사했어요.');
          },
          child: const Text('복사'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('닫기'),
        ),
      ],
    );
  }
}

/// 계정 삭제 확인: 지워지는 것을 나열하고 '삭제'를 직접 입력해야 버튼이 켜진다.
class DeleteAccountDialog extends StatefulWidget {
  const DeleteAccountDialog({super.key});

  /// 입력해야 하는 확인 단어.
  static const String confirmWord = '삭제';

  @override
  State<DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends State<DeleteAccountDialog> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final ok = _controller.text.trim() == DeleteAccountDialog.confirmWord;
    const items = [
      '계정 정보(로그인 방식, 이메일)',
      '동의 기록',
      '서버에 저장된 기도 기록',
      '사용 분석·성당 이용 기록·오류·기기 정보',
    ];
    return AlertDialog(
      icon: Icon(Icons.warning_amber_rounded, color: scheme.error),
      title: const Text('계정을 삭제할까요?'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('삭제하면 되돌릴 수 없어요. 서버에서 다음이 모두 삭제돼요.', style: text.bodyMedium),
            const SizedBox(height: AppSpace.xs),
            for (final i in items)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(right: 8),
                      child: Text('•'),
                    ),
                    Expanded(child: Text(i, style: text.bodyMedium)),
                  ],
                ),
              ),
            const SizedBox(height: AppSpace.sm),
            TextField(
              key: const Key('delete-confirm-field'),
              controller: _controller,
              autofocus: false,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                labelText: "확인을 위해 '삭제'를 입력하세요",
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('취소'),
        ),
        FilledButton(
          key: const Key('delete-confirm'),
          onPressed: ok ? () => Navigator.pop(context, true) : null,
          style: FilledButton.styleFrom(
            backgroundColor: scheme.error,
            foregroundColor: scheme.onError,
          ),
          child: const Text('계정 삭제'),
        ),
      ],
    );
  }
}
