import 'dart:async';

import 'package:flutter/material.dart';

import '../app/app_services.dart';
import '../app/leader_voice.dart';
import '../app/rosary_style.dart';
import '../app/settings.dart';
import '../app/theme.dart';
import '../auth/account_screen.dart';
import '../auth/legal_screen.dart';
import '../auth/legal_texts.dart';
import '../glass/glass_catalog.dart';
import '../glass/glass_licenses_screen.dart';
import 'widgets/page_body.dart';
import 'widgets/section_header.dart';

/// '더보기' 탭: 묵주 스타일, 설정, 계정, 정보(출처·고지·약관·라이선스).
///
/// 이 화면의 항목은 모두 눌러서 여는 **다른 화면**이다. 탭이 아니다.
class MoreScreen extends StatelessWidget {
  const MoreScreen({
    super.key,
    required this.settings,
    required this.onOpenStyles,
    required this.onOpenSettings,
    this.glassCatalog,
  });

  final AppSettings settings;

  /// 시험용 주입: 스테인드글라스 출처 화면이 쓸 카탈로그.
  final Future<GlassCatalog>? glassCatalog;

  /// 묵주 스타일 화면(라우트 `rosary_styles`)을 연다.
  final VoidCallback onOpenStyles;

  /// 설정 화면(라우트 `settings`)을 연다.
  final VoidCallback onOpenSettings;

  static const double _maxContentWidth = 720;

  /// 기도문 출처 문구(설정·정보 공통).
  static const prayerSourceNote = '한국천주교주교회의 『가톨릭 기도서』 기준';

  void _openLegal(BuildContext context, String title, String body) {
    unawaited(
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          settings: const RouteSettings(name: 'legal'),
          builder: (_) => LegalScreen(title: title, body: body),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final services = AppServicesScope.maybeOf(context);
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          const SliverAppBar.large(title: Text('더보기')),
          SliverPageBody(
            maxWidth: _maxContentWidth,
            bottomPadding: AppSpace.lg,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _Group(
                  children: [
                    ListenableBuilder(
                      listenable: settings,
                      builder: (context, _) => ListTile(
                        key: const ValueKey('more-styles'),
                        leading: const Icon(Icons.radio_button_checked),
                        title: const Text('묵주 스타일'),
                        subtitle: Text(settings.rosaryStyle.label),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: onOpenStyles,
                      ),
                    ),
                    ListTile(
                      key: const ValueKey('more-settings'),
                      leading: const Icon(Icons.settings_outlined),
                      title: const Text('설정'),
                      subtitle: const Text('소리·진동, 글자 크기, 상대 목소리'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: onOpenSettings,
                    ),
                    if (services != null && services.backendConfigured)
                      ListenableBuilder(
                        listenable: services.auth.state,
                        builder: (context, _) {
                          final s = services.auth.state.value;
                          return ListTile(
                            key: const ValueKey('more-account'),
                            leading: const Icon(Icons.account_circle_outlined),
                            title: const Text('계정'),
                            subtitle: Text(
                              s.isSignedIn ? s.accountLabel : '로그인하지 않음',
                            ),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => unawaited(
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  settings: const RouteSettings(
                                    name: 'account',
                                  ),
                                  builder: (_) => AccountScreen(
                                    authService: services.auth,
                                    consentStore: services.consent,
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                  ],
                ),
                const SectionHeader('정보'),
                _Group(
                  children: [
                    const ListTile(
                      key: ValueKey('more-unofficial'),
                      leading: Icon(Icons.info_outline),
                      title: Text('공식 서비스가 아닙니다'),
                      subtitle: Text(appUnofficialNotice),
                    ),
                    ListTile(
                      key: const ValueKey('more-glass-credits'),
                      leading: const Icon(Icons.window_outlined),
                      title: const Text('스테인드글라스 출처'),
                      subtitle: const Text('창 사진의 작가·라이선스, 이용 안내'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => unawaited(
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            settings: const RouteSettings(
                              name: GlassLicensesScreen.routeName,
                            ),
                            builder: (_) =>
                                GlassLicensesScreen(catalog: glassCatalog),
                          ),
                        ),
                      ),
                    ),
                    const ListTile(
                      leading: Icon(Icons.menu_book_outlined),
                      title: Text('기도문 출처'),
                      subtitle: Text(prayerSourceNote),
                    ),
                    const ListTile(
                      leading: Icon(Icons.record_voice_over_outlined),
                      title: Text('합성 음성 안내'),
                      subtitle: Text('$aiVoiceDisclosure\n$aiVoiceNotice'),
                    ),
                    ListTile(
                      leading: const Icon(Icons.description_outlined),
                      title: const Text('이용약관'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () =>
                          _openLegal(context, legalTermsTitle, legalTermsBody),
                    ),
                    ListTile(
                      leading: const Icon(Icons.privacy_tip_outlined),
                      title: const Text('개인정보 처리방침'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => _openLegal(
                        context,
                        legalPrivacyTitle,
                        legalPrivacyBody,
                      ),
                    ),
                    ListTile(
                      leading: const Icon(Icons.article_outlined),
                      title: const Text('오픈소스 라이선스'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => showLicensePage(
                        context: context,
                        applicationName: '로사리움',
                        applicationLegalese: prayerSourceNote,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 채워진 카드(tonal 표면) 안의 타일 묶음.
class _Group extends StatelessWidget {
  const _Group({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card.filled(
      color: scheme.surfaceContainerLow,
      margin: const EdgeInsets.only(bottom: AppSpace.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    );
  }
}
