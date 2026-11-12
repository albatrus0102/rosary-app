import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

import '../app/theme.dart';

/// 인증 화면 공통 최대 폭(dp).
const double authMaxWidth = 560;

/// 가운데 정렬·최대 폭 제한·좌우 여백을 맞춘 본문 래퍼.
class AuthColumn extends StatelessWidget {
  const AuthColumn({super.key, required this.child, this.padding});

  final Widget child;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    // heightFactor: 세로로는 자식 높이만큼만 차지한다(하단 바 등에서 화면을 다 채우지 않도록).
    return Center(
      heightFactor: 1,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: authMaxWidth),
        child: Padding(
          padding:
              padding ?? const EdgeInsets.symmetric(horizontal: AppSpace.sm),
          child: child,
        ),
      ),
    );
  }
}

/// 오류 문구: 스크린 리더가 바로 읽도록 liveRegion으로 알린다(WCAG 4.1.3).
/// 색만으로 구분하지 않도록 아이콘을 함께 둔다.
class LiveErrorText extends StatelessWidget {
  const LiveErrorText(this.message, {super.key});

  final String? message;

  @override
  Widget build(BuildContext context) {
    final msg = message;
    if (msg == null || msg.isEmpty) return const SizedBox.shrink();
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      liveRegion: true,
      container: true,
      label: '오류: $msg',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.only(top: AppSpace.xs),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.error_outline, size: 20, color: scheme.error),
            const SizedBox(width: AppSpace.xs),
            Expanded(
              child: Text(
                msg,
                style: Theme.of(context).textTheme.bodyMedium
                    ?.copyWith(color: scheme.error),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// SnackBar를 보여 주고, 스크린 리더에도 한 번 알린다.
void showAuthSnack(BuildContext context, String message) {
  final messenger = ScaffoldMessenger.maybeOf(context);
  if (messenger == null) return;
  messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
  SemanticsService.sendAnnouncement(
    View.of(context),
    message,
    Directionality.of(context),
  );
}

/// 키보드 포커스가 잘 보이도록(WCAG 2.4.7·2.4.11) 포커스 때 굵은 테두리를 더한다.
BorderSide? focusSide(
  Set<WidgetState> states,
  ColorScheme scheme, {
  BorderSide? base,
}) {
  if (states.contains(WidgetState.focused)) {
    return BorderSide(color: scheme.primary, width: 3);
  }
  return base;
}
