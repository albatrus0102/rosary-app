# 성상 3D 모델 출처 (STATUE_SOURCES)

작성일: 2026-11-16 · 로드맵 T-80(성상을 실제 모양으로 교체) · 전체 표: `art/statue_handoff/manifest.json`

이 문서는 **고른 모델과 근거, 앱에 표시할 출처 문구**만 적는다. 아직 앱에는 아무것도 넣지 않았다(줄이기·재질 입히기·빌더 연결은 다음 단계).

## 1. 라이선스 기준 (사용자 결정 2026-11-16)

- 3D 모델에 쓸 수 있는 것: **CC0, CC BY, CC BY-NC**. 로사리움은 완전 비상업 앱이라 NC 를 쓸 수 있다.
- 쓰지 않는 것: **SA(동일조건), ND(변경 금지)**, Standard/Editorial·유료, 내려받기 불가.
  - ND 는 줄이기(decimate)·재질 바꾸기가 '변경'이라 쓸 수 없다.
- 사진의 CC BY-SA 문제(T-68)와는 별개다. T-68 은 그대로 '쓰지 않음'.
- 유료화·광고·후원을 도입하면 아래 **CC BY-NC 모델은 모두 빼야 한다**(BACKLOG '완전 비상업' 결정과 같은 조건).

## 2. 어디서 받았나

| 출처 | 로그인 | 결과 |
|---|---|---|
| SMK Open (덴마크 국립미술관, `api.smk.dk`) | 불필요 | 3D 파일 있는 작품 375점. 석고 주형 컬렉션 스캔(STL, 질감 없음), 퍼블릭 도메인. **미켈란젤로 피에타 주형 스캔 확보** |
| Zenodo `3dbigdataspace` 커뮤니티 | 불필요 | Objaverse 1.0 / 스케치팹 CC 모델의 사본(GLB, 질감 포함). 스케치팹 원본과 같은 파일 |
| 스케치팹 | 내려받기는 필요 | 검색·상세 API 만 열려 있음 → 나머지는 `art/statue_handoff/README_ko.md` 목록으로 사용자에게 요청 |
| Smithsonian 3D | 불필요 | API 는 열려 있으나 가톨릭 성상·십자고상·천사 없음 |
| Wikimedia Commons | — | 이 기기에서는 첫 요청부터 HTTP 429. Retry-After(16초) 뒤 한 번 더 시도해도 429 라 중단 |
| threedscans.com, Poly Haven | 불필요 | 쓸 만한 성상 없음 |
| MyMiniFactory, Thingiverse, Cults3D | — | 403/401 로 막힘 |

Zenodo 사본에 대한 주의: 저작자가 직접 올린 것이 아니라 제3자가 보존용으로 모은 사본이다. 라이선스는 **스케치팹 원본 페이지 기준**으로 확인했고(2026-11-16, 스케치팹 API `license.label`), Zenodo 기록의 표기(`cc-zero`, `cc-by-4.0`, `cc-by-nc-1.0`)도 함께 적어 두었다. NC 모델은 Zenodo 가 `cc-by-nc-1.0` 으로 적었지만 원본은 CC BY-NC 4.0 이다 — 표기는 원본을 따른다.

## 3. 성상별 선택

### 받아 둔 것 (`art/statue_handoff/received/`, 저장소에는 올리지 않음)

| 쓰임 | 모델 | 만든이 | 라이선스 | 면(삼각형) | 비고 |
|---|---|---|---|---|---|
| **성 베드로 대성전 — 피에타** | 미켈란젤로 피에타 석고 주형 스캔, SMK KAS115 | SMK | 퍼블릭 도메인 | 400,016 (원본 약 150만) | 실제 작품의 주형이라 형태가 충실하다. 질감 없음 → 카라라 대리석 재질 |
| **제대 십자고상** (모든 성당) | "Crucified Christ" from St. Jadwiga's hospital | Virtual Museums of Małopolska | CC0 | 232,154 | 채색 목조, 십자가 포함 |
| **성 바오로 대성전 — 성 바오로** | Saint Paul the Apostle (티니에츠 수도원, 17세기 중반) | Virtual Museums of Małopolska | CC0 | 249,784 | 칼과 책. 금박 목조 → 흰 대리석 재질로 바꿀 것 |
| **성 베드로 입상** (라테라노·성 바오로 벽감) | Saint Peter (티니에츠, 17세기 중반) | Virtual Museums of Małopolska | CC0 | 250,192 | 열쇠. 위 성 바오로와 한 쌍 |
| **성 베드로 대성전 — 성 론지노 기둥** | Saint Longinus (티니에츠, 18세기) | Virtual Museums of Małopolska | CC0 | 498,202 | 베르니니 작품이 아닌 대용. 흰 대리석 재질로 |
| **명동 — 성 베네딕토** | Hl. Benedikt von Nursia (프란츠 제겐, 18세기) | noe-3d.at | CC0 | 605,942 | 책과 잔 |
| **성 요셉** | St. Joseph sculpture (Nitra, Slovakia) | Jakub Kočica | CC BY | 200,000 | 아기 예수를 안은 흰 돌 상 |
| **예수 성심상** | Christusfigur (안젤로 보르톨로티, 빈) | noe-3d.at | CC BY-NC | 563,140 | 두 팔을 벌리고 가슴에 성심. 예비: 성심 수녀회 묘지 Christusfigur(564,964) |
| **천사** | Engel (그라펜베르크) / Engel (마리아 란첸도르프) | noe-3d.at | CC BY | 481,080 / 453,628 | 서 있는 천사 2종 |
| 천사(예비) | 가브리엘(?) 천사, SMK KAS1221 | SMK | 퍼블릭 도메인 | 400,000 | 질감 없음 |
| **라테라노 벽감 사도** | 사도 부조 4점(베드로·바르톨로메오·토마스·소 야고보), SMK KAS2906/8·3·4·5 | SMK | 퍼블릭 도메인 | 각 약 400,000 | 높이 약 2 m 의 고부조(뒷면 평평) — 벽감에 알맞다 |
| 벽감 성인(예비) | 성 프란치스코 KAS1959, 책 든 성인 반신상 DEP45, 부활하신 그리스도 KAS422 | SMK | 퍼블릭 도메인 | 각 약 400,000 | KAS422 는 나체상이라 성당 안에 쓰기 전 검토 |
| 보류 | Hl. Matthäus, Hl. Lukas (프리드리히 파르비켈, **1950년**) | noe-3d.at | CC BY | 404,902 / 515,332 | 아래 4절 참고 — 받아 두었지만 쓰지 않는 쪽을 권한다 |

### 스케치팹에서 사용자가 받아 줄 것 (`art/statue_handoff/README_ko.md`)

| 번호 | 쓰임 | 모델 | 만든이 | 라이선스 | 면 |
|---|---|---|---|---|---|
| 01 (필수) | 성 베드로 대성전 — 청동 좌상 대용 | San Pietro in cattedra (14세기 중반 좌상) | Daniele Madella | CC BY | 921,599 |
| 02 (필수) | 밀라노 — 성 바르톨로메오(마르코 다그라테, 실물 스캔) | St. Bartholomew | auriea | CC BY | 1,167,009 |
| 03 (필수) | 제대 옆 무릎 꿇은 천사 | Engel (마리아 란첸도르프) | noe-3d.at | CC BY-NC | 444,854 |
| 04 | 성 바오로(돌) | Hl. Paulus (미스텔바흐, 1724) | noe-3d.at | CC BY-NC | 784,094 |
| 05 | 성 베드로 입상(돌) | Hl. Petrus | noe-3d.at | CC BY-NC | 479,642 |
| 06 | 성 베드로 대성전 — 베로니카 기둥 대용 | Hl. Veronika | noe-3d.at | CC BY-NC | 596,036 |
| 07 | 성 베드로 대성전 — 헬레나 기둥 대용 | Hl. Helena | noe-3d.at | CC BY-NC | 536,653 |
| 08 | 성 요셉(백합) | Hl. Josef (핀카펠트, 1912) | noe-3d.at | CC BY-NC | 446,840 |
| 09 | 피에타(질감 있는 대안) | Pieta' MICHELANGELO | leone.giorgio | CC BY | 72,680 |
| 10 | 십자고상 대안 | Gothic crucifix | Virtual Museums of Małopolska | CC BY | 287,022 |

### 찾지 못한 것

- 성 베드로 청동 좌상(아르놀포 디 캄비오) 실물 스캔.
- 성 베드로 대성전 돔 기둥 4성인(베르니니의 론지노, 모키의 베로니카, 볼지의 헬레나, 뒤케누아의 안드레아) 실물 스캔. 성 안드레아는 대용도 없다 — 절차 생성 그대로 둔다.
- 라테라노 신랑 사도상 실물: 성 토마스 한 점이 스케치팹에 있으나 CC BY-NC-**ND** 라 제외.
- 피렌체 반디니 피에타(미켈란젤로): CC BY-NC-**SA** 뿐이라 제외.
- 명동 성 김대건 안드레아 상, 마조레 비오 9세 기도상: 모델 없음.
- 예수 성심상의 CC0/CC BY 실물 스캔: 없음(CC BY 로 올라온 것은 Meshy AI 생성물이라 고르지 않았다).

## 4. 주의할 점

1. **스캔 라이선스와 조각 자체의 저작권은 별개다.** 스캔한 사람이 CC 로 풀어도, 조각가가 죽은 지 70년이 안 됐으면 조각의 저작권이 남아 있을 수 있다(오스트리아·EU). 그래서 17~19세기 작품을 우선 골랐다.
   - Hl. Matthäus·Hl. Lukas 는 1950년 작이라 **보류**(작가 사망 연도 미확인).
   - 제작 연도를 확인하지 못한 것: 니트라 성 요셉, 보르톨로티의 Christusfigur, 그라펜베르크 천사. 출시 전 권리 검토(T-32 계열) 때 연도를 확인한다.
   - Hl. Josef(핀카펠트)는 1912년 작 — 작가 미상, 같은 검토 대상.
2. **실물이 아닌 대용은 대용이라고 밝힌다.** 성 론지노·베로니카·헬레나·성 베드로 좌상은 그 성당의 실제 조각이 아니다. 안내문에 '베르니니 작'처럼 쓰지 않는다.
3. **밀라노 성 바르톨로메오**는 살가죽이 벗겨진 모습의 조각이다. 실제로 대성당 안에 있는 작품이지만, 기도 앱 화면에서 가까이 보이는 자리에 둘지는 넣을 때 판단한다.
4. **변경 표시**: CC BY 는 변경했다는 사실을 밝혀야 한다. 우리는 삼각형 수를 줄이고 재질을 바꾸므로 표기에 '수정함'을 붙인다.
5. SMK 파일은 질감이 없는 STL 이다. 원본 크기(작은 판 약 40만 삼각형, 큰 판은 manifest 의 `larger_original_url`)에서 3만~6만 삼각형으로 줄여 쓴다.

## 5. 앱에 표시할 출처 문구

'출처·라이선스' 화면에 아래 줄을 넣는다(실제로 쓰는 모델만). 형식: 제목 — 만든이 — 라이선스 — 링크 — 변경 내용.

받아 둔 것:

- 미켈란젤로 〈피에타〉 석고 주형 3D 스캔 (KAS115) — SMK(덴마크 국립미술관) — 퍼블릭 도메인 — https://open.smk.dk/artwork/image/KAS115 — 삼각형 수를 줄이고 재질을 입힘
- 사도 부조 3D 스캔 (KAS2906/3, /4, /5, /8), 천사 (KAS1221), 성 프란치스코 (KAS1959) — SMK(덴마크 국립미술관) — 퍼블릭 도메인 — https://open.smk.dk — 삼각형 수를 줄이고 재질을 입힘
- "“Crucified Christ” from St. Jadwiga’s hospital" — Virtual Museums of Małopolska (Museum of the Biecz Land) — CC0 1.0 — https://sketchfab.com/3d-models/crucified-christ-from-st-jadwigas-hospital-d2404e52b2d144e18f0621903c98c06a
- "Saint Peter" — Virtual Museums of Małopolska (Museum of the Benedictine Abbey in Tyniec) — CC0 1.0 — https://sketchfab.com/3d-models/saint-peter-9e6b4da152f64fa1b4b0613a57318751
- "Saint Paul the Apostle" — Virtual Museums of Małopolska (Museum of the Benedictine Abbey in Tyniec) — CC0 1.0 — https://sketchfab.com/3d-models/saint-paul-the-apostle-2195c3c0b9a140628e938ddb146d00ca
- "Saint Longinus" — Virtual Museums of Małopolska (Museum of the Benedictine Abbey in Tyniec) — CC0 1.0 — https://sketchfab.com/3d-models/saint-longinus-8e265db18afd4fff84c4aa330a4f2828
- "Hl. Benedikt von Nursia" — noe-3d.at — CC0 1.0 — https://sketchfab.com/3d-models/hl-benedikt-von-nursia-96eadf67a4244051a3115c04149d5951
- "St. Joseph sculpture (Nitra, Slovakia)" — Jakub Kočica — CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) — https://sketchfab.com/3d-models/st-joseph-sculpture-nitra-slovakia-ecde02f327c3471b8dbd29e4bf765c20 — 수정함(삼각형 수 줄임, 재질 변경)
- "Christusfigur" — noe-3d.at — CC BY-NC 4.0 (https://creativecommons.org/licenses/by-nc/4.0/) — https://sketchfab.com/3d-models/christusfigur-f05c0c0b126e48b7b9d31adad6f94f37 — 수정함
- "Christusfigur" — noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/christusfigur-351abbc72dfd4a4399d32bd450c6787d — 수정함
- "Engel" — noe-3d.at — CC BY 4.0 — https://sketchfab.com/3d-models/engel-15edd1e0e422482586dd4dd4aebe8d55 — 수정함
- "Engel" — noe-3d.at — CC BY 4.0 — https://sketchfab.com/3d-models/engel-668dcbf72a7243e491f540a6a575213b — 수정함

스케치팹에서 받게 될 것(받은 뒤에만 넣는다):

- "San Pietro in cattedra" — Daniele Madella (사진 측량: Paolo Saglia) — CC BY 4.0 — https://sketchfab.com/3d-models/san-pietro-in-cattedra-2e11ebf282d24879a0a8f4960ac23363 — 수정함
- "St. Bartholomew" — auriea — CC BY 4.0 — https://sketchfab.com/3d-models/st-bartholomew-dd9d403ad3584cb4bff30f3946f0818e — 수정함
- "Engel" — noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/engel-bd6261224279427685fd1c486e3c4240 — 수정함
- "Hl. Paulus" — noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/hl-paulus-7455a9981c7a46c4992d88c8caa78521 — 수정함
- "Hl. Petrus" — noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/hl-petrus-fce2f11097ae4237b2c4c48c374acca7 — 수정함
- "Hl. Veronika" — noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/hl-veronika-cf472d787dc54f6dbf09764263061399 — 수정함
- "Hl. Helena" — noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/hl-helena-15a4ee895e5447e09f8ea980df03fefd — 수정함
- "Hl. Josef" — noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/hl-josef-78910d3f53284ccfbb6b9150f69cd429 — 수정함
- "Pieta' MICHELANGELO" — leone.giorgio — CC BY 4.0 — https://sketchfab.com/3d-models/pieta-michelangelo-6398440bbccc4350963687782145dad4 — 수정함
- "Gothic crucifix" — Virtual Museums of Małopolska — CC BY 4.0 — https://sketchfab.com/3d-models/gothic-crucifix-35fde9ce3c734d29ab8813072732d27a — 수정함

CC0·퍼블릭 도메인은 표기 의무가 없지만, 박물관 자료이므로 같은 화면에 함께 적는다.

## 6. 지금 절차 생성·사진 판으로 그리는 자리 (교체 대상)

- 성 베드로: 피에타(`ch_stpeter.js` 사진 판 `artPhoto('pieta')`), 돔 기둥 성인상 4(`figure`), 측랑 경당 성인상, 제대 천사.
- 라테라노: 신랑 벽감 사도상(`ch_lateran.js` `statue`).
- 성 바오로: 성 베드로·성 바오로 입상(`ctx.statue` h 2.5), 벽감(`ctx.statueNiche`), 경당 십자고상.
- 밀라노: `miniStatue` 여러 곳.
- 피렌체: 성인상 2, 십자고상.
- 명동: 김대건 성상, 베네딕토 성상, 제대 천사 2, 십자고상.
- 공용: `kit.js` 의 `ctx.statue`, `ctx.statueNiche`, `ctx.crucifix`.
