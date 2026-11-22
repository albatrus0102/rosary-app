# 스테인드글라스 전수 목록 — 빈자리 없이 채우기 (2026-11-22)

> 사용자 지시 「스테인드글라스도 그 자리가 맞으면 빈 데 없이 넣어」. 실제 건물에 색유리가 있는 창 자리에는 우리 모델에도 색유리가 보여야 한다(빈 판·회색 판·자리표시 모양 금지). 실제가 무색·옅은 유리인 자리는 그대로 옅게 둔다.
> 작업: Claude Opus 5.5(조사 정리·생성기·빌더 수정·측정 모두 직접). 근거 문서: `GLASS_ALL_CHURCHES_PLAN.md`(일곱 성당 창 조사), `MILAN_GLASS_RESEARCH.md`(밀라노 V01~V47·티부리오·고창), `interiors/danggogae.md`·`interiors/yeouido.md`, `docs/legal/LEGAL_REVIEW_2026-11.md`(권리).
> 이 문서의 표는 **빌더를 실제로 돌려 잰 값**이다: `node tools/church_web/glass_inventory.mjs --md`(전체 JSON 은 `data/glass_inventory.json`, 앱 번들 밖).

## 0. 한눈에 — 성당별 개수와 빈자리 (배포판)

실제 = 실제 건물의 창(조사). 모델 = 배포판에서 그 자리에 보이는 것. **빈자리** = 실제가 색유리인데 모델이 빈 판·옅은 판·예전 '색 칸 격자'(자리표시 모양)인 곳, 또는 실제가 옅은 유리인데 색 격자인 곳.

| 성당 | 개구부 | 실제: 색유리 | 그중 권리 존속 | 도상 미확인 | 옅은·무색 | 설화석고 | 한지 빛 상자 | 가상(창작) | 창 아님 | 모델 전: 사진 / 색 격자 / 옅은 판 | 모델 후: 사진 / 생성 무늬 / 옅은 판 | 빈자리 전 → 후 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 우리 본당 `basic` | 13 | — | — | — | — | — | — | 13 | — | 0 / 13 / 0 | 0 / **13** / 0 | **13 → 0** |
| 성 베드로 `stpeter` | 64 | 1 | — | — | 59 | — | — | — | 4 | 1 / 0 / 63 | 1 / 0 / 63 | 0 → 0 |
| 라테라노 `lateran` | 33 | 0 | — | — | 33 | — | — | — | — | 0 / 7 / 26 | 0 / **7**(무색 격자) / 26 | **7 → 0** |
| 마조레 `maggiore` | 68 | — | 1 | — | 67 | — | — | — | — | 0 / 0 / 68 | 0 / **1** / 67 | **1 → 0** |
| 성 바오로 `stpaul` | 55 | — | — | — | — | 55 | — | — | — | 42 / 0 / 13 | 42 / **13**(설화석고 결) / 0 | 0 → 0 (13곳 '옅은 단색 판' → 설화석고 무늬) |
| 밀라노 `milan` | 78 | 57 | 15 | 1 | — | — | — | — | 5(문) | 1 / 72 / 5 | 1 / **72** / 5(문) | **72 → 0** |
| 피렌체 `florence` | 57 | 44 | — | — | 13 | — | — | — | — | 3 / 54 / 0 | 3 / **54** / 0 | **54 → 0** |
| 명동 `myeongdong` | 53 | 35 | 1 | 17 | — | — | — | — | — | 0 / 52 / 1 | 0 / **53** / 0 | **53 → 0** |
| 당고개 `danggogae` | 28 | — | — | — | — | — | 28 | — | — | 한지 빈 판 28 | **물들인 한지 조각 면 28** | (빈 판 28 → 0) |
| 여의도동 `yeouido` | 8 | — | 5 | — | 3 | — | — | — | — | 0 / 2 / 12(2026-11-16 판) | 0 / **5** / 3 | **0**(2026-11-22 개정: 옆벽 위 창 12 → 슬릿 창·천창은 빛나는 판, 로비 색유리 3·유리 정면 3 추가) |
| **합** | **503** | | | | | | | | | | | **202 → 0** (+ 당고개 빈 판 28) |

- 개구부 수는 측정 도구의 셈이다(명동 2연창 + 원창 = 1, 성 베드로 궁륭 채광창 = 5줄 합쳐 1, 밀라노 문 5 포함). 밀라노 사진 창 1은 후진 가운데 창(V20)의 아래 일부이고 위쪽은 생성 무늬다.
- **'고치기 전'** 수치는 이 작업 직전 사본(`CHURCH_ASSETS=<사본> node tools/church_web/glass_inventory.mjs`)으로 같은 도구를 돌린 값이다. 당고개는 판정 규칙상 '한지 판'이라 빈자리로 세지 않았지만, 가운데가 비어 있는 단색 빛 판이라 자리표시처럼 보였다(사용자 기준) → 이번에 고쳤다.
- 개발판(`ROSARIUM_DEV_GLASS`, URL `devglass=1`): 밀라노 73창은 그 앞을 개발용 임시 시안(`dev/devglass.js`, 빈 창은 이웃 그림을 빌려 덮음 — `glass_coverage.test.mjs`)이 덮고, 뒤에는 이 생성 무늬가 있다. 다른 성당은 배포판과 같다. → **개발판에도 빈자리 0.**

## 1. 무엇으로 채웠나

### 1.1 진본 사진(이미 번들된 것만 그대로)

| 성당 | 자리 | 사진 | 권리 |
|---|---|---|---|
| 피렌체 | 정면 가운데·드럼 동·드럼 북동 | `oculus_florence_ghiberti_1`·`_donatello`·`_ghiberti_2` | PD(스캔, Commons) |
| 성 베드로 | 사도좌 글로리아 | `dove_stpeter` | CC0 |
| 성 바오로 | 측랑 22·고창 20 | `alabaster_stpaul_1·2`(설화석고 재질) | CC BY 4.0 |
| 밀라노 | 후진 가운데 창 아래 | `milan_apse_lower` | CC0(원작 특정 S2 미결 — 법률 검토 §4) |

**새 사진은 받지 않았다.** 피렌체 드럼 5면·정면 성 라우렌시오는 Commons 에 PD 진본이 있다(아래 §5 목록). 다만 이탈리아 문화유산법(D.Lgs. 42/2004 art. 107–108)이 '배포판에 진본 사진을 늘리기 전에 관리 기관 확인'을 권한다(`GLASS_ALL_CHURCHES_PLAN.md` §1.6, 법률 검토 §1). 그래서 그 자리는 생성 무늬로 채우고, 확인이 나면 바꿔 끼울 수 있게 목록만 남겼다. 위키미디어에는 이번에 요청을 보내지 않았다(429 없음).

### 1.2 절차 생성 스테인드글라스(`assets/church/glass_gen.js`, 새 파일)

실제 작품을 옮기지 않는다. **시대·양식의 짜임새**(메달리온 줄, 성인 층과 감실, 서사 패널, 오쿨루스의 넓은 장식 테, 무늬창의 꽃·띠, 무색 격자, 설화석고 결)만 따르고, 장면·인물은 특정되지 않는 일반 형태(후광·머리·옷·겉옷·손짓·건물·땅)다. 납선은 조각마다 그리고(격자가 아님), 조각마다 밝기·기울기 명암, 그리자유 물감 선(얼굴·옷 주름·덩굴), 유리 얼룩·기포·세로 결을 얹는다.

| 양식 | 짜임 | 쓰는 자리 | 실제 근거 |
|---|---|---|---|
| `milan_narr` | 15~16세기 서사 패널(흰 삼엽 아치 틀 + 인물 2~3 + 건물·땅, 파랑/포도주빛 바탕) | 밀라노 측랑 12, 익랑 벽·끝 6, 후진 가운데 위쪽 | V01~V06·V33~V36·V38(15~16세기), V10·V14·V15·V25·V30, V20 |
| `milan_bertini` | 19세기 성인 층(흰·금 고딕 캐노피 + 성인 입상 + 글귀 띠) | V08·V32, 익랑 서벽 V09, 경당 6 + 윗창 2, 정면 하단 5 | 베르티니 공방 1834~1905 |
| `milan_saints16` | 16세기 입상 인물 층(밀라노 16세기 색) | V31(사도들 입상) | 1567 |
| `milan_apse19` | 19세기 서사 패널(채도 높은 루비·사파이어) | 후진 남·북 V19·V21 | 1835~65 베르티니 공방 |
| `milan_deco` | 1950년대 장식 유리(서사 없는 꽃·띠, 금·호박·청록) | 신랑·측랑 고창 22(+ 안쪽 측랑 위 고창) | Fabbrica "Decorative Stained-glass Windows" |
| `milan_abstract` | **추상 색면**(무작위 직선 절단 조각, 인물·상징 없음) | V07·V37·V39·V26, 정면 상단 V44·V46·V47, 티부리오 8 | 저작권 존속(§3) |
| `myeongdong_medal` | 1898 프랑스 공방풍 메달리온(코발트 마름모 바탕 + 루비 테 + 원형 장면) | 후진 5 | 묵주기도 15단(제스타 공방) |
| `myeongdong_figure` | 인물 층(고딕 캐노피 + 입상) | 익랑 끝 2 × 세 첨두 | 성탄·삼왕 / 예수님과 열두 사도 |
| `myeongdong_flower` | 무늬창(옅은 바탕 + 색 꽃·띠, 인물 없음) | 측랑 2연창 16 + 원창, 측랑 끝 장미 2 | 신자석 "꽃 모양" 무늬창 |
| `myeongdong_clere` | 색 무늬창(코발트 바탕 + 꽃) | 고측창 18, 익랑 윗창 8, 종탑 창 | 고측창 무늬 색유리(일부 도상 미확인) |
| `myeongdong_tymp` | 옅은 추상 색면 | 문 위 반월창 | 이남규 1989(저작권 존속) — 원작의 색면·성체 구도를 옮기지 않음 |
| `florence_saints` | 15세기 피렌체 성인·예언자 층(르네상스 조개 벽감) | 트리부나 경당 15 + 윗창 15 | 기베르티 밑그림 1434~43 |
| `florence_gothic` | 성인 층(고딕 감실) | 측랑 3·4칸 4 | 1394~96 |
| `florence_oculus` | 오쿨루스(넓은 장식 테 + 둥근 장면) | 드럼 6, 정면 측면 2(+ 사진 3자리의 대역) | 기베르티·우첼로·카스타뇨 1443~45 |
| `florence_plain` | 그림 없는 옅은 장식 유리(원·마름모 엮음, 가는 색 테) | 신랑 둥근 고창 8, 측랑 1·2칸 4, 드럼 서쪽 | ICCD 44점에 없음(무도상) |
| `clear` / `clear_warm` | 무색 / 옅은 호박빛 마름모 격자(+ 색 테두리) | 라테라노 후진 4 / 정면 3 | 실제 무색 격자(후진), 그림 유리 기록 없음(정면) |
| `alabaster` | 설화석고 판 두 장 + 돌 띠, 결·얼룩 | 성 바오로 정면 3·익랑 끝 6·익랑 뒷벽 4(+ 사진 42자리 대역) | 전부 설화석고 |
| `marian_abstract` | 추상 방사 색면(파랑·금) | 마조레 정면 장미창 | 하이날 1995(저작권 존속) |
| `yeouido_abstract` | 추상 색면(파랑 위주 + 흰·빨강·분홍) | 여의도동 정면 2 | 작가 미확인 현대 작품 |
| `yeouido_lobby` | 추상 색면(위 파랑, 초록·노랑·주황, 맑은 칸 — 무지개 띠·비둘기 없음) | 여의도동 로비 색유리 벽 3 | 최영심 빅토리아 2024(생존) |
| `parish` | 색면 + 세로 빛 띠, 아치 머리·원창 가운데에 단순 상징(십자가·비둘기·잔·장미·별) | 우리 본당 13 | 가상 본당(창작) |
| (빌더) 물들인 한지 조각 면 | 옅은 천연 염색 빛(호박·연두·연분홍·미색)의 한지 조각을 겹쳐 붙인 추상 면 + 기존 전통 창살 | 당고개 28판 | 한지 유리화(작가 미확인, 2011 — 저작권 존속) |

### 1.3 빛

- 유리는 예전과 같은 재질(`MeshBasicMaterial`, HDR — `looks.js` 의 `glassK` 로 톤매핑·블룸에서 빛난다)에 질감만 곱했다. 밝기 조절점은 그대로 `looks.js` 한 곳이다(이번에 고치지 않음).
- 빛줄기·바닥 빛무늬 색: 창마다 그 양식의 주된 유리색(바탕·테·금)을 흰빛과 섞은 3색(`ChurchGlassGen.beam`)을 `addWindowBeam` 에 넘긴다 → 밀라노·명동의 빛줄기가 창 색으로 물든다. 렌더러(`render.js`·빛줄기 셰이더)는 건드리지 않았다.

## 2. 구조 — draw call·메모리

- **한 성당 = 아틀라스 한 장.** 빌더·키트가 창마다 '칸'(양식·부분·변주)을 등록하고(`ctx.stained` / `ctx.stainedDisc`, `ctx.window({glass})` / `ctx.rose({glass})`), `kit._prepare` 가 쓰인 칸만 캔버스 한 장에 그린 뒤 **기존 유리 배치(`glass`)의 UV** 를 그 칸으로 옮긴다. 재질·메시는 예전 그대로라 **유리 draw call 은 그대로 1**(성당마다 유리 정점 942~11,373개 — 6만 미만이라 덩어리 하나).
- 칸: 몸통 256×512(세로로 이어 붙는 모듈, 위아래 끝 = 가로 철물), 아치 머리 256×256, 원창 512×512. 상한 2048×1024(칸 32개). 넘치면 칸 크기를 반으로(같은 메모리 상한). 간단(low) 화질은 칸 128px.
- 무늬 없는 유리(납틀 뒷판·옅은 유리)는 UV −1 → 질감을 곱하지 않는다(`map_fragment` 한 줄 교체, 예전 색 그대로).
- 캔버스는 GPU 에 올린 직후 1×1 로 줄여 CPU 메모리를 놓는다(먼 창 아틀라스와 같은 방식). 성당을 바꾸면 world 해제 때 질감도 해제된다(기존 `texOf`).
- 같은 시점·같은 조건(헤드리스 SwiftShader, 960×540, high, 배포판 모드) 전/후 렌더 1회 draw call: 17개 시점 중 12개가 같다(예: 밀라노 측랑 102 → 102, 명동 후진 124 → 124, 피렌체 드럼 111 → 111). 나머지 5개(성 베드로 115 → 120, 당고개 81 → 86, 명동 측랑 92 → 97, 피렌체 트리부나 92 → 94, 여의도동 63 → 62)는 유리를 바꾸지 않은 성 베드로에서도 같은 크기로 나와 사진 창·성상의 비동기 적재 흔들림으로 본다(유리 메시 수는 구조상 같다). GL 질감 수는 아틀라스 1장 늘었다(성 베드로·당고개는 0).

| 성당 | 생성 아틀라스(high·mid) | low | 아틀라스 그리기(헤드리스 1회) | 전체 창 질감 예산(PERF_SCALE §3.2, high) 안 몫 |
|---|---|---|---|---|
| 밀라노 | 2048×1024 = **10.7MB**(칸 18) | 1024×512 = 2.7MB | 9~48ms | 먼 창 0.3 + 가까운 창 ≤64 + 생성 10.7 ≤ 75MB < 83MB |
| 피렌체 | 2048×1024 = **10.7MB**(칸 13) | 2.7MB | 7~16ms | 1.3 + ≤64 + 10.7 |
| 명동 | 2048×1024 = **10.7MB**(칸 16) | 2.7MB | 10~61ms | 0 + 0 + 10.7 |
| 우리 본당 | 2048×512 = 5.3MB | 1.3MB | 12~22ms | 5.3 |
| 성 바오로 | 1024×512 = 2.7MB | 0.7MB | 1~9ms | 0.7 + ≤64 + 2.7 |
| 라테라노 | 1024×512 = 2.7MB | 0.7MB | 4ms | 2.7 |
| 마조레 · 여의도동 | 512×512 = 1.3MB | 0.3MB | 2~4ms | 1.3 |
| 성 베드로 · 당고개 | 없음 | 없음 | — | 예전 그대로 |

- 생성 아틀라스 상한(10.7MB)은 PERF_SCALE 의 먼 창 아틀라스 설계치(창 55장 18.7MB)보다 작다. 가까운 창 스트리밍 예산(high 8장·64MB)과 규칙은 그대로다.
- APK 크기: 그림 파일이 없다(코드 약 55KB). 입장 때 한 번 그린다.

## 3. 권리 메모

- **원작을 옮기지 않는다**: 생성 무늬는 시대 양식의 짜임만 따른 창작이다. 특정 창의 장면·구도·인물·서명을 그리지 않는다. 코드에 작가 이름이 없다(시험이 막음).
- **저작권 존속 자리 = 추상만**(시험이 막음): 밀라노 V07(하이날 1988)·V44·V46·V47(하이날 1955)·V39(카르피 1939–47)·티부리오 8(1968), 마조레 장미창(하이날 1995), 명동 문 위 반월창(이남규 1989), 여의도동 정면 2(작가 미확인 현대), 당고개 28(작가 미확인 2011).
- 보수적으로 더한 자리: 밀라노 **V37**(지오반니 부파 1939–47; 부파 1956 사망 → 이탈리아 기준 2026년 말까지 보호)와 **V26**(1910, 부파 공동) — 법률 검토 표에는 없지만 보호 기간 안이라 추상으로 두었다. 2027년 1월 이후 V37 은 PD 가 된다(그때 서사 양식으로 바꿀 수 있다).
- 실제가 옅은·무색 유리인 자리(성 베드로 59, 마조레 67, 라테라노 33, 피렌체 무도상 13, 여의도동 옆벽 12)에는 인물 무늬를 넣지 않았다(시험이 막음). 라테라노 후진 4창은 모델이 색유리였는데 실제(무색 격자)에 맞춰 무색 격자로 바꿨다(`GLASS_ALL_CHURCHES_PLAN` §5 L1 — 질문 4의 '색 빼기'에 해당. 되돌리려면 `ch_lateran.js` 후진 `winAt` 의 `glass: 'clear'` 한 줄을 지운다).
- 개발용 시안(`assets/church/dev/`)은 배포판에 들어가지 않는 규칙 그대로다. `glass_gen.js` 에는 `gpack_dev`·`ChurchDevGlassPack`·`DEV-0NN` 문자열이 없다(`tools/check_release_apk.sh` 의 문자열 규칙 통과).

## 4. 시험·재현

```
node --test tools/church_web/glass_inventory.test.mjs     # 빈자리 0, 권리 자리 = 추상, 옅은 자리 = 옅게, 아틀라스 한 장, 번들 규칙
node tools/church_web/glass_inventory.mjs                  # 성당별 요약 + 빈자리
node tools/church_web/glass_inventory.mjs --md             # 아래 표
node tools/church_web/glass_gen_sheet.mjs out.png          # 양식 견본 시트(헤드리스)
node tools/church_web/glass_fill_shots.mjs <폴더> [--root <assets/church 사본>]   # 성당별 대표 창 전/후 화면(배포판 모드)
```

## 5. 나중에 받을 진본 사진(문화유산 허가 확인 뒤)

| 자리 | 파일(Commons) | 라이선스 |
|---|---|---|
| 피렌체 드럼(면 미확정) | `Ghiberti, orazione nell'orto.jpg` · `Ghiberti, presentazione al tempio.jpg` · `Paolo uccello, vetrata della natività.jpg` · `Paolo uccello, vetrata della resurrezione.jpg` · `Andrea del castagno, deposizione.jpg` | PD |
| 피렌체 정면 측면 | `Ghiberti, san lorenzo tra angeli.jpg` | PD |
| 피렌체 측랑 이련창(어느 창인지 미확인) | `Santa Maria del Fiore colour glass (1623723568).jpg` · `Cattedrale di Santa Maria del Fiore (Duomo), Florence (26582591412).jpg` | CC BY 2.0 |

받는 법은 `GLASS_DEV_PIPELINE.md`·`GLASS_PLACEMENTS.md`(1k 팩 + 먼 창 팩 + 카탈로그 + 대응표). 받으면 그 자리의 생성 무늬는 사진 판 뒤의 대역이 된다.

## 6. 창마다(배포판·개발판)

열: key · 구역 · 크기(앱 m) · 실제(종류: 무엇) · 시대·작가 · 모델(배포판) · 개발판 · 판정. 모델의 `gen:` = 생성 무늬 양식, `photo:` = 진본 사진 창, `plain` = 무늬 없는 옅은 절차 유리, `hanji` = 한지 빛 판.

### basic

| key | 구역 | 크기 | 실제 | 시대·작가 | 모델(배포판) | 개발판 | 판정 |
|---|---|---|---|---|---|---|---|
| `entrance_rose` | entrance | 2.60×2.60 | virtual: 가상의 본당(실제 창 없음) — 창작 무늬 |  | gen:parish | 같음 | OK |
| `entrance_transom` | entrance | 3.60×1.90 | virtual: 가상의 본당(실제 창 없음) — 창작 무늬 |  | gen:parish | 같음 | OK |
| `apse_rose` | sanctuary | 3.00×3.00 | virtual: 가상의 본당(실제 창 없음) — 창작 무늬 |  | gen:parish | 같음 | OK |
| `sideL_b1` | side | 1.90×3.27 | virtual: 가상의 본당(실제 창 없음) — 창작 무늬 |  | gen:parish | 같음 | OK |
| `sideL_b2` | side | 1.90×3.27 | virtual: 가상의 본당(실제 창 없음) — 창작 무늬 |  | gen:parish | 같음 | OK |
| `sideL_b3` | side | 1.90×3.27 | virtual: 가상의 본당(실제 창 없음) — 창작 무늬 |  | gen:parish | 같음 | OK |
| `sideL_b4` | side | 1.90×3.27 | virtual: 가상의 본당(실제 창 없음) — 창작 무늬 |  | gen:parish | 같음 | OK |
| `sideL_b5` | side | 1.90×3.27 | virtual: 가상의 본당(실제 창 없음) — 창작 무늬 |  | gen:parish | 같음 | OK |
| `sideR_b1` | side | 1.90×3.27 | virtual: 가상의 본당(실제 창 없음) — 창작 무늬 |  | gen:parish | 같음 | OK |
| `sideR_b2` | side | 1.90×3.27 | virtual: 가상의 본당(실제 창 없음) — 창작 무늬 |  | gen:parish | 같음 | OK |
| `sideR_b3` | side | 1.90×3.27 | virtual: 가상의 본당(실제 창 없음) — 창작 무늬 |  | gen:parish | 같음 | OK |
| `sideR_b4` | side | 1.90×3.27 | virtual: 가상의 본당(실제 창 없음) — 창작 무늬 |  | gen:parish | 같음 | OK |
| `sideR_b5` | side | 1.90×3.27 | virtual: 가상의 본당(실제 창 없음) — 창작 무늬 |  | gen:parish | 같음 | OK |

### stpeter

| key | 구역 | 크기 | 실제 | 시대·작가 | 모델(배포판) | 개발판 | 판정 |
|---|---|---|---|---|---|---|---|
| `gloria` | gloria | 1.73×2.50 | stained: 성령의 비둘기 | 1657–66 베르니니 | photo:dove_stpeter | 같음 | OK |
| `entrance_door_light` | door_light | 2.60×5.25 | not_window: 창이 아닌 빛 면(문 바깥빛·경당 벽 안 빛) |  | plain | 같음 | OK |
| `facade_upper` | facade | 3.00×2.73 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `aisleSkyN_b1` | aisle_skylight | 0.90×0.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `aisleSkyN_b2` | aisle_skylight | 0.90×0.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `aisleSkyN_b3` | aisle_skylight | 0.90×0.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `aisleSkyN_b4` | aisle_skylight | 0.90×0.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `aisleSkyN_b5` | aisle_skylight | 0.90×0.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `aisleSkyN_b6` | aisle_skylight | 0.90×0.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `aisleSkyN_b7` | aisle_skylight | 0.90×0.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `aisleSkyS_b1` | aisle_skylight | 0.90×0.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `aisleSkyS_b2` | aisle_skylight | 0.90×0.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `aisleSkyS_b3` | aisle_skylight | 0.90×0.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `aisleSkyS_b4` | aisle_skylight | 0.90×0.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `aisleSkyS_b5` | aisle_skylight | 0.90×0.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `aisleSkyS_b6` | aisle_skylight | 0.90×0.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `aisleSkyS_b7` | aisle_skylight | 0.90×0.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `chapelLightN_b1` | chapel_light | 1.00×2.40 | not_window: 창이 아닌 빛 면(문 바깥빛·경당 벽 안 빛) |  | plain | 같음 | OK |
| `chapelLightS_b1` | chapel_light | 1.00×2.40 | not_window: 창이 아닌 빛 면(문 바깥빛·경당 벽 안 빛) |  | plain | 같음 | OK |
| `chapelLightS_b2` | chapel_light | 1.00×2.40 | not_window: 창이 아닌 빛 면(문 바깥빛·경당 벽 안 빛) |  | plain | 같음 | OK |
| `lantern_NE` | lantern | 1.01×1.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `lantern_NE_2` | lantern | 1.01×1.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `lantern_NW` | lantern | 1.01×1.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `lantern_NW_2` | lantern | 1.01×1.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `lantern_SE` | lantern | 1.01×1.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `lantern_SE_2` | lantern | 1.01×1.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `lantern_SW` | lantern | 1.01×1.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `lantern_SW_2` | lantern | 1.01×1.90 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_01` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_02` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_03` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_04` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_05` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_06` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_07` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_08` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_09` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_10` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_11` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_12` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_13` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_14` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_15` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `drum_16` | drum | 1.73×3.80 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `naveLunN_b1` | nave_lunette | 2.40×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `naveLunN_b2` | nave_lunette | 2.40×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `naveLunN_b3` | nave_lunette | 2.40×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `naveLunN_b4` | nave_lunette | 2.40×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `naveLunS_b1` | nave_lunette | 2.40×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `naveLunS_b2` | nave_lunette | 2.40×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `naveLunS_b3` | nave_lunette | 2.40×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `naveLunS_b4` | nave_lunette | 2.40×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `trLunN_b1` | transept_lunette | 2.20×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `trLunN_b2` | transept_lunette | 2.20×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `trLunN_b3` | transept_lunette | 2.20×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `trLunN_b4` | transept_lunette | 2.20×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `trLunS_b1` | transept_lunette | 2.20×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `trLunS_b2` | transept_lunette | 2.20×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `trLunS_b3` | transept_lunette | 2.20×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `trLunS_b4` | transept_lunette | 2.20×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `apseLunN_b1` | apse_lunette | 2.20×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `apseLunN_b2` | apse_lunette | 2.20×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `apseLunS_b1` | apse_lunette | 2.20×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |
| `apseLunS_b2` | apse_lunette | 2.20×2.46 | clear: 무색 유리 격자(그림 없음) |  | plain | 같음 | OK |

### lateran

| key | 구역 | 크기 | 실제 | 시대·작가 | 모델(배포판) | 개발판 | 판정 |
|---|---|---|---|---|---|---|---|
| `facade_center` | facade | 3.20×5.00 | plain: 그림 유리 없음 |  | gen:clear_warm | 같음 | OK |
| `facade_N` | facade | 1.30×3.25 | plain: 그림 유리 없음 |  | gen:clear_warm | 같음 | OK |
| `facade_S` | facade | 1.30×3.25 | plain: 그림 유리 없음 |  | gen:clear_warm | 같음 | OK |
| `clereN_b1` | clerestory | 1.80×2.90 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `clereN_b2` | clerestory | 1.80×2.90 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `clereN_b3` | clerestory | 2.80×3.40 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `clereN_b4` | clerestory | 1.80×2.90 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `clereN_b5` | clerestory | 1.80×2.90 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `clereS_b1` | clerestory | 1.80×2.90 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `clereS_b2` | clerestory | 1.80×2.90 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `clereS_b3` | clerestory | 2.80×3.40 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `clereS_b4` | clerestory | 1.80×2.90 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `clereS_b5` | clerestory | 1.80×2.90 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `trBackN_inner` | transept | 1.50×3.15 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `trBackN_outer` | transept | 1.50×3.15 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `trBackS_inner` | transept | 1.50×3.15 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `trBackS_outer` | transept | 1.50×3.15 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `trEndN_b1` | transept | 1.10×2.95 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `trEndN_b2` | transept | 1.10×2.95 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `trEndS_b1` | transept | 1.10×2.95 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `trEndS_b2` | transept | 1.10×2.95 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `trFrontN_inner` | transept | 1.50×3.15 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `trFrontN_outer` | transept | 1.50×3.15 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `trFrontS_inner` | transept | 1.50×3.15 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `trFrontS_outer` | transept | 1.50×3.15 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `choirN_b1` | choir | 1.50×3.15 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `choirN_b2` | choir | 1.50×3.15 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `choirS_b1` | choir | 1.50×3.15 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `choirS_b2` | choir | 1.50×3.15 | plain: 그림 유리 없음 |  | plain | 같음 | OK |
| `apse_w1` | apse | 1.00×2.62 | clear: 희고 옅은 유리 + 격자 납틀(그림 없음) |  | gen:clear | 같음 | OK |
| `apse_w2` | apse | 1.00×2.62 | clear: 희고 옅은 유리 + 격자 납틀(그림 없음) |  | gen:clear | 같음 | OK |
| `apse_w3` | apse | 1.00×2.62 | clear: 희고 옅은 유리 + 격자 납틀(그림 없음) |  | gen:clear | 같음 | OK |
| `apse_w4` | apse | 1.00×2.62 | clear: 희고 옅은 유리 + 격자 납틀(그림 없음) |  | gen:clear | 같음 | OK |

### maggiore

| key | 구역 | 크기 | 실제 | 시대·작가 | 모델(배포판) | 개발판 | 판정 |
|---|---|---|---|---|---|---|---|
| `facade_center` | facade | 3.60×3.60 | stained_protected: 장미창 — 교회의 어머니 성모 | 1995 하이날 | gen:marian_abstract | 같음 | OK |
| `facade_L` | facade | 1.00×2.70 | plain: 정면의 다른 창(확인 못 함 — 그림 유리 기록 없음) |  | plain | 같음 | OK |
| `facade_R` | facade | 1.00×2.70 | plain: 정면의 다른 창(확인 못 함 — 그림 유리 기록 없음) |  | plain | 같음 | OK |
| `facadeAisleL` | facade_aisle | 0.90×1.25 | plain: 정면의 다른 창(확인 못 함 — 그림 유리 기록 없음) |  | plain | 같음 | OK |
| `facadeAisleR` | facade_aisle | 0.90×1.25 | plain: 정면의 다른 창(확인 못 함 — 그림 유리 기록 없음) |  | plain | 같음 | OK |
| `clereL_b1` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereL_b2` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereL_b3` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereL_b4` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereL_b5` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereL_b6` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereL_b7` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereL_b8` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereL_b9` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereL_b10` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereR_b1` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereR_b2` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereR_b3` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereR_b4` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereR_b5` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereR_b6` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereR_b7` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereR_b8` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereR_b9` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `clereR_b10` | clerestory | 1.00×2.60 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `aisleL_b1` | aisle | 0.90×1.25 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `aisleL_b2` | aisle | 0.90×1.25 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `aisleL_b3` | aisle | 0.90×1.25 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `aisleL_b4` | aisle | 0.90×1.25 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `aisleL_b5` | aisle | 0.90×1.25 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `aisleL_b6` | aisle | 0.90×1.25 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `aisleL_b7` | aisle | 0.90×1.25 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `aisleR_b1` | aisle | 0.90×1.25 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `aisleR_b2` | aisle | 0.90×1.25 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `aisleR_b3` | aisle | 0.90×1.25 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `aisleR_b4` | aisle | 0.90×1.25 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `aisleR_b5` | aisle | 0.90×1.25 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `aisleR_b6` | aisle | 0.90×1.25 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `aisleR_b7` | aisle | 0.90×1.25 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `apse_w1` | apse | 0.60×2.50 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `apse_w2` | apse | 0.60×2.50 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `apse_w3` | apse | 0.60×2.50 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `apse_w4` | apse | 0.60×2.50 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `apse_w5` | apse | 0.60×2.50 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelL_b1` | chapel | 3.08×1.54 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelL_b2` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelL_b3` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelL_b4` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelL_b5` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelL_b6` | chapel | 3.08×1.54 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelL_b7` | chapel | 1.56×1.56 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelL_b8` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelL_b9` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelL_b10` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelL_b11` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelL_b12` | chapel | 3.08×1.54 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelR_b1` | chapel | 3.08×1.54 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelR_b2` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelR_b3` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelR_b4` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelR_b5` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelR_b6` | chapel | 1.56×1.56 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelR_b7` | chapel | 3.08×1.54 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelR_b8` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelR_b9` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelR_b10` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelR_b11` | chapel | 1.00×1.71 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |
| `chapelR_b12` | chapel | 3.08×1.54 | plain: 그림 유리 없음(무색·옅은 유리) |  | plain | 같음 | OK |

### stpaul

| key | 구역 | 크기 | 실제 | 시대·작가 | 모델(배포판) | 개발판 | 판정 |
|---|---|---|---|---|---|---|---|
| `facade_center` | facade | 2.20×4.30 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | gen:alabaster | 같음 | OK |
| `facade_N` | facade | 1.80×3.60 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | gen:alabaster | 같음 | OK |
| `facade_S` | facade | 1.80×3.60 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | gen:alabaster | 같음 | OK |
| `aisleN_b1` | aisle | 1.50×2.88 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `aisleN_b2` | aisle | 1.50×2.95 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `aisleN_b3` | aisle | 1.50×2.88 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `aisleN_b4` | aisle | 1.50×2.95 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `aisleN_b5` | aisle | 1.50×2.88 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `aisleN_b6` | aisle | 1.50×2.95 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `aisleN_b7` | aisle | 1.50×2.88 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `aisleN_b8` | aisle | 1.50×2.95 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `aisleN_b9` | aisle | 1.50×2.88 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `aisleN_b10` | aisle | 1.50×2.95 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `aisleN_b11` | aisle | 1.50×2.88 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `aisleS_b1` | aisle | 1.50×2.88 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `aisleS_b2` | aisle | 1.50×2.95 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `aisleS_b3` | aisle | 1.50×2.88 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `aisleS_b4` | aisle | 1.50×2.95 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `aisleS_b5` | aisle | 1.50×2.88 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `aisleS_b6` | aisle | 1.50×2.95 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `aisleS_b7` | aisle | 1.50×2.88 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `aisleS_b8` | aisle | 1.50×2.95 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `aisleS_b9` | aisle | 1.50×2.88 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `aisleS_b10` | aisle | 1.50×2.95 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `aisleS_b11` | aisle | 1.50×2.88 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `clereN_b1` | clerestory | 1.32×2.53 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `clereN_b2` | clerestory | 1.32×2.60 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `clereN_b3` | clerestory | 1.32×2.53 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `clereN_b4` | clerestory | 1.32×2.60 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `clereN_b5` | clerestory | 1.32×2.53 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `clereN_b6` | clerestory | 1.32×2.60 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `clereN_b7` | clerestory | 1.32×2.53 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `clereN_b8` | clerestory | 1.32×2.60 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `clereN_b9` | clerestory | 1.32×2.53 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `clereN_b10` | clerestory | 1.32×2.60 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `clereS_b1` | clerestory | 1.32×2.53 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `clereS_b2` | clerestory | 1.32×2.60 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `clereS_b3` | clerestory | 1.32×2.53 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `clereS_b4` | clerestory | 1.32×2.60 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `clereS_b5` | clerestory | 1.32×2.53 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `clereS_b6` | clerestory | 1.32×2.60 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `clereS_b7` | clerestory | 1.32×2.53 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `clereS_b8` | clerestory | 1.32×2.60 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `clereS_b9` | clerestory | 1.32×2.53 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_1 (대역 gen:alabaster) | 같음 | OK |
| `clereS_b10` | clerestory | 1.32×2.60 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | photo:alabaster_stpaul_2 (대역 gen:alabaster) | 같음 | OK |
| `trEndN_b1` | transept_end | 1.60×4.10 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | gen:alabaster | 같음 | OK |
| `trEndN_b2` | transept_end | 1.60×4.10 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | gen:alabaster | 같음 | OK |
| `trEndN_b3` | transept_end | 1.60×4.10 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | gen:alabaster | 같음 | OK |
| `trEndS_b1` | transept_end | 1.60×4.10 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | gen:alabaster | 같음 | OK |
| `trEndS_b2` | transept_end | 1.60×4.10 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | gen:alabaster | 같음 | OK |
| `trEndS_b3` | transept_end | 1.60×4.10 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | gen:alabaster | 같음 | OK |
| `trBack_w1` | transept_back | 1.20×4.00 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | gen:alabaster | 같음 | OK |
| `trBack_w2` | transept_back | 1.20×4.00 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | gen:alabaster | 같음 | OK |
| `trBack_w3` | transept_back | 1.20×4.00 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | gen:alabaster | 같음 | OK |
| `trBack_w4` | transept_back | 1.20×4.00 | alabaster: 설화석고 판(1891 폭발로 색유리 소실 뒤) |  | gen:alabaster | 같음 | OK |

### milan

| key | 구역 | 크기 | 실제 | 시대·작가 | 모델(배포판) | 개발판 | 판정 |
|---|---|---|---|---|---|---|---|
| `aisleN_b1` | aisle | 1.75×7.80 | stained_protected: V39 다윗 임금의 생애 | 1939–47 카르피 | gen:milan_abstract | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_abstract | OK |
| `aisleN_b2` | aisle | 1.75×7.80 | stained: V38 15~19세기 패널 모음 | 15~19세기 | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `aisleN_b3` | aisle | 1.75×7.80 | stained_protected: V37 성 미카엘과 악마들의 전투 | 1939–47 부파(1956 사망 — 2026년 말까지 보호) | gen:milan_abstract | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_abstract | OK |
| `aisleN_b4` | aisle | 1.75×7.80 | stained: V36 네 관 쓴 순교 성인 | 1567–69 | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `aisleN_b5` | aisle | 1.75×7.80 | stained: V35 성모의 영광 | 1565–67 | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `aisleN_b6` | aisle | 1.75×7.80 | stained: V34 성녀 헬레나·십자가 발견 | 1570–77 | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `aisleN_b7` | aisle | 1.75×5.80 | stained: V33 성 요셉의 생애 | 1576–1657 | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `aisleN_b8` | aisle | 1.75×5.80 | stained: V32 성 암브로시오의 생애 | 1888–95 베르티니 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `aisleS_b1` | aisle | 1.75×7.80 | stained: V01 성 요한 사도의 생애 | 1473–78 de Mottis | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `aisleS_b2` | aisle | 1.75×7.80 | stained: V02 구약 이야기(옛 패널 모음) | 1417–1548 | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `aisleS_b3` | aisle | 1.75×7.80 | stained: V03 구약 이야기 | 1417–1548 | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `aisleS_b4` | aisle | 1.75×7.80 | stained: V04 구약 이야기 | 1417–1548 | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `aisleS_b5` | aisle | 1.75×7.80 | stained: V05 신약 이야기(포파풍) | 15세기 말~16세기 전반 | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `aisleS_b6` | aisle | 1.75×7.80 | stained: V06 성 엘리지오의 생애 | 1480–86 | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `aisleS_b7` | aisle | 1.75×5.80 | stained_protected: V07 복자 페라리·슈스터 추기경 | 1988 하이날 | gen:milan_abstract | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_abstract | OK |
| `aisleS_b8` | aisle | 1.75×5.80 | stained: V08 성녀 아녜스·테클라·눈의 성모 | 1897–1905 베르티니 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `trWestN` | transept_west_wall | 1.41×9.00 | stained: V31 사도들(입상)·성모 대관 | 1567 | gen:milan_saints16 | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_saints16 | OK |
| `trWestS` | transept_west_wall | 1.41×9.00 | stained: V09 성 제르바시오·프로타시오 | 1846–49 베르티니 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `trEndN_east` | transept_end | 1.66×9.00 | stained_protected: V26 성 카롤로 보로메오의 생애 | 1910 벨트라미·부파 외(부파 보호 기간) | gen:milan_abstract | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_abstract | OK |
| `trEndN_west` | transept_end | 1.66×9.00 | stained: V30 시에나의 성녀 카타리나 | 1562–67 | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `trEndS_east` | transept_end | 1.66×9.00 | stained: V14 알렉산드리아의 성녀 카타리나 | 1549–57 | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `trEndS_west` | transept_end | 1.66×9.00 | stained: V10 성 야고보의 생애 | 1562–66 | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `chapN_c` | transept_chapel | 1.02×7.69 | stained: V28 성모의 생애 | 1842–47 베르티니 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `chapN_e` | transept_chapel | 1.02×7.69 | stained: V27 성모의 생애 | 1842–47 베르티니 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `chapN_upper` | transept_chapel | 3.60×6.70 | stained_unverified: 북익랑 경당 위 큰 창(번호 미확인) | 미확인 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `chapN_w` | transept_chapel | 1.02×7.69 | stained: V29 성모의 생애 | 1842–47 베르티니 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `chapS_c` | transept_chapel | 1.02×7.69 | stained: V12 성 요한 보노의 영광 | 1838–42 베르티니 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `chapS_e` | transept_chapel | 1.02×7.69 | stained: V13 성 요한 보노 | 1838–42 베르티니 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `chapS_upper` | transept_chapel | 3.60×6.70 | stained: V12bis 구세주 그리스도와 성인들 | 1838–42 베르티니 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `chapS_w` | transept_chapel | 1.02×7.69 | stained: V11 성 요한 보노 | 1838–42 베르티니 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `trEastN` | transept_east_wall | 1.66×9.00 | stained: V25 다마스쿠스의 성 요한 | 1479–89 | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `trEastS` | transept_east_wall | 1.66×9.00 | stained: V15 투르의 성 마르티노 | 1570–17세기 초 | gen:milan_narr | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_narr | OK |
| `apse_center` | apse | 4.80×9.10 | stained: V20 요한 묵시록(라차 창) | 1416–1545; 하부 1834–38 | gen:milan_narr + photo:milan_apse_lower(아래 일부) (대역 gen:milan_narr) | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 photo:milan_apse_lower(아래 일부) | OK |
| `apse_north` | apse | 3.50×8.10 | stained: V21 구약 이야기 | 1835–65 베르티니 공방 | gen:milan_apse19 | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_apse19 | OK |
| `apse_south` | apse | 3.50×8.10 | stained: V19 신약 이야기 | 1838–65 베르티니 공방 | gen:milan_apse19 | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_apse19 | OK |
| `cfDoor_c` | counterfacade_door | 2.70×6.50 | not_window: 정문 문짝(나무) |  | plain | 같음 | OK |
| `cfDoor_n1` | counterfacade_door | 2.00×5.30 | not_window: 정문 문짝(나무) |  | plain | 같음 | OK |
| `cfDoor_n2` | counterfacade_door | 2.00×5.30 | not_window: 정문 문짝(나무) |  | plain | 같음 | OK |
| `cfDoor_s1` | counterfacade_door | 2.00×5.30 | not_window: 정문 문짝(나무) |  | plain | 같음 | OK |
| `cfDoor_s2` | counterfacade_door | 2.00×5.30 | not_window: 정문 문짝(나무) |  | plain | 같음 | OK |
| `cfLower_c` | counterfacade_lower | 1.61×3.61 | stained: V45 성모 승천 | 1834–54 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `cfLower_n1` | counterfacade_lower | 1.16×2.91 | stained: V41 주교로 뽑히는 성 암브로시오 | 1855 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `cfLower_n2` | counterfacade_lower | 1.16×2.91 | stained: V40 성녀 테클라의 순교 | 1860 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `cfLower_s1` | counterfacade_lower | 1.16×2.91 | stained: V42 오리아 영지를 파는 성 카롤로 | 1855 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `cfLower_s2` | counterfacade_lower | 1.16×2.91 | stained: V43 성 미카엘(추정) | 19세기 | gen:milan_bertini | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_bertini | OK |
| `cfUpper_c` | counterfacade_upper | 1.55×4.64 | stained_protected: V47 삼위일체 | 1955 하이날 | gen:milan_abstract | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_abstract | OK |
| `cfUpper_n1` | counterfacade_upper | 1.19×2.70 | stained_protected: V44 교회(Ecclesia) | 1955 하이날 | gen:milan_abstract | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_abstract | OK |
| `cfUpper_s1` | counterfacade_upper | 1.19×2.70 | stained_protected: V46 시나고가 | 1955 하이날 | gen:milan_abstract | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_abstract | OK |
| `clereN_b01` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereN_b02` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereN_b03` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereN_b04` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereN_b05` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereN_b06` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereN_b07` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereN_b08` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereN_b09` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereN_b12` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereN_b13` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereS_b01` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereS_b02` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereS_b03` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereS_b04` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereS_b05` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereS_b06` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereS_b07` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereS_b08` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereS_b09` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereS_b12` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `clereS_b13` | clerestory | 1.10×4.10 | stained: 고창 장식 유리(서사 없음) | 1950년대 초 | gen:milan_deco | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_deco | OK |
| `tiburio_000` | tiburio | 1.50×2.45 | stained_protected: 티부리오: 제2차 바티칸 공의회 연작 | 1968 | gen:milan_abstract | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_abstract | OK |
| `tiburio_045` | tiburio | 1.50×2.45 | stained_protected: 티부리오: 제2차 바티칸 공의회 연작 | 1968 | gen:milan_abstract | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_abstract | OK |
| `tiburio_090` | tiburio | 1.50×2.45 | stained_protected: 티부리오: 제2차 바티칸 공의회 연작 | 1968 | gen:milan_abstract | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_abstract | OK |
| `tiburio_135` | tiburio | 1.50×2.45 | stained_protected: 티부리오: 제2차 바티칸 공의회 연작 | 1968 | gen:milan_abstract | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_abstract | OK |
| `tiburio_180` | tiburio | 1.50×2.45 | stained_protected: 티부리오: 제2차 바티칸 공의회 연작 | 1968 | gen:milan_abstract | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_abstract | OK |
| `tiburio_225` | tiburio | 1.50×2.45 | stained_protected: 티부리오: 제2차 바티칸 공의회 연작 | 1968 | gen:milan_abstract | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_abstract | OK |
| `tiburio_270` | tiburio | 1.50×2.45 | stained_protected: 티부리오: 제2차 바티칸 공의회 연작 | 1968 | gen:milan_abstract | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_abstract | OK |
| `tiburio_315` | tiburio | 1.50×2.45 | stained_protected: 티부리오: 제2차 바티칸 공의회 연작 | 1968 | gen:milan_abstract | dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 gen:milan_abstract | OK |

### florence

| key | 구역 | 크기 | 실제 | 시대·작가 | 모델(배포판) | 개발판 | 판정 |
|---|---|---|---|---|---|---|---|
| `facade_center` | facade | 3.00×3.00 | stained: 성모 승천(오쿨루스) | 1404–05 기베르티 | photo:oculus_florence_ghiberti_1 (대역 gen:florence_oculus) | 같음 | OK |
| `facade_N` | facade | 2.00×2.00 | stained: 옥좌의 성 라우렌시오 / 성 스테파노(좌우 미확정) | 1412–15 기베르티 | gen:florence_oculus | 같음 | OK |
| `facade_S` | facade | 2.00×2.00 | stained: 옥좌의 성 라우렌시오 / 성 스테파노(좌우 미확정) | 1412–15 기베르티 | gen:florence_oculus | 같음 | OK |
| `aisleN_b1` | aisle | 1.30×4.84 | plain: ICCD 그림 창 44점에 없음(무도상 유리, 종류 미확인) |  | gen:florence_plain | 같음 | OK |
| `aisleN_b2` | aisle | 1.30×4.84 | plain: ICCD 그림 창 44점에 없음(무도상 유리, 종류 미확인) |  | gen:florence_plain | 같음 | OK |
| `aisleN_b3` | aisle | 1.30×4.84 | stained: 측랑 이련창 성인들(3~4단) | 1394–96 | gen:florence_gothic | 같음 | OK |
| `aisleN_b4` | aisle | 1.30×4.84 | stained: 측랑 이련창 성인들(3~4단) | 1394–96 | gen:florence_gothic | 같음 | OK |
| `aisleS_b1` | aisle | 1.30×4.84 | plain: ICCD 그림 창 44점에 없음(무도상 유리, 종류 미확인) |  | gen:florence_plain | 같음 | OK |
| `aisleS_b2` | aisle | 1.30×4.84 | plain: ICCD 그림 창 44점에 없음(무도상 유리, 종류 미확인) |  | gen:florence_plain | 같음 | OK |
| `aisleS_b3` | aisle | 1.30×4.84 | stained: 측랑 이련창 성인들(3~4단) | 1394–96 | gen:florence_gothic | 같음 | OK |
| `aisleS_b4` | aisle | 1.30×4.84 | stained: 측랑 이련창 성인들(3~4단) | 1394–96 | gen:florence_gothic | 같음 | OK |
| `naveOcN_b1` | nave_oculus | 1.90×1.90 | plain: ICCD 그림 창 44점에 없음(무도상 유리, 종류 미확인) |  | gen:florence_plain | 같음 | OK |
| `naveOcN_b2` | nave_oculus | 1.90×1.90 | plain: ICCD 그림 창 44점에 없음(무도상 유리, 종류 미확인) |  | gen:florence_plain | 같음 | OK |
| `naveOcN_b3` | nave_oculus | 1.90×1.90 | plain: ICCD 그림 창 44점에 없음(무도상 유리, 종류 미확인) |  | gen:florence_plain | 같음 | OK |
| `naveOcN_b4` | nave_oculus | 1.90×1.90 | plain: ICCD 그림 창 44점에 없음(무도상 유리, 종류 미확인) |  | gen:florence_plain | 같음 | OK |
| `naveOcS_b1` | nave_oculus | 1.90×1.90 | plain: ICCD 그림 창 44점에 없음(무도상 유리, 종류 미확인) |  | gen:florence_plain | 같음 | OK |
| `naveOcS_b2` | nave_oculus | 1.90×1.90 | plain: ICCD 그림 창 44점에 없음(무도상 유리, 종류 미확인) |  | gen:florence_plain | 같음 | OK |
| `naveOcS_b3` | nave_oculus | 1.90×1.90 | plain: ICCD 그림 창 44점에 없음(무도상 유리, 종류 미확인) |  | gen:florence_plain | 같음 | OK |
| `naveOcS_b4` | nave_oculus | 1.90×1.90 | plain: ICCD 그림 창 44점에 없음(무도상 유리, 종류 미확인) |  | gen:florence_plain | 같음 | OK |
| `drum_E` | drum | 1.60×1.60 | stained: 성모 대관(도나텔로) | 1433–37 | photo:oculus_florence_donatello (대역 gen:florence_oculus) | 같음 | OK |
| `drum_N` | drum | 1.60×1.60 | stained: 드럼 오쿨루스(주님 승천·겟세마니·성전 봉헌·성탄·부활·십자가에서 내려지심 — 면 미확정) | 1443–45 | gen:florence_oculus | 같음 | OK |
| `drum_NE` | drum | 1.60×1.60 | stained: 드럼 오쿨루스(주님 승천·겟세마니·성전 봉헌·성탄·부활·십자가에서 내려지심 — 면 미확정) | 1443–45 | photo:oculus_florence_ghiberti_2 (대역 gen:florence_oculus) | 같음 | OK |
| `drum_NW` | drum | 1.60×1.60 | stained: 드럼 오쿨루스(주님 승천·겟세마니·성전 봉헌·성탄·부활·십자가에서 내려지심 — 면 미확정) | 1443–45 | gen:florence_oculus | 같음 | OK |
| `drum_S` | drum | 1.60×1.60 | stained: 드럼 오쿨루스(주님 승천·겟세마니·성전 봉헌·성탄·부활·십자가에서 내려지심 — 면 미확정) | 1443–45 | gen:florence_oculus | 같음 | OK |
| `drum_SE` | drum | 1.60×1.60 | stained: 드럼 오쿨루스(주님 승천·겟세마니·성전 봉헌·성탄·부활·십자가에서 내려지심 — 면 미확정) | 1443–45 | gen:florence_oculus | 같음 | OK |
| `drum_SW` | drum | 1.60×1.60 | stained: 드럼 오쿨루스(주님 승천·겟세마니·성전 봉헌·성탄·부활·십자가에서 내려지심 — 면 미확정) | 1443–45 | gen:florence_oculus | 같음 | OK |
| `drum_W` | drum | 1.60×1.60 | plain: ICCD 그림 창 44점에 없음(무도상 유리, 종류 미확인) |  | gen:florence_plain | 같음 | OK |
| `tribE_c1` | tribune_chapel | 0.80×2.78 | stained: 트리부나 경당 창: 봉헌 성인 + 성인 둘 | 1439–43 기베르티(3점 1890–1906 재제작) | gen:florence_saints | 같음 | OK |
| `tribE_c2` | tribune_chapel | 0.80×2.78 | stained: 트리부나 경당 창: 봉헌 성인 + 성인 둘 | 1439–43 기베르티(3점 1890–1906 재제작) | gen:florence_saints | 같음 | OK |
| `tribE_c3` | tribune_chapel | 0.80×2.78 | stained: 트리부나 경당 창: 봉헌 성인 + 성인 둘 | 1439–43 기베르티(3점 1890–1906 재제작) | gen:florence_saints | 같음 | OK |
| `tribE_c4` | tribune_chapel | 0.80×2.78 | stained: 트리부나 경당 창: 봉헌 성인 + 성인 둘 | 1439–43 기베르티(3점 1890–1906 재제작) | gen:florence_saints | 같음 | OK |
| `tribE_c5` | tribune_chapel | 0.80×2.78 | stained: 트리부나 경당 창: 봉헌 성인 + 성인 둘 | 1439–43 기베르티(3점 1890–1906 재제작) | gen:florence_saints | 같음 | OK |
| `tribN_c1` | tribune_chapel | 0.80×2.78 | stained: 트리부나 경당 창: 봉헌 성인 + 성인 둘 | 1439–43 기베르티(3점 1890–1906 재제작) | gen:florence_saints | 같음 | OK |
| `tribN_c2` | tribune_chapel | 0.80×2.78 | stained: 트리부나 경당 창: 봉헌 성인 + 성인 둘 | 1439–43 기베르티(3점 1890–1906 재제작) | gen:florence_saints | 같음 | OK |
| `tribN_c3` | tribune_chapel | 0.80×2.78 | stained: 트리부나 경당 창: 봉헌 성인 + 성인 둘 | 1439–43 기베르티(3점 1890–1906 재제작) | gen:florence_saints | 같음 | OK |
| `tribN_c4` | tribune_chapel | 0.80×2.78 | stained: 트리부나 경당 창: 봉헌 성인 + 성인 둘 | 1439–43 기베르티(3점 1890–1906 재제작) | gen:florence_saints | 같음 | OK |
| `tribN_c5` | tribune_chapel | 0.80×2.78 | stained: 트리부나 경당 창: 봉헌 성인 + 성인 둘 | 1439–43 기베르티(3점 1890–1906 재제작) | gen:florence_saints | 같음 | OK |
| `tribS_c1` | tribune_chapel | 0.80×2.78 | stained: 트리부나 경당 창: 봉헌 성인 + 성인 둘 | 1439–43 기베르티(3점 1890–1906 재제작) | gen:florence_saints | 같음 | OK |
| `tribS_c2` | tribune_chapel | 0.80×2.78 | stained: 트리부나 경당 창: 봉헌 성인 + 성인 둘 | 1439–43 기베르티(3점 1890–1906 재제작) | gen:florence_saints | 같음 | OK |
| `tribS_c3` | tribune_chapel | 0.80×2.78 | stained: 트리부나 경당 창: 봉헌 성인 + 성인 둘 | 1439–43 기베르티(3점 1890–1906 재제작) | gen:florence_saints | 같음 | OK |
| `tribS_c4` | tribune_chapel | 0.80×2.78 | stained: 트리부나 경당 창: 봉헌 성인 + 성인 둘 | 1439–43 기베르티(3점 1890–1906 재제작) | gen:florence_saints | 같음 | OK |
| `tribS_c5` | tribune_chapel | 0.80×2.78 | stained: 트리부나 경당 창: 봉헌 성인 + 성인 둘 | 1439–43 기베르티(3점 1890–1906 재제작) | gen:florence_saints | 같음 | OK |
| `tribE_u1` | tribune_upper | 0.86×2.67 | stained: 트리부나 윗창: 예언자·구약의 임금·성조 | 1434–42 | gen:florence_saints | 같음 | OK |
| `tribE_u2` | tribune_upper | 0.86×2.67 | stained: 트리부나 윗창: 예언자·구약의 임금·성조 | 1434–42 | gen:florence_saints | 같음 | OK |
| `tribE_u3` | tribune_upper | 0.86×2.67 | stained: 트리부나 윗창: 예언자·구약의 임금·성조 | 1434–42 | gen:florence_saints | 같음 | OK |
| `tribE_u4` | tribune_upper | 0.86×2.67 | stained: 트리부나 윗창: 예언자·구약의 임금·성조 | 1434–42 | gen:florence_saints | 같음 | OK |
| `tribE_u5` | tribune_upper | 0.86×2.67 | stained: 트리부나 윗창: 예언자·구약의 임금·성조 | 1434–42 | gen:florence_saints | 같음 | OK |
| `tribN_u1` | tribune_upper | 0.86×2.67 | stained: 트리부나 윗창: 예언자·구약의 임금·성조 | 1434–42 | gen:florence_saints | 같음 | OK |
| `tribN_u2` | tribune_upper | 0.86×2.67 | stained: 트리부나 윗창: 예언자·구약의 임금·성조 | 1434–42 | gen:florence_saints | 같음 | OK |
| `tribN_u3` | tribune_upper | 0.86×2.67 | stained: 트리부나 윗창: 예언자·구약의 임금·성조 | 1434–42 | gen:florence_saints | 같음 | OK |
| `tribN_u4` | tribune_upper | 0.86×2.67 | stained: 트리부나 윗창: 예언자·구약의 임금·성조 | 1434–42 | gen:florence_saints | 같음 | OK |
| `tribN_u5` | tribune_upper | 0.86×2.67 | stained: 트리부나 윗창: 예언자·구약의 임금·성조 | 1434–42 | gen:florence_saints | 같음 | OK |
| `tribS_u1` | tribune_upper | 0.86×2.67 | stained: 트리부나 윗창: 예언자·구약의 임금·성조 | 1434–42 | gen:florence_saints | 같음 | OK |
| `tribS_u2` | tribune_upper | 0.86×2.67 | stained: 트리부나 윗창: 예언자·구약의 임금·성조 | 1434–42 | gen:florence_saints | 같음 | OK |
| `tribS_u3` | tribune_upper | 0.86×2.67 | stained: 트리부나 윗창: 예언자·구약의 임금·성조 | 1434–42 | gen:florence_saints | 같음 | OK |
| `tribS_u4` | tribune_upper | 0.86×2.67 | stained: 트리부나 윗창: 예언자·구약의 임금·성조 | 1434–42 | gen:florence_saints | 같음 | OK |
| `tribS_u5` | tribune_upper | 0.86×2.67 | stained: 트리부나 윗창: 예언자·구약의 임금·성조 | 1434–42 | gen:florence_saints | 같음 | OK |

### myeongdong

| key | 구역 | 크기 | 실제 | 시대·작가 | 모델(배포판) | 개발판 | 판정 |
|---|---|---|---|---|---|---|---|
| `facade_tower` | facade | 2.53×6.38 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_clere | 같음 | OK |
| `facade_tympanum` | facade | 2.40×1.30 | stained_protected: 제44차 세계 성체대회 기념(추상 색면 + 성체) | 1989 이남규 | gen:myeongdong_tymp | 같음 | OK |
| `aisleEndL_rose` | aisle_end | 1.32×1.32 | stained: 측랑 끝 작은 장미창(동쪽은 대칭 추정) |  | gen:myeongdong_flower | 같음 | OK |
| `aisleEndR_rose` | aisle_end | 1.32×1.32 | stained: 측랑 끝 작은 장미창(동쪽은 대칭 추정) |  | gen:myeongdong_flower | 같음 | OK |
| `apse_C` | apse | 1.46×8.18 | stained: 묵주기도 15단(창마다 세 장면, 배열 미확인) | 1898 무렵 제스타 공방 | gen:myeongdong_medal | 같음 | OK |
| `apse_L1` | apse | 1.26×7.78 | stained: 묵주기도 15단(창마다 세 장면, 배열 미확인) | 1898 무렵 제스타 공방 | gen:myeongdong_medal | 같음 | OK |
| `apse_L2` | apse | 1.26×7.78 | stained: 묵주기도 15단(창마다 세 장면, 배열 미확인) | 1898 무렵 제스타 공방 | gen:myeongdong_medal | 같음 | OK |
| `apse_R1` | apse | 1.26×7.78 | stained: 묵주기도 15단(창마다 세 장면, 배열 미확인) | 1898 무렵 제스타 공방 | gen:myeongdong_medal | 같음 | OK |
| `apse_R2` | apse | 1.26×7.78 | stained: 묵주기도 15단(창마다 세 장면, 배열 미확인) | 1898 무렵 제스타 공방 | gen:myeongdong_medal | 같음 | OK |
| `trEndL` | transept_end | 3.66×9.03 | stained: 성탄과 동방 박사들의 경배 | 1898 무렵 | gen:myeongdong_figure | 같음 | OK |
| `trEndR` | transept_end | 3.66×9.03 | stained: 예수님과 열두 사도 | 1898 무렵 | gen:myeongdong_figure | 같음 | OK |
| `trInL_back` | transept_upper | 1.16×4.38 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_clere | 같음 | OK |
| `trInL_front` | transept_upper | 1.16×4.38 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_clere | 같음 | OK |
| `trInR_back` | transept_upper | 1.16×4.38 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_clere | 같음 | OK |
| `trInR_front` | transept_upper | 1.16×4.38 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_clere | 같음 | OK |
| `trUpL_back` | transept_upper | 1.36×3.98 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_clere | 같음 | OK |
| `trUpL_front` | transept_upper | 1.36×3.98 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_clere | 같음 | OK |
| `trUpR_back` | transept_upper | 1.36×3.98 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_clere | 같음 | OK |
| `trUpR_front` | transept_upper | 1.36×3.98 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_clere | 같음 | OK |
| `aisleL_n1` | aisle | 2.13×4.08 | stained: 신자석 무늬창("꽃 모양", 인물 없음) | 1898 무렵 | gen:myeongdong_flower | 같음 | OK |
| `aisleL_n2` | aisle | 2.13×4.08 | stained: 신자석 무늬창("꽃 모양", 인물 없음) | 1898 무렵 | gen:myeongdong_flower | 같음 | OK |
| `aisleL_n3` | aisle | 2.13×4.08 | stained: 신자석 무늬창("꽃 모양", 인물 없음) | 1898 무렵 | gen:myeongdong_flower | 같음 | OK |
| `aisleL_n4` | aisle | 2.13×4.08 | stained: 신자석 무늬창("꽃 모양", 인물 없음) | 1898 무렵 | gen:myeongdong_flower | 같음 | OK |
| `aisleL_n5` | aisle | 2.13×4.08 | stained: 신자석 무늬창("꽃 모양", 인물 없음) | 1898 무렵 | gen:myeongdong_flower | 같음 | OK |
| `aisleL_n6` | aisle | 2.13×4.08 | stained: 신자석 무늬창("꽃 모양", 인물 없음) | 1898 무렵 | gen:myeongdong_flower | 같음 | OK |
| `aisleR_n1` | aisle | 2.13×4.08 | stained: 신자석 무늬창("꽃 모양", 인물 없음) | 1898 무렵 | gen:myeongdong_flower | 같음 | OK |
| `aisleR_n2` | aisle | 2.13×4.08 | stained: 신자석 무늬창("꽃 모양", 인물 없음) | 1898 무렵 | gen:myeongdong_flower | 같음 | OK |
| `aisleR_n3` | aisle | 2.13×4.08 | stained: 신자석 무늬창("꽃 모양", 인물 없음) | 1898 무렵 | gen:myeongdong_flower | 같음 | OK |
| `aisleR_n4` | aisle | 2.13×4.08 | stained: 신자석 무늬창("꽃 모양", 인물 없음) | 1898 무렵 | gen:myeongdong_flower | 같음 | OK |
| `aisleR_n5` | aisle | 2.13×4.08 | stained: 신자석 무늬창("꽃 모양", 인물 없음) | 1898 무렵 | gen:myeongdong_flower | 같음 | OK |
| `aisleR_n6` | aisle | 2.13×4.08 | stained: 신자석 무늬창("꽃 모양", 인물 없음) | 1898 무렵 | gen:myeongdong_flower | 같음 | OK |
| `aisleL_s1` | aisle_chancel | 2.13×4.08 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_flower | 같음 | OK |
| `aisleL_s2` | aisle_chancel | 2.13×4.08 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_flower | 같음 | OK |
| `aisleR_s1` | aisle_chancel | 2.13×4.08 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_flower | 같음 | OK |
| `aisleR_s2` | aisle_chancel | 2.13×4.08 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_flower | 같음 | OK |
| `clereL_n0` | clerestory | 1.06×4.48 | stained: 고측창 무늬 색유리 | 1898 무렵 | gen:myeongdong_clere | 같음 | OK |
| `clereL_n1` | clerestory | 1.06×4.48 | stained: 고측창 무늬 색유리 | 1898 무렵 | gen:myeongdong_clere | 같음 | OK |
| `clereL_n2` | clerestory | 1.06×4.48 | stained: 고측창 무늬 색유리 | 1898 무렵 | gen:myeongdong_clere | 같음 | OK |
| `clereL_n3` | clerestory | 1.06×4.48 | stained: 고측창 무늬 색유리 | 1898 무렵 | gen:myeongdong_clere | 같음 | OK |
| `clereL_n4` | clerestory | 1.06×4.48 | stained: 고측창 무늬 색유리 | 1898 무렵 | gen:myeongdong_clere | 같음 | OK |
| `clereL_n5` | clerestory | 1.06×4.48 | stained: 고측창 무늬 색유리 | 1898 무렵 | gen:myeongdong_clere | 같음 | OK |
| `clereL_n6` | clerestory | 1.06×4.48 | stained: 고측창 무늬 색유리 | 1898 무렵 | gen:myeongdong_clere | 같음 | OK |
| `clereR_n0` | clerestory | 1.06×4.48 | stained: 고측창 무늬 색유리 | 1898 무렵 | gen:myeongdong_clere | 같음 | OK |
| `clereR_n1` | clerestory | 1.06×4.48 | stained: 고측창 무늬 색유리 | 1898 무렵 | gen:myeongdong_clere | 같음 | OK |
| `clereR_n2` | clerestory | 1.06×4.48 | stained: 고측창 무늬 색유리 | 1898 무렵 | gen:myeongdong_clere | 같음 | OK |
| `clereR_n3` | clerestory | 1.06×4.48 | stained: 고측창 무늬 색유리 | 1898 무렵 | gen:myeongdong_clere | 같음 | OK |
| `clereR_n4` | clerestory | 1.06×4.48 | stained: 고측창 무늬 색유리 | 1898 무렵 | gen:myeongdong_clere | 같음 | OK |
| `clereR_n5` | clerestory | 1.06×4.48 | stained: 고측창 무늬 색유리 | 1898 무렵 | gen:myeongdong_clere | 같음 | OK |
| `clereR_n6` | clerestory | 1.06×4.48 | stained: 고측창 무늬 색유리 | 1898 무렵 | gen:myeongdong_clere | 같음 | OK |
| `clereL_s1` | clerestory_chancel | 1.06×4.48 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_clere | 같음 | OK |
| `clereL_s2` | clerestory_chancel | 1.06×4.48 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_clere | 같음 | OK |
| `clereR_s1` | clerestory_chancel | 1.06×4.48 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_clere | 같음 | OK |
| `clereR_s2` | clerestory_chancel | 1.06×4.48 | stained_unverified: 도상 미확인(같은 성당의 무늬창으로 봄) |  | gen:myeongdong_clere | 같음 | OK |

### danggogae

| key | 구역 | 크기 | 실제 | 시대·작가 | 모델(배포판) | 개발판 | 판정 |
|---|---|---|---|---|---|---|---|
| `hanjiLowL_b1` | hanji_lower | 0.50×1.90 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiLowL_b2` | hanji_lower | 0.50×1.90 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiLowL_b3` | hanji_lower | 0.50×1.90 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiLowL_b4` | hanji_lower | 0.50×1.90 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiLowL_b5` | hanji_lower | 0.50×1.90 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiLowL_b6` | hanji_lower | 0.50×1.90 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiLowL_b7` | hanji_lower | 0.50×1.90 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiLowR_b1` | hanji_lower | 0.50×1.90 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiLowR_b2` | hanji_lower | 0.50×1.90 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiLowR_b3` | hanji_lower | 0.50×1.90 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiLowR_b4` | hanji_lower | 0.50×1.90 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiLowR_b5` | hanji_lower | 0.50×1.90 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiLowR_b6` | hanji_lower | 0.50×1.90 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiLowR_b7` | hanji_lower | 0.50×1.90 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiTopL_b1` | hanji_upper | 0.50×0.91 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiTopL_b2` | hanji_upper | 0.50×0.91 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiTopL_b3` | hanji_upper | 0.50×0.91 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiTopL_b4` | hanji_upper | 0.50×0.91 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiTopL_b5` | hanji_upper | 0.50×0.91 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiTopL_b6` | hanji_upper | 0.50×0.91 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiTopL_b7` | hanji_upper | 0.50×0.91 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiTopR_b1` | hanji_upper | 0.50×0.91 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiTopR_b2` | hanji_upper | 0.50×0.91 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiTopR_b3` | hanji_upper | 0.50×0.91 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiTopR_b4` | hanji_upper | 0.50×0.91 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiTopR_b5` | hanji_upper | 0.50×0.91 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiTopR_b6` | hanji_upper | 0.50×0.91 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |
| `hanjiTopR_b7` | hanji_upper | 0.50×0.91 | hanji: 한지 유리화 빛 상자(작가 미확인, 2011) | 2011 | hanji | 같음 | OK |

### yeouido

| key | 구역 | 크기 | 실제 | 시대·작가 | 모델(배포판) | 개발판 | 판정 |
|---|---|---|---|---|---|---|---|
| `frontL` | front | 1.00×6.40 | stained_protected: 정면 키 큰 현대 색유리(작가 미확인) | 현대 | gen:yeouido_abstract | 같음 | OK |
| `frontR` | front | 1.00×6.40 | stained_protected: 정면 키 큰 현대 색유리(작가 미확인) | 현대 | gen:yeouido_abstract | 같음 | OK |
| `lobbyGlass1` | lobby_glass | 2.60×3.75 | stained_protected: 로비 전면 색유리(최영심 빅토리아, 2024 — 생존 작가) | 2024 | gen:yeouido_lobby | 같음 | OK |
| `lobbyGlass2` | lobby_glass | 2.60×3.75 | stained_protected: 로비 전면 색유리(최영심 빅토리아, 2024 — 생존 작가) | 2024 | gen:yeouido_lobby | 같음 | OK |
| `lobbyGlass3` | lobby_glass | 2.60×3.75 | stained_protected: 로비 전면 색유리(최영심 빅토리아, 2024 — 생존 작가) | 2024 | gen:yeouido_lobby | 같음 | OK |
| `lobbyFront1` | lobby_front | 2.60×3.90 | clear: 로비 유리 정면(맑은 유리, 밖은 밝은 빛) |  | plain | 같음 | OK |
| `lobbyFront2` | lobby_front | 2.60×3.90 | clear: 로비 유리 정면(맑은 유리, 밖은 밝은 빛) |  | plain | 같음 | OK |
| `lobbyFront3` | lobby_front | 2.60×3.90 | clear: 로비 유리 정면(맑은 유리, 밖은 밝은 빛) |  | plain | 같음 | OK |
