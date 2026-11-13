import 'package:flutter/material.dart';

import '../app/settings.dart';
import '../app/theme.dart';
import 'church_catalog.dart';

/// '성당' 탭의 첫 화면(C-02): 마지막으로 간 성당의 큰 카드와 [입장], 작은 '다른 성당 고르기'.
///
/// 처음이거나 [onPick]으로 목록을 연 뒤에는 이 화면 대신 [ChurchSelectScreen]이 보인다.
class ChurchEntryCard extends StatelessWidget {
  const ChurchEntryCard({
    super.key,
    required this.info,
    required this.onEnter,
    required this.onPick,
  });

  final ChurchInfo info;
  final VoidCallback onEnter;
  final VoidCallback onPick;

  /// 마지막 성당 id가 쓸 수 있는 성당이면 그 성당, 아니면 쓸 수 있는 첫 성당(기본 성당 우선).
  static ChurchInfo lastChurch(AppSettings settings, Set<String> available) {
    final saved = ChurchCatalog.resolve(settings.churchId);
    if (available.contains(saved.id)) return saved;
    final fallback = available.contains(ChurchCatalog.defaultId)
        ? ChurchCatalog.defaultId
        : (available.isEmpty ? ChurchCatalog.defaultId : available.first);
    return ChurchCatalog.resolve(fallback);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Scaffold(
      body: SafeArea(
        // 다른 탭과 같이 위에서부터 쌓는다(가운데 정렬은 큰 화면에서 위가 휑하다).
        child: Align(
          alignment: Alignment.topCenter,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(
              AppSpace.sm,
              AppSpace.md,
              AppSpace.sm,
              AppSpace.md,
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 탭 머리줄이 이미 '가상 성당'이므로 별도 큰 제목은 두지 않는다.
                  Text(
                    '마지막으로 다녀온 성당',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: AppSpace.sm),
                  Card.filled(
                    key: const ValueKey('entry-card'),
                    margin: EdgeInsets.zero,
                    clipBehavior: Clip.antiAlias,
                    color: scheme.surfaceContainerHigh,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        AspectRatio(
                          aspectRatio: 16 / 9,
                          child: Image.asset(
                            'assets/church_thumbs/${info.id}.webp',
                            fit: BoxFit.cover,
                            excludeFromSemantics: true,
                            errorBuilder: (context, _, _) => ColoredBox(
                              color: scheme.secondaryContainer,
                              child: Icon(
                                Icons.church,
                                size: 56,
                                color: scheme.onSecondaryContainer,
                              ),
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(AppSpace.sm),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                info.nameKo,
                                key: const ValueKey('entry-name'),
                                style: theme.textTheme.titleLarge,
                              ),
                              const SizedBox(height: 4),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Padding(
                                    padding: const EdgeInsets.only(top: 2),
                                    child: Icon(
                                      Icons.place_outlined,
                                      size: 16,
                                      color: scheme.onSurfaceVariant,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      '${info.place} · ${info.kind}',
                                      style: theme.textTheme.bodyMedium
                                          ?.copyWith(
                                            color: scheme.onSurfaceVariant,
                                          ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpace.md),
                  FilledButton(
                    key: const ValueKey('entry-enter'),
                    onPressed: onEnter,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(
                        AppTheme.largeButtonHeight,
                      ),
                    ),
                    child: const Text('입장'),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    key: const ValueKey('entry-pick'),
                    onPressed: onPick,
                    style: TextButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                    ),
                    child: const Text('다른 성당 고르기'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
