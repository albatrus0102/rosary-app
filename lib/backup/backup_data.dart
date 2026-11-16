import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../stats/prayer_record.dart';
import 'backup_format.dart';
import 'backup_registry.dart';

/// 기기에 **실제로 저장된 것**(SharedPreferences)에서 백업 한 벌을 모은다. 화면의 메모리 값이
/// 아니라 저장소를 읽는다 — 금고·자동 백업·내보내기가 모두 「디스크에 쓰인 것」만 싣는다
/// (독서공방 B-12). 등록부에 없는 새 키도 비밀처럼 보이지 않으면 함께 싣는다(일반 수집).
abstract final class BackupCollector {
  /// 이 앱이 모르는 구역(새 버전 앱 파일에서 온 것)을 보관하는 내부 키.
  static const String carryKey = '${BackupRegistry.internalPrefix}carry_v1';

  static BackupDocument collect(
    SharedPreferences prefs, {
    required DateTime now,
    String appVersion = '',
    Map<String, Object?> device = const {},
  }) {
    final out = <String, TypedPref>{};
    final keys = prefs.getKeys().toList()..sort();
    for (final k in keys) {
      if (!BackupRegistry.shouldExport(k)) continue;
      final v = TypedPref.fromStored(prefs.get(k));
      if (v == null) continue;
      out[k] = v;
    }
    return BackupDocument(
      createdAt: now,
      appVersion: appVersion,
      device: device,
      prefs: out,
      records: readRecords(prefs),
      carry: readCarry(prefs),
    );
  }

  /// 저장된 기도 기록(PrayerStatsStore와 같은 규칙으로 읽는다).
  static List<PrayerRecord> readRecords(SharedPreferences prefs) {
    final raw = prefs.getString(BackupRegistry.prayerRecordsKey);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final list = jsonDecode(raw);
      if (list is! List) return const [];
      return [for (final item in list) ?PrayerRecord.tryParse(item)];
    } catch (e) {
      debugPrint('backup: stored records unreadable (${e.runtimeType})');
      return const [];
    }
  }

  static Map<String, Object?> readCarry(SharedPreferences prefs) {
    final raw = prefs.getString(carryKey);
    if (raw == null || raw.isEmpty) return const {};
    try {
      final m = jsonDecode(raw);
      return m is Map ? Map<String, Object?>.from(m) : const {};
    } catch (e) {
      debugPrint('backup: carry unreadable (${e.runtimeType})');
      return const {};
    }
  }

  /// 설정(backup 키) 개수 — 「설정이 통째로 지워졌나」 판정용.
  static int settingsCount(SharedPreferences prefs) =>
      prefs.getKeys().where(BackupRegistry.shouldExport).length;
}

/// 가져오기 전에 보여 줄 「무엇이 바뀌나」.
class ImportPlan {
  ImportPlan({
    required this.document,
    required this.newRecords,
    required this.duplicateRecords,
    required this.changedPrefs,
    required this.samePrefs,
    required this.typeConflicts,
    required this.recordsBefore,
    required this.maxRecords,
  });

  final BackupDocument document;

  /// 이 기기에 없어 새로 더해질 기록.
  final List<PrayerRecord> newRecords;

  /// 이미 있어 건너뛸 기록 수(id 또는 내용이 같다).
  final int duplicateRecords;

  /// 값이 바뀔 설정(키 → 새 값).
  final Map<String, TypedPref> changedPrefs;
  final int samePrefs;

  /// 이 기기에 다른 모양으로 저장돼 있어 건너뛸 설정 수.
  final int typeConflicts;
  final int recordsBefore;
  final int maxRecords;

  int get recordsAfter => recordsBefore + newRecords.length;

  /// 합친 뒤 보관 한도를 넘어 가장 오래된 기록이 빠지는가.
  bool get trims => recordsAfter > maxRecords;

  /// 등록부에 없는 키(새 버전 앱의 설정) 수.
  int get unknownPrefs =>
      changedPrefs.keys.where((k) => BackupRegistry.specFor(k) == null).length;

  bool get newerFile => document.schemaVersion > BackupFormat.schemaVersion;

  bool get changesNothing =>
      newRecords.isEmpty && changedPrefs.isEmpty && document.carry.isEmpty;

  /// 바뀌는 설정의 사람이 읽는 이름(겹치면 하나로).
  List<String> get changedLabels {
    final labels = <String>{};
    var other = 0;
    for (final k in changedPrefs.keys) {
      final l = BackupRegistry.specFor(k)?.label;
      if (l == null) {
        other++;
      } else {
        labels.add(l);
      }
    }
    return [...labels, if (other > 0) '기타 설정 $other개'];
  }
}

abstract final class BackupImporter {
  /// 같은 기록인지 보는 내용 지문(id가 없던 옛 기록을 두 번 가져와도 겹치지 않게).
  static String fingerprint(PrayerRecord r) =>
      '${r.at.toUtc().millisecondsSinceEpoch}|${r.set.name}|${r.decades}|'
      '${r.hailMarys}|${r.completed}|${r.seconds}|${r.source}';

  /// [current]에 없는 기록만 고른다(id·내용 지문 둘 다로). 파일 안의 중복도 하나로.
  static (List<PrayerRecord>, int) newRecords(
    Iterable<PrayerRecord> current,
    Iterable<PrayerRecord> incoming,
  ) {
    final ids = <String>{for (final r in current) r.id};
    final prints = <String>{for (final r in current) fingerprint(r)};
    final out = <PrayerRecord>[];
    var dup = 0;
    for (final r in incoming) {
      final fp = fingerprint(r);
      if (ids.contains(r.id) || prints.contains(fp)) {
        dup++;
        continue;
      }
      ids.add(r.id);
      prints.add(fp);
      out.add(r);
    }
    return (out, dup);
  }

  static ImportPlan plan(
    BackupDocument doc,
    SharedPreferences prefs,
    List<PrayerRecord> currentRecords, {
    int maxRecords = 5000,
  }) {
    final (fresh, dup) = newRecords(currentRecords, doc.records);
    final changed = <String, TypedPref>{};
    var same = 0;
    var conflicts = 0;
    for (final e in doc.prefs.entries) {
      final stored = prefs.get(e.key);
      final cur = stored == null ? null : TypedPref.fromStored(stored);
      if (cur != null && cur.type != e.value.type) {
        // 이 기기의 같은 키가 다른 모양이다 — 쓰면 앱이 읽다 던질 수 있어 건너뛴다.
        conflicts++;
        continue;
      }
      if (cur != null && cur.sameValue(e.value)) {
        same++;
      } else {
        changed[e.key] = e.value;
      }
    }
    return ImportPlan(
      document: doc,
      newRecords: fresh,
      duplicateRecords: dup,
      changedPrefs: changed,
      samePrefs: same,
      typeConflicts: conflicts,
      recordsBefore: currentRecords.length,
      maxRecords: maxRecords,
    );
  }

  /// 설정을 바꾸고 모르는 구역을 보관한다. 하나라도 저장에 실패하면 false(호출부가 알린다).
  /// 파일에 없는 설정은 건드리지 않는다(일부만 담긴 파일이 나머지 설정을 지우지 않게).
  static Future<bool> applyPrefs(
    ImportPlan plan,
    SharedPreferences prefs,
  ) async {
    var ok = true;
    for (final e in plan.changedPrefs.entries) {
      final v = e.value.value;
      try {
        final done = switch (e.value.type) {
          PrefType.boolean => await prefs.setBool(e.key, v as bool),
          PrefType.integer => await prefs.setInt(e.key, v as int),
          PrefType.decimal => await prefs.setDouble(e.key, v as double),
          PrefType.text => await prefs.setString(e.key, v as String),
          PrefType.textList => await prefs.setStringList(
            e.key,
            List<String>.from(v as List),
          ),
        };
        if (!done) ok = false;
      } catch (err) {
        debugPrint('backup import: pref write failed (${err.runtimeType})');
        ok = false;
      }
    }
    final carry = plan.document.carry;
    if (carry.isNotEmpty) {
      try {
        final merged = {...BackupCollector.readCarry(prefs), ...carry};
        if (!await prefs.setString(
          BackupCollector.carryKey,
          jsonEncode(merged),
        )) {
          ok = false;
        }
      } catch (err) {
        debugPrint('backup import: carry write failed (${err.runtimeType})');
        ok = false;
      }
    }
    return ok;
  }
}
