import 'package:flutter/material.dart';

import '../app/settings.dart';
import '../app/track.dart';
import 'church_catalog.dart';
import 'church_entry_card.dart';
import 'church_scene_controller.dart';
import 'church_screen.dart';
import 'church_select_screen.dart';
import 'net/church_net.dart';

/// '성당' 탭의 흐름(C-02): 마지막 성당 카드 + [입장] → [ChurchScreen].
/// '다른 성당 고르기'와 HUD의 '성당 바꾸기'는 선택 화면으로 간다. 처음(아직 성당에 들어간 적이
/// 없음)에는 바로 선택 화면이 열린다.
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

  /// 선택 화면을 보고 있는지. 성당에 들어간 적이 있어야(첫 입장 때 아바타 선택 표시가
  /// 켜진다) 마지막 성당 카드가 먼저 나온다.
  late bool _browsing = !widget.settings.churchAvatarChosen;

  Set<String> get _available =>
      widget.availableIds ?? ChurchSelectScreen.availableIds;

  @override
  void initState() {
    super.initState();
    Track.screen(_browsing ? 'church_select' : 'church_entry');
  }

  void _pick() {
    Track.screen('church_select');
    setState(() => _browsing = true);
  }

  void _enterLast(ChurchInfo info) {
    widget.settings.churchId = info.id;
    _enter(info, picked: false);
  }

  void _enter(ChurchInfo info, {bool picked = true}) {
    if (picked) Track.church('church_pick', info.id);
    Track.screen('church');
    setState(() => _inChurch = info.id);
  }

  void _leave() {
    Track.screen('church_select');
    setState(() {
      _inChurch = null;
      _browsing = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final id = _inChurch;
    if (id == null) {
      if (!_browsing) {
        final last = ChurchEntryCard.lastChurch(widget.settings, _available);
        return ChurchEntryCard(
          info: last,
          onEnter: () => _enterLast(last),
          onPick: _pick,
        );
      }
      return ChurchSelectScreen(
        settings: widget.settings,
        onEnter: _enter,
        onBack: widget.settings.churchAvatarChosen
            ? () {
                Track.screen('church_entry');
                setState(() => _browsing = false);
              }
            : null,
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
