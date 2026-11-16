import 'auto_backup.dart';

/// 백업 안내 카드의 종류. 카드는 늘 닫을 수 있고 아무것도 막지 않는다.
enum BackupNudgeKind {
  /// 켜 둔 자동 백업의 폴더를 쓸 수 없다(권한 회수·폴더 삭제·재설치) — 다시 고르기.
  folderLost,

  /// 기도를 몇 번 했는데 아직 한 번도 백업하지 않았다.
  firstBackup,

  /// 자동 백업이 켜져 있는데 실패하고 있다.
  autoFailing,

  /// 마지막 백업이 오래됐고 자동 백업이 꺼져 있다.
  stale,

  /// 한 달에 한 번: 파일로도 직접 남겨 두기(자동 백업이 켜져 있어도).
  monthlyFile,
}

/// 안내를 정하는 값들(시험이 가짜 시계로 고정한다).
class BackupNudgeInput {
  const BackupNudgeInput({
    required this.now,
    required this.records,
    required this.auto,
    this.lastBackupAt,
    this.lastFileAt,
    this.dismissedAt,
    this.monthlyDismissedAt,
  });

  final DateTime now;
  final int records;
  final AutoBackupStatus auto;
  final DateTime? lastBackupAt;
  final DateTime? lastFileAt;
  final DateTime? dismissedAt;
  final DateTime? monthlyDismissedAt;
}

abstract final class BackupNudge {
  /// 몇 번 기도한 뒤부터 첫 백업을 권하나(처음 쓰는 사람을 귀찮게 하지 않게).
  static const int firstAfterRecords = 3;
  static const Duration staleAfter = Duration(days: 14);
  static const Duration snooze = Duration(days: 7);
  static const Duration folderSnooze = Duration(days: 1);
  static const Duration autoFailingAfter = Duration(days: 3);
  static const int monthlyAfterRecords = 10;
  static const Duration monthlyEvery = Duration(days: 30);

  /// 지금 띄울 안내(없으면 null). 시계가 되돌려졌던 미래 시각은 믿지 않는다([backupClockAhead]).
  static BackupNudgeKind? pick(BackupNudgeInput i) {
    final now = i.now;
    bool trusted(DateTime? t) => t != null && !backupClockAhead(t, now);
    bool within(DateTime? t, Duration d) =>
        trusted(t) && now.difference(t!) < d;

    // 켜 둔 자동 백업이 멈춘 것은 기록 수와 상관없이 알린다.
    if (i.auto.needsFolder) {
      return within(i.dismissedAt, folderSnooze)
          ? null
          : BackupNudgeKind.folderLost;
    }
    if (i.records < firstAfterRecords) return null;
    final snoozed = within(i.dismissedAt, snooze);
    final last = i.lastBackupAt;
    if (last == null) return snoozed ? null : BackupNudgeKind.firstBackup;
    if (i.auto.on &&
        i.auto.failN >= 1 &&
        !within(i.auto.lastOkAt, autoFailingAfter)) {
      return snoozed ? null : BackupNudgeKind.autoFailing;
    }
    if (!i.auto.on && !within(last, staleAfter)) {
      return snoozed ? null : BackupNudgeKind.stale;
    }
    if (i.records >= monthlyAfterRecords &&
        !within(i.lastFileAt, monthlyEvery) &&
        !within(i.monthlyDismissedAt, monthlyEvery)) {
      return BackupNudgeKind.monthlyFile;
    }
    return null;
  }
}
