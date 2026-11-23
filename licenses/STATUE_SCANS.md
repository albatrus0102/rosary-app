# 성상 3D 스캔 — 라이선스

성당 안 성상 일부를 **실물 조각의 3D 스캔**으로 바꿨다(로드맵 T-80, 2026-11-16). 고른 근거·후보 전체: `docs/church/STATUE_SOURCES.md`, `art/statue_handoff/manifest.json`.

- 파일: `assets/church/scan3d_<키>.js`(생성 파일), 불러오기·배치: `assets/church/scan3d.js`(그 성당에 들어갈 때만 읽는다).
- 만드는 법: `node tools/statues/make_scan_pack.mjs`(설정 `tools/statues/scan_packs.json`). 원본(`art/statue_handoff/received/`, 약 440MB)은 `.gitignore` — 저장소에 올리지 않는다.
- 앱 안 표기: '성화 · 음악 출처' 화면 → '성당 안 성상(3D 스캔)'(`lib/domain/art_credits.dart` `statueScanCredits`), 오픈소스 라이선스 화면 '성상 3D 스캔(성당 안)'. 묶음 안에도 `meta.src`(제목·만든이·라이선스·주소·변경)로 남긴다.
- 변경(모든 모델 공통): **축소·재질 변경** — meshopt 단순화로 삼각형 수를 줄이고(원본 정점·법선 유지), 위치 16비트·법선 팔면체 양자화 + meshopt 압축. 질감은 쓰지 않는다: 흰 대리석 재질(SMK 석고 주형, 목조·석조 상) 또는 질감을 정점 색으로 구움(채색 목조 십자고상).
- 허용 라이선스(사용자 결정 2026-11-16): CC0, CC BY, CC BY-NC(앱은 완전 비상업). SA·ND 는 쓰지 않는다. **유료화·광고·후원을 도입하면 CC BY-NC 모델은 빼야 한다**(지금 쓰는 것: 빛의 성당의 슈트론스도르프 천사·유다 타대오 상 — 2026-11-24).
- **스캔 라이선스 ≠ 조각 저작권**: 아래는 모두 작가 사후 70년이 지난 작품(15~18세기)이다. 1950년 작 Hl. Matthäus·Hl. Lukas 는 쓰지 않았다.
- **대용 표기**: 피에타만 그 자리의 실제 작품(미켈란젤로)의 주형이다. 나머지는 그 성당의 실제 조각이 아니므로 앱에서 '성 베드로 상'처럼 일반 이름과 '대용'으로만 적는다(예: 라테라노 벽감의 실제 상은 18세기 대리석, 성 바오로 대성전 계단의 상은 19세기 대리석).
- 포함된 코드: meshoptimizer 디코더(MIT, Arseny Kapoulkine) — 각 `scan3d_<키>.js` 안에 동봉.

| 키 | 쓰는 곳 | 모델(제목) | 만든이(스캔) | 라이선스 | 원본 주소 | 삼각형 원본 → 근거리/원거리 |
|---|---|---|---|---|---|---|
| `pieta` | 성 베드로 대성전 피에타 경당 — **피에타(미켈란젤로)** | Michelangelo, Pietà — plaster cast 3D scan (KAS115) | SMK – Statens Museum for Kunst (Royal Cast Collection) | Public Domain Mark 1.0 (https://creativecommons.org/publicdomain/mark/1.0/) | https://open.smk.dk/artwork/image/KAS115 | 1,498,118(전체 해상도 `_full`) → 100,000 / 8,000 |
| `crucifix` | 우리 본당 · 피렌체 · 명동 · 성 바오로(십자가 경당) 십자고상 — 대용 | “Crucified Christ” from St. Jadwiga’s hospital | Virtual Museums of Małopolska (Museum of the Biecz Land) | CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/) | https://sketchfab.com/3d-models/crucified-christ-from-st-jadwigas-hospital-d2404e52b2d144e18f0621903c98c06a | 232,154 → 24,000 / 4,000 |
| `st_peter` | 라테라노 신랑 벽감(익랑 쪽 왼쪽) · 성 바오로 대성전 계단 왼쪽 — 성 베드로 상(대용) | Saint Peter | Virtual Museums of Małopolska (Museum of the Benedictine Abbey in Tyniec) | CC0 1.0 | https://sketchfab.com/3d-models/saint-peter-9e6b4da152f64fa1b4b0613a57318751 | 250,192 → 36,000 / 5,000 |
| `st_paul` | 라테라노 신랑 벽감(익랑 쪽 오른쪽) · 성 바오로 대성전 계단 오른쪽 — 성 바오로 상(대용) | Saint Paul the Apostle | Virtual Museums of Małopolska (Museum of the Benedictine Abbey in Tyniec) | CC0 1.0 | https://sketchfab.com/3d-models/saint-paul-the-apostle-2195c3c0b9a140628e938ddb146d00ca | 249,784 → 36,000 / 5,000 |
| `angel` | 명동대성당 주제대 양옆 천사상 2(오른쪽은 좌우 반전) — 대용 | Engel (Maria-Lanzendorf 갈바리아, 18세기 초) | noe-3d.at | CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) | https://sketchfab.com/3d-models/engel-668dcbf72a7243e491f540a6a575213b | 453,628 → 30,000 / 4,000 |
| `madonna_kruzlowa` | 빛의 성당(가상) 메달 홀 금빛 벽감 — 크루즐로바의 성모(그 작품의 스캔을 가상 성당에 모심) | Madonna of Krużlowa(1410년경 채색 목조) | Virtual Museums of Małopolska | CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) | https://sketchfab.com/3d-models/597d14d7e6ec46a8a0becdf57dd6dbec | 564,120 → 26,000 / 4,000 |
| `angel_kneeling_stronsdorf` | 빛의 성당(가상) 제단 양옆 경배 천사 2(오른쪽 좌우 반전) — 대용 | Engel(슈트론스도르프 흑사병 기둥, 1826) | noe-3d.at | CC BY-NC 4.0 (https://creativecommons.org/licenses/by-nc/4.0/) | https://sketchfab.com/3d-models/4da4a29f59e142af86b8fbdc7aff818c | 567,806 → 36,000 / 5,000 |
| `st_jude` | 빛의 성당(가상) 십자가 전실 사도 벽감 — 사도 유다 타대오 상(대용) | Hl. Judas Thaddäus(18세기 전반, 클라인슈바인바르트) | noe-3d.at | CC BY-NC 4.0 (https://creativecommons.org/licenses/by-nc/4.0/) | https://sketchfab.com/3d-models/2cb9b7c61cea469b9628d62c9fe289aa | 594,962 → 36,000 / 5,000 |
| `apostle_clay` | 빛의 성당(가상) 십자가 전실 사도 벽감 — 앉은 사도상(대용) | Nürnberger Tonapostel, um 1420 / Pl.O.234 | Germanisches Nationalmuseum | CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) | https://sketchfab.com/3d-models/418484f48ef14723865d76dcbcad45fb | 630,083 → 26,000 / 4,000 |

빛의 성당 네 묶음은 `assets/church/light/scan3d_<키>.js`(그 성당에 들어갈 때만 `light/` 에서 읽는다 — `scan3d.js` `DEV_PACKS`, 앱 공용 묶음 예산과 따로 센다). 원본 검수: `docs/church/STATUE_SOURCES.md` §10, `art/statue_handoff/packs/checks/`.
빛의 성당은 `st_peter`·`st_paul`·`crucifix` 도 함께 쓴다(십자가 전실 사도 벽감·매단 채색 십자고상).

원본 작품 정보: 피에타 석고 주형 176×170×89 cm(파리 에콜 데 보자르 주형 공방 1020번, 원작 1498–99). 십자고상: 비에치 지방 박물관 AH/1273, 채색 목조. 성 베드로·성 바오로: 티니에츠 베네딕도회 수도원 박물관 RZ/13/2012·RZ/12/2012, 17세기 중반 크라쿠프 금박 목조. 천사: 오스트리아 마리아 란첸도르프 갈바리아, 18세기 초 석상.

CC0·퍼블릭 도메인은 표기 의무가 없지만 박물관 자료라 같은 화면에 적는다. CC BY(천사)는 저작자 'noe-3d.at'·라이선스 주소·원본 주소·변경 사항을 적는다(위 앱 표기).
