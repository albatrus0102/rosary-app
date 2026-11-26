/* ch_house.js — 예시 빌더: 독서 공방 가게(실내 5.0×6.6 m · 천장 2.7 m + 안쪽 복도 1.2×2.4 m + 나무 문, 외관·옆마당·골목).
   기준: 독서공방 DESIGN.md(2026-11-26) 「실내」·「외관·낮밤」·좌석 안 A(창가 1인 책상 3 + 작업대 스툴 1).
   좌표: 미터, x 오른쪽, y 위, +z = 골목(가게 앞). 실내 바닥 높이 FL = 0.16(데크 한 단 위).
   (A) layout·PLAN·planColliders() 는 순수 데이터/함수(THREE 없음) — Node 시험이 그대로 읽는다(test/house.test.mjs).
   (B) build(ctx) 는 PLAN 으로 벽을 세우고 같은 planColliders() 로 충돌체를 넣는다 → 시험과 실제 화면의 충돌이 같다.
   새 소품 도구(B 항목: 카드·글 판·책장 끼우기 등)는 아직 없어 단순한 대체 도형·캔버스 판으로 둔다. */
(function (root) {
  'use strict';
  var FL = 0.16, CEIL = FL + 2.7, WALL_TOP = 3.0, T_W = 0.2;
  var STOOL = { x: 0.85, top: 0.63, ring: 0.22 };   // 바 스툴: 가운데 x(좌석 3 의 z), 앉는 면 높이 0.63(앱과 같게), 발 받침 고리 높이(바닥 위)
  var SWING = { x: -4.75, z: -2.5 };   // 옆마당 2인 그네의 가운데(좌석 4·5) — 마당 안쪽에서 골목(+z) 쪽을 본다(소유자 참고 그림 ref_swing_yard)
  var PI = Math.PI;

  // ---- (A) 평면 계획 ----
  var PLAN = {
    room: { x0: -2.5, x1: 2.5, z0: -3.3, z1: 3.3 },                 // 실내(벽 안쪽 면)
    corridor: { x0: -0.6, x1: 0.6, z0: -5.7, z1: -3.3 },           // 안쪽 복도(끝에 나무 문)
    door: { x0: 0.25, x1: 1.2, z: 3.4, h: 2.36 },                   // 유리 낀 나무 문(입구, 열려 있음)
    corridorOpen: { x0: -0.6, x1: 0.6, h: FL + 2.3 },
    // 벽: 선분이 벽 두께의 가운데. collide:false 는 문 위 상인방(걸어서 지나가는 자리 위)
    walls: [
      { id: 'L', x0: -2.6, z0: -3.5, x1: -2.6, z1: 3.5, h: WALL_TOP },
      { id: 'R', x0: 2.6, z0: -3.5, x1: 2.6, z1: 3.5, h: WALL_TOP },
      { id: 'FA', x0: -2.5, z0: 3.4, x1: 0.25, z1: 3.4, h: WALL_TOP },
      { id: 'FB', x0: 1.2, z0: 3.4, x1: 2.5, z1: 3.4, h: WALL_TOP },
      { id: 'FC', x0: 0.25, z0: 3.4, x1: 1.2, z1: 3.4, y: 2.36, h: WALL_TOP - 2.36, collide: false },
      { id: 'BA', x0: -2.5, z0: -3.4, x1: -0.6, z1: -3.4, h: WALL_TOP },
      { id: 'BB', x0: 0.6, z0: -3.4, x1: 2.5, z1: -3.4, h: WALL_TOP },
      { id: 'BC', x0: -0.6, z0: -3.4, x1: 0.6, z1: -3.4, y: FL + 2.3, h: WALL_TOP - FL - 2.3, collide: false },
      { id: 'CL', x0: -0.7, z0: -5.9, x1: -0.7, z1: -3.5, h: 2.7 },
      { id: 'CR', x0: 0.7, z0: -5.9, x1: 0.7, z1: -3.5, h: 2.7 },
      { id: 'CE', x0: -0.6, z0: -5.8, x1: 0.6, z1: -5.8, h: 2.7 }
    ],
    desks: [2.15, 0.55, -1.05],                                      // 창가 책상 가운데 z
    // 오른쪽 벽 커피 카운터(작업대 자리): 앞 카운터(손님 쪽) + 바리스타 통로 + 뒤 카운터(에스프레소 기계·그라인더·컵 선반)
    counter: { x0: 1.3, x1: 1.75, z0: -1.55, z1: 0.45, top: FL + 0.92 },   // 카운터 높이 0.92(앱과 같게 — 바 스툴 0.63 과 짝)
    back: { x0: 2.15, x1: 2.5, z0: -1.55, z1: 0.45, top: FL + 0.92 },
    barista: { x: 1.95, z: -0.55, x0: 1.75, x1: 2.15 },
    garden: {
      planter: { x0: -2.6, x1: -0.2, z0: 3.55, z1: 4.05, h: 0.45 },
      beds: [{ x0: -3.75, x1: -2.9, z0: 1.2, z1: 2.9, h: 0.28 }, { x0: -3.75, x1: -2.9, z0: -1.4, z1: 0.3, h: 0.28 }]
    }
  };
  function wallAABB(w) {
    var t = T_W / 2;
    if (Math.abs(w.z1 - w.z0) < 1e-6) return { x0: Math.min(w.x0, w.x1), x1: Math.max(w.x0, w.x1), z0: w.z0 - t, z1: w.z0 + t };
    return { x0: w.x0 - t, x1: w.x0 + t, z0: Math.min(w.z0, w.z1), z1: Math.max(w.z0, w.z1) };
  }
  // 충돌체 전부(순수). build 와 시험이 같은 목록을 쓴다.
  function planColliders() {
    var C = [];
    PLAN.walls.forEach(function (w) { if (w.collide !== false) { var a = wallAABB(w); a.tag = 'wall:' + w.id; C.push(a); } });
    // 실내 가구
    PLAN.desks.forEach(function (z, i) { C.push({ x0: -2.5, x1: -1.9, z0: z - 0.5, z1: z + 0.5, tag: 'desk' + i }); });
    var K = PLAN.counter, KB = PLAN.back, KS = PLAN.barista;
    C.push({ x0: K.x0, x1: K.x1, z0: K.z0, z1: K.z1, tag: 'counter' });
    C.push({ x0: KB.x0, x1: 2.5, z0: KB.z0, z1: KB.z1, tag: 'backCounter' });
    C.push({ x0: KS.x0, x1: KS.x1, z0: K.z0, z1: K.z1, tag: 'barista' });   // 바리스타 통로 전체(NPC 는 이 안에서만 움직인다 — 아무도 지나가지 못한다)
    C.push({ x0: -2.5, x1: -0.8, z0: -3.3, z1: -2.92, tag: 'bookshelf' });
    C.push({ x0: 0.85, x1: 2.5, z0: -3.3, z1: -2.88, tag: 'cabinet' });
    C.push({ x0: 2.12, x1: 2.5, z0: 0.7, z1: 2.1, tag: 'display' });
    C.push({ x: -2.15, z: 2.95, r: 0.28, tag: 'plantFL' });
    C.push({ x: -2.2, z: -2.5, r: 0.2, tag: 'floorLamp' });
    C.push({ x: 2.24, z: 3.04, r: 0.24, tag: 'plantFR' });
    C.push({ x0: 1.17, x1: 1.27, z0: 2.4, z1: 3.3, tag: 'doorLeaf' });
    C.push({ x0: -0.5, x1: 0.5, z0: -5.7, z1: -5.62, tag: 'innerDoor' });
    // 바깥
    var P = PLAN.garden.planter; C.push({ x0: P.x0, x1: P.x1, z0: P.z0, z1: P.z1, tag: 'planter' });
    PLAN.garden.beds.forEach(function (b, i) { C.push({ x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1, tag: 'bed' + i }); });
    C.push({ x: 2.32, z: 3.9, r: 0.3, tag: 'deckTree' });
    C.push({ x: 0.02, z: 3.8, r: 0.18, tag: 'rosePot' });
    C.push({ x0: -6.44, x1: -2.8, z0: -3.7, z1: -3.36, tag: 'wallBed' });   // 담 앞 좁은 화단
    C.push({ x: 1.55, z: 4.15, r: 0.28, tag: 'aframe' });
    C.push({ x0: -3.75, x1: -2.2, z0: 4.25, z1: 4.6, tag: 'bicycle' });
    C.push({ x: -6.2, z: 6.1, r: 0.2, tag: 'streetlight' });
    C.push({ x: -6.0, z: -0.7, r: 0.3, tag: 'yardTree' });
    C.push({ x: SWING.x - 1.32, z: SWING.z, r: 0.26, tag: 'swingTable' });   // 그네 옆 작은 탁자(컵 자리)
    C.push({ x0: SWING.x - 1.02, x1: SWING.x + 1.02, z0: SWING.z - 0.48, z1: SWING.z + 0.48, tag: 'swing' });   // 그네 틀 전체(앉은 자리 포함 — 앉기는 물리 이동이 아니다)
    // 울타리(앞쪽은 x -5.0 부터 집까지 열려 있다 — 디딤돌 입구)
    C.push({ x0: -6.56, x1: -6.44, z0: -3.86, z1: 3.56, tag: 'fenceW' });
    C.push({ x0: -6.56, x1: -2.7, z0: -3.9, z1: -3.7, tag: 'gardenWall' });   // 마당 뒤 회벽 담(담쟁이)
    C.push({ x0: -6.56, x1: -5.0, z0: 3.44, z1: 3.56, tag: 'fenceS1' });
    // 이웃 건물(오른쪽)·집 뒤(들어갈 수 없음)
    C.push({ x0: 2.7, x1: 12, z0: -12, z1: 3.5, tag: 'neighbor' });
    C.push({ x0: -2.7, x1: -0.6, z0: -12, z1: -3.5, tag: 'behindL' });   // 마당 쪽은 울타리(fenceN)가 막는다
    C.push({ x0: 0.6, x1: 12, z0: -12, z1: -3.5, tag: 'behindR' });
    return C;
  }

  var layout = {
    id: 'house', scalePercent: 100,
    bounds: { x0: -6.45, x1: 6.5, z0: -5.75, z1: 8.0 },
    spawn: { x: 0.72, z: 5.4, r: 0 },
    // 좌석: 창가 책상 3(창을 본다, yaw π/2 = -x) + 커피 카운터 바 스툴 1(+x, 카운터를 본다) + 그네 2.
    // x,z = 앉은 몸(루트) 자리(골반은 그 뒤 SEAT_BACK). y = 발을 두는 높이(스툴 발 받침 고리 — 없으면 바닥). top = 앉는 면 높이(절대).
    // footFwd = 앉았을 때 발목이 골반 앞으로 나가는 거리(m). stand = 앉으러 서는 자리(좌석 옆·앞 — 의자 등받이를 뚫고 지나가지 않게, 2026-11-26 측정 원인 2).
    seats: [
      { x: -1.61, z: 2.15, yaw: PI / 2, top: FL + 0.45, footFwd: 0.4, stand: { x: -1.6, z: 2.72 } },
      { x: -1.61, z: 0.55, yaw: PI / 2, top: FL + 0.45, footFwd: 0.4, stand: { x: -1.6, z: 1.12 } },
      { x: -1.61, z: -1.05, yaw: PI / 2, top: FL + 0.45, footFwd: 0.4, stand: { x: -1.6, z: -0.48 } },
      { x: 0.95, z: -0.5, yaw: -PI / 2, y: FL + STOOL.ring, top: FL + STOOL.top, footFwd: 0.2, stand: { x: 0.9, z: 0.08 } },
      // 옆마당 2인 그네(A 자 틀): 나란히 두 자리, 집·화단 쪽(+x)을 본다 — 서는 자리는 그네 앞
      { x: SWING.x - 0.3, z: SWING.z + 0.07, yaw: PI, top: 0.47, footFwd: 0.42, stand: { x: SWING.x - 0.3, z: SWING.z + 0.82 } },
      { x: SWING.x + 0.3, z: SWING.z + 0.07, yaw: PI, top: 0.47, footFwd: 0.42, stand: { x: SWING.x + 0.3, z: SWING.z + 0.82 } }
    ],
    seatLabels: ['Window 1', 'Window 2', 'Window 3', 'Counter', 'Swing left', 'Swing right'],   // 영어 기본 — 화면 글자는 호스트 setStrings({seatLabels})
    // 커피(coffee.js): 주문 안내가 뜨는 곳(near), 컵이 나오는 자리(pickup), 바리스타 자리, 앉으면 컵을 내려놓는 자리(좌석 번호 순, 없으면 null = 계속 든다)
    coffee: {
      near: { x0: 0.35, x1: 1.3, z0: -1.9, z1: 0.85 },
      pickup: { x: 1.42, y: FL + 0.92, z: 0.2 },
      barista: { x: 1.95, z: -0.55, yaw: PI / 2, x0: 1.78, x1: 2.12, z0: -1.4, z1: 0.3, machine: { x: 2.3, z: -1.0 } },
      cupSpots: [
        { x: -2.03, y: FL + 0.74, z: 2.15 + 0.32 }, { x: -2.03, y: FL + 0.74, z: 0.55 - 0.32 }, { x: -2.03, y: FL + 0.74, z: -1.05 - 0.3 },
        { x: 1.42, y: FL + 0.92, z: -0.5 + 0.12 },
        { x: SWING.x - 1.38, y: 0.56, z: SWING.z + 0.07 }, { x: SWING.x - 1.26, y: 0.56, z: SWING.z - 0.07 }
      ],
      brewSec: 3,
      // 자리로 가져다 주기(coffee.js deliver): 바리스타가 서서 컵을 놓는 자리(좌석 번호 순). 바 스툴은 카운터 너머로 건넨다(통로 안).
      // 호스트가 탁자를 옮기면(그네 앞 탁자 등) Room3D.setSeatAnchors 로 cup·book·serve 를 바꾼다.
      serve: [{ x: -1.62, z: 2.15 + 0.55 }, { x: -1.62, z: 0.55 - 0.65 }, { x: -1.62, z: -1.05 - 0.65 }, { x: 1.95, z: -0.38, across: true }, { x: SWING.x - 1.32, z: SWING.z + 0.62 }, { x: SWING.x - 1.32, z: SWING.z + 0.62 }],
      home: { x: 1.95, z: -0.55 },          // 배달이 끝나면 돌아가는 자리(바리스타 통로)
      exit: { x: 1.95, z: 0.62 }            // 통로 끝(카운터 끝과 진열대 사이) — 통로 안팎을 잇는 곳
    },
    // 앉아서 읽을 때 덮은 책을 놓는 자리(좌석 번호 순, 없으면 무릎 위)
    bookSpots: [{ x: -2.08, y: FL + 0.74, z: 2.15 - 0.05 }, { x: -2.08, y: FL + 0.74, z: 0.55 + 0.05 }, { x: -2.08, y: FL + 0.74, z: -1.05 + 0.05 }, { x: 1.45, y: FL + 0.92, z: -0.62 }, { x: SWING.x - 1.32, y: 0.56, z: SWING.z + 0.05 }, { x: SWING.x - 1.32, y: 0.56, z: SWING.z - 0.1 }],
    sunRot: 100,                                                    // 오후 해가 왼편(마당 쪽)에서 비스듬히: 정면 벽에 결이 살고 그림자가 옆으로 길게, 마당 그네는 역광 — world.js
    camDist: 4.2,                                                   // 좁은 실내: 카메라 팔 기본 길이(m)
    seatView: { side: 0.6 },
    markerRange: 3.2,                                               // 좌석 표식은 3.2 m 안에서만                                        // 앉으면 뒤에서 0.6 rad 비켜 본다(창·벽을 마주 보는 좌석)
    roofs: [{ x0: -2.7, x1: 2.7, z0: -3.5, z1: 3.5 }, { x0: -0.8, x1: 0.8, z0: -5.9, z1: -3.5 }],   // 지붕 아래(카메라 높이 상한을 거는 곳)
    floorZones: [{ x0: -2.6, x1: 2.6, z0: -3.5, z1: 3.5, y: FL }, { x0: -0.7, x1: 0.7, z0: -5.85, z1: -3.3, y: FL }, { x0: -0.15, x1: 2.6, z0: 3.3, z1: 4.45, y: FL }],
    benchPath: [{ x: 0.72, z: 4.2 }, { x: 0.72, z: 2.4 }, { x: 0.1, z: 0.6 }, { x: 0.0, z: -2.2 }, { x: 0.0, z: -4.9 }],
    plan: PLAN,
    info: { name: 'Reading Room', note: 'DESIGN.md plan A' }
  };
  root.RoomLayouts.register(layout);

  // ---- (B) 빌더 ----
  var GARDEN_COLORS = [0xf08fb0, 0xf6cf4a, 0xe0484f, 0xf7f3ea, 0x9a6fd0, 0xf29a3c, 0x6d8fe0, 0xf7836b];
  function gardenSlots() {
    var s = [], P = PLAN.garden.planter, i, b;
    for (i = 0; i < 6; i++) s.push({ x: P.x0 + 0.25 + i * (P.x1 - P.x0 - 0.5) / 5, z: (P.z0 + P.z1) / 2, y: P.h, bed: 'planter' });
    PLAN.garden.beds.forEach(function (bd, k) { for (i = 0; i < 5; i++) s.push({ x: (bd.x0 + bd.x1) / 2 + (i % 2 ? 0.14 : -0.14), z: bd.z0 + 0.22 + i * (bd.z1 - bd.z0 - 0.44) / 4, y: bd.h, bed: 'bed' + k }); });
    return s;
  }
  var DEFAULT_GARDEN = [{ flower: 0, stage: 3 }, { flower: 1, stage: 2 }, { flower: 3, stage: 3 }, { flower: 4, stage: 1 }, { flower: 2, stage: 3 }, { flower: 5, stage: 0 },
    { flower: 6, stage: 3 }, { flower: 0, stage: 2 }, { flower: 7, stage: 3 }, { flower: 1, stage: 3, pot: 1 }, { flower: 3, stage: 1 },
    { flower: 4, stage: 3 }, { flower: 2, stage: 2 }, { flower: 5, stage: 3 }, { flower: 6, stage: 1, pot: 2 }, { flower: 7, stage: 2 }];

  root.RoomBuilders.house = {
    layout: layout,
    baked: true,    // ao_house.js(tools/ao_bake.mjs 로 구움). 지오메트리를 바꾸면 다시 굽는다 — test/bake.test.mjs 가 막는다
    gi: true,       // gi_house.js(빛 번짐, tools/gi_bake.mjs 로 구움)
    planColliders: planColliders,
    gardenSlots: gardenSlots,
    // 썸네일 카메라 2: 0 = 외관(골목에서), 1 = 실내(입구 쪽에서). ?thumb=0|1
    thumbs: [
      { x: -0.4, z: 4.9, yaw: -24, pitch: 5, zoom: 0.95, look: 6, hour: 15 },
      { x: 0.25, z: -1.3, yaw: 10, pitch: 9, zoom: 1.0, look: 7, hour: 20.5 },
      { x: -3.3, z: 2.0, yaw: -90, pitch: 20, zoom: 0.42, hour: 16.5 },   // 2 = 옆마당 화단 가까이(꽃 카드 확인)
      { x: 0.95, z: 0.15, yaw: -72, pitch: 7, zoom: 0.5, look: 4, hour: 19 }   // 3 = 커피 카운터와 바리스타
    ],
    build: function (ctx) {
      var T = ctx.THREE, G = root.RoomGeo, Geo = G.Geo;
      var rnd = ctx.rng(42);
      var WOOD = 0xb07a4a, WOOD_D = 0x6b4428, CHAR = 0x2f3033, CREAM = 0xf3ece0, BRASS = 0xc9a25a;
      function hdr(c, k) { return new T.Color(c).multiplyScalar(k); }

      // == 땅·골목 ==
      ctx.ground({ color: 0x55574f, y: -0.14, size: 400 });
      ctx.floor({ x0: -7.5, x1: 9, z0: 3.5, z1: 6.3, y: 0, surf: 'paving', color: 0xd2cdc4, gloss: 0.15, reflect: false });           // 보도
      ctx.boxAABB({ x0: -14, x1: 14, z0: 6.3, z1: 6.45, y0: -0.13, y1: 0.0, surf: 'concrete' });                       // 경계석
      ctx.floor({ x0: -14, x1: 14, z0: 6.45, z1: 16, y: -0.12, surf: 'asphalt', color: 0x8d97a3, gloss: 0.2, reflect: false });         // 골목 바닥
      for (var li = 0; li < 6; li++) ctx.box({ x: -10 + li * 4.2, y: -0.118, z: 10.4, w: 1.6, h: 0.004, d: 0.12, color: 0xd8d2c0, vary: 0 });   // 가운데 점선
      ctx.floor({ x0: -6.5, x1: -2.6, z0: -3.8, z1: 3.5, y: 0.005, surf: 'lawn', gloss: 0, reflect: false });           // 옆마당 잔디

      // == 배경 판(backdrop slot): 길 건너 건물 줄. setPanel('backdrop', {url}) 로 그림을 바꿀 수 있다 ==
      var bdCanvas = G.makeCanvas(1024, 384), bdTex = new T.CanvasTexture(bdCanvas); bdTex.encoding = T.sRGBEncoding;
      var bdMat = new T.MeshBasicMaterial({ map: bdTex, fog: false, transparent: true });
      var night0 = 0;
      function drawBackdrop(nt) {
        var g = bdCanvas.getContext('2d'), w = 1024, h = 384, r = ctx.rng(7);
        g.clearRect(0, 0, w, h);
        for (var b = 0; b < 14; b++) {
          var bx = b * 76 + r() * 20, bw = 60 + r() * 40, bh = 150 + r() * 200, by = h - bh;
          var shade = nt ? 30 + r() * 20 : 150 + r() * 50;
          g.fillStyle = 'rgb(' + Math.round(shade * 0.95) + ',' + Math.round(shade * 0.93) + ',' + Math.round(shade * (nt ? 1.25 : 0.95)) + ')';
          g.fillRect(bx, by, bw, bh);
          for (var wy = by + 14; wy < h - 20; wy += 22) for (var wx = bx + 8; wx < bx + bw - 12; wx += 16) {
            var lit = r() < (nt ? 0.38 : 0);
            g.fillStyle = lit ? 'rgba(255,214,150,0.95)' : (nt ? 'rgba(20,24,40,0.9)' : 'rgba(90,100,115,0.55)');
            g.fillRect(wx, wy, 8, 11);
          }
        }
        bdTex.needsUpdate = true;
      }
      drawBackdrop(0);
      var backdrop = new T.Mesh(new T.PlaneGeometry(40, 15), bdMat);
      backdrop.position.set(0, 7.2, 17); backdrop.rotation.y = PI; backdrop.userData.noCam = true;
      ctx.add(backdrop);
      var bdLoaded = false, bdUrls = null, bdCur = '', bdTexs = {};
      function bdApply() {
        if (!bdUrls) return;
        var u = night0 ? bdUrls.night : bdUrls.day;
        if (!u || u === bdCur) return;
        bdCur = u;
        if (bdTexs[u]) { bdMat.map = bdTexs[u]; bdMat.needsUpdate = true; return; }
        new T.TextureLoader().load(String(u), function (t) { t.encoding = T.sRGBEncoding; bdTexs[u] = t; if (bdCur === u) { bdMat.map = t; bdMat.needsUpdate = true; bdLoaded = true; } }, undefined, function () { if (bdCur === u) bdCur = ''; });
      }

      // == 이웃 건물(오른쪽)·뒤 건물: 단순한 덩어리 ==
      ctx.boxAABB({ x0: 2.72, x1: 12, z0: -12, z1: 3.5, y0: 0, y1: 7.4, color: 0xd9cfbf, surf: 'stucco' });
      for (var nw = 0; nw < 3; nw++) {
        ctx.boxAABB({ x0: 3.6 + nw * 2.6, x1: 5.0 + nw * 2.6, z0: 3.5, z1: 3.53, y0: 4.2, y1: 5.6, color: 0x3a4250, mat: 'gloss' });
        ctx.boxAABB({ x0: 3.5 + nw * 2.6, x1: 5.1 + nw * 2.6, z0: 3.5, z1: 3.6, y0: 4.12, y1: 4.2, color: 0xbfb4a3 });
      }
      ctx.boxAABB({ x0: 3.4, x1: 6.0, z0: 3.5, z1: 3.53, y0: 0.0, y1: 2.6, color: 0xb9bcbf, mat: 'solid' });   // 이웃 셔터
      for (var sh = 0; sh < 12; sh++) ctx.box({ x: 4.7, y: 0.12 + sh * 0.2, z: 3.535, w: 2.6, h: 0.012, d: 0.01, color: 0x8e9295, vary: 0 });
      ctx.boxAABB({ x0: -16, x1: 12, z0: -16, z1: -7, y0: 0, y1: 5.2, surf: 'plaster_cream', color: 0xb0a698 });   // 뒤 건물(먼 덩어리)
      ctx.floor({ x0: -16, x1: -6.56, z0: -7, z1: 3.5, y: -0.02, surf: 'lawn', color: 0xb8c0a0, gloss: 0, reflect: false });   // 울타리 너머 풀밭
      var farTrees = [];   // 울타리 너머 나무(잎 덩어리 — 아래 leafClump 를 정의한 뒤 짓는다)

      // == 집: 벽(PLAN.walls) + 창 ==
      PLAN.walls.forEach(function (w) { ctx.wall({ x0: w.x0, z0: w.z0, x1: w.x1, z1: w.z1, y: w.y || 0, h: w.h, t: T_W, surf: 'plaster_cream', color: 0xffffff, collide: false, plinth: false, crown: false }); });
      planColliders().forEach(function (c) { var o = {}; for (var k in c) if (k !== 'tag') o[k] = c[k]; ctx.addCollider(o); });
      layout.floorZones.forEach(function (z) { ctx.floorZone(z); });
      // 왼쪽 벽 통창(바닥 가까이부터 천장 가까이까지) + 정면 창: 모서리에서 만난다(모서리 기둥만 남음)
      ctx.window({ x: -2.6, z: 0.35, y: FL + 0.35, face: [1, 0], w: 5.9, h: 2.0, mullions: [-1.475, 0, 1.475], frameSurf: 'wood_oak', frameColor: 0xffffff, frameW: 0.08, sill: true });
      ctx.window({ x: -1.3, z: 3.4, y: FL + 0.45, face: [0, -1], w: 2.4, h: 1.9, mullions: [0], transoms: [1.45], frameSurf: 'wood_oak', frameColor: 0xffffff, frameW: 0.08, sill: true });
      ctx.window({ x: 0.725, z: 3.4, y: 0, face: [0, -1], w: 0.95, h: 2.36, opening: true });
      // 바닥·천장
      ctx.floor({ x0: -2.5, x1: 2.5, z0: -3.3, z1: 3.3, y: FL, surf: 'wood_floor', color: 0xe9ddcd, gloss: 0.45, reflect: 0.25 });
      ctx.floor({ x0: -0.6, x1: 0.6, z0: -5.7, z1: -3.3, y: FL, surf: 'wood_floor', gloss: 0.45, reflect: false });
      ctx.boxAABB({ x0: -0.6, x1: 0.6, z0: -3.5, z1: -3.3, y0: FL - 0.02, y1: FL + 0.005, color: 0x9c7046, mat: 'wood' });   // 복도 문지방
      ctx.ceilingFlat({ x0: -2.5, x1: 2.5, z0: -3.3, z1: 3.3, y: CEIL, color: 0xf6f1e8, gloss: 0.1 });
      ctx.ceilingFlat({ x0: -0.6, x1: 0.6, z0: -5.7, z1: -3.3, y: FL + 2.4, color: 0xf6f1e8, gloss: 0.1 });
      // 걸레받이(나무)
      [[-2.5, -3.3, -2.5, 3.3, [1, 0]], [2.5, -3.3, 2.5, 3.3, [-1, 0]], [-2.5, -3.3, -0.6, -3.3, [0, 1]], [0.6, -3.3, 2.5, -3.3, [0, 1]], [-2.5, 3.3, 0.25, 3.3, [0, -1]], [1.2, 3.3, 2.5, 3.3, [0, -1]]].forEach(function (b) {
        var f = b[4];
        ctx.boxAABB({ x0: Math.min(b[0], b[2]) - (f[0] < 0 ? 0.015 : 0), x1: Math.max(b[0], b[2]) + (f[0] > 0 ? 0.015 : 0), z0: Math.min(b[1], b[3]) - (f[1] < 0 ? 0.015 : 0), z1: Math.max(b[1], b[3]) + (f[1] > 0 ? 0.015 : 0), y0: FL, y1: FL + 0.08, color: 0x9a6a40, mat: 'wood' });
      });
      // 지붕 슬래브 + 깊은 처마(나무 천장) + 테두리
      ctx.boxAABB({ x0: -2.75, x1: 2.75, z0: -3.55, z1: 4.45, y0: 2.98, y1: 3.14, color: 0xe9e4dc });
      ctx.ceilingFlat({ x0: -2.75, x1: 2.75, z0: 3.5, z1: 4.45, y: 2.975, surf: 'wood_light', gloss: 0.3 });
      [[-2.8, 2.8, 4.45, 4.51], [-2.8, 2.8, -3.61, -3.55]].forEach(function (f) { ctx.boxAABB({ x0: f[0], x1: f[1], z0: f[2], z1: f[3], y0: 2.96, y1: 3.2, color: CHAR, mat: 'metal' }); });
      [[-2.81, -2.75], [2.75, 2.81]].forEach(function (f) { ctx.boxAABB({ x0: f[0], x1: f[1], z0: -3.61, z1: 4.51, y0: 2.96, y1: 3.2, color: CHAR, mat: 'metal' }); });
      ctx.boxAABB({ x0: -0.8, x1: 0.8, z0: -5.95, z1: -3.5, y0: 2.68, y1: 2.82, color: 0xe9e4dc });
      // 처마 아래 다운라이트 3
      [-1.6, 0.72, 1.9].forEach(function (x) { ctx.glow.add(Geo.cyl(12, 1), hdr(0xffe2b0, 2.2), { x: x, y: 2.955, z: 4.0, sx: 0.07, sy: 0.02, sz: 0.07, flat: true, vary: 0 }); ctx.addGlow({ x: x, y: 2.9, z: 4.0, size: 0.7, color: 0xffd9a0, kind: 'lamp', bake: { type: 'eave', y: 2.94 } }); });

      // 식물: 소유자 제공 사진 오림(P01~P07, plants.js) — 교차 알파 카드. 잎 덩어리는 나무 그림(P06)의 잎 부분을 여러 방향으로 놓은 잎 카드.
      // 종류마다 메시 1(카드 수백 장이 draw call 7 안팎). 그림자를 받고 드리운다. AO 는 굽지 않는다(잎이 굽기 파일을 키우지 않게).
      var PLT = root.RoomPlants ? root.RoomPlants.create(ctx) : null;
      function leafTint(base, outer) {   // 사진 잎 색에 아주 조금만 곱한다(밝기 흔들림 + 바깥쪽 조금 밝고 노랗게)
        var v = 0.72 + rnd() * 0.26 + outer * 0.1, c = new T.Color(base || 0x5f8a45), g = c.g || 1;
        return new T.Color(v * (0.92 + 0.08 * c.r / g), v, v * (0.88 + 0.12 * c.b / g + outer * -0.06));
      }
      function leafClump(cx, cy, cz, R, n, base, sy) {
        if (!PLT) return;
        var k = sy || 1, m = Math.max(4, Math.round(n * 0.45));
        for (var i = 0; i < m; i++) {
          var u = rnd() * 2 - 1, a = rnd() * PI * 2, rr = Math.pow(rnd(), 0.5) * R * 0.72, sq = Math.sqrt(1 - u * u);
          PLT.leaf('tree', { x: cx + Math.cos(a) * sq * rr, y: cy + u * rr * 0.8 * k, z: cz + Math.sin(a) * sq * rr, size: R * (0.8 + rnd() * 0.4), center: [cx, cy - R * 0.3, cz], tint: leafTint(base, rr / R) });
        }
      }
      // 나무 줄기·가지: 껍질 PBR(bark) 원기둥 — 줄기는 조금 휘고 위로 갈수록 가늘다. 가지 끝에 잎 덩어리
      var barkB = ctx.surfBatch('bark'), _up = new T.Vector3(0, 1, 0), _dv = new T.Vector3(), _qt = new T.Quaternion();
      function limb(p0, p1, r0, r1, seg) {
        _dv.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]); var L = _dv.length(); _dv.normalize(); _qt.setFromUnitVectors(_up, _dv);
        barkB.add(new T.CylinderGeometry(r1, r0, L * 1.02, seg || 8, 1, true), 0xcdc4ba, { x: (p0[0] + p1[0]) / 2, y: (p0[1] + p1[1]) / 2, z: (p0[2] + p1[2]) / 2, q: _qt, flat: false, vary: 0.03 });
      }
      function tree(x, z, H, R, nLeaf, base, y0) {
        var y = y0 || 0, r0 = 0.035 + H * 0.016, bend = (rnd() - 0.5) * 0.25, p = [x, y - 0.05, z], tips = [];
        for (var s2 = 1; s2 <= 4; s2++) {   // 줄기 4 마디
          var t = s2 / 4, q = [x + Math.sin(t * 2.2) * bend * H * 0.12, y + H * 0.62 * t, z + Math.cos(t * 1.7) * bend * H * 0.08];
          limb(p, q, r0 * (1 - 0.45 * (t - 0.25)), r0 * (1 - 0.45 * t), 9); p = q;
        }
        var nb = 4 + Math.floor(rnd() * 2);
        for (var b2 = 0; b2 < nb; b2++) {   // 가지: 줄기 위쪽에서 바깥·위로
          var a = b2 / nb * PI * 2 + rnd() * 0.6, hy = y + H * (0.42 + rnd() * 0.2), base0 = [x + bend * 0.05, hy, z];
          var tip = [x + Math.cos(a) * R * 0.75, hy + H * (0.18 + rnd() * 0.15), z + Math.sin(a) * R * 0.75];
          var mid = [(base0[0] + tip[0]) / 2, (base0[1] + tip[1]) / 2 + 0.08, (base0[2] + tip[2]) / 2];
          limb(base0, mid, r0 * 0.45, r0 * 0.3, 6); limb(mid, tip, r0 * 0.3, r0 * 0.12, 6); tips.push(tip);
        }
        tips.push([p[0], p[1] + H * 0.15, p[2]]);
        tips.forEach(function (tp) { leafClump(tp[0], tp[1] + R * 0.1, tp[2], R * 0.62, Math.round(nLeaf / tips.length), base); });
        leafClump(x, y + H * 0.78, z, R * 0.85, Math.round(nLeaf * 0.5), base);
      }
      [[-8.2, -2.5, 4.2], [-9.6, 1.0, 5.0], [-8.4, 4.4, 3.6], [-11.5, -1.0, 5.6], [-12.0, 3.2, 4.8]].forEach(function (t) {
        tree(t[0], t[1], t[2], t[2] * 0.36, 46, [0x5a8640, 0x6b8f45, 0x4f7a3a][Math.floor(rnd() * 3)], -0.1);
      });
      // == 입구: 유리 낀 나무 문(안쪽으로 열림) + 데크 한 단 ==
      ctx.boxAABB({ x0: 0.22, x1: 1.23, z0: 3.28, z1: 3.52, y0: 2.33, y1: 2.4, surf: 'wood_oak', color: 0xd8b890 });          // 문틀 위
      ctx.boxAABB({ x0: 0.2, x1: 0.26, z0: 3.28, z1: 3.52, y0: 0, y1: 2.4, surf: 'wood_oak', color: 0xd8b890 });
      ctx.boxAABB({ x0: 1.19, x1: 1.25, z0: 3.28, z1: 3.52, y0: 0, y1: 2.4, surf: 'wood_oak', color: 0xd8b890 });
      (function door() {   // 경첩 x=1.2, 안쪽(-z)으로 90° 열려 오른쪽 벽 쪽에 붙음: 문짝 x 1.17..1.25, z 2.4..3.3
        var x0 = 1.17, x1 = 1.24, z0 = 2.38, z1 = 3.3, y0 = FL + 0.01, y1 = FL + 2.17;
        ctx.boxAABB({ x0: x0, x1: x1, z0: z0, z1: z0 + 0.12, y0: y0, y1: y1, surf: 'wood_oak', color: 0xffffff });
        ctx.boxAABB({ x0: x0, x1: x1, z0: z1 - 0.12, z1: z1, y0: y0, y1: y1, surf: 'wood_oak', color: 0xffffff });
        ctx.boxAABB({ x0: x0, x1: x1, z0: z0, z1: z1, y0: y0, y1: y0 + 0.62, surf: 'wood_oak', color: 0xffffff });
        ctx.boxAABB({ x0: x0, x1: x1, z0: z0, z1: z1, y0: y1 - 0.12, y1: y1, surf: 'wood_oak', color: 0xffffff });
        var gx = (x0 + x1) / 2;
        ctx.glassPane([[gx, y0 + 0.62, z0 + 0.12], [gx, y0 + 0.62, z1 - 0.12], [gx, y1 - 0.12, z1 - 0.12], [gx, y1 - 0.12, z0 + 0.12]]);
        ctx.cyl({ x: x0 - 0.04, y: FL + 0.95, z: z0 + 0.2, r: 0.018, h: 0.32, seg: 8, color: CHAR, mat: 'metal' });   // 세로 손잡이
      })();
      ctx.boxAABB({ x0: -0.15, x1: 2.6, z0: 3.5, z1: 4.45, y0: 0, y1: FL, surf: 'wood_light', color: 0xcfa77a });        // 데크
      for (var dk = 0; dk < 9; dk++) ctx.box({ x: 1.225, y: FL - 0.002, z: 3.55 + dk * 0.105, w: 2.74, h: 0.004, d: 0.008, color: 0x6e4a2c, vary: 0 });   // 데크 판 이음
      // 문 왼쪽 테라코타 화분 장미(참고 그림: 문 가까이 장미)
      ctx.cyl({ x: 0.02, y: FL, z: 3.8, r: 0.13, rTop: 0.17, h: 0.3, seg: 20, surf: 'terracotta', color: 0xffffff, flat: false });
      ctx.cyl({ x: 0.02, y: FL + 0.27, z: 3.8, r: 0.18, rTop: 0.18, h: 0.045, seg: 20, surf: 'terracotta', color: 0xf0e4dc, flat: false });
      ctx.cyl({ x: 0.02, y: FL + 0.3, z: 3.8, r: 0.15, h: 0.012, seg: 16, surf: 'soil' });
      if (PLT) PLT.add('rose', { x: 0.02, y: FL + 0.3, z: 3.8, h: 0.7, planes: 3 });
      // 화분 나무(데크) + 세로 입간판
      ctx.cyl({ x: 2.32, y: FL, z: 3.9, r: 0.24, rTop: 0.27, h: 0.5, seg: 16, color: 0xe8e4dc, mat: 'gloss', flat: false });
      ctx.cyl({ x: 2.32, y: FL + 0.48, z: 3.9, r: 0.22, h: 0.03, seg: 14, surf: 'soil' });
      limb([2.32, FL + 0.48, 3.9], [2.33, FL + 1.25, 3.91], 0.028, 0.02, 7); limb([2.33, FL + 1.25, 3.91], [2.3, FL + 1.55, 3.88], 0.02, 0.012, 6);
      leafClump(2.32, FL + 1.5, 3.9, 0.42, 34, 0x6f8f45);
      ctx.box({ x: 1.55, y: FL, z: 4.08, w: 0.46, h: 0.95, d: 0.04, rx: 0.16, surf: 'wood_dark', color: 0xb98a5c });
      ctx.box({ x: 1.55, y: FL, z: 4.24, w: 0.46, h: 0.95, d: 0.04, rx: -0.16, surf: 'wood_dark', color: 0xb98a5c });

      // == 간판·벽등(바깥) ==
      ctx.boxAABB({ x0: 1.36, x1: 2.36, z0: 3.5, z1: 3.55, y0: 1.5, y1: 2.18, color: 0x8a5a34, mat: 'wood' });
      var panels = {};
      // 화면 글자: 호스트가 setStrings 로 준다(strings.js). 없으면 중립 영어 기본값
      function STR(k, d) { var R = root.RoomStrings, v = R ? R.get(k) : null; return v == null ? d : v; }
      function panel(id, o) {
        var cw = o.px || 512, chh = Math.round(cw * o.h / o.w), cv = G.makeCanvas(cw, chh), tx = new T.CanvasTexture(cv);
        tx.encoding = T.sRGBEncoding; tx.anisotropy = 4;
        var mat = o.screen ? new T.MeshBasicMaterial({ map: tx, toneMapped: true, fog: true }) : new T.MeshStandardMaterial({ map: tx, roughness: 0.85, transparent: !!o.alpha });
        if (o.screen) mat.color = new T.Color(1.6, 1.6, 1.6);
        var m = new T.Mesh(new T.PlaneGeometry(o.w, o.h), mat);
        m.position.set(o.x, o.y, o.z); m.rotation.set(o.rx || 0, o.ry || 0, 0, 'YXZ'); m.receiveShadow = !o.screen; m.renderOrder = o.alpha ? 3 : 0;
        ctx.add(m);
        var P = panels[id] = { canvas: cv, tex: tx, mesh: m, draw: o.draw, data: o.data || {} };
        P.redraw = function (d) { if (d) P.data = d; var g = cv.getContext('2d'); g.clearRect(0, 0, cw, chh); P.draw(g, cw, chh, P.data); tx.needsUpdate = true; };
        P.redraw();
        return P;
      }
      var FONT = '"Pretendard","Noto Sans KR","Apple SD Gothic Neo","WenQuanYi Zen Hei",sans-serif';
      panel('sign', { x: 1.86, y: 1.84, z: 3.556, w: 0.9, h: 0.58, px: 512, data: { title: STR('signTitle', 'Reading Room'), sub: STR('signSub', 'SINCE 2026') }, draw: function (g, w, h, d) {
        g.fillStyle = '#f4ecdc'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#3b2a1e'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '700 ' + Math.round(h * 0.34) + 'px ' + FONT; g.fillText(d.title || '', w / 2, h * 0.42);
        g.font = '500 ' + Math.round(h * 0.1) + 'px ' + FONT; g.fillText(d.sub || '', w / 2, h * 0.76);
      } });
      // 벽등(간판 위)
      ctx.box({ x: 1.86, y: 2.45, z: 3.56, w: 0.08, h: 0.08, d: 0.12, color: CHAR, mat: 'metal' });
      ctx.cone({ x: 1.86, y: 2.38, z: 3.68, r: 0.13, h: 0.14, seg: 14, color: CHAR, mat: 'metal' });
      ctx.glow.add(Geo.sph(10, 6), hdr(0xffd79a, 2.6), { x: 1.86, y: 2.36, z: 3.68, sx: 0.06, sy: 0.04, sz: 0.06, flat: false, vary: 0 });
      ctx.addGlow({ x: 1.86, y: 2.3, z: 3.72, size: 1.1, color: 0xffcf8a, kind: 'lamp', bake: { type: 'wall', y: 2.34 } });
      ctx.addLight({ x: 1.86, y: 2.2, z: 3.95, color: 0xffc27a, intensity: 0.55, distance: 6, kind: 'lamp' });

      // == 앞 화단(정면 창 아래) + 옆마당 화단 2 + 디딤돌 + 낮은 울타리 ==
      var PL = PLAN.garden.planter;
      ctx.boxAABB({ x0: PL.x0, x1: PL.x1, z0: PL.z0, z1: PL.z1, y0: 0, y1: PL.h, surf: 'concrete', color: 0xd6d2ca });
      ctx.boxAABB({ x0: PL.x0 + 0.06, x1: PL.x1 - 0.06, z0: PL.z0 + 0.06, z1: PL.z1 - 0.06, y0: PL.h - 0.04, y1: PL.h - 0.02, surf: 'soil' });
      // 집 벽을 따라 놓인 화단: 둥근 돌 테두리 + 흙 + 수국·라벤더·데이지 덤불(앱 꽃 자리는 drawGarden 이 따로)
      PLAN.garden.beds.forEach(function (b, bi) {
        ctx.boxAABB({ x0: b.x0 + 0.06, x1: b.x1 - 0.06, z0: b.z0 + 0.06, z1: b.z1 - 0.06, y0: 0, y1: b.h - 0.02, surf: 'soil' });
        var per = 2 * ((b.x1 - b.x0) + (b.z1 - b.z0)), n = Math.round(per / 0.2);
        for (var k = 0; k < n; k++) {
          var d = k / n * per, px, pz, w = b.x1 - b.x0, l = b.z1 - b.z0;
          if (d < w) { px = b.x0 + d; pz = b.z0; } else if (d < w + l) { px = b.x1; pz = b.z0 + d - w; } else if (d < 2 * w + l) { px = b.x1 - (d - w - l); pz = b.z1; } else { px = b.x0; pz = b.z1 - (d - 2 * w - l); }
          ctx.ico({ x: px, y: 0.06, z: pz, sx: 0.11 + rnd() * 0.03, sy: 0.08 + rnd() * 0.03, sz: 0.1 + rnd() * 0.03, surf: 'stone', color: 0xe0dcd4, detail: 1, flat: false });
        }
        // 참고 그림처럼: 벽 쪽 뒤줄에 수국, 앞 가장자리에 라벤더·데이지(앱 꽃 자리는 가운데 — drawGarden)
        var bl = b.z1 - b.z0;
        for (var hq = 0; hq < 3; hq++) bedPlant('hydrangea', b.x1 - 0.16, b.z0 + 0.22 + hq * (bl - 0.44) / 2, b.h - 0.03, 0.62 + rnd() * 0.16);
        for (var lq = 0; lq < 4; lq++) bedPlant(lq % 2 ? 'daisy' : 'lavender', b.x0 + 0.15, b.z0 + 0.18 + lq * (bl - 0.36) / 3, b.h - 0.03, 0.36 + rnd() * 0.1);
      });
      function bedPlant(kind, x, z, y, h, tint) {
        if (!PLT) return;
        var v = 0.88 + rnd() * 0.16;
        PLT.add(kind, { x: x + (rnd() - 0.5) * 0.05, y: y, z: z + (rnd() - 0.5) * 0.05, h: h, planes: kind === 'lavender' || kind === 'daisy' ? 2 : 3, tint: tint || new T.Color(v, v, v * (0.96 + rnd() * 0.06)) });
      }
      // 둥근 디딤돌: 골목 쪽 입구에서 그네 앞까지
      for (var st = 0; st < 7; st++) { var sz2 = 3.1 - st * 0.72; ctx.cyl({ x: -4.4 - st * 0.04 + (st % 2 ? 0.1 : -0.08), y: 0.0, z: sz2, r: 0.25 + rnd() * 0.04, h: 0.045, seg: 20, surf: 'stone', color: 0xffffff, flat: false }); }
      function fence(x0, z0, x1, z1) {
        var dx = x1 - x0, dz = z1 - z0, L = Math.sqrt(dx * dx + dz * dz), n = Math.max(1, Math.round(L / 0.12)), ry = Math.atan2(dx, dz);
        for (var i = 0; i <= n; i++) { var t = i / n; ctx.box({ x: x0 + dx * t, y: 0, z: z0 + dz * t, w: 0.07, h: 0.72 + (i % 2 ? 0 : 0.04), d: 0.025, ry: ry + PI / 2, surf: 'wood_light', color: 0xead9c2 }); }
        [0.22, 0.55].forEach(function (yy) { ctx.box({ x: (x0 + x1) / 2, y: yy, z: (z0 + z1) / 2, w: 0.03, h: 0.06, d: L, ry: ry, surf: 'wood_light', color: 0xd8c3a5 }); });
      }
      fence(-6.5, -3.7, -6.5, 3.5); fence(-6.5, 3.5, -5.0, 3.5);
      // 마당 뒤 회벽 담(높이 1.7) + 담쟁이 + 위 돌림띠
      ctx.boxAABB({ x0: -6.56, x1: -2.7, z0: -3.9, z1: -3.7, y0: 0, y1: 1.7, surf: 'plaster_cream', color: 0xe6d8c0 });
      ctx.boxAABB({ x0: -6.6, x1: -2.7, z0: -3.94, z1: -3.66, y0: 1.7, y1: 1.76, surf: 'stone', color: 0xece6dc });
      // 담쟁이(P07 사진 오림): 담 앞면(z -3.69)에 붙어 담 위에서 늘어진 줄기 판 — 왼쪽 모서리에 몰리고 오른쪽에 조금(참고 그림)
      [[-6.38, 1.25], [-6.2, 0.95], [-6.02, 1.4], [-5.82, 0.8], [-5.55, 1.1], [-5.3, 0.6], [-4.6, 0.7], [-4.25, 1.05], [-3.9, 0.75], [-3.15, 1.2], [-2.95, 0.9]].forEach(function (v, i) {
        if (PLT) PLT.flat('ivy', { x: v[0] + (rnd() - 0.5) * 0.06, y: 1.78, z: -3.69, h: v[1] + 0.25, nrm: [0, 0, 1], flip: i % 2 === 1, tint: new T.Color(0.85 + rnd() * 0.15, 0.9 + rnd() * 0.1, 0.85 + rnd() * 0.1) });
      });
      // 담을 따라 좁은 화단(흙) — 수국·라벤더·데이지(참고 그림의 담 앞 꽃줄)
      ctx.boxAABB({ x0: -6.38, x1: -2.8, z0: -3.69, z1: -3.36, y0: 0, y1: 0.05, surf: 'soil' });
      for (var wq = 0; wq < 9; wq++) {
        var wx = -6.2 + wq * 0.42;
        if (wx > -5.45 && wx < -4.05) { bedPlant(wq % 2 ? 'daisy' : 'lavender', wx, -3.5, 0.04, 0.34 + rnd() * 0.08); continue; }   // 그네 뒤는 낮게
        bedPlant(['hydrangea', 'lavender', 'echinacea', 'hydrangea', 'daisy'][wq % 5], wx, -3.52, 0.04, 0.5 + rnd() * 0.2);
      }
      // 담 너머 나무(배경)
      [[-5.6, -5.2, 4.6], [-3.6, -5.6, 5.4], [-1.6, -6.3, 4.4]].forEach(function (t) {
        tree(t[0], t[1], t[2], t[2] * 0.34, 48, 0x5d8a40);
      });
      // 집 옆벽 바깥 검은 벽등(갓 달린 헛간 등)
      (function barnLamp(x, y, z) {
        ctx.box({ x: x - 0.02, y: y - 0.1, z: z, w: 0.04, h: 0.2, d: 0.14, surf: 'metal', color: 0x2a2a2c });
        ctx.beam3([x - 0.04, y, z], [x - 0.3, y + 0.06, z], 0.025, 0.025, 0x2a2a2c, ctx.metalB);
        ctx.cyl({ x: x - 0.32, y: y - 0.12, z: z, r: 0.17, rTop: 0.05, h: 0.15, seg: 20, surf: 'metal', color: 0x2a2a2c, flat: false });
        ctx.glow.add(Geo.sph(10, 6), hdr(0xffd79a, 2.4), { x: x - 0.32, y: y - 0.12, z: z, sx: 0.07, sy: 0.04, sz: 0.07, flat: false, vary: 0 });
        ctx.addGlow({ x: x - 0.32, y: y - 0.18, z: z, size: 0.9, color: 0xffcf8a, kind: 'lamp', bake: { type: 'barn', y: y - 0.1 } });
      })(-2.7, 2.35, -1.6);
      // 테라코타 화분 덤불(화단 옆)
      ctx.cyl({ x: -3.2, y: 0, z: -2.0, r: 0.16, rTop: 0.2, h: 0.34, seg: 20, surf: 'terracotta', color: 0xffffff, flat: false });
      ctx.cyl({ x: -3.2, y: 0.3, z: -2.0, r: 0.21, rTop: 0.21, h: 0.05, seg: 20, surf: 'terracotta', color: 0xf0e4dc, flat: false });   // 화분 테
      ctx.cyl({ x: -3.2, y: 0.33, z: -2.0, r: 0.18, h: 0.012, seg: 16, surf: 'soil' });
      bedPlant('rose', -3.2, -2.0, 0.33, 0.62);
      // 마당 나무 + 울타리 쪽 덤불
      tree(-6.0, -0.7, 3.6, 1.25, 90, 0x5d8a40);
      for (var hb = 0; hb < 11; hb++) leafClump(-6.15 + rnd() * 0.2, 0.3, -3.4 + hb * 0.62, 0.38, 9, 0x557f3d, 0.75);
      // 옆마당 2인 그네: A 자 나무 틀(고정) + 밧줄 둘에 매달린 좌석(높이 0.45 — 아바타 앉는 높이와 같다).
      // 매달린 부분(밧줄·좌석·등받이·팔걸이)은 따로 한 묶음(draw call 1)으로 틀 윗보에 매달려, 누가 앉아 있을 때만 아주 작게 흔들린다(±1.6°, 3.6초 주기).
      // 앉은 아바타도 같은 만큼 옮긴다(hooks.seatOffset) — 좌석과 몸이 어긋나지 않는다. 움직임 줄이기 설정이면 흔들지 않는다.
      var swingPivot = null, swingTheta = 0, swingAmp = 0, SW_TOP = 2.15, SW_SEAT = 0.45;
      (function swing() {
        // 좌표: 앉는 사람은 +z 를 본다. 너비(u)는 x, 앞(f)은 +z. 틀 = 양 끝 A 자 다리(앞뒤로 벌어짐) + 윗보, 매달린 좌석 = 밧줄 둘 + 좌석·등받이·팔걸이·방석
        var xc = SWING.x, zc = SWING.z, top = SW_TOP, sy = SW_SEAT, W = 1.44, x0 = xc - W / 2, x1 = xc + W / 2;
        var OAK = 'wood_oak', fw = ctx.surfBatch(OAK);
        [xc - 0.92, xc + 0.92].forEach(function (x) {
          fw.addBeam([x, top, zc], [x, -0.02, zc - 0.62], 0.085, 0.085, 0xffffff, { vary: 0.03 });
          fw.addBeam([x, top, zc], [x, -0.02, zc + 0.62], 0.085, 0.085, 0xffffff, { vary: 0.03 });
          fw.addBeam([x, 0.72, zc - 0.41], [x, 0.72, zc + 0.41], 0.06, 0.06, 0xffffff, { vary: 0.03 });   // 가로 버팀
          fw.addBeam([x, top - 0.28, zc - 0.08], [x, top - 0.28, zc + 0.08], 0.05, 0.05, 0xffffff, { vary: 0.03 });
        });
        fw.addBeam([xc - 1.06, top + 0.06, zc], [xc + 1.06, top + 0.06, zc], 0.1, 0.12, 0xffffff, { vary: 0.03 });   // 윗보
        [xc - 1.06, xc + 1.06].forEach(function (x) { ctx.box({ x: x + (x < xc ? -0.003 : 0.003), y: top, z: zc, w: 0.006, h: 0.12, d: 0.1, surf: 'wood_end', color: 0xffffff }); });   // 보 끝 나뭇결
        // 매달린 부분: 따로 묶음 셋(나무·밧줄·방석) — 같은 축(윗보)에 매달려 함께 흔들린다
        function sbatch(name, tile) { var bb = new G.Batch(91 + name.length); bb.enableUV(tile, tile); return { b: bb, name: name }; }
        var BW = sbatch(OAK, ctx.surfaces[OAK].tile), BR = sbatch('rope', ctx.surfaces.rope.tile), BC = sbatch('linen_a', ctx.surfaces.linen_a.tile), BC2 = sbatch('linen_b', ctx.surfaces.linen_b.tile);
        function bx(B, o) { B.b.add(Geo.box(), 0xffffff, Object.assign({ flat: true, vary: 0.04 }, o)); }
        // 좌석 판(앞뒤 가로 판 5) + 앞·뒤 틀
        for (var sl = 0; sl < 5; sl++) bx(BW, { x: xc, y: sy - 0.07, z: zc - 0.2 + sl * 0.095, sx: W, sy: 0.035, sz: 0.08 });
        bx(BW, { x: xc, y: sy - 0.12, z: zc + 0.22, sx: W, sy: 0.06, sz: 0.05 }); bx(BW, { x: xc, y: sy - 0.12, z: zc - 0.24, sx: W, sy: 0.06, sz: 0.05 });
        // 등받이: 위아래 가로대 + 세로 살 11
        bx(BW, { x: xc, y: sy + 0.06, z: zc - 0.27, sx: W, sy: 0.05, sz: 0.045, rx: -0.1 });
        bx(BW, { x: xc, y: sy + 0.47, z: zc - 0.31, sx: W + 0.04, sy: 0.07, sz: 0.05, rx: -0.1 });
        for (var vs = 0; vs < 11; vs++) bx(BW, { x: x0 + 0.1 + vs * (W - 0.2) / 10, y: sy + 0.08, z: zc - 0.285, sx: 0.045, sy: 0.4, sz: 0.022, rx: -0.1 });
        // 팔걸이 + 앞 기둥 + 뒤 기둥
        [x0 + 0.02, x1 - 0.02].forEach(function (x) {
          bx(BW, { x: x, y: sy + 0.2, z: zc - 0.02, sx: 0.07, sy: 0.04, sz: 0.56 });
          bx(BW, { x: x, y: sy - 0.12, z: zc + 0.2, sx: 0.05, sy: 0.33, sz: 0.05 });
          bx(BW, { x: x, y: sy - 0.12, z: zc - 0.29, sx: 0.05, sy: 0.62, sz: 0.05, rx: -0.1 });
        });
        // 밧줄: 양쪽 하나씩 — 팔걸이 바깥 끝에서 윗보까지, 보 위에서 감아 맨 매듭
        [x0 - 0.02, x1 + 0.02].forEach(function (x) {
          BR.b.addBeam([x, sy + 0.24, zc + 0.16], [x, top + 0.04, zc + 0.04], 0.03, 0.03, 0xffffff, { vary: 0.02 });
          BR.b.addBeam([x, sy + 0.24, zc - 0.22], [x, top + 0.04, zc - 0.04], 0.03, 0.03, 0xffffff, { vary: 0.02 });
          BR.b.add(new T.TorusGeometry(1, 0.32, 6, 14), 0xffffff, { x: x, y: top + 0.06, z: zc, s: 0.085, ry: PI / 2, flat: false, vary: 0 });   // 보에 감은 고리
          BR.b.add(Geo.sph(10, 8), 0xffffff, { x: x, y: top - 0.08, z: zc, sx: 0.045, sy: 0.06, sz: 0.045, flat: false, vary: 0 });         // 매듭
          BR.b.add(Geo.sph(8, 6), 0xffffff, { x: x, y: top - 0.2, z: zc, sx: 0.035, sy: 0.05, sz: 0.035, flat: false, vary: 0 });
        });
        // 방석: 앉는 방석(윗면 0.47 — 앉는 높이 0.45 와 맞음) + 등 쿠션 둘
        BC.b.add(Geo.box(), 0xffffff, { x: xc, y: sy - 0.05, z: zc - 0.01, sx: W - 0.12, sy: 0.07, sz: 0.46, flat: false, vary: 0 });
        BC.b.add(Geo.sph(16, 10), 0xffffff, { x: xc, y: sy + 0.015, z: zc - 0.01, sx: (W - 0.14) / 2, sy: 0.02, sz: 0.22, flat: false, vary: 0 });
        [-0.33, 0.33].forEach(function (u) { BC2.b.add(Geo.sph(18, 12), 0xffffff, { x: xc + u, y: sy + 0.25, z: zc - 0.22, sx: 0.27, sy: 0.18, sz: 0.07, rx: -0.15, flat: false, vary: 0 }); });
        swingPivot = new T.Group(); swingPivot.name = 'swing'; swingPivot.position.set(xc, top, zc);
        [BW, BR, BC, BC2].forEach(function (B) {
          var g = B.b.build(ctx.mats.surface(B.name, { vertex: true }), 'swing_' + B.name, { cast: true, receive: true });
          g.position.set(-xc, -top, -zc); swingPivot.add(g);
        });
        ctx.add(swingPivot);
        ctx.aoDecal({ x0: xc - 0.95, x1: xc + 0.95, z0: zc - 0.6, z1: zc + 0.6, y: 0.006, pad: 0.25 });
      })();
      // 그네 옆 작은 오크 탁자(좌석 4·5 의 컵 자리)
      (function () {
        var tx = SWING.x - 1.32, tz = SWING.z;
        ctx.cyl({ x: tx, y: 0.52, z: tz, r: 0.24, h: 0.04, seg: 24, surf: 'wood_oak', color: 0xf0e0c8, flat: false });
        ctx.cyl({ x: tx, y: 0.0, z: tz, r: 0.035, h: 0.52, seg: 10, surf: 'wood_oak', color: 0xe0ccb0, flat: false });
        [0, 2.1, 4.2].forEach(function (a) { ctx.beam3([tx, 0.12, tz], [tx + Math.cos(a) * 0.2, 0.0, tz + Math.sin(a) * 0.2], 0.03, 0.03, 0xffffff, ctx.surfBatch('wood_oak')); });
      })();
      var reduced = false;
      try { reduced = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { reduced = false; }
      ctx.onUpdate(function (dt, t) {
        var occ = ctx.occupied || {}, want = (occ.S4 || occ.S5) && !reduced ? 0.028 : 0;
        swingAmp += (want - swingAmp) * Math.min(1, dt * 0.7);
        swingTheta = swingAmp * Math.sin(t * PI * 2 / 3.6);
        if (swingPivot) swingPivot.rotation.x = swingTheta;   // 앞뒤로(좌석이 보는 +z 방향)
      });
      // 노란 자전거(보도, 정면 창 앞)
      (function bike() {
        var z = 4.42, yel = 0xe6b833;
        var ring = new T.TorusGeometry(1, 0.075, 6, 28);
        [-3.45, -2.5].forEach(function (x) {
          ctx.solid.add(ring, 0x1e1e20, { x: x, y: 0.34, z: z, s: 0.32, flat: false, vary: 0 });
          ctx.solid.add(ring, 0xb9bcc0, { x: x, y: 0.34, z: z, s: 0.27, flat: false, vary: 0 });
          for (var sp = 0; sp < 4; sp++) { var a = sp * PI / 4; ctx.beam3([x - Math.cos(a) * 0.27, 0.34 - Math.sin(a) * 0.27, z], [x + Math.cos(a) * 0.27, 0.34 + Math.sin(a) * 0.27, z], 0.008, 0.008, 0x9a9da0); }
        });
        ctx.beam3([-3.45, 0.34, z], [-3.0, 0.82, z], 0.035, 0.035, yel, ctx.solid);
        ctx.beam3([-3.45, 0.34, z], [-2.95, 0.36, z], 0.035, 0.035, yel, ctx.solid);
        ctx.beam3([-2.95, 0.36, z], [-3.0, 0.82, z], 0.035, 0.035, yel, ctx.solid);
        ctx.beam3([-2.95, 0.36, z], [-2.62, 0.86, z], 0.035, 0.035, yel, ctx.solid);
        ctx.beam3([-3.0, 0.82, z], [-2.62, 0.86, z], 0.035, 0.035, yel, ctx.solid);
        ctx.beam3([-2.62, 0.86, z], [-2.5, 0.34, z], 0.03, 0.03, yel, ctx.solid);
        ctx.box({ x: -3.02, y: 0.86, z: z, w: 0.22, h: 0.05, d: 0.1, color: 0x6b3f22 });
        ctx.beam3([-2.66, 0.86, z], [-2.66, 1.0, z], 0.025, 0.025, 0x2a2a2a);
        ctx.beam3([-2.66, 1.0, z - 0.22], [-2.66, 1.0, z + 0.22], 0.025, 0.025, 0x2a2a2a);
        ctx.box({ x: -2.42, y: 0.84, z: z, w: 0.26, h: 0.2, d: 0.3, color: 0xa8814f, surf: 'wood_light' });
      })();
      // 가로등(골목 왼쪽)
      ctx.cyl({ x: -6.2, y: 0, z: 6.1, r: 0.07, rTop: 0.05, h: 4.6, seg: 8, color: 0x3a3d42, mat: 'metal' });
      ctx.beam3([-6.2, 4.5, 6.1], [-5.4, 4.62, 6.1], 0.06, 0.06, 0x3a3d42);
      ctx.box({ x: -5.35, y: 4.5, z: 6.1, w: 0.36, h: 0.1, d: 0.2, color: 0x3a3d42, mat: 'metal' });
      ctx.glow.add(Geo.box(), hdr(0xffe6b8, 2.0), { x: -5.35, y: 4.48, z: 6.1, sx: 0.3, sy: 0.02, sz: 0.16, flat: true, vary: 0 });
      ctx.addGlow({ x: -5.35, y: 4.4, z: 6.1, size: 2.6, color: 0xffdca0, kind: 'lamp', bake: { type: 'street', y: 4.46 } });

      // == 실내: 창가 책상 3 + 의자 ==
      PLAN.desks.forEach(function (zc, i) {
        var x0 = -2.48, x1 = -1.92, top = FL + 0.74;
        ctx.boxAABB({ x0: x0, x1: x1, z0: zc - 0.5, z1: zc + 0.5, y0: top - 0.04, y1: top, surf: 'wood_dark', color: 0xe2c19a });
        [[x0 + 0.04, zc - 0.46], [x1 - 0.04, zc - 0.46], [x0 + 0.04, zc + 0.46], [x1 - 0.04, zc + 0.46]].forEach(function (p) { ctx.box({ x: p[0], y: FL, z: p[1], w: 0.045, h: 0.70, d: 0.045, color: 0x7a5232, mat: 'wood' }); });
        ctx.boxAABB({ x0: x0 + 0.02, x1: x1 - 0.06, z0: zc - 0.46, z1: zc + 0.46, y0: top - 0.12, y1: top - 0.04, color: 0x8a5d38, mat: 'wood' });
        var s = layout.seats[i], cx = -1.55, cz = s.z, sy = FL + 0.37;   // 앉는 면(방석 위) FL+0.45 — 예전 0.52 는 허벅지가 8cm 파묻혔다
        ctx.box({ x: cx, y: sy, z: cz, w: 0.44, h: 0.04, d: 0.42, color: 0x9a6a40, mat: 'wood' });
        ctx.box({ x: cx - 0.01, y: sy + 0.04, z: cz, w: 0.38, h: 0.04, d: 0.36, color: 0xe9dcc4 });   // 방석
        [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]].forEach(function (p) { ctx.box({ x: cx + p[0], y: FL, z: cz + p[1], w: 0.035, h: 0.44, d: 0.035, color: 0x7a5232, mat: 'wood' }); });
        [-0.17, 0.17].forEach(function (dz) { ctx.box({ x: cx + 0.24, y: sy, z: cz + dz, w: 0.035, h: 0.5, d: 0.035, color: 0x7a5232, mat: 'wood' }); });   // 등받이 4cm 뒤로(골반이 닿지 않게)
        ctx.box({ x: cx + 0.25, y: sy + 0.3, z: cz, w: 0.03, h: 0.16, d: 0.38, color: 0x9a6a40, mat: 'wood' });
        // 책상 위 소품
        if (i === 0) {   // 책상 등 + 펼친 책 + 머그 + 타이머 화면
          ctx.cyl({ x: -2.32, y: top, z: zc + 0.3, r: 0.07, h: 0.02, seg: 12, color: BRASS, mat: 'metal' });
          ctx.cyl({ x: -2.32, y: top + 0.02, z: zc + 0.3, r: 0.012, h: 0.3, seg: 6, color: BRASS, mat: 'metal' });
          ctx.glow.add(Geo.cyl(16, 0.62), hdr(0xfff0d0, 1.5), { x: -2.32, y: top + 0.28, z: zc + 0.3, sx: 0.13, sy: 0.17, sz: 0.13, flat: false, vary: 0 });
          ctx.addGlow({ x: -2.32, y: top + 0.36, z: zc + 0.3, size: 0.9, color: 0xffd8a0, kind: 'lamp', bake: 'desk' });
          ctx.box({ x: -2.12, y: top, z: zc - 0.08, w: 0.26, h: 0.02, d: 0.36, ry: 0.15, color: 0xf8f3e8 });
          ctx.box({ x: -2.12, y: top + 0.02, z: zc - 0.08, w: 0.005, h: 0.004, d: 0.34, ry: 0.15, color: 0xb8ab95, vary: 0 });
          ctx.cyl({ x: -2.33, y: top, z: zc - 0.38, r: 0.04, h: 0.09, seg: 10, color: 0xf2efe8, mat: 'gloss' });
        } else if (i === 1) {
          for (var bk = 0; bk < 3; bk++) ctx.box({ x: -2.3, y: top + bk * 0.035, z: zc + 0.25, w: 0.22, h: 0.034, d: 0.3, ry: bk * 0.12, color: [0x4f6b8a, 0xc0794a, 0xe8dcc0][bk] });
          ctx.box({ x: -2.1, y: top, z: zc - 0.15, w: 0.22, h: 0.015, d: 0.3, ry: -0.1, color: 0x7a8a6a });
        } else {
          ctx.box({ x: -2.12, y: top, z: zc, w: 0.22, h: 0.015, d: 0.3, ry: 0.05, color: 0xe9e2d2 });
          ctx.cyl({ x: -2.34, y: top, z: zc + 0.3, r: 0.06, rTop: 0.07, h: 0.1, seg: 10, color: 0xc77d52 });
          leafClump(-2.34, top + 0.17, zc + 0.3, 0.1, 9, 0x6f9a4e);
        }
      });
      panel('timer', { x: -2.38, y: FL + 0.80, z: 2.15 - 0.02, w: 0.16, h: 0.1, ry: PI / 2, rx: -0.2, px: 256, screen: true, data: { text: '25:00' }, draw: function (g, w, h, d) {
        g.fillStyle = '#1d2326'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#ffe2a8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 ' + Math.round(h * 0.55) + 'px ' + FONT; g.fillText(d.text || '', w / 2, h * 0.54);
      } });
      ctx.box({ x: -2.38, y: FL + 0.74, z: 2.13, w: 0.06, h: 0.11, d: 0.18, rz: 0, color: 0x2b2f33, mat: 'metal' });
      // 창턱 작은 화분 3
      [2.7, 1.1, -0.4].forEach(function (z) {
        ctx.cyl({ x: -2.44, y: FL + 0.35, z: z, r: 0.06, rTop: 0.07, h: 0.11, seg: 10, color: 0xcf8c62 });
        leafClump(-2.44, FL + 0.53, z, 0.09, 8, 0x6f9a4e);
      });
      // 앞 왼쪽 구석 큰 화분 나무 + 문 옆 화분
      [[-2.15, 2.95, 1.9], [2.24, 3.04, 1.3]].forEach(function (t) {
        ctx.cyl({ x: t[0], y: FL, z: t[1], r: 0.2, rTop: 0.22, h: 0.36, seg: 14, color: 0xe6e1d8, mat: 'gloss', flat: false });
        ctx.cyl({ x: t[0], y: FL + 0.36, z: t[1], r: 0.025, h: t[2] - 0.5, seg: 6, color: 0x6a5240 });
        leafClump(t[0], FL + t[2] * 0.78, t[1], t[2] * 0.25, 30, 0x5f8f45);
      });

      // == 뒤 왼쪽 키 큰 책장(책) ==
      function shelfUnit(x0, x1, z0, z1, y0, h, nShelf, booky, color) {
        var t = 0.03;
        ctx.boxAABB({ x0: x0, x1: x0 + t, z0: z0, z1: z1, y0: y0, y1: y0 + h, surf: 'wood_light', color: color });
        ctx.boxAABB({ x0: x1 - t, x1: x1, z0: z0, z1: z1, y0: y0, y1: y0 + h, surf: 'wood_light', color: color });
        var horiz = Math.abs(z1 - z0) < Math.abs(x1 - x0);
        ctx.boxAABB({ x0: x0, x1: x1, z0: horiz ? z0 : z0, z1: horiz ? z0 + 0.015 : z1, y0: y0, y1: y0 + h, color: 0xd9c4a4 });
        for (var s = 0; s <= nShelf; s++) {
          var sy = y0 + s * (h - t) / nShelf;
          ctx.boxAABB({ x0: x0, x1: x1, z0: z0, z1: z1, y0: sy, y1: sy + t, surf: 'wood_light', color: color });
          if (s === nShelf || !booky) continue;
          var gap = (h - t) / nShelf - t, cur = x0 + t + 0.02;
          while (cur < x1 - t - 0.06) {
            var bw = 0.025 + rnd() * 0.03, bh = gap * (0.62 + rnd() * 0.3), lean = rnd() < 0.06;
            if (rnd() < 0.08) { cur += 0.06; continue; }
            ctx.box({ x: cur + bw / 2, y: sy + t, z: (z0 + z1) / 2 + 0.02, w: bw, h: bh, d: Math.abs(z1 - z0) * (0.6 + rnd() * 0.15), rz: lean ? -0.2 : 0, color: ctx.shade([0xe8dcc6, 0x8a3b2e, 0x2f4a6a, 0x5d7a52, 0xd9b26a, 0x6b4f7a, 0xf1ece1, 0x3d3a36, 0xb5603e][Math.floor(rnd() * 9)], 0.85 + rnd() * 0.25) });
            cur += bw + 0.003;
          }
        }
      }
      shelfUnit(-2.48, -0.82, -3.3, -2.94, FL, 2.2, 5, true, 0xd6ae80);
      // 뒤 오른쪽 낮은 장 + 캘린더 + 액자
      ctx.boxAABB({ x0: 0.85, x1: 2.48, z0: -3.3, z1: -2.9, y0: FL, y1: FL + 0.86, surf: 'wood_light', color: 0xd6ae80 });
      for (var dr = 0; dr < 3; dr++) ctx.box({ x: 1.12 + dr * 0.54, y: FL + 0.42, z: -2.895, w: 0.12, h: 0.02, d: 0.02, color: BRASS, mat: 'metal' });
      ctx.cyl({ x: 2.2, y: FL + 0.86, z: -3.1, r: 0.09, rTop: 0.1, h: 0.16, seg: 10, color: 0xe6e1d8, mat: 'gloss' });
      leafClump(2.2, FL + 1.12, -3.1, 0.12, 10, 0x6f9a4e);
      for (var sb = 0; sb < 7; sb++) ctx.box({ x: 1.0 + sb * 0.07, y: FL + 0.86, z: -3.1, w: 0.05, h: 0.2 + rnd() * 0.06, d: 0.18, color: [0x2f4a6a, 0xe8dcc6, 0x8a3b2e, 0x5d7a52][sb % 4] });
      panel('calendar', { x: 1.62, y: FL + 1.62, z: -3.288, w: 0.62, h: 0.62, px: 384, data: { month: 11, marks: [3, 4, 7, 12, 13, 18, 21, 25, 26] }, draw: function (g, w, h, d) {
        g.fillStyle = '#fbf8f1'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#3b2a1e'; g.font = '700 ' + Math.round(h * 0.11) + 'px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(d.monthName || (STR('monthNames', []) || [])[(d.month || 11) - 1] || String(d.month || 11), w * 0.08, h * 0.06);
        var cs = w * 0.84 / 7, ox = w * 0.08, oy = h * 0.24, marks = d.marks || [];
        for (var day = 1; day <= 30; day++) {
          var c = (day + 5) % 7, r2 = Math.floor((day + 5) / 7);
          var cx2 = ox + c * cs + cs / 2, cy2 = oy + r2 * cs * 0.92 + cs / 2;
          if (marks.indexOf(day) >= 0) { g.fillStyle = '#e6a55a'; g.beginPath(); g.arc(cx2, cy2, cs * 0.36, 0, 6.28); g.fill(); }
          g.fillStyle = '#5a4a3c'; g.font = '500 ' + Math.round(cs * 0.4) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(day), cx2, cy2);
        }
      } });
      [[-1.75, 0xa4b89a], [-1.1, 0xd9b48c]].forEach(function (f) {   // 책장 위 액자 2(그림 자리는 색 면)
        ctx.boxAABB({ x0: f[0] - 0.2, x1: f[0] + 0.2, z0: -3.3, z1: -3.27, y0: FL + 2.28, y1: FL + 2.58, color: 0x6b4428, mat: 'wood' });
        ctx.boxAABB({ x0: f[0] - 0.16, x1: f[0] + 0.16, z0: -3.3, z1: -3.265, y0: FL + 2.32, y1: FL + 2.54, color: f[1] });
      });
      // 플로어 스탠드(뒤 왼쪽 구석)
      ctx.cyl({ x: -2.2, y: FL, z: -2.5, r: 0.16, h: 0.03, seg: 14, color: CHAR, mat: 'metal' });
      ctx.cyl({ x: -2.2, y: FL + 0.03, z: -2.5, r: 0.015, h: 1.3, seg: 6, color: BRASS, mat: 'metal' });
      ctx.glow.add(Geo.cyl(18, 0.7), hdr(0xfff1d6, 1.4), { x: -2.2, y: FL + 1.28, z: -2.5, sx: 0.22, sy: 0.3, sz: 0.22, flat: false, vary: 0 });
      ctx.addGlow({ x: -2.2, y: FL + 1.4, z: -2.5, size: 0.8, color: 0xffd39a, kind: 'lamp', bake: 'floor' });

      // == 오른쪽 벽: 전시 선반(낮은 책장 + 표지 선반) · 작업대 + 스툴 + 태블릿 · 코르크 보드 ==
      ctx.boxAABB({ x0: 2.14, x1: 2.48, z0: 0.72, z1: 2.08, y0: FL, y1: FL + 0.9, surf: 'wood_light', color: 0xd6ae80 });
      for (var lb = 0; lb < 16; lb++) ctx.box({ x: 2.33, y: FL + 0.5, z: 0.82 + lb * 0.078, w: 0.24, h: 0.3 + rnd() * 0.05, d: 0.05, color: ctx.shade([0x2f4a6a, 0xe8dcc6, 0x8a3b2e, 0x5d7a52, 0xd9b26a][lb % 5], 0.9 + rnd() * 0.2) });
      ctx.boxAABB({ x0: 2.2, x1: 2.5, z0: 0.72, z1: 2.08, y0: FL + 1.42, y1: FL + 1.45, surf: 'wood_light', color: 0xd6ae80 });
      ctx.boxAABB({ x0: 2.2, x1: 2.24, z0: 0.72, z1: 2.08, y0: FL + 1.45, y1: FL + 1.49, color: 0x9a6a40, mat: 'wood' });
      for (var cv2 = 0; cv2 < 4; cv2++) ctx.box({ x: 2.4, y: FL + 1.45, z: 0.9 + cv2 * 0.33, w: 0.02, h: 0.3, d: 0.22, rz: 0.18, color: [0xe8b4a0, 0x9fc0d8, 0xf0d890, 0xb8d4a8][cv2] });   // 읽고 싶은 책 표지(자리)
      // == 커피 카운터(작업대 자리) — 글자·상표 없음 ==
      var K = PLAN.counter, KB = PLAN.back, METAL = 'metal', BLK = 0x1d1e20;
      // 앞 카운터: 오크 통판 상판(앞으로 3 cm 내민) + 회벽 앞판 + 아래 걸레받이 + 바 스툴 발 받침 봉
      ctx.boxAABB({ x0: K.x0 - 0.03, x1: K.x1 + 0.02, z0: K.z0 - 0.03, z1: K.z1 + 0.03, y0: K.top - 0.05, y1: K.top, surf: 'wood_oak', color: 0xf0e2cc });
      ctx.boxAABB({ x0: K.x0, x1: K.x1, z0: K.z0, z1: K.z1, y0: FL + 0.08, y1: K.top - 0.05, surf: 'plaster_cream', color: 0xf4ede2 });
      ctx.boxAABB({ x0: K.x0 - 0.01, x1: K.x1, z0: K.z0 - 0.01, z1: K.z1 + 0.01, y0: FL, y1: FL + 0.08, surf: 'wood_oak', color: 0x9a7350 });
      ctx.beam3([K.x0 - 0.12, FL + 0.28, K.z0 + 0.1], [K.x0 - 0.12, FL + 0.28, K.z1 - 0.1], 0.025, 0.025, 0x2a2a2c, ctx.metalB);
      [K.z0 + 0.1, K.z1 - 0.1].forEach(function (z) { ctx.beam3([K.x0 - 0.12, FL + 0.28, z], [K.x0, FL + 0.28, z], 0.02, 0.02, 0x2a2a2c, ctx.metalB); });
      // 뒤 카운터 + 서랍장 + 위 열린 선반 2(병)
      ctx.boxAABB({ x0: KB.x0, x1: 2.5, z0: KB.z0, z1: KB.z1, y0: KB.top - 0.04, y1: KB.top, surf: 'wood_oak', color: 0xe8d6bc });
      ctx.boxAABB({ x0: KB.x0 + 0.02, x1: 2.5, z0: KB.z0, z1: KB.z1, y0: FL, y1: KB.top - 0.04, surf: 'wood_light', color: 0xd9c2a2 });
      for (var dz = 0; dz < 3; dz++) { var zz0 = KB.z0 + 0.04 + dz * 0.66; ctx.boxAABB({ x0: KB.x0, x1: KB.x0 + 0.02, z0: zz0, z1: zz0 + 0.6, y0: FL + 0.08, y1: KB.top - 0.08, surf: 'wood_light', color: 0xe2cdb0 }); ctx.box({ x: KB.x0 - 0.01, y: KB.top - 0.2, z: zz0 + 0.3, w: 0.02, h: 0.015, d: 0.12, color: 0x2a2a2c, mat: 'metal' }); }
      [FL + 1.38, FL + 1.68].forEach(function (yy) {
        ctx.boxAABB({ x0: 2.28, x1: 2.5, z0: -1.55, z1: -0.7, y0: yy - 0.03, y1: yy, surf: 'wood_oak', color: 0xe8d6bc });
        for (var jr = 0; jr < 4; jr++) {   // 병: 유리(거의 투명한 틀) 대신 내용물 + 뚜껑(나무·금속)
          var jz = -1.45 + jr * 0.2, jh = 0.13 + (jr % 2) * 0.04;
          ctx.cyl({ x: 2.4, y: yy, z: jz, r: 0.045, h: jh, seg: 14, color: [0x3b2418, 0xd8c8a8, 0x5a3a22, 0x8a6a3a][jr], flat: false });
          ctx.cyl({ x: 2.4, y: yy + jh, z: jz, r: 0.048, h: 0.025, seg: 14, color: jr % 2 ? 0xb08a60 : 0x9a9ea2, mat: jr % 2 ? 'wood' : 'metal', flat: false });
        }
      });
      // 에스프레소 기계(그룹 헤드 2, 솔질한 금속 몸통 + 검은 옆판·윗판, 포터필터 손잡이, 스팀 막대, 받침, 위에 데우는 잔)
      var MX = 2.32, MZ = -1.0, MY = KB.top;
      ctx.box({ x: MX + 0.02, y: MY, z: MZ, w: 0.36, h: 0.4, d: 0.62, surf: METAL, color: 0xd8dadc });
      [MZ - 0.32, MZ + 0.32].forEach(function (z) { ctx.box({ x: MX + 0.02, y: MY, z: z, w: 0.37, h: 0.41, d: 0.02, color: BLK, mat: 'gloss' }); });
      ctx.box({ x: MX + 0.02, y: MY + 0.4, z: MZ, w: 0.37, h: 0.02, d: 0.66, color: BLK, mat: 'gloss' });
      ctx.box({ x: MX - 0.2, y: MY, z: MZ, w: 0.14, h: 0.025, d: 0.5, surf: METAL, color: 0xaeb2b6 });   // 받침
      [MZ - 0.14, MZ + 0.14].forEach(function (z) {
        ctx.cyl({ x: MX - 0.19, y: MY + 0.26, z: z, r: 0.04, h: 0.06, seg: 16, surf: METAL, color: 0xc8cacc, flat: false });            // 그룹 헤드
        ctx.cyl({ x: MX - 0.19, y: MY + 0.22, z: z, r: 0.035, h: 0.04, seg: 16, surf: METAL, color: 0xb8babc, flat: false });            // 포터필터
        ctx.beam3([MX - 0.19, MY + 0.24, z], [MX - 0.38, MY + 0.23, z], 0.025, 0.03, BLK, ctx.gloss);                                    // 손잡이
        ctx.cyl({ x: MX - 0.2, y: MY + 0.025, z: z, r: 0.03, rTop: 0.035, h: 0.06, seg: 14, color: 0xf4f1ea, mat: 'gloss', flat: false });   // 받친 잔
      });
      ctx.beam3([MX - 0.18, MY + 0.32, MZ + 0.28], [MX - 0.3, MY + 0.1, MZ + 0.27], 0.012, 0.012, 0xc8cacc, ctx.metalB);   // 스팀 막대
      for (var wc = 0; wc < 4; wc++) ctx.cyl({ x: MX + 0.0 + (wc % 2) * 0.08, y: MY + 0.42, z: MZ - 0.15 + wc * 0.1, r: 0.032, rTop: 0.038, h: 0.055, seg: 12, color: 0xf4f1ea, mat: 'gloss', flat: false });
      // 그라인더(검은 밑 + 금속 몸통 + 원두 통)
      var GZ = -0.42;
      ctx.box({ x: 2.33, y: MY, z: GZ, w: 0.18, h: 0.05, d: 0.18, color: BLK, mat: 'gloss' });
      ctx.cyl({ x: 2.33, y: MY + 0.05, z: GZ, r: 0.07, rTop: 0.065, h: 0.22, seg: 18, surf: METAL, color: 0xcfd1d3, flat: false });
      ctx.cyl({ x: 2.33, y: MY + 0.27, z: GZ, r: 0.055, rTop: 0.085, h: 0.14, seg: 18, color: 0x3a2618, mat: 'gloss', flat: false });
      ctx.cyl({ x: 2.33, y: MY + 0.41, z: GZ, r: 0.088, h: 0.015, seg: 18, color: BLK, mat: 'gloss', flat: false });
      // 컵 선반(가는 금속 틀 + 머그·잔 거꾸로)
      var RZ = 0.05;
      [RZ - 0.2, RZ + 0.2].forEach(function (z) { ctx.beam3([2.38, MY, z], [2.38, MY + 0.42, z], 0.015, 0.015, 0x2a2a2c, ctx.metalB); });
      [MY + 0.14, MY + 0.3].forEach(function (yy, r2) {
        ctx.box({ x: 2.38, y: yy - 0.01, z: RZ, w: 0.2, h: 0.01, d: 0.42, color: 0x2a2a2c, mat: 'metal' });
        for (var cq = 0; cq < 4; cq++) ctx.cyl({ x: 2.38, y: yy, z: RZ - 0.15 + cq * 0.1, r: 0.04 - r2 * 0.006, rTop: 0.034 - r2 * 0.006, h: 0.085 - r2 * 0.02, seg: 12, color: [0xf4f1ea, 0xe8e2d6, 0xd9cbb4, 0xf4f1ea][cq], mat: 'gloss', flat: false });
      });
      // 카운터 위 펜던트(점광원 수 한도 3 — 빛은 발광 + 빛 무리, 카운터 위는 구운 빛 번짐이 맡는다)
      ctx.beam3([1.6, CEIL, -0.55], [1.6, FL + 1.85, -0.55], 0.008, 0.008, 0x1a1a1a, ctx.metalB);
      ctx.cyl({ x: 1.6, y: FL + 1.68, z: -0.55, r: 0.16, rTop: 0.05, h: 0.17, seg: 22, surf: METAL, color: 0x3a3b3d, flat: false });
      ctx.glow.add(Geo.sph(10, 6), hdr(0xffd9a0, 2.6), { x: 1.6, y: FL + 1.69, z: -0.55, sx: 0.06, sy: 0.035, sz: 0.06, flat: false, vary: 0 });
      ctx.addGlow({ x: 1.6, y: FL + 1.62, z: -0.55, size: 0.8, color: 0xffcf8a, kind: 'lamp', bake: { type: 'counter', y: FL + 1.71 } });
      // 바 스툴(좌석 3): 둥근 오크 좌판(높이 0.63) + 검은 금속 다리 4 + 발 받침 고리
      var s3 = { x: STOOL.x, z: layout.seats[3].z }, SY = FL + STOOL.top;
      ctx.cyl({ x: s3.x, y: SY - 0.05, z: s3.z, r: 0.18, h: 0.05, seg: 20, surf: 'wood_oak', color: 0xe8d2b4, flat: false });
      [[0.11, 0.11], [-0.11, 0.11], [0.11, -0.11], [-0.11, -0.11]].forEach(function (p) { ctx.beam3([s3.x + p[0] * 0.8, SY - 0.05, s3.z + p[1] * 0.8], [s3.x + p[0] * 1.4, FL, s3.z + p[1] * 1.4], 0.02, 0.02, 0x2a2a2c, ctx.metalB); });
      ctx.add(new T.Mesh(new T.TorusGeometry(0.17, 0.01, 6, 24).rotateX(PI / 2).translate(s3.x, FL + STOOL.ring, s3.z), ctx.mats.metal));   // 발 받침 고리(앉으면 발이 여기)
      var B = { top: K.top };
      panel('tablet', { x: 1.52, y: B.top + 0.005, z: -1.25, w: 0.3, h: 0.22, rx: -PI / 2 + 0.12, ry: -PI / 2, px: 384, screen: true, data: { title: STR('tabletTitle', 'Now reading'), lines: 9 }, draw: function (g, w, h, d) {
        g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#20252a'; g.fillRect(0, 0, w, h * 0.05); g.fillRect(0, h * 0.95, w, h * 0.05); g.fillRect(0, 0, w * 0.04, h); g.fillRect(w * 0.96, 0, w * 0.04, h);
        g.fillStyle = '#3b2a1e'; g.font = '700 ' + Math.round(h * 0.09) + 'px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(d.title || '', w * 0.1, h * 0.1);
        g.fillStyle = '#b8ad9c'; for (var l = 0; l < (d.lines || 8); l++) g.fillRect(w * 0.1, h * (0.27 + l * 0.07), w * (0.62 + ((l * 37) % 20) / 100), h * 0.022);
      } });
      ctx.boxAABB({ x0: 2.45, x1: 2.5, z0: -0.55, z1: 0.42, y0: FL + 1.3, y1: FL + 2.12, surf: 'cork', color: 0xe8c9a0 });
      [[FL + 1.27, FL + 1.3], [FL + 2.12, FL + 2.15]].forEach(function (yy) { ctx.boxAABB({ x0: 2.43, x1: 2.5, z0: -0.58, z1: 0.45, y0: yy[0], y1: yy[1], color: 0x8a5d38, mat: 'wood' }); });
      [-0.58, 0.42].forEach(function (zz) { ctx.boxAABB({ x0: 2.43, x1: 2.5, z0: zz, z1: zz + 0.03, y0: FL + 1.27, y1: FL + 2.15, color: 0x8a5d38, mat: 'wood' }); });
      panel('board', { x: 2.442, y: FL + 1.71, z: -0.07, w: 0.94, h: 0.78, ry: -PI / 2, px: 768, alpha: true, data: { notes: STR('boardNotes', ['3 books this week', '10 review cards', '30 min today', 'Pick: essays', 'Want to read']) }, draw: function (g, w, h, d) {
        var cols = ['#fff3a8', '#ffd2c4', '#d8f0c8', '#cfe3ff', '#fbe2f0'], notes = d.notes || [];
        notes.forEach(function (n, i) {
          var nx = w * (0.05 + (i % 3) * 0.32), ny = h * (0.08 + Math.floor(i / 3) * 0.48), nw = w * 0.27, nh = h * 0.38, a = ((i * 53) % 9 - 4) * 0.01;
          g.save(); g.translate(nx + nw / 2, ny + nh / 2); g.rotate(a);
          g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(-nw / 2 + 4, -nh / 2 + 5, nw, nh);
          g.fillStyle = cols[i % cols.length]; g.fillRect(-nw / 2, -nh / 2, nw, nh);
          g.fillStyle = '#c0392b'; g.beginPath(); g.arc(0, -nh / 2 + 10, 6, 0, 6.28); g.fill();
          g.fillStyle = '#3b2a1e'; g.font = '600 ' + Math.round(nh * 0.17) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, 0, 4);
          g.restore();
        });
      } });
      // 러그(가운데 통로)
      ctx.floor({ x0: -0.75, x1: 0.75, z0: -2.3, z1: 2.1, y: FL + 0.006, surf: 'jute', color: 0xcbb898, gloss: 0, reflect: false });
      ctx.boxAABB({ x0: -0.76, x1: 0.76, z0: -2.31, z1: 2.11, y0: FL, y1: FL + 0.005, color: 0xb09670 });

      // == 안쪽 복도 끝 나무 문(잠긴 장식 문 — 누르면 {e:'tap', id:'innerDoor'}) ==
      ctx.boxAABB({ x0: -0.5, x1: 0.5, z0: -5.7, z1: -5.64, y0: FL, y1: FL + 2.16, color: 0x6b4428, mat: 'wood' });   // 문틀
      ctx.boxAABB({ x0: -0.43, x1: 0.43, z0: -5.66, z1: -5.62, y0: FL + 0.02, y1: FL + 2.1, surf: 'wood_dark', color: 0xc89a6a });
      [[0.25, 0.95], [1.1, 1.95]].forEach(function (r) { ctx.boxAABB({ x0: -0.33, x1: 0.33, z0: -5.625, z1: -5.605, y0: FL + r[0], y1: FL + r[1], color: 0xa77a4c, mat: 'wood' }); });
      ctx.boxAABB({ x0: -0.24, x1: 0.24, z0: -5.606, z1: -5.6, y0: FL + 1.45, y1: FL + 1.85, color: 0x2a3a44, mat: 'gloss' });   // 작은 유리창
      ctx.sphere({ x: 0.32, y: FL + 1.0, z: -5.58, r: 0.035, color: BRASS, mat: 'metal' });
      ctx.addTapTarget({ id: 'innerDoor', x: 0, y: FL + 1.1, z: -5.6, r: 0.6 });
      [-4.0, -5.0].forEach(function (z) { ctx.boxAABB({ x0: 0.56, x1: 0.6, z0: z - 0.18, z1: z + 0.18, y0: FL + 1.3, y1: FL + 1.75, color: 0x6b4428, mat: 'wood' }); ctx.boxAABB({ x0: 0.555, x1: 0.565, z0: z - 0.14, z1: z + 0.14, y0: FL + 1.34, y1: FL + 1.71, color: z < -4.5 ? 0xc8b48a : 0x9fb6c8 }); });

      // == 조명: 펜던트 2(점광원) + 다운라이트 6 + 복도 등 ==
      [[0, 1.0], [0, -1.35]].forEach(function (p, i) {
        var y = CEIL - 0.6;
        ctx.cyl({ x: p[0], y: y + 0.12, z: p[1], r: 0.006, h: CEIL - y - 0.12, seg: 4, color: 0x222222 });
        ctx.cyl({ x: p[0], y: y, z: p[1], r: 0.19, rTop: 0.05, h: 0.16, seg: 18, color: 0x27302a, mat: 'gloss', flat: false });
        ctx.glow.add(Geo.sph(10, 6), hdr(0xffe0a8, 3.0), { x: p[0], y: y + 0.01, z: p[1], sx: 0.06, sy: 0.05, sz: 0.06, flat: false, vary: 0 });
        ctx.addGlow({ x: p[0], y: y - 0.05, z: p[1], size: 0.6, color: 0xffd08a, kind: 'lamp', bake: { type: 'pendant', y: y + 0.03 } });
        ctx.addLight({ x: p[0], y: y - 0.15, z: p[1], color: 0xffc58a, intensity: 0.6, distance: 7.5, kind: 'lamp' });   // 약 3000K
      });
      [[-1.5, 2.3], [1.5, 2.3], [-1.5, 0.0], [1.5, 0.0], [-1.5, -2.3], [1.5, -2.3], [0, -4.5]].forEach(function (p) {
        var y = p[1] < -3.3 ? FL + 2.4 : CEIL;
        ctx.glow.add(Geo.cyl(14, 1), hdr(0xfff0d6, 2.4), { x: p[0], y: y - 0.006, z: p[1], sx: 0.06, sy: 0.005, sz: 0.06, flat: true, vary: 0 });
        ctx.cyl({ x: p[0], y: y - 0.004, z: p[1], r: 0.08, h: 0.004, seg: 14, color: 0xd8d2c8 });
        ctx.addGlow({ x: p[0], y: y - 0.06, z: p[1], size: 0.32, color: 0xffe2b0, kind: 'lamp', bake: { type: 'down', y: y - 0.02 } });
      });

      if (PLT) PLT.build();   // 식물 카드: 종류마다 메시 1

      // == 카메라·하늘 ==
      ctx.setCameraBounds({ x0: -8, x1: 8, z0: -7, z1: 12, yMax: CEIL - 0.72 });   // 실내 카메라는 펜던트 아래
      ctx.setSky({ outside: true });

      // == 정원(앱 정원 꽃): setGarden([{flower, stage, pot}]) — 슬롯 순서는 gardenSlots() ==
      // 꽃(봉오리·꽃 단계)은 사진 오림 카드(plants.js): 앱 꽃 색 8 → 비슷한 사진 꽃 + 색조. 씨앗·새싹은 작은 3D 도형.
      var GARDEN_KIND = [['rose', 0xffffff], ['daisy', 0xfff2b8], ['rose', 0xff8a8a], ['daisy', 0xffffff], ['lavender', 0xffffff], ['echinacea', 0xffc79a], ['hydrangea', 0xffffff], ['echinacea', 0xffffff]];
      var gardenGroup = null, gMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
      function drawGarden(list) {
        if (gardenGroup) { ctx.root.remove(gardenGroup); gardenGroup.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); gardenGroup = null; }
        var slots = gardenSlots(), b = new G.Batch(77), r = ctx.rng(5), grp = new T.Group();
        grp.name = 'garden';
        var GP = root.RoomPlants ? root.RoomPlants.create({ THREE: T, rng: ctx.rng, add: function (m) { grp.add(m); } }) : null;
        (list || []).slice(0, slots.length).forEach(function (it, i) {
          if (!it) return;
          var s = slots[i], y = s.y, fl = ((it.flower | 0) % GARDEN_COLORS.length + GARDEN_COLORS.length) % GARDEN_COLORS.length, stage = Math.max(0, Math.min(3, it.stage | 0)), pot = it.pot | 0;
          if (pot) {
            var pc = pot === 1 ? 0xc5784c : 0xece7de;
            b.add(Geo.cyl(16, 1.2), pc, { x: s.x, y: y - 0.02, z: s.z, sx: 0.09, sy: 0.14, sz: 0.09, flat: false });
            b.add(Geo.cyl(16, 1), 0x3a2a1e, { x: s.x, y: y + 0.11, z: s.z, sx: 0.1, sy: 0.012, sz: 0.1, flat: true });
            y += 0.12;
          }
          if (stage === 0) { b.add(Geo.sph(8, 5), 0x4a3526, { x: s.x, y: y - 0.01, z: s.z, sx: 0.06, sy: 0.025, sz: 0.06, flat: false }); b.add(Geo.sph(6, 4), 0xd8c080, { x: s.x, y: y + 0.012, z: s.z, s: 0.012, flat: false }); return; }
          if (stage === 1 || !GP) {   // 새싹: 줄기 + 떡잎
            var hgt = 0.12;
            b.add(Geo.cyl(5, 0.8), 0x4f7a3a, { x: s.x, y: y - 0.02, z: s.z, sx: 0.008, sy: hgt, sz: 0.008, flat: false });
            for (var lf = 0; lf < 3; lf++) { var a = lf * 2.1 + r(); b.add(Geo.sph(6, 4), 0x5f9a45, { x: s.x + Math.cos(a) * 0.03, y: y + hgt * (0.55 + lf * 0.15), z: s.z + Math.sin(a) * 0.03, sx: 0.035, sy: 0.008, sz: 0.016, ry: -a, flat: false }); }
            return;
          }
          var K = GARDEN_KIND[fl], h = (stage === 2 ? 0.55 : 0.85) * root.RoomPlants.KINDS[K[0]].h * (pot ? 0.7 : 1);
          var tint = new T.Color(K[1]); if (stage === 2) tint.lerp(new T.Color(0x9fc08a), 0.55);   // 봉오리: 꽃색이 덜 든 초록빛
          GP.add(K[0], { x: s.x, y: y - 0.02, z: s.z, h: h, planes: 3, tint: tint, rot: i * 1.3 });
        });
        if (b.p.length) grp.add(b.build(gMat, 'garden_small', { cast: true, receive: true }));
        if (GP) GP.build();
        gardenGroup = grp;
        ctx.root.add(gardenGroup);
      }
      drawGarden(DEFAULT_GARDEN);

      // == 시간대: 밤이면 배경 창 불빛 ==
      ctx.onHour(function (env) {
        var nt = env.night > 0.5 ? 1 : 0;
        if (nt !== night0) { night0 = nt; if (!bdLoaded) drawBackdrop(nt); }
        bdApply();
        bdMat.color.setScalar(nt ? 0.9 : 1.0);
      });

      // == 결: setSkin(name) — 바닥·문·책상 나무 색조 바꾸기(자리 표시용: 'oak' 기본 · 'walnut' · 'white') ==
      var SKINS = { oak: 0xffffff, walnut: 0xb58a6a, white: 0xfff6ea };
      function skin(name) {
        var k = SKINS[name] === undefined ? SKINS.oak : SKINS[name];
        ctx.root.traverse(function (o) { if (o.isMesh && o.name && /surf_wood_floor/.test(o.name) && o.material && o.material.color) o.material.color.setHex(k); });
      }
      return {
        hooks: {
          garden: function (list) { drawGarden(list); },
          panel: function (id, data) {
            // 배경 판: {url} 한 장 또는 {day, night} 두 장(시간대에 맞춰 바꾼다). 못 읽으면 절차 생성 그림 그대로
            if (id === 'backdrop' && data && (data.url || data.day || data.night)) {
              bdUrls = { day: data.day || data.url, night: data.night || data.url }; bdApply(true);
              return;
            }
            if (panels[id]) { panels[id].host = true; panels[id].redraw(data || {}); }   // 호스트가 준 판은 글자 바꾸기(strings)로 덮지 않는다
          },
          skin: skin,
          // 화면 글자가 바뀌면(setStrings) 호스트가 따로 채우지 않은 판을 새 글자로 다시 그린다
          strings: function () {
            var P;
            if ((P = panels.sign) && !P.host) P.redraw({ title: STR('signTitle', 'Reading Room'), sub: STR('signSub', 'SINCE 2026') });
            if ((P = panels.tablet) && !P.host) P.redraw({ title: STR('tabletTitle', 'Now reading'), lines: P.data.lines || 9 });
            if ((P = panels.board) && !P.host) P.redraw({ notes: STR('boardNotes', []) });
            if ((P = panels.calendar)) P.redraw();
          },
          // 앉은 자리 옮김(흔들리는 그네): {x, y, z} 또는 null. main.js·net_view.js 가 앉은 아바타에 더한다
          seatOffset: function (id) {
            if ((id !== 'S4' && id !== 'S5') || !swingTheta) return null;
            var L = SW_TOP - SW_SEAT;
            return { x: 0, y: L * (1 - Math.cos(swingTheta)), z: -L * Math.sin(swingTheta) };
          }
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
