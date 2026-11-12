import 'package:dynamic_color/dynamic_color.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/ui/home_screen.dart';
import 'package:rosary_app/ui/rosary_style_screen.dart';
import 'package:rosary_app/ui/settings_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<AppSettings> _settings([Map<String, Object> values = const {}]) async {
  SharedPreferences.setMockInitialValues(values);
  return AppSettings.load();
}

Widget _screen(Widget home) => MaterialApp(theme: AppTheme.light(), home: home);

void _size(WidgetTester tester, Size size) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}

void main() {
  group('테마 구성', () {
    test('M3 + 시드 색 구성 + Pretendard 타입 스케일', () {
      final theme = AppTheme.light();
      expect(theme.useMaterial3, isTrue);
      expect(
        theme.colorScheme.primary,
        AppTheme.seedScheme(Brightness.light).primary,
      );
      final t = theme.textTheme;
      for (final style in [
        t.displayLarge,
        t.displayMedium,
        t.displaySmall,
        t.headlineLarge,
        t.headlineMedium,
        t.headlineSmall,
        t.titleLarge,
        t.titleMedium,
        t.titleSmall,
        t.bodyLarge,
        t.bodyMedium,
        t.bodySmall,
        t.labelLarge,
        t.labelMedium,
        t.labelSmall,
      ]) {
        expect(style?.fontFamily, AppTheme.sansFamily);
      }
      // M3 타입 스케일 크기.
      expect(t.displayLarge?.fontSize, 57);
      expect(t.headlineMedium?.fontSize, 28);
      expect(t.titleLarge?.fontSize, 22);
      expect(t.bodyLarge?.fontSize, 16);
      expect(t.labelSmall?.fontSize, 11);
    });

    test('동적 색 구성이 주어지면 그것을 쓴다', () {
      final dyn = ColorScheme.fromSeed(seedColor: const Color(0xFF3366CC));
      expect(
        AppTheme.light(dynamicScheme: dyn).colorScheme.primary,
        dyn.primary,
      );
      final dark = ColorScheme.fromSeed(
        seedColor: const Color(0xFF3366CC),
        brightness: Brightness.dark,
      );
      expect(AppTheme.dark(dynamicScheme: dark).colorScheme, dark);
    });

    test('컴포넌트 테마: 슬라이더·진행 표시줄 새 M3, 스낵바 띄움, 시트 핸들', () {
      final theme = AppTheme.light();
      // ignore: deprecated_member_use
      expect(theme.sliderTheme.year2023, isFalse);
      // ignore: deprecated_member_use
      expect(theme.progressIndicatorTheme.year2023, isFalse);
      expect(theme.snackBarTheme.behavior, SnackBarBehavior.floating);
      expect(theme.bottomSheetTheme.showDragHandle, isTrue);
      expect(theme.dialogTheme.shape, AppShape.extraLargeBorder);
      expect(
        theme.pageTransitionsTheme.builders[TargetPlatform.android],
        isA<PredictiveBackPageTransitionsBuilder>(),
      );
    });

    test('시스템 바는 투명(edge-to-edge)이고 아이콘 밝기가 반대로 선택된다', () {
      final light = AppTheme.systemOverlayStyle(Brightness.light);
      expect(light.statusBarColor, Colors.transparent);
      expect(light.systemNavigationBarColor, Colors.transparent);
      expect(light.statusBarIconBrightness, Brightness.dark);
      expect(light.systemNavigationBarContrastEnforced, isFalse);
      final dark = AppTheme.systemOverlayStyle(Brightness.dark);
      expect(dark.statusBarIconBrightness, Brightness.light);
      expect(dark.systemNavigationBarIconBrightness, Brightness.light);
    });
  });

  group('Material You 동적 색', () {
    const channel = MethodChannel('io.material.plugins/dynamic_color');
    final accent = const Color(0xFF3366CC);

    setUp(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            if (call.method == 'getAccentColor') return accent.toARGB32();
            return null; // getCorePalette: Android 12 미만/비Android
          });
    });
    tearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    testWidgets('기본값은 꺼짐이며 시드 구성을 쓴다', (tester) async {
      _size(tester, const Size(400, 800));
      final settings = await _settings();
      expect(settings.useDynamicColor, isFalse);
      await tester.pumpWidget(RosaryApp(settings));
      await tester.pump();
      final ctx = tester.element(find.byType(HomeScreen));
      expect(
        Theme.of(ctx).colorScheme.primary,
        AppTheme.seedScheme(Theme.of(ctx).brightness).primary,
      );
    });

    testWidgets('켜면 기기 색을 쓰고(오류색 harmonized), 끄면 돌아온다', (tester) async {
      _size(tester, const Size(400, 800));
      final settings = await _settings({'use_dynamic_color': true});
      expect(settings.useDynamicColor, isTrue);
      await tester.pumpWidget(RosaryApp(settings));
      await tester.pump();
      await tester.pumpAndSettle(); // 테마 전환 애니메이션이 끝날 때까지
      final ctx = tester.element(find.byType(HomeScreen));
      final brightness = Theme.of(ctx).brightness;
      final expected = ColorScheme.fromSeed(
        seedColor: accent,
        brightness: brightness,
      ).harmonized();
      expect(Theme.of(ctx).colorScheme.primary, expected.primary);
      expect(Theme.of(ctx).colorScheme.error, expected.error);

      settings.useDynamicColor = false;
      await tester.pumpAndSettle();
      expect(
        Theme.of(tester.element(find.byType(HomeScreen))).colorScheme.primary,
        AppTheme.seedScheme(brightness).primary,
      );
      // 내비게이터 상태가 유지된다(트리가 다시 만들어지지 않음).
      expect(find.byType(HomeScreen), findsOneWidget);
    });

    testWidgets('설정 화면 스위치가 useDynamicColor를 저장한다', (tester) async {
      _size(tester, const Size(800, 3200));
      final settings = await _settings();
      await tester.pumpWidget(_screen(SettingsScreen(settings: settings)));
      await tester.pump();
      const label = '기기 배경화면 색 사용(Material You)';
      expect(find.text(label), findsOneWidget);
      await tester.tap(find.text(label));
      await tester.pump();
      expect(settings.useDynamicColor, isTrue);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getBool('use_dynamic_color'), isTrue);
    });
  });

  group('접근성 가이드라인', () {
    testWidgets('홈: 터치 대상 48dp·라벨', (tester) async {
      _size(tester, const Size(400, 900));
      final handle = tester.ensureSemantics();
      final settings = await _settings();
      await tester.pumpWidget(_screen(HomeScreen(settings: settings)));
      await tester.pump();
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      handle.dispose();
    });

    testWidgets('설정: 터치 대상 48dp·라벨', (tester) async {
      _size(tester, const Size(400, 1400));
      final handle = tester.ensureSemantics();
      final settings = await _settings();
      await tester.pumpWidget(_screen(SettingsScreen(settings: settings)));
      await tester.pump();
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      handle.dispose();
    });

    testWidgets('묵주 고르기: 터치 대상 48dp·라벨', (tester) async {
      _size(tester, const Size(400, 1000));
      final handle = tester.ensureSemantics();
      final settings = await _settings();
      await tester.pumpWidget(_screen(RosaryStyleScreen(settings: settings)));
      await tester.pump();
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      handle.dispose();
    });
  });
}
