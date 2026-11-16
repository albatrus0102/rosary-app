import 'package:flutter/material.dart';

import '../app/prayer_music.dart';
import '../app/settings.dart';
import '../app/track.dart';
import '../domain/prayer_music_tracks.dart';

/// 성삼일 침묵 중 성가를 켜려 할 때 보이는 안내.
const kMusicTriduumNote = '성삼일(성목요일 저녁~부활 성야 전)에는 성가를 울리지 않아요';

/// 성가를 켜고 끈다(기도 화면 ⋮ 메뉴·성당 묵주 패널). 성삼일 침묵 중에 켜면 안내를 띄운다.
void togglePrayerMusic(BuildContext context, AppSettings settings) {
  settings.prayerMusic = !settings.prayerMusic;
  Track.setting('prayer_music');
  if (settings.prayerMusic && PrayerMusic.of(settings).silent) {
    ScaffoldMessenger.maybeOf(context)
      ?..hideCurrentSnackBar()
      ..showSnackBar(const SnackBar(content: Text(kMusicTriduumNote)));
  }
}

/// '성가 · 배경 음악' 시트: 켜기, 곡 고르기(섞어 듣기), 음량, 성당 안에서도 듣기.
/// 시트가 열려 있는 동안 음악을 붙잡아, 바꾼 것을 바로 들어 볼 수 있다.
Future<void> showPrayerMusicSheet(BuildContext context, AppSettings settings) {
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    routeSettings: const RouteSettings(name: 'prayer_music'),
    builder: (_) => PrayerMusicSheet(settings: settings),
  );
}

class PrayerMusicSheet extends StatefulWidget {
  const PrayerMusicSheet({super.key, required this.settings});

  final AppSettings settings;

  @override
  State<PrayerMusicSheet> createState() => _PrayerMusicSheetState();
}

class _PrayerMusicSheetState extends State<PrayerMusicSheet> {
  late final PrayerMusic _music = PrayerMusic.of(widget.settings);
  late final MusicHold _hold;

  @override
  void initState() {
    super.initState();
    _hold = _music.hold('sheet');
  }

  @override
  void dispose() {
    _hold.release();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.settings;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return ListenableBuilder(
      listenable: Listenable.merge([s, _music]),
      builder: (context, _) {
        final on = s.prayerMusic;
        final percent = '${(s.prayerMusicVolume * 100).round()}%';
        Widget choice(String id, String title, String subtitle) {
          final selected = s.prayerMusicTrack == id;
          return ListTile(
            key: ValueKey('music-track-$id'),
            enabled: on,
            selected: selected,
            leading: Icon(
              selected
                  ? Icons.radio_button_checked
                  : Icons.radio_button_unchecked,
            ),
            title: Text(title),
            subtitle: Text(subtitle),
            onTap: () {
              s.prayerMusicTrack = id;
              Track.setting('prayer_music_track');
            },
          );
        }

        return SafeArea(
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 4),
                  child: Text('성가 · 배경 음악', style: theme.textTheme.titleLarge),
                ),
                SwitchListTile(
                  key: const ValueKey('music-enabled'),
                  secondary: const Icon(Icons.music_note_outlined),
                  title: const Text('기도 중 성가 듣기'),
                  subtitle: Text(
                    on && _music.silent
                        ? kMusicTriduumNote
                        : '묵주기도를 바치는 동안 잔잔하게 틀어 둡니다. 목소리가 나올 때는 작아져요.',
                  ),
                  value: on,
                  onChanged: (_) => togglePrayerMusic(context, s),
                ),
                choice(kMusicShuffle, '섞어 듣기', '곡이 끝나면 다른 곡으로 넘어갑니다'),
                for (final t in prayerMusicTracks)
                  choice(t.id, t.title, t.subtitle),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Row(
                    children: [
                      Icon(
                        Icons.volume_down_outlined,
                        color: scheme.onSurfaceVariant,
                      ),
                      Expanded(
                        child: Slider(
                          key: const ValueKey('music-volume'),
                          min: AppSettings.minPrayerMusicVolume,
                          max: AppSettings.maxPrayerMusicVolume,
                          divisions: 19,
                          label: percent,
                          semanticFormatterCallback: (v) =>
                              '성가 크기 ${(v * 100).round()}%',
                          value: s.prayerMusicVolume,
                          onChanged: on
                              ? (v) => s.prayerMusicVolume = v
                              : null,
                          onChangeEnd: (_) =>
                              Track.setting('prayer_music_volume'),
                        ),
                      ),
                      SizedBox(
                        width: 44,
                        child: Text(
                          percent,
                          textAlign: TextAlign.end,
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                SwitchListTile(
                  key: const ValueKey('music-in-church'),
                  secondary: const Icon(Icons.church_outlined),
                  title: const Text('성당 안에서도 듣기'),
                  subtitle: const Text('성당을 걷는 동안에도 틀어 둡니다(성당 오르간 소리 대신)'),
                  value: s.prayerMusicInChurch,
                  onChanged: on
                      ? (v) {
                          s.prayerMusicInChurch = v;
                          Track.setting('prayer_music_church');
                        }
                      : null,
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 4, 24, 16),
                  child: Text(
                    '그레고리오 성가 선율을 오르간 소리로 만든 연주입니다(합성음, 녹음이 아닙니다). '
                    '출처는 더보기 → 성화 · 음악 출처에 있습니다.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
