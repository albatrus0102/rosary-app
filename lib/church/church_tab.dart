import 'package:flutter/material.dart';

import '../app/settings.dart';
import '../app/track.dart';
import 'church_catalog.dart';
import 'church_entry_card.dart';
import 'church_host.dart';
import 'church_scene_controller.dart';
import 'church_screen.dart';
import 'church_select_screen.dart';
import 'net/church_loads.dart';
import 'net/church_net.dart';

/// '성당' 탭 '성당' 보기의 흐름(C-02): 입구(고른 성당의 큰 카드 + [입장하기] + '다른 성당 고르기'
/// 캐러셀) → [ChurchScreen]. 입구의 '모든 성당 보기'와 HUD의 '성당 바꾸기'는 선택 화면(검색·필터)으로
/// 간다. 처음(아직 성당에 들어간 적이 없음)에도 입구가 먼저 나온다(기본 성당, '처음 오셨나요?').
///
/// 선택 화면으로 돌아가면('성당 바꾸기') [ChurchScreen]이 사라지므로(퇴장 처리: 일어서기,
/// 진행 저장, 접속 끊기, WebView 정리) 선택 화면에서는 장면도 네트워크도 돌지 않는다.
///
/// 다른 탭이나 '창' 보기로 가는 것은 퇴장이 아니다: 이 위젯과 [ChurchScreen]은 그대로 남고
/// ([ChurchHost.visible]이 false), 돌아오면 방금 있던 자리 그대로다. 보이지 않는 동안 성당
/// 화면은 장면을 일시정지하고, 선택 화면은 만들지 않는다.
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

  /// 성당 장면 안에 들어갔는지(true)/나왔는지(false) 알린다. 성당 탭이 이 값으로
  /// [성당 | 창] 전환 줄을 장면 위에서는 숨긴다. 없으면 [ChurchHost]의 것을 부른다.
  final ValueChanged<bool>? onInChurchChanged;

  /// 성당별 접속 인원(테스트용 주입). 없으면 [ChurchLoads.shared].
  final ChurchLoads? loads;

  @override
  State<ChurchTab> createState() => _ChurchTabState();
}

class _ChurchTabState extends State<ChurchTab> {
  String? _inChurch;

  /// 선택 화면(전체 목록)을 보고 있는지. 처음에는 입구(큰 카드 + 캐러셀)가 먼저 나온다.
  bool _browsing = false;

  /// 입구 캐러셀에서 고른 성당 id(아직 들어가지 않음). null 이면 마지막으로 다녀온 성당.
  String? _selectedId;

  bool _visible = true;
  bool _depsReady = false;

  String get _screenId => _inChurch != null
      ? 'church'
      : (_browsing ? 'church_select' : 'church_entry');

  void _notifyInChurch(bool v) {
    final f =
        widget.onInChurchChanged ?? ChurchHost.read(context)?.onInChurchChanged;
    f?.call(v);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final visible = ChurchHost.visibleOf(context);
    final was = _visible;
    _visible = visible;
    // 다른 탭·'창' 보기에서 돌아왔다: 지금 화면을 다시 기록한다(입장 이벤트는 새로 남기지 않는다).
    if (_depsReady && visible && !was) Track.screen(_screenId);
    _depsReady = true;
  }

  Set<String> get _available =>
      widget.availableIds ?? ChurchSelectScreen.availableIds;

  @override
  void initState() {
    super.initState();
    final resume = _resumeChurch();
    if (resume == null) {
      Track.screen('church_entry');
      return;
    }
    // 성당 안에 있다가 앱이 백그라운드에서 정리된 뒤 돌아왔다(다른 앱에 다녀옴·Activity 재생성):
    // 입장 단추 없이 같은 성당으로 바로 들어간다. 자리·좌석·카메라는 [ChurchScreen]이 같은 저장분으로
    // 되살린다(불러오는 동안에는 장면의 짧은 로딩 표시만 보인다).
    widget.settings.churchId = resume.id;
    _inChurch = resume.id;
    Track.screen('church');
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _inChurch != null) _notifyInChurch(true);
    });
  }

  /// 저장해 둔 '방금 있던 자리'([ChurchResumeState], 30분 안)의 성당. 성당을 스스로 나갔으면 저장분이 없다.
  ChurchInfo? _resumeChurch() {
    final saved = widget.settings.churchResume;
    if (saved == null) return null;
    final info = ChurchCatalog.byId[saved.churchId];
    if (info == null || !_available.contains(info.id)) return null;
    return saved.isFreshFor(info.id, DateTime.now()) ? info : null;
  }

  void _pick() {
    Track.screen('church_select');
    setState(() => _browsing = true);
  }

  /// 입구에서 들어간다. 캐러셀에서 다른 성당을 골라 들어가면 성당 고르기로 센다.
  void _enterLast(ChurchInfo info) {
    final picked = info.id != widget.settings.churchId;
    widget.settings.churchId = info.id;
    _enter(info, picked: picked);
  }

  /// 입구의 [상세 보기]: 성당 고르기와 같은 상세 시트. 시트에서 '입장'을 누르면 들어간다.
  Future<void> _detail(ChurchInfo info) async {
    final enter = await ChurchSelectScreen.showDetail(context, info);
    if (!enter || !mounted || _inChurch != null) return;
    _enterLast(info);
  }

  void _enter(ChurchInfo info, {bool picked = true}) {
    if (picked) Track.church('church_pick', info.id);
    Track.screen('church');
    setState(() {
      _inChurch = info.id;
      _selectedId = null;
    });
    _notifyInChurch(true);
  }

  void _leave() {
    Track.screen('church_select');
    setState(() {
      _inChurch = null;
      _browsing = true;
    });
    _notifyInChurch(false);
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
      // 보이지 않는 동안에는 선택 화면(접속 인원 조회 등)을 만들지 않는다.
      if (!_visible) return const SizedBox.shrink();
      if (!_browsing) {
        final available = _available;
        final last = ChurchEntryCard.lastChurch(widget.settings, available);
        final picked = _selectedId;
        final shown = picked != null && available.contains(picked)
            ? ChurchCatalog.resolve(picked)
            : last;
        return ChurchEntryCard(
          info: shown,
          settings: widget.settings,
          // 새 성당이 카탈로그에 추가되면(그리고 들어갈 수 있으면) 캐러셀에 저절로 나온다.
          churches: [
            for (final c in ChurchCatalog.listed)
              if (available.contains(c.id)) c,
          ],
          lastId: last.id,
          firstVisit: !widget.settings.churchAvatarChosen,
          onSelect: (c) => setState(() => _selectedId = c.id),
          onDetail: () => _detail(shown),
          onEnter: () => _enterLast(shown),
          onPick: _pick,
        );
      }
      return ChurchSelectScreen(
        settings: widget.settings,
        onEnter: _enter,
        onBack: () {
          Track.screen('church_entry');
          setState(() => _browsing = false);
        },
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
