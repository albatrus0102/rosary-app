import 'dart:async';

import 'package:flutter/material.dart';

import '../app/app_services.dart';
import '../app/leader_voice.dart';
import '../app/release_gate.dart';
import '../app/settings.dart';
import '../app/skins.dart';
import '../app/theme.dart';
import '../auth/account_screen.dart';
import '../auth/legal_screen.dart';
import '../auth/legal_texts.dart';
import '../church/dev_glass.dart';
import '../diag/diag_send_sheet.dart';
import '../domain/stations_series.dart';
import '../glass/glass_catalog.dart';
import '../glass/glass_licenses_screen.dart';
import 'app_intro.dart';
import 'art_credits_screen.dart';
import 'skin_picker.dart';
import 'stations_sheet.dart';
import 'widgets/page_body.dart';
import 'widgets/section_header.dart';
import '../rosary3d/rosary_model.dart';

/// '더보기' 탭: 묵주 스타일, 설정, 계정, 정보(출처·고지·약관·라이선스), 문제 알리기(오류 기록 보내기).
///
/// 이 화면의 항목은 모두 눌러서 여는 **다른 화면**이다. 탭이 아니다.
class MoreScreen extends StatelessWidget {
  const MoreScreen({
    super.key,
    required this.settings,
    required this.onOpenStyles,
    required this.onOpenSettings,
    this.glassCatalog,
    this.onOpenChurch,
    this.onOpenToday,
  });

  /// 사용법 다시 보기에서 '성당 안내'를 고르면 성당 탭으로 데려간다(안에 들어가 있으면 바로 시작한다).
  final VoidCallback? onOpenChurch;

  /// '묵주기도 화면 안내'를 고르면 오늘 탭으로 데려간다(기도 화면을 열면 안내가 나온다).
  final VoidCallback? onOpenToday;

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

  /// 사용법 다시 보기: 어느 안내를 볼지 고른다. 고른 안내의 '마침' 표시를 지우고 다시 보여 준다.
  Future<void> _chooseHelp(BuildContext context) async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final (key, icon, title, sub) in const [
              ('app', Icons.waving_hand_outlined, '앱 소개', '로사리움이 무엇인지, 탭과 글자 크기'),
              ('church', Icons.church_outlined, '성당 안내', '걷기·둘러보기·가기를 직접 해 봐요'),
              (
                'rosary',
                Icons.radio_button_checked,
                '묵주기도 화면 안내',
                '묵주를 넘기고 기도하는 방법',
              ),
            ])
              ListTile(
                key: ValueKey('help-$key'),
                minTileHeight: 72,
                leading: Icon(icon),
                title: Text(title),
                subtitle: Text(sub),
                onTap: () => Navigator.of(context).pop(key),
              ),
            const SizedBox(height: AppSpace.xs),
          ],
        ),
      ),
    );
    if (choice == null || !context.mounted) return;
    switch (choice) {
      case 'app':
        settings.appIntroDone = false;
        await Navigator.of(context).push<void>(
          MaterialPageRoute<void>(
            settings: const RouteSettings(name: 'app_intro'),
            fullscreenDialog: true,
            builder: (ctx) => AppIntroScreen(
              settings: settings,
              onFinish: () => Navigator.of(ctx).pop(),
            ),
          ),
        );
        // 끝까지 보지 않고 닫아도 첫 실행 때처럼 다시 나오지는 않는다.
        settings.appIntroDone = true;
      case 'church':
        settings.churchTourDone = false;
        _notify(context, '성당에 들어가면 안내가 시작돼요');
        onOpenChurch?.call();
      case 'rosary':
        settings.prayerScreenTourDone = false;
        settings.resetBeadSwipeHint();
        _notify(context, '묵주기도 화면을 열면 안내가 나와요');
        onOpenToday?.call();
    }
  }

  void _notify(BuildContext context, String text) {
    final m = ScaffoldMessenger.maybeOf(context);
    m?.hideCurrentSnackBar();
    m?.showSnackBar(SnackBar(content: Text(text)));
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
                        subtitle: Text(rosaryInfo(settings.rosaryId).name),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: onOpenStyles,
                      ),
                    ),
                    ListenableBuilder(
                      listenable: settings,
                      builder: (context, _) => ListTile(
                        key: const ValueKey('more-skin'),
                        leading: const Icon(Icons.color_lens_outlined),
                        title: const Text('스킨'),
                        subtitle: Text(
                          Skins.effective(
                            settings.skinId,
                            DateTime.now(),
                            settings.skinCustoms,
                          ).nameKo,
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => showSkinPicker(context, settings),
                      ),
                    ),
                    ListTile(
                      key: const ValueKey('more-stations'),
                      leading: const Icon(Icons.directions_walk),
                      title: const Text('십자가의 길'),
                      subtitle: const Text('14처 그림과 짧은 묵상'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => unawaited(
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            settings: const RouteSettings(
                              name: StationsOfCrossScreen.routeName,
                            ),
                            // 성당 밖: 마지막으로 들른 성당의 그림 연작(대체 성화)
                            builder: (_) => StationsOfCrossScreen(
                              series: StationsSeriesCatalog.forChurch(
                                settings.churchId,
                              ),
                            ),
                          ),
                        ),
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
                    // 개발용 APK(ROSARIUM_DEV_GLASS)에서만 보이는 항목. 일반 빌드에서는 그려지지 않는다.
                    if (DevGlass.enabled) const DevGlassMoreTile(),
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
                const SectionHeader('도움말'),
                _Group(
                  children: [
                    ListTile(
                      key: const ValueKey('more-help'),
                      leading: const Icon(Icons.help_outline),
                      title: const Text('사용법 다시 보기'),
                      subtitle: const Text('앱 소개 · 성당 안내 · 묵주기도 화면 안내'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => unawaited(_chooseHelp(context)),
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
                    ListTile(
                      key: const ValueKey('more-art-credits'),
                      leading: const Icon(Icons.image_outlined),
                      title: const Text('성화 · 음악 출처'),
                      subtitle: const Text('기도 배경·십자가의 길 그림, 성가의 출처와 라이선스'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => unawaited(
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            settings: const RouteSettings(
                              name: ArtCreditsScreen.routeName,
                            ),
                            builder: (_) => const ArtCreditsScreen(),
                          ),
                        ),
                      ),
                    ),
                    const ListTile(
                      leading: Icon(Icons.menu_book_outlined),
                      title: Text('기도문 출처'),
                      subtitle: Text(prayerSourceNote),
                    ),
                    if (ReleaseGate.aiVoiceClips)
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
                // 문제 알리기: 오류 기록을 파일로 만들어 사용자가 직접 보낸다(자동 전송 없음, lib/diag).
                const SectionHeader('문제 알리기'),
                _Group(
                  children: [
                    ListTile(
                      key: const ValueKey('more-diag-send'),
                      leading: const Icon(Icons.feedback_outlined),
                      title: const Text('오류 기록 보내기'),
                      subtitle: const Text(
                        '앱이 이상할 때 기록 파일을 만들어 직접 보내요. 자동으로 보내지 않아요.',
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => unawaited(showDiagSendSheet(context)),
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
