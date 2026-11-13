import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../app/settings.dart';
import '../app/theme.dart';
import 'glass_catalog.dart';

/// 창 사진 뒤에 까는 어두운 중성 돌 바탕. 창의 투명 윤곽(알파)이 그대로 보이게 한다.
/// 밝은 테마에서도 같은 색을 써서 색 판단이 흔들리지 않게 한다.
const Color kGlassStone = Color(0xFF1C1C1E);

/// 감상 화면 위에 올리는 글자·아이콘 색.
const Color kGlassOnStone = Color(0xFFF2F2F4);

/// 감상 화면(사진·3D 위) 덮개 UI 의 M3 테마: 앱 밝기와 상관없이 **어두운 앱 테마**를 쓴다.
///
/// 사진 위 조작부는 하드코딩한 검정 반투명·흰 글자 대신 이 테마의 색 역할(onSurface,
/// surfaceContainerHigh, secondaryContainer, scrim)을 쓴다. 기기 색(Material You)을 쓰는
/// 중이면 그 primary 를 시드로 같은 계열의 어두운 구성을 만든다.
ThemeData glassViewerTheme(BuildContext context) {
  final t = Theme.of(context);
  if (t.brightness == Brightness.dark) return t;
  final font = t.textTheme.bodyMedium?.fontFamily == AppTheme.sansFamily
      ? PrayerFont.gothic
      : PrayerFont.system;
  final seed = AppTheme.seedScheme(Brightness.light);
  final dynamicScheme = t.colorScheme.primary == seed.primary
      ? null
      : ColorScheme.fromSeed(
          seedColor: t.colorScheme.primary,
          brightness: Brightness.dark,
        );
  return AppTheme.dark(dynamicScheme: dynamicScheme, font: font);
}

/// [child] 를 감상 화면용 어두운 M3 테마로 감싼다([glassViewerTheme]).
class GlassViewerTheme extends StatelessWidget {
  const GlassViewerTheme({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) =>
      Theme(data: glassViewerTheme(context), child: child);
}

/// 사진 위 글자 보호용 그러데이션(M3 scrim 역할). [strength] 는 가장 짙은 쪽 불투명도.
LinearGradient glassScrim(
  ColorScheme scheme, {
  required AlignmentGeometry from,
  double strength = 0.8,
}) {
  final begin = from;
  final end = from == Alignment.topCenter
      ? Alignment.bottomCenter
      : Alignment.topCenter;
  return LinearGradient(
    begin: begin,
    end: end,
    colors: [
      scheme.scrim.withValues(alpha: strength),
      scheme.scrim.withValues(alpha: 0),
    ],
  );
}

/// 창 사진을 그릴 칸(논리 크기)에 필요한 디코드 한계(기기 픽셀). 칸 안에 맞춰(contain)
/// 그리므로 가로·세로 둘 다 이 값을 넘는 픽셀은 화면에 쓰이지 않는다.
Size glassCacheBox(Size logicalBox, double devicePixelRatio) => Size(
  math.max(1, (logicalBox.width * devicePixelRatio).ceil()).toDouble(),
  math.max(1, (logicalBox.height * devicePixelRatio).ceil()).toDouble(),
);

/// [source](파일의 픽셀 크기)를 [box](기기 픽셀) 안에 맞춰 디코드할 때의 크기.
/// 원본보다 키우지 않는다([ResizeImagePolicy.fit] + `allowUpscaling: false`와 같은 규칙).
/// 화면이 디코드하는 픽셀 양을 시험·보고에서 계산하는 데 쓴다.
Size glassDecodedSize(Size source, Size box) {
  if (source.isEmpty) return source;
  final scale = math.min(
    1.0,
    math.min(box.width / source.width, box.height / source.height),
  );
  return Size(
    math.max(1, (source.width * scale).round()).toDouble(),
    math.max(1, (source.height * scale).round()).toDouble(),
  );
}

/// 창 사진(번들 WebP, 알파 포함)을 돌 바탕 위에 보여 준다.
///
/// [cacheBox](기기 픽셀)를 주면 그 칸 안에 들어가는 크기로만 디코드한다. 원본보다 크게는
/// 디코드하지 않는다. 예전에는 `cacheWidth`(칸의 폭)만 넘겨서, 세로로 긴 창은 원본보다
/// 몇 배 큰 그림으로 '확대 디코드'되어 메모리·시간을 낭비했다.
class GlassPicture extends StatelessWidget {
  const GlassPicture({
    super.key,
    required this.path,
    this.cacheBox,
    this.fit = BoxFit.contain,
    this.opacity = 1,
  });

  final String path;

  /// 디코드 한계(기기 픽셀, [glassCacheBox]). null이면 파일 크기 그대로 디코드한다.
  final Size? cacheBox;
  final BoxFit fit;
  final double opacity;

  /// 이 위젯이 쓰는 이미지 공급자(시험에서도 같은 규칙을 확인한다).
  static ImageProvider providerFor(String path, Size? cacheBox) {
    final asset = AssetImage(path);
    if (cacheBox == null) return asset;
    return ResizeImage(
      asset,
      width: cacheBox.width.round(),
      height: cacheBox.height.round(),
      policy: ResizeImagePolicy.fit,
      allowUpscaling: false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Image(
      image: providerFor(path, cacheBox),
      fit: fit,
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
      // 사진 위: 불투명 표면 역할(어두운 감상 테마 기준이 아니어도 대비가 유지되는 inverse 쌍).
      bg = scheme.brightness == Brightness.dark
          ? scheme.surfaceContainerHigh
          : scheme.inverseSurface;
      fg = scheme.brightness == Brightness.dark
          ? scheme.onSurface
          : scheme.onInverseSurface;
    } else {
      bg = authentic ? scheme.primaryContainer : scheme.secondaryContainer;
      fg = authentic ? scheme.onPrimaryContainer : scheme.onSecondaryContainer;
    }
    return DecoratedBox(
      decoration: BoxDecoration(color: bg, borderRadius: AppShape.extraSmall),
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
                // M3 label small(11sp) 역할.
                style: Theme.of(context).textTheme.labelSmall
                    ?.copyWith(color: fg, height: 1.2),
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
    return w.shape == GlassForm.rose
        ? '지름 $approx${m(wd)}m'
        : '가로 $approx${m(wd)}m';
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
