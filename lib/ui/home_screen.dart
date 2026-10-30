import 'dart:async';

import 'package:flutter/material.dart';

import '../app/leader_audio_store.dart';
import '../app/leader_voice.dart';
import '../app/rosary_style.dart';
import '../app/settings.dart';
import '../domain/leader_cues.dart';
import '../domain/prayer_data.dart';
import '../domain/prayer_mode.dart';
import 'leader_record_screen.dart';
import 'prayer_screen.dart';

/// 시작 화면: 신비 선택, 묵주 모양/기도 모드/소리 설정, 시작 버튼.
class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.settings,
    this.leaderAudio,
    this.ttsVoice,
  });

  final AppSettings settings;

  /// 선창 음성 저장소. 없으면 화면이 직접 만든다(테스트에서는 가짜를 주입).
  final LeaderAudioStore? leaderAudio;

  /// '미리 듣기'와 한국어 음성 확인에 쓰는 TTS. 없으면 필요할 때 만든다(테스트용 주입).
  final TtsLeaderVoice? ttsVoice;

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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('묵주기도'), centerTitle: true),
      body: SafeArea(
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
    final today = mysterySetForWeekday(DateTime.now().weekday);
    final sectionStyle = theme.textTheme.titleMedium?.copyWith(
      fontWeight: FontWeight.w600,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 220),
          child: Image.asset(
            settings.rosaryStyle.fullImage,
            fit: BoxFit.contain,
            semanticLabel: '묵주 그림',
          ),
        ),
        const SizedBox(height: 16),
        Text('오늘의 신비', style: sectionStyle),
        const SizedBox(height: 8),
        for (final set in MysterySet.values)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _MysteryCard(
              set: set,
              selected: set == settings.mysterySet,
              isToday: set == today,
              onTap: () => settings.mysterySet = set,
            ),
          ),
        const SizedBox(height: 12),
        Text('묵주 모양', style: sectionStyle),
        const SizedBox(height: 8),
        SizedBox(
          height: 104,
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
        const SizedBox(height: 8),
        _StyleDescription(style: settings.rosaryStyle),
        const SizedBox(height: 20),
        Text('기도 모드', style: sectionStyle),
        const SizedBox(height: 8),
        SegmentedButton<PrayerMode>(
          showSelectedIcon: false,
          segments: [
            for (final m in PrayerMode.values)
              ButtonSegment(
                value: m,
                label: Text(m.label, style: const TextStyle(fontSize: 14)),
              ),
          ],
          selected: {settings.prayerMode},
          onSelectionChanged: (v) => settings.prayerMode = v.first,
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 8, 4, 0),
          child: Text(
            settings.prayerMode.description,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
        if (settings.prayerMode == PrayerMode.responder) ...[
          const SizedBox(height: 12),
          _buildLeaderAudioCard(context),
        ],
        const SizedBox(height: 12),
        Card(
          margin: EdgeInsets.zero,
          child: Column(
            children: [
              SwitchListTile(
                title: const Text('"아멘" 음성 인식으로 자동 넘기기'),
                subtitle: const Text('기기 안에서만 인식하며 서버로 전송하지 않습니다'),
                value: settings.voiceEnabled,
                onChanged: (v) => settings.voiceEnabled = v,
              ),
              SwitchListTile(
                title: const Text('성모송 10번이 끝나면 종소리'),
                value: settings.chimeOnTenHailMarys,
                onChanged: (v) => settings.chimeOnTenHailMarys = v,
              ),
              SwitchListTile(
                title: const Text('구슬마다 짧은 소리'),
                value: settings.tickPerBead,
                onChanged: (v) => settings.tickPerBead = v,
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        FilledButton(
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(64),
            textStyle: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
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
      ],
    );
  }
}

/// "마리아께서 예수님을 잉태하심을 묵상합시다." -> "마리아께서 예수님을 잉태하심"
String _shortMeditation(String meditation) =>
    meditation.replaceFirst(RegExp(r'[을를]? 묵상합시다\.$'), '');

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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      color: selected ? scheme.primaryContainer : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: selected ? scheme.primary : scheme.outlineVariant,
          width: selected ? 2 : 1,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2, right: 12),
                child: Icon(
                  selected
                      ? Icons.radio_button_checked
                      : Icons.radio_button_off,
                  color: selected ? scheme.primary : scheme.outline,
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          set.koreanName,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (isToday) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: scheme.secondaryContainer,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '오늘',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: scheme.onSecondaryContainer,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 6),
                    for (final m in set.mysteries)
                      Text(
                        '${m.index}단  ${_shortMeditation(m.meditation)}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                          height: 1.5,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
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
      child: Card(
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        color: selected ? scheme.primaryContainer : null,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: selected ? 2 : 1,
          ),
        ),
        child: InkWell(
          onTap: onTap,
          child: SizedBox(
            width: _HomeScreenState._cardWidth,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
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
                    ),
                  ),
                ],
              ),
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
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            style.label,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            style.description,
            key: const ValueKey('style_description'),
            style: theme.textTheme.bodyMedium?.copyWith(height: 1.5),
          ),
        ],
      ),
    );
  }
}
