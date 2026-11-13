import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app_services.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:rosary_app/church/church_tab.dart';
import 'package:rosary_app/ui/app_shell.dart';

import 'church_screen_fakes.dart';
import 'glass_test_support.dart';

void main() {
  testWidgets('repro: tab switch re-enters', (tester) async {
    setView(tester, const Size(400, 800));
    final settings = await loadSettings();
    settings.churchId = 'basic';
    final services = AppServices.inMemory(settings);
    addTearDown(services.disposeInMemory);
    final net = FakeChurchNet();
    final scene = FakeChurchSceneController();
    await tester.pumpWidget(
      AppServicesScope(
        services: services,
        child: wrapApp(
          AppShell(
            settings: settings,
            glassCatalog: testGlassCatalogFuture(),
            churchBuilder: (_) => ChurchTab(
              settings: settings,
              net: net,
              scene: scene,
              availableIds: const {'basic', 'stpeter'},
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.descendant(of: find.byKey(const ValueKey('glass-segment')), matching: find.text('성당')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('entry-enter')));
    await tester.pump();
    scene.emit(const SceneReady());
    await tester.pump();
    expect(find.byType(ChurchScreen), findsOneWidget);
    final before = tester.state(find.byType(ChurchScreen));
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('오늘')));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    debugPrint('after tab away: screens=${find.byType(ChurchScreen, skipOffstage: false).evaluate().length} disconnects=${net.disconnects}');
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('유리화')));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    debugPrint('back: screens=${find.byType(ChurchScreen).evaluate().length} entry=${find.byKey(const ValueKey('entry-enter')).evaluate().length} connects=${net.connectedIds}');
    expect(find.byType(ChurchScreen), findsOneWidget);
    expect(tester.state(find.byType(ChurchScreen)), same(before));
  });
}
