// 성당의 연속성(접기/펼치기·다른 앱에 다녀오기)과 HUD 접기·고정 조이스틱.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app_services.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/auth/auth_gate.dart';
import 'package:rosary_app/auth/auth_state.dart';
import 'package:rosary_app/auth/fake_auth_service.dart';
import 'package:rosary_app/church/church_entry_card.dart';
import 'package:rosary_app/church/church_hud.dart';
import 'package:rosary_app/church/church_resume_state.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:rosary_app/church/church_tab.dart';
import 'package:rosary_app/ui/app_shell.dart';
import 'package:rosary_app/ui/home_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'auth_test_support.dart';
import 'church_screen_fakes.dart';
import 'glass_test_support.dart';

const _ids = {'basic', 'milan', 'stpeter'};

typedef _Shell = ({
  AppSettings settings,
  FakeChurchNet net,
  FakeChurchSceneController scene,
});

/// 앱 셸(내비게이션 포함) 안에 성당 탭을 띄운다. [prefs]는 저장소의 처음 값.
Future<_Shell> _pumpShell(
  WidgetTester tester,
  Size size, {
  Map<String, Object> prefs = const {},
  double textScale = 1,
}) async {
  setView(tester, size);
  SharedPreferences.setMockInitialValues(prefs);
  final settings = await AppSettings.load();
  settings.churchAvatarChosen = true;
  settings.churchHudCollapsed = prefs['church_hud_collapsed'] as bool? ?? false;
  settings.churchId = 'basic';
  final services = AppServices.inMemory(settings);
  addTearDown(services.disposeInMemory);
  final net = FakeChurchNet();
  final scene = FakeChurchSceneController();
  await tester.pumpWidget(
    AppServicesScope(
      services: services,
      child: MaterialApp(
        theme: ThemeData(splashFactory: InkRipple.splashFactory),
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
            availableIds: _ids,
          ),
        ),
      ),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
  return (settings: settings, net: net, scene: scene);
}

Future<void> _enter(
  WidgetTester tester,
  FakeChurchSceneController scene,
) async {
  await tester.ensureVisible(find.byKey(const ValueKey('entry-enter')));
  await tester.pump();
  await tester.tap(find.byKey(const ValueKey('entry-enter')));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
  scene.emit(const SceneReady());
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
}

Future<void> _resize(WidgetTester tester, Size size) async {
  tester.view.physicalSize = size;
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
}

void _lifecycle(WidgetTester tester, AppLifecycleState s) =>
    tester.binding.handleAppLifecycleStateChanged(s);

Future<void> _background(WidgetTester tester) async {
  for (final s in const [
    AppLifecycleState.inactive,
    AppLifecycleState.hidden,
    AppLifecycleState.paused,
  ]) {
    _lifecycle(tester, s);
  }
  await tester.pump();
}

Future<void> _foreground(WidgetTester tester) async {
  for (final s in const [
    AppLifecycleState.hidden,
    AppLifecycleState.inactive,
    AppLifecycleState.resumed,
  ]) {
    _lifecycle(tester, s);
  }
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

String _resumeJson(String church, {Duration age = Duration.zero}) =>
    ChurchResumeState(
      churchId: church,
      x: 1.5,
      z: -4,
      r: 0.5,
      camZoom: 1.2,
      savedAtMs: DateTime.now().subtract(age).millisecondsSinceEpoch,
    ).encode();

void main() {
  group('폴드 접기/펼치기(360x800 ↔ 840x900)', () {
    testWidgets('성당 안에 있던 그대로 이어진다(다시 입장하지 않는다)', (tester) async {
      final h = await _pumpShell(tester, const Size(360, 800));
      await _enter(tester, h.scene);
      expect(find.byType(NavigationBar), findsOneWidget);
      final screen = tester.state(find.byType(ChurchScreen));
      final view = tester.element(find.byKey(const ValueKey('fake-scene')));
      expect(h.scene.count('init'), 1);

      // 펼친다: 하단 바 → 레일.
      await _resize(tester, const Size(840, 900));
      expect(find.byType(NavigationRail), findsOneWidget);
      expect(find.byType(NavigationBar), findsNothing);
      expect(find.byType(ChurchEntryCard), findsNothing);
      expect(tester.state(find.byType(ChurchScreen)), same(screen));
      expect(
        tester.element(find.byKey(const ValueKey('fake-scene'))),
        same(view),
        reason: '장면(WebView) 위젯이 다시 만들어지지 않는다',
      );
      expect(tester.takeException(), isNull);

      // 다시 접는다.
      await _resize(tester, const Size(360, 800));
      expect(find.byType(NavigationBar), findsOneWidget);
      expect(find.byType(ChurchEntryCard), findsNothing);
      expect(tester.state(find.byType(ChurchScreen)), same(screen));
      expect(
        tester.element(find.byKey(const ValueKey('fake-scene'))),
        same(view),
      );
      expect(h.scene.count('init'), 1, reason: '장면을 다시 시작하지 않는다');
      expect(h.scene.isDisposed, isFalse);
      expect(h.net.connectedIds, ['basic'], reason: '다시 접속하지 않는다');
      expect(h.net.disconnects, 0);
      expect(tester.takeException(), isNull);
    });

    testWidgets('앉은 자리와 접힌 메뉴도 그대로다', (tester) async {
      final h = await _pumpShell(tester, const Size(360, 800));
      await _enter(tester, h.scene);
      h.scene.emit(const SceneSeated('L03-2'));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('hud-collapse')));
      await tester.pump();
      expect(find.byKey(const ValueKey('move-zone')), findsNothing);

      await _resize(tester, const Size(840, 900));
      await _resize(tester, const Size(360, 800));
      expect(find.byKey(const ValueKey('move-zone')), findsNothing);
      expect(find.byKey(const ValueKey('hud-expand')), findsOneWidget);
      expect(h.scene.count('init'), 1);
      expect(tester.takeException(), isNull);
    });

    testWidgets('다른 탭(오늘)의 화면 상태도 이어진다', (tester) async {
      await _pumpShell(tester, const Size(360, 800));
      await tester.tap(
        find.descendant(
          of: find.byType(NavigationBar),
          matching: find.text('오늘'),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      final home = tester.state(find.byType(HomeScreen));
      await _resize(tester, const Size(840, 900));
      expect(tester.state(find.byType(HomeScreen)), same(home));
      await _resize(tester, const Size(360, 800));
      expect(tester.state(find.byType(HomeScreen)), same(home));
      expect(tester.takeException(), isNull);
    });
  });

  group('다른 앱에 다녀오기', () {
    testWidgets('백그라운드 → 복귀: 같은 성당 그대로, 장면만 멈췄다 잇는다', (tester) async {
      final h = await _pumpShell(tester, const Size(360, 800));
      await _enter(tester, h.scene);
      final screen = tester.state(find.byType(ChurchScreen));
      await _background(tester);
      expect(h.scene.count('pause'), 1);
      await _foreground(tester);
      expect(h.scene.count('resume'), 1);
      expect(find.byType(ChurchEntryCard), findsNothing);
      expect(tester.state(find.byType(ChurchScreen)), same(screen));
      expect(h.scene.count('init'), 1);
      expect(h.net.disconnects, 0);
    });

    testWidgets('앱이 정리된 뒤 다시 열면 입장 단추 없이 같은 성당·자리로 들어간다', (tester) async {
      final h = await _pumpShell(
        tester,
        const Size(360, 800),
        prefs: {ChurchResumeState.prefsKey: _resumeJson('milan')},
      );
      expect(find.byType(ChurchEntryCard), findsNothing);
      expect(find.byType(ChurchScreen), findsOneWidget);
      expect(h.settings.churchId, 'milan');
      h.scene.emit(const SceneReady());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(h.scene.lastArgs('init')!['church'], 'milan');
      final restore = h.scene.lastArgs('restore')!;
      expect(restore['x'], 1.5);
      expect(restore['z'], -4.0);
      expect(restore['cz'], 1.2);
      expect(h.net.connectedIds, ['milan'], reason: '함께 기도 접속도 다시 잇는다');
    });

    testWidgets('오래된 저장분(30분 넘음)이면 입구에서 시작한다', (tester) async {
      await _pumpShell(
        tester,
        const Size(360, 800),
        prefs: {
          ChurchResumeState.prefsKey: _resumeJson(
            'milan',
            age: const Duration(minutes: 45),
          ),
        },
      );
      expect(find.byType(ChurchEntryCard), findsOneWidget);
      expect(find.byType(ChurchScreen), findsNothing);
    });

    testWidgets('렌더 프로세스가 정리됐으면 장면을 새로 만들어 같은 자리로 되살린다', (tester) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings();
      final net = FakeChurchNet();
      final scenes = <FakeChurchSceneController>[FakeChurchSceneController()];
      await tester.pumpWidget(
        wrapApp(
          ChurchScreen(
            settings: settings,
            net: net,
            scene: scenes.first,
            sceneFactory: () {
              scenes.add(FakeChurchSceneController());
              return scenes.last;
            },
          ),
        ),
      );
      await tester.pump();
      scenes.first.emit(const SceneReady());
      await tester.pump();
      final screen = tester.state(find.byType(ChurchScreen));

      await _background(tester);
      // 웹이 멈추면서 지금 자리를 알려 준다.
      scenes.first.emit(
        const SceneState(church: 'basic', x: 3, z: -7, r: 1, camZoom: 0.8),
      );
      await tester.pump();
      scenes.first.alive = false; // 백그라운드에서 렌더 프로세스가 정리됐다
      await _foreground(tester);

      expect(scenes, hasLength(2), reason: '장면을 새로 만든다');
      expect(tester.state(find.byType(ChurchScreen)), same(screen));
      scenes.last.emit(const SceneReady());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(scenes.last.count('init'), 1);
      final restore = scenes.last.lastArgs('restore')!;
      expect(restore['x'], 3.0);
      expect(restore['z'], -7.0);
      expect(net.connectedIds, ['basic']);
      expect(tester.takeException(), isNull);
    });

    testWidgets('살아 있으면 장면을 새로 만들지 않는다', (tester) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings();
      final scene = FakeChurchSceneController();
      var made = 0;
      await tester.pumpWidget(
        wrapApp(
          ChurchScreen(
            settings: settings,
            net: FakeChurchNet(),
            scene: scene,
            sceneFactory: () {
              made++;
              return FakeChurchSceneController();
            },
          ),
        ),
      );
      await tester.pump();
      scene.emit(const SceneReady());
      await tester.pump();
      await _background(tester);
      await _foreground(tester);
      expect(made, 0);
      expect(scene.count('resume'), 1);
    });

    testWidgets('인증 관문: 복귀 때 잠깐 대기(splash)해도 본문 상태를 버리지 않는다', (tester) async {
      final auth = FakeAuthService(
        initial: const AuthState.signedIn(userId: 'u1', email: 'a@b.co'),
      );
      final store = await makeConsentStore(auth);
      await store.grantRequired();
      await tester.pumpWidget(
        authHost(
          AuthGate(
            authService: auth,
            consentStore: store,
            backendConfigured: true,
            child: const _Counter(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('count 0'));
      await tester.pump();
      expect(find.text('count 1'), findsOneWidget);

      auth.emit(const AuthState.loading()); // 세션을 새로 고치는 동안
      await tester.pump();
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('count 1'), findsNothing, reason: '가려 둔다');
      auth.emit(const AuthState.signedIn(userId: 'u1', email: 'a@b.co'));
      await tester.pumpAndSettle();
      expect(find.text('count 1'), findsOneWidget, reason: '상태가 그대로다');
    });
  });

  group('HUD 메뉴 접기', () {
    testWidgets('접으면 단추 하나와 이름 한 줄만 남고, 누르면 펼쳐진다', (tester) async {
      final h = await pumpChurch(tester, size: const Size(360, 800));
      expect(find.byType(ChurchTopActions), findsOneWidget);
      expect(find.text('혼자 모드'), findsOneWidget);
      final before = tester.getRect(find.byType(ChurchStatusChip));

      expect(find.bySemanticsLabel('메뉴 접기'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('hud-collapse')));
      await tester.pump();
      expect(find.byType(ChurchTopActions), findsNothing);
      expect(find.text('혼자 모드'), findsNothing);
      expect(h.settings.churchHudCollapsed, isTrue);
      final button = tester.getRect(find.byType(ChurchHudMenuButton));
      expect(button.height, 48);
      expect(button.width, greaterThan(48), reason: '알약(아이콘 + 화살표)');
      expect(find.bySemanticsLabel('메뉴 펼치기'), findsOneWidget);
      final chip = tester.getRect(find.byType(ChurchStatusChip));
      expect(chip.height, lessThan(before.height));
      expect(chip.overlaps(button), isFalse);
      expect(chip.top, button.top, reason: '이름과 단추가 한 줄');
      // 접힌 HUD 는 화면 위쪽 한 줄(48dp)만 차지한다.
      expect(button.bottom, lessThanOrEqualTo(8 + 48 + 0.5));

      await tester.tap(find.byKey(const ValueKey('hud-expand')));
      await tester.pump();
      expect(find.byType(ChurchTopActions), findsOneWidget);
      expect(find.byKey(const ValueKey('go-button')), findsOneWidget);
      expect(h.settings.churchHudCollapsed, isFalse);
      await tester.pump(const Duration(seconds: 7));
    });

    testWidgets('접힘 상태를 기억한다(저장소 → 다음 입장)', (tester) async {
      final h = await pumpChurch(tester, size: const Size(360, 800));
      await tester.tap(find.byKey(const ValueKey('hud-collapse')));
      await tester.pump();
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getBool('church_hud_collapsed'), isTrue);

      // 다시 읽은 설정으로 새로 들어간다.
      final again = await AppSettings.load();
      expect(again.churchHudCollapsed, isTrue);
      final scene = FakeChurchSceneController();
      await tester.pumpWidget(
        wrapApp(
          ChurchScreen(
            key: const ValueKey('second'),
            settings: again,
            net: FakeChurchNet(),
            scene: scene,
          ),
        ),
      );
      await tester.pump();
      scene.emit(const SceneReady());
      await tester.pump();
      expect(find.byType(ChurchTopActions), findsNothing);
      expect(find.byKey(const ValueKey('hud-expand')), findsOneWidget);
      expect(h.settings.churchHudCollapsed, isTrue);
      await tester.pump(const Duration(seconds: 7));
    });

    for (final (size, scale) in const [
      (Size(360, 800), 2.0),
      (Size(840, 900), 1.0),
      (Size(840, 900), 2.0),
      (Size(360, 640), 2.0),
    ]) {
      testWidgets(
        '넘침·겹침 없음 ${size.width.toInt()}x${size.height.toInt()} 글자 $scale배',
        (tester) async {
          final h = await pumpChurch(tester, size: size, textScale: scale);
          h.scene.emit(const SceneNear(seat: 'L03-2'));
          await tester.pump();
          await tester.pump(const Duration(milliseconds: 300));
          for (final collapsed in [false, true]) {
            if (collapsed) {
              await tester.tap(find.byKey(const ValueKey('hud-collapse')));
              await tester.pump();
            }
            expect(tester.takeException(), isNull, reason: '접힘=$collapsed');
            final stick = tester.getRect(
              find.byKey(const ValueKey('move-zone')),
            );
            final sit = tester.getRect(find.byKey(const ValueKey('ctx-sit')));
            final chip = tester.getRect(find.byType(ChurchStatusChip));
            final menu = tester.getRect(
              collapsed
                  ? find.byType(ChurchHudMenuButton)
                  : find.byType(ChurchTopActions),
            );
            final screen = Offset.zero & size;
            for (final r in [stick, sit, chip, menu]) {
              expect(
                screen.contains(r.topLeft) &&
                    r.right <= size.width + 0.5 &&
                    r.bottom <= size.height + 0.5,
                isTrue,
                reason: '화면 안: $r',
              );
            }
            expect(stick.overlaps(sit), isFalse, reason: '손잡이와 앉기 단추');
            expect(stick.overlaps(chip), isFalse);
            expect(stick.overlaps(menu), isFalse);
            expect(chip.overlaps(menu), isFalse);
            expect(sit.overlaps(menu), isFalse);
            // 접는/펼치는 단추는 48dp 이상.
            final toggle = tester.getSize(
              find.byKey(ValueKey(collapsed ? 'hud-expand' : 'hud-collapse')),
            );
            expect(toggle.width, greaterThanOrEqualTo(48));
            expect(toggle.height, greaterThanOrEqualTo(48));
          }
          await tester.pump(const Duration(seconds: 7));
        },
      );
    }
  });

  group('고정 조이스틱과 시점·확대(멀티터치)', () {
    // 실제 ChurchScreen 의 Stack(장면 → 입력 층 → 입장 덮개 → HUD)을 그대로 띄우고 손가락을 놓는다.
    // 기기(안드로이드 웹뷰)는 손잡이를 잡은 채 닿은 다른 손가락의 움직임을 받지 못하므로, 걷는 동안 장면 위의
    // 손가락은 모두 앱 입력 층이 읽어 setInput 으로 보낸다. 웹뷰 자리(가짜 장면)는 손가락을 하나도 받지 않아야 한다.
    double sumOf(FakeChurchSceneController s, String key, {int from = 0}) {
      var v = 0.0;
      final l = s.argsOf('setInput');
      for (var i = from; i < l.length; i++) {
        final x = l[i][key];
        if (x is num) v += x;
      }
      return v;
    }

    double prodK(FakeChurchSceneController s, {int from = 0}) {
      var v = 1.0;
      final l = s.argsOf('setInput');
      for (var i = from; i < l.length; i++) {
        final x = l[i]['k'];
        if (x is num) v *= x;
      }
      return v;
    }

    List<Object?> looks(FakeChurchSceneController s) => [
      for (final a in s.argsOf('setInput'))
        if (a.containsKey('look')) a['look'],
    ];

    testWidgets('입장하면 웹에 앱 손잡이를 알린다(화면 전체가 시점·확대)', (tester) async {
      final h = await pumpChurch(tester);
      final inputs = h.scene.argsOf('setInput');
      expect(inputs.where((a) => a.containsKey('ext')), [
        {'ext': true},
      ]);
      // 이동 영역은 왼쪽 절반이 아니라 손잡이 원: 원의 자리도 함께 알린다.
      expect(inputs.any((a) => a.containsKey('stick')), isTrue);
    });

    testWidgets('장면 위 한 손가락 끌기: 앱이 읽어 시점(dx·dy)으로 보내고 웹뷰는 손가락을 받지 않는다', (
      tester,
    ) async {
      final h = await pumpChurch(tester);
      final joy = h.scene.count('setJoystick');
      final g = await tester.startGesture(const Offset(300, 300));
      await tester.pump();
      expect(looks(h.scene), [true]);
      await g.moveBy(const Offset(25, 0));
      await g.moveBy(const Offset(15, -10));
      await tester.pump();
      expect(sumOf(h.scene, 'dx'), closeTo(40, 0.01));
      expect(sumOf(h.scene, 'dy'), closeTo(-10, 0.01));
      // 두 축은 늘 함께 간다(한 축만 보내면 웹이 끌기를 버리던 문제 방지).
      for (final a in h.scene.argsOf('setInput')) {
        expect(a.containsKey('dx'), a.containsKey('dy'));
      }
      await g.up();
      await tester.pump();
      expect(looks(h.scene), [true, false]);
      expect(h.scene.count('setJoystick'), joy, reason: '이동하지 않는다');
      expect(h.scene.count('tapAt'), 0, reason: '끌었으니 탭이 아니다');
      expect(h.scene.viewPointerDowns, 0, reason: '웹뷰는 걷는 동안 손가락을 받지 않는다');
    });

    testWidgets('손잡이를 먼저 잡고 다른 손가락으로 끌면 이동하면서 시점이 돈다', (tester) async {
      final h = await pumpChurch(tester);
      final stick = tester.getCenter(find.byKey(const ValueKey('move-zone')));
      final a = await tester.startGesture(stick);
      await a.moveBy(const Offset(0, -40));
      await tester.pump(const Duration(milliseconds: 50));
      expect(h.scene.lastArgs('setJoystick')!['y'] as double, greaterThan(0.5));

      final b = await tester.startGesture(const Offset(300, 300), pointer: 7);
      await tester.pump();
      expect(looks(h.scene), [true]);
      // 손잡이는 풀리지 않는다.
      expect(h.scene.lastArgs('setJoystick')!['y'] as double, greaterThan(0.5));
      // 걸으면서(손잡이도 움직이며) 시점 손가락을 끈다.
      for (var i = 0; i < 4; i++) {
        await a.moveBy(const Offset(1, 0));
        await b.moveBy(const Offset(10, 5));
        await tester.pump(const Duration(milliseconds: 20));
      }
      expect(sumOf(h.scene, 'dx'), closeTo(40, 0.01));
      expect(sumOf(h.scene, 'dy'), closeTo(20, 0.01));
      expect(
        h.scene.argsOf('setInput').any((x) => x.containsKey('k')),
        isFalse,
      );
      expect(h.scene.lastArgs('setJoystick')!['y'] as double, greaterThan(0.5));

      // 시점 손가락을 먼저 떼면 시점만 끝나고 이동은 이어진다.
      await b.up();
      await tester.pump();
      expect(looks(h.scene), [true, false]);
      final joy = h.scene.count('setJoystick');
      await a.moveBy(const Offset(10, -10));
      await tester.pump(const Duration(milliseconds: 50));
      expect(h.scene.count('setJoystick'), greaterThan(joy));
      await a.up();
      await tester.pump();
      expect(h.scene.lastArgs('setJoystick'), {'x': 0.0, 'y': 0.0});
      expect(h.scene.count('tapAt'), 0);
      expect(h.scene.viewPointerDowns, 0);
    });

    testWidgets('시점을 먼저 돌리던 중 손잡이를 잡아도 시점 손가락은 계속 시점을 돌린다(기기에서 멈추던 순서)', (
      tester,
    ) async {
      final h = await pumpChurch(tester);
      final stick = tester.getCenter(find.byKey(const ValueKey('move-zone')));
      final a = await tester.startGesture(const Offset(300, 300));
      await a.moveBy(const Offset(20, 0));
      await tester.pump();
      final b = await tester.startGesture(stick, pointer: 7);
      await b.moveBy(const Offset(0, -40));
      await tester.pump(const Duration(milliseconds: 50));
      expect(h.scene.lastArgs('setJoystick')!['y'] as double, greaterThan(0.5));
      final from = h.scene.argsOf('setInput').length;
      await a.moveBy(const Offset(30, 0));
      await tester.pump();
      expect(sumOf(h.scene, 'dx', from: from), closeTo(30, 0.01));
      expect(looks(h.scene), [true], reason: '시점은 끊기지 않는다');
      // 손잡이를 먼저 떼어도 시점 손가락은 이어진다(튀지 않게 직전 위치와의 차이만).
      await b.up();
      await tester.pump();
      expect(h.scene.lastArgs('setJoystick'), {'x': 0.0, 'y': 0.0});
      final from2 = h.scene.argsOf('setInput').length;
      await a.moveBy(const Offset(-12, 0));
      await tester.pump();
      expect(sumOf(h.scene, 'dx', from: from2), closeTo(-12, 0.01));
      await a.up();
      await tester.pump();
      expect(looks(h.scene), [true, false]);
      expect(h.scene.viewPointerDowns, 0);
    });

    testWidgets('장면 위 두 손가락은 확대(k), 손잡이를 잡은 채로도', (tester) async {
      final h = await pumpChurch(tester);
      final stick = tester.getCenter(find.byKey(const ValueKey('move-zone')));
      final s = await tester.startGesture(stick, pointer: 3);
      await s.moveBy(const Offset(0, -45));
      await tester.pump(const Duration(milliseconds: 50));
      final a = await tester.startGesture(const Offset(200, 300), pointer: 4);
      final b = await tester.startGesture(const Offset(300, 300), pointer: 5);
      await tester.pump();
      final from = h.scene.argsOf('setInput').length;
      await a.moveBy(const Offset(-50, 0)); // 100 → 150
      await b.moveBy(const Offset(50, 0)); // 150 → 200
      await tester.pump();
      expect(prodK(h.scene, from: from), closeTo(2.0, 0.001));
      expect(sumOf(h.scene, 'dx', from: from), 0, reason: '두 손가락은 시점이 아니라 확대');
      expect(h.scene.lastArgs('setJoystick')!['y'] as double, greaterThan(0.5));
      // 하나를 떼면 남은 손가락이 이어서 시점을 돌린다(점프 없이).
      await a.up();
      await tester.pump();
      final from2 = h.scene.argsOf('setInput').length;
      await b.moveBy(const Offset(8, 0));
      await tester.pump();
      expect(sumOf(h.scene, 'dx', from: from2), closeTo(8, 0.01));
      await b.up();
      await s.up();
      await tester.pump();
      expect(looks(h.scene), [true, false]);
    });

    testWidgets('장면 위 짧은 탭은 표식 누르기(tapAt), 다른 손가락이 있으면 탭이 아니다', (tester) async {
      final h = await pumpChurch(tester);
      await tester.tapAt(const Offset(250, 320));
      await tester.pump();
      expect(h.scene.lastArgs('tapAt'), {'x': 250.0, 'y': 320.0});
      final n = h.scene.count('tapAt');
      final stick = tester.getCenter(find.byKey(const ValueKey('move-zone')));
      final s = await tester.startGesture(stick);
      await s.moveBy(const Offset(0, -30));
      await tester.tapAt(const Offset(250, 320));
      await s.up();
      await tester.pump();
      expect(
        h.scene.count('tapAt'),
        n,
        reason: '걸으면서 닿은 손가락은 탭으로 걷기를 시작하지 않는다',
      );
      expect(h.scene.viewPointerDowns, 0);
    });

    testWidgets('HUD 단추가 먼저 받는다(입력 층 위)', (tester) async {
      final h = await pumpChurch(tester);
      final n = h.scene.argsOf('setInput').length;
      await tester.tap(find.byKey(const ValueKey('hud-collapse')));
      await tester.pump();
      expect(h.settings.churchHudCollapsed, isTrue);
      expect(h.scene.argsOf('setInput').length, n, reason: '단추 터치는 시점이 아니다');
      expect(h.scene.count('tapAt'), 0);
    });

    testWidgets('앉아 있으면 입력 층이 없어 웹이 직접 손가락을 받는다', (tester) async {
      final h = await pumpChurch(tester);
      h.scene.emit(const SceneSeated('L03-2'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byKey(const ValueKey('move-zone')), findsNothing);
      final before = h.scene.viewPointerDowns;
      await tester.tapAt(const Offset(200, 400));
      await tester.pump();
      expect(h.scene.viewPointerDowns, before + 1);
      await tester.pump(const Duration(seconds: 7));
    });

    testWidgets("설정 '조이스틱 위치: 오른쪽'이면 손잡이는 오른쪽, 상황 단추는 왼쪽", (tester) async {
      final h = await pumpChurch(tester, size: const Size(360, 800));
      h.scene.emit(const SceneNear(seat: 'L03-2'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      var stick = tester.getRect(find.byKey(const ValueKey('move-zone')));
      var sit = tester.getRect(find.byKey(const ValueKey('ctx-sit')));
      expect(stick.center.dx, lessThan(180));
      expect(sit.center.dx, greaterThan(180));

      h.settings.churchStickRight = true;
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      stick = tester.getRect(find.byKey(const ValueKey('move-zone')));
      sit = tester.getRect(find.byKey(const ValueKey('ctx-sit')));
      expect(stick.right, 360 - 16);
      expect(sit.center.dx, lessThan(180));
      expect(stick.overlaps(sit), isFalse);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getBool('church_stick_right'), isTrue);
      await tester.pump(const Duration(seconds: 7));
    });
  });
}

class _Counter extends StatefulWidget {
  const _Counter();

  @override
  State<_Counter> createState() => _CounterState();
}

class _CounterState extends State<_Counter> {
  int _n = 0;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: TextButton(
        onPressed: () => setState(() => _n++),
        child: Text('count $_n'),
      ),
    ),
  );
}
