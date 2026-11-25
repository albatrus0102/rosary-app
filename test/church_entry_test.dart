// 성당 탭 '입구' 화면(시안 재디자인): 넓은 화면 레일/좁은 화면 하단 바, 큰 카드 + 캐러셀,
// 한 번에 입장, 상태 유지, 넘침 없음, 그림 자산 대체 규칙.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app_services.dart';
import 'package:rosary_app/app/release_gate.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_catalog.dart';
import 'package:rosary_app/church/church_entry_art.dart';
import 'package:rosary_app/church/church_entry_card.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:rosary_app/church/church_select_screen.dart';
import 'package:rosary_app/church/church_tab.dart';
import 'package:rosary_app/church/church_theme.dart';
import 'package:rosary_app/ui/app_shell.dart';

import 'church_screen_fakes.dart';
import 'glass_test_support.dart';

const _ids = {'basic', 'stpeter', 'lateran', 'milan', 'myeongdong'};

Finder _thumb(String id) => find.byKey(ValueKey('entry-thumb-$id'));

String _name(WidgetTester tester) =>
    tester.widget<Text>(find.byKey(const ValueKey('entry-name'))).data!;

Finder _segment(String label) => find.descendant(
  of: find.byKey(const ValueKey('glass-segment')),
  matching: find.text(label),
);

/// 앱 셸(성당 탭) 안에 입구 화면을 띄운다.
Future<(AppSettings, FakeChurchNet, FakeChurchSceneController)> _pumpShell(
  WidgetTester tester, {
  Size size = const Size(360, 800),
  double textScale = 1,
  Brightness brightness = Brightness.light,
  bool avatarChosen = true,
  String last = 'milan',
  EdgeInsets padding = EdgeInsets.zero,
  Set<String> ids = _ids,
}) async {
  setView(tester, size);
  if (padding != EdgeInsets.zero) {
    final p = FakeViewPadding(
      left: padding.left,
      top: padding.top,
      right: padding.right,
      bottom: padding.bottom,
    );
    tester.view.padding = p;
    tester.view.viewPadding = p;
  }
  final settings = await loadSettings(avatarChosen: avatarChosen);
  settings.churchId = last;
  final services = AppServices.inMemory(settings);
  addTearDown(services.disposeInMemory);
  final net = FakeChurchNet();
  final scene = FakeChurchSceneController();
  await tester.pumpWidget(
    AppServicesScope(
      services: services,
      child: MaterialApp(
        theme: brightness == Brightness.dark
            ? AppTheme.dark()
            : AppTheme.light(),
        builder: (context, c) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(textScale)),
          child: c!,
        ),
        home: AppShell(
          settings: settings,
          glassCatalog: testGlassCatalogFuture(),
          churchBuilder: (_) => ChurchTab(
            key: const ValueKey('church-tab'),
            settings: settings,
            net: net,
            scene: scene,
            availableIds: ids,
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return (settings, net, scene);
}

Future<void> _tapThumb(WidgetTester tester, String id) async {
  await tester.ensureVisible(_thumb(id));
  await tester.pumpAndSettle();
  await tester.tap(_thumb(id));
  await tester.pumpAndSettle();
}

Future<void> _enter(WidgetTester tester) async {
  await tester.ensureVisible(find.byKey(const ValueKey('entry-enter')));
  await tester.pumpAndSettle();
  await tester.tap(find.byKey(const ValueKey('entry-enter')));
  await tester.pump();
  await tester.pump();
}

void main() {
  group('반응형 내비게이션', () {
    testWidgets('폭 600dp 이상(폴더블 펼침)은 왼쪽 레일, 입구 화면이 그 옆에 보인다', (tester) async {
      await _pumpShell(tester, size: const Size(768, 853));
      expect(find.byType(NavigationRail), findsOneWidget);
      expect(find.byType(NavigationBar), findsNothing);
      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.extended, isFalse);
      expect(rail.destinations, hasLength(4));
      expect(find.text('가상 성당'), findsOneWidget);
      expect(find.byKey(const ValueKey('entry-card')), findsOneWidget);
      // 본문은 레일 오른쪽에서 시작한다.
      final railRight = tester.getTopRight(find.byType(NavigationRail)).dx;
      expect(
        tester.getTopLeft(find.byKey(const ValueKey('entry-card'))).dx,
        greaterThan(railRight),
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('폭 600dp 미만(일반 폰)은 하단 바를 유지한다', (tester) async {
      await _pumpShell(tester);
      expect(find.byType(NavigationBar), findsOneWidget);
      expect(find.byType(NavigationRail), findsNothing);
      expect(find.byKey(const ValueKey('entry-card')), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('내비게이션은 밝은 테마에서도 어두운 갈색 구성이고 성당 안에서는 성당 테마', (tester) async {
      final (_, _, scene) = await _pumpShell(tester);
      Color navSurface() =>
          Theme.of(tester.element(find.byType(NavigationBar)))
              .colorScheme
              .surface;
      expect(navSurface(), AppTheme.seedScheme(Brightness.dark).surface);
      // 본문은 밝은 상아색 그대로다.
      expect(
        Theme.of(tester.element(find.byKey(const ValueKey('entry-card'))))
            .colorScheme
            .surface,
        AppTheme.seedScheme(Brightness.light).surface,
      );
      await _enter(tester);
      scene.emit(const SceneReady());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(navSurface(), ChurchTheme.scheme.surface);
      await tester.pump(const Duration(seconds: 7));
    });

    testWidgets('넓은 화면: 밝은 테마의 레일은 상태 바 아래에서 시작한다(시계가 어두운 레일에 묻히지 않게)', (
      tester,
    ) async {
      await _pumpShell(
        tester,
        size: const Size(768, 853),
        padding: const EdgeInsets.only(top: 32),
      );
      expect(tester.getTopLeft(find.byType(NavigationRail)).dy, 32);
      expect(tester.takeException(), isNull);
    });
  });

  group('넘침 없음', () {
    for (final b in Brightness.values) {
      testWidgets('360x800 글자 2배 ${b.name}: 위에서 아래까지 넘침 없음', (tester) async {
        await _pumpShell(tester, textScale: 2, brightness: b);
        expect(tester.takeException(), isNull);
        // 아래 끝(캐러셀·모든 성당 보기)까지 내려가도 넘치지 않는다.
        await tester.ensureVisible(find.byKey(const ValueKey('entry-pick')));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.ensureVisible(_thumb('myeongdong'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        // 큰 글자에서도 주 버튼은 48dp 이상.
        await tester.ensureVisible(find.byKey(const ValueKey('entry-enter')));
        await tester.pumpAndSettle();
        expect(
          tester.getSize(find.byKey(const ValueKey('entry-enter'))).height,
          greaterThanOrEqualTo(48),
        );
        // '창' 보기로 바꿔도 머리말이 넘치지 않는다.
        await tester.tap(_segment('창'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('가로 모드(800x360)·좁은 폰(320x568)·넓은 화면(1280x800)에서도 넘치지 않는다', (
      tester,
    ) async {
      for (final size in const [
        Size(800, 360),
        Size(320, 568),
        Size(1280, 800),
        Size(600, 400),
      ]) {
        await _pumpShell(tester, size: size);
        expect(tester.takeException(), isNull, reason: '$size');
        await tester.ensureVisible(find.byKey(const ValueKey('entry-pick')));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: '$size');
        await tester.pumpWidget(const SizedBox.shrink());
      }
    });

    testWidgets('처음(성당에 들어간 적 없음)에는 기본 성당과 \'처음 오셨나요?\'', (tester) async {
      await _pumpShell(tester, avatarChosen: false, last: 'basic');
      expect(find.text('처음 오셨나요?'), findsOneWidget);
      expect(find.text('마지막으로 다녀온 성당'), findsNothing);
      expect(_name(tester), ChurchCatalog.resolve(null).nameKo);
      expect(find.byKey(const ValueKey('entry-enter')), findsOneWidget);
    });
  });

  group('큰 카드와 캐러셀', () {
    testWidgets('성당 측 요청으로 뺀 마조레는 가용 목록에 들어 있어도 일반 빌드 캐러셀에 없다(개발용 빌드는 있다)', (
      tester,
    ) async {
      await _pumpShell(tester, ids: {..._ids, 'maggiore'});
      expect(_thumb('maggiore').evaluate().length, ReleaseGate.showAll ? 1 : 0);
      expect(find.text('성 마리아 마조레 대성전'), ReleaseGate.showAll ? findsWidgets : findsNothing);
      expect(_thumb('lateran'), findsOneWidget);
    });

    testWidgets('캐러셀은 들어갈 수 있는 성당을 카탈로그에서 가져오고, 고른 성당이 선택됨으로 읽힌다', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      await _pumpShell(tester);
      for (final c in ChurchCatalog.all) {
        expect(
          _thumb(c.id).evaluate().length,
          _ids.contains(c.id) && ReleaseGate.churchListed(c.id) ? 1 : 0,
          reason: c.id,
        );
      }
      expect(_name(tester), '밀라노 대성당');
      expect(find.text('마지막으로 다녀온 성당'), findsOneWidget);
      await tester.ensureVisible(_thumb('milan'));
      await tester.pumpAndSettle();
      expect(
        tester.getSemantics(find.bySemanticsLabel('밀라노 대성당, 밀라노')),
        isSemantics(isSelected: true, isButton: true, hasTapAction: true),
      );
      expect(
        tester.getSemantics(find.bySemanticsLabel('성 베드로 대성전, 바티칸 시국')),
        isSemantics(isSelected: false, isButton: true, hasTapAction: true),
      );
      handle.dispose();
    });

    testWidgets('캐러셀에서 카드를 누르면 큰 카드가 그 성당으로 바뀐다(저장은 입장할 때)', (tester) async {
      final handle = tester.ensureSemantics();
      final (settings, net, _) = await _pumpShell(tester);
      await _tapThumb(tester, 'stpeter');
      expect(_name(tester), '성 베드로 대성전');
      expect(find.text('선택한 성당'), findsOneWidget);
      expect(find.text('마지막으로 다녀온 성당'), findsNothing);
      expect(find.text('바티칸 시국, 바티칸 · 대성전'), findsOneWidget);
      expect(
        tester.getSemantics(find.bySemanticsLabel('성 베드로 대성전, 바티칸 시국')),
        isSemantics(isSelected: true),
      );
      expect(
        tester.getSemantics(find.bySemanticsLabel('밀라노 대성당, 밀라노')),
        isSemantics(isSelected: false),
      );
      // 아직 들어가지 않았다: 마지막 성당은 그대로, 접속도 없다.
      expect(settings.churchId, 'milan');
      expect(net.connectedIds, isEmpty);
      // 마지막 성당을 다시 고르면 제목이 돌아온다.
      await _tapThumb(tester, 'milan');
      expect(_name(tester), '밀라노 대성당');
      expect(find.text('마지막으로 다녀온 성당'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('입장하기 한 번에 고른 성당으로 들어가고 마지막 성당으로 저장된다', (tester) async {
      final (settings, net, scene) = await _pumpShell(tester);
      final tab = tester.state(find.byKey(const ValueKey('church-tab')));
      await _tapThumb(tester, 'myeongdong');
      await _enter(tester);
      expect(find.byType(ChurchScreen), findsOneWidget);
      expect(find.byKey(const ValueKey('entry-enter')), findsNothing);
      expect(find.byKey(const ValueKey('entry-card')), findsNothing);
      // 성당 탭 상태는 새로 만들어지지 않고, 머리줄([성당 | 창])은 숨는다.
      expect(tester.state(find.byKey(const ValueKey('church-tab'))), same(tab));
      expect(find.byKey(const ValueKey('glass-segment')), findsNothing);
      scene.emit(const SceneReady());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(net.connectedIds, ['myeongdong']);
      expect(scene.lastArgs('init')!['church'], 'myeongdong');
      expect(scene.count('init'), 1);
      expect(settings.churchId, 'myeongdong');
      expect(tester.takeException(), isNull);
      await tester.pump(const Duration(seconds: 7));
    });

    testWidgets("세그먼트로 '창'에 다녀와도 성당 탭 상태(고른 성당)가 그대로다", (tester) async {
      await _pumpShell(tester);
      final tab = tester.state(find.byKey(const ValueKey('church-tab')));
      await _tapThumb(tester, 'lateran');
      expect(_name(tester), '라테라노 성 요한 대성전');
      await tester.ensureVisible(find.byKey(const ValueKey('glass-segment')));
      await tester.tap(_segment('창'));
      await tester.pumpAndSettle();
      expect(find.text('스테인드글라스'), findsOneWidget);
      expect(find.byKey(const ValueKey('entry-card')), findsNothing);
      await tester.tap(_segment('성당'));
      await tester.pumpAndSettle();
      expect(tester.state(find.byKey(const ValueKey('church-tab'))), same(tab));
      expect(_name(tester), '라테라노 성 요한 대성전');
      expect(find.text('선택한 성당'), findsOneWidget);
      // 다른 탭에 다녀와도 같다.
      await tester.tap(
        find.descendant(
          of: find.byType(NavigationBar),
          matching: find.text('오늘'),
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
      expect(tester.state(find.byKey(const ValueKey('church-tab'))), same(tab));
      expect(_name(tester), '라테라노 성 요한 대성전');
    });

    testWidgets('책갈피 버튼은 즐겨찾기를 켜고 끈다(고른 성당 기준)', (tester) async {
      final (settings, _, _) = await _pumpShell(tester);
      final fav = find.byKey(const ValueKey('entry-fav'));
      expect(find.byTooltip('즐겨찾기'), findsOneWidget);
      await tester.tap(fav);
      await tester.pumpAndSettle();
      expect(settings.isChurchFavorite('milan'), isTrue);
      expect(find.byTooltip('즐겨찾기 해제'), findsOneWidget);
      await _tapThumb(tester, 'stpeter');
      expect(find.byTooltip('즐겨찾기'), findsOneWidget);
      await tester.ensureVisible(fav);
      await tester.tap(fav);
      await tester.pumpAndSettle();
      expect(settings.churchFavorites, {'milan', 'stpeter'});
    });

    testWidgets('상세 보기는 성당 안내 시트를 열고, 시트의 입장으로도 한 번에 들어간다', (tester) async {
      final (settings, net, scene) = await _pumpShell(tester);
      await _tapThumb(tester, 'stpeter');
      await tester.ensureVisible(find.byKey(const ValueKey('entry-detail')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('entry-detail')));
      await tester.pumpAndSettle();
      expect(find.byType(BottomSheet), findsOneWidget);
      expect(find.text('바티칸 시국, 바티칸 · 대성전'), findsWidgets);
      // 닫으면 그대로 입구.
      Navigator.of(tester.element(find.byType(BottomSheet))).pop();
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('entry-card')), findsOneWidget);
      expect(net.connectedIds, isEmpty);
      // 시트에서 입장.
      await tester.tap(find.byKey(const ValueKey('entry-detail')));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, '입장'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      await tester.pump(const Duration(seconds: 1));
      expect(find.byType(ChurchScreen), findsOneWidget);
      scene.emit(const SceneReady());
      await tester.pump();
      expect(net.connectedIds, ['stpeter']);
      expect(settings.churchId, 'stpeter');
      await tester.pump(const Duration(seconds: 7));
    });

    testWidgets('모든 성당 보기는 검색·필터가 있는 목록을 열고, 뒤로 가면 입구', (tester) async {
      await _pumpShell(tester);
      await tester.ensureVisible(find.byKey(const ValueKey('entry-pick')));
      await tester.pumpAndSettle();
      expect(find.text('모든 성당 보기'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('entry-pick')));
      await tester.pumpAndSettle();
      expect(find.byType(ChurchSelectScreen), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('select-back')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('entry-card')), findsOneWidget);
    });

    testWidgets('넓은 화면: 화살표 버튼으로 캐러셀을 넘긴다', (tester) async {
      setView(tester, const Size(768, 853));
      final settings = await loadSettings();
      settings.churchId = 'basic';
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: ChurchTab(
            settings: settings,
            net: FakeChurchNet(),
            scene: FakeChurchSceneController(),
            // 다섯 장보다 많아야 넘길 것이 있다.
            availableIds: {for (final c in ChurchCatalog.listed.take(9)) c.id},
          ),
        ),
      );
      await tester.pumpAndSettle();
      final next = find.byKey(const ValueKey('entry-carousel-next'));
      final rewind = find.byKey(const ValueKey('entry-carousel-rewind'));
      final carousel = find.byKey(const ValueKey('entry-carousel'));
      expect(next, findsOneWidget);
      expect(rewind, findsNothing);
      // 화살표는 카드 영역 바깥(오른쪽 전용 자리)에 있다: 카드가 버튼 아래로 지나가지 않는다.
      final view = tester.getRect(carousel);
      final button = tester.getRect(next);
      expect(button.left, greaterThanOrEqualTo(view.right));
      // 버튼은 썸네일 높이 안에 있고, 다섯 장이 잘리지 않고 보인다.
      final ids = [for (final c in ChurchCatalog.listed.take(9)) c.id];
      for (final id in ids.take(5)) {
        final r = tester.getRect(_thumb(id));
        expect(r.left, greaterThanOrEqualTo(view.left - 0.5), reason: id);
        expect(r.right, lessThanOrEqualTo(view.right + 0.5), reason: id);
        expect(r.right, lessThanOrEqualTo(button.left), reason: id);
      }
      expect(button.top, greaterThanOrEqualTo(view.top));
      expect(button.bottom, lessThan(view.bottom));

      final first = _thumb(ids.first);
      final x0 = tester.getTopLeft(first).dx;
      await tester.ensureVisible(next);
      await tester.tap(next);
      await tester.pumpAndSettle();
      expect(tester.getTopLeft(first).dx, lessThan(x0));
      // 끝까지 가면 같은 자리의 버튼이 '처음으로'가 된다(왼쪽에 겹치는 버튼은 없다).
      expect(next, findsNothing);
      expect(rewind, findsOneWidget);
      // (세로 스크롤 위치는 달라졌을 수 있으니 캐러셀 기준 위치로 견준다.)
      expect(
        tester.getRect(rewind).shift(-tester.getTopLeft(carousel)),
        button.shift(-view.topLeft),
      );
      expect(find.byTooltip('처음으로'), findsOneWidget);
      await tester.tap(rewind);
      await tester.pumpAndSettle();
      expect(tester.getTopLeft(first).dx, x0);
      expect(next, findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('화살표 자리는 넘길 것이 있는 넓은 화면에만 둔다', (tester) async {
      // 넓은 화면이라도 카드가 한 줄에 다 들어가면 화살표가 없다.
      await _pumpShell(tester, size: const Size(768, 853));
      expect(find.byKey(const ValueKey('entry-carousel-next')), findsNothing);
      expect(
        tester.getRect(_thumb('myeongdong')).right,
        lessThanOrEqualTo(
          tester.getRect(find.byKey(const ValueKey('entry-carousel'))).right +
              0.5,
        ),
      );
      await tester.pumpWidget(const SizedBox.shrink());
      // 폰은 쓸어 넘긴다.
      await _pumpShell(tester);
      expect(find.byKey(const ValueKey('entry-carousel-next')), findsNothing);
    });
  });

  group('접근성', () {
    for (final size in const [Size(360, 1400), Size(768, 1200)]) {
      testWidgets('터치 대상 48dp·라벨 (${size.width.toInt()}dp)', (tester) async {
        final handle = tester.ensureSemantics();
        await _pumpShell(tester, size: size);
        await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        expect(find.bySemanticsLabel('밀라노 대성당 내부 모습'), findsOneWidget);
        expect(
          tester.getSemantics(find.byKey(const ValueKey('entry-enter'))),
          isSemantics(label: '입장하기', isButton: true, hasTapAction: true),
        );
        expect(
          tester.getSemantics(find.byKey(const ValueKey('entry-detail'))),
          isSemantics(label: '상세 보기', isButton: true, hasTapAction: true),
        );
        handle.dispose();
      });
    }
  });

  group('그림 자산 슬롯과 대체 규칙', () {
    setUp(ChurchEntryArt.debugReset);
    tearDown(ChurchEntryArt.debugReset);

    testWidgets('사람이 만든 그림 → 3D 렌더 샷 → 기존 썸네일 순으로 고른다', (tester) async {
      // 자산 목록을 읽기 전에는 가장 오래된 기본 그림(항상 있는 후보)을 쓴다.
      expect(
        ChurchEntryArt.pick(ChurchEntryArt.heroCandidates('milan')),
        'assets/church_thumbs/milan.webp',
      );
      await tester.runAsync(() => ChurchEntryArt.load(rootBundle));
      expect(ChurchEntryArt.isLoaded, isTrue);
      const dir = ChurchEntryArt.dir;
      // 시안에서 잘라 낸 대표 그림·외관 썸네일이 있는 성당.
      expect(
        ChurchEntryArt.pick(ChurchEntryArt.heroCandidates('milan')),
        '$dir/hero_milan.webp',
      );
      expect(
        ChurchEntryArt.pick(ChurchEntryArt.thumbCandidates('stpeter')),
        '$dir/thumb_stpeter.webp',
      );
      // 없는 성당은 우리 3D 렌더 샷, 썸네일은 기존 성당 고르기 썸네일.
      expect(
        ChurchEntryArt.pick(ChurchEntryArt.heroCandidates('basic')),
        '$dir/render_basic.webp',
      );
      expect(
        ChurchEntryArt.pick(ChurchEntryArt.thumbCandidates('danggogae')),
        'assets/church_thumbs/danggogae.webp',
      );
      // 아무 그림도 없는 새 성당: 마지막 후보(없으면 위젯이 아이콘을 그린다).
      expect(
        ChurchEntryArt.pick(ChurchEntryArt.heroCandidates('newchurch')),
        'assets/church_thumbs/newchurch.webp',
      );
      expect(ChurchEntryArt.has(ChurchEntryArt.background), isTrue);
      expect(ChurchEntryArt.has(ChurchEntryArt.railDecor), isTrue);
    });

    testWidgets('들어갈 수 있는 모든 성당에 대표 그림과 썸네일이 번들에 있다', (tester) async {
      await tester.runAsync(() => ChurchEntryArt.load(rootBundle));
      final manifest = await tester.runAsync(
        () => AssetManifest.loadFromAssetBundle(rootBundle),
      );
      final assets = manifest!.listAssets().toSet();
      for (final id in ChurchSelectScreen.availableIds) {
        // 성당 측 요청으로 뺀 성당의 그림은 번들에 없다(개발용 APK 빌드 때만 더해진다 — tools/release_hidden_assets.txt)
        if (ReleaseGate.withdrawnChurchIds.contains(id)) continue;
        expect(
          assets,
          contains(ChurchEntryArt.pick(ChurchEntryArt.heroCandidates(id))),
          reason: 'hero $id',
        );
        expect(
          assets,
          contains(ChurchEntryArt.pick(ChurchEntryArt.thumbCandidates(id))),
          reason: 'thumb $id',
        );
      }
    });

    testWidgets('그림이 없는 성당은 성당 아이콘으로 대신한다(넘침·오류 없음)', (tester) async {
      setView(tester, const Size(360, 800));
      final settings = await loadSettings();
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: ChurchEntryCard(
            info: ChurchCatalog.byId['sagrada']!,
            settings: settings,
            churches: [
              ChurchCatalog.byId['sagrada']!,
              ChurchCatalog.byId['notredame']!,
            ],
            lastId: 'sagrada',
            onEnter: () {},
            onPick: () {},
            onSelect: (_) {},
          ),
        ),
      );
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 100)),
      );
      await tester.pumpAndSettle();
      expect(find.byIcon(Icons.church), findsWidgets);
      expect(tester.takeException(), isNull);
    });
  });
}
