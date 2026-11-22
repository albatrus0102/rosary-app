// 앉은 줄(앉기만 한 상태) 스크린샷 하니스 (--dart-define=ROSARY_UI_SHOTS=<dir>; 비어 있으면 건너뛴다).
// 3D 성당(WebView)은 시험에서 그려지지 않으므로 자리표시 그림(어두운 본당)으로 대신한다.
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';

const _dir = String.fromEnvironment('ROSARY_UI_SHOTS');

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
  final l = FontLoader('MaterialIcons')
    ..addFont(
      Future.value(
        ByteData.sublistView(
          await File(
            '/home/user/sdk/flutter/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf',
          ).readAsBytes(),
        ),
      ),
    );
  await l.load();
}

/// 본당 자리표시: 어두운 바탕에 아치와 제대 불빛.
class _NaveScene extends FakeChurchSceneController {
  @override
  Widget buildView(BuildContext context) =>
      CustomPaint(painter: _NavePainter(), size: Size.infinite);
}

class _NavePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.drawRect(
      rect,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF2A2230), Color(0xFF3A3040), Color(0xFF6A5A48)],
        ).createShader(rect),
    );
    final cx = size.width / 2;
    // 제대 불빛
    canvas.drawCircle(
      Offset(cx, size.height * 0.36),
      size.width * 0.22,
      Paint()
        ..shader =
            const RadialGradient(colors: [Color(0xCCE8C77A), Color(0x00E8C77A)])
                .createShader(
                  Rect.fromCircle(
                    center: Offset(cx, size.height * 0.36),
                    radius: size.width * 0.22,
                  ),
                ),
    );
    // 아치
    final arch = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..color = const Color(0x55D8B873);
    for (var i = 0; i < 4; i++) {
      final w = size.width * (0.35 + i * 0.22);
      canvas.drawArc(
        Rect.fromCenter(
          center: Offset(cx, size.height * 0.5),
          width: w,
          height: size.height * (0.55 + i * 0.12),
        ),
        3.14,
        3.14,
        false,
        arch,
      );
    }
    // 통로 바닥 선
    for (final dx in [-0.2, 0.2]) {
      canvas.drawLine(
        Offset(cx + size.width * dx * 0.3, size.height * 0.48),
        Offset(cx + size.width * dx * 1.8, size.height),
        Paint()
          ..color = const Color(0x33FFFFFF)
          ..strokeWidth = 2,
      );
    }
  }

  @override
  bool shouldRepaint(_NavePainter old) => false;
}

Future<void> _pumpFor(WidgetTester t, int ms) async {
  await t.pump();
  await t.pump(Duration(milliseconds: ms));
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

/// 앱과 같은 글자 크기 배율(앱 전체)을 입힌 화면.
Widget _app(Widget home, AppSettings settings) => RepaintBoundary(
  key: const ValueKey('shot-root'),
  child: MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: AppTheme.light(),
    locale: const Locale('ko', 'KR'),
    supportedLocales: const [Locale('ko', 'KR')],
    localizationsDelegates: const [
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    builder: (context, child) => MediaQuery(
      data: scaledForApp(MediaQuery.of(context), settings.appTextScale),
      child: child!,
    ),
    home: home,
  ),
);

void _phone(WidgetTester t, {Size size = const Size(360, 800)}) {
  t.view.devicePixelRatio = 2;
  t.view.physicalSize = size * 2;
  const p = FakeViewPadding(top: 48, bottom: 48);
  t.view.padding = p;
  t.view.viewPadding = p;
  addTearDown(t.view.reset);
}

Future<AppSettings> _load(Map<String, Object> extra) async {
  SharedPreferences.setMockInitialValues(extra);
  return AppSettings.load();
}

void main() {
  if (_dir.isEmpty) {
    test('sit bar shots (skipped: set ROSARY_UI_SHOTS)', () {});
    return;
  }
  setUpAll(_fonts);

  Future<void> sitOnly(
    WidgetTester t, {
    Size size = const Size(360, 800),
    double scale = 1.0,
  }) async {
    _phone(t, size: size);
    final settings = await _load({'appTextScale': scale});
    settings.churchAvatarChosen = true;
    settings.churchHudCollapsed = false;
    settings.churchTourDone = true;
    final scene = _NaveScene();
    await t.pumpWidget(
      _app(
        ChurchScreen(settings: settings, net: FakeChurchNet(), scene: scene),
        settings,
      ),
    );
    await t.pump();
    scene.emit(const SceneReady());
    await _pumpFor(t, 500);
    scene.emit(const SceneNear(seat: 'a1'));
    for (var i = 0; i < 3; i++) {
      await _pumpFor(t, 150);
    }
    await t.tap(find.text('앉기'));
    await t.pump();
    scene.emit(const SceneSeated('a1'));
    for (var i = 0; i < 3; i++) {
      await _pumpFor(t, 200);
    }
  }

  testWidgets('seated bar', (t) async {
    await sitOnly(t);
    await _shot(t, 'sit_bar_360');
  });

  testWidgets('seated bar small phone, large text', (t) async {
    await sitOnly(t, size: const Size(360, 640), scale: 1.4);
    await _shot(t, 'sit_bar_360_large');
  });

  testWidgets('after 묵주기도 시작', (t) async {
    await sitOnly(t);
    await t.tap(find.byKey(const ValueKey('seated-bar-start')));
    for (var i = 0; i < 3; i++) {
      await _pumpFor(t, 200);
    }
    await _shot(t, 'sit_bar_after_start');
  });
}
