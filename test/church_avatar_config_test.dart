import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'dart:ui' show Color;

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/church/avatar/avatar_config.dart';
import 'package:rosary_app/church/church_catalog.dart';
import 'package:rosary_app/church/church_constants.dart';

void main() {
  group('AvatarConfig', () {
    test('JSON round trip includes the gender g and the name version nv', () {
      const c = AvatarConfig(
        gender: 1,
        skin: 3,
        style: 2,
        hair: 9,
        outfit: 11,
        name: 3700,
      );
      expect(c.toJson(), {
        'skin': 3,
        'style': 2,
        'hair': 9,
        'outfit': 11,
        'name': 3700,
        'g': 1,
        'nv': 2,
      });
      expect(avatarNameVersion, 2);
      expect(AvatarConfig.fromJson(c.toJson()), c);
      expect(AvatarConfig.fromJsonString(c.toJsonString()), c);
      expect(AvatarConfig.fromJson(jsonDecode(c.toJsonString())), c);
      final last = AvatarConfig(gender: 0, name: baptismalNames.length - 1);
      expect(AvatarConfig.fromJson(last.toJson()), last);
      // 모든 인덱스가 그대로 돌아온다(성별과 무관).
      for (var i = 0; i < baptismalNames.length; i += 97) {
        for (final g in [0, 1]) {
          final a = AvatarConfig(gender: g, name: i);
          expect(AvatarConfig.fromJson(a.toJson()), a);
          expect(a.nameText, baptismalNames[i]);
        }
      }
    });

    test('out-of-range and wrong-typed values fall back safely', () {
      final c = AvatarConfig.fromJson({
        'g': 1,
        'nv': 2,
        'skin': 99,
        'style': -5,
        'hair': 10,
        'outfit': 12.7,
        'name': 'x',
      });
      expect(c.gender, 1);
      expect(c.skin, 3);
      expect(c.style, 0);
      expect(c.hair, 9);
      expect(c.outfit, 11);
      expect(c.name, 0);
      // 범위를 벗어난 이름은 기본 이름(마리아)이 된다: 새 형식·옛 형식 모두.
      for (final json in [
        {'g': 0, 'nv': 2, 'name': baptismalNames.length},
        {'g': 1, 'nv': 2, 'name': 4095},
        {'g': 1, 'nv': 2, 'name': 100000},
        {'g': 0, 'nv': 2, 'name': -1},
        {'nv': 2, 'name': 99999},
        {'g': 0, 'name': 65}, // 옛 여성 목록 밖
        {'g': 1, 'name': 71}, // 옛 남성 목록 밖
        {'g': 1, 'name': -3},
        {'g': 1, 'name': 500},
      ]) {
        final a = AvatarConfig.fromJson(json);
        expect(a.name, defaultBaptismalNameIndex, reason: '$json');
        expect(a.nameText, '마리아', reason: '$json');
      }
      // 알 수 없는 nv 는 옛 형식으로 읽는다(절대 예외를 던지지 않는다).
      expect(
        AvatarConfig.fromJson({'g': 1, 'nv': 3, 'name': 1}).nameText,
        '베드로',
      );
      expect(
        AvatarConfig.fromJson({'g': 1, 'nv': 'x', 'name': 1}).nameText,
        '베드로',
      );
      // g outside 0/1 is treated as female (0) except 1, never throws.
      expect(AvatarConfig.fromJson({'g': 7, 'nv': 2, 'name': 3}).gender, 0);
      expect(AvatarConfig.fromJson({'g': 1.0, 'nv': 2, 'name': 3}).gender, 1);
      // nv 만 있고 g 가 없으면 여성 외형 + 통합 인덱스.
      final noG = AvatarConfig.fromJson({'nv': 2, 'name': 12, 'style': 3});
      expect([noG.gender, noG.name, noG.style], [0, 12, 3]);
      expect(AvatarConfig.fromJson(const {}).nameText, '마리아');
      expect(AvatarConfig.fromJson(const {}).gender, 0);
    });

    test('migration: old per-gender indices (g, no nv) keep the same name', () {
      final known = jsonDecode(
        File('tools/names/known_names.json').readAsStringSync(),
      ) as Map<String, dynamic>;
      final female = (known['female'] as List).cast<String>();
      final male = (known['male'] as List).cast<String>();
      expect(female, hasLength(65));
      expect(male, hasLength(71));
      for (var i = 0; i < female.length; i++) {
        final c = AvatarConfig.fromJson({
          'g': 0,
          'skin': 2,
          'style': 1,
          'hair': 4,
          'outfit': 6,
          'name': i,
        });
        expect(c.nameText, female[i], reason: 'female $i');
        expect([c.gender, c.skin, c.style, c.hair, c.outfit], [0, 2, 1, 4, 6]);
        // 옮긴 값을 저장했다 다시 읽으면 그대로다(두 번 옮기지 않는다).
        expect(AvatarConfig.fromJsonString(c.toJsonString()), c);
      }
      for (var i = 0; i < male.length; i++) {
        final c = AvatarConfig.fromJson({'g': 1, 'style': 3, 'name': i});
        expect(c.nameText, male[i], reason: 'male $i');
        expect([c.gender, c.style], [1, 3]);
        expect(AvatarConfig.fromJsonString(c.toJsonString()), c);
      }
      // 실제로 저장돼 있던 문자열 모양 그대로.
      final saved = AvatarConfig.fromJsonString(
        '{"skin":1,"style":2,"hair":3,"outfit":5,"name":9,"g":0}',
      );
      expect(saved.nameText, '체칠리아');
      expect(saved.gender, 0);
      expect(
        AvatarConfig.fromJsonString(
          '{"skin":1,"style":2,"hair":3,"outfit":5,"name":70,"g":1}',
        ).nameText,
        '파트리치오',
      );
      // 새 TSV 에 없던 옛 이름(끝에 덧붙인 이름)도 그대로 읽힌다.
      expect(AvatarConfig.fromJson({'g': 0, 'name': 8}).nameText, '카타리나');
      expect(AvatarConfig.fromJson({'g': 1, 'name': 33}).nameText, '비오');
    });

    test('isCurrentFormat tells saved strings that still need migration', () {
      expect(AvatarConfig.isCurrentFormat(null), isTrue);
      expect(AvatarConfig.isCurrentFormat(''), isTrue);
      expect(
        AvatarConfig.isCurrentFormat(AvatarConfig.defaultConfig.toJsonString()),
        isTrue,
      );
      expect(AvatarConfig.isCurrentFormat('{"name":3,"g":1}'), isFalse);
      expect(AvatarConfig.isCurrentFormat('{"name":3}'), isFalse);
      expect(AvatarConfig.isCurrentFormat('{"name":3,"nv":1}'), isFalse);
      expect(AvatarConfig.isCurrentFormat('{{'), isFalse);
    });

    test('old saved data without g is migrated (gender, name, hair style)', () {
      final legacy =
          ((jsonDecode(File('tools/names/known_names.json').readAsStringSync())
                      as Map<String, dynamic>)['legacy']
                  as List)
              .cast<String>();
      expect(legacy, hasLength(40));
      // 옛 목록: 22 = 요한(남성), 옛 style 3(곱슬) → 남성 웨이브(2)
      final m = AvatarConfig.fromJson({
        'skin': 2,
        'style': 3,
        'hair': 4,
        'outfit': 6,
        'name': 22,
      });
      expect(m.gender, avatarMale);
      expect(m.nameText, '요한');
      expect(m.style, 2);
      expect([m.skin, m.hair, m.outfit], [2, 4, 6]);
      // 4 = 데레사(여성), 옛 style 2(올림머리) → 여성 낮은 쪽머리(3)
      final f = AvatarConfig.fromJson({'style': 2, 'name': 4});
      expect(f.gender, avatarFemale);
      expect(f.nameText, '데레사');
      expect(f.style, 3);
      // 모든 옛 이름은 새 목록에서 같은 이름으로 읽힌다.
      for (var i = 0; i < legacy.length; i++) {
        final c = AvatarConfig.fromJson({'name': i});
        expect(c.nameText, legacy[i], reason: '$i');
        expect(c.gender, i < 20 ? avatarFemale : avatarMale);
        expect(AvatarConfig.fromJsonString(c.toJsonString()), c);
      }
      // 저장된 JSON 문자열(옛 형식)도 읽는다.
      final s = AvatarConfig.fromJsonString(
        '{"skin":3,"style":3,"hair":9,"outfit":11,"name":39}',
      );
      expect(s.gender, avatarMale);
      expect(s.nameText, '베네딕토');
    });

    test('invalid JSON string gives the default', () {
      expect(AvatarConfig.fromJsonString(null), AvatarConfig.defaultConfig);
      expect(AvatarConfig.fromJsonString(''), AvatarConfig.defaultConfig);
      expect(AvatarConfig.fromJsonString('{{'), AvatarConfig.defaultConfig);
      expect(AvatarConfig.fromJsonString('[1]'), AvatarConfig.defaultConfig);
    });

    test('copyWith, equality, hashCode and palette sizes', () {
      const a = AvatarConfig.defaultConfig;
      final b = a.copyWith(hair: 4);
      expect(b.hair, 4);
      expect(b.skin, a.skin);
      expect(b == a, isFalse);
      expect(a.copyWith(), a);
      expect(a.copyWith().hashCode, a.hashCode);
      expect(a.copyWith(gender: 1) == a, isFalse);
      expect(a.copyWith(name: 1000).name, 1000);
      expect(a.copyWith(name: 100000).name, defaultBaptismalNameIndex);
      expect(AvatarConfig.skinColors, hasLength(4));
      expect(AvatarConfig.styleCount, 4);
      expect(AvatarConfig.femaleStyleNames, hasLength(4));
      expect(AvatarConfig.maleStyleNames, hasLength(4));
      expect(AvatarConfig.hairColors, hasLength(10));
      expect(AvatarConfig.outfitColors, hasLength(12));
      expect(AvatarConfig.hairNames, hasLength(AvatarConfig.hairColors.length));
      expect(
        AvatarConfig.outfitNames,
        hasLength(AvatarConfig.outfitColors.length),
      );
      expect(a.nameText, '마리아');
      for (final g in [0, 1]) {
        final pool = commonBaptismalIndicesFor(g);
        for (var seed = 0; seed < 30; seed++) {
          expect(
            pool,
            contains(AvatarConfig.randomCommonName(g, Random(seed))),
          );
        }
      }
      expect(a.skinColor, AvatarConfig.skinColors[a.skin]);
    });

    test('withGender keeps the name (the name list is not per gender)', () {
      final f = AvatarConfig(gender: 0, name: baptismalIndexOf('데레사'));
      final m = f.withGender(1);
      expect(m.gender, 1);
      expect(m.name, f.name);
      expect(m.nameText, '데레사');
      expect(m.withGender(1), same(m));
      expect(m.withGender(0), f);
      // 아주 긴 이름도 그대로.
      final long = AvatarConfig(
        gender: 1,
        name: baptismalIndexOf('히야친토 조르다노 안살로네'),
      );
      expect(long.withGender(0).nameText, '히야친토 조르다노 안살로네');
    });

    test('randomStart is deterministic, valid and uses a popular name', () {
      for (var seed = 0; seed < 40; seed++) {
        final c = AvatarConfig.randomStart(Random(seed));
        expect(AvatarConfig.fromJson(c.toJson()), c);
        expect(
          popularBaptismalIndices(c.gender, popularBaptismalCount),
          contains(c.name),
        );
        expect(c.hair, lessThan(4));
      }
      expect(
        AvatarConfig.randomStart(Random(3)),
        AvatarConfig.randomStart(Random(3)),
      );
      final genders = {
        for (var seed = 0; seed < 40; seed++)
          AvatarConfig.randomStart(Random(seed)).gender,
      };
      expect(genders, {0, 1});
    });
  });

  group('church_constants', () {
    test('8 intentions', () {
      expect(candleIntentions, hasLength(8));
      expect(candleIntentions[0], '가족과 이웃을 위해');
      expect(candleIntentions[7], '나라와 교회를 위해');
    });

    test('seat ids and parsing', () {
      expect(seatId('L', 3, 2), 'L03-2');
      expect(seatId('R', 11, 5), 'R11-5');
      final s = parseSeat('L03-2')!;
      expect(s.side, 'L');
      expect(s.row, 3);
      expect(s.idx, 2);
      expect(s.x, -5.2);
      expect(s.z, closeTo(-10 + 1.9 * 3 + 0.35, 1e-9));
      expect(parseSeat('R00-0')!.x, 3.2);
      expect(parseSeat('R00-5')!.x, 8.2);
      expect(parseSeat('L12-0'), isNull);
      expect(parseSeat('L03-6'), isNull);
      expect(parseSeat('X03-2'), isNull);
      expect(parseSeat('L3-2'), isNull);
      // All 144 round trip.
      var count = 0;
      for (final side in ['L', 'R']) {
        for (var r = 0; r < 12; r++) {
          for (var i = 0; i < 6; i++) {
            expect(parseSeat(seatId(side, r, i))!.id, seatId(side, r, i));
            count++;
          }
        }
      }
      expect(count, 144);
    });

    test('room names', () {
      expect(ChurchConfig.roomName('stpeter', 1), 'stpeter-1');
      expect(ChurchConfig.parseRoomName('stpeter-12')!.churchId, 'stpeter');
      expect(ChurchConfig.parseRoomName('stpeter-12')!.n, 12);
      expect(ChurchConfig.parseRoomName('basic-0'), isNull);
      expect(ChurchConfig.parseRoomName('basic-51'), isNull);
      expect(ChurchConfig.parseRoomName('basic'), isNull);
      expect(ChurchConfig.parseRoomName('Basic-1'), isNull);
      expect(ChurchConfig.serverUrl, '');
    });
  });

  group('ChurchCatalog', () {
    test('contains every SPEC id in order with consistent fields', () {
      expect(ChurchCatalog.all.map((c) => c.id).toList(), [
        'basic',
        'stpeter',
        'lateran',
        'maggiore',
        'stpaul',
        'milan',
        'florence',
        'myeongdong',
        'stmark',
        'jeondong',
        'yakhyeon',
        'gyesan',
        'fatima',
        'lourdes',
        'sagrada',
        'notredame',
      ]);
      expect(ChurchCatalog.byId['stpeter']!.nameKo, '성 베드로 대성전');
      expect(ChurchCatalog.byId['basic']!.scalePercent, 100);
      expect(ChurchCatalog.byId['basic']!.kind, '우리 본당');
      expect(ChurchCatalog.byId['milan']!.scalePercent, 40);
      for (final c in ChurchCatalog.all) {
        expect(RegExp(r'^[a-z]+$').hasMatch(c.id), isTrue, reason: c.id);
        expect(c.wave, anyOf(1, 2));
        expect(ChurchCatalog.groups, contains(c.group), reason: c.id);
        expect(['대성전', '대성당', '성당', '우리 본당'], contains(c.kind), reason: c.id);
        expect(c.nameKo, isNotEmpty);
        expect(c.place, isNotEmpty);
      }
      expect(ChurchCatalog.all.where((c) => c.wave == 1).map((c) => c.id), [
        'basic',
        'stpeter',
        'lateran',
        'maggiore',
        'stpaul',
        'milan',
        'florence',
        'myeongdong',
      ]);
      expect(ChurchCatalog.all.where((c) => c.wave == 2), hasLength(8));
      expect(ChurchCatalog.resolve('zzz').id, 'basic');
      expect(ChurchCatalog.resolve(null).id, 'basic');
      expect(ChurchCatalog.inGroup('한국').map((c) => c.id), [
        'myeongdong',
        'jeondong',
        'yakhyeon',
        'gyesan',
      ]);
    });
  });

  group('palette parity with assets/church/palette.js', () {
    final js = File('assets/church/palette.js').readAsStringSync();

    List<String> section(String key) {
      final m = RegExp('$key:\\s*\\[(.*?)\\]', dotAll: true).firstMatch(js)!;
      return RegExp(r"'([^']*)'")
          .allMatches(m.group(1)!)
          .map((e) => e.group(1)!)
          .toList();
    }

    String hex(Color c) =>
        '#${(c.toARGB32() & 0xFFFFFF).toRadixString(16).padLeft(6, '0').toUpperCase()}';

    test('colors', () {
      expect(AvatarConfig.skinColors.map(hex), section('skin'));
      expect(AvatarConfig.hairColors.map(hex), section('hair'));
      expect(AvatarConfig.outfitColors.map(hex), section('outfit'));
      expect(AvatarConfig.pantsColors.map(hex), section('pants'));
    });

    test('style names, baptismal names and intentions', () {
      expect(AvatarConfig.femaleStyleNames, section('stylesF'));
      expect(AvatarConfig.maleStyleNames, section('stylesM'));
      // 세례명은 palette.js 가 아니라 생성물 baptismal_names.js 에 있다
      // (test/church_baptismal_names_test.dart 가 맞춰 본다).
      expect(js, isNot(contains('namesF')));
      expect(candleIntentions, section('intentions'));
    });

    test('name index cap matches the server validation', () {
      final ts = File('server/church/src/room_logic.ts').readAsStringSync();
      final cap = int.parse(
        RegExp(r'export const NAME_MAX = (\d+);').firstMatch(ts)!.group(1)!,
      );
      expect(cap, baptismalNameMaxIndex);
      expect(cap, 4095);
      expect(baptismalNames.length - 1, lessThanOrEqualTo(cap));
      final nv = int.parse(
        RegExp(r'export const NAME_VERSION = (\d+);').firstMatch(ts)!.group(1)!,
      );
      expect(nv, avatarNameVersion);
      expect(ts, isNot(contains('LEGACY_NAME_MAX')));
    });
  });
}
