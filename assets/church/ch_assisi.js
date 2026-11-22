/* ch_assisi.js — 아시시 성 프란치스코 대성당(Basilica di San Francesco d'Assisi): 상부 성당 · 하부 성당 · 지하 묘소를 실제처럼 위아래로 겹쳐 짓는다.
   조사·설계: docs/church/interiors/assisi.md (조사 보고 §0~§8, 숫자는 [확인]/[추정]). 축척 60%(scalePercent 60 — §축척).
   좌표(앱 m): 입구 +z(실제 동쪽 파사드), 제대·후진 −z(실제 서쪽), +x = 북쪽(제대를 볼 때 오른쪽), −x = 남쪽.
   층(바닥 높이, 걷기 엔진 scene_logic levels — 같은 (x,z) 에 바닥이 여럿, 발 높이 + 한 걸음 아래의 가장 높은 바닥):
     지하 묘소 YC 0 · 하부 성당 YL 3.6 · 상부 성당 YU 10.2 (스폰 = 상부 성당 입구 안쪽).
   - 상부 성당: 단일 신랑 4베이(7.02m) + 교차부 + 트란셉트 + 다각 후진. 벽 아래부터 그려진 휘장 굽도리 → 프란치스코 전기 28칸 띠(추상 색면,
     칸마다 아틀라스 한 칸 — 실제 그림을 넣을 자리) → 통로 턱(보기만) → 2연창(13세기풍 추상 모자이크 유리) → 리브 궁륭(입구부터 박사·별·중재자·별, 교차부 복음사가).
   - 하부 성당: 낮고 어두운 넓은 신랑 + 측면 경당 아치 + 가로 나르텍스(남쪽 끝 = 아래 광장 문) + 트란셉트 + 반원 후진, 파란 별 궁륭, 무덤 위 교황 제대.
     신랑 한가운데 두 줄 계단(양옆)이 내려가 한곳(층계참)에서 만나 기도방 → 둥근 묘소.
     북쪽 트란셉트 서벽 문 → 후진 옆 계단(36단) → 테라스 복도 → 상부 성당 북쪽 트란셉트 서벽 문.
   - 지하 묘소: 하부 성당 주제대 바로 아래. 둥근 방 + 가운데 무덤 기둥(철 격자) + 모서리 벽감 4(네 동료) + 봉헌 등.
   권리(assisi.md §권리): 벽화·유리는 그리지 않는다(색면·추상 유리). 사진 질감은 사용자가 ChatGPT 로 만든 돌·별 궁륭·회벽(T-26~T-28)뿐. */
(function () {
  'use strict';

  // ---------- 치수(앱 m, 실제 × 0.6) ----------
  var SC = 0.6;
  var YC = 0, YL = 3.6, YU = 10.2;            // 묘소·하부·상부 바닥(묘소 천장 3.2 = 아바타 카메라가 들어갈 높이, 하부 궁륭 정점 YL+5.4, 판 1.2m)
  // 상부
  var UX = 3.9, UZE = 28.08, BAY = 7.02;     // 신랑 안폭의 반(13m), 입구 벽 안쪽 면 z, 베이(11.7m)
  var TX = 9.0, TZ0 = -7.5;                  // 트란셉트 안쪽 끝 x(30m), 교차부·트란셉트 서벽 z(12.5m)
  var APX = 3.3, APD = 4.0;                  // 후진 입구 반폭·깊이(11m·6.7m), 다각 5면
  var HD = 2.6 * SC, HF = 6.3 * SC, HG = 8.0 * SC;   // 휘장 굽도리 위·전기 띠 위·통로 턱 높이(바닥에서)
  var WS = 8.2 * SC, WT = 16.7 * SC, VS = 9.0 * SC, VC = 18.0 * SC;   // 창 아래·창 꼭대기·궁륭 받침·정점
  var PW = 2.3 * SC, PH = 2.7 * SC;          // 전기 그림 한 칸(230×270cm)
  var ROSE = { y: 8.8, r: 1.5 };             // 장미창(안쪽에서 정점 아래에 들게: 조사 16.5m 는 바깥 광장 기준 — §2-4)
  // 하부
  var LXN = 3.15, LBAY = 6.3, LZN = 18.9, LZX = 25.2, LXX = 8.4;   // 하부 신랑 안폭의 반(10.5m), 베이, 나르텍스 시작·끝 z, 나르텍스 끝 x
  var LTX = 7.2, LAR = 3.0;                  // 하부 트란셉트 끝 x(토막), 반원 후진 반지름
  var LVS = 2.4, LVR = 3.0;                  // 하부 궁륭 받침(바닥에서)·높이(정점 5.4m = 실제 약 9m)
  var CH = 2.0;                              // 경당 깊이
  // 묘소로 내려가는 두 줄 계단(신랑 한가운데, 양옆) → 층계참 → 기도방 → 둥근 방
  var WELL = { x0: 1.25, x1: 2.35, zTop: 4.2 + 18 * 0.38, zBot: 4.2, n: 18 };   // 18단(단 0.2 · 디딤 0.38 — 아바타 발 길이보다 길게: 발이 한 단에 다 놓인다)
  var LAND = { x: 2.35, z0: 2.0, z1: 4.2 }, PRAY = { x: 2.0, z0: -0.45, z1: 2.0 }, CRY = { x: 0, z: -3.75, r: 3.3, top: 3.2 };
  var TOMB = { hw: 0.75, h: 2.2 };
  // 하부 → 상부 계단(후진 옆 북쪽) · 테라스 복도
  var STR = { x0: 4.0, x1: 5.8, z0: -7.6, n: 36, run: 0.38 }, TER = { x0: 6.2, x1: 8.6, z0: -7.6 - 36 * 0.38 - 2.2, z1: -7.6 - 36 * 0.38 }, UDOOR = { x0: 6.4, x1: 8.4 }, LDOOR = { x0: 4.0, x1: 5.8 };
  STR.z1 = STR.z0 - STR.n * STR.run;   // -21.28
  var UAL = { x: 0, z: -1.6 }, LAL = { x: 0, z: -3.75 };   // 상부 주제대(1898년 교차부 앞으로), 하부 교황 제대(무덤 위)

  // (A) 레이아웃 — 순수 데이터
  var layout = {
    id: 'assisi', scalePercent: 60, ground: false,
    bounds: { x0: -10.0, x1: 10.0, z0: -24.0, z1: 28.6 },
    spawn: { x: 0, z: 26.3, r: 0, y: YU },
    // 여러 층(scene_logic levels): '가기' 시트의 층 줄 이름과 바로 가기 자리
    levels: [
      { id: 'upper', label_ko: '상부 성당', y: YU, go: { x: 0, z: 2.3 } },
      { id: 'lower', label_ko: '하부 성당', y: YL, go: { x: 0, z: 16.0 } },
      { id: 'crypt', label_ko: '지하 묘소(성 프란치스코 무덤)', y: YC, go: { x: 0, z: 1.2 } }
    ],
    seatGroups: [
      // 상부 성당 신랑: 의자(실제는 의자·긴 의자) 11줄 × 3 × 2, 줄 간격 1.9(앱 규약), 중앙 통로 1.9m
      { g: 'L', rows: 11, perRow: 3, origin: { x: -0.95, z: 4.2 }, dx: -0.65, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.35, 0.3], y: YU },
      { g: 'R', rows: 11, perRow: 3, origin: { x: 0.95, z: 4.2 }, dx: 0.65, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.35, 0.3], y: YU },
      // 하부 성당 신랑(계단 우물 뒤): 4줄 × 2 × 2. 맨 앞 가림판 없음(우물 입구를 막지 않게)
      { g: 'BL', rows: 4, perRow: 2, origin: { x: -1.0, z: 12.3 }, dx: -0.7, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.35, 0.35], y: YL, frontal: false },
      { g: 'BR', rows: 4, perRow: 2, origin: { x: 1.0, z: 12.3 }, dx: 0.7, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.35, 0.35], y: YL, frontal: false }
    ],
    candles: {
      stands: [
        { x: -3.3, z: 25.4, slots: 16, cols: 8, face: [1, 0], pitch: 0.2, step: 0.22, ystep: 0.25, y0: 0.85, reach: 1.8, fy: YU, label: '봉헌초(상부 성당)' },
        { x: 1.75, z: 0.75, slots: 12, cols: 6, face: [-1, 0], pitch: 0.18, step: 0.2, ystep: 0.22, y0: 0.8, reach: 1.8, fy: YC, label: '봉헌초(묘소)' }
      ]
    },
    fonts: [{ x: 2.45, z: 27.25, face: [0, -1], fy: YU }, { x: -7.5, z: 23.9, face: [1, 0], fy: YL }],
    // 십자가의 길: 실제 두 성당 벽은 벽화로 덮여 있고 14처 판 자리가 확인되지 않았다(assisi.md §6) → 걸지 않는다
    crossWay: { none: true },
    info: { name: '아시시 성 프란치스코 대성당', place: '이탈리아 아시시', builtYear: '1228–1253' }
  };
  ChurchLayouts.register(layout);

  // =====================================================================
  // 재질 — 사진 질감으로 바꿀 때는 이 표만 보면 된다(한 줄 = 한 질감).
  //   assisi_stone  T-26 수바시오 분홍 돌(사용자 ChatGPT, tex_pack_assisi.js)        → 벽 돌·기둥·리브·계단
  //   assisi_vault  T-27 파란 별 궁륭(사용자 ChatGPT)                                → 별 궁륭(상부 2·4베이·트란셉트, 하부 신랑)
  //   assisi_fresco T-28 빛바랜 회벽(사용자 ChatGPT)                                  → 벽 회벽·황토 궁륭·그림 칸 바탕
  //   assisi_cycle  프란치스코 전기 28칸 아틀라스(절차 생성 — 실제 그림 허락 뒤 같은 이름의 사진으로 바꾼다: 칸 배치는 cycleCell())
  //   assisi_drape  그려진 휘장 굽도리(절차 생성)   assisi_floor 분홍·흰 돌 바닥(절차 생성)
  //   같은 이름의 tex_assisi_*.jpg 가 묶음(tex_pack_assisi.js)에 있으면 생성을 건너뛴다(코드 변경 없음).
  // 층마다 따로 묶는다(상부 U·하부 L·묘소 C): 보는 층의 묶음만 그린다(levelVis).
  // =====================================================================
  var SURF = {
    as_stoneU: { photo: 'assisi_stone', tile: [2.4, 2.4], roughness: 0.82, normalScale: 0.7, envK: 0.7, fb: 'plaster', tint: 0xffffff },
    as_plasterU: { photo: 'assisi_fresco', tile: [3.2, 3.2], roughness: 0.92, normalScale: 0.3, envK: 0.6, fb: 'plaster', tint: 0xf4ead8 },
    as_ochreU: { photo: 'assisi_fresco', tile: [3.0, 3.0], roughness: 0.92, normalScale: 0.3, envK: 0.6, fb: 'plaster', tint: 0xf4dcb0 },
    as_vaultU: { photo: 'assisi_vault', tile: [3.2, 3.2], roughness: 0.9, normalScale: 0.25, envK: 0.6, fb: 'plaster', tint: 0xffffff },
    as_cycleU: { photo: 'assisi_cycle', tile: [1, 1], roughness: 0.93, normalScale: 0, envK: 0.5, fb: 'plaster', tint: 0xffffff },
    as_drapeU: { photo: 'assisi_drape', tile: [1, 1], roughness: 0.92, normalScale: 0, envK: 0.5, fb: 'plaster', tint: 0xffffff },
    as_floorU: { photo: 'assisi_floor', tile: [2.4, 2.4], roughness: 0.4, clearcoat: 0.3, ccRough: 0.3, normalScale: 0.2, envK: 0.9, fb: 'marble', tint: 0xffffff },
    as_stoneL: { photo: 'assisi_stone', tile: [2.4, 2.4], roughness: 0.85, normalScale: 0.7, envK: 0.5, fb: 'plaster', tint: 0xb59a88 },
    as_plasterL: { photo: 'assisi_fresco', tile: [3.0, 3.0], roughness: 0.93, normalScale: 0.3, envK: 0.5, fb: 'plaster', tint: 0xa08066 },
    as_vaultL: { photo: 'assisi_vault', tile: [2.6, 2.6], roughness: 0.9, normalScale: 0.25, envK: 0.5, fb: 'plaster', tint: 0xb8bcd0 },
    as_floorL: { photo: 'assisi_floor', tile: [2.4, 2.4], roughness: 0.55, clearcoat: 0.15, ccRough: 0.4, normalScale: 0.2, envK: 0.6, fb: 'marble', tint: 0xb8a898 },
    as_stoneC: { photo: 'assisi_stone', tile: [2.0, 2.0], roughness: 0.9, normalScale: 0.9, envK: 0.4, fb: 'plaster', tint: 0xb4a090 }
  };
  var LEVEL_SURF = { U: ['as_stoneU', 'as_plasterU', 'as_ochreU', 'as_vaultU', 'as_cycleU', 'as_drapeU', 'as_floorU'], L: ['as_stoneL', 'as_plasterL', 'as_vaultL', 'as_floorL'], C: ['as_stoneC'] };
  var GEN_TEX = ['assisi_cycle', 'assisi_drape', 'assisi_floor'];

  // 프란치스코 전기 28장면 — 순서(조사 §2-6, it.wiki): 북벽(제대 쪽 → 입구) 1~13(3·3·3·4) · 입구 안벽 14·15 · 남벽(입구 → 제대) 16~28(4·3·3·3).
  // 아틀라스 칸 i(0..27) = 장면 i+1. 제목은 앱에 쓰지 않는 참고(사실 서술).
  var CYCLE = ['소박한 사람의 경의', '망토를 줌', '무기의 꿈', '산 다미아노의 기도', '세속 재산 포기', '인노첸시오 3세의 꿈', '회칙 인준', '불수레 발현', '옥좌들의 환시', '아레초의 마귀 쫓음',
    '술탄 앞의 시험', '탈혼', '그레초의 구유', '샘의 기적', '새들에게 설교', '첼라노 기사의 죽음', '호노리오 3세 앞 설교', '아를 총회 발현', '오상', '죽음', '아우구스티노 수사와 주교의 환시',
    '오상 확인', '클라라의 작별', '시성', '그레고리오 9세의 꿈', '일레르다 사람 치유', '되살아난 여인의 고백', '이단자 피에트로 해방'];
  // 아틀라스: 2048×1200, 8칸 × 4줄, 칸 256×300(그림 비 230:270). 0..27 = 장면, 28 = 꼬인 기둥 띠, 29 = 그려진 까치발 띠
  var ATLAS = { w: 2048, h: 1200, cols: 8, rows: 4 };
  function cycleCell(i) { var c = i % ATLAS.cols, r = (i / ATLAS.cols) | 0; return { u0: c / ATLAS.cols, u1: (c + 1) / ATLAS.cols, v0: 1 - (r + 1) / ATLAS.rows, v1: 1 - r / ATLAS.rows }; }

  // 전기 28칸 자리(벽·칸 중심·바라보는 쪽). 베이 경계: 신랑 z 0·7.02·14.04·21.06·28.08
  function cyclePanels() {
    var out = [], b, k, n, zc;
    var NB = [3, 3, 3, 4];   // 북벽: 제대 쪽 베이(z 0..7) → 입구 쪽
    for (b = 0; b < 4; b++) { n = NB[b]; for (k = 0; k < n; k++) { zc = b * BAY + (k + 0.5) * BAY / n; out.push({ x: UX, z: zc, nx: -1, nz: 0, wall: 'N', bay: 4 - b }); } }
    out.push({ x: 2.65, z: UZE, nx: 0, nz: -1, wall: 'E', bay: 0 }); out.push({ x: -2.65, z: UZE, nx: 0, nz: -1, wall: 'E', bay: 0 });   // 입구 안벽: 14 = 문 북쪽, 15 = 남쪽
    var SB = [4, 3, 3, 3];   // 남벽: 입구 쪽 베이 → 제대 쪽
    for (b = 0; b < 4; b++) { n = SB[b]; for (k = 0; k < n; k++) { zc = UZE - b * BAY - (k + 0.5) * BAY / n; out.push({ x: -UX, z: zc, nx: 1, nz: 0, wall: 'S', bay: b + 1 }); } }
    out.forEach(function (p, i) { p.i = i; p.n = i + 1; p.title = CYCLE[i]; p.cell = cycleCell(i); p.y0 = YU + HD + (HF - HD - PH) / 2; p.y1 = p.y0 + PH; p.w = PW; });
    return out;
  }
  // 상부 궁륭(입구 쪽 베이 1 → 제대 쪽 4, 교차부): 박사·별·중재자·별·복음사가(조사 §2-3)
  var VAULTS = [
    { bay: 1, z0: 3 * BAY, z1: 4 * BAY, kind: 'doctors' }, { bay: 2, z0: 2 * BAY, z1: 3 * BAY, kind: 'stars' },
    { bay: 3, z0: BAY, z1: 2 * BAY, kind: 'intercessors' }, { bay: 4, z0: 0, z1: BAY, kind: 'stars' }, { bay: 0, z0: TZ0, z1: 0, kind: 'evangelists' }
  ];

  function ensureTextures(ctx) {
    var P = window.ChurchTexPack = window.ChurchTexPack || {};
    function miss(n) { return !P['tex_' + n + '.jpg']; }
    if (!GEN_TEX.some(miss)) return;
    var doc = window.document, probe = doc.createElement('canvas');
    if (!probe.toDataURL || !probe.toDataURL()) return;   // 시험용 가짜 캔버스(Node): 대체 질감 + 색조
    var rnd = ctx.rng(1228);
    function cv(w, h, draw) { var c = doc.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
    function put(n, c, q) { if (miss(n)) { try { P['tex_' + n + '.jpg'] = c.toDataURL('image/jpeg', q || 0.86); } catch (e) { /* 대체 질감 */ } } }
    function hex(c) { return '#' + ('00000' + c.toString(16)).slice(-6); }
    // 전기 28칸: 인물·장면 없는 프레스코 빛 색면(파란 하늘 띠·황토 건물 덩어리·갈색 수도복 덩어리를 닮은 색 배치만, 칸마다 다른 씨앗) + 그려진 틀
    put('assisi_cycle', cv(ATLAS.w, ATLAS.h, function (g, W, H) {
      var cw = W / ATLAS.cols, ch = H / ATLAS.rows;
      g.fillStyle = '#d8c3a0'; g.fillRect(0, 0, W, H);
      var SKY = ['#3c5e9a', '#4a6ea8', '#2f4f88', '#56709c'], EARTH = ['#c79a62', '#b8875a', '#d4b083', '#a8744c', '#cfa274', '#9c6a48'], ROBE = ['#6e5038', '#5d4430', '#7a5a3e', '#8a6a4a'], ACC = ['#9e3a2e', '#b04a36', '#d8c8a8', '#3f6a4a'];
      for (var i = 0; i < 28; i++) {
        var x0 = (i % ATLAS.cols) * cw, y0 = ((i / ATLAS.cols) | 0) * ch, r = ctx.rng(100 + i * 7);
        g.save(); g.beginPath(); g.rect(x0, y0, cw, ch); g.clip();
        var sky = SKY[i % SKY.length], hz = 0.38 + r() * 0.18;
        g.fillStyle = sky; g.fillRect(x0, y0, cw, ch * hz + 4);
        g.fillStyle = EARTH[(i * 3) % EARTH.length]; g.fillRect(x0, y0 + ch * hz, cw, ch);
        // 건물 덩어리(사각·박공 — 원작 구도와 무관한 배치)
        for (var k = 0; k < 3; k++) {
          var bx = x0 + cw * (r() * 0.7), by = y0 + ch * (0.2 + r() * 0.35), bw = cw * (0.18 + r() * 0.3), bh = ch * (0.25 + r() * 0.35);
          g.fillStyle = EARTH[Math.floor(r() * EARTH.length)]; g.fillRect(bx, by, bw, bh);
          g.fillStyle = 'rgba(80,50,30,0.25)'; g.fillRect(bx + bw * 0.85, by, bw * 0.15, bh);
          if (r() < 0.6) { g.beginPath(); g.moveTo(bx - 2, by); g.lineTo(bx + bw / 2, by - bh * 0.25); g.lineTo(bx + bw + 2, by); g.closePath(); g.fillStyle = ACC[0]; g.fill(); }
        }
        // 갈색 덩어리 몇(수도복 빛 색면, 형태 없음)
        for (k = 0; k < 2 + (i % 3); k++) {
          var mx = x0 + cw * (0.15 + r() * 0.7), my = y0 + ch * (0.55 + r() * 0.25);
          g.fillStyle = ROBE[Math.floor(r() * ROBE.length)]; g.beginPath(); g.ellipse(mx, my, cw * 0.06, ch * 0.13, 0, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = 'rgba(' + (200 + (r() * 40 | 0)) + ',180,140,0.18)'; g.fillRect(x0, y0, cw, ch);
        for (k = 0; k < 220; k++) { g.fillStyle = 'rgba(255,240,215,' + (r() * 0.12) + ')'; g.fillRect(x0 + r() * cw, y0 + r() * ch, 2 + r() * 5, 2 + r() * 5); }
        // 그려진 틀: 붉은 갈색 테 + 옅은 안쪽 선
        g.strokeStyle = '#7a3a2a'; g.lineWidth = 10; g.strokeRect(x0 + 5, y0 + 5, cw - 10, ch - 10);
        g.strokeStyle = 'rgba(240,225,190,0.7)'; g.lineWidth = 2; g.strokeRect(x0 + 12, y0 + 12, cw - 24, ch - 24);
        g.restore();
      }
      // 28: 꼬인 기둥(그려진 나선 띠) — 세로 띠 칸
      var cx0 = (28 % ATLAS.cols) * cw, cy0 = ((28 / ATLAS.cols) | 0) * ch;
      g.fillStyle = '#e6d6b8'; g.fillRect(cx0, cy0, cw, ch);
      for (var s = -8; s < 20; s++) { g.fillStyle = s % 2 ? '#b4513a' : '#ead8b4'; g.beginPath(); var yy = cy0 + s * ch / 10; g.moveTo(cx0, yy); g.lineTo(cx0 + cw, yy - ch / 6); g.lineTo(cx0 + cw, yy - ch / 6 + ch / 20); g.lineTo(cx0, yy + ch / 20); g.closePath(); g.fill(); }
      g.fillStyle = 'rgba(60,30,20,0.35)'; g.fillRect(cx0, cy0, cw * 0.12, ch); g.fillRect(cx0 + cw * 0.88, cy0, cw * 0.12, ch);
      // 29: 그려진 까치발(소용돌이 받침) 띠 — 가로 띠 칸
      var fx0 = (29 % ATLAS.cols) * cw, fy0 = ((29 / ATLAS.cols) | 0) * ch;
      g.fillStyle = '#c9a676'; g.fillRect(fx0, fy0, cw, ch);
      for (var q = 0; q < 4; q++) { g.fillStyle = '#7a4a32'; g.fillRect(fx0 + q * cw / 4 + cw / 16, fy0 + ch * 0.2, cw / 10, ch * 0.6); g.fillStyle = '#e8d4a8'; g.fillRect(fx0 + q * cw / 4 + cw / 16 + 3, fy0 + ch * 0.2, cw / 30, ch * 0.6); }
      g.fillStyle = '#5c3424'; g.fillRect(fx0, fy0, cw, ch * 0.12); g.fillRect(fx0, fy0 + ch * 0.88, cw, ch * 0.12);
    }), 0.84);
    // 그려진 휘장(굽도리): 크림 바탕에 늘어진 주름 세로 결 + 아래 술 + 붉은 위 띠. 한 장 = 가로 1.2m
    put('assisi_drape', cv(512, 256, function (g, W, H) {
      for (var x = 0; x < W; x++) {
        var f = 0.5 + 0.5 * Math.sin(x / W * Math.PI * 2 * 6), k = 0.78 + 0.22 * f;
        g.fillStyle = 'rgb(' + Math.round(230 * k) + ',' + Math.round(214 * k) + ',' + Math.round(180 * k) + ')'; g.fillRect(x, 0, 1, H);
      }
      for (var i = 0; i < 12; i++) { g.fillStyle = 'rgba(160,110,70,0.25)'; g.fillRect(i * W / 12 + W / 24, H * 0.18, 2, H * 0.7); }
      g.fillStyle = '#8e3a2c'; g.fillRect(0, 0, W, H * 0.09); g.fillStyle = '#d6b46a'; g.fillRect(0, H * 0.09, W, H * 0.025);
      for (var t = 0; t < 48; t++) { g.fillStyle = t % 2 ? '#a0502e' : '#d6b46a'; g.fillRect(t * W / 48, H * 0.9, W / 48 - 1, H * 0.1); }
      g.fillStyle = 'rgba(60,40,30,0.18)'; g.fillRect(0, H * 0.86, W, H * 0.04);
    }), 0.86);
    // 바닥: 분홍·흰 돌 마름모 격자(조사 §2-8 [추정] — 사진 확인 필요). 한 장 = 2.4m
    put('assisi_floor', cv(512, 512, function (g, W, H) {
      g.fillStyle = '#e9ddd0'; g.fillRect(0, 0, W, H);
      var n = 4, s = W / n;
      for (var j = 0; j <= n; j++) for (var i = 0; i <= n; i++) {
        var cx = i * s, cy = j * s, k = 0.94 + rnd() * 0.08;
        g.fillStyle = 'rgb(' + Math.round(214 * k) + ',' + Math.round(170 * k) + ',' + Math.round(158 * k) + ')';
        g.beginPath(); g.moveTo(cx, cy - s * 0.5); g.lineTo(cx + s * 0.5, cy); g.lineTo(cx, cy + s * 0.5); g.lineTo(cx - s * 0.5, cy); g.closePath(); g.fill();
      }
      for (var q = 0; q < 1600; q++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '255,250,240' : '120,90,80') + ',' + (rnd() * 0.08) + ')'; g.fillRect(rnd() * W, rnd() * H, 3, 3); }
      g.strokeStyle = 'rgba(120,100,90,0.45)'; g.lineWidth = 2;
      for (var d = -n; d <= 2 * n; d++) { g.beginPath(); g.moveTo(d * s - W, H + 0); g.lineTo(d * s + W, -H + 2 * H); g.stroke(); }
      for (var e = -n; e <= 2 * n; e++) { g.beginPath(); g.moveTo(e * s - s / 2, 0); g.lineTo(e * s - s / 2 - H, H); g.stroke(); g.beginPath(); g.moveTo(e * s - s / 2, 0); g.lineTo(e * s - s / 2 + H, H); g.stroke(); }
    }), 0.86);
  }
  function defineSurfaces(ctx) {
    Object.keys(SURF).forEach(function (k) {
      var d = SURF[k];
      ctx.defineSurface(k, { photo: d.photo, tile: d.tile, roughness: d.roughness, clearcoat: d.clearcoat, ccRough: d.ccRough, normalScale: d.normalScale, envK: d.envK, fb: d.fb, color: d.tint });
    });
  }

  // (B) 빌더
  ChurchBuilders['assisi'] = {
    layout: layout,
    // 시험·문서가 견주는 값
    heights: { crypt: YC, lower: YL, upper: YU }, upper: { x: UX, ze: UZE, bay: BAY, tx: TX, tz0: TZ0, dado: HD, band: HF, gallery: HG, sill: WS, winTop: WT, spring: VS, crown: VC },
    lower: { x: LXN, bay: LBAY, narthex: [LZN, LZX], xx: LXX, tx: LTX, spring: LVS, rise: LVR }, well: WELL, landing: LAND, pray: PRAY, crypt: CRY, tomb: TOMB, stair: STR, terrace: TER, upperDoor: UDOOR, lowerDoor: LDOOR,
    upperAltar: UAL, lowerAltar: LAL, rose: ROSE, cycle: cyclePanels, cycleTitles: CYCLE, atlas: ATLAS, cycleCell: cycleCell, vaults: VAULTS, levelSurfaces: LEVEL_SURF,
    // 여러 층 보이기(world.js): 보는 사람(아바타·카메라) 높이가 범위 안인 층의 묶음만 그린다
    levelVis: {
      levels: [{ id: 'U', y0: YU - 1.2, y1: 60 }, { id: 'L', y0: YL - 0.8, y1: YU - 0.3 }, { id: 'C', y0: -5, y1: YL - 0.2 }],
      items: { U: LEVEL_SURF.U.map(function (k) { return 'surf_' + k; }), L: LEVEL_SURF.L.map(function (k) { return 'surf_' + k; }), C: LEVEL_SURF.C.map(function (k) { return 'surf_' + k; }) }
    },
    thumb: { x: 0, z: 25.0, yaw: 0, pitch: 9, zoom: 1.0, hour: 11 },
    build: function (ctx) {
      var T = ctx.THREE, PI = Math.PI, low = ctx.quality === 'low', sqrt = Math.sqrt, cos = Math.cos, sin = Math.sin;
      ensureTextures(ctx);
      defineSurfaces(ctx);
      var B = {};
      Object.keys(SURF).forEach(function (k) { B[k] = ctx.surfBatch(k); });
      var solid = ctx.solid, metal = ctx.metalB, woodB = ctx.woodB, glow = ctx.glow;
      var sacred = ctx._.sacred || (ctx._.sacred = []);
      function V(c) { return c && c.isColor ? c : new T.Color(c); }
      function hdr(c, k) { return V(c).clone().multiplyScalar(k); }
      var RANGE = { U: { y0: YU - 0.3, y1: YU + 12 }, L: { y0: YL - 0.3, y1: YL + 5.6 }, C: { y0: YC - 0.5, y1: YC + 3.3 } };
      function level(id) { ctx.setColliderRange(RANGE[id]); }
      function col(x0, z0, x1, z1) { ctx.addCollider({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) }); }
      function colY(x0, z0, x1, z1, y0, y1) { ctx.addCollider({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0: y0, y1: y1 }); }
      // 원(중심 cx,cz, 반지름 r) 안을 z 띠로 나눈 바닥 구역. s0..s1 = 쓸 z 범위(−1..1 = 지름 전체, −1..0 = −z 쪽 반원)
      function circleZones(cx, cz, r, s0, s1, y) {
        var n = 16;
        for (var q = 0; q < n; q++) {
          var t0 = s0 + (s1 - s0) * q / n, t1 = s0 + (s1 - s0) * (q + 1) / n, tm = Math.max(Math.abs(t0), Math.abs(t1));
          var hw = r * Math.sqrt(Math.max(0, 1 - tm * tm)) - 0.05;
          if (hw > 0.2) zone(cx - hw, cx + hw, cz + r * t0, cz + r * t1, y);
        }
      }
      function zone(x0, x1, z0, z1, y) { ctx.floorZone({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y: y }); }
      function bx(surf, x0, x1, y0, y1, z0, z1, color, o) { var q = Object.assign({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: y0, y1: y1, z0: Math.min(z0, z1), z1: Math.max(z0, z1), color: color === undefined ? 0xffffff : color }, o || {}); if (surf) q.surf = surf; ctx.boxAABB(q); }
      // 바닥 판(위를 보는 사각) — 질감 묶음
      function flr(b, x0, x1, z0, z1, y, c) { b.addQuad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], c === undefined ? 0xffffff : c, [(x0 + x1) / 2, y + 5, (z0 + z1) / 2], { vary: 0 }); }
      function ceil(b, x0, x1, z0, z1, y, c) { b.addQuad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], c === undefined ? 0xffffff : c, [(x0 + x1) / 2, y - 5, (z0 + z1) / 2], { vary: 0 }); }
      // 세로 면(벽 안쪽에 겹쳐 붙이는 판): 점 a·b(xz) 사이, 높이 y0..y1, 법선 쪽 hint
      function vquad(b, ax, az, bx2, bz, y0, y1, nx, nz, c, uv) {
        b.addQuad([ax, y0, az], [bx2, y0, bz], [bx2, y1, bz], [ax, y1, az], c === undefined ? 0xffffff : c, [(ax + bx2) / 2 + nx * 3, (y0 + y1) / 2, (az + bz) / 2 + nz * 3], { vary: 0 }, uv);
      }

      // ------------------------------------------------------------ 기하 도우미(피렌체 빌더와 같은 첨두 곡선)
      function Pt(a, rise) {
        var R = (a * a + rise * rise) / (2 * a), cx = R - a, o = { a: a, rise: rise, R: R, cx: cx };
        o.f = function (u) { u = Math.abs(u); if (u > a) return 0; var v = R * R - (u + cx) * (u + cx); return v > 0 ? Math.sqrt(v) : 0; };
        o.arc = function (n) { var r = [], phA = Math.acos(Math.max(-1, Math.min(1, cx / R))); for (var p = 0; p <= n; p++) { var ph = phA * p / n; r.push({ u: Math.max(0, -cx + R * Math.cos(ph)), h: R * Math.sin(ph) }); } return r; };
        return o;
      }
      // 교차(늑골) 궁륭: 천장 높이 = y + max(fu(x), fv(z)). 칸 n×n 격자로 그린다(별·황토 질감 묶음), 리브 = 돌
      function crossVault(o) {
        var xc = (o.xa + o.xb) / 2, zc = (o.za + o.zb) / 2, au = (o.xb - o.xa) / 2, av = (o.zb - o.za) / 2, pu = Pt(au, o.rise), pv = Pt(av, o.rise);
        var n = o.n || 8, b = o.b, c = o.c === undefined ? 0xffffff : o.c, y = o.y;
        function H(x, z) { return y + Math.max(pu.f(x - xc), pv.f(z - zc)); }
        o.H = H;
        var hint = [xc, y - 6, zc];
        for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
          var x0 = o.xa + (o.xb - o.xa) * i / n, x1 = o.xa + (o.xb - o.xa) * (i + 1) / n, z0 = o.za + (o.zb - o.za) * j / n, z1 = o.za + (o.zb - o.za) * (j + 1) / n;
          // 대각선(리브 선)에서 접히도록 칸을 사분면 중심 쪽 대각으로 나눈다
          var A = [x0, H(x0, z0), z0], Bp = [x1, H(x1, z0), z0], Cp = [x1, H(x1, z1), z1], D = [x0, H(x0, z1), z1];
          var sameDiag = ((x0 + x1) / 2 - xc) * ((z0 + z1) / 2 - zc) > 0;
          if (sameDiag) b.addTris([A[0], A[1], A[2], Bp[0], Bp[1], Bp[2], Cp[0], Cp[1], Cp[2], A[0], A[1], A[2], Cp[0], Cp[1], Cp[2], D[0], D[1], D[2]], c, hint, { vary: 0 });
          else b.addTris([A[0], A[1], A[2], Bp[0], Bp[1], Bp[2], D[0], D[1], D[2], Bp[0], Bp[1], Bp[2], Cp[0], Cp[1], Cp[2], D[0], D[1], D[2]], c, hint, { vary: 0 });
        }
        var rb = o.rib, rc = o.ribC === undefined ? 0xe8d8c0 : o.ribC, rt = o.ribT || 0.2, nr = Math.max(4, n);
        if (rb) {
          // 대각 리브 4 + 벽 쪽 횡단 아치(앞뒤)
          [[o.xa, o.za], [o.xb, o.za], [o.xb, o.zb], [o.xa, o.zb]].forEach(function (cn) {
            for (var q = 0; q < nr; q++) {
              var t0 = q / nr, t1 = (q + 1) / nr, ax = cn[0] + (xc - cn[0]) * t0, az = cn[1] + (zc - cn[1]) * t0, bx3 = cn[0] + (xc - cn[0]) * t1, bz3 = cn[1] + (zc - cn[1]) * t1;
              rb.addBeam([ax, H(ax, az) - 0.06, az], [bx3, H(bx3, bz3) - 0.06, bz3], rt, rt * 1.2, rc, { vary: 0.02 });
            }
          });
          if (o.transverse !== false) [o.za, o.zb].forEach(function (zz) {
            for (var q = 0; q < nr; q++) { var xa2 = o.xa + (o.xb - o.xa) * q / nr, xb2 = o.xa + (o.xb - o.xa) * (q + 1) / nr; rb.addBeam([xa2, y + pu.f(xa2 - xc) - 0.06, zz], [xb2, y + pu.f(xb2 - xc) - 0.06, zz], rt * 1.3, rt * 1.6, rc, { vary: 0.02 }); }
          });
        }
        return o;
      }
      // 궁륭 면에 붙인 원판(메달리온): 원 둘레 점마다 궁륭 높이 − 3cm
      function vaultDisc(V0, b, cx, cz, r, color, seg) {
        seg = seg || 14;
        var c0 = [cx, V0.H(cx, cz) - 0.03, cz];
        for (var k = 0; k < seg; k++) {
          var a0 = k * 2 * PI / seg, a1 = (k + 1) * 2 * PI / seg, p0x = cx + cos(a0) * r, p0z = cz + sin(a0) * r, p1x = cx + cos(a1) * r, p1z = cz + sin(a1) * r;
          b.addTris([c0[0], c0[1], c0[2], p0x, V0.H(p0x, p0z) - 0.03, p0z, p1x, V0.H(p1x, p1z) - 0.03, p1z], color, [cx, c0[1] - 5, cz], { vary: 0 });
        }
      }
      // 아치 구멍이 있는 세로 벽 면(축 정렬): 면은 axis 'x'(x = 상수, z 를 따라) 또는 'z'(z = 상수). 구멍 = 반원·첨두 아치(문·경당 입구)
      function archFace(b, axis, at, s0, s1, y0, y1, holes, nrm, c) {
        // 구멍 둘레를 따라 세로 띠로 나눠 짓는다(아래 = 구멍 위 곡선, 위 = y1)
        var us = [s0, s1];
        holes.forEach(function (h) { var P2 = Pt(h.a, h.rise); us.push(h.c - h.a, h.c + h.a); P2.arc(10).forEach(function (q) { us.push(h.c - q.u, h.c + q.u); }); });
        us = us.filter(function (v) { return v >= s0 - 1e-6 && v <= s1 + 1e-6; }).sort(function (p, q) { return p - q; });
        function pnt(s, y) { return axis === 'x' ? [at, y, s] : [s, y, at]; }
        function hint(s, y) { return axis === 'x' ? [at + nrm * 3, y, s] : [s, y, at + nrm * 3]; }
        for (var i = 0; i < us.length - 1; i++) {
          var a = us[i], bq = us[i + 1]; if (bq - a < 1e-5) continue;
          var m = (a + bq) / 2, H0 = null;
          for (var k = 0; k < holes.length; k++) if (Math.abs(m - holes[k].c) < holes[k].a) H0 = holes[k];
          if (!H0) { b.addQuad(pnt(a, y0), pnt(bq, y0), pnt(bq, y1), pnt(a, y1), c, hint(m, (y0 + y1) / 2), { vary: 0 }); continue; }
          var P3 = Pt(H0.a, H0.rise), ya = H0.y + P3.f(a - H0.c), yb = H0.y + P3.f(bq - H0.c);
          b.addQuad(pnt(a, ya), pnt(bq, yb), pnt(bq, y1), pnt(a, y1), c, hint(m, (ya + y1) / 2), { vary: 0 });
          if (H0.y > y0 + 1e-3) b.addQuad(pnt(a, y0), pnt(bq, y0), pnt(bq, Math.min(H0.y0 === undefined ? y0 : H0.y0, y1)), pnt(a, Math.min(H0.y0 === undefined ? y0 : H0.y0, y1)), c, hint(m, y0), { vary: 0 });
        }
      }
      // 아치 안쪽 면(soffit): 깊이 d(법선 반대쪽)
      var curFloor = 0;
      function archSoffit(b, axis, at, hc, a, rise, ys, d, nrm, c) {
        var P4 = Pt(a, rise), A = P4.arc(8);
        [-1, 1].forEach(function (sg) {
          for (var q = 0; q < 8; q++) {
            var u0 = hc + sg * A[q].u, u1 = hc + sg * A[q + 1].u, h0 = ys + A[q].h, h1 = ys + A[q + 1].h;
            var p = axis === 'x' ? [[at, h0, u0], [at, h1, u1], [at - nrm * d, h1, u1], [at - nrm * d, h0, u0]] : [[u0, h0, at], [u1, h1, at], [u1, h1, at - nrm * d], [u0, h0, at - nrm * d]];
            b.addQuad(p[0], p[1], p[2], p[3], c, axis === 'x' ? [at - nrm * d / 2, ys - 2, hc] : [hc, ys - 2, at - nrm * d / 2], { vary: 0 });
          }
          // 문설주(세로 면)
          var uu = hc + sg * a, pj = axis === 'x' ? [[at, ys, uu], [at - nrm * d, ys, uu]] : [[uu, ys, at], [uu, ys, at - nrm * d]];
          var yb0 = curFloor;   // 문설주는 지금 층 바닥까지
          b.addQuad([pj[0][0], yb0, pj[0][2]], [pj[1][0], yb0, pj[1][2]], [pj[1][0], ys, pj[1][2]], [pj[0][0], ys, pj[0][2]], c, axis === 'x' ? [at - nrm * d / 2, ys / 2, hc] : [hc, ys / 2, at - nrm * d / 2], { vary: 0 });
        });
      }

      // =================================================================== 상부 성당(YU)
      level('U');
      curFloor = YU;
      var bS = B.as_stoneU, bP = B.as_plasterU, bO = B.as_ochreU, bV = B.as_vaultU, bF = B.as_floorU;
      // --- 바닥(구역 + 판)
      zone(-UX, UX, 0, UZE, YU); zone(-TX, TX, TZ0, 0, YU); zone(-APX, APX, TZ0 - APD, TZ0, YU);
      flr(bF, -UX, UX, 0, UZE, YU); flr(bF, -TX, TX, TZ0, 0, YU);
      var APV = [];   // 후진 다각형 꼭짓점(안쪽 면)
      for (var ak = 0; ak <= 5; ak++) { var aa = ak * PI / 5; APV.push([APX * cos(aa), TZ0 - APD * sin(aa)]); }
      for (ak = 0; ak < 5; ak++) bF.addTris([0, YU, TZ0, APV[ak][0], YU, APV[ak][1], APV[ak + 1][0], YU, APV[ak + 1][1]], 0xffffff, [0, YU + 5, TZ0 - 1], { vary: 0 });
      // --- 벽(진짜 창 구멍은 ctx.wall 이 뚫는다). 충돌체는 직접(상부 높이 범위)
      var WT0 = 0.6, WH = 11.2;
      function uwall(x0, z0, x1, z1, y0, h, surf) { ctx.wall({ x0: x0, z0: z0, x1: x1, z1: z1, y: y0 === undefined ? YU : y0, h: h || WH, t: WT0, surf: surf || 'as_plasterU', color: 0xffffff, collide: false, plinth: false, crown: false }); }
      uwall(UX + 0.3, 0, UX + 0.3, UZE + 0.6); uwall(-UX - 0.3, 0, -UX - 0.3, UZE + 0.6);
      uwall(-UX - 0.6, UZE + 0.3, UX + 0.6, UZE + 0.3);
      [1, -1].forEach(function (sx) {
        uwall(sx * UX, 0.3, sx * (TX + 0.6), 0.3);                    // 트란셉트 동벽
        uwall(sx * (TX + 0.3), 0.6, sx * (TX + 0.3), TZ0 - 0.6);      // 트란셉트 끝벽
        if (sx > 0) {   // 북쪽 트란셉트 서벽: 테라스 복도 문(UDOOR)
          uwall(APX, TZ0 - 0.3, UDOOR.x0, TZ0 - 0.3); uwall(UDOOR.x1, TZ0 - 0.3, TX + 0.6, TZ0 - 0.3);
          uwall(UDOOR.x0, TZ0 - 0.3, UDOOR.x1, TZ0 - 0.3, YU + 2.6, WH - 2.6);
        } else uwall(-APX, TZ0 - 0.3, -(TX + 0.6), TZ0 - 0.3);
      });
      for (ak = 0; ak < 5; ak++) {   // 후진 5면(바깥으로 0.3 물린 중심선)
        var pa = APV[ak], pb = APV[ak + 1], ex = pb[0] - pa[0], ez = pb[1] - pa[1], el = sqrt(ex * ex + ez * ez), nx0 = ez / el, nz0 = -ex / el;
        if (nx0 * (0 - (pa[0] + pb[0]) / 2) + nz0 * (TZ0 - 1 - (pa[1] + pb[1]) / 2) > 0) { nx0 = -nx0; nz0 = -nz0; }   // 바깥쪽
        uwall(pa[0] + nx0 * 0.3 - ex / el * 0.15, pa[1] + nz0 * 0.3 - ez / el * 0.15, pb[0] + nx0 * 0.3 + ex / el * 0.15, pb[1] + nz0 * 0.3 + ez / el * 0.15);
        for (var ci = 0; ci <= 4; ci++) { var tt = ci / 4; ctx.addCollider({ x: pa[0] + ex * tt + nx0 * 0.45, z: pa[1] + ez * tt + nz0 * 0.45, r: 0.45 }); }
      }
      col(UX, 0, UX + 0.9, UZE + 0.9); col(-UX - 0.9, 0, -UX, UZE + 0.9); col(-UX - 0.9, UZE, UX + 0.9, UZE + 0.9);
      [1, -1].forEach(function (sx) {
        col(sx * UX, 0, sx * (TX + 0.9), 0.9); col(sx * TX, TZ0 - 0.9, sx * (TX + 0.9), 0.9);
        if (sx > 0) { col(APX, TZ0 - 0.9, UDOOR.x0, TZ0); col(UDOOR.x1, TZ0 - 0.9, TX + 0.9, TZ0); }
        else col(-APX, TZ0 - 0.9, -(TX + 0.9), TZ0);
      });
      // 교차부 네 모서리 다발 기둥(보이는 몸 + 충돌)
      [[UX, 0], [-UX, 0], [UX, TZ0], [-UX, TZ0]].forEach(function (p) {
        bx('as_stoneU', p[0] - 0.35, p[0] + 0.35, YU, YU + VS, p[1] - 0.35, p[1] + 0.35);
        for (var q = 0; q < 4; q++) ctx.cyl({ x: p[0] + (q % 2 ? 0.36 : -0.36), y: YU, z: p[1] + (q < 2 ? 0.36 : -0.36), r: 0.1, h: VS, seg: 6, surf: 'as_stoneU', color: 0xf2e6da });
        ctx.addCollider({ x0: p[0] - 0.5, x1: p[0] + 0.5, z0: p[1] - 0.5, z1: p[1] + 0.5 });
      });
      // 신랑 베이 경계의 벽 다발 기둥(벽에 붙은 반기둥) — 리브 받침
      [BAY, 2 * BAY, 3 * BAY].forEach(function (z) {
        [1, -1].forEach(function (sx) {
          bx('as_stoneU', sx * (UX - 0.22), sx * UX, YU + HD, YU + VS, z - 0.25, z + 0.25, 0xf4e6d8);
          ctx.cyl({ x: sx * (UX - 0.14), y: YU + HD, z: z, r: 0.12, h: VS - HD, seg: 8, surf: 'as_stoneU', color: 0xf6eadc });
        });
      });

      // --- 벽 장식: 휘장 굽도리 · 전기 28칸 띠 · 까치발 띠 · 통로 턱(보기만)
      var bD = B.as_drapeU, bC = B.as_cycleU, D0 = 0.018;
      function drape(ax, az, bx2, bz, nx, nz) {
        var len = Math.hypot(bx2 - ax, bz - az), u1 = len / 1.2;
        vquad(bD, ax + nx * D0, az + nz * D0, bx2 + nx * D0, bz + nz * D0, YU, YU + HD, nx, nz, 0xffffff, [0, 0, u1, 0, u1, 1, 0, 1]);
      }
      drape(UX, 0.4, UX, UZE, -1, 0); drape(-UX, UZE, -UX, 0.4, 1, 0);
      drape(UX, UZE, 1.45, UZE, 0, -1); drape(-1.45, UZE, -UX, UZE, 0, -1);
      // 전기 띠 바탕(붉은 갈색 그려진 틀 색) + 까치발 띠(아틀라스 29) + 그림 칸(아틀라스 0..27) + 꼬인 기둥(아틀라스 28)
      var cellC = cycleCell(28), cellF = cycleCell(29);
      function band(ax, az, bx2, bz, nx, nz) {
        vquad(bO, ax + nx * D0, az + nz * D0, bx2 + nx * D0, bz + nz * D0, YU + HD, YU + HF, nx, nz, 0x8a4a34);
        var len = Math.hypot(bx2 - ax, bz - az), rep = Math.max(1, Math.round(len / 1.4));
        for (var r = 0; r < rep; r++) {
          var t0 = r / rep, t1 = (r + 1) / rep;
          vquad(bC, ax + (bx2 - ax) * t0 + nx * 0.026, az + (bz - az) * t0 + nz * 0.026, ax + (bx2 - ax) * t1 + nx * 0.026, az + (bz - az) * t1 + nz * 0.026, YU + HF, YU + HF + 0.42, nx, nz, 0xffffff,
            [cellF.u0, cellF.v0, cellF.u1, cellF.v0, cellF.u1, cellF.v1, cellF.u0, cellF.v1]);
        }
      }
      band(UX, 0.4, UX, UZE, -1, 0); band(-UX, UZE, -UX, 0.4, 1, 0); band(UX, UZE, 1.45, UZE, 0, -1); band(-1.45, UZE, -UX, UZE, 0, -1);
      var PAN = cyclePanels();
      PAN.forEach(function (p) {
        var ux = -p.nz, uz = p.nx, hw = p.w / 2, d = 0.034;   // 벽을 따라가는 방향(법선의 오른쪽)
        var ax = p.x - ux * hw + p.nx * d, az = p.z - uz * hw + p.nz * d, bx3 = p.x + ux * hw + p.nx * d, bz3 = p.z + uz * hw + p.nz * d, c = p.cell;
        // u 가 그림 왼쪽→오른쪽이 되게(보는 사람 기준): 법선을 등지고 볼 때 오른쪽 = (−nz, nx) 의 반대
        vquad(bC, bx3, bz3, ax, az, p.y0, p.y1, p.nx, p.nz, 0xffffff, [c.u0, c.v0, c.u1, c.v0, c.u1, c.v1, c.u0, c.v1]);
        // 칸 양옆 꼬인 기둥(그려진 띠)
        [-1, 1].forEach(function (sg) {
          var cxp = p.x + ux * sg * (hw + 0.13) + p.nx * d, czp = p.z + uz * sg * (hw + 0.13) + p.nz * d;
          vquad(bC, cxp - ux * 0.07, czp - uz * 0.07, cxp + ux * 0.07, czp + uz * 0.07, p.y0 - 0.05, p.y1 + 0.05, p.nx, p.nz, 0xffffff, [cellC.u0, cellC.v0, cellC.u1, cellC.v0, cellC.u1, cellC.v1, cellC.u0, cellC.v1]);
        });
      });
      // 통로 턱(ballatoio, 실제 약 8m): 창 아래를 따라 도는 좁은 턱 + 낮은 난간 — 보기만(걷지 않는다)
      function ledge(ax, az, bx2, bz, nx, nz) {
        var x0 = Math.min(ax, bx2), x1 = Math.max(ax, bx2), z0 = Math.min(az, bz), z1 = Math.max(az, bz);
        if (nx) { bx('as_stoneU', ax, ax + nx * 0.42, YU + HG - 0.16, YU + HG, z0, z1, 0xf0e2d0); bx('as_stoneU', ax + nx * 0.38, ax + nx * 0.44, YU + HG, YU + HG + 0.5, z0, z1, 0xe6d6c2); }
        else { bx('as_stoneU', x0, x1, YU + HG - 0.16, YU + HG, az, az + nz * 0.42, 0xf0e2d0); bx('as_stoneU', x0, x1, YU + HG, YU + HG + 0.5, az + nz * 0.38, az + nz * 0.44, 0xe6d6c2); }
      }
      ledge(UX, 0.4, UX, UZE, -1, 0); ledge(-UX, 0.4, -UX, UZE, 1, 0); ledge(-UX, UZE, UX, UZE, 0, -1);
      [1, -1].forEach(function (sx) { ledge(sx * TX, TZ0 + 0.4, sx * TX, -0.4, -sx, 0); });
      // 위쪽 벽: 창 양옆 구약·신약 2단 자리(색면 판 — 그림 없음)
      [0.5, 1.5, 2.5, 3.5].forEach(function (k) {
        [1, -1].forEach(function (sx) {
          [-1, 1].forEach(function (sg) {
            var zc = k * BAY + sg * 2.25;
            [[YU + HG + 0.75, YU + HG + 2.15], [YU + HG + 2.45, YU + HG + 3.85]].forEach(function (yy, ri) {
              vquad(bO, sx * (UX - 0.02), zc - sx * 0.85, sx * (UX - 0.02), zc + sx * 0.85, yy[0], yy[1], -sx, 0, ri ? 0xf6e2c6 : 0xeed6b6);
            });
          });
        });
      });

      // --- 창: 신랑 2연창 8 · 트란셉트 끝 큰 창 2 · 후진 3 + 장미창(13세기풍 추상 모자이크 유리, 실제 창 구도 없음)
      var ANCH = []; if (ctx._) ctx._.glassAnchors = ANCH;
      function gWin(key, o) {
        o.glass = 'assisi_medieval'; o.key = key; o.pattern = o.pattern || 'lancet'; o.top = 'pointed';
        var sp = ctx.window(o), F = sp.F, rise = o.w * 0.72;
        ANCH.push({ key: key, kind: 'glass', x: o.x + F.nx * 0.04, y: o.y + (o.h + rise) / 2, z: o.z + F.nz * 0.04, nx: F.nx, nz: F.nz, yaw: Math.atan2(F.nx, F.nz), w: o.w, h: o.h + rise, sill: o.y, spring: o.y + o.h, apex: o.y + o.h + rise, lights: 2, photoH: 0, shape: 'pointed' });
      }
      var WWIN = 1.5, WHH = WT - WS - WWIN * 0.72;
      for (var nb = 0; nb < 4; nb++) {
        var zc0 = (nb + 0.5) * BAY;
        gWin('naveN_b' + (4 - nb), { x: UX, z: zc0, y: YU + WS, face: [-1, 0], w: WWIN, h: WHH, seed: 3 + nb, beamReach: 9 });
        gWin('naveS_b' + (4 - nb), { x: -UX, z: zc0, y: YU + WS, face: [1, 0], w: WWIN, h: WHH, seed: 11 + nb, beamReach: 9 });
      }
      gWin('transN', { x: TX, z: TZ0 / 2, y: YU + 4.6, face: [-1, 0], w: 2.2, h: 3.6, seed: 21, beamReach: 8 });
      gWin('transS', { x: -TX, z: TZ0 / 2, y: YU + 4.6, face: [1, 0], w: 2.2, h: 3.6, seed: 22, beamReach: 8 });
      [1, 2, 3].forEach(function (k) {
        var pa2 = APV[k], pb2 = APV[k + 1], mx = (pa2[0] + pb2[0]) / 2, mz = (pa2[1] + pb2[1]) / 2, ex2 = pb2[0] - pa2[0], ez2 = pb2[1] - pa2[1], el2 = Math.hypot(ex2, ez2), fnx = -ez2 / el2, fnz = ex2 / el2;
        if (fnx * (0 - mx) + fnz * (TZ0 - mz) < 0) { fnx = -fnx; fnz = -fnz; }
        gWin('apse_' + k, { x: mx, z: mz, y: YU + 4.0, face: [fnx, fnz], w: 1.05, h: 3.4, seed: 30 + k, beam: false });
      });
      var rs = ctx.rose({ x: 0, y: YU + ROSE.y, z: UZE, face: [0, -1], r: ROSE.r, petals: 12, glass: 'assisi_medieval', key: 'rose', seed: 41, beam: false });
      ANCH.push({ key: 'rose', kind: 'glass', x: 0, y: YU + ROSE.y, z: UZE - 0.04, nx: 0, nz: -1, yaw: Math.atan2(0, -1), w: ROSE.r * 2, h: ROSE.r * 2, sill: YU + ROSE.y - ROSE.r, spring: YU + ROSE.y, apex: YU + ROSE.y + ROSE.r, lights: 1, photoH: 0, shape: 'circle' });
      void rs;

      // --- 궁륭: 신랑 4베이 · 교차부 · 트란셉트 팔 · 후진
      var VN = low ? 6 : 10, VY = YU + VS, VR = VC - VS, MED = { doctors: 0x2c3f78, intercessors: 0x2e4a86, evangelists: 0x24386e };
      VAULTS.forEach(function (v) {
        var starry = v.kind === 'stars';
        var V1 = crossVault({ xa: -UX, xb: UX, za: v.z0, zb: v.z1, y: VY, rise: VR, n: VN, b: starry ? bV : bO, c: starry ? 0xffffff : 0xfff0dc, rib: bS, ribC: 0xf0e0cc, transverse: true });
        if (!starry) {
          // 그림 궁륭 자리: 네 칸에 둥근 틀 하나씩(파란 바탕 + 금빛 테 — 인물 없음). 1997년 무너진 박사 궁륭 자리도 같은 색면
          var au = UX / 2, av = (v.z1 - v.z0) / 4, zc1 = (v.z0 + v.z1) / 2;
          [[au, 0], [-au, 0], [0, av], [0, -av]].forEach(function (o) {
            vaultDisc(V1, metal, o[0], zc1 + o[1], v.kind === 'evangelists' ? 0.95 : 0.85, 0xc9a24a, 16);
            vaultDisc({ H: function (x, z) { return V1.H(x, z) - 0.02; } }, solid, o[0], zc1 + o[1], v.kind === 'evangelists' ? 0.82 : 0.72, MED[v.kind], 16);
          });
        }
      });
      [1, -1].forEach(function (sx) { crossVault({ xa: sx > 0 ? UX : -TX, xb: sx > 0 ? TX : -UX, za: TZ0, zb: 0, y: VY, rise: VR, n: VN, b: bV, c: 0xffffff, rib: bS, ribC: 0xf0e0cc, transverse: false }); });
      (function apseVault() {
        var apex = [0, YU + VC - 0.4, TZ0 - 0.3];
        for (var k = 0; k < 5; k++) {
          var pa3 = APV[k], pb3 = APV[k + 1], nn = 4;
          for (var q = 0; q < nn; q++) {   // 면마다 위로 갈수록 좁아지는 띠(살짝 부푼 반돔)
            var t0 = q / nn, t1 = (q + 1) / nn, lift0 = sin(t0 * PI / 2), lift1 = sin(t1 * PI / 2);
            function P5(p, t, lf) { return [p[0] + (apex[0] - p[0]) * t, YU + VS + (apex[1] - YU - VS) * lf, p[1] + (apex[2] - p[1]) * t]; }
            var A1 = P5(pa3, t0, lift0), B1 = P5(pb3, t0, lift0), C1 = P5(pb3, t1, lift1), D1 = P5(pa3, t1, lift1);
            bV.addTris([A1[0], A1[1], A1[2], B1[0], B1[1], B1[2], C1[0], C1[1], C1[2], A1[0], A1[1], A1[2], C1[0], C1[1], C1[2], D1[0], D1[1], D1[2]], 0xffffff, [0, YU + 3, TZ0 - 1.5], { vary: 0 });
          }
          bS.addBeam([pa3[0], YU + VS, pa3[1]], [apex[0], apex[1], apex[2]], 0.18, 0.22, 0xf0e0cc, { vary: 0.02 });
          // 면 벽 위쪽(궁륭 받침까지)과 받침 위 띠
        }
      })();
      // 교차부 앞뒤·트란셉트 입구 큰 횡단 아치(돌)
      [0, TZ0].forEach(function (zz) { var P6 = Pt(UX, VR); var A6 = P6.arc(10); for (var q = 0; q < 10; q++) [-1, 1].forEach(function (sg) { bS.addBeam([sg * A6[q].u, VY + A6[q].h - 0.1, zz], [sg * A6[q + 1].u, VY + A6[q + 1].h - 0.1, zz], 0.36, 0.5, 0xf2e4d2, { vary: 0.02 }); }); });

      // --- 제단·교황좌·성가대석
      // 주제대: 두 단(0.17 × 2), 코스마테스크 상감 띠(금·붉은 색 띠), 축성 1253 — 1898년 교차부 앞으로 옮김(조사 §2-8)
      ctx.steps({ x0: UAL.x - 1.6, x1: UAL.x + 1.6, z0: UAL.z - 1.6, z1: UAL.z + 1.6, y0: YU, y1: YU + 0.34, n: 2, dir: [0, -1], surf: 'as_stoneU', color: 0xf0e4d8 });
      ctx.altar({ x: UAL.x, z: UAL.z, y: YU + 0.34, w: 2.0, d: 1.2, h: 1.0, style: 'block', color: 0xf2ece2, candles: 2 });
      ctx.box({ x: UAL.x, y: YU + 0.62, z: UAL.z + 0.62, w: 1.7, h: 0.06, d: 0.02, color: 0xa8342c, mat: 'solid' });
      ctx.box({ x: UAL.x, y: YU + 0.74, z: UAL.z + 0.62, w: 1.7, h: 0.04, d: 0.02, color: 0xd9b45a });
      sacred.push({ k: 'altar', x: UAL.x, z: UAL.z, w: 2.0, d: 1.2 });
      // 교황좌: 후진 한가운데 높은 단(3단) 위 돌 의자 + 붉은 기둥 둘이 받치는 삼각 박공 닫집(조사 §2-8)
      var TH = { z: TZ0 - APD + 0.75 };
      for (var ts = 0; ts < 3; ts++) bx('as_stoneU', -0.9 + ts * 0.15, 0.9 - ts * 0.15, YU + ts * 0.18, YU + (ts + 1) * 0.18, TH.z - 0.5, TH.z + 0.9 - ts * 0.25, 0xeadccb);
      var ty = YU + 0.54;
      bx('as_stoneU', -0.45, 0.45, ty, ty + 0.45, TH.z - 0.25, TH.z + 0.3, 0xf2e8da);                     // 자리
      bx('as_stoneU', -0.45, 0.45, ty + 0.45, ty + 1.25, TH.z - 0.32, TH.z - 0.2, 0xf2e8da);              // 등받이
      [-1, 1].forEach(function (sg) { bx('as_stoneU', sg * 0.45 - 0.06, sg * 0.45 + 0.06, ty + 0.45, ty + 0.75, TH.z - 0.25, TH.z + 0.3, 0xe6d8c6); ctx.cyl({ x: sg * 0.58, y: ty, z: TH.z + 0.25, r: 0.07, h: 1.75, seg: 8, color: 0x9a3a32, mat: 'gloss' }); });
      ctx.box({ x: 0, y: ty + 1.75, z: TH.z, w: 1.4, h: 0.12, d: 0.75, color: 0xeadccb, surf: 'as_stoneU' });
      solid.addTris([-0.7, ty + 1.87, TH.z + 0.3, 0.7, ty + 1.87, TH.z + 0.3, 0, ty + 2.35, TH.z + 0.3], 0xe8d8c4, [0, ty + 2, TH.z + 3]);
      solid.addTris([-0.66, ty + 1.9, TH.z + 0.31, 0.66, ty + 1.9, TH.z + 0.31, 0, ty + 2.28, TH.z + 0.31], 0xb34a3a, [0, ty + 2, TH.z + 3]);
      ctx.addCollider({ x0: -1.0, x1: 1.0, z0: TH.z - 0.6, z1: TH.z + 1.0 });
      sacred.push({ k: 'throne', x: 0, z: TH.z, w: 1.8, d: 1.6 });
      // 성가대석(1491~1501, 102석): 후진 다섯 면 + 트란셉트 서벽을 따라 두른 나무 줄(좌석 하나하나는 생략)
      var WOOD = 0x6a4428, WOODL = 0x8a5e3a;
      function stalls(ax, az, bx2, bz, nx, nz) {
        var len = Math.hypot(bx2 - ax, bz - az), ux = (bx2 - ax) / len, uz = (bz - az) / len, cx = (ax + bx2) / 2 + nx * 0.4, cz = (az + bz) / 2 + nz * 0.4, ry = Math.atan2(-uz, ux);
        ctx.box({ x: cx, y: YU, z: cz, w: len, h: 0.45, d: 0.6, ry: ry, color: WOODL, mat: 'wood' });
        ctx.box({ x: cx - nx * 0.26, y: YU, z: cz - nz * 0.26, w: len, h: 2.1, d: 0.1, ry: ry, color: WOOD, mat: 'wood' });
        ctx.box({ x: cx - nx * 0.15, y: YU + 2.1, z: cz - nz * 0.15, w: len, h: 0.12, d: 0.35, ry: ry, color: WOOD, mat: 'wood' });
        for (var q = 0; q <= Math.floor(len / 0.65); q++) { var t = q * 0.65 - len / 2; ctx.box({ x: cx + ux * t - nx * 0.05, y: YU + 0.45, z: cz + uz * t - nz * 0.05, w: 0.05, h: 0.5, d: 0.55, ry: ry, color: WOOD, mat: 'wood' }); }
      }
      for (ak = 0; ak < 5; ak++) {
        var p0 = APV[ak], p1 = APV[ak + 1], exq = p1[0] - p0[0], ezq = p1[1] - p0[1], elq = Math.hypot(exq, ezq), inx = -ezq / elq, inz = exq / elq;
        if (inx * (0 - p0[0]) + inz * (TZ0 - 1 - p0[1]) < 0) { inx = -inx; inz = -inz; }
        if (ak === 2) continue;   // 가운데 면은 교황좌
        stalls(p0[0], p0[1], p1[0], p1[1], inx, inz);
      }
      stalls(APX + 0.2, TZ0, UDOOR.x0 - 0.2, TZ0, 0, 1); stalls(UDOOR.x1 + 0.15, TZ0, TX - 0.1, TZ0, 0, 1); stalls(-APX - 0.2, TZ0, -TX + 0.1, TZ0, 0, 1);
      col(APX + 0.2, TZ0, UDOOR.x0 - 0.2, TZ0 + 0.8); col(UDOOR.x1 + 0.15, TZ0, TX, TZ0 + 0.8); col(-TX, TZ0, -APX - 0.2, TZ0 + 0.8);
      // 설교단(14세기, 신랑과 왼쪽 트란셉트가 만나는 자리): 남쪽 트란셉트 동벽 앞(교차부 옆 길을 막지 않게)
      ctx.pulpit({ x: -5.3, z: -0.6, y: YU, ry: 0, h: 1.3, style: 'tall', color: 0xe8dccb });
      // 의자(신랑)·초·성수대·정문
      ctx.renderSeats({ id: layout.id, seatGroups: layout.seatGroups.slice(0, 2) }, 'chair', { surf: null, wood: 0x7a5232, seat: 0x7e5534, back: 0x6a4428, kneelerColor: 0x5a3a2a });
      ctx.candleStand(0, { wood: 0x4a2e1e });
      ctx.holyFont({ x: layout.fonts[0].x, z: layout.fonts[0].z, y: YU });
      // 정문(파사드 쌍문, 위 광장 쪽): 닫힌 나무 겹문 + 돌 틀(보기만)
      (function door(zf) {
        vquad(woodB, 1.1, zf - 0.03, -1.1, zf - 0.03, YU, YU + 3.3, 0, -1, 0x5a3420);
        vquad(woodB, 0.05, zf - 0.06, -0.05, zf - 0.06, YU, YU + 3.3, 0, -1, 0x3a2216);
        bx('as_stoneU', -1.45, -1.1, YU, YU + 3.6, zf - 0.12, zf, 0xe8dcc8); bx('as_stoneU', 1.1, 1.45, YU, YU + 3.6, zf - 0.12, zf, 0xe8dcc8); bx('as_stoneU', -1.45, 1.45, YU + 3.3, YU + 3.75, zf - 0.12, zf, 0xe8dcc8);
      })(UZE);
      // 테라스 복도로 나가는 문(북쪽 트란셉트 서벽): 열린 문틀
      bx('as_stoneU', UDOOR.x0 - 0.15, UDOOR.x0, YU, YU + 2.75, TZ0 - 0.6, TZ0, 0xe8dcc8); bx('as_stoneU', UDOOR.x1, UDOOR.x1 + 0.15, YU, YU + 2.75, TZ0 - 0.6, TZ0, 0xe8dcc8);
      bx('as_stoneU', UDOOR.x0 - 0.15, UDOOR.x1 + 0.15, YU + 2.6, YU + 2.75, TZ0 - 0.6, TZ0, 0xe8dcc8);
      zone(UDOOR.x0, UDOOR.x1, TZ0 - 0.6, TZ0, YU);
      bF.addQuad([UDOOR.x0, YU, TZ0], [UDOOR.x1, YU, TZ0], [UDOOR.x1, YU, TZ0 - 0.6], [UDOOR.x0, YU, TZ0 - 0.6], 0xffffff, [UDOOR.x0, YU + 5, TZ0], { vary: 0 });

      // =================================================================== 하부 성당(YL)
      level('L');
      curFloor = YL;
      var lS = B.as_stoneL, lP = B.as_plasterL, lV = B.as_vaultL, lF = B.as_floorL;
      // --- 바닥: 신랑(우물 두 곳 빼고) · 나르텍스 · 교차부·트란셉트 · 후진
      var wz0 = WELL.zBot, wz1 = WELL.zTop;
      [[-LXN, LXN, 0, wz0], [-LXN, LXN, wz1, LZN], [-LXN, -WELL.x1, wz0, wz1], [-WELL.x0, WELL.x0, wz0, wz1], [WELL.x1, LXN, wz0, wz1],
        [-LXX, LXX, LZN, LZX], [-LTX, LTX, TZ0, 0]].forEach(function (r) { zone(r[0], r[1], r[2], r[3], YL); flr(lF, r[0], r[1], r[2], r[3], YL); });
      circleZones(0, TZ0, LAR, -1, 0, YL); flr(lF, -LAR, LAR, TZ0 - LAR, TZ0, YL);   // 반원 후진: 원 안 띠(벽 밖 흙 속은 바닥이 아니다)
      // 하부 궁륭 위 판(상부 바닥 바로 밑까지): 하부의 천장 너머(햇빛을 막는다). 윗면은 상부 바닥판 2cm 아래
      bx('as_stoneL', -LXX - 0.6, LXX + 0.6, YL + LVS + LVR, YU - 0.02, -10.8, LZX + 0.6, 0x8a7a70);
      // --- 신랑 옆벽: 베이마다 경당 아치(어두운 감실 — 걷지 않음) + 낮고 굵은 기둥
      var LV = YL + LVS;
      [1, -1].forEach(function (sx) {
        for (var b2 = 0; b2 < 3; b2++) {
          var z0 = b2 * LBAY, z1 = (b2 + 1) * LBAY, zc = (z0 + z1) / 2, a = LBAY / 2 - 0.45, xs = sx * LXN;
          archFace(lP, 'x', xs, z0, z1, YL, LV + LVR + 0.1, [{ c: zc, a: a, rise: 1.4, y: YL + 1.9 }], -sx, 0xd8c2a8);
          archSoffit(lS, 'x', xs, zc, a, 1.4, YL + 1.9, 0.45, -sx, 0xb8a090);
          // 경당 안(깊이 CH): 뒷벽·옆벽·천장·바닥(보기만), 작은 제대 + 어스름 등
          var xb = sx * (LXN + 0.45 + CH);
          vquad(lP, xb, z0 + 0.45, xb, z1 - 0.45, YL, YL + 3.3, -sx, 0, 0x7a6252);
          vquad(lP, xs + sx * 0.45, z0 + 0.45, xb, z0 + 0.45, YL, YL + 3.3, 0, 1, 0x6e5848); vquad(lP, xs + sx * 0.45, z1 - 0.45, xb, z1 - 0.45, YL, YL + 3.3, 0, -1, 0x6e5848);
          ceil(lP, Math.min(xs, xb), Math.max(xs, xb), z0 + 0.45, z1 - 0.45, YL + 3.3, 0x5a4a40);
          flr(lF, Math.min(xs, xb), Math.max(xs, xb), z0 + 0.45, z1 - 0.45, YL + 0.005, 0x9a8878);
          bx('as_stoneL', xb - sx * 0.55, xb - sx * 0.05, YL, YL + 0.95, zc - 0.6, zc + 0.6, 0xc8b8a4);
          glow.add(new T.BoxGeometry(0.08, 0.14, 0.08), hdr(0xffc070, 2.2), { x: xb - sx * 0.3, y: YL + 1.05, z: zc, vary: 0 });
          // 경당 입구 낮은 난간(걷지 않는 감실)
          bx('as_stoneL', xs + sx * 0.12, xs + sx * 0.22, YL, YL + 0.75, z0 + 0.5, z1 - 0.5, 0x8a7868);
          col(xs + sx * 0.05, z0, xb + sx * 0.6, z1);
        }
        [0, LBAY, 2 * LBAY, 3 * LBAY].forEach(function (z) {   // 굵고 낮은 기둥(받침 2.4m)
          bx('as_stoneL', sx * (LXN - 0.35), sx * (LXN + 0.45), YL, LV, z - 0.35, z + 0.35, 0xc8b29c);
          col(sx * (LXN - 0.35), z - 0.35, sx * (LXN + 0.45), z + 0.35);
        });
      });
      // --- 하부 성당 껍데기: 얇은 면 벽 뒤를 두꺼운 돌로 막는다(경당 사이·경당 위·나르텍스·트란셉트 끝). 실제로는 상부 성당을 받치는 두꺼운 벽이다.
      // (카메라 공간(cam_guard)이 벽 틈으로 겹친 층 사이의 빈 곳에 새어 나가지 않게 — 그 빈 곳은 위층 바닥 밑이라 '지붕 아래'로 보인다)
      var LTOP = LV + LVR;
      [1, -1].forEach(function (sx) {
        var xi = sx * (LXN + 0.45), xo = sx * (LXN + 0.45 + CH);
        bx('as_stoneL', xo, xo + sx * 0.4, YL, LTOP, -0.4, LZN, 0x8a7868);                                  // 경당 바깥 벽
        bx('as_stoneL', xi, xo + sx * 0.4, YL + 3.3, LTOP, 0, LZN, 0x8a7868);                               // 경당 천장 위
        [0, LBAY, 2 * LBAY, 3 * LBAY].forEach(function (z) { bx('as_stoneL', xi, xo, YL, YL + 3.3, z - 0.45, z + 0.45, 0x8a7868); });   // 경당 사이
        bx('as_stoneL', sx * LXX, sx * (LXX + 0.4), YL, LTOP, LZN - 0.4, LZX + 0.4, 0x8a7868);              // 나르텍스 끝
        bx('as_stoneL', xi, sx * (LXX + 0.4), YL, LTOP, LZN - 0.4, LZN, 0x8a7868);                          // 나르텍스 서벽(신랑 폭 밖)
        bx('as_stoneL', sx * LTX, sx * (LTX + 0.4), YL, LTOP, TZ0 - 0.4, 0.4, 0x8a7868);                    // 트란셉트 끝
        bx('as_stoneL', xi, sx * (LTX + 0.4), YL, LTOP, 0, 0.4, 0x8a7868);                                   // 트란셉트 동벽 뒤
        if (sx > 0) { bx('as_stoneL', LAR, LDOOR.x0, YL, LTOP, TZ0 - 0.4, TZ0, 0x8a7868); bx('as_stoneL', LDOOR.x1, LTX + 0.4, YL, LTOP, TZ0 - 0.4, TZ0, 0x8a7868); bx('as_stoneL', LDOOR.x0, LDOOR.x1, YL + 2.8, LTOP, TZ0 - 0.4, TZ0, 0x8a7868); }
        else bx('as_stoneL', -LTX - 0.4, -LAR, YL, LTOP, TZ0 - 0.4, TZ0, 0x8a7868);
      });
      bx('as_stoneL', -LXX - 0.4, LXX + 0.4, YL, LTOP, LZX, LZX + 0.4, 0x8a7868);                             // 나르텍스 동벽
      // --- 하부 궁륭: 신랑 3베이(파란 별) · 교차부(금빛 '돛' 네 면) · 트란셉트 팔(별 원통) · 반원 후진(어두운 반돔)
      var LN = low ? 5 : 8;
      for (var lb = 0; lb < 3; lb++) crossVault({ xa: -LXN, xb: LXN, za: lb * LBAY, zb: (lb + 1) * LBAY, y: LV, rise: LVR, n: LN, b: lV, c: 0xffffff, rib: lS, ribC: 0xb89a80, ribT: 0.3, transverse: true });
      crossVault({ xa: -LXN, xb: LXN, za: TZ0, zb: 0, y: LV, rise: LVR, n: LN, b: metal, c: 0xb8923c, rib: lS, ribC: 0xb89a80, ribT: 0.3, transverse: true });
      // 나르텍스(가로로 긴 첫 베이): x 방향 원통(별) + 끝벽
      (function narthex() {
        var P7 = Pt((LZX - LZN) / 2, LVR), zc = (LZN + LZX) / 2, n = low ? 6 : 10, A7 = P7.arc(n);
        for (var q = 0; q < n; q++) [-1, 1].forEach(function (sg) {
          var z0 = zc + sg * A7[q].u, z1 = zc + sg * A7[q + 1].u, y0 = LV + A7[q].h, y1 = LV + A7[q + 1].h;
          lV.addQuad([-LXX, y0, z0], [LXX, y0, z0], [LXX, y1, z1], [-LXX, y1, z1], 0xffffff, [0, LV - 3, zc], { vary: 0 });
        });
        // 나르텍스 옆벽(신랑 쪽 z LZN: 신랑 폭 밖) · 동벽(z LZX) · 남·북 끝벽
        [1, -1].forEach(function (sx) {
          vquad(lP, sx * (LXN + 0.45), LZN, sx * LXX, LZN, YL, LV + LVR, 0, 1, 0xcbb49a);
          col(sx * (LXN + 0.45), LZN - 0.5, sx * (LXX + 0.6), LZN);
          vquad(lP, sx * LXX, LZN, sx * LXX, LZX, YL, LV + LVR, -sx, 0, 0xcbb49a);
          col(sx * LXX, LZN - 0.5, sx * (LXX + 0.6), LZX + 0.6);
        });
        vquad(lP, -LXX, LZX, LXX, LZX, YL, LV + LVR, 0, -1, 0xcbb49a); col(-LXX - 0.6, LZX, LXX + 0.6, LZX + 0.6);
        // 남쪽 끝 = 아래 광장 문(13세기 쌍문, 1271년 이후 — 조사 §3-2): 닫힌 문(보기만)
        vquad(woodB, -LXX + 0.03, 21.0, -LXX + 0.03, 23.4, YL, YL + 3.0, 1, 0, 0x5a3420);
        bx('as_stoneL', -LXX, -LXX + 0.15, YL, YL + 3.3, 20.7, 21.0, 0xd8c8b4); bx('as_stoneL', -LXX, -LXX + 0.15, YL, YL + 3.3, 23.4, 23.7, 0xd8c8b4); bx('as_stoneL', -LXX, -LXX + 0.15, YL + 3.0, YL + 3.3, 20.7, 23.7, 0xd8c8b4);
        // 북쪽 끝 = 성녀 가타리나 경당(어두운 감실)
        vquad(lP, LXX - 0.04, 21.0, LXX - 0.04, 23.4, YL, YL + 2.6, -1, 0, 0x4a3a32);
        ctx.holyFont({ x: layout.fonts[1].x, z: layout.fonts[1].z, y: YL });
      })();
      // 트란셉트 팔(토막): x 방향 원통 별 궁륭 + 끝벽 + 동벽(신랑 쪽 경당 옆) + 서벽(북쪽: 위로 오르는 계단 문)
      [1, -1].forEach(function (sx) {
        var P8 = Pt(-TZ0 / 2, LVR), zc = TZ0 / 2, n = low ? 5 : 8, A8 = P8.arc(n), xa = sx * LXN, xb = sx * LTX;
        for (var q = 0; q < n; q++) [-1, 1].forEach(function (sg) {
          var z0 = zc + sg * A8[q].u, z1 = zc + sg * A8[q + 1].u, y0 = LV + A8[q].h, y1 = LV + A8[q + 1].h;
          lV.addQuad([xa, y0, z0], [xb, y0, z0], [xb, y1, z1], [xa, y1, z1], 0xffffff, [(xa + xb) / 2, LV - 3, zc], { vary: 0 });
        });
        vquad(lP, xb, TZ0, xb, 0, YL, LV + LVR, -sx, 0, 0xc4ac92); col(xb, TZ0 - 0.6, xb + sx * 0.6, 0.6);
        archFace(lP, 'z', 0, Math.min(xa, xb) + (sx > 0 ? 0.45 : 0), Math.max(xa, xb) - (sx < 0 ? 0.45 : 0), YL, LV + LVR, [], -1, 0xc4ac92);
        col(sx * (LXN + 0.45), 0, xb, 0.6);
        if (sx > 0) {
          archFace(lP, 'z', TZ0, LAR, LTX, YL, LV + LVR, [{ c: (LDOOR.x0 + LDOOR.x1) / 2, a: (LDOOR.x1 - LDOOR.x0) / 2, rise: 0.7, y: YL + 2.1 }], 1, 0xc4ac92);
          col(LXN, TZ0 - 0.6, LDOOR.x0, TZ0); col(LDOOR.x1, TZ0 - 0.6, LTX + 0.6, TZ0);
        } else { archFace(lP, 'z', TZ0, -LTX, -LAR, YL, LV + LVR, [], 1, 0xc4ac92); col(-LTX - 0.6, TZ0 - 0.6, -LAR, TZ0); }
      });
      // 반원 후진: 벽 + 어두운 반돔(1623 최후 심판 자리 — 그림 없음) + 호두나무 성가대석
      (function lowerApse() {
        var n = low ? 10 : 16;
        for (var q = 0; q < n; q++) {
          var a0 = PI * q / n, a1 = PI * (q + 1) / n, p0 = [LAR * cos(a0), TZ0 - LAR * sin(a0)], p1 = [LAR * cos(a1), TZ0 - LAR * sin(a1)];
          var amq = (a0 + a1) / 2;
          vquad(lP, p0[0], p0[1], p1[0], p1[1], YL, LV, -cos(amq), sin(amq), 0x6e5a4c);
          ctx.addCollider({ x: (p0[0] + p1[0]) / 2 * 1.12, z: TZ0 + ((p0[1] + p1[1]) / 2 - TZ0) * 1.12, r: 0.4 });
          var m = 4;
          for (var k = 0; k < m; k++) {
            var e0 = PI / 2 * k / m, e1 = PI / 2 * (k + 1) / m;
            function Q(a, e) { return [LAR * cos(a) * cos(e), LV + LVR * sin(e), TZ0 - LAR * sin(a) * cos(e)]; }
            var A = Q(a0, e0), Bq = Q(a1, e0), C = Q(a1, e1), D = Q(a0, e1);
            lP.addTris([A[0], A[1], A[2], Bq[0], Bq[1], Bq[2], C[0], C[1], C[2], A[0], A[1], A[2], C[0], C[1], C[2], D[0], D[1], D[2]], 0x5a4638, [0, LV, TZ0], { vary: 0 });
          }
          ctx.box({ x: (p0[0] + p1[0]) / 2 * 0.86, y: YL, z: TZ0 + ((p0[1] + p1[1]) / 2 - TZ0) * 0.86, w: Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * 0.86, h: 1.6, d: 0.5, ry: amq + PI / 2, color: 0x4a3020, mat: 'wood' });
        }
      })();
      // 하부 교황 제대(1253, 무덤 바로 위): 두 단 + 아케이드 상자 제대 + 계단의 격자('등불 구멍')
      ctx.steps({ x0: LAL.x - 1.7, x1: LAL.x + 1.7, z0: LAL.z - 1.7, z1: LAL.z + 1.7, y0: YL, y1: YL + 0.36, n: 2, dir: [0, -1], surf: 'as_stoneL', color: 0xd8c8b4 });
      ctx.altar({ x: LAL.x, z: LAL.z, y: YL + 0.36, w: 2.1, d: 1.3, h: 1.0, style: 'block', color: 0xece4d6, candles: 2 });
      for (var la = -2; la <= 2; la++) ctx.box({ x: LAL.x + la * 0.38, y: YL + 0.36, z: LAL.z + 0.66, w: 0.1, h: 0.86, d: 0.04, color: 0x9a3a30 });
      ctx.box({ x: LAL.x, y: YL + 0.36, z: LAL.z + 1.45, w: 0.7, h: 0.005, d: 0.4, color: 0x1a1612 });
      sacred.push({ k: 'altar', x: LAL.x, z: LAL.z, w: 2.1, d: 1.3, level: 'lower' });
      // 하부 제대 둘레 난간(제대 단에 오르지 않게): 낮은 돌 난간 상자
      col(LAL.x - 1.8, LAL.z - 1.8, LAL.x + 1.8, LAL.z + 1.8);
      bx('as_stoneL', LAL.x - 1.9, LAL.x + 1.9, YL, YL + 0.8, LAL.z + 1.8, LAL.z + 1.9, 0xb8a894);
      [1, -1].forEach(function (sx) { bx('as_stoneL', LAL.x + sx * 1.8, LAL.x + sx * 1.9, YL, YL + 0.8, LAL.z - 1.9, LAL.z + 1.9, 0xb8a894); });
      ctx.addLight({ x: 0, y: YL + 3.2, z: 2.0, color: 0xffb870, intensity: 1.1, distance: 16, kind: 'always' });
      // 등(어스름 속 따뜻한 빛 몇 개): 걸린 기름등 — 발광 면(점광원 아님)
      [[0, 6.3], [0, 12.6], [0, 18.9], [0, -1.0], [-5.5, 22.0], [5.5, 22.0]].forEach(function (p) {
        metal.add(new T.CylinderGeometry(0.004, 0.004, 1.2, 4), 0x6a5a3a, { x: p[0], y: LV + LVR - 0.7, z: p[1], vary: 0 });
        glow.add(new T.SphereGeometry(0.11, 8, 6), hdr(0xffb060, 2.6), { x: p[0], y: LV + LVR - 1.35, z: p[1], vary: 0 });
        metal.add(new T.CylinderGeometry(0.16, 0.09, 0.12, 8), 0x8a6a30, { x: p[0], y: LV + LVR - 1.45, z: p[1], vary: 0 });
      });
      ctx.renderSeats({ id: layout.id, seatGroups: layout.seatGroups.slice(2) }, 'bench', { surf: null, wood: 0x5a3a26, seat: 0x6a4530, back: 0x4e3220, kneelerColor: 0x4a3024 });

      // --- 묘소로 내려가는 두 줄 계단(신랑 한가운데 양옆) — 우물 둘레 낮은 난간, 디딤 18단
      level('L');
      var rise = (YL - YC) / WELL.n, run = (WELL.zTop - WELL.zBot) / WELL.n;
      [1, -1].forEach(function (sx) {
        var xa = sx * WELL.x0, xb = sx * WELL.x1, x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
        for (var k = 1; k <= WELL.n; k++) {
          var zt = WELL.zTop - (k - 1) * run, zb = zt - run, h = YL - k * rise;
          zone(x0, x1, zb, zt, h);
          ctx.boxAABB({ x0: x0, x1: x1, y0: h - 0.12, y1: h, z0: zb, z1: zt, color: 0xc8b8a8, surf: 'as_stoneC' });
        }
        // 우물 안 옆벽(디딤 위 사람·위층 사람 모두를 막는다 — 위에서는 난간, 안에서는 벽)
        [x0, x1].forEach(function (xw) { colY(xw - 0.1, WELL.zBot, xw + 0.1, WELL.zTop, YC - 0.5, YL + 1.2); });
        colY(x0 - 0.1, WELL.zBot - 0.1, x1 + 0.1, WELL.zBot + 0.1, YL - 0.4, YL + 1.2);   // 우물 아래 끝(신랑 바닥에서 떨어지지 않게)
        // 보이는 것: 우물 벽(어두운 돌) + 위 난간
        [x0, x1].forEach(function (xw, wi) {
          var nrm = wi ? -1 : 1;
          vquad(B.as_stoneC, xw, WELL.zBot, xw, WELL.zTop, YC, YL, nrm, 0, 0x9a8a7a);
          bx('as_stoneL', xw - 0.08, xw + 0.08, YL, YL + 0.85, WELL.zBot - 0.08, WELL.zTop, 0xc0ae98);
        });
        bx('as_stoneL', x0 - 0.08, x1 + 0.08, YL, YL + 0.85, WELL.zBot - 0.16, WELL.zBot, 0xc0ae98);
      });

      // =================================================================== 지하 묘소(YC)
      level('C');
      curFloor = YC;
      var cS = B.as_stoneC, cF = B.as_stoneC;   // 묘소 바닥 = 같은 맨돌(묶음 하나)
      // 층계참(두 계단이 만나는 곳, 야코파 데 세테솔리의 벽감) · 기도방 · 둥근 방
      zone(-LAND.x, LAND.x, LAND.z0, LAND.z1, YC); zone(-PRAY.x, PRAY.x, PRAY.z0, PRAY.z1, YC);
      // 둥근 방 바닥 구역: 원 안의 가로 띠들(네모 하나로 덮으면 모서리가 벽 밖 흙 속까지 '바닥'이 된다 — 카메라 공간·길 찾기가 그리로 샌다)
      circleZones(CRY.x, CRY.z, CRY.r, -1, 1, YC);
      zone(-PRAY.x, PRAY.x, CRY.z + sqrt(CRY.r * CRY.r - PRAY.x * PRAY.x) - 0.1, PRAY.z0, YC);   // 기도방 → 둥근 방 입구(원 띠가 닿지 않는 호 앞)
      flr(cF, -LAND.x, LAND.x, LAND.z0, LAND.z1, YC); flr(cF, -PRAY.x, PRAY.x, PRAY.z0, PRAY.z1, YC);
      var NC = low ? 16 : 24;
      for (var cq = 0; cq < NC; cq++) { var c0 = cq * 2 * PI / NC, c1 = (cq + 1) * 2 * PI / NC; cF.addTris([CRY.x, YC, CRY.z, CRY.x + CRY.r * cos(c0), YC, CRY.z + CRY.r * sin(c0), CRY.x + CRY.r * cos(c1), YC, CRY.z + CRY.r * sin(c1)], 0xffffff, [CRY.x, YC + 5, CRY.z], { vary: 0 }); }
      // 층계참·기도방 벽과 천장(하부 바닥판 밑 2.9m)
      var CT = 2.9;
      vquad(cS, -WELL.x0, LAND.z1, WELL.x0, LAND.z1, YC, YL - 0.4, 0, -1, 0xa89888);   // 두 계단 사이 벽(야코파의 벽감)
      bx('as_stoneC', -0.45, 0.45, YC + 0.6, YC + 1.7, LAND.z1 - 0.12, LAND.z1, 0x5a4a40);
      [1, -1].forEach(function (sx) {
        vquad(cS, sx * LAND.x, LAND.z0, sx * LAND.x, LAND.z1, YC, YL - 0.4, -sx, 0, 0xa89888);
        vquad(cS, sx * PRAY.x, LAND.z0, sx * LAND.x, LAND.z0, YC, CT, 0, 1, 0xa89888);
        vquad(cS, sx * PRAY.x, PRAY.z0, sx * PRAY.x, PRAY.z1, YC, CT, -sx, 0, 0xa89888);
        col(sx * LAND.x, LAND.z0, sx * (LAND.x + 0.5), LAND.z1 + 0.5); col(sx * PRAY.x, PRAY.z0 - 0.2, sx * (LAND.x + 0.5), LAND.z0);
      });
      col(-WELL.x0, LAND.z1, WELL.x0, LAND.z1 + 0.4);
      ceil(cS, -LAND.x, LAND.x, LAND.z0, LAND.z1, YL - 0.4, 0x8a7a6c); ceil(cS, -PRAY.x, PRAY.x, PRAY.z0, LAND.z0, CT, 0x8a7a6c);
      vquad(cS, -LAND.x, LAND.z0, LAND.x, LAND.z0, CT, YL - 0.4, 0, 1, 0x8a7a6c);         // 기도방 천장 → 층계참 천장 사이 턱
      var PZ0 = CRY.z + sqrt(CRY.r * CRY.r - PRAY.x * PRAY.x) - 0.05;   // 기도방이 둥근 방 벽(원)에 닿는 z(입구 호의 끝)
      ceil(cS, -PRAY.x, PRAY.x, PZ0, PRAY.z0, CT, 0x8a7a6c);
      [1, -1].forEach(function (sx) { vquad(cS, sx * PRAY.x, PZ0, sx * PRAY.x, PRAY.z0, YC, CT, -sx, 0, 0xa89888); });
      [1, -1].forEach(function (sx) { vquad(cS, sx * WELL.x0, WELL.zTop, sx * WELL.x1, WELL.zTop, YC, YL, 0, -1, 0x8a7a6c); });   // 계단 우물 위 끝(하부 바닥 밑)
      // 둥근 방: 벽(신로마네스크 맨돌, 1925~32 타르키) + 낮은 돔 천장 + 모서리 벽감 4(네 동료) + 기도방 쪽 입구
      (function roundRoom() {
        var n = low ? 16 : 24, ENT = Math.asin(PRAY.x / CRY.r);   // 입구(+z 쪽) 반각
        for (var q = 0; q < n; q++) {
          var a0 = q * 2 * PI / n, a1 = (q + 1) * 2 * PI / n, am = (a0 + a1) / 2;
          var p0 = [CRY.x + CRY.r * cos(a0), CRY.z + CRY.r * sin(a0)], p1 = [CRY.x + CRY.r * cos(a1), CRY.z + CRY.r * sin(a1)];
          var dz = Math.abs(((am - PI / 2) + 3 * PI) % (2 * PI) - PI);   // +z 방향(π/2)과의 각 차
          if (dz > ENT) { vquad(cS, p0[0], p0[1], p1[0], p1[1], YC, 2.3, -cos(am), -sin(am), 0x9c8c7c); ctx.addCollider({ x: CRY.x + (CRY.r + 0.35) * cos(am), z: CRY.z + (CRY.r + 0.35) * sin(am), r: 0.45 }); }
          else vquad(cS, p0[0], p0[1], p1[0], p1[1], 2.3, CRY.top + 0.05, -cos(am), -sin(am), 0x9c8c7c);   // 입구 위(호): 돔 받침 → 기도방 천장 위까지 막는다
          var m = 3;
          for (var k = 0; k < m; k++) {
            var e0 = k / m, e1 = (k + 1) / m;
            function Q(a, e) { var rr = CRY.r * cos(e * PI / 2 * 0.9); return [CRY.x + rr * cos(a), 2.3 + (CRY.top - 2.3) * sin(e * PI / 2), CRY.z + rr * sin(a)]; }
            var A = Q(a0, e0), Bq = Q(a1, e0), C = Q(a1, e1), D = Q(a0, e1);
            cS.addTris([A[0], A[1], A[2], Bq[0], Bq[1], Bq[2], C[0], C[1], C[2], A[0], A[1], A[2], C[0], C[1], C[2], D[0], D[1], D[2]], 0x8a7a6c, [CRY.x, 0.5, CRY.z], { vary: 0 });
          }
        }
        // 기도방 → 둥근 방 입구 양옆 벽 토막
        [1, -1].forEach(function (sx) { col(sx * PRAY.x, PRAY.z0 - 0.3, sx * (PRAY.x + 0.6), PRAY.z0 + 0.2); });
        // 모서리 벽감 4(레오·마세오·루피노·안젤로, 1934): 벽에 판 어두운 감실 + 격자(조사 §4)
        [PI * 0.25, PI * 0.75, PI * 1.25, PI * 1.75].forEach(function (a) {
          var cx = CRY.x + (CRY.r - 0.02) * cos(a), cz = CRY.z + (CRY.r - 0.02) * sin(a), tx = -sin(a), tz = cos(a);
          vquad(solid, cx - tx * 0.4, cz - tz * 0.4, cx + tx * 0.4, cz + tz * 0.4, YC + 0.5, YC + 1.6, -cos(a), -sin(a), 0x2a2220);
          for (var g = -3; g <= 3; g++) metal.add(new T.CylinderGeometry(0.012, 0.012, 1.1, 4), 0x2a2622, { x: cx - cos(a) * 0.03 + tx * g * 0.11, y: YC + 1.05, z: cz - sin(a) * 0.03 + tz * g * 0.11, vary: 0 });
        });
      })();
      // 무덤 기둥(유해가 든 석관을 감싼 거친 돌 네 벽, 두 철 격자): 가운데 돌기둥 + 네 면 격자 + 봉헌 등(1939)
      (function tomb() {
        var hw = TOMB.hw;
        bx('as_stoneC', CRY.x - hw, CRY.x + hw, YC, YC + TOMB.h, CRY.z - hw, CRY.z + hw, 0xb0a090);
        bx('as_stoneC', CRY.x - hw - 0.1, CRY.x + hw + 0.1, YC + TOMB.h, YC + TOMB.h + 0.16, CRY.z - hw - 0.1, CRY.z + hw + 0.1, 0xc8b8a8);
        bx('as_stoneC', CRY.x - hw - 0.12, CRY.x + hw + 0.12, YC, YC + 0.18, CRY.z - hw - 0.12, CRY.z + hw + 0.12, 0x8a7a6c);
        // 석관 자리(앞면 창 너머로 보이는 어두운 칸)
        vquad(solid, CRY.x - 0.42, CRY.z + hw + 0.005, CRY.x + 0.42, CRY.z + hw + 0.005, YC + 0.75, YC + 1.45, 0, 1, 0x241c18);
        var gd = hw + 0.16, bars = low ? 7 : 11;
        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (nn) {
          var tx = -nn[1], tz = nn[0];
          for (var g = 0; g < bars; g++) {
            var t = (g / (bars - 1) - 0.5) * 2 * (hw + 0.12);
            metal.add(new T.CylinderGeometry(0.014, 0.014, 1.9, 4), 0x2e2a26, { x: CRY.x + nn[0] * gd + tx * t, y: YC + 0.2 + 0.95, z: CRY.z + nn[1] * gd + tz * t, vary: 0 });
          }
          [0.25, 1.1, 2.05].forEach(function (yy) { metal.add(new T.BoxGeometry(Math.abs(tx) * 2 * (hw + 0.14) + 0.03, 0.03, Math.abs(tz) * 2 * (hw + 0.14) + 0.03), 0x2e2a26, { x: CRY.x + nn[0] * gd, y: YC + yy, z: CRY.z + nn[1] * gd, vary: 0 }); });
        });
        ctx.addCollider({ x0: CRY.x - gd - 0.1, x1: CRY.x + gd + 0.1, z0: CRY.z - gd - 0.1, z1: CRY.z + gd + 0.1 });
        sacred.push({ k: 'tomb', x: CRY.x, z: CRY.z, w: 2 * gd, d: 2 * gd });
        // 봉헌 등(입구 쪽 앞): 사슬 + 등잔 + 작은 불빛(발광)
        metal.add(new T.CylinderGeometry(0.006, 0.006, 0.9, 4), 0x6a5a3a, { x: CRY.x, y: CRY.top - 0.45, z: CRY.z + gd + 0.55, vary: 0 });
        metal.add(new T.CylinderGeometry(0.2, 0.1, 0.16, 10), 0x9a7838, { x: CRY.x, y: CRY.top - 1.0, z: CRY.z + gd + 0.55, vary: 0 });
        glow.add(new T.SphereGeometry(0.06, 8, 6), hdr(0xffb050, 3.5), { x: CRY.x, y: CRY.top - 0.88, z: CRY.z + gd + 0.55, vary: 0 });
      })();
      // 기도방 무릎틀 두 줄(보기만 + 충돌: 가운데 통로)
      [0.4, 1.35].forEach(function (z) {
        [1, -1].forEach(function (sx) {
          ctx.box({ x: sx * 1.1, y: YC, z: z, w: 1.0, h: 0.16, d: 0.28, color: 0x4a3024, mat: 'wood' });
          ctx.box({ x: sx * 1.1, y: YC, z: z - 0.32, w: 1.0, h: 0.85, d: 0.06, color: 0x5a3a28, mat: 'wood' });
          col(sx * 0.6, z - 0.4, sx * 1.6, z + 0.16);
        });
      });
      ctx.candleStand(1, { wood: 0x3a2418 });

      // =================================================================== 하부 → 상부 계단(후진 옆 북쪽) + 테라스 복도
      // 하부 북쪽 트란셉트 서벽 문(LDOOR) → 36단(단 0.183m, 디딤 0.38m) → 꼭대기 층계참 → 복도(상부 높이)를 따라 동쪽 → 상부 북쪽 트란셉트 서벽 문(UDOOR)
      ctx.setColliderRange(null);
      var srise = (YU - YL) / STR.n;
      zone(LDOOR.x0, LDOOR.x1, TZ0 - 0.6, TZ0, YL);
      lF.addQuad([LDOOR.x0, YL, TZ0], [LDOOR.x1, YL, TZ0], [LDOOR.x1, YL, TZ0 - 0.6], [LDOOR.x0, YL, TZ0 - 0.6], 0xffffff, [LDOOR.x0, YL + 5, TZ0], { vary: 0 });
      for (var sk = 1; sk <= STR.n; sk++) {
        var szt = STR.z0 - (sk - 1) * STR.run + (sk === 1 ? 0.1 : 0), szb = STR.z0 - sk * STR.run, sh = YL + sk * srise;
        zone(STR.x0, STR.x1, szb, szt, sh);
        ctx.boxAABB({ x0: STR.x0, x1: STR.x1, y0: YL, y1: sh, z0: szb, z1: szt, color: 0xd8c4b0, surf: 'as_stoneL' });
      }
      zone(STR.x0, TER.x1, TER.z0, TER.z1, YU); zone(TER.x0, TER.x1, TER.z1, TZ0 - 0.6, YU);
      ctx.boxAABB({ x0: STR.x0, x1: TER.x1, y0: YU - 0.4, y1: YU, z0: TER.z0, z1: TER.z1, color: 0xd8c4b0, surf: 'as_stoneU' });
      ctx.boxAABB({ x0: TER.x0, x1: TER.x1, y0: YU - 0.4, y1: YU, z0: TER.z1, z1: TZ0 - 0.6, color: 0xd8c4b0, surf: 'as_stoneU' });
      // 벽: 서쪽(후진 쪽) · 계단과 복도 사이 · 복도 바깥(동쪽은 트란셉트, 북쪽 바깥) · 남쪽 끝
      var top = YU + 3.2;
      ctx.boxAABB({ x0: STR.x0 - 0.25, x1: STR.x0, y0: YL, y1: top, z0: TER.z0, z1: TZ0, color: 0xcab6a2, surf: 'as_stoneL' });
      ctx.boxAABB({ x0: STR.x1, x1: TER.x0, y0: YL, y1: top, z0: STR.z1, z1: TZ0, color: 0xcab6a2, surf: 'as_stoneL' });
      ctx.boxAABB({ x0: TER.x1, x1: TER.x1 + 0.25, y0: YU - 0.4, y1: top, z0: TER.z0, z1: TZ0, color: 0xcab6a2, surf: 'as_stoneU' });
      ctx.boxAABB({ x0: STR.x0 - 0.25, x1: TER.x1 + 0.25, y0: YL, y1: top, z0: TER.z0 - 0.25, z1: TER.z0, color: 0xcab6a2, surf: 'as_stoneU' });
      ctx.boxAABB({ x0: STR.x0, x1: STR.x1, y0: top - 0.15, y1: top, z0: TER.z0, z1: TZ0, color: 0xe4d4c2, surf: 'as_stoneL' });
      ctx.boxAABB({ x0: TER.x0, x1: TER.x1, y0: top - 0.15, y1: top, z0: TER.z0, z1: TZ0 - 0.6, color: 0xe4d4c2, surf: 'as_stoneU' });
      col(STR.x0 - 0.6, TER.z0 - 0.6, STR.x0, TZ0 - 0.6); col(STR.x1, STR.z1, TER.x0, TZ0 - 0.6); col(TER.x1, TER.z0 - 0.6, TER.x1 + 0.6, TZ0 - 0.6); col(STR.x0 - 0.6, TER.z0 - 0.6, TER.x1 + 0.6, TER.z0);
      // 복도 옆 창 자리(테라스 — 실제는 회랑을 내려다보는 열린 테라스): 벽등 몇 개
      [-10, -14.5, -19].forEach(function (z) { glow.add(new T.BoxGeometry(0.06, 0.25, 0.14), hdr(0xffd59a, 2.0), { x: TER.x1 - 0.02, y: YU + 2.0, z: z, vary: 0 }); glow.add(new T.BoxGeometry(0.06, 0.25, 0.14), hdr(0xffd59a, 2.0), { x: STR.x0 + 0.02, y: YL + 2.0 + (TZ0 - z) / (TZ0 - STR.z1) * (YU - YL), z: z, vary: 0 }); });

      // 카메라: 맨 위 궁륭 아래까지(맨 아래층 묘소부터 상부 궁륭까지 한 공간 — cam_guard 여러 층)
      ctx.setCameraBounds({ x0: -10.0, x1: 10.0, z0: -24.0, z1: 28.6, yMax: YU + VC - 0.3 });
      ctx.setColliderRange(null);
    }
  };
})();
