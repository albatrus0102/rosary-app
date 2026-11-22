// 기도 화면 첫 사용 안내(코치 마크): 처음 열 때 한 번, 건너뛰기·마침이 저장되고, 단계가 넘어가며, 화면에 없는 대상은 건너뛰고,
// 메뉴 '사용법 보기'로 다시 나온다. 안내가 떠 있는 동안 기도는 진행되지 않고 뒤로 가기는 안내부터 닫는다.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/rosary_sequence.dart';
import 'package:rosary_app/domain/rosary_session.dart';
import 'package:rosary_app/rosary3d/rosary_feedback.dart';
import 'package:rosary_app/rosary3d/rosary_scene.dart';
import 'package:rosary_app/ui/prayer_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _tour = ValueKey('coach-tour');
const _next = ValueKey('coach-next');
const _skip = ValueKey('coach-skip');

const _t1 = '묵주를 아래로 내리면 다음 기도, 위로 올리면 이전 기도예요';
const _t2 = '지금 바칠 기도문이 여기 나와요';
const _t2alt = '기도문 펼치기를 누르면 지금 바칠 기도문이 나와요';
const _t3 = '묵주 전체를 보며 어디쯤인지 확인할 수 있어요';
const _t4 = '기도문 글자 크기를 바꿀 수 있어요';
const _t5 = '성가 듣기, 선창 음성 같은 설정은 여기에 있어요';

Future<AppSettings> _load({
  bool rosary = true,
  bool done = false,
  Map<String, Object> extra = const {},
}) async {
  SharedPreferences.setMockInitialValues({
    'prayer_view': rosary ? 'rosary' : 'classic',
    'leader_audio': false,
    'prayerScreenTourDone': done,
    'beadSwipeLearned': 0,
    ...extra,
  });
  return AppSettings.load();
}

void _phone(WidgetTester tester) {
  tester.view.devicePixelRatio = 2;
  tester.view.physicalSize = const Size(720, 1600);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

PrayerScreen _screen(
  AppSettings s, {
  bool returnToChurch = false,
  RosarySession? session,
}) => PrayerScreen(
  settings: s,
  mysterySet: MysterySet.joyful,
  initialIndex: 3,
  session: session,
  returnToChurch: returnToChurch,
  rosaryScene: FakeRosaryScene(),
  rosaryFeedback: RecordingRosaryFeedback(),
);

/// 안내는 첫 프레임이 배치된 다음 프레임에 위치를 잰다.
Future<void> _frames(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 50));
  await tester.pump(const Duration(milliseconds: 50));
}

Future<void> _openScreen(
  WidgetTester tester,
  AppSettings s, {
  bool returnToChurch = false,
}) async {
  // 홈 위에 밀어 올려 시스템 뒤로 가기를 시험할 수 있게 한다.
  await tester.pumpWidget(
    MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: TextButton(
              onPressed: () => Navigator.of(context).push<void>(
                MaterialPageRoute(
                  builder: (_) => _screen(s, returnToChurch: returnToChurch),
                ),
              ),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('open'));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 700)); // 화면 전환이 끝나도록
  await _frames(tester);
}

String _caption(WidgetTester tester) =>
    tester.widget<Text>(find.byKey(const ValueKey('coach-text'))).data!;

String _count(WidgetTester tester) =>
    tester.widget<Text>(find.byKey(const ValueKey('coach-count'))).data!;

Future<void> _systemBack(WidgetTester tester) async {
  final dynamic app = tester.state(find.byType(WidgetsApp));
  await app.didPopRoute();
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 700));
}

void main() {
  testWidgets('처음 열면 안내가 뜨고 단계가 5개: 묵주 → 기도문 → 전체 묵주 → 글자 크기 → 메뉴', (
    tester,
  ) async {
    _phone(tester);
    final s = await _load();
    await _openScreen(tester, s);
    expect(find.byKey(_tour), findsOneWidget);
    expect(_count(tester), '1 / 5');
    expect(_caption(tester), _t1);
    // 첫 단계에는 손가락이 있다
    expect(find.byKey(const ValueKey('coach-finger')), findsOneWidget);
    expect(find.text('건너뛰기'), findsOneWidget);
    expect(find.text('다음'), findsOneWidget);

    // 기도문이 접혀 있으면 '기도문 펼치기' 단추를 대신 비춘다
    await tester.tap(find.byKey(_next));
    await _frames(tester);
    expect(_count(tester), '2 / 5');
    expect(_caption(tester), _t2alt);
    expect(find.byKey(const ValueKey('coach-finger')), findsNothing);

    await tester.tap(find.byKey(_next));
    await _frames(tester);
    expect(_count(tester), '3 / 5');
    expect(_caption(tester), _t3);

    await tester.tap(find.byKey(_next));
    await _frames(tester);
    expect(_count(tester), '4 / 5');
    expect(_caption(tester), _t4);

    await tester.tap(find.byKey(_next));
    await _frames(tester);
    expect(_count(tester), '5 / 5');
    expect(_caption(tester), _t5);
    // 마지막 단계: '시작해요'(건너뛰기는 없다)
    expect(find.text('시작해요'), findsOneWidget);
    expect(find.text('다음'), findsNothing);
    expect(find.byKey(_skip), findsNothing);
    expect(s.prayerScreenTourDone, isFalse);

    await tester.tap(find.byKey(_next));
    await _frames(tester);
    expect(find.byKey(_tour), findsNothing);
    expect(s.prayerScreenTourDone, isTrue);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getBool('prayerScreenTourDone'), isTrue);
  });

  testWidgets('기도문을 펼쳐 둔 사람에게는 기도문 칸 자체를 비춘다', (tester) async {
    _phone(tester);
    final s = await _load(extra: {'rosary3d_text_expanded': true});
    await _openScreen(tester, s);
    await tester.tap(find.byKey(_next));
    await _frames(tester);
    expect(_caption(tester), _t2);
  });

  testWidgets('건너뛰기: 닫히고 저장되며 다시 열어도 안 뜬다', (tester) async {
    _phone(tester);
    final s = await _load();
    await _openScreen(tester, s, returnToChurch: true);
    await tester.tap(find.byKey(_skip));
    await _frames(tester);
    expect(find.byKey(_tour), findsNothing);
    expect(s.prayerScreenTourDone, isTrue);

    // 화면을 닫았다 다시 연다
    await _systemBack(tester);
    await tester.pump(const Duration(milliseconds: 700));
    expect(find.text('open'), findsOneWidget);
    await tester.tap(find.text('open'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 700));
    await _frames(tester);
    expect(find.byKey(const ValueKey('prayer-header-church')), findsOneWidget);
    expect(find.byKey(_tour), findsNothing);
  });

  testWidgets('안내가 떠 있는 동안: 묵주를 끌어도, 눌러도 기도가 진행되지 않는다', (tester) async {
    _phone(tester);
    final s = await _load();
    final session = RosarySession(buildRosarySequence(MysterySet.joyful));
    session.jumpTo(3);
    await tester.pumpWidget(MaterialApp(home: _screen(s, session: session)));
    await _frames(tester);
    expect(find.byKey(_tour), findsOneWidget);
    final area = find.byKey(const ValueKey('rosary-area'));
    await tester.drag(area, const Offset(0, 600), warnIfMissed: false);
    await tester.pump(const Duration(milliseconds: 400));
    expect(session.index, 3);
    expect(s.beadSwipeLearned, 0);
    // 아래 화면의 단추도 눌리지 않는다
    await tester.tap(
      find.byKey(const ValueKey('rosary-text-toggle')),
      warnIfMissed: false,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(s.rosaryTextExpanded, isFalse);
    expect(find.byKey(_tour), findsOneWidget);
  });

  testWidgets('없는 대상은 건너뛴다: 기도문 중심 화면에는 묵주·전체 묵주 단계가 없다', (tester) async {
    _phone(tester);
    final s = await _load(rosary: false);
    await _openScreen(tester, s);
    expect(find.byKey(_tour), findsOneWidget);
    // 5단계 중 묵주 영역·전체 묵주 보기 단추가 없으니 3단계
    expect(_count(tester), '1 / 3');
    expect(_caption(tester), _t2);
    await tester.tap(find.byKey(_next));
    await _frames(tester);
    expect(_count(tester), '2 / 3');
    expect(_caption(tester), _t4);
    await tester.tap(find.byKey(_next));
    await _frames(tester);
    expect(_count(tester), '3 / 3');
    expect(_caption(tester), _t5);
    await tester.tap(find.text('시작해요'));
    await _frames(tester);
    expect(s.prayerScreenTourDone, isTrue);
  });

  testWidgets('성당에서 연 화면(returnToChurch)에서도 뜨고, 뒤로 가기는 안내부터 닫는다', (
    tester,
  ) async {
    _phone(tester);
    final s = await _load();
    await _openScreen(tester, s, returnToChurch: true);
    expect(find.byKey(const ValueKey('prayer-header-church')), findsOneWidget);
    expect(find.byKey(_tour), findsOneWidget);

    // 시스템 뒤로 가기 한 번: 안내만 닫히고 화면은 남는다(저장도 된다)
    await _systemBack(tester);
    expect(find.byKey(_tour), findsNothing);
    expect(find.byKey(const ValueKey('prayer-header-church')), findsOneWidget);
    expect(s.prayerScreenTourDone, isTrue);

    // 두 번째: 이제 성당으로 돌아간다
    await _systemBack(tester);
    expect(find.byKey(const ValueKey('prayer-header-church')), findsNothing);
    expect(find.text('open'), findsOneWidget);
  });

  testWidgets('메뉴 사용법 보기: 이미 마쳤어도 안내를 다시 보이고 손가락 안내도 되살린다', (tester) async {
    _phone(tester);
    final s = await _load(done: true, extra: {'beadSwipeLearned': 2});
    await _openScreen(tester, s);
    expect(find.byKey(_tour), findsNothing);
    expect(s.beadSwipeHintVisible, isFalse);

    await tester.tap(find.byKey(const ValueKey('prayer-menu')));
    await tester.pumpAndSettle();
    expect(find.text('사용법 보기'), findsOneWidget);
    await tester.tap(find.text('사용법 보기'));
    await tester.pump(const Duration(milliseconds: 400));
    await _frames(tester);
    expect(find.byKey(_tour), findsOneWidget);
    expect(_count(tester), '1 / 5');
    expect(s.beadSwipeLearned, 0);
    expect(s.beadSwipeHintVisible, isTrue);

    // 끝까지 보고 닫은 뒤 한 번 더 다시 볼 수 있다
    await tester.tap(find.byKey(_skip));
    await _frames(tester);
    expect(find.byKey(_tour), findsNothing);
    await tester.tap(find.byKey(const ValueKey('prayer-menu')));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.text('사용법 보기'));
    await tester.pump(const Duration(milliseconds: 400));
    await _frames(tester);
    expect(find.byKey(_tour), findsOneWidget);
    expect(_count(tester), '1 / 5');
  });

  testWidgets('이미 마친 사람에게는 처음부터 안 뜬다', (tester) async {
    _phone(tester);
    final s = await _load(done: true);
    await _openScreen(tester, s);
    expect(find.byKey(_tour), findsNothing);
  });

  testWidgets('글자 읽기: 안내 카드는 한 덩어리로 읽히고 아래 화면은 가려진다', (tester) async {
    _phone(tester);
    final handle = tester.ensureSemantics();
    final s = await _load();
    await _openScreen(tester, s);
    expect(find.bySemanticsLabel(RegExp('^사용법 1/5. ')), findsOneWidget);
    expect(find.bySemanticsLabel('글자 크기'), findsNothing);
    handle.dispose();
  });
}
