/* ch_yeouido.js — 천주교 서울대교구 여의도동성당(서울 영등포구 여의동로 257, 1984년 성전 축성) 성전 내부.
   조사·설계: docs/church/interiors/yeouido.md. 치수는 본당 누리집 사진에서 추정한 값이다(실측 아님, scalePercent 100).
   - 넓은 직사각 홀(안폭 22m, 정면 벽~뒷벽 31m) + 반원 제단 후진(반지름 5.5m): 흰 원기둥 9개가 둥글게 서고 그 사이는
     짙은 회녹색 홈 줄 콘크리트 판, 위는 크림색 원통 벽. 제단은 3단(0.6m) 위.
   - 옆벽·뒷벽은 세로 홈 줄이 난 거친 콘크리트(사진의 회녹색 벽), 위쪽에 좁고 긴 창. 정면 벽 후진 양옆에 큰 창 한 쌍.
   - 바닥: 크림색 타일 모서리마다 갈색 마름모(사진). 신자석: 밝은 갈색 긴 의자. 뒤쪽 위 성가대석(걷지 못함).
   - 천장: 평천장(10m) 가운데 팔각 오목(11m, 둘레 간접등) — 바깥 초록 동판 팔각 지붕에서 추정한 모양이다.
   - 권리(yeouido.md §4): 성당의 유리화·부활하신 그리스도 상·감실 부조·독서대 조각·파티마 성모상은 작가가 확인되지 않은
     현대 작품이라 복제·모사하지 않는다. 창 = 무늬 없는 옅은 빛 유리(격자만), 십자가 = 일반 형태의 나무 십자가,
     감실·독서대 = 문양 없는 상자, 성모상 = 앱 공용 3D 성모상(shrine.js, mesh 'mary_meshy').
   - 재질: 바닥 타일·홈 줄 콘크리트는 절차 생성(캔버스 → ChurchTexPack data URI, 사진 질감과 같은 경로). 나머지는 공용 표면. */
(function () {
  'use strict';

  // ---------- 치수(m) ----------
  var HW = 11.0;                // 안폭의 반
  var ZF = -10.0;               // 정면 벽 안쪽 면 = 후진 입구(현)
  var AR = 5.5;                 // 후진 반지름(안쪽 면). 후진 끝 z = ZF - AR = -15.5
  var ZB = 21.0;                // 뒷벽 안쪽 면(입구)
  var H = 10.0;                 // 평천장 높이(후진 원통 벽도 같은 높이)
  var SY = 0.6;                 // 제단 높이(3단)
  var PX = 7.2, PZ = -6.6;      // 제단 앞 가장자리(폭 ±7.2), 계단은 z -6.6 → -5.4, 폭 ±6
  var ZSTEP = -5.4;
  var LZ = 17.5, LY = 4.8;      // 성가대석(뒤 위층) 앞 가장자리, 밑면 높이
  var OCT = { cz: 3.0, a: 8.0, y: 11.0 };   // 천장 팔각 오목: 가운데 z, 변까지 거리, 높이
  // 옆벽 창(좁고 긴 창, 신자석 위쪽): 중심 z
  var SIDE_WIN = [-6.5, -2.0, 2.5, 7.0, 11.5, 16.0];
  var WIN = { w: 0.8, sill: 3.6, h: 5.0 };
  var GLASS_NEUTRAL = [0xf4ecd8, 0xece2c8, 0xe6e8e2, 0xf6e8c8, 0xdfe2dc];   // 무늬 없는 옅은 빛 유리(실제 유리화의 색·그림을 옮기지 않는다)

  // (A) 레이아웃 — 순수 데이터(THREE 사용 금지)
  var layout = {
    id: 'yeouido', scalePercent: 100,
    bounds: { x0: -HW, x1: HW, z0: ZF - AR, z1: ZB },
    spawn: { x: 0, z: 16.5, r: 0 },   // 정문(뒷벽 가운데) 안쪽, 성가대석 아래: 중앙 통로·제대·후진 십자가가 일직선
    seatGroups: [
      // 중앙 통로(약 2.5m) 좌우 9줄 × 9석 = 162석. 줄 간격 1.9m 는 앱 공통값(실제 줄 수는 더 많다)
      { g: 'L', rows: 9, perRow: 9, origin: { x: -1.55, z: -3.2 }, dx: -0.7, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.35, 0.3] },
      { g: 'R', rows: 9, perRow: 9, origin: { x: 1.55, z: -3.2 }, dx: 0.7, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.35, 0.3] }
    ],
    // 봉헌초: 성모상 앞(shrine.js 가 맨 끝 스탠드로 붙인다 — 자리는 shrine_places.js). 여기 스탠드는 비워 둔다.
    candles: { stands: [] },
    crossWay: { start: 'L' },
    info: { name: '여의도동성당', place: '서울 영등포구 여의동로 257', builtYear: 1984 }
  };
  ChurchLayouts.register(layout);

  // =====================================================================
  // 재질(절차 생성) — 사진 질감으로 바꿀 때는 이 구역만 보면 된다.
  //   yd_floor (+_n)  바닥: 크림색 타일 0.6m, 모서리마다 갈색 마름모   → tex_yd_floor.jpg, tex_yd_floor_n.jpg
  //   yd_conc  (+_n)  옆벽·뒷벽·후진 아래 판: 세로 홈 줄 거친 콘크리트 → tex_yd_conc.jpg, tex_yd_conc_n.jpg
  //   yd_plaster(+_n) 크림색 미장(yd_cream)·천장(yd_ceil) 공용              → tex_yd_plaster.jpg, tex_yd_plaster_n.jpg
  //   같은 이름의 사진 묶음(tex_pack_yeouido.js)이 있으면 생성을 건너뛴다(코드 변경 없음).
  // =====================================================================
  var SURF = {
    yd_floor: { tile: [1.2, 1.2], roughness: 0.32, clearcoat: 0.35, ccRough: 0.25, normalScale: 0.35, envK: 1.0, fb: 'marble', tint: 0xeee4d0, own: true },   // own: 그림이 제 색을 갖는다(대체 질감일 때만 색조)
    yd_conc: { tile: [2.0, 2.0], roughness: 0.92, normalScale: 1.0, envK: 0.7, fb: 'plaster', tint: 0xa6aa9c },
    // 크림색 미장(후진 원통 벽·기둥·정면 벽)과 천장: 같은 그림, 색조만 다르다
    yd_cream: { photo: 'yd_plaster', tile: [2.6, 2.6], roughness: 0.9, normalScale: 0.3, envK: 0.8, fb: 'plaster', tint: 0xf6ead0 },
    yd_ceil: { photo: 'yd_plaster', tile: [3.0, 3.0], roughness: 0.95, normalScale: 0.2, envK: 0.7, fb: 'plaster', tint: 0xf8f2e6 }
  };
  var TEX_NAMES = ['yd_floor', 'yd_floor_n', 'yd_conc', 'yd_conc_n', 'yd_plaster', 'yd_plaster_n'];

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

    // 바닥 타일: 한 장(1.2m)에 0.6m 타일 2×2. 줄눈 + 타일 모서리마다 갈색 작은 마름모(사진의 무늬. 반경 약 0.09m)
    function floor(seed, S) {
      var rnd = rngF(seed), n1 = noise(S, S, 6, 6, rnd), n2 = noise(S, S, 48, 48, rnd), T = S / 2, Hm = new Float32Array(S * S);
      var tone = [0.97 + rnd() * 0.05, 0.97 + rnd() * 0.05, 0.97 + rnd() * 0.05, 0.97 + rnd() * 0.05], D = S * 0.075;
      var col = paint(S, S, function (i, x, y, px) {
        var tx = x % T, ty = y % T, ti = ((y / T) | 0) * 2 + ((x / T) | 0);
        var gx = Math.min(tx, T - tx), gy = Math.min(ty, T - ty);
        var dm = Math.abs(gx) + Math.abs(gy);              // 가장 가까운 모서리까지(마름모 거리)
        var grout = Math.min(gx, gy) < 1.2;
        var c, h;
        if (dm < D) { var e = (D - dm) / D; c = [124 + 10 * n2[i], 84 + 6 * n2[i], 58]; h = 0.55 + 0.1 * Math.min(1, e * 6); if (dm > D - 1.5) c = [96, 66, 46]; }
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
    return { floor: floor, conc: conc, plaster: plaster };
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
    sideWindows: SIDE_WIN, win: WIN,   // 시험이 14처 판과 창 자리를 견줄 때 쓴다
    thumb: { x: 0, z: 9.0, yaw: 0, pitch: 7, zoom: 1.0, hour: 11 },
    build: function (ctx) {
      var T = ctx.THREE, KIT = ChurchKit, G = ChurchGeo, Geo = G.Geo, PI = Math.PI, low = ctx.quality === 'low';
      var cos = Math.cos, sin = Math.sin, min = Math.min, max = Math.max;
      ensureTextures(ctx);
      defineSurfaces(ctx);
      var floorB = ctx.surfBatch('yd_floor'), concB = ctx.surfBatch('yd_conc'), cream = ctx.surfBatch('yd_cream'), ceil = ctx.surfBatch('yd_ceil');
      var wood = ctx.woodB, glow = ctx.glow, solid = ctx.solid, metal = ctx.metalB;
      var C = { lamp: new T.Color(0xffe2b0), door: 0x8a5a36, doorD: 0x5e3b22, oak: 0xc29660, bronze: 0x8a6a34, iron: 0x2a2622 };
      function hdr(c, k) { return (c.isColor ? c : new T.Color(c)).clone().multiplyScalar(k); }
      var sacred = ctx._.sacred || (ctx._.sacred = []);   // 불경 방지 시험(reverence.test.mjs): 제대·감실 자리

      // ---------- 바닥 ----------
      function flr(b, x0, x1, z0, z1, y) { b.addQuad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], 0xffffff, [(x0 + x1) / 2, y + 5, (z0 + z1) / 2], { vary: 0 }); }
      flr(floorB, -HW, HW, PZ, ZB, 0);                                  // 신자석 홀
      [-1, 1].forEach(function (s) { flr(floorB, s < 0 ? -HW : PX, s < 0 ? -PX : HW, ZF, PZ, 0); });   // 제단 양옆(정면 큰 창 앞)
      flr(floorB, -PX, PX, ZF, PZ, SY);                                 // 제단(앞 직사각)
      // 제단(후진 반원 바닥)
      var NA = low ? 14 : 24, i;
      function apx(f, r) { return [(r || AR) * sin(f), ZF - (r || AR) * cos(f)]; }
      for (i = 0; i < NA; i++) {
        var f0 = -PI / 2 + PI * i / NA, f1 = -PI / 2 + PI * (i + 1) / NA, a0 = apx(f0), a1 = apx(f1);
        floorB.addTris([0, SY, ZF, a0[0], SY, a0[1], a1[0], SY, a1[1]], 0xffffff, [0, SY + 5, ZF - 2]);
      }
      ctx.floorZone({ x0: -PX, x1: PX, z0: ZF - AR, z1: PZ, y: SY });
      // 제단 옆면(x ±7.2). 계단은 제단 폭 전체(실제는 둥근 앞 가장자리 — 곧게 단순화)
      [-1, 1].forEach(function (s) {
        floorB.addQuad([s * PX, 0, ZF], [s * PX, 0, PZ], [s * PX, SY, PZ], [s * PX, SY, ZF], 0xd8cfc0, [s * 9, 0.3, -8], { vary: 0 });
        [1, 2, 3].forEach(function (k) {   // 계단 옆면(삼각 단면)
          var z0 = PZ + (ZSTEP - PZ) * (k - 1) / 3, z1 = ZSTEP, yk = SY * (3 - k + 1) / 3, yk1 = SY * (3 - k) / 3;
          floorB.addQuad([s * PX, yk1, z0], [s * PX, yk1, z1], [s * PX, yk, z1], [s * PX, yk, z0], 0xd8cfc0, [s * 9, 0.3, -6], { vary: 0 });
        });
      });
      ctx.steps({ x0: -PX, x1: PX, z0: PZ, z1: ZSTEP, y0: 0, y1: SY, n: 3, dir: [0, -1], surf: 'yd_floor', color: 0xf2ebe0 });
      ctx.aoDecal({ x0: -PX, x1: PX, z0: ZSTEP - 0.02, z1: ZSTEP + 0.02, y: 0, pad: 0.25 });

      // ---------- 벽 ----------
      // 옆벽(세로 홈 줄 콘크리트) + 위쪽 좁고 긴 창(진짜 개구부: 햇빛이 든다). 걸레받이·돌림띠는 크림색
      [-1, 1].forEach(function (s) {
        var x = s * (HW + 0.25);
        ctx.wall({ x0: x, z0: ZF - 0.5, x1: x, z1: ZB + 0.5, h: H, t: 0.5, surf: 'yd_conc', collide: false, plinth: true, crown: false, plinthColor: 0xcfc6b4 });
        SIDE_WIN.forEach(function (z, k) {
          ctx.window({ x: s * HW, z: z, y: WIN.sill, face: [-s, 0], w: WIN.w, h: WIN.h, top: 'flat', pattern: 'grid', colors: GLASS_NEUTRAL, frame: true, frameColor: 0xd9d0bf, beam: false, seed: (s < 0 ? 300 : 400) + k });
        });
      });
      // 정면 벽(후진 양옆, 크림색) + 큰 창 한 쌍(실제는 색 유리화 — 무늬 없는 옅은 빛 유리로)
      [-1, 1].forEach(function (s) {
        ctx.wall({ x0: s * AR, z0: ZF - 0.25, x1: s * (HW + 0.5), z1: ZF - 0.25, h: H, t: 0.5, surf: 'yd_cream', collide: false, plinth: false, crown: false });
        ctx.window({ x: s * 8.25, z: ZF, y: 1.7, face: [0, 1], w: 2.4, h: 6.2, top: 'flat', pattern: 'grid', colors: GLASS_NEUTRAL, frame: true, frameColor: 0xd9d0bf, beam: false, seed: s < 0 ? 501 : 502 });
        ctx.addCollider({ x0: s < 0 ? -HW : AR, x1: s < 0 ? -AR : HW, z0: ZF - AR, z1: ZF });   // 정면 벽 뒤(후진 바깥 모서리)
      });
      // 뒷벽(입구, 홈 줄 콘크리트)
      ctx.wall({ x0: -HW - 0.5, z0: ZB + 0.25, x1: HW + 0.5, z1: ZB + 0.25, h: H, t: 0.5, surf: 'yd_conc', collide: false, plinth: true, crown: false, plinthColor: 0xcfc6b4 });
      // 벽 머리 돌림띠(옆벽·뒷벽): 천장 바로 아래 크림색 띠 — 한 묶음
      [-1, 1].forEach(function (s) { ctx.boxAABB({ x0: s < 0 ? -HW : HW - 0.12, x1: s < 0 ? -HW + 0.12 : HW, z0: ZF, z1: ZB, y0: H - 0.35, y1: H, surf: 'yd_cream', color: 0xf0e6d2 }); });
      ctx.boxAABB({ x0: -HW, x1: HW, z0: ZB - 0.12, z1: ZB, y0: H - 0.35, y1: H, surf: 'yd_cream', color: 0xf0e6d2 });

      // ---------- 후진: 원통 벽(아래 짙은 홈 줄 판, 위 크림색) + 흰 원기둥 9개 + 기둥 위 둥근 띠 ----------
      var YP = 5.4;   // 기둥 머리 띠 아래
      for (i = 0; i < NA; i++) {
        var g0 = -PI / 2 + PI * i / NA, g1 = -PI / 2 + PI * (i + 1) / NA, p0 = apx(g0), p1 = apx(g1), hint = [0, 3, ZF];
        concB.addQuad([p0[0], SY, p0[1]], [p1[0], SY, p1[1]], [p1[0], YP, p1[1]], [p0[0], YP, p0[1]], 0x9ca296, hint, { vary: 0 });
        cream.addQuad([p0[0], YP, p0[1]], [p1[0], YP, p1[1]], [p1[0], H, p1[1]], [p0[0], H, p0[1]], 0xffffff, hint, { vary: 0 });
        // 후진 위 반원 천장(크림색) — 둘레 간접등 띠가 비춘다
        ceil.addTris([0, H, ZF, p0[0], H, p0[1], p1[0], H, p1[1]], 0xfff6e6, [0, 0, ZF - 2]);
        // 둘레 간접등(벽 머리)
        var q0 = apx(g0, AR - 0.03), q1 = apx(g1, AR - 0.03);
        glow.addQuad([q0[0], H - 0.42, q0[1]], [q1[0], H - 0.42, q1[1]], [q1[0], H - 0.3, q1[1]], [q0[0], H - 0.3, q0[1]], hdr(C.lamp, 1.6), hint, { vary: 0 });
      }
      // 후진 입구 테(정면 벽 안쪽 모서리를 덮는 크림색 기둥면)
      [-1, 1].forEach(function (s) { ctx.boxAABB({ x0: s < 0 ? -AR - 0.35 : AR, x1: s < 0 ? -AR : AR + 0.35, z0: ZF - 0.5, z1: ZF + 0.05, y0: 0, y1: H, surf: 'yd_cream', color: 0xf6ecd8 }); });
      var NCOL = 9, CR = 0.36, RC = AR - 0.55;
      for (i = 0; i < NCOL; i++) {
        var fc = -PI / 2 + PI * (i + 0.5) / NCOL, pc = apx(fc, RC);
        ctx.column({ x: pc[0], z: pc[1], y: SY, h: YP - SY, r: CR, style: 'round', capital: 'none', base: false, surf: 'yd_cream', color: 0xfaf2e2, collide: false });
        ctx.cyl({ x: pc[0], y: SY, z: pc[1], r: CR + 0.06, h: 0.12, seg: low ? 10 : 16, surf: 'yd_cream', color: 0xe6dccb, flat: false });
      }
      // 기둥 위 둥근 띠(아래면 + 앞면 + 윗면)
      var RI = RC - CR - 0.12, BT = 0.55;
      for (i = 0; i < NA; i++) {
        var h0 = -PI / 2 + PI * i / NA, h1 = -PI / 2 + PI * (i + 1) / NA, o0 = apx(h0, AR), o1 = apx(h1, AR), n0 = apx(h0, RI), n1 = apx(h1, RI);
        cream.addQuad([n0[0], YP, n0[1]], [n1[0], YP, n1[1]], [o1[0], YP, o1[1]], [o0[0], YP, o0[1]], 0xe8dcc4, [0, 0, ZF - 3], { vary: 0 });
        cream.addQuad([n0[0], YP, n0[1]], [n1[0], YP, n1[1]], [n1[0], YP + BT, n1[1]], [n0[0], YP + BT, n0[1]], 0xfaf0dc, [0, YP, ZF + 2], { vary: 0 });
        cream.addQuad([n0[0], YP + BT, n0[1]], [n1[0], YP + BT, n1[1]], [o1[0], YP + BT, o1[1]], [o0[0], YP + BT, o0[1]], 0xfaf0dc, [0, 20, ZF - 3], { vary: 0 });
      }
      // 후진 바깥(반원 밖 모서리) 충돌체: 0.5m 띠마다 원 밖을 막는 상자
      for (var xs = 0; xs < AR; xs += 0.5) {
        var xe = min(AR, xs + 0.5), zc = ZF - Math.sqrt(max(0, AR * AR - xe * xe));
        [-1, 1].forEach(function (s) { ctx.addCollider({ x0: s < 0 ? -xe : xs, x1: s < 0 ? -xs : xe, z0: ZF - AR - 0.4, z1: zc }); });
      }

      // ---------- 천장: 평천장(10m) + 가운데 팔각 오목(11m), 오목 둘레 간접등 ----------
      var t8 = Math.tan(PI / 8), oa = OCT.a, os = oa * t8, cz = OCT.cz;
      var O = [[-os, cz - oa], [os, cz - oa], [oa, cz - os], [oa, cz + os], [os, cz + oa], [-os, cz + oa], [-oa, cz + os], [-oa, cz - os]];
      var R4 = [[-HW, ZF], [HW, ZF], [HW, ZB], [-HW, ZB]];
      var dn = function (x, z) { return [x, 0, z]; };
      function cq(a, b, c, d) { ceil.addQuad([a[0], H, a[1]], [b[0], H, b[1]], [c[0], H, c[1]], [d[0], H, d[1]], 0xffffff, dn((a[0] + c[0]) / 2, (a[1] + c[1]) / 2), { vary: 0 }); }
      function ct(a, b, c) { ceil.addTris([a[0], H, a[1], b[0], H, b[1], c[0], H, c[1]], 0xffffff, dn((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3)); }
      cq(R4[0], R4[1], O[1], O[0]); ct(R4[1], O[2], O[1]);
      cq(R4[1], R4[2], O[4 - 1], O[2]); ct(R4[2], O[4], O[3]);
      cq(R4[2], R4[3], O[5], O[4]); ct(R4[3], O[6], O[5]);
      cq(R4[3], R4[0], O[7], O[6]); ct(R4[0], O[0], O[7]);
      for (i = 0; i < 8; i++) {
        var A = O[i], B = O[(i + 1) % 8], mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
        ceil.addQuad([A[0], H, A[1]], [B[0], H, B[1]], [B[0], OCT.y, B[1]], [A[0], OCT.y, A[1]], 0xf6efe2, [0, 10.5, cz], { vary: 0 });   // 오목 옆면(안쪽을 봄)
        ceil.addTris([0, OCT.y, cz, A[0], OCT.y, A[1], B[0], OCT.y, B[1]], 0xfff8ec, [0, 0, cz]);                                // 오목 천장
        // 간접등: 오목 옆면 아래 가장자리를 따라 숨은 빛(띠)
        var ix = (A[0] - 0) * 0.995, iz = cz + (A[1] - cz) * 0.995, jx = B[0] * 0.995, jz = cz + (B[1] - cz) * 0.995;
        glow.addQuad([ix, H + 0.04, iz], [jx, H + 0.04, jz], [jx, H + 0.2, jz], [ix, H + 0.2, iz], hdr(C.lamp, 1.5), [0, 10.5, cz], { vary: 0 });
        void mx; void mz;
      }
      // 매입등(발광 원판, 스프라이트 아님): 오목 밖 평천장 + 성가대석 아래
      var downs = [];
      [-8.5, -4.5, 4.5, 8.5].forEach(function (x) { [-7.5, -3.0, 1.5, 6.0, 10.5, 14.5].forEach(function (z) { if (Math.abs(x) > oa + 0.4 || z < cz - oa - 0.4 || z > cz + oa + 0.4) downs.push([x, H - 0.012, z]); }); });
      [-1.5, 1.5].forEach(function (x) { [-7.5, 13.5].forEach(function (z) { downs.push([x, H - 0.012, z]); }); });
      [-7, -2.4, 2.4, 7].forEach(function (x) { [18.6, 20.0].forEach(function (z) { downs.push([x, LY - 0.012, z]); }); });
      downs.forEach(function (p) {
        glow.add(Geo.cyl(low ? 8 : 12, 1), hdr(0xfff0d6, 2.4), { x: p[0], y: p[1] - 0.012, z: p[2], sx: 0.09, sy: 0.012, sz: 0.09, flat: true, vary: 0 });
        ceil.add(Geo.cyl(low ? 8 : 12, 1), 0xece4d6, { x: p[0], y: p[1] - 0.006, z: p[2], sx: 0.13, sy: 0.012, sz: 0.13, flat: true, vary: 0 });
      });

      // ---------- 성가대석(뒤 위층, 걷지 못함): 바닥판 + 난간 벽 ----------
      ctx.boxAABB({ x0: -HW, x1: HW, z0: LZ, z1: ZB, y0: LY, y1: LY + 0.35, surf: 'yd_cream', color: 0xf2eadc });
      ctx.boxAABB({ x0: -HW, x1: HW, z0: LZ - 0.06, z1: LZ + 0.18, y0: LY + 0.35, y1: LY + 1.45, surf: 'yd_cream', color: 0xf4ecdc });
      ctx.boxAABB({ x0: -HW, x1: HW, z0: LZ - 0.12, z1: LZ + 0.24, y0: LY + 1.45, y1: LY + 1.53, color: C.oak, mat: 'wood' });
      ctx.boxAABB({ x0: -HW, x1: HW, z0: LZ - 0.1, z1: LZ, y0: LY - 0.06, y1: LY + 0.35, color: C.oak, mat: 'wood' });   // 앞 끝 나무 띠

      // ---------- 벽등(옆벽 창 사이, 발광 — 1984년 사진의 벽부등) ----------
      [-1, 1].forEach(function (s) {
        for (var k = 0; k < SIDE_WIN.length - 1; k++) {
          var z = (SIDE_WIN[k] + SIDE_WIN[k + 1]) / 2, x = s * (HW - 0.02);
          ctx.boxAABB({ x0: s < 0 ? -HW : HW - 0.05, x1: s < 0 ? -HW + 0.05 : HW, z0: z - 0.12, z1: z + 0.12, y0: 3.15, y1: 3.55, color: C.bronze, mat: 'metal' });
          glow.add(Geo.cyl(low ? 8 : 12, 1), hdr(0xffd9a0, 2.2), { x: x - s * 0.11, y: 3.25, z: z, sx: 0.1, sy: 0.22, sz: 0.1, flat: false, vary: 0 });
        }
      });

      // ---------- 제단(y = SY) ----------
      // 제대: 회백색 대리석 상자(무늬 없음), 제대포·촛대 2
      var AX = 0, AZ = -8.4;
      ctx.box({ x: AX, y: SY, z: AZ, w: 2.2, h: 0.92, d: 0.86, surf: 'marble_white', color: 0xdedcd6 });
      ctx.box({ x: AX, y: SY + 0.92, z: AZ, w: 2.4, h: 0.1, d: 1.0, surf: 'marble_white', color: 0xe8e6e0 });
      ctx.box({ x: AX, y: SY + 1.02, z: AZ, w: 1.9, h: 0.008, d: 0.7, color: 0xfaf6ec, mat: 'solid', vary: 0 });
      [-0.85, 0.85].forEach(function (x) {
        ctx.cyl({ x: AX + x, y: SY + 1.02, z: AZ - 0.25, r: 0.06, rTop: 0.04, h: 0.06, seg: 8, color: C.bronze, mat: 'metal' });
        ctx.cyl({ x: AX + x, y: SY + 1.08, z: AZ - 0.25, r: 0.032, h: 0.26, seg: 8, color: 0xfff6e0, mat: 'solid', flat: false });
        glow.add(Geo.ico(low ? 0 : 1), hdr(0xffc04a, 2.4), { x: AX + x, y: SY + 1.38, z: AZ - 0.25, sx: 0.016, sy: 0.04, sz: 0.016, flat: true, vary: 0 });
      });
      ctx.addCollider({ x0: AX - 1.2, x1: AX + 1.2, z0: AZ - 0.5, z1: AZ + 0.5 });
      ctx.aoDecal({ x0: AX - 1.1, x1: AX + 1.1, z0: AZ - 0.43, z1: AZ + 0.43, y: SY, pad: 0.3 });
      sacred.push({ k: 'altar', x: AX, z: AZ, w: 2.4, d: 1.0, ry: 0 });

      // 감실: 후진 가운데, 회색 돌 기둥 위 무늬 없는 금빛 상자. 왼쪽 벽에 붉은 성체등
      (function () {
        var x = 0, z = -12.7, y = SY;
        ctx.box({ x: x, y: y, z: z, w: 0.7, h: 1.05, d: 0.55, surf: 'marble_white', color: 0xb8b6b0 });
        ctx.box({ x: x, y: y + 1.05, z: z, w: 0.8, h: 0.06, d: 0.62, surf: 'marble_white', color: 0xc8c6c0 });
        ctx.box({ x: x, y: y + 1.11, z: z, w: 0.56, h: 0.46, d: 0.42, color: 0xc9a85a, mat: 'metal' });
        ctx.box({ x: x, y: y + 1.57, z: z, w: 0.62, h: 0.05, d: 0.48, color: 0xb8954a, mat: 'metal' });
        ctx.box({ x: x, y: y + 1.62, z: z, w: 0.05, h: 0.18, d: 0.03, color: 0xc9a85a, mat: 'metal' });
        ctx.box({ x: x, y: y + 1.7, z: z, w: 0.13, h: 0.04, d: 0.03, color: 0xc9a85a, mat: 'metal' });
        ctx.addCollider({ x: x, z: z, r: 0.5 });
        ctx.aoDecal({ x0: x - 0.36, x1: x + 0.36, z0: z - 0.28, z1: z + 0.28, y: y, pad: 0.25 });
        sacred.push({ k: 'tabernacle', x: x, z: z, w: 0.8, d: 0.62, ry: 0 });
        // 성체등: 왼쪽 기둥 사이 벽에 붙은 받침 + 붉은 등
        var lp = apx(-PI / 2 + PI * 2 / NCOL, AR - 0.12);
        ctx.box({ x: lp[0], y: 3.1, z: lp[1], w: 0.12, h: 0.04, d: 0.24, color: C.bronze, mat: 'metal' });
        ctx.cyl({ x: lp[0], y: 3.14, z: lp[1], r: 0.07, rTop: 0.09, h: 0.24, seg: 10, color: 0x8a1a12, mat: 'gloss' });
        glow.add(Geo.sph(8, 6), hdr(0xff3a2a, 2.6), { x: lp[0], y: 3.27, z: lp[1], sx: 0.06, sy: 0.09, sz: 0.06, flat: false, vary: 0 });
      })();

      // 십자가: 후진 원통 벽 가운데 높이(일반 형태 — 실제의 부활하신 그리스도 상은 작품이라 옮기지 않는다)
      var CRY = 6.35, CRH = 2.8;
      (function () {
        var x = 0, y = CRY, z = ZF - AR + 0.07, h = CRH, cw = 0x4a2c1a, body = 0xd8bf96, f = z + h * 0.045;
        ctx.box({ x: x, y: y, z: z, w: h * 0.085, h: h, d: h * 0.045, color: cw, mat: 'wood' });
        ctx.box({ x: x, y: y + h * 0.66, z: z, w: h * 0.56, h: h * 0.075, d: h * 0.045, color: cw, mat: 'wood' });
        ctx.sphere({ x: x, y: y + h * 0.74, z: f, r: h * 0.04, color: body, w: 10, h: 8, mat: 'wood' });
        ctx.box({ x: x, y: y + h * 0.47, z: f, w: h * 0.085, h: h * 0.24, d: h * 0.035, color: body, mat: 'wood' });
        ctx.box({ x: x, y: y + h * 0.685, z: f, w: h * 0.42, h: h * 0.032, d: h * 0.032, color: body, mat: 'wood' });
        ctx.box({ x: x, y: y + h * 0.41, z: f, w: h * 0.095, h: h * 0.065, d: h * 0.045, color: 0xf2e6d0, mat: 'wood' });
        ctx.box({ x: x, y: y + h * 0.26, z: f, w: h * 0.055, h: h * 0.16, d: h * 0.032, color: body, mat: 'wood' });
      })();

      // 독서대: 제대 왼쪽 앞, 회녹색 돌 받침 + 기울어진 판(조각 없음)
      (function () {
        var x = -3.8, z = -7.6, y = SY;
        ctx.box({ x: x, y: y, z: z, w: 0.72, h: 0.06, d: 0.56, surf: 'marble_white', color: 0x9aa498 });
        ctx.box({ x: x, y: y + 0.06, z: z, w: 0.6, h: 1.0, d: 0.46, surf: 'marble_white', color: 0x8e9a8c });
        ctx.box({ x: x, y: y + 1.06, z: z + 0.02, w: 0.78, h: 0.08, d: 0.56, rx: -0.22, surf: 'marble_white', color: 0x9aa498 });
        ctx.box({ x: x, y: y + 1.15, z: z + 0.01, w: 0.46, h: 0.03, d: 0.34, rx: -0.22, color: 0xf6f0e0, mat: 'solid' });
        ctx.addCollider({ x: x, z: z, r: 0.48 });
        ctx.aoDecal({ x0: x - 0.36, x1: x + 0.36, z0: z - 0.28, z1: z + 0.28, y: y, pad: 0.22 });
      })();
      // 사제석 3(제대 오른쪽 뒤, 밝은 나무), 제대 쪽을 본다
      [[3.4, -10.4, 0.62], [4.3, -9.9, 0.52], [2.6, -10.8, 0.52]].forEach(function (p) {
        var x = p[0], z = p[1], y = SY, w = p[2], ry = Math.atan2(AX - x, (AZ + 1.4) - z), ca = cos(ry), sa = sin(ry);
        function at(lx, lz) { return [x + lx * ca + lz * sa, z - lx * sa + lz * ca]; }
        ctx.box({ x: x, y: y + 0.42, z: z, w: w, h: 0.07, d: 0.5, ry: ry, color: C.oak, mat: 'wood' });
        ctx.box({ x: x, y: y + 0.49, z: z, w: w - 0.08, h: 0.035, d: 0.42, ry: ry, color: 0x9c3f2e, mat: 'solid' });
        var bk = at(0, -0.23);
        ctx.box({ x: bk[0], y: y + 0.42, z: bk[1], w: w, h: w > 0.6 ? 0.72 : 0.55, d: 0.05, ry: ry, color: C.oak, mat: 'wood' });
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { var l = at(q[0] * (w / 2 - 0.04), q[1] * 0.2); ctx.box({ x: l[0], y: y, z: l[1], w: 0.05, h: 0.42, d: 0.05, ry: ry, color: C.oak, mat: 'wood' }); });
        ctx.addCollider({ x: x, z: z, r: 0.35 });
        ctx.aoDecalCircle({ x: x, z: z, r: 0.32, y: y });
      });
      // 둥근 샹들리에(코로나): 후진 앞 공중, 발광 고리 + 쇠 고리 + 사슬 4
      (function () {
        var cx = 0, cy = 5.3, czz = -7.2, r = 2.3;
        metal.add(new T.TorusGeometry(1, 0.025, 4, low ? 32 : 56), C.iron, { x: cx, y: cy, z: czz, rx: PI / 2, sx: r, sy: r, sz: 1.6, flat: false, vary: 0 });
        var NL = low ? 16 : 28;
        for (var k = 0; k < NL; k++) {
          var a = 2 * PI * k / NL;
          glow.add(Geo.cyl(6, 1), hdr(0xfff0d0, 2.6), { x: cx + r * cos(a), y: cy + 0.03, z: czz + r * sin(a), sx: 0.035, sy: 0.07, sz: 0.035, flat: true, vary: 0 });
        }
        for (k = 0; k < 4; k++) { var b = PI / 4 + PI / 2 * k; ctx.beam3([cx + r * cos(b), cy, czz + r * sin(b)], [cx, H, czz], 0.012, 0.012, C.iron, metal); }
      })();

      // 제단 양끝 화분대(낮은 나무 상자 + 푸른 잎): 제단(±7.2)이 맨 앞줄 끝(±7.45)과 가까워 제단 출입 금지 구역(reverence.js)이
      // 폭을 ±6.45 로 줄인다 → 그 바깥 제단 끝은 화분대로 막는다(실제 제단 가장자리의 꽃 장식 자리에서 따온 단순 형태)
      [-1, 1].forEach(function (s) {
        var x0 = s < 0 ? -PX + 0.05 : 6.35, x1 = s < 0 ? -6.35 : PX - 0.05, z0 = ZF + 0.2, z1 = PZ - 0.08;
        ctx.boxAABB({ x0: x0, x1: x1, z0: z0, z1: z1, y0: SY, y1: SY + 0.42, color: 0x9a7448, mat: 'wood' });
        ctx.boxAABB({ x0: x0 + 0.04, x1: x1 - 0.04, z0: z0 + 0.04, z1: z1 - 0.04, y0: SY + 0.42, y1: SY + 0.45, color: 0x3a2a1c, mat: 'solid' });
        for (var k = 0; k < 5; k++) {
          var zz = z0 + 0.35 + (z1 - z0 - 0.7) * k / 4, xx = (x0 + x1) / 2;
          ctx.sphere({ x: xx, y: SY + 0.62, z: zz, sx: 0.36, sy: 0.26, sz: 0.4, color: k % 2 ? 0x3f6b3a : 0x4d7a42, w: low ? 6 : 8, h: low ? 4 : 6 });
        }
        ctx.addCollider({ x0: s < 0 ? -PX : 6.35, x1: s < 0 ? -6.35 : PX, z0: ZF, z1: PZ });
      });

      // ---------- 문: 뒷벽 가운데 쌍여닫이(닫힘, 나무 + 유리 띠) + 양옆 외여닫이 ----------
      function doorAt(x0, x1, hgt) {
        var zf = ZB - 0.02, w = x1 - x0;
        ctx.boxAABB({ x0: x0 - 0.12, x1: x1 + 0.12, z0: zf - 0.04, z1: ZB, y0: 0, y1: hgt + 0.12, color: C.doorD, mat: 'wood' });   // 문틀
        ctx.boxAABB({ x0: x0, x1: x1, z0: zf - 0.07, z1: zf - 0.04, y0: 0.02, y1: hgt, color: C.door, mat: 'wood' });
        var leaves = w > 1.4 ? 2 : 1;
        for (var k = 0; k < leaves; k++) {
          var lx0 = x0 + w * k / leaves, lx1 = x0 + w * (k + 1) / leaves;
          ctx.boxAABB({ x0: lx0 + 0.12, x1: lx1 - 0.12, z0: zf - 0.085, z1: zf - 0.07, y0: 0.3, y1: 1.0, color: C.doorD, mat: 'wood' });
          glow.addQuad([lx0 + 0.16, 1.25, zf - 0.075], [lx1 - 0.16, 1.25, zf - 0.075], [lx1 - 0.16, hgt - 0.3, zf - 0.075], [lx0 + 0.16, hgt - 0.3, zf - 0.075], hdr(0xe8efe8, 0.55), [0, 1.5, 0], { vary: 0 });   // 문 유리(바깥 로비 빛)
          ctx.cyl({ x: k === 0 && leaves === 2 ? lx1 - 0.1 : (leaves === 1 ? lx1 - 0.12 : lx0 + 0.1), y: 0.9, z: zf - 0.11, r: 0.018, h: 0.4, seg: 8, color: 0xb9b3a6, mat: 'metal' });
        }
        if (leaves === 2) ctx.boxAABB({ x0: (x0 + x1) / 2 - 0.02, x1: (x0 + x1) / 2 + 0.02, z0: zf - 0.09, z1: zf - 0.04, y0: 0.02, y1: hgt, color: C.doorD, mat: 'wood' });
      }
      doorAt(-1.4, 1.4, 2.9);
      doorAt(-6.8, -5.4, 2.6); doorAt(5.4, 6.8, 2.6);
      // 성수대(문 양옆, 일반 형태)
      [-2.4, 2.4].forEach(function (x) {
        var z = ZB - 0.55;
        ctx.cyl({ x: x, y: 0, z: z, r: 0.14, rTop: 0.1, h: 0.86, seg: low ? 8 : 12, surf: 'marble_white', color: 0xd8d6d0, flat: false });
        ctx.cyl({ x: x, y: 0.86, z: z, r: 0.2, rTop: 0.28, h: 0.14, seg: low ? 10 : 16, surf: 'marble_white', color: 0xe4e2dc, flat: false });
        glow.add(Geo.cyl(12, 1), 0x8fb8cc, { x: x, y: 0.995, z: z, sx: 0.23, sy: 0.012, sz: 0.23, flat: true, vary: 0 });
        ctx.addCollider({ x: x, z: z, r: 0.3 });
        ctx.aoDecalCircle({ x: x, z: z, r: 0.3, y: 0 });
      });

      // ---------- 성모 자리 뒤 돌 벽감 테(오른쪽 벽 입구 쪽; 성상·받침·봉헌초는 shrine.js) ----------
      // 실제 파티마의 성모상은 1층 로비의 밝은 돌 벽감에 모셔져 있다(사진) → 성당 안 오른쪽 뒤 벽에 같은 분위기의 테만 두른다(연출)
      (function () {
        var x = HW - 0.012, z = 14.5, w2 = 0.95, y0 = 0.0, y1 = 2.75;
        cream.addQuad([x, y0, z - w2], [x, y0, z + w2], [x, y1, z + w2], [x, y1, z - w2], 0xf2e8d4, [0, 1.5, z], { vary: 0 });
        var NR = low ? 8 : 12, rr = w2;
        for (var k = 0; k < NR; k++) {
          var a0 = PI * k / NR, a1 = PI * (k + 1) / NR;
          cream.addTris([x, y1, z, x, y1 + rr * sin(a0), z - rr * cos(a0), x, y1 + rr * sin(a1), z - rr * cos(a1)], 0xf2e8d4, [0, y1, z]);
        }
        glow.addQuad([x - 0.004, y1 + 0.5, z - 0.5], [x - 0.004, y1 + 0.5, z + 0.5], [x - 0.004, y1 + 0.58, z + 0.5], [x - 0.004, y1 + 0.58, z - 0.5], hdr(C.lamp, 1.2), [0, 2, z], { vary: 0 });
      })();

      // ---------- 신자석 162석: 밝은 갈색 긴 의자(나무 묶음) ----------
      ctx.renderSeats(layout, 'bench', { surf: null, wood: 0xb88a56, seat: 0xc0925c, back: 0xa87c4a, kneelerColor: 0x6a4a34 });

      // ---------- 조명·카메라 ----------
      ctx.addLight({ x: 0, y: 6.0, z: -8.6, color: 0xffe0b0, intensity: 1.0, distance: 18, kind: 'lamp' });
      // 천장 10m, 성가대석 밑면 4.8m: 카메라는 9m 아래, 경계 안쪽
      ctx.setCameraBounds({ x0: -HW + 0.3, x1: HW - 0.3, z0: ZF - AR + 0.3, z1: ZB - 0.3, yMax: 8.5 });
    }
  };
})();
