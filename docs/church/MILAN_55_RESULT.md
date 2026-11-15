# 밀라노 55개 개발용 임시 유리 — 구현 결과 (E-4)

> **자동 생성 문서다. 직접 고치지 말 것**: `node tools/church_web/milan55_report.mjs` (표를 고친 뒤 다시 돌린다. `--check` 는 최신인지 확인).
> 계획·분석은 `MILAN_55_PLACEMENT.md`(E-1), 실제 창 조사는 `MILAN_GLASS_RESEARCH.md`(E-2), 체계·빌드·릴리스 차단은 `GLASS_DEV_PIPELINE.md`.
> 55장은 **AI 창작 시안**이다. 실제 밀라노 창의 도상이 아니다(`texture_matches_historical_work=false`, `release_approved=false` 55행 전부). 개발용 APK 에만 들어간다.

## 0. 한눈에

- 55개 중 **성당 안 배치 42** · **QA Gallery 전용 13**(자리는 알지만 보류 6 + 위치 미확정 7) · 걸려다 못 건 것 0.
- 배치 42개의 확신도: 확인(confirmed) 35 · 개연(probable) 7 · 추정(assumed) 0. 근거는 표의 마지막 칸과 대응표의 `evidence_ko`.
- 밀라노 씬의 개구부는 **78개**(유리 73 + 문 5), 전부 빌더가 key 를 붙여 anchor 로 내보낸다(`ctx._.glassAnchors`). 창별 Mesh 는 여전히 없다(유리는 한 배치) → 시안 판의 식별자는 `userData.devGlass = ['DEV-0xx@<key>', …]`.
- 그림 팩 `assets/church/dev/gpack_dev_milan.js`: 55장, 원본 해상도 그대로(WebP q90 합 1.99MB, data URI JS 2.66MB). 일반 APK 에는 0KB.
- 그리기: 긴 변 512px 이하 52장은 실행 중 아틀라스 1장(2048×1024)으로 묶어 draw call 1, 큰 3장(DEV-001~003)은 1씩, 뒤판 1 → **최대 +5**.

## 1. 55개 DEV 별 적용 상태

상태: **배치** = 성당 안 개구부에 걸림 · **보류** = 실제 자리는 알지만 그 건축이 없어 QA Gallery 에만 · **미확정** = 실제 위치를 몰라 QA Gallery 에만.
world x, y, z = 판 가운데(유리 평면에서 실내 쪽 3cm). yaw = 판의 +Z(앞면)가 실내를 보는 Y 회전(도). 판 = 그림 비율 그대로(contain, 꼭대기 맞춤)의 폭×높이(m).
덮음 = 판이 개구부 상자를 덮는 비율. 나머지: lead = 어두운 납틀색 뒤판, glass = 기존 절차적 유리가 보임. 텍셀 = 그림 1화소의 크기.

| DEV | 실제 창(V) | 상태 | 개구부 key | world x, y, z | yaw° | 판 폭×높이 | 개구부 폭×높이 | 덮음·나머지 | 텍셀(mm) | 확신도 | 미배치 원인 / 근거 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DEV-001 | V01 | 배치 | `aisleS_b1` | 13.926, 8.509, 32.644 | -90 | 1.75×3.98 | 1.75×7.8 | 51% · glass | 3 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 남측랑, 정문에서 제대 쪽으로 1번째 창(V01) = 빌더의 남측랑 1번째 칸 |
| DEV-002 | V02 | 배치 | `aisleS_b2` | 13.926, 7.669, 28.132 | -90 | 1.75×5.66 | 1.75×7.8 | 73% · glass | 5 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 남측랑, 정문에서 제대 쪽으로 2번째 창(V02) = 빌더의 남측랑 2번째 칸 |
| DEV-003 | V03 | 배치 | `aisleS_b3` | 13.926, 7.66, 23.62 | -90 | 1.75×5.68 | 1.75×7.8 | 73% · glass | 5 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 남측랑, 정문에서 제대 쪽으로 3번째 창(V03) = 빌더의 남측랑 3번째 칸 |
| DEV-004 | V04 | 배치 | `aisleS_b4` | 13.926, 6.6, 19.108 | -90 | 1.56×7.8 | 1.75×7.8 | 89% · lead | 25 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 남측랑, 정문에서 제대 쪽으로 4번째 창(V04) = 빌더의 남측랑 4번째 칸 |
| DEV-005 | V05 | 배치 | `aisleS_b5` | 13.926, 6.6, 14.596 | -90 | 1.63×7.8 | 1.75×7.8 | 93% · lead | 25 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 남측랑, 정문에서 제대 쪽으로 5번째 창(V05) = 빌더의 남측랑 5번째 칸 |
| DEV-006 | V06 | 배치 | `aisleS_b6` | 13.926, 6.6, 10.084 | -90 | 1.63×7.8 | 1.75×7.8 | 93% · lead | 25 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 남측랑, 정문에서 제대 쪽으로 6번째 창(V06) = 빌더의 남측랑 6번째 칸 |
| DEV-007 | V07 © | 배치 | `aisleS_b7` | 13.926, 7.4, 5.572 | -90 | 1.2×5.8 | 1.75×5.8 | 69% · glass | 18 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 남측랑, 정문에서 제대 쪽으로 7번째 창(V07) = 빌더의 남측랑 7번째 칸 |
| DEV-008 | V08 | 배치 | `aisleS_b8` | 13.926, 7.4, 1.06 | -90 | 1.14×5.8 | 1.75×5.8 | 65% · glass | 18 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 남측랑, 정문에서 제대 쪽으로 8번째 창(V08) = 빌더의 남측랑 8번째 칸 |
| DEV-009 | V09 | 배치 | `trWestS` | 16.868, 7.375, -0.806 | 180 | 1.41×6.65 | 1.41×9 | 74% · glass | 21 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 익랑 순서 확인(도면 + Fabbrica 설명 + CVMA): 서쪽 벽 → 끝 벽 서쪽 칸 → 경당 3창 → 끝 벽 동쪽 칸 → 동쪽 벽 — V09 = 남익랑 서쪽 벽(메데기노 영묘 위) |
| DEV-010 | V10 | 배치 | `trEndS_west` | 20.59, 6.678, -3.452 | -90 | 1.66×8.05 | 1.66×9 | 89% · lead | 26 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 익랑 순서 확인(도면 + Fabbrica 설명 + CVMA): 서쪽 벽 → 끝 벽 서쪽 칸 → 경당 3창 → 끝 벽 동쪽 칸 → 동쪽 벽 — V10 = 남익랑 끝 벽 서쪽 칸 |
| DEV-011 | V11 | 배치 | `chapS_w` | 22.305, 7.34, -7.782 | -149.95 | 1.02×5.1 | 1.02×7.69 | 66% · glass | 16 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 경당은 반육각형 후진(형태 확인, 치수는 ±20% 단서로 지음). V11 = 서쪽 사선 면(제대 오른쪽) |
| DEV-012 | V12 | 배치 | `chapS_c` | 23.71, 7.528, -10.22 | -90 | 1.02×4.72 | 1.02×7.69 | 61% · glass | 15 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 경당은 반육각형 후진(형태 확인, 치수는 ±20% 단서로 지음). V12 = 끝 가운데 면(제대 위) |
| DEV-013 | V13 | 배치 | `chapS_e` | 22.305, 7.456, -12.658 | -30.05 | 1.02×4.87 | 1.02×7.69 | 63% · glass | 15 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 경당은 반육각형 후진(형태 확인, 치수는 ±20% 단서로 지음). V13 = 동쪽 사선 면(제대 왼쪽) |
| DEV-014 | V14 | 배치 | `trEndS_east` | 20.59, 6.2, -16.988 | -90 | 1.66×9 | 1.66×9 | 100% · lead | 26 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 익랑 순서 확인(도면 + Fabbrica 설명 + CVMA): 서쪽 벽 → 끝 벽 서쪽 칸 → 경당 3창 → 끝 벽 동쪽 칸 → 동쪽 벽 — V14 = 남익랑 끝 벽 동쪽 칸 |
| DEV-015 | V15 | 배치 | `trEastS` | 16.868, 6.269, -19.634 | 0 | 1.66×8.86 | 1.66×9 | 98% · lead | 26 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 익랑 순서 확인(도면 + Fabbrica 설명 + CVMA): 서쪽 벽 → 끝 벽 서쪽 칸 → 경당 3창 → 끝 벽 동쪽 칸 → 동쪽 벽 — V15 = 남익랑 동쪽 벽(성모 봉헌 제대 위) |
| DEV-016 | V16 | 보류(QA) | `sacS_1` | — | — | — | — | — | — | probable | **성구실 미구현** — 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 도면의 P16~18·P22~24 는 주보랑(회랑) 바깥벽이 아니라 **성구실 방의 바깥벽 창**이다(개연). 회랑 바깥벽은 실제로도 맹벽 → 회랑에 뚫지 않는다. 성구실 방을 지으면 anchor 를 주고 hang 을 지운다. V16 = 남(참사회) 성구실 남쪽 바깥벽, 익랑 쪽(주제 미확인) |
| DEV-017 | V17 | 보류(QA) | `sacS_2` | — | — | — | — | — | — | probable | **성구실 미구현** — 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 도면의 P16~18·P22~24 는 주보랑(회랑) 바깥벽이 아니라 **성구실 방의 바깥벽 창**이다(개연). 회랑 바깥벽은 실제로도 맹벽 → 회랑에 뚫지 않는다. 성구실 방을 지으면 anchor 를 주고 hang 을 지운다. V17 = 남 성구실 남쪽 바깥벽, 후진 쪽(주제 미확인) |
| DEV-018 | V18 | 보류(QA) | `sacS_3` | — | — | — | — | — | — | probable | **성구실 미구현** — 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 도면의 P16~18·P22~24 는 주보랑(회랑) 바깥벽이 아니라 **성구실 방의 바깥벽 창**이다(개연). 회랑 바깥벽은 실제로도 맹벽 → 회랑에 뚫지 않는다. 성구실 방을 지으면 anchor 를 주고 hang 을 지운다. V18 = 남 성구실 동쪽 바깥벽(V19 옆), 네 성인, 실제 2.34×15.28m |
| DEV-019 | V19 | 배치 | `apse_south` | 6.885, 6.05, -32.268 | -49.59 | 1.6×8.1 | 3.5×8.1 | 46% · glass | 23 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): V19 = 후진 남동 면(신약 이야기) |
| DEV-020 | V20 | 배치 | `apse_center` | 0, 7.951, -35.44 | 0 | 1.21×6.3 | 4.8×9.1 | 25% · glass | 18 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): V20 = 후진 가운데(요한 묵시록). 아래 2.74m 는 진본 사진 milan_apse_lower(V20 하부로 판단) 자리라 그 위쪽에만 건다 |
| DEV-021 | V21 | 배치 | `apse_north` | -6.885, 6.05, -32.268 | 49.59 | 1.53×8.1 | 3.5×8.1 | 44% · glass | 23 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): V21 = 후진 북동 면(구약 이야기) |
| DEV-022 | V22 | 보류(QA) | `sacN_3` | — | — | — | — | — | — | probable | **성구실 미구현** — 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 도면의 P16~18·P22~24 는 주보랑(회랑) 바깥벽이 아니라 **성구실 방의 바깥벽 창**이다(개연). 회랑 바깥벽은 실제로도 맹벽 → 회랑에 뚫지 않는다. 성구실 방을 지으면 anchor 를 주고 hang 을 지운다. V22 = 북(아퀼로나레) 성구실 동쪽 바깥벽(주제 미확인) |
| DEV-023 | V23 | 보류(QA) | `sacN_2` | — | — | — | — | — | — | probable | **성구실 미구현** — 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 도면의 P16~18·P22~24 는 주보랑(회랑) 바깥벽이 아니라 **성구실 방의 바깥벽 창**이다(개연). 회랑 바깥벽은 실제로도 맹벽 → 회랑에 뚫지 않는다. 성구실 방을 지으면 anchor 를 주고 hang 을 지운다. V23 = 북 성구실 북쪽 바깥벽, 후진 쪽(주제 미확인) |
| DEV-024 | V24 | 보류(QA) | `sacN_1` | — | — | — | — | — | — | probable | **성구실 미구현** — 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 도면의 P16~18·P22~24 는 주보랑(회랑) 바깥벽이 아니라 **성구실 방의 바깥벽 창**이다(개연). 회랑 바깥벽은 실제로도 맹벽 → 회랑에 뚫지 않는다. 성구실 방을 지으면 anchor 를 주고 hang 을 지운다. V24 = 북 성구실 북쪽 바깥벽, 익랑 쪽(주제 미확인) |
| DEV-025 | V25 | 배치 | `trEastN` | -16.868, 6.307, -19.634 | 0 | 1.66×8.79 | 1.66×9 | 98% · lead | 26 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 익랑 순서 확인(도면 + Fabbrica 설명 + CVMA): 서쪽 벽 → 끝 벽 서쪽 칸 → 경당 3창 → 끝 벽 동쪽 칸 → 동쪽 벽(북쪽은 거울) — V25 = 북익랑 동쪽 벽(성녀 프락세데스 제대 위) |
| DEV-026 | V26 | 배치 | `trEndN_east` | -20.59, 6.32, -16.988 | 90 | 1.66×8.76 | 1.66×9 | 97% · lead | 26 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 익랑 순서 확인(도면 + Fabbrica 설명 + CVMA): 서쪽 벽 → 끝 벽 서쪽 칸 → 경당 3창 → 끝 벽 동쪽 칸 → 동쪽 벽(북쪽은 거울) — V26 = 북익랑 끝 벽 동쪽 칸 |
| DEV-027 | V27 | 배치 | `chapN_e` | -22.305, 7.255, -12.658 | 30.05 | 1.02×5.27 | 1.02×7.69 | 69% · glass | 15 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 경당은 반육각형 후진(형태 확인, 치수는 ±20% 단서로 지음). V27 = 동쪽 사선 면(도면) |
| DEV-028 | V28 | 배치 | `chapN_c` | -23.71, 7.113, -10.22 | 90 | 1.02×5.55 | 1.02×7.69 | 72% · glass | 16 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 경당은 반육각형 후진(형태 확인, 치수는 ±20% 단서로 지음). V28 = 끝 가운데 면(도면) |
| DEV-029 | V29 | 배치 | `chapN_w` | -22.305, 7.318, -7.782 | 149.95 | 1.02×5.15 | 1.02×7.69 | 67% · glass | 15 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 경당은 반육각형 후진(형태 확인, 치수는 ±20% 단서로 지음). V29 = 서쪽 사선 면(도면) |
| DEV-030 | V30 | 배치 | `trEndN_west` | -20.59, 6.374, -3.452 | 90 | 1.66×8.65 | 1.66×9 | 96% · lead | 25 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 익랑 순서 확인(도면 + Fabbrica 설명 + CVMA): 서쪽 벽 → 끝 벽 서쪽 칸 → 경당 3창 → 끝 벽 동쪽 칸 → 동쪽 벽(북쪽은 거울) — V30 = 북익랑 끝 벽 서쪽 칸 |
| DEV-031 | V31 | 배치 | `trWestN` | -16.868, 7.07, -0.806 | 180 | 1.41×7.26 | 1.41×9 | 81% · lead | 21 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 익랑 순서 확인(도면 + Fabbrica 설명 + CVMA): 서쪽 벽 → 끝 벽 서쪽 칸 → 경당 3창 → 끝 벽 동쪽 칸 → 동쪽 벽(북쪽은 거울) — V31 = 북익랑 서쪽 벽 |
| DEV-032 | V32 | 배치 | `aisleN_b8` | -13.926, 7.4, 1.06 | 90 | 1.16×5.8 | 1.75×5.8 | 66% · glass | 17 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 북측랑, 정문에서 제대 쪽으로 8번째 창(V32) = 빌더의 북측랑 8번째 칸 |
| DEV-033 | V33 | 배치 | `aisleN_b7` | -13.926, 7.4, 5.572 | 90 | 1.13×5.8 | 1.75×5.8 | 65% · glass | 17 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 북측랑, 정문에서 제대 쪽으로 7번째 창(V33) = 빌더의 북측랑 7번째 칸 |
| DEV-034 | V34 | 배치 | `aisleN_b6` | -13.926, 6.6, 10.084 | 90 | 1.43×7.8 | 1.75×7.8 | 82% · lead | 22 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 북측랑, 정문에서 제대 쪽으로 6번째 창(V34) = 빌더의 북측랑 6번째 칸 |
| DEV-035 | V35 | 배치 | `aisleN_b5` | -13.926, 6.6, 14.596 | 90 | 1.4×7.8 | 1.75×7.8 | 80% · lead | 22 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 북측랑, 정문에서 제대 쪽으로 5번째 창(V35) = 빌더의 북측랑 5번째 칸 |
| DEV-036 | V36 | 배치 | `aisleN_b4` | -13.926, 6.6, 19.108 | 90 | 1.44×7.8 | 1.75×7.8 | 82% · lead | 22 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 북측랑, 정문에서 제대 쪽으로 4번째 창(V36) = 빌더의 북측랑 4번째 칸 |
| DEV-037 | V37 | 배치 | `aisleN_b3` | -13.926, 6.6, 23.62 | 90 | 1.41×7.8 | 1.75×7.8 | 80% · lead | 22 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 북측랑, 정문에서 제대 쪽으로 3번째 창(V37) = 빌더의 북측랑 3번째 칸 |
| DEV-038 | V38 | 배치 | `aisleN_b2` | -13.926, 6.6, 28.132 | 90 | 1.45×7.8 | 1.75×7.8 | 83% · lead | 22 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 북측랑, 정문에서 제대 쪽으로 2번째 창(V38) = 빌더의 북측랑 2번째 칸 |
| DEV-039 | V39 © | 배치 | `aisleN_b1` | -13.926, 6.6, 32.644 | 90 | 1.45×7.8 | 1.75×7.8 | 83% · lead | 22 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 북측랑, 정문에서 제대 쪽으로 1번째 창(V39) = 빌더의 북측랑 1번째 칸 |
| DEV-040 | V12bis | 배치 | `chapS_upper` | 20.69, 16.25, -10.22 | -90 | 1.25×6.7 | 3.6×6.7 | 35% · glass | 18 | probable | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): V12bis = 성 요한 보노 경당 위, 남익랑 끝 벽의 큰 첨두창(위치 개연, 실제 치수 미기재) |
| DEV-041 | V40 | 배치 | `cfLower_n2` | -11.28, 7.805, 35.24 | 180 | 0.52×2.91 | 1.16×2.91 | 45% · glass | 8 | probable | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 정문 안쪽 좌우는 개연(도면 번호가 둘레를 끊김 없이 돎 + Fabbrica "controfacciata 왼쪽 첫째" = 제대를 볼 때 왼쪽(북) + V41·V44 가 함께 찍힌 사진). 안에서 정문을 볼 때 왼쪽(+x 남) → 오른쪽(-x 북): 하단 V43·V42·V45·V41·V40, 상단 V46·V47·V44. DEV-041 = V40(성녀 테클라) = 북쪽 바깥 문 위(-x 끝) |
| DEV-042 | V42 | 배치 | `cfLower_s1` | 6.768, 7.805, 35.24 | 180 | 0.55×2.91 | 1.16×2.91 | 48% · glass | 8 | probable | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 정문 안쪽 좌우는 개연(도면 번호가 둘레를 끊김 없이 돎 + Fabbrica "controfacciata 왼쪽 첫째" = 제대를 볼 때 왼쪽(북) + V41·V44 가 함께 찍힌 사진). 안에서 정문을 볼 때 왼쪽(+x 남) → 오른쪽(-x 북): 하단 V43·V42·V45·V41·V40, 상단 V46·V47·V44. DEV-042 = V42(성 카롤로) = 남쪽 안쪽 문 위 |
| DEV-043 | V41 | 배치 | `cfLower_n1` | -6.768, 7.805, 35.24 | 180 | 0.53×2.91 | 1.16×2.91 | 46% · glass | 8 | probable | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 정문 안쪽 좌우는 개연(도면 번호가 둘레를 끊김 없이 돎 + Fabbrica "controfacciata 왼쪽 첫째" = 제대를 볼 때 왼쪽(북) + V41·V44 가 함께 찍힌 사진). 안에서 정문을 볼 때 왼쪽(+x 남) → 오른쪽(-x 북): 하단 V43·V42·V45·V41·V40, 상단 V46·V47·V44. DEV-043 = V41(성 암브로시오) = 북쪽 안쪽 문 위 |
| DEV-044 | V43 | 배치 | `cfLower_s2` | 11.28, 8.14, 35.24 | 180 | 1.16×2.24 | 1.16×2.91 | 77% · lead | 20 | probable | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 정문 안쪽 좌우는 개연(도면 번호가 둘레를 끊김 없이 돎 + Fabbrica "controfacciata 왼쪽 첫째" = 제대를 볼 때 왼쪽(북) + V41·V44 가 함께 찍힌 사진). 안에서 정문을 볼 때 왼쪽(+x 남) → 오른쪽(-x 북): 하단 V43·V42·V45·V41·V40, 상단 V46·V47·V44. DEV-044 = V43(성 미카엘, 소거법 추정) = 남쪽 바깥 문 위(+x 끝) |
| DEV-045 | V45 | 배치 | `cfLower_c` | 0, 9.656, 35.24 | 180 | 1.61×3.11 | 1.61×3.61 | 86% · lead | 28 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): V45(성모 승천) = 가운데 문 위. 좌우 문제 없음. 창 크기는 실제 3.43×7.69m 의 47%, 반원 머리 |
| DEV-046 | V44 © | 배치 | `cfUpper_n1` | -6.768, 11.961, 35.24 | 180 | 1.19×2.28 | 1.19×2.7 | 84% · lead | 21 | probable | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 정문 안쪽 좌우는 개연(도면 번호가 둘레를 끊김 없이 돎 + Fabbrica "controfacciata 왼쪽 첫째" = 제대를 볼 때 왼쪽(북) + V41·V44 가 함께 찍힌 사진). 안에서 정문을 볼 때 왼쪽(+x 남) → 오른쪽(-x 북): 하단 V43·V42·V45·V41·V40, 상단 V46·V47·V44. DEV-046 = V44(교회 Ecclesia) = 상단 북쪽(V41 위) |
| DEV-047 | V47 © | 배치 | `cfUpper_c` | 0, 15.517, 35.24 | 180 | 1.55×3.05 | 1.55×4.64 | 66% · glass | 27 | confirmed | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): V47(삼위일체) = 상단 가운데(V45 위). 창 크기는 실제 3.30×9.88m 의 47% |
| DEV-048 | V46 © | 배치 | `cfUpper_s1` | 6.768, 11.941, 35.24 | 180 | 1.19×2.32 | 1.19×2.7 | 86% · lead | 21 | probable | 조사 E-2(docs/church/MILAN_GLASS_RESEARCH.md): 정문 안쪽 좌우는 개연(도면 번호가 둘레를 끊김 없이 돎 + Fabbrica "controfacciata 왼쪽 첫째" = 제대를 볼 때 왼쪽(북) + V41·V44 가 함께 찍힌 사진). 안에서 정문을 볼 때 왼쪽(+x 남) → 오른쪽(-x 북): 하단 V43·V42·V45·V41·V40, 상단 V46·V47·V44. DEV-048 = V46(시나고가 Synagoga) = 상단 남쪽(V42 위) |
| DEV-049 | — | 미확정(QA) | — | — | — | — | — | — | — | unplaced | **실제 위치 미확정** — 실제 위치 미확정(test_only_unplaced). QA Gallery 전용. 조사 E-2: 번호 창은 47개(+V12bis)뿐 → 남는 7장은 티부리오 창일 가능성(추정, 1968년 작이라 원작 저작권 존속). 임의 배정 금지 |
| DEV-050 | — | 미확정(QA) | — | — | — | — | — | — | — | unplaced | **실제 위치 미확정** — 실제 위치 미확정(test_only_unplaced). QA Gallery 전용. 조사 E-2: 번호 창은 47개(+V12bis)뿐 → 남는 7장은 티부리오 창일 가능성(추정, 1968년 작이라 원작 저작권 존속). 임의 배정 금지 |
| DEV-051 | — | 미확정(QA) | — | — | — | — | — | — | — | unplaced | **실제 위치 미확정** — 실제 위치 미확정(test_only_unplaced). QA Gallery 전용. 조사 E-2: 번호 창은 47개(+V12bis)뿐 → 남는 7장은 티부리오 창일 가능성(추정, 1968년 작이라 원작 저작권 존속). 임의 배정 금지 |
| DEV-052 | — | 미확정(QA) | — | — | — | — | — | — | — | unplaced | **실제 위치 미확정** — 실제 위치 미확정(test_only_unplaced). QA Gallery 전용. 조사 E-2: 번호 창은 47개(+V12bis)뿐 → 남는 7장은 티부리오 창일 가능성(추정, 1968년 작이라 원작 저작권 존속). 임의 배정 금지 |
| DEV-053 | — | 미확정(QA) | — | — | — | — | — | — | — | unplaced | **실제 위치 미확정** — 실제 위치 미확정(test_only_unplaced). QA Gallery 전용. 조사 E-2: 번호 창은 47개(+V12bis)뿐 → 남는 7장은 티부리오 창일 가능성(추정, 1968년 작이라 원작 저작권 존속). 임의 배정 금지 |
| DEV-054 | — | 미확정(QA) | — | — | — | — | — | — | — | unplaced | **실제 위치 미확정** — 실제 위치 미확정(test_only_unplaced). QA Gallery 전용. 조사 E-2: 번호 창은 47개(+V12bis)뿐 → 남는 7장은 티부리오 창일 가능성(추정, 1968년 작이라 원작 저작권 존속). 임의 배정 금지 |
| DEV-055 | — | 미확정(QA) | — | — | — | — | — | — | — | unplaced | **실제 위치 미확정** — 실제 위치 미확정(test_only_unplaced). QA Gallery 전용. 조사 E-2: 번호 창은 47개(+V12bis)뿐 → 남는 7장은 티부리오 창일 가능성(추정, 1968년 작이라 원작 저작권 존속). 임의 배정 금지 |

© = 그 자리의 **실제 작품**이 저작권 존속(V07·V44·V46·V47 Hajnal, V39 Carpi; 대응표의 `real_work_copyrighted`) → 나중에 진본 사진으로 바꾸는 대상에서 뺀다. 지금 걸린 것은 사용자가 준 AI 시안이다.

합계: 배치 42 · 보류 6 · 미확정 7 · 실패 0 = 55.

### 1.1 미배치 13개의 원인

- **DEV-016~018, 022~024 (6)** — 도면의 P16~18·P22~24 는 주보랑(회랑) 바깥벽이 아니라 **두 성구실 방의 바깥벽 창**이다(조사 E-2 §4 c). 회랑 바깥벽은 실제로도 맹벽이라 거기에 뚫지 않았다. 성구실 방(회랑에서 문으로 들어가는 직사각 방, 바깥벽에 랜싯 3개씩)을 지으면 대응표의 `hang:false` 만 지우고 그 방이 내보내는 anchor key(`sacS_1`… 로 예약)에 걸린다.
- **DEV-049~055 (7)** — 실제 위치 미확정. 번호 창은 47개(+V12bis)뿐이라 티부리오 창일 가능성이 있으나(추정) 임의로 걸지 않았다.

## 2. 건축 변경 (devglass 와 무관하게 건물의 일부, 창에는 절차적 유리)

| 부분 | 전 | 후 |
|---|---|---|
| 정문 안쪽 벽 | 문 5 + 상단 작은 창 3 이 기둥줄(x = 0, ±4.51, ±9.02)에 있어 옆문 4개·상단 양옆 창이 벽기둥 뒤에 숨음. 하단 창 없음 | 문 5 · 하단 창 5 · 상단 창 3 을 **랑 중심선**(x = 0, ±6.77, ±11.28)으로. 벽기둥은 그대로 → 가리지 않음. 하단 = 반원 머리 1.61×3.61m(창턱 7.6, 꼭대기 11.21) / 1.16×2.91m(창턱 6.35, 꼭대기 9.26), 상단 = 첨두 1.55×4.64m(창턱 12.4, 꼭대기 17.04) / 1.19×2.7m(창턱 10.4, 꼭대기 13.1) (실제 유리 치수 × 0.47) |
| 익랑 끝 벽 가운데 칸 | 바닥 가까이부터 큰 창 하나 4.4×13.4m | 실제대로 **아래 = 경당 입구 아치(폭 5.6m, 꼭대기 11.5m), 위 = 큰 첨두창** 3.6×6.7m(창턱 12.9, 꼭대기 19.6) (남 = V12bis, 북 = 번호·주제 미확인) |
| 익랑 끝 경당 ×2 | 없음 | 반육각형 후진(한 변 2.8m = 실제 6m × 0.47, 끝 벽에서 깊이 3.12m), 창 3개 1.02×7.69m(창턱 2.2, 꼭대기 9.89)(실제 2.18×16.36m × 0.47), 리브 궁륭(꼭대기 12.8m), 단순한 제단·성인상·촛대, 사선 벽·끝 벽·제단 충돌체. 형태는 조사로 확인, **치수는 ±20% 단서로 지음**(`ch_milan.js` 의 `CHAP` 표만 고치면 됨) |
| 익랑 창 8개 | 1.75×7.8 / 1.9×7.9m (창턱 2.7) | 실제 비례 쪽으로: 끝 벽 양옆 칸·동쪽 벽 1.66×9m(창턱 1.7, 꼭대기 10.7), 서쪽 벽 1.41×9m(창턱 1.7, 꼭대기 10.7). 실제 환산은 1.66×10.57 / 1.41×10.15m 인데 이 칸의 궁륭 꼭대기가 11.28m 라 9.0m 까지만(85~89%) |
| 회랑 직선 벽 | 맹벽 | **그대로 맹벽**(실제와 같다). 창을 뚫는 계획은 조사 결과로 취소 |
| 걷기 경계(layout.bounds) | x ±20.4 | x ±23.52(경당까지; 그 밖은 벽 충돌체가 막음). `server/church/src/layouts.json` 다시 내보냄 |
| 익랑 끝 벽 충돌체 | 한 덩어리 | 입구 아치 양옆 두 조각 + 경당 벽. 카메라 경계·건물 윤곽(camFix)에 경당 추가 |
| 십자가의 길 14처 | 자동 유도(익랑 끝 큰 창 아래·측랑 벽) | **벽기둥 앞면 14곳으로 고정**(`layout.crossWay.plaques`): 경당 입구 양옆 벽기둥 2 + 측랑 벽기둥 5, 좌우 대칭. 창·문·경당 아치와 겹치지 않음(시험) |

### 2.1 그리기 비용 (헤드리스 크롬, 화질 mid, 960×540, renderer.info)

정점 176,040 → 185,091 (삼각형 +3,017, +5.1%). 배치 Mesh 수 25 → 25(새 배치 없음: 벽·유리·창살 모두 기존 배치에 들어간다).

| 시점 | 전: draw call / 삼각형 | 후(devglass 끔) | 후(devglass 켬) |
|---|---|---|---|
| nave — (측정용) 입구에서 제대 쪽 전경 | 62 / 101,995 | 62 / 105,044 | 64 / 105,162 |
| crossing — (측정용) 교차부에서 남익랑 쪽 | 58 / 101,845 | 58 / 104,894 | 60 / 105,012 |
| aisleS — 남측랑 1~3칸(가운데 DEV-002, 오른쪽 DEV-001 = 입구 쪽 첫 창, 왼쪽 DEV-003) | 43 / 100,349 | 43 / 103,398 | 48 / 103,522 |
| transeptS — 남익랑 끝 벽: 아래 성 요한 보노 경당 아치, 위 큰 창(DEV-040), 양옆 칸 DEV-010·014 | 47 / 101,801 | 47 / 104,850 | 49 / 104,968 |
| counterfacade — 정문 안쪽 벽: 문 5 · 하단 반원 머리 창 5(DEV-044·042·045·043·041) · 상단 첨두창 3(DEV-048·047·046) | 42 / 100,347 | 42 / 103,396 | 45 / 103,516 |
| apse — 후진 세 창(DEV-021·020·019; 가운데 아래는 진본 사진 그대로) | 37 / 77,457 | 38 / 84,168 | 40 / 84,286 |

삼각형 수는 화면에 걸친 배치 전체의 합이다(배치는 성당 전체가 한 덩어리라 일부만 보여도 다 센다). devglass 는 판 42장(삼각형 84) + 뒤판이 전부다.

## 3. 화면 캡처 (`art/glass_milan55/shots/e4_*.jpg`, devglass 켬, 화질 mid, 11시)

| 파일 | 시점 |
|---|---|
| `e4_aisleS.jpg` | 남측랑 1~3칸(가운데 DEV-002, 오른쪽 DEV-001 = 입구 쪽 첫 창, 왼쪽 DEV-003) |
| `e4_aisleN.jpg` | 북측랑 4~6칸(가운데 DEV-035, 왼쪽 DEV-036, 오른쪽 DEV-034) |
| `e4_transeptS.jpg` | 남익랑 끝 벽: 아래 성 요한 보노 경당 아치, 위 큰 창(DEV-040), 양옆 칸 DEV-010·014 |
| `e4_transeptN.jpg` | 북익랑 끝 벽: 아래 나무의 성모 경당, 위 큰 창(절차적 유리), 양옆 칸 DEV-026·030 |
| `e4_chapelS.jpg` | 성 요한 보노 경당 안: 서쪽 사선 DEV-011 · 끝 DEV-012 · 동쪽 사선 DEV-013 |
| `e4_apse.jpg` | 후진 세 창(DEV-021·020·019; 가운데 아래는 진본 사진 그대로) |
| `e4_counterfacade.jpg` | 정문 안쪽 벽: 문 5 · 하단 반원 머리 창 5(DEV-044·042·045·043·041) · 상단 첨두창 3(DEV-048·047·046) |
| `e4_qa.jpg` | QA Gallery(55장 전부, 이름표·상태 색) |

직접 열어 확인한 것: 그림이 위아래·좌우로 뒤집히지 않음(DEV-002 의 수태고지: 천사 왼쪽·성모 오른쪽 = 원본과 같음), 늘어나지 않음(판 비율 = 그림 비율, 시험), 창틀 밖으로 나오지 않음(판 모서리는 스플레이 뒤), z-fighting 없음(판 3cm·뒤판 1.8cm 앞), 진본 사진 `milan_apse_lower` 는 그대로이고 DEV-020 은 그 위에만.
알려진 모습: 모델의 돌 창살(세로 문설주·가로대)이 그림 위를 지나간다(창틀·트레이서리 유지 규칙). 랜싯 시안(65×345 안팎)은 1텍셀 2cm 안팎이라 가까이서 흐리다. 넓은 창(후진·위 큰 창)에는 랜싯 그림이 가운데 띠로만 걸리고 둘레는 절차적 유리다.

## 4. 재현

```
node tools/church_web/milan_openings.mjs                 # 개구부 78개(key·world 좌표·크기)
node --test tools/church_web/devglass.test.mjs           # 대응표·anchor·판 계산·릴리스 차단·해제·QA Gallery·건축 시험
node tools/church_web/milan55_shots.mjs                  # 캡처 8장 → art/glass_milan55/shots/e4_*.jpg
node tools/church_web/milan55_shots.mjs --leak 3         # 실제 WebGL 에서 출입 반복 해제 확인
node tools/church_web/milan55_report.mjs                 # 이 문서
브라우저: assets/church/test.html?church=milan&devglass=1   ·   ?church=qa_milan55&devglass=1
bash tools/build_dev_apk.sh                              # 개발용 APK(build/dev-apk/rosarium-dev-*.apk)
bash tools/check_release_apk.sh <일반 apk>               # 일반 APK 에 시안이 없는지
```
