// 첫 사용 안내(앱 소개·성당 안내·더보기 사용법 다시 보기) 스크린샷 하니스
// (--dart-define=ROSARY_UI_SHOTS=<dir>; 값은 PNG를 쓸 폴더). 비어 있으면 건너뛴다.
// 3D 성당(WebView)은 시험에서 그려지지 않으므로 자리표시 그림(어두운 본당)으로 대신한다 —
// 안내 카드·테두리·손가락 그림의 배치를 보는 용도다.
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
import 'package:rosary_app/ui/more_screen.dart';
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
        ..shader = const RadialGradient(
          colors: [Color(0xCCE8C77A), Color(0x00E8C77A)],
        ).createShader(
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

/// 그림 해독(비동기)과 쪽 넘김 전환이 끝나도록 기다린다.
Future<void> _settleArt(WidgetTester t) async {
  for (var i = 0; i < 3; i++) {
    await t.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 150)));
    await t.pump(const Duration(milliseconds: 400));
  }
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

Finder get _next => find.byKey(const ValueKey('tour-next'));

void main() {
  if (_dir.isEmpty) {
    test('onboarding ui shots (skipped: set ROSARY_UI_SHOTS)', () {});
    return;
  }
  setUpAll(_fonts);

  // --- 앱 소개 ---
  testWidgets('app intro pages', (t) async {
    _phone(t);
    final settings = await _load({'appIntroDone': false});
    await t.pumpWidget(
      RepaintBoundary(
        key: const ValueKey('shot-root'),
        child: RosaryApp(settings),
      ),
    );
    await _pumpFor(t, 300);
    Future<void> nextPage() async {
      await t.tap(find.byKey(const ValueKey('intro-next')));
      await _settleArt(t);
    }

    await _settleArt(t);
    await _shot(t, 'intro_1_welcome');
    await nextPage();
    await _shot(t, 'intro_2_tabs');
    await nextPage();
    await _shot(t, 'intro_3_church');
    await nextPage();
    await _shot(t, 'intro_4_text_size_normal');
    await t.tap(find.byKey(const ValueKey('intro-size-1')));
    await _pumpFor(t, 400);
    await _shot(t, 'intro_4_text_size_large');
    await t.tap(find.byKey(const ValueKey('intro-size-2')));
    await _pumpFor(t, 400);
    await _shot(t, 'intro_4_text_size_xlarge');
  });

  testWidgets('app intro small phone, large text', (t) async {
    _phone(t, size: const Size(320, 568));
    final settings = await _load({'appIntroDone': false, 'appTextScale': 1.4});
    await t.pumpWidget(
      RepaintBoundary(
        key: const ValueKey('shot-root'),
        child: RosaryApp(settings),
      ),
    );
    await _settleArt(t);
    await _shot(t, 'intro_small_1');
    for (var i = 2; i <= 4; i++) {
      await t.tap(find.byKey(const ValueKey('intro-next')));
      await _settleArt(t);
      await _shot(t, 'intro_small_$i');
    }
  });

  // --- 성당 안내 ---
  Future<(AppSettings, _NaveScene)> pumpTour(
    WidgetTester t, {
    double appScale = 1.0,
  }) async {
    final settings = await _load({'appTextScale': appScale});
    settings.churchAvatarChosen = true;
    settings.churchHudCollapsed = false;
    settings.churchTourDone = false;
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
    return (settings, scene);
  }

  testWidgets('church tour steps', (t) async {
    _phone(t);
    final (_, scene) = await pumpTour(t);
    await _shot(t, 'tour_1_walk');
    await t.tap(_next);
    await _pumpFor(t, 500);
    await _shot(t, 'tour_2_look');
    await t.tap(_next);
    await _pumpFor(t, 500);
    await _shot(t, 'tour_3_go');
    await t.tap(_next);
    await _pumpFor(t, 500);
    await _shot(t, 'tour_4_context_none');
    scene.emit(const SceneNear(seat: 'a1'));
    // 단추가 나타나는 전환(0.2초)이 끝나고 안내가 자리를 다시 잴 때까지.
    for (var i = 0; i < 4; i++) {
      await _pumpFor(t, 150);
    }
    await _shot(t, 'tour_4_context_button');
    await t.tap(_next);
    await _pumpFor(t, 500);
    await _shot(t, 'tour_5_menu');
  });

  testWidgets('church tour praise', (t) async {
    _phone(t);
    final (_, scene) = await pumpTour(t);
    scene.emit(const ScenePos(0, 0, 0, true));
    scene.emit(const ScenePos(0, 3, 0, true));
    await _pumpFor(t, 300);
    await _shot(t, 'tour_1b_praise');
  });

  testWidgets('church tour small phone, large text', (t) async {
    // 320 폭에서는 (안내와 무관하게) 펼친 도구 줄이 원래 9px 넘치므로 가장 흔한 작은 폰 폭으로 본다.
    _phone(t, size: const Size(360, 640));
    final (_, _) = await pumpTour(t, appScale: 1.4);
    await _shot(t, 'tour_small_1_walk');
    await t.tap(_next);
    await _pumpFor(t, 500);
    await _shot(t, 'tour_small_2_look');
    await t.tap(_next);
    await _pumpFor(t, 500);
    await _shot(t, 'tour_small_3_go');
    await t.tap(_next);
    await _pumpFor(t, 500);
    await _shot(t, 'tour_small_4_context');
    await t.tap(_next);
    await _pumpFor(t, 500);
    await _shot(t, 'tour_small_5_menu');
  });

  // --- 더보기: 사용법 다시 보기 ---
  testWidgets('more help entry', (t) async {
    _phone(t);
    final settings = await _load({});
    await t.pumpWidget(
      _app(
        MoreScreen(
          settings: settings,
          onOpenStyles: () {},
          onOpenSettings: () {},
        ),
        settings,
      ),
    );
    await _pumpFor(t, 300);
    await t.scrollUntilVisible(
      find.byKey(const ValueKey('more-help')),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await _pumpFor(t, 300);
    await _shot(t, 'more_help_entry');
    await t.tap(find.byKey(const ValueKey('more-help')));
    await _pumpFor(t, 600);
    await _shot(t, 'more_help_choices');
  });
}
