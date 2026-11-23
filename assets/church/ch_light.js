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
  // 그 구역에 있을 때 그리는 구역(문·아치로 이어져 보이는 곳). 로툰다 묶음(Z4·Z5·Z5b)은 한 팩
  var R_GRP = ['Z4', 'Z5', 'Z5b'];
  var VISIBLE = {
    Z1: ['Z1', 'Z2', 'Z3'], Z2: ['Z1', 'Z2', 'Z3'].concat(R_GRP), Z3: ['Z1', 'Z2', 'Z3'].concat(R_GRP),
    Z4: ['Z2', 'Z3'].concat(R_GRP), Z5: ['Z2', 'Z3'].concat(R_GRP), Z5b: ['Z3'].concat(R_GRP), Z6: R_GRP, Z7: R_GRP
  };

  // ---- 레이아웃(순수 자료) ----
  var seatGroups = [];
  [['L', -5.5, -0.95], ['R', 5.5, 0.95]].forEach(function (g) {
    seatGroups.push({ g: g[0], rows: 14, perRow: 6, origin: { x: g[1], z: -17 }, dx: g[2], dz: 1.7, rowDx: 0, yaw: 0 });
  });
  // 경당마다 봉헌초 받침(4칸 × 2줄): 경당 오른쪽(시계 반대 쪽) 벽 앞, 경당 축을 바라본다
  var stands = CHAPELS.map(function (c) {
    var a = c.theta * D2R, ca = Math.cos(a), sa = Math.sin(a);
    var lx = 3.4, lz = -51.2;   // 모듈 좌표(θ=0 경당: 축이 -z)
    return { x: lx * ca + lz * sa, z: -lx * sa + lz * ca, slots: 8, cols: 4, pitch: 0.3, step: 0.28, ystep: 0.22, y0: 0.95, reach: 1.6, face: [-ca, sa] };
  });
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
    var starTex = canvasTex(256, 256, function (g, w, h) {
      g.fillStyle = '#1b2a63'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 26; i++) {
        var x = starRng() * w, y = starRng() * h, r = 2 + starRng() * 3;
        g.fillStyle = '#e8c56a'; g.beginPath();
        for (var k = 0; k < 10; k++) { var a = k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        g.closePath(); g.fill();
      }
    }, [1, 1]);
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
    })();
    (function entryHall() {
      var s = B('Z1', 'stone'), f = B('Z1', 'floor'), p = B('Z1', 'paint'), gd = B('Z1', 'gold');
      var H = E.wallH, h = E.half, cz = (E.crossZ0 + E.crossZ1) / 2, ch = (E.crossZ1 - E.crossZ0) / 2;
      floorQuad(f, -h, h, E.z0, E.z1, 0, MARBLE);
      floorQuad(f, -E.crossHalf, -h, E.crossZ0, E.crossZ1, 0, MARBLE); floorQuad(f, h, E.crossHalf, E.crossZ0, E.crossZ1, 0, MARBLE);
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
        // 사도 벽감 12(가로대 양쪽 팔의 벽: 각 팔 6) — 1단계는 빈 벽감(조각은 2단계)
        for (var k = 0; k < 3; k++) {
          var nx2 = sg * (h + 4 + k * 6.3);
          [[E.crossZ1, -1], [E.crossZ0, 1]].forEach(function (wz) {
            var zz = wz[0] + wz[1] * 0.02;
            archRing(gd, nx2, zz, 1, 0, 1.1, 4.2, 5.6, 0, 0.14, GOLD, 8);
            boxA(p, nx2 - 1.0, nx2 + 1.0, 1.1, 4.2, zz - 0.01, zz + 0.01, 0x3a3550);
            boxA(s, nx2 - 0.8, nx2 + 0.8, 0, 1.1, wz[0] + wz[1] * 0.5 - 0.5, wz[0] + wz[1] * 0.5 + 0.5, STONE_D);
          });
        }
      });
      // 뒷벽(구슬 회랑 쪽, 가운데 통로 반폭 4 · 높이 10)
      archWall(s, 0, E.z0 - 0.5, 1, 0, h + 1, H + E.rise + 1, 1, 4, 7.4, 10, STONE, 8);
      ctx.addCollider({ x0: -h - 1, x1: -4, z0: E.z0 - 1, z1: E.z0 }); ctx.addCollider({ x0: 4, x1: h + 1, z0: E.z0 - 1, z1: E.z0 });
      // 궁륭: 세로 팔·가로대 원통(뾰족) + 교차부 교차 궁륭(두 원통 중 높은 쪽)
      var VB = function (u) { return H + archY(u, h, E.rise); };
      ceilGrid(p, 10, 6, function (u, v) { var x = -h + 2 * h * u, z = E.crossZ1 + (E.z1 - E.crossZ1) * v; return [x, VB(x), z]; }, 0xe8dcc6);
      ceilGrid(p, 10, 3, function (u, v) { var x = -h + 2 * h * u, z = E.z0 + (E.crossZ0 - E.z0) * v; return [x, VB(x), z]; }, 0xe8dcc6);
      [-1, 1].forEach(function (sg) {
        ceilGrid(p, 6, 10, function (u, v) { var x = sg * (h + (E.crossHalf - h) * u), z = E.crossZ0 + 2 * ch * v; return [x, VB(z - cz), z]; }, 0xe8dcc6, false);
      });
      ceilGrid(p, 12, 12, function (u, v) { var x = -h + 2 * h * u, z = E.crossZ0 + 2 * ch * v; return [x, Math.max(VB(x), VB(z - cz)), z]; }, 0xe8dcc6);
      // 교차부 대각 리브(금)
      for (var k = 0; k < 12; k++) {
        var t0 = -1 + k / 6, t1 = -1 + (k + 1) / 6;
        [1, -1].forEach(function (d) {
          gd.addBeam([t0 * h, VB(t0 * h) - 0.15, cz + d * t0 * h], [t1 * h, VB(t1 * h) - 0.15, cz + d * t1 * h], 0.35, 0.3, GOLD);
        });
      }
      // 큰 십자고상(정거장 3): 교차부 한가운데 받침 위
      boxA(s, -1.4, 1.4, 0, 1.2, 155.6, 158.4, STONE_D);
      ctx.addCollider({ x: 0, z: 157, r: 1.9 });
      ctx.crucifix({ x: 0, y: 1.2, z: 157, h: 5.2, ry: 0, scan: true });
      // 성수반(정거장 5)
      ctx.holyFont({ x: 5, z: 178.3, ry: 0 });
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
      var s = B('Z2', 'stone'), f = B('Z2', 'floor'), p = B('Z2', 'paint'), gd = B('Z2', 'gold');
      floorQuad(f, -8, 8, 80, 141, 0, MARBLE);
      ROOMS.forEach(function (R) {
        var cz = (R.z0 + R.z1) / 2, hz = (R.z1 - R.z0) / 2;
        [-1, 1].forEach(function (sg) {
          boxA(s, sg * R.half, sg * (R.half + 1), 0, R.H, R.z0, R.z1, STONE);
          ctx.addCollider({ x0: sg > 0 ? R.half : -R.half - 1, x1: sg > 0 ? R.half + 1 : -R.half, z0: R.z0, z1: R.z1 });
        });
        // 돛 궁륭(네 벽에서 시작해 가운데가 오른다)
        ceilGrid(p, 10, 10, function (u, v) {
          var x = -R.half + 2 * R.half * u, z = R.z0 + 2 * hz * v, ex = x / R.half, ez = (z - cz) / hz;
          return [x, R.H + R.rise * (1 - ex * ex) * (1 - ez * ez), z];
        }, 0xe9dfca);
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
        ceilGrid(p, 6, 2, function (u, v) { var x = -4 + 8 * u; return [x, 7.4 + archY(x, 4, 2.6), c[0] + (c[1] - c[0]) * v]; }, 0xe0d4be);
      });
      // 영광송 방 남쪽 끝(메달 홀 쪽) 벽
      archWall(s, 0, 80, 1, 0, 9, 21, 1, 4, 7.4, 10, STONE, 8);
      ctx.addCollider({ x0: -9, x1: -4, z0: 79.5, z1: 80.5 }); ctx.addCollider({ x0: 4, x1: 9, z0: 79.5, z1: 80.5 });
    })();

    // =====================================================================
    // Z3 메달 홀(성모 경당): 둥근 방(반지름 11.5), 파란 별 돔. 성모상은 shrine_places.js(light) 가 모신다
    // =====================================================================
    var M = PLAN.MEDAL;
    (function medal() {
      var s = B('Z3', 'stone'), f = B('Z3', 'floor'), p = B('Z3', 'paint'), gd = B('Z3', 'gold');
      var N = 32, Rw = M.r + 0.5, H = 14;
      for (var x0 = -12; x0 < 12; x0 += 4) floorQuad(f, x0, x0 + 4, M.cz - 12, M.cz + 12, 0, MARBLE);
      // 바닥 무늬(메달: 열두 별 고리 — 글자 없음)
      for (var k = 0; k < 12; k++) { var a = k / 12 * Math.PI * 2; p.add(Geo.cyl(5, 1), 0x8a6a35, { x: Math.cos(a) * 3.2, y: 0.01, z: M.cz + Math.sin(a) * 3.2, sx: 0.32, sy: 0.02, sz: 0.32, vary: 0 }); }
      for (k = 0; k < N; k++) {
        var a0 = (k / N) * Math.PI * 2, a1 = ((k + 1) / N) * Math.PI * 2, am = (a0 + a1) / 2;
        var mx = Math.sin(am) * Rw, mz = M.cz + Math.cos(am) * Rw;
        if (Math.abs(mx) < 4.6) continue;   // 북(회랑)·남(로툰다) 문
        var ax = Math.sin(a0) * Rw, az = M.cz + Math.cos(a0) * Rw, bx = Math.sin(a1) * Rw, bz = M.cz + Math.cos(a1) * Rw;
        segBox(s, ax, az, bx, bz, 0, H, 1.0, STONE);
        addSeg(ax, az, bx, bz, 0.5);
      }
      // 문 위 상인방(돔 아래 벽)
      [1, -1].forEach(function (d) { boxA(s, -4.6, 4.6, 10, H, M.cz + d * (Rw - 0.5) - 0.5, M.cz + d * (Rw - 0.5) + 0.5, STONE); archRing(gd, 0, M.cz + d * (Rw - 1.02), 1, 0, 4, 7.4, 10, 0, 0.25, GOLD, 8); });
      // 돔(반구, 안쪽): 파란 바탕 금별
      var dg = new T.SphereGeometry(M.r, low ? 24 : 36, low ? 8 : 12, 0, Math.PI * 2, 0, Math.PI / 2);
      var dm = new T.Mesh(dg, new T.MeshStandardMaterial({ map: starTex, roughness: 0.8, side: T.BackSide }));
      dm.position.set(0, H, M.cz); dm.castShadow = true; Z.Z3.group.add(dm);
      for (k = 0; k < 64; k++) { var b0 = k / 64 * Math.PI * 2, b1 = (k + 1) / 64 * Math.PI * 2; gd.addBeam([Math.sin(b0) * (M.r - 0.1), H, M.cz + Math.cos(b0) * (M.r - 0.1)], [Math.sin(b1) * (M.r - 0.1), H, M.cz + Math.cos(b1) * (M.r - 0.1)], 0.35, 0.3, GOLD); }
      // 로툰다 쪽 짧은 통로(서문, 반폭 4)
      [-1, 1].forEach(function (sg) { boxA(s, sg * 4, sg * 5, 0, 12, 54.4, 57.6, STONE); ctx.addCollider({ x0: sg > 0 ? 4 : -5, x1: sg > 0 ? 5 : -4, z0: 54.4, z1: 57.6 }); });
      boxA(p, -4, 4, 12, 12.3, 54.4, 57.6, 0xe0d4be);
      floorQuad(f, -4, 4, 54, 57.6, 0, MARBLE);
    })();

    // =====================================================================
    // Z4 로툰다: 바닥(묵주 상감), 기둥 12, 아케이드, 주보랑 궁륭, 드럼 창 50, 돔(열두 리브 별), 등탑, 묵주 등
    // =====================================================================
    (function rotunda() {
      var s = B('Z4', 'stone'), f = B('Z4', 'floor'), p = B('Z4', 'paint'), gd = B('Z4', 'gold'), gl = B('Z4', 'glow');
      var RS = low ? 48 : 72, k, i;
      // 바닥: 원판(반지름 57.6) — 부채꼴 띠
      for (k = 0; k < RS; k++) {
        var a0 = k / RS * Math.PI * 2, a1 = (k + 1) / RS * Math.PI * 2;
        [[0, 20], [20, 42], [42, PLAN.R_BACK]].forEach(function (rr, ri) {
          var c = ri === 1 ? 0xf2ece2 : MARBLE;
          f.addQuad([Math.sin(a0) * rr[0], 0, Math.cos(a0) * rr[0]], [Math.sin(a1) * rr[0], 0, Math.cos(a1) * rr[0]], [Math.sin(a1) * rr[1], 0, Math.cos(a1) * rr[1]], [Math.sin(a0) * rr[1], 0, Math.cos(a0) * rr[1]], c, [0, 5, 0], { vary: 0.01 });
        });
      }
      // 바닥의 묵주(정거장 46): 반지름 27 고리에 구슬 55(작은 50 + 큰 5), 입구 쪽 늘어진 줄 4알(큰 1·작은 3) — 59알(고리 55 + 줄 4) + 십자가
      for (i = 0; i < 55; i++) {
        var big = i % 11 === 0, th = 180 + (i + 0.5) * 360 / 55, q = P(27, th);
        p.add(Geo.cyl(10, 1), 0x8a6a35, { x: q.x, y: 0.005, z: q.z, sx: big ? 0.42 : 0.22, sy: 0.02, sz: big ? 0.42 : 0.22, vary: 0 });
      }
      for (i = 0; i < 4; i++) p.add(Geo.cyl(10, 1), 0x8a6a35, { x: 0, y: 0.005, z: 28.6 + i * 1.5, sx: i === 3 ? 0.42 : 0.22, sy: 0.02, sz: i === 3 ? 0.42 : 0.22, vary: 0 });
      boxA(p, -0.08, 0.08, 0.005, 0.03, 35.2, 37.6, 0x8a6a35); boxA(p, -0.7, 0.7, 0.005, 0.03, 35.9, 36.1, 0x8a6a35);
      // 기둥 12(설계 θ = 15 + 30k)
      for (k = 0; k < 12; k++) {
        var pc = P(PLAN.R_DOME, 15 + 30 * k);
        cylAt(s, pc.x, pc.z, 0, 0.8, PLAN.PIER_R + 0.35, PLAN.PIER_R + 0.25, 16, STONE_D);
        cylAt(s, pc.x, pc.z, 0.8, PLAN.ARCADE_SPRING - 2.0, PLAN.PIER_R, PLAN.PIER_R, 20, STONE_W);
        cylAt(gd, pc.x, pc.z, PLAN.ARCADE_SPRING - 1.2, 1.2, PLAN.PIER_R, PLAN.PIER_R + 0.5, 16, GOLD);
        cylAt(s, pc.x, pc.z, PLAN.ARCADE_SPRING - 1.2 - 0.8, 0.8, PLAN.PIER_R + 0.1, PLAN.PIER_R + 0.1, 16, STONE);
        ctx.addCollider({ x: pc.x, z: pc.z, r: PLAN.PIER_R + 0.35 });
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
      // 처마 돌림띠(36)
      for (k = 0; k < RS; k++) { var c0 = k / RS * Math.PI * 2, c1 = (k + 1) / RS * Math.PI * 2; gd.addBeam([Math.sin(c0) * 29.4, PLAN.DRUM_Y0, Math.cos(c0) * 29.4], [Math.sin(c1) * 29.4, PLAN.DRUM_Y0, Math.cos(c1) * 29.4], 0.5, 0.6, GOLD); }
      // 주보랑 궁륭(고리 반원통: r 42 에서 21 → r 30 에서 32.4): 파란 칠
      var ambN = low ? 48 : 72;
      for (k = 0; k < ambN; k++) {
        var e0 = k / ambN * Math.PI * 2, e1 = (k + 1) / ambN * Math.PI * 2;
        for (j = 0; j < 6; j++) {
          // 바깥(경당 쪽 r 42, 21 m)에서 안쪽(기둥 아케이드 r 30, 32.4 m — 아치 꼭대기 31.3 보다 높게)으로 오르는 반원통: 아치 너머로 하늘이 보이지 않는다
          var r0 = 30 + 12 * j / 6, r1 = 30 + 12 * (j + 1) / 6, h0 = 21 + 11.4 * Math.sin(Math.PI / 2 * (6 - j) / 6), h1 = 21 + 11.4 * Math.sin(Math.PI / 2 * (6 - j - 1) / 6);
          p.addQuad([Math.sin(e0) * r0, h0, Math.cos(e0) * r0], [Math.sin(e1) * r0, h0, Math.cos(e1) * r0], [Math.sin(e1) * r1, h1, Math.cos(e1) * r1], [Math.sin(e0) * r1, h1, Math.cos(e0) * r1], j === 2 || j === 3 ? BLUE : BLUE_D, [0, 0, 0], { vary: 0.03 });
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
      for (k = 0; k < 110; k++) { var g0 = k / 110 * Math.PI * 2, g1 = (k + 1) / 110 * Math.PI * 2; gd.addBeam([Math.sin(g0) * 15, RY, Math.cos(g0) * 15], [Math.sin(g1) * 15, RY, Math.cos(g1) * 15], 0.35, 0.45, GOLD); }
      for (k = 0; k < 55; k++) {
        var big2 = k % 11 === 0, gq = P(15, 180 + k * 360 / 55);
        gl.add(Geo.sph(8, 6), new T.Color(big2 ? 0xffe2a6 : 0xffd890).multiplyScalar(big2 ? 2.2 : 1.7), { x: gq.x, y: RY - (big2 ? 0.9 : 0.55), z: gq.z, s: big2 ? 0.55 : 0.28, vary: 0 });
        if (big2) gd.add(Geo.cyl(6, 0.6), GOLD, { x: gq.x, y: RY - 1.6, z: gq.z, sx: 0.45, sy: 0.7, sz: 0.45, vary: 0 });
      }
      for (k = 0; k < 10; k++) { var cq = P(15, k * 36), tq = P(4, k * 36); gd.addBeam([cq.x, RY, cq.z], [tq.x, PLAN.DOME_APEX - 2, tq.z], 0.07, 0.07, 0x6b5a3a); }
      ctx.addGlow({ x: 0, y: RY - 1, z: 0, size: 34, color: 0xffd58a, kind: 'lamp' });
    })();
    // 돔(반구 안쪽, 반지름 30, 44 → 74): 파란 바탕 금별 + 열두 리브(금, 자오선) + 열두 갈래 별(지그재그 리브) — 리브는 한 갈래를 12번 돌린 InstancedMesh
    var domeMesh, ribInst, drumWin;
    (function dome() {
      var Rd = PLAN.R_DOME - 0.05, segW = low ? 48 : 72, segH = low ? 12 : 18, th0 = Math.asin(3.2 / Rd);
      var dg = new T.SphereGeometry(Rd, segW, segH, 0, Math.PI * 2, th0, Math.PI / 2 - th0);
      var dt = starTex.clone(); dt.needsUpdate = true; dt.wrapS = dt.wrapT = T.RepeatWrapping; dt.repeat.set(12, 4);
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
    })();
    ctx.renderSeats(layout, 'bench');
    ctx.addLight({ x: 0, y: 24, z: -6, color: 0xffd9a8, intensity: 1.0, distance: 64, kind: 'lamp' });

    // =====================================================================
    // Z5 신비 경당 고리: 경당 한 칸 모듈(로컬 θ=0, 축이 -z) × 20, 칸막이 모듈 × 24 — InstancedMesh
    // =====================================================================
    var chapelInst = [], partInst = [];
    (function ring() {
      var sb = newBatch('stone', 21), pb = newBatch('paint', 22), gb = newBatch('gold', 23), wb = newBatch('paint', 24);
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
      boxA(wb, -0.8, 0.8, 1.35, 2.35, zIn - 0.0, zIn + 0.05, 0x6e5530);   // 빈 청동판 자리(그림·글자 없음)
      // 입구(반지름 42) 위 벽과 뾰족 아치(반폭 4.2, 시작 11, 꼭대기 15.2)
      var zm = -(PLAN.R_AMB - 0.4), mw = hw(PLAN.R_AMB) + 0.2;
      archWall(sb, 0, zm, 1, 0, mw, PLAN.CHAPEL_H, 0.8, 4.3, 11, 15.4, STONE, 10);
      archRing(gb, 0, zm, 1, 0, 4.3, 11, 15.4, 0.45, 0.22, GOLD, 10);
      // 천장: 뾰족 원통 궁륭(축 방향, 16 → 20.2) — 칸이 넓어지는 쐐기라 폭을 따라 넓힌다 + 위 덮개
      ceilGrid(pb, 8, 6, function (u, v) {
        var z = -(PLAN.R_AMB - 0.2) - (PLAN.R_BACK - PLAN.R_AMB - 0.4) * v, half = -z * Math.tan(6.5 * D2R) - 0.45, x = -half + 2 * half * u;
        return [x, 16 + archY(x, half, 4.2), z];
      }, BLUE);
      [-1, 1].forEach(function (d) {
        for (var k = 0; k < 6; k++) {
          var v0 = k / 6, v1 = (k + 1) / 6, z0 = -(PLAN.R_AMB) - (PLAN.R_BACK - PLAN.R_AMB) * v0, z1 = -(PLAN.R_AMB) - (PLAN.R_BACK - PLAN.R_AMB) * v1;
          var x0 = d * (-z0 * Math.tan(6.5 * D2R) - 0.5) * (1 - 2 * v0), x1 = d * (-z1 * Math.tan(6.5 * D2R) - 0.5) * (1 - 2 * v1);
          gb.addBeam([x0, 16 + archY(x0, -z0 * Math.tan(6.5 * D2R) - 0.45, 4.2) - 0.12, z0], [x1, 16 + archY(x1, -z1 * Math.tan(6.5 * D2R) - 0.45, 4.2) - 0.12, z1], 0.22, 0.2, GOLD);
        }
      });
      pb.addQuad([-hw(PLAN.R_AMB) - 1, PLAN.CHAPEL_H, -PLAN.R_AMB + 0.5], [hw(PLAN.R_AMB) + 1, PLAN.CHAPEL_H, -PLAN.R_AMB + 0.5], [hw(PLAN.R_BACK) + 1, PLAN.CHAPEL_H, -PLAN.R_BACK], [-hw(PLAN.R_BACK) - 1, PLAN.CHAPEL_H, -PLAN.R_BACK], 0x3a3446, [0, 0, -50]);
      // 무릎틀(둘이 쓰는 나무 틀): 반지름 53
      boxA(wb, -1.1, 1.1, 0, 0.18, -53.25, -52.75, WOOD);
      boxA(wb, -1.1, 1.1, 0.75, 0.88, -53.95, -53.6, WOOD);
      [-1.05, 1.05].forEach(function (x) { boxA(wb, x - 0.05, x + 0.05, 0, 0.88, -53.95, -52.75, WOOD); });
      // 봉헌초 받침(로컬 x 3.4, z -51.2; 칸은 layout.candles — 초는 코어가 그린다): 두 단 선반 + 철 받침
      var st = { x: 3.4, z: -51.2 };
      boxA(wb, st.x - 0.05, st.x + 0.35, 0, 0.88, st.z - 0.62, st.z + 0.62, 0x2e2a28);
      boxA(wb, st.x + 0.1, st.x + 0.42, 0.88, 1.17, st.z - 0.62, st.z + 0.62, 0x2e2a28);
      boxA(gb, st.x - 0.08, st.x + 0.45, 0.86, 0.89, st.z - 0.65, st.z + 0.65, 0x8c6a32);

      // 칸막이 모듈(로컬: θ=0 방향 반지름 42 → 57.6, 두께 1.1) + 입구 쪽 붙은 기둥
      var qb = newBatch('stone', 25), qg = newBatch('gold', 26);
      boxA(qb, -0.55, 0.55, 0, PLAN.CHAPEL_H, -PLAN.R_BACK, -PLAN.R_AMB, STONE);
      qb.add(Geo.cyl(14, 1), STONE_W, { x: 0, y: 0, z: -PLAN.R_AMB, sx: 0.75, sy: 11, sz: 0.75, flat: false, vary: 0.02 });
      qg.add(Geo.cyl(12, 1.25), GOLD, { x: 0, y: 10.4, z: -PLAN.R_AMB, sx: 0.78, sy: 0.6, sz: 0.78, vary: 0 });

      var m4 = new T.Matrix4();
      function inst(batch, mat, n, name, list, angles) {
        var g = batch.build(mat, name).children[0].geometry;
        var im = new T.InstancedMesh(g, mat, n);
        for (var k = 0; k < n; k++) { m4.makeRotationY(angles[k] * D2R); im.setMatrixAt(k, m4); }
        im.frustumCulled = false; im.castShadow = mat !== MAT.glow; im.receiveShadow = true;
        Z.Z5.group.add(im); ctx.stats.meshes++; list.push(im);
        stats.instTris += g.attributes.position.count / 3 * n;
        return im;
      }
      var cAng = CHAPELS.map(function (c) { return c.theta; });
      inst(sb, MAT.stone, 20, 'light_chapel_stone', chapelInst, cAng);
      inst(pb, MAT.paint, 20, 'light_chapel_paint', chapelInst, cAng);
      inst(gb, MAT.gold, 20, 'light_chapel_gold', chapelInst, cAng);
      inst(wb, MAT.wood, 20, 'light_chapel_wood', chapelInst, cAng);
      inst(qb, MAT.stone, PARTITIONS.length, 'light_partition', partInst, PARTITIONS);
      inst(qg, MAT.gold, PARTITIONS.length, 'light_partition_gold', partInst, PARTITIONS);

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
      var hd = new T.SphereGeometry(PLAN.APSE_R + 0.1, 32, 10, Math.PI / 2, Math.PI, 0, Math.PI / 2);
      var hdm = new T.Mesh(hd, new T.MeshStandardMaterial({ map: mosaicTex('apse'), color: 0xffe7b0, roughness: 0.4, metalness: 0.4, side: T.BackSide, emissive: 0x3a2a08, emissiveIntensity: 0.3 }));
      hdm.position.set(0, 25, PLAN.APSE_C); hdm.castShadow = true; Z.Z5b.group.add(hdm);
      // 제단 칸 궁륭(반지름 42 → 후진, 시작 25 → 38) + 앞 벽
      ceilGrid(p, 10, 4, function (u, v) { var x = -14.6 + 29.2 * u, z = -(PLAN.R_AMB - 0.5) + (PLAN.APSE_C + 0.4 + PLAN.R_AMB - 0.5) * v; return [x, 25 + archY(x, 14.6, 13), z]; }, BLUE);
      boxA(s, -15, 15, PLAN.CHAPEL_H - 0.3, 39, -(PLAN.R_AMB - 0.2), -(PLAN.R_AMB - 1.2), STONE);
      // 제대(단 위 한 단 더) + 금빛 닫집(꼰 기둥 넷)
      boxA(f, -4.2, 4.2, SY, SY + 0.45, -43.6, -36.4, 0xf4efe6);
      boxA(f, -4.6, 4.6, SY, SY + 0.22, -44, -36, 0xf4efe6);
      ctx.floorZone({ x0: -4.2, x1: 4.2, z0: -43.6, z1: -36.4, y: SY + 0.45 });
      ctx.altar({ x: 0, z: -40, y: SY + 0.45, w: 3.2, d: 1.3, h: 1.04, style: 'block', candles: 6, flowers: true });
      ctx.baldachin({ x: 0, z: -40, y: SY + 0.45, w: 6.4, d: 6.0, h: 8.5, canopyH: 2.6, style: 'twisted', gold: GOLD, cross: true });
      // 고딕 장식벽(첨탑 줄) + 감실 + 성체등 + 십자고상
      var RZ = -50.6;
      boxA(s, -8.2, 8.2, SY, SY + 2.2, RZ - 0.8, RZ + 0.5, STONE_W);
      boxA(gd, -7.8, 7.8, SY + 2.2, SY + 11, RZ - 0.6, RZ - 0.3, 0xb8903f);
      for (k = -3; k <= 3; k++) {
        var cx = k * 2.2;
        boxA(p, cx - 0.75, cx + 0.75, SY + 3.0, SY + 7.4, RZ - 0.29, RZ - 0.27, 0x7d1d2a);
        archRing(gd, cx, RZ - 0.26, 1, 0, 0.8, SY + 7.4, SY + 8.6, 0, 0.12, GOLD, 6);
        cylAt(gd, cx + 1.1, RZ - 0.15, SY + 2.2, 8.8, 0.09, 0.09, 6, GOLD);
        gd.add(Geo.cyl(4, 0.02), GOLD, { x: cx, y: SY + 11, z: RZ - 0.45, sx: 0.5, sy: k === 0 ? 5.5 : 3.2, sz: 0.4, vary: 0 });
      }
      ctx.tabernacle({ x: 0, z: RZ + 0.75, y: SY + 2.2, ry: 0, lamp: true });
      ctx.crucifix({ x: 0, y: SY + 11.8, z: RZ - 0.1, h: 3.4, ry: 0 });
      ctx.addCollider({ x0: -8.3, x1: 8.3, z0: RZ - 0.9, z1: RZ + 0.6 });
      // 천사(제대 옆 무릎 꿇은 조각 대신 단순한 촛대 한 쌍)
      [-5.5, 5.5].forEach(function (x) { cylAt(gd, x, -40, SY, 2.0, 0.16, 0.06, 8, GOLD); ctx.addFlame({ x: x, y: SY + 2.15, z: -40, scale: 1.4 }); });
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
        if (k === '__far' || k === 'rose_marian' || /^apse_|^mosaic_/.test(k)) return;
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
      setZone(zoneOf(cp.x, cp.z));
      if (Z.Z5.group.visible) updateNear(cp.x, cp.z);
      // 가까운 창 판은 그림을 다 읽은 뒤에만 보인다(읽는 동안은 뒤의 먼 창 아틀라스가 보인다 — 검은 판이 번쩍이지 않게)
      for (var q = 0; q < nearPool.length; q++) { var nm2 = nearPool[q]; nm2.visible = !!(nm2.userData.key && nm2.material.map && nm2.material.map.image); }
    });

    // ===== 묶음 → 메쉬 =====
    var castKinds = { stone: true, paint: true, floor: false, gold: true, glow: false };
    ZONES.forEach(function (id) {
      var zz = Z[id];
      Object.keys(zz.b).forEach(function (kind) {
        var bt = zz.b[kind];
        if (!bt.p.length) return;
        var grp = bt.build(MAT[kind], 'light_' + id + '_' + kind, { cast: castKinds[kind], receive: kind !== 'glow' });
        grp.children.forEach(function (m) { zz.group.add(m); ctx.stats.meshes++; });
        stats.tris[id] = (stats.tris[id] || 0) + bt.p.length / 9;
      });
    });
    ctx.setCameraBounds({ x0: -58.4, x1: 58.4, z0: -71, z1: 207, yMax: 78 });   // yMax: 그림자 상자도 이 높이까지 덮는다(돔·궁륭이 해를 가리게)
    // 시험·측정용 공개 값
    ChurchBuilders.light.runtime = { zones: Z, stats: stats, setZone: setZone, zoneOf: zoneOf, nearPool: nearPool, farMesh: farMesh, chapelInst: chapelInst, partInst: partInst, updateNear: updateNear, dispose: function () { disposed = true; } };
  }

  ChurchBuilders.light = {
    layout: layout,
    fictional: true,
    thumb: { x: 0, z: 203, yaw: 0, pitch: 14, zoom: 1, hour: 15.5 },
    plan: PLAN, chapels: CHAPELS, partitions: PARTITIONS, doors: DOORS, zones: ZONES, zoneOf: zoneOf, visible: VISIBLE,
    build: build
  };
})();
