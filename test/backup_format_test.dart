import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/backup/backup_data.dart';
import 'package:rosary_app/backup/backup_format.dart';
import 'package:rosary_app/backup/backup_service.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'backup_test_support.dart';

/// 이 기기의 사용자 값 전체(백업 대상 설정 + 기록)를 비교 가능한 모양으로.
Map<String, Object?> snapshotOf(SharedPreferences p) => {
  for (final k in p.getKeys().toList()..sort())
    if (!k.startsWith('backup.')) k: p.get(k),
};

void main() {
  final t0 = DateTime(2026, 11, 1, 7, 30);
  final settingsValues = <String, Object>{
    'chime_ten': false,
    'tts_rate': 0.55,
    'prayer_text_scale': 1.4,
    'rosary3d_id': 'rose_gold',
    'church_favorites': ['basic', 'myeongdong'],
    'church_candle_color_v1': 3,
    'church_avatar': '{"v":2,"name":"마리아"}',
    'prayer_music': true,
    // 빠지는 것(토큰·기기 id·계정 장부)
    'rosary.auth.session': '{"access_token":"SECRET-TOKEN"}',
    'rosary.auth.pkce.code-verifier': 'SECRET-PKCE',
    'device_id_v1': 'dev-123',
    'church_client_id': 'client-456',
    'auth.consent.v1._device': '{"terms":{}}',
    'stats_owner_uid': 'uid-1',
    'synced_prayer_ids_v1': ['a', 'b'],
  };

  group('왕복(내보내기 → 가져오기)', () {
    test('다른 기기로 옮기면 설정·기록이 그대로 도착한다', () async {
      final src = await BackupRig.create(values: settingsValues, now: t0);
      await src.stats.add(rec(t0.subtract(const Duration(days: 2))));
      await src.stats.add(
        rec(t0.subtract(const Duration(days: 1)), set: MysterySet.sorrowful),
      );
      await src.stats.add(rec(t0, source: PrayerRecord.sourceChurch));
      final text = src.service.buildDocument().encode();

      final dst = await BackupRig.create(now: t0);
      final pick = dst.service.planFromText(text);
      expect(pick.error, isNull);
      final plan = pick.plan!;
      expect(plan.newRecords, hasLength(3));
      expect(await dst.service.applyPlan(plan), ImportOutcome.applied);

      expect(dst.stats.records.toSet(), src.stats.records.toSet());
      for (final k in [
        'chime_ten',
        'tts_rate',
        'prayer_text_scale',
        'rosary3d_id',
        'church_favorites',
        'church_candle_color_v1',
        'church_avatar',
        'prayer_music',
      ]) {
        expect(dst.prefs.get(k), src.prefs.get(k), reason: k);
      }
    });

    test('같은 파일을 다시 가져와도 아무것도 바뀌지 않는다(멱등)', () async {
      final rig = await BackupRig.create(values: settingsValues, now: t0);
      await rig.stats.add(rec(t0));
      final text = rig.service.buildDocument().encode();
      final before = snapshotOf(rig.prefs);
      final plan = rig.service.planFromText(text).plan!;
      expect(plan.changesNothing, isTrue);
      expect(plan.duplicateRecords, 1);
      await rig.service.applyPlan(plan);
      expect(snapshotOf(rig.prefs), before);
    });

    test('파일 머리: 형식·판·앱 판·만든 때·기기·요약', () async {
      final rig = await BackupRig.create(values: settingsValues, now: t0);
      await rig.stats.add(rec(t0));
      final j = jsonDecode(rig.service.buildDocument().encode()) as Map;
      expect(j['format'], 'rosarium-backup');
      expect(j['schemaVersion'], BackupFormat.schemaVersion);
      expect(j['minReaderSchema'], 1);
      expect(j['appVersion'], '0.1.0+1');
      expect(DateTime.parse(j['createdAt'] as String).isUtc, isTrue);
      expect((j['device'] as Map)['platform'], isNotNull);
      expect((j['summary'] as Map)['prayerRecords'], 1);
      expect((j['data'] as Map)['prefs'], isA<Map>());
    });
  });

  group('비밀·기기 값은 백업에 실리지 않는다(plainDB 원칙)', () {
    test('토큰·PKCE·기기 id·동의·계정 장부가 파일에 없다', () async {
      final rig = await BackupRig.create(values: settingsValues, now: t0);
      final text = rig.service.buildDocument().encode();
      for (final secret in [
        'SECRET-TOKEN',
        'SECRET-PKCE',
        'dev-123',
        'client-456',
        'uid-1',
        'rosary.auth',
        'auth.consent',
        'synced_prayer',
      ]) {
        expect(text.contains(secret), isFalse, reason: secret);
      }
    });

    test('등록부에 없는 새 키도 비밀처럼 보이면 싣지 않는다(안전망)', () async {
      final rig = await BackupRig.create(
        values: {
          'goal_daily_target': 2, // 새 기능(등록 전) — 일반 수집으로 실린다
          'sync_api_token': 'TOKEN-X',
          'new_session_cookie': 'COOKIE-Y',
        },
        now: t0,
      );
      final doc = rig.service.buildDocument();
      expect(doc.prefs.keys, contains('goal_daily_target'));
      expect(doc.prefs.keys, isNot(contains('sync_api_token')));
      expect(doc.prefs.keys, isNot(contains('new_session_cookie')));
    });

    test('파일에 비밀·뺀 키가 들어 있어도 이 기기에 쓰지 않는다', () async {
      final evil = jsonEncode({
        'format': 'rosarium-backup',
        'schemaVersion': 1,
        'data': {
          'prefs': {
            'rosary.auth.session': {'t': 'string', 'v': 'stolen'},
            'device_id_v1': {'t': 'string', 'v': 'clone'},
            'stats_owner_uid': {'t': 'string', 'v': 'other'},
            'backup.auto.enabled': {'t': 'bool', 'v': true},
            'chime_ten': {'t': 'bool', 'v': false},
          },
          'prayerRecords': [],
        },
      });
      final rig = await BackupRig.create(now: t0);
      final plan = rig.service.planFromText(evil).plan!;
      await rig.service.applyPlan(plan);
      expect(rig.prefs.get('rosary.auth.session'), isNull);
      expect(rig.prefs.get('device_id_v1'), isNull);
      expect(rig.prefs.get('stats_owner_uid'), isNull);
      expect(rig.prefs.get('backup.auto.enabled'), isNull);
      expect(rig.prefs.getBool('chime_ten'), isFalse);
      expect(plan.document.skippedPrefs, 4);
    });
  });

  group('옛 파일·일부만 담긴 파일', () {
    test('판이 없는 파일(판 0)도 읽고, 옛 기록(id·source 없음)도 받는다', () async {
      final old = jsonEncode({
        'format': 'rosarium-backup',
        'data': {
          'prayerRecords': [
            {
              'at': '2026-10-01T07:00:00.000',
              'set': 'glorious',
              'decades': 5,
              'hailMarys': 50,
              'completed': true,
            },
          ],
        },
      });
      final rig = await BackupRig.create(now: t0);
      final pick = rig.service.planFromText(old);
      expect(pick.error, isNull);
      expect(pick.plan!.newRecords, hasLength(1));
      expect(pick.plan!.changedPrefs, isEmpty);
      await rig.service.applyPlan(pick.plan!);
      expect(rig.stats.records.single.set, MysterySet.glorious);
      expect(rig.stats.records.single.source, PrayerRecord.sourceApp);
    });

    test('id 없는 옛 기록은 두 번 가져와도 한 번만 들어온다(내용 지문)', () async {
      final old = jsonEncode({
        'format': 'rosarium-backup',
        'schemaVersion': 1,
        'data': {
          'prayerRecords': [
            {'at': '2026-10-01T07:00:00.000', 'set': 'joyful', 'decades': 1},
          ],
        },
      });
      final rig = await BackupRig.create(now: t0);
      await rig.service.applyPlan(rig.service.planFromText(old).plan!);
      final again = rig.service.planFromText(old).plan!;
      expect(again.newRecords, isEmpty);
      expect(again.duplicateRecords, 1);
      expect(rig.stats.records, hasLength(1));
    });

    test('설정만 담긴 파일은 기록을 건드리지 않고, 파일에 없는 설정도 그대로 둔다', () async {
      final rig = await BackupRig.create(
        values: {'haptic': false, 'tts_rate': 0.4},
        now: t0,
      );
      await rig.stats.add(rec(t0));
      final partial = jsonEncode({
        'format': 'rosarium-backup',
        'schemaVersion': 1,
        'data': {
          'prefs': {'tts_rate': 0.6}, // 판 0처럼 맨 값도 받는다
        },
      });
      final plan = rig.service.planFromText(partial).plan!;
      await rig.service.applyPlan(plan);
      expect(rig.prefs.getDouble('tts_rate'), 0.6);
      expect(rig.prefs.getBool('haptic'), isFalse);
      expect(rig.stats.records, hasLength(1));
    });

    test('새 버전 앱의 파일: 모르는 구역·모르는 설정을 보관하고 다시 내보낸다', () async {
      final newer = jsonEncode({
        'format': 'rosarium-backup',
        'schemaVersion': 3,
        'minReaderSchema': 1,
        'data': {
          'prefs': {
            'goal_weekly': {'t': 'int', 'v': 7},
          },
          'prayerRecords': [],
          'goals': {
            'daily': 1,
            'history': [1, 2, 3],
          },
        },
      });
      final rig = await BackupRig.create(now: t0);
      final plan = rig.service.planFromText(newer).plan!;
      expect(plan.newerFile, isTrue);
      expect(plan.unknownPrefs, 1);
      await rig.service.applyPlan(plan);
      expect(rig.prefs.getInt('goal_weekly'), 7);
      final again = jsonDecode(
        rig.service.buildDocument().encode(),
      ) as Map<String, Object?>;
      expect((again['data'] as Map)['goals'], {
        'daily': 1,
        'history': [1, 2, 3],
      });
    });

    test('읽을 수 없는 판(minReaderSchema가 더 큼)은 업데이트하라고 알리고 거부한다', () async {
      final rig = await BackupRig.create(now: t0);
      final r = rig.service.planFromText(
        jsonEncode({
          'format': 'rosarium-backup',
          'schemaVersion': 9,
          'minReaderSchema': 9,
          'data': {},
        }),
      );
      expect(r.plan, isNull);
      expect(r.error, BackupReadError.tooNew.message);
      expect(r.error, contains('업데이트'));
    });
  });

  group('손상 파일은 아무것도 바꾸지 않고 거부한다', () {
    final cases = <String, String>{
      '잘린 JSON': '{"format":"rosarium-backup","data":{"prefs":',
      '빈 파일': '',
      '다른 앱 파일': jsonEncode({'format': 'booktelier', 'data': {}}),
      '배열': jsonEncode([1, 2, 3]),
      'data가 문자열': jsonEncode({
        'format': 'rosarium-backup',
        'schemaVersion': 1,
        'data': 'x',
      }),
      'prefs가 목록': jsonEncode({
        'format': 'rosarium-backup',
        'schemaVersion': 1,
        'data': {'prefs': [], 'prayerRecords': []},
      }),
    };
    for (final e in cases.entries) {
      test(e.key, () async {
        final rig = await BackupRig.create(values: settingsValues, now: t0);
        await rig.stats.add(rec(t0));
        final before = snapshotOf(rig.prefs);
        final vaultBefore = Map.of(rig.files.files);
        final r = rig.service.planFromText(e.value);
        expect(r.plan, isNull);
        expect(r.error, isNotEmpty);
        expect(snapshotOf(rig.prefs), before);
        expect(rig.stats.records, hasLength(1));
        expect(rig.files.files, vaultBefore);
      });
    }

    test('너무 큰 파일은 읽기 전에 거부한다', () {
      final r = BackupCodec.decode('x' * (BackupFormat.maxFileChars + 1));
      expect(r.error, BackupReadError.tooLarge);
    });

    test('칸 길이 한도: 긴 값·긴 목록·긴 id는 그 칸만 건너뛴다', () {
      final r = BackupCodec.decode(
        jsonEncode({
          'format': 'rosarium-backup',
          'schemaVersion': 1,
          'data': {
            'prefs': {
              'church_avatar': {
                't': 'string',
                'v': 'a' * (BackupFormat.maxStringChars + 1),
              },
              'church_favorites': {
                't': 'stringList',
                'v': List.filled(BackupFormat.maxListItems + 1, 'x'),
              },
              'k' * (BackupFormat.maxKeyChars + 1): {'t': 'bool', 'v': true},
              'chime_ten': {'t': 'string', 'v': 'yes'}, // 등록부의 모양(bool)과 다름
              'haptic': {'t': 'bool', 'v': true},
            },
            'prayerRecords': [
              {
                'id': 'i' * 65,
                'at': '2026-10-01T07:00:00.000',
                'set': 'joyful',
                'decades': 1,
              },
              {
                'at': '2026-10-01T07:00:00.000',
                'set': 'joyful',
                'decades': 1,
                'source': 'evil',
              },
              {'at': 'not-a-date', 'set': 'joyful'},
              {
                'id': 'ok',
                'at': '2026-10-01T07:00:00.000',
                'set': 'joyful',
                'decades': 1,
              },
            ],
          },
        }),
      );
      final doc = r.document!;
      expect(doc.prefs.keys, ['haptic']);
      expect(doc.skippedPrefs, 4);
      expect(doc.records.map((e) => e.id), ['ok']);
      expect(doc.skippedRecords, 3);
    });
  });

  group('기록 합치기(중복 없음)', () {
    test('id가 같은 기록·내용이 같은 기록·파일 안의 중복은 하나로', () async {
      final rig = await BackupRig.create(now: t0);
      final a = rec(t0, id: 'a');
      final b = rec(t0.add(const Duration(hours: 1)), id: 'b');
      await rig.stats.add(a);
      final sameContentNewId = rec(t0, id: 'a2'); // a와 내용이 같다
      final (fresh, dup) = BackupImporter.newRecords(rig.stats.records, [
        a,
        b,
        b,
        sameContentNewId,
      ]);
      expect(fresh.map((r) => r.id), ['b']);
      expect(dup, 3);
    });

    test('합쳐도 지금 기록은 하나도 사라지지 않는다', () async {
      final mine = [
        for (var i = 0; i < 5; i++) rec(t0.add(Duration(hours: i)), id: 'm$i'),
      ];
      final other = await BackupRig.create(now: t0);
      await other.stats.add(rec(t0.subtract(const Duration(days: 3)), id: 'x'));
      final text = other.service.buildDocument().encode();
      final rig = await BackupRig.create(
        values: {PrayerStatsStore.prefsKey: BackupDocument.encodeRecords(mine)},
        now: t0,
      );
      await rig.service.applyPlan(rig.service.planFromText(text).plan!);
      expect(rig.stats.records.map((r) => r.id).toSet(), {
        ...mine.map((r) => r.id),
        'x',
      });
    });
  });

  group('형식 판 올리기는 필드를 더하기만 한다', () {
    bool contains(Object? big, Object? small) {
      if (small is Map) {
        if (big is! Map) return false;
        return small.entries.every(
          (e) => big.containsKey(e.key) && contains(big[e.key], e.value),
        );
      }
      if (small is List) {
        if (big is! List || big.length != small.length) return false;
        for (var i = 0; i < small.length; i++) {
          if (!contains(big[i], small[i])) return false;
        }
        return true;
      }
      return big == small;
    }

    final samples = <Map<String, Object?>>[
      {'format': 'rosarium-backup'},
      {
        'format': 'rosarium-backup',
        'data': {
          'prayerRecords': [
            {'at': '2026-01-01T00:00:00.000', 'set': 'joyful'},
          ],
          'future': {'x': 1},
        },
        'extra': true,
      },
      {
        'format': 'rosarium-backup',
        'schemaVersion': 0,
        'data': {
          'prefs': {'chime_ten': true},
        },
      },
    ];

    test('모든 단계: 입력의 모든 값이 출력에 그대로 있다', () {
      for (final s in samples) {
        for (final step in BackupMigrations.steps.entries) {
          final input = BackupMigrations.deepCopy(s) as Map<String, Object?>;
          final out = step.value(
            BackupMigrations.deepCopy(input) as Map<String, Object?>,
          );
          final expected = Map.of(input)..remove('schemaVersion');
          expect(contains(out, expected), isTrue, reason: '${step.key}: $s');
          expect(out['schemaVersion'], step.key + 1);
        }
      }
    });

    test('판 올리기는 원본을 바꾸지 않고, 끝 판은 지금 판이다', () {
      for (final s in samples) {
        final copy = jsonEncode(s);
        final m = BackupMigrations.migrate(s);
        expect(jsonEncode(s), copy);
        expect(m['schemaVersion'], BackupFormat.schemaVersion);
      }
    });

    test('판마다 단계가 빠짐없이 있다', () {
      for (var v = 0; v < BackupFormat.schemaVersion; v++) {
        expect(BackupMigrations.steps.containsKey(v), isTrue, reason: '$v');
      }
    });
  });
}
