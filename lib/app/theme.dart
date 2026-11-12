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

/// 밝고 따뜻한 Material 3 테마: 테라코타 시드 + 올리브/골드 보조 시드.
abstract final class AppTheme {
  static const String sansFamily = 'Pretendard';
  static const String serifFamily = 'NotoSerifKR';

  /// 브랜드 시드(테라코타). 두 모드의 모든 색 역할이 여기서 나온다.
  static const Color seedColor = Color(0xFFC2613E);

  /// 보조(secondary) 역할의 시드(올리브). 앱의 따뜻한 올리브 느낌을 유지한다.
  static const Color secondarySeedColor = Color(0xFF7A8A5A);

  /// 3차(tertiary) 역할의 시드(골드).
  static const Color tertiarySeedColor = Color(0xFFC9A04A);

  /// 카드 모서리(M3 medium). 성당 화면 등 외부에서 참조하므로 유지한다.
  static const double cardRadius = AppShape.mediumRadius;

  /// 화면 하단 '기도 시작' 같은 주 행동 버튼의 높이(M3 큰 버튼, 8dp 격자).
  static const double largeButtonHeight = 56;

  /// 시드에서 만든 M3 색 구성(tonalSpot). 테라코타 시드의 primary/neutral에
  /// 올리브(secondary)·골드(tertiary) 시드의 같은 톤 역할을 얹는다.
  ///
  /// 문서화된 유일한 덮어쓰기: secondary·tertiary 4개 역할씩. 각 시드도 tonalSpot의
  /// primary 톤 쌍(40/100, 90/10 등)을 그대로 가져오므로 대비 관계가 유지된다.
  static ColorScheme seedScheme(Brightness brightness) {
    ColorScheme from(Color seed) => ColorScheme.fromSeed(
      seedColor: seed,
      brightness: brightness,
      dynamicSchemeVariant: DynamicSchemeVariant.tonalSpot,
    );
    final base = from(seedColor);
    final olive = from(secondarySeedColor);
    final gold = from(tertiarySeedColor);
    return base.copyWith(
      secondary: olive.primary,
      onSecondary: olive.onPrimary,
      secondaryContainer: olive.primaryContainer,
      onSecondaryContainer: olive.onPrimaryContainer,
      tertiary: gold.primary,
      onTertiary: gold.onPrimary,
      tertiaryContainer: gold.primaryContainer,
      onTertiaryContainer: gold.onPrimaryContainer,
    );
  }

  /// 밝은/어두운 테마. [dynamicScheme]이 있으면(기기 배경화면 색, Material You)
  /// 시드 구성 대신 그 구성을 쓴다. 호출자가 미리 `harmonized()`를 적용해 넘긴다.
  static ThemeData light({ColorScheme? dynamicScheme}) =>
      _build(dynamicScheme ?? seedScheme(Brightness.light));

  static ThemeData dark({ColorScheme? dynamicScheme}) =>
      _build(dynamicScheme ?? seedScheme(Brightness.dark));

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

  /// 기도문 본문 스타일(문서화된 커스텀 스타일: 읽기용으로 M3 역할보다 크다).
  /// [bold]는 강조(내 차례)용이며, 명조는 Medium(500)까지만 있다.
  static TextStyle prayerStyle(
    BuildContext context,
    PrayerFont font, {
    double? size,
    Color? color,
    bool bold = false,
  }) {
    final serif = font == PrayerFont.serif;
    return TextStyle(
      fontFamily: serif ? serifFamily : sansFamily,
      fontSize: size ?? (serif ? 25 : 24),
      height: 1.6,
      letterSpacing: -0.2,
      color: color ?? Theme.of(context).colorScheme.onSurface,
      fontWeight: bold
          ? (serif ? FontWeight.w500 : FontWeight.w600)
          : FontWeight.w400,
    );
  }

  /// M3 타입 스케일(display/headline/title/body/label × L/M/S) + Pretendard.
  /// 크기·굵기·행간은 M3 명세의 한글(dense) 기하를 그대로 쓴다.
  static TextTheme textTheme(ColorScheme scheme) {
    return Typography.dense2021.apply(
      fontFamily: sansFamily,
      displayColor: scheme.onSurface,
      bodyColor: scheme.onSurface,
    );
  }

  static ThemeData _build(ColorScheme scheme) {
    final text = textTheme(scheme);
    final overlay = systemOverlayStyle(scheme.brightness);

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: sansFamily,
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
      appBarTheme: AppBarTheme(systemOverlayStyle: overlay),
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
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppShape.extraLargeRadius),
          ),
        ),
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
