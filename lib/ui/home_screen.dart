import 'dart:async';

import 'package:flutter/material.dart';

import '../app/app_services.dart';
import '../app/leader_audio_store.dart';
import '../app/rosary_style.dart';
import '../app/settings.dart';
import '../app/sound_player.dart';
import '../app/theme.dart';
import '../app/track.dart';
import '../app/window_class.dart';
import '../domain/prayer_data.dart';
import '../domain/prayer_mode.dart';
import '../domain/rosary_sequence.dart';
import '../stats/stats_screen.dart';
import '../stats/stats_widgets.dart';
import 'prayer_screen.dart';
import 'widgets/page_body.dart';
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
    this.onOpenStats,
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

  /// 기록 요약 카드·완료 화면의 '기록 보기'를 눌렀을 때(셸이 '기록' 탭으로 이동시킨다).
  /// 없으면 기록 화면을 새 라우트로 연다.
  final VoidCallback? onOpenStats;

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
        settings: const RouteSettings(name: 'prayer'),
        builder: (_) => PrayerScreen(
          settings: settings,
          mysterySet: target,
          initialIndex: initialIndex,
          leaderAudio: widget.leaderAudio,
          soundPlayer: widget.soundPlayer,
          onOpenStats: widget.onOpenStats,
        ),
      ),
    );
    // 기도 중 저장된 진행 상태(알림 없이 갱신됨)를 다시 읽는다.
    if (mounted) setState(() {});
  }

  /// 기도 기록(통계) 화면을 연다. `stats_open`은 화면이 열릴 때 스스로 기록한다.
  Future<void> _openStats(AppServices services) => Navigator.of(context).push(
    MaterialPageRoute<void>(
      settings: const RouteSettings(name: 'stats'),
      builder: (_) => StatsScreen(store: services.stats),
    ),
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      bottomNavigationBar: ListenableBuilder(
        listenable: settings,
        builder: (context, _) => _buildStartBar(context),
      ),
      body: ListenableBuilder(
        listenable: settings,
        builder: (context, _) => CustomScrollView(
          slivers: [
            const SliverAppBar.large(title: Text('묵주기도')),
            SliverPageBody(maxWidth: _maxWidth, child: _buildContent(context)),
          ],
        ),
      ),
    );
  }

  /// 아래에 고정된 '기도 시작' 버튼: M3 [BottomAppBar](톤 표면, 하단 inset 자동 처리).
  Widget _buildStartBar(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final margin = windowClassOf(context).margin;
    final today = mysterySetForWeekday(DateTime.now().weekday);
    final set = settings.mysterySet;
    // P-01: 무엇을 바칠지 버튼에 적는다. 오늘의 신비면 그렇게 밝히고, 바꿨으면 이름만.
    final label = set == today
        ? '오늘의 신비 · ${set.koreanName} 시작'
        : '${set.koreanName} 시작';
    // 큰 글씨에서는 두 줄이 되므로 막대 높이도 글자 배율을 따른다.
    final scaler = MediaQuery.textScalerOf(context);
    final twoLines = scaler.scale(18) * 1.4 * 2 + 2 * AppSpace.sm;
    final buttonH = scaler.scale(18) > 24
        ? twoLines
        : AppTheme.largeButtonHeight;
    return BottomAppBar(
      color: scheme.surfaceContainerLow,
      elevation: 0,
      height: buttonH + 2 * AppSpace.sm,
      padding: EdgeInsets.symmetric(horizontal: margin, vertical: AppSpace.sm),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: _maxWidth),
          child: FilledButton.icon(
            style: FilledButton.styleFrom(
              minimumSize: Size.fromHeight(buttonH),
            ),
            icon: const Icon(Icons.play_arrow),
            label: Text(label, textAlign: TextAlign.center, maxLines: 2),
            onPressed: () => unawaited(_startPrayer()),
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
      color: scheme.secondaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(Icons.history, color: scheme.onSecondaryContainer),
                const SizedBox(width: AppSpace.xs),
                Expanded(
                  child: Text(
                    '이어서 기도하기',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: scheme.onSecondaryContainer,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.xs),
            Text(
              parts.join(' · '),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.onSecondaryContainer,
              ),
            ),
            const SizedBox(height: AppSpace.sm),
            Wrap(
              alignment: WrapAlignment.end,
              spacing: AppSpace.xs,
              runSpacing: AppSpace.xxs,
              children: [
                TextButton(
                  style: TextButton.styleFrom(
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
          const SizedBox(height: AppSpace.md),
        ],
        _HeroCard(style: settings.rosaryStyle, onTap: widget.onOpenStyles),
        const SizedBox(height: AppSpace.md),
        if (AppServicesScope.maybeOf(context) case final services?) ...[
          StatsSummaryCard(
            store: services.stats,
            onTap: widget.onOpenStats ?? () => unawaited(_openStats(services)),
          ),
          const SizedBox(height: AppSpace.md),
        ],
        SectionHeader(
          '오늘의 신비',
          trailing: settings.mysterySet == today
              ? null
              : ActionChip(
                  key: const ValueKey('reset-to-today'),
                  avatar: const Icon(Icons.today, size: 18),
                  label: const Text('오늘로'),
                  onPressed: () => settings.mysterySet = today,
                ),
        ),
        for (var i = 0; i < sets.length; i += 2) ...[
          if (i > 0) const SizedBox(height: AppSpace.sm),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                mysteryCard(sets[i]),
                const SizedBox(width: AppSpace.sm),
                if (i + 1 < sets.length)
                  mysteryCard(sets[i + 1])
                else
                  const Spacer(),
              ],
            ),
          ),
        ],
        const SizedBox(height: AppSpace.sm),
        _MysteryList(set: settings.mysterySet),
        const SizedBox(height: AppSpace.md),
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
          onSelectionChanged: (v) {
            settings.prayerMode = v.first;
            Track.mode(v.first);
          },
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: Text(
            settings.prayerMode.descriptionWithVoice(
              voiceOn: settings.leaderAudioEnabled,
            ),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
        ),
        AnimatedSize(
          duration: AppMotion.of(context, Durations.medium1),
          curve: Easing.emphasizedDecelerate,
          alignment: Alignment.topCenter,
          child: settings.prayerMode != PrayerMode.solo
              ? Padding(
                  padding: const EdgeInsets.only(top: AppSpace.sm),
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
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.info_outline, color: scheme.onSurfaceVariant),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: AppSpace.xxs),
                    child: Text(
                      '상대 목소리는 설정 > 상대 목소리에서 바꿀 수 있어요',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                ),
              ],
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
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
/// M3 채운(tonal) 카드 + [InkWell] 상태 레이어. 카드 전체가 하나의 버튼 의미를 갖는다.
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
        color: scheme.surfaceContainerHigh,
        shape: AppShape.largeBorder,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(AppSpace.sm),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: AppShape.medium,
                  child: Image(
                    // 160dp 칸에 필요한 만큼만 디코드한다(원본은 655~1024px, 키우지는 않는다).
                    image: ResizeImage(
                      AssetImage(style.fullImage),
                      width: (160 * MediaQuery.devicePixelRatioOf(context))
                          .ceil(),
                      height: (160 * MediaQuery.devicePixelRatioOf(context))
                          .ceil(),
                      policy: ResizeImagePolicy.fit,
                      allowUpscaling: false,
                    ),
                    height: 160,
                    width: 160,
                    fit: BoxFit.contain,
                    semanticLabel: '묵주 그림',
                  ),
                ),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(style.label, style: theme.textTheme.titleMedium),
                      if (onTap != null) ...[
                        const SizedBox(height: AppSpace.xxs),
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
                            Icon(Icons.chevron_right, color: scheme.primary),
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

/// 신비 선택 카드. 선택됨: primaryContainer 채움 + 채워진 아이콘 원, 선택 안 됨: 윤곽선.
/// 상태는 색뿐 아니라 아이콘 원의 채움과 접근성 selected 의미로도 전달한다.
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
        padding: const EdgeInsets.all(AppSpace.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: selected
                      ? scheme.primary
                      : scheme.surfaceContainerHighest,
                  foregroundColor: selected
                      ? scheme.onPrimary
                      : scheme.onSurfaceVariant,
                  child: Icon(_icon),
                ),
                const Spacer(),
                if (isToday) const Pill(label: '오늘', dense: true),
              ],
            ),
            const SizedBox(height: AppSpace.sm),
            Text(
              set.koreanName,
              style: theme.textTheme.titleMedium?.copyWith(
                color: selected ? scheme.onPrimaryContainer : null,
              ),
            ),
          ],
        ),
      ),
    );
    return Semantics(
      button: true,
      selected: selected,
      child: selected
          ? Card.filled(color: scheme.primaryContainer, child: content)
          : Card.outlined(child: content),
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
    // 글자 크기 배율에 맞춰 '1단' 머리표 폭도 함께 키운다.
    final labelWidth = MediaQuery.textScalerOf(context).scale(40);
    return Card.filled(
      color: scheme.surfaceContainerHigh,
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final m in set.mysteries)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpace.xxs),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: labelWidth,
                      child: Text(
                        '${m.index}단',
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        _shortMeditation(m.meditation),
                        style: theme.textTheme.bodyMedium,
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
