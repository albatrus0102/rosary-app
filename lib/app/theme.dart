import 'package:flutter/material.dart';

import 'settings.dart';

/// 밝고 따뜻한 모던 테마: 크림 / 테라코타 / 올리브.
abstract final class AppTheme {
  static const String sansFamily = 'Pretendard';
  static const String serifFamily = 'NotoSerifKR';

  /// 카드 모서리.
  static const double cardRadius = 20;

  /// 버튼 모서리.
  static const double buttonRadius = 16;

  static const _lightScheme = ColorScheme(
    brightness: Brightness.light,
    primary: Color(0xFFC2613E),
    onPrimary: Colors.white,
    primaryContainer: Color(0xFFF6D9CC),
    onPrimaryContainer: Color(0xFF5A2713),
    secondary: Color(0xFF7A8A5A),
    onSecondary: Colors.white,
    secondaryContainer: Color(0xFFE3E9D3),
    onSecondaryContainer: Color(0xFF3B4524),
    tertiary: Color(0xFFC9A04A),
    onTertiary: Colors.white,
    tertiaryContainer: Color(0xFFF5E7C4),
    onTertiaryContainer: Color(0xFF4D3A0E),
    error: Color(0xFFB3261E),
    onError: Colors.white,
    errorContainer: Color(0xFFF9DEDC),
    onErrorContainer: Color(0xFF410E0B),
    surface: Color(0xFFFFFCF7),
    onSurface: Color(0xFF2E2A25),
    onSurfaceVariant: Color(0xFF6F6659),
    outline: Color(0xFFD9CDBB),
    outlineVariant: Color(0xFFE8DFD0),
    shadow: Colors.black,
    scrim: Colors.black,
    inverseSurface: Color(0xFF3A342E),
    onInverseSurface: Color(0xFFF3EDE4),
    inversePrimary: Color(0xFFE89A7A),
    surfaceTint: Colors.transparent,
    surfaceContainerLowest: Colors.white,
    surfaceContainerLow: Color(0xFFFAF3E8),
    surfaceContainer: Color(0xFFF4EBDD),
    surfaceContainerHigh: Color(0xFFEFE4D3),
    surfaceContainerHighest: Color(0xFFE9DCC8),
  );

  static const _darkScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFFE89A7A),
    onPrimary: Color(0xFF3A1B0F),
    primaryContainer: Color(0xFF5A2E1D),
    onPrimaryContainer: Color(0xFFF6D9CC),
    secondary: Color(0xFFB5C28F),
    onSecondary: Color(0xFF252E10),
    secondaryContainer: Color(0xFF3A4426),
    onSecondaryContainer: Color(0xFFE3E9D3),
    tertiary: Color(0xFFE0BC6E),
    onTertiary: Color(0xFF3A2A06),
    tertiaryContainer: Color(0xFF55411A),
    onTertiaryContainer: Color(0xFFF5E3B8),
    error: Color(0xFFF2B8B5),
    onError: Color(0xFF601410),
    errorContainer: Color(0xFF8C1D18),
    onErrorContainer: Color(0xFFF9DEDC),
    surface: Color(0xFF262220),
    onSurface: Color(0xFFF3EDE4),
    onSurfaceVariant: Color(0xFFBDB2A3),
    outline: Color(0xFF5A5148),
    outlineVariant: Color(0xFF3F3832),
    shadow: Colors.black,
    scrim: Colors.black,
    inverseSurface: Color(0xFFF3EDE4),
    onInverseSurface: Color(0xFF2E2A25),
    inversePrimary: Color(0xFFC2613E),
    surfaceTint: Colors.transparent,
    surfaceContainerLowest: Color(0xFF1E1B18),
    surfaceContainerLow: Color(0xFF2A2623),
    surfaceContainer: Color(0xFF2F2A26),
    surfaceContainerHigh: Color(0xFF38322D),
    surfaceContainerHighest: Color(0xFF413A34),
  );

  static const _lightBackground = Color(0xFFFBF6EE);
  static const _darkBackground = Color(0xFF1E1B18);

  static ThemeData light() => _build(_lightScheme, _lightBackground);

  static ThemeData dark() => _build(_darkScheme, _darkBackground);

  /// 기도문 본문 스타일. [bold]는 강조(내 차례)용이며, 명조는 Medium(500)까지만 있다.
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

  static TextTheme _textTheme(ColorScheme scheme) {
    final base =
        ThemeData(
          brightness: scheme.brightness,
          fontFamily: sansFamily,
        ).textTheme.apply(
          bodyColor: scheme.onSurface,
          displayColor: scheme.onSurface,
          fontFamily: sansFamily,
        );
    TextStyle? w(TextStyle? s, FontWeight weight, {double? height}) =>
        s?.copyWith(fontWeight: weight, height: height);
    return base.copyWith(
      displayLarge: w(base.displayLarge, FontWeight.w700),
      displayMedium: w(base.displayMedium, FontWeight.w700),
      displaySmall: w(base.displaySmall, FontWeight.w700),
      headlineLarge: w(base.headlineLarge, FontWeight.w700),
      headlineMedium: w(base.headlineMedium, FontWeight.w700),
      headlineSmall: w(base.headlineSmall, FontWeight.w700),
      titleLarge: w(base.titleLarge, FontWeight.w600),
      titleMedium: w(base.titleMedium, FontWeight.w600),
      titleSmall: w(base.titleSmall, FontWeight.w600),
      bodyLarge: w(base.bodyLarge, FontWeight.w400, height: 1.5),
      bodyMedium: w(base.bodyMedium, FontWeight.w400, height: 1.5),
      bodySmall: w(base.bodySmall, FontWeight.w400, height: 1.5),
      labelLarge: w(base.labelLarge, FontWeight.w600),
      labelMedium: w(base.labelMedium, FontWeight.w500),
      labelSmall: w(base.labelSmall, FontWeight.w500),
    );
  }

  static ThemeData _build(ColorScheme scheme, Color background) {
    final text = _textTheme(scheme);
    final buttonShape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(buttonRadius),
    );
    final buttonText = text.titleMedium?.copyWith(
      fontSize: 18,
      fontWeight: FontWeight.w600,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: scheme.brightness,
      colorScheme: scheme,
      fontFamily: sansFamily,
      textTheme: text,
      scaffoldBackgroundColor: background,
      canvasColor: background,
      splashFactory: InkRipple.splashFactory,
      dividerColor: scheme.outlineVariant,
      dividerTheme: DividerThemeData(
        color: scheme.outlineVariant,
        thickness: 1,
        space: 1,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        foregroundColor: scheme.onSurface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        titleTextStyle: text.titleLarge?.copyWith(
          fontWeight: FontWeight.w700,
          color: scheme.onSurface,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        margin: EdgeInsets.zero,
        color: scheme.surface,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(cardRadius),
          side: BorderSide(color: scheme.outlineVariant),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(64, 56),
          elevation: 0,
          shape: buttonShape,
          textStyle: buttonText,
          padding: const EdgeInsets.symmetric(horizontal: 24),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(64, 48),
          foregroundColor: scheme.primary,
          side: BorderSide(color: scheme.outline),
          shape: buttonShape,
          textStyle: text.labelLarge,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: scheme.primary,
          shape: buttonShape,
          textStyle: text.labelLarge,
        ),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          shape: WidgetStatePropertyAll(
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          side: WidgetStatePropertyAll(BorderSide(color: scheme.outline)),
          minimumSize: const WidgetStatePropertyAll(Size(0, 48)),
          textStyle: WidgetStatePropertyAll(
            text.labelLarge?.copyWith(fontSize: 14),
          ),
          backgroundColor: WidgetStateProperty.resolveWith(
            (s) => s.contains(WidgetState.selected)
                ? scheme.primaryContainer
                : scheme.surface,
          ),
          foregroundColor: WidgetStateProperty.resolveWith(
            (s) => s.contains(WidgetState.selected)
                ? scheme.onPrimaryContainer
                : scheme.onSurfaceVariant,
          ),
        ),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected)
              ? scheme.onPrimary
              : scheme.outline,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected)
              ? scheme.primary
              : scheme.surfaceContainerHigh,
        ),
        trackOutlineColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected)
              ? Colors.transparent
              : scheme.outline,
        ),
      ),
      listTileTheme: ListTileThemeData(
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
        titleTextStyle: text.bodyLarge?.copyWith(
          fontWeight: FontWeight.w500,
          color: scheme.onSurface,
        ),
        subtitleTextStyle: text.bodySmall?.copyWith(
          color: scheme.onSurfaceVariant,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(cardRadius),
        ),
      ),
      sliderTheme: SliderThemeData(
        activeTrackColor: scheme.primary,
        inactiveTrackColor: scheme.primaryContainer,
        thumbColor: scheme.primary,
        overlayColor: scheme.primary.withValues(alpha: 0.12),
        valueIndicatorColor: scheme.primary,
        valueIndicatorTextStyle: text.labelMedium?.copyWith(
          color: scheme.onPrimary,
        ),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: scheme.secondary,
        linearTrackColor: scheme.secondaryContainer,
        circularTrackColor: Colors.transparent,
        linearMinHeight: 6,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: scheme.surfaceContainer,
        side: BorderSide(color: scheme.outlineVariant),
        shape: const StadiumBorder(),
        labelStyle: text.labelLarge,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: scheme.outlineVariant),
        ),
        titleTextStyle: text.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        contentTextStyle: text.bodyMedium,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: scheme.inverseSurface,
        contentTextStyle: text.bodyMedium?.copyWith(
          color: scheme.onInverseSurface,
        ),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }
}
