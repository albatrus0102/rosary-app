import 'dart:math';

import 'package:flutter/material.dart';

import '../../app/settings.dart';
import '../../app/track.dart';
import '../church_constants.dart';
import 'avatar_config.dart';
import 'avatar_preview.dart';

/// 사이버 성당에서 쓸 내 아바타를 꾸미는 화면. 저장하면 [AvatarConfig]를
/// 결과로 돌려주며 닫힌다.
class AvatarEditorScreen extends StatefulWidget {
  const AvatarEditorScreen({
    super.key,
    required this.settings,
    @visibleForTesting this.random,
  });

  final AppSettings settings;
  final Random? random;

  @override
  State<AvatarEditorScreen> createState() => _AvatarEditorScreenState();
}

class _AvatarEditorScreenState extends State<AvatarEditorScreen> {
  late AvatarConfig _config = widget.settings.churchAvatar;
  late final Random _random = widget.random ?? Random();

  void _update(AvatarConfig next) => setState(() => _config = next);

  void _randomize() {
    _update(
      AvatarConfig(
        skin: _random.nextInt(AvatarConfig.skinColors.length),
        style: _random.nextInt(AvatarConfig.styleNames.length),
        hair: _random.nextInt(AvatarConfig.hairColors.length),
        outfit: _random.nextInt(AvatarConfig.outfitColors.length),
        name: _random.nextInt(baptismalNames.length),
      ),
    );
  }

  void _save() {
    widget.settings.churchAvatar = _config;
    widget.settings.churchAvatarChosen = true;
    Track.event('avatar_save');
    Navigator.of(context).pop(_config);
  }

  Future<void> _pickName() async {
    final picked = await showModalBottomSheet<int>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _NameSheet(selected: _config.name),
    );
    if (picked != null) _update(_config.copyWith(name: picked));
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          const SliverAppBar.large(title: Text('내 아바타')),
          SliverToBoxAdapter(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: AvatarPreview(config: _config, height: 240),
                        ),
                      ),
                      Align(
                        alignment: Alignment.center,
                        child: FilledButton.tonalIcon(
                          onPressed: _randomize,
                          icon: const Icon(Icons.casino_outlined),
                          label: const Text('무작위'),
                        ),
                      ),
                      const SizedBox(height: 16),
                      _Section(
                        title: '피부색',
                        child: _SwatchRow(
                          colors: AvatarConfig.skinColors,
                          labels: AvatarConfig.skinNames,
                          selected: _config.skin,
                          onSelected: (i) => _update(_config.copyWith(skin: i)),
                        ),
                      ),
                      _Section(
                        title: '머리 모양',
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (
                              var i = 0;
                              i < AvatarConfig.styleNames.length;
                              i++
                            )
                              ChoiceChip(
                                label: Text(AvatarConfig.styleNames[i]),
                                selected: _config.style == i,
                                onSelected: (_) =>
                                    _update(_config.copyWith(style: i)),
                              ),
                          ],
                        ),
                      ),
                      _Section(
                        title: '머리색',
                        child: _SwatchRow(
                          colors: AvatarConfig.hairColors,
                          labels: [
                            for (
                              var i = 0;
                              i < AvatarConfig.hairColors.length;
                              i++
                            )
                              '머리색 ${i + 1}',
                          ],
                          selected: _config.hair,
                          onSelected: (i) => _update(_config.copyWith(hair: i)),
                        ),
                      ),
                      _Section(
                        title: '옷 색',
                        child: _SwatchRow(
                          colors: AvatarConfig.outfitColors,
                          labels: [
                            for (
                              var i = 0;
                              i < AvatarConfig.outfitColors.length;
                              i++
                            )
                              '옷 색 ${i + 1}',
                          ],
                          selected: _config.outfit,
                          onSelected: (i) =>
                              _update(_config.copyWith(outfit: i)),
                        ),
                      ),
                      _Section(
                        title: '세례명',
                        child: OutlinedButton.icon(
                          onPressed: _pickName,
                          icon: const Icon(Icons.badge_outlined),
                          label: Text(baptismalNames[_config.name]),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 48),
                          ),
                        ),
                      ),
                      Text(
                        '이름표에는 세례명 목록 중 하나만 표시돼요.',
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
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _save,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                  ),
                  child: const Text('저장'),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

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

class _SwatchRow extends StatelessWidget {
  const _SwatchRow({
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

class _NameSheet extends StatelessWidget {
  const _NameSheet({required this.selected});

  final int selected;

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height * 0.6;
    return SizedBox(
      height: height,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
            child: Text('세례명', style: Theme.of(context).textTheme.titleMedium),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: baptismalNames.length,
              itemBuilder: (context, i) => ListTile(
                title: Text(baptismalNames[i]),
                selected: i == selected,
                trailing: i == selected ? const Icon(Icons.check) : null,
                onTap: () => Navigator.of(context).pop(i),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
