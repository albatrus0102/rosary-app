import 'package:flutter/material.dart';

import '../app/settings.dart';
import '../app/theme.dart';

/// 성당 화면 전용 M3 테마: **따뜻한 먹색 표면 + 촛불 금색**.
///
/// 3D 성당(석재·나무·금박·촛불) 위에 밝은 분홍/테라코타 앱 테마가 떠 있으면 UI 가 장면과 따로 논다.
/// 그래서 성당 안(장면 위 HUD, 성당 안에서 여는 시트·메뉴·알림, 불러오기 화면)은 시스템 밝기와
/// 상관없이 이 어두운 금색 테마를 쓴다. M3 를 버리는 것이 아니라 **색 구성(ColorScheme)만 바꾼
/// 같은 M3 테마**다: 컴포넌트 테마·모양·간격·모션은 [AppTheme.fromScheme]이 만든 것을 그대로 쓰고,
/// 여기서는 '가는 금색 테두리'(outlineVariant)가 필요한 표면(시트·카드·메뉴·알림·칩)만 덧붙인다.
///
/// ## 색 역할표(모두 고정값, 대비는 `test/church_theme_test.dart`가 지킨다)
///
/// | 역할 | 값 | 쓰는 곳 |
/// |---|---|---|
/// | `surface` | #15110C 먹색 | 화면 바탕·불러오기 화면, HUD 표면(불투명도 [ChurchHudStyle]) |
/// | `surfaceContainerLowest…Highest` | #0F0C08 → #382F23 | 시트(Low)·카드·메뉴(Container)·선택 안 된 항목(High/Highest) |
/// | `onSurface` | #F3E9D6 양피지색 | 본문·제목 |
/// | `onSurfaceVariant` | #D5C6A9 | 보조 글·라벨 |
/// | `primary` / `onPrimary` | #E7C46C 촛불 금색 / #3B2C00 | 주 행동(상황 버튼), 선 아이콘, 진행 표시, 강조 글 |
/// | `primaryContainer` / `on…` | #564209 / #FFE29B | '가기' 표시기, 강조 표면 |
/// | `secondary` / `onSecondary` | #D8C7A1 / #3A2F14 | 보조 강조 |
/// | `secondaryContainer` / `on…` | #453A25 / #F5E3BB | 선택된 항목(세그먼트·목록·칩), tonal 버튼 |
/// | `tertiary` / `onTertiary` | #F1B36E 불꽃 호박색 / #482A00 | 촛불·봉헌 같은 따뜻한 포인트 |
/// | `tertiaryContainer` / `on…` | #663E08 / #FFDDB7 | 포인트 표면 |
/// | `outline` | #A8946C | 입력란·버튼 테두리(비텍스트 3:1) |
/// | `outlineVariant` | #7C6635 | **가는 금색 테두리**(HUD 표면·시트·카드·구분선) |
/// | `error` 계열 | M3 어두운 기본 | 오류 |
/// | `inverseSurface` / `onInverse…` / `inversePrimary` | #F3E9D6 / #2B241A / #735B0C | 반전 표면(드물게) |
abstract final class ChurchTheme {
  static const ColorScheme scheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFFE7C46C),
    onPrimary: Color(0xFF3B2C00),
    primaryContainer: Color(0xFF564209),
    onPrimaryContainer: Color(0xFFFFE29B),
    secondary: Color(0xFFD8C7A1),
    onSecondary: Color(0xFF3A2F14),
    secondaryContainer: Color(0xFF453A25),
    onSecondaryContainer: Color(0xFFF5E3BB),
    tertiary: Color(0xFFF1B36E),
    onTertiary: Color(0xFF482A00),
    tertiaryContainer: Color(0xFF663E08),
    onTertiaryContainer: Color(0xFFFFDDB7),
    error: Color(0xFFFFB4AB),
    onError: Color(0xFF690005),
    errorContainer: Color(0xFF93000A),
    onErrorContainer: Color(0xFFFFDAD6),
    surface: Color(0xFF15110C),
    onSurface: Color(0xFFF3E9D6),
    onSurfaceVariant: Color(0xFFD5C6A9),
    surfaceDim: Color(0xFF15110C),
    surfaceBright: Color(0xFF3D3428),
    surfaceContainerLowest: Color(0xFF0F0C08),
    surfaceContainerLow: Color(0xFF1D1811),
    surfaceContainer: Color(0xFF221C14),
    surfaceContainerHigh: Color(0xFF2D261B),
    surfaceContainerHighest: Color(0xFF382F23),
    outline: Color(0xFFA8946C),
    outlineVariant: Color(0xFF7C6635),
    shadow: Color(0xFF000000),
    scrim: Color(0xFF000000),
    inverseSurface: Color(0xFFF3E9D6),
    onInverseSurface: Color(0xFF2B241A),
    inversePrimary: Color(0xFF735B0C),
    // 높이에 따른 색 입힘은 쓰지 않는다(표면 단계는 surfaceContainer* 로만 나눈다).
    surfaceTint: Color(0x00000000),
  );

  /// 가는 금색 테두리(1dp, `outlineVariant`). 성당 안의 떠 있는 표면이 모두 이것을 쓴다.
  static const BorderSide hairline = BorderSide(color: Color(0xFF7C6635));

  static final Map<PrayerFont, ThemeData> _cache = {};

  /// 성당 테마. 글꼴은 앱 설정(고딕/시스템)을 따른다.
  static ThemeData data([PrayerFont font = PrayerFont.gothic]) =>
      _cache[font] ??= _build(font);

  /// [context]의 앱 테마와 같은 글꼴을 쓰는 성당 테마.
  static ThemeData of(BuildContext context) {
    final family = Theme.of(context).textTheme.bodyMedium?.fontFamily;
    return data(
      family == AppTheme.sansFamily ? PrayerFont.gothic : PrayerFont.system,
    );
  }

  /// [child]를 성당 테마로 감싼다(성당 안에서 여는 전체 화면용).
  static Widget wrap(BuildContext context, Widget child) =>
      Theme(data: of(context), child: child);

  static ThemeData _build(PrayerFont font) {
    final base = AppTheme.fromScheme(scheme, font);
    final text = base.textTheme;
    return base.copyWith(
      scaffoldBackgroundColor: scheme.surface,
      // 시트: 한 단계 밝은 먹색 + 위쪽 금색 가는 테두리.
      bottomSheetTheme: base.bottomSheetTheme.copyWith(
        backgroundColor: scheme.surfaceContainerLow,
        modalBackgroundColor: scheme.surfaceContainerLow,
        dragHandleColor: scheme.outline,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppShape.extraLargeRadius),
          ),
          side: hairline,
        ),
      ),
      dialogTheme: base.dialogTheme.copyWith(
        backgroundColor: scheme.surfaceContainerHigh,
        shape: const RoundedRectangleBorder(
          borderRadius: AppShape.extraLarge,
          side: hairline,
        ),
      ),
      popupMenuTheme: base.popupMenuTheme.copyWith(
        color: scheme.surfaceContainer,
        shape: const RoundedRectangleBorder(
          borderRadius: AppShape.small,
          side: hairline,
        ),
      ),
      // 알림: 밝은 반전 표면 대신 같은 먹색 표면(금색 테두리)으로 세계관을 잇는다.
      snackBarTheme: base.snackBarTheme.copyWith(
        backgroundColor: scheme.surfaceContainerHighest,
        contentTextStyle: text.bodyMedium?.copyWith(color: scheme.onSurface),
        actionTextColor: scheme.primary,
        closeIconColor: scheme.onSurfaceVariant,
        shape: const RoundedRectangleBorder(
          borderRadius: AppShape.small,
          side: hairline,
        ),
      ),
      // 목록의 선 아이콘은 금색(HUD 아이콘과 같은 규칙).
      listTileTheme: base.listTileTheme.copyWith(iconColor: scheme.primary),
      tooltipTheme: base.tooltipTheme.copyWith(
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest,
          borderRadius: AppShape.extraSmall,
          border: const Border.fromBorderSide(hairline),
        ),
        textStyle: text.bodySmall?.copyWith(color: scheme.onSurface),
      ),
    );
  }
}
