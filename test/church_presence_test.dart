import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/analytics.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/avatar/avatar_config.dart';
import 'package:rosary_app/church/church_catalog.dart';
import 'package:rosary_app/church/church_hud.dart';
import 'package:rosary_app/church/church_presence_sheet.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:rosary_app/church/church_select_screen.dart';
import 'package:rosary_app/church/church_tab.dart';
import 'package:rosary_app/church/net/church_loads.dart';
import 'package:rosary_app/church/net/church_net.dart';
import 'package:rosary_app/church/net/church_protocol.dart';

import 'church_screen_fakes.dart';

/// 스크린샷을 남길 폴더(`--dart-define=PRESENCE_SHOTS=<dir>`). 비어 있으면 찍지 않는다.
const _shotDir = String.fromEnvironment('PRESENCE_SHOTS');

Future<void> _loadFonts() async {
  if (_shotDir.isEmpty) return;
  Future<ByteData> read(String path) async =>
      ByteData.sublistView(await File(path).readAsBytes());
  final pretendard = FontLoader('Pretendard');
  for (final w in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
    pretendard.addFont(read('assets/fonts/Pretendard-$w.otf'));
  }
  await pretendard.load();
  final icons = const String.fromEnvironment('MATERIAL_ICONS');
  if (icons.isNotEmpty) {
    final l = FontLoader('MaterialIcons')..addFont(read(icons));
    await l.load();
  }
}

Future<void> _shot(WidgetTester tester, String name) async {
  if (_shotDir.isEmpty) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const ValueKey('shot-root')),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final f = File('$_shotDir/$name.png');
    await f.parent.create(recursive: true);
    await f.writeAsBytes(bytes!.buffer.asUint8List());
  });
}

ChurchLoads _loads(Map<String, int>? counts, {bool fail = false}) =>
    ChurchLoads(
      fetcher: () async {
        if (fail || counts == null) throw StateError('offline');
        return counts;
      },
    );

Who _who(List<(int, String)> people, {int? n, bool more = false}) => Who(
  n: n ?? people.length + 1,
  room: people.length + 1,
  list: [
    for (final (name, st) in people)
      RosterEntry(AvatarConfig(name: name).nameText, st),
  ],
  more: more,
);

/// 시트만 띄운다(버튼을 눌러 여는 모달).
Future<FakeChurchNet> _pumpSheet(
  WidgetTester tester, {
  Size size = const Size(360, 800),
  double textScale = 1.0,
  bool dark = false,
  bool online = true,
  int count = 4,
  ChurchLoads? loads,
  String churchId = 'stpeter',
  String selfName = '마리아',
  String selfSt = 'w',
  List<String?>? picked,
  bool appTheme = false,
}) async {
  setView(tester, size);
  final net = FakeChurchNet();
  addTearDown(net.ctrl.close);
  if (online) net.goOnline(count);
  final l = loads ?? ChurchLoads();
  addTearDown(l.dispose);
  final theme = appTheme
      ? (dark ? AppTheme.dark() : AppTheme.light())
      : ThemeData(
          splashFactory: InkRipple.splashFactory,
          brightness: dark ? Brightness.dark : Brightness.light,
        );
  await tester.pumpWidget(
    RepaintBoundary(
      key: const ValueKey('shot-root'),
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: theme.copyWith(splashFactory: InkRipple.splashFactory),
        builder: (context, c) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(textScale)),
          child: c!,
        ),
        home: Scaffold(
          body: Builder(
            builder: (context) => Center(
              child: TextButton(
                onPressed: () async {
                  final id = await showChurchPresenceSheet(
                    context,
                    net: net,
                    loads: l,
                    churchId: churchId,
                    selfName: selfName,
                    selfSt: () => selfSt,
                  );
                  picked?.add(id);
                },
                child: const Text('open'),
              ),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('open'));
  await _settle(tester);
  return net;
}

/// 시트 애니메이션이 끝날 만큼만 진행한다(기다리는 표시가 돌아 pumpAndSettle은 쓸 수 없다).
Future<void> _settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 350));
  await tester.pump(const Duration(milliseconds: 350));
}

Future<void> _closeSheet(WidgetTester tester) async {
  Navigator.of(tester.element(find.byType(ChurchPresenceSheet))).pop();
  await _settle(tester);
}

void main() {
  setUpAll(_loadFonts);

  group('protocol', () {
    test('who message and answer', () {
      expect(jsonDecode(whoMessage()), {'t': 'who'});
      final e = parseChurchEvent({
        't': 'who',
        'n': 12,
        'room': 4,
        'more': true,
        'list': [
          {'name': 3, 'st': 'p', 'g': 0, 'nv': 2},
          {'name': 9, 'st': 's', 'g': 1, 'nv': 2},
          {'name': 99999, 'st': 'zzz', 'nv': 2},
          'junk',
        ],
      });
      expect(e, isA<Who>());
      final w = e! as Who;
      expect(w.n, 12);
      expect(w.room, 4);
      expect(w.more, isTrue);
      expect(w.list, [
        RosterEntry(const AvatarConfig(name: 3).nameText, 'p'),
        RosterEntry(const AvatarConfig(name: 9, gender: 1).nameText, 's'),
        RosterEntry(AvatarConfig.defaultConfig.nameText, 'w'),
      ]);
      expect(parseChurchEvent({'t': 'who', 'n': 1}), isNull);
      expect(parseChurchEvent({'t': 'who', 'list': <Object>[]}), isNull);
      final bare = parseChurchEvent({'t': 'who', 'n': 1, 'list': <Object>[]});
      expect((bare! as Who).room, 1);
      expect((bare as Who).more, isFalse);
    });

    test('stats uri and parsing', () {
      expect(
        churchStatsUri('wss://church.example/ws').toString(),
        'https://church.example/stats',
      );
      expect(
        churchStatsUri('ws://10.0.2.2:8787/ws?x=1').toString(),
        'http://10.0.2.2:8787/stats',
      );
      expect(
        churchStatsUri('https://church.example/api/').toString(),
        'https://church.example/api/stats',
      );
      expect(
        parseChurchLoads(
          jsonEncode({
            'ok': true,
            'total': {'live': 15},
            'churches': {
              'stpeter': {'live': 12, 'seated': 3},
              'basic': {'live': 3},
              'milan': {'live': 0},
              'bad': 'x',
              'neg': {'live': -2},
            },
          }),
        ),
        {'stpeter': 12, 'basic': 3},
      );
      expect(parseChurchLoads('nope'), isNull);
      expect(parseChurchLoads({'churches': 3}), isNull);
    });
  });

  group('ChurchLoads', () {
    testWidgets(
      'polls only while watched and keeps the last value on failure',
      (tester) async {
        var calls = 0;
        var fail = false;
        final loads = ChurchLoads(
          fetcher: () async {
            calls++;
            if (fail) throw StateError('x');
            return {'basic': calls};
          },
        );
        addTearDown(loads.dispose);
        expect(loads.available, isTrue);
        expect(loads.counts, isNull);
        await tester.pump(const Duration(seconds: 20));
        expect(calls, 0);

        loads.watch();
        await tester.pump();
        expect(calls, 1);
        expect(loads.of('basic'), 1);
        expect(loads.of('stpeter'), 0);
        await tester.pump(const Duration(seconds: 8));
        expect(calls, 2);

        fail = true;
        await tester.pump(const Duration(seconds: 8));
        expect(calls, 3);
        expect(loads.failed, isTrue);
        expect(loads.of('basic'), 2);

        loads.unwatch();
        await tester.pump(const Duration(seconds: 30));
        expect(calls, 3);
      },
    );

    test('no server: unavailable and never fetches', () async {
      final loads = ChurchLoads.forServer('');
      expect(loads.available, isFalse);
      loads.watch();
      await loads.refresh();
      expect(loads.counts, isNull);
      expect(loads.failed, isFalse);
      loads.unwatch();
      loads.dispose();
    });
  });

  group('chip', () {
    testWidgets('name+count opens presence, ↔ changes church', (tester) async {
      var presence = 0;
      var change = 0;
      await tester.pumpWidget(
        wrapApp(
          Scaffold(
            body: Align(
              alignment: Alignment.topLeft,
              child: ChurchStatusChip(
                churchName: '성 베드로 대성전',
                state: NetState.online,
                count: 12,
                onShowPresence: () => presence++,
                onChangeChurch: () => change++,
              ),
            ),
          ),
        ),
      );
      expect(find.text('12명'), findsOneWidget);
      expect(find.byKey(const ValueKey('presence-chevron')), findsOneWidget);
      await tester.tap(find.text('12명'));
      await tester.tap(find.text('성 베드로 대성전'));
      expect((presence, change), (2, 0));
      await tester.tap(find.byTooltip('성당 바꾸기'));
      expect((presence, change), (2, 1));
      // 두 탭 영역 모두 48dp 이상.
      expect(
        tester.getSize(find.byTooltip('성당 바꾸기')).width,
        greaterThanOrEqualTo(48),
      );
      expect(
        tester.getSize(find.byTooltip('성당 바꾸기')).height,
        greaterThanOrEqualTo(48),
      );
      expect(
        tester.getSemantics(find.byKey(const ValueKey('presence-chip'))),
        isSemantics(
          label: '성 베드로 대성전, 12명 접속 중',
          hint: '접속 중인 사람 보기',
          isButton: true,
          hasTapAction: true,
        ),
      );
    });

    for (final (size, scale) in [
      (const Size(360, 800), 1.0),
      (const Size(360, 800), 1.5),
      (const Size(412, 915), 1.5),
    ]) {
      testWidgets('HUD chip fits at $size x$scale', (tester) async {
        final h = await pumpChurch(tester, size: size, textScale: scale);
        h.net.goOnline(128);
        await tester.pump();
        expect(tester.takeException(), isNull);
        final chip = tester.getRect(find.byType(ChurchStatusChip));
        final actions = tester.getRect(find.byType(ChurchTopActions));
        // 폰 폭에서는 이름판이 첫 줄, 도구 줄이 그 아래 줄이다(겹치지 않고 화면 안).
        expect(chip.overlaps(actions), isFalse);
        expect(chip.right, lessThanOrEqualTo(size.width));
        expect(actions.right, lessThanOrEqualTo(size.width));
        expect(actions.left, greaterThanOrEqualTo(0));
        expect(chip.left, greaterThanOrEqualTo(0));
      });
    }
  });

  group('sheet: 이 성당', () {
    testWidgets('asks for the roster, lists me first, then the others', (
      tester,
    ) async {
      final net = await _pumpSheet(tester, count: 4, selfSt: 's');
      expect(find.text('지금 접속 중'), findsOneWidget);
      expect(net.whoRequests, 1);
      // 답이 오기 전: 나만 보이고 기다리는 표시.
      expect(find.byKey(const ValueKey('presence-me')), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      net.emit(_who([(3, 'p'), (9, 's'), (20, 'w')], n: 4));
      await tester.pump();
      await tester.pump();
      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(find.text('이 성당에 4명이 있어요'), findsOneWidget);
      expect(find.text('나'), findsOneWidget);
      final tiles = tester.widgetList<ListTile>(find.byType(ListTile)).toList();
      expect(tiles, hasLength(4));
      String title(ListTile t) => (t.title! as Text).data!;
      String sub(ListTile t) => (t.subtitle! as Text).data!;
      expect(title(tiles[0]), '마리아');
      expect(sub(tiles[0]), '앉아 있음');
      expect(tiles[0].trailing, isNotNull);
      expect(title(tiles[1]), const AvatarConfig(name: 3).nameText);
      expect(sub(tiles[1]), '기도 중');
      expect(sub(tiles[2]), '앉아 있음');
      expect(sub(tiles[3]), '둘러보는 중');
      expect(tiles[1].trailing, isNull);
      expect(
        tester.getSemantics(find.byKey(const ValueKey('presence-me'))),
        isSemantics(label: '나, 마리아, 앉아 있음'),
      );
      await _closeSheet(tester);
    });

    testWidgets('polls every 8s only while open', (tester) async {
      final net = await _pumpSheet(tester);
      expect(net.whoRequests, 1);
      await tester.pump(const Duration(seconds: 8));
      expect(net.whoRequests, 2);
      await tester.pump(const Duration(seconds: 8));
      expect(net.whoRequests, 3);
      await _closeSheet(tester);
      await tester.pump(const Duration(seconds: 30));
      expect(net.whoRequests, 3);
    });

    testWidgets('notes when the church is busier than the roster', (
      tester,
    ) async {
      final net = await _pumpSheet(tester, count: 70);
      net.emit(_who([(1, 'w'), (2, 'w')], n: 70));
      await tester.pump();
      await tester.pump();
      expect(find.text('이 성당에 70명이 있어요'), findsOneWidget);
      expect(find.text('성당이 붐벼서 같은 공간에 있는 3명만 보여요'), findsOneWidget);
      await _closeSheet(tester);
    });

    testWidgets('a long roster scrolls', (tester) async {
      final net = await _pumpSheet(tester, count: 61);
      net.emit(_who([for (var i = 0; i < 60; i++) (i, 'w')], n: 61));
      await tester.pump();
      await tester.pump();
      expect(tester.takeException(), isNull);
      final last = const AvatarConfig(name: 59).nameText;
      expect(find.text(last), findsNothing);
      await tester.scrollUntilVisible(
        find.text(last),
        400,
        scrollable: find.byType(Scrollable).last,
      );
      expect(find.text(last), findsWidgets);
      await _closeSheet(tester);
    });

    testWidgets('solo mode explains instead of listing', (tester) async {
      final net = await _pumpSheet(tester, online: false);
      expect(net.whoRequests, 0);
      expect(find.text('혼자 모드라 접속자를 볼 수 없어요'), findsOneWidget);
      expect(find.byType(ListTile), findsNothing);
      await tester.pump(const Duration(seconds: 8));
      expect(net.whoRequests, 0);

      // 접속되면 바로 명단을 청하고, 끊기면 다시 안내로 돌아간다.
      net.goOnline(2);
      await tester.pump();
      expect(net.whoRequests, 1);
      net.emit(_who([(5, 'w')]));
      await tester.pump();
      await tester.pump();
      expect(find.byType(ListTile), findsNWidgets(2));
      net.stateN.value = NetState.connecting;
      await tester.pump();
      expect(find.text('성당에 연결하고 있어요…'), findsOneWidget);
      expect(find.byType(ListTile), findsNothing);
      await _closeSheet(tester);
    });
  });

  group('sheet: 전체', () {
    Future<void> toAll(WidgetTester tester) async {
      await tester.tap(find.text('전체'));
      await _settle(tester);
    }

    testWidgets('toggle switches; churches sorted by head count, mine marked', (
      tester,
    ) async {
      final picked = <String?>[];
      final net = await _pumpSheet(
        tester,
        count: 5,
        churchId: 'stpeter',
        loads: _loads({
          'basic': 9,
          'stpeter': 4,
          'milan': 30,
          'lateran': 9,
          'florence': 0,
          'nowhere': 50,
        }),
        picked: picked,
      );
      net.emit(_who([(3, 'p')], n: 5));
      await tester.pump();
      final toggle = tester.widget<SegmentedButton<ChurchPresenceView>>(
        find.byKey(const ValueKey('presence-toggle')),
      );
      expect(toggle.selected, {ChurchPresenceView.here});
      expect(find.byKey(const ValueKey('presence-here-list')), findsOneWidget);

      await toAll(tester);
      expect(
        tester
            .widget<SegmentedButton<ChurchPresenceView>>(
              find.byKey(const ValueKey('presence-toggle')),
            )
            .selected,
        {ChurchPresenceView.all},
      );
      expect(find.byKey(const ValueKey('presence-here-list')), findsNothing);
      // 사람 이름은 '전체'에 나오지 않는다.
      expect(find.text(const AvatarConfig(name: 3).nameText), findsNothing);
      expect(find.text('마리아'), findsNothing);

      final tiles = tester.widgetList<ListTile>(find.byType(ListTile)).toList();
      String name(String id) => ChurchCatalog.byId[id]!.nameKo;
      // 인원순 내림차순, 같으면 목록 순서. 0명·모르는 성당은 없다.
      final order = [for (final t in tiles) (t.title! as Text).data!];
      final nine = ['lateran', 'basic']
        ..sort(
          (a, b) => ChurchCatalog.all
              .indexWhere((c) => c.id == a)
              .compareTo(ChurchCatalog.all.indexWhere((c) => c.id == b)),
        );
      expect(order, [
        name('milan'),
        name(nine[0]),
        name(nine[1]),
        name('stpeter'),
      ]);
      expect(find.text('30명'), findsOneWidget);
      // 지금 있는 성당은 방에서 받은 인원(5)을 쓰고 강조한다.
      expect(find.text('5명'), findsOneWidget);
      expect(find.text('지금 여기'), findsOneWidget);
      expect(find.text('지금 모두 53명이 접속 중이에요'), findsOneWidget);
      final mine = tester.widget<ListTile>(
        find.descendant(
          of: find.byKey(const ValueKey('presence-church-stpeter')),
          matching: find.byType(ListTile),
        ),
      );
      expect(mine.tileColor, isNotNull);
      expect(mine.onTap, isNull);
      expect(
        tester.getSemantics(
          find.byKey(const ValueKey('presence-church-stpeter')),
        ),
        isSemantics(
          label: '${name('stpeter')}, 5명 접속 중, 지금 있는 성당',
          isSelected: true,
        ),
      );
      expect(
        tester.getSemantics(
          find.byKey(const ValueKey('presence-church-milan')),
        ),
        isSemantics(
          label: '${name('milan')}, 30명 접속 중',
          hint: '이 성당으로 가기',
          isButton: true,
        ),
      );

      // 다른 성당을 누르면 그 id를 돌려주며 닫힌다(이동은 호출 쪽이 확인 후).
      await tester.tap(find.byKey(const ValueKey('presence-church-milan')));
      await _settle(tester);
      expect(picked, ['milan']);
      expect(find.byType(ChurchPresenceSheet), findsNothing);
    });

    testWidgets('load failure and solo build show a notice', (tester) async {
      final loads = _loads(null, fail: true);
      await _pumpSheet(tester, loads: loads);
      await toAll(tester);
      expect(find.text('접속 현황을 불러오지 못했어요'), findsOneWidget);
      expect(find.text('다시 시도'), findsOneWidget);
      await _closeSheet(tester);

      await _pumpSheet(tester, online: false);
      await toAll(tester);
      expect(find.text('혼자 모드라 접속 현황을 볼 수 없어요'), findsOneWidget);
      await _closeSheet(tester);
    });

    testWidgets('keeps the last counts when a refresh fails', (tester) async {
      var fail = false;
      final loads = ChurchLoads(
        fetcher: () async {
          if (fail) throw StateError('x');
          return {'milan': 7};
        },
      );
      await _pumpSheet(tester, online: false, loads: loads);
      await toAll(tester);
      expect(find.text('지금 모두 7명이 접속 중이에요'), findsOneWidget);
      fail = true;
      await tester.pump(const Duration(seconds: 8));
      await tester.pump();
      expect(find.text('7명'), findsOneWidget);
      expect(find.text('마지막으로 받은 현황이에요 · 모두 7명'), findsOneWidget);
      await _closeSheet(tester);
    });

    testWidgets('nobody anywhere', (tester) async {
      await _pumpSheet(tester, online: false, loads: _loads({}));
      await toAll(tester);
      expect(find.text('지금 접속 중인 사람이 없어요'), findsOneWidget);
      await _closeSheet(tester);
    });
  });

  group('layout', () {
    for (final (size, scale, dark) in [
      (const Size(360, 800), 1.0, false),
      (const Size(360, 800), 1.5, false),
      (const Size(412, 915), 1.0, true),
      (const Size(412, 915), 1.5, true),
    ]) {
      testWidgets('no overflow at $size x$scale dark=$dark', (tester) async {
        // 가장 긴 세례명을 골라 2줄 말줄임을 확인한다.
        var longest = 0;
        for (var i = 0; i < 4096; i++) {
          final n = AvatarConfig(name: i).nameText;
          if (n.length > AvatarConfig(name: longest).nameText.length) {
            longest = i;
          }
        }
        final net = await _pumpSheet(
          tester,
          size: size,
          textScale: scale,
          dark: dark,
          count: 6,
          selfName: AvatarConfig(name: longest).nameText,
          loads: _loads({'stpeter': 6, 'maggiore': 12, 'myeongdong': 3}),
        );
        net.emit(
          _who([(longest, 'p'), (1, 's'), (2, 'w'), (3, 'w'), (4, 'p')]),
        );
        await tester.pump();
        await tester.pump();
        expect(tester.takeException(), isNull);
        final sheet = tester.getRect(find.byType(ChurchPresenceSheet));
        expect(sheet.bottom, lessThanOrEqualTo(size.height));
        expect(sheet.top, greaterThanOrEqualTo(0));
        for (final t in tester.widgetList<ListTile>(find.byType(ListTile))) {
          final title = t.title! as Text;
          expect(title.maxLines, 2);
          expect(title.overflow, TextOverflow.ellipsis);
        }
        // 토글이 시트 폭 안에 있고 두 칸 모두 보인다.
        final toggle = tester.getRect(
          find.byKey(const ValueKey('presence-toggle')),
        );
        expect(toggle.left, greaterThanOrEqualTo(0));
        expect(toggle.right, lessThanOrEqualTo(size.width));
        expect(find.text('이 성당'), findsOneWidget);
        await tester.tap(find.text('전체'));
        await _settle(tester);
        expect(tester.takeException(), isNull);
        expect(find.byType(ListTile), findsNWidgets(3));
        await _closeSheet(tester);
      });
    }
  });

  group('wiring', () {
    testWidgets('chip opens the sheet with my name and status', (tester) async {
      setView(tester, const Size(360, 800));
      final settings = await loadSettings();
      final net = FakeChurchNet();
      final scene = FakeChurchSceneController();
      final loads = _loads({'basic': 2, 'milan': 5});
      addTearDown(loads.dispose);
      final pickedIds = <String>[];
      await tester.pumpWidget(
        wrapApp(
          ChurchScreen(
            settings: settings,
            net: net,
            scene: scene,
            loads: loads,
            onPickChurch: pickedIds.add,
          ),
        ),
      );
      await tester.pump();
      scene.emit(const SceneReady());
      await tester.pump();
      net.goOnline(2);
      await tester.pump();

      await tester.tap(find.text('2명'));
      await _settle(tester);
      expect(find.byType(ChurchPresenceSheet), findsOneWidget);
      expect(net.whoRequests, 1);
      net.emit(_who([(4, 'p')]));
      await tester.pump();
      await tester.pump();
      expect(find.text(settings.churchAvatar.nameText), findsOneWidget);
      expect(find.text('둘러보는 중'), findsOneWidget); // 나: 서 있음
      expect(find.text('기도 중'), findsOneWidget);

      await tester.tap(find.text('전체'));
      await _settle(tester);
      await tester.tap(find.byKey(const ValueKey('presence-church-milan')));
      await _settle(tester);
      expect(pickedIds, ['milan']);
      expect(net.disconnects, 0); // 고르기만 해서는 떠나지 않는다
    });

    testWidgets('picking a church asks with the detail sheet before moving', (
      tester,
    ) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings();
      settings.churchId = 'basic';
      final net = FakeChurchNet();
      final scene = FakeChurchSceneController();
      final loads = _loads({'basic': 2, 'milan': 5});
      addTearDown(loads.dispose);
      await tester.pumpWidget(
        wrapApp(
          ChurchTab(settings: settings, net: net, scene: scene, loads: loads),
        ),
      );
      await tester.pump();
      await tester.tap(find.text('입장'));
      await tester.pump();
      scene.emit(const SceneReady());
      await tester.pump();
      expect(net.connectedIds, ['basic']);
      net.goOnline(2);
      await tester.pump();

      Future<void> pickMilan() async {
        await tester.tap(find.byKey(const ValueKey('presence-chip')));
        await _settle(tester);
        await tester.tap(find.text('전체'));
        await _settle(tester);
        await tester.tap(find.byKey(const ValueKey('presence-church-milan')));
        await _settle(tester);
      }

      // 상세 시트(확인 단계)가 뜨고, 닫으면 그대로 머문다.
      await pickMilan();
      expect(find.text(ChurchCatalog.byId['milan']!.nameKo), findsOneWidget);
      expect(find.widgetWithText(FilledButton, '입장'), findsOneWidget);
      Navigator.of(tester.element(find.widgetWithText(FilledButton, '입장')))
          .pop();
      await _settle(tester);
      expect(net.connectedIds, ['basic']);
      expect(settings.churchId, 'basic');

      // '입장'을 누르면 옮겨 간다.
      await pickMilan();
      await tester.tap(find.widgetWithText(FilledButton, '입장'));
      await _settle(tester);
      scene.emit(const SceneReady());
      await tester.pump();
      expect(settings.churchId, 'milan');
      expect(net.connectedIds.last, 'milan');
      expect(find.text(ChurchCatalog.byId['milan']!.nameKo), findsOneWidget);
    });
  });

  group('select screen', () {
    testWidgets('cards show 지금 n명 접속 중 (hidden at 0)', (tester) async {
      setView(tester, const Size(360, 800));
      final settings = await loadSettings();
      final loads = _loads({'basic': 3, 'stpeter': 128});
      addTearDown(loads.dispose);
      await tester.pumpWidget(
        wrapApp(
          ChurchSelectScreen(settings: settings, onEnter: (_) {}, loads: loads),
          textScale: 1.5,
        ),
      );
      await tester.pump();
      await tester.pump();
      expect(tester.takeException(), isNull);
      expect(find.text('지금 128명 접속 중'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('church-online-stpeter')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('church-online-lateran')), findsNothing);
      expect(find.textContaining('접속 중'), findsOneWidget); // basic은 아직 화면 밖
      expect(
        find.bySemanticsLabel(
          RegExp('${ChurchCatalog.byId['stpeter']!.nameKo}, 지금 128명 접속 중'),
        ),
        findsWidgets,
      );

      // 화면을 떠나면 갱신을 멈춘다.
      await tester.pumpWidget(wrapApp(const SizedBox()));
      await tester.pump(const Duration(seconds: 30));
    });

    testWidgets('no counts: nothing is shown', (tester) async {
      setView(tester, const Size(360, 800));
      final settings = await loadSettings();
      await tester.pumpWidget(
        wrapApp(ChurchSelectScreen(settings: settings, onEnter: (_) {})),
      );
      await tester.pump();
      expect(find.textContaining('접속 중'), findsNothing);
    });
  });

  group('analytics', () {
    test('events carry only the church id, a bool and the view key', () {
      expect(
        AnalyticsEvents.categoryOf('presence_sheet_open'),
        ConsentKinds.church,
      );
      expect(
        AnalyticsEvents.categoryOf('presence_toggle'),
        ConsentKinds.church,
      );
      expect(AnalyticsEvents.specs['presence_sheet_open']!.keys, {
        'church',
        'online',
      });
      expect(AnalyticsEvents.specs['presence_toggle']!.keys, {
        'church',
        'view',
      });
      expect(
        PropsSanitizer.sanitize('presence_toggle', {
          'church': 'stpeter',
          'view': ChurchPresenceView.all.key,
          'name': '마리아',
          'count': 12,
        }),
        {'church': 'stpeter', 'view': 'all'},
      );
      expect(
        [for (final v in ChurchPresenceView.values) v.key],
        ['here', 'all'],
      );
    });
  });

  group('screenshots', () {
    for (final dark in [false, true]) {
      testWidgets('360x800 dark=$dark', (tester) async {
        final net = await _pumpSheet(
          tester,
          dark: dark,
          appTheme: true,
          count: 7,
          churchId: 'stpeter',
          selfSt: 's',
          loads: _loads({
            'stpeter': 7,
            'myeongdong': 23,
            'basic': 4,
            'milan': 11,
            'maggiore': 2,
          }),
        );
        net.emit(
          _who([
            (3, 'p'),
            (120, 's'),
            (45, 'w'),
            (300, 'p'),
            (17, 'w'),
            (88, 's'),
          ]),
        );
        await tester.pump();
        await tester.pump();
        final tag = dark ? 'dark' : 'light';
        await _shot(tester, 'presence_here_360x800_$tag');
        await tester.tap(find.text('전체'));
        await _settle(tester);
        await _shot(tester, 'presence_all_360x800_$tag');
        await _closeSheet(tester);
      });
    }
  }, skip: _shotDir.isEmpty);
}
