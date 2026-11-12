import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:rosary_app/church/church_tab.dart';

import 'church_screen_fakes.dart';

const out =
    '/tmp/claude-0/-home-user/127c52ad-6e6f-576e-8168-2e8eda5aa1ed/scratchpad/ux_shots';

Future<void> _fonts() async {
  Future<void> load(String family, List<String> files) async {
    final l = FontLoader(family);
    for (final f in files) {
      l.addFont(Future.value(ByteData.sublistView(File(f).readAsBytesSync())));
    }
    await l.load();
  }

  await load('Pretendard', [
    'assets/fonts/Pretendard-Regular.otf',
    'assets/fonts/Pretendard-Medium.otf',
    'assets/fonts/Pretendard-SemiBold.otf',
    'assets/fonts/Pretendard-Bold.otf',
  ]);
  await load('NotoSerifKR', ['assets/fonts/NotoSerifKR-Regular.otf']);
  await load('MaterialIcons', [
    '/home/user/sdk/flutter/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf',
  ]);
}

Widget _app(Widget child) => RepaintBoundary(
  key: const ValueKey('shot'),
  child: MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: AppTheme.light().copyWith(splashFactory: InkRipple.splashFactory),
    home: child,
  ),
);

Future<void> _save(WidgetTester tester, String name) async {
  await tester.runAsync(() async {
    final b = tester.renderObject<RenderRepaintBoundary>(
      find.byKey(const ValueKey('shot')),
    );
    final img = await b.toImage(pixelRatio: 2);
    final data = await img.toByteData(format: ui.ImageByteFormat.png);
    Directory(out).createSync(recursive: true);
    File('$out/$name.png').writeAsBytesSync(data!.buffer.asUint8List());
  });
}

void main() {
  testWidgets('shots', (tester) async {
    await tester.runAsync(_fonts);
    setView(tester, const Size(360, 640));
    final settings = await loadSettings();
    settings.churchId = 'stpeter';
    await tester.pumpWidget(
      _app(
        ChurchTab(
          settings: settings,
          net: FakeChurchNet(),
          scene: FakeChurchSceneController(),
        ),
      ),
    );
    await tester.runAsync(() async {
      final ctx = tester.element(find.byType(Image).first);
      await precacheImage(
        const AssetImage('assets/church_thumbs/stpeter.png'),
        ctx,
      );
    });
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    await _save(tester, 'church_entry_card_360x640');

    // HUD
    final s2 = await loadSettings();
    final net = FakeChurchNet();
    final scene = FakeChurchSceneController();
    await tester.pumpWidget(
      _app(ChurchScreen(settings: s2, net: net, scene: scene)),
    );
    await tester.pump();
    scene.emit(const SceneReady());
    await tester.pump();
    net.goOnline(23);
    scene.emit(const SceneNear(seat: 'L03-2'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    final g = await tester.startGesture(const Offset(90, 470));
    await g.moveBy(const Offset(30, -34));
    await tester.pump(const Duration(milliseconds: 60));
    await _save(tester, 'church_hud_walk_360x640');
    await g.up();
    await tester.pump();

    scene.emit(const SceneNear(seat: 'L03-2'));
    await tester.tap(find.text('앉기'));
    await tester.pump();
    scene.emit(const SceneSeated('L03-2'));
    await tester.pump();
    for (var i = 0; i < 4; i++) {
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump();
    }
    await _save(tester, 'church_hud_prayer_360x640');
    await tester.tap(find.byKey(const ValueKey('prayer-stand')));
    await tester.pump();
  });
}
