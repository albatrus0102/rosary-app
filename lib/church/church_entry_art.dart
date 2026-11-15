import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// 성당 '입구' 화면의 그림 자산 슬롯과 대체 규칙(이 파일 한 곳에서만 정한다).
///
/// `assets/images/church_entry/` 아래:
///
/// | 파일 | 쓰는 곳 | 없으면 |
/// |---|---|---|
/// | `bg_glow.webp` | 성당 탭 머리말 오른쪽 위 배경 장식(스테인드글라스·빛 번짐) | 그리지 않는다 |
/// | `rail_decor.webp` | 넓은 화면 내비게이션 레일 아래 장식(아치·촛불·백합) | 그리지 않는다 |
/// | `hero_<성당 id>.webp` | 큰 카드의 대표 그림(내부, 16:9) | `render_<id>.webp` → `assets/church_thumbs/<id>.webp` → 성당 아이콘 |
/// | `thumb_<성당 id>.webp` | '다른 성당 고르기' 캐러셀 썸네일(외관, 4:3) | `assets/church_thumbs/<id>.webp` → `render_<id>.webp` → 성당 아이콘 |
/// | `render_<성당 id>.webp` | 우리 3D 성당을 찍은 내부 샷(`tools/church_web/entry_shots.mjs`) | — |
///
/// 그림을 바꾸려면 **같은 이름의 파일만 교체**하면 된다(가장자리 페이드는 앱이 그린다).
/// 새 성당이 카탈로그에 추가되면 그림이 없어도 3D 렌더 샷이나 아이콘으로 자동 대체된다.
abstract final class ChurchEntryArt {
  static const String dir = 'assets/images/church_entry';
  static const String background = '$dir/bg_glow.webp';
  static const String railDecor = '$dir/rail_decor.webp';

  /// 큰 카드 그림 후보(앞의 것부터).
  static List<String> heroCandidates(String id) => [
    '$dir/hero_$id.webp',
    '$dir/render_$id.webp',
    'assets/church_thumbs/$id.webp',
  ];

  /// 캐러셀 썸네일 후보(앞의 것부터).
  static List<String> thumbCandidates(String id) => [
    '$dir/thumb_$id.webp',
    'assets/church_thumbs/$id.webp',
    '$dir/render_$id.webp',
  ];

  static Set<String>? _assets;
  static Future<void>? _loading;

  /// 앱 번들에 든 자산 목록을 다 읽었는가.
  static bool get isLoaded => _assets != null;

  /// 앱 번들의 자산 목록을 한 번 읽는다(그 뒤로는 [pick]이 정확한 파일을 바로 고른다).
  static Future<void> load([AssetBundle? bundle]) =>
      _loading ??= _load(bundle ?? rootBundle);

  static Future<void> _load(AssetBundle bundle) async {
    try {
      final manifest = await AssetManifest.loadFromAssetBundle(bundle);
      _assets = manifest.listAssets().toSet();
    } on Object {
      // 목록을 못 읽으면(시험 환경 등) 마지막 후보로 그리고, 그것도 없으면 아이콘이 나온다.
      _assets = const {};
    }
  }

  /// [candidates] 가운데 번들에 있는 첫 파일. 목록을 아직 못 읽었거나 하나도 없으면 마지막 후보
  /// (가장 오래된 기본 그림)를 돌려준다. 그 파일도 없으면 [ChurchEntryImage]가 아이콘을 그린다.
  static String pick(List<String> candidates) {
    final assets = _assets;
    if (assets != null) {
      for (final c in candidates) {
        if (assets.contains(c)) return c;
      }
    }
    return candidates.last;
  }

  /// 번들에 [asset]이 있는가(목록을 읽기 전에는 true: 그려 보고 없으면 건너뛴다).
  static bool has(String asset) => _assets?.contains(asset) ?? true;

  /// 시험용: 읽어 둔 자산 목록을 버린다.
  @visibleForTesting
  static void debugReset() {
    _assets = null;
    _loading = null;
  }
}

/// 입구 화면의 성당 그림. [candidates] 가운데 있는 첫 파일을 그리고, 하나도 없으면 성당 아이콘.
class ChurchEntryImage extends StatelessWidget {
  const ChurchEntryImage({
    super.key,
    required this.candidates,
    this.semanticLabel,
    this.iconSize = 40,
  });

  final List<String> candidates;

  /// 그림 설명. null 이면 장식으로 보고 읽지 않는다.
  final String? semanticLabel;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Image.asset(
      ChurchEntryArt.pick(candidates),
      fit: BoxFit.cover,
      semanticLabel: semanticLabel,
      excludeFromSemantics: semanticLabel == null,
      // 다른 그림으로 바뀔 때 깜박이지 않게 이전 그림을 그대로 둔다.
      gaplessPlayback: true,
      errorBuilder: (context, _, _) => ColoredBox(
        color: scheme.secondaryContainer,
        child: Icon(
          Icons.church,
          size: iconSize,
          color: scheme.onSecondaryContainer,
          semanticLabel: semanticLabel,
        ),
      ),
    );
  }
}

/// 장식 그림(배경·레일). 없으면 아무것도 그리지 않고, 화면 낭독에서 뺀다.
class ChurchEntryDecor extends StatelessWidget {
  const ChurchEntryDecor({
    super.key,
    required this.asset,
    this.alignment = Alignment.center,
    this.opacity = 1,
  });

  final String asset;
  final Alignment alignment;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    if (!ChurchEntryArt.has(asset)) return const SizedBox.shrink();
    return ExcludeSemantics(
      child: IgnorePointer(
        child: Image.asset(
          asset,
          fit: BoxFit.cover,
          alignment: alignment,
          opacity: AlwaysStoppedAnimation(opacity),
          excludeFromSemantics: true,
          errorBuilder: (_, _, _) => const SizedBox.shrink(),
        ),
      ),
    );
  }
}
