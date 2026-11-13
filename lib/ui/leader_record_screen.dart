import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:record/record.dart';

import '../app/leader_audio_store.dart';
import '../app/sound_player.dart';
import '../app/theme.dart';
import '../domain/leader_cues.dart';
import 'widgets/page_body.dart';
import 'widgets/section_header.dart';

/// 선창(앞단) 음성 녹음 관리 화면. 큐 26개를 하나씩 녹음/듣기/삭제한다.
class LeaderRecordScreen extends StatefulWidget {
  const LeaderRecordScreen({super.key, required this.store});

  final LeaderAudioStore store;

  @override
  State<LeaderRecordScreen> createState() => _LeaderRecordScreenState();
}

class _LeaderRecordScreenState extends State<LeaderRecordScreen> {
  static const _guidance =
      '본당에서 선창하시는 분의 목소리를 녹음해 두면 후창 모드에서 앞단을 들려줍니다. '
      "뒷단을 따라 바치고 '다음 구슬' 버튼이나 화면 탭으로 넘깁니다. "
      '(선창 모드의 뒷단에는 쓰이지 않고, AI 음성이나 기기 음성이 읽어 줍니다.)';

  // 화면당 하나씩, 처음 필요할 때 만든다.
  AudioRecorder? _recorder;
  AudioPlayer? _player;
  StreamSubscription<void>? _completeSub;

  String? _recordingId;
  String? _playingId;
  bool _busy = false;

  LeaderAudioStore get _store => widget.store;

  @override
  void initState() {
    super.initState();
    unawaited(_initStore());
  }

  Future<void> _initStore() async {
    try {
      await _store.init();
    } catch (e) {
      debugPrint('LeaderAudioStore.init failed: $e');
      _showMessage('저장 폴더를 열지 못했습니다.');
    }
  }

  AudioRecorder get _rec => _recorder ??= AudioRecorder();

  AudioPlayer get _pl {
    final existing = _player;
    if (existing != null) return existing;
    final player = AudioPlayer();
    _player = player;
    _completeSub = player.onPlayerComplete.listen((_) {
      if (mounted) setState(() => _playingId = null);
    });
    return player;
  }

  @override
  void dispose() {
    final recorder = _recorder;
    final recordingId = _recordingId;
    if (recorder != null) {
      // 녹음 중에 나가면 그 녹음은 버린다.
      unawaited(() async {
        try {
          if (await recorder.isRecording()) await recorder.cancel();
        } catch (_) {}
        if (recordingId != null) await _store.discardTemp(recordingId);
        await recorder.dispose();
      }());
    }
    _completeSub?.cancel();
    final player = _player;
    if (player != null) {
      unawaited(player.stop().whenComplete(player.dispose));
    }
    super.dispose();
  }

  void _showMessage(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> _startRecording(LeaderCue cue) async {
    if (_busy || _recordingId != null) return;
    setState(() => _busy = true);
    try {
      await _stopPlayback();
      await _store.init();
      final recorder = _rec;
      if (!await recorder.hasPermission()) {
        _showMessage('마이크 권한이 필요합니다. 설정에서 마이크 권한을 허용해 주세요.');
        return;
      }
      final path = _store.tempPathFor(cue.id);
      if (path.isEmpty) {
        _showMessage('저장 폴더를 열지 못했습니다.');
        return;
      }
      await _store.discardTemp(cue.id);
      // 다른 소리와 함께 쓰이도록 전역 오디오 컨텍스트를 맞춘다.
      try {
        await SoundPlayer.configureGlobalAudioContext();
      } catch (_) {}
      await recorder.start(
        const RecordConfig(
          encoder: AudioEncoder.aacLc,
          sampleRate: 44100,
          numChannels: 1,
        ),
        path: path,
      );
      if (mounted) setState(() => _recordingId = cue.id);
    } catch (e) {
      debugPrint('record start failed: $e');
      _showMessage('녹음을 시작하지 못했습니다.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _stopRecording() async {
    final id = _recordingId;
    if (id == null || _busy) return;
    setState(() => _busy = true);
    try {
      await _rec.stop();
      final ok = await _store.commitRecording(id);
      _showMessage(ok ? '녹음했습니다.' : '녹음이 저장되지 않았습니다. 다시 녹음해 주세요.');
    } catch (e) {
      debugPrint('record stop failed: $e');
      await _store.discardTemp(id);
      _showMessage('녹음을 저장하지 못했습니다.');
    } finally {
      if (mounted) {
        setState(() {
          _recordingId = null;
          _busy = false;
        });
      }
    }
  }

  Future<void> _stopPlayback() async {
    if (_playingId == null) return;
    if (mounted) setState(() => _playingId = null);
    try {
      await _player?.stop();
    } catch (_) {}
  }

  Future<void> _togglePlay(LeaderCue cue) async {
    if (_playingId == cue.id) {
      await _stopPlayback();
      return;
    }
    await _stopPlayback();
    final path = _store.pathFor(cue.id);
    if (path.isEmpty || !_store.has(cue.id)) return;
    try {
      try {
        await SoundPlayer.configureGlobalAudioContext();
      } catch (_) {}
      if (mounted) setState(() => _playingId = cue.id);
      await _pl.play(DeviceFileSource(path));
    } catch (e) {
      debugPrint('leader play failed: $e');
      if (mounted) setState(() => _playingId = null);
      _showMessage('재생하지 못했습니다.');
    }
  }

  Future<void> _delete(LeaderCue cue) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text("'${cue.title}' 녹음을 삭제할까요?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('삭제'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    if (_playingId == cue.id) await _stopPlayback();
    await _store.delete(cue.id);
  }

  @override
  Widget build(BuildContext context) {
    final cues = allLeaderCues;
    return Scaffold(
      body: ListenableBuilder(
        listenable: _store,
        builder: (context, _) => CustomScrollView(
          slivers: [
            const SliverAppBar.medium(title: Text('선창 녹음 관리')),
            SliverPageBody(
              maxWidth: 640,
              bottomPadding: AppSpace.md,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildHeader(context, cues.length),
                  const SectionHeader('기도'),
                  for (var i = 0; i < leaderPrayerCueCount; i++)
                    _buildRow(context, cues[i]),
                  const SectionHeader('신비'),
                  for (var i = leaderPrayerCueCount; i < cues.length; i++)
                    _buildRow(context, cues[i]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, int total) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final count = _store.recordedCount;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.sm),
      child: Card.filled(
        color: scheme.surfaceContainerHigh,
        child: Padding(
          padding: const EdgeInsets.all(AppSpace.sm),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('$total개 중 $count개 녹음됨', style: theme.textTheme.titleMedium),
              const SizedBox(height: AppSpace.sm),
              LinearProgressIndicator(
                value: total == 0 ? 0 : count / total,
                semanticsLabel: '녹음 진행률',
              ),
              const SizedBox(height: AppSpace.sm),
              Text(
                _guidance,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(BuildContext context, LeaderCue cue) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final has = _store.has(cue.id);
    final recording = _recordingId == cue.id;
    final playing = _playingId == cue.id;
    final otherRecording = _recordingId != null && !recording;
    // 녹음 중에는 오류색 대신 errorContainer 톤으로 바뀌고(+ 아이콘·문구) 알린다.
    final onCard = recording ? scheme.onErrorContainer : null;

    final body = Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                recording
                    ? Icons.fiber_manual_record
                    : has
                    ? Icons.check_circle
                    : Icons.radio_button_unchecked,
                color: recording
                    ? scheme.error
                    : has
                    ? scheme.primary
                    : scheme.outline,
                semanticLabel: recording
                    ? '녹음 중'
                    : has
                    ? '녹음됨'
                    : '녹음 없음',
              ),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: Text(
                  cue.title,
                  style: theme.textTheme.titleMedium?.copyWith(color: onCard),
                ),
              ),
              if (recording)
                Padding(
                  padding: const EdgeInsets.only(right: AppSpace.xs),
                  child: Text(
                    '녹음 중...',
                    style: theme.textTheme.labelMedium?.copyWith(color: onCard),
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          Text(
            cue.text,
            style: theme.textTheme.bodySmall?.copyWith(
              color: recording
                  ? scheme.onErrorContainer
                  : scheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: AppSpace.xxs),
          Wrap(
            spacing: AppSpace.xs,
            children: [
              TextButton.icon(
                style: onCard == null
                    ? null
                    : TextButton.styleFrom(foregroundColor: onCard),
                onPressed: otherRecording || _busy
                    ? null
                    : () => recording ? _stopRecording() : _startRecording(cue),
                icon: Icon(recording ? Icons.stop : Icons.mic),
                label: Text(recording ? '정지' : '녹음 시작'),
              ),
              TextButton.icon(
                onPressed: has && _recordingId == null
                    ? () => _togglePlay(cue)
                    : null,
                icon: Icon(playing ? Icons.stop : Icons.play_arrow),
                label: Text(playing ? '듣기 정지' : '듣기'),
              ),
              TextButton.icon(
                onPressed: has && _recordingId == null
                    ? () => _delete(cue)
                    : null,
                icon: const Icon(Icons.delete_outline),
                label: const Text('삭제'),
              ),
            ],
          ),
        ],
      ),
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.sm),
      child: recording
          ? Card.filled(color: scheme.errorContainer, child: body)
          : Card.outlined(child: body),
    );
  }
}
