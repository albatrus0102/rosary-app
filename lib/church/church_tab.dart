import 'package:flutter/material.dart';

import '../app/settings.dart';
import '../app/track.dart';
import 'church_catalog.dart';
import 'church_entry_card.dart';
import 'church_scene_controller.dart';
import 'church_screen.dart';
import 'church_select_screen.dart';
import 'net/church_loads.dart';
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
    this.onInChurchChanged,
    this.loads,
  });

  final AppSettings settings;

  /// 테스트용 주입(들어갈 때마다 같은 객체를 쓴다).
  final ChurchNet? net;
  final ChurchSceneController? scene;
  final WidgetBuilder? avatarEditorBuilder;
  final Set<String>? availableIds;

  /// 성당 장면 안에 들어갔는지(true)/나왔는지(false) 알린다. 유리화 탭이 이 값으로
  /// [창 | 성당] 전환 줄을 장면 위에서는 숨긴다.
  final ValueChanged<bool>? onInChurchChanged;

  /// 성당별 접속 인원(테스트용 주입). 없으면 [ChurchLoads.shared].
  final ChurchLoads? loads;

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
    widget.onInChurchChanged?.call(true);
  }

  void _leave() {
    Track.screen('church_select');
    setState(() {
      _inChurch = null;
      _browsing = true;
    });
    widget.onInChurchChanged?.call(false);
  }

  /// 접속자 시트에서 다른 성당을 골랐다: 성당 고르기와 같은 상세 시트에서 '입장'을 눌러야
  /// 옮겨 간다(옮기면 지금 성당 화면이 사라지며 퇴장 처리된다).
  Future<void> _pickFromPresence(String id) async {
    final info = ChurchCatalog.byId[id];
    if (info == null || id == _inChurch || !_available.contains(id)) return;
    final enter = await ChurchSelectScreen.showDetail(context, info);
    if (!enter || !mounted || _inChurch == null) return;
    widget.settings.churchId = info.id;
    _enter(info);
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
        loads: widget.loads,
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
      onPickChurch: _pickFromPresence,
      loads: widget.loads,
    );
  }
}
