// 성당 장면 멎음(2026-11-23 여의도동 제보: 계단 위에서 3D 장면·조이스틱이 멎고 아래 메뉴만 눌림 — 오류 기록엔 JS 오류 0,
// 일시정지 → memory_pressure → 재개 뒤 멎음)을 앱이 알아채고 스스로 고쳐 보거나 '다시 불러오기'를 내미는지,
// 그리고 다음 제보에서 원인을 가를 수 있게 일시정지·재개·웹의 답·재개 뒤 첫 박동을 오류 기록에 남기는지.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/church_host.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_scene_watchdog.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:rosary_app/diag/diag_recorder.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';

Future<(AppSettings, FakeChurchSceneController, List<FakeChurchSceneController>)>
_pump(WidgetTester tester) async {
  setView(tester, const Size(400, 800));
  SharedPreferences.setMockInitialValues({});
  final settings = await AppSettings.load();
  settings.churchHudCollapsed = false;
  settings.churchAvatarChosen = true;
  final scene = FakeChurchSceneController();
  final made = <FakeChurchSceneController>[];
  await tester.pumpWidget(
    wrapApp(
      ChurchHost(
        visible: true,
        child: ChurchScreen(
          settings: settings,
          churchId: 'basic',
          net: FakeChurchNet(),
          scene: scene,
          sceneFactory: () {
            final s = FakeChurchSceneController();
            made.add(s);
            return s;
          },
        ),
      ),
    ),
  );
  await _p(tester);
  scene.emit(const SceneReady());
  await _p(tester);
  await _p(tester);
  return (settings, scene, made);
}

Future<void> _p(WidgetTester tester) async {
  await tester.pump();
  await tester.pump();
}

/// [seconds] 초 동안 1초마다 박동을 보낸다(frames 를 [step] 씩 늘린다).
Future<int> _beats(
  WidgetTester tester,
  FakeChurchSceneController scene,
  int seconds, {
  int from = 0,
  int step = 60,
  String state = 'run',
}) async {
  var f = from;
  for (var i = 0; i < seconds; i++) {
    f += step;
    scene.dispatchForTest(SceneHeartbeat(frames: f, state: state));
    await tester.pump(const Duration(seconds: 1));
  }
  return f;
}

Finder get _banner => find.byKey(const ValueKey('stall-banner'));

void main() {
  late DiagRecorder diag;
  setUp(() {
    final old = DiagRecorder.instance;
    diag = DiagRecorder.debugReplace(DiagRecorder());
    addTearDown(() => DiagRecorder.debugReplace(old));
  });
  List<String> crumbs() => [for (final c in diag.crumbs) '${c['ev']}'];

  group('감시(ChurchSceneWatchdog)', () {
    late DateTime now;
    ChurchSceneWatchdog make() => ChurchSceneWatchdog(clock: () => now);
    setUp(() => now = DateTime(2026, 11, 23, 8));
    void go(int ms) => now = now.add(Duration(milliseconds: ms));

    test('박동을 받기 전(옛 장면·가짜)·그릴 필요가 없을 때는 판단하지 않는다', () {
      final w = make()..expect(true);
      go(60000);
      expect(w.check(), isNull);
      w.beat(frames: 10);
      w.expect(false);
      go(60000);
      expect(w.check(), isNull);
    });

    test('그린 수가 늘면 정상, 3초 넘게 그대로면 frozen, 박동이 끊기면 no_heartbeat, 문맥을 잃으면 webgl', () {
      final w = make()..expect(true);
      var f = 0;
      for (var i = 0; i < 10; i++) {
        w.beat(frames: f += 60);
        go(1000);
        expect(w.check(), isNull, reason: '$i');
      }
      for (var i = 0; i < 4; i++) {
        w.beat(frames: f);
        go(1000);
      }
      expect(w.check(), 'frozen');
      final w2 = make()..expect(true);
      w2.beat(frames: 1);
      go(4100);
      expect(w2.check(), 'no_heartbeat');
      final w3 = make()..expect(true);
      w3.beat(frames: 1);
      go(4000);
      w3.gl(lost: true);
      w3.beat(frames: 2, state: 'gl');
      go(3100);
      w3.beat(frames: 2, state: 'gl');
      expect(w3.check(), 'webgl');
      w3.beat(frames: 9);
      expect(w3.check(), isNull, reason: '되찾음');
    });

    test('보이는데 웹이 paused·hidden 에 3초 넘게 머물면 그 상태를 알린다, 보이기 시작한 뒤 4초는 유예', () {
      final w = make()..expect(true);
      w.beat(frames: 1, state: 'paused');
      go(3500);
      w.beat(frames: 1, state: 'paused');
      expect(w.check(), isNull, reason: '유예');
      go(1000);
      w.beat(frames: 1, state: 'paused');
      expect(w.check(), 'paused');
      w.beat(frames: 1, state: 'hidden');
      go(3100);
      w.beat(frames: 1, state: 'hidden');
      expect(w.check(), 'hidden');
    });
  });

  group('성당 화면', () {
    testWidgets('그리기가 멎으면(그린 수 그대로) 웹뷰를 두 번 다시 붙여 보고, 그래도 멎으면 오류 기록 + "다시 불러오기" 띠', (
      tester,
    ) async {
      final (_, scene, made) = await _pump(tester);
      var f = await _beats(tester, scene, 6);
      expect(_banner, findsNothing);
      f = await _beats(tester, scene, 30, from: f, step: 0);
      expect(
        crumbs().where((c) => c == 'church_view_reattach').length,
        2,
        reason: '${diag.crumbs}',
      );
      expect(_banner, findsOneWidget);
      expect(find.text('다시 불러오기'), findsOneWidget);
      final e = diag.errors.where((e) => e['type'] == 'scene_stall');
      expect(e, hasLength(1));
      expect('${e.single['msg']}', contains('frozen'));
      // 누르면 장면을 새로 만든다
      await tester.tap(find.text('다시 불러오기'));
      await _p(tester);
      expect(made, hasLength(1));
      expect(_banner, findsNothing);
      expect(crumbs(), contains('church_stall_reload'));
      expect(tester.takeException(), isNull);
    });

    testWidgets('박동이 끊기면(웹 스레드가 묶임) 곧바로 띠, 다시 그리면 띠가 걷힌다', (tester) async {
      final (_, scene, _) = await _pump(tester);
      final f = await _beats(tester, scene, 5);
      expect(_banner, findsNothing);
      await tester.pump(const Duration(seconds: 5));
      expect(_banner, findsOneWidget);
      expect(
        diag.errors.where((e) => '${e['msg']}'.contains('no_heartbeat')),
        hasLength(1),
      );
      await _beats(tester, scene, 2, from: f);
      expect(_banner, findsNothing);
      expect(crumbs(), contains('church_stall_end'));
    });

    testWidgets('WebGL 문맥을 잃고 되찾지 못하면 띠(SceneGl 은 오류 기록 발자취에)', (tester) async {
      final (_, scene, _) = await _pump(tester);
      final f = await _beats(tester, scene, 5);
      scene.dispatchForTest(const SceneGl(lost: true));
      await _beats(tester, scene, 5, from: f, step: 0, state: 'gl');
      expect(_banner, findsOneWidget);
      expect(crumbs(), contains('church_gl'));
      expect(
        diag.errors.where((e) => '${e['msg']}'.contains('webgl')),
        hasLength(1),
      );
    });

    testWidgets('보이는데 웹이 일시정지에 남아 있으면(재개가 닿지 않음) 재개를 다시 보낸다', (tester) async {
      final (_, scene, _) = await _pump(tester);
      final f = await _beats(tester, scene, 5);
      final before = scene.count('resume');
      await _beats(tester, scene, 5, from: f, step: 0, state: 'paused');
      expect(scene.count('resume'), before + 1);
      expect(_banner, findsNothing);
    });

    testWidgets('앱 백그라운드 → 재개: 일시정지·재개·웹의 답·재개 뒤 첫 박동을 오류 기록에 남기고 웹뷰를 다시 붙인다', (
      tester,
    ) async {
      final (_, scene, _) = await _pump(tester);
      final f = await _beats(tester, scene, 3);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await _p(tester);
      scene.dispatchForTest(
        const SceneLife(state: 'paused', raf: true, age: 16, frames: 180),
      );
      await _p(tester);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await _p(tester);
      scene.dispatchForTest(
        const SceneLife(state: 'resumed', raf: true, age: 30000, frames: 180),
      );
      await _beats(tester, scene, 3, from: f);
      final c = crumbs();
      expect(c, containsAllInOrder(['church_life', 'church_life_ack', 'church_life', 'church_view_reattach', 'church_life_ack', 'church_hb']));
      final life = diag.crumbs.where((x) => x['ev'] == 'church_life').toList();
      expect((life[0]['d'] as Map)['op'], 'pause');
      expect((life[1]['d'] as Map)['op'], 'resume');
      final hb = diag.crumbs.lastWhere((x) => x['ev'] == 'church_hb');
      expect(((hb['d'] as Map)['df'] as num) > 0, isTrue, reason: '$hb');
      // 웹뷰는 다시 붙은 뒤에도 하나다
      expect(find.byKey(const ValueKey('fake-scene')), findsOneWidget);
      expect(scene.count('resume'), 1);
      expect(tester.takeException(), isNull);
    });
  });
}
