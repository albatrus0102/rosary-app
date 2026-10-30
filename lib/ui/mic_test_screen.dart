import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/app/sound_player.dart';
import 'package:rosary_app/app/theme.dart';
import 'package:share_plus/share_plus.dart';

import '../speech/amen_detector.dart';
import '../speech/sherpa_amen_detector.dart';
import 'widgets/speech_debug_panel.dart';

/// 마이크와 음성 인식기가 "아멘"을 어떻게 듣는지 확인하는 화면.
class MicTestScreen extends StatefulWidget {
  const MicTestScreen({super.key, this.detector, this.settings});

  /// 설정(민감도 높임 등). 감지기를 직접 만들 때 반영한다.
  final AppSettings? settings;

  /// 테스트용 주입. 없으면 [SherpaAmenDetector]를 만들고 화면이 정리한다.
  final AmenDetector? detector;

  @override
  State<MicTestScreen> createState() => _MicTestScreenState();
}

class _MicTestScreenState extends State<MicTestScreen> {
  late final AmenDetector _detector;
  late final bool _owns;
  StreamSubscription<int>? _sub;
  int _fallbackCount = 0;

  // 원본 오디오 녹음/재생(CapturableAmenDetector일 때만).
  static const _captureSeconds = 5;
  Timer? _countdownTimer;
  int _countdown = 0; // 0이면 녹음 중이 아님
  bool _saving = false;
  bool _playing = false;
  String? _capturePath;
  String? _captureNote;
  AudioPlayer? _player;

  CapturableAmenDetector? get _cap {
    final d = _detector;
    return d is CapturableAmenDetector ? d : null;
  }

  DiagnosticAmenDetector? get _diag {
    final d = _detector;
    return d is DiagnosticAmenDetector ? d : null;
  }

  @override
  void initState() {
    super.initState();
    _owns = widget.detector == null;
    _detector =
        widget.detector ??
        SherpaAmenDetector(
          highSensitivity: widget.settings?.highSensitivity ?? false,
        );
    // 진단 정보가 없는 감지기를 위한 대체 카운터.
    _sub = _detector.amenEvents.listen((n) {
      if (_diag == null && mounted) setState(() => _fallbackCount += n);
    });
    unawaited(_detector.start());
  }

  @override
  void dispose() {
    _sub?.cancel();
    _countdownTimer?.cancel();
    unawaited(_player?.dispose());
    final d = _detector;
    if (_countdown > 0) unawaited(_cap?.stopCapture());
    // 소유한 감지기는 멈춘 뒤 정리한다. 주입된 것은 멈추기만 한다.
    unawaited(d.stop().then((_) => _owns ? d.dispose() : null));
    super.dispose();
  }

  Future<void> _record() async {
    final cap = _cap;
    if (cap == null || _countdown > 0 || _saving || _playing) return;
    cap.startCapture();
    setState(() {
      _countdown = _captureSeconds;
      _captureNote = null;
    });
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (t) async {
      if (_countdown > 1) {
        if (mounted) setState(() => _countdown--);
        return;
      }
      t.cancel();
      if (mounted) {
        setState(() {
          _countdown = 0;
          _saving = true;
        });
      }
      try {
        final path = await cap.stopCapture();
        if (!mounted) return;
        setState(() {
          _capturePath = path ?? _capturePath;
          _captureNote = path == null ? '녹음된 소리가 없습니다' : path.split('/').last;
        });
      } catch (e) {
        if (mounted) setState(() => _captureNote = '저장 실패: $e');
      } finally {
        if (mounted) setState(() => _saving = false);
      }
    });
  }

  /// 감지기의 마이크가 켜져 있으므로 멈추고 재생한 뒤 다시 시작한다.
  Future<void> _playCapture() async {
    final path = _capturePath;
    if (path == null || _playing || _countdown > 0) return;
    setState(() => _playing = true);
    final player = _player ??= AudioPlayer();
    try {
      await _detector.stop();
      try {
        await SoundPlayer.configureGlobalAudioContext();
      } catch (_) {}
      await player.setVolume(1);
      final done = player.onPlayerComplete.first;
      await player.play(DeviceFileSource(path));
      await done.timeout(const Duration(seconds: 15), onTimeout: () {});
    } catch (e) {
      debugPrint('capture playback failed: $e');
      if (mounted) setState(() => _captureNote = '재생 실패: $e');
    } finally {
      try {
        await player.stop();
      } catch (_) {}
      if (mounted) {
        setState(() => _playing = false);
        unawaited(_detector.start());
      }
    }
  }

  Future<void> _share() async {
    final path = _capturePath;
    if (path == null) return;
    try {
      await SharePlus.instance.share(ShareParams(files: [XFile(path)]));
    } catch (e) {
      if (mounted) setState(() => _captureNote = '공유 실패: $e');
    }
  }

  Widget _buildCaptureSection(
    BuildContext context,
    CapturableAmenDetector cap,
  ) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final small = theme.textTheme.bodySmall?.copyWith(
      fontFamily: AppTheme.sansFamily,
      color: scheme.onSurfaceVariant,
    );
    final busy = _countdown > 0 || _saving || _playing;
    final hasFile = _capturePath != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _InputStatusLine(detector: cap),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: [
            FilledButton.tonal(
              onPressed: busy ? null : _record,
              child: Text(
                _countdown > 0 ? '녹음 중… $_countdown' : '$_captureSeconds초 녹음',
              ),
            ),
            FilledButton.tonal(
              onPressed: busy || !hasFile ? null : _playCapture,
              child: Text(_playing ? '재생 중…' : '들어보기'),
            ),
            FilledButton.tonal(
              onPressed: busy || !hasFile ? null : _share,
              child: const Text('공유'),
            ),
          ],
        ),
        if (_captureNote != null) ...[
          const SizedBox(height: 6),
          Text(_captureNote!, style: small, textAlign: TextAlign.center),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final diag = _diag;

    return Scaffold(
      appBar: AppBar(title: const Text('마이크 테스트'), centerTitle: true),
      body: SafeArea(
        child: ValueListenableBuilder<DetectorState>(
          valueListenable: _detector.state,
          builder: (context, state, _) {
            if (state == DetectorState.idle ||
                state == DetectorState.preparingModel) {
              return const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text('모델 준비 중…'),
                  ],
                ),
              );
            }
            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  _stateLabel(state),
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: state == DetectorState.listening
                        ? scheme.primary
                        : scheme.error,
                    fontWeight: FontWeight.w700,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                if (diag != null) ...[
                  LevelBar(level: diag.inputLevel, height: 14),
                  const SizedBox(height: 6),
                  Align(
                    alignment: Alignment.centerRight,
                    child: GainReadout(
                      detector: diag,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontFamily: AppTheme.sansFamily,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
                if (_cap != null) ...[
                  const SizedBox(height: 16),
                  _buildCaptureSection(context, _cap!),
                ],
                const SizedBox(height: 24),
                Text(
                  '"아멘"이라고 말해 보세요',
                  style: theme.textTheme.bodyLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                _AmenCounter(detector: diag, fallback: _fallbackCount),
                const SizedBox(height: 16),
                Text('인식된 글자', style: theme.textTheme.labelLarge),
                const SizedBox(height: 4),
                _Transcript(detector: _detector),
                if (diag?.lastError != null) ...[
                  const SizedBox(height: 16),
                  Text(diag!.lastError!, style: TextStyle(color: scheme.error)),
                ],
              ],
            );
          },
        ),
      ),
    );
  }

  String _stateLabel(DetectorState s) => switch (s) {
    DetectorState.listening => '듣는 중',
    DetectorState.stopped => '정지',
    DetectorState.permissionDenied => '마이크 권한이 없습니다. 기기 설정에서 허용해 주세요.',
    DetectorState.error => '음성 인식 오류',
    DetectorState.preparingModel => '모델 준비 중…',
    DetectorState.idle => '대기',
  };
}

class _AmenCounter extends StatelessWidget {
  const _AmenCounter({required this.detector, required this.fallback});

  final DiagnosticAmenDetector? detector;
  final int fallback;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget text(int n) => Text(
      '$n',
      key: const ValueKey('amen-count'),
      style: theme.textTheme.displayLarge?.copyWith(
        fontSize: 96,
        fontWeight: FontWeight.w800,
        color: theme.colorScheme.primary,
      ),
      textAlign: TextAlign.center,
    );
    final d = detector;
    if (d == null) return text(fallback);
    return ValueListenableBuilder<int>(
      valueListenable: d.amenCount,
      builder: (context, n, _) => text(n),
    );
  }
}

class _Transcript extends StatelessWidget {
  const _Transcript({required this.detector});

  final AmenDetector detector;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final d = detector;
    final style = TextStyle(
      fontFamily: AppTheme.sansFamily,
      fontSize: 18,
      color: scheme.onSurface,
    );
    Widget box(String t) => DecoratedBox(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: SizedBox(
          width: double.infinity,
          child: Text(
            t.isEmpty ? '-' : SpeechDebugPanel.tail(t, 120),
            style: style,
          ),
        ),
      ),
    );
    if (d is DiagnosticAmenDetector) {
      return ValueListenableBuilder<String>(
        valueListenable: d.transcript,
        builder: (context, t, _) => box(t),
      );
    }
    return box(d.lastTranscript ?? '');
  }
}

/// '인식기: beam+hotword · 입력 32.0 kB/s (16 kHz)' 한 줄. 입력 속도가 32000 B/s에서
/// 10% 넘게 벗어나면 빨갛게 표시한다(샘플레이트나 청크가 어긋났다는 뜻).
class _InputStatusLine extends StatelessWidget {
  const _InputStatusLine({required this.detector});

  final CapturableAmenDetector detector;

  static const expectedBytesPerSecond = 32000.0;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final base = TextStyle(
      fontFamily: AppTheme.sansFamily,
      fontSize: 13,
      color: scheme.onSurfaceVariant,
    );
    return ListenableBuilder(
      listenable: Listenable.merge([
        detector.recognizerInfo,
        detector.bytesPerSecond,
      ]),
      builder: (context, _) {
        final info = detector.recognizerInfo.value;
        final bps = detector.bytesPerSecond.value;
        final off =
            bps > 0 &&
            (bps - expectedBytesPerSecond).abs() > expectedBytesPerSecond * 0.1;
        return Text.rich(
          TextSpan(
            style: base,
            children: [
              TextSpan(text: '인식기: ${info.isEmpty ? '-' : info} · 입력 '),
              TextSpan(
                text: '${(bps / 1000).toStringAsFixed(1)} kB/s',
                style: off
                    ? TextStyle(
                        color: scheme.error,
                        fontWeight: FontWeight.w700,
                      )
                    : null,
              ),
              const TextSpan(text: ' (16 kHz)'),
            ],
          ),
          textAlign: TextAlign.center,
        );
      },
    );
  }
}
