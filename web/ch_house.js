/* ch_house.js — 예시 빌더: 독서 공방 가게(실내 5.0×6.6 m · 천장 2.7 m + 안쪽 복도 1.2×2.4 m + 나무 문, 외관·옆마당·골목).
   기준: 독서공방 DESIGN.md(2026-11-26) 「실내」·「외관·낮밤」·좌석 안 A(창가 1인 책상 3 + 작업대 스툴 1).
   좌표: 미터, x 오른쪽, y 위, +z = 골목(가게 앞). 실내 바닥 높이 FL = 0.16(데크 한 단 위).
   (A) layout·PLAN·planColliders() 는 순수 데이터/함수(THREE 없음) — Node 시험이 그대로 읽는다(test/house.test.mjs).
   (B) build(ctx) 는 PLAN 으로 벽을 세우고 같은 planColliders() 로 충돌체를 넣는다 → 시험과 실제 화면의 충돌이 같다.
   새 소품 도구(B 항목: 카드·글 판·책장 끼우기 등)는 아직 없어 단순한 대체 도형·캔버스 판으로 둔다. */
(function (root) {
  'use strict';
  var FL = 0.16, CEIL = FL + 2.7, WALL_TOP = 3.0, T_W = 0.2;
  var SWING = { x: -5.6, z: 0.85 };   // 옆마당 2인 그네의 가운데(좌석 4·5)
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
    bench: { x0: 1.92, x1: 2.48, z0: -1.4, z1: 0.4, top: FL + 0.95 },
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
    var B = PLAN.bench; C.push({ x0: B.x0, x1: 2.5, z0: B.z0, z1: B.z1, tag: 'bench' });
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
    C.push({ x: 1.55, z: 4.15, r: 0.28, tag: 'aframe' });
    C.push({ x0: -3.75, x1: -2.2, z0: 4.25, z1: 4.6, tag: 'bicycle' });
    C.push({ x: -6.2, z: 6.1, r: 0.2, tag: 'streetlight' });
    C.push({ x: -5.3, z: -2.6, r: 0.3, tag: 'yardTree' });
    C.push({ x0: -6.5, x1: SWING.x + 0.48, z0: SWING.z - 1.02, z1: SWING.z + 1.02, tag: 'swing' });   // 그네 틀 전체(앉은 자리 포함 — 앉기는 물리 이동이 아니다)
    // 울타리(앞쪽은 x -5.0 부터 집까지 열려 있다 — 디딤돌 입구)
    C.push({ x0: -6.56, x1: -6.44, z0: -3.86, z1: 3.56, tag: 'fenceW' });
    C.push({ x0: -6.56, x1: -2.7, z0: -3.86, z1: -3.74, tag: 'fenceN' });
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
    // 좌석 4: 창가 책상 3(창을 본다, yaw π/2 = -x) + 작업대 스툴 1(+x 를 본다). stand = 일어서는 자리. y = 발판 높이(스툴)
    seats: [
      { x: -1.55, z: 2.15, yaw: PI / 2, stand: { x: -0.95, z: 2.15 } },
      { x: -1.55, z: 0.55, yaw: PI / 2, stand: { x: -0.95, z: 0.55 } },
      { x: -1.55, z: -1.05, yaw: PI / 2, stand: { x: -0.95, z: -1.05 } },
      { x: 1.62, z: -0.5, yaw: -PI / 2, y: FL + 0.2, stand: { x: 1.05, z: -0.5 } },
      // 옆마당 2인 그네(A 자 틀): 나란히 두 자리, 집·화단 쪽(+x)을 본다
      { x: SWING.x, z: SWING.z - 0.3, yaw: -PI / 2, stand: { x: SWING.x + 0.82, z: SWING.z - 0.3 } },
      { x: SWING.x, z: SWING.z + 0.3, yaw: -PI / 2, stand: { x: SWING.x + 0.82, z: SWING.z + 0.3 } }
    ],
    seatLabels: ['창가 1', '창가 2', '창가 3', '작업대', '그네 왼쪽', '그네 오른쪽'],
    camDist: 4.2,                                                   // 좁은 실내: 카메라 팔 기본 길이(m)
    seatView: { side: 0.6 },
    markerRange: 3.2,                                               // 좌석 표식은 3.2 m 안에서만                                        // 앉으면 뒤에서 0.6 rad 비켜 본다(창·벽을 마주 보는 좌석)
    roofs: [{ x0: -2.7, x1: 2.7, z0: -3.5, z1: 3.5 }, { x0: -0.8, x1: 0.8, z0: -5.9, z1: -3.5 }],   // 지붕 아래(카메라 높이 상한을 거는 곳)
    floorZones: [{ x0: -2.6, x1: 2.6, z0: -3.5, z1: 3.5, y: FL }, { x0: -0.7, x1: 0.7, z0: -5.85, z1: -3.3, y: FL }, { x0: -0.15, x1: 2.6, z0: 3.3, z1: 4.45, y: FL }],
    benchPath: [{ x: 0.72, z: 4.2 }, { x: 0.72, z: 2.4 }, { x: 0.1, z: 0.6 }, { x: 0.0, z: -2.2 }, { x: 0.0, z: -4.9 }],
    plan: PLAN,
    info: { name: '독서공방', note: 'DESIGN.md 안 A' }
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
      { x: -1.0, z: 4.75, yaw: -32, pitch: 10, zoom: 1.3, hour: 15 },
      { x: 0.25, z: -1.3, yaw: 10, pitch: 9, zoom: 1.0, look: 7, hour: 20.5 }
    ],
    build: function (ctx) {
      var T = ctx.THREE, G = root.RoomGeo, Geo = G.Geo;
      var rnd = ctx.rng(42);
      var WOOD = 0xb07a4a, WOOD_D = 0x6b4428, CHAR = 0x2f3033, CREAM = 0xf3ece0, BRASS = 0xc9a25a;
      function hdr(c, k) { return new T.Color(c).multiplyScalar(k); }

      // == 땅·골목 ==
      ctx.ground({ color: 0x55574f, y: -0.14, size: 400 });
      ctx.floor({ x0: -7.5, x1: 9, z0: 3.5, z1: 6.3, y: 0, surf: 'paving', gloss: 0.15, reflect: false });           // 보도
      ctx.boxAABB({ x0: -14, x1: 14, z0: 6.3, z1: 6.45, y0: -0.13, y1: 0.0, surf: 'concrete' });                       // 경계석
      ctx.floor({ x0: -14, x1: 14, z0: 6.45, z1: 16, y: -0.12, surf: 'asphalt', color: 0x8d97a3, gloss: 0.2, reflect: false });         // 골목 바닥
      for (var li = 0; li < 6; li++) ctx.box({ x: -10 + li * 4.2, y: -0.118, z: 10.4, w: 1.6, h: 0.004, d: 0.12, color: 0xd8d2c0, vary: 0 });   // 가운데 점선
      ctx.floor({ x0: -6.5, x1: -2.6, z0: -3.8, z1: 3.5, y: 0.005, surf: 'grass', gloss: 0, reflect: false });           // 옆마당 잔디

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
      ctx.boxAABB({ x0: -16, x1: 12, z0: -16, z1: -7, y0: 0, y1: 8.5, color: 0xb9b4ac });
      ctx.scatterTrees({ x0: -15, x1: -7.2, z0: -6, z1: 5, count: 7, seed: 11, minH: 3, maxH: 5.5, y: -0.1 });

      // == 집: 벽(PLAN.walls) + 창 ==
      PLAN.walls.forEach(function (w) { ctx.wall({ x0: w.x0, z0: w.z0, x1: w.x1, z1: w.z1, y: w.y || 0, h: w.h, t: T_W, surf: 'stucco', color: 0xfbf6ee, collide: false, plinth: false, crown: false }); });
      planColliders().forEach(function (c) { var o = {}; for (var k in c) if (k !== 'tag') o[k] = c[k]; ctx.addCollider(o); });
      layout.floorZones.forEach(function (z) { ctx.floorZone(z); });
      // 왼쪽 벽 통창(바닥 가까이부터 천장 가까이까지) + 정면 창: 모서리에서 만난다(모서리 기둥만 남음)
      ctx.window({ x: -2.6, z: 0.35, y: FL + 0.35, face: [1, 0], w: 5.9, h: 2.0, mullions: [-1.475, 0, 1.475], frameColor: WOOD_D, frameW: 0.07, sill: true });
      ctx.window({ x: -1.3, z: 3.4, y: FL + 0.45, face: [0, -1], w: 2.4, h: 1.9, mullions: [0], transoms: [1.45], frameColor: WOOD_D, frameW: 0.07, sill: true });
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
      [-1.6, 0.72, 1.9].forEach(function (x) { ctx.glow.add(Geo.cyl(12, 1), hdr(0xffe2b0, 2.2), { x: x, y: 2.955, z: 4.0, sx: 0.07, sy: 0.02, sz: 0.07, flat: true, vary: 0 }); ctx.addGlow({ x: x, y: 2.9, z: 4.0, size: 0.7, color: 0xffd9a0, kind: 'lamp' }); });

      // 잎 덩어리: 작은 잎 뭉치 여럿(부드러운 음영·색 흔들림)으로 나무·덤불·화분 식물을 만든다(한 덩어리 구가 아니라)
      function leafClump(cx, cy, cz, R, n, base, sy) {
        var k = sy || 1, b0 = base || 0x5f8a45, m = n * 5;
        for (var i = 0; i < m; i++) {
          var u = rnd() * 2 - 1, a = rnd() * PI * 2, rr = Math.pow(rnd(), 0.35) * R, sq = Math.sqrt(1 - u * u);
          var x = cx + Math.cos(a) * sq * rr, y = cy + u * rr * 0.8 * k, z = cz + Math.sin(a) * sq * rr, outer = rr / R;
          var cl = ctx.mix(ctx.shade(b0, 0.55 + 0.3 * outer + rnd() * 0.2), 0xa4bf62, rnd() * 0.3 * outer);
          var L = Math.max(0.03, R * (0.13 + rnd() * 0.08));   // 잎 한 장(납작한 다면체)
          ctx.solid.add(Geo.ico(0), cl, { x: x, y: y, z: z, sx: L * 0.55, sy: L * 0.12, sz: L, rx: (rnd() - 0.5) * 1.6, ry: rnd() * 6.3, rz: (rnd() - 0.5) * 1.2, flat: true, vary: 0.08 });
        }
      }
      // == 입구: 유리 낀 나무 문(안쪽으로 열림) + 데크 한 단 ==
      ctx.boxAABB({ x0: 0.22, x1: 1.23, z0: 3.28, z1: 3.52, y0: 2.33, y1: 2.4, color: WOOD_D, mat: 'wood' });          // 문틀 위
      ctx.boxAABB({ x0: 0.2, x1: 0.26, z0: 3.28, z1: 3.52, y0: 0, y1: 2.4, color: WOOD_D, mat: 'wood' });
      ctx.boxAABB({ x0: 1.19, x1: 1.25, z0: 3.28, z1: 3.52, y0: 0, y1: 2.4, color: WOOD_D, mat: 'wood' });
      (function door() {   // 경첩 x=1.2, 안쪽(-z)으로 90° 열려 오른쪽 벽 쪽에 붙음: 문짝 x 1.17..1.25, z 2.4..3.3
        var x0 = 1.17, x1 = 1.24, z0 = 2.38, z1 = 3.3, y0 = FL + 0.01, y1 = FL + 2.17;
        ctx.boxAABB({ x0: x0, x1: x1, z0: z0, z1: z0 + 0.12, y0: y0, y1: y1, surf: 'wood_light', color: 0xd9b58a });
        ctx.boxAABB({ x0: x0, x1: x1, z0: z1 - 0.12, z1: z1, y0: y0, y1: y1, surf: 'wood_light', color: 0xd9b58a });
        ctx.boxAABB({ x0: x0, x1: x1, z0: z0, z1: z1, y0: y0, y1: y0 + 0.62, surf: 'wood_light', color: 0xd9b58a });
        ctx.boxAABB({ x0: x0, x1: x1, z0: z0, z1: z1, y0: y1 - 0.12, y1: y1, surf: 'wood_light', color: 0xd9b58a });
        var gx = (x0 + x1) / 2;
        ctx.glassPane([[gx, y0 + 0.62, z0 + 0.12], [gx, y0 + 0.62, z1 - 0.12], [gx, y1 - 0.12, z1 - 0.12], [gx, y1 - 0.12, z0 + 0.12]]);
        ctx.cyl({ x: x0 - 0.04, y: FL + 0.95, z: z0 + 0.2, r: 0.018, h: 0.32, seg: 8, color: CHAR, mat: 'metal' });   // 세로 손잡이
      })();
      ctx.boxAABB({ x0: -0.15, x1: 2.6, z0: 3.5, z1: 4.45, y0: 0, y1: FL, surf: 'wood_light', color: 0xcfa77a });        // 데크
      for (var dk = 0; dk < 9; dk++) ctx.box({ x: 1.225, y: FL - 0.002, z: 3.55 + dk * 0.105, w: 2.74, h: 0.004, d: 0.008, color: 0x6e4a2c, vary: 0 });   // 데크 판 이음
      // 화분 나무(데크) + 세로 입간판
      ctx.cyl({ x: 2.32, y: FL, z: 3.9, r: 0.24, rTop: 0.27, h: 0.5, seg: 16, color: 0xe8e4dc, mat: 'gloss', flat: false });
      ctx.cyl({ x: 2.32, y: FL + 0.48, z: 3.9, r: 0.22, h: 0.03, seg: 14, surf: 'soil' });
      ctx.cyl({ x: 2.32, y: FL + 0.5, z: 3.9, r: 0.025, h: 1.0, seg: 6, color: 0x6a5240 });
      leafClump(2.32, FL + 1.6, 3.9, 0.42, 28, 0x6f8f45);
      ctx.box({ x: 1.55, y: FL, z: 4.08, w: 0.46, h: 0.95, d: 0.04, rx: 0.16, surf: 'wood_dark', color: 0xb98a5c });
      ctx.box({ x: 1.55, y: FL, z: 4.24, w: 0.46, h: 0.95, d: 0.04, rx: -0.16, surf: 'wood_dark', color: 0xb98a5c });

      // == 간판·벽등(바깥) ==
      ctx.boxAABB({ x0: 1.36, x1: 2.36, z0: 3.5, z1: 3.55, y0: 1.5, y1: 2.18, color: 0x8a5a34, mat: 'wood' });
      var panels = {};
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
      panel('sign', { x: 1.86, y: 1.84, z: 3.556, w: 0.9, h: 0.58, px: 512, data: { title: '독서공방', sub: 'SINCE 2026' }, draw: function (g, w, h, d) {
        g.fillStyle = '#f4ecdc'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#3b2a1e'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '700 ' + Math.round(h * 0.34) + 'px ' + FONT; g.fillText(d.title || '', w / 2, h * 0.42);
        g.font = '500 ' + Math.round(h * 0.1) + 'px ' + FONT; g.fillText(d.sub || '', w / 2, h * 0.76);
      } });
      // 벽등(간판 위)
      ctx.box({ x: 1.86, y: 2.45, z: 3.56, w: 0.08, h: 0.08, d: 0.12, color: CHAR, mat: 'metal' });
      ctx.cone({ x: 1.86, y: 2.38, z: 3.68, r: 0.13, h: 0.14, seg: 14, color: CHAR, mat: 'metal' });
      ctx.glow.add(Geo.sph(10, 6), hdr(0xffd79a, 2.6), { x: 1.86, y: 2.36, z: 3.68, sx: 0.06, sy: 0.04, sz: 0.06, flat: false, vary: 0 });
      ctx.addGlow({ x: 1.86, y: 2.3, z: 3.72, size: 1.1, color: 0xffcf8a, kind: 'lamp' });
      ctx.addLight({ x: 1.86, y: 2.2, z: 3.95, color: 0xffc27a, intensity: 0.55, distance: 6, kind: 'lamp' });

      // == 앞 화단(정면 창 아래) + 옆마당 화단 2 + 디딤돌 + 낮은 울타리 ==
      var PL = PLAN.garden.planter;
      ctx.boxAABB({ x0: PL.x0, x1: PL.x1, z0: PL.z0, z1: PL.z1, y0: 0, y1: PL.h, surf: 'concrete', color: 0xd6d2ca });
      ctx.boxAABB({ x0: PL.x0 + 0.06, x1: PL.x1 - 0.06, z0: PL.z0 + 0.06, z1: PL.z1 - 0.06, y0: PL.h - 0.04, y1: PL.h - 0.02, surf: 'soil' });
      PLAN.garden.beds.forEach(function (b) {
        ctx.boxAABB({ x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1, y0: 0, y1: b.h, surf: 'wood_dark', color: 0x9a7350 });
        ctx.boxAABB({ x0: b.x0 + 0.05, x1: b.x1 - 0.05, z0: b.z0 + 0.05, z1: b.z1 - 0.05, y0: b.h - 0.03, y1: b.h - 0.01, surf: 'soil' });
      });
      for (var st = 0; st < 8; st++) { var sz2 = 3.9 - st * 0.95; ctx.cyl({ x: -4.45 + (st % 2 ? 0.12 : -0.1), y: 0.0, z: sz2, r: 0.26 + rnd() * 0.05, h: 0.04, seg: 9, surf: 'concrete', color: 0xcac6be }); }
      function fence(x0, z0, x1, z1) {
        var dx = x1 - x0, dz = z1 - z0, L = Math.sqrt(dx * dx + dz * dz), n = Math.max(1, Math.round(L / 0.12)), ry = Math.atan2(dx, dz);
        for (var i = 0; i <= n; i++) { var t = i / n; ctx.box({ x: x0 + dx * t, y: 0, z: z0 + dz * t, w: 0.07, h: 0.72 + (i % 2 ? 0 : 0.04), d: 0.025, ry: ry + PI / 2, surf: 'wood_light', color: 0xead9c2 }); }
        [0.22, 0.55].forEach(function (yy) { ctx.box({ x: (x0 + x1) / 2, y: yy, z: (z0 + z1) / 2, w: 0.03, h: 0.06, d: L, ry: ry, surf: 'wood_light', color: 0xd8c3a5 }); });
      }
      fence(-6.5, -3.8, -6.5, 3.5); fence(-6.5, -3.8, -2.7, -3.8); fence(-6.5, 3.5, -5.0, 3.5);
      // 마당 나무 + 울타리 쪽 덤불
      ctx.cyl({ x: -5.3, y: 0, z: -2.6, r: 0.08, rTop: 0.05, h: 1.8, seg: 7, color: 0x6a5240 });
      leafClump(-5.3, 2.25, -2.6, 0.95, 70, 0x5d8a40); leafClump(-5.0, 1.85, -2.3, 0.5, 20, 0x678f45);
      for (var hb = 0; hb < 11; hb++) leafClump(-6.15 + rnd() * 0.2, 0.3, -3.4 + hb * 0.62, 0.38, 9, 0x557f3d, 0.75);
      // 옆마당 2인 그네: A 자 나무 틀(고정) + 밧줄 둘에 매달린 좌석(높이 0.45 — 아바타 앉는 높이와 같다).
      // 매달린 부분(밧줄·좌석·등받이·팔걸이)은 따로 한 묶음(draw call 1)으로 틀 윗보에 매달려, 누가 앉아 있을 때만 아주 작게 흔들린다(±1.6°, 3.6초 주기).
      // 앉은 아바타도 같은 만큼 옮긴다(hooks.seatOffset) — 좌석과 몸이 어긋나지 않는다. 움직임 줄이기 설정이면 흔들지 않는다.
      var swingPivot = null, swingTheta = 0, swingAmp = 0, SW_TOP = 2.0, SW_SEAT = 0.45;
      (function swing() {
        var x = SWING.x, zc = SWING.z, top = SW_TOP, sy = SW_SEAT, z0 = zc - 0.72, z1 = zc + 0.72, frame = 0x7a5232;
        [zc - 0.92, zc + 0.92].forEach(function (z) {
          ctx.beam3([x, top, z], [x - 0.45, 0, z], 0.07, 0.07, frame, ctx.woodB);
          ctx.beam3([x, top, z], [x + 0.45, 0, z], 0.07, 0.07, frame, ctx.woodB);
          ctx.beam3([x - 0.3, 0.7, z], [x + 0.3, 0.7, z], 0.05, 0.05, frame, ctx.woodB);
        });
        ctx.beam3([x, top + 0.04, zc - 1.02], [x, top + 0.04, zc + 1.02], 0.09, 0.09, frame, ctx.woodB);
        var sb = new G.Batch(91);
        [z0 + 0.06, z1 - 0.06].forEach(function (z) {
          [x - 0.16, x + 0.16].forEach(function (rx) { sb.addBeam([x, top, z], [rx, sy + 0.02, z], 0.014, 0.014, 0xd8c9a8, { vary: 0.02 }); });
        });
        function bx(o, c) { sb.add(Geo.box(), c, o); }
        for (var sl = 0; sl < 5; sl++) bx({ x: x - 0.2 + sl * 0.1, y: sy - 0.04, z: zc, sx: 0.085, sy: 0.04, sz: 1.44, flat: true, vary: 0.05 }, 0xd9b48a);
        bx({ x: x, y: sy - 0.09, z: z0 + 0.03, sx: 0.5, sy: 0.05, sz: 0.06, flat: true }, frame);
        bx({ x: x, y: sy - 0.09, z: z1 - 0.03, sx: 0.5, sy: 0.05, sz: 0.06, flat: true }, frame);
        for (var bs2 = 0; bs2 < 3; bs2++) bx({ x: x - 0.3 - bs2 * 0.02, y: sy + 0.1 + bs2 * 0.15, z: zc, sx: 0.03, sy: 0.1, sz: 1.44, rz: 0.12, flat: true, vary: 0.05 }, 0xd9b48a);   // 등받이 판(뒤 = -x)
        [z0 + 0.02, z1 - 0.02].forEach(function (z) {
          bx({ x: x - 0.3, y: sy, z: z, sx: 0.04, sy: 0.52, sz: 0.04, flat: true }, frame);
          bx({ x: x - 0.04, y: sy + 0.22, z: z, sx: 0.5, sy: 0.035, sz: 0.05, flat: true }, frame);   // 팔걸이
          bx({ x: x + 0.19, y: sy, z: z, sx: 0.035, sy: 0.22, sz: 0.035, flat: true }, frame);
        });
        var grp = sb.build(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), 'swingSeat', { cast: true, receive: true });
        grp.position.set(-x, -top, -zc);
        swingPivot = new T.Group(); swingPivot.name = 'swing'; swingPivot.position.set(x, top, zc); swingPivot.add(grp);
        ctx.add(swingPivot);
        ctx.aoDecal({ x0: x - 0.5, x1: x + 0.5, z0: zc - 0.98, z1: zc + 0.98, y: 0.006, pad: 0.25 });
      })();
      var reduced = false;
      try { reduced = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { reduced = false; }
      ctx.onUpdate(function (dt, t) {
        var occ = ctx.occupied || {}, want = (occ.S4 || occ.S5) && !reduced ? 0.028 : 0;
        swingAmp += (want - swingAmp) * Math.min(1, dt * 0.7);
        swingTheta = swingAmp * Math.sin(t * PI * 2 / 3.6);
        if (swingPivot) swingPivot.rotation.z = swingTheta;
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
      ctx.addGlow({ x: -5.35, y: 4.4, z: 6.1, size: 2.6, color: 0xffdca0, kind: 'lamp' });

      // == 실내: 창가 책상 3 + 의자 ==
      PLAN.desks.forEach(function (zc, i) {
        var x0 = -2.48, x1 = -1.92, top = FL + 0.74;
        ctx.boxAABB({ x0: x0, x1: x1, z0: zc - 0.5, z1: zc + 0.5, y0: top - 0.04, y1: top, surf: 'wood_dark', color: 0xe2c19a });
        [[x0 + 0.04, zc - 0.46], [x1 - 0.04, zc - 0.46], [x0 + 0.04, zc + 0.46], [x1 - 0.04, zc + 0.46]].forEach(function (p) { ctx.box({ x: p[0], y: FL, z: p[1], w: 0.045, h: 0.70, d: 0.045, color: 0x7a5232, mat: 'wood' }); });
        ctx.boxAABB({ x0: x0 + 0.02, x1: x1 - 0.06, z0: zc - 0.46, z1: zc + 0.46, y0: top - 0.12, y1: top - 0.04, color: 0x8a5d38, mat: 'wood' });
        var s = layout.seats[i], cx = s.x, cz = s.z, sy = FL + 0.44;
        ctx.box({ x: cx, y: sy, z: cz, w: 0.44, h: 0.04, d: 0.42, color: 0x9a6a40, mat: 'wood' });
        ctx.box({ x: cx - 0.01, y: sy + 0.04, z: cz, w: 0.38, h: 0.04, d: 0.36, color: 0xe9dcc4 });   // 방석
        [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]].forEach(function (p) { ctx.box({ x: cx + p[0], y: FL, z: cz + p[1], w: 0.035, h: 0.44, d: 0.035, color: 0x7a5232, mat: 'wood' }); });
        [-0.17, 0.17].forEach(function (dz) { ctx.box({ x: cx + 0.2, y: sy, z: cz + dz, w: 0.035, h: 0.44, d: 0.035, color: 0x7a5232, mat: 'wood' }); });
        ctx.box({ x: cx + 0.21, y: sy + 0.24, z: cz, w: 0.03, h: 0.16, d: 0.38, color: 0x9a6a40, mat: 'wood' });
        // 책상 위 소품
        if (i === 0) {   // 책상 등 + 펼친 책 + 머그 + 타이머 화면
          ctx.cyl({ x: -2.32, y: top, z: zc + 0.3, r: 0.07, h: 0.02, seg: 12, color: BRASS, mat: 'metal' });
          ctx.cyl({ x: -2.32, y: top + 0.02, z: zc + 0.3, r: 0.012, h: 0.3, seg: 6, color: BRASS, mat: 'metal' });
          ctx.glow.add(Geo.cyl(16, 0.62), hdr(0xfff0d0, 1.5), { x: -2.32, y: top + 0.28, z: zc + 0.3, sx: 0.13, sy: 0.17, sz: 0.13, flat: false, vary: 0 });
          ctx.addGlow({ x: -2.32, y: top + 0.36, z: zc + 0.3, size: 0.9, color: 0xffd8a0, kind: 'lamp' });
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
        g.fillStyle = '#3b2a1e'; g.font = '700 ' + Math.round(h * 0.11) + 'px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText((d.month || 11) + '월', w * 0.08, h * 0.06);
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
      ctx.addGlow({ x: -2.2, y: FL + 1.4, z: -2.5, size: 0.8, color: 0xffd39a, kind: 'lamp' });

      // == 오른쪽 벽: 전시 선반(낮은 책장 + 표지 선반) · 작업대 + 스툴 + 태블릿 · 코르크 보드 ==
      ctx.boxAABB({ x0: 2.14, x1: 2.48, z0: 0.72, z1: 2.08, y0: FL, y1: FL + 0.9, surf: 'wood_light', color: 0xd6ae80 });
      for (var lb = 0; lb < 16; lb++) ctx.box({ x: 2.33, y: FL + 0.5, z: 0.82 + lb * 0.078, w: 0.24, h: 0.3 + rnd() * 0.05, d: 0.05, color: ctx.shade([0x2f4a6a, 0xe8dcc6, 0x8a3b2e, 0x5d7a52, 0xd9b26a][lb % 5], 0.9 + rnd() * 0.2) });
      ctx.boxAABB({ x0: 2.2, x1: 2.5, z0: 0.72, z1: 2.08, y0: FL + 1.42, y1: FL + 1.45, surf: 'wood_light', color: 0xd6ae80 });
      ctx.boxAABB({ x0: 2.2, x1: 2.24, z0: 0.72, z1: 2.08, y0: FL + 1.45, y1: FL + 1.49, color: 0x9a6a40, mat: 'wood' });
      for (var cv2 = 0; cv2 < 4; cv2++) ctx.box({ x: 2.4, y: FL + 1.45, z: 0.9 + cv2 * 0.33, w: 0.02, h: 0.3, d: 0.22, rz: 0.18, color: [0xe8b4a0, 0x9fc0d8, 0xf0d890, 0xb8d4a8][cv2] });   // 읽고 싶은 책 표지(자리)
      var B = PLAN.bench;
      ctx.boxAABB({ x0: B.x0, x1: B.x1, z0: B.z0, z1: B.z1, y0: B.top - 0.05, y1: B.top, surf: 'wood_dark', color: 0xe2c19a });
      [[B.x0 + 0.04, B.z0 + 0.04], [B.x0 + 0.04, B.z1 - 0.04]].forEach(function (p) { ctx.box({ x: p[0], y: FL, z: p[1], w: 0.05, h: B.top - FL - 0.05, d: 0.05, color: 0x7a5232, mat: 'wood' }); });
      ctx.boxAABB({ x0: B.x0 + 0.1, x1: B.x1 - 0.02, z0: B.z0 + 0.05, z1: B.z1 - 0.05, y0: FL + 0.3, y1: FL + 0.33, surf: 'wood_dark', color: 0xd2b08a });
      var s3 = layout.seats[3];
      ctx.cyl({ x: s3.x, y: FL + 0.6, z: s3.z, r: 0.17, h: 0.05, seg: 16, color: 0x9a6a40, mat: 'wood' });
      [[0.11, 0.11], [-0.11, 0.11], [0.11, -0.11], [-0.11, -0.11]].forEach(function (p) { ctx.beam3([s3.x + p[0] * 0.8, FL + 0.6, s3.z + p[1] * 0.8], [s3.x + p[0] * 1.35, FL, s3.z + p[1] * 1.35], 0.025, 0.025, 0x7a5232); });
      ctx.cyl({ x: s3.x, y: FL + 0.2, z: s3.z, r: 0.15, h: 0.02, seg: 16, color: 0x7a5232, mat: 'wood' });   // 발판
      panel('tablet', { x: 2.2, y: B.top + 0.005, z: -0.5, w: 0.3, h: 0.22, rx: -PI / 2 + 0.12, ry: -PI / 2, px: 384, screen: true, data: { title: '읽는 중', lines: 9 }, draw: function (g, w, h, d) {
        g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#20252a'; g.fillRect(0, 0, w, h * 0.05); g.fillRect(0, h * 0.95, w, h * 0.05); g.fillRect(0, 0, w * 0.04, h); g.fillRect(w * 0.96, 0, w * 0.04, h);
        g.fillStyle = '#3b2a1e'; g.font = '700 ' + Math.round(h * 0.09) + 'px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(d.title || '', w * 0.1, h * 0.1);
        g.fillStyle = '#b8ad9c'; for (var l = 0; l < (d.lines || 8); l++) g.fillRect(w * 0.1, h * (0.27 + l * 0.07), w * (0.62 + ((l * 37) % 20) / 100), h * 0.022);
      } });
      ctx.boxAABB({ x0: 2.45, x1: 2.5, z0: -1.3, z1: 0.3, y0: FL + 1.3, y1: FL + 2.12, surf: 'cork', color: 0xe8c9a0 });
      [[FL + 1.27, FL + 1.3], [FL + 2.12, FL + 2.15]].forEach(function (yy) { ctx.boxAABB({ x0: 2.43, x1: 2.5, z0: -1.33, z1: 0.33, y0: yy[0], y1: yy[1], color: 0x8a5d38, mat: 'wood' }); });
      [-1.33, 0.3].forEach(function (zz) { ctx.boxAABB({ x0: 2.43, x1: 2.5, z0: zz, z1: zz + 0.03, y0: FL + 1.27, y1: FL + 2.15, color: 0x8a5d38, mat: 'wood' }); });
      panel('board', { x: 2.442, y: FL + 1.71, z: -0.5, w: 1.56, h: 0.78, ry: -PI / 2, px: 768, alpha: true, data: { notes: ['이번 주 3권', '되새김 10장', '오늘 30분', '추천: 산문집', '읽고 싶은 책'] }, draw: function (g, w, h, d) {
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
        ctx.addGlow({ x: p[0], y: y - 0.05, z: p[1], size: 0.6, color: 0xffd08a, kind: 'lamp' });
        ctx.addLight({ x: p[0], y: y - 0.15, z: p[1], color: 0xffc58a, intensity: 0.6, distance: 7.5, kind: 'lamp' });   // 약 3000K
      });
      [[-1.5, 2.3], [1.5, 2.3], [-1.5, 0.0], [1.5, 0.0], [-1.5, -2.3], [1.5, -2.3], [0, -4.5]].forEach(function (p) {
        var y = p[1] < -3.3 ? FL + 2.4 : CEIL;
        ctx.glow.add(Geo.cyl(14, 1), hdr(0xfff0d6, 2.4), { x: p[0], y: y - 0.006, z: p[1], sx: 0.06, sy: 0.005, sz: 0.06, flat: true, vary: 0 });
        ctx.cyl({ x: p[0], y: y - 0.004, z: p[1], r: 0.08, h: 0.004, seg: 14, color: 0xd8d2c8 });
        ctx.addGlow({ x: p[0], y: y - 0.06, z: p[1], size: 0.32, color: 0xffe2b0, kind: 'lamp' });
      });

      // == 카메라·하늘 ==
      ctx.setCameraBounds({ x0: -8, x1: 8, z0: -7, z1: 12, yMax: CEIL - 0.72 });   // 실내 카메라는 펜던트 아래
      ctx.setSky({ outside: true });

      // == 정원(앱 정원 꽃): setGarden([{flower, stage, pot}]) — 슬롯 순서는 gardenSlots() ==
      var gardenGroup = null, gMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
      function drawGarden(list) {
        if (gardenGroup) { ctx.root.remove(gardenGroup); gardenGroup.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); gardenGroup = null; }
        var slots = gardenSlots(), b = new G.Batch(77), r = ctx.rng(5);
        (list || []).slice(0, slots.length).forEach(function (it, i) {
          if (!it) return;
          var s = slots[i], y = s.y, K = 1.7, col = GARDEN_COLORS[((it.flower | 0) % GARDEN_COLORS.length + GARDEN_COLORS.length) % GARDEN_COLORS.length], stage = Math.max(0, Math.min(3, it.stage | 0)), pot = it.pot | 0;
          if (pot) {
            var pc = pot === 1 ? 0xc5784c : 0xece7de;
            b.add(Geo.cyl(12, 1.2), pc, { x: s.x, y: y, z: s.z, sx: 0.09, sy: 0.14, sz: 0.09, flat: false });
            b.add(Geo.cyl(12, 1), 0x4a3424, { x: s.x, y: y + 0.13, z: s.z, sx: 0.1, sy: 0.012, sz: 0.1, flat: true });
            y += 0.14;
          }
          if (stage === 0) { b.add(Geo.sph(8, 5), 0x5a4330, { x: s.x, y: y + 0.01, z: s.z, sx: 0.06, sy: 0.025, sz: 0.06, flat: false }); b.add(Geo.sph(6, 4), 0xd8c080, { x: s.x, y: y + 0.035, z: s.z, s: 0.012, flat: false }); return; }
          var hgt = [0, 0.1, 0.24, 0.32][stage] * K;
          b.add(Geo.cyl(5, 0.8), 0x4f7a3a, { x: s.x, y: y, z: s.z, sx: 0.012, sy: hgt, sz: 0.012, flat: false });
          for (var lf = 0; lf < 2 + stage; lf++) { var a = lf * 2.4 + r(); b.add(Geo.sph(6, 4), 0x5f9a45, { x: s.x + Math.cos(a) * 0.04, y: y + hgt * (0.25 + lf * 0.15), z: s.z + Math.sin(a) * 0.04, sx: 0.045 * K, sy: 0.012 * K, sz: 0.022 * K, ry: -a, flat: false }); }
          if (stage === 2) b.add(Geo.sph(8, 6), 0x6f9a4e, { x: s.x, y: y + hgt + 0.02, z: s.z, sx: 0.025, sy: 0.04, sz: 0.025, flat: false });
          if (stage === 3) {
            for (var pt = 0; pt < 6; pt++) { var pa = pt / 6 * PI * 2; b.add(Geo.sph(8, 5), col, { x: s.x + Math.cos(pa) * 0.04 * K, y: y + hgt + 0.01, z: s.z + Math.sin(pa) * 0.04 * K, sx: 0.038 * K, sy: 0.014 * K, sz: 0.026 * K, ry: -pa, flat: false }); }
            b.add(Geo.sph(8, 5), 0xf2c94c, { x: s.x, y: y + hgt + 0.02, z: s.z, s: 0.018 * K, flat: false });
          }
        });
        if (!b.p.length) return;
        gardenGroup = b.build(gMat, 'garden', { cast: true, receive: true });
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
            if (panels[id]) panels[id].redraw(data || {});
          },
          skin: skin,
          // 앉은 자리 옮김(흔들리는 그네): {x, y, z} 또는 null. main.js·net_view.js 가 앉은 아바타에 더한다
          seatOffset: function (id) {
            if ((id !== 'S4' && id !== 'S5') || !swingTheta) return null;
            var L = SW_TOP - SW_SEAT;
            return { x: L * Math.sin(swingTheta), y: L * (1 - Math.cos(swingTheta)), z: 0 };
          }
        }
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
