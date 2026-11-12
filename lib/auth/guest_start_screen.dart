import 'package:flutter/material.dart';

import '../app/theme.dart';
import 'auth_widgets.dart';
import 'guest_start.dart';

/// 게스트 시작이 서버 쪽 사정으로 막혔을 때의 화면: 한국어 안내 + 다시 시도 +
/// 이 기기에서만 사용하기(앱은 로컬로 열리고, 저장된 동의는 나중에 올라간다).
class GuestStartErrorScreen extends StatelessWidget {
  const GuestStartErrorScreen({super.key, required this.controller});

  final GuestStartController controller;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final text = theme.textTheme;
    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: AuthColumn(
                padding: const EdgeInsets.all(AppSpace.md),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Icon(
                      Icons.cloud_off_outlined,
                      size: 56,
                      color: scheme.primary,
                    ),
                    const SizedBox(height: AppSpace.sm),
                    Semantics(
                      header: true,
                      child: Text(
                        '게스트로 시작하지 못했어요',
                        textAlign: TextAlign.center,
                        style: text.headlineSmall,
                      ),
                    ),
                    const SizedBox(height: AppSpace.xs),
                    ListenableBuilder(
                      listenable: controller,
                      builder: (context, _) => Semantics(
                        liveRegion: true,
                        child: Text(
                          controller.errorMessage ??
                              '잠시 후 다시 시도하거나, 이 기기에서만 쓰는 모드로 계속할 수 있어요.',
                          key: const Key('guest-error-message'),
                          textAlign: TextAlign.center,
                          style: text.bodyLarge?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpace.lg),
                    FilledButton(
                      key: const Key('guest-retry'),
                      onPressed: controller.retry,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(
                          AppTheme.largeButtonHeight,
                        ),
                      ),
                      child: const Text('다시 시도'),
                    ),
                    const SizedBox(height: AppSpace.xs),
                    OutlinedButton(
                      key: const Key('guest-continue-offline'),
                      onPressed: controller.continueOffline,
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(
                          AppTheme.largeButtonHeight,
                        ),
                      ),
                      child: const Text('이 기기에서만 사용하기'),
                    ),
                    const SizedBox(height: AppSpace.sm),
                    Text(
                      '이 기기에서만 쓰면 기록이 서버에 올라가지 않아요. 인터넷이 연결되면 자동으로 다시 시도해요.',
                      textAlign: TextAlign.center,
                      style: text.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
