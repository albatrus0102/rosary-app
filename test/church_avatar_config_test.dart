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
    test('JSON round trip includes the gender field g', () {
      const c = AvatarConfig(
        gender: 1,
        skin: 3,
        style: 2,
        hair: 9,
        outfit: 11,
        name: 70,
      );
      expect(c.toJson(), {
        'skin': 3,
        'style': 2,
        'hair': 9,
        'outfit': 11,
        'name': 70,
        'g': 1,
      });
      expect(AvatarConfig.fromJson(c.toJson()), c);
      expect(AvatarConfig.fromJsonString(c.toJsonString()), c);
      expect(AvatarConfig.fromJson(jsonDecode(c.toJsonString())), c);
      const f = AvatarConfig(gender: 0, name: 64);
      expect(AvatarConfig.fromJson(f.toJson()), f);
    });

    test('out-of-range and wrong-typed values are clamped per gender', () {
      final c = AvatarConfig.fromJson({
        'g': 1,
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
      // name is clamped into the list of the chosen gender.
      expect(
        AvatarConfig.fromJson({'g': 0, 'name': 500}).name,
        femaleBaptismalNames.length - 1,
      );
      expect(
        AvatarConfig.fromJson({'g': 1, 'name': 500}).name,
        maleBaptismalNames.length - 1,
      );
      // g outside 0/1 is treated as female (0) except 1, never throws.
      expect(AvatarConfig.fromJson({'g': 7, 'name': 3}).gender, 0);
      expect(AvatarConfig.fromJson({'g': 1.0, 'name': 3}).gender, 1);
      expect(AvatarConfig.fromJson(const {}), const AvatarConfig());
    });

    test('old saved data without g is migrated (gender, name, hair style)', () {
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
      for (var i = 0; i < legacyBaptismalNames.length; i++) {
        final c = AvatarConfig.fromJson({'name': i});
        expect(c.nameText, legacyBaptismalNames[i], reason: '$i');
        expect(c.gender, i < 20 ? avatarFemale : avatarMale);
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
      expect(a.copyWith(name: 1000).name, femaleBaptismalNames.length - 1);
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
      expect(AvatarConfig.nameCountFor(0), femaleBaptismalNames.length);
      expect(AvatarConfig.nameCountFor(1), maleBaptismalNames.length);
      expect(a.skinColor, AvatarConfig.skinColors[a.skin]);
    });

    test('withGender keeps the name when it exists in the other list', () {
      // 같은 이름이 두 목록에 없으므로 인기 1순위(0)로 바뀐다.
      const f = AvatarConfig(gender: 0, name: 3); // 데레사
      final m = f.withGender(1);
      expect(m.gender, 1);
      expect(m.name, 0);
      expect(m.nameText, '요셉');
      expect(m.withGender(1), m);
      // 이름이 양쪽에 있으면 유지한다.
      expect(convertBaptismalName(0, 0, 1), 0);
      expect(m.withGender(0).gender, 0);
      expect(m.withGender(0).nameText, '마리아');
      // 헬퍼: 같은 문자열이 새 목록에 있을 때
      expect(convertBaptismalName(1, 5, 1), 5);
    });

    test('randomStart is deterministic, valid and uses a popular name', () {
      for (var seed = 0; seed < 40; seed++) {
        final c = AvatarConfig.randomStart(Random(seed));
        expect(AvatarConfig.fromJson(c.toJson()), c);
        expect(c.name, lessThan(popularBaptismalCount));
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

  group('baptismal names', () {
    test(
      '60+ per gender, unique, popular order anchors, within server cap',
      () {
        for (final list in [femaleBaptismalNames, maleBaptismalNames]) {
          expect(list.length, greaterThanOrEqualTo(60));
          expect(list.length, lessThanOrEqualTo(baptismalNameMaxIndex + 1));
          expect(list.toSet(), hasLength(list.length));
          for (final n in list) {
            expect(n.trim(), n);
            expect(n.length, inInclusiveRange(2, 8), reason: n);
          }
        }
        expect(femaleBaptismalNames.take(6), [
          '마리아',
          '안나',
          '엘리사벳',
          '데레사',
          '아녜스',
          '루치아',
        ]);
        expect(maleBaptismalNames.take(6), [
          '요셉',
          '베드로',
          '바오로',
          '요한',
          '안드레아',
          '토마스',
        ]);
        expect(popularBaptismalCount, 12);
        expect(legacyBaptismalNames, hasLength(40));
        expect(baptismalNamesFor(0), same(femaleBaptismalNames));
        expect(baptismalNamesFor(1), same(maleBaptismalNames));
      },
    );

    test('search: prefix first, then contains, aliases, spaces ignored', () {
      final all = searchBaptismalNames(1, '');
      expect(all, hasLength(maleBaptismalNames.length));
      List<String> names(int g, String q) => [
        for (final i in searchBaptismalNames(g, q)) baptismalNamesFor(g)[i],
      ];
      final yo = names(1, '요');
      expect(yo.first, '요셉'); // 인기순(원래 순서) 유지
      expect(yo, containsAll(['요셉', '요한', '요아킴']));
      // 앞부분 일치가 포함 일치보다 먼저
      final ma = names(0, '마');
      expect(ma.first, '마리아');
      expect(ma, containsAll(['마르타', '마르가리타']));
      final mid = names(1, '레');
      expect(mid.take(2), ['레오', '레오나르도']); // 앞부분 일치
      expect(mid, containsAll(['안드레아', '그레고리오', '클레멘스']));
      expect(mid.indexOf('레오'), lessThan(mid.indexOf('안드레아')));
      // 별칭
      expect(names(0, '루시아'), ['루치아']);
      expect(names(0, '세실리아'), ['체칠리아']);
      expect(names(1, '바울'), ['바오로']);
      expect(names(1, '유다타대오'), ['유다 타대오']);
      expect(names(1, '  유다 '), ['유다 타대오']);
      expect(names(0, 'zzz'), isEmpty);
      // 성별 목록 밖의 이름은 나오지 않는다.
      expect(names(0, '요셉'), isEmpty);
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
      expect(femaleBaptismalNames, section('namesF'));
      expect(maleBaptismalNames, section('namesM'));
      expect(legacyBaptismalNames, section('namesLegacy'));
      expect(candleIntentions, section('intentions'));
    });

    test('name index cap matches the server validation', () {
      final ts = File('server/church/src/room_logic.ts').readAsStringSync();
      final cap = int.parse(
        RegExp(r'export const NAME_MAX = (\d+);').firstMatch(ts)!.group(1)!,
      );
      final legacy = int.parse(
        RegExp(r'export const LEGACY_NAME_MAX = (\d+);')
            .firstMatch(ts)!
            .group(1)!,
      );
      expect(cap, baptismalNameMaxIndex);
      expect(legacy, legacyBaptismalNames.length - 1);
      expect(femaleBaptismalNames.length - 1, lessThanOrEqualTo(cap));
      expect(maleBaptismalNames.length - 1, lessThanOrEqualTo(cap));
    });
  });
}
