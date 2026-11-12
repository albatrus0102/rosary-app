import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

PrayerRecord rec(DateTime at, {bool completed = true, int decades = 5}) =>
    PrayerRecord(
      at: at,
      set: MysterySet.luminous,
      decades: decades,
      hailMarys: decades * 10 + 3,
      completed: completed,
      seconds: 700,
      source: 'church',
    );

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('PrayerRecord JSON', () {
    test('왕복', () {
      final r = rec(DateTime(2026, 11, 12, 7, 30));
      expect(PrayerRecord.tryParse(jsonDecode(jsonEncode(r.toJson()))), r);
    });

    test('id: UUID v4 형식, 기록마다 다르다', () {
      final a = rec(DateTime(2026, 1, 1));
      final b = rec(DateTime(2026, 1, 1));
      final uuid = RegExp(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
      );
      expect(a.id, matches(uuid));
      expect(a.id, isNot(b.id));
      expect(
        PrayerRecord(at: DateTime(2026), set: MysterySet.joyful, id: 'x').id,
        'x',
      );
    });

    test('필수 필드가 없거나 잘못되면 null', () {
      expect(PrayerRecord.tryParse(null), isNull);
      expect(PrayerRecord.tryParse('x'), isNull);
      expect(PrayerRecord.tryParse({'set': 'joyful'}), isNull);
      expect(
        PrayerRecord.tryParse({'at': 'not a date', 'set': 'joyful'}),
        isNull,
      );
      expect(
        PrayerRecord.tryParse({'at': '2026-01-01T00:00:00', 'set': 'nope'}),
        isNull,
      );
      expect(
        PrayerRecord.tryParse({
          'at': '2026-01-01T00:00:00',
          'set': 'joyful',
          'decades': 'many',
        }),
        isNull,
      );
    });

    test('선택 필드는 기본값, 범위는 보정', () {
      final r = PrayerRecord.tryParse({
        'at': '2026-01-01T00:00:00',
        'set': 'joyful',
        'decades': 9,
        'seconds': -5,
        'source': 'weird',
      })!;
      expect(r.decades, 5);
      expect(r.seconds, 0);
      expect(r.hailMarys, 0);
      expect(r.completed, isFalse);
      expect(r.source, 'app');
    });
  });

  group('PrayerStatsStore', () {
    test('저장 후 다시 읽어도 같다 (최신순)', () async {
      final store = await PrayerStatsStore.load();
      expect(store.records, isEmpty);
      var notified = 0;
      store.addListener(() => notified++);
      await store.add(rec(DateTime(2026, 11, 1)));
      await store.add(rec(DateTime(2026, 11, 3)));
      await store.add(rec(DateTime(2026, 11, 2), completed: false, decades: 2));
      expect(notified, 3);
      expect(store.records.map((r) => r.at.day), [3, 2, 1]);

      final again = await PrayerStatsStore.load();
      expect(again.records, store.records);
      expect(again.calc.completedAll(), 2);
    });

    test('id는 저장/불러오기 후에도 그대로이고 구버전 JSON은 id를 받아 다시 저장된다', () async {
      final store = await PrayerStatsStore.load();
      final r = rec(DateTime(2026, 11, 1));
      await store.add(r);
      final again = await PrayerStatsStore.load();
      expect(again.records.single.id, r.id);

      final legacy = rec(DateTime(2026, 11, 2)).toJson()..remove('id');
      SharedPreferences.setMockInitialValues({
        PrayerStatsStore.prefsKey: jsonEncode([legacy]),
      });
      final migrated = await PrayerStatsStore.load();
      final newId = migrated.records.single.id;
      expect(newId, isNotEmpty);
      final reloaded = await PrayerStatsStore.load();
      expect(reloaded.records.single.id, newId);
    });

    test('진행 없는 기록은 저장하지 않는다', () async {
      final store = await PrayerStatsStore.load();
      await store.add(
        PrayerRecord(at: DateTime(2026, 1, 1), set: MysterySet.joyful),
      );
      expect(store.records, isEmpty);
    });

    test('깨진 JSON은 빈 기록으로 시작', () async {
      SharedPreferences.setMockInitialValues({
        PrayerStatsStore.prefsKey: '{not json',
      });
      final store = await PrayerStatsStore.load();
      expect(store.records, isEmpty);
      await store.add(rec(DateTime(2026, 1, 1)));
      expect((await PrayerStatsStore.load()).records, hasLength(1));
    });

    test('JSON이 목록이 아니면 빈 기록', () async {
      SharedPreferences.setMockInitialValues({
        PrayerStatsStore.prefsKey: '{"a":1}',
      });
      expect((await PrayerStatsStore.load()).records, isEmpty);
    });

    test('잘못된 항목만 건너뛴다', () async {
      final good = rec(DateTime(2026, 5, 5));
      SharedPreferences.setMockInitialValues({
        PrayerStatsStore.prefsKey: jsonEncode([
          good.toJson(),
          {'at': 'x'},
          42,
          null,
        ]),
      });
      final store = await PrayerStatsStore.load();
      expect(store.records, [good]);
    });

    test('최대 5000개 최신만 유지', () async {
      final base = DateTime(2020, 1, 1);
      final many = [
        for (var i = 0; i < PrayerStatsStore.maxRecords + 20; i++)
          rec(base.add(Duration(hours: i))),
      ];
      final store = PrayerStatsStore.inMemory(many);
      expect(store.records, hasLength(PrayerStatsStore.maxRecords));
      expect(store.records.first.at, many.last.at);
      expect(store.records.last.at, many[20].at);
      await store.add(rec(base.add(const Duration(days: 9999))));
      expect(store.records, hasLength(PrayerStatsStore.maxRecords));
    });

    test('clear는 저장된 값까지 지운다', () async {
      final store = await PrayerStatsStore.load();
      await store.add(rec(DateTime(2026, 1, 1)));
      var notified = 0;
      store.addListener(() => notified++);
      await store.clear();
      expect(notified, 1);
      expect(store.records, isEmpty);
      expect(
        (await SharedPreferences.getInstance()).getString('prayer_stats_v1'),
        isNull,
      );
      expect((await PrayerStatsStore.load()).records, isEmpty);
    });

    test('inMemory는 저장 없이 동작', () async {
      final store = PrayerStatsStore.inMemory([rec(DateTime(2026, 1, 1))]);
      await store.add(rec(DateTime(2026, 1, 2)));
      expect(store.records, hasLength(2));
      expect(
        (await SharedPreferences.getInstance()).getString('prayer_stats_v1'),
        isNull,
      );
    });
  });
}
