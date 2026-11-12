import 'package:flutter/material.dart';

import '../app/leader_audio_store.dart';
import '../app/settings.dart';
import '../app/sound_player.dart';
import '../app/track.dart';
import '../app/window_class.dart';
import '../church/church_tab.dart';
import 'home_screen.dart';
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
  static const _prayer = 0;
  static const _style = 1;
  static const _settings = 2;
  static const _church = 3;

  /// 탭 번호 → 화면 id(SPEC §4). 탭은 라우트가 아니라서 여기서 직접 기록한다.
  static const _screenIds = [
    'home',
    'rosary_styles',
    'settings',
    'church_select',
  ];

  int _index = _prayer;

  void _select(int i) {
    if (i == _index) return;
    setState(() => _index = i);
    // 성당 탭의 실제 화면(church_select/church)은 ChurchTab이 기록한다.
    if (i != _church) Track.screen(_screenIds[i]);
  }

  @override
  Widget build(BuildContext context) {
    final wc = windowClassOf(context);
    final body = IndexedStack(
      index: _index,
      children: [
        HomeScreen(
          settings: widget.settings,
          leaderAudio: widget.leaderAudio,
          soundPlayer: widget.soundPlayer,
          onOpenStyles: () => _select(_style),
          onOpenSettings: () => _select(_settings),
        ),
        RosaryStyleScreen(settings: widget.settings),
        SettingsScreen(settings: widget.settings),
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
      ],
    );

    // 다른 탭에서 뒤로가기를 누르면 앱을 닫지 않고 '기도' 탭으로 돌아간다.
    return PopScope(
      canPop: _index == _prayer,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _select(_prayer);
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
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.self_improvement),
            label: '기도',
          ),
          NavigationDestination(
            icon: Icon(Icons.radio_button_checked),
            label: '묵주',
          ),
          NavigationDestination(icon: Icon(Icons.settings), label: '설정'),
          NavigationDestination(icon: Icon(Icons.church), label: '성당'),
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
              destinations: const [
                NavigationRailDestination(
                  icon: Icon(Icons.self_improvement),
                  label: Text('기도'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.radio_button_checked),
                  label: Text('묵주'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.settings),
                  label: Text('설정'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.church),
                  label: Text('성당'),
                ),
              ],
            ),
          ),
          Expanded(child: body),
        ],
      ),
    );
  }
}
