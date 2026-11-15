import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_theme.dart';
import 'package:rosary_app/domain/stations_guide.dart';
import 'package:rosary_app/domain/stations_prayers.dart';
import 'package:rosary_app/ui/stations_guide.dart';
import 'package:rosary_app/ui/stations_sheet.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget _app(Widget home, {double scale = 1, ThemeData? theme}) => MaterialApp(
  theme: theme ?? AppTheme.light(),
  builder: (context, c) => MediaQuery(
    data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)),
    child: c!,
  ),
  home: home,
);

void _phone(WidgetTester t) {
  t.view.devicePixelRatio = 1;
  t.view.physicalSize = const Size(360, 800);
  addTearDown(t.view.reset);
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('steps: 시작 기도 + 14처×5 + 마침 = 72, 공식 본문 순서 그대로', () {
    final s = StationsGuide.steps;
    expect(s.length, 72);
    expect(s.first.kind, StationsGuideKind.opening);
    expect(s.first.parts.single, same(StationsPrayers.opening));
    expect(s.last.kind, StationsGuideKind.closing);
    expect(s.last.parts, isEmpty); // 공식 마침 기도는 없다
    for (var n = 1; n <= 14; n++) {
      final i = StationsGuide.indexOfStation(n);
      final p = StationsPrayers.of(n);
      expect([for (var k = 0; k < 5; k++) s[i + k].kind], [
        StationsGuideKind.move,
        StationsGuideKind.announce,
        StationsGuideKind.verse,
        StationsGuideKind.prayer,
        StationsGuideKind.after,
      ]);
      expect(s[i].rubrics, ['제$n처로 가며']);
      expect(s[i + 1].announce, p.announce);
      expect(s[i + 2].bow, isTrue);
      expect(s[i + 3].parts.single.spoken, p.prayer.spoken);
      expect(s[i + 4].rubrics, p.after);
      expect(s[i + 3].bow, isFalse);
    }
  });

  testWidgets('목록 맨 위 안내 카드 → 바치는 법 시트 → 함께 바치기', (t) async {
    _phone(t);
    await t.pumpWidget(_app(const StationsOfCrossScreen()));
    await t.pumpAndSettle();
    final card = find.byKey(const ValueKey('stations-howto-card'));
    expect(card, findsOneWidget);
    expect(find.text('처음이신가요? 바치는 법'), findsOneWidget);
    expect(
      t.getTopLeft(card).dy,
      lessThan(t.getTopLeft(find.byKey(const ValueKey('stations-start'))).dy),
    );
    await t.tap(card);
    await t.pumpAndSettle();
    expect(find.text('십자가의 길 바치는 법'), findsOneWidget);
    expect(find.text(StationsHowTo.customsNote, skipOffstage: false),
        findsOneWidget);
    expect(find.byKey(const ValueKey('howto-source'), skipOffstage: false),
        findsOneWidget);
    await t.tap(find.byKey(const ValueKey('howto-guide')));
    await t.pumpAndSettle();
    expect(find.byType(StationsGuideScreen), findsOneWidget);
    expect(find.text('시작 기도'), findsOneWidget);
  });

  testWidgets('묵상 시트의 바치는 법 링크', (t) async {
    _phone(t);
    await t.pumpWidget(
      _app(const Scaffold(body: StationsSheet(start: 3))),
    );
    await t.pumpAndSettle();
    final link = find.byKey(const ValueKey('stations-howto-link'));
    await t.ensureVisible(link);
    expect(t.getSize(link).height, greaterThanOrEqualTo(48));
    await t.tap(link);
    await t.pumpAndSettle();
    expect(find.text('십자가의 길 바치는 법'), findsOneWidget);
  });

  testWidgets('안내 모드: 시작 기도 → 1처 … 14처 → 마침, 깊은 절·이동 콜백', (t) async {
    _phone(t);
    final sem = t.ensureSemantics();
    final moved = <int>[];
    bool? done;
    await t.pumpWidget(
      _app(
        Builder(
          builder: (c) => TextButton(
            onPressed: () async =>
                done = await showStationsGuide(c, onStation: moved.add),
            child: const Text('open'),
          ),
        ),
      ),
    );
    await t.tap(find.text('open'));
    await t.pumpAndSettle();
    final next = find.byKey(const ValueKey('guide-next'));
    final prev = find.byKey(const ValueKey('guide-prev'));
    String progress() =>
        t.widget<Text>(find.byKey(const ValueKey('guide-progress'))).data!;
    expect(progress(), '시작 기도');
    expect(t.widget<OutlinedButton>(prev).onPressed, isNull);
    expect(t.getSize(next).height, greaterThanOrEqualTo(48));
    expect(t.getSize(prev).height, greaterThanOrEqualTo(48));
    await t.tap(next);
    await t.pump();
    expect(progress(), '제1처 / 14');
    expect(moved, [1]);
    expect(find.text('제1처로 가며'), findsOneWidget);
    expect(find.byKey(const ValueKey('guide-thumb')), findsOneWidget);
    await t.tap(next); // 알림
    await t.pump();
    expect(find.byKey(const ValueKey('guide-announce')), findsOneWidget);
    expect(find.byKey(const ValueKey('guide-bow')), findsNothing);
    await t.tap(next); // 계응
    await t.pump();
    expect(find.byKey(const ValueKey('guide-bow')), findsOneWidget);
    expect(find.text('깊은 절을 하며'), findsOneWidget);
    expect(find.text('경배하며 찬송하나이다.'), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp('^주송자\n')), findsWidgets);
    expect(find.bySemanticsLabel(RegExp('^다 함께\n')), findsWidgets);
    // 이전으로 돌아가도 이동 콜백은 다시 불리지 않는다.
    await t.tap(prev);
    await t.pump();
    await t.tap(next);
    await t.pump();
    expect(moved, [1]);
    var taps = 3;
    while (progress() != '마침') {
      await t.tap(next);
      await t.pump();
      taps++;
      expect(t.takeException(), isNull);
    }
    expect(taps, 71); // 72단계
    expect(moved, [for (var n = 1; n <= 14; n++) n]);
    expect(find.byKey(const ValueKey('guide-closing-note')), findsOneWidget);
    expect(find.text('마치기'), findsOneWidget);
    await t.tap(next);
    await t.pumpAndSettle();
    expect(done, isTrue);
    sem.dispose();
  });

  for (final (name, theme) in [
    ('밝게', AppTheme.light()),
    ('어둡게', AppTheme.dark()),
    ('성당 테마', ChurchTheme.data()),
  ]) {
    testWidgets('360×800 글자 2배 넘침 없음 ($name)', (t) async {
      _phone(t);
      await t.pumpWidget(
        _app(const StationsGuideScreen(), scale: 2, theme: theme),
      );
      await t.pump();
      final next = find.byKey(const ValueKey('guide-next'));
      for (var i = 0; i < 12; i++) {
        expect(t.takeException(), isNull, reason: 'step $i');
        await t.tap(next);
        await t.pump();
      }
      // 가장 긴 처(12처)와 마침.
      await t.pumpWidget(
        _app(
          const StationsGuideScreen(key: ValueKey('b'), start: 12),
          scale: 2,
          theme: theme,
        ),
      );
      for (var i = 0; i < 15; i++) {
        await t.pump();
        expect(t.takeException(), isNull);
        await t.tap(next);
      }
      await t.pump();
      expect(t.takeException(), isNull);
      expect(find.byKey(const ValueKey('guide-closing-note')), findsOneWidget);
      await t.pumpWidget(
        _app(const StationsOfCrossScreen(), scale: 2, theme: theme),
      );
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
      await t.tap(find.byKey(const ValueKey('stations-howto-card')));
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
      await t.drag(
        find.byKey(const ValueKey('howto-scroll')),
        const Offset(0, -3000),
      );
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
    });
  }
}
