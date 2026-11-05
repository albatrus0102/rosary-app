import 'dart:async';

import 'package:flutter/material.dart';

import '../app/leader_audio_store.dart';
import '../app/rosary_style.dart';
import '../app/settings.dart';
import '../app/sound_player.dart';
import '../domain/prayer_data.dart';
import '../domain/prayer_mode.dart';
import '../domain/rosary_sequence.dart';
import 'prayer_screen.dart';
import 'widgets/pill.dart';
import 'widgets/section_header.dart';

/// 저장된 진행 상태를 '이어서 기도하기'로 보여 줄 수 있는 기간.
const Duration resumeValidFor = Duration(days: 7);

/// 한국어 상대 시간: '방금', 'n분 전', 'n시간 전', '어제', 'n일 전'.
String relativeTimeKo(DateTime at, DateTime now) {
  final diff = now.difference(at);
  if (diff.inMinutes < 1) return '방금';
  if (diff.inMinutes < 60) return '${diff.inMinutes}분 전';
  final days = DateTime(
    now.year,
    now.month,
    now.day,
  ).difference(DateTime(at.year, at.month, at.day)).inDays;
  if (days <= 0) return '${diff.inHours}시간 전';
  if (days == 1) return '어제';
  return '$days일 전';
}

/// 시작 화면: 이어서 기도, 신비 선택, 기도 모드, 시작 버튼.
/// 소리·글꼴 등 설정은 설정 화면에 있다.
class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.settings,
    this.leaderAudio,
    this.soundPlayer,
    this.onOpenSettings,
    this.onOpenStyles,
  });

  final AppSettings settings;

  /// 기도 화면에 넘길 선창 음성 저장소(테스트용 주입).
  final LeaderAudioStore? leaderAudio;

  /// 기도 화면에 넘길 소리 재생기(테스트용 주입).
  final SoundPlayer? soundPlayer;

  /// '설정 열기'를 눌렀을 때(셸이 설정 목적지로 이동시킨다).
  final VoidCallback? onOpenSettings;

  /// 상단 묵주 그림을 눌렀을 때(셸이 묵주 목적지로 이동시킨다).
  final VoidCallback? onOpenStyles;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const double _maxWidth = 720;

  AppSettings get settings => widget.settings;

  /// 기도 화면을 연다. [resume]이 있으면 그 위치부터, [fresh]면 저장 기록을 지우고 처음부터.
  Future<void> _startPrayer({
    MysterySet? set,
    int initialIndex = 0,
    bool clearSaved = false,
  }) async {
    if (clearSaved) settings.clearProgress();
    final target = set ?? settings.mysterySet;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PrayerScreen(
          settings: settings,
          mysterySet: target,
          initialIndex: initialIndex,
          leaderAudio: widget.leaderAudio,
          soundPlayer: widget.soundPlayer,
        ),
      ),
    );
    // 기도 중 저장된 진행 상태(알림 없이 갱신됨)를 다시 읽는다.
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      bottomNavigationBar: _buildStartBar(context),
      body: ListenableBuilder(
        listenable: settings,
        builder: (context, _) => CustomScrollView(
          slivers: [
            const SliverAppBar.large(title: Text('묵주기도')),
            SliverToBoxAdapter(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: _maxWidth),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    child: _buildContent(context),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 아래에 고정된 '기도 시작' 버튼.
  Widget _buildStartBar(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Material(
      color: scheme.surface,
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: scheme.outlineVariant)),
        ),
        child: SafeArea(
          top: false,
          child: Center(
            heightFactor: 1,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: _maxWidth),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(56),
                    textStyle: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('기도 시작'),
                  onPressed: () => unawaited(_startPrayer()),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// 저장된 진행 상태가 7일 안이고 스텝 인덱스가 유효하면 그것을, 아니면 null.
  SavedPrayer? _validSaved() {
    final saved = settings.savedPrayer;
    if (saved == null) return null;
    if (DateTime.now().difference(saved.savedAt) > resumeValidFor) return null;
    final steps = buildRosarySequence(saved.mysterySet);
    if (saved.stepIndex < 0 || saved.stepIndex >= steps.length) return null;
    return saved;
  }

  Widget _buildResumeCard(BuildContext context, SavedPrayer saved) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final step = buildRosarySequence(saved.mysterySet)[saved.stepIndex];
    final parts = [
      saved.mysterySet.koreanName,
      if (step.decade != null) '${step.decade}단',
      step.title,
      relativeTimeKo(saved.savedAt, DateTime.now()),
    ];
    return Card.filled(
      margin: EdgeInsets.zero,
      color: scheme.secondaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(
                  Icons.history,
                  size: 20,
                  color: scheme.onSecondaryContainer,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '이어서 기도하기',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: scheme.onSecondaryContainer,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              parts.join(' · '),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.onSecondaryContainer,
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              alignment: WrapAlignment.end,
              spacing: 8,
              runSpacing: 4,
              children: [
                TextButton(
                  style: TextButton.styleFrom(
                    minimumSize: const Size(48, 48),
                    foregroundColor: scheme.onSecondaryContainer,
                  ),
                  onPressed: () => unawaited(
                    _startPrayer(
                      set: saved.mysterySet,
                      initialIndex: 0,
                      clearSaved: true,
                    ),
                  ),
                  child: const Text('처음부터'),
                ),
                FilledButton(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: () => unawaited(
                    _startPrayer(
                      set: saved.mysterySet,
                      initialIndex: saved.stepIndex,
                    ),
                  ),
                  child: const Text('이어서 기도'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final today = mysterySetForWeekday(DateTime.now().weekday);
    final sets = MysterySet.values;
    final saved = _validSaved();

    Widget mysteryCard(MysterySet set) => Expanded(
      child: _MysteryCard(
        set: set,
        selected: set == settings.mysterySet,
        isToday: set == today,
        onTap: () => settings.mysterySet = set,
      ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (saved != null) ...[
          _buildResumeCard(context, saved),
          const SizedBox(height: 20),
        ],
        _HeroCard(style: settings.rosaryStyle, onTap: widget.onOpenStyles),
        const SizedBox(height: 24),
        const SectionHeader('오늘의 신비'),
        for (var i = 0; i < sets.length; i += 2) ...[
          if (i > 0) const SizedBox(height: 12),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                mysteryCard(sets[i]),
                const SizedBox(width: 12),
                if (i + 1 < sets.length)
                  mysteryCard(sets[i + 1])
                else
                  const Spacer(),
              ],
            ),
          ),
        ],
        const SizedBox(height: 12),
        _MysteryList(set: settings.mysterySet),
        const SizedBox(height: 28),
        const SectionHeader('기도 모드'),
        SegmentedButton<PrayerMode>(
          segments: const [
            ButtonSegment(
              value: PrayerMode.solo,
              icon: Icon(Icons.person),
              label: Text('혼자'),
            ),
            ButtonSegment(
              value: PrayerMode.leader,
              icon: Icon(Icons.record_voice_over),
              label: Text('선창'),
            ),
            ButtonSegment(
              value: PrayerMode.responder,
              icon: Icon(Icons.groups),
              label: Text('후창'),
            ),
          ],
          selected: {settings.prayerMode},
          onSelectionChanged: (v) => settings.prayerMode = v.first,
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 10, 4, 0),
          child: Text(
            settings.prayerMode.description,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
        ),
        AnimatedSize(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOutCubic,
          alignment: Alignment.topCenter,
          child: settings.prayerMode == PrayerMode.responder
              ? Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: _buildResponderHint(context),
                )
              : const SizedBox(width: double.infinity),
        ),
      ],
    );
  }

  Widget _buildResponderHint(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Card.outlined(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Icon(
                    Icons.info_outline,
                    size: 20,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    '선창 음성은 설정 > 선창 음성에서 바꿀 수 있어요',
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: widget.onOpenSettings,
                child: const Text('설정 열기'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// "마리아께서 예수님을 잉태하심을 묵상합시다." -> "마리아께서 예수님을 잉태하심"
String _shortMeditation(String meditation) =>
    meditation.replaceFirst(RegExp(r'[을를]? 묵상합시다\.$'), '');

/// 선택한 묵주 그림(최대 높이 160). 누르면 묵주 고르기로 이동한다.
class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.style, this.onTap});

  final RosaryStyle style;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Semantics(
      button: onTap != null,
      label: '묵주 모양 바꾸기',
      excludeSemantics: true,
      onTap: onTap,
      child: Card.filled(
        margin: EdgeInsets.zero,
        color: scheme.surfaceContainer,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(28),
          side: BorderSide(color: scheme.outlineVariant),
        ),
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: Image.asset(
                    style.fullImage,
                    height: 160,
                    width: 160,
                    fit: BoxFit.contain,
                    semanticLabel: '묵주 그림',
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        style.label,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (onTap != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                '묵주 바꾸기',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: scheme.primary,
                                ),
                              ),
                            ),
                            Icon(
                              Icons.chevron_right,
                              size: 20,
                              color: scheme.primary,
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MysteryCard extends StatelessWidget {
  const _MysteryCard({
    required this.set,
    required this.selected,
    required this.isToday,
    required this.onTap,
  });

  final MysterySet set;
  final bool selected;
  final bool isToday;
  final VoidCallback onTap;

  IconData get _icon => switch (set) {
    MysterySet.joyful => Icons.wb_twilight,
    MysterySet.luminous => Icons.wb_sunny_outlined,
    MysterySet.sorrowful => Icons.favorite_border,
    MysterySet.glorious => Icons.auto_awesome,
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final content = InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: selected
                        ? scheme.primary
                        : scheme.surfaceContainerHigh,
                  ),
                  child: Icon(
                    _icon,
                    size: 22,
                    color: selected
                        ? scheme.onPrimary
                        : scheme.onSurfaceVariant,
                  ),
                ),
                const Spacer(),
                if (isToday)
                  Pill(
                    label: '오늘',
                    dense: true,
                    background: scheme.secondaryContainer,
                    foreground: scheme.onSecondaryContainer,
                  ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              set.koreanName,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: selected ? scheme.onPrimaryContainer : null,
              ),
            ),
          ],
        ),
      ),
    );
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
      side: BorderSide(
        color: selected ? scheme.primary : scheme.outlineVariant,
        width: selected ? 2 : 1,
      ),
    );
    return Semantics(
      button: true,
      selected: selected,
      child: selected
          ? Card.filled(
              margin: EdgeInsets.zero,
              color: scheme.primaryContainer,
              shape: shape,
              clipBehavior: Clip.antiAlias,
              child: content,
            )
          : Card.outlined(
              margin: EdgeInsets.zero,
              color: scheme.surface,
              shape: shape,
              clipBehavior: Clip.antiAlias,
              child: content,
            ),
    );
  }
}

/// 선택한 신비의 다섯 단.
class _MysteryList extends StatelessWidget {
  const _MysteryList({required this.set});

  final MysterySet set;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Card.filled(
      margin: EdgeInsets.zero,
      color: scheme.surfaceContainer,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final m in set.mysteries)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 40,
                      child: Text(
                        '${m.index}단',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: scheme.secondary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        _shortMeditation(m.meditation),
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: scheme.onSurface,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
