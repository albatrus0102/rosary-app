import 'package:flutter/material.dart';

import '../app/leader_audio_store.dart';
import '../app/settings.dart';
import '../app/sound_player.dart';
import '../app/window_class.dart';
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
  });

  final AppSettings settings;

  /// 테스트용 주입: 기도 화면에 넘겨 줄 선창 음성 저장소/재생기.
  final LeaderAudioStore? leaderAudio;
  final SoundPlayer? soundPlayer;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  static const _prayer = 0;
  static const _style = 1;
  static const _settings = 2;

  int _index = _prayer;

  void _select(int i) {
    if (i == _index) return;
    setState(() => _index = i);
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
              ],
            ),
          ),
          Expanded(child: body),
        ],
      ),
    );
  }
}
