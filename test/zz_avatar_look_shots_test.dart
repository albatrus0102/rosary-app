// 아바타 외형(docs/church/AVATAR_LOOK.md) 스크린샷 하니스(--dart-define=AVATAR_LOOK_SHOTS=<dir>). 비어 있으면 건너뛴다.
// 미리보기 8종(성별 × 머리 모양) 모음, 편집 화면·첫 설정(360x800, 글자 1배/2배).
import 'dart:io';
import 'dart:math';
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

const _dir = String.fromEnvironment('AVATAR_LOOK_SHOTS');

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
  final icons = FontLoader('MaterialIcons')
    ..addFont(
      Future.value(
        ByteData.sublistView(
          await File(
            '/home/user/sdk/flutter/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf',
          ).readAsBytes(),
        ),
      ),
    );
  await icons.load();
}

Future<void> _shot(WidgetTester t, String name) async {
  final boundary = t.renderObject<RenderRepaintBoundary>(
    find.byKey(const ValueKey('shot-root')),
  );
  await t.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final f = File('$_dir/$name.png');
    await f.parent.create(recursive: true);
    await f.writeAsBytes(bytes!.buffer.asUint8List());
  });
}

Widget _app(Widget home, {double scale = 1.0}) => RepaintBoundary(
  key: const ValueKey('shot-root'),
  child: MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: AppTheme.light(),
    builder: (context, c) => MediaQuery(
      data: MediaQuery.of(
        context,
      ).copyWith(textScaler: TextScaler.linear(scale)),
      child: c!,
    ),
    home: home,
  ),
);

void _view(WidgetTester t) {
  t.view.devicePixelRatio = 2;
  t.view.physicalSize = const Size(360, 800) * 2;
  addTearDown(t.view.reset);
}

void main() {
  if (_dir.isEmpty) {
    test('avatar look shots (skipped: set AVATAR_LOOK_SHOTS)', () {});
    return;
  }
  setUpAll(_fonts);

  testWidgets('preview grid: gender x style', (t) async {
    _view(t);
    await t.pumpWidget(
      _app(
        Scaffold(
          body: SafeArea(
            child: GridView.count(
              crossAxisCount: 2,
              childAspectRatio: 0.92,
              children: [
                for (var i = 0; i < 8; i++)
                  Center(
                    child: AvatarPreview(
                      height: 150,
                      config: AvatarConfig(
                        gender: i.isEven ? 0 : 1,
                        style: i ~/ 2,
                        skin: i % 4,
                        hair: (i * 3) % 10,
                        outfit: (i * 5 + 1) % 12,
                        name: AvatarConfig.randomCommonName(
                          i.isEven ? 0 : 1,
                          _Fixed(i),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
    await t.pump(const Duration(milliseconds: 300));
    await _shot(t, 'preview_grid');
  });

  for (final (tag, scale) in const [('x1', 1.0), ('x2', 2.0)]) {
    for (final g in [0, 1]) {
      testWidgets('editor $tag g$g', (t) async {
        _view(t);
        SharedPreferences.setMockInitialValues({});
        final settings = await AppSettings.load();
        settings.churchAvatar = AvatarConfig(
          gender: g,
          style: 1,
          skin: g,
          hair: g == 0 ? 1 : 0,
          outfit: g == 0 ? 5 : 0,
          name: AvatarConfig.randomCommonName(g, _Fixed(3)),
        );
        await t.pumpWidget(
          _app(AvatarEditorScreen(settings: settings), scale: scale),
        );
        await t.pump(const Duration(milliseconds: 400));
        await _shot(t, 'editor_${tag}_g$g');
      });
    }
    testWidgets('first setup $tag', (t) async {
      _view(t);
      SharedPreferences.setMockInitialValues({});
      final settings = await AppSettings.load();
      await t.pumpWidget(
        _app(
          AvatarEditorScreen(
            settings: settings,
            firstEntry: true,
            random: _Fixed(7),
          ),
          scale: scale,
        ),
      );
      await t.pump(const Duration(milliseconds: 400));
      await _shot(t, 'first_setup_$tag');
    });
  }
}

/// 항상 같은 순서를 내는 난수(스크린샷이 실행마다 같도록).
class _Fixed implements Random {
  _Fixed(this._seed);
  int _seed;
  @override
  int nextInt(int max) => (_seed = (_seed * 1103515245 + 12345) & 0x7fffffff) % max;
  @override
  bool nextBool() => nextInt(2) == 0;
  @override
  double nextDouble() => nextInt(1 << 20) / (1 << 20);
}
