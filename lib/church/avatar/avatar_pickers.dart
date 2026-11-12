import 'package:flutter/material.dart';

import '../church_constants.dart';
import 'avatar_config.dart';
import 'avatar_preview.dart';

/// 글자 크기 배율(기본 1.0). 큰 글씨에서는 한 줄 배치를 세로 배치로 바꾼다.
double avatarTextScale(BuildContext context) =>
    MediaQuery.textScalerOf(context).scale(16) / 16;

/// 아바타 선택 화면의 한 구역(제목 + 내용).
class AvatarSection extends StatelessWidget {
  const AvatarSection({super.key, required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            header: true,
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(height: 6),
          child,
        ],
      ),
    );
  }
}

/// 성별 선택: 크고 분명한 두 칸(여성/남성). 높이 56dp.
class GenderPicker extends StatelessWidget {
  const GenderPicker({super.key, required this.value, required this.onChanged});

  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      key: const ValueKey('gender-picker'),
      children: [
        Expanded(
          child: _GenderChoice(
            label: '여성',
            icon: Icons.female,
            selected: value == avatarFemale,
            onTap: () => onChanged(avatarFemale),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _GenderChoice(
            label: '남성',
            icon: Icons.male,
            selected: value == avatarMale,
            onTap: () => onChanged(avatarMale),
          ),
        ),
      ],
    );
  }
}

class _GenderChoice extends StatelessWidget {
  const _GenderChoice({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fg = selected ? scheme.onPrimaryContainer : scheme.onSurfaceVariant;
    return Semantics(
      button: true,
      selected: selected,
      inMutuallyExclusiveGroup: true,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      child: Material(
        color: selected ? scheme.primaryContainer : scheme.surfaceContainerLow,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: selected ? 2.5 : 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 56),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(icon, color: fg),
                      const SizedBox(width: 6),
                      Text(
                        label,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              color: fg,
                              fontWeight: selected
                                  ? FontWeight.w700
                                  : FontWeight.w500,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 머리 모양 4종: 작은 얼굴 그림이 든 칩. 성별에 맞는 모양이 나온다.
class HairStylePicker extends StatelessWidget {
  const HairStylePicker({
    super.key,
    required this.config,
    required this.onChanged,
  });

  final AvatarConfig config;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final wide = avatarTextScale(context) <= 1.3;
    final names = config.styleNameList;
    Widget tile(int i) => _StyleTile(
      config: config.copyWith(style: i),
      label: names[i],
      selected: config.style == i,
      onTap: () => onChanged(i),
    );
    if (wide) {
      return IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < names.length; i++) ...[
              if (i > 0) const SizedBox(width: 8),
              Expanded(child: tile(i)),
            ],
          ],
        ),
      );
    }
    // 큰 글씨: 2×2
    return Column(
      children: [
        for (var r = 0; r < 2; r++) ...[
          if (r > 0) const SizedBox(height: 8),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(child: tile(r * 2)),
                const SizedBox(width: 8),
                Expanded(child: tile(r * 2 + 1)),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _StyleTile extends StatelessWidget {
  const _StyleTile({
    required this.config,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final AvatarConfig config;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      button: true,
      selected: selected,
      label: '머리 모양, $label',
      excludeSemantics: true,
      onTap: onTap,
      child: Material(
        color: selected ? scheme.primaryContainer : scheme.surfaceContainerLow,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: selected ? 2.5 : 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(4, 8, 4, 8),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                AvatarHeadThumb(config: config, height: 64),
                const SizedBox(height: 4),
                Text(
                  label,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: selected
                        ? scheme.onPrimaryContainer
                        : scheme.onSurface,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 색 견본 줄(피부색·머리색·옷색). 48dp 터치 영역.
class SwatchRow extends StatelessWidget {
  const SwatchRow({
    super.key,
    required this.colors,
    required this.labels,
    required this.selected,
    required this.onSelected,
  });

  final List<Color> colors;
  final List<String> labels;
  final int selected;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      children: [
        for (var i = 0; i < colors.length; i++)
          _Swatch(
            color: colors[i],
            label: labels[i],
            selected: i == selected,
            onTap: () => onSelected(i),
          ),
      ],
    );
  }
}

/// 48dp 터치 영역의 색 견본. 선택되면 테두리와 체크 표시가 나타난다.
class _Swatch extends StatelessWidget {
  const _Swatch({
    required this.color,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final Color color;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final onColor =
        ThemeData.estimateBrightnessForColor(color) == Brightness.dark
        ? Colors.white
        : Colors.black87;
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      child: SizedBox(
        width: 48,
        height: 48,
        child: InkResponse(
          onTap: onTap,
          radius: 26,
          child: Center(
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 120),
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
                border: Border.all(
                  color: selected ? scheme.primary : scheme.outline,
                  width: selected ? 3 : 1,
                ),
              ),
              child: selected
                  ? Icon(Icons.check, size: 20, color: onColor)
                  : null,
            ),
          ),
        ),
      ),
    );
  }
}

/// 지금 세례명을 크게 보여 주는 칩 + '바꾸기' 버튼. 누르면 이름 고르기 시트가 열린다.
class BaptismalNameField extends StatelessWidget {
  const BaptismalNameField({
    super.key,
    required this.config,
    required this.onChanged,
    this.large = false,
  });

  final AvatarConfig config;
  final ValueChanged<int> onChanged;

  /// 넓은 자리(큰 글씨 세로 배치)에서는 글자를 더 크게.
  final bool large;

  Future<void> _open(BuildContext context) async {
    final picked = await showBaptismalNamePicker(
      context,
      gender: config.gender,
      selected: config.name,
    );
    if (picked != null) onChanged(picked);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final nameStyle = (large ? text.titleLarge : text.titleMedium)?.copyWith(
      color: scheme.onPrimaryContainer,
      fontWeight: FontWeight.w700,
    );
    return Row(
      children: [
        Expanded(
          child: Semantics(
            container: true,
            label: '세례명 ${config.nameText}',
            excludeSemantics: true,
            child: Container(
              key: const ValueKey('name-chip'),
              constraints: const BoxConstraints(minHeight: 52),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              alignment: Alignment.centerLeft,
              decoration: BoxDecoration(
                color: scheme.primaryContainer,
                borderRadius: BorderRadius.circular(16),
              ),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(config.nameText, style: nameStyle, maxLines: 1),
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        OutlinedButton(
          key: const ValueKey('name-change'),
          onPressed: () => _open(context),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(64, 52),
            padding: const EdgeInsets.symmetric(horizontal: 14),
          ),
          child: const Text('바꾸기'),
        ),
      ],
    );
  }
}

/// 세례명 고르기 시트를 열고 고른 이름의 인덱스(성별 목록 기준)를 돌려준다. 닫으면 null.
Future<int?> showBaptismalNamePicker(
  BuildContext context, {
  required int gender,
  required int selected,
}) {
  return showModalBottomSheet<int>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (context) =>
        BaptismalNameSheet(gender: gender, selected: selected),
  );
}

/// 이름 검색창 + 많이 쓰는 이름 12개(큰 칩) + 가나다순 전체 목록(48dp 칸).
/// 한 번 누르면 고르고 닫힌다.
class BaptismalNameSheet extends StatefulWidget {
  const BaptismalNameSheet({
    super.key,
    required this.gender,
    required this.selected,
  });

  final int gender;
  final int selected;

  @override
  State<BaptismalNameSheet> createState() => _BaptismalNameSheetState();
}

class _BaptismalNameSheetState extends State<BaptismalNameSheet> {
  final TextEditingController _query = TextEditingController();
  late final List<int> _alphabetical = () {
    final names = baptismalNamesFor(widget.gender);
    final idx = [for (var i = 0; i < names.length; i++) i];
    idx.sort((a, b) => names[a].compareTo(names[b]));
    return idx;
  }();

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  void _pick(int i) => Navigator.of(context).pop(i);

  @override
  Widget build(BuildContext context) {
    final names = baptismalNamesFor(widget.gender);
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final scale = avatarTextScale(context);
    final columns = scale <= 1.2 ? 3 : (scale <= 1.6 ? 2 : 1);
    final searching = _query.text.trim().isNotEmpty;
    final results = searching
        ? searchBaptismalNames(widget.gender, _query.text)
        : _alphabetical;
    final height = MediaQuery.sizeOf(context).height * 0.88;

    Widget heading(String t) => Padding(
      padding: const EdgeInsets.fromLTRB(0, 16, 0, 8),
      child: Semantics(
        header: true,
        child: Text(
          t,
          style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600),
        ),
      ),
    );

    return AnimatedPadding(
      duration: const Duration(milliseconds: 100),
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height: height,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('세례명 고르기', style: text.titleLarge),
              const SizedBox(height: 12),
              TextField(
                key: const ValueKey('name-search'),
                controller: _query,
                onChanged: (_) => setState(() {}),
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: '이름으로 찾기 (예: 요, 마리)',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: searching
                      ? IconButton(
                          tooltip: '지우기',
                          icon: const Icon(Icons.close),
                          onPressed: () => setState(_query.clear),
                        )
                      : null,
                  border: const OutlineInputBorder(
                    borderRadius: BorderRadius.all(Radius.circular(16)),
                  ),
                ),
              ),
              Expanded(
                child: CustomScrollView(
                  slivers: [
                    if (!searching) ...[
                      SliverToBoxAdapter(child: heading('많이 쓰는 이름')),
                      SliverToBoxAdapter(
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (var i = 0; i < popularBaptismalCount; i++)
                              ChoiceChip(
                                key: ValueKey('name-popular-$i'),
                                label: Text(names[i]),
                                selected: widget.selected == i,
                                selectedColor: scheme.primaryContainer,
                                labelStyle: text.titleMedium?.copyWith(
                                  color: widget.selected == i
                                      ? scheme.onPrimaryContainer
                                      : scheme.onSurface,
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 12,
                                ),
                                onSelected: (_) => _pick(i),
                              ),
                          ],
                        ),
                      ),
                      SliverToBoxAdapter(child: heading('가나다순')),
                    ] else
                      SliverToBoxAdapter(
                        child: heading('찾은 이름 ${results.length}개'),
                      ),
                    if (searching && results.isEmpty)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 24),
                          child: Text(
                            '찾는 이름이 없어요. 다른 철자로 찾아 보세요.',
                            style: text.bodyMedium?.copyWith(
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ),
                    SliverPadding(
                      padding: const EdgeInsets.only(bottom: 24),
                      sliver: SliverGrid(
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: columns,
                          mainAxisExtent: 48,
                          mainAxisSpacing: 6,
                          crossAxisSpacing: 6,
                        ),
                        delegate: SliverChildBuilderDelegate((context, k) {
                          final i = results[k];
                          return _NameTile(
                            key: ValueKey('name-tile-$i'),
                            name: names[i],
                            selected: i == widget.selected,
                            onTap: () => _pick(i),
                          );
                        }, childCount: results.length),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NameTile extends StatelessWidget {
  const _NameTile({
    super.key,
    required this.name,
    required this.selected,
    required this.onTap,
  });

  final String name;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      button: true,
      selected: selected,
      label: name,
      excludeSemantics: true,
      onTap: onTap,
      child: Material(
        color: selected ? scheme.primaryContainer : scheme.surfaceContainerLow,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: selected ? 2 : 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  name,
                  maxLines: 1,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: selected
                        ? scheme.onPrimaryContainer
                        : scheme.onSurface,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
