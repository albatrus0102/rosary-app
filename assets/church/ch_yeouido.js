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
   - 재질: 바닥 타일·홈 줄 콘크리트·미장은 절차 생성(캔버스 → ChurchTexPack data URI). 나머지는 공용 표면. */
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
  var LZ = 17.5, LY = 4.8;      // 성가대석(뒤 위층) 앞 가장자리, 밑면 높이
  var OCT = { cz: 3.0, a: 8.0, y: 11.0 };   // 천장 팔각 오목: 가운데 z, 변까지 거리, 높이
  // 옆벽 창(좁고 긴 창, 신자석 위쪽): 중심 z
  var SIDE_WIN = [-6.5, -2.0, 2.5, 7.0, 11.5, 16.0];
  var WIN = { w: 0.8, sill: 3.6, h: 5.0 };
  var GLASS_NEUTRAL = [0xf4ecd8, 0xece2c8, 0xe6e8e2, 0xf6e8c8, 0xdfe2dc];   // 옆벽: 무늬 없는 옅은 빛 유리
  // 정면 창: 추상 색면 유리. 사진의 색 분위기(파랑이 많고 흰색·빨강이 섞임)만 따른 팔레트 — 칸 색은 무작위라 실제 유리화의 구도·그림과 무관
  var GLASS_FRONT = [0x2f62b4, 0x2f62b4, 0x4a8fd6, 0x7cb6e4, 0x1d3c86, 0xeef1f4, 0xf3eee2, 0xc23440, 0xe2708e, 0x3a9ac8];

  // (A) 레이아웃 — 순수 데이터(THREE 사용 금지)
  var layout = {
    id: 'yeouido', scalePercent: 100,
    bounds: { x0: -HW, x1: HW, z0: ZF - RB, z1: ZB },
    spawn: { x: 0, z: 16.5, r: 0 },   // 정문(뒷벽 가운데) 안쪽, 성가대석 아래: 중앙 통로·제대·드럼의 인물상이 일직선
    seatGroups: [
      // 중앙 통로(약 2.5m) 좌우 8줄 × 9석 = 144석(맨 앞줄은 제단 계단 앞 통로를 열려고 뺌, 2026-11-16 사용자). 줄 간격 1.9m 는 앱 공통값(실제 줄 수는 더 많다)
      { g: 'L', rows: 8, perRow: 9, origin: { x: -1.55, z: -1.3 }, dx: -0.7, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.35, 0.3] },
      { g: 'R', rows: 8, perRow: 9, origin: { x: 1.55, z: -1.3 }, dx: 0.7, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.35, 0.3] }
    ],
    // 봉헌초: 성모상 앞(shrine.js 가 맨 끝 스탠드로 붙인다 — 자리는 shrine_places.js, 제단 앞 왼쪽 피어 앞). 여기 스탠드는 비워 둔다.
    candles: { stands: [] },
    crossWay: { start: 'L' },
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
    yd_ceil: { photo: 'yd_plaster', tile: [3.0, 3.0], roughness: 0.95, normalScale: 0.2, envK: 0.7, fb: 'plaster', tint: 0xf8f2e6 }
  };
  var TEX_NAMES = ['yd_floor', 'yd_floor_n', 'yd_conc', 'yd_conc_n', 'yd_plaster', 'yd_plaster_n', 'yd_mtile', 'yd_mtile_n'];
  var CONC_WALL = 0xa6aa9c;     // 옆벽·뒷벽(예전 표면 색조와 같은 회녹색)

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
    return { floor: floor, conc: conc, plaster: plaster, mtile: mtile };
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
    sideWindows: SIDE_WIN, win: WIN, frontWindow: FWIN, pier: PIER,   // 시험이 14처 판·창·피어 자리를 견줄 때 쓴다
    thumb: { x: 0, z: 9.0, yaw: 0, pitch: 7, zoom: 1.0, hour: 11 },
    build: function (ctx) {
      var T = ctx.THREE, G = ChurchGeo, Geo = G.Geo, PI = Math.PI, low = ctx.quality === 'low';
      var cos = Math.cos, sin = Math.sin, min = Math.min, max = Math.max, sqrt = Math.sqrt, D2R = PI / 180;
      ensureTextures(ctx);
      defineSurfaces(ctx);
      var floorB = ctx.surfBatch('yd_floor'), concB = ctx.surfBatch('yd_conc'), cream = ctx.surfBatch('yd_cream'), ceil = ctx.surfBatch('yd_ceil'), marb = ctx.surfBatch('yd_mtile');
      var glow = ctx.glow, solid = ctx.solid, metal = ctx.metalB, woodB = ctx.woodB;
      var C = { lamp: new T.Color(0xffe2b0), door: 0x8a5a36, doorD: 0x5e3b22, oak: 0xc29660, light: 0xd2a066, bronze: 0x8a6a34, iron: 0x262321, joint: 0xa4967c, figure: 0x93703e };
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
      flr(floorB, -HW, HW, ZF, ZB, 0);                                  // 신자석 홀 전체(제단 아래도 — 가려진다)

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
      // 옆벽(세로 홈 줄 콘크리트, 회녹색) + 위쪽 좁고 긴 창(진짜 개구부: 햇빛이 든다). 걸레받이·돌림띠는 크림색
      [-1, 1].forEach(function (s) {
        var x = s * (HW + 0.25);
        ctx.wall({ x0: x, z0: ZF - 0.5, x1: x, z1: ZB + 0.5, h: H, t: 0.5, surf: 'yd_conc', color: CONC_WALL, collide: false, plinth: true, crown: false, plinthColor: 0xcfc6b4 });
        SIDE_WIN.forEach(function (z, q) {
          ctx.window({ x: s * HW, z: z, y: WIN.sill, face: [-s, 0], w: WIN.w, h: WIN.h, top: 'flat', pattern: 'grid', colors: GLASS_NEUTRAL, frame: true, frameColor: 0xd9d0bf, beam: false, seed: (s < 0 ? 300 : 400) + q });
        });
      });
      // 정면 벽(드럼 양옆, 거친 홈 줄 — 사진 3 오른쪽 끝) + 피어와 드럼 사이 키 큰 색유리 창(추상 색면)
      [-1, 1].forEach(function (s) {
        ctx.wall({ x0: s * RB, z0: ZF - 0.25, x1: s * (HW + 0.5), z1: ZF - 0.25, h: H, t: 0.5, surf: 'yd_conc', color: 0xa8a396, collide: false, plinth: false, crown: false });
        // 둘레 공간 천장 위(드럼 바깥 ~ 둘레 공간 끝): 정면 벽이 드럼에 닿는다
        ctx.boxAABB({ x0: s < 0 ? -RB : RD, x1: s < 0 ? -RD : RB, z0: ZF - 0.5, z1: ZF, y0: YP, y1: H, surf: 'yd_conc', color: 0xa8a396 });
        ctx.window({ x: s * FWIN.x, z: ZF, y: FWIN.sill, face: [0, 1], w: FWIN.w, h: FWIN.h, top: 'flat', pattern: 'lancet', colors: GLASS_FRONT, frame: true, frameColor: 0x58554e, beam: false, seed: s < 0 ? 511 : 523,
          glass: 'yeouido_abstract', glassMod: FWIN.h / 3 });   // 현대 색유리(작가 미확인, 저작권 존속으로 봄): 사진의 색 분위기만 따른 추상 색면(구도·선을 옮기지 않는다)
        ctx.addCollider({ x0: s < 0 ? -HW : RB, x1: s < 0 ? -RB : HW, z0: ZF - RB, z1: ZF });   // 정면 벽 뒤(둘레 공간 바깥 모서리)
      });
      // 뒷벽(입구, 홈 줄 콘크리트)
      ctx.wall({ x0: -HW - 0.5, z0: ZB + 0.25, x1: HW + 0.5, z1: ZB + 0.25, h: H, t: 0.5, surf: 'yd_conc', color: CONC_WALL, collide: false, plinth: true, crown: false, plinthColor: 0xcfc6b4 });
      // 벽 머리 돌림띠(옆벽·뒷벽): 천장 바로 아래 크림색 띠 — 한 묶음
      [-1, 1].forEach(function (s) { ctx.boxAABB({ x0: s < 0 ? -HW : HW - 0.12, x1: s < 0 ? -HW + 0.12 : HW, z0: ZF, z1: ZB, y0: H - 0.35, y1: H, surf: 'yd_cream', color: 0xf0e6d2 }); });
      ctx.boxAABB({ x0: -HW, x1: HW, z0: ZB - 0.12, z1: ZB, y0: H - 0.35, y1: H, surf: 'yd_cream', color: 0xf0e6d2 });

      // ---------- 큰 둥근 피어(제단 앞 모서리): 세로 홈 줄의 거친 돌, 약 1.25m 마다 가로 이음, 앞에 벽등 ----------
      var NPI = low ? 14 : 24;
      [-1, 1].forEach(function (s) {
        var px = s * PIER.x, pz = PIER.z, r = PIER.r;
        ringWall(concB, px, pz, r, -PI, PI, NPI, 0, H, 0xb2ada0, 0xcac4b6, false, 2.0);
        for (var y = 1.25; y < H - 0.5; y += 1.25) ringWall(solid, px, pz, r + 0.006, -PI, PI, NPI, y - 0.015, y + 0.015, 0x5e5a52, 0x5e5a52, false);
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
        var y0 = YL + DH * k, y1 = y0 + DH, full = y0 >= H - 0.01;
        if (full) ringWall(cream, 0, ZF, RD, -PI, PI, NF, y0, y1, bandLo, bandHi, true);
        else ringWall(cream, 0, ZF, RD, -FE, FE, NS, y0, y1, bandLo, bandHi, true);
        ringWall(cream, 0, ZF, RD - 0.006, full ? -PI : -FE, full ? PI : FE, full ? NF : NS, y0 - 0.016, y0 + 0.016, C.joint, C.joint, true);   // 가로 이음
      }
      // 세로 이음(약 32° 마다, 가운데 판이 그리스도 상 뒤): 10m 아래는 ±80° 까지, 위는 한 바퀴
      [-80, -48, -16, 16, 48, 80].forEach(function (f) { vline(cream, 0, ZF, RD - 0.007, f * D2R, YL, DT, 0.03, C.joint); });
      [112, 144, 176, -176, -144, -112].forEach(function (f) { vline(cream, 0, ZF, RD - 0.007, f * D2R, H, DT, 0.03, C.joint); });
      // 드럼 앞 끝(현 앞 90°…100°)의 바깥 면: 옆 통로에서 보인다
      [-1, 1].forEach(function (s) { ringWall(cream, 0, ZF, RD + 0.3, s < 0 ? -FE : PI / 2, s < 0 ? -PI / 2 : FE, 3, YP, H, 0xece2cf, 0xf4ecdc, false); });
      // 꼭대기: 어두운 테두리 천장(고리) + 가운데 한 단 높은 어두운 원(사진 4)
      var RT = 1.7;
      annulus(ceil, 0, ZF, RT, RD, -PI, PI, NF / 2, DT, 0x9ea4aa, false);
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

      // ---------- 천장: 평천장(10m), 드럼 앞 반원 구멍 + 가운데 팔각 오목(11m), 오목 둘레 간접등 ----------
      var dn = function (x, z) { return [x, 0, z]; };
      var zA = ZF + RD;
      (function () {   // 드럼 앞 띠(z ZF…zA): 반원 구멍 둘레를 옆벽까지 채운다
        var NH = low ? 10 : 18;
        for (var q = 0; q < NH; q++) {
          var a0 = PI / 2 * q / NH, a1 = PI / 2 * (q + 1) / NH;
          [-1, 1].forEach(function (s) {
            var p0 = [s * RD * sin(a0), ZF + RD * cos(a0)], p1 = [s * RD * sin(a1), ZF + RD * cos(a1)];
            ceil.addQuad([p0[0], H, p0[1]], [s * HW, H, p0[1]], [s * HW, H, p1[1]], [p1[0], H, p1[1]], 0xffffff, dn(s * 7, (p0[1] + p1[1]) / 2), { vary: 0 });
          });
        }
      })();
      var t8 = Math.tan(PI / 8), oa = OCT.a, os = oa * t8, cz = OCT.cz;
      var O = [[-os, cz - oa], [os, cz - oa], [oa, cz - os], [oa, cz + os], [os, cz + oa], [-os, cz + oa], [-oa, cz + os], [-oa, cz - os]];
      var R4 = [[-HW, zA], [HW, zA], [HW, ZB], [-HW, ZB]];
      function cq(a, b, c, d) { ceil.addQuad([a[0], H, a[1]], [b[0], H, b[1]], [c[0], H, c[1]], [d[0], H, d[1]], 0xffffff, dn((a[0] + c[0]) / 2, (a[1] + c[1]) / 2), { vary: 0 }); }
      function ct(a, b, c) { ceil.addTris([a[0], H, a[1], b[0], H, b[1], c[0], H, c[1]], 0xffffff, dn((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3)); }
      cq(R4[0], R4[1], O[1], O[0]); ct(R4[1], O[2], O[1]);
      cq(R4[1], R4[2], O[3], O[2]); ct(R4[2], O[4], O[3]);
      cq(R4[2], R4[3], O[5], O[4]); ct(R4[3], O[6], O[5]);
      cq(R4[3], R4[0], O[7], O[6]); ct(R4[0], O[0], O[7]);
      for (i = 0; i < 8; i++) {
        var A = O[i], B = O[(i + 1) % 8];
        ceil.addQuad([A[0], H, A[1]], [B[0], H, B[1]], [B[0], OCT.y, B[1]], [A[0], OCT.y, A[1]], 0xf6efe2, [0, 10.5, cz], { vary: 0 });   // 오목 옆면(안쪽을 봄)
        ceil.addTris([0, OCT.y, cz, A[0], OCT.y, A[1], B[0], OCT.y, B[1]], 0xfff8ec, [0, 0, cz]);                                // 오목 천장
        var ix = A[0] * 0.995, iz = cz + (A[1] - cz) * 0.995, jx = B[0] * 0.995, jz = cz + (B[1] - cz) * 0.995;
        glow.addQuad([ix, H + 0.04, iz], [jx, H + 0.04, jz], [jx, H + 0.2, jz], [ix, H + 0.2, iz], hdr(C.lamp, 1.5), [0, 10.5, cz], { vary: 0 });
      }
      // 매입등(발광 원판, 스프라이트 아님): 오목·드럼 구멍 밖 평천장 + 성가대석 아래
      var downs = [];
      [-8.5, -4.5, 4.5, 8.5].forEach(function (x) { [-7.5, -3.0, 1.5, 6.0, 10.5, 14.5].forEach(function (z) { if (Math.abs(x) > oa + 0.4 || z < cz - oa - 0.4 || z > cz + oa + 0.4) downs.push([x, H - 0.012, z]); }); });
      [-1.5, 1.5].forEach(function (x) { downs.push([x, H - 0.012, 13.5]); });
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
        for (var q = 0; q < SIDE_WIN.length - 1; q++) {
          var z = (SIDE_WIN[q] + SIDE_WIN[q + 1]) / 2, x = s * (HW - 0.02);
          ctx.boxAABB({ x0: s < 0 ? -HW : HW - 0.05, x1: s < 0 ? -HW + 0.05 : HW, z0: z - 0.12, z1: z + 0.12, y0: 3.15, y1: 3.55, color: C.bronze, mat: 'metal' });
          glow.add(Geo.cyl(low ? 8 : 12, 1), hdr(0xffd9a0, 2.2), { x: x - s * 0.11, y: 3.25, z: z, sx: 0.1, sy: 0.22, sz: 0.1, flat: false, vary: 0 });
        }
      });

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

      // ---------- 문: 뒷벽 가운데 쌍여닫이(닫힘, 나무 + 유리 띠) + 양옆 외여닫이 ----------
      function doorAt(x0, x1, hgt) {
        var zf = ZB - 0.02, w = x1 - x0;
        ctx.boxAABB({ x0: x0 - 0.12, x1: x1 + 0.12, z0: zf - 0.04, z1: ZB, y0: 0, y1: hgt + 0.12, color: C.doorD, mat: 'wood' });   // 문틀
        ctx.boxAABB({ x0: x0, x1: x1, z0: zf - 0.07, z1: zf - 0.04, y0: 0.02, y1: hgt, color: C.door, mat: 'wood' });
        var leaves = w > 1.4 ? 2 : 1;
        for (var q = 0; q < leaves; q++) {
          var lx0 = x0 + w * q / leaves, lx1 = x0 + w * (q + 1) / leaves;
          ctx.boxAABB({ x0: lx0 + 0.12, x1: lx1 - 0.12, z0: zf - 0.085, z1: zf - 0.07, y0: 0.3, y1: 1.0, color: C.doorD, mat: 'wood' });
          glow.addQuad([lx0 + 0.16, 1.25, zf - 0.075], [lx1 - 0.16, 1.25, zf - 0.075], [lx1 - 0.16, hgt - 0.3, zf - 0.075], [lx0 + 0.16, hgt - 0.3, zf - 0.075], hdr(0xe8efe8, 0.55), [0, 1.5, 0], { vary: 0 });   // 문 유리(바깥 로비 빛)
          ctx.cyl({ x: q === 0 && leaves === 2 ? lx1 - 0.1 : (leaves === 1 ? lx1 - 0.12 : lx0 + 0.1), y: 0.9, z: zf - 0.11, r: 0.018, h: 0.4, seg: 8, color: 0xb9b3a6, mat: 'metal' });
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

      // ---------- 신자석 162석: 꿀빛 나무 긴 의자(둥근 옆판 머리) ----------
      ctx.renderSeats(layout, 'bench', { surf: null, wood: 0xbf7e44, seat: 0xc98a4c, back: 0xa96c38, kneelerColor: 0x6a4a34 });

      // ---------- 조명·카메라 ----------
      ctx.addLight({ x: 0, y: 7.0, z: -9.4, color: 0xffe0b0, intensity: 1.0, distance: 18, kind: 'lamp' });
      // 천장 10m, 성가대석 밑면 4.8m: 카메라는 9m 아래, 경계 안쪽
      ctx.setCameraBounds({ x0: -HW + 0.3, x1: HW - 0.3, z0: ZF - RB + 0.3, z1: ZB - 0.3, yMax: 8.5 });
      void ZSTEP; void annulus;
    }
  };
})();
