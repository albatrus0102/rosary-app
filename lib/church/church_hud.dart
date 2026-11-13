import 'dart:async';

import 'package:flutter/material.dart';

import '../app/theme.dart';
import 'net/church_net.dart';

/// 3D 장면 위 HUD 의 M3 표면 규칙(2026-11 재감사).
///
/// - 반투명 `surface.withValues(alpha:…)` 대신 **불투명 표면 역할**을 쓴다(장면 밝기와 상관없이
///   대비 WCAG AA 유지). 정보 칩은 `surfaceContainerHigh`, 아이콘 버튼은 M3 filled tonal.
/// - 짧은 안내·진행 상태는 M3 plain tooltip/snackbar 규칙: `inverseSurface` + `onInverseSurface`.
/// - 장면 위에 떠 있는 것은 level 2(3dp) 높이로 통일한다.
abstract final class ChurchHudStyle {
  /// 정보 칩 바탕(성당 이름·인원).
  static Color surface(ColorScheme s) => s.surfaceContainerHigh;

  /// 떠 있는 HUD 의 높이(M3 elevation level 2 = 3dp).
  static const double elevation = 3;
}

/// 상단 왼쪽 칩: 성당 이름 + 접속 상태.
///
/// 칩은 두 구역으로 나뉜다. 왼쪽(성당 이름 + 인원)을 누르면 '지금 접속 중' 시트
/// ([onShowPresence]), 오른쪽 ↔ 아이콘을 누르면 '성당 바꾸기'([onChangeChurch]).
///
/// 접속자 수는 online일 때만 보인다. 혼자 모드/오프라인에서는 숫자를 보이지 않는다.
class ChurchStatusChip extends StatelessWidget {
  const ChurchStatusChip({
    super.key,
    required this.churchName,
    required this.state,
    required this.count,
    this.onChangeChurch,
    this.onShowPresence,
  });

  final String churchName;
  final NetState state;
  final int count;
  final VoidCallback? onChangeChurch;
  final VoidCallback? onShowPresence;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final online = state == NetState.online;
    final String statusText = online
        ? '$count명'
        : state == NetState.connecting
        ? '연결 중…'
        : '혼자 모드';
    final status = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (online) ...[
          Container(
            key: const ValueKey('presence-dot'),
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: scheme.primary,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: AppSpace.xs),
        ],
        Flexible(
          child: Text(
            statusText,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: (online ? text.labelMedium : text.labelSmall)?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
        ),
        if (onShowPresence != null)
          // 누르면 접속자 시트가 열린다는 작은 표시.
          Icon(
            Icons.expand_more,
            key: const ValueKey('presence-chevron'),
            size: 16,
            color: scheme.onSurfaceVariant,
          ),
      ],
    );
    return Material(
      color: ChurchHudStyle.surface(scheme),
      shape: AppShape.full,
      clipBehavior: Clip.antiAlias,
      elevation: ChurchHudStyle.elevation,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48),
        child: IntrinsicHeight(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Flexible(
                child: Semantics(
                  container: true,
                  button: onShowPresence != null,
                  label: online
                      ? '$churchName, $count명 접속 중'
                      : '$churchName, $statusText',
                  hint: onShowPresence != null ? '접속 중인 사람 보기' : null,
                  onTap: onShowPresence,
                  child: ExcludeSemantics(
                    child: InkWell(
                      key: const ValueKey('presence-chip'),
                      onTap: onShowPresence,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(
                          AppSpace.sm,
                          AppSpace.xxs,
                          AppSpace.xxs,
                          AppSpace.xxs,
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.center,
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
                    ),
                  ),
                ),
              ),
              Tooltip(
                message: '성당 바꾸기',
                child: InkWell(
                  onTap: onChangeChurch,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 0, 16, 0),
                    child: Icon(
                      Icons.swap_horiz,
                      size: 20,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 상단 오른쪽 둥근 아이콘 버튼 줄: 소리, 아바타 편집, 인사/이모트. (그 아래 줄에 [ChurchGoButton])
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
    // M3 filled tonal 아이콘 버튼(secondaryContainer). 48dp 터치 타깃.
    final style = IconButton.styleFrom(
      minimumSize: const Size(48, 48),
      elevation: ChurchHudStyle.elevation,
    );
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton.filledTonal(
          style: style,
          tooltip: ambientOn ? '소리 끄기' : '소리 켜기',
          onPressed: onToggleAmbient,
          icon: Icon(ambientOn ? Icons.volume_up : Icons.volume_off),
        ),
        const SizedBox(width: AppSpace.xs),
        IconButton.filledTonal(
          style: style,
          tooltip: '아바타 편집',
          onPressed: onEditAvatar,
          icon: const Icon(Icons.face),
        ),
        const SizedBox(width: AppSpace.xs),
        PopupMenuButton<int>(
          tooltip: '인사',
          onSelected: onEmote,
          itemBuilder: (context) => [
            for (var i = 0; i < emoteLabels.length; i++)
              PopupMenuItem<int>(value: i, child: Text(emoteLabels[i])),
          ],
          style: IconButton.styleFrom(
            backgroundColor: scheme.secondaryContainer,
            foregroundColor: scheme.onSecondaryContainer,
            minimumSize: const Size(48, 48),
            elevation: ChurchHudStyle.elevation,
          ),
          icon: const Icon(Icons.waving_hand),
        ),
      ],
    );
  }
}

/// '가기' 버튼(지도 핀 아이콘 + 글자): 촛불 봉헌대·제대 앞·빈 자리·입구로 바로 걸어간다.
/// 위쪽 아이콘 줄 바로 아래 오른쪽에 둔다.
class ChurchGoButton extends StatelessWidget {
  const ChurchGoButton({super.key, required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    // M3 tonal 버튼(위 아이콘 버튼 줄과 같은 secondaryContainer). 모양은 버튼 기본(full).
    return FilledButton.tonalIcon(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        minimumSize: const Size(48, 48),
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
        elevation: ChurchHudStyle.elevation,
      ),
      icon: const Icon(Icons.location_on),
      label: const Text('가기'),
    );
  }
}

/// 오른쪽 아래 상황 버튼(하나만): 제대 앞/성수대에 서 있으면 '기도하기'/'성호 긋기'(한 번 누르면 그 자리에서는 사라진다),
/// 가까이 앉을 자리가 있으면 '앉기', 촛불대가 있으면 '초 켜기', 아무것도 없으면 숨는다.
/// 앉은 동안의 '일어나기'는 기도 카드의 같은 자리(오른쪽 아래)에 있다.
/// 행동은 그 자리에 서 있어야만 나온다(멀리서 하는 방법은 없다).
enum ChurchAction { none, sit, light, pray, cross }

class ChurchContextAction extends StatelessWidget {
  const ChurchContextAction({
    super.key,
    required this.action,
    required this.onPressed,
  });

  final ChurchAction action;
  final VoidCallback onPressed;

  /// [station]은 아직 하지 않은 스테이션 동작('altar'|'font')이다. 있으면 그것을 먼저 보여 주고,
  /// 자리와 촛불대가 모두 가까우면 자리(더 좁은 반경)를 먼저 보여 준다.
  static ChurchAction forNear({
    required bool canSit,
    required bool canLight,
    String? station,
  }) {
    if (station == 'altar') return ChurchAction.pray;
    if (station == 'font') return ChurchAction.cross;
    return canSit
        ? ChurchAction.sit
        : (canLight ? ChurchAction.light : ChurchAction.none);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      // M3 모션: short4(200ms) + 표준 곡선, '동작 줄이기'면 즉시.
      duration: AppMotion.of(context, Durations.short4),
      switchInCurve: Easing.standardDecelerate,
      switchOutCurve: Easing.standardAccelerate,
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
        ChurchAction.pray => _button(
          const ValueKey('ctx-pray'),
          Icons.self_improvement,
          '기도하기',
        ),
        ChurchAction.cross => _button(
          const ValueKey('ctx-cross'),
          Icons.add,
          '성호 긋기',
        ),
      },
    );
  }

  Widget _button(Key key, IconData icon, String label) => FilledButton.icon(
    key: key,
    onPressed: onPressed,
    // 장면 위 주 행동: M3 filled 버튼(primary, 기본 full 모양) + level 2 높이.
    style: FilledButton.styleFrom(
      minimumSize: const Size(112, 64),
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
      elevation: ChurchHudStyle.elevation,
    ),
    icon: Icon(icon),
    label: Text(label),
  );
}

/// 자동 걷기 중에 뜨는 작은 칩: '걷는 중… (취소)'. 누르면 멈춘다.
class ChurchWalkChip extends StatelessWidget {
  const ChurchWalkChip({super.key, required this.onCancel});

  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Material(
      color: scheme.inverseSurface,
      shape: AppShape.smallBorder,
      clipBehavior: Clip.antiAlias,
      elevation: ChurchHudStyle.elevation,
      child: InkWell(
        onTap: onCancel,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.directions_walk,
                  size: 20,
                  color: scheme.onInverseSurface,
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    '걷는 중… (취소)',
                    style: text.labelLarge?.copyWith(
                      color: scheme.onInverseSurface,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 성당 안의 진본 사진 창 앞에 서거나 창을 누르면 뜨는 칩(G-29): '이 창: ○○ · 자세히 보기'.
/// 누르면 창 정보(출처·설명)를 연다. 둘째 줄('가기') 아래 왼쪽에 놓여 다른 HUD와 겹치지 않는다.
class ChurchGlassChip extends StatelessWidget {
  const ChurchGlassChip({super.key, required this.title, required this.onTap});

  /// 창 이름(스테인드글라스 카탈로그의 한국어 제목).
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final fg = scheme.onInverseSurface;
    return Semantics(
      button: true,
      label: '이 창: $title. 자세히 보기',
      excludeSemantics: true,
      child: Material(
        color: scheme.inverseSurface,
        shape: AppShape.smallBorder,
        clipBehavior: Clip.antiAlias,
        elevation: ChurchHudStyle.elevation,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.auto_awesome_mosaic_outlined, size: 20, color: fg),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      '이 창: $title',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: text.labelLarge?.copyWith(color: fg),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '자세히 보기',
                    style: text.labelMedium?.copyWith(
                      color: scheme.inversePrimary,
                    ),
                  ),
                  Icon(Icons.chevron_right, size: 18, color: fg),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 처음 한 번 뜨는 '가기' 안내 말풍선(6초 뒤 또는 처음 쓰면 사라진다).
/// 3D 이름표·표식이 뜨는 위쪽을 가리지 않도록 오른쪽 아래(상황 버튼 위)에 놓는다.
/// 폭은 왼쪽 이동 안내(왼쪽 16 + 140 + 간격 8)와 겹치지 않게 줄이고, 260을 넘지 않는다.
class ChurchWalkHint extends StatelessWidget {
  const ChurchWalkHint({super.key});

  static const message = '가기 버튼으로 촛불 봉헌대·제대 앞에 바로 갈 수 있어요';

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final maxW = (MediaQuery.sizeOf(context).width - 16 - 164).clamp(
      120.0,
      260.0,
    );
    return IgnorePointer(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxW),
        child: DecoratedBox(
          key: const ValueKey('walk-hint'),
          decoration: BoxDecoration(
            // M3 plain tooltip: inverseSurface, extra small(4) 모서리.
            color: scheme.inverseSurface,
            borderRadius: AppShape.extraSmall,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpace.xs,
              vertical: AppSpace.xxs,
            ),
            child: Text(
              message,
              style: text.bodySmall?.copyWith(color: scheme.onInverseSurface),
            ),
          ),
        ),
      ),
    );
  }
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
    this.onTap,
    this.onTouchDown,
  });

  final void Function(double x, double y) onChanged;

  /// 거의 끌지 않고 짧게 눌렀다 뗀 '탭'(이 영역 좌표 = 화면 좌표). 웹 장면의 표식을 누르는 데 쓴다.
  final ValueChanged<Offset>? onTap;

  /// 이 영역에 손이 닿을 때(자동 걷기를 멈추는 데 쓴다).
  final VoidCallback? onTouchDown;

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
  Offset _downAt = Offset.zero;
  double _maxDrag = 0;
  Duration _downTime = Duration.zero;

  double get _radius => widget.size / 2;

  void _update(Offset local) {
    final o = _origin;
    if (o == null) return;
    final drag = (local - _downAt).distance;
    if (drag > _maxDrag) _maxDrag = drag;
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
          _downAt = e.localPosition;
          _maxDrag = 0;
          _downTime = _clock.elapsed;
          widget.onTouchDown?.call();
          setState(() {
            _origin = e.localPosition;
            _knob = Offset.zero;
          });
        },
        onPointerMove: (e) {
          if (e.pointer == _pointer) _update(e.localPosition);
        },
        onPointerUp: (e) {
          if (e.pointer != _pointer) return;
          final isTap =
              _maxDrag < 12 &&
              _clock.elapsed - _downTime < const Duration(milliseconds: 450);
          _release();
          if (isTap) widget.onTap?.call(e.localPosition);
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
                    // 바닥의 금색·갈색 표식 고리와 헷갈리지 않게 중립색(흰색 반투명 + 옅은 그림자)으로 그린다.
                    // 밝은 대리석 위에서도 어두운 의자 위에서도 보이도록 바깥에 어두운 그림자를 둔다.
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.12),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.75),
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.3),
                          blurRadius: 4,
                        ),
                      ],
                    ),
                    child: Transform.translate(
                      offset: _knob * (_radius - knobSize / 2),
                      child: Center(
                        child: Container(
                          width: knobSize,
                          height: knobSize,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white.withValues(alpha: 0.55),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.25),
                                blurRadius: 4,
                              ),
                            ],
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
                        // M3 plain tooltip(가기 안내와 같은 규칙).
                        color: scheme.inverseSurface,
                        borderRadius: AppShape.extraSmall,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpace.xs,
                          vertical: AppSpace.xxs,
                        ),
                        child: Text(
                          widget.hint!,
                          style: text.bodySmall?.copyWith(
                            color: scheme.onInverseSurface,
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
      // M3 snackbar 규칙: inverseSurface, extra small 모서리, level 3(6dp).
      elevation: 6,
      borderRadius: AppShape.extraSmall,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpace.sm,
          AppSpace.xs,
          AppSpace.xs,
          AppSpace.xs,
        ),
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
