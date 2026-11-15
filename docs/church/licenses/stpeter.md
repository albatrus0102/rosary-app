# 성 베드로 대성전(`stpeter`) — 피에타 · 성 베드로 청동 좌상 (C-15, 2026-11-15)

사용자가 받아 올린 위키미디어 공용 사진(긴 변 2000px 사본, `art/commons_handoff/received/` — 저장소 밖)으로 만든 판. 라이선스·저작자는 인계 목록
(`art/commons_handoff/manifest.json`, 확인일 2026-11-15) 기준(이 환경에서는 커먼즈가 429 로 막혀 파일 설명 페이지를 다시 열어 보지 못했다).

| 자리 | 작품 | 원본 파일 | 사진 · 라이선스 | 변경 | 판 |
|---|---|---|---|---|---|
| 오른쪽 첫 경당(피에타 경당) 뒷벽 | 미켈란젤로 〈피에타〉 1498–99, 대리석 | [Michelangelo's Pieta, St. Peter's Basilica, Vatican City (48466681337).jpg](https://commons.wikimedia.org/wiki/File:Michelangelo%27s_Pieta,_St._Peter%27s_Basilica,_Vatican_City_(48466681337).jpg) (6000×4000) | 원작 Public domain · **사진: Gary Todd, [Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/)** | 조각과 받침 둘레로 자르기, 가장자리를 어둡게(어두운 벽에 녹아들게), 밝기 +8%, 축소 | 1024×883, WebP q86, 65KB |
| 신랑 오른쪽 마지막 피어(성 론지노 피어) 앞 | 성 베드로 청동 좌상, 13세기(아르놀포 디 캄비오 작으로 전함) | [St. Peter's Basilica, Bronze Statue of St. Peter (48466478846).jpg](https://commons.wikimedia.org/wiki/File:St._Peter%27s_Basilica,_Bronze_Statue_of_St._Peter_(48466478846).jpg) (4000×6000) | 원작 Public domain · **사진: Gary Todd, [Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/)** | 후광 위에서 발밑 받침 윗면까지 자르기(뒤의 붉은 금란 무늬 모자이크 벽 포함), 축소 | 704×1043, WebP q86, 156KB |

고른 까닭(피에타): A(조각 근접)·B(제대까지 든 경당 전경) 가운데 A — 조각이 화면의 절반을 넘게 차지해 벽감 판으로 쓸 해상도가 나오고, 제대는 3D 로 이미 있다.

자리: 피에타는 실제처럼 제대 뒤 높은 자리에, 경당 어귀는 방탄유리(옅은 반사 판, `glassRefl`)로 막았다. 청동상은 신랑 쪽 돔 피어 면 앞 설화석고 받침 위 —
실제로도 뒤에 붉은 금란 무늬 벽판이 서 있어 사진의 배경을 그대로 살린 판으로 세웠다(배경 제거·입체화는 하지 않았다: 옆에서 보면 평면이다).
예전의 상자·원뿔·공으로 만든 피에타와 청동상 인물은 없앴다(`docs/church/REVERENCE.md`).

만드는 법: `python3 tools/commons_art/make_commons_art.py stpeter` → `art/images_src/stpeter/*.webp` → `node tools/church_web/build_art_commons.mjs` → `assets/church/art_stpeter.js`(data URI, 296KB).
표기: `lib/domain/art_credits.dart` churchArtCredits — '사진: Gary Todd, Public Domain Mark'.
주의: Public Domain Mark 는 권리 포기(CC0)가 아니라 '알려진 저작권 없음' 표시라 나라별 효력이 다를 수 있고, 바티칸 소장품의 영리 이용에는 따로 규정이 있다.
로사리움이 완전 비상업이라는 결정을 전제로 쓴다 — 유료화·광고·후원을 넣게 되면 다시 검토(`ASSET_LICENSES.md` 'C-15 메모').
기둥의 성모(02)는 허용 라이선스 사진을 구하지 못해 넣지 않았다(다른 그림으로 대체하지 않음).
