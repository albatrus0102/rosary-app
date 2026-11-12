import 'glass_catalog.dart';

/// 갤러리 필터 종류. 분석 `glass_filter{kind}`의 값과 같은 이름이다.
enum GlassFilterKind {
  church('church', '성당'),
  era('era', '시대'),
  shape('shape', '형태'),
  color('color', '색감');

  const GlassFilterKind(this.key, this.label);
  final String key;
  final String label;
}

/// 켠 필터 값. 같은 종류 안에서는 하나라도 맞으면(OR), 종류끼리는 모두 맞아야(AND) 보인다.
class GlassFilters {
  const GlassFilters({
    this.sites = const {},
    this.eras = const {},
    this.shapes = const {},
    this.colors = const {},
  });

  /// 소재지 이름([GlassWindow.site]).
  final Set<String> sites;
  final Set<GlassEra> eras;
  final Set<GlassForm> shapes;
  final Set<GlassColorTag> colors;

  bool get isEmpty =>
      sites.isEmpty && eras.isEmpty && shapes.isEmpty && colors.isEmpty;

  int get count => sites.length + eras.length + shapes.length + colors.length;

  int countOf(GlassFilterKind k) => switch (k) {
    GlassFilterKind.church => sites.length,
    GlassFilterKind.era => eras.length,
    GlassFilterKind.shape => shapes.length,
    GlassFilterKind.color => colors.length,
  };

  bool matches(GlassWindow w) {
    if (sites.isNotEmpty && !sites.contains(w.site)) return false;
    if (eras.isNotEmpty && !eras.contains(w.era)) return false;
    if (shapes.isNotEmpty && !shapes.contains(w.shape)) return false;
    if (colors.isNotEmpty && w.colors.intersection(colors).isEmpty) {
      return false;
    }
    return true;
  }

  List<GlassWindow> apply(Iterable<GlassWindow> all) => [
    for (final w in all)
      if (matches(w)) w,
  ];

  GlassFilters copyWith({
    Set<String>? sites,
    Set<GlassEra>? eras,
    Set<GlassForm>? shapes,
    Set<GlassColorTag>? colors,
  }) => GlassFilters(
    sites: sites ?? this.sites,
    eras: eras ?? this.eras,
    shapes: shapes ?? this.shapes,
    colors: colors ?? this.colors,
  );

  /// 활성 필터를 (종류, 표시 이름, 분석 값) 목록으로.
  List<GlassActiveFilter> get active => [
    for (final s in sites)
      GlassActiveFilter(GlassFilterKind.church, s, glassSiteKey(s)),
    for (final e in eras) GlassActiveFilter(GlassFilterKind.era, e.label, e.name),
    for (final f in shapes)
      GlassActiveFilter(GlassFilterKind.shape, f.label, f.name),
    for (final c in colors)
      GlassActiveFilter(GlassFilterKind.color, c.label, c.name),
  ];

  /// [kind]의 값 하나를 끄고 켠 새 필터. 표시 이름 [label]로 가리킨다.
  GlassFilters toggled(GlassFilterKind kind, Object value) {
    Set<T> flip<T>(Set<T> s, T v) {
      final n = {...s};
      if (!n.remove(v)) n.add(v);
      return n;
    }

    return switch (kind) {
      GlassFilterKind.church => copyWith(sites: flip(sites, value as String)),
      GlassFilterKind.era => copyWith(eras: flip(eras, value as GlassEra)),
      GlassFilterKind.shape => copyWith(shapes: flip(shapes, value as GlassForm)),
      GlassFilterKind.color =>
        copyWith(colors: flip(colors, value as GlassColorTag)),
    };
  }

  GlassFilters without(GlassActiveFilter f) {
    return switch (f.kind) {
      GlassFilterKind.church =>
        copyWith(sites: {...sites}..remove(f.label)),
      GlassFilterKind.era => copyWith(
        eras: {...eras}..removeWhere((e) => e.name == f.value),
      ),
      GlassFilterKind.shape => copyWith(
        shapes: {...shapes}..removeWhere((e) => e.name == f.value),
      ),
      GlassFilterKind.color => copyWith(
        colors: {...colors}..removeWhere((e) => e.name == f.value),
      ),
    };
  }
}

class GlassActiveFilter {
  const GlassActiveFilter(this.kind, this.label, this.value);
  final GlassFilterKind kind;

  /// 화면에 보이는 이름.
  final String label;

  /// 분석에 보내는 영문 키.
  final String value;
}
