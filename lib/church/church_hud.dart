import 'dart:async';

import 'package:flutter/material.dart';

import 'net/church_net.dart';

/// 상단 왼쪽 칩: 성당 이름 + 접속 상태. 누르면 '성당 바꾸기'.
///
/// 접속자 수는 online일 때만 보인다. 혼자 모드/오프라인에서는 숫자를 보이지 않는다.
class ChurchStatusChip extends StatelessWidget {
  const ChurchStatusChip({
    super.key,
    required this.churchName,
    required this.state,
    required this.count,
    this.onChangeChurch,
  });

  final String churchName;
  final NetState state;
  final int count;
  final VoidCallback? onChangeChurch;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final online = state == NetState.online;
    final Widget status;
    if (online) {
      status = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            key: const ValueKey('presence-dot'),
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: scheme.primary,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            '$count명',
            style: text.labelMedium?.copyWith(color: scheme.onSurfaceVariant),
          ),
        ],
      );
    } else {
      status = Text(
        state == NetState.connecting ? '연결 중…' : '혼자 모드',
        style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant),
      );
    }
    return Tooltip(
      message: '성당 바꾸기',
      child: Material(
        color: scheme.surface.withValues(alpha: 0.86),
        shape: const StadiumBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onChangeChurch,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 10, 6),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Flexible(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          churchName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: text.titleSmall?.copyWith(
                            color: scheme.onSurface,
                          ),
                        ),
                        status,
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  Icon(
                    Icons.swap_horiz,
                    size: 18,
                    color: scheme.onSurfaceVariant,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 상단 오른쪽 둥근 아이콘 버튼 줄: 소리, 아바타 편집, 인사/이모트.
class ChurchTopActions extends StatelessWidget {
  const ChurchTopActions({
    super.key,
    required this.ambientOn,
    required this.onToggleAmbient,
    required this.onEditAvatar,
    required this.onEmote,
  });

  final bool ambientOn;
  final VoidCallback onToggleAmbient;
  final VoidCallback onEditAvatar;
  final ValueChanged<int> onEmote;

  static const emoteLabels = ['인사', '성호경', '고개 숙임'];

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final style = IconButton.styleFrom(
      backgroundColor: scheme.surface.withValues(alpha: 0.86),
      foregroundColor: scheme.onSurface,
      minimumSize: const Size(48, 48),
    );
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          style: style,
          tooltip: ambientOn ? '소리 끄기' : '소리 켜기',
          onPressed: onToggleAmbient,
          icon: Icon(ambientOn ? Icons.volume_up : Icons.volume_off),
        ),
        const SizedBox(width: 6),
        IconButton(
          style: style,
          tooltip: '아바타 편집',
          onPressed: onEditAvatar,
          icon: const Icon(Icons.face),
        ),
        const SizedBox(width: 6),
        PopupMenuButton<int>(
          tooltip: '인사',
          onSelected: onEmote,
          itemBuilder: (context) => [
            for (var i = 0; i < emoteLabels.length; i++)
              PopupMenuItem<int>(value: i, child: Text(emoteLabels[i])),
          ],
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: scheme.surface.withValues(alpha: 0.86),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.waving_hand, color: scheme.onSurface),
          ),
        ),
      ],
    );
  }
}

/// 오른쪽 아래 상황 버튼(하나만): 가까이 앉을 자리가 있으면 '앉기', 촛불대가 있으면 '초 켜기',
/// 아무것도 없으면 숨는다. 앉은 동안의 '일어나기'는 기도 카드의 같은 자리(오른쪽 아래)에 있다.
enum ChurchAction { none, sit, light }

class ChurchContextAction extends StatelessWidget {
  const ChurchContextAction({
    super.key,
    required this.action,
    required this.onPressed,
  });

  final ChurchAction action;
  final VoidCallback onPressed;

  /// 자리와 촛불대가 모두 가까우면 자리(더 좁은 반경)를 먼저 보여 준다.
  static ChurchAction forNear({required bool canSit, required bool canLight}) =>
      canSit
      ? ChurchAction.sit
      : (canLight ? ChurchAction.light : ChurchAction.none);

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 180),
      transitionBuilder: (child, anim) => FadeTransition(
        opacity: anim,
        child: ScaleTransition(scale: anim, child: child),
      ),
      child: switch (action) {
        ChurchAction.none => const SizedBox(
          key: ValueKey('ctx-none'),
          width: 0,
          height: 0,
        ),
        ChurchAction.sit => _button(
          const ValueKey('ctx-sit'),
          Icons.event_seat,
          '앉기',
        ),
        ChurchAction.light => _button(
          const ValueKey('ctx-light'),
          Icons.local_fire_department,
          '초 켜기',
        ),
      },
    );
  }

  Widget _button(Key key, IconData icon, String label) => FilledButton.icon(
    key: key,
    onPressed: onPressed,
    style: FilledButton.styleFrom(
      minimumSize: const Size(112, 64),
      padding: const EdgeInsets.symmetric(horizontal: 22),
      shape: const StadiumBorder(),
      elevation: 3,
    ),
    icon: Icon(icon),
    label: Text(label),
  );
}

/// 왼쪽 절반 이동 영역(Roblox 방식, C-01): 어디든 누르면 그 자리에 스틱이 생기고, 끌면 [-1,1] 값을 낸다.
/// y > 0 이 앞(위로 끌기). 갱신은 최대 30Hz, 손을 떼면 (0,0)을 한 번 보낸다.
///
/// 이 위젯은 자기 영역(부모가 정한 크기)의 터치를 모두 가로챈다. 그래서 HUD 버튼은 반드시
/// 이 위젯보다 위(나중에 그린 쪽)에 둔다. 오른쪽 절반은 웹 장면이 받아 카메라를 돌린다.
class ChurchMoveZone extends StatefulWidget {
  const ChurchMoveZone({
    super.key,
    required this.onChanged,
    this.size = 120,
    this.minInterval = const Duration(milliseconds: 33),
    this.hint,
  });

  final void Function(double x, double y) onChanged;

  /// 스틱 바탕의 지름.
  final double size;
  final Duration minInterval;

  /// 처음 한 번 보이는 안내 문구(스틱을 한 번 쓰면 사라진다).
  final String? hint;

  @override
  State<ChurchMoveZone> createState() => _ChurchMoveZoneState();
}

class _ChurchMoveZoneState extends State<ChurchMoveZone> {
  Offset? _origin; // 터치 시작점(영역 좌표). null이면 스틱이 안 보인다.
  Offset _knob = Offset.zero; // -1..1 (화면 좌표: y 아래가 +)
  int? _pointer;
  Timer? _pending;
  final Stopwatch _clock = Stopwatch()..start();
  Duration? _lastSent;
  bool _dirty = false;
  bool _sent = false;
  bool _used = false;

  double get _radius => widget.size / 2;

  void _update(Offset local) {
    final o = _origin;
    if (o == null) return;
    var v = (local - o) / _radius;
    if (v.distance > 1) v = v / v.distance;
    setState(() => _knob = v);
    _emitThrottled();
  }

  (double, double) get _value {
    var v = _knob;
    if (v.distance < 0.12) v = Offset.zero;
    return (v.dx, -v.dy);
  }

  void _emitThrottled() {
    final now = _clock.elapsed;
    final last = _lastSent;
    if (last == null || now - last >= widget.minInterval) {
      _send();
    } else {
      _dirty = true;
      _pending ??= Timer(widget.minInterval - (now - last), () {
        _pending = null;
        if (_dirty) _send();
      });
    }
  }

  void _send() {
    _dirty = false;
    _sent = true;
    _lastSent = _clock.elapsed;
    final (x, y) = _value;
    widget.onChanged(x, y);
  }

  void _release() {
    _pending?.cancel();
    _pending = null;
    _pointer = null;
    final wasSent = _sent;
    _sent = false;
    _dirty = false;
    _lastSent = null;
    if (mounted) {
      setState(() {
        _origin = null;
        _knob = Offset.zero;
      });
    }
    if (wasSent) widget.onChanged(0, 0);
  }

  @override
  void dispose() {
    _pending?.cancel();
    if (_pointer != null && _sent) widget.onChanged(0, 0);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final knobSize = widget.size * 0.42;
    final o = _origin;
    return Semantics(
      label: '이동: 화면 왼쪽을 누른 채 끌기',
      child: Listener(
        key: const ValueKey('move-zone'),
        behavior: HitTestBehavior.opaque,
        onPointerDown: (e) {
          if (_pointer != null) return;
          _pointer = e.pointer;
          _used = true;
          setState(() {
            _origin = e.localPosition;
            _knob = Offset.zero;
          });
        },
        onPointerMove: (e) {
          if (e.pointer == _pointer) _update(e.localPosition);
        },
        onPointerUp: (e) {
          if (e.pointer == _pointer) _release();
        },
        onPointerCancel: (e) {
          if (e.pointer == _pointer) _release();
        },
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (o != null)
              Positioned(
                left: o.dx - _radius,
                top: o.dy - _radius,
                child: IgnorePointer(
                  child: Container(
                    key: const ValueKey('joystick-ring'),
                    width: widget.size,
                    height: widget.size,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: scheme.surface.withValues(alpha: 0.35),
                      border: Border.all(
                        color: scheme.onSurface.withValues(alpha: 0.4),
                        width: 2,
                      ),
                    ),
                    child: Transform.translate(
                      offset: _knob * (_radius - knobSize / 2),
                      child: Center(
                        child: Container(
                          width: knobSize,
                          height: knobSize,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: scheme.primary.withValues(alpha: 0.85),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            if (widget.hint != null && !_used)
              Positioned(
                left: 16,
                bottom: 24,
                child: IgnorePointer(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 140),
                    child: DecoratedBox(
                      key: const ValueKey('move-hint'),
                      decoration: BoxDecoration(
                        color: scheme.surface.withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        child: Text(
                          widget.hint!,
                          style: text.labelMedium?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// 느린 기기 안내(C-04, Q8): 입장 직후 평균 fps가 낮을 때 떠서 간단 모드를 '권한다'.
/// 화면을 가리지 않는 작은 띠이며, 아무것도 강제하지 않는다.
class ChurchPerfBanner extends StatelessWidget {
  const ChurchPerfBanner({
    super.key,
    required this.onSwitch,
    required this.onKeep,
  });

  final VoidCallback onSwitch;
  final VoidCallback onKeep;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Material(
      color: scheme.inverseSurface,
      elevation: 3,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 8, 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '화면이 느려요. 간단 모드로 바꿀까요?',
              style: text.bodyMedium?.copyWith(color: scheme.onInverseSurface),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: Wrap(
                children: [
                  TextButton(
                    onPressed: onKeep,
                    style: TextButton.styleFrom(
                      foregroundColor: scheme.onInverseSurface,
                      minimumSize: const Size(64, 48),
                    ),
                    child: const Text('그대로'),
                  ),
                  TextButton(
                    onPressed: onSwitch,
                    style: TextButton.styleFrom(
                      foregroundColor: scheme.inversePrimary,
                      minimumSize: const Size(64, 48),
                    ),
                    child: const Text('바꾸기'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
