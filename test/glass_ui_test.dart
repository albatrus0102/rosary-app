import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/analytics.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/glass/glass_catalog.dart';
import 'package:rosary_app/glass/glass_flat_viewer.dart';
import 'package:rosary_app/glass/glass_gallery.dart';
import 'package:rosary_app/glass/glass_info_sheet.dart';
import 'package:rosary_app/glass/glass_licenses_screen.dart';
import 'package:rosary_app/glass/glass_policy.dart';
import 'package:rosary_app/glass/glass_view_screen.dart';

import 'glass_test_support.dart';

Future<void> _startAnalytics() async {
  Analytics.debugReset();
  addTearDown(Analytics.debugReset);
  await Analytics.init(
    uploader: FakeEventUploader(),
    consent: (_) => true,
    userId: 'user-1',
    appVersion: '1.0.0+1',
    platform: 'android',
    store: MemoryQueueStore(),
    observeLifecycle: false,
    trackAppOpen: false,
    throwOnUnknownEvent: true,
    batchSize: 1000,
  );
}

List<Map<String, dynamic>> _events(String name) => [
  for (final e in Analytics.instance.queuedForTest)
    if (e['name'] == name) Map<String, dynamic>.from(e['props'] as Map),
];

void _size(WidgetTester tester, [Size size = const Size(360, 800)]) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}

Widget _app(Widget child, {double textScale = 1.0, Brightness? brightness}) =>
    MaterialApp(
      theme: ThemeData(
        useMaterial3: true,
        brightness: brightness ?? Brightness.light,
        splashFactory: InkRipple.splashFactory,
      ),
      builder: (context, c) => MediaQuery(
        data: MediaQuery.of(context)
            .copyWith(textScaler: TextScaler.linear(textScale)),
        child: c!,
      ),
      home: Scaffold(body: child),
    );

/// 덮개(위쪽 줄)가 보이는 상태인가(투명도 1).
bool chromeShown(WidgetTester tester) {
  final o = tester.widget<AnimatedOpacity>(
    find
        .ancestor(
          of: find.byKey(const ValueKey('view-back')),
          matching: find.byType(AnimatedOpacity),
        )
        .first,
  );
  return o.opacity == 1;
}

void main() {
  late GlassCatalog catalog;
  setUp(() {
    catalog = testGlassCatalog();
  });
  tearDown(Analytics.debugReset);

  group('gallery (G-06)', () {
    final fixedDay = DateTime(2026, 11, 12, 9);

    Future<List<(GlassWindow, String)>> pumpGallery(
      WidgetTester tester, {
      Size size = const Size(360, 800),
      double textScale = 1.0,
      Brightness? brightness,
      VoidCallback? onPray,
    }) async {
      _size(tester, size);
      final opened = <(GlassWindow, String)>[];
      await tester.pumpWidget(
        _app(
          GlassGallery(
            catalog: catalog,
            now: () => fixedDay,
            onOpen: (w, from) => opened.add((w, from)),
            onOpenPrayer: onPray == null ? null : (_) => onPray(),
          ),
          textScale: textScale,
          brightness: brightness,
        ),
      );
      await tester.pump();
      return opened;
    }

    testWidgets('shows today\'s window, the count and builds cards lazily', (
      tester,
    ) async {
      await pumpGallery(tester);
      expect(find.byKey(const ValueKey('glass-today')), findsOneWidget);
      final today = catalog.windowOfTheDay(fixedDay)!;
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('glass-today')),
          matching: find.text(today.titleKo),
        ),
        findsOneWidget,
      );
      expect(find.text('창 46개'), findsOneWidget);
      final built = find.byType(GlassCard).evaluate().length;
      expect(built, greaterThan(0));
      expect(built, lessThan(46), reason: 'cards beyond the viewport are lazy');
    });

    testWidgets('card heights follow each window\'s real aspect ratio', (
      tester,
    ) async {
      await pumpGallery(tester, size: const Size(900, 3000));
      GlassWindow w(String id) => catalog.byId(id)!;
      double tile(String id) {
        final size = tester.getSize(find.byKey(ValueKey('glass-card-$id')));
        return size.height;
      }

      // 같은 열 폭에서 길쭉한 창이 정사각 창보다 높다(비율 한계 안에서).
      expect(w('lancet_gesta').aspect, lessThan(0.3));
      expect(w('rose_chartres_south').aspect, 1.0);
      final cols = 3; // medium(600~840): 3열, 900폭은 expanded: 4열
      expect(cols, isPositive);
      final tall = tile('lancet_gesta');
      final square = tile('rose_chartres_south');
      expect(tall, greaterThan(square));
      expect(
        glassTileAspect(w('lancet_gesta').aspect),
        kTileMinAspect,
        reason: 'very tall windows are letterboxed in a capped tile',
      );
      expect(glassTileAspect(1.0), 1.0);
      expect(glassTileAspect(1.75), kTileMaxAspect);
    });

    testWidgets('filters: sheet chips, active chips, clear-all, empty state', (
      tester,
    ) async {
      await _startAnalytics();
      await pumpGallery(tester);
      await tester.tap(find.byKey(const ValueKey('filter-church')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('opt-chartres')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('filter-done')));
      await tester.pumpAndSettle();
      final n = catalog.bySite('샤르트르').length;
      expect(find.text('창 46개 중 $n개'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('active-church-chartres')),
        findsOneWidget,
      );
      expect(_events('glass_filter'), [
        {'kind': 'church', 'value': 'chartres'},
      ]);

      // 형태 필터와 겹치면(AND) 더 줄어든다.
      await tester.tap(find.byKey(const ValueKey('filter-shape')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('opt-rose')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('filter-done')));
      await tester.pumpAndSettle();
      final roses = catalog
          .bySite('샤르트르')
          .where((w) => w.shape == GlassForm.rose)
          .length;
      expect(find.text('창 46개 중 $roses개'), findsOneWidget);

      // 모두 지우기
      await tester.tap(find.byKey(const ValueKey('filter-clear-all')));
      await tester.pumpAndSettle();
      expect(find.text('창 46개'), findsOneWidget);
      expect(find.byKey(const ValueKey('filter-clear-all')), findsNothing);

      // 맞는 창이 없는 조합 → 빈 상태
      await tester.tap(find.byKey(const ValueKey('filter-church')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('opt-sainte_chapelle')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('filter-done')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('filter-shape')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('opt-lancet')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('filter-done')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('glass-empty')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('empty-clear')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('glass-empty')), findsNothing);
      expect(find.text('창 46개'), findsOneWidget);
      Analytics.debugReset();
    });

    testWidgets('tapping the today card and a grid card opens the window', (
      tester,
    ) async {
      final opened = await pumpGallery(tester);
      await tester.tap(find.byKey(const ValueKey('today-open')));
      await tester.pump();
      final today = catalog.windowOfTheDay(fixedDay)!;
      expect(opened.single.$1.id, today.id);
      expect(opened.single.$2, 'today');
      await tester.tap(find.byType(GlassCard).first);
      await tester.pump();
      expect(opened.last.$2, 'gallery');
    });

    testWidgets('prayer strip and today pray button call the prayer entry', (
      tester,
    ) async {
      var prayed = 0;
      await pumpGallery(tester, onPray: () => prayed++);
      await tester.tap(find.byKey(const ValueKey('glass-prayer-strip')));
      await tester.tap(find.byKey(const ValueKey('today-pray')));
      expect(prayed, 2);
    });

    testWidgets(
      'cards expose title, place, form and badge to a screen reader',
      (tester) async {
        final handle = tester.ensureSemantics();
        await pumpGallery(tester);
        final first = tester.widget<GlassCard>(find.byType(GlassCard).first);
        final w = first.window;
        expect(
          find.bySemanticsLabel(
            RegExp('^${RegExp.escape(w.titleKo)}, ${RegExp.escape(w.place)}'),
          ),
          findsWidgets,
        );
        handle.dispose();
      },
    );

    for (final scale in [1.0, 2.0]) {
      for (final b in [Brightness.light, Brightness.dark]) {
        testWidgets('no overflow at 360 wide, text scale $scale, ${b.name}', (
          tester,
        ) async {
          await pumpGallery(tester, textScale: scale, brightness: b);
          expect(tester.takeException(), isNull);
          await tester.drag(
            find.byKey(const ValueKey('glass-gallery-scroll')),
            const Offset(0, -1500),
          );
          await tester.pump();
          expect(tester.takeException(), isNull);
        });
      }
    }

    testWidgets('wide window uses more columns without overflow', (
      tester,
    ) async {
      await pumpGallery(tester, size: const Size(1100, 800));
      expect(tester.takeException(), isNull);
      final xs = {
        for (final e in find.byType(GlassCard).evaluate())
          tester.getTopLeft(find.byWidget(e.widget)).dx.round(),
      };
      expect(xs.length, 4);
    });
  });

  group('info sheet (G-09)', () {
    Future<void> openSheet(
      WidgetTester tester,
      GlassWindow w, {
      double textScale = 1.0,
    }) async {
      _size(tester);
      await tester.pumpWidget(
        _app(
          Builder(
            builder: (context) => TextButton(
              onPressed: () => showGlassInfoSheet(context, w, onPray: () {}),
              child: const Text('open'),
            ),
          ),
          textScale: textScale,
        ),
      );
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
    }

    testWidgets('shows facts, verify chip, badge, credit exactly and review', (
      tester,
    ) async {
      await _startAnalytics();
      final w = catalog.byId('rose_chartres_north')!;
      await openSheet(tester, w);
      expect(find.text(w.titleKo), findsOneWidget);
      expect(find.text(w.location), findsOneWidget);
      expect(find.textContaining('c. 1235년'), findsOneWidget);
      expect(find.textContaining('작가 미상'), findsOneWidget);
      expect(find.text('확인 중'), findsOneWidget);
      expect(find.text(w.description), findsOneWidget);
      expect(find.textContaining('같은 양식의 다른 성당 창을 참고 배치했습니다'), findsOneWidget);
      expect(find.text('참고 배치'), findsOneWidget);
      // 크기: 가로만 알려진 장미창은 '지름 10.5m'
      expect(find.text('지름 10.5m'), findsOneWidget);
      expect(find.byKey(const ValueKey('info-credit')), findsOneWidget);
      expect(find.text(w.source.credit), findsOneWidget);
      expect(find.text('검토 대기'), findsNWidgets(2));
      expect(find.text(kGlassUnofficialNote), findsOneWidget);
      expect(_events('glass_info'), [
        {'win': 'rose_chartres_north', 'section': 'about'},
      ]);
      Analytics.debugReset();
    });

    testWidgets('unknown author is 미상, unknown size is marked', (tester) async {
      final w = catalog.byId('milan_apse_lower')!;
      await openSheet(tester, w);
      expect(find.textContaining('미상 · 미상'), findsOneWidget);
      expect(find.text('크기 미확인'), findsOneWidget);
      // 이탈리아 문화재 고지
      expect(find.text(kGlassHeritageNote), findsOneWidget);
      expect(find.textContaining('실제 창입니다'), findsOneWidget);
    });

    testWidgets('CC BY credit is highlighted with the required line', (
      tester,
    ) async {
      final w = catalog.byId('rose_notredame_north')!;
      await openSheet(tester, w);
      expect(find.text('작가 표시가 필요한 사진입니다'), findsOneWidget);
      expect(find.text(w.source.credit), findsOneWidget);
      // 카탈로그 표시 문구에 변경 여부가 이미 있으면 같은 줄을 되풀이하지 않는다.
      expect(w.source.credit, contains(kGlassChangeNote));
      expect(find.text('변경'), findsNothing);
      expect(find.text(w.source.url), findsOneWidget);
    });

    testWidgets('no meditation section while the policy flag is off', (
      tester,
    ) async {
      expect(kWindowMeditationsEnabled, isFalse);
      await openSheet(tester, catalog.byId('dove_stpeter')!);
      expect(find.text('묵상'), findsNothing);
    });

    testWidgets('no overflow at text scale 2.0', (tester) async {
      await openSheet(tester, catalog.byId('lancet_gesta')!, textScale: 2.0);
      expect(tester.takeException(), isNull);
    });
  });

  group('flat viewer (G-10)', () {
    testWidgets('zooms to 8x, resets, shows the colour note', (tester) async {
      _size(tester);
      final w = catalog.byId('rose_chartres_north')!;
      var back = 0;
      var info = 0;
      final zooms = <double>[];
      await tester.pumpWidget(
        _app(
          GlassFlatViewer(
            window: w,
            onBack: () => back++,
            onInfo: () => info++,
            onZoom: zooms.add,
          ),
        ),
      );
      await tester.pump();
      final iv = tester.widget<InteractiveViewer>(
        find.byKey(const ValueKey('flat-viewer')),
      );
      expect(iv.maxScale, 8);
      expect(iv.minScale, 1);
      expect(find.text(GlassFlatViewer.colorNote), findsOneWidget);
      expect(GlassFlatViewer.colorNote, contains('보정한 사진'));
      await tester.tap(find.byKey(const ValueKey('view-back')));
      await tester.tap(find.byKey(const ValueKey('view-info')));
      expect((back, info), (1, 1));

      // 확대 → 두 번 탭으로 처음 구도.
      iv.transformationController!.value = Matrix4.diagonal3Values(4, 4, 1);
      await tester.pump();
      expect(find.byKey(const ValueKey('flat-reset')), findsOneWidget);
      await tester.tapAt(const Offset(180, 400));
      await tester.pump(const Duration(milliseconds: 50));
      await tester.tapAt(const Offset(180, 400));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(iv.transformationController!.value.isIdentity(), isTrue);
    });

    testWidgets('chrome hides after idle and returns on an edge tap', (
      tester,
    ) async {
      _size(tester);
      await tester.pumpWidget(
        _app(
          GlassFlatViewer(
            window: catalog.byId('dove_stpeter')!,
            onBack: () {},
            onInfo: () {},
          ),
        ),
      );
      await tester.pump();
      expect(chromeShown(tester), isTrue);
      await tester.pump(const Duration(seconds: 3, milliseconds: 100));
      expect(chromeShown(tester), isFalse);
      await tester.tapAt(const Offset(180, 20));
      // 두 번 탭 인식기가 끝나길 기다린다.
      await tester.pump(const Duration(milliseconds: 400));
      expect(chromeShown(tester), isTrue);
    });
  });

  group('view screen (G-07 bridge, Dart side)', () {
    late FakeChurchSceneController scene;

    Future<void> openView(
      WidgetTester tester, {
      bool? startFlat,
      VoidCallback? onPray,
      GlassWindow? window,
    }) async {
      _size(tester);
      scene = FakeChurchSceneController();
      final w = window ?? catalog.byId('rose_chartres_north')!;
      await tester.pumpWidget(
        _app(
          Builder(
            builder: (context) => TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  settings: const RouteSettings(name: 'glass_view'),
                  builder: (_) => GlassViewScreen(
                    window: w,
                    scene: scene,
                    from: 'today',
                    onPray: onPray,
                    startFlat: startFlat,
                    immersive: false,
                  ),
                ),
              ),
              child: const Text('open'),
            ),
          ),
        ),
      );
      await tester.tap(find.text('open'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
    }

    testWidgets('init as glass_room (solo), viewWindow, shimmer until ready', (
      tester,
    ) async {
      await _startAnalytics();
      await openView(tester);
      expect(find.byKey(const ValueKey('view-loading')), findsOneWidget);
      expect(scene.count('init'), 0);

      scene.emit(const SceneReady());
      await tester.pump();
      final init = scene.lastArgs('init')!;
      expect(init['church'], 'glass_room');
      expect(init['solo'], isTrue);
      expect(init['ambient'], isFalse);
      expect(scene.lastView, {
        'win': 'rose_chartres_north',
        'mode': 'room',
        'tier': 't1',
        'light': 'ref',
      });
      expect(find.byKey(const ValueKey('view-loading')), findsOneWidget);

      scene.emitViewReady(win: 'rose_chartres_north', tier: 't2', ms: 640);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byKey(const ValueKey('view-loading')), findsNothing);
      expect(_events('glass_open'), [
        {'win': 'rose_chartres_north', 'from': 'today', 'view': 'room'},
      ]);
      expect(_events('glass_load'), [
        {'win': 'rose_chartres_north', 'tier': 't2', 'ms': 640, 'ok': true},
      ]);
      Analytics.debugReset();
    });

    testWidgets('light toggle sends setViewLight; sun carries an hour', (
      tester,
    ) async {
      await openView(tester);
      scene.emit(const SceneReady());
      await tester.pump();
      scene.emitViewReady(win: 'rose_chartres_north');
      await tester.pump();
      await tester.tap(find.text('햇빛'));
      await tester.pump();
      final sun = scene.lastArgs('setViewLight')!;
      expect(sun['light'], 'sun');
      expect(sun['hour'], inInclusiveRange(6, 20));
      await tester.tap(find.text('밤'));
      await tester.pump();
      expect(scene.lastArgs('setViewLight'), {'light': 'night'});
      expect(find.byKey(const ValueKey('night-note')), findsOneWidget);
      await tester.tap(find.text('기준광'));
      await tester.pump();
      expect(scene.lastArgs('setViewLight'), {'light': 'ref'});
    });

    testWidgets('chrome auto-hides after 3 s and a gesture hides it at once', (
      tester,
    ) async {
      await openView(tester);
      scene.emit(const SceneReady());
      await tester.pump();
      scene.emitViewReady(win: 'rose_chartres_north');
      await tester.pump();
      expect(chromeShown(tester), isTrue);
      await tester.pump(const Duration(seconds: 3, milliseconds: 100));
      expect(chromeShown(tester), isFalse);
      await tester.tapAt(const Offset(180, 30));
      await tester.pump();
      expect(chromeShown(tester), isTrue);
      scene.dispatchForTest(const ViewGesture(ViewGestureKind.zoom));
      await tester.pump();
      await tester.pump();
      expect(chromeShown(tester), isFalse);
    });

    testWidgets('back sends endView and reports the web ViewEnd numbers', (
      tester,
    ) async {
      await _startAnalytics();
      await openView(tester);
      scene.emit(const SceneReady());
      await tester.pump();
      scene.emitViewReady(win: 'rose_chartres_north');
      await tester.pump();
      scene.endViewReply = const ViewEnd(
        win: 'rose_chartres_north',
        seconds: 52.4,
        zoomMax: 6.3,
        panned: true,
      );
      await tester.tap(find.byKey(const ValueKey('view-back')));
      await tester.pumpAndSettle();
      expect(scene.count('endView'), 1);
      expect(find.byType(GlassViewScreen), findsNothing);
      expect(_events('glass_view_end'), [
        {
          'win': 'rose_chartres_north',
          'seconds': 52,
          'zoom_max': 6,
          'panned': true,
          'light': 'ref',
          'photo_mode': false,
        },
      ]);
      Analytics.debugReset();
    });

    testWidgets('system back leaves too, even if the web never answers', (
      tester,
    ) async {
      await _startAnalytics();
      await openView(tester);
      scene.emit(const SceneReady());
      await tester.pump();
      scene.emitViewReady(win: 'rose_chartres_north');
      await tester.pump();
      await tester.binding.handlePopRoute();
      await tester.pump(const Duration(seconds: 1));
      await tester.pumpAndSettle();
      expect(find.byType(GlassViewScreen), findsNothing);
      expect(_events('glass_view_end'), hasLength(1));
      expect(_events('glass_view_end').single['zoom_max'], 1);
      Analytics.debugReset();
    });

    testWidgets('ViewError webgl falls back to the flat viewer', (
      tester,
    ) async {
      await _startAnalytics();
      await openView(tester);
      scene.emit(const SceneReady());
      await tester.pump();
      scene.emitViewError(ViewErrorReason.webgl, win: 'rose_chartres_north');
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byType(GlassFlatViewer), findsOneWidget);
      expect(find.textContaining('평면으로 보여 드려요'), findsOneWidget);
      expect(find.textContaining(GlassFlatViewer.colorNote), findsOneWidget);
      expect(_events('glass_load').single['ok'], isFalse);
      expect(scene.isDisposed, isFalse); // 주입된 장면은 호출한 쪽이 정리한다.
      Analytics.debugReset();
    });

    testWidgets('ViewError texture shows retry and 평면 보기', (tester) async {
      await openView(tester);
      scene.emit(const SceneReady());
      await tester.pump();
      scene.emitViewError(ViewErrorReason.texture, win: 'rose_chartres_north');
      await tester.pump();
      expect(find.byKey(const ValueKey('view-error')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('view-retry')));
      await tester.pump();
      expect(scene.reloads, 1);
      expect(find.byKey(const ValueKey('view-loading')), findsOneWidget);
      scene.emitViewError(ViewErrorReason.unknown, win: 'rose_chartres_north');
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('view-flat')));
      await tester.pump();
      expect(find.byType(GlassFlatViewer), findsOneWidget);
    });

    testWidgets('WebView load failure falls back to the flat viewer', (
      tester,
    ) async {
      await openView(tester);
      scene.failLoad();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byType(GlassFlatViewer), findsOneWidget);
    });

    testWidgets('no ViewReady within the timeout shows the error state', (
      tester,
    ) async {
      await openView(tester);
      scene.emit(const SceneReady());
      await tester.pump(const Duration(seconds: 26));
      expect(find.byKey(const ValueKey('view-error')), findsOneWidget);
    });

    testWidgets('start flat (low-end): no scene, glass_open view=flat', (
      tester,
    ) async {
      await _startAnalytics();
      await openView(tester, startFlat: true);
      expect(find.byType(GlassFlatViewer), findsOneWidget);
      expect(scene.calls, isEmpty);
      expect(_events('glass_open').single['view'], 'flat');
      Analytics.debugReset();
    });

    testWidgets('pray button leaves and calls back', (tester) async {
      await _startAnalytics();
      var prayed = 0;
      await openView(tester, onPray: () => prayed++);
      scene.emit(const SceneReady());
      await tester.pump();
      scene.emitViewReady(win: 'rose_chartres_north');
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('view-pray')));
      await tester.pump(const Duration(seconds: 1));
      await tester.pumpAndSettle();
      expect(prayed, 1);
      expect(_events('glass_pray'), [
        {'win': 'rose_chartres_north', 'kind': 'rosary'},
      ]);
      Analytics.debugReset();
    });

    testWidgets('info opens the sheet over the view', (tester) async {
      await openView(tester);
      scene.emit(const SceneReady());
      await tester.pump();
      scene.emitViewReady(win: 'rose_chartres_north');
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('view-info')));
      await tester.pumpAndSettle();
      expect(find.text('이 창에 대해'), findsOneWidget);
    });
  });

  group('licenses screen (G-15)', () {
    testWidgets('lists every window credit, CC BY first and highlighted', (
      tester,
    ) async {
      _size(tester, const Size(400, 900));
      await tester.pumpWidget(
        MaterialApp(
          home: GlassLicensesScreen(catalog: testGlassCatalogFuture()),
        ),
      );
      await tester.pump();
      expect(find.text('스테인드글라스 출처'), findsOneWidget);
      expect(find.text(kGlassUnofficialNote), findsOneWidget);
      expect(find.text(kGlassHeritageNote), findsOneWidget);
      expect(find.textContaining('원래 자리:'), findsOneWidget);
      expect(
        find.text('창 사진 46점 · CC BY 14점 · CC0 13점 · 공개 도메인 19점'),
        findsOneWidget,
      );

      // 모든 창의 출처 문구가 카탈로그 그대로 목록에 있다(스크롤하며 확인).
      final list = find.byKey(const ValueKey('licenses-list'));
      final seen = <String>{};
      final ccBy = [
        for (final w in catalog.all)
          if (w.source.licenseKind == GlassLicense.ccBy) w.id,
      ];
      // 화면 순서(CC BY 먼저)대로 내려가며 확인한다.
      final ordered = [
        ...catalog.all.where((w) => ccBy.contains(w.id)),
        ...catalog.all.where((w) => !ccBy.contains(w.id)),
      ];
      for (final w in ordered) {
        final f = find.byKey(ValueKey('credit-${w.id}'));
        await tester.scrollUntilVisible(
          f,
          300,
          scrollable: find
              .descendant(of: list, matching: find.byType(Scrollable))
              .first,
        );
        expect(
          find.descendant(of: f, matching: find.text(w.source.credit)),
          findsOneWidget,
          reason: w.id,
        );
        if (ccBy.contains(w.id)) {
          expect(w.source.credit, contains(kGlassChangeNote), reason: w.id);
          expect(
            find.descendant(
              of: f,
              matching: find.text('변경: $kGlassChangeNote'),
            ),
            findsNothing,
          );
          expect(
            find.descendant(of: f, matching: find.text(w.source.license)),
            findsOneWidget,
          );
        }
        seen.add(w.id);
      }
      expect(seen, hasLength(46));
      expect(tester.takeException(), isNull);
    });

    testWidgets('no overflow at text scale 2.0', (tester) async {
      _size(tester);
      await tester.pumpWidget(
        _app(
          GlassLicensesScreen(catalog: testGlassCatalogFuture()),
          textScale: 2.0,
        ),
      );
      await tester.pump();
      expect(tester.takeException(), isNull);
    });
  });
}
