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

/// 하단 가운데 상황별 버튼: 가까이 앉을 자리/촛불대가 있을 때만 나타난다.
class ChurchContextButtons extends StatelessWidget {
  const ChurchContextButtons({
    super.key,
    required this.canSit,
    required this.canLight,
    required this.onSit,
    required this.onLight,
  });

  final bool canSit;
  final bool canLight;
  final VoidCallback onSit;
  final VoidCallback onLight;

  @override
  Widget build(BuildContext context) {
    return AnimatedSize(
      duration: const Duration(milliseconds: 180),
      alignment: Alignment.bottomCenter,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 180),
        transitionBuilder: (child, anim) => FadeTransition(
          opacity: anim,
          child: ScaleTransition(scale: anim, child: child),
        ),
        child: (canSit || canLight)
            ? Wrap(
                key: ValueKey('ctx-$canSit-$canLight'),
                alignment: WrapAlignment.center,
                spacing: 12,
                runSpacing: 8,
                children: [
                  if (canSit)
                    FilledButton.tonalIcon(
                      onPressed: onSit,
                      icon: const Icon(Icons.event_seat),
                      label: const Text('앉기'),
                    ),
                  if (canLight)
                    FilledButton.tonalIcon(
                      onPressed: onLight,
                      icon: const Icon(Icons.local_fire_department),
                      label: const Text('초 켜기'),
                    ),
                ],
              )
            : const SizedBox(key: ValueKey('ctx-none'), width: 0, height: 0),
      ),
    );
  }
}

/// 가상 조이스틱. 원형 바탕(기본 120dp) 위에서 노브를 끌면 [-1,1] 값을 낸다.
/// y > 0 이 앞(위로 끌기). 갱신은 최대 30Hz, 손을 떼면 (0,0)을 한 번 보낸다.
class ChurchJoystick extends StatefulWidget {
  const ChurchJoystick({
    super.key,
    required this.onChanged,
    this.size = 120,
    this.minInterval = const Duration(milliseconds: 33),
  });

  final void Function(double x, double y) onChanged;
  final double size;
  final Duration minInterval;

  @override
  State<ChurchJoystick> createState() => _ChurchJoystickState();
}

class _ChurchJoystickState extends State<ChurchJoystick> {
  Offset _knob = Offset.zero; // -1..1 (화면 좌표: y 아래가 +)
  int? _pointer;
  Timer? _pending;
  final Stopwatch _clock = Stopwatch()..start();
  Duration? _lastSent;
  bool _dirty = false;

  double get _radius => widget.size / 2;

  void _update(Offset local) {
    final c = Offset(widget.size / 2, widget.size / 2);
    var v = (local - c) / _radius;
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
    _lastSent = _clock.elapsed;
    final (x, y) = _value;
    widget.onChanged(x, y);
  }

  void _release() {
    _pending?.cancel();
    _pending = null;
    _pointer = null;
    final wasActive = _knob != Offset.zero || _lastSent != null;
    setState(() => _knob = Offset.zero);
    if (wasActive) {
      _dirty = false;
      _lastSent = _clock.elapsed;
      widget.onChanged(0, 0);
    }
  }

  @override
  void dispose() {
    _pending?.cancel();
    if (_pointer != null) widget.onChanged(0, 0);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    // 터치 영역은 바탕보다 넉넉하게(+24dp).
    final touch = widget.size + 24;
    final knobSize = widget.size * 0.42;
    return Semantics(
      label: '이동 조이스틱',
      child: SizedBox(
        key: const ValueKey('joystick-touch'),
        width: touch,
        height: touch,
        child: Listener(
          behavior: HitTestBehavior.opaque,
          onPointerDown: (e) {
            if (_pointer != null) return;
            _pointer = e.pointer;
            _update(e.localPosition - const Offset(12, 12));
          },
          onPointerMove: (e) {
            if (e.pointer != _pointer) return;
            _update(e.localPosition - const Offset(12, 12));
          },
          onPointerUp: (e) {
            if (e.pointer == _pointer) _release();
          },
          onPointerCancel: (e) {
            if (e.pointer == _pointer) _release();
          },
          child: Center(
            child: Container(
              width: widget.size,
              height: widget.size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: scheme.surface.withValues(alpha: 0.45),
                border: Border.all(
                  color: scheme.onSurface.withValues(alpha: 0.35),
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
      ),
    );
  }
}
