# 스테인드글라스 참고 자료 (GLASS_REFERENCES)

3D 성당의 스테인드글라스를 "납작한 색 블록"이 아니라 실제 창처럼 보이게 하기 위한 **실제 유명 창 사진 20점**과 구현 지침.
조사·수집일 2026-11-12. 모든 사진은 Wikimedia Commons 파일 페이지에서 라이선스를 확인했다(API `extmetadata.LicenseShortName` + 파일 페이지 wikitext 의 라이선스 틀). 허용: CC0 / Public domain / CC-BY 만. CC-BY-SA·NC 는 제외했다.

- 가공본(질감용): `assets/church/glass_<id>.jpg` — 창 하나로 크롭(필요 시 4점 투시 보정), 긴 변 768–1024px, JPEG q72–82, 파일당 92–183KB, **합계 약 2.83MB**.
- 원본 보관: `assets/church/glass_src/<이름>.jpg` — Commons 썸네일(폭 ≤1920px)을 긴 변 2048px 이하로 저장(약 14MB). `pubspec.yaml` 의 `assets/church/` 는 하위 폴더를 포함하지 않으므로 앱 번들에는 들어가지 않는다. 저장소 용량이 부담되면 이 폴더는 지워도 된다(출처 URL 로 재취득 가능).
- 미리보기 시트: 256px 콘택트 시트로 전부 눈으로 확인함 — 워터마크·글자 오버레이·사람·비계 없음.
- 파일별 근거: `docs/church/licenses/<id>.md`, 요약 행: `docs/church/ASSET_LICENSES.md`.
- 통합 시 주의: `glass_*.jpg` 는 `assets/church/` 바로 아래라서 **현재 pubspec 설정으로는 자동으로 번들된다(+2.8MB)**. file:// WebView 에서는 `tex_pack.js` 처럼 data URI 로 넣어야 WebGL 질감으로 쓸 수 있다(기존 ASSET_LICENSES 설명 참조).

## 1. 참고 사진 표

`어울리는 성당` 값: stpeter, lateran, maggiore, stpaul, milan, florence, myeongdong, basic.

| id | 대상 → 어울리는 성당 | 창 모양 | 라이선스 | 작가 | 출처 URL | 저작자 표시 문구 | 파일 | 시각 메모(주색 · 납선 밀도 · 인물) |
|---|---|---|---|---|---|---|---|---|
| `dove_stpeter` | 성 베드로 대성전 후진 '성 베드로의 사도좌(Cathedra Petri)' 위 성령 비둘기 창 (베르니니 Gloria, 1666) → **stpeter** | oval(타원 오큘러스) | CC0 1.0 | Wilfredor | https://commons.wikimedia.org/wiki/File:Holy_Spirit_stained-glass_window_(Cathedra_Petri).jpg | (표시 의무 없음) Wilfredor, CC0, via Wikimedia Commons | `assets/church/glass_dove_stpeter.jpg` (601×768, 135KB) · 원본 `glass_src/dove_stpeter.jpg` | 호박색·금색·갈색 방사형 12분할, 중심은 거의 흰색의 비둘기. 납선 굵고 방사+동심원. 인물 없음(비둘기). 모서리에 금동 천사 조각이 조금 남음 → 타원 마스크 권장 |
| `alabaster_stpaul_1` | 성 바오로 대성전(San Paolo fuori le Mura) 측랑 알라바스터 창 02 → **stpaul, lateran, maggiore** | arched rectangular(반원 아치 창) | CC BY 4.0 | Szilas | https://commons.wikimedia.org/wiki/File:Alabaster_window_of_the_Basilica_of_Saint_Paul_Outside_the_Walls_02.jpg | Szilas, CC BY 4.0 <https://creativecommons.org/licenses/by/4.0>, via Wikimedia Commons | `assets/church/glass_alabaster_stpaul_1.jpg` (454×832, 136KB) · 원본 `glass_src/alabaster_stpaul_1.jpg` | 크림·꿀색·갈색의 대칭(북매치) 물결 줄무늬. 굵은 철/석재 틀(창 폭의 3–4%). 인물 없음 |
| `alabaster_stpaul_2` | 성 바오로 대성전 알라바스터 창 04 → **stpaul, lateran, maggiore** | arched rectangular | CC BY 4.0 | Szilas | https://commons.wikimedia.org/wiki/File:Alabaster_window_of_the_Basilica_of_Saint_Paul_Outside_the_Walls_04.jpg | Szilas, CC BY 4.0 <https://creativecommons.org/licenses/by/4.0>, via Wikimedia Commons | `assets/church/glass_alabaster_stpaul_2.jpg` (459×832, 136KB) · 원본 `glass_src/alabaster_stpaul_2.jpg` | 세로 줄무늬가 촘촘한 알라바스터, 흰색~황토색. 틀 분할이 더 잘게 나뉨. 인물 없음 |
| `alabaster_slab` | 라벤나 갈라 플라치디아 영묘의 알라바스터 창(단일 석판) — 로마 대성전들의 금빛 알라바스터 느낌용 대체 자료 → **stpaul, lateran, maggiore, stpeter(타일용)** | rectangular(단일 판) | CC BY 2.0 | Richard Mortel | https://commons.wikimedia.org/wiki/File:Alabaster_window_in_the_Mausoleum_of_Galla_Placidia,_425-50%3B_Ravenna_(2).jpg | Richard Mortel, CC BY 2.0 <https://creativecommons.org/licenses/by/2.0>, via Wikimedia Commons | `assets/church/glass_alabaster_slab.jpg` (696×1024, 119KB) · 원본 `glass_src/alabaster_slab.jpg` | 꿀색·호박색·주황 띠, 납선·틀 없음(순수 석판 투과광). 인물 없음. 절차적 알라바스터의 색 기준으로 적합 |
| `lancet_milan_1` | 밀라노 대성당 대형 창의 중앙 4연창 — 성경 장면이 9단으로 쌓인 구성 → **milan** | lancet group(4연창 세로띠, 직사각) | CC0 1.0 | Van Der Meulen Christofle | https://commons.wikimedia.org/wiki/File:Duomo_Milan_(Vitraux).jpg | (표시 의무 없음) Van Der Meulen Christofle, CC0, via Wikimedia Commons | `assets/church/glass_lancet_milan_1.jpg` (376×896, 137KB) · 원본 `glass_src/milan_window.jpg` | 빨강·파랑·노랑·보라의 고채도 장면 패널, 돌 멀리언이 굵고 어두움. 인물 많음(장면당 2–5명). 패널 아래 작은 라틴어 명문 띠 |
| `panels_milan_2` | 같은 밀라노 창의 하부 4단(12개 창 × 4장면) → **milan** | rectangular(가로 패널 띠, 12연창×4단) | CC0 1.0 | Van Der Meulen Christofle | https://commons.wikimedia.org/wiki/File:Duomo_Milan_(Vitraux).jpg | (표시 의무 없음) Van Der Meulen Christofle, CC0, via Wikimedia Commons | `assets/church/glass_panels_milan_2.jpg` (768×404, 128KB) · 원본 `glass_src/milan_window.jpg` | 르네상스~19세기풍 회화적 장면, 흰 구름·살색 면적이 커서 밝음. 인물 많음. 세로 멀리언이 규칙적 |
| `oculus_florence_donatello` | 피렌체 대성당 쿠폴라 드럼 오큘러스 '성모 대관' (도나텔로 밑그림) → **florence** | oculus(원형) | Public domain (PD-Art · PD-old-100-expired) | Donatello 밑그림(1434–37) · 스캔/업로드 Sailko | https://commons.wikimedia.org/wiki/File:Donatello,_incoronazione_della_vergine.jpg | (표시 의무 없음) Donatello, Public domain, via Wikimedia Commons | `assets/church/glass_oculus_florence_donatello.jpg` (768×768, 139KB) · 원본 `glass_src/oculus_florence_donatello.jpg` | 진한 빨강·흰색·녹색·파랑. 큰 인물 2명, 유리 조각이 크고 납선이 불규칙(균열 수리선 많음). 수평 철제 보강대 뚜렷 |
| `oculus_florence_ghiberti_1` | 피렌체 대성당 정면 중앙 오큘러스 '성모 승천' → **florence** | oculus(원형) | Public domain (PD-Art · PD-old-100-expired) | Lorenzo Ghiberti 밑그림(1404–05, 제작 Niccolò di Piero Tedesco) · 스캔/업로드 Sailko | https://commons.wikimedia.org/wiki/File:Ghiberti,_assunzione_di_maria.jpg | (표시 의무 없음) Lorenzo Ghiberti, Public domain, via Wikimedia Commons | `assets/church/glass_oculus_florence_ghiberti_1.jpg` (768×768, 140KB) · 원본 `glass_src/oculus_florence_ghiberti_1.jpg` | 금색 광배 중심, 빨강·파랑 배경, 테두리에 메달리온 띠. 인물 많음(천사 무리). 십자형 철제 보강대 |
| `oculus_florence_ghiberti_2` | 피렌체 대성당 쿠폴라 드럼 오큘러스 '주님 승천' → **florence** | oculus(원형) | Public domain (PD-Art · PD-old-100-expired) | Lorenzo Ghiberti 밑그림(1443, 제작 Bernardo di Francesco) · 스캔/업로드 Sailko | https://commons.wikimedia.org/wiki/File:Ghiberti,_ascensione.jpg | (표시 의무 없음) Lorenzo Ghiberti, Public domain, via Wikimedia Commons | `assets/church/glass_oculus_florence_ghiberti_2.jpg` (832×832, 136KB) · 원본 `glass_src/oculus_florence_ghiberti_2.jpg` | 녹색·노랑 꽃무늬 테두리가 넓고, 가운데 파랑 하늘에 흰 옷의 그리스도. 인물 있음. 격자 보강대 |
| `rose_notredame_south` | 파리 노트르담 남쪽 장미창(c.1260) → **basic, myeongdong, milan(장미창 대체)** | rose(장미창) | CC BY 3.0 | Albertus teolog (원본 사진) · Eusebius (파생 편집) | https://commons.wikimedia.org/wiki/File:Notre-Dame-de-Paris_-_rosace_sud.jpg | Albertus teolog (derivative work: Eusebius), CC BY 3.0 <https://creativecommons.org/licenses/by/3.0>, via Wikimedia Commons | `assets/church/glass_rose_notredame_south.jpg` (768×768, 164KB) · 원본 `glass_src/rose_notredame_south.jpg` | 보라·파랑·빨강, 밝은 메달리온. 12→24분할 방사 + 바깥 삼엽/사엽. 돌 트레이서리는 완전히 검정. 작은 인물 메달리온 다수 |
| `rose_notredame_north` | 파리 노트르담 북쪽 장미창(c.1250) → **basic, myeongdong** | rose(장미창) | Public domain (PD-self) | Krzysztof Mizera | https://commons.wikimedia.org/wiki/File:Pary%C5%BC_notre-dame_rozeta.JPG | (표시 의무 없음) Krzysztof Mizera, Public domain, via Wikimedia Commons | `assets/church/glass_rose_notredame_north.jpg` (768×768, 183KB) · 원본 `glass_src/rose_notredame_north.jpg` | 파랑·보라 지배, 16→32분할의 가는 살. 메달리온 인물. 납선 매우 촘촘 |
| `rose_chartres_north` | 샤르트르 대성당 북쪽 장미창(c.1235) → **basic, myeongdong** | rose(장미창) | Public domain (PD-self) | Eusebius | https://commons.wikimedia.org/wiki/File:Chartres_-_cath%C3%A9drale_-_rosace_nord.jpg | (표시 의무 없음) Eusebius, Public domain, via Wikimedia Commons | `assets/church/glass_rose_chartres_north.jpg` (768×768, 163KB) · 원본 `glass_src/rose_chartres_north.jpg` | 샤르트르 블루+루비 레드, 마름모(정사각 회전) 패널 12개와 원형 메달리온. 검은 판형 트레이서리 면적이 큼 |
| `lancet_chartres_1` | 샤르트르 서쪽 정면 랜싯(baie 50, 1145–55) — 정사각 장면 패널이 3열로 쌓임 → **basic, myeongdong, milan(대체)** | lancet(반원 머리) | Public domain (PD-self; 작품 PD-old-100) | Micheletb (Michelet-密是力) | https://commons.wikimedia.org/wiki/File:Vitrail_Chartres-050_rectifi%C3%A9.jpg | (표시 의무 없음) Micheletb, Public domain, via Wikimedia Commons | `assets/church/glass_lancet_chartres_1.jpg` (297×832, 124KB) · 원본 `glass_src/lancet_chartres_1.jpg` | 파랑 바탕에 빨강·녹색·노랑. 장면 패널 3×8 격자, 철제 격자 보강대. 작은 인물 다수 |
| `lancet_chartres_belle` | 샤르트르 '아름다운 창의 성모(Notre-Dame de la Belle Verrière)' → **basic, myeongdong** | lancet(반원 머리) | Public domain (PD-self) | Eusebius | https://commons.wikimedia.org/wiki/File:Chartres_-_cath%C3%A9drale_-_ND_de_la_belle_verri%C3%A8re.JPG | (표시 의무 없음) Eusebius, Public domain, via Wikimedia Commons | `assets/church/glass_lancet_chartres_belle.jpg` (325×1024, 141KB) · 원본 `glass_src/lancet_chartres_belle.jpg` | 깊은 파랑·보라 지배, 가운데 큰 성모자상(밝은 하늘색 옷, 빨강 바탕). 어둡고 채도 높음 |
| `medallion_chartres` | 샤르트르 창의 원형 메달리온 장면(식탁 장면) 근접 사진 → **basic, myeongdong(랜싯 안 장면 패널)** | rectangular(정사각 메달리온 패널) | Public domain (PD-self) | Vassil | https://commons.wikimedia.org/wiki/File:Vitrail_Chartres_210209_07.jpg | (표시 의무 없음) Vassil, Public domain, via Wikimedia Commons | `assets/church/glass_medallion_chartres.jpg` (768×768, 129KB) · 원본 `glass_src/medallion_chartres.jpg` | 빨강 바탕+파랑 원, 인물 5명. 납선과 유리 그림(그리자유 선) 디테일이 가장 잘 보이는 근접 자료 |
| `lancet_cologne` | 쾰른 대성당 측랑의 19세기 고딕 리바이벌 4연창(큰 인물 + 건축 캐노피 + 문장 패널) → **myeongdong, basic** | lancet group(4연창, 직사각) | CC BY 3.0 | Edgar El | https://commons.wikimedia.org/wiki/File:Die_Fenster_im_K%C3%B6lner_Dom_-_7_von_9_-_panoramio.jpg | Edgar El, CC BY 3.0 <https://creativecommons.org/licenses/by/3.0>, via Wikimedia Commons | `assets/church/glass_lancet_cologne.jpg` (476×768, 141KB) · 원본 `glass_src/lancet_cologne.jpg` | 흰색·금색 캐노피가 많아 매우 밝고, 인물 옷은 파랑·빨강. 아래 2단은 문장(紋章). 큰 인물 있음 |
| `tracery_cologne` | 쾰른 대성당 경당 창의 트레이서리 — 그리자유 잎무늬 삼엽 원 → **basic, myeongdong, milan(트레이서리 머리)** | tracery(삼엽 원 묶음) | CC0 1.0 | Stand87 | https://commons.wikimedia.org/wiki/File:Cologne_Cathedral,_Chapel_Stained_Glass.jpg | (표시 의무 없음) Stand87, CC0, via Wikimedia Commons | `assets/church/glass_tracery_cologne.jpg` (783×1024, 140KB) · 원본 `glass_src/tracery_cologne.jpg` | 회백색 그리자유 잎무늬 + 작은 파랑 중심, 사이에 빨강·노랑 체크. 주변 석재는 검정. 인물 없음 |
| `grisaille_lancet` | 메트로폴리탄 클로이스터스 소장 그리자유 패널(설치 상태) → **basic, myeongdong(측랑 장식창)** | lancet(뾰족 머리) | CC0 1.0 | The Metropolitan Museum of Art (Open Access) — 작가 미상, 프랑스 c.1265 | https://commons.wikimedia.org/wiki/File:Grisaille_Panel_MET_DP255161.jpg | (표시 의무 없음) The Metropolitan Museum of Art, The Cloisters Collection, 1969, CC0 | `assets/church/glass_grisaille_lancet.jpg` (185×1024, 92KB) · 원본 `glass_src/grisaille_lancet.jpg` | 연한 호박색·무색 그리자유 격자(사엽 반복) + 빨강·파랑 작은 보스, 채색 테두리. 인물 없음. 폭이 좁음(185px) |
| `grisaille_knot` | 기하학적 그리자유 매듭무늬 패널(c.1200–1250, 영국 Ely 스테인드글라스 박물관 소장) → **basic, myeongdong, lateran(무색 장식창)** | lancet(반원 머리) | CC0 1.0 | The wub | https://commons.wikimedia.org/wiki/File:Geometric_Grisaille_c.1200-1250_-_Stained_Glass_Museum.jpg | (표시 의무 없음) The wub, CC0, via Wikimedia Commons | `assets/church/glass_grisaille_knot.jpg` (381×1024, 129KB) · 원본 `glass_src/grisaille_knot.jpg` | 무색(옅은 녹황색) 유리 띠가 엮인 매듭 + 파랑·노랑·빨강 작은 조각. 납선이 무늬 자체. 인물 없음 |
| `lancet_gesta` | 프랑스 마르시이(Marsilly) 성당의 성 에우트로피오 창 — 툴루즈 Gesta 공방(명동대성당 창을 만든 것으로 알려진 공방)의 19세기 네오고딕 랜싯 → **myeongdong** | lancet(뾰족 머리, 성인 입상) | CC0 1.0 (사진) / Public domain PD-100 (창) | Louis-Victor Gesta (창, 19세기) · 사진 Jebulon | https://commons.wikimedia.org/wiki/File:Saint-Eutrope,_vitrail_Gesta,_Marsilly,_Charente-Maritime,_august_2015.jpg | (표시 의무 없음) Jebulon, CC0, via Wikimedia Commons | `assets/church/glass_lancet_gesta.jpg` (358×960, 138KB) · 원본 `glass_src/lancet_gesta.jpg` | 파랑 다이아퍼 바탕, 빨강 제의의 주교 성인, 금색 캐노피, 녹·적·청 꽃무늬 테두리. 큰 인물 1명 |

### CC-BY 항목의 필수 표시 문구(앱 라이선스 화면에 그대로 넣을 것)
- `glass_alabaster_stpaul_1.jpg`, `glass_alabaster_stpaul_2.jpg` — "Alabaster window of the Basilica of Saint Paul Outside the Walls" by Szilas, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0), via Wikimedia Commons — 크롭·색 보정함.
- `glass_alabaster_slab.jpg` — "Alabaster window in the Mausoleum of Galla Placidia, 425-50; Ravenna (2)" by Richard Mortel, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0), via Wikimedia Commons — 크롭·투시 보정함.
- `glass_rose_notredame_south.jpg` — "Notre-Dame-de-Paris - rosace sud" by Albertus teolog (derivative work: Eusebius), CC BY 3.0 (https://creativecommons.org/licenses/by/3.0), via Wikimedia Commons — 크롭함.
- `glass_lancet_cologne.jpg` — "Die Fenster im Kölner Dom - 7 von 9" by Edgar El, CC BY 3.0 (https://creativecommons.org/licenses/by/3.0), via Wikimedia Commons — 크롭·투시 보정함.

나머지 15점은 CC0 / Public domain 이라 표시 의무가 없다(표의 문구는 권장 크레딧).

### 성당별 요약
| 성당 | 쓸 수 있는 질감 | 상태 |
|---|---|---|
| stpeter | `dove_stpeter`(실물), 측창은 `alabaster_slab` | 좋음 — 실제 Gloria 창 사진(CC0) |
| stpaul | `alabaster_stpaul_1`, `alabaster_stpaul_2`(실물), `alabaster_slab` | 좋음 — 실제 알라바스터 창 정면 사진 |
| milan | `lancet_milan_1`, `panels_milan_2`(실물, 같은 창의 두 크롭) + 트레이서리는 `tracery_cologne`, 장미/머리 장식은 `rose_notredame_*` 로 대체 | 보통 — 후진(apse)의 거대한 3개 창 정면 사진은 허용 라이선스로 찾지 못함 |
| florence | `oculus_florence_donatello`, `oculus_florence_ghiberti_1`, `oculus_florence_ghiberti_2`(실물) | 좋음(단 기베르티 2점은 책 스캔 1249px 저해상도). 우첼로·카스타뇨 오큘러스는 허용 라이선스 사진 없음 |
| myeongdong | `lancet_gesta`(같은 공방으로 알려진 Gesta 의 네오고딕 랜싯), `lancet_cologne`, `grisaille_*`, 장미창류 | **실물 사진 없음** — Commons 에 명동대성당 창 근접 사진이 없어 같은 양식의 프랑스·독일 창으로 대체 |
| lateran | `alabaster_stpaul_*`, `alabaster_slab`, `grisaille_knot` | **실물 사진 없음** — 라테라노는 유명한 스테인드글라스가 없고 밝은 무색/호박색 창 위주라 알라바스터·그리자유로 대체 |
| maggiore | `alabaster_slab`, `alabaster_stpaul_*` | **실물 사진 없음** — 정면 장미창(조반니 하이날, 1995)은 현대 저작물이라 사용 불가. 측창은 호박색 알라바스터풍으로 처리 |
| basic | 샤르트르·노트르담·쾰른·그리자유 전부 | 좋음 |

### 제외한 후보(이유)
- 생트샤펠 장미창(CC0, Gerda Arendt)·생트샤펠 내부 사진들(CC BY 2.0): 아래에서 올려 찍어 투시가 심하고 샹들리에·난간이 겹침 → 제외.
- 밀라노 `Stained Glass Window, Milan Cathedral.jpg`(CC0): 측면에서 비스듬히 찍혀 어둡고 보정 불가 → 제외.
- 노트르담 북쪽 장미창 2024년 사진들(CC BY 4.0, Ibex73): 창이 잘리거나 투시가 있어 PD 사진(Mizera)을 대신 사용.
- 피렌체 Sailko 의 오큘러스 근접 사진 다수(CC BY 3.0): 부분 확대라 창 전체 질감으로 부적합.
- Commons 검색에서 CC BY-SA 로만 존재하는 사진(쾰른 바이에른 창 정면, 밀라노 후진 창, 샤르트르 고해상도 다수 등)은 규칙상 전부 건너뜀.
- 명동대성당: 외관·신랑 전경(CC0/CC BY 4.0)만 있고 창이 너무 작게 찍혀 질감으로 못 씀.

### 확인하지 못한 것(한계)
- 라이선스는 Commons 에 기재된 내용을 확인한 것이며, 업로더의 권리 주장 자체의 진위는 검증할 수 없다. 특히 피렌체 3점은 업로더가 **책에서 스캔**(`{{self-scanned}}`)하고 `PD-Art`(2차원 작품의 충실한 복제) 를 적용한 것으로, 스테인드글라스 사진에 PD-Art 를 적용하는 것은 일부 국가에서 이견이 있을 수 있다.
- 이탈리아 문화재(밀라노·피렌체·로마의 창)는 저작권과 별개로 **이탈리아 문화재법(Codice dei beni culturali)** 상 상업적 복제에 허가·수수료가 요구될 수 있다(Commons 의 `Italy-MiBAC` 경고). 앱을 유료/상업 배포한다면 검토가 필요하다.
- 성 베드로 비둘기 창의 현재 유리가 베르니니 당시의 것인지 후대 교체품인지, 쾰른 4연창이 정확히 어느 창(바이에른 창으로 보임)인지, 명동대성당 창을 Gesta 공방이 만들었다는 통설은 이번 조사에서 1차 자료로 확인하지 못했다.
- Wikimedia 의 접속 제한(429) 때문에 원본 대신 폭 960–1920px 썸네일을 받았다. 더 큰 해상도가 필요하면 출처 URL 에서 원본을 받을 수 있다(예: 밀라노 3024×4032, 샤르트르 baie 50 은 3432×9628).
- 메트로폴리탄·클리블랜드·시카고 미술관 오픈액세스도 살폈으나(클리블랜드 `Stained Glass Panel with Aconite Leaves` 등 CC0), 반사광으로 찍힌 유물 사진이 많아 투과광 질감으로는 Commons 쪽이 나아 채택하지 않았다.

## 2. Design notes for realistic stained glass (구현 지침)

아래 수치는 이번에 모은 20장의 픽셀 통계(160×160 축소, 휘도 0–1)와 실제 광학을 바탕으로 한 것이다.

### 2.1 납선(lead came)·철제 보강·돌 트레이서리 — 세 단계의 어두운 선
- **납선**: 실물 폭 약 5–10mm(유리면에 보이는 폭; 심지는 2–4mm), 유리 조각 한 변은 대략 5–15cm. 즉 **선 폭 ≈ 조각 크기의 5–10%**. 질감에서 창 폭 1m 가 512px 이면 납선은 3–5px. 색은 순검정이 아니라 `#0a0806`~`#15120f` 의 따뜻한 검정이며 투과율 0, 실내 쪽에서는 아주 약한 회색 반사(러프니스 0.6–0.8, 금속성 낮게).
- **철제 보강대(ferramenta, saddle bar)**: 30–60cm 간격의 수평선(샤르트르는 정사각 격자). 납선의 2–3배 굵기. `oculus_florence_*` 와 `lancet_chartres_1` 에서 뚜렷하다 — 이것이 없으면 "인쇄한 그림"처럼 보인다.
- **돌 멀리언·트레이서리**: 창 폭의 4–8%. 완전히 불투명. 장미창 사진에서 **어두운 화소가 전체의 44–60%**(`rose_*`, `tracery_cologne`, `medallion_chartres`)이고, 랜싯은 10–25%, 알라바스터는 0–4%이다. → 장미창은 "절반이 검정"이어야 사실적이다. 색 블록을 빈틈없이 채우지 말 것.
- 선은 일정하지 않다: 폭에 ±20% 잡음, 교차점에 납땜 덩어리(작은 원), 조각 경계는 직선이 아니라 인물·옷 주름 윤곽을 따르는 곡선.

### 2.2 투과광의 색·명도 범위
- 측정값: 유리 부분 휘도 중앙값은 중세 창 0.26–0.45, 19세기 창 0.38–0.52, 알라바스터 0.60–0.78. 상위 10% 는 0.52–0.94. 채도 중앙값 0.2–0.5, 상위 10% 는 0.6–0.98.
  → **대부분의 유리는 생각보다 어둡고(중간 회색 이하), 소수의 조각만 매우 밝다.** 전체를 같은 밝기로 칠하면 가짜처럼 보인다. 조각별 명도를 로그 정규분포처럼 흩뜨리고(σ≈0.35), 5–10% 만 과다 노출(블룸 대상)로 둔다.
- 색은 **깊고 좁은 팔레트**: 코발트 블루 `#1b3fa8`~`#2a56c8`, 루비 레드 `#a3121c`~`#c8202a`, 에메랄드 `#1f7a3d`, 은염 노랑 `#e2b23a`, 자주 `#6a2c7a`, 살색/무색 `#e8dcc0`. 파랑과 빨강이 겹쳐 보이는 먼 거리에서는 **보라색**으로 섞인다(노트르담 평균색 `#6d6b80`, `#746c7e`).
- 렌더링: 유리는 `emissive`(발광)로 처리하고 `emissiveMap` 에 사진을, `emissiveIntensity` 는 시간대에 따라 1.0–3.0. 톤매핑 전 HDR 값으로 밝은 조각이 1.0 을 넘게 해서 블룸이 조각 가장자리로 번지게 한다(할레이션). 실내 쪽 표면은 거의 검은 유리(baseColor ×0.05)로 두어 조명이 닿아도 색이 뜨지 않게 한다.
- 밤/흐림: 바깥이 어두우면 창은 **검은 유리 + 납선의 희미한 반사**만 남는다. 색을 그대로 두지 말고 발광을 0.05 이하로.

### 2.3 유리 자체의 질감(절차적으로 추가할 것)
- **두께 불균일**: 입으로 분 중세 유리는 한 조각 안에서도 색 농도가 15–30% 변한다 → 조각마다 저주파 잡음(조각 크기의 0.5–1배 주기)으로 명도·채도를 변조.
- **기포·줄무늬(seeds, striae)**: 1–3px 밝은 점과 한 방향 줄무늬. 강하면 지저분하므로 진폭 5% 이내.
- **유리 그림(grisaille paint)**: 얼굴·옷 주름·테두리의 갈색/검정 붓선과, 빛을 줄이려 바른 얇은 매트(반투명 갈색 막). 인물창 조각의 30–50% 가 이 선으로 덮인다(`medallion_chartres` 참고). 절차적 대체: 조각 가장자리 안쪽에 어두운 비네트 + 평행 해칭.
- **풍화·때**: 납선 주변과 조각 아래쪽에 어두운 얼룩, 바깥면 부식으로 인한 우윳빛 → 납선에서 안쪽으로 2–4px 의 어두운 그라데이션(AO 처럼)을 주면 즉시 입체감이 난다.
- **굴절**: 창 너머 풍경은 보이지 않는다(불투명에 가까운 산란). `transmission` 으로 뒤를 비추지 말고, 노멀맵에 약한 물결(강도 0.1–0.2)만 주어 실내 조명 하이라이트가 조각마다 다르게 튀게 한다.

### 2.4 바닥·벽에 떨어지는 색빛
- 태양은 점광원이 아니라 지름 0.53° 원반이므로 창에서 d 만큼 떨어진 곳의 반그림자 폭은 ≈ d×0.0093. **10m 에서 9cm, 20m 에서 19cm, 30m 에서 28cm.** 대성당 높이에서는 납선(1cm)·개별 조각(10cm)이 모두 뭉개지고 **패널 단위(30–60cm)의 부드러운 색 얼룩**만 남는다. 납선 그림자를 바닥에 선명하게 그리면 틀린다.
- 구현: 창 질감을 64–128px 로 줄여 가우시안 블러(σ = 거리×0.004 상당)한 것을 태양 방향으로 투영하는 projector/`SpotLight.map`(쿠키) 또는 바닥 데칼(가산 블렌딩). 얼룩의 **가운데는 채도 높고(S 0.7–0.9) 가장자리는 부드럽게 0 으로**. 창 전체 윤곽(랜싯의 뾰족 아치, 장미창의 원)은 유지된다.
- 입사각 때문에 얼룩은 길게 늘어난 평행사변형이 되고, 기둥·의자 위로 꺾여 올라간다. 돌바닥의 색(따뜻한 회색)과 곱해지므로 파랑은 탁해지고 빨강·노랑·호박색이 더 잘 보인다.
- 밝기: 직사광이 유리를 통과하면 투과율 10–40%(진한 파랑·빨강 10–15%, 노랑·무색 40–70%). 주변 실내 조도보다 3–8배 밝은 정도가 사실적이다. 흰 과다노출 금지.
- **알라바스터**는 강한 산란체라서 상(像)이 맺히지 않는다: 창 모양의 색 얼룩 대신 창 주변 벽과 맞은편 바닥에 **넓고 부드러운 금빛/호박색 확산광**(`#e3bf76` 계열, 창 자체는 `#fff2cf`~`#c98a3a` 의 줄무늬)을 준다. 로마 대성전(stpaul, lateran, maggiore, stpeter 측창)은 색 얼룩이 아니라 "꿀색 공기"가 맞다.
- 공기 중 빛줄기(god rays)는 향 연기·먼지가 있을 때만 약하게: 창에서 바닥 얼룩까지의 가산 볼륨, 불투명도 3–8%.

### 2.5 시간대에 따른 변화
- 동쪽 창(후진)은 아침, 남쪽 창은 한낮, 서쪽 장미창은 늦은 오후에 직사광을 받아 가장 밝다. 직사광을 받는 창: 발광 2.5–3.0 + 바닥 얼룩 있음. 반대편(하늘빛만 받는) 창: 발광 0.8–1.2, 색온도가 차가워져 파랑이 돋고 바닥 얼룩 없음.
- 일출/일몰(태양 고도 <10°): 빛이 호박색으로 치우쳐(×`#ffb060`) 빨강·노랑 조각이 불타듯 밝고 파랑은 죽는다. 얼룩이 벽 높이까지 길게 올라간다.
- 흐린 날: 모든 창이 균일하게 발광 1.0 안팎, 얼룩 없음, 대비 낮음.
- 밤: 2.2 의 "검은 유리". 실내 촛불/전등에는 납선과 유리 표면의 약한 반사만.

### 2.6 유명 창의 구성(사진이 없는 성당의 절차적 대체용)
- **밀라노 대성당**: 폭이 아주 넓고 높은 창(후진 창은 약 11×22m)을 돌 멀리언이 6–12개의 좁은 세로 창으로 나누고, 각 세로 창에 **직사각 장면 패널(가로:세로 ≈ 1:1.4)을 9–12단으로 쌓는다**(구약·신약·묵시록 이야기). 패널마다 인물 2–5명, 흰 구름/살색이 30% 쯤이라 밝고, 패널 아래 얇은 흰 명문 띠가 있다. 창 머리는 불꽃무늬(flamboyant) 트레이서리와 작은 장미. 절차적 생성: 열×단 격자 → 패널마다 (하늘 파랑 배경 + 붉은/노란/녹색 옷 덩어리 2–4개 + 살색 타원) + 굵은 멀리언. `lancet_milan_1`, `panels_milan_2` 참조.
- **피렌체 대성당**: 스테인드글라스는 **원형 오큘러스**(지름 약 4.5–4.7m, 쿠폴라 드럼 8개 중 7개 + 정면 3개)에 집중된다. 르네상스식으로 **큰 인물 2–10명이 원 전체를 차지**하고, 원 가장자리에 폭 8–12% 의 꽃/별 무늬 테두리 띠. 조각이 크고(납선 성김) 십자·격자 철제 보강대가 화면을 가로지른다. 색은 진한 빨강·녹색·흰색·금색, 파랑은 하늘 배경. 신랑의 긴 창은 좁은 랜싯에 캐노피 아래 성인 입상.
- **샤르트르**: 유명한 "샤르트르 블루"(코발트) 바탕 + 루비 레드의 2색 지배(면적비 대략 파랑 50 : 빨강 25 : 기타 25). 랜싯은 **원형·사엽·마름모 메달리온**이 세로로 쌓이고 그 사이를 빨강/파랑 모자이크 다이아퍼가 채우며, 넓은 꽃무늬 테두리. 조각이 아주 작아(3–8cm) 멀리서는 보랏빛 보석처럼 반짝인다. 장미창은 12분할: 중심 원 → 12개 작은 원 → 12개 마름모 → 12개 반원.
- **노트르담 드 파리 장미창**: 지름 약 13m, 북쪽은 16→32 분할의 가는 살(파랑·보라, 구약), 남쪽은 12→24 분할(더 붉고 밝음, 신약). 살 사이마다 원형 메달리온 1개씩, 바깥 고리는 삼엽. 돌이 검게 보이는 면적이 절반.
- **쾰른 / 19세기 고딕 리바이벌(명동대성당 계열)**: 뾰족 랜싯 하나에 **성인 입상 1명**, 머리 위 금색·흰색 건축 캐노피(면적의 25–35%), 발아래 받침대와 명문/문장, 배경은 파랑 또는 빨강의 마름모 다이아퍼, 테두리 꽃띠. 중세 창보다 조각이 크고 색이 선명하며 흰색·금색이 많아 밝다(`lancet_gesta`, `lancet_cologne`). 명동대성당 후진의 랜싯도 이 구성(성모·사도·묵주기도 신비 장면)으로 만들면 된다.
- **그리자유(무색 장식창)**: 무색·옅은 녹황색 유리에 갈색 선으로 잎무늬를 그리고, 납선 자체가 매듭/사엽/마름모 격자를 이룬다. 5–10% 만 빨강·파랑 점. 측랑·고창(clerestory)에 쓰면 실내가 밝아지고 채색창과 대비된다(`grisaille_knot`, `grisaille_lancet`, `tracery_cologne`).
- **로마 대성전의 알라바스터**: 얇게 켠 석판을 책처럼 펼쳐(북매치) 좌우 대칭 물결 무늬를 만든다. 색은 흰색→꿀색→호박색→적갈색 띠, 굵은 석재/철제 틀로 6–20칸. 절차적 생성: 도메인 워핑한 줄무늬 잡음 + 좌우 반전 + 금색 그라데이션. 성 베드로의 Gloria 는 **타원형, 중심에서 12방향으로 뻗는 방사 납선 + 동심 타원 3겹**, 중심 흰색 → 노랑 → 호박 → 갈색으로 어두워지는 그라데이션, 가운데 비둘기.

### 2.7 질감 사용 팁
- 모양이 직사각이 아닌 창(`dove_stpeter`, `rose_*`, `oculus_*`, 아치 머리 랜싯)은 **창 개구부 지오메트리로 마스크**하거나 타원/원/아치 알파를 셰이더에서 적용한다. 사진의 검정 배경은 돌(불투명)로 취급하면 된다: `emissive = tex`, 휘도 <0.1 인 화소는 그대로 검정 돌.
- 한 장을 여러 창에 반복할 때는 좌우 반전·세로 오프셋·색상 회전(±8°)으로 변주한다. 긴 랜싯(`lancet_chartres_1`, `lancet_milan_1`)은 세로로 타일링 가능하다.
- 가로 해상도가 낮은 항목(`grisaille_lancet` 185px, `lancet_chartres_1` 297px)은 좁은 창에만 쓴다.
