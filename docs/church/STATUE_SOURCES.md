# 성상 3D 모델 출처 (STATUE_SOURCES)

작성일: 2026-11-16 · 로드맵 T-80(성상을 실제 모양으로 교체) · 전체 표: `art/statue_handoff/manifest.json`

이 문서는 **고른 모델과 근거, 앱에 표시할 출처 문구**를 적는다. 2026-11-16 에 5개 모델을 앱에 넣었다 — 자리·삼각형·용량·draw call 은 §7.

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

## 7. 앱에 넣은 것 (2026-11-16, T-80 1차)

만드는 법: `node tools/statues/make_scan_pack.mjs`(설정 `tools/statues/scan_packs.json`, 원본은 메인 저장소 `art/statue_handoff/received/`) → `assets/church/scan3d_<키>.js`. 불러오기·배치: `assets/church/scan3d.js` + 빌더의 `ctx.scan(o, 예전그림)` / `ctx.crucifix({…, scan: true})`(`kit.js`).

- 묶음은 그 성당이 쓸 때만 읽는다(script 태그). 자리마다 THREE.LOD 하나(근거리 / 원거리 = 높이 × 4m 밖, 최소 5m) → **그리기 호출은 성상마다 1**. 같은 성당의 같은 묶음은 기하를 함께 쓰고, 재질은 종류마다 하나(무광 흰 대리석 `marble` + 성상 재질에만 더하는 열쇠 빛, 어두운 피에타 경당은 열쇠 빛을 더 세게 한 `marbleLit`, 정점 색 `color` — §8).
- 고사양의 바닥 반사(Reflector)에는 그리지 않는다(반사 카메라에서는 LOD 를 숨김) — 반사까지 그리면 성상마다 draw call 이 하나 더 늘었다(성 바오로 계단 시점 +5).
- 묶음을 못 읽거나 풀지 못하면 LOD 를 빼고 **예전 그림을 그 자리에 다시 그린다**(피에타 = 사진 판, 나머지 = 절차 생성 상; `ctx.lateDraw` 가 이미 메시가 된 묶음 대신 따로 모아 세운다). `?scan3d=0` 이면 처음부터 예전 그림. node 시험(문서 없음)도 예전 그림이라 충돌체·좌석 시험은 그대로다.
- 시험: `tools/church_web/scan3d.test.mjs`(풀기·예산·출처·자리·실패 대체), 사진·draw call: `tools/church_web/scan_shots.mjs <outdir> --base <HEAD 의 assets/church 사본>`.

| 키 | 자리 | 원본 → 근거리 / 원거리 삼각형 | 묶음(JS / gzip) | 재질 | 표기 |
|---|---|---|---|---|---|
| `pieta` | 성 베드로 피에타 경당: 사진 판 대신 제대 위 높은 받침(윗면 y 1.5)에 높이 1.74m(실물), 통로(−x)를 봄. 방탄유리 막은 뺐다(§8) | 1,498,118(`_full`) → 100,000 / 8,000 | 499KB / 334KB | 무광 대리석 + 경당 열쇠 빛 | **피에타(미켈란젤로)** — SMK, PD |
| `crucifix` | 우리 본당 제대 뒤 벽(h 3.4) · 피렌체 주교좌 위(h 3.6) · 명동 제대 옆 세운 십자가(h 4.4) · 성 바오로 십자가 경당(h 2.8). 뒷면을 예전 십자가 뒷면에 맞춤 | 232,154 → 24,000 / 4,000 | 200KB / 130KB | 정점 색(채색 목조) | 십자고상(대용), CC0 |
| `st_peter` | 라테라노 남쪽(−x) 익랑 쪽 첫 벽감(h 2.44) · 성 바오로 계단 왼쪽(h 2.5) | 250,192 → 36,000 / 5,000 | 214KB / 138KB | 흰 대리석 | 성 베드로 상(대용), CC0 |
| `st_paul` | 라테라노 북쪽(+x) 익랑 쪽 첫 벽감(h 2.44) · 성 바오로 계단 오른쪽(h 2.5) | 249,784 → 36,000 / 5,000 | 213KB / 138KB | 흰 대리석 | 성 바오로 상(대용), CC0 |
| `angel` | 명동 흰 고딕 주제대 양옆(h 1.45, 받침 위, 신자 쪽에서 제대 쪽으로 0.5 rad, 오른쪽은 좌우 반전 — 둘 다 고개를 제대 쪽으로) | 453,628 → 30,000 / 4,000 | 182KB / 117KB | 흰 대리석 | 천사상(대용), CC BY 4.0 noe-3d.at |

합계 JS ≈ 1.32MB, deflate ≈ 0.87MB(APK 증가분 추정, `scan3d.js` 포함; T-80 1차는 1.0MB / 0.65MB).

빌더에서 함께 고친 것:
- 라테라노 사도상 순서: 오른쪽(북) 표는 '익랑→입구 순'인데 입구 쪽 피어부터 붙이고 있었다 → 바오로가 입구 쪽 끝에 서 있었다. 표대로 뒤집어 바오로가 익랑 쪽 첫 벽감(베드로와 마주 봄)에 서게 했다(lateran.md §3).
- 십자고상 가림천(사순, `liturgy.js` veil): 스캔 십자고상은 가로대가 높고(0.8h) 팔이 넓고(±0.33h) 몸이 앞으로 나와 있어, 스캔을 쓰는 성당(우리 본당·피렌체·명동)은 그 비례로 감싼다(`PLACES.cross.scan`).
- 십자고상 빛 번짐: 스캔은 가로대 높이·십자가 뒤로(몸을 하얗게 덮지 않게).

넣지 않은 것과 이유:
- 성 바오로 대성전 **주제대 위 작은 제대 십자가**(h 1.2): 실제는 금동 제대 십자가라 채색 목조 스캔과 맞지 않는다 — 절차 생성 그대로.
- **당고개**(직접 지은 십자가, 현대 한국 성지)·**여의도**(다른 작업이 빌더를 고치는 중)는 손대지 않았다.
- 성 베드로 **성체 경당 천사**: 베르니니의 무릎 꿇은 금동 천사라 서 있는 석상 천사와 맞지 않는다. 그라펜베르크 천사는 제작 연도 미확인이라 쓰지 않았다.
- 라테라노 나머지 10사도: 그대로(대용이 없고, 한 성당에 너무 많이 넣지 않는다). SMK 사도 부조·부활하신 그리스도(나체상)는 쓰지 않았다(작업 지시).
- 성 론지노(성 베드로 돔 기둥 대용)·성 베네딕토(명동): 이번 범위 밖 — 다음 후보.
- 1950년 작 성 마태오·성 루카: 조각 저작권 미확인으로 보류(그대로).

다음 후보(빌더에 마땅한 자리가 아직 없다):
- **예수 성심상**(보르톨로티 Christusfigur, CC BY-NC — 제작 연도 미확인이라 먼저 확인): 우리 본당(`ch_basic`) 측면 벽 감실이나 성모 기도 자리 맞은편에 새 자리를 만들 때. 명동 측랑 끝 벽감은 성 베네딕토·성 김대건 자리라 맞지 않는다.
- **성 요셉과 아기 예수**(니트라, CC BY — 제작 연도 미확인): 우리 본당 측면 제대(한국 본당에 흔한 자리) — 자리를 새로 만들어야 한다.
- 성 베네딕토(CC0) → 명동 측랑 끝(오른쪽) 벽감 성상(`ch_myeongdong.js` 첨두 벽감 안 받침 위 성상).

draw call·삼각형 전후(`scan_shots.mjs`, 960×540, high, 군중 없음, 성상 앞 카메라 — close = 높이×1.25, normal = 높이×3.2; 앞 = HEAD 사본, 뒤 = 이번 변경):

| 시점 | draw call | 삼각형 |
|---|---|---|
| 성 베드로 피에타 close / normal | 82 → 81 / 87 → 85(사진 판이 빠짐) | 214k → 250k / 232k → 268k |
| 라테라노 성 베드로 close / normal | 170 → 171 / 173 → 174 | 407k → 424k / 407k → 424k |
| 라테라노 성 바오로 close / normal | 167 → 168 / 170 → 171 | 383k → 400k / 383k → 400k |
| 성 바오로 계단(베드로·바오로 둘 다 보임) close / normal | 207 → 209 / 212 → 214 | 290k → 312k / 290k → 312k |
| 성 바오로 십자가 경당 close / normal | 64 → 63 / 101 → 102 | 97k → 112k / 158k → 173k |
| 우리 본당 십자고상 close / normal | 136 → 137 / 148 → 149 | 230k → 245k / 231k → 246k |
| 피렌체 십자고상 close / normal | 94 → 95 / 105 → 103 | 218k → 233k / 244k → 259k |
| 명동 십자고상(천사 2 함께 보임) close / normal | 130 → 133 / 146 → 149 | 319k → 339k / 387k → 407k |
| 명동 천사 close·normal | 109 → 110, 110 → 111 | 272k → 282k |

보이는 성상마다 +1(같은 시점에서 스캔만 숨기면 정확히 그만큼 줄어든다). 절차 생성 상이 묶음에서 빠져 줄어든 몫이 있어 −가 되는 시점도 있다.

## 8. 2차 품질 손질 (2026-11-16, T-80 2차 — "얼굴도 없고 찌그러졌는데")

사용자 지적: 피에타의 성모·그리스도 얼굴이 흐린 덩어리, 군상 전체가 번들거리는 녹은 플라스틱 같고 대비가 낮다. 다섯 묶음 모두 같은 눈으로 다시 봤다.
진단은 중립 스튜디오(회색 배경, 매트 재질, 왼쪽 위 앞 키 라이트 — 헤드리스 Chromium)에서 원본 / 1차 묶음 / 새 묶음의 얼굴을 같은 카메라로 찍어 비교하고, 성당 안에서는 같은 자리에서 유리·재질을 하나씩 바꿔 찍었다.

원인(증거 순):
1. **단순화가 얼굴을 지웠다(모양 — 가장 큼).** 원본 스캔은 얼굴이 멀쩡하다(SMK 400k 도 성모의 눈·코·입이 읽히고, 티니에츠 베드로·바오로·천사도 그렇다). 1차 묶음은 meshopt `simplifyWithAttributes` 로 전체를 고르게 줄이면서
   법선 가중을 0.6 으로 줬다 — 스캔 잡음(작은 법선 요동)을 지키느라 모양 오차를 키웠고, 오차를 고르게 나누니 몸에 비해 작은 얼굴(피에타 성모 얼굴 ≈ 10cm)이 먼저 무너졌다.
   성 바오로 얼굴은 면이 깨진 덩어리, 베드로·천사는 각진 가면이 됐다('찌그러짐'). 같은 삼각형 수에서도 법선 가중 0.05 + `simplifyWithUpdate`(정점을 오차 최소 자리로 옮김)만으로 크게 나아지고,
   얼굴 구역에 몫을 따로 주면 원본과 거의 같다(바오로: 전체를 고르게 40k 보다 30k + 머리 9k 가 낫다; 피에타: 얼굴 구역 없이 36k 면 1.5M 원본에서도 성모 얼굴이 각진다).
2. **고해상도 법선을 살아남은 정점에 그대로 썼다.** 넓어진 저폴리 면과 법선이 어긋나 이마·뺨에 얼룩 같은 음영이 졌다 → 단순화 뒤 메쉬에서 다시 계산(모서리 각 가중).
3. **재질·조명이 굴곡을 지웠다(성당 안에서 가장 큼).** 거칠기 0.5 + 환경광 0.8 + 피에타 `emissive` → 고르게 밝은 번들거림('녹은 플라스틱'). 반구광·환경광뿐인 실내라 그늘이 없어 얼굴이 납작했다.
   새 기하에 옛 재질이면 성당 안 얼굴은 여전히 흐렸다 — 기하와 재질을 둘 다 고쳐야 했다.
4. **방탄유리 반사 막이 안개를 덮었다.** 피에타 정면에서 유리 막만 빼면 표준편차 64 → 77(대비 +20%), 평균 밝기 124 → 113(회색 막이 걷힘).
5. 양자화는 원인이 아니다: 위치 uint16 최대 오차 0.008–0.019mm, 1차의 법선 팔면체 12비트 오차 0.06°.

고친 것:
- `make_scan_pack.mjs`: `simplifyWithUpdate`(법선 가중 0.05), 설정 `detail`(얼굴 구, m)·`detailShare`(그 몫) — 얼굴 구 안은 따로 줄이고 경계 정점은 잠가 틈이 없다. 뒤집힌 삼각형 수(0–11)·양자화 오차를 로그로 남긴다.
  법선 스트림은 싣지 않는다(load() 가 근거리 메쉬에서 모서리 각 가중으로 계산 — 묶음이 약 30% 작아져 삼각형을 늘릴 여유가 됐다). 위치는 meshopt v1 부호화.
- 피에타 원본을 SMK 전체 해상도(`_full`, 1,498,118)로: 400k 도 얼굴이 있지만 1.5M 은 얼굴 구역 삼각형이 5배(성모·그리스도 얼굴 56k)라 같은 예산에서 더 또렷하다.
- 예산: 피에타 100k / 8k(얼굴 둘에 30%), 베드로·바오로 36k / 5k(머리에 30%), 천사 30k / 4k(30%), 십자고상 24k / 4k(25%).
- `scan3d.js` 재질: `marble` 거칠기 0.68·환경광 0.3·스스로 밝히기 없음, `marbleLit`(피에타 경당) 0.66·0.22. **열쇠 빛**: 성상 재질의 셰이더에만 더하는 부드러운 람베르트 빛
  (성상 지역 좌표로 왼쪽 위 앞, wrap 0.2–0.25; `marble` 1.0, 창 없는 피에타 경당 `marbleLit` 3.2) — 장면에 빛을 더하지 않으므로 다른 표면·그림자·draw call 은 그대로이고, 거울 천사는 빛도 거울이 된다.
  밤(21시)·저사양에서도 확인.
- `ch_stpeter.js`: 입체 피에타 앞의 방탄유리 반사 막을 뺐다(사진 판으로 돌아갈 때만 예전처럼). 난간이 들어갈 수 없음을 보인다.

결과: 다섯 묶음 모두 **남김**(얼굴이 원본에 가깝게 읽힌다 — 철회·사진 판 복귀 없음). 스케치팹 09_pieta_textured 같은 다른 원본은 필요 없었다.
draw call 은 그대로(피에타 close 81 → 80, 나머지 같음), 삼각형은 피에타 close 250k → 314k, 다른 자리 +8k–16k. 묶음 합계 1.0MB → 1.32MB(deflate 0.65 → 0.87MB).
남은 한계: 그리스도의 얼굴은 원작대로 뒤로 젖혀져 통로 눈높이에서는 턱·코 윤곽만 보인다(스캔·단순화 탓 아님). 미리 구운 AO 는 넣지 않았다(열쇠 빛과 새 법선으로 얼굴이 읽혀서) — 더 필요하면 다음 후보.

## 9. 빛의 대성당용 추가 수집 (2026-11-24)

사용자 요청: 「성당에 쓰는 저작권 없는 성상을 가져와라 — 3D 를 직접 만들기는 어렵다.」 새 가상 고딕 대성당(빛의 대성당)과 기존 성당에 쓸 모델을 더 모았다. 기준은 §1 그대로(CC0·퍼블릭 도메인·CC BY·CC BY-NC, SA·ND·유료 제외) + 조각 자체가 1900년 이전이거나 작가 사후 70년이 지난 것. AI 생성물·나체상은 넣지 않았다(아기 예수의 아기 모습은 예외).

- 새로 받은 것 **42점**, 777.7MB (`art/statue_handoff/received/`, 저장소에는 올리지 않음). 파일별 SHA-256·내려받기 주소는 `manifest.json` 의 `received`(R24~).
- 스케치팹에서 사용자가 받아 줄 것 **10점**(11~20번, `art/statue_handoff/README_ko.md`).
- 상태: **받음** = 받아 두었고 기준을 통과 · **보류** = 받아 두었지만 연도·라이선스 확인 전에는 쓰지 않음 · **사용자 요청** = 스케치팹 로그인이 필요해 사용자가 받아야 함.
- Zenodo 사본의 라이선스 표기는 믿지 않았다: 이번에 스케치팹 원본을 확인하니 Zenodo 에 CC BY·BY-NC 로 적힌 것 가운데 원본이 지금 Standard 나 BY-NC-SA 인 것이 여럿 있었다(아래 「쓰지 않는 것」).

### 마리아 (10점)

| 쓰임 | 제목 · 파일 | 만든이/박물관 | 원본 주소 | 라이선스 | 조각 연도·작가 | 삼각형 | 용량 | 상태 | 비고 |
|---|---|---|---|---|---|---|---|---|---|
| 성모자상(서 있는 자리·측면 제대) — 브뤼헤의 성모 | Jomfru Maria med Barnet, 'Brügge-Madonna' · `smk_KAS225_bruges_madonna_michelangelo_small.stl` | SMK | https://open.smk.dk/artwork/image/KAS225 | 퍼블릭 도메인 | 미켈란젤로(1564년 사망), 원작 1503~1505년경, 브뤼헤 성모 성당. 석고 주형 1897년 | 400,008 | 20.0MB | **받음** | 실제 작품의 주형. 높이 129cm. 아기 예수는 옷을 입지 않은 아기 모습 |
| 통고의 성모 좌상(십자가 경당·피에타 대안) | Siddende Jomfru Maria, Mater dolorosa · `smk_KAS1999_mater_dolorosa_seated_small.stl` | SMK | https://open.smk.dk/artwork/image/KAS1999 | 퍼블릭 도메인 | 1585년경, 파리 생트샤펠 뒤 팔레에 있던 상(지금 루브르). SMK 기록에 작가 이름 없음 | 400,012 | 20.0MB | **받음** | 높이 173cm, 두 손을 가슴에 모은 좌상 |
| 벽 부조 — 계단의 성모 | Jomfru Maria med Barnet, 'Trappe-Madonna' · `smk_KAS2358_madonna_of_the_stairs_relief_small.stl` | SMK | https://open.smk.dk/artwork/image/KAS2358 | 퍼블릭 도메인 | 미켈란젤로, 원작 1490~1492년경, 카사 부오나로티 | 398,349 | 19.9MB | **받음** | 56×40cm 얕은 부조 |
| 벽 원형 부조 — 톤도 피티(성모자와 어린 세례자 요한) | Jomfru Maria med Barnet og den unge Johannes Døber, 'Tondo Pitti' · `smk_KAS2202_tondo_pitti_relief_small.stl` | SMK | https://open.smk.dk/artwork/image/KAS2202 | 퍼블릭 도메인 | 미켈란젤로, 원작 1505년경, 바르젤로 | 399,996 | 20.0MB | **받음** | 지름 약 85cm |
| 원죄 없이 잉태되신 성모(지구와 뱀을 밟은 입상) | Maria Immaculata · `zenodo_maria_immaculata_seitzersdorf_noe3d.glb` | noe-3d.at | https://sketchfab.com/3d-models/d0d88725e0ea4665b31f7209c408c511 | CC BY-NC 4.0 | 1755년 세움(자이처스도르프-볼프파싱), 작가 미상 | 580,174 | 21.3MB | **받음** |  |
| 옥좌의 성모자(로마네스크·고딕 목조) | Kilcorban - Madonna - 13th C · `zenodo_madonna_kilcorban_galway3d.glb` | Galway3D_DH_AGe | https://sketchfab.com/3d-models/3ac1be94eb88452881e46feed43024f6 | CC0 1.0 | 12세기 말~13세기 초, 아일랜드 킬코번 | 699,050 | 21.3MB | **받음** | 채색 참나무 좌상 |
| 원죄 없이 잉태되신 성모(테라코타) | Immaculate Conception (Montemor-o-Novo) · `zenodo_immaculate_conception_montemor_gdh.glb` | Global Digital Heritage and GDH-Afrika | https://sketchfab.com/3d-models/1b9ed849648f491cae300108b19604e4 | CC BY-NC 4.0 | 18세기, 포르투갈 몬테모르오노보 상 도밍구스 박물관 | 3,999,999 | 12.5MB | **받음** | Zenodo 의 `_normalized` 판(압축, 4백만 삼각형 — 크게 줄여 써야 한다) |
| 통고의 성모(고딕 목조) | Sculpture “Our Lady of Sorrows” · `zenodo_our_lady_of_sorrows_biecz_malopolska.glb` | Virtual Museums of Małopolska | https://sketchfab.com/3d-models/e601c914626e422c83ca161bb300b0f0 | CC0 1.0 | 15세기, 비에치 지방 박물관 AH/1282 | 55,426 | 6.7MB | **받음** | 십자가 아래 성모 — 십자고상 옆 자리 |
| 고딕 성모자 입상(정문 중앙 기둥) — 파리 노트르담 성모의 문 | Notre-Dame de Paris - Virgin Mary · `zenodo_virgin_notre_dame_paris_portal.glb` | Benoît Rogez | https://sketchfab.com/3d-models/b5bbdc379daa4ee19e3775bb179dbcc1 | CC BY-NC 4.0 | 13세기 문. 스캔 설명에는 「성모의 문 일부」라고만 있다 — 중앙 기둥 성모자상이라면 19세기 복원상(1900년 이전) | 1,001,053 | 31.8MB | **받음** | 어느 부분인지 띄워서 확인할 것. 복원 조각가 이름은 확인하지 못했다 |
| 왕관 쓴 고딕 성모자(석회암) | Madonna and Child in stone · `zenodo_madonna_and_child_stone_hunt_museum.glb` | The Hunt Museum | https://sketchfab.com/3d-models/1eab9e29e5b74f5686c0d17fe58d90c4 | CC BY 4.0 | 14~15세기, 부르고뉴(헌트 박물관 HCM 031) | 1,000,000 | 32.0MB | **받음** | 아기 예수 윗몸이 없어졌다 |

### 천사 (9점)

| 쓰임 | 제목 · 파일 | 만든이/박물관 | 원본 주소 | 라이선스 | 조각 연도·작가 | 삼각형 | 용량 | 상태 | 비고 |
|---|---|---|---|---|---|---|---|---|---|
| 촛대를 든 무릎 꿇은 천사(제대 옆) — 미켈란젤로 | Angel with candlestick · `zenodo_angel_with_candlestick_michelangelo_cast_stw.glb` | Scan-the-World | https://zenodo.org/records/20166092 | CC0 1.0 (Zenodo record only — original not verified) | 미켈란젤로, 1494~1495년, 볼로냐 산 도메니코 성당 성 도미니코의 무덤. 석고 주형 스캔 | 1,287,326 | 16.9MB | **보류** | Scan the World 사본. Zenodo 기록은 cc-zero 이지만 원본(MyMiniFactory)을 열 수 없어 확인 못 함 — 확인 전 사용 보류 |
| 서 있는 천사(묘지 천사상) | Engel · `zenodo_angel_st_marx_cemetery_noe3d.glb` | noe-3d.at | https://sketchfab.com/3d-models/0d54d997ca3e4e2cb46141708bb82015 | CC0 1.0 | 1874년 이전(빈 장크트 마르크스 묘지는 1874년 폐쇄) | 528,998 | 18.5MB | **받음** |  |
| 아기 천사 | Engel · `zenodo_angel_child_maria_lanzendorf_noe3d.glb` | noe-3d.at | https://sketchfab.com/3d-models/afb2365680ee45769d607b310d1008af | CC BY-NC 4.0 | 18세기 초, 마리아 란첸도르프 갈바리아 | 515,206 | 17.8MB | **받음** |  |
| 고딕 대천사 가브리엘(성모 영보 군상) | 1954.387 The Archangel Gabriel · `zenodo_archangel_gabriel_cleveland_1954_387.glb` | Cleveland Museum of Art | https://sketchfab.com/3d-models/bba5bad5a0704a0e880821ccb99951cc | CC0 1.0 | 1350년경, 파리. 클리블랜드 미술관 1954.387 | 60,000 | 4.4MB | **받음** | 설화석고, 높이 약 37cm 의 작은 상 — 키워서 쓸 수 있다 |
| 성작을 든 천사 | Angel Holding a Chalice · `zenodo_angel_holding_chalice_brittany_kenyon.glb` | kenyon-vrc | https://sketchfab.com/3d-models/237a98641dd142109353e11288157edf | CC BY 4.0 | 16세기 말, 브르타뉴 피니스테르 | 173,201 | 6.5MB | **받음** | 돌 조각 |
| 신고딕 천사 입상 — 띠 두루마리 | 170 Sint-Jan, engel met banderol (1) · `zenodo_angel_banderole_sint_jan_1872.glb` | Erfgoed 's-Hertogenbosch | https://sketchfab.com/3d-models/845ce8b196f84794b647cc4e042ea48e | CC BY 4.0 | 1872년(명문), 스헤르토헨보스 성 요한 대성당 북쪽 측랑 | 240,579 | 11.7MB | **받음** | 신고딕 사암상. 한 벌 4점 가운데 하나 |
| 신고딕 천사 입상 — 방패 | 171 Sint-Jan, engel met schild · `zenodo_angel_shield_sint_jan_1873.glb` | Erfgoed 's-Hertogenbosch | https://sketchfab.com/3d-models/9c4f095ca8ef461494df0e3270867c71 | CC BY 4.0 | 1873년(명문), 스헤르토헨보스 성 요한 대성당 | 396,646 | 13.3MB | **받음** |  |
| 신고딕 천사 입상 — 칼 | 167 Sint-Jan, engel met zwaard · `zenodo_angel_sword_sint_jan.glb` | Erfgoed 's-Hertogenbosch | https://sketchfab.com/3d-models/dade17e251ad49698c58d24ae87c0ea0 | CC BY 4.0 | 19세기 4/4분기, 스헤르토헨보스 성 요한 대성당 | 350,913 | 11.6MB | **받음** |  |
| 신고딕 천사 입상 — 묵주 | 227 Sint-Jan, engel met rozenkrans · `zenodo_angel_rosary_sint_jan.glb` | Erfgoed 's-Hertogenbosch | https://sketchfab.com/3d-models/7aacea03a32740ca87c23b7939b49c8f | CC BY 4.0 | 19세기 4/4분기, 스헤르토헨보스 성 요한 대성당 | 200,939 | 9.1MB | **받음** | 묵주를 든 천사 — 로사리움에 잘 맞는다 |

### 성인 (8점)

| 쓰임 | 제목 · 파일 | 만든이/박물관 | 원본 주소 | 라이선스 | 조각 연도·작가 | 삼각형 | 용량 | 상태 | 비고 |
|---|---|---|---|---|---|---|---|---|---|
| 세례자 요한 입상(세례대 옆) | Johannes Døberen · `smk_KAS446_john_baptist_siena_small.stl` | SMK | https://open.smk.dk/artwork/image/KAS446 | 퍼블릭 도메인 | 도나텔로(1466년 사망), 1457년, 시에나 대성당 | 400,016 | 20.0MB | **받음** | 높이 189cm, 청동 원작의 주형. SMK 기록에 작가 이름은 없고 원작 정보만 있다 |
| 모세 좌상(벽감·경당) | Moses · `smk_KAS243_moses_michelangelo_small.stl` | SMK | https://open.smk.dk/artwork/image/KAS243 | 퍼블릭 도메인 | 미켈란젤로, 1513~1514년, 로마 산 피에트로 인 빈콜리 | 400,060 | 20.0MB | **받음** | 높이 249cm |
| 벽감 부조 — 성 예로니모 | Den hellige Hieronymus · `smk_DEP36_st_jerome_bregno_relief_small.stl` | SMK | https://open.smk.dk/artwork/image/DEP36 | 퍼블릭 도메인 | 안드레아 브레뇨(1503년 사망) | 400,006 | 20.0MB | **받음** | 95×41cm 대리석 부조 원작. 세례자 요한(DEP35)과 한 쌍 |
| 벽감 부조 — 세례자 요한 | Johannes Døberen · `smk_DEP35_john_baptist_bregno_relief_small.stl` | SMK | https://open.smk.dk/artwork/image/DEP35 | 퍼블릭 도메인 | 안드레아 브레뇨(1503년 사망) | 400,000 | 20.0MB | **받음** | 95×41cm |
| 파도바의 성 안토니오 | Hl. Antonius · `zenodo_st_anthony_padua_trausdorf_noe3d.glb` | noe-3d.at | https://sketchfab.com/3d-models/3a9e6927c57345a6a7f335e3709496ae | CC BY 4.0 | 1720년, 트라우스도르프 성 라우렌시오 성당 옆 | 510,118 | 18.6MB | **받음** | 기둥 위 바로크 석상 |
| 성녀 베로니카(성 베드로 대성전 베로니카 기둥 대용) | Saint Veronica · `zenodo_saint_veronica_tyniec.glb` | Virtual Museums of Małopolska | https://sketchfab.com/3d-models/404e75841ed3456aacae757a9fcd085e | CC0 1.0 | 18세기 3/4분기, 티니에츠 수도원 RZ/8/2017 | 337,606 | 17.7MB | **받음** | 받아 둔 성 론지노와 같은 수도원 것 |
| 성 베드로(노팅엄 설화석고) | S. Pedro / St. Peter · `zenodo_st_peter_nottingham_alabaster_morbase.glb` | Morbase | Museu Virtual | https://sketchfab.com/3d-models/8bfeb8018fe9443b86dd74397ac6a5d7 | CC0 1.0 | 15세기 1/4분기(노팅엄 설화석고), 포르투갈 Morbase 가상 박물관 | 350,098 | 16.0MB | **받음** | 채색 흔적 |
| 기둥 사도상 한 쌍 — 성 야고보와 성 요한 | Cámara Santa de Oviedo: Santiago y San Juan · `zenodo_apostles_james_john_oviedo_camara_santa.glb` | Pablo Serrano Basterra | https://sketchfab.com/3d-models/e5a926bcdfef467aa2d0644642c7e2d9 | CC BY 4.0 | 12세기 말, 오비에도 카마라 산타 | 480,842 | 15.6MB | **받음** | 기둥에 붙은 로마네스크 사도 쌍 — 신랑 기둥·문설주에 맞는다 |

### 그리스도 (2점)

| 쓰임 | 제목 · 파일 | 만든이/박물관 | 원본 주소 | 라이선스 | 조각 연도·작가 | 삼각형 | 용량 | 상태 | 비고 |
|---|---|---|---|---|---|---|---|---|---|
| 강복하시는 그리스도(고딕 목조) | Christ blessing · `zenodo_christ_blessing_malopolska.glb` | Virtual Museums of Małopolska | https://sketchfab.com/3d-models/888f4046cdf645acb23f6bdd192e8131 | CC0 1.0 | 15~16세기, 티니에츠 수도원 RZ/3/2012 | 359,700 | 18.7MB | **받음** | 오른팔 아래가 떨어져 나갔다 |
| 피에타(바로크 채색) | Pietà · `zenodo_pieta_seefeld_kadolz_1745_noe3d.glb` | noe-3d.at | https://sketchfab.com/3d-models/2ab91ee0f13a4e4fb7942208850aafa4 | CC BY-NC 4.0 | 1745년, 제펠트-카돌츠 | 556,820 | 21.0MB | **받음** | 왕관 쓴 성모 |

### 정면·문 (8점)

| 쓰임 | 제목 · 파일 | 만든이/박물관 | 원본 주소 | 라이선스 | 조각 연도·작가 | 삼각형 | 용량 | 상태 | 비고 |
|---|---|---|---|---|---|---|---|---|---|
| 정면 문설주 고딕 입상 — 에클레시아(교회) | Ecclesia sancta, Den sejrende kristendom med korsstav · `smk_KAS396_ecclesia_strasbourg_small.stl` | SMK | https://open.smk.dk/artwork/image/KAS396 | 퍼블릭 도메인 | 1230년경, 스트라스부르 대성당 남쪽 문. 작가 미상 | 400,060 | 20.0MB | **받음** | 높이 202cm, 십자가 지팡이와 성작을 든 왕관 쓴 여인. 짝인 시나고가(KAS397)는 받지 않았다 |
| 정면 문설주 고딕 입상 — 예언자 다니엘 | Profeten Daniel med skriftrulle · `smk_KAS52-1_prophet_daniel_freiberg_small.stl` | SMK | https://open.smk.dk/artwork/image/KAS52/1 | 퍼블릭 도메인 | 1200~1250년경, 프라이베르크 대성당 황금 문. 작가 미상 | 400,036 | 20.0MB | **받음** | 높이 131cm. 솔로몬·스바 여왕과 한 벌 |
| 정면 문설주 고딕 입상 — 스바의 여왕 | Dronningen af Saba med krone og opslået skriftrulle · `smk_KAS52-2_queen_of_sheba_freiberg_small.stl` | SMK | https://open.smk.dk/artwork/image/KAS52/2 | 퍼블릭 도메인 | 1200~1250년경, 프라이베르크 대성당 황금 문 | 400,010 | 20.0MB | **받음** | 높이 131cm |
| 정면 문설주 고딕 입상 — 솔로몬 왕 | Kong Salomon med krone, scepter og skriftrulle · `smk_KAS52-3_king_solomon_freiberg_small.stl` | SMK | https://open.smk.dk/artwork/image/KAS52/3 | 퍼블릭 도메인 | 1200~1250년경, 프라이베르크 대성당 황금 문 | 400,024 | 20.0MB | **받음** | 높이 131cm |
| 정면 문 위 팀파눔 — 최후의 심판 | Dommedag · `smk_KAS1964_last_judgment_tympanum_bamberg_small.stl` | SMK | https://open.smk.dk/artwork/image/KAS1964 | 퍼블릭 도메인 | 1240년경, 밤베르크 대성당 군주의 문. 작가 미상 | 400,100 | 20.0MB | **받음** | 157×301cm 반원 부조. 고딕 대성당 정문에 그대로 맞는다 |
| 문 위 반원 부조 — 십자가에서 내리심 | Nedtagelsen af korset · `smk_KAS2351_deposition_lucca_relief_small.stl` | SMK | https://open.smk.dk/artwork/image/KAS2351 | 퍼블릭 도메인 | 1260~1265년, 루카 산 마르티노 대성당 | 400,000 | 20.0MB | **받음** | 94×172cm |
| 문 위 팀파눔 — 베드로에게 열쇠를 주심 | Tympanum on Church of St. Peter, Prague · `zenodo_tympanum_st_peter_prague_1876.glb` | madbert | https://sketchfab.com/3d-models/b0c21ad8a3c848ae98b50394c82ac67d | CC BY 4.0 | 루드비크 시메크(1886년 사망), 1876년, 프라하 성 베드로 성당 | 998,909 | 30.7MB | **받음** | 신고딕 |
| 고딕 막힌 문(첨두 아치 문틀) | Blind Gothic Portal · `zenodo_blind_gothic_portal_musilek.glb` | Tomáš Musílek | https://sketchfab.com/3d-models/e96d09d70b8648319d56760978f72b63 | CC BY 4.0 | 제작 연도 미확인(체코, 중세 석조 문틀) | 500,000 | 16.2MB | **받음** | 장식 없는 건축 부재라 조각 저작권 문제는 없다고 본다 |

### 전례 가구 (5점)

| 쓰임 | 제목 · 파일 | 만든이/박물관 | 원본 주소 | 라이선스 | 조각 연도·작가 | 삼각형 | 용량 | 상태 | 비고 |
|---|---|---|---|---|---|---|---|---|---|
| 강론대 부조판 — 동방 박사의 경배 | Kongernes tilbedelse · `smk_KAS2032_adoration_magi_siena_pulpit_relief_small.stl` | SMK | https://open.smk.dk/artwork/image/KAS2032 | 퍼블릭 도메인 | 니콜라 피사노 공방, 1265~1269년, 시에나 대성당 강론대 | 400,100 | 20.0MB | **받음** | 96×93cm |
| 강론대 부조판 — 성전 봉헌과 이집트 피신 | Fremstillingen i templet og flugten til Egypten · `smk_KAS2033_presentation_flight_siena_pulpit_relief_small.stl` | SMK | https://open.smk.dk/artwork/image/KAS2033 | 퍼블릭 도메인 | 니콜라 피사노 공방, 1265~1269년, 시에나 대성당 강론대 | 400,100 | 20.0MB | **받음** | 97×97cm |
| 돌 강론대(네 복음사가 부조) | Kanzel · `zenodo_pulpit_burgschleinitz_noe3d.glb` | noe-3d.at | https://sketchfab.com/3d-models/d9ca289b094d4f1e913a4f958c39ce85 | CC BY 4.0 | 1580년경, 부르크슐라이니츠 납골당 바깥 강론대 | 507,289 | 19.4MB | **받음** |  |
| 세례대 | Taufbecken · `zenodo_baptismal_font_pillichsdorf_noe3d.glb` | noe-3d.at | https://sketchfab.com/3d-models/93811784ac6a480d977cb9be3138728a | CC BY 4.0 | 1649년, 필리히스도르프 성 마르티노 본당. 아드네트 대리석 | 488,540 | 18.6MB | **받음** | 나무 뚜껑 위에 세례 장면 |
| 고딕 강론대 — 멘도사 강론대 | Pulpit of Mendoza, Sigüenza · `zenodo_pulpit_mendoza_siguenza_gdh.glb` | Global Digital Heritage and GDH-Afrika | https://sketchfab.com/3d-models/6ae513013b3d4802baabe88ba6346c5b | CC BY-NC 4.0 | 15세기 말, 시구엔사 대성당. 설화석고 | 1,101,653 | 29.8MB | **받음** | Zenodo 사본의 줄인 판 |

### 스케치팹에서 사용자가 받아 줄 것 (11~20번)

| 번호 | 쓰임 | 모델 | 만든이 | 라이선스 | 조각 연도·작가 | 면 | 주소 | 상태 |
|---|---|---|---|---|---|---|---|---|
| 11 (필수) | 빛의 대성당 — 주 성모자상(고딕 「아름다운 성모」) | Madonna of Krużlowa | Virtual Museums of Małopolska | CC BY 4.0 | 1410년경, 크루즐로바 본당(지금 크라쿠프 국립박물관). 작가 미상 | 564,938 | https://sketchfab.com/3d-models/597d14d7e6ec46a8a0becdf57dd6dbec | **사용자 요청** |
| 12 (필수) | 제대 양옆 무릎 꿇은 경배 천사 | Engel (Stronsdorf) | noe-3d.at | CC BY-NC 4.0 | 1826년, 슈트론스도르프 흑사병 기둥의 무릎 꿇은 천사 4점 가운데 하나 | 567,806 | https://sketchfab.com/3d-models/4da4a29f59e142af86b8fbdc7aff818c | **사용자 요청** |
| 13 (필수) | 성 요셉과 아기 예수 | Hl. Josef (Wolkersdorf) | noe-3d.at | CC BY-NC 4.0 | 1727년, 볼커스도르프 성당 계단. 작가 미상 | 622,794 | https://sketchfab.com/3d-models/067f62dda6ac4348a94581ade6e9f274 | **사용자 요청** |
| 14 | 아시시의 성 프란치스코 | Hl. Franziskus (Heiligenkreuz) | noe-3d.at | CC BY-NC 4.0 | 18세기 전반(십자가의 길 1731~1748), 하일리겐크로이츠 수도원 | 621,324 | https://sketchfab.com/3d-models/3eb9029e6a45485aa25425b10f4b5a3f | **사용자 요청** |
| 15 | 신랑 기둥 사도상(고딕) | Nürnberger Tonapostel, um 1420 / Pl.O.234 | Germanisches Nationalmuseum | CC BY 4.0 | 1420년경, 뉘른베르크 점토 사도상 9점 가운데 하나. 작가 미상 | 630,083 | https://sketchfab.com/3d-models/418484f48ef14723865d76dcbcad45fb | **사용자 요청** |
| 16 | 정면 정문(신고딕 문 전체 — 그리스도 왕과 사도들) | Portal Votivkirche | noe-3d.at | CC BY-NC 4.0 | 1856~1879년 빈 봉헌 성당. 요하네스 벵크(1914년 사망), 요제프 가서(1900년 사망) | 1,282,539 | https://sketchfab.com/3d-models/ee5583b262bc4f088e402d50fa7ee22f | **사용자 요청** |
| 17 | 아빌라의 성녀 데레사 | Hl. Theresia | noe-3d.at | CC BY 4.0 | 18세기 전반, 요제프 슈니처(1706~1769), 하일리겐크로이츠 수도원 | 496,782 | https://sketchfab.com/3d-models/7d9a15d5495c40dc9548ead778422f67 | **사용자 요청** |
| 18 | 성 요셉(예비) | Hl. Joseph | noe-3d.at | CC BY-NC 4.0 | 18세기 전반, 요제프 슈니처 작으로 전함 | 651,768 | https://sketchfab.com/3d-models/38098e2ebcef4e998d1ab62154e57b68 | **사용자 요청** |
| 19 | 후기 고딕 성모상(예비) | Madona Sculpture | jan.zachar | CC BY 4.0 | 후기 고딕, 슬로바키아 레보차(설명에 연도 없음) | 375,409 | https://sketchfab.com/3d-models/5e16f3cd478e4c8cb32dede7446a83fb | **사용자 요청** |
| 20 | 사도 유다 타대오(신랑 기둥·벽감) | Hl. Judas Thaddäus | noe-3d.at | CC BY-NC 4.0 | 18세기 전반, 클라인슈바인바르트 성모 본당 앞 | 594,962 | https://sketchfab.com/3d-models/2cb9b7c61cea469b9628d62c9fe289aa | **사용자 요청** |

### 로그인 없이 받을 수 있지만 디스크 때문에 미룬 것

기기 여유 공간이 2.9GB 뿐이라 새로 받는 양을 800MB 아래로 묶었다. 아래는 기준을 통과했고 Zenodo·SMK 에서 바로 받을 수 있다 — 자리가 정해지면 받는다.

- Madonna z Dzieciątkiem Jezus (프롬보르크 대성당, 1690년 바로크 채색 목조) — Muzeum Pomnika Historii Frombork Zespół Katedralny — CC BY 4.0 — https://zenodo.org/records/10328901 (41MB)
- Engel (라 안 데어 타야 삼위일체 기둥, 1710년) — noe-3d.at — CC BY-NC 4.0 — https://zenodo.org/records/21530022 (27MB)
- Engel (마리아 란첸도르프 갈바리아, 18세기 초) — noe-3d.at — CC BY-NC 4.0 — https://zenodo.org/records/21569723 (17MB)
- Hl. Franz Xaver (18세기 전반) — noe-3d.at — CC BY 4.0 — https://zenodo.org/records/21646406 (14MB)
- Hl. Ulrich von Augsburg (18세기 후반, 프란츠 제겐) — noe-3d.at — CC0 — https://zenodo.org/records/21570067 (20MB)
- The Prophet Simeon (목조) — Virtual Museums of Małopolska — CC0 — https://zenodo.org/records/21530934 (40MB)
- Kilcorban - St Catherine - 15th C — Galway3D — CC0 — https://zenodo.org/records/10305800 (24MB)
- St John the Baptist Statue (15세기 석회암, 런던 성 요한 기사단 박물관) — artfletch — CC BY 4.0 — https://zenodo.org/records/10233978 (34MB)
- Small Gothic Portal - Sv Jindrich, Prague — Tomáš Musílek — CC BY 4.0 — https://zenodo.org/records/10387617 (16MB)
- Pietà (홀라브룬, 1788년) — noe-3d.at — CC BY-NC 4.0 — https://zenodo.org/records/21488331 (19MB)
- Sculpture of Virgin Mary, St John, Mary Magdalen (참나무 군상) — The Hunt Museum — CC BY 4.0 — https://zenodo.org/records/21529733 (22MB)
- Figure Of Christ (라임나무) — The Hunt Museum — CC0 — https://zenodo.org/records/21355269 (46MB)
- Main portal of St. Matthias in Trier (수도원 성당 정문) — netgis — CC BY-NC(Zenodo 표기 — 원본 확인 필요) — https://zenodo.org/records/10358113 (130MB)
- Lectern (15세기 참나무 독서대, 헌트 박물관) — The Hunt Museum — CC BY 4.0 — https://zenodo.org/records/21291699 (35MB)
- Altarpiece of Saint John and Saint Catherine (15세기 전반, 시구엔사 대성당) — Global Digital Heritage — CC BY-NC 4.0 — https://zenodo.org/records/21370194 (31MB)
- Hl. Aloisius von Gonzaga (18세기 후반, 프란츠 크사버 제겐) — noe-3d.at — CC0 — https://zenodo.org/records/21290906 (21MB)
- SMK 미켈란젤로 메디치의 성모 KAS114 · 톤도 타데이 KAS85 · 론다니니 피에타 KAS2361, 도나텔로 성 제오르지오 KAS82, 피렌체 대성당 성가대 칸막이 예언자 부조 KAS1690·KAS1691 — SMK — 퍼블릭 도메인 — https://open.smk.dk (각 20MB)
- SMK 고딕 머리 4점(스트라스부르 대성당 동방 박사·어리석은 처녀들 KAS1455~1459), 시나고가 KAS397, 마인츠 주교 묘비 부조 KAS1704, 어린 세례자 요한 KAS465 — SMK — 퍼블릭 도메인 — https://open.smk.dk (각 20MB)

### 쓰지 않는 것 (이번에 확인)

- Standing Virgin with Child (1380년경 사암, 브뤼셀) · Baptismal Angel kneeling(토르발센 1827~28) · Angel with a calice(크벨리누스) · Engel(토르발센 1830) — Geoffrey Marchal — Zenodo 사본은 CC BY/BY-NC 로 적혀 있지만 스케치팹 원본이 지금 Standard(유료용 표준) 라이선스 → 쓰지 않음
- The Virgin and Child(1225~50) · figure of Virgin Mary(1425) · St. Michael the Archangel ×2 · The Apostle James the Elder · Mary and John the Evangelist · Bishop saint · 제대 장식 3점 — Geoffrey Marchal — 스케치팹 원본이 CC BY-NC-SA → 쓰지 않음(SA)
- Immaculate Conception (포르투 주교관, 17세기) — Arnadi Murtiyoso — 스케치팹 원본이 Standard → 쓰지 않음
- Scan the World 의 Enthroned Madonna 등 Zenodo 사본 대부분 — CC BY-NC-SA → 쓰지 않음
- Hl. Michael (클링엔바흐, 1959년 보르톨로티 공방) — 20세기 작 → 보류
- Hl. Johannes · Hl. Matthäus (락센부르크), Hl. Michael (부르크슐라이니츠), Engel (빈 중앙묘지, CC0), Grabfigur 무릎 꿇은 천사 — 제작 연도 미확인 → 보류(받지 않음)
- Sculpture “Madonna and Child”(바벨 왕궁) · Sculpture “Christ Resurrected”(미실레니체) · Crucifix(크라쿠프 고고학 박물관) · Candlestick with the Crucifixion and baptism(노비 송치) — 마워폴스카 CC0, Heilige Familie(파른도르프, noe-3d.at BY-NC), San Francesco - Sculpture(발 디 사소, CC BY) — 제작 연도 미확인 → 보류(받았다가 디스크 때문에 지움 — 연도가 확인되면 Zenodo 에서 다시 받는다)
- Big Christian Candlestick (파리 생메리, 19세기) — 스케치팹 원본 라이선스 표기가 비어 있음 → 쓰지 않음

### 찾지 못한 것

- **열두 사도 한 벌**: 한 벌로 맞는 것은 없다. 조각 맞추기: SMK 사도 부조 4점(이미 받음) + 오비에도 기둥 사도 쌍(야고보·요한) + 뉘른베르크 점토 사도(15번) + noe-3d 낱개 사도(유다 타대오 20번, 받아 둔 티니에츠 베드로·바오로).
- **리지외의 성녀 데레사(소화 데레사)**: 1925년 시성이라 상이 모두 20세기 작 — 작가 사후 70년이 확인된 것이 없다. 아빌라의 데레사(17번)만 있다.
- **예수 성심상**: 연도가 확인된 1900년 이전 스캔은 이번에도 없다(받아 둔 보르톨로티 Christusfigur 는 연도 미확인 그대로).
- **착한 목자 그리스도**: 헌트 박물관의 작은 상아상(CC0)뿐 — 성당 크기 상으로는 맞지 않아 받지 않았다.
- **대천사 미카엘**: 고딕 목조 2점은 NC-SA, 석상은 1959년 작이거나 연도 미확인.
- **아기 예수를 안은 성 안토니오**: 1720년 바로크 석상 한 점만(받음).
- **성가대석, 제대 뒤 장식벽(레레도스), 첨탑 꼭대기 장식(피니얼), 고딕 제대 촛대**: 쓸 수 있는 스캔 없음 — 절차 생성 그대로.

### 이번에 찾아본 곳

| 출처 | 결과 |
|---|---|
| SMK Open (`api.smk.dk`) | 3D 파일 있는 373점을 전부 훑어 종교 조각 22점을 더 받음(작은 판 STL, 각 20MB) |
| Zenodo `3dbigdataspace` | 손님은 한 쪽 25건 제한. 제목 검색(madonna·maria·engel·hl.·apostle·christ·crucifix·pulpit·gothic …)으로 약 1,370건을 모아 고름. 원본 라이선스는 스케치팹 API 로 다시 확인 |
| 스케치팹 | 검색·상세 API 만 열림 → 11~20번을 사용자에게 요청 |
| noe-3d.at, 마워폴스카 가상 박물관 | 사이트는 열리지만 모델은 스케치팹으로만 내려받는다(로그인) → Zenodo 사본을 씀 |
| Smithsonian 3D | 200, 가톨릭 성상 없음(그대로) |
| MyMiniFactory(Scan the World) | 403 — 한 번 시도하고 중단 |
| Europeana | 401 — API 키 필요 |
| Wikimedia Commons | 429 — 한 번 시도하고 중단 |
| Met, Rijksmuseum | 410 — 열려 있던 API 가 응답하지 않음. 한 번 시도하고 중단 |

### 주의

1. SMK 파일은 질감 없는 STL 이다(§4-5 와 같음). 부조(톤도·팀파눔·강론대 판)는 뒷면이 평평해 벽·문 위에 그대로 붙일 수 있다.
2. 미켈란젤로 촛대 천사(Scan the World 사본)는 Zenodo 표기만 cc-zero 이고 원본 쪽을 열 수 없어 **보류**했다. 원작과 주형은 문제없으니, MyMiniFactory 원본 표기만 확인되면 쓸 수 있다.
3. 스헤르토헨보스 성 요한 대성당 신고딕 천사 4점(1872~73년)은 한 벌이라 신랑 기둥에 나란히 세우기 좋다. 조각가 이름은 스캔 설명에 없다 — 1900년 이전이라 기준은 통과.
4. 파리 노트르담 성모의 문 성모자상은 19세기 복원상이다. 안내문에 「13세기」로 쓰지 않는다.
5. 연도 미확인인 것(바벨 성모자, 발 디 사소 성 프란치스코, 파른도르프 성가정, 미실레니체 부활 그리스도, 크라쿠프 십자고상, 노비 송치 촛대)은 받지 않았다 — 「쓰지 않는 것」 참고.
6. Zenodo 사본에는 줄인 판이 함께 있다. 받은 것은 원본 업로드(`<uid>.glb`)이고, 원본이 46MB 를 넘는 두 점(멘도사 강론대, 몬테모르 성모)만 Zenodo 의 `_normalized` 판이다(manifest `variant`).
7. **아직 화면에 띄워 보지 않았다.** 이번에는 설명·라이선스·파일 크기·삼각형 수(GLB/STL 머리 정보)만 확인했다. 앱에 넣기 전에 한 점씩 띄워 모양(깨진 곳, 함께 스캔된 배경, 옷차림)을 본다.

### 앱에 표시할 출처 문구 (쓰게 되면 넣는다)

- Jomfru Maria med Barnet, 'Brügge-Madonna' — 3D scan: SMK (Statens Museum for Kunst), KAS225, public domain, open.smk.dk
- Siddende Jomfru Maria, Mater dolorosa — 3D scan: SMK (Statens Museum for Kunst), KAS1999, public domain, open.smk.dk
- Jomfru Maria med Barnet, 'Trappe-Madonna' — 3D scan: SMK (Statens Museum for Kunst), KAS2358, public domain, open.smk.dk
- Jomfru Maria med Barnet og den unge Johannes Døber, 'Tondo Pitti' — 3D scan: SMK (Statens Museum for Kunst), KAS2202, public domain, open.smk.dk
- Ecclesia sancta, Den sejrende kristendom med korsstav — 3D scan: SMK (Statens Museum for Kunst), KAS396, public domain, open.smk.dk
- Profeten Daniel med skriftrulle — 3D scan: SMK (Statens Museum for Kunst), KAS52/1, public domain, open.smk.dk
- Dronningen af Saba med krone og opslået skriftrulle — 3D scan: SMK (Statens Museum for Kunst), KAS52/2, public domain, open.smk.dk
- Kong Salomon med krone, scepter og skriftrulle — 3D scan: SMK (Statens Museum for Kunst), KAS52/3, public domain, open.smk.dk
- Dommedag — 3D scan: SMK (Statens Museum for Kunst), KAS1964, public domain, open.smk.dk
- Kongernes tilbedelse — 3D scan: SMK (Statens Museum for Kunst), KAS2032, public domain, open.smk.dk
- Fremstillingen i templet og flugten til Egypten — 3D scan: SMK (Statens Museum for Kunst), KAS2033, public domain, open.smk.dk
- Nedtagelsen af korset — 3D scan: SMK (Statens Museum for Kunst), KAS2351, public domain, open.smk.dk
- Johannes Døberen — 3D scan: SMK (Statens Museum for Kunst), KAS446, public domain, open.smk.dk
- Moses — 3D scan: SMK (Statens Museum for Kunst), KAS243, public domain, open.smk.dk
- Den hellige Hieronymus — 3D scan: SMK (Statens Museum for Kunst), DEP36, public domain, open.smk.dk
- Johannes Døberen — 3D scan: SMK (Statens Museum for Kunst), DEP35, public domain, open.smk.dk
- "Maria Immaculata" by noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/d0d88725e0ea4665b31f7209c408c511 — 수정함(삼각형 수 줄임, 재질 변경)
- "Kilcorban - Madonna - 13th C" by Galway3D_DH_AGe — CC0 1.0 — https://sketchfab.com/3d-models/3ac1be94eb88452881e46feed43024f6
- "Immaculate Conception (Montemor-o-Novo)" by Global Digital Heritage and GDH-Afrika — CC BY-NC 4.0 — https://sketchfab.com/3d-models/1b9ed849648f491cae300108b19604e4 — 수정함(삼각형 수 줄임, 재질 변경)
- "Sculpture “Our Lady of Sorrows”" by Virtual Museums of Małopolska — CC0 1.0 — https://sketchfab.com/3d-models/e601c914626e422c83ca161bb300b0f0
- "Notre-Dame de Paris - Virgin Mary" by Benoît Rogez — CC BY-NC 4.0 — https://sketchfab.com/3d-models/b5bbdc379daa4ee19e3775bb179dbcc1 — 수정함(삼각형 수 줄임, 재질 변경)
- "Engel" by noe-3d.at — CC0 1.0 — https://sketchfab.com/3d-models/0d54d997ca3e4e2cb46141708bb82015
- "Engel" by noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/afb2365680ee45769d607b310d1008af — 수정함(삼각형 수 줄임, 재질 변경)
- "1954.387 The Archangel Gabriel" by Cleveland Museum of Art — CC0 1.0 — https://sketchfab.com/3d-models/bba5bad5a0704a0e880821ccb99951cc
- "Angel Holding a Chalice" by kenyon-vrc — CC BY 4.0 — https://sketchfab.com/3d-models/237a98641dd142109353e11288157edf — 수정함(삼각형 수 줄임, 재질 변경)
- "170 Sint-Jan, engel met banderol (1)" by Erfgoed 's-Hertogenbosch — CC BY 4.0 — https://sketchfab.com/3d-models/845ce8b196f84794b647cc4e042ea48e — 수정함(삼각형 수 줄임, 재질 변경)
- "171 Sint-Jan, engel met schild" by Erfgoed 's-Hertogenbosch — CC BY 4.0 — https://sketchfab.com/3d-models/9c4f095ca8ef461494df0e3270867c71 — 수정함(삼각형 수 줄임, 재질 변경)
- "167 Sint-Jan, engel met zwaard" by Erfgoed 's-Hertogenbosch — CC BY 4.0 — https://sketchfab.com/3d-models/dade17e251ad49698c58d24ae87c0ea0 — 수정함(삼각형 수 줄임, 재질 변경)
- "227 Sint-Jan, engel met rozenkrans" by Erfgoed 's-Hertogenbosch — CC BY 4.0 — https://sketchfab.com/3d-models/7aacea03a32740ca87c23b7939b49c8f — 수정함(삼각형 수 줄임, 재질 변경)
- "Hl. Antonius" by noe-3d.at — CC BY 4.0 — https://sketchfab.com/3d-models/3a9e6927c57345a6a7f335e3709496ae — 수정함(삼각형 수 줄임, 재질 변경)
- "Saint Veronica" by Virtual Museums of Małopolska — CC0 1.0 — https://sketchfab.com/3d-models/404e75841ed3456aacae757a9fcd085e
- "S. Pedro | St. Peter" by Morbase | Museu Virtual — CC0 1.0 — https://sketchfab.com/3d-models/8bfeb8018fe9443b86dd74397ac6a5d7
- "Cámara Santa de Oviedo: Santiago y San Juan" by Pablo Serrano Basterra — CC BY 4.0 — https://sketchfab.com/3d-models/e5a926bcdfef467aa2d0644642c7e2d9 — 수정함(삼각형 수 줄임, 재질 변경)
- "Christ blessing" by Virtual Museums of Małopolska — CC0 1.0 — https://sketchfab.com/3d-models/888f4046cdf645acb23f6bdd192e8131
- "Pietà" by noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/2ab91ee0f13a4e4fb7942208850aafa4 — 수정함(삼각형 수 줄임, 재질 변경)
- "Tympanum on Church of St. Peter, Prague" by madbert — CC BY 4.0 — https://sketchfab.com/3d-models/b0c21ad8a3c848ae98b50394c82ac67d — 수정함(삼각형 수 줄임, 재질 변경)
- "Blind Gothic Portal" by Tomáš Musílek — CC BY 4.0 — https://sketchfab.com/3d-models/e96d09d70b8648319d56760978f72b63 — 수정함(삼각형 수 줄임, 재질 변경)
- "Kanzel" by noe-3d.at — CC BY 4.0 — https://sketchfab.com/3d-models/d9ca289b094d4f1e913a4f958c39ce85 — 수정함(삼각형 수 줄임, 재질 변경)
- "Taufbecken" by noe-3d.at — CC BY 4.0 — https://sketchfab.com/3d-models/93811784ac6a480d977cb9be3138728a — 수정함(삼각형 수 줄임, 재질 변경)
- "Pulpit of Mendoza, Sigüenza" by Global Digital Heritage and GDH-Afrika — CC BY-NC 4.0 — https://sketchfab.com/3d-models/6ae513013b3d4802baabe88ba6346c5b — 수정함(삼각형 수 줄임, 재질 변경)
- "Madonna and Child in stone" by The Hunt Museum — CC BY 4.0 — https://sketchfab.com/3d-models/1eab9e29e5b74f5686c0d17fe58d90c4 — 수정함(삼각형 수 줄임, 재질 변경)

## 10. 스케치팹 1~20번 처리 (2026-11-23)

사용자가 스케치팹 API 토큰을 이 환경에 넣어 주어(값은 기록하지 않음) `GET /v3/models/{uid}` 로 **라이선스를 다시 확인**하고 `/download` 의 glb 를 받았다. 20점 모두 지금도 CC BY 4.0 또는 CC BY-NC 4.0, 내려받기 가능(2026-11-23).
원본은 저장소 밖(/tmp)에서만 처리하고 묶음을 만든 뒤 지웠다 — 커밋하지 않는다. 다시 만들려면 다시 받는다.

**결과: 받음 14 · 보류 5 · 제외 1.**

### 받음 → 휴대폰용 묶음 (`art/statue_handoff/packs/`, 아직 앱에 넣지 않음)

만드는 법은 §8 과 같다(`make_scan_pack.mjs`: `simplifyWithUpdate` 법선 가중 0.05, 얼굴 구 `detail` 에 따로 몫, 법선은 load() 에서 다시 계산). 예산도 기존 묶음 기준 그대로:
흰 대리석 근거리 36k / 원거리 5k(머리 30%, 얼굴 둘이면 35%), 정점 색 26k / 4k(얼굴 25%) — 묶음 하나 209–216KB(기존 기준 ≤ 230KB).
설정은 `tools/statues/scan_packs.json` 의 **`staged`**(새 배열; `packs` 와 `assets/church/` 의 앱 묶음·`scan3d.test.mjs` 는 손대지 않음).
앱 묶음 합계 예산(`scan3d.test`: raw ≤ 1.4MB, 지금 1.32MB)이 거의 찼으므로, 자리를 정해 앱에 넣을 때는 성당별로 필요한 것만 `packs` 로 옮기고 그 예산을 함께 정한다
(옮길 때 `scan3d.js` PACKS · `lib/domain/art_credits.dart` · `licenses/STATUE_SCANS.md` 에도 넣어야 시험이 통과한다).

얼굴 확인: 헤드리스 Chromium(중립 회색 배경, 무광 재질, 왼쪽 위 앞 열쇠 빛)에서 정면·45°·얼굴 근접 정면·45° 를 찍었다(`art/statue_handoff/packs/checks/<키>.jpg`).
14점 모두 눈·코·입이 읽힌다. 바오로·유다·두 요셉·슈트론스도르프 천사는 얼굴이 무르게 보여 **원본(줄이기 전) 얼굴을 같은 카메라로** 찍어 비교했다 — 원본도 같은 모양(야외 사암의 풍화·스캔 해상도)이고 단순화가 지운 곳은 없다.
란첸도르프 천사는 1차에서 얼굴 구가 머리카락 윗부분을 비켜 각이 졌다 → 구를 키워(r 0.11 → 0.13) 다시 만들었다.

| 번호 | 키 | 모델 | 만든이 | 라이선스 | 내용 | 원본 → 근거리 / 원거리 삼각형 | 묶음 | 얼굴 |
|---|---|---|---|---|---|---|---|---|
| 01 | `st_peter_enthroned` | San Pietro in cattedra | Daniele Madella | CC BY 4.0 | 성 베드로 좌상(14세기 중반, 이탈리아) — 스캔은 앞면만 있는 껍질(뒷면 열림): 벽감·벽 앞에만. 흰 대리석 재질. | 921,599 → 35,988 / 4,996 | 210KB | 얼굴 읽힘 (`checks/st_peter_enthroned.jpg`) |
| 03 | `angel_kneeling` | Engel | noe-3d.at | CC BY-NC 4.0 | 무릎 꿇고 합장한 천사(18세기 초, 마리아 란첸도르프 갈바리아) — 제대·감실 옆 천사 대용, 흰 대리석 재질. | 444,854 → 36,000 / 5,000 | 212KB | 얼굴 읽힘 (`checks/angel_kneeling.jpg`) |
| 04 | `st_paul_stone` | Hl. Paulus | noe-3d.at | CC BY-NC 4.0 | 성 바오로 입상(1724, 미스텔바흐 성당 계단, 금속 후광 포함) — 흰 대리석 재질. | 784,094 → 35,997 / 4,997 | 211KB | 얼굴 읽힘 (`checks/st_paul_stone.jpg`) |
| 07 | `st_helena` | Hl. Helena | noe-3d.at | CC BY-NC 4.0 | 성녀 헬레나(십자가, 1731년 이후 하일리겐크로이츠 사암상) — 대용, 흰 대리석 재질. | 536,653 → 35,990 / 4,998 | 210KB | 얼굴 읽힘 (`checks/st_helena.jpg`) |
| 10 | `crucifix_gothic` | Gothic crucifix | Virtual Museums of Małopolska | CC BY 4.0 | 고딕 십자고상(16세기 초, 1771 금박 보완, 미에후프 성묘 대성당) — 아치형 배경판째, 뒷면 평평: 벽·제대 뒤. 정점 색. | 287,022 → 25,996 / 3,996 | 213KB | 얼굴 읽힘 (`checks/crucifix_gothic.jpg`) |
| 11 | `madonna_kruzlowa` | Madonna of Krużlowa | Virtual Museums of Małopolska | CC BY 4.0 | 크루즐로바의 성모(1410년경 채색 목조, 아름다운 양식) — 진열장은 뺐다(keepMat). 정점 색. | 564,120 → 26,000 / 3,998 | 214KB | 얼굴 읽힘 (`checks/madonna_kruzlowa.jpg`) |
| 12 | `angel_kneeling_stronsdorf` | Engel | noe-3d.at | CC BY-NC 4.0 | 무릎 꿇은 천사(1826, 슈트론스도르프 흑사병 기둥) — 제대 양옆 경배 천사, 흰 대리석 재질. | 567,806 → 35,993 / 4,998 | 212KB | 얼굴 읽힘 (`checks/angel_kneeling_stronsdorf.jpg`) |
| 13 | `st_joseph_child` | Hl. Josef | noe-3d.at | CC BY-NC 4.0 | 아기 예수를 안은 성 요셉(1727, 볼커스도르프 성당 계단) — 흰 대리석 재질. | 622,794 → 35,998 / 5,000 | 212KB | 얼굴 읽힘 (`checks/st_joseph_child.jpg`) |
| 14 | `st_francis` | Hl. Franziskus | noe-3d.at | CC BY-NC 4.0 | 아시시의 성 프란치스코(십자가, 18세기 전반 하일리겐크로이츠 십자가의 길) — 흰 대리석 재질. | 621,322 → 35,987 / 4,998 | 211KB | 얼굴 읽힘 (`checks/st_francis.jpg`) |
| 15 | `apostle_clay` | Nürnberger Tonapostel, um 1420 | Pl.O.234 | Germanisches Nationalmuseum | CC BY 4.0 | 앉은 사도(뉘른베르크 점토 사도상, 1420년경) — 정점 색(구운 점토). | 630,083 → 25,991 / 3,999 | 216KB | 얼굴 읽힘 (`checks/apostle_clay.jpg`) |
| 17 | `st_teresa` | Hl. Theresia | noe-3d.at | CC BY 4.0 | 아빌라의 성녀 데레사(18세기 전반, 요제프 슈니처, 하일리겐크로이츠) — 흰 대리석 재질. | 496,782 → 35,999 / 5,000 | 211KB | 얼굴 읽힘 (`checks/st_teresa.jpg`) |
| 18 | `st_joseph_lily` | Hl. Joseph | noe-3d.at | CC BY-NC 4.0 | 백합을 든 성 요셉(18세기 전반, 요제프 슈니처 작으로 전함, 하일리겐크로이츠) — 흰 대리석 재질. | 651,768 → 35,997 / 4,998 | 213KB | 얼굴 읽힘 (`checks/st_joseph_lily.jpg`) |
| 19 | `madonna_levoca` | Madona Sculpture | jan.zachar | CC BY 4.0 | 왕관 쓴 성모상(후기 고딕, 슬로바키아 레보차, 연도 미상 — 후기 고딕 양식) — 흰 대리석 재질. | 375,409 → 35,996 / 4,999 | 209KB | 얼굴 읽힘 (`checks/madonna_levoca.jpg`) |
| 20 | `st_jude` | Hl. Judas Thaddäus | noe-3d.at | CC BY-NC 4.0 | 사도 유다 타대오(18세기 전반, 클라인슈바인바르트) — 흰 대리석 재질. | 594,962 → 35,998 / 4,998 | 211KB | 얼굴 읽힘 (`checks/st_jude.jpg`) |

모델별 주의:
- 01 성 베드로 좌상: 사진측량 스캔이 **앞면만 있는 껍질**(뒷면이 열림) — 벽감·벽 앞에만 세운다. 원래 계획(청동 좌상 대용)대로라면 어두운 청동 재질을 따로 정한다.
- 10 고딕 십자고상: 십자가가 아치형 배경판(제단 감실)에 붙은 채 스캔됨 — 판째 쓰고 뒷면은 평평(벽·제대 뒤). 그리스도의 얼굴은 원작대로 깊이 숙여 가시관 아래에 있다.
- 11 크루즐로바 성모: 박물관 진열장(벽·받침·안내판)이 함께 스캔돼 있어 재질 이름으로 성상만 읽었다(`keepMat: defaultMat.004`, 도구에 새로 넣은 설정). 아기 예수는 원작대로 나체(아기) — 성인 나체상 기준과는 다르다고 보아 받음.
- 15 점토 사도: 앉은 상(높이 약 1m, 받침·의자 포함).
- 19 레보차 성모: 스케치팹 설명에 연도가 없고 「후기 고딕 양식」만 있다(§9 표와 같음).

### 보류 · 제외

| 번호 | 모델 | 결정 | 까닭 |
|---|---|---|---|
| 02 | St. Bartholomew (밀라노) | **제외** | 받아 보니 성상 하나가 아니라 대성당 벽·제단 일부를 통째 스캔한 장면이고 성상은 그 안의 작은 부분. 또 살가죽 벗겨진 해부학적 **나체상**이라 기준상 성당 안에 쓰지 않음(§4-3). 원본 지움 |
| 05 | Hl. Petrus (술츠 임 비너발트) | 보류 | 조각 제작 연도 미확인(설명·검색에 없음, 성당 건축 1783년은 성상 연도가 아님) — §4 기준. 받지 않음 |
| 06 | Hl. Veronika (팔켄슈타인) | 보류 | 제작 연도 미확인 — §4 기준. 받지 않음 |
| 08 | Hl. Josef (핀카펠트) | 보류 | 1912년 작, 작가 미상 — §4-1 그대로. 받지 않음 |
| 09 | Pieta' MICHELANGELO (leone.giorgio) | 보류 | §8 에서 「질감 있는 대안 필요 없음」으로 정함. 실물인지 복제품인지 설명에 없음. 받지 않음 |
| 16 | Portal Votivkirche | 보류 | 라이선스·연도(1856~79)는 통과. 높이 8m 정문 전체에 인물 수십 — 휴대폰 예산(군상도 ≤ 120k)에서는 인물 얼굴을 살릴 수 없다. 정면 자리가 정해지면 인물 몇을 잘라 쓰는 방식으로 다시 본다. 원본 지움 |

### 출처 문구 (받은 14점 — 앱에 넣을 때 그대로 쓴다)

- "San Pietro in cattedra" by Daniele Madella — CC BY 4.0 — https://sketchfab.com/3d-models/2e11ebf282d24879a0a8f4960ac23363 — 수정함(삼각형 수 줄임, 재질 변경)
- "Engel" by noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/bd6261224279427685fd1c486e3c4240 — 수정함(삼각형 수 줄임, 재질 변경)
- "Hl. Paulus" by noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/7455a9981c7a46c4992d88c8caa78521 — 수정함(삼각형 수 줄임, 재질 변경)
- "Hl. Helena" by noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/15a4ee895e5447e09f8ea980df03fefd — 수정함(삼각형 수 줄임, 재질 변경)
- "Gothic crucifix" by Virtual Museums of Małopolska — CC BY 4.0 — https://sketchfab.com/3d-models/35fde9ce3c734d29ab8813072732d27a — 수정함(삼각형 수 줄임, 질감을 정점 색으로)
- "Madonna of Krużlowa" by Virtual Museums of Małopolska — CC BY 4.0 — https://sketchfab.com/3d-models/597d14d7e6ec46a8a0becdf57dd6dbec — 수정함(삼각형 수 줄임, 질감을 정점 색으로)
- "Engel" by noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/4da4a29f59e142af86b8fbdc7aff818c — 수정함(삼각형 수 줄임, 재질 변경)
- "Hl. Josef" by noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/067f62dda6ac4348a94581ade6e9f274 — 수정함(삼각형 수 줄임, 재질 변경)
- "Hl. Franziskus" by noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/3eb9029e6a45485aa25425b10f4b5a3f — 수정함(삼각형 수 줄임, 재질 변경)
- "Nürnberger Tonapostel, um 1420 | Pl.O.234" by Germanisches Nationalmuseum — CC BY 4.0 — https://sketchfab.com/3d-models/418484f48ef14723865d76dcbcad45fb — 수정함(삼각형 수 줄임, 질감을 정점 색으로)
- "Hl. Theresia" by noe-3d.at — CC BY 4.0 — https://sketchfab.com/3d-models/7d9a15d5495c40dc9548ead778422f67 — 수정함(삼각형 수 줄임, 재질 변경)
- "Hl. Joseph" by noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/38098e2ebcef4e998d1ab62154e57b68 — 수정함(삼각형 수 줄임, 재질 변경)
- "Madona Sculpture" by jan.zachar — CC BY 4.0 — https://sketchfab.com/3d-models/5e16f3cd478e4c8cb32dede7446a83fb — 수정함(삼각형 수 줄임, 재질 변경)
- "Hl. Judas Thaddäus" by noe-3d.at — CC BY-NC 4.0 — https://sketchfab.com/3d-models/2cb9b7c61cea469b9628d62c9fe289aa — 수정함(삼각형 수 줄임, 재질 변경)
