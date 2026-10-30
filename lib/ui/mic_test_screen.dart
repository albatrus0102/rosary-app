import 'dart:async';

import 'package:flutter/material.dart';
import 'package:rosary_app/app/theme.dart';

import '../speech/amen_detector.dart';
import '../speech/sherpa_amen_detector.dart';
import 'widgets/speech_debug_panel.dart';

/// 마이크와 음성 인식기가 "아멘"을 어떻게 듣는지 확인하는 화면.
class MicTestScreen extends StatefulWidget {
  const MicTestScreen({super.key, this.detector});

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

  DiagnosticAmenDetector? get _diag {
    final d = _detector;
    return d is DiagnosticAmenDetector ? d : null;
  }

  @override
  void initState() {
    super.initState();
    _owns = widget.detector == null;
    _detector = widget.detector ?? SherpaAmenDetector();
    // 진단 정보가 없는 감지기를 위한 대체 카운터.
    _sub = _detector.amenEvents.listen((n) {
      if (_diag == null && mounted) setState(() => _fallbackCount += n);
    });
    unawaited(_detector.start());
  }

  @override
  void dispose() {
    _sub?.cancel();
    final d = _detector;
    // 소유한 감지기는 멈춘 뒤 정리한다. 주입된 것은 멈추기만 한다.
    unawaited(d.stop().then((_) => _owns ? d.dispose() : null));
    super.dispose();
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
