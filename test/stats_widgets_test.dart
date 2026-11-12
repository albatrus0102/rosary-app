import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';
import 'package:rosary_app/stats/stats_screen.dart';
import 'package:rosary_app/stats/stats_widgets.dart';

final _now = DateTime(2026, 11, 12, 10);
DateTime _clock() => _now;

PrayerRecord _rec(
  DateTime at, {
  MysterySet set = MysterySet.joyful,
  bool completed = true,
  int decades = 5,
  int seconds = 780,
}) => PrayerRecord(
  at: at,
  set: set,
  decades: decades,
  hailMarys: decades * 10 + (completed ? 3 : 0),
  completed: completed,
  seconds: seconds,
);

PrayerStatsStore _store() => PrayerStatsStore.inMemory([
  _rec(DateTime(2026, 11, 12, 7)), // 오늘
  _rec(DateTime(2026, 11, 11, 7), set: MysterySet.glorious),
  _rec(
    DateTime(2026, 11, 3, 7),
    set: MysterySet.sorrowful,
    completed: false,
    decades: 2,
  ),
  _rec(DateTime(2026, 5, 5, 7), set: MysterySet.luminous),
  _rec(DateTime(2025, 12, 31, 7)),
]);

Widget _app(Widget child, {double textScale = 1.0, Size? size}) {
  Widget w = MaterialApp(
    theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.deepOrange),
    home: child,
  );
  w = MediaQuery(
    data: MediaQueryData(
      size: size ?? const Size(400, 800),
      textScaler: TextScaler.linear(textScale),
    ),
    child: w,
  );
  return w;
}

Future<void> _setSize(WidgetTester tester, Size size) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
}

void main() {
  group('StatsSummaryCard', () {
    testWidgets('이번 달/올해/전체 숫자와 연속 일수', (tester) async {
      await tester.pumpWidget(
        _app(
          Scaffold(
            body: StatsSummaryCard(store: _store(), now: _clock),
          ),
        ),
      );
      expect(find.text('나의 기도 기록'), findsOneWidget);
      // 이번 달 2, 올해 3, 전체 4 (완주만 센다)
      expect(find.text('2회'), findsOneWidget);
      expect(find.text('3회'), findsOneWidget);
      expect(find.text('4회'), findsOneWidget);
      expect(find.text('연속 2일 기도 중'), findsOneWidget);
    });

    testWidgets('빈 상태', (tester) async {
      await tester.pumpWidget(
        _app(
          Scaffold(
            body: StatsSummaryCard(
              store: PrayerStatsStore.inMemory(),
              now: _clock,
            ),
          ),
        ),
      );
      expect(find.text('아직 기록이 없어요. 첫 묵주기도를 바쳐 보세요.'), findsOneWidget);
      expect(find.textContaining('연속'), findsNothing);
    });

    testWidgets('탭하면 onTap, 기록이 바뀌면 다시 그린다', (tester) async {
      final store = PrayerStatsStore.inMemory();
      var taps = 0;
      await tester.pumpWidget(
        _app(
          Scaffold(
            body: StatsSummaryCard(
              store: store,
              now: _clock,
              onTap: () => taps++,
            ),
          ),
        ),
      );
      await tester.tap(find.byType(StatsSummaryCard));
      expect(taps, 1);
      await store.add(_rec(DateTime(2026, 11, 12, 6)));
      await tester.pump();
      expect(find.text('1회'), findsNWidgets(3));
      expect(find.text('연속 1일 기도 중'), findsOneWidget);
    });

    testWidgets('360x640, 글자 1.5배에서 넘치지 않는다', (tester) async {
      await _setSize(tester, const Size(360, 640));
      await tester.pumpWidget(
        _app(
          Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(16),
              child: StatsSummaryCard(
                store: _store(),
                now: _clock,
                onTap: () {},
              ),
            ),
          ),
          textScale: 1.5,
          size: const Size(360, 640),
        ),
      );
      expect(tester.takeException(), isNull);
    });
  });

  group('MonthBarChart', () {
    testWidgets('값 라벨과 월 축, 탭하면 툴팁', (tester) async {
      final values = [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 12, 0];
      await tester.pumpWidget(
        _app(
          Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(16),
              child: MonthBarChart(values: values, highlightMonth: 11),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('12'), findsOneWidget); // 11월 막대의 값 라벨
      for (var m = 1; m <= 12; m++) {
        expect(find.text('$m월'), findsOneWidget);
      }
      await tester.tap(find.text('5월'));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('5월 · 3회'), findsOneWidget);
    });

    testWidgets('접근성 요약 라벨', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(
        _app(
          Scaffold(
            body: MonthBarChart(
              values: const [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0],
              highlightMonth: 11,
            ),
          ),
        ),
      );
      expect(find.bySemanticsLabel('월별 막대그래프. 1월 1회, 11월 4회'), findsOneWidget);
      handle.dispose();
    });
  });

  group('MonthCalendar', () {
    testWidgets('제목, 기도한 날, 월 이동', (tester) async {
      await tester.pumpWidget(
        _app(
          Scaffold(
            body: MonthCalendar(store: _store(), now: _clock),
          ),
        ),
      );
      expect(find.text('2026년 11월'), findsOneWidget);
      expect(find.text('이 달 완주 2회'), findsOneWidget);
      expect(find.text('12'), findsOneWidget);
      // 11월 1일은 일요일: 일요일 시작 달력이므로 첫 칸.
      expect(find.text('일'), findsOneWidget);

      // 다음 달 버튼은 이번 달에서 비활성.
      final next = tester.widget<IconButton>(
        find.widgetWithIcon(IconButton, Icons.chevron_right),
      );
      expect(next.onPressed, isNull);

      await tester.tap(find.byTooltip('이전 달'));
      await tester.pumpAndSettle();
      expect(find.text('2026년 10월'), findsOneWidget);
      expect(find.text('이 달 완주 0회'), findsOneWidget);

      await tester.tap(find.byTooltip('다음 달'));
      await tester.pumpAndSettle();
      expect(find.text('2026년 11월'), findsOneWidget);
    });

    testWidgets('연도를 넘어 이전 달로 이동', (tester) async {
      await tester.pumpWidget(
        _app(
          Scaffold(
            body: MonthCalendar(
              store: _store(),
              now: _clock,
              initialMonth: DateTime(2026, 1),
            ),
          ),
        ),
      );
      await tester.tap(find.byTooltip('이전 달'));
      await tester.pumpAndSettle();
      expect(find.text('2025년 12월'), findsOneWidget);
      expect(find.text('이 달 완주 1회'), findsOneWidget);
    });

    testWidgets('기도한 날과 오늘 의미 라벨', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(
        _app(
          Scaffold(
            body: MonthCalendar(store: _store(), now: _clock),
          ),
        ),
      );
      expect(find.bySemanticsLabel('11월 12일, 오늘, 기도함'), findsOneWidget);
      expect(find.bySemanticsLabel('11월 11일, 기도함'), findsOneWidget);
      expect(find.bySemanticsLabel('11월 10일'), findsOneWidget);
      handle.dispose();
    });
  });

  testWidgets('MysteryDistributionBar 범례', (tester) async {
    await tester.pumpWidget(
      _app(
        Scaffold(
          body: MysteryDistributionBar(
            counts: const {MysterySet.joyful: 10, MysterySet.glorious: 5},
          ),
        ),
      ),
    );
    expect(find.text('환희 10단'), findsOneWidget);
    expect(find.text('빛 0단'), findsOneWidget);
    expect(find.text('고통 0단'), findsOneWidget);
    expect(find.text('영광 5단'), findsOneWidget);
  });

  group('StatsScreen', () {
    testWidgets('이번 달 지표, 올해 전환, 전체 전환', (tester) async {
      await tester.pumpWidget(_app(StatsScreen(store: _store(), now: _clock)));
      await tester.pumpAndSettle();
      expect(find.text('기도 기록'), findsWidgets);
      expect(find.text('묵주기도 완주'), findsOneWidget);
      // 이번 달: 완주 2, 단 12, 성모송 56+53+23
      expect(find.text('2회'), findsOneWidget);
      expect(find.text('12개'), findsOneWidget);
      expect(find.text('현재 연속'), findsOneWidget);
      expect(find.text('최장'), findsOneWidget);
      expect(find.text('최근 기록'), findsOneWidget);
      expect(find.text('11월 12일 (목) · 환희의 신비'), findsOneWidget);
      expect(find.text('2단까지 · 13분'), findsOneWidget);

      await tester.tap(find.text('올해'));
      await tester.pumpAndSettle();
      expect(find.text('3회'), findsOneWidget);
      expect(find.text('2026년 월별 완주'), findsOneWidget);
      expect(find.byType(MonthBarChart), findsOneWidget);

      await tester.tap(find.text('전체'));
      await tester.pumpAndSettle();
      expect(find.text('4회'), findsOneWidget);
      expect(find.byType(MonthCalendar), findsNothing);
      expect(find.byType(MonthBarChart), findsNothing);
    });

    testWidgets('빈 상태', (tester) async {
      await tester.pumpWidget(
        _app(StatsScreen(store: PrayerStatsStore.inMemory(), now: _clock)),
      );
      await tester.pumpAndSettle();
      expect(find.text('아직 기록이 없어요'), findsOneWidget);
      expect(find.text('전체 기록 지우기'), findsNothing);
    });

    testWidgets('전체 기록 지우기: 취소/확인', (tester) async {
      final store = _store();
      await tester.pumpWidget(_app(StatsScreen(store: store, now: _clock)));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('전체 기록 지우기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('전체 기록 지우기'));
      await tester.pumpAndSettle();
      expect(find.byType(AlertDialog), findsOneWidget);
      await tester.tap(find.text('취소'));
      await tester.pumpAndSettle();
      expect(store.records, isNotEmpty);

      await tester.ensureVisible(find.text('전체 기록 지우기'));
      await tester.tap(find.text('전체 기록 지우기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('지우기'));
      await tester.pumpAndSettle();
      expect(store.records, isEmpty);
      expect(find.text('아직 기록이 없어요'), findsOneWidget);
    });

    for (final range in ['이번 달', '올해', '전체']) {
      testWidgets('360x640 글자 1.5배 넘침 없음 ($range)', (tester) async {
        await _setSize(tester, const Size(360, 640));
        await tester.pumpWidget(
          _app(
            StatsScreen(store: _store(), now: _clock),
            textScale: 1.5,
            size: const Size(360, 640),
          ),
        );
        await tester.pumpAndSettle();
        await tester.tap(find.text(range));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        // 끝까지 스크롤해 모든 영역을 한 번씩 그린다.
        await tester.drag(
          find.byType(Scrollable).first,
          const Offset(0, -3000),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('넓은 화면 1000x800 두 열, 넘침 없음', (tester) async {
      await _setSize(tester, const Size(1000, 800));
      await tester.pumpWidget(
        _app(
          StatsScreen(store: _store(), now: _clock),
          size: const Size(1000, 800),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final calendar = tester.getTopLeft(find.byType(MonthCalendar));
      final distribution = tester.getTopLeft(
        find.byType(MysteryDistributionBar),
      );
      expect(distribution.dx, greaterThan(calendar.dx + 200));
      await tester.tap(find.text('올해'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });
}
