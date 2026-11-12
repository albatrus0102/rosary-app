import 'dart:io';
import 'dart:math';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/avatar/avatar_editor_screen.dart';
import 'package:rosary_app/church/avatar/avatar_pickers.dart';
import 'package:rosary_app/church/church_constants.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _out =
    '/tmp/claude-0/-home-user/127c52ad-6e6f-576e-8168-2e8eda5aa1ed/scratchpad/namepicker_shots';
final _key = GlobalKey();

Future<void> _fonts() async {
  Future<void> family(String name, List<String> paths) async {
    final l = FontLoader(name);
    for (final p in paths) {
      l.addFont(Future.value(ByteData.sublistView(File(p).readAsBytesSync())));
    }
    await l.load();
  }

  await family('Pretendard', [
    'assets/fonts/Pretendard-Regular.otf',
    'assets/fonts/Pretendard-Medium.otf',
    'assets/fonts/Pretendard-SemiBold.otf',
    'assets/fonts/Pretendard-Bold.otf',
  ]);
  await family('MaterialIcons', [
    '/home/user/sdk/flutter/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf',
  ]);
}

Widget _app(Widget home, {bool dark = false, double scale = 1}) =>
    RepaintBoundary(
      key: _key,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        themeMode: dark ? ThemeMode.dark : ThemeMode.light,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        locale: const Locale('ko', 'KR'),
        supportedLocales: const [Locale('ko')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: home,
      ),
    );

Future<void> _shot(WidgetTester tester, String name) async {
  await tester.pump(const Duration(milliseconds: 300));
  await tester.runAsync(() async {
    final b = _key.currentContext!.findRenderObject() as RenderRepaintBoundary;
    final img = await b.toImage(pixelRatio: 2);
    final bd = await img.toByteData(format: ui.ImageByteFormat.png);
    Directory(_out).createSync(recursive: true);
    File('$_out/$name').writeAsBytesSync(bd!.buffer.asUint8List());
  });
}

void _view(WidgetTester t, Size s) {
  t.view.devicePixelRatio = 2;
  t.view.physicalSize = s * 2;
  addTearDown(t.view.reset);
}

void main() {
  Future<void> openPicker(WidgetTester t, {int gender = 0, int selected = 5, bool dark = false, double scale = 1, Size size = const Size(360, 800)}) async {
    _view(t, size);
    await t.pumpWidget(const SizedBox());
    await t.runAsync(_fonts);
    await t.pumpWidget(_app(Builder(builder: (c) => Scaffold(body: Center(child: FilledButton(onPressed: () => showBaptismalNamePicker(c, gender: gender, selected: selected), child: const Text('open'))))), dark: dark, scale: scale));
    await t.tap(find.text('open'));
    await t.pumpAndSettle();
  }

  testWidgets('shots', (t) async {
    SharedPreferences.setMockInitialValues({});
    final settings = await AppSettings.load();
    _view(t, const Size(360, 800));
    await t.runAsync(_fonts);
    await t.pumpWidget(_app(AvatarEditorScreen(settings: settings, firstEntry: true, random: Random(5))));
    await t.pumpAndSettle();
    await _shot(t, 'setup_row_360x800.png');

    await openPicker(t);
    await _shot(t, 'picker_light_popular_360x800.png');
    await t.tap(find.byKey(const ValueKey('name-rail-ㅁ')));
    await t.pumpAndSettle();
    await _shot(t, 'picker_light_jump_m_360x800.png');
    final g = await t.startGesture(t.getCenter(find.byKey(const ValueKey('name-rail-ㅅ'))));
    await g.moveTo(t.getCenter(find.byKey(const ValueKey('name-rail-ㅇ'))));
    await t.pump();
    await _shot(t, 'picker_light_rail_drag_360x800.png');
    await g.up();
    await t.pumpAndSettle();

    await openPicker(t, selected: femaleBaptismalNames.indexOf('힐데가르트'), dark: true);
    await _shot(t, 'picker_dark_selected_last_360x800.png');
    await t.tap(find.byKey(const ValueKey('name-rail-ㅂ')));
    await t.pumpAndSettle();
    await _shot(t, 'picker_dark_jump_360x800.png');
    await t.enterText(find.byKey(const ValueKey('name-search')), '리');
    await t.pumpAndSettle();
    await _shot(t, 'picker_dark_search_360x800.png');
    await t.enterText(find.byKey(const ValueKey('name-search')), '없는');
    await t.pumpAndSettle();
    await _shot(t, 'picker_dark_empty_360x800.png');

    await openPicker(t, gender: 1, selected: maleBaptismalNames.indexOf('안토니오'));
    await _shot(t, 'picker_light_male_selected_360x800.png');
    await t.enterText(find.byKey(const ValueKey('name-search')), '바울');
    await t.pumpAndSettle();
    await _shot(t, 'picker_light_alias_360x800.png');

    await openPicker(t, scale: 2.0, size: const Size(360, 640), selected: 20);
    await _shot(t, 'picker_light_scale2_360x640.png');
    await t.enterText(find.byKey(const ValueKey('name-search')), '아');
    await t.pumpAndSettle();
    await _shot(t, 'picker_light_scale2_search_360x640.png');

    _view(t, const Size(360, 640));
    await t.pumpWidget(_app(AvatarEditorScreen(settings: settings, firstEntry: true, random: Random(5)), scale: 2.0));
    await t.pumpAndSettle();
    await _shot(t, 'setup_scale2_360x640.png');
  });
}
