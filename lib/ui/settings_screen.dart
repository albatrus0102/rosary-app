import 'dart:async';

import 'package:flutter/material.dart';

import '../app/bundled_leader_voice.dart';
import '../app/leader_audio_store.dart';
import '../app/leader_voice.dart';
import '../app/settings.dart';
import '../app/sound_player.dart';
import '../app/theme.dart';
import '../app/track.dart';
import '../domain/leader_cues.dart';
import '../domain/prayer_data.dart';
import 'leader_record_screen.dart';
import 'widgets/page_body.dart';
import 'widgets/section_header.dart';

/// 설정 화면: 소리·진동, 기도 화면(기도문 표시), 선창 음성, 정보. 더보기에서 연다.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({
    super.key,
    required this.settings,
    this.leaderAudio,
    this.ttsVoice,
    this.soundPlayer,
    this.bundledClipCount,
    this.bundledVoiceFactory,
  });

  final AppSettings settings;

  /// 선창 음성 저장소. 없으면 화면이 직접 만든다(테스트에서는 가짜를 주입).
  final LeaderAudioStore? leaderAudio;

  /// '미리 듣기'와 한국어 음성 확인에 쓰는 TTS. 없으면 필요할 때 만든다(테스트용 주입).
  final TtsLeaderVoice? ttsVoice;

  /// 신호음 크기 '들어보기'에 쓰는 재생기. 없으면 필요할 때 만든다(테스트용 주입).
  final SoundPlayer? soundPlayer;

  /// 'AI 음성(고품질)' 클립이 몇 개 들어 있는지 세는 함수(테스트용 주입).
  /// 없으면 [BundledLeaderVoice.availableClipCount]를 쓴다.
  final Future<int> Function(LeaderVoicePersona persona)? bundledClipCount;

  /// 'AI 음성(고품질)' 미리 듣기에 쓰는 음성을 만든다(테스트용 주입).
  /// 없으면 [BundledLeaderVoice]를 만든다. [fallback]은 클립이 없을 때 읽을 기기 음성.
  final LeaderVoice Function(LeaderVoicePersona persona, LeaderVoice fallback)?
  bundledVoiceFactory;

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
  final Map<LeaderVoicePersona, Future<int>> _clipCounts = {};
  LeaderVoice? _bundled;
  LeaderVoicePersona? _bundledPersona;

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
    unawaited(_bundled?.dispose());
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
    final bundled = _bundled;
    if (bundled != null) unawaited(bundled.stop());
  }

  Future<int> _clipCountFor(LeaderVoicePersona persona) =>
      _clipCounts[persona] ??=
          (widget.bundledClipCount ?? BundledLeaderVoice.availableClipCount)(
            persona,
          );

  /// 고른 화자의 음성으로 성모송 앞단을 들려 준다(클립이 없으면 기기 음성).
  Future<void> _previewBundled() async {
    try {
      final persona = settings.leaderPersona;
      var voice = _bundled;
      if (voice == null || _bundledPersona != persona) {
        unawaited(voice?.dispose());
        final tts = _ensureTts();
        voice = _bundled =
            widget.bundledVoiceFactory?.call(persona, tts) ??
            BundledLeaderVoice(persona: persona, fallback: tts);
        _bundledPersona = persona;
      }
      await voice.speakStep(leaderCueStep(prayerCueId(Prayers.hailMary)));
    } catch (e) {
      debugPrint('bundled preview failed: $e');
    }
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
            SliverPageBody(
              maxWidth: _maxContentWidth,
              bottomPadding: AppSpace.lg,
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
          onChanged: (v) {
            settings.chimeOnTenHailMarys = v;
            Track.setting('chime_ten');
          },
        ),
        _SliderTile(
          icon: Icons.volume_up_outlined,
          title: '신호음 크기',
          valueText: '${(settings.chimeVolume * 100).round()}%',
          trailing: IconButton.filledTonal(
            tooltip: '들어보기',
            icon: const Icon(Icons.play_arrow),
            onPressed: () => unawaited(_previewChime()),
          ),
          slider: Slider(
            min: AppSettings.minChimeVolume,
            max: AppSettings.maxChimeVolume,
            divisions: 9,
            label: '${(settings.chimeVolume * 100).round()}%',
            semanticFormatterCallback: (v) => '${(v * 100).round()}%',
            value: settings.chimeVolume,
            onChanged: (v) => settings.chimeVolume = v,
            onChangeEnd: (_) => Track.setting('chime_volume'),
          ),
        ),
        SwitchListTile(
          secondary: const Icon(Icons.radio_button_checked),
          title: const Text('구슬마다 짧은 소리'),
          value: settings.tickPerBead,
          onChanged: (v) {
            settings.tickPerBead = v;
            Track.setting('tick_bead');
          },
        ),
        SwitchListTile(
          secondary: const Icon(Icons.vibration),
          title: const Text('넘길 때 진동'),
          subtitle: const Text('다음 구슬로 넘어갈 때 가볍게 진동합니다'),
          value: settings.hapticOnAdvance,
          onChanged: (v) {
            settings.hapticOnAdvance = v;
            Track.setting('haptic');
          },
        ),
      ],
    );
  }

  // (b) 기도문 표시
  Widget _buildDisplaySection(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final scale = settings.prayerTextScale;
    const baseSize = AppTheme.baseFontSize;
    return _Section(
      title: '기도 화면',
      children: [
        SwitchListTile(
          secondary: const Icon(Icons.volume_down_outlined),
          title: const Text('볼륨 키로 넘기기'),
          subtitle: const Text('기도 화면에서 볼륨 ↓ 다음, ↑ 이전. 화면을 보지 않고 바칠 때 편해요'),
          value: settings.volumeKeyAdvance,
          onChanged: (v) {
            settings.volumeKeyAdvance = v;
            Track.setting('volume_key');
          },
        ),
        SwitchListTile(
          secondary: const Icon(Icons.short_text),
          title: const Text('외운 기도 짧게 보기'),
          subtitle: const Text(
            '성모송 같은 반복 기도를 첫머리만 보여 줍니다. 글자를 크게 쓸 때 한 화면에 담기 좋아요. '
            '성호경·사도신경·신비 안내·영광송은 늘 전문입니다',
          ),
          value: settings.shortPrayers,
          onChanged: (v) {
            settings.shortPrayers = v;
            Track.setting('short_prayers');
          },
        ),
        SwitchListTile(
          secondary: const Icon(Icons.palette_outlined),
          title: const Text('기기 배경화면 색 사용(Material You)'),
          subtitle: const Text('지원하지 않는 기기에서는 앱 기본 색을 씁니다'),
          value: settings.useDynamicColor,
          onChanged: (v) {
            settings.useDynamicColor = v;
            Track.setting('dynamic_color');
          },
        ),
        _SliderTile(
          icon: Icons.format_size,
          title: '글자 크기',
          valueText: '${(scale * 100).round()}%',
          trailing: TextButton(
            onPressed: scale == AppSettings.defaultTextScale
                ? null
                : () {
                    settings.prayerTextScale = AppSettings.defaultTextScale;
                    Track.textScale(AppSettings.defaultTextScale);
                  },
            child: const Text('기본'),
          ),
          slider: Slider(
            min: AppSettings.minTextScale,
            max: AppSettings.maxTextScale,
            divisions: 23,
            label: '${(scale * 100).round()}%',
            semanticFormatterCallback: (v) => '${(v * 100).round()}%',
            value: scale,
            onChanged: (v) => settings.prayerTextScale = v,
            onChangeEnd: Track.textScale,
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Card.filled(
            color: scheme.surfaceContainerLowest,
            child: Padding(
              padding: const EdgeInsets.all(AppSpace.sm),
              child: SizedBox(
                width: double.infinity,
                child: AnimatedDefaultTextStyle(
                  duration: AppMotion.of(context, Durations.short4),
                  curve: Easing.standard,
                  style: AppTheme.prayerStyle(context, size: baseSize * scale),
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
          onChanged: (v) {
            settings.leaderAudioEnabled = v;
            Track.setting('leader_audio');
          },
        ),
        AnimatedSize(
          duration: AppMotion.of(context, Durations.medium1),
          curve: Easing.emphasizedDecelerate,
          alignment: Alignment.topCenter,
          child: !settings.leaderAudioEnabled
              ? const SizedBox(width: double.infinity)
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                      child: SizedBox(
                        width: double.infinity,
                        child: SegmentedButton<LeaderVoiceSource>(
                          segments: [
                            for (final v in LeaderVoiceSource.values)
                              ButtonSegment(
                                value: v,
                                icon: Icon(switch (v) {
                                  LeaderVoiceSource.bundled =>
                                    Icons.auto_awesome,
                                  LeaderVoiceSource.tts =>
                                    Icons.smart_toy_outlined,
                                  LeaderVoiceSource.recorded => Icons.mic,
                                }),
                                label: Text(v.label),
                              ),
                          ],
                          selected: {source},
                          onSelectionChanged: (v) {
                            settings.leaderVoiceSource = v.first;
                            Track.leaderVoice(settings);
                          },
                        ),
                      ),
                    ),
                    if (source == LeaderVoiceSource.bundled)
                      _buildBundledControls(context)
                    else if (source == LeaderVoiceSource.tts)
                      _buildTtsControls(context)
                    else
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        child: Wrap(
                          spacing: AppSpace.sm,
                          runSpacing: AppSpace.xs,
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
                                    settings: const RouteSettings(
                                      name: 'leader_record',
                                    ),
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

  /// 기기에 한국어 음성이 없을 때만 보이는 경고. 알 수 없으면 아무것도 보이지 않는다.
  Widget _koreanWarning(BuildContext context, TtsLeaderVoice tts) {
    final theme = Theme.of(context);
    return FutureBuilder<bool>(
      future: _koreanAvailable ??= tts.koreanAvailable(),
      builder: (context, snap) {
        // 알 수 없으면(아직 확인 중이거나 오류) 경고하지 않는다.
        if (snap.data != false) return const SizedBox.shrink();
        final scheme = theme.colorScheme;
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.xs),
          child: Card.filled(
            color: scheme.errorContainer,
            child: Padding(
              padding: const EdgeInsets.all(AppSpace.sm),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.warning_amber_rounded,
                    color: scheme.onErrorContainer,
                  ),
                  const SizedBox(width: AppSpace.xs),
                  Expanded(
                    child: Text(
                      '기기에 한국어 음성이 설치되어 있지 않습니다. '
                      '설정 > 텍스트 음성 변환에서 한국어 음성을 받아 주세요.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: scheme.onErrorContainer,
                      ),
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

  /// 'AI 음성(고품질)': 화자 선택, 클립 개수, 미리 듣기, 안내 문구.
  Widget _buildBundledControls(BuildContext context) {
    final theme = Theme.of(context);
    final dim = theme.textTheme.bodyMedium?.copyWith(
      color: theme.colorScheme.onSurfaceVariant,
    );
    final persona = settings.leaderPersona;
    final total = allLeaderCues.length;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: FutureBuilder<int>(
        key: ValueKey('bundled_clips_${persona.name}'),
        future: _clipCountFor(persona),
        builder: (context, snap) {
          final count = snap.data;
          final usesFallback = count != null && count < total;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: double.infinity,
                child: SegmentedButton<LeaderVoicePersona>(
                  segments: [
                    for (final p in LeaderVoicePersona.values)
                      ButtonSegment(
                        value: p,
                        icon: Icon(
                          p == LeaderVoicePersona.sister
                              ? Icons.female
                              : Icons.male,
                        ),
                        label: Text(p.voiceLabel),
                      ),
                  ],
                  selected: {persona},
                  onSelectionChanged: (v) {
                    _stopPreview();
                    settings.leaderPersona = v.first;
                    Track.leaderVoice(settings);
                  },
                ),
              ),
              const SizedBox(height: AppSpace.xs),
              Text(aiVoiceDisclosure, style: dim),
              const SizedBox(height: AppSpace.xxs),
              Text(aiVoiceNotice, style: dim),
              const SizedBox(height: AppSpace.sm),
              if (usesFallback) _koreanWarning(context, _ensureTts()),
              if (count != null) ...[
                Text('자연스러운 음성 파일 $count개 / $total개', style: dim),
                if (count == 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text('아직 음성 파일이 없어 기기 음성으로 읽어 드려요', style: dim),
                  )
                else if (usesFallback)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text('$total개 미만이면 부족한 부분은 기기 음성으로 읽어요', style: dim),
                  ),
              ],
              const SizedBox(height: AppSpace.xs),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.tonalIcon(
                  icon: const Icon(Icons.volume_up),
                  label: const Text('미리 듣기'),
                  onPressed: () => unawaited(_previewBundled()),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildTtsControls(BuildContext context) {
    final theme = Theme.of(context);
    final tts = _ensureTts();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _koreanWarning(context, tts),
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
                  onChangeEnd: (_) => Track.setting('tts_rate'),
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

  // (e) 정보
  Widget _buildAboutSection(BuildContext context) {
    return _Section(
      title: '정보',
      children: [
        ListTile(
          leading: const Icon(Icons.menu_book_outlined),
          title: const Text('기도문 출처'),
          subtitle: const Text(SettingsScreen.prayerSourceNote),
        ),
        const ListTile(
          leading: Icon(Icons.record_voice_over_outlined),
          title: Text('합성 음성 안내'),
          subtitle: Text(aiVoiceDisclosure),
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

/// 섹션 머리글 + 채워진 카드(tonal 표면) 안의 타일 묶음.
class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SectionHeader(title),
          Card.filled(
            color: scheme.surfaceContainerLow,
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
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Row(
              children: [
                Icon(icon, color: scheme.onSurfaceVariant),
                const SizedBox(width: AppSpace.sm),
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
