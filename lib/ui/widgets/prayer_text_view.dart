import 'dart:math' as math;
import 'dart:ui' show BoxHeightStyle;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';

import '../../app/prayer_text_short.dart';
import '../../app/settings.dart';
import '../../app/theme.dart';
import '../../domain/prayer_mode.dart';
import '../../domain/rosary_sequence.dart';
import 'pill.dart';
import 'soft_card.dart';

/// 기도문 칸. 남는 높이를 모두 쓰는 **독립 스크롤 영역**이다.
///
/// - 글자 크기는 [scale]만 따른다. 이 위젯 안에서는 시스템 글자 배율을 다시 곱하지 않는다
///   (`MediaQuery.withNoTextScaling`). 시스템 배율을 반영할지는 부르는 쪽이 [scale]에 담는다.
/// - 글이 넘치면 숨기지 않는다. 손가락으로 밀어 끝까지 읽을 수 있고, 스크롤 막대와 위·아래
///   흐림(그라데이션)으로 더 있음을 알린다. 글 칸 **아래**에 따로 자리를 잡은
///   '기도문 계속 읽기' 단추는 같은 기도문 안에서 아래로만 내린다(구슬은 바뀌지 않는다).
/// - 내릴 때는 **온전한 줄**에서 끊는다. 아래에서 잘려 보이던 줄이 다음 쪽의 첫 줄이 된다.
/// - 글을 짧게 누르면: 아직 읽지 않은 글이 아래에 있으면 한 쪽 아래로, 끝까지 읽었으면
///   [onAdvance](다음 구슬). 구슬을 넘기는 단추([PrayerActions])는 글 칸 밖에 늘 있으므로
///   끝까지 읽지 않아도 언제든 넘길 수 있다.
/// - 어떤 조작 요소도 기도문을 가리지 않는다.
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

  /// '기도문 계속 읽기' 칸의 높이(터치 영역 48).
  static const double moreRowHeight = 48;

  /// 넘친 글의 위·아래 흐림 높이. 잘린 줄이 '끝'이 아니라 '더 있음'으로 읽히게 한다.
  static const double fadeExtent = 20;

  /// 줄 위치를 알 수 없을 때 한 번에 내리는 거리: 칸 높이에서 큰 글자 한 줄을 뺀 만큼
  /// (잘려 보이던 줄이 다음 쪽에서 온전히 보인다). 칸이 아주 낮아도 절반은 내린다.
  static double fallbackPageStep(double viewport, double lineHeight) =>
      math.max(viewport * 0.5, viewport - lineHeight);

  /// 한 쪽 아래의 스크롤 위치를 **줄 경계**에 맞춰 구한다.
  ///
  /// [lines]는 스크롤 내용 좌표의 각 줄 (위, 아래). 지금 화면([offset]..[offset]+[viewport])에서
  /// 아래가 잘렸거나 아직 안 보이는 첫 줄을 찾아, 그 줄이 칸 맨 위([topInset]만큼 아래)에
  /// 오게 한다. 못 찾으면 [fallbackPageStep].
  static double nextPageOffset({
    required double offset,
    required double viewport,
    required double maxExtent,
    required List<(double, double)> lines,
    required double lineHeight,
    double topInset = fadeExtent,
  }) {
    final visibleBottom = offset + viewport - fadeExtent;
    double? target;
    for (final (top, bottom) in lines) {
      if (bottom > visibleBottom + 0.5 && top - topInset > offset + 0.5) {
        target = top - topInset;
        break;
      }
    }
    target ??= offset + fallbackPageStep(viewport, lineHeight);
    return target.clamp(0.0, maxExtent);
  }

  @override
  State<PrayerTextView> createState() => _PrayerTextViewState();
}

class _PrayerTextViewState extends State<PrayerTextView> {
  final ScrollController _controller = ScrollController();

  double _extent = 0;
  double _offset = 0;
  double _viewport = 0;

  /// '기도문 계속 읽기' 칸을 잡아 두었는지. 칸을 잡으면 글 칸이 그만큼 줄어든다.
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
        ? extent > PrayerTextView.moreRowHeight + 0.5
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

  final GlobalKey _contentKey = GlobalKey();

  /// 스크롤 내용 좌표로 본 모든 글줄의 (위, 아래). 위에서 아래 순서.
  List<(double, double)> _lineExtents() {
    final root = _contentKey.currentContext?.findRenderObject();
    if (root is! RenderBox || !root.attached || !_controller.hasClients) {
      return const [];
    }
    // 내용 상자의 맨 위가 스크롤 내용에서 차지하는 자리(위 여백).
    const contentTop = _scrollPadding;
    final lines = <(double, double)>[];
    void visit(RenderObject o) {
      if (o is RenderParagraph && o.hasSize) {
        final dy = o.localToGlobal(Offset.zero, ancestor: root).dy + contentTop;
        final length = o.text.toPlainText(includeSemanticsLabels: false).length;
        final boxes = o.getBoxesForSelection(
          TextSelection(baseOffset: 0, extentOffset: length),
          boxHeightStyle: BoxHeightStyle.max,
        );
        for (final b in boxes) {
          final top = dy + b.top;
          final bottom = dy + b.bottom;
          // 같은 줄의 여러 조각(굵기·크기가 다른 글)은 한 줄로 합친다.
          if (lines.isNotEmpty && top < lines.last.$2 - 1) {
            final last = lines.removeLast();
            lines.add((math.min(last.$1, top), math.max(last.$2, bottom)));
          } else {
            lines.add((top, bottom));
          }
        }
      }
      o.visitChildren(visit);
    }

    visit(root);
    lines.sort((a, b) => a.$1.compareTo(b.$1));
    return lines;
  }

  /// 같은 기도문 안에서 한 쪽 아래로. 구슬은 바뀌지 않는다.
  void _pageDown() {
    if (!_controller.hasClients) return;
    final p = _controller.position;
    final target = PrayerTextView.nextPageOffset(
      offset: p.pixels,
      viewport: p.viewportDimension,
      maxExtent: p.maxScrollExtent,
      lines: _lineExtents(),
      lineHeight: AppTheme.baseFontSize * widget.scale * 1.6,
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

  /// 아직 읽지 않은 글이 아래에 남았는지.
  bool get _hasMoreBelow => _reserve && _extent - _offset > 2;

  /// 글을 짧게 눌렀을 때: 남은 글이 있으면 계속 읽기, 없으면 다음 구슬.
  void _onTextTap() {
    if (_hasMoreBelow) {
      _pageDown();
    } else {
      widget.onAdvance();
    }
  }

  static const double _scrollPadding = 8;

  @override
  Widget build(BuildContext context) {
    final step = widget.step;
    final scale = widget.scale;
    final reduce = MediaQuery.disableAnimationsOf(context);
    final shortForm = widget.short ? ShortPrayers.of(step) : null;
    final shortShown = shortForm != null && !_showFull;

    final showMore = _hasMoreBelow;
    final fadeTop = _reserve && _offset > 2;

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
            onTap: _onTextTap,
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
                child: _EdgeFade(
                  top: fadeTop,
                  bottom: showMore,
                  child: Scrollbar(
                    key: const ValueKey('prayer-text-scrollbar'),
                    controller: _controller,
                    // 넘칠 때는 늘 보여서 '더 있음'과 지금 위치를 알린다.
                    thumbVisibility: _reserve,
                    child: SingleChildScrollView(
                      key: const ValueKey('prayer-text-scroll'),
                      controller: _controller,
                      padding: const EdgeInsets.fromLTRB(
                        20,
                        _scrollPadding,
                        20,
                        16,
                      ),
                      child: Center(
                        child: ConstrainedBox(
                          constraints: BoxConstraints(
                            maxWidth: widget.maxContentWidth,
                          ),
                          child: SizedBox(
                            width: double.infinity,
                            // 화면 읽기 프로그램은 쪽이 아니라 전문을 읽는다(짧게 보기 중에도).
                            child: Column(
                              key: _contentKey,
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
          ),
        ),
        if (_reserve)
          SizedBox(
            height: PrayerTextView.moreRowHeight,
            child: showMore
                ? Center(
                    child: _ReadMoreButton(
                      key: const ValueKey('prayer-read-more'),
                      onTap: _pageDown,
                    ),
                  )
                : null,
          ),
      ],
    );
  }
}

/// 넘친 글의 위·아래 가장자리를 흐리게 한다(바탕색과 무관하게 글만 옅어진다).
class _EdgeFade extends StatelessWidget {
  const _EdgeFade({
    required this.top,
    required this.bottom,
    required this.child,
  });

  final bool top;
  final bool bottom;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!top && !bottom) return child;
    return ShaderMask(
      blendMode: BlendMode.dstIn,
      shaderCallback: (rect) {
        final f = (PrayerTextView.fadeExtent / math.max(1.0, rect.height))
            .clamp(0.0, 0.5);
        const clear = Color(0x00000000);
        const solid = Color(0xFF000000);
        return LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [top ? clear : solid, solid, solid, bottom ? clear : solid],
          stops: [0, f, 1 - f, 1],
        ).createShader(rect);
      },
      child: child,
    );
  }
}

/// '기도문 계속 읽기': 같은 기도문 안에서 아래로 내린다. 구슬을 넘기는 채운 단추와 헷갈리지
/// 않도록 테두리만 있는 작은 알약 모양에 아래 화살표를 둔다.
class _ReadMoreButton extends StatelessWidget {
  const _ReadMoreButton({super.key, required this.onTap});

  final VoidCallback onTap;

  static const String label = '기도문 계속 읽기';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Semantics(
      button: true,
      label: '$label. 같은 기도문을 아래로 내립니다. 구슬은 바뀌지 않습니다',
      excludeSemantics: true,
      onTap: onTap,
      // M3 outlined 버튼(보조 행동): 구슬을 넘기는 filled 버튼과 위계가 구분된다.
      // 시각 높이 40dp, 터치 영역 48dp(padded).
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
        child: Center(
          widthFactor: 1,
          child: OutlinedButton.icon(
            onPressed: onTap,
            style: OutlinedButton.styleFrom(
              foregroundColor: scheme.onSurfaceVariant,
              padding: const EdgeInsetsDirectional.fromSTEB(12, 0, 16, 0),
              tapTargetSize: MaterialTapTargetSize.padded,
            ),
            icon: const Icon(Icons.keyboard_double_arrow_down),
            label: Text(label, maxLines: 1),
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
    final big = AppTheme.baseFontSize * scale;
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
    // 짧게 보기의 보조 줄은 더 작게 해서 큰 글자에서도 한 줄에 들어가게 한다.
    if (short != null) {
      return _buildShort(context, short, style, big, big * 0.7);
    }

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
                  style: style(
                    big * 1.2,
                    scheme.primary,
                    bold: true,
                  ).copyWith(height: 1.15),
                ),
                TextSpan(
                  text: ' / $total',
                  style: style(
                    big * 0.7,
                    scheme.onSurfaceVariant,
                    bold: true,
                  ).copyWith(height: 1.15),
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
