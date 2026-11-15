import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app/app_services.dart';
import '../app/leader_audio_store.dart';
import '../app/settings.dart';
import '../app/sound_player.dart';
import '../app/theme.dart';
import '../app/track.dart';
import '../app/window_class.dart';
import '../church/church_entry_art.dart';
import '../church/church_scene_controller.dart';
import '../church/church_theme.dart';
import '../glass/glass_catalog.dart';
import '../glass/glass_tab.dart';
import '../stats/stats_screen.dart';
import 'home_screen.dart';
import 'more_screen.dart';
import '../rosary3d/rosary_gallery_screen.dart';
import 'settings_screen.dart';

/// 탭 번호. 앱을 열면 [church](성당)가 먼저 나온다. 알림·위젯·'이어서 기도하기'처럼
/// 기도로 바로 가는 진입점은 `initialTab: AppShellTab.today`를 넘긴다.
enum AppShellTab { church, today, stats, more }

/// M3 적응형 내비게이션 셸: 좁은 화면은 NavigationBar, 넓은 화면은 NavigationRail.
/// 탭: 성당(기본·메인) · 오늘 · 기록 · 더보기. 성당 탭 안의 [성당 | 창] 전환에서 '창'이
/// 스테인드글라스 갤러리(보조)다.
class AppShell extends StatefulWidget {
  const AppShell({
    super.key,
    required this.settings,
    this.leaderAudio,
    this.soundPlayer,
    this.churchBuilder,
    this.initialTab = AppShellTab.church,
    this.glassCatalog,
    this.glassSceneFactory,
  });

  /// 지금 보이는 탭의 화면 id(`glass_gallery`·`home`·`stats`·`more`). 내비게이터가 '/' 화면으로
  /// 돌아올 때 어느 탭인지 기록하는 데 쓴다([AnalyticsObserver.rootScreen]).
  /// 성당 탭의 '성당' 보기는 화면 id(church_entry/church_select/church)를 [ChurchTab]이 스스로
  /// 기록하므로 null이다(옵저버가 같은 화면을 한 번 더 세지 않는다).
  static String? currentScreenId = _tabScreenId(
    AppShellTab.church.index,
    GlassSegment.church,
  );

  /// 열 때 보이는 탭.
  final AppShellTab initialTab;

  /// 시험용 주입: 창 카탈로그.
  final Future<GlassCatalog>? glassCatalog;

  /// 시험용 주입: 창 감상 장면 컨트롤러 공장.
  final ChurchSceneController Function()? glassSceneFactory;

  final AppSettings settings;

  /// 테스트용 주입: 기도 화면에 넘겨 줄 선창 음성 저장소/재생기.
  final LeaderAudioStore? leaderAudio;
  final SoundPlayer? soundPlayer;

  /// 테스트용 주입: 성당 탭 '성당' 보기의 내용을 대신 만든다.
  final WidgetBuilder? churchBuilder;

  @override
  State<AppShell> createState() => _AppShellState();
}

/// 탭 번호 → 화면 id(SPEC §4). 탭은 라우트가 아니라서 여기서 직접 기록한다.
/// 성당 탭의 '성당' 보기 화면(church_entry/church_select/church)은 [ChurchTab]이 기록하므로
/// null이고, '창' 보기는 `glass_gallery`다.
String? _tabScreenId(int tab, GlassSegment segment) {
  switch (tab) {
    case 0:
      return segment == GlassSegment.window ? 'glass_gallery' : null;
    case 1:
      return 'home';
    case 2:
      return 'stats';
    default:
      return 'more';
  }
}

class _AppShellState extends State<AppShell> {
  static const _church = 0;
  static const _today = 1;
  static const _stats = 2;

  late int _index = widget.initialTab.index;

  /// 성당 탭의 보기(기본 '성당'). 화면 id가 보기에 따라 달라 셸도 안다.
  GlassSegment _segment = GlassSegment.church;

  /// 마지막으로 뒤로가기를 눌러 종료 안내를 띄운 시각('한 번 더 누르면 종료').
  DateTime? _lastExitBack;

  /// 종료 확인 창구: 안내 후 이 시간 안에 한 번 더 누르면 앱을 닫는다.
  static const Duration exitConfirmWindow = Duration(seconds: 2);

  @override
  void initState() {
    super.initState();
    AppShell.currentScreenId = _tabScreenId(_index, _segment);
  }

  @override
  void dispose() {
    AppShell.currentScreenId = _tabScreenId(
      AppShellTab.church.index,
      GlassSegment.church,
    );
    super.dispose();
  }

  void _select(int i) {
    if (i == _index) return;
    setState(() => _index = i);
    final id = _tabScreenId(i, _segment);
    AppShell.currentScreenId = id;
    // 성당 탭의 화면 기록은 GlassTab/ChurchTab이 한다(성당/창 보기에 따라 다르다).
    if (i != _church && id != null) Track.screen(id);
  }

  /// 성당 장면 안에 있는가(그동안 성당 탭의 내비게이션은 성당 테마를 쓴다).
  bool _inChurch = false;

  /// 지금 화면이 3D 성당 안인가: 성당 탭 + '성당' 보기 + 장면 안.
  bool get _churchChrome =>
      _index == _church && _segment == GlassSegment.church && _inChurch;

  /// 내비게이션(바/레일)의 테마. 밝은 테마에서도 내비게이션은 어두운 갈색·금색
  /// ([AppTheme.chromeOf])이고, 성당 안에서는 장면 위 HUD 와 같은 어두운 금색([ChurchTheme])으로
  /// 바뀌어 장면과 한 세계가 된다. 다른 탭으로 가면 돌아온다(M3 short4 로 부드럽게, '동작 줄이기'면 즉시).
  ///
  /// 시스템 내비게이션 바(제스처 손잡이·버튼)가 어두운 바 위에서 보이도록 그 영역의 아이콘은 밝게 둔다.
  Widget _navTheme(BuildContext context, Widget child) {
    var data = AppTheme.chromeOf(context);
    if (_churchChrome) {
      // Theme.of 와 같은 방식으로 글꼴 기하를 입혀 두 테마 사이를 매끄럽게 보간할 수 있게 한다.
      final church = ChurchTheme.of(context);
      final script =
          Localizations.of<MaterialLocalizations>(
            context,
            MaterialLocalizations,
          )?.scriptCategory ??
          ScriptCategory.englishLike;
      data = ThemeData.localize(
        church,
        church.typography.geometryThemeFor(script),
      );
    }
    return AnimatedTheme(
      data: data,
      duration: AppMotion.of(context, Durations.short4),
      child: AnnotatedRegion<SystemUiOverlayStyle>(
        value: AppTheme.systemOverlayStyle(Brightness.dark),
        child: child,
      ),
    );
  }

  void _onSegment(GlassSegment s) {
    if (_inChurch && s != _segment) setState(() {});
    _segment = s;
    if (_index == _church) {
      AppShell.currentScreenId = _tabScreenId(_church, s);
    }
  }

  /// 묵주 고르기(하나로 통합된 3D 묵주 갤러리)는 탭이 아니라 더보기·오늘에서 여는 화면이다.
  void _openStyles() => unawaited(
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        settings: const RouteSettings(name: 'rosary_styles'),
        builder: (_) => RosaryGalleryScreen(settings: widget.settings),
      ),
    ),
  );

  void _openSettings() => unawaited(
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        settings: const RouteSettings(name: 'settings'),
        builder: (_) => SettingsScreen(
          settings: widget.settings,
          leaderAudio: widget.leaderAudio,
          soundPlayer: widget.soundPlayer,
        ),
      ),
    ),
  );

  void _backToExit(BuildContext context) {
    final now = DateTime.now();
    final last = _lastExitBack;
    if (last != null && now.difference(last) <= exitConfirmWindow) {
      unawaited(SystemNavigator.pop());
      return;
    }
    _lastExitBack = now;
    final messenger = ScaffoldMessenger.maybeOf(context);
    messenger?.hideCurrentSnackBar();
    messenger?.showSnackBar(
      const SnackBar(
        content: Text('한 번 더 누르면 종료돼요'),
        duration: exitConfirmWindow,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final wc = windowClassOf(context);
    final services = AppServicesScope.maybeOf(context);
    final body = IndexedStack(
      // 접기/펼치기로 하단 바 ↔ 레일이 바뀌어도 본문(성당·오늘·기록·더보기)의 상태를 그대로 둔다.
      key: _bodyKey,
      index: _index,
      children: [
        // 성당 탭: 성당 보기(메인)도 창 갤러리도 계속 둔다(성당 안에 있던 자리 그대로 돌아온다).
        // 이 탭이 보이지 않는 동안 성당 장면은 일시정지한다(active → ChurchHost.visible).
        GlassTab(
          key: const ValueKey('glass-tab'),
          settings: widget.settings,
          active: _index == _church,
          onSegmentChanged: _onSegment,
          onInChurchChanged: (v) {
            if (mounted && _inChurch != v) setState(() => _inChurch = v);
          },
          catalog: widget.glassCatalog,
          churchBuilder: widget.churchBuilder,
          sceneFactory: widget.glassSceneFactory,
          onOpenPrayer: () => _select(_today),
        ),
        HomeScreen(
          settings: widget.settings,
          leaderAudio: widget.leaderAudio,
          soundPlayer: widget.soundPlayer,
          onOpenStyles: _openStyles,
          onOpenSettings: _openSettings,
          onOpenStats: () => _select(_stats),
        ),
        // 기록 탭은 보고 있을 때만 만든다(열 때마다 최신 기록을 읽고 stats_open을 센다).
        if (_index == _stats && services != null)
          StatsScreen(
            key: const ValueKey('stats-tab'),
            store: services.stats,
            embedded: true,
          )
        else
          const SizedBox.shrink(),
        MoreScreen(
          settings: widget.settings,
          onOpenStyles: _openStyles,
          onOpenSettings: _openSettings,
          glassCatalog: widget.glassCatalog,
        ),
      ],
    );

    // 다른 탭에서 뒤로가기를 누르면 앱을 닫지 않고 첫 탭(성당)으로 돌아간다.
    // 첫 탭의 성당 보기에서는 '한 번 더 누르면 종료'(실수로 나가는 것을 막는다).
    // '창' 보기의 뒤로가기는 GlassTab 이 성당 보기로 돌려 보낸다(여기서는 아무것도 하지 않는다).
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_index != _church) {
          _select(_church);
          return;
        }
        if (_segment != GlassSegment.church) return;
        _backToExit(context);
      },
      // 좁은 화면(하단 바)과 넓은 화면(레일)이 같은 뼈대(Scaffold > Row > Expanded > 본문)를 쓴다.
      // 폴더블을 접거나 펼쳐 폭이 600dp 를 넘나들어도 본문은 같은 자리에 남아 다시 만들어지지 않는다
      // (다시 만들어지면 성당이 입장 전 화면으로 돌아가고 WebView 가 새로 로드된다).
      child: Scaffold(
        body: Row(
          children: [
            if (wc.isWide) _buildRail(context, wc),
            Expanded(key: const ValueKey('shell-body'), child: body),
          ],
        ),
        bottomNavigationBar: wc.isWide
            ? null
            : _navTheme(
                context,
                NavigationBar(
                  selectedIndex: _index,
                  onDestinationSelected: _select,
                  destinations: [
                    for (final d in _destinations)
                      NavigationDestination(
                        icon: Icon(d.icon),
                        selectedIcon: Icon(d.selectedIcon),
                        label: d.label,
                      ),
                  ],
                ),
              ),
      ),
    );
  }

  /// 본문(탭 묶음)의 자리표. 내비게이션 모양이 바뀌어도 같은 State 를 잇는다.
  final GlobalKey _bodyKey = GlobalKey(debugLabel: 'shell-body');

  Widget _buildRail(BuildContext context, WindowClass wc) {
    final extended = wc == WindowClass.expanded;
    // 밝은 테마에서 상태 바 아이콘(시계 등)은 어둡다. 어두운 레일이 상태 바 밑까지 올라가면 시계가
    // 보이지 않으므로, 성당 밖에서는 레일을 상태 바 아래에서 시작한다(성당 안은 장면도 어둡다).
    final underStatusBar =
        _churchChrome || Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: EdgeInsets.only(
        top: underStatusBar ? 0 : MediaQuery.paddingOf(context).top,
      ),
      child: _navTheme(
        context,
        _RailSurface(
          child: SafeArea(
            top: underStatusBar,
            right: false,
            // 장식은 화면 아래 끝까지 닿고, 목적지만 아래 안전 영역을 피한다.
            bottom: false,
            child: Stack(
              children: [
                // 레일 아래 장식(아치·촛불·백합). 목적지를 가리지 않는 높이만큼만 그린다.
                Positioned.fill(
                  child: _RailDecor(destinations: _destinations.length),
                ),
                NavigationRail(
                  // 바탕은 [_RailSurface]가 칠한다(장식 그림이 비쳐 보이게).
                  backgroundColor: Colors.transparent,
                  extended: extended,
                  labelType: extended
                      ? NavigationRailLabelType.none
                      : NavigationRailLabelType.all,
                  selectedIndex: _index,
                  onDestinationSelected: _select,
                  destinations: [
                    for (final d in _destinations)
                      NavigationRailDestination(
                        icon: Icon(d.icon),
                        selectedIcon: Icon(d.selectedIcon),
                        label: Text(d.label),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static const _destinations = [
    _Dest('성당', Icons.church_outlined, Icons.church),
    _Dest('오늘', Icons.self_improvement_outlined, Icons.self_improvement),
    _Dest('기록', Icons.calendar_month_outlined, Icons.calendar_month),
    _Dest('더보기', Icons.more_horiz, Icons.more_horiz),
  ];
}

/// 레일 뒤 바탕(레일 테마의 표면, 하단 바와 같은 surfaceContainer). 레일 위아래의 안전 영역까지
/// 같은 색으로 채운다.
class _RailSurface extends StatelessWidget {
  const _RailSurface({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ColoredBox(
      color:
          theme.navigationRailTheme.backgroundColor ??
          theme.colorScheme.surfaceContainer,
      child: child,
    );
  }
}

/// 레일 아래 장식 그림([ChurchEntryArt.railDecor]). 레일 목적지 아래 남는 높이에만 그리고
/// 위쪽은 레일 바탕으로 옅어진다. 남는 높이가 작으면(폰 가로) 그리지 않는다.
class _RailDecor extends StatelessWidget {
  const _RailDecor({required this.destinations});

  final int destinations;

  /// 장식 그림의 최대 폭(펼친 레일에서 그림이 지나치게 커지지 않게).
  static const double _maxWidth = 136;

  /// 그림의 세로/가로 비(기본 자산 137x802 기준. 다른 비율의 그림은 잘려 맞춰진다).
  static const double _aspect = 5.6;

  static const List<Color> _fade = [Color(0x00FFFFFF), Color(0xFFFFFFFF)];

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // 목적지 하나의 높이: 레일 최소 높이 72dp(라벨 포함) 정도 + 위 여백.
        final used = destinations * 72.0 + AppSpace.md;
        final room = constraints.maxHeight - used;
        if (room < 160) return const SizedBox.shrink();
        final width = constraints.maxWidth < _maxWidth
            ? constraints.maxWidth
            : _maxWidth;
        final natural = width * _aspect;
        final height = natural < room ? natural : room;
        Widget decor = ShaderMask(
          blendMode: BlendMode.dstIn,
          shaderCallback: (rect) => const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: _fade,
            stops: [0, 0.35],
          ).createShader(rect),
          child: const ChurchEntryDecor(
            asset: ChurchEntryArt.railDecor,
            alignment: Alignment.bottomLeft,
          ),
        );
        if (width < constraints.maxWidth) {
          // 펼친 레일: 그림 오른쪽도 레일 바탕으로 옅어지게 한다.
          decor = ShaderMask(
            blendMode: BlendMode.dstIn,
            shaderCallback: (rect) => const LinearGradient(
              begin: Alignment.centerRight,
              end: Alignment.centerLeft,
              colors: _fade,
              stops: [0, 0.4],
            ).createShader(rect),
            child: decor,
          );
        }
        return Align(
          alignment: Alignment.bottomLeft,
          child: RepaintBoundary(
            child: SizedBox(width: width, height: height, child: decor),
          ),
        );
      },
    );
  }
}

class _Dest {
  const _Dest(this.label, this.icon, this.selectedIcon);

  final String label;
  final IconData icon;
  final IconData selectedIcon;
}
