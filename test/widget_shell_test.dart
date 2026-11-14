import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app_services.dart';
import 'package:rosary_app/app/leader_voice.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/stats/stats_screen.dart';
import 'package:rosary_app/glass/glass_gallery.dart';
import 'package:rosary_app/glass/glass_tab.dart';
import 'package:rosary_app/ui/app_shell.dart';
import 'package:rosary_app/ui/home_screen.dart';
import 'package:rosary_app/ui/more_screen.dart';
import 'package:rosary_app/ui/rosary_style_screen.dart';
import 'package:rosary_app/ui/settings_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'glass_test_support.dart';

Future<void> _pumpShell(
  WidgetTester tester,
  Size size, {
  double textScale = 1.0,
  AppShellTab initialTab = AppShellTab.today,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  SharedPreferences.setMockInitialValues({});
  final settings = await AppSettings.load();
  final services = AppServices.inMemory(settings);
  addTearDown(services.disposeInMemory);
  await tester.pumpWidget(
    AppServicesScope(
      services: services,
      child: MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(textScale)),
          child: child!,
        ),
        home: AppShell(
          settings: settings,
          initialTab: initialTab,
          glassCatalog: testGlassCatalogFuture(),
          churchBuilder: (_) => const Center(child: Text('church-body')),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

bool _hasText(Semantics w, String t) {
  final c = w.child;
  return c is Text && c.data == t;
}

Finder _nav(String label) =>
    find.descendant(of: find.byType(NavigationBar), matching: find.text(label));

void main() {
  testWidgets('compact width uses NavigationBar: 성당 · 오늘 · 기록 · 더보기', (
    tester,
  ) async {
    await _pumpShell(
      tester,
      const Size(360, 640),
      initialTab: AppShellTab.church,
    );
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);
    final bar = tester.widget<NavigationBar>(find.byType(NavigationBar));
    expect(bar.destinations, hasLength(4));
    final xs = [
      for (final l in ['성당', '오늘', '기록', '더보기']) tester.getCenter(_nav(l)).dx,
    ];
    expect(xs, orderedEquals([...xs]..sort()));
    // 첫 탭은 성당(M3: 아이콘·라벨, 선택 표시).
    final dests = bar.destinations.cast<NavigationDestination>();
    expect((dests.first.icon as Icon).icon, Icons.church_outlined);
    expect((dests.first.selectedIcon as Icon).icon, Icons.church);
    expect(bar.selectedIndex, 0);
    for (final old in ['유리화', '기도', '묵주', '설정']) {
      expect(_nav(old), findsNothing, reason: old);
    }
  });

  testWidgets('앱을 열면 성당 탭이 선택돼 있고 성당 보기가 먼저 보인다', (tester) async {
    await _pumpShell(
      tester,
      const Size(360, 800),
      initialTab: AppShellTab.church,
    );
    final stack = find.byType(IndexedStack);
    expect(tester.widget<IndexedStack>(stack).index, 0);
    expect(
      tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
      0,
    );
    expect(find.byType(GlassTab), findsOneWidget);
    // 성당 보기(메인)가 바로 보이고, 창 갤러리는 아직 만들지 않았다.
    expect(find.text('church-body'), findsOneWidget);
    expect(find.byType(GlassGallery, skipOffstage: false), findsNothing);
    expect(find.byKey(const ValueKey('glass-prayer-strip')), findsNothing);
    expect(find.byKey(const ValueKey('glass-segment')), findsOneWidget);
  });

  testWidgets('세그먼트는 [성당 | 창] 순서이고 기본은 성당이다', (tester) async {
    await _pumpShell(
      tester,
      const Size(360, 800),
      initialTab: AppShellTab.church,
    );
    final seg = tester.widget<SegmentedButton<GlassSegment>>(
      find.byKey(const ValueKey('glass-segment')),
    );
    expect(seg.segments.map((e) => e.value), [
      GlassSegment.church,
      GlassSegment.window,
    ]);
    expect(seg.selected, {GlassSegment.church});
    final labels = [
      for (final l in ['성당', '창'])
        tester
            .getCenter(
              find.descendant(
                of: find.byKey(const ValueKey('glass-segment')),
                matching: find.text(l),
              ),
            )
            .dx,
    ];
    expect(labels[0], lessThan(labels[1]));
  });

  testWidgets('헤더: 성당은 \'가상 성당\'(하트 없음), 창은 \'스테인드글라스\'(하트)', (tester) async {
    await _pumpShell(
      tester,
      const Size(360, 800),
      initialTab: AppShellTab.church,
    );
    Finder title(String t) => find.byWidgetPredicate(
      (w) => w is Semantics && w.properties.header == true && _hasText(w, t),
    );
    expect(find.text('가상 성당'), findsOneWidget);
    expect(find.text('스테인드글라스'), findsNothing);
    expect(find.byKey(const ValueKey('glass-favorites')), findsNothing);
    final h1 = tester
        .getSize(find.byKey(const ValueKey('glass-segment')))
        .height;
    final y1 = tester
        .getTopLeft(find.byKey(const ValueKey('glass-segment')))
        .dy;
    expect(title('가상 성당'), findsOneWidget);

    await tester.tap(
      find.descendant(
        of: find.byKey(const ValueKey('glass-segment')),
        matching: find.text('창'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('스테인드글라스'), findsOneWidget);
    expect(find.text('가상 성당'), findsNothing);
    expect(find.byKey(const ValueKey('glass-favorites')), findsOneWidget);
    expect(title('스테인드글라스'), findsOneWidget);
    // 보기를 바꿔도 전환 줄이 아래위로 움직이지 않는다.
    expect(
      tester.getTopLeft(find.byKey(const ValueKey('glass-segment'))).dy,
      y1,
    );
    expect(
      tester.getSize(find.byKey(const ValueKey('glass-segment'))).height,
      h1,
    );
  });

  testWidgets('창 보기: 오늘의 창 아래 띠로 기도(오늘)에 한 번에 간다', (tester) async {
    await _pumpShell(
      tester,
      const Size(360, 800),
      initialTab: AppShellTab.church,
    );
    await tester.tap(
      find.descendant(
        of: find.byKey(const ValueKey('glass-segment')),
        matching: find.text('창'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(GlassGallery), findsOneWidget);
    expect(find.byKey(const ValueKey('glass-today')), findsOneWidget);
    final stack = find.byType(IndexedStack);
    expect(find.byKey(const ValueKey('glass-prayer-strip')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('glass-prayer-strip')));
    await tester.pumpAndSettle();
    expect(tester.widget<IndexedStack>(stack).index, 1);
    expect(find.byType(HomeScreen), findsOneWidget);
  });

  testWidgets('initialTab으로 기도(오늘)를 바로 열 수 있다', (tester) async {
    await _pumpShell(tester, const Size(360, 800));
    expect(tester.widget<IndexedStack>(find.byType(IndexedStack)).index, 1);
    expect(find.byType(HomeScreen), findsOneWidget);
  });

  testWidgets('medium width uses a collapsed NavigationRail', (tester) async {
    await _pumpShell(tester, const Size(700, 800));
    expect(find.byType(NavigationBar), findsNothing);
    final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
    expect(rail.extended, isFalse);
    expect(rail.destinations, hasLength(4));
  });

  testWidgets('expanded width uses an extended NavigationRail', (tester) async {
    await _pumpShell(tester, const Size(1000, 800));
    final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
    expect(rail.extended, isTrue);
  });

  testWidgets('tabs switch between 성당, 오늘, 기록, 더보기', (tester) async {
    await _pumpShell(
      tester,
      const Size(360, 800),
      initialTab: AppShellTab.church,
    );
    final stack = find.byType(IndexedStack);
    expect(tester.widget<IndexedStack>(stack).index, 0);
    expect(find.byType(GlassTab), findsOneWidget);

    await tester.tap(_nav('오늘'));
    await tester.pumpAndSettle();
    expect(tester.widget<IndexedStack>(stack).index, 1);
    expect(find.byType(HomeScreen), findsOneWidget);

    await tester.tap(_nav('기록'));
    await tester.pumpAndSettle();
    expect(tester.widget<IndexedStack>(stack).index, 2);
    expect(find.byType(StatsScreen), findsOneWidget);

    await tester.tap(_nav('더보기'));
    await tester.pumpAndSettle();
    expect(tester.widget<IndexedStack>(stack).index, 3);
    expect(find.byType(MoreScreen), findsOneWidget);

    await tester.tap(_nav('성당'));
    await tester.pumpAndSettle();
    expect(tester.widget<IndexedStack>(stack).index, 0);
  });

  testWidgets('창 갤러리는 처음 \'창\'을 고를 때 만들고, 뒤로가기는 창에서 성당으로 간다', (tester) async {
    await _pumpShell(
      tester,
      const Size(360, 800),
      initialTab: AppShellTab.church,
    );
    expect(find.text('church-body'), findsOneWidget);
    expect(find.byType(GlassGallery, skipOffstage: false), findsNothing);
    await tester.tap(
      find.descendant(
        of: find.byKey(const ValueKey('glass-segment')),
        matching: find.text('창'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(GlassGallery), findsOneWidget);
    // 성당 보기는 안 보이지만 그대로 남아 있다.
    expect(find.text('church-body'), findsNothing);
    expect(find.text('church-body', skipOffstage: false), findsOneWidget);
    // 다른 탭에 다녀와도 창 보기가 그대로다.
    await tester.tap(_nav('기록'));
    await tester.pumpAndSettle();
    await tester.tap(_nav('성당'));
    await tester.pumpAndSettle();
    expect(find.byType(GlassGallery), findsOneWidget);
    // 뒤로가기: 창 → 성당(탭은 그대로 첫 탭).
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('church-body'), findsOneWidget);
    expect(find.byType(GlassGallery), findsNothing);
    expect(find.text('가상 성당'), findsOneWidget);
    expect(tester.widget<IndexedStack>(find.byType(IndexedStack)).index, 0);
  });

  testWidgets('성당 보기(메인)에서 뒤로가기: 한 번은 안내, 한 번 더 누르면 종료', (tester) async {
    final popCalls = <String>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'SystemNavigator.pop') popCalls.add(call.method);
        return null;
      },
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      ),
    );
    await _pumpShell(
      tester,
      const Size(360, 800),
      initialTab: AppShellTab.church,
    );
    expect(find.text('한 번 더 누르면 종료돼요'), findsNothing);
    await tester.binding.handlePopRoute();
    await tester.pump();
    expect(find.text('한 번 더 누르면 종료돼요'), findsOneWidget);
    expect(popCalls, isEmpty);
    await tester.binding.handlePopRoute();
    await tester.pump();
    expect(popCalls, hasLength(1));
  });

  testWidgets('다른 탭에서 뒤로가기는 종료 안내 없이 성당 탭으로 간다', (tester) async {
    await _pumpShell(tester, const Size(360, 800));
    await tester.tap(_nav('기록'));
    await tester.pumpAndSettle();
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(tester.widget<IndexedStack>(find.byType(IndexedStack)).index, 0);
    expect(find.text('한 번 더 누르면 종료돼요'), findsNothing);
  });

  testWidgets('더보기: 묵주 스타일·설정은 새 화면으로 열리고 뒤로 오면 더보기다', (tester) async {
    await _pumpShell(tester, const Size(360, 640));
    await tester.tap(_nav('더보기'));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('more-styles')));
    await tester.pumpAndSettle();
    expect(find.byType(RosaryStyleScreen), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.byType(RosaryStyleScreen), findsNothing);
    expect(find.byType(MoreScreen), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('more-settings')));
    await tester.pumpAndSettle();
    expect(find.byType(SettingsScreen), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.byType(MoreScreen), findsOneWidget);
  });

  testWidgets('더보기 > 정보에 비공식 고지가 있다 (D-01)', (tester) async {
    await _pumpShell(tester, const Size(360, 640));
    await tester.tap(_nav('더보기'));
    await tester.pumpAndSettle();
    expect(find.text(appUnofficialNotice), findsOneWidget);
    expect(find.textContaining(aiVoiceNotice), findsOneWidget);
  });

  testWidgets('묵주 그림·설정 열기 버튼은 새 화면을 연다', (tester) async {
    await _pumpShell(tester, const Size(360, 640));

    await tester.ensureVisible(find.text('묵주 바꾸기'));
    await tester.pump();
    await tester.tap(find.text('묵주 바꾸기'));
    await tester.pumpAndSettle();
    expect(find.byType(RosaryStyleScreen), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('후창'));
    await tester.pump();
    await tester.tap(find.text('후창'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('설정 열기'));
    await tester.pump();
    await tester.tap(find.text('설정 열기'));
    await tester.pumpAndSettle();
    expect(find.byType(SettingsScreen), findsOneWidget);
  });

  testWidgets('뒤로가기는 다른 탭에서 성당 탭으로 돌아간다', (tester) async {
    await _pumpShell(tester, const Size(360, 640));
    await tester.tap(_nav('기록'));
    await tester.pumpAndSettle();
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(tester.widget<IndexedStack>(find.byType(IndexedStack)).index, 0);
    expect(find.byType(GlassTab), findsOneWidget);
  });

  for (final size in const [Size(360, 800), Size(412, 915), Size(840, 800)]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        '성당 탭 머리줄·전환 줄: ${size.width.toInt()}x${size.height.toInt()} 글자 $scale배에서 겹치지 않는다',
        (tester) async {
          await _pumpShell(
            tester,
            size,
            textScale: scale,
            initialTab: AppShellTab.church,
          );
          for (final seg in ['성당', '창', '성당']) {
            await tester.tap(
              find.descendant(
                of: find.byKey(const ValueKey('glass-segment')),
                matching: find.text(seg),
              ),
            );
            await tester.pumpAndSettle();
            expect(tester.takeException(), isNull, reason: seg);
            final title = find.text(seg == '성당' ? '가상 성당' : '스테인드글라스');
            expect(title, findsOneWidget);
            final seg0 = tester.getRect(
              find.byKey(const ValueKey('glass-segment')),
            );
            // 제목은 전환 줄 위에, 둘은 겹치지 않는다. 하트(창 보기)는 제목과 가로로 겹치지 않는다.
            expect(tester.getRect(title).bottom, lessThanOrEqualTo(seg0.top));
            if (seg == '창') {
              expect(
                tester.getRect(title).right,
                lessThanOrEqualTo(
                  tester
                      .getRect(find.byKey(const ValueKey('glass-favorites')))
                      .left,
                ),
              );
            }
          }
        },
      );
    }
  }

  for (final scale in [1.5, 2.0]) {
    testWidgets('no overflow at 360x640 with text scale $scale', (
      tester,
    ) async {
      await _pumpShell(
        tester,
        const Size(360, 640),
        textScale: scale,
        initialTab: AppShellTab.church,
      );
      expect(tester.takeException(), isNull);
      expect(find.byType(NavigationBar), findsOneWidget);
      for (final tab in ['오늘', '기록', '더보기', '성당']) {
        await tester.tap(_nav(tab));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: tab);
      }
    });
  }
}
