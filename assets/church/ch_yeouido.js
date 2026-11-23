/* ch_yeouido.js — 천주교 서울대교구 여의도동성당(서울 영등포구 여의동로 257, 1984년 성전 축성) 성전 내부.
   조사·설계: docs/church/interiors/yeouido.md. 치수는 사진에서 추정한 값이다(실측 아님, scalePercent 100).
   2026-11-16 개정: 본당 신자(사용자)가 보내 준 성당 안 사진 5장(§2.4, 사진은 저장소에 넣지 않음)에 맞춰 제단부를 다시 지었다.
   - 넓은 직사각 홀(안폭 22m, 정면 벽~뒷벽 31m). 정면 가운데에 **높은 원통(드럼)**: 크림색 매끈한 판을 가로 띠(약 1m)로 쌓은 벽이
     천장(10m) 위로 13m 까지 솟고, 위는 어두운 테두리 천장. 드럼 앞쪽 반은 신랑 쪽으로 열려 있다(10m 위에서는 온 원통).
   - 드럼은 크림색 원기둥 6개(안쪽 4 + 양끝 높은 기둥 2, 40° 간격, 가로 이음 줄) 위에 얹혀 있고, 기둥 뒤는 낮은 둘레 공간(주보랑)의
     올리브빛 회갈색 세로 홈 줄 벽 — 위에서 비추는 따뜻한 빛(벽 머리 숨은 등 + 위가 밝은 정점 색).
   - 제단: 반원(둥근 앞 가장자리) 3단, 흰 대리석. 앞 모서리 양쪽에 세로 홈 줄의 거친 **큰 둥근 피어**, 피어와 드럼 사이 정면 벽에 키 큰 색유리 창.
   - 바닥: 크림색 타일(0.75m) 모서리마다 회갈색 마름모. 신자석: 꿀빛 나무 긴 의자. 뒤쪽 위 성가대석(걷지 못함).
   - 권리(yeouido.md §4): 유리화·그리스도 상·감실·독서대 장식은 작가가 확인되지 않은 현대 작품이라 복제·모사하지 않는다.
     정면 창 = 사진과 비슷한 색(파랑·빨강·흰색)의 **추상 색면 유리**(구도·그림 없음, 칸마다 무작위 색), 옆벽 창 = 무늬 없는 옅은 빛 유리,
     드럼의 그리스도 상 = 두 팔을 벌린 **일반 형태의 단순한 청동빛 인물 + 가는 후광 고리**(작품의 생김새를 옮기지 않은 자리 표시 —
     허락받은 3D 모델이 생기면 바꾼다), 감실·독서대 = 문양 없는 상자, 성모상 = 앱 공용 3D 성모상(shrine.js, mesh 'mary_meshy').
   - 재질: 바닥 타일·홈 줄 콘크리트·미장은 절차 생성(캔버스 → ChurchTexPack data URI). 나머지는 공용 표면.
   2026-11-22 개정(사용자 사진 로비 5장·성가대석 6장 + 추가 조사 — yeouido.md §2.5~§2.7·§9.7, 사진은 저장소에 넣지 않음):
   - 평면: 제단이 앞 모서리인 **마름모**(설계 김영섭). 앞벽이 피어에서 ±45°로 옆 모서리(±17, 0.4)까지, 뒤로 좁아져 곧은 옆벽(±11)·뒷벽(z 21).
     위 문단의 '직사각 홀'·'평천장 10m'·'옆벽 창'은 옛 판이다. 드럼은 위까지 반원통 벽감.
   - 천장: 제단 쪽으로 높아지는 **피라미드식 경사 천장**(벽 머리 8m → 드럼 앞 12.6m, 평면 삼각 면), 뒤쪽 면에 네모 천창 8(한 장 한 색).
   - 옆벽: 아래가 넓고 위로 좁아지며 안으로 눕는 **돌 버팀기둥**(가로 줄눈 0.6m) + 틈마다 **호박빛 슬릿 창**, 피어마다 흰 갓 2개 벽등.
   - 신자석: **부채꼴 4덩이** 140석(파란 방석). 스포트 샹들리에 6(검은 고리 + 원통 등).
   - 성가대석(3층, z 12~21): 앞 난간 = 흰 벽 + **십자가의 길 14처 자리의 중립 부조 판 14**(인물 없음, 처 번호만 — layout.crossWay.plaques,
     panels:false) + 둥근 환기구 + 붉은 숫자 표시판 → 나무 띠 → 쇠 난간. 밑 = 짙은 격자 천장(3.25m) + 흰 각기둥 3(천장까지).
     **계단식 5단 + 일자형 긴 의자**(오른쪽 덩이 'C' 15석은 앉을 수 있다), 앞 오른쪽 일반 형태 오르간, 뒤 위 감실 3, 옆 감실.
   - 로비(성당 문 밖): 흰 우물 천장 + 네모 빛판, 옅은 회색 대리석 바닥, 베이지 세로 벽돌 타일 벽, 흰 공 벽등, 흰 원기둥, 책자 꽂이,
     유리 정면(밖은 밝은 빛만), 색유리 벽 자리 = **추상 색면**(최영심 2024 작품을 옮기지 않음), 액자 = 무늬 없는 판, 성모상 **벽감 + 나무 초 받침**.
     정문(쌍여닫이)을 로비 쪽으로 열어 걸어 나간다. 로비 끝 **타원 계단 홀**: 지하 타원 우물(걷지 못함), 바깥 곡면 벽을 따라
     **곡선 계단 40단** → 계단참 → 뒷벽 문 → 성가대석 통로.
   2026-11-22 3차(여러 층 걷기 엔진 — scene_logic levels, docs/church/interiors/assisi.md §엔진, yeouido.md §9.8):
   - 예전에 한 자리 한 높이 엔진 때문에 막았던 곳을 실제처럼 연다: 성가대석 아래 전체(닫힌 방 없앰), 성가대석 왼쪽 큰 덩이(걷고 앉는다 — 'D' 115석),
     계단참 밑(흰 벽 덩어리 없앰), 계단 밑(낮은 턱 없앰 — 2층 → 3층 계단 바로 밑에 1층 → 2층 계단이 겹쳐 지나간다).
   - 로비를 두 층으로: **1층 로비**(바닥 F1 −4.2, 거리 쪽 유리 정면·1층 추상 색유리·흰 원기둥, 천장 = 2층 바닥 판 밑)와
     **2층 로비**(바닥 0 = 성전 바닥, 성전 정문·성모상 벽감·타원 우물 난간). 둘을 **곡선 대리석 계단 28단**(계단 홀 바깥 타원 벽을 따라)이 잇고,
     같은 띠 위로 2층 → 성가대석 회색 돌 계단 40단이 겹쳐 오른다. 1층 → 2층 계단의 높은 쪽 밑은 1층에서 걸어 들어갈 수 있다.
   - 층: 1층 로비 F1 · 성당과 2층 로비 0 · 성가대석 3.75~5.15 — 충돌체는 층마다 높이 범위(R1F·R2F·RLOFT), layout.ground = false(바닥은 모두 구역).
   */
(function () {
  'use strict';

  // ---------- 치수(m) ----------
  var HW = 11.0;                // 안폭의 반
  var ZF = -10.0;               // 정면 벽 안쪽 면 = 드럼 중심(현)
  var ZB = 21.0;                // 뒷벽 안쪽 면(입구)
  var H = 10.0;                 // 신랑 평천장 높이
  var SY = 0.6;                 // 제단 높이(3단)
  var RD = 4.3;                 // 드럼(원통 벽) 안쪽 반지름 = 기둥 중심 원
  var RB = 5.5;                 // 기둥 뒤 둘레 공간(주보랑) 뒷벽 반지름. 후진 끝 z = ZF - RB = -15.5
  var YP = 4.4;                 // 기둥 머리 = 둘레 공간 천장
  var YL = 4.85;                // 드럼 아래 띠(린텔) 윗면 = 판 띠의 시작
  var DH = (H - YL) / 5;        // 판 띠 높이(약 1.03m): 신랑 천장(10m)에서 띠 줄이 맞는다
  var DT = H + DH * 3;          // 드럼 꼭대기(약 13.1m)
  var FE = 100 * Math.PI / 180; // 양끝 높은 기둥의 각(뒤 = 0, 현 = ±90°): 드럼이 반원보다 조금 더 앞으로 감싼다
  var COLS = [-100, -60, -20, 20, 60, 100];   // 기둥 각(도). 가운데(0°)는 비어 감실이 보인다(사진)
  // 제단 앞 가장자리: 중심 (0, PCZ) 의 원호. 위 단 E0, 계단 2단 E1·E2(디딤 0.35m, 높이 0.2m). 가운데 축에서 첫 계단 발치 z = -5.35
  var PCZ = -14.4, E0 = 8.35, E1 = 8.7, E2 = 9.05;
  var ZSTEP = PCZ + E2;
  var PIER = { x: 7.55, z: -8.95, r: 1.25 };     // 제단 앞 모서리 큰 둥근 피어(±x)
  var FWIN = { x: 6.0, w: 1.0, sill: 0.75, h: 6.4 };   // 정면 색유리 창(피어와 드럼 사이)
  var LZ = 12.0, LY = 3.4, LT = 3.75;   // 성가대석(뒤 위층, 3층) 앞 가장자리, 밑면 높이, 맨 앞 띠 바닥 높이. 실제는 계단식 줄이 약 10줄(사용자) → 3단(2026-11-23 사용자: '의자도 3개만')
  // 계단식 단(2026-11-23 개정, 사용자 '2층의 간격도 너무 좁아'·'의자도 3개만 두자'): 단 깊이 = 긴 의자 줄 간격 1.9m(신랑 줄 간격 — 앱 규약, 예전 1.6),
  // 줄 3, 맨 뒤 단은 뒷벽까지 빈 바닥. 맨 앞 띠(난간 앞 통로)는 1.6m 로 넓혀 오른쪽 앞 입구 → 가운데 통로로 걷는 길
  var TSTEP = 0.28, TDEP = 1.9, NROW = 3;
  var FRONT1 = LZ + 1.6;                // 맨 앞 띠 끝 = 첫 단 시작(13.6)
  var LAISLE = { x0: -0.65, x1: 0.65 }; // 가운데 통로(두 덩이 의자 끝 사이, 1.3m) — 단마다 한 칸씩 오른다(사용자: '중간에 통로가 있어')
  var TIER = [[LZ + 0.15, FRONT1, 0]];  // 성가대석 단(z0, z1, 높이): 맨 앞 띠 + 단 3(긴 의자 줄, 맨 뒤 단은 뒷벽까지)
  for (var tq = 1; tq <= NROW; tq++) TIER.push([FRONT1 + TDEP * (tq - 1), tq === NROW ? ZB : FRONT1 + TDEP * tq, TSTEP * tq]);
  var LTOP = LT + TSTEP * NROW;         // 맨 뒤 단 높이(4.59)
  var LEDGE = 5.15;                     // 로비 위 위층 복도(걷지 못함) 바닥 높이 — 예전 계단참 높이 그대로
  // ---------- 로비(성당 문 밖)·계단 홀 — 사용자 사진 5장(§2.5)에서 추정 ----------
  var ZW = 21.5;                // 뒷벽 로비 쪽 면 = 로비 시작
  // 계단 홀(2026-11-23 개정, 사용자 '1층 로비 내려오는 계단 모두 3배는 다 늘려야 해 — 실제로도 그렇고'): 두 곡선 계단의 띠 폭(바깥 타원 − 안쪽 RI)을
  // 예전 1.5 × 1.35m(x·z 끝)에서 4.5 × 4.05m 로(3배). 홀 타원 5 × 4.5 → 7.5 × 6.75m, 로비는 그만큼 안쪽으로 길어진다(z 30.5 → 35.0)
  var SH = { cx: 9.0, cz: ZW + 6.75, a: 7.5, b: 6.75, top: 9.3, x0: 1.5 };  // 계단 홀: 타원 중심·반지름(x a, z b), 천장, 위층 복도 안쪽 벽 x
  var LOB = { x0: -11, x1: 4.8, z1: SH.cz + SH.b, h: 4.3, hc: 4.65 };   // 로비: 우물 천장 덮는 x 범위, 안쪽 끝(유리 벽) z, 천장(보 밑) 높이, 우물 칸 안 높이
  // 곡선 계단: 시작 각(도) → 끝 각(성가대석 옆 갤러리 쪽), 안쪽 가장자리(타원 비율), 단 수. 위 계단(2층 → 3층)은 성가대석 앞 띠 높이(LT)로 올라
  // 계단참(LANDA…th1) → 오른쪽 옆 갤러리 → 성가대석 맨 앞 오른쪽 입구로 이어진다(2026-11-23 사용자: '제일 뒤가 아니고 가장 앞의 왼쪽이나 오른쪽으로')
  var STR = { th0: 78, th1: -55, rIn: 0.40, n: 25 };
  var LANDA = -84;                      // 계단참(높이 LT)이 끝나는 각(도): th1 → LANDA 의 띠 + 갤러리 입구까지
  var WELL = { rx: 2.0, rz: 1.5 };                    // 2층 바닥의 타원 우물(난간 벽 안쪽 — 1층 로비가 내려다보인다)
  var NICHE = { x: 3.8, w: 0.86, y0: 1.0, y1: 2.2, d: 0.3 };   // 성모상 벽감(뒷벽 로비 쪽 면)
  var DARK = { x0: 5.6, x1: 6.8, h: 2.3 };            // 벽감 옆 어두운 문(아래로 내려가는 계단 — 걷지 못함)
  // 1층 로비(2026-11-22 3차, 조사 §3: 1층 로비 → 곡선 대리석 계단 → 2층 로비 → 성전). 1층 바닥 F1, 2층 바닥 판 두께 SLAB(1층 천장 = −SLAB)
  var F1 = -4.2, SLAB = 0.35;
  var DN = { n: 28, usw: 2.2 };                       // 1층 → 2층 곡선 계단: 단 수(단 0.15·디딤 약 0.42), 그 밑을 걸어 들어갈 수 있는 높이(1층 바닥 위)
  // 층마다 충돌체 높이 범위: 1층 · 2층(성전·2층 로비) · 성가대석(3층)
  var R1F = { y0: F1 - 0.5, y1: F1 + 2.6 }, R2F = { y0: -0.5, y1: 2.6 }, RLOFT = { y0: LT - 0.35, y1: LTOP + 2.4 };
  var SQ = Math.SQRT1_2, WH = 8.0, CH = 12.6;           // 벽 머리(경사 천장 둘레) 높이, 드럼 앞 현의 천장 높이
  var PLAN = { F: [6.6, -10], C: [17, 0.4], B: [HW, 6.4] };   // 오른쪽 평면 꼭짓점(왼쪽은 거울): 앞벽이 꺾이는 곳 · 옆 모서리 · 곧은 옆벽 시작 [추정]
  var YG0 = 3.75, YG1 = 6.6, XG = 13.0;               // 성가대석 옆 곧은 옆벽의 감실 바닥·천장 높이, 감실 뒷벽 |x|
  var GAL = { x0: HW, x1: XG, z0: LZ + 0.15, ent: FRONT1 };   // (2026-11-23) 오른쪽 옆 갤러리(옆 감실 자리, 바닥 YG0 = LT): 계단참 → 성가대석 맨 앞 오른쪽 입구(z GAL.z0…ent)
  var SKY = [[-3.2, 15.5], [3.2, 15.5], [-7.6, 13.0], [7.6, 13.0], [-3.0, 8.0], [3.0, 8.0], [-9.4, 5.0], [9.4, 5.0]];   // 뒤쪽 경사면 천창 8 [추정 자리]
  var CHAND = [[-4.6, -2.0], [4.6, -2.0], [-6.4, 4.5], [6.4, 4.5], [-3.2, 9.0], [3.2, 9.0]];   // 스포트 샹들리에 6
  // 성가대석 앞 난간의 십자가의 길 부조 판 14(사진 9·10: 난간에 한 줄로) — 판 중심 x, 높이, 크기. 이 자리가 앱의 14처다
  var RELIEF_W = 0.5, RELIEF_H = 0.6, RELIEF_Y = 3.72;
  var RELIEF = []; (function () { for (var q = 0; q < 14; q++) RELIEF.push(+(HW - 0.85 - (2 * HW - 1.7) * q / 13).toFixed(3)); })();   // 1처 = 신랑에서 성가대석을 볼 때 왼쪽(+x) 끝 [순서 미확인]
  var UCOL = [-6.6, -2.4, 3.6];                       // 성가대석 밑 흰 각기둥 3(사진 8·10, 조사 §4.5) — 위층을 뚫고 천장까지
  var BACKBAY = [[-10.4, -6.85], [-5.95, -2.55], [-1.65, 1.2]];   // 성가대석 뒤 위 감실(뒷벽을 판 칸, x 범위) — 오른쪽은 계단 홀이라 없다
  var GLASS_CLEAR = [0xeef2f0, 0xe6ecea, 0xf4f6f2, 0xe9eeea];               // 로비 유리 정면: 무색 맑은 유리(밖은 밝은 빛)
  // 정면 창: 추상 색면 유리. 사진의 색 분위기(파랑이 많고 흰색·빨강이 섞임)만 따른 팔레트 — 칸 색은 무작위라 실제 유리화의 구도·그림과 무관
  var GLASS_FRONT = [0x2f62b4, 0x2f62b4, 0x4a8fd6, 0x7cb6e4, 0x1d3c86, 0xeef1f4, 0xf3eee2, 0xc23440, 0xe2708e, 0x3a9ac8];

  // (A) 레이아웃 — 순수 데이터(THREE 사용 금지)
  var layout = {
    id: 'yeouido', scalePercent: 100, ground: false,   // 여러 층: 땅(0)은 바닥 후보가 아니다 — 성전 바닥도 구역으로 준다(1층 로비 위 2층 판을 바닥으로)
    bounds: { x0: -PLAN.C[0], x1: PLAN.C[0], z0: ZF - RB, z1: LOB.z1 },   // 마름모 신랑(옆 모서리 x ±17) + 로비·계단 홀(뒷벽 밖 z 21.5…30.5)
    spawn: { x: 0, z: 16.5, r: 0, y: 0 },   // 정문(뒷벽 가운데) 안쪽, 성가대석 아래: 중앙 통로·제대·드럼의 인물상이 일직선(예전 그대로, 층 = 성당)
    // 여러 층(scene_logic levels): '가기' 시트의 층 줄과 바로 가기 자리. 성당(2층)·1층 로비·성가대석(3층)
    levels: [
      { id: 'nave', label_ko: '성당(2층)', y: 0, go: { x: 0, z: 11.0 } },
      { id: 'lobby1', label_ko: '1층 로비', y: F1, go: { x: -6.5, z: 25.6 } },
      { id: 'loft', label_ko: '성가대석(3층)', y: LT, go: { x: 7.0, z: LZ + 0.8 } }
    ],
    seatGroups: [
      // 중앙 통로(약 2.5m) 좌우 8줄 × 9석 = 144석(맨 앞줄은 제단 계단 앞 통로를 열려고 뺌, 2026-11-16 사용자). 줄 간격 1.9m 는 앱 공통값(실제 줄 수는 더 많다)
      // 부채꼴 4덩이(조사 §4.6): 가운데 두 덩이 + 바깥 두 덩이(줄마다 바깥으로 0.2m 물러나 사선 통로가 뒤로 넓어진다). 줄은 앱 규약대로 x 와 나란하다
      // (걷기 엔진의 줄 충돌 상자가 축 정렬이라 실제처럼 줄을 비스듬히 돌리지 않았다 — yeouido.md §9.7)
      { g: 'L', rows: 7, perRow: 6, origin: { x: -1.55, z: -1.3 }, dx: -0.7, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.35, 0.3], y: 0 },
      { g: 'R', rows: 7, perRow: 6, origin: { x: 1.55, z: -1.3 }, dx: 0.7, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.35, 0.3], y: 0 },
      { g: 'OL', rows: 7, perRow: 4, origin: { x: -6.45, z: -1.3 }, dx: -0.7, dz: 1.9, rowDx: -0.2, yaw: 0, pad: [0.35, 0.3], y: 0 },
      { g: 'OR', rows: 7, perRow: 4, origin: { x: 6.45, z: -1.3 }, dx: 0.7, dz: 1.9, rowDx: 0.2, yaw: 0, pad: [0.35, 0.3], y: 0 },
      // 성가대석(3층) 계단식 줄(2026-11-23 개정, 사용자: '의자가 1렬로 길게 되어 있지 않고 중간에 통로가 있어', '의자도 3개만 두자'):
      // 단마다 가운데 통로(LAISLE, 1.3m)를 두고 두 덩이 — 오른쪽 'C' 3줄 × 12석 · 왼쪽 'D' 3줄 × 14석. 줄 간격 1.9m(신랑과 같은 앱 규약), 줄마다 바닥이 한 단(TSTEP) 높다(rowDy).
      // 의자 중심은 단 앞 모서리에서 1.15m — 앞에 0.95m 발 둘 곳(줄 안 통로). 오른쪽 덩이 끝(x 9.05) 너머 첫 단에 오르간
      { g: 'C', rows: NROW, perRow: 12, origin: { x: 1.0, z: FRONT1 + 1.15 }, dx: 0.7, dz: TDEP, rowDx: 0, yaw: 0, pad: [0.35, 0.35], frontal: false, y: LT + TSTEP, rowDy: TSTEP },
      { g: 'D', rows: NROW, perRow: 14, origin: { x: -1.0, z: FRONT1 + 1.15 }, dx: -0.7, dz: TDEP, rowDx: 0, yaw: 0, pad: [0.35, 0.35], frontal: false, y: LT + TSTEP, rowDy: TSTEP }
    ],
    // 봉헌초: 성모상 앞(shrine.js 가 맨 끝 스탠드로 붙인다 — 자리는 shrine_places.js, 로비 벽감 앞 나무 초 받침). 여기 스탠드는 비워 둔다.
    candles: { stands: [] },
    // 십자가의 길: 실제 14처 = 성가대석 앞 난간의 부조 판 14(사진 9·10). 앱은 그 자리를 14처 자리(걸어가는 곳·누르는 곳)로 쓰고,
    // 그림 판은 그리지 않는다(panels: false — 3D 에는 빌더의 중립 부조만). 누르면 그 판 아래(신랑 바닥)로 걸어가 앱의 대체 연작 묵상 시트가 열린다.
    crossWay: { start: 'L', panels: false, plaques: RELIEF.map(function (x) { return { x: x, side: x > 0 ? 'R' : 'L', z: LZ - 0.2, y: RELIEF_Y, w: RELIEF_W + 0.12, h: RELIEF_H + 0.12, face: [0, -1], fy: 0, stand: { x: x, z: LZ - 0.65 } }; }) },
    info: { name: '여의도동성당', place: '서울 영등포구 여의동로 257', builtYear: 1984 }
  };
  ChurchLayouts.register(layout);

  // =====================================================================
  // 재질(절차 생성) — 사진 질감으로 바꿀 때는 이 구역만 보면 된다.
  //   yd_floor (+_n)  바닥: 크림색 타일 0.75m, 모서리마다 회갈색 마름모 → tex_yd_floor.jpg, tex_yd_floor_n.jpg
  //   yd_conc  (+_n)  옆벽·뒷벽·정면 벽·피어·둘레 공간 벽: 세로 홈 줄 거친 콘크리트(무채색, 색은 정점 색) → tex_yd_conc.jpg, tex_yd_conc_n.jpg
  //   yd_plaster(+_n) 크림색 미장(yd_cream)·천장(yd_ceil) 공용              → tex_yd_plaster.jpg, tex_yd_plaster_n.jpg
  //   yd_mtile (+_n)  제단 바닥·계단: 흰 대리석 타일 0.6m + 회색 줄눈        → tex_yd_mtile.jpg, tex_yd_mtile_n.jpg
  //   같은 이름의 사진 묶음(tex_pack_yeouido.js)이 있으면 생성을 건너뛴다(코드 변경 없음).
  // =====================================================================
  var SURF = {
    yd_floor: { tile: [1.5, 1.5], roughness: 0.32, clearcoat: 0.35, ccRough: 0.25, normalScale: 0.35, envK: 1.0, fb: 'marble', tint: 0xeee4d0, own: true },   // own: 그림이 제 색을 갖는다(대체 질감일 때만 색조)
    // 홈 줄 콘크리트: 색조 없음(흰색) — 옆벽(회녹색)·피어(회갈색)·둘레 공간 벽(올리브, 위가 밝음)의 색은 쓰는 곳마다 정점 색으로 준다
    yd_conc: { tile: [2.0, 2.0], roughness: 0.92, normalScale: 1.0, envK: 0.7, fb: 'plaster', tint: 0xffffff },
    // 크림색 미장(드럼 벽·기둥)과 천장: 같은 그림, 색조만 다르다
    yd_cream: { photo: 'yd_plaster', tile: [2.6, 2.6], roughness: 0.9, normalScale: 0.3, envK: 0.8, fb: 'plaster', tint: 0xf6ead0 },
    // 제단 바닥·계단: 흰 대리석 타일(0.6m, 회색 줄눈)
    yd_mtile: { tile: [1.2, 1.2], roughness: 0.25, clearcoat: 0.6, ccRough: 0.12, normalScale: 0.2, envK: 1.1, fb: 'marble', tint: 0xf2f0ea, own: true },
    // 신랑 천장: 옅은 회색(사진 6·7 — 2026-11-22 크림색에서 고침)
    yd_ceil: { photo: 'yd_plaster', tile: [3.0, 3.0], roughness: 0.95, normalScale: 0.2, envK: 0.7, fb: 'plaster', tint: 0xe6e5e0 },
    // 로비: 베이지 세로 벽돌 타일 벽(좁은 타일을 세워 줄마다 반 칸 어긋남), 흰 미장(로비 천장·계단 밑면·난간 벽·성가대석 난간).
    // 로비 바닥(옅은 회색 대리석 0.9m)·계단 디딤(회색 돌)은 제단의 yd_mtile 을 정점 색(회색)과 직접 준 UV 로 다시 쓴다(묶음·질감을 늘리지 않음)
    yd_brick: { tile: [1.0, 1.0], roughness: 0.85, normalScale: 0.8, envK: 0.7, fb: 'plaster', tint: 0xd6c2a2, own: true },
    yd_white: { photo: 'yd_plaster', tile: [2.6, 2.6], roughness: 0.9, normalScale: 0.25, envK: 0.8, fb: 'plaster', tint: 0xf7f6f2 }
  };
  var TEX_NAMES = ['yd_floor', 'yd_floor_n', 'yd_conc', 'yd_conc_n', 'yd_plaster', 'yd_plaster_n', 'yd_mtile', 'yd_mtile_n',
    'yd_brick', 'yd_brick_n'];
  var CONC_WALL = 0xa9a8a1;     // 갤러리·위쪽 벽: 회색 콘크리트(사진 6·7 — 2026-11-22 회녹색에서 고침)
  var CONC_LOW = 0xbdb4a2;      // 아래층 옆벽·뒷벽(성가대석 밑): 베이지빛 세로 홈 줄 콘크리트(사진 8·10)

  function texTools(rngF) {
    var doc = window.document;
    function canvas(w, h) { var c = doc.createElement('canvas'); c.width = w; c.height = h; return c; }
    function noise(w, h, cx, cy, rnd) {   // 가장자리에서 이어지는 값 노이즈 0..1
      var g = new Float32Array(cx * cy), i, out = new Float32Array(w * h);
      for (i = 0; i < g.length; i++) g[i] = rnd();
      for (var y = 0; y < h; y++) {
        var fy = y / h * cy, y0 = fy | 0, ty = fy - y0, y1 = (y0 + 1) % cy; ty = ty * ty * (3 - 2 * ty);
        for (var x = 0; x < w; x++) {
          var fx = x / w * cx, x0 = fx | 0, tx = fx - x0, x1 = (x0 + 1) % cx; tx = tx * tx * (3 - 2 * tx);
          var a = g[y0 * cx + x0], b = g[y0 * cx + x1], c = g[y1 * cx + x0], d = g[y1 * cx + x1];
          out[y * w + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
        }
      }
      return out;
    }
    function paint(w, h, fn) {
      var c = canvas(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), d = im.data, px = [0, 0, 0];
      for (var y = 0, i = 0; y < h; y++) for (var x = 0; x < w; x++, i++) { fn(i, x, y, px); d[i * 4] = px[0]; d[i * 4 + 1] = px[1]; d[i * 4 + 2] = px[2]; d[i * 4 + 3] = 255; }
      g.putImageData(im, 0, 0);
      return c;
    }
    function normalMap(Hm, w, h, k) {
      return paint(w, h, function (i, x, y, px) {
        var l = Hm[y * w + (x + w - 1) % w], r = Hm[y * w + (x + 1) % w], u = Hm[((y + h - 1) % h) * w + x], dn = Hm[((y + 1) % h) * w + x];
        var nx = (l - r) * k, ny = (dn - u) * k, il = 1 / Math.sqrt(nx * nx + ny * ny + 1);
        px[0] = (nx * il * 0.5 + 0.5) * 255; px[1] = (ny * il * 0.5 + 0.5) * 255; px[2] = (il * 0.5 + 0.5) * 255;
      });
    }
    function cl(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }

    // 바닥 타일: 한 장(1.5m)에 0.75m 타일 2×2. 줄눈 + 타일 모서리마다 회갈색 작은 마름모(사진의 무늬. 반경 약 0.11m)
    function floor(seed, S) {
      var rnd = rngF(seed), n1 = noise(S, S, 6, 6, rnd), n2 = noise(S, S, 48, 48, rnd), T = S / 2, Hm = new Float32Array(S * S);
      var tone = [0.97 + rnd() * 0.05, 0.97 + rnd() * 0.05, 0.97 + rnd() * 0.05, 0.97 + rnd() * 0.05], D = S * 0.09;
      var col = paint(S, S, function (i, x, y, px) {
        var tx = x % T, ty = y % T, ti = ((y / T) | 0) * 2 + ((x / T) | 0);
        var gx = Math.min(tx, T - tx), gy = Math.min(ty, T - ty);
        var dm = Math.abs(gx) + Math.abs(gy);              // 가장 가까운 모서리까지(마름모 거리)
        var grout = Math.min(gx, gy) < 1.2;
        var c, h;
        if (dm < D) { var e = (D - dm) / D; c = [118 + 10 * n2[i], 98 + 6 * n2[i], 80]; h = 0.55 + 0.1 * Math.min(1, e * 6); if (dm > D - 1.5) c = [88, 74, 62]; }
        else if (grout) { c = [196, 186, 166]; h = 0.3; }
        else { var k = tone[ti] * (0.95 + 0.07 * n1[i] + 0.03 * n2[i]); c = [238 * k, 228 * k, 208 * k]; h = 0.6 + 0.04 * n2[i]; }
        Hm[i] = h;
        px[0] = cl(c[0]); px[1] = cl(c[1]); px[2] = cl(c[2]);
      });
      return { c: col, n: function () { return normalMap(Hm, S, S, 2.0); } };
    }
    // 홈 줄 콘크리트: 세로 리브(약 12.5cm 간격)를 두드려 쪼갠 거친 면 + 넓은 얼룩. 색은 SURF 색조가 정한다(회녹색)
    function conc(seed, S) {
      var rnd = rngF(seed), n1 = noise(S, S, 4, 4, rnd), n2 = noise(S, S, 64, 128, rnd), n3 = noise(S, S, 160, 160, rnd), P = S / 16, Hm = new Float32Array(S * S);
      var col = paint(S, S, function (i, x, y, px) {
        var t = (x % P) / P, rib = Math.sin(t * Math.PI);                  // 0(홈) .. 1(리브 머리)
        var rough = 0.55 * n2[i] + 0.45 * n3[i];
        var h = rib * 0.75 + (rib > 0.35 ? rough * 0.35 : 0.05 * rough);
        Hm[i] = h;
        var k = (0.78 + 0.22 * rib) * (0.88 + 0.16 * n1[i]) * (0.9 + 0.2 * rough * rib);
        if (rib < 0.18) k *= 0.72;                                           // 홈 바닥 그늘
        px[0] = cl(226 * k); px[1] = cl(224 * k); px[2] = cl(214 * k);
      });
      return { c: col, n: function () { return normalMap(Hm, S, S, 4.0); } };
    }
    // 매끈한 미장: 아주 옅은 얼룩 + 고운 모래알(색은 표면 색조가 정한다)
    function plaster(seed, S) {
      var rnd = rngF(seed), n1 = noise(S, S, 5, 5, rnd), n2 = noise(S, S, 40, 40, rnd), Hm = new Float32Array(S * S);
      var col = paint(S, S, function (i, x, y, px) {
        var g = rnd(), v = 0.93 + 0.05 * n1[i] + 0.02 * n2[i] + (g - 0.5) * 0.02;
        Hm[i] = n2[i] * 0.6 + g * 0.15;
        px[0] = cl(255 * v); px[1] = cl(252 * v); px[2] = cl(246 * v);
      });
      return { c: col, n: function () { return normalMap(Hm, S, S, 1.2); } };
    }
    // 제단 흰 대리석 타일(사진 3): 0.6m 타일 2×2, 옅은 회색 결(물결 노이즈), 회색 줄눈
    function mtile(seed, S) {
      var rnd = rngF(seed), n1 = noise(S, S, 8, 8, rnd), n2 = noise(S, S, 24, 24, rnd), n3 = noise(S, S, 64, 64, rnd), T2 = S / 2, Hm = new Float32Array(S * S);
      var tone = [0.98 + rnd() * 0.03, 0.97 + rnd() * 0.03, 0.98 + rnd() * 0.03, 0.97 + rnd() * 0.03];
      var col = paint(S, S, function (i, x, y, px) {
        var tx = x % T2, ty = y % T2, ti = ((y / T2) | 0) * 2 + ((x / T2) | 0), g = Math.min(tx, T2 - tx, ty, T2 - ty) < 1.0;
        var v = Math.abs(Math.sin((n1[i] * 6 + n2[i] * 2 + (ti % 2 ? x : y) / S * 3) * Math.PI));   // 가는 결
        var vein = Math.pow(1 - v, 18) * 0.16, k = tone[ti] * (0.985 + 0.02 * n3[i]) - vein;
        if (g) { px[0] = 182; px[1] = 180; px[2] = 176; Hm[i] = 0.2; return; }
        Hm[i] = 0.6; px[0] = cl(244 * k); px[1] = cl(243 * k); px[2] = cl(239 * k);
      });
      return { c: col, n: function () { return normalMap(Hm, S, S, 1.5); } };
    }
    // 로비 벽(사진 1·4): 베이지 좁은 타일(약 7 × 24cm)을 세워 쌓고 줄마다 반 칸 어긋남, 타일마다 밝기·색이 조금씩 다르다. 한 장 = 1m
    function brick(seed, S) {
      var rnd = rngF(seed), n1 = noise(S, S, 8, 8, rnd), n2 = noise(S, S, 96, 96, rnd), Hm = new Float32Array(S * S);
      var TW = S / 14, TH = S / 4, tone = [];
      for (var t = 0; t < 14 * 4 * 2; t++) tone.push([0.9 + rnd() * 0.16, (rnd() - 0.5) * 0.08]);
      var col = paint(S, S, function (i, x, y, px) {
        var row = (y / TH) | 0, xo = (x + (row % 2 ? TW / 2 : 0)) % S, ci = (xo / TW) | 0, tx = xo - ci * TW, ty = y - row * TH;
        var g = tx < 1.6 || ty < 1.6 || tx > TW - 1.2 || ty > TH - 1.2, tn = tone[(row * 14 + ci) % tone.length];
        if (g) { px[0] = 228; px[1] = 220; px[2] = 204; Hm[i] = 0.25; return; }
        var k = tn[0] * (0.95 + 0.06 * n1[i] + 0.05 * n2[i]), w = tn[1];
        Hm[i] = 0.6 + 0.08 * n2[i];
        px[0] = cl(214 * k * (1 + w)); px[1] = cl(196 * k); px[2] = cl(166 * k * (1 - w));
      });
      return { c: col, n: function () { return normalMap(Hm, S, S, 2.5); } };
    }
    return { floor: floor, conc: conc, plaster: plaster, mtile: mtile, brick: brick };
  }
  function ensureTextures(ctx) {
    var P = window.ChurchTexPack = window.ChurchTexPack || {};
    function miss(n) { return !P['tex_' + n + '.jpg']; }
    if (!TEX_NAMES.some(miss)) return;
    var probe = window.document.createElement('canvas');
    if (!probe.toDataURL || !probe.toDataURL()) return;   // 시험용 가짜 캔버스(Node): 대체 질감 + 색조로 짓는다
    var M = texTools(ctx.rng), S = 512;
    function put(n, mk, q) { if (miss(n)) { try { P['tex_' + n + '.jpg'] = mk().toDataURL('image/jpeg', q || 0.88); } catch (e) { /* 대체 질감 */ } } }
    function pair(n, gen) { if (miss(n) || miss(n + '_n')) { var r = gen(); put(n, function () { return r.c; }); put(n + '_n', r.n, 0.92); } }
    pair('yd_floor', function () { return M.floor(17, S); });
    pair('yd_conc', function () { return M.conc(29, S); });
    pair('yd_plaster', function () { return M.plaster(41, 256); });
    pair('yd_mtile', function () { return M.mtile(53, 512); });
    pair('yd_brick', function () { return M.brick(67, 512); });
  }
  function defineSurfaces(ctx) {
    Object.keys(SURF).forEach(function (k) {
      var d = SURF[k];
      var ph = d.photo || k, has = ctx.hasPhoto(ph);
      // 콘크리트·미장 그림은 무채색이라 늘 색조를 곱한다. 바닥 그림은 제 색을 갖는다(own: 대체 질감일 때만 색조)
      ctx.defineSurface(k, { photo: ph, tile: d.tile, roughness: d.roughness, clearcoat: d.clearcoat, ccRough: d.ccRough, normalScale: d.normalScale, envK: d.envK, fb: d.fb, color: has && d.own ? 0xffffff : d.tint });
    });
  }

  // (B) 빌더
  ChurchBuilders['yeouido'] = {
    layout: layout,
    skylights: SKY, chandeliers: CHAND, plan: PLAN, wallHead: WH, ceilTop: CH, frontWindow: FWIN, pier: PIER,   // 시험이 14처 판·창·피어 자리를 견줄 때 쓴다
    // 로비·계단·성가대석(시험: 걸어서 로비 → 계단 → 계단참 → 성가대석, 벽감 앞 봉헌초)
    lobby: LOB, stairHall: SH, stair: STR, landing: { th0: LANDA, th1: STR.th1, y: LT }, loft: { z: LZ, y: LT, top: LTOP, y0: LY, front1: FRONT1, rows: NROW, rowDepth: TDEP, aisle: LAISLE, entrance: { x: HW, z0: GAL.z0, z1: GAL.ent }, tiers: TIER },
    niche: NICHE, darkDoor: DARK, relief: { x: RELIEF, y: RELIEF_Y, w: RELIEF_W, h: RELIEF_H }, underColumns: UCOL, backBays: BACKBAY, gallery: { y0: YG0, y1: YG1, x: XG, x0: GAL.x0, x1: GAL.x1, z0: GAL.z0, ent: GAL.ent },
    // 3차(여러 층): 1층 로비 바닥·2층 바닥 판, 1층 → 2층 곡선 계단, 층별 충돌체 높이 범위
    floors: { F1: F1, F2: 0, slab: SLAB }, stairDown: DN, ranges: { R1F: R1F, R2F: R2F, RLOFT: RLOFT },
    thumb: { x: 0, z: 9.0, yaw: 0, pitch: 7, zoom: 1.0, hour: 11 },
    build: function (ctx) {
      var T = ctx.THREE, G = ChurchGeo, Geo = G.Geo, PI = Math.PI, low = ctx.quality === 'low';
      var cos = Math.cos, sin = Math.sin, min = Math.min, max = Math.max, sqrt = Math.sqrt, D2R = PI / 180;
      ensureTextures(ctx);
      defineSurfaces(ctx);
      var floorB = ctx.surfBatch('yd_floor'), concB = ctx.surfBatch('yd_conc'), cream = ctx.surfBatch('yd_cream'), ceil = ctx.surfBatch('yd_ceil'), marb = ctx.surfBatch('yd_mtile');
      var brickB = ctx.surfBatch('yd_brick'), whiteB = ctx.surfBatch('yd_white');
      var glow = ctx.glow, solid = ctx.solid, metal = ctx.metalB, woodB = ctx.woodB;
      var C = { lamp: new T.Color(0xffe2b0), door: 0x6a3426, doorD: 0x46221a, oak: 0xc29660, light: 0xd2a066, bronze: 0x8a6a34, iron: 0x262321, joint: 0xa4967c, figure: 0x93703e };
      function V(c) { return c.isColor ? c : new T.Color(c); }
      function hdr(c, k) { return V(c).clone().multiplyScalar(k); }
      var sacred = ctx._.sacred || (ctx._.sacred = []);   // 불경 방지 시험(reverence.test.mjs): 제대·감실 자리
      var i, k;

      // ---------- 도우미: 원통 벽 조각·고리 바닥(정점 색 위아래 그러데이션, 홈 줄 질감은 호 길이 UV) ----------
      // 각 f: 0 = 중심에서 -z(뒤), ±90° = 옆. 점 = (cx + r sin f, cz - r cos f)
      function pol(cx, cz, r, f) { return [cx + r * sin(f), cz - r * cos(f)]; }
      function ringWall(b, cx, cz, r, f0, f1, n, y0, y1, cBot, cTop, inward, uvTile) {
        var cb = V(cBot), ct = V(cTop === undefined ? cBot : cTop);
        for (var q = 0; q < n; q++) {
          var a0 = f0 + (f1 - f0) * q / n, a1 = f0 + (f1 - f0) * (q + 1) / n, p0 = pol(cx, cz, r, a0), p1 = pol(cx, cz, r, a1), am = (a0 + a1) / 2;
          var hint = inward ? [cx, (y0 + y1) / 2, cz] : [cx + (r + 3) * sin(am), (y0 + y1) / 2, cz - (r + 3) * cos(am)], o = { vary: 0 };
          if (uvTile) { var u0 = r * a0 / uvTile, u1 = r * a1 / uvTile, v0 = y0 / uvTile, v1 = y1 / uvTile; o.uvs = [u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1]; }
          b.addTris([p0[0], y0, p0[1], p1[0], y0, p1[1], p1[0], y1, p1[1], p0[0], y0, p0[1], p1[0], y1, p1[1], p0[0], y1, p0[1]], [cb, cb, ct, cb, ct, ct], hint, o);
        }
      }
      function annulus(b, cx, cz, r0, r1, f0, f1, n, y, color, up) {
        for (var q = 0; q < n; q++) {
          var a0 = f0 + (f1 - f0) * q / n, a1 = f0 + (f1 - f0) * (q + 1) / n, p0 = pol(cx, cz, r0, a0), p1 = pol(cx, cz, r0, a1), p2 = pol(cx, cz, r1, a1), p3 = pol(cx, cz, r1, a0);
          b.addQuad([p0[0], y, p0[1]], [p1[0], y, p1[1]], [p2[0], y, p2[1]], [p3[0], y, p3[1]], color, [cx, y + (up ? 5 : -5), cz], { vary: 0 });
        }
      }
      function vline(b, cx, cz, r, f, y0, y1, w, color) {   // 원통 벽 안쪽의 가는 세로 이음 줄
        var d = w / 2 / r, p0 = pol(cx, cz, r, f - d), p1 = pol(cx, cz, r, f + d);
        b.addQuad([p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]], color, [cx, (y0 + y1) / 2, cz], { vary: 0 });
      }

      // ---------- 바닥 ----------
      function flr(b, x0, x1, z0, z1, y) { b.addQuad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], 0xffffff, [(x0 + x1) / 2, y + 5, (z0 + z1) / 2], { vary: 0 }); }
      flr(floorB, -PLAN.C[0], PLAN.C[0], ZF, ZB, 0);                                // 신자석 홀 전체(제단 아래도 — 가려진다)

      // ---------- 제단: 둥근 앞 가장자리 3단, 흰 대리석 ----------
      // 원호 점: 중심 (0, PCZ), phi = 0 이 앞(+z). 정면 벽(z = ZF) 앞만 짓는다(뒤는 둘레 공간 바닥)
      var NP = low ? 18 : 32;
      function ppt(r, phi) { return [r * sin(phi), PCZ + r * cos(phi)]; }
      function phiMax(r) { return Math.acos((ZF - PCZ) / r); }
      (function () {
        var pm = phiMax(E0), q, a0, a1, p0, p1;
        for (q = 0; q < NP; q++) {   // 위 단: 현(0, ZF)에서 부채꼴
          a0 = -pm + 2 * pm * q / NP; a1 = -pm + 2 * pm * (q + 1) / NP; p0 = ppt(E0, a0); p1 = ppt(E0, a1);
          marb.addTris([0, SY, ZF, p0[0], SY, p0[1], p1[0], SY, p1[1]], 0xffffff, [0, SY + 5, ZF + 2]);
        }
        var NR = low ? 14 : 24;
        for (q = 0; q < NR; q++) {   // 둘레 공간(기둥 뒤) 바닥: 반지름 RB 반원
          a0 = -PI / 2 + PI * q / NR; a1 = -PI / 2 + PI * (q + 1) / NR; p0 = pol(0, ZF, RB, a0); p1 = pol(0, ZF, RB, a1);
          marb.addTris([0, SY, ZF, p0[0], SY, p0[1], p1[0], SY, p1[1]], 0xf6f6f4, [0, SY + 5, ZF - 2]);
        }
        // 계단: 디딤(고리) 2 + 챌판 3. 끝은 정면 벽·피어 속으로 들어간다
        var steps = [[E0, E1, SY - 0.2], [E1, E2, SY - 0.4]];
        steps.forEach(function (s, si) {
          var pmo = phiMax(s[1]);
          for (q = 0; q < NP; q++) {
            a0 = -pmo + 2 * pmo * q / NP; a1 = -pmo + 2 * pmo * (q + 1) / NP;
            var i0 = ppt(s[0], a0), i1 = ppt(s[0], a1), o0 = ppt(s[1], a0), o1 = ppt(s[1], a1);
            marb.addQuad([i0[0], s[2], i0[1]], [i1[0], s[2], i1[1]], [o1[0], s[2], o1[1]], [o0[0], s[2], o0[1]], si ? 0xf2f2f0 : 0xf8f8f6, [0, 5, PCZ], { vary: 0 });
          }
        });
        [[E0, SY - 0.2, SY], [E1, SY - 0.4, SY - 0.2], [E2, 0, SY - 0.4]].forEach(function (s) {
          var pmr = phiMax(s[0]);
          for (q = 0; q < NP; q++) {
            a0 = -pmr + 2 * pmr * q / NP; a1 = -pmr + 2 * pmr * (q + 1) / NP; p0 = ppt(s[0], a0); p1 = ppt(s[0], a1);
            var hm = ppt(s[0] + 3, (a0 + a1) / 2);
            marb.addQuad([p0[0], s[1], p0[1]], [p1[0], s[1], p1[1]], [p1[0], s[2], p1[1]], [p0[0], s[2], p0[1]], 0xd6d4ce, [hm[0], s[1], hm[1]], { vary: 0 });
          }
        });
      })();
      // 걷는 높이(floorY): 사각 구역만 되므로 x 0.5m 띠마다 원호 안쪽까지(계단 안으로 조금 들어간 계단꼴). 단마다 겹쳐 높은 값이 이긴다
      for (var xa = -8; xa < 8; xa += 0.5) {
        var xf = max(Math.abs(xa), Math.abs(xa + 0.5));
        [[E2, SY - 0.4], [E1, SY - 0.2], [E0, SY]].forEach(function (s) {
          if (xf >= s[0]) return;
          var z1 = PCZ + sqrt(s[0] * s[0] - xf * xf);
          if (z1 > ZF - RB) ctx.floorZone({ x0: xa, x1: xa + 0.5, z0: ZF - RB, z1: z1, y: s[1] });
        });
      }

      // ---------- 벽 ----------
      // 사각 벽면(x × y)에서 구멍(문·벽감)을 뺀 상자들: x 경계로 썰어 칸마다 구멍 사이의 y 구간을 돌려준다
      function wallBoxes(x0, x1, y0, y1, holes, fn) {
        var xs = [x0, x1];
        holes.forEach(function (h) { [h.x0, h.x1].forEach(function (v) { if (v > x0 && v < x1) xs.push(v); }); });
        xs.sort(function (p, q) { return p - q; });
        for (var q = 0; q < xs.length - 1; q++) {
          var xa = xs[q], xb = xs[q + 1]; if (xb - xa < 1e-6) continue;
          var xm = (xa + xb) / 2, yy = y0;
          holes.filter(function (h) { return h.x0 < xm && h.x1 > xm; }).sort(function (p, r) { return p.y0 - r.y0; }).forEach(function (h) {
            if (h.y0 > yy) fn(xa, xb, yy, min(h.y0, y1));
            yy = max(yy, h.y1);
          });
          if (yy < y1) fn(xa, xb, yy, y1);
        }
      }
      // 평면(2026-11-22 조사, yeouido.md §2.7 — 실측 아님): 정사각을 45° 돌린 마름모에 제단이 앞 모서리. 앞벽 둘은 축에서 ±45°로 벌어져
      // 옆 모서리(±17, 0.4)까지, 거기서 뒤로 ±45°로 좁아져(±11, 6.4), 뒤쪽은 곧은 옆벽(x ±11)과 뒷벽(z 21)으로 잘린다(성가대석·로비를 두는 쪽).
      // 벽(한쪽 = 앞 비스듬한 벽 · 뒤 비스듬한 벽 · 곧은 옆벽 앞부분): 세로 홈 줄 벽(벽 머리 WH) + 아래가 넓고 위로 좁아지며 안으로 눕는
      // 큰 버팀기둥(피어, 가로 줄눈 0.6m) + 그 틈마다 좁고 긴 호박빛 슬릿 창(폭 0.4, 창턱 2, 높이 4 — 무늬 없는 색, 작가 미확인) + 피어마다 흰 갓 2개 벽등
      function wallStrip(A, B, n, y0, y1, col) {   // 세로 홈 줄 벽 면 하나(A→B, 안쪽 법선 n), 호 길이 UV
        var L = Math.hypot(B[0] - A[0], B[1] - A[1]);
        concB.addQuad([A[0], y0, A[1]], [B[0], y0, B[1]], [B[0], y1, B[1]], [A[0], y1, A[1]], col, [(A[0] + B[0]) / 2 + n[0] * 3, (y0 + y1) / 2, (A[1] + B[1]) / 2 + n[1] * 3], { vary: 0 },
          [0, y0 / 2, L / 2, y0 / 2, L / 2, y1 / 2, 0, y1 / 2]);
      }
      function pierWall(A, B, n, ts) {   // ts: 피어 중심(A 에서 B 쪽으로 거리, m)
        var L = Math.hypot(B[0] - A[0], B[1] - A[1]), u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
        function P(t, d) { return [A[0] + u[0] * t + n[0] * d, A[1] + u[1] * t + n[1] * d]; }
        wallStrip(A, B, n, 0, WH, CONC_LOW);
        ts.forEach(function (t, q) {
          var w0 = 1.0, w1 = 0.6, d0 = 0.6, d1 = 1.35;   // 아래 폭 2.0 → 위 1.2, 깊이 0.6 → 1.35(안으로 약 5.5° 눕는다)
          var a = [P(t - w0, 0), P(t - w0, d0), P(t + w0, d0), P(t + w0, 0)], b = [P(t - w1, 0), P(t - w1, d1), P(t + w1, d1), P(t + w1, 0)], cen = P(t, 0.4);
          function face(i0, i1, col) {
            var p0 = a[i0], p1 = a[i1], q0 = b[i0], q1 = b[i1], fc = [(p0[0] + p1[0] + q0[0] + q1[0]) / 4, (p0[1] + p1[1] + q0[1] + q1[1]) / 4];
            concB.addQuad([p0[0], 0, p0[1]], [p1[0], 0, p1[1]], [q1[0], WH, q1[1]], [q0[0], WH, q0[1]], col, [fc[0] + (fc[0] - cen[0]) * 4, WH / 2, fc[1] + (fc[1] - cen[1]) * 4], { vary: 0 },
              [0, 0, 1, 0, 1, WH / 2, 0, WH / 2]);
          }
          face(1, 2, 0xbab2a2); face(0, 1, 0xaca496); face(3, 2, 0xaca496);
          for (var yj = 0.6; yj < WH - 0.3; yj += 0.6) {   // 가로 줄눈(앞면)
            var k = yj / WH, d = d0 + (d1 - d0) * k + 0.01, w = w0 + (w1 - w0) * k, j0 = P(t - w, d), j1 = P(t + w, d);
            solid.addQuad([j0[0], yj, j0[1]], [j1[0], yj, j1[1]], [j1[0], yj + 0.025, j1[1]], [j0[0], yj + 0.025, j0[1]], 0x6e685e, [cen[0] + n[0] * 5, yj, cen[1] + n[1] * 5], { vary: 0 });
          }
          [-0.5, 0.5].forEach(function (f) { var c = P(t + f, 0.35); ctx.addCollider({ x: c[0], z: c[1], r: 0.5 }); });
          ctx.aoDecalCircle({ x: cen[0] + n[0] * 0.0, z: cen[1] + n[1] * 0.0, r: 1.0, y: 0, pad: 0.3 });
          // 흰 갓 2개 벽등(피어 앞면, 2.5m)
          var lp = P(t, d0 + (d1 - d0) * 2.5 / WH + 0.06);
          ctx.box({ x: lp[0], y: 2.35, z: lp[1], w: 0.08, h: 0.3, d: 0.08, color: 0x2a2826, mat: 'metal' });
          [-0.17, 0.17].forEach(function (f) { var g = P(t + f, d0 + (d1 - d0) * 2.5 / WH + 0.16); glow.add(Geo.sph(6, 4), hdr(0xfff4e2, 1.8), { x: g[0], y: 2.62, z: g[1], sx: 0.09, sy: 0.12, sz: 0.09, flat: false, vary: 0 }); });
          if (q === ts.length - 1) return;
          var tm = (t + w0 + ts[q + 1] - w0) / 2, s0 = P(tm - 0.2, 0.02), s1 = P(tm + 0.2, 0.02), hintS = P(tm, 3);   // 슬릿 창(빛나는 호박빛 유리 + 가로 살)
          glow.addQuad([s0[0], 2.0, s0[1]], [s1[0], 2.0, s1[1]], [s1[0], 6.0, s1[1]], [s0[0], 6.0, s0[1]],
            [hdr(0xe8a040, 1.3), hdr(0xe8a040, 1.3), hdr(0xfff0b0, 1.7), hdr(0xe8a040, 1.3), hdr(0xfff0b0, 1.7), hdr(0xfff0b0, 1.7)], [hintS[0], 4, hintS[1]], { vary: 0 });
          for (var ym = 2.5; ym < 6; ym += 0.5) solid.addQuad([s0[0], ym, s0[1]], [s1[0], ym, s1[1]], [s1[0], ym + 0.03, s1[1]], [s0[0], ym + 0.03, s0[1]], 0x2a2420, [hintS[0], ym, hintS[1]], { vary: 0 });
        });
      }
      [-1, 1].forEach(function (s) {
        var S = function (p) { return [s * p[0], p[1]]; };
        pierWall(S(PLAN.F), S(PLAN.C), S([-SQ, SQ]), [3.6, 6.4, 9.2, 12.0]);        // 앞 비스듬한 벽(제단 쪽 → 옆 모서리)
        pierWall(S(PLAN.C), S(PLAN.B), S([-SQ, -SQ]), [2.0, 4.8, 7.4]);            // 뒤 비스듬한 벽
        pierWall(S(PLAN.B), S([HW, LZ]), [-s, 0], [1.6, 3.6]);                      // 곧은 옆벽 앞부분(성가대석 앞)
      });
      // 곧은 옆벽 뒷부분(성가대석 옆): 아래층 벽 + 위층 높이의 깊은 감실 2(어두운 격자 천장 + 작은 등, 나무 살 뒷벽, 흰 난간 + 나무 손잡이) + 위 벽
      (function () {
        var BAYZ = [[LZ + 0.5, 16.2], [17.0, 20.6]], slatD = 0x3e2c20, slatL = 0x86603e, dark = 0x2b2826;
        [-1, 1].forEach(function (s) {
          var xi = s * HW, xo = s * XG, xw = s * (HW + 0.5), zz;
          wallStrip([xi, LZ], [xi, ZW], [-s, 0], 0, YG0, CONC_LOW);
          wallStrip([xi, LZ], [xi, ZW], [-s, 0], YG1, WH, CONC_WALL);
          if (s > 0) { gallery(); return; }   // (2026-11-23) 오른쪽은 감실 대신 옆 갤러리(계단참 → 성가대석 맨 앞 오른쪽 입구)
          [[LZ, BAYZ[0][0]], [BAYZ[0][1], BAYZ[1][0]], [BAYZ[1][1], ZW]].forEach(function (r) { ctx.boxAABB({ x0: min(xi, xw), x1: max(xi, xw), z0: r[0], z1: r[1], y0: YG0, y1: YG1, surf: 'yd_conc', color: CONC_WALL }); });
          BAYZ.forEach(function (bz) {
            var z0 = bz[0], z1 = bz[1], zm = (z0 + z1) / 2, ym = (YG0 + YG1) / 2;
            concB.addQuad([xi, YG0, z0], [xo, YG0, z0], [xo, YG0, z1], [xi, YG0, z1], 0x8e8c86, [xi, YG0 + 3, zm], { vary: 0 });
            solid.addQuad([xi, YG1, z0], [xo, YG1, z0], [xo, YG1, z1], [xi, YG1, z1], dark, [xi, YG1 - 3, zm], { vary: 0 });
            for (zz = z0 + 0.15; zz < z1 - 0.1; zz += 0.3) solid.addQuad([xi, YG1 - 0.012, zz], [xo, YG1 - 0.012, zz], [xo, YG1 - 0.012, zz + 0.06], [xi, YG1 - 0.012, zz + 0.06], 0x4c4742, [xi, 0, zz], { vary: 0 });
            [0.3, 0.68].forEach(function (fx) { [0.25, 0.75].forEach(function (fz) {
              var lx = xi + (xo - xi) * fx, lz = z0 + (z1 - z0) * fz, yl = YG1 - 0.02;
              glow.addQuad([lx - 0.08, yl, lz - 0.08], [lx + 0.08, yl, lz - 0.08], [lx + 0.08, yl, lz + 0.08], [lx - 0.08, yl, lz + 0.08], hdr(0xfff0d6, 2.0), [lx, 0, lz], { vary: 0 });
            }); });
            woodB.addQuad([xo, YG0, z0], [xo, YG0, z1], [xo, YG1, z1], [xo, YG1, z0], slatD, [0, ym, zm], { vary: 0 });
            for (zz = z0 + 0.04; zz < z1 - 0.06; zz += 0.13) woodB.addQuad([xo - s * 0.015, YG0, zz], [xo - s * 0.015, YG0, zz + 0.075], [xo - s * 0.015, YG1, zz + 0.075], [xo - s * 0.015, YG1, zz], slatL, [0, ym, zz], { vary: 0.05 });
            [[z0, 1], [z1, -1]].forEach(function (e) { concB.addQuad([xi, YG0, e[0]], [xo, YG0, e[0]], [xo, YG1, e[0]], [xi, YG1, e[0]], CONC_WALL, [xi, ym, e[0] + e[1] * 3], { vary: 0 }); });
            ctx.boxAABB({ x0: min(xi, xi + s * 0.14), x1: max(xi, xi + s * 0.14), z0: z0, z1: z1, y0: YG0, y1: YG0 + 0.95, surf: 'yd_white' });
            ctx.boxAABB({ x0: min(xi - s * 0.03, xi + s * 0.17), x1: max(xi - s * 0.03, xi + s * 0.17), z0: z0, z1: z1, y0: YG0 + 0.95, y1: YG0 + 1.0, color: C.oak, mat: 'wood' });
          });
        });
        // 오른쪽 옆 갤러리(사용자 사진 G3 '오른쪽 옆으로 … 흰 난간의 옆 갤러리'): 옆 감실 둘을 한 줄로 이은 통로(x HW…XG, 바닥 YG0 = LT, 짙은 격자 천장 + 작은 등,
        // 나무 살 뒷벽). 성가대석 쪽은 흰 난간 벽 + 나무 손잡이(단과 갈라 둔다), 맨 앞(z GAL.z0…ent)만 트여 성가대석 맨 앞 띠로 들어간다. 뒤는 뒷벽을 지나 계단참으로
        function gallery() {
          var xi = GAL.x0, xo = GAL.x1, z0 = GAL.z0, z1 = ZW, zm = (z0 + z1) / 2, ym = (YG0 + YG1) / 2, zz;
          ctx.boxAABB({ x0: xi, x1: HW + 0.5, z0: LZ, z1: z0, y0: YG0, y1: YG1, surf: 'yd_conc', color: CONC_WALL });   // 앞 끝 벽
          // 바닥: 계단참·로비와 같은 옅은 회색 대리석(제단 대리석 묶음 — 로비 mfl 과 같은 UV), 계단 홀에서 이어진다
          marb.addQuad([xi, YG0, z0], [xi, YG0, z1], [xo, YG0, z1], [xo, YG0, z0], 0xd2d6da, [xi, YG0 + 3, zm], { vary: 0 }, [xi / 1.8, z0 / 1.8, xi / 1.8, z1 / 1.8, xo / 1.8, z1 / 1.8, xo / 1.8, z0 / 1.8]);
          solid.addQuad([xi, YG1, z0], [xo, YG1, z0], [xo, YG1, z1], [xi, YG1, z1], dark, [xi, YG1 - 3, zm], { vary: 0 });
          for (zz = z0 + 0.15; zz < z1 - 0.1; zz += 0.3) solid.addQuad([xi, YG1 - 0.012, zz], [xo, YG1 - 0.012, zz], [xo, YG1 - 0.012, zz + 0.06], [xi, YG1 - 0.012, zz + 0.06], 0x4c4742, [xi, 0, zz], { vary: 0 });
          for (zz = z0 + 0.8; zz < z1; zz += 1.6) { var lx = (xi + xo) / 2, yl = YG1 - 0.02; glow.addQuad([lx - 0.08, yl, zz - 0.08], [lx + 0.08, yl, zz - 0.08], [lx + 0.08, yl, zz + 0.08], [lx - 0.08, yl, zz + 0.08], hdr(0xfff0d6, 2.0), [lx, 0, zz], { vary: 0 }); }
          woodB.addQuad([xo, YG0, z0], [xo, YG1, z0], [xo, YG1, z1], [xo, YG0, z1], slatD, [0, ym, zm], { vary: 0 });
          for (zz = z0 + 0.04; zz < z1 - 0.06; zz += 0.13) woodB.addQuad([xo - 0.015, YG0, zz], [xo - 0.015, YG1, zz], [xo - 0.015, YG1, zz + 0.075], [xo - 0.015, YG0, zz + 0.075], slatL, [0, ym, zz], { vary: 0.05 });
          concB.addQuad([xi, YG0, z0], [xi, YG1, z0], [xo, YG1, z0], [xo, YG0, z0], CONC_WALL, [xi, ym, z0 + 3], { vary: 0 });
          ctx.boxAABB({ x0: xi - 0.01, x1: xi + 0.14, z0: GAL.ent, z1: z1, y0: YG0, y1: YG0 + 0.95, surf: 'yd_white' });   // 성가대석 쪽 흰 난간 벽(입구 뒤부터)
          ctx.boxAABB({ x0: xi - 0.04, x1: xi + 0.17, z0: GAL.ent, z1: z1, y0: YG0 + 0.95, y1: YG0 + 1.0, color: C.oak, mat: 'wood' });
          ctx.boxAABB({ x0: xi - 0.04, x1: xi + 0.17, z0: GAL.ent - 0.04, z1: GAL.ent + 0.04, y0: YG0, y1: YG0 + 1.0, color: C.oak, mat: 'wood' });   // 입구 기둥
          // 뒷벽을 지나는 부분(z ZB…ZW) 바깥 벽·천장: 갤러리가 계단 홀로 이어진다
          ctx.boxAABB({ x0: xo, x1: xo + 0.3, z0: ZB - 0.1, z1: ZW, y0: YG0 - 0.3, y1: YG1, surf: 'yd_brick' });
          whiteB.addQuad([xi, YG0 - 0.3, ZB], [xi, YG0 - 0.3, ZW], [xo, YG0 - 0.3, ZW], [xo, YG0 - 0.3, ZB], 0xf6f5f2, [12, YG0 - 5, ZB + 0.25], { vary: 0 });   // 뒷벽을 지나는 바닥 판 밑면
        }
      })();
      // 벽 충돌체: 0.5m 띠마다 벽 밖(앞 비스듬한 벽 · 뒤 비스듬한 벽 · 곧은 옆벽). 띠 안에서 벽이 가장 안쪽으로 오는 값으로(빈틈 없게)
      function wallX(z) { return z <= PLAN.C[1] ? PLAN.F[0] + (z - PLAN.F[1]) : (z <= PLAN.B[1] ? PLAN.C[0] - (z - PLAN.C[1]) * (PLAN.C[0] - PLAN.B[0]) / (PLAN.B[1] - PLAN.C[1]) : HW); }
      for (var zw = ZF; zw < ZB - 1e-6; zw += 0.5) {
        var xwl = min(wallX(zw), wallX(min(ZB, zw + 0.5)));
        if (zw < PLAN.C[1] && zw + 0.5 > PLAN.C[1]) xwl = min(xwl, wallX(PLAN.C[1]));
        [-1, 1].forEach(function (s) {
          if (s > 0 && zw >= LZ - 1e-6) {   // 오른쪽 옆 갤러리(성가대석 높이 LT): 갤러리 바깥 벽 너머는 모든 층, 갤러리 자리(x HW…XG)는 그 밑(성당 높이)만 막는다
            ctx.addCollider({ x0: GAL.x1, x1: PLAN.C[0] + 0.6, z0: zw, z1: zw + 0.5 });
            ctx.addCollider({ x0: xwl, x1: GAL.x1, z0: zw, z1: zw + 0.5, y0: -1e3, y1: LT - 0.6 });
            return;
          }
          ctx.addCollider({ x0: s < 0 ? -PLAN.C[0] - 0.6 : xwl, x1: s < 0 ? -xwl : PLAN.C[0] + 0.6, z0: zw, z1: zw + 0.5 });
        });
      }
      // 정면 벽(드럼 양옆, 거친 홈 줄 — 사진 3 오른쪽 끝) + 피어와 드럼 사이 키 큰 색유리 창(추상 색면)
      [-1, 1].forEach(function (s) {
        ctx.wall({ x0: s * RB, z0: ZF - 0.25, x1: s * (PLAN.F[0] + 0.3), z1: ZF - 0.25, h: CH, t: 0.5, surf: 'yd_conc', color: 0xa8a396, collide: false, plinth: false, crown: false });
        // 둘레 공간 천장 위(드럼 바깥 ~ 둘레 공간 끝): 정면 벽이 드럼에 닿는다
        ctx.boxAABB({ x0: s < 0 ? -RB : RD, x1: s < 0 ? -RD : RB, z0: ZF - 0.5, z1: ZF, y0: YP, y1: CH, surf: 'yd_conc', color: 0xa8a396 });
        ctx.window({ x: s * FWIN.x, z: ZF, y: FWIN.sill, face: [0, 1], w: FWIN.w, h: FWIN.h, top: 'flat', pattern: 'lancet', colors: GLASS_FRONT, frame: true, frameColor: 0x58554e, beam: false, seed: s < 0 ? 511 : 523,
          glass: 'yeouido_abstract', glassMod: FWIN.h / 3 });   // 현대 색유리(작가 미확인, 저작권 존속으로 봄): 사진의 색 분위기만 따른 추상 색면(구도·선을 옮기지 않는다)
        ctx.addCollider({ x0: s < 0 ? -PLAN.C[0] - 0.6 : RB, x1: s < 0 ? -RB : PLAN.C[0] + 0.6, z0: ZF - RB, z1: ZF });   // 정면 벽 뒤(둘레 공간 바깥 모서리)
      });
      // 뒷벽(성당 ↔ 로비): 신랑 쪽 반(z 21.0…21.25, 홈 줄 콘크리트) + 로비 쪽 반(21.25…21.5, 베이지 벽돌 타일). 구멍: 가운데 정문(열림),
      // 어두운 문(아래로 내려가는 계단, 걷지 못함), 성가대석 문(위층 LT…), 성모상 벽감(로비 쪽 반만). ctx.wall 은 문 구멍을 뚫지 않아 상자로 짓는다
      var ZM = ZB + 0.25;
      var HOLES = [{ x0: -1.4, x1: 1.4, y0: 0, y1: 2.9 }, { x0: DARK.x0, x1: DARK.x1, y0: 0, y1: DARK.h }, { x0: GAL.x0, x1: GAL.x1, y0: YG0 - 0.3, y1: YG1 }]   // 옆 갤러리가 뒷벽 끝을 지난다(아래 0.3m 는 갤러리 바닥 판 — 벽 윗면이 바닥과 겹쳐 깜빡이지 않게)
        .concat(BACKBAY.map(function (b) { return { x0: b[0], x1: b[1], y0: LTOP, y1: 7.6 }; }));   // 성가대석 뒤 위 감실
      wallBoxes(-HW - 0.5, HW + 0.5, 0, WH + 0.3, HOLES, function (xa, xb, ya, yb) { ctx.boxAABB({ x0: xa, x1: xb, z0: ZB, z1: ZM, y0: ya, y1: yb, surf: 'yd_conc', color: ya < LY ? CONC_LOW : CONC_WALL }); });
      wallBoxes(-HW - 0.5, HW + 0.5, 0, SH.top, HOLES.concat([{ x0: NICHE.x - NICHE.w / 2, x1: NICHE.x + NICHE.w / 2, y0: NICHE.y0, y1: NICHE.y1 }]), function (xa, xb, ya, yb) { ctx.boxAABB({ x0: xa, x1: xb, z0: ZM, z1: ZW, y0: ya, y1: yb, surf: 'yd_brick' }); });
      // 걸레받이: 신랑 쪽(옅은 회색) · 로비 쪽(검은 띠 — 사진 4)
      wallBoxes(-HW, HW, 0, 0.12, HOLES, function (xa, xb) { ctx.boxAABB({ x0: xa, x1: xb, z0: ZB - 0.025, z1: ZB, y0: 0, y1: 0.12, color: 0xbcbab2, mat: 'solid' }); });
      wallBoxes(LOB.x0, SH.cx, 0, 0.1, HOLES, function (xa, xb) { ctx.boxAABB({ x0: xa, x1: xb, z0: ZW, z1: ZW + 0.02, y0: 0, y1: 0.1, color: 0x1c1a18, mat: 'solid' }); });
      // 뒷벽 충돌체: 정문(가운데)·옆 갤러리(위층) 자리만 비운다. 어두운 문은 막는다. 갤러리 자리는 그 밑(성당·로비 높이)만 막는다
      [[-PLAN.C[0] - 0.6, -1.4], [1.4, GAL.x0], [GAL.x1, PLAN.C[0] + 0.6]].forEach(function (r) { ctx.addCollider({ x0: r[0], x1: r[1], z0: ZB, z1: ZW }); });
      ctx.addCollider({ x0: GAL.x0, x1: GAL.x1, z0: ZB, z1: ZW, y0: -1e3, y1: LT - 0.6 });
      ctx.addCollider({ x0: -1.4, x1: 1.4, z0: ZB, z1: ZW, y0: 2.6, y1: 1e3 });   // 정문 위 벽: 성가대석 맨 뒤 단에서 문 위 벽 속으로 걸어 나가 2층으로 떨어지지 않게(예전부터 비어 있던 틈)
      // 로비 왼쪽 바깥(걷기 경계가 마름모 옆 모서리 x ±17 까지라): 로비 유리 정면 밖을 막는다
      ctx.addCollider({ x0: -PLAN.C[0] - 0.6, x1: LOB.x0, z0: ZB, z1: LOB.z1 + 0.5 });

      // ---------- 큰 둥근 피어(제단 앞 모서리): 세로 홈 줄의 거친 돌, 약 1.25m 마다 가로 이음, 앞에 벽등 ----------
      var NPI = low ? 14 : 24;
      [-1, 1].forEach(function (s) {
        var px = s * PIER.x, pz = PIER.z, r = PIER.r;
        ringWall(concB, px, pz, r, -PI, PI, NPI, 0, CH - 1.0, 0xb2ada0, 0xcac4b6, false, 2.0);
        for (var y = 1.25; y < CH - 1.5; y += 1.25) ringWall(solid, px, pz, r + 0.006, -PI, PI, NPI, y - 0.015, y + 0.015, 0x5e5a52, 0x5e5a52, false);
        ctx.addCollider({ x: px, z: pz, r: r });
        ctx.aoDecalCircle({ x: px, z: pz, r: r + 0.1, y: 0, pad: 0.35 });
        // 벽등(사진 2: 피어 앞 사람 키 위): 청동 받침 + 따뜻한 빛
        var la = Math.atan2(-s * 0.55, 1), lx = px + sin(la) * (r + 0.02), lz = pz + cos(la) * (r + 0.02);
        ctx.box({ x: lx, y: 2.15, z: lz, w: 0.16, h: 0.3, d: 0.08, ry: la, color: C.bronze, mat: 'metal' });
        glow.add(Geo.sph(8, 6), hdr(0xffd9a0, 2.4), { x: lx + sin(la) * 0.1, y: 2.36, z: lz + cos(la) * 0.1, sx: 0.09, sy: 0.12, sz: 0.09, flat: false, vary: 0 });
      });

      // ---------- 드럼(높은 원통): 판 띠 + 가는 이음 줄. 신랑 천장(10m) 아래는 기둥 위 뒤쪽 200°, 위는 온 원통 ----------
      var NS = low ? 20 : 40, NF = low ? 36 : 72;   // 200° 조각 수 / 360° 조각 수
      var bandLo = 0xdacdb4, bandHi = 0xf2e9d6;
      // 린텔 띠(기둥 머리 위, 조금 앞으로 나옴) + 밑면
      ringWall(cream, 0, ZF, RD - 0.04, -FE, FE, NS, YP, YL, 0xefe6d6, 0xf7f0e4, true);
      annulus(cream, 0, ZF, RD - 0.04, RB, -PI / 2, PI / 2, NS, YP, 0xf2e8d6, false);        // 둘레 공간 천장(린텔 밑면 포함)
      [-1, 1].forEach(function (s) { annulus(cream, 0, ZF, RD - 0.04, RD + 0.3, s < 0 ? -FE : PI / 2, s < 0 ? -PI / 2 : FE, 3, YP, 0xf2e8d6, false); });
      for (k = 0; k < 8; k++) {
        var y0 = YL + DH * k, y1 = y0 + DH, full = false;   // 드럼은 위까지 반원통 벽감(앞은 경사 천장과 만난다 — 조사 §4.1)
        if (full) ringWall(cream, 0, ZF, RD, -PI, PI, NF, y0, y1, bandLo, bandHi, true);
        else ringWall(cream, 0, ZF, RD, -FE, FE, NS, y0, y1, bandLo, bandHi, true);
        ringWall(cream, 0, ZF, RD - 0.006, full ? -PI : -FE, full ? PI : FE, full ? NF : NS, y0 - 0.016, y0 + 0.016, C.joint, C.joint, true);   // 가로 이음
      }
      // 세로 이음(약 32° 마다, 가운데 판이 그리스도 상 뒤): 10m 아래는 ±80° 까지, 위는 한 바퀴
      [-80, -48, -16, 16, 48, 80].forEach(function (f) { vline(cream, 0, ZF, RD - 0.007, f * D2R, YL, DT, 0.03, C.joint); });
      // 드럼 앞 끝(현 앞 90°…100°)의 바깥 면: 옆 통로에서 보인다
      [-1, 1].forEach(function (s) { ringWall(cream, 0, ZF, RD + 0.3, s < 0 ? -FE : PI / 2, s < 0 ? -PI / 2 : FE, 3, YP, CH, 0xece2cf, 0xf4ecdc, false); });
      // 꼭대기: 어두운 테두리 천장(고리) + 가운데 한 단 높은 어두운 원(사진 4)
      var RT = 1.7;
      annulus(ceil, 0, ZF, RT, RD, -FE, FE, NS, DT, 0x9ea4aa, false);
      ringWall(ceil, 0, ZF, RT, -PI, PI, NF / 2, DT, DT + 0.6, 0x8a9098, 0x7a8088, true);
      annulus(ceil, 0, ZF, 0, RT, -PI, PI, NF / 2, DT + 0.6, 0x5a626e, false);

      // ---------- 기둥 6: 안쪽 4(드럼 밑까지) + 양끝 2(드럼 꼭대기까지). 크림색, 가로 이음 줄 ----------
      COLS.forEach(function (fd) {
        var f = fd * D2R, p = pol(0, ZF, RD, f), end = Math.abs(fd) === 100, r = end ? 0.48 : 0.42, top = end ? DT : YP, seg = low ? 12 : 20;
        ctx.cyl({ x: p[0], y: SY, z: p[1], r: r, h: top - SY, seg: seg, surf: 'yd_cream', color: 0xf2e8d6, flat: false });
        var js = end ? [SY + (YP - SY) / 3, SY + (YP - SY) * 2 / 3, YP, YL].concat([1, 2, 3, 4, 5, 6, 7].map(function (q) { return YL + DH * q; })) : [SY + (YP - SY) / 3, SY + (YP - SY) * 2 / 3];
        js.forEach(function (y) { ctx.cyl({ x: p[0], y: y - 0.012, z: p[1], r: r + 0.004, h: 0.024, seg: seg, color: C.joint, mat: 'solid', flat: false, vary: 0 }); });
        ctx.aoDecalCircle({ x: p[0], z: p[1], r: r + 0.12, y: SY, pad: 0.2 });
      });

      // ---------- 둘레 공간(기둥 뒤) 뒷벽: 올리브빛 홈 줄 판 2단, 위에서 비추는 빛(위가 밝음) + 벽 머리 숨은 등 ----------
      var YM = SY + (YP - SY) * 0.62, NB = low ? 16 : 30;
      ringWall(concB, 0, ZF, RB, -PI / 2, PI / 2, NB, SY, YM, 0x8c885c, 0xb4a870, true, 2.0);
      ringWall(concB, 0, ZF, RB, -PI / 2, PI / 2, NB, YM, YP, 0xc2b47a, 0xf4e0a0, true, 2.0);
      ringWall(solid, 0, ZF, RB - 0.006, -PI / 2, PI / 2, NB, YM - 0.012, YM + 0.012, 0x4e4a36, 0x4e4a36, true);
      ringWall(glow, 0, ZF, RB - 0.03, -PI / 2 + 0.02, PI / 2 - 0.02, NB, YP - 0.07, YP - 0.015, hdr(0xffe0a8, 1.5), hdr(0xffe0a8, 1.5), true);
      // 둘레 공간 바깥(원 밖 모서리) 충돌체: 0.5m 띠마다 원 밖을 막는 상자
      for (var xs = 0; xs < RB; xs += 0.5) {
        var xe = min(RB, xs + 0.5), zc = ZF - sqrt(max(0, RB * RB - xe * xe));
        [-1, 1].forEach(function (s) { ctx.addCollider({ x0: s < 0 ? -xe : xs, x1: s < 0 ? -xs : xe, z0: ZF - RB - 0.4, z1: zc }); });
      }

      // ---------- 천장(2026-11-22 조사·사진 7~11): 제단 쪽으로 높아지는 피라미드식 경사 천장 — 벽 머리(WH 8m)에서 드럼 앞 현(CH 12.6m)까지
      //            평면 삼각 면(앞 비스듬한 면은 짙은 회색, 뒤쪽 면은 흰빛). 뒤쪽 경사면에 네모 천창 8(따뜻한 색 — 한 장 한 색, 무늬 없음) ----------
      var DRc = pol(0, ZF, RD + 0.3, FE), DL = [-DRc[0], DRc[1]], DR = [DRc[0], DRc[1]];
      var PF = [PLAN.F, PLAN.C, PLAN.B, [HW, ZB + 0.25]];   // 오른쪽 둘레(앞 → 뒤)
      var CEIL = [];   // 시험·천창·샹들리에가 쓰는 삼각 면 [[x,y,z]×3]
      [-1, 1].forEach(function (s) {
        var D = s < 0 ? DL : DR, prev = [s * RB, ZF - 0.25];
        PF.forEach(function (p) {
          var q = [s * p[0], p[1]];
          CEIL.push([[D[0], CH, D[1]], [prev[0], WH, prev[1]], [q[0], WH, q[1]]]);
          prev = q;
        });
      });
      CEIL.push([[DL[0], CH, DL[1]], [DR[0], CH, DR[1]], [HW, WH, ZB + 0.25]], [[DL[0], CH, DL[1]], [HW, WH, ZB + 0.25], [-HW, WH, ZB + 0.25]]);
      CEIL.forEach(function (t) {
        var zc = (t[0][2] + t[1][2] + t[2][2]) / 3, col = zc < 0 ? 0xc4c3be : 0xffffff;
        ceil.addTris([t[0][0], t[0][1], t[0][2], t[1][0], t[1][1], t[1][2], t[2][0], t[2][1], t[2][2]], col, [(t[0][0] + t[1][0] + t[2][0]) / 3, 0, zc]);
      });
      function ceilY(x, z) {   // 그 자리 천장 높이(삼각 면 위, 면 밖이면 WH)
        for (var q = 0; q < CEIL.length; q++) {
          var t = CEIL[q], ax = t[0][0], az = t[0][2], bx = t[1][0], bz = t[1][2], cx2 = t[2][0], cz2 = t[2][2];
          var d = (bz - cz2) * (ax - cx2) + (cx2 - bx) * (az - cz2); if (Math.abs(d) < 1e-9) continue;
          var l1 = ((bz - cz2) * (x - cx2) + (cx2 - bx) * (z - cz2)) / d, l2 = ((cz2 - az) * (x - cx2) + (ax - cx2) * (z - cz2)) / d, l3 = 1 - l1 - l2;
          if (l1 >= -1e-6 && l2 >= -1e-6 && l3 >= -1e-6) return l1 * t[0][1] + l2 * t[1][1] + l3 * t[2][1];
        }
        return WH;
      }
      SKY.forEach(function (p, q) {   // 천창: 면 위에 놓인 네모(어두운 테 + 빛나는 색유리)
        var x = p[0], z = p[1], col = [0xffb070, 0xff90b8, 0xffc890, 0x9ab8ff, 0xffa080, 0xc8a0ff, 0xffd08a, 0xff9ab0][q % 8];
        function c(dx, dz, e) { return [x + dx, ceilY(x + dx, z + dz) - e, z + dz]; }
        solid.addQuad(c(-0.5, -0.5, 0.02), c(0.5, -0.5, 0.02), c(0.5, 0.5, 0.02), c(-0.5, 0.5, 0.02), 0x3a3836, [x, 0, z], { vary: 0 });
        glow.addQuad(c(-0.4, -0.4, 0.03), c(0.4, -0.4, 0.03), c(0.4, 0.4, 0.03), c(-0.4, 0.4, 0.03), [hdr(col, 1.2), hdr(col, 1.2), hdr(0xfff6ea, 1.8), hdr(col, 1.2), hdr(0xfff6ea, 1.8), hdr(0xfff6ea, 1.8)], [x, 0, z], { vary: 0 });
      });

      // ---------- 성가대석(뒤 위층 = 3층, 사진 6~11): 바닥판 + 앞 난간 = 흰 벽(부조 판 14 + 둥근 환기구 13 + 붉은 숫자 표시판) → 나무 띠 → 짙은 유리 난간 + 쇠 손잡이 ----------
      var PY0 = LY - 0.2, PY1 = LT + 0.45;   // 흰 난간 벽 아래·위 끝(사진 10: 성가대석 바닥보다 아래로 내려온 넓은 흰 띠)
      ctx.boxAABB({ x0: -HW, x1: HW, z0: LZ, z1: ZB, y0: LY, y1: LT, surf: 'yd_white' });
      ctx.boxAABB({ x0: -HW, x1: HW, z0: LZ - 0.15, z1: LZ + 0.15, y0: PY0, y1: PY1, surf: 'yd_white' });
      ctx.boxAABB({ x0: -HW, x1: HW, z0: LZ - 0.2, z1: LZ + 0.25, y0: PY1, y1: PY1 + 0.07, color: 0x7a4a2c, mat: 'wood' });
      ctx.boxAABB({ x0: -HW, x1: HW, z0: LZ - 0.03, z1: LZ + 0.03, y0: LT + 1.0, y1: LT + 1.04, color: 0x8a8a86, mat: 'metal' });
      for (var xpst = -HW + 1.25; xpst < HW; xpst += 1.6) ctx.boxAABB({ x0: xpst - 0.02, x1: xpst + 0.02, z0: LZ - 0.03, z1: LZ + 0.03, y0: PY1 + 0.07, y1: LT + 1.0, color: 0x6a6a66, mat: 'metal' });
      // 십자가의 길 부조 판 14(사진 9·10: 짙은 녹청 청동, 세로로 긴 네모, 작가 미확인) → 인물·장면 없는 중립 부조(납작한 둥근 덩이) + 처 번호(로마 숫자 막대)만.
      // 이 자리가 앱의 14처(걸어가는 곳·누르는 곳)다 — layout.crossWay.plaques(아래 RELIEF), 앱 그림 판은 그리지 않는다(panels: false, yeouido.md §4.1·§7)
      (function () {
        var BR = 0x3c4a3e, BRL = 0x55665a, ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'], rr = ctx.rng(907), zp = LZ - 0.15;
        function bar(x0, y0, x1, y1) { ctx.beam3([x0, y0, zp - 0.034], [x1, y1, zp - 0.034], 0.012, 0.008, 0xc8b88a, metal); }
        function glyph(ch, x, y, h) {   // 로마 숫자 한 글자(막대): I, V, X
          var w = h * 0.55;
          if (ch === 'I') bar(x, y, x, y + h);
          else if (ch === 'V') { bar(x - w / 2, y + h, x, y); bar(x, y, x + w / 2, y + h); }
          else { bar(x - w / 2, y, x + w / 2, y + h); bar(x - w / 2, y + h, x + w / 2, y); }
        }
        RELIEF.forEach(function (px, q) {
          var yc = RELIEF_Y;
          solid.add(Geo.box(), BR, { x: px, y: yc - RELIEF_H / 2, z: zp - 0.02, sx: RELIEF_W, sy: RELIEF_H, sz: 0.04, flat: true, vary: 0.03 });
          [[-1, 0], [1, 0]].forEach(function (e) { solid.add(Geo.box(), BRL, { x: px + e[0] * (RELIEF_W / 2 - 0.015), y: yc - RELIEF_H / 2, z: zp - 0.045, sx: 0.03, sy: RELIEF_H, sz: 0.012, flat: true, vary: 0 }); });
          [0, 1].forEach(function (e) { solid.add(Geo.box(), BRL, { x: px, y: yc - RELIEF_H / 2 + e * (RELIEF_H - 0.03), z: zp - 0.045, sx: RELIEF_W, sy: 0.03, sz: 0.012, flat: true, vary: 0 }); });
          for (var b2 = 0, nb = 2 + ((rr() * 2) | 0); b2 < nb; b2++) {
            solid.add(Geo.sph(5, 4), BRL, { x: px + (rr() - 0.5) * 0.2, y: yc + 0.04 + (rr() - 0.5) * 0.26, z: zp - 0.04, ry: rr() * PI, sx: 0.05 + rr() * 0.05, sy: 0.06 + rr() * 0.07, sz: 0.025, flat: false, vary: 0.04 });
          }
          var str = ROM[q], gh = 0.055, gap = gh * 0.22, tw = 0, c, left;   // 처 번호: 판 아래 끝 안쪽, 가운데 맞춤
          function gw(ch) { return ch === 'I' ? 0.012 : gh * 0.55; }
          for (c = 0; c < str.length; c++) tw += gw(str[c]) + (c ? gap : 0);
          for (c = 0, left = px - tw / 2; c < str.length; c++) { glyph(str[c], left + gw(str[c]) / 2, yc - RELIEF_H / 2 + 0.045, gh); left += gw(str[c]) + gap; }
          if (q === 13) return;
          var gxx = (px + RELIEF[q + 1]) / 2;   // 판 사이 둥근 환기구(옅은 회색 테 + 어두운 살)
          solid.add(Geo.cyl(low ? 8 : 10, 1), 0xb4b4b0, { x: gxx, y: yc - 0.1, z: zp - 0.012, rx: PI / 2, sx: 0.085, sy: 0.02, sz: 0.085, flat: true, vary: 0 });
          for (var sl = -1; sl <= 1; sl++) solid.add(Geo.box(), 0x3a3a38, { x: gxx, y: yc - 0.1 + sl * 0.028 - 0.006, z: zp - 0.034, sx: 0.13 - Math.abs(sl) * 0.025, sy: 0.012, sz: 0.01, flat: true, vary: 0 });
        });
        // 붉은 숫자 표시판(사진 9·10, 왼쪽 위): 검은 상자 + 붉은 빛 숫자 띠
        var lx = (RELIEF[3] + RELIEF[4]) / 2;
        ctx.box({ x: lx, y: PY1 - 0.2, z: zp - 0.03, w: 0.3, h: 0.12, d: 0.05, color: 0x161412, mat: 'solid' });
        glow.addQuad([lx - 0.12, PY1 - 0.185, zp - 0.056], [lx + 0.12, PY1 - 0.185, zp - 0.056], [lx + 0.12, PY1 - 0.095, zp - 0.056], [lx - 0.12, PY1 - 0.095, zp - 0.056], hdr(0xff2a1a, 2.2), [lx, PY1, zp - 3], { vary: 0 });
      })();
      // 성가대석 밑(아래층, 사진 8·10): 짙은 격자 천장(4.3m) + 둥근 매입등, 흰 원기둥 3
      (function () {
        var yu = PY0 + 0.05, x1 = HW;   // (3차) 오른쪽 닫힌 방을 없애 격자 천장이 성가대석 밑 전체를 덮는다
        solid.addQuad([-HW, yu, LZ + 0.15], [x1, yu, LZ + 0.15], [x1, yu, ZB], [-HW, yu, ZB], 0x2a2420, [0, 0, 18], { vary: 0 });
        for (var gx = -HW + 0.6; gx < x1; gx += 0.6) solid.addQuad([gx - 0.02, yu - 0.01, LZ + 0.15], [gx + 0.02, yu - 0.01, LZ + 0.15], [gx + 0.02, yu - 0.01, ZB], [gx - 0.02, yu - 0.01, ZB], 0x4a4038, [gx, 0, 18], { vary: 0 });
        for (var gz = LZ + 0.75; gz < ZB; gz += 0.6) solid.addQuad([-HW, yu - 0.011, gz - 0.02], [x1, yu - 0.011, gz - 0.02], [x1, yu - 0.011, gz + 0.02], [-HW, yu - 0.011, gz + 0.02], 0x4a4038, [0, 0, gz], { vary: 0 });
        for (gx = -HW + 1.2; gx < x1 - 0.5; gx += 1.8) for (gz = LZ + 0.9; gz < ZB - 0.3; gz += 1.5) glow.add(Geo.cyl(low ? 8 : 12, 1), hdr(0xfff0d6, 2.2), { x: gx, y: yu - 0.026, z: gz, sx: 0.1, sy: 0.012, sz: 0.1, flat: true, vary: 0 });
        UCOL.forEach(function (x) {   // 흰 각기둥(0.6 × 0.6): 위층을 뚫고 경사 천장까지 솟는다(조사 §4.5). 3차: 깊이 0.9 → 0.6 — 성가대석 왼쪽 덩이 맨 앞줄 앞을 지나는 길을 낸다
          var zc = LZ + 0.3;
          ctx.box({ x: x, y: 0, z: zc, w: 0.6, h: ceilY(x, zc), d: 0.6, surf: 'yd_white' });
          ctx.addCollider({ x0: x - 0.32, x1: x + 0.32, z0: zc - 0.32, z1: zc + 0.32 }); ctx.aoDecal({ x0: x - 0.3, x1: x + 0.3, z0: zc - 0.3, z1: zc + 0.3, y: 0, pad: 0.2 });
          ctx.aoDecal({ x0: x - 0.3, x1: x + 0.3, z0: LZ + 0.15, z1: zc + 0.3, y: LT, pad: 0.15 });
        });
      })();
      // 성가대석 뒤 위 감실 3(사진 8·9: 짙은 격자 천장 + 뒤쪽 창, 걷지 못함) + 뒷벽의 기운 피어 4(신랑 쪽으로 기울며 오른다)
      (function () {
        var yb0 = LTOP, yb1 = 7.6, zb = ZB + 2.5;
        BACKBAY.forEach(function (bx) {
          var x0 = bx[0], x1 = bx[1], xm = (x0 + x1) / 2;
          woodB.addQuad([x0, yb0, ZB], [x1, yb0, ZB], [x1, yb0, zb], [x0, yb0, zb], 0x6a4a32, [xm, yb0 + 3, ZB + 1], { vary: 0 });
          solid.addQuad([x0, yb1, ZB], [x1, yb1, ZB], [x1, yb1, zb], [x0, yb1, zb], 0x2a2622, [xm, yb1 - 3, ZB + 1], { vary: 0 });
          for (var gx = x0 + 0.3; gx < x1; gx += 0.3) solid.addQuad([gx - 0.015, yb1 - 0.01, ZB], [gx + 0.015, yb1 - 0.01, ZB], [gx + 0.015, yb1 - 0.01, zb], [gx - 0.015, yb1 - 0.01, zb], 0x4c4640, [gx, 0, ZB + 1], { vary: 0 });
          [0.25, 0.5, 0.75].forEach(function (f) { var lx = x0 + (x1 - x0) * f; glow.addQuad([lx - 0.2, yb1 - 0.02, ZB + 0.7], [lx + 0.2, yb1 - 0.02, ZB + 0.7], [lx + 0.2, yb1 - 0.02, ZB + 1.1], [lx - 0.2, yb1 - 0.02, ZB + 1.1], hdr(0xfff0d6, 1.8), [lx, 0, ZB + 1], { vary: 0 }); });
          [[x0, 1], [x1, -1]].forEach(function (e) { concB.addQuad([e[0], yb0, ZB], [e[0], yb0, zb], [e[0], yb1, zb], [e[0], yb1, ZB], CONC_WALL, [e[0] + e[1] * 3, 7, ZB + 1], { vary: 0 }); });
          concB.addQuad([x0, yb0, zb], [x1, yb0, zb], [x1, yb1, zb], [x0, yb1, zb], 0x8a8882, [xm, 7, ZB], { vary: 0 });
          // 뒤쪽 창(밝은 바깥 빛, 무늬 없는 맑은 유리) 둘
          [-0.25, 0.25].forEach(function (f) {
            var wx = xm + (x1 - x0) * f, ww = (x1 - x0) * 0.2;
            glow.addQuad([wx - ww, yb0 + 0.9, zb - 0.01], [wx + ww, yb0 + 0.9, zb - 0.01], [wx + ww, yb1 - 0.5, zb - 0.01], [wx - ww, yb1 - 0.5, zb - 0.01], hdr(0xe8f0f4, 1.15), [wx, 7, ZB], { vary: 0 });
          });
        });
        [-6.4, -2.1, 2.1, 6.4].forEach(function (xp) {   // 뒷벽 기운 피어
          var d0 = 0.4, d1 = 1.2, w0 = 0.45, w1 = 0.35, ya = LTOP + 0.6, yb = WH, z0 = ZB;
          var A = [[xp - w0, ya, z0], [xp - w0, ya, z0 - d0], [xp + w0, ya, z0 - d0], [xp + w0, ya, z0]];
          var Bt = [[xp - w1, yb, z0], [xp - w1, yb, z0 - d1], [xp + w1, yb, z0 - d1], [xp + w1, yb, z0]], cen = [xp, (ya + yb) / 2, z0 - 0.6];
          function face(P0, P1, P2, P3, col) {
            var fc = [(P0[0] + P1[0] + P2[0] + P3[0]) / 4, (P0[1] + P1[1] + P2[1] + P3[1]) / 4, (P0[2] + P1[2] + P2[2] + P3[2]) / 4];
            concB.addQuad(P0, P1, P2, P3, col, [fc[0] + (fc[0] - cen[0]) * 3, fc[1] + (fc[1] - cen[1]) * 3, fc[2] + (fc[2] - cen[2]) * 3], { vary: 0 });
          }
          face(A[1], A[2], Bt[2], Bt[1], 0xb6b4ac); face(A[0], A[1], Bt[1], Bt[0], 0xa8a69e); face(A[3], A[2], Bt[2], Bt[3], 0xa8a69e); face(A[0], A[1], A[2], A[3], 0x9a9890);
        });
      })();
      // 계단식 단 + 나무 일자형 긴 의자(사진 6) — 2026-11-23 개정: 단 3(줄 간격 1.9m), 단마다 가운데 통로(LAISLE)를 두고 두 덩이(왼쪽 'D' 14석 · 오른쪽 'C' 12석),
      // 맨 뒤 단은 뒷벽까지 빈 바닥. 오른쪽 덩이 끝 너머 첫 단에 오르간. 의자는 renderSeats 가 아니라 여기서 단 높이에 짓는다(단마다 높이가 다르다)
      var CG = layout.seatGroups[4], DG = layout.seatGroups[5];
      function bench(x0, x1, zs, y) {
        var cx = (x0 + x1) / 2, len = x1 - x0;
        woodB.add(Geo.box(), 0xb07840, { x: cx, y: y + 0.41, z: zs, sx: len, sy: 0.05, sz: 0.42, flat: true, vary: 0.03 });
        woodB.add(Geo.box(), 0x9a6634, { x: cx, y: y + 0.5, z: zs + 0.24, sx: len, sy: 0.42, sz: 0.05, flat: true, vary: 0.03 });
        [x0, x1].forEach(function (xe) { woodB.add(Geo.box(), 0x8a5a2c, { x: xe, y: y, z: zs + 0.06, sx: 0.05, sy: 0.92, sz: 0.56, flat: true, vary: 0.03 }); });
      }
      TIER.forEach(function (t, ti) {
        if (ti === 0) return;
        var y = LT + t[2], zs = t[0] + 1.15;
        ctx.boxAABB({ x0: -HW, x1: HW, z0: t[0], z1: t[1], y0: LT, y1: y, color: 0x7a5a3e, mat: 'wood' });   // 단(한 덩이 — 가운데 통로도 같은 높이의 한 칸)
        woodB.addQuad([-HW, y + 0.002, t[0]], [HW, y + 0.002, t[0]], [HW, y + 0.002, t[0] + 0.04], [-HW, y + 0.002, t[0] + 0.04], 0x5a3e28, [0, y + 3, t[0]], { vary: 0 });   // 단 모서리 띠
        if (ti > NROW || ti - 1 >= DG.rows) return;
        bench(DG.origin.x + DG.dx * (DG.perRow - 1) - DG.pad[1] + 0.05, DG.origin.x + DG.pad[0] - 0.05, zs, y);   // 왼쪽 덩이('D')
        bench(CG.origin.x - CG.pad[0] + 0.05, CG.origin.x + CG.dx * (CG.perRow - 1) + CG.pad[1] - 0.05, zs, y);   // 오른쪽 덩이('C')
      });
      // 오르간 연주대(사진 6 앞 오른쪽, 일반 형태 — 특정 악기의 모양을 옮기지 않음): 나무 몸통 + 건반 3단 + 악보대 + 양옆 음전 판 + 발건반 + 의자. 건반은 통로 쪽(−x).
      // (2026-11-23) 맨 앞 오른쪽 모서리는 갤러리 입구라 첫 단 오른쪽 끝(오른쪽 덩이 너머)으로 옮겼다
      var ORG = { x0: 9.3, x1: HW - 0.05, z0: FRONT1 + 0.2, z1: FRONT1 + 1.5 };
      (function () {
        var y = LT + TSTEP, zc = (ORG.z0 + ORG.z1) / 2, c = 0x7e5030, cd = 0x5e3a22;
        ctx.box({ x: 10.55, y: y, z: zc, w: 0.8, h: 1.3, d: 1.3, color: c, mat: 'wood' });
        for (var k = 0; k < 3; k++) {
          var xk = 10.03 + 0.08 * k, yk = y + 0.74 + 0.11 * k;
          ctx.box({ x: xk, y: yk, z: zc, w: 0.26, h: 0.05, d: 1.0, color: cd, mat: 'wood' });
          ctx.box({ x: xk - 0.02, y: yk + 0.05, z: zc, w: 0.2, h: 0.012, d: 0.94, color: 0xf2eee4, mat: 'solid', vary: 0 });   // 흰 건반
          ctx.box({ x: xk + 0.06, y: yk + 0.062, z: zc, w: 0.07, h: 0.012, d: 0.92, color: 0x1e1a18, mat: 'solid', vary: 0 });  // 검은 건반 띠
        }
        ctx.box({ x: 10.24, y: y + 1.1, z: zc, w: 0.04, h: 0.36, d: 0.8, rz: 0.18, color: cd, mat: 'wood' });   // 악보대
        [-1, 1].forEach(function (sd) { ctx.box({ x: 10.1, y: y + 0.72, z: zc + sd * 0.57, w: 0.3, h: 0.56, d: 0.08, color: c, mat: 'wood' }); });
        ctx.box({ x: 9.82, y: y, z: zc, w: 0.5, h: 0.07, d: 1.0, color: 0x2a201a, mat: 'wood' });   // 발건반
        for (k = 0; k < 9; k++) ctx.box({ x: 9.82, y: y + 0.07, z: zc - 0.44 + 0.11 * k, w: 0.46, h: 0.02, d: 0.04, color: 0xd8d2c4, mat: 'solid', vary: 0 });
        ctx.box({ x: 9.55, y: y + 0.5, z: zc, w: 0.32, h: 0.05, d: 0.95, color: c, mat: 'wood' });   // 의자
        [-0.4, 0.4].forEach(function (dz) { ctx.box({ x: 9.55, y: y, z: zc + dz, w: 0.3, h: 0.5, d: 0.05, color: cd, mat: 'wood' }); });
      })();
      // (3차) 성가대석 아래 오른쪽 뒤 구석의 닫힌 방(예전 엔진의 우회)은 없앴다 — 실제처럼 성가대석 밑 전체가 트여 있다(사용자 사진 G2·G3)

      // ---------- 제단(y = SY) ----------
      // 제대: 흰 대리석 받침 + 앞뒤로 넉넉히 나온 윗판(사진 3), 제대포·촛대 2
      var AX = 0, AZ = -8.9;
      ctx.box({ x: AX, y: SY, z: AZ, w: 1.9, h: 0.9, d: 0.78, surf: 'marble_white', color: 0xeeece6 });
      ctx.box({ x: AX, y: SY + 0.9, z: AZ, w: 2.4, h: 0.12, d: 1.05, surf: 'marble_white', color: 0xf6f4ee });
      ctx.box({ x: AX, y: SY + 1.02, z: AZ, w: 1.9, h: 0.008, d: 0.7, color: 0xfaf6ec, mat: 'solid', vary: 0 });
      [-0.85, 0.85].forEach(function (x) {
        ctx.cyl({ x: AX + x, y: SY + 1.02, z: AZ - 0.3, r: 0.06, rTop: 0.04, h: 0.06, seg: 8, color: C.bronze, mat: 'metal' });
        ctx.cyl({ x: AX + x, y: SY + 1.08, z: AZ - 0.3, r: 0.032, h: 0.26, seg: 8, color: 0xfff6e0, mat: 'solid', flat: false });
        glow.add(Geo.ico(low ? 0 : 1), hdr(0xffc04a, 2.4), { x: AX + x, y: SY + 1.38, z: AZ - 0.3, sx: 0.016, sy: 0.04, sz: 0.016, flat: true, vary: 0 });
      });
      ctx.addCollider({ x0: AX - 1.2, x1: AX + 1.2, z0: AZ - 0.53, z1: AZ + 0.53 });
      ctx.aoDecal({ x0: AX - 0.95, x1: AX + 0.95, z0: AZ - 0.39, z1: AZ + 0.39, y: SY, pad: 0.3 });
      sacred.push({ k: 'altar', x: AX, z: AZ, w: 2.4, d: 1.05, ry: 0 });

      // 감실: 드럼 가운데(안쪽 두 기둥 사이), 회색 돌 기둥 위 무늬 없는 은빛 금속 상자. 성체등은 오른쪽 위 벽 받침(사진 1·5)
      var TZ = -13.4;
      (function () {
        var x = 0, z = TZ, y = SY;
        ctx.box({ x: x, y: y, z: z, w: 0.62, h: 1.05, d: 0.5, surf: 'marble_white', color: 0xa9a8a2 });
        ctx.box({ x: x, y: y + 1.05, z: z, w: 0.74, h: 0.06, d: 0.6, surf: 'marble_white', color: 0xb8b7b1 });
        ctx.box({ x: x, y: y + 1.11, z: z, w: 0.52, h: 0.46, d: 0.4, color: 0xd6ccb0, mat: 'metal' });
        ctx.box({ x: x, y: y + 1.17, z: z + 0.2, w: 0.4, h: 0.34, d: 0.012, color: 0xbfb08a, mat: 'metal' });   // 문 테(민무늬)
        ctx.box({ x: x, y: y + 1.57, z: z, w: 0.58, h: 0.04, d: 0.46, color: 0xc4b48c, mat: 'metal' });
        ctx.addCollider({ x: x, z: z, r: 0.45 });
        ctx.aoDecal({ x0: x - 0.32, x1: x + 0.32, z0: z - 0.26, z1: z + 0.26, y: y, pad: 0.25 });
        sacred.push({ k: 'tabernacle', x: x, z: z, w: 0.74, d: 0.6, ry: 0 });
        // 성체등: 둘레 공간 뒷벽(가운데에서 오른쪽으로 조금) 받침 위 붉은 등. 전례(성목요일 뒤)에는 liturgy.js 가 덮는다(tabLamps)
        var f = 9 * D2R, lp = pol(0, ZF, RB - 0.16, f), wp = pol(0, ZF, RB - 0.05, f), ly = SY + 2.35;
        ctx.box({ x: wp[0], y: ly - 0.32, z: wp[1], w: 0.05, h: 0.36, d: 0.04, ry: -f, color: C.bronze, mat: 'metal' });
        ctx.box({ x: lp[0], y: ly - 0.05, z: lp[1], w: 0.22, h: 0.05, d: 0.26, ry: -f, color: C.bronze, mat: 'metal' });
        ctx.cyl({ x: lp[0], y: ly, z: lp[1], r: 0.07, rTop: 0.085, h: 0.24, seg: 10, color: 0x8a1a12, mat: 'gloss' });
        glow.add(Geo.sph(8, 6), hdr(0xff3a2a, 2.6), { x: lp[0], y: ly + 0.13, z: lp[1], sx: 0.06, sy: 0.09, sz: 0.06, flat: false, vary: 0 });
        (ctx._.tabLamps || (ctx._.tabLamps = [])).push({ x: lp[0], y: ly, z: lp[1] });
      })();

      // 그리스도 상 자리 표시(드럼 가운데 판 높이): 두 팔을 벌린 단순한 청동빛 인물 + 가는 후광 고리, 십자가 없음.
      // 실제 작품(작가 미확인)의 얼굴·옷·자세 세부를 옮기지 않은 일반 형태다 — 허락받은 3D 모델이 생기면 이 구역만 바꾼다(yeouido.md §4).
      var FIG = { y: 5.4, z: ZF - RD + 0.16, h: 2.2 };
      (function () {
        var x = 0, y = FIG.y, z = FIG.z, c = C.figure, K = FIG.h / 1.85;   // 아래 치수는 키 1.85m 기준, K 로 늘린다
        ctx.cyl({ x: x, y: y, z: z, r: 0.085 * K, rTop: 0.14 * K, h: 0.86 * K, seg: 10, color: c, mat: 'metal', flat: false });           // 다리·옷자락(가늘게 모임)
        ctx.cyl({ x: x, y: y + 0.86 * K, z: z, r: 0.14 * K, rTop: 0.18 * K, h: 0.58 * K, seg: 10, color: c, mat: 'metal', flat: false });  // 몸통
        ctx.sphere({ x: x, y: y + 1.45 * K, z: z, sx: 0.21 * K, sy: 0.08 * K, sz: 0.11 * K, color: c, mat: 'metal', w: 10, h: 6 });           // 어깨
        ctx.cyl({ x: x, y: y + 1.48 * K, z: z, r: 0.045 * K, h: 0.1 * K, seg: 8, color: c, mat: 'metal', flat: false });
        ctx.sphere({ x: x, y: y + 1.66 * K, z: z + 0.01, sx: 0.095 * K, sy: 0.115 * K, sz: 0.1 * K, color: c, mat: 'metal', w: 10, h: 8 });  // 머리
        [-1, 1].forEach(function (s) {   // 두 팔: 어깨에서 조금 위로 벌린다
          var p0 = [x + s * 0.15 * K, y + 1.44 * K, z], p1 = [x + s * 0.78 * K, y + 1.86 * K, z + 0.03];
          ctx.beam3(p0, p1, 0.085 * K, 0.08 * K, c, metal);
          ctx.sphere({ x: p1[0] + s * 0.03 * K, y: p1[1] + 0.015 * K, z: p1[2], r: 0.042 * K, color: c, mat: 'metal', w: 8, h: 6 });
        });
        metal.add(new T.TorusGeometry(1, 0.06, 4, low ? 20 : 32), 0x9a804e, { x: x, y: y + 1.68 * K, z: z - 0.07, sx: 0.21 * K, sy: 0.21 * K, sz: 0.2, flat: false, vary: 0 });   // 후광 고리
      })();

      // 독서대: 제대 왼쪽 앞, 흰 대리석 상자 + 기울어진 윗판(무늬 없음). 앞면에 전례 색 천이 걸린다(liturgy.js 'fall')
      var AMB = { x: -2.75, z: -8.15 };
      (function () {
        var x = AMB.x, z = AMB.z, y = SY;
        ctx.box({ x: x, y: y, z: z, w: 0.78, h: 1.08, d: 0.5, surf: 'marble_white', color: 0xf0eee8 });
        ctx.box({ x: x, y: y + 1.08, z: z - 0.01, w: 0.82, h: 0.06, d: 0.56, rx: -0.2, surf: 'marble_white', color: 0xf4f2ec });
        ctx.addCollider({ x: x, z: z, r: 0.48 });
        ctx.aoDecal({ x0: x - 0.39, x1: x + 0.39, z0: z - 0.25, z1: z + 0.25, y: y, pad: 0.22 });
      })();
      // 해설대: 오른쪽, 밝은 나무(받침판 + 두 기둥 + 기운 판)
      (function () {
        var x = 2.8, z = -8.05, y = SY, c = C.light;
        ctx.box({ x: x, y: y, z: z, w: 0.56, h: 0.04, d: 0.46, color: c, mat: 'wood' });
        [-0.07, 0.07].forEach(function (dx) { ctx.box({ x: x + dx, y: y + 0.04, z: z, w: 0.05, h: 1.0, d: 0.16, color: c, mat: 'wood' }); });
        ctx.box({ x: x, y: y + 1.02, z: z, w: 0.58, h: 0.035, d: 0.44, rx: -0.32, color: c, mat: 'wood' });
        ctx.box({ x: x, y: y + 0.98, z: z + 0.2, w: 0.58, h: 0.05, d: 0.03, color: c, mat: 'wood' });
        ctx.addCollider({ x: x, z: z, r: 0.35 });
      })();
      // 사제석·보조석(제대 뒤 양옆, 낮은 나무 상자 의자 + 등판) · 제구대(나무 장 2)
      [-1, 1].forEach(function (s) {
        var x = s * 2.05, z = -11.25, y = SY, c = C.oak;
        ctx.box({ x: x, y: y, z: z, w: 0.62, h: 0.44, d: 0.52, color: c, mat: 'wood' });
        ctx.box({ x: x, y: y + 0.44, z: z - 0.23, w: 0.62, h: s > 0 ? 0.62 : 0.4, d: 0.06, color: c, mat: 'wood' });
        ctx.box({ x: x, y: y + 0.44, z: z + 0.02, w: 0.54, h: 0.03, d: 0.42, color: 0x9c3f2e, mat: 'solid' });
        ctx.addCollider({ x: x, z: z, r: 0.38 });
        var cx2 = s * 3.25, cz2 = -10.9;
        ctx.box({ x: cx2, y: y, z: cz2, w: 0.86, h: 0.76, d: 0.44, color: 0xc08a56, mat: 'wood' });
        [-0.21, 0.21].forEach(function (dx) { ctx.box({ x: cx2 + dx, y: y + 0.08, z: cz2 + 0.222, w: 0.36, h: 0.6, d: 0.008, color: 0x9c6c40, mat: 'wood', vary: 0 }); });
        ctx.aoDecal({ x0: cx2 - 0.43, x1: cx2 + 0.43, z0: cz2 - 0.22, z1: cz2 + 0.22, y: y, pad: 0.18 });
      });
      // 오른쪽 앞 나무 받침 + 테 두른 민무늬 판(사진 1 의 성화·성 요셉상 자리 표시 — 그림·조각은 싣지 않는다)
      (function () {
        var x = 4.45, z = -7.75, y = SY;
        ctx.box({ x: x, y: y, z: z, w: 0.5, h: 0.92, d: 0.42, color: 0xb98450, mat: 'wood' });
        ctx.box({ x: x, y: y + 0.92, z: z, w: 0.54, h: 0.04, d: 0.46, color: 0xa87444, mat: 'wood' });
        ctx.box({ x: x, y: y + 0.96, z: z - 0.04, w: 0.44, h: 0.56, d: 0.04, rx: -0.12, color: 0xb8954a, mat: 'metal' });
        ctx.box({ x: x, y: y + 1.0, z: z - 0.015, w: 0.34, h: 0.46, d: 0.03, rx: -0.12, color: 0x5a4632, mat: 'solid' });
        ctx.addCollider({ x: x, z: z, r: 0.32 });
      })();
      // 둥근 샹들리에(코로나): 드럼 가운데 공중, 납작한 쇠 고리 + 흰 둥근 등 30 + 줄 3
      (function () {
        var cx = 0, cy = 8.8, czz = ZF - 0.4, r = 2.3;
        metal.add(new T.TorusGeometry(1, 0.03, 4, low ? 36 : 64), C.iron, { x: cx, y: cy, z: czz, rx: PI / 2, sx: r, sy: r, sz: 1.6, flat: false, vary: 0 });
        var NL = low ? 18 : 30;
        for (var q = 0; q < NL; q++) {
          var a = 2 * PI * q / NL;
          glow.add(Geo.sph(6, 4), hdr(0xfff3dc, 2.0), { x: cx + r * cos(a), y: cy - 0.02, z: czz + r * sin(a), sx: 0.1, sy: 0.1, sz: 0.1, flat: false, vary: 0 });
        }
        for (q = 0; q < 3; q++) { var b = PI / 2 + 2 * PI / 3 * q, wx = cx + r * cos(b), wz = czz + r * sin(b); ctx.beam3([wx, cy, wz], [wx * 0.6, DT, czz + (wz - czz) * 0.6], 0.008, 0.008, C.iron, metal); }
      })();

      // ---------- 문(짙은 붉은 갈색 나무, 사진 5): 가운데 정문은 로비 쪽으로 100° 열어 둔다(걸어 나간다, 당고개와 같은 방식).
      //            왼쪽 외문·성가대석 밑 방 문은 닫힘(벽 면에 붙인 나무 판). 오른쪽 옛 외문 자리는 로비의 어두운 문(아래층 계단)이 되었다 ----------
      function doorAt(x0, x1, hgt, zf, sd, yb) {   // 닫힌 문: 벽 면 zf 에 붙인다. sd = 문이 보는 쪽(−1: −z, +1: +z), yb = 문 밑 바닥 높이(1층 로비)
        var w = x1 - x0; yb = yb || 0;
        function bx(a, b, y0, y1, d0, d1, col) { var za = zf + sd * d0, zb = zf + sd * d1; ctx.boxAABB({ x0: a, x1: b, z0: min(za, zb), z1: max(za, zb), y0: y0 + yb, y1: y1 + yb, color: col, mat: 'wood' }); }
        bx(x0 - 0.12, x1 + 0.12, 0, hgt + 0.12, 0, 0.04, C.doorD);   // 문틀
        bx(x0, x1, 0.02, hgt, 0.04, 0.07, C.door);
        var leaves = w > 1.4 ? 2 : 1;
        for (var q = 0; q < leaves; q++) {
          var lx0 = x0 + w * q / leaves, lx1 = x0 + w * (q + 1) / leaves;
          bx(lx0 + 0.12, lx1 - 0.12, 0.3, 1.0, 0.07, 0.085, C.doorD);
          bx(lx0 + 0.12, lx1 - 0.12, 1.2, hgt - 0.25, 0.07, 0.085, C.doorD);
          ctx.cyl({ x: q === 0 && leaves === 2 ? lx1 - 0.1 : (leaves === 1 ? lx1 - 0.12 : lx0 + 0.1), y: yb + 0.9, z: zf + sd * 0.11, r: 0.018, h: 0.4, seg: 8, color: 0xb9b3a6, mat: 'metal' });
        }
        if (leaves === 2) bx((x0 + x1) / 2 - 0.02, (x0 + x1) / 2 + 0.02, 0.02, hgt, 0.04, 0.09, C.doorD);
      }
      doorAt(-6.8, -5.4, 2.6, ZB, -1); doorAt(-6.8, -5.4, 2.6, ZW, 1);
      doorAt(DARK.x0, DARK.x1, DARK.h, ZB, -1);   // 로비 쪽 어두운 문(아래층 계단)의 성당 쪽: 닫힌 문(성가대석 밑이 트여 이제 보인다)
      (function () {   // 정문: 문틀(양면 + 벽 두께 안) + 로비 쪽으로 연 문짝 둘
        var X = 1.4, HD = 2.9;
        [[ZB, -1], [ZW, 1]].forEach(function (f) {
          var za = f[0], zb = f[0] + f[1] * 0.05, z0 = min(za, zb), z1 = max(za, zb);
          ctx.boxAABB({ x0: -X - 0.14, x1: -X, z0: z0, z1: z1, y0: 0, y1: HD + 0.14, color: C.doorD, mat: 'wood' });
          ctx.boxAABB({ x0: X, x1: X + 0.14, z0: z0, z1: z1, y0: 0, y1: HD + 0.14, color: C.doorD, mat: 'wood' });
          ctx.boxAABB({ x0: -X - 0.14, x1: X + 0.14, z0: z0, z1: z1, y0: HD, y1: HD + 0.14, color: C.doorD, mat: 'wood' });
        });
        ctx.boxAABB({ x0: -X, x1: -X + 0.03, z0: ZB, z1: ZW, y0: 0, y1: HD, color: C.doorD, mat: 'wood' });
        ctx.boxAABB({ x0: X - 0.03, x1: X, z0: ZB, z1: ZW, y0: 0, y1: HD, color: C.doorD, mat: 'wood' });
        ctx.boxAABB({ x0: -X, x1: X, z0: ZB, z1: ZW, y0: HD - 0.03, y1: HD, color: C.doorD, mat: 'wood' });
        marb.addQuad([-X, 0.004, ZB], [X, 0.004, ZB], [X, 0.004, ZW], [-X, 0.004, ZW], 0xdcdcd8, [0, 5, ZB + 0.25], { vary: 0 }, [-X / 1.8, ZB / 1.8, X / 1.8, ZB / 1.8, X / 1.8, ZW / 1.8, -X / 1.8, ZW / 1.8]);   // 문턱(대리석)
        [-1, 1].forEach(function (s) {
          var th = 100 * D2R, dx = -s * cos(th), dz = sin(th), L = X - 0.03, hx = s * (X - 0.03), hz = ZW + 0.05, ry = Math.atan2(-dz, dx);
          var mx = hx + dx * L / 2, mz = hz + dz * L / 2, nx = -dz, nz = dx;
          ctx.box({ x: mx, y: 0.02, z: mz, w: L, h: HD - 0.05, d: 0.06, ry: ry, color: C.door, mat: 'wood' });
          [[0.3, 0.7], [1.2, HD - 1.5]].forEach(function (pn) { [-1, 1].forEach(function (sd2) {
            ctx.box({ x: mx + nx * sd2 * 0.034, y: pn[0], z: mz + nz * sd2 * 0.034, w: L - 0.26, h: pn[1], d: 0.012, ry: ry, color: C.doorD, mat: 'wood' });
          }); });
          ctx.addCollider({ x0: min(hx, hx + dx * L) - 0.08, x1: max(hx, hx + dx * L) + 0.08, z0: hz - 0.05, z1: hz + dz * L + 0.06, y0: R2F.y0, y1: R2F.y1 });   // 2층 로비 쪽으로 연 문짝(밑은 1층 로비)
        });
      })();
      // 성수대(문 양옆, 일반 형태) — 성가대석 밑이라 충돌체는 2층(성당) 높이에서만
      ctx.setColliderRange(R2F);
      [-2.4, 2.4].forEach(function (x) {
        var z = ZB - 0.55;
        ctx.cyl({ x: x, y: 0, z: z, r: 0.14, rTop: 0.1, h: 0.86, seg: low ? 8 : 12, surf: 'marble_white', color: 0xd8d6d0, flat: false });
        ctx.cyl({ x: x, y: 0.86, z: z, r: 0.2, rTop: 0.28, h: 0.14, seg: low ? 10 : 16, surf: 'marble_white', color: 0xe4e2dc, flat: false });
        glow.add(Geo.cyl(12, 1), 0x8fb8cc, { x: x, y: 0.995, z: z, sx: 0.23, sy: 0.012, sz: 0.23, flat: true, vary: 0 });
        ctx.addCollider({ x: x, z: z, r: 0.3 });
        ctx.aoDecalCircle({ x: x, z: z, r: 0.3, y: 0 });
      });
      ctx.setColliderRange(null);

      // =====================================================================
      // 스포트 샹들리에(사진 6~11): 검은 쇠 고리(지름 1.4m) + 아래로 단 검은 원통 등 8(발광 원판) + 바큇살 + 경사 천장까지 줄대. 신랑 6곳
      // =====================================================================
      (function () {
        CHAND.forEach(function (p) {
          var x = p[0], z = p[1], y = 6.2, r = 0.7, top = ceilY(x, z);
          metal.add(new T.TorusGeometry(1, 0.035, 4, low ? 16 : 24), C.iron, { x: x, y: y, z: z, rx: PI / 2, sx: r, sy: r, sz: 1, flat: false, vary: 0 });
          ctx.beam3([x, y, z], [x, top, z], 0.02, 0.02, C.iron, metal);
          for (var q = 0; q < 7; q++) {
            var a = 2 * PI * q / 7, lx = x + r * cos(a), lz = z + r * sin(a);
            if (q % 2 === 0) ctx.beam3([x, y, z], [lx, y, lz], 0.014, 0.014, C.iron, metal);
            metal.add(Geo.cyl(low ? 6 : 8, 1), 0x1c1a18, { x: lx, y: y - 0.22, z: lz, sx: 0.07, sy: 0.22, sz: 0.07, flat: false, vary: 0 });
            glow.add(Geo.cyl(low ? 6 : 10, 1), hdr(0xfff1d8, 2.6), { x: lx, y: y - 0.226, z: lz, sx: 0.055, sy: 0.006, sz: 0.055, flat: true, vary: 0 });
          }
        });
      })();

      // =====================================================================
      // 로비(성당 문 밖, 사용자 사진 5장 — yeouido.md §2.5) + 타원 계단 홀 + 곡선 계단 → 계단참 → 성가대석
      //   치수는 사진 비례(문 높이 약 2.4~2.9m, 사람 키)에서 잡은 [추정]. 바깥(유리 정면 너머)은 밝은 빛만, 짓지 않는다.
      // =====================================================================
      function SHp(rho, th) { return [SH.cx + rho * SH.a * cos(th), SH.cz + rho * SH.b * sin(th)]; }
      var TH0 = STR.th0 * D2R, TH1 = STR.th1 * D2R, NSMP = 720, sTab = [0];
      for (i = 1; i <= NSMP; i++) { var pa0 = SHp(0.85, TH0 + (TH1 - TH0) * (i - 1) / NSMP), pb0 = SHp(0.85, TH0 + (TH1 - TH0) * i / NSMP); sTab.push(sTab[i - 1] + Math.hypot(pb0[0] - pa0[0], pb0[1] - pa0[1])); }
      var UPT = LT;   // 위 계단 꼭대기 = 계단참 = 갤러리 = 성가대석 맨 앞 띠 높이(2026-11-23: 예전 맨 뒤 단 높이 LTOP)
      var LRUN = sTab[NSMP], NST = STR.n, RIS = UPT / NST, TRD = LRUN / NST;
      function sOfTh(th) { var f = (TH0 - th) / (TH0 - TH1) * NSMP; if (f <= 0) return 0; if (f >= NSMP) return LRUN; var k0 = f | 0; return sTab[k0] + (sTab[k0 + 1] - sTab[k0]) * (f - k0); }
      function thOfS(sv) {
        if (sv <= 0) return TH0; if (sv >= LRUN) return TH1;
        var lo = 0, hi = NSMP;
        while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (sTab[mid] <= sv) lo = mid; else hi = mid; }
        return TH0 + (TH1 - TH0) * (lo + (sv - sTab[lo]) / (sTab[lo + 1] - sTab[lo])) / NSMP;
      }
      function stepY(sv) { return sv <= 1e-9 ? 0 : RIS * min(NST, Math.ceil(sv / TRD - 1e-9)); }
      function slopeY(sv) { return UPT * max(0, min(1, sv / LRUN)); }
      function at3(p, y) { return [p[0], y, p[1]]; }
      // 로비 바닥: 제단 대리석 묶음(yd_mtile)에 회색 정점 색 + 0.9m 타일 UV(그림 한 장 = 1.8m) / 회색 돌 디딤: 같은 묶음, 타일 한 칸 안쪽 UV(줄눈 없음)
      var LFC = 0xd2d6da;
      function mfl(A, B, Cc, D, hint) { marb.addQuad(A, B, Cc, D, LFC, hint, { vary: 0 }, [A[0] / 1.8, A[2] / 1.8, B[0] / 1.8, B[2] / 1.8, Cc[0] / 1.8, Cc[2] / 1.8, D[0] / 1.8, D[2] / 1.8]); }
      function stone(A, B, Cc, D, col, hint) { marb.addQuad(A, B, Cc, D, col, hint, { vary: 0.02 }, [0.06, 0.06, 0.44, 0.06, 0.44, 0.2, 0.06, 0.2]); }

      // ---------- (3차) 1층 → 2층 곡선 대리석 계단: 같은 타원 띠(RI…1.0) 위, 2층 → 3층 계단 바로 아래에 겹친다 ----------
      // 두 계단 모두 TH0(78°, 안쪽 끝 벽 쪽)에서 TH1(−55°, 계단참·옆 갤러리 쪽)으로 오른다: 위 계단은 2층(0) → 계단참(UPT = LT), 아래 계단은 1층(F1) → 2층(0).
      // 같은 각에서 두 계단의 높이 차는 3.75…4.2m 라 아래 계단을 걷는 사람 머리 위에 위 계단 밑면이 있다(계단 밑을 걷는다). 아래 계단 꼭대기 = 계단참 밑 2층 바닥.
      var NDN = DN.n, RISd = -F1 / NDN, TRDd = LRUN / NDN;
      function stepDn(sv) { return sv <= 1e-9 ? F1 : F1 + RISd * min(NDN, Math.ceil(sv / TRDd - 1e-9)); }
      function slopeDn(sv) { return F1 * (1 - max(0, min(1, sv / LRUN))); }
      // 아래 계단의 낮은 쪽(1층 바닥 위 DN.usw 보다 낮은 밑)은 흰 벽으로 막고(머리가 닿는다), 높은 쪽 밑은 1층에서 걸어 들어간다. 그 경계(디딤 경계에 맞춤)
      var KSW = Math.ceil(DN.usw / RISd), SSW = TRDd * (KSW - 1), THSW = thOfS(SSW);
      function inShaft(th) { return th <= TH0 + 1e-9 && th >= TH1 - 1e-9; }   // 두 계단이 지나는 띠(2층 바닥이 없다)
      var RI = STR.rIn, SOFF = 0.22, DR = 0.026;
      // 계단 홀 바닥 부채꼴(우물 둘레 → 바깥 경계). 띠(계단) 쪽은 안쪽 가장자리(RI)까지만 — 2층 바닥·1층 천장(2층 바닥 판 밑)·1층 바닥이 같이 쓴다
      function wellPt(k, th) { return [SH.cx + WELL.rx * k * cos(th), SH.cz + WELL.rz * k * sin(th)]; }
      function hallEdge(th) {   // 계단 홀 바닥 바깥 경계: +x 쪽은 타원 벽, −x 쪽은 로비와 만나는 네모(x 5, z ZW / LOB.z1)
        var dx = SH.a * cos(th), dz = SH.b * sin(th);
        if (dx >= 0) return SHp(1.0, th);
        var t = (5.0 - SH.cx) / dx;
        if (dz > 1e-9) t = min(t, (LOB.z1 - SH.cz) / dz); else if (dz < -1e-9) t = min(t, (ZW - SH.cz) / dz);
        return [SH.cx + dx * t, SH.cz + dz * t];
      }
      var WN = low ? 32 : 56, FANA = [];   // 부채꼴 각(띠 경계 TH0·TH1 을 꼭 넣는다)
      (function () {
        for (var q = 0; q < WN; q++) FANA.push(-PI + 2 * PI * q / WN);
        [TH0, TH1].forEach(function (a) { if (FANA.every(function (b) { return Math.abs(b - a) > 1e-4; })) FANA.push(a); });
        FANA.sort(function (a, b) { return a - b; }); FANA.push(FANA[0] + 2 * PI);
      })();
      function wrapPI(a) { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; }
      // kind 'floor2'(2층 바닥: 우물 → 경계, 띠 빼고) · 'ceil1'(1층 천장 = 2층 판 밑, 같은 모양 아래를 봄) · 'floor1'(1층 바닥: 가운데 → 경계 전부)
      function hallFan(y, kind) {
        for (var q = 0; q + 1 < FANA.length; q++) {
          var ta = FANA[q], tb = FANA[q + 1], shaft = kind !== 'floor1' && inShaft(wrapPI((ta + tb) / 2));
          var e0 = shaft ? SHp(RI, ta) : hallEdge(ta), e1 = shaft ? SHp(RI, tb) : hallEdge(tb);
          if (kind === 'floor1') {
            marb.addTris([SH.cx, y, SH.cz, e1[0], y, e1[1], e0[0], y, e0[1]], LFC, [SH.cx, y + 5, SH.cz], { vary: 0, uvs: [SH.cx / 1.8, SH.cz / 1.8, e1[0] / 1.8, e1[1] / 1.8, e0[0] / 1.8, e0[1] / 1.8] });
            continue;
          }
          var w0 = wellPt(1.07, ta), w1 = wellPt(1.07, tb);
          if (kind === 'floor2') mfl(at3(w0, y), at3(w1, y), at3(e1, y), at3(e0, y), [SH.cx, y + 5, SH.cz]);
          else whiteB.addQuad(at3(w0, y), at3(e0, y), at3(e1, y), at3(w1, y), 0xf6f5f2, [SH.cx, y - 5, SH.cz], { vary: 0 });
        }
      }

      // ---------- 바닥: 2층 로비(옅은 회색 대리석) + 계단 홀(우물 둘레) · 2층 바닥 판 밑(1층 천장) · 1층 로비 바닥 ----------
      mfl([LOB.x0, 0, ZW], [5.0, 0, ZW], [5.0, 0, LOB.z1], [LOB.x0, 0, LOB.z1], [0, 5, 26]);
      hallFan(0, 'floor2');
      whiteB.addQuad([LOB.x0, -SLAB, ZW], [LOB.x0, -SLAB, LOB.z1], [5.0, -SLAB, LOB.z1], [5.0, -SLAB, ZW], 0xf6f5f2, [0, -5, 26], { vary: 0 });
      hallFan(-SLAB, 'ceil1');
      mfl([LOB.x0, F1, ZW], [5.0, F1, ZW], [5.0, F1, LOB.z1], [LOB.x0, F1, LOB.z1], [0, F1 + 5, 26]);
      hallFan(F1, 'floor1');
      // 2층 판의 띠 쪽 끝 면(TH0·TH1 지름 방향, −SLAB…0): 1층·계단에서 보인다
      [[TH0, 1], [TH1, -1]].forEach(function (e) {
        var p0 = SHp(RI, e[0]), p1 = SHp(1.0, e[0]), hn = SHp(0.85, e[0] - e[1] * 0.3);
        whiteB.addQuad(at3(p0, -SLAB), at3(p1, -SLAB), at3(p1, 0), at3(p0, 0), 0xf0efeb, [hn[0], -0.2, hn[1]], { vary: 0 });
      });

      // ---------- 타원 우물(사진 1·3·5, 2층 바닥에 뚫린 구멍 — 1층 로비가 내려다보인다): 흰 난간 벽 1.0m(아래 검은 띠) + 놋쇠 손잡이, 판 끝 면 ----------
      var BRASS = 0xc9a04e;
      for (i = 0; i < WN; i++) {
        var a0 = 2 * PI * i / WN, a1 = 2 * PI * (i + 1) / WN, am = (a0 + a1) / 2, hm = wellPt(2.5, am);
        var p0 = wellPt(1.0, a0), p1 = wellPt(1.0, a1), q0 = wellPt(1.07, a0), q1 = wellPt(1.07, a1), r0 = wellPt(1.035, a0);
        whiteB.addQuad(at3(q0, 0.1), at3(q1, 0.1), at3(q1, 1.0), at3(q0, 1.0), 0xffffff, [hm[0], 0.5, hm[1]], { vary: 0 });
        solid.addQuad(at3(q0, 0), at3(q1, 0), at3(q1, 0.1), at3(q0, 0.1), 0x22201e, [hm[0], 0.05, hm[1]], { vary: 0 });
        whiteB.addQuad(at3(p0, -SLAB), at3(p1, -SLAB), at3(p1, 1.0), at3(p0, 1.0), 0xffffff, [SH.cx, 0, SH.cz], { vary: 0 });
        whiteB.addQuad(at3(p0, 1.0), at3(p1, 1.0), at3(q1, 1.0), at3(q0, 1.0), 0xffffff, [SH.cx, 5, SH.cz], { vary: 0 });
        whiteB.addQuad(at3(p0, -SLAB), at3(q0, -SLAB), at3(q1, -SLAB), at3(p1, -SLAB), 0xf6f5f2, [SH.cx, -5, SH.cz], { vary: 0 });
        if (i % 2 === 0) { var r2 = wellPt(1.035, 2 * PI * (i + 2) / WN); ctx.beam3(at3(r0, 1.14), at3(r2, 1.14), 0.045, 0.045, BRASS, ctx.gloss); }
        if (i % 4 === 0) ctx.beam3(at3(r0, 1.0), at3(r0, 1.12), 0.025, 0.025, BRASS, ctx.gloss);
      }

      // ---------- 두 곡선 계단(사진 1·4·5): 바깥 타원 벽을 따라. 위(2층 → 3층) 40단 회색 돌 · 아래(1층 → 2층) 28단 흰 대리석. 밑면은 흰 계단식 ----------
      function flight(n, run, yOf, col, colR) {
        for (var k = 1; k <= n; k++) {
          var tA = thOfS((k - 1) * run), tB = thOfS(k * run), tM = (tA + tB) / 2, yt = yOf(k), yb = max(F1, yt - SOFF), yp = yOf(k - 1);
          var I0 = SHp(RI, tA), O0 = SHp(1.0, tA), I1 = SHp(RI, tB), O1 = SHp(1.0, tB), IM = SHp(RI, tM), OM = SHp(1.0, tM), back = SHp(0.85, tA + 0.25), cIn = SHp(0.2, tM);
          [[I0, O0, OM, IM], [IM, OM, O1, I1]].forEach(function (Q) {
            stone(at3(Q[0], yt), at3(Q[1], yt), at3(Q[2], yt), at3(Q[3], yt), col, [Q[0][0], yt + 3, Q[0][1]]);
            if (yb > F1 + 1e-6) whiteB.addQuad(at3(Q[0], yb), at3(Q[1], yb), at3(Q[2], yb), at3(Q[3], yb), 0xffffff, [Q[0][0], yb - 3, Q[0][1]], { vary: 0 });
          });
          var yr = max(F1, min(yb, yp));
          stone(at3(I0, yr), at3(O0, yr), at3(O0, yt), at3(I0, yt), colR, [back[0], yt - 0.1, back[1]]);   // 챌판(앞면)
          [[I0, IM], [IM, I1]].forEach(function (E) { whiteB.addQuad(at3(E[0], yb), at3(E[1], yb), at3(E[1], yt), at3(E[0], yt), 0xffffff, [cIn[0], yt, cIn[1]], { vary: 0 }); });
        }
      }
      flight(NST, TRD, function (k) { return k * RIS; }, 0xc4c3be, 0xb2b1ac);
      flight(NDN, TRDd, function (k) { return F1 + k * RISd; }, 0xeceae4, 0xdedcd6);
      // 안쪽 벽(난간, 띠 안쪽 가장자리 RI): 위 계단 난간(디딤 위 1.0m, 밑은 디딤 밑면) · 2층 바닥 끝 난간(−SLAB…1.0, 띠 쪽) · 아래 계단 난간
      // (낮은 쪽은 1층 바닥까지 막힌 흰 벽 — 그 밑은 머리가 닿는다). 셋이 겹치는 곳은 두께를 조금씩 달리해 겹친 면이 깜빡이지 않게 한다.
      // + 놋쇠 손잡이(짧은 기둥 위). 예전의 '계단 밑 낮은 턱(0.45m)'은 없앴다(그 밑은 이제 1층 → 2층 계단이다)
      (function () {
        var NR = low ? 28 : 56;
        function band(r0, r1, sv0, sv1, y0f, y1f, rail) {
          var prev = null, nr = Math.max(4, Math.round(NR * (sv1 - sv0) / LRUN));
          for (var q = 0; q <= nr; q++) {
            var sv = sv0 + (sv1 - sv0) * q / nr, th = thOfS(sv), cur = { pi: SHp(r1, th), po: SHp(r0, th), y0: y0f(sv), y1: y1f(sv), th: th };
            if (prev) {
              var hin = SHp(0.2, (th + prev.th) / 2), hout = SHp(0.95, (th + prev.th) / 2);
              whiteB.addQuad(at3(prev.po, prev.y0), at3(cur.po, cur.y0), at3(cur.po, cur.y1), at3(prev.po, prev.y1), 0xffffff, [hin[0], (cur.y0 + cur.y1) / 2, hin[1]], { vary: 0 });
              whiteB.addQuad(at3(prev.pi, prev.y0), at3(cur.pi, cur.y0), at3(cur.pi, cur.y1), at3(prev.pi, prev.y1), 0xffffff, [hout[0], (cur.y0 + cur.y1) / 2, hout[1]], { vary: 0 });
              whiteB.addQuad(at3(prev.po, prev.y1), at3(cur.po, cur.y1), at3(cur.pi, cur.y1), at3(prev.pi, prev.y1), 0xffffff, [hin[0], cur.y1 + 3, hin[1]], { vary: 0 });
              whiteB.addQuad(at3(prev.po, prev.y0), at3(prev.pi, prev.y0), at3(cur.pi, cur.y0), at3(cur.po, cur.y0), 0xf0efeb, [hin[0], cur.y0 - 3, hin[1]], { vary: 0 });
              if (rail) { var ra = SHp((r0 + r1) / 2, prev.th), rb = SHp((r0 + r1) / 2, th); ctx.beam3(at3(ra, prev.y1 + 0.13), at3(rb, cur.y1 + 0.13), 0.045, 0.045, BRASS, ctx.gloss); }
            }
            if (rail && q % 3 === 0) { var rp = SHp((r0 + r1) / 2, th); ctx.beam3(at3(rp, cur.y1), at3(rp, cur.y1 + 0.12), 0.025, 0.025, BRASS, ctx.gloss); }
            prev = cur;
          }
          [[sv0, 1], [sv1, -1]].forEach(function (e) {   // 양 끝 마구리
            var th = thOfS(e[0]), a = SHp(r0, th), b = SHp(r1, th), hh = SHp((r0 + r1) / 2, th + e[1] * 0.3);
            whiteB.addQuad(at3(a, y0f(e[0])), at3(b, y0f(e[0])), at3(b, y1f(e[0])), at3(a, y1f(e[0])), 0xffffff, [hh[0], (y0f(e[0]) + y1f(e[0])) / 2, hh[1]], { vary: 0 });
          });
        }
        band(RI - DR, RI, 0, LRUN, function (sv) { return slopeY(sv) - 0.3; }, function (sv) { return slopeY(sv) + 1.0; }, true);                        // 위 계단 난간
        band(RI - DR - 0.006, RI + 0.006, 0, LRUN, function () { return -SLAB; }, function () { return 1.0; }, false);                                     // 2층 바닥 끝 난간
        band(RI - DR + 0.004, RI - 0.004, 0, SSW, function () { return F1; }, function (sv) { return slopeDn(sv) + 1.0; }, true);                           // 아래 계단 난간(낮은 쪽: 밑까지 막힘)
        band(RI - DR + 0.004, RI - 0.004, SSW, LRUN, function (sv) { return slopeDn(sv) - 0.3; }, function (sv) { return slopeDn(sv) + 1.0; }, true);       // 아래 계단 난간(높은 쪽: 밑을 걷는다)
        // 2층 바닥 끝 난간 위 놋쇠 손잡이(위 계단 난간과 떨어진 곳만 — 낮은 쪽은 위 계단 손잡이가 덮는다)
        var prevR = null;
        for (var q = 0; q <= NR; q++) {
          var sv = LRUN * q / NR, th = thOfS(sv), rp = SHp(RI, th), on = slopeY(sv) - 0.3 > 1.15;
          if (on && prevR) ctx.beam3(at3(prevR, 1.13), at3(rp, 1.13), 0.045, 0.045, BRASS, ctx.gloss);
          if (on && q % 3 === 0) ctx.beam3(at3(rp, 1.0), at3(rp, 1.12), 0.025, 0.025, BRASS, ctx.gloss);
          prevR = on ? rp : null;
        }
        // 아래 계단 낮은 쪽 밑을 막는 지름 방향 흰 벽(THSW, RI → 바깥 벽, 1층 바닥 → 디딤 밑면): 높은 쪽 밑(걸어 들어가는 곳)의 막다른 벽
        var a = SHp(RI, THSW), b = SHp(1.0, THSW), hh = SHp(0.85, THSW - 0.3), yt = stepDn(SSW + 1e-4) - SOFF;
        whiteB.addQuad(at3(a, F1), at3(b, F1), at3(b, yt), at3(a, yt), 0xffffff, [hh[0], F1 + 1, hh[1]], { vary: 0 });
        solid.addQuad(at3(a, F1), at3(b, F1), at3(b, F1 + 0.1), at3(a, F1 + 0.1), 0x1c1a18, [hh[0], F1 + 0.05, hh[1]], { vary: 0 });
      })();
      // 계단참(높이 LT, 2026-11-23 개정): 위 계단 꼭대기(TH1)에서 띠를 따라 LANDA 까지 + 타원 벽 밖으로 옆 갤러리(x GAL.x0…x1)까지. 얇은 판(밑면 흰 미장),
      // 안쪽 가장자리·LANDA 쪽 끝에 흰 난간 벽 + 놋쇠 손잡이. 그 밑(2층)은 아래 계단 꼭대기에서 이어지는 2층 바닥이다
      var THL = LANDA * D2R;
      function zEll(x) { var u = (x - SH.cx) / SH.a; return SH.cz - SH.b * sqrt(max(0, 1 - u * u)); }   // 타원 벽(뒷벽 쪽 반)의 z
      (function () {
        var NL = low ? 8 : 16, q, ta, tb;
        for (q = 0; q < NL; q++) {
          ta = THL + (TH1 - THL) * q / NL; tb = THL + (TH1 - THL) * (q + 1) / NL;
          var I0 = SHp(RI, ta), O0 = SHp(1.0, ta), I1 = SHp(RI, tb), O1 = SHp(1.0, tb), hm = SHp(0.7, (ta + tb) / 2);
          mfl(at3(I0, LT), at3(O0, LT), at3(O1, LT), at3(I1, LT), [hm[0], LT + 5, hm[1]]);
          whiteB.addQuad(at3(I0, LT - 0.3), at3(I1, LT - 0.3), at3(O1, LT - 0.3), at3(O0, LT - 0.3), 0xf6f5f2, [hm[0], LT - 5, hm[1]], { vary: 0 });
          // 안쪽 가장자리 흰 난간 벽(RI−DR…RI, LT−0.3…LT+1.0) + 놋쇠 손잡이
          var Ia = SHp(RI - DR, ta), Ib = SHp(RI - DR, tb), cin = SHp(0.2, (ta + tb) / 2);
          whiteB.addQuad(at3(Ia, LT - 0.3), at3(Ib, LT - 0.3), at3(Ib, LT + 1.0), at3(Ia, LT + 1.0), 0xffffff, [cin[0], LT, cin[1]], { vary: 0 });
          whiteB.addQuad(at3(I0, LT - 0.3), at3(I1, LT - 0.3), at3(I1, LT + 1.0), at3(I0, LT + 1.0), 0xffffff, [hm[0], LT, hm[1]], { vary: 0 });
          whiteB.addQuad(at3(Ia, LT + 1.0), at3(Ib, LT + 1.0), at3(I1, LT + 1.0), at3(I0, LT + 1.0), 0xffffff, [hm[0], LT + 4, hm[1]], { vary: 0 });
          var ra = SHp(RI - DR / 2, ta), rb = SHp(RI - DR / 2, tb);
          ctx.beam3(at3(ra, LT + 1.13), at3(rb, LT + 1.13), 0.045, 0.045, BRASS, ctx.gloss);
          if (q % 3 === 0) ctx.beam3(at3(ra, LT + 1.0), at3(ra, LT + 1.12), 0.025, 0.025, BRASS, ctx.gloss);
        }
        // LANDA 쪽 끝(지름 방향, RI → 바깥 벽): 흰 난간 벽 — 그 너머는 2층 바닥으로 뚝 떨어진다
        var e0 = SHp(RI - DR, THL), e1 = SHp(1.0, THL), f0 = SHp(RI - DR, THL + 0.012), f1 = SHp(1.0, THL + 0.012), hb = SHp(0.7, THL - 0.3), hf = SHp(0.7, THL + 0.3);
        whiteB.addQuad(at3(e0, LT - 0.3), at3(e1, LT - 0.3), at3(e1, LT + 1.0), at3(e0, LT + 1.0), 0xffffff, [hb[0], LT, hb[1]], { vary: 0 });
        whiteB.addQuad(at3(f0, LT - 0.3), at3(f1, LT - 0.3), at3(f1, LT + 1.0), at3(f0, LT + 1.0), 0xffffff, [hf[0], LT, hf[1]], { vary: 0 });
        whiteB.addQuad(at3(e0, LT + 1.0), at3(e1, LT + 1.0), at3(f1, LT + 1.0), at3(f0, LT + 1.0), 0xffffff, [hf[0], LT + 4, hf[1]], { vary: 0 });
        ctx.beam3(at3(SHp(RI, THL + 0.006), LT + 1.13), at3(SHp(0.99, THL + 0.006), LT + 1.13), 0.045, 0.045, BRASS, ctx.gloss);
        // 타원 벽 밖 → 옆 갤러리(x GAL.x0…x1, z ZW…타원): 판 + 밑면
        var NX = 6;
        for (q = 0; q < NX; q++) {
          var xa = GAL.x0 + (GAL.x1 - GAL.x0) * q / NX, xb = GAL.x0 + (GAL.x1 - GAL.x0) * (q + 1) / NX;
          mfl([xa, LT, ZW], [xb, LT, ZW], [xb, LT, zEll(xb)], [xa, LT, zEll(xa)], [(xa + xb) / 2, LT + 5, ZW + 0.5]);
          whiteB.addQuad([xa, LT - 0.3, ZW], [xa, LT - 0.3, zEll(xa)], [xb, LT - 0.3, zEll(xb)], [xb, LT - 0.3, ZW], 0xf6f5f2, [(xa + xb) / 2, LT - 5, ZW + 0.5], { vary: 0 });
        }
        // 갤러리 입구 바깥 벽(x GAL.x1, 뒷벽 → 타원 벽)과 천장
        ctx.boxAABB({ x0: GAL.x1, x1: GAL.x1 + 0.3, z0: ZW - 0.01, z1: zEll(GAL.x1) + 0.05, y0: LT - 0.3, y1: YG1, surf: 'yd_brick' });
        solid.addQuad([GAL.x0, YG1, ZB], [GAL.x1, YG1, ZB], [GAL.x1, YG1, zEll(GAL.x1)], [GAL.x0, YG1, zEll(GAL.x0)], 0x2b2826, [12, YG1 - 3, ZW], { vary: 0 });
      })();
      // ---------- 계단 홀 벽·위층: 바깥 타원 벽(벽돌 타일, 1층 바닥부터, 아래 검은 띠) + 위층 복도(LT, 걷지 못함) 끝 흰 난간 벽 + 홀 천장 ----------
      (function () {
        var NE = low ? 36 : 72, arc = 0;
        for (var q = 0; q < NE; q++) {
          var a0 = -PI / 2 + PI * q / NE, a1 = -PI / 2 + PI * (q + 1) / NE, p0 = SHp(1.0, a0), p1 = SHp(1.0, a1), sl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
          // (2026-11-23) 옆 갤러리 입구(x GAL.x0…x1 의 타원 벽, 높이 LT−0.3…YG1)는 비운다
          var gOpen = p0[0] > GAL.x0 - 0.05 && p1[0] > GAL.x0 - 0.05 && p0[0] < GAL.x1 + 0.05 && p1[0] < GAL.x1 + 0.05 && p0[1] < SH.cz;
          (gOpen ? [[F1 + 0.1, LT - 0.3], [YG1, SH.top]] : [[F1 + 0.1, SH.top]]).forEach(function (yy) {
            brickB.addQuad(at3(p0, yy[0]), at3(p1, yy[0]), at3(p1, yy[1]), at3(p0, yy[1]), 0xffffff, [SH.cx, 3, SH.cz], { vary: 0 }, [arc, yy[0], arc + sl, yy[0], arc + sl, yy[1], arc, yy[1]]);   // (3차) 1층 바닥부터
          });
          solid.addQuad(at3(p0, F1), at3(p1, F1), at3(p1, F1 + 0.1), at3(p0, F1 + 0.1), 0x1c1a18, [SH.cx, F1 + 0.05, SH.cz], { vary: 0 });
          arc += sl;
        }
      })();
      ctx.boxAABB({ x0: SH.x0, x1: SH.cx, z0: LOB.z1, z1: LOB.z1 + 0.5, y0: LOB.h, y1: SH.top, surf: 'yd_brick' });   // 안쪽 끝 벽 위(홀이 높다)
      brickB.addQuad([SH.x0, LEDGE, ZW], [SH.x0, LEDGE, LOB.z1], [SH.x0, SH.top, LOB.z1], [SH.x0, SH.top, ZW], 0xffffff, [SH.x0 + 3, 7, 26], { vary: 0 });   // 위층 복도 안쪽 벽
      mfl([SH.x0, LEDGE, ZW], [LOB.x1, LEDGE, ZW], [LOB.x1, LEDGE, LOB.z1], [SH.x0, LEDGE, LOB.z1], [3, LEDGE + 5, 26]);     // 위층 복도 바닥
      ctx.boxAABB({ x0: LOB.x1, x1: LOB.x1 + 0.2, z0: ZW, z1: LOB.z1, y0: LOB.h, y1: LOB.h + 0.35, surf: 'yd_white' });   // 로비 천장 끝 보
      ctx.boxAABB({ x0: LOB.x1, x1: LOB.x1 + 0.2, z0: ZW, z1: LOB.z1, y0: LOB.h + 0.35, y1: LEDGE, surf: 'yd_brick' });  // 위층 바닥까지 벽
      ctx.boxAABB({ x0: LOB.x1, x1: LOB.x1 + 0.2, z0: ZW, z1: LOB.z1, y0: LEDGE, y1: LEDGE + 1.05, surf: 'yd_white' });  // 위층 끝 흰 난간 벽
      ctx.beam3([LOB.x1 + 0.1, LEDGE + 1.17, ZW], [LOB.x1 + 0.1, LEDGE + 1.17, LOB.z1], 0.045, 0.045, BRASS, ctx.gloss);
      for (var zr = ZW + 0.6; zr < LOB.z1; zr += 1.2) ctx.box({ x: LOB.x1 + 0.1, y: LEDGE + 1.05, z: zr, w: 0.025, h: 0.12, d: 0.025, color: BRASS, mat: 'gloss' });
      whiteB.addQuad([SH.x0, SH.top, ZW], [SH.cx + SH.a, SH.top, ZW], [SH.cx + SH.a, SH.top, LOB.z1], [SH.x0, SH.top, LOB.z1], 0xffffff, [9, 0, 26], { vary: 0 });
      [[SH.cx - 2.0, SH.cz], [SH.cx + 3.0, SH.cz], [SH.cx + 0.5, SH.cz - 3.0], [SH.cx + 0.5, SH.cz + 3.0]].forEach(function (p) {
        glow.add(Geo.cyl(low ? 8 : 12, 1), hdr(0xfff0d6, 2.4), { x: p[0], y: SH.top - 0.024, z: p[1], sx: 0.12, sy: 0.012, sz: 0.12, flat: true, vary: 0 });
      });

      // ---------- 로비 벽: 안쪽 끝(+z) 벽돌 벽 + 무지개 색유리 벽 자리(추상 색면 3폭), 유리 정면(−x, 맑은 유리 3폭, 밖은 밝은 빛) ----------
      ctx.wall({ x0: LOB.x0 - 0.5, z0: LOB.z1 + 0.25, x1: SH.cx, z1: LOB.z1 + 0.25, h: LOB.h, t: 0.5, surf: 'yd_brick', color: 0xffffff, collide: false, plinth: false, crown: false });
      [-9.3, -6.5, -3.7].forEach(function (x, q) {
        // 무지개 모티프 현대 색유리(작가 미확인, 권리 존속으로 봄): 사진의 색 분위기(위 파랑·초록·노랑·주황)만 따른 추상 색면 — 무지개 띠·구도를 옮기지 않는다
        ctx.window({ x: x, z: LOB.z1, y: 0.25, face: [0, -1], w: 2.6, h: 3.75, top: 'flat', pattern: 'lancet', colors: [0x3a6ab8, 0x4a9a5a, 0xe0b040, 0xd87838, 0x7cb6e4], frame: true, frameColor: 0x3a3a38, beam: false, seed: 611 + q,
          glass: 'yeouido_lobby', glassMod: 1.25 });
      });
      ctx.wall({ x0: LOB.x0 - 0.25, z0: ZW, x1: LOB.x0 - 0.25, z1: LOB.z1 + 0.5, h: LOB.h, t: 0.5, surf: 'yd_brick', color: 0xffffff, collide: false, plinth: false, crown: false });
      [0.17, 0.5, 0.83].map(function (f) { return +(ZW + (LOB.z1 - ZW) * f).toFixed(2); }).forEach(function (z, q) {
        ctx.window({ x: LOB.x0, z: z, y: 0.04, face: [1, 0], w: 2.6, h: 3.9, top: 'flat', pattern: 'grid', colors: GLASS_CLEAR, frame: true, frameColor: 0x5a5a58, beam: false, seed: 700 + q });
      });
      [[LOB.x0, -10.6], [-8.0, -7.8], [-5.2, -5.0], [-2.4, SH.cx]].forEach(function (r) { ctx.boxAABB({ x0: r[0], x1: r[1], z0: LOB.z1 - 0.02, z1: LOB.z1, y0: 0, y1: 0.1, color: 0x1c1a18, mat: 'solid' }); });   // 검은 걸레받이

      // ---------- 로비 우물(격자) 천장(사진 1·5): 흰 보 격자 + 칸마다 오목 + 네모 빛판 ----------
      (function () {
        var NXc = 9, NZc = Math.round((LOB.z1 - ZW) / 1.8), BW = 0.15, X0 = LOB.x0, X1 = LOB.x1, dX = (X1 - X0) / NXc, dZ = (LOB.z1 - ZW) / NZc, yb = LOB.h, yc = LOB.hc, ix, iz;
        for (iz = 0; iz <= NZc; iz++) { var zl = ZW + iz * dZ; whiteB.addQuad([X0, yb, max(ZW, zl - BW)], [X1, yb, max(ZW, zl - BW)], [X1, yb, min(LOB.z1, zl + BW)], [X0, yb, min(LOB.z1, zl + BW)], 0xffffff, [0, 0, zl], { vary: 0 }); }
        for (ix = 0; ix <= NXc; ix++) {
          var xl = X0 + ix * dX;
          for (iz = 0; iz < NZc; iz++) whiteB.addQuad([max(X0, xl - BW), yb, ZW + iz * dZ + BW], [min(X1, xl + BW), yb, ZW + iz * dZ + BW], [min(X1, xl + BW), yb, ZW + (iz + 1) * dZ - BW], [max(X0, xl - BW), yb, ZW + (iz + 1) * dZ - BW], 0xffffff, [xl, 0, 26], { vary: 0 });
        }
        for (ix = 0; ix < NXc; ix++) for (iz = 0; iz < NZc; iz++) {
          var x0 = X0 + ix * dX + BW, x1 = X0 + (ix + 1) * dX - BW, z0 = ZW + iz * dZ + BW, z1 = ZW + (iz + 1) * dZ - BW, xm = (x0 + x1) / 2, zm = (z0 + z1) / 2;
          whiteB.addQuad([x0, yc, z0], [x1, yc, z0], [x1, yc, z1], [x0, yc, z1], 0xf4f3f0, [xm, 0, zm], { vary: 0 });
          [[[x0, z0], [x1, z0]], [[x1, z0], [x1, z1]], [[x1, z1], [x0, z1]], [[x0, z1], [x0, z0]]].forEach(function (e) {
            whiteB.addQuad([e[0][0], yb, e[0][1]], [e[1][0], yb, e[1][1]], [e[1][0], yc, e[1][1]], [e[0][0], yc, e[0][1]], 0xe8e7e2, [xm, yb, zm], { vary: 0 });
          });
          var lw = min(x1 - x0, z1 - z0) * 0.34;
          glow.addQuad([xm - lw, yc - 0.006, zm - lw], [xm + lw, yc - 0.006, zm - lw], [xm + lw, yc - 0.006, zm + lw], [xm - lw, yc - 0.006, zm + lw], hdr(0xfff6e6, 1.5), [xm, 0, zm], { vary: 0 });
        }
      })();

      // ---------- 로비 가구·장식 ----------
      // 흰 원기둥(사진 5) · 둥근 나무 탁자 · 나무 안내 책자 꽂이(사진 3·5) · 유리 정면 앞 화분(사진 3)
      ctx.cyl({ x: -4.2, y: 0, z: 26.2, r: 0.32, h: LOB.h, seg: low ? 12 : 20, surf: 'yd_white', flat: false });
      ctx.cyl({ x: -4.2, y: 0, z: 26.2, r: 0.335, h: 0.1, seg: low ? 12 : 20, color: 0x1c1a18, mat: 'solid', flat: false });
      ctx.addCollider({ x: -4.2, z: 26.2, r: 0.36 }); ctx.aoDecalCircle({ x: -4.2, z: 26.2, r: 0.36, y: 0 });   // 기둥은 1층부터 오른다(충돌체 모든 층)
      ctx.cyl({ x: -4.2, y: F1, z: 26.2, r: 0.32, h: -F1 - SLAB, seg: low ? 12 : 20, surf: 'yd_white', flat: false });
      ctx.cyl({ x: -4.2, y: F1, z: 26.2, r: 0.335, h: 0.1, seg: low ? 12 : 20, color: 0x1c1a18, mat: 'solid', flat: false });
      ctx.aoDecalCircle({ x: -4.2, z: 26.2, r: 0.36, y: F1 });
      ctx.setColliderRange(R2F);   // 2층 로비 가구(탁자·책자 꽂이·화분): 그 밑은 1층 로비라 2층 높이에서만 막는다
      ctx.cyl({ x: -9.2, y: 0, z: 22.9, r: 0.05, h: 0.7, seg: 8, color: 0x5a3a24, mat: 'wood' });
      ctx.cyl({ x: -9.2, y: 0, z: 22.9, r: 0.26, rTop: 0.18, h: 0.05, seg: 12, color: 0x5a3a24, mat: 'wood' });
      ctx.cyl({ x: -9.2, y: 0.7, z: 22.9, r: 0.42, h: 0.04, seg: low ? 12 : 20, color: 0x9a6a40, mat: 'wood', flat: false });
      ctx.addCollider({ x: -9.2, z: 22.9, r: 0.45 }); ctx.aoDecalCircle({ x: -9.2, z: 22.9, r: 0.42, y: 0 });
      (function () {   // 안내 책자 꽂이: 뒷벽(로비 쪽) 앞, 정문과 벽감 사이
        var x = 2.3, z = ZW + 0.2, c = 0xb88450;
        ctx.box({ x: x, y: 0, z: z, w: 0.9, h: 1.3, d: 0.34, color: c, mat: 'wood' });
        for (var q = 0; q < 4; q++) ctx.box({ x: x, y: 0.5 + q * 0.2, z: z + 0.2, w: 0.84, h: 0.16, d: 0.03, rx: -0.35, color: 0xc89460, mat: 'wood' });
        ctx.addCollider({ x0: x - 0.47, x1: x + 0.47, z0: ZW, z1: z + 0.3 });
        ctx.aoDecal({ x0: x - 0.45, x1: x + 0.45, z0: ZW, z1: z + 0.17, y: 0, pad: 0.2 });
      })();
      [22.3, 26.2, 30.4, 34.2].forEach(function (z, q) {   // 화분: 짙은 회색 화분 + 둥근 잎 덩이(일반 형태)
        var x = LOB.x0 + 0.45, sz2 = q % 2 ? 0.85 : 1.1;
        ctx.cyl({ x: x, y: 0, z: z, r: 0.22, rTop: 0.26, h: 0.45, seg: low ? 8 : 12, color: 0x4a4a48, mat: 'solid', flat: false });
        [[0, 0.75, 0, 0.36], [0.12, 0.98, 0.08, 0.28], [-0.1, 1.1, -0.06, 0.24]].forEach(function (f) {
          ctx.sphere({ x: x + f[0], y: (0.45 + f[1] * sz2 * 0.6), z: z + f[2], r: f[3] * sz2, color: q % 2 ? 0x3f6a34 : 0x4a7a3a, mat: 'solid', w: low ? 6 : 9, h: low ? 5 : 7 });
        });
        ctx.aoDecalCircle({ x: x, z: z, r: 0.3, y: 0 });
      });
      ctx.addCollider({ x0: LOB.x0, x1: LOB.x0 + 0.8, z0: 21.9, z1: LOB.z1 - 0.4 });
      ctx.setColliderRange(null);
      // 흰 공 벽등(검은 말린 받침, 사진 1·4): 로비 벽·계단 벽(계단 디딤 위 약 1.9m). 1층 로비 벽·1층 → 2층 계단 벽에도
      var SCON = [[-8.8, ZW, 0, 1, 2.3], [-3.4, ZW, 0, 1, 2.3], [4.9, ZW, 0, 1, 2.3], [-0.4, LOB.z1, 0, -1, 2.3], [4.2, LOB.z1, 0, -1, 2.3], [7.6, LOB.z1, 0, -1, 2.3],
        [-8.8, ZW, 0, 1, F1 + 2.3], [-3.4, ZW, 0, 1, F1 + 2.3], [2.6, ZW, 0, 1, F1 + 2.3], [-0.4, LOB.z1, 0, -1, F1 + 2.3], [4.2, LOB.z1, 0, -1, F1 + 2.3]];
      [55, 25, -5, -35].forEach(function (d) { var th = d * D2R, p = SHp(0.995, th); SCON.push([p[0], p[1], -cos(th), -sin(th) * SH.a / SH.b, stepY(sOfTh(th)) + 1.9]); });
      [65, 35, 5, -25].forEach(function (d) { var th = d * D2R, p = SHp(0.995, th); SCON.push([p[0], p[1], -cos(th), -sin(th) * SH.a / SH.b, stepDn(sOfTh(th)) + 1.9]); });
      SCON.forEach(function (c) {
        var nl = Math.hypot(c[2], c[3]), nx = c[2] / nl, nz = c[3] / nl, x = c[0], z = c[1], y = c[4], IR = 0x1a1816;
        ctx.box({ x: x, y: y - 0.2, z: z, w: 0.09, h: 0.24, d: 0.09, color: IR, mat: 'metal' });
        ctx.beam3([x + nx * 0.03, y - 0.12, z + nz * 0.03], [x + nx * 0.2, y - 0.05, z + nz * 0.2], 0.02, 0.02, IR, metal);
        ctx.beam3([x + nx * 0.2, y - 0.05, z + nz * 0.2], [x + nx * 0.24, y + 0.05, z + nz * 0.24], 0.02, 0.02, IR, metal);
        ctx.beam3([x + nx * 0.06, y - 0.3, z + nz * 0.06], [x + nx * 0.12, y - 0.42, z + nz * 0.12], 0.016, 0.016, IR, metal);   // 아래로 말린 끝
        glow.add(Geo.sph(low ? 6 : 8, low ? 4 : 6), hdr(0xfff8ee, 1.7), { x: x + nx * 0.25, y: y + 0.17, z: z + nz * 0.25, sx: 0.13, sy: 0.13, sz: 0.13, flat: false, vary: 0 });
      });
      // 액자(사진 1: 큰 성화 둘 + 풍경화 하나) — 그림은 옮기지 않는다(자비의 예수 성화 등은 권리 존속 가능): 금빛·나무 테 + 무늬 없는 따뜻한 판
      [[3.0, LOB.z1, -1, 1.25, 1.85, 1.35, 0xb8954a], [0.9, LOB.z1, -1, 0.8, 1.1, 1.6, 0x6a4a32], [-3.2, ZW, 1, 0.95, 0.62, 1.55, 0xb8954a]].forEach(function (f) {
        var x = f[0], z = f[1] + f[2] * 0.03, w = f[3], h = f[4], y0 = f[5];
        ctx.boxAABB({ x0: x - w / 2, x1: x + w / 2, z0: min(f[1], z), z1: max(f[1], z), y0: y0, y1: y0 + h, color: f[6], mat: 'metal' });
        solid.addQuad([x - w / 2 + 0.07, y0 + 0.07, z + f[2] * 0.003], [x + w / 2 - 0.07, y0 + 0.07, z + f[2] * 0.003], [x + w / 2 - 0.07, y0 + h - 0.07, z + f[2] * 0.003], [x - w / 2 + 0.07, y0 + h - 0.07, z + f[2] * 0.003],
          [V(0x8a6e52), V(0x8a6e52), V(0xd8c8a8), V(0x8a6e52), V(0xd8c8a8), V(0xd8c8a8)], [x, y0 + h / 2, z + f[2] * 3], { vary: 0 });
      });
      // 성모상 벽감(사진 1·4): 뒷벽 로비 쪽 반을 판 밝은 벽감 — 안은 따뜻한 미장 + 위 숨은 등. 성모상·나무 초 받침은 shrine.js(shrine_places.js 'existing')
      (function () {
        var x0 = NICHE.x - NICHE.w / 2, x1 = NICHE.x + NICHE.w / 2, y0 = NICHE.y0, y1 = NICHE.y1;
        glow.addQuad([x0, y0, ZM + 0.004], [x1, y0, ZM + 0.004], [x1, y1, ZM + 0.004], [x0, y1, ZM + 0.004], [hdr(0xf0dcb8, 0.75), hdr(0xf0dcb8, 0.75), hdr(0xfff0d8, 1.25), hdr(0xf0dcb8, 0.75), hdr(0xfff0d8, 1.25), hdr(0xfff0d8, 1.25)], [NICHE.x, 1.5, ZW + 2], { vary: 0 });
        [[x0, 1], [x1, -1]].forEach(function (e) { whiteB.addQuad([e[0], y0, ZM], [e[0], y0, ZW], [e[0], y1, ZW], [e[0], y1, ZM], 0xfaf2e2, [e[0] + e[1], 1.5, ZW], { vary: 0 }); });
        whiteB.addQuad([x0, y0 + 0.002, ZM], [x1, y0 + 0.002, ZM], [x1, y0 + 0.002, ZW], [x0, y0 + 0.002, ZW], 0xfaf2e2, [NICHE.x, y0 + 2, ZW], { vary: 0 });
        whiteB.addQuad([x0, y1, ZM], [x1, y1, ZM], [x1, y1, ZW], [x0, y1, ZW], 0xfaf2e2, [NICHE.x, 0, ZW], { vary: 0 });
        glow.addQuad([x0 + 0.05, y1 - 0.004, ZM + 0.03], [x1 - 0.05, y1 - 0.004, ZM + 0.03], [x1 - 0.05, y1 - 0.004, ZM + 0.1], [x0 + 0.05, y1 - 0.004, ZM + 0.1], hdr(0xfff2d8, 2.6), [NICHE.x, 0, ZW], { vary: 0 });
      })();
      // 어두운 문(벽감 오른쪽, 사진 1·4): 아래층으로 내려가는 계단 — 짓지 않는다(어두운 안 + 짙은 나무 문틀). 걷지 못함(뒷벽 충돌체)
      solid.addQuad([DARK.x0, 0, ZB + 0.02], [DARK.x1, 0, ZB + 0.02], [DARK.x1, DARK.h, ZB + 0.02], [DARK.x0, DARK.h, ZB + 0.02], 0x17140f, [6.2, 1, ZW + 2], { vary: 0 });
      stone([DARK.x0, 0.002, ZB + 0.02], [DARK.x1, 0.002, ZB + 0.02], [DARK.x1, 0.002, ZW], [DARK.x0, 0.002, ZW], 0x6a6964, [6.2, 3, ZW]);
      ctx.boxAABB({ x0: DARK.x0 - 0.1, x1: DARK.x0, z0: ZW, z1: ZW + 0.04, y0: 0, y1: DARK.h + 0.1, color: C.doorD, mat: 'wood' });
      ctx.boxAABB({ x0: DARK.x1, x1: DARK.x1 + 0.1, z0: ZW, z1: ZW + 0.04, y0: 0, y1: DARK.h + 0.1, color: C.doorD, mat: 'wood' });
      ctx.boxAABB({ x0: DARK.x0 - 0.1, x1: DARK.x1 + 0.1, z0: ZW, z1: ZW + 0.04, y0: DARK.h, y1: DARK.h + 0.1, color: C.doorD, mat: 'wood' });

      // =====================================================================
      // (3차) 1층 로비(조사 §3: 거리 쪽 1층 로비 — 회백 대리석 바닥, 흰 원기둥, 베이지 벽, 1층 전면 색유리, 곡선 대리석 계단이 2층 로비로 오른다)
      //   2층 로비 바로 밑(x −11…5, z 21.5…30.5) + 계단 홀 밑. 천장 = 2층 바닥 판 밑(−SLAB). 치수·배치는 [추정](사진에 1층은 몇 장뿐)
      // =====================================================================
      (function () {
        var H1 = -F1 - SLAB;   // 1층 천장 높이(바닥에서 3.85m)
        // 벽: 뒷벽(성전 밑 쪽, 벽돌 타일) · 안쪽 끝 벽(+z, 1층 추상 색유리 2폭) · 거리 쪽 유리 정면(−x, 맑은 유리 3폭)
        ctx.boxAABB({ x0: LOB.x0 - 0.5, x1: SH.cx, z0: ZB, z1: ZW, y0: F1, y1: 0, surf: 'yd_brick' });
        ctx.wall({ x0: LOB.x0 - 0.5, z0: LOB.z1 + 0.25, x1: SH.cx, z1: LOB.z1 + 0.25, y: F1, h: -F1, t: 0.5, surf: 'yd_brick', color: 0xffffff, collide: false, plinth: false, crown: false });
        [-8.6, -5.6].forEach(function (x, q) {
          // 1층 전면 색유리(최영심 2024, 생존 작가 — 붉은·호박·파랑·검정 띠의 추상): 색 분위기만 따른 추상 색면, 띠·구도를 옮기지 않는다
          ctx.window({ x: x, z: LOB.z1, y: F1 + 0.3, face: [0, -1], w: 2.4, h: 3.2, top: 'flat', pattern: 'lancet', colors: [0xb83a30, 0xd88a38, 0x2f5aa8, 0x2a2a30, 0xe8c070], frame: true, frameColor: 0x3a3a38, beam: false, seed: 631 + q,
            glass: 'yeouido_lobby', glassMod: 1.1 });
        });
        ctx.wall({ x0: LOB.x0 - 0.25, z0: ZW, x1: LOB.x0 - 0.25, z1: LOB.z1 + 0.5, y: F1, h: -F1, t: 0.5, surf: 'yd_brick', color: 0xffffff, collide: false, plinth: false, crown: false });
        [0.17, 0.5, 0.83].map(function (f) { return +(ZW + (LOB.z1 - ZW) * f).toFixed(2); }).forEach(function (z, q) {
          ctx.window({ x: LOB.x0, z: z, y: F1 + 0.04, face: [1, 0], w: 2.6, h: 3.55, top: 'flat', pattern: 'grid', colors: GLASS_CLEAR, frame: true, frameColor: 0x5a5a58, beam: false, seed: 720 + q });
        });
        [[LOB.x0, ZW, SH.cx, ZW + 0.02], [LOB.x0, LOB.z1 - 0.02, -9.9, LOB.z1], [-7.3, LOB.z1 - 0.02, -6.9, LOB.z1], [-4.3, LOB.z1 - 0.02, SH.cx, LOB.z1]].forEach(function (r) { ctx.boxAABB({ x0: r[0], x1: r[2], z0: r[1], z1: r[3], y0: F1, y1: F1 + 0.1, color: 0x1c1a18, mat: 'solid' }); });   // 검은 걸레받이
        doorAt(-7.0, -5.4, 2.5, ZW, 1, F1);   // 뒷벽 닫힌 쌍문(지하 소성당·교리실 쪽 — 짓지 않음)
        // 천장 매입 빛판(네모, 사진의 2층 로비 우물 천장보다 단순하게) + 계단 홀 밑 둥근 매입등
        for (var gx = LOB.x0 + 1.6; gx < 4.6; gx += 3.1) for (var gz = ZW + 1.5; gz < LOB.z1 - 0.5; gz += 2.9) {
          glow.addQuad([gx - 0.45, -SLAB - 0.006, gz - 0.45], [gx + 0.45, -SLAB - 0.006, gz - 0.45], [gx + 0.45, -SLAB - 0.006, gz + 0.45], [gx - 0.45, -SLAB - 0.006, gz + 0.45], hdr(0xfff6e6, 1.5), [gx, F1, gz], { vary: 0 });
        }
        [[6.6, SH.cz - 2.6], [6.6, SH.cz + 2.6], [7.8, ZW + 1.1], [7.8, LOB.z1 - 1.1]].forEach(function (p) { glow.add(Geo.cyl(low ? 8 : 12, 1), hdr(0xfff0d6, 2.2), { x: p[0], y: -SLAB - 0.026, z: p[1], sx: 0.11, sy: 0.012, sz: 0.11, flat: true, vary: 0 }); });
        // 우물 밑 큰 화분(사진 L2: 가운데 큰 화분 나무 — 2층 우물에서 내려다보인다): 짙은 회색 둥근 화분 + 잎 덩이
        ctx.cyl({ x: SH.cx, y: F1, z: SH.cz, r: 0.62, rTop: 0.7, h: 0.55, seg: low ? 12 : 20, color: 0x4a4a48, mat: 'solid', flat: false });
        [[0, 1.0, 0, 0.62], [0.3, 1.55, 0.15, 0.5], [-0.28, 1.75, -0.12, 0.44], [0.05, 2.2, 0.05, 0.38]].forEach(function (f) {
          ctx.sphere({ x: SH.cx + f[0], y: F1 + f[1], z: SH.cz + f[2], r: f[3], color: 0x416e36, mat: 'solid', w: low ? 7 : 10, h: low ? 5 : 8 });
        });
        ctx.addCollider({ x: SH.cx, z: SH.cz, r: 0.75, y0: R1F.y0, y1: R1F.y1 }); ctx.aoDecalCircle({ x: SH.cx, z: SH.cz, r: 0.7, y: F1 });
        // 곡선 계단 발치 둥근 받침(조사 §3: 프라하의 아기 예수상 자리 — 성상은 싣지 않는다, 민무늬 받침만)
        var pb = SHp(0.30, TH0 + 0.12);
        ctx.cyl({ x: pb[0], y: F1, z: pb[1], r: 0.3, h: 0.9, seg: low ? 10 : 16, surf: 'marble_white', color: 0xe8e6e0, flat: false });
        ctx.addCollider({ x: pb[0], z: pb[1], r: 0.33, y0: R1F.y0, y1: R1F.y1 }); ctx.aoDecalCircle({ x: pb[0], z: pb[1], r: 0.32, y: F1 });
        void H1;
      })();

      // ---------- 걷는 바닥 높이(구역) + 충돌체(층마다 높이 범위) — (3차) 여러 층 엔진: 같은 (x,z) 에 바닥 여럿, 발 높이 + 한 걸음 아래의 가장 높은 바닥 ----------
      // 성당(2층) 바닥 0: 신랑·제단 앞·성가대석 밑 전체를 한 구역으로(layout.ground = false 라 바닥도 구역)
      ctx.floorZone({ x0: -PLAN.C[0], x1: PLAN.C[0], z0: ZF - RB, z1: ZW, y: 0 });
      // 성가대석(3층): 앞 띠 + 단 3(폭 전체, 맨 뒤 단은 뒷벽까지) · 오른쪽 옆 갤러리(맨 앞 띠와 같은 높이 — 맨 앞 오른쪽 입구로 이어진다). 계단참은 아래 홀 칸에서
      TIER.forEach(function (t, ti) { ctx.floorZone({ x0: -HW, x1: HW, z0: ti ? t[0] : LZ, z1: t[1], y: LT + t[2] }); });
      ctx.floorZone({ x0: GAL.x0, x1: GAL.x1, z0: GAL.z0, z1: ZW, y: LT });
      // 2층 로비 + 계단 홀 2층 바닥(우물·계단 띠 빼고) · 1층 로비 + 계단 홀 1층 바닥(아래 계단 낮은 쪽 밑 빼고) · 두 곡선 계단 디딤(0.2m 칸, 같은 높이로 이어지면 한 구역)
      ctx.floorZone({ x0: LOB.x0, x1: 5.0, z0: ZW, z1: LOB.z1, y: 0 });
      ctx.floorZone({ x0: LOB.x0, x1: 5.0, z0: ZW, z1: LOB.z1, y: F1 });
      (function () {
        var CZ = 0.2;
        function hallAt(x, z) {   // 칸 가운데의 계단 홀 좌표: 홀 안인가, 우물 안인가, 띠(rho, th)
          var ux = (x - SH.cx) / SH.a, uz = (z - SH.cz) / SH.b, rho = sqrt(ux * ux + uz * uz), th = Math.atan2(uz, ux);
          var wx = (x - SH.cx) / WELL.rx, wz = (z - SH.cz) / WELL.rz;
          return { hall: x < SH.cx || rho <= 1.04, well: wx * wx + wz * wz < 1.0, rho: rho, th: th, band: rho >= RI - 0.02 && inShaft(th) };
        }
        for (var zc = ZW; zc < LOB.z1 - 1e-6; zc += CZ) {
          var runs = {};
          for (var xc = 5.0; xc < SH.cx + SH.a + 0.2; xc += CZ) {
            var h = hallAt(xc + CZ / 2, zc + CZ / 2), st = h.rho >= RI - 0.04 && h.rho <= 1.08 && inShaft(h.th), sv = st ? sOfTh(h.th) : 0;
            // 계단참(LT): 위 계단 끝(TH1)에서 LANDA 까지의 띠 + 타원 벽 밖의 갤러리 입구(x GAL.x0…x1, 뒷벽 → 타원)
            var xm = xc + CZ / 2, zm = zc + CZ / 2;
            var land = (h.rho >= RI - 0.04 && h.rho <= 1.08 && h.th < TH1 && h.th >= THL - 1e-9) || (xm > GAL.x0 && xm < GAL.x1 && zm < zEll(xm) + 0.1);
            var kinds = {
              ld: land ? LT : null,
              f2: h.hall && !h.well && !h.band ? 0 : null,                     // 2층 바닥(우물·계단 띠 빼고)
              f1: h.hall && !(h.band && h.th >= THSW - 1e-9) ? F1 : null,      // 1층 바닥(아래 계단 낮은 쪽 밑 빼고)
              up: st && stepY(sv) > 0 ? stepY(sv) : null,                      // 2층 → 3층 계단 디딤
              dn: st && stepDn(sv) > F1 ? stepDn(sv) : null                    // 1층 → 2층 계단 디딤(꼭대기 디딤 = 0)
            };
            ['f2', 'f1', 'up', 'dn', 'ld'].forEach(function (kd) {
              var y = kinds[kd], r = runs[kd];
              if (y !== null && r && Math.abs(r.y - y) < 1e-6 && Math.abs(r.x1 - xc) < 1e-6) { r.x1 = xc + CZ; return; }
              if (r) ctx.floorZone(r);
              runs[kd] = y !== null ? { x0: xc, x1: xc + CZ, z0: zc, z1: zc + CZ, y: y } : null;
            });
          }
          Object.keys(runs).forEach(function (kd) { if (runs[kd]) ctx.floorZone(runs[kd]); });
        }
      })();
      function colR(c, R) { c.y0 = R.y0; c.y1 = R.y1; ctx.addCollider(c); }
      // 성가대석: 앞 난간(폭 전체) · 오르간(첫 단 오른쪽 끝) · 옆 갤러리 난간(입구 뒤부터)·갤러리 앞 끝 — 성가대석 높이에서만(그 밑 성당 바닥은 트여 있다)
      colR({ x0: -HW - 0.6, x1: GAL.x1 + 0.6, z0: LZ - 0.15, z1: LZ + 0.15 }, RLOFT);
      colR({ x0: ORG.x0, x1: ORG.x1, z0: ORG.z0, z1: ORG.z1 }, RLOFT);
      colR({ x0: GAL.x0 - 0.05, x1: GAL.x0 + 0.17, z0: GAL.ent - 0.05, z1: ZB }, RLOFT);
      colR({ x0: GAL.x0, x1: GAL.x1 + 0.6, z0: LZ - 0.4, z1: GAL.z0 }, RLOFT);
      // 1층: 뒷벽 전체(정문·갤러리 자리 아래도 벽이다)
      colR({ x0: -PLAN.C[0] - 0.6, x1: PLAN.C[0] + 0.6, z0: ZB - 0.5, z1: ZW }, R1F);
      // 우물 난간(2층) — 그 밑은 1층 로비
      colR({ x: SH.cx - 0.55, z: SH.cz, r: 1.62 }, R2F); colR({ x: SH.cx + 0.55, z: SH.cz, r: 1.62 }, R2F);
      // 띠 안쪽 가장자리(RI)의 난간 사슬(원 0.12m, 0.25m 간격): 점마다 위 계단 난간·2층 바닥 끝 난간·아래 계단 난간 높이 구간을 합쳐 원 하나씩
      // (아래 계단 낮은 쪽은 1층 바닥부터 막고, 높은 쪽은 난간만 — 그 밑을 1층에서 걸어 들어간다)
      (function () {
        var th = TH0 - 1 * D2R, last = SHp(RI, th), acc = 0.25, n = 0;
        function emit(p, sv) {
          var hu = slopeY(sv), hd = slopeDn(sv), iv = [[sv <= SSW ? F1 - 0.5 : hd - 0.3, hd + 1.2], [-0.5, 1.4], [hu - 0.3, hu + 1.2]].sort(function (a, b) { return a[0] - b[0]; }), out = [iv[0].slice()];
          for (var q = 1; q < iv.length; q++) { var Lv = out[out.length - 1]; if (iv[q][0] <= Lv[1] + 0.05) Lv[1] = max(Lv[1], iv[q][1]); else out.push(iv[q].slice()); }
          out.forEach(function (r) { ctx.addCollider({ x: p[0], z: p[1], r: 0.12, y0: r[0], y1: r[1] }); });
        }
        while (th > TH1 + 1e-9 && n < 200) {
          var p = SHp(RI, th);
          acc += Math.hypot(p[0] - last[0], p[1] - last[1]); last = p;
          if (acc >= 0.25) { emit(p, sOfTh(th)); acc = 0; n++; }
          th -= 0.002;
        }
        emit(SHp(RI, TH1 + 0.5 * D2R), sOfTh(TH1 + 0.5 * D2R));
        // 계단참(LT) 안쪽 가장자리 난간(TH1 → LANDA) + LANDA 쪽 끝 난간(지름 방향) — 계단참 높이에서만(그 밑 2층은 걸어 다닌다)
        var RL = { y0: LT - 0.3, y1: LT + 1.2 };
        for (var tl = TH1, pl = SHp(RI, TH1), al = 0; tl > THL - 1e-9; tl -= 0.004) {
          var ql = SHp(RI, tl); al += Math.hypot(ql[0] - pl[0], ql[1] - pl[1]); pl = ql;
          if (al >= 0.25) { ctx.addCollider({ x: ql[0], z: ql[1], r: 0.12, y0: RL.y0, y1: RL.y1 }); al = 0; }
        }
        for (var rl = RI; rl <= 1.0 + 1e-9; rl += 0.08) { var pr = SHp(rl, THL); ctx.addCollider({ x: pr[0], z: pr[1], r: 0.12, y0: RL.y0, y1: RL.y1 }); }
        // 아래 계단 낮은 쪽 밑을 막는 지름 방향 벽(THSW): 1층 사람만 막는다(그 위 계단을 걷는 사람은 지나간다)
        var yb = stepDn(SSW + 1e-4) - 0.3;
        for (var rr = RI; rr <= 1.0 + 1e-9; rr += 0.05) { var pq = SHp(rr, THSW); ctx.addCollider({ x: pq[0], z: pq[1], r: 0.12, y0: F1 - 0.5, y1: yb }); }
      })();
      // 계단 홀 타원 벽 밖(걷기 경계 네모의 모서리): 0.5m 띠마다 — 모든 층(벽이 1층부터 홀 천장까지). 옆 갤러리 입구(x GAL.x0…x1, 뒷벽 → 타원)는
      // 계단참 높이에서 트이고 그 밑(2층·1층)만 막는다
      var zGal = zEll(GAL.x1) + 0.1;
      for (var zs = ZB; zs < LOB.z1 + 0.5 - 1e-6; zs += 0.5) {
        var zn = (zs <= SH.cz && zs + 0.5 >= SH.cz) ? 0 : min(Math.abs(zs - SH.cz), Math.abs(zs + 0.5 - SH.cz));
        var xe = SH.cx + SH.a * sqrt(max(0, 1 - zn * zn / (SH.b * SH.b))), xEnd = PLAN.C[0] + 0.6;
        if (zs < zGal) {
          if (xe < GAL.x0) ctx.addCollider({ x0: xe, x1: GAL.x0, z0: zs, z1: zs + 0.5 });
          if (xe < GAL.x1) ctx.addCollider({ x0: max(xe, GAL.x0), x1: GAL.x1, z0: zs, z1: zs + 0.5, y0: -1e3, y1: LT - 0.6 });
          ctx.addCollider({ x0: max(xe, GAL.x1), x1: xEnd, z0: zs, z1: zs + 0.5 });
        } else ctx.addCollider({ x0: xe, x1: xEnd, z0: zs, z1: zs + 0.5 });
      }

      // ---------- 신자석(신랑 부채꼴 4덩이 140석): 꿀빛 나무 긴 의자(둥근 옆판 머리) + 파란 방석(조사 §4.6) ----------
      ctx.renderSeats({ id: layout.id, seatGroups: layout.seatGroups.slice(0, 4) }, 'bench', { surf: null, wood: 0xbf7e44, seat: 0xc98a4c, back: 0xa96c38, kneelerColor: 0x6a4a34, cushion: 0x2e4a8c });

      // ---------- 조명·카메라 ----------
      ctx.addLight({ x: 0, y: 7.0, z: -9.4, color: 0xffe0b0, intensity: 1.0, distance: 18, kind: 'lamp' });
      // 천장 10m(로비 4.3m, 계단 홀 9.3m): 카메라는 9m 아래, 신랑 + 로비 + 계단 홀 상자 안(1층 로비는 cam_guard 공간이 맨 아래층 F1 부터). 로비 천장 위(지붕 없음)는 cam_guard 가 '지붕 아래 아님'으로 뺀다
      // pitchMax(3차): 좁은 곡선 계단에서 리그가 거의 바로 위(1.05·1.3·1.42 rad)로 올라가 내려다보던 것을 막는다 — 대신 옆(홀 가운데)에서 비스듬히 본다(cam_guard RIG.pitchUp 중 0.8 까지)
      ctx.setCameraBounds({ x0: -PLAN.C[0] + 0.3, x1: PLAN.C[0] - 0.3, z0: ZF - RB + 0.3, z1: LOB.z1 - 0.3, yMax: 9.0, pitchMax: 0.85 });
      void ZSTEP; void annulus;
    }
  };
})();
