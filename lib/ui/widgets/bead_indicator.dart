import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../app/rosary_style.dart';
import '../../domain/rosary_sequence.dart';

/// 현재 단의 구슬(매듭) 위치를 보여준다.
///
/// 단 안에서는 10개, 서두의 성모송에서는 3개, 그 밖에는 아무것도 보이지 않는다.
class BeadIndicator extends StatelessWidget {
  const BeadIndicator({super.key, required this.step, required this.style});

  final RosaryStep step;
  final RosaryStyle style;

  /// (구슬 수, 지난 구슬 수, 현재 구슬 번호 1-based 또는 null). 표시 안 함이면 null.
  static ({int count, int done, int? current})? layoutFor(RosaryStep step) {
    final decade = step.decade;
    if (decade != null) {
      if (step.kind == StepKind.hailMary && step.beadIndex != null) {
        return (count: 10, done: step.beadIndex! - 1, current: step.beadIndex);
      }
      // 주님의 기도(단 시작) -> 아직 시작 전, 영광송/구원송 -> 모두 지남.
      final finished =
          step.kind == StepKind.gloryBe || step.kind == StepKind.fatima;
      return (count: 10, done: finished ? 10 : 0, current: null);
    }
    if (step.kind == StepKind.hailMary && step.beadIndex != null) {
      return (count: 3, done: step.beadIndex! - 1, current: step.beadIndex);
    }
    if (step.kind == StepKind.gloryBe) {
      return (count: 3, done: 3, current: null);
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final layout = layoutFor(step);
    if (layout == null) return const SizedBox.shrink();
    final scheme = Theme.of(context).colorScheme;

    return LayoutBuilder(
      builder: (context, constraints) {
        const gap = 4.0;
        const arc = 8.0;
        final maxCell =
            (constraints.maxWidth - gap * (layout.count - 1)) / layout.count;
        final cell = maxCell.clamp(16.0, 40.0);
        return Semantics(
          label: layout.current != null
              ? '${layout.count}개 중 ${layout.current}번째 구슬'
              : '구슬 ${layout.count}개',
          child: SizedBox(
            height: cell + arc,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (var i = 1; i <= layout.count; i++) ...[
                  if (i > 1) const SizedBox(width: gap),
                  // 가운데가 살짝 위로 올라오는 완만한 호.
                  Padding(
                    padding: EdgeInsets.only(
                      bottom:
                          arc * math.sin(math.pi * (i - 0.5) / layout.count),
                    ),
                    child: _bead(i, layout, cell, scheme),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _bead(
    int i,
    ({int count, int done, int? current}) layout,
    double cell,
    ColorScheme scheme,
  ) {
    final isCurrent = i == layout.current;
    final isDone = i <= layout.done;
    final Color fill;
    if (isCurrent) {
      fill = scheme.primaryContainer;
    } else if (isDone) {
      fill = scheme.secondaryContainer;
    } else {
      fill = scheme.surfaceContainer;
    }
    return SizedBox(
      key: ValueKey('bead_$i'),
      width: cell,
      height: cell,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: EdgeInsets.all(cell * 0.12),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: fill,
          border: Border.all(
            color: isCurrent
                ? scheme.primary
                : isDone
                ? scheme.secondary.withValues(alpha: 0.5)
                : Colors.transparent,
            width: isCurrent ? 2 : 1,
          ),
        ),
        child: Opacity(
          opacity: isCurrent ? 1 : (isDone ? 0.85 : 0.4),
          child: Image.asset(style.unitImage, fit: BoxFit.contain),
        ),
      ),
    );
  }
}
