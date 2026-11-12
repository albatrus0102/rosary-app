/* ch_stpeter.js — 성 베드로 대성전(바티칸). 조사서: docs/church/interiors/stpeter.md (§6 좌표표, §11 채택값).
   scalePercent 37 : 앱 미터 = 실제 미터 × 0.37.  평면(위에서 볼 때, 입구 +z / 후진 -z):
   신랑(입구 25.7 m → 교차부 23 m 로 좁아짐, 천장 정점 45.5 m) + 양쪽 측랑 + 교차부(돔 중심 (0,-9)) + 익랑 + 후진.
   좌표/치수는 모두 이미 축소된 앱 미터. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- 레이아웃(순수 데이터)
  var layout = {
    id: 'stpeter', scalePercent: 37,
    bounds: { x0: -25.5, x1: 25.5, z0: -34.5, z1: 34.5 },
    spawn: { x: 0, z: 32.3, r: 0 },
    seatGroups: [
      { g: 'L', rows: 13, perRow: 4, origin: { x: -1.5, z: 2.5 }, dx: -0.7, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.5, 0.5] },
      { g: 'R', rows: 13, perRow: 4, origin: { x: 1.5, z: 2.5 }, dx: 0.7, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.5, 0.5] },
      { g: 'AL', rows: 5, perRow: 4, origin: { x: -1.5, z: -27.5 }, dx: -0.7, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.5, 0.5] },
      { g: 'AR', rows: 5, perRow: 4, origin: { x: 1.5, z: -27.5 }, dx: 0.7, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.5, 0.5] }
    ],
    candles: {
      stands: [
        { x: 8.9, z: 17.2, slots: 96, reach: 1.8, cols: 16, face: [-1, 0], pitch: 0.5, step: 0.25, ystep: 0.3, y0: 0.8 },
        { x: -8.9, z: 17.2, slots: 96, reach: 1.8, cols: 16, face: [1, 0], pitch: 0.5, step: 0.25, ystep: 0.3, y0: 0.8 }
      ]
    },
    info: { name: '성 베드로 대성전', place: '바티칸 시국', builtYear: 1626 }
  };
  ChurchLayouts.register(layout);

  // ---------------------------------------------------------------- 빌더
  ChurchBuilders['stpeter'] = {
    layout: layout,
    thumb: { x: 0, z: 26, yaw: 0, pitch: 12, zoom: 1.0, hour: 11 },
    build: function (ctx) {
      var T = ctx.THREE, PI = Math.PI, solid = ctx.solid, glass = ctx.glass, glow = ctx.glow;
      var Geo = ChurchGeo.Geo;
      var rnd = ctx.rng(7);
      var __v0 = 0;
      function VC(label) { if (window.__stpDbg) { var t = solid.vertexCount + glass.vertexCount + glow.vertexCount; console.log('[vc] ' + label + ' +' + (t - __v0) + ' = ' + t); __v0 = t; } }

      // ---- 색(조사서 §5) ----
      var CREAM = 0xe8e0cf, CREAM_D = 0xcfc6b4, GOLD = 0xd4af37, GOLD_D = 0xb8892b, BRONZE = 0x3e2f1f, WHITE = 0xede9e0,
        YEL = 0xd2a657, RED = 0x7a2e2c, GREY = 0x8d9296, GREEN = 0x3f6652, BLUE = 0x2f4c7a, AMBER = 0xf2b441;
      var GLASS_PALE = [0xfff4d6, 0xffefc4, 0xfffaf0, 0xffeab0];

      // ---- 치수(앱 m) ----
      var YS = 12.35;          // 엔타블러처 윗단 = 궁륭 시작선
      var RISE = 4.5;          // 궁륭 상승(정점 16.85)
      var ZE = 34.5;           // 입구 안쪽 벽
      var CX = 0, CZ = -9;     // 돔 중심
      var PIER_OUT = 7.0, AISLE_OUT = 10.95;
      var PIERS = [[32.4, 34.5], [23.75, 27.9], [15.1, 19.25], [6.45, 10.6]];
      var ARCHZ = [30.15, 21.5, 12.85, 4.2];
      function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
      function hw(z) { return 4.25 + 0.5 * clamp((z - 1.95) / 32.55, 0, 1); }

      // ---------------------------------------------------------------- 도우미
      function P3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
      function onWall(cx, cz, n, u, d) { return [cx + n[1] * u + n[0] * d, cz - n[0] * u + n[1] * d]; }
      // 벽 위 상자: (cx,cz)=벽 위 기준점, n=실내쪽 법선, u=벽 따라 이동, d=벽에서 실내쪽 중심 거리
      function wbox(cx, cz, n, u, d, y, w, h, dep, color) {
        var p = onWall(cx, cz, n, u, d);
        ctx.box({ x: p[0], y: y, z: p[1], w: w, h: h, d: dep, ry: Math.atan2(n[0], n[1]), color: color });
      }
      function wcyl(cx, cz, n, u, d, y, r, rTop, h, seg, color) {
        var p = onWall(cx, cz, n, u, d);
        ctx.cyl({ x: p[0], y: y, z: p[1], r: r, rTop: rTop, h: h, seg: seg, color: color });
      }
      function wico(cx, cz, n, u, d, y, r, color) {
        var p = onWall(cx, cz, n, u, d);
        ctx.ico({ x: p[0], y: y, z: p[1], r: r, color: color, detail: 0 });
      }
      function qNormal(q) { return q; }

      // 홈 파인 거대 벽기둥(코린트식). 벽 위 (cx,cz), 실내 법선 n, 기둥 중심 u 위치
      function pilaster(cx, cz, n, u, h, o) {
        o = o || {};
        var W = o.w || 0.95, Pr = 0.3, col = o.color || CREAM, y0 = o.y0 || 0;
        var plinthH = 0.5, baseH = 0.22, capH = 1.0;
        wbox(cx, cz, n, u, (Pr + 0.2) / 2, y0, W + 0.36, plinthH, Pr + 0.2, ctx.shade(col, 0.94));
        wbox(cx, cz, n, u, (Pr + 0.14) / 2, y0 + plinthH, W + 0.2, baseH * 0.55, Pr + 0.14, col);
        wbox(cx, cz, n, u, (Pr + 0.08) / 2, y0 + plinthH + baseH * 0.55, W + 0.1, baseH * 0.45, Pr + 0.08, ctx.shade(col, 1.04));
        var sh = h - plinthH - baseH - capH;
        wbox(cx, cz, n, u, Pr / 2, y0 + plinthH + baseH, W, sh, Pr, col);
        for (var f = -3; f <= 3; f++) wbox(cx, cz, n, u + f * 0.12, Pr / 2 + 0.006, y0 + plinthH + baseH + 0.12, 0.05, sh - 0.24, Pr + 0.012, ctx.shade(col, 0.74));
        var cy = y0 + h - capH;
        wbox(cx, cz, n, u, (Pr + 0.1) / 2, cy, W + 0.1, 0.3, Pr + 0.1, GOLD_D);
        for (var k = -2; k <= 2; k++) wico(cx, cz, n, u + k * 0.17, Pr + 0.02, cy + 0.42, 0.115, k % 2 ? GOLD : GOLD_D);
        wbox(cx, cz, n, u, (Pr + 0.18) / 2, cy + 0.3, W + 0.2, 0.36, Pr + 0.18, GOLD);
        wbox(cx, cz, n, u, (Pr + 0.3) / 2, cy + 0.82, W + 0.36, 0.18, Pr + 0.3, ctx.shade(col, 1.03));
      }

      // 벽을 따르는 엔타블러처(건축보·프리즈 면·코니스). A,B = 벽 위 두 점 (x,z), f=실내 법선
      function entablature(ax, az, bx, bz, f, tex, y0) {
        y0 = y0 === undefined ? 10.4 : y0;
        ctx.cornice({ x0: ax, z0: az, x1: bx, z1: bz, y: y0, h: 0.5, depth: 0.26, facing: f, color: CREAM_D });
        if (tex) ctx.wallFace({ x0: ax + f[0] * 0.11, z0: az + f[1] * 0.11, x1: bx + f[0] * 0.11, z1: bz + f[1] * 0.11, y0: y0 + 0.5, y1: y0 + 1.2, facing: f, tex: tex, tile: [16, 0.7] });
        ctx.cornice({ x0: ax, z0: az, x1: bx, z1: bz, y: y0 + 1.2, h: 0.12, depth: 0.2, facing: f, color: GOLD_D });
        ctx.cornice({ x0: ax, z0: az, x1: bx, z1: bz, y: y0 + 1.32, h: 0.2, depth: 0.36, facing: f, color: CREAM });
        ctx.cornice({ x0: ax, z0: az, x1: bx, z1: bz, y: y0 + 1.52, h: 0.4, depth: 0.58, facing: f, color: ctx.shade(CREAM, 1.03) });
        ctx.cornice({ x0: ax, z0: az, x1: bx, z1: bz, y: y0 + 1.92, h: 0.2, depth: 0.5, facing: f, color: GOLD_D });
      }

      // 압출 패널(구멍 가능)
      function extrude(shape, depth, color, x, y, z, rotY) {
        var g = new T.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false, curveSegments: 10 });
        if (rotY) g.rotateY(rotY);
        solid.add(g, color, { x: x, y: y, z: z, flat: true });
      }
      function archHolePath(cx, y0, w, hRect) {
        var p = new T.Path();
        p.moveTo(cx - w / 2, y0); p.lineTo(cx + w / 2, y0); p.lineTo(cx + w / 2, y0 + hRect);
        p.absarc(cx, y0 + hRect, w / 2, 0, PI, false);
        p.lineTo(cx - w / 2, y0);
        return p;
      }

      // 평면 창살 유리 패널. p0=왼쪽아래, U=폭 벡터, V=높이 벡터, hint=보는 쪽 점, off=뒤판 이동
      function paneGrid(p0, U, V, cols, rows, colors, hint, off) {
        var p1 = P3(p0, U), p3 = P3(p0, V), p2 = P3(p1, V);
        if (off) {
          solid.addQuad(P3(p0, off), P3(p1, off), P3(p2, off), P3(p3, off), 0x2b231f, hint, { vary: 0 });
        }
        for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
          var a = [i / cols, j / rows], b = [(i + 1) / cols, j / rows], c = [(i + 1) / cols, (j + 1) / rows], d = [i / cols, (j + 1) / rows];
          var cc = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], k = 0.88;
          function Q(pp) { var u = cc[0] + (pp[0] - cc[0]) * k, v = cc[1] + (pp[1] - cc[1]) * k; return [p0[0] + U[0] * u + V[0] * v, p0[1] + U[1] * u + V[1] * v, p0[2] + U[2] * u + V[2] * v]; }
          glass.addQuad(Q(a), Q(b), Q(c), Q(d), colors[(i * 3 + j * 5 + ((rnd() * 4) | 0)) % colors.length], hint, { vary: 0.05 });
        }
      }

      // ---------------------------------------------------------------- 질감
      var texFloor = ctx.tex.custom(512, 512, function (g, w, h) {
        var i, R = w / 2;
        g.fillStyle = '#eadfc8'; g.fillRect(0, 0, w, h);
        for (i = 0; i < 700; i++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '120,100,80,' : '255,250,235,') + (rnd() * 0.07) + ')'; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 9, 0, 6.3); g.fill(); }
        // 바깥 띠
        g.fillStyle = '#a9a396'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14); g.fillRect(0, 0, 14, h); g.fillRect(w - 14, 0, 14, h);
        g.fillStyle = '#3f6652'; g.fillRect(14, 14, w - 28, 5); g.fillRect(14, h - 19, w - 28, 5); g.fillRect(14, 14, 5, h - 28); g.fillRect(w - 19, 14, 5, h - 28);
        // 모서리 사분원
        [[0, 0], [w, 0], [0, h], [w, h]].forEach(function (c) {
          g.fillStyle = '#8d9296'; g.beginPath(); g.arc(c[0], c[1], R * 0.62, 0, 6.3); g.fill();
          g.fillStyle = '#eadfc8'; g.beginPath(); g.arc(c[0], c[1], R * 0.54, 0, 6.3); g.fill();
          g.fillStyle = '#7a2e2c'; g.beginPath(); g.arc(c[0], c[1], R * 0.36, 0, 6.3); g.fill();
          g.fillStyle = '#d2a657'; g.beginPath(); g.arc(c[0], c[1], R * 0.2, 0, 6.3); g.fill();
        });
        // 마름모 + 중앙 원
        g.strokeStyle = '#b8892b'; g.lineWidth = 4; g.beginPath(); g.moveTo(R, 22); g.lineTo(w - 22, R); g.lineTo(R, h - 22); g.lineTo(22, R); g.closePath(); g.stroke();
        g.fillStyle = '#d2a657'; g.beginPath(); g.moveTo(R, 36); g.lineTo(w - 36, R); g.lineTo(R, h - 36); g.lineTo(36, R); g.closePath(); g.fill();
        var rings = [[0.40, '#7a2e2c'], [0.355, '#ede9e0'], [0.325, '#3f6652'], [0.28, '#d2a657'], [0.22, '#8d9296'], [0.17, '#7a2e2c'], [0.12, '#ede9e0']];
        rings.forEach(function (r) { g.fillStyle = r[1]; g.beginPath(); g.arc(R, R, w * r[0], 0, 6.3); g.fill(); });
        g.fillStyle = '#b8892b';
        for (i = 0; i < 12; i++) { var a = i * PI / 6; g.beginPath(); g.moveTo(R, R); g.lineTo(R + Math.cos(a - 0.12) * w * 0.11, R + Math.sin(a - 0.12) * w * 0.11); g.lineTo(R + Math.cos(a) * w * 0.19, R + Math.sin(a) * w * 0.19); g.lineTo(R + Math.cos(a + 0.12) * w * 0.11, R + Math.sin(a + 0.12) * w * 0.11); g.fill(); }
        g.strokeStyle = 'rgba(80,60,50,0.5)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
        for (i = 0; i < 40; i++) { g.strokeStyle = 'rgba(110,90,80,' + (0.04 + rnd() * 0.08) + ')'; g.lineWidth = 1; g.beginPath(); var vx = rnd() * w, vy = rnd() * h; g.moveTo(vx, vy); for (var s = 0; s < 4; s++) { vx += (rnd() - 0.5) * 80; vy += (rnd() - 0.5) * 80; g.lineTo(vx, vy); } g.stroke(); }
      });
      var texCross = ctx.tex.custom(1024, 1024, function (g, w, h) {
        var R = w / 2, i;
        g.fillStyle = '#e8dcc2'; g.fillRect(0, 0, w, h);
        for (i = 0; i < 900; i++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '120,100,80,' : '255,250,235,') + (rnd() * 0.07) + ')'; g.beginPath(); g.arc(rnd() * w, rnd() * h, 3 + rnd() * 14, 0, 6.3); g.fill(); }
        g.fillStyle = '#a9a396'; g.fillRect(0, 0, w, 22); g.fillRect(0, h - 22, w, 22); g.fillRect(0, 0, 22, h); g.fillRect(w - 22, 0, 22, h);
        // 큰 팔각 + 원
        var rings = [[0.46, '#8d9296'], [0.44, '#ede9e0'], [0.41, '#7a2e2c'], [0.36, '#d2a657'], [0.33, '#3f6652'], [0.28, '#ede9e0'], [0.24, '#7a2e2c'], [0.19, '#d2a657'], [0.13, '#2f4c7a'], [0.07, '#d2a657']];
        rings.forEach(function (r) { g.fillStyle = r[1]; g.beginPath(); g.arc(R, R, w * r[0], 0, 6.3); g.fill(); });
        for (i = 0; i < 16; i++) { var a = i * PI / 8; g.fillStyle = i % 2 ? '#ede9e0' : '#8d9296'; g.beginPath(); g.moveTo(R, R); g.lineTo(R + Math.cos(a - 0.14) * w * 0.28, R + Math.sin(a - 0.14) * w * 0.28); g.lineTo(R + Math.cos(a) * w * 0.4, R + Math.sin(a) * w * 0.4); g.lineTo(R + Math.cos(a + 0.14) * w * 0.28, R + Math.sin(a + 0.14) * w * 0.28); g.fill(); }
        [[0.14, 0.14], [0.86, 0.14], [0.14, 0.86], [0.86, 0.86]].forEach(function (c) {
          [[0.1, '#8d9296'], [0.085, '#ede9e0'], [0.07, '#7a2e2c'], [0.045, '#d2a657'], [0.02, '#3f6652']].forEach(function (r) { g.fillStyle = r[1]; g.beginPath(); g.arc(c[0] * w, c[1] * h, w * r[0], 0, 6.3); g.fill(); });
        });
        g.strokeStyle = '#b8892b'; g.lineWidth = 5; g.strokeRect(60, 60, w - 120, h - 120);
        for (i = 0; i < 80; i++) { g.strokeStyle = 'rgba(110,90,80,' + (0.04 + rnd() * 0.08) + ')'; g.lineWidth = 1.5; g.beginPath(); var vx = rnd() * w, vy = rnd() * h; g.moveTo(vx, vy); for (var s = 0; s < 4; s++) { vx += (rnd() - 0.5) * 120; vy += (rnd() - 0.5) * 120; g.lineTo(vx, vy); } g.stroke(); }
      });
      // 격자(코퍼) 천장 한 칸: 크림 틀 + 금색 오목 + 장미꽃(빛 방향 입체감을 색으로 그림)
      var texCoffer = ctx.tex.custom(160, 160, function (g, w, h) {
        g.fillStyle = '#efe6d2'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#d9d0ba'; g.fillRect(w - 10, 0, 10, h); g.fillRect(0, h - 10, w, 10);
        var m = 14, gr = g.createLinearGradient(0, 0, w, h);
        gr.addColorStop(0, '#f3d878'); gr.addColorStop(1, '#bf9230');
        g.fillStyle = '#9a7424'; g.fillRect(m, m, w - m * 2, h - m * 2);
        g.fillStyle = gr; g.fillRect(m + 6, m + 6, w - m * 2 - 12, h - m * 2 - 12);
        g.fillStyle = '#c9a03a'; g.fillRect(m + 6, h - m - 12, w - m * 2 - 12, 6); g.fillRect(w - m - 12, m + 6, 6, h - m * 2 - 12);
        g.fillStyle = '#f7e49a'; g.fillRect(m + 6, m + 6, w - m * 2 - 12, 4); g.fillRect(m + 6, m + 6, 4, h - m * 2 - 12);
        g.fillStyle = '#a97f27'; g.beginPath(); g.arc(w / 2, h / 2, 30, 0, 6.3); g.fill();
        g.fillStyle = '#e9c456'; g.beginPath(); g.arc(w / 2, h / 2, 24, 0, 6.3); g.fill();
        for (var i = 0; i < 8; i++) { var a = i * PI / 4; g.fillStyle = i % 2 ? '#f8e7a4' : '#b88a2a'; g.beginPath(); g.ellipse(w / 2 + Math.cos(a) * 14, h / 2 + Math.sin(a) * 14, 10, 5, a, 0, 6.3); g.fill(); }
        g.fillStyle = '#a97f27'; g.beginPath(); g.arc(w / 2, h / 2, 6, 0, 6.3); g.fill();
      });
      // 글귀 띠(금 바탕 + 남색 의사 글자) — 실제 글귀는 따라 하지 않고 글자 모양 패턴만
      var texBand = ctx.tex.custom(1536, 64, function (g, w, h) {
        var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e6c35a'); gr.addColorStop(1, '#c79a35');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#27385e'; g.lineWidth = 5; g.lineCap = 'square';
        var x = 14, r = ctx.rng(5);
        while (x < w - 40) {
          var kind = (r() * 9) | 0, lw = 26, top = 14, bot = h - 14, mid = h / 2;
          g.beginPath();
          if (kind === 0) { g.moveTo(x + lw / 2, top); g.lineTo(x + lw / 2, bot); }
          else if (kind === 1) { g.moveTo(x, top); g.lineTo(x, bot); g.lineTo(x + lw, bot); }
          else if (kind === 2) { g.moveTo(x, top); g.lineTo(x + lw / 2, bot); g.lineTo(x + lw, top); }
          else if (kind === 3) { g.moveTo(x, bot); g.lineTo(x + lw / 2, top); g.lineTo(x + lw, bot); g.moveTo(x + 6, mid + 4); g.lineTo(x + lw - 6, mid + 4); }
          else if (kind === 4) { g.ellipse(x + lw / 2, mid, lw / 2, (bot - top) / 2, 0, 0, 6.3); }
          else if (kind === 5) { g.moveTo(x + lw, top); g.lineTo(x, top); g.lineTo(x, bot); g.lineTo(x + lw, bot); g.moveTo(x, mid); g.lineTo(x + lw - 4, mid); }
          else if (kind === 6) { g.moveTo(x, top); g.lineTo(x, bot); g.lineTo(x + lw, bot); g.lineTo(x + lw, top); }
          else if (kind === 7) { g.moveTo(x, bot); g.lineTo(x, top); g.lineTo(x + lw / 2, mid + 6); g.lineTo(x + lw, top); g.lineTo(x + lw, bot); }
          else { g.moveTo(x, top); g.lineTo(x + lw, top); g.lineTo(x, bot); g.lineTo(x + lw, bot); }
          g.stroke();
          x += lw + 20 + (r() < 0.13 ? 30 : 0);
        }
        g.fillStyle = '#a97f27'; g.fillRect(0, 0, w, 4); g.fillRect(0, h - 4, w, 4);
      });

      // ---------------------------------------------------------------- 바닥
      ctx.floor({ x0: -13.35, x1: 13.35, z0: -0.125, z1: 34.475, y: 0, tex: texFloor, tile: [8.9, 8.65] });
      ctx.floor({ x0: -26.7, x1: 26.7, z0: -13.45, z1: -4.55, y: 0, tex: texFloor, tile: [8.9, 8.9] });
      ctx.floor({ x0: -8.5, x1: 8.5, z0: -17.625, z1: -0.125, y: 0.012, tex: texCross, tile: [17, 17.5] });
      ctx.floor({ x0: -4.45, x1: 4.45, z0: -35.3, z1: -17.5, y: 0, tex: texFloor, tile: [8.9, 8.9] });
      // 입구 붉은 반암 원반 + 중심축 황동 표시
      ctx.cyl({ x: 0, y: 0, z: 32.0, r: 0.62, h: 0.03, seg: 20, color: 0x6e2424 });
      ctx.cyl({ x: 0, y: 0.03, z: 32.0, r: 0.66, rTop: 0.66, h: 0.012, seg: 20, color: GOLD_D, vary: 0 });
      ctx.cyl({ x: 0, y: 0.04, z: 32.0, r: 0.54, h: 0.012, seg: 20, color: 0x7e2a2a, vary: 0 });
      [26.5, 22.0, 17.5, 13.0, 8.5].forEach(function (z) { ctx.box({ x: 0, y: 0, z: z, w: 1.4, h: 0.02, d: 0.09, color: GOLD_D, vary: 0 }); });

      VC('floors');
      // ---------------------------------------------------------------- 신랑 아케이드(양쪽)
      var pilNave = [];
      [-1, 1].forEach(function (s) {
        var n = [-s, 0];
        PIERS.forEach(function (pz, pi) {
          var zc = (pz[0] + pz[1]) / 2, len = pz[1] - pz[0], hc = hw(zc);
          ctx.box({ x: s * (hc + PIER_OUT) / 2, y: 0, z: zc, w: PIER_OUT - hc, h: YS, d: len, color: CREAM });
          // 걸레받이/받침
          ctx.box({ x: s * (hc + PIER_OUT) / 2, y: 0, z: zc, w: PIER_OUT - hc + 0.22, h: 0.55, d: len + 0.22, color: CREAM_D });
          // 신랑 쪽 벽기둥 2개 + 가운데 벽감
          if (pi > 0) {
            var off = len / 2 - 0.62;
            pilaster(s * hc, zc, n, -off, 10.4); pilaster(s * hc, zc, n, off, 10.4);
            niche(s * hc, zc, n, 0, 1.2, 1.5, 3.3, 'saint');
            niche(s * hc, zc, n, 0, 6.0, 1.2, 2.3, pi % 2 ? 'mary' : 'saint');
            // 다색 대리석 상감(붉은/녹색 띠)
            wbox(s * hc, zc, n, -off + 0.0, 0.34, 1.3, 0.28, 7.6, 0.05, (pi + s) % 2 ? RED : GREEN);
            wbox(s * hc, zc, n, off, 0.34, 1.3, 0.28, 7.6, 0.05, (pi + s) % 2 ? GREEN : RED);
          } else {
            pilaster(s * hc, zc, n, -len / 2 + 0.62, 10.4);
          }
        });
        // 아치 칸
        ARCHZ.forEach(function (zc) {
          var hc = hw(zc), thick = PIER_OUT - hc, xm = s * (hc + PIER_OUT) / 2;
          var sh = new T.Shape(); var sp = 2.25;
          sh.moveTo(-sp, 6.25); sh.lineTo(-sp, YS); sh.lineTo(sp, YS); sh.lineTo(sp, 6.25); sh.absarc(0, 6.25, sp, 0, PI, false);
          extrude(sh, thick, CREAM, s > 0 ? hc : -PIER_OUT, 0, zc, PI / 2);
          ctx.arch({ x: xm, z: zc, y: 6.25, span: 4.5, rise: 2.25, t: 0.4, depth: thick, axis: 'z', type: 'round', color: CREAM_D });
          // 신랑 쪽/측랑 쪽 아치 테두리 몰딩
          ctx.arch({ x: s * (hc - 0.04), z: zc, y: 6.25, span: 4.9, rise: 2.45, t: 0.26, depth: 0.22, axis: 'z', type: 'round', color: GOLD_D });
          ctx.arch({ x: s * (PIER_OUT + 0.04), z: zc, y: 6.25, span: 4.9, rise: 2.45, t: 0.26, depth: 0.22, axis: 'z', type: 'round', color: CREAM_D });
          // 쐐기돌
          ctx.box({ x: s * (hc - 0.12), y: 8.55, z: zc, w: 0.22, h: 0.5, d: 0.5, color: GOLD_D });
        });
        // 엔타블러처: 신랑 전체(테이퍼 구간 + 직선 구간)
        entablature(s * hw(34.5), 34.5, s * hw(1.95), 1.95, n, texBand);
        entablature(s * hw(1.95), 1.95, s * 4.25, -2.5, n, texBand);
        // 측랑 쪽 벽(아치 위 코니스)
        ctx.cornice({ x0: s * PIER_OUT, z0: 34.5, x1: s * PIER_OUT, z1: 1.95, y: 11.6, h: 0.3, depth: 0.3, facing: [s, 0], color: CREAM_D });
      });

      // 신랑 쪽 돔 피어 면(x=±4.25, z -2.5..1.95)의 벽기둥 + 성 베드로 청동 좌상
      [-1, 1].forEach(function (s) {
        var n = [-s, 0];
        pilaster(s * 4.25, 0, n, 0.6, 10.4);
        wbox(s * 4.25, 0, n, -1.0, 0.34, 1.3, 0.28, 7.6, 0.05, RED);
      });

      VC('nave arcade');
      // ---------------------------------------------------------------- 입구 벽(문 5개 + 큰 창)
      (function () {
        var sh = new T.Shape(), i;
        sh.moveTo(-11.6, 0); sh.lineTo(11.6, 0); sh.lineTo(11.6, 9.0); sh.lineTo(7.0, 9.0); sh.lineTo(7.0, YS); sh.lineTo(4.75, YS);
        for (i = 0; i <= 24; i++) { var th = i / 24 * PI; sh.lineTo(4.75 * Math.cos(th), YS + RISE * Math.sin(th)); }
        sh.lineTo(-7.0, YS); sh.lineTo(-7.0, 9.0); sh.lineTo(-11.6, 9.0);
        sh.holes.push(archHolePath(0, 0, 2.6, 4.2)); sh.holes.push(archHolePath(-3.0, 0, 2.2, 3.9)); sh.holes.push(archHolePath(3.0, 0, 2.2, 3.9));
        sh.holes.push(archHolePath(-8.98, 0, 2.2, 3.9)); sh.holes.push(archHolePath(8.98, 0, 2.2, 3.9));
        sh.holes.push(archHolePath(0, 13.2, 3.0, 1.3));
        extrude(sh, 0.7, CREAM, 0, 0, ZE, 0);
        // 청동 문(닫힘) + 가운데 문은 열려 바깥 빛이 보임
        [[-3.0, 2.2, 3.9], [3.0, 2.2, 3.9], [-8.98, 2.2, 3.9], [8.98, 2.2, 3.9]].forEach(function (d) {
          ctx.box({ x: d[0], y: 0, z: ZE + 0.28, w: d[1] - 0.04, h: d[2], d: 0.16, color: BRONZE });
          for (var r = 0; r < 2; r++) for (var c = -1; c <= 1; c += 2) ctx.box({ x: d[0] + c * 0.46, y: 0.35 + r * 1.65, z: ZE + 0.19, w: 0.78, h: 1.4, d: 0.06, color: 0x58422b });
          // 문 위 반원 창(청동 격자)
          var arcs = ChurchKit.profilePts('round', d[1] / 2, d[1] / 2, 8);
          for (var q = 0; q < arcs.length - 1; q++) ctx.box({ x: d[0] + (arcs[q][0] + arcs[q + 1][0]) / 2, y: d[2] + (arcs[q][1] + arcs[q + 1][1]) / 2 - 0.05, z: ZE + 0.28, w: 0.3, h: 0.3, d: 0.16, color: BRONZE, ry: 0 });
          ctx.box({ x: d[0], y: d[2], z: ZE + 0.28, w: d[1] - 0.2, h: d[1] / 2 * 0.9, d: 0.1, color: 0x2e2820 });
          ctx.sphere({ x: d[0] - 0.12, y: 1.5, z: ZE + 0.14, r: 0.07, color: GOLD, w: 6, h: 4 });
          ctx.sphere({ x: d[0] + 0.12, y: 1.5, z: ZE + 0.14, r: 0.07, color: GOLD, w: 6, h: 4 });
        });
        // 가운데 문: 바깥 빛(유리 면, 낮엔 밝고 밤엔 어둡게) + 문틀
        paneGrid([-1.3, 0, ZE + 0.45], [2.6, 0, 0], [0, 4.2, 0], 1, 1, [0xfff6dc], [0, 2, 20], null);
        var arcs2 = ChurchKit.profilePts('round', 1.3, 1.3, 10), ap = [];
        for (var k = 0; k <= 10; k++) ap.push([arcs2[k][0], 4.2 + arcs2[k][1]]);
        for (k = 0; k < 10; k++) glass.addTris([0, 4.2, ZE + 0.45, ap[k][0], ap[k][1], ZE + 0.45, ap[k + 1][0], ap[k + 1][1], ZE + 0.45], 0xfff6dc, [0, 3, 20]);
        ctx.box({ x: -1.45, y: 0, z: ZE + 0.2, w: 0.3, h: 4.4, d: 0.5, color: CREAM_D }); ctx.box({ x: 1.45, y: 0, z: ZE + 0.2, w: 0.3, h: 4.4, d: 0.5, color: CREAM_D });
        // 큰 창(입구 위): 유리 + 틀
        paneGrid([-1.5, 13.2, ZE + 0.36], [3.0, 0, 0], [0, 1.3, 0], 5, 3, GLASS_PALE, [0, 14, 0], [0, 0, 0.05]);
        var arcs3 = ChurchKit.profilePts('round', 1.5, 1.5, 12);
        for (k = 0; k < 12; k++) {
          var a0 = arcs3[k], a1 = arcs3[k + 1];
          glass.addTris([0, 14.5, ZE + 0.36, a0[0] * 0.95, 14.5 + a0[1] * 0.95, ZE + 0.36, a1[0] * 0.95, 14.5 + a1[1] * 0.95, ZE + 0.36], GLASS_PALE[k % 4], [0, 14, 0], { vary: 0.05 });
        }
        ctx.addWindowBeam({ x: 0, y: 14.6, z: ZE - 0.1, face: [0, -1], w: 2.6, h: 2.6, colors: [0xfff1c0, 0xffe39a, 0xfff6dc], reach: 12 });
        // 입구 벽 문 틀 쐐기 + 벽기둥(양 끝)
        pilaster(-hw(34.5), ZE, [1, 0], 0, 10.4);
        // 엔타블러처
        entablature(-4.75, ZE, 4.75, ZE, [0, -1], texBand);
        entablature(7.0, ZE, 10.95, ZE, [0, -1], null, 7.2);
      })();

      VC('entrance');
      // ---------------------------------------------------------------- 궁륭(코퍼 원통) 빌더
      function barrel(o) {
        var N = 28, ax = o.axis === 'x' ? 'x' : 'z', aF = o.aF, c = o.c, y0 = o.y0, rise = o.rise, tile = o.tile || 1.25;
        var edges = [o.t0, o.t1];
        (o.lun || []).forEach(function (l) { edges.push(l.t - l.w, l.t + l.w); });
        edges.sort(function (a, b) { return a - b; });
        var uni = [edges[0]];
        for (var q = 1; q < edges.length; q++) if (edges[q] - uni[uni.length - 1] > 1e-3) uni.push(edges[q]);
        var br = [];
        for (q = 0; q < uni.length - 1; q++) {
          var len = uni[q + 1] - uni[q], nn = Math.max(1, Math.ceil(len / 0.95));
          for (var k = 0; k < nn; k++) br.push(uni[q] + len * k / nn);
        }
        br.push(uni[uni.length - 1]);
        function pt(t, j) {
          var phi = PI * j / N, a = aF(t), p = -a * Math.cos(phi), h = rise * Math.sin(phi);
          return ax === 'z' ? [c + p, y0 + h, t] : [t, y0 + h, c + p];
        }
        function outN(t, j) { // 바깥쪽 단위 법선(월드)
          var phi = PI * j / N, a = aF(t), p = -a * Math.cos(phi), h = rise * Math.sin(phi);
          var np = p / (a * a), nh = h / (rise * rise), l = Math.sqrt(np * np + nh * nh) || 1; np /= l; nh /= l;
          return ax === 'z' ? [np, nh, 0] : [0, nh, np];
        }
        function arcLen(t, j) { var a = aF(t), s = 0, m = 6, i; for (i = 0; i < j * m; i++) { var ph = PI * (i + 0.5) / (N * m); s += Math.sqrt(Math.pow(a * Math.sin(ph), 2) + Math.pow(rise * Math.cos(ph), 2)) * PI / (N * m); } return s; }
        var pos = [], nor = [], uv = [], idx = [];
        var isHole = function (bi, j) {
          var tm = (br[bi] + br[bi + 1]) / 2, L = o.lun || [];
          for (var i = 0; i < L.length; i++) if (tm > L[i].t - L[i].w && tm < L[i].t + L[i].w && ((j >= 1 && j <= 5) || (j >= N - 6 && j <= N - 2))) return true;
          return false;
        };
        for (var bi = 0; bi < br.length - 1; bi++) for (var j = 0; j < N; j++) {
          if (isHole(bi, j)) continue;
          var cs = [[br[bi], j], [br[bi + 1], j], [br[bi + 1], j + 1], [br[bi], j + 1]];
          var vs = cs.map(function (cc) { return pt(cc[0], cc[1]); }), ns = cs.map(function (cc) { var o2 = outN(cc[0], cc[1]); return [-o2[0], -o2[1], -o2[2]]; });
          var e1 = [vs[1][0] - vs[0][0], vs[1][1] - vs[0][1], vs[1][2] - vs[0][2]], e2 = [vs[3][0] - vs[0][0], vs[3][1] - vs[0][1], vs[3][2] - vs[0][2]];
          var gn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
          var flip = gn[0] * ns[0][0] + gn[1] * ns[0][1] + gn[2] * ns[0][2] < 0;
          var base = pos.length / 3;
          for (var v = 0; v < 4; v++) {
            pos.push(vs[v][0], vs[v][1], vs[v][2]); nor.push(ns[v][0], ns[v][1], ns[v][2]);
            uv.push(arcLen(cs[v][0], cs[v][1]) / tile, cs[v][0] / tile);
          }
          if (!flip) idx.push(base, base + 1, base + 2, base, base + 2, base + 3); else idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
        }
        var geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3));
        geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(nor), 3));
        geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(uv), 2));
        geo.setIndex(idx);
        var mat = ctx.mats.lambert({ tex: o.tex, color: 0xffffff, side: T.DoubleSide });
        ctx.mesh(geo, mat);
        // 채광창(진짜 구멍) : 측면 두께 + 뒤쪽 유리
        (o.lun || []).forEach(function (l) {
          [1, -1].forEach(function (sd) {
            var jA = sd > 0 ? N - 6 : 1, jB = sd > 0 ? N - 1 : 6, tA = l.t - l.w, tB = l.t + l.w, d = 0.5;
            function I(t, jj) { return pt(t, jj); }
            function Ob(t, jj, dd) { var n2 = outN(t, jj), p = pt(t, jj); return [p[0] + n2[0] * dd, p[1] + n2[1] * dd, p[2] + n2[2] * dd]; }
            var mid = Ob((tA + tB) / 2, (jA + jB) / 2, d / 2);
            var jj;
            solid.addQuad(I(tA, jA), I(tB, jA), Ob(tB, jA, d), Ob(tA, jA, d), CREAM, mid);
            solid.addQuad(I(tA, jB), I(tB, jB), Ob(tB, jB, d), Ob(tA, jB, d), CREAM_D, mid);
            for (jj = jA; jj < jB; jj++) {
              solid.addQuad(I(tA, jj), I(tA, jj + 1), Ob(tA, jj + 1, d), Ob(tA, jj, d), CREAM, mid);
              solid.addQuad(I(tB, jj), I(tB, jj + 1), Ob(tB, jj + 1, d), Ob(tB, jj, d), CREAM, mid);
            }
            // 유리
            var cols = 3, rows = jB - jA, hintIn = I((tA + tB) / 2, jA);
            hintIn = [hintIn[0], hintIn[1] - 3, hintIn[2]];
            for (var rr = 0; rr < rows; rr++) for (var cc = 0; cc < cols; cc++) {
              var t0 = tA + (tB - tA) * cc / cols, t1 = tA + (tB - tA) * (cc + 1) / cols, j0 = jA + rr, j1 = jA + rr + 1;
              var qd = [Ob(t0, j0, d - 0.02), Ob(t1, j0, d - 0.02), Ob(t1, j1, d - 0.02), Ob(t0, j1, d - 0.02)], mc = [0, 0, 0];
              qd.forEach(function (p) { mc[0] += p[0] / 4; mc[1] += p[1] / 4; mc[2] += p[2] / 4; });
              var sq = qd.map(function (p) { return [mc[0] + (p[0] - mc[0]) * 0.86, mc[1] + (p[1] - mc[1]) * 0.86, mc[2] + (p[2] - mc[2]) * 0.86]; });
              glass.addQuad(sq[0], sq[1], sq[2], sq[3], GLASS_PALE[(cc + rr * 2) % 4], hintIn, { vary: 0.05 });
            }
            var bk = [Ob(tA, jA, d + 0.02), Ob(tB, jA, d + 0.02), Ob(tB, jB, d + 0.02), Ob(tA, jB, d + 0.02)];
            solid.addQuad(bk[0], bk[1], bk[2], bk[3], 0x2b231f, hintIn, { vary: 0 });
            // 빛줄기: 창 중심(안쪽 면), 실내를 향한 수평 법선
            var cpt = I((tA + tB) / 2, (jA + jB) / 2);
            var face = ax === 'z' ? [sd > 0 ? -1 : 1, 0] : [0, sd > 0 ? -1 : 1];
            if (o.beams !== false) ctx.addWindowBeam({ x: cpt[0], y: cpt[1], z: cpt[2], face: face, w: (tB - tA) * 0.9, h: 2.2, colors: [0xfff1c0, 0xffe39a, 0xfff6dc], reach: o.beamReach || 8.5 });
          });
        });
      }

      // ---- 신랑 궁륭(입구 ~ 교차부 아치면) ----
      barrel({ axis: 'z', t0: -2.5, t1: ZE, c: 0, aF: function (z) { return hw(z); }, y0: YS, rise: RISE, tex: texCoffer, tile: 1.3, lun: ARCHZ.map(function (z) { return { t: z, w: 1.2 }; }) });
      // 횡단 늑골(칸 경계)
      [8.525, 17.175, 25.825].forEach(function (z) { ctx.vaultRib({ axis: 'z', center: 0, pos: z, y: YS, a: hw(z) + 0.15, rise: RISE + 0.15, profile: 'round', t: 0.42, d: 0.55, color: CREAM }); ctx.vaultRib({ axis: 'z', center: 0, pos: z, y: YS, a: hw(z) + 0.15, rise: RISE + 0.15, profile: 'round', t: 0.12, d: 0.7, color: GOLD }); });

      // ---- 익랑(동·서) 궁륭 + 후진 팔 궁륭 ----
      [-1, 1].forEach(function (s) {
        barrel({ axis: 'x', t0: s > 0 ? 6.5 : -21.25, t1: s > 0 ? 21.25 : -6.5, c: CZ, aF: function () { return 4.25; }, y0: YS, rise: RISE, tex: texCoffer, tile: 1.3, lun: [s * 13.0, s * 17.3].map(function (t) { return { t: t, w: 1.1 }; }), beamReach: 8 });
      });
      barrel({ axis: 'z', t0: -30.25, t1: -15.5, c: 0, aF: function () { return 4.25; }, y0: YS, rise: RISE, tex: texCoffer, tile: 1.3, lun: [-18.6, -26.5].map(function (t) { return { t: t, w: 1.1 }; }), beamReach: 8 });

      VC('vaults');
      // ---------------------------------------------------------------- 측랑(작은 돔형 궁륭 + 외벽 + 경당)
      [-1, 1].forEach(function (s) {
        ctx.vault({ type: 'sail', x0: s > 0 ? PIER_OUT : -AISLE_OUT, x1: s > 0 ? AISLE_OUT : -PIER_OUT, z0: 1.95, z1: ZE, y: 7.6, rise: 1.5, bays: [1, 7], color: 0xefe6d2 });
        for (var b = 0; b < 7; b++) { // 각 작은 돔의 천창(유리)
          var zc = 1.95 + (ZE - 1.95) / 7 * (b + 0.5), xc = s * (PIER_OUT + AISLE_OUT) / 2;
          glass.addQuad([xc - 0.45, 9.05, zc - 0.45], [xc + 0.45, 9.05, zc - 0.45], [xc + 0.45, 9.05, zc + 0.45], [xc - 0.45, 9.05, zc + 0.45], 0xfff1cc, [xc, 5, zc]);
          ctx.cyl({ x: xc, y: 8.98, z: zc, r: 0.75, rTop: 0.6, h: 0.1, seg: 8, color: GOLD_D });
        }
        // 외벽(경당 3곳 개구부)
        var sh = new T.Shape();
        sh.moveTo(1.95, 0); sh.lineTo(ZE, 0); sh.lineTo(ZE, 9.0); sh.lineTo(1.95, 9.0); // x축 = z(월드), 압출 방향 = x
        [30.15, 21.5, 12.85].forEach(function (zc) {
          var p = new T.Path(); p.moveTo(zc - 1.6, 0.0); p.lineTo(zc + 1.6, 0.0); p.lineTo(zc + 1.6, 4.1); p.absarc(zc, 4.1, 1.6, 0, PI, false); p.lineTo(zc - 1.6, 0.0); sh.holes.push(p);
        });
        var g = new T.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false, curveSegments: 10 });
        // 로컬: (sx=월드 z, sy=높이, 압출=+x 로 변환)
        var m4 = new T.Matrix4(); m4.set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
        g.applyMatrix4(m4);
        if (s < 0) { g.scale(-1, 1, 1); }
        var gi = g.index ? g.toNonIndexed() : g;
        if (s > 0) { // 축 교환(반사)으로 뒤집힌 면 순서 복구
          var pa = gi.attributes.position.array;
          for (var ti = 0; ti < pa.length; ti += 9) { for (var cc = 0; cc < 3; cc++) { var tmp = pa[ti + 3 + cc]; pa[ti + 3 + cc] = pa[ti + 6 + cc]; pa[ti + 6 + cc] = tmp; } }
        }
        solid.add(gi, CREAM, { x: s * AISLE_OUT, y: 0, z: 0, flat: true });
        // 경당 내부(작은 방): 바닥·옆·뒤·천장
        [30.15, 21.5, 12.85].forEach(function (zc, ci) {
          var xa = s * AISLE_OUT, xb = s * (AISLE_OUT + 2.9), hz = 1.9, hh = 5.9, inC = [s * (AISLE_OUT + 1.5), 2.2, zc];
          solid.addQuad([xa, 0.01, zc - hz], [xb, 0.01, zc - hz], [xb, 0.01, zc + hz], [xa, 0.01, zc + hz], 0xd9cdb4, inC);
          solid.addQuad([xb, 0, zc - hz], [xb, hh, zc - hz], [xb, hh, zc + hz], [xb, 0, zc + hz], ci === 0 ? 0x6a5a52 : 0xcfbf9f, inC);
          solid.addQuad([xa, 0, zc - hz], [xb, 0, zc - hz], [xb, hh, zc - hz], [xa, hh, zc - hz], CREAM_D, inC);
          solid.addQuad([xa, 0, zc + hz], [xb, 0, zc + hz], [xb, hh, zc + hz], [xa, hh, zc + hz], CREAM_D, inC);
          solid.addQuad([xa, hh, zc - hz], [xb, hh, zc - hz], [xb, hh, zc + hz], [xa, hh, zc + hz], 0xe9dfc9, inC);
          // 제대 + 조각
          ctx.box({ x: s * (AISLE_OUT + 2.3), y: 0, z: zc, w: 0.9, h: 1.0, d: 2.2, color: WHITE });
          ctx.box({ x: s * (AISLE_OUT + 2.3), y: 1.0, z: zc, w: 1.0, h: 0.08, d: 2.3, color: GOLD_D });
          if (ci === 0) { // 피에타 경당: 흰 조각군
            ctx.box({ x: s * (AISLE_OUT + 2.6), y: 0, z: zc, w: 1.0, h: 1.3, d: 1.2, color: 0xe6e0d4 });
            ctx.cone({ x: s * (AISLE_OUT + 2.6), y: 1.3, z: zc, r: 0.5, h: 1.3, seg: 8, color: WHITE });
            ctx.sphere({ x: s * (AISLE_OUT + 2.6), y: 2.7, z: zc, r: 0.18, color: WHITE, w: 8, h: 6 });
            ctx.box({ x: s * (AISLE_OUT + 2.45), y: 1.35, z: zc, w: 0.5, h: 0.22, d: 1.25, color: WHITE, rx: 0 });
          } else ctx.statue({ x: s * (AISLE_OUT + 2.6), y: 1.1, z: zc, h: 2.2, kind: ci === 1 ? 'saint' : 'mary', ry: 0 });
          // 난간(걸을 수 없음을 보이는 낮은 대리석 난간)
          ctx.box({ x: s * (AISLE_OUT + 0.15), y: 0, z: zc, w: 0.25, h: 0.28, d: 3.3, color: WHITE });
          for (var bz = -1.5; bz <= 1.5; bz += 0.3) ctx.cyl({ x: s * (AISLE_OUT + 0.15), y: 0.28, z: zc + bz, r: 0.05, rTop: 0.04, h: 0.62, seg: 6, color: WHITE });
          ctx.box({ x: s * (AISLE_OUT + 0.15), y: 0.9, z: zc, w: 0.22, h: 0.1, d: 3.4, color: WHITE });
          ctx.addCollider({ x0: Math.min(s * AISLE_OUT, s * (AISLE_OUT + 3)), x1: Math.max(s * AISLE_OUT, s * (AISLE_OUT + 3)), z0: zc - 2.0, z1: zc + 2.0 });
          // 경당 벽 안 은은한 빛(창 대신)
          glass.addQuad([xb - s * 0.02, 2.0, zc - 0.5], [xb - s * 0.02, 2.0, zc + 0.5], [xb - s * 0.02, 4.4, zc + 0.5], [xb - s * 0.02, 4.4, zc - 0.5], 0xffe8b0, inC);
        });
        // 측랑 외벽 하단 걸레받이 + 코니스
        ctx.cornice({ x0: s * AISLE_OUT, z0: ZE, x1: s * AISLE_OUT, z1: 1.95, y: 7.2, h: 0.4, depth: 0.3, facing: [-s, 0], color: CREAM_D });
        ctx.cornice({ x0: s * AISLE_OUT, z0: ZE, x1: s * AISLE_OUT, z1: 1.95, y: 0, h: 0.5, depth: 0.15, facing: [-s, 0], color: CREAM_D });
        // 충돌: 외벽
        ctx.addCollider({ x0: s > 0 ? AISLE_OUT : -AISLE_OUT - 0.7, x1: s > 0 ? AISLE_OUT + 0.7 : -AISLE_OUT, z0: 1.95, z1: ZE + 0.7 });
        // 신랑 피어 충돌
        PIERS.forEach(function (pz) { var hc = hw((pz[0] + pz[1]) / 2); ctx.addCollider({ x0: s > 0 ? hc : -PIER_OUT, x1: s > 0 ? PIER_OUT : -hc, z0: pz[0], z1: pz[1] }); });
      });
      ctx.addCollider({ x0: -12, x1: 12, z0: ZE, z1: ZE + 0.8 });

      VC('aisles');
      // 측랑 입구 성수대 + 입구 인근
      [-1, 1].forEach(function (s) { ctx.holyFont({ x: s * (hw(28.6) - 0.5), z: 28.6 }); });

      // ---------------------------------------------------------------- 벽감(아디쿨라)
      function niche(cx, cz, n, u, y, w, h, kind) {
        var tcol = 0x8d8372;
        wbox(cx, cz, n, u, 0.045, y, w, h, 0.09, tcol);
        wbox(cx, cz, n, u - w / 2 - 0.09, 0.15, y - 0.12, 0.18, h + 0.4, 0.3, CREAM_D);
        wbox(cx, cz, n, u + w / 2 + 0.09, 0.15, y - 0.12, 0.18, h + 0.4, 0.3, CREAM_D);
        wbox(cx, cz, n, u, 0.15, y + h + 0.06, w + 0.54, 0.22, 0.3, GOLD_D);
        // 반원 머리 + 지붕돌
        var sp = onWall(cx, cz, n, u, 0.1);
        ctx.arch({ x: sp[0], y: y + h * 0.78, z: sp[1], span: w + 0.1, rise: w * 0.4, t: 0.14, depth: 0.16, axis: Math.abs(n[0]) > 0.5 ? 'z' : 'x', type: 'round', color: CREAM });
        wbox(cx, cz, n, u, 0.22, y - 0.1, w + 0.3, 0.2, 0.44, CREAM);
        var p = onWall(cx, cz, n, u, 0.34);
        ctx.statue({ x: p[0], y: y + 0.08, z: p[1], h: h * 0.76, kind: kind, ry: Math.atan2(n[0], n[1]), robe: 0xf1ece2, mantle: 0xe2dccf, halo: false });
      }

      VC('fonts');
      // ---------------------------------------------------------------- 교차부: 돔 피어 4개(모서리 깎음)
      function prism(poly, y0, y1, color) {
        var cx0 = 0, cz0 = 0, i, n = poly.length;
        poly.forEach(function (p) { cx0 += p[0] / n; cz0 += p[1] / n; });
        for (i = 0; i < n; i++) {
          var a = poly[i], b = poly[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.sqrt(dx * dx + dz * dz) || 1;
          var nx = dz / l, nz = -dx / l, mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
          if (nx * (mx - cx0) + nz * (mz - cz0) < 0) { nx = -nx; nz = -nz; }
          solid.addQuad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], color, [mx + nx, (y0 + y1) / 2, mz + nz]);
        }
        var tr = [];
        for (i = 1; i < n - 1; i++) tr.push(poly[0][0], y1, poly[0][1], poly[i][0], y1, poly[i][1], poly[i + 1][0], y1, poly[i + 1][1]);
        solid.addTris(tr, color, [cx0, y1 + 3, cz0]);
      }
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (sg) {
        var sx = sg[0], near = sg[1] > 0;
        var poly;
        if (near) poly = [[sx * 4.25, 1.95], [sx * 10.95, 1.95], [sx * 10.95, -4.75], [sx * 6.5, -4.75], [sx * 4.25, -2.5]];
        else poly = [[sx * 4.25, -19.95], [sx * 10.95, -19.95], [sx * 10.95, -13.25], [sx * 6.5, -13.25], [sx * 4.25, -15.5]];
        prism(poly, 0, YS, CREAM);
        // 충돌
        if (near) {
          ctx.addCollider({ x0: Math.min(sx * 4.25, sx * 10.95), x1: Math.max(sx * 4.25, sx * 10.95), z0: -2.5, z1: 1.95 });
          ctx.addCollider({ x0: Math.min(sx * 6.5, sx * 10.95), x1: Math.max(sx * 6.5, sx * 10.95), z0: -4.75, z1: -2.5 });
          for (var q = 0; q <= 4; q++) ctx.addCollider({ x: sx * (4.25 + 2.25 * q / 4), z: -2.5 - 2.25 * q / 4, r: 0.42 });
        } else {
          ctx.addCollider({ x0: Math.min(sx * 4.25, sx * 10.95), x1: Math.max(sx * 4.25, sx * 10.95), z0: -19.95, z1: -15.5 });
          ctx.addCollider({ x0: Math.min(sx * 6.5, sx * 10.95), x1: Math.max(sx * 6.5, sx * 10.95), z0: -15.5, z1: -13.25 });
          for (q = 0; q <= 4; q++) ctx.addCollider({ x: sx * (4.25 + 2.25 * q / 4), z: -15.5 + 2.25 * q / 4, r: 0.42 });
        }
        // 깎은 면(chamfer): 중심을 향함
        var c0 = near ? [sx * 4.25, -2.5] : [sx * 4.25, -15.5], c1 = near ? [sx * 6.5, -4.75] : [sx * 6.5, -13.25];
        var cm = [(c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2], nrm = [CX - cm[0], CZ - cm[1]], nl = Math.sqrt(nrm[0] * nrm[0] + nrm[1] * nrm[1]);
        nrm = [nrm[0] / nl, nrm[1] / nl];
        pilaster(cm[0], cm[1], nrm, -1.2, 10.4); pilaster(cm[0], cm[1], nrm, 1.2, 10.4);
        wbox(cm[0], cm[1], nrm, -0.62, 0.34, 1.2, 0.3, 7.6, 0.05, RED); wbox(cm[0], cm[1], nrm, 0.62, 0.34, 1.2, 0.3, 7.6, 0.05, GREEN);
        niche(cm[0], cm[1], nrm, 0, 0.9, 1.35, 4.2, ['saint', 'mary', 'saint', 'saint'][((near ? 0 : 1) * 2 + (sx > 0 ? 0 : 1)) % 4]);
        // 유물 발코니(로지아)
        var bp = onWall(cm[0], cm[1], nrm, 0, 0.3);
        wbox(cm[0], cm[1], nrm, 0, 0.32, 6.5, 2.0, 0.28, 0.64, GOLD_D);
        wbox(cm[0], cm[1], nrm, 0, 0.1, 6.78, 1.5, 2.6, 0.1, 0x6b5a4c);
        wbox(cm[0], cm[1], nrm, -0.9, 0.2, 6.78, 0.16, 2.9, 0.2, CREAM); wbox(cm[0], cm[1], nrm, 0.9, 0.2, 6.78, 0.16, 2.9, 0.2, CREAM);
        wbox(cm[0], cm[1], nrm, 0, 0.2, 9.68, 2.0, 0.22, 0.32, GOLD_D);
        // 코니스(깎은 면을 따라)
        entablature(c0[0], c0[1], c1[0], c1[1], nrm, texBand);
        // 이어지는 면(신랑/익랑/후진 쪽 피어 면): 엔타블러처
        if (near) {
          entablature(c1[0], c1[1], sx * 10.95, -4.75, [0, -1], texBand); // 익랑 쪽(북/남 벽면 시작)
        } else {
          entablature(c1[0], c1[1], sx * 10.95, -13.25, [0, 1], texBand);
          entablature(sx * 4.25, -19.95, c0[0], c0[1], [-sx, 0], texBand);
        }
        // 익랑으로 이어지는 벽 쪽 벽기둥
        if (near) pilaster(sx * 8.8, -4.75, [0, -1], 0, 10.4);
        else pilaster(sx * 8.8, -13.25, [0, 1], 0, 10.4);
      });

      VC('domepiers');
      // ---------------------------------------------------------------- 4개의 대아치(교차부 면) + 펜던티브
      ctx.arch({ x: 0, z: -2.5, y: YS, span: 8.5, rise: RISE, t: 0.5, depth: 0.6, axis: 'x', type: 'round', color: GOLD_D });
      ctx.arch({ x: 0, z: -15.5, y: YS, span: 8.5, rise: RISE, t: 0.5, depth: 0.6, axis: 'x', type: 'round', color: GOLD_D });
      ctx.arch({ x: 6.5, z: -9, y: YS, span: 8.5, rise: RISE, t: 0.5, depth: 0.6, axis: 'z', type: 'round', color: GOLD_D });
      ctx.arch({ x: -6.5, z: -9, y: YS, span: 8.5, rise: RISE, t: 0.5, depth: 0.6, axis: 'z', type: 'round', color: GOLD_D });

      var RING_R = 7.67, RING_Y = 19.6;
      (function pendentives() {
        var N = 96, NT = 6, strips = [];
        function loft(psi, t) {
          var sa = Math.abs(((psi + PI / 4) % (PI / 2) + PI / 2) % (PI / 2) - PI / 4); // 가까운 축과의 각 0..45도
          var r0 = Math.tan(sa) <= 4.25 / 6.5 ? 6.5 / Math.cos(sa) : 7.6 / Math.cos(sa - PI / 4);
          var e = t * t * (3 - 2 * t), r = r0 + (RING_R - r0) * e, y = YS + t * (RING_Y - YS);
          return { r: r, y: y, w: r * Math.sin(sa) };
        }
        for (var i = 0; i < N; i++) {
          var psi = i / N * PI * 2, tmin = 0;
          for (var s = 0; s <= 200; s++) {
            var t = s / 200, p = loft(psi, t), arch = p.w < 4.25 ? YS + RISE * Math.sqrt(1 - (p.w / 4.25) * (p.w / 4.25)) : -1;
            if (p.y >= arch) { tmin = t; break; }
            tmin = 1;
          }
          strips.push({ psi: psi, tmin: tmin });
        }
        for (i = 0; i < N; i++) {
          var A = strips[i], B = strips[(i + 1) % N];
          for (var j = 0; j < NT; j++) {
            var ta0 = A.tmin + (1 - A.tmin) * j / NT, ta1 = A.tmin + (1 - A.tmin) * (j + 1) / NT, tb0 = B.tmin + (1 - B.tmin) * j / NT, tb1 = B.tmin + (1 - B.tmin) * (j + 1) / NT;
            function V(st, tt) { var p = loft(st.psi + (st === B && B.psi < A.psi ? PI * 2 : 0), tt); return [CX + p.r * Math.cos(st.psi), p.y, CZ + p.r * Math.sin(st.psi)]; }
            var a = V(A, ta0), b = V(B, tb0), c = V(B, tb1), d = V(A, ta1);
            var col = (j % 2 === 0) ? BLUE : ctx.shade(BLUE, 1.1);
            solid.addQuad(a, b, c, d, col, [CX, 14, CZ], { vary: 0.03 });
          }
        }
        // 모서리 4곳 원형 모자이크(복음사가 자리): 금색 원판 + 푸른 안쪽
        [1, 3, 5, 7].forEach(function (k) {
          var psi = k * PI / 4, p = loft(psi, 0.55), px = CX + p.r * Math.cos(psi), pz = CZ + p.r * Math.sin(psi);
          var nrm = new T.Vector3(-Math.cos(psi), 0.12, -Math.sin(psi)).normalize();
          var q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), nrm);
          solid.add(Geo.cyl(20, 1), GOLD_D, { x: px + nrm.x * 0.02, y: p.y, z: pz + nrm.z * 0.02, q: q, sx: 1.62, sy: 0.07, sz: 1.62, flat: true, vary: 0 });
          solid.add(Geo.cyl(20, 1), GOLD, { x: px + nrm.x * 0.07, y: p.y + nrm.y * 0.07, z: pz + nrm.z * 0.07, q: q, sx: 1.45, sy: 0.05, sz: 1.45, flat: true, vary: 0 });
          solid.add(Geo.cyl(16, 1), 0x34548a, { x: px + nrm.x * 0.12, y: p.y + nrm.y * 0.12, z: pz + nrm.z * 0.12, q: q, sx: 1.1, sy: 0.05, sz: 1.1, flat: true, vary: 0 });
          solid.add(Geo.cyl(10, 1), 0xf0d9b0, { x: px + nrm.x * 0.18, y: p.y + nrm.y * 0.18 + 0.1, z: pz + nrm.z * 0.18, q: q, sx: 0.5, sy: 0.05, sz: 0.5, flat: true, vary: 0 }); // 얼굴
          solid.add(Geo.cyl(10, 0.6), 0xb04a3a, { x: px + nrm.x * 0.18, y: p.y + nrm.y * 0.18 - 0.35, z: pz + nrm.z * 0.18, q: q, sx: 0.75, sy: 0.05, sz: 0.75, flat: true, vary: 0 }); // 옷
        });
      })();

      VC('arches+pend');
      // 돔 아랫단 글귀 띠(원통) + 몰딩
      function bandArc(cx, cz, r, a0, a1, y0, y1, tex, tileLen, inward) {
        var segs = Math.max(8, Math.round(Math.abs(a1 - a0) / (PI * 2) * 64)), pos = [], nor = [], uv = [], idx = [];
        for (var i = 0; i <= segs; i++) {
          var a = a0 + (a1 - a0) * i / segs, c = Math.cos(a), s = Math.sin(a), nx = inward ? -c : c, nz = inward ? -s : s;
          pos.push(cx + c * r, y0, cz + s * r, cx + c * r, y1, cz + s * r); nor.push(nx, 0, nz, nx, 0, nz);
          uv.push(r * (a - a0) / tileLen, 0, r * (a - a0) / tileLen, 1);
          if (i < segs) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        }
        var geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3));
        geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(nor), 3));
        geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(uv), 2));
        geo.setIndex(idx);
        ctx.mesh(geo, ctx.mats.lambert({ tex: tex, color: 0xffffff, side: T.DoubleSide }));
      }
      function ringBand(rIn, rOut, yA, yB, color, seg) {
        seg = seg || 32;
        for (var i = 0; i < seg; i++) {
          var a0 = i / seg * PI * 2, a1 = (i + 1) / seg * PI * 2;
          function Pp(r, a, y) { return [CX + Math.cos(a) * r, y, CZ + Math.sin(a) * r]; }
          solid.addQuad(Pp(rIn, a0, yA), Pp(rIn, a1, yA), Pp(rIn, a1, yB), Pp(rIn, a0, yB), color, [CX, (yA + yB) / 2, CZ]);
          solid.addQuad(Pp(rIn, a0, yA), Pp(rIn, a1, yA), Pp(rOut, a1, yA), Pp(rOut, a0, yA), ctx.shade(color, 0.88), [CX, yA - 5, CZ]);
        }
      }
      bandArc(CX, CZ, RING_R - 0.04, 0, PI * 2, RING_Y + 0.15, RING_Y + 1.35, texBand, 11.2, true);
      ringBand(RING_R - 0.14, RING_R, RING_Y + 1.35, RING_Y + 1.6, GOLD_D);
      ringBand(RING_R - 0.22, RING_R, RING_Y + 1.6, RING_Y + 1.8, CREAM);
      ringBand(RING_R - 0.1, RING_R, RING_Y, RING_Y + 0.15, GOLD_D);

      VC('band');
      // ---------------------------------------------------------------- 드럼(창 16개 = 진짜 개구부) + 돔
      (function drum() {
        var R = RING_R, y0 = RING_Y + 1.8, y1 = 27.0, wy0 = 21.9, wy1 = 25.7, th = 0.7, wc = 16, i;
        var halfSec = PI / wc, halfWin = 0.8 / R;
        function Pp(r, a, y) { return [CX + Math.cos(a) * r, y, CZ + Math.sin(a) * r]; }
        function wallSeg(a0, a1, ya, yb) { solid.addQuad(Pp(R, a0, ya), Pp(R, a1, ya), Pp(R, a1, yb), Pp(R, a0, yb), CREAM, [CX, (ya + yb) / 2, CZ]); }
        for (var k = 0; k < wc; k++) {
          var ac = (k + 0.5) * 2 * PI / wc, aL = ac - halfWin, aR = ac + halfWin;
          wallSeg(ac - halfSec, aL, wy0, wy1); wallSeg(aR, ac + halfSec, wy0, wy1);
          wallSeg(ac - halfSec, ac + halfSec, y0, wy0); wallSeg(ac - halfSec, ac + halfSec, wy1, y1);
          var mid = Pp(R + th / 2, ac, (wy0 + wy1) / 2);
          solid.addQuad(Pp(R, aL, wy0), Pp(R + th, aL, wy0), Pp(R + th, aL, wy1), Pp(R, aL, wy1), CREAM, mid);
          solid.addQuad(Pp(R, aR, wy0), Pp(R + th, aR, wy0), Pp(R + th, aR, wy1), Pp(R, aR, wy1), CREAM, mid);
          solid.addQuad(Pp(R, aL, wy0), Pp(R + th, aL, wy0), Pp(R + th, aR, wy0), Pp(R, aR, wy0), CREAM_D, mid);
          solid.addQuad(Pp(R, aL, wy1), Pp(R + th, aL, wy1), Pp(R + th, aR, wy1), Pp(R, aR, wy1), CREAM_D, mid);
          // 유리(바깥쪽 th-0.05)
          var g0 = Pp(R + th - 0.06, aL, wy0), g1 = Pp(R + th - 0.06, aR, wy0), up = [0, wy1 - wy0, 0];
          var Uv = [g1[0] - g0[0], 0, g1[2] - g0[2]], hint = Pp(R - 3, ac, (wy0 + wy1) / 2);
          paneGrid(g0, Uv, up, 3, 7, GLASS_PALE, hint, [Math.cos(ac) * 0.05, 0, Math.sin(ac) * 0.05]);
          // 창 틀(안쪽으로 약간 튀어나온 테두리)
          var nrm = [-Math.cos(ac), -Math.sin(ac)], ry = Math.atan2(nrm[0], nrm[1]), wp = Pp(R - 0.07, ac, 0);
          ctx.box({ x: wp[0], y: wy0 - 0.12, z: wp[2], w: 2 * halfWin * R + 0.5, h: 0.14, d: 0.2, ry: ry, color: CREAM });
          ctx.box({ x: wp[0], y: wy1, z: wp[2], w: 2 * halfWin * R + 0.5, h: 0.16, d: 0.2, ry: ry, color: CREAM });
          // 삼각/반원 박공(번갈아)
          var pe = Pp(R - 0.1, ac, 0);
          if (k % 2) ctx.cone({ x: pe[0], y: wy1 + 0.16, z: pe[2], r: halfWin * R + 0.25, h: 0.55, seg: 4, color: CREAM_D });
          else ctx.cyl({ x: pe[0], y: wy1 + 0.16, z: pe[2], r: halfWin * R + 0.25, rTop: halfWin * R * 0.4, h: 0.5, seg: 8, color: CREAM_D });
          // 창 사이 벽기둥(쌍기둥 느낌)
          var ap = ac + halfSec, pp = Pp(R - 0.14, ap, 0), rb = Math.atan2(-Math.cos(ap), -Math.sin(ap));
          ctx.box({ x: pp[0], y: y0, z: pp[2], w: 0.55, h: y1 - y0 - 0.1, d: 0.3, ry: rb, color: CREAM });
          ctx.box({ x: pp[0], y: y1 - 0.45, z: pp[2], w: 0.75, h: 0.3, d: 0.42, ry: rb, color: GOLD_D });
        }
        // 돔 아랫 코니스
        ringBand(R - 0.14, R, y1 - 0.9, y1 - 0.6, CREAM_D); ringBand(R - 0.34, R, y1 - 0.6, y1 - 0.2, CREAM); ringBand(R - 0.5, R, y1 - 0.2, y1, GOLD_D);
        // 드럼 빛줄기(위쪽-왼쪽 창 몇 개)
        [3, 4, 5, 6, 11, 12].forEach(function (kk) {
          var ac2 = (kk + 0.5) * 2 * PI / wc, p = Pp(R, ac2, 0);
          ctx.addWindowBeam({ x: p[0], y: (wy0 + wy1) / 2 - 0.2, z: p[2], face: [-Math.cos(ac2), -Math.sin(ac2)], w: 1.5, h: 3.4, colors: [0xfff1c0, 0xffe39a, 0xfff6dc], reach: 14, dome: true });
        });
      })();

      (function dome() {
        var R = RING_R, y0 = 27.0, rise = 11.0, rOc = 1.55, seg = 32, rings = 10, phiMax = Math.acos(rOc / R), i, s;
        var palette = [[0xd8b13f, 0x2f4c7a], [0x2f4c7a, 0xd8b13f], [0xd8b13f, 0x3a5f9a], [0x2f4c7a, 0xe0bd4c], [0xe3c256, 0x2f4c7a], [0x2f4c7a, 0xefd57a], [0xf2dc86, 0x2f4c7a], [0xd8b13f, 0x2f4c7a], [0xefd57a, 0xd8b13f], [0xf6e4a0, 0xf6e4a0]];
        function D(a, ph) { return [CX + R * Math.cos(ph) * Math.cos(a), y0 + rise * Math.sin(ph), CZ + R * Math.cos(ph) * Math.sin(a)]; }
        for (i = 0; i < rings; i++) {
          var ph0 = phiMax * i / rings, ph1 = phiMax * (i + 1) / rings;
          for (s = 0; s < seg; s++) {
            var a0 = s / seg * PI * 2, a1 = (s + 1) / seg * PI * 2;
            var col = palette[i][(s >> 1) & 1] ;
            solid.addQuad(D(a0, ph0), D(a1, ph0), D(a1, ph1), D(a0, ph1), col, [CX, 18, CZ], { vary: 0.03 });
          }
        }
        // 16 늑골
        for (var k = 0; k < 16; k++) {
          var ak = k / 16 * PI * 2, pts = [];
          for (var m = 0; m <= 16; m++) pts.push(D(ak, phiMax * m / 16));
          for (m = 0; m < 16; m++) { var A = pts[m], B = pts[m + 1]; solid.addBeam([A[0] * 0.995 + CX * 0.005, A[1] - 0.05, A[2] * 0.995 + CZ * 0.005], [B[0] * 0.995 + CX * 0.005, B[1] - 0.05, B[2] * 0.995 + CZ * 0.005], 0.3, 0.42, 0xf0e6cc, { vary: 0.02 }); }
          // 모자이크 인물 메달(구획마다 4단)
          var am = (k + 0.5) / 16 * PI * 2;
          for (m = 0; m < 4; m++) {
            var pp = D(am, phiMax * (0.14 + m * 0.2)), nrm = new T.Vector3(CX - pp[0], 16 - pp[1] + 6, CZ - pp[2]).normalize();
            nrm = new T.Vector3(CX - pp[0], (y0 - 4) - pp[1], CZ - pp[2]).normalize();
            var q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), nrm);
            solid.add(Geo.cyl(10, 1), (m + k) % 2 ? 0xf4e4a8 : 0x9a3a32, { x: pp[0] + nrm.x * 0.05, y: pp[1] + nrm.y * 0.05, z: pp[2] + nrm.z * 0.05, q: q, sx: 0.75 - m * 0.08, sy: 0.04, sz: 0.75 - m * 0.08, flat: true, vary: 0.04 });
          }
        }
        // 랜턴(정상 채광탑): 안쪽 원통 + 유리 8개 + 작은 궁륭
        var ly = y0 + rise * Math.sin(phiMax), lh = 3.4, lr = rOc;
        for (s = 0; s < 8; s++) {
          var b0 = s / 8 * PI * 2, b1 = (s + 1) / 8 * PI * 2, bm = (b0 + b1) / 2;
          function Lp(a, y, rr) { return [CX + Math.cos(a) * (rr || lr), y, CZ + Math.sin(a) * (rr || lr)]; }
          solid.addQuad(Lp(b0, ly), Lp(b1, ly), Lp(b1, ly + lh), Lp(b0, ly + lh), CREAM, [CX, ly + 1, CZ]);
          var gm = [CX + Math.cos(bm) * (lr + 0.2), ly + 1.7, CZ + Math.sin(bm) * (lr + 0.2)];
          var uu = [Math.cos(b1 + PI / 2) * 0, 0, 0];
          glass.addQuad(Lp(b0 + 0.08, ly + 0.5, lr + 0.1), Lp(b1 - 0.08, ly + 0.5, lr + 0.1), Lp(b1 - 0.08, ly + 2.4, lr + 0.1), Lp(b0 + 0.08, ly + 2.4, lr + 0.1), 0xfff6dc, [CX, ly + 1.5, CZ]);
        }
        for (s = 0; s < 8; s++) {
          var c0 = s / 8 * PI * 2, c1 = (s + 1) / 8 * PI * 2;
          solid.addTris([CX + Math.cos(c0) * lr, ly + lh, CZ + Math.sin(c0) * lr, CX + Math.cos(c1) * lr, ly + lh, CZ + Math.sin(c1) * lr, CX, ly + lh + 1.0, CZ], GOLD, [CX, ly, CZ]);
        }
        glow.add(Geo.cyl(12, 1), 0xfff3cf, { x: CX, y: ly + lh * 0.55, z: CZ, sx: lr * 0.9, sy: 0.02, sz: lr * 0.9, flat: true, vary: 0 });
        ctx.addGlow({ x: CX, y: ly + 1.5, z: CZ, size: 11, color: 0xfff0c0, kind: 'always' });
      })();

      VC('drum+dome');
      // ---------------------------------------------------------------- 익랑 · 후진 벽, 끝 반원
      [-1, 1].forEach(function (s) {
        // 익랑 벽(안쪽면 z=-4.75 / -13.25)
        ctx.box({ x: s * (10.95 + 21.25) / 2, y: 0, z: -4.45, w: 10.3, h: YS, d: 0.6, color: CREAM });
        ctx.box({ x: s * (10.95 + 21.25) / 2, y: 0, z: -13.55, w: 10.3, h: YS, d: 0.6, color: CREAM });
        ctx.addCollider({ x0: Math.min(s * 10.95, s * 21.25), x1: Math.max(s * 10.95, s * 21.25), z0: -4.75, z1: -4.1 });
        ctx.addCollider({ x0: Math.min(s * 10.95, s * 21.25), x1: Math.max(s * 10.95, s * 21.25), z0: -13.9, z1: -13.25 });
        entablature(s * 10.95, -4.75, s * 21.25, -4.75, [0, -1], texBand);
        entablature(s * 10.95, -13.25, s * 21.25, -13.25, [0, 1], texBand);
        [13.9, 18.1].forEach(function (x) { pilaster(s * x, -4.75, [0, -1], 0, 10.4); pilaster(s * x, -13.25, [0, 1], 0, 10.4); });
        [16.0].forEach(function (x) {
          niche(s * x, -4.75, [0, -1], 0, 1.3, 1.6, 3.4, 'saint'); niche(s * x, -13.25, [0, 1], 0, 1.3, 1.6, 3.4, 'saint');
          // 기념비(어두운 대리석 + 흰 상)
          wbox(s * x, -4.75, [0, -1], 0, 0.16, 6.3, 2.0, 2.4, 0.3, 0x3a3532); wbox(s * x, -13.25, [0, 1], 0, 0.16, 6.3, 2.0, 2.4, 0.3, 0x3a3532);
        });
        // 끝 반원 + 반돔
        ctx.apse({ cx: s * 21.25, cz: -9, r: 4.25, y: 0, h: YS, rise: RISE, dir: [s, 0], color: CREAM, mosaic: true, domeColor: 0xd8b13f, bands: [0xd8b13f, 0xc9a03a, 0xe0bd4c, 0x2f4c7a, 0xd8b13f] });
        bandArc(s * 21.25, -9, 4.21, s > 0 ? -PI / 2 : PI / 2, s > 0 ? PI / 2 : PI * 1.5, 10.4 + 0.5, 11.6, texBand, 11, true);
        // 반원 코니스
        [[10.4, 0.5, 0.2, CREAM_D], [11.6, 0.3, 0.3, GOLD_D], [11.9, 0.45, 0.46, CREAM]].forEach(function (c) {
          var n2 = 12; for (var i = 0; i < n2; i++) {
            var a0 = (s > 0 ? -PI / 2 : PI / 2) + PI * i / n2, a1 = a0 + PI / n2, r = 4.25;
            ctx.cornice({ x0: s * 21.25 + Math.cos(a0) * r, z0: -9 + Math.sin(a0) * r, x1: s * 21.25 + Math.cos(a1) * r, z1: -9 + Math.sin(a1) * r, y: c[0], h: c[1], depth: c[2], facing: [-Math.cos((a0 + a1) / 2), -Math.sin((a0 + a1) / 2)], color: c[3] });
          }
        });
        // 끝 반원 제대 3개 + 제단화
        [-0.7, 0, 0.7].forEach(function (ang, ai) {
          var a = (s > 0 ? 0 : PI) + ang * (s > 0 ? 1 : -1), r = ai === 1 ? 3.7 : 3.55;
          var px = s * 21.25 + Math.cos(a) * r, pz = -9 + Math.sin(a) * r, nrm = [-Math.cos(a), -Math.sin(a)], ry = Math.atan2(nrm[0], nrm[1]);
          ctx.altar({ x: px, z: pz, y: 0, w: 2.0, d: 0.9, h: 0.95, ry: ry, style: 'block', cloth: true, candles: 2, flowers: false, collide: false });
          ctx.addCollider({ x: px, z: pz, r: 1.0 });
          var wr = 4.1, wp = [s * 21.25 + Math.cos(a) * wr, -9 + Math.sin(a) * wr];
          wbox(wp[0], wp[1], nrm, 0, 0.06, 1.5, 2.0, 4.6, 0.1, 0x4a3a28);
          wbox(wp[0], wp[1], nrm, 0, 0.1, 1.7, 1.6, 4.2, 0.06, [0x2f4c7a, 0x7a2e2c, 0x2f4c7a][ai]);
          wbox(wp[0], wp[1], nrm, 0, 0.12, 4.0, 1.0, 1.4, 0.05, 0xd8b13f);
        });
      });

      // 후진 팔 벽
      [-1, 1].forEach(function (s) {
        ctx.box({ x: s * 4.55, y: 0, z: -22.9, w: 0.6, h: YS, d: 14.7, color: CREAM });
        ctx.addCollider({ x0: s > 0 ? 4.25 : -4.85, x1: s > 0 ? 4.85 : -4.25, z0: -30.25, z1: -19.95 });
        entablature(s * 4.25, -15.5, s * 4.25, -30.25, [-s, 0], texBand);
        [-17.7, -22.5, -27.0].forEach(function (z) { pilaster(s * 4.25, z, [-s, 0], 0, 10.4); });
        // 바오로 3세(좌)/우르바노 8세(우) 기념비 감실
        niche(s * 4.25, -25.0, [-s, 0], 0, 1.2, 1.5, 3.2, 'saint');
        wbox(s * 4.25, -20.1, [-s, 0], 0, 0.16, 5.4, 1.8, 2.4, 0.3, 0x3a3532);
        wbox(s * 4.25, -25.0, [-s, 0], 0, 0.16, 6.2, 2.0, 2.6, 0.3, 0x3a3532);
      });
      ctx.apse({ cx: 0, cz: -30.25, r: 4.25, y: 0, h: YS, rise: RISE, dir: [0, -1], color: 0xe9e0cc, mosaic: true, domeColor: 0xd8b13f, bands: [0xd8b13f, 0xc9a03a, 0xe0bd4c, 0xd2a657, 0xd8b13f] });
      (function () { // 후진 반원 코니스 + 글귀 띠
        bandArc(0, -30.25, 4.2, PI, PI * 2, 10.9, 11.6, texBand, 11, true);
        [[10.4, 0.5, 0.2, CREAM_D], [11.6, 0.3, 0.3, GOLD_D], [11.9, 0.45, 0.46, CREAM]].forEach(function (c) {
          var n2 = 12; for (var i = 0; i < n2; i++) {
            var a0 = PI + PI * i / n2, a1 = a0 + PI / n2, r = 4.25;
            ctx.cornice({ x0: Math.cos(a0) * r, z0: -30.25 + Math.sin(a0) * r, x1: Math.cos(a1) * r, z1: -30.25 + Math.sin(a1) * r, y: c[0], h: c[1], depth: c[2], facing: [-Math.cos((a0 + a1) / 2), -Math.sin((a0 + a1) / 2)], color: c[3] });
          }
        });
        // 후진 벽 벽기둥 3개(반원 위)
        [-0.95, 0.95].forEach(function (ang) { var a = -PI / 2 + ang, px = Math.cos(a) * 4.25, pz = -30.25 + Math.sin(a) * 4.25; pilaster(px, pz, [-Math.cos(a), -Math.sin(a)], 0, 10.4); });
      })();

      VC('transept+apse');
      // ---------------------------------------------------------------- 베드로의 의자(카테드라 페트리) + 글로리아
      (function () {
        var WZ = function (x) { return -30.25 - Math.sqrt(Math.max(0, 4.25 * 4.25 - x * x)); };
        var gy = 8.0; // 글로리아 창 중심 높이
        // 광선 (금박 청동): 곡면 벽을 따라
        var rays = 28, i;
        for (i = 0; i < rays; i++) {
          var a = i / rays * PI * 2, long = i % 2 === 0, L = long ? 3.5 : 2.3, w = long ? 0.24 : 0.17, R0 = 1.15;
          var ux = Math.cos(a), uy = Math.sin(a) * 1.05, px = -uy, py = ux;
          function Wp(x, y) { return [x, y, WZ(x) + 0.1]; }
          var p0 = Wp(ux * R0 - px * w * 0.5, gy + uy * R0 - py * w * 0.5 * 0), p1 = Wp(ux * R0 + px * w * 0.5, gy + uy * R0 + py * w * 0.5 * 0);
          var tip = Wp(ux * (R0 + L), gy + uy * (R0 + L));
          p0 = Wp(ux * R0 + (-uy) * w * 0.5, gy + uy * R0 + ux * w * 0.5); p1 = Wp(ux * R0 - (-uy) * w * 0.5, gy + uy * R0 - ux * w * 0.5);
          solid.addTris([p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], tip[0], tip[1], tip[2]], long ? 0xf0c850 : 0xd9a93a, [0, gy, -20], { vary: 0.03 });
          // 광선 가운데 곡선 쪽 두께감: 얇은 상자 (끝 장식)
          if (long) ctx.sphere({ x: tip[0], y: tip[1], z: tip[2] + 0.02, r: 0.1, color: 0xf6d35e, w: 6, h: 4 });
        }
        // 타원 창(호박색 유리) + 금 테두리
        var ow = 0.95, oh = 1.25, seg = 20;
        for (i = 0; i < seg; i++) {
          var a0 = i / seg * PI * 2, a1 = (i + 1) / seg * PI * 2;
          var x0 = Math.cos(a0) * ow, y0 = gy + Math.sin(a0) * oh, x1 = Math.cos(a1) * ow, y1 = gy + Math.sin(a1) * oh;
          glass.addTris([0, gy, WZ(0) + 0.16, x0, y0, WZ(x0) + 0.16, x1, y1, WZ(x1) + 0.16], i % 2 ? 0xffc948 : 0xffdf80, [0, gy, -20], { vary: 0.04 });
          var f0 = Math.cos(a0) * (ow + 0.13), g0 = gy + Math.sin(a0) * (oh + 0.13), f1 = Math.cos(a1) * (ow + 0.13), g1 = gy + Math.sin(a1) * (oh + 0.13);
          solid.addQuad([x0, y0, WZ(x0) + 0.15], [x1, y1, WZ(x1) + 0.15], [f1, g1, WZ(f1) + 0.15], [f0, g0, WZ(f0) + 0.15], GOLD, [0, gy, -20], { vary: 0 });
        }
        // 비둘기(성령): 흰 몸 + 날개
        ctx.sphere({ x: 0, y: gy + 0.05, z: WZ(0) + 0.24, r: 0.2, sx: 0.28, sy: 0.18, sz: 0.1, color: 0xffffff, w: 8, h: 6 });
        ctx.box({ x: -0.34, y: gy + 0.1, z: WZ(0) + 0.24, w: 0.45, h: 0.05, d: 0.04, color: 0xffffff, rz: 0.4 });
        ctx.box({ x: 0.34, y: gy + 0.1, z: WZ(0) + 0.24, w: 0.45, h: 0.05, d: 0.04, color: 0xffffff, rz: -0.4 });
        glow.add(Geo.cyl(16, 1), 0xfff4c0, { x: 0, y: gy, z: WZ(0) + 0.19, sx: 0.4, sy: 0.02, sz: 0.55, rx: PI / 2, flat: true, vary: 0 });
        ctx.addGlow({ x: 0, y: gy, z: WZ(0) + 1.0, size: 9, color: 0xffc860, kind: 'always' });
        // 구름·아기천사
        for (i = 0; i < 16; i++) {
          var ca = -PI * 0.1 + (i / 15) * PI * 1.2, cr = 1.9 + (i % 3) * 0.5, cxp = Math.cos(ca + PI) * cr * 1.15, cyp = gy - 0.4 + Math.sin(ca + PI) * cr * 0.9;
          if (Math.abs(cxp) > 3.4) continue;
          ctx.ico({ x: cxp, y: cyp, z: WZ(cxp) + 0.3, sx: 0.55, sy: 0.36, sz: 0.3, color: i % 3 ? 0xf5ecd8 : 0xe6c970, detail: 0 });
        }
        for (i = 0; i < 6; i++) { var ax = -2.4 + i * 0.96; ctx.statue({ x: ax, y: gy - 2.3 + (i % 2) * 0.4, z: WZ(ax) + 0.55, h: 0.8, kind: 'angel', robe: 0xf1e3b8, mantle: 0xe6c970, halo: false }); }
        // 의자 받침 대좌 + 교부 4인 + 의자
        ctx.box({ x: 0, y: 0, z: -33.55, w: 4.6, h: 0.9, d: 1.6, color: 0xdad2c0 });
        ctx.box({ x: 0, y: 0.9, z: -33.55, w: 4.7, h: 0.12, d: 1.7, color: GOLD_D });
        [-1.65, -0.6, 0.6, 1.65].forEach(function (x, ai) { ctx.statue({ x: x, y: 1.0, z: -33.35, h: 2.7, kind: 'saint', robe: ai % 2 ? 0x4a3524 : 0x5a4028, mantle: 0xb8892b, halo: false }); });
        ctx.box({ x: 0, y: 3.1, z: -33.95, w: 1.7, h: 0.5, d: 1.05, color: 0x4a3524 });
        ctx.box({ x: 0, y: 3.6, z: -34.2, w: 1.5, h: 2.5, d: 0.35, color: 0x3e2f1f });
        ctx.box({ x: 0, y: 3.6, z: -34.0, w: 1.15, h: 2.15, d: 0.08, color: 0xc99a45 });
        ctx.cone({ x: 0, y: 6.1, z: -34.2, r: 0.9, h: 0.55, seg: 4, color: GOLD });
        ctx.box({ x: -0.8, y: 3.7, z: -33.95, w: 0.18, h: 1.1, d: 0.9, color: 0x4a3524 }); ctx.box({ x: 0.8, y: 3.7, z: -33.95, w: 0.18, h: 1.1, d: 0.9, color: 0x4a3524 });
        ctx.box({ x: 0, y: 5.95, z: -34.15, w: 0.1, h: 0.7, d: 0.1, color: GOLD }); ctx.box({ x: 0, y: 6.4, z: -34.15, w: 0.45, h: 0.1, d: 0.1, color: GOLD });
        ctx.addCollider({ x0: -2.4, x1: 2.4, z0: -34.5, z1: -32.6 });
        // 의자의 제대
        ctx.altar({ x: 0, z: -31.3, y: 0, w: 2.6, d: 1.1, h: 1.0, style: 'block', color: WHITE, candles: 2, flowers: false, ry: 0 });
      })();

      VC('cathedra');
      // ---------------------------------------------------------------- 교황 제대 + 발다키노 + 콘페시오
      (function () {
        var PY = 0.5, bx = 0, bz = CZ;
        // 단 + 받침
        ctx.box({ x: 0, y: 0, z: -9, w: 5.6, h: 0.18, d: 4.9, color: 0xe2dac8 });
        ctx.box({ x: 0, y: 0.18, z: -9, w: 5.0, h: 0.16, d: 4.5, color: 0xe8e0cf });
        ctx.box({ x: 0, y: 0.34, z: -9, w: 4.8, h: 0.16, d: 4.3, color: 0xeee7d6 });
        // 앞 계단
        ctx.box({ x: 0, y: 0, z: -6.5, w: 4.2, h: 0.17, d: 0.9, color: 0xe0d8c5 });
        ctx.box({ x: 0, y: 0, z: -6.15, w: 3.6, h: 0.1, d: 0.5, color: 0xdad1be });
        // 제대 (흰 대리석)
        ctx.altar({ x: 0, z: -9.15, y: PY, w: 3.0, d: 1.3, h: 1.05, style: 'block', color: WHITE, candles: 4, flowers: false, collide: false });
        // 받침(마름모 대리석)
        [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].forEach(function (c) {
          var x = bx + c[0], z = bz + c[1];
          ctx.box({ x: x, y: PY, z: z, w: 1.25, h: 0.22, d: 1.25, color: 0xdcd5c4 });
          ctx.box({ x: x, y: PY + 0.22, z: z, w: 1.05, h: 1.1, d: 1.05, color: 0xe9e2d2 });
          ctx.box({ x: x, y: PY + 1.32, z: z, w: 1.18, h: 0.16, d: 1.18, color: GOLD_D });
          ctx.box({ x: x, y: PY + 0.3, z: z, w: 0.7, h: 0.6, d: 1.07, color: 0x5a1f22 });
          // 꼬인 청동 기둥
          var cy0 = PY + 1.48, ch = 4.5, r = 0.36;
          ctx.cyl({ x: x, y: cy0, z: z, r: r * 0.7, h: ch, seg: 10, color: 0x2a2016 });
          var nS = 34;
          for (var i = 0; i < nS; i++) {
            var yy = cy0 + ch * i / nS, base = i * 0.46;
            for (var k = 0; k < 3; k++) ctx.box({ x: x, y: yy, z: z, w: r * 2.1, h: ch / nS * 1.5, d: r * 0.62, ry: base + k * PI / 3, color: i % 6 === 0 ? 0xb8892b : 0x4a3524, vary: 0.07 });
          }
          [0.0, 0.5, 1.0].forEach(function (t) { ctx.cyl({ x: x, y: cy0 + (ch - 0.16) * t, z: z, r: r * 1.22, h: 0.16, seg: 10, color: GOLD }); });
          ctx.cyl({ x: x, y: cy0 + ch, z: z, r: r * 1.1, rTop: r * 1.7, h: 0.55, seg: 10, color: GOLD });
          ctx.box({ x: x, y: cy0 + ch + 0.55, z: z, w: 1.15, h: 0.2, d: 1.15, color: GOLD_D });
        });
        // 덮개: 건축보 + 코니스
        var ty = PY + 1.48 + 4.5 + 0.75;
        ctx.box({ x: 0, y: ty, z: bz, w: 4.9, h: 0.5, d: 4.9, color: 0x3a2b1c });
        ctx.box({ x: 0, y: ty + 0.5, z: bz, w: 5.2, h: 0.18, d: 5.2, color: GOLD });
        ctx.box({ x: 0, y: ty + 0.68, z: bz, w: 4.8, h: 0.5, d: 4.8, color: 0x4a3524 });
        ctx.box({ x: 0, y: ty + 1.18, z: bz, w: 5.0, h: 0.14, d: 5.0, color: GOLD_D });
        // 처마 장식(금색 술)
        for (var f = -2; f <= 2; f++) {
          ctx.box({ x: f * 0.95, y: ty - 0.3, z: bz + 2.5, w: 0.22, h: 0.32, d: 0.08, color: GOLD }); ctx.box({ x: f * 0.95, y: ty - 0.3, z: bz - 2.5, w: 0.22, h: 0.32, d: 0.08, color: GOLD });
          ctx.box({ x: 2.5, y: ty - 0.3, z: bz + f * 0.95, w: 0.08, h: 0.32, d: 0.22, color: GOLD }); ctx.box({ x: -2.5, y: ty - 0.3, z: bz + f * 0.95, w: 0.08, h: 0.32, d: 0.22, color: GOLD });
        }
        // 꼭대기 소용돌이 4개
        var topY = ty + 1.32;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
          var prev = [c[0] * 2.25, topY, bz + c[1] * 2.25];
          for (var t = 1; t <= 10; t++) {
            var u = t / 10, e = 1 - Math.pow(1 - u, 2.3);
            var p = [c[0] * 2.25 * (1 - u * 0.97), topY + e * 2.35 + Math.sin(u * PI) * 0.35, bz + c[1] * 2.25 * (1 - u * 0.97)];
            solid.addBeam(prev, p, 0.2, 0.36, u > 0.5 ? GOLD : 0x4a3524, { vary: 0.03 });
            prev = p;
          }
          ctx.statue({ x: c[0] * 2.4, y: topY + 0.05, z: bz + c[1] * 2.4, h: 1.2, kind: 'angel', robe: 0xc99a45, mantle: 0xb8892b, halo: false });
        });
        ctx.sphere({ x: 0, y: topY + 2.7, z: bz, r: 0.38, color: GOLD, w: 12, h: 8 });
        ctx.box({ x: 0, y: topY + 3.05, z: bz, w: 0.1, h: 0.85, d: 0.1, color: GOLD }); ctx.box({ x: 0, y: topY + 3.65, z: bz, w: 0.46, h: 0.1, d: 0.1, color: GOLD });
        // 콘페시오: 말굽형 난간 + 등잔 줄
        var rail = function (x0, z0, x1, z1) {
          var dx = x1 - x0, dz = z1 - z0, L = Math.sqrt(dx * dx + dz * dz), n = Math.max(2, Math.round(L / 0.26)), ang = Math.atan2(-dz, dx);
          ctx.box({ x: (x0 + x1) / 2, y: 0, z: (z0 + z1) / 2, w: L, h: 0.24, d: 0.3, color: 0xe6dfcf, ry: ang });
          ctx.box({ x: (x0 + x1) / 2, y: 0.82, z: (z0 + z1) / 2, w: L, h: 0.1, d: 0.26, color: GOLD_D, ry: ang });
          for (var i = 0; i <= n; i++) {
            var t = i / n, x = x0 + dx * t, z = z0 + dz * t;
            ctx.cyl({ x: x, y: 0.24, z: z, r: 0.065, rTop: 0.045, h: 0.6, seg: 6, color: 0xeee7d6 });
            if (i % 2 === 0) { ctx.cyl({ x: x, y: 0.92, z: z, r: 0.07, rTop: 0.05, h: 0.12, seg: 6, color: GOLD }); glow.add(Geo.sph(6, 4), 0xffcf70, { x: x, y: 1.1, z: z, s: 0.075, flat: true, vary: 0 }); }
          }
        };
        rail(-2.2, -5.7, -2.2, -3.8); rail(2.2, -5.7, 2.2, -3.8); rail(-2.2, -3.8, -0.55, -3.8); rail(0.55, -3.8, 2.2, -3.8);
        ctx.box({ x: 0, y: 0, z: -4.75, w: 4.1, h: 0.025, d: 1.8, color: 0x5a4636, vary: 0 }); // 지하 성소 바닥(어둡게)
        ctx.box({ x: 0, y: 0.03, z: -5.55, w: 1.2, h: 1.9, d: 0.1, color: 0x7a5a2c }); ctx.box({ x: 0, y: 0.5, z: -5.6, w: 0.9, h: 1.4, d: 0.1, color: 0xc99a45 }); // 팔리움 벽감
        ctx.addCollider({ x0: -2.9, x1: 2.9, z0: -11.6, z1: -3.7 });
        ctx.addGlow({ x: 0, y: 1.6, z: -5.2, size: 3.6, color: 0xffc860, kind: 'always' });
        ctx.addLight({ x: 0, y: 6.5, z: -9, color: 0xffc27a, intensity: 1.1, distance: 32, kind: 'lamp' });
      })();

      VC('baldachin');
      // ---------------------------------------------------------------- 성 베드로 청동 좌상(신랑 오른쪽 끝)
      (function () {
        var x = 3.55, z = -0.4;
        ctx.box({ x: x, y: 0, z: z, w: 1.5, h: 0.5, d: 1.3, color: 0xd8d0be });
        ctx.box({ x: x, y: 0.5, z: z, w: 1.25, h: 0.9, d: 1.05, color: 0xe9e2d2 });
        ctx.box({ x: x, y: 1.4, z: z, w: 0.9, h: 0.6, d: 0.7, color: 0xddd5c3 }); // 대리석 의자
        ctx.box({ x: x + 0.28, y: 1.4, z: z, w: 0.3, h: 1.5, d: 0.7, color: 0xddd5c3 });
        ctx.box({ x: x, y: 2.0, z: z, w: 0.62, h: 0.9, d: 0.42, color: 0x3e2f1f }); // 몸(청동)
        ctx.sphere({ x: x, y: 3.0, z: z, r: 0.17, color: 0x3e2f1f, w: 8, h: 6 });
        ctx.box({ x: x - 0.1, y: 2.5, z: z - 0.3, w: 0.18, h: 0.12, d: 0.4, color: 0x3e2f1f });
        ctx.box({ x: x + 0.55, y: 2.0, z: z, w: 0.1, h: 3.2, d: 1.1, color: 0x8a2f2f });
        ctx.addCollider({ x0: x - 0.8, x1: 4.3, z0: z - 0.75, z1: z + 0.75 });
      })();

      VC('peter');
      // ---------------------------------------------------------------- 좌석(의자) + 촛불대
      ctx.renderSeats(layout, 'chair', { wood: 0x6b3a2a, seat: 0x9a2f2f, back: 0x7a3b2a });
      ctx.candleStand(0, {}); ctx.candleStand(1, {});

      VC('seats+candles');
      // ---------------------------------------------------------------- 마무리
      ctx.setSky({ outside: false });
      ctx.setCameraBounds({ x0: -25.2, x1: 25.2, z0: -34.2, z1: 34.2, yMax: 15.5 });
    }
  };
})();
