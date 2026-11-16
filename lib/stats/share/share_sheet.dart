import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import '../../app/theme.dart';
import '../../diag/diag_recorder.dart';
import 'image_share.dart';
import 'share_card.dart';

/// 카드 공유 시트: 미리보기 + 비율·배경·조판 고르기 + 이미지 공유 / 인스타그램 스토리.
/// 고른 배경·조판은 앱을 쓰는 동안 기억한다(독서공방 `_cardGalleryBg`/`_cardGalleryLayout` 와 같은 수명).
Future<void> showShareSheet(
  BuildContext context, {
  required ShareCardContent content,
  required String fileName,
  ImageShareChannel? channel,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => ShareSheet(
      content: content,
      fileName: fileName,
      channel: channel ?? PlatformImageShare(),
    ),
  );
}

class ShareSheet extends StatefulWidget {
  const ShareSheet({
    super.key,
    required this.content,
    required this.fileName,
    required this.channel,
  });

  final ShareCardContent content;
  final String fileName;
  final ImageShareChannel channel;

  /// 마지막으로 고른 모양(앱을 쓰는 동안만).
  static ShareBg lastBg = ShareBg.paper;
  static ShareLayout lastLayout = ShareLayout.center;

  @override
  State<ShareSheet> createState() => _ShareSheetState();
}

class _ShareSheetState extends State<ShareSheet> {
  final GlobalKey _boundary = GlobalKey();
  ShareBg _bg = ShareSheet.lastBg;
  ShareLayout _layout = ShareSheet.lastLayout;
  ShareFormat _format = ShareFormat.square;
  bool _busy = false;

  Future<void> _send({required bool story}) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      if (story) _format = ShareFormat.story; // 스토리는 항상 9:16
    });
    final messenger = ScaffoldMessenger.of(context);
    try {
      await WidgetsBinding.instance.endOfFrame;
      final boundary =
          _boundary.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) throw StateError('카드를 찾지 못했어요');
      final png = await capturePng(boundary);
      final name = '${widget.fileName}${story ? '_story' : ''}';
      final r = story
          ? await widget.channel.shareStory(png, name)
          : await widget.channel.shareImage(png, name);
      Diag.crumb('share_image', {'story': story, 'out': r.name});
      final msg = switch (r) {
        ShareOutcome.openedSheet when story =>
          '인스타그램 스토리를 바로 열 수 없어 공유 창으로 열었어요.',
        ShareOutcome.unsupported => '이 기기에서는 공유를 지원하지 않아요.',
        ShareOutcome.failed => '공유하지 못했어요. 잠시 뒤 다시 해 주세요.',
        _ => null,
      };
      if (msg != null) messenger.showSnackBar(SnackBar(content: Text(msg)));
    } catch (e, st) {
      Diag.caught('share_image', e, st);
      messenger.showSnackBar(
        const SnackBar(content: Text('이미지를 만들지 못했어요. 잠시 뒤 다시 해 주세요.')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final media = MediaQuery.of(context);
    final maxPreviewH = media.size.height * 0.46;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(header: true, child: Text('카드로 나누기', style: text.titleLarge)),
          const SizedBox(height: 12),
          Center(
            child: LayoutBuilder(
              builder: (context, c) {
                final ratio = _format.width / _format.height;
                var w = c.maxWidth.clamp(0.0, 360.0);
                if (w / ratio > maxPreviewH) w = maxPreviewH * ratio;
                return Container(
                  decoration: BoxDecoration(
                    borderRadius: AppShape.medium,
                    border: Border.all(color: scheme.outlineVariant),
                  ),
                  clipBehavior: Clip.antiAlias,
                  width: w,
                  height: w / ratio,
                  child: FittedBox(
                    fit: BoxFit.contain,
                    child: RepaintBoundary(
                      key: _boundary,
                      child: ShareCard(
                        content: widget.content,
                        bg: _bg,
                        layout: _layout,
                        format: _format,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          Text('모양', style: text.labelLarge),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final f in ShareFormat.values)
                ChoiceChip(
                  label: Text(f.label),
                  selected: _format == f,
                  onSelected: (_) => setState(() => _format = f),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Text('배경', style: text.labelLarge),
          const SizedBox(height: 8),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [for (final b in ShareBg.values) _Swatch(
              bg: b,
              selected: b == _bg,
              onTap: () => setState(() => ShareSheet.lastBg = _bg = b),
            )],
          ),
          const SizedBox(height: 16),
          Text('배치', style: text.labelLarge),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final l in ShareLayout.values)
                ChoiceChip(
                  label: Text(l.label),
                  selected: _layout == l,
                  onSelected: (_) =>
                      setState(() => ShareSheet.lastLayout = _layout = l),
                ),
            ],
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: _busy ? null : () => _send(story: false),
            icon: const Icon(Icons.ios_share),
            label: const Text('이미지로 나누기'),
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppTheme.largeButtonHeight)),
          ),
          const SizedBox(height: 8),
          FilledButton.tonalIcon(
            onPressed: _busy ? null : () => _send(story: true),
            icon: const Icon(Icons.auto_awesome_outlined),
            label: const Text('인스타그램 스토리'),
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppTheme.largeButtonHeight)),
          ),
        ],
      ),
    );
  }
}

class _Swatch extends StatelessWidget {
  const _Swatch({required this.bg, required this.selected, required this.onTap});

  final ShareBg bg;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      button: true,
      selected: selected,
      label: '배경 ${bg.label}',
      excludeSemantics: true,
      child: InkResponse(
        onTap: onTap,
        radius: 28,
        child: SizedBox(
          width: 48,
          height: 48,
          child: Center(
            child: Container(
              width: 40,
              height: 40,
              decoration: ShareInk.decoration(bg).copyWith(
                shape: BoxShape.circle,
                border: Border.all(
                  color: selected ? scheme.primary : scheme.outlineVariant,
                  width: selected ? 3 : 1,
                ),
              ),
              child: selected
                  ? Icon(Icons.check, size: 18, color: ShareInk.of(bg).accent)
                  : null,
            ),
          ),
        ),
      ),
    );
  }
}
