import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/avatar/avatar_config.dart';
import 'package:rosary_app/church/avatar/avatar_editor_screen.dart';
import 'package:rosary_app/church/avatar/avatar_pickers.dart';
import 'package:rosary_app/church/avatar/avatar_preview.dart';
import 'package:rosary_app/church/church_constants.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget _app(Widget home, {double textScale = 1.0}) => MaterialApp(
  theme: AppTheme.light(),
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(context)
        .copyWith(textScaler: TextScaler.linear(textScale)),
    child: child!,
  ),
  home: home,
);

Future<AppSettings> _settings() async {
  SharedPreferences.setMockInitialValues({});
  return AppSettings.load();
}

void _view(WidgetTester tester, Size size) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}

/// 화면을 라우트로 열어 결과를 돌려받는 도우미.
class _Opened {
  Object? result;
  bool popped = false;
}

Future<_Opened> _open(
  WidgetTester tester,
  AppSettings settings, {
  bool firstEntry = false,
  Random? random,
  double textScale = 1.0,
}) async {
  final opened = _Opened();
  await tester.pumpWidget(
    _app(
      Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: FilledButton(
              onPressed: () async {
                opened.result = await Navigator.of(context).push<AvatarConfig>(
                  MaterialPageRoute<AvatarConfig>(
                    builder: (_) => AvatarEditorScreen(
                      settings: settings,
                      firstEntry: firstEntry,
                      random: random,
                    ),
                  ),
                );
                opened.popped = true;
              },
              child: const Text('open'),
            ),
          ),
        ),
      ),
      textScale: textScale,
    ),
  );
  await tester.tap(find.text('open'));
  await tester.pumpAndSettle();
  return opened;
}

void main() {
  testWidgets(
    'AvatarPreview renders every gender and style, shows name label',
    (tester) async {
      for (var g = 0; g < 2; g++) {
        for (var style = 0; style < 4; style++) {
          await tester.pumpWidget(
            _app(
              Scaffold(
                body: Center(
                  child: Column(
                    children: [
                      AvatarPreview(
                        config: AvatarConfig(gender: g, style: style, name: 3),
                      ),
                      AvatarHeadThumb(
                        config: AvatarConfig(gender: g, style: style),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
          expect(
            find.text(g == 1 ? '요한' : '데레사'),
            findsOneWidget,
            reason: 'g$g style$style',
          );
          expect(tester.takeException(), isNull);
        }
      }
    },
  );

  testWidgets('first entry: one page with all sections; one tap starts', (
    tester,
  ) async {
    _view(tester, const Size(360, 800));
    final settings = await _settings();
    final opened = await _open(
      tester,
      settings,
      firstEntry: true,
      random: Random(5),
    );
    expect(find.text('처음 오셨네요'), findsOneWidget);
    for (final t in ['성별', '머리 모양', '머리색', '피부색', '세례명', '성당 들어가기']) {
      expect(find.text(t), findsWidgets, reason: t);
    }
    expect(find.text('여성'), findsOneWidget);
    expect(find.text('남성'), findsOneWidget);
    expect(find.text('옷 색'), findsNothing); // 옷 색은 편집 화면에만
    expect(find.text('무작위'), findsNothing);
    // 미리 골라진 값 그대로 시작한다.
    final expected = AvatarConfig.randomStart(Random(5));
    final button = find.byKey(const ValueKey('avatar-confirm'));
    expect(tester.getSize(button).height, greaterThanOrEqualTo(56));
    expect(settings.churchAvatarChosen, isFalse); // 확인 전에는 저장하지 않는다
    await tester.tap(button);
    await tester.pumpAndSettle();
    expect(opened.result, expected);
    expect(settings.churchAvatar, expected);
    expect(settings.churchAvatarChosen, isTrue);
  });

  testWidgets('gender switch changes the hair choices and keeps/falls back the '
      'name', (tester) async {
    _view(tester, const Size(360, 800));
    final settings = await _settings();
    await _open(tester, settings, firstEntry: true, random: Random(5));
    // 성별을 여성으로, 머리 모양/이름을 정한다.
    await tester.tap(find.text('여성'));
    await tester.pumpAndSettle();
    for (final n in AvatarConfig.femaleStyleNames) {
      expect(find.bySemanticsLabel('머리 모양, $n'), findsOneWidget, reason: n);
    }
    await tester.tap(find.bySemanticsLabel('머리 모양, 포니테일'));
    await tester.pump();
    // 세례명을 '아녜스'(여성 5번째)로
    await tester.tap(find.byKey(const ValueKey('name-change')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('name-popular-4')));
    await tester.pumpAndSettle();
    expect(find.text('아녜스'), findsWidgets);
    // 남성으로: 같은 이름이 없으니 가장 인기 있는 이름, 머리 모양 번호는 유지
    await tester.tap(find.text('남성'));
    await tester.pumpAndSettle();
    for (final n in AvatarConfig.maleStyleNames) {
      expect(find.bySemanticsLabel('머리 모양, $n'), findsOneWidget, reason: n);
    }
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('name-chip')),
        matching: find.text('요셉'),
      ),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey('avatar-confirm')));
    await tester.pumpAndSettle();
    expect(settings.churchAvatar.gender, avatarMale);
    expect(settings.churchAvatar.style, 2);
    expect(settings.churchAvatar.nameText, '요셉');
  });

  testWidgets('name picker: popular chips, search, alphabetical list, one tap '
      'selects and closes', (tester) async {
    _view(tester, const Size(360, 800));
    final settings = await _settings();
    await _open(tester, settings, firstEntry: true, random: Random(5));
    await tester.tap(find.text('남성'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('name-change')));
    await tester.pumpAndSettle();
    expect(find.text('세례명 고르기'), findsOneWidget);
    expect(find.text('많이 쓰는 이름'), findsOneWidget);
    expect(find.text('가나다순'), findsOneWidget);
    // 인기 12개가 큰 칩으로 있다
    for (var i = 0; i < popularBaptismalCount; i++) {
      expect(find.byKey(ValueKey('name-popular-$i')), findsOneWidget);
    }
    expect(find.byKey(const ValueKey('name-popular-12')), findsNothing);
    // 검색: '베' 로 시작하는 이름이 먼저
    await tester.enterText(find.byKey(const ValueKey('name-search')), '베');
    await tester.pumpAndSettle();
    expect(find.text('많이 쓰는 이름'), findsNothing);
    expect(find.textContaining('찾은 이름'), findsOneWidget);
    final sheet = find.byType(BaptismalNameSheet);
    expect(
      find.descendant(of: sheet, matching: find.text('베드로')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: sheet, matching: find.text('베네딕토')),
      findsOneWidget,
    );
    expect(find.descendant(of: sheet, matching: find.text('요셉')), findsNothing);
    // 48dp 칸
    final tile = find.byKey(const ValueKey('name-tile-${1}'));
    expect(tester.getSize(tile).height, greaterThanOrEqualTo(48));
    // 결과 없음
    await tester.enterText(find.byKey(const ValueKey('name-search')), '없는이름');
    await tester.pumpAndSettle();
    expect(find.textContaining('찾는 이름이 없어요'), findsOneWidget);
    // 별칭으로 찾는다
    await tester.enterText(find.byKey(const ValueKey('name-search')), '바울');
    await tester.pumpAndSettle();
    expect(
      find.descendant(of: sheet, matching: find.text('바오로')),
      findsOneWidget,
    );
    // 한 번 눌러 고르면 시트가 닫히고 칩에 반영된다
    await tester.tap(find.descendant(of: sheet, matching: find.text('바오로')));
    await tester.pumpAndSettle();
    expect(find.text('세례명 고르기'), findsNothing);
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('name-chip')),
        matching: find.text('바오로'),
      ),
      findsOneWidget,
    );
  });

  testWidgets('name picker: alphabetical (가나다) list reaches the last names', (
    tester,
  ) async {
    _view(tester, const Size(360, 800));
    final settings = await _settings();
    await _open(tester, settings, firstEntry: true, random: Random(5));
    await tester.tap(find.text('여성'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('name-change')));
    await tester.pumpAndSettle();
    // '힐데가르트'는 가나다 순 맨 끝: 스크롤해서 눌러 고른다
    final idx = femaleBaptismalNames.indexOf('힐데가르트');
    final target = find.byKey(ValueKey('name-tile-$idx'));
    await tester.scrollUntilVisible(
      target,
      300,
      scrollable: find.descendant(
        of: find.byType(CustomScrollView),
        matching: find.byType(Scrollable),
      ),
    );
    await tester.drag(find.byType(CustomScrollView), const Offset(0, -200));
    await tester.pumpAndSettle();
    await tester.tap(target);
    await tester.pumpAndSettle();
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('name-chip')),
        matching: find.text('힐데가르트'),
      ),
      findsOneWidget,
    );
  });

  testWidgets('editor: colors, outfit, style, name then save', (tester) async {
    _view(tester, const Size(800, 3000));
    final settings = await _settings();
    final opened = await _open(tester, settings);
    expect(find.text('내 아바타'), findsWidgets);
    for (final t in ['성별', '머리 모양', '머리색', '피부색', '옷 색', '세례명', '무작위', '저장']) {
      expect(find.text(t), findsWidgets, reason: t);
    }
    final swatch = find.bySemanticsLabel('머리색 8, 회색');
    expect(swatch, findsOneWidget);
    final size = tester.getSize(swatch);
    expect(size.width, greaterThanOrEqualTo(48));
    expect(size.height, greaterThanOrEqualTo(48));

    await tester.tap(find.bySemanticsLabel('머리색 8, 회색'));
    await tester.pump();
    await tester.tap(find.bySemanticsLabel('옷 색 12, 테라코타'));
    await tester.pump();
    await tester.tap(find.bySemanticsLabel('구릿빛 피부'));
    await tester.pump();
    await tester.tap(find.bySemanticsLabel('머리 모양, 낮은 쪽머리'));
    await tester.pump();
    expect(find.byIcon(Icons.check), findsNWidgets(3)); // 머리색, 피부색, 옷색

    await tester.tap(find.byKey(const ValueKey('name-change')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('name-popular-8'))); // 카타리나
    await tester.pumpAndSettle();
    expect(settings.churchAvatarChosen, isFalse);
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();
    expect(find.text('open'), findsOneWidget);
    const expected = AvatarConfig(
      gender: 0,
      skin: 2,
      style: 3,
      hair: 7,
      outfit: 11,
      name: 8,
    );
    expect(settings.churchAvatar, expected);
    expect(settings.churchAvatarChosen, isTrue);
    expect(opened.result, expected);
    expect(expected.nameText, '카타리나');
  });

  testWidgets('editor starts from the saved avatar, incl. gender', (
    tester,
  ) async {
    _view(tester, const Size(400, 1000));
    final settings = await _settings();
    settings.churchAvatar = const AvatarConfig(gender: 1, style: 3, name: 2);
    await _open(tester, settings);
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('name-chip')),
        matching: find.text('바오로'),
      ),
      findsOneWidget,
    );
    expect(find.bySemanticsLabel('머리 모양, 넓은 이마'), findsOneWidget);
  });

  testWidgets('random keeps the gender and is deterministic with a seed', (
    tester,
  ) async {
    _view(tester, const Size(400, 1000));
    final settings = await _settings();
    settings.churchAvatar = const AvatarConfig(gender: 1, name: 0);
    await _open(tester, settings, random: Random(1));
    await tester.tap(find.text('무작위'));
    await tester.pump();
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();
    final r = Random(1);
    final expected = AvatarConfig(
      gender: 1,
      skin: r.nextInt(4),
      style: r.nextInt(4),
      hair: r.nextInt(10),
      outfit: r.nextInt(12),
      name: r.nextInt(maleBaptismalNames.length),
    );
    expect(settings.churchAvatar, expected);
  });

  testWidgets('first-entry setup has no overflow at 360x640, text scale 2.0', (
    tester,
  ) async {
    _view(tester, const Size(360, 640));
    final settings = await _settings();
    await _open(
      tester,
      settings,
      firstEntry: true,
      random: Random(2),
      textScale: 2.0,
    );
    expect(tester.takeException(), isNull);
    // 끝까지 스크롤해도 넘치지 않고 버튼이 보인다
    await tester.drag(
      find.byType(SingleChildScrollView),
      const Offset(0, -3000),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('성당 들어가기'), findsOneWidget);
    // 이름 시트도 같은 조건에서 넘치지 않는다(긴 이름 포함).
    await tester.drag(
      find.byType(SingleChildScrollView),
      const Offset(0, 3000),
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const ValueKey('name-change')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('name-change')));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.enterText(find.byKey(const ValueKey('name-search')), '아우');
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('아우구스티노'), findsOneWidget);
  });

  testWidgets('first-entry setup fits without scrolling at 360x800', (
    tester,
  ) async {
    _view(tester, const Size(360, 800));
    final settings = await _settings();
    await _open(tester, settings, firstEntry: true, random: Random(2));
    expect(tester.takeException(), isNull);
    final scroll = tester.state<ScrollableState>(find.byType(Scrollable).first);
    expect(scroll.position.maxScrollExtent, lessThan(1));
    // 성별 선택은 56dp 높이
    expect(
      tester.getSize(find.byKey(const ValueKey('gender-picker'))).height,
      greaterThanOrEqualTo(56),
    );
  });

  testWidgets('editor has no overflow at 360x640 with text scale 1.5', (
    tester,
  ) async {
    _view(tester, const Size(360, 640));
    final settings = await _settings();
    await _open(tester, settings, textScale: 1.5);
    expect(tester.takeException(), isNull);
    await tester.drag(
      find.byType(SingleChildScrollView),
      const Offset(0, -3000),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('저장'), findsOneWidget);
  });
}
