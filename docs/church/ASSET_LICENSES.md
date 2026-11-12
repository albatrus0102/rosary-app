# 외부 자산 라이선스 기록 (ASSET_LICENSES)

웹 성당 장면의 기본 도형·재질은 코드로 생성하고, **사실감을 위해 아래의 CC0/퍼블릭 도메인 사진 질감과 HDRI 한 장**을 번들한다.
(번들 형식: `assets/church/tex_*.jpg` 원본 + `tex_pack.js`(data URI, `node tools/church_web/build_texpack.mjs`) + `env_church.js`(HDR base64, `build_envpack.mjs`). data URI 로 넣는 이유: file:// 로 열린 WebView 에서 이미지 파일을 WebGL 질감으로 쓰면 교차 출처 오류가 나기 때문.)

**허용 규칙**: CC0, 퍼블릭 도메인(PD-old, PD-Art), 또는 CC-BY(저작자 표시 문구를 이 표에 기록한 경우만). **CC-BY-SA, CC-BY-NC, 라이선스 불명은 쓰지 않는다.**
성당별 사진은 `assets/church/tex_<성당id>_*.jpg` 로 추가하고, 그 성당 전용 표를 `docs/church/licenses/<성당id>.md` 에 쓴다(앱의 라이선스 화면이 읽는다).
각 파일마다 원본 URL · 작가 · 라이선스 · (필요하면) 표시 문구를 기록한다.

## 공용 질감 (assets/church/tex_*.jpg, 모두 1024px 이하, JPEG q80)
| 번들 파일 | 원본 | 작가 | 라이선스 | 비고 |
|---|---|---|---|---|
| tex_marble_white(.jpg/_n/_r) | https://ambientcg.com/a/Marble021 | ambientCG | CC0 | Color/NormalGL/Roughness 1K |
| tex_marble_black(_n/_r) | https://ambientcg.com/a/Marble016 | ambientCG | CC0 | 〃 |
| tex_marble_beige(_n/_r) | https://ambientcg.com/a/Marble014 | ambientCG | CC0 | 〃 |
| tex_marble_rose(_n/_r) | https://ambientcg.com/a/Marble020 | ambientCG | CC0 | 〃 |
| tex_marble_checker(_n/_r) | Marble021 + Marble016 을 2×2 체스판으로 합성 | ambientCG | CC0 | 합성본 |
| tex_limestone(_n/_r) | https://polyhaven.com/a/marble_01 | Rob Tuytel (Poly Haven) | CC0 | |
| tex_plaster(_n/_r) | https://polyhaven.com/a/white_plaster_02 | Rob Tuytel (Poly Haven) | CC0 | |
| tex_stone_grey(_n/_r) | https://polyhaven.com/a/plastered_wall_04 | Rob Tuytel (Poly Haven) | CC0 | |
| tex_brick_grey(_n/_r) | https://polyhaven.com/a/brick_wall_13 | Rob Tuytel (Poly Haven) | CC0 | |
| tex_wood_dark(_n/_r) | https://polyhaven.com/a/dark_wood | Dario Barresi, Dimitrios Savva, Rico Cilliers (Poly Haven) | CC0 | |
| tex_wood_cherry(_n/_r) | https://polyhaven.com/a/lacquered_cherry_wood | Jenelle van Heerden, Rico Cilliers (Poly Haven) | CC0 | |
| tex_mosaic_gold | https://commons.wikimedia.org/wiki/File:Apsis_mosaic_San_Clemente.jpg (산 클레멘테 성당 후진 반돔의 금빛 소용돌이 부분을 잘라 4방향 대칭 타일로 만듦) | Jastrow | Public domain (PD-Art, 11–12세기 모자이크 사진) | 글자·인물이 없는 영역만 사용 |
| tex_fresco_dome | https://commons.wikimedia.org/wiki/File:Intercession_of_Charles_Borromeo_supported_by_the_Virgin_Mary_-_Detail_Rottmayr_Fresco_-_Karlskirche_-_Vienna.JPG | Johann Michael Rottmayr (1725–30, 비엔나 카를스키르헤 천장화 사진) | Public domain | |
| tex_gold_relief | https://commons.wikimedia.org/wiki/File:Fronton_Porte_Dor%C3%A9e_Fontainebleau.jpg | Jebulon | CC0 | 금박 장식 문 위 |

## 환경광 HDRI (assets/church/env_church.js)
| 파일 | 원본 | 작가 | 라이선스 |
|---|---|---|---|
| env_church.js (small_cathedral_1k.hdr 의 base64) | https://polyhaven.com/a/small_cathedral (https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/small_cathedral_1k.hdr) | Sergej Majboroda (Poly Haven) | CC0 |

## 번들된 오픈소스
| 이름 | 버전 | 파일 | 라이선스 |
|---|---|---|---|
| three.js | 0.149.0 | `assets/church/three.min.js` (npm `three@0.149.0` 의 `build/three.min.js`, MIT 헤더 유지) | MIT |
| three.js examples/jsm 일부(EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, SSAOPass, SMAAPass, RoomEnvironment, RGBELoader, Reflector, Sky) | 0.149.0 | `assets/church/three_extras.js` (`tools/church_web/build_extras.mjs` 로 esbuild 번들) | MIT |
| esbuild (빌드 도구만, 저장소에 번들되지 않음) | 0.21.5 | `tools/church_web/node_modules` (git 제외) | MIT |

## 규칙
1. 새 사진은 위 허용 규칙을 만족하는 것만. Wikimedia Commons 는 `action=query&prop=imageinfo&iiprop=extmetadata` 의 `LicenseShortName` 을 확인(CC BY-SA/NC 제외)하고 파일 설명 페이지 URL 을 기록한다.
2. 이미지는 1024px 이하 JPEG(질감) — 공용 합계 10MB 미만. 사진 안의 글자·초상은 가려지는 영역만 잘라 쓰거나 색 면으로 대체한다.
3. `ctx.loadTexture(url, fallbackFactory)` 로 런타임에 외부에서 받는 경우도 이 표에 URL 을 기록한다(번들이 기본이고 권장).
