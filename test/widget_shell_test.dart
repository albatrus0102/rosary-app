import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/ui/app_shell.dart';
import 'package:rosary_app/ui/home_screen.dart';
import 'package:rosary_app/ui/rosary_style_screen.dart';
import 'package:rosary_app/ui/settings_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<void> _pumpShell(
  WidgetTester tester,
  Size size, {
  double textScale = 1.0,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  SharedPreferences.setMockInitialValues({});
  final settings = await AppSettings.load();
  await tester.pumpWidget(
    MaterialApp(
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context)
            .copyWith(textScaler: TextScaler.linear(textScale)),
        child: child!,
      ),
      home: AppShell(settings: settings),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('compact width uses NavigationBar with 4 destinations', (
    tester,
  ) async {
    await _pumpShell(tester, const Size(360, 640));
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);
    expect(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('기도'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('묵주'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('설정'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('성당'),
      ),
      findsOneWidget,
    );
  });

  testWidgets('medium width uses a collapsed NavigationRail', (tester) async {
    await _pumpShell(tester, const Size(700, 800));
    expect(find.byType(NavigationBar), findsNothing);
    final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
    expect(rail.extended, isFalse);
    expect(rail.destinations, hasLength(4));
  });

  testWidgets('expanded width uses an extended NavigationRail', (tester) async {
    await _pumpShell(tester, const Size(1000, 800));
    final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
    expect(rail.extended, isTrue);
  });

  testWidgets('destinations switch between screens and keep state', (
    tester,
  ) async {
    await _pumpShell(tester, const Size(360, 640));
    final stack = find.byType(IndexedStack);
    expect(tester.widget<IndexedStack>(stack).index, 0);
    expect(find.byType(HomeScreen), findsOneWidget);

    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('묵주'),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.widget<IndexedStack>(stack).index, 1);
    expect(find.byType(RosaryStyleScreen), findsOneWidget);

    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('설정'),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.widget<IndexedStack>(stack).index, 2);
    expect(find.byType(SettingsScreen), findsOneWidget);
  });

  testWidgets('hero tap and 설정 열기 switch destinations', (tester) async {
    await _pumpShell(tester, const Size(360, 640));
    final stack = find.byType(IndexedStack);

    await tester.ensureVisible(find.text('묵주 바꾸기'));
    await tester.pump();
    await tester.tap(find.text('묵주 바꾸기'));
    await tester.pumpAndSettle();
    expect(tester.widget<IndexedStack>(stack).index, 1);

    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('기도'),
      ),
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('후창'));
    await tester.pump();
    await tester.tap(find.text('후창'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('설정 열기'));
    await tester.pump();
    await tester.tap(find.text('설정 열기'));
    await tester.pumpAndSettle();
    expect(tester.widget<IndexedStack>(stack).index, 2);
  });

  testWidgets('no overflow at 360x640 with text scale 1.5', (tester) async {
    await _pumpShell(tester, const Size(360, 640), textScale: 1.5);
    expect(tester.takeException(), isNull);
    expect(find.byType(NavigationBar), findsOneWidget);
  });
}
