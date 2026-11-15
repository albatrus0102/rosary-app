import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import '../app/settings.dart';
import '../app/theme.dart';
import '../domain/prayer_data.dart';
import '../domain/rosary_sequence.dart';
import '../rosary3d/rosary_feedback.dart';
import '../rosary3d/rosary_model.dart';
import '../rosary3d/rosary_scene.dart';
import 'church_hud.dart';
import 'church_prayer_card.dart';

/// 성당에서 앉아 바치는 묵주기도의 아래 패널(T-81): 고른 3D 묵주(C안, 현재 알 중심 3~5알)를 손에 쥔 듯 넘긴다.
///
/// 화면의 38% 안팎만 덮어 위쪽 장면(앉거나 무릎 꿇은 아바타)이 보이게 한다. 기도문은 접혀 있고 펼칠 때만 커진다.
/// 진행은 [ChurchPrayerController.session](성당 밖 기도 화면과 같은 세션 로직), 진동·소리는 묵주 화면과 같은 규칙.
/// 3D 는 묵주 전용 페이지를 작은 WebView 로 띄운다(정지하면 그리지 않는다 — docs/rosary/ROSARY_3D.md '성당 묵주 패널').
class ChurchRosaryPanel extends StatefulWidget {
  const ChurchRosaryPanel({
    super.key,
    required this.controller,
    required this.settings,
    required this.onTogglePause,
    required this.onStand,
    this.onPosture,
    required this.onEnd,
    required this.onFullScreen,
    this.onInset,
    this.scene,
    this.feedback,
    this.standing = false,
  });

  /// 성모상 앞에서 서서 하는 기도: 자세 선택 대신 '서서' 표시를 둔다(좌석이 없어 앉기·무릎 꿇기는 없다).
  final bool standing;

  final ChurchPrayerController controller;
  final AppSettings settings;
  final VoidCallback onTogglePause;
  final VoidCallback onStand;
  final ValueChanged<PrayerPosture>? onPosture;
  final VoidCallback onEnd;
  final VoidCallback onFullScreen;

  /// 패널이 화면 아래를 덮는 비율(0..1). 성당 장면이 그만큼 위로 올라가게 쓴다. 사라질 때 0.
  final ValueChanged<double>? onInset;

  /// 테스트용 주입.
  final RosaryScene? scene;
  final RosaryFeedbackSink? feedback;

  /// 테스트용: 성당 화면이 만드는 패널의 촉각·소리 출력을 바꾼다.
  @visibleForTesting
  static RosaryFeedbackSink? debugFeedback;

  /// 기도문을 접었을 때 패널 높이 상한(화면 비율).
  static const double maxClosed = 0.38;

  @override
  State<ChurchRosaryPanel> createState() => _ChurchRosaryPanelState();
}

class _ChurchRosaryPanelState extends State<ChurchRosaryPanel> {
  late final RosaryScene _scene;
  late final RosaryFeedbackSink _fb;
  final BeadPull _pull = BeadPull();
  final GlobalKey _boxKey = GlobalKey();
  bool _textOpen = false;
  late int _last;
  double _sentInset = -1;
  static const double _areaH = 132;
  static final ButtonStyle _standStyle = FilledButton.styleFrom(
    minimumSize: const Size(88, 48),
    padding: const EdgeInsets.symmetric(horizontal: 16),
  );

  ChurchPrayerController get _c => widget.controller;

  @override
  void initState() {
    super.initState();
    final s = widget.settings;
    _scene = widget.scene ?? RosaryScene.create();
    _scene.state
      ..['rosary'] = s.rosaryId
      ..['step'] = _c.session.index
      ..['theme'] = s.rosaryBackdrop.name
      ..['compact'] = true
      ..['quality'] = s.churchQuality == ChurchQuality.low ? 'low' : 'high';
    _scene.setStep(_c.session.index, animate: false);
    _fb =
        widget.feedback ??
        ChurchRosaryPanel.debugFeedback ??
        DeviceRosaryFeedback();
    _last = _c.session.index;
    _c.session.addListener(_onStep);
  }

  @override
  void didUpdateWidget(ChurchRosaryPanel old) {
    super.didUpdateWidget(old);
    if (old.controller != widget.controller) {
      old.controller.session.removeListener(_onStep);
      _last = _c.session.index;
      widget.controller.session.addListener(_onStep);
      _scene.setStep(_last, animate: false);
    }
  }

  @override
  void dispose() {
    _c.session.removeListener(_onStep);
    widget.onInset?.call(0);
    if (widget.scene == null) _scene.dispose();
    if (widget.feedback == null && ChurchRosaryPanel.debugFeedback == null) {
      unawaited(_fb.dispose());
    }
    super.dispose();
  }

  void _onStep() {
    final now = _c.session.index, before = _last;
    if (now == before) return;
    _last = now;
    _scene.setStep(now, animate: !MediaQuery.disableAnimationsOf(context));
    playRosaryStepCue(_fb, _c.session, widget.settings, before, now);
  }

  bool _canGo(int dir) => dir > 0
      ? _c.session.index < _c.session.steps.length - 1
      : _c.session.index > 0;

  void _go(int dir) {
    if (!_canGo(dir)) return;
    if (dir > 0) {
      _c.session.next();
    } else {
      _c.session.back();
    }
  }

  void _reportInset() {
    final cb = widget.onInset;
    if (cb == null || !mounted) return;
    final box = _boxKey.currentContext?.findRenderObject() as RenderBox?;
    if (box == null || !box.hasSize) return;
    final screenH = MediaQuery.sizeOf(context).height;
    final top = box.localToGlobal(Offset.zero).dy;
    final f = ((screenH - top) / screenH).clamp(0.0, 0.6);
    if ((f - _sentInset).abs() < 0.02) return;
    _sentInset = f;
    cb(f);
  }

  String _title(RosaryStep s) =>
      s.title.replaceFirst(RegExp(r'\s*\d+/\d+$'), '');

  String _line(RosaryStep s) {
    final name = _c.mysterySet.koreanName;
    final where = s.kind == StepKind.closing
        ? '마침'
        : (s.decade == null ? '서두' : '${s.decade}단');
    return '$name · $where';
  }

  String? _count(RosaryStep s) =>
      s.kind == StepKind.hailMary && s.beadIndex != null
      ? '${s.beadIndex}/${s.decade == null ? 3 : 10}'
      : null;

  @override
  Widget build(BuildContext context) {
    SchedulerBinding.instance.addPostFrameCallback((_) => _reportInset());
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final size = MediaQuery.sizeOf(context);
    return ListenableBuilder(
      listenable: Listenable.merge([_c, widget.settings]),
      builder: (context, _) {
        final session = _c.session;
        final finished = _c.finished;
        final step = session.current;
        final count = _count(step);
        return Card.filled(
          key: _boxKey,
          color: ChurchHudStyle.surface(scheme),
          elevation: ChurchHudStyle.elevation,
          margin: EdgeInsets.zero,
          shape: ChurchHudStyle.plaque(scheme),
          clipBehavior: Clip.antiAlias,
          child: ConstrainedBox(
            key: const ValueKey('church-rosary-panel'),
            constraints: BoxConstraints(
              maxHeight:
                  size.height *
                  (_textOpen ? 0.62 : ChurchRosaryPanel.maxClosed),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpace.sm,
                0,
                AppSpace.xs,
                AppSpace.xs,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _header(theme, finished),
                  if (finished)
                    Padding(
                      padding: const EdgeInsets.only(right: 8, bottom: 8),
                      child: Text(
                        '${_c.mysterySet.koreanName} 묵주기도를 모두 바쳤습니다. 평화를 빕니다.',
                        style: theme.textTheme.bodyLarge,
                      ),
                    )
                  else ...[
                    SizedBox(
                      height: _areaH,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _beads(step, count),
                          const SizedBox(width: AppSpace.xs),
                          Expanded(child: _info(theme, step, count)),
                        ],
                      ),
                    ),
                    if (_textOpen)
                      Flexible(
                        child: SingleChildScrollView(
                          key: const ValueKey('church-rosary-text'),
                          padding: const EdgeInsets.fromLTRB(0, 6, 8, 0),
                          child: Text(
                            step.text,
                            style: AppTheme.prayerStyle(
                              context,
                              widget.settings.prayerFont,
                              size: 15 * widget.settings.prayerTextScale,
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ),
                  ],
                  const SizedBox(height: 6),
                  _bottomRow(finished),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _header(ThemeData theme, bool finished) {
    final scheme = theme.colorScheme;
    return SizedBox(
      height: 40,
      child: Row(
        children: [
          Expanded(
            child: Text(
              finished ? '기도를 마쳤습니다' : (_c.paused ? '묵주기도 · 쉬는 중' : '묵주기도 중'),
              style: theme.textTheme.labelLarge?.copyWith(
                color: scheme.primary,
              ),
            ),
          ),
          Icon(Icons.timer_outlined, size: 16, color: scheme.onSurfaceVariant),
          const SizedBox(width: 4),
          Text(
            _c.timeLabel,
            key: const ValueKey('prayer-timer'),
            style: theme.textTheme.labelLarge?.copyWith(
              color: scheme.onSurfaceVariant,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          if (!finished)
            PopupMenuButton<int>(
              key: const ValueKey('prayer-menu'),
              tooltip: '더보기',
              icon: const Icon(Icons.more_vert),
              onSelected: (m) => switch (m) {
                0 => widget.onTogglePause(),
                1 => widget.onFullScreen(),
                _ => widget.onEnd(),
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 0,
                  child: Text(_c.paused ? '이어 기도' : '잠깐 쉬기'),
                ),
                const PopupMenuItem(value: 1, child: Text('묵주기도 화면으로')),
                const PopupMenuItem(value: 2, child: Text('끝내기')),
              ],
            )
          else
            const SizedBox(width: 8),
        ],
      ),
    );
  }

  /// 3D 묵주(현재 알 중심). 세로로 당기면 한 알씩.
  Widget _beads(RosaryStep step, String? count) {
    return SizedBox(
      width: 104,
      child: Semantics(
        key: const ValueKey('church-rosary-area'),
        label:
            '묵주. ${_title(step)}${count == null ? '' : ' $count'}. 아래로 당기면 다음, 위로 당기면 이전',
        onIncrease: _canGo(1) ? () => _go(1) : null,
        onDecrease: _canGo(-1) ? () => _go(-1) : null,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onVerticalDragStart: (_) => _pull.start(),
          onVerticalDragUpdate: (d) {
            final off = _pull.update(d.delta.dy, _areaH * 0.42);
            _scene.setDrag(
              _canGo(off.sign.toInt()) ? off : off * 0.25,
              active: true,
            );
          },
          onVerticalDragEnd: (d) {
            final dir = _pull.end(
              d.primaryVelocity ?? 0,
              _areaH * 0.42,
              now: SchedulerBinding.instance.currentSystemFrameTimeStamp,
            );
            if (dir != 0) _go(dir);
            _scene.setDrag(0, active: false);
          },
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: IgnorePointer(
              child: ExcludeSemantics(child: _scene.buildView(context)),
            ),
          ),
        ),
      ),
    );
  }

  Widget _info(ThemeData theme, RosaryStep step, String? count) {
    final scheme = theme.colorScheme;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(text: _title(step)),
                  if (count != null)
                    TextSpan(
                      text: '  $count',
                      style: TextStyle(color: scheme.primary),
                    ),
                ],
              ),
              key: const ValueKey('prayer-step'),
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Text(
            _line(step),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              key: const ValueKey('church-rosary-text-toggle'),
              style: TextButton.styleFrom(
                minimumSize: const Size(48, 36),
                padding: const EdgeInsets.symmetric(horizontal: 4),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              onPressed: () => setState(() => _textOpen = !_textOpen),
              icon: Icon(_textOpen ? Icons.expand_more : Icons.expand_less),
              label: Text(_textOpen ? '기도문 접기' : '기도문 펼치기'),
            ),
          ),
          Row(
            children: [
              OutlinedButton(
                onPressed: _canGo(-1) ? () => _go(-1) : null,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(56, 48),
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
                child: const Text('이전'),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton(
                  key: const ValueKey('prayer-next'),
                  // 마지막 기도에서는 다음이 기도를 마친다(세션이 끝남 → 카드가 마침으로).
                  onPressed: () => _c.session.next(),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(80, 48),
                    textStyle: theme.textTheme.titleMedium,
                  ),
                  child: const Text('다음'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _bottomRow(bool finished) {
    return Row(
      children: [
        Expanded(
          child: widget.standing
              ? const Align(
                  alignment: Alignment.centerLeft,
                  child: Chip(
                    key: ValueKey('prayer-posture-stand'),
                    avatar: Icon(Icons.accessibility_new, size: 18),
                    label: Text('서서'),
                    visualDensity: VisualDensity.compact,
                  ),
                )
              : widget.onPosture == null
              ? const SizedBox.shrink()
              : Align(
                  alignment: Alignment.centerLeft,
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: MediaQuery.withClampedTextScaling(
                      maxScaleFactor: 1.3,
                      child: SegmentedButton<PrayerPosture>(
                        key: const ValueKey('prayer-posture'),
                        showSelectedIcon: false,
                        style: SegmentedButton.styleFrom(
                          tapTargetSize: MaterialTapTargetSize.padded,
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpace.xs,
                          ),
                        ),
                        segments: const [
                          ButtonSegment(
                            value: PrayerPosture.sit,
                            label: Text('앉아서'),
                            tooltip: '앉아서 기도',
                          ),
                          ButtonSegment(
                            value: PrayerPosture.kneel,
                            label: Text('무릎 꿇고'),
                            tooltip: '무릎 꿇고 기도',
                          ),
                        ],
                        selected: {widget.settings.prayerPosture},
                        onSelectionChanged: (s) =>
                            widget.onPosture?.call(s.first),
                      ),
                    ),
                  ),
                ),
        ),
        const SizedBox(width: 8),
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: finished
              ? FilledButton(
                  key: const ValueKey('prayer-stand'),
                  onPressed: widget.onStand,
                  style: _standStyle,
                  child: const Text('일어나기'),
                )
              : FilledButton.tonal(
                  key: const ValueKey('prayer-stand'),
                  onPressed: widget.onStand,
                  style: _standStyle,
                  child: const Text('일어나기'),
                ),
        ),
      ],
    );
  }
}
