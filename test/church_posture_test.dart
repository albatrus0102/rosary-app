// 성당 기도 자세(앉아서 | 무릎 꿇고) 선택: 카드 UI, 저장, 브리지, 와이어(SPEC §28.4).
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/net/church_net.dart';
import 'package:rosary_app/church/net/church_protocol.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';

Future<void> _anim(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 20));
  await tester.pump(const Duration(milliseconds: 400));
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

Future<void> _stand(WidgetTester tester) async {
  await tester.tap(find.byKey(const ValueKey('prayer-stand')));
  await tester.pump();
}

const _posture = ValueKey('prayer-posture');

void main() {
  group('wire', () {
    test('pray message carries k:1 only when kneeling and praying', () {
      expect(jsonDecode(prayMessage(true, 2)), {
        't': 'pray',
        'on': true,
        'ms': 2,
      });
      expect(jsonDecode(prayMessage(true, 2, kneel: true)), {
        't': 'pray',
        'on': true,
        'ms': 2,
        'k': 1,
      });
      expect(jsonDecode(prayMessage(false, -1, kneel: true)), {
        't': 'pray',
        'on': false,
        'ms': -1,
      });
    });

    test('praying / peer k is parsed and passed to the scene json', () {
      final a = parseChurchEvent(
        '{"t":"praying","id":"p1","on":true,"ms":1,"k":1}',
      );
      expect(a, isA<Praying>());
      expect((a! as Praying).kneel, isTrue);
      final b = parseChurchEvent('{"t":"praying","id":"p1","on":true,"ms":1}');
      expect((b! as Praying).kneel, isFalse);
      // 기도 중이 아니면 k 는 뜻이 없다. 0|1 이 아닌 값도 무시.
      final c = parseChurchEvent(
        '{"t":"praying","id":"p1","on":false,"ms":-1,"k":1}',
      );
      expect((c! as Praying).kneel, isFalse);
      final d = parseChurchEvent(
        '{"t":"praying","id":"p1","on":true,"ms":1,"k":"1"}',
      );
      expect((d! as Praying).kneel, isFalse);

      final p = parsePeer({
        'id': 'p2',
        'st': 'p',
        'seat': 'L01-0',
        'ms': 0,
        'k': 1,
      })!;
      expect(p.kneel, isTrue);
      expect(p.toJson()['k'], 1);
      final q = parsePeer({'id': 'p2', 'st': 'p', 'seat': 'L01-0', 'ms': 0})!;
      expect(q.kneel, isFalse);
      expect(q.toJson().containsKey('k'), isFalse);
      expect(p == q, isFalse);
    });

    test('scene posture event', () {
      final e = SceneEvent.parse(
        '{"e":"posture","posture":"kneel","seat":"L03-2"}',
      );
      expect(e, isA<ScenePosture>());
      expect((e! as ScenePosture).kneel, isTrue);
      expect(
        (SceneEvent.parse('{"e":"posture","posture":"sit"}')! as ScenePosture)
            .kneel,
        isFalse,
      );
      expect(SceneEvent.parse('{"e":"posture","posture":"lie"}'), isNull);
    });
  });

  group('posture selector', () {
    testWidgets('defaults to 앉아서; choosing 무릎 꿇고 saves and tells scene+net', (
      tester,
    ) async {
      final h = await pumpChurch(tester);
      expect(h.settings.prayerPosture, PrayerPosture.sit);
      await _sit(tester, h);
      // 기본(앉아서)에서는 장면에 자세를 따로 보내지 않는다.
      expect(h.scene.lastArgs('setPrayerPosture'), isNull);
      expect(h.net.kneels.last, isFalse);
      final seg = tester.widget<SegmentedButton<PrayerPosture>>(
        find.byKey(_posture),
      );
      expect(seg.selected, {PrayerPosture.sit});
      expect(find.text('앉아서'), findsOneWidget);
      expect(find.text('무릎 꿇고'), findsOneWidget);
      expect(
        find.descendant(of: find.byKey(_posture), matching: find.byType(Icon)),
        findsNWidgets(2),
      );

      await tester.tap(find.text('무릎 꿇고'));
      await tester.pump();
      expect(h.settings.prayerPosture, PrayerPosture.kneel);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('prayerPosture'), 'kneel');
      expect(h.scene.lastArgs('setPrayerPosture'), {'posture': 'kneel'});
      expect(h.net.prayings.last.$1, isTrue);
      expect(h.net.kneels.last, isTrue);
      expect(
        tester
            .widget<SegmentedButton<PrayerPosture>>(find.byKey(_posture))
            .selected,
        {PrayerPosture.kneel},
      );
      // 장면의 완료 이벤트는 상태를 바꾸지 않는다.
      h.scene.emit(const ScenePosture(kneel: true));
      await tester.pump();
      expect(tester.takeException(), isNull);

      await tester.tap(find.text('앉아서'));
      await tester.pump();
      expect(prefs.getString('prayerPosture'), 'sit');
      expect(h.scene.lastArgs('setPrayerPosture'), {'posture': 'sit'});
      expect(h.net.kneels.last, isFalse);
      await _stand(tester);
    });

    testWidgets('saved 무릎 꿇고 is applied after sitting; pause drops k', (
      tester,
    ) async {
      final h = await pumpChurch(tester);
      h.settings.prayerPosture = PrayerPosture.kneel;
      expect(h.scene.lastArgs('setPrayerPosture'), isNull); // 앉기 전에는 보내지 않는다
      await _sit(tester, h);
      expect(h.scene.lastArgs('setPrayerPosture'), {'posture': 'kneel'});
      expect(h.net.prayings.last.$1, isTrue);
      expect(h.net.kneels.last, isTrue);
      // 자세 호출은 setPraying 뒤에 온다(장면은 앉은 뒤에만 받는다).
      final names = h.scene.calls.map((c) => c.$1).toList();
      expect(
        names.lastIndexOf('setPrayerPosture'),
        greaterThan(names.lastIndexOf('setPraying')),
      );
      await tester.tap(find.byTooltip('더보기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('잠깐 쉬기'));
      await tester.pump();
      expect(h.net.prayings.last.$1, isFalse);
      expect(h.net.kneels.last, isFalse);
      await _stand(tester);
    });

    testWidgets('a kneeling peer reaches the scene with k:1', (tester) async {
      final h = await pumpChurch(tester);
      h.net.goOnline(2);
      await tester.pump();
      h.net.emit(const Praying('p1', true, 2, kneel: true));
      await tester.pump();
      expect(h.scene.lastArgs('peerPraying'), {
        'id': 'p1',
        'on': true,
        'ms': 2,
        'k': 1,
      });
      h.net.emit(const Praying('p1', true, 2));
      await tester.pump();
      expect(h.scene.lastArgs('peerPraying'), {
        'id': 'p1',
        'on': true,
        'ms': 2,
      });
    });
  });

  group('layout', () {
    for (final size in const [Size(360, 800), Size(412, 915)]) {
      testWidgets('card at ${size.width.toInt()}x${size.height.toInt()}: '
          'posture and 일어나기 share one row, nothing overlaps', (tester) async {
        final h = await pumpChurch(tester, size: size);
        await _sit(tester, h);
        expect(tester.takeException(), isNull);
        final card = tester.getRect(find.byKey(const ValueKey('prayer-card')));
        final seg = tester.getRect(find.byKey(_posture));
        final stand = tester.getRect(
          find.byKey(const ValueKey('prayer-stand')),
        );
        final next = tester.getRect(find.byKey(const ValueKey('prayer-next')));
        final text = tester.getRect(find.byKey(const ValueKey('prayer-text')));
        final step = tester.getRect(find.byKey(const ValueKey('prayer-step')));
        // 한 줄(카드 높이를 늘리지 않는다): 세로 범위가 겹치고 가로로는 떨어져 있다.
        expect(seg.right, lessThanOrEqualTo(stand.left - 4));
        expect((seg.center.dy - stand.center.dy).abs(), lessThan(1));
        expect(seg.height, greaterThanOrEqualTo(40));
        expect(stand.height, greaterThanOrEqualTo(48));
        // 서로 겹치지 않고 모두 카드 안.
        final rects = {
          'seg': seg,
          'stand': stand,
          'next': next,
          'text': text,
          'step': step,
        };
        final keys = rects.keys.toList();
        for (var i = 0; i < keys.length; i++) {
          final r = rects[keys[i]]!;
          expect(
            r.left >= card.left && r.right <= card.right,
            isTrue,
            reason: keys[i],
          );
          expect(
            r.top >= card.top && r.bottom <= card.bottom,
            isTrue,
            reason: keys[i],
          );
          for (var j = i + 1; j < keys.length; j++) {
            expect(
              r.deflate(0.5).overlaps(rects[keys[j]]!.deflate(0.5)),
              isFalse,
              reason: '${keys[i]} x ${keys[j]}',
            );
          }
        }
        // 기도 문장은 가려지지 않는다: 본문 전체가 버튼 줄 위에 보이고 스크롤이 필요 없다.
        expect(text.bottom, lessThanOrEqualTo(next.top));
        final scroll = tester.state<ScrollableState>(
          find.descendant(
            of: find.byKey(const ValueKey('prayer-text-scroll')),
            matching: find.byType(Scrollable),
          ),
        );
        expect(scroll.position.maxScrollExtent, 0);
        // 카드는 화면 아래쪽 절반 안에(3D 장면을 가리지 않는다).
        expect(card.height, lessThanOrEqualTo(size.height * 0.4));
        expect(card.bottom, lessThanOrEqualTo(size.height));
        // 두 자세 글자가 잘리지 않는다.
        for (final label in ['앉아서', '무릎 꿇고']) {
          final r = tester.getRect(find.text(label));
          expect(
            r.left >= seg.left && r.right <= seg.right,
            isTrue,
            reason: label,
          );
        }
        await tester.tap(find.text('무릎 꿇고'));
        await tester.pump();
        expect(tester.takeException(), isNull);
        expect(
          tester.getRect(find.byKey(const ValueKey('prayer-card'))).height,
          card.height,
        );
        await _stand(tester);
      });
    }

    testWidgets('360x640 text scale 2.0: stays on one row without overflow', (
      tester,
    ) async {
      final h = await pumpChurch(
        tester,
        size: const Size(360, 640),
        textScale: 2.0,
      );
      h.settings.prayerTextScale = 2.0;
      await _sit(tester, h);
      expect(tester.takeException(), isNull);
      final card = tester.getRect(find.byKey(const ValueKey('prayer-card')));
      expect(card.height, lessThanOrEqualTo(640 * 0.62 + 0.5));
      for (final k in ['prayer-posture', 'prayer-stand', 'prayer-next']) {
        final r = tester.getRect(find.byKey(ValueKey(k)));
        expect(r.left >= card.left && r.right <= card.right, isTrue, reason: k);
        expect(r.bottom, lessThanOrEqualTo(card.bottom), reason: k);
      }
      await tester.tap(find.text('무릎 꿇고'));
      await tester.pump();
      expect(h.settings.prayerPosture, PrayerPosture.kneel);
      expect(tester.takeException(), isNull);
      await _stand(tester);
    });
  });
}
