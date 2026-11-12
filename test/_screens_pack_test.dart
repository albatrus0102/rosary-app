// TEMPORARY: screenshot pack generator. Deleted after use.
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';
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
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/stats/prayer_record.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';
import 'package:rosary_app/ui/app_shell.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';

const _scratch =
    '/tmp/claude-0/-home-user/127c52ad-6e6f-576e-8168-2e8eda5aa1ed/scratchpad';
const _out = '$_scratch/flutter_out';
const _threeD = '$_scratch/3d';
const _flutterBin = '/home/user/sdk/flutter/bin';

final _boundaryKey = GlobalKey();

class _SilentSoundPlayer extends SoundPlayer {
  @override
  Future<void> init() async {}
  @override
  Future<void> playDecadeChime() async {}
  @override
  Future<void> playBeadTick() async {}
  @override
  Future<void> dispose() async {}
}

/// 3D 스크린샷을 장면 배경으로 쓰는 가짜 장면.
class _BgScene extends FakeChurchSceneController {
  _BgScene(this.bytes);
  final Uint8List bytes;
  late final MemoryImage image = MemoryImage(bytes);

  @override
  Widget buildView(BuildContext context) => SizedBox.expand(
    child: Image(image: image, fit: BoxFit.cover, gaplessPlayback: true),
  );
}

Future<void> _loadFonts() async {
  Future<void> family(String name, List<String> paths) async {
    final l = FontLoader(name);
    for (final p in paths) {
      final b = File(p).readAsBytesSync();
      l.addFont(Future.value(ByteData.sublistView(b)));
    }
    await l.load();
  }

  await family('Pretendard', [
    'assets/fonts/Pretendard-Regular.otf',
    'assets/fonts/Pretendard-Medium.otf',
    'assets/fonts/Pretendard-SemiBold.otf',
    'assets/fonts/Pretendard-Bold.otf',
  ]);
  await family('NotoSerifKR', [
    'assets/fonts/NotoSerifKR-Regular.otf',
    'assets/fonts/NotoSerifKR-Medium.otf',
  ]);
  await family('MaterialIcons', [
    '$_flutterBin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf',
  ]);
}

void _phone(WidgetTester tester) {
  tester.view.devicePixelRatio = 2;
  tester.view.physicalSize = const Size(720, 1600);
  addTearDown(tester.view.reset);
}

Widget _app(Widget home, {AppServices? services, bool dark = false}) {
  final app = MaterialApp(
    debugShowCheckedModeBanner: false,
    themeMode: dark ? ThemeMode.dark : ThemeMode.light,
    theme: AppTheme.light().copyWith(splashFactory: InkRipple.splashFactory),
    darkTheme: AppTheme.dark().copyWith(splashFactory: InkRipple.splashFactory),
    locale: const Locale('ko', 'KR'),
    supportedLocales: const [Locale('ko')],
    localizationsDelegates: const [
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    builder: (context, child) => AnnotatedRegion<SystemUiOverlayStyle>(
      value: AppTheme.systemOverlayStyle(Theme.of(context).brightness),
      child: child ?? const SizedBox.shrink(),
    ),
    home: home,
  );
  return RepaintBoundary(
    key: _boundaryKey,
    child: services == null
        ? app
        : AppServicesScope(services: services, child: app),
  );
}

/// 이미지 디코딩 등 실제 비동기를 흘려보낸 뒤 몇 프레임 진행한다.
Future<void> _settle(WidgetTester tester, {int rounds = 4}) async {
  for (var i = 0; i < rounds; i++) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 150)),
    );
    await tester.pump(const Duration(milliseconds: 120));
  }
  await tester.pump(const Duration(milliseconds: 450));
}

Future<void> _shot(WidgetTester tester, String name) async {
  await _settle(tester, rounds: 2);
  await tester.runAsync(() async {
    final b =
        _boundaryKey.currentContext!.findRenderObject()
            as RenderRepaintBoundary;
    final img = await b.toImage(pixelRatio: 2);
    final bd = await img.toByteData(format: ui.ImageByteFormat.png);
    Directory(_out).createSync(recursive: true);
    File('$_out/$name').writeAsBytesSync(bd!.buffer.asUint8List());
  });
  // ignore: avoid_print
  print('SHOT $name');
}

Future<AppSettings> _settings({
  Map<String, Object> extra = const {},
  bool avatarChosen = true,
}) async {
  SharedPreferences.setMockInitialValues({...extra});
  final s = await AppSettings.load();
  s.churchAvatarChosen = avatarChosen;
  return s;
}

/// 올해/이번 달에 걸친 그럴듯한 기록 ~40건.
List<PrayerRecord> _records() {
  final now = DateTime.now();
  final rnd = Random(11);
  final recs = <PrayerRecord>[];
  const sets = MysterySet.values;
  void add(DateTime at, {bool church = false}) {
    final done = rnd.nextDouble() < 0.7;
    final dec = done ? 5 : 1 + rnd.nextInt(4);
    recs.add(
      PrayerRecord(
        at: at,
        set: sets[rnd.nextInt(sets.length)],
        decades: dec,
        hailMarys: dec * 10,
        completed: done,
        seconds: 420 + dec * 150 + rnd.nextInt(240),
        source: church ? PrayerRecord.sourceChurch : PrayerRecord.sourceApp,
      ),
    );
  }

  // 이번 달: 오늘까지 이어진 연속 며칠 + 띄엄띄엄.
  for (final back in [0, 1, 2, 3, 5, 6, 8, 9, 10]) {
    final d = now.subtract(Duration(days: back));
    if (d.month != now.month) continue;
    add(DateTime(d.year, d.month, d.day, 6 + rnd.nextInt(3), rnd.nextInt(50)));
    if (back == 1 || back == 6) {
      add(DateTime(d.year, d.month, d.day, 21, 5), church: true);
    }
  }
  // 올해 앞선 달들.
  for (var m = 1; m < now.month; m++) {
    final n = 2 + rnd.nextInt(4);
    for (var i = 0; i < n; i++) {
      add(
        DateTime(
          now.year,
          m,
          1 + rnd.nextInt(27),
          6 + rnd.nextInt(14),
          rnd.nextInt(59),
        ),
        church: rnd.nextDouble() < 0.2,
      );
    }
  }
  return recs;
}

Future<void> _tapTab(WidgetTester tester, String label) async {
  await tester.tap(
    find.descendant(of: find.byType(NavigationBar), matching: find.text(label)),
  );
  await _settle(tester);
}

Uint8List? _bg(String name) {
  final f = File('$_threeD/$name');
  return f.existsSync() ? f.readAsBytesSync() : null;
}

Future<void> _precache(WidgetTester tester, _BgScene scene) async {
  await tester.runAsync(() async {
    final ctx = tester.element(find.byType(ChurchScreen));
    await precacheImage(scene.image, ctx);
  });
}

Future<void> _anim(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 20));
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pump();
}

Future<({AppSettings settings, FakeChurchNet net, _BgScene scene})> _pumpChurch(
  WidgetTester tester, {
  required String church,
  required String bg,
  int online = 9,
  bool avatarChosen = true,
}) async {
  _phone(tester);
  final settings = await _settings(avatarChosen: avatarChosen);
  settings.churchId = church;
  final net = FakeChurchNet();
  final scene = _BgScene(_bg(bg) ?? Uint8List(0));
  await tester.pumpWidget(
    _app(
      ChurchScreen(
        settings: settings,
        churchId: church,
        net: net,
        scene: scene,
      ),
    ),
  );
  await tester.pump();
  scene.emit(const SceneReady());
  await tester.pump();
  if (online > 0) net.goOnline(online);
  await _anim(tester);
  return (settings: settings, net: net, scene: scene);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    await _loadFonts();
  });

  Future<(AppSettings, AppServices)> shellEnv() async {
    final settings = await _settings();
    final stats = PrayerStatsStore.inMemory(_records());
    final services = AppServices.inMemory(settings, stats: stats);
    addTearDown(services.disposeInMemory);
    return (settings, services);
  }

  testWidgets(
    'shell light: 01 today, 15 more, 14 stats, 06 church entry, 07 select',
    (tester) async {
      _phone(tester);
      final (settings, services) = await shellEnv();
      await tester.pumpWidget(
        _app(AppShell(settings: settings), services: services),
      );
      await _settle(tester);
      await _shot(tester, '01_today_home.png');
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -520));
      await _settle(tester);
      await _shot(tester, '01b_today_home_scrolled.png');
      await _tapTab(tester, '더보기');
      await _shot(tester, '15_more_menu.png');
      await _tapTab(tester, '기록');
      await _shot(tester, '14_stats_record.png');
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -600));
      await _settle(tester);
      await _shot(tester, '14b_stats_record_scrolled.png');
      await _tapTab(tester, '성당');
      await _shot(tester, '06_church_entry_card.png');
      await tester.tap(find.text('다른 성당 고르기'));
      await _settle(tester);
      await _shot(tester, '07_church_select_list.png');
    },
  );

  testWidgets('shell dark: 16 today, 18 stats', (tester) async {
    _phone(tester);
    final (settings, services) = await shellEnv();
    await tester.pumpWidget(
      _app(AppShell(settings: settings), services: services, dark: true),
    );
    await _settle(tester);
    await _shot(tester, '16_today_home_dark.png');
    await _tapTab(tester, '기록');
    await _shot(tester, '18_stats_record_dark.png');
  });

  Widget prayer(
    AppSettings settings, {
    int initialIndex = 12,
    AppServices? services,
    bool dark = false,
  }) => _app(
    PrayerScreen(
      settings: settings,
      mysterySet: MysterySet.joyful,
      initialIndex: initialIndex,
      soundPlayer: _SilentSoundPlayer(),
    ),
    services: services,
    dark: dark,
  );

  testWidgets('prayer: 02, 04, 17', (tester) async {
    _phone(tester);
    final settings = await _settings();
    await tester.pumpWidget(prayer(settings));
    await _settle(tester);
    await _shot(tester, '02_prayer_default.png');
    await tester.tap(find.byTooltip('메뉴'));
    await _settle(tester, rounds: 2);
    await tester.tap(find.text('묵주 전체 보기'));
    await _settle(tester);
    await _shot(tester, '04_prayer_map_sheet.png');
  });

  testWidgets('prayer dark: 17', (tester) async {
    _phone(tester);
    final settings = await _settings();
    await tester.pumpWidget(prayer(settings, dark: true));
    await _settle(tester);
    await _shot(tester, '17_prayer_default_dark.png');
  });

  testWidgets('prayer large text: 03', (tester) async {
    _phone(tester);
    final settings = await _settings(extra: {'prayer_text_scale': 2.0});
    await tester.pumpWidget(prayer(settings));
    await _settle(tester);
    // 큰 글씨 첫 진입 때 한 번 뜨는 '짧게 보기' 제안은 닫고(그대로) 본문을 찍는다.
    if (find.text('그대로').evaluate().isNotEmpty) {
      await tester.tap(find.text('그대로'));
      await _settle(tester);
    }
    await _shot(tester, '03_prayer_large_text.png');
  });

  testWidgets('prayer done: 05', (tester) async {
    _phone(tester);
    final settings = await _settings();
    final services = AppServices.inMemory(
      settings,
      stats: PrayerStatsStore.inMemory(_records()),
    );
    addTearDown(services.disposeInMemory);
    await tester.pumpWidget(
      _app(
        Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: TextButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => PrayerScreen(
                      settings: settings,
                      mysterySet: MysterySet.joyful,
                      soundPlayer: _SilentSoundPlayer(),
                      onOpenStats: () {},
                    ),
                  ),
                ),
                child: const Text('open'),
              ),
            ),
          ),
        ),
        services: services,
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));
    final total = buildRosarySequence(MysterySet.joyful).length;
    for (var i = 0; i < total; i++) {
      await tester.tap(find.text('다음'));
      await tester.pump(const Duration(milliseconds: 50));
    }
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.textContaining('기록됨'), findsOneWidget);
    await _shot(tester, '05_prayer_done.png');
  });

  testWidgets('church setup: 08, 09', (tester) async {
    _phone(tester);
    final settings = await _settings(avatarChosen: false);
    final net = FakeChurchNet();
    final scene = FakeChurchSceneController();
    await tester.pumpWidget(
      _app(
        ChurchScreen(
          settings: settings,
          churchId: 'stpeter',
          net: net,
          scene: scene,
          random: Random(7),
        ),
      ),
    );
    await tester.pump();
    scene.emit(const SceneReady());
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('처음 오셨네요'), findsOneWidget);
    await _shot(tester, '08_church_first_setup.png');
    await tester.tap(find.byKey(const ValueKey('name-change')));
    await _settle(tester);
    expect(find.text('세례명 고르기'), findsOneWidget);
    await _shot(tester, '09_church_name_picker.png');
  });

  testWidgets('church hud walk: 10', (tester) async {
    final h = await _pumpChurch(
      tester,
      church: 'stpeter',
      bg: '3d_stpeter_walk.png',
      online: 12,
    );
    await _precache(tester, h.scene);
    h.scene.emit(const SceneNear(seat: 'L03-2'));
    await _anim(tester);
    final g = await tester.startGesture(const Offset(80, 560));
    await tester.pump();
    await g.moveBy(const Offset(22, -34));
    await tester.pump(const Duration(milliseconds: 60));
    await _shot(tester, '10_church_hud_walk.png');
    await g.up();
    await tester.pump();
  });

  testWidgets('church go sheet: 11', (tester) async {
    final h = await _pumpChurch(
      tester,
      church: 'milan',
      bg: '3d_milan_nave.png',
      online: 5,
    );
    await _precache(tester, h.scene);
    await tester.tap(find.byKey(const ValueKey('go-button')));
    await _anim(tester);
    expect(find.text('어디로 갈까요?'), findsOneWidget);
    await _shot(tester, '11_church_go_sheet.png');
  });

  testWidgets('church sitting prayer card: 12', (tester) async {
    final h = await _pumpChurch(
      tester,
      church: 'stpeter',
      bg: '3d_pew_seated.png',
      online: 12,
    );
    await _precache(tester, h.scene);
    h.scene.emit(const SceneNear(seat: 'L03-2'));
    await _anim(tester);
    await tester.tap(find.text('앉기'));
    await tester.pump();
    h.scene.emit(const SceneSeated('L03-2'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 47));
    await _anim(tester);
    expect(find.byKey(const ValueKey('prayer-card')), findsOneWidget);
    await _shot(tester, '12_church_sitting_prayer_card.png');
    await tester.tap(find.byKey(const ValueKey('prayer-stand')));
    await tester.pump();
  });

  testWidgets('candle sheet: 13', (tester) async {
    final h = await _pumpChurch(
      tester,
      church: 'florence',
      bg: '3d_florence_octagon.png',
      online: 8,
    );
    await _precache(tester, h.scene);
    h.scene.emit(const SceneNear(candle: 5));
    await _anim(tester);
    await tester.tap(find.text('초 켜기'));
    await tester.pumpAndSettle();
    await _shot(tester, '13_candle_sheet.png');
  });
}
