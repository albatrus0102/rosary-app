import 'dart:convert';
import 'dart:io';

import 'dart:ui' show Color;

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/church/avatar/avatar_config.dart';
import 'package:rosary_app/church/church_catalog.dart';
import 'package:rosary_app/church/church_constants.dart';

void main() {
  group('AvatarConfig', () {
    test('JSON round trip', () {
      const c = AvatarConfig(skin: 3, style: 2, hair: 9, outfit: 11, name: 39);
      expect(c.toJson(), {
        'skin': 3,
        'style': 2,
        'hair': 9,
        'outfit': 11,
        'name': 39,
      });
      expect(AvatarConfig.fromJson(c.toJson()), c);
      expect(AvatarConfig.fromJsonString(c.toJsonString()), c);
      expect(AvatarConfig.fromJson(jsonDecode(c.toJsonString())), c);
    });

    test('out-of-range and wrong-typed values are clamped', () {
      final c = AvatarConfig.fromJson({
        'skin': 99,
        'style': -5,
        'hair': 10,
        'outfit': 12.7,
        'name': 'x',
      });
      expect(c.skin, 3);
      expect(c.style, 0);
      expect(c.hair, 9);
      expect(c.outfit, 11);
      expect(c.name, 0);
      expect(AvatarConfig.fromJson(const {}), const AvatarConfig());
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
      expect(a.copyWith(name: 100).name, 39);
      expect(AvatarConfig.skinColors, hasLength(4));
      expect(AvatarConfig.styleNames, hasLength(4));
      expect(AvatarConfig.hairColors, hasLength(10));
      expect(AvatarConfig.outfitColors, hasLength(12));
      expect(AvatarConfig.hairNames, hasLength(AvatarConfig.hairColors.length));
      expect(
        AvatarConfig.outfitNames,
        hasLength(AvatarConfig.outfitColors.length),
      );
      expect(AvatarConfig.nameCount, baptismalNames.length);
      expect(a.skinColor, AvatarConfig.skinColors[a.skin]);
    });
  });

  group('church_constants', () {
    test('40 baptismal names, 8 intentions, fixed order anchors', () {
      expect(baptismalNames, hasLength(40));
      expect(baptismalNames.first, '마리아');
      expect(baptismalNames[19], '에밀리아');
      expect(baptismalNames[20], '베드로');
      expect(baptismalNames.last, '베네딕토');
      expect(baptismalNames.toSet(), hasLength(40));
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
      expect(AvatarConfig.styleNames, section('styles'));
      expect(baptismalNames, section('names'));
      expect(candleIntentions, section('intentions'));
    });
  });
}
