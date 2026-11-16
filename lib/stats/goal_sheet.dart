import 'package:flutter/material.dart';

import '../app/theme.dart';
import 'prayer_goal.dart';
import 'text_fit.dart';

enum _Axis { decades, minutes, both, none }

/// '오늘의 기도 목표' 고르기 시트. 독서공방 `onbGoalOpen`/`onbGoalPick`/`onbGoalSave`/`onbGoalSkip` 의 이식.
///
/// 처음 통계 화면을 열 때 한 번만 권하고(건너뛰어도 다시 묻지 않는다), 설정에서 언제든 연다.
/// 저장하면 고른 [PrayerGoal](끄기 포함)을, 건너뛰거나 닫으면 null 을 돌려준다.
Future<PrayerGoal?> showGoalSheet(
  BuildContext context, {
  required PrayerGoal current,
  bool onboarding = false,
}) {
  return showModalBottomSheet<PrayerGoal>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => GoalSheet(current: current, onboarding: onboarding),
  );
}

class GoalSheet extends StatefulWidget {
  const GoalSheet({super.key, required this.current, this.onboarding = false});

  final PrayerGoal current;
  final bool onboarding;

  static const int defaultDecades = 1;
  static const int defaultMinutes = 10;
  static const int maxDecadesStep = 20;
  static const int maxMinutesStep = 180;
  static const int minutesStep = 5;

  @override
  State<GoalSheet> createState() => _GoalSheetState();
}

class _GoalSheetState extends State<GoalSheet> {
  late _Axis _axis;
  late int _decades;
  late int _minutes;

  @override
  void initState() {
    super.initState();
    final g = widget.current;
    _axis = g.isOff
        ? (widget.onboarding ? _Axis.decades : _Axis.none)
        : g.hasDecades && g.hasMinutes
        ? _Axis.both
        : g.hasDecades
        ? _Axis.decades
        : _Axis.minutes;
    _decades = g.hasDecades
        ? g.decades.clamp(1, GoalSheet.maxDecadesStep)
        : GoalSheet.defaultDecades;
    _minutes = g.hasMinutes
        ? g.minutes.clamp(GoalSheet.minutesStep, GoalSheet.maxMinutesStep)
        : GoalSheet.defaultMinutes;
  }

  PrayerGoal get _result => switch (_axis) {
    _Axis.decades => PrayerGoal(decades: _decades),
    _Axis.minutes => PrayerGoal(minutes: _minutes),
    _Axis.both => PrayerGoal(decades: _decades, minutes: _minutes),
    _Axis.none => PrayerGoal.off,
  };

  static const Map<_Axis, String> _labels = {
    _Axis.decades: '단으로',
    _Axis.minutes: '시간으로',
    _Axis.both: '둘 다',
    _Axis.none: '정하지 않기',
  };

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    final showDecades = _axis == _Axis.decades || _axis == _Axis.both;
    final showMinutes = _axis == _Axis.minutes || _axis == _Axis.both;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        24,
        0,
        24,
        24 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: Text('오늘의 기도 목표', style: text.titleLarge),
          ),
          const SizedBox(height: 8),
          Text(
            keepAll(
              '하루에 바치고 싶은 만큼만 정해 보세요. 작게 시작해도 좋아요. '
              '정하지 않아도 기도는 그대로 기록돼요. 나중에 설정에서 언제든 바꿀 수 있어요.',
            ),
            style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final a in _Axis.values)
                ChoiceChip(
                  label: Text(_labels[a]!),
                  selected: _axis == a,
                  onSelected: (_) => setState(() => _axis = a),
                ),
            ],
          ),
          if (showDecades) ...[
            const SizedBox(height: 12),
            _Stepper(
              label: '하루에 바칠 단',
              value: '$_decades단',
              onMinus: _decades > 1 ? () => setState(() => _decades--) : null,
              onPlus: _decades < GoalSheet.maxDecadesStep
                  ? () => setState(() => _decades++)
                  : null,
            ),
          ],
          if (showMinutes) ...[
            const SizedBox(height: 8),
            _Stepper(
              label: '하루에 기도할 시간',
              value: '$_minutes분',
              onMinus: _minutes > GoalSheet.minutesStep
                  ? () => setState(() => _minutes -= GoalSheet.minutesStep)
                  : null,
              onPlus: _minutes < GoalSheet.maxMinutesStep
                  ? () => setState(() => _minutes += GoalSheet.minutesStep)
                  : null,
            ),
          ],
          if (_axis == _Axis.both) ...[
            const SizedBox(height: 8),
            Text(
              keepAll('둘 중 하나만 채워도 목표만큼 바친 날로 세어요.'),
              style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
            ),
          ],
          const SizedBox(height: 20),
          FilledButton(
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(AppTheme.largeButtonHeight),
            ),
            onPressed: () => Navigator.of(context).pop(_result),
            child: Text(_axis == _Axis.none ? '목표 없이 지내기' : '이대로 정하기'),
          ),
          const SizedBox(height: 4),
          TextButton(
            style: TextButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            onPressed: () => Navigator.of(context).pop(),
            child: Text(widget.onboarding ? '다음에 할게요' : '닫기'),
          ),
        ],
      ),
    );
  }
}

class _Stepper extends StatelessWidget {
  const _Stepper({
    required this.label,
    required this.value,
    required this.onMinus,
    required this.onPlus,
  });

  final String label;
  final String value;
  final VoidCallback? onMinus;
  final VoidCallback? onPlus;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Row(
      children: [
        Expanded(child: Text(keepAll(label), style: text.bodyLarge, semanticsLabel: label)),
        IconButton.outlined(
          tooltip: '$label 줄이기',
          onPressed: onMinus,
          icon: const Icon(Icons.remove),
        ),
        ConstrainedBox(
          constraints: const BoxConstraints(minWidth: 56),
          child: Text(
            value,
            textAlign: TextAlign.center,
            style: text.titleMedium,
          ),
        ),
        IconButton.outlined(
          tooltip: '$label 늘리기',
          onPressed: onPlus,
          icon: const Icon(Icons.add),
        ),
      ],
    );
  }
}
