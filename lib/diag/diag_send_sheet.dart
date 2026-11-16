import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../analytics/device_reporter.dart';
import '../app/app_services.dart';
import '../app/theme.dart';
import '../backup/backup_format.dart';
import '../backup/backup_platform.dart';
import 'diag_recorder.dart';
import 'diag_report.dart';
import 'diag_sources.dart';

/// 「오류 기록 보내기」 시트를 연다(더보기 › 문제 알리기, 「문제가 생겼어요」 안내의 「기록 보내기」).
///
/// 무엇이 담기는지 짧게 보여 주고, 사용자가 **공유하기**(안드로이드 공유 시트) 또는 **파일로 저장**(다운로드 등
/// 고른 자리)을 눌렀을 때만 파일이 기기 밖으로 나간다. 자동 전송은 없다.
Future<void> showDiagSendSheet(BuildContext context) {
  final services = AppServicesScope.maybeOf(context);
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    routeSettings: const RouteSettings(name: DiagSendSheet.routeName),
    builder: (_) => DiagSendSheet(
      recorder: DiagRecorder.instance,
      platform:
          DiagSendSheet.debugPlatform ??
          services?.backup?.platform ??
          MethodChannelBackupPlatform(),
      services: services,
      deviceInfo:
          DiagSendSheet.debugDeviceInfo ?? const PlatformDeviceInfoProvider(),
    ),
  );
}

class DiagSendSheet extends StatefulWidget {
  const DiagSendSheet({
    super.key,
    required this.recorder,
    required this.platform,
    required this.deviceInfo,
    this.services,
    this.now,
  });

  static const String routeName = 'diag_send';

  /// 시험용: 기기 정보·공유 통로를 바꾼다.
  @visibleForTesting
  static DeviceInfoProvider? debugDeviceInfo;
  @visibleForTesting
  static BackupPlatform? debugPlatform;

  final DiagRecorder recorder;
  final BackupPlatform platform;
  final DeviceInfoProvider deviceInfo;
  final AppServices? services;
  final DateTime Function()? now;

  static const String intro =
      '앱에서 생긴 오류와 최근 동작(화면 이동, 기도 시작 같은 것)을 파일 하나로 묶어요. '
      '이 파일을 보고 무엇이 잘못됐는지 찾아볼게요.';
  static const String privacy = '기도 의향·세례명·직접 쓴 글·계정 정보는 담지 않아요.';
  static const String noAuto =
      '자동으로 보내지 않아요. 아래 단추로 직접 보내거나 저장할 때만 기기 밖으로 나가요.';

  @override
  State<DiagSendSheet> createState() => _DiagSendSheetState();
}

class _DiagSendSheetState extends State<DiagSendSheet> {
  DeviceInfoSnapshot? _device;
  SharedPreferences? _prefs;
  bool _ready = false;
  bool _attachBackup = false;
  bool _busy = false;
  String? _status;

  DateTime _now() => widget.now?.call() ?? DateTime.now();

  @override
  void initState() {
    super.initState();
    unawaited(_prepare());
  }

  Future<void> _prepare() async {
    try {
      // 안드로이드 쪽에 쌓인 예외를 먼저 옮겨 이번 파일에 들어가게 한다.
      await DiagNative.drain(recorder: widget.recorder);
    } catch (_) {}
    try {
      _device = await widget.deviceInfo.read();
    } catch (_) {}
    try {
      _prefs =
          widget.services?.backup?.prefs ??
          await SharedPreferences.getInstance();
    } catch (_) {}
    if (mounted) setState(() => _ready = true);
  }

  Map<String, Object?> _header() => DiagReport.header(
    recorder: widget.recorder,
    now: _now(),
    device: _device,
    prefs: _prefs,
    stats: widget.services?.stats,
    backup: widget.services?.backup,
  );

  String _build() => DiagReport.build(
    recorder: widget.recorder,
    now: _now(),
    device: _device,
    prefs: _prefs,
    stats: widget.services?.stats,
    backup: widget.services?.backup,
  );

  Future<void> _send({required bool save}) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _status = null;
    });
    final now = _now();
    final name = DiagReport.fileName(now);
    final backup = widget.services?.backup;
    final withBackup = _attachBackup && backup != null;
    var code = 'ok';
    try {
      final text = _build();
      final backupName = BackupFormat.exportFileName(now);
      String? backupText;
      if (withBackup) {
        backupText = backup.buildDocument(source: 'diag').encode();
      }
      PlatformResult<void> r;
      if (save) {
        r = await widget.platform.saveDocument(name, text, mime: textMime);
        if (r.ok && backupText != null) {
          // 두 번째 파일: 저장 자리를 한 번 더 고른다.
          r = await widget.platform.saveDocument(backupName, backupText);
        }
      } else if (backupText != null) {
        r = await widget.platform.shareFiles([
          ShareDoc(name, text, mime: textMime),
          ShareDoc(backupName, backupText),
        ]);
      } else {
        r = await widget.platform.shareFile(name, text, mime: textMime);
      }
      code = r.code;
    } catch (e) {
      code = 'err:${e.runtimeType}';
    }
    Diag.crumb('diag_export', {
      'via': save ? 'save' : 'share',
      'backup': withBackup,
      'code': code,
    });
    if (!mounted) return;
    if (code == 'ok') {
      final messenger = ScaffoldMessenger.maybeOf(context);
      Navigator.of(context).pop();
      messenger?.showSnackBar(
        SnackBar(
          content: Text(save ? '오류 기록을 저장했어요. 고마워요.' : '보낼 곳을 골라 주세요. 고마워요.'),
        ),
      );
      return;
    }
    setState(() {
      _busy = false;
      _status = code == 'cancelled' ? null : '보내지 못했어요. 잠시 뒤 다시 해 주세요.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final header = _ready ? _header() : null;
    final lines = header == null
        ? const <String>[]
        : DiagReport.previewLines(header, recorder: widget.recorder);
    final hasBackup = widget.services?.backup != null;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(
        AppSpace.md,
        0,
        AppSpace.md,
        AppSpace.md,
      ),
      child: Column(
        key: const ValueKey('diag-sheet'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('오류 기록 보내기', style: theme.textTheme.titleLarge),
          const SizedBox(height: AppSpace.sm),
          Text(DiagSendSheet.intro, style: theme.textTheme.bodyMedium),
          const SizedBox(height: AppSpace.sm),
          Text(
            DiagSendSheet.privacy,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: AppSpace.xs),
          Text(
            DiagSendSheet.noAuto,
            key: const ValueKey('diag-no-auto'),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: AppSpace.md),
          Card.filled(
            color: scheme.surfaceContainerHigh,
            margin: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.all(AppSpace.md),
              child: Column(
                key: const ValueKey('diag-preview'),
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('담기는 내용', style: theme.textTheme.titleSmall),
                  const SizedBox(height: AppSpace.xs),
                  if (!_ready)
                    const Padding(
                      padding: EdgeInsets.all(AppSpace.sm),
                      child: Center(
                        child: SizedBox.square(
                          dimension: 24,
                          child: CircularProgressIndicator(strokeWidth: 3),
                        ),
                      ),
                    ),
                  for (final l in lines)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        '· $l',
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall,
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (hasBackup) ...[
            const SizedBox(height: AppSpace.sm),
            SwitchListTile(
              key: const ValueKey('diag-attach-backup'),
              contentPadding: EdgeInsets.zero,
              title: const Text('백업 파일도 함께 붙이기'),
              subtitle: const Text(
                '기도 기록과 설정이 든 백업 파일이에요. 문제를 똑같이 다시 만들어 볼 때 도움이 돼요.',
              ),
              value: _attachBackup,
              onChanged: _busy
                  ? null
                  : (v) => setState(() => _attachBackup = v),
            ),
          ],
          if (_status != null) ...[
            const SizedBox(height: AppSpace.sm),
            Text(
              _status!,
              key: const ValueKey('diag-status'),
              style: theme.textTheme.bodyMedium?.copyWith(color: scheme.error),
            ),
          ],
          const SizedBox(height: AppSpace.md),
          Wrap(
            alignment: WrapAlignment.end,
            spacing: AppSpace.sm,
            runSpacing: AppSpace.sm,
            children: [
              OutlinedButton.icon(
                key: const ValueKey('diag-save'),
                onPressed: _ready && !_busy ? () => _send(save: true) : null,
                icon: const Icon(Icons.download_outlined),
                label: const Text('파일로 저장'),
              ),
              FilledButton.icon(
                key: const ValueKey('diag-share'),
                onPressed: _ready && !_busy ? () => _send(save: false) : null,
                icon: const Icon(Icons.share_outlined),
                label: const Text('공유하기'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// 예상하지 못한 오류가 생기면 한 번(실행마다) 「문제가 생겼어요 · 기록 보내기」 안내를 띄운다.
/// 앱 셸을 감싼다(MaterialApp 안 — ScaffoldMessenger·Navigator 가 있는 곳).
class DiagErrorWatcher extends StatefulWidget {
  const DiagErrorWatcher({super.key, required this.child, this.recorder});

  final Widget child;
  final DiagRecorder? recorder;

  static bool _shownThisSession = false;

  /// 이번 실행에서 안내를 이미 띄웠는가.
  static bool get shownThisSession => _shownThisSession;

  @visibleForTesting
  static void debugReset() => _shownThisSession = false;

  @override
  State<DiagErrorWatcher> createState() => _DiagErrorWatcherState();
}

class _DiagErrorWatcherState extends State<DiagErrorWatcher> {
  // 붙일 때의 기록기를 쥔다(떼는 쪽과 같은 것에서 떼게).
  late final DiagRecorder _r = widget.recorder ?? DiagRecorder.instance;
  bool _scheduled = false;

  @override
  void initState() {
    super.initState();
    _r.unexpected.addListener(_onError);
    if (_r.unexpected.value > 0) _onError();
  }

  @override
  void dispose() {
    _r.unexpected.removeListener(_onError);
    super.dispose();
  }

  void _onError() {
    // 빌드·배치 중에 불릴 수 있다 — 다음 프레임 뒤에 띄운다.
    if (DiagErrorWatcher._shownThisSession || _scheduled) return;
    _scheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scheduled = false;
      if (!mounted || DiagErrorWatcher._shownThisSession) return;
      final messenger = ScaffoldMessenger.maybeOf(context);
      if (messenger == null) return;
      DiagErrorWatcher._shownThisSession = true;
      Diag.crumb('diag_snack_shown');
      messenger.showSnackBar(
        SnackBar(
          key: const ValueKey('diag-snack'),
          content: const Text('문제가 생겼어요'),
          duration: const Duration(seconds: 8),
          persist: false,
          action: SnackBarAction(
            label: '기록 보내기',
            onPressed: () {
              if (mounted) unawaited(showDiagSendSheet(context));
            },
          ),
        ),
      );
    });
    WidgetsBinding.instance.ensureVisualUpdate();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
