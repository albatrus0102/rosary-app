import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_touch_trace.dart';

import 'church_screen_fakes.dart';

void main() {
  setUp(() => ChurchTouchTrace.debugForce = true);
  tearDown(() {
    ChurchTouchTrace.debugForce = false;
    ChurchTouchTrace.instance.clear();
    ChurchTouchTrace.instance.roles.clear();
    ChurchTouchTrace.instance.claimed.clear();
  });

  group('기록기(고리 버퍼)', () {
    test('개수 상한: 오래된 것부터 버린다', () {
      var now = 1000;
      final t = ChurchTouchTrace(capacity: 100, clock: () => now);
      for (var i = 0; i < 250; i++) {
        now++;
        t.add('f', 'p', {'i': i});
      }
      expect(t.length, 100);
      expect(t.entries.first['i'], 150);
      expect(t.entries.last['i'], 249);
    });

    test('시간 상한: 2분보다 오래된 것은 버린다', () {
      var now = 0;
      final t = ChurchTouchTrace(clock: () => now);
      t.add('f', 'p', {'i': 0});
      now = 60 * 1000;
      t.add('f', 'p', {'i': 1});
      now = 121 * 1000;
      t.add('f', 'p', {'i': 2});
      expect(t.entries.map((e) => e['i']), [1, 2]);
    });

    test('일반 빌드(꺼짐)에서는 아무것도 쌓지 않는다', () {
      ChurchTouchTrace.debugForce = false;
      final t = ChurchTouchTrace();
      t.add('f', 'p');
      t.sent('setInput', {'dx': 1.0, 'dy': 0.0});
      expect(t.length, 0);
      expect(t.sentLook, 0);
      // 웹의 기록 메시지는 일반 빌드에서도 화면 이벤트로 새지 않게 처리(버림)된다.
      expect(ChurchTouchTrace.handleRaw('{"e":"trace","items":[]}'), isTrue);
    });

    test('보낸 메시지 셈과 실패·버림 기록', () {
      final t = ChurchTouchTrace();
      t.sent('setInput', {'look': true});
      t.sent('setInput', {'dx': 3.0, 'dy': 1.0});
      t.sent('setInput', {'k': 1.1});
      t.sent('setJoystick', {'x': 0.0, 'y': 1.0});
      t.sent('setInput', {'dx': 1.0, 'dy': 1.0}, error: 'boom');
      t.sent('setInput', {'dx': 1.0, 'dy': 1.0}, drop: true);
      expect(t.sentLook, 1);
      expect(t.sentPinch, 1);
      expect(t.sentJoy, 1);
      expect(t.sendFail, 1);
      expect(t.dropped, 1);
      expect(t.lastError, contains('boom'));
      expect(t.entries.map((e) => e['k']), [
        'msg',
        'msg',
        'msg',
        'msg',
        'fail',
        'drop',
      ]);
    });

    test('웹이 보낸 묶음(trace)·없는 메서드(apiMissing)를 받는다', () {
      final t = ChurchTouchTrace.instance;
      final t0 = DateTime.now().millisecondsSinceEpoch;
      final raw = jsonEncode({
        'e': 'trace',
        's': {'looks': 7, 'yaw': 1.25, 'xl': 1},
        'items': [
          {
            'k': 'hdr',
            't': t0 - 30,
            'ua': 'Mozilla/5.0 Chrome/131.0',
            'dpr': 2.6,
          },
          {
            'k': 'in',
            't': t0 - 20,
            'a': {'dx': 4, 'dy': 0},
            'yaw': 1.2,
          },
          {'k': 'f', 't': t0 - 10, 'yaw': 1.25, 'ly': -0.03, 'fy': 0},
        ],
        'drop': 2,
      });
      expect(ChurchTouchTrace.handleRaw(raw), isTrue);
      expect(t.js['looks'], 7);
      final js = t.entries.where((e) => e['s'] == 'js').toList();
      expect(js.map((e) => e['k']), ['hdr', 'in', 'f', 'drop']);
      expect(js[1]['t'], t0 - 20, reason: '웹 시각을 그대로 쓴다');
      expect(
        ChurchTouchTrace.handleRaw('{"e":"apiMissing","m":"setInput"}'),
        isTrue,
      );
      expect(t.apiMissing, {'setInput'});
      expect(ChurchTouchTrace.handleRaw('{"e":"ready"}'), isFalse);
      // 머리에 웹뷰 userAgent 가 들어간다.
      final h = t.header();
      expect((h['webview'] as Map)['ua'], contains('Chrome/131'));
    });

    test('내보내기: JSON Lines(첫 줄 머리, 한 줄에 한 사건) 파일', () async {
      var now = 100;
      final t = ChurchTouchTrace(clock: () => now);
      t.add('f', 'p', {'ty': 'down', 'id': 3, 'r': 'stick'});
      now = 120;
      t.sent('setInput', {'dx': 2.0, 'dy': 0.0});
      final text = t.exportJsonl();
      final lines = const LineSplitter().convert(text);
      expect(lines, hasLength(3));
      final head = jsonDecode(lines.first) as Map;
      expect(head['type'], 'header');
      expect(head['format'], 'rosarium-touch-trace');
      expect(head['count'], 2);
      expect(head['screen'], isA<Map>());
      expect((head['counters'] as Map)['sentLook'], 1);
      final ev = [for (final l in lines.skip(1)) jsonDecode(l) as Map];
      expect(ev[0], containsPair('s', 'f'));
      expect(ev[0], containsPair('t', 100));
      expect(ev[1], containsPair('s', 'tx'));
      expect((ev[1]['a'] as Map)['dx'], 2.0);

      final dir = await Directory.systemTemp.createTemp('trace');
      addTearDown(() => dir.delete(recursive: true));
      final f = await t.writeFile(dir: dir);
      expect(f.path, endsWith('church_touch_trace.jsonl'));
      final saved = const LineSplitter().convert(await f.readAsString());
      expect(saved, hasLength(3));
      expect((jsonDecode(saved.first) as Map)['type'], 'header');
      expect(saved.skip(1), lines.skip(1));
      t.clear();
      expect(t.length, 0);
      expect(t.sentLook, 0);
    });
  });

  group('성당 화면에서(개발용 빌드)', () {
    testWidgets('두 손가락(손잡이 + 시점)을 역할과 함께 기록하고, 보낸 시점 메시지를 남긴다', (tester) async {
      final h = await pumpChurch(tester);
      // 개발용 빌드는 init 직후 웹 기록을 켠다.
      expect(h.scene.argsOf('setInput').any((a) => a['trace'] == true), isTrue);
      final t = ChurchTouchTrace.instance;
      t.clear();
      final stick = tester.getCenter(find.byKey(const ValueKey('move-zone')));
      final a = await tester.startGesture(stick, pointer: 3);
      await a.moveBy(const Offset(0, -40));
      await tester.pump(const Duration(milliseconds: 50));
      final b = await tester.startGesture(const Offset(300, 300), pointer: 4);
      await tester.pump();
      expect(t.roles, {3: 'stick', 4: 'look'});
      await b.moveBy(const Offset(30, 0));
      await tester.pump(const Duration(milliseconds: 50));
      final f = t.entries.where((e) => e['s'] == 'f' && e['k'] == 'p');
      expect(f.where((e) => e['ty'] == 'down').map((e) => (e['id'], e['r'])), [
        (3, 'stick'),
        (4, 'look'),
      ]);
      final dec = t.entries.where((e) => e['k'] == 'dec').map((e) => e['what']);
      expect(dec, containsAllInOrder(['stick-grab', 'look-start']));
      final tx = t.entries.where((e) => e['s'] == 'tx' && e['m'] == 'setInput');
      expect(tx.any((e) => (e['a'] as Map).containsKey('dx')), isTrue);
      expect(t.sentLook, greaterThan(0));
      expect(t.sentJoy, greaterThan(0));
      await b.up();
      await a.up();
      await tester.pump();
      expect(t.roles, isEmpty);
      expect(t.claimed, isEmpty);
    });

    testWidgets('HUD 단추에 닿은 손가락은 hud 로 기록된다', (tester) async {
      await pumpChurch(tester);
      final t = ChurchTouchTrace.instance;
      t.clear();
      await tester.tap(find.byKey(const ValueKey('hud-collapse')));
      await tester.pump();
      final downs = t.entries.where(
        (e) => e['s'] == 'f' && e['k'] == 'p' && e['ty'] == 'down',
      );
      expect(downs.map((e) => e['r']), ['hud']);
    });

    testWidgets('터치 진단 표시: 단추로 켜고, 보낸/받은 시점·yaw 를 보여 준다', (tester) async {
      final h = await pumpChurch(tester);
      expect(find.byKey(const ValueKey('touch-diag')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('touch-diag-toggle')));
      await tester.pump();
      expect(find.byKey(const ValueKey('touch-diag')), findsOneWidget);
      expect(find.text('터치 기록 보내기'), findsOneWidget);
      expect(find.text('기록 지우기'), findsOneWidget);
      ChurchTouchTrace.handleRaw(
        jsonEncode({
          'e': 'trace',
          's': {'looks': 12, 'yaw': 0.5, 'pitch': 0.4, 'xl': 1},
          'items': [],
        }),
      );
      await tester.pump(const Duration(milliseconds: 600));
      expect(find.textContaining('웹 받음 시점 12'), findsOneWidget);
      expect(find.textContaining('yaw 0.50'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('touch-trace-clear')));
      await tester.pump();
      expect(ChurchTouchTrace.instance.length, lessThan(5));
      await tester.tap(find.byTooltip('터치 진단 닫기'));
      await tester.pump();
      expect(find.byKey(const ValueKey('touch-diag')), findsNothing);
      expect(h.scene.isDisposed, isFalse);
      await tester.pump(const Duration(seconds: 7));
    });
  });

  test('웹에 없는 메서드는 조용히 버리지 않고 apiMissing 으로 알리는 스크립트', () {
    final s = churchApiScript('setInput', {'look': true});
    expect(s, contains('window.ChurchAPI.setInput({"look":true})'));
    expect(s, contains('apiMissing'));
    expect(s, contains('o.m="setInput"'));
  });
}
