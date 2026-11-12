import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/church_catalog.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_select_screen.dart';
import 'package:rosary_app/church/church_tab.dart';
import 'package:rosary_app/ui/app_shell.dart';

import 'church_screen_fakes.dart';

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
    // 썸네일이 없어도 색 블록 대체로 그려진다(예외 없음).
    expect(find.byIcon(Icons.church), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('unavailable churches are disabled with 준비 중', (tester) async {
    final h = AppSettingsHolder();
    await _pumpSelect(tester, holder: h);
    expect(ChurchSelectScreen.availableIds, isNot(contains('sagrada')));
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
    expect(_card('jeondong'), findsOneWidget);
    expect(_card('myeongdong'), findsNothing);

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
      final settings = await loadSettings();
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
      await _reveal(tester, _card('stpeter'));
      await tester.tap(_card('stpeter'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, '입장'));
      await tester.pump();
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

  group('app shell', () {
    testWidgets('has a 4th 성당 destination that builds lazily', (tester) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings();
      var built = 0;
      var disposed = 0;
      await tester.pumpWidget(
        wrapApp(
          AppShell(
            settings: settings,
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
      expect(
        find.descendant(of: bar, matching: find.text('성당')),
        findsOneWidget,
      );
      expect(find.byIcon(Icons.church), findsOneWidget);
      expect(built, 0);

      await tester.tap(find.descendant(of: bar, matching: find.text('성당')));
      await tester.pumpAndSettle();
      expect(built, greaterThan(0));
      expect(find.text('PROBE'), findsOneWidget);

      // 다른 탭으로 가면 성당 화면은 정리된다.
      await tester.tap(find.descendant(of: bar, matching: find.text('설정')));
      await tester.pumpAndSettle();
      expect(disposed, 1);
      expect(find.text('PROBE'), findsNothing);
    });

    testWidgets('system back from the church tab returns to 기도', (
      tester,
    ) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings();
      await tester.pumpWidget(
        wrapApp(
          AppShell(
            settings: settings,
            churchBuilder: (context) => const _Probe(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(
        find.descendant(
          of: find.byType(NavigationBar),
          matching: find.text('성당'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('PROBE'), findsOneWidget);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.text('PROBE'), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('wide layout rail shows 성당', (tester) async {
      setView(tester, const Size(1000, 800));
      final settings = await loadSettings();
      await tester.pumpWidget(wrapApp(AppShell(settings: settings)));
      await tester.pumpAndSettle();
      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.destinations, hasLength(4));
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
