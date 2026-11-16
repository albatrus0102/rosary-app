import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../app/settings.dart';
import '../diag/diag_recorder.dart';
import '../stats/prayer_stats_store.dart';
import '../ui/widgets/stations_series_picker.dart';
import 'auto_backup.dart';
import 'backup_data.dart';
import 'backup_format.dart';
import 'backup_nudge.dart';
import 'backup_platform.dart';
import 'backup_vault.dart';

/// 가져오기·되살리기의 결과.
enum ImportOutcome {
  /// 바꿨다.
  applied,

  /// 안전 사본(되돌릴 사본)을 못 만들어 아무것도 바꾸지 않았다.
  noSafetyCopy,

  /// 일부 설정을 저장하지 못했다(기록 합치기는 했다).
  partial,
}

/// 파일을 고르고 읽은 결과: 계획(미리보기) 또는 사람에게 보일 오류 문구.
class ImportPick {
  const ImportPick.plan(ImportPlan this.plan) : error = null, cancelled = false;
  const ImportPick.error(String this.error) : plan = null, cancelled = false;
  const ImportPick.cancelled() : plan = null, error = null, cancelled = true;

  final ImportPlan? plan;
  final String? error;
  final bool cancelled;
}

/// 백업과 복원의 모든 일을 한 곳에서: 내보내기·가져오기(미리보기)·자동 백업·기기 안 금고·안내.
///
/// - 금고: 설정·기록이 바뀌면 묶어서(마지막 변경 [debounce] 뒤, 최대 [maxWait]) 사본을 남긴다.
///   앱을 떠날 때는 바로. 실행 직후엔 [start]의 금고 확인이 끝나야 쓴다.
/// - 자동 백업: 열 때·돌아올 때·떠날 때 확인([AutoBackup.run]).
/// - 가져오기·되살리기는 **같은 문**([applyPlan])을 지난다: 안전 사본 → 설정 바꾸기 → 기록 합치기 → 다시 읽기.
class BackupService extends ChangeNotifier with WidgetsBindingObserver {
  BackupService({
    required this.prefs,
    required this.platform,
    required this.vault,
    this.stats,
    this.settings,
    this.appVersion = '',
    DateTime Function()? now,
    this.debounce = const Duration(seconds: 2),
    this.maxWait = const Duration(seconds: 10),
  }) : _now = now ?? DateTime.now {
    auto = AutoBackup(
      platform: platform,
      prefs: prefs,
      buildPayload: () => buildDocument(source: 'auto'),
      holdWrites: () => vault.offer != null,
      now: _now,
    )..addListener(notifyListeners);
  }

  final SharedPreferences prefs;
  final BackupPlatform platform;
  final BackupVault vault;
  final PrayerStatsStore? stats;
  final AppSettings? settings;

  /// 앱 판(PackageInfo를 읽은 뒤 채운다). 파일의 appVersion에 들어간다.
  String appVersion;
  final DateTime Function() _now;
  final Duration debounce;
  final Duration maxWait;
  late final AutoBackup auto;

  Timer? _timer;
  DateTime? _pendingSince;
  bool _started = false;
  bool _observing = false;

  DateTime get now => _now();

  /// 지금 저장된 것으로 만든 백업 한 벌(세 통로 공통).
  BackupDocument buildDocument({String source = 'export'}) =>
      BackupCollector.collect(
        prefs,
        now: _now(),
        appVersion: appVersion,
        device: {'platform': defaultTargetPlatform.name, 'source': source},
      );

  /// 실행 때 한 번: 금고 확인(줄어듦 감지) → 쓰기 열기 → 자동 백업 확인. 화면을 막지 않는다.
  Future<void> start({bool observeLifecycle = true}) async {
    if (_started) return;
    _started = true;
    await vault.launchCheck();
    settings?.addListener(_onDataChanged);
    stats?.addListener(_onDataChanged);
    if (observeLifecycle) {
      WidgetsBinding.instance.addObserver(this);
      _observing = true;
    }
    notifyListeners();
    // 금고가 아직 없던 사용자도 첫 사본을 바로 갖게(같은 내용이면 쓰지 않는다).
    if (vault.offer == null) unawaited(flushVault());
    unawaited(auto.run(BackupTrigger.launch));
  }

  @override
  void dispose() {
    _timer?.cancel();
    settings?.removeListener(_onDataChanged);
    stats?.removeListener(_onDataChanged);
    if (_observing) WidgetsBinding.instance.removeObserver(this);
    auto.removeListener(notifyListeners);
    auto.dispose();
    super.dispose();
  }

  void _onDataChanged() {
    final t = _now();
    _pendingSince ??= t;
    final waited = t.difference(_pendingSince!);
    var wait = debounce;
    if (waited + wait > maxWait) wait = maxWait - waited;
    if (wait.isNegative) wait = Duration.zero;
    _timer?.cancel();
    _timer = Timer(wait, () => unawaited(flushVault()));
  }

  /// 묶어 둔 금고 쓰기를 지금 한다.
  Future<VaultWrite> flushVault() async {
    _timer?.cancel();
    _timer = null;
    _pendingSince = null;
    final r = await vault.checkpoint();
    if (r == VaultWrite.ok || r == VaultWrite.failed) notifyListeners();
    return r;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      unawaited(onPause());
    } else if (state == AppLifecycleState.resumed) {
      unawaited(auto.run(BackupTrigger.resume));
    }
  }

  /// 앱을 떠날 때: 금고를 바로 쓰고 자동 백업을 확인한다.
  Future<void> onPause() async {
    await flushVault();
    await auto.run(BackupTrigger.pause);
  }

  // ---- 상태 -----------------------------------------------------------------

  DateTime? _time(String key) {
    final ms = prefs.getInt(key);
    return ms == null ? null : DateTime.fromMillisecondsSinceEpoch(ms);
  }

  /// 마지막 백업(파일 저장·자동 백업 어느 쪽이든).
  DateTime? get lastBackupAt => _time(BackupKeys.lastBackupAt);

  /// 마지막으로 파일로 직접 저장한 때.
  DateTime? get lastFileAt => _time(BackupKeys.lastFileAt);

  int get recordCount =>
      stats?.records.length ?? BackupCollector.readRecords(prefs).length;

  /// 지금 띄울 안내(없으면 null).
  BackupNudgeKind? get nudge => BackupNudge.pick(
    BackupNudgeInput(
      now: _now(),
      records: recordCount,
      auto: auto.status,
      lastBackupAt: lastBackupAt,
      lastFileAt: lastFileAt,
      dismissedAt: _time(BackupKeys.nudgeDismissedAt),
      monthlyDismissedAt: _time(BackupKeys.monthlyDismissedAt),
    ),
  );

  Future<void> dismissNudge(BackupNudgeKind kind) async {
    final key = kind == BackupNudgeKind.monthlyFile
        ? BackupKeys.monthlyDismissedAt
        : BackupKeys.nudgeDismissedAt;
    try {
      await prefs.setInt(key, _now().millisecondsSinceEpoch);
    } catch (e) {
      debugPrint('backup nudge dismiss failed (${e.runtimeType})');
    }
    notifyListeners();
  }

  // ---- 내보내기 ---------------------------------------------------------------

  /// 사용자가 고른 자리(다운로드 등)에 파일로 저장한다. 실제로 저장됐을 때만 「마지막 백업」을 고친다.
  Future<PlatformResult<void>> saveToFile() async {
    final doc = buildDocument();
    final r = await platform.saveDocument(
      BackupFormat.exportFileName(_now()),
      doc.encode(),
    );
    Diag.data('backup_save', {'code': r.code, 'records': doc.records.length});
    if (r.ok) {
      final ms = _now().millisecondsSinceEpoch;
      await prefs.setInt(BackupKeys.lastBackupAt, ms);
      await prefs.setInt(BackupKeys.lastFileAt, ms);
      notifyListeners();
    } else if (!r.cancelled) {
      debugPrint('backup export failed: ${r.code}');
    }
    return r;
  }

  /// 공유 시트로 보낸다(어디에 두었는지 알 수 없어 「마지막 백업」으로 세지 않는다).
  Future<PlatformResult<void>> share() async {
    final doc = buildDocument();
    final r = await platform.shareFile(
      BackupFormat.exportFileName(_now()),
      doc.encode(),
    );
    Diag.data('backup_share', {'code': r.code, 'records': doc.records.length});
    if (!r.ok && !r.cancelled) debugPrint('backup share failed: ${r.code}');
    return r;
  }

  // ---- 가져오기·되살리기 ------------------------------------------------------

  ImportPlan planFor(BackupDocument doc) => BackupImporter.plan(
    doc,
    prefs,
    stats?.records.toList() ?? BackupCollector.readRecords(prefs),
    maxRecords: PrayerStatsStore.maxRecords,
  );

  /// 파일 내용을 읽어 계획을 만든다(아무것도 바꾸지 않는다).
  ImportPick planFromText(String text) {
    final r = BackupCodec.decode(text);
    if (!r.ok) {
      Diag.data('import_fail', {'code': r.error!.name, 'chars': text.length});
      return ImportPick.error(r.error!.message);
    }
    return ImportPick.plan(planFor(r.document!));
  }

  /// 파일을 고르고 읽어 계획을 만든다.
  Future<ImportPick> pickImportFile() async {
    final r = await platform.openDocument();
    if (r.cancelled) return const ImportPick.cancelled();
    if (!r.ok) {
      Diag.data('import_fail', {'code': r.code});
      return ImportPick.error(
        r.code == 'too_big'
            ? BackupReadError.tooLarge.message
            : '파일을 열지 못했어요. 다시 골라 주세요.',
      );
    }
    return planFromText(r.value!);
  }

  /// 계획을 적용한다(가져오기·되살리기 공통). **먼저 안전 사본**을 남기고, 못 남기면 아무것도 바꾸지 않는다.
  /// 기록은 합치고(지우지 않는다), 파일에 있는 설정은 그 값으로 바꾼다.
  Future<ImportOutcome> applyPlan(
    ImportPlan plan, {
    String reason = 'import',
  }) async {
    // 묶어 둔 금고 쓰기를 먼저 내려 「바로 전 상태」가 사본에 있게 한다.
    await flushVault();
    if (!await vault.safetySnapshot('pre_$reason')) {
      Diag.data('import_apply', {'reason': reason, 'out': 'no_safety_copy'});
      notifyListeners();
      return ImportOutcome.noSafetyCopy;
    }
    final prefsOk = await BackupImporter.applyPrefs(plan, prefs);
    final store = stats;
    if (store != null) {
      await store.mergeRecords(plan.newRecords);
    } else {
      await _mergeRecordsInPrefs(plan);
    }
    settings?.reloadFromPrefs();
    unawaited(StationsSeriesChoice.reload());
    await vault.afterRestore();
    notifyListeners();
    Diag.data('import_apply', {
      'reason': reason,
      'out': prefsOk ? 'applied' : 'partial',
      'records': plan.newRecords.length,
      'prefs': plan.changedPrefs.length,
    });
    return prefsOk ? ImportOutcome.applied : ImportOutcome.partial;
  }

  Future<void> _mergeRecordsInPrefs(ImportPlan plan) async {
    final all = [...BackupCollector.readRecords(prefs), ...plan.newRecords]
      ..sort((a, b) => b.at.compareTo(a.at));
    final kept = all.take(PrayerStatsStore.maxRecords);
    await prefs.setString(
      PrayerStatsStore.prefsKey,
      BackupDocument.encodeRecords(kept),
    );
  }

  /// 금고 후보들(+ 자동 백업 폴더의 가장 최근 파일).
  Future<List<VaultSnapshot>> restoreCandidates({
    bool includeFolder = true,
  }) async {
    final list = await vault.candidates();
    if (includeFolder && auto.status.on) {
      try {
        final latest = await auto.readLatest();
        if (latest != null && latest.$2.records.isNotEmpty) {
          list.add(
            VaultSnapshot(
              slot: 'folder',
              document: latest.$2,
              savedAt: latest.$2.createdAt,
              seq: 0,
              reason: latest.$1,
            ),
          );
        }
      } catch (e) {
        debugPrint('backup: folder candidate failed (${e.runtimeType})');
        Diag.data('restore_folder_fail', {'err': e.runtimeType});
      }
    }
    return list;
  }

  Future<void> dismissRestoreOffer() async {
    Diag.crumb('restore_offer_dismiss');
    await vault.dismissOffer();
    notifyListeners();
  }

  // ---- 자동 백업 ---------------------------------------------------------------

  Future<EnableResult> enableAuto({bool repick = false}) async {
    final r = await auto.enable(repick: repick);
    Diag.data('autobackup_enable', {'repick': repick, 'out': r.name});
    notifyListeners();
    return r;
  }

  Future<void> disableAuto() async {
    Diag.crumb('autobackup_disable');
    await auto.disable();
    notifyListeners();
  }

  Future<AutoOutcome> backupNow() async {
    final r = await auto.run(BackupTrigger.force);
    Diag.data('autobackup_now', {'out': r.name});
    return r;
  }

  /// 폴더를 다시 고른 뒤 이 기기가 비어 있으면(새 기기·재설치) 그 폴더의 가장 최근 백업을 계획으로 돌려준다.
  Future<ImportPlan?> folderRestorePlanIfEmpty() async {
    if (recordCount > 0 || BackupCollector.settingsCount(prefs) > 3) {
      return null;
    }
    final latest = await auto.readLatest();
    if (latest == null || latest.$2.records.isEmpty) return null;
    return planFor(latest.$2);
  }

  /// 계정을 지울 때: 기기 안 사본도 지운다.
  Future<void> onAccountDeleted() async {
    await vault.clearAll();
    notifyListeners();
  }
}
