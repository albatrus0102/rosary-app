import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/church/church_go_sheet.dart';
import 'package:rosary_app/church/church_hud.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';

/// 시트 열림/닫힘 애니메이션을 끝까지 돌린다(타이머가 남지 않게 6초 안내 타이머도 지나게 하지는 않는다).
Future<void> _settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 20));
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pump();
}

Finder get _goButton => find.byKey(const ValueKey('go-button'));

void main() {
  group('가기 sheet', () {
    testWidgets('360x640 at text scale 2.0: no overflow, rows are >= 56dp', (
      tester,
    ) async {
      final h = await pumpChurch(
        tester,
        size: const Size(360, 640),
        textScale: 2.0,
      );
      expect(_goButton, findsOneWidget);
      await tester.tap(_goButton);
      await _settle(tester);
      expect(find.text('어디로 갈까요?'), findsOneWidget);
      for (final key in ['candle', 'altar', 'seat', 'entrance']) {
        final r = tester.getRect(find.byKey(ValueKey('go-$key')));
        expect(r.height, greaterThanOrEqualTo(56), reason: key);
      }
      expect(find.text('촛불 봉헌대'), findsOneWidget);
      expect(find.text('제대 앞'), findsOneWidget);
      expect(find.text('가까운 빈 자리'), findsOneWidget);
      expect(find.text('입구'), findsOneWidget);
      expect(find.text('성수대'), findsNothing, reason: '성수대는 있는 성당에서만');
      expect(tester.takeException(), isNull);
      expect(h.scene.walkKinds, isEmpty, reason: '고르기 전에는 걷지 않는다');
    });

    testWidgets('a church with a font gets the 성수대 row', (tester) async {
      final h = await pumpChurch(tester, size: const Size(360, 640));
      h.scene.emit(const SceneStations(candle: 1, altar: 1, font: 1));
      await tester.pump();
      await tester.tap(_goButton);
      await _settle(tester);
      expect(find.text('성수대'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('go-font')));
      await _settle(tester);
      expect(h.scene.walkKinds, ['font']);
    });

    testWidgets('choosing a row closes the sheet and starts the walk', (
      tester,
    ) async {
      final h = await pumpChurch(tester, size: const Size(360, 640));
      await tester.tap(_goButton);
      await _settle(tester);
      await tester.tap(find.byKey(const ValueKey('go-altar')));
      await _settle(tester);
      expect(find.text('어디로 갈까요?'), findsNothing);
      expect(h.scene.walkKinds, ['altar']);
      // 걷기 전에 스틱 입력을 0으로 되돌린다.
      expect(h.scene.lastArgs('setJoystick'), {'x': 0.0, 'y': 0.0});
      for (final (key, kind) in [
        ('go-candle', 'candle'),
        ('go-seat', 'seat'),
        ('go-entrance', 'entrance'),
      ]) {
        await tester.tap(_goButton);
        await _settle(tester);
        await tester.tap(find.byKey(ValueKey(key)));
        await _settle(tester);
        expect(h.scene.walkKinds.last, kind);
      }
    });

    testWidgets('dismissing the sheet does not walk', (tester) async {
      final h = await pumpChurch(tester, size: const Size(360, 640));
      await tester.tap(_goButton);
      await _settle(tester);
      await tester.tapAt(const Offset(180, 20)); // 배경
      await _settle(tester);
      expect(find.text('어디로 갈까요?'), findsNothing);
      expect(h.scene.walkKinds, isEmpty);
    });

    testWidgets('no 가기 button while seated', (tester) async {
      final h = await pumpChurch(tester, size: const Size(400, 800));
      h.scene.emit(const SceneNear(seat: 'L03-2'));
      await _settle(tester);
      await tester.tap(find.text('앉기'));
      await tester.pump();
      h.scene.emit(const SceneSeated('L03-2'));
      await _settle(tester);
      expect(_goButton, findsNothing);
    });
  });

  group('walking', () {
    testWidgets('chip shows while walking, cancel stops it', (tester) async {
      final h = await pumpChurch(tester, size: const Size(360, 640));
      expect(find.byKey(const ValueKey('walk-chip')), findsNothing);
      h.scene.emit(const SceneWalkStart('candle'));
      await tester.pump();
      expect(find.text('걷는 중… (취소)'), findsOneWidget);
      final r = tester.getRect(find.byKey(const ValueKey('walk-chip')));
      expect(r.height, greaterThanOrEqualTo(48));
      await tester.tap(find.text('걷는 중… (취소)'));
      await tester.pump();
      expect(h.scene.count('cancelWalk'), 1);
      expect(find.byKey(const ValueKey('walk-chip')), findsNothing);
    });

    testWidgets('chip disappears on done / cancel from the scene', (
      tester,
    ) async {
      final h = await pumpChurch(tester);
      h.scene.emit(const SceneWalkStart('altar'));
      await tester.pump();
      expect(find.byKey(const ValueKey('walk-chip')), findsOneWidget);
      h.scene.emit(const SceneWalkDone('altar'));
      await _settle(tester);
      expect(find.byKey(const ValueKey('walk-chip')), findsNothing);
      h.scene.emit(const SceneWalkStart('seat'));
      await _settle(tester);
      expect(find.byKey(const ValueKey('walk-chip')), findsOneWidget);
      h.scene.emit(const SceneWalkCancel('seat'));
      await _settle(tester);
      expect(find.byKey(const ValueKey('walk-chip')), findsNothing);
    });

    testWidgets('walkFail shows a snackbar and clears the chip', (
      tester,
    ) async {
      final h = await pumpChurch(tester);
      h.scene.emit(const SceneWalkStart('candle'));
      await _settle(tester);
      h.scene.emit(const SceneWalkFail('candle'));
      await _settle(tester);
      expect(find.text('그곳으로 가는 길을 찾지 못했어요'), findsOneWidget);
      expect(find.byKey(const ValueKey('walk-chip')), findsNothing);
    });

    testWidgets(
      'touching the move zone cancels a walk; a tap goes to the web',
      (tester) async {
        final h = await pumpChurch(tester, size: const Size(360, 640));
        h.scene.emit(const SceneWalkStart('candle'));
        await tester.pump();
        await tester.tapAt(const Offset(100, 400)); // 왼쪽 절반 짧은 탭
        await tester.pump();
        expect(h.scene.count('cancelWalk'), 1, reason: '닿는 순간 걷기가 멈춘다');
        expect(find.byKey(const ValueKey('walk-chip')), findsNothing);
        expect(h.scene.lastArgs('tapAt'), {'x': 100.0, 'y': 400.0});
        // 끌면(조이스틱) 탭이 아니다.
        final g = await tester.startGesture(const Offset(100, 300));
        await g.moveBy(const Offset(0, -60));
        await g.up();
        await tester.pump();
        expect(h.scene.count('tapAt'), 1);
      },
    );
  });

  group('actions only happen at the place', () {
    testWidgets('walkDone candle opens the intention sheet once, 나중에 closes', (
      tester,
    ) async {
      final h = await pumpChurch(tester, size: const Size(360, 640));
      h.scene.emit(const SceneWalkStart('candle'));
      h.scene.emit(const SceneNear(candle: 87));
      h.scene.emit(const SceneWalkDone('candle'));
      await _settle(tester);
      expect(find.text('누구를 위해 초를 켤까요?'), findsOneWidget);
      expect(find.byKey(const ValueKey('candle-later')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('candle-later')));
      await _settle(tester);
      expect(find.text('누구를 위해 초를 켤까요?'), findsNothing);
      expect(h.net.candles, isEmpty, reason: '나중에 = 켜지 않음');
      expect(h.scene.count('lightCandle'), 0);
      // 닫은 뒤에도 그 자리에서는 초 켜기 버튼이 있다.
      expect(find.byKey(const ValueKey('ctx-light')), findsOneWidget);
      // 다시 열리지 않는다.
      await _settle(tester);
      expect(find.text('누구를 위해 초를 켤까요?'), findsNothing);
    });

    testWidgets('lighting from the auto-opened sheet works as usual', (
      tester,
    ) async {
      final h = await pumpChurch(tester, size: const Size(360, 640));
      h.scene.emit(const SceneNear(candle: 5));
      h.scene.emit(const SceneWalkDone('candle'));
      await _settle(tester);
      await tester.tap(find.byKey(const ValueKey('intention-3')));
      await tester.pump();
      await tester.tap(
        find.descendant(
          of: find.byType(BottomSheet),
          matching: find.widgetWithText(FilledButton, '초 켜기'),
        ),
      );
      await _settle(tester);
      expect(h.net.candles, [(5, 3)]);
      expect(h.scene.lastArgs('lightCandle'), {
        'slot': 5,
        'until': 0,
        'intention': 3,
      });
    });

    testWidgets('no sheet when the candle stand is not actually near', (
      tester,
    ) async {
      final h = await pumpChurch(tester, size: const Size(360, 640));
      h.scene.emit(const SceneWalkDone('candle'));
      await _settle(tester);
      expect(find.text('누구를 위해 초를 켤까요?'), findsNothing);
      expect(find.byKey(const ValueKey('ctx-light')), findsNothing);
    });

    testWidgets('walkDone altar / seat / entrance do not open the sheet', (
      tester,
    ) async {
      final h = await pumpChurch(tester, size: const Size(360, 640));
      h.scene.emit(const SceneNear(candle: 5));
      for (final k in ['altar', 'seat', 'entrance']) {
        h.scene.emit(SceneWalkDone(k));
        await _settle(tester);
        expect(find.text('누구를 위해 초를 켤까요?'), findsNothing, reason: k);
      }
    });

    testWidgets('altar: 기도하기 bows once, then sitting is offered', (
      tester,
    ) async {
      final h = await pumpChurch(tester, size: const Size(360, 640));
      expect(find.text('기도하기'), findsNothing, reason: '멀리서는 안 나온다');
      h.scene.emit(const SceneNear(station: 'altar'));
      h.scene.emit(const SceneWalkDone('altar'));
      await _settle(tester);
      expect(find.byKey(const ValueKey('ctx-pray')), findsOneWidget);
      expect(find.text('기도하기'), findsOneWidget);
      await tester.tap(find.text('기도하기'));
      await _settle(tester);
      expect(h.scene.lastArgs('emote'), {'e': 2}, reason: '고개 숙임(bow)');
      expect(h.net.emotes, [2]);
      expect(find.text('기도하기'), findsNothing);
      // 가까이 앉을 자리가 있으면 이제 '앉기'.
      h.scene.emit(const SceneNear(station: 'altar', seat: 'L00-0'));
      await _settle(tester);
      expect(find.text('앉기'), findsOneWidget);
      // 자리를 벗어났다가 돌아오면 다시 '기도하기'.
      h.scene.emit(const SceneNear());
      await _settle(tester);
      h.scene.emit(const SceneNear(station: 'altar'));
      await _settle(tester);
      expect(find.text('기도하기'), findsOneWidget);
    });

    testWidgets('font: 성호 긋기 plays the cross gesture', (tester) async {
      final h = await pumpChurch(tester, size: const Size(360, 640));
      h.scene.emit(const SceneNear(station: 'font'));
      await _settle(tester);
      expect(find.text('성호 긋기'), findsOneWidget);
      await tester.tap(find.text('성호 긋기'));
      await _settle(tester);
      expect(h.scene.lastArgs('emote'), {'e': 1});
      expect(find.text('성호 긋기'), findsNothing);
    });

    test(
      'a candle can only be lit through the context button / auto sheet',
      () {
        // 멀리서 초를 켜는 다른 길이 없음을 코드로 못 박는다.
        final files = Directory('lib/church')
            .listSync(recursive: true)
            .whereType<File>()
            .where((f) => f.path.endsWith('.dart'))
            .toList();
        final sheetCalls = <String>[];
        final netCalls = <String>[];
        for (final f in files) {
          final src = f.readAsStringSync();
          if (src.contains('showCandleSheet(') &&
              !f.path.endsWith('church_candle_sheet.dart')) {
            sheetCalls.add(f.path);
          }
          if (src.contains('_net.lightCandle(')) netCalls.add(f.path);
        }
        expect(sheetCalls, ['lib/church/church_screen.dart']);
        expect(netCalls, ['lib/church/church_screen.dart']);
        final screen = File('lib/church/church_screen.dart').readAsStringSync();
        expect('showCandleSheet('.allMatches(screen).length, 1);
        expect('_net.lightCandle('.allMatches(screen).length, 1);
        // 그 한 곳(_onLight)은 가까운 촛불 슬롯이 있을 때만 동작한다.
        expect(
          screen,
          contains('final slot = _near.candle;\n    if (slot == null'),
        );
      },
    );
  });

  group('first-visit hint', () {
    testWidgets('shows once, disappears after 6 s, never again', (
      tester,
    ) async {
      final h = await pumpChurch(tester, size: const Size(360, 640));
      await tester.pump();
      expect(find.text(ChurchWalkHint.message), findsOneWidget);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getBool('church_walk_hint_seen'), isTrue);
      await tester.pump(const Duration(seconds: 5));
      expect(find.text(ChurchWalkHint.message), findsOneWidget);
      await tester.pump(const Duration(seconds: 2));
      expect(find.text(ChurchWalkHint.message), findsNothing);
      // 같은 기기에서 다시 입장하면 보이지 않는다.
      await tester.pumpWidget(const SizedBox());
      await tester.pumpWidget(
        wrapApp(
          ChurchScreen(
            settings: h.settings,
            net: FakeChurchNet(),
            scene: FakeChurchSceneController(),
          ),
        ),
      );
      await tester.pump();
      expect(find.text(ChurchWalkHint.message), findsNothing);
    });

    testWidgets('the 가기 button hides it right away', (tester) async {
      await pumpChurch(tester, size: const Size(360, 640));
      await tester.pump();
      expect(find.text(ChurchWalkHint.message), findsOneWidget);
      await tester.tap(_goButton);
      await _settle(tester);
      expect(find.text(ChurchWalkHint.message), findsNothing);
      await tester.tap(find.byKey(const ValueKey('go-entrance')));
      await _settle(tester);
    });

    testWidgets('hint at 360x640 text scale 2.0 does not overflow', (
      tester,
    ) async {
      await pumpChurch(tester, size: const Size(360, 640), textScale: 2.0);
      await tester.pump();
      expect(find.text(ChurchWalkHint.message), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pump(const Duration(seconds: 7));
    });
  });

  group('wire format', () {
    test('SceneEvent.parse understands the walk events and near.station', () {
      expect(
        SceneEvent.parse(
          '{"e":"near","seat":null,"candle":null,"station":"altar"}',
        ),
        const SceneNear(station: 'altar'),
      );
      expect(
        SceneEvent.parse('{"e":"stations","candle":2,"altar":1,"font":0}'),
        isA<SceneStations>().having((s) => s.candle, 'candle', 2),
      );
      expect(
        SceneEvent.parse('{"e":"walkStart","kind":"candle","m":22}'),
        isA<SceneWalkStart>().having((s) => s.kind, 'kind', 'candle'),
      );
      expect(
        SceneEvent.parse(
          '{"e":"walkDone","kind":"seat","index":0,"seat":"R06-5"}',
        ),
        isA<SceneWalkDone>()
            .having((s) => s.kind, 'kind', 'seat')
            .having((s) => s.seat, 'seat', 'R06-5'),
      );
      expect(
        SceneEvent.parse('{"e":"walkFail","kind":"font"}'),
        isA<SceneWalkFail>(),
      );
      expect(
        SceneEvent.parse('{"e":"walkCancel","kind":"altar"}'),
        isA<SceneWalkCancel>(),
      );
      expect(SceneEvent.parse('{"e":"walkDone"}'), isNull);
    });

    test(
      'walkTo / cancelWalk / tapAt reach the web with the right args',
      () async {
        final c = FakeChurchSceneController();
        await c.init(
          avatar: const {},
          hour: 12,
          ambient: false,
          solo: true,
          quality: 'high',
        );
        await c.walkTo('candle');
        await c.walkTo('candle', index: 1);
        await c.walkTo('seat', seat: 'L03-2');
        await c.cancelWalk();
        await c.tapAt(10, 20);
        expect(c.argsOf('walkTo'), [
          {'kind': 'candle'},
          {'kind': 'candle', 'index': 1},
          {'kind': 'seat', 'seat': 'L03-2'},
        ]);
        expect(c.count('cancelWalk'), 1);
        expect(c.lastArgs('tapAt'), {'x': 10.0, 'y': 20.0});
      },
    );

    test('tap / cancel are not queued before init, walkTo is', () async {
      final c = FakeChurchSceneController();
      await c.tapAt(1, 2);
      await c.cancelWalk();
      await c.walkTo('altar');
      expect(c.calls, isEmpty);
      await c.init(
        avatar: const {},
        hour: 12,
        ambient: false,
        solo: true,
        quality: 'high',
      );
      expect(c.walkKinds, ['altar']);
      expect(c.count('tapAt'), 0);
    });

    test('ChurchGoTarget kinds match the web walkTo kinds', () {
      expect(ChurchGoTarget.values.map((t) => t.kind), [
        'candle',
        'altar',
        'seat',
        'entrance',
        'font',
      ]);
    });
  });
}
