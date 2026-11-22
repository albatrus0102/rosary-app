// 성당 '묵주기도 하기'의 작은 화면 | 큰 화면 고르기: 시트(단추·강조·기억)와 성당 화면(큰 화면이면 앉은 뒤 전체 화면 기도).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/church_prayer_card.dart';
import 'package:rosary_app/church/church_prayer_choice_sheet.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/domain/rosary_session.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';

Future<void> _settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 20));
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pump();
}

const _small = ValueKey('pray-rosary-small');
const _big = ValueKey('pray-rosary-big');
const _rosary = ValueKey('pray-rosary');

Widget _host(
  AppSettings settings, {
  required bool inChurch,
  void Function(ChurchPrayerPick?)? onPick,
}) => MaterialApp(
  theme: ThemeData(splashFactory: InkRipple.splashFactory),
  home: Scaffold(
    body: Builder(
      builder: (context) => Center(
        child: TextButton(
          onPressed: () async {
            final r = await showChurchPrayerChoiceSheet(
              context,
              settings: settings,
              inChurch: inChurch,
            );
            onPick?.call(r);
          },
          child: const Text('open'),
        ),
      ),
    ),
  ),
);

Future<void> _open(WidgetTester tester) async {
  await tester.tap(find.text('open'));
  await _settle(tester);
}

/// 단추가 강조(채움) 상태인지: FilledButton 이면 강조, OutlinedButton 이면 아님.
bool _highlighted(WidgetTester tester, Key k) => find
    .descendant(of: find.byKey(k), matching: find.byType(FilledButton))
    .evaluate()
    .isNotEmpty;

void main() {
  group('시트', () {
    testWidgets('성당 안: 작은 화면·큰 화면 단추가 보이고 문구가 맞다', (tester) async {
      final s = await loadSettings();
      await tester.pumpWidget(_host(s, inChurch: true));
      await _open(tester);
      expect(find.byKey(_small), findsOneWidget);
      expect(find.byKey(_big), findsOneWidget);
      expect(find.text('작은 화면'), findsOneWidget);
      expect(find.text('큰 화면'), findsOneWidget);
      expect(find.text('성당을 보며 바쳐요'), findsOneWidget);
      expect(find.text('묵주기도 화면에서 바쳐요'), findsOneWidget);
      // 두 단추는 나란히, 터치 영역 48dp 이상
      expect(
        tester.getCenter(find.byKey(_small)).dy,
        closeTo(tester.getCenter(find.byKey(_big)).dy, 0.5),
      );
      expect(
        tester.getSize(find.byKey(_small)).height,
        greaterThanOrEqualTo(48),
      );
      expect(tester.getSize(find.byKey(_big)).height, greaterThanOrEqualTo(48));
    });

    testWidgets('성당 밖(홈): 두 단추가 없다', (tester) async {
      final s = await loadSettings();
      await tester.pumpWidget(_host(s, inChurch: false));
      await _open(tester);
      expect(find.byKey(_small), findsNothing);
      expect(find.byKey(_big), findsNothing);
      expect(find.text('작은 화면'), findsNothing);
    });

    testWidgets('성당 밖 칸 누르기: big 은 false 이고 큰 화면 기억을 건드리지 않는다', (tester) async {
      SharedPreferences.setMockInitialValues({'churchRosaryBig': true});
      final s = await AppSettings.load();
      ChurchPrayerPick? got;
      await tester.pumpWidget(
        _host(s, inChurch: false, onPick: (p) => got = p),
      );
      await _open(tester);
      await tester.tap(find.byKey(_rosary));
      await _settle(tester);
      expect(got!.kind, ChurchPrayerChoice.rosary);
      expect(got!.big, isFalse);
      expect(s.churchRosaryBig, isTrue);
    });

    testWidgets('단추를 누르면 big 이 돌아오고 고른 화면이 저장된다', (tester) async {
      final s = await loadSettings();
      ChurchPrayerPick? got;
      await tester.pumpWidget(_host(s, inChurch: true, onPick: (p) => got = p));
      await _open(tester);
      await tester.tap(find.byKey(_big));
      await _settle(tester);
      expect(got!.kind, ChurchPrayerChoice.rosary);
      expect(got!.big, isTrue);
      expect(s.churchRosaryBig, isTrue);

      await _open(tester);
      await tester.tap(find.byKey(_small));
      await _settle(tester);
      expect(got!.big, isFalse);
      expect(s.churchRosaryBig, isFalse);
    });

    testWidgets('지난번 고른 화면을 강조하고, 칸 윗부분은 그 화면으로 바친다', (tester) async {
      SharedPreferences.setMockInitialValues({'churchRosaryBig': true});
      final s = await AppSettings.load();
      ChurchPrayerPick? got;
      await tester.pumpWidget(_host(s, inChurch: true, onPick: (p) => got = p));
      await _open(tester);
      expect(_highlighted(tester, _big), isTrue);
      expect(_highlighted(tester, _small), isFalse);
      await tester.tap(find.byKey(_rosary));
      await _settle(tester);
      expect(got!.big, isTrue);

      // 기본은 작은 화면
      SharedPreferences.setMockInitialValues({});
      final fresh = await AppSettings.load();
      expect(fresh.churchRosaryBig, isFalse);
      await tester.pumpWidget(
        _host(fresh, inChurch: true, onPick: (p) => got = p),
      );
      await _open(tester);
      expect(_highlighted(tester, _small), isTrue);
      await tester.tap(find.byKey(_rosary));
      await _settle(tester);
      expect(got!.big, isFalse);
    });

    testWidgets('잠시 기도하기와 신비 바꾸기는 그대로', (tester) async {
      final s = await loadSettings();
      ChurchPrayerPick? got;
      await tester.pumpWidget(_host(s, inChurch: true, onPick: (p) => got = p));
      await _open(tester);
      await tester.tap(find.byKey(const ValueKey('pray-change-mystery')));
      await _settle(tester);
      expect(find.byKey(const ValueKey('pray-mystery-chips')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('pray-brief')));
      await _settle(tester);
      expect(got!.kind, ChurchPrayerChoice.brief);
      expect(got!.big, isFalse);
    });
  });

  group('성당 화면', () {
    Future<ChurchHarness> pump(
      WidgetTester tester,
      List<RosarySession> shared,
    ) => pumpChurch(
      tester,
      size: const Size(360, 800),
      prayerScreenBuilder: (c, m, s) {
        shared.add(s as RosarySession);
        return const Scaffold(body: Text('full-screen-prayer'));
      },
    );

    Future<void> openSheet(WidgetTester tester, ChurchHarness h) async {
      h.scene.emit(const SceneNear(station: 'altar'));
      await _settle(tester);
      await tester.tap(find.text('기도하기'));
      await _settle(tester);
    }

    Future<void> walkAndSit(WidgetTester tester, ChurchHarness h) async {
      h.scene.emit(const SceneWalkStart('seat'));
      h.scene.emit(const SceneNear(seat: 'L03-2'));
      h.scene.emit(const SceneWalkDone('seat', seat: 'L03-2'));
      await tester.pump();
      h.scene.emit(const SceneSeated('L03-2'));
      await _settle(tester);
      await _settle(tester);
    }

    testWidgets('큰 화면: 앉으면 전체 화면 기도가 저절로 열리고, 돌아오면 작은 카드', (tester) async {
      final shared = <RosarySession>[];
      final h = await pump(tester, shared);
      await openSheet(tester, h);
      await tester.tap(find.byKey(_big));
      await _settle(tester);
      // 걸어가는 동안에는 아직 열지 않는다.
      expect(find.text('full-screen-prayer'), findsNothing);
      await walkAndSit(tester, h);
      expect(find.text('full-screen-prayer'), findsOneWidget);
      expect(shared, hasLength(1));
      final card = tester.widget<ChurchPrayerCard>(
        find.byType(ChurchPrayerCard, skipOffstage: false),
      );
      expect(identical(shared.single, card.controller.session), isTrue);
      expect(h.settings.churchRosaryBig, isTrue);

      // '성당으로' 돌아오면 자리의 작은 카드가 그대로 있고 다시 열리지 않는다.
      Navigator.of(tester.element(find.text('full-screen-prayer'))).pop();
      await _settle(tester);
      await _settle(tester);
      expect(find.text('full-screen-prayer'), findsNothing);
      expect(find.byType(ChurchPrayerCard), findsOneWidget);
      expect(shared, hasLength(1));
    });

    testWidgets('작은 화면: 앉아도 전체 화면은 열리지 않는다', (tester) async {
      final shared = <RosarySession>[];
      final h = await pump(tester, shared);
      await openSheet(tester, h);
      await tester.tap(find.byKey(_small));
      await _settle(tester);
      await walkAndSit(tester, h);
      expect(find.text('full-screen-prayer'), findsNothing);
      expect(shared, isEmpty);
      expect(find.byType(ChurchPrayerCard), findsOneWidget);
      expect(h.settings.churchRosaryBig, isFalse);
    });

    testWidgets('이미 자리 옆이면 바로 앉고 큰 화면이 열린다', (tester) async {
      final shared = <RosarySession>[];
      final h = await pump(tester, shared);
      h.scene.emit(const SceneNear(station: 'altar', seat: 'L03-2'));
      await _settle(tester);
      await tester.tap(find.text('기도하기'));
      await _settle(tester);
      await tester.tap(find.byKey(_big));
      await _settle(tester);
      expect(h.net.sits, ['L03-2']);
      h.scene.emit(const SceneSeated('L03-2'));
      await _settle(tester);
      await _settle(tester);
      expect(find.text('full-screen-prayer'), findsOneWidget);
    });

    testWidgets('성모상 앞 서서 하는 기도: 큰 화면이면 시작하자마자 전체 화면', (tester) async {
      final shared = <RosarySession>[];
      final h = await pump(tester, shared);
      h.scene.emit(const SceneNear(station: 'altar', shrine: true));
      await _settle(tester);
      await tester.tap(find.text('기도하기'));
      await _settle(tester);
      await tester.tap(find.byKey(_big));
      await _settle(tester);
      await _settle(tester);
      expect(h.net.sits, isEmpty);
      expect(find.text('full-screen-prayer'), findsOneWidget);
      expect(shared, hasLength(1));
    });

    testWidgets('앉기 전에 걸음이 취소되면 큰 화면 표시도 풀린다', (tester) async {
      final shared = <RosarySession>[];
      final h = await pump(tester, shared);
      await openSheet(tester, h);
      await tester.tap(find.byKey(_big));
      await _settle(tester);
      h.scene.emit(const SceneWalkStart('seat'));
      h.scene.emit(const SceneWalkCancel('seat'));
      await _settle(tester);
      // 나중에 그냥 앉아서(다른 길로) 기도해도 전체 화면이 튀어나오지 않는다.
      h.scene.emit(const SceneNear(seat: 'L03-2'));
      await _settle(tester);
      await tester.tap(find.text('앉기'));
      await tester.pump();
      h.scene.emit(const SceneSeated('L03-2'));
      await _settle(tester);
      await _settle(tester);
      expect(find.text('full-screen-prayer'), findsNothing);
    });

    testWidgets('카드 ⋮ 메뉴의 묵주기도 화면으로 는 그대로 동작한다', (tester) async {
      final shared = <RosarySession>[];
      final h = await pump(tester, shared);
      await openSheet(tester, h);
      await tester.tap(find.byKey(_small));
      await _settle(tester);
      await walkAndSit(tester, h);
      await tester.tap(find.byKey(const ValueKey('prayer-menu')));
      await _settle(tester);
      await tester.tap(find.text('묵주기도 화면으로'));
      await _settle(tester);
      expect(find.text('full-screen-prayer'), findsOneWidget);
    });
  });
}
