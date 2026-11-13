/* ch_stpaul.js — 성 밖의 성 바오로 대성전 (로마). docs/church/interiors/stpaul.md §6·§11 의 53% 축소 치수.
   5랑 · 회색 화강암 기둥 4열×20 · 아치 아케이드 · 교황 메달리온 띠 · 금 모자이크 개선문 · 고딕 치보리움 · T자 익랑. */
(function () {
  'use strict';

  // ===== 상수 (앱 m = 실제 m × 0.53) =====
  var NW = 6.6, OW = 11.9, WX = 17.2, WT = 0.6, TX = 18.8;
  var ZF = -15.55, ZE = 33.5, ZB = -28.55;           // 개선문 벽 중심 / 입구 벽 안쪽 면 / 익랑 뒷벽 안쪽 면
  var NB = 21, SP = (ZE - ZF) / NB;                 // 21 베이, 기둥 20개 × 4열
  var CH = 5.83, NH = 15.9, AH = 8.0;               // 기둥 높이(주두 포함), 신랑 천장, 측랑 천장
  var SY = 0.5;                                      // 익랑·성소 바닥 높이
  var ZT = ZF - 0.3;                                 // 익랑 앞 가장자리(개선문 벽 뒷면)

  var layout = {
    id: 'stpaul', scalePercent: 53,
    bounds: { x0: -TX, x1: TX, z0: -35.4, z1: 34.2 },
    spawn: { x: 0, z: 27.0, r: 0 },
    seatGroups: [
      { g: 'L', rows: 16, perRow: 4, origin: { x: -1.7, z: -9.0 }, dx: -1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.6, 0.6] },
      { g: 'R', rows: 16, perRow: 4, origin: { x: 1.7, z: -9.0 }, dx: 1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.6, 0.6] }
    ],
    candles: { stands: [{ x: 15.1, z: -9.0, slots: 96, reach: 1.8, cols: 16, face: [-1, 0], pitch: 0.5, step: 0.25, ystep: 0.3, y0: 0.8 }] },
    info: { name: '성 밖의 성 바오로 대성전', place: '이탈리아 로마', builtYear: 324, rebuiltYear: 1854 }
  };
  ChurchLayouts.register(layout);

  ChurchBuilders['stpaul'] = {
    layout: layout,
    thumb: { x: 0, z: 27, yaw: 0, pitch: 12, zoom: 0.8, hour: 14 },
    build: function (ctx) {
      var T = ctx.THREE, PI = Math.PI, G = ChurchGeo, Geo = G.Geo, solid = ctx.solid;
      var C = {
        wallNave: 0xf3e8cd, wallLow: 0xf0ebdf, ring: 0xe7e1d4, reveal: 0xcfc4ab, aisle: 0xeadfc3, aisleLow: 0xe6dfcf,
        gold: 0xc9a236, goldD: 0xa07c22, white: 0xe0dacc, marble: 0xd8d1c2, porph: 0x6e2c3e, bronze: 0x5a4630
      };
      var rng = ctx.rng;
      var GL = ctx.gloss || solid, MT = ctx.metalB || solid;   // 광택 대리석 / 금속 금 배치(키트 v3), 없으면 일반 배치

      // ---------- 공용 도우미 ----------
      var openCache = {};
      function openCyl(seg, rt) {
        var k = seg + '_' + rt;
        return openCache[k] || (openCache[k] = new T.CylinderGeometry(rt, 1, 1, seg, 1, true).translate(0, 0.5, 0));
      }
      function oc(o) { (o.B || solid).add(openCyl(o.seg || 12, o.rt === undefined ? 1 : o.rt), o.color, { x: o.x, y: o.y, z: o.z, sx: o.r, sy: o.h, sz: o.r, flat: o.flat !== false, vary: o.vary === undefined ? 0.02 : o.vary }); }
      function quad(a, b, c, d, color, hint, vary, B) { (B || solid).addQuad(a, b, c, d, color, hint, { vary: vary === undefined ? 0.02 : vary }); }
      function tri(a, b, c, color, hint, vary, B) { (B || solid).addTris([a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]], color, hint, { vary: vary === undefined ? 0.02 : vary }); }
      function glowMat(m, k, col) { m.emissive = new T.Color(col === undefined ? 0xffffff : col); if (m.map) m.emissiveMap = m.map; m.emissiveIntensity = k; return m; }
      function meshOf(pos, uv, nor, idx, mat) {
        var g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
        g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
        g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
        g.setIndex(idx);
        var m = new T.Mesh(g, mat); m.frustumCulled = false; ctx.add(m); ctx.stats.meshes++; return m;
      }

      // ---------- 벽 생성기(진짜 개구부, 문설주·아치 안쪽 면·아치 테두리) ----------
      // W: {axis:'z'(x=c 평면, u=z) | 'x'(z=c 평면, u=x), c, t, cp(+면 색), cn(-면 색), sides:[+1,-1]}
      function WP(W, u, v, d) { return W.axis === 'z' ? [W.c + d, v, u] : [u, v, W.c + d]; }
      function wface(W, s, p0, p1, p2, p3, color, off) {
        var d = s * (W.t / 2 + (off || 0));
        quad(WP(W, p0[0], p0[1], d), WP(W, p1[0], p1[1], d), WP(W, p2[0], p2[1], d), WP(W, p3[0], p3[1], d), color, WP(W, (p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2, s * 8), undefined, off ? GL : W.B);
      }
      function sidesOf(W) { return W.sides || [1, -1]; }
      function wrect(W, u0, u1, v0, v1) {
        if (u1 - u0 < 1e-4 || v1 - v0 < 1e-4) return;
        sidesOf(W).forEach(function (s) { wface(W, s, [u0, v0], [u1, v0], [u1, v1], [u0, v1], s > 0 ? W.cp : W.cn); });
      }
      function archPts(h) {
        var N = h.n || 8, pts = [];
        for (var i = 0; i <= N; i++) { var th = PI * (1 - i / N); pts.push([h.c + h.hw * Math.cos(th), h.ys + h.rise * Math.sin(th), th]); }
        return pts;
      }
      function hole(W, a0, a1, yLow, yHigh, h) {
        var c = h.c, hw = h.hw, yb = h.yb, ys = h.ys, rise = h.rise || 0, yc = ys + rise, rc = h.reveal || C.reveal;
        wrect(W, a0, a1, yLow, yb);
        wrect(W, a0, c - hw, yb, yHigh);
        wrect(W, c + hw, a1, yb, yHigh);
        wrect(W, c - hw, c + hw, yc, yHigh);
        var pts = rise > 0 ? archPts(h) : null, i, s;
        if (pts) {
          for (i = 0; i < pts.length - 1; i++) {
            var A = pts[i], B = pts[i + 1];
            if (yc - A[1] < 1e-4 && yc - B[1] < 1e-4) continue;
            sidesOf(W).forEach(function (ss) { wface(W, ss, [A[0], A[1]], [B[0], B[1]], [B[0], yc], [A[0], yc], ss > 0 ? W.cp : W.cn); });
            // 아치 안쪽 면(소핏)
            quad(WP(W, A[0], A[1], -W.t / 2), WP(W, B[0], B[1], -W.t / 2), WP(W, B[0], B[1], W.t / 2), WP(W, A[0], A[1], W.t / 2), rc, WP(W, c, ys - 1, 0), 0.01, W.B);
          }
          // 아치 테두리(아키볼트): 면에서 살짝 튀어나온 띠
          if (h.ring !== null) {
            var rw = h.ringW || 0.2, rcl = h.ring === undefined ? C.ring : h.ring;
            for (i = 0; i < pts.length - 1; i++) {
              var t0 = pts[i][2], t1 = pts[i + 1][2];
              var i0 = [c + hw * Math.cos(t0), ys + rise * Math.sin(t0)], i1 = [c + hw * Math.cos(t1), ys + rise * Math.sin(t1)];
              var o0 = [c + (hw + rw) * Math.cos(t0), ys + (rise + rw) * Math.sin(t0)], o1 = [c + (hw + rw) * Math.cos(t1), ys + (rise + rw) * Math.sin(t1)];
              sidesOf(W).forEach(function (ss) { wface(W, ss, i0, i1, o1, o0, rcl, 0.035); });
            }
            // 문설주 테두리
            if (ys - yb > 0.05) sidesOf(W).forEach(function (ss) {
              wface(W, ss, [c - hw - rw, yb], [c - hw, yb], [c - hw, ys], [c - hw - rw, ys], rcl, 0.035);
              wface(W, ss, [c + hw, yb], [c + hw + rw, yb], [c + hw + rw, ys], [c + hw, ys], rcl, 0.035);
            });
          }
        }
        // 문설주 / 창대
        if (ys - yb > 0.05) {
          quad(WP(W, c - hw, yb, -W.t / 2), WP(W, c - hw, yb, W.t / 2), WP(W, c - hw, ys, W.t / 2), WP(W, c - hw, ys, -W.t / 2), rc, WP(W, c, (yb + ys) / 2, 0), 0.01, W.B);
          quad(WP(W, c + hw, yb, W.t / 2), WP(W, c + hw, yb, -W.t / 2), WP(W, c + hw, ys, -W.t / 2), WP(W, c + hw, ys, W.t / 2), rc, WP(W, c, (yb + ys) / 2, 0), 0.01, W.B);
        }
        if (yb > yLow + 0.01) quad(WP(W, c - hw, yb, -W.t / 2), WP(W, c + hw, yb, -W.t / 2), WP(W, c + hw, yb, W.t / 2), WP(W, c - hw, yb, W.t / 2), ctx.shade(rc, 1.05), WP(W, c, yb + 1, 0), 0.01, W.B);
      }
      function wrun(W, u0, u1, yLow, yHigh, holes) {
        holes = holes.slice().sort(function (a, b) { return a.c - b.c; });
        if (!holes.length) { wrect(W, u0, u1, yLow, yHigh); return; }
        var b = [u0], i;
        for (i = 0; i < holes.length - 1; i++) b.push((holes[i].c + holes[i].hw + holes[i + 1].c - holes[i + 1].hw) / 2);
        b.push(u1);
        for (i = 0; i < holes.length; i++) hole(W, b[i], b[i + 1], yLow, yHigh, holes[i]);
      }
      // 창 한 개(개구부 한가운데에 알라바스터 판)
      var ALAB = [0xf3c47c, 0xefb869, 0xf7d192, 0xeaa955, 0xf5c986];
      function win(W, u, h, nsign, o) {
        o = o || {};
        var p = WP(W, u, 0, 0);
        ctx.window({ x: p[0], y: h.yb, z: p[2], face: W.axis === 'z' ? [nsign, 0] : [0, nsign], w: h.hw * 2, h: h.ys - h.yb, top: 'round', pattern: o.pattern || 'lancet', colors: o.colors || ALAB, seed: o.seed || 3, frame: false, beam: !!o.beam, beamReach: o.reach || 12, photo: h.photo || null });
      }

      // ---------- 질감 ----------
      var granite = ctx.tex.custom(128, 256, function (g, w, h) {
        var r = rng(5), i;
        g.fillStyle = '#8f8d89'; g.fillRect(0, 0, w, h);
        for (i = 0; i < 260; i++) { g.fillStyle = 'rgba(150,120,112,' + (0.15 + r() * 0.25) + ')'; g.fillRect(r() * w, r() * h, 2 + r() * 4, 1 + r() * 3); }
        for (i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(52,52,56,' + (0.14 + r() * 0.25) + ')' : 'rgba(255,255,255,' + (0.2 + r() * 0.35) + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 2.4, 1 + r() * 2.4); }
      });

      var naveTex = ctx.tex.custom(512, 512, function (g, S) {
        var r = rng(11), i, cx = S / 2;
        g.fillStyle = '#c9bfab'; g.fillRect(0, 0, S, S);
        // 바탕 격자
        for (var a = 0; a < 8; a++) for (var b = 0; b < 8; b++) { g.fillStyle = (a + b) % 2 ? '#d2c9b5' : '#c3b8a2'; g.fillRect(a * 64, b * 64, 64, 64); }
        // 가장자리 띠
        g.fillStyle = '#8f8b82'; g.fillRect(0, 0, S, 22); g.fillRect(0, S - 22, S, 22); g.fillRect(0, 0, 22, S); g.fillRect(S - 22, 0, 22, S);
        g.fillStyle = '#ebe5d6'; g.fillRect(22, 22, S - 44, 6); g.fillRect(22, S - 28, S - 44, 6); g.fillRect(22, 22, 6, S - 44); g.fillRect(S - 28, 22, 6, S - 44);
        g.fillStyle = '#cfae6c'; g.fillRect(28, 28, S - 56, 5); g.fillRect(28, S - 33, S - 56, 5); g.fillRect(28, 28, 5, S - 56); g.fillRect(S - 33, 28, 5, S - 56);
        // 큰 원 문양
        [[0.46 * S, '#8f8b82'], [0.41 * S, '#ebe5d6'], [0.37 * S, '#cfae6c'], [0.31 * S, '#e4dccb'], [0.2 * S, '#8f8b82'], [0.15 * S, '#ebe5d6']].forEach(function (c) { g.fillStyle = c[1]; g.beginPath(); g.arc(cx, cx, c[0] * 0.62, 0, 6.2832); g.fill(); });
        // 8각 별
        g.fillStyle = '#c98260'; g.beginPath();
        for (i = 0; i < 16; i++) { var an = i * PI / 8 - PI / 2, rr = (i % 2 ? 0.07 : 0.15) * S; g.lineTo(cx + Math.cos(an) * rr, cx + Math.sin(an) * rr); }
        g.closePath(); g.fill();
        // 모서리 사각 + 작은 다이아몬드
        [[60, 60], [S - 60, 60], [60, S - 60], [S - 60, S - 60]].forEach(function (p) { g.fillStyle = '#8f8b82'; g.fillRect(p[0] - 22, p[1] - 22, 44, 44); g.fillStyle = '#ebe5d6'; g.fillRect(p[0] - 16, p[1] - 16, 32, 32); g.fillStyle = '#cfae6c'; g.beginPath(); g.moveTo(p[0], p[1] - 13); g.lineTo(p[0] + 13, p[1]); g.lineTo(p[0], p[1] + 13); g.lineTo(p[0] - 13, p[1]); g.closePath(); g.fill(); });
        g.fillStyle = '#cfae6c'; [[cx, 62], [cx, S - 62], [62, cx], [S - 62, cx]].forEach(function (p) { g.beginPath(); g.moveTo(p[0], p[1] - 15); g.lineTo(p[0] + 15, p[1]); g.lineTo(p[0], p[1] + 15); g.lineTo(p[0] - 15, p[1]); g.closePath(); g.fill(); });
        for (i = 0; i < 260; i++) { g.fillStyle = 'rgba(255,255,255,' + r() * 0.12 + ')'; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); }
        for (i = 0; i < 30; i++) { g.strokeStyle = 'rgba(110,95,80,' + (0.05 + r() * 0.08) + ')'; g.beginPath(); var vx = r() * S, vy = r() * S; g.moveTo(vx, vy); for (var q = 0; q < 4; q++) { vx += (r() - 0.5) * 70; vy += (r() - 0.5) * 70; g.lineTo(vx, vy); } g.stroke(); }
      });
      var crossTex = ctx.tex.custom(512, 512, function (g, S) {
        var r = rng(17), cx = S / 2, i;
        g.fillStyle = '#c9bfab'; g.fillRect(0, 0, S, S);
        g.fillStyle = '#a99b8a'; g.fillRect(0, 0, S, 18); g.fillRect(0, S - 18, S, 18); g.fillRect(0, 0, 18, S); g.fillRect(S - 18, 0, 18, S);
        g.fillStyle = '#ebe5d6'; g.fillRect(18, 18, S - 36, 5); g.fillRect(18, S - 23, S - 36, 5); g.fillRect(18, 18, 5, S - 36); g.fillRect(S - 23, 18, 5, S - 36);
        g.save(); g.translate(cx, cx); g.rotate(PI / 4);
        g.fillStyle = '#cfae6c'; g.fillRect(-170, -170, 340, 340); g.fillStyle = '#c9bfab'; g.fillRect(-150, -150, 300, 300);
        g.fillStyle = '#b5614f'; g.fillRect(-100, -100, 200, 200); g.fillStyle = '#ebe5d6'; g.fillRect(-84, -84, 168, 168); g.fillStyle = '#7d8a6c'; g.fillRect(-52, -52, 104, 104);
        g.restore();
        g.fillStyle = '#cfae6c'; g.beginPath(); g.arc(cx, cx, 28, 0, 6.2832); g.fill();
        for (i = 0; i < 200; i++) { g.fillStyle = 'rgba(255,255,255,' + r() * 0.12 + ')'; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); }
      });
      var aisleTex = ctx.tex.checker({ c1: 0xd3ccbd, c2: 0xb9ae9a });
      var apseFloorTex = ctx.tex.pattern('diamond', { c1: 0xe9dfca, c2: 0xc2a67e, c3: 0x8f5d4a });
      var cofferNave = ctx.tex.coffer({ base: 0x7d4f2d, gold: 0xe3bb4c, border: 0xb88a2c, n: 3 });
      var cofferAisle = ctx.tex.coffer({ base: 0xa98354, gold: 0xe0b84a, border: 0xb98a2e, n: 3 });

      // ---------- 바닥 ----------
      var plane0 = ctx.stats.meshes;
      ctx.floor({ x0: -NW, x1: NW, z0: ZF + 0.3, z1: ZE, y: 0, tex: naveTex, tile: [13.2, 13.2] });
      [-1, 1].forEach(function (s) {
        ctx.floor({ x0: s < 0 ? -WX : NW, x1: s < 0 ? -NW : WX, z0: ZF + 0.3, z1: ZE, y: 0, tex: aisleTex, tile: 2.4, reflect: false });
        ctx.floor({ x0: s < 0 ? -TX : NW, x1: s < 0 ? -NW : TX, z0: ZB, z1: ZT, y: SY, tex: aisleTex, tile: 2.4, reflect: false });
      });
      ctx.floor({ x0: -NW, x1: NW, z0: ZB, z1: ZT, y: SY, tex: crossTex, tile: [13.2, 13.2], reflect: true });
      ctx.floor({ x0: -NW, x1: NW, z0: -35.2, z1: ZB, y: SY, tex: apseFloorTex, tile: 3, reflect: false });
      ctx.boxAABB({ x0: -TX, x1: TX, z0: ZB, z1: ZT, y0: -0.05, y1: SY - 0.01, color: 0xd2cab9 });
      ctx.boxAABB({ x0: -NW, x1: NW, z0: -35.2, z1: ZB, y0: -0.05, y1: SY - 0.01, color: 0xd2cab9 });
      ctx.floorZone({ x0: -TX, x1: TX, z0: ZB, z1: ZT, y: SY });
      ctx.floorZone({ x0: -NW, x1: NW, z0: -35.4, z1: ZB, y: SY });
      // 개선문 앞 계단(가운데 + 측랑 입구마다)
      ctx.steps({ x0: -5.35, x1: 5.35, z0: ZT, z1: ZF + 1.25, y0: 0, y1: SY, n: 2, dir: [0, -1], color: 0xd6cfbf });
      [-14.55, -9.25, 9.25, 14.55].forEach(function (c) { ctx.steps({ x0: c - 1.4, x1: c + 1.4, z0: ZT, z1: ZF + 0.9, y0: 0, y1: SY, n: 2, dir: [0, -1], color: 0xcfc6b4 }); });

      // ---------- 벽: 신랑 아케이드(청창부 포함) ----------
      var holesLow = [], holesHigh = [], holesOut = [], holesArc2 = [], i, k, zc;
      for (i = 0; i < NB; i++) {
        zc = ZF + SP * (i + 0.5);
        holesLow.push({ c: zc, hw: 0.72, yb: CH, ys: CH, rise: 0.78, n: 6, ring: C.ring });
        holesHigh.push({ c: zc, hw: 0.46, yb: 9.4, ys: 12.8, rise: 0.46, n: 6, ring: C.ring, ringW: 0.16 });
        holesArc2.push({ c: zc, hw: 0.72, yb: CH, ys: CH, rise: 0.78, n: 6, ring: C.ring });
        if (i % 2 === 0) holesOut.push({ c: zc, hw: 0.55, yb: 2.4, ys: 5.0, rise: 0.55, n: 6, ring: C.ring, ringW: 0.16 });
      }
      // G-29: 알라바스터 창 사진(가로/세로 ≈0.52)을 거는 창은 개구부를 사진 비율에 맞춘다(같은 중심 높이, 폭을 넓히고 키를 줄임).
      // 고창: 0.92×3.86 → 1.32×약2.55, 측랑 창: 1.1×3.15 → 1.5×약2.9. 사진을 못 읽어도 같은 개구부에 절차적 알라바스터가 남는다.
      function fitHole(h, ph, hw) {
        if (!ph) return;
        var yc = (h.yb + h.ys + h.rise) / 2, tot = 2 * hw / ph.aspect;
        h.hw = hw; h.rise = hw; h.yb = yc - tot / 2; h.ys = h.yb + tot - hw; h.photo = ph;
      }
      holesHigh.forEach(function (h, j) { fitHole(h, ctx.glassPhoto('clerestory', j), 0.66); });
      holesOut.forEach(function (h, j) { fitHole(h, ctx.glassPhoto('aisle', j), 0.75); });
      var YM = 8.45, YT = 15.35;
      [-1, 1].forEach(function (sx) {
        var navSide = -sx; // 신랑 쪽 면의 부호
        var Wn = { axis: 'z', c: sx * NW, t: WT, cp: navSide > 0 ? C.wallLow : C.aisleLow, cn: navSide > 0 ? C.aisleLow : C.wallLow, B: GL };
        wrun(Wn, ZF, ZE, CH, YM, holesLow);
        var Wu = { axis: 'z', c: sx * NW, t: WT, cp: C.wallNave, cn: C.wallNave, sides: [navSide] };
        wrun(Wu, ZF, ZE, YM, YT, holesHigh);
        for (i = 0; i < NB; i++) { zc = ZF + SP * (i + 0.5); win(Wu, zc, holesHigh[i], navSide, { seed: 20 + i, beam: sx > 0 && i % 10 === 3, reach: 13 }); }
        // 바깥 열 아케이드(양면 흰 대리석)
        var Wo = { axis: 'z', c: sx * OW, t: WT, cp: C.wallLow, cn: C.wallLow, B: GL };
        wrun(Wo, ZF, ZE, CH, AH, holesArc2);
        // 바깥 벽
        var Wb = { axis: 'z', c: sx * (WX + WT / 2), t: WT, cp: C.aisle, cn: C.aisle, sides: [-sx] };
        wrun(Wb, ZF, ZE, 0, AH, holesOut);
        for (i = 0; i < holesOut.length; i++) win(Wb, holesOut[i].c, holesOut[i], -sx, { seed: 60 + i, beam: sx > 0 && i === 3, reach: 11 });
        // 바깥 벽 아래쪽 대리석 판(징두리)과 몰딩
        ctx.boxAABB({ x0: sx > 0 ? WX - 0.07 : -WX, x1: sx > 0 ? WX : -WX + 0.07, z0: ZF + 0.3, z1: ZE, y0: 0, y1: 1.1, color: 0xa79882 });
        ctx.boxAABB({ x0: sx > 0 ? WX - 0.12 : -WX, x1: sx > 0 ? WX : -WX + 0.12, z0: ZF + 0.3, z1: ZE, y0: 1.1, y1: 1.22, color: 0xd3ccb8 });
        // 신랑 벽 몰딩·벽기둥·프레스코 판
        var fx = sx * NW + navSide * (WT / 2);
        ctx.boxAABB({ x0: Math.min(fx, fx + navSide * 0.28), x1: Math.max(fx, fx + navSide * 0.28), z0: ZF + 0.3, z1: ZE, y0: YM - 0.12, y1: YM + 0.08, color: 0xdfd9cb });
        ctx.boxAABB({ x0: Math.min(fx, fx + navSide * 0.45), x1: Math.max(fx, fx + navSide * 0.45), z0: ZF + 0.3, z1: ZE, y0: YT, y1: YT + 0.2, color: C.gold });
        ctx.boxAABB({ x0: Math.min(fx, fx + navSide * 0.7), x1: Math.max(fx, fx + navSide * 0.7), z0: ZF + 0.3, z1: ZE, y0: YT + 0.2, y1: NH, color: 0xd9d3c5 });
        ctx.boxAABB({ x0: Math.min(fx, fx + navSide * 0.1), x1: Math.max(fx, fx + navSide * 0.1), z0: ZF + 0.3, z1: ZE, y0: 7.12, y1: 8.28, color: 0xd2cba5, vary: 0.01 });
        for (i = 0; i <= NB; i++) {
          var zp = ZF + SP * i;
          if (i > 0 && i < NB) ctx.boxAABB({ x0: Math.min(fx, fx + navSide * 0.16), x1: Math.max(fx, fx + navSide * 0.16), z0: zp - 0.17, z1: zp + 0.17, y0: YM, y1: YT, color: 0xdcd6c8 });
        }
        var pal = [0xc98a5a, 0x7f9aa6, 0xd7ae68, 0xa96f52];
        for (i = 0; i < NB; i++) {
          zc = ZF + SP * (i + 0.5);
          ctx.boxAABB({ x0: Math.min(fx, fx + navSide * 0.08), x1: Math.max(fx, fx + navSide * 0.08), z0: zc - 0.74, z1: zc + 0.74, y0: 8.78, y1: 9.12, color: pal[(i + (sx > 0 ? 1 : 0)) % 4], vary: 0.05 });
        }
      });

      // ---------- 벽: 개선문 벽(신랑↔익랑) ----------
      var Wt = { axis: 'x', c: ZF, t: WT, cp: C.wallLow, cn: C.wallLow, B: GL };
      var aisleHoles = [];
      [-14.55, -9.25, 9.25, 14.55].forEach(function (c) { aisleHoles.push({ c: c, hw: 1.4, yb: 0, ys: 4.0, rise: 1.4, n: 8, ring: C.ring }); });
      var bigArch = { c: 0, hw: 5.35, yb: 0, ys: 8.3, rise: 5.0, n: 20, ring: null };
      wrun(Wt, -TX, TX, 0, NH, aisleHoles.concat([bigArch]));
      // 큰 아치 안쪽 면 금색
      // ---------- 벽: 익랑 뒷벽(후진 입구·경당 4곳·창) ----------
      var Wr = { axis: 'x', c: ZB - WT / 2, t: WT, cp: C.wallNave, cn: C.wallNave, sides: [1] };
      var apseHole = { c: 0, hw: NW, yb: SY, ys: 6.0, rise: 5.2, n: 24, ring: 0xf3e3a0, ringW: 0.3 };
      Wr.cp = 0xe9c768;
      wrun(Wr, -NW, NW, 0, YT, [apseHole]);
      var chap = [], chapWin = [];
      [-14, -9.5, 9.5, 14].forEach(function (c) { chap.push({ c: c, hw: 1.2, yb: SY, ys: 3.3, rise: 1.2, n: 8, ring: C.ring }); chapWin.push({ c: c, hw: 0.6, yb: 9.4, ys: 12.8, rise: 0.6, n: 6, ring: C.ring, ringW: 0.16 }); });
      Wr.cp = C.wallNave;
      [[-TX, -NW, chap.slice(0, 2), chapWin.slice(0, 2)], [NW, TX, chap.slice(2), chapWin.slice(2)]].forEach(function (g) {
        wrun(Wr, g[0], g[1], 0, 8.2, g[2]);
        wrun(Wr, g[0], g[1], 8.2, YT, g[3]);
        g[3].forEach(function (h, j) { win(Wr, h.c, h, 1, { seed: 90 + j, beam: false }); });
      });
      // 경당 안쪽 어두운 방(걷기 불가)
      chap.forEach(function (h) {
        ctx.boxAABB({ x0: h.c - h.hw - 0.05, x1: h.c + h.hw + 0.05, z0: ZB - 1.9, z1: ZB - WT + 0.02, y0: SY, y1: SY + 3.2, color: 0x8a7258 });
        ctx.boxAABB({ x0: h.c - 0.5, x1: h.c + 0.5, z0: ZB - 1.7, z1: ZB - 1.0, y0: SY, y1: SY + 1.0, color: 0xe8dfc9 });
        ctx.addGlow({ x: h.c, y: SY + 2.3, z: ZB - 1.2, size: 1.6, color: 0xffc977, kind: 'lamp' });
      });
      // 윗벽 윗부분 몰딩(익랑)
      ctx.boxAABB({ x0: -TX, x1: TX, z0: ZB, z1: ZB + 0.45, y0: YT, y1: YT + 0.2, color: C.gold });
      ctx.boxAABB({ x0: -TX, x1: TX, z0: ZB, z1: ZB + 0.7, y0: YT + 0.2, y1: NH, color: 0xd9d3c5 });

      // ---------- 벽: 익랑 끝벽 ----------
      [-1, 1].forEach(function (sx) {
        var Wc = { axis: 'z', c: sx * (TX + WT / 2), t: WT, cp: C.wallNave, cn: C.wallNave, sides: [-sx] };
        var wins = [{ c: -25.5, hw: 0.8, yb: 9.2, ys: 12.5, rise: 0.8, n: 8, ring: C.ring }, { c: -18.9, hw: 0.8, yb: 9.2, ys: 12.5, rise: 0.8, n: 8, ring: C.ring }];
        wrun(Wc, ZB, ZT, 0, YT, wins);
        wins.forEach(function (h, j) { win(Wc, h.c, h, -sx, { seed: 120 + j + (sx > 0 ? 5 : 0), beam: sx > 0, reach: 14 }); });
        ctx.boxAABB({ x0: sx > 0 ? TX - 0.45 : -TX, x1: sx > 0 ? TX : -TX + 0.45, z0: ZB, z1: ZT, y0: YT, y1: YT + 0.2, color: C.gold });
        ctx.boxAABB({ x0: sx > 0 ? TX - 0.7 : -TX, x1: sx > 0 ? TX : -TX + 0.7, z0: ZB, z1: ZT, y0: YT + 0.2, y1: NH, color: 0xd9d3c5 });
        ctx.boxAABB({ x0: sx > 0 ? TX - 0.07 : -TX, x1: sx > 0 ? TX : -TX + 0.07, z0: ZB, z1: ZT, y0: SY, y1: SY + 1.3, color: 0xa79882 });
      });
      // ---------- 벽: 입구 벽(청동문 3개 + 큰 창 3개) ----------
      var We = { axis: 'x', c: ZE + WT / 2, t: WT, cp: C.wallNave, cn: C.wallNave, sides: [-1] };
      var doors = [{ c: 0, hw: 1.25, yb: 0, ys: 3.2, rise: 1.25, n: 8, ring: C.ring }, { c: -9.25, hw: 0.95, yb: 0, ys: 2.6, rise: 0.95, n: 8, ring: C.ring }, { c: 9.25, hw: 0.95, yb: 0, ys: 2.6, rise: 0.95, n: 8, ring: C.ring }];
      var eWins = [{ c: 0, hw: 1.1, yb: 9.0, ys: 12.2, rise: 1.1, n: 8, ring: C.ring }, { c: -9.25, hw: 0.9, yb: 8.3, ys: 11.0, rise: 0.9, n: 8, ring: C.ring }, { c: 9.25, hw: 0.9, yb: 8.3, ys: 11.0, rise: 0.9, n: 8, ring: C.ring }];
      We.cn = C.wallLow;
      wrun(We, -WX - WT, WX + WT, 0, 7.0, doors);
      wrun(We, -WX - WT, WX + WT, 7.0, YT, eWins);
      eWins.forEach(function (h, j) { win(We, h.c, h, -1, { seed: 150 + j }); });
      doors.forEach(function (h) {
        var dz = ZE + WT / 2 + 0.05;
        // 청동문(양쪽 짝문 + 아치 상인방) : 판넬 격자
        [-1, 1].forEach(function (s) {
          var cx = h.c + s * h.hw / 2;
          ctx.box({ x: cx, y: 0, z: dz, w: h.hw - 0.04, h: h.ys, d: 0.1, color: C.bronze });
          for (var a = 0; a < 3; a++) for (var b = 0; b < 4; b++) ctx.box({ x: cx - (h.hw / 2 - 0.05) * 0 + (a - 1) * (h.hw / 3.6), y: 0.25 + b * (h.ys - 0.5) / 4, z: dz - 0.06, w: h.hw / 4, h: (h.ys - 0.7) / 4, d: 0.05, color: 0x7a6040 });
        });
        var N = 8, pts = archPts(h), prev = null;
        for (i = 0; i < pts.length - 1; i++) tri([h.c, h.ys, dz], [pts[i][0], pts[i][1], dz], [pts[i + 1][0], pts[i + 1][1], dz], 0x6a5236, [h.c, h.ys, dz - 5]);
      });

      // ---------- 후진(반돔 + 반원 벽), 질감 입힌 모자이크 ----------
      (function apse() {
        var cx = 0, cz = ZB, r = NW, y0 = SY, hW = 5.5, rise = 5.2, ySp = y0 + hW;
        var wallTex = ctx.tex.custom(1536, 416, function (g, w, h) {
          var rr = rng(31), i, j;
          // 금 모자이크 바탕
          for (j = 0; j < h; j += 5) for (i = 0; i < w; i += 5) { var c = 0.8 + rr() * 0.35; g.fillStyle = 'rgb(' + Math.round(222 * c) + ',' + Math.round(174 * c) + ',' + Math.round(62 * c) + ')'; g.fillRect(i, j, 4, 4); }
          // 아래 대리석 판 (v 0..0.36)
          var bandH = h * 0.36, np = 18, pw = w / np, cols = ['#7c3a3a', '#d8cfba', '#3f6049', '#d8cfba'];
          for (i = 0; i < np; i++) {
            g.fillStyle = cols[i % 4]; g.fillRect(i * pw + 4, h - bandH + 4, pw - 8, bandH - 8);
            g.strokeStyle = '#d9b13e'; g.lineWidth = 3; g.strokeRect(i * pw + 6, h - bandH + 6, pw - 12, bandH - 12);
            g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(i * pw + 12, h - bandH + 12, 6, bandH - 24);
          }
          g.fillStyle = '#d9b13e'; g.fillRect(0, h - bandH - 8, w, 8);
          // 사도 띠
          var nf = 13;
          for (i = 0; i < nf; i++) {
            var fx = (i + 0.5) * w / nf, robes = ['#9c3b2e', '#e9dfc7', '#1e3a6e', '#6e7f52', '#b0793e'];
            figure(g, fx, h - bandH - 22, h * 0.44, { robe: robes[i % 5], mantle: robes[(i + 2) % 5], skin: '#efcca3' });
          }
          g.fillStyle = '#3d7a4a'; g.fillRect(0, h - bandH - 22, w, 14);
          for (i = 0; i < 80; i++) { g.fillStyle = ['#f2d36a', '#e9efe0', '#d9603f'][i % 3]; g.beginPath(); g.arc(rr() * w, h - bandH - 15 + rr() * 8, 3, 0, 6.28); g.fill(); }
          g.fillStyle = '#1e3a6e'; g.fillRect(0, 0, w, 20); g.fillStyle = '#d9b13e'; g.fillRect(0, 20, w, 5);
        });
        var domeTex = ctx.tex.custom(1024, 512, function (g, w, h) {
          var rr = rng(32), i, j;
          for (j = 0; j < h; j += 5) for (i = 0; i < w; i += 5) { var c = 0.8 + rr() * 0.35; g.fillStyle = 'rgb(' + Math.round(222 * c) + ',' + Math.round(174 * c) + ',' + Math.round(62 * c) + ')'; g.fillRect(i, j, 4, 4); }
          // 구름띠(붉은·푸른)
          for (i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#c24a3a' : '#3a5ea8'; g.beginPath(); g.ellipse(w / 2, h * 0.5 + i * 0, w * (0.46 - i * 0.04), h * (0.42 - i * 0.035), 0, 0, PI, true); g.lineWidth = 7; g.strokeStyle = g.fillStyle; g.stroke(); }
          g.fillStyle = '#d9b13e'; g.fillRect(0, h * 0.74, w, 10);
          // 그리스도(가운데) + 양옆 성인
          figure(g, w / 2, h * 0.73, h * 0.58, { robe: '#b53a30', mantle: '#2e55a2', skin: '#f0cfa8', big: true });
          [[0.3, '#e9dfc7'], [0.7, '#6e7f52'], [0.16, '#9c3b2e'], [0.84, '#1e3a6e']].forEach(function (f) { figure(g, w * f[0], h * 0.84, h * 0.36, { robe: f[1], mantle: '#b0793e', skin: '#efcca3' }); });
          g.fillStyle = '#3d7a4a'; g.fillRect(0, h * 0.83, w, h * 0.17);
          g.fillStyle = '#d9b13e'; g.fillRect(0, h - 12, w, 12);
        });
        var N = 36, i2, pos = [], uv = [], nor = [], idx = [];
        for (i2 = 0; i2 <= N; i2++) {
          var ph = -PI / 2 + PI * i2 / N, sx = Math.sin(ph), cz2 = Math.cos(ph), x = cx + r * sx, z = cz - r * cz2;
          pos.push(x, y0, z, x, ySp, z); uv.push(i2 / N, 0, i2 / N, 1); nor.push(-sx, 0, cz2, -sx, 0, cz2);
          if (i2 < N) { var b = i2 * 2; idx.push(b, b + 2, b + 3, b, b + 3, b + 1); }
        }
        (function (mm) { glowMat(mm, 0.14); mm.metalness = 0.3; mm.roughness = 0.55; })(meshOf(pos, uv, nor, idx, ctx.mats.lambert({ tex: wallTex })).material);
        var R = 9, pos2 = [], uv2 = [], nor2 = [], idx2 = [];
        for (var j2 = 0; j2 <= R; j2++) {
          var el = PI / 2 * j2 / R, rr2 = r * Math.cos(el), yy = ySp + rise * Math.sin(el);
          for (i2 = 0; i2 <= N; i2++) {
            var ph2 = -PI / 2 + PI * i2 / N, px = cx + rr2 * Math.sin(ph2), pz = cz - rr2 * Math.cos(ph2);
            pos2.push(px, yy, pz); uv2.push(0.5 + (px - cx) / (2 * r), (yy - ySp) / rise);
            var gx = -(px - cx) / (r * r), gy = -(yy - ySp) / (rise * rise), gz = -(pz - cz) / (r * r), gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
            nor2.push(gx / gl, gy / gl, gz / gl);
            if (j2 < R && i2 < N) { var a = j2 * (N + 1) + i2, bq = a + 1, cq = a + N + 2, dq = a + N + 1; idx2.push(a, bq, cq, a, cq, dq); }
          }
        }
        (function (mm) { glowMat(mm, 0.16); mm.metalness = 0.3; mm.roughness = 0.5; })(meshOf(pos2, uv2, nor2, idx2, ctx.mats.lambert({ tex: domeTex })).material);
        // 후진 충돌: 반원 바깥 띠
        var cn = 14, cr = 1.2;
        for (i2 = 0; i2 <= cn; i2++) { var ak = -PI / 2 + PI * i2 / cn; ctx.addCollider({ x: cx + Math.sin(ak) * (r + cr - 0.05), z: cz - Math.cos(ak) * (r + cr - 0.05), r: cr }); }
        // 교황 좌(대리석 옥좌)와 둥근 의자 선반
        ctx.box({ x: 0, y: SY, z: -34.35, w: 1.6, h: 0.5, d: 1.1, color: 0xd3ccbb });
        ctx.box({ x: 0, y: SY + 0.5, z: -34.7, w: 1.3, h: 1.8, d: 0.35, color: 0xd8d1c1 });
        ctx.box({ x: 0, y: SY + 0.5, z: -34.2, w: 1.1, h: 0.1, d: 0.8, color: 0x9b3a3a });
        [-0.75, 0.75].forEach(function (s) { ctx.box({ x: s, y: SY + 0.5, z: -34.4, w: 0.18, h: 0.7, d: 0.9, color: 0xd3ccbb }); });
        ctx.addCollider({ x0: -0.95, x1: 0.95, z0: -35.3, z1: -33.7 });
        for (i2 = 0; i2 < 14; i2++) { var bp = -PI / 2 + 0.15 + (PI - 0.3) * i2 / 13; if (Math.abs(bp) < 0.22) continue; ctx.box({ x: Math.sin(bp) * (r - 0.35), y: SY, z: cz - Math.cos(bp) * (r - 0.35), w: 0.9, h: 0.5, d: 0.35, ry: bp, color: 0xcdc2a9 }); }
      })();

      function figure(g, cx, by, h, o) {
        var w = h * 0.34, robe = o.robe || '#8c3a3a', mant = o.mantle || '#d9b13e', skin = o.skin || '#efcca3', hr = h * (o.big ? 0.09 : 0.075);
        g.fillStyle = mant; g.beginPath(); g.moveTo(cx - w * 0.52, by); g.lineTo(cx - w * 0.36, by - h * 0.74); g.lineTo(cx + w * 0.36, by - h * 0.74); g.lineTo(cx + w * 0.52, by); g.closePath(); g.fill();
        g.fillStyle = robe; g.beginPath(); g.moveTo(cx - w * 0.3, by); g.lineTo(cx - w * 0.22, by - h * 0.74); g.lineTo(cx + w * 0.34, by - h * 0.74); g.lineTo(cx + w * 0.46, by); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(cx - w * 0.04, by - h * 0.72, w * 0.08, h * 0.72);
        g.fillStyle = skin; g.fillRect(cx - hr * 0.35, by - h * 0.78, hr * 0.7, hr * 0.5);
        g.fillStyle = '#f2d36a'; g.beginPath(); g.arc(cx, by - h * 0.84, hr * 1.55, 0, 6.2832); g.fill();
        g.strokeStyle = '#a97c1e'; g.lineWidth = Math.max(2, h * 0.012); g.stroke();
        g.fillStyle = skin; g.beginPath(); g.arc(cx, by - h * 0.84, hr, 0, 6.2832); g.fill();
        g.fillStyle = '#5a3d2a'; g.beginPath(); g.arc(cx, by - h * 0.86, hr * 1.02, PI * 1.05, PI * 1.95); g.fill();
        g.fillStyle = '#3a2a22'; g.fillRect(cx - hr * 0.45, by - h * 0.85, hr * 0.2, hr * 0.14); g.fillRect(cx + hr * 0.25, by - h * 0.85, hr * 0.2, hr * 0.14);
      }

      // ---------- 개선문 모자이크(진짜로 비어 있는 아치) ----------
      (function triumph() {
        var W = 1536, H = 816, X0 = -NW, Y0 = 8.3, XW = 2 * NW, YH = 7.0;
        function px(x) { return (x - X0) / XW * W; } function py(y) { return H - (y - Y0) / YH * H; } var ppm = W / XW;
        var tex = ctx.tex.custom(W, H, function (g) {
          var rr = rng(41), i, j;
          for (j = 0; j < H; j += 6) for (i = 0; i < W; i += 6) { var c = 0.78 + rr() * 0.4; g.fillStyle = 'rgb(' + Math.round(222 * c) + ',' + Math.round(172 * c) + ',' + Math.round(58 * c) + ')'; g.fillRect(i, j, 5, 5); }
          // 야자수
          function palm(x, base, ht) {
            var X = px(x), B = py(base), Ht = ht * ppm;
            g.fillStyle = '#6b4a2b'; g.beginPath(); g.moveTo(X - 5, B); g.lineTo(X - 3, B - Ht); g.lineTo(X + 3, B - Ht); g.lineTo(X + 5, B); g.closePath(); g.fill();
            for (var q = 0; q < 7; q++) { var an = -PI + (q + 0.5) * PI / 7; g.fillStyle = q % 2 ? '#2f8a4a' : '#3f9e58'; g.beginPath(); g.ellipse(X + Math.cos(an) * Ht * 0.22, B - Ht + Math.sin(an) * Ht * 0.12, Ht * 0.2, Ht * 0.055, an, 0, 6.2832); g.fill(); }
          }
          [-5.4, -4.4, -1.9, -1.2, 1.2, 1.9, 4.4, 5.4].forEach(function (x, q) { palm(x, 13.0 + (q % 3) * 0.12, 1.3 + (q % 2) * 0.35); });
          // 성곽(도시) 띠
          g.fillStyle = '#c4a98a'; for (i = 0; i < 24; i++) { var bx = px(-6.4 + i * 0.55), bh = (0.25 + (i % 3) * 0.12) * ppm; g.fillRect(bx, py(12.95) - bh, 0.45 * ppm, bh + 6); g.fillStyle = i % 2 ? '#b99a78' : '#c9b08f'; }
          // 아래쪽 어린양 띠
          function lamb(x, y) { var X = px(x), Y = py(y); g.fillStyle = '#f6f1e4'; g.beginPath(); g.ellipse(X, Y, 0.55 * ppm * 0.5, 0.3 * ppm * 0.5, 0, 0, 6.28); g.fill(); g.beginPath(); g.arc(X + 0.38 * ppm * 0.5 + 6, Y - 0.2 * ppm * 0.5, 0.17 * ppm * 0.5, 0, 6.28); g.fill(); g.fillStyle = '#6b4a2b'; [-0.22, -0.06, 0.12, 0.26].forEach(function (d) { g.fillRect(X + d * ppm * 0.5 * 1.4, Y + 0.2 * ppm * 0.5, 4, 0.3 * ppm * 0.5); }); }
          lamb(-5.6, 9.7); lamb(5.6, 9.7);
          figure(g, px(-3.5), py(12.55), 2.5 * ppm, { robe: '#8a3030', mantle: '#c9bfab', skin: '#efcca3' });
          figure(g, px(3.5), py(12.55), 2.5 * ppm, { robe: '#e9dfc7', mantle: '#2e55a2', skin: '#efcca3' });
          // 가운데 그리스도 흉상
          var cxp = px(0), hy = py(14.75);
          g.fillStyle = '#f2d36a'; g.beginPath(); g.arc(cxp, hy, 0.62 * ppm, 0, 6.2832); g.fill(); g.strokeStyle = '#a97c1e'; g.lineWidth = 4; g.stroke();
          g.strokeStyle = '#b53a30'; g.lineWidth = 6; g.beginPath(); g.moveTo(cxp - 0.28 * ppm, hy - 0.1 * ppm); g.lineTo(cxp + 0.28 * ppm, hy - 0.1 * ppm); g.moveTo(cxp, hy - 0.5 * ppm); g.lineTo(cxp, hy + 0.12 * ppm); g.stroke();
          g.fillStyle = '#2e55a2'; g.beginPath(); g.moveTo(cxp - 1.25 * ppm, py(13.95)); g.quadraticCurveTo(cxp - 0.95 * ppm, hy + 0.25 * ppm, cxp, hy + 0.3 * ppm); g.quadraticCurveTo(cxp + 0.95 * ppm, hy + 0.25 * ppm, cxp + 1.25 * ppm, py(13.95)); g.closePath(); g.fill();
          g.fillStyle = '#b53a30'; g.beginPath(); g.moveTo(cxp - 0.5 * ppm, py(13.95)); g.lineTo(cxp - 0.2 * ppm, hy + 0.35 * ppm); g.lineTo(cxp + 0.2 * ppm, hy + 0.35 * ppm); g.lineTo(cxp + 0.5 * ppm, py(13.95)); g.closePath(); g.fill();
          g.fillStyle = '#f0cfa8'; g.beginPath(); g.arc(cxp, hy, 0.32 * ppm, 0, 6.2832); g.fill();
          g.fillStyle = '#5a3d2a'; g.beginPath(); g.arc(cxp, hy - 0.04 * ppm, 0.34 * ppm, PI * 1.02, PI * 1.98); g.fill(); g.fillRect(cxp - 0.2 * ppm, hy + 0.12 * ppm, 0.4 * ppm, 0.2 * ppm);
          g.fillStyle = '#f6f1e4'; g.fillRect(cxp + 0.55 * ppm, py(14.0) - 0.15 * ppm, 0.45 * ppm, 0.34 * ppm);
          // 아치 장식 띠
          var ecx = px(0), ecy = py(8.3);
          [[5.35, 5.0, '#d9b13e', 0.5], [5.65, 5.3, '#1e3a6e', 0.55]].forEach(function (e) {
            g.strokeStyle = e[2]; g.lineWidth = (e[3] + 0.06) * ppm * 0.5; g.beginPath(); g.ellipse(ecx, ecy, (e[0] + e[3] * 0.25) * ppm, (e[1] + e[3] * 0.25) * ppm, 0, PI, 2 * PI); g.stroke();
          });
          for (i = 0; i < 70; i++) { var th = PI + PI * (i + 0.5) / 70; g.fillStyle = ['#f6f1e4', '#d9603f', '#d9b13e', '#3f9e58'][i % 4]; g.beginPath(); g.arc(ecx + 5.62 * ppm * Math.cos(th), ecy + 5.32 * ppm * Math.sin(th), 5, 0, 6.28); g.fill(); }
          g.fillStyle = '#1e3a6e'; g.beginPath(); g.arc(ecx, py(13.55), 0.34 * ppm, 0, 6.28); g.fill(); g.fillStyle = '#d9b13e'; g.fillRect(ecx - 4, py(13.55) - 0.24 * ppm, 8, 0.48 * ppm); g.fillRect(ecx - 0.24 * ppm, py(13.55) - 4, 0.48 * ppm, 8);
          // 테두리
          g.fillStyle = '#1e3a6e'; g.fillRect(0, 0, W, 16); g.fillRect(0, 0, 14, H); g.fillRect(W - 14, 0, 14, H); g.fillStyle = '#d9b13e'; g.fillRect(0, 16, W, 5);
          // 아치 구멍 (비어 있음)
          g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.beginPath(); g.ellipse(ecx, ecy, 5.35 * ppm, 5.0 * ppm, 0, PI, 2 * PI); g.lineTo(ecx + 5.35 * ppm, H + 2); g.lineTo(ecx - 5.35 * ppm, H + 2); g.closePath(); g.fill();
        });
        var m = ctx.plane({ x: 0, y: Y0 + YH / 2, z: ZF + WT / 2 + 0.015, w: XW, h: YH, tex: tex, tile: [XW, YH] });
        m.material.alphaTest = 0.5; glowMat(m.material, 0.16); m.material.metalness = 0.35; m.material.roughness = 0.5;
        // 개선문 큰 기둥 두 개 + 아치 밑 금빛 소핏
        [-5.9, 5.9].forEach(function (x) { bigColumn(x, ZF + 0.55, 8.3, 0.39); });
        ctx.onHour(function (env) { m.material.emissiveIntensity = 0.08 + 0.12 * env.day; });
      })();

      // ---------- 후진 입구 위 금 모자이크 벽(비어 있는 아치) ----------
      (function apseTop() {
        var W = 1024, H = 725, Y0 = 6.0, YH = 9.35, X0 = -NW, XW = 2 * NW, ppm = W / XW;
        function px(x) { return (x - X0) / XW * W; } function py(y) { return H - (y - Y0) / YH * H; }
        var tex = ctx.tex.custom(W, H, function (g) {
          var rr = rng(61), i, j;
          for (j = 0; j < H; j += 6) for (i = 0; i < W; i += 6) { var c = 0.8 + rr() * 0.36; g.fillStyle = 'rgb(' + Math.round(224 * c) + ',' + Math.round(176 * c) + ',' + Math.round(62 * c) + ')'; g.fillRect(i, j, 5, 5); }
          // 큰 십자가 원판과 별
          var cx = px(0), cy = py(12.6);
          g.fillStyle = '#1e3a6e'; g.beginPath(); g.arc(cx, cy, 1.25 * ppm, 0, 6.2832); g.fill();
          g.strokeStyle = '#d9b13e'; g.lineWidth = 8; g.stroke();
          g.fillStyle = '#f6f1e4'; g.fillRect(cx - 0.12 * ppm, cy - 0.85 * ppm, 0.24 * ppm, 1.7 * ppm); g.fillRect(cx - 0.6 * ppm, cy - 0.5 * ppm, 1.2 * ppm, 0.24 * ppm);
          for (i = 0; i < 26; i++) { var a = i / 26 * 6.2832; g.fillStyle = '#f6f1e4'; g.beginPath(); g.arc(cx + Math.cos(a) * 1.0 * ppm, cy + Math.sin(a) * 1.0 * ppm, 4, 0, 6.28); g.fill(); }
          [[-4.2, 12.2], [-3.2, 13.6], [4.2, 12.2], [3.2, 13.6], [-5.4, 10.8], [5.4, 10.8]].forEach(function (p) { g.fillStyle = '#2e55a2'; g.beginPath(); for (var q = 0; q < 10; q++) { var an = q * PI / 5 - PI / 2, rd = (q % 2 ? 0.18 : 0.42) * ppm; g.lineTo(px(p[0]) + Math.cos(an) * rd, py(p[1]) + Math.sin(an) * rd); } g.closePath(); g.fill(); });
          g.fillStyle = '#1e3a6e'; g.fillRect(0, 0, W, 14); g.fillStyle = '#d9b13e'; g.fillRect(0, 14, W, 5);
          g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.beginPath(); g.ellipse(px(0), py(6.0), NW * ppm, 5.2 * ppm, 0, PI, 2 * PI); g.lineTo(px(NW), H + 2); g.lineTo(px(-NW), H + 2); g.closePath(); g.fill();
        });
        var m = ctx.plane({ x: 0, y: Y0 + YH / 2, z: ZB + 0.015, w: XW, h: YH, tex: tex, tile: [XW, YH] });
        m.material.alphaTest = 0.5; glowMat(m.material, 0.14); m.material.metalness = 0.35; m.material.roughness = 0.5;
        ctx.onHour(function (env) { m.material.emissiveIntensity = 0.07 + 0.1 * env.day; });
      })();

      function bigColumn(x, z, h, r) {
        oc({ x: x, y: 0, z: z, r: r * 1.35, h: 0.2, color: C.white, seg: 14 });
        ctx.box({ x: x, y: 0, z: z, w: r * 3.2, h: 0.2, d: r * 3.2, color: C.white });
        oc({ x: x, y: 0.2, z: z, r: r, rt: 0.9, h: h - 0.2 - 0.8, color: 0xc4c2bc, seg: 14, flat: false, B: GL });
        capital(x, z, h - 0.8, r, 0.8);
        ctx.addCollider({ x: x, z: z, r: r * 1.1 });
      }
      function capital(x, z, y0, r, ch) {
        var bell = ch * 0.8;
        oc({ x: x, y: y0, z: z, r: r * 0.95, rt: 1.55, h: bell, color: C.white, seg: 12, B: GL });
        for (var q = 0; q < 6; q++) {
          var a = q * PI / 3 + PI / 6;
          GL.add(Geo.box(), 0xd7d1c3, { x: x + Math.cos(a) * r * 1.2, y: y0 + bell * 0.05, z: z + Math.sin(a) * r * 1.2, ry: -a, rz: 0, sx: r * 0.34, sy: bell * 0.7, sz: r * 0.22, flat: true, vary: 0.02 });
        }
        for (q = 0; q < 4; q++) {
          var b = q * PI / 2 + PI / 4;
          GL.add(Geo.box(), 0xe2dcce, { x: x + Math.cos(b) * r * 1.55, y: y0 + bell * 0.62, z: z + Math.sin(b) * r * 1.55, ry: -b, sx: r * 0.5, sy: bell * 0.3, sz: r * 0.5, flat: true, vary: 0.02 });
        }
        ctx.box({ x: x, y: y0 + bell, z: z, w: r * 3.25, h: ch - bell, d: r * 3.25, color: 0xe2dcce, mat: 'gloss' });
      }

      // ---------- 기둥 80개 (화강암 샤프트는 인스턴스 1회 그리기, 기둥머리·받침은 합친 배치) ----------
      var colR = 0.295, shaftBase = 0.27, shaftH = CH - 0.62 - shaftBase;
      var cols = [];
      [-OW, -NW, NW, OW].forEach(function (x) { for (k = 1; k <= NB - 1; k++) cols.push([x, ZF + SP * k]); });
      var shaftMat;
      if (ctx.defineSurface && ctx.mats.surface) {
        ctx.defineSurface('granite_montorfano', { tex: granite, tile: [0.6, 1.24], roughness: 0.3, clearcoat: 0.7, ccRough: 0.1, envK: 1.2, noNoise: true });
        shaftMat = ctx.mats.surface('granite_montorfano', { repeat: [3, 4] });
      } else { granite.repeat.set(3, 4); shaftMat = ctx.mats.lambert({ tex: granite, color: 0xffffff }); }
      var inst = new T.InstancedMesh(openCyl(14, 0.9), shaftMat, cols.length);
      var mm = new T.Matrix4(), qq = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3();
      cols.forEach(function (c, ix) {
        sc.set(colR, shaftH, colR); ps.set(c[0], shaftBase, c[1]);
        mm.compose(ps, qq, sc); inst.setMatrixAt(ix, mm);
        ctx.box({ x: c[0], y: 0, z: c[1], w: colR * 2.9, h: 0.12, d: colR * 2.9, color: 0xdbd5c7, mat: 'gloss' });
        oc({ x: c[0], y: 0.12, z: c[1], r: colR * 1.32, rt: 0.8, h: 0.15, color: 0xdbd5c7, seg: 12, B: GL });
        capital(c[0], c[1], CH - 0.62, colR, 0.62);
        ctx.addCollider({ x: c[0], z: c[1], r: colR * 1.12 });
      });
      inst.frustumCulled = false; ctx.add(inst); ctx.stats.meshes++;
      // ---------- 교황 초상 메달리온 띠(색 면 아님: 초상 원판 + 금 테 돋을새김) ----------
      (function medallions() {
        var atlas = ctx.tex.custom(512, 256, function (g) {
          var rr = rng(51), robes = ['#f2ede2', '#a83a35', '#f2ede2', '#e6d9b8', '#a83a35', '#f2ede2', '#d8c18a', '#e9e2d0'], bgs = ['#2f4a7a', '#7a2f3a', '#355a48', '#4a3b62', '#8a6a2a', '#2f4a7a', '#3a5c6e', '#6a3a2a'];
          for (var q = 0; q < 8; q++) {
            var cx = (q % 4) * 128 + 64, cy = Math.floor(q / 4) * 128 + 64;
            g.fillStyle = '#d9b13e'; g.beginPath(); g.arc(cx, cy, 62, 0, 6.2832); g.fill();
            g.fillStyle = '#a97c1e'; g.beginPath(); g.arc(cx, cy, 52, 0, 6.2832); g.fill();
            g.fillStyle = bgs[q]; g.beginPath(); g.arc(cx, cy, 48, 0, 6.2832); g.fill();
            g.save(); g.beginPath(); g.arc(cx, cy, 48, 0, 6.2832); g.clip();
            g.fillStyle = robes[q]; g.beginPath(); g.ellipse(cx, cy + 52, 42, 34, 0, 0, 6.2832); g.fill();
            g.fillStyle = q % 3 === 0 ? '#d9b13e' : 'rgba(0,0,0,0.18)'; g.fillRect(cx - 4, cy + 18, 8, 40);
            g.fillStyle = '#efcca3'; g.beginPath(); g.ellipse(cx, cy - 4, 15, 19, 0, 0, 6.2832); g.fill();
            g.fillStyle = q % 2 ? '#e9e2d0' : '#6a5a50'; g.beginPath(); g.ellipse(cx, cy - 16, 17, 11, 0, PI, 2 * PI); g.fill();
            g.fillStyle = '#3a2a22'; g.fillRect(cx - 8, cy - 6, 4, 3); g.fillRect(cx + 4, cy - 6, 4, 3);
            g.restore();
          }
        });
        var mt = ctx.mats.lambert({ tex: atlas }); mt.alphaTest = 0.5; glowMat(mt, 0.12);
        var pos = [], uv = [], nor = [], idx = [], n = 0, count = 0, capDisc = new T.CircleGeometry(1, 8);
        function med(x, y, z, nx, nz, D, cell) {
          var ux = nz, uz = -nx, r = D / 2, rp = r * 0.8, ry = Math.atan2(nx, nz);
          MT.add(openCyl(8, 0.9), C.gold, { x: x, y: y, z: z, rx: PI / 2, ry: ry, sx: r, sy: 0.06, sz: r, flat: true, vary: 0.04 });
          MT.add(capDisc, C.gold, { x: x + nx * 0.06, y: y, z: z + nz * 0.06, ry: ry, sx: r * 0.9, sy: r * 0.9, sz: 1, flat: true, vary: 0.04 });
          var cx = x + nx * 0.066, cz = z + nz * 0.066, cu = (cell % 4) * 0.25, cv = 1 - (Math.floor(cell / 4) + 1) * 0.5;
          var cs = [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]];
          cs.forEach(function (c) { pos.push(cx + ux * c[0] * rp, y + c[1] * rp, cz + uz * c[0] * rp); uv.push(cu + c[2] * 0.25, cv + c[3] * 0.5); nor.push(nx, 0, nz); });
          idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4; count++;
        }
        var r2 = rng(77), cell = function () { return Math.floor(r2() * 8); };
        [-1, 1].forEach(function (sx) {
          for (var i2 = 0; i2 < NB; i2++) {
            var zc2 = ZF + SP * (i2 + 0.5);
            [-0.6, 0.6].forEach(function (o) {
              med(sx * NW - sx * 0.3, 7.65, zc2 + o, -sx, 0, 0.9, cell());
              med(sx * NW + sx * 0.3, 7.4, zc2 + o, sx, 0, 0.72, cell());
            });
            med(sx * OW - 0.3, 7.4, zc2, -1, 0, 0.72, cell()); med(sx * OW + 0.3, 7.4, zc2, 1, 0, 0.72, cell());
          }
          for (i2 = 0; i2 < 5; i2++) med(sx * TX - sx * 0.02, 7.2, -17.6 - i2 * 2.3, -sx, 0, 0.9, cell());
        });
        for (var q2 = 0; q2 < 7; q2++) { [-1, 1].forEach(function (sx) { med(sx * (7.6 + q2 * 1.5), 8.0, ZB + 0.02, 0, 1, 0.9, cell()); }); }
        meshOf(pos, uv, nor, idx, mt);
        ctx.medallionCount = count;
      })();

      // ---------- 천장 ----------
      ctx.ceilingFlat({ x0: -NW, x1: NW, z0: ZT, z1: ZE, y: NH, tex: cofferNave, tile: 4.4 });
      ctx.ceilingFlat({ x0: -TX, x1: TX, z0: ZB, z1: ZT, y: NH, tex: cofferNave, tile: 4.4 });
      [-1, 1].forEach(function (s) { ctx.ceilingFlat({ x0: s < 0 ? -WX : NW, x1: s < 0 ? -NW : WX, z0: ZT, z1: ZE, y: AH, tex: cofferAisle, tile: 3.6 }); });
      // 나무 보(큰 칸 구분)
      for (i = 0; i <= 12; i++) { var bz = ZT + (ZE - ZT) * i / 12; ctx.boxAABB({ x0: -NW, x1: NW, z0: bz - 0.12, z1: bz + 0.12, y0: NH - 0.18, y1: NH, color: 0x8a5a30 }); }
      // 입구 벽쪽·익랑 천장 가장자리 몰딩은 벽 위에 이미 있음

      // ---------- 성소: 치보리움 ----------
      var CX = 0, CZ = -18.5, YB = SY;
      (function ciborium() {
        var cw = 1.55, cd = 1.25;
        // 단(포르피리 원형 상감)과 받침
        ctx.boxAABB({ x0: -2.6, x1: 2.6, z0: CZ - 2.2, z1: CZ + 2.2, y0: YB, y1: YB + 0.18, color: 0xd8d1c0 });
        ctx.boxAABB({ x0: -2.3, x1: 2.3, z0: CZ - 1.9, z1: CZ + 1.9, y0: YB + 0.18, y1: YB + 0.32, color: 0xe3d8c0 });
        ctx.addCollider({ x0: -2.5, x1: 2.5, z0: CZ - 2.1, z1: CZ + 2.1 });
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) {
          var x = s[0] * cw, z = CZ + s[1] * cd, y = YB + 0.32;
          ctx.box({ x: x, y: y, z: z, w: 0.8, h: 0.9, d: 0.8, color: 0xdad4c6 });
          ctx.box({ x: x, y: y + 0.9, z: z, w: 0.92, h: 0.1, d: 0.92, color: C.gold });
          // 포르피리 꼬임 기둥
          var cy0 = y + 1.0, sh = 2.5, r = 0.2;
          ctx.cyl({ x: x, y: cy0, z: z, r: r * 0.85, rTop: r * 0.78, h: sh, seg: 10, color: C.porph });
          for (var st = 0; st < 2; st++) for (var q = 0; q < 12; q++) {
            var a0 = q * 0.62 + st * PI, a1 = (q + 1) * 0.62 + st * PI;
            solid.addBeam([x + Math.cos(a0) * r * 0.9, cy0 + sh * q / 12, z + Math.sin(a0) * r * 0.9], [x + Math.cos(a1) * r * 0.9, cy0 + sh * (q + 1) / 12, z + Math.sin(a1) * r * 0.9], 0.1, 0.1, 0x8a3a4e, { vary: 0.05 });
          }
          ctx.cyl({ x: x, y: cy0 + sh, z: z, r: 0.27, rTop: 0.33, h: 0.3, seg: 10, color: C.gold });
          ctx.box({ x: x, y: cy0 + sh + 0.3, z: z, w: 0.7, h: 0.14, d: 0.7, color: C.white });
          ctx.addCollider({ x: x, z: z, r: 0.34 });
        });
        var yE = YB + 0.32 + 1.0 + 2.5 + 0.44;   // 엔타블러처 바닥
        ctx.box({ x: CX, y: yE, z: CZ, w: 2 * cw + 0.9, h: 0.22, d: 2 * cd + 0.9, color: 0xf0e9d8 });
        ctx.box({ x: CX, y: yE + 0.22, z: CZ, w: 2 * cw + 0.75, h: 0.12, d: 2 * cd + 0.75, color: C.gold });
        var yA = yE + 0.34;
        // 뾰족 아치 4면(흰 대리석 + 안쪽 금 띠)
        var archRise = 0.62;
        function pArch(axis, c, span) {
          var pts = ChurchKit.profilePts('pointed', span / 2, span * archRise, 10);
          for (var q = 0; q < pts.length - 1; q++) {
            var a = pts[q], b = pts[q + 1];
            var A = axis === 'x' ? [a[0], yA + a[1], c] : [c, yA + a[1], a[0]], B = axis === 'x' ? [b[0], yA + b[1], c] : [c, yA + b[1], b[0]];
            GL.addBeam(A, B, 0.2, 0.34, 0xdfd9cb, { vary: 0.02 });
            var sh = 0.78;
            var A2 = axis === 'x' ? [a[0] * sh, yA + a[1] * sh, c] : [c, yA + a[1] * sh, a[0] * sh], B2 = axis === 'x' ? [b[0] * sh, yA + b[1] * sh, c] : [c, yA + b[1] * sh, b[0] * sh];
            MT.addBeam(A2, B2, 0.09, 0.36, C.gold, { vary: 0.04 });
          }
        }
        pArch('x', CZ - cd, 2 * cw - 0.3); pArch('x', CZ + cd, 2 * cw - 0.3);
        pArch('z', cw, 2 * cd - 0.3); pArch('z', -cw, 2 * cd - 0.3);
        // 박공(삼각) 4면: 아치 위쪽을 금 모자이크로 채우고 흰 테두리와 크로켓
        function gable(axis, c, half, span) {
          var ap = yA + 2.5, N = 16, fp = ChurchKit.profileFn('pointed', span / 2, span * archRise), q;
          function PT(u, y, d) { return axis === 'x' ? [u, y, c + d] : [c + d, y, u]; }
          [-1, 1].forEach(function (sg) {
            for (q = 0; q < N; q++) {
              var u0 = -half + 2 * half * q / N, u1 = -half + 2 * half * (q + 1) / N;
              var l0 = Math.abs(u0) < span / 2 ? yA + fp(u0) : yA, l1 = Math.abs(u1) < span / 2 ? yA + fp(u1) : yA;
              var t0 = yA + (ap - yA) * (1 - Math.abs(u0) / half), t1 = yA + (ap - yA) * (1 - Math.abs(u1) / half);
              if (t0 < l0 + 0.01 && t1 < l1 + 0.01) continue;
              quad(PT(u0, l0, sg * 0.05), PT(u1, l1, sg * 0.05), PT(u1, Math.max(l1, t1), sg * 0.05), PT(u0, Math.max(l0, t0), sg * 0.05), 0xd7a93a, PT((u0 + u1) / 2, yA + 1, sg * 6), 0.04, MT);
            }
          });
          [[-half, 0], [half, 0]].forEach(function (e) {
            var A = PT(e[0], yA, 0), B = PT(0, ap + 0.05, 0);
            GL.addBeam(A, B, 0.2, 0.3, 0xdfd9cb, { vary: 0.02 });
            for (var k2 = 1; k2 < 5; k2++) { var t = k2 / 5; ctx.cone({ x: A[0] + (B[0] - A[0]) * t, y: A[1] + (B[1] - A[1]) * t + 0.1, z: A[2] + (B[2] - A[2]) * t, r: 0.08, h: 0.26, seg: 4, color: C.gold }); }
          });
          var tp = PT(0, yA + 2.0, 0);
          ctx.sphere({ x: tp[0], y: tp[1], z: tp[2], r: 0.17, sx: axis === 'x' ? 0.17 : 0.05, sz: axis === 'x' ? 0.05 : 0.17, color: 0xdfd9cb, w: 8, h: 6 });
          ctx.sphere({ x: tp[0], y: ap + 0.12, z: tp[2], r: 0.1, color: C.gold, w: 6, h: 5 });
        }
        gable('x', CZ - cd, cw + 0.1, 2 * cw - 0.3); gable('x', CZ + cd, cw + 0.1, 2 * cw - 0.3); gable('z', cw, cd + 0.1, 2 * cd - 0.3); gable('z', -cw, cd + 0.1, 2 * cd - 0.3);
        // 모서리 첨탑
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) {
          var x = s[0] * (cw + 0.05), z = CZ + s[1] * (cd + 0.05);
          ctx.box({ x: x, y: yE + 0.34, z: z, w: 0.34, h: 1.2, d: 0.34, color: 0xdfd9cb });
          ctx.box({ x: x, y: yE + 1.2, z: z, w: 0.42, h: 0.12, d: 0.42, color: C.gold });
          ctx.cone({ x: x, y: yE + 1.54, z: z, r: 0.26, h: 1.0, seg: 4, color: 0xdad4c6 });
          ctx.sphere({ x: x, y: yE + 2.6, z: z, r: 0.07, color: C.gold, w: 5, h: 4 });
        });
        // 중앙 탑과 뾰족 지붕 + 십자가
        ctx.box({ x: CX, y: yA, z: CZ, w: 1.5, h: 2.7, d: 1.5, color: 0xd7d0c0 });
        [0, 1, 2, 3].forEach(function (q) { var a = q * PI / 2; ctx.box({ x: CX + Math.cos(a) * 0.76, y: yA + 1.7, z: CZ + Math.sin(a) * 0.76, w: Math.abs(Math.cos(a)) > 0.5 ? 0.06 : 0.45, h: 0.8, d: Math.abs(Math.cos(a)) > 0.5 ? 0.45 : 0.06, color: 0xd9a93a }); });
        ctx.box({ x: CX, y: yA + 2.7, z: CZ, w: 1.8, h: 0.12, d: 1.8, color: C.gold });
        ctx.cone({ x: CX, y: yA + 2.82, z: CZ, r: 1.1, h: 1.3, seg: 4, color: 0xdfd9cb, ry: PI / 4 });
        ctx.box({ x: CX, y: yA + 4.1, z: CZ, w: 0.07, h: 0.7, d: 0.07, color: C.gold });
        ctx.box({ x: CX, y: yA + 4.45, z: CZ, w: 0.36, h: 0.07, d: 0.07, color: C.gold });
        ctx.addGlow({ x: CX, y: yA + 1.8, z: CZ, size: 3.2, color: 0xffd98a, kind: 'always' });
        // 제대(상판+제단보+금 앞판) 와 촛대 6개
        ctx.altar({ x: CX, z: CZ, y: YB + 0.32, w: 2.3, d: 1.0, h: 1.0, style: 'block', color: 0xdcd6c8, candles: 0, flowers: true });
        ctx.box({ x: CX, y: YB + 0.32 + 0.35, z: CZ + 0.52, w: 1.2, h: 0.5, d: 0.04, color: C.gold });
        for (var cI = 0; cI < 6; cI++) {
          var cxx = -1.0 + cI * 0.4;
          ctx.cyl({ x: cxx, y: YB + 1.34, z: CZ - 0.3, r: 0.06, rTop: 0.035, h: 0.45, seg: 6, color: C.gold });
          ctx.cyl({ x: cxx, y: YB + 1.79, z: CZ - 0.3, r: 0.045, h: 0.35, seg: 6, color: 0xfff6e0 });
          ctx.addFlame({ x: cxx, y: YB + 2.25, z: CZ - 0.3, scale: 1.0 });
        }
        ctx.crucifix({ x: 0, y: YB + 1.34, z: CZ - 0.5, h: 1.2, ry: 0, glow: false });
        // 콘페시오(제대 앞 난간)
        ctx.boxAABB({ x0: -1.7, x1: 1.7, z0: -16.3, z1: -15.05, y0: SY, y1: SY + 0.02, color: 0x2a1f1a });
        [[-1.7, -16.3, -1.7, -15.05], [1.7, -16.3, 1.7, -15.05], [-1.7, -15.05, 1.7, -15.05], [-1.7, -16.3, 1.7, -16.3]].forEach(function (e) {
          ctx.boxAABB({ x0: Math.min(e[0], e[2]) - 0.05, x1: Math.max(e[0], e[2]) + 0.05, z0: Math.min(e[1], e[3]) - 0.05, z1: Math.max(e[1], e[3]) + 0.05, y0: SY + 0.55, y1: SY + 0.65, color: C.gold });
          ctx.boxAABB({ x0: Math.min(e[0], e[2]) - 0.04, x1: Math.max(e[0], e[2]) + 0.04, z0: Math.min(e[1], e[3]) - 0.04, z1: Math.max(e[1], e[3]) + 0.04, y0: SY, y1: SY + 0.55, color: 0xdad3c3 });
        });
        for (var ln = 0; ln < 5; ln++) { ctx.addFlame({ x: -1.4 + ln * 0.7, y: SY + 0.78, z: -15.5, scale: 0.9 }); }
        ctx.addGlow({ x: 0, y: SY + 0.9, z: -15.7, size: 2.4, color: 0xffc977, kind: 'lamp' });
        ctx.addCollider({ x0: -1.75, x1: 1.75, z0: -16.35, z1: -15.0 });
      })();
      ctx.addLight({ x: 0, y: 6.4, z: -17.0, color: 0xffcf8a, intensity: 1.0, distance: 26, kind: 'lamp' });

      // ---------- 성 베드로·성 바오로 상 ----------
      [[-4.5, 'peter'], [4.5, 'paul']].forEach(function (s) {
        var x = s[0];
        ctx.box({ x: x, y: 0, z: -13.2, w: 1.5, h: 0.35, d: 1.5, color: 0xdcd3bf });
        ctx.box({ x: x, y: 0.35, z: -13.2, w: 1.1, h: 1.35, d: 1.1, color: 0xd8d1c1 });
        ctx.box({ x: x, y: 1.7, z: -13.2, w: 1.25, h: 0.12, d: 1.25, color: C.gold });
        ctx.statue({ x: x, y: 1.82, z: -13.2, h: 2.5, kind: 'saint', robe: 0xdbd5c7, mantle: 0xcfc7b6, ry: 0, halo: false });
        if (s[1] === 'paul') ctx.box({ x: x + 0.38, y: 2.5, z: -13.0, w: 0.06, h: 1.4, d: 0.06, color: 0xaaa9a4 });
        else { ctx.box({ x: x + 0.34, y: 2.45, z: -13.0, w: 0.22, h: 0.06, d: 0.06, color: C.gold }); ctx.box({ x: x + 0.44, y: 2.35, z: -13.0, w: 0.06, h: 0.18, d: 0.06, color: C.gold }); }
        ctx.addCollider({ x0: x - 0.85, x1: x + 0.85, z0: -14.05, z1: -12.35 });
      });

      // ---------- 부활초 촛대 · 독서대 ----------
      (function () {
        var x = 3.5, z = -17.8;
        ctx.box({ x: x, y: SY, z: z, w: 0.7, h: 0.3, d: 0.7, color: 0xd8d1c1 });
        ctx.cyl({ x: x, y: SY + 0.3, z: z, r: 0.2, rTop: 0.12, h: 0.5, seg: 8, color: 0xd8d1c0 });
        ctx.cyl({ x: x, y: SY + 0.8, z: z, r: 0.12, h: 1.9, seg: 8, color: 0xdcd6c8 });
        for (var b = 0; b < 4; b++) ctx.cyl({ x: x, y: SY + 0.95 + b * 0.45, z: z, r: 0.16, h: 0.08, seg: 8, color: C.gold });
        ctx.cyl({ x: x, y: SY + 2.7, z: z, r: 0.28, rTop: 0.32, h: 0.14, seg: 8, color: C.gold });
        ctx.cyl({ x: x, y: SY + 2.84, z: z, r: 0.14, h: 0.9, seg: 8, color: 0xfff6e0 });
        ctx.addFlame({ x: x, y: SY + 3.9, z: z, scale: 1.4 });
        ctx.addCollider({ x: x, z: z, r: 0.45 });
        ctx.pulpit({ x: -4.2, z: -17.0, y: SY, ry: 0, style: 'ambo' });
      })();

      // ---------- 익랑 끝 제대 2개(공작석 제단 + 금 틀 제단화) ----------
      [-1, 1].forEach(function (sx) {
        var x0 = sx * TX, face = -sx;
        var art = ctx.tex.custom(256, 352, function (g, w, h) {
          var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, sx < 0 ? '#e9c87a' : '#8fb4e0'); gr.addColorStop(1, sx < 0 ? '#7a5a3a' : '#e9d9a8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
          if (sx < 0) { g.fillStyle = 'rgba(255,240,180,0.9)'; g.beginPath(); g.arc(w * 0.5, h * 0.2, 60, 0, 6.28); g.fill(); figure(g, w * 0.5, h * 0.85, h * 0.45, { robe: '#a83a35', mantle: '#2e55a2' }); figure(g, w * 0.78, h * 0.93, h * 0.25, { robe: '#e9dfc7', mantle: '#6e7f52' }); }
          else { figure(g, w * 0.34, h * 0.9, h * 0.55, { robe: '#b53a30', mantle: '#d9b13e' }); figure(g, w * 0.68, h * 0.9, h * 0.55, { robe: '#e9efff', mantle: '#2e55a2' }); g.fillStyle = '#f2d36a'; g.beginPath(); g.moveTo(w * 0.42, h * 0.18); g.lineTo(w * 0.5, h * 0.1); g.lineTo(w * 0.58, h * 0.18); g.closePath(); g.fill(); }
        });
        var zc3 = -22.2;
        var pl = ctx.plane({ x: x0 + face * 0.04, y: 4.2, z: zc3, ry: sx < 0 ? PI / 2 : -PI / 2, w: 3.2, h: 4.4, tex: art, tile: [3.2, 4.4] });
        glowMat(pl.material, 0.14);
        ctx.boxAABB({ x0: Math.min(x0, x0 + face * 0.06), x1: Math.max(x0, x0 + face * 0.06), z0: zc3 - 1.9, z1: zc3 + 1.9, y0: SY + 1.55, y1: SY + 6.35, color: C.gold });
        [-1.75, 1.75].forEach(function (dz) { ctx.cyl({ x: x0 + face * 0.3, y: SY + 1.3, z: zc3 + dz, r: 0.2, rTop: 0.18, h: 4.8, seg: 10, color: 0xd3ccb8 }); ctx.cyl({ x: x0 + face * 0.3, y: SY + 6.0, z: zc3 + dz, r: 0.27, rTop: 0.3, h: 0.3, seg: 10, color: C.gold }); });
        ctx.boxAABB({ x0: Math.min(x0 + face * 0.1, x0 + face * 0.5), x1: Math.max(x0 + face * 0.1, x0 + face * 0.5), z0: zc3 - 2.2, z1: zc3 + 2.2, y0: SY + 6.3, y1: SY + 6.6, color: 0xd9d3c5 });
        tri([x0 + face * 0.3, SY + 6.6, zc3 - 2.2], [x0 + face * 0.3, SY + 6.6, zc3 + 2.2], [x0 + face * 0.3, SY + 7.3, zc3], C.gold, [x0 + face * 6, SY + 6.6, zc3]);
        // 공작석(짙은 녹색) 제대 + 청금석 장식
        ctx.boxAABB({ x0: Math.min(x0 + face * 0.1, x0 + face * 1.1), x1: Math.max(x0 + face * 0.1, x0 + face * 1.1), z0: zc3 - 1.7, z1: zc3 + 1.7, y0: SY, y1: SY + 1.2, color: 0x1f6b4a, vary: 0.05 });
        ctx.boxAABB({ x0: Math.min(x0 + face * 0.08, x0 + face * 1.2), x1: Math.max(x0 + face * 0.08, x0 + face * 1.2), z0: zc3 - 1.8, z1: zc3 + 1.8, y0: SY + 1.2, y1: SY + 1.3, color: 0xdad3c3 });
        [-1, 0, 1].forEach(function (q) { ctx.boxAABB({ x0: Math.min(x0 + face * 1.1, x0 + face * 1.14), x1: Math.max(x0 + face * 1.1, x0 + face * 1.14), z0: zc3 + q * 1.0 - 0.3, z1: zc3 + q * 1.0 + 0.3, y0: SY + 0.3, y1: SY + 0.9, color: 0x1e3a6e }); });
        ctx.addCollider({ x0: Math.min(x0, x0 + face * 1.3), x1: Math.max(x0, x0 + face * 1.3), z0: zc3 - 1.9, z1: zc3 + 1.9 });
      });

      // ---------- 왼쪽 익랑의 오르간 ----------
      (function () {
        var z = ZT - 0.5, y0 = 6.2;
        ctx.boxAABB({ x0: -17.6, x1: -7.6, z0: z - 0.6, z1: ZT, y0: y0 - 0.45, y1: y0, color: 0x5a3d26 });
        ctx.boxAABB({ x0: -17.6, x1: -7.6, z0: ZT - 0.2, z1: ZT, y0: y0, y1: y0 + 6.4, color: 0x6a4a2c });
        for (var p = 0; p < 29; p++) {
          var hh = 2.2 + 2.6 * Math.abs(Math.sin(p * 0.43 + 0.5)) + (p % 7 === 3 ? 1.1 : 0), x = -17.2 + p * 0.34;
          ctx.cyl({ x: x, y: y0, z: ZT - 0.45, r: 0.12, h: hh, seg: 6, color: p % 2 ? 0xd7cdb5 : 0xe6dec9 });
        }
        ctx.boxAABB({ x0: -17.6, x1: -7.6, z0: z - 0.6, z1: ZT, y0: y0 + 6.2, y1: y0 + 6.5, color: C.gold });
        [-17.6, -12.6, -7.6].forEach(function (x) { ctx.boxAABB({ x0: x - 0.22, x1: x + 0.22, z0: z - 0.6, z1: ZT, y0: y0, y1: y0 + 6.5, color: 0x5a3d26 }); });
      })();

      // ---------- 외벽 사도상 벽감 8개 ----------
      // 창이 없는 홀수 베이에 둔다(측랑 창은 짝수 베이). 예전 자리(2·6·10·14)는 창 바로 앞이라 벽감이 알라바스터 창 아랫부분을 가렸다(G-29).
      [-1, 1].forEach(function (sx) {
        [3, 7, 11, 15].forEach(function (b, j) {
          ctx.statueNiche({ x: sx * WX, z: ZF + SP * (b + 0.5), y: 0.95, face: [-sx, 0], w: 1.1, h: 2.6, kind: j % 2 ? 'saint' : 'christ', halo: true, robe: 0xdad4c6, mantle: 0xc9bfaa });
        });
      });

      // ---------- 입구: 성수대 ----------
      ctx.holyFont({ x: -3.6, z: 32.5 }); ctx.holyFont({ x: 3.6, z: 32.5 });

      // ---------- 충돌체: T자 윤곽 ----------
      ctx.addCollider({ x0: WX, x1: 19.6, z0: ZT, z1: 35.5 });
      ctx.addCollider({ x0: -19.6, x1: -WX, z0: ZT, z1: 35.5 });
      ctx.addCollider({ x0: -19.6, x1: 19.6, z0: ZE, z1: 35.5 });
      ctx.addCollider({ x0: TX, x1: 19.6, z0: -36, z1: ZT });
      ctx.addCollider({ x0: -19.6, x1: -TX, z0: -36, z1: ZT });
      ctx.addCollider({ x0: NW, x1: 19.6, z0: -36, z1: ZB });
      ctx.addCollider({ x0: -19.6, x1: -NW, z0: -36, z1: ZB });
      // 개선문 벽(측랑 쪽 벽 조각)
      [[NW - 1.3, NW + 1.25], [10.65, 13.15], [15.95, 19.6]].forEach(function (r) {
        ctx.addCollider({ x0: r[0], x1: r[1], z0: ZT, z1: ZF + 0.3 });
        ctx.addCollider({ x0: -r[1], x1: -r[0], z0: ZT, z1: ZF + 0.3 });
      });

      // ---------- 좌석·촛불대·카메라·조명 ----------
      ctx.renderSeats(layout, 'bench', { wood: 0xa4713f, seat: 0xc08a52, back: 0x8c5a32 });
      ctx.candleStand(0, { wood: 0x5a4630 });
      // ---------- 톤 조정: 엔진(PBR+HDR 환경광+태양)의 노출에 맞춰 반사율을 실제 석재 수준으로 낮춘다 ----------
      var ALB = 0.25;
      [ctx.solid, ctx.gloss].forEach(function (b) { if (b && b.c) for (var q = 0; q < b.c.length; q++) b.c[q] *= ALB; });
      if (ctx.metalB && ctx.metalB.c) for (var q2 = 0; q2 < ctx.metalB.c.length; q2++) ctx.metalB.c[q2] *= 0.55;
      ctx.root.children.forEach(function (o) {
        if (o.isMesh && o.material && o.material.color && !o.isInstancedMesh && o.material.map) o.material.color.multiplyScalar(o.material.emissiveIntensity > 0 && o.material.emissive && o.material.emissive.r > 0 ? 0.5 : 0.3);
      });
      shaftMat.color.multiplyScalar(0.32);
      ctx.setSky({ outside: false });
      ctx.setCameraBounds({ x0: -17.0, x1: 17.0, z0: -34.8, z1: 33.2, yMax: 14.8 });
      ctx.addGlow({ x: 0, y: 11.0, z: -26, size: 9, color: 0xffd98a, kind: 'lamp', pulse: 0.03 });
    }
  };
})();
