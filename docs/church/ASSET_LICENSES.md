# 외부 자산 라이선스 기록 (ASSET_LICENSES)

웹 성당 장면의 기본 도형·재질은 코드로 생성하고, **사실감을 위해 아래의 CC0/퍼블릭 도메인 사진 질감과 HDRI 한 장**을 번들한다.
(번들 형식: `assets/church/tex_*.jpg` 원본 + `tex_pack.js`(data URI, `node tools/church_web/build_texpack.mjs`) + `env_church.js`(HDR base64, `build_envpack.mjs`). data URI 로 넣는 이유: file:// 로 열린 WebView 에서 이미지 파일을 WebGL 질감으로 쓰면 교차 출처 오류가 나기 때문.)

**허용 규칙**: CC0, 퍼블릭 도메인(PD-old, PD-Art), 또는 CC-BY(저작자 표시 문구를 이 표에 기록한 경우만). **CC-BY-SA, CC-BY-NC, 라이선스 불명은 쓰지 않는다.**
성당별 사진은 `assets/church/tex_<성당id>_*.jpg` 로 추가하고, 그 성당 전용 표를 `docs/church/licenses/<성당id>.md` 에 쓴다(앱의 라이선스 화면이 읽는다).
각 파일마다 원본 URL · 작가 · 라이선스 · (필요하면) 표시 문구를 기록한다.

## 공용 질감 (assets/church/tex_*.jpg, 모두 1024px 이하, JPEG q80) — 아래 표의 marble_white·marble_checker·wood_dark 는 2026-11-16 에 ChatGPT 생성물로 교체됨(다음 절)
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

## 사용자가 ChatGPT 로 생성한 질감 (2026-11-16, 프롬프트 번호 = [TEXTURE_PROMPTS.md](TEXTURE_PROMPTS.md) §2)
외부 라이선스 없음. 이용 권한은 ChatGPT 이용약관(사용자 요금제 약관)에 따른다. 원본 PNG(약 1254²)는 저장소에 넣지 않고, **처리된 1024/512 JPEG 만** `art/church_tex_src/` 에 둔다(`tools/church_web/tex_ingest_chatgpt.py`: 이음매 보정 → 리사이즈 → 노말·러프니스 유도).
| 번들 파일 | 출처 | 프롬프트 | 처리 | 비고 |
|---|---|---|---|---|
| tex_marble_white(.jpg/_n/_r) | 사용자가 ChatGPT 로 생성, 2026-11-16 | T-01 흰 카라라 대리석 | 사방 30% 교차 페이드 심리스 → 1024 | 기존 CC0 Marble021 **대체** |
| tex_marble_checker(_n/_r) | 〃 | T-02 흑백 2×2 체스판 | 줄눈이 가장자리에서 얇던 것을 **타일 4장을 잘라 줄눈 8px(전 구간 동일)로 재조립** → 1024 | 기존 합성본 **대체** |
| tex_travertine(_n/_r) | 〃 | T-06 꿀색 트래버틴 어긋쌓기 | 줄 간격이 안 맞던 아래 줄을 블록 8장으로 **재조립(4줄, 한 줄씩 반 블록 어긋, 줄눈이 타일 가장자리와 정렬)**, 채도 45% 낮춤(로마 크림빛 실내에 맞춤) → 1024 | 신규 |
| tex_granite(_n/_r) | 〃 | T-07 회색 화강암·석회암 어긋쌓기 | 세로는 줄눈 중심~중심으로 잘라 주기 맞춤, 가로는 64px 교차 페이드 → 1024 | 신규 |
| tex_wood_dark(_n/_r) | 〃 | T-10 어두운 호두나무 널 | 가로 교차 페이드(세로 주기는 원본이 이미 맞음) → 1024 | 기존 CC0 dark_wood **대체** |
| tex_velvet | 〃 | T-13 붉은 벨벳 | 심리스 → 512 회색조 **명암 맵**(평균 0.88): 색은 쓰는 곳(양탄자·전례 천)의 색을 따른다 | 신규 |
| tex_gold_leaf(_n/_r) | 〃 | T-17 두드린 금박 | 심리스 → 512 회색조 명암 맵(평균 0.9) + 법선·거칠기 유도. 금 **색**은 빌더의 정점 색이 정한다 | 신규 |
| tex_mortar_decal | 〃 | T-23 줄눈 데칼(흰 바탕 회색 선) | 세로 주기 자름 + 가로 교차 페이드 → 512 회색조. 실행 시 사진에 **곱해** 합성(캔버스 1장 공유) | 신규 |

**적용(2026-11-16)** — 질감 슬롯을 교체(marble_white·marble_checker·wood_dark)했으므로 그 슬롯을 쓰던 모든 성당이 자동으로 새 질감을 받는다. 추가 연결:
- 성 베드로: 피어·벽기둥·벽면의 `limestone` → `travertine`(로마 석재). 라테라노: 그늘 스투코 `STU_SH` → `travertine`. 신랑 바닥 등 **고유 문양 바닥은 그대로**(체스판으로 바꾸지 않음; 체스판은 문서상 체스판 바닥이 없어 `ch_basic` 만 쓴다).
- 밀라노: 벽·아케이드 묶음 `stone_grey` → `granite`(고딕 석조의 켜). 피렌체: `stone_grey` 에 줄눈 데칼(T-23)을 곱해 어긋쌓기 사암 벽처럼(런타임 캔버스 합성, 사진·데칼 쌍당 1장 공유).
- 신자석·무릎틀·마룻바닥·성가대석: `wood_dark` = 호두나무(T-10). 모든 성당의 대리석 `marble_white` = 카라라(T-01).
- 금박(T-17): 금속 묶음(`mats.metal`)에 명암·법선·거칠기만 입힘(색은 성당별 정점 색). 벨벳(T-13): 양탄자 요철(bump) + 전례 천 묶음(`liturgy-cloth`)의 명암. 둘 다 새 draw call 없음.
- 선별 못 한 것: 무릎틀 쿠션 벨벳(새 묶음 = draw call +1 이라 보류).

## 환경광 HDRI (assets/church/env_church.js)
| 파일 | 원본 | 작가 | 라이선스 |
|---|---|---|---|
| env_church.js (small_cathedral_1k.hdr 를 512x256 으로 줄여 base64 로 넣은 것; 원본은 art/env_church_1k.hdr) | https://polyhaven.com/a/small_cathedral (https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/small_cathedral_1k.hdr) | Sergej Majboroda (Poly Haven) | CC0 |

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


## 십자가의 길 그림 연작 — 성당별 대체 성화 (assets/images/stations/<연작>/, assets/church/cross_pack_<연작>.js, 2026-11-14 추가)
각 성당에 실제로 걸린 14처가 아니라 저작권이 끝난 연작을 성당마다 나눠 건 것이다(앱 안에서 밝힌다). 파일별 표는 `docs/church/licenses/art_stations_series.md`, 원자료 `data/stations_series.json`, 배정·위험은 `docs/ux/STATIONS_OF_CROSS.md`. 2026-11-15: 연작 3개(티에폴로 동판화·푸겔 뮌헨·판로트)를 더해 성당 8곳이 모두 다른 연작을 쓴다(푸겔 1921 은 우리 본당만). 모든 연작은 더보기 → 십자가의 길의 '그림 연작' 칩으로도 고를 수 있다.

| 번들 | 원본 | 작가 | 라이선스 | 비고 |
|---|---|---|---|---|
| assets/images/stations/previati/station_01~14.webp, cross_pack_previati.js | https://commons.wikimedia.org/wiki/Category:Via_Crucis_by_Gaetano_Previati | 가에타노 프레비아티 (1901–02) · 사진·스캔 Sailko | CC BY 3.0 — **표기 의무**(촬영자·라이선스 링크·변경 여부) | 성 베드로 대성전 · 액자를 잘라 내고 크기를 줄임 · 권리 확인: 출시 전 확인 |
| assets/images/stations/oreilly/station_01~14.webp, cross_pack_oreilly.js | https://archive.org/details/beautifulpearlso00oreirich | 작가 미상(American Lithographic Co. 인쇄) (1897) · 사진·스캔 University of California Libraries 스캔(Internet Archive) | Public domain | 라테라노 성 요한 대성전 · 책장의 제목·여백을 잘라 내고 크기를 줄임 · 권리 확인: 확인 |
| assets/images/stations/corot/station_01~14.webp, cross_pack_corot.js | https://commons.wikimedia.org/wiki/Category:Chemin_de_croix_de_l%27%C3%A9glise_de_Rosny_(Seine-et-Oise)_(R1083-1096)_by_Jean-Baptiste-Camille_Corot | 장바티스트 카미유 코로 (1853–59) · 사진·스캔 미확인(도판 복제, Commons 출처 amolenuvolette.it) | Public domain (PD-Art) | 성 마리아 마조레 대성전 · 크기를 줄임 · 권리 확인: 확인 |
| assets/images/stations/hermann_paul/station_01~14.webp, cross_pack_hermann_paul.js | https://commons.wikimedia.org/wiki/Category:Via_Crucis_-_Hermann-Paul | 르네 조르주 헤르만 폴 (1929) · 사진·스캔 Uto | CC0 1.0 | 밀라노 대성당 · 책장 여백을 잘라 내고 크기를 줄임 · 권리 확인: 확인 |
| assets/images/stations/mosler/station_01~14.webp, cross_pack_mosler.js | https://archive.org/details/the_stations_of_the_cross_with_fourteen_illustrations_1859 | D. 모슬러 (1859) · 사진·스캔 Google Books 스캔(Internet Archive 사본) | Public domain | 피렌체 대성당 · 책장에서 삽화만 잘라 내고 크기를 줄임 · 권리 확인: 확인 |
| assets/images/stations/tiepolo/station_01~14.webp, cross_pack_tiepolo.js | https://commons.wikimedia.org/wiki/File:Ecce_Homo_Stazione_I_Gesu_condannato_a_morte_(titel_op_object)_Kruiswegstaties_(serietitel)_Via_Crucis_(serietitel),_RP-P-1950-500.jpg | 조반니 도메니코 티에폴로 (1749) · 사진·스캔 Rijksmuseum | CC0 1.0 | 연작 선택 전용(성당 배정 없음) · 아래 글귀와 여백을 잘라 내고 크기를 줄임(용량을 위해 살짝 흐림) · 권리 확인: 확인 · 2026-11-15 추가 |
| assets/images/stations/fugel_munich/station_01~14.webp, cross_pack_fugel_munich.js | https://commons.wikimedia.org/wiki/Category:The_14_Stations_of_the_Holy_Cross_(postcard_booklet) | 게프하르트 푸겔 (1904–08) · 사진·스캔 1908년경 그림엽서 스캔(Commons 올린 이의 스캔) | Public domain | 명동대성당 · 엽서 여백을 잘라 내고 크기를 줄임 · 권리 확인: 확인 · 2026-11-15 추가 |
| assets/images/stations/fahnroth/station_01~14.webp, cross_pack_fahnroth.js | https://commons.wikimedia.org/wiki/Category:Joseph_Fahnroth | 요제프 판로트 (1886) · 사진·스캔 미확인(Commons 출처 herz-jesu-neuruppin.de) | Public domain (PD-Art) | 성 밖의 성 바오로 대성전 · 크기를 줄임 · 권리 확인: 확인 · 2026-11-15 추가 |

## 스테인드글라스 참고 사진 (assets/church/glass_*.jpg, 긴 변 768–1024px, 2026-11-12 추가)
실제 유명 창의 사진을 창 하나 단위로 잘라 만든 투과광 질감 20점(합계 약 2.8MB). 보관용 원본은 `assets/church/glass_src/`(번들 제외). 상세 표·표시 문구·디자인 메모는 `docs/church/GLASS_REFERENCES.md`, 파일별 근거는 `docs/church/licenses/<id>.md`.
CC-BY 5점(glass_alabaster_stpaul_1/2, glass_alabaster_slab, glass_rose_notredame_south, glass_lancet_cologne)은 앱 라이선스 화면에 표시 문구가 필요하다.

| 번들 파일 | 원본 | 작가 | 라이선스 | 비고 |
|---|---|---|---|---|
| glass_dove_stpeter.jpg | https://commons.wikimedia.org/wiki/File:Holy_Spirit_stained-glass_window_(Cathedra_Petri).jpg | Wilfredor | CC0 1.0 | 성 베드로 대성전 후진 '성 베드로의 사도좌(Cathedra Petri)' 위 성령 비둘기 창 (베르니니 Gloria, 1666) · 601×768 · 원본 5097×7625 |
| glass_alabaster_stpaul_1.jpg | https://commons.wikimedia.org/wiki/File:Alabaster_window_of_the_Basilica_of_Saint_Paul_Outside_the_Walls_02.jpg | Szilas | CC BY 4.0 | 성 바오로 대성전(San Paolo fuori le Mura) 측랑 알라바스터 창 02 · 454×832 · 원본 3168×4752 |
| glass_alabaster_stpaul_2.jpg | https://commons.wikimedia.org/wiki/File:Alabaster_window_of_the_Basilica_of_Saint_Paul_Outside_the_Walls_04.jpg | Szilas | CC BY 4.0 | 성 바오로 대성전 알라바스터 창 04 · 459×832 · 원본 3168×4752 |
| glass_alabaster_slab.jpg | https://commons.wikimedia.org/wiki/File:Alabaster_window_in_the_Mausoleum_of_Galla_Placidia,_425-50%3B_Ravenna_(2).jpg | Richard Mortel | CC BY 2.0 | 라벤나 갈라 플라치디아 영묘의 알라바스터 창(단일 석판) · 696×1024 · 원본 3504×5380 |
| glass_lancet_milan_1.jpg | https://commons.wikimedia.org/wiki/File:Duomo_Milan_(Vitraux).jpg | Van Der Meulen Christofle | CC0 1.0 | 밀라노 대성당 대형 창의 중앙 4연창 · 376×896 · 원본 3024×4032 |
| glass_panels_milan_2.jpg | https://commons.wikimedia.org/wiki/File:Duomo_Milan_(Vitraux).jpg | Van Der Meulen Christofle | CC0 1.0 | 같은 밀라노 창의 하부 4단(12개 창 × 4장면) · 768×404 · 원본 3024×4032 |
| glass_oculus_florence_donatello.jpg | https://commons.wikimedia.org/wiki/File:Donatello,_incoronazione_della_vergine.jpg | Donatello 밑그림(1434–37) · 스캔/업로드 Sailko | Public domain (PD-Art · PD-old-100-expired) | 피렌체 대성당 쿠폴라 드럼 오큘러스 '성모 대관' (도나텔로 밑그림) · 768×768 · 원본 2409×2391 |
| glass_oculus_florence_ghiberti_1.jpg | https://commons.wikimedia.org/wiki/File:Ghiberti,_assunzione_di_maria.jpg | Lorenzo Ghiberti 밑그림(1404–05, 제작 Niccolò di Piero Tedesco) · 스캔/업로드 Sailko | Public domain (PD-Art · PD-old-100-expired) | 피렌체 대성당 정면 중앙 오큘러스 '성모 승천' · 768×768 · 원본 1249×1231 |
| glass_oculus_florence_ghiberti_2.jpg | https://commons.wikimedia.org/wiki/File:Ghiberti,_ascensione.jpg | Lorenzo Ghiberti 밑그림(1443, 제작 Bernardo di Francesco) · 스캔/업로드 Sailko | Public domain (PD-Art · PD-old-100-expired) | 피렌체 대성당 쿠폴라 드럼 오큘러스 '주님 승천' · 832×832 · 원본 1249×1235 |
| glass_rose_notredame_south.jpg | https://commons.wikimedia.org/wiki/File:Notre-Dame-de-Paris_-_rosace_sud.jpg | Albertus teolog (원본 사진) · Eusebius (파생 편집) | CC BY 3.0 | 파리 노트르담 남쪽 장미창(c.1260) · 768×768 · 원본 2091×2164 |
| glass_rose_notredame_north.jpg | https://commons.wikimedia.org/wiki/File:Pary%C5%BC_notre-dame_rozeta.JPG | Krzysztof Mizera | Public domain (PD-self) | 파리 노트르담 북쪽 장미창(c.1250) · 768×768 · 원본 2619×2145 |
| glass_rose_chartres_north.jpg | https://commons.wikimedia.org/wiki/File:Chartres_-_cath%C3%A9drale_-_rosace_nord.jpg | Eusebius | Public domain (PD-self) | 샤르트르 대성당 북쪽 장미창(c.1235) · 768×768 · 원본 2167×3000 |
| glass_lancet_chartres_1.jpg | https://commons.wikimedia.org/wiki/File:Vitrail_Chartres-050_rectifi%C3%A9.jpg | Micheletb (Michelet-密是力) | Public domain (PD-self; 작품 PD-old-100) | 샤르트르 서쪽 정면 랜싯(baie 50, 1145–55) · 297×832 · 원본 3432×9628 |
| glass_lancet_chartres_belle.jpg | https://commons.wikimedia.org/wiki/File:Chartres_-_cath%C3%A9drale_-_ND_de_la_belle_verri%C3%A8re.JPG | Eusebius | Public domain (PD-self) | 샤르트르 '아름다운 창의 성모(Notre-Dame de la Belle Verrière)' · 325×1024 · 원본 1378×3416 |
| glass_medallion_chartres.jpg | https://commons.wikimedia.org/wiki/File:Vitrail_Chartres_210209_07.jpg | Vassil | Public domain (PD-self) | 샤르트르 창의 원형 메달리온 장면(식탁 장면) 근접 사진 · 768×768 · 원본 2089×2089 |
| glass_lancet_cologne.jpg | https://commons.wikimedia.org/wiki/File:Die_Fenster_im_K%C3%B6lner_Dom_-_7_von_9_-_panoramio.jpg | Edgar El | CC BY 3.0 | 쾰른 대성당 측랑의 19세기 고딕 리바이벌 4연창(큰 인물 + 건축 캐노피 + 문장 패널) · 476×768 · 원본 2091×3449 |
| glass_tracery_cologne.jpg | https://commons.wikimedia.org/wiki/File:Cologne_Cathedral,_Chapel_Stained_Glass.jpg | Stand87 | CC0 1.0 | 쾰른 대성당 경당 창의 트레이서리 · 783×1024 · 원본 3005×4289 |
| glass_grisaille_lancet.jpg | https://commons.wikimedia.org/wiki/File:Grisaille_Panel_MET_DP255161.jpg | The Metropolitan Museum of Art (Open Access) — 작가 미상, 프랑스 c.1265 | CC0 1.0 | 메트로폴리탄 클로이스터스 소장 그리자유 패널(설치 상태) · 185×1024 · 원본 1783×3870 |
| glass_grisaille_knot.jpg | https://commons.wikimedia.org/wiki/File:Geometric_Grisaille_c.1200-1250_-_Stained_Glass_Museum.jpg | The wub | CC0 1.0 | 기하학적 그리자유 매듭무늬 패널(c.1200–1250, 영국 Ely 스테인드글라스 박물관 소장) · 381×1024 · 원본 1265×3163 |
| glass_lancet_gesta.jpg | https://commons.wikimedia.org/wiki/File:Saint-Eutrope,_vitrail_Gesta,_Marsilly,_Charente-Maritime,_august_2015.jpg | Louis-Victor Gesta (창, 19세기) · 사진 Jebulon | CC0 1.0 (사진) / Public domain PD-100 (창) | 프랑스 마르시이(Marsilly) 성당의 성 에우트로피오 창 · 358×960 · 원본 1804×4176 |

## 스테인드글라스 고해상도 마스터 (assets/church/glass_*.webp, 2026-11-12 추가)
「감상용」 방향 전환에 따라 만든 알파 포함 WebP 마스터 46점 × 3단계(마스터 ≤4096 / `_2k` / `_1k`), 합계 약 166MB. 보관 원본은 `assets/church/glass_src/*_orig.jpg`(번들 제외). 상세·복원 내용·한계는 `docs/church/GLASS_CATALOG.md`, 기계용은 `assets/church/glass_catalog.json`, 파일별 근거는 `docs/church/licenses/<id>.md`.
라이선스 구성: CC0 13 · Public domain 19 · CC BY 14 (CC BY 는 표시 문구 필수 — GLASS_CATALOG.md 「출처 표기」).

| 번들 파일 | 원본 | 작가 | 라이선스 | 비고 |
|---|---|---|---|---|
| glass_dove_stpeter.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Holy_Spirit_stained-glass_window_(Cathedra_Petri).jpg | Wilfredor | CC0 1.0 | 성령의 비둘기 창 (글로리아) · 2828×4096 · 원본 5097×7625 (thumb3840) |
| glass_tiffany_hinds.webp (+_2k, _1k) | https://clevelandart.org/art/1966.432 | The Cleveland Museum of Art (Open Access) | CC0 1.0 | 하인즈 저택 창 · 2068×4096 · 원본 6062×12004 (original TIFF downsampled to 9000px re-encoded JPEG q95 4:4:4) |
| glass_panel_crucified.webp (+_2k, _1k) | https://clevelandart.org/art/1948.131 | The Cleveland Museum of Art (Open Access) | CC0 1.0 | 십자가에 못 박히신 그리스도 · 2086×4096 · 원본 3635×6400 (original TIFF re-encoded JPEG q95 4:4:4) |
| glass_panel_catherine_donor.webp (+_2k, _1k) | https://clevelandart.org/art/1921.106 | The Cleveland Museum of Art (Open Access) | CC0 1.0 | 성녀 가타리나와 무릎 꿇은 기증자 · 1300×4096 · 원본 2890×6585 (original TIFF re-encoded JPEG q95 4:4:4) |
| glass_leoben_annunciation.webp (+_2k, _1k) | https://clevelandart.org/art/2024.171.1 | The Cleveland Museum of Art (Open Access) | CC0 1.0 | 주님 탄생 예고 (레오벤) · 2801×4096 · 원본 7475×10930 (original TIFF downsampled to 9000px re-encoded JPEG q95 4:4:4) |
| glass_leoben_magi.webp (+_2k, _1k) | https://clevelandart.org/art/2024.171.2 | The Cleveland Museum of Art (Open Access) | CC0 1.0 | 동방 박사들의 경배 (레오벤) · 2750×4096 · 원본 7398×11020 (original TIFF downsampled to 9000px re-encoded JPEG q95 4:4:4) |
| glass_panel_gethsemane.webp (+_2k, _1k) | https://clevelandart.org/art/1940.340.1 | The Cleveland Museum of Art (Open Access) | CC0 1.0 | 겟세마니 동산의 그리스도 · 3680×4096 · 원본 5394×6003 (original TIFF re-encoded JPEG q95 4:4:4) |
| glass_grisaille_aconite.webp (+_2k, _1k) | https://clevelandart.org/art/1977.89 | The Cleveland Museum of Art (Open Access) | CC0 1.0 | 투구꽃 잎 그리자유 패널 · 1972×4096 · 원본 2407×4012 (original TIFF re-encoded JPEG q95 4:4:4) |
| glass_alabaster_stpaul_1.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Alabaster_window_of_the_Basilica_of_Saint_Paul_Outside_the_Walls_02.jpg | Szilas | CC BY 4.0 | 성 바오로 대성전 알라바스터 창 (1) · 1770×3397 · 원본 3168×4752 (thumb1920) |
| glass_alabaster_stpaul_2.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Alabaster_window_of_the_Basilica_of_Saint_Paul_Outside_the_Walls_04.jpg | Szilas | CC BY 4.0 | 성 바오로 대성전 알라바스터 창 (2) · 1770×3480 · 원본 3168×4752 (thumb1920) |
| glass_alabaster_slab.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Alabaster_window_in_the_Mausoleum_of_Galla_Placidia,_425-50%3B_Ravenna_(2).jpg | Richard Mortel | CC BY 2.0 | 갈라 플라치디아 영묘의 알라바스터 창 · 1344×1897 · 원본 3504×5380 (thumb1920) |
| glass_oculus_florence_donatello.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Donatello,_incoronazione_della_vergine.jpg | Sailko (스캔) · 밑그림 Donatello | Public domain | 성모 대관 오큘러스 · 2859×2859 · 원본 2409×2391 (thumb1920) |
| glass_oculus_florence_ghiberti_1.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Ghiberti,_assunzione_di_maria.jpg | Sailko (스캔) · 밑그림 Lorenzo Ghiberti | Public domain | 성모 승천 오큘러스 · 1447×1447 · 원본 1249×1231 (thumb960) |
| glass_oculus_florence_ghiberti_2.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Ghiberti,_ascensione.jpg | Sailko (스캔) · 밑그림 Lorenzo Ghiberti | Public domain | 주님 승천 오큘러스 · 1440×1440 · 원본 1249×1235 (thumb960) |
| glass_rose_chartres_north.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Chartres_-_cath%C3%A9drale_-_rosace_nord.jpg | Eusebius | Public domain | 샤르트르 북쪽 장미창과 랜싯 · 2091×3252 · 원본 2167×3000 (thumb1920) |
| glass_rose_chartres_west.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Vitrail_Chartres-rosace_143_%2Bnet_%26_corrig%C3%A9e.jpg | Micheletb (Michelet-密是力) | Public domain | 샤르트르 서쪽 장미창 (최후의 심판) · 2793×2793 · 원본 3022×3022 (thumb1920) |
| glass_rose_chartres_south.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Vitrail_Chartres-122.jpg | Micheletb (Michelet-密是力) | Public domain | 샤르트르 남쪽 장미창 · 2141×2141 · 원본 3456×5184 (thumb1920) |
| glass_lancet_chartres_belle.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Chartres_-30a-_ND_de_la_belle_verri%C3%A8re_and_its_angel_border.jpg | Micheletb (Michelet-密是力) | Public domain | 아름다운 창의 성모 (푸른 성모) · 2218×4096 · 원본 4012×7520 (thumb3840) |
| glass_lancet_chartres_jesse.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Vitrail_Chartres-049_rectifi%C3%A9.jpg | Micheletb (Michelet-密是力) | Public domain | 이새의 나무 · 1212×4096 · 원본 2891×9924 (thumb1920) |
| glass_lancet_chartres_samaritan.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Chartres_44_-Corrected.jpg | Micheletb (Michelet-密是力) | Public domain | 착한 사마리아인 창 · 1269×4096 · 원본 3741×12573 (thumb1920) |
| glass_medallion_chartres.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Vitrail_Chartres_210209_07.jpg | Vassil | Public domain | 샤르트르 메달리온 패널 (부분) · 2880×2880 · 원본 2089×2089 (thumb1920) |
| glass_lancet_cologne.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Die_Fenster_im_K%C3%B6lner_Dom_-_7_von_9_-_panoramio.jpg | Edgar El | CC BY 3.0 | 쾰른 대성당 측랑 창 · 2500×4096 · 원본 2091×3449 (thumb1920) |
| glass_lancet_gesta.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Saint-Eutrope,_vitrail_Gesta,_Marsilly,_Charente-Maritime,_august_2015.jpg | Jebulon (사진) · 창: Louis-Victor Gesta | Public domain | 성 에우트로피오 창 (제스타 공방) · 939×3803 · 원본 1804×4176 (thumb1280) |
| glass_grisaille_knot.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Geometric_Grisaille_c.1200-1250_-_Stained_Glass_Museum.jpg | The wub | CC0 1.0 | 기하학 그리자유 패널 · 1283×3229 · 원본 1265×3163 (thumb960) |
| glass_rose_saintechapelle.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Sainte-Chapelle,_Paris,_upper_chapel_rose.jpg | Gerda Arendt | CC0 1.0 | 생트샤펠 서쪽 장미창 (묵시록) · 2274×2274 · 원본 4000×3000 (thumb3840) |
| glass_rose_york.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:York_Minster_Rose_window_S16_(15563016153).jpg | Jules & Jenny | CC BY 2.0 | 요크 민스터 장미창 · 2859×2859 · 원본 2472×2232 (thumb1920) |
| glass_canterbury_n3.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Canterbury_Cathedral,_window_n.III_(36940593903).jpg | Jules & Jenny | CC BY 2.0 | 캔터베리 대성당 트리니티 경당 창 n.III · 1350×4096 · 원본 1486×4182 (thumb1280) |
| glass_beverley_west.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Beverley_Minster,_West_window_(23725072089).jpg | Jules & Jenny | CC BY 2.0 | 베벌리 민스터 서쪽 대창 · 2257×4096 · 원본 4447×7709 (thumb3840) |
| glass_strasbourg_rose.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Rosace_cathedrale_strasbourg.jpg | Clostridium | Public domain | 스트라스부르 대성당 서쪽 장미창 · 1777×1777 · 원본 1770×1770 (thumb1280) |
| glass_augsburg_daniel.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:2019-01-27_Augsburg_082_Augsburger_Dom,_Prophetenfenster_Daniel_(47101327862).jpg | Allie_Caulfield | CC BY 2.0 | 아우크스부르크 예언자 창 — 다니엘 · 1052×3077 · 원본 3430×5327 (thumb1920) |
| glass_augsburg_hosea.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:2019-01-27_Augsburg_081_Augsburger_Dom,_Prophetenfenster_Hosea_(47101330312).jpg | Allie_Caulfield | CC BY 2.0 | 아우크스부르크 예언자 창 — 호세아 · 1097×3344 · 원본 3109×4895 (thumb1920) |
| glass_tiffany_angel_resurrection.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Louis_Comfort_Tiffany_-_Angel_of_the_Resurrection_-_Google_Art_Project.jpg | Google Art Project / 소장 미술관 촬영 (작품: Louis Comfort Tiffany) | Public domain | 부활의 천사 · 2433×4096 · 원본 3774×5849 (thumb1920) |
| glass_tiffany_crown_glory.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Louis_Comfort_Tiffany_-_The_Righteous_Shall_Receive_A_Crown_of_Glory,_1901.jpg | Google Art Project / 소장 미술관 촬영 (작품: Louis Comfort Tiffany) | Public domain | 의인은 영광의 화관을 받으리라 · 2436×4096 · 원본 3744×5967 (thumb1920) |
| glass_tiffany_parakeets.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Louis_Comfort_Tiffany_-_Parakeets_and_Gold_Fish_Bowl,_1893.jpg | Google Art Project / 소장 미술관 촬영 (작품: Louis Comfort Tiffany) | Public domain | 잉꼬와 금붕어 어항 · 2142×4096 · 원본 3418×6600 (thumb1920) |
| glass_tiffany_wooded_landscape.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Louis_Comfort_Tiffany_-_A_Wooded_Landscape_in_Three_Panels_-_Google_Art_Project.jpg | Google Art Project / 소장 미술관 촬영 (작품: Louis Comfort Tiffany) | Public domain | 세 폭의 숲 풍경 · 4096×2634 · 원본 8169×5255 (thumb3840) |
| glass_lancet_chartres_passion.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Vitrail_Chartres-051_rectifi%C3%A9.JPG | Micheletb (Michelet-密是力) | Public domain | 수난과 부활 창 · 1145×4096 · 원본 2734×10049 (thumb1920) |
| glass_fivesisters_york.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:York_Minster_window_n16_%22The_Five_sisters%22_(16157008236).jpg | Jules & Jenny | CC BY 2.0 | 다섯 자매 창 · 2881×3729 · 원본 2716×3516 (thumb1920) |
| glass_wyspianski_god_father.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:016Krak%C3%B3wFranciszka%C5%84ski.JPG | Rj1979 | Public domain | 하느님 아버지 — 「있으라!」 · 1145×2211 · 원본 1704×2272 (thumb1280) |
| glass_milan_apse_lower.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Duomo_Milan_(Vitraux).jpg | Van Der Meulen Christofle | CC0 1.0 | 밀라노 대성당 대형 창 (하부 부분) · 2634×1505 · 원본 3024×4032 (thumb1920) |
| glass_rose_notredame_south.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Notre-Dame-de-Paris_-_rosace_sud.jpg | Albertus teolog (derivative work: Eusebius) | CC BY 3.0 | 파리 노트르담 남쪽 장미창 · 2640×2640 · 원본 2091×2164 (thumb1920) |
| glass_canterbury_n14.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Canterbury_Cathedral_window_n.XIV_(23778480668).jpg | Jules & Jenny | CC BY 2.0 | 캔터베리 예형론 창 (n.XIV) · 2021×4096 · 원본 2539×4828 (thumb1920) |
| glass_siena_duccio_oculus.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Siena_Museo_dell%27Opera_del_Duomo_Rosone.jpg | Zairon | CC0 1.0 | 시에나 대성당 오큘러스 (두초) · 3957×3957 · 원본 4760×3788 (thumb3840) |
| glass_lincoln_deans_eye.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Lincoln_Cathedral,_Deans_eye_window_(High_resolution)_(38822141462).jpg | Jules & Jenny | CC BY 2.0 | 링컨 대성당 「주임 사제의 눈」 장미창 · 4096×4096 · 원본 6718×5926 (thumb3840) |
| glass_burnejones_stgermans.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:St_Germans_Priory_east_window_by_Edward_Burne_Jones.jpg | Ojwelch | CC0 1.0 | 세인트 저먼스 동쪽 창 (번존스·모리스 상회) · 1548×2592 · 원본 1920×2880 (thumb1280) |
| glass_lancet_chartres_incarnation.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:Chartres_50_-rectifi%C3%A9.JPG | Micheletb (Michelet-密是力) | Public domain | 그리스도의 생애 (강생) 창 · 1421×4096 · 원본 4434×12787 (thumb3840) |
| glass_rose_notredame_north.webp (+_2k, _1k) | https://commons.wikimedia.org/wiki/File:North_rose_window_of_Notre-Dame_de_Paris,_Dec._2024_(1).jpg | Ibex73 | CC BY 4.0 | 파리 노트르담 북쪽 장미창 (2024년 재개관 뒤) · 3510×3510 · 원본 5368×3579 (thumb3840) |

## 성당 안 진본 성화 (assets/church/art_<성당>.js, 2026-11-15 추가)

| 파일 | 출처 URL | 작가 · 사진 | 라이선스 | 쓰는 곳 · 변경 |
|---|---|---|---|---|
| assets/church/art_maggiore.js (원본 art/images_src/maggiore/salus_populi_romani.webp, 49KB) | https://commons.wikimedia.org/wiki/File:Salus_Populi_Romani_after_restoration.jpg | 〈로마 백성의 구원(Salus Populi Romani)〉 작가 미상, 7~13세기 · 사진 LossRom(Commons) | 원작 Public domain · 사진 CC0 1.0 (PD-Art) | 성 마리아 마조레 대성전 파올리나 경당 제단 · 여백을 잘라 내고 크기를 줄임 · 상세 `licenses/maggiore.md` · 권리 확인: 확인(Commons 표기 기준) |
| assets/church/art_florence.js — 톨렌티노(원본 art/images_src/florence/tolentino.webp, 760×1208, 185KB) | https://commons.wikimedia.org/wiki/File:Andrea_del_castagno,_Monumento_equestre_di_Niccol%C3%B2_da_Tolentino,_1456,_01.JPG | 안드레아 델 카스타뇨 〈니콜로 다 톨렌티노 기마 기념상〉 1456 · 사진 Sailko | 원작 Public domain · 사진 **CC BY 3.0**(저작자 표시: Sailko) | 피렌체 대성당 북 측랑 2칸 · **변경: 원근 보정(틀 네 귀)·자르기·밝기 +6%·축소** · 상세 `licenses/florence.md` |
| assets/church/art_florence.js — 호크우드(원본 art/images_src/florence/hawkwood.webp, 760×1208, 188KB) | https://commons.wikimedia.org/wiki/File:Paolo_uccello,_Monumento_equestre_di_John_Hawkwood,_1436,_01-edit.jpg | 파올로 우첼로 〈존 호크우드 기마 기념상〉 1436 · 사진 Sailko, 편집 MenkinAlRire | 원작 Public domain · 사진 **CC BY 3.0**(저작자 표시: Sailko) | 피렌체 대성당 북 측랑 3칸 · **변경: 자르기·축소** · 상세 `licenses/florence.md` |
| assets/church/art_florence.js — 단테(원본 art/images_src/florence/dante.webp, 1024×824, 189KB) | https://commons.wikimedia.org/wiki/File:Dante_Domenico_di_Michelino.jpg | 도메니코 디 미켈리노 〈단테와 신곡〉 1465 · 촬영자 미상(MuseoFirenze) | 원작 Public domain · 사진 **PD-Art** | 피렌체 대성당 북 측랑 4칸 · 변경: 회색 틀 안쪽만 자르기·축소 · 상세 `licenses/florence.md` |
| assets/church/art_stpaul.js — 후진 모자이크(원본 art/images_src/stpaul/apse_mosaic.webp, 1344×672, 229KB) | https://commons.wikimedia.org/wiki/File:Apse_mosaic_Basilica_of_St_Paul_Outside_the_Walls.jpg | 후진 모자이크(13세기, 19세기 복원) · 사진 Alberto Fernandez Fernandez, 색 보정 Amandajm | 원작 Public domain · 사진 **CC BY 2.5**(저작자 표시: Alberto Fernandez Fernandez) | 성 밖 성 바오로 후진 반돔 · **변경: 반돔 곡면에 맞게 원근 재투영·사진 밖 금 바탕 채움·아래 귀퉁이 좌우 대칭 이음·축소** · 상세 `licenses/stpaul.md` |
| assets/church/art_stpaul.js — 무덤 창살 벽·유리 바닥(원본 art/images_src/stpaul/tomb_front.webp 1024×464 107KB · tomb_floor.webp 640×368 68KB) | https://commons.wikimedia.org/wiki/File:St._Paul%27s_Tomb.jpg | 사도 바오로의 무덤 · 사진 StPaul.jpg(Commons 사용자) | **CC BY 4.0**(저작자 표시: StPaul.jpg) | 성 밖 성 바오로 콘페시오 제대 쪽 벽·바닥 · **변경: 두 부분으로 자르기·바닥 원근 보정·축소** · 상세 `licenses/stpaul.md` |
| assets/church/art_stpeter.js — 피에타(원본 art/images_src/stpeter/pieta.webp, 1024×883, 65KB) | https://commons.wikimedia.org/wiki/File:Michelangelo%27s_Pieta,_St._Peter%27s_Basilica,_Vatican_City_(48466681337).jpg | 미켈란젤로 〈피에타〉 1498–99 · 사진 Gary Todd | 원작 Public domain · 사진 **Public Domain Mark 1.0** | 성 베드로 오른쪽 첫 경당 벽감(방탄유리 뒤) · 변경: 자르기·가장자리 어둡게·밝기 +8%·축소 · 상세 `licenses/stpeter.md` |
| assets/church/art_stpeter.js — 성 베드로 청동 좌상(원본 art/images_src/stpeter/peter_bronze.webp, 704×1043, 156KB) | https://commons.wikimedia.org/wiki/File:St._Peter%27s_Basilica,_Bronze_Statue_of_St._Peter_(48466478846).jpg | 성 베드로 청동 좌상(13세기, 아르놀포 디 캄비오 추정) · 사진 Gary Todd | 원작 Public domain · 사진 **Public Domain Mark 1.0** | 성 베드로 신랑 오른쪽 마지막 피어 앞 · 변경: 자르기·축소 · 상세 `licenses/stpeter.md` |

### 커먼즈 사진 15장 적용 메모(C-15, 2026-11-15)

- 받은 사진(`art/commons_handoff/received/`, 긴 변 2000px 이하 사본)은 저장소에 올리지 않는다(.gitignore). 원본은 사용자 PC 보관. 배포용 판은 `tools/commons_art/make_commons_art.py` → `art/images_src/<성당>/*.webp` → `tools/church_web/build_art_florence.mjs`·`build_art_commons.mjs`.
- **형태 참고만 하고 싣지 않은 사진**: 라테라노 고딕 치보리오 2장(`Ciborium in the Basilica di San Giovanni in Laterano 2013.jpg`, Szilas, Public domain · `High Altar and Ciborium, Basilica San Giovanni in Laterano (45603136844).jpg`, Sonse, CC BY 2.0) — `ch_lateran.js` 치보리오의 층 구성·색을 고치는 데 보기만 했다(사진·파생 이미지는 앱에 없다). 쓰지 않은 대안: 01_B·05_A·08_A·09_B·10_A.
- **넣지 않은 사진**: 07 `Chapel of the Madonna dell'Albero, Milan Cathedral.jpg`(Julian Lupyan, CC0) — 파일 이름과 달리 사진 내용은 주교관·목장을 든 주교 조각상과 'EGO SVM PASTOR BONVS' 글귀의 제대(밀라노 남 익랑 끝 **성 요한 보노 제대**로 보인다). 커먼즈 파일 설명은 429 로 확인하지 못했다. 나무의 성모 자리에는 넣지 않았고, 성 요한 보노 경당에도 확인 전에는 넣지 않는다. 02 기둥의 성모는 사진이 없어 대체하지 않았다.
- **권리 주의(비상업 전제)**: 로사리움은 광고·유료·후원이 없는 완전 비상업 앱이라는 결정(`docs/BACKLOG.md`)을 전제로 쓴다. ① **Public Domain Mark(PDM)** 는 촬영자가 붙인 '알려진 저작권 없음' 표시일 뿐 CC0 같은 권리 포기 문서가 아니어서 나라에 따라 효력이 다를 수 있다(피에타·청동상: '사진: Gary Todd, Public Domain Mark' 로 표기). ② **PD-Art**(평면 미술품의 충실한 복제 사진에는 새 저작권이 없다는 커먼즈 방침)는 일부 나라에서 인정되지 않을 수 있다(단테). ③ **이탈리아 문화유산법**(Codice dei beni culturali 107–108조): 이탈리아 국가·교회 소장 문화재의 복제물을 영리로 쓰려면 허가·수수료가 필요할 수 있다 — 피렌체·밀라노·로마(성 바오로·라테라노)의 작품이 해당하고, 바티칸(성 베드로)은 따로 바티칸 시국의 규정이 있다. **유료화·광고·후원을 넣게 되면 이 절의 사진 전부를 다시 검토한다.**

## AI 생성 성모상 그림 (art/statues/*.png → assets/church/art_statue_<키>.js, 2026-11-15 추가)

사용자가 ChatGPT 로 만들어 올린 투명 배경 PNG 3장(887×1774). 실제 조각 작품의 사진이 아니며, 특정 작가의 작품을 본뜨지 않은 일반적인 성모상 그림이다.
`tools/church_web/build_art_statues.mjs` 가 512×1024 webp(알파 포함, 80KB 이하)로 줄인 것을 data URI 묶음으로 만들고, `shrine.js` 가 그 성당에 들어올 때만 읽어 굽은 판(호 80°, alphaTest)에 입힌다.

| 키 | 원본 | 내용 | 쓰는 성당 |
|---|---|---|---|
| `plain_white` | `art/statues/mary_plain_white.png` | 흰 돌 성모(소박한 형태) | 당고개(입구 홀 오른쪽 연못 앞) |
| `immaculate_blue` | `art/statues/mary_immaculate_blue.png` | 푸른 망토·열두 별 관의 원죄 없으신 성모 | 우리 본당, 라테라노, 성 바오로, 밀라노, 피렌체 |
| `hanbok_rosary` | `art/statues/mary_hanbok_rosary.png` | 한복 차림에 묵주를 든 성모 | 명동 |

- 출처 표기: 앱 '성화 출처' 화면 → '성당 안 성화' → 'AI 생성 성모상(ChatGPT, 사용자 제공)'.
- 권리: ChatGPT 생성 이미지. 앱은 완전 비상업(BACKLOG '결정(2026-11-15)'). 유료화·광고·후원을 도입하면 ChatGPT 생성 이미지 약관을 이 3장까지 포함해 다시 확인한다.
- 성 베드로('기둥의 성모' 성화)·마조레('로마 백성의 구원' 성화)는 이 그림을 쓰지 않는다.

## 성모상 3D — Meshy AI (2026-11-16 추가)

`assets/church/statue3d_mary_meshy.js`(≈ 400KB). 사용자가 직접 만든 성모상 그림(GPT/Gemini, `art/statues/marble_views/`)을 Meshy AI 무료 플랜으로 3D 변환한 형태만 쓴다(739,044 삼각형, 위치+법선뿐 — 색·질감 없음).

- 라이선스: **CC BY 4.0**, 저작자표시 "Meshy AI". 앱 '성화 출처' 화면에 "성모상 3D: Meshy AI로 생성(CC BY 4.0), 원 그림 사용자 제작" 표기. 자세히: `licenses/MESHY_STATUE.md`.
- 변경: 삼각형 약 36,000(근거리)/8,000(원거리)로 줄임 + 양자화·meshopt 압축 + 흰 대리석 재질(`shrine.js`).
- 쓰는 성당: 우리 본당·라테라노·성 바오로·밀라노·피렌체·당고개·성 베드로(제대 위). 명동은 한복 그림 성상, 마조레는 성화 사진 그대로. 위 'AI 생성 성모상 그림' 중 푸른 망토·흰 돌 2장은 3D 를 못 읽을 때의 예비로만 남는다.
- 원본 glb(16.9MB, `art/statues/meshy/marian_serenity_meshy_orig.glb`)는 `.gitignore` — 저장소에는 올리지 않는다.

## 성상 3D 스캔 — SMK · Virtual Museums of Małopolska · noe-3d.at (2026-11-16 추가, T-80)

`assets/church/scan3d_<키>.js` 5개(합계 ≈ 1.3MB, deflate ≈ 0.87MB — T-80 2차에서 얼굴이 살도록 삼각형을 늘림) + 불러오기 `scan3d.js`. 실물 조각의 3D 스캔을 줄이고(meshopt) 재질을 바꿔(흰 대리석 / 정점 색) 쓴다. 자세히: `licenses/STATUE_SCANS.md`, 근거: `docs/church/STATUE_SOURCES.md`.

| 키 | 쓰는 곳 | 만든이 | 라이선스 | 원본 |
|---|---|---|---|---|
| `pieta` | 성 베드로 피에타 경당(실물의 주형 — '피에타(미켈란젤로)') | SMK – Statens Museum for Kunst | Public Domain Mark 1.0 | https://open.smk.dk/artwork/image/KAS115 |
| `crucifix` | 우리 본당·피렌체·명동·성 바오로 십자가 경당의 십자고상(대용) | Virtual Museums of Małopolska (Museum of the Biecz Land) | CC0 1.0 | https://sketchfab.com/3d-models/crucified-christ-from-st-jadwigas-hospital-d2404e52b2d144e18f0621903c98c06a |
| `st_peter` | 라테라노 벽감·성 바오로 계단의 성 베드로 상(대용) | Virtual Museums of Małopolska (Museum of the Benedictine Abbey in Tyniec) | CC0 1.0 | https://sketchfab.com/3d-models/saint-peter-9e6b4da152f64fa1b4b0613a57318751 |
| `st_paul` | 라테라노 벽감·성 바오로 계단의 성 바오로 상(대용) | Virtual Museums of Małopolska (Museum of the Benedictine Abbey in Tyniec) | CC0 1.0 | https://sketchfab.com/3d-models/saint-paul-the-apostle-2195c3c0b9a140628e938ddb146d00ca |
| `angel` | 명동 주제대 양옆 천사상 2(대용) | noe-3d.at | CC BY 4.0 | https://sketchfab.com/3d-models/engel-668dcbf72a7243e491f540a6a575213b |

- 변경: 축소·재질 변경(삼각형 수 줄임, 양자화·압축, 질감 대신 흰 대리석 재질 또는 정점 색). 앱 '성화 · 음악 출처' → '성당 안 성상(3D 스캔)'에 제목·만든이·원본 주소·라이선스·변경을 적는다.
- 조각 자체: 모두 작가 사후 70년이 지난 15~18세기 작품(피에타 1498–99). 대용은 실제 작품 이름을 붙이지 않는다.
- 스캔을 못 읽으면 예전 그림(피에타 사진 판 — 위 '성당 안 진본 성화')이나 절차 생성 상이 그 자리에 선다.

## 당고개 순교성지(`danggogae`) — 새 자산 없음(2026-11-15)

- **번들에 더한 사진·그림·질감 파일: 없음.** 성당의 모든 표면(황토 미장·쪼갠 돌·마루 2종·불 켜진 한지·옹기 조각 벽·분홍 화강암·신자석 나무)은
  `assets/church/ch_danggogae.js` 가 실행할 때 캔버스로 **절차 생성**한다(자체 코드, 외부 원본 없음). 생성한 그림은 `window.ChurchTexPack` 에
  `tex_dg_*.jpg` 이름으로 넣어 사진 질감과 같은 경로로 쓴다.
- 성지에 있는 성화·한지 유리화·14처·조각(생존 작가 작품)은 사진·모사·화풍 흉내 어느 것도 싣지 않았다(`docs/church/interiors/danggogae.md` §4).
- 14처 판은 이미 번들된 티에폴로 동판화 연작(CC0, 위 '십자가의 길 그림 연작')을 배정했다 — 새 파일 없음.
- 썸네일 `assets/church_thumbs/danggogae.webp`, 입구 그림 `assets/images/church_entry/render_danggogae.webp` 는 우리 3D 장면을 찍은 것이다.
- 나중에 사용자가 ChatGPT 로 만든 전용 질감(D-01~D-07)을 올리면 `assets/church/tex_dg_*.jpg` + `tex_pack_danggogae.js` 로 넣고,
  그때 `docs/church/licenses/danggogae.md` 에 '사용자가 ChatGPT 로 생성, 날짜, 프롬프트 번호'를 적는다.

## 묵주·구슬 그림 24장(`assets/images/{bead,crystal,fatima,jade,jp2,knot,lourdes,pastel,pearl,penal,rosary,rosewood,stuart}.webp`, `rosary_*.webp`) — 출처 미확인 — 출시 전 교체 필요 (2026-11-16)

- 우리 도구가 만든 것이 아니다(생성 스크립트 없음). 2026-10-30 초기 커밋(`3b400b6`, `8a0a9ba`)에 출처 기록 없이 들어왔고, 이미지 생성 AI 풍으로 보이나 도구·작성자·참고 이미지 여부를 확인할 수 없다.
- 조사 결과·사용자 확인 항목·교체 경로(3D 렌더 프로토타입 `tools/rosary3d/render_stills.mjs`): `docs/legal/ROSARY_IMAGES_PROVENANCE.md`.
