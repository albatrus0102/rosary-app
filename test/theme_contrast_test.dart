import 'package:dynamic_color/dynamic_color.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/theme.dart';

/// WCAG 2.x 대비비: (밝은 쪽 + 0.05) / (어두운 쪽 + 0.05).
double contrast(Color a, Color b) {
  final la = a.computeLuminance();
  final lb = b.computeLuminance();
  final hi = la > lb ? la : lb;
  final lo = la > lb ? lb : la;
  return (hi + 0.05) / (lo + 0.05);
}

/// (이름, 앞/뒤 색 선택자, 최소 대비). 텍스트·아이콘은 4.5:1, 윤곽선은 3:1.
typedef _Pair = (
  String,
  Color Function(ColorScheme),
  Color Function(ColorScheme),
  double,
);

final List<_Pair> _pairs = [
  ('onSurface/surface', (s) => s.onSurface, (s) => s.surface, 4.5),
  (
    'onSurfaceVariant/surface',
    (s) => s.onSurfaceVariant,
    (s) => s.surface,
    4.5,
  ),
  ('onPrimary/primary', (s) => s.onPrimary, (s) => s.primary, 4.5),
  (
    'onPrimaryContainer/primaryContainer',
    (s) => s.onPrimaryContainer,
    (s) => s.primaryContainer,
    4.5,
  ),
  (
    'onSecondaryContainer/secondaryContainer',
    (s) => s.onSecondaryContainer,
    (s) => s.secondaryContainer,
    4.5,
  ),
  (
    'onTertiaryContainer/tertiaryContainer',
    (s) => s.onTertiaryContainer,
    (s) => s.tertiaryContainer,
    4.5,
  ),
  ('onError/error', (s) => s.onError, (s) => s.error, 4.5),
  (
    'onSurface/surfaceContainerHighest',
    (s) => s.onSurface,
    (s) => s.surfaceContainerHighest,
    4.5,
  ),
  ('outline/surface (비텍스트)', (s) => s.outline, (s) => s.surface, 3.0),
  // 화면에서 실제로 겹쳐 쓰는 조합.
  (
    'onSurfaceVariant/surfaceContainerHigh',
    (s) => s.onSurfaceVariant,
    (s) => s.surfaceContainerHigh,
    4.5,
  ),
  (
    'onSurfaceVariant/surfaceContainerLow',
    (s) => s.onSurfaceVariant,
    (s) => s.surfaceContainerLow,
    4.5,
  ),
  ('primary/surface (링크·머리글)', (s) => s.primary, (s) => s.surface, 4.5),
  (
    'onErrorContainer/errorContainer',
    (s) => s.onErrorContainer,
    (s) => s.errorContainer,
    4.5,
  ),
  (
    'onInverseSurface/inverseSurface',
    (s) => s.onInverseSurface,
    (s) => s.inverseSurface,
    4.5,
  ),
];

void _checkScheme(String name, ColorScheme scheme) {
  group(name, () {
    for (final (label, fg, bg, min) in _pairs) {
      test('$label >= $min:1', () {
        final ratio = contrast(fg(scheme), bg(scheme));
        expect(
          ratio,
          greaterThanOrEqualTo(min),
          reason: '$label = ${ratio.toStringAsFixed(2)}:1',
        );
      });
    }
  });
}

void main() {
  group('앱 시드 색 구성', () {
    _checkScheme('light', AppTheme.seedScheme(Brightness.light));
    _checkScheme('dark', AppTheme.seedScheme(Brightness.dark));
  });

  // 기기 배경화면 색(Material You)은 dynamic_color가 만든 구성을 harmonized()로
  // 다듬어 쓴다. 기기마다 달라서 대표 배경화면 색 몇 개로 같은 경로를 시험한다.
  group('동적 색(Material You) 형태의 구성', () {
    const wallpapers = <String, Color>{
      'blue': Color(0xFF3366CC),
      'green': Color(0xFF2E7D32),
      'pink': Color(0xFFD81B60),
      'yellow': Color(0xFFF9A825),
    };
    for (final MapEntry(key: label, value: seed) in wallpapers.entries) {
      for (final b in Brightness.values) {
        _checkScheme(
          '$label ${b.name}',
          ColorScheme.fromSeed(seedColor: seed, brightness: b).harmonized(),
        );
      }
    }
  });

  test('앱 고유 구성은 갈색·금색 계열을 유지한다', () {
    final light = AppTheme.seedScheme(Brightness.light);
    final hsl = HSLColor.fromColor(light.primary);
    // 짙은 갈색(주황~적갈) 계열: 색상각 0~40도, 어두운 톤.
    expect(hsl.hue, inInclusiveRange(0, 40));
    expect(hsl.lightness, lessThan(0.35));
    // 금색(노랑~주황) 계열 강조색.
    for (final b in Brightness.values) {
      final gold = AppTheme.seedScheme(b);
      final hue = HSLColor.fromColor(
        b == Brightness.dark ? gold.primary : gold.tertiary,
      ).hue;
      expect(hue, inInclusiveRange(30, 55), reason: '$b');
    }
  });

  // 내비게이션(레일·하단 바)은 밝은 테마에서도 어두운 구성(AppDecor.chrome)을 쓴다.
  group('내비게이션(어두운 갈색) 구성', () {
    final chrome = AppTheme.light().extension<AppDecor>()!.chrome;
    test('밝은 테마의 내비게이션은 어두운 구성이다', () {
      expect(chrome.brightness, Brightness.dark);
      expect(AppTheme.dark().extension<AppDecor>()!.chrome, chrome);
    });
    for (final (label, fg, bg, min) in <_Pair>[
      (
        '라벨(onSurface)/레일 바탕(surfaceContainer)',
        (s) => s.onSurface,
        (s) => s.surfaceContainer,
        4.5,
      ),
      (
        '아이콘(onSurfaceVariant)/레일 바탕',
        (s) => s.onSurfaceVariant,
        (s) => s.surfaceContainer,
        4.5,
      ),
      (
        '선택 아이콘(onSecondaryContainer)/표시기(secondaryContainer)',
        (s) => s.onSecondaryContainer,
        (s) => s.secondaryContainer,
        4.5,
      ),
    ]) {
      test('$label >= $min:1', () {
        expect(contrast(fg(chrome), bg(chrome)), greaterThanOrEqualTo(min));
      });
    }
  });

  // 장식 금색: 선택 표시(고른 카드 테두리)·세그먼트 윤곽으로도 쓰므로 표면 위에서 3:1 이상.
  for (final b in Brightness.values) {
    test('장식 금색/표면 >= 3:1 (${b.name})', () {
      final theme = b == Brightness.dark ? AppTheme.dark() : AppTheme.light();
      final gold = theme.extension<AppDecor>()!.gold;
      for (final bg in [
        theme.colorScheme.surface,
        theme.colorScheme.surfaceContainerLow,
      ]) {
        expect(contrast(gold, bg), greaterThanOrEqualTo(3.0));
      }
    });
  }
}
