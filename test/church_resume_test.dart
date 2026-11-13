// 성당에 들어간 뒤 다른 탭·'창' 보기·다른 화면·앱 백그라운드로 갔다가 돌아와도 방금 있던
// 그대로인지(다시 입장하지 않는지), 보이지 않는 동안 장면을 멈추고 오래되면 접속·장면을 놓았다가
// 복원하는지 확인한다.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/analytics.dart';
import 'package:rosary_app/app/app_services.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/church_host.dart';
import 'package:rosary_app/church/church_prayer_card.dart';
import 'package:rosary_app/church/church_resume_state.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:rosary_app/church/church_tab.dart';
import 'package:rosary_app/church/net/church_net.dart';
import 'package:rosary_app/ui/app_shell.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';
import 'glass_test_support.dart';

final _uploader = FakeEventUploader();

Future<void> _startAnalytics() async {
  _uploader.events.clear();
  Analytics.debugReset();
  addTearDown(Analytics.debugReset);
  await Analytics.init(
    uploader: _uploader,
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

/// 기록된 이벤트(이미 올라간 것 + 아직 대기 중인 것).
List<Map<String, dynamic>> _events(String name) => [
  for (final e in [..._uploader.events, ...Analytics.instance.queuedForTest])
    if (e['name'] == name) Map<String, dynamic>.from(e['props'] as Map),
];

List<String> _screens() => [
  for (final e in _events('screen_view')) e['screen'] as String,
];

Finder _nav(String label) =>
    find.descendant(of: find.byType(NavigationBar), matching: find.text(label));

Finder _segment(String label) => find.descendant(
  of: find.byKey(const ValueKey('glass-segment')),
  matching: find.text(label),
);

Welcome _welcome({Map<String, String> seats = const {}}) => Welcome(
  you: 'me',
  room: 'basic-1',
  n: 1,
  peers: const [],
  seats: seats,
  candles: const [],
  now: 0,
);

const _state = SceneState(
  church: 'basic',
  x: 3.5,
  z: -2.25,
  r: 1.2,
  camYaw: 0.8,
  camPitch: 0.3,
  camZoom: 1.1,
  camLook: 0,
);

/// 앱 셸(유리화 탭 → 성당) 안에서 성당에 들어가 장면 준비까지 진행한다.
Future<(AppSettings, FakeChurchNet, FakeChurchSceneController)> _enterViaShell(
  WidgetTester tester,
) async {
  setView(tester, const Size(400, 800));
  final settings = await loadSettings();
  settings.churchId = 'basic';
  final services = AppServices.inMemory(settings);
  addTearDown(services.disposeInMemory);
  final net = FakeChurchNet();
  final scene = FakeChurchSceneController();
  await tester.pumpWidget(
    AppServicesScope(
      services: services,
      child: wrapApp(
        AppShell(
          settings: settings,
          glassCatalog: testGlassCatalogFuture(),
          churchBuilder: (_) => ChurchTab(
            settings: settings,
            net: net,
            scene: scene,
            availableIds: const {'basic', 'stpeter'},
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  await tester.tap(_segment('성당'));
  await tester.pumpAndSettle();
  await tester.tap(find.byKey(const ValueKey('entry-enter')));
  await _p(tester);
  scene.emit(const SceneReady());
  await _p(tester);
  await _p(tester);
  return (settings, net, scene);
}

/// 성당 화면만 띄운다([visible]로 ChurchHost.visible을 바꾼다).
Future<(AppSettings, FakeChurchNet, FakeChurchSceneController)> _pumpScreen(
  WidgetTester tester,
  ValueNotifier<bool> visible, {
  ChurchSceneController Function()? sceneFactory,
  Duration disconnectAfter = const Duration(minutes: 3),
  Duration releaseAfter = const Duration(minutes: 10),
  Map<String, Object> prefs = const {},
  Widget Function(BuildContext, dynamic, dynamic)? prayerScreenBuilder,
  bool ready = true,
}) async {
  setView(tester, const Size(400, 800));
  SharedPreferences.setMockInitialValues(prefs);
  final settings = await AppSettings.load();
  settings.churchAvatarChosen = true;
  final net = FakeChurchNet();
  final scene = FakeChurchSceneController();
  await tester.pumpWidget(
    wrapApp(
      ValueListenableBuilder<bool>(
        valueListenable: visible,
        builder: (context, v, _) => ChurchHost(
          visible: v,
          child: ChurchScreen(
            settings: settings,
            churchId: 'basic',
            net: net,
            scene: scene,
            sceneFactory: sceneFactory,
            hiddenDisconnectAfter: disconnectAfter,
            hiddenReleaseAfter: releaseAfter,
            avatarEditorBuilder: (_) =>
                const Scaffold(body: Center(child: Text('EDITOR'))),
            prayerScreenBuilder: prayerScreenBuilder == null
                ? null
                : (c, m, s) => prayerScreenBuilder(c, m, s),
          ),
        ),
      ),
    ),
  );
  await _p(tester);
  if (ready) {
    scene.emit(const SceneReady());
    await _p(tester);
    await _p(tester);
  }
  return (settings, net, scene);
}

Future<void> _sitDown(
  WidgetTester tester,
  FakeChurchSceneController scene, {
  String seat = 'L03-2',
}) async {
  scene.emit(SceneNear(seat: seat));
  await _p(tester);
  await tester.pump(const Duration(milliseconds: 20));
  await tester.pump(const Duration(milliseconds: 400));
  await _p(tester);
  await tester.tap(find.byKey(const ValueKey('ctx-sit')));
  await _p(tester);
  scene.emit(SceneSeated(seat));
  await _p(tester);
}

/// 가짜 장면·접속의 이벤트는 비동기로 전달된다: 전달 → 다시 그리기까지 두 번 돌린다.
Future<void> _p(WidgetTester tester) async {
  await tester.pump();
  await tester.pump();
}

void main() {
  tearDown(Analytics.debugReset);

  group('탭·보기·화면을 오가도 성당 안 그대로', () {
    testWidgets('다른 탭(오늘·기록·더보기)에 갔다 와도 같은 성당 화면·장면·접속이고 입장 카드가 뜨지 않는다', (
      tester,
    ) async {
      await _startAnalytics();
      final (_, net, scene) = await _enterViaShell(tester);
      expect(find.byType(ChurchScreen), findsOneWidget);
      // 성당 안에서는 [창 | 성당] 전환 줄이 숨는다(입장도 한 번이면 된다).
      expect(find.byKey(const ValueKey('glass-segment')), findsNothing);
      final state = tester.state(find.byType(ChurchScreen));
      expect(scene.count('init'), 1);
      expect(net.connectedIds, ['basic']);
      await _sitDown(tester, scene);
      expect(find.byType(ChurchPrayerCard), findsOneWidget);
      final card = tester.widget<ChurchPrayerCard>(
        find.byType(ChurchPrayerCard),
      );
      card.controller.session.jumpTo(7);
      await _p(tester);

      for (final tab in ['오늘', '기록', '더보기']) {
        await tester.tap(_nav(tab));
        await _p(tester);
        await tester.pump(const Duration(seconds: 1));
        // 보이지 않지만 살아 있다. 장면은 멈춘다.
        expect(find.byType(ChurchScreen), findsNothing);
        expect(find.byType(ChurchScreen, skipOffstage: false), findsOneWidget);
      }
      expect(scene.count('pause'), 1);
      expect(scene.count('resume'), 0);
      expect(net.disconnects, 0);
      expect(net.stands, 0);
      expect(
        card.controller.running,
        isFalse,
        reason: '보이지 않는 동안 기도 시간을 세지 않는다',
      );

      await tester.tap(_nav('유리화'));
      await _p(tester);
      await tester.pump(const Duration(seconds: 1));
      expect(find.byType(ChurchScreen), findsOneWidget);
      expect(tester.state(find.byType(ChurchScreen)), same(state));
      expect(find.byKey(const ValueKey('entry-enter')), findsNothing);
      expect(find.byKey(const ValueKey('glass-segment')), findsNothing);
      expect(scene.count('resume'), 1);
      expect(scene.count('init'), 1, reason: '장면을 다시 초기화하지 않는다(입구로 돌아가지 않는다)');
      expect(scene.count('restore'), 0);
      expect(scene.count('stand'), 0);
      expect(net.connectedIds, ['basic'], reason: '다시 접속하지 않는다');
      // 좌석·기도 카드(스텝 위치) 그대로.
      expect(find.byType(ChurchPrayerCard), findsOneWidget);
      expect(card.controller.session.index, 7);
      expect(card.controller.running, isTrue);
      // 분석: 입장·앉기는 한 번씩만, 화면 보기는 돌아올 때 다시 기록한다.
      expect(_events('church_enter'), hasLength(1));
      expect(_events('church_sit'), hasLength(1));
      expect(_events('church_exit'), isEmpty);
      expect(_screens().where((s) => s == 'church'), hasLength(2));
      expect(_screens(), isNot(contains('church_select')));
      Analytics.debugReset();
      expect(tester.takeException(), isNull);
    });

    testWidgets("뒤로가기로 '창' 보기에 갔다가 '성당'으로 돌아와도 그대로다", (tester) async {
      final (_, net, scene) = await _enterViaShell(tester);
      final state = tester.state(find.byType(ChurchScreen));
      scene.emit(const SceneWalkStart('altar'));
      await _p(tester);
      expect(find.byKey(const ValueKey('walk-chip')), findsOneWidget);

      await tester.binding.handlePopRoute();
      await _p(tester);
      await tester.pump(const Duration(seconds: 1));
      // 창 보기: 갤러리와 전환 줄이 보이고 성당은 숨어 멈춘다.
      expect(find.byKey(const ValueKey('glass-segment')), findsOneWidget);
      expect(find.byKey(const ValueKey('glass-today')), findsOneWidget);
      expect(find.byType(ChurchScreen), findsNothing);
      expect(scene.count('pause'), 1);

      await tester.tap(_segment('성당'));
      await _p(tester);
      await tester.pump(const Duration(seconds: 1));
      expect(tester.state(find.byType(ChurchScreen)), same(state));
      expect(find.byKey(const ValueKey('entry-enter')), findsNothing);
      expect(scene.count('resume'), 1);
      expect(scene.count('init'), 1);
      expect(scene.count('cancelWalk'), 0);
      // 걷던 중 표시(목적지)도 그대로.
      expect(find.byKey(const ValueKey('walk-chip')), findsOneWidget);
      expect(net.disconnects, 0);
      Analytics.debugReset();
      expect(tester.takeException(), isNull);
    });

    testWidgets('다른 화면을 위에 열었다 닫아도(push/pop) 같은 화면이고, 가려진 동안만 멈춘다', (
      tester,
    ) async {
      final visible = ValueNotifier(true);
      addTearDown(visible.dispose);
      final (_, net, scene) = await _pumpScreen(
        tester,
        visible,
        prayerScreenBuilder: (c, m, s) =>
            const Scaffold(body: Center(child: Text('FULL'))),
      );
      final state = tester.state(find.byType(ChurchScreen));
      // 아바타 편집
      await tester.tap(find.byTooltip('아바타 편집'));
      await tester.pumpAndSettle();
      expect(find.text('EDITOR'), findsOneWidget);
      expect(scene.count('pause'), 1);
      Navigator.of(tester.element(find.text('EDITOR'))).pop();
      await tester.pumpAndSettle();
      expect(scene.count('resume'), 1);
      expect(tester.state(find.byType(ChurchScreen)), same(state));

      // 접속자 시트 같은 반쯤 덮는 시트는 장면이 보이므로 멈추지 않는다.
      await tester.tap(find.byKey(const ValueKey('go-button')));
      await tester.pumpAndSettle();
      expect(scene.count('pause'), 1);
      Navigator.of(tester.element(find.byType(BottomSheet))).pop();
      await tester.pumpAndSettle();

      // 전체 화면 기도: 같은 세션을 이어 가므로 기도는 멈추지 않는다.
      await _sitDown(tester, scene);
      final card = tester.widget<ChurchPrayerCard>(
        find.byType(ChurchPrayerCard),
      );
      await tester.tap(find.byKey(const ValueKey('prayer-menu')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('전체 화면으로 기도'));
      await tester.pumpAndSettle();
      expect(find.text('FULL'), findsOneWidget);
      expect(scene.count('pause'), 2);
      expect(card.controller.running, isTrue);
      Navigator.of(tester.element(find.text('FULL'))).pop();
      await tester.pumpAndSettle();
      expect(scene.count('resume'), 2);
      expect(find.byType(ChurchPrayerCard), findsOneWidget);
      expect(tester.state(find.byType(ChurchScreen)), same(state));
      expect(scene.count('init'), 1);
      expect(net.disconnects, 0);
      expect(net.stands, 0);
      Analytics.debugReset();
      expect(tester.takeException(), isNull);
    });

    testWidgets("'성당 바꾸기'는 예전대로 퇴장하고, 다시 들어가면 입구에서 새로 입장한다", (tester) async {
      await _startAnalytics();
      final (_, net, scene) = await _enterViaShell(tester);
      scene.emit(const ScenePos(3, 4, 0, false));
      await _p(tester);
      // 한 번 숨겼다 돌아와 상태가 저장된 뒤에 나간다.
      await tester.tap(_nav('오늘'));
      await _p(tester);
      scene.emit(_state);
      await _p(tester);
      await tester.tap(_nav('유리화'));
      await _p(tester);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString(ChurchResumeState.prefsKey), isNotNull);

      await tester.tap(find.byTooltip('성당 바꾸기'));
      await tester.pumpAndSettle();
      expect(find.byType(ChurchScreen, skipOffstage: false), findsNothing);
      expect(net.disconnects, 1);
      expect(_events('church_exit'), hasLength(1));
      expect(prefs.getString(ChurchResumeState.prefsKey), isNull);
      // 선택 화면이 나오고 전환 줄이 다시 보인다.
      expect(find.byKey(const ValueKey('glass-segment')), findsOneWidget);
      expect(_screens().last, 'church_select');
      Analytics.debugReset();
      expect(tester.takeException(), isNull);
    });

    testWidgets('보이지 않는 동안에는 성당 선택 화면을 만들지 않는다', (tester) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings();
      final visible = ValueNotifier(true);
      addTearDown(visible.dispose);
      await tester.pumpWidget(
        wrapApp(
          ValueListenableBuilder<bool>(
            valueListenable: visible,
            builder: (context, v, _) => ChurchHost(
              visible: v,
              child: ChurchTab(
                settings: settings,
                net: FakeChurchNet(),
                scene: FakeChurchSceneController(),
                availableIds: const {'basic'},
              ),
            ),
          ),
        ),
      );
      await _p(tester);
      expect(find.byKey(const ValueKey('entry-enter')), findsOneWidget);
      visible.value = false;
      await _p(tester);
      expect(find.byKey(const ValueKey('entry-enter')), findsNothing);
      visible.value = true;
      await _p(tester);
      expect(find.byKey(const ValueKey('entry-enter')), findsOneWidget);
    });
  });

  group("'입장'은 한 번만 누르면 된다", () {
    // 예전에는 유리화 탭이 입장 순간 성당 보기를 감싸는 위젯 모양을 바꿔(머리줄 숨김) ChurchTab이
    // 새로 만들어졌고, 입장 상태가 풀려 입장 카드가 다시 떠서 [입장]을 두 번 눌러야 했다.
    Future<(AppSettings, FakeChurchNet, FakeChurchSceneController)> pumpShell(
      WidgetTester tester, {
      bool avatarChosen = true,
    }) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings(avatarChosen: avatarChosen);
      settings.churchId = 'basic';
      final services = AppServices.inMemory(settings);
      addTearDown(services.disposeInMemory);
      final net = FakeChurchNet();
      final scene = FakeChurchSceneController();
      await tester.pumpWidget(
        AppServicesScope(
          services: services,
          child: wrapApp(
            AppShell(
              settings: settings,
              glassCatalog: testGlassCatalogFuture(),
              churchBuilder: (_) => ChurchTab(
                key: const ValueKey('church-tab'),
                settings: settings,
                net: net,
                scene: scene,
                availableIds: const {'basic', 'stpeter'},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(_segment('성당'));
      await tester.pumpAndSettle();
      return (settings, net, scene);
    }

    testWidgets('입장 카드의 [입장] 1번 → 성당 화면(ChurchTab이 새로 만들어지지 않는다)', (
      tester,
    ) async {
      final (_, net, scene) = await pumpShell(tester);
      final tab = tester.state(find.byKey(const ValueKey('church-tab')));
      expect(find.byKey(const ValueKey('entry-enter')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('entry-enter')));
      await tester.pump();
      await tester.pump();
      expect(find.byType(ChurchScreen), findsOneWidget);
      expect(find.byKey(const ValueKey('entry-enter')), findsNothing);
      expect(find.byKey(const ValueKey('entry-card')), findsNothing);
      expect(tester.state(find.byKey(const ValueKey('church-tab'))), same(tab));
      // 머리줄([창 | 성당])은 숨는다.
      expect(find.byKey(const ValueKey('glass-segment')), findsNothing);
      scene.emit(const SceneReady());
      await _p(tester);
      expect(net.connectedIds, ['basic']);
      expect(scene.count('init'), 1);
      expect(tester.takeException(), isNull);
    });

    testWidgets('성당 고르기: 카드 → 상세 시트의 [입장] 1번 → (처음이면 아바타 설정) → 성당 화면', (
      tester,
    ) async {
      // 처음 방문: 선택 목록이 바로 열린다.
      final (settings, net, scene) = await pumpShell(
        tester,
        avatarChosen: false,
      );
      expect(find.byKey(const ValueKey('entry-card')), findsNothing);
      final card = find.byKey(const ValueKey('church-card-stpeter'));
      await tester.scrollUntilVisible(
        card,
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.ensureVisible(card);
      await tester.pump();
      await tester.tap(card);
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, '입장'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      await tester.pump(const Duration(seconds: 1));
      // 처음이라 한 페이지 설정 화면이 이어진다. 확인하면 바로 성당 안이다(입장을 다시 누르지 않는다).
      expect(find.text('처음 오셨네요'), findsOneWidget);
      await tester.tap(find.text('성당 들어가기'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      await tester.pump(const Duration(seconds: 1));
      scene.emit(const SceneReady());
      await _p(tester);
      expect(find.byType(ChurchScreen), findsOneWidget);
      expect(find.widgetWithText(FilledButton, '입장'), findsNothing);
      expect(find.text('성당 고르기'), findsNothing);
      expect(settings.churchId, 'stpeter');
      expect(net.connectedIds, ['stpeter']);
      expect(scene.lastArgs('init')!['church'], 'stpeter');
      expect(tester.takeException(), isNull);
    });
  });

  group('오래 보이지 않으면 접속·장면을 놓았다가 복원', () {
    testWidgets('3분 뒤 접속을 끊고, 돌아오면 같은 성당에 다시 접속해 위치와 좌석을 되찾는다', (tester) async {
      await _startAnalytics();
      final visible = ValueNotifier(true);
      addTearDown(visible.dispose);
      final (_, net, scene) = await _pumpScreen(tester, visible);
      net.goOnline(1);
      net.emit(_welcome());
      await _p(tester);
      scene.emit(const ScenePos(-5.2, -4.0, 0.3, false));
      await _sitDown(tester, scene);
      expect(net.sits, ['L03-2']);

      visible.value = false;
      await _p(tester);
      expect(scene.count('pause'), 1);
      await tester.pump(const Duration(minutes: 2, seconds: 59));
      expect(net.disconnects, 0, reason: '3분 전에는 접속을 유지한다(자리도 그대로)');
      await tester.pump(const Duration(seconds: 2));
      expect(net.disconnects, 1);
      net.stateN.value = NetState.offline;
      net.countN.value = 0;
      await _p(tester);
      expect(net.stands, 0, reason: '앱은 좌석을 기억한다(서버는 연결이 끊기면 자리를 비운다)');

      visible.value = true;
      await _p(tester);
      expect(scene.count('resume'), 1);
      expect(scene.count('init'), 1);
      expect(net.connectedIds, ['basic', 'basic']);
      expect(find.byType(ChurchPrayerCard), findsOneWidget);
      // 서버가 받아 주면: 위치를 따라잡게 하고 같은 자리를 다시 청한다.
      final before = net.positions.length;
      net.goOnline(1);
      net.emit(_welcome());
      await _p(tester);
      expect(net.sits, ['L03-2', 'L03-2']);
      expect(net.positions.length, greaterThan(before));
      expect(net.positions.last.$1, -5.2);
      expect(net.positions.last.$2, -4.0);
      // 다시 접속한 직후라 서버가 '멀다'고 하면 자리를 잃지 않고 잠시 뒤 다시 청한다.
      net.emit(const SeatDenied('L03-2', 'far'));
      await _p(tester);
      expect(find.byType(ChurchPrayerCard), findsOneWidget);
      await tester.pump(const Duration(milliseconds: 700));
      expect(net.sits, ['L03-2', 'L03-2', 'L03-2']);
      net.emit(const Seated('me', 'L03-2'));
      await tester.pump(const Duration(seconds: 10));
      expect(find.byType(ChurchPrayerCard), findsOneWidget);
      expect(scene.count('stand'), 0);
      // 분석: 복원은 입장으로 세지 않는다.
      expect(_events('church_enter'), hasLength(1));
      expect(_events('church_sit'), hasLength(1));
      Analytics.debugReset();
      expect(tester.takeException(), isNull);
    });

    testWidgets('다시 접속했더니 내 자리에 다른 사람이 앉았으면 통로에 선다', (tester) async {
      final visible = ValueNotifier(true);
      addTearDown(visible.dispose);
      final (_, net, scene) = await _pumpScreen(tester, visible);
      net.goOnline(1);
      net.emit(_welcome());
      await _p(tester);
      await _sitDown(tester, scene);
      visible.value = false;
      await _p(tester);
      await tester.pump(const Duration(minutes: 4));
      net.stateN.value = NetState.offline;
      visible.value = true;
      await _p(tester);
      net.goOnline(2);
      net.emit(_welcome(seats: {'L03-2': 'p9'}));
      await _p(tester);
      net.emit(const SeatDenied('L03-2', 'taken'));
      await _p(tester);
      expect(scene.lastArgs('setSeatTaken'), {'seat': 'L03-2'});
      expect(scene.count('stand'), 1);
      expect(find.byType(ChurchPrayerCard), findsNothing);
      expect(find.text('이미 누가 앉아 있어요'), findsOneWidget);
      await tester.pump(const Duration(seconds: 10));
      Analytics.debugReset();
      expect(tester.takeException(), isNull);
    });

    testWidgets('10분 뒤 장면을 놓고, 돌아오면 새 장면에 위치·좌석·자세·시점을 복원한다', (tester) async {
      await _startAnalytics();
      final visible = ValueNotifier(true);
      addTearDown(visible.dispose);
      final made = <FakeChurchSceneController>[];
      final (settings, net, scene) = await _pumpScreen(
        tester,
        visible,
        sceneFactory: () {
          final s = FakeChurchSceneController();
          made.add(s);
          return s;
        },
      );
      settings.prayerPosture = PrayerPosture.kneel;
      await _sitDown(tester, scene);
      final card = tester.widget<ChurchPrayerCard>(
        find.byType(ChurchPrayerCard),
      );
      card.controller.session.jumpTo(4);
      await _p(tester);

      visible.value = false;
      await _p(tester);
      // 웹이 멈추면서 알려 준 상태.
      scene.emit(
        const SceneState(
          church: 'basic',
          x: -5.2,
          z: -3.95,
          r: 0,
          seat: 'L03-2',
          kneel: true,
          camYaw: 0.4,
          camPitch: 0.35,
          camZoom: 1.2,
          camLook: 0,
        ),
      );
      await tester.pump(const Duration(minutes: 9));
      expect(
        find.byKey(const ValueKey('fake-scene'), skipOffstage: false),
        findsOneWidget,
      );
      await tester.pump(const Duration(minutes: 2));
      // 장면(WebView)을 놓았다.
      expect(
        find.byKey(const ValueKey('fake-scene'), skipOffstage: false),
        findsNothing,
      );
      expect(made, isEmpty);
      expect(net.disconnects, 1);

      visible.value = true;
      await _p(tester);
      expect(made, hasLength(1));
      final fresh = made.single;
      expect(find.byKey(const ValueKey('fake-scene')), findsOneWidget);
      expect(find.text('성당 문을 여는 중…'), findsOneWidget);
      fresh.emit(const SceneReady());
      await _p(tester);
      await _p(tester);
      expect(fresh.calls.first.$1, 'init');
      expect(fresh.lastArgs('init')!['church'], 'basic');
      final args = fresh.lastArgs('restore')!;
      expect(args['seat'], 'L03-2');
      expect(args['posture'], 'kneel');
      expect(args['x'], -5.2);
      expect(args['cy'], 0.4);
      expect(args['cp'], 0.35);
      expect(args['cz'], 1.2);
      // 웹이 같은 자리에 다시 앉혔다.
      fresh.emit(const SceneSeated('L03-2'));
      fresh.emit(const SceneRestored(seat: 'L03-2', x: -5.2, z: -3.95));
      await _p(tester);
      expect(fresh.lastArgs('setPrayerPosture'), {'posture': 'kneel'});
      expect(find.byType(ChurchPrayerCard), findsOneWidget);
      expect(card.controller.session.index, 4);
      expect(card.controller.running, isTrue);
      expect(_events('church_enter'), hasLength(1));
      expect(_events('church_sit'), hasLength(1));
      // 새 장면도 다시 숨기면 멈춘다.
      visible.value = false;
      await _p(tester);
      expect(fresh.count('pause'), 1);
      Analytics.debugReset();
      expect(tester.takeException(), isNull);
    });

    testWidgets('복원했는데 자리에 이미 누가 있으면(lost) 일어서서 통로에 선다', (tester) async {
      final visible = ValueNotifier(true);
      addTearDown(visible.dispose);
      final made = <FakeChurchSceneController>[];
      final (_, net, scene) = await _pumpScreen(
        tester,
        visible,
        disconnectAfter: const Duration(seconds: 30),
        releaseAfter: const Duration(seconds: 60),
        sceneFactory: () {
          final s = FakeChurchSceneController();
          made.add(s);
          return s;
        },
      );
      await _sitDown(tester, scene);
      visible.value = false;
      await _p(tester);
      scene.emit(const SceneState(church: 'basic', x: 1, z: 2, seat: 'L03-2'));
      await tester.pump(const Duration(seconds: 61));
      visible.value = true;
      await _p(tester);
      made.single.emit(const SceneReady());
      await _p(tester);
      await _p(tester);
      made.single.emit(const SceneRestored(lost: true, x: -5.2, z: -3.2));
      await _p(tester);
      expect(find.byType(ChurchPrayerCard), findsNothing);
      expect(find.text('앉아 있던 자리에 다른 분이 계셔서 통로에 섰어요'), findsOneWidget);
      expect(net.stands, 1);
      expect(find.byKey(const ValueKey('go-button')), findsOneWidget);
      Analytics.debugReset();
      expect(tester.takeException(), isNull);
    });

    testWidgets('상태를 받지 못했으면 장면을 놓지 않는다(복원할 수 없으므로)', (tester) async {
      final visible = ValueNotifier(true);
      addTearDown(visible.dispose);
      final (_, _, scene) = await _pumpScreen(
        tester,
        visible,
        releaseAfter: const Duration(seconds: 60),
        sceneFactory: FakeChurchSceneController.new,
      );
      visible.value = false;
      await _p(tester);
      await tester.pump(const Duration(seconds: 90));
      expect(
        find.byKey(const ValueKey('fake-scene'), skipOffstage: false),
        findsOneWidget,
      );
      visible.value = true;
      await _p(tester);
      expect(scene.count('resume'), 1);
    });
  });

  group('앱 백그라운드', () {
    testWidgets('백그라운드로 가면 장면을 멈추고 돌아오면 잇는다(같은 정책)', (tester) async {
      final visible = ValueNotifier(true);
      addTearDown(visible.dispose);
      final (_, net, scene) = await _pumpScreen(tester, visible);
      // 알림 창·분할 화면(inactive)에서는 화면이 보이므로 멈추지 않는다.
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      await _p(tester);
      expect(scene.count('pause'), 0);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await _p(tester);
      expect(scene.count('pause'), 1);
      await tester.pump(const Duration(minutes: 3, seconds: 1));
      expect(net.disconnects, 1);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await _p(tester);
      expect(scene.count('resume'), 1);
      expect(scene.count('init'), 1);
      expect(net.connectedIds, ['basic', 'basic']);
      Analytics.debugReset();
      expect(tester.takeException(), isNull);
    });

    testWidgets('앱이 종료됐다가 다시 들어오면 저장해 둔 자리에서 시작한다(같은 성당·30분 안)', (
      tester,
    ) async {
      await _startAnalytics();
      final saved = ChurchResumeState(
        churchId: 'basic',
        x: -5.2,
        z: -3.95,
        r: 0.1,
        seat: 'L03-2',
        kneel: true,
        camYaw: 0.4,
        camPitch: 0.3,
        camZoom: 1.1,
        camLook: 0.2,
        savedAtMs: DateTime.now().millisecondsSinceEpoch - 60 * 1000,
      );
      final visible = ValueNotifier(true);
      addTearDown(visible.dispose);
      final (_, net, scene) = await _pumpScreen(
        tester,
        visible,
        prefs: {ChurchResumeState.prefsKey: saved.encode()},
      );
      expect(scene.calls.first.$1, 'init');
      expect(scene.lastArgs('restore'), saved.toSceneArgs());
      net.goOnline(1);
      net.emit(_welcome());
      await _p(tester);
      scene.emit(const SceneSeated('L03-2'));
      scene.emit(const SceneRestored(seat: 'L03-2', x: -5.2, z: -3.95));
      await _p(tester);
      expect(find.byType(ChurchPrayerCard), findsOneWidget);
      expect(net.sits, ['L03-2']);
      // 새로 들어온 것이므로 입장·앉기를 한 번씩 기록한다.
      expect(_events('church_enter'), hasLength(1));
      expect(_events('church_sit'), hasLength(1));
      await tester.pump(const Duration(seconds: 10));
      Analytics.debugReset();
      expect(tester.takeException(), isNull);
    });

    testWidgets('다른 성당의 것이거나 오래된 저장분은 쓰지 않는다(입구에서 시작)', (tester) async {
      for (final st in [
        ChurchResumeState(
          churchId: 'stpeter',
          x: 1,
          z: 2,
          savedAtMs: DateTime.now().millisecondsSinceEpoch,
        ),
        ChurchResumeState(
          churchId: 'basic',
          x: 1,
          z: 2,
          savedAtMs: DateTime.now().millisecondsSinceEpoch - 31 * 60 * 1000,
        ),
      ]) {
        final visible = ValueNotifier(true);
        final (_, _, scene) = await _pumpScreen(
          tester,
          visible,
          prefs: {ChurchResumeState.prefsKey: st.encode()},
        );
        expect(scene.count('init'), 1);
        expect(scene.count('restore'), 0);
        await tester.pumpWidget(const SizedBox());
        visible.dispose();
      }
    });

    testWidgets('숨겨질 때 받은 상태를 저장하고, 화면이 사라지면(퇴장) 지운다', (tester) async {
      final visible = ValueNotifier(true);
      addTearDown(visible.dispose);
      final (_, _, scene) = await _pumpScreen(tester, visible);
      visible.value = false;
      await _p(tester);
      scene.emit(_state);
      await _p(tester);
      final prefs = await SharedPreferences.getInstance();
      final st = ChurchResumeState.decode(
        prefs.getString(ChurchResumeState.prefsKey),
      )!;
      expect(st.churchId, 'basic');
      expect(st.x, 3.5);
      expect(st.z, -2.25);
      expect(st.camYaw, 0.8);
      expect(st.isFreshFor('basic', DateTime.now()), isTrue);
      await tester.pumpWidget(const SizedBox());
      await _p(tester);
      expect(prefs.getString(ChurchResumeState.prefsKey), isNull);
    });
  });

  group('ChurchResumeState', () {
    const full = ChurchResumeState(
      churchId: 'stpeter',
      x: 12.34,
      z: -56.78,
      r: 3.1,
      camYaw: -7.5,
      camPitch: 0.45,
      camZoom: 1.6,
      camLook: 1.35,
      walkKind: 'candle',
      walkIndex: 2,
      savedAtMs: 1700000000000,
    );
    const seated = ChurchResumeState(
      churchId: 'basic',
      x: -5.2,
      z: -3.95,
      seat: 'L03-2',
      kneel: true,
      savedAtMs: 1700000000000,
    );

    test('직렬화 왕복: 모든 필드가 그대로 돌아온다', () {
      for (final s in [full, seated]) {
        expect(ChurchResumeState.decode(s.encode()), s);
        expect(ChurchResumeState.fromJson(s.toJson()), s);
        expect(ChurchResumeState.decode(s.encode()).hashCode, s.hashCode);
      }
      expect(full.toJson()['v'], 1);
      expect(seated.toJson().containsKey('walk'), isFalse);
      expect(full.toJson().containsKey('seat'), isFalse);
    });

    test('깨졌거나 모르는 값은 null 또는 안전한 기본값', () {
      expect(ChurchResumeState.decode(null), isNull);
      expect(ChurchResumeState.decode(''), isNull);
      expect(ChurchResumeState.decode('not json'), isNull);
      expect(ChurchResumeState.decode('[1,2]'), isNull);
      expect(
        ChurchResumeState.decode('{"v":2,"church":"basic","x":1,"z":2}'),
        isNull,
      );
      expect(
        ChurchResumeState.decode('{"church":"basic","x":"1","z":2}'),
        isNull,
      );
      expect(
        ChurchResumeState.decode('{"church":"Bad Id!","x":1,"z":2}'),
        isNull,
      );
      expect(
        ChurchResumeState.decode('{"church":"basic","x":1e9,"z":2}'),
        isNull,
      );
      final s = ChurchResumeState.decode(
        '{"church":"basic","x":1,"z":2,"seat":"<script>","kneel":true,'
        '"walk":"moon","wi":-4,"cy":"x","t":"y"}',
      )!;
      expect(s.seat, isNull);
      expect(s.kneel, isFalse);
      expect(s.walkKind, isNull);
      expect(s.walkIndex, 0);
      expect(s.camYaw, isNull);
      expect(s.savedAtMs, 0);
      // 앉아 있었으면 걷던 목적지는 없다.
      final t = ChurchResumeState.decode(
        '{"church":"basic","x":1,"z":2,"seat":"R01-1","walk":"altar"}',
      )!;
      expect(t.seat, 'R01-1');
      expect(t.walkKind, isNull);
    });

    test('isFreshFor: 같은 성당이고 30분 안일 때만', () {
      final t0 = DateTime.fromMillisecondsSinceEpoch(1700000000000);
      expect(full.isFreshFor('stpeter', t0), isTrue);
      expect(
        full.isFreshFor('stpeter', t0.add(const Duration(minutes: 30))),
        isTrue,
      );
      expect(
        full.isFreshFor('stpeter', t0.add(const Duration(minutes: 31))),
        isFalse,
      );
      expect(full.isFreshFor('basic', t0), isFalse);
      // 시계가 뒤로 간 경우(미래의 저장분)도 쓰지 않는다.
      expect(
        full.isFreshFor('stpeter', t0.subtract(const Duration(seconds: 1))),
        isFalse,
      );
    });

    test('toSceneArgs: 웹 restore 인자(좌석이면 자세, 서 있으면 걷던 목적지)', () {
      expect(seated.toSceneArgs(), {
        'church': 'basic',
        'x': -5.2,
        'z': -3.95,
        'r': 0.0,
        'seat': 'L03-2',
        'posture': 'kneel',
      });
      final a = full.toSceneArgs();
      expect(a['seat'], isNull);
      expect(a['posture'], 'sit');
      expect(a['walk'], {'kind': 'candle', 'index': 2});
      expect(a['cy'], -7.5);
      expect(a['cl'], 1.35);
    });

    test('withSeat: 앱이 아는 좌석 상태로 덮어쓴다', () {
      final stood = seated.withSeat(null);
      expect(stood.seat, isNull);
      expect(stood.kneel, isFalse);
      expect(stood.toSceneArgs()['posture'], 'sit');
      final sat = full.withSeat('R02-3', kneel: true);
      expect(sat.seat, 'R02-3');
      expect(sat.kneel, isTrue);
      expect(sat.walkKind, isNull);
      expect(sat.toSceneArgs().containsKey('walk'), isFalse);
    });

    test('SceneEvent.parse: state·restored 이벤트', () {
      final e = SceneEvent.parse(
        '{"e":"state","church":"basic","x":1.5,"z":-2,"r":0.5,'
        '"seat":"L01-1","posture":"kneel","cy":1,"cp":0.3,"cz":1.2,'
        '"cl":0,"walk":{"kind":"font","index":1,"seat":null}}',
      ) as SceneState;
      expect(e.church, 'basic');
      expect(e.x, 1.5);
      expect(e.seat, 'L01-1');
      expect(e.kneel, isTrue);
      expect(e.camZoom, 1.2);
      expect(e.walkKind, 'font');
      expect(e.walkIndex, 1);
      expect(
        SceneEvent.parse('{"e":"state","church":"basic","x":"a"}'),
        isNull,
      );
      final r = SceneEvent.parse(
        '{"e":"restored","seat":null,"lost":1,"x":1,"z":2}',
      ) as SceneRestored;
      expect(r.seat, isNull);
      expect(r.lost, isTrue);
      expect(r.x, 1);
    });
  });
}
