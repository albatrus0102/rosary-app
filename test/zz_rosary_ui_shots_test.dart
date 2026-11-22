// 묵주기도 화면 고르기 시트·아래로 내리기 안내·첫 사용 안내 스크린샷 하니스
// (--dart-define=ROSARY_UI_SHOTS=<dir>). 비어 있으면 건너뛴다. 3D 묵주(WebView)는 시험에서 그려지지 않으므로
// 자리표시 그림(금빛 알 줄)으로 대신한다 — 안내·시트·카드 배치를 보는 용도다.
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_prayer_card.dart';
import 'package:rosary_app/church/church_prayer_choice_sheet.dart';
import 'package:rosary_app/church/church_rosary_panel.dart';
import 'package:rosary_app/church/church_theme.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/rosary3d/rosary_feedback.dart';
import 'package:rosary_app/rosary3d/rosary_scene.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

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

class _SilentSound extends SoundPlayer {
  @override
  Future<void> init() async {}
  @override
  Future<void> playDecadeChime() async {}
  @override
  Future<void> playBeadTick() async {}
  @override
  Future<void> dispose() async {}
}

/// 3D 묵주 자리표시: 가운데 알이 크고 위아래로 작아지는 금빛 알 줄.
class _ShotScene extends FakeRosaryScene {
  @override
  Widget buildView(BuildContext context) =>
      CustomPaint(painter: _BeadsPainter(), size: Size.infinite);
}

class _BeadsPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    canvas.drawLine(
      Offset(cx, 0),
      Offset(cx, size.height),
      Paint()
        ..color = const Color(0x66C8A865)
        ..strokeWidth = 2,
    );
    for (var i = -3; i <= 3; i++) {
      final r = i == 0 ? size.width * 0.16 : size.width * 0.11;
      final dy = i * (size.height * 0.2);
      canvas.drawCircle(
        Offset(cx, cy + dy),
        r.clamp(8.0, 40.0),
        Paint()
          ..color = i == 0 ? const Color(0xFFD8B873) : const Color(0xFF9C8450),
      );
    }
  }

  @override
  bool shouldRepaint(_BeadsPainter old) => false;
}

Future<void> _pumpFor(WidgetTester t, int ms) async {
  await t.pump();
  await t.pump(Duration(milliseconds: ms));
}

Future<void> _settle(WidgetTester t, [int rounds = 3]) async {
  for (var i = 0; i < rounds; i++) {
    await t.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 100)),
    );
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

Widget _app(Widget home, {Brightness b = Brightness.light}) => RepaintBoundary(
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
    home: home,
  ),
);

void _phone(WidgetTester t) {
  t.view.devicePixelRatio = 2;
  t.view.physicalSize = const Size(360, 800) * 2;
  const p = FakeViewPadding(top: 48, bottom: 48);
  t.view.padding = p;
  t.view.viewPadding = p;
  addTearDown(t.view.reset);
}

Future<AppSettings> _load(Map<String, Object> extra) async {
  SharedPreferences.setMockInitialValues({
    'prayer_view': 'rosary',
    'leader_audio': false,
    ...extra,
  });
  return AppSettings.load();
}

void main() {
  if (_dir.isEmpty) {
    test('rosary ui shots (skipped: set ROSARY_UI_SHOTS)', () {});
    return;
  }
  setUpAll(_fonts);

  for (final (tag, b, big) in const [
    ('small_last_light', Brightness.light, false),
    ('big_last_light', Brightness.light, true),
    ('big_last_dark', Brightness.dark, true),
  ]) {
    testWidgets('sheet $tag', (t) async {
      _phone(t);
      final settings = await _load({'churchRosaryBig': big});
      await t.pumpWidget(
        _app(
          Scaffold(
            backgroundColor: const Color(0xFF2B2622),
            body: Builder(
              builder: (context) => Center(
                child: TextButton(
                  onPressed: () =>
                      showChurchPrayerChoiceSheet(context, settings: settings),
                  child: const Text('open'),
                ),
              ),
            ),
          ),
          b: b,
        ),
      );
      await t.tap(find.text('open'));
      await _settle(t);
      await _shot(t, '1_sheet_two_buttons_$tag');
    });
  }

  testWidgets('sheet outside church (no buttons)', (t) async {
    _phone(t);
    final settings = await _load({});
    await t.pumpWidget(
      _app(
        Scaffold(
          body: Builder(
            builder: (context) => Center(
              child: TextButton(
                onPressed: () => showChurchPrayerChoiceSheet(
                  context,
                  settings: settings,
                  inChurch: false,
                ),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      ),
    );
    await t.tap(find.text('open'));
    await _settle(t);
    await _shot(t, '1b_sheet_home_no_buttons');
  });

  testWidgets('small card hint', (t) async {
    _phone(t);
    final settings = await _load({'beadSwipeLearned': 0});
    ChurchRosaryPanel.debugFeedback = RecordingRosaryFeedback();
    addTearDown(() => ChurchRosaryPanel.debugFeedback = null);
    final controller = ChurchPrayerController(
      settings: settings,
      mysterySet: MysterySet.joyful,
    );
    addTearDown(controller.dispose);
    await t.pumpWidget(
      _app(
        Builder(
          builder: (context) => ChurchTheme.wrap(
            context,
            Scaffold(
              body: Stack(
                children: [
                  const Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Color(0xFF3A3028), Color(0xFF1B1713)],
                        ),
                      ),
                    ),
                  ),
                  const Positioned(
                    top: 120,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: Text(
                        '(성당 장면 자리)',
                        style: TextStyle(color: Colors.white38),
                      ),
                    ),
                  ),
                  Align(
                    alignment: Alignment.bottomCenter,
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: ChurchRosaryPanel(
                        controller: controller,
                        settings: settings,
                        scene: _ShotScene(),
                        feedback: RecordingRosaryFeedback(),
                        onTogglePause: () {},
                        onStand: () {},
                        onPosture: (_) {},
                        onEnd: () {},
                        onFullScreen: () {},
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        b: Brightness.dark,
      ),
    );
    await _pumpFor(t, 500);
    await _shot(t, '2_hint_small_card');
  });

  testWidgets('full screen hint', (t) async {
    _phone(t);
    final settings = await _load({
      'beadSwipeLearned': 0,
      'prayerScreenTourDone': true,
    });
    await t.pumpWidget(
      _app(
        PrayerScreen(
          settings: settings,
          mysterySet: MysterySet.joyful,
          initialIndex: 3,
          soundPlayer: _SilentSound(),
          rosaryScene: _ShotScene(),
          rosaryFeedback: RecordingRosaryFeedback(),
        ),
      ),
    );
    await _pumpFor(t, 500);
    await _shot(t, '3_hint_full_screen');
  });

  for (final returnToChurch in [false, true]) {
    testWidgets('tour steps (returnToChurch: $returnToChurch)', (t) async {
      _phone(t);
      final settings = await _load({
        'beadSwipeLearned': 0,
        'prayerScreenTourDone': false,
      });
      await t.pumpWidget(
        _app(
          PrayerScreen(
            settings: settings,
            mysterySet: MysterySet.joyful,
            initialIndex: 3,
            returnToChurch: returnToChurch,
            soundPlayer: _SilentSound(),
            rosaryScene: _ShotScene(),
            rosaryFeedback: RecordingRosaryFeedback(),
          ),
        ),
      );
      for (var step = 1; step <= 5; step++) {
        await _pumpFor(t, 150);
        await _pumpFor(t, 450);
        await _shot(
          t,
          '4_tour_step${step}_${returnToChurch ? 'from_church' : 'home'}',
        );
        if (step < 5) await t.tap(find.byKey(const ValueKey('coach-next')));
      }
    });
  }

  testWidgets('classic prayer text view tour (missing targets skipped)', (
    t,
  ) async {
    _phone(t);
    final settings = await _load({
      'prayer_view': 'classic',
      'prayerScreenTourDone': false,
    });
    await t.pumpWidget(
      _app(
        PrayerScreen(
          settings: settings,
          mysterySet: MysterySet.joyful,
          initialIndex: 3,
          soundPlayer: _SilentSound(),
        ),
      ),
    );
    await _pumpFor(t, 150);
    await _pumpFor(t, 450);
    await _shot(t, '5_tour_classic_step1');
  });
}
