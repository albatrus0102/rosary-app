import 'package:flutter/material.dart';

import '../app/theme.dart';
import 'legal_texts.dart';

/// 선택 동의 항목의 '자세히' 바텀시트: 수집·이용 목적, 수집 항목(서버로 전송되는
/// 필드 이름), 보유·이용 기간, 동의 거부 권리와 불이익, 국외 저장 고지.
Future<void> showConsentDetailSheet(BuildContext context, String kind) {
  final item = consentItemTexts[kind];
  if (item == null) return Future.value();
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (context) => ConsentDetailContent(item: item),
  );
}

class ConsentDetailContent extends StatelessWidget {
  const ConsentDetailContent({super.key, required this.item});

  final ConsentItemText item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final text = theme.textTheme;
    final scheme = theme.colorScheme;

    Widget heading(String s) => Padding(
      padding: const EdgeInsets.only(top: AppSpace.sm, bottom: AppSpace.xxs),
      child: Semantics(
        header: true,
        child: Text(s, style: text.titleSmall?.copyWith(color: scheme.primary)),
      ),
    );

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(
        AppSpace.md,
        0,
        AppSpace.md,
        AppSpace.md,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            header: true,
            child: Text(item.title, style: text.titleLarge),
          ),
          const SizedBox(height: AppSpace.xxs),
          Text(
            '선택 동의 · 서버로 전송되어 저장됩니다',
            style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
          ),
          heading('수집·이용 목적'),
          Text(item.purpose, style: text.bodyMedium),
          heading('수집 항목(서버로 전송되는 정보)'),
          for (final f in item.fields)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(right: 8),
                    child: Text('•'),
                  ),
                  Expanded(child: Text(f, style: text.bodyMedium)),
                ],
              ),
            ),
          const SizedBox(height: AppSpace.xs),
          Text(
            consentNotCollectedLine,
            style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          heading('보유·이용 기간'),
          Text(item.retention, style: text.bodyMedium),
          heading('동의를 거부할 권리와 불이익'),
          Text(item.refusal, style: text.bodyMedium),
          heading('철회 방법'),
          Text(item.withdraw, style: text.bodyMedium),
          if (item.sensitive) ...[
            heading('민감정보 안내'),
            Text(consentSensitiveNote, style: text.bodyMedium),
          ],
          heading('국외 저장'),
          Text(consentCrossBorderNotice, style: text.bodyMedium),
          const SizedBox(height: AppSpace.md),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.tonal(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('닫기'),
            ),
          ),
        ],
      ),
    );
  }
}
