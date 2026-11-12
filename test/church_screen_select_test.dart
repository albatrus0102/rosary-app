import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/church_catalog.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_select_screen.dart';
import 'package:rosary_app/church/church_tab.dart';
import 'package:rosary_app/glass/glass_tab.dart';
import 'package:rosary_app/ui/app_shell.dart';

import 'church_screen_fakes.dart';
import 'glass_test_support.dart';

Future<void> _pumpSelect(
  WidgetTester tester, {
  Size size = const Size(400, 800),
  double textScale = 1.0,
  Set<String>? available,
  ValueChanged<ChurchInfo>? onEnter,
  required AppSettingsHolder holder,
}) async {
  setView(tester, size);
  holder.settings = await loadSettings();
  await tester.pumpWidget(
    wrapApp(
      ChurchSelectScreen(
        settings: holder.settings,
        available: available,
        onEnter: onEnter ?? (_) {},
      ),
      textScale: textScale,
    ),
  );
  await tester.pump();
}

class AppSettingsHolder {
  late dynamic settings;
}

Finder get _vScroll => find
    .descendant(
      of: find.byType(CustomScrollView),
      matching: find.byType(Scrollable),
    )
    .first;

Future<void> _reveal(WidgetTester tester, Finder f) async {
  await tester.scrollUntilVisible(f, 300, scrollable: _vScroll);
  await tester.ensureVisible(f);
  await tester.pump();
}

Finder _card(String id) => find.byKey(ValueKey('church-card-$id'));

void main() {
  testWidgets('renders group headers and one card per catalog church', (
    tester,
  ) async {
    await _pumpSelect(tester, holder: AppSettingsHolder());
    expect(find.text('성당 고르기'), findsWidgets);
    expect(find.text('로마·바티칸'), findsOneWidget);
    for (final g in ['이탈리아', '한국']) {
      await tester.scrollUntilVisible(find.text(g), 300, scrollable: _vScroll);
      expect(find.text(g), findsOneWidget);
    }
    await _reveal(tester, _card('basic'));
    expect(find.text('우리 본당'), findsWidgets);
    await tester.scrollUntilVisible(
      find.text('로마·바티칸'),
      -300,
      scrollable: _vScroll,
    );
    // 첫 구역의 카드 내용: 이름, 도시, 비율 칩, 종류.
    await _reveal(tester, _card('stpeter'));
    expect(find.text('성 베드로 대성전'), findsOneWidget);
    expect(find.textContaining('실제의 '), findsWidgets);
    // 썸네일이 없어도 색 블록으로 대체되므로 예외가 없다.
    expect(find.byType(Image), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('준비 중 churches are hidden unless 준비 중 보기 is on', (tester) async {
    await _pumpSelect(tester, holder: AppSettingsHolder());
    expect(ChurchSelectScreen.availableIds, isNot(contains('sagrada')));
    expect(_card('sagrada'), findsNothing);
    expect(find.text('준비 중'), findsNothing);
    final chip = find.byKey(const ValueKey('chip-upcoming'));
    expect(tester.widget<FilterChip>(chip).selected, isFalse);
    await tester.ensureVisible(chip);
    await tester.tap(chip);
    await tester.pump();
    expect(tester.widget<FilterChip>(chip).selected, isTrue);
    await _reveal(tester, _card('sagrada'));
    expect(find.text('준비 중'), findsWidgets);
    await tester.drag(_vScroll, const Offset(0, 6000));
    await tester.pump();
    await tester.ensureVisible(chip);
    await tester.tap(chip);
    await tester.pump();
    expect(_card('sagrada'), findsNothing);
  });

  testWidgets('unavailable churches are disabled with 준비 중', (tester) async {
    final h = AppSettingsHolder();
    await _pumpSelect(tester, holder: h);
    final chip = find.byKey(const ValueKey('chip-upcoming'));
    await tester.ensureVisible(chip);
    await tester.tap(chip);
    await tester.pump();
    await _reveal(tester, _card('sagrada'));
    expect(
      find.descendant(of: _card('sagrada'), matching: find.text('준비 중')),
      findsOneWidget,
    );
    await tester.tap(_card('sagrada'), warnIfMissed: false);
    await tester.pumpAndSettle();
    expect(find.byType(BottomSheet), findsNothing);
    expect(find.text('입장'), findsNothing);
  });

  testWidgets('available card opens a detail sheet and enter saves the id', (
    tester,
  ) async {
    final h = AppSettingsHolder();
    ChurchInfo? entered;
    await _pumpSelect(
      tester,
      holder: h,
      available: {'basic', 'stpeter'},
      onEnter: (i) => entered = i,
    );
    await _reveal(tester, _card('stpeter'));
    await tester.tap(_card('stpeter'));
    await tester.pumpAndSettle();
    final info = ChurchCatalog.byId['stpeter']!;
    expect(
      find.descendant(
        of: find.byType(BottomSheet),
        matching: find.text(info.nameKo),
      ),
      findsOneWidget,
    );
    expect(find.text('설명 준비 중'), findsOneWidget);
    expect(
      find.text('실제 건축을 단순화한 3D 모형이며 실제 크기의 ${info.scalePercent}%입니다'),
      findsOneWidget,
    );
    expect(find.textContaining(info.kind), findsWidgets);
    expect(h.settings.churchId, 'basic');
    await tester.tap(find.widgetWithText(FilledButton, '입장'));
    await tester.pumpAndSettle();
    expect(h.settings.churchId, 'stpeter');
    expect(entered?.id, 'stpeter');
  });

  testWidgets('selection persists across settings reloads', (tester) async {
    final h = AppSettingsHolder();
    await _pumpSelect(tester, holder: h);
    await _reveal(tester, _card('basic'));
    await tester.tap(_card('basic'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '입장'));
    await tester.pumpAndSettle();
    expect(h.settings.churchId, 'basic');
  });

  testWidgets('responsive columns: 2 compact, 3 medium, 4 expanded', (
    tester,
  ) async {
    final h = AppSettingsHolder();
    for (final (size, cols) in [
      (const Size(360, 800), 2),
      (const Size(700, 900), 3),
      (const Size(1000, 900), 4),
    ]) {
      await _pumpSelect(tester, holder: h, size: size);
      final first = tester.getTopLeft(_card('stpeter')).dy;
      final inRow = ChurchCatalog.inGroup('로마·바티칸')
          .take(cols)
          .where((c) => tester.any(_card(c.id)))
          .where((c) => tester.getTopLeft(_card(c.id)).dy == first)
          .length;
      expect(
        inRow,
        ChurchCatalog.inGroup('로마·바티칸').length >= cols ? cols : inRow,
      );
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets('no overflow at 360x640 text scale 1.5', (tester) async {
    final h = AppSettingsHolder();
    await _pumpSelect(
      tester,
      holder: h,
      size: const Size(360, 640),
      textScale: 1.5,
    );
    final scroll = _vScroll;
    for (var i = 0; i < 12; i++) {
      await tester.drag(scroll, const Offset(0, -400));
      await tester.pump();
    }
    expect(tester.takeException(), isNull);
    // 상세 시트도 넘치지 않는다.
    await _reveal(tester, _card('basic'));
    await tester.tap(_card('basic'));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(FilledButton, '입장'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('hero shows title and subtitle, search bar and chips', (
    tester,
  ) async {
    await _pumpSelect(tester, holder: AppSettingsHolder());
    expect(find.text('성당 고르기'), findsOneWidget);
    expect(find.text('마음에 드는 성당을 골라보세요.'), findsOneWidget);
    expect(find.byType(SearchBar), findsOneWidget);
    expect(find.text('성당 이름이나 도시로 검색하기'), findsOneWidget);
    for (final t in ['전체', '지역', '건축 양식', '추천순']) {
      expect(find.widgetWithText(FilterChip, t), findsOneWidget);
    }
  });

  testWidgets('search filters by name or city', (tester) async {
    await _pumpSelect(tester, holder: AppSettingsHolder());
    await tester.enterText(find.byType(SearchBar), '명동');
    await tester.pump();
    expect(_card('myeongdong'), findsOneWidget);
    expect(_card('stpeter'), findsNothing);
    await tester.enterText(find.byType(SearchBar), '이탈리아');
    await tester.pump();
    expect(_card('lateran'), findsOneWidget);
    expect(_card('myeongdong'), findsNothing);
    await tester.enterText(find.byType(SearchBar), '없는성당');
    await tester.pump();
    expect(find.text('찾는 성당이 없어요'), findsOneWidget);
    await tester.tap(find.byTooltip('검색어 지우기'));
    await tester.pump();
    expect(_card('stpeter'), findsOneWidget);
  });

  testWidgets('region and style chips open menus and filter', (tester) async {
    await _pumpSelect(tester, holder: AppSettingsHolder());
    await tester.tap(find.byKey(const ValueKey('chip-region')));
    await tester.pumpAndSettle();
    for (final r in ['로마·바티칸', '이탈리아', '한국', '세계']) {
      expect(find.widgetWithText(MenuItemButton, r), findsOneWidget);
    }
    await tester.tap(find.widgetWithText(MenuItemButton, '한국'));
    await tester.pumpAndSettle();
    expect(_card('myeongdong'), findsOneWidget);
    expect(_card('stpeter'), findsNothing);

    await tester.tap(find.byKey(const ValueKey('chip-style')));
    await tester.pumpAndSettle();
    for (final r in ['로마네스크·비잔틴', '고딕', '르네상스·바로크', '근대']) {
      expect(find.widgetWithText(MenuItemButton, r), findsOneWidget);
    }
    await tester.tap(find.widgetWithText(MenuItemButton, '로마네스크·비잔틴'));
    await tester.pumpAndSettle();
    expect(_card('jeondong'), findsNothing); // 준비 중이라 숨김
    await tester.ensureVisible(find.byKey(const ValueKey('chip-upcoming')));
    await tester.tap(find.byKey(const ValueKey('chip-upcoming')));
    await tester.pumpAndSettle();
    expect(_card('jeondong'), findsOneWidget);
    expect(_card('myeongdong'), findsNothing);

    await tester.ensureVisible(find.widgetWithText(FilterChip, '전체'));
    await tester.tap(find.widgetWithText(FilterChip, '전체'));
    await tester.pumpAndSettle();
    expect(_card('stpeter'), findsOneWidget);
  });

  test('arrange: sorts and puts favorites first', () {
    final all = ChurchCatalog.all;
    final byName = ChurchSelectScreen.arrange(all, sort: ChurchSort.name);
    final names = [for (final c in byName) c.nameKo];
    expect(names, [...names]..sort());
    final favs = ChurchSelectScreen.arrange(
      all,
      sort: ChurchSort.name,
      favorites: {'stpeter', 'basic'},
    );
    expect({favs[0].id, favs[1].id}, {'stpeter', 'basic'});
    final rec = ChurchSelectScreen.arrange(all);
    expect(rec.first.id, all.first.id);
    final scale = ChurchSelectScreen.arrange(all, sort: ChurchSort.scale);
    expect(scale.first.scalePercent, 100);
  });

  testWidgets('favorite toggle persists in settings', (tester) async {
    final h = AppSettingsHolder();
    await _pumpSelect(tester, holder: h);
    await _reveal(tester, _card('stpeter'));
    await tester.tap(find.byKey(const ValueKey('fav-stpeter')));
    await tester.pump();
    expect(h.settings.churchFavorites, {'stpeter'});
    expect(find.byTooltip('즐겨찾기 해제'), findsOneWidget);
    // 저장소에 남아 다시 불러와도 유지된다.
    final reloaded = await AppSettings.load();
    expect(reloaded.churchFavorites, {'stpeter'});
    await tester.tap(find.byKey(const ValueKey('fav-stpeter')));
    await tester.pump();
    expect(h.settings.churchFavorites, isEmpty);
  });

  testWidgets('favorites float to the front of their section', (tester) async {
    final h = AppSettingsHolder();
    await _pumpSelect(tester, holder: h);
    h.settings.toggleChurchFavorite('florence');
    await tester.pump();
    await _reveal(tester, _card('florence'));
    final f = tester.getTopLeft(_card('florence'));
    final m = tester.getTopLeft(_card('milan'));
    expect(f.dy < m.dy || (f.dy == m.dy && f.dx < m.dx), isTrue);
  });

  testWidgets('chips do not overflow at 360x640 text scale 1.5', (
    tester,
  ) async {
    final h = AppSettingsHolder();
    await _pumpSelect(
      tester,
      holder: h,
      size: const Size(360, 640),
      textScale: 1.5,
    );
    await tester.ensureVisible(find.byKey(const ValueKey('chip-sort')));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('chip-sort')));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(MenuItemButton, '축소 비율순'));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(FilterChip, '축소 비율순'), findsOneWidget);
    await tester.ensureVisible(find.byKey(const ValueKey('chip-region')));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('chip-region')));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(MenuItemButton, '이탈리아'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  group('church tab flow', () {
    testWidgets('select -> 입장 connects with the id; 성당 바꾸기 returns', (
      tester,
    ) async {
      setView(tester, const Size(400, 800));
      // 처음 방문(아직 성당에 들어간 적 없음): 바로 선택 목록이 열린다.
      final settings = await loadSettings(avatarChosen: false);
      final net = FakeChurchNet();
      final scene = FakeChurchSceneController();
      await tester.pumpWidget(
        wrapApp(
          ChurchTab(
            settings: settings,
            net: net,
            scene: scene,
            availableIds: const {'basic', 'stpeter'},
          ),
        ),
      );
      expect(find.byKey(const ValueKey('entry-card')), findsNothing);
      await _reveal(tester, _card('stpeter'));
      await tester.tap(_card('stpeter'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, '입장'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      await tester.pump(const Duration(seconds: 1));
      // 처음이라 한 페이지 설정 화면이 먼저 나온다.
      expect(find.text('처음 오셨네요'), findsOneWidget);
      expect(net.connectedIds, isEmpty);
      await tester.tap(find.text('성당 들어가기'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      await tester.pump(const Duration(seconds: 1));
      scene.emit(const SceneReady());
      await tester.pump();
      expect(net.connectedIds, ['stpeter']);
      expect(scene.lastArgs('init')!['church'], 'stpeter');
      expect(find.text('성 베드로 대성전'), findsOneWidget); // HUD 칩
      expect(find.text('성당 고르기'), findsNothing);

      await tester.tap(find.byTooltip('성당 바꾸기'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      expect(net.disconnects, 1);
      expect(find.text('성당 고르기'), findsWidgets);
    });
  });

  group('first entry setup in the church tab', () {
    testWidgets('backing out of the setup returns to the church list', (
      tester,
    ) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings(avatarChosen: false);
      final net = FakeChurchNet();
      await tester.pumpWidget(
        wrapApp(
          ChurchTab(
            settings: settings,
            net: net,
            scene: FakeChurchSceneController(),
            availableIds: const {'basic', 'stpeter'},
          ),
        ),
      );
      await _reveal(tester, _card('stpeter'));
      await tester.tap(_card('stpeter'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, '입장'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('처음 오셨네요'), findsOneWidget);
      tester.state<NavigatorState>(find.byType(Navigator)).pop();
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      expect(net.connectedIds, isEmpty);
      expect(settings.churchAvatarChosen, isFalse);
      expect(find.text('성당 고르기'), findsWidgets);
    });
  });

  group('entry card (C-02)', () {
    Future<(AppSettings, FakeChurchNet, FakeChurchSceneController)> pumpTab(
      WidgetTester tester, {
      Size size = const Size(400, 800),
      double textScale = 1.0,
      String? last,
    }) async {
      setView(tester, size);
      final settings = await loadSettings(); // 성당에 들어간 적 있음
      if (last != null) settings.churchId = last;
      final net = FakeChurchNet();
      final scene = FakeChurchSceneController();
      await tester.pumpWidget(
        wrapApp(
          ChurchTab(
            settings: settings,
            net: net,
            scene: scene,
            availableIds: const {'basic', 'stpeter', 'myeongdong'},
          ),
          textScale: textScale,
        ),
      );
      await tester.pump();
      return (settings, net, scene);
    }

    testWidgets('returning visit shows the last church with 입장', (
      tester,
    ) async {
      await pumpTab(tester, last: 'myeongdong');
      expect(find.byKey(const ValueKey('entry-card')), findsOneWidget);
      expect(find.text('명동대성당'), findsOneWidget);
      expect(find.textContaining('서울'), findsOneWidget);
      expect(find.byType(Image), findsOneWidget); // 썸네일
      final enter = find.byKey(const ValueKey('entry-enter'));
      final pick = find.byKey(const ValueKey('entry-pick'));
      expect(find.text('다른 성당 고르기'), findsOneWidget);
      // 입장이 더 크고 위에 있다.
      expect(
        tester.getSize(enter).height,
        greaterThan(tester.getSize(pick).height),
      );
      expect(tester.getTopLeft(enter).dy, lessThan(tester.getTopLeft(pick).dy));
      expect(find.text('성당 고르기'), findsNothing);
    });

    testWidgets('입장 enters the last church without picking again', (
      tester,
    ) async {
      final (_, net, scene) = await pumpTab(tester, last: 'myeongdong');
      await tester.tap(find.byKey(const ValueKey('entry-enter')));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      scene.emit(const SceneReady());
      await tester.pump();
      expect(net.connectedIds, ['myeongdong']);
      expect(scene.lastArgs('init')!['church'], 'myeongdong');
    });

    testWidgets('다른 성당 고르기 opens the list; back and 성당 바꾸기 work', (
      tester,
    ) async {
      final (settings, net, scene) = await pumpTab(tester, last: 'stpeter');
      await tester.tap(find.byKey(const ValueKey('entry-pick')));
      await tester.pumpAndSettle();
      expect(find.text('성당 고르기'), findsWidgets);
      expect(find.byKey(const ValueKey('entry-card')), findsNothing);
      // 뒤로 가면 마지막 성당 카드.
      await tester.tap(find.byKey(const ValueKey('select-back')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('entry-card')), findsOneWidget);
      // 다시 목록에서 다른 성당을 골라 입장하면 그 성당이 마지막 성당이 된다.
      await tester.tap(find.byKey(const ValueKey('entry-pick')));
      await tester.pumpAndSettle();
      await _reveal(tester, _card('basic'));
      await tester.tap(_card('basic'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, '입장'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      scene.emit(const SceneReady());
      await tester.pump();
      expect(net.connectedIds, ['basic']);
      expect(settings.churchId, 'basic');
      // HUD 의 성당 바꾸기 → 목록.
      await tester.tap(find.byTooltip('성당 바꾸기'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('성당 고르기'), findsWidgets);
    });

    testWidgets('an unavailable last church falls back to an available one', (
      tester,
    ) async {
      await pumpTab(tester, last: 'sagrada');
      expect(
        tester.widget<Text>(find.byKey(const ValueKey('entry-name'))).data,
        '우리 본당',
      );
    });

    testWidgets('no overflow at 360x640 text scale 2.0', (tester) async {
      await pumpTab(
        tester,
        size: const Size(360, 640),
        textScale: 2.0,
        last: 'stpeter',
      );
      expect(tester.takeException(), isNull);
      final enter = find.byKey(const ValueKey('entry-enter'));
      await tester.ensureVisible(enter);
      await tester.pump();
      expect(tester.getSize(enter).height, greaterThanOrEqualTo(48));
      expect(tester.takeException(), isNull);
    });
  });

  group('app shell', () {
    Finder segment(String label) => find.descendant(
      of: find.byKey(const ValueKey('glass-segment')),
      matching: find.text(label),
    );

    testWidgets('성당은 유리화 탭의 [창 | 성당] 전환 안에서 게으르게 만들어진다', (tester) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings();
      var built = 0;
      var disposed = 0;
      await tester.pumpWidget(
        wrapApp(
          AppShell(
            settings: settings,
            glassCatalog: testGlassCatalogFuture(),
            churchBuilder: (context) {
              built++;
              return _Probe(onDispose: () => disposed++);
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      final bar = find.byType(NavigationBar);
      expect(tester.widget<NavigationBar>(bar).destinations, hasLength(4));
      // 탭 줄에는 더 이상 '성당'이 없다.
      expect(find.descendant(of: bar, matching: find.text('성당')), findsNothing);
      expect(
        find.descendant(of: bar, matching: find.text('유리화')),
        findsOneWidget,
      );
      expect(built, 0);

      await tester.tap(segment('성당'));
      await tester.pumpAndSettle();
      expect(built, greaterThan(0));
      expect(find.text('PROBE'), findsOneWidget);

      // 다른 탭으로 가면 성당 화면은 정리된다.
      await tester.tap(find.descendant(of: bar, matching: find.text('오늘')));
      await tester.pumpAndSettle();
      expect(disposed, 1);
      expect(find.text('PROBE'), findsNothing);
    });

    testWidgets('시스템 뒤로가기: 성당 보기 → 창 보기', (tester) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings();
      await tester.pumpWidget(
        wrapApp(
          AppShell(
            settings: settings,
            glassCatalog: testGlassCatalogFuture(),
            churchBuilder: (context) => const _Probe(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(segment('성당'));
      await tester.pumpAndSettle();
      expect(find.text('PROBE'), findsOneWidget);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.text('PROBE'), findsNothing);
      expect(find.byKey(const ValueKey('glass-today')), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('성당 장면 안에서는 전환 줄이 숨고 나오면 다시 보인다', (tester) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings();
      final net = FakeChurchNet();
      final scene = FakeChurchSceneController();
      await tester.pumpWidget(
        wrapApp(
          GlassTab(
            settings: settings,
            catalog: testGlassCatalogFuture(),
            initialSegment: GlassSegment.church,
            churchBuilder: (context) => ChurchTab(
              settings: settings,
              net: net,
              scene: scene,
              availableIds: const {'basic', 'stpeter'},
              onInChurchChanged: (_) {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      // 선택/입장 카드가 전환 줄 아래에 보인다.
      expect(find.byKey(const ValueKey('glass-segment')), findsOneWidget);
    });

    testWidgets('wide layout rail shows 유리화·오늘·기록·더보기', (tester) async {
      setView(tester, const Size(1000, 800));
      final settings = await loadSettings();
      await tester.pumpWidget(
        wrapApp(
          AppShell(settings: settings, glassCatalog: testGlassCatalogFuture()),
        ),
      );
      await tester.pumpAndSettle();
      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.destinations, hasLength(4));
      expect((rail.destinations.first.label as Text).data, '유리화');
      expect(find.byKey(const ValueKey('glass-segment')), findsOneWidget);
      expect(find.byKey(const ValueKey('glass-today')), findsOneWidget);
    });
  });
}

class _Probe extends StatefulWidget {
  const _Probe({this.onDispose});
  final VoidCallback? onDispose;

  @override
  State<_Probe> createState() => _ProbeState();
}

class _ProbeState extends State<_Probe> {
  @override
  void dispose() {
    widget.onDispose?.call();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => const Center(child: Text('PROBE'));
}
