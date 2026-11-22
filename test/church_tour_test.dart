import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/guide_voice.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';

import 'church_screen_fakes.dart';
import 'guide_fakes.dart';

Finder get _text => find.byKey(const ValueKey('tour-text'));
Finder get _title => find.byKey(const ValueKey('tour-title'));
Finder get _count => find.byKey(const ValueKey('tour-count'));
Finder get _next => find.byKey(const ValueKey('tour-next'));
Finder get _quit => find.byKey(const ValueKey('tour-quit'));

String _t(WidgetTester tester, Finder f) =>
    tester.widget<Text>(f).data!.replaceAll('\u2060', '');

/// 성당 안내가 켜진 채 성당을 띄운다(안내는 장면 첫 프레임 뒤에 시작한다).
Future<ChurchHarness> _pump(
  WidgetTester tester, {
  Size size = const Size(400, 800),
  bool hudCollapsed = false,
}) async {
  final h = await pumpChurch(
    tester,
    size: size,
    churchTourDone: false,
    hudCollapsed: hudCollapsed,
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 50));
  return h;
}

/// '잘하셨어요!' 문구가 떠 있다가 다음 단계로 넘어가는 시간을 흘린다.
Future<void> _passPraise(WidgetTester tester) async {
  await tester.pump(const Duration(milliseconds: 100));
  await tester.pump(const Duration(milliseconds: 1600));
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  late RecordingGuideEngine voice;
  setUp(() {
    voice = RecordingGuideEngine();
    GuideVoice.engine = voice;
  });
  tearDown(() => GuideVoice.engine = SilentGuideEngine());

  group('성당 첫 입장 안내', () {
    testWidgets('이미 마쳤으면 나오지 않는다', (tester) async {
      await pumpChurch(tester);
      expect(find.byKey(const ValueKey('church-tour')), findsNothing);
    });

    testWidgets('첫 입장: 1/5 걷기 단계와 큰 글 56dp 단추', (tester) async {
      await _pump(tester);
      expect(find.byKey(const ValueKey('church-tour')), findsOneWidget);
      expect(_t(tester, _count), '1 / 5');
      expect(_t(tester, _title), '걷기');
      expect(
        _t(tester, _text),
        '왼쪽 아래 동그라미를 손가락으로 위로 밀면 앞으로 걸어가요. 한번 해 보세요.',
      );
      expect(
        tester.widget<Text>(_text).style!.fontSize,
        greaterThanOrEqualTo(20),
      );
      expect(
        tester.widget<Text>(_title).style!.fontSize,
        inInclusiveRange(22, 24),
      );
      expect(tester.getSize(_next).height, greaterThanOrEqualTo(56));
      expect(tester.getSize(_quit).height, greaterThanOrEqualTo(56));
      expect(find.byKey(const ValueKey('tour-hand')), findsOneWidget);
      // 가르치는 손잡이(왼쪽 아래)와 카드(위쪽)는 겹치지 않는다.
      final card = tester.getRect(find.byKey(const ValueKey('tour-card')));
      final ring = tester.getRect(find.byKey(const ValueKey('joystick-ring')));
      expect(card.overlaps(ring), isFalse);
      expect(card.top, greaterThanOrEqualTo(0));
      expect(card.bottom, lessThanOrEqualTo(800));
      // 처음 한 번 뜨는 가기 말풍선은 안내와 함께 뜨지 않는다.
      expect(find.byKey(const ValueKey('walk-hint')), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('걷기: 손잡이를 밀고 1.5초 잡으면 해낸 것, 잘하셨어요 다음 둘러보기', (tester) async {
      final h = await _pump(tester);
      final c = tester.getCenter(find.byKey(const ValueKey('joystick-ring')));
      final g = await tester.startGesture(c);
      await g.moveBy(const Offset(0, -45)); // 안내가 손잡이를 막지 않는다
      await tester.pump(const Duration(milliseconds: 600));
      expect(_t(tester, _title), '걷기');
      expect(h.scene.argsOf('setJoystick'), isNotEmpty);
      await tester.pump(const Duration(milliseconds: 1000));
      expect(_t(tester, _title), '잘하셨어요!');
      await g.up();
      await _passPraise(tester);
      expect(_t(tester, _count), '2 / 5');
      expect(_t(tester, _title), '둘러보기');
    });

    testWidgets('걷기: 손잡이를 금방 놓으면 해내지 못한 것', (tester) async {
      await _pump(tester);
      final c = tester.getCenter(find.byKey(const ValueKey('joystick-ring')));
      final g = await tester.startGesture(c);
      await g.moveBy(const Offset(0, -45));
      await tester.pump(const Duration(milliseconds: 500));
      await g.up();
      await tester.pump(const Duration(milliseconds: 2000));
      expect(_t(tester, _title), '걷기');
    });

    testWidgets('걷기: 장면에서 위치가 충분히 바뀌어도 해낸 것', (tester) async {
      final h = await _pump(tester);
      h.scene.emit(const ScenePos(0, 0, 0, true));
      h.scene.emit(const ScenePos(0, 1.2, 0, true));
      await tester.pump();
      expect(_t(tester, _title), '걷기');
      h.scene.emit(const ScenePos(0, 2.6, 0, true));
      await tester.pump();
      expect(_t(tester, _title), '잘하셨어요!');
      await _passPraise(tester);
      expect(_t(tester, _title), '둘러보기');
    });

    testWidgets('둘러보기: 오른쪽 화면을 옆으로 두 번 밀면 해낸 것', (tester) async {
      final h = await _pump(tester);
      await tester.tap(_next); // 걷기 건너뛰기
      await tester.pump();
      expect(_t(tester, _title), '둘러보기');
      expect(find.byKey(const ValueKey('tour-hand')), findsOneWidget);
      // 짧은 끌기(손가락 흔들림)는 세지 않는다.
      var g = await tester.startGesture(const Offset(300, 250));
      await g.moveBy(const Offset(10, 0));
      await g.up();
      await tester.pump();
      expect(_t(tester, _title), '둘러보기');
      // 한 번 제대로 끌기(약 20도)
      g = await tester.startGesture(const Offset(260, 250));
      await g.moveBy(const Offset(80, 0));
      await tester.pump();
      await g.up();
      await tester.pump();
      expect(_t(tester, _title), '둘러보기');
      expect(
        h.scene.argsOf('setInput'),
        isNotEmpty,
        reason: '안내가 시점 돌리기를 막지 않는다',
      );
      // 두 번째 끌기
      g = await tester.startGesture(const Offset(260, 280));
      await g.moveBy(const Offset(60, 0));
      await tester.pump();
      await g.up();
      await tester.pump();
      expect(_t(tester, _title), '잘하셨어요!');
      await _passPraise(tester);
      expect(_t(tester, _title), '가기');
    });

    testWidgets('둘러보기: 한 번에 60도 넘게 돌려도 해낸 것', (tester) async {
      await _pump(tester);
      await tester.tap(_next);
      await tester.pump();
      final g = await tester.startGesture(const Offset(150, 250));
      for (var i = 0; i < 7; i++) {
        await g.moveBy(const Offset(40, 0));
        await tester.pump(const Duration(milliseconds: 16));
      }
      expect(_t(tester, _title), '잘하셨어요!');
      await g.up();
    });

    testWidgets('가기: 시트가 열리면 해낸 것, 닫아도 안내는 이어진다', (tester) async {
      await _pump(tester, hudCollapsed: true); // 접힌 메뉴는 안내가 펴서 보인다
      await tester.tap(_next);
      await tester.pump();
      await tester.tap(_next);
      await tester.pump();
      expect(_t(tester, _title), '가기');
      expect(find.byKey(const ValueKey('go-button')), findsOneWidget);
      // 카드는 아래, 가르치는 가기 단추는 위쪽이라 겹치지 않는다.
      final card = tester.getRect(find.byKey(const ValueKey('tour-card')));
      final go = tester.getRect(find.byKey(const ValueKey('go-button')));
      expect(card.overlaps(go), isFalse);
      await tester.tap(find.byKey(const ValueKey('go-button')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.text('어디로 갈까요?'), findsOneWidget);
      // 시트를 그냥 닫는다.
      await tester.tapAt(const Offset(5, 300));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      await _passPraise(tester);
      expect(_t(tester, _count), '4 / 5');
      expect(_t(tester, _title), '할 수 있는 일');
      expect(tester.takeException(), isNull);
    });

    testWidgets('가기: 시트에서 곳을 골라도 안내가 깨지지 않는다', (tester) async {
      final h = await _pump(tester);
      await tester.tap(_next);
      await tester.pump();
      await tester.tap(_next);
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('go-button')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      await tester.tap(find.byKey(const ValueKey('go-candle')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(h.scene.walkKinds, isNotEmpty);
      await _passPraise(tester);
      expect(_t(tester, _title), '할 수 있는 일');
    });

    testWidgets('상황 단추 설명 단계에서 다음, 메뉴, 시작해요로 마치면 다시 안 나온다', (tester) async {
      final h = await _pump(tester, hudCollapsed: true);
      for (var i = 0; i < 3; i++) {
        await tester.tap(_next);
        await tester.pump();
      }
      expect(_t(tester, _count), '4 / 5');
      expect(
        _t(tester, _text),
        '제대 앞이나 자리, 촛불대 가까이 가면 오른쪽 아래에 할 수 있는 단추가 나타나요. 자리에 앉은 뒤에는 묵주기도 시작을 고를 수 있어요.',
      );
      // 단추가 없는 자리여도 나타날 자리를 보인다.
      expect(find.byKey(const ValueKey('tour-hand')), findsOneWidget);
      // 단추가 있으면 그것을 비춘다(앉기).
      h.scene.emit(const SceneNear(seat: 'a1'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byKey(const ValueKey('ctx-sit')), findsOneWidget);
      await tester.tap(_next);
      await tester.pump();
      expect(_t(tester, _count), '5 / 5');
      expect(_t(tester, _text), '메뉴에서 성당 바꾸기, 사용법 다시 보기를 할 수 있어요.');
      expect(find.text('시작해요'), findsOneWidget);
      expect(find.byKey(const ValueKey('hud-help')), findsOneWidget);
      expect(h.settings.churchTourDone, isFalse);
      await tester.tap(_next);
      await tester.pump();
      expect(find.byKey(const ValueKey('church-tour')), findsNothing);
      expect(h.settings.churchTourDone, isTrue);
    });

    testWidgets('그만 보기: 끝나고 다시 나오지 않는다', (tester) async {
      final h = await _pump(tester);
      await tester.tap(_quit);
      await tester.pump();
      expect(find.byKey(const ValueKey('church-tour')), findsNothing);
      expect(h.settings.churchTourDone, isTrue);
    });

    testWidgets('도중에 성당을 나가면 완료로 치지 않는다', (tester) async {
      final h = await _pump(tester);
      await tester.tap(_next);
      await tester.pump();
      expect(_t(tester, _count), '2 / 5');
      await tester.pumpWidget(const SizedBox());
      await tester.pump();
      expect(h.settings.churchTourDone, isFalse);
    });

    testWidgets('메뉴의 사용법 다시 보기: 마친 뒤에도 처음부터 다시 한다', (tester) async {
      final h = await pumpChurch(tester);
      expect(find.byKey(const ValueKey('church-tour')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('hud-help')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.byKey(const ValueKey('church-tour')), findsOneWidget);
      expect(_t(tester, _count), '1 / 5');
      expect(h.settings.churchTourDone, isFalse);
    });

    testWidgets('다른 탭에서 안내를 다시 켜면 성당에서 시작한다', (tester) async {
      final h = await pumpChurch(tester);
      expect(find.byKey(const ValueKey('church-tour')), findsNothing);
      h.settings.churchTourDone = false; // 더보기에서 성당 안내를 고른 것
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.byKey(const ValueKey('church-tour')), findsOneWidget);
    });

    testWidgets('앉으면 안내 카드는 숨고 일어서면 같은 단계로 돌아온다', (tester) async {
      final h = await _pump(tester);
      await tester.tap(_next);
      await tester.pump();
      h.scene.emit(const SceneSeated('a1'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byKey(const ValueKey('church-tour')), findsNothing);
      h.scene.emit(const SceneStood());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(_t(tester, _count), '2 / 5');
    });

    testWidgets('좁은 화면 360x640 큰 글씨 2.0: 넘치지 않고 카드가 화면 안에 있다', (tester) async {
      final h = await pumpChurch(
        tester,
        size: const Size(360, 640),
        textScale: 2.0,
        churchTourDone: false,
      );
      await tester.pump(const Duration(milliseconds: 100));
      for (var i = 0; i < 5; i++) {
        expect(find.byKey(const ValueKey('tour-card')), findsOneWidget);
        final card = tester.getRect(find.byKey(const ValueKey('tour-card')));
        expect(card.top, greaterThanOrEqualTo(0), reason: 'step $i');
        expect(card.bottom, lessThanOrEqualTo(640), reason: 'step $i');
        expect(card.left, greaterThanOrEqualTo(0));
        expect(card.right, lessThanOrEqualTo(360));
        expect(tester.takeException(), isNull, reason: 'step $i');
        await tester.tap(_next);
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(h.settings.churchTourDone, isTrue);
    });

    testWidgets('동작 줄이기: 손가락 그림이 움직이지 않는다', (tester) async {
      setView(tester, const Size(400, 800));
      final settings = await loadSettings(churchTourDone: false);
      final scene = FakeChurchSceneController();
      await tester.pumpWidget(
        MaterialApp(
          builder: (context, c) => MediaQuery(
            data: MediaQuery.of(context).copyWith(disableAnimations: true),
            child: c!,
          ),
          home: ChurchScreen(
            settings: settings,
            net: FakeChurchNet(),
            scene: scene,
          ),
        ),
      );
      await tester.pump();
      scene.emit(const SceneReady());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.byKey(const ValueKey('tour-hand')), findsOneWidget);
      final a = tester.getTopLeft(find.byKey(const ValueKey('tour-hand')));
      await tester.pump(const Duration(milliseconds: 700));
      expect(tester.getTopLeft(find.byKey(const ValueKey('tour-hand'))), a);
    });
  });

  group('안내 읽어 주기', () {
    testWidgets('단계마다 그 글을 읽고 단계가 바뀌면 새 글을 읽는다', (tester) async {
      await _pump(tester);
      await tester.pump();
      expect(voice.spoken, hasLength(1));
      expect(voice.spoken.last, contains('앞으로 걸어가요'));
      await tester.tap(_next);
      await tester.pump();
      expect(voice.spoken, hasLength(2));
      expect(voice.spoken.last, contains('둘레를 둘러봐요'));
    });

    testWidgets('스피커를 끄면 읽기를 멈추고 켜면 지금 글을 읽는다', (tester) async {
      final h = await _pump(tester);
      await tester.pump();
      final stopsBefore = voice.stops;
      await tester.tap(find.byKey(const ValueKey('tour-tts')));
      await tester.pump();
      expect(h.settings.guideTtsOn, isFalse);
      expect(voice.stops, greaterThan(stopsBefore));
      final n = voice.spoken.length;
      await tester.tap(_next);
      await tester.pump();
      expect(voice.spoken.length, n, reason: '꺼져 있으면 읽지 않는다');
      await tester.tap(find.byKey(const ValueKey('tour-tts')));
      await tester.pump();
      expect(h.settings.guideTtsOn, isTrue);
      expect(voice.spoken.length, n + 1);
      expect(voice.spoken.last, contains('둘레를 둘러봐요'));
    });

    testWidgets('안내가 끝나면 읽기를 멈춘다', (tester) async {
      await _pump(tester);
      await tester.pump();
      final stops = voice.stops;
      await tester.tap(_quit);
      await tester.pump();
      expect(voice.stops, greaterThan(stops));
      expect(GuideVoice.current, isNull);
    });
  });
}
