// 임시: M3 감사용 전 화면 스크린샷 하니스(--dart-define=M3_SHOTS=<dir>). 비어 있으면 건너뛴다.
import 'dart:io';
import 'dart:math';
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
import 'package:rosary_app/app/leader_audio_store.dart';
import 'package:rosary_app/auth/account_screen.dart';
import 'package:rosary_app/auth/auth_state.dart';
import 'package:rosary_app/auth/consent_screen.dart';
import 'package:rosary_app/auth/fake_auth_service.dart';
import 'package:rosary_app/auth/legal_screen.dart';
import 'package:rosary_app/auth/legal_texts.dart';
import 'package:rosary_app/auth/login_screen.dart';
import 'package:rosary_app/church/avatar/avatar_editor_screen.dart';
import 'package:rosary_app/church/avatar/baptismal_name_picker.dart';
import 'package:rosary_app/church/church_candle_sheet.dart';
import 'package:rosary_app/church/church_go_sheet.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_select_screen.dart';
import 'package:rosary_app/church/church_tab.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/glass/glass_catalog.dart';
import 'package:rosary_app/glass/glass_flat_viewer.dart';
import 'package:rosary_app/glass/glass_info_sheet.dart';
import 'package:rosary_app/glass/glass_licenses_screen.dart';
import 'package:rosary_app/glass/glass_view_screen.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';
import 'package:rosary_app/ui/app_shell.dart';
import 'package:rosary_app/ui/leader_record_screen.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
import 'package:rosary_app/ui/rosary_style_screen.dart';
import 'package:rosary_app/ui/settings_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'auth_test_support.dart';
import 'church_screen_fakes.dart';
import 'glass_test_support.dart';

const _dir = String.fromEnvironment('M3_SHOTS');

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

class _Store extends LeaderAudioStore {
  @override
  Future<void> init() async {}
  @override
  bool has(String cueId) => false;
  @override
  int get recordedCount => 0;
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

void _view(WidgetTester t, {double top = 24}) {
  t.view.devicePixelRatio = 2;
  t.view.physicalSize = const Size(360, 800) * 2;
  final p = FakeViewPadding(top: top * 2, bottom: 48);
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

/// 그림 자산이 실제로 디코드되도록 실제 시간을 조금 흘린다.
Future<void> _settle(WidgetTester t, [int rounds = 3]) async {
  for (var i = 0; i < rounds; i++) {
    await t.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 80)),
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
  return s;
}

PrayerStatsStore _stats() {
  final now = DateTime.now();
  final r = Random(3);
  return PrayerStatsStore.inMemory([
    for (var i = 0; i < 24; i++)
      PrayerRecord(
        at: now.subtract(
          Duration(days: i * 2 + r.nextInt(2), hours: r.nextInt(5)),
        ),
        set: MysterySet.values[i % 4],
        decades: i % 3 == 0 ? 1 : 5,
        hailMarys: i % 3 == 0 ? 10 : 53,
        completed: i % 3 != 0,
        seconds: 600 + r.nextInt(900),
      ),
  ]);
}

Future<void> _scroll(WidgetTester t, double dy) async {
  await t.drag(find.byType(Scrollable).first, Offset(0, -dy));
  await _settle(t, 2);
}

Widget _opener(Future<void> Function(BuildContext) open) => Scaffold(
  body: Builder(
    builder: (context) => Center(
      child: TextButton(
        onPressed: () => open(context),
        child: const Text('open'),
      ),
    ),
  ),
);

void main() {
  setUpAll(_fonts);

  final variants = <(String, Brightness, double)>[
    ('light', Brightness.light, 1.0),
    ('dark', Brightness.dark, 1.0),
    ('light_x2', Brightness.light, 2.0),
  ];

  for (final (tag, b, scale) in variants) {
    group(tag, () {
      Future<void> shell(
        WidgetTester t,
        AppShellTab tab,
        String name, {
        List<double> scrolls = const [],
      }) async {
        _view(t);
        final settings = await _settings({'short_prayers_asked': true});
        final services = AppServices.inMemory(settings, stats: _stats());
        addTearDown(services.disposeInMemory);
        await t.pumpWidget(
          _host(
            AppShell(
              settings: settings,
              initialTab: tab,
              glassCatalog: testGlassCatalogFuture(),
              churchBuilder: (_) => const Center(child: Text('church')),
              soundPlayer: _Silent(),
            ),
            b: b,
            scale: scale,
            services: services,
          ),
        );
        await _settle(t);
        await _shot(t, '${name}_$tag');
        var i = 2;
        for (final s in scrolls) {
          await _scroll(t, s);
          await _shot(t, '${name}_${i++}_$tag');
        }
      }

      testWidgets('01 glass tab', (t) async {
        await shell(t, AppShellTab.church, '01_glass', scrolls: [500]);
      });
      testWidgets('02 today', (t) async {
        await shell(t, AppShellTab.today, '02_today', scrolls: [600, 600]);
      });
      testWidgets('03 stats', (t) async {
        await shell(t, AppShellTab.stats, '03_stats', scrolls: [600, 600]);
      });
      testWidgets('04 more', (t) async {
        await shell(t, AppShellTab.more, '04_more', scrolls: [600]);
      });

      testWidgets('05 settings', (t) async {
        _view(t);
        final settings = await _settings();
        await t.pumpWidget(
          _host(
            SettingsScreen(settings: settings, soundPlayer: _Silent()),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t);
        await _shot(t, '05_settings_$tag');
        for (var i = 2; i <= 4; i++) {
          await _scroll(t, 600);
          await _shot(t, '05_settings_${i}_$tag');
        }
      });

      testWidgets('06 rosary style', (t) async {
        _view(t);
        final settings = await _settings();
        await t.pumpWidget(
          _host(
            RosaryStyleScreen(settings: settings),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t);
        await _shot(t, '06_style_$tag');
      });

      testWidgets('07 leader record', (t) async {
        _view(t);
        await t.pumpWidget(
          _host(
            LeaderRecordScreen(store: _Store()),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t);
        await _shot(t, '07_leader_$tag');
      });

      Future<void> prayer(WidgetTester t, int index) async {
        _view(t);
        final settings = await _settings({'short_prayers_asked': true});
        await t.pumpWidget(
          _host(
            PrayerScreen(
              settings: settings,
              mysterySet: MysterySet.sorrowful,
              initialIndex: index,
              soundPlayer: _Silent(),
            ),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t);
      }

      final steps = buildRosarySequence(MysterySet.sorrowful);
      testWidgets('08 prayer', (t) async {
        await prayer(
          t,
          steps.indexWhere(
            (s) =>
                s.kind == StepKind.hailMary &&
                s.decade == 1 &&
                s.beadIndex == 4,
          ),
        );
        await _shot(t, '08_prayer_$tag');
        await t.tap(find.byKey(const ValueKey('prayer-strip')));
        await _settle(t);
        await _shot(t, '08_prayer_map_$tag');
      });
      testWidgets('09 prayer done', (t) async {
        await prayer(t, steps.length - 1);
        await t.tap(find.byKey(const ValueKey('prayer-next')));
        await _settle(t);
        await _shot(t, '09_prayer_done_$tag');
      });
      testWidgets('08b prayer menu', (t) async {
        await prayer(t, 3);
        final more = find.byTooltip('더보기');
        if (more.evaluate().isNotEmpty) {
          await t.tap(more.first);
          await _settle(t);
          await _shot(t, '08b_prayer_menu_$tag');
        }
      });

      testWidgets('10 glass info sheet', (t) async {
        _view(t);
        final w = testGlassCatalog().visible.first;
        await t.pumpWidget(
          _host(
            _opener((c) => showGlassInfoSheet(c, w, onPray: () {})),
            b: b,
            scale: scale,
          ),
        );
        await t.tap(find.text('open'));
        await _settle(t);
        await _shot(t, '10_glass_info_$tag');
      });
      testWidgets('11 glass licenses', (t) async {
        _view(t);
        await t.pumpWidget(
          _host(
            GlassLicensesScreen(catalog: testGlassCatalogFuture()),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t);
        await _shot(t, '11_glass_licenses_$tag');
      });
      testWidgets('12 glass flat', (t) async {
        _view(t);
        final w = testGlassCatalog().visible.first;
        await t.pumpWidget(
          _host(
            Scaffold(
              body: GlassFlatViewer(window: w, onBack: () {}, onInfo: () {}),
            ),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t);
        await _shot(t, '12_glass_flat_$tag');
      });
      testWidgets('13 glass view', (t) async {
        _view(t);
        final w = testGlassCatalog().visible.first;
        final scene = FakeChurchSceneController();
        await t.pumpWidget(
          _host(
            GlassViewScreen(
              window: w,
              scene: scene,
              onPray: () {},
              immersive: false,
            ),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t, 1);
        await _shot(t, '13_glass_view_loading_$tag');
        scene.emit(const SceneReady());
        await _settle(t, 2);
        await _shot(t, '13_glass_view_$tag');
      });

      testWidgets('14 church select', (t) async {
        _view(t);
        final settings = await _settings();
        await t.pumpWidget(
          _host(
            Scaffold(
              body: ChurchSelectScreen(settings: settings, onEnter: (_) {}),
            ),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t);
        await _shot(t, '14_church_select_$tag');
        await _scroll(t, 600);
        await _shot(t, '14_church_select_2_$tag');
      });
      testWidgets('15 church entry', (t) async {
        _view(t);
        final settings = await _settings();
        settings.churchId = 'stpeter';
        await t.pumpWidget(
          _host(
            Scaffold(
              body: ChurchTab(
                settings: settings,
                net: FakeChurchNet(),
                scene: FakeChurchSceneController(),
              ),
            ),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t);
        await _shot(t, '15_church_entry_$tag');
      });
      testWidgets('16 avatar first', (t) async {
        _view(t);
        final settings = await _settings();
        await t.pumpWidget(
          _host(
            AvatarEditorScreen(
              settings: settings,
              firstEntry: true,
              random: Random(1),
            ),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t);
        await _shot(t, '16_avatar_first_$tag');
        await _scroll(t, 600);
        await _shot(t, '16_avatar_first_2_$tag');
      });
      testWidgets('17 name picker', (t) async {
        _view(t);
        await t.pumpWidget(
          _host(
            const BaptismalNameScreen(gender: 1, selected: 0),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t);
        await _shot(t, '17_name_picker_$tag');
      });
      testWidgets('18 church hud', (t) async {
        _view(t);
        final settings = await _settings();
        final net = FakeChurchNet();
        final scene = FakeChurchSceneController();
        await t.pumpWidget(
          _host(
            ChurchScreen(settings: settings, net: net, scene: scene),
            b: b,
            scale: scale,
          ),
        );
        await t.pump();
        scene.emit(const SceneReady());
        net.goOnline(12);
        await _settle(t, 2);
        await _shot(t, '18_church_hud_$tag');
      });
      testWidgets('18b church prayer card (sit / kneel)', (t) async {
        _view(t);
        final settings = await _settings();
        final net = FakeChurchNet();
        final scene = FakeChurchSceneController();
        await t.pumpWidget(
          _host(
            ChurchScreen(settings: settings, net: net, scene: scene),
            b: b,
            scale: scale,
          ),
        );
        await t.pump();
        scene.emit(const SceneReady());
        net.goOnline(12);
        scene.emit(const SceneNear(seat: 'L03-2'));
        await _settle(t, 2);
        await t.tap(find.text('앉기'));
        await t.pump();
        scene.emit(const SceneSeated('L03-2'));
        await _settle(t, 2);
        await _shot(t, '18b_card_sit_$tag');
        await t.tap(find.text('무릎 꿇고'));
        await _settle(t, 2);
        await _shot(t, '18b_card_kneel_$tag');
      });
      testWidgets('18c church glass chip hud', (t) async {
        GlassCatalog.debugSetShared(testGlassCatalogFuture());
        addTearDown(GlassCatalog.debugResetShared);
        _view(t);
        final settings = await _settings();
        final net = FakeChurchNet();
        final scene = FakeChurchSceneController();
        await t.pumpWidget(
          _host(
            ChurchScreen(settings: settings, net: net, scene: scene),
            b: b,
            scale: scale,
          ),
        );
        await t.pump();
        scene.emit(const SceneReady());
        net.goOnline(12);
        scene.emit(const SceneNear(seat: 'L03-2'));
        scene.emit(const SceneWalkStart('altar'));
        scene.emit(
          const SceneGlassNear(id: 'alabaster_stpaul_1', slot: 'aisle'),
        );
        await _settle(t, 2);
        await _shot(t, '18c_glass_chip_$tag');
        await t.pump(const Duration(seconds: 12));
      });
      testWidgets('19 church go sheet', (t) async {
        _view(t);
        await t.pumpWidget(
          _host(_opener((c) => showChurchGoSheet(c)), b: b, scale: scale),
        );
        await t.tap(find.text('open'));
        await _settle(t);
        await _shot(t, '19_church_go_$tag');
      });
      testWidgets('20 candle sheet', (t) async {
        _view(t);
        await t.pumpWidget(
          _host(_opener((c) => showCandleSheet(c)), b: b, scale: scale),
        );
        await t.tap(find.text('open'));
        await _settle(t);
        await _shot(t, '20_candle_$tag');
      });

      testWidgets('21 login', (t) async {
        _view(t);
        await t.pumpWidget(
          _host(
            LoginScreen(authService: FakeAuthService()),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t);
        await _shot(t, '21_login_$tag');
        await t.tap(find.byKey(const Key('login-email')));
        await _settle(t);
        await _shot(t, '21_login_email_$tag');
      });
      testWidgets('22 consent', (t) async {
        _view(t);
        final auth = FakeAuthService(
          initial: const AuthState.signedIn(
            userId: 'u1',
            email: 'me@example.com',
            provider: LoginProvider.email,
          ),
        );
        final store = await makeConsentStore(auth);
        await t.pumpWidget(
          _host(
            ConsentScreen(authService: auth, consentStore: store),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t);
        await _shot(t, '22_consent_$tag');
      });
      testWidgets('23 account', (t) async {
        _view(t);
        final auth = FakeAuthService(
          initial: const AuthState.signedIn(
            userId: 'u1',
            email: 'me@example.com',
            provider: LoginProvider.email,
          ),
        );
        final store = await makeConsentStore(auth);
        await t.pumpWidget(
          _host(
            AccountScreen(authService: auth, consentStore: store),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t);
        await _shot(t, '23_account_$tag');
        await _scroll(t, 600);
        await _shot(t, '23_account_2_$tag');
      });
      testWidgets('24 legal', (t) async {
        _view(t);
        await t.pumpWidget(
          _host(
            const LegalScreen(title: legalPrivacyTitle, body: legalPrivacyBody),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t);
        await _shot(t, '24_legal_$tag');
      });
    });
  }
}
