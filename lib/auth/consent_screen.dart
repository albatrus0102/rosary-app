import 'package:flutter/material.dart';

import '../app/theme.dart';
import 'auth_service.dart';
import 'auth_state.dart';
import 'auth_widgets.dart';
import 'consent_detail_sheet.dart';
import 'consent_store.dart';
import 'legal_screen.dart';
import 'legal_texts.dart';

/// 첫 실행(게스트 시작 전) 또는 동의 버전이 바뀐 뒤 보이는 동의 한 화면.
/// 필수 3개를 모두 체크해야 시작할 수 있고, 선택 4개는 기본 꺼짐이며 따로 켠다.
/// 어떤 항목도 미리 체크되어 있지 않다. 로그인은 필요 없다: 동의는 기기에 저장해 두었다가
/// 게스트로 시작하는 순간 서버로 올라간다.
class ConsentScreen extends StatefulWidget {
  const ConsentScreen({
    super.key,
    required this.authService,
    required this.consentStore,
  });

  final AuthService authService;
  final ConsentStore consentStore;

  @override
  State<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends State<ConsentScreen> {
  final Map<String, bool> _checked = {
    for (final k in ConsentKind.all) k: false,
  };
  bool _saving = false;

  bool get _requiredDone => ConsentKind.required.every((k) => _checked[k]!);
  bool get _allChecked => ConsentKind.all.every((k) => _checked[k]!);

  void _set(String kind, bool value) => setState(() => _checked[kind] = value);

  void _setAll(bool value) => setState(() {
    for (final k in ConsentKind.all) {
      _checked[k] = value;
    }
  });

  Future<void> _submit() async {
    if (!_requiredDone || _saving) return;
    setState(() => _saving = true);
    try {
      await widget.consentStore.setAll(
        Map<String, bool>.of(_checked),
        source: 'consent_screen',
      );
    } finally {
      if (mounted) setState(() => _saving = false);
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

  void _openRequired(String kind) {
    switch (kind) {
      case ConsentKind.terms:
        _openLegal(legalTermsTitle, legalTermsBody);
      case ConsentKind.privacy:
        _openLegal(legalPrivacyConsentTitle, legalPrivacyConsentBody);
      case ConsentKind.age14:
        _openLegal(legalAge14Title, legalAge14Body);
    }
  }

  Future<void> _logout() async {
    try {
      await widget.authService.signOut();
    } on AuthFailure catch (e) {
      if (mounted) showAuthSnack(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final text = theme.textTheme;

    Widget sectionTitle(String s) => Padding(
      padding: const EdgeInsets.only(top: AppSpace.md, bottom: AppSpace.xs),
      child: Semantics(
        header: true,
        child: Text(
          s,
          style: text.labelLarge?.copyWith(color: scheme.primary),
        ),
      ),
    );

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: AuthColumn(
                padding: const EdgeInsets.fromLTRB(
                  AppSpace.md,
                  AppSpace.md,
                  AppSpace.md,
                  AppSpace.sm,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Semantics(
                      header: true,
                      child: Text('시작하기 전에', style: text.headlineMedium),
                    ),
                    const SizedBox(height: AppSpace.xs),
                    Text(
                      '로그인 없이 바로 시작해요. 약관과 개인정보 수집·이용에 동의해 주세요. '
                      '선택 항목은 동의하지 않아도 앱을 똑같이 쓸 수 있어요.',
                      style: text.bodyLarge?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: AppSpace.xs),
                    Card.filled(
                      child: CheckboxListTile(
                        key: const Key('consent-all'),
                        value: _allChecked,
                        onChanged: (v) => _setAll(v ?? false),
                        controlAffinity: ListTileControlAffinity.leading,
                        title: const Text('전체 동의'),
                        subtitle: const Text('필수와 선택 항목을 한 번에 체크해요.'),
                      ),
                    ),
                    sectionTitle('필수 동의'),
                    Card.filled(color: scheme.surfaceContainerLow,
                      child: Column(
                        children: [
                          for (final kind in ConsentKind.required)
                            CheckboxListTile(
                              key: Key('consent-$kind'),
                              value: _checked[kind],
                              onChanged: (v) => _set(kind, v ?? false),
                              controlAffinity: ListTileControlAffinity.leading,
                              title: Text('${consentTitle(kind)} (필수)'),
                              secondary: TextButton(
                                key: Key('consent-view-$kind'),
                                onPressed: () => _openRequired(kind),
                                child: Text(
                                  '보기',
                                  semanticsLabel: '${consentTitle(kind)} 보기',
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    sectionTitle('선택 동의'),
                    Text(
                      '동의한 항목만 서버로 전송됩니다. 기본값은 모두 꺼짐이에요.',
                      style: text.bodyMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: AppSpace.xs),
                    Card.filled(color: scheme.surfaceContainerLow,
                      child: Column(
                        children: [
                          for (final kind in ConsentKind.optional)
                            _OptionalRow(
                              kind: kind,
                              value: _checked[kind]!,
                              onChanged: (v) => _set(kind, v),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpace.sm),
                    _NoticeCard(),
                    const SizedBox(height: AppSpace.sm),
                    Text(
                      consentNotCollectedLine,
                      key: const Key('consent-not-collected'),
                      style: text.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppSpace.xs),
                    Text(
                      '선택 동의는 언제든 더보기 > 계정에서 철회할 수 있어요. '
                      '게스트 기록은 이 기기의 로그인 정보에 묶여 있어서, 앱을 지우면 사라질 수 있어요. '
                      '더보기 > 계정의 \'기록 지키기\'로 나중에 연결할 수 있어요.',
                      style: text.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Material(
        color: scheme.surfaceContainer,
        child: SafeArea(
          top: false,
          child: AuthColumn(
            padding: const EdgeInsets.fromLTRB(
              AppSpace.md,
              AppSpace.xs,
              AppSpace.md,
              AppSpace.xs,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                FilledButton(
                  key: const Key('consent-submit'),
                  onPressed: _requiredDone && !_saving ? _submit : null,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(
                      AppTheme.largeButtonHeight,
                    ),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.5),
                        )
                      : const Text('동의하고 시작하기'),
                ),
                if (widget.authService.state.value.isRealAccount)
                  TextButton(
                    key: const Key('consent-logout'),
                    onPressed: _saving ? null : _logout,
                    child: const Text('로그아웃'),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 서버 전송 고지: 무엇이 어디로 가는지, 수집하지 않는 정보, 국외 저장.
class _NoticeCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final text = theme.textTheme;
    final scheme = theme.colorScheme;
    return Card.filled(
      color: scheme.surfaceContainerHigh,
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.cloud_upload_outlined, color: scheme.primary),
                const SizedBox(width: AppSpace.xs),
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text('서버로 전송·저장되는 정보', style: text.titleSmall),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.xs),
            Text(consentTransmissionNotice, style: text.bodyMedium),
            const SizedBox(height: AppSpace.xs),
            Text('필수: 계정 정보', style: text.labelLarge),
            const SizedBox(height: AppSpace.xxs),
            for (final f in requiredServerFields)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 1),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(right: 8),
                      child: Text('•'),
                    ),
                    Expanded(child: Text(f, style: text.bodyMedium)),
                  ],
                ),
              ),
            const SizedBox(height: AppSpace.xs),
            Text(
              '선택: 아래 각 항목의 \'자세히\'에서 서버로 전송되는 필드를 이름까지 확인할 수 있어요.',
              style: text.bodyMedium,
            ),
            const SizedBox(height: AppSpace.xs),
            Text(consentCrossBorderNotice, style: text.bodyMedium),
          ],
        ),
      ),
    );
  }
}

class _OptionalRow extends StatelessWidget {
  const _OptionalRow({
    required this.kind,
    required this.value,
    required this.onChanged,
  });

  final String kind;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final item = consentItemTexts[kind]!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SwitchListTile(
          key: Key('consent-$kind'),
          value: value,
          onChanged: onChanged,
          title: Text('${item.title} (선택)'),
          subtitle: Text(item.summary),
        ),
        Padding(
          padding: const EdgeInsets.only(
            left: AppSpace.xs,
            bottom: AppSpace.xxs,
          ),
          child: TextButton(
            key: Key('consent-detail-$kind'),
            onPressed: () => showConsentDetailSheet(context, kind),
            child: Text('자세히', semanticsLabel: '${item.title} 자세히 보기'),
          ),
        ),
      ],
    );
  }
}
