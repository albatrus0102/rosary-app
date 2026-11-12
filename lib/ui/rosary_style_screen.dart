import 'package:flutter/material.dart';

import '../app/rosary_style.dart';
import '../app/settings.dart';
import '../app/theme.dart';
import '../app/window_class.dart';
import 'widgets/page_body.dart';

/// 묵주 고르기 화면: 선택한 묵주 미리보기와 12종 격자.
class RosaryStyleScreen extends StatelessWidget {
  const RosaryStyleScreen({super.key, required this.settings});

  final AppSettings settings;

  static const double _maxContentWidth = 960;
  static const double _gap = AppSpace.sm;

  @override
  Widget build(BuildContext context) {
    final windowClass = windowClassOf(context);
    return Scaffold(
      body: ListenableBuilder(
        listenable: settings,
        builder: (context, _) {
          final selected = settings.rosaryStyle;
          final preview = _StylePreview(style: selected);
          final grid = _StyleGrid(
            columns: switch (windowClass) {
              WindowClass.compact => 3,
              WindowClass.medium => 4,
              WindowClass.expanded => 3,
            },
            selected: selected,
            onSelect: (style) => settings.rosaryStyle = style,
          );
          return CustomScrollView(
            slivers: [
              const SliverAppBar.large(title: Text('묵주 고르기')),
              SliverPageBody(
                maxWidth: _maxContentWidth,
                bottomPadding: AppSpace.lg,
                child: windowClass == WindowClass.expanded
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(flex: 5, child: preview),
                          const SizedBox(width: AppSpace.md),
                          Expanded(flex: 6, child: grid),
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          preview,
                          const SizedBox(height: AppSpace.md),
                          grid,
                        ],
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// 선택된 묵주의 전체 이미지, 이름, 설명.
class _StylePreview extends StatelessWidget {
  const _StylePreview({required this.style});

  final RosaryStyle style;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Card.filled(
      shape: AppShape.extraLargeBorder,
      color: scheme.surfaceContainerHigh,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360, maxHeight: 360),
              child: AspectRatio(
                aspectRatio: 1,
                child: AnimatedSwitcher(
                  duration: AppMotion.of(context, Durations.medium1),
                  switchInCurve: Easing.emphasizedDecelerate,
                  switchOutCurve: Easing.emphasizedAccelerate,
                  child: Image.asset(
                    style.fullImage,
                    key: ValueKey(style),
                    fit: BoxFit.cover,
                    semanticLabel: '${style.label} 그림',
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpace.md),
            child: AnimatedSize(
              duration: AppMotion.of(context, Durations.medium1),
              curve: Easing.emphasizedDecelerate,
              alignment: Alignment.topCenter,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    style.label,
                    key: const ValueKey('style_title'),
                    style: theme.textTheme.titleLarge,
                  ),
                  const SizedBox(height: AppSpace.xs),
                  Text(
                    style.description,
                    key: const ValueKey('style_description'),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
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

class _StyleGrid extends StatelessWidget {
  const _StyleGrid({
    required this.columns,
    required this.selected,
    required this.onSelect,
  });

  final int columns;
  final RosaryStyle selected;
  final ValueChanged<RosaryStyle> onSelect;

  @override
  Widget build(BuildContext context) {
    // 글자 크기를 키우면 라벨이 더 많은 줄로 나뉘므로 칸 높이도 함께 키운다.
    // 칸 = 위아래 패딩 + 이미지 48 + 간격 + 라벨 줄 수 × 줄 높이(labelMedium).
    final label = Theme.of(context).textTheme.labelMedium;
    final scaler = MediaQuery.textScalerOf(context);
    final factor = scaler.scale(12) / 12;
    final lines = factor > 1.2 ? 3 : 2;
    final lineHeight = scaler.scale(
      (label?.fontSize ?? 12) * (label?.height ?? 1.34),
    );
    final extent =
        2 * AppSpace.xs + 48 + AppSpace.xxs + lines * lineHeight + AppSpace.xs;
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: RosaryStyle.values.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columns,
        mainAxisSpacing: RosaryStyleScreen._gap,
        crossAxisSpacing: RosaryStyleScreen._gap,
        mainAxisExtent: extent,
      ),
      itemBuilder: (context, i) {
        final style = RosaryStyle.values[i];
        return _StyleCell(
          style: style,
          selected: style == selected,
          maxLines: lines,
          onTap: () => onSelect(style),
        );
      },
    );
  }
}

class _StyleCell extends StatelessWidget {
  const _StyleCell({
    required this.style,
    required this.selected,
    required this.maxLines,
    required this.onTap,
  });

  final RosaryStyle style;
  final bool selected;
  final int maxLines;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final content = InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpace.xxs,
          vertical: AppSpace.xs,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Badge(
              isLabelVisible: selected,
              largeSize: 20,
              alignment: AlignmentDirectional.topEnd,
              offset: const Offset(8, -4),
              label: Icon(Icons.check, size: 14, color: scheme.onPrimary),
              child: SizedBox(
                width: 48,
                height: 48,
                child: Image.asset(style.unitImage, fit: BoxFit.contain),
              ),
            ),
            const SizedBox(height: AppSpace.xxs),
            Text(
              style.label,
              maxLines: maxLines,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: theme.textTheme.labelMedium?.copyWith(
                color: selected ? scheme.onPrimaryContainer : null,
              ),
            ),
          ],
        ),
      ),
    );
    return Semantics(
      button: true,
      selected: selected,
      child: selected
          ? Card.filled(
              margin: EdgeInsets.zero,
              color: scheme.primaryContainer,
              child: content,
            )
          : Card.outlined(margin: EdgeInsets.zero, child: content),
    );
  }
}
