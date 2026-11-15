import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'settings.dart';

/// Material 3 모양(shape) 스케일 토큰: 0 / 4 / 8 / 12 / 16 / 28 / full.
abstract final class AppShape {
  static const double extraSmallRadius = 4;
  static const double smallRadius = 8;
  static const double mediumRadius = 12;
  static const double largeRadius = 16;
  static const double extraLargeRadius = 28;

  static const BorderRadius extraSmall = BorderRadius.all(
    Radius.circular(extraSmallRadius),
  );
  static const BorderRadius small = BorderRadius.all(
    Radius.circular(smallRadius),
  );
  static const BorderRadius medium = BorderRadius.all(
    Radius.circular(mediumRadius),
  );
  static const BorderRadius large = BorderRadius.all(
    Radius.circular(largeRadius),
  );
  static const BorderRadius extraLarge = BorderRadius.all(
    Radius.circular(extraLargeRadius),
  );

  /// 시트(바텀 시트) 위쪽 모서리: extra large(28) 위쪽만.
  static const RoundedRectangleBorder extraLargeTopBorder =
      RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(extraLargeRadius),
        ),
      );

  /// 완전히 둥근(full) 모양.
  static const StadiumBorder full = StadiumBorder();

  static const RoundedRectangleBorder extraSmallBorder = RoundedRectangleBorder(
    borderRadius: extraSmall,
  );
  static const RoundedRectangleBorder smallBorder = RoundedRectangleBorder(
    borderRadius: small,
  );
  static const RoundedRectangleBorder mediumBorder = RoundedRectangleBorder(
    borderRadius: medium,
  );
  static const RoundedRectangleBorder largeBorder = RoundedRectangleBorder(
    borderRadius: large,
  );
  static const RoundedRectangleBorder extraLargeBorder = RoundedRectangleBorder(
    borderRadius: extraLarge,
  );
}

/// 8dp 격자 기반 간격 토큰(4는 촘촘한 내부 간격 전용).
abstract final class AppSpace {
  static const double xxs = 4;
  static const double xs = 8;
  static const double sm = 16;
  static const double md = 24;
  static const double lg = 32;
}

/// Material 3 모션 보조: 토큰(Durations/Easing)을 쓰되 '동작 줄이기'를 존중한다.
abstract final class AppMotion {
  /// 시스템 '애니메이션 제거' 설정이면 0, 아니면 [duration].
  static Duration of(BuildContext context, Duration duration) =>
      MediaQuery.disableAnimationsOf(context) ? Duration.zero : duration;
}

/// 장식용 색·내비게이션 색 구성(M3 색 역할에 없는 것만 여기 둔다).
///
/// - [gold]: 장식선(금색 십자 장식선, 선택된 카드·세그먼트·주 버튼의 가는 금색 테두리)의 색.
///   밝은 표면에서 3:1 이상이 되도록 고른 값이라 선택 표시(비텍스트)에도 쓸 수 있다.
/// - [chrome]: 내비게이션(레일·하단 바)의 색 구성. 밝은 테마에서도 내비게이션은 어두운 갈색이라
///   어두운 구성을 쓴다(어두운 테마에서는 자기 구성과 같다).
@immutable
class AppDecor extends ThemeExtension<AppDecor> {
  const AppDecor({required this.gold, required this.chrome});

  final Color gold;
  final ColorScheme chrome;

  /// [context] 테마의 장식 값. 확장이 없는 테마(시험용 등)면 색 구성에서 만든다.
  static AppDecor of(BuildContext context) {
    final theme = Theme.of(context);
    return theme.extension<AppDecor>() ??
        AppDecor(gold: theme.colorScheme.tertiary, chrome: theme.colorScheme);
  }

  @override
  AppDecor copyWith({Color? gold, ColorScheme? chrome}) =>
      AppDecor(gold: gold ?? this.gold, chrome: chrome ?? this.chrome);

  @override
  AppDecor lerp(AppDecor? other, double t) {
    if (other == null) return this;
    return AppDecor(
      gold: Color.lerp(gold, other.gold, t) ?? gold,
      chrome: ColorScheme.lerp(chrome, other.chrome, t),
    );
  }

  @override
  bool operator ==(Object other) =>
      other is AppDecor && other.gold == gold && other.chrome == chrome;

  @override
  int get hashCode => Object.hash(gold, chrome);
}

/// 앱 전체 Material 3 테마: **따뜻한 상아색 종이 + 짙은 갈색 + 금색**(2026-11 사용자 시안).
///
/// 밝게는 상아색 표면에 짙은 갈색 primary 와 금색 tertiary, 어둡게는 짙은 갈색·먹색 표면에
/// 금색 primary(성당 안 전용 [ChurchTheme]의 촛불 금색과 같은 값이라 자연스럽게 이어진다)다.
/// M3 를 버리는 것이 아니라 **색 구성(ColorScheme)만 손으로 정한 같은 M3 테마**이며, 모든 화면은
/// 색 역할만 쓰므로 여기 한 곳을 바꾸면 전 화면이 따라온다. 대비는 `test/theme_contrast_test.dart`.
///
/// ## 색 역할표
///
/// | 역할 | 밝게 | 어둡게 |
/// |---|---|---|
/// | `surface` | #FBF2E8 상아색 종이 | #1E130D 짙은 갈색 먹 |
/// | `surfaceContainerLowest…Highest` | #FFFCF8 → #E8DBCA | #160C07 → #403229 |
/// | `onSurface` / `onSurfaceVariant` | #2B1B11 / #5B4634 | #F4E6D5 / #D8C3AB |
/// | `primary` / `onPrimary` | #5F3419 짙은 갈색 / #FFFFFF | #E7C46C 촛불 금색 / #3B2C00 |
/// | `primaryContainer` / `on…` | #F6DCC0 / #3D1C05 | #564209 / #FFE29B |
/// | `secondary` / `onSecondary` | #6E543E / #FFFFFF | #DFC29C / #3F2D12 |
/// | `secondaryContainer` / `on…` | #EFD9BE / #33200F | #543E23 / #FBDEB6 |
/// | `tertiary` / `onTertiary` | #765300 금색(글자용) / #FFFFFF | #F1B36E 불꽃 호박색 / #482A00 |
/// | `tertiaryContainer` / `on…` | #FBDF9F / #2F2100 | #663E08 / #FFDDB7 |
/// | `outline` / `outlineVariant` | #8A7159 / #DCC3A1 | #A89378 / #5C482F |
/// | 장식 금색([AppDecor.gold]) | #AE7A13 | #E7C46C |
///
/// 이전(테라코타 시드 `fromSeed`)과 달리 고정값이다: 시드에서 만든 표면은 분홍빛이 돌아 시안의
/// 상아색 종이와 달랐다. 기기 색(Material You)을 켜면 여전히 기기 구성을 쓴다.
abstract final class AppTheme {
  /// 번들 고딕 글꼴 이름(pubspec.yaml의 family).
  static const String sansFamily = 'Pretendard';

  /// 브랜드 색(짙은 갈색). 밝은 구성의 primary 다.
  static const Color seedColor = Color(0xFF5F3419);

  /// 금색(장식·강조)의 기준 색.
  static const Color tertiarySeedColor = Color(0xFFC9A04A);

  /// 카드 모서리(M3 medium). 성당 화면 등 외부에서 참조하므로 유지한다.
  static const double cardRadius = AppShape.mediumRadius;

  /// 화면 하단 '기도 시작' 같은 주 행동 버튼의 높이(M3 큰 버튼, 8dp 격자).
  static const double largeButtonHeight = 56;

  /// 앱 고유 색 구성(위 역할표).
  static ColorScheme seedScheme(Brightness brightness) =>
      brightness == Brightness.dark ? _seedDark : _seedLight;

  static const ColorScheme _seedLight = ColorScheme(
    brightness: Brightness.light,
    primary: Color(0xFF5F3419),
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFF6DCC0),
    onPrimaryContainer: Color(0xFF3D1C05),
    secondary: Color(0xFF6E543E),
    onSecondary: Color(0xFFFFFFFF),
    secondaryContainer: Color(0xFFEFD9BE),
    onSecondaryContainer: Color(0xFF33200F),
    tertiary: Color(0xFF765300),
    onTertiary: Color(0xFFFFFFFF),
    tertiaryContainer: Color(0xFFFBDF9F),
    onTertiaryContainer: Color(0xFF2F2100),
    error: Color(0xFFBA1A1A),
    onError: Color(0xFFFFFFFF),
    errorContainer: Color(0xFFFFDAD6),
    onErrorContainer: Color(0xFF410002),
    surface: Color(0xFFFBF2E8),
    onSurface: Color(0xFF2B1B11),
    onSurfaceVariant: Color(0xFF5B4634),
    surfaceDim: Color(0xFFDED0BE),
    surfaceBright: Color(0xFFFFF9F2),
    surfaceContainerLowest: Color(0xFFFFFCF8),
    surfaceContainerLow: Color(0xFFF7EDE1),
    surfaceContainer: Color(0xFFF3E8DA),
    surfaceContainerHigh: Color(0xFFEEE2D3),
    surfaceContainerHighest: Color(0xFFE8DBCA),
    outline: Color(0xFF8A7159),
    outlineVariant: Color(0xFFDCC3A1),
    shadow: Color(0xFF000000),
    scrim: Color(0xFF000000),
    inverseSurface: Color(0xFF3A2E27),
    onInverseSurface: Color(0xFFFCEEE2),
    inversePrimary: Color(0xFFEAC261),
    surfaceTint: Color(0xFF5F3419),
  );

  static const ColorScheme _seedDark = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFFE7C46C),
    onPrimary: Color(0xFF3B2C00),
    primaryContainer: Color(0xFF564209),
    onPrimaryContainer: Color(0xFFFFE29B),
    secondary: Color(0xFFDFC29C),
    onSecondary: Color(0xFF3F2D12),
    secondaryContainer: Color(0xFF543E23),
    onSecondaryContainer: Color(0xFFFBDEB6),
    tertiary: Color(0xFFF1B36E),
    onTertiary: Color(0xFF482A00),
    tertiaryContainer: Color(0xFF663E08),
    onTertiaryContainer: Color(0xFFFFDDB7),
    error: Color(0xFFFFB4AB),
    onError: Color(0xFF690005),
    errorContainer: Color(0xFF93000A),
    onErrorContainer: Color(0xFFFFDAD6),
    surface: Color(0xFF1E130D),
    onSurface: Color(0xFFF4E6D5),
    onSurfaceVariant: Color(0xFFD8C3AB),
    surfaceDim: Color(0xFF1E130D),
    surfaceBright: Color(0xFF4A3A32),
    surfaceContainerLowest: Color(0xFF160C07),
    surfaceContainerLow: Color(0xFF241913),
    surfaceContainer: Color(0xFF2B1F19),
    surfaceContainerHigh: Color(0xFF342720),
    surfaceContainerHighest: Color(0xFF403229),
    outline: Color(0xFFA89378),
    outlineVariant: Color(0xFF5C482F),
    shadow: Color(0xFF000000),
    scrim: Color(0xFF000000),
    inverseSurface: Color(0xFFF5E6D5),
    onInverseSurface: Color(0xFF362922),
    inversePrimary: Color(0xFF765300),
    surfaceTint: Color(0xFFE7C46C),
  );

  /// 장식 금색(밝게/어둡게). [AppDecor.gold].
  static const Color _goldLight = Color(0xFFAE7A13);
  static const Color _goldDark = Color(0xFFE7C46C);

  /// 밝은/어두운 테마. [dynamicScheme]이 있으면(기기 배경화면 색, Material You)
  /// 시드 구성 대신 그 구성을 쓴다. 호출자가 미리 `harmonized()`를 적용해 넘긴다.
  /// [font]가 고딕이면 앱 전체 글꼴이 Pretendard, 시스템이면 기기 글꼴이다.
  ///
  /// [chromeScheme]은 밝은 테마의 내비게이션(레일·하단 바)이 쓸 어두운 구성이다. 없으면 앱 고유
  /// 어두운 구성(기기 색을 쓸 때는 기기의 어두운 구성을 넘긴다).
  static ThemeData light({
    ColorScheme? dynamicScheme,
    ColorScheme? chromeScheme,
    PrayerFont font = PrayerFont.gothic,
  }) => _build(
    dynamicScheme ?? seedScheme(Brightness.light),
    font,
    chromeScheme ?? seedScheme(Brightness.dark),
  );

  static ThemeData dark({
    ColorScheme? dynamicScheme,
    PrayerFont font = PrayerFont.gothic,
  }) => _build(dynamicScheme ?? seedScheme(Brightness.dark), font);

  /// 주어진 색 구성으로 같은 컴포넌트 테마·모양·글꼴을 가진 테마를 만든다.
  /// 화면 한정 테마(예: 성당 안의 어두운 금색 `ChurchTheme`)가 앱과 같은 규칙을 쓰게 한다.
  static ThemeData fromScheme(
    ColorScheme scheme, [
    PrayerFont font = PrayerFont.gothic,
  ]) => _build(scheme, font);

  /// [context] 테마의 내비게이션(레일·하단 바)용 테마: 밝은 테마에서도 어두운 갈색 구성
  /// ([AppDecor.chrome])을 쓰는 같은 M3 테마. 어두운 테마에서는 앱 테마 그대로다.
  static ThemeData chromeOf(BuildContext context) {
    final theme = Theme.of(context);
    final chrome = AppDecor.of(context).chrome;
    if (chrome == theme.colorScheme) return theme;
    final family = theme.textTheme.bodyMedium?.fontFamily;
    return _build(
      chrome,
      family == sansFamily ? PrayerFont.gothic : PrayerFont.system,
    );
  }

  /// 화면의 주 행동(입장하기 등) 큰 버튼: 56dp + 가는 금색 테두리([AppDecor.gold]).
  static ButtonStyle heroButtonStyle(BuildContext context) =>
      FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(largeButtonHeight),
        textStyle: Theme.of(context).textTheme.titleMedium,
        side: BorderSide(color: AppDecor.of(context).gold),
      );

  /// [font]에 해당하는 글꼴 이름. 시스템이면 null(기기 기본 글꼴).
  static String? familyOf(PrayerFont font) =>
      font == PrayerFont.gothic ? sansFamily : null;

  /// 시스템 바: 투명(edge-to-edge) + 밝기에 맞는 아이콘 색.
  static SystemUiOverlayStyle systemOverlayStyle(Brightness brightness) {
    final icons = brightness == Brightness.dark
        ? Brightness.light
        : Brightness.dark;
    return SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: icons,
      statusBarBrightness: brightness,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarDividerColor: Colors.transparent,
      systemNavigationBarIconBrightness: icons,
      systemNavigationBarContrastEnforced: false,
    );
  }

  /// 기도문 본문 기본 글자 크기(배율 1.0).
  static const double baseFontSize = 24;

  /// 기도문 본문 스타일(문서화된 커스텀 스타일: 읽기용으로 M3 역할보다 크다).
  /// [font]가 고딕이면 Pretendard, 시스템이면 글꼴을 지정하지 않아 기기 글꼴을 쓴다.
  /// [bold]는 강조(내 차례)용이다.
  static TextStyle prayerStyle(
    BuildContext context,
    PrayerFont font, {
    double? size,
    Color? color,
    bool bold = false,
  }) {
    return TextStyle(
      fontFamily: familyOf(font),
      fontSize: size ?? baseFontSize,
      height: 1.6,
      letterSpacing: -0.2,
      color: color ?? Theme.of(context).colorScheme.onSurface,
      fontWeight: bold ? FontWeight.w600 : FontWeight.w400,
    );
  }

  /// M3 타입 스케일(display/headline/title/body/label × L/M/S).
  /// 크기·굵기·행간은 M3 명세의 한글(dense) 기하를 그대로 쓴다.
  /// [font]가 시스템이면 글꼴 이름을 지정하지 않는다.
  static TextTheme textTheme(
    ColorScheme scheme, [
    PrayerFont font = PrayerFont.gothic,
  ]) {
    final base = Typography.dense2021.apply(
      fontFamily: familyOf(font),
      displayColor: scheme.onSurface,
      bodyColor: scheme.onSurface,
    );
    // 제목(display·headline·titleLarge)만 굵고 촘촘하게: 시안의 붓글씨 제목 느낌을 새 글꼴 없이
    // 굵기·자간으로 낸다. 크기·행간은 M3 타입 스케일 그대로다.
    TextStyle? heavy(TextStyle? s, FontWeight w, double spacing) =>
        s?.copyWith(fontWeight: w, letterSpacing: spacing);
    return base.copyWith(
      displayLarge: heavy(base.displayLarge, FontWeight.w700, -1),
      displayMedium: heavy(base.displayMedium, FontWeight.w700, -0.75),
      displaySmall: heavy(base.displaySmall, FontWeight.w700, -0.5),
      headlineLarge: heavy(base.headlineLarge, FontWeight.w700, -0.5),
      headlineMedium: heavy(base.headlineMedium, FontWeight.w700, -0.5),
      headlineSmall: heavy(base.headlineSmall, FontWeight.w700, -0.25),
      titleLarge: heavy(base.titleLarge, FontWeight.w600, -0.25),
    );
  }

  /// 색 구성·글꼴별로 만든 테마를 기억한다.
  ///
  /// 설정이 바뀔 때마다(신비·기도 모드 선택 등) MaterialApp이 다시 만들어지는데, 그때마다
  /// 새 [ThemeData]를 만들면 내용이 같아도 `==`가 false라(상태별 콜백 객체가 매번 새로 생김)
  /// MaterialApp의 AnimatedTheme이 200ms 동안 매 프레임 `ThemeData.lerp` + 앱 전체 리빌드를
  /// 돌린다. 같은 색 구성에는 같은 인스턴스를 돌려주어 그 일을 없앤다.
  static final Map<(ColorScheme, PrayerFont, ColorScheme?), ThemeData>
  _themeCache = {};

  static ThemeData _build(
    ColorScheme scheme,
    PrayerFont font, [
    ColorScheme? chrome,
  ]) {
    // 어두운 구성은 내비게이션도 자기 구성을 쓴다.
    final nav = scheme.brightness == Brightness.dark ? null : chrome;
    final key = (scheme, font, nav);
    final cached = _themeCache[key];
    if (cached != null) return cached;
    // 기기 색(배경화면)이나 글꼴이 바뀔 때만 새 항목이 생긴다. 쌓이지 않게 조금만 둔다.
    if (_themeCache.length >= 12) _themeCache.clear();
    return _themeCache[key] = _buildUncached(scheme, font, nav);
  }

  static ThemeData _buildUncached(
    ColorScheme scheme,
    PrayerFont font,
    ColorScheme? chrome,
  ) {
    final text = textTheme(scheme, font);
    final overlay = systemOverlayStyle(scheme.brightness);
    final dark = scheme.brightness == Brightness.dark;
    // 장식 금색: 앱 고유 구성이면 정해 둔 금색, 그 밖(기기 색·화면 한정 구성)이면 그 구성의 강조색.
    final gold = identical(scheme, _seedLight)
        ? _goldLight
        : identical(scheme, _seedDark)
        ? _goldDark
        : (dark ? scheme.primary : scheme.tertiary);
    final decor = AppDecor(gold: gold, chrome: chrome ?? scheme);
    // 내비게이션 표시기: 가는 금색 테두리의 알약.
    final indicator = StadiumBorder(side: BorderSide(color: gold));

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: familyOf(font),
      textTheme: text,
      extensions: [decor],
      // 키보드/마우스 상태 레이어(M3: hover 8%, focus 10%, pressed 10%).
      hoverColor: scheme.onSurface.withValues(alpha: 0.08),
      focusColor: scheme.onSurface.withValues(alpha: 0.10),
      highlightColor: Colors.transparent,
      // InkSparkle(셰이더)은 flutter test에서 에셋을 못 찾아 실패하므로 M3 표준 물결(InkRipple)을 쓴다.
      splashFactory: InkRipple.splashFactory,
      splashColor: scheme.onSurface.withValues(alpha: 0.10),
      dividerColor: scheme.outlineVariant,
      dividerTheme: DividerThemeData(
        color: scheme.outlineVariant,
        thickness: 1,
        space: 1,
      ),
      appBarTheme: AppBarTheme(
        systemOverlayStyle: overlay,
        // M3 small/medium/large 앱 바는 제목을 시작 쪽에 둔다.
        centerTitle: false,
      ),
      // M3 검색 바: surfaceContainerHigh, 그림자 없음(톤으로 구분), full 모양.
      searchBarTheme: SearchBarThemeData(
        elevation: const WidgetStatePropertyAll(0),
        backgroundColor: WidgetStatePropertyAll(scheme.surfaceContainerHigh),
        constraints: const BoxConstraints(minHeight: 56),
      ),
      cardTheme: const CardThemeData(
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
      ),
      chipTheme: ChipThemeData(
        shape: AppShape.smallBorder,
        labelStyle: text.labelLarge,
      ),
      dialogTheme: const DialogThemeData(shape: AppShape.extraLargeBorder),
      bottomSheetTheme: const BottomSheetThemeData(
        showDragHandle: true,
        clipBehavior: Clip.antiAlias,
        shape: AppShape.extraLargeTopBorder,
        constraints: BoxConstraints(maxWidth: 640),
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        showCloseIcon: true,
        shape: AppShape.extraSmallBorder,
        insetPadding: EdgeInsets.all(AppSpace.sm),
      ),
      tooltipTheme: TooltipThemeData(
        waitDuration: Durations.long1,
        constraints: const BoxConstraints(minHeight: 24),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: scheme.inverseSurface,
          borderRadius: AppShape.extraSmall,
        ),
        textStyle: text.bodySmall?.copyWith(color: scheme.onInverseSurface),
      ),
      popupMenuTheme: PopupMenuThemeData(
        shape: AppShape.extraSmallBorder,
        elevation: 3,
        textStyle: text.labelLarge,
      ),
      listTileTheme: const ListTileThemeData(
        contentPadding: EdgeInsetsDirectional.only(start: 16, end: 24),
      ),
      switchTheme: SwitchThemeData(
        // M3: 켜짐 상태에 체크 아이콘(색상 외 단서). 색은 기본 역할 색을 쓴다.
        thumbIcon: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? const Icon(Icons.check)
              : null,
        ),
      ),
      // 세그먼트: 선택된 쪽은 primary 채움(밝게: 짙은 갈색, 어둡게: 금색) + 가는 금색 윤곽.
      segmentedButtonTheme: SegmentedButtonThemeData(
        selectedIcon: const Icon(Icons.check),
        style: ButtonStyle(
          backgroundColor: WidgetStateProperty.resolveWith(
            (states) =>
                states.contains(WidgetState.selected) &&
                    !states.contains(WidgetState.disabled)
                ? scheme.primary
                : null,
          ),
          foregroundColor: WidgetStateProperty.resolveWith(
            (states) => states.contains(WidgetState.disabled)
                ? null
                : states.contains(WidgetState.selected)
                ? scheme.onPrimary
                : scheme.onSurface,
          ),
          // 윤곽은 가는 금색 선(비활성일 때는 M3 기본).
          side: WidgetStateProperty.resolveWith(
            (states) => states.contains(WidgetState.disabled)
                ? null
                : BorderSide(color: gold),
          ),
        ),
      ),
      // M3(2024) 슬라이더·진행 표시줄: 핸들형 thumb, 트랙 간격, 끝 점.
      // year2023 플래그는 SDK에서 deprecated이지만 기본값이 아직 true라서(3.47)
      // 새 모양을 쓰려면 명시적으로 false로 둬야 한다. 기본값이 바뀌면 제거한다.
      // ignore: deprecated_member_use
      sliderTheme: const SliderThemeData(year2023: false),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        // ignore: deprecated_member_use
        year2023: false,
      ),
      badgeTheme: BadgeThemeData(
        backgroundColor: scheme.primary,
        textColor: scheme.onPrimary,
      ),
      navigationBarTheme: NavigationBarThemeData(
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        labelTextStyle: WidgetStatePropertyAll(text.labelMedium),
        indicatorShape: indicator,
      ),
      navigationRailTheme: NavigationRailThemeData(
        // 하단 바와 같은 표면(surfaceContainer)을 써서 두 내비게이션이 한 모습이 되게 한다.
        backgroundColor: scheme.surfaceContainer,
        indicatorShape: indicator,
        selectedLabelTextStyle: text.labelMedium?.copyWith(
          color: scheme.onSurface,
        ),
        unselectedLabelTextStyle: text.labelMedium?.copyWith(
          color: scheme.onSurfaceVariant,
        ),
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          // Android 14+의 예측형 뒤로가기(AndroidManifest의
          // enableOnBackInvokedCallback과 함께 동작). 앞으로 가기는 M3 기본인
          // FadeForwards 전환으로 처리된다.
          TargetPlatform.android: PredictiveBackPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
        },
      ),
    );
  }
}
