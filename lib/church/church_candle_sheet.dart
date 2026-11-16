import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'church_constants.dart';
import '../app/theme.dart';

/// 시트에서 고른 것: 지향 인덱스(0..7)와 초 색(0..7, [candleColors]).
class CandleChoice {
  const CandleChoice(this.intention, this.color);
  final int intention;
  final int color;
}

/// 색 고르기 아래 안내문. 색에 뜻이나 효능을 붙이지 않는다.
const String candleColorNotice =
    '봉헌초의 색은 자유롭게 고르세요. 촛불의 색보다 하느님께 봉헌하는 기도와 마음이 중요합니다.';

/// 마지막으로 고른 초 색을 기억하는 키.
const String candleColorPrefsKey = 'church_candle_color_v1';

/// 봉헌 초 지향·색을 고르는 모달 바텀 시트. 고른 [CandleChoice]를 돌려준다(닫으면 null).
Future<CandleChoice?> showCandleSheet(BuildContext context) {
  return showModalBottomSheet<CandleChoice>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    // 시스템 내비게이션 바(3버튼·제스처 막대)에 버튼이 가려지지 않게 한다.
    builder: (context) => const SafeArea(top: false, child: CandleSheet()),
  );
}

class CandleSheet extends StatefulWidget {
  const CandleSheet({super.key});

  @override
  State<CandleSheet> createState() => _CandleSheetState();
}

class _CandleSheetState extends State<CandleSheet> {
  int _selected = 0;
  int _color = 0;

  @override
  void initState() {
    super.initState();
    _loadColor();
  }

  Future<void> _loadColor() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final v = prefs.getInt(candleColorPrefsKey);
      if (v != null && v >= 0 && v < candleColors.length && mounted) {
        setState(() => _color = v);
      }
    } catch (_) {
      // 저장소를 못 읽어도 기본(흰색)으로 진행한다.
    }
  }

  Future<void> _saveColor(int v) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(candleColorPrefsKey, v);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 4),
          child: Text('누구를 위해 초를 켤까요?', style: theme.textTheme.titleMedium),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 0),
          child: Text(
            '켠 초는 하루 동안 타요.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
        ),
        const SizedBox(height: 8),
        // M3 라디오 목록(RadioGroup + RadioListTile): 하나만 고르는 의미·키보드 탐색이 자동.
        Flexible(
          child: RadioGroup<int>(
            groupValue: _selected,
            onChanged: (v) {
              if (v != null) setState(() => _selected = v);
            },
            child: ListView.builder(
              shrinkWrap: true,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: candleIntentions.length,
              itemBuilder: (context, i) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: RadioListTile<int>(
                  key: ValueKey('intention-$i'),
                  value: i,
                  selected: i == _selected,
                  selectedTileColor: scheme.secondaryContainer,
                  shape: const RoundedRectangleBorder(
                    borderRadius: AppShape.large,
                  ),
                  title: Text(candleIntentions[i]),
                ),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
          child: Text('초 색', style: theme.textTheme.labelLarge),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
          child: Row(
            children: [
              for (final i in candleColorUiOrder)
                Expanded(
                  child: Semantics(
                    label: '${candleColors[i].name} 초',
                    selected: i == _color,
                    button: true,
                    child: InkResponse(
                      key: ValueKey('candle-color-$i'),
                      onTap: () {
                        setState(() => _color = i);
                        _saveColor(i);
                      },
                      radius: 24,
                      child: SizedBox(
                        height: 48,
                        child: Center(
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 120),
                            width: i == _color ? 36 : 28,
                            height: i == _color ? 36 : 28,
                            decoration: BoxDecoration(
                              color: Color(candleColors[i].rgb),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: i == _color
                                    ? scheme.primary
                                    : scheme.outlineVariant,
                                width: i == _color ? 3 : 1,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 4, 24, 0),
          child: Text(
            candleColorNotice,
            key: const ValueKey('candle-color-notice'),
            style: theme.textTheme.bodySmall?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 4),
          child: FilledButton.icon(
            onPressed: () =>
                Navigator.of(context).pop(CandleChoice(_selected, _color)),
            icon: const Icon(Icons.local_fire_department_outlined),
            label: const Text('초 켜기'),
          ),
        ),
        // 걸어서 도착하면 저절로 열리는 시트이므로, 부담 없이 닫을 수 있게 한다.
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
          child: TextButton(
            key: const ValueKey('candle-later'),
            onPressed: () => Navigator.of(context).pop(),
            style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
            child: const Text('나중에'),
          ),
        ),
      ],
    );
  }
}
