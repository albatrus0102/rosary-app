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
    final primary = Theme.of(context).colorScheme.primary;

    return LayoutBuilder(
      builder: (context, constraints) {
        const gap = 4.0;
        final maxCell =
            (constraints.maxWidth - gap * (layout.count - 1)) / layout.count;
        final cell = maxCell.clamp(16.0, 44.0);
        return Semantics(
          label: layout.current != null
              ? '${layout.count}개 중 ${layout.current}번째 구슬'
              : '구슬 ${layout.count}개',
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 1; i <= layout.count; i++) ...[
                if (i > 1) const SizedBox(width: gap),
                _bead(i, layout, cell, primary),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _bead(
    int i,
    ({int count, int done, int? current}) layout,
    double cell,
    Color primary,
  ) {
    final isCurrent = i == layout.current;
    final isDone = i <= layout.done;
    final opacity = isCurrent ? 1.0 : (isDone ? 0.5 : 0.25);
    return Opacity(
      opacity: opacity,
      child: Container(
        key: ValueKey('bead_$i'),
        width: cell,
        height: cell,
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isCurrent ? primary : Colors.transparent,
            width: 2,
          ),
        ),
        child: Image.asset(style.unitImage, fit: BoxFit.contain),
      ),
    );
  }
}
