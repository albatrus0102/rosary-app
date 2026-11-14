import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app/prayer_tracking.dart';
import '../app/settings.dart';
import '../app/theme.dart';
import '../domain/prayer_data.dart';
import '../domain/rosary_sequence.dart';
import '../domain/rosary_session.dart';
import '../stats/prayer_stats_store.dart';
import 'church_hud.dart';

/// 성당에서 앉아 기도하는 동안의 상태: 세션, 기도 시간(mm:ss), 쉬는 중 여부.
///
/// 타이머는 기도 중(쉬는 중이 아닐 때)에만 1초씩 센다.
class ChurchPrayerController extends ChangeNotifier {
  ChurchPrayerController({
    required this.settings,
    MysterySet? mysterySet,
    PrayerStatsStore? stats,
  }) : mysterySet = mysterySet ?? mysterySetForWeekday(DateTime.now().weekday) {
    session = RosarySession(buildRosarySequence(this.mysterySet));
    final saved = settings.savedPrayer;
    var resumed = false;
    if (saved != null &&
        saved.mysterySet == this.mysterySet &&
        saved.stepIndex > 0 &&
        saved.stepIndex < session.steps.length) {
      session.jumpTo(saved.stepIndex);
      resumed = true;
    }
    session.addListener(_onSession);
    // 이어하기 위치로 옮긴 뒤에 붙인다(그 위치가 기준선). 이 세션의 기록은 여기서만
    // 만든다: 전체 화면 기도(PrayerScreen)가 같은 세션을 받아도 따로 만들지 않는다.
    _tracking = PrayerTracking(
      session: session,
      mysterySet: this.mysterySet,
      settings: settings,
      stats: stats,
      source: PrayerRecord.sourceChurch,
      resumed: resumed,
    )..start();
  }

  late final PrayerTracking _tracking;

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
    _tracking.resume();
    if (!session.isFinished) _startTimer();
    notifyListeners();
  }

  /// 잠깐 쉬기: 타이머를 멈춘다.
  void pause() {
    if (_paused) return;
    _paused = true;
    _tracking.pause();
    _stopTimer();
    notifyListeners();
  }

  void resume() {
    if (!_paused) return;
    _paused = false;
    _tracking.resume();
    if (!session.isFinished) _startTimer();
    notifyListeners();
  }

  /// 일어서서 기도를 멈춘다(진행은 저장). 같은 세션으로 다시 앉을 수 있다.
  void stop({bool save = true}) {
    _running = false;
    _tracking.pause(); // 서 있는 동안은 기도 시간이 아니다. 다시 앉으면 start()가 이어 잰다.
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
    _tracking.dispose(); // 진행이 있으면 기록 1건을 남긴다. 세션 정리보다 먼저.
    session.removeListener(_onSession);
    session.dispose();
    super.dispose();
  }
}

/// 화면 아래 기도 카드: M3 채운 카드(`surfaceContainerHigh`, large 16dp) + HUD 높이(level 2).
/// 장면 밝기와 상관없이 대비가 유지되도록 불투명 표면 역할만 쓴다.
class ChurchPrayerCard extends StatelessWidget {
  const ChurchPrayerCard({
    super.key,
    required this.controller,
    required this.settings,
    required this.onTogglePause,
    required this.onStand,
    this.onPosture,
    required this.onEnd,
    required this.onFullScreen,
  });

  final ChurchPrayerController controller;
  final AppSettings settings;
  final VoidCallback onTogglePause;
  final VoidCallback onStand;

  /// 기도 자세(앉아서 | 무릎 꿇고) 선택. null 이면 선택 버튼을 그리지 않는다.
  final ValueChanged<PrayerPosture>? onPosture;
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
        return Card.filled(
          key: const ValueKey('prayer-card'),
          color: ChurchHudStyle.surface(scheme),
          elevation: ChurchHudStyle.elevation,
          margin: EdgeInsets.zero,
          shape: ChurchHudStyle.plaque(scheme),
          clipBehavior: Clip.antiAlias,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: size.height * 0.62),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpace.sm,
                AppSpace.xxs, // 머리줄의 ⋮ 버튼(48dp)이 이미 위 여백을 만든다.
                AppSpace.xs,
                AppSpace.sm,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 머리줄: 상태, 시간, ⋮(쉬기·전체 화면·끝내기).
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
                      if (!finished) _overflowMenu(paused),
                      if (finished) const SizedBox(width: 8),
                    ],
                  ),
                  if (finished)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Text(
                        '${controller.mysterySet.koreanName} 묵주기도를 모두 바쳤습니다. '
                        '평화를 빕니다.',
                        style: theme.textTheme.bodyLarge,
                      ),
                    )
                  else ...[
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Text(
                        _stepLabel(step),
                        key: const ValueKey('prayer-step'),
                        style: theme.textTheme.titleSmall,
                      ),
                    ),
                    const SizedBox(height: 4),
                    // 기도문은 자르지 않는다(A-01). 길면 이 영역만 스크롤된다.
                    Flexible(
                      child: SingleChildScrollView(
                        key: const ValueKey('prayer-text-scroll'),
                        padding: const EdgeInsets.only(right: 8),
                        child: Text(
                          step.text,
                          key: const ValueKey('prayer-text'),
                          style: AppTheme.prayerStyle(
                            context,
                            settings.prayerFont,
                            size: 15 * settings.prayerTextScale,
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: AppSpace.xs),
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (!finished)
                          // 주 동작: 큰 [다음], 옆에 작은 [이전].
                          Row(
                            children: [
                              OutlinedButton(
                                onPressed: session.index == 0
                                    ? null
                                    : () {
                                        _haptic();
                                        session.back();
                                      },
                                style: OutlinedButton.styleFrom(
                                  minimumSize: const Size(64, 56),
                                ),
                                child: const Text('이전'),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: FilledButton(
                                  key: const ValueKey('prayer-next'),
                                  onPressed: () {
                                    _haptic();
                                    session.next();
                                  },
                                  style: FilledButton.styleFrom(
                                    minimumSize: const Size(96, 56),
                                    textStyle: theme.textTheme.titleMedium,
                                  ),
                                  child: const Text('다음'),
                                ),
                              ),
                            ],
                          ),
                        if (!finished) const SizedBox(height: 8),
                        // 아랫줄: 왼쪽 기도 자세(앉아서 | 무릎 꿇고), 오른쪽 일어나기.
                        // 한 줄에 넣어 카드 높이를 늘리지 않는다(기도문 자리를 뺏지 않는다).
                        // 글자를 아주 크게 쓰면 자세 버튼만 줄여서 한 줄을 지킨다.
                        Row(
                          children: [
                            Expanded(
                              child: onPosture == null
                                  ? const SizedBox.shrink()
                                  : Align(
                                      alignment: Alignment.centerLeft,
                                      child: FittedBox(
                                        fit: BoxFit.scaleDown,
                                        alignment: Alignment.centerLeft,
                                        child:
                                            MediaQuery.withClampedTextScaling(
                                              maxScaleFactor: 1.3,
                                              child: _postureButton(),
                                            ),
                                      ),
                                    ),
                            ),
                            const SizedBox(width: 8),
                            finished
                                ? FilledButton(
                                    key: const ValueKey('prayer-stand'),
                                    onPressed: onStand,
                                    style: FilledButton.styleFrom(
                                      minimumSize: const Size(88, 56),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 16,
                                      ),
                                    ),
                                    child: const Text('일어나기'),
                                  )
                                : FilledButton.tonal(
                                    key: const ValueKey('prayer-stand'),
                                    onPressed: onStand,
                                    style: FilledButton.styleFrom(
                                      minimumSize: const Size(88, 48),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 16,
                                      ),
                                    ),
                                    child: const Text('일어나기'),
                                  ),
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
    );
  }

  /// 기도 자세 선택(M3 SegmentedButton). 고른 값은 설정에 저장된다.
  ///
  /// 아이콘을 `ButtonSegment.icon` 으로 주면 안쪽 여백이 12/16 으로 고정되어 360dp 폭에서
  /// 일어나기와 한 줄에 들어가지 않는다. 그래서 아이콘을 label 안에 넣고 여백을 줄였다.
  Widget _postureButton() => SegmentedButton<PrayerPosture>(
    key: const ValueKey('prayer-posture'),
    showSelectedIcon: false,
    style: SegmentedButton.styleFrom(
      // 높이 40 + 터치 영역 48(M3 기본). 글자는 테마 기본(labelLarge)을 따른다.
      tapTargetSize: MaterialTapTargetSize.padded,
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs),
    ),
    segments: [
      ButtonSegment(
        value: PrayerPosture.sit,
        label: _postureLabel(Icons.event_seat_outlined, '앉아서'),
        tooltip: '앉아서 기도',
      ),
      ButtonSegment(
        value: PrayerPosture.kneel,
        label: _postureLabel(Icons.airline_seat_legroom_reduced, '무릎 꿇고'),
        tooltip: '무릎 꿇고 기도',
      ),
    ],
    selected: {settings.prayerPosture},
    onSelectionChanged: (s) => onPosture?.call(s.first),
  );

  /// 자세 선택 한 칸의 라벨: 아이콘(18) + 글자. 글자는 줄바꿈하지 않는다.
  static Widget _postureLabel(IconData icon, String text) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 18),
      const SizedBox(width: AppSpace.xxs),
      Text(text, softWrap: false),
    ],
  );

  Widget _overflowMenu(bool paused) => PopupMenuButton<_CardMenu>(
    key: const ValueKey('prayer-menu'),
    tooltip: '더보기',
    icon: const Icon(Icons.more_vert),
    onSelected: (m) {
      switch (m) {
        case _CardMenu.pause:
          onTogglePause();
        case _CardMenu.fullScreen:
          onFullScreen();
        case _CardMenu.end:
          onEnd();
      }
    },
    itemBuilder: (context) => [
      PopupMenuItem(
        value: _CardMenu.pause,
        child: Text(paused ? '이어 기도' : '잠깐 쉬기'),
      ),
      const PopupMenuItem(
        value: _CardMenu.fullScreen,
        child: Text('전체 화면으로 기도'),
      ),
      const PopupMenuItem(value: _CardMenu.end, child: Text('끝내기')),
    ],
  );
}

enum _CardMenu { pause, fullScreen, end }
