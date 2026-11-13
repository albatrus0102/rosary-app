// 십자가의 길(14처): 데이터·생성물 일치, 부활절·사순 시기 계산, 기도 배경 그림·대비, 묵상 시트, 성당 칩·가기 시트, 더보기·오늘 진입점.
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_cross.dart';
import 'package:rosary_app/church/church_go_sheet.dart';
import 'package:rosary_app/church/church_scene_controller.dart';
import 'package:rosary_app/domain/art_credits.dart';
import 'package:rosary_app/domain/mystery_art.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/domain/stations_of_cross.dart';
import 'package:rosary_app/ui/stations_sheet.dart';
import 'package:rosary_app/ui/widgets/prayer_background.dart';
import 'package:rosary_app/ui/widgets/stations_lent_card.dart';

import 'church_screen_fakes.dart';

/// 명칭 스냅샷: 전통 14처 표기(문구를 고치면 이 목록과 docs/ux/STATIONS_OF_CROSS.md 를 함께 고친다).
const _titles = [
  '예수님께서 사형 선고를 받으심',
  '예수님께서 십자가를 지심',
  '예수님께서 처음 넘어지심',
  '예수님께서 성모님을 만나심',
  '키레네 사람 시몬이 예수님을 도와 십자가를 짐',
  '베로니카가 수건으로 예수님의 얼굴을 닦아 드림',
  '예수님께서 두 번째 넘어지심',
  '예수님께서 예루살렘 부인들을 위로하심',
  '예수님께서 세 번째 넘어지심',
  '예수님께서 옷 벗김을 당하심',
  '예수님께서 십자가에 못 박히심',
  '예수님께서 십자가 위에서 돌아가심',
  '예수님의 시신을 십자가에서 내림',
  '예수님께서 무덤에 묻히심',
];

Widget _app(
  Widget child, {
  double textScale = 1.0,
  Brightness brightness = Brightness.light,
}) => MaterialApp(
  theme: brightness == Brightness.light ? AppTheme.light() : AppTheme.dark(),
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
    test('14 stations, numbered 1..14, traditional titles unchanged', () {
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
      expect(find.text('마침 기도'), findsOneWidget); // 단추 이름
      await tester.tap(find.byKey(const ValueKey('stations-next')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('stations-closing')), findsOneWidget);
      expect(find.text(StationsOfCross.closing), findsOneWidget);
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
