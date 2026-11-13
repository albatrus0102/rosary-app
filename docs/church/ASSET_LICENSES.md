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
