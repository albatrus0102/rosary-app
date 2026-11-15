import 'dart:async';

import 'package:flutter/material.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../app/theme.dart';

/// '잠시 기도하기'(성당 밖): 기도문 없이 조용히 머무는 짧은 기도. 흐른 시간만 보이고 '마치기'로 닫는다.
/// 성당 안의 같은 항목(제대 앞 고개 숙임)과 짝을 이루는 성당 밖 화면.
class QuietPrayerScreen extends StatefulWidget {
  const QuietPrayerScreen({super.key});

  @override
  State<QuietPrayerScreen> createState() => _QuietPrayerScreenState();
}

class _QuietPrayerScreenState extends State<QuietPrayerScreen> {
  Timer? _timer;
  int _seconds = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _seconds++);
    });
    unawaited(WakelockPlus.enable().catchError((Object _) {}));
  }

  @override
  void dispose() {
    _timer?.cancel();
    unawaited(WakelockPlus.disable().catchError((Object _) {}));
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final m = (_seconds ~/ 60).toString().padLeft(2, '0');
    final s = (_seconds % 60).toString().padLeft(2, '0');
    return Scaffold(
      appBar: AppBar(title: const Text('잠시 기도하기')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpace.lg),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.self_improvement_outlined,
                  size: 72,
                  color: scheme.primary,
                ),
                const SizedBox(height: AppSpace.md),
                Text(
                  '하느님 앞에 잠시 머뭅니다.\n마음속 이야기를 조용히 말씀드려요.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: AppSpace.md),
                Text(
                  '$m:$s',
                  key: const ValueKey('quiet-timer'),
                  style: theme.textTheme.headlineMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
                const SizedBox(height: AppSpace.lg),
                FilledButton(
                  key: const ValueKey('quiet-done'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(160, 56),
                  ),
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('마치기'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
