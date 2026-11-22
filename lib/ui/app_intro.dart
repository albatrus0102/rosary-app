import 'dart:async';

import 'package:flutter/material.dart';

import '../app/prayer_music.dart';
import '../app/settings.dart';
import '../app/theme.dart';
import '../app/track.dart';
import '../church/avatar/baptismal_name_picker.dart';
import '../church/church_constants.dart' as church_constants;
import '../church/church_constants.dart' show defaultBaptismalNameIndex;
import '../stats/text_fit.dart';
import 'app_shell.dart';
import 'widgets/guide_card.dart';

/// 첫 실행 때 첫 탭이 나오기 전에 한 번 보이는 앱 소개(큰 글 4쪽).
/// 동의 화면(AuthGate)을 마친 뒤, [AppShell]을 만들기 전에 놓인다. 마치거나 건너뛰면 다시 나오지 않는다
/// ([AppSettings.appIntroDone]). 더보기 > 사용법 다시 보기 > 앱 소개에서 다시 볼 수 있다.
class AppIntroGate extends StatefulWidget {
  const AppIntroGate({super.key, required this.settings, required this.child});

  final AppSettings settings;
  final Widget child;

  @override
  State<AppIntroGate> createState() => _AppIntroGateState();
}

class _AppIntroGateState extends State<AppIntroGate> {
  late bool _showIntro = !widget.settings.appIntroDone;

  @override
  Widget build(BuildContext context) {
    if (!_showIntro) return widget.child;
    return AppIntroScreen(
      settings: widget.settings,
      onFinish: () {
        if (mounted) setState(() => _showIntro = false);
      },
    );
  }
}

/// 앱 소개 그림 자리. 경로가 null 이면 큰 아이콘을 보인다. 그림이 준비되면 해당 쪽의 경로 한 줄만 채운다
/// (예: `'assets/images/onboarding/welcome.webp'`; pubspec.yaml assets 에 폴더도 더한다).
abstract final class AppIntroArt {
  static const String welcome =
      'assets/images/onboarding/onboarding_1_welcome.webp';
  static const String church =
      'assets/images/onboarding/onboarding_2_church.webp';

  /// 세례명 쪽은 아직 그림이 없어 큰 아이콘을 쓴다.
  static const String? baptismalName = null;
  static const String textSize =
      'assets/images/onboarding/onboarding_3_textsize.webp';
}

/// 앱 소개 화면. [onFinish]는 마쳤거나 건너뛰었을 때 한 번 부른다(이미 마침 표시는 이 화면이 한다).
class AppIntroScreen extends StatefulWidget {
  const AppIntroScreen({
    super.key,
    required this.settings,
    required this.onFinish,
  });

  final AppSettings settings;
  final VoidCallback onFinish;

  /// 쪽 수. 시험이 쓴다.
  static const int pageCount = 5;

  static const double headlineSize = 32;
  static const double bodySize = 22;

  /// 글자 크기 고르기에서 보여 주는 예시 문장.
  static const String sampleSentence = '은총이 가득하신 마리아님, 기뻐하소서.';

  /// 성당 쪽 아래에 보이는, 앱 속 성당이 가상 공간임을 밝히는 한 줄.
  static const String virtualChurchNote = church_constants.virtualChurchNote;

  @override
  State<AppIntroScreen> createState() => _AppIntroScreenState();
}

class _IntroPage {
  const _IntroPage(this.title, this.spoken);
  final String title;
  final String spoken;
}

class _AppIntroScreenState extends State<AppIntroScreen> {
  final PageController _pc = PageController();
  int _page = 0;
  bool _finished = false;

  static const _tabLines = [
    '3D 성당에 들어가 함께 기도해요',
    '오늘의 묵주기도를 바로 시작해요',
    '기도한 날과 시간을 볼 수 있어요',
    '설정과 사용법을 찾아요',
  ];

  static const _pages = [
    _IntroPage(
      '환영해요',
      '로사리움은 묵주기도를 함께 바치는 곳이에요. 천천히 안내해 드릴게요.',
    ),
    _IntroPage(
      '아래 단추 네 개',
      '성당, 오늘, 기록, 더보기. 성당에서는 3D 성당에 들어가 함께 기도해요. '
          '오늘에서는 오늘의 묵주기도를 바로 시작해요. 기록에서는 기도한 날과 시간을 볼 수 있어요. '
          '더보기에서는 설정과 사용법을 찾아요.',
    ),
    _IntroPage(
      '성당 안에서는',
      '성당에서는 걸어 다니며 초를 켜고 자리에 앉아 기도해요. '
          '${AppIntroScreen.virtualChurchNote}',
    ),
    _IntroPage(
      '세례명이 있으면 골라 주세요',
      '고른 이름은 성당에서 내 아바타 이름으로도 써요. 나중에 골라도 괜찮아요.',
    ),
    _IntroPage('글씨를 크게 볼까요?', '보통, 크게, 아주 크게 중에서 편한 크기를 골라 주세요.'),
  ];

  @override
  void initState() {
    super.initState();
    Track.tourStart('app');
  }

  @override
  void dispose() {
    _pc.dispose();
    super.dispose();
  }

  bool get _last => _page == AppIntroScreen.pageCount - 1;

  void _next() {
    if (_last) {
      _finish(skipped: false);
      return;
    }
    _goTo(_page + 1);
  }

  void _goTo(int i) {
    Track.tourStep('app', i);
    final reduced = MediaQuery.disableAnimationsOf(context);
    if (reduced) {
      _pc.jumpToPage(i);
    } else {
      unawaited(
        _pc.animateToPage(
          i,
          duration: Durations.medium2,
          curve: Easing.standard,
        ),
      );
    }
  }

  void _finish({required bool skipped}) {
    if (_finished) return;
    _finished = true;
    if (skipped) {
      Track.tourSkip('app', _page);
    } else {
      Track.tourDone('app');
    }
    widget.settings.appIntroDone = true;
    widget.onFinish();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final settings = widget.settings;
    final page = _pages[_page];
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_page > 0) {
          _goTo(_page - 1);
        } else {
          _finish(skipped: true);
        }
      },
      child: Scaffold(
        backgroundColor: scheme.surface,
        body: SafeArea(
          child: GuideNarration(
            settings: settings,
            text: '${page.title}. ${page.spoken}',
            blocked: () => PrayerMusic.of(settings).audible,
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(
                        right: AppSpace.xs,
                        top: AppSpace.xxs,
                      ),
                      child: Row(
                        children: [
                          const SizedBox(width: AppSpace.sm),
                          Expanded(
                            child: Text(
                              '${_page + 1} / ${AppIntroScreen.pageCount}',
                              key: const ValueKey('intro-count'),
                              style: GuideStyle.count(context),
                            ),
                          ),
                          GuideSpeakerButton(
                            key: const ValueKey('intro-tts'),
                            settings: settings,
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: PageView(
                        controller: _pc,
                        onPageChanged: (i) => setState(() => _page = i),
                        children: [
                          _pageFrame(
                            icon: Icons.church,
                            art: AppIntroArt.welcome,
                            title: _pages[0].title,
                            child: _bodyText(
                              '로사리움은 묵주기도를 함께 바치는 곳이에요.',
                              extra: '천천히 안내해 드릴게요.',
                            ),
                          ),
                          _pageFrame(
                            title: _pages[1].title,
                            child: _tabRows(context),
                          ),
                          _pageFrame(
                            icon: Icons.directions_walk,
                            art: AppIntroArt.church,
                            title: _pages[2].title,
                            child: _bodyText(
                              '성당에서는 걸어 다니며 초를 켜고 자리에 앉아 기도해요.',
                              note: AppIntroScreen.virtualChurchNote,
                            ),
                          ),
                          _pageFrame(
                            icon: Icons.badge_outlined,
                            art: AppIntroArt.baptismalName,
                            title: _pages[3].title,
                            child: _namePicker(context),
                          ),
                          _pageFrame(
                            icon: Icons.text_increase,
                            art: AppIntroArt.textSize,
                            title: _pages[4].title,
                            child: _sizePicker(context),
                          ),
                        ],
                      ),
                    ),
                    _dots(context),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpace.sm,
                        AppSpace.sm,
                        AppSpace.sm,
                        AppSpace.sm,
                      ),
                      child: Row(
                        children: [
                          TextButton(
                            key: const ValueKey('intro-skip'),
                            style: GuideStyle.secondaryButton(context),
                            onPressed: () => _finish(skipped: true),
                            child: const Text('건너뛰기'),
                          ),
                          const SizedBox(width: AppSpace.xs),
                          Expanded(
                            child: FilledButton(
                              key: const ValueKey('intro-next'),
                              style: GuideStyle.primaryButton(context),
                              onPressed: _next,
                              child: Text(_last ? '시작해요' : '다음'),
                            ),
                          ),
                        ],
                      ),
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

  Widget _pageFrame({
    IconData? icon,
    String? art,
    required String title,
    required Widget child,
  }) {
    return LayoutBuilder(
      builder: (context, box) => SingleChildScrollView(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpace.md,
          vertical: AppSpace.sm,
        ),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minHeight: box.maxHeight - 2 * AppSpace.sm,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (icon != null) ...[
                Center(
                  child: _ArtSlot(
                    icon: icon,
                    asset: art,
                    // 그림이 먼저 줄어든다: 남는 높이의 약 30%(72~220).
                    size: (box.maxHeight * 0.3).clamp(72.0, 220.0),
                  ),
                ),
                const SizedBox(height: AppSpace.md),
              ],
              Text(
                keepAll(title),
                textAlign: icon != null ? TextAlign.center : TextAlign.start,
                style: Theme.of(context).textTheme.headlineMedium!.copyWith(
                  fontSize: AppIntroScreen.headlineSize,
                  height: 1.25,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppSpace.sm),
              child,
            ],
          ),
        ),
      ),
    );
  }

  TextStyle get _bodyStyle => Theme.of(context).textTheme.bodyLarge!.copyWith(
    fontSize: AppIntroScreen.bodySize,
    height: 1.5,
  );

  Widget _bodyText(String text, {String? extra, String? note}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(keepAll(text), textAlign: TextAlign.center, style: _bodyStyle),
        if (note != null) ...[
          const SizedBox(height: AppSpace.sm),
          Text(
            keepAll(note),
            key: const ValueKey('intro-virtual-note'),
            textAlign: TextAlign.center,
            style: _bodyStyle.copyWith(
              fontSize: 19,
              height: 1.45,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
        if (extra != null) ...[
          const SizedBox(height: AppSpace.xs),
          Text(keepAll(extra), textAlign: TextAlign.center, style: _bodyStyle),
        ],
      ],
    );
  }

  Widget _tabRows(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        for (var i = 0; i < appShellDestinations.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpace.sm),
            child: Row(
              key: ValueKey('intro-tab-${appShellDestinations[i].label}'),
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: scheme.primaryContainer,
                    borderRadius: AppShape.medium,
                  ),
                  child: Icon(
                    appShellDestinations[i].selectedIcon,
                    size: 30,
                    color: scheme.onPrimaryContainer,
                  ),
                ),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        appShellDestinations[i].label,
                        style: _bodyStyle.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        keepAll(_tabLines[i]),
                        style: _bodyStyle.copyWith(fontSize: 20, height: 1.35),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  /// 세례명 고르기 쪽. 고르면 바로 아바타 설정에 저장하고(이름 쪽 표시만 켠다), 건너뛰면 아무것도
  /// 바꾸지 않는다. 이름 자체는 기록하지 않는다.
  Widget _namePicker(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final settings = widget.settings;
    return ListenableBuilder(
      listenable: settings,
      builder: (context, _) {
        final chosen = settings.churchNameChosen;
        final avatar = settings.churchAvatar;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (chosen) ...[
              Card.filled(
                key: const ValueKey('intro-name-chosen'),
                color: scheme.primaryContainer,
                child: Padding(
                  padding: const EdgeInsets.all(AppSpace.sm),
                  child: Semantics(
                    label: '고른 세례명 ${avatar.nameText}',
                    excludeSemantics: true,
                    child: Text(
                      keepAll(avatar.nameText),
                      textAlign: TextAlign.center,
                      style: _bodyStyle.copyWith(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: scheme.onPrimaryContainer,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpace.sm),
            ],
            FilledButton.tonal(
              key: const ValueKey('intro-name-pick'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(64),
                textStyle: _bodyStyle.copyWith(fontWeight: FontWeight.w700),
              ),
              onPressed: () => _pickName(context),
              child: Text(chosen ? '이름 바꾸기' : '세례명 고르기'),
            ),
            const SizedBox(height: AppSpace.sm),
            _bodyText('고른 이름은 성당에서 내 아바타 이름으로도 써요.'),
            if (!chosen) ...[
              const SizedBox(height: AppSpace.xs),
              TextButton(
                key: const ValueKey('intro-name-later'),
                style: GuideStyle.secondaryButton(context),
                onPressed: _next,
                child: const Text('나중에'),
              ),
            ],
          ],
        );
      },
    );
  }

  Future<void> _pickName(BuildContext context) async {
    final settings = widget.settings;
    final avatar = settings.churchAvatar;
    final picked = await showBaptismalNamePicker(
      context,
      gender: avatar.gender,
      selected: settings.churchNameChosen
          ? avatar.name
          : defaultBaptismalNameIndex,
    );
    if (picked == null || !mounted) return;
    settings.churchAvatar = avatar.copyWith(name: picked);
    settings.churchNameChosen = true;
  }

  Widget _sizePicker(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final settings = widget.settings;
    const labels = ['보통', '크게', '아주 크게'];
    return ListenableBuilder(
      listenable: settings,
      builder: (context, _) {
        final current = settings.appTextScale;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                for (var i = 0; i < labels.length; i++) ...[
                  if (i > 0) const SizedBox(width: AppSpace.xs),
                  Expanded(
                    child: _SizeChoice(
                      key: ValueKey('intro-size-$i'),
                      label: labels[i],
                      selected: current == AppSettings.appTextScaleChoices[i],
                      onTap: () {
                        settings.appTextScale =
                            AppSettings.appTextScaleChoices[i];
                        Track.setting('app_text_scale');
                      },
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: AppSpace.md),
            Card.filled(
              color: scheme.surfaceContainerHigh,
              child: Padding(
                padding: const EdgeInsets.all(AppSpace.sm),
                child: Text(
                  keepAll(AppIntroScreen.sampleSentence),
                  key: const ValueKey('intro-sample'),
                  // 앱 전체 배율이 바로 적용되므로 예시도 따라 커진다(여기서 따로 곱하지 않는다).
                  style: _bodyStyle.copyWith(height: 1.45),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _dots(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      label: '${_page + 1}쪽, 모두 ${AppIntroScreen.pageCount}쪽',
      excludeSemantics: true,
      child: Row(
        key: const ValueKey('intro-dots'),
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (var i = 0; i < AppIntroScreen.pageCount; i++)
            AnimatedContainer(
              duration: AppMotion.of(context, Durations.short4),
              margin: const EdgeInsets.symmetric(horizontal: 5),
              width: i == _page ? 28 : 12,
              height: 12,
              decoration: BoxDecoration(
                color: i == _page ? scheme.primary : scheme.outlineVariant,
                borderRadius: BorderRadius.circular(6),
              ),
            ),
        ],
      ),
    );
  }
}

/// 그림 자리: 그림 파일이 있으면 그림(읽기에서 뺌, 못 읽으면 아이콘), 없으면 아이콘 원.
class _ArtSlot extends StatelessWidget {
  const _ArtSlot({required this.icon, required this.asset, required this.size});

  final IconData icon;
  final String? asset;
  final double size;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    Widget fallback() => Container(
      key: const ValueKey('intro-art-icon'),
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        shape: BoxShape.circle,
      ),
      child: Icon(icon, size: size * 0.53, color: scheme.onPrimaryContainer),
    );
    final path = asset;
    if (path == null) return fallback();
    return ExcludeSemantics(
      child: Image.asset(
        path,
        key: const ValueKey('intro-art-image'),
        width: size,
        height: size,
        fit: BoxFit.contain,
        errorBuilder: (_, _, _) => fallback(),
      ),
    );
  }
}

class _SizeChoice extends StatelessWidget {
  const _SizeChoice({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: selected ? scheme.primaryContainer : scheme.surfaceContainerHigh,
        shape: RoundedRectangleBorder(
          borderRadius: AppShape.medium,
          side: BorderSide(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: selected ? 3 : 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 72),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpace.xxs,
                  vertical: AppSpace.xs,
                ),
                child: MediaQuery.withClampedTextScaling(
                  maxScaleFactor: 1.0,
                  child: Text(
                    label,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                      color: selected
                          ? scheme.onPrimaryContainer
                          : scheme.onSurface,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
