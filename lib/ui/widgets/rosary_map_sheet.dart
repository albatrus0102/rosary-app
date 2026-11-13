import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

import '../../app/rosary_style.dart';
import '../../domain/rosary_sequence.dart';
import '../../domain/rosary_session.dart';
import 'rosary_map.dart';
import '../../app/theme.dart';

/// 화면 읽기 프로그램과 시트 머리말에 쓰는 자리 이름. 예: '3단 성모송 2번째 구슬'.
String describeRosaryPosition(RosaryStep step) {
  final where = switch (step.decade) {
    final int d => '$d단',
    null => step.kind == StepKind.closing ? '마침' : '서두',
  };
  final n = step.beadIndex;
  return switch (step.kind) {
    StepKind.signOfCross => '$where 성호경',
    StepKind.apostlesCreed => '$where 사도신경',
    StepKind.ourFather => '$where 주님의 기도',
    StepKind.hailMary => n == null ? '$where 성모송' : '$where 성모송 $n번째 구슬',
    StepKind.gloryBe => '$where 영광송',
    StepKind.fatima => '$where 구원송',
    StepKind.closing => '마침 기도',
  };
}

/// '묵주 전체 보기' 시트. 읽기 화면과 분리된 **이동 모드**다.
///
/// - **저절로 닫히지 않는다.** [닫고 계속], 끌어내리기, 뒤로 가기, 바깥 누르기로만 닫힌다.
///   (화면 읽기 프로그램으로 자리를 확인하는 동안 사라지면 안 된다.)
/// - 구슬을 누르면 그 자리로 간다([RosarySession.jumpTo]). 지도를 끌면 한 번에 한 알씩 넘긴다.
/// - 구슬이 촘촘하므로 큰 단추를 따로 둔다: [서두]·[1단]~[5단](그 단의 처음),
///   [되돌리기](직전 자리), [기도하던 자리로](시트를 열었을 때의 자리).
/// - 닫히면 [restoreFocus]로 포커스(화면 읽기 포커스 포함)를 연 단추에 돌려준다.
Future<void> showRosaryMapSheet(
  BuildContext context, {
  required RosarySession session,
  required RosaryStyle style,
  FocusNode? restoreFocus,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    constraints: const BoxConstraints(maxWidth: 560),
    builder: (_) => RosaryMapSheet(session: session, style: style),
  );
  final node = restoreFocus;
  if (node == null || node.context == null) return;
  node.requestFocus();
  // 화면 읽기 프로그램의 포커스도 연 단추로. 시트가 사라진 다음 프레임에 보낸다.
  WidgetsBinding.instance.addPostFrameCallback((_) {
    node.context?.findRenderObject()?.sendSemanticsEvent(
      const FocusSemanticEvent(),
    );
  });
}

class RosaryMapSheet extends StatefulWidget {
  const RosaryMapSheet({super.key, required this.session, required this.style});

  final RosarySession session;
  final RosaryStyle style;

  /// 되돌리기로 거슬러 갈 수 있는 이동 횟수.
  static const int maxUndo = 20;

  @override
  State<RosaryMapSheet> createState() => _RosaryMapSheetState();
}

class _RosaryMapSheetState extends State<RosaryMapSheet> {
  /// 시트를 열었을 때의 자리(기도하던 자리).
  late final int _origin;

  /// 이 시트에서 옮기기 전 자리들(가장 최근이 끝).
  final List<int> _history = [];
  late int _lastIndex;
  bool _undoing = false;
  bool _closing = false;

  RosarySession get _session => widget.session;

  @override
  void initState() {
    super.initState();
    _origin = _session.index;
    _lastIndex = _session.index;
    _session.addListener(_onSession);
  }

  @override
  void dispose() {
    _session.removeListener(_onSession);
    super.dispose();
  }

  /// 어떤 방법으로 옮겼든(구슬 누르기, 끌기, 단추) 직전 자리를 기억한다.
  void _onSession() {
    final now = _session.index;
    if (now == _lastIndex) return;
    if (!_undoing) {
      _history.add(_lastIndex);
      if (_history.length > RosaryMapSheet.maxUndo) _history.removeAt(0);
    }
    _lastIndex = now;
    // 새 자리는 '현재 위치' 줄(liveRegion)이 화면 읽기 프로그램에 알린다.
  }

  void _undo() {
    if (_history.isEmpty) return;
    final target = _history.removeLast();
    _undoing = true;
    _session.jumpTo(target);
    _undoing = false;
    _lastIndex = _session.index;
    setState(() {});
  }

  void _backToOrigin() => _session.jumpTo(_origin);

  void _close() {
    if (_closing) return;
    _closing = true;
    Navigator.of(context).maybePop();
  }

  /// [decade] 단의 처음(주님의 기도 + 신비 안내). 0이면 맨 처음(서두 성호경).
  void _goToDecade(int decade) {
    var target = 0;
    if (decade > 0) {
      target = _session.steps.indexWhere(
        (s) => s.decade == decade && s.kind == StepKind.ourFather,
      );
      if (target < 0) target = 0;
    }
    _session.jumpTo(target);
  }

  void _onSlotTap(int slot) {
    final i = stepIndexForSlot(_session.steps, slot);
    if (i != null) _session.jumpTo(i);
  }

  /// 지도를 끌어 한 알씩. 마지막 스텝에서는 앞으로 넘기지 않는다(끌다가 기도가 끝나지 않게).
  void _scrub(int delta) {
    if (delta > 0) {
      if (_session.index < _session.steps.length - 1) _session.next();
    } else if (delta < 0) {
      _session.back();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final screenH = MediaQuery.sizeOf(context).height;
    final mapH = (screenH * 0.4).clamp(180.0, 400.0);
    // 시트의 글자도 기도 화면의 틀과 같이 시스템 글자 배율을 1.3까지만 따른다.
    return MediaQuery.withClampedTextScaling(
      maxScaleFactor: 1.3,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: ListenableBuilder(
            listenable: _session,
            builder: (context, _) {
              final step = _session.current;
              final here = describeRosaryPosition(step);
              final moved = _session.index != _origin;
              final currentDecade = step.decade ?? 0;
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Semantics(
                    header: true,
                    child: Text('묵주 전체 보기', style: theme.textTheme.titleMedium),
                  ),
                  const SizedBox(height: 2),
                  Semantics(
                    container: true,
                    liveRegion: true,
                    label: '현재 위치, $here',
                    child: ExcludeSemantics(
                      child: Text.rich(
                        key: const ValueKey('prayer-map-position'),
                        TextSpan(
                          children: [
                            TextSpan(
                              text: '현재 위치  ',
                              style: TextStyle(color: scheme.onSurfaceVariant),
                            ),
                            TextSpan(
                              text: here,
                              style: TextStyle(
                                color: scheme.primary,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleSmall,
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '구슬이나 아래 단추를 누르면 그 자리로 갑니다. 닫을 때까지 열려 있습니다.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Flexible(
                    child: SizedBox(
                      height: mapH,
                      width: double.infinity,
                      child: RosaryMap(
                        key: const ValueKey('prayer-map-sheet-map'),
                        step: step,
                        style: widget.style,
                        showLabel: false,
                        onStep: _scrub,
                        onSlotTap: _onSlotTap,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // 큰 터치 영역으로 단의 처음에 간다(구슬은 촘촘해서 누르기 어렵다).
                  Row(
                    children: [
                      for (var d = 0; d <= 5; d++) ...[
                        if (d > 0) const SizedBox(width: 6),
                        Expanded(
                          child: _DecadeButton(
                            key: ValueKey('prayer-map-decade-$d'),
                            label: d == 0 ? '처음' : '$d단',
                            semanticLabel: d == 0
                                ? '맨 처음으로, 서두 성호경'
                                : '$d단 처음으로',
                            selected:
                                step.kind != StepKind.closing &&
                                d == currentDecade,
                            onTap: () => _goToDecade(d),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          key: const ValueKey('prayer-map-undo'),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(64, 48),
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                          ),
                          onPressed: _history.isEmpty ? null : _undo,
                          icon: const Icon(Icons.undo, size: 20),
                          label: const _Fit('되돌리기'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Semantics(
                          label: moved
                              ? '기도하던 자리로, '
                                    '${describeRosaryPosition(_session.steps[_origin])}'
                              : null,
                          child: OutlinedButton.icon(
                            key: const ValueKey('prayer-map-origin'),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(64, 48),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                              ),
                            ),
                            onPressed: moved ? _backToOrigin : null,
                            icon: const Icon(Icons.my_location, size: 20),
                            label: const _Fit('기도하던 자리로'),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      key: const ValueKey('prayer-map-close'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(64, 52),
                      ),
                      onPressed: _close,
                      child: const Text('닫고 계속'),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

/// 좁은 단추에서도 글이 잘리지 않게 줄여 넣는다.
class _Fit extends StatelessWidget {
  const _Fit(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => FittedBox(
    fit: BoxFit.scaleDown,
    child: Text(text, maxLines: 1, softWrap: false),
  );
}

/// 단의 처음으로 가는 48dp 단추. 지금 있는 단은 채워서 보인다.
class _DecadeButton extends StatelessWidget {
  const _DecadeButton({
    super.key,
    required this.label,
    required this.semanticLabel,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String semanticLabel;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final fg = selected ? scheme.onSecondaryContainer : scheme.onSurface;
    return Semantics(
      button: true,
      selected: selected,
      label: semanticLabel,
      excludeSemantics: true,
      onTap: onTap,
      child: Material(
        color: selected ? scheme.secondaryContainer : Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: AppShape.medium,
          side: BorderSide(
            color: selected ? Colors.transparent : scheme.outlineVariant,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: SizedBox(
            height: 48,
            child: Center(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Text(
                    label,
                    maxLines: 1,
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: fg,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
