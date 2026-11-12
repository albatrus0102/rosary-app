import 'dart:async';
import 'dart:collection';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'prayer_record.dart';
import 'prayer_stats_calc.dart';

export 'prayer_record.dart';
export 'prayer_stats_calc.dart';

/// 기도 기록 저장소. `shared_preferences`의 `prayer_stats_v1` 키에 JSON 목록으로
/// 저장하며 최신 [maxRecords]개만 남긴다. 변경되면 리스너에게 알린다.
class PrayerStatsStore extends ChangeNotifier {
  PrayerStatsStore._(this._prefs, Iterable<PrayerRecord> records) {
    _records = _normalize(records);
  }

  /// 저장 없이 메모리에만 두는 저장소(테스트·미리보기용).
  PrayerStatsStore.inMemory([Iterable<PrayerRecord> records = const []])
    : _prefs = null {
    _records = _normalize(records);
  }

  static const String prefsKey = 'prayer_stats_v1';
  static const int maxRecords = 5000;

  /// 저장된 기록을 읽는다. 깨진 JSON이면 빈 기록으로 시작하고, 개별 기록이
  /// 잘못되었으면 그 기록만 건너뛴다.
  static Future<PrayerStatsStore> load({SharedPreferences? prefs}) async {
    final p = prefs ?? await SharedPreferences.getInstance();
    final records = <PrayerRecord>[];
    var needsResave = false;
    final raw = p.getString(prefsKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is List) {
          for (final item in decoded) {
            final r = PrayerRecord.tryParse(item);
            if (r == null) continue;
            records.add(r);
            // 구버전 JSON(id 없음)은 새 id를 받았으니 다시 저장한다.
            final rawId = item is Map ? item['id'] : null;
            if (rawId is! String || rawId.isEmpty) needsResave = true;
          }
        }
      } catch (_) {
        // 깨진 데이터: 빈 기록으로 시작.
      }
    }
    final store = PrayerStatsStore._(p, records);
    if (needsResave) await store._persist();
    return store;
  }

  final SharedPreferences? _prefs;
  late List<PrayerRecord> _records;
  PrayerStatsCalc? _calc;
  Future<void> _writeChain = Future<void>.value();

  /// 최신순(바깥에서 수정할 수 없다).
  List<PrayerRecord> get records => UnmodifiableListView(_records);

  /// 현재 기록에 대한 집계기(기록이 바뀔 때마다 새로 만들어진다).
  PrayerStatsCalc get calc => _calc ??= PrayerStatsCalc(_records);

  static List<PrayerRecord> _normalize(Iterable<PrayerRecord> input) {
    final list = input.toList()..sort((a, b) => b.at.compareTo(a.at));
    if (list.length > maxRecords) list.removeRange(maxRecords, list.length);
    return list;
  }

  /// 기록을 더한다. 진행이 전혀 없는 기록은 무시한다.
  Future<void> add(PrayerRecord record) async {
    if (!record.hasProgress) return;
    _records = _normalize([..._records, record]);
    _calc = null;
    notifyListeners();
    await _persist();
  }

  /// 모든 기록을 지운다. 호출하는 쪽에서 확인을 먼저 받아야 한다.
  Future<void> clear() async {
    _records = [];
    _calc = null;
    notifyListeners();
    final prefs = _prefs;
    if (prefs == null) return;
    _writeChain = _writeChain.then((_) async {
      try {
        await prefs.remove(prefsKey);
      } catch (_) {}
    });
    await _writeChain;
  }

  Future<void> _persist() {
    final prefs = _prefs;
    if (prefs == null) return Future<void>.value();
    final snapshot = jsonEncode([for (final r in _records) r.toJson()]);
    _writeChain = _writeChain.then((_) async {
      try {
        await prefs.setString(prefsKey, snapshot);
      } catch (_) {
        // 저장 실패는 메모리 상태를 해치지 않는다.
      }
    });
    return _writeChain;
  }
}
