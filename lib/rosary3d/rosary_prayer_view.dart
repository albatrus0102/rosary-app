import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';

import '../app/settings.dart';
import '../app/theme.dart';
import '../domain/prayer_data.dart';
import '../domain/prayer_mode.dart';
import '../domain/rosary_sequence.dart';
import '../domain/rosary_session.dart';
import 'rosary_model.dart';
import 'rosary_scene.dart';

/// 묵주 화면 바탕색(3D 벨벳 바탕과 맞춘 틀 색).
Color rosaryBackdropColor(RosaryBackdrop b) => switch (b) {
  RosaryBackdrop.navy => const Color(0xFF141B2E),
  RosaryBackdrop.black => const Color(0xFF0C0C0E),
  RosaryBackdrop.ivory => const Color(0xFFF1E9DA),
};

/// 묵주 화면 전용 테마: 네이비·검정은 어두운 금색, 아이보리는 밝은 갈색 구성.
ThemeData rosaryTheme(RosaryBackdrop b, PrayerFont font) {
  final dark = b != RosaryBackdrop.ivory;
  final bg = rosaryBackdropColor(b);
  final scheme =
      ColorScheme.fromSeed(
        seedColor: const Color(0xFFC8A865),
        brightness: dark ? Brightness.dark : Brightness.light,
      ).copyWith(
        surface: bg,
        primary: dark ? const Color(0xFFD8B873) : const Color(0xFF7A5A1E),
        onPrimary: dark ? const Color(0xFF231806) : Colors.white,
      );
  return AppTheme.fromScheme(scheme, font);
}

/// 기도 화면 '손안의 묵주'(C안) 본문. 진행은 [session]이 정하고, 3D([scene])는 그 상태를 그리기만 한다.
///
/// 360×800 기준 세로 배치: 머리줄 56 · 신비 80 · 5단 진행 32 · 제목·순번 72 · 3D(남는 높이, 약 330) ·
/// 기도문 펼치기 48 · 알림 48 · 이전/다음 76. ◎(전체 묵주 보기, A안)에서는 3D 가 정보 줄 자리까지 넓어진다.
class RosaryPrayerView extends StatefulWidget {
  const RosaryPrayerView({
    super.key,
    required this.session,
    required this.settings,
    required this.mysterySet,
    required this.scene,
    required this.header,
    required this.textView,
    required this.actions,
    required this.onNext,
    required this.onBack,
    this.onChangeRosary,
  });

  /// 묵주 영역을 길게 누르면: 묵주 바꾸기(갤러리).
  final VoidCallback? onChangeRosary;

  final RosarySession session;
  final AppSettings settings;
  final MysterySet mysterySet;
  final RosaryScene scene;
  final Widget header;
  final Widget textView;
  final Widget actions;

  /// 아래로 당김(다음). 마지막 스텝에서는 부르지 않는다(마치기는 단추로).
  final VoidCallback onNext;
  final VoidCallback onBack;

  @override
  State<RosaryPrayerView> createState() => _RosaryPrayerViewState();
}

class _RosaryPrayerViewState extends State<RosaryPrayerView> {
  final BeadPull _pull = BeadPull();
  double _areaH = 320;

  RosarySession get _s => widget.session;
  AppSettings get _set => widget.settings;

  double get _spacing => (_areaH * 0.3).clamp(60.0, 140.0);

  void _onDragStart(DragStartDetails _) => _pull.start();

  void _onDragUpdate(DragUpdateDetails d) {
    final off = _pull.update(d.delta.dy, _spacing);
    widget.scene.setDrag(_canGo(off) ? off : off * 0.25, active: true);
  }

  bool _canGo(double dir) => dir > 0
      ? _s.index < _s.steps.length - 1
      : dir < 0
      ? _s.index > 0
      : true;

  void _onDragEnd(DragEndDetails d) {
    final dir = _pull.end(
      d.primaryVelocity ?? 0,
      _spacing,
      now: SchedulerBinding.instance.currentSystemFrameTimeStamp,
    );
    if (dir != 0 && _canGo(dir.toDouble())) {
      if (dir > 0) {
        widget.onNext();
      } else {
        widget.onBack();
      }
    }
    // 넘기지 않았으면 제자리로(탄성), 넘겼으면 setStep 이 끌기 값을 지운다.
    widget.scene.setDrag(0, active: false);
  }

  String _plainTitle(RosaryStep s) =>
      s.title.replaceFirst(RegExp(r'\s*\d+/\d+$'), '');

  String? _count(RosaryStep s) {
    if (s.kind == StepKind.hailMary && s.beadIndex != null) {
      return '${s.beadIndex} / ${s.decade == null ? 3 : 10}';
    }
    if (s.kind == StepKind.ourFather && s.decade != null) return '${s.decade}단';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.scene,
      builder: (context, _) => _build(context),
    );
  }

  Widget _build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final step = _s.current;
    final full = widget.scene.fullView;
    final open = _set.rosaryTextExpanded && !full;
    final count = _count(step);
    final semantic =
        '묵주. ${_plainTitle(step)}${count == null ? '' : ' $count'}. 아래로 당기면 다음, 위로 당기면 이전 기도';

    final area = LayoutBuilder(
      builder: (context, c) {
        _areaH = c.maxHeight;
        return Semantics(
          key: const ValueKey('rosary-area'),
          label: semantic,
          onIncrease: _canGo(1) ? widget.onNext : null,
          onDecrease: _canGo(-1) ? widget.onBack : null,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onVerticalDragStart: _onDragStart,
            onVerticalDragUpdate: _onDragUpdate,
            onVerticalDragEnd: _onDragEnd,
            onLongPress: widget.onChangeRosary,
            child: Stack(
              fit: StackFit.expand,
              children: [
                // 3D 는 터치를 받지 않는다(Flutter 가 제스처를 맡는다).
                IgnorePointer(
                  child: ExcludeSemantics(
                    child: widget.scene.buildView(context),
                  ),
                ),
                if (full)
                  Positioned(
                    left: 16,
                    right: 16,
                    top: 8,
                    child: Text(
                      _fullCaption(step),
                      key: const ValueKey('rosary-full-caption'),
                      textAlign: TextAlign.center,
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: scheme.onSurface.withValues(alpha: 0.85),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );

    return Column(
      children: [
        widget.header,
        // 신비 · 진행 · 제목(A안에서는 접는다)
        AnimatedSize(
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : const Duration(milliseconds: 280),
          curve: Curves.easeOutCubic,
          child: full
              ? const SizedBox(width: double.infinity)
              : Column(
                  children: [
                    _MysteryBand(step: step, set: widget.mysterySet),
                    _DecadeProgress(step: step),
                    _TitleRow(title: _plainTitle(step), count: count),
                  ],
                ),
        ),
        Expanded(flex: open ? 4 : 1, child: area),
        if (open)
          Expanded(
            flex: 5,
            child: KeyedSubtree(
              key: const ValueKey('rosary-text-panel'),
              child: widget.textView,
            ),
          )
        else
          const SizedBox.shrink(),
        if (!full) ...[
          SizedBox(
            height: 48,
            child: Center(
              child: TextButton.icon(
                key: const ValueKey('rosary-text-toggle'),
                style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: () =>
                    _set.rosaryTextExpanded = !_set.rosaryTextExpanded,
                icon: Icon(open ? Icons.expand_more : Icons.expand_less),
                label: Text(open ? '기도문 접기' : '기도문 펼치기'),
              ),
            ),
          ),
          _FeedbackRow(settings: _set),
        ],
        widget.actions,
      ],
    );
  }

  String _fullCaption(RosaryStep s) {
    final d = s.decade;
    final where = d == null
        ? (s.kind == StepKind.closing ? '마침' : '서두')
        : '$d단';
    final c = _count(s);
    return '$where · ${_plainTitle(s)}${c == null || c.endsWith('단') ? '' : ' $c'}';
  }
}

class _MysteryBand extends StatelessWidget {
  const _MysteryBand({required this.step, required this.set});
  final RosaryStep step;
  final MysterySet set;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final d = step.decade;
    final String top, body;
    if (step.kind == StepKind.closing) {
      top = set.koreanName;
      body = '마침 — 다섯 단을 모두 바쳤습니다';
    } else if (d == null) {
      top = '${set.koreanName} · 서두';
      body = '십자가와 첫 다섯 알';
    } else {
      final m = set.mysteries[d - 1];
      top = m.title;
      body = m.meditation.replaceFirst(RegExp(r'[을를] 묵상합시다\.$'), '');
    }
    return SizedBox(
      key: const ValueKey('rosary-mystery'),
      height: 80,
      width: double.infinity,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 6, 20, 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              top,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.labelLarge?.copyWith(
                color: scheme.primary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              body,
              // 글자가 크면(틀은 1.3배까지) 80dp 안에 한 줄만.
              maxLines: MediaQuery.textScalerOf(context).scale(10) > 11 ? 1 : 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodyLarge?.copyWith(height: 1.3),
            ),
          ],
        ),
      ),
    );
  }
}

/// 5단 진행: 단마다 막대 하나, 진행 중인 단은 성모송 수만큼 찬다.
class _DecadeProgress extends StatelessWidget {
  const _DecadeProgress({required this.step});
  final RosaryStep step;

  double _fill(int d) {
    final cur = step.decade;
    if (step.kind == StepKind.closing) return 1;
    if (cur == null) return 0;
    if (d < cur) return 1;
    if (d > cur) return 0;
    return switch (step.kind) {
      StepKind.hailMary => (step.beadIndex ?? 0) / 10,
      StepKind.gloryBe || StepKind.fatima => 1,
      _ => 0.02,
    };
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final cur = step.decade;
    return Semantics(
      label: cur == null
          ? (step.kind == StepKind.closing ? '5단 모두 마침' : '서두, 5단 중 시작 전')
          : '5단 중 $cur단',
      child: SizedBox(
        key: const ValueKey('rosary-progress'),
        height: 32,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 56),
          child: Row(
            children: [
              for (var d = 1; d <= 5; d++) ...[
                if (d > 1) const SizedBox(width: 8),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(3),
                    child: LinearProgressIndicator(
                      value: _fill(d),
                      minHeight: d == cur ? 7 : 5,
                      color: scheme.primary,
                      backgroundColor: scheme.onSurface.withValues(alpha: 0.16),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _TitleRow extends StatelessWidget {
  const _TitleRow({required this.title, required this.count});
  final String title;
  final String? count;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      key: const ValueKey('rosary-title'),
      height: 72,
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                height: 1.15,
              ),
            ),
            if (count != null)
              Text(
                count!,
                key: const ValueKey('rosary-count'),
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w600,
                  height: 1.05,
                  color: theme.colorScheme.primary,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// 알림 줄: 진동·소리 방식(둘 다/진동만/소리만/끔)과 음성 제목 안내.
class _FeedbackRow extends StatelessWidget {
  const _FeedbackRow({required this.settings});
  final AppSettings settings;

  static String label(RosaryFeedback f) => switch (f) {
    RosaryFeedback.both => '진동·소리',
    RosaryFeedback.vibrate => '진동만',
    RosaryFeedback.sound => '소리만',
    RosaryFeedback.off => '알림 끔',
  };

  @override
  Widget build(BuildContext context) {
    final f = settings.rosaryFeedback;
    return SizedBox(
      height: 48,
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ActionChip(
              key: const ValueKey('rosary-feedback'),
              avatar: Icon(switch (f) {
                RosaryFeedback.both => Icons.vibration,
                RosaryFeedback.vibrate => Icons.vibration,
                RosaryFeedback.sound => Icons.music_note_outlined,
                RosaryFeedback.off => Icons.notifications_off_outlined,
              }, size: 18),
              label: Text(label(f)),
              tooltip: '진동·소리 바꾸기',
              onPressed: () {
                HapticFeedback.selectionClick();
                settings.rosaryFeedback = RosaryFeedback
                    .values[(f.index + 1) % RosaryFeedback.values.length];
              },
            ),
            const SizedBox(width: 8),
            FilterChip(
              key: const ValueKey('rosary-voice-title'),
              label: const Text('음성 제목'),
              tooltip: '다음 알로 넘어갈 때 기도 제목을 소리로 알려 줍니다',
              selected: settings.rosaryVoiceTitle,
              onSelected: (v) => settings.rosaryVoiceTitle = v,
            ),
            const SizedBox(width: 8),
            _VoiceModeChip(settings: settings),
          ],
        ),
      ),
    );
  }
}

/// 음성 인도: 끔 · 선창(내가 앞단, 앱이 뒷단) · 후창(앱이 앞단, 내가 뒷단). 홈·설정의 기도 모드·상대 목소리와 같은 값.
enum RosaryVoiceMode { off, leader, responder }

RosaryVoiceMode rosaryVoiceModeOf(AppSettings s) =>
    !s.leaderAudioEnabled || s.prayerMode == PrayerMode.solo
    ? RosaryVoiceMode.off
    : (s.prayerMode == PrayerMode.leader
          ? RosaryVoiceMode.leader
          : RosaryVoiceMode.responder);

void setRosaryVoiceMode(AppSettings s, RosaryVoiceMode m) {
  switch (m) {
    case RosaryVoiceMode.off:
      s.leaderAudioEnabled = false;
    case RosaryVoiceMode.leader:
      s.prayerMode = PrayerMode.leader;
      s.leaderAudioEnabled = true;
    case RosaryVoiceMode.responder:
      s.prayerMode = PrayerMode.responder;
      s.leaderAudioEnabled = true;
  }
}

class _VoiceModeChip extends StatelessWidget {
  const _VoiceModeChip({required this.settings});
  final AppSettings settings;

  static String label(RosaryVoiceMode m) => switch (m) {
    RosaryVoiceMode.off => '음성 끔',
    RosaryVoiceMode.leader => '내가 선창',
    RosaryVoiceMode.responder => '내가 후창',
  };

  @override
  Widget build(BuildContext context) {
    final m = rosaryVoiceModeOf(settings);
    return PopupMenuButton<RosaryVoiceMode>(
      key: const ValueKey('rosary-voice-mode'),
      tooltip: '음성 인도 고르기',
      initialValue: m,
      onSelected: (v) => setRosaryVoiceMode(settings, v),
      itemBuilder: (context) => const [
        PopupMenuItem(value: RosaryVoiceMode.off, child: Text('음성 끄기')),
        PopupMenuItem(
          value: RosaryVoiceMode.leader,
          child: Text('선창 — 내가 앞단, 앱이 뒷단'),
        ),
        PopupMenuItem(
          value: RosaryVoiceMode.responder,
          child: Text('후창 — 앱이 앞단, 내가 뒷단'),
        ),
      ],
      child: Chip(
        avatar: Icon(
          m == RosaryVoiceMode.off
              ? Icons.voice_over_off_outlined
              : Icons.record_voice_over_outlined,
          size: 18,
        ),
        label: Text(label(m)),
      ),
    );
  }
}
