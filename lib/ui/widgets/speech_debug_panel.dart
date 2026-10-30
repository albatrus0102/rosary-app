import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:rosary_app/app/theme.dart';

import '../../speech/amen_detector.dart';

/// 음성 인식 진단 패널: 상태, 입력 음량, 최근 인식 글자, 감지 횟수, 마지막 오류.
class SpeechDebugPanel extends StatelessWidget {
  const SpeechDebugPanel({super.key, required this.detector});

  final AmenDetector detector;

  static String tail(String text, [int max = 80]) =>
      text.length <= max ? text : text.substring(text.length - max);

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final d = detector;
    final diag = d is DiagnosticAmenDetector ? d : null;
    final style = TextStyle(
      fontFamily: AppTheme.sansFamily,
      fontSize: 12,
      height: 1.35,
      color: scheme.onSurfaceVariant,
    );

    return DecoratedBox(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: ListenableBuilder(
          listenable: Listenable.merge([
            d.state,
            if (diag != null) ...[diag.transcript, diag.phraseCount],
          ]),
          builder: (context, _) {
            final transcript = diag?.transcript.value ?? d.lastTranscript ?? '';
            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('state: ${d.state.value.name}', style: style),
                if (diag != null)
                  Row(
                    children: [
                      Text('level: ', style: style),
                      Expanded(child: LevelBar(level: diag.inputLevel)),
                    ],
                  ),
                Text(
                  'text: ${tail(transcript).isEmpty ? '-' : tail(transcript)}',
                  style: style,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
                if (diag != null) ...[
                  Text('phrases: ${diag.phraseCount.value}', style: style),
                  if (diag.lastError != null)
                    Text(
                      'error: ${diag.lastError}',
                      style: style.copyWith(color: scheme.error),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

/// 0..1 음량을 가로 막대로 보여준다.
class LevelBar extends StatelessWidget {
  const LevelBar({super.key, required this.level, this.height = 8});

  final ValueListenable<double> level;
  final double height;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<double>(
      valueListenable: level,
      builder: (context, v, _) => ClipRRect(
        borderRadius: BorderRadius.circular(height / 2),
        child: LinearProgressIndicator(
          value: v.clamp(0.0, 1.0),
          minHeight: height,
        ),
      ),
    );
  }
}
