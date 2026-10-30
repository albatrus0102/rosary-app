import 'dart:async';

import 'package:flutter/material.dart';

import '../app/leader_audio_store.dart';
import '../app/leader_voice.dart';
import '../app/rosary_style.dart';
import '../app/settings.dart';
import '../app/sound_player.dart';
import '../domain/leader_cues.dart';
import '../domain/prayer_data.dart';
import '../app/theme.dart';
import '../domain/prayer_mode.dart';
import 'leader_record_screen.dart';
import 'mic_test_screen.dart';
import 'prayer_screen.dart';
import 'widgets/pill.dart';
import 'widgets/section_header.dart';
import 'widgets/soft_card.dart';

/// 시작 화면: 신비 선택, 묵주 모양/기도 모드/소리 설정, 시작 버튼.
class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.settings,
    this.leaderAudio,
    this.ttsVoice,
    this.soundPlayer,
  });

  final AppSettings settings;

  /// 선창 음성 저장소. 없으면 화면이 직접 만든다(테스트에서는 가짜를 주입).
  final LeaderAudioStore? leaderAudio;

  /// '미리 듣기'와 한국어 음성 확인에 쓰는 TTS. 없으면 필요할 때 만든다(테스트용 주입).
  final TtsLeaderVoice? ttsVoice;

  /// 신호음 크기 '들어보기'에 쓰는 재생기. 없으면 필요할 때 만든다(테스트용 주입).
  final SoundPlayer? soundPlayer;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const double _cardWidth = 92;
  static const double _cardGap = 8;

  final ScrollController _styleScroll = ScrollController();

  late final LeaderAudioStore _leaderStore;
  late final bool _ownsLeaderStore;
  TtsLeaderVoice? _tts;
  bool _ownsTts = false;
  SoundPlayer? _previewSound;
  Future<bool>? _koreanAvailable;

  AppSettings get settings => widget.settings;

  @override
  void initState() {
    super.initState();
    _ownsLeaderStore = widget.leaderAudio == null;
    _leaderStore = widget.leaderAudio ?? LeaderAudioStore();
    unawaited(_initLeaderStore());
    // 선택된 묵주 모양 카드가 보이도록 첫 프레임 뒤에 가로 스크롤을 옮긴다.
    WidgetsBinding.instance.addPostFrameCallback((_) => _revealSelectedStyle());
  }

  Future<void> _initLeaderStore() async {
    try {
      await _leaderStore.init();
    } catch (e) {
      debugPrint('LeaderAudioStore.init failed: $e');
    }
  }

  void _revealSelectedStyle() {
    if (!mounted || !_styleScroll.hasClients) return;
    final position = _styleScroll.position;
    final index = RosaryStyle.values.indexOf(settings.rosaryStyle);
    final center = index * (_cardWidth + _cardGap) + _cardWidth / 2;
    final target = (center - position.viewportDimension / 2).clamp(
      position.minScrollExtent,
      position.maxScrollExtent,
    );
    _styleScroll.jumpTo(target);
  }

  @override
  void dispose() {
    _styleScroll.dispose();
    if (_ownsLeaderStore) _leaderStore.dispose();
    if (_ownsTts) unawaited(_tts?.dispose());
    if (widget.soundPlayer == null) unawaited(_previewSound?.dispose());
    super.dispose();
  }

  /// 선택한 크기로 종소리를 한 번 들려 준다.
  Future<void> _previewChime() async {
    final sound = _previewSound ??= widget.soundPlayer ?? SoundPlayer();
    await sound.init();
    sound.volume = settings.chimeVolume;
    await sound.playDecadeChime();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('묵주기도'), centerTitle: true),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListenableBuilder(
                listenable: settings,
                builder: (context, _) => SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 560),
                      child: _buildContent(context),
                    ),
                  ),
                ),
              ),
            ),
            _buildStartBar(context),
          ],
        ),
      ),
    );
  }

  /// 아래에 고정된 '기도 시작' 버튼.
  Widget _buildStartBar(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        border: Border(top: BorderSide(color: scheme.outlineVariant)),
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: FilledButton(
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(56),
                textStyle: Theme.of(context).textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w600),
              ),
              onPressed: () {
                _stopPreview();
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => PrayerScreen(
                      settings: settings,
                      mysterySet: settings.mysterySet,
                      leaderAudio: _leaderStore,
                    ),
                  ),
                );
              },
              child: const Text('기도 시작'),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLeaderAudioCard(BuildContext context) {
    final theme = Theme.of(context);
    final source = settings.leaderVoiceSource;
    final dim = theme.textTheme.bodyMedium?.copyWith(
      color: theme.colorScheme.onSurfaceVariant,
    );
    return Card(
      margin: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SwitchListTile(
            title: const Text('선창 음성'),
            subtitle: const Text('뒷단 차례에 앞단을 들려줍니다'),
            value: settings.leaderAudioEnabled,
            onChanged: (v) => settings.leaderAudioEnabled = v,
          ),
          if (settings.leaderAudioEnabled) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: SegmentedButton<LeaderVoiceSource>(
                showSelectedIcon: false,
                segments: [
                  for (final v in LeaderVoiceSource.values)
                    ButtonSegment(value: v, label: Text(v.label)),
                ],
                selected: {source},
                onSelectionChanged: (v) => settings.leaderVoiceSource = v.first,
              ),
            ),
            if (source == LeaderVoiceSource.tts)
              _buildTtsControls(context, dim)
            else
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: ListenableBuilder(
                        listenable: _leaderStore,
                        builder: (context, _) => Text(
                          '${allLeaderCues.length}개 중 '
                          '${_leaderStore.recordedCount}개 녹음됨',
                          style: dim,
                        ),
                      ),
                    ),
                    OutlinedButton.icon(
                      icon: const Icon(Icons.mic),
                      label: const Text('선창 녹음 관리'),
                      onPressed: () {
                        _stopPreview();
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) =>
                                LeaderRecordScreen(store: _leaderStore),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }

  /// '미리 듣기'가 다음 화면의 기도/녹음과 겹치지 않도록 끊는다.
  void _stopPreview() {
    final tts = _tts;
    if (tts != null) unawaited(tts.stop());
  }

  TtsLeaderVoice _ensureTts() {
    final existing = _tts;
    if (existing != null) return existing;
    final injected = widget.ttsVoice;
    if (injected != null) return _tts = injected;
    _ownsTts = true;
    return _tts = TtsLeaderVoice(rate: () => settings.ttsRate);
  }

  Widget _buildTtsControls(BuildContext context, TextStyle? dim) {
    final theme = Theme.of(context);
    final tts = _ensureTts();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FutureBuilder<bool>(
            future: _koreanAvailable ??= tts.koreanAvailable(),
            builder: (context, snap) {
              // 알 수 없으면(아직 확인 중이거나 오류) 경고하지 않는다.
              if (snap.data != false) return const SizedBox.shrink();
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  '기기에 한국어 음성이 설치되어 있지 않습니다. '
                  '설정 > 텍스트 음성 변환에서 한국어 음성을 받아 주세요.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.error,
                    height: 1.4,
                  ),
                ),
              );
            },
          ),
          Row(
            children: [
              Text('말하기 속도', style: dim),
              Expanded(
                child: Slider(
                  min: AppSettings.minTtsRate,
                  max: AppSettings.maxTtsRate,
                  divisions: 8,
                  label: settings.ttsRate.toStringAsFixed(2),
                  value: settings.ttsRate,
                  onChanged: (v) => settings.ttsRate = v,
                ),
              ),
            ],
          ),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.tonalIcon(
              icon: const Icon(Icons.volume_up),
              label: const Text('미리 듣기'),
              onPressed: () => unawaited(tts.preview()),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final today = mysterySetForWeekday(DateTime.now().weekday);
    final sets = MysterySet.values;

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
        _HeroCard(style: settings.rosaryStyle),
        const SizedBox(height: 28),
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
        const SectionHeader('묵주 모양'),
        SizedBox(
          height: 112,
          child: ListView.separated(
            controller: _styleScroll,
            scrollDirection: Axis.horizontal,
            itemCount: RosaryStyle.values.length,
            separatorBuilder: (_, _) => const SizedBox(width: _cardGap),
            itemBuilder: (context, i) {
              final style = RosaryStyle.values[i];
              return _StyleCard(
                style: style,
                selected: style == settings.rosaryStyle,
                onTap: () => settings.rosaryStyle = style,
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        _StyleDescription(style: settings.rosaryStyle),
        const SizedBox(height: 28),
        const SectionHeader('기도 모드'),
        SegmentedButton<PrayerMode>(
          showSelectedIcon: false,
          segments: [
            for (final m in PrayerMode.values)
              ButtonSegment(value: m, label: Text(m.label)),
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
        if (settings.prayerMode == PrayerMode.responder) ...[
          const SizedBox(height: 12),
          _buildLeaderAudioCard(context),
        ],
        const SizedBox(height: 28),
        const SectionHeader('기도문 글꼴'),
        SegmentedButton<PrayerFont>(
          showSelectedIcon: false,
          segments: const [
            ButtonSegment(
              value: PrayerFont.sans,
              label: Text(
                '고딕',
                style: TextStyle(fontFamily: AppTheme.sansFamily),
              ),
            ),
            ButtonSegment(
              value: PrayerFont.serif,
              label: Text(
                '명조',
                style: TextStyle(fontFamily: AppTheme.serifFamily),
              ),
            ),
          ],
          selected: {settings.prayerFont},
          onSelectionChanged: (v) => settings.prayerFont = v.first,
        ),
        const SizedBox(height: 28),
        const SectionHeader('소리 · 인식'),
        Card(
          margin: EdgeInsets.zero,
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: ListTile.divideTiles(
              context: context,
              tiles: [
                SwitchListTile(
                  title: const Text('"아멘" 음성 인식으로 자동 넘기기'),
                  subtitle: const Text('기기 안에서만 인식하며 서버로 전송하지 않습니다'),
                  value: settings.voiceEnabled,
                  onChanged: (v) => settings.voiceEnabled = v,
                ),
                SwitchListTile(
                  title: const Text('인식 내용 보기'),
                  subtitle: const Text('기도 화면 아래에 인식된 글자와 마이크 상태를 보여줍니다'),
                  value: settings.showTranscript,
                  onChanged: (v) => settings.showTranscript = v,
                ),
                SwitchListTile(
                  title: const Text('인식 민감도 높임'),
                  subtitle: const Text(
                    '"아"로만 끝나도 아멘으로 셉니다. 잘못 넘어갈 수 있으니 필요할 때만 켜세요.',
                  ),
                  value: settings.highSensitivity,
                  onChanged: (v) => settings.highSensitivity = v,
                ),
                ListTile(
                  leading: const Icon(Icons.mic_none),
                  title: const Text('마이크 테스트'),
                  subtitle: const Text('"아멘"이 어떻게 들리는지 확인합니다'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => MicTestScreen(settings: settings),
                    ),
                  ),
                ),
                SwitchListTile(
                  title: const Text('성모송 10번이 끝나면 종소리'),
                  value: settings.chimeOnTenHailMarys,
                  onChanged: (v) => settings.chimeOnTenHailMarys = v,
                ),
                ListTile(
                  title: const Text('신호음 크기'),
                  subtitle: Slider(
                    min: AppSettings.minChimeVolume,
                    max: AppSettings.maxChimeVolume,
                    divisions: 9,
                    label: '${(settings.chimeVolume * 100).round()}%',
                    value: settings.chimeVolume,
                    onChanged: (v) => settings.chimeVolume = v,
                  ),
                  trailing: IconButton(
                    tooltip: '들어보기',
                    icon: const Icon(Icons.volume_up_outlined),
                    onPressed: () => unawaited(_previewChime()),
                  ),
                ),
                SwitchListTile(
                  title: const Text('구슬마다 짧은 소리'),
                  value: settings.tickPerBead,
                  onChanged: (v) => settings.tickPerBead = v,
                ),
              ],
            ).toList(),
          ),
        ),
        const SizedBox(height: 8),
      ],
    );
  }
}

/// "마리아께서 예수님을 잉태하심을 묵상합시다." -> "마리아께서 예수님을 잉태하심"
String _shortMeditation(String meditation) =>
    meditation.replaceFirst(RegExp(r'[을를]? 묵상합시다\.$'), '');

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.style});

  final RosaryStyle style;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: scheme.surfaceContainer,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Center(
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: scheme.tertiary.withValues(alpha: 0.5),
                width: 1.5,
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(5),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(19),
                child: ColoredBox(
                  color: const Color(0xFFF6EFE5),
                  child: Image.asset(
                    style.fullImage,
                    width: 232,
                    height: 232,
                    fit: BoxFit.contain,
                    semanticLabel: '묵주 그림',
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
    return Semantics(
      button: true,
      selected: selected,
      child: SoftCard(
        onTap: onTap,
        color: selected ? scheme.primaryContainer : scheme.surface,
        borderColor: selected ? scheme.primary : scheme.outlineVariant,
        borderWidth: selected ? 2 : 1,
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
    return SoftCard(
      color: scheme.surfaceContainer,
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
                    width: 32,
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
    );
  }
}

class _StyleCard extends StatelessWidget {
  const _StyleCard({
    required this.style,
    required this.selected,
    required this.onTap,
  });

  final RosaryStyle style;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Semantics(
      button: true,
      selected: selected,
      child: SoftCard(
        onTap: onTap,
        radius: 18,
        color: selected ? scheme.primaryContainer : scheme.surface,
        borderColor: selected ? scheme.primary : scheme.outlineVariant,
        borderWidth: selected ? 2 : 1,
        padding: EdgeInsets.zero,
        child: SizedBox(
          width: _HomeScreenState._cardWidth,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 56,
                  height: 56,
                  child: Image.asset(style.unitImage, fit: BoxFit.contain),
                ),
                const SizedBox(height: 6),
                Text(
                  style.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: selected ? FontWeight.w700 : null,
                    color: selected ? scheme.onPrimaryContainer : null,
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

class _StyleDescription extends StatelessWidget {
  const _StyleDescription({required this.style});

  final RosaryStyle style;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SoftCard(
      color: theme.colorScheme.surfaceContainer,
      padding: const EdgeInsets.all(16),
      child: SizedBox(
        width: double.infinity,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              style.label,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              style.description,
              key: const ValueKey('style_description'),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
