/// '내가 만든' 스킨 만들기(독서공방 `openSkinBuilder`). 자유 색상환 대신 **골라 둔 견본**에서 일곱 자리 색을 고르고,
/// 이름을 붙여 저장한다. 읽기 어려운 조합은 대비 검사([customSkinProblems])가 막는다(저장 단추가 잠긴다).
library;

import 'package:flutter/material.dart';

import '../app/settings.dart';
import '../app/skins.dart';
import '../app/theme.dart';
import 'skin_picker.dart' show SkinArtView;

/// 만든 스킨을 저장한다. 문제가 있으면(이름·대비) **저장하지 않고** 이유 목록을 돌려준다(비면 저장됨).
/// [editing]이 있으면 같은 id로 덮어쓴다.
List<String> trySaveCustomSkin(
  AppSettings settings, {
  required String name,
  required SkinTokens tokens,
  CustomSkin? editing,
  bool apply = true,
  DateTime? now,
}) {
  final problems = customSkinProblems(name, tokens);
  if (problems.isNotEmpty) return problems;
  final list = settings.skinCustoms;
  final id = editing?.id ?? Skins.newCustomId(list, now);
  final skin = CustomSkin(id: id, name: name.trim(), tokens: tokens);
  settings.skinCustoms = [
    for (final c in list)
      if (c.id != id) c else skin,
    if (!list.any((c) => c.id == id)) skin,
  ];
  if (apply) {
    settings.skinId = id;
    settings.markSkinSeen(id);
    settings.skinPreviewId = null;
  }
  return const [];
}

class SkinBuilderScreen extends StatefulWidget {
  const SkinBuilderScreen({super.key, required this.settings, this.editing});

  final AppSettings settings;
  final CustomSkin? editing;

  @override
  State<SkinBuilderScreen> createState() => _SkinBuilderScreenState();
}

class _SkinBuilderScreenState extends State<SkinBuilderScreen> {
  late SkinTokens _tokens;
  late bool _dark;
  late final TextEditingController _name;
  SkinSlot _slot = SkinSlot.accent;

  @override
  void initState() {
    super.initState();
    final e = widget.editing;
    _tokens = e?.tokens ?? kSkins.first.light!;
    _dark = _tokens.isDark;
    _name = TextEditingController(text: e?.name ?? '');
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  /// 시작 색으로 쓸 수 있는 내장 스킨(계절 스킨 제외) 중 [dark] 쪽 토큰이 있는 것.
  List<AppSkin> _bases(bool dark) => [
    for (final s in kSkins)
      if (s.group == SkinGroup.basic && (dark ? s.dark : s.light) != null) s,
  ];

  void _setBrightness(bool dark) {
    if (dark == _dark) return;
    setState(() {
      _dark = dark;
      final base = _bases(dark).first;
      _tokens = (dark ? base.dark : base.light)!;
    });
  }

  void _save() {
    final problems = trySaveCustomSkin(
      widget.settings,
      name: _name.text,
      tokens: _tokens,
      editing: widget.editing,
    );
    if (problems.isEmpty) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final problems = customSkinProblems(_name.text, _tokens);
    final issues = skinContrastIssues(_tokens);
    final preview = CustomSkin(
      id: '${CustomSkin.customIdPrefix}preview',
      name: _name.text.trim().isEmpty ? '내 스킨' : _name.text.trim(),
      tokens: _tokens,
    ).toSkin();
    return Scaffold(
      appBar: AppBar(title: Text(widget.editing == null ? '스킨 만들기' : '스킨 고치기')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          _LivePreview(skin: preview),
          const SizedBox(height: 20),
          Text('시작 색', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          SegmentedButton<bool>(
            key: const ValueKey('skin-builder-brightness'),
            segments: const [
              ButtonSegment(
                value: false,
                icon: Icon(Icons.light_mode_outlined),
                label: Text('밝은 바탕'),
              ),
              ButtonSegment(
                value: true,
                icon: Icon(Icons.dark_mode_outlined),
                label: Text('어두운 바탕'),
              ),
            ],
            selected: {_dark},
            onSelectionChanged: (v) => _setBrightness(v.first),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final s in _bases(_dark))
                ActionChip(
                  key: ValueKey('skin-base-${s.id}'),
                  label: Text(s.nameKo),
                  onPressed: () =>
                      setState(() => _tokens = (_dark ? s.dark : s.light)!),
                ),
            ],
          ),
          const SizedBox(height: 20),
          Text('색 고르기', style: theme.textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(
            '자리를 누른 뒤 아래 견본에서 고르세요. 글자가 잘 읽히는 색만 모아 두었어요.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          for (final s in SkinSlot.values) ...[
            _SlotRow(
              slot: s,
              color: _tokens[s],
              selected: s == _slot,
              onTap: () => setState(() => _slot = s),
            ),
            if (s == _slot)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
                child: Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    for (final c in SkinSwatches.of(s, dark: _dark))
                      _Swatch(
                        key: ValueKey('swatch-${s.name}-${colorHex(c)}'),
                        color: c,
                        selected: c == _tokens[s],
                        onTap: () =>
                            setState(() => _tokens = _tokens.withSlot(s, c)),
                      ),
                  ],
                ),
              ),
          ],
          const SizedBox(height: 16),
          Text('이름', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          TextField(
            key: const ValueKey('skin-builder-name'),
            controller: _name,
            maxLength: CustomSkin.maxNameLength,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              hintText: '예: 우리 성당 색',
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 8),
          if (issues.isNotEmpty)
            Card.filled(
              key: const ValueKey('skin-builder-warning'),
              color: scheme.errorContainer,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '이 조합은 글자가 잘 안 보여요',
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: scheme.onErrorContainer,
                      ),
                    ),
                    const SizedBox(height: 6),
                    for (final i in issues)
                      Text(
                        '• ${i.labelKo}  ${i.ratio.toStringAsFixed(1)} : 1 (${i.min.toStringAsFixed(1)} 이상 필요)',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: scheme.onErrorContainer,
                        ),
                      ),
                  ],
                ),
              ),
            )
          else
            Row(
              key: const ValueKey('skin-builder-ok'),
              children: [
                Icon(
                  Icons.check_circle_outline,
                  size: 20,
                  color: scheme.primary,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '모든 글자가 읽기 편해요',
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
          const SizedBox(height: 16),
          FilledButton(
            key: const ValueKey('skin-builder-save'),
            style: AppTheme.heroButtonStyle(context),
            onPressed: problems.isEmpty ? _save : null,
            child: const Text('저장하고 쓰기'),
          ),
          if (problems.isNotEmpty && issues.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                problems.first,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// 고른 색으로 실제 위젯을 그려 보이는 작은 화면.
class _LivePreview extends StatelessWidget {
  const _LivePreview({required this.skin});
  final AppSkin skin;

  @override
  Widget build(BuildContext context) {
    final system = Theme.of(context).brightness;
    final data = AppTheme.forSkin(skin, system);
    return Theme(
      data: data,
      child: Builder(
        builder: (context) {
          final t = Theme.of(context);
          final s = t.colorScheme;
          return ClipRRect(
            borderRadius: AppShape.large,
            child: ColoredBox(
              key: const ValueKey('skin-builder-preview'),
              color: s.surface,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 92,
                      height: 110,
                      child: ClipRRect(
                        borderRadius: AppShape.medium,
                        child: SkinArtView(art: skin.art),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            skin.nameKo,
                            style: t.textTheme.titleMedium,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text('오늘의 묵주기도', style: t.textTheme.bodyMedium),
                          Text(
                            '환희의 신비 · 5단',
                            style: t.textTheme.bodySmall?.copyWith(
                              color: s.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            height: 2,
                            width: 80,
                            color: AppDecor.of(context).gold,
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 8,
                            runSpacing: 4,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              FilledButton(
                                onPressed: () {},
                                child: const Text('기도 시작'),
                              ),
                              Text('삭제', style: TextStyle(color: s.error)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _SlotRow extends StatelessWidget {
  const _SlotRow({
    required this.slot,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  final SkinSlot slot;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return ListTile(
      key: ValueKey('skin-slot-${slot.name}'),
      selected: selected,
      selectedTileColor: scheme.secondaryContainer,
      shape: AppShape.mediumBorder,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12),
      leading: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: scheme.outline),
        ),
      ),
      title: Text(slot.labelKo),
      subtitle: Text(slot.partsKo),
      trailing: Icon(selected ? Icons.expand_less : Icons.expand_more),
      onTap: onTap,
    );
  }
}

class _Swatch extends StatelessWidget {
  const _Swatch({
    super.key,
    required this.color,
    required this.selected,
    required this.onTap,
  });
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      button: true,
      selected: selected,
      label: '색 ${colorHex(color)}',
      excludeSemantics: true,
      child: InkResponse(
        onTap: onTap,
        radius: 28,
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(
              color: selected ? scheme.primary : scheme.outline,
              width: selected ? 3 : 1,
            ),
          ),
          child: selected
              ? Icon(
                  Icons.check,
                  size: 20,
                  color: color.computeLuminance() > 0.4
                      ? Colors.black
                      : Colors.white,
                )
              : null,
        ),
      ),
    );
  }
}
