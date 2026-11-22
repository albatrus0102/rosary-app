// '아래로 내리면 다음 기도' 손가락 안내: 처음엔 보이고, 끌어서 넘긴 횟수가 두 번(성당 카드·큰 화면 합산)이 되면 사라지며,
// 기도 화면 메뉴 '사용법 보기'로 다시 나온다. 터치를 막지 않고 글자 읽기에서는 빠진다.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/church_rosary_panel.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/rosary3d/rosary_feedback.dart';
import 'package:rosary_app/rosary3d/rosary_scene.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
import 'package:rosary_app/ui/widgets/swipe_hint.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_screen_fakes.dart';

Future<void> _settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 20));
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pump();
}

const _hint = ValueKey('bead-swipe-hint');

void main() {
  setUp(() => ChurchRosaryPanel.debugFeedback = RecordingRosaryFeedback());
  tearDown(() => ChurchRosaryPanel.debugFeedback = null);

  group('성당 카드(폭 104)', () {
    Future<ChurchHarness> sit(WidgetTester tester) async {
      final h = await pumpChurch(tester, size: const Size(360, 800));
      h.settings.prayerView = PrayerView.rosary;
      h.settings.resetBeadSwipeHint();
      h.scene.emit(const SceneNear(station: 'altar', seat: 'L00-0'));
      await _settle(tester);
      await tester.tap(find.text('기도하기'));
      await _settle(tester);
      await tester.tap(find.byKey(const ValueKey('pray-rosary-small')));
      await _settle(tester);
      h.scene.emit(const SceneSeated('L00-0'));
      await _settle(tester);
      return h;
    }

    testWidgets('처음엔 두 줄 안내가 보이고, 두 번 끌어 넘기면 사라진다', (tester) async {
      final h = await sit(tester);
      expect(find.byKey(_hint), findsOneWidget);
      final label = tester.widget<Text>(
        find.byKey(const ValueKey('bead-swipe-hint-label')),
      );
      expect(label.data, '아래로\n내리면 다음');
      // 안내는 폭 104 묵주 영역 안에 있다.
      final area = find.byKey(const ValueKey('church-rosary-area'));
      expect(
        tester.getRect(find.byKey(_hint)).width,
        lessThanOrEqualTo(tester.getSize(area).width + 0.5),
      );

      // 안내 위로 끌어도 넘어간다(터치를 막지 않는다).
      await tester.drag(area, const Offset(0, 300));
      await _settle(tester);
      expect(find.textContaining('사도신경'), findsWidgets);
      expect(h.settings.beadSwipeLearned, 1);
      expect(find.byKey(_hint), findsOneWidget);

      await tester.drag(area, const Offset(0, 300));
      await _settle(tester);
      expect(h.settings.beadSwipeLearned, 2);
      expect(find.byKey(_hint), findsNothing);
      // 저장된다
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getInt('beadSwipeLearned'), 2);

      // 더 끌어도 횟수는 목표에서 멈춘다
      await tester.drag(area, const Offset(0, 300));
      await _settle(tester);
      expect(h.settings.beadSwipeLearned, 2);
    });

    testWidgets('짧게 끌어 넘어가지 않으면 세지 않고, 단추로 넘기는 것도 세지 않는다', (tester) async {
      final h = await sit(tester);
      await tester.drag(
        find.byKey(const ValueKey('church-rosary-area')),
        const Offset(0, 10),
      );
      await _settle(tester);
      await tester.tap(find.byKey(const ValueKey('prayer-next')));
      await _settle(tester);
      expect(h.settings.beadSwipeLearned, 0);
      expect(find.byKey(_hint), findsOneWidget);
    });

    testWidgets('이미 익힌 사람(기본 시험 설정)에게는 처음부터 없다', (tester) async {
      final h = await pumpChurch(tester, size: const Size(360, 800));
      h.settings.prayerView = PrayerView.rosary;
      expect(h.settings.beadSwipeHintVisible, isFalse);
      h.scene.emit(const SceneNear(station: 'altar', seat: 'L00-0'));
      await _settle(tester);
      await tester.tap(find.text('기도하기'));
      await _settle(tester);
      await tester.tap(find.byKey(const ValueKey('pray-rosary-small')));
      await _settle(tester);
      h.scene.emit(const SceneSeated('L00-0'));
      await _settle(tester);
      expect(find.byKey(const ValueKey('church-rosary-area')), findsOneWidget);
      expect(find.byKey(_hint), findsNothing);
    });
  });

  group('큰 화면(묵주기도 화면)', () {
    Future<AppSettings> load(Map<String, Object> extra) async {
      SharedPreferences.setMockInitialValues({
        'prayer_view': 'rosary',
        'leader_audio': false,
        'beadSwipeLearned': 0,
        ...extra,
      });
      return AppSettings.load();
    }

    Widget app(AppSettings s, {bool reduceMotion = false}) => MaterialApp(
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(disableAnimations: reduceMotion),
        child: child!,
      ),
      home: PrayerScreen(
        settings: s,
        mysterySet: MysterySet.joyful,
        initialIndex: 3,
        rosaryScene: FakeRosaryScene(),
        rosaryFeedback: RecordingRosaryFeedback(),
      ),
    );

    void phone(WidgetTester tester) {
      tester.view.devicePixelRatio = 2;
      tester.view.physicalSize = const Size(720, 1600);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
    }

    testWidgets('보이고 → 두 번 끌면 사라지고 → 사용법 보기로 다시 나온다', (tester) async {
      phone(tester);
      final s = await load({});
      await tester.pumpWidget(app(s));
      await tester.pump();
      expect(find.byKey(_hint), findsOneWidget);
      expect(find.text('아래로 내리면 다음 기도'), findsOneWidget);

      final area = find.byKey(const ValueKey('rosary-area'));
      await tester.drag(area, const Offset(0, 600));
      await tester.pump(const Duration(milliseconds: 400));
      expect(s.beadSwipeLearned, 1);
      expect(find.byKey(_hint), findsOneWidget);
      await tester.drag(area, const Offset(0, 600));
      await tester.pump(const Duration(milliseconds: 400));
      expect(s.beadSwipeLearned, 2);
      expect(find.byKey(_hint), findsNothing);

      // 메뉴 > 사용법 보기: 안내를 다시 켜고(첫 사용 안내가 그 위에 뜬다) 닫으면 손가락 안내가 보인다.
      await tester.tap(find.byKey(const ValueKey('prayer-menu')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('사용법 보기'));
      await tester.pump(const Duration(milliseconds: 400));
      expect(s.beadSwipeLearned, 0);
      await tester.pump(const Duration(milliseconds: 50)); // 안내가 위치를 재는 프레임
      await tester.tap(find.byKey(const ValueKey('coach-skip')));
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.byKey(const ValueKey('coach-tour')), findsNothing);
      expect(find.byKey(_hint), findsOneWidget);
    });

    testWidgets('글자 읽기에서는 빠지고 묵주 영역의 기존 라벨은 그대로', (tester) async {
      phone(tester);
      final handle = tester.ensureSemantics();
      final s = await load({});
      await tester.pumpWidget(app(s));
      await tester.pump();
      expect(find.bySemanticsLabel('아래로 내리면 다음 기도'), findsNothing);
      expect(
        find.bySemanticsLabel(RegExp(r'묵주\..*아래로 당기면 다음, 위로 당기면 이전 기도')),
        findsOneWidget,
      );
      handle.dispose();
    });

    testWidgets('움직임 줄이기: 손가락은 제자리에 서 있고 반복 애니메이션이 없다', (tester) async {
      phone(tester);
      final s = await load({});
      await tester.pumpWidget(app(s, reduceMotion: true));
      await tester.pump();
      expect(find.byKey(_hint), findsOneWidget);
      // 반복 애니메이션이 없으면 pumpAndSettle 이 끝난다.
      await tester.pumpAndSettle();
      expect(find.byType(SwipeFinger), findsOneWidget);
    });

    testWidgets('보통 설정: 손가락이 1.4초 주기로 아래로 내려갔다 사라진다', (tester) async {
      phone(tester);
      final s = await load({});
      await tester.pumpWidget(app(s));
      await tester.pump();
      Offset finger() => tester.getTopLeft(find.byIcon(Icons.touch_app));
      double opacity() => tester
          .widget<Opacity>(
            find.ancestor(
              of: find.byIcon(Icons.touch_app),
              matching: find.byType(Opacity),
            ),
          )
          .opacity;
      await tester.pump(const Duration(milliseconds: 400));
      final y0 = finger().dy;
      await tester.pump(const Duration(milliseconds: 600));
      expect(finger().dy, greaterThan(y0));
      // 끝에서는 사라지고(투명), 한 바퀴 뒤 다시 시작한다.
      await tester.pump(const Duration(milliseconds: 380));
      expect(opacity(), lessThan(0.2));
      await tester.pump(const Duration(milliseconds: 100));
      expect(finger().dy, lessThan(y0));
    });
  });
}
