// 십자가의 길 그림 연작(대체 성화): 데이터 검증, 묵상 시트의 출처·안내, 목록, 출처 화면.
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/church/church_catalog.dart';
import 'package:rosary_app/domain/art_credits.dart';
import 'package:rosary_app/domain/stations_series.dart';
import 'package:rosary_app/ui/art_credits_screen.dart';
import 'package:rosary_app/ui/stations_sheet.dart';

Widget _app(
  Widget child, {
  double textScale = 1,
  Brightness b = Brightness.light,
}) => MaterialApp(
  theme: b == Brightness.light ? AppTheme.light() : AppTheme.dark(),
  builder: (context, c) => MediaQuery(
    data: MediaQuery.of(context)
        .copyWith(textScaler: TextScaler.linear(textScale)),
    child: c!,
  ),
  home: child,
);

Widget _opener(StationsSeries? series, {int start = 1}) => Scaffold(
  body: Builder(
    builder: (context) => Center(
      child: TextButton(
        onPressed: () => showStationsSheet(
          context,
          start: start,
          series: series,
          logOpen: false,
        ),
        child: const Text('open'),
      ),
    ),
  ),
);

void _phone(WidgetTester t, [Size size = const Size(360, 800)]) {
  t.view.devicePixelRatio = 1;
  t.view.physicalSize = size;
  addTearDown(t.view.reset);
}

void main() {
  final src = jsonDecode(
    File('data/stations_series.json').readAsStringSync(),
  ) as Map<String, dynamic>;

  group('series data', () {
    test('generated files are up to date with the JSON source', () {
      final all = StationsSeriesCatalog.all;
      final list = (src['series'] as List).cast<Map<String, dynamic>>();
      expect(all.map((s) => s.id), list.map((s) => s['id']));
      expect(StationsSeriesCatalog.assignments, src['assignments']);
      expect(StationsSeriesCatalog.disclosure, src['disclosure']);
      expect(StationsSeriesCatalog.fallback.id, src['default']);
      expect(StationsSeriesCatalog.fallback.id, 'fugel');
      final js = File('assets/church/cross_data.js').readAsStringSync();
      for (final s in all) {
        final m = list.firstWhere((e) => e['id'] == s.id);
        expect(s.title, m['title']);
        expect(s.licenseLabel, m['license_label']);
        expect(s.photographer, m['photographer']);
        expect(js, contains('"file": "${m['pack']}"'));
      }
      (src['assignments'] as Map).forEach((c, sid) {
        expect(js, contains('"$c": "$sid"'));
      });
    });

    test('every bundled church is assigned an existing series', () {
      final ids = StationsSeriesCatalog.all.map((s) => s.id).toSet();
      const bundled = [
        'basic', 'stpeter', 'lateran', 'maggiore', //
        'stpaul', 'milan', 'florence', 'myeongdong',
      ];
      for (final c in bundled) {
        expect(ChurchCatalog.byId.containsKey(c), isTrue, reason: c);
        expect(
          ids.contains(StationsSeriesCatalog.assignments[c]),
          isTrue,
          reason: c,
        );
      }
      for (final e in StationsSeriesCatalog.assignments.entries) {
        expect(ChurchCatalog.byId.containsKey(e.key), isTrue, reason: e.key);
        expect(ids.contains(e.value), isTrue, reason: e.key);
      }
      // 모르는 성당·성당 밖은 기본 연작
      expect(StationsSeriesCatalog.forChurch('nowhere').id, 'fugel');
      expect(StationsSeriesCatalog.forChurch(null).id, 'fugel');
      expect(StationsSeriesCatalog.forChurch('stpeter').id, 'previati');
      // 성당마다 다른 그림: 쓰이는 연작이 4개 이상
      expect(
        StationsSeriesCatalog.assignments.values.toSet().length,
        greaterThanOrEqualTo(4),
      );
    });

    test('14 pictures mapped and bundled per series, ≤40KB each', () {
      for (final s in StationsSeriesCatalog.all) {
        expect(s.fileUrls, hasLength(14), reason: s.id);
        expect(s.fileUrls.toSet(), hasLength(s.id == 'mosler' ? 1 : 14));
        for (var n = 1; n <= 14; n++) {
          final f = File(s.imageAsset(n));
          expect(f.existsSync(), isTrue, reason: s.imageAsset(n));
          expect(f.lengthSync(), lessThanOrEqualTo(40 * 1024));
          expect(s.fileUrl(n), startsWith('https://'));
        }
        final dir = s.assetDir;
        expect(
          File('pubspec.yaml').readAsStringSync(),
          contains('    - $dir/\n'),
          reason: '$dir 가 pubspec assets 에 있어야 한다',
        );
      }
    });

    test('licenses are on the allow-list; CC BY entries carry attribution', () {
      final allowed = (src['allowed_licenses'] as List).cast<String>();
      expect(allowed, ['PD', 'CC0', 'CC-BY']);
      for (final m in (src['series'] as List).cast<Map<String, dynamic>>()) {
        expect(allowed, contains(m['license']), reason: '${m['id']}');
        // NC·ND·SA 조건은 번들하지 않는다.
        expect(
          RegExp('NC|ND|SA').hasMatch(m['license_label'] as String),
          isFalse,
          reason: '${m['id']}',
        );
      }
      for (final s in StationsSeriesCatalog.all) {
        expect(s.licenseUrl, startsWith('https://creativecommons.org/'));
        expect(s.source, startsWith('https://'));
        expect(s.changes, isNotEmpty);
        expect(s.rights, anyOf('확인', '출시 전 확인'));
        if (s.license == StationsLicense.ccBy) {
          // CC BY: 촬영자, 라이선스 주소, 파일 주소, 변경 여부
          expect(s.photographer, isNot(contains('미확인')), reason: s.id);
          expect(s.photographer.trim(), isNotEmpty);
          expect(s.licenseLabel, startsWith('CC BY'));
          expect(s.licenseUrl, contains('/licenses/by/'));
          expect(s.creditLine, contains(s.photographer));
          expect(s.creditLine, contains(s.licenseLabel));
          expect(s.creditLine, contains(s.changes));
          for (final u in s.fileUrls) {
            expect(u, startsWith('https://commons.wikimedia.org/wiki/File:'));
          }
        }
      }
      // 프레비아티(바티칸 박물관 소장)는 출시 전 확인 대상으로 남긴다.
      expect(StationsSeriesCatalog.byId('previati').rights, '출시 전 확인');
      expect(File('docs/BACKLOG.md').readAsStringSync(), contains('프레비아티'));
    });

    test('bundle size: all series pictures + atlases ≤ 3.2MB', () {
      var total = 0;
      for (final f in Directory(
        'assets/images/stations',
      ).listSync(recursive: true).whereType<File>()) {
        total += f.lengthSync();
      }
      for (final f in Directory('assets/church').listSync().whereType<File>()) {
        if (f.uri.pathSegments.last.startsWith('cross_pack')) {
          total += f.lengthSync();
        }
      }
      expect(total, lessThanOrEqualTo(3200 * 1000));
    });

    test('credits list covers every series', () {
      expect(
        stationsSeriesCredits,
        hasLength(StationsSeriesCatalog.all.length),
      );
      expect(stationsArtCredit.credit, contains('푸겔'));
    });
  });

  group('sheet', () {
    for (final s in StationsSeriesCatalog.all) {
      testWidgets('shows credit line + substitute-art notice (${s.id})', (
        t,
      ) async {
        _phone(t);
        await t.pumpWidget(_app(_opener(s, start: 3)));
        await t.tap(find.text('open'));
        await t.pumpAndSettle();
        final credit = t.widget<Text>(
          find.byKey(const ValueKey('stations-art-credit')),
        );
        expect(credit.data, '그림: ${s.creditLine}');
        expect(credit.data, contains(s.year));
        expect(credit.data, contains(s.photographer));
        expect(credit.data, contains(s.licenseLabel));
        final note = t.widget<Text>(
          find.byKey(const ValueKey('stations-art-disclosure')),
        );
        expect(note.data, '이 그림은 이 성당에 실제로 걸린 작품이 아니라 로사리움이 고른 대체 성화입니다.');
        // 그림은 그 연작의 3처
        final img = t.widget<Image>(find.byType(Image));
        expect(
          ((img.image as ResizeImage).imageProvider as AssetImage).assetName,
          s.imageAsset(3),
        );
        expect(t.takeException(), isNull);
      });
    }

    testWidgets('default series (no church) is Fugel and still disclosed', (
      t,
    ) async {
      _phone(t);
      await t.pumpWidget(_app(_opener(null)));
      await t.tap(find.text('open'));
      await t.pumpAndSettle();
      expect(find.textContaining('푸겔'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('stations-art-disclosure')),
        findsOneWidget,
      );
    });

    for (final b in Brightness.values) {
      testWidgets('text ×2 (${b.name}): no overflow, notice below credit', (
        t,
      ) async {
        _phone(t, const Size(320, 640));
        for (final s in StationsSeriesCatalog.all) {
          await t.pumpWidget(_app(_opener(s, start: 5), textScale: 2, b: b));
          await t.tap(find.text('open'));
          await t.pumpAndSettle();
          expect(t.takeException(), isNull, reason: s.id);
          await t.dragUntilVisible(
            find.byKey(const ValueKey('stations-art-disclosure')),
            find.byKey(const ValueKey('stations-scroll')),
            const Offset(0, -200),
          );
          await t.pumpAndSettle();
          final credit = t.getRect(
            find.byKey(const ValueKey('stations-art-credit')),
          );
          final note = t.getRect(
            find.byKey(const ValueKey('stations-art-disclosure')),
          );
          // 출처 줄 아래에 안내가 겹치지 않고 놓이고, 둘 다 화면 폭 안에 든다.
          expect(note.top, greaterThanOrEqualTo(credit.bottom), reason: s.id);
          expect(credit.left, greaterThanOrEqualTo(0));
          expect(credit.right, lessThanOrEqualTo(320));
          expect(note.right, lessThanOrEqualTo(320));
          expect(t.takeException(), isNull, reason: s.id);
          await t.tap(find.byKey(const ValueKey('stations-close')));
          await t.pumpAndSettle();
        }
      });
    }
  });

  group('list and credits screens', () {
    testWidgets('list uses the given series pictures and names it', (t) async {
      _phone(t);
      final s = StationsSeriesCatalog.forChurch('milan');
      await t.pumpWidget(_app(StationsOfCrossScreen(series: s)));
      await t.pumpAndSettle();
      final first = t.widget<Image>(
        find.descendant(
          of: find.byKey(const ValueKey('stations-item-1')),
          matching: find.byType(Image),
        ),
      );
      final p = first.image;
      final name = p is ResizeImage
          ? (p.imageProvider as AssetImage).assetName
          : (p as AssetImage).assetName;
      expect(name, s.imageAsset(1));
      await t.scrollUntilVisible(
        find.byKey(const ValueKey('stations-art-disclosure')),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.textContaining(s.title), findsOneWidget);
      // 누르면 같은 연작으로 시트가 열린다
      await t.scrollUntilVisible(
        find.byKey(const ValueKey('stations-item-14')),
        -200,
        scrollable: find.byType(Scrollable).first,
      );
      await t.tap(find.byKey(const ValueKey('stations-item-14')));
      await t.pumpAndSettle();
      expect(find.textContaining(s.photographer), findsWidgets);
      expect(t.takeException(), isNull);
    });

    testWidgets('credits screen lists every series with license + notice', (
      t,
    ) async {
      _phone(t, const Size(360, 30000));
      await t.pumpWidget(_app(const ArtCreditsScreen(), textScale: 2));
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
      expect(
        find.byKey(const ValueKey('art-credits-disclosure')),
        findsOneWidget,
      );
      for (final s in StationsSeriesCatalog.all) {
        final card = find.byKey(ValueKey('art-series-${s.id}'));
        expect(card, findsOneWidget, reason: s.id);
        for (final text in [s.title, s.photographer, s.licenseUrl, s.changes]) {
          expect(
            find.descendant(
              of: card,
              matching: find.textContaining(text, findRichText: true),
            ),
            findsWidgets,
            reason: '${s.id}: $text',
          );
        }
      }
      // CC BY 연작: 파일별 원본 주소를 펼쳐 볼 수 있다
      final cc = StationsSeriesCatalog.all.where(
        (s) => s.license == StationsLicense.ccBy,
      );
      for (final s in cc) {
        await t.tap(find.byKey(ValueKey('art-series-files-${s.id}')));
        await t.pumpAndSettle();
        expect(find.textContaining(s.fileUrl(11)), findsOneWidget);
      }
      expect(t.takeException(), isNull);
    });
  });
}
