import 'package:flutter/material.dart';

import 'glass_catalog.dart';

/// 창 사진 뒤에 까는 어두운 중성 돌 바탕. 창의 투명 윤곽(알파)이 그대로 보이게 한다.
/// 밝은 테마에서도 같은 색을 써서 색 판단이 흔들리지 않게 한다.
const Color kGlassStone = Color(0xFF1C1C1E);

/// 감상 화면 위에 올리는 글자·아이콘 색.
const Color kGlassOnStone = Color(0xFFF2F2F4);

/// 창 사진(번들 WebP, 알파 포함)을 돌 바탕 위에 보여 준다. [cacheWidth]는 논리 폭 × 화면 배율로
/// 디코드 크기를 줄여 목록이 부드럽게 넘어가게 한다.
class GlassPicture extends StatelessWidget {
  const GlassPicture({
    super.key,
    required this.path,
    this.cacheWidth,
    this.fit = BoxFit.contain,
    this.opacity = 1,
  });

  final String path;
  final int? cacheWidth;
  final BoxFit fit;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      path,
      fit: fit,
      cacheWidth: cacheWidth,
      filterQuality: FilterQuality.medium,
      gaplessPlayback: true,
      excludeFromSemantics: true,
      opacity: opacity >= 1 ? null : AlwaysStoppedAnimation(opacity),
      errorBuilder: (_, _, _) => const Center(
        child: Icon(Icons.broken_image_outlined, color: kGlassOnStone),
      ),
    );
  }
}

/// '원래 자리'/'참고 배치' 배지(진본·참고 구분, GLASS_APP_PLAN §5).
class GlassPlacementBadge extends StatelessWidget {
  const GlassPlacementBadge(this.kind, {super.key, this.onDark = false});

  final GlassPlacementKind kind;

  /// 사진 위(어두운 바탕)에 올릴 때 true.
  final bool onDark;

  static String labelOf(GlassPlacementKind k) =>
      k == GlassPlacementKind.authentic ? '원래 자리' : '참고 배치';

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final authentic = kind == GlassPlacementKind.authentic;
    final Color bg;
    final Color fg;
    if (onDark) {
      bg = Colors.black.withValues(alpha: 0.62);
      fg = kGlassOnStone;
    } else {
      bg = authentic ? scheme.primaryContainer : scheme.secondaryContainer;
      fg = authentic ? scheme.onPrimaryContainer : scheme.onSecondaryContainer;
    }
    return DecoratedBox(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              authentic ? Icons.place_outlined : Icons.compare_arrows,
              size: 13,
              color: fg,
            ),
            const SizedBox(width: 3),
            Flexible(
              child: Text(
                labelOf(kind),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  height: 1.2,
                  color: fg,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// '지름 약 10.5m' 같은 실제 크기 문구. 모르면 '크기 미확인'.
String glassSizeText(GlassWindow w) {
  final s = w.size;
  String m(double v) {
    final t = v.toStringAsFixed(2);
    return t.replaceFirst(RegExp(r'\.?0+$'), '');
  }

  if (s.isUnknown) return '크기 미확인';
  final approx = s.isKnown && w.sizeMismatch == null ? '' : '약 ';
  final wd = s.width, ht = s.height;
  if (wd != null && ht != null) {
    if (wd == ht && w.shape == GlassForm.rose) return '지름 $approx${m(wd)}m';
    return '가로 $approx${m(wd)}m × 세로 ${m(ht)}m';
  }
  if (wd != null) {
    return w.shape == GlassForm.rose ? '지름 $approx${m(wd)}m' : '가로 $approx${m(wd)}m';
  }
  return '높이 $approx${m(ht!)}m';
}

/// 크기를 확인해야 하는가(추정, 미확인, 사진 비율과 어긋남).
bool glassSizeNeedsCheck(GlassWindow w) =>
    w.size.isUnknown || !w.size.isKnown || w.sizeMismatch != null;

/// 형태 문구: '첨두창 (반원 아치)'.
String glassFormText(GlassWindow w) {
  final m = RegExp(r'\((.+)\)').firstMatch(w.form);
  final detail = m?.group(1)?.trim();
  final base = w.shape == GlassForm.other ? w.form : w.shape.label;
  return detail == null || detail.isEmpty ? base : '$base ($detail)';
}
