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

## 성화 — 묵주기도 신비 배경 20점 · 십자가의 길 14처 (assets/images/, 2026-11-12 추가)
파일별 표는 `docs/church/licenses/art_mysteries.md`, `docs/church/licenses/art_stations.md`. 선정 근거·초점·색조는 `docs/ux/ART_REFERENCES.md`.

| 번들 파일 | 원본 | 작가 | 라이선스 | 비고 |
|---|---|---|---|---|
| mystery_joyful_1.jpg | https://commons.wikimedia.org/wiki/File:Fra_Angelico_-_Annunciation.jpg | 프라 안젤리코 (1440–50년경) | Public domain (PD-Art) | 환희 1단 · 마리아께서 예수님을 잉태하심 · 1280px JPEG |
| mystery_joyful_2.jpg | https://commons.wikimedia.org/wiki/File:Albertinelli_-_Visitazione_(nella_predella_Episodi_dell%E2%80%99Infanzia_di_Cristo),_1503,_1890_n.1587_(cropped).jpg | 마리오토 알베르티넬리 (1503) | Public domain (PD-Art) | 환희 2단 · 마리아께서 엘리사벳을 찾아보심 · 1280px JPEG |
| mystery_joyful_3.jpg | https://commons.wikimedia.org/wiki/File:Gerard_van_Honthorst_-_Adoration_of_the_Shepherds_(1622).jpg | 헤라르트 판 혼트호르스트 (1622) | Public domain (PD-Art) | 환희 3단 · 마리아께서 예수님을 낳으심 · 1280px JPEG |
| mystery_joyful_4.jpg | https://commons.wikimedia.org/wiki/File:Presentation_of_Jesus_at_the_Temple_by_Fra_Angelico_(San_Marco_Cell_10).jpg | 프라 안젤리코 (1440–42년경) | Public domain (PD-Art) | 환희 4단 · 마리아께서 예수님을 성전에 바치심 · 1280px JPEG |
| mystery_joyful_5.jpg | https://commons.wikimedia.org/wiki/File:William_Holman_Hunt_-_The_Finding_of_the_Saviour_in_the_Temple.jpg | 윌리엄 홀먼 헌트 (1854–60) | Public domain (PD-Art) | 환희 5단 · 마리아께서 잃으셨던 예수님을 성전에서 찾으심 · 1280px JPEG |
| mystery_luminous_1.jpg | https://commons.wikimedia.org/wiki/File:Baptism_of_Christ_by_Andrea_del_Verrocchio.jpg | 안드레아 델 베로키오·레오나르도 다 빈치 (1470–75년경) | Public domain (PD-Art) | 빛 1단 · 예수님께서 세례받으심 · 1280px JPEG |
| mystery_luminous_2.jpg | https://commons.wikimedia.org/wiki/File:The_Marriage_Feast_at_Cana_MET_DT1459.jpg | 후안 데 플란데스 (1500–04년경) | CC0 | 빛 2단 · 예수님께서 카나에서 첫 기적을 행하심 · 1280px JPEG |
| mystery_luminous_3.jpg | https://commons.wikimedia.org/wiki/File:Bloch-SermonOnTheMount.jpg | 카를 블로크 (1877) | Public domain (PD-Art) | 빛 3단 · 예수님께서 하느님 나라를 선포하심 · 1280px JPEG |
| mystery_luminous_4.jpg | https://commons.wikimedia.org/wiki/File:Raphael_-_The_Transfiguration_-_Google_Art_Project.jpg | 라파엘로 (1516–20) | Public domain (PD-Art) | 빛 4단 · 예수님께서 거룩하게 변모하심 · 1280px JPEG |
| mystery_luminous_5.jpg | https://commons.wikimedia.org/wiki/File:Dieric_Bouts_-_The_Last_Supper.jpg | 디르크 바우츠 (1464–68) | Public domain (PD-Art) | 빛 5단 · 예수님께서 성체성사를 세우심 · 1280px JPEG |
| mystery_sorrowful_1.jpg | https://commons.wikimedia.org/wiki/File:Christ_in_Gethsemane.jpg | 하인리히 호프만 (1886 (1890년 설도 있음)) | Public domain (PD-Art) | 고통 1단 · 예수님께서 우리를 위하여 피땀 흘리심 · 1280px JPEG |
| mystery_sorrowful_2.jpg | https://commons.wikimedia.org/wiki/File:Caravaggio_-_La_Flagellazione_di_Cristo.jpg | 카라바조 (1607) | Public domain (PD-Art) | 고통 2단 · 예수님께서 우리를 위하여 매 맞으심 · 1280px JPEG |
| mystery_sorrowful_3.jpg | https://commons.wikimedia.org/wiki/File:Titian_-_Christ_crowned_with_Thorns_-_Louvre.jpg | 티치아노 (1542–43) | Public domain (PD-Art) | 고통 3단 · 예수님께서 우리를 위하여 가시관 쓰심 · 1280px JPEG |
| mystery_sorrowful_4.jpg | https://commons.wikimedia.org/wiki/File:Christ_Carrying_the_Cross_MET_DP347226.jpg | 엘 그레코 (1577–87년경) | CC0 | 고통 4단 · 예수님께서 우리를 위하여 십자가 지심 · 1280px JPEG |
| mystery_sorrowful_5.jpg | https://commons.wikimedia.org/wiki/File:Cristo_crucificado.jpg | 디에고 벨라스케스 (1632년경) | Public domain (PD-Art) | 고통 5단 · 예수님께서 우리를 위하여 십자가에 못 박혀 돌아가심 · 1280px JPEG |
| mystery_glorious_1.jpg | https://commons.wikimedia.org/wiki/File:Piero_della_Francesca_-_Resurrection_-_WGA17609.jpg | 피에로 델라 프란체스카 (1463–65년경) | Public domain (PD-Art) | 영광 1단 · 예수님께서 부활하심 · 1280px JPEG |
| mystery_glorious_2.jpg | https://commons.wikimedia.org/wiki/File:Rembrandt_The_Ascension_1636_Oil_on_canvas_Alte_Pinakothek_Munich_Germany.jpg | 렘브란트 (1636) | Public domain (PD-Art) | 영광 2단 · 예수님께서 승천하심 · 1280px JPEG |
| mystery_glorious_3.jpg | https://commons.wikimedia.org/wiki/File:Pentecost%C3%A9s_(El_Greco,_c._1600)_Prado.jpg | 엘 그레코 (1600년경) | Public domain (PD-Art) | 영광 3단 · 예수님께서 성령을 보내심 · 1280px JPEG |
| mystery_glorious_4.jpg | https://commons.wikimedia.org/wiki/File:Tizian_041.jpg | 티치아노 (1516–18) | Public domain (PD-Art) | 영광 4단 · 예수님께서 마리아를 하늘에 불러올리심 · 1280px JPEG |
| mystery_glorious_5.jpg | https://commons.wikimedia.org/wiki/File:Vel%C3%A1zquez_-_Coronaci%C3%B3n_de_la_Virgen_(Museo_del_Prado,_h._1645).jpg | 디에고 벨라스케스 (1635–36) | Public domain (PD-Art) | 영광 5단 · 예수님께서 마리아께 천상 모후의 관을 씌우심 · 1280px JPEG |
| station_01.jpg | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_01.jpg | Gebhard Fugel (1921) · 사진 Andreas Praefcke | Public domain (PD-old-70 / PD-Art) | 제1처 · 1000px JPEG |
| station_02.jpg | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_02.jpg | Gebhard Fugel (1921) · 사진 Andreas Praefcke | Public domain (PD-old-70 / PD-Art) | 제2처 · 1000px JPEG |
| station_03.jpg | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_03.jpg | Gebhard Fugel (1921) · 사진 Andreas Praefcke | Public domain (PD-old-70 / PD-Art) | 제3처 · 1000px JPEG |
| station_04.jpg | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_04.jpg | Gebhard Fugel (1921) · 사진 Andreas Praefcke | Public domain (PD-old-70 / PD-Art) | 제4처 · 1000px JPEG |
| station_05.jpg | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_05.jpg | Gebhard Fugel (1921) · 사진 Andreas Praefcke | Public domain (PD-old-70 / PD-Art) | 제5처 · 1000px JPEG |
| station_06.jpg | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_06.jpg | Gebhard Fugel (1921) · 사진 Andreas Praefcke | Public domain (PD-old-70 / PD-Art) | 제6처 · 1000px JPEG |
| station_07.jpg | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_07.jpg | Gebhard Fugel (1921) · 사진 Andreas Praefcke | Public domain (PD-old-70 / PD-Art) | 제7처 · 1000px JPEG |
| station_08.jpg | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_08.jpg | Gebhard Fugel (1921) · 사진 Andreas Praefcke | Public domain (PD-old-70 / PD-Art) | 제8처 · 1000px JPEG |
| station_09.jpg | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_09.jpg | Gebhard Fugel (1921) · 사진 Andreas Praefcke | Public domain (PD-old-70 / PD-Art) | 제9처 · 1000px JPEG |
| station_10.jpg | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_10.jpg | Gebhard Fugel (1921) · 사진 Andreas Praefcke | Public domain (PD-old-70 / PD-Art) | 제10처 · 1000px JPEG |
| station_11.jpg | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_11.jpg | Gebhard Fugel (1921) · 사진 Andreas Praefcke | Public domain (PD-old-70 / PD-Art) | 제11처 · 1000px JPEG |
| station_12.jpg | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_12.jpg | Gebhard Fugel (1921) · 사진 Andreas Praefcke | Public domain (PD-old-70 / PD-Art) | 제12처 · 1000px JPEG |
| station_13.jpg | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_13.jpg | Gebhard Fugel (1921) · 사진 Andreas Praefcke | Public domain (PD-old-70 / PD-Art) | 제13처 · 1000px JPEG |
| station_14.jpg | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_14.jpg | Gebhard Fugel (1921) · 사진 Andreas Praefcke | Public domain (PD-old-70 / PD-Art) | 제14처 · 1000px JPEG |
