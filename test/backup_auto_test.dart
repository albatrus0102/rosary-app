import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/backup/auto_backup.dart';
import 'package:rosary_app/backup/backup_format.dart';
import 'package:rosary_app/backup/backup_nudge.dart';
import 'package:rosary_app/backup/backup_platform.dart';

import 'backup_test_support.dart';

void main() {
  final t0 = DateTime(2026, 11, 16, 21, 5, 9);

  group('파일 이름 규칙(지우는 대상은 우리 형식만)', () {
    test('이름 짓기·알아보기', () {
      final n = AutoBackupFiles.nameFor(t0);
      expect(n, 'rosarium-backup-20261116-210509.json');
      expect(AutoBackupFiles.isAutoName(n), isTrue);
      for (final other in [
        'rosarium-export-20261116.json', // 수동 내보내기
        'rosarium-backup-20261116.json', // 시각 없음
        'rosarium-backup-20260231-120000.json', // 없는 날짜
        'rosarium-backup-20261116-250000.json', // 25시
        'rosarium-backup-20261116-210509 (1).json', // 공급자가 바꾼 이름
        'rosarium-backup-20261116-210509-보관본.json',
        '메모.txt',
        'rosarium-backup-20261116-210509.part.json', // 임시 파일(별도 규칙)
      ]) {
        expect(AutoBackupFiles.isAutoName(other), isFalse, reason: other);
      }
      expect(
        AutoBackupFiles.tempTimeOf('rosarium-backup-20261116-210509.part.json'),
        isNotNull,
      );
    });

    test('하루 한 파일, 최근 7일 치만 남기고, 다른 파일은 절대 지우지 않는다', () {
      final names = <String>[
        for (var d = 0; d < 10; d++)
          AutoBackupFiles.nameFor(t0.subtract(Duration(days: d))),
        // 오늘 같은 날의 이른 파일 둘
        AutoBackupFiles.nameFor(DateTime(2026, 11, 16, 8)),
        AutoBackupFiles.nameFor(DateTime(2026, 11, 16, 12)),
        'rosarium-export-20261101.json',
        '메모.txt',
        'rosarium-backup-20261116-210509 (1).json',
      ];
      final del = AutoBackupFiles.toDelete(
        names,
        now: t0,
        protect: AutoBackupFiles.nameFor(t0),
      ).toSet();
      expect(del, {
        AutoBackupFiles.nameFor(DateTime(2026, 11, 16, 8)),
        AutoBackupFiles.nameFor(DateTime(2026, 11, 16, 12)),
        for (var d = 7; d < 10; d++)
          AutoBackupFiles.nameFor(t0.subtract(Duration(days: d))),
      });
      final kept = names.toSet().difference(del);
      expect(kept, contains('rosarium-export-20261101.json'));
      expect(kept, contains('메모.txt'));
      expect(kept, contains('rosarium-backup-20261116-210509 (1).json'));
    });

    test('미래 이름(시계가 앞서 있던 때)은 가장 오래된 것으로 치고, 방금 쓴 파일은 지우지 않는다', () {
      final future = [
        for (var d = 1; d <= 8; d++)
          AutoBackupFiles.nameFor(DateTime(2027, 1, d, 9)),
      ];
      final justWritten = AutoBackupFiles.nameFor(t0);
      final del = AutoBackupFiles.toDelete(
        [...future, justWritten],
        now: t0,
        protect: justWritten,
      );
      expect(del, isNot(contains(justWritten)));
      expect(del, hasLength(2)); // 9개 중 7개(방금 것 + 미래 6개)만 남는다
      expect(
        AutoBackupFiles.readOrder([...future, justWritten], t0).first,
        justWritten,
      );
    });

    test('한 시간 넘은 임시 파일만 지운다', () {
      final stale = 'rosarium-backup-20261116-190000.part.json';
      final fresh = 'rosarium-backup-20261116-210000.part.json';
      final del = AutoBackupFiles.toDelete([stale, fresh], now: t0);
      expect(del, [stale]);
    });
  });

  group('언제 쓰나(가짜 시계)', () {
    test('due: 처음·24시간 지나고 바뀜·떠날 때 바뀜·시계가 되돌려짐·강제', () {
      bool due(BackupTrigger t, Duration ago, {bool changed = true}) =>
          AutoBackup.due(
            trigger: t,
            now: t0,
            lastOk: t0.subtract(ago),
            changed: changed,
          );
      expect(
        AutoBackup.due(
          trigger: BackupTrigger.launch,
          now: t0,
          lastOk: null,
          changed: false,
        ),
        isTrue,
      );
      expect(due(BackupTrigger.launch, const Duration(hours: 25)), isTrue);
      expect(due(BackupTrigger.launch, const Duration(hours: 23)), isFalse);
      expect(
        due(BackupTrigger.launch, const Duration(days: 3), changed: false),
        isFalse,
      );
      expect(due(BackupTrigger.pause, const Duration(hours: 1)), isTrue);
      expect(
        due(BackupTrigger.pause, const Duration(hours: 1), changed: false),
        isFalse,
      );
      expect(due(BackupTrigger.resume, -const Duration(days: 3)), isTrue);
      expect(
        due(BackupTrigger.force, const Duration(minutes: 1), changed: false),
        isTrue,
      );
    });

    test('켜기: 폴더 고르기까지 한 흐름 — 고르면 켜지고 바로 첫 백업', () async {
      final rig = await BackupRig.create(now: t0);
      await rig.stats.add(rec(t0, id: 'a'));
      expect(await rig.service.enableAuto(), EnableResult.onAndBackedUp);
      expect(rig.platform.pickCalls, 1);
      expect(rig.service.auto.status.on, isTrue);
      expect(rig.platform.folder.keys, [AutoBackupFiles.nameFor(t0)]);
      expect(rig.service.lastBackupAt, t0);
      final doc = BackupCodec.decode(rig.platform.folder.values.single)
          .document!;
      expect(doc.records.single.id, 'a');
    });

    test('켜기: 폴더를 고르지 않으면 꺼진 채로 남는다', () async {
      final rig = await BackupRig.create(now: t0);
      rig.platform.pickResult = 'cancelled';
      expect(await rig.service.enableAuto(), EnableResult.cancelled);
      expect(rig.service.auto.status.wanted, isFalse);
      expect(rig.platform.writes, 0);
    });

    test('바뀐 게 없으면 쓰지 않고, 바뀌면 24시간 뒤에 새 날 파일을 쓴다', () async {
      final rig = await BackupRig.create(now: t0);
      await rig.service.enableAuto();
      final auto = rig.service.auto;
      rig.clock.advance(const Duration(hours: 30));
      expect(await auto.run(BackupTrigger.launch), AutoOutcome.unchanged);
      await rig.stats.add(rec(rig.clock.t, id: 'b'));
      rig.clock.advance(const Duration(hours: 1));
      expect(await auto.run(BackupTrigger.resume), AutoOutcome.written);
      expect(rig.platform.folder, hasLength(2));
      // 몇 시간 뒤 또 바뀌어도 열 때는 쓰지 않는다(24시간 안)
      await rig.stats.add(rec(rig.clock.t, id: 'c'));
      rig.clock.advance(const Duration(hours: 2));
      expect(await auto.run(BackupTrigger.launch), AutoOutcome.notDue);
    });

    test('떠날 때 바뀐 게 있으면 그날 파일을 새로 쓰고 하루 한 파일로 정리한다', () async {
      final rig = await BackupRig.create(now: DateTime(2026, 11, 16, 8));
      await rig.service.enableAuto();
      rig.clock.advance(const Duration(hours: 3));
      await rig.stats.add(rec(rig.clock.t, id: 'b'));
      expect(
        await rig.service.auto.run(BackupTrigger.pause),
        AutoOutcome.written,
      );
      expect(rig.platform.folder.keys, [
        AutoBackupFiles.nameFor(DateTime(2026, 11, 16, 11)),
      ]);
    });

    test('7일 넘게 매일 쓰면 최근 7개만 남는다', () async {
      final rig = await BackupRig.create(now: t0);
      rig.platform.folder['rosarium-export-20261001.json'] = '{}';
      rig.platform.folder['메모.txt'] = 'x';
      await rig.service.enableAuto();
      for (var d = 1; d <= 10; d++) {
        rig.clock.advance(const Duration(days: 1));
        await rig.stats.add(rec(rig.clock.t, id: 'd$d'));
        expect(
          await rig.service.auto.run(BackupTrigger.launch),
          AutoOutcome.written,
        );
      }
      final ours = rig.platform.folder.keys.where(AutoBackupFiles.isAutoName);
      expect(ours, hasLength(7));
      expect(rig.platform.folder, contains('rosarium-export-20261001.json'));
      expect(rig.platform.folder, contains('메모.txt'));
    });

    test('같은 때 두 번 불려도 한 번만 쓴다', () async {
      final rig = await BackupRig.create(now: t0);
      await rig.service.enableAuto();
      await rig.stats.add(rec(t0, id: 'z'));
      final a = rig.service.auto.run(BackupTrigger.force);
      final b = rig.service.auto.run(BackupTrigger.force);
      await Future.wait([a, b]);
      expect(rig.platform.writes, 2); // 켤 때 1 + 이번 1
    });
  });

  group('폴더를 잃었을 때(권한 회수·폴더 삭제·재설치)', () {
    test('권한이 사라지면 쓰지 않고 「폴더 필요」로 보이며 사유를 남긴다', () async {
      final rig = await BackupRig.create(now: t0);
      await rig.service.enableAuto();
      rig.platform.folderCode = 'no_perm:p0';
      rig.clock.advance(const Duration(days: 2));
      await rig.stats.add(rec(rig.clock.t, id: 'q'));
      expect(
        await rig.service.auto.run(BackupTrigger.launch),
        AutoOutcome.noFolder,
      );
      final st = rig.service.auto.status;
      expect(st.on, isFalse);
      expect(st.needsFolder, isTrue);
      expect(st.lost, isTrue); // 한 번이라도 성공했었다 → 「잃음」
      expect(st.failCode, startsWith('no_folder:no_perm'));
      expect(rig.service.nudge, BackupNudgeKind.folderLost);
    });

    test('폴더가 지워졌으면(gone) 같고, 다시 고르면 바로 이어서 쓴다', () async {
      final rig = await BackupRig.create(now: t0);
      await rig.service.enableAuto();
      rig.platform.folderCode = 'gone';
      await rig.service.auto.refreshFolder();
      expect(rig.service.auto.status.needsFolder, isTrue);
      await rig.stats.add(rec(t0, id: 'n'));
      expect(
        await rig.service.enableAuto(repick: true),
        EnableResult.onAndBackedUp,
      );
      expect(rig.service.auto.status.on, isTrue);
    });

    test('재설치로 들여온 「켜짐」(성공한 적 없음)은 「아직 안 고름」으로 구별한다', () async {
      final rig = await BackupRig.create(
        values: {'backup.auto.enabled': true},
        now: t0,
      );
      await rig.service.auto.refreshFolder();
      final st = rig.service.auto.status;
      expect(st.needsFolder, isTrue);
      expect(st.lost, isFalse);
    });

    test('쓰기 실패는 횟수·사유로 남고, 성공하면 비운다', () async {
      final rig = await BackupRig.create(now: t0);
      await rig.service.enableAuto();
      rig.platform.failWrite = 'write:IOException';
      await rig.stats.add(rec(t0, id: 'f'));
      expect(await rig.service.backupNow(), AutoOutcome.failed);
      expect(rig.service.auto.status.failN, 1);
      rig.platform.failWrite = null;
      expect(await rig.service.backupNow(), AutoOutcome.written);
      expect(rig.service.auto.status.failN, 0);
    });

    test('끄면 폴더 권한을 놓아주고 폴더의 파일은 그대로 둔다', () async {
      final rig = await BackupRig.create(now: t0);
      await rig.service.enableAuto();
      await rig.service.disableAuto();
      expect(rig.platform.released, isTrue);
      expect(rig.platform.folder, isNotEmpty);
      expect(rig.service.auto.status.wanted, isFalse);
    });

    test('다시 고른 폴더의 가장 최근 온전한 백업을 읽는다(반쪽 파일은 건너뛴다)', () async {
      final rig = await BackupRig.create(now: t0);
      await rig.stats.add(rec(t0, id: 'old'));
      await rig.service.enableAuto();
      rig.platform.folder[AutoBackupFiles.nameFor(
            t0.add(const Duration(hours: 1)),
          )] =
          '{"format":"rosarium-backup","da';
      final latest = await rig.service.auto.readLatest();
      expect(latest!.$1, AutoBackupFiles.nameFor(t0));
      expect(latest.$2.records.single.id, 'old');
    });

    test('새 기기: 폴더를 고르면 그 폴더의 백업으로 되살릴 계획을 만든다', () async {
      final platform = FakeBackupPlatform();
      final src = await BackupRig.create(now: t0, platform: platform);
      await src.stats.add(rec(t0, id: 'keep-me'));
      await src.service.enableAuto();
      platform.folderCode = 'never'; // 재설치: 권한이 사라졌다
      final before = Map.of(platform.folder);
      final dst = await BackupRig.create(
        now: t0.add(const Duration(hours: 2)),
        platform: platform,
      );
      // 빈 기기의 첫 백업은 폴더의 진짜 백업을 밀어내지 않고 멈춘다.
      expect(await dst.service.enableAuto(), EnableResult.onFoundExisting);
      expect(platform.folder, before);
      final plan = await dst.service.folderRestorePlanIfEmpty();
      expect(plan!.newRecords.single.id, 'keep-me');
      await dst.service.applyPlan(plan, reason: 'restore');
      expect(dst.stats.records.single.id, 'keep-me');
      // 되살린 뒤에는 평소처럼 쓴다.
      expect(await dst.service.backupNow(), AutoOutcome.written);
    });
  });

  group('안내 카드(시계 되돌림 막기 포함)', () {
    AutoBackupStatus st({
      bool wanted = false,
      String folder = 'never',
      int failN = 0,
      bool everOk = false,
      DateTime? lastOk,
    }) => AutoBackupStatus(
      supported: true,
      wanted: wanted,
      folder: FolderInfo(FolderState.parse(folder), code: folder),
      lastOkAt: lastOk,
      failN: failN,
      failCode: '',
      everOk: everOk,
    );

    BackupNudgeKind? pick({
      int records = 5,
      AutoBackupStatus? auto,
      DateTime? last,
      DateTime? file,
      DateTime? dismissed,
      DateTime? monthly,
    }) => BackupNudge.pick(
      BackupNudgeInput(
        now: t0,
        records: records,
        auto: auto ?? st(),
        lastBackupAt: last,
        lastFileAt: file,
        dismissedAt: dismissed,
        monthlyDismissedAt: monthly,
      ),
    );

    test('기도 몇 번 전에는 아무것도 안 띄운다', () {
      expect(pick(records: 2), isNull);
    });

    test('기도 몇 번 뒤 백업이 없으면 첫 백업 안내, 닫으면 7일 쉰다', () {
      expect(pick(), BackupNudgeKind.firstBackup);
      expect(pick(dismissed: t0.subtract(const Duration(days: 3))), isNull);
      expect(
        pick(dismissed: t0.subtract(const Duration(days: 8))),
        BackupNudgeKind.firstBackup,
      );
    });

    test('미래 시각(시계를 되돌림)은 믿지 않는다 — 닫음·마지막 백업 모두', () {
      final future = t0.add(const Duration(days: 30));
      expect(pick(dismissed: future), BackupNudgeKind.firstBackup);
      expect(pick(last: future), BackupNudgeKind.stale);
      // 한 시간 안의 작은 어긋남은 믿는다.
      expect(pick(last: t0.add(const Duration(minutes: 30)), file: t0), isNull);
    });

    test('자동 백업이 꺼져 있고 2주 넘으면 오래됐다고 알린다', () {
      expect(
        pick(last: t0.subtract(const Duration(days: 15))),
        BackupNudgeKind.stale,
      );
      expect(
        pick(last: t0.subtract(const Duration(days: 3)), file: t0),
        isNull,
      );
    });

    test('자동 백업이 켜져 있어도 실패가 이어지면 알린다', () {
      final failing = st(
        wanted: true,
        folder: 'ok',
        failN: 2,
        everOk: true,
        lastOk: t0.subtract(const Duration(days: 5)),
      );
      expect(
        pick(auto: failing, last: t0.subtract(const Duration(days: 5))),
        BackupNudgeKind.autoFailing,
      );
    });

    test('폴더를 잃으면 다른 안내보다 먼저, 닫아도 하루 뒤 다시', () {
      final lost = st(wanted: true, folder: 'gone', everOk: true);
      expect(pick(auto: lost, last: t0), BackupNudgeKind.folderLost);
      expect(
        pick(auto: lost, dismissed: t0.subtract(const Duration(hours: 2))),
        isNull,
      );
      expect(
        pick(auto: lost, dismissed: t0.subtract(const Duration(days: 2))),
        BackupNudgeKind.folderLost,
      );
    });

    test('한 달에 한 번 파일로도 남기라고 알린다(자동 백업이 켜져 있어도)', () {
      final on = st(wanted: true, folder: 'ok', everOk: true, lastOk: t0);
      expect(
        pick(records: 12, auto: on, last: t0),
        BackupNudgeKind.monthlyFile,
      );
      expect(
        pick(
          records: 12,
          auto: on,
          last: t0,
          file: t0.subtract(const Duration(days: 10)),
        ),
        isNull,
      );
      expect(
        pick(
          records: 12,
          auto: on,
          last: t0,
          monthly: t0.subtract(const Duration(days: 10)),
        ),
        isNull,
      );
      expect(
        pick(
          records: 12,
          auto: on,
          last: t0,
          monthly: t0.add(const Duration(days: 300)), // 미래 — 믿지 않는다
        ),
        BackupNudgeKind.monthlyFile,
      );
    });
  });
}
