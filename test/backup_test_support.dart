import 'package:rosary_app/backup/backup_platform.dart';
import 'package:rosary_app/backup/backup_service.dart';
import 'package:rosary_app/backup/backup_vault.dart';
import 'package:rosary_app/domain/prayer_data.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 가짜 시계: 시험이 시각을 직접 옮긴다.
class FakeClock {
  FakeClock(this.t);
  DateTime t;
  DateTime call() => t;
  void advance(Duration d) => t = t.add(d);
}

/// 가짜 SAF 폴더 + 공유·파일 고르기. 네이티브 계약(이름 규칙·사유 코드)을 그대로 흉내 낸다.
class FakeBackupPlatform implements BackupPlatform {
  FakeBackupPlatform({this.supported = true});

  @override
  bool supported;

  /// 폴더 안의 파일(이름 → 내용). 사용자가 둔 다른 파일도 넣을 수 있다.
  final Map<String, String> folder = {};

  /// 고른 폴더의 상태 코드(ok·never·no_perm:p0·gone …).
  String folderCode = 'never';
  String folderName = '로사리움 백업';

  /// pickFolder 가 돌려줄 결과(ok·cancelled …).
  String pickResult = 'ok';
  int pickCalls = 0;

  /// 다음 쓰기 실패 코드(null이면 성공).
  String? failWrite;
  int writes = 0;
  bool released = false;

  /// saveDocument 결과·받은 내용.
  String saveResult = 'ok';
  final List<(String, String)> saved = [];
  final List<(String, String)> shared = [];

  /// openDocument 가 돌려줄 내용(null이면 취소).
  String? openText;
  String openCode = 'ok';

  bool _ours(String n) =>
      RegExp(r'^rosarium-backup-\d{8}-\d{6}(\.part)?\.json$').hasMatch(n);

  @override
  Future<PlatformResult<FolderInfo>> pickFolder() async {
    pickCalls++;
    if (pickResult != 'ok') return PlatformResult.fail(pickResult);
    folderCode = 'ok';
    return PlatformResult.ok(
      FolderInfo(FolderState.ok, name: folderName, code: 'ok'),
    );
  }

  @override
  Future<FolderInfo> folderState() async => FolderInfo(
    FolderState.parse(folderCode),
    name: folderCode == 'ok' ? folderName : null,
    code: folderCode,
  );

  @override
  Future<PlatformResult<void>> writeFolderFile(
    String name,
    String content,
  ) async {
    if (folderCode != 'ok') return PlatformResult.fail('no_folder:$folderCode');
    final f = failWrite;
    if (f != null) return PlatformResult.fail(f);
    writes++;
    folder[name] = content;
    return const PlatformResult.ok(null);
  }

  @override
  Future<PlatformResult<List<FolderFile>>> listFolderFiles() async {
    if (folderCode != 'ok') return const PlatformResult.fail('no_folder');
    return PlatformResult.ok([
      for (final e in folder.entries)
        if (_ours(e.key)) FolderFile(e.key, e.value.length),
    ]);
  }

  @override
  Future<PlatformResult<String>> readFolderFile(String name) async {
    final t = folder[name];
    return t == null
        ? const PlatformResult.fail('not_found')
        : PlatformResult.ok(t);
  }

  @override
  Future<bool> deleteFolderFile(String name) async {
    if (!_ours(name)) return false; // 네이티브와 같은 가드
    return folder.remove(name) != null;
  }

  @override
  Future<bool> releaseFolder() async {
    released = true;
    folderCode = 'never';
    return true;
  }

  @override
  Future<PlatformResult<void>> saveDocument(
    String name,
    String content, {
    String mime = jsonMime,
  }) async {
    if (saveResult != 'ok') return PlatformResult.fail(saveResult);
    saved.add((name, content));
    mimes[name] = mime;
    return const PlatformResult.ok(null);
  }

  @override
  Future<PlatformResult<void>> shareFile(
    String name,
    String content, {
    String mime = jsonMime,
  }) async {
    shared.add((name, content));
    mimes[name] = mime;
    return const PlatformResult.ok(null);
  }

  /// shareFiles 로 한 번에 보낸 묶음들.
  final List<List<ShareDoc>> sharedBatches = [];

  /// 저장·공유한 파일의 종류(이름 → mime).
  final Map<String, String> mimes = {};

  @override
  Future<PlatformResult<void>> shareFiles(List<ShareDoc> files) async {
    sharedBatches.add(List.of(files));
    for (final f in files) {
      shared.add((f.name, f.content));
      mimes[f.name] = f.mime;
    }
    return const PlatformResult.ok(null);
  }

  @override
  Future<PlatformResult<String>> openDocument() async {
    final t = openText;
    if (t == null) return const PlatformResult.fail('cancelled');
    if (openCode != 'ok') return PlatformResult.fail(openCode);
    return PlatformResult.ok(t);
  }
}

PrayerRecord rec(
  DateTime at, {
  String? id,
  MysterySet set = MysterySet.joyful,
  int decades = 5,
  bool completed = true,
  String source = PrayerRecord.sourceApp,
}) => PrayerRecord(
  id: id,
  at: at,
  set: set,
  decades: decades,
  hailMarys: decades * 10,
  completed: completed,
  seconds: 600,
  source: source,
);

/// 테스트용 묶음: 가짜 저장소·가짜 플랫폼·메모리 금고.
class BackupRig {
  BackupRig._(this.prefs, this.stats, this.platform, this.files, this.clock)
    : vault = BackupVault(
        files: files,
        prefs: prefs,
        now: clock.call,
        appVersion: '0.1.0+1',
      ) {
    service = BackupService(
      prefs: prefs,
      platform: platform,
      vault: vault,
      stats: stats,
      appVersion: '0.1.0+1',
      now: clock.call,
    );
  }

  static Future<BackupRig> create({
    Map<String, Object> values = const {},
    DateTime? now,
    FakeBackupPlatform? platform,
    MemoryVaultFiles? files,
  }) async {
    SharedPreferences.setMockInitialValues(values);
    final prefs = await SharedPreferences.getInstance();
    final stats = await PrayerStatsStore.load(prefs: prefs);
    return BackupRig._(
      prefs,
      stats,
      platform ?? FakeBackupPlatform(),
      files ?? MemoryVaultFiles(),
      FakeClock(now ?? DateTime(2026, 11, 16, 9)),
    );
  }

  final SharedPreferences prefs;
  final PrayerStatsStore stats;
  final FakeBackupPlatform platform;
  final MemoryVaultFiles files;
  final FakeClock clock;
  final BackupVault vault;
  late final BackupService service;
}
