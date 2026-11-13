import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/church/baptismal_names_data.dart';
import 'package:rosary_app/church/church_constants.dart';

/// 통합 세례명 목록(생성물)과 원본(TSV·옛 목록)·웹 쪽 목록이 서로 맞는지 확인한다.
void main() {
  // 원본을 생성기와 따로(독립적으로) 다시 읽는다: 헤더 제외, 1열만, 공백 정리, 중복은 첫 항목.
  List<String> parseTsv(String text) {
    final out = <String>[];
    final seen = <String>{};
    final lines = text.replaceFirst('﻿', '').split('\n');
    for (final line in lines.skip(1)) {
      final name = line
          .split('\t')
          .first
          .trim()
          .replaceAll(RegExp(r'\s+'), ' ');
      if (name.isEmpty || !seen.add(name)) continue;
      out.add(name);
    }
    return out;
  }

  final tsv = parseTsv(File('data/baptismal_names.tsv').readAsStringSync());
  final known =
      (jsonDecode(File('tools/names/known_names.json').readAsStringSync())
              as Map<String, dynamic>)
          .map((k, v) => MapEntry(k, (v as List).cast<String>()));

  group('unified baptismal name list', () {
    test('source TSV: 3,774 unique names after the header', () {
      expect(tsv, hasLength(3774));
      expect(tsv.first, '가누토 4세');
      expect(tsv, isNot(contains('세례명')));
      expect(tsv.toSet(), hasLength(tsv.length));
    });

    test('list = TSV order + old-only names appended; N within the cap', () {
      expect(baptismalNames.length, baptismalNameCount);
      expect(baptismalNames.length, 3788);
      expect(baptismalNames.length, lessThanOrEqualTo(baptismalNameMaxIndex + 1));
      expect(baptismalNames.take(tsv.length), tsv);
      final extra = baptismalNames.skip(tsv.length).toList();
      expect(extra, [
        '카타리나',
        '비비안나',
        '율리안나',
        '프란체스카',
        '베아트리체',
        '라우라',
        '데보라',
        '카롤리나',
        '펠리치타스',
        '게르트루다',
        '알로이시오',
        '비오',
        '카밀로',
        '아드리아노',
      ]);
      for (final n in extra) {
        expect(tsv, isNot(contains(n)));
        expect(
          [...known['female']!, ...known['male']!, ...known['legacy']!],
          contains(n),
        );
      }
    });

    test('names are clean: unique, trimmed, no feast dates, no odd characters', () {
      expect(baptismalNames.toSet(), hasLength(baptismalNames.length));
      final ok = RegExp(r'^[가-힣0-9 ()\[\]]+$');
      for (final n in baptismalNames) {
        expect(n.trim(), n);
        expect(n, isNot(contains('  ')));
        expect(ok.hasMatch(n), isTrue, reason: n);
        expect(RegExp(r'\d\d-\d\d').hasMatch(n), isFalse, reason: n);
      }
      // 축일 데이터는 앱에 넣지 않는다.
      final data = File('lib/church/baptismal_names_data.dart').readAsStringSync();
      expect(RegExp(r'\d\d-\d\d').hasMatch(data), isFalse);
      // 이상치 표본: 숫자·괄호·대괄호·아주 긴 이름이 그대로 들어 있다.
      for (final n in [
        '가누토 4세',
        '가롤로(성 안드레아의)',
        '펠릭스 3[2]세',
        '히야친토 조르다노 안살로네',
        '바울라 몬탈 포르네스(성 요셉 데 갈라산즈의)',
      ]) {
        expect(baptismalIndexOf(n), isNonNegative, reason: n);
        expect(baptismalNameOf(baptismalIndexOf(n)), n);
      }
    });

    test('every old name exists and maps to the same name', () {
      expect(known['female'], hasLength(65));
      expect(known['male'], hasLength(71));
      expect(known['legacy'], hasLength(40));
      expect(
        [for (final i in oldFemaleNameIndices) baptismalNames[i]],
        known['female'],
      );
      expect(
        [for (final i in oldMaleNameIndices) baptismalNames[i]],
        known['male'],
      );
      expect(
        [for (final i in legacyNameIndices) baptismalNames[i]],
        known['legacy'],
      );
      for (var i = 0; i < 65; i++) {
        expect(
          baptismalNames[migrateBaptismalName(i, gender: avatarFemale)],
          known['female']![i],
        );
      }
      for (var i = 0; i < 71; i++) {
        expect(
          baptismalNames[migrateBaptismalName(i, gender: avatarMale)],
          known['male']![i],
        );
      }
      for (var i = 0; i < 40; i++) {
        expect(baptismalNames[migrateBaptismalName(i)], known['legacy']![i]);
      }
      for (final bad in [-1, 40, 65, 71, 99, 4096]) {
        expect(migrateBaptismalName(bad), defaultBaptismalNameIndex);
      }
      expect(migrateBaptismalName(65, gender: 0), defaultBaptismalNameIndex);
      expect(migrateBaptismalName(71, gender: 1), defaultBaptismalNameIndex);
      expect(baptismalNames[defaultBaptismalNameIndex], '마리아');
    });

    test('popular names keep the old per-gender order, looked up by name', () {
      expect(popularBaptismalShown, 8);
      expect(popularBaptismalCount, 12);
      expect(
        [for (final i in popularBaptismalIndices(avatarFemale)) baptismalNames[i]],
        known['female']!.take(8),
      );
      expect(
        [for (final i in popularBaptismalIndices(avatarMale)) baptismalNames[i]],
        known['male']!.take(8),
      );
      expect(
        [
          for (final i in popularBaptismalIndices(avatarMale, 12))
            baptismalNames[i],
        ],
        known['male']!.take(12),
      );
      expect(commonBaptismalIndicesFor(avatarFemale), hasLength(65));
      expect(commonBaptismalIndicesFor(avatarMale), hasLength(71));
    });

    test('baptismalNameOf / baptismalIndexOf are safe at the edges', () {
      expect(baptismalNameOf(0), '가누토 4세');
      expect(baptismalNameOf(baptismalNames.length - 1), '아드리아노');
      expect(baptismalNameOf(-1), '마리아');
      expect(baptismalNameOf(baptismalNames.length), '마리아');
      expect(baptismalNameOf(4095), '마리아');
      expect(baptismalIndexOf('없는 이름'), -1);
      expect(() => baptismalNames.add('x'), throwsUnsupportedError);
    });

    test('alias keys all exist in the list', () {
      for (final k in baptismalNameAliases.keys) {
        expect(baptismalIndexOf(k), isNonNegative, reason: k);
      }
    });
  });

  group('search', () {
    List<String> names(String q) => [
      for (final i in searchBaptismalNames(q)) baptismalNames[i],
    ];

    test('empty query returns everything in 가나다 order', () {
      final all = names('');
      expect(all, hasLength(baptismalNames.length));
      expect(all, [...baptismalNames]..sort());
      expect(names('   '), hasLength(baptismalNames.length));
    });

    test('prefix first, then contains; spaces ignored; aliases', () {
      final ma = names('마리아');
      expect(ma.first, '마리아');
      expect(ma, contains('마리아 고레티'));
      final firstContains = ma.indexWhere((n) => !n.startsWith('마리아'));
      expect(firstContains, greaterThan(0));
      expect(ma.skip(firstContains).any((n) => n.startsWith('마리아')), isFalse);
      expect(ma.skip(firstContains), contains('가브리엘 마리아'));
      expect(names('유다타대오'), contains('유다 타대오'));
      expect(names('  유다 타대오 '), contains('유다 타대오'));
      expect(names('루시아'), contains('루치아'));
      expect(names('세실리아'), contains('체칠리아'));
      expect(names('바울').first, '바오로'); // 별칭이 앞부분에 맞음
      expect(names('zzz'), isEmpty);
      // 숫자·괄호가 든 이름
      expect(names('4세'), contains('가누토 4세'));
      expect(names('성안드레아'), contains('가롤로(성 안드레아의)'));
      expect(names('3[2]'), ['펠릭스 3[2]세']);
      expect(names('안살로네'), ['히야친토 조르다노 안살로네']);
    });

    test('consonant-only queries match by 초성', () {
      final r = names('ㅁㄹㅇ');
      expect(r, contains('마리아'));
      expect(r.first.startsWith('마'), isTrue);
      expect(baptismalChoseong(r.first).startsWith('ㅁㄹㅇ'), isTrue);
      expect(names('ㅎㅇㅊㅌ'), contains('히야친토 조르다노 안살로네'));
      expect(names('ㅅㅋㄹㅅㅌㅋ'), contains('스콜라스티카'));
      expect(names('ㅋㅋㅋㅋㅋㅋㅋ'), isEmpty);
      // 글자와 자음을 섞으면 초성 검색이 아니다(일치 없음).
      expect(names('마ㄹㅇ'), isEmpty);
    });

    test('searching the whole list is fast enough to run per keystroke', () {
      searchBaptismalNames('가'); // 색인 준비
      final sw = Stopwatch()..start();
      for (var i = 0; i < 50; i++) {
        searchBaptismalNames(const ['마', '요', 'ㅁㄹ', '리아', '아'][i % 5]);
      }
      sw.stop();
      expect(sw.elapsedMilliseconds / 50, lessThan(20));
    });
  });

  group('generated files', () {
    test('the web list (assets/church/baptismal_names.js) has the same names '
        'in the same order', () {
      final js = File('assets/church/baptismal_names.js').readAsStringSync();
      final body = RegExp(
        r"list: \[\n(.*?)\n    \]\.join\('\|'\)\.split\('\|'\)",
        dotAll: true,
      ).firstMatch(js)!.group(1)!;
      final list = RegExp(r"'([^']*)'")
          .allMatches(body)
          .expand((m) => m.group(1)!.split('|'))
          .toList();
      expect(list.length, baptismalNames.length);
      expect(list, baptismalNames);
      List<int> ints(String key) => RegExp('$key: \\[([0-9,]*)\\]')
          .firstMatch(js)!
          .group(1)!
          .split(',')
          .map(int.parse)
          .toList();
      expect(ints('oldF'), oldFemaleNameIndices);
      expect(ints('oldM'), oldMaleNameIndices);
      expect(ints('legacy'), legacyNameIndices);
      expect(
        int.parse(RegExp(r'def: (\d+),').firstMatch(js)!.group(1)!),
        defaultBaptismalNameIndex,
      );
      // 이름표에는 축일이 필요 없다.
      expect(RegExp(r'\d\d-\d\d').hasMatch(js), isFalse);
      // 성당 페이지가 이 파일을 avatar.js 보다 먼저 싣는다.
      for (final page in ['index.html', 'test.html']) {
        final html = File('assets/church/$page').readAsStringSync();
        final a = html.indexOf('<script src="baptismal_names.js">');
        expect(a, isNonNegative, reason: page);
        expect(a, lessThan(html.indexOf('<script src="avatar.js">')));
      }
    });

    test('generated files are up to date with the generator', () {
      final r = Process.runSync('python3', [
        'tools/names/build_names.py',
        '--check',
      ]);
      expect(r.exitCode, 0, reason: '${r.stdout}${r.stderr}');
    }, skip: _hasPython ? false : 'python3 없음');
  });
}

final bool _hasPython = () {
  try {
    return Process.runSync('python3', ['--version']).exitCode == 0;
  } catch (_) {
    return false;
  }
}();
