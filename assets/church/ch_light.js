/* ch_light.js — 빛의 성당(light): 앱이 지은 가상의 성당. 설계 시안 C 「돌로 지은 묵주」(Claude Fable 5.2, 2026-11-23)의 1단계.
   평면이 묵주 한 꿰미다: 광장 → 십자가 전실(사도신경, 장미창) → 구슬 회랑(주님의 기도 · 믿음 · 희망 · 사랑 · 영광송의 작은 돔 방 다섯)
   → 메달 홀(성모 경당) → 지름 60 m 돔 로툰다와 그 둘레의 신비 경당 20칸(시계 방향 환희 → 빛 → [동쪽 제단] → 고통 → 영광) → 후진.
   실제 성당이 아니다(실제 치수 100%, 축소 없음). 설명: docs/church/interiors/light.md.

   좌표(앱 공통): x 오른쪽(= 남쪽), z 입구 쪽(= 서쪽), 제단은 -z(= 동쪽). 로툰다 중심 (0,0).
   설계 평면 좌표 (px 동쪽, py 남쪽) 와는 x = py, z = -px.
   각도 θ(도): 설계 평면의 각(동쪽 0, 북쪽 +90). 로툰다 중심에서 반지름 r, 각 θ 의 점 = (−r·sinθ, −r·cosθ) — 앱의 yaw 와 같다.

   1단계 범위: 걷는 바닥·충돌체(건물 밖으로 못 나감, 제단 출입 금지), 전실·장미창, 구슬 방 다섯(모자이크 자리), 메달 홀(성모상),
   로툰다(기둥 12 · 열두 리브 별 돔 · 드럼 창 50 · 묵주 등 · 회중석), 신비 경당 20칸(한 모듈을 돌려 InstancedMesh 로 —
   창 20개는 파일 이름으로 걸린다: light/gpack_light.js ← art/light_cathedral/windows/<신비>_<n>.webp), 제단(닫집·장식벽·감실·성체등)·후진 3창 자리,
   네 문(서 = 입구 · 북 · 동 = 제단 · 남; 북·남은 닫힌 문 — 세례당·회랑은 2단계).
   구역(Z1~Z7)은 보이기 고리(zoneHook)만 둔다: 카메라가 있는 구역과 이웃만 그린다. 이 성당만 걷는 속도 1.1 m/s(layout.walkSpeed). */
(function () {
  'use strict';
  var D2R = Math.PI / 180;
  function P(r, deg) { return { x: -r * Math.sin(deg * D2R), z: -r * Math.cos(deg * D2R) }; }

  // ---- 평면 치수(설계 시안 C, m) ----
  var PLAN = {
    R_DOME: 30, R_AMB: 42, R_RING: 57, R_BACK: 57.6, WALL_T: 1.2,
    CHAPEL_DEG: 13, CHAPEL_H: 21, WIN_W: 3, WIN_TOP: 14.0, WIN_PLANE: 56.38,
    PIER_R: 1.8, ARCADE_SPRING: 21, DRUM_Y0: 36, DRUM_Y1: 44, DOME_APEX: 74, LANTERN_TOP: 86,
    SANCT_Z: -24.4, SANCT_HALF: 13, SANCT_Y: 0.9, APSE_C: -57, APSE_R: 13,
    ENTRY: { z0: 142, z1: 186, half: 9, crossZ0: 150, crossZ1: 168, crossHalf: 30, wallH: 20, rise: 7 },
    GALLERY: { z0: 80, z1: 141.5 },
    MEDAL: { cz: 68.5, r: 11.5 },
    PLAZA: { x: 24, z1: 206.5 }
  };
  // 신비 경당 20칸: 묶음 시작각(설계 평면), 시계 방향(θ 감소)으로 13°씩
  var SETS = [['joyful', 165], ['luminous', 80], ['sorrowful', -15], ['glorious', -100]];
  var CHAPELS = [];
  SETS.forEach(function (s) {
    for (var i = 0; i < 5; i++) {
      var th = s[1] - 6.5 - 13 * i, c = P(49.5, th), w = P(PLAN.WIN_PLANE, th);
      CHAPELS.push({ key: s[0] + '_' + (i + 1), set: s[0], n: i + 1, theta: th, center: { x: c.x, z: c.z }, window: { x: w.x, y: PLAN.WIN_TOP - 5, z: w.z, nx: -w.x / PLAN.WIN_PLANE, nz: -w.z / PLAN.WIN_PLANE } });
    }
  });
  // 칸막이(방사형 벽) 각: 묶음마다 6개(경당 경계). 북문(80~100)·남문(−100~−80)·서문(165~195)·제단(−15~15)은 묶음 사이.
  var PARTITIONS = [];
  SETS.forEach(function (s) { for (var i = 0; i <= 5; i++) PARTITIONS.push(s[1] - 13 * i); });
  // 문 칸(경당 고리가 끊긴 곳): 서 = 입구(열림), 북·남 = 닫힌 장식 문(2단계에서 세례당·회랑), 동 = 제단
  var DOORS = { west: { from: 165, to: 195, open: true }, north: { from: 80, to: 100, open: false }, south: { from: -100, to: -80, open: false }, east: { from: -15, to: 15, sanctuary: true } };

  // ---- 구역(설계 「폰 성능 계획」 Z1~Z7). zoneOf(x,z) — 보이기 고리와 시험이 쓴다 ----
  var ZONES = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z5b', 'Z6', 'Z7'];
  function zoneOf(x, z) {
    var r = Math.sqrt(x * x + z * z);
    if (z >= 141) return 'Z1';
    if (z >= 79.5) return 'Z2';
    if (z >= 54 && Math.abs(x) < 15) return 'Z3';
    if (z < PLAN.SANCT_Z && Math.abs(x) <= 15.5 && r > 20) return 'Z5b';
    if (r <= PLAN.R_AMB) return 'Z4';
    if (r <= PLAN.R_BACK + 2) return 'Z5';
    return x < 0 ? 'Z6' : 'Z7';
  }
  // 그 구역에 있을 때 그리는 구역(문·아치로 이어져 보이는 곳). 로툰다 묶음(Z4·Z5·Z5b)은 한 팩.
  // 구슬 회랑(Z2)에서는 메달 홀 두 문(반폭 4.6 · 4)과 회랑 통로(반폭 4) 너머로 로툰다 가운데·제단만 보인다 — 경당 고리(Z5)는 그 시야 밖이라 그리지 않는다.
  // 다만 영광송 방(z < 96.5, 반폭 8)에서는 두 문을 비스듬히 꿰는 시선이 경당 고리(x −40, z −46 쪽)까지 닿으므로 Z2s(경당 고리 포함)를 쓴다.
  var R_GRP = ['Z4', 'Z5', 'Z5b'];
  var VISIBLE = {
    Z1: ['Z1', 'Z2', 'Z3'], Z2: ['Z1', 'Z2', 'Z3', 'Z4', 'Z5b'], Z2s: ['Z1', 'Z2', 'Z3'].concat(R_GRP), Z3: ['Z1', 'Z2', 'Z3'].concat(R_GRP),
    Z4: ['Z2', 'Z3'].concat(R_GRP), Z5: ['Z2', 'Z3'].concat(R_GRP), Z5b: ['Z3'].concat(R_GRP), Z6: R_GRP, Z7: R_GRP
  };

  // ---- 레이아웃(순수 자료) ----
  // 회중석(참고 c2): 제대를 둘러싼 부채꼴 네 묶음. 줄은 엔진 규약대로 제대 쪽(−z)을 바라보는 곧은 줄(yaw 0 — 줄 띠 충돌·통로 자리·제대 방향 시험)이고,
  // 뒤 줄로 갈수록 바깥으로 비켜(rowDx) 가운데 묶음 둘과 한 줄 뒤에서 시작하는 바깥 묶음 둘이 계단식 부채꼴을 이룬다.
  // 가운데 통로(앞 2 m, 뒤로 갈수록 넓어짐)는 서문 → 제대 앞 걷는 길. 바닥 묵주 상감(반지름 27) 안쪽.
  var seatGroups = [
    { g: 'A', rows: 8, perRow: 6, origin: { x: -6.35, z: -19 }, dx: 0.95, dz: 1.7, rowDx: -0.25, yaw: 0 },
    { g: 'B', rows: 8, perRow: 6, origin: { x: 1.6, z: -19 }, dx: 0.95, dz: 1.7, rowDx: 0.25, yaw: 0 },
    { g: 'C', rows: 7, perRow: 4, origin: { x: -12.35, z: -17.3 }, dx: 0.95, dz: 1.7, rowDx: -0.45, yaw: 0 },
    { g: 'D', rows: 7, perRow: 4, origin: { x: 9.5, z: -17.3 }, dx: 0.95, dz: 1.7, rowDx: 0.45, yaw: 0 }
  ];
  // 경당마다 봉헌초 받침(4칸 × 2줄): 경당 오른쪽(시계 반대 쪽) 벽 앞, 경당 축을 바라본다
  var stands = CHAPELS.map(function (c) {
    var a = c.theta * D2R, ca = Math.cos(a), sa = Math.sin(a);
    var lx = 3.4, lz = -51.2;   // 모듈 좌표(θ=0 경당: 축이 -z)
    return { x: lx * ca + lz * sa, z: -lx * sa + lz * ca, slots: 8, cols: 4, pitch: 0.3, step: 0.28, ystep: 0.22, y0: 0.95, reach: 1.6, face: [-ca, sa] };
  });
  // 메달 홀 금빛 벽감 양옆 봉헌초 받침 둘(참고 c_medal_hall_madonna): 벽감(북벽 x −11.5) 앞, 벽감 축(z 68.5)에서 ±3.1 m(성모 기도 자리 받침과 3 m 넘게 — shrine.test), 홀 가운데(+x)를 바라본다
  var medalStands = [];
  [-1, 1].forEach(function (sg) { medalStands.push({ x: -10.35, z: 68.5 + sg * 3.1, slots: 12, cols: 4, pitch: 0.24, step: 0.24, ystep: 0.26, y0: 0.82, reach: 1.6, face: [1, 0] }); });
  stands.push.apply(stands, medalStands);
  var layout = {
    id: 'light', scalePercent: 100, fictional: true,
    walkSpeed: 1.1,   // 이 성당만: 순례 걸음(문 → 제단 약 3분). 다른 성당은 scene_logic WALK_SPEED(4.0) 그대로
    bounds: { x0: -58.4, x1: 58.4, z0: -71, z1: 207 },
    spawn: { x: 0, z: 201, r: 0 },
    seatGroups: seatGroups,
    candles: { stands: stands },
    stations: { altar: { x: 0, z: -22.9 } },
    markerRange: 24,   // 표식(촛불 봉헌·제대 앞 이름표)은 24 m 안만 — 경당 20칸의 이름표가 벽 너머로 한꺼번에 뜨지 않게(markers.js)
    fonts: [{ x: 5, z: 178.3, face: [0, 1], reach: 1.4 }],
    crossWay: { none: true },   // 십자가의 길 14처는 2단계(로툰다 주보랑 바깥벽, 고통 경당 구간)에 건다 — 지금은 걸지 않는다
    info: { name: '빛의 성당', fictional: true }
  };
  ChurchLayouts.register(layout);

  function build(ctx) {
    var T = ctx.THREE, GG = window.ChurchGeo, Geo = GG.Geo;
    var low = ctx.quality === 'low';
    var STONE = 0xe9e0cf, STONE_D = 0xcfc3ad, STONE_W = 0xf3ebdc, BLUE = 0x1d2f6b, BLUE_D = 0x16224f, GOLD = 0xd3a64c, WOOD = 0x5a3822, MARBLE = 0xffffff;
    var stats = { tris: {}, instTris: 0 };

    // ===== 구역별 묶음(재질별 Batch → 구역 Group). 다른 구역과 합치지 않아야 구역을 통째로 숨길 수 있다 =====
    var surfLime = ctx.surfaces && ctx.surfaces.limestone, tileL = surfLime && surfLime.tile ? (Array.isArray(surfLime.tile) ? surfLime.tile[0] : surfLime.tile) : 1.8;
    var surfFloor = ctx.surfaces && ctx.surfaces.marble_beige, tileF = surfFloor && surfFloor.tile ? (Array.isArray(surfFloor.tile) ? surfFloor.tile[0] : surfFloor.tile) : 1.6;
    var MAT = {
      stone: ctx.mats.surface ? ctx.mats.surface('limestone', { vertex: true }) : ctx.mats.solid,
      floor: ctx.mats.surface ? ctx.mats.surface('marble_beige', { vertex: true }) : ctx.mats.solid,
      paint: ctx.mats.solid, gold: ctx.mats.metal, wood: ctx.mats.wood || ctx.mats.solid, glow: ctx.mats.glow
    };
    // 넓은 바닥이 바깥 하늘(환경광)을 하얗게 비추지 않게 바닥 반사를 낮춘다(core 가 시간대마다 envK 로 다시 맞추므로 기록도 고친다)
    (ctx._.physMats || []).forEach(function (rec) { if (rec.m === MAT.floor) { rec.envK = 0.28; rec.cc = 0.12; rec.m.envMapIntensity = 0.28; rec.m.clearcoat = 0.12; } });
    var goldUV = !!ctx.mats.metal.map;
    function newBatch(kind, seed) {
      var b = new GG.Batch(seed || 3);
      if (kind === 'stone') b.enableUV(tileL, tileL);
      else if (kind === 'floor') b.enableUV(tileF, tileF);
      else if (kind === 'gold' && goldUV) b.enableUV(1, 1);
      else if (kind === 'star') b.enableUV(4.5, 4.5);
      return b;
    }
    var Z = {};
    ZONES.forEach(function (id, i) {
      var g = new T.Group(); g.name = 'light_' + id; ctx.add(g);
      Z[id] = { id: id, group: g, b: {}, seed: 11 + i * 7 };
    });
    function B(zone, kind) {
      var z = Z[zone];
      return z.b[kind] || (z.b[kind] = newBatch(kind, z.seed++));
    }

    // ---- 도형 도우미(Batch 에 직접) ----
    function boxA(b, x0, x1, y0, y1, z0, z1, col) {
      b.add(Geo.box(), col, { x: (x0 + x1) / 2, y: y0, z: (z0 + z1) / 2, sx: Math.abs(x1 - x0), sy: y1 - y0, sz: Math.abs(z1 - z0), flat: true, vary: 0.02 });
    }
    // 선분 a→b 를 따라 놓인 벽 상자(두께 t, 선분이 두께 가운데)
    function segBox(b, ax, az, bx, bz, y0, y1, t, col) {
      var dx = bx - ax, dz = bz - az, L = Math.sqrt(dx * dx + dz * dz);
      if (L < 1e-3) return;
      b.add(Geo.box(), col, { x: (ax + bx) / 2, y: y0, z: (az + bz) / 2, sx: L, sy: y1 - y0, sz: t, ry: Math.atan2(-dz, dx), flat: true, vary: 0.02 });
    }
    function cylAt(b, x, z, y0, h, r, rTop, seg, col) { b.add(Geo.cyl(seg, rTop / r), col, { x: x, y: y0, z: z, sx: r, sy: h, sz: r, flat: false, vary: 0.02 }); }
    // 뾰족 아치(반폭 a, 오름 h)의 높이: |u| ≤ a
    function archY(u, a, h) {
      var R = (a * a + h * h) / (2 * a), d = Math.abs(u) + R - a;
      return Math.sqrt(Math.max(0, R * R - d * d));
    }
    // 높이장 천장(아래를 향함): 칸 nx × nz, fn(u,v) → [x,y,z] (u,v 0..1)
    function ceilGrid(b, nx, nz, fn, col, flipHint) {
      for (var i = 0; i < nx; i++) for (var j = 0; j < nz; j++) {
        var p00 = fn(i / nx, j / nz), p10 = fn((i + 1) / nx, j / nz), p11 = fn((i + 1) / nx, (j + 1) / nz), p01 = fn(i / nx, (j + 1) / nz);
        var cx = (p00[0] + p11[0]) / 2, cy = (p00[1] + p11[1]) / 2 - (flipHint ? -8 : 8), cz = (p00[2] + p11[2]) / 2;
        b.addQuad(p00, p10, p11, p01, col, [cx, cy, cz], { vary: 0.015 });
      }
    }
    // 바닥 판(위를 향함)
    function floorQuad(b, x0, x1, z0, z1, y, col) { b.addQuad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], col, [(x0 + x1) / 2, y + 5, (z0 + z1) / 2], { vary: 0.01 }); }
    // 뾰족 아치 구멍이 난 벽 판: 가운데 O(바닥), 가로 단위 (ux,uz), 반폭 W, 높이 H, 두께 t, 구멍 반폭 a·시작 s·꼭대기 p
    function archWall(b, ox, oz, ux, uz, W, H, t, a, s, p, col, seg) {
      seg = seg || 10;
      var nx = -uz, nz = ux;   // 벽 법선
      function at(u, y, side) { return [ox + ux * u + nx * side * t / 2, y, oz + uz * u + nz * side * t / 2]; }
      // 양옆 기둥 부분
      segBox(b, ox - ux * W, oz - uz * W, ox - ux * a, oz - uz * a, 0, H, t, col);
      segBox(b, ox + ux * a, oz + uz * a, ox + ux * W, oz + uz * W, 0, H, t, col);
      // 아치 위(삼각 띠) 앞·뒤 면 + 아치 안쪽 면(소핏)
      var pts = [];
      for (var k = 0; k <= seg; k++) { var u = -a + 2 * a * k / seg; pts.push([u, s + archY(u, a, p - s)]); }
      for (k = 0; k < seg; k++) {
        var u0 = pts[k][0], y0 = pts[k][1], u1 = pts[k + 1][0], y1 = pts[k + 1][1];
        [-1, 1].forEach(function (sd) {
          var hint = [ox + nx * sd * 5, (y0 + H) / 2, oz + nz * sd * 5];
          b.addQuad(at(u0, y0, sd), at(u1, y1, sd), at(u1, H, sd), at(u0, H, sd), col, hint, { vary: 0.01 });
        });
        b.addQuad(at(u0, y0, -1), at(u1, y1, -1), at(u1, y1, 1), at(u0, y0, 1), col, [ox + ux * (u0 + u1) / 2, (y0 + y1) / 2 - 3, oz + uz * (u0 + u1) / 2], { vary: 0.01 });
      }
    }
    // 아치 테두리(금·돌 띠): 벽 앞면에 붙는 가는 띠
    function archRing(b, ox, oz, ux, uz, a, s, p, off, w, col, seg) {
      seg = seg || 12;
      var nx = -uz, nz = ux;
      for (var k = 0; k < seg; k++) {
        var u0 = -a + 2 * a * k / seg, u1 = -a + 2 * a * (k + 1) / seg;
        var y0 = s + archY(u0, a, p - s), y1 = s + archY(u1, a, p - s);
        b.addBeam([ox + ux * u0 + nx * off, y0, oz + uz * u0 + nz * off], [ox + ux * u1 + nx * off, y1, oz + uz * u1 + nz * off], w, 0.25, col);
      }
    }
    function addSeg(ax, az, bx, bz, r) { ctx.addCollider({ ax: ax, az: az, bx: bx, bz: bz, r: r || 0.6 }); }

    // ---- 2단계 꾸밈 도우미(참고 c2·c4·c6·interior_three_levels: 굽도리·띠돌림·처마·붙은 기둥·막힌 아케이드·바닥 무늬) ----
    // 벽 안쪽 면의 선분 a→b, 안쪽 법선 (nx,nz). o: plinth(기본 켬) · string(띠돌림 높이) · cornice(처마 높이) · shafts([선분 위 거리]) · shaftTop
    function trims(zone, ax, az, bx, bz, nx, nz, o) {
      var s = B(zone, 'stone'), gd = B(zone, 'gold');
      var dx = bx - ax, dz = bz - az, L = Math.sqrt(dx * dx + dz * dz);
      function strip(b, y0, y1, d, col) { var ox = nx * d / 2, oz = nz * d / 2; segBox(b, ax + ox, az + oz, bx + ox, bz + oz, y0, y1, d, col); }
      if (o.plinth !== false) { strip(s, 0, 0.5, 0.16, STONE_D); strip(s, 0.5, 0.62, 0.22, STONE_W); }
      if (o.string) { strip(s, o.string, o.string + 0.3, 0.24, STONE_W); strip(gd, o.string + 0.3, o.string + 0.36, 0.1, GOLD); strip(s, o.string - 0.12, o.string, 0.14, STONE_D); }
      if (o.cornice) { strip(s, o.cornice - 0.5, o.cornice, 0.36, STONE_W); strip(gd, o.cornice - 0.58, o.cornice - 0.5, 0.12, GOLD); }
      (o.shafts || []).forEach(function (u) {
        var px = ax + dx * u / L + nx * 0.2, pz = az + dz * u / L + nz * 0.2, top = o.shaftTop || o.string || 6;
        cylAt(s, px, pz, 0.62, top - 0.62 - 0.5, 0.17, 0.17, 10, STONE_W);
        cylAt(gd, px, pz, top - 0.5, 0.5, 0.19, 0.32, 10, GOLD);
        cylAt(s, px, pz, 0.5, 0.14, 0.26, 0.26, 10, STONE_W);
      });
    }
    // 막힌 뾰족 아치(벽에 붙은 얕은 아케이드): 가운데 (cx,cz), 가로 단위 (ux,uz), 안쪽 법선 (nx,nz), 반폭 a, 바닥 y0, 아치 시작 sp, 꼭대기 ap.
    // 안은 별 궁륭 판(파란 바탕 금별), 둘레는 금 테 + 양옆 가는 돌기둥
    function blindArch(zone, cx, cz, ux, uz, nx, nz, a, y0, sp, ap, plain, lite) {
      // zone: 구역 이름 또는 묶음 셋 {st, gd, s}(인스턴스 모듈 — 경당·칸막이)
      var zb = typeof zone === 'object' ? zone : null;
      var st = zb ? (plain ? zb.s : zb.st) : (plain ? B(zone, 'stone') : B(zone, 'star')), gd = zb ? zb.gd : B(zone, 'gold'), s = zb ? zb.s : B(zone, 'stone'), k, n = 6;
      var fx = cx + nx * 0.03, fz = cz + nz * 0.03;
      for (k = 0; k < n; k++) {
        var u0 = -a + 2 * a * k / n, u1 = -a + 2 * a * (k + 1) / n, top = sp + Math.min(archY(u0, a, ap - sp), archY(u1, a, ap - sp));
        st.addQuad([fx + ux * u0, y0, fz + uz * u0], [fx + ux * u1, y0, fz + uz * u1], [fx + ux * u1, top, fz + uz * u1], [fx + ux * u0, top, fz + uz * u0], plain ? STONE_D : STARV, [fx + nx * 4, (y0 + top) / 2, fz + nz * 4]);
      }
      if (!plain) archRing(gd, cx + nx * 0.1, cz + nz * 0.1, ux, uz, a + 0.04, sp, ap + 0.04, 0, 0.14, GOLD, 6);
      if (lite) return;   // 높은 곳(로툰다 2층 줄): 별 판 + 금 테만
      archRing(s, cx + nx * 0.05, cz + nz * 0.05, ux, uz, a + 0.2, sp, ap + 0.2, 0, 0.2, STONE_W, 6);
      // 양옆 가는 기둥(사각) + 기둥머리 — 삼각형을 아끼려고 상자로
      [-1, 1].forEach(function (sd) {
        var px = cx + ux * sd * (a + 0.1) + nx * 0.12, pz = cz + uz * sd * (a + 0.1) + nz * 0.12;
        s.add(Geo.box(), STONE_W, { x: px, y: y0, z: pz, sx: 0.18, sy: sp - y0 - 0.25, sz: 0.18, ry: Math.atan2(-uz, ux), flat: true, vary: 0.02 });
        (plain ? s : gd).add(Geo.box(), plain ? STONE_W : GOLD, { x: px, y: sp - 0.25, z: pz, sx: 0.3, sy: 0.25, sz: 0.3, ry: Math.atan2(-uz, ux), flat: true, vary: 0 });
      });
    }
    // 위층 막힌 아케이드 줄(참고 c6·interior_three_levels 의 2층 회랑): 선분 a→b 를 따라 반폭 a 아치를 n 개
    function arcadeRow(zone, ax, az, bx, bz, nx, nz, n, y0, sp, ap) {
      var dx = bx - ax, dz = bz - az, L = Math.sqrt(dx * dx + dz * dz), ux = dx / L, uz = dz / L, w = L / n;
      for (var i = 0; i < n; i++) blindArch(zone, ax + ux * w * (i + 0.5), az + uz * w * (i + 0.5), ux, uz, nx, nz, w / 2 - 0.28, y0, sp, ap, true);
      var s = B(zone, 'stone'); segBox(s, ax + nx * 0.15, az + nz * 0.15, bx + nx * 0.15, bz + nz * 0.15, y0 - 0.25, y0, 0.3, STONE_W);
    }
    // 무늬 바닥: [x0,x1]×[z0,z1] 를 칸 sz 로 겹치지 않게 깐다. fn(cx,cz,i,j) → 색(대리석 질감에 곱해진다)
    function floorTiles(b, x0, x1, z0, z1, sz, fn) {
      var nx = Math.max(1, Math.round((x1 - x0) / sz)), nz = Math.max(1, Math.round((z1 - z0) / sz)), wx = (x1 - x0) / nx, wz = (z1 - z0) / nz;
      for (var i = 0; i < nx; i++) for (var j = 0; j < nz; j++) {
        var a = x0 + i * wx, c = z0 + j * wz;
        b.addQuad([a, 0, c], [a + wx, 0, c], [a + wx, 0, c + wz], [a, 0, c + wz], fn(a + wx / 2, c + wz / 2, i, j), [a + wx / 2, 5, c + wz / 2], { vary: 0.012 });
      }
    }
    var M_CREAM = 0xffffff, M_GREY = 0xc9ccd3, M_RED = 0xb4646a, M_BLUE = 0x7f93bf, M_GOLD = 0xe7c47a;

    // ===== 캔버스 질감(글자·상징 없음): 별 궁륭, 금 모자이크, 창 자리표시 =====
    function canvasTex(w, h, draw, rep) {
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var g = c.getContext('2d'); draw(g, w, h);
      var t = new T.CanvasTexture(c);
      if (T.SRGBColorSpace !== undefined) t.colorSpace = T.SRGBColorSpace; else t.encoding = T.sRGBEncoding;
      if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
      return t;
    }
    var starRng = ctx.rng(77);
    // 별 궁륭 타일(참고 c2·c3·c4·c6: 짙은 군청 바탕에 금별) — 이음매 없이 반복(가장자리 별은 반대편에도 그린다). 궁륭 'star' 묶음(4.5 m 타일)·돔·메달 홀 돔이 함께 쓴다
    function starTile(n, rMin, rMax) {
      return canvasTex(256, 256, function (g, w, h) {
        var gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#203479'); gr.addColorStop(0.5, '#1a2b6a'); gr.addColorStop(1, '#22377e');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 700; i++) { g.fillStyle = starRng() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,20,0.06)'; g.fillRect(starRng() * w, starRng() * h, 2 + starRng() * 4, 2 + starRng() * 4); }
        function star(x, y, r) {
          [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]].forEach(function (o) {
            var cx = x + o[0], cy = y + o[1];
            if (cx < -r || cx > w + r || cy < -r || cy > h + r) return;
            g.fillStyle = '#b8892c'; g.beginPath();
            for (var k = 0; k < 10; k++) { var a = k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r * 1.08; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr + 0.6); }
            g.closePath(); g.fill();
            g.fillStyle = '#f2cf6e'; g.beginPath();
            for (k = 0; k < 10; k++) { var a2 = k * Math.PI / 5 - Math.PI / 2, r2 = k % 2 ? r * 0.4 : r; g.lineTo(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2); }
            g.closePath(); g.fill();
          });
        }
        var gs = Math.round(Math.sqrt(n)), cell = w / gs;
        for (var j = 0; j < gs; j++) for (var i2 = 0; i2 < gs; i2++) star((i2 + 0.2 + starRng() * 0.6) * cell, (j + 0.2 + starRng() * 0.6) * cell, rMin + starRng() * (rMax - rMin));
        for (i = 0; i < 40; i++) { g.fillStyle = 'rgba(242,207,110,0.7)'; g.beginPath(); g.arc(starRng() * w, starRng() * h, 1 + starRng(), 0, 7); g.fill(); }
      }, [1, 1]);
    }
    var starTex = starTile(16, 7, 11);
    // 궁륭 묶음 재질: 별 타일 × 정점 색(흰색 = 타일 그대로, 칸마다 조금씩 다른 밝기)
    MAT.star = new T.MeshStandardMaterial({ map: starTex, vertexColors: true, roughness: 0.72, metalness: 0, envMapIntensity: 0.45 });
    var STARV = 0xffffff;
    var mosaicRng = ctx.rng(91);
    function mosaicTex(kind) {
      return canvasTex(256, 256, function (g, w, h) {
        var cx = w / 2, cy = h / 2, R = w / 2;
        for (var y = 0; y < h; y += 6) for (var x = 0; x < w; x += 6) {
          var d = Math.hypot(x - cx, y - cy) / R, v = 0.82 + mosaicRng() * 0.2;
          var ring = kind !== 'apse' && (Math.abs(d - 0.93) < 0.04 || Math.abs(d - 0.62) < 0.025);   // 후진 반돔은 고른 금빛(무늬 없음)
          var col = ring ? [150 * v, 30 * v, 40 * v] : [222 * v, 178 * v, 86 * v];
          if (kind === 'gloria' && (Math.abs(d - 0.25) < 0.03 || Math.abs(d - 0.38) < 0.03 || Math.abs(d - 0.5) < 0.03)) col = [250 * v, 244 * v, 226 * v];
          g.fillStyle = 'rgb(' + (col[0] | 0) + ',' + (col[1] | 0) + ',' + (col[2] | 0) + ')'; g.fillRect(x, y, 5, 5);
        }
      });
    }
    var COLORS = { joyful: ['#2a4fa8', '#e9e3c8', '#5c86d8'], luminous: ['#d9a028', '#f6e7a8', '#3f73c9'], sorrowful: ['#8c1f2b', '#4d2a72', '#c9483b'], glorious: ['#f1e8c8', '#d6a843', '#5d8fd8'], apse: ['#2b3f86', '#d9b552', '#9b2335'] };
    function placeholderPane(set, seed) {
      var rr = ctx.rng(seed), C = COLORS[set] || COLORS.apse;
      return function (g, w, h) {
        g.fillStyle = '#16131c'; g.fillRect(0, 0, w, h);
        var cs = Math.max(6, w / 9) | 0;
        for (var y = 0; y < h; y += cs) for (var x = 0; x < w; x += cs) {
          var t = (y / h), c = C[(rr() * 3) | 0];
          g.globalAlpha = 0.75 + rr() * 0.25 - t * 0.1; g.fillStyle = c; g.fillRect(x + 1, y + 1, cs - 2, cs - 2);
        }
        g.globalAlpha = 1;
      };
    }

    // ===== 유리 재질(빛 받지 않고 스스로 빛남; 낮 밝게·밤 어둡게) =====
    var glassMats = [];
    function glassMat(map) {
      var m = new T.MeshBasicMaterial({ map: map || null, color: 0xffffff, side: T.DoubleSide, toneMapped: false, fog: true });
      glassMats.push(m);
      return m;
    }
    // 뾰족 아치 창 모양(너비 w, 높이 h, 아치 오름 rise) — UV 는 그림 비율 그대로(0..1)
    function lancetGeo(w, h, rise, uv) {
      var sh = new T.Shape(), a = w / 2, s = h - rise, n = 10, k;
      sh.moveTo(-a, 0); sh.lineTo(a, 0); sh.lineTo(a, s);
      for (k = 1; k <= n; k++) { var u = a - (a * k / n); sh.lineTo(u, s + archY(u, a, rise)); }
      for (k = 1; k <= n; k++) { var u2 = -(a * k / n); sh.lineTo(u2, s + archY(u2, a, rise)); }
      sh.lineTo(-a, 0);
      var g = new T.ShapeGeometry(sh), pos = g.attributes.position, uvA = g.attributes.uv;
      var U = uv || [0, 0, 1, 1];
      for (k = 0; k < pos.count; k++) {
        var fu = (pos.getX(k) + a) / w, fv = pos.getY(k) / h;
        uvA.setXY(k, U[0] + (U[2] - U[0]) * fu, U[1] + (U[3] - U[1]) * fv);
      }
      return g;
    }
    function place(o, x, y, z, yaw) { o.position.set(x, y, z); o.rotation.set(0, yaw, 0); return o; }

    // =====================================================================
    // Z1 광장 · 정면 · 십자가 전실
    // =====================================================================
    var E = PLAN.ENTRY, PZ = PLAN.PLAZA;
    ctx.setSky({ outside: true });
    if (ctx.ground) ctx.ground({ color: 0x8f8a78 });
    (function plaza() {
      var f = B('Z1', 'floor'), s = B('Z1', 'stone'), gd = B('Z1', 'gold');
      floorQuad(f, -PZ.x, PZ.x, 188, PZ.z1, 0.02, 0xd8d2c4);
      // 광장 가장자리 낮은 돌난간
      boxA(s, -PZ.x - 0.4, -PZ.x, 0, 1.0, 186, PZ.z1 + 0.4, STONE_D); boxA(s, PZ.x, PZ.x + 0.4, 0, 1.0, 186, PZ.z1 + 0.4, STONE_D);
      boxA(s, -PZ.x, -3, 0, 1.0, PZ.z1, PZ.z1 + 0.4, STONE_D); boxA(s, 3, PZ.x, 0, 1.0, PZ.z1, PZ.z1 + 0.4, STONE_D);
      ctx.addCollider({ x0: -PZ.x - 0.6, x1: -PZ.x + 0.2, z0: 186, z1: PZ.z1 + 0.6 }); ctx.addCollider({ x0: PZ.x - 0.2, x1: PZ.x + 0.6, z0: 186, z1: PZ.z1 + 0.6 });
      ctx.addCollider({ x0: -PZ.x, x1: PZ.x, z0: PZ.z1, z1: PZ.z1 + 0.6 });
      // 광장 바닥의 청동 묵주 지도(정거장 1): 고리 + 다섯 큰 구슬 + 십자가 쪽 줄(글자 없음)
      var mx = 6, mz = 199;
      for (var k = 0; k < 40; k++) { var a = k / 40 * Math.PI * 2; gd.add(Geo.cyl(8, 1), GOLD, { x: mx + Math.cos(a) * 2.2, y: 0.02, z: mz - 1 + Math.sin(a) * 2.2, sx: k % 8 === 0 ? 0.2 : 0.09, sy: 0.02, sz: k % 8 === 0 ? 0.2 : 0.09, vary: 0 }); }
      for (k = 0; k < 6; k++) gd.add(Geo.cyl(8, 1), GOLD, { x: mx, y: 0.02, z: mz + 1.4 + k * 0.45, sx: 0.12, sy: 0.02, sz: 0.12, vary: 0 });
      boxA(gd, mx - 0.05, mx + 0.05, 0.02, 0.04, mz + 4.0, mz + 5.0, GOLD); boxA(gd, mx - 0.3, mx + 0.3, 0.02, 0.04, mz + 4.25, mz + 4.35, GOLD);
    })();
    (function facade() {
      var s = B('Z1', 'stone'), w = B('Z1', 'paint'), gd = B('Z1', 'gold');
      var FZ = E.z1;   // 안쪽 면 z 186, 두께 2
      // 정면 벽(문 구멍: 반폭 3, 시작 7.5, 꼭대기 10.5)
      archWall(s, 0, FZ + 1, 1, 0, 10, 34, 2, 3, 7.5, 10.5, STONE, 10);
      // 정면 박공(위 삼각)
      s.addTris([-10, 34, FZ + 2.01, 10, 34, FZ + 2.01, 0, 42, FZ + 2.01], STONE, [0, 36, FZ + 10]);
      // 쌍탑(가늘게): 몸통 + 종루 + 첨탑
      [-1, 1].forEach(function (sg) {
        var cx = sg * 14;
        boxA(s, cx - 4, cx + 4, 0, 46, FZ - 2, FZ + 6, STONE);
        boxA(s, cx - 3.2, cx + 3.2, 46, 56, FZ - 1.2, FZ + 5.2, STONE_W);
        for (var k = -1; k <= 1; k += 2) boxA(w, cx + k * 1.4 - 0.6, cx + k * 1.4 + 0.6, 48, 54, FZ + 5.21, FZ + 5.25, 0x2a2430);
        s.add(Geo.cyl(8, 0.02), STONE_D, { x: cx, y: 56, z: FZ + 2, sx: 4.2, sy: 14, sz: 4.2, flat: true, vary: 0.02 });
        gd.add(Geo.box(), GOLD, { x: cx, y: 70, z: FZ + 2, sx: 0.18, sy: 2.2, sz: 0.18, vary: 0 });
        gd.add(Geo.box(), GOLD, { x: cx, y: 71.2, z: FZ + 2, sx: 1.1, sy: 0.18, sz: 0.18, vary: 0 });
        // 옆 문(닫힌 나무 문, 장식)
        boxA(w, cx - 1.5, cx + 1.5, 0, 6, FZ + 6.0, FZ + 6.15, WOOD);
        archRing(gd, cx, FZ + 6.2, 1, 0, 1.6, 6, 7.6, 0, 0.18, GOLD, 8);
      });
      ctx.addCollider({ x0: -PZ.x, x1: -3, z0: FZ - 0.2, z1: FZ + 6.3 }); ctx.addCollider({ x0: 3, x1: PZ.x, z0: FZ - 0.2, z1: FZ + 6.3 });
      // 가운데 문틀(금 띠) + 열린 문짝 둘
      archRing(gd, 0, FZ + 2.02, 1, 0, 3.1, 7.5, 10.6, 0, 0.22, GOLD, 10);
      archRing(gd, 0, FZ - 0.02, 1, 0, 3.1, 7.5, 10.6, 0, 0.22, GOLD, 10);
      [-1, 1].forEach(function (sg) { w.add(Geo.box(), WOOD, { x: sg * 3.9, y: 0, z: FZ - 1.4, sx: 3.0, sy: 7.4, sz: 0.16, ry: sg * 1.25, vary: 0.02 }); ctx.addCollider({ x0: sg > 0 ? 3 : -4.4, x1: sg > 0 ? 4.4 : -3, z0: FZ - 2.9, z1: FZ }); });
      // 바깥 꾸밈(참고 exterior_facade): 가운데 문 겹 아치(돌 몰딩 셋 + 문설주 가는 기둥), 장미창 돌 테, 왕의 회랑(막힌 아치 줄), 띠돌림·처마·박공 금 테,
      // 탑 앞면 띠돌림과 막힌 쌍 랜싯
      var OZ = FZ + 2;
      [[3.45, 11.0, 0.12], [3.85, 11.6, 0.3], [4.25, 12.2, 0.48]].forEach(function (r) { archRing(s, 0, OZ + r[2], 1, 0, r[0], 7.5, r[1], 0, 0.36, STONE_W, 10); });
      [3.45, 3.85, 4.25].forEach(function (x, i) { [-1, 1].forEach(function (sg) { cylAt(s, sg * x, OZ + 0.12 + i * 0.18, 0, 7.5, 0.15, 0.15, 6, STONE_W); cylAt(gd, sg * x, OZ + 0.12 + i * 0.18, 7.1, 0.4, 0.17, 0.26, 6, GOLD); }); });
      for (var k = 0; k < 32; k++) { var ra0 = k / 32 * Math.PI * 2, ra1 = (k + 1) / 32 * Math.PI * 2; s.addBeam([Math.cos(ra0) * 5.7, 15.5 + Math.sin(ra0) * 5.7, OZ + 0.15], [Math.cos(ra1) * 5.7, 15.5 + Math.sin(ra1) * 5.7, OZ + 0.15], 0.7, 0.35, STONE_W); }
      [[-10, -4.6], [4.6, 10]].forEach(function (xr) { trims('Z1', xr[0], OZ, xr[1], OZ, 0, 1, {}); });
      trims('Z1', -10, OZ, 10, OZ, 0, 1, { plinth: false, string: 21.0, cornice: 34 });
      arcadeRow('Z1', -9.8, OZ, 9.8, OZ, 0, 1, 8, 21.7, 24.2, 25.6);
      gd.addBeam([-10.2, 34.2, OZ + 0.1], [0, 42.4, OZ + 0.1], 0.3, 0.25, GOLD); gd.addBeam([0, 42.4, OZ + 0.1], [10.2, 34.2, OZ + 0.1], 0.3, 0.25, GOLD);
      cylAt(gd, 0, OZ - 0.4, 42.2, 1.6, 0.12, 0.12, 6, GOLD);
      [-1, 1].forEach(function (sg) {
        var cx = sg * 14, TZ = FZ + 6;
        trims('Z1', cx - 4, TZ, cx - 1.7, TZ, 0, 1, { string: 21.0, cornice: 34 }); trims('Z1', cx + 1.7, TZ, cx + 4, TZ, 0, 1, { string: 21.0, cornice: 34 });
        trims('Z1', cx - 1.7, TZ, cx + 1.7, TZ, 0, 1, { plinth: false, string: 21.0, cornice: 34 });
        arcadeRow('Z1', cx - 3.6, TZ, cx + 3.6, TZ, 0, 1, 2, 24.0, 30.5, 32.6);
        arcadeRow('Z1', cx - 3.6, TZ, cx + 3.6, TZ, 0, 1, 3, 36.0, 40.5, 42.0);
      });
    })();
    var entryNiches = [];
    // 스캔 성상(LOD)은 ctx.root 에 붙는다 — 구역 묶음으로 옮겨 그 구역이 안 보일 때 함께 숨긴다(먼 구역의 원거리 LOD 도 그리지 않게)
    function toZone(zone, fn) {
      var r = ctx.root, n0 = r ? r.children.length : 0;
      fn();
      if (!r) return;
      r.children.slice(n0).filter(function (o) { return o.userData && o.userData.scan3d; }).forEach(function (o) { Z[zone].group.add(o); });
    }
    (function entryHall() {
      var s = B('Z1', 'stone'), f = B('Z1', 'floor'), p = B('Z1', 'paint'), gd = B('Z1', 'gold');
      var H = E.wallH, h = E.half, cz = (E.crossZ0 + E.crossZ1) / 2, ch = (E.crossZ1 - E.crossZ0) / 2;
      // 바닥(참고 c6): 크림·회청 대리석 바둑판 + 벽 따라 붉은 대리석 띠, 교차부는 큰 칸
      var entryFloor = function (cx2, cz2, i, j) {
        var inCross = cz2 > E.crossZ0 && cz2 < E.crossZ1, edge = inCross ? (cz2 < E.crossZ0 + 0.9 || cz2 > E.crossZ1 - 0.9 || Math.abs(cx2) > E.crossHalf - 0.9) : Math.abs(cx2) > h - 0.9;
        if (edge) return M_RED;
        if (inCross && Math.abs(cx2) < h) return Math.hypot(cx2, cz2 - 159) < 4.5 ? M_CREAM : ((i + j) % 2 ? M_GREY : M_CREAM);
        return (i + j) % 2 ? M_GREY : M_CREAM;
      };
      floorTiles(f, -h, h, E.crossZ1, E.z1, 1.5, entryFloor); floorTiles(f, -h, h, E.z0, E.crossZ0, 1.6, entryFloor);
      floorTiles(f, -E.crossHalf, E.crossHalf, E.crossZ0, E.crossZ1, 1.5, entryFloor);
      // 벽(두께 1, 선이 두께 가운데)
      [-1, 1].forEach(function (sg) {
        boxA(s, sg * h, sg * (h + 1), 0, H, E.crossZ1, E.z1, STONE);
        boxA(s, sg * h, sg * (h + 1), 0, H, E.z0, E.crossZ0, STONE);
        boxA(s, sg * h, sg * (E.crossHalf + 1), 0, H, E.crossZ1, E.crossZ1 + 1, STONE);
        boxA(s, sg * h, sg * (E.crossHalf + 1), 0, H, E.crossZ0 - 1, E.crossZ0, STONE);
        boxA(s, sg * E.crossHalf, sg * (E.crossHalf + 1), 0, H + E.rise + 1, E.crossZ0 - 1, E.crossZ1 + 1, STONE);
        ctx.addCollider({ x0: sg > 0 ? h : -h - 1, x1: sg > 0 ? h + 1 : -h, z0: E.crossZ1, z1: E.z1 });
        ctx.addCollider({ x0: sg > 0 ? h : -h - 1, x1: sg > 0 ? h + 1 : -h, z0: E.z0 - 1, z1: E.crossZ0 });
        ctx.addCollider({ x0: sg > 0 ? h : -E.crossHalf - 1, x1: sg > 0 ? E.crossHalf + 1 : -h, z0: E.crossZ1, z1: E.crossZ1 + 1 });
        ctx.addCollider({ x0: sg > 0 ? h : -E.crossHalf - 1, x1: sg > 0 ? E.crossHalf + 1 : -h, z0: E.crossZ0 - 1, z1: E.crossZ0 });
        ctx.addCollider({ x0: sg > 0 ? E.crossHalf : -E.crossHalf - 1, x1: sg > 0 ? E.crossHalf + 1 : -E.crossHalf, z0: E.crossZ0 - 1, z1: E.crossZ1 + 1 });
        // 사도 벽감 12(가로대 양쪽 팔의 벽: 각 팔 6, 참고 c6). 별 궁륭 판 + 금 테 + 돌 닫집, 받침 위 성상(있는 스캔만) 또는 돌 방패
        for (var k = 0; k < 3; k++) {
          var nx2 = sg * (h + 4 + k * 6.3);
          [[E.crossZ1, -1], [E.crossZ0, 1]].forEach(function (wz) {
            var zz = wz[0], n = wz[1];
            blindArch('Z1', nx2, zz, 1, 0, 0, n, 1.1, 1.1, 4.4, 5.9);
            boxA(s, nx2 - 0.8, nx2 + 0.8, 0, 1.1, zz + n * 0.5 - 0.5, zz + n * 0.5 + 0.5, STONE_D);
            boxA(gd, nx2 - 0.84, nx2 + 0.84, 1.06, 1.12, zz + n * 0.52 - 0.52, zz + n * 0.52 + 0.52, GOLD);
            // 닫집(작은 박공 + 꼭지): 아치 위
            s.addTris([nx2 - 1.35, 5.9, zz + n * 0.22, nx2 + 1.35, 5.9, zz + n * 0.22, nx2, 7.3, zz + n * 0.22], STONE_W, [nx2, 6.4, zz + n * 5]);
            gd.addBeam([nx2 - 1.35, 5.9, zz + n * 0.25], [nx2, 7.3, zz + n * 0.25], 0.1, 0.08, GOLD); gd.addBeam([nx2, 7.3, zz + n * 0.25], [nx2 + 1.35, 5.9, zz + n * 0.25], 0.1, 0.08, GOLD);
            [-1.35, 1.35].forEach(function (o) { gd.add(Geo.cyl(4, 0.05), GOLD, { x: nx2 + o, y: 5.6, z: zz + n * 0.2, sx: 0.14, sy: 1.4, sz: 0.14, vary: 0 }); });
            entryNiches.push({ x: nx2, z: zz + n * 0.5, n: n, sg: sg, k: k });
          });
        }
        // 벽 꾸밈: 세로 팔 긴 벽(붙은 기둥 + 띠돌림 + 처마), 가로대 끝벽, 가로대 옆벽(벽감 사이 기둥)
        var nIn = -sg;
        trims('Z1', sg * h, E.crossZ1, sg * h, E.z1, nIn, 0, { string: 6.8, cornice: H, shafts: [4.5, 9, 13.5], shaftTop: H - 0.6 });
        trims('Z1', sg * h, E.z0, sg * h, E.crossZ0, nIn, 0, { string: 6.8, cornice: H, shafts: [4], shaftTop: H - 0.6 });
        trims('Z1', sg * E.crossHalf, E.crossZ0, sg * E.crossHalf, E.crossZ1, nIn, 0, { string: 6.8, cornice: H, shafts: [4.5, 13.5], shaftTop: H - 0.6 });
        blindArch('Z1', sg * (E.crossHalf - 0.02), (E.crossZ0 + E.crossZ1) / 2, 0, 1, nIn, 0, 2.2, 0.62, 4.8, 6.6);
        arcadeRow('Z1', sg * h, E.crossZ1 + 0.4, sg * h, E.z1 - 0.4, nIn, 0, 6, 9.6, 12.4, 13.8);
        // 아래층: 붙은 기둥 사이 막힌 아치(돌 판) — 세로 팔 긴 벽(참고 c6 의 아래 벽 아케이드)
        [[E.crossZ1 + 0.3, E.crossZ1 + 4.3], [E.crossZ1 + 4.8, E.crossZ1 + 8.8], [E.crossZ1 + 9.3, E.crossZ1 + 13.3], [E.crossZ1 + 13.8, E.z1 - 0.3]].forEach(function (zr) { arcadeRow('Z1', sg * h, zr[0], sg * h, zr[1], nIn, 0, 1, 0.62, 4.6, 6.2); });
        arcadeRow('Z1', sg * E.crossHalf, E.crossZ0 + 0.4, sg * E.crossHalf, E.crossZ1 - 0.4, nIn, 0, 5, 9.6, 12.4, 13.8);
        [[E.crossZ1, -1], [E.crossZ0, 1]].forEach(function (wz) { arcadeRow('Z1', sg * (h + 0.4), wz[0], sg * (E.crossHalf - 0.4), wz[0], 0, wz[1], 7, 9.6, 12.4, 13.8); });
        [[E.crossZ1, -1], [E.crossZ0, 1]].forEach(function (wz) {
          trims('Z1', sg * h, wz[0], sg * E.crossHalf, wz[0], 0, wz[1], { plinth: false, string: 6.8, cornice: H, shafts: [3.6, 9.9, 16.2], shaftTop: H - 0.6 });
        });
      });
      [[-h, -3.4], [3.4, h]].forEach(function (xr) { trims('Z1', xr[0], E.z1, xr[1], E.z1, 0, -1, { string: 6.8, cornice: H }); trims('Z1', xr[0] < 0 ? -h : 4.4, E.z0, xr[0] < 0 ? -4.4 : h, E.z0, 0, 1, { cornice: H }); });
      // 뒷벽(구슬 회랑 쪽, 가운데 통로 반폭 4 · 높이 10)
      archWall(s, 0, E.z0 - 0.5, 1, 0, h + 1, H + E.rise + 1, 1, 4, 7.4, 10, STONE, 8);
      ctx.addCollider({ x0: -h - 1, x1: -4, z0: E.z0 - 1, z1: E.z0 }); ctx.addCollider({ x0: 4, x1: h + 1, z0: E.z0 - 1, z1: E.z0 });
      // 궁륭: 세로 팔·가로대 원통(뾰족) + 교차부 교차 궁륭(두 원통 중 높은 쪽)
      var VB = function (u) { return H + archY(u, h, E.rise); };
      p = B('Z1', 'star');   // 궁륭 칸 = 별 궁륭(참고 c6)
      ceilGrid(p, 10, 6, function (u, v) { var x = -h + 2 * h * u, z = E.crossZ1 + (E.z1 - E.crossZ1) * v; return [x, VB(x), z]; }, STARV);
      ceilGrid(p, 10, 3, function (u, v) { var x = -h + 2 * h * u, z = E.z0 + (E.crossZ0 - E.z0) * v; return [x, VB(x), z]; }, STARV);
      [-1, 1].forEach(function (sg) {
        ceilGrid(p, 6, 10, function (u, v) { var x = sg * (h + (E.crossHalf - h) * u), z = E.crossZ0 + 2 * ch * v; return [x, VB(z - cz), z]; }, STARV, false);
      });
      ceilGrid(p, 12, 12, function (u, v) { var x = -h + 2 * h * u, z = E.crossZ0 + 2 * ch * v; return [x, Math.max(VB(x), VB(z - cz)), z]; }, STARV);
      // 교차부 대각 리브(금)
      for (var k = 0; k < 12; k++) {
        var t0 = -1 + k / 6, t1 = -1 + (k + 1) / 6;
        [1, -1].forEach(function (d) {
          gd.addBeam([t0 * h, VB(t0 * h) - 0.15, cz + d * t0 * h], [t1 * h, VB(t1 * h) - 0.15, cz + d * t1 * h], 0.35, 0.3, GOLD);
        });
      }
      // 가로 띠 리브(금): 세로 팔·가로대 원통 궁륭을 가로지른다
      function ribX(z) { for (var q = 0; q < 10; q++) { var u0 = -h + 2 * h * q / 10, u1 = -h + 2 * h * (q + 1) / 10; gd.addBeam([u0, VB(u0) - 0.18, z], [u1, VB(u1) - 0.18, z], 0.4, 0.45, GOLD); } }
      function ribZ(x) { for (var q = 0; q < 10; q++) { var w0 = -ch + 2 * ch * q / 10, w1 = -ch + 2 * ch * (q + 1) / 10; gd.addBeam([x, VB(w0) - 0.18, cz + w0], [x, VB(w1) - 0.18, cz + w1], 0.4, 0.45, GOLD); } }
      [E.crossZ1 + 0.2, 177, E.z1 - 0.3, E.crossZ0 - 0.2, E.z0 + 0.3].forEach(ribX);
      [-1, 1].forEach(function (sg) { ribZ(sg * (h + 0.2)); ribZ(sg * 19.5); ribZ(sg * (E.crossHalf - 0.3)); });
      for (k = 0; k < 24; k++) { var r0 = k / 24 * Math.PI * 2, r1 = (k + 1) / 24 * Math.PI * 2; gd.addBeam([Math.cos(r0) * 1.4, H + E.rise - 0.1, cz + Math.sin(r0) * 1.4], [Math.cos(r1) * 1.4, H + E.rise - 0.1, cz + Math.sin(r1) * 1.4], 0.3, 0.3, GOLD); }
      // 큰 채색 십자고상(정거장 3, 참고 c6): 교차부 위에 사슬로 매단다 — 채색 목조 스캔(CC0) + 뒤의 채색 판 십자가(붉은 바탕·금 테, 그림·글자 없음).
      // 바로 아래 낮은 팔각 돌 단(걸어 들어가지 않는다)
      var CY = 4.6, CH = 5.4, czc = 157, bz = czc - CH * 0.03 - 0.06;
      for (k = 0; k < 8; k++) {
        var o0 = (k + 0.5) / 8 * Math.PI * 2, o1 = (k + 1.5) / 8 * Math.PI * 2;
        s.addQuad([Math.sin(o0) * 2.3, 0.45, czc + Math.cos(o0) * 2.3], [Math.sin(o1) * 2.3, 0.45, czc + Math.cos(o1) * 2.3], [Math.sin(o1) * 2.3, 0, czc + Math.cos(o1) * 2.3], [Math.sin(o0) * 2.3, 0, czc + Math.cos(o0) * 2.3], STONE_W, [Math.sin(o0 + 0.39) * 9, 0.2, czc + Math.cos(o0 + 0.39) * 9]);
        s.addTris([0, 0.45, czc, Math.sin(o0) * 2.3, 0.45, czc + Math.cos(o0) * 2.3, Math.sin(o1) * 2.3, 0.45, czc + Math.cos(o1) * 2.3], STONE_W, [0, 5, czc]);
        gd.addBeam([Math.sin(o0) * 2.32, 0.46, czc + Math.cos(o0) * 2.32], [Math.sin(o1) * 2.32, 0.46, czc + Math.cos(o1) * 2.32], 0.05, 0.06, GOLD);
      }
      ctx.addCollider({ x: 0, z: czc, r: 2.5 });
      toZone('Z1', function () { ctx.crucifix({ x: 0, y: CY, z: czc, h: CH, ry: 0, scan: true }); });
      (function board() {
        var cb = B('Z1', 'paint'), RED = 0x8e2a2a, bw = CH * 0.085, ay = CY + CH * 0.79, aw = CH * 0.4, ah = CH * 0.075, t = 0.08;
        [[0.0, RED, 0], [0.07, GOLD, -t]].forEach(function (L) {
          var e = L[0], col = L[1], dz = L[2], bb = col === GOLD ? gd : cb;
          boxA(bb, -bw - e, bw + e, CY - 0.25 - e, CY + CH + 0.1 + e, bz - t + dz, bz + dz, col);
          boxA(bb, -aw - e, aw + e, ay - ah - e, ay + ah + e, bz - t + dz, bz + dz, col);
          [[-aw, ay], [aw, ay], [0, CY + CH + 0.1]].forEach(function (q) { boxA(bb, q[0] - 0.42 - e, q[0] + 0.42 + e, q[1] - 0.42 - e, q[1] + 0.42 + e, bz - t + dz, bz + dz, col); });
        });
        // 사슬 넷: 가로대 끝·꼭대기에서 교차부 궁륭 꼭대기로
        [[-aw, ay + 0.4], [aw, ay + 0.4]].forEach(function (q) { gd.addBeam([q[0], q[1], bz - 0.1], [q[0] * 0.25, H + E.rise - 0.3, czc], 0.05, 0.05, 0x5c4a2e); });
        gd.addBeam([0, CY + CH + 0.5, bz - 0.1], [0, H + E.rise - 0.3, czc], 0.06, 0.06, 0x5c4a2e);
      })();
      // 성수반(정거장 5)
      ctx.holyFont({ x: 5, z: 178.3, ry: 0 });
      // 사도상(있는 실물 스캔만, 참고 c6): 입구에서 정면으로 보이는 가로대 앞벽(z 150, +z 를 바라봄) 안쪽 두 칸씩 — 베드로·바오로·유다 타대오·앉은 사도.
      // 나머지 여덟 칸은 빈 벽감에 돌 방패(문양·글자 없음). 남이 만든 AI 3D 는 쓰지 않는다
      var APOSTLES = { '-1,0,1': { key: 'st_peter', h: 2.45 }, '1,0,1': { key: 'st_paul', h: 2.45 }, '-1,1,1': { key: 'st_jude', h: 2.3 }, '1,1,1': { key: 'apostle_clay', h: 1.75 } };
      entryNiches.forEach(function (nn) {
        var a = APOSTLES[nn.sg + ',' + nn.k + ',' + nn.n];
        if (a) { toZone('Z1', function () { ctx.scan({ key: a.key, x: nn.x, y: 1.12, z: nn.z, ry: nn.n > 0 ? 0 : Math.PI, h: a.h, lodFar: 9 }, null); }); return; }
        var zf = nn.z - nn.n * 0.5 + nn.n * 0.06, sh = [[-0.55, 3.6], [0.55, 3.6], [0.55, 2.7], [0, 2.1], [-0.55, 2.7]];
        s.addTris([nn.x + sh[0][0], sh[0][1], zf, nn.x + sh[1][0], sh[1][1], zf, nn.x + sh[2][0], sh[2][1], zf, nn.x + sh[0][0], sh[0][1], zf, nn.x + sh[2][0], sh[2][1], zf, nn.x + sh[4][0], sh[4][1], zf, nn.x + sh[4][0], sh[4][1], zf, nn.x + sh[2][0], sh[2][1], zf, nn.x + sh[3][0], sh[3][1], zf], STONE_W, [nn.x, 3, zf + nn.n * 5]);
        for (var q = 0; q < 5; q++) { var A0 = sh[q], A1 = sh[(q + 1) % 5]; gd.addBeam([nn.x + A0[0], A0[1], zf + nn.n * 0.02], [nn.x + A1[0], A1[1], zf + nn.n * 0.02], 0.07, 0.05, GOLD); }
      });
    })();
    // 장미창(정면, 지름 10 m): 안쪽 면과 바깥 면에 하나씩(바깥은 거울상 UV — 밖에서 봐도 바로 보인다)
    var rose = { r: 5, y: 15.5, z: E.z1 };
    var roseIn = new T.Mesh(new T.CircleGeometry(rose.r, 48), glassMat(canvasTex(256, 256, placeholderPane('joyful', 5))));
    place(roseIn, 0, rose.y, E.z1 - 0.03, Math.PI); Z.Z1.group.add(roseIn);
    var roseOutGeo = new T.CircleGeometry(rose.r, 48), ruv = roseOutGeo.attributes.uv;
    for (var ri = 0; ri < ruv.count; ri++) ruv.setX(ri, 1 - ruv.getX(ri));
    var roseOut = new T.Mesh(roseOutGeo, new T.MeshBasicMaterial({ color: 0x9b93a8, map: roseIn.material.map, fog: true }));
    place(roseOut, 0, rose.y, E.z1 + 2.03, 0); Z.Z1.group.add(roseOut);
    (function roseFrame() {
      var gd = B('Z1', 'gold');
      [E.z1 - 0.05, E.z1 + 2.05].forEach(function (zz) {
        for (var k = 0; k < 40; k++) { var a0 = k / 40 * Math.PI * 2, a1 = (k + 1) / 40 * Math.PI * 2; gd.addBeam([Math.cos(a0) * 5.15, rose.y + Math.sin(a0) * 5.15, zz], [Math.cos(a1) * 5.15, rose.y + Math.sin(a1) * 5.15, zz], 0.3, 0.15, GOLD); }
      });
    })();

    // =====================================================================
    // Z2 구슬 회랑: 주님의 기도(큰 방) · 믿음 · 희망 · 사랑(작은 방 셋) · 영광송(큰 방) — 돛 궁륭 + 모자이크 자리
    // =====================================================================
    var ROOMS = [
      { key: 'pater', z0: 125.5, z1: 141, half: 8, H: 14, rise: 7 },
      { key: 'faith', z0: 115, z1: 123, half: 5, H: 12, rise: 4 },
      { key: 'hope', z0: 107, z1: 115, half: 5, H: 12, rise: 4 },
      { key: 'charity', z0: 99, z1: 107, half: 5, H: 12, rise: 4 },
      { key: 'gloria', z0: 80.5, z1: 96, half: 8, H: 14, rise: 7 }
    ];
    var mosaicMeshes = {};
    (function gallery() {
      var s = B('Z2', 'stone'), f = B('Z2', 'floor'), p = B('Z2', 'star'), gd = B('Z2', 'gold');
      // 바닥: 가운데 회청 띠 + 양옆 붉은 줄, 방마다 가운데 둥근 무늬(모자이크 원판 바로 아래) — 크림 바둑판
      floorTiles(f, -8, 8, 80, 141, 1.0, function (x, z, i, j) {
        var ax = Math.abs(x);
        if (ax > 2.0 && ax < 2.6) return M_RED;
        if (ax <= 2.0) return (i + j) % 2 ? M_BLUE : M_GREY;
        return (i + j) % 2 ? M_GREY : M_CREAM;
      });
      ROOMS.forEach(function (R) {
        var cz = (R.z0 + R.z1) / 2, hz = (R.z1 - R.z0) / 2;
        [-1, 1].forEach(function (sg) {
          boxA(s, sg * R.half, sg * (R.half + 1), 0, R.H, R.z0, R.z1, STONE);
          ctx.addCollider({ x0: sg > 0 ? R.half : -R.half - 1, x1: sg > 0 ? R.half + 1 : -R.half, z0: R.z0, z1: R.z1 });
        });
        // 돛 궁륭(네 벽에서 시작해 가운데가 오른다): 별 궁륭 + 대각·테두리 금 리브
        var SV = function (x, z) { var ex = x / R.half, ez = (z - cz) / hz; return R.H + R.rise * (1 - ex * ex) * (1 - ez * ez); };
        ceilGrid(p, 10, 10, function (u, v) {
          var x = -R.half + 2 * R.half * u, z = R.z0 + 2 * hz * v;
          return [x, SV(x, z), z];
        }, STARV);
        for (var q = 0; q < 10; q++) {
          var t0 = -1 + q / 5, t1 = -1 + (q + 1) / 5;
          [1, -1].forEach(function (d) { gd.addBeam([t0 * R.half, SV(t0 * R.half, cz + d * t0 * hz) - 0.15, cz + d * t0 * hz], [t1 * R.half, SV(t1 * R.half, cz + d * t1 * hz) - 0.15, cz + d * t1 * hz], 0.28, 0.3, GOLD); });
        }
        // 벽 꾸밈: 굽도리 · 띠돌림 · 처마, 모서리 붙은 기둥, 막힌 아케이드(큰 방 셋 · 작은 방 하나)
        [-1, 1].forEach(function (sg) {
          var wx = sg * R.half, nIn = -sg, len = R.z1 - R.z0;
          trims('Z2', wx, R.z0, wx, R.z1, nIn, 0, { string: 7.2, cornice: R.H, shafts: [0.45, len - 0.45], shaftTop: R.H - 0.5 });
          var nA = R.half > 6 ? 3 : 1, w = (len - 1.4) / nA;
          for (var a = 0; a < nA; a++) blindArch('Z2', wx, R.z0 + 0.7 + w * (a + 0.5), 0, 1, nIn, 0, Math.min(1.9, w / 2 - 0.35), 0.62, 4.6, 6.6);
        });
        // 가운데 모자이크 원판(자리: 그림은 light/gpack_light.js 의 mosaic_<key> 가 있으면 그것)
        var rr = R.half * 0.42;
        var mm = new T.Mesh(new T.CircleGeometry(rr, 36), new T.MeshStandardMaterial({ map: mosaicTex(R.key), roughness: 0.45, metalness: 0.35, emissive: 0x5a4210, emissiveIntensity: 0.25 }));
        mm.rotation.x = Math.PI / 2; mm.position.set(0, R.H + R.rise - 0.25, cz); Z.Z2.group.add(mm);
        mosaicMeshes['mosaic_' + R.key] = mm;
        for (var k = 0; k < 36; k++) { var a0 = k / 36 * Math.PI * 2, a1 = (k + 1) / 36 * Math.PI * 2; gd.addBeam([Math.cos(a0) * (rr + 0.12), R.H + R.rise - 0.3, cz + Math.sin(a0) * (rr + 0.12)], [Math.cos(a1) * (rr + 0.12), R.H + R.rise - 0.3, cz + Math.sin(a1) * (rr + 0.12)], 0.22, 0.12, GOLD); }
        // 방 끝벽(통로 반폭 4 쪽은 아치)
        [R.z0, R.z1].forEach(function (zz) {
          if (zz === 141 || zz === 80.5) return;
          if (R.half > 4.5) { archWall(s, 0, zz, 1, 0, R.half + 1, R.H + R.rise, 1, 4, 7.4, 10, STONE, 8); ctx.addCollider({ x0: -R.half - 1, x1: -4, z0: zz - 0.5, z1: zz + 0.5 }); ctx.addCollider({ x0: 4, x1: R.half + 1, z0: zz - 0.5, z1: zz + 0.5 }); }
          else archRing(gd, 0, zz, 1, 0, R.half, R.H - 0.6, R.H + 0.2, 0, 0.35, GOLD, 8);
        });
      });
      // 작은 방 묶음의 양 끝벽(반폭 5 → 통로 4)
      [123, 99].forEach(function (zz) { archWall(s, 0, zz, 1, 0, 6, 16, 1, 4, 7.4, 10, STONE, 8); ctx.addCollider({ x0: -6, x1: -4, z0: zz - 0.5, z1: zz + 0.5 }); ctx.addCollider({ x0: 4, x1: 6, z0: zz - 0.5, z1: zz + 0.5 }); });
      // 잇는 통로(반폭 4, 높이 10 + 원통)
      [[123.5, 125.5], [96, 98.5]].forEach(function (c) {
        [-1, 1].forEach(function (sg) { boxA(s, sg * 4, sg * 5, 0, 10, c[0], c[1], STONE); ctx.addCollider({ x0: sg > 0 ? 4 : -5, x1: sg > 0 ? 5 : -4, z0: c[0], z1: c[1] }); });
        ceilGrid(p, 6, 2, function (u, v) { var x = -4 + 8 * u; return [x, 7.4 + archY(x, 4, 2.6), c[0] + (c[1] - c[0]) * v]; }, STARV);
      });
      // 영광송 방 남쪽 끝(메달 홀 쪽) 벽
      archWall(s, 0, 80, 1, 0, 9, 21, 1, 4, 7.4, 10, STONE, 8);
      ctx.addCollider({ x0: -9, x1: -4, z0: 79.5, z1: 80.5 }); ctx.addCollider({ x0: 4, x1: 9, z0: 79.5, z1: 80.5 });
    })();

    // =====================================================================
    // Z3 메달 홀(성모 경당): 둥근 방(반지름 11.5), 파란 별 돔. 성모상은 shrine_places.js(light) 가 모신다
    // =====================================================================
    var M = PLAN.MEDAL, medalMesh = null;
    (function medal() {
      var s = B('Z3', 'stone'), f = B('Z3', 'floor'), p = B('Z3', 'paint'), gd = B('Z3', 'gold');
      var N = 32, Rw = M.r + 0.5, H = 14, k;
      // 바닥(참고 c7): 가운데 메달 원판(열두 별·장미·백합 — 사용자 그림 light/medal_floor.webp, 개발용 빌드만; 없으면 같은 배치의 단순 무늬) +
      // 붉은 대리석 고리 + 크림·회청 부채꼴 띠. 원판 자리(반지름 5.4)는 바닥 판을 비운다(겹쳐 깜박이지 않게)
      var MR = 5.4, FS = 48;
      for (k = 0; k < FS; k++) {
        var f0 = k / FS * Math.PI * 2, f1 = (k + 1) / FS * Math.PI * 2;
        [[MR - 0.04, 6.0, M_RED], [6.0, 8.8, k % 2 ? M_GREY : M_CREAM], [8.8, 9.2, M_GOLD], [9.2, 12.2, k % 2 ? M_CREAM : M_GREY]].forEach(function (rg) {
          f.addQuad([Math.sin(f0) * rg[0], 0, M.cz + Math.cos(f0) * rg[0]], [Math.sin(f1) * rg[0], 0, M.cz + Math.cos(f1) * rg[0]], [Math.sin(f1) * rg[1], 0, M.cz + Math.cos(f1) * rg[1]], [Math.sin(f0) * rg[1], 0, M.cz + Math.cos(f0) * rg[1]], rg[2], [0, 5, M.cz], { vary: 0.01 });
        });
      }
      var medalCanvas = canvasTex(256, 256, function (g, w, h) {
        g.fillStyle = '#e9e2d6'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#9b2f36'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.49, 0, 7); g.fill();
        g.fillStyle = '#efe6d2'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.45, 0, 7); g.fill();
        g.fillStyle = '#20357c'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.31, 0, 7); g.fill();
        for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2, x = w / 2 + Math.cos(a) * w * 0.25, y = h / 2 + Math.sin(a) * w * 0.25; g.fillStyle = '#e8c25c'; g.beginPath(); for (var q = 0; q < 10; q++) { var b = q * Math.PI / 5 - Math.PI / 2, rr = q % 2 ? 4 : 9; g.lineTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr); } g.closePath(); g.fill(); }
      });
      medalMesh = new T.Mesh(new T.CircleGeometry(MR, 64), new T.MeshStandardMaterial({ map: medalCanvas, roughness: 0.32, metalness: 0, envMapIntensity: 0.3 }));
      medalMesh.rotation.x = -Math.PI / 2; medalMesh.position.set(0, 0.002, M.cz); medalMesh.receiveShadow = true; medalMesh.name = 'light_medal_floor';
      Z.Z3.group.add(medalMesh); ctx.stats.meshes++;
      // 금빛 고딕 벽감(참고 c_medal_hall_madonna): 북벽(x −11.5) 가운데, 받침 턱 0.95 m 위에 성모자상(shrine_places light — 실물 스캔).
      // 별 궁륭 판 + 금 아치 · 금 기둥 둘 · 첨탑 · 금 박공(안은 별 판) · 꽃병 둘(장미·백합)
      (function niche() {
        var NX = -11.36, ZC = M.cz, st = B('Z3', 'star'), y0 = 0.95, sp = 3.65, ap = 4.95;
        boxA(s, -11.5, -10.3, 0, y0, ZC - 1.35, ZC + 1.35, STONE_W);
        boxA(gd, -10.3, -10.24, y0 - 0.07, y0 + 0.005, ZC - 1.4, ZC + 1.4, GOLD);   // 턱 앞 금 띠(윗면과 겹치지 않게 앞에만)
        boxA(gd, -10.3, -10.27, 0.2, 0.75, ZC - 1.1, ZC + 1.1, 0xb8903f);
        ctx.addCollider({ x0: -11.6, x1: -10.15, z0: ZC - 1.5, z1: ZC + 1.5 });
        blindArch('Z3', NX, ZC, 0, 1, 1, 0, 1.15, y0, sp, ap);
        [-1, 1].forEach(function (sd) {
          var zz = ZC + sd * 1.42;
          boxA(gd, -11.42, -10.98, 0, 5.25, zz - 0.17, zz + 0.17, GOLD);
          boxA(gd, -11.0, -10.94, 0.3, 5.1, zz - 0.07, zz + 0.07, 0xf0cf72);
          gd.add(Geo.cyl(4, 0.02), GOLD, { x: -11.2, y: 5.25, z: zz, sx: 0.24, sy: 1.9, sz: 0.24, ry: Math.PI / 4, vary: 0 });
          gd.add(Geo.sph(6, 4), 0xf0cf72, { x: -11.2, y: 7.2, z: zz, s: 0.09, vary: 0 });
          [-0.55, 0.55].forEach(function (o) { gd.add(Geo.cyl(4, 0.02), GOLD, { x: -11.15, y: 4.9, z: zz + o * sd * -1, sx: 0.1, sy: 0.9, sz: 0.1, ry: Math.PI / 4, vary: 0 }); });
        });
        var gx = -10.96;
        gd.addTris([gx, ap - 0.1, ZC - 1.6, gx, ap - 0.1, ZC + 1.6, gx, 6.9, ZC], GOLD, [gx + 5, 5.6, ZC]);
        st.addTris([gx + 0.02, ap + 0.05, ZC - 1.05, gx + 0.02, ap + 0.05, ZC + 1.05, gx + 0.02, 6.35, ZC], STARV, [gx + 5, 5.6, ZC]);
        gd.addBeam([gx + 0.04, ap - 0.1, ZC - 1.6], [gx + 0.04, 6.9, ZC], 0.12, 0.1, 0xf0cf72); gd.addBeam([gx + 0.04, 6.9, ZC], [gx + 0.04, ap - 0.1, ZC + 1.6], 0.12, 0.1, 0xf0cf72);
        gd.add(Geo.cyl(4, 0.02), GOLD, { x: -11.0, y: 6.8, z: ZC, sx: 0.16, sy: 1.3, sz: 0.16, ry: Math.PI / 4, vary: 0 });
        // 꽃병 둘(금) + 장미(붉은·흰)와 백합 — 성상 양옆 턱 위
        var fl = B('Z3', 'paint'), fr = ctx.rng(33);
        [-1, 1].forEach(function (sd) {
          var vz = ZC + sd * 0.88, vx = -10.7;
          cylAt(gd, vx, vz, y0, 0.32, 0.1, 0.15, 10, GOLD);
          for (var q = 0; q < 14; q++) {
            var a = fr() * Math.PI * 2, rr = 0.05 + fr() * 0.17, yy = y0 + 0.42 + fr() * 0.36;
            var col = q < 3 ? 0x3d6b33 : (q % 3 === 0 ? 0xf3efe2 : 0xa8222e);
            fl.add(Geo.sph(6, 4), col, { x: vx + Math.cos(a) * rr * 0.7, y: yy, z: vz + Math.sin(a) * rr, s: q < 3 ? 0.06 : 0.075, vary: 0.05 });
          }
          [0, 1].forEach(function (q) { fl.add(Geo.cyl(5, 1.6), 0xf6f3ea, { x: vx + 0.03, y: y0 + 0.75 + q * 0.08, z: vz + (q ? 0.08 : -0.07), sx: 0.05, sy: 0.16, sz: 0.05, vary: 0 }); });
        });
        // 봉헌초 받침 둘(층층 쇠 선반 — 칸은 layout.candles, 초는 코어가 그린다)
        medalStands.forEach(function (sd2) {
          var IRON = 0x2a2522;
          for (var r = 0; r < 3; r++) boxA(fl, sd2.x - 0.14 - r * 0.24, sd2.x + 0.14 - r * 0.24, sd2.y0 + r * 0.26 - 0.06, sd2.y0 + r * 0.26 - 0.02, sd2.z - 0.52, sd2.z + 0.52, IRON);
          [-0.5, 0.5].forEach(function (o) { boxA(fl, sd2.x - 0.66, sd2.x + 0.12, 0, 0.04, sd2.z + o - 0.03, sd2.z + o + 0.03, IRON); boxA(fl, sd2.x - 0.04, sd2.x + 0.02, 0, sd2.y0, sd2.z + o - 0.03, sd2.z + o + 0.03, IRON); boxA(fl, sd2.x - 0.56, sd2.x - 0.5, 0, sd2.y0 + 0.52, sd2.z + o - 0.03, sd2.z + o + 0.03, IRON); });
          ctx.addCollider({ x0: sd2.x - 0.7, x1: sd2.x + 0.2, z0: sd2.z - 0.6, z1: sd2.z + 0.6 });
        });
        ctx.addGlow({ x: -11.25, y: 2.35, z: ZC, size: 2.4, color: 0xffc070, kind: 'always' });   // 성상 뒤 따뜻한 빛(얼굴을 덮지 않게 뒤에)
      })();
      for (k = 0; k < N; k++) {
        var a0 = (k / N) * Math.PI * 2, a1 = ((k + 1) / N) * Math.PI * 2, am = (a0 + a1) / 2;
        var mx = Math.sin(am) * Rw, mz = M.cz + Math.cos(am) * Rw;
        if (Math.abs(mx) < 4.6) continue;   // 북(회랑)·남(로툰다) 문
        var ax = Math.sin(a0) * Rw, az = M.cz + Math.cos(a0) * Rw, bx = Math.sin(a1) * Rw, bz = M.cz + Math.cos(a1) * Rw;
        segBox(s, ax, az, bx, bz, 0, H, 1.0, STONE);
        addSeg(ax, az, bx, bz, 0.5);
      }
      // 벽 꾸밈: 굽도리·띠돌림·처마(조각마다), 대각 네 자리에 막힌 뾰족 아케이드(별 판)
      var Rmid = Rw * Math.cos(Math.PI / N) - 0.5, Rin = Rmid / Math.cos(Math.PI / N);   // 조각 벽 안쪽 면(가운데 Rmid, 꼭짓점 Rin)
      for (k = 0; k < N; k++) {
        var c0 = (k / N) * Math.PI * 2, c1 = ((k + 1) / N) * Math.PI * 2, cm = (c0 + c1) / 2;
        if (Math.abs(Math.sin(cm) * Rw) < 4.6) continue;
        trims('Z3', Math.sin(c0) * Rin, M.cz + Math.cos(c0) * Rin, Math.sin(c1) * Rin, M.cz + Math.cos(c1) * Rin, -Math.sin(cm), -Math.cos(cm), { plinth: k !== 23 && k !== 24, string: 10.3, cornice: H });
        if (k % 8 === 4) blindArch('Z3', Math.sin(cm) * Rmid, M.cz + Math.cos(cm) * Rmid, Math.cos(cm), -Math.sin(cm), -Math.sin(cm), -Math.cos(cm), 0.95, 0.62, 5.6, 7.4);
        else if (k !== 23 && k !== 24) blindArch('Z3', Math.sin(cm) * Rmid, M.cz + Math.cos(cm) * Rmid, Math.cos(cm), -Math.sin(cm), -Math.sin(cm), -Math.cos(cm), 0.72, 0.62, 4.4, 5.5, true);
        // 위층(띠돌림 위): 조각마다 작은 막힌 아치(돌 판) — 돔 아래 벽 줄
        blindArch('Z3', Math.sin(cm) * Rmid, M.cz + Math.cos(cm) * Rmid, Math.cos(cm), -Math.sin(cm), -Math.sin(cm), -Math.cos(cm), 0.62, 10.7, 12.4, 13.3, true);
      }
      // 문 위 상인방(돔 아래 벽)
      [1, -1].forEach(function (d) { boxA(s, -4.6, 4.6, 10, H, M.cz + d * (Rw - 0.5) - 0.5, M.cz + d * (Rw - 0.5) + 0.5, STONE); archRing(gd, 0, M.cz + d * (Rw - 1.02), 1, 0, 4, 7.4, 10, 0, 0.25, GOLD, 8); });
      // 돔(반구, 안쪽): 파란 바탕 금별
      var dg = new T.SphereGeometry(M.r, low ? 24 : 36, low ? 8 : 12, 0, Math.PI * 2, 0, Math.PI / 2);
      var mt = starTex.clone(); mt.needsUpdate = true; mt.wrapS = mt.wrapT = T.RepeatWrapping; mt.repeat.set(10, 3);
      var dm = new T.Mesh(dg, new T.MeshStandardMaterial({ map: mt, roughness: 0.75, side: T.BackSide }));
      dm.position.set(0, H, M.cz); dm.castShadow = true; Z.Z3.group.add(dm);
      for (k = 0; k < 64; k++) { var b0 = k / 64 * Math.PI * 2, b1 = (k + 1) / 64 * Math.PI * 2; gd.addBeam([Math.sin(b0) * (M.r - 0.1), H, M.cz + Math.cos(b0) * (M.r - 0.1)], [Math.sin(b1) * (M.r - 0.1), H, M.cz + Math.cos(b1) * (M.r - 0.1)], 0.35, 0.3, GOLD); }
      // 로툰다 쪽 짧은 통로(서문, 반폭 4)
      [-1, 1].forEach(function (sg) { boxA(s, sg * 4, sg * 5, 0, 12, 54.4, 57.6, STONE); ctx.addCollider({ x0: sg > 0 ? 4 : -5, x1: sg > 0 ? 5 : -4, z0: 54.4, z1: 57.6 }); });
      boxA(p, -4, 4, 12, 12.3, 54.4, 57.6, 0xe0d4be);
      floorTiles(f, -4, 4, 54, 57.6, 1.0, function (x, z, i, j) { return Math.abs(x) > 3.2 ? M_RED : ((i + j) % 2 ? M_GREY : M_CREAM); });
    })();

    // =====================================================================
    // Z4 로툰다: 바닥(묵주 상감), 기둥 12, 아케이드, 주보랑 궁륭, 드럼 창 50, 돔(열두 리브 별), 등탑, 묵주 등
    // =====================================================================
    (function rotunda() {
      var s = B('Z4', 'stone'), f = B('Z4', 'floor'), p = B('Z4', 'paint'), gd = B('Z4', 'gold'), gl = B('Z4', 'glow');
      var RS = low ? 48 : 72, k, i;
      // 바닥(참고 c8 — 십자가 없는 판, 2026-11-24): 부채꼴 대리석 띠 + 반지름 28.4~28.9 청금 대리석 고리 + 가운데 여덟 갈래 별(금 넷·청 넷).
      // 밟는 바닥이므로 십자가·성화는 넣지 않는다(1단계의 늘어진 줄·십자가 상감은 뺐다)
      var RINGS = [[0, 6.6, function (kk) { return M_CREAM; }], [6.6, 7.0, function () { return M_GOLD; }], [7.0, 20, function (kk) { return kk % 2 ? M_GREY : M_CREAM; }],
        [20, 28.4, function (kk) { return kk % 2 ? M_CREAM : M_GREY; }], [28.4, 28.9, function () { return 0x4a68b0; }], [28.9, 42, function (kk) { return kk % 2 ? M_GREY : M_CREAM; }], [42, PLAN.R_BACK, function () { return MARBLE; }]];
      for (k = 0; k < RS; k++) {
        var a0 = k / RS * Math.PI * 2, a1 = (k + 1) / RS * Math.PI * 2;
        RINGS.forEach(function (rr) {
          var c = rr[2](k);
          if (rr[0] === 0) { f.addTris([0, 0, 0, Math.sin(a0) * rr[1], 0, Math.cos(a0) * rr[1], Math.sin(a1) * rr[1], 0, Math.cos(a1) * rr[1]], c, [0, 5, 0], { vary: 0.01 }); return; }
          f.addQuad([Math.sin(a0) * rr[0], 0, Math.cos(a0) * rr[0]], [Math.sin(a1) * rr[0], 0, Math.cos(a1) * rr[0]], [Math.sin(a1) * rr[1], 0, Math.cos(a1) * rr[1]], [Math.sin(a0) * rr[1], 0, Math.cos(a0) * rr[1]], c, [0, 5, 0], { vary: 0.01 });
        });
      }
      // 여덟 갈래 별(가운데): 금 넷(긴 갈래, 동서남북) 위에 청 넷(짧은 갈래, 대각) — 바닥보다 2 cm 높은 상감 판(겹쳐 깜박이지 않게 높이를 나눈다)
      var sf = B('Z4', 'floor');
      [[0, 6.2, 1.05, M_GOLD, 0.024], [45, 4.3, 0.8, 0x5574bf, 0.016]].forEach(function (S) {
        for (var q = 0; q < 4; q++) {
          var th0 = (S[0] + q * 90) * D2R, tip = [Math.sin(th0) * S[1], S[4], Math.cos(th0) * S[1]];
          [-1, 1].forEach(function (sd) {
            var ta = th0 + sd * Math.PI / 4, side = [Math.sin(ta) * S[2], S[4], Math.cos(ta) * S[2]];
            sf.addTris([0, S[4], 0, tip[0], tip[1], tip[2], side[0], side[1], side[2]], new T.Color(S[3]).multiplyScalar(sd > 0 ? 1 : 0.86), [0, 5, 0]);
          });
        }
      });
      // 바닥의 묵주(정거장 46): 반지름 27 닫힌 고리에 청동 구슬 55(작은 50 + 큰 5) — 큰 구슬은 테두리 고리 하나 더
      for (i = 0; i < 55; i++) {
        var big = i % 11 === 0, th = 180 + (i + 0.5) * 360 / 55, q = P(27, th);
        gd.add(Geo.cyl(big ? 12 : 8, 1), 0xa87a3c, { x: q.x, y: 0, z: q.z, sx: big ? 0.48 : 0.24, sy: 0.022, sz: big ? 0.48 : 0.24, vary: 0.04 });
        if (big) gd.add(Geo.cyl(12, 1), 0x7d5a2a, { x: q.x, y: 0, z: q.z, sx: 0.6, sy: 0.012, sz: 0.6, vary: 0 });
      }
      // 기둥 12(설계 θ = 15 + 30k)
      for (k = 0; k < 12; k++) {
        var pc = P(PLAN.R_DOME, 15 + 30 * k);
        cylAt(s, pc.x, pc.z, 0, 0.8, PLAN.PIER_R + 0.35, PLAN.PIER_R + 0.25, 16, STONE_D);
        cylAt(s, pc.x, pc.z, 0.8, PLAN.ARCADE_SPRING - 2.0, PLAN.PIER_R, PLAN.PIER_R, 20, STONE_W);
        cylAt(gd, pc.x, pc.z, PLAN.ARCADE_SPRING - 1.2, 1.2, PLAN.PIER_R, PLAN.PIER_R + 0.5, 16, GOLD);
        cylAt(s, pc.x, pc.z, PLAN.ARCADE_SPRING - 1.2 - 0.8, 0.8, PLAN.PIER_R + 0.1, PLAN.PIER_R + 0.1, 16, STONE);
        ctx.addCollider({ x: pc.x, z: pc.z, r: PLAN.PIER_R + 0.35 });
        // 묶음 기둥(붙은 가는 기둥 넷) + 가운데 쪽 금빛 벽감(별 판, 참고 c2 — 성상은 두지 않는다: 폰 예산)
        var pa = (15 + 30 * k) * D2R, cx0 = Math.sin(pa), cz0 = Math.cos(pa);
        [-80, -40, 40, 80].forEach(function (dg) {
          var b = pa + dg * D2R; cylAt(s, pc.x - Math.sin(b) * PLAN.PIER_R, pc.z - Math.cos(b) * PLAN.PIER_R, 0.8, PLAN.ARCADE_SPRING - 2.0, 0.32, 0.32, 10, STONE_W);
        });
        var nr = PLAN.R_DOME - PLAN.PIER_R - 0.03;
        blindArch('Z4', -cx0 * nr, -cz0 * nr, cz0, -cx0, cx0, cz0, 0.62, 4.2, 7.4, 8.6);
      }
      // 아케이드 벽(반지름 30, 21 → 36): 기둥 사이 뾰족 아치
      for (k = 0; k < 12; k++) {
        var thA = 15 + 30 * k, thB = thA + 30, A = P(PLAN.R_DOME, thA), Bp = P(PLAN.R_DOME, thB);
        var mx = (A.x + Bp.x) / 2, mz = (A.z + Bp.z) / 2, dx = Bp.x - A.x, dz = Bp.z - A.z, L = Math.sqrt(dx * dx + dz * dz);
        var ux = dx / L, uz = dz / L, half = L / 2, a = half - PLAN.PIER_R;
        // 아치 구멍 아래(0..21)는 비어 있다: 벽은 21 위부터 — archWall 을 21 만큼 올려 쓰려고 직접 만든다
        var seg = 12, y0s = PLAN.ARCADE_SPRING, yTop = PLAN.DRUM_Y0, apex = y0s + 10.3;
        var nx = -uz, nz = ux, tW = 1.6;
        for (var j = 0; j < seg; j++) {
          var u0 = -a + 2 * a * j / seg, u1 = -a + 2 * a * (j + 1) / seg, yy0 = y0s + archY(u0, a, apex - y0s), yy1 = y0s + archY(u1, a, apex - y0s);
          [-1, 1].forEach(function (sd) {
            var pa = [mx + ux * u0 + nx * sd * tW / 2, yy0, mz + uz * u0 + nz * sd * tW / 2], pb = [mx + ux * u1 + nx * sd * tW / 2, yy1, mz + uz * u1 + nz * sd * tW / 2];
            s.addQuad(pa, pb, [pb[0], yTop, pb[2]], [pa[0], yTop, pa[2]], STONE, [mx + nx * sd * 6, (yy0 + yTop) / 2, mz + nz * sd * 6], { vary: 0.01 });
          });
          s.addQuad([mx + ux * u0 - nx * tW / 2, yy0, mz + uz * u0 - nz * tW / 2], [mx + ux * u1 - nx * tW / 2, yy1, mz + uz * u1 - nz * tW / 2], [mx + ux * u1 + nx * tW / 2, yy1, mz + uz * u1 + nz * tW / 2], [mx + ux * u0 + nx * tW / 2, yy0, mz + uz * u0 + nz * tW / 2], STONE_D, [mx + ux * (u0 + u1) / 2, (yy0 + yy1) / 2 - 4, mz + uz * (u0 + u1) / 2], { vary: 0.01 });
        }
        // 기둥 위 벽 조각(아치 시작 위, 기둥 폭)
        [A, Bp].forEach(function (pp, ii) { var sg2 = ii ? -1 : 1; segBox(s, pp.x, pp.z, pp.x + ux * sg2 * PLAN.PIER_R, pp.z + uz * sg2 * PLAN.PIER_R, y0s, yTop, tW, STONE); });
        archRing(gd, mx, mz, ux, uz, a, y0s, apex, -tW / 2 - 0.05, 0.35, GOLD, 10);
      }
      // 아케이드 위(31.6 → 35.4): 칸마다 막힌 작은 뾰족 아치 넷(별 판 · 금 테) — 참고 interior_three_levels 의 2층 회랑
      for (k = 0; k < 12; k++) {
        var tb = (15 + 30 * k + 15) * D2R, tR = PLAN.R_DOME - 0.8;
        for (var ti = -1; ti <= 1; ti += 1) {
          var ang = tb + ti * 6.6 * D2R, tx = -Math.sin(ang) * tR, tz = -Math.cos(ang) * tR;
          blindArch('Z4', tx, tz, Math.cos(ang), -Math.sin(ang), Math.sin(ang), Math.cos(ang), 1.25, 32.0, 34.0, 35.5, false, true);
        }
      }
      for (k = 0; k < 48; k++) { var e0b = k / 48 * Math.PI * 2, e1b = (k + 1) / 48 * Math.PI * 2; s.addBeam([Math.sin(e0b) * 29.05, 31.75, Math.cos(e0b) * 29.05], [Math.sin(e1b) * 29.05, 31.75, Math.cos(e1b) * 29.05], 0.35, 0.4, STONE_W); gd.addBeam([Math.sin(e0b) * 29.4, PLAN.DRUM_Y1, Math.cos(e0b) * 29.4], [Math.sin(e1b) * 29.4, PLAN.DRUM_Y1, Math.cos(e1b) * 29.4], 0.45, 0.6, GOLD); }
      // 처마 돌림띠(36)
      for (k = 0; k < 48; k++) { var c0 = k / 48 * Math.PI * 2, c1 = (k + 1) / 48 * Math.PI * 2; gd.addBeam([Math.sin(c0) * 29.4, PLAN.DRUM_Y0, Math.cos(c0) * 29.4], [Math.sin(c1) * 29.4, PLAN.DRUM_Y0, Math.cos(c1) * 29.4], 0.5, 0.6, GOLD); }
      // 주보랑 궁륭(고리 반원통: r 42 에서 21 → r 30 에서 32.4): 파란 칠
      var ambN = low ? 48 : 72, amb = B('Z4', 'star');
      // 주보랑 궁륭의 가로 리브(금): 기둥마다 바깥 경당 쪽으로
      for (k = 0; k < 12; k++) {
        var rb0 = (15 + 30 * k) * D2R;
        for (j = 0; j < 6; j++) {
          var ra0 = 30 + 12 * j / 6, ra1 = 30 + 12 * (j + 1) / 6, ha0 = 21 + 11.4 * Math.sin(Math.PI / 2 * (6 - j) / 6) - 0.15, ha1 = 21 + 11.4 * Math.sin(Math.PI / 2 * (6 - j - 1) / 6) - 0.15;
          gd.addBeam([Math.sin(rb0) * ra0, ha0, Math.cos(rb0) * ra0], [Math.sin(rb0) * ra1, ha1, Math.cos(rb0) * ra1], 0.32, 0.35, GOLD);
        }
      }
      for (k = 0; k < ambN; k++) {
        var e0 = k / ambN * Math.PI * 2, e1 = (k + 1) / ambN * Math.PI * 2;
        for (j = 0; j < 6; j++) {
          // 바깥(경당 쪽 r 42, 21 m)에서 안쪽(기둥 아케이드 r 30, 32.4 m — 아치 꼭대기 31.3 보다 높게)으로 오르는 반원통: 아치 너머로 하늘이 보이지 않는다
          var r0 = 30 + 12 * j / 6, r1 = 30 + 12 * (j + 1) / 6, h0 = 21 + 11.4 * Math.sin(Math.PI / 2 * (6 - j) / 6), h1 = 21 + 11.4 * Math.sin(Math.PI / 2 * (6 - j - 1) / 6);
          amb.addQuad([Math.sin(e0) * r0, h0, Math.cos(e0) * r0], [Math.sin(e1) * r0, h0, Math.cos(e1) * r0], [Math.sin(e1) * r1, h1, Math.cos(e1) * r1], [Math.sin(e0) * r1, h1, Math.cos(e0) * r1], j < 2 ? 0xe6e6f0 : STARV, [0, 0, 0], { vary: 0.03 });
        }
      }
      // 드럼(반지름 30, 36 → 44)
      var drumN = low ? 50 : 100;
      for (k = 0; k < drumN; k++) {
        var d0 = k / drumN * Math.PI * 2, d1 = (k + 1) / drumN * Math.PI * 2, R = 30;
        s.addQuad([Math.sin(d0) * R, PLAN.DRUM_Y0, Math.cos(d0) * R], [Math.sin(d1) * R, PLAN.DRUM_Y0, Math.cos(d1) * R], [Math.sin(d1) * R, PLAN.DRUM_Y1, Math.cos(d1) * R], [Math.sin(d0) * R, PLAN.DRUM_Y1, Math.cos(d0) * R], STONE_W, [0, 40, 0], { vary: 0.01 });
      }
      // 등탑 아래 둥근 구멍 테두리 + 등탑(반지름 3, 74 → 86), 꼭대기 빛
      for (k = 0; k < 24; k++) { var l0 = k / 24 * Math.PI * 2, l1 = (k + 1) / 24 * Math.PI * 2; gd.addBeam([Math.sin(l0) * 3.1, PLAN.DOME_APEX - 0.4, Math.cos(l0) * 3.1], [Math.sin(l1) * 3.1, PLAN.DOME_APEX - 0.4, Math.cos(l1) * 3.1], 0.5, 0.5, GOLD); }
      for (k = 0; k < 16; k++) {
        var m0 = k / 16 * Math.PI * 2, m1 = (k + 1) / 16 * Math.PI * 2;
        (k % 2 ? gl : s).addQuad([Math.sin(m0) * 3, PLAN.DOME_APEX - 0.5, Math.cos(m0) * 3], [Math.sin(m1) * 3, PLAN.DOME_APEX - 0.5, Math.cos(m1) * 3], [Math.sin(m1) * 3, PLAN.LANTERN_TOP, Math.cos(m1) * 3], [Math.sin(m0) * 3, PLAN.LANTERN_TOP, Math.cos(m0) * 3], k % 2 ? new T.Color(0xfff4d8).multiplyScalar(1.6) : STONE_W, [0, 80, 0], { vary: 0 });
      }
      gl.add(Geo.cyl(16, 1), new T.Color(0xfff8e6).multiplyScalar(1.8), { x: 0, y: PLAN.LANTERN_TOP - 0.1, z: 0, sx: 3, sy: 0.1, sz: 3, vary: 0 });
      // 묵주 등(정거장 14): 지름 30 m 금 고리(높이 28), 작은 등 50 + 큰 등 5, 사슬 10
      var RY = 28;
      for (k = 0; k < 72; k++) { var g0 = k / 72 * Math.PI * 2, g1 = (k + 1) / 72 * Math.PI * 2; gd.addBeam([Math.sin(g0) * 15, RY, Math.cos(g0) * 15], [Math.sin(g1) * 15, RY, Math.cos(g1) * 15], 0.35, 0.45, GOLD); }
      for (k = 0; k < 55; k++) {
        var big2 = k % 11 === 0, gq = P(15, 180 + k * 360 / 55);
        gl.add(Geo.sph(8, 6), new T.Color(big2 ? 0xffe2a6 : 0xffd890).multiplyScalar(big2 ? 2.2 : 1.7), { x: gq.x, y: RY - (big2 ? 0.9 : 0.55), z: gq.z, s: big2 ? 0.55 : 0.28, vary: 0 });
        if (big2) gd.add(Geo.cyl(6, 0.6), GOLD, { x: gq.x, y: RY - 1.6, z: gq.z, sx: 0.45, sy: 0.7, sz: 0.45, vary: 0 });
      }
      // (참고 c9) 아래 고리 + 두 고리를 잇는 금 격자, 큰 등 다섯은 육각 등롱(금 살 · 빛나는 심지 · 위아래 뿔), 사슬은 가운데 금관(높이 50)으로 모인다
      var RY2 = RY - 0.95;
      for (k = 0; k < 64; k++) { var h0 = k / 64 * Math.PI * 2, h1 = (k + 1) / 64 * Math.PI * 2; gd.addBeam([Math.sin(h0) * 15, RY2, Math.cos(h0) * 15], [Math.sin(h1) * 15, RY2, Math.cos(h1) * 15], 0.22, 0.3, GOLD); }
      for (k = 0; k < 64; k++) { var lq = k / 64 * Math.PI * 2; gd.addBeam([Math.sin(lq) * 15, RY2, Math.cos(lq) * 15], [Math.sin(lq + 0.049) * 15, RY, Math.cos(lq + 0.049) * 15], 0.06, 0.06, GOLD); }
      for (k = 0; k < 5; k++) {
        var lp = P(15, 180 + k * 72), ly0 = RY - 2.6, lh = 1.6;
        for (var e = 0; e < 6; e++) { var ea = e / 6 * Math.PI * 2; gd.addBeam([lp.x + Math.sin(ea) * 0.55, ly0, lp.z + Math.cos(ea) * 0.55], [lp.x + Math.sin(ea) * 0.55, ly0 + lh, lp.z + Math.cos(ea) * 0.55], 0.07, 0.07, GOLD); }
        gd.add(Geo.cyl(6, 0.05), GOLD, { x: lp.x, y: ly0 + lh, z: lp.z, sx: 0.72, sy: 0.9, sz: 0.72, vary: 0 });
        gd.add(Geo.cyl(6, 0.05), GOLD, { x: lp.x, y: ly0, z: lp.z, sx: 0.66, sy: 0.6, sz: 0.66, rx: Math.PI, vary: 0 });
        gd.add(Geo.cyl(6, 1), GOLD, { x: lp.x, y: ly0 + lh - 0.08, z: lp.z, sx: 0.66, sy: 0.12, sz: 0.66, vary: 0 });
        gl.add(Geo.cyl(6, 1), new T.Color(0xffe0a0).multiplyScalar(2.0), { x: lp.x, y: ly0 + 0.1, z: lp.z, sx: 0.4, sy: lh - 0.3, sz: 0.4, vary: 0 });
        gd.addBeam([lp.x, ly0 + lh + 0.9, lp.z], [lp.x, RY + 0.2, lp.z], 0.06, 0.06, GOLD);
      }
      var CROWN = 50;
      for (k = 0; k < 24; k++) { var w0 = k / 24 * Math.PI * 2, w1 = (k + 1) / 24 * Math.PI * 2; gd.addBeam([Math.sin(w0) * 1.6, CROWN, Math.cos(w0) * 1.6], [Math.sin(w1) * 1.6, CROWN, Math.cos(w1) * 1.6], 0.5, 0.25, GOLD); }
      gd.add(Geo.cyl(10, 0.3), GOLD, { x: 0, y: CROWN - 1.2, z: 0, sx: 1.5, sy: 1.2, sz: 1.5, vary: 0 });
      for (k = 0; k < 10; k++) { var cq = P(15, k * 36), tq = P(1.6, k * 36); gd.addBeam([cq.x, RY, cq.z], [tq.x, CROWN, tq.z], 0.07, 0.07, 0x6b5a3a); }
      gd.addBeam([0, CROWN, 0], [0, PLAN.DOME_APEX - 1, 0], 0.12, 0.12, 0x6b5a3a);
      ctx.addGlow({ x: 0, y: RY - 1, z: 0, size: 34, color: 0xffd58a, kind: 'lamp' });
    })();
    // 돔(반구 안쪽, 반지름 30, 44 → 74): 파란 바탕 금별 + 열두 리브(금, 자오선) + 열두 갈래 별(지그재그 리브) — 리브는 한 갈래를 12번 돌린 InstancedMesh
    var domeMesh, ribInst, drumWin;
    (function dome() {
      var Rd = PLAN.R_DOME - 0.05, segW = low ? 48 : 72, segH = low ? 12 : 18, th0 = Math.asin(3.2 / Rd);
      var dg = new T.SphereGeometry(Rd, segW, segH, 0, Math.PI * 2, th0, Math.PI / 2 - th0);
      var dt = starTex.clone(); dt.needsUpdate = true; dt.wrapS = dt.wrapT = T.RepeatWrapping; dt.repeat.set(30, 7);
      domeMesh = new T.Mesh(dg, new T.MeshStandardMaterial({ map: dt, roughness: 0.75, side: T.BackSide, envMapIntensity: 0.6 }));
      domeMesh.position.set(0, PLAN.DRUM_Y1, 0); domeMesh.castShadow = true; Z.Z4.group.add(domeMesh);
      // 리브 한 갈래(로컬: 방위 0 = -z 쪽)
      var rb = newBatch('gold', 5);
      function sph(phi, az, r) { r = r || Rd - 0.3; return [-r * Math.sin(phi) * Math.sin(az), PLAN.DRUM_Y1 + r * Math.cos(phi), -r * Math.sin(phi) * Math.cos(az)]; }
      var n = 14, k;
      for (k = 0; k < n; k++) { var ph0 = th0 + (Math.PI / 2 - th0) * (1 - k / n), ph1 = th0 + (Math.PI / 2 - th0) * (1 - (k + 1) / n); rb.addBeam(sph(ph0, 0), sph(ph1, 0), 0.55, 0.45, GOLD); }
      // 별: 자오선 0 의 낮은 점(위도 60°)에서 이웃 자오선 사이(±15°)의 높은 점(위도 35°)으로
      var pl = 60 * D2R, ph = 35 * D2R;
      [-1, 1].forEach(function (sg) {
        for (k = 0; k < 6; k++) { var t0 = k / 6, t1 = (k + 1) / 6; rb.addBeam(sph(pl + (ph - pl) * t0, sg * 15 * D2R * t0), sph(pl + (ph - pl) * t1, sg * 15 * D2R * t1), 0.32, 0.3, GOLD); }
      });
      var rg = rb.build(MAT.gold, 'light_ribs').children[0].geometry;
      ribInst = new T.InstancedMesh(rg, MAT.gold, 12);
      var m4 = new T.Matrix4();
      for (k = 0; k < 12; k++) { m4.makeRotationY(k * 30 * D2R); ribInst.setMatrixAt(k, m4); }
      ribInst.frustumCulled = false; Z.Z4.group.add(ribInst); ctx.stats.meshes++;
      stats.instTris += rg.attributes.position.count / 3 * 12;
      // 드럼 창 50(성모송 쉰 번): 작은 아치 창 하나를 50번 — InstancedMesh(유리, draw call 1)
      var wg = lancetGeo(1.3, 4.6, 0.75);
      var wt = canvasTex(32, 96, function (g, w, h) { var gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#f4d27a'); gr.addColorStop(0.6, '#fff1c8'); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#7a6440'; g.fillRect(w / 2 - 1, 0, 2, h); g.fillRect(0, h * 0.45, w, 2); });
      drumWin = new T.InstancedMesh(wg, glassMat(wt), 50);
      for (k = 0; k < 50; k++) {
        var az = (k + 0.5) / 50 * Math.PI * 2, q = new T.Quaternion().setFromEuler(new T.Euler(0, az + Math.PI, 0));
        m4.compose(new T.Vector3(-Math.sin(az) * 29.93 * -1, 37.6, Math.cos(az) * 29.93), q, new T.Vector3(1, 1, 1));
        // 창 면이 중심을 바라보게: 위치 (sin, cos)·R, 법선 -(sin, cos)
        m4.compose(new T.Vector3(Math.sin(az) * 29.93, 37.6, Math.cos(az) * 29.93), new T.Quaternion().setFromEuler(new T.Euler(0, az + Math.PI, 0)), new T.Vector3(1, 1, 1));
        drumWin.setMatrixAt(k, m4);
      }
      drumWin.frustumCulled = false; Z.Z4.group.add(drumWin); ctx.stats.meshes++;
      // 드럼 창 금 테(한 테를 50번 — 같은 행렬, draw call 1)
      var fb = newBatch('gold', 6);
      archRing(fb, 0, 0.06, 1, 0, 0.74, 3.85, 4.68, 0, 0.12, GOLD, 6);
      fb.addBeam([-0.74, 0, 0.06], [-0.74, 3.85, 0.06], 0.12, 0.12, GOLD); fb.addBeam([0.74, 0, 0.06], [0.74, 3.85, 0.06], 0.12, 0.12, GOLD); fb.addBeam([-0.8, -0.05, 0.1], [0.8, -0.05, 0.1], 0.14, 0.3, STONE_W);
      var fg = fb.build(MAT.gold, 'light_drum_frames').children[0].geometry, drumFrame = new T.InstancedMesh(fg, MAT.gold, 50);
      for (k = 0; k < 50; k++) { drumWin.getMatrixAt(k, m4); drumFrame.setMatrixAt(k, m4); }
      drumFrame.frustumCulled = false; Z.Z4.group.add(drumFrame); ctx.stats.meshes++;
      stats.instTris += fg.attributes.position.count / 3 * 50;
    })();
    ctx.renderSeats(layout, 'bench');
    ctx.addLight({ x: 0, y: 24, z: -6, color: 0xffd9a8, intensity: 1.0, distance: 64, kind: 'lamp' });

    // =====================================================================
    // Z5 신비 경당 고리: 경당 한 칸 모듈(로컬 θ=0, 축이 -z) × 20, 칸막이 모듈 × 24 — InstancedMesh
    // =====================================================================
    var chapelInst = [], partInst = [];
    (function ring() {
      var sb = newBatch('stone', 21), pb = newBatch('star', 22), gb = newBatch('gold', 23), wb = newBatch('paint', 24), cpb = newBatch('paint', 27);
      var hw = function (r) { return r * Math.tan(6.5 * D2R); };
      var zBack = -(PLAN.R_BACK - PLAN.WALL_T / 2), zIn = -PLAN.WIN_PLANE;   // 뒷벽 가운데선, 안쪽 면
      // 뒷벽(창 구멍 없이 판 — 창 그림은 앞에 붙는다) + 창 둘레 돌 틀
      boxA(sb, -hw(PLAN.R_BACK) - 0.6, hw(PLAN.R_BACK) + 0.6, 0, PLAN.CHAPEL_H, zBack - PLAN.WALL_T / 2, zBack + PLAN.WALL_T / 2 - 0.02, STONE);
      var WW = PLAN.WIN_W, top = PLAN.WIN_TOP, rise = 2.6, sill = top - 8.6;   // 창 자리 3 × 8.6 m(받은 그림 비율 0.35~0.41 에 맞춤)
      boxA(sb, -WW / 2 - 0.55, -WW / 2 - 0.05, sill - 0.3, top - rise, zIn - 0.02, zIn + 0.32, STONE_W);
      boxA(sb, WW / 2 + 0.05, WW / 2 + 0.55, sill - 0.3, top - rise, zIn - 0.02, zIn + 0.32, STONE_W);
      boxA(sb, -WW / 2 - 0.8, WW / 2 + 0.8, sill - 0.55, sill - 0.05, zIn - 0.02, zIn + 0.55, STONE_W);
      archRing(sb, 0, zIn + 0.16, 1, 0, WW / 2 + 0.3, top - rise, top + 0.3, 0, 0.5, STONE_W, 10);
      archRing(gb, 0, zIn + 0.36, 1, 0, WW / 2 + 0.55, top - rise, top + 0.55, 0, 0.12, GOLD, 10);
      // 창 아래 돌 선반(제대 아님 — 무릎틀과 봉헌초만 둔다) + 빈 청동판 자리
      boxA(sb, -2.2, 2.2, 0, 1.05, zIn, zIn + 0.6, STONE_D);
      boxA(gb, -0.8, 0.8, 1.35, 2.35, zIn - 0.0, zIn + 0.05, 0x7c5c30);   // 빈 청동판(그림·글자 없음, 참고 c4)
      boxA(sb, -1.0, 1.0, 1.2, 1.35, zIn, zIn + 0.12, STONE_W); boxA(sb, -1.0, 1.0, 2.35, 2.5, zIn, zIn + 0.12, STONE_W);
      boxA(sb, -1.0, -0.8, 1.35, 2.35, zIn, zIn + 0.12, STONE_W); boxA(sb, 0.8, 1.0, 1.35, 2.35, zIn, zIn + 0.12, STONE_W);
      boxA(sb, -2.25, 2.25, 1.0, 1.12, zIn, zIn + 0.68, STONE_W);   // 선반 윗판 돌림
      // 뒷벽: 창 양옆 막힌 뾰족 아치 둘(별 판) + 처마(16)
      var MB = { st: pb, gd: gb, s: sb };
      [-1, 1].forEach(function (sd) { blindArch(MB, sd * 4.1, zIn, 1, 0, 0, 1, 1.05, 2.9, 10.2, 12.2, false, true); });
      boxA(sb, -hw(PLAN.WIN_PLANE), hw(PLAN.WIN_PLANE), 15.6, 16.0, zIn, zIn + 0.36, STONE_W);
      boxA(gb, -hw(PLAN.WIN_PLANE), hw(PLAN.WIN_PLANE), 15.52, 15.6, zIn, zIn + 0.14, GOLD);
      boxA(sb, -hw(PLAN.WIN_PLANE), hw(PLAN.WIN_PLANE), 0, 0.5, zIn, zIn + 0.16, STONE_D);
      // 창 양옆 가는 돌기둥 + 금 기둥머리(참고 c4)
      [-1, 1].forEach(function (sd) {
        var cxw = sd * (WW / 2 + 0.78);
        cylAt(sb, cxw, zIn + 0.28, sill - 0.55, top - rise - sill + 0.15, 0.16, 0.16, 6, STONE_W);
        cylAt(gb, cxw, zIn + 0.28, top - rise - 0.4, 0.4, 0.18, 0.3, 6, GOLD);
      });
      // 입구(반지름 42) 위 벽과 뾰족 아치(반폭 4.2, 시작 11, 꼭대기 15.2)
      var zm = -(PLAN.R_AMB - 0.4), mw = hw(PLAN.R_AMB) + 0.2;
      archWall(sb, 0, zm, 1, 0, mw, PLAN.CHAPEL_H, 0.8, 4.3, 11, 15.4, STONE, 10);
      archRing(gb, 0, zm, 1, 0, 4.3, 11, 15.4, 0.45, 0.22, GOLD, 10);
      // 조각한 아치(참고 c4): 돌 몰딩 고리 둘 + 돌 장미 9송이(로툰다 쪽 면), 아치 받침 기둥머리
      archRing(sb, 0, zm, 1, 0, 4.75, 11, 15.85, 0.5, 0.4, STONE_W, 8);
      archRing(sb, 0, zm, 1, 0, 3.95, 11, 15.0, 0.42, 0.3, STONE_W, 8);
      for (var ro = 0; ro < 9; ro++) {
        var ru = -4.35 + 8.7 * (ro + 0.5) / 9, ry = 11 + archY(ru, 4.35, 4.4);
        sb.add(Geo.cyl(6, 0.55), STONE_W, { x: ru, y: ry, z: zm + 0.6, sx: 0.24, sy: 0.16, sz: 0.24, rx: Math.PI / 2, vary: 0.03 });
      }
      [-1, 1].forEach(function (sd) { cylAt(gb, sd * 4.45, zm + 0.45, 10.4, 0.6, 0.3, 0.42, 8, GOLD); cylAt(sb, sd * 4.45, zm + 0.45, 0, 10.4, 0.26, 0.26, 8, STONE_W); });
      // 천장: 뾰족 원통 궁륭(축 방향, 16 → 20.2) — 칸이 넓어지는 쐐기라 폭을 따라 넓힌다 + 위 덮개
      ceilGrid(pb, 8, 6, function (u, v) {
        var z = -(PLAN.R_AMB - 0.2) - (PLAN.R_BACK - PLAN.R_AMB - 0.4) * v, half = -z * Math.tan(6.5 * D2R) - 0.45, x = -half + 2 * half * u;
        return [x, 16 + archY(x, half, 4.2), z];
      }, STARV);
      [-1, 1].forEach(function (d) {
        for (var k = 0; k < 6; k++) {
          var v0 = k / 6, v1 = (k + 1) / 6, z0 = -(PLAN.R_AMB) - (PLAN.R_BACK - PLAN.R_AMB) * v0, z1 = -(PLAN.R_AMB) - (PLAN.R_BACK - PLAN.R_AMB) * v1;
          var x0 = d * (-z0 * Math.tan(6.5 * D2R) - 0.5) * (1 - 2 * v0), x1 = d * (-z1 * Math.tan(6.5 * D2R) - 0.5) * (1 - 2 * v1);
          gb.addBeam([x0, 16 + archY(x0, -z0 * Math.tan(6.5 * D2R) - 0.45, 4.2) - 0.12, z0], [x1, 16 + archY(x1, -z1 * Math.tan(6.5 * D2R) - 0.45, 4.2) - 0.12, z1], 0.22, 0.2, GOLD);
        }
      });
      cpb.addQuad([-hw(PLAN.R_AMB) - 1, PLAN.CHAPEL_H, -PLAN.R_AMB + 0.5], [hw(PLAN.R_AMB) + 1, PLAN.CHAPEL_H, -PLAN.R_AMB + 0.5], [hw(PLAN.R_BACK) + 1, PLAN.CHAPEL_H, -PLAN.R_BACK], [-hw(PLAN.R_BACK) - 1, PLAN.CHAPEL_H, -PLAN.R_BACK], 0x3a3446, [0, 0, -50]);
      // 무릎틀(둘이 쓰는 나무 틀): 반지름 53
      boxA(wb, -1.1, 1.1, 0, 0.18, -53.25, -52.75, WOOD);
      boxA(cpb, -1.02, 1.02, 0.18, 0.25, -53.2, -52.8, 0x7a2630);   // 붉은 방석
      boxA(cpb, -1.0, 1.0, 0.86, 0.9, -53.98, -53.57, 0x7a2630);   // 팔걸이 덮개
      boxA(wb, -1.1, 1.1, 0.75, 0.88, -53.95, -53.6, WOOD);
      [-1.05, 1.05].forEach(function (x) { boxA(wb, x - 0.05, x + 0.05, 0, 0.88, -53.95, -52.75, WOOD); });
      // 봉헌초 받침(로컬 x 3.4, z -51.2; 칸은 layout.candles — 초는 코어가 그린다): 두 단 선반 + 철 받침
      var st = { x: 3.4, z: -51.2 };
      boxA(wb, st.x - 0.05, st.x + 0.35, 0, 0.88, st.z - 0.62, st.z + 0.62, 0x2e2a28);
      boxA(wb, st.x + 0.1, st.x + 0.42, 0.88, 1.17, st.z - 0.62, st.z + 0.62, 0x2e2a28);
      boxA(gb, st.x - 0.08, st.x + 0.45, 0.86, 0.89, st.z - 0.65, st.z + 0.65, 0x8c6a32);

      // 칸막이 모듈(로컬: θ=0 방향 반지름 42 → 57.6, 두께 1.1) + 입구 쪽 붙은 기둥
      var qb = newBatch('stone', 25), qg = newBatch('gold', 26), qs = newBatch('star', 28);
      boxA(qb, -0.55, 0.55, 0, PLAN.CHAPEL_H, -PLAN.R_BACK, -PLAN.R_AMB, STONE);
      // 칸막이 양면: 막힌 뾰족 아치 둘(별 판, 참고 c4 의 옆벽) + 굽도리 · 띠돌림(11) · 처마(16) + 금 줄
      [-1, 1].forEach(function (sd) { blindArch({ st: qs, gd: qg, s: qb }, sd * 0.55, -49.6, 0, 1, sd, 0, 3.4, 0.62, 7.4, 10.2, false, true); });
      [-1, 1].forEach(function (sd) {
        var x0 = sd * 0.55, x1 = sd * 0.72, x2 = sd * 0.62;
        boxA(qb, Math.min(x0, x1), Math.max(x0, x1), 0, 0.5, -PLAN.R_BACK + 0.6, -PLAN.R_AMB - 0.5, STONE_D);
        boxA(qb, Math.min(x0, x1), Math.max(x0, x1), 10.7, 11.0, -PLAN.R_BACK + 0.6, -PLAN.R_AMB - 0.5, STONE_W);
        boxA(qb, Math.min(x0, sd * 0.85), Math.max(x0, sd * 0.85), 15.6, 16.0, -PLAN.R_BACK + 0.6, -PLAN.R_AMB - 0.5, STONE_W);
        boxA(qg, Math.min(x0, x2), Math.max(x0, x2), 11.0, 11.06, -PLAN.R_BACK + 0.6, -PLAN.R_AMB - 0.5, GOLD);
      });
      qb.add(Geo.cyl(14, 1), STONE_W, { x: 0, y: 0, z: -PLAN.R_AMB, sx: 0.75, sy: 11, sz: 0.75, flat: false, vary: 0.02 });
      qg.add(Geo.cyl(12, 1.25), GOLD, { x: 0, y: 10.4, z: -PLAN.R_AMB, sx: 0.78, sy: 0.6, sz: 0.78, vary: 0 });

      var m4 = new T.Matrix4();
      // 한 모듈을 이웃 3~4칸마다 InstancedMesh 하나로 — 덩어리마다 경계 구를 주어 시야 밖 덩어리는 통째로 건너뛴다(그리기 호출은 종류 × 7)
      function inst(batch, mat, n, name, list, angles) {
        var g = batch.build(mat, name).children[0].geometry;
        g.computeBoundingSphere();
        var lb = g.boundingSphere, per = Math.ceil(n / 7);
        for (var c0 = 0; c0 < n; c0 += per) {
          var cnt = Math.min(per, n - c0), gi = new T.BufferGeometry();
          Object.keys(g.attributes).forEach(function (an) { gi.setAttribute(an, g.attributes[an]); });
          if (g.index) gi.setIndex(g.index);
          var im = new T.InstancedMesh(gi, mat, cnt), ctr = new T.Vector3(), pts = [];
          for (var k = 0; k < cnt; k++) { m4.makeRotationY(angles[c0 + k] * D2R); im.setMatrixAt(k, m4); var pc = lb.center.clone().applyMatrix4(m4); pts.push(pc); ctr.add(pc); }
          ctr.multiplyScalar(1 / cnt);
          var rad = 0; pts.forEach(function (pc) { rad = Math.max(rad, pc.distanceTo(ctr) + lb.radius); });
          gi.boundingSphere = new T.Sphere(ctr, rad); im.boundingSphere = gi.boundingSphere.clone();
          im.frustumCulled = true; im.castShadow = mat !== MAT.glow; im.receiveShadow = true; im.name = name + '_' + (c0 / per);
          Z.Z5.group.add(im); ctx.stats.meshes++; list.push(im);
        }
        stats.instTris += g.attributes.position.count / 3 * n;
      }
      var cAng = CHAPELS.map(function (c) { return c.theta; });
      inst(sb, MAT.stone, 20, 'light_chapel_stone', chapelInst, cAng);
      inst(pb, MAT.star, 20, 'light_chapel_vault', chapelInst, cAng);
      inst(cpb, MAT.paint, 20, 'light_chapel_paint', chapelInst, cAng);
      inst(gb, MAT.gold, 20, 'light_chapel_gold', chapelInst, cAng);
      inst(wb, MAT.wood, 20, 'light_chapel_wood', chapelInst, cAng);
      inst(qb, MAT.stone, PARTITIONS.length, 'light_partition', partInst, PARTITIONS);
      inst(qg, MAT.gold, PARTITIONS.length, 'light_partition_gold', partInst, PARTITIONS);
      inst(qs, MAT.star, PARTITIONS.length, 'light_partition_star', partInst, PARTITIONS);

      // 충돌체(월드): 칸막이 24 · 경당 뒷벽 20 · 무릎틀 20 · 봉헌초 받침 20
      PARTITIONS.forEach(function (th) { var a = P(PLAN.R_AMB - 0.6, th), b = P(PLAN.R_BACK + 0.3, th); addSeg(a.x, a.z, b.x, b.z, 0.62); });
      function rot(lx, lz, th) { var a = th * D2R, ca = Math.cos(a), sa = Math.sin(a); return { x: lx * ca + lz * sa, z: -lx * sa + lz * ca }; }
      CHAPELS.forEach(function (c) {
        var A = rot(-hw(PLAN.R_BACK) - 0.6, -PLAN.WIN_PLANE - 0.1, c.theta), Bq = rot(hw(PLAN.R_BACK) + 0.6, -PLAN.WIN_PLANE - 0.1, c.theta);
        addSeg(A.x, A.z, Bq.x, Bq.z, 0.4);
        var s0 = rot(-2.2, -PLAN.WIN_PLANE + 0.3, c.theta), s1 = rot(2.2, -PLAN.WIN_PLANE + 0.3, c.theta); addSeg(s0.x, s0.z, s1.x, s1.z, 0.32);   // 돌 선반
        var k0 = rot(-1.1, -53.35, c.theta), k1 = rot(1.1, -53.35, c.theta); addSeg(k0.x, k0.z, k1.x, k1.z, 0.62);
        var t0 = rot(3.55, -51.85, c.theta), t1 = rot(3.55, -50.55, c.theta); addSeg(t0.x, t0.z, t1.x, t1.z, 0.3);
      });
    })();
    // 문 칸(서 · 북 · 남): 뒷벽(서는 반폭 4 문, 북·남은 닫힌 나무 문) + 덮개 + 입구 쪽 아치
    (function doorBays() {
      var s = B('Z5', 'stone'), p = B('Z5', 'paint'), gd = B('Z5', 'gold'), w = B('Z5', 'paint');
      ['west', 'north', 'south'].forEach(function (nm) {
        var D = DOORS[nm], mid = (D.from + D.to) / 2, A = P(PLAN.R_BACK, D.from), Bq = P(PLAN.R_BACK, D.to);
        var mx = (A.x + Bq.x) / 2, mz = (A.z + Bq.z) / 2, dx = Bq.x - A.x, dz = Bq.z - A.z, L = Math.sqrt(dx * dx + dz * dz), ux = dx / L, uz = dz / L;
        var nIn = { x: -mx, z: -mz }, nl = Math.sqrt(mx * mx + mz * mz); nIn.x /= nl; nIn.z /= nl;
        if (D.open) {
          archWall(s, mx, mz, ux, uz, L / 2 + 0.6, PLAN.CHAPEL_H, PLAN.WALL_T, 4, 9, 12, STONE, 10);
          addSeg(A.x, A.z, mx - ux * 4.6, mz - uz * 4.6, 0.6); addSeg(mx + ux * 4.6, mz + uz * 4.6, Bq.x, Bq.z, 0.6);
          archRing(gd, mx + nIn.x * 0.62, mz + nIn.z * 0.62, ux, uz, 4.1, 9, 12.1, 0, 0.3, GOLD, 10);
        } else {
          segBox(s, A.x, A.z, Bq.x, Bq.z, 0, PLAN.CHAPEL_H, PLAN.WALL_T, STONE);
          addSeg(A.x, A.z, Bq.x, Bq.z, 0.6);
          // 닫힌 큰 나무 문(2단계에서 세례당·회랑으로 열린다)
          var fx = mx + nIn.x * 0.62, fz = mz + nIn.z * 0.62;
          segBox(w, fx - ux * 2.6, fz - uz * 2.6, fx + ux * 2.6, fz + uz * 2.6, 0, 8.4, 0.18, WOOD);
          segBox(w, fx - ux * 0.04, fz - uz * 0.04, fx + ux * 0.04, fz + uz * 0.04, 0, 8.4, 0.24, 0x3a2416);
          archRing(gd, fx + nIn.x * 0.12, fz + nIn.z * 0.12, ux, uz, 2.8, 8.4, 11.2, 0, 0.3, GOLD, 10);
        }
        // 덮개(높이 21) + 입구(반지름 42) 아치
        var C0 = P(PLAN.R_AMB, D.from), C1 = P(PLAN.R_AMB, D.to);
        p.addQuad([C0.x, PLAN.CHAPEL_H, C0.z], [C1.x, PLAN.CHAPEL_H, C1.z], [Bq.x, PLAN.CHAPEL_H, Bq.z], [A.x, PLAN.CHAPEL_H, A.z], 0x3a3446, [mx * 0.9, 0, mz * 0.9]);
        var im = P(PLAN.R_AMB - 0.4, mid), cdx = C1.x - C0.x, cdz = C1.z - C0.z, cL = Math.sqrt(cdx * cdx + cdz * cdz);
        archWall(s, im.x, im.z, cdx / cL, cdz / cL, cL / 2 + 0.3, PLAN.CHAPEL_H, 0.8, cL / 2 - 1.2, 12, 18, STONE, 10);
      });
    })();

    // =====================================================================
    // Z5b 제단(걸어 들어갈 수 없음 — 난간 앞에서 멈춘다)·후진. 미사·성사는 흉내 내지 않는다(제대는 꾸밈 없이 놓여 있을 뿐)
    // =====================================================================
    var apseWins = [], APSE_W = 7.2, APSE_H = 14, APSE_SILL = 5;
    (function sanctuary() {
      var s = B('Z5b', 'stone'), f = B('Z5b', 'floor'), p = B('Z5b', 'paint'), gd = B('Z5b', 'gold'), w = B('Z5b', 'paint');
      var SY = PLAN.SANCT_Y, SZ = PLAN.SANCT_Z, H2 = PLAN.SANCT_HALF;
      // 단(높이 0.9): 난간 뒤 → 후진 끝
      boxA(f, -H2, H2, 0, SY, PLAN.APSE_C - PLAN.APSE_R, SZ - 1.4, 0xf4efe6);
      for (var k = 0; k < 3; k++) boxA(f, -H2, H2, 0, SY * (k + 1) / 3, SZ - 1.4 + k * 0.4 - 0.0, SZ - 1.0 + k * 0.4 - 0.4 * 0 + 0.4 * 0, 0xf4efe6);
      ctx.floorZone({ x0: -H2, x1: H2, z0: PLAN.APSE_C - PLAN.APSE_R, z1: SZ - 1.4, y: SY });
      // 제단 난간(돌 난간기둥 + 위 띠) — 앞(z −24.4)과 양옆(x ±13, 칸막이까지)
      function balustrade(ax, az, bx, bz) {
        var dx = bx - ax, dz = bz - az, L = Math.sqrt(dx * dx + dz * dz), n = Math.max(2, Math.round(L / 0.45));
        for (var i = 0; i <= n; i++) { var t = i / n; cylAt(s, ax + dx * t, az + dz * t, 0.12, 0.72, 0.09, 0.06, 6, STONE_W); }
        segBox(s, ax, az, bx, bz, 0, 0.12, 0.42, STONE_D); segBox(s, ax, az, bx, bz, 0.84, 1.0, 0.36, STONE_W);
        segBox(gd, ax, az, bx, bz, 1.0, 1.03, 0.2, GOLD);
      }
      balustrade(-H2, SZ, -1.0, SZ); balustrade(1.0, SZ, H2, SZ);
      // 가운데 문(닫힌 금 난간 문 — 들어가지 않는다)
      segBox(gd, -1.0, SZ, 1.0, SZ, 0.1, 0.95, 0.08, GOLD);
      ctx.addCollider({ x0: -H2, x1: H2, z0: SZ - 0.25, z1: SZ + 0.25 });
      var zEnd = -H2 / Math.tan(15 * D2R);   // 칸막이(θ=±15)가 x ±13 을 지나는 곳
      [-1, 1].forEach(function (sg) {
        balustrade(sg * H2, SZ, sg * H2, Math.max(zEnd, -(PLAN.R_AMB + 1)));
        ctx.addCollider({ x0: sg > 0 ? H2 - 0.25 : -H2 - 0.25, x1: sg > 0 ? H2 + 0.25 : -H2 + 0.25, z0: zEnd - 0.5, z1: SZ });
        // 제단 쪽 칸막이 위쪽 덧벽(21 → 25)
        var a = P(PLAN.R_AMB, sg * 15), b = P(PLAN.R_BACK, sg * 15);
        segBox(s, a.x, a.z, b.x, b.z, PLAN.CHAPEL_H - 0.2, 25, 1.1, STONE);
        // 칸막이 끝 → 후진 끝 잇는 벽
        segBox(s, b.x, b.z, sg * -PLAN.APSE_R, PLAN.APSE_C, 0, 25, 1.1, STONE);
        addSeg(b.x, b.z, sg * -PLAN.APSE_R, PLAN.APSE_C, 0.6);
      });
      // 후진 반원 벽(반지름 13, 높이 25) + 창 셋(3.5 × 19, 자리표시 유리 — 그림은 파일로 바꾼다)
      var AN = 24;
      for (k = 0; k < AN; k++) {
        var a0 = -90 + 180 * k / AN, a1 = -90 + 180 * (k + 1) / AN, R = PLAN.APSE_R + 0.6;
        var q0 = { x: R * Math.sin(a0 * D2R), z: PLAN.APSE_C - R * Math.cos(a0 * D2R) }, q1 = { x: R * Math.sin(a1 * D2R), z: PLAN.APSE_C - R * Math.cos(a1 * D2R) };
        segBox(s, q0.x, q0.z, q1.x, q1.z, 0, 25, 1.2, STONE);
        addSeg(q0.x, q0.z, q1.x, q1.z, 0.6);
      }
      // 후진 창 자리: 폭 ≤ 7.2 m · 높이 ≤ 14 m(그림 비율 그대로 맞춘다 — 그림이 오면 applyPack). 설계(3.5 × 19)보다 넓은 것은 받은 그림이 1:2 라서
      [['apse_left', -42], ['apse_center', 0], ['apse_right', 42]].forEach(function (aw) {
        var a = aw[1] * D2R, R = PLAN.APSE_R - 0.35, x = R * Math.sin(a), z = PLAN.APSE_C - R * Math.cos(a);
        var g = lancetGeo(4.2, APSE_H, 2.6);
        var m = new T.Mesh(g, glassMat(canvasTex(64, 256, placeholderPane('apse', 31 + aw[1]))));
        place(m, x, APSE_SILL, z, -a); Z.Z5b.group.add(m);
        apseWins.push({ key: aw[0], mesh: m, x: x, z: z });
      });
      // 반돔(후진 위, 시작 25): 금 모자이크 빛
      var hd = new T.SphereGeometry(PLAN.APSE_R + 0.1, 32, 10, Math.PI, Math.PI, 0, Math.PI / 2);   // φ π→2π = 후진 쪽(z ≤ 0) 반쪽(1단계는 x ≥ 0 반쪽이라 왼쪽 위로 하늘이 보였다)
      var apT = mosaicTex('apse'); apT.wrapS = apT.wrapT = T.RepeatWrapping; apT.repeat.set(7, 3);   // 금 모자이크 알이 작게(1단계는 반돔 전체에 한 장이라 알이 큰 격자로 보였다)
      var hdm = new T.Mesh(hd, new T.MeshStandardMaterial({ map: apT, color: 0xffe7b0, roughness: 0.4, metalness: 0.4, side: T.BackSide, emissive: 0x3a2a08, emissiveIntensity: 0.3 }));
      hdm.position.set(0, 25, PLAN.APSE_C); hdm.castShadow = true; Z.Z5b.group.add(hdm);
      // 제단 칸 궁륭(반지름 42 → 후진, 시작 25 → 38) + 앞 벽
      ceilGrid(B('Z5b', 'star'), 10, 4, function (u, v) { var x = -14.6 + 29.2 * u, z = -(PLAN.R_AMB - 0.5) + (PLAN.APSE_C + 0.4 + PLAN.R_AMB - 0.5) * v; return [x, 25 + archY(x, 14.6, 13), z]; }, STARV);
      for (k = 0; k < 10; k++) { var su0 = -14.6 + 29.2 * k / 10, su1 = -14.6 + 29.2 * (k + 1) / 10; [-(PLAN.R_AMB - 0.6), -50].forEach(function (zr) { gd.addBeam([su0, 25 + archY(su0, 14.6, 13) - 0.2, zr], [su1, 25 + archY(su1, 14.6, 13) - 0.2, zr], 0.45, 0.5, GOLD); }); }
      boxA(s, -15, 15, PLAN.CHAPEL_H - 0.3, 39, -(PLAN.R_AMB - 0.2), -(PLAN.R_AMB - 1.2), STONE);
      // 궁륭 끝 반달벽(별 판): 뾰족 궁륭 단면과 후진 반돔(반지름 13.1) 사이 — 1단계에서 이 틈으로 하늘이 보였다
      var lun = B('Z5b', 'star'), LZ = PLAN.APSE_C + 0.45, LR = PLAN.APSE_R + 0.1;
      for (k = 0; k < 20; k++) {
        var lu0 = -14.6 + 29.2 * k / 20, lu1 = -14.6 + 29.2 * (k + 1) / 20;
        var lb0 = 25 + Math.sqrt(Math.max(0, LR * LR - lu0 * lu0)) - 0.3, lb1 = 25 + Math.sqrt(Math.max(0, LR * LR - lu1 * lu1)) - 0.3;
        lun.addQuad([lu0, lb0, LZ], [lu1, lb1, LZ], [lu1, 25 + archY(lu1, 14.6, 13) + 0.2, LZ], [lu0, 25 + archY(lu0, 14.6, 13) + 0.2, LZ], STARV, [0, 30, 0]);
      }
      for (k = 0; k < 24; k++) { var la0 = k / 24 * Math.PI, la1 = (k + 1) / 24 * Math.PI; gd.addBeam([-Math.cos(la0) * LR, 25 + Math.sin(la0) * LR, LZ + 0.1], [-Math.cos(la1) * LR, 25 + Math.sin(la1) * LR, LZ + 0.1], 0.4, 0.3, GOLD); }
      // 제대(단 위 한 단 더) + 금빛 닫집(꼰 기둥 넷)
      boxA(f, -4.2, 4.2, SY, SY + 0.45, -43.6, -36.4, 0xf4efe6);
      boxA(f, -4.6, 4.6, SY, SY + 0.22, -44, -36, 0xf4efe6);
      ctx.floorZone({ x0: -4.2, x1: 4.2, z0: -43.6, z1: -36.4, y: SY + 0.45 });
      ctx.altar({ x: 0, z: -40, y: SY + 0.45, w: 3.2, d: 1.3, h: 1.04, style: 'block', candles: 6, flowers: true });
      // 금빛 고딕 닫집(참고 c2·high_altar): 묶음 금 기둥 넷 · 네 면 뾰족 아치 + 박공(안은 별 판) · 모서리 첨탑 · 가운데 팔각 첨탑과 작은 금 십자가
      (function gothicCanopy() {
        var y0 = SY + 0.45, hx = 3.1, hz = 2.9, cz = -40, sp = y0 + 4.6, ap = y0 + 6.2, gt = y0 + 8.8, st2 = B('Z5b', 'star');
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c) {
          var px = c[0] * hx, pz = cz + c[1] * hz;
          boxA(gd, px - 0.22, px + 0.22, y0, ap, pz - 0.22, pz + 0.22, GOLD);
          [[0.24, 0], [-0.24, 0], [0, 0.24], [0, -0.24]].forEach(function (o) { cylAt(gd, px + o[0], pz + o[1], y0, sp - y0, 0.07, 0.07, 6, 0xf0cf72); });
          gd.add(Geo.cyl(4, 0.02), GOLD, { x: px, y: ap, z: pz, sx: 0.36, sy: 3.4, sz: 0.36, ry: Math.PI / 4, vary: 0 });
          gd.add(Geo.sph(6, 4), 0xf0cf72, { x: px, y: ap + 3.45, z: pz, s: 0.12, vary: 0 });
          ctx.addCollider({ x: px, z: pz, r: 0.4 });
        });
        // 네 면: (가운데, 가로 단위, 반폭, 바깥 법선)
        [[0, cz + hz, 1, 0, hx, 0, 1], [0, cz - hz, 1, 0, hx, 0, -1], [hx, cz, 0, 1, hz, 1, 0], [-hx, cz, 0, 1, hz, -1, 0]].forEach(function (F) {
          var fx = F[0], fz = F[1], ux = F[2], uz = F[3], a = F[4] - 0.25, nx = F[5], nz = F[6];
          archRing(gd, fx, fz, ux, uz, a, sp, ap, 0, 0.32, GOLD, 10);
          archRing(gd, fx + nx * 0.06, fz + nz * 0.06, ux, uz, a - 0.3, sp + 0.1, ap - 0.35, 0, 0.1, 0xf0cf72, 10);
          gd.addTris([fx - ux * (a + 0.3), ap - 0.2, fz - uz * (a + 0.3), fx + ux * (a + 0.3), ap - 0.2, fz + uz * (a + 0.3), fx, gt, fz], GOLD, [fx + nx * 5, ap, fz + nz * 5]);
          st2.addTris([fx - ux * (a - 0.5) + nx * 0.03, ap + 0.05, fz - uz * (a - 0.5) + nz * 0.03, fx + ux * (a - 0.5) + nx * 0.03, ap + 0.05, fz + uz * (a - 0.5) + nz * 0.03, fx + nx * 0.03, gt - 1.0, fz + nz * 0.03], STARV, [fx + nx * 5, ap, fz + nz * 5]);
          gd.addBeam([fx - ux * (a + 0.3) + nx * 0.05, ap - 0.2, fz - uz * (a + 0.3) + nz * 0.05], [fx + nx * 0.05, gt, fz + nz * 0.05], 0.14, 0.12, 0xf0cf72);
          gd.addBeam([fx + nx * 0.05, gt, fz + nz * 0.05], [fx + ux * (a + 0.3) + nx * 0.05, ap - 0.2, fz + uz * (a + 0.3) + nz * 0.05], 0.14, 0.12, 0xf0cf72);
          gd.add(Geo.cyl(4, 0.02), GOLD, { x: fx, y: gt - 0.1, z: fz, sx: 0.16, sy: 0.9, sz: 0.16, ry: Math.PI / 4, vary: 0 });
        });
        // 닫집 아래 천장(별 판, 아래를 향함) + 지붕 판
        st2.addQuad([-hx, ap - 0.15, cz - hz], [hx, ap - 0.15, cz - hz], [hx, ap - 0.15, cz + hz], [-hx, ap - 0.15, cz + hz], STARV, [0, 0, cz]);
        boxA(gd, -hx - 0.3, hx + 0.3, ap - 0.15, ap + 0.15, cz - hz - 0.3, cz + hz + 0.3, GOLD);
        gd.add(Geo.cyl(8, 0.03), GOLD, { x: 0, y: ap + 0.15, z: cz, sx: 1.6, sy: gt + 2.2 - ap, sz: 1.6, vary: 0 });
        boxA(gd, -0.05, 0.05, gt + 2.3, gt + 3.1, cz - 0.05, cz + 0.05, 0xf0cf72); boxA(gd, -0.25, 0.25, gt + 2.75, gt + 2.85, cz - 0.05, cz + 0.05, 0xf0cf72);
      })();
      // 고딕 장식벽(첨탑 줄) + 감실 + 성체등 + 십자고상
      var RZ = -50.6;
      boxA(s, -8.2, 8.2, SY, SY + 2.2, RZ - 0.8, RZ + 0.5, STONE_W);
      boxA(gd, -7.8, 7.8, SY + 2.2, SY + 11, RZ - 0.6, RZ - 0.3, 0xb8903f);
      for (k = -3; k <= 3; k++) {
        var cx = k * 2.2;
        blindArch('Z5b', cx, RZ - 0.28, 1, 0, 0, 1, 0.78, SY + 2.9, SY + 7.2, SY + 8.6);
        cylAt(gd, cx + 1.1, RZ - 0.15, SY + 2.2, 8.8, 0.09, 0.09, 6, GOLD);
        gd.addTris([cx - 0.95, SY + 8.5, RZ - 0.12, cx + 0.95, SY + 8.5, RZ - 0.12, cx, SY + 10.4, RZ - 0.12], 0xe2b85a, [cx, SY + 9, RZ + 5]);
        gd.add(Geo.cyl(4, 0.02), GOLD, { x: cx, y: SY + 10.3, z: RZ - 0.3, sx: 0.3, sy: k === 0 ? 5.6 : 3.4, sz: 0.3, ry: Math.PI / 4, vary: 0 });
        gd.add(Geo.cyl(4, 0.02), GOLD, { x: cx + 1.1, y: SY + 11, z: RZ - 0.3, sx: 0.2, sy: 2.2, sz: 0.2, ry: Math.PI / 4, vary: 0 });
      }
      ctx.tabernacle({ x: 0, z: RZ + 0.75, y: SY + 2.2, ry: 0, lamp: true });
      ctx.crucifix({ x: 0, y: SY + 11.8, z: RZ - 0.1, h: 3.4, ry: 0 });
      ctx.addCollider({ x0: -8.3, x1: 8.3, z0: RZ - 0.9, z1: RZ + 0.6 });
      // 경배 천사 둘(실물 스캔 — 무릎 꿇은 천사, 1826 슈트론스도르프): 닫집 양옆에서 제대를 향해 반쯤 돌아 무릎 꿇는다. 촛대 한 쌍은 바깥으로
      [-1, 1].forEach(function (sd) {
        toZone('Z5b', function () { ctx.scan({ key: 'angel_kneeling_stronsdorf', x: sd * 4.6, y: SY, z: -39.2, ry: -sd * 1.05, mirror: sd > 0, h: 1.75, lodHide: 45 }, null); });
        cylAt(gd, sd * 6.6, -40, SY, 2.0, 0.16, 0.06, 8, GOLD); ctx.addFlame({ x: sd * 6.6, y: SY + 2.15, z: -40, scale: 1.4 });
      });
    })();

    // =====================================================================
    // 창 그림: 먼 창 = 아틀라스 한 장(20칸 한 메쉬, draw call 1), 가까운 8칸 = 한 장씩(1k). 파일 이름으로 걸린다
    // =====================================================================
    var farMesh, nearPool = [], nearTex = {}, pack = null;
    var placeholderAtlas = canvasTex(640, 416, function (g, w, h) {
      CHAPELS.forEach(function (c, i) { g.save(); g.translate((i % 10) * 64, (i / 10 | 0) * 208); placeholderPane(c.set, 100 + i)(g, 64, 208); g.restore(); });
    });
    function cellUV(i) { var cx = (i % 10) * 64, cy = (i / 10 | 0) * 208; return [cx / 640, 1 - (cy + 208) / 416, (cx + 64) / 640, 1 - cy / 416]; }
    // 그림 비율 그대로 3 × 8.6 m 창 자리에 맞춘다(늘이지 않음): 넓으면 폭 3 m·높이를 줄이고, 좁고 길면 높이 8.6 m·폭을 줄인다.
    // 남는 곳은 창 둘레 돌벽(깊은 창틀처럼)이 보인다. 그림 파일만 바꿔도(build_light_glass.py) 새 비율로 다시 맞춘다.
    var WIN_HMAX = 8.6;
    function winSize(key) {
      var n = pack && pack.near[key];
      if (!n) return { w: PLAN.WIN_W, h: WIN_HMAX };
      var asp = n.w / n.h;
      return asp >= PLAN.WIN_W / WIN_HMAX ? { w: PLAN.WIN_W, h: PLAN.WIN_W / asp } : { w: WIN_HMAX * asp, h: WIN_HMAX };
    }
    function winGeo(key, uv) { var sz = winSize(key); return { g: lancetGeo(sz.w, sz.h, sz.w * 0.87, uv), h: sz.h }; }
    function buildFar() {
      var geos = [], k;
      CHAPELS.forEach(function (c, i) {
        var wg = winGeo(c.key, pack ? pack.far.cells[c.key] : cellUV(i)), hgt = wg.h, g = wg.g;
        var m = new T.Matrix4().makeRotationY(c.theta * D2R).multiply(new T.Matrix4().makeTranslation(0, PLAN.WIN_TOP - hgt, -PLAN.WIN_PLANE + 0.01));
        g.applyMatrix4(m); geos.push(g.toNonIndexed());
      });
      var n = 0; geos.forEach(function (g) { n += g.attributes.position.count; });
      var pos = new Float32Array(n * 3), uvs = new Float32Array(n * 2), o = 0;
      geos.forEach(function (g) { pos.set(g.attributes.position.array, o * 3); uvs.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); });
      var bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(pos, 3)); bg.setAttribute('uv', new T.BufferAttribute(uvs, 2)); bg.computeBoundingSphere();
      return bg;
    }
    farMesh = new T.Mesh(buildFar(), glassMat(placeholderAtlas));
    farMesh.name = 'light_far_windows'; Z.Z5.group.add(farMesh); ctx.stats.meshes++;
    for (var pi = 0; pi < 8; pi++) {
      var nm = new T.Mesh(lancetGeo(PLAN.WIN_W, 8.6, 2.6), glassMat(null)); nm.visible = false; nm.userData.key = null;
      Z.Z5.group.add(nm); nearPool.push(nm); ctx.stats.meshes++;
    }
    var imgCache = {};
    function texFromURI(key, uri) {
      if (nearTex[key]) return nearTex[key];
      if (typeof Image === 'undefined') return null;
      var t = new T.Texture(); if (T.SRGBColorSpace !== undefined) t.colorSpace = T.SRGBColorSpace; else t.encoding = T.sRGBEncoding;
      var im = imgCache[key] || (imgCache[key] = new Image());
      im.onload = function () { t.image = im; t.needsUpdate = true; };
      im.src = uri; nearTex[key] = t;
      return t;
    }
    function applyPack(pk) {
      if (!pk || !pk.near) return;
      pack = pk;
      var ft = texFromURI('__far', pk.far.src);
      if (ft) { var old = farMesh.geometry; farMesh.geometry = buildFar(); old.dispose(); farMesh.material.map = ft; farMesh.material.needsUpdate = true; }
      var rt = pk.near.rose_marian && texFromURI('rose_marian', pk.near.rose_marian.src);
      if (rt) { roseIn.material.map = rt; roseIn.material.needsUpdate = true; roseOut.material.map = rt; roseOut.material.needsUpdate = true; }
      apseWins.forEach(function (aw) {
        var n = pk.near[aw.key]; var at = n && texFromURI(aw.key, n.src);
        if (!at) return;
        // 그림 비율 그대로 3.5 × 19 m 자리에 맞춘다(늘이지 않음, 꼭대기를 맞춘다)
        var asp = n.w / n.h, w = APSE_W, h = APSE_H;
        if (asp >= w / h) h = w / asp; else w = h * asp;
        aw.mesh.geometry.dispose(); aw.mesh.geometry = lancetGeo(w, h, w * 0.6);
        aw.mesh.position.y = APSE_SILL + APSE_H - h;
        aw.mesh.material.map = at; aw.mesh.material.needsUpdate = true;
      });
      Object.keys(mosaicMeshes).forEach(function (k) { var n = pk.near[k]; var mt = n && texFromURI(k, n.src); if (mt) { mosaicMeshes[k].material.map = mt; mosaicMeshes[k].material.needsUpdate = true; } });
      // 메달 홀 바닥 원판(사용자 그림, 개발용 빌드의 light/ 폴더에만 있다)
      if (medalMesh && typeof Image !== 'undefined' && document.head) {
        var useMedal = function () {
          if (disposed || !window.ChurchLightMedalFloor) return;
          var mi = new Image();
          mi.onload = function () { if (disposed) return; var t = new T.Texture(mi); if (T.SRGBColorSpace !== undefined) t.colorSpace = T.SRGBColorSpace; else t.encoding = T.sRGBEncoding; t.anisotropy = 4; t.needsUpdate = true; medalMesh.material.map = t; medalMesh.material.needsUpdate = true; nearTex.medal_floor = t; };
          mi.src = window.ChurchLightMedalFloor;
        };
        if (window.ChurchLightMedalFloor) useMedal();
        else { var ms = document.createElement('script'); ms.src = 'light/medal_floor.js'; ms.onload = useMedal; document.head.appendChild(ms); }
      }
      lastNearKey = '';
    }
    // 그림 팩은 이 성당에 들어올 때만 읽는다(출시 빌드에는 없다 → 자리표시 유리 그대로)
    (function loadPack() {
      if (window.ChurchLightGlass) { applyPack(window.ChurchLightGlass); return; }
      try {
        if (!document.head || !document.createElement) return;
        var sc = document.createElement('script');
        sc.src = 'light/gpack_light.js';
        sc.onload = function () { if (!disposed) applyPack(window.ChurchLightGlass); };
        sc.onerror = function () { /* 출시 빌드: 팩 없음 — 자리표시 유리 */ };
        document.head.appendChild(sc);
      } catch (e) { /* ignore */ }
    })();
    var disposed = false;
    var lastNearKey = '';
    function updateNear(cx, cz) {
      if (!pack) return;
      var d = CHAPELS.map(function (c, i) { var dx = c.window.x - cx, dz = c.window.z - cz; return [dx * dx + dz * dz, i]; }).sort(function (a, b) { return a[0] - b[0]; }).slice(0, 8);
      var want = d.map(function (e) { return CHAPELS[e[1]].key; }), key = want.join(',');
      if (key === lastNearKey) return;
      lastNearKey = key;
      // 이미 걸린 판은 그대로 두고 빠진 것만 바꾼다
      var free = nearPool.filter(function (m) { return want.indexOf(m.userData.key) < 0; });
      want.forEach(function (k) {
        if (nearPool.some(function (m) { return m.userData.key === k; })) return;
        var m = free.shift(); if (!m) return;
        var c = CHAPELS.filter(function (cc) { return cc.key === k; })[0], n = pack.near[k], wg = winGeo(k), hgt = wg.h;
        var t = texFromURI(k, n.src);
        m.geometry.dispose(); m.geometry = wg.g;
        m.material.map = t; m.material.needsUpdate = true;
        m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.updateMatrix();
        m.matrixAutoUpdate = false;
        m.matrix.makeRotationY(c.theta * D2R).multiply(new T.Matrix4().makeTranslation(0, PLAN.WIN_TOP - hgt, -PLAN.WIN_PLANE + 0.03));
        m.userData.key = k; m.visible = !!(t && t.image);
      });
      // 가까운 8칸에서 빠진 질감은 놓는다(GPU 에서 내림) — 상주 질감 상한
      Object.keys(nearTex).forEach(function (k) {
        if (k === '__far' || k === 'rose_marian' || k === 'medal_floor' || /^apse_|^mosaic_/.test(k)) return;
        if (want.indexOf(k) < 0) { nearTex[k].dispose(); delete nearTex[k]; }
      });
    }

    // ===== 시간대: 유리 밝기 =====
    ctx.onHour(function (env) {
      var k = 0.32 + 0.78 * (env.day === undefined ? 1 : env.day);
      glassMats.forEach(function (m) { m.color.setScalar(Math.min(1.1, k)); });
    });

    // ===== 구역 보이기 고리(Z1~Z7) =====
    var zoneNow = null, zt = 0;
    function setZone(zn) {
      if (zn === zoneNow) return;
      zoneNow = zn;
      var vis = VISIBLE[zn] || ZONES;
      ZONES.forEach(function (id) { Z[id].group.visible = vis.indexOf(id) >= 0; });
    }
    ctx.onUpdate(function (dt, t, camera) {
      zt -= dt;
      if (zt > 0 || !camera) return;
      zt = 0.2;
      var cp = camera.position;
      var zn0 = zoneOf(cp.x, cp.z);
      setZone(zn0 === 'Z2' && cp.z < 96.5 ? 'Z2s' : zn0);
      if (Z.Z5.group.visible) updateNear(cp.x, cp.z);
      // 가까운 창 판은 그림을 다 읽은 뒤에만 보인다(읽는 동안은 뒤의 먼 창 아틀라스가 보인다 — 검은 판이 번쩍이지 않게)
      for (var q = 0; q < nearPool.length; q++) { var nm2 = nearPool[q]; nm2.visible = !!(nm2.userData.key && nm2.material.map && nm2.material.map.image); }
    });

    // ===== 묶음 → 메쉬 =====
    var castKinds = { stone: true, paint: true, floor: false, gold: true, glow: false, star: true };
    ZONES.forEach(function (id) {
      var zz = Z[id];
      Object.keys(zz.b).forEach(function (kind) {
        var bt = zz.b[kind];
        if (!bt.p.length) return;
        var grp = bt.build(MAT[kind], 'light_' + id + '_' + kind, { cast: castKinds[kind], receive: kind !== 'glow', spatial: true });   // 큰 묶음은 공간 덩어리로(시야 밖 덩어리는 그리지 않는다)
        grp.children.slice().forEach(function (m) { zz.group.add(m); ctx.stats.meshes++; });
        stats.tris[id] = (stats.tris[id] || 0) + bt.p.length / 9;
      });
    });
    ctx.setCameraBounds({ x0: -58.4, x1: 58.4, z0: -71, z1: 207, yMax: 78 });   // yMax: 그림자 상자도 이 높이까지 덮는다(돔·궁륭이 해를 가리게)
    // 시험·측정용 공개 값
    ChurchBuilders.light.runtime = { zones: Z, stats: stats, mats: MAT, setZone: setZone, zoneOf: zoneOf, nearPool: nearPool, farMesh: farMesh, chapelInst: chapelInst, partInst: partInst, updateNear: updateNear, dispose: function () { disposed = true; } };
  }

  ChurchBuilders.light = {
    layout: layout,
    fictional: true,
    thumb: { x: 0, z: 203, yaw: 0, pitch: 14, zoom: 1, hour: 15.5 },
    plan: PLAN, chapels: CHAPELS, partitions: PARTITIONS, doors: DOORS, zones: ZONES, zoneOf: zoneOf, visible: VISIBLE,
    build: build
  };
})();
