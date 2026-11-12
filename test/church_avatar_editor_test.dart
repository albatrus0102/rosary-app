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

/// 이름 고르기 화면을 열어 결과를 받는 도우미.

class _PickerHost {
  int? result;
  bool closed = false;
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

  testWidgets('name picker opens full screen from the setup screen', (
    tester,
  ) async {
    _view(tester, const Size(360, 800));
    final settings = await _settings();
    await _open(tester, settings, firstEntry: true, random: Random(5));
    await tester.tap(find.text('남성'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('name-change')));
    await tester.pumpAndSettle();
    // 전체 화면 라우트: 앱바(닫기 ✕ + 제목) + 검색창 + 성별 라벨, 바텀시트가 아니다.
    expect(find.byType(BaptismalNameScreen), findsOneWidget);
    expect(find.byType(BottomSheet), findsNothing);
    expect(find.text('세례명 고르기'), findsOneWidget);
    expect(find.byTooltip('닫기'), findsOneWidget);
    expect(find.byType(SearchBar), findsOneWidget);
    expect(find.text('이름 검색 (예: 요, 마리)'), findsOneWidget);
    expect(find.text('남성 세례명 ${maleBaptismalNames.length}개'), findsOneWidget);
    expect(find.byKey(const ValueKey('name-rail')), findsOneWidget);
    expect(
      tester.getSize(find.byType(BaptismalNameScreen)),
      const Size(360, 800),
    );
    // 닫기: 아무것도 바뀌지 않는다.
    await tester.tap(find.byTooltip('닫기'));
    await tester.pumpAndSettle();
    expect(find.byType(BaptismalNameScreen), findsNothing);
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('name-chip')),
        matching: find.text('요셉'),
      ),
      findsOneWidget,
    );
  });

  testWidgets('name picker opens from the editor and returns the choice', (
    tester,
  ) async {
    _view(tester, const Size(400, 1000));
    final settings = await _settings();
    settings.churchAvatar = const AvatarConfig(gender: 0, name: 0);
    await _open(tester, settings);
    expect(find.text('세례명'), findsWidgets);
    expect(find.byKey(const ValueKey('name-change')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('name-change')));
    await tester.pumpAndSettle();
    expect(find.byType(BaptismalNameScreen), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('name-popular-5')));
    await tester.pumpAndSettle();
    expect(find.byType(BaptismalNameScreen), findsNothing);
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('name-chip')),
        matching: find.text('루치아'),
      ),
      findsOneWidget,
    );
  });

  group('name picker screen', () {
    Future<_PickerHost> pick(
      WidgetTester tester, {
      int gender = avatarFemale,
      int selected = 0,
      double textScale = 1.0,
      Size size = const Size(360, 800),
      ThemeData? theme,
    }) async {
      _view(tester, size);
      final host = _PickerHost();
      await tester.pumpWidget(
        MaterialApp(
          theme: theme ?? AppTheme.light(),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: TextScaler.linear(textScale)),
            child: child!,
          ),
          home: Builder(
            builder: (context) => Scaffold(
              body: Center(
                child: FilledButton(
                  onPressed: () async {
                    host.result = await showBaptismalNamePicker(
                      context,
                      gender: gender,
                      selected: selected,
                    );
                    host.closed = true;
                  },
                  child: const Text('open'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      return host;
    }

    Finder tile(int i) => find.byKey(ValueKey('name-tile-$i'));
    Finder header(String id) => find.byKey(ValueKey('name-header-$id'));
    double listTop(WidgetTester t) =>
        t.getTopLeft(find.byKey(const ValueKey('name-list'))).dy;
    bool selectedTile(WidgetTester t, Finder f) =>
        t.widget<ListTile>(f).selected;

    testWidgets('popular section holds the top 8 with a star; sections follow '
        'in 초성 order', (tester) async {
      await pick(tester);
      expect(header('★'), findsOneWidget);
      expect(find.text('많이 쓰는 이름'), findsOneWidget);
      expect(find.byIcon(Icons.star_rounded), findsWidgets);
      for (var i = 0; i < popularBaptismalShown; i++) {
        expect(find.byKey(ValueKey('name-popular-$i')), findsOneWidget);
      }
      expect(
        find.byKey(ValueKey('name-popular-$popularBaptismalShown')),
        findsNothing,
      );
      // 인기순 그대로 위에서 아래로
      final ys = [
        for (var i = 0; i < popularBaptismalShown; i++)
          tester.getTopLeft(find.byKey(ValueKey('name-popular-$i'))).dy,
      ];
      expect(ys, orderedEquals([...ys]..sort()));
      // 각 이름 칸은 56dp 이상, 줄 전체가 눌린다.
      expect(
        tester.getSize(find.byKey(const ValueKey('name-popular-0'))).height,
        greaterThanOrEqualTo(56),
      );
      // 모든 구역이 가나다 순으로, 있는 초성만 만들어진다.
      final initials = [
        for (final g in groupBaptismalNames(avatarFemale)) g.initial,
      ];
      expect(initials.first, 'ㄱ');
      expect(initials, isNot(contains('ㄴ'))); // 여성 목록에는 ㄴ으로 시작하는 이름이 없다
      final order = [for (final i in baptismalInitials) i]
        ..removeWhere((i) => !initials.contains(i));
      expect(initials, order);
      // 구역마다 머리글이 있고(색인으로 건너가며 확인), 구역 안은 가나다순.
      for (final id in initials) {
        await tester.tap(find.byKey(ValueKey('name-rail-$id')));
        await tester.pump();
        expect(header(id), findsOneWidget, reason: id);
      }
      for (final g in groupBaptismalNames(avatarFemale)) {
        final names = [for (final i in g.indices) femaleBaptismalNames[i]];
        expect([...names]..sort(), names, reason: g.initial);
        for (final n in names) {
          expect(baptismalInitial(n), g.initial);
        }
      }
    });

    testWidgets('gender-specific lists', (tester) async {
      await pick(tester, gender: avatarMale);
      expect(find.text('요셉'), findsWidgets);
      expect(find.text('마리아'), findsNothing);
      expect(find.text('남성 세례명 ${maleBaptismalNames.length}개'), findsOneWidget);
      for (var i = 0; i < popularBaptismalShown; i++) {
        expect(
          find.descendant(
            of: find.byKey(ValueKey('name-popular-$i')),
            matching: find.text(maleBaptismalNames[i]),
          ),
          findsOneWidget,
        );
      }
      // 남성 목록에는 ㄴ(니콜라오)이 있다.
      expect(
        groupBaptismalNames(avatarMale).map((g) => g.initial),
        contains('ㄴ'),
      );
      expect(find.byKey(const ValueKey('name-rail-ㄴ')), findsOneWidget);
    });

    testWidgets('female list: 여성 chip and female names', (tester) async {
      await pick(tester, gender: avatarFemale);
      expect(
        find.text('여성 세례명 ${femaleBaptismalNames.length}개'),
        findsOneWidget,
      );
      expect(find.text('마리아'), findsWidgets);
      expect(find.text('요셉'), findsNothing);
    });

    testWidgets('select on tap returns the index and closes at once', (
      tester,
    ) async {
      final host = await pick(tester, gender: avatarMale);
      await tester.tap(find.byKey(const ValueKey('name-popular-3')));
      await tester.pumpAndSettle();
      expect(host.closed, isTrue);
      expect(host.result, 3);
      expect(find.byType(BaptismalNameScreen), findsNothing);
    });

    testWidgets('close button returns null', (tester) async {
      final host = await pick(tester);
      await tester.tap(find.byTooltip('닫기'));
      await tester.pumpAndSettle();
      expect(host.closed, isTrue);
      expect(host.result, isNull);
    });

    testWidgets('search: prefix first, then contains, with alias spellings', (
      tester,
    ) async {
      await pick(tester, gender: avatarFemale);
      await tester.enterText(find.byKey(const ValueKey('name-search')), '리');
      await tester.pumpAndSettle();
      // 목록은 구역 없이 결과만 보여 준다.
      expect(find.byKey(const ValueKey('name-list')), findsNothing);
      expect(find.byKey(const ValueKey('name-rail')), findsNothing);
      expect(find.byKey(const ValueKey('name-result-count')), findsOneWidget);
      final starts = femaleBaptismalNames.indexOf('리디아');
      final contains = femaleBaptismalNames.indexOf('마리아');
      expect(tile(starts), findsOneWidget);
      expect(tile(contains), findsOneWidget);
      expect(
        tester.getTopLeft(tile(starts)).dy,
        lessThan(tester.getTopLeft(tile(contains)).dy),
      );
      expect(tile(femaleBaptismalNames.indexOf('안나')), findsNothing);
    });

    testWidgets('search by alias shows the canonical name and the alias', (
      tester,
    ) async {
      final host = await pick(tester, gender: avatarMale);
      await tester.enterText(find.byKey(const ValueKey('name-search')), '바울');
      await tester.pumpAndSettle();
      final i = maleBaptismalNames.indexOf('바오로');
      expect(tile(i), findsOneWidget);
      expect(find.text('비슷한 표기: 바울'), findsOneWidget);
      expect(find.text('요셉'), findsNothing);
      await tester.tap(tile(i));
      await tester.pumpAndSettle();
      expect(host.result, i);
    });

    testWidgets('empty search shows the M3 empty state; button clears', (
      tester,
    ) async {
      await pick(tester);
      await tester.enterText(find.byKey(const ValueKey('name-search')), '없는이름');
      await tester.pumpAndSettle();
      expect(find.text('찾는 이름이 없어요'), findsOneWidget);
      expect(find.text('검색어 지우기'), findsOneWidget);
      expect(find.byIcon(Icons.search_off), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('name-clear-query')));
      await tester.pumpAndSettle();
      expect(find.text('찾는 이름이 없어요'), findsNothing);
      expect(find.byKey(const ValueKey('name-list')), findsOneWidget);
      expect(find.byKey(const ValueKey('name-rail')), findsOneWidget);
      expect(
        tester.widget<EditableText>(find.byType(EditableText)).controller.text,
        isEmpty,
      );
    });

    testWidgets('search clear icon resets the list; list keeps its place', (
      tester,
    ) async {
      await pick(tester, selected: femaleBaptismalNames.indexOf('힐데가르트'));
      final before = tester
          .state<ScrollableState>(
            find.descendant(
              of: find.byKey(const ValueKey('name-list')),
              matching: find.byType(Scrollable),
            ),
          )
          .position
          .pixels;
      expect(before, greaterThan(0));
      await tester.enterText(find.byKey(const ValueKey('name-search')), '마');
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('지우기'));
      await tester.pumpAndSettle();
      final after = tester
          .state<ScrollableState>(
            find.descendant(
              of: find.byKey(const ValueKey('name-list')),
              matching: find.byType(Scrollable),
            ),
          )
          .position
          .pixels;
      expect(after, before);
    });

    testWidgets('rail letters jump to their section header', (tester) async {
      await pick(tester, gender: avatarFemale);
      expect(header('ㅁ'), findsNothing); // 처음에는 화면 밖
      await tester.tap(find.byKey(const ValueKey('name-rail-ㅁ')));
      await tester.pumpAndSettle();
      expect(header('ㅁ'), findsOneWidget);
      expect(tester.getTopLeft(header('ㅁ')).dy, closeTo(listTop(tester), 1));
      // 맨 끝 구역은 끝까지 가서 보인다.
      await tester.tap(find.byKey(const ValueKey('name-rail-ㅎ')));
      await tester.pumpAndSettle();
      expect(header('ㅎ'), findsOneWidget);
      expect(tile(femaleBaptismalNames.indexOf('힐데가르트')), findsOneWidget);
      // 맨 위 ★로 돌아온다.
      await tester.tap(find.byKey(const ValueKey('name-rail-★')));
      await tester.pumpAndSettle();
      expect(tester.getTopLeft(header('★')).dy, closeTo(listTop(tester), 1));
    });

    testWidgets('dragging the rail shows a bubble with the letter and jumps', (
      tester,
    ) async {
      await pick(tester, gender: avatarFemale);
      expect(find.byKey(const ValueKey('name-rail-bubble')), findsNothing);
      final g = await tester.startGesture(
        tester.getCenter(find.byKey(const ValueKey('name-rail-ㄱ'))),
      );
      await tester.pump();
      expect(find.byKey(const ValueKey('name-rail-bubble')), findsOneWidget);
      // ㅂ 위치까지 끌어 내린다.
      final to = tester.getCenter(find.byKey(const ValueKey('name-rail-ㅂ')));
      await g.moveTo(to);
      await tester.pump();
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('name-rail-bubble')),
          matching: find.text('ㅂ'),
        ),
        findsOneWidget,
      );
      expect(header('ㅂ'), findsOneWidget);
      await g.up();
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('name-rail-bubble')), findsNothing);
    });

    testWidgets('rail letters are big enough and announce 초성 jumps', (
      tester,
    ) async {
      await pick(tester, gender: avatarFemale);
      final handle = tester.ensureSemantics();
      expect(
        tester.getSize(find.byKey(const ValueKey('name-rail'))).width,
        greaterThanOrEqualTo(24),
      );
      final ids = [
        '★',
        for (final g in groupBaptismalNames(avatarFemale)) g.initial,
      ];
      for (var i = 0; i + 1 < ids.length; i++) {
        final a = tester.getCenter(find.byKey(ValueKey('name-rail-${ids[i]}')));
        final b = tester.getCenter(
          find.byKey(ValueKey('name-rail-${ids[i + 1]}')),
        );
        expect(b.dy - a.dy, greaterThanOrEqualTo(20), reason: ids[i]);
      }
      expect(find.bySemanticsLabel('초성 ㄱ으로 이동'), findsOneWidget);
      expect(find.bySemanticsLabel('초성 ㄹ로 이동'), findsOneWidget);
      expect(find.bySemanticsLabel('많이 쓰는 이름으로 이동'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('selected name in the 가나다 list is highlighted and visible '
        'when opened', (tester) async {
      final idx = femaleBaptismalNames.indexOf('힐데가르트');
      await pick(tester, gender: avatarFemale, selected: idx);
      expect(tile(idx), findsOneWidget);
      expect(selectedTile(tester, tile(idx)), isTrue);
      final list = tester.getRect(find.byKey(const ValueKey('name-list')));
      expect(list.contains(tester.getCenter(tile(idx))), isTrue);
      expect(find.byIcon(Icons.check), findsOneWidget);
      // 다른 칸은 선택 표시가 없다.
      expect(
        selectedTile(tester, tile(femaleBaptismalNames.indexOf('헬레나'))),
        isFalse,
      );
    });

    testWidgets('a selection in the popular range stays at the top of the '
        'list', (tester) async {
      final idx = maleBaptismalNames.indexOf('바오로');
      await pick(tester, gender: avatarMale, selected: idx);
      expect(
        tester
            .widget<ListTile>(find.byKey(ValueKey('name-popular-$idx')))
            .selected,
        isTrue,
      );
      expect(tester.getTopLeft(header('★')).dy, closeTo(listTop(tester), 1));
    });

    testWidgets('a selection in the middle of the 가나다 list opens centered', (
      tester,
    ) async {
      final idx = maleBaptismalNames.indexOf('안토니오');
      await pick(tester, gender: avatarMale, selected: idx);
      final list = tester.getRect(find.byKey(const ValueKey('name-list')));
      final c = tester.getCenter(tile(idx));
      expect(list.contains(c), isTrue);
      expect((c.dy - list.center.dy).abs(), lessThan(40));
    });

    testWidgets('selected popular name shows in the popular section', (
      tester,
    ) async {
      await pick(tester, gender: avatarFemale, selected: 5);
      final p = find.byKey(const ValueKey('name-popular-5'));
      expect(selectedTile(tester, p), isTrue);
      expect(
        tester
            .getRect(find.byKey(const ValueKey('name-list')))
            .contains(tester.getCenter(p)),
        isTrue,
      );
    });

    testWidgets('dark theme has no errors', (tester) async {
      await pick(
        tester,
        gender: avatarMale,
        selected: 20,
        theme: AppTheme.dark(),
      );
      expect(tester.takeException(), isNull);
      await tester.enterText(find.byKey(const ValueKey('name-search')), '요');
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });

    testWidgets('no overflow at 360x640 with text scale 2.0 (list, search, '
        'empty, rail)', (tester) async {
      await pick(
        tester,
        gender: avatarFemale,
        selected: femaleBaptismalNames.indexOf('스콜라스티카'),
        textScale: 2.0,
        size: const Size(360, 640),
      );
      expect(tester.takeException(), isNull);
      // 색인 띠가 있으면 글자 칸이 20dp 이상이어야 하고, 없으면 검색으로 찾는다.
      final rail = find.byKey(const ValueKey('name-rail'));
      if (rail.evaluate().isNotEmpty) {
        final h = tester.getSize(rail).height;
        expect(
          h / (groupBaptismalNames(avatarFemale).length + 1),
          greaterThanOrEqualTo(20),
        );
        await tester.tap(find.byKey(const ValueKey('name-rail-ㅊ')));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      }
      await tester.enterText(find.byKey(const ValueKey('name-search')), '스콜');
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('스콜라스티카'), findsOneWidget);
      await tester.enterText(find.byKey(const ValueKey('name-search')), '없는이름');
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('검색어 지우기'), findsOneWidget);
    });

    testWidgets('rail is hidden when the screen is too short for it', (
      tester,
    ) async {
      await pick(
        tester,
        gender: avatarFemale,
        textScale: 2.0,
        size: const Size(360, 400),
      );
      expect(tester.takeException(), isNull);
      expect(find.byKey(const ValueKey('name-rail')), findsNothing);
      expect(find.byKey(const ValueKey('name-search')), findsOneWidget);
    });
  });

  test('초성 helpers: double consonants fold into the base letter', () {
    expect(baptismalInitial('까치'), 'ㄱ');
    expect(baptismalInitial('따'), 'ㄷ');
    expect(baptismalInitial('빠'), 'ㅂ');
    expect(baptismalInitial('싸'), 'ㅅ');
    expect(baptismalInitial('짜'), 'ㅈ');
    expect(baptismalInitial('힐'), 'ㅎ');
    expect(baptismalInitial('A'), '');
    expect(baptismalInitial(''), '');
    for (final g in [avatarFemale, avatarMale]) {
      final all = [for (final grp in groupBaptismalNames(g)) ...grp.indices]
        ..sort();
      expect(all, [for (var i = 0; i < baptismalNamesFor(g).length; i++) i]);
    }
    expect(baptismalAliasMatch(avatarMale, 1, '피터'), '피터');
    expect(baptismalAliasMatch(avatarMale, 1, '베드'), isNull);
    expect(baptismalAliasMatch(avatarMale, 1, ''), isNull);
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
    await tester.tap(find.byKey(const ValueKey('name-popular-5'))); // 루치아
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
      name: 5,
    );
    expect(settings.churchAvatar, expected);
    expect(settings.churchAvatarChosen, isTrue);
    expect(opened.result, expected);
    expect(expected.nameText, '루치아');
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
