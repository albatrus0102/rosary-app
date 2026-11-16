# 성모상 3D (Meshy AI) — 라이선스

- 파일: `assets/church/statue3d_mary_meshy.js` (우리 본당·라테라노·성 바오로·밀라노·피렌체·당고개·성 베드로의 성모 기도 자리)
- 생성: Meshy AI(https://www.meshy.ai) 무료 플랜 — 사용자가 직접 만든 성모상 그림(GPT/Gemini 로 생성, `art/statues/marble_views/`)을 이미지→3D 로 변환. 모델 이름 `Marian_Serenity`, 2026-11-16.
- 라이선스: **CC BY 4.0**(https://creativecommons.org/licenses/by/4.0/) — Meshy 무료 플랜 생성물. 저작자표시: **"Meshy AI"**.
- 앱 안 표기: '성화 출처' 화면 → '성당 안 성모상 3D' — "성모상 3D: Meshy AI로 생성(CC BY 4.0), 원 그림 사용자 제작" (`lib/domain/art_credits.dart`).
- 변경 사항: 삼각형 739,044 → 약 36,000(원거리 약 8,000)으로 줄임(meshopt 단순화, 법선은 원본 유지), 위치 16비트·법선 팔면체 양자화 + meshopt 압축, 흰 대리석 재질을 입힘(색·질감 없는 형태만 사용).
- 원본 glb(16.9MB)는 저장소에 올리지 않는다(`.gitignore`: `art/statues/meshy/*.glb`; 사용자 PC 보관). 배포용 판은 `tools/statues/meshy_decimate.mjs` → `tools/statues/make_statue_meshy_pack.mjs` 로 다시 만든다.
- 유료 플랜으로 바꾸거나 다시 생성하면 Meshy 약관(소유권·표기 의무)이 달라질 수 있으니 이 파일과 앱 표기를 함께 고친다. 앱은 완전 비상업(docs/BACKLOG.md).
- 포함된 코드: meshoptimizer 디코더(MIT, Arseny Kapoulkine) — `statue3d_mary_meshy.js` 안에 동봉.

## Meshy 약관 2.4(AI 식별 표지) 점검 — 2026-11-16

- 점검 대상: 사용자가 올린 원본 GLB(`Marian_Serenity_Meshy_AI_2026-11-16_393dc7.glb`, 17,737,332바이트; 저장소 밖 `art/statues/meshy/marian_serenity_meshy_orig.glb` 에 해당).
- 결과: glTF JSON 은 **`asset: { version: "2.0", generator: "xpostprocessing" }`** 한 줄이 Meshy 가 남긴 식별 표지의 전부다. `extras`·`extensions`·저작권(`copyright`)·라이선스·워터마크 문자열·C2PA 표지는 없다(바이너리 전체에서 'Meshy'·'copyright'·'watermark'·'c2pa'·'license'·'extras' 검색 0건). 메시는 위치·법선·인덱스 하나뿐이고 질감·UV·정점 색이 없다. 눈에 보이는 워터마크 형상도 확인되지 않았다(받침 위 흰 대리석 성상, 앞·옆·뒤 4방향 미리보기 렌더로 확인).
- 변환에서 빠진 것: 우리 팩(`tools/statues/make_statue_meshy_pack.mjs`)은 위치·법선만 다시 부호화해 `asset.generator` 가 빠져 있었다.
- 조치: 팩 객체의 `meta.src` 에 `generator: "Meshy AI"`, `gltfAssetGenerator: "xpostprocessing"`, 모델 이름, 출처 주소, `license: "CC BY 4.0"`, `attribution: "Meshy AI"`, `aiGenerated: true` 를 넣고 팩 머리 주석에도 적었다(`assets/church/statue3d_mary_meshy.js`, `window.ChurchArt.statues3d.mary_meshy.meta.src`). 생성기에도 같은 값을 넣어 다시 만들어도 유지된다. 시험: `tools/church_web/shrine.test.mjs`. 앱 화면 표기("성모상 3D: Meshy AI로 생성(CC BY 4.0)")는 그대로.
- 한계: 약관 2.4 의 "메타데이터·워터마크를 제거·변경·무력화" 문언을 엄격히 읽으면 형식 자체(glTF `asset.generator`)가 바뀐 것까지 해당할 수 있으나, 원본 형식의 식별 값은 팩에 그대로 보존되고 앱 안에도 Meshy 표기가 있다. 위험은 낮다. 원본 GLB 는 보관한다(`.gitignore` 로 저장소 밖).
