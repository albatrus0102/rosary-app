import 'package:flutter/material.dart';

import '../../app/theme.dart';
import '../church_constants.dart';
import 'avatar_config.dart';
import 'avatar_preview.dart';
import 'baptismal_name_picker.dart';

export 'baptismal_name_picker.dart'
    show BaptismalNameScreen, showBaptismalNamePicker;

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

/// 성별 선택: M3 세그먼트 버튼(두 칸, 하나만 선택). 처음 화면의 핵심 선택이라 높이 56dp.
class GenderPicker extends StatelessWidget {
  const GenderPicker({super.key, required this.value, required this.onChanged});

  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: SegmentedButton<int>(
        key: const ValueKey('gender-picker'),
        segments: [
          for (final (v, icon, label) in const [
            (avatarFemale, Icons.female, '여성'),
            (avatarMale, Icons.male, '남성'),
          ])
            // 아이콘을 라벨 안에 둔다: ButtonSegment.icon 을 쓰면 칸 여백이 고정(8dp)되어
            // 56dp 높이를 만들 수 없다.
            ButtonSegment(
              value: v,
              label: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 18),
                  const SizedBox(width: AppSpace.xs),
                  Flexible(child: Text(label)),
                ],
              ),
            ),
        ],
        // 선택 표시는 체크 대신 성별 아이콘을 그대로 둔다(아이콘이 뜻을 전한다).
        showSelectedIcon: false,
        // 세그먼트 버튼은 minimumSize 를 칸에 넘기지 않으므로 세로 여백으로 56dp 를 만든다.
        style: const ButtonStyle(
          padding: WidgetStatePropertyAll(
            EdgeInsets.symmetric(horizontal: 12, vertical: 18),
          ),
        ),
        selected: {value},
        onSelectionChanged: (s) => onChanged(s.first),
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
        // M3 선택형 카드: 선택 시 secondaryContainer + primary 2dp 윤곽, 아니면 outlineVariant.
        color: selected
            ? scheme.secondaryContainer
            : scheme.surfaceContainerLow,
        shape: RoundedRectangleBorder(
          borderRadius: AppShape.medium,
          side: BorderSide(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: selected ? 2 : 1,
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
                        ? scheme.onSecondaryContainer
                        : scheme.onSurface,
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
              duration: AppMotion.of(context, Durations.short2),
              curve: Easing.standard,
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

/// 지금 세례명을 보여 주는 M3 목록 줄('루치아 >'). 줄 전체를 누르면 세례명 고르기 화면이 열린다.
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
      color: scheme.onSurface,
      fontWeight: FontWeight.w700,
    );
    return Semantics(
      container: true,
      button: true,
      label: '세례명 ${config.nameText}, 눌러서 바꾸기',
      excludeSemantics: true,
      onTap: () => _open(context),
      child: Card(
        key: const ValueKey('name-chip'),
        margin: EdgeInsets.zero,
        elevation: 0,
        color: scheme.surfaceContainerLow,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: AppShape.medium,
          side: BorderSide(color: scheme.outlineVariant),
        ),
        child: ListTile(
          key: const ValueKey('name-change'),
          minTileHeight: 56,
          contentPadding: const EdgeInsetsDirectional.only(start: 16, end: 8),
          // 긴 이름('히야친토 조르다노 안살로네' 등)은 두 줄까지, 그래도 넘치면 말줄임.
          title: Text(
            config.nameText,
            style: nameStyle,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          trailing: Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
          onTap: () => _open(context),
        ),
      ),
    );
  }
}
