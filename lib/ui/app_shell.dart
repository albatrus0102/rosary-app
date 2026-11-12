import 'dart:async';

import 'package:flutter/material.dart';

import '../app/app_services.dart';
import '../app/leader_audio_store.dart';
import '../app/settings.dart';
import '../app/sound_player.dart';
import '../app/track.dart';
import '../app/window_class.dart';
import '../church/church_scene_controller.dart';
import '../glass/glass_catalog.dart';
import '../glass/glass_tab.dart';
import '../stats/stats_screen.dart';
import 'home_screen.dart';
import 'more_screen.dart';
import 'rosary_style_screen.dart';
import 'settings_screen.dart';

/// 탭 번호. 앱을 열면 [glass](유리화)가 먼저 나온다. 알림·위젯·'이어서 기도하기'처럼
/// 기도로 바로 가는 진입점은 `initialTab: AppShellTab.today`를 넘긴다.
enum AppShellTab { glass, today, stats, more }

/// M3 적응형 내비게이션 셸: 좁은 화면은 NavigationBar, 넓은 화면은 NavigationRail.
/// 탭: 유리화(기본) · 오늘 · 기록 · 더보기. 옛 '성당' 탭은 유리화 탭의 [창 | 성당] 전환 안에 있다.
class AppShell extends StatefulWidget {
  const AppShell({
    super.key,
    required this.settings,
    this.leaderAudio,
    this.soundPlayer,
    this.churchBuilder,
    this.initialTab = AppShellTab.glass,
    this.glassCatalog,
    this.glassSceneFactory,
  });

  /// 지금 보이는 탭의 화면 id(`glass_gallery`·`home`·`stats`·`more`). 내비게이터가 '/' 화면으로
  /// 돌아올 때 어느 탭인지 기록하는 데 쓴다([AnalyticsObserver.rootScreen]).
  static String currentScreenId = _tabScreenIds[AppShellTab.glass.index];

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

  /// 테스트용 주입: 유리화 탭 '성당' 보기의 내용을 대신 만든다.
  final WidgetBuilder? churchBuilder;

  @override
  State<AppShell> createState() => _AppShellState();
}

/// 탭 번호 → 화면 id(SPEC §4). 탭은 라우트가 아니라서 여기서 직접 기록한다.
/// 유리화 탭의 성당 보기 화면(church_select/church)은 [ChurchTab]이 기록한다.
const _tabScreenIds = ['glass_gallery', 'home', 'stats', 'more'];

class _AppShellState extends State<AppShell> {
  static const _glass = 0;
  static const _today = 1;
  static const _stats = 2;

  late int _index = widget.initialTab.index;

  @override
  void initState() {
    super.initState();
    AppShell.currentScreenId = _tabScreenIds[_index];
  }

  @override
  void dispose() {
    AppShell.currentScreenId = _tabScreenIds[AppShellTab.glass.index];
    super.dispose();
  }

  void _select(int i) {
    if (i == _index) return;
    setState(() => _index = i);
    AppShell.currentScreenId = _tabScreenIds[i];
    // 유리화 탭의 화면 기록은 GlassTab이 한다(창/성당 보기에 따라 다르다).
    if (i != _glass) Track.screen(_tabScreenIds[i]);
  }

  /// 묵주 스타일 화면은 탭이 아니라 더보기·오늘에서 여는 화면이다.
  void _openStyles() => unawaited(
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        settings: const RouteSettings(name: 'rosary_styles'),
        builder: (_) => RosaryStyleScreen(settings: widget.settings),
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

  @override
  Widget build(BuildContext context) {
    final wc = windowClassOf(context);
    final services = AppServicesScope.maybeOf(context);
    final body = IndexedStack(
      index: _index,
      children: [
        // 유리화 탭: 갤러리는 Flutter 화면이라 계속 두고, 성당 보기(WebView·소켓)는
        // 이 탭이 보일 때만 만든다.
        GlassTab(
          key: const ValueKey('glass-tab'),
          settings: widget.settings,
          active: _index == _glass,
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

    // 다른 탭에서 뒤로가기를 누르면 앱을 닫지 않고 첫 탭(유리화)으로 돌아간다.
    return PopScope(
      canPop: _index == _glass,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _select(_glass);
      },
      child: wc.isWide ? _buildWide(context, wc, body) : _buildCompact(body),
    );
  }

  Widget _buildCompact(Widget body) {
    return Scaffold(
      body: body,
      bottomNavigationBar: NavigationBar(
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
    );
  }

  Widget _buildWide(BuildContext context, WindowClass wc, Widget body) {
    final extended = wc == WindowClass.expanded;
    return Scaffold(
      body: Row(
        children: [
          SafeArea(
            right: false,
            child: NavigationRail(
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
          ),
          Expanded(child: body),
        ],
      ),
    );
  }

  static const _destinations = [
    _Dest('유리화', Icons.window_outlined, Icons.window),
    _Dest('오늘', Icons.self_improvement_outlined, Icons.self_improvement),
    _Dest('기록', Icons.insights_outlined, Icons.insights),
    _Dest('더보기', Icons.more_horiz, Icons.more_horiz),
  ];
}

class _Dest {
  const _Dest(this.label, this.icon, this.selectedIcon);

  final String label;
  final IconData icon;
  final IconData selectedIcon;
}
