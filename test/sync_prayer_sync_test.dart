// ignore_for_file: depend_on_referenced_packages
import 'package:fake_async/fake_async.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/analytics_types.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';
import 'package:rosary_app/sync/prayer_sync.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MemRepo extends PrayerRecordRepository with ChangeNotifier {
  MemRepo([Iterable<PrayerRecord> initial = const []])
    : _records = [...initial];
  final List<PrayerRecord> _records;
  final List<int> addBatches = [];

  @override
  List<PrayerRecord> get records => List.unmodifiable(_records);

  @override
  Future<void> addAll(List<PrayerRecord> records) async {
    addBatches.add(records.length);
    _records.addAll(records);
    notifyListeners();
  }

  /// 앱이 직접 기록을 더하는 경우.
  void addLocal(PrayerRecord r) {
    _records.add(r);
    notifyListeners();
  }

  @override
  Listenable? get changes => this;
}

PrayerRecord rec(
  String id, {
  int day = 1,
  int decades = 1,
  MysterySet set = MysterySet.joyful,
  int hail = 10,
  bool completed = false,
}) => PrayerRecord(
  id: id,
  at: DateTime.utc(2026, 10, day, 8),
  set: set,
  decades: decades,
  hailMarys: hail,
  completed: completed,
  seconds: 300,
);

Map<String, dynamic> serverRow(PrayerRecord r) => PrayerSync.toServerRow(r);

void main() {
  late FakeEventUploader up;
  late MemRepo repo;
  late String? user;
  late bool sync;

  PrayerSync make({
    Iterable<PrayerRecord> local = const [],
    int batchSize = 100,
    int maxLocal = 5000,
  }) {
    repo = MemRepo(local);
    return PrayerSync(
      uploader: up,
      consent: (k) => k == 'sync' && sync,
      store: repo,
      userId: () => user,
      batchSize: batchSize,
      maxLocalRecords: maxLocal,
    );
  }

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    up = FakeEventUploader();
    user = 'user-1';
    sync = true;
  });

  test(
    'merges by id: uploads missing local, downloads missing server',
    () async {
      final a = rec('a', day: 1), b = rec('b', day: 2), c = rec('c', day: 3);
      up.serverPrayerRecords['b'] = serverRow(b);
      up.serverPrayerRecords['c'] = serverRow(c);
      final s = make(local: [a, b]);
      expect(await s.syncNow(), isTrue);

      expect(up.serverPrayerRecords.keys.toSet(), {'a', 'b', 'c'});
      // 서버에 이미 있던 b는 다시 올리지 않는다.
      expect(up.upsertBatches.expand((x) => x).map((r) => r['id']), ['a']);
      expect(repo.records.map((r) => r.id).toSet(), {'a', 'b', 'c'});
      final got = repo.records.firstWhere((r) => r.id == 'c');
      expect(got.at.isAtSameMomentAs(c.at), isTrue);
      expect(got.set, c.set);
      expect(got.hailMarys, c.hailMarys);
    },
  );

  test('local records are never deleted by sync', () async {
    final s = make(local: [rec('a'), rec('b')]);
    up.serverPrayerRecords['z'] = serverRow(rec('z'));
    await s.syncNow();
    expect(repo.records.map((r) => r.id), containsAll(['a', 'b', 'z']));
    expect(repo.records, hasLength(3));
  });

  test('is idempotent: a second sync changes nothing', () async {
    final s = make(local: [rec('a')]);
    up.serverPrayerRecords['c'] = serverRow(rec('c'));
    await s.syncNow();
    final batches = up.upsertBatches.length;
    final local = repo.records.length;
    expect(await s.syncNow(), isTrue);
    expect(await s.syncNow(), isTrue);
    expect(up.upsertBatches.length, batches);
    expect(repo.records.length, local);
    expect(repo.addBatches, hasLength(1));
    // 새 인스턴스(앱 재시작)도 prefs의 id 집합으로 다시 올리지 않는다.
    final s2 = PrayerSync(
      uploader: up,
      consent: (_) => true,
      store: repo,
      userId: () => user,
    );
    await s2.syncNow();
    expect(up.upsertBatches.length, batches);
    final prefs = await SharedPreferences.getInstance();
    expect(
      prefs.getStringList('synced_prayer_ids_v1'),
      containsAll(['a', 'c']),
    );
  });

  test('uploads and downloads in batches of 100', () async {
    final local = [for (var i = 0; i < 250; i++) rec('l$i', day: 1 + i % 28)];
    for (var i = 0; i < 230; i++) {
      up.serverPrayerRecords['s$i'] = serverRow(rec('s$i', day: 1 + i % 28));
    }
    final s = make(local: local);
    await s.syncNow();
    expect(up.upsertBatches.map((b) => b.length), [100, 100, 50]);
    expect(repo.addBatches, [100, 100, 30]);
    expect(repo.records, hasLength(480));
  });

  test('does nothing without sync consent or without a user', () async {
    final s = make(local: [rec('a')]);
    sync = false;
    expect(await s.syncNow(), isFalse);
    sync = true;
    user = null;
    expect(await s.syncNow(), isFalse);
    await s.onLocalRecordAdded(rec('a'));
    expect(up.fetchCalls, 0);
    expect(up.upsertBatches, isEmpty);
  });

  test(
    'revoking sync consent leaves local records alone and stops syncing',
    () async {
      final s = make(local: [rec('a')]);
      await s.syncNow();
      final before = repo.records.length;
      sync = false;
      up.serverPrayerRecords['n'] = serverRow(rec('n'));
      expect(await s.syncNow(), isFalse);
      expect(repo.records.length, before);
      expect(up.fetchCalls, 1);
    },
  );

  test(
    'records without progress and malformed server rows are skipped',
    () async {
      final empty = rec('e', decades: 0, hail: 0);
      up.serverPrayerRecords['bad'] = {'id': 'bad', 'at': 'nope'};
      up.serverPrayerRecords['bad2'] = {
        ...serverRow(rec('bad2')),
        'mystery_set': 'dark',
      };
      final s = make(local: [empty, rec('a')]);
      expect(await s.syncNow(), isTrue);
      expect(up.upsertBatches.expand((b) => b).map((r) => r['id']), ['a']);
      expect(repo.records.map((r) => r.id).toSet(), {'e', 'a'});
    },
  );

  test('row mapping matches the prayer_records schema', () {
    final r = PrayerRecord(
      id: 'x',
      at: DateTime.utc(2026, 10, 3, 4, 5),
      set: MysterySet.glorious,
      decades: 5,
      hailMarys: 99,
      completed: true,
      seconds: 99999,
      source: 'church',
    );
    final row = PrayerSync.toServerRow(r);
    expect(row, {
      'id': 'x',
      'at': '2026-10-03T04:05:00.000Z',
      'mystery_set': 'glorious',
      'decades': 5,
      'hail_marys': 60,
      'completed': true,
      'seconds': 86400,
      'source': 'church',
    });
    expect(row.containsKey('user_id'), isFalse);
    final back = PrayerSync.fromServerRow({
      ...row,
      'user_id': 'u',
      'created_at': 'whenever',
    })!;
    expect(back.id, 'x');
    expect(back.set, MysterySet.glorious);
    expect(back.hailMarys, 60);
    expect(back.source, 'church');
  });

  test(
    'offline: fails quietly, local data untouched, retries with backoff',
    () {
      fakeAsync((fa) {
        up.failing = true;
        final s = make(local: [rec('a')]);
        up.serverPrayerRecords['c'] = serverRow(rec('c'));
        bool? result;
        s.syncNow().then((v) => result = v);
        fa.flushMicrotasks();
        expect(result, isFalse);
        expect(repo.records.map((r) => r.id), ['a']);
        expect(up.fetchCalls, 1);

        fa.elapse(const Duration(seconds: 29));
        expect(up.fetchCalls, 1);
        fa.elapse(const Duration(seconds: 1)); // 30s
        expect(up.fetchCalls, 2);
        fa.elapse(const Duration(seconds: 59));
        expect(up.fetchCalls, 2);
        fa.elapse(const Duration(seconds: 1)); // +60s
        expect(up.fetchCalls, 3);

        up.failing = false;
        fa.elapse(const Duration(seconds: 120));
        expect(repo.records.map((r) => r.id).toSet(), {'a', 'c'});
        expect(up.serverPrayerRecords.keys, containsAll(['a', 'c']));
        final calls = up.fetchCalls;
        fa.elapse(const Duration(minutes: 30));
        expect(up.fetchCalls, calls); // 성공하면 재시도 타이머가 멈춘다
        s.dispose();
      });
    },
  );

  test('failure midway keeps what was uploaded and finishes later', () {
    fakeAsync((fa) {
      final local = [for (var i = 0; i < 150; i++) rec('l$i')];
      final s = make(local: local);
      // 첫 fetch는 성공, 첫 upsert 성공, 둘째 upsert 실패.
      var upserts = 0;
      final flaky = _Flaky(up, failOnUpsert: (n) => n == 2);
      final s2 = PrayerSync(
        uploader: flaky,
        consent: (_) => true,
        store: repo,
        userId: () => user,
      );
      s2.syncNow();
      fa.flushMicrotasks();
      upserts = up.upsertBatches.length;
      expect(upserts, 1);
      fa.elapse(const Duration(seconds: 30));
      expect(up.serverPrayerRecords, hasLength(150));
      expect(up.upsertBatches.map((b) => b.length), [100, 50]);
      s.dispose();
      s2.dispose();
    });
  });

  test(
    'onLocalRecordAdded uploads one record; failure is retried by a sync',
    () {
      fakeAsync((fa) {
        final s = make();
        final r = rec('n1');
        repo.addLocal(r);
        s.onLocalRecordAdded(r);
        fa.flushMicrotasks();
        expect(up.upsertBatches.single.single['id'], 'n1');

        up.failing = true;
        final r2 = rec('n2', day: 2);
        repo.addLocal(r2);
        s.onLocalRecordAdded(r2);
        fa.flushMicrotasks();
        expect(up.serverPrayerRecords.keys, ['n1']);

        up.failing = false;
        fa.elapse(const Duration(seconds: 30));
        expect(up.serverPrayerRecords.keys.toSet(), {'n1', 'n2'});
        // n1은 이미 올라간 것으로 기억하고 다시 올리지 않는다.
        expect(
          up.upsertBatches.expand((b) => b).where((r) => r['id'] == 'n1'),
          hasLength(1),
        );
        s.dispose();
      });
    },
  );

  test(
    'start(): store changes trigger one debounced sync, no feedback loop',
    () {
      fakeAsync((fa) {
        final s = make();
        s.start();
        repo.addLocal(rec('n1'));
        repo.addLocal(rec('n2', day: 2));
        fa.elapse(const Duration(seconds: 1));
        expect(up.fetchCalls, 0);
        fa.elapse(const Duration(seconds: 2));
        expect(up.fetchCalls, 1);
        expect(up.serverPrayerRecords.keys.toSet(), {'n1', 'n2'});

        // 서버에서 합쳐 넣은 기록이 다시 동기화를 일으키지 않는다.
        up.serverPrayerRecords['z'] = serverRow(rec('z', day: 3));
        repo.addLocal(rec('n3', day: 4));
        fa.elapse(const Duration(seconds: 3));
        expect(up.fetchCalls, 2);
        fa.elapse(const Duration(minutes: 1));
        expect(up.fetchCalls, 2);
        expect(repo.records.map((r) => r.id), contains('z'));
        s.dispose();
      });
    },
  );

  test('switching accounts resets the uploaded-id memory', () async {
    final s = make(local: [rec('a')]);
    await s.syncNow();
    expect(up.upsertBatches, hasLength(1));
    user = 'user-2';
    up.serverPrayerRecords.clear();
    await s.syncNow();
    expect(up.upsertBatches, hasLength(2));
  });

  test(
    'server records older than a full local store are not resurrected',
    () async {
      up.serverPrayerRecords['old'] = serverRow(rec('old', day: 1));
      up.serverPrayerRecords['new'] = serverRow(rec('new', day: 20));
      final s = make(
        local: [rec('a', day: 10), rec('b', day: 11)],
        maxLocal: 2,
      );
      await s.syncNow();
      expect(repo.records.map((r) => r.id).toSet(), {'a', 'b', 'new'});
    },
  );

  test('concurrent syncNow calls are coalesced', () async {
    final s = make(local: [rec('a')]);
    final f1 = s.syncNow();
    final f2 = s.syncNow();
    await Future.wait([f1, f2]);
    expect(
      up.upsertBatches.expand((b) => b).where((r) => r['id'] == 'a'),
      hasLength(1),
    );
  });

  test('PrayerStatsStoreRepository merges into the real store', () async {
    final store = PrayerStatsStore.inMemory([rec('a')]);
    up.serverPrayerRecords['c'] = serverRow(rec('c', day: 5));
    final s = PrayerSync(
      uploader: up,
      consent: (_) => true,
      store: PrayerStatsStoreRepository(store),
      userId: () => user,
    );
    expect(await s.syncNow(), isTrue);
    expect(store.records.map((r) => r.id).toSet(), {'a', 'c'});
    expect(await s.syncNow(), isTrue);
    expect(store.records, hasLength(2));
  });
}

/// 지정한 upsert 호출만 실패시키는 업로더.
class _Flaky implements EventUploader {
  _Flaky(this.inner, {required this.failOnUpsert});
  final FakeEventUploader inner;
  final bool Function(int n) failOnUpsert;
  int _n = 0;

  @override
  Future<void> upsertPrayerRecords(List<Map<String, dynamic>> rows) async {
    _n++;
    if (failOnUpsert(_n)) throw StateError('flaky');
    await inner.upsertPrayerRecords(rows);
  }

  @override
  Future<List<Map<String, dynamic>>> fetchPrayerRecords() =>
      inner.fetchPrayerRecords();
  @override
  Future<void> uploadDevice(Map<String, dynamic> row) =>
      inner.uploadDevice(row);
  @override
  Future<void> uploadEvents(List<Map<String, dynamic>> rows) =>
      inner.uploadEvents(rows);
}
