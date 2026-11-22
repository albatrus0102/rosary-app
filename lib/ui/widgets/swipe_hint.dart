import 'package:flutter/material.dart';

import '../../app/settings.dart';
import '../../app/theme.dart';

/// 손가락이 아래로 미끄러지며 사라지는 되풀이 그림(약 1.4초). 터치를 받지 않고 글자 읽기 서비스에서도 뺀다.
///
/// '동작 줄이기'(시스템 애니메이션 제거)면 움직이지 않고 한 자리에 선다.
class SwipeFinger extends StatefulWidget {
  const SwipeFinger({super.key, this.size = 40, this.travel = 36, this.color});

  final double size;

  /// 위에서 아래로 움직이는 거리.
  final double travel;
  final Color? color;

  /// 되풀이 한 번의 길이.
  static const Duration loop = Duration(milliseconds: 1400);

  @override
  State<SwipeFinger> createState() => _SwipeFingerState();
}

class _SwipeFingerState extends State<SwipeFinger>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: SwipeFinger.loop,
  );
  bool _reduced = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduced = MediaQuery.disableAnimationsOf(context);
    if (reduced == _reduced && (_c.isAnimating || reduced)) return;
    _reduced = reduced;
    if (reduced) {
      _c.stop();
    } else {
      _c.repeat();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.color ?? Theme.of(context).colorScheme.onSurface;
    final icon = Icon(Icons.touch_app, size: widget.size, color: color);
    return ExcludeSemantics(
      child: IgnorePointer(
        child: SizedBox(
          width: widget.size,
          height: widget.size + widget.travel,
          child: _reduced
              // 움직이지 않을 때는 길 한가운데에 또렷하게.
              ? Align(alignment: Alignment.center, child: icon)
              : AnimatedBuilder(
                  animation: _c,
                  builder: (context, child) {
                    final t = _c.value;
                    final dy = Curves.easeInOut.transform(t) * widget.travel;
                    final opacity = t < 0.2
                        ? t / 0.2
                        : t > 0.75
                        ? (1 - t) / 0.25
                        : 1.0;
                    return Align(
                      alignment: Alignment.topCenter,
                      child: Transform.translate(
                        offset: Offset(0, dy),
                        child: Opacity(
                          opacity: opacity.clamp(0.0, 1.0),
                          child: child,
                        ),
                      ),
                    );
                  },
                  child: icon,
                ),
        ),
      ),
    );
  }
}

/// 묵주 영역 위에 얹는 '아래로 내리면 다음 기도' 안내. 터치를 막지 않는다.
///
/// [AppSettings.beadSwipeLearned]가 목표([AppSettings.beadSwipeGoal])에 닿으면 다시 나오지 않는다.
/// [compact]는 좁은 성당 카드(폭 104)용 두 줄 글.
class BeadSwipeHint extends StatelessWidget {
  const BeadSwipeHint({
    super.key,
    required this.settings,
    this.compact = false,
  });

  final AppSettings settings;
  final bool compact;

  static const String label = '아래로 내리면 다음 기도';
  static const String compactLabel = '아래로\n내리면 다음';

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: settings,
      builder: (context, _) {
        if (!settings.beadSwipeHintVisible) return const SizedBox.shrink();
        final theme = Theme.of(context);
        final scheme = theme.colorScheme;
        final fg = scheme.onInverseSurface;
        final textStyle =
            (compact ? theme.textTheme.labelMedium : theme.textTheme.labelLarge)
                ?.copyWith(color: fg, height: 1.25);
        return ExcludeSemantics(
          child: IgnorePointer(
            key: const ValueKey('bead-swipe-hint'),
            child: Align(
              alignment: compact ? Alignment.center : const Alignment(0, 0.35),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: scheme.inverseSurface.withValues(alpha: 0.82),
                  borderRadius: AppShape.large,
                ),
                child: Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: compact ? AppSpace.xs : AppSpace.sm,
                    vertical: AppSpace.xs,
                  ),
                  child: MediaQuery.withClampedTextScaling(
                    maxScaleFactor: 1.3,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SwipeFinger(
                          size: compact ? 28 : 40,
                          travel: compact ? 24 : 36,
                          color: fg,
                        ),
                        const SizedBox(height: AppSpace.xxs),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            compact ? compactLabel : label,
                            key: const ValueKey('bead-swipe-hint-label'),
                            textAlign: TextAlign.center,
                            style: textStyle,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
