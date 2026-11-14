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

/// 밝고 따뜻한 Material 3 테마: 테라코타 시드 하나에서 모든 역할을 만들고(tonalSpot),
/// 3차(tertiary)만 골드 시드로 둔다.
///
/// 2026-11 재감사: 예전에는 secondary를 올리브 시드로 덮어써서 secondaryContainer를 쓰는 M3
/// 기본 컴포넌트(내비게이션 바 표시기, 세그먼트 버튼 선택, tonal 버튼, 필터 칩, 선택된 목록 항목,
/// 슬라이더 비활성 트랙)가 전부 연두색이 되어 테라코타 primary와 어긋났다. M3 tonalSpot은
/// secondary를 primary와 같은 색상(hue)의 저채도 톤으로 만들도록 설계되어 있으므로 덮어쓰지 않는다.
abstract final class AppTheme {
  /// 번들 고딕 글꼴 이름(pubspec.yaml의 family).
  static const String sansFamily = 'Pretendard';

  /// 브랜드 시드(테라코타). 두 모드의 모든 색 역할이 여기서 나온다.
  static const Color seedColor = Color(0xFFC2613E);

  /// 3차(tertiary) 역할의 시드(골드).
  static const Color tertiarySeedColor = Color(0xFFC9A04A);

  /// 카드 모서리(M3 medium). 성당 화면 등 외부에서 참조하므로 유지한다.
  static const double cardRadius = AppShape.mediumRadius;

  /// 화면 하단 '기도 시작' 같은 주 행동 버튼의 높이(M3 큰 버튼, 8dp 격자).
  static const double largeButtonHeight = 56;

  /// 시드에서 만든 M3 색 구성(tonalSpot). 테라코타 시드의 primary/secondary/neutral에
  /// 골드(tertiary) 시드의 같은 톤 역할을 얹는다.
  ///
  /// 문서화된 유일한 덮어쓰기: tertiary 4개 역할. 골드 시드도 tonalSpot의
  /// primary 톤 쌍(40/100, 90/10 등)을 그대로 가져오므로 대비 관계가 유지된다.
  static ColorScheme seedScheme(Brightness brightness) =>
      brightness == Brightness.dark ? _seedDark : _seedLight;

  // 시드 구성은 입력이 상수라 한 번만 계산한다(ColorScheme.fromSeed ×2는 싸지 않다).
  static final ColorScheme _seedLight = _computeSeedScheme(Brightness.light);
  static final ColorScheme _seedDark = _computeSeedScheme(Brightness.dark);

  static ColorScheme _computeSeedScheme(Brightness brightness) {
    ColorScheme from(Color seed) => ColorScheme.fromSeed(
      seedColor: seed,
      brightness: brightness,
      dynamicSchemeVariant: DynamicSchemeVariant.tonalSpot,
    );
    final base = from(seedColor);
    final gold = from(tertiarySeedColor);
    return base.copyWith(
      tertiary: gold.primary,
      onTertiary: gold.onPrimary,
      tertiaryContainer: gold.primaryContainer,
      onTertiaryContainer: gold.onPrimaryContainer,
    );
  }

  /// 밝은/어두운 테마. [dynamicScheme]이 있으면(기기 배경화면 색, Material You)
  /// 시드 구성 대신 그 구성을 쓴다. 호출자가 미리 `harmonized()`를 적용해 넘긴다.
  /// [font]가 고딕이면 앱 전체 글꼴이 Pretendard, 시스템이면 기기 글꼴이다.
  static ThemeData light({
    ColorScheme? dynamicScheme,
    PrayerFont font = PrayerFont.gothic,
  }) => _build(dynamicScheme ?? seedScheme(Brightness.light), font);

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
    return Typography.dense2021.apply(
      fontFamily: familyOf(font),
      displayColor: scheme.onSurface,
      bodyColor: scheme.onSurface,
    );
  }

  /// 색 구성·글꼴별로 만든 테마를 기억한다.
  ///
  /// 설정이 바뀔 때마다(신비·기도 모드 선택 등) MaterialApp이 다시 만들어지는데, 그때마다
  /// 새 [ThemeData]를 만들면 내용이 같아도 `==`가 false라(상태별 콜백 객체가 매번 새로 생김)
  /// MaterialApp의 AnimatedTheme이 200ms 동안 매 프레임 `ThemeData.lerp` + 앱 전체 리빌드를
  /// 돌린다. 같은 색 구성에는 같은 인스턴스를 돌려주어 그 일을 없앤다.
  static final Map<(ColorScheme, PrayerFont), ThemeData> _themeCache = {};

  static ThemeData _build(ColorScheme scheme, PrayerFont font) {
    final key = (scheme, font);
    final cached = _themeCache[key];
    if (cached != null) return cached;
    // 기기 색(배경화면)이나 글꼴이 바뀔 때만 새 항목이 생긴다. 쌓이지 않게 조금만 둔다.
    if (_themeCache.length >= 12) _themeCache.clear();
    return _themeCache[key] = _buildUncached(scheme, font);
  }

  static ThemeData _buildUncached(ColorScheme scheme, PrayerFont font) {
    final text = textTheme(scheme, font);
    final overlay = systemOverlayStyle(scheme.brightness);

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: familyOf(font),
      textTheme: text,
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
      segmentedButtonTheme: const SegmentedButtonThemeData(
        selectedIcon: Icon(Icons.check),
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
      ),
      navigationRailTheme: NavigationRailThemeData(
        indicatorShape: AppShape.full,
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
