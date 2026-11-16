import 'dart:async';

import 'package:flutter/material.dart';

import '../app/theme.dart';
import '../ui/widgets/section_header.dart';
import 'auto_backup.dart';
import 'backup_data.dart';
import 'backup_nudge.dart';
import 'backup_platform.dart';
import 'backup_service.dart';
import 'backup_vault.dart';

/// 48dp 이상의 누르는 자리(접근성).
const Size _tap = Size(48, 48);
final ButtonStyle _filled = FilledButton.styleFrom(minimumSize: _tap);
final ButtonStyle _text = TextButton.styleFrom(minimumSize: _tap);

String _two(int v) => v.toString().padLeft(2, '0');

/// 「오늘 14:02」·「어제」·「3일 전」·「2026년 3월 4일」.
String backupWhen(DateTime t, DateTime now) {
  if (backupClockAhead(t, now)) {
    return '${t.year}년 ${t.month}월 ${t.day}일(기기 시계 확인 필요)';
  }
  final d0 = DateTime(now.year, now.month, now.day);
  final d1 = DateTime(t.year, t.month, t.day);
  final days = d0.difference(d1).inDays;
  if (days <= 0) return '오늘 ${_two(t.hour)}:${_two(t.minute)}';
  if (days == 1) return '어제';
  if (days < 30) return '$days일 전';
  return '${t.year}년 ${t.month}월 ${t.day}일';
}

String _dateTime(DateTime t) =>
    '${t.year}년 ${t.month}월 ${t.day}일 ${_two(t.hour)}:${_two(t.minute)}';

String _count(int n) {
  final s = n.toString();
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
    b.write(s[i]);
  }
  return b.toString();
}

void _snack(BuildContext context, String text) {
  final m = ScaffoldMessenger.maybeOf(context);
  m?.hideCurrentSnackBar();
  m?.showSnackBar(SnackBar(content: Text(text)));
}

// ---- 공통 동작 -------------------------------------------------------------

/// 자동 백업 켜기(폴더 고르기까지 한 흐름). 결과를 한 줄로 알린다.
Future<void> enableAutoBackup(
  BuildContext context,
  BackupService service, {
  bool repick = false,
}) async {
  final r = await service.enableAuto(repick: repick);
  if (!context.mounted) return;
  switch (r) {
    case EnableResult.onAndBackedUp:
      _snack(context, '폴더를 정했어요. 지금 첫 백업을 했고, 앞으로 하루 한 번 알아서 해요.');
      await _offerFolderRestore(context, service);
    case EnableResult.onFoundExisting:
      _snack(context, '폴더를 정했어요. 이 폴더에 있던 백업을 찾았어요.');
      await _offerFolderRestore(context, service);
    case EnableResult.onButFirstFailed:
      _snack(context, '자동 백업을 켰지만 첫 백업을 쓰지 못했어요. 다른 폴더를 골라 보세요.');
    case EnableResult.cancelled:
      _snack(context, '폴더를 고르지 않아 자동 백업은 꺼진 채예요.');
    case EnableResult.failed:
      _snack(context, '그 폴더에는 백업을 저장할 수 없어요. 다른 폴더를 골라 주세요.');
    case EnableResult.unsupported:
      _snack(context, '이 기기에서는 자동 백업을 쓸 수 없어요. 파일로 저장해 주세요.');
  }
}

/// 새 기기·재설치: 고른 폴더에 백업이 있고 이 기기가 비어 있으면 되살릴지 묻는다.
Future<void> _offerFolderRestore(
  BuildContext context,
  BackupService service,
) async {
  final plan = await service.folderRestorePlanIfEmpty();
  if (plan == null || !context.mounted) return;
  await showImportPreview(
    context,
    service,
    plan,
    title: '이 폴더에서 백업을 찾았어요',
    reason: 'restore',
  );
}

Future<void> saveBackupFile(BuildContext context, BackupService service) async {
  final r = await service.saveToFile();
  if (!context.mounted || r.cancelled) return;
  _snack(context, r.ok ? '백업 파일을 저장했어요.' : '파일을 저장하지 못했어요. 다른 곳을 골라 보세요.');
}

Future<void> shareBackupFile(
  BuildContext context,
  BackupService service,
) async {
  final r = await service.share();
  if (!context.mounted || r.ok || r.cancelled) return;
  _snack(context, '공유 화면을 열지 못했어요.');
}

Future<void> importBackupFile(
  BuildContext context,
  BackupService service,
) async {
  final pick = await service.pickImportFile();
  if (!context.mounted || pick.cancelled) return;
  final plan = pick.plan;
  if (plan == null) {
    await showDialog<void>(
      context: context,
      builder: (c) => AlertDialog(
        icon: const Icon(Icons.error_outline),
        title: const Text('가져올 수 없어요'),
        content: Text(pick.error ?? '파일을 읽지 못했어요.'),
        actions: [
          TextButton(
            style: _text,
            onPressed: () => Navigator.of(c).pop(),
            child: const Text('확인'),
          ),
        ],
      ),
    );
    return;
  }
  await showImportPreview(context, service, plan);
}

/// 무엇이 바뀌는지 보여 주고, 확인을 받아야만 적용한다.
Future<bool> showImportPreview(
  BuildContext context,
  BackupService service,
  ImportPlan plan, {
  String title = '백업 파일 가져오기',
  String reason = 'import',
}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (c) => ImportPreviewDialog(plan: plan, title: title),
  );
  if (ok != true || !context.mounted) return false;
  final r = await service.applyPlan(plan, reason: reason);
  if (!context.mounted) return r != ImportOutcome.noSafetyCopy;
  switch (r) {
    case ImportOutcome.applied:
      _snack(
        context,
        plan.newRecords.isEmpty
            ? '가져왔어요.'
            : '가져왔어요 · 기도 기록 ${_count(plan.newRecords.length)}개를 더했어요.',
      );
    case ImportOutcome.partial:
      _snack(context, '기록은 합쳤지만 설정 일부를 저장하지 못했어요. 다시 가져와 주세요.');
    case ImportOutcome.noSafetyCopy:
      _snack(context, '되돌릴 사본을 만들지 못해 아무것도 바꾸지 않았어요. 저장 공간을 확인해 주세요.');
  }
  return r != ImportOutcome.noSafetyCopy;
}

/// 가져오기 미리보기.
class ImportPreviewDialog extends StatelessWidget {
  const ImportPreviewDialog({
    super.key,
    required this.plan,
    required this.title,
  });

  final ImportPlan plan;
  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final doc = plan.document;
    final lines = <Widget>[];
    void line(IconData icon, String text, {bool warn = false}) {
      lines.add(
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.xs),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                icon,
                size: 20,
                color: warn
                    ? theme.colorScheme.error
                    : theme.colorScheme.primary,
              ),
              const SizedBox(width: AppSpace.xs),
              Expanded(child: Text(text, style: theme.textTheme.bodyMedium)),
            ],
          ),
        ),
      );
    }

    if (doc.createdAt.millisecondsSinceEpoch > 0) {
      line(
        Icons.schedule,
        '만든 때: ${_dateTime(doc.createdAt)}'
        '${doc.appVersion.isEmpty ? '' : ' · 앱 ${doc.appVersion}'}',
      );
    }
    line(
      Icons.auto_stories_outlined,
      plan.newRecords.isEmpty
          ? '더할 기도 기록이 없어요'
                '${plan.duplicateRecords > 0 ? ' (이미 있는 기록 ${_count(plan.duplicateRecords)}개)' : ''}.'
          : '기도 기록 ${_count(plan.newRecords.length)}개를 더해요'
                '${plan.duplicateRecords > 0 ? ' · 이미 있는 ${_count(plan.duplicateRecords)}개는 건너뛰어요' : ''}. '
                '지금 기록은 지우지 않아요.',
    );
    if (doc.skippedRecords > 0) {
      line(
        Icons.report_gmailerrorred_outlined,
        '읽을 수 없는 기록 ${_count(doc.skippedRecords)}개는 빼고 가져와요.',
        warn: true,
      );
    }
    if (plan.trims) {
      line(
        Icons.content_cut,
        '합치면 ${_count(plan.maxRecords)}개를 넘어 가장 오래된 기록 '
        '${_count(plan.recordsAfter - plan.maxRecords)}개는 빠져요.',
        warn: true,
      );
    }
    final labels = plan.changedLabels;
    line(
      Icons.tune,
      labels.isEmpty
          ? '설정은 지금과 같아요.'
          : '설정 ${_count(plan.changedPrefs.length)}가지가 파일의 값으로 바뀌어요: '
                '${labels.take(6).join(', ')}${labels.length > 6 ? ' 등' : ''}.',
    );
    if (doc.skippedPrefs + plan.typeConflicts > 0) {
      line(
        Icons.info_outline,
        '이 앱에서 쓸 수 없는 설정 ${_count(doc.skippedPrefs + plan.typeConflicts)}가지는 건너뛰어요.',
      );
    }
    if (plan.newerFile || plan.unknownPrefs > 0 || doc.carry.isNotEmpty) {
      line(
        Icons.new_releases_outlined,
        '새 버전 앱에서 만든 항목은 그대로 보관해 두었다가 다음 백업에도 담아요.',
      );
    }
    line(
      Icons.shield_outlined,
      '바꾸기 전에 지금 상태를 기기 안에 따로 남겨 둬요. 마음이 바뀌면 '
      '「기기 안 사본에서 되살리기」로 되돌릴 수 있어요.',
    );

    final nothing = plan.changesNothing;
    return AlertDialog(
      icon: const Icon(Icons.restore_page_outlined),
      title: Text(title),
      scrollable: true,
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ...lines,
          if (nothing)
            Text(
              '바뀌는 게 없어요.',
              key: const ValueKey('import-nothing'),
              style: theme.textTheme.titleSmall,
            ),
        ],
      ),
      actions: [
        TextButton(
          style: _text,
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(nothing ? '닫기' : '취소'),
        ),
        if (!nothing)
          FilledButton(
            key: const ValueKey('import-apply'),
            style: _filled,
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('가져오기'),
          ),
      ],
    );
  }
}

/// 기기 안 사본(과 자동 백업 폴더의 최근 파일) 중에서 골라 되살린다.
Future<void> openRestoreSheet(
  BuildContext context,
  BackupService service,
) async {
  final list = await service.restoreCandidates();
  if (!context.mounted) return;
  if (list.isEmpty) {
    _snack(context, '아직 되살릴 사본이 없어요.');
    return;
  }
  final best = BackupVault.pickCandidate(list);
  final chosen = await showModalBottomSheet<VaultSnapshot>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (c) => SafeArea(
      child: ListView(
        shrinkWrap: true,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
            child: Text('되살릴 사본 고르기', style: Theme.of(c).textTheme.titleLarge),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
            child: Text(
              '고르면 무엇이 바뀌는지 먼저 보여 드려요. 기록은 합치고, 설정은 그 사본의 값으로 바뀌어요.',
              style: Theme.of(c).textTheme.bodyMedium,
            ),
          ),
          for (final s in list)
            ListTile(
              key: ValueKey('restore-${s.slot}'),
              leading: Icon(
                s.slot == 'folder' ? Icons.folder_outlined : Icons.history,
              ),
              title: Text(s.slotLabel + (identical(s, best) ? ' · 추천' : '')),
              subtitle: Text(
                '${_dateTime(s.savedAt)} · 기도 기록 ${_count(s.records)}개 · 설정 ${_count(s.settings)}가지',
              ),
              onTap: () => Navigator.of(c).pop(s),
            ),
          const SizedBox(height: AppSpace.xs),
        ],
      ),
    ),
  );
  if (chosen == null || !context.mounted) return;
  // 고른 사본을 먼저 읽어 계획을 만든 뒤(그 다음에 안전 사본이 고리를 민다 — 독서공방 B3 순서).
  final plan = service.planFor(chosen.document);
  await showImportPreview(
    context,
    service,
    plan,
    title: '이 사본으로 되살리기',
    reason: 'restore',
  );
}

// ---- 설정 화면의 「백업과 복원」 ------------------------------------------------

/// 설정 › 백업과 복원.
class BackupSettingsSection extends StatelessWidget {
  const BackupSettingsSection({super.key, required this.service});

  final BackupService service;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: service,
      builder: (context, _) => _build(context),
    );
  }

  Widget _build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final now = service.now;
    final auto = service.auto.status;
    final last = service.lastBackupAt;
    final staleWarn =
        last == null ||
        backupClockAhead(last, now) ||
        now.difference(last) > BackupNudge.staleAfter;

    final String autoLine;
    if (!auto.supported) {
      autoLine = '자동 백업은 안드로이드에서만 쓸 수 있어요.';
    } else if (auto.on) {
      autoLine =
          '자동 백업 켜짐 · 하루 한 번, 최근 7일 치${auto.folder.name == null ? '' : ' · 폴더: ${auto.folder.name}'}';
    } else if (auto.lost) {
      autoLine = '저장 폴더를 잃어 자동 백업이 멈췄어요. 폴더를 다시 고르면 바로 켜져요.';
    } else if (auto.needsFolder) {
      autoLine = '아직 이 기기에서 저장 폴더를 고르지 않았어요. 고르면 켜져요.';
    } else {
      autoLine = '자동 백업 꺼짐';
    }
    final failing = auto.on && auto.failN > 0;

    final offer = service.vault.offer;
    final vaultSum = service.vault.summary;
    final vaultErr = service.vault.lastError;

    return Padding(
      key: const ValueKey('settings-backup'),
      padding: const EdgeInsets.only(bottom: AppSpace.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SectionHeader('백업과 복원'),
          if (offer != null) ...[
            BackupRestoreOfferCard(service: service),
            const SizedBox(height: AppSpace.xs),
          ],
          Card.filled(
            color: scheme.surfaceContainerLow,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ListTile(
                  key: const ValueKey('backup-status'),
                  leading: Icon(
                    staleWarn || auto.needsFolder || failing
                        ? Icons.cloud_off_outlined
                        : Icons.cloud_done_outlined,
                    color: staleWarn || auto.needsFolder || failing
                        ? scheme.error
                        : scheme.primary,
                  ),
                  title: Text(
                    last == null
                        ? '마지막 백업: 아직 없어요'
                        : '마지막 백업: ${backupWhen(last, now)}',
                  ),
                  subtitle: Text(
                    failing
                        ? '$autoLine\n자동 백업이 ${auto.failN}번 실패했어요. 폴더를 다시 골라 보세요.'
                        : autoLine,
                  ),
                ),
                if (auto.supported && !auto.on)
                  AutoBackupGuideCard(service: service, status: auto),
                if (auto.supported)
                  SwitchListTile(
                    key: const ValueKey('backup-auto-switch'),
                    secondary: const Icon(Icons.autorenew),
                    title: const Text('자동 백업'),
                    subtitle: const Text('고른 폴더에 하루 한 번 저장해요. 앱을 지워도 남아요.'),
                    value: auto.on,
                    onChanged: (v) {
                      if (v) {
                        unawaited(enableAutoBackup(context, service));
                      } else {
                        unawaited(() async {
                          await service.disableAuto();
                          if (context.mounted) {
                            _snack(context, '자동 백업을 껐어요. 폴더에 있던 파일은 그대로 있어요.');
                          }
                        }());
                      }
                    },
                  ),
                if (auto.on) ...[
                  ListTile(
                    key: const ValueKey('backup-now'),
                    leading: const Icon(Icons.backup_outlined),
                    title: const Text('지금 백업'),
                    onTap: () => unawaited(() async {
                      final r = await service.backupNow();
                      if (!context.mounted) return;
                      _snack(
                        context,
                        r == AutoOutcome.written
                            ? '폴더에 백업했어요.'
                            : '백업하지 못했어요. 폴더를 다시 골라 보세요.',
                      );
                    }()),
                  ),
                  ListTile(
                    key: const ValueKey('backup-repick'),
                    leading: const Icon(Icons.drive_folder_upload_outlined),
                    title: const Text('폴더 다시 고르기'),
                    onTap: () => unawaited(
                      enableAutoBackup(context, service, repick: true),
                    ),
                  ),
                ],
                const Divider(height: 1, indent: 16, endIndent: 16),
                ListTile(
                  key: const ValueKey('backup-save-file'),
                  leading: const Icon(Icons.save_alt),
                  title: const Text('파일로 저장'),
                  subtitle: const Text('다운로드 등 원하는 곳에 백업 파일 하나로 저장해요.'),
                  onTap: () => unawaited(saveBackupFile(context, service)),
                ),
                ListTile(
                  key: const ValueKey('backup-share'),
                  leading: const Icon(Icons.share_outlined),
                  title: const Text('공유하기'),
                  subtitle: const Text('드라이브·메일 등으로 백업 파일을 보내요.'),
                  onTap: () => unawaited(shareBackupFile(context, service)),
                ),
                ListTile(
                  key: const ValueKey('backup-import'),
                  leading: const Icon(Icons.file_open_outlined),
                  title: const Text('백업 파일 가져오기'),
                  subtitle: const Text(
                    '바뀌는 것을 먼저 보여 드려요. 기록은 합치고, 설정은 파일의 값으로 바꿔요.',
                  ),
                  onTap: () => unawaited(importBackupFile(context, service)),
                ),
                ListTile(
                  key: const ValueKey('backup-vault'),
                  leading: Icon(
                    Icons.history,
                    color: vaultErr == null ? null : scheme.error,
                  ),
                  title: const Text('기기 안 사본에서 되살리기'),
                  subtitle: Text(
                    vaultErr != null
                        ? '기기 안 사본을 저장하지 못했어요($vaultErr). 저장 공간을 확인해 주세요.'
                        : vaultSum.at == null
                        ? '기록이 바뀔 때마다 기기 안에 사본을 남겨요.'
                        : '마지막 사본: ${backupWhen(vaultSum.at!, now)} · 기도 기록 ${_count(vaultSum.records)}개',
                  ),
                  onTap: () => unawaited(openRestoreSheet(context, service)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 자동 백업 폴더 고르기 처음 한 번 도우미(독서공방 autoBackupGuideCardHTML). 폴더를 고르면 켜진다.
class AutoBackupGuideCard extends StatelessWidget {
  const AutoBackupGuideCard({
    super.key,
    required this.service,
    required this.status,
  });

  final BackupService service;
  final AutoBackupStatus status;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final warn = status.needsFolder;
    final lead = status.lost
        ? '저장 폴더를 잃어 자동 백업이 꺼졌어요. 폴더를 다시 고르면 바로 켜져요.'
        : warn
        ? '아직 이 기기에서 저장 폴더를 고르지 않았어요. 고르면 그때부터 켜져요.'
        : '폴더를 한 번만 고르면, 그다음부터 하루 한 번 알아서 백업해요.';
    Widget step(int n, String text) => Padding(
      padding: const EdgeInsets.only(top: AppSpace.xxs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            excludeSemantics: true,
            child: CircleAvatar(
              radius: 11,
              backgroundColor: scheme.primary,
              child: Text(
                '$n',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: scheme.onPrimary,
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpace.xs),
          Expanded(
            child: Text('$n단계. $text', style: theme.textTheme.bodyMedium),
          ),
        ],
      ),
    );
    return Container(
      key: const ValueKey('backup-guide'),
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      padding: const EdgeInsets.all(AppSpace.sm),
      decoration: BoxDecoration(
        color: warn ? scheme.errorContainer : scheme.secondaryContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            '자동 백업 켜는 법',
            style: theme.textTheme.titleSmall?.copyWith(
              color: warn
                  ? scheme.onErrorContainer
                  : scheme.onSecondaryContainer,
            ),
          ),
          const SizedBox(height: AppSpace.xxs),
          Text(lead, style: theme.textTheme.bodyMedium),
          step(1, '아래 「폴더 고르기」를 눌러요.'),
          step(2, '「다운로드」나 드라이브 안에 「로사리움 백업」 같은 폴더를 만들어 골라요.'),
          step(3, '「이 폴더 사용」 → 「허용」을 눌러요. 앱을 지워도 그 폴더의 파일은 남아요.'),
          const SizedBox(height: AppSpace.xs),
          FilledButton.icon(
            key: const ValueKey('backup-guide-pick'),
            style: _filled,
            icon: const Icon(Icons.folder_open),
            label: Text(warn ? '폴더 다시 고르기' : '폴더 고르기'),
            onPressed: () => unawaited(enableAutoBackup(context, service)),
          ),
        ],
      ),
    );
  }
}

/// 「기록이 갑자기 줄었어요」 — 금고가 찾은 되살리기 제안. 사람이 고르기 전엔 아무것도 덮지 않는다.
class BackupRestoreOfferCard extends StatelessWidget {
  const BackupRestoreOfferCard({super.key, required this.service});

  final BackupService service;

  @override
  Widget build(BuildContext context) {
    final offer = service.vault.offer;
    if (offer == null) return const SizedBox.shrink();
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final (title, body) = restoreOfferText(offer);
    return Card.filled(
      key: const ValueKey('backup-restore-offer'),
      color: scheme.tertiaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(Icons.restore, color: scheme.onTertiaryContainer),
                const SizedBox(width: AppSpace.xs),
                Expanded(
                  child: Text(
                    title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: scheme.onTertiaryContainer,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.xxs),
            Text(
              body,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.onTertiaryContainer,
              ),
            ),
            const SizedBox(height: AppSpace.xs),
            Wrap(
              alignment: WrapAlignment.end,
              spacing: AppSpace.xs,
              children: [
                TextButton(
                  key: const ValueKey('restore-offer-keep'),
                  style: _text,
                  onPressed: () => unawaited(confirmKeepAsIs(context, service)),
                  child: const Text('이대로 둘게요'),
                ),
                FilledButton(
                  key: const ValueKey('restore-offer-open'),
                  style: _filled,
                  onPressed: () =>
                      unawaited(openRestoreSheet(context, service)),
                  child: const Text('되살릴 사본 보기'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

(String, String) restoreOfferText(RestoreOffer o) {
  final when = _dateTime(o.at);
  return switch (o.reason) {
    'empty' => (
      '이 기기에 남아 있던 기록을 찾았어요',
      '$when 사본 · 기도 기록 ${_count(o.beforeRecords)}개 · 설정 ${_count(o.beforeSettings)}가지. '
          '되살릴까요? 고르기 전엔 아무것도 바뀌지 않아요.',
    ),
    'prefs' => (
      '설정이 모두 비어 있어요',
      '$when 사본에는 설정 ${_count(o.beforeSettings)}가지가 있어요. 되살릴 수 있어요.',
    ),
    _ => (
      '기도 기록이 갑자기 줄었어요',
      '$when 사본: ${_count(o.beforeRecords)}개 → 지금: ${_count(o.nowRecords)}개. '
          '사본에서 되살릴 수 있어요. 지금 기록은 지우지 않고 합쳐요.',
    ),
  };
}

Future<void> confirmKeepAsIs(
  BuildContext context,
  BackupService service,
) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (c) => AlertDialog(
      title: const Text('지금 상태로 둘까요?'),
      content: const Text(
        '사본은 지우지 않아요. 마음이 바뀌면 설정 › 백업과 복원 › 「기기 안 사본에서 되살리기」에서 언제든 고를 수 있어요.',
      ),
      actions: [
        TextButton(
          style: _text,
          onPressed: () => Navigator.of(c).pop(false),
          child: const Text('취소'),
        ),
        FilledButton.tonal(
          style: _filled,
          onPressed: () => Navigator.of(c).pop(true),
          child: const Text('이대로 두기'),
        ),
      ],
    ),
  );
  if (ok == true) await service.dismissRestoreOffer();
}

// ---- 안내 카드(오늘 화면) ------------------------------------------------------

/// 오늘 화면 위쪽: 되살리기 제안이 있으면 그것, 없으면 백업 안내 하나. 언제든 닫을 수 있다.
class BackupHomeCard extends StatelessWidget {
  const BackupHomeCard({super.key, required this.service});

  final BackupService service;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: service,
      builder: (context, _) {
        if (service.vault.offer != null) {
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpace.md),
            child: BackupRestoreOfferCard(service: service),
          );
        }
        final kind = service.nudge;
        if (kind == null) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.md),
          child: BackupNudgeCard(service: service, kind: kind),
        );
      },
    );
  }
}

class BackupNudgeCard extends StatelessWidget {
  const BackupNudgeCard({super.key, required this.service, required this.kind});

  final BackupService service;
  final BackupNudgeKind kind;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final now = service.now;
    final last = service.lastBackupAt;
    final autoOk = service.auto.status.supported;
    final lastText = last == null ? '아직 없어요' : backupWhen(last, now);
    final warn =
        kind == BackupNudgeKind.folderLost ||
        kind == BackupNudgeKind.autoFailing;

    final (String title, String body) = switch (kind) {
      BackupNudgeKind.folderLost => (
        '자동 백업이 멈췄어요',
        '저장 폴더를 쓸 수 없어요(권한이 사라졌거나 폴더가 지워졌어요). 폴더를 다시 고르면 바로 이어서 백업해요.',
      ),
      BackupNudgeKind.firstBackup => (
        '기도 기록을 지켜 두세요',
        autoOk
            ? '폴더를 한 번 고르면 하루 한 번 알아서 백업해요. 앱을 지워도 그 폴더의 파일은 남아요.'
            : '백업 파일을 하나 저장해 두면 폰을 바꿔도 기록을 되살릴 수 있어요.',
      ),
      BackupNudgeKind.autoFailing => (
        '자동 백업이 안 되고 있어요',
        '마지막 백업: $lastText. 지금 파일로 저장하거나 폴더를 다시 골라 주세요.',
      ),
      BackupNudgeKind.stale => (
        '백업한 지 오래됐어요',
        '마지막 백업: $lastText. ${autoOk ? '자동 백업을 켜 두면 신경 쓰지 않아도 돼요.' : '파일로 한 번 저장해 두세요.'}',
      ),
      BackupNudgeKind.monthlyFile => (
        '한 달에 한 번, 파일로도 남겨 두세요',
        '폰을 잃어버려도 꺼낼 수 있게 드라이브나 다운로드에 백업 파일을 하나 저장해 두면 좋아요.',
      ),
    };

    final actions = <Widget>[];
    void primary(String label, VoidCallback onTap) => actions.add(
      FilledButton.tonal(
        key: const ValueKey('nudge-primary'),
        style: _filled,
        onPressed: onTap,
        child: Text(label),
      ),
    );
    void secondary(String label, VoidCallback onTap) => actions.add(
      TextButton(
        key: const ValueKey('nudge-secondary'),
        style: _text,
        onPressed: onTap,
        child: Text(label),
      ),
    );
    void save() => unawaited(saveBackupFile(context, service));
    void enable({bool repick = false}) =>
        unawaited(enableAutoBackup(context, service, repick: repick));

    switch (kind) {
      case BackupNudgeKind.folderLost:
        primary('폴더 다시 고르기', () => enable(repick: true));
        secondary('파일로 저장', save);
      case BackupNudgeKind.firstBackup:
      case BackupNudgeKind.stale:
        if (autoOk) {
          primary('자동 백업 켜기', enable);
          secondary('파일로 한 번 저장', save);
        } else {
          primary('파일로 저장', save);
        }
      case BackupNudgeKind.autoFailing:
        primary('파일로 저장', save);
        secondary('폴더 다시 고르기', () => enable(repick: true));
      case BackupNudgeKind.monthlyFile:
        primary('파일로 저장', save);
    }

    return Card.filled(
      key: ValueKey('backup-nudge-${kind.name}'),
      color: warn ? scheme.errorContainer : scheme.secondaryContainer,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpace.sm,
          AppSpace.xs,
          AppSpace.xxs,
          AppSpace.xs,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Icon(
                    warn
                        ? Icons.cloud_off_outlined
                        : Icons.cloud_upload_outlined,
                    color: warn
                        ? scheme.onErrorContainer
                        : scheme.onSecondaryContainer,
                  ),
                ),
                const SizedBox(width: AppSpace.xs),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: theme.textTheme.titleMedium),
                        const SizedBox(height: AppSpace.xxs),
                        Text(body, style: theme.textTheme.bodyMedium),
                      ],
                    ),
                  ),
                ),
                IconButton(
                  key: const ValueKey('nudge-close'),
                  tooltip: '닫기',
                  icon: const Icon(Icons.close),
                  onPressed: () => unawaited(service.dismissNudge(kind)),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(right: AppSpace.xs),
              child: Wrap(
                alignment: WrapAlignment.end,
                spacing: AppSpace.xs,
                children: actions.reversed.toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 앱을 열었을 때 금고가 「줄어듦」을 찾았으면 한 번 묻는다(닫아도 설정·오늘 화면 카드로 남는다).
class BackupOfferWatcher extends StatefulWidget {
  const BackupOfferWatcher({
    super.key,
    required this.service,
    required this.child,
  });

  final BackupService? service;
  final Widget child;

  @override
  State<BackupOfferWatcher> createState() => _BackupOfferWatcherState();
}

class _BackupOfferWatcherState extends State<BackupOfferWatcher> {
  bool _asked = false;

  @override
  void initState() {
    super.initState();
    widget.service?.addListener(_check);
    WidgetsBinding.instance.addPostFrameCallback((_) => _check());
  }

  @override
  void dispose() {
    widget.service?.removeListener(_check);
    super.dispose();
  }

  void _check() {
    final s = widget.service;
    if (_asked || s == null || !mounted) return;
    final offer = s.vault.offer;
    if (offer == null) return;
    _asked = true;
    final (title, body) = restoreOfferText(offer);
    unawaited(() async {
      final open = await showDialog<bool>(
        context: context,
        builder: (c) => AlertDialog(
          icon: const Icon(Icons.restore),
          title: Text(title),
          content: Text(body),
          actions: [
            TextButton(
              style: _text,
              onPressed: () => Navigator.of(c).pop(false),
              child: const Text('나중에'),
            ),
            FilledButton(
              style: _filled,
              onPressed: () => Navigator.of(c).pop(true),
              child: const Text('되살릴 사본 보기'),
            ),
          ],
        ),
      );
      if (open == true && mounted) await openRestoreSheet(context, s);
    }());
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// 설정 안내 줄에 쓰는 폴더 상태 문구(진단용 화면 등).
String folderStateText(FolderState s) => switch (s) {
  FolderState.ok => '쓸 수 있어요',
  FolderState.never => '아직 고르지 않았어요',
  FolderState.noPermission => '권한이 없어요(다시 골라 주세요)',
  FolderState.readOnly => '읽기만 할 수 있어요',
  FolderState.gone => '폴더가 없어졌어요',
  FolderState.noCreate => '이 폴더에는 파일을 만들 수 없어요',
  FolderState.error => '확인하지 못했어요',
  FolderState.unsupported => '이 기기에서는 쓸 수 없어요',
};
