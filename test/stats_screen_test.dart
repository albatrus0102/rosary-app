import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/stats/goal_sheet.dart';
import 'package:rosary_app/stats/prayer_goal.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';
import 'package:rosary_app/stats/share/image_share.dart';
import 'package:rosary_app/stats/share/share_card.dart';
import 'package:rosary_app/stats/share/share_sheet.dart';
import 'package:rosary_app/stats/stats_data.dart';
import 'package:rosary_app/stats/stats_logic.dart';
import 'package:rosary_app/stats/stats_screen.dart';
import 'package:rosary_app/stats/stats_widgets.dart';
import 'package:rosary_app/stats/text_fit.dart';

import 'stats_sample_data.dart';

final _now = DateTime(2026, 11, 16, 10);
DateTime _clock() => _now;

class FakeShare implements ImageShareChannel {
  final List<(String, Uint8List, String)> calls = [];

  @override
  Future<ShareOutcome> shareImage(Uint8List png, String name) async {
    calls.add(('image', png, name));
    return ShareOutcome.opened;
  }

  @override
  Future<ShareOutcome> shareStory(Uint8List png, String name) async {
    calls.add(('story', png, name));
    return ShareOutcome.openedSheet;
  }
}

Widget app(
  Widget child, {
  double scale = 1.0,
  Size size = const Size(400, 800),
  Brightness brightness = Brightness.light,
}) => MediaQuery(
  data: MediaQueryData(size: size, textScaler: TextScaler.linear(scale)),
  child: MaterialApp(
    theme: brightness == Brightness.dark ? AppTheme.dark() : AppTheme.light(),
    home: child,
  ),
);

void setSize(WidgetTester tester, Size size) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
}

Future<void> scrollAll(WidgetTester tester) async {
  for (var i = 0; i < 14; i++) {
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -700));
    await tester.pump();
    expect(tester.takeException(), isNull, reason: '스크롤 $i');
  }
}

StatsScreen screen({
  PrayerGoal goal = PrayerGoal.off,
  bool goalPrompted = true,
  ValueChanged<PrayerGoal>? onGoal,
  VoidCallback? onPrompted,
  ImageShareChannel? share,
  PrayerStatsStore? store,
}) => StatsScreen(
  store: store ?? sampleStore(_now),
  now: _clock,
  goal: goal,
  goalPrompted: goalPrompted,
  onGoalChanged: onGoal,
  onGoalPrompted: onPrompted,
  shareChannel: share,
);

void main() {
  group('기록 화면 구성', () {
    testWidgets('순서: 발자취 → 기간별 → 신비별 → 돌아보기, 기존 기능 유지', (tester) async {
      setSize(tester, const Size(400, 800));
      await tester.pumpWidget(app(screen()));
      await tester.pumpAndSettle();
      double y(String t) => tester.getTopLeft(find.text(t).first).dy;
      // 전부 그려지도록 세로로 아주 긴 화면.
      setSize(tester, const Size(400, 6000));
      await tester.pumpAndSettle();
      final order = ['기도의 발자취', '기간별 기도', '신비별 기도', '돌아보기', '기도한 날', '최근 기록'];
      for (var i = 1; i < order.length; i++) {
        expect(y(order[i]), greaterThan(y(order[i - 1])), reason: order[i]);
      }
      expect(find.text('전체 기록 지우기'), findsOneWidget);
      expect(find.byType(MonthCalendar), findsOneWidget);
      expect(find.text(keepAll('끝까지 바친 묵주기도')), findsOneWidget);
      expect(find.byTooltip('기도의 발자취 카드로 나누기'), findsOneWidget);
      expect(find.byTooltip('기간별 기도 카드로 나누기'), findsOneWidget);
      expect(find.byTooltip('신비별 기도 카드로 나누기'), findsOneWidget);
      expect(find.byTooltip('이번 주의 기도 카드로 나누기'), findsOneWidget);
      expect(find.byTooltip('이번 달의 기도 카드로 나누기'), findsOneWidget);
      expect(find.byTooltip('2026년의 기도 카드로 나누기'), findsOneWidget);
    });

    testWidgets('경쟁 느낌의 말(완주·최장·순위·점수·실패)이 없다', (tester) async {
      setSize(tester, const Size(400, 6000));
      await tester.pumpWidget(app(screen(goal: const PrayerGoal(decades: 2))));
      await tester.pumpAndSettle();
      for (final w in ['완주', '최장', '순위', '점수', '실패', '배지', '못 ']) {
        expect(find.textContaining(w), findsNothing, reason: w);
      }
    });

    testWidgets('기간 칩과 ‹ › 이동, 이전 기간 뒤 다음 기간', (tester) async {
      setSize(tester, const Size(400, 6000));
      await tester.pumpWidget(app(screen()));
      await tester.pumpAndSettle();
      expect(find.text('10월 18일 ~ 11월 16일'), findsWidgets); // 최근 30일
      await tester.tap(find.byTooltip('이전 기간'));
      await tester.pumpAndSettle();
      expect(find.text('9월 18일 ~ 10월 17일'), findsWidgets);
      await tester.tap(find.byTooltip('다음 기간'));
      await tester.pumpAndSettle();
      expect(find.text('10월 18일 ~ 11월 16일'), findsWidgets);
      expect(
        tester.widget<IconButton>(find.widgetWithIcon(IconButton, Icons.chevron_right).first).onPressed,
        isNull,
      );
      await tester.tap(find.text('최근 7일'));
      await tester.pumpAndSettle();
      expect(find.text('11월 10일 ~ 11월 16일'), findsWidgets);
      await tester.tap(find.text('올해'));
      await tester.pumpAndSettle();
      expect(find.text('1월 1일 ~ 11월 16일'), findsWidgets);
      await tester.tap(find.text('전체'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });

    testWidgets('빈 상태와 전체 기록 지우기', (tester) async {
      await tester.pumpWidget(app(screen(store: PrayerStatsStore.inMemory())));
      await tester.pumpAndSettle();
      expect(find.text('아직 기록이 없어요'), findsOneWidget);
      expect(find.text('전체 기록 지우기'), findsNothing);

      final store = sampleStore(_now);
      await tester.pumpWidget(app(screen(store: store)));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('전체 기록 지우기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('전체 기록 지우기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('지우기'));
      await tester.pumpAndSettle();
      expect(store.records, isEmpty);
    });

    testWidgets('최근 기록 문구는 끝까지 바친 날로 표기', (tester) async {
      setSize(tester, const Size(400, 6000));
      await tester.pumpWidget(app(screen()));
      await tester.pumpAndSettle();
      expect(find.textContaining('끝까지 바침'), findsWidgets);
    });
  });

  group('글자 크기·좁은 화면(344dp) 넘침 없음', () {
    for (final b in Brightness.values) {
      for (final scale in [0.85, 1.0, 1.3, 1.75]) {
        for (final goal in [PrayerGoal.off, const PrayerGoal(decades: 3, minutes: 20)]) {
          testWidgets('${b.name} ×$scale 목표 ${goal.isOff ? '없음' : '있음'}', (tester) async {
            setSize(tester, const Size(344, 740));
            await tester.pumpWidget(
              app(screen(goal: goal), scale: scale, size: const Size(344, 740), brightness: b),
            );
            await tester.pumpAndSettle();
            expect(tester.takeException(), isNull);
            await scrollAll(tester);
          });
        }
      }
    }

    testWidgets('넓은 화면 1000x800 두 열', (tester) async {
      setSize(tester, const Size(1000, 800));
      await tester.pumpWidget(app(screen(), size: const Size(1000, 800)));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final a = tester.getTopLeft(find.text('기도의 발자취'));
      final b = tester.getTopLeft(find.text('신비별 기도'));
      expect(b.dx, greaterThan(a.dx + 200));
    });
  });

  group('오늘의 기도 목표', () {
    testWidgets('처음 한 번만 시트를 권하고, 건너뛰면 저장 없이 닫힌다', (tester) async {
      setSize(tester, const Size(400, 900));
      var prompted = 0;
      PrayerGoal? saved;
      await tester.pumpWidget(
        app(
          screen(
            goalPrompted: false,
            onGoal: (g) => saved = g,
            onPrompted: () => prompted++,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(GoalSheet), findsOneWidget);
      expect(find.text('오늘의 기도 목표'), findsWidgets);
      expect(prompted, 1);
      await tester.tap(find.text('다음에 할게요'));
      await tester.pumpAndSettle();
      expect(find.byType(GoalSheet), findsNothing);
      expect(saved, isNull);
      expect(prompted, 1);
    });

    testWidgets('고르고 저장하면 목표가 바뀐다(단 + 분)', (tester) async {
      setSize(tester, const Size(400, 900));
      PrayerGoal? saved;
      await tester.pumpWidget(app(screen(goalPrompted: false, onGoal: (g) => saved = g)));
      await tester.pumpAndSettle();
      await tester.tap(find.text('둘 다'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('하루에 바칠 단 늘리기'));
      await tester.tap(find.byTooltip('하루에 기도할 시간 늘리기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('이대로 정하기'));
      await tester.pumpAndSettle();
      expect(saved, const PrayerGoal(decades: 2, minutes: 15));
      expect(find.textContaining('하루 2단 또는 15분'), findsOneWidget);
    });

    testWidgets('정하지 않기도 고를 수 있다', (tester) async {
      setSize(tester, const Size(400, 900));
      PrayerGoal? saved = const PrayerGoal(decades: 1);
      await tester.pumpWidget(
        app(screen(goal: saved, onGoal: (g) => saved = g)),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('오늘의 기도 목표 · 하루 1단'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('정하지 않기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('목표 없이 지내기'));
      await tester.pumpAndSettle();
      expect(saved, PrayerGoal.off);
    });

    testWidgets('목표 시트는 344dp ×1.75 에서도 넘치지 않는다', (tester) async {
      setSize(tester, const Size(344, 740));
      await tester.pumpWidget(
        app(
          screen(goalPrompted: false, onGoal: (_) {}),
          scale: 1.75,
          size: const Size(344, 740),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(GoalSheet), findsOneWidget);
      await tester.tap(find.text('둘 다'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });

  group('공유', () {
    testWidgets('나누기 단추 → 시트 → 이미지 PNG 와 스토리', (tester) async {
      setSize(tester, const Size(400, 6000));
      final fake = FakeShare();
      await tester.pumpWidget(app(screen(share: fake)));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('기간별 기도 카드로 나누기'));
      await tester.pumpAndSettle();
      expect(find.byType(ShareSheet), findsOneWidget);
      expect(find.byType(ShareCard), findsOneWidget);

      Future<void> waitCalls(int n) async {
        for (var i = 0; i < 80 && fake.calls.length < n; i++) {
          await tester.pump();
          await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 25)));
        }
      }

      await tester.tap(find.text('이미지로 나누기'));
      await waitCalls(1);
      expect(fake.calls.first.$1, 'image');
      final png = fake.calls.first.$2;
      expect(png.sublist(0, 4), [0x89, 0x50, 0x4E, 0x47]);
      // 정사각 1080×1080: IHDR 폭·높이.
      final bd = ByteData.sublistView(png);
      expect((bd.getUint32(16), bd.getUint32(20)), (1080, 1080));
      expect(fake.calls.first.$3, 'rosarium_period');

      await tester.pump();
      await tester.tap(find.text('인스타그램 스토리'));
      await waitCalls(2);
      expect(fake.calls[1].$1, 'story');
      final bd2 = ByteData.sublistView(fake.calls[1].$2);
      expect((bd2.getUint32(16), bd2.getUint32(20)), (1080, 1920));
      await tester.pumpAndSettle();
      expect(find.textContaining('공유 창으로 열었어요'), findsOneWidget);
    });

    testWidgets('공유 시트 배경 8종·배치 3종을 고를 수 있고 344dp ×1.75 에서 넘치지 않는다', (tester) async {
      setSize(tester, const Size(344, 740));
      final data = StatsData(records: sampleRecords(_now), now: _now);
      await tester.pumpWidget(
        app(
          Builder(
            builder: (context) => TextButton(
              onPressed: () => showShareSheet(
                context,
                content: ShareContents.streak(data),
                fileName: 't',
                channel: FakeShare(),
              ),
              child: const Text('열기'),
            ),
          ),
          scale: 1.75,
          size: const Size(344, 740),
        ),
      );
      await tester.tap(find.text('열기'));
      await tester.pumpAndSettle();
      for (final b in ShareBg.values) {
        expect(find.bySemanticsLabel('배경 ${b.label}'), findsOneWidget);
      }
      await tester.dragUntilVisible(
        find.text('칸 나누기'),
        find.byType(SingleChildScrollView).last,
        const Offset(0, -200),
      );
      await tester.tap(find.text('칸 나누기'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });

  group('카드 글자 맞춤', () {
    testWidgets('긴 글은 글자를 줄이고, 그래도 안 되면 …로 자른다(낱말 중간에서 꺾지 않음)', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Center(
            child: SizedBox(
              width: 120,
              child: FitText(
                '아주아주아주아주아주아주 긴 한 낱말입니다 정말로 길어요',
                style: const TextStyle(fontSize: 20),
                maxLines: 1,
                minSize: 12,
              ),
            ),
          ),
        ),
      );
      expect(tester.takeException(), isNull);
      final t = tester.widget<Text>(find.byType(Text));
      expect(t.overflow, TextOverflow.ellipsis);
      expect(t.style!.fontSize, lessThanOrEqualTo(20));
    });

    test('keepAll 은 공백을 빼고 글자 사이에만 붙임 표시를 넣는다', () {
      expect(keepAll('가나 다'), '가⁠나 다');
      expect(keepAll('').isEmpty, isTrue);
      expect(keepAll('가나다').replaceAll('⁠', ''), '가나다');
    });

    test('fitFontSize 는 폭에 맞는 가장 큰 크기를 고른다', () {
      const style = TextStyle(fontSize: 30);
      final big = fitFontSize(text: '가나다', style: style, maxWidth: 1000, size: 30, minSize: 10);
      final small = fitFontSize(text: '가나다라마바사아자차카타파하', style: style, maxWidth: 100, size: 30, minSize: 10);
      expect(big, 30);
      expect(small, lessThan(30));
      expect(small, greaterThanOrEqualTo(10));
    });

    testWidgets('모든 배경×배치×비율 카드가 긴 글·큰 숫자에도 넘치지 않는다', (tester) async {
      const long = ShareCardContent(
        eyebrow: '아주 긴 머리글이 들어가도 잘려야 하는 기도의 기록',
        period: '2025년 12월 30일 ~ 2026년 11월 16일 까지의 아주 긴 기간 표시',
        bigNumber: '12,345,678',
        bigUnit: '단을 바쳤어요 그리고 아주 길게 설명이 이어지는 단위 글',
        caption: '네 가지 신비를 고루 묵상했어요 그리고 또 이어지는 아주 긴 설명 문장입니다',
        rows: [
          ('끝까지 바친 묵주기도', '1234번'),
          ('기도 시간', '123시간 59분'),
          ('목표만큼 바친 날', '365일'),
          ('자주 바친 신비', '환희의 신비'),
        ],
      );
      for (final bg in ShareBg.values) {
        for (final l in ShareLayout.values) {
          for (final f in ShareFormat.values) {
            await tester.pumpWidget(
              MaterialApp(
                theme: AppTheme.light(),
                home: Scaffold(
                  body: Center(
                    child: FittedBox(
                      child: ShareCard(content: long, bg: bg, layout: l, format: f),
                    ),
                  ),
                ),
              ),
            );
            expect(tester.takeException(), isNull, reason: '$bg $l $f');
          }
        }
      }
    });

    testWidgets('카드는 시스템 글자 배율·앱 테마와 무관하게 같은 크기·글꼴', (tester) async {
      final data = StatsData(records: sampleRecords(_now), now: _now);
      final c = ShareContents.recap(buildRecap(data.records, RecapKind.month, data.today));
      Future<Size> sizeAt(double scale) async {
        await tester.pumpWidget(
          MediaQuery(
            data: MediaQueryData(textScaler: TextScaler.linear(scale)),
            child: MaterialApp(
              theme: AppTheme.dark(),
              home: Align(alignment: Alignment.topLeft, child: ShareCard(content: c)),
            ),
          ),
        );
        final texts = tester.widgetList<Text>(find.byType(Text)).toList();
        expect(texts.every((t) => t.style?.fontFamily == AppTheme.sansFamily), isTrue);
        expect(texts.every((t) => t.textScaler == TextScaler.noScaling), isTrue);
        return tester.getSize(find.byType(ShareCard));
      }

      expect(await sizeAt(1.0), const Size(360, 360));
      expect(await sizeAt(1.75), const Size(360, 360));
    });
  });

  testWidgets('capturePng 는 논리 크기 × 배율의 PNG 를 만든다', (tester) async {
    final key = GlobalKey();
    await tester.pumpWidget(
      MaterialApp(
        home: Center(
          child: RepaintBoundary(
            key: key,
            child: const SizedBox(width: 40, height: 20, child: ColoredBox(color: Colors.red)),
          ),
        ),
      ),
    );
    final boundary = key.currentContext!.findRenderObject() as RenderRepaintBoundary;
    final png = (await tester.runAsync(() => capturePng(boundary, pixelRatio: 3)))!;
    final bd = ByteData.sublistView(png);
    expect((bd.getUint32(16), bd.getUint32(20)), (120, 60));
  });
}
