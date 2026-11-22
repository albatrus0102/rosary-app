import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/guide_voice.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/ui/widgets/coach_tour.dart';
import 'package:rosary_app/ui/widgets/guide_card.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'guide_fakes.dart';

Future<AppSettings> _settings([Map<String, Object> v = const {}]) async {
  SharedPreferences.setMockInitialValues(v);
  return AppSettings.load();
}

Widget _host(Widget child) => MaterialApp(home: Scaffold(body: child));

void main() {
  late RecordingGuideEngine voice;
  setUp(() {
    voice = RecordingGuideEngine();
    GuideVoice.engine = voice;
  });
  tearDown(() => GuideVoice.engine = SilentGuideEngine());

  GuideCard card(
    AppSettings s, {
    String text = '첫 글',
    bool Function()? blocked,
  }) => GuideCard(
    keyPrefix: 'g',
    counter: '1 / 2',
    title: '제목',
    text: text,
    primaryLabel: '다음',
    onPrimary: () {},
    secondaryLabel: '그만 보기',
    onSecondary: () {},
    settings: s,
    speakBlocked: blocked,
  );

  testWidgets('큰 글 규격: 본문 20sp 이상, 제목 22~24sp, 단추 56dp·18sp', (tester) async {
    final s = await _settings();
    await tester.pumpWidget(_host(card(s)));
    expect(
      tester.widget<Text>(find.byKey(const ValueKey('g-text'))).style!.fontSize,
      greaterThanOrEqualTo(20),
    );
    expect(
      tester
          .widget<Text>(find.byKey(const ValueKey('g-title')))
          .style!
          .fontSize,
      inInclusiveRange(22, 24),
    );
    for (final label in ['다음', '그만 보기']) {
      final b = find.ancestor(
        of: find.text(label),
        matching: find.byWidgetPredicate((w) => w is ButtonStyleButton),
      );
      expect(tester.getSize(b).height, greaterThanOrEqualTo(56));
      final t = tester.widget<Text>(
        find.descendant(of: b, matching: find.text(label)),
      );
      final size =
          t.style?.fontSize ??
          DefaultTextStyle.of(tester.element(find.text(label))).style.fontSize;
      expect(size, 18);
    }
  });

  testWidgets('보이면 읽고, 글이 바뀌면 새 글을 읽고, 사라지면 멈춘다', (tester) async {
    final s = await _settings();
    await tester.pumpWidget(_host(card(s)));
    expect(voice.spoken, ['제목. 첫 글']);
    await tester.pumpWidget(_host(card(s, text: '둘째 글')));
    expect(voice.spoken, ['제목. 첫 글', '제목. 둘째 글']);
    final stops = voice.stops;
    await tester.pumpWidget(_host(const SizedBox()));
    expect(voice.stops, greaterThan(stops));
    expect(GuideVoice.current, isNull);
  });

  testWidgets('스피커 단추: 끄면 멈추고 저장, 켜면 지금 글을 읽는다(48dp)', (tester) async {
    final s = await _settings();
    await tester.pumpWidget(_host(card(s)));
    final btn = find.byKey(const ValueKey('g-tts'));
    expect(tester.getSize(btn).shortestSide, greaterThanOrEqualTo(48));
    expect(find.byTooltip('소리로 읽기 끄기'), findsOneWidget);
    final stops = voice.stops;
    await tester.tap(btn);
    await tester.pump();
    expect(s.guideTtsOn, isFalse);
    expect(voice.stops, greaterThan(stops));
    expect(find.byTooltip('소리로 읽기 켜기'), findsOneWidget);
    expect((await SharedPreferences.getInstance()).getBool('guideTtsOn'), false);
    await tester.pumpWidget(_host(card(s, text: '셋째 글')));
    expect(voice.spoken, ['제목. 첫 글'], reason: '꺼져 있으면 새 글도 읽지 않는다');
    await tester.tap(btn);
    await tester.pump();
    expect(s.guideTtsOn, isTrue);
    expect(voice.spoken.last, '제목. 셋째 글');
  });

  testWidgets('저장에서 꺼져 있으면 처음부터 읽지 않는다', (tester) async {
    final s = await _settings({'guideTtsOn': false});
    await tester.pumpWidget(_host(card(s)));
    expect(voice.spoken, isEmpty);
  });

  testWidgets('기도 소리(성가·선창 목소리)가 나는 중에는 읽지 않는다', (tester) async {
    final s = await _settings();
    var prayerAudio = true;
    await tester.pumpWidget(_host(card(s, blocked: () => prayerAudio)));
    expect(voice.spoken, isEmpty);
    prayerAudio = false;
    await tester.pumpWidget(_host(card(s, text: '둘째 글', blocked: () => prayerAudio)));
    expect(voice.spoken, ['제목. 둘째 글']);
  });

  testWidgets('묵주기도 화면 안내(CoachTour)도 큰 글 카드를 쓰고 읽어 준다', (tester) async {
    final s = await _settings();
    final key = GlobalKey();
    var closed = false;
    await tester.pumpWidget(
      _host(
        Stack(
          children: [
            Center(child: SizedBox(key: key, width: 100, height: 60)),
            Positioned.fill(
              child: CoachTour(
                steps: [
                  CoachStep(target: key, text: '여기를 눌러요'),
                  CoachStep(target: key, text: '그다음이에요'),
                ],
                onClose: (_) => closed = true,
                settings: s,
              ),
            ),
          ],
        ),
      ),
    );
    await tester.pump();
    await tester.pump();
    expect(
      tester
          .widget<Text>(find.byKey(const ValueKey('coach-text')))
          .style!
          .fontSize,
      greaterThanOrEqualTo(20),
    );
    expect(
      tester.getSize(find.byKey(const ValueKey('coach-next'))).height,
      greaterThanOrEqualTo(56),
    );
    expect(voice.spoken, ['여기를 눌러요']);
    await tester.tap(find.byKey(const ValueKey('coach-next')));
    await tester.pump();
    expect(voice.spoken.last, '그다음이에요');
    final stops = voice.stops;
    await tester.tap(find.byKey(const ValueKey('coach-next')));
    await tester.pump();
    expect(closed, isTrue);
    expect(voice.stops, greaterThanOrEqualTo(stops));
  });
}
