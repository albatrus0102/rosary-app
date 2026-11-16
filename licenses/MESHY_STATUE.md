# 성모상 3D (Meshy AI) — 라이선스

- 파일: `assets/church/statue3d_mary_meshy.js` (우리 본당·라테라노·성 바오로·밀라노·피렌체·당고개·성 베드로의 성모 기도 자리)
- 생성: Meshy AI(https://www.meshy.ai) 무료 플랜 — 사용자가 직접 만든 성모상 그림(GPT/Gemini 로 생성, `art/statues/marble_views/`)을 이미지→3D 로 변환. 모델 이름 `Marian_Serenity`, 2026-11-16.
- 라이선스: **CC BY 4.0**(https://creativecommons.org/licenses/by/4.0/) — Meshy 무료 플랜 생성물. 저작자표시: **"Meshy AI"**.
- 앱 안 표기: '성화 출처' 화면 → '성당 안 성모상 3D' — "성모상 3D: Meshy AI로 생성(CC BY 4.0), 원 그림 사용자 제작" (`lib/domain/art_credits.dart`).
- 변경 사항: 삼각형 739,044 → 약 36,000(원거리 약 8,000)으로 줄임(meshopt 단순화, 법선은 원본 유지), 위치 16비트·법선 팔면체 양자화 + meshopt 압축, 흰 대리석 재질을 입힘(색·질감 없는 형태만 사용).
- 원본 glb(16.9MB)는 저장소에 올리지 않는다(`.gitignore`: `art/statues/meshy/*.glb`; 사용자 PC 보관). 배포용 판은 `tools/statues/meshy_decimate.mjs` → `tools/statues/make_statue_meshy_pack.mjs` 로 다시 만든다.
- 유료 플랜으로 바꾸거나 다시 생성하면 Meshy 약관(소유권·표기 의무)이 달라질 수 있으니 이 파일과 앱 표기를 함께 고친다. 앱은 완전 비상업(docs/BACKLOG.md).
- 포함된 코드: meshoptimizer 디코더(MIT, Arseny Kapoulkine) — `statue3d_mary_meshy.js` 안에 동봉.
