import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/glass/glass_catalog.dart';

GlassCatalog _real() => GlassCatalog.parse(
  File('assets/church/glass_catalog.json').readAsStringSync(),
);

Map<String, Object?> _win(String id, {Map<String, Object?>? patch}) {
  final m = <String, Object?>{
    'id': id,
    'title_ko': '시험 창',
    'title_en': 'Test',
    'location': '샤르트르 대성당 · 샤르트르 · 프랑스',
    'date_author': 'c. 1235년 · 작가 미상',
    'form': 'rose',
    'real_size_m': {'width': 2.0, 'height': 4.0, 'status': 'known'},
    'aspect_w_over_h': 0.5,
    'description_ko': '설명',
    'verify': '',
    'color_note': '파랑 바탕, 빨강',
    'source': {
      'kind': 'commons',
      'title': 'File:x.jpg',
      'author': '작가',
      'license': 'CC BY 4.0',
      'license_url': 'https://creativecommons.org/licenses/by/4.0/',
      'url': 'https://commons.wikimedia.org/wiki/File:x.jpg',
      'credit': '"x" by 작가, CC BY 4.0',
      'credit_required': true,
    },
    'files': {
      '1k': {
        'path': 'assets/church/glass_${id}_1k.webp',
        'px': [512, 1024],
        'bundled': true,
      },
      '2k': {
        'path': 'assets/church/glass_${id}_2k.webp',
        'px': [1024, 2048],
        'bundled': true,
      },
      'master': {'path': 'art/glass_masters/glass_$id.webp', 'bundled': false},
    },
    'suggestedChurches': [
      {'church': 'basic', 'use': 'reference'},
    ],
    'restoration': '',
    'limitations': '',
  };
  if (patch != null) m.addAll(patch);
  return m;
}

GlassCatalog _of(List<Map<String, Object?>> ws, {int? thisYear}) =>
    GlassCatalog.parse(
      jsonEncode({'version': 1, 'windows': ws}),
      thisYear: thisYear,
    );

void main() {
  group('real catalog', () {
    test('all 46 windows load with no errors', () {
      final c = _real();
      expect(c.issues.where((i) => i.isError), isEmpty);
      expect(c.all, hasLength(46));
      // 치수와 사진 비율이 2% 넘게 어긋나는 박물관 패널 3점은 경고로 남는다(카탈로그 확인 필요).
      expect(
        {for (final i in c.issues) i.id},
        {'panel_catherine_donor', 'panel_gethsemane', 'grisaille_aconite'},
      );
      expect(c.byId('grisaille_aconite')!.sizeMismatch, greaterThan(0.1));
      expect(c.byId('tiffany_hinds')!.sizeMismatch, isNull);
      for (final w in c.all) {
        expect(glassIdPattern.hasMatch(w.id), isTrue, reason: w.id);
        expect(w.source.licenseKind, isNotNull, reason: w.id);
        expect(w.file1k.bundled && w.file2k.bundled, isTrue);
        expect(File(w.file1k.path).existsSync(), isTrue, reason: w.file1k.path);
        expect(File(w.file2k.path).existsSync(), isTrue, reason: w.file2k.path);
      }
      expect({for (final w in c.all) w.id}, hasLength(46));
    });

    test('license counts and CC BY credit rules', () {
      final c = _real();
      int n(GlassLicense l) =>
          c.all.where((w) => w.source.licenseKind == l).length;
      expect(n(GlassLicense.cc0), 13);
      expect(n(GlassLicense.publicDomain), 19);
      expect(n(GlassLicense.ccBy), 14);
      for (final w in c.all.where(
        (w) => w.source.licenseKind == GlassLicense.ccBy,
      )) {
        expect(w.source.creditRequired, isTrue, reason: w.id);
        expect(w.source.credit, contains(w.source.author), reason: w.id);
        expect(w.source.licenseUrl, startsWith('https://creativecommons.org'));
      }
    });

    test('placements: 7 authentic, 79 reference', () {
      final c = _real();
      final all = [for (final w in c.all) ...w.placements];
      expect(
        all.where((p) => p.kind == GlassPlacementKind.authentic),
        hasLength(7),
      );
      expect(
        all.where((p) => p.kind == GlassPlacementKind.reference),
        hasLength(79),
      );
      expect(
        c
            .byChurch('stpeter', kind: GlassPlacementKind.authentic)
            .map((w) => w.id),
        ['dove_stpeter'],
      );
      expect(c.byChurch('florence').first.isAuthentic, isTrue);
      expect(c.byChurch('nope'), isEmpty);
      expect(c.byId('dove_stpeter')!.isAuthentic, isTrue);
    });

    test('every window has an era, a form and at least one color tag', () {
      final c = _real();
      for (final w in c.all) {
        expect(w.colors, isNotEmpty, reason: '${w.id}: ${w.colorNote}');
        expect(w.shape, isNot(GlassForm.other), reason: '${w.id}: ${w.form}');
      }
      final noEra = [
        for (final w in c.all)
          if (w.era == null) w.id,
      ];
      // '미상'만 있는 창만 시대가 없다.
      expect(noEra, ['milan_apse_lower']);
    });

    test('site grouping covers known churches', () {
      final c = _real();
      expect(c.sites.last, kSiteOther);
      expect(c.sites, contains('샤르트르'));
      expect(c.bySite('샤르트르').length, greaterThanOrEqualTo(8));
      expect(c.bySite('클리블랜드 미술관').length, 7);
      expect(c.byForm(GlassForm.rose), isNotEmpty);
      expect(c.byForm(GlassForm.alabaster), hasLength(3));
      expect(c.byColor(GlassColorTag.clear), isNotEmpty);
    });

    test('window of the day: deterministic, rotates, covers everything', () {
      final c = _real();
      final d = DateTime(2026, 11, 12, 3);
      expect(
        c.windowOfTheDay(d)!.id,
        c.windowOfTheDay(DateTime(2026, 11, 12, 23))!.id,
      );
      final ids = <String>{};
      for (var i = 0; i < 46; i++) {
        ids.add(c.windowOfTheDay(DateTime(2026, 11, 12 + i))!.id);
      }
      expect(ids, hasLength(46));
      expect(
        c.windowOfTheDay(d)!.id,
        isNot(c.windowOfTheDay(DateTime(2026, 11, 13))!.id),
      );
    });
  });

  group('validation', () {
    test('bad id is dropped with an error', () {
      final c = _of([_win('Bad-Id'), _win('good_id')]);
      expect(c.all.map((w) => w.id), ['good_id']);
      expect(c.issues.single.isError, isTrue);
      expect(_win('a' * 41)['id'], hasLength(41));
      expect(_of([_win('a' * 41)]).all, isEmpty);
    });

    test('license allow-list: CC0/PD/CC BY only', () {
      GlassCatalog withLicense(String l) => _of([
        _win(
          'x1',
          patch: {
            'source': {
              ...(_win('x1')['source'] as Map<String, Object?>),
              'license': l,
            },
          },
        ),
      ]);
      expect(withLicense('CC0 1.0').all, hasLength(1));
      expect(withLicense('Public domain').all, hasLength(1));
      expect(withLicense('CC BY 2.0').all, hasLength(1));
      expect(withLicense('CC BY-SA 4.0').all, isEmpty);
      expect(withLicense('CC BY-NC 4.0').all, isEmpty);
      expect(withLicense('All rights reserved').all, isEmpty);
    });

    test('aspect vs real size within 2% (only when both known)', () {
      expect(
        _of([
          _win('ok', patch: {'aspect_w_over_h': 0.505}),
        ]).all,
        hasLength(1),
      );
      final bad = _of([
        _win('bad', patch: {'aspect_w_over_h': 0.55}),
      ]);
      expect(bad.all, hasLength(1)); // 창은 보이되 경고를 남긴다.
      expect(bad.issues.single.isError, isFalse);
      expect(bad.issues.single.message, contains('어긋남'));
      expect(bad.all.single.sizeMismatch, closeTo(0.1, 0.001));
      // 치수를 모르면 검사하지 않는다.
      final unknown = _of([
        _win(
          'unk',
          patch: {
            'aspect_w_over_h': 0.9,
            'real_size_m': {'width': null, 'height': null, 'status': 'unknown'},
          },
        ),
      ]);
      expect(unknown.all, hasLength(1));
      final oneSided = _of([
        _win(
          'one',
          patch: {
            'aspect_w_over_h': 0.9,
            'real_size_m': {'width': 10.5, 'height': null, 'status': 'known'},
          },
        ),
      ]);
      expect(oneSided.all, hasLength(1));
    });

    test('70-year rule applies when designer_death_year is present', () {
      expect(
        _of([
          _win('old', patch: {'designer_death_year': 1907}),
        ], thisYear: 2026).all,
        hasLength(1),
      );
      final fresh = _of([
        _win('new', patch: {'designer_death_year': 1985}),
      ], thisYear: 2026);
      expect(fresh.all, isEmpty);
      expect(fresh.issues.single.message, contains('70'));
      // 경계: 정확히 70년째면 통과.
      expect(
        _of([
          _win('edge', patch: {'designer_death_year': 1956}),
        ], thisYear: 2026).all,
        hasLength(1),
      );
    });

    test('duplicate ids and unbundled files are errors', () {
      expect(_of([_win('dup'), _win('dup')]).all, hasLength(1));
      final unb = _win('unb');
      (unb['files'] as Map)['1k'] = {
        'path': 'x.webp',
        'px': [1, 1],
        'bundled': false,
      };
      expect(_of([unb]).all, isEmpty);
    });

    test('CC BY without credit_required is an error', () {
      final w = _win(
        'cb',
        patch: {
          'source': {
            ...(_win('cb')['source'] as Map<String, Object?>),
            'credit_required': false,
          },
        },
      );
      expect(_of([w]).all, isEmpty);
    });

    test('hidden windows are not visible and not picked for today', () {
      final c = _of([
        _win('a1'),
        _win('b2', patch: {'hidden': true}),
      ]);
      expect(c.all, hasLength(2));
      expect(c.visible.map((w) => w.id), ['a1']);
      for (var i = 0; i < 10; i++) {
        expect(c.windowOfTheDay(DateTime(2026, 11, 1 + i))!.id, 'a1');
      }
      expect(
        _of([
          _win('h', patch: {'hidden': true}),
        ]).windowOfTheDay(DateTime(2026)),
        isNull,
      );
    });
  });

  group('helpers', () {
    test('years and eras from date text', () {
      expect(glassYearOf('c. 1235년 · 작가 미상'), 1235);
      expect(glassYearOf('1657–1666년 · 베르니니'), 1657);
      expect(glassYearOf('15세기 · 작가 미상'), 1450);
      expect(glassYearOf('11세기 말~12세기 전반 · 작가 미상'), 1085);
      expect(glassYearOf('석조 13세기, 유리 c. 1515년 · 작가 미상'), 1515);
      expect(glassYearOf('석조 15세기(수직 양식), 유리 19세기 · 미상'), 1850);
      expect(glassYearOf('성모자 부분 c. 1180년, 둘레 천사 c. 1225년 · 작가 미상'), 1180);
      expect(glassYearOf('건물 5세기(c. 425–450) · 판'), 450);
      expect(glassYearOf('미상'), isNull);
      expect(GlassEra.ofYear(1235), GlassEra.c13);
      expect(GlassEra.ofYear(1200), GlassEra.upTo12);
      expect(GlassEra.ofYear(1515), GlassEra.c16to18);
      expect(GlassEra.ofYear(1900), GlassEra.c20);
    });

    test('colors from notes', () {
      expect(glassColorsOf('깊은 파랑 바탕, 빨강·녹색·흰색.'), {
        GlassColorTag.blue,
        GlassColorTag.red,
        GlassColorTag.green,
      });
      expect(glassColorsOf('호박색·금색·갈색의 방사형 분할'), {GlassColorTag.gold});
      expect(
        glassColorsOf('회백색 그리자유, 빨강·노랑 테두리.'),
        contains(GlassColorTag.clear),
      );
      expect(glassColorsOf('보라·파랑'), {
        GlassColorTag.purple,
        GlassColorTag.blue,
      });
    });

    test('sites, heritage and forms', () {
      expect(glassSiteOf('샤르트르 대성당 북쪽 익랑 · 샤르트르 · 프랑스'), '샤르트르');
      expect(glassSiteOf('생트샤펠 상부 경당 · 파리 · 프랑스'), '파리 생트샤펠');
      expect(glassSiteOf('노트르담 대성당 남쪽 익랑 · 파리 · 프랑스'), '파리 노트르담');
      expect(glassSiteOf('미국(소장처 verify)'), kSiteOther);
      expect(glassFormOf('x', 'lancet(반원 아치)'), GlassForm.lancet);
      expect(glassFormOf('alabaster_x', 'panel(단일 석판)'), GlassForm.alabaster);
      final c = _real();
      expect(c.byId('dove_stpeter')!.heritage, GlassHeritage.vatican);
      expect(c.byId('milan_apse_lower')!.heritage, GlassHeritage.italy);
      expect(c.byId('rose_chartres_north')!.heritage, GlassHeritage.none);
      expect(c.byId('dove_stpeter')!.authorText, contains('베르니니'));
      expect(c.byId('leoben_magi')!.shortPlace, '클리블랜드 미술관 소장');
      expect(c.byId('tiffany_hinds')!.shortPlace, '클리블랜드 미술관 소장');
      expect(c.byId('milan_apse_lower')!.authorText, '미상');
    });
  });
}
