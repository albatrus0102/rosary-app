import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/backup/backup_format.dart';
import 'package:rosary_app/backup/backup_registry.dart';
import 'package:rosary_app/backup/backup_service.dart';
import 'package:rosary_app/backup/backup_vault.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';

import 'backup_test_support.dart';

void main() {
  final t0 = DateTime(2026, 11, 10, 8);

  List<PrayerRecord> records(int n) => [
    for (var i = 0; i < n; i++) rec(t0.subtract(Duration(hours: i)), id: 'r$i'),
  ];

  Map<String, Object> stored(int n, {Map<String, Object> extra = const {}}) => {
    PrayerStatsStore.prefsKey: BackupDocument.encodeRecords(records(n)),
    'chime_ten': false,
    'haptic': true,
    'tts_rate': 0.5,
    'rosary3d_id': 'olive',
    ...extra,
  };

  group('줄어듦 판정(isDrop)', () {
    test('30% 넘게 + 5건 이상, 또는 있던 기록이 0', () {
      expect(BackupVault.isDrop(100, 69), isTrue);
      expect(BackupVault.isDrop(100, 70), isFalse);
      expect(BackupVault.isDrop(10, 6), isFalse); // 4건만 줄었다
      expect(BackupVault.isDrop(10, 5), isTrue);
      expect(BackupVault.isDrop(3, 0), isTrue);
      expect(BackupVault.isDrop(0, 0), isFalse);
      expect(BackupVault.isDrop(10, 12), isFalse);
    });
  });

  group('실행 때 확인(vaultRestoreCheck)', () {
    test('평소: 사본과 같으면 묻지 않고 쓰기가 열린다', () async {
      final files = MemoryVaultFiles();
      final a = await BackupRig.create(
        values: stored(20),
        now: t0,
        files: files,
      );
      await a.vault.launchCheck();
      expect(await a.vault.checkpoint(), VaultWrite.ok);
      final b = await BackupRig.create(
        values: stored(21),
        now: t0,
        files: files,
      );
      expect(await b.vault.launchCheck(), isNull);
      expect(b.vault.ready, isTrue);
    });

    test('기록이 크게 줄었으면 줄기 전 사본을 guard로 지키고 묻는다(덮어쓰지 않는다)', () async {
      final files = MemoryVaultFiles();
      final a = await BackupRig.create(
        values: stored(40),
        now: t0,
        files: files,
      );
      await a.vault.launchCheck();
      await a.vault.checkpoint();

      final b = await BackupRig.create(
        values: stored(3),
        now: t0,
        files: files,
      );
      final offer = await b.vault.launchCheck();
      expect(offer, isNotNull);
      expect(offer!.reason, 'records');
      expect(offer.beforeRecords, 40);
      expect(offer.nowRecords, 3);
      expect(BackupVault.parse('guard', files.files['guard']!)!.records, 40);
      // 묻기만 한다: 기록은 그대로 3개.
      expect(b.stats.records, hasLength(3));

      // 그 뒤 몇 번 저장돼도 guard는 40개짜리로 남는다.
      await b.vault.checkpoint();
      b.clock.advance(const Duration(days: 2));
      await b.stats.add(rec(b.clock.t, id: 'new'));
      await b.vault.checkpoint();
      expect(BackupVault.parse('guard', files.files['guard']!)!.records, 40);
    });

    test('설정이 통째로 비면 묻는다', () async {
      final files = MemoryVaultFiles();
      final a = await BackupRig.create(
        values: stored(2),
        now: t0,
        files: files,
      );
      await a.vault.launchCheck();
      await a.vault.checkpoint();
      final b = await BackupRig.create(
        values: {
          PrayerStatsStore.prefsKey: BackupDocument.encodeRecords(records(2)),
        },
        now: t0,
        files: files,
      );
      expect((await b.vault.launchCheck())?.reason, 'prefs');
    });

    test('새 설치(앱이 비었는데 돌아온 사본이 있음): 되살릴지 묻는다', () async {
      final files = MemoryVaultFiles();
      final a = await BackupRig.create(
        values: stored(12),
        now: t0,
        files: files,
      );
      await a.vault.launchCheck();
      await a.vault.checkpoint();
      final fresh = await BackupRig.create(now: t0, files: files);
      final offer = await fresh.vault.launchCheck();
      expect(offer?.reason, 'empty');
      // 새 설치의 첫 저장이 돌아온 사본을 밀어내도 guard가 지킨다.
      await fresh.vault.checkpoint();
      await fresh.vault.checkpoint();
      final cands = await fresh.vault.candidates();
      expect(cands.map((c) => c.records), contains(12));
      expect(BackupVault.pickCandidate(cands)!.records, 12);
    });

    test('일부러 지운 기록(기록 지우기·계정 전환)은 묻지 않는다', () async {
      final files = MemoryVaultFiles();
      final a = await BackupRig.create(
        values: stored(30),
        now: t0,
        files: files,
      );
      await a.vault.launchCheck();
      await a.vault.checkpoint();
      a.clock.advance(const Duration(minutes: 1));
      await a.stats.clear(); // 표식을 남긴다
      expect(a.prefs.getInt(BackupRegistry.intentDropKey), isNotNull);

      // 사본을 쓰기 전에 앱이 꺼져도 다음 실행에 묻지 않는다.
      final b = await BackupRig.create(
        values: {for (final k in a.prefs.getKeys()) k: a.prefs.get(k)!},
        now: t0.add(const Duration(minutes: 2)),
        files: files,
      );
      expect(await b.vault.launchCheck(), isNull);
      await b.vault.checkpoint();
      expect(files.files['guard'], isNull);
      // 표식은 그 상태가 사본에 내려앉은 뒤 지운다.
      expect(b.prefs.getInt(BackupRegistry.intentDropKey), isNull);
    });

    test('실행 중에 표식 없이 줄면 쓰기 전에 guard를 지키고 제안을 세운다', () async {
      final rig = await BackupRig.create(values: stored(25), now: t0);
      await rig.vault.launchCheck();
      await rig.vault.checkpoint();
      // 사고: 기록이 저장소에서 사라짐(표식 없음)
      await rig.prefs.remove(PrayerStatsStore.prefsKey);
      expect(await rig.vault.checkpoint(), VaultWrite.ok);
      expect(rig.vault.offer, isNotNull);
      expect(
        BackupVault.parse('guard', rig.files.files['guard']!)!.records,
        25,
      );
    });

    test('「이대로 둘게요」는 제안을 닫지만 사본은 지우지 않는다', () async {
      final files = MemoryVaultFiles();
      final a = await BackupRig.create(
        values: stored(40),
        now: t0,
        files: files,
      );
      await a.vault.launchCheck();
      await a.vault.checkpoint();
      final b = await BackupRig.create(
        values: stored(1),
        now: t0,
        files: files,
      );
      await b.vault.launchCheck();
      b.clock.advance(const Duration(minutes: 1));
      await b.vault.dismissOffer();
      expect(b.vault.offer, isNull);
      expect(files.files['guard'], isNotNull);
      final c = await BackupRig.create(
        values: {for (final k in b.prefs.getKeys()) k: b.prefs.get(k)!},
        now: t0.add(const Duration(minutes: 5)),
        files: files,
      );
      expect(await c.vault.launchCheck(), isNull);
    });

    test('손상된 최신 사본은 건너뛰고 그 전 사본으로 판정한다', () async {
      final files = MemoryVaultFiles();
      final a = await BackupRig.create(
        values: stored(30),
        now: t0,
        files: files,
      );
      await a.vault.launchCheck();
      await a.vault.checkpoint();
      a.clock.advance(const Duration(hours: 1));
      await a.stats.add(rec(a.clock.t, id: 'x'));
      await a.vault.checkpoint();
      files.files['g0'] = '{"format":"rosarium-backup","data":{"pre'; // 쓰다 끊김
      final b = await BackupRig.create(
        values: stored(2),
        now: t0,
        files: files,
      );
      final offer = await b.vault.launchCheck();
      expect(offer?.beforeRecords, 30);
    });
  });

  group('세대·후보(vaultPickCandidate)', () {
    test('날이 바뀌면 그 전 날의 마지막 사본을 d1에 남긴다', () async {
      final rig = await BackupRig.create(values: stored(5), now: t0);
      await rig.vault.launchCheck();
      await rig.vault.checkpoint();
      rig.clock.advance(const Duration(days: 1));
      await rig.stats.add(rec(rig.clock.t, id: 'd2'));
      await rig.vault.checkpoint();
      expect(BackupVault.parse('d1', rig.files.files['d1']!)!.records, 5);
      expect(BackupVault.parse('g0', rig.files.files['g0']!)!.records, 6);
      expect(BackupVault.parse('g1', rig.files.files['g1']!)!.records, 5);
    });

    test('추천은 가장 많은 기록의 70% 이상 중 가장 최근 것(줄어든 사본은 추천하지 않는다)', () {
      VaultSnapshot s(String slot, int n, int hoursAgo) => VaultSnapshot(
        slot: slot,
        document: BackupDocument(
          createdAt: t0,
          appVersion: '',
          prefs: const {},
          records: records(n),
        ),
        savedAt: t0.subtract(Duration(hours: hoursAgo)),
        seq: 0,
        reason: '',
      );
      final list = [
        s('g0', 2, 0),
        s('g1', 40, 5),
        s('d1', 38, 30),
        s('guard', 41, 6),
      ];
      expect(BackupVault.pickCandidate(list)!.slot, 'g1');
      expect(BackupVault.pickCandidate([s('guard', 41, 6)])!.slot, 'guard');
    });

    test('동시에 불러도 세대가 엇갈리지 않는다(한 줄로 차례대로)', () async {
      final rig = await BackupRig.create(values: stored(5), now: t0);
      await rig.vault.launchCheck();
      await rig.vault.checkpoint();
      final a = rig.vault.checkpoint();
      await rig.stats.add(rec(t0, id: 'late'));
      final b = rig.vault.checkpoint();
      final c = rig.vault.safetySnapshot('x');
      final results = {await a, await b};
      expect(results, contains(VaultWrite.ok));
      expect(results, isNot(contains(VaultWrite.failed)));
      expect(await c, isTrue);
      expect(BackupVault.parse('g0', rig.files.files['g0']!)!.records, 6);
      expect(BackupVault.parse('g1', rig.files.files['g1']!)!.records, 5);
      expect(BackupVault.parse('pre0', rig.files.files['pre0']!)!.records, 6);
    });

    test('바뀐 게 없으면 쓰지 않는다', () async {
      final rig = await BackupRig.create(values: stored(5), now: t0);
      await rig.vault.launchCheck();
      expect(await rig.vault.checkpoint(), VaultWrite.ok);
      expect(await rig.vault.checkpoint(), VaultWrite.same);
    });

    test('실행 확인 전에는 쓰지 않는다(돌아온 사본을 빈 상태로 밀어내지 않게)', () async {
      final rig = await BackupRig.create(values: stored(5), now: t0);
      expect(await rig.vault.checkpoint(), VaultWrite.notReady);
      expect(rig.files.files, isEmpty);
    });
  });

  group('가져오기 직전 안전 사본', () {
    test('안전 사본을 못 쓰면 아무것도 바꾸지 않는다', () async {
      final rig = await BackupRig.create(values: stored(3), now: t0);
      await rig.vault.launchCheck();
      final other = BackupDocument(
        createdAt: t0,
        appVersion: '',
        prefs: const {'chime_ten': TypedPref(PrefType.boolean, true)},
        records: [rec(t0.subtract(const Duration(days: 9)), id: 'other')],
      );
      final plan = rig.service.planFor(other);
      rig.files.failWrites = true;
      expect(await rig.service.applyPlan(plan), ImportOutcome.noSafetyCopy);
      expect(rig.prefs.getBool('chime_ten'), isFalse);
      expect(rig.stats.records, hasLength(3));
      expect(rig.vault.lastError, isNotNull);
    });

    test('가져온 뒤 pre0 사본으로 가져오기 전 상태를 되살릴 수 있다', () async {
      final rig = await BackupRig.create(values: stored(3), now: t0);
      await rig.vault.launchCheck();
      final other = BackupDocument(
        createdAt: t0,
        appVersion: '',
        prefs: const {'chime_ten': TypedPref(PrefType.boolean, true)},
        records: const [],
      );
      expect(
        await rig.service.applyPlan(rig.service.planFor(other)),
        ImportOutcome.applied,
      );
      expect(rig.prefs.getBool('chime_ten'), isTrue);
      final pre = BackupVault.parse('pre0', rig.files.files['pre0']!)!;
      expect(pre.document.prefs['chime_ten']!.value, false);
      await rig.service.applyPlan(
        rig.service.planFor(pre.document),
        reason: 'restore',
      );
      expect(rig.prefs.getBool('chime_ten'), isFalse);
    });
  });

  test('계정 삭제: 기기 안 사본을 모두 지운다', () async {
    final rig = await BackupRig.create(values: stored(3), now: t0);
    await rig.vault.launchCheck();
    await rig.vault.checkpoint();
    await rig.vault.safetySnapshot('x');
    expect(rig.files.files, isNotEmpty);
    await rig.service.onAccountDeleted();
    expect(rig.files.files, isEmpty);
  });
}
