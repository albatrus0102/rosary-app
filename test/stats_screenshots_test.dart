import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/stats/prayer_goal.dart';
import 'package:rosary_app/stats/share/share_card.dart';
import 'package:rosary_app/stats/share/share_sheet.dart';
import 'package:rosary_app/stats/stats_data.dart';
import 'package:rosary_app/stats/stats_logic.dart';
import 'package:rosary_app/stats/stats_screen.dart';

import 'stats_sample_data.dart';

/// 골든 없는 스크린샷 렌더: 예시 기록으로 통계 화면(밝게/어둡게)과 공유 카드(정사각·스토리)를
/// PNG 로 써서 눈으로 확인한다. 결과: [outDir]. 일반 `flutter test` 에서는 아무 것도 검증하지
/// 않고(파일이 써지는지만), 모양을 사람이 보고 고치기 위한 시험이다.
const String outDir =
    '/tmp/claude-0/-home-user/127c52ad-6e6f-576e-8168-2e8eda5aa1ed/scratchpad/stats_shots';

final _now = DateTime(2026, 11, 16, 10);

Future<void> _loadFonts() async {
  Future<ByteData> bytes(String p) async =>
      ByteData.sublistView(await File(p).readAsBytes());
  final pretendard = FontLoader('Pretendard');
  for (final w in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
    pretendard.addFont(bytes('assets/fonts/Pretendard-$w.otf'));
  }
  await pretendard.load();
  final icons = FontLoader('MaterialIcons')
    ..addFont(
      bytes(
        '/home/user/sdk/flutter/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf',
      ),
    );
  await icons.load();
}

Future<void> _shot(
  WidgetTester tester,
  GlobalKey key,
  String name, {
  double pixelRatio = 2,
}) async {
  final boundary = key.currentContext!.findRenderObject() as RenderRepaintBoundary;
  await tester.runAsync(() async {
    final ui.Image img = await boundary.toImage(pixelRatio: pixelRatio);
    final data = await img.toByteData(format: ui.ImageByteFormat.png);
    await Directory(outDir).create(recursive: true);
    await File('$outDir/$name.png').writeAsBytes(data!.buffer.asUint8List());
    img.dispose();
  });
}

Widget _host(GlobalKey key, Widget child, Brightness b, {double scale = 1}) =>
    RepaintBoundary(
      key: key,
      child: MediaQuery(
        data: MediaQueryData(
          size: const Size(400, 800),
          textScaler: TextScaler.linear(scale),
        ),
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: b == Brightness.dark ? AppTheme.dark() : AppTheme.light(),
          home: child,
        ),
      ),
    );

void main() {
  setUpAll(_loadFonts);

  for (final b in Brightness.values) {
    testWidgets('통계 화면 ${b.name}', (tester) async {
      tester.view.physicalSize = const Size(400, 4300);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final key = GlobalKey();
      await tester.pumpWidget(
        _host(
          key,
          StatsScreen(
            store: sampleStore(_now),
            now: () => _now,
            goal: const PrayerGoal(decades: 3),
          ),
          b,
        ),
      );
      await tester.pumpAndSettle();
      await _shot(tester, key, 'stats_${b.name}');
      expect(File('$outDir/stats_${b.name}.png').existsSync(), isTrue);
    });
  }

  testWidgets('통계 화면 목표 없음 · 344dp ×1.75', (tester) async {
    tester.view.physicalSize = const Size(344, 7600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final key = GlobalKey();
    await tester.pumpWidget(
      _host(
        key,
        StatsScreen(store: sampleStore(_now), now: () => _now),
        Brightness.light,
        scale: 1.75,
      ),
    );
    await tester.pumpAndSettle();
    await _shot(tester, key, 'stats_light_344_x1.75', pixelRatio: 1.5);
  });

  for (final b in Brightness.values) {
    testWidgets('목표 시트(처음 열 때) ${b.name}', (tester) async {
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final key = GlobalKey();
      await tester.pumpWidget(
        _host(
          key,
          StatsScreen(
            store: sampleStore(_now),
            now: () => _now,
            goalPrompted: false,
            onGoalChanged: (_) {},
          ),
          b,
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('둘 다'));
      await tester.pumpAndSettle();
      await _shot(tester, key, 'goal_sheet_${b.name}');
    });
  }

  testWidgets('공유 시트', (tester) async {
    tester.view.physicalSize = const Size(400, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final key = GlobalKey();
    final data = StatsData(records: sampleRecords(_now), now: _now, goal: const PrayerGoal(decades: 3));
    ShareSheet.lastBg = ShareBg.paper;
    ShareSheet.lastLayout = ShareLayout.center;
    await tester.pumpWidget(
      _host(
        key,
        Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => showShareSheet(
                context,
                content: ShareContents.recap(buildRecap(data.records, RecapKind.month, data.today, goal: data.goal, startHour: data.startHour)),
                fileName: 'x',
              ),
              child: const Text('열기'),
            ),
          ),
        ),
        Brightness.light,
      ),
    );
    await tester.tap(find.text('열기'));
    await tester.pumpAndSettle();
    await _shot(tester, key, 'share_sheet_light');
  });

  testWidgets('공유 카드 3종 × (정사각, 스토리)', (tester) async {
    final data = StatsData(
      records: sampleRecords(_now),
      now: _now,
      goal: const PrayerGoal(decades: 3),
    );
    final range = presetRange(StatsPreset.l30, data.today)!;
    final cards = <String, (ShareCardContent, ShareBg, ShareLayout)>{
      'trail': (ShareContents.streak(data), ShareBg.paper, ShareLayout.center),
      'period': (ShareContents.period(data, range), ShareBg.night, ShareLayout.left),
      'mystery': (
        ShareContents.donut(
          data,
          range,
          mysteryShares(data.records, range.contains, startHour: data.startHour),
          kinds: false,
        ),
        ShareBg.burgundy,
        ShareLayout.grid,
      ),
      'recap_year': (
        ShareContents.recap(buildRecap(data.records, RecapKind.year, data.today, goal: data.goal)),
        ShareBg.mist,
        ShareLayout.left,
      ),
      'recap_month_dots': (
        ShareContents.recap(buildRecap(data.records, RecapKind.month, data.today, goal: data.goal)),
        ShareBg.dots,
        ShareLayout.center,
      ),
    };
    for (final e in cards.entries) {
      for (final f in ShareFormat.values) {
        tester.view.physicalSize = Size(f.width, f.height);
        tester.view.devicePixelRatio = 1;
        final key = GlobalKey();
        await tester.pumpWidget(
          MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light(),
            home: Align(
              alignment: Alignment.topLeft,
              child: RepaintBoundary(
                key: key,
                child: ShareCard(
                  content: e.value.$1,
                  bg: e.value.$2,
                  layout: e.value.$3,
                  format: f,
                ),
              ),
            ),
          ),
        );
        await tester.pump();
        await _shot(tester, key, 'card_${e.key}_${f.name}', pixelRatio: 3);
      }
    }
    // 8개 배경 한눈에(정사각, 같은 내용).
    for (final bg in ShareBg.values) {
      tester.view.physicalSize = const Size(360, 360);
      tester.view.devicePixelRatio = 1;
      final key = GlobalKey();
      await tester.pumpWidget(
        MaterialApp(
          debugShowCheckedModeBanner: false,
          home: Align(
            alignment: Alignment.topLeft,
            child: RepaintBoundary(
              key: key,
              child: ShareCard(content: cards['recap_month_dots']!.$1, bg: bg, layout: ShareLayout.center),
            ),
          ),
        ),
      );
      await tester.pump();
      await _shot(tester, key, 'bg_${bg.name}', pixelRatio: 1);
    }
  });
}
