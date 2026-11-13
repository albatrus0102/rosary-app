import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/prayer_text_short.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/prayer_mode.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/domain/rosary_session.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
import 'package:rosary_app/ui/widgets/prayer_actions.dart';
import 'package:rosary_app/ui/widgets/prayer_bead_strip.dart';
import 'package:rosary_app/ui/widgets/prayer_text_view.dart';
import 'package:rosary_app/ui/widgets/rosary_map.dart';
import 'package:rosary_app/ui/widgets/rosary_map_sheet.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _SilentSoundPlayer extends SoundPlayer {
  @override
  Future<void> init() async {}
  @override
  Future<void> playDecadeChime() async {}
  @override
  Future<void> playBeadTick() async {}
  @override
  Future<void> dispose() async {}
}

const _set = MysterySet.sorrowful;

final _steps = buildRosarySequence(_set);

int _indexOf(bool Function(RosaryStep) test) => _steps.indexWhere(test);

/// 고통의 신비 1단 성모송 4/10.
final _hailMary4 = _indexOf(
  (s) => s.kind == StepKind.hailMary && s.decade == 1 && s.beadIndex == 4,
);

Future<AppSettings> _settings([Map<String, Object> values = const {}]) async {
  SharedPreferences.setMockInitialValues({'haptic': false, ...values});
  return AppSettings.load();
}

/// 논리 [size]의 화면(상태바·제스처 바 24dp 가정)에 기도 화면을 그린다.
Future<void> _pump(
  WidgetTester tester,
  AppSettings settings, {
  Size size = const Size(360, 640),
  double systemScale = 1.0,
  int? index,
  RosarySession? session,
}) async {
  const dpr = 2.0;
  tester.view.devicePixelRatio = dpr;
  tester.view.physicalSize = size * dpr;
  tester.view.padding = const FakeViewPadding(top: 48, bottom: 48);
  tester.view.viewPadding = const FakeViewPadding(top: 48, bottom: 48);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context)
            .copyWith(textScaler: TextScaler.linear(systemScale)),
        child: child!,
      ),
      home: PrayerScreen(
        settings: settings,
        mysterySet: _set,
        initialIndex: index ?? 0,
        session: session,
        soundPlayer: _SilentSoundPlayer(),
      ),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 300));
}

Rect _rect(WidgetTester tester, Finder f) => tester.getRect(f);

Finder get _scroll => find.byKey(const ValueKey('prayer-text-scroll'));
Finder get _pill => find.byKey(const ValueKey('prayer-overflow-pill'));
Finder get _header => find.byKey(const ValueKey('prayer-header'));
Finder get _strip => find.byKey(const ValueKey('prayer-strip'));
Finder get _actions => find.byType(PrayerActions);

ScrollPosition _position(WidgetTester tester) => tester
    .state<ScrollableState>(
      find.descendant(of: _scroll, matching: find.byType(Scrollable)),
    )
    .position;

void main() {
  group('layout budget (no control ever overlaps the prayer text)', () {
    for (final size in const [Size(360, 640), Size(360, 800)]) {
      for (final prayerScale in const [1.0, 1.5, 2.0]) {
        for (final system in const [1.0, 1.3]) {
          testWidgets(
            'Hail Mary at ${size.width.toInt()}x${size.height.toInt()} '
            'prayer x$prayerScale system x$system',
            (tester) async {
              final settings = await _settings({
                'prayer_text_scale': prayerScale,
              });
              await _pump(
                tester,
                settings,
                size: size,
                systemScale: system,
                index: _hailMary4,
              );
              expect(tester.takeException(), isNull);

              final header = _rect(tester, _header);
              final strip = _rect(tester, _strip);
              final actions = _rect(tester, _actions);
              final viewport = _rect(tester, _scroll);

              // 고정 높이: 머리 48, 띠 36, 하단 76. 시스템 글자가 커져도 변하지 않는다.
              expect(header.height, 48);
              expect(strip.height, 36);
              expect(actions.height, PrayerActions.height);
              expect(actions.height, 76);

              // 글 칸은 어떤 조작 요소와도 겹치지 않는다.
              expect(viewport.overlaps(header), isFalse);
              expect(viewport.overlaps(strip), isFalse);
              expect(viewport.overlaps(actions), isFalse);
              expect(viewport.top, greaterThanOrEqualTo(strip.bottom));
              expect(viewport.bottom, lessThanOrEqualTo(actions.top));

              // 남는 높이는 모두 기도문 몫(넘침 표시 칸 48 제외).
              final budget = size.height - 24 - 24 - 48 - 36 - 76;
              final pillShown = _pill.evaluate().isNotEmpty;
              expect(
                viewport.height,
                closeTo(budget - (pillShown ? 48 : 0), 0.6),
              );
              // 기본 글자·기본 배율에서는 성모송 전문이 한 화면에 들어간다. 테스트 글꼴(Ahem)은
              // 띄어쓰기·문장부호도 한 글자 폭이라 실제 시스템 글꼴보다 넓으므로, 360x640에서는
              // 넘침 표시와 스크롤 길이가 서로 맞는지만 본다(실제 맞음은 기기 글꼴에 달렸다).
              if (prayerScale == 1.0 && system == 1.0) {
                if (size.height >= 800) {
                  expect(pillShown, isFalse);
                  expect(_position(tester).maxScrollExtent, 0);
                } else {
                  expect(pillShown, _position(tester).maxScrollExtent > 0);
                }
              }

              // 맨 위: 첫 글자가 칸 안. 끝까지 밀면 마지막 글자(아멘)도 칸 안에서 보인다.
              final text = find.textContaining('은총이 가득하신');
              expect(
                _rect(tester, text).top,
                greaterThanOrEqualTo(viewport.top),
              );
              final extent = _position(tester).maxScrollExtent;
              final eff = math.max(prayerScale, system);
              if (extent > 0) {
                expect(pillShown, isTrue);
                // 숨은 줄 수와 쪽 수가 실제 스크롤 거리와 맞는다.
                final lines = (extent / (24 * eff * 1.6)).ceil();
                final pages = 1 + (extent / (viewport.height * 0.9)).ceil();
                expect(
                  find.text('↓ $lines줄 더 (쪽 1/$pages)'),
                  findsOneWidget,
                  reason: 'extent=$extent viewport=${viewport.height}',
                );
                _position(tester).jumpTo(extent);
                await tester.pump();
                expect(
                  _rect(tester, text).bottom,
                  lessThanOrEqualTo(viewport.bottom + 0.5),
                );
                // 끝에 닿으면 표시가 사라진다.
                expect(_pill, findsNothing);
                expect(tester.takeException(), isNull);
              }
            },
          );
        }
      }
    }
  });

  testWidgets('system text scale above 1.3 does not grow the chrome and is '
      'not multiplied into the prayer text', (tester) async {
    final settings = await _settings();
    await _pump(tester, settings, systemScale: 2.0, index: _hailMary4);
    expect(_rect(tester, _header).height, 48);
    expect(_rect(tester, _strip).height, 36);
    expect(_rect(tester, _actions).height, 76);
    final prayer = tester.widget<Text>(find.textContaining('은총이 가득하신').first);
    // 시스템 2.0 → 기도문 2.0배(48sp). 4.0배(96sp)가 아니다.
    expect(prayer.style!.fontSize, closeTo(48, 0.01));
    final element = tester.element(find.textContaining('은총이 가득하신').first);
    expect(MediaQuery.textScalerOf(element).scale(10), 10);
    // 머리줄 제목은 1.3배까지만.
    final title = tester.widget<Text>(find.text('고통의 신비 · 1단'));
    expect(
      MediaQuery.textScalerOf(tester.element(find.text('고통의 신비 · 1단')))
          .scale(10),
      closeTo(13, 0.01),
    );
    expect(title.maxLines, 1);
  });

  group('overflow', () {
    testWidgets('pill appears, tap scrolls one page, text tap still advances', (
      tester,
    ) async {
      final settings = await _settings({'prayer_text_scale': 2.0});
      await _pump(tester, settings, index: _hailMary4);
      expect(_pill, findsOneWidget);
      expect(find.text('성모송 4/10'), findsOneWidget);
      final position = _position(tester);
      final page = position.viewportDimension * PrayerTextView.pageFraction;
      expect(position.pixels, 0);

      await tester.tap(_pill);
      await tester.pumpAndSettle();
      expect(position.pixels, closeTo(page, 1));
      expect(find.textContaining('(쪽 2/'), findsOneWidget);

      // 손가락으로 밀면 스크롤된다(구슬은 그대로).
      await tester.drag(_scroll, const Offset(0, -200));
      await tester.pumpAndSettle();
      expect(position.pixels, greaterThan(page));
      expect(find.text('성모송 4/10'), findsOneWidget);

      // 짧게 누르면 다음 구슬.
      await tester.tap(_scroll);
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('성모송 5/10'), findsOneWidget);
      expect(_position(tester).pixels, 0);
    });

    testWidgets('no pill and no reserved space when the text fits', (
      tester,
    ) async {
      final settings = await _settings();
      await _pump(
        tester,
        settings,
        size: const Size(360, 800),
        index: _hailMary4,
      );
      expect(_pill, findsNothing);
      final viewport = _rect(tester, _scroll);
      expect(viewport.bottom, _rect(tester, _actions).top);
    });

    test('page math', () {
      expect(PrayerTextView.pageCount(0, 400), 1);
      expect(PrayerTextView.pageCount(100, 400), 2);
      expect(PrayerTextView.pageCount(360, 400), 2);
      expect(PrayerTextView.pageCount(361, 400), 3);
      expect(PrayerTextView.pageAt(0, 361, 400), 1);
      expect(PrayerTextView.pageAt(361, 361, 400), 3);
      expect(PrayerTextView.linesLeft(0.5, 38), 1);
      expect(PrayerTextView.linesLeft(77, 38), 3);
    });
  });

  group('short prayers (외운 기도 짧게 보기)', () {
    testWidgets('default is off and the full Hail Mary shows', (tester) async {
      final settings = await _settings();
      expect(settings.shortPrayers, isFalse);
      await _pump(
        tester,
        settings,
        size: const Size(360, 800),
        index: _hailMary4,
      );
      expect(find.textContaining('기뻐하소서!'), findsOneWidget);
      expect(find.text('전체 기도문 보기'), findsNothing);
    });

    testWidgets('shows opening phrases only, with a big number, and fits at '
        '2.0 on 360x640 and 360x800', (tester) async {
      for (final size in const [Size(360, 640), Size(360, 800)]) {
        final settings = await _settings({
          'prayer_text_scale': 2.0,
          'short_prayers': true,
        });
        await _pump(tester, settings, size: size, index: _hailMary4);
        expect(
          find.textContaining(ShortPrayers.hailMary.leader),
          findsOneWidget,
        );
        expect(
          find.textContaining(ShortPrayers.hailMary.responder),
          findsOneWidget,
        );
        expect(find.textContaining('기뻐하소서'), findsNothing);
        expect(find.textContaining('복되시나이다'), findsNothing);
        expect(find.text('외운 기도 짧게 보기'), findsOneWidget);
        if (size.height >= 800) {
          expect(_pill, findsNothing, reason: '$size');
          expect(_position(tester).maxScrollExtent, 0, reason: '$size');
        } else {
          // Ahem은 실제 시스템 글꼴보다 넓다. 넘쳐도 넘침 표시와 스크롤이 일치해야 한다.
          expect(
            _pill.evaluate().isNotEmpty,
            _position(tester).maxScrollExtent > 0,
            reason: '$size',
          );
        }
      }
    });

    testWidgets('full text button expands the current step only', (
      tester,
    ) async {
      final settings = await _settings({'short_prayers': true});
      await _pump(
        tester,
        settings,
        size: const Size(360, 800),
        index: _hailMary4,
      );
      await tester.tap(find.byKey(const ValueKey('prayer-short-toggle')));
      await tester.pump();
      expect(find.textContaining('기뻐하소서!'), findsOneWidget);
      expect(find.text('짧게 보기'), findsOneWidget);
      // 다음 구슬은 다시 짧게.
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.textContaining('기뻐하소서'), findsNothing);
      expect(find.textContaining(ShortPrayers.hailMary.leader), findsOneWidget);
    });

    testWidgets('sign of cross, creed, mystery announcement and glory are '
        'always in full', (tester) async {
      final settings = await _settings({'short_prayers': true});
      final session = RosarySession(buildRosarySequence(_set));
      addTearDown(session.dispose);
      await _pump(
        tester,
        settings,
        size: const Size(360, 800),
        session: session,
      );
      expect(find.textContaining('성부와 성자와 성령의 이름으로.'), findsOneWidget);
      expect(find.text('전체 기도문 보기'), findsNothing);

      Future<void> goto(int i) async {
        session.jumpTo(i);
        await tester.pump(const Duration(milliseconds: 300));
      }

      await goto(1);
      expect(find.textContaining('영원한 삶을 믿나이다.'), findsOneWidget);
      expect(find.text('전체 기도문 보기'), findsNothing);

      // 서두의 주님의 기도(전문)와 서두 성모송(짧게).
      await goto(2);
      expect(find.textContaining('악에서 구하소서.'), findsOneWidget);
      await goto(3);
      expect(find.textContaining('복되시나이다'), findsNothing);

      // 1단 첫 구슬: 신비 안내는 전문, 주님의 기도는 짧게.
      final decadeStart = _indexOf(
        (s) => s.kind == StepKind.ourFather && s.decade == 1,
      );
      await goto(decadeStart);
      expect(find.textContaining('피땀 흘리심을 묵상합시다.'), findsOneWidget);
      expect(
        find.textContaining(ShortPrayers.ourFather.leader),
        findsOneWidget,
      );
      expect(find.textContaining('악에서 구하소서'), findsNothing);

      final glory = _indexOf(
        (s) => s.kind == StepKind.gloryBe && s.decade == 1,
      );
      await goto(glory);
      expect(find.textContaining('이제와 항상 영원히.'), findsOneWidget);
      expect(find.text('전체 기도문 보기'), findsNothing);
    });

    testWidgets('leader/responder mode keeps the role label', (tester) async {
      final settings = await _settings({
        'short_prayers': true,
        'prayer_mode': PrayerMode.responder.name,
        'leader_audio': false,
      });
      await _pump(
        tester,
        settings,
        size: const Size(360, 800),
        index: _hailMary4,
      );
      expect(find.text('내 차례: 뒷단'), findsOneWidget);
      expect(
        find.textContaining(ShortPrayers.hailMary.responder),
        findsOneWidget,
      );
    });

    test('every short form is an opening phrase of the official text', () {
      void check(String shortLine, Prayer p, int line) {
        final full = p.text.split('\n')[line];
        final head = shortLine.replaceAll('…', '').trim();
        expect(full.startsWith(head), isTrue, reason: '"$head" vs "$full"');
      }

      check(ShortPrayers.hailMary.leader, Prayers.hailMary, 0);
      check(ShortPrayers.hailMary.responder, Prayers.hailMary, 3);
      check(ShortPrayers.ourFather.leader, Prayers.ourFather, 0);
      check(ShortPrayers.ourFather.responder, Prayers.ourFather, 5);
      check(ShortPrayers.fatima.leader, Prayers.fatima, 0);
      check(ShortPrayers.fatima.responder, Prayers.fatima, 2);
      // 늘 전문인 기도는 짧은 형태가 없다.
      for (final s in _steps) {
        final short = ShortPrayers.of(s);
        final always =
            s.kind == StepKind.signOfCross ||
            s.kind == StepKind.apostlesCreed ||
            s.kind == StepKind.gloryBe ||
            s.kind == StepKind.closing ||
            (s.kind == StepKind.ourFather && s.decade == null);
        expect(short == null, always, reason: s.title);
      }
    });
  });

  group('suggestion (one time at prayer scale >= 1.6)', () {
    testWidgets('is shown once, remembered, and can turn the setting on', (
      tester,
    ) async {
      final settings = await _settings({'prayer_text_scale': 1.6});
      expect(settings.shortPrayersAsked, isFalse);
      await _pump(tester, settings, index: _hailMary4);
      expect(find.textContaining('외운 기도는 첫머리만'), findsOneWidget);
      expect(settings.shortPrayersAsked, isTrue);
      expect(settings.shortPrayers, isFalse);

      await tester.tap(find.text('켜기'));
      await tester.pump();
      expect(settings.shortPrayers, isTrue);
      await tester.pumpAndSettle();
    });

    testWidgets('그대로 keeps it off and never asks again', (tester) async {
      final settings = await _settings({'prayer_text_scale': 2.0});
      await _pump(tester, settings, index: _hailMary4);
      expect(find.text('그대로'), findsOneWidget);
      await tester.tap(find.text('그대로'));
      await tester.pumpAndSettle();
      expect(settings.shortPrayers, isFalse);
      expect(find.textContaining('외운 기도는 첫머리만'), findsNothing);

      // 새 화면을 열어도 다시 묻지 않는다.
      await tester.pumpWidget(const SizedBox());
      await _pump(tester, settings, index: _hailMary4);
      expect(find.textContaining('외운 기도는 첫머리만'), findsNothing);
    });

    testWidgets('not shown below 1.6 or once answered', (tester) async {
      var settings = await _settings({'prayer_text_scale': 1.5});
      await _pump(tester, settings, index: _hailMary4);
      expect(find.textContaining('외운 기도는 첫머리만'), findsNothing);
      expect(settings.shortPrayersAsked, isFalse);

      await tester.pumpWidget(const SizedBox());
      settings = await _settings({
        'prayer_text_scale': 2.0,
        'short_prayers_asked': true,
      });
      await _pump(tester, settings, index: _hailMary4);
      expect(find.textContaining('외운 기도는 첫머리만'), findsNothing);
    });

    testWidgets('the text size sheet has the switch and answers the question', (
      tester,
    ) async {
      final settings = await _settings();
      await _pump(tester, settings, index: _hailMary4);
      await tester.tap(find.byTooltip('글자 크기'));
      await tester.pumpAndSettle();
      final tile = find.byKey(const ValueKey('sheet-short-prayers'));
      expect(tile, findsOneWidget);
      await tester.tap(tile);
      await tester.pumpAndSettle();
      expect(settings.shortPrayers, isTrue);
      expect(settings.shortPrayersAsked, isTrue);
    });
  });

  group('map sheet (묵주 전체 보기)', () {
    Future<void> openSheet(WidgetTester tester) async {
      await tester.tap(_strip);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
    }

    testWidgets('opens from the strip; bead tap jumps; auto closes after 4 s '
        'of no touch', (tester) async {
      final settings = await _settings();
      await _pump(tester, settings, index: _hailMary4);
      expect(find.byType(RosaryMap), findsNothing);
      await openSheet(tester);
      expect(find.byType(RosaryMapSheet), findsOneWidget);
      expect(find.text('묵주 전체 보기'), findsOneWidget);
      expect(find.text('이 단 처음으로'), findsOneWidget);
      expect(find.text('닫고 계속'), findsOneWidget);

      // 2단 3번째 성모송 구슬을 누른다.
      final map = find.byKey(const ValueKey('prayer-map-sheet-map'));
      final box = tester.getRect(map);
      final slots = layoutBeads(box.size);
      final target = slots[RosarySlots.decadeBead(2, 3)].center + box.topLeft;
      await tester.tapAt(target);
      await tester.pump(const Duration(milliseconds: 100));
      final expected = _indexOf(
        (s) => s.kind == StepKind.hailMary && s.decade == 2 && s.beadIndex == 3,
      );
      expect(settings.savedPrayer?.stepIndex, expected);
      expect(find.text('성모송 3/10'), findsWidgets);

      // 닿을 때마다 4초를 다시 센다.
      await tester.pump(const Duration(seconds: 3));
      expect(find.byType(RosaryMapSheet), findsOneWidget);
      await tester.tapAt(box.topLeft + const Offset(2, 2)); // 빈 곳
      await tester.pump(const Duration(seconds: 3));
      expect(find.byType(RosaryMapSheet), findsOneWidget);
      await tester.pump(const Duration(milliseconds: 1200));
      await tester.pump(const Duration(milliseconds: 500));
      expect(find.byType(RosaryMapSheet), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('이 단 처음으로 and 닫고 계속', (tester) async {
      final settings = await _settings();
      await _pump(tester, settings, index: _hailMary4);
      await openSheet(tester);
      await tester.tap(find.text('이 단 처음으로'));
      await tester.pump(const Duration(milliseconds: 100));
      final start = _indexOf(
        (s) => s.kind == StepKind.ourFather && s.decade == 1,
      );
      expect(settings.savedPrayer?.stepIndex, start);

      await tester.tap(find.text('닫고 계속'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
      expect(find.byType(RosaryMapSheet), findsNothing);
      // 신비 안내가 있는 첫 구슬로 돌아와 있다.
      expect(find.textContaining('피땀 흘리심'), findsWidgets);
    });

    testWidgets('a long drag on the sheet map still moves exactly one bead', (
      tester,
    ) async {
      final settings = await _settings();
      await _pump(
        tester,
        settings,
        size: const Size(360, 800),
        index: _hailMary4,
      );
      await openSheet(tester);
      final map = find.byKey(const ValueKey('prayer-map-sheet-map'));
      final g = await tester.startGesture(tester.getCenter(map));
      for (var i = 0; i < 12; i++) {
        await g.moveBy(const Offset(0, 20));
        await tester.pump(const Duration(milliseconds: 16));
      }
      await g.up();
      await tester.pump(const Duration(milliseconds: 400));
      expect(settings.savedPrayer?.stepIndex, _hailMary4 + 1);
      await tester.pump(const Duration(seconds: 5));
      await tester.pump(const Duration(milliseconds: 500));
    });

    testWidgets('sheet has no timers left when closed by the button', (
      tester,
    ) async {
      final settings = await _settings();
      await _pump(tester, settings, index: _hailMary4);
      await openSheet(tester);
      await tester.tap(find.text('닫고 계속'));
      await tester.pumpAndSettle();
      expect(find.byType(RosaryMapSheet), findsNothing);
    });

    test('slot hit testing and slot -> step mapping', () {
      const size = Size(300, 400);
      final slots = layoutBeads(size);
      for (var i = 0; i < slots.length; i++) {
        expect(slotAtPoint(slots, slots[i].center), i);
      }
      expect(slotAtPoint(slots, const Offset(-500, -500)), isNull);
      expect(stepIndexForSlot(_steps, RosarySlots.crucifix), 0);
      expect(
        _steps[stepIndexForSlot(_steps, RosarySlots.decadeBead(1, 10))!].kind,
        StepKind.hailMary,
      );
      for (var s = 0; s < RosarySlots.count; s++) {
        final i = stepIndexForSlot(_steps, s);
        expect(i, isNotNull, reason: 'slot $s');
        expect(slotIndexForStep(_steps[i!]), s);
      }
    });
  });

  group('bead strip', () {
    test('model: decade, intro and closing', () {
      final hm4 = stripModelFor(_steps[_hailMary4]);
      expect(hm4.beads.length, 12);
      expect(hm4.current, 4);
      expect(hm4.label, '1/5단');
      final of = stripModelFor(
        _steps[_indexOf((s) => s.kind == StepKind.ourFather && s.decade == 3)],
      );
      expect(of.current, 0);
      expect(of.decade, 3);
      final glory = stripModelFor(
        _steps[_indexOf((s) => s.kind == StepKind.gloryBe && s.decade == 2)],
      );
      expect(glory.current, 11);
      expect(stripModelFor(_steps.first).label, '서두');
      expect(stripModelFor(_steps.first).current, 0);
      final closing = stripModelFor(_steps.last);
      expect(closing.label, '마침');
      expect(closing.current, closing.beads.length - 1);
      expect(closing.decade, 6);
    });

    testWidgets('shows current prayer, decade n/5 and is a button', (
      tester,
    ) async {
      final settings = await _settings();
      await _pump(tester, settings, index: _hailMary4);
      expect(find.text('성모송 4/10'), findsOneWidget);
      expect(find.text('1/5단'), findsOneWidget);
      expect(find.byKey(const ValueKey('prayer-strip-dots')), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('묵주 전체 보기')), findsWidgets);
    });
  });

  testWidgets('header menu has map, short toggle and end', (tester) async {
    final settings = await _settings();
    await _pump(tester, settings, index: _hailMary4);
    await tester.tap(find.byKey(const ValueKey('prayer-menu')));
    await tester.pumpAndSettle();
    expect(find.text('묵주 전체 보기'), findsOneWidget);
    expect(find.text('외운 기도 짧게 보기'), findsOneWidget);
    expect(find.text('기도 끝내기'), findsOneWidget);
    await tester.tap(find.text('외운 기도 짧게 보기'), warnIfMissed: false);
    await tester.pumpAndSettle();
    expect(settings.shortPrayers, isTrue);
  });

  testWidgets('wide landscape keeps two panes and the text never sits under '
      'the controls', (tester) async {
    final settings = await _settings({'prayer_text_scale': 2.0});
    await _pump(
      tester,
      settings,
      size: const Size(640, 360),
      index: _hailMary4,
    );
    final text = _rect(tester, _scroll);
    final map = _rect(tester, find.byType(RosaryMap));
    final header = _rect(tester, _header);
    final actions = _rect(tester, _actions);
    expect(text.right, lessThanOrEqualTo(map.left));
    expect(text.overlaps(header), isFalse);
    expect(text.overlaps(actions), isFalse);
    expect(tester.takeException(), isNull);
  });
}
