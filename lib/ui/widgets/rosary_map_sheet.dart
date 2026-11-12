import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../app/rosary_style.dart';
import '../../domain/rosary_sequence.dart';
import '../../domain/rosary_session.dart';
import 'rosary_map.dart';

/// '묵주 전체 보기' 시트. 읽기 화면과 분리된 **이동 모드**다.
///
/// - 구슬을 누르면 그 자리로 간다([RosarySession.jumpTo]). 지도를 끌면 한 번에 한 알씩 넘긴다.
/// - 마지막으로 손을 댄 지 [autoClose] 뒤에 저절로 닫힌다(손대면 다시 센다).
/// - [이 단 처음으로], [닫고 계속] 단추.
Future<void> showRosaryMapSheet(
  BuildContext context, {
  required RosarySession session,
  required RosaryStyle style,
  Duration autoClose = RosaryMapSheet.defaultAutoClose,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    constraints: const BoxConstraints(maxWidth: 560),
    builder: (_) =>
        RosaryMapSheet(session: session, style: style, autoClose: autoClose),
  );
}

class RosaryMapSheet extends StatefulWidget {
  const RosaryMapSheet({
    super.key,
    required this.session,
    required this.style,
    this.autoClose = defaultAutoClose,
  });

  static const Duration defaultAutoClose = Duration(seconds: 4);

  final RosarySession session;
  final RosaryStyle style;
  final Duration autoClose;

  @override
  State<RosaryMapSheet> createState() => _RosaryMapSheetState();
}

class _RosaryMapSheetState extends State<RosaryMapSheet> {
  Timer? _timer;
  int _pointers = 0;
  bool _closing = false;

  RosarySession get _session => widget.session;

  @override
  void initState() {
    super.initState();
    _session.addListener(_touch);
    _arm();
  }

  @override
  void dispose() {
    _session.removeListener(_touch);
    _timer?.cancel();
    super.dispose();
  }

  void _arm() {
    _timer?.cancel();
    _timer = Timer(widget.autoClose, _autoClose);
  }

  /// 손대거나 구슬이 바뀔 때마다 다시 센다.
  void _touch() {
    if (!_closing) _arm();
  }

  void _autoClose() {
    if (!mounted || _closing) return;
    // 손가락이 아직 닿아 있으면 뗄 때까지 기다린다.
    if (_pointers > 0) {
      _arm();
      return;
    }
    _close();
  }

  void _close() {
    if (_closing) return;
    _closing = true;
    _timer?.cancel();
    Navigator.of(context).maybePop();
  }

  /// 이 단의 처음(주님의 기도 + 신비 안내). 서두와 마침에서는 맨 처음.
  void _restartDecade() {
    final decade = _session.current.decade;
    var target = 0;
    if (decade != null) {
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
    final mapH = (screenH * 0.5).clamp(220.0, 420.0);
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (_) {
        _pointers++;
        _touch();
      },
      onPointerMove: (_) => _touch(),
      onPointerUp: (_) {
        _pointers = math.max(0, _pointers - 1);
        _touch();
      },
      onPointerCancel: (_) {
        _pointers = math.max(0, _pointers - 1);
        _touch();
      },
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: ListenableBuilder(
            listenable: _session,
            builder: (context, _) {
              final step = _session.current;
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('묵주 전체 보기', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 2),
                  Text(
                    '구슬을 누르면 그 자리로 갑니다 · 손대지 않으면 ${widget.autoClose.inSeconds}초 뒤 닫힙니다',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: mapH,
                    width: double.infinity,
                    child: RosaryMap(
                      key: const ValueKey('prayer-map-sheet-map'),
                      step: step,
                      style: widget.style,
                      onStep: _scrub,
                      onSlotTap: _onSlotTap,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.tonal(
                          key: const ValueKey('prayer-map-restart-decade'),
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(64, 52),
                          ),
                          onPressed: _restartDecade,
                          child: const Text('이 단 처음으로'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
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
