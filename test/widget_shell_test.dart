import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app_services.dart';
import 'package:rosary_app/app/leader_voice.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/stats/stats_screen.dart';
import 'package:rosary_app/ui/app_shell.dart';
import 'package:rosary_app/ui/home_screen.dart';
import 'package:rosary_app/ui/more_screen.dart';
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
  final services = AppServices.inMemory(settings);
  addTearDown(services.disposeInMemory);
  await tester.pumpWidget(
    AppServicesScope(
      services: services,
      child: MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(textScale)),
          child: child!,
        ),
        home: AppShell(
          settings: settings,
          churchBuilder: (_) => const Center(child: Text('church-body')),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Finder _nav(String label) =>
    find.descendant(of: find.byType(NavigationBar), matching: find.text(label));

void main() {
  testWidgets('compact width uses NavigationBar: 오늘 · 성당 · 기록 · 더보기', (
    tester,
  ) async {
    await _pumpShell(tester, const Size(360, 640));
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);
    final bar = tester.widget<NavigationBar>(find.byType(NavigationBar));
    expect(bar.destinations, hasLength(4));
    final xs = [
      for (final l in ['오늘', '성당', '기록', '더보기']) tester.getCenter(_nav(l)).dx,
    ];
    expect(xs, orderedEquals([...xs]..sort()));
    for (final old in ['기도', '묵주', '설정']) {
      expect(_nav(old), findsNothing, reason: old);
    }
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

  testWidgets('tabs switch between 오늘, 성당, 기록, 더보기', (tester) async {
    await _pumpShell(tester, const Size(360, 640));
    final stack = find.byType(IndexedStack);
    expect(tester.widget<IndexedStack>(stack).index, 0);
    expect(find.byType(HomeScreen), findsOneWidget);

    await tester.tap(_nav('성당'));
    await tester.pumpAndSettle();
    expect(tester.widget<IndexedStack>(stack).index, 1);
    expect(find.text('church-body'), findsOneWidget);

    await tester.tap(_nav('기록'));
    await tester.pumpAndSettle();
    expect(tester.widget<IndexedStack>(stack).index, 2);
    expect(find.byType(StatsScreen), findsOneWidget);
    expect(find.text('church-body'), findsNothing);

    await tester.tap(_nav('더보기'));
    await tester.pumpAndSettle();
    expect(tester.widget<IndexedStack>(stack).index, 3);
    expect(find.byType(MoreScreen), findsOneWidget);
  });

  testWidgets('더보기: 묵주 스타일·설정은 새 화면으로 열리고 뒤로 오면 더보기다', (tester) async {
    await _pumpShell(tester, const Size(360, 640));
    await tester.tap(_nav('더보기'));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('more-styles')));
    await tester.pumpAndSettle();
    expect(find.byType(RosaryStyleScreen), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.byType(RosaryStyleScreen), findsNothing);
    expect(find.byType(MoreScreen), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('more-settings')));
    await tester.pumpAndSettle();
    expect(find.byType(SettingsScreen), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.byType(MoreScreen), findsOneWidget);
  });

  testWidgets('더보기 > 정보에 비공식 고지가 있다 (D-01)', (tester) async {
    await _pumpShell(tester, const Size(360, 640));
    await tester.tap(_nav('더보기'));
    await tester.pumpAndSettle();
    expect(find.text(appUnofficialNotice), findsOneWidget);
    expect(find.textContaining(aiVoiceNotice), findsOneWidget);
  });

  testWidgets('묵주 그림·설정 열기 버튼은 새 화면을 연다', (tester) async {
    await _pumpShell(tester, const Size(360, 640));

    await tester.ensureVisible(find.text('묵주 바꾸기'));
    await tester.pump();
    await tester.tap(find.text('묵주 바꾸기'));
    await tester.pumpAndSettle();
    expect(find.byType(RosaryStyleScreen), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('후창'));
    await tester.pump();
    await tester.tap(find.text('후창'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('설정 열기'));
    await tester.pump();
    await tester.tap(find.text('설정 열기'));
    await tester.pumpAndSettle();
    expect(find.byType(SettingsScreen), findsOneWidget);
  });

  testWidgets('뒤로가기는 다른 탭에서 오늘 탭으로 돌아간다', (tester) async {
    await _pumpShell(tester, const Size(360, 640));
    await tester.tap(_nav('기록'));
    await tester.pumpAndSettle();
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(tester.widget<IndexedStack>(find.byType(IndexedStack)).index, 0);
  });

  for (final scale in [1.5, 2.0]) {
    testWidgets('no overflow at 360x640 with text scale $scale', (
      tester,
    ) async {
      await _pumpShell(tester, const Size(360, 640), textScale: scale);
      expect(tester.takeException(), isNull);
      expect(find.byType(NavigationBar), findsOneWidget);
      for (final tab in ['성당', '기록', '더보기', '오늘']) {
        await tester.tap(_nav(tab));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: tab);
      }
    });
  }
}
