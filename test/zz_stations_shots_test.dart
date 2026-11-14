// 십자가의 길·기도 배경 스크린샷 하니스(--dart-define=STATIONS_SHOTS=<dir>). 비어 있으면 건너뛴다.
// 기도 화면 배경 4종(신비별) × 밝게/어둡게/글자 2배, 묵상 시트(둘러보기·순례·마침 기도), 목록 화면, 성당 칩, 오늘 탭 사순 카드.
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
import 'package:rosary_app/church/church_screen.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/glass/glass_catalog.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/domain/stations_series.dart';
import 'package:rosary_app/ui/art_credits_screen.dart';
import 'package:rosary_app/ui/home_screen.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
import 'package:rosary_app/ui/stations_sheet.dart';
import 'package:rosary_app/ui/widgets/stations_lent_card.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';
import 'glass_test_support.dart';

const _dir = String.fromEnvironment('STATIONS_SHOTS');

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

Widget _host(Widget home, {required Brightness b, double scale = 1}) =>
    RepaintBoundary(
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

/// 그림 자산이 실제로 디코드되도록 실제 시간을 조금 흘린다.
Future<void> _settle(WidgetTester t, [int rounds = 4]) async {
  for (var i = 0; i < rounds; i++) {
    await t.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 120)),
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
  SharedPreferences.setMockInitialValues({
    'haptic': false,
    'short_prayers_asked': true,
    ...v,
  });
  final s = await AppSettings.load();
  s.churchAvatarChosen = true;
  return s;
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
  if (_dir.isEmpty) {
    test('stations shots (skipped: set STATIONS_SHOTS)', () {});
    return;
  }
  setUpAll(_fonts);

  final variants = <(String, Brightness, double)>[
    ('light', Brightness.light, 1.0),
    ('dark', Brightness.dark, 1.0),
    ('light_x2', Brightness.light, 2.0),
  ];
  const size = Size(360, 800);

  for (final (tag, b, scale) in variants) {
    for (final set in MysterySet.values) {
      testWidgets('prayer background ${set.name} $tag', (t) async {
        _view(t, size);
        final settings = await _settings();
        final steps = buildRosarySequence(set);
        final i = steps.indexWhere(
          (s) =>
              s.kind == StepKind.hailMary && s.decade == 3 && s.beadIndex == 2,
        );
        await t.pumpWidget(
          _host(
            PrayerScreen(
              settings: settings,
              mysterySet: set,
              initialIndex: i,
              soundPlayer: _Silent(),
            ),
            b: b,
            scale: scale,
          ),
        );
        await _settle(t);
        await _shot(t, 'prayer_${set.name}_d3_$tag');
      });
    }

    testWidgets('sheet browse $tag', (t) async {
      _view(t, size);
      await t.pumpWidget(
        _host(
          _opener((c) => showStationsSheet(c, start: 5)),
          b: b,
          scale: scale,
        ),
      );
      await t.tap(find.text('open'));
      await _settle(t);
      await _shot(t, 'sheet_browse5_$tag');
      await t.drag(
        find.byKey(const ValueKey('stations-scroll')),
        const Offset(0, -600),
      );
      await _settle(t, 2);
      await _shot(t, 'sheet_browse5_scrolled_$tag');
    });

    testWidgets('sheet pilgrimage + closing $tag', (t) async {
      _view(t, const Size(412, 915));
      await t.pumpWidget(
        _host(
          _opener(
            (c) => showStationsSheet(
              c,
              start: 14,
              mode: StationsSheetMode.pilgrimage,
            ),
          ),
          b: b,
          scale: scale,
        ),
      );
      await t.tap(find.text('open'));
      await _settle(t);
      await _shot(t, 'sheet_pilgrim14_$tag');
      await t.tap(find.byKey(const ValueKey('stations-next')));
      await _settle(t);
      await _shot(t, 'sheet_closing_$tag');
    });
  }

  // 그림 연작(대체 성화): 연작마다 묵상 시트(밝게/어둡게/글자 2배) + 목록 + 출처 화면
  for (final series in StationsSeriesCatalog.all) {
    for (final (tag, b, scale) in variants) {
      testWidgets('series sheet ${series.id} $tag', (t) async {
        _view(t, size);
        await t.pumpWidget(
          _host(
            _opener(
              (c) => showStationsSheet(
                c,
                start: 4,
                series: series,
                mode: StationsSheetMode.pilgrimage,
              ),
            ),
            b: b,
            scale: scale,
          ),
        );
        await t.tap(find.text('open'));
        await _settle(t);
        await _shot(t, 'series_${series.id}_sheet4_$tag');
        await t.drag(
          find.byKey(const ValueKey('stations-scroll')),
          const Offset(0, -900),
        );
        await _settle(t, 2);
        await _shot(t, 'series_${series.id}_sheet4_credit_$tag');
      });
    }
  }

  testWidgets('series list (last church = milan)', (t) async {
    _view(t, size);
    await t.pumpWidget(
      _host(
        StationsOfCrossScreen(series: StationsSeriesCatalog.forChurch('milan')),
        b: Brightness.light,
      ),
    );
    await _settle(t);
    await _shot(t, 'series_list_milan_light');
    await t.drag(find.byType(CustomScrollView), const Offset(0, -1400));
    await _settle(t, 2);
    await _shot(t, 'series_list_milan_bottom_light');
  });

  for (final (tag, b, scale) in variants) {
    testWidgets('art credits $tag', (t) async {
      _view(t, size);
      await t.pumpWidget(_host(const ArtCreditsScreen(), b: b, scale: scale));
      await _settle(t, 2);
      await _shot(t, 'credits_top_$tag');
      await t.drag(find.byType(CustomScrollView), const Offset(0, -520));
      await _settle(t, 2);
      await _shot(t, 'credits_series_$tag');
      await t.drag(find.byType(CustomScrollView), const Offset(0, -620));
      await _settle(t, 2);
      await _shot(t, 'credits_series2_$tag');
    });
  }

  testWidgets('list screen', (t) async {
    _view(t, size);
    await t.pumpWidget(
      _host(const StationsOfCrossScreen(), b: Brightness.light),
    );
    await _settle(t);
    await _shot(t, 'list_light');
  });

  testWidgets('church chip', (t) async {
    GlassCatalog.debugSetShared(testGlassCatalogFuture());
    addTearDown(GlassCatalog.debugResetShared);
    _view(t, size);
    final settings = await _settings();
    final scene = FakeChurchSceneController();
    await t.pumpWidget(
      _host(
        ChurchScreen(settings: settings, net: FakeChurchNet(), scene: scene),
        b: Brightness.light,
      ),
    );
    await t.pump();
    scene.emit(const SceneReady());
    await t.pump();
    scene.emit(const SceneStations(candle: 1, altar: 1, cross: 14));
    scene.emit(const SceneGlassNear(id: 'dove_stpeter', slot: 'gloria'));
    scene.emit(const SceneCrossNear(5));
    await _settle(t);
    await _shot(t, 'church_chip_light');
    await t.tap(find.byKey(const ValueKey('go-button')));
    await _settle(t);
    await _shot(t, 'church_go_sheet_light');
    await t.pump(const Duration(seconds: 7));
  });

  testWidgets('today Lent card', (t) async {
    addTearDown(() => StationsLentCard.clock = DateTime.now);
    StationsLentCard.clock = () => DateTime(2027, 3, 3);
    _view(t, size);
    final settings = await _settings();
    await t.pumpWidget(
      _host(
        HomeScreen(settings: settings, soundPlayer: _Silent()),
        b: Brightness.light,
      ),
    );
    await _settle(t);
    await _shot(t, 'today_lent_light');
  });
}
