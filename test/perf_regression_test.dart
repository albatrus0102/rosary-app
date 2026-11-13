// 성능 회귀 시험: 갤러리가 디코드하는 픽셀 양, 번들 구성, 테마 재사용, 스크롤 다시 그리기.
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/glass/glass_catalog.dart';
import 'package:rosary_app/glass/glass_flat_viewer.dart';
import 'package:rosary_app/glass/glass_gallery.dart';
import 'package:rosary_app/glass/glass_widgets.dart';
import 'package:rosary_app/ui/widgets/page_body.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'glass_test_support.dart';

/// 기준 기기: 폭 360dp, 배율 3(1080px 플래그십의 기본 해상도), 2열 격자.
const double _dpr = 3;
const double _screenW = 360;
const double _colW = (_screenW - 2 * 16 - 10) / 2; // 159dp

Size _px(GlassFile f) => Size(f.width.toDouble(), f.height.toDouble());
double _area(Size s) => s.width * s.height;

/// 예전 규칙: 1k 파일을 `cacheWidth`(폭만 지정, 원본보다 크면 확대)로 디코드.
Size _oldDecoded(GlassFile f1k, int cacheWidth) =>
    Size(cacheWidth.toDouble(), (cacheWidth * f1k.height / f1k.width));

/// 격자 카드의 사진 칸(기기 픽셀).
Size _cardBox(GlassWindow w) => glassCacheBox(
  Size(_colW - 12, _colW / glassTileAspect(w.aspect) - 12),
  _dpr,
);

void main() {
  late GlassCatalog catalog;
  setUp(() => catalog = testGlassCatalog());

  group('번들 구성', () {
    test('창마다 소형 썸네일이 있고(480×800 안) 합계가 작다', () {
      var bytes = 0;
      for (final w in catalog.all) {
        final t = w.fileThumb;
        expect(t, isNotNull, reason: w.id);
        expect(w.galleryFile.path, t!.path);
        expect(t.path, 'assets/church/glass_${w.id}_th.webp');
        expect(t.width, lessThanOrEqualTo(480), reason: w.id);
        expect(t.height, lessThanOrEqualTo(800), reason: w.id);
        // 같은 구도의 축소본(비율이 1k와 같다).
        expect(
          t.width / t.height,
          closeTo(w.file1k.width / w.file1k.height, 0.01),
          reason: w.id,
        );
        final f = File(t.path);
        expect(f.existsSync(), isTrue, reason: t.path);
        expect(f.lengthSync(), lessThan(250 * 1024), reason: t.path);
        bytes += f.lengthSync();
      }
      expect(bytes, lessThan(5 * 1024 * 1024));
    });

    test('2k는 성당 안에 걸리는 창만 번들에 있고, 나머지는 1k로 평면 보기를 한다', () {
      final kept = <String>[];
      for (final w in catalog.all) {
        final pack2k = File('assets/church/gpack_${w.id}_2k.js');
        final webp2k = File('assets/church/glass_${w.id}_2k.webp');
        expect(pack2k.existsSync(), w.file2k.bundled, reason: w.id);
        expect(webp2k.existsSync(), w.file2k.bundled, reason: w.id);
        // 감상실(t1)과 평면 보기에 쓰는 파일은 언제나 번들에 있다.
        expect(File('assets/church/gpack_${w.id}_1k.js').existsSync(), isTrue);
        expect(w.flatFile.bundled, isTrue, reason: w.id);
        expect(w.flatFile.path, startsWith('assets/church/'), reason: w.id);
        expect(File(w.flatFile.path).existsSync(), isTrue, reason: w.id);
        if (w.isAuthentic) expect(w.file2k.bundled, isTrue, reason: w.id);
        if (w.file2k.bundled) kept.add(w.id);
      }
      // 피렌체 오큘러스 3점, 성 베드로 비둘기 창, 성 바오로 알라바스터 3점, 밀라노 창.
      expect(kept.toSet(), {
        'oculus_florence_donatello',
        'oculus_florence_ghiberti_1',
        'oculus_florence_ghiberti_2',
        'dove_stpeter',
        'alabaster_stpaul_1',
        'alabaster_stpaul_2',
        'alabaster_slab',
        'milan_apse_lower',
      });
    });
  });

  group('디코드 크기', () {
    test('glassDecodedSize는 칸에 맞추고 원본보다 키우지 않는다', () {
      expect(
        glassDecodedSize(const Size(1024, 1024), const Size(441, 900)),
        const Size(441, 441),
      );
      expect(
        glassDecodedSize(const Size(273, 800), const Size(441, 1023)),
        const Size(273, 800),
      );
      expect(
        glassDecodedSize(const Size(480, 480), const Size(100, 300)),
        const Size(100, 100),
      );
    });

    test('갤러리 전체(46점)·오늘의 창의 디코드 픽셀이 예전보다 크게 줄었다', () {
      var oldGrid = 0.0, newGrid = 0.0, oldToday = 0.0, newToday = 0.0;
      // 코덱이 풀어야 하는 원본 픽셀(예전: 1k 파일 전체, 지금: 썸네일 전체).
      var oldSource = 0.0, newSource = 0.0;
      var oldTodayMax = 0.0, newTodayMax = 0.0;
      final todayBox = glassCacheBox(
        const Size(_screenW - 2 * 16 - 24, 232 - 24),
        _dpr,
      );
      for (final w in catalog.visible) {
        oldGrid += _area(_oldDecoded(w.file1k, (_colW * _dpr).round()));
        oldSource += _area(_px(w.file1k));
        newSource += _area(_px(w.galleryFile));
        final now = glassDecodedSize(_px(w.galleryFile), _cardBox(w));
        newGrid += _area(now);
        // 화면에 쓰이지 않는 픽셀은 디코드하지 않는다.
        expect(now.width, lessThanOrEqualTo(_cardBox(w).width), reason: w.id);
        expect(now.height, lessThanOrEqualTo(_cardBox(w).height), reason: w.id);

        final o = _area(_oldDecoded(w.file1k, (600 * _dpr).round()));
        final n = _area(glassDecodedSize(_px(w.galleryFile), todayBox));
        oldToday += o;
        newToday += n;
        if (o > oldTodayMax) oldTodayMax = o;
        if (n > newTodayMax) newTodayMax = n;
      }
      final n = catalog.visible.length;
      String mp(double px) => (px / 1e6).toStringAsFixed(2);
      String mb(double px) => (px * 4 / 1048576).toStringAsFixed(1);
      // 보고용 수치(360dp × 3배율 기준).
      // ignore: avoid_print
      print(
        '[perf] grid $n cards, source pixels the codec decodes: '
        '${mp(oldSource)} MP -> ${mp(newSource)} MP\n'
        '[perf] grid $n cards, decoded bitmaps kept: ${mp(oldGrid)} MP '
        '(${mb(oldGrid)} MB) -> ${mp(newGrid)} MP (${mb(newGrid)} MB)\n'
        '[perf] today card avg: ${mp(oldToday / n)} MP (${mb(oldToday / n)} MB) -> '
        '${mp(newToday / n)} MP (${mb(newToday / n)} MB); '
        'worst: ${mp(oldTodayMax)} MP (${mb(oldTodayMax)} MB) -> '
        '${mp(newTodayMax)} MP (${mb(newTodayMax)} MB)',
      );
      expect(newSource, lessThan(oldSource * 0.45));
      expect(newGrid, lessThan(oldGrid * 0.65));
      expect(newToday, lessThan(oldToday * 0.1));
      // 오늘의 창 한 장은 어떤 창이 걸려도 1MP(4MB)를 넘지 않는다.
      expect(newTodayMax, lessThan(1e6));
    });

    testWidgets('갤러리의 모든 사진은 썸네일을 칸 크기 한계로(확대 없이) 디코드한다', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = _dpr;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GlassGallery(
              catalog: catalog,
              now: () => DateTime(2026, 11, 12, 9),
              onOpen: (_, _) {},
            ),
          ),
        ),
      );
      await tester.pump();
      final pictures = tester
          .widgetList<GlassPicture>(find.byType(GlassPicture))
          .toList();
      expect(pictures.length, greaterThan(2));
      for (final p in pictures) {
        expect(p.path, endsWith('_th.webp'));
        expect(p.cacheBox, isNotNull);
      }
      final images = tester.widgetList<Image>(
        find.descendant(
          of: find.byType(GlassPicture),
          matching: find.byType(Image),
        ),
      );
      for (final img in images) {
        final r = img.image;
        expect(r, isA<ResizeImage>());
        r as ResizeImage;
        expect(r.policy, ResizeImagePolicy.fit);
        expect(r.allowUpscaling, isFalse);
        expect((r.imageProvider as AssetImage).assetName, endsWith('_th.webp'));
        // 한 칸은 화면 폭(1080px)·카드 최대 높이를 넘지 않는다.
        expect(r.width, isNotNull);
        expect(r.height, isNotNull);
        expect(r.width!, lessThanOrEqualTo(1080 - 2 * 16 * 3));
        expect(
          r.height!,
          lessThanOrEqualTo((_colW / kTileMinAspect * 3).ceil()),
        );
      }
      // 격자 카드의 칸 폭은 열 폭(159dp)에서 여백 12dp를 뺀 147dp = 441px.
      final card = tester.widget<GlassPicture>(
        find.descendant(
          of: find.byType(GlassCard).first,
          matching: find.byType(GlassPicture),
        ),
      );
      expect(card.cacheBox!.width, 441);
    });

    testWidgets('평면 보기: 번들에 2k가 없는 창은 1k를, 있는 창은 2k를 쓴다', (tester) async {
      Future<String> pathFor(String id) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: GlassFlatViewer(
                key: ValueKey(id),
                window: catalog.byId(id)!,
                onBack: () {},
                onInfo: () {},
              ),
            ),
          ),
        );
        final img = tester.widget<Image>(
          find.descendant(
            of: find.byKey(const ValueKey('flat-viewer')),
            matching: find.byType(Image),
          ),
        );
        return (img.image as AssetImage).assetName;
      }

      expect(
        await pathFor('rose_chartres_north'),
        'assets/church/glass_rose_chartres_north_1k.webp',
      );
      expect(
        await pathFor('dove_stpeter'),
        'assets/church/glass_dove_stpeter_2k.webp',
      );
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump(const Duration(seconds: 5));
    });
  });

  group('테마', () {
    test('같은 색 구성에는 같은 ThemeData 인스턴스를 돌려준다', () {
      expect(identical(AppTheme.light(), AppTheme.light()), isTrue);
      expect(identical(AppTheme.dark(), AppTheme.dark()), isTrue);
      expect(identical(AppTheme.light(), AppTheme.dark()), isFalse);
      final dyn = ColorScheme.fromSeed(seedColor: Colors.teal);
      expect(
        identical(
          AppTheme.light(dynamicScheme: dyn),
          AppTheme.light(dynamicScheme: dyn.copyWith()),
        ),
        isTrue,
      );
      expect(AppTheme.light(dynamicScheme: dyn).colorScheme, dyn);
    });

    testWidgets('설정을 바꿔도 테마 애니메이션(매 프레임 앱 전체 리빌드)이 돌지 않는다', (tester) async {
      SharedPreferences.setMockInitialValues({});
      GlassCatalog.debugSetShared(testGlassCatalogFuture());
      addTearDown(GlassCatalog.debugResetShared);
      final settings = await AppSettings.load();
      await tester.pumpWidget(RosaryApp(settings));
      await tester.pumpAndSettle();
      final before = tester
          .widget<AnimatedTheme>(find.byType(AnimatedTheme).first)
          .data;

      settings.mysterySet = MysterySet.values.firstWhere(
        (s) => s != settings.mysterySet,
      );
      await tester.pump();
      final after = tester
          .widget<AnimatedTheme>(find.byType(AnimatedTheme).first)
          .data;
      expect(identical(before, after), isTrue);
      expect(identical(after, AppTheme.light()), isTrue);
      // AnimatedTheme은 data가 같은 인스턴스면 보간(200ms 동안 매 프레임 ThemeData.lerp와
      // 앱 전체 리빌드)을 시작하지 않는다.
      await tester.pumpAndSettle();
    });
  });

  group('스크롤', () {
    testWidgets('SliverPageBody 본문은 스크롤하는 동안 다시 그려지지 않는다', (tester) async {
      var paints = 0;
      final controller = ScrollController();
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CustomScrollView(
              controller: controller,
              slivers: [
                SliverPageBody(
                  child: CustomPaint(
                    painter: _CountingPainter(() => paints++),
                    child: const SizedBox(height: 3000),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      expect(paints, 1);
      for (final offset in [40.0, 180.0, 420.0]) {
        controller.jumpTo(offset);
        await tester.pump();
      }
      expect(paints, 1);
    });
  });
}

class _CountingPainter extends CustomPainter {
  _CountingPainter(this.onPaint);

  final VoidCallback onPaint;

  @override
  void paint(Canvas canvas, Size size) => onPaint();

  @override
  bool shouldRepaint(_CountingPainter oldDelegate) => false;
}
