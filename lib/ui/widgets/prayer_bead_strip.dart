import 'package:flutter/material.dart';

import '../../domain/rosary_sequence.dart';

/// 띠에 그리는 구슬 한 알.
enum StripBead { large, small }

/// [PrayerBeadStrip]이 그리는 한 줄(이번 단 또는 서두)의 모양과 현재 위치.
class StripModel {
  const StripModel({
    required this.beads,
    required this.current,
    required this.decade,
    required this.label,
  });

  /// 한 줄에 놓이는 구슬들(기도 순서).
  final List<StripBead> beads;

  /// 현재 구슬의 자리(0..beads.length-1).
  final int current;

  /// 1..5. 서두는 0, 마침은 6.
  final int decade;

  /// 오른쪽 문구. 예: '1/5단', '서두', '마침'.
  final String label;

  /// 한 줄 안에서 지금까지 진행한 비율(0..1).
  double get fraction => beads.length <= 1 ? 1 : current / (beads.length - 1);
}

/// [step]에 맞는 띠 모양.
///
/// 단 안: 주님의 기도(큰 알) + 성모송 10알 + 영광송(큰 알, 구원송도 여기에 머문다).
/// 서두: 성호경, 사도신경, 주님의 기도(큰 알) + 성모송 3알 + 영광송(큰 알). 마침은 서두 줄의 끝.
StripModel stripModelFor(RosaryStep step) {
  const lead = [StripBead.large];
  final decade = step.decade;
  if (decade != null) {
    final beads = [
      ...lead,
      for (var i = 0; i < 10; i++) StripBead.small,
      StripBead.large,
    ];
    final current = switch (step.kind) {
      StepKind.ourFather => 0,
      StepKind.hailMary => step.beadIndex ?? 1,
      _ => 11, // 영광송, 구원송
    };
    return StripModel(
      beads: beads,
      current: current,
      decade: decade,
      label: '$decade/5단',
    );
  }
  final beads = [
    StripBead.large, // 성호경
    StripBead.large, // 사도신경
    StripBead.large, // 주님의 기도
    for (var i = 0; i < 3; i++) StripBead.small,
    StripBead.large, // 영광송
  ];
  final closing = step.kind == StepKind.closing;
  final current = switch (step.kind) {
    StepKind.signOfCross => 0,
    StepKind.apostlesCreed => 1,
    StepKind.ourFather => 2,
    StepKind.hailMary => 2 + (step.beadIndex ?? 1),
    StepKind.gloryBe => 6,
    _ => beads.length - 1,
  };
  return StripModel(
    beads: beads,
    current: closing ? beads.length - 1 : current,
    decade: closing ? 6 : 0,
    label: closing ? '마침' : '서두',
  );
}

/// 높이 36dp의 얇은 진행 띠: 현재 기도 이름, 이번 줄의 구슬 점, 단 n/5, 5단 막대.
///
/// [onOpenMap]이 있으면 띠 전체가 버튼이 되어 묵주 전체 보기를 연다.
/// 글자는 부르는 쪽이 정한 시스템 글자 배율(보통 1.3 상한)을 따른다.
class PrayerBeadStrip extends StatelessWidget {
  const PrayerBeadStrip({
    super.key,
    required this.step,
    this.onOpenMap,
    this.focusNode,
  });

  final RosaryStep step;
  final VoidCallback? onOpenMap;

  /// 띠 단추의 포커스. 묵주 전체 보기를 닫으면 여기로 포커스를 돌려준다.
  final FocusNode? focusNode;

  static const double height = 36;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final model = stripModelFor(step);
    final label = step.title;

    final body = SizedBox(
      height: height,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          children: [
            Expanded(
              child: LayoutBuilder(
                builder: (context, c) => Row(
                  children: [
                    ConstrainedBox(
                      constraints: BoxConstraints(maxWidth: c.maxWidth * 0.5),
                      child: Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: scheme.secondary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: CustomPaint(
                        key: const ValueKey('prayer-strip-dots'),
                        painter: _DotsPainter(
                          model: model,
                          done: scheme.primary,
                          todo: scheme.onSurfaceVariant.withValues(alpha: 0.38),
                          ring: scheme.primary,
                        ),
                        child: const SizedBox.expand(),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      model.label,
                      maxLines: 1,
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    if (onOpenMap != null) ...[
                      const SizedBox(width: 6),
                      Icon(
                        Icons.blur_circular_outlined,
                        size: 20,
                        color: scheme.onSurfaceVariant,
                      ),
                    ],
                  ],
                ),
              ),
            ),
            _DecadeBar(model: model),
            const SizedBox(height: 2),
          ],
        ),
      ),
    );

    final summary =
        '$label, ${model.label}${onOpenMap != null ? ', 묵주 전체 보기' : ''}';
    // 구슬이 바뀔 때마다 화면 읽기 프로그램이 (끼어들지 않고) 차분히 읽도록 liveRegion.
    if (onOpenMap == null) {
      return Semantics(
        container: true,
        liveRegion: true,
        label: summary,
        child: body,
      );
    }
    return Semantics(
      container: true,
      button: true,
      liveRegion: true,
      excludeSemantics: true,
      label: summary,
      onTap: onOpenMap,
      child: InkWell(
        key: const ValueKey('prayer-strip'),
        focusNode: focusNode,
        onTap: onOpenMap,
        child: body,
      ),
    );
  }
}

class _DecadeBar extends StatelessWidget {
  const _DecadeBar({required this.model});

  final StripModel model;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SizedBox(
      height: 3,
      child: Row(
        children: [
          for (var d = 1; d <= 5; d++) ...[
            if (d > 1) const SizedBox(width: 4),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(1.5),
                child: ColoredBox(
                  color: scheme.outlineVariant,
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: FractionallySizedBox(
                      widthFactor:
                          (model.decade > d
                                  ? 1.0
                                  : (model.decade == d ? model.fraction : 0.0))
                              .clamp(0.0, 1.0),
                      heightFactor: 1,
                      child: ColoredBox(color: scheme.primary),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _DotsPainter extends CustomPainter {
  _DotsPainter({
    required this.model,
    required this.done,
    required this.todo,
    required this.ring,
  });

  final StripModel model;
  final Color done;
  final Color todo;
  final Color ring;

  @override
  void paint(Canvas canvas, Size size) {
    final n = model.beads.length;
    if (n == 0 || size.width <= 0) return;
    final slot = size.width / n;
    final r = (slot * 0.28).clamp(1.8, 3.6);
    final cy = size.height / 2;
    final fill = Paint();
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..color = ring;
    for (var i = 0; i < n; i++) {
      final cx = slot * (i + 0.5);
      final large = model.beads[i] == StripBead.large;
      final isDone = i <= model.current;
      fill.color = isDone ? done : todo;
      if (large) {
        final half = r * 1.25;
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromCenter(
              center: Offset(cx, cy),
              width: half * 2,
              height: half * 2,
            ),
            const Radius.circular(2),
          ),
          fill,
        );
      } else {
        canvas.drawCircle(Offset(cx, cy), r, fill);
      }
      if (i == model.current) {
        canvas.drawCircle(Offset(cx, cy), r * 2.1, stroke);
      }
    }
  }

  @override
  bool shouldRepaint(_DotsPainter old) =>
      old.model.current != model.current ||
      old.model.beads.length != model.beads.length ||
      old.done != done ||
      old.todo != todo ||
      old.ring != ring;
}
