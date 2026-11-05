import 'package:flutter/material.dart';

import '../app/rosary_style.dart';
import '../app/settings.dart';
import '../app/window_class.dart';

/// 묵주 고르기 화면: 선택한 묵주 미리보기와 12종 격자.
class RosaryStyleScreen extends StatelessWidget {
  const RosaryStyleScreen({super.key, required this.settings});

  final AppSettings settings;

  static const double _maxContentWidth = 960;
  static const double _gap = 12;

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
              SliverToBoxAdapter(
                child: SafeArea(
                  top: false,
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(
                        maxWidth: _maxContentWidth,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                        child: windowClass == WindowClass.expanded
                            ? Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(flex: 5, child: preview),
                                  const SizedBox(width: 24),
                                  Expanded(flex: 6, child: grid),
                                ],
                              )
                            : Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  preview,
                                  const SizedBox(height: 20),
                                  grid,
                                ],
                              ),
                      ),
                    ),
                  ),
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
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      color: scheme.surfaceContainer,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360, maxHeight: 360),
              child: AspectRatio(
                aspectRatio: 1,
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  switchInCurve: Curves.easeOutCubic,
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
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            child: AnimatedSize(
              duration: const Duration(milliseconds: 250),
              curve: Curves.easeOutCubic,
              alignment: Alignment.topCenter,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    style.label,
                    key: const ValueKey('style_title'),
                    style: theme.textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    style.description,
                    key: const ValueKey('style_description'),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                      height: 1.5,
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
    final factor = MediaQuery.textScalerOf(context).scale(12) / 12;
    final lines = factor > 1.2 ? 3 : 2;
    final extent = 20 + 48 + 6 + lines * 16 * factor + 4;
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
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: BorderSide(
        color: selected ? scheme.primary : scheme.outlineVariant,
        width: selected ? 2 : 1,
      ),
    );
    final content = InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Badge(
              isLabelVisible: selected,
              backgroundColor: scheme.primary,
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
            const SizedBox(height: 6),
            Text(
              style.label,
              maxLines: maxLines,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: theme.textTheme.labelMedium?.copyWith(
                fontWeight: selected ? FontWeight.w700 : null,
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
              clipBehavior: Clip.antiAlias,
              color: scheme.primaryContainer,
              shape: shape,
              child: content,
            )
          : Card.outlined(
              margin: EdgeInsets.zero,
              clipBehavior: Clip.antiAlias,
              shape: shape,
              child: content,
            ),
    );
  }
}
