import 'package:flutter/material.dart';

import '../app/rosary_style.dart';
import '../app/settings.dart';
import '../app/theme.dart';
import '../domain/prayer_data.dart';

/// 성당 '기도하기' 시트에서 고른 것: 종류와(묵주기도라면) 바칠 신비.
@immutable
class ChurchPrayerPick {
  const ChurchPrayerPick(this.kind, [this.mysterySet]);

  final ChurchPrayerChoice kind;

  /// [ChurchPrayerChoice.rosary]일 때 바칠 신비. 잠시 기도하기면 null.
  final MysterySet? mysterySet;
}

/// 제대 앞 '기도하기' 시트(SPEC §32): '잠시 기도하기' | '묵주기도 하기'. 고르면 바로 닫히며 돌려준다(닫으면 null).
///
/// 지난번에 고른 항목([AppSettings.churchPrayerChoice], 기본은 잠시 기도하기)을 강조한다.
/// 묵주기도의 신비는 이어 하던 것([resumeSet]) → 저장된 진행분 → 홈에서 고른 신비(기본은 오늘의 신비) 순으로
/// 미리 골라 두고, '신비 바꾸기'로 바꿀 수 있다.
Future<ChurchPrayerPick?> showChurchPrayerChoiceSheet(
  BuildContext context, {
  required AppSettings settings,
  MysterySet? resumeSet,
  DateTime? now,
}) {
  return showModalBottomSheet<ChurchPrayerPick>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    builder: (context) => SafeArea(
      top: false,
      child: ChurchPrayerChoiceSheet(
        settings: settings,
        resumeSet: resumeSet,
        now: now,
      ),
    ),
  );
}

class ChurchPrayerChoiceSheet extends StatefulWidget {
  const ChurchPrayerChoiceSheet({
    super.key,
    required this.settings,
    this.resumeSet,
    this.now,
  });

  final AppSettings settings;

  /// 성당에서 바치다 일어난 묵주기도의 신비(있으면 그것을 미리 고른다).
  final MysterySet? resumeSet;

  /// 오늘 날짜(테스트용 주입).
  final DateTime? now;

  @override
  State<ChurchPrayerChoiceSheet> createState() =>
      _ChurchPrayerChoiceSheetState();
}

class _ChurchPrayerChoiceSheetState extends State<ChurchPrayerChoiceSheet> {
  late final MysterySet _today = mysterySetForWeekday(
    (widget.now ?? DateTime.now()).weekday,
  );

  /// 이어서 할 수 있는 신비(성당에서 하던 것, 없으면 저장된 진행분).
  late final MysterySet? _resume =
      widget.resumeSet ?? widget.settings.savedPrayer?.mysterySet;
  late MysterySet _set = _resume ?? widget.settings.mysterySet;
  bool _changing = false;

  String get _mysteryLine {
    final name = _set.koreanName;
    if (_set == _resume) return '이어서 하기: $name';
    if (_set == _today) return '오늘의 신비: $name';
    return name;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final last = widget.settings.churchPrayerChoice;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(
        AppSpace.sm,
        0,
        AppSpace.sm,
        AppSpace.md,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpace.sm,
              0,
              AppSpace.sm,
              AppSpace.sm,
            ),
            child: Text('어떻게 기도할까요?', style: theme.textTheme.titleMedium),
          ),
          _ChoiceTile(
            key: const ValueKey('pray-brief'),
            selected: last == ChurchPrayerChoice.brief,
            semanticsLabel: '잠시 기도하기, 제대 앞에서 고개 숙여 기도해요',
            leading: Icon(
              Icons.self_improvement_outlined,
              size: 32,
              color: scheme.onSurfaceVariant,
            ),
            title: '잠시 기도하기',
            subtitle: '제대 앞에서 고개 숙여 기도해요',
            onTap: () =>
                Navigator.of(context)
                    .pop(const ChurchPrayerPick(ChurchPrayerChoice.brief)),
          ),
          const SizedBox(height: AppSpace.xs),
          _ChoiceTile(
            key: const ValueKey('pray-rosary'),
            selected: last == ChurchPrayerChoice.rosary,
            semanticsLabel: '묵주기도 하기, $_mysteryLine',
            leading: _RosaryThumb(style: widget.settings.rosaryStyle),
            title: '묵주기도 하기',
            subtitle: '$_mysteryLine\n가까운 자리에 앉아 묵주를 들고 바쳐요',
            onTap: () =>
                Navigator.of(context)
                    .pop(ChurchPrayerPick(ChurchPrayerChoice.rosary, _set)),
          ),
          // 신비 바꾸기: 평소에는 한 줄(글자 단추)만 차지하고, 누르면 네 신비 칩이 펼쳐진다.
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              key: const ValueKey('pray-change-mystery'),
              onPressed: () => setState(() => _changing = !_changing),
              child: Text(_changing ? '신비 고르기 닫기' : '신비 바꾸기'),
            ),
          ),
          AnimatedSize(
            duration: AppMotion.of(context, Durations.short4),
            curve: Easing.standard,
            alignment: Alignment.topCenter,
            child: !_changing
                ? const SizedBox(width: double.infinity)
                : Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpace.xs,
                    ),
                    child: Wrap(
                      key: const ValueKey('pray-mystery-chips'),
                      spacing: AppSpace.xs,
                      runSpacing: AppSpace.xxs,
                      children: [
                        for (final m in MysterySet.values)
                          ChoiceChip(
                            key: ValueKey('pray-mystery-${m.name}'),
                            label: Text(
                              m == _today
                                  ? '${m.koreanName} · 오늘'
                                  : m.koreanName,
                            ),
                            selected: m == _set,
                            onSelected: (_) => setState(() => _set = m),
                          ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

/// 시트의 한 항목: 큰 터치 영역(최소 72dp), 지난번에 고른 항목은 `secondaryContainer`로 강조한다.
class _ChoiceTile extends StatelessWidget {
  const _ChoiceTile({
    super.key,
    required this.selected,
    required this.semanticsLabel,
    required this.leading,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final bool selected;
  final String semanticsLabel;
  final Widget leading;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final fg = selected ? scheme.onSecondaryContainer : scheme.onSurface;
    final fgSub = selected
        ? scheme.onSecondaryContainer
        : scheme.onSurfaceVariant;
    return Semantics(
      container: true,
      button: true,
      selected: selected,
      label: semanticsLabel,
      onTap: onTap,
      excludeSemantics: true,
      child: Material(
        color: selected
            ? scheme.secondaryContainer
            : scheme.surfaceContainerHighest,
        shape: AppShape.largeBorder,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 72),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpace.sm,
                vertical: AppSpace.xs + AppSpace.xxs,
              ),
              child: Row(
                children: [
                  SizedBox(
                    width: 48,
                    height: 48,
                    child: Center(child: leading),
                  ),
                  const SizedBox(width: AppSpace.sm),
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: fg,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          subtitle,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: fgSub,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (selected) ...[
                    const SizedBox(width: AppSpace.xs),
                    Icon(Icons.check, color: fg),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 묵주 그림: 설정에서 고른 묵주 모양의 기존 이미지를 작게 쓴다(새 에셋 없음). 못 읽으면 아이콘.
class _RosaryThumb extends StatelessWidget {
  const _RosaryThumb({required this.style});

  final RosaryStyle style;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: ShapeDecoration(
        // 묵주 그림은 밝은 바탕에서 가장 잘 보인다(라이트·다크 모두 같은 밝은 원).
        color: scheme.brightness == Brightness.dark
            ? scheme.inverseSurface
            : scheme.surface,
        shape: const CircleBorder(),
      ),
      child: ClipOval(
        child: Image.asset(
          style.fullImage,
          key: const ValueKey('pray-rosary-image'),
          width: 48,
          height: 48,
          cacheWidth: 144,
          fit: BoxFit.cover,
          excludeFromSemantics: true,
          errorBuilder: (context, error, stack) => Icon(
            Icons.blur_circular,
            key: const ValueKey('pray-rosary-icon'),
            size: 28,
            color: scheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}
