import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/rosary_style.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/ui/widgets/rosary_map.dart';

void main() {
  final steps = buildRosarySequence(MysterySet.joyful);

  group('layoutBeads', () {
    for (final size in const [
      Size(160, 160),
      Size(360, 217),
      Size(300, 170),
      Size(360, 640),
    ]) {
      test('geometry at $size', () {
        final slots = layoutBeads(size);
        expect(slots, hasLength(RosarySlots.count));

        int count(bool Function(BeadSlot) f) => slots.where(f).length;
        expect(count((s) => s.kind == BeadKind.medal), 1);
        expect(count((s) => s.kind == BeadKind.crucifix), 1);
        // 구슬은 모두 60개(큰 7 + 작은 53).
        expect(
          count((s) => s.kind == BeadKind.small || s.kind == BeadKind.large),
          60,
        );
        for (var d = 1; d <= 5; d++) {
          final small = slots.where(
            (s) => s.kind == BeadKind.small && s.decade == d,
          );
          expect(small.map((s) => s.beadIndex), [
            for (var k = 1; k <= 10; k++) k,
          ]);
        }
        expect(count((s) => s.kind == BeadKind.large && s.decade != null), 5);
        expect(count((s) => s.kind == BeadKind.large && s.decade == null), 2);
        expect(count((s) => s.kind == BeadKind.small && s.decade == null), 3);

        // 모두 박스 안에 있고, 구슬끼리 겹치지 않는다.
        final box = Offset.zero & size;
        for (final s in slots) {
          expect(
            box.inflate(0.5).contains(s.center),
            isTrue,
            reason: '$s outside $box',
          );
          expect(s.radius, greaterThan(0));
        }
        final beads = slots
            .where((s) => s.kind == BeadKind.small || s.kind == BeadKind.large)
            .toList();
        for (var i = 0; i < beads.length; i++) {
          for (var j = i + 1; j < beads.length; j++) {
            final dist = (beads[i].center - beads[j].center).distance;
            expect(
              dist,
              greaterThanOrEqualTo(beads[i].radius + beads[j].radius - 1e-6),
              reason: '${beads[i]} overlaps ${beads[j]}',
            );
          }
        }
      });
    }

    test('medal is at the bottom of the loop with the pendant below it', () {
      final slots = layoutBeads(const Size(300, 300));
      final medal = slots[RosarySlots.medal];
      final loop = slots.sublist(RosarySlots.loopStart, RosarySlots.medal);
      expect(loop.every((s) => s.center.dy < medal.center.dy), isTrue);
      // 펜던트: 메달 -> 큰 -> 작은 3 -> 큰 -> 십자가 순으로 아래로.
      final ys = [
        for (final i in [5, 4, 3, 2, 1, 0]) slots[i].center.dy,
      ];
      expect(ys.first, greaterThan(medal.center.dy));
      for (var i = 1; i < ys.length; i++) {
        expect(ys[i], greaterThan(ys[i - 1]));
      }
      // 펜던트는 가운데 줄 위에 있다.
      for (var i = 0; i <= 5; i++) {
        expect(slots[i].center.dx, closeTo(medal.center.dx, 1e-6));
      }
      // 고리는 세로로 약간 긴 타원.
      final xs = loop.map((s) => s.center.dx);
      final ysLoop = loop.map((s) => s.center.dy);
      final w =
          xs.reduce((a, b) => a > b ? a : b) -
          xs.reduce((a, b) => a < b ? a : b);
      final h =
          ysLoop.reduce((a, b) => a > b ? a : b) -
          ysLoop.reduce((a, b) => a < b ? a : b);
      expect(h, greaterThan(w));
      // 첫 구슬(1단 앞 큰 구슬)은 메달 오른쪽 옆.
      final first = slots[RosarySlots.loopStart];
      expect(first.center.dx, greaterThan(medal.center.dx));
      expect(first.center.dy, lessThan(medal.center.dy));
    });

    test('scales with the box', () {
      // 바깥 여백(10)을 뺀 크기에 비례한다.
      final small = layoutBeads(const Size(170, 170));
      final big = layoutBeads(const Size(470, 470));
      expect(big[6].radius, closeTo(small[6].radius * 3, 1e-6));
    });
  });

  group('slotIndexForStep', () {
    test('every one of the 73 steps maps to a slot', () {
      expect(steps, hasLength(73));
      final slots = layoutBeads(const Size(300, 300));
      for (final step in steps) {
        final i = slotIndexForStep(step);
        expect(i, inInclusiveRange(0, RosarySlots.count - 1));
        expect(slotForStep(slots, step), same(slots[i]));
      }
    });

    test('maps intro, decades and closing to the right pieces', () {
      final slots = layoutBeads(const Size(300, 300));
      BeadSlot at(int i) => slotForStep(slots, steps[i]);

      expect(at(0).kind, BeadKind.crucifix); // 성호경
      expect(at(1).kind, BeadKind.crucifix); // 사도신경
      expect(slotIndexForStep(steps[2]), RosarySlots.pendantOurFather);
      for (var k = 1; k <= 3; k++) {
        final s = at(2 + k);
        expect(s.kind, BeadKind.small);
        expect(s.decade, isNull);
        expect(s.beadIndex, k);
      }
      expect(slotIndexForStep(steps[6]), RosarySlots.pendantGlory);
      // 펜던트: 주님의 기도는 십자가 쪽, 영광송은 메달 쪽.
      expect(
        slots[RosarySlots.pendantOurFather].center.dy,
        greaterThan(slots[RosarySlots.pendantGlory].center.dy),
      );

      for (final d in [1, 2, 3, 4, 5]) {
        final ourFather = steps.firstWhere(
          (s) => s.kind == StepKind.ourFather && s.decade == d,
        );
        final large = slotForStep(slots, ourFather);
        expect(large.kind, BeadKind.large);
        expect(large.decade, d);
        expect(large.beadIndex, isNull);
      }
      // 1단 주님의 기도는 메달 바로 다음 큰 구슬.
      expect(slotIndexForStep(steps[7]), RosarySlots.loopStart);

      expect(steps.last.kind, StepKind.closing);
      expect(at(steps.length - 1).kind, BeadKind.medal);
    });

    test('50 decade Hail Marys map to distinct loop beads in order', () {
      final slots = layoutBeads(const Size(300, 300));
      final hm = steps
          .where((s) => s.kind == StepKind.hailMary && s.decade != null)
          .toList();
      expect(hm, hasLength(50));
      final indices = hm.map(slotIndexForStep).toList();
      expect(indices.toSet(), hasLength(50));
      for (var i = 1; i < indices.length; i++) {
        expect(indices[i], greaterThan(indices[i - 1]));
      }
      for (final step in hm) {
        final slot = slotForStep(slots, step);
        expect(slot.kind, BeadKind.small);
        expect(slot.decade, step.decade);
        expect(slot.beadIndex, step.beadIndex);
      }
    });

    test('glory be and fatima rest on bead 10 of their decade', () {
      final slots = layoutBeads(const Size(300, 300));
      for (final step in steps.where(
        (s) =>
            s.decade != null &&
            (s.kind == StepKind.gloryBe || s.kind == StepKind.fatima),
      )) {
        final slot = slotForStep(slots, step);
        expect(slot.kind, BeadKind.small);
        expect(slot.decade, step.decade);
        expect(slot.beadIndex, 10);
        expect(isRestingStep(step), isTrue);
      }
      expect(isRestingStep(steps[6]), isFalse); // 서두 영광송
      expect(isRestingStep(steps[8]), isFalse); // 성모송 1/10
    });

    test('slot index never moves backwards over the sequence', () {
      // 서두 -> 1단 -> ... -> 5단 -> 마침 순서로 칸 번호가 줄지 않는다.
      var prev = -1;
      for (final step in steps) {
        final i = slotIndexForStep(step);
        expect(i, greaterThanOrEqualTo(prev), reason: step.title);
        prev = i;
      }
    });
  });

  test('labelFor', () {
    expect(RosaryMap.labelFor(steps[0]), '서두');
    expect(RosaryMap.labelFor(steps[3]), '서두');
    expect(RosaryMap.labelFor(steps[8]), '1단 · 1/10');
    expect(RosaryMap.labelFor(steps[17]), '1단 · 10/10');
    expect(RosaryMap.labelFor(steps.last), '마침');
  });

  group('RosaryMap widget', () {
    Widget host(RosaryStep step, {RosaryStyle style = RosaryStyle.bead}) {
      return MaterialApp(
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 240,
              height: 170,
              child: RosaryMap(step: step, style: style),
            ),
          ),
        ),
      );
    }

    testWidgets('draws with fallback circles when the image cannot load', (
      tester,
    ) async {
      await tester.pumpWidget(host(steps[0]));
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.takeException(), isNull);
      expect(find.byType(RosaryMap), findsOneWidget);
      expect(find.text('서두'), findsOneWidget);
    });

    testWidgets('survives advancing through steps and style changes', (
      tester,
    ) async {
      await tester.pumpWidget(host(steps[0]));
      for (final i in [1, 2, 3, 8, 9, 18, 19, 40, steps.length - 1, 0]) {
        await tester.pumpWidget(host(steps[i]));
        await tester.pump(const Duration(milliseconds: 120));
      }
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pumpWidget(host(steps[9], style: RosaryStyle.jade));
      await tester.pump(const Duration(milliseconds: 400));
      expect(tester.takeException(), isNull);
      expect(find.text('1단 · 2/10'), findsOneWidget);
    });

    testWidgets('the whole map paints on a tiny box and a big one', (
      tester,
    ) async {
      for (final h in [120.0, 160.0, 640.0]) {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SizedBox(
                width: 200,
                height: h,
                child: RosaryMap(step: steps[20], style: RosaryStyle.pearl),
              ),
            ),
          ),
        );
        await tester.pump(const Duration(milliseconds: 50));
        expect(tester.takeException(), isNull);
      }
    });

    testWidgets('animations can be switched off', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 240,
              height: 170,
              child: RosaryMap(
                step: steps[8],
                style: RosaryStyle.bead,
                animate: false,
              ),
            ),
          ),
        ),
      );
      // 맥박이 없으면 더 그릴 프레임이 없어 바로 안정된다.
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });

    testWidgets('onTap fires', (tester) async {
      var taps = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 240,
              height: 170,
              child: RosaryMap(
                step: steps[8],
                style: RosaryStyle.bead,
                onTap: () => taps++,
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.byType(RosaryMap));
      expect(taps, 1);
    });
  });

  group('motion helpers', () {
    test('fisheye falloff is 1 at the focus and fades smoothly', () {
      expect(fisheyeFalloff(0), 1);
      expect(fisheyeScale(0), closeTo(1.45, 1e-9));
      expect(fisheyeNudge(0, 10), closeTo(3.5, 1e-9));
      var prev = double.infinity;
      for (var d = 0.0; d <= 8; d += 0.5) {
        final f = fisheyeFalloff(d);
        expect(f, lessThan(prev));
        prev = f;
      }
      expect(fisheyeScale(8), closeTo(1.0, 1e-4));
      expect(fisheyeNudge(8, 10), closeTo(0, 1e-3));
    });

    test('pop and squash settle back to 1', () {
      expect(popScale(0), 1);
      expect(popScale(1), 1);
      final peak = popScale(0.35);
      expect(peak, inInclusiveRange(1.12, 1.17));
      expect(squashScale(0), closeTo(0.92, 1e-9));
      expect(squashScale(1), 1);
    });

    test('ripple grows and fades; decade ripple is bigger', () {
      expect(rippleRadiusFactor(0), closeTo(0.8, 1e-9));
      expect(rippleRadiusFactor(1), closeTo(3, 1e-9));
      expect(rippleRadiusFactor(1, big: true), closeTo(5, 1e-9));
      expect(rippleAlpha(0), closeTo(0.35, 1e-9));
      expect(rippleAlpha(1), 0);
    });

    test('rosaryFocusAt reaches the target with a small overshoot', () {
      expect(rosaryFocusAt(10, 11, 0, 0), 10);
      expect(rosaryFocusAt(10, 11, 0, 1), 11);
      var maxV = 0.0;
      for (var t = 0.0; t <= 0.4; t += 0.01) {
        maxV = maxV < rosaryFocusAt(10, 11, 0, t)
            ? rosaryFocusAt(10, 11, 0, t)
            : maxV;
      }
      expect(maxV, greaterThan(11));
      expect(maxV, lessThan(11.15));
    });

    test(
      'pointAlongChain walks along the chain through intermediate slots',
      () {
        final slots = layoutBeads(const Size(360, 640));
        final centers = [for (final s in slots) s.center];
        expect(pointAlongChain(centers, 8), centers[8]);
        final mid = pointAlongChain(centers, 8.5);
        expect(
          (mid - centers[8]).distance,
          closeTo((centers[9] - centers[8]).distance / 2, 1e-6),
        );
        // 펜던트 끝에서 고리 첫 구슬로 갈 때는 메달을 거친다.
        final viaMedal = pointAlongChain(
          centers,
          RosarySlots.pendantGlory + 0.5,
        );
        expect(viaMedal, centers[RosarySlots.medal]);
        expect(pointAlongChain(centers, 6), centers[6]);
        // 범위를 벗어난 초점은 끝에 붙는다.
        expect(pointAlongChain(centers, -3), centers.first);
        expect(pointAlongChain(centers, 999), centers.last);
      },
    );
  });

  group('ScrubTracker', () {
    test('100px down with stride 40 gives 2 steps and fraction 0.5', () {
      final t = ScrubTracker(stride: 40);
      expect(t.addDy(100), 2);
      expect(t.fraction, closeTo(0.5, 1e-9));
    });

    test('accumulates small moves and fires once per stride', () {
      final t = ScrubTracker(stride: 40);
      var total = 0;
      for (var i = 0; i < 10; i++) {
        total += t.addDy(7);
      }
      expect(total, 1); // 70px
      expect(t.fraction, closeTo(0.75, 1e-9));
    });

    test('reversing direction mid-drag steps back', () {
      final t = ScrubTracker(stride: 40);
      expect(t.addDy(50), 1);
      expect(t.fraction, closeTo(0.25, 1e-9));
      expect(t.addDy(-30), 0);
      expect(t.fraction, closeTo(-0.5, 1e-9));
      expect(t.addDy(-30), -1);
      expect(t.fraction, closeTo(-0.25, 1e-9));
      expect(t.fraction.abs(), lessThan(1));
    });

    test('ignores horizontal movement', () {
      final t = ScrubTracker(stride: 40);
      expect(t.add(const Offset(200, 0)), 0);
      expect(t.fraction, 0);
      expect(t.add(const Offset(-90, 45)), 1);
    });
  });

  group('RosaryMap scrubbing', () {
    testWidgets('drag down/up calls onStep; semantics adjust', (tester) async {
      final calls = <int>[];
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 240,
              height: 240,
              child: RosaryMap(
                step: steps[8],
                style: RosaryStyle.bead,
                onStep: calls.add,
              ),
            ),
          ),
        ),
      );
      final g = await tester.startGesture(
        tester.getCenter(find.byType(RosaryMap)),
      );
      for (var i = 0; i < 8; i++) {
        await g.moveBy(const Offset(0, 15));
        await tester.pump(const Duration(milliseconds: 16));
      }
      await g.up();
      await tester.pump(const Duration(milliseconds: 400));
      expect(calls, isNotEmpty);
      expect(calls.every((d) => d == 1), isTrue);
      calls.clear();
      final g2 = await tester.startGesture(
        tester.getCenter(find.byType(RosaryMap)),
      );
      for (var i = 0; i < 8; i++) {
        await g2.moveBy(const Offset(0, -15));
        await tester.pump(const Duration(milliseconds: 16));
      }
      await g2.up();
      await tester.pump(const Duration(milliseconds: 400));
      expect(calls, isNotEmpty);
      expect(calls.every((d) => d == -1), isTrue);
    });
  });
}
