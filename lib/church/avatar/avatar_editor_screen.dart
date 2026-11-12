import 'dart:math';

import 'package:flutter/material.dart';

import '../../app/settings.dart';
import '../../app/track.dart';
import 'avatar_config.dart';
import 'avatar_pickers.dart';
import 'avatar_preview.dart';

/// 사이버 성당에서 쓸 내 아바타를 정하는 화면(한 페이지). 확인하면 [AvatarConfig]를
/// 결과로 돌려주며 닫힌다.
///
/// [firstEntry]가 참이면 처음 들어올 때의 설정 화면이다: 성별·머리 모양·세례명이 미리
/// 무작위로 골라져 있어 '성당 들어가기' 한 번으로 시작할 수 있다. 거짓이면 HUD의 얼굴 버튼으로
/// 여는 편집 화면이고 옷 색과 '무작위'가 더 있다. 위젯은 둘이 같다.
class AvatarEditorScreen extends StatefulWidget {
  const AvatarEditorScreen({
    super.key,
    required this.settings,
    this.firstEntry = false,
    this.random,
  });

  final AppSettings settings;
  final bool firstEntry;
  final Random? random;

  @override
  State<AvatarEditorScreen> createState() => _AvatarEditorScreenState();
}

class _AvatarEditorScreenState extends State<AvatarEditorScreen> {
  late final Random _random = widget.random ?? Random();
  late AvatarConfig _config = widget.firstEntry
      ? AvatarConfig.randomStart(_random)
      : widget.settings.churchAvatar;

  void _update(AvatarConfig next) => setState(() => _config = next);

  /// 성별은 그대로 두고 나머지를 무작위로 바꾼다.
  void _randomize() {
    final names = AvatarConfig.nameCountFor(_config.gender);
    _update(
      AvatarConfig(
        gender: _config.gender,
        skin: _random.nextInt(AvatarConfig.skinColors.length),
        style: _random.nextInt(AvatarConfig.styleCount),
        hair: _random.nextInt(AvatarConfig.hairColors.length),
        outfit: _random.nextInt(AvatarConfig.outfitColors.length),
        name: _random.nextInt(names),
      ),
    );
  }

  void _confirm() {
    widget.settings.churchAvatar = _config;
    widget.settings.churchAvatarChosen = true;
    Track.event('avatar_save');
    Navigator.of(context).pop(_config);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final first = widget.firstEntry;
    final compact = avatarTextScale(context) <= 1.3;

    final preview = AvatarPreview(
      config: _config,
      height: compact ? 150 : 140,
      showName: false,
    );
    final genderSection = AvatarSection(
      title: '성별',
      child: GenderPicker(
        value: _config.gender,
        onChanged: (g) => _update(_config.withGender(g)),
      ),
    );
    final nameSection = AvatarSection(
      title: '세례명',
      child: BaptismalNameField(
        config: _config,
        large: !compact,
        onChanged: (i) => _update(_config.copyWith(name: i)),
      ),
    );

    final header = compact
        ? Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              preview,
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [genderSection, nameSection],
                ),
              ),
            ],
          )
        : Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: preview),
              const SizedBox(height: 8),
              genderSection,
              nameSection,
            ],
          );

    return Scaffold(
      appBar: first ? null : AppBar(title: const Text('내 아바타')),
      body: SafeArea(
        bottom: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(16, first ? 20 : 8, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (first) ...[
                    Semantics(
                      header: true,
                      child: Text('처음 오셨네요', style: text.headlineSmall),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '성별을 확인하고 마음에 드는 모습을 골라 주세요. 그대로 들어가셔도 돼요.',
                      style: text.bodyMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  header,
                  if (!first)
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: FilledButton.tonalIcon(
                          onPressed: _randomize,
                          icon: const Icon(Icons.casino_outlined),
                          label: const Text('무작위'),
                        ),
                      ),
                    ),
                  AvatarSection(
                    title: '머리 모양',
                    child: HairStylePicker(
                      config: _config,
                      onChanged: (i) => _update(_config.copyWith(style: i)),
                    ),
                  ),
                  AvatarSection(
                    title: '머리색',
                    child: SwatchRow(
                      colors: AvatarConfig.hairColors,
                      labels: [
                        for (var i = 0; i < AvatarConfig.hairColors.length; i++)
                          '머리색 ${i + 1}, ${AvatarConfig.hairNames[i]}',
                      ],
                      selected: _config.hair,
                      onSelected: (i) => _update(_config.copyWith(hair: i)),
                    ),
                  ),
                  AvatarSection(
                    title: '피부색',
                    child: SwatchRow(
                      colors: AvatarConfig.skinColors,
                      labels: AvatarConfig.skinNames,
                      selected: _config.skin,
                      onSelected: (i) => _update(_config.copyWith(skin: i)),
                    ),
                  ),
                  if (!first)
                    AvatarSection(
                      title: '옷 색',
                      child: SwatchRow(
                        colors: AvatarConfig.outfitColors,
                        labels: [
                          for (
                            var i = 0;
                            i < AvatarConfig.outfitColors.length;
                            i++
                          )
                            '옷 색 ${i + 1}, ${AvatarConfig.outfitNames[i]}',
                        ],
                        selected: _config.outfit,
                        onSelected: (i) => _update(_config.copyWith(outfit: i)),
                      ),
                    ),
                  if (!first)
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
                  key: const ValueKey('avatar-confirm'),
                  onPressed: _confirm,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(56),
                  ),
                  child: Text(first ? '성당 들어가기' : '저장'),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
