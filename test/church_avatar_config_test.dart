import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'dart:ui' show Color;

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/church/avatar/avatar_config.dart';
import 'package:rosary_app/app/release_gate.dart';
import 'package:rosary_app/church/church_catalog.dart';
import 'package:rosary_app/church/church_select_screen.dart' show churchStyleById;
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
        'assisi',
        'myeongdong',
        'danggogae',
        'yeouido',
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
      expect(ChurchCatalog.byId['milan']!.scalePercent, 47);
      for (final c in ChurchCatalog.all) {
        expect(RegExp(r'^[a-z]+$').hasMatch(c.id), isTrue, reason: c.id);
        expect(c.wave, anyOf(1, 2));
        expect(ChurchCatalog.groups, contains(c.group), reason: c.id);
        expect(
          ['대성전', '대성당', '성당', '성지', '우리 본당'],
          contains(c.kind),
          reason: c.id,
        );
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
        'assisi',
        'myeongdong',
        'danggogae',
        'yeouido',
      ]);
      expect(ChurchCatalog.all.where((c) => c.wave == 2), hasLength(8));
      expect(ChurchCatalog.resolve('zzz').id, 'basic');
      expect(ChurchCatalog.resolve(null).id, 'basic');
      expect(ChurchCatalog.inGroup('한국').map((c) => c.id), [
        'myeongdong',
        'danggogae',
        'yeouido',
        'jeondong',
        'yakhyeon',
        'gyesan',
      ]);
    });

    test('여의도동성당: 사용자의 본당(T-79) — 성당·한국·1984, 사실·출처·모형 고지', () {
      final y = ChurchCatalog.byId['yeouido']!;
      expect(y.nameKo, '여의도동성당');
      expect(y.kind, '성당');
      expect(y.group, '한국');
      expect(y.builtYear, 1984);
      expect(y.scalePercent, 100);
      expect(y.wave, 1);
      expect(y.blurb, contains('파티마의 성모'));
      expect(y.people, isEmpty);
      expect(y.facts, hasLength(4));
      expect(y.facts.first, contains('1974년 9월 17일'));
      expect(y.modelNote, contains('실제 여의도동성당과 같지 않습니다'));
      expect(y.modelNote, contains('분위기만'));
      expect(y.modelNote, contains('작가의 작품은 싣지 않고'));
      expect(y.modelNote, contains('승인한 모형이 아닙니다'));
      // 2026-11-22: 로비·계단·성가대석을 지었다 → '로비는 짓지 않았다'가 없고, 성가대석·로비 작품의 대체를 밝힌다
      expect(y.modelNote, contains('성전 내부와 로비의 분위기만'));
      expect(y.modelNote, contains('성가대석의 계단식 좌석은 줄 수를 줄였'));
      expect(y.modelNote, contains('로비의 성화 액자와 색유리 벽도 그림을 옮기지 않고'));
      expect(y.modelNote, contains('성가대석 난간의 실제 자리'));
      expect(y.modelNote, isNot(contains('로비, 성모동산은 짓지 않았습니다')));
      expect(y.modelNote, isNot(contains('성가대석 안은 짓지 않았')));
      expect(y.source, contains('ycatholic.or.kr'));
      // 미사 시간·사제 성함은 싣지 않는다(바뀔 수 있고, 개인 정보)
      for (final t in [y.blurb, ...y.facts, y.modelNote]) {
        expect(t, isNot(contains('신부')));
        expect(t, isNot(contains('미사 시간')));
      }
    });

    test('아시시 성 프란치스코 대성당: 대성당·이탈리아·1253·60%, 세 층과 색 면 대체를 밝힌다', () {
      final a = ChurchCatalog.byId['assisi']!;
      expect(a.nameKo, '아시시 성 프란치스코 대성당');
      expect(a.kind, '대성당');
      expect(a.group, '이탈리아');
      expect(a.builtYear, 1253);
      expect(a.scalePercent, 60);
      expect(a.wave, 1);
      expect(a.facts, hasLength(4));
      expect(a.modelNote, contains('실제 아시시 성 프란치스코 대성당과 같지 않습니다'));
      expect(a.modelNote, contains('상부 성당·하부 성당·지하 묘소'));
      // 벽화·유리는 색 면·그림 없는 색 조각으로 대신하고, 평면은 줄이거나 옮겼다는 것을 정확히 밝힌다
      expect(a.modelNote, contains('전기 28장면을 비롯한 벽화와 궁륭 그림은 옮기지 않고'));
      expect(a.modelNote, contains('그림 없는 색 면으로 대신했습니다'));
      expect(a.modelNote, contains('스테인드글라스는 실제 창의 그림을 옮기지 않고'));
      expect(a.modelNote, contains('평면은 단순하게 줄이거나 옮겼습니다'));
      expect(a.modelNote, contains('승인한 모형이 아닙니다'));
      expect(a.source, contains('basilica.sanfrancesco.org'));
      expect(churchStyleById['assisi'], '고딕');
      expect(ReleaseGate.pendingConsentChurchIds, contains('assisi'));
    });

    test('3D 내부가 있는 성당은 모두 실제와 다른 점을 밝힌다(같지 않습니다 … 승인한 모형이 아닙니다)', () {
      // 웹 빌더(assets/church/ch_<id>.js)가 있는 성당 = 3D 내부가 있는 성당
      final built = [
        for (final c in ChurchCatalog.all)
          if (File('assets/church/ch_${c.id}.js').existsSync()) c,
      ];
      expect(built.map((c) => c.id).toSet(), {
        'basic',
        'stpeter',
        'lateran',
        'maggiore',
        'stpaul',
        'milan',
        'florence',
        'assisi',
        'myeongdong',
        'danggogae',
        'yeouido',
      });
      for (final c in built) {
        final lines = c.modelNote.split('\n');
        // 첫 문장: 실제와 같지 않다
        expect(
          RegExp(r'^이 3D 성당은 실제[^.]*같지 않습니다\. ').hasMatch(lines.first),
          isTrue,
          reason: c.id,
        );
        if (c.id != 'basic') {
          expect(
            lines.first,
            anyOf(contains('실제 ${c.nameKo}과 '), contains('실제 ${c.nameKo}와 ')),
            reason: c.id,
          );
          expect(lines.first, endsWith('다음이 실제와 다릅니다.'), reason: c.id);
        }
        // 끝 문장: 교회 측이 만들거나 승인한 것이 아니다
        expect(lines.last, endsWith('만들거나 승인한 모형이 아닙니다.'), reason: c.id);
        expect(lines.last, isNot(startsWith('·')), reason: c.id);
        // 가운데는 항목(가운뎃점)만, 4~8개
        final bullets = lines.sublist(1, lines.length - 1);
        expect(bullets.length, inInclusiveRange(4, 8), reason: c.id);
        for (final b in bullets) {
          expect(b, startsWith('· '), reason: c.id);
          expect(b, endsWith('.'), reason: c.id);
        }
        expect(c.modelNote, contains('십자가의 길 14처'), reason: c.id);
        expect(c.modelNote, contains('전례 시기'), reason: c.id);
        // 줄인 성당은 비율을 밝히고, 그 값은 웹 빌더의 축척과 같다
        final js = File('assets/church/ch_${c.id}.js').readAsStringSync();
        final m = RegExp(r"id: '" + c.id + r"', scalePercent: (\d+)")
            .firstMatch(js);
        if (m != null) {
          expect(c.scalePercent, int.parse(m.group(1)!), reason: c.id);
        }
        if (c.scalePercent != 100) {
          expect(
            c.modelNote,
            contains('실제의 약 ${c.scalePercent}% 크기로 줄였'),
            reason: c.id,
          );
        }
      }
      // 3D 내부가 없는 성당에는 고지를 지어내지 않는다
      for (final c in ChurchCatalog.all) {
        if (!built.contains(c)) expect(c.modelNote, isEmpty, reason: c.id);
      }
    });

    test('동의 요청 편지는 앱의 고지 글(modelNote)을 한 글자도 다르지 않게 인용한다', () {
      const letters = {
        'danggogae':
            'docs/legal/church_permission/02_Danggogae_consent_request.md',
        'yeouido': 'docs/legal/church_permission/05_Yeouido_consent_request.md',
      };
      letters.forEach((id, path) {
        final text = File(path).readAsStringSync();
        for (final line in ChurchCatalog.byId[id]!.modelNote.split('\n')) {
          expect(text, contains('> $line'), reason: '$id: $line');
        }
        expect(text, contains('실제와 다른 곳을 알려 주시면 고치겠습니다. 싣기를 원치 않으시면 싣지 않겠습니다.'));
        expect(text, contains("'현대식 본당'"));
        expect(text, contains('실제 성당과 다른 가상 재현입니다'));
        // 개인 정보는 저장소에 넣지 않는다(자리 표시만)
        expect(text, contains('〔성명〕'));
        expect(RegExp(r'[\w.]+@gmail\.com|010-\d{4}-\d{4}').hasMatch(text), isFalse);
      });
    });

    test('당고개 순교성지: 종류 성지, 순교자 10위(주교회의 표기·차례)와 근거·고지', () {
      final d = ChurchCatalog.byId['danggogae']!;
      expect(d.nameKo, '당고개 순교성지');
      expect(d.kind, '성지');
      expect(d.group, '한국');
      expect(d.builtYear, 2011);
      expect(d.scalePercent, 100);
      expect(d.wave, 1);
      expect(d.people.map((p) => p.name), [
        '성 박종원 아우구스티노',
        '성 홍병주 베드로',
        '성녀 손소벽 막달레나',
        '성녀 이경이 아가타',
        '성녀 이인덕 마리아',
        '성녀 권진이 아가타',
        '성 홍영주 바오로',
        '성 이문우 요한',
        '성녀 최영이 바르바라',
        '복자 이성례 마리아',
      ]);
      // 1월 31일 7위, 2월 1일 3위(양력)
      expect(
        d.people.where((p) => p.detail == '1840년 1월 31일 순교'),
        hasLength(7),
      );
      expect(d.people.where((p) => p.detail == '1840년 2월 1일 순교'), hasLength(3));
      expect(d.people.where((p) => p.name.startsWith('복자')), hasLength(1));
      expect(d.peopleNote, contains('한국천주교주교회의'));
      expect(d.peopleNote, contains('가톨릭굿뉴스'));
      expect(d.facts, hasLength(4));
      // 추정으로 지은 부분과 싣지 않은 작품을 밝힌다. 미확인 정보(작가 세례명)는 쓰지 않는다.
      expect(d.modelNote, contains('실제 당고개 순교성지와 같지 않습니다'));
      expect(d.modelNote, contains('실제로 재지 않고 추정한 값'));
      expect(d.modelNote, contains('분위기만 재현한 것'));
      expect(d.modelNote, contains('작가의 작품은 싣지 않았습니다'));
      expect(d.modelNote, contains('성지가 만들거나 승인한 모형이 아닙니다'));
      expect(d.source, contains('danggogae.org'));
      final all = [
        d.blurb,
        d.peopleNote,
        ...d.facts,
        d.modelNote,
        d.source,
      ].join(' ');
      expect(all, isNot(contains('카타리나')));
      expect(all, isNot(contains('심순화')));
      // 다른 성당은 그대로(목록 없음)
      expect(ChurchCatalog.byId['myeongdong']!.people, isEmpty);
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
