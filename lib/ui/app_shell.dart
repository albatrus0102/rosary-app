import 'dart:async';

import 'package:flutter/material.dart';

import '../app/app_services.dart';
import '../app/leader_audio_store.dart';
import '../app/settings.dart';
import '../app/sound_player.dart';
import '../app/track.dart';
import '../app/window_class.dart';
import '../church/church_tab.dart';
import '../stats/stats_screen.dart';
import 'home_screen.dart';
import 'more_screen.dart';
import 'rosary_style_screen.dart';
import 'settings_screen.dart';

/// M3 적응형 내비게이션 셸: 좁은 화면은 NavigationBar, 넓은 화면은 NavigationRail.
class AppShell extends StatefulWidget {
  const AppShell({
    super.key,
    required this.settings,
    this.leaderAudio,
    this.soundPlayer,
    this.churchBuilder,
  });

  final AppSettings settings;

  /// 테스트용 주입: 기도 화면에 넘겨 줄 선창 음성 저장소/재생기.
  final LeaderAudioStore? leaderAudio;
  final SoundPlayer? soundPlayer;

  /// 테스트용 주입: '성당' 탭 내용을 대신 만든다.
  final WidgetBuilder? churchBuilder;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  static const _today = 0;
  static const _church = 1;
  static const _stats = 2;

  /// 탭 번호 → 화면 id(SPEC §4). 탭은 라우트가 아니라서 여기서 직접 기록한다.
  /// 성당 탭의 실제 화면(church_select/church)은 [ChurchTab]이 기록한다.
  static const _screenIds = ['home', 'church_select', 'stats', 'more'];

  int _index = _today;

  void _select(int i) {
    if (i == _index) return;
    setState(() => _index = i);
    if (i != _church) Track.screen(_screenIds[i]);
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
        HomeScreen(
          settings: widget.settings,
          leaderAudio: widget.leaderAudio,
          soundPlayer: widget.soundPlayer,
          onOpenStyles: _openStyles,
          onOpenSettings: _openSettings,
          onOpenStats: () => _select(_stats),
        ),
        // 성당 탭은 보고 있을 때만 만든다. 다른 탭으로 가면 화면이 사라져
        // WebView·소켓·타이머가 모두 정리되므로 배터리를 쓰지 않는다.
        if (_index == _church)
          widget.churchBuilder?.call(context) ??
              ChurchTab(
                key: const ValueKey('church-tab'),
                settings: widget.settings,
              )
        else
          const SizedBox.shrink(),
        // 기록 탭도 보고 있을 때만 만든다(열 때마다 최신 기록을 읽고 stats_open을 센다).
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
        ),
      ],
    );

    // 다른 탭에서 뒤로가기를 누르면 앱을 닫지 않고 '오늘' 탭으로 돌아간다.
    return PopScope(
      canPop: _index == _today,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _select(_today);
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
    _Dest('오늘', Icons.self_improvement_outlined, Icons.self_improvement),
    _Dest('성당', Icons.church_outlined, Icons.church),
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
