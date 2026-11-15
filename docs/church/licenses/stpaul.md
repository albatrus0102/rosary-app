# 성 밖 성 바오로 대성전(`stpaul`) — 후진 모자이크 · 사도 바오로의 무덤 (C-15, 2026-11-15)

사용자가 받아 올린 위키미디어 공용 사진(긴 변 2000px 이하 사본, `art/commons_handoff/received/` — 저장소 밖)으로 만든 판. 라이선스·저작자는 인계 목록
(`art/commons_handoff/manifest.json`, 확인일 2026-11-15) 기준(이 환경에서는 커먼즈가 429 로 막혀 파일 설명 페이지를 다시 열어 보지 못했다).

| 자리 | 작품 | 원본 파일 | 사진 · 라이선스 | 변경 | 판 |
|---|---|---|---|---|---|
| 후진 반돔 | 후진 모자이크 — 옥좌의 그리스도와 성 베드로·성 바오로·성 안드레아·성 루카(13세기 베네치아 장인, 1823년 화재 뒤 복원) | [Apse mosaic Basilica of St Paul Outside the Walls.jpg](https://commons.wikimedia.org/wiki/File:Apse_mosaic_Basilica_of_St_Paul_Outside_the_Walls.jpg) (3000×2000, [원본](https://commons.wikimedia.org/wiki/File:Apse_mosaic_of_the_Basilica_of_Saint_Paul_Outside_the_Walls.jpg)의 색을 낮춘 보정본) | 원작 Public domain · 사진 **Alberto Fernandez Fernandez(색 보정본 올린이 Amandajm), [CC BY 2.5](https://creativecommons.org/licenses/by/2.5/)** | 아래에서 올려다본 사진을 카메라 맞춤으로 반돔 곡면의 (둘레각, 올림각) 격자에 다시 폄(원근 재투영), 사진이 잘라 낸 아래 두 귀퉁이는 좌우 대칭 자리의 그림으로 잇고 나머지는 사진의 금 바탕·땅 띠를 되풀이해 채움, 축소 | 1344×672, WebP q71, 229KB |
| 콘페시오 제대 쪽 벽 | 사도 바오로의 무덤 — 창살(페네스텔라)과 양옆 대리석 판 | [St. Paul's Tomb.jpg](https://commons.wikimedia.org/wiki/File:St._Paul%27s_Tomb.jpg) (6280×5048) | **StPaul.jpg(Commons 사용자), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)** | 창살 벽 부분만 자르기, 축소 | 1024×464, WebP q86, 107KB |
| 콘페시오 바닥 | 같은 사진 — 유리 밑으로 보이는 석관 자리 발굴면 | 위와 같음 | 위와 같음 | 유리 바닥 부분을 잘라 원근 보정(위에서 본 직사각형으로), 축소 | 640×368, WebP q86, 68KB |

고른 까닭(모자이크): A(채도 높은 원본)·B(색을 낮춘 보정본) 가운데 B — A 는 금 바탕이 주황으로 타 보이고 앱 조명·발광이 더해지면 더 과해진다.

반돔 맞춤: `tools/commons_art/apse_fit.py` 가 사진 속 표지(가장자리 띠, 발밑 땅 띠, 꼭대기 부채 장식, 좌우 대칭 인물의 후광)를 앱 반돔(반지름 6.6m, 높이 5.2m 의 타원체 반쪽)에
바늘구멍 카메라로 맞춘다(오차 rms 7.5 화소 / 1500×1000). 그 값으로 `make_commons_art.py apse` 가 사진을 편다 → 인물이 곧게 서고 땅 띠가 수평이 된다.
`ch_stpaul.js` 의 반돔 UV 를 (둘레각, 올림각)으로 바꿨다. 도형으로 그린 그리스도·성인(절차 생성 캔버스)은 없앴고, 읽기 전·실패 때는 금 바탕만 보인다.
무덤: 제대 쪽 벽 전체(3.1 × 1.39m)가 사진 판, 그 앞 바닥 1.9 × 1.09m 가 유리 밑 석관 자리(옅은 유리 반사 판 + 청동 테). 예전의 금 창살 상자·붉은 반암 상감은 없앴다.

만드는 법: `python3 tools/commons_art/make_commons_art.py apse tomb` → `art/images_src/stpaul/*.webp` → `node tools/church_web/build_art_commons.mjs` → `assets/church/art_stpaul.js`(data URI, 539KB).
표기: `lib/domain/art_credits.dart` churchArtCredits(저작자·라이선스·원본 주소·변경사항). 주의: 이탈리아 문화유산법 — 비상업 전제(`ASSET_LICENSES.md` 'C-15 메모').
남은 것: 후진 아래 원통 벽의 사도 띠·개선문의 인물은 아직 절차 생성 그림이다(이번 사진에 없는 부분).
