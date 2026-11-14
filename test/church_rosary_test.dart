// 성당 안 '기도하기' 시트와 묵주기도 하기(SPEC §32): 선택 시트(항목·기본값·기억·신비 바꾸기·배치),
// 묵주기도 선택 → 묵주를 들고 자리로 → 카드/세션 시작 → 쉬기·마침 정리, 와이어 `r`/`ro`, 복원 상태.
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/analytics.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_prayer_card.dart';
import 'package:rosary_app/church/church_prayer_choice_sheet.dart';
import 'package:rosary_app/church/church_resume_state.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/net/church_net.dart';
import 'package:rosary_app/church/net/church_protocol.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_session.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';

Future<void> _settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 20));
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pump();
}

const _brief = ValueKey('pray-brief');
const _rosary = ValueKey('pray-rosary');
const _change = ValueKey('pray-change-mystery');

MysterySet get _today => mysterySetForWeekday(DateTime.now().weekday);
MysterySet get _other =>
    MysterySet.values[(_today.index + 1) % MysterySet.values.length];

/// 제대 앞에 서서 '기도하기'를 눌러 시트를 연다.
Future<void> _openSheet(WidgetTester tester, ChurchHarness h) async {
  h.scene.emit(const SceneNear(station: 'altar'));
  await _settle(tester);
  await tester.tap(find.text('기도하기'));
  await _settle(tester);
}

/// '묵주기도 하기'를 고르고, 웹이 가까운 자리까지 걸어가 앉힌 것까지 흉내 낸다.
Future<void> _chooseRosaryAndSit(
  WidgetTester tester,
  ChurchHarness h, {
  String seat = 'L03-2',
}) async {
  await _openSheet(tester, h);
  await tester.tap(find.byKey(_rosary));
  await _settle(tester);
  h.scene.emit(const SceneWalkStart('seat'));
  h.scene.emit(SceneNear(seat: seat));
  h.scene.emit(SceneWalkDone('seat', seat: seat));
  await tester.pump();
  h.scene.emit(SceneSeated(seat));
  await _settle(tester);
}

List<bool> _rosaryCalls(ChurchHarness h) => [
  for (final a in h.scene.argsOf('setRosary')) a['on']! as bool,
];

Widget _sheetHost(
  AppSettings settings, {
  Brightness brightness = Brightness.light,
  double textScale = 1,
  MysterySet? resumeSet,
  void Function(ChurchPrayerPick?)? onPick,
}) => MaterialApp(
  theme: (brightness == Brightness.dark ? AppTheme.dark() : AppTheme.light())
      .copyWith(splashFactory: InkRipple.splashFactory),
  builder: (context, c) => MediaQuery(
    data: MediaQuery.of(context)
        .copyWith(textScaler: TextScaler.linear(textScale)),
    child: c!,
  ),
  home: Scaffold(
    body: Builder(
      builder: (context) => Center(
        child: TextButton(
          onPressed: () async {
            final r = await showChurchPrayerChoiceSheet(
              context,
              settings: settings,
              resumeSet: resumeSet,
            );
            onPick?.call(r);
          },
          child: const Text('open'),
        ),
      ),
    ),
  ),
);

void main() {
  group('wire r / ro', () {
    test('pray message carries r:1 only while praying with a rosary', () {
      expect(jsonDecode(prayMessage(true, 2)), {
        't': 'pray',
        'on': true,
        'ms': 2,
      });
      expect(jsonDecode(prayMessage(true, 2, rosary: true)), {
        't': 'pray',
        'on': true,
        'ms': 2,
        'r': 1,
      });
      expect(jsonDecode(prayMessage(true, 0, kneel: true, rosary: true)), {
        't': 'pray',
        'on': true,
        'ms': 0,
        'k': 1,
        'r': 1,
      });
      expect(jsonDecode(prayMessage(false, -1, rosary: true)), {
        't': 'pray',
        'on': false,
        'ms': -1,
      });
    });

    test('praying r and peer ro are parsed and passed to the scene json', () {
      final a = parseChurchEvent(
        '{"t":"praying","id":"p1","on":true,"ms":1,"r":1}',
      );
      expect((a! as Praying).rosary, isTrue);
      expect((a as Praying).kneel, isFalse);
      final b = parseChurchEvent('{"t":"praying","id":"p1","on":true,"ms":1}');
      expect((b! as Praying).rosary, isFalse);
      // 기도 중이 아니면 뜻이 없다. 0|1 이 아닌 값도 무시.
      for (final raw in [
        '{"t":"praying","id":"p1","on":false,"ms":-1,"r":1}',
        '{"t":"praying","id":"p1","on":true,"ms":1,"r":"1"}',
        '{"t":"praying","id":"p1","on":true,"ms":1,"r":true}',
        '{"t":"praying","id":"p1","on":true,"ms":1,"r":2}',
      ]) {
        expect((parseChurchEvent(raw)! as Praying).rosary, isFalse);
      }
      // 피어 상태에서 r 은 방향(yaw)이다. 묵주는 ro.
      final p = parsePeer({
        'id': 'p2',
        'st': 'p',
        'seat': 'L01-0',
        'ms': 0,
        'r': 1,
        'ro': 1,
      })!;
      expect(p.rosary, isTrue);
      expect(p.r, 1.0);
      expect(p.toJson()['ro'], 1);
      final q = parsePeer({
        'id': 'p2',
        'st': 'p',
        'seat': 'L01-0',
        'ms': 0,
        'r': 1,
      })!;
      expect(q.rosary, isFalse);
      expect(q.toJson().containsKey('ro'), isFalse);
      expect(p == q, isFalse);
    });

    test('scene state / resume state carry the rosary', () {
      final e = SceneEvent.parse(
        '{"e":"state","church":"basic","x":1,"z":2,"seat":"L03-2","rosary":1}',
      );
      expect((e! as SceneState).rosary, isTrue);
      expect(
        (SceneEvent.parse('{"e":"state","church":"basic","x":1,"z":2}')!
                as SceneState)
            .rosary,
        isFalse,
      );
      const st = ChurchResumeState(
        churchId: 'basic',
        x: 1,
        z: 2,
        seat: 'L03-2',
        rosary: true,
        savedAtMs: 5,
      );
      expect(st.toJson()['rosary'], true);
      expect(st.toSceneArgs()['rosary'], 1);
      expect(ChurchResumeState.decode(st.encode()), st);
      const none = ChurchResumeState(churchId: 'basic', x: 1, z: 2);
      expect(none.toJson().containsKey('rosary'), isFalse);
      expect(none.toSceneArgs().containsKey('rosary'), isFalse);
      expect(ChurchResumeState.decode(none.encode())!.rosary, isFalse);
      expect(st == none, isFalse);
      // 앱이 아는 값으로 덮어쓴다. 주지 않으면 그대로.
      expect(st.withSeat('L03-2').rosary, isTrue);
      expect(st.withSeat('L03-2', rosary: false).rosary, isFalse);
      expect(none.withSeat(null, rosary: true).rosary, isTrue);
      // 깨진 값은 false
      expect(
        ChurchResumeState.fromJson({
          'church': 'basic',
          'x': 1,
          'z': 2,
          'rosary': 'yes',
        })!.rosary,
        isFalse,
      );
    });
  });

  group('setting churchPrayerChoice', () {
    test('defaults to brief, is saved under churchPrayerChoice', () async {
      SharedPreferences.setMockInitialValues({});
      final s = await AppSettings.load();
      expect(s.churchPrayerChoice, ChurchPrayerChoice.brief);
      var n = 0;
      s.addListener(() => n++);
      s.churchPrayerChoice = ChurchPrayerChoice.rosary;
      s.churchPrayerChoice = ChurchPrayerChoice.rosary;
      expect(n, 1);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('churchPrayerChoice'), 'rosary');
      expect(
        (await AppSettings.load()).churchPrayerChoice,
        ChurchPrayerChoice.rosary,
      );
      SharedPreferences.setMockInitialValues({'churchPrayerChoice': 'nope'});
      expect(
        (await AppSettings.load()).churchPrayerChoice,
        ChurchPrayerChoice.brief,
      );
    });
  });

  group('choice sheet', () {
    testWidgets('two items; the last choice (default brief) is highlighted', (
      tester,
    ) async {
      setView(tester, const Size(360, 800));
      final settings = await loadSettings();
      ChurchPrayerPick? got;
      await tester.pumpWidget(_sheetHost(settings, onPick: (p) => got = p));
      await tester.tap(find.text('open'));
      await _settle(tester);
      expect(find.text('어떻게 기도할까요?'), findsOneWidget);
      expect(find.text('잠시 기도하기'), findsOneWidget);
      expect(find.text('묵주기도 하기'), findsOneWidget);
      expect(find.textContaining('십자가의 길'), findsNothing);
      // 묵주 그림(기존 에셋) 또는 대체 아이콘
      expect(
        find.byKey(const ValueKey('pray-rosary-image')).evaluate().length +
            find.byKey(const ValueKey('pray-rosary-icon')).evaluate().length,
        1,
      );
      // 오늘의 신비가 부제에 보인다
      expect(
        find.textContaining('오늘의 신비: ${_today.koreanName}'),
        findsOneWidget,
      );
      Material tile(Key k) => tester.widget<Material>(
        find.descendant(of: find.byKey(k), matching: find.byType(Material)),
      );
      final scheme = AppTheme.light().colorScheme;
      expect(tile(_brief).color, scheme.secondaryContainer);
      expect(tile(_rosary).color, isNot(scheme.secondaryContainer));
      // 터치 영역: 48dp 이상
      expect(
        tester.getSize(find.byKey(_brief)).height,
        greaterThanOrEqualTo(72),
      );
      expect(
        tester.getSize(find.byKey(_rosary)).height,
        greaterThanOrEqualTo(72),
      );
      await tester.tap(find.byKey(_brief));
      await _settle(tester);
      expect(got!.kind, ChurchPrayerChoice.brief);
      expect(got!.mysterySet, isNull);

      // 지난번에 묵주기도를 골랐으면 그 항목이 강조된다
      settings.churchPrayerChoice = ChurchPrayerChoice.rosary;
      await tester.tap(find.text('open'));
      await _settle(tester);
      expect(tile(_rosary).color, scheme.secondaryContainer);
      expect(tile(_brief).color, isNot(scheme.secondaryContainer));
      await tester.tap(find.byKey(_rosary));
      await _settle(tester);
      expect(got!.kind, ChurchPrayerChoice.rosary);
      expect(got!.mysterySet, _today);
      // 닫으면 null
      await tester.tap(find.text('open'));
      await _settle(tester);
      await tester.tapAt(const Offset(180, 40));
      await _settle(tester);
      expect(got, isNull);
    });

    testWidgets('신비 바꾸기: chips change the mystery; resume is preselected', (
      tester,
    ) async {
      setView(tester, const Size(360, 800));
      final settings = await loadSettings();
      ChurchPrayerPick? got;
      await tester.pumpWidget(_sheetHost(settings, onPick: (p) => got = p));
      await tester.tap(find.text('open'));
      await _settle(tester);
      expect(find.byKey(const ValueKey('pray-mystery-chips')), findsNothing);
      await tester.tap(find.byKey(_change));
      await _settle(tester);
      expect(find.byType(ChoiceChip), findsNWidgets(4));
      expect(find.text('${_today.koreanName} · 오늘'), findsOneWidget);
      await tester.tap(find.byKey(ValueKey('pray-mystery-${_other.name}')));
      await _settle(tester);
      // 오늘의 신비가 아니면 이름만
      expect(find.textContaining('오늘의 신비:'), findsNothing);
      expect(
        tester
            .widget<ChoiceChip>(
              find.byKey(ValueKey('pray-mystery-${_other.name}')),
            )
            .selected,
        isTrue,
      );
      await tester.tap(find.byKey(_rosary));
      await _settle(tester);
      expect(got!.mysterySet, _other);

      // 홈에서 고른 신비가 기본값
      settings.mysterySet = _other;
      await tester.tap(find.text('open'));
      await _settle(tester);
      await tester.tap(find.byKey(_rosary));
      await _settle(tester);
      expect(got!.mysterySet, _other);

      // 저장된 진행분이 있으면 그 신비로 '이어서 하기'
      final saved =
          MysterySet.values[(_today.index + 2) % MysterySet.values.length];
      settings.saveProgress(saved, 12);
      await tester.tap(find.text('open'));
      await _settle(tester);
      expect(
        find.textContaining('이어서 하기: ${saved.koreanName}'),
        findsOneWidget,
      );
      await tester.tap(find.byKey(_rosary));
      await _settle(tester);
      expect(got!.mysterySet, saved);
    });

    testWidgets('semantics: 묵주기도 하기, 오늘의 신비: …', (tester) async {
      final handle = tester.ensureSemantics();
      setView(tester, const Size(360, 800));
      final settings = await loadSettings();
      await tester.pumpWidget(_sheetHost(settings));
      await tester.tap(find.text('open'));
      await _settle(tester);
      final label = '묵주기도 하기, 오늘의 신비: ${_today.koreanName}';
      expect(find.bySemanticsLabel(label), findsOneWidget);
      final node = tester.getSemantics(find.bySemanticsLabel(label));
      final data = node.getSemanticsData();
      expect(data.hasAction(SemanticsAction.tap), isTrue);
      expect(data.flagsCollection.isButton, isTrue);
      expect(
        find.bySemanticsLabel('잠시 기도하기, 제대 앞에서 고개 숙여 기도해요'),
        findsOneWidget,
      );
      handle.dispose();
    });

    for (final size in const [Size(360, 800), Size(412, 915), Size(360, 640)]) {
      for (final b in Brightness.values) {
        for (final scale in const [1.0, 2.0]) {
          testWidgets(
            'layout ${size.width.toInt()}x${size.height.toInt()} ${b.name} x$scale: no overflow / overlap',
            (tester) async {
              setView(tester, size);
              final settings = await loadSettings();
              await tester.pumpWidget(
                _sheetHost(settings, brightness: b, textScale: scale),
              );
              await tester.tap(find.text('open'));
              await _settle(tester);
              // 작은 화면·큰 글자에서는 시트 안을 스크롤해 닿는다
              await tester.ensureVisible(find.byKey(_change));
              await _settle(tester);
              await tester.tap(find.byKey(_change));
              await _settle(tester);
              await tester.ensureVisible(find.text('어떻게 기도할까요?'));
              await _settle(tester);
              expect(tester.takeException(), isNull);
              final title = tester.getRect(find.text('어떻게 기도할까요?'));
              final a = tester.getRect(find.byKey(_brief));
              final r = tester.getRect(find.byKey(_rosary));
              final c = tester.getRect(find.byKey(_change));
              expect(title.bottom, lessThanOrEqualTo(a.top + 0.5));
              expect(a.bottom, lessThanOrEqualTo(r.top + 0.5));
              expect(r.bottom, lessThanOrEqualTo(c.top + 0.5));
              for (final rect in [title, a, r]) {
                expect(rect.left, greaterThanOrEqualTo(0));
                expect(rect.right, lessThanOrEqualTo(size.width));
              }
              // 글자가 항목 밖으로 나가지 않는다
              for (final t in ['잠시 기도하기', '묵주기도 하기']) {
                final tr = tester.getRect(find.text(t));
                expect(tr.right, lessThanOrEqualTo(size.width - 16));
              }
              final sub = tester.getRect(find.textContaining('오늘의 신비:'));
              expect(
                r.contains(sub.topLeft) && r.contains(sub.bottomRight),
                isTrue,
              );
              // 신비 칩까지 스크롤해서 닿을 수 있다(화면이 작고 글자가 커도)
              final last = find.byKey(
                ValueKey('pray-mystery-${MysterySet.values.last.name}'),
              );
              await tester.ensureVisible(last);
              await _settle(tester);
              final lr = tester.getRect(last);
              expect(lr.bottom, lessThanOrEqualTo(size.height));
              expect(lr.right, lessThanOrEqualTo(size.width));
              expect(tester.takeException(), isNull);
            },
          );
        }
      }
    }
  });

  group('in the church', () {
    testWidgets('잠시 기도하기: bows, remembers brief, no rosary', (tester) async {
      final h = await pumpChurch(tester, size: const Size(360, 800));
      await _openSheet(tester, h);
      expect(find.byKey(_brief), findsOneWidget);
      expect(find.byKey(_rosary), findsOneWidget);
      await tester.tap(find.byKey(_brief));
      await _settle(tester);
      expect(h.scene.lastArgs('emote'), {'e': 2});
      expect(h.net.emotes, [2]);
      expect(h.settings.churchPrayerChoice, ChurchPrayerChoice.brief);
      expect(h.scene.count('setRosary'), 0);
      expect(h.scene.count('walkTo'), 0);
      expect(find.byType(ChurchPrayerCard), findsNothing);
      expect(find.text('기도하기'), findsNothing);
    });

    testWidgets('closing the sheet does nothing and the button stays', (
      tester,
    ) async {
      final h = await pumpChurch(tester, size: const Size(360, 800));
      await _openSheet(tester, h);
      await tester.tapAt(const Offset(180, 40));
      await _settle(tester);
      expect(h.scene.count('emote'), 0);
      expect(h.scene.count('setRosary'), 0);
      expect(find.text('기도하기'), findsOneWidget);
    });

    testWidgets(
      '묵주기도 하기: holds the rosary, walks to the nearest seat, sits, opens the rosary card',
      (tester) async {
        final h = await pumpChurch(tester, size: const Size(360, 800));
        await _openSheet(tester, h);
        await tester.tap(find.byKey(_rosary));
        await _settle(tester);
        expect(h.settings.churchPrayerChoice, ChurchPrayerChoice.rosary);
        // 묵주를 손에 들고 가까운 빈 자리로 걷는다
        expect(_rosaryCalls(h), [true]);
        expect(h.scene.walkKinds, ['seat']);
        expect(find.byType(ChurchPrayerCard), findsNothing);
        expect(h.net.prayings, isEmpty, reason: '서 있는 동안은 기도 상태를 보내지 않는다');
        h.scene.emit(const SceneWalkStart('seat'));
        await _settle(tester);
        expect(find.byKey(const ValueKey('walk-chip')), findsOneWidget);
        // 도착: 바로 앉는다(앉기 단추를 누를 필요가 없다)
        h.scene.emit(const SceneNear(seat: 'L03-2'));
        h.scene.emit(const SceneWalkDone('seat', seat: 'L03-2'));
        await tester.pump();
        expect(h.net.sits, ['L03-2']);
        expect(h.scene.lastArgs('sit'), {'seat': 'L03-2'});
        h.scene.emit(const SceneSeated('L03-2'));
        await _settle(tester);
        // 묵주기도 카드(오늘의 신비, 처음부터)
        expect(find.byType(ChurchPrayerCard), findsOneWidget);
        expect(find.text('지금 기도 중'), findsOneWidget);
        expect(
          find.textContaining('${_today.koreanName} · 서두'),
          findsOneWidget,
        );
        expect(h.scene.lastArgs('setPraying'), {
          'on': true,
          'ms': _today.index,
        });
        expect(h.net.prayings.last, (true, _today.index));
        expect(h.net.rosaries.last, isTrue, reason: '다른 사람에게도 묵주가 보인다(r:1)');
        expect(_rosaryCalls(h), [true], reason: '이미 들고 있으니 다시 알리지 않는다');

        // 잠깐 쉬기: 묵주를 내려놓는다 → 이어 기도: 다시 든다
        await tester.tap(find.byKey(const ValueKey('prayer-menu')));
        await _settle(tester);
        await tester.tap(find.text('잠깐 쉬기'));
        await _settle(tester);
        expect(_rosaryCalls(h), [true, false]);
        expect(h.net.prayings.last.$1, isFalse);
        expect(h.net.rosaries.last, isFalse);
        await tester.tap(find.byKey(const ValueKey('prayer-menu')));
        await _settle(tester);
        await tester.tap(find.text('이어 기도'));
        await _settle(tester);
        expect(_rosaryCalls(h), [true, false, true]);
        expect(h.net.rosaries.last, isTrue);

        // 무릎 꿇어도 묵주는 그대로(k 와 r 을 함께 보낸다)
        await tester.tap(find.text('무릎 꿇고'));
        await tester.pump();
        expect(h.net.kneels.last, isTrue);
        expect(h.net.rosaries.last, isTrue);

        // 일어나기: 묵주를 내려놓고 카드가 닫힌다
        await tester.tap(find.byKey(const ValueKey('prayer-stand')));
        await _settle(tester);
        expect(_rosaryCalls(h), [true, false, true, false]);
        expect(h.net.stands, 1);
        expect(find.byType(ChurchPrayerCard), findsNothing);
      },
    );

    testWidgets('already next to a seat: sits at once (no walk)', (
      tester,
    ) async {
      final h = await pumpChurch(tester, size: const Size(360, 800));
      h.scene.emit(const SceneNear(station: 'altar', seat: 'L00-0'));
      await _settle(tester);
      await tester.tap(find.text('기도하기'));
      await _settle(tester);
      await tester.tap(find.byKey(_rosary));
      await _settle(tester);
      expect(h.scene.count('walkTo'), 0);
      expect(h.net.sits, ['L00-0']);
      expect(_rosaryCalls(h), [true]);
    });

    testWidgets('a mystery picked in the sheet is the one the card prays', (
      tester,
    ) async {
      final h = await pumpChurch(tester, size: const Size(360, 800));
      await _openSheet(tester, h);
      await tester.tap(find.byKey(_change));
      await _settle(tester);
      await tester.tap(find.byKey(ValueKey('pray-mystery-${_other.name}')));
      await _settle(tester);
      await tester.tap(find.byKey(_rosary));
      await _settle(tester);
      h.scene.emit(const SceneNear(seat: 'L03-2'));
      h.scene.emit(const SceneWalkDone('seat', seat: 'L03-2'));
      await tester.pump();
      h.scene.emit(const SceneSeated('L03-2'));
      await _settle(tester);
      expect(find.textContaining('${_other.koreanName} · 서두'), findsOneWidget);
      expect(h.net.prayings.last, (true, _other.index));
    });

    testWidgets(
      'walk cancelled or failed: the rosary is put away, no auto-sit',
      (tester) async {
        final h = await pumpChurch(tester, size: const Size(360, 800));
        await _openSheet(tester, h);
        await tester.tap(find.byKey(_rosary));
        await _settle(tester);
        h.scene.emit(const SceneWalkStart('seat'));
        await tester.pump();
        h.scene.emit(const SceneWalkCancel('seat'));
        await tester.pump();
        expect(_rosaryCalls(h), [true, false]);
        // 나중에 다른 걸음으로 자리에 가도 저절로 앉지 않는다
        h.scene.emit(const SceneNear(seat: 'L03-2'));
        h.scene.emit(const SceneWalkDone('seat', seat: 'L03-2'));
        await _settle(tester);
        expect(h.net.sits, isEmpty);
        expect(find.text('앉기'), findsOneWidget);

        // 길을 못 찾음
        h.scene.emit(const SceneNear(station: 'altar'));
        await _settle(tester);
        await tester.tap(find.text('기도하기'));
        await _settle(tester);
        await tester.tap(find.byKey(_rosary));
        await _settle(tester);
        h.scene.emit(const SceneWalkFail('seat'));
        await _settle(tester);
        expect(_rosaryCalls(h), [true, false, true, false]);
        expect(find.text('그곳으로 가는 길을 찾지 못했어요'), findsOneWidget);
        await tester.pump(const Duration(seconds: 5));
      },
    );

    testWidgets('seat taken: stands up and puts the rosary away', (
      tester,
    ) async {
      final h = await pumpChurch(tester, size: const Size(360, 800));
      await _openSheet(tester, h);
      await tester.tap(find.byKey(_rosary));
      await _settle(tester);
      h.scene.emit(const SceneNear(seat: 'L03-2'));
      h.scene.emit(const SceneWalkDone('seat', seat: 'L03-2'));
      await tester.pump();
      h.net.emit(const SeatDenied('L03-2', 'taken'));
      await _settle(tester);
      expect(_rosaryCalls(h), [true, false]);
      expect(find.byType(ChurchPrayerCard), findsNothing);
      await tester.pump(const Duration(seconds: 5));
    });

    testWidgets('앉기(시트 없이): the rosary card opens as before, with the rosary', (
      tester,
    ) async {
      final h = await pumpChurch(tester, size: const Size(360, 800));
      h.scene.emit(const SceneNear(seat: 'L03-2'));
      await _settle(tester);
      await tester.tap(find.text('앉기'));
      await tester.pump();
      expect(_rosaryCalls(h), isEmpty);
      h.scene.emit(const SceneSeated('L03-2'));
      await _settle(tester);
      expect(find.byType(ChurchPrayerCard), findsOneWidget);
      expect(_rosaryCalls(h), [true]);
      expect(h.net.rosaries.last, isTrue);
      expect(find.byKey(_brief), findsNothing, reason: '앉을 때는 시트를 띄우지 않는다');
    });

    testWidgets(
      'finishing the rosary puts it away; ⋮ 전체 화면 shares the session',
      (tester) async {
        RosarySession? shared;
        MysterySet? sharedSet;
        final h = await pumpChurch(
          tester,
          size: const Size(360, 800),
          prayerScreenBuilder: (c, m, s) {
            sharedSet = m as MysterySet;
            shared = s as RosarySession;
            return const Scaffold(body: Text('full-screen-prayer'));
          },
        );
        await _chooseRosaryAndSit(tester, h);
        await tester.tap(find.byKey(const ValueKey('prayer-menu')));
        await _settle(tester);
        await tester.tap(find.text('전체 화면으로 기도'));
        await _settle(tester);
        expect(find.text('full-screen-prayer'), findsOneWidget);
        expect(sharedSet, _today);
        final card = tester.widget<ChurchPrayerCard>(
          find.byType(ChurchPrayerCard, skipOffstage: false),
        );
        expect(identical(shared, card.controller.session), isTrue);
        // 전체 화면에서 끝까지 바치고 돌아온다
        shared!.jumpTo(shared!.steps.length - 1);
        shared!.next();
        expect(shared!.isFinished, isTrue);
        Navigator.of(tester.element(find.text('full-screen-prayer'))).pop();
        await _settle(tester);
        await _settle(tester);
        expect(find.text('기도를 마쳤습니다'), findsOneWidget);
        expect(_rosaryCalls(h).last, isFalse);
        expect(h.net.prayings.last.$1, isFalse);
        expect(h.net.rosaries.last, isFalse);
        // 일어나면 세션이 정리되고, 다시 고르면 새 세션(처음부터)
        await tester.tap(find.byKey(const ValueKey('prayer-stand')));
        await _settle(tester);
        expect(find.byType(ChurchPrayerCard), findsNothing);
        expect(h.settings.savedPrayer, isNull);
      },
    );

    testWidgets(
      'standing up mid-rosary and choosing it again resumes the same mystery',
      (tester) async {
        final h = await pumpChurch(tester, size: const Size(360, 800));
        await _chooseRosaryAndSit(tester, h);
        final c1 = tester
            .widget<ChurchPrayerCard>(find.byType(ChurchPrayerCard))
            .controller;
        c1.session.jumpTo(7);
        await tester.pump();
        await tester.tap(find.byKey(const ValueKey('prayer-stand')));
        await _settle(tester);
        h.scene.emit(const SceneNear(station: 'altar'));
        await _settle(tester);
        await tester.tap(find.text('기도하기'));
        await _settle(tester);
        // 지난번 선택(묵주기도)이 강조되고, 이어서 하기로 안내한다
        expect(
          find.textContaining('이어서 하기: ${_today.koreanName}'),
          findsOneWidget,
        );
        await tester.tap(find.byKey(_rosary));
        await _settle(tester);
        h.scene.emit(const SceneNear(seat: 'L03-2'));
        h.scene.emit(const SceneWalkDone('seat', seat: 'L03-2'));
        await tester.pump();
        h.scene.emit(const SceneSeated('L03-2'));
        await _settle(tester);
        final c2 = tester
            .widget<ChurchPrayerCard>(find.byType(ChurchPrayerCard))
            .controller;
        expect(identical(c1, c2), isTrue, reason: '같은 세션(기록도 한 건)');
        expect(c2.session.index, 7);
      },
    );

    testWidgets('peers: praying r and welcome ro reach the scene', (
      tester,
    ) async {
      final h = await pumpChurch(tester, size: const Size(360, 800));
      h.net.goOnline(2);
      h.net.emit(
        Welcome(
          you: 'me',
          room: 'basic-1',
          n: 2,
          peers: [
            parsePeer({
              'id': 'p1',
              'st': 'p',
              'seat': 'L01-0',
              'ms': 1,
              'ro': 1,
            })!,
          ],
          seats: const {'L01-0': 'p1'},
          candles: const [],
          now: 0,
        ),
      );
      await tester.pump();
      final peers = h.scene.lastArgs('setPeers')!['peers']! as List;
      expect((peers.single as Map)['ro'], 1);
      h.net.emit(const Praying('p1', true, 2, rosary: true));
      await tester.pump();
      expect(h.scene.lastArgs('peerPraying'), {
        'id': 'p1',
        'on': true,
        'ms': 2,
        'r': 1,
      });
      h.net.emit(const Praying('p1', true, 2, kneel: true));
      await tester.pump();
      expect(h.scene.lastArgs('peerPraying'), {
        'id': 'p1',
        'on': true,
        'ms': 2,
        'k': 1,
      });
    });

    testWidgets('analytics: church_prayer_choice{church, kind} only', (
      tester,
    ) async {
      final uploader = FakeEventUploader();
      Analytics.debugReset();
      addTearDown(Analytics.debugReset);
      await Analytics.init(
        uploader: uploader,
        consent: (_) => true,
        userId: 'user-1',
        appVersion: '1.0.0+1',
        platform: 'android',
        store: MemoryQueueStore(),
        observeLifecycle: false,
        trackAppOpen: false,
        throwOnUnknownEvent: true,
        batchSize: 1000,
      );
      List<Map<String, dynamic>> events() => [
        for (final e in [
          ...uploader.events,
          ...Analytics.instance.queuedForTest,
        ])
          if (e['name'] == 'church_prayer_choice')
            Map<String, dynamic>.from(e['props'] as Map),
      ];
      final h = await pumpChurch(tester, size: const Size(360, 800));
      await _openSheet(tester, h);
      expect(events(), isEmpty, reason: '시트를 연 것만으로는 기록하지 않는다');
      await tester.tap(find.byKey(_brief));
      await _settle(tester);
      expect(events(), [
        {'church': 'basic', 'kind': 'brief'},
      ]);
      h.scene.emit(const SceneNear());
      await _settle(tester);
      await _openSheet(tester, h);
      await tester.tap(find.byKey(_change));
      await _settle(tester);
      await tester.tap(find.byKey(ValueKey('pray-mystery-${_other.name}')));
      await _settle(tester);
      await tester.tap(find.byKey(_rosary));
      await _settle(tester);
      expect(events().last, {'church': 'basic', 'kind': 'rosary'});
      Analytics.debugReset(); // 남은 전송 타이머를 정리한다
    });
  });
}
