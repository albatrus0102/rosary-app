// 성당 안 진본 사진 창(G-29): 웹 이벤트 `glassNear`/`glassTap` 해석과 '이 창: ○○ · 자세히 보기' 칩.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/church/church_hud.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/glass/glass_catalog.dart';

import 'church_screen_fakes.dart';
import 'glass_test_support.dart';

Finder get _chip => find.byKey(const ValueKey('glass-chip'));

Future<void> _settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 20));
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pump();
}

void main() {
  setUp(() => GlassCatalog.debugSetShared(testGlassCatalogFuture()));
  tearDown(GlassCatalog.debugResetShared);

  group('bridge events', () {
    test('glassNear with an id, with null, and with a bad id', () {
      final a = SceneEvent.parse(
        '{"e":"glassNear","id":"dove_stpeter","slot":"gloria"}',
      );
      expect(a, isA<SceneGlassNear>());
      expect((a! as SceneGlassNear).id, 'dove_stpeter');
      expect((a as SceneGlassNear).slot, 'gloria');
      final b = SceneEvent.parse('{"e":"glassNear","id":null}');
      expect(b, isA<SceneGlassNear>());
      expect((b! as SceneGlassNear).id, isNull);
      expect(SceneEvent.parse('{"e":"glassNear","id":"../x"}'), isNull);
      expect(SceneEvent.parse('{"e":"glassNear","id":3}'), isNull);
    });

    test('glassTap needs a well-formed id', () {
      final a = SceneEvent.parse(
        '{"e":"glassTap","id":"milan_apse_lower","slot":"apse_center_lower"}',
      );
      expect(a, isA<SceneGlassTap>());
      expect((a! as SceneGlassTap).id, 'milan_apse_lower');
      expect(SceneEvent.parse('{"e":"glassTap"}'), isNull);
      expect(SceneEvent.parse('{"e":"glassTap","id":"A B"}'), isNull);
    });
  });

  group('glass chip', () {
    testWidgets('appears near a window, opens the info sheet, hides on leave', (
      tester,
    ) async {
      final h = await pumpChurch(tester, size: const Size(412, 915));
      expect(_chip, findsNothing);
      h.scene.emit(const SceneGlassNear(id: 'dove_stpeter', slot: 'gloria'));
      await _settle(tester);
      expect(_chip, findsOneWidget);
      final title = testGlassCatalog().byId('dove_stpeter')!.titleKo;
      expect(find.text('이 창: $title'), findsOneWidget);
      expect(find.text('자세히 보기'), findsOneWidget);
      expect(tester.getSize(_chip).height, greaterThanOrEqualTo(48));

      await tester.tap(_chip);
      await tester.pumpAndSettle();
      expect(find.byType(BottomSheet), findsOneWidget);
      expect(find.text(title), findsWidgets);
      Navigator.of(tester.element(find.byType(BottomSheet))).pop();
      await tester.pumpAndSettle();

      h.scene.emit(const SceneGlassNear());
      await _settle(tester);
      expect(_chip, findsNothing);
      await tester.pump(const Duration(seconds: 7)); // 첫 방문 안내 타이머 정리
    });

    testWidgets('a tapped window shows for 8 seconds, then falls back', (
      tester,
    ) async {
      final h = await pumpChurch(tester);
      h.scene.emit(
        const SceneGlassTap(id: 'oculus_florence_donatello', slot: 'drum_e'),
      );
      await _settle(tester);
      final c = testGlassCatalog();
      expect(
        find.text('이 창: ${c.byId('oculus_florence_donatello')!.titleKo}'),
        findsOneWidget,
      );
      await tester.pump(const Duration(seconds: 9));
      await tester.pump(const Duration(milliseconds: 300)); // 사라지는 페이드(short4)
      expect(_chip, findsNothing);
    });

    testWidgets('unknown ids and seated state show no chip', (tester) async {
      final h = await pumpChurch(tester);
      h.scene.emit(const SceneGlassNear(id: 'no_such_window'));
      await _settle(tester);
      expect(_chip, findsNothing);
      h.scene.emit(const SceneGlassNear(id: 'dove_stpeter'));
      await _settle(tester);
      expect(_chip, findsOneWidget);
      // 앉으면(기도 카드) 칩은 숨는다.
      h.scene.emit(const SceneNear(seat: 'L03-2'));
      await _settle(tester);
      await tester.tap(find.text('앉기'));
      await tester.pump();
      h.scene.emit(const SceneSeated('L03-2'));
      await _settle(tester);
      expect(_chip, findsNothing);
      await tester.pump(const Duration(seconds: 7));
    });
  });

  group('HUD layout with the glass chip', () {
    // 가장 붐비는 상태: 첫 방문 안내 + '앉기' 버튼 + 이동 안내 + '가기' + (자동 걷기 칩) + 창 칩.
    for (final size in const [Size(360, 800), Size(412, 915), Size(360, 640)]) {
      for (final scale in const [1.0, 1.5]) {
        testWidgets(
          'no overlaps at ${size.width.toInt()}x${size.height.toInt()}, '
          'text scale $scale',
          (tester) async {
            final h = await pumpChurch(tester, size: size, textScale: scale);
            h.scene.emit(const SceneNear(seat: 'L03-2'));
            h.scene.emit(const SceneWalkStart('altar'));
            // 가장 긴 이름
            h.scene.emit(
              const SceneGlassNear(id: 'alabaster_stpaul_1', slot: 'aisle'),
            );
            await tester.pump();
            await tester.pump(const Duration(milliseconds: 300));
            final chip = tester.getRect(_chip);
            final others = <String, Rect>{
              'walk-chip': tester.getRect(
                find.byKey(const ValueKey('walk-chip')),
              ),
              'go': tester.getRect(find.byKey(const ValueKey('go-button'))),
              'sit': tester.getRect(find.byKey(const ValueKey('ctx-sit'))),
              'move-hint': tester.getRect(
                find.byKey(const ValueKey('move-hint')),
              ),
              for (final tip in ['성당 바꾸기', '소리 끄기', '아바타 편집', '인사'])
                tip: tester.getRect(find.byTooltip(tip)),
            };
            if (find.byKey(const ValueKey('walk-hint')).evaluate().isNotEmpty) {
              others['walk-hint'] = tester.getRect(
                find.byKey(const ValueKey('walk-hint')),
              );
            }
            others.forEach((name, r) {
              expect(chip.overlaps(r), isFalse, reason: '$name 과 겹침');
            });
            expect(chip.left, greaterThanOrEqualTo(16 - 0.5));
            expect(chip.right, lessThanOrEqualTo(size.width - 16 + 0.5));
            expect(chip.height, greaterThanOrEqualTo(48));
            expect(chip.bottom, lessThan(size.height / 2), reason: '화면 위쪽 절반');
            expect(tester.takeException(), isNull);
            await tester.pump(const Duration(seconds: 7));
          },
        );
      }
    }

    testWidgets('chip alone keeps one line at 360 wide', (tester) async {
      await tester.pumpWidget(
        wrapApp(
          Scaffold(
            body: Center(
              child: SizedBox(
                width: 328,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: ChurchGlassChip(
                    title: '성 바오로 대성전 알라바스터 창 (1) 아주 긴 이름',
                    onTap: () {},
                  ),
                ),
              ),
            ),
          ),
          textScale: 2.0,
        ),
      );
      expect(tester.takeException(), isNull);
      expect(
        tester.getSize(find.byType(ChurchGlassChip)).width,
        lessThanOrEqualTo(328),
      );
    });
  });
}
