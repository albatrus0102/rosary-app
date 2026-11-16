# 기도 배경 성가(오르간) — 출처와 라이선스

확인일: 2026-11-15

앱 안 표시: 더보기 → **성화 · 음악 출처** → 기도 음악(성가), 그리고 오픈소스 라이선스 화면의 '성가(기도 배경 음악)'.
곡 목록 원본: `lib/domain/prayer_music_tracks.dart`.

## 요약

| 파일 (`assets/music/`) | 곡 | 길이 | 크기 | 선율 출처(악보) | 음원 | 라이선스 |
|---|---|---|---|---|---|---|
| `organ_salve_regina.m4a` | Salve Regina (단순 선율, 제5선법) | 3:07 | 1.9 MB | https://gregobase.selapa.net/chant.php?id=2435 | 자체 합성 | CC0 1.0 |
| `organ_ave_maria.m4a` | Ave Maria (Salutatio Angelica, 제1선법) | 2:36 | 1.6 MB | https://gregobase.selapa.net/chant.php?id=1860 | 자체 합성 | CC0 1.0 |
| `organ_adoro_te.m4a` | Adoro te devote (제5선법) | 3:16 | 2.0 MB | https://gregobase.selapa.net/chant.php?id=3020 | 자체 합성 | CC0 1.0 |
| `organ_ubi_caritas.m4a` | Ubi caritas (제6선법) | 2:50 | 1.7 MB | https://gregobase.selapa.net/chant.php?id=1696 | 자체 합성 | CC0 1.0 |

합계 약 7.2 MB (AAC-LC 80 kbps 스테레오, 44.1 kHz).

## 왜 문제가 없는가

음악에는 권리가 세 겹 있다: **곡(선율)**, **악보(판·채보)**, **녹음(실연·음반)**.

1. **선율** — 그레고리오 성가. 중세~17세기의 작자 미상(또는 사후 수백 년) 선율이라 퍼블릭 도메인이다.
   Ubi caritas 는 Graduale Romanum(바티칸판, 1908)에 실린 선율이다.
2. **악보** — GregoBase 의 GABC 채보(Andrew Hinkley)에서 **음높이만** 읽었다.
   GregoBase 는 "All chant transcriptions are released under CC0 (a.k.a. Public Domain) license." 라고 밝힌다
   (https://gregobase.selapa.net/?page_id=2 , 2026-11-15 확인). 솔렘(Solesmes)판의 리듬 기호(점·에피세마·익투스)는
   쓰지 않았고, 쉼표 앞 음을 길게 하는 일반 관행만 적용했다. 악보 사본: `tools/music/scores/*.gabc`.
3. **녹음** — **남의 녹음을 쓰지 않았다.** 오르간 소리(가산 합성 파이프 음색 + 합성 잔향)와 반주(선법 화음·페달)는
   `tools/music/make_organ_tracks.py` 가 처음부터 만든다. 그래서 실연자·음반 제작자의 권리(저작인접권)가 없다.
   반주 편곡과 결과 음원은 이 프로젝트가 만든 것이며 **CC0 1.0** 으로 둔다
   (https://creativecommons.org/publicdomain/zero/1.0/).

표시 의무는 없지만 앱 안에 출처를 적어 둔다. 광고·후원이 없는 무료 앱이라는 점과 무관하게, 상업적으로 써도 문제가 없는 조건이다.

## 정직한 고지

- 이 음원은 **합성음**이다. 사람이 연주하거나 부른 녹음이 아니며, 앱 안(성가 시트·출처 화면)에도 그렇게 적었다.
- 만든 환경에서는 소리를 직접 들어 볼 수 없었다. 스펙트럼·음량·클릭 유무만 수치로 확인했다
  (통합 음량 약 −19 LUFS, 피크 −6 dBFS 이하, 선율 대역이 반주보다 큼, 표본 간 튐 없음). **출시 전에 사람이 한 번 들어 봐야 한다.**
- 화음은 규칙(구절마다 가장 잘 맞는 선법 화음을 고르는 동적 계획)으로 붙였다. 전통적인 성가 반주집을 옮긴 것이 아니다.

## 쓰지 않은 것(검토 후 제외)

- **Internet Archive 의 'Gregorian Chant Mass'(GregorianChantMass), 'Chant Gregorian – Kyrie Eleison' 등** —
  올린 사람이 퍼블릭 도메인 표시를 붙였지만 연주자·음반이 밝혀져 있지 않거나(“Sacred Polyphony by ???”),
  상업 음반(Choralschola der Wiener Hofburgkapelle 등)을 옮긴 것으로 보인다. 출처 불명이라 제외.
- **Musopen 컬렉션(archive.org `MusopenCollectionAsFlac`)** — 퍼블릭 도메인이지만 관현악·피아노·현악 사중주뿐이고
  성가·오르간 곡이 없다.
- **CC BY-SA 녹음(위키미디어 커먼즈의 많은 성가 녹음)** — 프로젝트 방침상 쓰지 않는다.
- **1930년대 솔렘 수도원 음반 등 옛 음반** — 한국·EU 에서는 보호 기간이 끝났지만 미국에서는 2020년대 후반~2030년대까지
  보호되므로 제외.

## 사람이 부른 성가 녹음(추가 후보, PC 에서 받아야 함)

위키미디어 커먼즈에 구조화 데이터상 **CC0** 로 표시된 성가 녹음 3점이 있다(검색: `filetype:audio gregorian haswbstatement:P275=Q6938433`).
작업 환경에서는 커먼즈가 요청을 제한(HTTP 429)해 파일 페이지의 라이선스 틀·연주자·길이를 확인하지 못했고, 파일도 받지 못했다.
그래서 **앱에는 넣지 않았다.** `art/music_handoff/` 의 스크립트를 PC 에서 돌리면 라이선스를 API 로 다시 확인하고(CC0/PD 가 아니면 받지 않는다)
원본을 내려받는다. 받은 뒤 `tools/music/import_handoff.py` 가 AAC 로 줄여 `assets/music/chant_*.m4a` 와
`lib/domain/prayer_music_extra.dart` 를 만들면 앱의 곡 목록·출처 화면에 자동으로 더해진다. 그때 이 문서에도 한 줄씩 적는다.
