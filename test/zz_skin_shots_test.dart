// 스킨 스크린샷 하니스(--dart-define=SKIN_SHOTS=<dir>). 비어 있으면 건너뛴다.
// 고르기 시트·미리 보기 막대·만들기 화면과, 스킨 세 개를 입힌 '오늘'·'기록' 화면(밝게·어둡게)을 PNG 로 쓴다.
import 'dart:io';
import 'dart:math';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app.dart';
import 'package:rosary_app/app/app_services.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _dir = String.fromEnvironment('SKIN_SHOTS');

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

void _view(WidgetTester t, Brightness b) {
  t.view.devicePixelRatio = 2;
  t.view.physicalSize = const Size(360, 780) * 2;
  final p = FakeViewPadding(top: 48, bottom: 48);
  t.view.padding = p;
  t.view.viewPadding = p;
  t.platformDispatcher.platformBrightnessTestValue = b;
  addTearDown(t.view.reset);
  addTearDown(t.platformDispatcher.clearPlatformBrightnessTestValue);
}

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

Future<AppSettings> _settings([Map<String, Object> v = const {}]) async {
  SharedPreferences.setMockInitialValues({
    'haptic': false,
    'short_prayers_asked': true,
    'church_avatar_chosen': true,
    ...v,
  });
  return AppSettings.load();
}

Future<void> _pumpApp(
  WidgetTester t,
  AppSettings s, {
  DateTime Function()? clock,
}) async {
  final services = AppServices.inMemory(s, stats: _stats());
  addTearDown(services.disposeInMemory);
  await t.pumpWidget(
    RepaintBoundary(
      key: const ValueKey('shot-root'),
      child: RosaryApp(s, services: services, clock: clock),
    ),
  );
  await _settle(t);
}

Future<void> _tab(WidgetTester t, String label) async {
  await t.tap(
    find.descendant(of: find.byType(NavigationBar), matching: find.text(label)),
  );
  await _settle(t);
}

void main() {
  setUpAll(_fonts);

  const skins = ['mary-blue', 'night-church', 'parchment'];
  final modes = <(String, Brightness)>[
    ('light', Brightness.light),
    ('dark', Brightness.dark),
  ];

  for (final id in skins) {
    for (final (tag, b) in modes) {
      testWidgets('$id $tag 오늘·기록', (t) async {
        _view(t, b);
        final s = await _settings({'skin_id': id});
        await _pumpApp(t, s);
        await _tab(t, '오늘');
        await _shot(t, 'home_${id}_$tag');
        await _tab(t, '기록');
        await _shot(t, 'stats_${id}_$tag');
      }, skip: _dir.isEmpty);
    }
  }

  for (final (tag, b) in modes) {
    testWidgets('기본 스킨 $tag 오늘·기록(비교용)', (t) async {
      _view(t, b);
      final s = await _settings();
      await _pumpApp(t, s);
      await _tab(t, '오늘');
      await _shot(t, 'home_default_$tag');
      await _tab(t, '기록');
      await _shot(t, 'stats_default_$tag');
    }, skip: _dir.isEmpty);

    testWidgets('고르기 시트·미리 보기 막대·만들기 $tag', (t) async {
      _view(t, b);
      final s = await _settings();
      await _pumpApp(t, s, clock: () => DateTime.utc(2026, 12, 3, 3));
      await _tab(t, '더보기');
      await t.tap(find.byKey(const ValueKey('more-skin')));
      await _settle(t);
      await _shot(t, 'picker_basic_$tag');
      await t.drag(
        find.byKey(const ValueKey('skin-grid-scroll')),
        const Offset(0, -500),
      );
      await _settle(t, 2);
      await _shot(t, 'picker_basic_2_$tag');
      await t.tap(find.byKey(const ValueKey('skin-tab-season')));
      await _settle(t, 2);
      await _shot(t, 'picker_season_$tag');
      await t.tap(find.byKey(const ValueKey('skin-tab-custom')));
      await _settle(t, 2);
      await _shot(t, 'picker_custom_$tag');
      await t.tap(find.byKey(const ValueKey('skin-tab-basic')));
      await _settle(t, 2);
      await t.ensureVisible(find.byKey(const ValueKey('skin-card-marble')));
      await _settle(t, 1);
      await t.tap(find.byKey(const ValueKey('skin-card-marble')));
      await _settle(t);
      await _shot(t, 'preview_bar_marble_$tag');
      await t.tap(find.byKey(const ValueKey('skin-preview-cancel')));
      await _settle(t);

      await t.tap(find.byKey(const ValueKey('more-skin')));
      await _settle(t);
      await t.tap(find.byKey(const ValueKey('skin-tab-custom')));
      await _settle(t, 2);
      await t.tap(find.byKey(const ValueKey('skin-card-new')));
      await _settle(t);
      await _shot(t, 'builder_top_$tag');
      await t.ensureVisible(
        find.byKey(const ValueKey('skin-slot-accent'), skipOffstage: false),
      );
      await _settle(t, 1);
      await t.tap(find.byKey(const ValueKey('skin-slot-accent')));
      await _settle(t, 2);
      await _shot(t, 'builder_$tag');
    }, skip: _dir.isEmpty);
  }
}
