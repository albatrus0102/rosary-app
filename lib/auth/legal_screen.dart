import 'package:flutter/material.dart';

import '../app/theme.dart';
import 'auth_widgets.dart';

/// 약관·방침 같은 긴 한국어 문서를 보여 준다. 간단한 마크다운(`#`, `##`, `###`,
/// `-` 목록, `>` 인용, `**굵게**`, `|표|`)만 패키지 없이 그린다.
class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key, required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final blocks = parseLegalBlocks(body);
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: SelectionArea(
          child: ListView.builder(
            padding: const EdgeInsets.only(bottom: AppSpace.lg),
            itemCount: blocks.length,
            itemBuilder: (context, i) =>
                AuthColumn(child: _LegalBlockView(blocks[i])),
          ),
        ),
      ),
    );
  }
}

enum LegalBlockType { h1, h2, h3, bullet, quote, paragraph, spacer }

class LegalBlock {
  const LegalBlock(this.type, this.text);
  final LegalBlockType type;
  final String text;
}

/// 본문을 블록 목록으로 나눈다(테스트 가능하도록 공개).
List<LegalBlock> parseLegalBlocks(String body) {
  final blocks = <LegalBlock>[];
  for (final raw in body.split('\n')) {
    final line = raw.trimRight();
    final t = line.trim();
    if (t.isEmpty) {
      if (blocks.isNotEmpty && blocks.last.type != LegalBlockType.spacer) {
        blocks.add(const LegalBlock(LegalBlockType.spacer, ''));
      }
      continue;
    }
    if (RegExp(r'^-{3,}$').hasMatch(t)) continue;
    if (t.startsWith('### ')) {
      blocks.add(LegalBlock(LegalBlockType.h3, t.substring(4)));
    } else if (t.startsWith('## ')) {
      blocks.add(LegalBlock(LegalBlockType.h2, t.substring(3)));
    } else if (t.startsWith('# ')) {
      blocks.add(LegalBlock(LegalBlockType.h1, t.substring(2)));
    } else if (t.startsWith('- ') || t.startsWith('* ')) {
      blocks.add(LegalBlock(LegalBlockType.bullet, t.substring(2)));
    } else if (t.startsWith('>')) {
      blocks.add(LegalBlock(LegalBlockType.quote, t.substring(1).trim()));
    } else if (t.startsWith('|')) {
      // 표: 구분선 행은 건너뛰고, 나머지는 ' · '로 이은 한 줄로 보여 준다.
      if (RegExp(r'^\|[\s:|-]+\|?$').hasMatch(t)) continue;
      final cells = t
          .split('|')
          .map((c) => c.trim())
          .where((c) => c.isNotEmpty)
          .join(' · ');
      blocks.add(LegalBlock(LegalBlockType.bullet, cells));
    } else {
      blocks.add(LegalBlock(LegalBlockType.paragraph, t));
    }
  }
  return blocks;
}

class _LegalBlockView extends StatelessWidget {
  const _LegalBlockView(this.block);

  final LegalBlock block;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final text = theme.textTheme;
    final scheme = theme.colorScheme;
    switch (block.type) {
      case LegalBlockType.spacer:
        return const SizedBox(height: AppSpace.xs);
      case LegalBlockType.h1:
        return Padding(
          padding: const EdgeInsets.only(top: AppSpace.sm, bottom: AppSpace.xs),
          child: Semantics(
            header: true,
            child: Text(block.text, style: text.headlineSmall),
          ),
        );
      case LegalBlockType.h2:
        return Padding(
          padding: const EdgeInsets.only(
            top: AppSpace.sm,
            bottom: AppSpace.xxs,
          ),
          child: Semantics(
            header: true,
            child: Text(
              block.text,
              style: text.titleMedium?.copyWith(color: scheme.primary),
            ),
          ),
        );
      case LegalBlockType.h3:
        return Padding(
          padding: const EdgeInsets.only(top: AppSpace.xs),
          child: Semantics(
            header: true,
            child: Text(block.text, style: text.titleSmall),
          ),
        );
      case LegalBlockType.bullet:
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 4, right: 8),
                child: Text('•', style: text.bodyMedium),
              ),
              Expanded(
                child: Text.rich(
                  _inline(block.text, text.bodyMedium!),
                  style: text.bodyMedium?.copyWith(height: 1.5),
                ),
              ),
            ],
          ),
        );
      case LegalBlockType.quote:
        return Container(
          margin: const EdgeInsets.symmetric(vertical: AppSpace.xxs),
          padding: const EdgeInsets.all(AppSpace.xs + 4),
          decoration: BoxDecoration(
            color: scheme.surfaceContainerHigh,
            borderRadius: AppShape.small,
          ),
          child: Text.rich(
            _inline(block.text, text.bodyMedium!),
            style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
          ),
        );
      case LegalBlockType.paragraph:
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Text.rich(
            _inline(block.text, text.bodyMedium!),
            style: text.bodyMedium?.copyWith(height: 1.55),
          ),
        );
    }
  }
}

/// `**굵게**`만 처리하는 인라인 렌더링.
TextSpan _inline(String s, TextStyle base) {
  s = s.replaceAll('`', '');
  final spans = <InlineSpan>[];
  final re = RegExp(r'\*\*(.+?)\*\*');
  var last = 0;
  for (final m in re.allMatches(s)) {
    if (m.start > last) spans.add(TextSpan(text: s.substring(last, m.start)));
    spans.add(
      TextSpan(
        text: m.group(1),
        style: const TextStyle(fontWeight: FontWeight.w700),
      ),
    );
    last = m.end;
  }
  if (last < s.length) spans.add(TextSpan(text: s.substring(last)));
  return TextSpan(children: spans);
}
