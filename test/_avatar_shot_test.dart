import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/avatar/avatar_config.dart';
import 'package:rosary_app/church/avatar/avatar_editor_screen.dart';
import 'package:rosary_app/church/avatar/avatar_preview.dart';
import 'package:shared_preferences/shared_preferences.dart';

const out = '/tmp/claude-0/-home-user/127c52ad-6e6f-576e-8168-2e8eda5aa1ed/scratchpad/avatar_shots';

Future<void> loadFonts() async {
  final l = FontLoader('Pretendard');
  for (final f in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
    l.addFont(Future.value(ByteData.sublistView(File('assets/fonts/Pretendard-$f.otf').readAsBytesSync())));
  }
  await l.load();
}

Future<void> shot(WidgetTester t, GlobalKey key, String name, double ratio) async {
  await t.runAsync(() async {
    final b = key.currentContext!.findRenderObject() as RenderRepaintBoundary;
    final img = await b.toImage(pixelRatio: ratio);
    final data = await img.toByteData(format: ui.ImageByteFormat.png);
    File('$out/$name').writeAsBytesSync(data!.buffer.asUint8List());
  });
}

void main() {
  testWidgets('shot grid', (tester) async {
    await loadFonts();
    tester.view.physicalSize = const Size(1400, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final key = GlobalKey();
    const cfgs = [
      AvatarConfig(skin: 0, style: 0, hair: 1, outfit: 0, name: 0),
      AvatarConfig(skin: 1, style: 1, hair: 5, outfit: 3, name: 1),
      AvatarConfig(skin: 2, style: 2, hair: 0, outfit: 5, name: 2),
      AvatarConfig(skin: 3, style: 3, hair: 7, outfit: 7, name: 3),
      AvatarConfig(skin: 1, style: 0, hair: 9, outfit: 10, name: 4),
      AvatarConfig(skin: 0, style: 1, hair: 6, outfit: 9, name: 5),
      AvatarConfig(skin: 2, style: 2, hair: 3, outfit: 11, name: 6),
      AvatarConfig(skin: 3, style: 3, hair: 2, outfit: 1, name: 7),
    ];
    await tester.pumpWidget(MaterialApp(
      theme: AppTheme.light(),
      home: Scaffold(
        body: RepaintBoundary(
          key: key,
          child: Container(
            color: const Color(0xFFFBF6EE),
            padding: const EdgeInsets.all(12),
            child: Wrap(spacing: 12, runSpacing: 12, children: [
              for (final c in cfgs) AvatarPreview(config: c, height: 300),
            ]),
          ),
        ),
      ),
    ));
    await tester.pump();
    await shot(tester, key, 'flutter_preview_grid.png', 1.0);
  });

  testWidgets('shot editor', (tester) async {
    await loadFonts();
    SharedPreferences.setMockInitialValues({});
    final settings = await AppSettings.load();
    tester.view.physicalSize = const Size(780, 1688);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final key = GlobalKey();
    await tester.pumpWidget(RepaintBoundary(
      key: key,
      child: MaterialApp(theme: AppTheme.light(), home: AvatarEditorScreen(settings: settings)),
    ));
    await tester.pumpAndSettle();
    await shot(tester, key, 'flutter_editor.png', 1.0);
  });
}
