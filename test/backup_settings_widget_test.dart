import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/app_services.dart';
import 'package:rosary_app/app/leader_audio_store.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:rosary_app/backup/backup_format.dart';
import 'package:rosary_app/backup/backup_registry.dart';
import 'package:rosary_app/backup/backup_ui.dart';
import 'package:rosary_app/backup/backup_vault.dart';
import 'package:rosary_app/stats/prayer_stats_store.dart';
import 'package:rosary_app/ui/settings_screen.dart';

import 'backup_test_support.dart';

class _FakeLeaderStore extends LeaderAudioStore {
  @override
  Future<void> init() async {}

  @override
  bool has(String cueId) => false;

  @override
  int get recordedCount => 0;
}

Widget _wrap(Widget child) => MaterialApp(
  theme: AppTheme.light(),
  home: Scaffold(body: SingleChildScrollView(child: child)),
);

void main() {
  final t0 = DateTime(2026, 11, 16, 9, 30);

  testWidgets('설정 화면에 「백업과 복원」이 들어 있다', (tester) async {
    final rig = await BackupRig.create(now: t0);
    final settings = await AppSettings.load();
    final services = AppServices.inMemory(
      settings,
      stats: rig.stats,
      backup: rig.service,
    );
    addTearDown(services.disposeInMemory);
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      AppServicesScope(
        services: services,
        child: MaterialApp(
          theme: AppTheme.light(),
          home: SettingsScreen(
            settings: settings,
            leaderAudio: _FakeLeaderStore(),
          ),
        ),
      ),
    );
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('settings-backup')),
      400,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('백업과 복원'), findsOneWidget);
    expect(find.text('마지막 백업: 아직 없어요'), findsOneWidget);
  });

  testWidgets('처음: 안내 카드 3단계 → 폴더 고르기 한 번으로 켜지고 첫 백업', (tester) async {
    final rig = await BackupRig.create(now: t0);
    await rig.stats.add(rec(t0, id: 'a'));
    await tester.pumpWidget(_wrap(BackupSettingsSection(service: rig.service)));

    expect(find.text('마지막 백업: 아직 없어요'), findsOneWidget);
    expect(find.byKey(const ValueKey('backup-guide')), findsOneWidget);
    expect(find.textContaining('1단계.'), findsOneWidget);
    expect(find.textContaining('3단계.'), findsOneWidget);
    final sw = tester.widget<SwitchListTile>(
      find.byKey(const ValueKey('backup-auto-switch')),
    );
    expect(sw.value, isFalse);

    await tester.tap(find.byKey(const ValueKey('backup-guide-pick')));
    await tester.pumpAndSettle();

    expect(rig.platform.pickCalls, 1);
    expect(rig.platform.folder, hasLength(1));
    expect(
      tester
          .widget<SwitchListTile>(
            find.byKey(const ValueKey('backup-auto-switch')),
          )
          .value,
      isTrue,
    );
    expect(find.byKey(const ValueKey('backup-guide')), findsNothing);
    expect(find.textContaining('마지막 백업: 오늘'), findsOneWidget);
    expect(find.textContaining('자동 백업 켜짐'), findsOneWidget);
    expect(find.textContaining('폴더: 로사리움 백업'), findsOneWidget);
    expect(find.textContaining('지금 첫 백업을 했고'), findsOneWidget);
  });

  testWidgets('폴더 고르기를 취소하면 꺼진 채라고 알린다', (tester) async {
    final rig = await BackupRig.create(now: t0);
    rig.platform.pickResult = 'cancelled';
    await tester.pumpWidget(_wrap(BackupSettingsSection(service: rig.service)));
    await tester.tap(find.byKey(const ValueKey('backup-auto-switch')));
    await tester.pumpAndSettle();
    expect(find.text('폴더를 고르지 않아 자동 백업은 꺼진 채예요.'), findsOneWidget);
    expect(
      tester
          .widget<SwitchListTile>(
            find.byKey(const ValueKey('backup-auto-switch')),
          )
          .value,
      isFalse,
    );
  });

  testWidgets('권한을 잃은 폴더: 꺼짐으로 보이고 다시 고르라고 안내한다', (tester) async {
    final rig = await BackupRig.create(
      values: {
        'backup.auto.enabled': true,
        'backup.auto.ever_ok': true,
        'backup.last_at': t0
            .subtract(const Duration(days: 3))
            .millisecondsSinceEpoch,
      },
      now: t0,
    );
    rig.platform.folderCode = 'no_perm:p0';
    await rig.service.auto.refreshFolder();
    await tester.pumpWidget(_wrap(BackupSettingsSection(service: rig.service)));
    expect(find.textContaining('저장 폴더를 잃어 자동 백업이 멈췄어요'), findsOneWidget);
    expect(find.text('폴더 다시 고르기'), findsOneWidget);
    expect(
      tester
          .widget<SwitchListTile>(
            find.byKey(const ValueKey('backup-auto-switch')),
          )
          .value,
      isFalse,
    );
  });

  testWidgets('가져오기: 미리보기로 바뀌는 것을 보여 주고, 확인해야 바꾼다', (tester) async {
    final rig = await BackupRig.create(values: {'chime_ten': true}, now: t0);
    await rig.vault.launchCheck();
    final file = BackupDocument(
      createdAt: DateTime(2026, 11, 1, 20, 15),
      appVersion: '0.1.0+1',
      prefs: const {'chime_ten': TypedPref(PrefType.boolean, false)},
      records: [
        rec(DateTime(2026, 10, 30, 7), id: 'x1'),
        rec(DateTime(2026, 10, 31, 7), id: 'x2'),
      ],
    );
    rig.platform.openText = file.encode();
    await tester.pumpWidget(_wrap(BackupSettingsSection(service: rig.service)));

    // 취소하면 아무것도 바뀌지 않는다.
    await tester.tap(find.byKey(const ValueKey('backup-import')));
    await tester.pumpAndSettle();
    expect(find.textContaining('기도 기록 2개를 더해요'), findsOneWidget);
    expect(find.textContaining('종소리'), findsOneWidget);
    expect(find.textContaining('2026년 11월 1일 20:15'), findsOneWidget);
    await tester.tap(find.text('취소'));
    await tester.pumpAndSettle();
    expect(rig.stats.records, isEmpty);
    expect(rig.prefs.getBool('chime_ten'), isTrue);

    await tester.tap(find.byKey(const ValueKey('backup-import')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('import-apply')));
    await tester.pumpAndSettle();
    expect(rig.stats.records.map((r) => r.id).toSet(), {'x1', 'x2'});
    expect(rig.prefs.getBool('chime_ten'), isFalse);
    expect(find.textContaining('기도 기록 2개를 더했어요'), findsOneWidget);
    expect(rig.files.files['pre0'], isNotNull); // 안전 사본
  });

  testWidgets('망가진 파일은 이유를 보여 주고 아무것도 바꾸지 않는다', (tester) async {
    final rig = await BackupRig.create(values: {'chime_ten': true}, now: t0);
    rig.platform.openText = '{"format":"rosarium-backup","data":{"prefs":';
    await tester.pumpWidget(_wrap(BackupSettingsSection(service: rig.service)));
    await tester.tap(find.byKey(const ValueKey('backup-import')));
    await tester.pumpAndSettle();
    expect(find.text('가져올 수 없어요'), findsOneWidget);
    expect(find.textContaining('파일이 깨졌거나'), findsOneWidget);
    await tester.tap(find.text('확인'));
    await tester.pumpAndSettle();
    expect(rig.prefs.getBool('chime_ten'), isTrue);
    expect(rig.files.files, isEmpty);
  });

  testWidgets('파일로 저장하면 「마지막 백업」이 오늘이 된다', (tester) async {
    final rig = await BackupRig.create(now: t0);
    await tester.pumpWidget(_wrap(BackupSettingsSection(service: rig.service)));
    await tester.tap(find.byKey(const ValueKey('backup-save-file')));
    await tester.pumpAndSettle();
    expect(rig.platform.saved.single.$1, 'rosarium-export-20261116.json');
    expect(find.textContaining('마지막 백업: 오늘 09:30'), findsOneWidget);
    expect(find.text('백업 파일을 저장했어요.'), findsOneWidget);
  });

  testWidgets('기록이 줄었으면 제안 카드 → 사본 고르기 → 되살리기', (tester) async {
    final files = MemoryVaultFiles();
    final before = await BackupRig.create(
      values: {
        PrayerStatsStore.prefsKey: BackupDocument.encodeRecords([
          for (var i = 0; i < 20; i++)
            rec(t0.subtract(Duration(days: i)), id: 'r$i'),
        ]),
        'haptic': false,
      },
      now: t0.subtract(const Duration(hours: 2)),
      files: files,
    );
    await before.vault.launchCheck();
    await before.vault.checkpoint();

    final rig = await BackupRig.create(
      values: {
        PrayerStatsStore.prefsKey: BackupDocument.encodeRecords([
          rec(t0, id: 'r0'),
        ]),
        'haptic': false,
      },
      now: t0,
      files: files,
    );
    await rig.vault.launchCheck();
    expect(rig.vault.offer, isNotNull);
    await tester.pumpWidget(_wrap(BackupSettingsSection(service: rig.service)));
    expect(find.byKey(const ValueKey('backup-restore-offer')), findsOneWidget);
    expect(find.text('기도 기록이 갑자기 줄었어요'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('restore-offer-open')));
    await tester.pumpAndSettle();
    expect(find.textContaining('· 추천'), findsOneWidget);
    await tester.tap(find.textContaining('· 추천'));
    await tester.pumpAndSettle();
    expect(find.text('이 사본으로 되살리기'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('import-apply')));
    await tester.pumpAndSettle();
    expect(rig.stats.records, hasLength(20));
    expect(find.byKey(const ValueKey('backup-restore-offer')), findsNothing);
  });

  testWidgets('오늘 화면 안내: 기도 몇 번 뒤 첫 백업 권유, 닫으면 사라진다', (tester) async {
    final rig = await BackupRig.create(now: t0);
    for (var i = 0; i < 3; i++) {
      await rig.stats.add(rec(t0.subtract(Duration(days: i)), id: 'n$i'));
    }
    await tester.pumpWidget(_wrap(BackupHomeCard(service: rig.service)));
    expect(
      find.byKey(const ValueKey('backup-nudge-firstBackup')),
      findsOneWidget,
    );
    expect(find.text('기도 기록을 지켜 두세요'), findsOneWidget);
    expect(find.text('자동 백업 켜기'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('nudge-close')));
    await tester.pumpAndSettle();
    expect(
      find.byKey(const ValueKey('backup-nudge-firstBackup')),
      findsNothing,
    );
    expect(
      rig.prefs.getInt('${BackupRegistry.internalPrefix}nudge.dismissed_at'),
      isNotNull,
    );
  });

  testWidgets('접근성: 누르는 자리 48dp·라벨', (tester) async {
    final handle = tester.ensureSemantics();
    final rig = await BackupRig.create(now: t0);
    for (var i = 0; i < 3; i++) {
      await rig.stats.add(rec(t0.subtract(Duration(days: i)), id: 'n$i'));
    }
    await tester.pumpWidget(
      _wrap(
        Column(
          children: [
            BackupHomeCard(service: rig.service),
            BackupSettingsSection(service: rig.service),
          ],
        ),
      ),
    );
    for (final k in [
      'backup-guide-pick',
      'nudge-close',
      'nudge-primary',
      'nudge-secondary',
    ]) {
      final size = tester.getSize(find.byKey(ValueKey(k)));
      expect(size.height, greaterThanOrEqualTo(48), reason: k);
      expect(size.width, greaterThanOrEqualTo(48), reason: k);
    }
    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
    handle.dispose();
  });
}
