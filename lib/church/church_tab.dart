import 'package:flutter/material.dart';

import '../app/settings.dart';
import '../app/track.dart';
import 'church_catalog.dart';
import 'church_scene_controller.dart';
import 'church_screen.dart';
import 'church_select_screen.dart';
import 'net/church_net.dart';

/// '성당' 탭의 흐름: 성당 고르기 → 입장 → [ChurchScreen]. '성당 바꾸기'는 다시 선택 화면으로.
///
/// 선택 화면으로 돌아가면 [ChurchScreen]이 사라지므로(퇴장 처리: 일어서기, 진행 저장,
/// 접속 끊기, WebView 정리) 선택 화면에서는 장면도 네트워크도 돌지 않는다.
class ChurchTab extends StatefulWidget {
  const ChurchTab({
    super.key,
    required this.settings,
    this.net,
    this.scene,
    this.avatarEditorBuilder,
    this.availableIds,
  });

  final AppSettings settings;

  /// 테스트용 주입(들어갈 때마다 같은 객체를 쓴다).
  final ChurchNet? net;
  final ChurchSceneController? scene;
  final WidgetBuilder? avatarEditorBuilder;
  final Set<String>? availableIds;

  @override
  State<ChurchTab> createState() => _ChurchTabState();
}

class _ChurchTabState extends State<ChurchTab> {
  String? _inChurch;

  @override
  void initState() {
    super.initState();
    Track.screen('church_select');
  }

  void _enter(ChurchInfo info) {
    Track.church('church_pick', info.id);
    Track.screen('church');
    setState(() => _inChurch = info.id);
  }

  void _leave() {
    Track.screen('church_select');
    setState(() => _inChurch = null);
  }

  @override
  Widget build(BuildContext context) {
    final id = _inChurch;
    if (id == null) {
      return ChurchSelectScreen(
        settings: widget.settings,
        onEnter: _enter,
        available: widget.availableIds,
      );
    }
    return ChurchScreen(
      key: ValueKey('church-$id'),
      settings: widget.settings,
      churchId: id,
      net: widget.net,
      scene: widget.scene,
      avatarEditorBuilder: widget.avatarEditorBuilder,
      onChangeChurch: _leave,
    );
  }
}
