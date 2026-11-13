import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../domain/mystery_art.dart';
import 'single_art_image.dart';

/// 기도 화면 배경: 그 단의 성화를 화면에 채워 깔고, 그 위를 표면색 막(scrim)으로 덮어 대비를 낮춘다.
///
/// - 막의 불투명도는 [prayerScrimAlpha]가 정한다: 그림이 어느 색이든(밝은 테마는 검정, 어두운 테마는 흰색이
///   가장 나쁜 경우) 화면 위 글자 역할(onSurface·onSurfaceVariant·primary·secondary)의 대비가 WCAG AA 4.5:1 이상.
///   그래서 그림은 은은하게만 비치고 기도문을 가리지 않는다(글자 위에 그림이 올라오는 일은 없다: 그림은 맨 아래 층).
/// - 그림은 한 장만, 화면 폭에 맞춰(최대 720px) 디코드하고 단이 바뀌면 앞 그림을 캐시에서 내린다.
/// - 움직임 없음(정지 그림). 새 그림이 짧게 나타나는 것도 '동작 줄이기'에서는 바로 바뀐다.
class PrayerBackground extends StatelessWidget {
  const PrayerBackground({
    super.key,
    required this.art,
    required this.child,
    this.enabled = true,
  });

  final MysteryArt art;
  final Widget child;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    if (!enabled) return child;
    final scheme = Theme.of(context).colorScheme;
    final width = MediaQuery.sizeOf(context).width;
    return Stack(
      fit: StackFit.expand,
      children: [
        Positioned.fill(
          child: ExcludeSemantics(
            child: RepaintBoundary(
              child: SingleArtImage(
                key: const ValueKey('prayer-bg-image'),
                asset: art.asset,
                decodeWidth: SingleArtImage.decodeWidthFor(context, width, 720),
                alignment: Alignment(art.fx * 2 - 1, art.fy * 2 - 1),
              ),
            ),
          ),
        ),
        Positioned.fill(
          child: ColoredBox(
            key: const ValueKey('prayer-bg-scrim'),
            color: scheme.surface.withValues(alpha: prayerScrimAlpha(scheme)),
          ),
        ),
        child,
      ],
    );
  }
}

/// 표면색 막의 불투명도: 최악의 그림 화소 위에서도 글자 역할 4가지의 대비가 [minContrast] 이상이 되는
/// 가장 작은 값(0.72 이상: 그림은 늘 은은하게).
double prayerScrimAlpha(ColorScheme scheme, {double minContrast = 4.5}) {
  final light = scheme.brightness == Brightness.light;
  final worst = light ? const Color(0xFF000000) : const Color(0xFFFFFFFF);
  final roles = [
    scheme.onSurface,
    scheme.onSurfaceVariant,
    scheme.primary,
    scheme.secondary,
  ];
  for (var i = 72; i <= 98; i++) {
    final a = i / 100;
    final bg = Color.alphaBlend(scheme.surface.withValues(alpha: a), worst);
    if (roles.every((c) => contrastRatio(c, bg) >= minContrast)) return a;
  }
  return 0.98;
}

/// WCAG 2 대비(1..21).
double contrastRatio(Color a, Color b) {
  final la = a.computeLuminance(), lb = b.computeLuminance();
  return (math.max(la, lb) + 0.05) / (math.min(la, lb) + 0.05);
}
