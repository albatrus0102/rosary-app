import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import '../../app/prayer_text_short.dart';
import '../../app/settings.dart';
import '../../app/theme.dart';
import '../../domain/prayer_mode.dart';
import '../../domain/rosary_sequence.dart';
import 'pill.dart';
import 'soft_card.dart';

/// 기도문 칸. 남는 높이를 모두 쓰고, 넘치면 숨기지 않고 스크롤하며 '↓ n줄 더 (쪽 k/N)'를 보여 준다.
///
/// - 글자 크기는 [scale]만 따른다. 이 위젯 안에서는 시스템 글자 배율을 다시 곱하지 않는다
///   (`MediaQuery.withNoTextScaling`). 시스템 배율을 반영할지는 부르는 쪽이 [scale]에 담는다.
/// - 글을 짧게 눌러 [onAdvance](다음 구슬). 넘친 글은 손가락으로 밀어 스크롤한다.
///   (끌기가 탭보다 먼저 인식되므로 스크롤과 탭이 서로 방해하지 않는다.)
/// - 넘침 표시는 글 위에 겹치지 않고, 글 칸 **아래**에 자리를 따로 둔다. 어떤 조작 요소도
///   기도문을 가리지 않는다.
class PrayerTextView extends StatefulWidget {
  const PrayerTextView({
    super.key,
    required this.step,
    required this.stepIndex,
    required this.mode,
    required this.font,
    required this.scale,
    required this.onAdvance,
    this.short = false,
    this.leaderSpeaking = false,
    this.maxContentWidth = 560,
  });

  final RosaryStep step;

  /// 스텝이 바뀌면 맨 위로 되돌리고 페이드인을 다시 한다.
  final int stepIndex;
  final PrayerMode mode;
  final PrayerFont font;

  /// 기도문 글자 크기 배율(앱 설정, 필요하면 시스템 배율과 합친 값).
  final double scale;
  final VoidCallback onAdvance;

  /// '외운 기도 짧게 보기'. 줄일 수 있는 기도만 첫머리로 보인다([ShortPrayers.of]).
  final bool short;

  /// 선창 음성이 재생 중이면 '선창 재생 중' 배지를 보인다.
  final bool leaderSpeaking;
  final double maxContentWidth;

  /// 넘침 표시 칸의 높이(터치 영역 48).
  static const double pillRowHeight = 48;

  /// 한 쪽 = 칸 높이의 90%(앞 쪽의 마지막 줄이 다음 쪽 맨 위에 걸쳐 읽는 흐름이 끊기지 않게).
  static const double pageFraction = 0.9;

  /// 글이 [extent]만큼 넘칠 때(= 스크롤 가능 거리) 전체 쪽 수.
  static int pageCount(double extent, double viewport) {
    if (extent <= 0.5 || viewport <= 0) return 1;
    return 1 + (extent / (viewport * pageFraction)).ceil();
  }

  /// 위치 [offset]에서 보이는 쪽 번호(1부터).
  static int pageAt(double offset, double extent, double viewport) {
    final n = pageCount(extent, viewport);
    if (n == 1) return 1;
    final k = 1 + (offset / (viewport * pageFraction) - 0.01).ceil();
    return k.clamp(1, n);
  }

  /// 남은 줄 수(올림). [lineHeight]는 큰 글자 한 줄 높이.
  static int linesLeft(double remaining, double lineHeight) =>
      math.max(1, (remaining / lineHeight).ceil());

  @override
  State<PrayerTextView> createState() => _PrayerTextViewState();
}

class _PrayerTextViewState extends State<PrayerTextView> {
  final ScrollController _controller = ScrollController();

  double _extent = 0;
  double _offset = 0;
  double _viewport = 0;

  /// 넘침 표시 칸을 잡아 두었는지. 칸을 잡으면 글 칸이 그만큼 줄어든다.
  bool _reserve = false;

  /// 짧게 보기 중 이 스텝만 전문으로 펼쳤는지.
  bool _showFull = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onScroll);
  }

  @override
  void didUpdateWidget(PrayerTextView old) {
    super.didUpdateWidget(old);
    if (old.stepIndex != widget.stepIndex) {
      _showFull = false;
      _offset = 0;
      if (_controller.hasClients) _controller.jumpTo(0);
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_onScroll);
    _controller.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_controller.hasClients) return;
    final p = _controller.position;
    if (!p.hasContentDimensions) return;
    _apply(p.pixels, p.maxScrollExtent, p.viewportDimension);
  }

  bool _onMetrics(ScrollMetricsNotification n) {
    final m = n.metrics;
    _apply(m.pixels, m.maxScrollExtent, m.viewportDimension);
    return false;
  }

  void _apply(double offset, double extent, double viewport) {
    // 칸을 잡은 상태에서는 칸이 그만큼 줄어 있으므로, 전체 높이 기준으로 넘치는지 판단한다.
    final want = _reserve
        ? extent > PrayerTextView.pillRowHeight + 0.5
        : extent > 0.5;
    if (offset == _offset &&
        extent == _extent &&
        viewport == _viewport &&
        want == _reserve) {
      return;
    }
    void commit() {
      if (!mounted) return;
      setState(() {
        _offset = offset;
        _extent = extent;
        _viewport = viewport;
        _reserve = want;
      });
    }

    final phase = SchedulerBinding.instance.schedulerPhase;
    if (phase == SchedulerPhase.persistentCallbacks ||
        phase == SchedulerPhase.transientCallbacks ||
        phase == SchedulerPhase.midFrameMicrotasks) {
      SchedulerBinding.instance.addPostFrameCallback((_) => commit());
    } else {
      commit();
    }
  }

  void _pageDown() {
    if (!_controller.hasClients) return;
    final p = _controller.position;
    final target = math.min(
      p.maxScrollExtent,
      p.pixels + p.viewportDimension * PrayerTextView.pageFraction,
    );
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.jumpTo(target);
    } else {
      _controller.animateTo(
        target,
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOutCubic,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final step = widget.step;
    final scale = widget.scale;
    final reduce = MediaQuery.disableAnimationsOf(context);
    final bigSize = (widget.font == PrayerFont.serif ? 25.0 : 24.0) * scale;
    final shortForm = widget.short ? ShortPrayers.of(step) : null;
    final shortShown = shortForm != null && !_showFull;

    final remaining = _extent - _offset;
    final showPill = _reserve && remaining > 2;

    final content = _Content(
      step: step,
      mode: widget.mode,
      font: widget.font,
      scale: scale,
      short: shortShown ? shortForm : null,
      leaderSpeaking: widget.leaderSpeaking,
    );

    final label = [
      if (step.heading != null) step.heading!.replaceAll('\n', '. '),
      step.title,
      step.text.replaceAll('\n', ' '),
    ].join('. ');

    return Column(
      children: [
        Expanded(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: widget.onAdvance,
            child: TweenAnimationBuilder<double>(
              key: ValueKey(widget.stepIndex),
              tween: Tween(begin: 0.25, end: 1),
              duration: reduce
                  ? Duration.zero
                  : const Duration(milliseconds: 160),
              curve: Curves.easeOut,
              builder: (context, value, child) =>
                  Opacity(opacity: value, child: child),
              child: NotificationListener<ScrollMetricsNotification>(
                onNotification: _onMetrics,
                child: SingleChildScrollView(
                  key: const ValueKey('prayer-text-scroll'),
                  controller: _controller,
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        maxWidth: widget.maxContentWidth,
                      ),
                      child: SizedBox(
                        width: double.infinity,
                        // 화면 읽기 프로그램은 쪽이 아니라 전문을 읽는다(짧게 보기 중에도).
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Semantics(
                              container: true,
                              label: label,
                              child: ExcludeSemantics(
                                child: MediaQuery.withNoTextScaling(
                                  child: content,
                                ),
                              ),
                            ),
                            if (shortForm != null)
                              _ShortHint(
                                showingFull: _showFull,
                                onToggle: () =>
                                    setState(() => _showFull = !_showFull),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        if (_reserve)
          SizedBox(
            height: PrayerTextView.pillRowHeight,
            child: showPill
                ? Center(
                    child: _OverflowPill(
                      key: const ValueKey('prayer-overflow-pill'),
                      label:
                          '↓ ${PrayerTextView.linesLeft(remaining, bigSize * 1.6)}줄 더 '
                          '(쪽 ${PrayerTextView.pageAt(_offset, _extent, _viewport)}'
                          '/${PrayerTextView.pageCount(_extent, _viewport)})',
                      onTap: _pageDown,
                    ),
                  )
                : null,
          ),
      ],
    );
  }
}

class _OverflowPill extends StatelessWidget {
  const _OverflowPill({super.key, required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      button: true,
      label: '$label, 아래로 한 쪽 내리기',
      excludeSemantics: true,
      onTap: onTap,
      child: InkWell(
        onTap: onTap,
        customBorder: const StadiumBorder(),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
          child: Center(
            widthFactor: 1,
            child: DecoratedBox(
              decoration: ShapeDecoration(
                color: scheme.secondaryContainer,
                shape: const StadiumBorder(),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: scheme.onSecondaryContainer,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// '외운 기도 짧게 보기' 안내와 전문 보기 단추.
class _ShortHint extends StatelessWidget {
  const _ShortHint({required this.showingFull, required this.onToggle});

  final bool showingFull;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              '외운 기도 짧게 보기',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          TextButton(
            key: const ValueKey('prayer-short-toggle'),
            style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
            onPressed: onToggle,
            child: Text(showingFull ? '짧게 보기' : '전체 기도문 보기'),
          ),
        ],
      ),
    );
  }
}

class _Content extends StatelessWidget {
  const _Content({
    required this.step,
    required this.mode,
    required this.font,
    required this.scale,
    required this.short,
    required this.leaderSpeaking,
  });

  final RosaryStep step;
  final PrayerMode mode;
  final PrayerFont font;
  final double scale;
  final ShortPrayer? short;
  final bool leaderSpeaking;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (leaderSpeaking) const _LeaderPlayingBadge(),
        if (step.heading != null)
          _HeadingCard(heading: step.heading!, scale: scale),
        _PrayerText(
          step: step,
          mode: mode,
          font: font,
          scale: scale,
          short: short,
        ),
      ],
    );
  }
}

class _LeaderPlayingBadge extends StatelessWidget {
  const _LeaderPlayingBadge();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Pill(
          label: '선창 재생 중',
          icon: Icons.volume_up,
          background: scheme.tertiaryContainer,
          foreground: scheme.onTertiaryContainer,
        ),
      ),
    );
  }
}

/// 신비 안내(단 첫 구슬). 짧게 보기 중에도 늘 전문이다.
class _HeadingCard extends StatelessWidget {
  const _HeadingCard({required this.heading, required this.scale});

  final String heading;
  final double scale;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final lines = heading.split('\n');
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: SoftCard(
        color: scheme.secondaryContainer,
        borderColor: Colors.transparent,
        padding: const EdgeInsets.all(18),
        child: SizedBox(
          width: double.infinity,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                lines.first,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontSize:
                      (theme.textTheme.titleMedium?.fontSize ?? 16) * scale,
                  color: scheme.onSecondaryContainer,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (lines.length > 1) ...[
                const SizedBox(height: 6),
                Text(
                  lines.skip(1).join('\n'),
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontSize:
                        (theme.textTheme.bodyLarge?.fontSize ?? 16) * scale,
                    color: scheme.onSecondaryContainer,
                    height: 1.5,
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

class _PrayerText extends StatelessWidget {
  const _PrayerText({
    required this.step,
    required this.mode,
    required this.font,
    required this.scale,
    required this.short,
  });

  final RosaryStep step;
  final PrayerMode mode;
  final PrayerFont font;
  final double scale;

  /// 있으면 전문 대신 이 첫머리를 보인다.
  final ShortPrayer? short;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final onSurface = scheme.onSurface;
    final dim = onSurface.withValues(alpha: 0.45);
    final split = step.responderText.isNotEmpty;
    final big = (font == PrayerFont.serif ? 25.0 : 24.0) * scale;
    final small = big - 6 * scale;

    TextStyle style(double size, Color color, {bool bold = false}) =>
        AppTheme.prayerStyle(
          context,
          font,
          size: size,
          color: color,
          bold: bold,
        );

    final short = this.short;
    if (short != null) return _buildShort(context, short, style, big, small);

    if (mode == PrayerMode.solo) {
      return Text(step.text, style: style(big, onSurface));
    }

    // 나뉘지 않는 기도(성호경 등)는 모두 함께 바친다.
    if (!split) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _RoleLabel(text: '모두 함께'),
          Text(step.text, style: style(big, onSurface, bold: true)),
        ],
      );
    }

    final leaderMine = mode == PrayerMode.leader;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _RoleLabel(text: leaderMine ? '내 차례: 앞단' : '내 차례: 뒷단'),
        Text(
          step.leaderText,
          style: leaderMine
              ? style(big, onSurface, bold: true)
              : style(small, dim),
        ),
        Text(
          step.responderText,
          style: leaderMine
              ? style(small, dim)
              : style(big, onSurface, bold: true),
        ),
      ],
    );
  }

  /// 짧게 보기: 성모송은 큰 번호 + 앞단·뒷단 첫머리만.
  Widget _buildShort(
    BuildContext context,
    ShortPrayer short,
    TextStyle Function(double, Color, {bool bold}) style,
    double big,
    double small,
  ) {
    final scheme = Theme.of(context).colorScheme;
    final onSurface = scheme.onSurface;
    final dim = onSurface.withValues(alpha: 0.45);
    final leaderMine = mode == PrayerMode.leader;
    final responderMine = mode == PrayerMode.responder;

    final Widget lines;
    if (mode == PrayerMode.solo) {
      lines = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(short.leader, style: style(big, onSurface)),
          Text(short.responder, style: style(small, dim)),
        ],
      );
    } else {
      lines = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _RoleLabel(text: leaderMine ? '내 차례: 앞단' : '내 차례: 뒷단'),
          Text(
            short.leader,
            style: leaderMine
                ? style(big, onSurface, bold: true)
                : style(small, dim),
          ),
          Text(
            short.responder,
            style: responderMine
                ? style(big, onSurface, bold: true)
                : style(small, dim),
          ),
        ],
      );
    }

    final n = step.kind == StepKind.hailMary ? step.beadIndex : null;
    if (n == null) return lines;
    final total = step.decade == null ? 3 : 10;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: '$n',
                  style: style(big * 1.5, scheme.primary, bold: true),
                ),
                TextSpan(
                  text: ' / $total',
                  style: style(big * 0.8, scheme.onSurfaceVariant, bold: true),
                ),
              ],
            ),
          ),
        ),
        lines,
      ],
    );
  }
}

class _RoleLabel extends StatelessWidget {
  const _RoleLabel({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Pill(
          label: text,
          dense: true,
          background: scheme.secondaryContainer,
          foreground: scheme.onSecondaryContainer,
        ),
      ),
    );
  }
}
