import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'backup_data.dart';
import 'backup_format.dart';
import 'backup_registry.dart';

/// 금고 파일 저장소. 실패하면 **던진다**(호출부가 사유를 남기고 화면에 보인다 — 조용히 삼키지 않는다).
abstract class VaultFiles {
  Future<String?> read(String name);
  Future<void> write(String name, String data);
  Future<void> delete(String name);
}

/// 앱 전용 폴더(`getApplicationSupportDirectory()/backup_vault`, 안드로이드 `files/backup_vault`).
/// 안드로이드 자동 백업(구글 계정) 규칙이 이 폴더만 담으므로 앱을 지웠다 깔아도 돌아온다
/// (`android/app/src/main/res/xml/data_extraction_rules.xml`).
class DirVaultFiles implements VaultFiles {
  DirVaultFiles({Future<Directory> Function()? base})
    : _base = base ?? getApplicationSupportDirectory;

  final Future<Directory> Function() _base;
  Directory? _dir;

  Future<Directory> _folder() async {
    final d = _dir ??= Directory('${(await _base()).path}/backup_vault');
    if (!await d.exists()) await d.create(recursive: true);
    return d;
  }

  @override
  Future<String?> read(String name) async {
    final f = File('${(await _folder()).path}/$name.json');
    if (!await f.exists()) return null;
    return f.readAsString(encoding: utf8);
  }

  @override
  Future<void> write(String name, String data) async {
    final dir = await _folder();
    final f = File('${dir.path}/$name.json');
    final tmp = File('${dir.path}/$name.json.tmp');
    // 끝까지 쓰고(flush = fsync) 이름을 바꾼다 — 쓰다 죽어도 옛 파일이 온전히 남는다.
    await tmp.writeAsString(data, encoding: utf8, flush: true);
    await tmp.rename(f.path);
  }

  @override
  Future<void> delete(String name) async {
    final f = File('${(await _folder()).path}/$name.json');
    if (await f.exists()) await f.delete();
  }
}

/// 메모리 금고(시험·백엔드 없는 미리보기).
class MemoryVaultFiles implements VaultFiles {
  final Map<String, String> files = {};
  bool failWrites = false;

  @override
  Future<String?> read(String name) async => files[name];

  @override
  Future<void> write(String name, String data) async {
    if (failWrites) throw const FileSystemException('disk full');
    files[name] = data;
  }

  @override
  Future<void> delete(String name) async => files.remove(name);
}

/// 금고 사본 한 벌.
class VaultSnapshot {
  VaultSnapshot({
    required this.slot,
    required this.document,
    required this.savedAt,
    required this.seq,
    required this.reason,
  });

  /// g0(최신)·g1(직전)·d1(지난 날의 마지막)·guard(줄기 전)·pre0/pre1(가져오기·되살리기 직전).
  final String slot;
  final BackupDocument document;
  final DateTime savedAt;
  final int seq;
  final String reason;

  int get records => document.records.length;
  int get settings => document.prefs.length;
  bool get isEmpty => records == 0 && settings == 0;

  String get slotLabel => switch (slot) {
    'g0' => '가장 최근 사본',
    'g1' => '그 전 사본',
    'd1' => '지난 날의 사본',
    'guard' => '기록이 줄기 전 사본',
    'pre0' || 'pre1' => '가져오기·되살리기 직전 사본',
    _ => '자동 백업 폴더의 사본',
  };
}

/// 실행할 때 「기록이 이상하게 줄었다」를 찾은 결과(사람에게 물을 것).
class RestoreOffer {
  const RestoreOffer({
    required this.reason,
    required this.beforeRecords,
    required this.nowRecords,
    required this.beforeSettings,
    required this.nowSettings,
    required this.at,
  });

  /// records(기록이 크게 줄었음) · prefs(설정이 통째로 비었음) · empty(앱이 비어 있고 사본이 있음).
  final String reason;
  final int beforeRecords;
  final int nowRecords;
  final int beforeSettings;
  final int nowSettings;

  /// 줄기 전 사본의 시각.
  final DateTime at;
}

enum VaultWrite { ok, same, notReady, failed }

/// 기기 안 금고: 저장이 성공할 때마다(묶어서) 앱 전용 폴더에 사본을 남기고, 다음 실행 때 데이터가
/// 이상하게 줄었으면 되살릴 후보를 보여 준다. **사람 확인 없이 덮어쓰지 않는다.**
///
/// 독서공방 금고(vaultBackupNow·vaultCheckpoint·vaultRestoreCheck·vaultPickCandidate)를 옮겼다:
/// - 세대: g0 ← g1, 날이 바뀌면 g0 → d1. 사본 안에 순번·시각을 함께 적는다(색인 파일 없음 — 내용이 원본).
/// - 줄어듦 판정: 30% 넘게 + 5건 이상, 또는 있던 기록이 0 / 설정이 통째로 0([isDrop]).
/// - 줄었으면 그 전 사본을 guard 칸에 고정하고 사람에게 묻는다. guard는 자동으로 고르지 않는다.
/// - 사용자가 일부러 지운 것(기록 지우기·계정 전환·계정 삭제)은 [BackupRegistry.intentDropKey] 표식으로 가른다.
/// - 실행 직후 [launchCheck]가 끝나기 전에는 쓰지 않는다(새 설치에 돌아온 금고를 빈 상태로 밀어내지 않게).
class BackupVault {
  BackupVault({
    required this.files,
    required this.prefs,
    DateTime Function()? now,
    this.appVersion = '',
  }) : _now = now ?? DateTime.now;

  final VaultFiles files;
  final SharedPreferences prefs;
  final DateTime Function() _now;
  String appVersion;

  static const String guardDismissedKey =
      '${BackupRegistry.internalPrefix}vault.guard_dismissed_at';

  static const List<String> slots = ['g0', 'g1', 'd1', 'guard', 'pre0', 'pre1'];

  bool _ready = false;
  bool get ready => _ready;

  RestoreOffer? _offer;

  /// 지금 물어볼 되살리기 제안(없으면 null).
  RestoreOffer? get offer => _offer;

  String? _lastHash;
  int _seq = 0;
  DateTime? _g0SavedAt;
  int _g0Records = 0;
  int _g0Settings = 0;

  /// 마지막 쓰기 실패 사유(성공하면 비운다) — 설정 화면이 보여 준다.
  String? lastError;
  DateTime? lastWriteAt;

  static bool isDrop(int before, int now) {
    if (before <= 0 || now < 0) return false;
    if (now == 0) return true;
    final lost = before - now;
    return lost >= 5 && lost * 10 > before * 3;
  }

  /// 사본 하나를 읽는다. 없거나 깨졌으면 null(깨진 것은 기록을 남긴다).
  Future<VaultSnapshot?> readSlot(String slot) async {
    String? text;
    try {
      text = await files.read(slot);
    } catch (e) {
      debugPrint('vault: read $slot failed (${e.runtimeType})');
      return null;
    }
    if (text == null) return null;
    return parse(slot, text);
  }

  static VaultSnapshot? parse(String slot, String text) {
    final r = BackupCodec.decode(text);
    final doc = r.document;
    if (doc == null) {
      debugPrint('vault: $slot unreadable (${r.error?.name})');
      return null;
    }
    var seq = 0;
    var reason = '';
    var savedAt = doc.createdAt;
    try {
      final m = jsonDecode(text);
      final v = m is Map ? m['vault'] : null;
      if (v is Map) {
        if (v['seq'] is int) seq = v['seq'] as int;
        if (v['reason'] is String) reason = v['reason'] as String;
      }
    } catch (_) {
      // 위에서 이미 풀렸으니 여기 올 일은 없다.
    }
    if (savedAt.millisecondsSinceEpoch == 0) savedAt = DateTime.now();
    return VaultSnapshot(
      slot: slot,
      document: doc,
      savedAt: savedAt,
      seq: seq,
      reason: reason,
    );
  }

  String _encode(
    BackupDocument doc, {
    required int seq,
    required String reason,
  }) {
    final j = doc.toJson();
    j['vault'] = {'seq': seq, 'reason': reason};
    return jsonEncode(j);
  }

  BackupDocument _collect() => BackupCollector.collect(
    prefs,
    now: _now(),
    appVersion: appVersion,
    device: const {'platform': 'android', 'source': 'vault'},
  );

  int? _intentDropAt() => prefs.getInt(BackupRegistry.intentDropKey);

  /// 실행할 때 한 번: 지금 저장된 것을 마지막 사본과 견준다. 줄었으면 그 사본을 guard로 고정하고
  /// [offer]를 세운다. 끝나면 쓰기가 열린다.
  Future<RestoreOffer?> launchCheck() async {
    try {
      VaultSnapshot? last;
      for (final s in const ['g0', 'g1', 'd1']) {
        last = await readSlot(s);
        if (last != null) break;
      }
      if (last != null) {
        _seq = last.seq;
        _g0SavedAt = last.savedAt;
        _g0Records = last.records;
        _g0Settings = last.settings;
        _lastHash = null;
      }
      final nowRecords = BackupCollector.readRecords(prefs).length;
      final nowSettings = BackupCollector.settingsCount(prefs);
      final guard = await readSlot('guard');
      final dismissedAt = prefs.getInt(guardDismissedKey);
      final guardOpen =
          guard != null &&
          (dismissedAt == null ||
              dismissedAt < guard.savedAt.millisecondsSinceEpoch);

      RestoreOffer? offer;
      if (last != null) {
        offer = _dropBetween(last, nowRecords, nowSettings);
        if (offer != null) await _pinGuard(last, guard);
      }
      // 이미 고정된 guard가 있고 아직 그만큼 되돌아오지 않았으면 계속 묻는다.
      if (offer == null && guardOpen) {
        final again = _dropBetween(
          guard,
          nowRecords,
          nowSettings,
          ignoreIntent: true,
        );
        if (again != null) offer = again;
      }
      _offer = offer;
      return offer;
    } catch (e) {
      lastError = 'check:${e.runtimeType}';
      debugPrint('vault: launch check failed (${e.runtimeType})');
      return null;
    } finally {
      _ready = true;
    }
  }

  RestoreOffer? _dropBetween(
    VaultSnapshot before,
    int nowRecords,
    int nowSettings, {
    bool ignoreIntent = false,
  }) {
    final intent = _intentDropAt();
    final intentional =
        !ignoreIntent &&
        intent != null &&
        intent >= before.savedAt.millisecondsSinceEpoch;
    if (intentional) return null;
    // 사람이 이미 「이대로 둘게요」·되살리기로 답한 줄어듦이면 다시 묻지 않는다.
    final ack = prefs.getInt(guardDismissedKey);
    if (!ignoreIntent &&
        ack != null &&
        ack >= before.savedAt.millisecondsSinceEpoch) {
      return null;
    }
    String? why;
    if (nowRecords == 0 && nowSettings == 0 && !before.isEmpty) {
      why = 'empty';
    } else if (isDrop(before.records, nowRecords)) {
      why = 'records';
    } else if (before.settings >= 3 && nowSettings == 0) {
      why = 'prefs';
    }
    if (why == null) return null;
    return RestoreOffer(
      reason: why,
      beforeRecords: before.records,
      nowRecords: nowRecords,
      beforeSettings: before.settings,
      nowSettings: nowSettings,
      at: before.savedAt,
    );
  }

  /// 줄기 전 사본을 guard 칸에 고정한다(이미 더 많은 기록을 가진 guard가 있으면 그대로).
  Future<void> _pinGuard(VaultSnapshot before, VaultSnapshot? guard) async {
    if (guard != null && guard.records >= before.records) {
      final dismissedAt = prefs.getInt(guardDismissedKey);
      if (dismissedAt == null ||
          dismissedAt < guard.savedAt.millisecondsSinceEpoch) {
        return;
      }
    }
    try {
      await files.write(
        'guard',
        _encode(before.document, seq: before.seq, reason: 'guard'),
      );
      await prefs.remove(guardDismissedKey);
    } catch (e) {
      lastError = 'guard:${e.runtimeType}';
      debugPrint('vault: guard write failed (${e.runtimeType})');
    }
  }

  /// 금고 쓰기를 한 줄로 세운다(묶음 쓰기·떠날 때 쓰기·안전 사본이 겹쳐 세대가 엇갈리지 않게).
  Future<void> _chain = Future<void>.value();

  Future<T> _serial<T>(Future<T> Function() work) {
    final run = _chain.then((_) => work());
    _chain = run.then((_) {}, onError: (Object _) {});
    return run;
  }

  /// 저장 성공 뒤 사본을 남긴다(호출부가 묶어서 부른다). 바뀐 게 없으면 쓰지 않는다.
  Future<VaultWrite> checkpoint() => _serial(_checkpoint);

  Future<VaultWrite> _checkpoint() async {
    if (!_ready) return VaultWrite.notReady;
    final doc = _collect();
    final hash = doc.dataHash;
    if (hash == _lastHash) return VaultWrite.same;
    try {
      final now = _now();
      VaultSnapshot? g0;
      if (_g0SavedAt != null) g0 = await readSlot('g0');
      if (g0 != null) {
        final intent = _intentDropAt();
        final ack = prefs.getInt(guardDismissedKey);
        final intentional =
            (intent != null && intent >= g0.savedAt.millisecondsSinceEpoch) ||
            (ack != null && ack >= g0.savedAt.millisecondsSinceEpoch);
        final dropped =
            isDrop(g0.records, doc.records.length) ||
            (g0.settings >= 3 && doc.prefs.isEmpty);
        if (dropped && !intentional) {
          // 실행 중에 기록이 크게 줄었다(일부러 지운 표식 없음) — 줄기 전 사본을 먼저 지킨다.
          await _pinGuard(g0, await readSlot('guard'));
          _offer ??= _dropBetween(g0, doc.records.length, doc.prefs.length);
        }
        if (BackupFormat.dayKey(g0.savedAt) != BackupFormat.dayKey(now)) {
          await files.write(
            'd1',
            _encode(g0.document, seq: g0.seq, reason: 'day'),
          );
        }
        await files.write(
          'g1',
          _encode(g0.document, seq: g0.seq, reason: g0.reason),
        );
      }
      _seq++;
      await files.write('g0', _encode(doc, seq: _seq, reason: 'save'));
      _lastHash = hash;
      _g0SavedAt = doc.createdAt;
      _g0Records = doc.records.length;
      _g0Settings = doc.prefs.length;
      lastWriteAt = now;
      lastError = null;
      // 일부러 지운 표식은 그 상태가 사본에 내려앉은 뒤 지운다.
      if (_intentDropAt() != null) {
        await prefs.remove(BackupRegistry.intentDropKey);
      }
      return VaultWrite.ok;
    } catch (e) {
      lastError = 'write:${e.runtimeType}';
      debugPrint('vault: checkpoint failed (${e.runtimeType})');
      return VaultWrite.failed;
    }
  }

  /// 가져오기·되살리기 **직전** 상태를 pre 칸(2개 고리)에 남긴다. 실패하면 false — 호출부는 진행하지 않는다
  /// (독서공방 B2: 되돌릴 수 있다고 약속하는 동작은 사본 쓰기 성공을 확인한 뒤에만).
  Future<bool> safetySnapshot(String reason) =>
      _serial(() => _safetySnapshot(reason));

  Future<bool> _safetySnapshot(String reason) async {
    try {
      final doc = _collect();
      final pre0 = await files.read('pre0');
      if (pre0 != null) await files.write('pre1', pre0);
      await files.write('pre0', _encode(doc, seq: _seq, reason: reason));
      final back = await readSlot('pre0');
      if (back == null || back.document.dataHash != doc.dataHash) {
        lastError = 'pre:verify';
        return false;
      }
      return true;
    } catch (e) {
      lastError = 'pre:${e.runtimeType}';
      debugPrint('vault: safety snapshot failed (${e.runtimeType})');
      return false;
    }
  }

  /// 되살릴 수 있는 사본들(최신순, 같은 내용은 하나로, 빈 사본 제외).
  Future<List<VaultSnapshot>> candidates() async {
    final out = <VaultSnapshot>[];
    final seen = <String>{};
    for (final s in slots) {
      final snap = await readSlot(s);
      if (snap == null || snap.isEmpty) continue;
      if (!seen.add(snap.document.dataHash)) continue;
      out.add(snap);
    }
    out.sort((a, b) => b.savedAt.compareTo(a.savedAt));
    return out;
  }

  /// 추천 후보: 가장 많은 기록의 70% 이상을 가진 것 중 가장 최근 것(줄어든 사본을 고르지 않게).
  /// guard는 다른 후보가 없을 때만. 화면은 늘 사람에게 고르게 한다 — 이건 「추천」 표시일 뿐이다.
  static VaultSnapshot? pickCandidate(List<VaultSnapshot> list) {
    if (list.isEmpty) return null;
    final maxRecords = list
        .map((s) => s.records)
        .fold<int>(0, (a, b) => a > b ? a : b);
    final ok =
        list
            .where((s) => s.slot != 'guard' && s.records * 10 >= maxRecords * 7)
            .toList()
          ..sort((a, b) => b.savedAt.compareTo(a.savedAt));
    if (ok.isNotEmpty) return ok.first;
    return list.firstWhere((s) => s.slot == 'guard', orElse: () => list.first);
  }

  /// 「이대로 둘게요」: 제안을 닫는다. guard 파일은 지우지 않는다(마음이 바뀌면 목록에서 고를 수 있다).
  Future<void> dismissOffer() async {
    _offer = null;
    try {
      await prefs.setInt(guardDismissedKey, _now().millisecondsSinceEpoch);
    } catch (e) {
      debugPrint('vault: dismiss failed (${e.runtimeType})');
    }
    // 지금 상태를 새 기준으로 사본에 남긴다(다음 실행에 같은 줄어듦을 또 묻지 않게).
    _lastHash = null;
    await checkpoint();
  }

  /// 되살린 뒤: 제안을 닫고 지금 상태를 바로 사본으로 남긴다.
  Future<void> afterRestore() async {
    _offer = null;
    try {
      await prefs.setInt(guardDismissedKey, _now().millisecondsSinceEpoch);
    } catch (e) {
      debugPrint('vault: after restore mark failed (${e.runtimeType})');
    }
    _lastHash = null;
    await checkpoint();
  }

  /// 계정을 지울 때: 이 기기의 사본을 모두 지운다(개인 기록이 남지 않게).
  Future<void> clearAll() async {
    for (final s in slots) {
      try {
        await files.delete(s);
      } catch (e) {
        debugPrint('vault: delete $s failed (${e.runtimeType})');
      }
    }
    _offer = null;
    _lastHash = null;
    _g0SavedAt = null;
    _g0Records = 0;
    _g0Settings = 0;
  }

  /// 마지막 사본의 요약(설정 화면 상태 줄).
  ({DateTime? at, int records, int settings}) get summary =>
      (at: _g0SavedAt, records: _g0Records, settings: _g0Settings);
}
