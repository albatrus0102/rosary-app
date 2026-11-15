// 십자가의 길(14처): 데이터·생성물 일치, 부활절·사순 시기 계산, 기도 배경 그림·대비, 묵상 시트, 성당 칩·가기 시트, 더보기·오늘 진입점.
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_cross.dart';
import 'package:rosary_app/church/church_go_sheet.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/church/church_theme.dart';
import 'package:rosary_app/domain/art_credits.dart';
import 'package:rosary_app/domain/mystery_art.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/stations_of_cross.dart';
import 'package:rosary_app/domain/stations_prayers.dart';
import 'package:rosary_app/ui/stations_sheet.dart';
import 'package:rosary_app/ui/widgets/prayer_background.dart';
import 'package:rosary_app/ui/widgets/stations_prayer_view.dart';
import 'package:rosary_app/ui/widgets/stations_lent_card.dart';

import 'church_screen_fakes.dart';

/// 명칭 스냅샷: 한국천주교주교회의 『가톨릭 기도서』 ‘십자가의 길’의 14처 표기 그대로
/// (https://cbck.or.kr/Catholic/Prayer, 2026-11-15 대조. 공식 본문이 바뀔 때만 고친다).
const _titles = [
  '예수님께서 사형 선고 받으심',
  '예수님께서 십자가 지심',
  '예수님께서 기력이 떨어져 넘어지심',
  '예수님께서 성모님을 만나심',
  '시몬이 예수님을 도와 십자가 짐',
  '베로니카, 수건으로 예수님의 얼굴을 닦아 드림',
  '기력이 다하신 예수님께서 두 번째 넘어지심',
  '예수님께서 예루살렘 부인들을 위로하심',
  '예수님께서 세 번째 넘어지심',
  '예수님께서 옷 벗김 당하심',
  '예수님께서 십자가에 못 박히심',
  '예수님께서 십자가 위에서 돌아가심',
  '제자들이 예수님 시신을 십자가에서 내림',
  '예수님께서 무덤에 묻히심',
];

Widget _app(
  Widget child, {
  double textScale = 1.0,
  Brightness brightness = Brightness.light,
  ThemeData? theme,
}) => MaterialApp(
  theme:
      theme ??
      (brightness == Brightness.light ? AppTheme.light() : AppTheme.dark()),
  builder: (context, c) => MediaQuery(
    data: MediaQuery.of(context)
        .copyWith(textScaler: TextScaler.linear(textScale)),
    child: c!,
  ),
  home: child,
);

/// 시트를 여는 단추 하나만 있는 화면. 결과를 [out]에 담는다.
Widget _opener(
  List<StationsSheetResult?> out, {
  int start = 1,
  StationsSheetMode mode = StationsSheetMode.browse,
}) => Scaffold(
  body: Builder(
    builder: (context) => Center(
      child: TextButton(
        onPressed: () async =>
            out.add(await showStationsSheet(context, start: start, mode: mode)),
        child: const Text('open'),
      ),
    ),
  ),
);

void main() {
  group('data', () {
    test('14 stations, numbered 1..14, official titles unchanged', () {
      final all = StationsOfCross.all;
      expect(all, hasLength(14));
      for (var i = 0; i < 14; i++) {
        expect(all[i].n, i + 1);
        expect(all[i].title, _titles[i]);
        expect(all[i].roman, StationsOfCross.romanNumerals[i]);
        expect(all[i].label, '제${i + 1}처');
        expect(all[i].meditation.trim(), isNotEmpty);
        expect(all[i].petition.trim(), isNotEmpty);
      }
      // 성경에 직접 나오지 않는 전승의 처: 3·4·6·7·9
      expect(
        [
          for (final s in all)
            if (s.tradition) s.n,
        ],
        [3, 4, 6, 7, 9],
      );
    });

    test('meditations stay short (2~3 sentences) and quote no scripture', () {
      for (final s in StationsOfCross.all) {
        final sentences = RegExp(r'[.!?。]').allMatches(s.meditation).length;
        expect(sentences, inInclusiveRange(1, 3), reason: '${s.n}처');
        expect(s.meditation.length, lessThan(140), reason: '${s.n}처');
        // 장·절 표시만: 따옴표로 인용한 본문이 없다.
        expect(s.meditation.contains('“') || s.meditation.contains('"'), false);
        expect(s.refs, isNot(contains('“')));
      }
    });

    test('images are bundled, ≤40KB each', () {
      for (final s in StationsOfCross.all) {
        final f = File(s.imageAsset);
        expect(f.existsSync(), isTrue, reason: s.imageAsset);
        expect(f.lengthSync(), lessThanOrEqualTo(40 * 1024));
      }
    });

    test('web plaque data (cross_data.js) matches the Dart data', () {
      final js = File('assets/church/cross_data.js').readAsStringSync();
      for (final s in StationsOfCross.all) {
        expect(js, contains('"n": ${s.n},'));
        expect(js, contains('"roman": "${s.roman}"'));
        expect(js, contains('"title": "${s.title}"'));
        expect(js, contains('"short": "${s.short}"'));
      }
      final src = File('data/stations_of_cross.json').readAsStringSync();
      for (final s in StationsOfCross.all) {
        expect(src, contains(s.meditation));
      }
    });

    test('art credits cover the stations and every background', () {
      expect(stationsArtCredit.credit, contains('푸겔'));
      expect(mysteryArtCredits, hasLength(18));
      for (final c in [stationsArtCredit, ...mysteryArtCredits]) {
        expect(
          c.license.startsWith('Public domain') || c.license == 'CC0 1.0',
          isTrue,
          reason: c.use,
        );
      }
    });
  });

  group('Easter and Lent', () {
    test('Easter Sunday for known years', () {
      final known = {
        2000: DateTime(2000, 4, 23),
        2008: DateTime(2008, 3, 23),
        2011: DateTime(2011, 4, 24),
        2019: DateTime(2019, 4, 21),
        2024: DateTime(2024, 3, 31),
        2025: DateTime(2025, 4, 20),
        2026: DateTime(2026, 4, 5),
        2027: DateTime(2027, 3, 28),
        2038: DateTime(2038, 4, 25),
        2285: DateTime(2285, 3, 22),
      };
      known.forEach((y, d) => expect(easterSunday(y), d, reason: '$y'));
    });

    test('Ash Wednesday and Good Friday', () {
      expect(ashWednesday(2026), DateTime(2026, 2, 18));
      expect(goodFriday(2026), DateTime(2026, 4, 3));
      expect(ashWednesday(2027), DateTime(2027, 2, 10));
      expect(goodFriday(2027), DateTime(2027, 3, 26));
      // 윤년(2024): 2월 29일을 지나 계산
      expect(ashWednesday(2024), DateTime(2024, 2, 14));
      for (var y = 1990; y <= 2100; y++) {
        expect(ashWednesday(y).weekday, DateTime.wednesday, reason: '$y');
        expect(goodFriday(y).weekday, DateTime.friday, reason: '$y');
        expect(easterSunday(y).weekday, DateTime.sunday, reason: '$y');
      }
    });

    test('season covers Ash Wednesday..Good Friday inclusive', () {
      expect(isStationsSeason(DateTime(2026, 2, 17, 23, 59)), isFalse);
      expect(isStationsSeason(DateTime(2026, 2, 18, 0, 1)), isTrue);
      expect(isStationsSeason(DateTime(2026, 3, 15)), isTrue);
      expect(isStationsSeason(DateTime(2026, 4, 3, 22)), isTrue);
      expect(isStationsSeason(DateTime(2026, 4, 4)), isFalse);
      expect(isStationsSeason(DateTime(2026, 11, 13)), isFalse);
    });
  });

  group('prayer background', () {
    test(
      'every set/decade has a bundled picture; sorrowful 3·4·5 use stations',
      () {
        for (final a in allMysteryArtAssets) {
          expect(File(a).existsSync(), isTrue, reason: a);
        }
        expect(
          mysteryArtFor(MysterySet.sorrowful, 3).asset,
          StationsOfCross.byNumber(1).imageAsset,
        );
        expect(
          mysteryArtFor(MysterySet.sorrowful, 4).asset,
          StationsOfCross.byNumber(2).imageAsset,
        );
        expect(
          mysteryArtFor(MysterySet.sorrowful, 5).asset,
          StationsOfCross.byNumber(12).imageAsset,
        );
        // 단이 없는 기도(시작)는 1단 그림
        expect(
          mysteryArtFor(MysterySet.joyful, null),
          mysteryArtFor(MysterySet.joyful, 1),
        );
      },
    );

    test('bundle size: backgrounds + stations + 3D atlas ≤ 1MB', () {
      var total = File('assets/church/cross_pack.js').lengthSync();
      for (final d in ['assets/images/stations', 'assets/images/mysteries']) {
        for (final f in Directory(d).listSync().whereType<File>()) {
          total += f.lengthSync();
        }
      }
      expect(total, lessThanOrEqualTo(1000 * 1000));
    });

    test('scrim keeps WCAG AA 4.5:1 for text roles over any pixel', () {
      for (final theme in [AppTheme.light(), AppTheme.dark()]) {
        final s = theme.colorScheme;
        final a = prayerScrimAlpha(s);
        expect(a, inInclusiveRange(0.72, 0.98));
        for (final worst in const [Color(0xFF000000), Color(0xFFFFFFFF)]) {
          final bg = Color.alphaBlend(s.surface.withValues(alpha: a), worst);
          for (final c in [s.onSurface, s.onSurfaceVariant, s.primary]) {
            // 그 테마의 '나쁜 쪽'(밝은 테마=검정, 어두운 테마=흰색)에서만 요구한다.
            final bad =
                (s.brightness == Brightness.light) ==
                (worst == const Color(0xFF000000));
            if (bad) {
              expect(contrastRatio(c, bg), greaterThanOrEqualTo(4.5));
            }
          }
        }
      }
    });
  });

  group('meditation sheet', () {
    testWidgets('browse: next/prev, closing prayer after 14', (tester) async {
      final out = <StationsSheetResult?>[];
      await tester.pumpWidget(_app(_opener(out, start: 13)));
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      expect(find.text(_titles[12]), findsOneWidget);
      expect(find.text('13 / 14'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('stations-next')));
      await tester.pumpAndSettle();
      expect(find.text(_titles[13]), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('stations-prev')));
      await tester.pumpAndSettle();
      expect(find.text(_titles[12]), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('stations-next')));
      await tester.pumpAndSettle();
      expect(find.text('마치며'), findsOneWidget); // 단추 이름
      await tester.tap(find.byKey(const ValueKey('stations-next')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('stations-closing')), findsOneWidget);
      expect(find.text(StationsOfCross.closing), findsOneWidget);
      // 공식 기도서에 마침 기도가 없으므로 앱의 글임을 밝힌다.
      expect(find.byKey(const ValueKey('stations-closing-note')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('stations-finish')));
      await tester.pumpAndSettle();
      expect(out.single?.action, StationsSheetAction.complete);
    });

    testWidgets('pilgrimage: "다음 처로" closes with the station number', (
      tester,
    ) async {
      final out = <StationsSheetResult?>[];
      await tester.pumpWidget(
        _app(_opener(out, start: 5, mode: StationsSheetMode.pilgrimage)),
      );
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      expect(find.text('다음 처로'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('stations-next')));
      await tester.pumpAndSettle();
      expect(out.single?.action, StationsSheetAction.next);
      expect(out.single?.n, 5);
    });

    for (final size in const [Size(360, 800), Size(412, 915)]) {
      for (final b in Brightness.values) {
        testWidgets(
          'no overflow at ${size.width.toInt()}x${size.height.toInt()} '
          '${b.name}, text ×2',
          (tester) async {
            setView(tester, size);
            final out = <StationsSheetResult?>[];
            await tester.pumpWidget(
              _app(
                _opener(out, start: 5, mode: StationsSheetMode.pilgrimage),
                textScale: 2,
                brightness: b,
              ),
            );
            await tester.tap(find.text('open'));
            await tester.pumpAndSettle();
            expect(tester.takeException(), isNull);
            // 단추 두 개가 화면 안에 있고 서로 겹치지 않는다.
            final next = tester.getRect(
              find.byKey(const ValueKey('stations-next')),
            );
            final close = tester.getRect(
              find.byKey(const ValueKey('stations-dismiss')),
            );
            expect(next.overlaps(close), isFalse);
            expect(next.bottom, lessThanOrEqualTo(size.height));
            expect(next.right, lessThanOrEqualTo(size.width));
            // 본문은 스크롤로 끝까지 읽을 수 있다.
            await tester.drag(
              find.byKey(const ValueKey('stations-scroll')),
              const Offset(0, -2000),
            );
            await tester.pumpAndSettle();
            // 공식 기도문의 마지막 줄과 출처가 보이고, 접힌 '묵상'을 펼치면 청원이 보인다.
            expect(
              find.text(StationsPrayers.of(5).prayer.spoken.last),
              findsOneWidget,
            );
            expect(
              find.byKey(const ValueKey('stations-prayer-credit')),
              findsOneWidget,
            );
            expect(
              find.text(StationsOfCross.byNumber(5).petition),
              findsNothing,
            );
            await tester.tap(
              find.byKey(const ValueKey('stations-meditation-5')),
            );
            await tester.pumpAndSettle();
            await tester.drag(
              find.byKey(const ValueKey('stations-scroll')),
              const Offset(0, -2000),
            );
            await tester.pumpAndSettle();
            expect(
              find.text(StationsOfCross.byNumber(5).petition),
              findsOneWidget,
            );
            expect(tester.takeException(), isNull);
          },
        );
      }
    }
  });

  group('official prayers (가톨릭 기도서)', () {
    test('every station has the full prayer with ┼ ◎ ○ markers', () {
      final all = StationsPrayers.all;
      expect(all, hasLength(14));
      for (final p in all) {
        final st = StationsOfCross.byNumber(p.n);
        // 알림 문장 = 공식 처 명칭 + '을 묵상합시다.'
        expect(p.announce, '${st.title}을 묵상합시다.', reason: '${p.n}처');
        expect(p.movingRubric, '제${p.n}처로 가며');
        expect(p.moving.role, StationsPrayerRole.all);
        expect(p.moving.spoken, ['어머니께 청하오니', '제 맘속에 주님 상처 깊이 새겨 주소서.']);
        expect(p.verse.map((v) => v.role), [
          StationsPrayerRole.leader,
          StationsPrayerRole.all,
        ]);
        expect(p.verse[0].spoken, ['주님께서는 십자가로 온 세상을 구원하셨나이다.']);
        expect(p.verse[1].spoken, ['예수 그리스도님,', '경배하며 찬송하나이다.']);
        // '깊은 절을 하며'는 기도문이 아니라 지시문이다.
        expect(p.verse[1].lines[1].rubric, isTrue);
        expect(p.verse[1].lines[1].text, '깊은 절을 하며');
        expect(p.prayer.role, StationsPrayerRole.cantor);
        expect(p.prayer.lines.length, greaterThanOrEqualTo(4), reason: '${p.n}');
        expect(p.prayer.spoken.first, contains('구세주 예수님'), reason: '${p.n}');
        expect(p.prayer.spoken.last, endsWith('소서.'), reason: '${p.n}처');
        expect(p.after, ['잠깐 묵상한다.', '주님의 기도, 성모송, 영광송.']);
        for (final part in p.parts) {
          for (final l in part.lines) {
            expect(l.text.trim(), l.text);
            expect(l.text, isNotEmpty);
          }
        }
      }
      // 4처·14처는 호칭이 다르다(공식 본문 그대로).
      expect(all[3].prayer.spoken.first, '구세주 예수님과 성모 마리아님,');
      expect(all[13].prayer.spoken.first, '돌무덤에 묻히신 구세주 예수님,');
      // 12처는 '구세주 예수님,'으로 시작하는 기도가 두 번 이어진다.
      expect(
        all[11].prayer.spoken.where((l) => l == '구세주 예수님,'),
        hasLength(2),
      );
    });

    test('markers follow the prayer book legend (일러두기 4)', () {
      expect(StationsPrayerRole.leader.glyph, '┼');
      expect(StationsPrayerRole.leader.official, '집전자 또는 주송자');
      expect(StationsPrayerRole.cantor.glyph, '○');
      expect(StationsPrayerRole.cantor.official, '계 또는 선창자');
      expect(StationsPrayerRole.response.glyph, '●');
      expect(StationsPrayerRole.response.official, '응');
      expect(StationsPrayerRole.all.glyph, '◎');
      expect(StationsPrayerRole.all.official, '합송');
      for (final r in StationsPrayerRole.values) {
        expect(r.glyph.runes, hasLength(1));
        expect(r.label.trim(), isNotEmpty);
      }
      expect(StationsPrayers.rolesUsed.toSet(), {
        for (final p in StationsPrayers.all)
          for (final part in [StationsPrayers.opening, ...p.parts]) part.role,
      });
    });

    test('opening prayer and source', () {
      expect(StationsPrayers.opening.role, StationsPrayerRole.leader);
      expect(StationsPrayers.opening.spoken, hasLength(10));
      expect(StationsPrayers.opening.spoken.first, '주 예수님,');
      expect(
        StationsPrayers.opening.spoken.last,
        '모든 죄인이 회개하도록 은혜를 내려 주소서.',
      );
      expect(StationsPrayers.openingRubric, '먼저 깊이 뉘우치고 아래의 기도를 바친다.');
      expect(StationsPrayers.sourceCredit, contains('한국천주교주교회의'));
      expect(StationsPrayers.sourceCredit, contains('가톨릭 기도서'));
      expect(StationsPrayers.sourceCopyright, contains('한국천주교주교회의'));
      expect(StationsPrayers.sourceUrl, startsWith('https://cbck.or.kr/'));
    });

    test('generated Dart matches data/stations_prayers.json line by line', () {
      final src =
          jsonDecode(File('data/stations_prayers.json').readAsStringSync())
              as Map<String, dynamic>;
      final st = (src['stations'] as List).cast<Map<String, dynamic>>();
      expect(st, hasLength(14));
      for (final s in st) {
        final p = StationsPrayers.of(s['n'] as int);
        expect(p.announce, s['announce']);
        expect(p.prayer.spoken, (s['prayer'] as List).cast<String>());
      }
      expect(
        StationsPrayers.opening.spoken,
        ((src['opening'] as Map)['lines'] as List).cast<String>(),
      );
      final markers = src['markers'] as Map<String, dynamic>;
      for (final r in StationsPrayerRole.values) {
        expect((markers[r.name] as Map)['glyph'], r.glyph);
      }
    });

    testWidgets('sheet shows the prayer first; 묵상 is collapsed', (
      tester,
    ) async {
      setView(tester, const Size(412, 2400));
      final out = <StationsSheetResult?>[];
      await tester.pumpWidget(_app(_opener(out, start: 1)));
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      // 1처: 시작 기도가 먼저.
      expect(
        find.byKey(const ValueKey('stations-opening-prayer')),
        findsOneWidget,
      );
      expect(find.text('주 예수님,'), findsOneWidget);
      expect(find.byKey(const ValueKey('stations-prayer-1')), findsOneWidget);
      final p = StationsPrayers.of(1);
      for (final l in p.prayer.spoken) {
        expect(find.text(l), findsOneWidget);
      }
      expect(find.text('제1처로 가며'), findsOneWidget);
      expect(find.text('깊은 절을 하며'), findsOneWidget);
      // 기호: ┼ 는 시작 기도와 계응에, ◎ 는 '어머니께…'와 응답에, ○ 는 처별 기도에.
      expect(find.text('┼'), findsNWidgets(2));
      expect(find.text('◎'), findsNWidgets(2));
      expect(find.text('○'), findsOneWidget);
      // 화면 낭독: 기호 대신 역할 이름을 읽는다.
      final handle = tester.ensureSemantics();
      expect(
        find.bySemanticsLabel(RegExp('^선창자\n구세주 예수님,')),
        findsOneWidget,
      );
      expect(find.bySemanticsLabel(RegExp('^주송자\n주님께서는')), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('^다 함께\n어머니께')), findsOneWidget);
      handle.dispose();
      // 앱의 보조 묵상은 접혀 있다.
      final st = StationsOfCross.byNumber(1);
      expect(find.text('묵상'), findsOneWidget);
      expect(find.text(st.meditation), findsNothing);
      await tester.tap(find.byKey(const ValueKey('stations-meditation-1')));
      await tester.pumpAndSettle();
      expect(find.text(st.meditation), findsOneWidget);
      expect(find.text(st.petition), findsOneWidget);
      // 2처에는 시작 기도가 없다.
      await tester.tap(find.byKey(const ValueKey('stations-next')));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('stations-opening-prayer')),
        findsNothing,
      );
      expect(find.byKey(const ValueKey('stations-prayer-2')), findsOneWidget);
    });

    // 글자 2배·좁은 화면·어두운 테마·성당(먹색+금색) 테마에서 기호와 본문이 겹치지 않는다.
    for (final (name, theme) in [
      ('light', AppTheme.light()),
      ('dark', AppTheme.dark()),
      ('church', ChurchTheme.data()),
    ]) {
      testWidgets('markers never overlap lines at 360x800 ×2 ($name)', (
        tester,
      ) async {
        setView(tester, const Size(360, 800));
        await tester.pumpWidget(
          _app(
            const Scaffold(
              body: SingleChildScrollView(
                padding: EdgeInsets.all(AppSpace.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    StationsOpeningPrayer(),
                    StationsPrayerSection(n: 7),
                  ],
                ),
              ),
            ),
            textScale: 2,
            theme: theme,
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        final parts = find.byType(StationsPrayerPartView);
        expect(parts, findsNWidgets(5));
        for (final e in parts.evaluate()) {
          final part = (e.widget as StationsPrayerPartView).part;
          final scope = find.byWidget(e.widget);
          final mark = tester.getRect(
            find.descendant(of: scope, matching: find.text(part.role.glyph)),
          );
          for (final l in part.lines) {
            final r = tester.getRect(
              find.descendant(of: scope, matching: find.text(l.text)),
            );
            expect(mark.overlaps(r), isFalse, reason: l.text);
            expect(r.right, lessThanOrEqualTo(360));
            expect(r.left, greaterThanOrEqualTo(mark.right));
          }
        }
        // 기호·지시문 색은 테마 색 역할을 쓴다(하드코딩 없음).
        final scheme = theme.colorScheme;
        final markText = tester.widget<Text>(find.text('○'));
        expect(markText.style?.color, scheme.primary);
        final rubric = tester.widget<Text>(find.text('잠깐 묵상한다.'));
        expect(rubric.style?.color, scheme.onSurfaceVariant);
      });
    }

    testWidgets('list screen opens with the official opening prayer', (
      tester,
    ) async {
      await tester.pumpWidget(_app(const StationsOfCrossScreen()));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('stations-opening-prayer')),
        findsOneWidget,
      );
      expect(find.text('먼저 깊이 뉘우치고 아래의 기도를 바친다.'), findsOneWidget);
    });
  });

  group('church', () {
    test('bridge: crossNear and stations.cross', () {
      final a = SceneEvent.parse('{"e":"crossNear","n":3}');
      expect((a! as SceneCrossNear).n, 3);
      expect(
        (SceneEvent.parse('{"e":"crossNear","n":null}')! as SceneCrossNear).n,
        isNull,
      );
      expect(SceneEvent.parse('{"e":"crossNear","n":15}'), isNull);
      expect(SceneEvent.parse('{"e":"crossNear","n":"3"}'), isNull);
      final s = SceneEvent.parse(
        '{"e":"stations","church":"basic","candle":1,"altar":1,"font":0,"entrance":1,"cross":14}',
      );
      expect((s! as SceneStations).cross, 14);
    });

    testWidgets('go sheet lists 십자가의 길 only when plaques are hung', (
      tester,
    ) async {
      await tester.pumpWidget(wrapApp(const Scaffold(body: ChurchGoSheet())));
      expect(find.byKey(const ValueKey('go-cross')), findsNothing);
      await tester.pumpWidget(
        wrapApp(const Scaffold(body: ChurchGoSheet(hasCross: true))),
      );
      expect(find.byKey(const ValueKey('go-cross')), findsOneWidget);
    });

    testWidgets('pilgrimage: go → walk to 1처 → sheet → 다음 처로 walks on', (
      tester,
    ) async {
      final h = await pumpChurch(tester, size: const Size(412, 915));
      h.scene.emit(
        const SceneStations(candle: 1, altar: 1, font: 0, cross: 14),
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('go-button')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('go-cross')));
      await tester.pumpAndSettle();
      expect(h.scene.argsOf('walkTo').last, {'kind': 'cross', 'index': 0});
      h.scene.emit(const SceneWalkStart('cross'));
      await tester.pump();
      h.scene.emit(const SceneCrossNear(1));
      h.scene.emit(const SceneWalkDone('cross', index: 0));
      await tester.pumpAndSettle();
      expect(find.text(_titles[0]), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('stations-next')));
      await tester.pumpAndSettle();
      expect(h.scene.argsOf('walkTo').last, {'kind': 'cross', 'index': 1});
      await tester.pump(const Duration(seconds: 7));
    });

    testWidgets(
      'chip near a plaque opens the sheet; sits below the glass chip',
      (tester) async {
        final h = await pumpChurch(tester, size: const Size(360, 800));
        h.scene.emit(const SceneCrossNear(6));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 300));
        final chip = find.byKey(const ValueKey('cross-chip'));
        expect(chip, findsOneWidget);
        expect(tester.getSize(chip).height, greaterThanOrEqualTo(48));
        expect(find.textContaining('십자가의 길 6처'), findsOneWidget);
        final go = tester.getRect(find.byKey(const ValueKey('go-button')));
        expect(tester.getRect(chip).overlaps(go), isFalse);
        await tester.tap(chip);
        await tester.pumpAndSettle();
        expect(find.text(_titles[5]), findsOneWidget);
        Navigator.of(tester.element(find.byType(BottomSheet))).pop();
        await tester.pumpAndSettle();
        h.scene.emit(const SceneCrossNear(null));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 300));
        await tester.pump(const Duration(milliseconds: 300));
        expect(chip, findsNothing);
        await tester.pump(const Duration(seconds: 7));
      },
    );

    testWidgets('chip keeps one line at text ×2, 360 wide', (tester) async {
      setView(tester, const Size(360, 800));
      await tester.pumpWidget(
        wrapApp(
          Scaffold(
            body: Center(
              child: SizedBox(
                width: 328,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: ChurchCrossChip(n: 6, onTap: () {}),
                ),
              ),
            ),
          ),
          textScale: 2.0,
        ),
      );
      expect(tester.takeException(), isNull);
      expect(
        tester.getSize(find.byType(ChurchCrossChip)).width,
        lessThanOrEqualTo(328),
      );
    });
  });

  group('entry points', () {
    testWidgets('list screen opens the sheet at the tapped station', (
      tester,
    ) async {
      setView(tester, const Size(412, 915));
      await tester.pumpWidget(_app(const StationsOfCrossScreen()));
      await tester.tap(find.byKey(const ValueKey('stations-item-2')));
      await tester.pumpAndSettle();
      expect(find.text('2 / 14'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('Lent card shows only in season', (tester) async {
      addTearDown(() => StationsLentCard.clock = DateTime.now);
      StationsLentCard.clock = () => DateTime(2026, 3, 10);
      expect(StationsLentCard.inSeason, isTrue);
      StationsLentCard.clock = () => DateTime(2026, 11, 13);
      expect(StationsLentCard.inSeason, isFalse);
      await tester.pumpWidget(
        _app(const Scaffold(body: Center(child: StationsLentCard()))),
      );
      await tester.tap(find.byKey(const ValueKey('lent-stations-card')));
      await tester.pumpAndSettle();
      expect(find.byType(StationsOfCrossScreen), findsOneWidget);
    });
  });
}
