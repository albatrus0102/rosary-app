import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart';

import '../../speech/amen_detector.dart';

/// 음성 인식 상태를 보여주는 칩.
class MicStatusChip extends StatelessWidget {
  const MicStatusChip({
    super.key,
    required this.state,
    this.lastError,
    this.enabled = true,
  });

  final ValueListenable<DetectorState> state;

  /// 오류 상태에서 탭했을 때 보여줄 메시지를 돌려준다.
  final String? Function()? lastError;

  /// false면 칩을 숨긴다(음성 꺼짐).
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    if (!enabled) return const SizedBox.shrink();
    return ValueListenableBuilder<DetectorState>(
      valueListenable: state,
      builder: (context, s, _) => _build(context, s),
    );
  }

  Widget _build(BuildContext context, DetectorState s) {
    final scheme = Theme.of(context).colorScheme;
    final (String label, Widget icon, VoidCallback? onTap) = switch (s) {
      DetectorState.idle => (
        '음성 꺼짐',
        Icon(Icons.mic_off, size: 18, color: scheme.outline),
        null,
      ),
      DetectorState.preparingModel => (
        '모델 준비 중…',
        const SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
        null,
      ),
      DetectorState.listening => (
        '듣는 중',
        Icon(Icons.mic, size: 18, color: scheme.primary),
        null,
      ),
      DetectorState.stopped => (
        '정지',
        Icon(Icons.stop_circle_outlined, size: 18, color: scheme.outline),
        null,
      ),
      DetectorState.permissionDenied => (
        '마이크 권한 없음',
        Icon(Icons.mic_off, size: 18, color: scheme.error),
        () => _snack(
          context,
          '마이크 권한이 없어 음성 인식을 쓸 수 없습니다. '
          '기기 설정에서 이 앱의 마이크 권한을 허용해 주세요. '
          '그동안은 \'다음\' 버튼이나 화면 탭으로 넘길 수 있습니다.',
        ),
      ),
      DetectorState.error => (
        '음성 인식 오류',
        Icon(Icons.error_outline, size: 18, color: scheme.error),
        () => _snack(context, lastError?.call() ?? '알 수 없는 오류가 발생했습니다.'),
      ),
    };

    final listening = s == DetectorState.listening;
    final bg = listening ? scheme.primaryContainer : null;
    if (onTap == null) {
      return Chip(
        avatar: icon,
        label: Text(label),
        backgroundColor: bg,
        visualDensity: VisualDensity.compact,
      );
    }
    return ActionChip(
      avatar: icon,
      label: Text(label),
      onPressed: onTap,
      visualDensity: VisualDensity.compact,
    );
  }

  void _snack(BuildContext context, String message) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(content: Text(message), duration: const Duration(seconds: 6)),
    );
  }
}
