// 기도 배경 성가(오르간) 목록과 출처. 근거 문서: licenses/MUSIC.md.
//
// 번들 4곡은 그레고리오 성가 선율(퍼블릭 도메인)을 이 프로젝트가 합성 오르간으로 직접 만든 것이다
// (tools/music/make_organ_tracks.py). 남의 녹음을 쓰지 않아 실연자·음반 제작자의 권리가 없다.
// 사람이 부른 성가 녹음(CC0)은 art/music_handoff/ 로 받아 오면 [extraMusicTracks]에 더해진다.

import 'prayer_music_extra.dart';

/// 배경 음악 한 곡.
class MusicTrack {
  const MusicTrack({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.asset,
    required this.credit,
    required this.license,
    required this.source,
  });

  /// 저장 값(설정 `prayer_music_track`)과 분석 이벤트에 쓰는 이름.
  final String id;

  /// 화면에 보이는 곡 이름.
  final String title;

  /// 곡 설명 한 줄(선법·연주 방식).
  final String subtitle;

  /// 번들 자산 경로(`assets/music/…`).
  final String asset;

  /// 선율·연주·제작 출처.
  final String credit;

  /// 라이선스 표기.
  final String license;

  /// 출처 주소(악보 또는 녹음 파일 페이지).
  final String source;
}

/// 곡 선택의 '섞어 듣기' 값.
const String kMusicShuffle = 'shuffle';

const _synth =
    '오르간 연주: 로사리움 제작(합성음, 녹음 아님 — tools/music/make_organ_tracks.py). '
    '악보: GregoBase(Andrew Hinkley 채보, CC0)';
const _cc0 = 'CC0 1.0 (선율은 퍼블릭 도메인) — https://creativecommons.org/publicdomain/zero/1.0/';

/// 앱에 넣은 오르간 성가 4곡.
const List<MusicTrack> bundledMusicTracks = [
  MusicTrack(
    id: 'organ_salve_regina',
    title: '살베 레지나 (Salve Regina)',
    subtitle: '성모 찬송 · 단순 선율(제5선법) · 오르간',
    asset: 'assets/music/organ_salve_regina.m4a',
    credit: '그레고리오 성가 〈Salve Regina〉 단순 선율(17세기). $_synth',
    license: _cc0,
    source: 'https://gregobase.selapa.net/chant.php?id=2435',
  ),
  MusicTrack(
    id: 'organ_ave_maria',
    title: '아베 마리아 (Ave Maria)',
    subtitle: '성모송 · 제1선법 · 오르간',
    asset: 'assets/music/organ_ave_maria.m4a',
    credit: '그레고리오 성가 〈Ave Maria〉(Salutatio Angelica). $_synth',
    license: _cc0,
    source: 'https://gregobase.selapa.net/chant.php?id=1860',
  ),
  MusicTrack(
    id: 'organ_adoro_te',
    title: '아도로 테 데보테 (Adoro te devote)',
    subtitle: '성체 찬미가 · 제5선법 · 오르간',
    asset: 'assets/music/organ_adoro_te.m4a',
    credit: '그레고리오 성가 〈Adoro te devote〉(선율 17세기 파리 행렬 성가집). $_synth',
    license: _cc0,
    source: 'https://gregobase.selapa.net/chant.php?id=3020',
  ),
  MusicTrack(
    id: 'organ_ubi_caritas',
    title: '우비 카리타스 (Ubi caritas)',
    subtitle: '사랑의 찬가 · 제6선법 · 오르간',
    asset: 'assets/music/organ_ubi_caritas.m4a',
    credit: '그레고리오 성가 〈Ubi caritas〉(Graduale Romanum, 1908). $_synth',
    license: _cc0,
    source: 'https://gregobase.selapa.net/chant.php?id=1696',
  ),
];

/// 고를 수 있는 모든 곡(번들 + 받아 온 성가 녹음).
const List<MusicTrack> prayerMusicTracks = [
  ...bundledMusicTracks,
  ...extraMusicTracks,
];

/// [id]의 곡. 없으면 null('섞어 듣기'나 지워진 곡).
MusicTrack? musicTrackById(String id) {
  for (final t in prayerMusicTracks) {
    if (t.id == id) return t;
  }
  return null;
}
