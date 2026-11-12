/* ch_florence.js — 피렌체 대성당(Santa Maria del Fiore) 내부. 실제의 45% 저폴리 모형.
   조사서: docs/church/interiors/florence.md (§11 채택값: 4칸 신랑, 신랑 폭 16.5m, 칸 19.84m, 측랑 9.1m, 궁륭 43m)
   좌표(앱 m): 입구 +z, 제대(동쪽) -z. 팔각(돔) 중심 (0,-12.93). */
(function () {
  'use strict';
  var layout = {
    id: 'florence', scalePercent: 45,
    bounds: { x0: -20.2, x1: 20.2, z0: -33.5, z1: 33.5 },
    spawn: { x: 0, z: 31.3, r: 0 },
    seatGroups: [
      { g: 'NL', rows: 12, perRow: 3, origin: { x: -1.3, z: 0.0 }, dx: -1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.6, 0.4] },
      { g: 'NR', rows: 12, perRow: 3, origin: { x: 1.3, z: 0.0 }, dx: 1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.6, 0.4] },
      { g: 'OL', rows: 3, perRow: 3, origin: { x: -5.8, z: -13.4 }, dx: -1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.6, 0.4] },
      { g: 'OR', rows: 3, perRow: 3, origin: { x: 5.8, z: -13.4 }, dx: 1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.6, 0.4] }
    ],
    candles: {
      stands: [
        { x: 7.0, z: 29.2, slots: 48, reach: 1.8, cols: 12, face: [-1, 0], pitch: 0.5, step: 0.25, ystep: 0.3, y0: 0.8 },
        { x: 7.0, z: 11.4, slots: 48, reach: 1.8, cols: 12, face: [-1, 0], pitch: 0.5, step: 0.25, ystep: 0.3, y0: 0.8 }
      ]
    },
    info: { name: '피렌체 대성당', place: '이탈리아 피렌체', builtYear: '1296–1436' }
  };
  ChurchLayouts.register(layout);

  ChurchBuilders['florence'] = {
    layout: layout,
    thumb: { x: 0, z: -4.5, yaw: 0, pitch: 8, zoom: 1.0, hour: 11, tilt: 0.95 },
    build: function (ctx) {
      var T = ctx.THREE, PI = Math.PI, solid = ctx.solid;
      var low = ctx.quality === 'low';
      var rnd = ctx.rng(4242);

      // ------------------------------------------------------------ 상수(앱 m)
      var CX = 0, CZ = -12.93, RI = 9.45, LH = RI * Math.tan(PI / 8), RV = RI / Math.cos(PI / 8);
      var Z_IN = 33.65, Z_NE = -1.95, Z_OW = CZ + RI;
      var XI = 3.75, XO = 4.85, XP = 4.3, XW = 8.55;
      var BAYS = [33.65, 24.75, 15.85, 6.95, -1.95], HB = 4.45;
      var Y_AS = 5.9, Y_BAL = 13.5, R_NAVE = 5.85, R_AIS = 5.0;
      var Y_OCT = 18.9, Y_DR = 24.3, DOME_RISE = 16.2;
      var Y_BIG = 7.2, R_BIG = 5.0, A_BIG = 3.75;
      var BAYZ = [BAYS[0], BAYS[1], BAYS[2], BAYS[3], Z_OW];

      // ------------------------------------------------------------ 색
      var PL_LO = 0xd2c9b6, PL_HI = 0xf0eadd;
      var ST = 0xd3cdc3, ST_L = 0xeee8dc, ST_D = 0xa8a298, ST_DK = 0x8a847b, RIB = 0xc2bcb0;   // 사진 질감(stone_grey)에 곱해지는 색조
      var V_LO = 0xe6e0d2, V_HI = 0xfffbf0;
      var WOOD = 0x3e2a1c, WOOD_L = 0x5a3d28, GOLD = 0xc9a44a, MARB = 0xf4f1ea, PINK = 0xa8483b, GREEN = 0x2e3b33;

      function C(c) { return ctx.color(c); }
      function lerpC(a, b, t) { return C(ctx.mix(a, b, Math.max(0, Math.min(1, t)))); }
      function gradFn(c0, c1, y0, y1) {
        var cache = {};
        return function (y) { var t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0))), k = Math.round(t * 40); return cache[k] || (cache[k] = lerpC(c0, c1, k / 40)); };
      }
      var HAS_SURF = typeof ctx.surfBatch === 'function';
      if (HAS_SURF) {
        ctx.defineSurface('fl_plaster', { tex: ctx.tex.plaster({ base: 0xf7f2e8, noise: 0.025 }), tile: 4, roughness: 0.93, envK: 0.6, normalScale: 0.3 });
        ctx.defineSurface('fl_wood', { photo: 'wood_dark', tile: 1.4, clearcoat: 0.4, ccRough: 0.25, normalScale: 0.5, envK: 0.9, color: 0xb59c8e, fb: 'wood' });
      }
      var plB = HAS_SURF ? ctx.surfBatch('fl_plaster') : solid, stB = HAS_SURF ? ctx.surfBatch('stone_grey') : solid;
      function withB(fn, B) { fn.B = B; return fn; }
      var cfPlaster = withB(gradFn(0xdcd6c9, 0xfffbf0, 0, 10), plB), cfWarm = withB(gradFn(0xd8cdb8, 0xf6ecd8, 0, 8), plB);
      var cfStone = withB(gradFn(0xb4aea4, 0xe0dacf, 0, 14), stB), cfSoffit = withB(gradFn(0x958f86, 0xbab4a8, 0, 14), stB);
      var woodB = HAS_SURF ? ctx.surfBatch('fl_wood') : solid;
      var cfWood = withB(function (y) { return C(y > 3 ? 0xe6d2bf : 0xd2b9a2); }, woodB);
      function flat(c) { var cc = C(c); return withB(function () { return cc; }, solid); }
      // 재질 래퍼: stone_grey 사진 질감 / 광택 대리석 / 옻칠 나무 / 금속
      function sbx(o) { o.surf = 'stone_grey'; ctx.box(o); } function scy(o) { o.surf = 'stone_grey'; ctx.cyl(o); } function sic(o) { o.surf = 'stone_grey'; ctx.ico(o); }
      function mbx(o) { o.surf = 'marble_white'; ctx.box(o); } function wbx(o) { o.mat = 'wood'; ctx.box(o); } function gbx(o) { o.mat = 'metal'; ctx.box(o); } function gcy(o) { o.mat = 'metal'; ctx.cyl(o); }

      // ------------------------------------------------------------ 기하 도우미
      function Pt(a, rise) {
        var R = (a * a + rise * rise) / (2 * a), cx = R - a, o = { a: a, rise: rise, R: R, cx: cx };
        o.f = function (u) { u = Math.abs(u); var v = R * R - (u + cx) * (u + cx); return v > 0 ? Math.sqrt(v) : 0; };
        o.ext = function (u, t) { u = Math.abs(u); var Ro = R + t, v = Ro * Ro - (u + cx) * (u + cx); return v > 0 ? Math.sqrt(v) : 0; };
        o.inv = function (h) { var v = R * R - h * h; return v > 0 ? Math.max(0, Math.sqrt(v) - cx) : 0; };
        o.phiA = Math.acos(Math.min(1, cx / R));
        o.arc = function (n) { var r = []; for (var p = 0; p <= n; p++) { var ph = o.phiA * p / n; r.push({ u: Math.max(0, -cx + R * Math.cos(ph)), h: R * Math.sin(ph) }); } return r; };
        o.arcOut = function (n, t) { var Ro = R + t, pa = Math.acos(Math.min(1, cx / Ro)), r = []; for (var p = 0; p <= n; p++) { var ph = pa * p / n; r.push({ u: Math.max(0, -cx + Ro * Math.cos(ph)), h: Ro * Math.sin(ph) }); } return r; };
        return o;
      }
      function quad4(A, B, Cc, D, cf, hint) {
        var cA = cf(A[1]), cB = cf(B[1]), cC = cf(Cc[1]), cD = cf(D[1]);
        (cf.B || solid).addTris([A[0], A[1], A[2], B[0], B[1], B[2], Cc[0], Cc[1], Cc[2], A[0], A[1], A[2], Cc[0], Cc[1], Cc[2], D[0], D[1], D[2]], [cA, cB, cC, cA, cC, cD], hint);
      }
      function quadC(P0, P1, P2, P3, c0, c1, c2, c3, hint) {
        plB.addTris([P0[0], P0[1], P0[2], P1[0], P1[1], P1[2], P2[0], P2[1], P2[2], P0[0], P0[1], P0[2], P2[0], P2[1], P2[2], P3[0], P3[1], P3[2]], [c0, c1, c2, c0, c2, c3], hint);
      }
      // 프레임: 벽면(또는 임의 수직면). world = (ox+ux*u+nx*d, y, oz+uz*u+nz*d); n = 보는 쪽(실내) 법선
      function FR(ox, oz, ux, uz, nx, nz) { return { ox: ox, oz: oz, ux: ux, uz: uz, nx: nx, nz: nz }; }
      function W(F, u, y, d) { return [F.ox + F.ux * u + F.nx * (d || 0), y, F.oz + F.uz * u + F.nz * (d || 0)]; }
      function uniq(arr, lo, hi) {
        var a = arr.filter(function (v) { return v >= lo - 1e-6 && v <= hi + 1e-6; }).sort(function (p, q) { return p - q; });
        var r = [a[0]]; for (var i = 1; i < a.length; i++) if (a[i] - r[r.length - 1] > 1e-4) r.push(a[i]);
        return r;
      }
      function fnOf(v) { return typeof v === 'function' ? v : function () { return v; }; }
      // 벽 패널(수직면). holes: {cu,hw,lo(u),hi(u),pts:[u...]} — 진짜 개구부
      function panel(F, us, bF, tF, cf, d, holes) {
        bF = fnOf(bF); tF = fnOf(tF); holes = holes || [];
        var arr = us.slice(), lo = Math.min.apply(null, us), hi = Math.max.apply(null, us);
        holes.forEach(function (h) { arr.push(h.cu - h.hw, h.cu + h.hw); (h.pts || []).forEach(function (p) { arr.push(p); }); });
        arr = uniq(arr, lo, hi);
        var hx = F.ox + F.nx * 6, hz = F.oz + F.nz * 6;
        function col(u0, u1, bf, tf) {
          var b0 = bf(u0), b1 = bf(u1), t0 = Math.max(tf(u0), b0), t1 = Math.max(tf(u1), b1);
          if (t0 - b0 < 1e-4 && t1 - b1 < 1e-4) return;
          quad4(W(F, u0, b0, d), W(F, u1, b1, d), W(F, u1, t1, d), W(F, u0, t0, d), cf, [hx, (b0 + t0) / 2, hz]);
        }
        for (var i = 0; i < arr.length - 1; i++) {
          var u0 = arr[i], u1 = arr[i + 1], um = (u0 + u1) / 2, h = null;
          for (var k = 0; k < holes.length; k++) if (Math.abs(um - holes[k].cu) < holes[k].hw) h = holes[k];
          if (!h) col(u0, u1, bF, tF);
          else {
            col(u0, u1, bF, function (u) { return Math.min(tF(u), h.lo(u)); });
            col(u0, u1, function (u) { return Math.max(bF(u), h.hi(u)); }, tF);
          }
        }
      }
      function arcU(P, cu) { var r = []; P.arc(10).forEach(function (q) { r.push(cu + q.u, cu - q.u); }); return r; }
      function archBand(F, cu, sp, P, T, n, cf, d) {
        var I = P.arc(n), O = P.arcOut(n, T), hx = F.ox + F.nx * 6, hz = F.oz + F.nz * 6;
        [-1, 1].forEach(function (sg) {
          for (var p = 0; p < n; p++) {
            var A = W(F, cu + sg * I[p].u, sp + I[p].h, d), B = W(F, cu + sg * I[p + 1].u, sp + I[p + 1].h, d);
            var Cc = W(F, cu + sg * O[p + 1].u, sp + O[p + 1].h, d), D = W(F, cu + sg * O[p].u, sp + O[p].h, d);
            quad4(A, B, Cc, D, cf, [hx, (A[1] + Cc[1]) / 2, hz]);
          }
        });
      }
      function soffit(F, cu, sp, P, d0, d1, n, cf) {
        var I = P.arc(n), mid = (d0 + d1) / 2;
        [-1, 1].forEach(function (sg) {
          for (var p = 0; p < n; p++) {
            var A = W(F, cu + sg * I[p].u, sp + I[p].h, d0), B = W(F, cu + sg * I[p + 1].u, sp + I[p + 1].h, d0);
            var Cc = W(F, cu + sg * I[p + 1].u, sp + I[p + 1].h, d1), D = W(F, cu + sg * I[p].u, sp + I[p].h, d1);
            quad4(A, B, Cc, D, cf, W(F, cu, sp - 2, mid));
          }
        });
      }
      // 아치 개구부가 있는 벽(위 패널 + 문설주 + 아치띠)
      function archedWall(F, o) {
        var a = o.a, cu = o.cu || 0, T = o.T, sp = o.spring, P = Pt(a, o.rise), n = o.n || 8;
        var us = [o.u0, o.u1, cu - a, cu + a, cu - a - T, cu + a + T];
        P.arcOut(n, T).concat(P.arc(n)).forEach(function (q) { us.push(cu + q.u, cu - q.u); });
        (o.extraU || []).forEach(function (v) { us.push(v); });
        us = uniq(us, o.u0, o.u1);
        panel(F, us, function (u) { return sp + P.ext(u - cu, T); }, o.top, o.cf || cfPlaster, 0, o.holes);
        if (o.jambs !== false) {
          if (cu - a - o.u0 > 1e-3) panel(F, [o.u0, cu - a], 0, sp, o.jambCf || cfStone, 0);
          if (o.u1 - (cu + a) > 1e-3) panel(F, [cu + a, o.u1], 0, sp, o.jambCf || cfStone, 0);
        }
        archBand(F, cu, sp, P, T, n, o.bandCf || cfStone, 0.012);
      }
      // 진짜 창 개구부: 프레임 F 위 hole 을 따라 안쪽 벽(reveal)을 세운다. D = 벽 두께 방향 깊이(−n)
      function reveal(F, hole, D) {
        var L = hole.loop, hint = W(F, hole.cu, hole.cy, -D / 2);
        for (var i = 0; i < L.length; i++) {
          var a = L[i], b = L[(i + 1) % L.length];
          quad4(W(F, a[0], a[1], 0), W(F, b[0], b[1], 0), W(F, b[0], b[1], -D), W(F, a[0], a[1], -D), cfWarm, hint);
        }
      }
      function holeLancet(cu, y0, w, h) {
        var hw = w / 2 + 0.16, rise = 0.72 * w + 0.1, P = Pt(hw, rise), y1 = y0 + h, loop = [[cu - hw, y0], [cu + hw, y0], [cu + hw, y1]], i, arc = P.arc(8);
        for (i = 1; i <= 8; i++) loop.push([cu + arc[i].u, y1 + arc[i].h]);
        for (i = 7; i >= 0; i--) loop.push([cu - arc[i].u, y1 + arc[i].h]);
        loop.push([cu - hw, y1]);
        var pts = arc.map(function (q) { return cu + q.u; }).concat(arc.map(function (q) { return cu - q.u; }));
        return { cu: cu, hw: hw, cy: y0 + (h + rise) / 2, lo: function () { return y0; }, hi: function (u) { return y1 + P.f(u - cu); }, loop: loop, pts: pts };
      }
      function holeRound(cu, cy, r) {
        var rr = r + 0.14, loop = [], pts = [], n = 20;
        for (var i = 0; i < n; i++) { var a = i / n * PI * 2; loop.push([cu + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
        for (i = 0; i <= 16; i++) pts.push(cu - rr + 2 * rr * i / 16);
        return { cu: cu, hw: rr, cy: cy, lo: function (u) { var q = rr * rr - (u - cu) * (u - cu); return cy - (q > 0 ? Math.sqrt(q) : 0); }, hi: function (u) { var q = rr * rr - (u - cu) * (u - cu); return cy + (q > 0 ? Math.sqrt(q) : 0); }, loop: loop, pts: pts };
      }
      var GLASS = [0x3b5fc0, 0xd94a4a, 0xf2c94c, 0x4f86e0, 0x5cb97f, 0xb54a5a];

      // ------------------------------------------------------------ 교차(늑골) 궁륭: max(fu,fv)
      function crossVault(o) {
        var xc = (o.xa + o.xb) / 2, zc = (o.za + o.zb) / 2, au = (o.xb - o.xa) / 2, av = (o.zb - o.za) / 2, y = o.y, rise = o.rise;
        var pu = Pt(au, rise), pv = Pt(av, rise), n = o.n || 7, arc = pu.arc(n);
        var hint = [xc, y - 4, zc], uu = [], vv = [], hh = [];
        for (var p = 0; p <= n; p++) { uu.push(arc[p].u); hh.push(arc[p].h); vv.push(pv.inv(arc[p].h)); }
        function vc(h) { return lerpC(o.lo || V_LO, o.hi || V_HI, h / rise); }
        function P3(sx, sz, u, v, h) { return [xc + sx * u, y + h, zc + sz * v]; }
        [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) {
          for (var p = 0; p < n; p++) {
            // 횡단 통(fu)
            quadC(P3(sx, sz, uu[p], vv[p], hh[p]), P3(sx, sz, uu[p + 1], vv[p + 1], hh[p + 1]), P3(sx, sz, uu[p + 1], av, hh[p + 1]), P3(sx, sz, uu[p], av, hh[p]), vc(hh[p]), vc(hh[p + 1]), vc(hh[p + 1]), vc(hh[p]), hint);
            // 측면 루네트(fv)
            quadC(P3(sx, sz, uu[p], vv[p], hh[p]), P3(sx, sz, au, vv[p], hh[p]), P3(sx, sz, au, vv[p + 1], hh[p + 1]), P3(sx, sz, uu[p + 1], vv[p + 1], hh[p + 1]), vc(hh[p]), vc(hh[p]), vc(hh[p + 1]), vc(hh[p + 1]), hint);
          }
        }); });
        var rc = o.rib === undefined ? RIB : o.rib, rt = o.ribT || 0.22, rd = o.ribD || 0.34;
        [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) {
          for (var p = 0; p < n; p++) stB.addBeam(P3(sx, sz, uu[p], vv[p], hh[p] - 0.03), P3(sx, sz, uu[p + 1], vv[p + 1], hh[p + 1] - 0.03), rt, rd, rc, { vary: 0.02 });
        }); });
        // 횡단 아치(칸 경계)
        [-1, 1].forEach(function (sz) {
          if (sz < 0 && o.noNorth) return; if (sz > 0 && o.noSouth) return;
          [-1, 1].forEach(function (sx) {
            for (var p = 0; p < n; p++) stB.addBeam(P3(sx, sz, uu[p], av, hh[p] - 0.03), P3(sx, sz, uu[p + 1], av, hh[p + 1] - 0.03), rt * 1.15, rd * 1.2, rc, { vary: 0.02 });
          });
        });
        sic({ x: xc, y: y + rise - 0.2, z: zc, r: 0.2, color: ST_L, detail: 0 });
      }

      // ------------------------------------------------------------ 충돌 도우미
      function colSeg(x0, z0, x1, z1, t) {
        var dx = x1 - x0, dz = z1 - z0, len = Math.sqrt(dx * dx + dz * dz);
        if (Math.abs(dz) < 1e-6) { ctx.addCollider({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: z0 - t / 2, z1: z0 + t / 2 }); return; }
        if (Math.abs(dx) < 1e-6) { ctx.addCollider({ x0: x0 - t / 2, x1: x0 + t / 2, z0: Math.min(z0, z1), z1: Math.max(z0, z1) }); return; }
        var n = Math.max(1, Math.ceil(len / 0.8));
        for (var i = 0; i <= n; i++) ctx.addCollider({ x: x0 + dx * i / n, z: z0 + dz * i / n, r: t / 2 + 0.1 });
      }
      function colRect(x0, z0, x1, z1) { ctx.addCollider({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) }); }

      // ------------------------------------------------------------ 팔각 면 데이터
      var FACE = [];
      for (var k0 = 0; k0 < 8; k0++) { var th = k0 * PI / 4; FACE.push({ d: [Math.sin(th), Math.cos(th)], l: [Math.cos(th), -Math.sin(th)], th: th }); }
      function FP(k, s, f) { var q = FACE[k]; return [CX + q.d[0] * f + q.l[0] * s, CZ + q.d[1] * f + q.l[1] * s]; }
      function faceFrame(k, f) { var q = FACE[k], p = FP(k, 0, f); return FR(p[0], p[1], q.l[0], q.l[1], -q.d[0], -q.d[1]); }
      function ryK(k) { return Math.atan2(-FACE[k].l[1], FACE[k].l[0]); }

      // ============================================================ 바닥(다색 대리석 — 캔버스)
      function marbleBase(g, w, h, seed) {
        var r = ctx.rng(seed || 1);
        g.fillStyle = '#f2eee4'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 40; i++) { g.strokeStyle = 'rgba(130,125,115,' + (0.04 + r() * 0.07) + ')'; g.lineWidth = 1; g.beginPath(); var x = r() * w, y = r() * h; g.moveTo(x, y); for (var s = 0; s < 4; s++) { x += (r() - 0.5) * 90; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
      }
      function poly(g, pts, fill, stroke) {
        g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath();
        if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); }
      }
      function reg(cx, cy, r, n, rot) { var o = []; for (var i = 0; i < n; i++) { var a = rot + i / n * PI * 2; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
      function disc(g, cx, cy, r, fill) { g.beginPath(); g.arc(cx, cy, r, 0, PI * 2); g.fillStyle = fill; g.fill(); }
      function star(g, cx, cy, r1, r2, n, rot, fill) { var o = []; for (var i = 0; i < n * 2; i++) { var a = rot + i / (n * 2) * PI * 2, r = i % 2 ? r2 : r1; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } poly(g, o, fill); }
      var cPink = '#b0574b', cGreen = '#33503f', cDark = '#26302a', cGrey = '#bdb8ac', cWhite = '#f5f1e8';
      function roundel(g, cx, cy, m, rings) { rings.forEach(function (rg) { disc(g, cx, cy, rg[0] * m, rg[1]); }); }
      function frameBands(g, w, h, m) {
        g.strokeStyle = cGreen; g.lineWidth = 0.22 * m; g.strokeRect(0.3 * m, 0.3 * m, w - 0.6 * m, h - 0.6 * m);
        g.strokeStyle = cPink; g.lineWidth = 0.1 * m; g.strokeRect(0.62 * m, 0.62 * m, w - 1.24 * m, h - 1.24 * m);
        g.strokeStyle = cGrey; g.lineWidth = 0.06 * m; g.strokeRect(0.8 * m, 0.8 * m, w - 1.6 * m, h - 1.6 * m);
      }
      function drawBay(g, w, h, variant) {
        {
          var m = w / 17.1, cx = w / 2, cy = h / 2;
          marbleBase(g, w, h, 11 + variant);
          if (variant === 0) {
            roundel(g, cx, cy, m, [[3.9, cGrey], [3.7, cGreen], [3.4, cWhite], [3.2, cPink], [2.6, cWhite], [2.4, cGreen], [1.9, cWhite], [1.6, cPink], [0.95, cDark]]);
            star(g, cx, cy, 2.3 * m, 1.5 * m, 8, PI / 8, cWhite); star(g, cx, cy, 0.9 * m, 0.45 * m, 8, 0, cPink);
            [[-6.4, -2.4], [6.4, -2.4], [-6.4, 2.4], [6.4, 2.4]].forEach(function (c) { poly(g, reg(cx + c[0] * m, cy + c[1] * m, 1.5 * m, 4, PI / 4), cPink); poly(g, reg(cx + c[0] * m, cy + c[1] * m, 0.95 * m, 4, PI / 4), cWhite); poly(g, reg(cx + c[0] * m, cy + c[1] * m, 0.5 * m, 4, PI / 4), cGreen); });
          } else if (variant === 1) {
            var s = 1.9 * m;
            for (var j = -1; j < h / s + 1; j++) for (var i = -1; i < w / s + 1; i++) {
              var px = i * s + (j % 2 ? s / 2 : 0), py = j * s * 0.5 + s * 0.25;
              var c = [cPink, cGreen, cWhite][(i + j * 2 + 9) % 3]; poly(g, reg(px, py, s * 0.52, 4, 0), c, 'rgba(60,55,50,0.25)');
              poly(g, reg(px, py, s * 0.26, 4, 0), c === cWhite ? cGrey : cWhite);
            }
          } else if (variant === 2) {
            poly(g, reg(cx, cy, 4.3 * m, 8, PI / 8), cGrey); poly(g, reg(cx, cy, 3.9 * m, 8, PI / 8), cPink); poly(g, reg(cx, cy, 3.3 * m, 8, PI / 8), cWhite); poly(g, reg(cx, cy, 2.7 * m, 8, PI / 8), cGreen);
            star(g, cx, cy, 2.5 * m, 1.1 * m, 8, 0, cWhite); poly(g, reg(cx, cy, 0.9 * m, 8, PI / 8), cPink); poly(g, reg(cx, cy, 0.5 * m, 8, PI / 8), cDark);
            [-1, 1].forEach(function (sg) { g.fillStyle = cGreen; g.fillRect(cx + sg * 5.6 * m - 0.25 * m, 0, 0.5 * m, h); g.fillStyle = cPink; g.fillRect(cx + sg * 5.6 * m - 0.07 * m, 0, 0.14 * m, h); });
          } else {
            [-5.4, 0, 5.4].forEach(function (dx) { roundel(g, cx + dx * m, cy, m, [[2.5, cGreen], [2.3, cWhite], [2.0, cPink], [1.5, cWhite], [1.2, cGreen], [0.6, cPink]]); });
            [-2.7, 2.7].forEach(function (dx) { poly(g, reg(cx + dx * m, cy, 1.0 * m, 4, 0), cPink); poly(g, reg(cx + dx * m, cy, 0.6 * m, 4, 0), cGreen); });
          }
          frameBands(g, w, h, m);
        }
      }
      function naveTex() {
        var Hs = [BAYZ[0] - BAYZ[1], BAYZ[1] - BAYZ[2], BAYZ[2] - BAYZ[3], BAYZ[3] - BAYZ[4]], tot = Hs[0] + Hs[1] + Hs[2] + Hs[3];
        return ctx.tex.custom(1024, 2048, function (g, w, h) {
          var y = 0;
          for (var bi = 3; bi >= 0; bi--) {   // 이미지 위쪽 = −z(동쪽)
            var bh = Math.round(Hs[bi] / tot * h);
            g.save(); g.beginPath(); g.rect(0, y, w, bh); g.clip(); g.translate(0, y); drawBay(g, w, bh, bi); g.restore();
            y += bh;
          }
        });
      }
      function octFloorTex() {
        return ctx.tex.custom(1024, 1024, function (g, w, h) {
          var m = w / (2 * RI), cx = w / 2, cy = h / 2;
          marbleBase(g, w, h, 77);
          function oct(ap, fill) { poly(g, reg(cx, cy, ap / Math.cos(PI / 8) * m, 8, PI / 8), fill); }
          oct(9.4, cGrey); oct(9.1, cWhite); oct(8.7, cPink); oct(8.3, cWhite); oct(7.4, cGreen); oct(7.0, cWhite); oct(6.0, cPink); oct(5.6, cWhite);
          oct(4.4, cGreen); oct(4.0, cWhite); oct(3.0, cPink); oct(2.6, cWhite); oct(1.6, cDark);
          for (var i = 0; i < 8; i++) { var a = i * PI / 4; g.strokeStyle = cGreen; g.lineWidth = 0.14 * m; g.beginPath(); g.moveTo(cx + Math.cos(a) * 1.7 * m, cy + Math.sin(a) * 1.7 * m); g.lineTo(cx + Math.cos(a) * 9.2 * m, cy + Math.sin(a) * 9.2 * m); g.stroke(); }
          star(g, cx, cy, 1.5 * m, 0.7 * m, 8, 0, cWhite); poly(g, reg(cx, cy, 0.5 * m, 8, PI / 8), cPink);
          for (i = 0; i < 8; i++) { var b = i * PI / 4 + PI / 8; disc(g, cx + Math.cos(b) * 5.0 * m, cy + Math.sin(b) * 5.0 * m, 0.45 * m, cDark); }
        });
      }
      function choirTex() {
        return ctx.tex.custom(512, 512, function (g, w, h) {
          var m = w / 9.9, cx = w / 2, cy = h / 2; marbleBase(g, w, h, 5);
          poly(g, reg(cx, cy, 4.9 / Math.cos(PI / 8) * m, 8, PI / 8), cWhite, cGreen);
          poly(g, reg(cx, cy, 4.2 / Math.cos(PI / 8) * m, 8, PI / 8), null, cPink);
          star(g, cx, cy, 3.4 * m, 1.6 * m, 8, PI / 8, cPink); star(g, cx, cy, 2.5 * m, 1.0 * m, 8, 0, cWhite); disc(g, cx, cy, 0.7 * m, cGreen);
        });
      }
      function latticeTex() {
        return ctx.tex.custom(512, 512, function (g, w, h) {
          marbleBase(g, w, h, 31); var s = w / 2;
          for (var j = 0; j < 4; j++) for (var i = 0; i < 2; i++) {
            var px = i * s + (j % 2 ? s / 2 : 0), py = j * s / 2 + s / 4, c = [cPink, cGreen][(i + j) % 2];
            poly(g, reg(px, py, s * 0.5, 4, 0), c, 'rgba(50,45,40,0.3)'); poly(g, reg(px, py, s * 0.22, 4, 0), cWhite);
          }
        });
      }
      // 다각형 바닥(볼록): uv 는 중심 기준 size m 당 1 반복(이미지 위쪽 = −z)
      function polyFloor(pts, y, tex, size, cx, cz, repeat) {
        var pos = [cx, y, cz], uv = [0.5, 0.5], nor = [0, 1, 0], idx = [], i, n = pts.length;
        for (i = 0; i < n; i++) { pos.push(pts[i][0], y, pts[i][1]); uv.push((pts[i][0] - cx) / size + 0.5, 0.5 - (pts[i][1] - cz) / size); nor.push(0, 1, 0); }
        for (i = 0; i < n; i++) idx.push(0, 1 + (i + 1) % n, 1 + i);
        var g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('normal', new T.BufferAttribute(new Float32Array(nor), 3)); g.setAttribute('uv', new T.BufferAttribute(new Float32Array(uv), 2));
        g.setIndex(idx);
        var t2 = tex.clone(); t2.needsUpdate = true; t2.wrapS = t2.wrapT = repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping; t2.anisotropy = 4;
        var pm = ctx.mesh(g, ctx.mats.standard({ map: t2, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.1, envMapIntensity: 1.0, side: T.DoubleSide })); pm.receiveShadow = true; return pm;
      }

      // 바닥: 신랑 4칸 + 팔각 + 트리부나
      // 광택 다색 대리석 바닥(반사): 신랑 전체 + 팔각 교차부
      ctx.floor({ x0: -XW, x1: XW, z0: Z_OW, z1: Z_IN, y: 0, tex: naveTex(), tile: [2 * XW, Z_IN - Z_OW], gloss: 0.88, reflect: 0.5 });
      ctx.floor({ x0: CX - RI, x1: CX + RI, z0: CZ - RI, z1: CZ + RI, y: 0, tex: octFloorTex(), tile: [2 * RI, 2 * RI], gloss: 0.92, reflect: 0.6 });


      // ============================================================ 신랑 · 측랑
      var pvN = Pt(HB, R_NAVE), pvA = Pt(HB, R_AIS), puN = Pt(XI, R_NAVE);
      var AIS_A = (XW - XO) / 2, AIS_C = (XO + XW) / 2, puA = Pt(AIS_A, R_AIS);
      var arcade = Pt(3.9, 4.45), pBig = Pt(A_BIG, R_BIG);
      function topEnd(u) { var a = Math.abs(u); return a <= XI ? Y_BAL + puN.f(u) : (a <= XO ? Y_BAL : Y_AS + puA.f(a - AIS_C)); }

      // --- 독립 기둥 6개: 주초·다발 기둥·잎 주두·궁륭 받침 벽기둥
      function pier(x, z, sx) {
        var w = 1.1;
        sbx({ x: x, y: 0, z: z, w: 1.55, h: 0.3, d: 1.55, color: ST_D });
        sbx({ x: x, y: 0.3, z: z, w: 1.32, h: 0.25, d: 1.32, color: ctx.shade(ST_D, 1.1) });
        var ys = [0.55, 1.5, 2.45, 3.4, 4.35], hs = [0.95, 0.95, 0.95, 0.95, 0.65], i;
        for (i = 0; i < ys.length; i++) sbx({ x: x, y: ys[i], z: z, w: w, h: hs[i] - 0.02, d: w, color: ctx.shade(ST, 0.94 + (i % 2) * 0.08), vary: 0.05 });
        for (var cx = -1; cx <= 1; cx += 2) for (var cz = -1; cz <= 1; cz += 2) scy({ x: x + cx * 0.57, y: 0.55, z: z + cz * 0.57, r: 0.15, h: 4.45, seg: 7, color: ST_L, vary: 0.04 });
        sbx({ x: x, y: 5.0, z: z, w: 1.22, h: 0.22, d: 1.22, color: ST_D });
        for (var q = 0; q < 12; q++) { var a = q / 12 * PI * 2; sic({ x: x + Math.cos(a) * 0.65, y: 5.3, z: z + Math.sin(a) * 0.65, sx: 0.17, sy: 0.22, sz: 0.17, color: ctx.shade(ST_L, 0.96), detail: 0 }); }
        sbx({ x: x, y: 5.2, z: z, w: 1.38, h: 0.2, d: 1.38, color: ST_L });
        sbx({ x: x, y: 5.45, z: z, w: 1.5, h: 0.16, d: 1.5, color: ST_D });
        sbx({ x: x, y: 5.6, z: z, w: 1.64, h: 0.3, d: 1.64, color: ST_L });
        var shx = sx * (XI - 0.17);
        sbx({ x: shx, y: 5.9, z: z, w: 0.34, h: 7.25, d: 0.5, color: ST, vary: 0.03 });
        sbx({ x: shx, y: 5.9, z: z, w: 0.22, h: 7.25, d: 0.68, color: ctx.shade(ST, 1.06), vary: 0.03 });
        sbx({ x: shx, y: 12.45, z: z, w: 0.5, h: 0.26, d: 0.78, color: ST_L });
        sbx({ x: shx, y: 12.71, z: z, w: 0.62, h: 0.3, d: 0.9, color: ST_D });
        colRect(sx * (XI - 0.05), z - 0.62, sx * (XO + 0.05), z + 0.62);
        if (ctx.aoDecal) ctx.aoDecal({ x0: x - 0.78, x1: x + 0.78, z0: z - 0.78, z1: z + 0.78, y: 0, pad: 0.35 });
      }
      [-1, 1].forEach(function (sx) { [BAYS[1], BAYS[2], BAYS[3]].forEach(function (z) { pier(sx * XP, z, sx); }); });

      // --- 아케이드 벽(칸마다): 신랑 면 + 측랑 면 + 쐐기 아치 + 둥근 고창(진짜 개구부)
      [-1, 1].forEach(function (sx) {
        for (var b = 0; b < 4; b++) {
          var zc = (BAYS[b] + BAYS[b + 1]) / 2;
          var Fn = FR(sx * XI, zc, 0, 1, -sx, 0), Fa = FR(sx * XO, zc, 0, 1, sx, 0);
          var ho = holeRound(0, 15.15, 0.95);
          archedWall(Fn, { u0: -HB, u1: HB, a: 3.9, spring: Y_AS, rise: 4.45, T: 0.5, top: function (u) { return Y_BAL + pvN.f(u); }, jambs: false, holes: [ho], extraU: arcU(pvN, 0) });
          reveal(Fn, { cu: 0, cy: 15.15, loop: ho.loop }, 1.0);
          ctx.rose({ x: sx * (XI + 0.75), y: 15.15, z: zc, face: [-sx, 0], r: 0.95, petals: 12, colors: GLASS, seed: 50 + b * 3 + (sx > 0 ? 1 : 0), beam: sx > 0 && b > 0, beamReach: 9 });
          archedWall(Fa, { u0: -HB, u1: HB, a: 3.9, spring: Y_AS, rise: 4.45, T: 0.5, top: function (u) { return Y_AS + pvA.f(u); }, jambs: false, extraU: arcU(pvA, 0) });
          soffit(Fn, 0, Y_AS, arcade, 0, -(XO - XI), 10, cfSoffit);
        }
      });

      // --- 궁륭: 신랑 4칸(첨두 늑골 교차) + 측랑 8칸
      for (var vb = 0; vb < 4; vb++) {
        crossVault({ xa: -XI, xb: XI, za: BAYS[vb + 1], zb: BAYS[vb], y: Y_BAL, rise: R_NAVE, n: low ? 5 : 8, noSouth: vb > 0, noNorth: false });
        [-1, 1].forEach(function (sx) {
          crossVault({ xa: sx < 0 ? -XW : XO, xb: sx < 0 ? -XO : XW, za: BAYS[vb + 1], zb: BAYS[vb], y: Y_AS, rise: R_AIS, n: low ? 4 : 6, noSouth: vb > 0, lo: 0xdcd5c6, hi: 0xf6f0e4 });
        });
      }

      // --- 측랑 바깥 벽: 이련 창(진짜 개구부) · 옆문 · 징두리
      [-1, 1].forEach(function (sx) {
        for (var b = 0; b < 4; b++) {
          var zc = (BAYS[b] + BAYS[b + 1]) / 2, F = FR(sx * XW, zc, 0, 1, -sx, 0), ho = holeLancet(0, 2.85, 1.3, 4.05);
          panel(F, [-HB, HB].concat(arcU(pvA, 0)), 0.0, function (u) { return Y_AS + pvA.f(u); }, cfPlaster, 0, [ho]);
          reveal(F, ho, 1.0);
          ctx.window({ x: sx * (XW + 0.75), y: 3.0, z: zc, face: [-sx, 0], w: 1.3, h: 3.9, top: 'pointed', pattern: 'lancet', colors: GLASS, seed: 11 + b * 5 + (sx > 0 ? 2 : 0), beamReach: 5 });
        }
        // 옆문(장식): 어두운 나무 문 + 돌 틀
        [22.8].concat(sx > 0 ? [0.6] : []).forEach(function (z) {
          var FD = FR(sx * XW, z, 0, 1, -sx, 0);
          panel(FD, [-0.75, 0.75], 0, 3.6, cfWood, 0.03); panel(FD, [-0.5, -0.05], 0.3, 3.0, cfWood, 0.07); panel(FD, [0.05, 0.5], 0.3, 3.0, cfWood, 0.07);
          sbx({ x: sx * (XW - 0.12), y: 0, z: z - 0.9, w: 0.24, h: 3.9, d: 0.3, color: ST_L });
          sbx({ x: sx * (XW - 0.12), y: 0, z: z + 0.9, w: 0.24, h: 3.9, d: 0.3, color: ST_L });
          sbx({ x: sx * (XW - 0.12), y: 3.6, z: z, w: 0.24, h: 0.35, d: 2.1, color: ST_L });
        });
        // 징두리(진한 회색 돌띠) + 굽도리
        sbx({ x: sx * (XW - 0.05), y: 0, z: (Z_IN + Z_NE) / 2, w: 0.1, h: 0.9, d: Z_IN - Z_NE, color: ST_D });
        sbx({ x: sx * (XW - 0.1), y: 0.9, z: (Z_IN + Z_NE) / 2, w: 0.2, h: 0.12, d: Z_IN - Z_NE, color: ST_L });
      });
      // 측랑 바깥 벽 충돌 + 입구 벽 충돌
      colRect(XW, -8.0, XW + 1.4, Z_IN + 1.2); colRect(-XW - 1.4, -8.0, -XW, Z_IN + 1.2);
      colRect(-XW - 1.4, Z_IN, XW + 1.4, Z_IN + 1.4);

      // ------------------------------------------------------------ 입구 벽(+z)
      (function () {
        var F = FR(0, Z_IN, 1, 0, 0, -1), us = [];
        for (var i = -8; i <= 8; i++) us.push(i);
        var hC = holeRound(0, 15.0, 1.5), hL = holeRound(-AIS_C, 8.3, 1.0), hR = holeRound(AIS_C, 8.3, 1.0);
        panel(F, [-XI, XI].concat(arcU(puN, 0)), 0, function (u) { return Y_BAL + puN.f(u); }, cfPlaster, 0, [hC]);
        panel(F, [-XW, -7.5, -AIS_C, -6, -XO].concat(arcU(puA, -AIS_C)), 0, function (u) { return Y_AS + puA.f(Math.abs(u) - AIS_C); }, cfPlaster, 0, [hL]);
        panel(F, [XO, 6, AIS_C, 7.5, XW].concat(arcU(puA, AIS_C)), 0, function (u) { return Y_AS + puA.f(Math.abs(u) - AIS_C); }, cfPlaster, 0, [hR]);
        panel(F, [XI, XO], 0, Y_BAL, cfStone, 0); panel(F, [-XO, -XI], 0, Y_BAL, cfStone, 0);
        [[hC, 15.0, 1.5, 0], [hL, 8.3, 1.0, -AIS_C], [hR, 8.3, 1.0, AIS_C]].forEach(function (q) {
          reveal(F, { cu: q[3], cy: q[1], loop: q[0].loop }, 1.0);
          ctx.rose({ x: q[3], y: q[1], z: Z_IN + 0.75, face: [0, -1], r: q[2], petals: 12, colors: GLASS, seed: 90 + Math.round(q[3]), beam: false });
        });
        // 문 3개(중앙 + 좌우 측랑) — 어두운 나무와 돌 틀
        [[0, 3.0, 5.0], [-AIS_C, 2.0, 4.2], [AIS_C, 2.0, 4.2]].forEach(function (d) {
          panel(F, [d[0] - d[1] / 2, d[0] + d[1] / 2], 0, d[2], cfWood, 0.03);
          panel(F, [d[0] - d[1] / 2 + 0.12, d[0] - 0.08], 0.35, d[2] - 0.75, cfWood, 0.07); panel(F, [d[0] + 0.08, d[0] + d[1] / 2 - 0.12], 0.35, d[2] - 0.75, cfWood, 0.07);
          var z = Z_IN - 0.1;
          sbx({ x: d[0] - d[1] / 2 - 0.2, y: 0, z: z - 0.05, w: 0.4, h: d[2] + 0.4, d: 0.4, color: ST_L });
          sbx({ x: d[0] + d[1] / 2 + 0.2, y: 0, z: z - 0.05, w: 0.4, h: d[2] + 0.4, d: 0.4, color: ST_L });
          sbx({ x: d[0], y: d[2], z: z - 0.05, w: d[1] + 1.0, h: 0.4, d: 0.4, color: ST_L });
        });
        // 중앙문 위 반월창(성모 대관 모자이크 느낌)과 우첼로의 시계
        var mos = ctx.tex.custom(512, 256, function (g, w, h) {
          g.fillStyle = '#c9a44a'; g.fillRect(0, 0, w, h);
          for (var i = 0; i < 700; i++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '255,235,160' : '120,80,20') + ',' + (0.08 + rnd() * 0.12) + ')'; g.fillRect(rnd() * w, rnd() * h, 6, 6); }
          disc(g, w / 2, h * 0.95, h * 0.78, '#27315e'); disc(g, w / 2, h * 0.95, h * 0.62, '#3b5fc0');
          disc(g, w * 0.43, h * 0.55, 26, '#e8c8a8'); disc(g, w * 0.57, h * 0.55, 26, '#e8c8a8');
          g.fillStyle = '#b83a32'; g.fillRect(w * 0.37, h * 0.62, 56, 90); g.fillStyle = '#f2f2f2'; g.fillRect(w * 0.55, h * 0.62, 56, 90);
          g.fillStyle = '#f2d27a'; g.fillRect(w * 0.48, h * 0.28, 16, 22);
        });
        ctx.plane({ x: 0, y: 5.5, z: Z_IN - 0.06, ry: PI, w: 3.4, h: 1.7, mat: ctx.mats.basic({ tex: mos }) });
        sbx({ x: 0, y: 5.35, z: Z_IN - 0.05, w: 3.7, h: 0.16, d: 0.12, color: ST_L });
        var clk = ctx.tex.custom(512, 512, function (g, w, h) {
          g.fillStyle = '#b9b0a0'; g.fillRect(0, 0, w, h);
          [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]].forEach(function (c, i) { disc(g, c[0] * w, c[1] * h, 38, ['#d9a845', '#3b5fc0', '#b83a32', '#5f7a5c'][i]); });
          disc(g, w / 2, h / 2, 226, '#8a6e3a'); disc(g, w / 2, h / 2, 212, '#27315e');
          for (var i = 0; i < 24; i++) { var a = i / 24 * PI * 2; g.fillStyle = '#e3c15a'; g.save(); g.translate(w / 2 + Math.cos(a) * 180, h / 2 + Math.sin(a) * 180); g.rotate(a); g.fillRect(-14, -(i % 6 === 0 ? 14 : 6), 28, i % 6 === 0 ? 28 : 12); g.restore(); }
          disc(g, w / 2, h / 2, 118, '#2c3b78'); star(g, w / 2, h / 2, 100, 40, 12, 0, '#d9b45a'); disc(g, w / 2, h / 2, 26, '#e3c15a');
          g.strokeStyle = '#e3c15a'; g.lineWidth = 12; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(-0.9) * 170, h / 2 + Math.sin(-0.9) * 170); g.stroke();
        });
        ctx.plane({ x: 0, y: 8.2, z: Z_IN - 0.07, ry: PI, w: 3.4, h: 3.4, mat: ctx.mats.basic({ tex: clk }) });
        sbx({ x: 0, y: 6.4, z: Z_IN - 0.05, w: 3.8, h: 0.14, d: 0.14, color: ST_L }); sbx({ x: 0, y: 9.96, z: Z_IN - 0.05, w: 3.8, h: 0.14, d: 0.14, color: ST_L });
        // 성수대
        ctx.holyFont({ x: -6.2, z: 32.6 }); ctx.holyFont({ x: 6.2, z: 32.6 });
      })();

      // ------------------------------------------------------------ 신랑 끝 벽(팔각으로 열린 큰 아치)
      (function () {
        var F = FR(0, Z_NE, 1, 0, 0, 1);
        archedWall(F, { u0: -XI, u1: XI, a: A_BIG, spring: Y_BIG, rise: R_BIG, T: 0.5, top: function (u) { return Y_BAL + puN.f(u); }, jambs: false, extraU: arcU(puN, 0) });
        panel(F, [XI, XO], 0, Y_BAL, cfStone, 0); panel(F, [-XO, -XI], 0, Y_BAL, cfStone, 0);
        panel(F, [-XW, -XO].concat(arcU(puA, -AIS_C)), 0, function (u) { return Y_AS + puA.f(Math.abs(u) - AIS_C); }, cfPlaster, 0);
        panel(F, [XO, XW].concat(arcU(puA, AIS_C)), 0, function (u) { return Y_AS + puA.f(Math.abs(u) - AIS_C); }, cfPlaster, 0);
        colRect(XI - 0.05, Z_OW - 1.0, XW + 1.4, Z_NE); colRect(-XW - 1.4, Z_OW - 1.0, -XI + 0.05, Z_NE);
      })();

      // 아치 터널(팔각 면의 두께/트리부나 입구): 첨두 통 궁륭 + 문설주
      function tunnel(k, f0, f1) {
        var arc = pBig.arc(10), mid = (f0 + f1) / 2, i, p;
        [-1, 1].forEach(function (sg) {
          var p0 = FP(k, sg * A_BIG, f0), p1 = FP(k, sg * A_BIG, f1), m = FP(k, 0, mid);
          quad4([p0[0], 0, p0[1]], [p1[0], 0, p1[1]], [p1[0], Y_BIG, p1[1]], [p0[0], Y_BIG, p0[1]], cfStone, [m[0], 3, m[1]]);
          for (i = 0; i < 10; i++) {
            var a0 = FP(k, sg * arc[i].u, f0), a1 = FP(k, sg * arc[i + 1].u, f0), b0 = FP(k, sg * arc[i].u, f1), b1 = FP(k, sg * arc[i + 1].u, f1);
            quad4([a0[0], Y_BIG + arc[i].h, a0[1]], [a1[0], Y_BIG + arc[i + 1].h, a1[1]], [b1[0], Y_BIG + arc[i + 1].h, b1[1]], [b0[0], Y_BIG + arc[i].h, b0[1]], cfSoffit, [m[0], Y_BIG - 2, m[1]]);
          }
        });
      }
      tunnel(0, RI, RI + (Z_NE - Z_OW));

      // ============================================================ 팔각(돔 아래 교차부)
      var DRUM_R = 0.8;
      for (var k = 0; k < 8; k++) (function (k) {
        var q = FACE[k], F = faceFrame(k, RI), ho = holeRound(0, 21.6, DRUM_R);
        if (k % 2 === 0) {
          archedWall(F, { u0: -LH, u1: LH, a: A_BIG, spring: Y_BIG, rise: R_BIG, T: 0.5, top: Y_DR, holes: [ho] });
        } else {
          panel(F, [-LH, LH], 0, 1.1, cfStone, 0); // 징두리
          panel(F, [-LH, LH], 1.1, Y_DR, cfPlaster, 0, [ho]);
        }
        reveal(F, { cu: 0, cy: 21.6, loop: ho.loop }, 1.0);
        var gp = FP(k, 0, RI + 0.75);
        ctx.rose({ x: gp[0], y: 21.6, z: gp[1], face: [-q.d[0], -q.d[1]], r: DRUM_R, petals: 10, colors: GLASS, seed: 130 + k, beam: false });
        // 가로 띠: 발코니(13.5) · 드럼 아래 돌림띠(18.9) · 돔 시작 띠(24.3)
        var cp = FP(k, 0, RI - 0.21);
        sbx({ x: cp[0], y: Y_BAL - 0.35, z: cp[1], w: 2 * LH + 0.5, h: 0.35, d: 0.42, ry: ryK(k), color: ST_L });
        var pp = FP(k, 0, RI - 0.05);
        sbx({ x: pp[0], y: Y_BAL, z: pp[1], w: 2 * LH + 0.2, h: 0.45, d: 0.1, ry: ryK(k), color: ST });
        var op = FP(k, 0, RI - 0.3);
        sbx({ x: op[0], y: Y_OCT - 0.5, z: op[1], w: 2 * LH + 0.7, h: 0.3, d: 0.6, ry: ryK(k), color: ST_L });
        sbx({ x: op[0], y: Y_OCT - 0.2, z: op[1], w: 2 * LH + 0.7, h: 0.2, d: 0.45, ry: ryK(k), color: ST });
        var dp = FP(k, 0, RI - 0.18);
        sbx({ x: dp[0], y: Y_DR - 0.4, z: dp[1], w: 2 * LH + 0.5, h: 0.4, d: 0.36, ry: ryK(k), color: ST_L });
        // 까치발(corbel)
        for (var c = -3; c <= 3; c++) { var cb = FP(k, c * 1.05, RI - 0.17); sbx({ x: cb[0], y: Y_BAL - 0.95, z: cb[1], w: 0.4, h: 0.6, d: 0.3, ry: ryK(k), color: ST }); }
        for (c = -3; c <= 3; c++) { var cb2 = FP(k, c * 1.05, RI - 0.2); sbx({ x: cb2[0], y: Y_OCT - 0.95, z: cb2[1], w: 0.3, h: 0.45, d: 0.35, ry: ryK(k), color: ST }); }
      })(k);
      // 충돌: 대각 벽 4개(두꺼운 벽) + 열린 면의 문설주
      [1, 3, 5, 7].forEach(function (k) { var a = FP(k, -LH, RI + 0.6), b = FP(k, LH, RI + 0.6); colSeg(a[0], a[1], b[0], b[1], 1.2); });
      [0, 2, 4, 6].forEach(function (k) {
        [-1, 1].forEach(function (sg) { var a = FP(k, sg * (A_BIG), RI - 0.05), b = FP(k, sg * (LH + 0.6), RI + 1.2); colRect(a[0], a[1], b[0], b[1]); });
      });
      // 8각 꼭짓점 벽기둥(거대 기둥) — 돌 다발 기둥 + 주두
      for (var m = 0; m < 8; m++) (function (m) {
        var th = (m + 0.5) * PI / 4, bx = Math.sin(th), bz = Math.cos(th), px = CX + bx * (RV - 0.5), pz = CZ + bz * (RV - 0.5);
        sbx({ x: px, y: 0, z: pz, w: 1.5, h: 0.4, d: 1.5, ry: th, color: ST_D });
        var ys = [0.4, 1.9, 3.4, 4.9];
        for (var i = 0; i < 4; i++) sbx({ x: px, y: ys[i], z: pz, w: 1.25, h: 1.48, d: 1.25, ry: th, color: ctx.shade(ST, 0.94 + (i % 2) * 0.08), vary: 0.05 });
        sbx({ x: px, y: 6.4, z: pz, w: 1.4, h: 0.5, d: 1.4, ry: th, color: ST_D });
        sbx({ x: px, y: 6.9, z: pz, w: 1.7, h: 0.3, d: 1.7, ry: th, color: ST_L });
        for (var q = 0; q < 12; q++) { var a = q / 12 * PI * 2; sic({ x: px + Math.cos(a) * 0.7, y: 6.65, z: pz + Math.sin(a) * 0.7, sx: 0.17, sy: 0.22, sz: 0.17, color: ST_L, detail: 0 }); }
        sbx({ x: px, y: 7.2, z: pz, w: 1.0, h: 6.3, d: 1.0, ry: th, color: ST, vary: 0.04 });
        sbx({ x: px, y: 13.2, z: pz, w: 1.3, h: 0.3, d: 1.3, ry: th, color: ST_L });
      })(m);

      // ------------------------------------------------------------ 돔(팔각 첨두 돔) + '최후의 심판' 색면 프레스코
      var DOME_A = RI, DOME_R = (DOME_A * DOME_A + DOME_RISE * DOME_RISE) / (2 * DOME_A), DOME_CX = DOME_R - DOME_A, X_TOP = 0.9;
      var PHI_TOP = Math.acos((X_TOP + DOME_CX) / DOME_R), DOME_ARC = DOME_R * PHI_TOP;
      function domeK(v) { return (-DOME_CX + DOME_R * Math.cos(PHI_TOP * v)) / DOME_A; }
      function paintDome(g, w, h) {
        var r = ctx.rng(99), pxV = h / DOME_ARC;
        function yv(v) { return (1 - v) * h; }
        function pxH(v) { return w / (8 * 2 * LH * Math.max(0.08, domeK(v))); }
        // 여섯 단: 아래부터 지옥/죄 · 부활 · 성인과 덕 · 천사 · 장로와 하늘 · 란테르나 광채
        var bands = [[0, 0.17, '#2a0e0a', '#6e2418'], [0.17, 0.38, '#5c3a26', '#a9754a'], [0.38, 0.58, '#a77c52', '#d9b27c'], [0.58, 0.80, '#d8b878', '#efdca6'], [0.80, 0.94, '#6f93b8', '#c4d6e2'], [0.94, 1, '#f0d482', '#fff2c0']];
        bands.forEach(function (b) { var gr = g.createLinearGradient(0, yv(b[0]), 0, yv(b[1])); gr.addColorStop(0, b[2]); gr.addColorStop(1, b[3]); g.fillStyle = gr; g.fillRect(0, yv(b[1]) - 1, w, yv(b[0]) - yv(b[1]) + 2); });
        function cloud(u, v, mw, mh, col, a) { g.save(); g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.ellipse(u, yv(v), mw * pxH(v), mh * pxV, 0, 0, PI * 2); g.fill(); g.restore(); }
        for (var i = 0; i < 420; i++) { var v = r(); cloud(r() * w, v, 1.8 + r() * 3.5, 0.4 + r() * 0.9, v > 0.58 ? '#fff4d6' : (v > 0.38 ? '#e8c9a0' : (v > 0.17 ? '#c99a6a' : '#7a2c18')), 0.14 + r() * 0.18); }
        function fig(u, v, hm, robe, skin, arms, a) {
          var hp = hm * pxV, wp = 0.45 * hm * pxH(v) * 0.8, y = yv(v);
          g.save(); g.globalAlpha = a || 0.9;
          g.fillStyle = robe; g.beginPath(); g.ellipse(u, y, wp, hp * 0.4, 0, 0, PI * 2); g.fill();
          g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(u + wp * 0.25, y + hp * 0.08, wp * 0.6, hp * 0.3, 0, 0, PI * 2); g.fill();
          g.fillStyle = skin; g.beginPath(); g.ellipse(u, y - hp * 0.48, wp * 0.46, hp * 0.15, 0, 0, PI * 2); g.fill();
          if (arms) { g.strokeStyle = skin; g.lineWidth = Math.max(2, wp * 0.2); g.beginPath(); g.moveTo(u - wp * 0.8, y - hp * 0.1); g.lineTo(u - wp * 1.4, y - hp * 0.5); g.moveTo(u + wp * 0.8, y - hp * 0.1); g.lineTo(u + wp * 1.4, y - hp * 0.5); g.stroke(); }
          g.restore();
        }
        var skinsA = ['#e0ae88', '#cf9a74', '#e9bf9a', '#b98258'];
        function crowd(v0, v1, n, hm, robes, skins, a) { for (var i = 0; i < n; i++) { var v = v0 + (v1 - v0) * r(); fig(r() * w, v, hm * (0.75 + r() * 0.5), robes[Math.floor(r() * robes.length)], skins[Math.floor(r() * skins.length)], r() < 0.5, a); } }
        crowd(0.01, 0.17, 420, 1.3, ['#1a0a08', '#2c100c', '#3e1810', '#5a2216'], ['#6a4030', '#7a4a34'], 0.85);
        for (i = 0; i < 160; i++) cloud(r() * w, 0.02 + r() * 0.15, 0.6 + r() * 1.1, 0.4 + r() * 0.8, ['#e8742a', '#f2a53a', '#c4421c'][i % 3], 0.42);
        crowd(0.17, 0.38, 560, 1.45, ['#7a5236', '#946440', '#b0865c', '#6a4a38', '#c09a70', '#a8432e'], skinsA, 0.88);
        crowd(0.38, 0.58, 560, 1.4, ['#c89a6c', '#d8b488', '#e6cfa8', '#a06c48', '#7e98b0', '#b8402e'], skinsA, 0.9);
        crowd(0.58, 0.80, 560, 1.2, ['#f2e2b8', '#fbefce', '#e6c88a', '#d4a868', '#9db6d0'], ['#f0d0b0', '#e8c8a0'], 0.92);
        crowd(0.80, 0.93, 260, 0.95, ['#fff3d0', '#a9c0d6', '#f5d680', '#e0b860'], ['#f0d0b0'], 0.9);
        for (i = 0; i < 24; i++) fig((i + 0.5) / 24 * w, 0.875, 1.5, ['#c9a44a', '#2f4f9a', '#b8402e', '#f2e9d2'][i % 4], '#e8c8a0', true, 0.95);
        // 동쪽 면(제대 쪽): 영광의 그리스도 + 성모/세례자 요한
        var ux = (4 + 0.5) / 8 * w, vc = 0.62;
        var gr = g.createRadialGradient(ux, yv(vc), 4, ux, yv(vc), 4.6 * pxV);
        gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(0.35, 'rgba(255,228,140,0.9)'); gr.addColorStop(1, 'rgba(255,210,110,0)');
        g.fillStyle = gr; g.fillRect(ux - 6.5 * pxH(vc), yv(vc) - 4.6 * pxV, 13 * pxH(vc), 9.2 * pxV);
        fig(ux, vc, 3.2, '#b83a32', '#f0c8a0', true); fig(ux - 3.3 * pxH(vc), vc - 0.01, 2.2, '#3b5fc0', '#f0c8a0', true); fig(ux + 3.3 * pxH(vc), vc - 0.01, 2.2, '#8a5a3a', '#e8b890', true);
        // 화면을 붓칠처럼 부드럽게: 흐림을 한 겹 겹친다
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var cg = cv.getContext('2d'); cg.drawImage(g.canvas, 0, 0);
        g.save(); g.filter = 'blur(4px)'; g.globalAlpha = 0.8; g.drawImage(cv, 0, 0); g.restore();
        // 여덟 면 경계의 가는 금빛 선과 단 구분선
        g.strokeStyle = 'rgba(255,235,170,0.3)'; g.lineWidth = 2; for (i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * w / 8, 0); g.lineTo(i * w / 8, h); g.stroke(); }
        g.strokeStyle = 'rgba(40,20,10,0.3)'; g.lineWidth = 3; [0.17, 0.38, 0.58, 0.80, 0.94].forEach(function (v) { g.beginPath(); g.moveTo(0, yv(v)); g.lineTo(w, yv(v)); g.stroke(); });
        var g2 = g.createLinearGradient(0, 0, 0, h * 0.1); g2.addColorStop(0, 'rgba(255,255,230,1)'); g2.addColorStop(1, 'rgba(255,255,230,0)'); g.fillStyle = g2; g.fillRect(0, 0, w, h * 0.1);
      }
      var domeTex = ctx.tex.custom(2048, 1024, paintDome);
      domeTex.wrapS = T.RepeatWrapping; domeTex.wrapT = T.ClampToEdgeWrapping;
      var domeMat = ctx.mats.standard({ map: domeTex, emissiveMap: domeTex, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.92, metalness: 0, side: T.FrontSide });
      (function buildDome() {
        var J = low ? 10 : 18, NH = 4, ring = [], j, c, web, pos = [], uv = [], idx = [];
        for (j = 0; j <= J; j++) { var ph = PHI_TOP * j / J; ring.push({ k: (-DOME_CX + DOME_R * Math.cos(ph)) / DOME_A, h: DOME_R * Math.sin(ph), v: j / J }); }
        function cornerPos(m, kf, h) { var th = (m + 0.5) * PI / 4; return [CX + Math.sin(th) * RV * kf, Y_DR + h, CZ + Math.cos(th) * RV * kf]; }
        var center = [CX, Y_DR + 3, CZ];
        for (web = 0; web < 8; web++) {
          var base = pos.length / 3, cA = (web + 7) % 8, cB = web;
          for (j = 0; j <= J; j++) for (c = 0; c <= NH; c++) {
            var t = c / NH, pa = cornerPos(cA, ring[j].k, ring[j].h), pb = cornerPos(cB, ring[j].k, ring[j].h);
            pos.push(pa[0] + (pb[0] - pa[0]) * t, pa[1], pa[2] + (pb[2] - pa[2]) * t); uv.push((web + t) / 8, ring[j].v);
          }
          for (j = 0; j < J; j++) for (c = 0; c < NH; c++) {
            var i0 = base + j * (NH + 1) + c, i1 = i0 + 1, i2 = i0 + (NH + 1) + 1, i3 = i0 + (NH + 1);
            var ax = pos[i0 * 3], ay = pos[i0 * 3 + 1], az = pos[i0 * 3 + 2];
            var e1 = [pos[i1 * 3] - ax, pos[i1 * 3 + 1] - ay, pos[i1 * 3 + 2] - az], e2 = [pos[i2 * 3] - ax, pos[i2 * 3 + 1] - ay, pos[i2 * 3 + 2] - az];
            var nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
            var dot = nx * (center[0] - ax) + ny * (center[1] - ay) + nz * (center[2] - az);
            if (dot >= 0) idx.push(i0, i1, i2, i0, i2, i3); else idx.push(i0, i2, i1, i0, i3, i2);
          }
        }
        var g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('uv', new T.BufferAttribute(new Float32Array(uv), 2)); g.setIndex(idx); g.computeVertexNormals();
        ctx.mesh(g, domeMat);
        // 모서리 리브(8) + 라테르나
        for (var m = 0; m < 8; m++) for (j = 0; j < J; j++) stB.addBeam(cornerPos(m, ring[j].k, ring[j].h - 0.05), cornerPos(m, ring[j + 1].k, ring[j + 1].h - 0.05), 0.34, 0.6, 0xdcd5c6, { vary: 0.02 });
        var topH = Y_DR + ring[J].h, rl = RV * ring[J].k;
        ctx.glow.add(new T.CylinderGeometry(1, 1, 1, 8, 1).translate(0, 0.5, 0), 0xfff3cf, { x: CX, y: topH - 0.1, z: CZ, sx: rl * 1.05, sy: 3.4, sz: rl * 1.05, flat: true, vary: 0 });
        ctx.cyl({ x: CX, y: topH + 3.3, z: CZ, r: rl * 1.6, rTop: 0.1, h: 2.4, seg: 8, color: 0xd9c89a });
        for (var q = 0; q < 8; q++) { var aq = (q + 0.5) * PI / 4; ctx.cyl({ x: CX + Math.sin(aq) * rl * 1.05, y: topH - 0.1, z: CZ + Math.cos(aq) * rl * 1.05, r: 0.07, h: 3.4, seg: 5, color: 0xcfc6b2 }); }
        ctx.addGlow({ x: CX, y: topH + 1.0, z: CZ, size: 9, color: 0xfff0c0, kind: 'always' });
      })();
      ctx.onHour(function (env) { var d = Math.max(0, Math.min(1, env.day * 1.05)); domeMat.emissiveIntensity = 0.12 + 0.5 * d; });

      // ============================================================ 트리부나 3개 (동·남·북)
      var chapelCount = 0;
      function tribune(k) {
        var F0 = RI, F1 = RI + 4.2, RHO = A_BIG, YS = Y_BIG, arc = pBig.arc(8), i, j, q = FACE[k];
        tunnel(k, F0, F1);
        function vcol(h) { return lerpC(V_LO, V_HI, h / R_BIG); }
        function dp(ii, jj) { var al = (-90 + 36 * ii) * PI / 180, kk = arc[jj].u / A_BIG, p = FP(k, RHO * kk * Math.sin(al), F1 + RHO * kk * Math.cos(al)); return [p[0], YS + arc[jj].h, p[1]]; }
        var hm = FP(k, 0, F1 + 1.0), hintIn = [hm[0], 2, hm[1]];
        for (i = 0; i < 5; i++) for (j = 0; j < 8; j++) quadC(dp(i, j), dp(i + 1, j), dp(i + 1, j + 1), dp(i, j + 1), vcol(arc[j].h), vcol(arc[j].h), vcol(arc[j + 1].h), vcol(arc[j + 1].h), hintIn);
        for (i = 0; i <= 5; i++) for (j = 0; j < 8; j++) { var a0 = dp(i, j), a1 = dp(i, j + 1); a0[1] -= 0.03; a1[1] -= 0.03; stB.addBeam(a0, a1, 0.2, 0.3, RIB, { vary: 0.02 }); }
        var top = dp(0, 8); sic({ x: top[0], y: top[1] - 0.2, z: top[2], r: 0.2, color: ST_L, detail: 0 });
        // 바닥
        var fp = [FP(k, -A_BIG, F0), FP(k, A_BIG, F0)], V = [];
        for (i = 0; i <= 5; i++) { var al = (-90 + 36 * i) * PI / 180; V.push(FP(k, RHO * Math.sin(al), F1 + RHO * Math.cos(al))); }
        fp.push(V[5], V[4], V[3], V[2], V[1], V[0]);
        var fc = FP(k, 0, F1); polyFloor(fp, 0, latticeTex(), 3.8, fc[0], fc[1], true);
        // 입구 터널 충돌 + 반다각 충돌
        [-1, 1].forEach(function (sg) { var a = FP(k, sg * A_BIG, F0), b = FP(k, sg * (A_BIG + 0.7), F1); colRect(a[0], a[1], b[0], b[1]); });
        // 5개 경당
        for (i = 0; i < 5; i++) (function (i) {
          var p0 = V[i], p1 = V[i + 1], mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2, L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
          var tx = (p1[0] - p0[0]) / L, tz = (p1[1] - p0[1]) / L, nx = fc[0] - mx, nz = fc[1] - mz, nl = Math.hypot(nx, nz); nx /= nl; nz /= nl;
          var F = FR(mx, mz, tx, tz, nx, nz);
          archedWall(F, { u0: -L / 2, u1: L / 2, a: 0.85, spring: 4.2, rise: 1.4, T: 0.2, top: YS, jambs: true, n: 6 });
          var ND = 2.4, AH = 5.6;
          function B(u, d) { return [F.ox + F.ux * u + F.nx * d, F.oz + F.uz * u + F.nz * d]; }
          var bl = B(-0.85, 0), br = B(0.85, 0), bb = B(0, -ND);
          panel(FR(bl[0], bl[1], -nx, -nz, tx, tz), [0, ND], 0, AH, cfWarm, 0);
          panel(FR(br[0], br[1], -nx, -nz, -tx, -tz), [0, ND], 0, AH, cfWarm, 0);
          var Fb = FR(bb[0], bb[1], tx, tz, nx, nz), ho = holeLancet(0, 1.5, 0.7, 2.45);
          panel(Fb, [-0.85, 0.85].concat(arcU(Pt(0.51, 0.62), 0)), 0, AH, cfWarm, 0, [ho]);
          reveal(Fb, ho, 0.6);
          var wp = B(0, -ND - 0.45);
          ctx.window({ x: wp[0], y: 1.65, z: wp[1], face: [nx, nz], w: 0.7, h: 2.3, top: 'pointed', pattern: 'lancet', colors: GLASS, seed: 200 + k * 10 + i, beam: false });
          var c1 = B(-0.85, 0), c2 = B(0.85, 0), c3 = B(0.85, -ND), c4 = B(-0.85, -ND);
          quad4([c1[0], AH, c1[1]], [c2[0], AH, c2[1]], [c3[0], AH, c3[1]], [c4[0], AH, c4[1]], cfPlaster, [mx, 1, mz]);
          quad4([c1[0], 0.02, c1[1]], [c4[0], 0.02, c4[1]], [c3[0], 0.02, c3[1]], [c2[0], 0.02, c2[1]], flat(0xe4ded0), [mx, 3, mz]);
          var ap = B(0, -ND + 0.5);
          mbx({ x: ap[0], y: 0, z: ap[1], w: 1.3, h: 0.95, d: 0.6, ry: Math.atan2(-tz, tx), color: MARB });
          mbx({ x: ap[0], y: 0.95, z: ap[1], w: 1.4, h: 0.07, d: 0.7, ry: Math.atan2(-tz, tx), color: 0xfff8ea });
          if (k === 4 && i === 2) { ctx.box({ x: ap[0], y: 1.02, z: ap[1], w: 0.8, h: 0.4, d: 0.4, ry: Math.atan2(-tz, tx), color: 0x8a5a2a }); gbx({ x: ap[0], y: 1.42, z: ap[1], w: 0.9, h: 0.1, d: 0.5, ry: Math.atan2(-tz, tx), color: GOLD }); }
          colSeg(p0[0], p0[1], p1[0], p1[1], 0.5);
          chapelCount++;
        })(i);
        // 북쪽(−x) 트리부나 바닥의 자오선(금동 띠)
        if (k === 6) { var mp = FP(k, 0, (F0 + F1 + 3) / 2); gbx({ x: mp[0], y: 0, z: mp[1], w: 7.4, h: 0.025, d: 0.08, color: GOLD, vary: 0 }); }
      }
      tribune(2); tribune(4); tribune(6);

      // ============================================================ 성가대 울타리(팔각) · 제대 구역
      var CR = 4.95, CH_Y = 0.3;
      (function () {
        var pts = []; for (var i = 0; i < 8; i++) { var a = (i + 0.5) * PI / 4; pts.push([CX + Math.sin(a) * CR / Math.cos(PI / 8), CZ + Math.cos(a) * CR / Math.cos(PI / 8)]); }
        polyFloor(pts, CH_Y, choirTex(), 2 * CR, CX, CZ, false);
        var segW = 2 * CR * Math.tan(PI / 8);
        for (var k = 0; k < 8; k++) {
          var q = FACE[k], ry = ryK(k);
          function seg(s0, s1) {
            var cs = (s0 + s1) / 2, wl = s1 - s0, c = FP(k, cs, CR - 0.17), o = FP(k, cs, CR + 0.01);
            mbx({ x: c[0], y: 0, z: c[1], w: wl, h: 1.4, d: 0.34, ry: ry, color: MARB });
            sbx({ x: c[0], y: 1.4, z: c[1], w: wl + 0.06, h: 0.1, d: 0.44, ry: ry, color: ST_L });
            sbx({ x: c[0], y: 0, z: c[1], w: wl + 0.04, h: 0.22, d: 0.42, ry: ry, color: ST_L });
            // 부조 띠(분홍빛 대리석 패널 + 녹색 테두리)
            var n = Math.max(1, Math.round(wl / 1.3));
            for (var p = 0; p < n; p++) { var sp = s0 + wl * (p + 0.5) / n, pc = FP(k, sp, CR + 0.03); mbx({ x: pc[0], y: 0.35, z: pc[1], w: wl / n - 0.2, h: 0.85, d: 0.06, ry: ry, color: 0xe3cdbf }); var pc2 = FP(k, sp, CR + 0.07); mbx({ x: pc2[0], y: 0.5, z: pc2[1], w: wl / n - 0.5, h: 0.55, d: 0.05, ry: ry, color: 0xf3e6dc }); ctx.ico({ x: pc2[0], y: 0.78, z: pc2[1], r: 0.1, color: 0x8a6e4f, detail: 0 }); }
          }
          if (k === 0) { seg(-segW / 2 - 0.2, -1.3); seg(1.3, segW / 2 + 0.2); } else seg(-segW / 2 - 0.2, segW / 2 + 0.2);
        }
        // 충돌: 동·북·남 등 7면 + 서쪽 입구 양옆
        for (k = 0; k < 8; k++) {
          var s0 = -segW / 2, s1 = segW / 2;
          if (k === 0) { var a1 = FP(k, s0, CR - 0.17), b1 = FP(k, -1.3, CR - 0.17), a2 = FP(k, 1.3, CR - 0.17), b2 = FP(k, s1, CR - 0.17); colSeg(a1[0], a1[1], b1[0], b1[1], 0.5); colSeg(a2[0], a2[1], b2[0], b2[1], 0.5); }
          else { var a = FP(k, s0, CR - 0.17), b = FP(k, s1, CR - 0.17); colSeg(a[0], a[1], b[0], b[1], 0.5); }
        }
        // 걷는 높이: 팔각을 십자형 + 중앙 사각으로 근사
        ctx.floorZone({ x0: -CR + 0.2, x1: CR - 0.2, z0: CZ - 2.0, z1: CZ + 2.0, y: CH_Y });
        ctx.floorZone({ x0: -2.0, x1: 2.0, z0: CZ - CR + 0.2, z1: CZ + CR - 0.2, y: CH_Y });
        ctx.floorZone({ x0: -3.4, x1: 3.4, z0: CZ - 3.4, z1: CZ + 3.4, y: CH_Y });
        // 서쪽 출입 계단
        ctx.steps({ x0: -1.3, x1: 1.3, z0: CZ + CR - 0.6, z1: CZ + CR + 0.6, y0: 0, y1: CH_Y, n: 2, dir: [0, -1], color: 0xe9e3d6 });
        // 제대 구역(몇 단 높음)
        ctx.boxAABB({ x0: -3.2, x1: 3.2, z0: -17.7, z1: -14.4, y0: CH_Y, y1: 0.75, color: 0xf1ece0 });
        ctx.boxAABB({ x0: -3.25, x1: 3.25, z0: -17.75, z1: -14.35, y0: 0.7, y1: 0.75, color: 0xcdbca9 });
        ctx.floorZone({ x0: -3.2, x1: 3.2, z0: -17.7, z1: -14.4, y: 0.75 });
        ctx.steps({ x0: -3.2, x1: 3.2, z0: -14.4, z1: -13.6, y0: CH_Y, y1: 0.75, n: 2, dir: [0, -1], color: 0xe9e3d6 });
        ctx.altar({ x: 0, z: -15.7, y: 0.75, w: 2.6, d: 1.0, h: 1.0, style: 'block', color: MARB, flowers: false, candles: 2 });
        ctx.pulpit({ x: 3.0, z: -14.9, y: 0.75, style: 'ambo', color: WOOD });
        // 주교좌 등받이 벽(어두운 나무) + 주교좌 + 채색 십자고상
        wbx({ x: 0, y: 0.75, z: -17.45, w: 5.6, h: 3.1, d: 0.5, color: WOOD });
        for (var s = -2; s <= 2; s++) { wbx({ x: s * 1.1, y: 1.6, z: -17.15, w: 0.9, h: 1.6, d: 0.08, color: WOOD_L }); wbx({ x: s * 1.1, y: 3.2, z: -17.15, w: 0.5, h: 0.5, d: 0.1, color: 0x4d3322, rz: 0.785 }); }
        ctx.box({ x: 0, y: 3.85, z: -17.4, w: 5.8, h: 0.16, d: 0.7, color: 0x2f1f14 });
        wbx({ x: 0, y: 0.75, z: -16.95, w: 1.0, h: 0.55, d: 0.6, color: WOOD_L }); wbx({ x: 0, y: 1.3, z: -17.15, w: 1.0, h: 1.0, d: 0.12, color: WOOD_L });
        ctx.crucifix({ x: 0, y: 4.0, z: -17.2, h: 3.6, ry: 0 });
        colRect(-2.9, -17.95, 2.9, -16.7);
        ctx.addLight({ x: 0, y: 7, z: -14.5, color: 0xffd9a0, intensity: 1.0, distance: 24, kind: 'lamp' });
      })();

      // ============================================================ 대각 벽: 사도상 감실 8개 · 성구실 문 + 오르간 발코니
      [1, 3, 5, 7].forEach(function (k) {
        var q = FACE[k], F = faceFrame(k, RI);
        [-2.2, 2.2].forEach(function (cu) {
          var P = Pt(0.55, 0.8), y0 = 1.3, h = 2.1;
          panel(F, [cu - 0.55, cu + 0.55].concat(arcU(P, cu)), y0, function (u) { return y0 + h + P.f(u - cu); }, flat(0x4a443b), 0.03);
          archBand(F, cu, y0 + h, P, 0.14, 6, cfStone, 0.05);
          sbx({ x: FP(k, cu, RI - 0.2)[0], y: y0 - 0.5, z: FP(k, cu, RI - 0.2)[1], w: 1.3, h: 0.5, d: 0.4, ry: ryK(k), color: ST_L });
          var sp = FP(k, cu, RI - 0.28);
          ctx.statue({ x: sp[0], y: y0 + 0.04, z: sp[1], ry: q.th, h: 2.0, kind: 'saint', robe: 0xf0ebe0, mantle: 0xd8d0c0, halo: false });
        });
        if (k === 3 || k === 5) { // 성구실 문 + 신고딕 아치 + 오르간 발코니
          var dp = FP(k, 0, RI - 0.1);
          wbx({ x: dp[0], y: 0, z: dp[1], w: 1.7, h: 3.3, d: 0.2, ry: ryK(k), color: WOOD });
          [-1, 1].forEach(function (sg) { var p = FP(k, sg * 1.0, RI - 0.14); sbx({ x: p[0], y: 0, z: p[1], w: 0.3, h: 3.7, d: 0.3, ry: ryK(k), color: ST_L }); });
          var tp = FP(k, 0, RI - 0.14); sbx({ x: tp[0], y: 3.3, z: tp[1], w: 2.3, h: 0.4, d: 0.3, ry: ryK(k), color: ST_L });
          var bp = FP(k, 0, RI - 0.6); sbx({ x: bp[0], y: 5.0, z: bp[1], w: 3.2, h: 0.5, d: 1.2, ry: ryK(k), color: ST_L });
          var bb = FP(k, 0, RI - 0.12); wbx({ x: bb[0], y: 5.5, z: bb[1], w: 3.4, h: 3.2, d: 0.18, ry: ryK(k), color: 0x6a4a30 });
          for (var c = -4; c <= 4; c++) { var pp = FP(k, c * 0.36, RI - 0.26), ph = 1.8 + 1.3 * (1 - Math.abs(c) / 4); gcy({ x: pp[0], y: 5.5, z: pp[1], r: 0.15, h: ph, seg: 8, color: GOLD }); }
          for (c = -2; c <= 2; c++) { var rp = FP(k, c * 0.7, RI - 1.1); sbx({ x: rp[0], y: 5.5, z: rp[1], w: 0.06, h: 0.6, d: 0.06, ry: ryK(k), color: ST }); }
        }
      });

      // ============================================================ 왼쪽 측랑 벽 그림(기마상 2점 + 단테)
      function paintFrame(z, w, h, y, drawFn) {
        var x = -XW + 0.03, t = ctx.tex.custom(256, Math.round(256 * h / w), drawFn);
        ctx.plane({ x: x, y: y + h / 2, z: z, ry: PI / 2, w: w, h: h, mat: ctx.mats.lambert({ tex: t }) });
        sbx({ x: -XW + 0.06, y: y - 0.12, z: z, w: 0.14, h: 0.14, d: w + 0.4, color: ST_L }); sbx({ x: -XW + 0.06, y: y + h, z: z, w: 0.14, h: 0.16, d: w + 0.4, color: ST_L });
        sbx({ x: -XW + 0.06, y: y - 0.1, z: z - w / 2 - 0.1, w: 0.14, h: h + 0.3, d: 0.2, color: ST_L }); sbx({ x: -XW + 0.06, y: y - 0.1, z: z + w / 2 + 0.1, w: 0.14, h: h + 0.3, d: 0.2, color: ST_L });
      }
      function horse(g, w, h, body, rider, bg) {
        g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, h * 0.82, w, h * 0.18);
        g.fillStyle = body; g.beginPath(); g.ellipse(w * 0.5, h * 0.55, w * 0.28, h * 0.13, 0, 0, PI * 2); g.fill();
        g.fillRect(w * 0.26, h * 0.55, 12, h * 0.25); g.fillRect(w * 0.7, h * 0.55, 12, h * 0.25); g.fillRect(w * 0.4, h * 0.6, 10, h * 0.22); g.fillRect(w * 0.58, h * 0.6, 10, h * 0.22);
        g.beginPath(); g.ellipse(w * 0.76, h * 0.42, 22, 36, -0.5, 0, PI * 2); g.fill();
        g.fillStyle = rider; g.fillRect(w * 0.45, h * 0.3, 26, h * 0.22); disc(g, w * 0.48, h * 0.26, 14, rider);
        g.strokeStyle = rider; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.52, h * 0.34); g.lineTo(w * 0.62, h * 0.2); g.stroke();
        g.strokeStyle = 'rgba(70,60,40,0.6)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
      }
      paintFrame(11.4, 3.0, 4.2, 1.6, function (g, w, h) { horse(g, w, h, '#4d6b4a', '#43603f', '#a9b39a'); });
      paintFrame(2.5, 3.0, 4.2, 1.6, function (g, w, h) { horse(g, w, h, '#a8998a', '#8e7e70', '#d8cfc0'); });
      paintFrame(18.2, 2.2, 3.4, 1.6, function (g, w, h) {
        g.fillStyle = '#c9b88e'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a9a6a'; g.fillRect(0, h * 0.6, w, h * 0.4);
        g.fillStyle = '#b84a3a'; g.beginPath(); g.moveTo(w * 0.3, h * 0.85); g.lineTo(w * 0.7, h * 0.85); g.lineTo(w * 0.62, h * 0.42); g.lineTo(w * 0.38, h * 0.42); g.fill();
        disc(g, w / 2, h * 0.33, 20, '#e8c8a0'); g.fillStyle = '#b84a3a'; g.fillRect(w * 0.4, h * 0.22, w * 0.2, 12);
        g.fillStyle = '#8a6e5a'; for (var i = 0; i < 7; i++) g.fillRect(w * 0.05 + i * 24, h * 0.58 - (i % 3) * 14, 18, 30);
        g.strokeStyle = 'rgba(70,60,40,0.6)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
      });

      // ============================================================ 좌석 · 촛불대 · 등
      ctx.renderSeats(layout, 'bench', { surf: HAS_SURF ? 'fl_wood' : undefined, wood: 0x4a3223, seat: 0x5a3d2a, back: 0x3e2a1c });
      ctx.candleStand(0, { wood: 0x4a3223 });
      ctx.candleStand(1, { wood: 0x4a3223 });
      [29.2, 20.3, 11.4, 2.5].forEach(function (z) { ctx.lantern({ x: 0, y: 8.6, z: z, chain: 10.4 }); });
      ctx.lantern({ x: 0, y: 9.0, z: CZ + 6.5, chain: 15.2 });

      // ============================================================ 카메라 · 바닥 · 시간대
      ctx.setCameraBounds({ x0: -19.8, x1: 19.8, z0: -34, z1: 38, yMax: 12.5 });
      ctx.ground({ color: 0x8f8a80, y: -0.05 });
      // 돔 아래에서는 카메라를 위로 기울여 돔이 보이게 한다(코어 카메라는 아바타만 바라보므로 이 성당만 보정)
      var tiltNow = 0, manualUp = 0, lastDrag = -99, isThumb = false, thumbTilt = (ChurchBuilders.florence.thumb || {}).tilt || 0.5;
      try { isThumb = !!new URLSearchParams(window.location.search).get('thumb'); } catch (e) { isThumb = false; }
      try {
        var lastY = null;
        window.addEventListener('pointerdown', function (e) { lastY = e.clientY; });
        window.addEventListener('pointerup', function () { lastY = null; });
        window.addEventListener('pointermove', function (e) {
          if (lastY === null) return; var dy = e.clientY - lastY; lastY = e.clientY;
          var A = window.__church; if (!A || !A.ctl || A.church !== 'florence') return;
          if (dy < 0 && A.ctl.pitch <= 0.14) { manualUp = Math.min(1.1, manualUp - dy * 0.006); lastDrag = A.t; }
          else if (dy > 0 && manualUp > 0) { manualUp = Math.max(0, manualUp - dy * 0.006); lastDrag = A.t; }
        });
      } catch (e) { /* ignore */ }
      ctx.onUpdate(function (dt, t) {
        var A = window.__church; if (!A || !A.camera || !A.me) return;
        if (manualUp > 0 && t - lastDrag > 5) manualUp = Math.max(0, manualUp - dt * 0.5);
        var dx = A.me.x - CX, dz = A.me.z - CZ, dist = Math.sqrt(dx * dx + dz * dz);
        var w = dist < 10 ? 1 : (dist < 22 ? 1 - (dist - 10) / 12 * 0.65 : 0.35);
        var target = window.__florenceTilt !== undefined ? window.__florenceTilt : (isThumb ? thumbTilt : 0.36 * w + manualUp);
        tiltNow += (target - tiltNow) * Math.min(1, dt * 3);
        A.camera.rotateX(tiltNow);
      });
    }
  };
})();
