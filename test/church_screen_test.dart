import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/church/avatar/avatar_config.dart';
import 'package:rosary_app/church/church_constants.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:rosary_app/church/net/church_net.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/domain/rosary_session.dart';

import 'church_screen_fakes.dart';

Finder get _sheetButton => find.descendant(
  of: find.byType(BottomSheet),
  matching: find.widgetWithText(FilledButton, '초 켜기'),
);

/// AnimatedSwitcher/Size는 첫 프레임에서 시작하므로 두 번 pump해야 끝난다.
Future<void> _anim(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 20));
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pump();
}

MysterySet get _today => mysterySetForWeekday(DateTime.now().weekday);

/// 기도 카드의 ⋮ 메뉴에서 항목을 고른다.
Future<void> _menu(WidgetTester tester, String item) async {
  await tester.tap(find.byTooltip('더보기'));
  await tester.pumpAndSettle();
  await tester.tap(find.text(item));
  await tester.pump();
}

Future<void> _sit(WidgetTester tester, ChurchHarness h) async {
  h.scene.emit(const SceneNear(seat: 'L03-2'));
  await _anim(tester);
  await tester.tap(find.text('앉기'));
  await tester.pump();
  h.scene.emit(const SceneSeated('L03-2'));
  await tester.pump();
}

void main() {
  testWidgets('init sends avatar, church and solo flag once ready', (
    tester,
  ) async {
    final h = await pumpChurch(tester);
    final init = h.scene.lastArgs('init')!;
    expect(init['church'], 'basic');
    expect(init['solo'], isTrue);
    expect(init['quality'], 'high');
    expect(init['avatar'], isA<Map>());
    expect(h.net.connectedIds, ['basic']);
  });

  group('HUD', () {
    testWidgets('solo mode shows 혼자 모드 and no head count', (tester) async {
      final h = await pumpChurch(tester);
      expect(find.text('혼자 모드'), findsOneWidget);
      expect(find.textContaining('명'), findsNothing);
      expect(find.byKey(const ValueKey('presence-dot')), findsNothing);
      expect(h.net.state.value, NetState.offline);
    });

    testWidgets('online shows the count and tells the scene it is not solo', (
      tester,
    ) async {
      final h = await pumpChurch(tester);
      h.net.goOnline(12);
      await tester.pump();
      expect(find.text('12명'), findsOneWidget);
      expect(find.text('혼자 모드'), findsNothing);
      expect(h.scene.lastArgs('setSolo'), {'on': false});

      // 연결이 끊기면 다시 혼자 모드(내 위치는 건드리지 않는다).
      h.net.stateN.value = NetState.offline;
      await tester.pump();
      expect(find.text('혼자 모드'), findsOneWidget);
      expect(find.textContaining('명'), findsNothing);
      expect(h.scene.lastArgs('setSolo'), {'on': true});
      expect(h.scene.lastArgs('setPeers'), {'peers': [], 'seats': {}});
    });

    testWidgets('sound toggle updates settings and scene', (tester) async {
      final h = await pumpChurch(tester);
      expect(h.settings.churchAmbient, isTrue);
      await tester.tap(find.byTooltip('소리 끄기'));
      await tester.pump();
      expect(h.settings.churchAmbient, isFalse);
      expect(h.scene.lastArgs('setAmbient'), {'on': false});
      expect(find.byTooltip('소리 켜기'), findsOneWidget);
    });

    testWidgets('emote menu has 3 emotes', (tester) async {
      final h = await pumpChurch(tester);
      await tester.tap(find.byTooltip('인사'));
      await tester.pumpAndSettle();
      expect(find.text('인사'), findsOneWidget);
      expect(find.text('성호경'), findsOneWidget);
      expect(find.text('고개 숙임'), findsOneWidget);
      await tester.tap(find.text('성호경'));
      await tester.pumpAndSettle();
      expect(h.scene.lastArgs('emote'), {'e': 1}); // 혼자 모드: 바로 재생
      expect(h.net.emotes, [1]);
    });

    testWidgets('online emote waits for the server echo', (tester) async {
      final h = await pumpChurch(tester);
      h.net.goOnline(2);
      h.net.emit(
        Welcome(
          you: 'me',
          room: 'basic-1',
          n: 2,
          peers: const [],
          seats: const {},
          candles: const [],
          now: 1,
        ),
      );
      await tester.pump();
      await tester.tap(find.byTooltip('인사'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('고개 숙임'));
      await tester.pumpAndSettle();
      expect(h.net.emotes, [2]);
      expect(h.scene.count('emote'), 0);
      h.net.emit(const Emote('me', 2));
      await tester.pump();
      expect(h.scene.lastArgs('emote'), {'e': 2});
      expect(h.scene.count('peerEmote'), 0);
    });

    testWidgets('avatar editor opens from the HUD', (tester) async {
      await pumpChurch(tester);
      await tester.tap(find.byTooltip('아바타 편집'));
      await tester.pumpAndSettle();
      expect(find.text('내 아바타'), findsWidgets);
    });

    testWidgets('floating joystick appears where the left half is touched', (
      tester,
    ) async {
      final h = await pumpChurch(tester); // 400x800
      final zone = find.byKey(const ValueKey('move-zone'));
      // 이동 영역은 왼쪽 절반이다.
      expect(tester.getTopLeft(zone), Offset.zero);
      expect(tester.getSize(zone).width, 200);
      expect(find.byKey(const ValueKey('joystick-ring')), findsNothing);
      expect(find.byKey(const ValueKey('move-hint')), findsOneWidget);

      final g = await tester.startGesture(const Offset(80, 500));
      await tester.pump();
      // 닿은 자리에 스틱이 생긴다(고정된 오른쪽 스틱이 아니다).
      final ring = find.byKey(const ValueKey('joystick-ring'));
      expect(tester.getCenter(ring), const Offset(80, 500));
      expect(find.byKey(const ValueKey('move-hint')), findsNothing);
      await g.moveBy(const Offset(0, -40));
      await tester.pump(const Duration(milliseconds: 50));
      final moved = h.scene.argsOf('setJoystick');
      expect(moved, isNotEmpty);
      expect(moved.last['y'] as double, greaterThan(0.5));
      expect((moved.last['x'] as double).abs(), lessThan(0.05));
      await g.up();
      await tester.pump();
      expect(h.scene.lastArgs('setJoystick'), {'x': 0.0, 'y': 0.0});
      expect(ring, findsNothing);
    });

    testWidgets('right half touches never move the joystick', (tester) async {
      final h = await pumpChurch(tester);
      final before = h.scene.count('setJoystick');
      final g = await tester.startGesture(const Offset(300, 500));
      await g.moveBy(const Offset(0, -60));
      await tester.pump(const Duration(milliseconds: 50));
      await g.up();
      await tester.pump();
      expect(h.scene.count('setJoystick'), before);
      expect(find.byKey(const ValueKey('joystick-ring')), findsNothing);
    });

    testWidgets('HUD buttons stay tappable above the move zone', (
      tester,
    ) async {
      final h = await pumpChurch(tester);
      // 왼쪽 위 칩(성당 바꾸기)과 소리 버튼은 이동 영역 위에 있다.
      for (final tip in ['성당 바꾸기', '소리 끄기', '아바타 편집']) {
        final r = tester.getRect(find.byTooltip(tip));
        expect(r.shortestSide, greaterThanOrEqualTo(48), reason: tip);
      }
      await tester.tap(find.byTooltip('소리 끄기'));
      await tester.pump();
      expect(h.settings.churchAmbient, isFalse);
      expect(h.scene.count('setJoystick'), 0);
    });

    testWidgets('the context button is one 64dp-high button on the right', (
      tester,
    ) async {
      final h = await pumpChurch(tester); // 400x800
      expect(find.byKey(const ValueKey('ctx-sit')), findsNothing);
      h.scene.emit(const SceneNear(seat: 'L03-2'));
      await _anim(tester);
      final r = tester.getRect(find.byKey(const ValueKey('ctx-sit')));
      expect(r.height, greaterThanOrEqualTo(64));
      expect(r.center.dx, greaterThan(200)); // 오른쪽 절반
      expect(r.bottom, greaterThan(600)); // 아래쪽
      // 앉을 자리와 촛불대가 모두 가까워도 버튼은 하나(자리 우선).
      h.scene.emit(const SceneNear(seat: 'L03-2', candle: 5));
      await _anim(tester);
      expect(find.byType(FilledButton), findsOneWidget);
      expect(find.text('앉기'), findsOneWidget);
      expect(find.text('초 켜기'), findsNothing);
      h.scene.emit(const SceneNear(candle: 5));
      await _anim(tester);
      expect(find.text('초 켜기'), findsOneWidget);
      expect(find.text('앉기'), findsNothing);
    });

    testWidgets('web pos events are forwarded to the net', (tester) async {
      final h = await pumpChurch(tester);
      h.scene.emit(const ScenePos(1.5, 8, 0.25, true));
      await tester.pump();
      expect(h.net.positions, [(1.5, 8.0, 0.25, true)]);
    });
  });

  group('seat', () {
    testWidgets('앉기 only shows near a seat and requests the seat', (
      tester,
    ) async {
      final h = await pumpChurch(tester);
      expect(find.text('앉기'), findsNothing);
      h.scene.emit(const SceneNear(seat: 'L03-2'));
      await _anim(tester);
      expect(find.text('앉기'), findsOneWidget);
      expect(find.text('초 켜기'), findsNothing);
      await tester.tap(find.text('앉기'));
      await tester.pump();
      expect(h.net.sits, ['L03-2']);
      expect(h.scene.lastArgs('sit'), {'seat': 'L03-2'});

      h.scene.emit(const SceneNear());
      await _anim(tester);
    });

    testWidgets('앉기 disappears when moving away', (tester) async {
      final h = await pumpChurch(tester);
      h.scene.emit(const SceneNear(seat: 'R01-0'));
      await _anim(tester);
      expect(find.text('앉기'), findsOneWidget);
      h.scene.emit(const SceneNear());
      await _anim(tester);
      expect(find.text('앉기'), findsNothing);
    });

    testWidgets('SeatDenied shows a snackbar and tells the scene', (
      tester,
    ) async {
      final h = await pumpChurch(tester);
      h.net.goOnline(3);
      h.scene.emit(const SceneNear(seat: 'L03-2'));
      await _anim(tester);
      await tester.tap(find.text('앉기'));
      await tester.pump();
      h.net.emit(const SeatDenied('L03-2', 'taken'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('이미 누가 앉아 있어요'), findsOneWidget);
      expect(h.scene.lastArgs('setSeatTaken'), {'seat': 'L03-2'});
      expect(find.byKey(const ValueKey('prayer-card')), findsNothing);
    });
  });

  group('prayer card', () {
    testWidgets('appears after seated with today\'s mystery and timer', (
      tester,
    ) async {
      final h = await pumpChurch(tester);
      await _sit(tester, h);
      expect(find.text('지금 기도 중'), findsOneWidget);
      expect(find.byKey(const ValueKey('prayer-card')), findsOneWidget);
      expect(find.textContaining(_today.koreanName), findsWidgets);
      expect(find.text('00:00'), findsOneWidget);
      expect(h.scene.lastArgs('setPraying'), {'on': true, 'ms': _today.index});
      expect(h.net.prayings.last, (true, _today.index));
      // 앉은 동안 이동 영역은 사라지고(화면 전체가 카메라 영역) 상황 버튼도 없다.
      expect(find.byKey(const ValueKey('move-zone')), findsNothing);
      expect(find.byKey(const ValueKey('ctx-sit')), findsNothing);

      await tester.pump(const Duration(seconds: 5));
      expect(find.text('00:05'), findsOneWidget);
      // 정리: 타이머 정지.
      await tester.tap(find.text('일어나기'));
      await tester.pump();
    });

    testWidgets('이전/다음 move the session; 잠깐 쉬기 pauses the timer', (
      tester,
    ) async {
      final h = await pumpChurch(tester);
      await _sit(tester, h);
      String step() =>
          tester.widget<Text>(find.byKey(const ValueKey('prayer-step'))).data!;
      final first = step();
      await tester.tap(find.text('다음'));
      await tester.pump();
      final second = step();
      expect(second, isNot(first));
      await tester.tap(find.text('이전'));
      await tester.pump();
      expect(step(), first);

      await tester.pump(const Duration(seconds: 3));
      expect(find.text('00:03'), findsOneWidget);
      expect(find.text('잠깐 쉬기'), findsNothing); // ⋮ 안에 있다
      await _menu(tester, '잠깐 쉬기');
      expect(h.scene.lastArgs('setPraying'), {'on': false, 'ms': _today.index});
      expect(h.net.prayings.last, (false, _today.index));
      await tester.pump(const Duration(seconds: 10));
      expect(find.text('00:03'), findsOneWidget);
      await _menu(tester, '이어 기도');
      await tester.pump(const Duration(seconds: 2));
      expect(find.text('00:05'), findsOneWidget);
      expect(h.scene.lastArgs('setPraying'), {'on': true, 'ms': _today.index});
      await tester.tap(find.text('일어나기'));
      await tester.pump();
    });

    testWidgets('일어나기 saves progress and stands', (tester) async {
      final h = await pumpChurch(tester);
      await _sit(tester, h);
      await tester.tap(find.text('다음'));
      await tester.tap(find.text('다음'));
      await tester.pump();
      await tester.tap(find.text('일어나기'));
      await tester.pump();
      expect(h.settings.savedPrayer?.mysterySet, _today);
      expect(h.settings.savedPrayer?.stepIndex, 2);
      expect(h.scene.count('stand'), 1);
      expect(h.net.stands, 1);
      expect(find.byKey(const ValueKey('prayer-card')), findsNothing);
      expect(find.byKey(const ValueKey('move-zone')), findsOneWidget);
    });

    testWidgets('sitting again resumes the saved progress', (tester) async {
      final h = await pumpChurch(tester);
      await _sit(tester, h);
      await tester.tap(find.text('다음'));
      await tester.pump();
      await tester.tap(find.text('일어나기'));
      await tester.pump();
      h.scene.emit(const SceneNear(seat: 'L03-2'));
      await _anim(tester);
      await tester.tap(find.text('앉기'));
      await tester.pump();
      h.scene.emit(const SceneSeated('L03-2'));
      await tester.pump();
      expect(h.settings.savedPrayer?.stepIndex, 1);
      expect(find.text('이전'), findsOneWidget);
      expect(
        tester.widget<OutlinedButton>(find.byType(OutlinedButton)).onPressed,
        isNotNull,
      );
      await tester.tap(find.text('일어나기'));
      await tester.pump();
    });

    testWidgets('끝내기 clears progress and stands', (tester) async {
      final h = await pumpChurch(tester);
      await _sit(tester, h);
      await tester.tap(find.text('다음'));
      await tester.pump();
      expect(h.settings.savedPrayer, isNotNull);
      expect(find.text('끝내기'), findsNothing); // ⋮ 안에 있다
      await _menu(tester, '끝내기');
      await tester.pump(const Duration(milliseconds: 300));
      expect(h.settings.savedPrayer, isNull);
      expect(h.scene.count('stand'), 1);
      expect(find.text('기도를 마쳤습니다'), findsOneWidget); // SnackBar
      expect(find.byKey(const ValueKey('prayer-card')), findsNothing);
    });

    testWidgets('full screen prayer shares the same session', (tester) async {
      RosarySession? seen;
      final h = await pumpChurch(
        tester,
        prayerScreenBuilder: (context, mystery, session) {
          seen = session as RosarySession;
          return Scaffold(
            body: Center(
              child: TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('FULL-PRAYER'),
              ),
            ),
          );
        },
      );
      await _sit(tester, h);
      await tester.tap(find.text('다음'));
      await tester.pump();
      await _menu(tester, '전체 화면으로 기도');
      await tester.pumpAndSettle();
      expect(find.text('FULL-PRAYER'), findsOneWidget);
      expect(seen!.index, 1);
      await tester.tap(find.text('FULL-PRAYER'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('prayer-card')), findsOneWidget);
      await tester.tap(find.text('일어나기'));
      await tester.pump();
    });

    testWidgets('finishing the session shows the completion state', (
      tester,
    ) async {
      RosarySession? seen;
      final h = await pumpChurch(
        tester,
        prayerScreenBuilder: (context, mystery, session) {
          seen = session as RosarySession;
          return Scaffold(
            body: TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('BACK'),
            ),
          );
        },
      );
      await _sit(tester, h);
      await _menu(tester, '전체 화면으로 기도');
      await tester.pumpAndSettle();
      await tester.tap(find.text('BACK'));
      await tester.pumpAndSettle();
      seen!.jumpTo(seen!.steps.length - 1);
      await tester.pump();
      await tester.tap(find.text('다음'));
      await tester.pump();
      expect(find.text('기도를 마쳤습니다'), findsOneWidget);
      expect(find.byTooltip('더보기'), findsNothing); // 끝나면 ⋮ 도 없다
      expect(h.settings.savedPrayer, isNull);
      expect(h.scene.lastArgs('setPraying'), {'on': false, 'ms': _today.index});
      await tester.tap(find.text('일어나기'));
      await tester.pump();
      expect(find.byKey(const ValueKey('prayer-card')), findsNothing);
    });
  });

  group('candles', () {
    testWidgets('sheet lists 8 intentions and lights a candle', (tester) async {
      final h = await pumpChurch(tester);
      h.net.goOnline(2);
      h.scene.emit(const SceneNear(candle: 5));
      await _anim(tester);
      expect(find.text('앉기'), findsNothing);
      await tester.tap(find.text('초 켜기'));
      await tester.pumpAndSettle();
      for (final t in candleIntentions) {
        expect(find.text(t), findsOneWidget);
      }
      expect(candleIntentions, hasLength(8));
      await tester.tap(find.text(candleIntentions[2]));
      await tester.pump();
      await tester.tap(_sheetButton);
      await tester.pumpAndSettle();
      expect(h.net.candles, [(5, 2)]);
      final args = h.scene.lastArgs('lightCandle')!;
      expect(args['slot'], 5);
      expect(args['intention'], 2);
      expect(args['until'], 0); // 만료 없음
    });

    testWidgets('offline lights the candle locally', (tester) async {
      final h = await pumpChurch(tester);
      h.scene.emit(const SceneNear(candle: 1));
      await _anim(tester);
      await tester.tap(find.text('초 켜기'));
      await tester.pumpAndSettle();
      await tester.tap(_sheetButton);
      await tester.pumpAndSettle();
      expect(h.scene.count('lightCandle'), 1);
    });
  });

  group('net wiring', () {
    testWidgets('welcome and peer events map to scene calls', (tester) async {
      final h = await pumpChurch(tester);
      h.net.goOnline(2);
      const peer = PeerInfo(id: 'p1', avatar: AvatarConfig.defaultConfig);
      h.net.emit(
        Welcome(
          you: 'me',
          room: 'basic-1',
          n: 2,
          peers: const [peer],
          seats: const {'L00-0': 'p1'},
          candles: const [CandleInfo(slot: 3, until: 99, intention: 1)],
          now: 1,
        ),
      );
      await tester.pump();
      final peers = h.scene.lastArgs('setPeers')!;
      expect((peers['peers'] as List), hasLength(1));
      expect(peers['seats'], {'L00-0': 'p1'});
      expect(h.scene.lastArgs('setCandles'), {
        'candles': [
          {'slot': 3, 'until': 99, 'intention': 1},
        ],
      });

      h.net.emit(const Join(peer, 3));
      h.net.emit(const Join(peer, 3)); // 범위에 다시 들어온 피어(이미 아는 id)
      h.net.emit(const Leave('p1', 2));
      h.net.emit(const Leave('p2', 2, aoi: true));
      h.net.emit(const Seated('p1', 'L00-1'));
      h.net.emit(const Stood('p1'));
      h.net.emit(const Praying('p1', true, 2));
      h.net.emit(const Emote('p1', 0));
      h.net.emit(const Snap(2, [SnapEntry('p1', 1, 2, 0, 'w')]));
      h.net.emit(const Candle(4, 100, 5));
      await tester.pump();
      expect(h.scene.count('peerJoin'), 2);
      for (final m in [
        'peerLeave',
        'peerSeat',
        'peerStand',
        'peerPraying',
        'peerEmote',
        'peerSnap',
        'lightCandle',
      ]) {
        expect(h.scene.count(m), m == 'peerLeave' ? 2 : 1, reason: m);
      }
      expect(h.scene.argsOf('peerLeave').last, {'id': 'p2', 'aoi': true});
      // 내 자신의 이벤트는 장면에 다시 보내지 않는다.
      h.net.emit(const Seated('me', 'L00-1'));
      h.net.emit(const Emote('me', 1));
      await tester.pump();
      expect(h.scene.count('peerSeat'), 1);
      expect(h.scene.count('peerEmote'), 1);
      expect(h.scene.lastArgs('emote'), {'e': 1});
    });
  });

  group('lifecycle', () {
    testWidgets('leaving stands, disconnects and disposes timers', (
      tester,
    ) async {
      final h = await pumpChurch(tester);
      await _sit(tester, h);
      await tester.tap(find.text('다음'));
      await tester.pump();
      await tester.pumpWidget(const SizedBox());
      expect(h.net.stands, 1);
      expect(h.net.disconnects, 1);
      expect(h.scene.count('stand'), 1);
      expect(h.settings.savedPrayer?.stepIndex, 1);
      // 남아 있는 타이머가 없어야 한 번 더 pump해도 예외가 없다.
      await tester.pump(const Duration(seconds: 3));
    });

    testWidgets('backgrounding pauses ambient audio and pos', (tester) async {
      final h = await pumpChurch(tester);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump();
      expect(h.scene.lastArgs('setAmbient'), {'on': false});
      h.scene.emit(const ScenePos(1, 1, 0, true));
      await tester.pump();
      expect(h.net.positions, isEmpty);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      expect(h.scene.lastArgs('setAmbient'), {'on': true});
    });

    testWidgets('load error shows a retry state', (tester) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings();
      final scene = FakeChurchSceneController();
      await tester.pumpWidget(
        wrapApp(
          ChurchScreen(settings: settings, net: FakeChurchNet(), scene: scene),
        ),
      );
      await tester.pump();
      scene.failLoad();
      await tester.pump();
      expect(find.text('성당을 불러오지 못했어요'), findsOneWidget);
      await tester.tap(find.text('다시 시도'));
      await tester.pump();
      expect(scene.reloads, 1);
    });

    testWidgets('first visit goes straight in with a random baptismal name', (
      tester,
    ) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings(avatarChosen: false);
      final net = FakeChurchNet();
      final scene = FakeChurchSceneController();
      var editorOpened = false;
      await tester.pumpWidget(
        wrapApp(
          ChurchScreen(
            settings: settings,
            net: net,
            scene: scene,
            random: Random(7),
            avatarEditorBuilder: (context) {
              editorOpened = true;
              return const Scaffold(body: Text('EDITOR'));
            },
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      // 편집기는 강제로 열리지 않고 곧바로 접속한다.
      expect(editorOpened, isFalse);
      expect(find.text('EDITOR'), findsNothing);
      expect(net.connectedIds, ['basic']);
      // 기본 아바타 + 무작위 세례명이 저장된다.
      final expectedName = Random(7).nextInt(baptismalNames.length);
      expect(settings.churchAvatar.name, expectedName);
      expect(
        settings.churchAvatar.copyWith(name: 0),
        AvatarConfig.defaultConfig,
      );
      expect(settings.churchAvatarChosen, isTrue);
      expect(find.textContaining(baptismalNames[expectedName]), findsOneWidget);
      scene.emit(const SceneReady());
      await tester.pump();
      expect(scene.lastArgs('init')!['avatar'], settings.churchAvatar.toJson());
    });

    testWidgets('a returning visit keeps the saved avatar', (tester) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings();
      settings.churchAvatar = const AvatarConfig(name: 9, hair: 2);
      await tester.pumpWidget(
        wrapApp(
          ChurchScreen(
            settings: settings,
            net: FakeChurchNet(),
            scene: FakeChurchSceneController(),
            random: Random(1),
          ),
        ),
      );
      await tester.pump();
      expect(settings.churchAvatar, const AvatarConfig(name: 9, hair: 2));
      expect(find.textContaining('세례명은'), findsNothing);
    });
  });

  group('no overflow at 360x640, text scale 1.5', () {
    testWidgets('HUD with the context button, online', (tester) async {
      final h = await pumpChurch(
        tester,
        size: const Size(360, 640),
        textScale: 1.5,
      );
      h.net.goOnline(28);
      h.scene.emit(const SceneNear(seat: 'L03-2', candle: 5));
      await _anim(tester);
      expect(find.text('앉기'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('prayer card', (tester) async {
      final h = await pumpChurch(
        tester,
        size: const Size(360, 640),
        textScale: 1.5,
      );
      h.settings.prayerTextScale = 1.5;
      await _sit(tester, h);
      expect(find.byKey(const ValueKey('prayer-card')), findsOneWidget);
      expect(tester.takeException(), isNull);
      await _menu(tester, '잠깐 쉬기');
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('일어나기'));
      await tester.pump();
    });

    testWidgets('prayer card keeps full text, scrolls, at text scale 2.0', (
      tester,
    ) async {
      final h = await pumpChurch(
        tester,
        size: const Size(360, 640),
        textScale: 2.0,
      );
      h.settings.prayerTextScale = 2.0;
      await _sit(tester, h);
      // 가장 긴 기도문 단계로 간다.
      for (var i = 0; i < 6; i++) {
        await tester.tap(find.byKey(const ValueKey('prayer-next')));
        await tester.pump();
      }
      expect(tester.takeException(), isNull);
      final text = find.byKey(const ValueKey('prayer-text'));
      expect(text, findsOneWidget);
      // 잘림(maxLines/ellipsis)이 없다.
      final w = tester.widget<Text>(text);
      expect(w.maxLines, isNull);
      expect(w.overflow, isNot(TextOverflow.ellipsis));
      // 카드는 화면 높이의 62% 안에 있고, 주 버튼과 일어나기가 화면 안에 보인다.
      final card = tester.getRect(find.byKey(const ValueKey('prayer-card')));
      expect(card.height, lessThanOrEqualTo(640 * 0.62 + 0.5));
      expect(card.bottom, lessThanOrEqualTo(640));
      for (final k in ['prayer-next', 'prayer-stand']) {
        final r = tester.getRect(find.byKey(ValueKey(k)));
        expect(card.contains(r.center), isTrue, reason: k);
        expect(r.height, greaterThanOrEqualTo(48), reason: k);
      }
      // 기도문 영역은 스크롤 가능하다(끝까지 내려 마지막 글자가 보인다).
      final scroll = find.byKey(const ValueKey('prayer-text-scroll'));
      final pos = tester.state<ScrollableState>(
        find.descendant(of: scroll, matching: find.byType(Scrollable)),
      );
      await tester.drag(scroll, const Offset(0, -2000));
      await tester.pump();
      expect(pos.position.pixels, pos.position.maxScrollExtent);
      expect(tester.takeException(), isNull);
      await tester.tap(find.byKey(const ValueKey('prayer-stand')));
      await tester.pump();
    });

    testWidgets('every prayer step fits at 360x640 text scale 2.0', (
      tester,
    ) async {
      final h = await pumpChurch(
        tester,
        size: const Size(360, 640),
        textScale: 2.0,
      );
      h.settings.prayerTextScale = 2.0;
      await _sit(tester, h);
      var longSteps = 0;
      for (var i = 0; i < 80; i++) {
        if (find.byKey(const ValueKey('prayer-next')).evaluate().isEmpty) break;
        await tester.tap(find.byKey(const ValueKey('prayer-next')));
        await tester.pump();
        expect(tester.takeException(), isNull, reason: 'step $i');
        final card = tester.getRect(find.byKey(const ValueKey('prayer-card')));
        expect(card.height, lessThanOrEqualTo(640 * 0.62 + 0.5));
        final scrolls = find.descendant(
          of: find.byKey(const ValueKey('prayer-text-scroll')),
          matching: find.byType(Scrollable),
        );
        if (scrolls.evaluate().isNotEmpty &&
            tester.state<ScrollableState>(scrolls).position.maxScrollExtent >
                0) {
          longSteps++;
        }
      }
      // 큰 글자에서는 실제로 스크롤이 필요한 단계가 있고, 그래도 넘치지 않는다.
      expect(longSteps, greaterThan(0));
      await tester.tap(find.byKey(const ValueKey('prayer-stand')));
      await tester.pump();
    });

    testWidgets('candle sheet', (tester) async {
      final h = await pumpChurch(
        tester,
        size: const Size(360, 640),
        textScale: 1.5,
      );
      h.scene.emit(const SceneNear(candle: 0));
      await _anim(tester);
      await tester.tap(find.text('초 켜기'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(_sheetButton, findsOneWidget);
    });
  });

  test('ChurchApi script is safely encoded', () {
    final s = churchApiScript('setAmbient', {'on': true, 'q': "a'\"\u2028b"});
    expect(s, contains('window.ChurchAPI.setAmbient({'));
    expect(s.contains('\u2028'), isFalse);
    expect(s, contains(r'\"'));
  });

  test('SceneEvent.parse', () {
    expect(SceneEvent.parse('{"e":"ready"}'), isA<SceneReady>());
    expect(
      SceneEvent.parse('{"e":"near","seat":"L03-2","candle":null}'),
      const SceneNear(seat: 'L03-2'),
    );
    expect(
      SceneEvent.parse('{"e":"near","seat":null,"candle":5}'),
      const SceneNear(candle: 5),
    );
    expect(
      SceneEvent.parse('{"e":"seated","seat":"R00-1"}'),
      isA<SceneSeated>(),
    );
    expect(SceneEvent.parse('{"e":"stood"}'), isA<SceneStood>());
    final pos =
        SceneEvent.parse('{"e":"pos","x":1,"z":2.5,"r":0.5,"m":1}') as ScenePos;
    expect([pos.x, pos.z, pos.r, pos.moving], [1.0, 2.5, 0.5, true]);
    expect((SceneEvent.parse('{"e":"perf","fps":58}') as ScenePerf).fps, 58);
    final perf = SceneEvent.parse(
      '{"e":"perf","fps":12,"tier":"low","sat":1,"a":1}',
    ) as ScenePerf;
    expect(
      [perf.fps, perf.tier, perf.seated, perf.auto],
      [12, 'low', true, true],
    );
    final plain = SceneEvent.parse('{"e":"perf","fps":30}') as ScenePerf;
    expect([plain.tier, plain.seated, plain.auto], [null, false, false]);
    expect(SceneEvent.parse('not json'), isNull);
    expect(SceneEvent.parse('{"e":"x"}'), isNull);
  });

  test('fake scene queues calls until init', () async {
    final scene = FakeChurchSceneController();
    await scene.sit(seat: 'L00-0');
    expect(scene.calls, isEmpty);
    await scene.init(
      avatar: const {},
      hour: 12,
      ambient: true,
      solo: true,
      quality: 'low',
    );
    expect(scene.calls.map((c) => c.$1), ['init', 'sit']);
  });
}
