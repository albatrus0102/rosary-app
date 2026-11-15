// 성당 입구 화면·앱 분위기 스크린샷 하니스(--dart-define=ENTRY_SHOTS=<dir>). 비어 있으면 건너뛴다.
//   flutter test test/zz_entry_shots_test.dart --dart-define=ENTRY_SHOTS=/tmp/shots
// 넓은 화면은 시안(1190x1322 px, 폴더블 펼침 약 768x853dp)과 나란히 볼 수 있게 같은 크기로 찍는다.
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app_services.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_entry_art.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_tab.dart';
import 'package:rosary_app/ui/app_shell.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';
import 'glass_test_support.dart';

const _dir = String.fromEnvironment('ENTRY_SHOTS');

Future<void> _fonts() async {
  Future<ByteData> load(String f) async =>
      ByteData.sublistView(await File('assets/fonts/$f').readAsBytes());
  final sans = FontLoader('Pretendard');
  for (final f in const [
    'Pretendard-Regular.otf',
    'Pretendard-Medium.otf',
    'Pretendard-SemiBold.otf',
    'Pretendard-Bold.otf',
  ]) {
    sans.addFont(load(f));
  }
  await sans.load();
  final root = Platform.environment['FLUTTER_ROOT'] ?? '/home/user/sdk/flutter';
  final icons = FontLoader('MaterialIcons')
    ..addFont(
      Future.value(
        ByteData.sublistView(
          await File(
            '$root/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf',
          ).readAsBytes(),
        ),
      ),
    );
  await icons.load();
}

/// 그림 자산이 실제로 디코드되도록 실제 시간을 조금 흘린다.
Future<void> _settle(WidgetTester t, [int rounds = 4]) async {
  for (var i = 0; i < rounds; i++) {
    await t.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 120)),
    );
    await t.pump(const Duration(milliseconds: 400));
  }
}

Future<void> _shot(WidgetTester t, String name, double pixelRatio) async {
  final boundary = t.renderObject<RenderRepaintBoundary>(
    find.byKey(const ValueKey('shot-root')),
  );
  await t.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: pixelRatio);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final f = File('$_dir/$name.png');
    await f.parent.create(recursive: true);
    await f.writeAsBytes(bytes!.buffer.asUint8List());
  });
}

void main() {
  if (_dir.isEmpty) {
    test('entry shots (skipped: ENTRY_SHOTS not set)', () {});
    return;
  }
  setUpAll(_fonts);
  setUp(ChurchEntryArt.debugReset);

  Future<void> shell(
    WidgetTester t, {
    required Size size,
    required double dpr,
    required Brightness b,
    required String name,
    AppShellTab tab = AppShellTab.church,
    double scale = 1,
    String church = 'milan',
    double top = 24,
  }) async {
    t.view.devicePixelRatio = dpr;
    t.view.physicalSize = size * dpr;
    final p = FakeViewPadding(top: top * dpr, bottom: 24 * dpr);
    t.view.padding = p;
    t.view.viewPadding = p;
    addTearDown(t.view.reset);
    SharedPreferences.setMockInitialValues({'haptic': false});
    final settings = await AppSettings.load();
    settings.churchAvatarChosen = true;
    settings.churchId = church;
    final services = AppServices.inMemory(settings);
    addTearDown(services.disposeInMemory);
    await t.runAsync(ChurchEntryArt.load);
    await t.pumpWidget(
      AppServicesScope(
        services: services,
        child: RepaintBoundary(
          key: const ValueKey('shot-root'),
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: b == Brightness.dark ? AppTheme.dark() : AppTheme.light(),
            locale: const Locale('ko', 'KR'),
            supportedLocales: const [Locale('ko', 'KR')],
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            builder: (context, c) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: TextScaler.linear(scale)),
              child: c!,
            ),
            home: AppShell(
              settings: settings,
              initialTab: tab,
              glassCatalog: testGlassCatalogFuture(),
              churchBuilder: (_) => ChurchTab(
                settings: settings,
                net: FakeChurchNet(),
                scene: FakeChurchSceneController(),
              ),
            ),
          ),
        ),
      ),
    );
    await _settle(t);
    await _shot(t, name, dpr);
  }

  // 시안과 같은 크기: 1190x1322 px(1.55 배율 → 약 768x853dp).
  const wide = Size(1190 / 1.55, 1322 / 1.55);
  const phone = Size(360, 800);

  testWidgets('wide light', (t) async {
    await shell(t, size: wide, dpr: 1.55, b: Brightness.light, name: 'entry_wide');
  });
  testWidgets('phone light', (t) async {
    await shell(t, size: phone, dpr: 3, b: Brightness.light, name: 'entry_phone');
  });
  testWidgets('wide dark', (t) async {
    await shell(t, size: wide, dpr: 1.55, b: Brightness.dark, name: 'entry_wide_dark');
  });
  testWidgets('phone dark', (t) async {
    await shell(t, size: phone, dpr: 3, b: Brightness.dark, name: 'entry_phone_dark');
  });
  testWidgets('phone light x2', (t) async {
    await shell(t, size: phone, dpr: 2, b: Brightness.light, name: 'entry_phone_x2', scale: 2);
  });
  testWidgets('phone landscape', (t) async {
    await shell(t, size: const Size(800, 360), dpr: 2, b: Brightness.light, name: 'entry_landscape');
  });
  testWidgets('expanded light', (t) async {
    await shell(t, size: const Size(1280, 800), dpr: 1, b: Brightness.light, name: 'entry_expanded', church: 'stpeter');
  });
  testWidgets('today phone', (t) async {
    await shell(t, size: phone, dpr: 3, b: Brightness.light, name: 'today_phone', tab: AppShellTab.today);
  });
  testWidgets('today phone dark', (t) async {
    await shell(t, size: phone, dpr: 3, b: Brightness.dark, name: 'today_phone_dark', tab: AppShellTab.today);
  });
  testWidgets('more phone', (t) async {
    await shell(t, size: phone, dpr: 3, b: Brightness.light, name: 'more_phone', tab: AppShellTab.more);
  });
  testWidgets('stats wide', (t) async {
    await shell(t, size: wide, dpr: 1.55, b: Brightness.light, name: 'stats_wide', tab: AppShellTab.stats);
  });
}
