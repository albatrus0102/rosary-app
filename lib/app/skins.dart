/// 앱 전체 스킨(색 테마) 레지스트리·토큰·대비 검사·날짜 문(독서공방 스킨 체계를 Flutter로 옮긴 것).
///
/// - **새 스킨 = [kSkins]에 항목 하나**: id, 한국어 이름, 밝게/어둡게 [SkinTokens], 미리보기 그림 색([SkinArt]),
///   선택 사항으로 공개 기간([SkinWindow])과 새 스킨 표시([AppSkin.isNew]).
/// - 모든 색은 토큰 일곱 자리(배경·카드·글자·보조 글자·강조·금빛 장식·경고)를 거친다. 나머지 M3 색 역할은
///   [deriveSkinScheme]이 토큰에서 만든다(독서공방 `skinDerive`와 같은 생각: 고른 색에서 나머지를 유도한다).
/// - 글자 대비(WCAG AA 4.5:1, 비텍스트 3:1)는 [skinContrastIssues]가 잰다. 내장 스킨은 시험이,
///   '내가 만든' 스킨은 만들기 화면과 저장 단계가 같은 함수로 막는다.
/// - 날짜 문(독서공방 `themeModeEff`): 공개 기간 밖의 스킨은 목록에서 빠지고, **저장된 값은 그대로 두되**
///   화면은 기본으로 그린다([Skins.effectiveId]).
library;

import 'dart:convert';

import 'package:flutter/material.dart';

import '../domain/liturgical_season.dart';

/// 기본 스킨 id(현재의 상아색·갈색·금색).
const String kDefaultSkinId = 'default';

/// 토큰 자리 일곱.
enum SkinSlot {
  bg('배경', '화면 바탕'),
  box('카드', '카드·목록 바탕'),
  ink('글자', '본문 글자'),
  ink2('보조 글자', '설명·부제 글자'),
  accent('강조', '주 버튼·선택·링크'),
  gold('금빛 장식', '장식선·테두리'),
  danger('경고', '삭제·오류');

  const SkinSlot(this.labelKo, this.partsKo);
  final String labelKo;
  final String partsKo;
}

/// 한 밝기(밝게 또는 어둡게)의 색 토큰.
@immutable
class SkinTokens {
  const SkinTokens({
    required this.bg,
    required this.box,
    required this.ink,
    required this.ink2,
    required this.accent,
    required this.gold,
    required this.danger,
  });

  final Color bg;
  final Color box;
  final Color ink;
  final Color ink2;
  final Color accent;
  final Color gold;
  final Color danger;

  Color operator [](SkinSlot s) => switch (s) {
    SkinSlot.bg => bg,
    SkinSlot.box => box,
    SkinSlot.ink => ink,
    SkinSlot.ink2 => ink2,
    SkinSlot.accent => accent,
    SkinSlot.gold => gold,
    SkinSlot.danger => danger,
  };

  SkinTokens withSlot(SkinSlot s, Color c) => SkinTokens(
    bg: s == SkinSlot.bg ? c : bg,
    box: s == SkinSlot.box ? c : box,
    ink: s == SkinSlot.ink ? c : ink,
    ink2: s == SkinSlot.ink2 ? c : ink2,
    accent: s == SkinSlot.accent ? c : accent,
    gold: s == SkinSlot.gold ? c : gold,
    danger: s == SkinSlot.danger ? c : danger,
  );

  /// 배경이 어두운가(상대 휘도 0.4 미만 → 어두운 스킨).
  bool get isDark => bg.computeLuminance() < 0.4;

  Map<String, String> toJson() => {
    for (final s in SkinSlot.values) s.name: colorHex(this[s]),
  };

  /// 일곱 자리가 모두 `#rrggbb`일 때만 만든다(깨진 값은 null).
  static SkinTokens? fromJson(Object? v) {
    if (v is! Map) return null;
    final out = <SkinSlot, Color>{};
    for (final s in SkinSlot.values) {
      final c = parseHex(v[s.name]);
      if (c == null) return null;
      out[s] = c;
    }
    return SkinTokens(
      bg: out[SkinSlot.bg]!,
      box: out[SkinSlot.box]!,
      ink: out[SkinSlot.ink]!,
      ink2: out[SkinSlot.ink2]!,
      accent: out[SkinSlot.accent]!,
      gold: out[SkinSlot.gold]!,
      danger: out[SkinSlot.danger]!,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is SkinTokens &&
      other.bg == bg &&
      other.box == box &&
      other.ink == ink &&
      other.ink2 == ink2 &&
      other.accent == accent &&
      other.gold == gold &&
      other.danger == danger;

  @override
  int get hashCode => Object.hash(bg, box, ink, ink2, accent, gold, danger);
}

/// `#rrggbb`(소문자).
String colorHex(Color c) =>
    '#${(c.toARGB32() & 0xFFFFFF).toRadixString(16).padLeft(6, '0')}';

/// `#rrggbb` → 불투명 색. 모양이 맞지 않으면 null.
Color? parseHex(Object? v) {
  if (v is! String) return null;
  final m = RegExp(r'^#([0-9a-fA-F]{6})$').firstMatch(v.trim());
  if (m == null) return null;
  return Color(0xFF000000 | int.parse(m.group(1)!, radix: 16));
}

/// 선택 카드의 그림(작은 묵주 장면)에 쓰는 네 색. 토큰과 따로 두어 카드가 스킨의 인상을 고르게 한다.
@immutable
class SkinArt {
  const SkinArt(this.top, this.bottom, this.beads, this.ink);

  /// 바탕 위쪽·아래쪽(세로 그라데이션).
  final Color top;
  final Color bottom;

  /// 묵주 알·십자가 색.
  final Color beads;

  /// 아래 바·획 색.
  final Color ink;

  static SkinArt fromTokens(SkinTokens t) =>
      SkinArt(t.bg, t.box, t.accent, t.ink);
}

/// 스킨이 열리는 기간.
abstract class SkinWindow {
  const SkinWindow(this.labelKo);

  /// 사람에게 보이는 이름(예: '대림 시기').
  final String labelKo;

  /// [now](순간)가 속한 한국 날짜가 이 기간 안인가.
  bool contains(DateTime now);

  /// [now] 뒤로 처음 열리는 날(이미 열려 있으면 null). 안내 문구용.
  DateTime? nextOpen(DateTime now) {
    var d = kstDate(now);
    if (contains(d)) return null;
    for (var i = 0; i < 800; i++) {
      d = DateTime(d.year, d.month, d.day + 1);
      if (contains(d)) return d;
    }
    return null;
  }
}

/// 전례 시기로 정하는 기간(한국 전례력, `lib/domain/liturgical_season.dart`).
class SeasonWindow extends SkinWindow {
  const SeasonWindow(super.labelKo, this.seasons);
  final Set<LiturgicalSeason> seasons;

  @override
  bool contains(DateTime now) =>
      seasons.contains(LiturgicalDay.of(kstDate(now)).season);
}

/// 날짜로 정하는 기간: [from] 0시 KST 이상, [until] 0시 KST 미만(없으면 열려 있음).
class DateWindow extends SkinWindow {
  const DateWindow(super.labelKo, {this.from, this.until});
  final DateTime? from;
  final DateTime? until;

  @override
  bool contains(DateTime now) {
    final d = kstDate(now);
    if (from != null && d.isBefore(kstDate(from!))) return false;
    if (until != null && !d.isBefore(kstDate(until!))) return false;
    return true;
  }
}

/// 스킨 묶음(고르기 시트의 탭).
enum SkinGroup {
  basic('기본'),
  season('계절'),
  custom('내가 만든');

  const SkinGroup(this.labelKo);
  final String labelKo;
}

/// 스킨 한 벌. [light]·[dark] 중 하나만 있으면 그 밝기로 고정된다(밤 성당 등).
@immutable
class AppSkin {
  const AppSkin({
    required this.id,
    required this.nameKo,
    required this.art,
    this.light,
    this.dark,
    this.group = SkinGroup.basic,
    this.window,
    this.isNew = false,
    this.builtin = false,
  }) : assert(light != null || dark != null);

  final String id;
  final String nameKo;
  final SkinTokens? light;
  final SkinTokens? dark;
  final SkinArt art;
  final SkinGroup group;

  /// 공개 기간. null이면 늘 열려 있다.
  final SkinWindow? window;

  /// 새 스킨(본 적 없으면 빨간 점).
  final bool isNew;

  /// true면 [AppTheme]의 손으로 정한 상아색·갈색·금색 구성을 그대로 쓴다(토큰은 미리보기·만들기 시작 색용).
  final bool builtin;

  bool get isDefault => id == kDefaultSkinId;

  /// 기기 밝기를 따르지 않고 고정되는 밝기(양쪽 토큰이 다 있으면 null).
  Brightness? get fixedBrightness => light == null
      ? Brightness.dark
      : dark == null
      ? Brightness.light
      : null;

  /// [system] 밝기에서 실제로 쓰는 토큰과 그 밝기.
  (SkinTokens, Brightness) resolve(Brightness system) {
    final fixed = fixedBrightness;
    final b = fixed ?? system;
    return (b == Brightness.dark ? dark! : light!, b);
  }

  /// MaterialApp.themeMode.
  ThemeMode get themeMode => switch (fixedBrightness) {
    Brightness.light => ThemeMode.light,
    Brightness.dark => ThemeMode.dark,
    null => ThemeMode.system,
  };

  bool isOpen(DateTime now) => window?.contains(now) ?? true;
}

/// 사용자가 만든 스킨(토큰 한 벌, 밝기는 배경에서 정해진다).
@immutable
class CustomSkin {
  const CustomSkin({
    required this.id,
    required this.name,
    required this.tokens,
  });

  final String id;
  final String name;
  final SkinTokens tokens;

  static const int maxNameLength = 12;

  AppSkin toSkin() => AppSkin(
    id: id,
    nameKo: name,
    group: SkinGroup.custom,
    light: tokens.isDark ? null : tokens,
    dark: tokens.isDark ? tokens : null,
    art: SkinArt.fromTokens(tokens),
  );

  Map<String, Object?> toJson() => {
    'id': id,
    'name': name,
    'tokens': tokens.toJson(),
  };

  static CustomSkin? fromJson(Object? v) {
    if (v is! Map) return null;
    final id = v['id'];
    final name = v['name'];
    final t = SkinTokens.fromJson(v['tokens']);
    if (id is! String ||
        !id.startsWith(customIdPrefix) ||
        name is! String ||
        t == null) {
      return null;
    }
    final n = name.trim();
    if (n.isEmpty) return null;
    return CustomSkin(
      id: id,
      name: n.length > maxNameLength ? n.substring(0, maxNameLength) : n,
      tokens: t,
    );
  }

  static const customIdPrefix = 'custom-';
}

/// 저장 문자열(JSON 배열) ↔ 만든 스킨 목록. 깨진 항목은 버린다.
List<CustomSkin> decodeCustomSkins(String? s) {
  if (s == null || s.isEmpty) return const [];
  try {
    final v = jsonDecode(s);
    if (v is! List) return const [];
    final out = <CustomSkin>[];
    final ids = <String>{};
    for (final e in v) {
      final c = CustomSkin.fromJson(e);
      if (c != null && ids.add(c.id)) out.add(c);
    }
    return out;
  } on FormatException {
    return const [];
  }
}

String encodeCustomSkins(List<CustomSkin> list) =>
    jsonEncode([for (final c in list) c.toJson()]);

// ───────────────────────── 레지스트리 ─────────────────────────

/// 시기 창: 대림·성탄·사순(+성삼일)·부활.
const _advent = SeasonWindow('대림 시기', {LiturgicalSeason.advent});
const _christmas = SeasonWindow('성탄 시기', {LiturgicalSeason.christmas});
const _lent = SeasonWindow('사순 시기', {
  LiturgicalSeason.lent,
  LiturgicalSeason.triduum,
});
const _easter = SeasonWindow('부활 시기', {LiturgicalSeason.easter});

/// 스킨 목록. **새 스킨은 여기에 항목 하나를 더하면 된다**(순서가 고르기 시트의 순서).
const List<AppSkin> kSkins = [
  AppSkin(
    id: kDefaultSkinId,
    nameKo: '기본',
    builtin: true,
    light: SkinTokens(
      bg: Color(0xFFFBF2E8),
      box: Color(0xFFFFFCF8),
      ink: Color(0xFF2B1B11),
      ink2: Color(0xFF5B4634),
      accent: Color(0xFF5F3419),
      gold: Color(0xFFAE7A13),
      danger: Color(0xFFBA1A1A),
    ),
    dark: SkinTokens(
      bg: Color(0xFF1E130D),
      box: Color(0xFF2B1F19),
      ink: Color(0xFFF4E6D5),
      ink2: Color(0xFFD8C3AB),
      accent: Color(0xFFE7C46C),
      gold: Color(0xFFE7C46C),
      danger: Color(0xFFFFB4AB),
    ),
    art: SkinArt(
      Color(0xFFFBF2E8),
      Color(0xFFEBD9C2),
      Color(0xFFAE7A13),
      Color(0xFF5F3419),
    ),
  ),
  AppSkin(
    id: 'mary-blue',
    nameKo: '성모 하늘색',
    isNew: true,
    light: SkinTokens(
      bg: Color(0xFFEEF4FA),
      box: Color(0xFFFBFDFF),
      ink: Color(0xFF172637),
      ink2: Color(0xFF445970),
      accent: Color(0xFF2A5C94),
      gold: Color(0xFF8E6A12),
      danger: Color(0xFFB3261E),
    ),
    dark: SkinTokens(
      bg: Color(0xFF0F1A28),
      box: Color(0xFF1A2A3D),
      ink: Color(0xFFE8F0F8),
      ink2: Color(0xFFB7C6D8),
      accent: Color(0xFF9CC3EE),
      gold: Color(0xFFD9BE78),
      danger: Color(0xFFFFB4AB),
    ),
    art: SkinArt(
      Color(0xFFF5F9FD),
      Color(0xFFC9DDF1),
      Color(0xFF2A5C94),
      Color(0xFF172637),
    ),
  ),
  AppSkin(
    id: 'night-church',
    nameKo: '밤 성당',
    isNew: true,
    // 어두운 스킨(밝기 고정): 짙은 남색 + 촛불 금색.
    dark: SkinTokens(
      bg: Color(0xFF0B1226),
      box: Color(0xFF16203D),
      ink: Color(0xFFEDEBE4),
      ink2: Color(0xFFBDC3D6),
      accent: Color(0xFFE3C36F),
      gold: Color(0xFFE3C36F),
      danger: Color(0xFFFFB4AB),
    ),
    art: SkinArt(
      Color(0xFF0B1226),
      Color(0xFF1E2B52),
      Color(0xFFE3C36F),
      Color(0xFFEDEBE4),
    ),
  ),
  AppSkin(
    id: 'olive-garden',
    nameKo: '올리브 정원',
    isNew: true,
    light: SkinTokens(
      bg: Color(0xFFF1F2E6),
      box: Color(0xFFFCFDF6),
      ink: Color(0xFF22281A),
      ink2: Color(0xFF4E5740),
      accent: Color(0xFF4F6B2A),
      gold: Color(0xFF8C6D12),
      danger: Color(0xFFB3261E),
    ),
    dark: SkinTokens(
      bg: Color(0xFF14190F),
      box: Color(0xFF212918),
      ink: Color(0xFFE9EEDD),
      ink2: Color(0xFFBEC8AB),
      accent: Color(0xFFB5CD84),
      gold: Color(0xFFD8C070),
      danger: Color(0xFFFFB4AB),
    ),
    art: SkinArt(
      Color(0xFFF5F6EA),
      Color(0xFFD5DDB8),
      Color(0xFF4F6B2A),
      Color(0xFF22281A),
    ),
  ),
  AppSkin(
    id: 'rose',
    nameKo: '장미',
    isNew: true,
    light: SkinTokens(
      bg: Color(0xFFFAEEEE),
      box: Color(0xFFFFFAF9),
      ink: Color(0xFF2E1A1D),
      ink2: Color(0xFF5E4348),
      accent: Color(0xFF8E3350),
      gold: Color(0xFF94651D),
      danger: Color(0xFFB3261E),
    ),
    dark: SkinTokens(
      bg: Color(0xFF22121A),
      box: Color(0xFF331E28),
      ink: Color(0xFFF6E6E8),
      ink2: Color(0xFFD9BEC4),
      accent: Color(0xFFF0A6BA),
      gold: Color(0xFFE2BE7C),
      danger: Color(0xFFFFB4AB),
    ),
    art: SkinArt(
      Color(0xFFFCF3F2),
      Color(0xFFF0CDD3),
      Color(0xFF8E3350),
      Color(0xFF2E1A1D),
    ),
  ),
  AppSkin(
    id: 'parchment',
    nameKo: '양피지',
    isNew: true,
    light: SkinTokens(
      bg: Color(0xFFF1E6CC),
      box: Color(0xFFFBF4E0),
      ink: Color(0xFF33260F),
      ink2: Color(0xFF5E4A2A),
      accent: Color(0xFF7A4A12),
      gold: Color(0xFF8A5F0C),
      danger: Color(0xFFA8281C),
    ),
    dark: SkinTokens(
      bg: Color(0xFF211A0E),
      box: Color(0xFF30261A),
      ink: Color(0xFFEFE3C6),
      ink2: Color(0xFFD0BE98),
      accent: Color(0xFFDDB86A),
      gold: Color(0xFFDDB86A),
      danger: Color(0xFFFFB4AB),
    ),
    art: SkinArt(
      Color(0xFFF6EDD6),
      Color(0xFFE2D0A8),
      Color(0xFF7A4A12),
      Color(0xFF33260F),
    ),
  ),
  AppSkin(
    id: 'marble',
    nameKo: '대리석',
    isNew: true,
    light: SkinTokens(
      bg: Color(0xFFF1F3F5),
      box: Color(0xFFFFFFFF),
      ink: Color(0xFF1F252B),
      ink2: Color(0xFF4F5963),
      accent: Color(0xFF3F5566),
      gold: Color(0xFF7A6A44),
      danger: Color(0xFFB3261E),
    ),
    dark: SkinTokens(
      bg: Color(0xFF14181C),
      box: Color(0xFF212830),
      ink: Color(0xFFEAEEF2),
      ink2: Color(0xFFB8C1CA),
      accent: Color(0xFFA9BFD0),
      gold: Color(0xFFCDB98A),
      danger: Color(0xFFFFB4AB),
    ),
    art: SkinArt(
      Color(0xFFF7F8FA),
      Color(0xFFD9DEE3),
      Color(0xFF3F5566),
      Color(0xFF1F252B),
    ),
  ),
  // ── 전례 시기 스킨: 시기 안에만 나타난다(한국 전례력). 색은 절제해서 쓴다. ──
  AppSkin(
    id: 'advent-violet',
    nameKo: '대림 보라',
    group: SkinGroup.season,
    window: _advent,
    isNew: true,
    light: SkinTokens(
      bg: Color(0xFFF4EEF6),
      box: Color(0xFFFDFAFE),
      ink: Color(0xFF25182E),
      ink2: Color(0xFF54435F),
      accent: Color(0xFF5F3A7E),
      gold: Color(0xFF8C6A1E),
      danger: Color(0xFFB3261E),
    ),
    dark: SkinTokens(
      bg: Color(0xFF1A1222),
      box: Color(0xFF291D36),
      ink: Color(0xFFEFE6F5),
      ink2: Color(0xFFCDBCD9),
      accent: Color(0xFFCDB0EC),
      gold: Color(0xFFD9BC7A),
      danger: Color(0xFFFFB4AB),
    ),
    art: SkinArt(
      Color(0xFFF7F1F8),
      Color(0xFFDCCBE6),
      Color(0xFF5F3A7E),
      Color(0xFF25182E),
    ),
  ),
  AppSkin(
    id: 'lent-plum',
    nameKo: '사순 자주',
    group: SkinGroup.season,
    window: _lent,
    isNew: true,
    light: SkinTokens(
      bg: Color(0xFFF6EDEE),
      box: Color(0xFFFFFAFA),
      ink: Color(0xFF2A1519),
      ink2: Color(0xFF5B4046),
      accent: Color(0xFF7A2842),
      gold: Color(0xFF8C6A1E),
      danger: Color(0xFFB3261E),
    ),
    dark: SkinTokens(
      bg: Color(0xFF1F1115),
      box: Color(0xFF2F1B22),
      ink: Color(0xFFF4E4E7),
      ink2: Color(0xFFD6BCC2),
      accent: Color(0xFFE7A0B6),
      gold: Color(0xFFD4B676),
      danger: Color(0xFFFFB4AB),
    ),
    art: SkinArt(
      Color(0xFFF8F0F0),
      Color(0xFFE2C8CD),
      Color(0xFF7A2842),
      Color(0xFF2A1519),
    ),
  ),
  AppSkin(
    id: 'easter-gold',
    nameKo: '부활 흰금',
    group: SkinGroup.season,
    window: _easter,
    isNew: true,
    light: SkinTokens(
      bg: Color(0xFFFAF6EA),
      box: Color(0xFFFFFFFC),
      ink: Color(0xFF2B2410),
      ink2: Color(0xFF5C5230),
      accent: Color(0xFF7A5A00),
      gold: Color(0xFF8E6C00),
      danger: Color(0xFFB3261E),
    ),
    dark: SkinTokens(
      bg: Color(0xFF1D1A10),
      box: Color(0xFF2C2818),
      ink: Color(0xFFF7F0DA),
      ink2: Color(0xFFDDD2AA),
      accent: Color(0xFFF0D27A),
      gold: Color(0xFFF0D27A),
      danger: Color(0xFFFFB4AB),
    ),
    art: SkinArt(
      Color(0xFFFFFDF6),
      Color(0xFFF0E3B4),
      Color(0xFF8E6C00),
      Color(0xFF2B2410),
    ),
  ),
  AppSkin(
    id: 'christmas-gold-red',
    nameKo: '성탄 금홍',
    group: SkinGroup.season,
    window: _christmas,
    isNew: true,
    light: SkinTokens(
      bg: Color(0xFFF8EFE4),
      box: Color(0xFFFFFBF5),
      ink: Color(0xFF2B1812),
      ink2: Color(0xFF5F4235),
      accent: Color(0xFF9A2A22),
      gold: Color(0xFF8C6410),
      danger: Color(0xFFB3261E),
    ),
    dark: SkinTokens(
      bg: Color(0xFF1F1210),
      box: Color(0xFF2E1D19),
      ink: Color(0xFFF6E8DA),
      ink2: Color(0xFFDABFAB),
      accent: Color(0xFFF0A090),
      gold: Color(0xFFE4C070),
      danger: Color(0xFFFFB4AB),
    ),
    art: SkinArt(
      Color(0xFFFAF1E6),
      Color(0xFFE8CFB4),
      Color(0xFF9A2A22),
      Color(0xFF2B1812),
    ),
  ),
];

/// 스킨 조회·날짜 문. 시험은 [now]를 넣어 문 앞뒤를 모두 잰다.
abstract final class Skins {
  /// 내장 스킨 + 만든 스킨 전부(공개 기간과 상관없이).
  static List<AppSkin> all([List<CustomSkin> customs = const []]) => [
    ...kSkins,
    for (final c in customs) c.toSkin(),
  ];

  static AppSkin? find(String id, [List<CustomSkin> customs = const []]) {
    for (final s in all(customs)) {
      if (s.id == id) return s;
    }
    return null;
  }

  static AppSkin byId(String id, [List<CustomSkin> customs = const []]) =>
      find(id, customs) ?? kSkins.first;

  /// [now]에 고를 수 있는 스킨(날짜 문 안쪽). 순서는 레지스트리 순서.
  static List<AppSkin> visible(
    DateTime now, [
    List<CustomSkin> customs = const [],
  ]) => [
    for (final s in all(customs))
      if (s.isOpen(now)) s,
  ];

  static List<AppSkin> visibleIn(
    SkinGroup g,
    DateTime now, [
    List<CustomSkin> customs = const [],
  ]) => [
    for (final s in visible(now, customs))
      if (s.group == g) s,
  ];

  /// 날짜 문을 거친 실제 스킨 id(독서공방 `themeModeEff`): 모르는 값·아직 안 열린(또는 닫힌) 스킨은 기본.
  /// **저장된 값은 건드리지 않는다**(호출한 쪽이 그대로 둔다).
  static String effectiveId(
    String? stored,
    DateTime now, [
    List<CustomSkin> customs = const [],
  ]) {
    final s = find(stored ?? kDefaultSkinId, customs);
    return s != null && s.isOpen(now) ? s.id : kDefaultSkinId;
  }

  static AppSkin effective(
    String? stored,
    DateTime now, [
    List<CustomSkin> customs = const [],
  ]) => byId(effectiveId(stored, now, customs), customs);

  /// 새 만든 스킨의 id.
  static String newCustomId(List<CustomSkin> customs, [DateTime? at]) {
    var n = (at ?? DateTime.now()).millisecondsSinceEpoch;
    final used = {for (final c in customs) c.id};
    while (used.contains('${CustomSkin.customIdPrefix}$n')) {
      n++;
    }
    return '${CustomSkin.customIdPrefix}$n';
  }
}

// ───────────────────────── 대비·유도 ─────────────────────────

/// WCAG 2.x 대비비.
double contrastRatio(Color a, Color b) {
  final la = a.computeLuminance();
  final lb = b.computeLuminance();
  final hi = la > lb ? la : lb;
  final lo = la > lb ? lb : la;
  return (hi + 0.05) / (lo + 0.05);
}

Color _mix(Color a, Color b, double t) => Color.lerp(a, b, t)!;

const _white = Color(0xFFFFFFFF);
const _black = Color(0xFF000000);

/// [bg] 위에서 더 잘 읽히는 흰색/검정.
Color _on(Color bg) =>
    contrastRatio(_white, bg) >= contrastRatio(_black, bg) ? _white : _black;

/// [bgs] 모두에서 [min] 이상이 될 때까지 [fg]를 [toward] 쪽으로 옮긴다.
Color _ensure(Color fg, List<Color> bgs, double min, Color toward) {
  var c = fg;
  for (var i = 0; i < 20 && bgs.any((b) => contrastRatio(c, b) < min); i++) {
    c = _mix(c, toward, 0.12);
  }
  return c;
}

/// 토큰 → M3 색 구성. 토큰이 [skinContrastIssues]를 통과하면 이 구성의 모든 짝도 통과한다.
ColorScheme deriveSkinScheme(SkinTokens t, Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final toward = dark ? _white : _black;
  final bg = t.bg;
  final surfaceHigh = _mix(bg, t.ink, 0.09);
  final highest = _mix(bg, t.ink, 0.13);

  final primary = t.accent;
  final primaryContainer = _mix(bg, t.accent, dark ? 0.32 : 0.2);
  final secondary = t.ink2;
  final secondaryContainer = _mix(bg, t.ink2, dark ? 0.26 : 0.16);
  // tertiary: 글자에도 쓰이므로 장식 금색을 본문 대비까지 끌어올린다.
  final tertiary = _ensure(t.gold, [bg, t.box, highest], 4.5, t.ink);
  final tertiaryContainer = _mix(bg, t.gold, dark ? 0.3 : 0.24);
  final errorContainer = _mix(bg, t.danger, dark ? 0.3 : 0.16);
  final outline = _ensure(_mix(t.ink2, bg, 0.3), [bg, t.box], 3.0, t.ink);

  return ColorScheme(
    brightness: brightness,
    primary: primary,
    onPrimary: _on(primary),
    primaryContainer: primaryContainer,
    onPrimaryContainer: _ensure(t.ink, [primaryContainer], 4.5, toward),
    secondary: secondary,
    onSecondary: _on(secondary),
    secondaryContainer: secondaryContainer,
    onSecondaryContainer: _ensure(t.ink, [secondaryContainer], 4.5, toward),
    tertiary: tertiary,
    onTertiary: _on(tertiary),
    tertiaryContainer: tertiaryContainer,
    onTertiaryContainer: _ensure(t.ink, [tertiaryContainer], 4.5, toward),
    error: t.danger,
    onError: _on(t.danger),
    errorContainer: errorContainer,
    onErrorContainer: _ensure(t.ink, [errorContainer], 4.5, toward),
    surface: bg,
    onSurface: t.ink,
    onSurfaceVariant: t.ink2,
    surfaceDim: dark ? bg : _mix(bg, _black, 0.06),
    surfaceBright: dark ? _mix(bg, t.ink, 0.15) : _mix(bg, _white, 0.5),
    surfaceContainerLowest: t.box,
    surfaceContainerLow: _mix(t.box, bg, 0.5),
    surfaceContainer: _mix(bg, t.ink, 0.05),
    surfaceContainerHigh: surfaceHigh,
    surfaceContainerHighest: highest,
    outline: outline,
    outlineVariant: _mix(bg, t.ink, 0.2),
    shadow: _black,
    scrim: _black,
    inverseSurface: t.ink,
    onInverseSurface: bg,
    inversePrimary: _ensure(t.accent, [t.ink], 4.5, bg),
    surfaceTint: t.accent,
  );
}

/// 밝은 스킨의 내비게이션(레일·하단 바)이 쓸 어두운 구성: 글자색 쪽을 짙게 눌러 바탕으로, 배경색을 글자로.
ColorScheme deriveChromeScheme(SkinTokens light) {
  final nav = _mix(light.ink, _black, 0.25);
  final ink = _ensure(light.bg, [nav], 7.0, _white);
  final accent = _ensure(light.gold, [nav, _mix(nav, ink, 0.13)], 4.5, _white);
  final tokens = SkinTokens(
    bg: nav,
    box: _mix(nav, _white, 0.05),
    ink: ink,
    ink2: _ensure(_mix(ink, nav, 0.25), [nav], 4.5, _white),
    accent: accent,
    gold: accent,
    danger: _ensure(_mix(light.danger, _white, 0.5), [nav], 4.5, _white),
  );
  return deriveSkinScheme(tokens, Brightness.dark);
}

/// 대비 검사 결과 한 줄.
@immutable
class SkinIssue {
  const SkinIssue(this.labelKo, this.ratio, this.min);
  final String labelKo;
  final double ratio;
  final double min;

  @override
  String toString() =>
      '$labelKo ${ratio.toStringAsFixed(1)}:1 (최소 ${min.toStringAsFixed(1)}:1)';
}

/// 고른 색 자체의 대비 + 거기서 유도한 M3 구성의 대비. 비어 있으면 읽을 수 있는 조합이다.
/// 본문 글자는 WCAG AA 4.5:1, 장식·테두리(비텍스트)는 3:1.
List<SkinIssue> skinContrastIssues(SkinTokens t) {
  final out = <SkinIssue>[];
  void chk(String label, Color fg, Color bg, [double min = 4.5]) {
    final r = contrastRatio(fg, bg);
    if (r < min) out.add(SkinIssue(label, r, min));
  }

  chk('글자 / 배경', t.ink, t.bg);
  chk('글자 / 카드', t.ink, t.box);
  chk('보조 글자 / 배경', t.ink2, t.bg);
  chk('보조 글자 / 카드', t.ink2, t.box);
  chk('강조 / 배경', t.accent, t.bg);
  chk('강조 / 카드', t.accent, t.box);
  chk('경고 / 배경', t.danger, t.bg);
  chk('경고 / 카드', t.danger, t.box);
  chk('금빛 장식 / 배경', t.gold, t.bg, 3.0);
  chk('금빛 장식 / 카드', t.gold, t.box, 3.0);
  // 유도한 구성에서 실제로 겹쳐 쓰는 짝(카드 위 본문, 눌린 표면 위 본문 등).
  final s = deriveSkinScheme(t, t.isDark ? Brightness.dark : Brightness.light);
  chk('글자 / 진한 표면', s.onSurface, s.surfaceContainerHighest);
  chk('보조 글자 / 진한 표면', s.onSurfaceVariant, s.surfaceContainerHigh);
  chk('버튼 글자 / 강조', s.onPrimary, s.primary);
  chk('강조 / 표면', s.primary, s.surfaceContainerHigh);
  return out;
}

/// 만든 스킨을 저장해도 되는가(이름 + 대비). 이유 문장 목록을 돌려준다(비어 있으면 통과).
List<String> customSkinProblems(String name, SkinTokens t) {
  final out = <String>[];
  final n = name.trim();
  if (n.isEmpty) out.add('이름을 적어 주세요');
  if (n.length > CustomSkin.maxNameLength) {
    out.add('이름은 ${CustomSkin.maxNameLength}자까지예요');
  }
  for (final i in skinContrastIssues(t)) {
    out.add(
      '${i.labelKo}: 대비가 낮아요 (${i.ratio.toStringAsFixed(1)}:1, ${i.min.toStringAsFixed(1)} 이상 필요)',
    );
  }
  return out;
}

// ───────────────────────── 만들기용 색 견본 ─────────────────────────

/// 자리별로 골라 둔 견본(자유 색 고르기 대신: 대비가 안전한 색만). 밝은/어두운 바탕용이 따로 있다.
abstract final class SkinSwatches {
  static List<Color> of(SkinSlot slot, {required bool dark}) =>
      (dark ? _dark : _light)[slot]!;

  static const Map<SkinSlot, List<Color>> _light = {
    SkinSlot.bg: [
      Color(0xFFFBF2E8),
      Color(0xFFF1E6CC),
      Color(0xFFEEF4FA),
      Color(0xFFF1F2E6),
      Color(0xFFFAEEEE),
      Color(0xFFF4EEF6),
      Color(0xFFF1F3F5),
      Color(0xFFFAF6EA),
    ],
    SkinSlot.box: [
      Color(0xFFFFFCF8),
      Color(0xFFFBF4E0),
      Color(0xFFFBFDFF),
      Color(0xFFFCFDF6),
      Color(0xFFFFFAF9),
      Color(0xFFFDFAFE),
      Color(0xFFFFFFFF),
      Color(0xFFFFFFFC),
    ],
    SkinSlot.ink: [
      Color(0xFF2B1B11),
      Color(0xFF33260F),
      Color(0xFF172637),
      Color(0xFF22281A),
      Color(0xFF2E1A1D),
      Color(0xFF25182E),
      Color(0xFF1F252B),
      Color(0xFF1A1A1A),
    ],
    SkinSlot.ink2: [
      Color(0xFF5B4634),
      Color(0xFF5E4A2A),
      Color(0xFF445970),
      Color(0xFF4E5740),
      Color(0xFF5E4348),
      Color(0xFF54435F),
      Color(0xFF4F5963),
      Color(0xFF555555),
    ],
    SkinSlot.accent: [
      Color(0xFF5F3419),
      Color(0xFF7A4A12),
      Color(0xFF2A5C94),
      Color(0xFF4F6B2A),
      Color(0xFF8E3350),
      Color(0xFF5F3A7E),
      Color(0xFF3F5566),
      Color(0xFF9A2A22),
      Color(0xFFC9A04A), Color(0xFF7FA6CF), // 옅은 색: 글자가 안 보일 수 있어 대비 검사가 막는다
    ],
    SkinSlot.gold: [
      Color(0xFFAE7A13),
      Color(0xFF8A5F0C),
      Color(0xFF8E6A12),
      Color(0xFF8C6D12),
      Color(0xFF94651D),
      Color(0xFF8C6A1E),
      Color(0xFF7A6A44),
      Color(0xFF8E6C00),
    ],
    SkinSlot.danger: [
      Color(0xFFBA1A1A),
      Color(0xFFB3261E),
      Color(0xFFA8281C),
      Color(0xFF9C2B2B),
    ],
  };

  static const Map<SkinSlot, List<Color>> _dark = {
    SkinSlot.bg: [
      Color(0xFF1E130D),
      Color(0xFF0B1226),
      Color(0xFF0F1A28),
      Color(0xFF14190F),
      Color(0xFF22121A),
      Color(0xFF211A0E),
      Color(0xFF14181C),
      Color(0xFF1A1222),
    ],
    SkinSlot.box: [
      Color(0xFF2B1F19),
      Color(0xFF16203D),
      Color(0xFF1A2A3D),
      Color(0xFF212918),
      Color(0xFF331E28),
      Color(0xFF30261A),
      Color(0xFF212830),
      Color(0xFF291D36),
    ],
    SkinSlot.ink: [
      Color(0xFFF4E6D5),
      Color(0xFFEDEBE4),
      Color(0xFFE8F0F8),
      Color(0xFFE9EEDD),
      Color(0xFFF6E6E8),
      Color(0xFFEFE3C6),
      Color(0xFFEAEEF2),
      Color(0xFFF5F5F5),
    ],
    SkinSlot.ink2: [
      Color(0xFFD8C3AB),
      Color(0xFFBDC3D6),
      Color(0xFFB7C6D8),
      Color(0xFFBEC8AB),
      Color(0xFFD9BEC4),
      Color(0xFFD0BE98),
      Color(0xFFB8C1CA),
      Color(0xFFCCCCCC),
    ],
    SkinSlot.accent: [
      Color(0xFFE7C46C),
      Color(0xFFE3C36F),
      Color(0xFF9CC3EE),
      Color(0xFFB5CD84),
      Color(0xFFF0A6BA),
      Color(0xFFCDB0EC),
      Color(0xFFA9BFD0),
      Color(0xFFF0A090),
      Color(0xFF6A4A9A), Color(0xFF8A6A3A), // 짙은 색: 어두운 바탕에서는 안 보일 수 있다
    ],
    SkinSlot.gold: [
      Color(0xFFE7C46C),
      Color(0xFFD9BE78),
      Color(0xFFD8C070),
      Color(0xFFE2BE7C),
      Color(0xFFCDB98A),
      Color(0xFFDDB86A),
      Color(0xFFF0D27A),
      Color(0xFFE4C070),
    ],
    SkinSlot.danger: [
      Color(0xFFFFB4AB),
      Color(0xFFFF9A8F),
      Color(0xFFF2A39B),
      Color(0xFFFFC2BB),
    ],
  };
}
