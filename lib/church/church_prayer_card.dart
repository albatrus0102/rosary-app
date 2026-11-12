import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app/settings.dart';
import '../app/theme.dart';
import '../domain/prayer_data.dart';
import '../domain/rosary_sequence.dart';
import '../domain/rosary_session.dart';

/// 성당에서 앉아 기도하는 동안의 상태: 세션, 기도 시간(mm:ss), 쉬는 중 여부.
///
/// 타이머는 기도 중(쉬는 중이 아닐 때)에만 1초씩 센다.
class ChurchPrayerController extends ChangeNotifier {
  ChurchPrayerController({required this.settings, MysterySet? mysterySet})
    : mysterySet = mysterySet ?? mysterySetForWeekday(DateTime.now().weekday) {
    session = RosarySession(buildRosarySequence(this.mysterySet));
    final saved = settings.savedPrayer;
    if (saved != null &&
        saved.mysterySet == this.mysterySet &&
        saved.stepIndex > 0 &&
        saved.stepIndex < session.steps.length) {
      session.jumpTo(saved.stepIndex);
    }
    session.addListener(_onSession);
  }

  final AppSettings settings;
  final MysterySet mysterySet;
  late final RosarySession session;

  Timer? _timer;
  int _seconds = 0;
  bool _paused = false;
  bool _running = false;
  bool _disposed = false;

  /// 신비 종류 0..3 (서버 `ms`).
  int get ms => mysterySet.index;
  int get seconds => _seconds;
  bool get paused => _paused;

  /// 지금 앉아서 기도하고 있는지(타이머가 도는 중).
  bool get running => _running && !_paused;
  bool get finished => session.isFinished;

  String get timeLabel {
    final m = (_seconds ~/ 60).toString().padLeft(2, '0');
    final s = (_seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  void _onSession() {
    if (_disposed) return;
    if (session.isFinished) {
      settings.clearProgress();
      _stopTimer();
    } else if (session.index == 0) {
      settings.clearProgress();
    } else {
      settings.saveProgress(mysterySet, session.index);
    }
    notifyListeners();
  }

  /// 앉았을 때(또는 쉬었다 이어 기도할 때) 기도를 시작/재개한다.
  void start() {
    _running = true;
    _paused = false;
    if (!session.isFinished) _startTimer();
    notifyListeners();
  }

  /// 잠깐 쉬기: 타이머를 멈춘다.
  void pause() {
    if (_paused) return;
    _paused = true;
    _stopTimer();
    notifyListeners();
  }

  void resume() {
    if (!_paused) return;
    _paused = false;
    if (!session.isFinished) _startTimer();
    notifyListeners();
  }

  /// 일어서서 기도를 멈춘다(진행은 저장). 같은 세션으로 다시 앉을 수 있다.
  void stop({bool save = true}) {
    _running = false;
    _stopTimer();
    if (save) saveProgress();
    notifyListeners();
  }

  void saveProgress() {
    if (session.isFinished) {
      settings.clearProgress();
    } else if (session.index == 0) {
      // 처음으로 돌아갔다면 같은 신비의 저장분만 지운다.
      if (settings.savedPrayer?.mysterySet == mysterySet) {
        settings.clearProgress();
      }
    } else {
      settings.saveProgress(mysterySet, session.index);
    }
  }

  void _startTimer() {
    _timer ??= Timer.periodic(const Duration(seconds: 1), (_) {
      _seconds++;
      notifyListeners();
    });
  }

  void _stopTimer() {
    _timer?.cancel();
    _timer = null;
  }

  @override
  void dispose() {
    if (_disposed) return;
    _disposed = true;
    _stopTimer();
    session.removeListener(_onSession);
    session.dispose();
    super.dispose();
  }
}

/// 화면 아래 반투명 기도 카드.
class ChurchPrayerCard extends StatelessWidget {
  const ChurchPrayerCard({
    super.key,
    required this.controller,
    required this.settings,
    required this.onTogglePause,
    required this.onStand,
    required this.onEnd,
    required this.onFullScreen,
  });

  final ChurchPrayerController controller;
  final AppSettings settings;
  final VoidCallback onTogglePause;
  final VoidCallback onStand;
  final VoidCallback onEnd;
  final VoidCallback onFullScreen;

  void _haptic() {
    if (!settings.hapticOnAdvance) return;
    try {
      unawaited(
        HapticFeedback.selectionClick().catchError((Object e) {
          debugPrint('haptic failed: $e');
        }),
      );
    } catch (e) {
      debugPrint('haptic failed: $e');
    }
  }

  String _stepLabel(RosaryStep step) {
    final name = controller.mysterySet.koreanName;
    final String where;
    if (step.kind == StepKind.closing) {
      where = '마침';
    } else {
      final d = step.decade;
      where = d == null ? '서두' : '$d단';
    }
    return '$name · $where · ${step.title}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final size = MediaQuery.sizeOf(context);
    return ListenableBuilder(
      listenable: Listenable.merge([controller, settings]),
      builder: (context, _) {
        final session = controller.session;
        final finished = controller.finished;
        final paused = controller.paused;
        final step = session.current;
        return Material(
          key: const ValueKey('prayer-card'),
          color: scheme.surface.withValues(alpha: 0.93),
          elevation: 3,
          borderRadius: BorderRadius.circular(AppTheme.cardRadius + 4),
          clipBehavior: Clip.antiAlias,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: size.height * 0.62),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          finished
                              ? '기도를 마쳤습니다'
                              : (paused ? '지금 기도 중 · 쉬는 중' : '지금 기도 중'),
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: scheme.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Icon(
                        Icons.timer_outlined,
                        size: 16,
                        color: scheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        controller.timeLabel,
                        key: const ValueKey('prayer-timer'),
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: scheme.onSurfaceVariant,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  if (finished)
                    Text(
                      '${controller.mysterySet.koreanName} 묵주기도를 모두 바쳤습니다. '
                      '평화를 빕니다.',
                      style: theme.textTheme.bodyLarge,
                    )
                  else ...[
                    Text(
                      _stepLabel(step),
                      key: const ValueKey('prayer-step'),
                      style: theme.textTheme.titleSmall,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      step.text,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTheme.prayerStyle(
                        context,
                        settings.prayerFont,
                        size: 15 * settings.prayerTextScale,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (!finished) ...[
                        OutlinedButton(
                          onPressed: session.index == 0
                              ? null
                              : () {
                                  _haptic();
                                  session.back();
                                },
                          child: const Text('이전'),
                        ),
                        FilledButton(
                          onPressed: () {
                            _haptic();
                            session.next();
                          },
                          child: const Text('다음'),
                        ),
                        FilledButton.tonal(
                          onPressed: onTogglePause,
                          child: Text(paused ? '이어 기도' : '잠깐 쉬기'),
                        ),
                      ],
                      FilledButton.tonal(
                        onPressed: onStand,
                        child: const Text('일어나기'),
                      ),
                      if (!finished)
                        TextButton(onPressed: onEnd, child: const Text('끝내기')),
                    ],
                  ),
                  if (!finished)
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        onPressed: onFullScreen,
                        icon: const Icon(Icons.fullscreen),
                        label: const Text('전체 화면으로 기도'),
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
