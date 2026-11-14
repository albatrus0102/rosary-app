import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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

  void _onSegment(GlassSegment s) {
    _segment = s;
    if (_index == _church) {
      AppShell.currentScreenId = _tabScreenId(_church, s);
    }
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
      index: _index,
      children: [
        // 성당 탭: 성당 보기(메인)도 창 갤러리도 계속 둔다(성당 안에 있던 자리 그대로 돌아온다).
        // 이 탭이 보이지 않는 동안 성당 장면은 일시정지한다(active → ChurchHost.visible).
        GlassTab(
          key: const ValueKey('glass-tab'),
          settings: widget.settings,
          active: _index == _church,
          onSegmentChanged: _onSegment,
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
    _Dest('성당', Icons.church_outlined, Icons.church),
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
