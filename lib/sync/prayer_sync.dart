import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../analytics/analytics_types.dart';
import '../domain/prayer_data.dart';
import '../stats/prayer_stats_store.dart';

/// [PrayerSync]가 보는 로컬 기도 기록 저장소의 작은 인터페이스.
abstract class PrayerRecordRepository {
  List<PrayerRecord> get records;

  /// 기록을 로컬에 더한다(중복 id 걸러내기는 호출하는 쪽이 한다).
  Future<void> addAll(List<PrayerRecord> records);

  /// 기록이 바뀔 때 알려 주는 수단(없으면 null).
  Listenable? get changes => null;
}

/// [PrayerStatsStore] 어댑터.
class PrayerStatsStoreRepository extends PrayerRecordRepository {
  PrayerStatsStoreRepository(this.store);
  final PrayerStatsStore store;

  @override
  List<PrayerRecord> get records => store.records;

  @override
  Future<void> addAll(List<PrayerRecord> records) async {
    for (final r in records) {
      await store.add(r);
    }
  }

  @override
  Listenable? get changes => store;
}

/// 로컬 기도 기록과 서버 `prayer_records`를 합친다(id 기준 합집합, 로컬은 지우지
/// 않는다). `sync` 동의가 켜져 있고 로그인했을 때만 동작하며 몇 번을 불러도 같은
/// 결과다. 오프라인이면 조용히 실패하고 나중에 다시 시도한다.
///
/// 동의를 철회해도 로컬에서는 아무것도 하지 않는다(서버 삭제는 `set_consent` RPC).
class PrayerSync {
  PrayerSync({
    required this.uploader,
    required this.consent,
    required this.store,
    required this.userId,
    this.prefs,
    this.batchSize = 100,
    this.maxLocalRecords = PrayerStatsStore.maxRecords,
    this.debounce = const Duration(seconds: 2),
    this.retryMin = const Duration(seconds: 30),
    this.retryMax = const Duration(minutes: 10),
  });

  static const String syncedIdsKey = 'synced_prayer_ids_v1';
  static const String syncedUserKey = 'synced_prayer_user_v1';

  final EventUploader uploader;
  final ConsentGate consent;

  /// 로컬 기록 저장소([PrayerStatsStoreRepository]).
  final PrayerRecordRepository store;

  /// 현재 로그인한 사용자 id(없으면 null). 호출 시점마다 읽는다.
  final String? Function() userId;
  final SharedPreferences? prefs;
  final int batchSize;

  /// 로컬이 이만큼 차 있으면 가장 오래된 로컬 기록보다 오래된 서버 기록은 합치지
  /// 않는다(저장소가 다시 잘라 내서 매번 되살아나는 것을 막는다).
  final int maxLocalRecords;
  final Duration debounce;
  final Duration retryMin;
  final Duration retryMax;

  Future<bool>? _running;
  bool _again = false;
  bool _merging = false;
  bool _disposed = false;
  int _failures = 0;
  Timer? _retryTimer;
  Timer? _debounceTimer;
  bool _listening = false;

  /// 로컬 기록이 바뀔 때마다 (debounce 후) 동기화하도록 붙는다. [onLocalRecordAdded]를
  /// 직접 부르지 않아도 된다.
  void start() {
    final l = store.changes;
    if (l == null || _listening) return;
    _listening = true;
    l.addListener(_onStoreChanged);
  }

  void _onStoreChanged() {
    if (_merging || _disposed) return;
    _debounceTimer?.cancel();
    _debounceTimer = Timer(debounce, () => unawaited(syncNow()));
  }

  Future<SharedPreferences> get _prefs async =>
      prefs ?? await SharedPreferences.getInstance();

  bool get _allowed {
    try {
      return userId() != null && consent(ConsentKinds.sync);
    } catch (_) {
      return false;
    }
  }

  /// 지금 동기화한다. 끝까지 성공하면 true, 동의/로그인이 없거나 실패하면 false.
  /// 이미 돌고 있으면 끝난 뒤 한 번 더 돈다.
  Future<bool> syncNow() {
    if (_disposed) return Future.value(false);
    final running = _running;
    if (running != null) {
      _again = true;
      return running;
    }
    final f = _runLoop();
    _running = f;
    return f;
  }

  Future<bool> _runLoop() async {
    var ok = false;
    try {
      do {
        _again = false;
        ok = await _syncOnce();
      } while (_again && !_disposed);
    } finally {
      _running = null;
    }
    return ok;
  }

  Future<Set<String>> _loadSynced(String uid) async {
    final p = await _prefs;
    if (p.getString(syncedUserKey) != uid) {
      // 다른 계정이면 그 계정에는 아직 아무것도 올라가지 않은 것이다.
      await p.setString(syncedUserKey, uid);
      await p.setStringList(syncedIdsKey, const []);
      return <String>{};
    }
    return (p.getStringList(syncedIdsKey) ?? const []).toSet();
  }

  Future<void> _saveSynced(Set<String> ids) async {
    final p = await _prefs;
    await p.setStringList(syncedIdsKey, ids.toList());
  }

  Future<bool> _syncOnce() async {
    if (!_allowed) return false;
    final uid = userId()!;
    try {
      final synced = await _loadSynced(uid);

      // 1) 서버 기록 내려받기.
      final serverRows = await uploader.fetchPrayerRecords();
      final server = <PrayerRecord>[];
      for (final row in serverRows) {
        final r = fromServerRow(row);
        if (r != null) server.add(r);
      }
      final serverIds = {for (final r in server) r.id};
      final before = synced.length;
      synced.addAll(serverIds);
      final added = synced.length != before;

      // 2) 아직 올리지 않은 로컬 기록 올리기(100개씩).
      final unsynced = [
        for (final r in store.records)
          if (r.hasProgress && !synced.contains(r.id)) r,
      ];
      for (var i = 0; i < unsynced.length; i += batchSize) {
        if (!_allowed) return false;
        final chunk = unsynced.sublist(
          i,
          i + batchSize > unsynced.length ? unsynced.length : i + batchSize,
        );
        await uploader.upsertPrayerRecords([
          for (final r in chunk) toServerRow(r),
        ]);
        synced.addAll(chunk.map((r) => r.id));
        await _saveSynced(synced);
      }
      if (added && unsynced.isEmpty) await _saveSynced(synced);

      // 3) 서버에만 있는 기록을 로컬에 합치기.
      if (!_allowed) return false;
      final local = store.records;
      final localIds = {for (final r in local) r.id};
      DateTime? oldestLocal;
      if (local.length >= maxLocalRecords) {
        for (final r in local) {
          if (oldestLocal == null || r.at.isBefore(oldestLocal)) {
            oldestLocal = r.at;
          }
        }
      }
      final missing = [
        for (final r in server)
          if (r.hasProgress &&
              !localIds.contains(r.id) &&
              (oldestLocal == null || !r.at.isBefore(oldestLocal)))
            r,
      ];
      if (missing.isNotEmpty) {
        _merging = true;
        try {
          for (var i = 0; i < missing.length; i += batchSize) {
            await store.addAll(
              missing.sublist(
                i,
                i + batchSize > missing.length ? missing.length : i + batchSize,
              ),
            );
          }
        } finally {
          _merging = false;
        }
      }
      _failures = 0;
      _retryTimer?.cancel();
      _retryTimer = null;
      return true;
    } catch (_) {
      _scheduleRetry();
      return false;
    }
  }

  void _scheduleRetry() {
    if (_disposed) return;
    _failures++;
    var delay = retryMin * (1 << (_failures - 1).clamp(0, 20));
    if (delay > retryMax) delay = retryMax;
    _retryTimer?.cancel();
    _retryTimer = Timer(delay, () {
      _retryTimer = null;
      unawaited(syncNow());
    });
  }

  /// 방금 더해진 기록 하나를 바로 올린다(실패하면 나중에 전체 동기화로 재시도).
  Future<void> onLocalRecordAdded(PrayerRecord record) async {
    if (_disposed || !record.hasProgress || !_allowed) return;
    final uid = userId()!;
    try {
      await uploader.upsertPrayerRecords([toServerRow(record)]);
      final synced = await _loadSynced(uid);
      if (synced.add(record.id)) await _saveSynced(synced);
    } catch (_) {
      _scheduleRetry();
    }
  }

  void dispose() {
    _disposed = true;
    _retryTimer?.cancel();
    _debounceTimer?.cancel();
    if (_listening) store.changes?.removeListener(_onStoreChanged);
    _listening = false;
  }

  /// 로컬 기록 → 서버 행(`user_id`는 업로더가 채운다).
  @visibleForTesting
  static Map<String, dynamic> toServerRow(PrayerRecord r) => {
    'id': r.id,
    'at': r.at.toUtc().toIso8601String(),
    'mystery_set': r.set.name,
    'decades': r.decades.clamp(0, 5),
    'hail_marys': r.hailMarys.clamp(0, 60),
    'completed': r.completed,
    'seconds': r.seconds.clamp(0, 86400),
    'source': r.source,
  };

  /// 서버 행 → 로컬 기록(형식이 틀리면 null).
  @visibleForTesting
  static PrayerRecord? fromServerRow(Map<String, dynamic> row) {
    final id = row['id'];
    if (id is! String || id.isEmpty) return null;
    final set = row['mystery_set'];
    if (!MysterySet.values.any((s) => s.name == set)) return null;
    return PrayerRecord.tryParse({
      'id': id,
      'at': row['at'],
      'set': set,
      'decades': row['decades'],
      'hailMarys': row['hail_marys'],
      'completed': row['completed'],
      'seconds': row['seconds'],
      'source': row['source'],
    });
  }
}
