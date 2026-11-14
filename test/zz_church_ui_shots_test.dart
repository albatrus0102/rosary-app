// 성당 화면(HUD·시트·불러오기·입장) 전/후 비교 스크린샷 하니스.
// --dart-define=CHURCH_UI_SHOTS=<dir> 일 때만 돈다(비어 있으면 건너뛴다).
// 3D 장면 자리에는 실제 장면 캡처(docs/ux/screens/3d_*.jpg)를 깔아 HUD 가 장면 위에서 어떻게 보이는지 본다.
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app_services.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:rosary_app/church/church_tab.dart';
import 'package:rosary_app/glass/glass_catalog.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';
import 'package:rosary_app/ui/app_shell.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';
import 'glass_test_support.dart';

const _dir = String.fromEnvironment('CHURCH_UI_SHOTS');

class _Silent extends SoundPlayer {
  @override
  Future<void> init() async {}
  @override
  Future<void> playDecadeChime() async {}
  @override
  Future<void> playBeadTick() async {}
  @override
  Future<void> dispose() async {}
}

final Map<String, ui.Image> _bg = {};

/// 실제 3D 장면 캡처를 까는 가짜 장면.
class _ImgScene extends FakeChurchSceneController {
  _ImgScene(this.name);
  final String name;

  @override
  Widget buildView(BuildContext context) =>
      RawImage(image: _bg[name], fit: BoxFit.cover);
}

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

void _view(WidgetTester t, Size size) {
  t.view.devicePixelRatio = 2;
  t.view.physicalSize = size * 2;
  const p = FakeViewPadding(top: 48, bottom: 48);
  t.view.padding = p;
  t.view.viewPadding = p;
  addTearDown(t.view.reset);
}

Widget _host(
  Widget home, {
  required Brightness b,
  double scale = 1,
  AppServices? services,
}) {
  Widget app = RepaintBoundary(
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
        data: MediaQuery.of(context)
            .copyWith(textScaler: TextScaler.linear(scale)),
        child: c!,
      ),
      home: home,
    ),
  );
  if (services != null) {
    app = AppServicesScope(services: services, child: app);
  }
  return app;
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

Future<AppSettings> _settings([Map<String, Object> v = const {}]) async {
  SharedPreferences.setMockInitialValues({'haptic': false, ...v});
  final s = await AppSettings.load();
  s.churchAvatarChosen = true;
  s.churchId = 'stpeter';
  return s;
}

/// 실제 기기처럼 그림자를 그린다(시험 기본값은 그림자 대신 굵은 검은 테두리).
void _shotTest(String name, Future<void> Function(WidgetTester) body) {
  testWidgets(name, (t) async {
    debugDisableShadows = false;
    try {
      await body(t);
    } finally {
      debugDisableShadows = true;
    }
  });
}

void main() {
  if (_dir.isEmpty) {
    test('church ui shots (skipped: set CHURCH_UI_SHOTS)', () {});
    return;
  }
  setUpAll(() async {
    await _fonts();
    for (final n in const ['stpeter_walk', 'milan_nave', 'pew_seated']) {
      final bytes = await File('docs/ux/screens/3d_$n.jpg').readAsBytes();
      final codec = await ui.instantiateImageCodec(bytes);
      _bg[n] = (await codec.getNextFrame()).image;
    }
  });

  final variants = <(String, Size, double, Brightness)>[
    ('360', const Size(360, 800), 1.0, Brightness.light),
    ('412', const Size(412, 915), 1.0, Brightness.light),
    ('tablet', const Size(1280, 800), 1.0, Brightness.light),
    ('360x2', const Size(360, 800), 2.0, Brightness.light),
    ('360dark', const Size(360, 800), 1.0, Brightness.dark),
  ];

  for (final (tag, size, scale, b) in variants) {
    group(tag, () {
      Future<(FakeChurchNet, _ImgScene)> church(
        WidgetTester t, {
        String bg = 'stpeter_walk',
        bool ready = true,
      }) async {
        _view(t, size);
        final settings = await _settings();
        final net = FakeChurchNet();
        final scene = _ImgScene(bg);
        await t.pumpWidget(
          _host(
            ChurchScreen(settings: settings, net: net, scene: scene),
            b: b,
            scale: scale,
          ),
        );
        await t.pump();
        if (ready) {
          scene.emit(const SceneReady());
          net.goOnline(12);
          await _settle(t, 2);
        }
        return (net, scene);
      }

      _shotTest('01 walk', (t) async {
        final (_, scene) = await church(t);
        scene.emit(const SceneNear(seat: 'L03-2'));
        await _settle(t, 2);
        await _shot(t, '01_walk_$tag');
        await t.pump(const Duration(seconds: 12));
      });
      _shotTest('02 chips + banner', (t) async {
        GlassCatalog.debugSetShared(testGlassCatalogFuture());
        addTearDown(GlassCatalog.debugResetShared);
        final (_, scene) = await church(t, bg: 'milan_nave');
        scene.emit(const SceneNear(station: 'altar'));
        scene.emit(
          const SceneGlassNear(id: 'alabaster_stpaul_1', slot: 'aisle'),
        );
        scene.emit(const SceneCrossNear(3));
        scene.emit(const ScenePerf(9, tier: 'high'));
        await _settle(t, 2);
        await _shot(t, '02_chips_$tag');
        scene.emit(const SceneWalkStart('altar'));
        await _settle(t, 1);
        await _shot(t, '02b_walking_$tag');
        await t.pump(const Duration(seconds: 14));
      });
      _shotTest('03 prayer card', (t) async {
        final (_, scene) = await church(t, bg: 'pew_seated');
        scene.emit(const SceneNear(seat: 'L03-2'));
        await _settle(t, 2);
        await t.tap(find.text('앉기'));
        await t.pump();
        scene.emit(const SceneSeated('L03-2'));
        await _settle(t, 2);
        await _shot(t, '03_card_$tag');
        await t.pump(const Duration(seconds: 12));
      });
      _shotTest('04 loading / error', (t) async {
        final (_, scene) = await church(t, ready: false);
        await _settle(t, 1);
        await _shot(t, '04_loading_$tag');
        scene.failLoad();
        await _settle(t, 1);
        await _shot(t, '04b_error_$tag');
        await t.pump(const Duration(seconds: 12));
      });
      _shotTest('05 go sheet', (t) async {
        await church(t);
        await t.tap(find.byKey(const ValueKey('go-button')));
        await _settle(t, 3);
        await _shot(t, '05_go_$tag');
        await t.pump(const Duration(seconds: 12));
      });
      _shotTest('06 presence sheet', (t) async {
        await church(t);
        await t.tap(find.byKey(const ValueKey('presence-chip')));
        await _settle(t, 3);
        await _shot(t, '06_presence_$tag');
        await t.pump(const Duration(seconds: 12));
      });
      _shotTest('07 pray choice sheet', (t) async {
        final (_, scene) = await church(t, bg: 'milan_nave');
        scene.emit(const SceneNear(station: 'altar'));
        await _settle(t, 2);
        await t.tap(find.text('기도하기'));
        await _settle(t, 3);
        await _shot(t, '07_pray_$tag');
        await t.pump(const Duration(seconds: 12));
      });
      _shotTest('08 candle sheet', (t) async {
        final (_, scene) = await church(t);
        scene.emit(const SceneNear(candle: 3));
        await _settle(t, 2);
        await t.tap(find.text('초 켜기'));
        await _settle(t, 3);
        await _shot(t, '08_candle_$tag');
        await t.pump(const Duration(seconds: 12));
      });
      _shotTest('09 emote menu', (t) async {
        await church(t);
        await t.tap(find.byTooltip('인사'));
        await _settle(t, 2);
        await _shot(t, '09_emote_$tag');
        await t.pump(const Duration(seconds: 12));
      });
      _shotTest('11 avatar editor', (t) async {
        await church(t);
        await t.tap(find.byTooltip('아바타 편집'));
        await _settle(t, 4);
        await _shot(t, '11_avatar_$tag');
        await t.pump(const Duration(seconds: 12));
      });
      _shotTest('10 shell: entry → in church', (t) async {
        _view(t, size);
        final settings = await _settings({'short_prayers_asked': true});
        final services = AppServices.inMemory(
          settings,
          stats: PrayerStatsStore.inMemory(const []),
        );
        addTearDown(services.disposeInMemory);
        final net = FakeChurchNet();
        final scene = _ImgScene('stpeter_walk');
        await t.pumpWidget(
          _host(
            AppShell(
              settings: settings,
              initialTab: AppShellTab.church,
              glassCatalog: testGlassCatalogFuture(),
              churchBuilder: (_) =>
                  ChurchTab(settings: settings, net: net, scene: scene),
              soundPlayer: _Silent(),
            ),
            b: b,
            scale: scale,
            services: services,
          ),
        );
        await _settle(t);
        await _shot(t, '10_shell_entry_$tag');
        final enter = find.byKey(const ValueKey('entry-enter'));
        await t.ensureVisible(enter);
        await t.pump();
        await t.tap(enter);
        await t.pump();
        await _settle(t, 1);
        await _shot(t, '10b_shell_loading_$tag');
        scene.emit(const SceneReady());
        net.goOnline(12);
        await _settle(t, 2);
        await _shot(t, '10c_shell_church_$tag');
        await t.tap(find.byTooltip('성당 바꾸기'));
        await _settle(t, 3);
        await _shot(t, '10d_shell_select_$tag');
        await t.pump(const Duration(seconds: 12));
      });
    });
  }
}
