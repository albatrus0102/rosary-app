// 성당 전용 M3 테마(ChurchTheme)와 장면 위 HUD 재디자인의 계약:
// 색 대비(WCAG AA), 성당 안의 모든 표면이 같은 테마를 쓰는지, HUD 가 겹치지 않는지.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app_services.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_cross.dart';
import 'package:rosary_app/church/church_hud.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:rosary_app/church/church_tab.dart';
import 'package:rosary_app/church/church_theme.dart';
import 'package:rosary_app/church/net/church_net.dart';
import 'package:rosary_app/glass/glass_catalog.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';
import 'package:rosary_app/ui/app_shell.dart';

import 'church_screen_fakes.dart';
import 'glass_test_support.dart';
import 'theme_contrast_test.dart' show contrast;

const _s = ChurchTheme.scheme;

/// HUD 표면(반투명)이 [backdrop] 위에 놓였을 때 실제로 보이는 색.
Color _hudOver(Color backdrop) =>
    Color.alphaBlend(ChurchHudStyle.surface(_s), backdrop);

void main() {
  group('성당 테마 색 대비(WCAG AA)', () {
    final pairs = <(String, Color, Color, double)>[
      ('onSurface/surface', _s.onSurface, _s.surface, 4.5),
      ('onSurfaceVariant/surface', _s.onSurfaceVariant, _s.surface, 4.5),
      ('primary/surface (금색 글자·아이콘)', _s.primary, _s.surface, 4.5),
      ('tertiary/surface', _s.tertiary, _s.surface, 4.5),
      ('error/surface', _s.error, _s.surface, 4.5),
      ('onPrimary/primary', _s.onPrimary, _s.primary, 4.5),
      (
        'onPrimaryContainer/primaryContainer',
        _s.onPrimaryContainer,
        _s.primaryContainer,
        4.5,
      ),
      ('onSecondary/secondary', _s.onSecondary, _s.secondary, 4.5),
      (
        'onSecondaryContainer/secondaryContainer',
        _s.onSecondaryContainer,
        _s.secondaryContainer,
        4.5,
      ),
      ('onTertiary/tertiary', _s.onTertiary, _s.tertiary, 4.5),
      (
        'onTertiaryContainer/tertiaryContainer',
        _s.onTertiaryContainer,
        _s.tertiaryContainer,
        4.5,
      ),
      ('onError/error', _s.onError, _s.error, 4.5),
      (
        'onInverseSurface/inverseSurface',
        _s.onInverseSurface,
        _s.inverseSurface,
        4.5,
      ),
      (
        'inversePrimary/inverseSurface',
        _s.inversePrimary,
        _s.inverseSurface,
        4.5,
      ),
      // 표면 단계마다(시트·카드·메뉴·선택 안 된 항목) 글자와 금색이 읽힌다.
      for (final (name, c) in [
        ('surfaceContainerLow', _s.surfaceContainerLow),
        ('surfaceContainer', _s.surfaceContainer),
        ('surfaceContainerHigh', _s.surfaceContainerHigh),
        ('surfaceContainerHighest', _s.surfaceContainerHighest),
      ]) ...[
        ('onSurface/$name', _s.onSurface, c, 4.5),
        ('onSurfaceVariant/$name', _s.onSurfaceVariant, c, 4.5),
        ('primary/$name', _s.primary, c, 4.5),
      ],
      // 비텍스트(테두리): 3:1.
      ('outline/surface', _s.outline, _s.surface, 3.0),
      (
        'outlineVariant/surface (가는 금색 테두리)',
        _s.outlineVariant,
        _s.surface,
        3.0,
      ),
    ];
    for (final (name, fg, bg, min) in pairs) {
      test('$name ≥ $min', () {
        expect(contrast(fg, bg), greaterThanOrEqualTo(min), reason: name);
      });
    }

    // HUD 표면은 장면이 비친다. 가장 밝은 장면(흰색)과 가장 어두운 장면(검정) 위에서도 AA.
    for (final (label, backdrop) in const [
      ('흰 장면', Color(0xFFFFFFFF)),
      ('검은 장면', Color(0xFF000000)),
    ]) {
      final bg = _hudOver(backdrop);
      for (final (name, fg) in [
        ('onSurface', _s.onSurface),
        ('onSurfaceVariant', _s.onSurfaceVariant),
        ('primary', _s.primary),
        ('onPrimaryContainer', _s.onPrimaryContainer),
      ]) {
        test('HUD 표면($label 위) $name ≥ 4.5', () {
          expect(contrast(fg, bg), greaterThanOrEqualTo(4.5));
        });
      }
    }

    test('HUD 표면은 어둡고 조금만 비친다', () {
      expect(_s.brightness, Brightness.dark);
      expect(ChurchHudStyle.surfaceOpacity, inInclusiveRange(0.8, 0.95));
      expect(ChurchHudStyle.border(_s).color, _s.outlineVariant);
      expect(ChurchHudStyle.border(_s).width, 1);
    });

    test('컴포넌트 테마·모양은 앱 테마와 같은 규칙에서 나온다', () {
      final church = ChurchTheme.data();
      final app = AppTheme.dark();
      expect(church.useMaterial3, isTrue);
      expect(church.colorScheme, ChurchTheme.scheme);
      expect(church.chipTheme.shape, app.chipTheme.shape);
      expect(church.cardTheme.margin, app.cardTheme.margin);
      expect(
        church.bottomSheetTheme.constraints,
        app.bottomSheetTheme.constraints,
      );
      expect(church.textTheme.bodyMedium?.fontFamily, AppTheme.sansFamily);
      // 같은 글꼴이면 같은 인스턴스(다시 만들지 않는다).
      expect(identical(ChurchTheme.data(), church), isTrue);
    });
  });

  group('성당 안은 앱 밝기와 상관없이 성당 테마', () {
    for (final b in Brightness.values) {
      testWidgets('앱 ${b.name} 테마: HUD·시트·메뉴가 ChurchTheme', (tester) async {
        setView(tester, const Size(400, 800));
        final settings = await loadSettings();
        final net = FakeChurchNet();
        final scene = FakeChurchSceneController();
        await tester.pumpWidget(
          MaterialApp(
            theme: b == Brightness.dark ? AppTheme.dark() : AppTheme.light(),
            home: ChurchScreen(settings: settings, net: net, scene: scene),
          ),
        );
        await tester.pump();
        // 불러오는 동안의 바탕도 성당 테마의 먹색.
        final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
        expect(scaffold.backgroundColor, ChurchTheme.scheme.surface);
        expect(find.text('성당 문을 여는 중…'), findsOneWidget);
        scene.emit(const SceneReady());
        await tester.pump();

        ColorScheme at(Finder f) => Theme.of(tester.element(f)).colorScheme;
        expect(at(find.byType(ChurchStatusChip)), ChurchTheme.scheme);
        expect(at(find.byType(ChurchTopActions)), ChurchTheme.scheme);

        // 시트(가기)도 같은 테마와 금색 테두리.
        await tester.tap(find.byKey(const ValueKey('go-button')));
        await tester.pumpAndSettle();
        expect(at(find.text('어디로 갈까요?')), ChurchTheme.scheme);
        final sheet = tester.widget<BottomSheet>(find.byType(BottomSheet));
        expect(
          sheet.backgroundColor ??
              ChurchTheme.data().bottomSheetTheme.backgroundColor,
          ChurchTheme.scheme.surfaceContainerLow,
        );
        Navigator.of(tester.element(find.byType(BottomSheet))).pop();
        await tester.pumpAndSettle();

        // 메뉴(인사)도.
        await tester.tap(find.byTooltip('인사'));
        await tester.pumpAndSettle();
        expect(at(find.text('성호경')), ChurchTheme.scheme);
        await tester.tap(find.text('성호경'));
        await tester.pumpAndSettle();
        await tester.pump(const Duration(seconds: 7));
      });
    }

    testWidgets('셸의 내비게이션은 성당 안에서만 성당 테마, 다른 탭에서는 앱 테마', (tester) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings();
      settings.churchId = 'stpeter';
      final services = AppServices.inMemory(
        settings,
        stats: PrayerStatsStore.inMemory(const []),
      );
      addTearDown(services.disposeInMemory);
      final net = FakeChurchNet();
      final scene = FakeChurchSceneController();
      final app = AppTheme.light();
      await tester.pumpWidget(
        AppServicesScope(
          services: services,
          child: MaterialApp(
            theme: app,
            home: AppShell(
              settings: settings,
              initialTab: AppShellTab.church,
              glassCatalog: testGlassCatalogFuture(),
              churchBuilder: (_) =>
                  ChurchTab(settings: settings, net: net, scene: scene),
            ),
          ),
        ),
      );
      await tester.pump();
      Color navPrimary() =>
          Theme.of(tester.element(find.byType(NavigationBar)))
              .colorScheme
              .primary;
      // 입장 카드(성당 밖): 앱 테마.
      expect(navPrimary(), app.colorScheme.primary);
      await tester.tap(find.byKey(const ValueKey('entry-enter')));
      await tester.pump();
      scene.emit(const SceneReady());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(navPrimary(), ChurchTheme.scheme.primary);
      // 다른 탭으로 가면 앱 테마로 돌아온다.
      await tester.tap(find.text('오늘'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(navPrimary(), app.colorScheme.primary);
      await tester.tap(find.text('성당'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(navPrimary(), ChurchTheme.scheme.primary);
      // 성당에서 나오면(성당 바꾸기) 다시 앱 테마.
      await tester.tap(find.byTooltip('성당 바꾸기'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(navPrimary(), app.colorScheme.primary);
      await tester.pump(const Duration(seconds: 7));
    });
  });

  group('이름판 부제 슬롯', () {
    Future<void> pump(WidgetTester tester, {String? subtitle}) =>
        tester.pumpWidget(
          wrapApp(
            Scaffold(
              body: Center(
                child: ChurchStatusChip(
                  churchName: '성 베드로 대성전',
                  state: NetState.online,
                  count: 12,
                  subtitle: subtitle,
                  onShowPresence: () {},
                  onChangeChurch: () {},
                ),
              ),
            ),
          ),
        );

    testWidgets('부제가 없으면 자리를 차지하지 않는다', (tester) async {
      await pump(tester);
      expect(find.byKey(const ValueKey('status-subtitle')), findsNothing);
      expect(find.text('12명'), findsOneWidget);
    });

    testWidgets('부제는 상태 뒤에 붙고 스크린리더 라벨에도 들어간다', (tester) async {
      await pump(tester, subtitle: '대림 시기');
      expect(find.text(' · 대림 시기'), findsOneWidget);
      expect(find.text('12명'), findsOneWidget);
      expect(
        tester.getSemantics(find.byKey(const ValueKey('presence-chip'))),
        isSemantics(label: '성 베드로 대성전, 12명 접속 중, 대림 시기'),
      );
      expect(tester.takeException(), isNull);
    });
  });

  group('HUD 겹침 검사(폰·큰 폰·태블릿 가로·글자 2배)', () {
    for (final size in const [
      Size(360, 800),
      Size(412, 915),
      Size(1280, 800),
      Size(360, 640),
    ]) {
      for (final scale in const [1.0, 2.0]) {
        final tag = '${size.width.toInt()}x${size.height.toInt()} x$scale';

        Map<String, Rect> rects(WidgetTester tester) {
          final out = <String, Rect>{};
          void add(String name, Finder f) {
            if (f.evaluate().isNotEmpty) out[name] = tester.getRect(f);
          }

          add('이름판', find.byType(ChurchStatusChip));
          add('도구 줄', find.byType(ChurchTopActions));
          add('걷기 칩', find.byKey(const ValueKey('walk-chip')));
          add('창 칩', find.byType(ChurchGlassChip));
          add('14처 칩', find.byType(ChurchCrossChip));
          add('느린 기기 띠', find.byKey(const ValueKey('perf-banner')));
          add('가기 안내', find.byKey(const ValueKey('walk-hint')));
          add('이동 안내', find.byKey(const ValueKey('move-hint')));
          add('상황 버튼', find.byKey(const ValueKey('ctx-sit')));
          return out;
        }

        void expectClean(WidgetTester tester, Map<String, Rect> r) {
          expect(tester.takeException(), isNull);
          final names = r.keys.toList();
          for (var i = 0; i < names.length; i++) {
            final a = r[names[i]]!;
            expect(a.left, greaterThanOrEqualTo(-0.5), reason: names[i]);
            expect(a.top, greaterThanOrEqualTo(-0.5), reason: names[i]);
            expect(
              a.right,
              lessThanOrEqualTo(size.width + 0.5),
              reason: names[i],
            );
            expect(
              a.bottom,
              lessThanOrEqualTo(size.height + 0.5),
              reason: names[i],
            );
            for (var j = i + 1; j < names.length; j++) {
              expect(
                a.overlaps(r[names[j]]!),
                isFalse,
                reason: '${names[i]} ↔ ${names[j]}',
              );
            }
          }
        }

        testWidgets('걷는 중(자동 걷기 + 창 칩 + 앉기): $tag', (tester) async {
          GlassCatalog.debugSetShared(testGlassCatalogFuture());
          addTearDown(GlassCatalog.debugResetShared);
          final h = await pumpChurch(tester, size: size, textScale: scale);
          h.net.goOnline(128);
          h.scene.emit(const SceneNear(seat: 'L03-2'));
          h.scene.emit(const SceneWalkStart('altar'));
          h.scene.emit(
            const SceneGlassNear(id: 'alabaster_stpaul_1', slot: 'aisle'),
          );
          await tester.pump();
          await tester.pump(const Duration(milliseconds: 300));
          final r = rects(tester);
          expect(r.keys, containsAll(['이름판', '도구 줄', '걷기 칩', '창 칩', '상황 버튼']));
          expectClean(tester, r);
          // 도구 줄의 네 항목과 이름판의 두 구역은 모두 48dp 이상.
          for (final tip in ['성당 바꾸기', '소리 끄기', '아바타 편집', '인사']) {
            expect(
              tester.getRect(find.byTooltip(tip)).shortestSide,
              greaterThanOrEqualTo(48),
              reason: tip,
            );
          }
          expect(
            tester
                .getRect(find.byKey(const ValueKey('go-button')))
                .shortestSide,
            greaterThanOrEqualTo(48),
          );
          expect(
            tester.getRect(find.byKey(const ValueKey('presence-chip'))).height,
            greaterThanOrEqualTo(48),
          );
          await tester.pump(const Duration(seconds: 7));
        });

        testWidgets('서 있음(창 칩 + 14처 칩 + 앉기): $tag', (tester) async {
          GlassCatalog.debugSetShared(testGlassCatalogFuture());
          addTearDown(GlassCatalog.debugResetShared);
          final h = await pumpChurch(tester, size: size, textScale: scale);
          h.net.goOnline(12);
          h.scene.emit(const SceneNear(seat: 'L03-2'));
          h.scene.emit(
            const SceneGlassNear(id: 'alabaster_stpaul_1', slot: 'aisle'),
          );
          h.scene.emit(const SceneCrossNear(3));
          await tester.pump();
          await tester.pump(const Duration(milliseconds: 300));
          final r = rects(tester);
          expect(r.keys, containsAll(['이름판', '도구 줄', '창 칩', '14처 칩']));
          expectClean(tester, r);
          await tester.pump(const Duration(seconds: 7));
        });
      }
    }

    testWidgets('도구 줄 라벨은 아이콘 아래에 있고 네 항목이 한 줄', (tester) async {
      await pumpChurch(tester, size: const Size(360, 800));
      final ys = <double>{};
      for (final label in ['소리', '아바타', '인사', '가기']) {
        final t = tester.getRect(find.text(label));
        ys.add(t.center.dy.roundToDouble());
      }
      expect(ys.length, 1, reason: '라벨이 한 줄에 놓인다');
      final icon = tester.getRect(find.byIcon(Icons.place_outlined));
      final label = tester.getRect(find.text('가기'));
      expect(label.top, greaterThanOrEqualTo(icon.bottom - 0.5));
      await tester.pump(const Duration(seconds: 7));
    });
  });
}
