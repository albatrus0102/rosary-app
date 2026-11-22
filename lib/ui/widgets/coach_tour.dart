import 'package:flutter/material.dart';

import '../../app/settings.dart';
import '../../app/theme.dart';
import '../../app/track.dart';
import 'guide_card.dart';
import 'swipe_hint.dart';

/// 첫 사용 안내(코치 마크)의 한 단계: 실제 화면의 [target] 위젯을 밝게 비추고 설명 글을 보인다.
@immutable
class CoachStep {
  const CoachStep({
    required this.target,
    required this.text,
    this.showFinger = false,
    this.altTarget,
    this.altText,
  });

  /// 비출 실제 위젯의 키. 화면에 없으면(장면이 없는 시험, 다른 배치 등) 이 단계는 건너뛴다.
  final GlobalKey target;
  final String text;

  /// 비춘 곳 위에 아래로 미끄러지는 손가락을 얹는다(묵주 넘기기 설명).
  final bool showFinger;

  /// [target]이 없을 때 대신 비출 위젯과 그 설명(예: 접혀 있는 기도문 대신 '기도문 펼치기' 단추).
  final GlobalKey? altTarget;
  final String? altText;
}

/// 화면 전체를 어둡게 덮고 [steps]의 위젯을 하나씩 비추며 설명하는 안내.
///
/// 이 위젯은 비출 화면과 같은 [Stack] 맨 위(전체 크기)에 놓는다. 터치를 모두 받아 아래 화면이 눌리거나
/// 끌리지 않게 한다(기도 시간이나 묵주알이 세어지지 않는다). 뒤로 가기는 쓰는 쪽이 이 안내부터 닫는다.
///
/// 버튼은 '다음' · '건너뛰기', 마지막 단계는 '시작해요'. 비출 수 있는 단계가 하나도 없으면 아무것도 그리지 않고
/// [onClose]에 false(보이지 않았음)를 알린다. 한 번이라도 보였다면 마치든 건너뛰든 true.
class CoachTour extends StatefulWidget {
  const CoachTour({
    super.key,
    required this.steps,
    required this.onClose,
    this.settings,
    this.speakBlocked,
    this.tourId,
  });

  /// 분석용 이름(tour_start·tour_step·tour_done·tour_skip 의 tour 값). 없으면 세지 않는다.
  final String? tourId;

  final List<CoachStep> steps;
  final ValueChanged<bool> onClose;

  /// 있으면 안내 글을 소리로 읽어 주고 스피커 단추를 둔다.
  final AppSettings? settings;

  /// 기도 소리(성가·선창 목소리)가 나는 중이면 true: 읽지 않는다.
  final bool Function()? speakBlocked;

  @override
  State<CoachTour> createState() => _CoachTourState();
}

class _Shown {
  const _Shown(this.rect, this.text, this.finger);
  final Rect rect;
  final String text;
  final bool finger;
}

class _CoachTourState extends State<CoachTour> {
  bool _ready = false;
  bool _closed = false;
  int _cur = 0;
  Size? _lastSize;
  bool _started = false;

  @override
  void initState() {
    super.initState();
    // 첫 프레임이 배치된 뒤에야 위젯 위치를 잴 수 있다.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _ready = true);
    });
  }

  Rect? _rectOf(GlobalKey key) {
    final ctx = key.currentContext;
    if (ctx == null) return null;
    final ro = ctx.findRenderObject();
    final me = context.findRenderObject();
    if (ro is! RenderBox || me is! RenderBox) return null;
    if (!ro.attached || !ro.hasSize || !me.hasSize) return null;
    if (ro.size.isEmpty) return null;
    return me.globalToLocal(ro.localToGlobal(Offset.zero)) & ro.size;
  }

  _Shown? _resolve(CoachStep s) {
    final r = _rectOf(s.target);
    if (r != null) return _Shown(r, s.text, s.showFinger);
    final alt = s.altTarget;
    if (alt != null) {
      final ar = _rectOf(alt);
      if (ar != null) return _Shown(ar, s.altText ?? s.text, false);
    }
    return null;
  }

  void _close(bool shown) {
    if (_closed) return;
    _closed = true;
    widget.onClose(shown);
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready || _closed) return const SizedBox.shrink();
    final size = MediaQuery.sizeOf(context);
    if (_lastSize != null && _lastSize != size) {
      // 화면 크기가 바뀌면(회전 등) 아래 화면이 다시 배치된 뒤 위치를 다시 잰다.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() {});
      });
    }
    _lastSize = size;

    final shown = <_Shown?>[for (final s in widget.steps) _resolve(s)];
    final avail = [
      for (var i = 0; i < shown.length; i++)
        if (shown[i] != null) i,
    ];
    if (avail.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _close(false);
      });
      return const SizedBox.shrink();
    }
    // 지금 단계가 없어졌으면(위젯이 사라짐) 그다음으로, 없으면 마지막으로.
    final pos = avail.indexWhere((i) => i >= _cur);
    final at = pos < 0 ? avail.length - 1 : pos;
    final step = shown[avail[at]]!;
    final last = at == avail.length - 1;
    final id = widget.tourId;
    if (!_started && id != null) {
      _started = true;
      Track.tourStart(id);
    }

    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final hole = RRect.fromRectAndRadius(
      step.rect.inflate(6),
      const Radius.circular(AppShape.largeRadius),
    );
    final below = size.height - hole.bottom >= hole.top;

    final card = GuideCard(
      keyPrefix: 'coach',
      counter: '${at + 1} / ${avail.length}',
      text: step.text,
      semanticsLabel: '사용법 ${at + 1}/${avail.length}. ${step.text}',
      settings: widget.settings,
      speakBlocked: widget.speakBlocked,
      secondaryKey: const ValueKey('coach-skip'),
      secondaryLabel: last ? null : '건너뛰기',
      onSecondary: () {
        if (id != null) Track.tourSkip(id, at);
        _close(true);
      },
      primaryKey: const ValueKey('coach-next'),
      primaryLabel: last ? '시작해요' : '다음',
      onPrimary: () {
        if (last) {
          if (id != null) Track.tourDone(id);
          _close(true);
        } else {
          if (id != null) Track.tourStep(id, at + 1);
          setState(() => _cur = avail[at + 1]);
        }
      },
    );

    return BlockSemantics(
      child: Stack(
        key: const ValueKey('coach-tour'),
        fit: StackFit.expand,
        children: [
          // 아래 화면이 눌리거나 끌리지 않게 모든 터치를 받는다.
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () {},
            onVerticalDragStart: (_) {},
            child: ExcludeSemantics(
              child: CustomPaint(
                size: Size.infinite,
                painter: _SpotlightPainter(
                  hole: hole,
                  scrim: Colors.black.withValues(alpha: 0.74),
                  ring: scheme.primary,
                ),
              ),
            ),
          ),
          if (step.finger)
            Positioned.fromRect(
              rect: step.rect,
              child: Center(
                child: SwipeFinger(
                  key: const ValueKey('coach-finger'),
                  size: 56,
                  travel: (step.rect.height * 0.4).clamp(24.0, 96.0),
                  color: Colors.white,
                ),
              ),
            ),
          Positioned(
            left: AppSpace.sm,
            right: AppSpace.sm,
            top: below ? hole.bottom + AppSpace.sm : null,
            bottom: below ? null : size.height - hole.top + AppSpace.sm,
            child: Center(child: card),
          ),
        ],
      ),
    );
  }
}

class _SpotlightPainter extends CustomPainter {
  const _SpotlightPainter({
    required this.hole,
    required this.scrim,
    required this.ring,
  });

  final RRect hole;
  final Color scrim;
  final Color ring;

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..fillType = PathFillType.evenOdd
      ..addRect(Offset.zero & size)
      ..addRRect(hole);
    canvas.drawPath(path, Paint()..color = scrim);
    canvas.drawRRect(
      hole,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = ring,
    );
  }

  @override
  bool shouldRepaint(_SpotlightPainter old) =>
      old.hole != hole || old.scrim != scrim || old.ring != ring;
}
