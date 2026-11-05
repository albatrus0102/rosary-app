import 'dart:async';

import 'package:flutter/material.dart';

import '../app/leader_audio_store.dart';
import '../app/leader_voice.dart';
import '../app/settings.dart';
import '../app/sound_player.dart';
import '../app/theme.dart';
import '../domain/leader_cues.dart';
import 'leader_record_screen.dart';

/// 설정 화면: 소리·진동, 기도문 표시, 선창 음성, 정보.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({
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

  /// 미리보기에 쓰는 문장.
  static const previewSentence = '은총이 가득하신 마리아님, 기뻐하소서!';

  static const prayerSourceNote = '한국천주교주교회의 『가톨릭 기도서』 기준';

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  static const double _maxContentWidth = 720;

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
  }

  Future<void> _initLeaderStore() async {
    try {
      await _leaderStore.init();
    } catch (e) {
      debugPrint('LeaderAudioStore.init failed: $e');
    }
  }

  @override
  void dispose() {
    if (_ownsLeaderStore) _leaderStore.dispose();
    if (_ownsTts) unawaited(_tts?.dispose());
    if (widget.soundPlayer == null) unawaited(_previewSound?.dispose());
    super.dispose();
  }

  /// 선택한 크기로 종소리를 한 번 들려 준다.
  Future<void> _previewChime() async {
    try {
      final sound = _previewSound ??= widget.soundPlayer ?? SoundPlayer();
      await sound.init();
      sound.volume = settings.chimeVolume;
      await sound.playDecadeChime();
    } catch (e) {
      debugPrint('chime preview failed: $e');
    }
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListenableBuilder(
        listenable: settings,
        builder: (context, _) => CustomScrollView(
          slivers: [
            const SliverAppBar.large(title: Text('설정')),
            SliverToBoxAdapter(
              child: SafeArea(
                top: false,
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(
                      maxWidth: _maxContentWidth,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _buildSoundSection(context),
                          _buildDisplaySection(context),
                          _buildLeaderSection(context),
                          _buildAboutSection(context),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // (a) 소리·진동
  Widget _buildSoundSection(BuildContext context) {
    return _Section(
      title: '소리 · 진동',
      children: [
        SwitchListTile(
          secondary: const Icon(Icons.notifications_none),
          title: const Text('성모송 10번이 끝나면 종소리'),
          value: settings.chimeOnTenHailMarys,
          onChanged: (v) => settings.chimeOnTenHailMarys = v,
        ),
        _SliderTile(
          icon: Icons.volume_up_outlined,
          title: '신호음 크기',
          valueText: '${(settings.chimeVolume * 100).round()}%',
          trailing: IconButton(
            tooltip: '들어보기',
            icon: const Icon(Icons.play_circle_outline),
            onPressed: () => unawaited(_previewChime()),
          ),
          slider: Slider(
            min: AppSettings.minChimeVolume,
            max: AppSettings.maxChimeVolume,
            divisions: 9,
            label: '${(settings.chimeVolume * 100).round()}%',
            value: settings.chimeVolume,
            onChanged: (v) => settings.chimeVolume = v,
          ),
        ),
        SwitchListTile(
          secondary: const Icon(Icons.radio_button_checked),
          title: const Text('구슬마다 짧은 소리'),
          value: settings.tickPerBead,
          onChanged: (v) => settings.tickPerBead = v,
        ),
        SwitchListTile(
          secondary: const Icon(Icons.vibration),
          title: const Text('넘길 때 진동'),
          subtitle: const Text('다음 구슬로 넘어갈 때 가볍게 진동합니다'),
          value: settings.hapticOnAdvance,
          onChanged: (v) => settings.hapticOnAdvance = v,
        ),
      ],
    );
  }

  // (b) 기도문 표시
  Widget _buildDisplaySection(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final scale = settings.prayerTextScale;
    final serif = settings.prayerFont == PrayerFont.serif;
    final baseSize = serif ? 25.0 : 24.0;
    return _Section(
      title: '기도문 표시',
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('글꼴', style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: SegmentedButton<PrayerFont>(
                  segments: const [
                    ButtonSegment(
                      value: PrayerFont.sans,
                      icon: Icon(Icons.text_fields),
                      label: Text(
                        '고딕',
                        style: TextStyle(fontFamily: AppTheme.sansFamily),
                      ),
                    ),
                    ButtonSegment(
                      value: PrayerFont.serif,
                      icon: Icon(Icons.menu_book_outlined),
                      label: Text(
                        '명조',
                        style: TextStyle(fontFamily: AppTheme.serifFamily),
                      ),
                    ),
                  ],
                  selected: {settings.prayerFont},
                  onSelectionChanged: (v) => settings.prayerFont = v.first,
                ),
              ),
            ],
          ),
        ),
        _SliderTile(
          icon: Icons.format_size,
          title: '글자 크기',
          valueText: '${(scale * 100).round()}%',
          trailing: TextButton(
            onPressed: scale == AppSettings.defaultTextScale
                ? null
                : () => settings.prayerTextScale = AppSettings.defaultTextScale,
            child: const Text('기본'),
          ),
          slider: Slider(
            min: AppSettings.minTextScale,
            max: AppSettings.maxTextScale,
            divisions: 15,
            label: '${(scale * 100).round()}%',
            value: scale,
            onChanged: (v) => settings.prayerTextScale = v,
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: scheme.surfaceContainerLowest,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: SizedBox(
                width: double.infinity,
                child: AnimatedDefaultTextStyle(
                  duration: const Duration(milliseconds: 200),
                  curve: Curves.easeOutCubic,
                  style: AppTheme.prayerStyle(
                    context,
                    settings.prayerFont,
                    size: baseSize * scale,
                  ),
                  child: const Text(
                    SettingsScreen.previewSentence,
                    key: ValueKey('text_scale_preview'),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // (c) 선창 음성
  Widget _buildLeaderSection(BuildContext context) {
    final theme = Theme.of(context);
    final source = settings.leaderVoiceSource;
    final dim = theme.textTheme.bodyMedium?.copyWith(
      color: theme.colorScheme.onSurfaceVariant,
    );
    return _Section(
      title: '선창 음성',
      children: [
        SwitchListTile(
          secondary: const Icon(Icons.record_voice_over_outlined),
          title: const Text('선창 음성'),
          subtitle: const Text('후창 모드에서 뒷단 차례에 앞단을 들려줍니다'),
          value: settings.leaderAudioEnabled,
          onChanged: (v) => settings.leaderAudioEnabled = v,
        ),
        AnimatedSize(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOutCubic,
          alignment: Alignment.topCenter,
          child: !settings.leaderAudioEnabled
              ? const SizedBox(width: double.infinity)
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                      child: SizedBox(
                        width: double.infinity,
                        child: SegmentedButton<LeaderVoiceSource>(
                          segments: [
                            for (final v in LeaderVoiceSource.values)
                              ButtonSegment(
                                value: v,
                                icon: Icon(
                                  v == LeaderVoiceSource.tts
                                      ? Icons.smart_toy_outlined
                                      : Icons.mic,
                                ),
                                label: Text(v.label),
                              ),
                          ],
                          selected: {source},
                          onSelectionChanged: (v) =>
                              settings.leaderVoiceSource = v.first,
                        ),
                      ),
                    ),
                    if (source == LeaderVoiceSource.tts)
                      _buildTtsControls(context)
                    else
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                        child: Wrap(
                          spacing: 12,
                          runSpacing: 8,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            ListenableBuilder(
                              listenable: _leaderStore,
                              builder: (context, _) => Text(
                                '${allLeaderCues.length}개 중 '
                                '${_leaderStore.recordedCount}개 녹음됨',
                                style: dim,
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
                ),
        ),
      ],
    );
  }

  Widget _buildTtsControls(BuildContext context) {
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
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.warning_amber_rounded,
                      color: theme.colorScheme.error,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '기기에 한국어 음성이 설치되어 있지 않습니다. '
                        '설정 > 텍스트 음성 변환에서 한국어 음성을 받아 주세요.',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.error,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          Row(
            children: [
              Text('말하기 속도', style: theme.textTheme.bodyLarge),
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

  // (d) 정보
  Widget _buildAboutSection(BuildContext context) {
    return _Section(
      title: '정보',
      children: [
        ListTile(
          leading: const Icon(Icons.menu_book_outlined),
          title: const Text('기도문 출처'),
          subtitle: const Text(SettingsScreen.prayerSourceNote),
        ),
        ListTile(
          leading: const Icon(Icons.description_outlined),
          title: const Text('오픈소스 라이선스'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => showLicensePage(
            context: context,
            applicationName: '묵주기도',
            applicationLegalese: SettingsScreen.prayerSourceNote,
          ),
        ),
      ],
    );
  }
}

/// 섹션 머리글 + 채워진 카드 안의 타일 묶음.
class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Text(
                title,
                style: theme.textTheme.titleSmall?.copyWith(
                  color: theme.colorScheme.primary,
                ),
              ),
            ),
          ),
          Card.filled(
            margin: EdgeInsets.zero,
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: children,
            ),
          ),
        ],
      ),
    );
  }
}

/// 제목 + 값 + (오른쪽 버튼) 줄 아래에 슬라이더가 오는 타일.
class _SliderTile extends StatelessWidget {
  const _SliderTile({
    required this.icon,
    required this.title,
    required this.valueText,
    required this.slider,
    this.trailing,
  });

  final IconData icon;
  final String title;
  final String valueText;
  final Slider slider;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 8, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Row(
              children: [
                Icon(icon, color: scheme.onSurfaceVariant),
                const SizedBox(width: 16),
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      text: title,
                      style: theme.textTheme.bodyLarge,
                      children: [
                        TextSpan(
                          text: '  $valueText',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                ?trailing,
              ],
            ),
          ),
          slider,
        ],
      ),
    );
  }
}
