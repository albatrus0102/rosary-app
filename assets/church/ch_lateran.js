/* ch_lateran.js — 라테라노 성 요한 대성전 (Archbasilica of St. John Lateran, Rome)
   조사서: docs/church/interiors/lateran.md (§6 좌표표 + §11 채택값). scalePercent 53.
   평면: 다섯 낭(신랑 + 안/바깥 측랑) · 익랑(4단 높음) · 성가대석 · 반원 후진. 천장은 금박 격자 평천장.
   축: z (입구 +z, 후진 -z). 좌표는 이미 축소된 앱 미터. */
(function () {
  'use strict';

  // ---------- 레이아웃(순수 데이터) ----------
  var layout = {
    id: 'lateran', scalePercent: 53,
    bounds: { x0: -18.3, x1: 18.3, z0: -34.45, z1: 34.45 },
    spawn: { x: 0, z: 32.5, r: 0 },
    seatGroups: [
      { g: 'L', rows: 16, perRow: 4, origin: { x: -1.6, z: -3.5 }, dx: -0.75, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.6, 0.6] },
      { g: 'R', rows: 16, perRow: 4, origin: { x: 1.6, z: -3.5 }, dx: 0.75, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.6, 0.6] }
    ],
    candles: { stands: [{ x: 11.7, z: 20, slots: 96, reach: 1.8, cols: 16, face: [-1, 0], pitch: 0.5, step: 0.25, ystep: 0.3, y0: 0.8 }] },
    info: { name: '라테라노 성 요한 대성전', place: '로마, 이탈리아', builtYear: 324 }
  };
  ChurchLayouts.register(layout);

  ChurchBuilders['lateran'] = {
    layout: layout,
    thumb: { x: 0, z: 27, yaw: 0, pitch: 7, zoom: 1.5, hour: 12 },
    build: function (ctx) {
      var T = ctx.THREE, PI = Math.PI, G = ChurchGeo, Geo = G.Geo, K = ChurchKit;
      var solid = ctx.solid, glow = ctx.glow;
      var low = ctx.quality === 'low';
      function Q(n) { return low ? Math.max(4, Math.round(n * 0.6)) : n; }

      // ---------- 팔레트(조사서 §5) ----------
      var STU = 0xeeeae0, STU2 = 0xf0ece1, STU_SH = 0xc9c5ba, GOLD = 0xc9a13b, GOLD2 = 0xe0bb52, GOLD_D = 0x9a7a28;
      var RED = 0x8e2b2b, BLUE = 0x2c4a7c, NAVY = 0x1f3566, GREEN = 0x3e5f4b, PORPH = 0x7b2d2f;
      var MARB = 0xece7da, YEL = 0xd2a94e, PINK = 0xb98a7a, PINK2 = 0xc9a39a, WALNUT = 0x80563a, BRONZE = 0x5c4630;

      // ---------- 치수(앱 미터) ----------
      var XN = 4.77, XB = 6.37, XA = 9.57, XC = 10.07, XO = 13.97, XT = 18.3;
      var ZE = 34.45, ZT1 = -5.9, ZT0 = -15.44, ZAC = -29.68, ZAP = -34.45, HC = 14.3, TY = 0.3;
      var ZP = [32.4, 25.1, 17.8, 10.5, 3.2, -4.1];       // 신랑 피어 중심 z
      var ZB = [28.75, 21.45, 14.15, 6.85, -0.45];         // 아케이드 아치 중심 z
      var YS = 4.1, AR = 2.15, YTA = YS + AR;              // 아케이드 아치 시작/상승/정점
      var NY = 4.0, NR = 1.05, ND = 0.9;                   // 사도 벽감 시작/반경/깊이
      var PH = 1.3;                                        // 사도상 받침 높이
      var SIDES = [-1, 1];
      var _vc = 0; function vtot() { var t = 0, b = ctx._.batches, k; for (k in b) t += b[k].vertexCount || 0; var sb = ctx._.surfBatches; for (k in sb) t += sb[k].batch.vertexCount || 0; return t; }
      function mark(n) { if (typeof window !== 'undefined' && window.__LATDBG) { var t = vtot(); console.log('[lat] ' + n + ' ' + (t - _vc)); _vc = t; } }

      // ---------- 사진 질감(키트 surf) 자동 매핑: 색 → 표면 ----------
      function hp(n) { return (ctx.hasPhoto && ctx.hasPhoto(n)) ? n : undefined; }
      var S_PL = hp('marble_beige'), S_MW = hp('marble_white'), S_MR = hp('marble_rose'), S_LM = hp('limestone'), S_WD = hp('wood_dark');
      var AUTO = {};
      [STU, STU2, 0xe2d9c8, 0xe2dacb, 0xe2d9c8, 0xf1eadb].forEach(function (c) { AUTO[c] = S_PL; });
      [MARB, 0xf0ebe0, 0xe3ddd0, 0xf2ead8, 0xf4ecda, 0xd8d2c4, 0xd6cfbe].forEach(function (c) { AUTO[c] = S_MW; });
      AUTO[PINK2] = S_MR; AUTO[PINK] = S_MR; AUTO[STU_SH] = S_LM;
      AUTO[WALNUT] = S_WD; AUTO[0x6b4a2a] = S_WD; AUTO[BRONZE] = S_WD;
      function autoSurf(o) {
        if (o.surf !== undefined || o.mat !== undefined || o.color === undefined) return o;
        var sf = AUTO[o.color];
        if (sf) { o.surf = sf; if (sf === S_MR || sf === S_WD) o.color = (sf === S_WD ? ctx.shade(0xffffff, 0.8) : 0xffffff); }
        return o;
      }
      ['box', 'cyl', 'sphere', 'ico'].forEach(function (fn) { var f0 = ctx[fn]; ctx[fn] = function (o) { return f0(autoSurf(o)); }; });
      function batFor(c) { return AUTO[c] ? ctx.surfBatch(AUTO[c]) : solid; }

      // ---------- 도우미 ----------
      function B(x0, x1, y0, y1, z0, z1, c, o) {
        var a = { x0: x0, x1: x1, y0: y0, y1: y1, z0: z0, z1: z1, color: c };
        if (o) for (var k in o) a[k] = o[k];
        ctx.boxAABB(a);
      }
      function pil(x, z, y, h, r, color, capColor) {   // 가벼운 벽기둥(받침·홈 기둥·금 주두)
        var ch = r * 1.3, sh = h - 0.5 * r - ch;
        ctx.box({ x: x, y: y, z: z, w: r * 2.5, h: r * 0.3, d: r * 2.5, color: col(color, 0.95) });
        ctx.cyl({ x: x, y: y + r * 0.3, z: z, r: r * 1.2, rTop: r, h: r * 0.2, seg: 8, color: color });
        ctx.cyl({ x: x, y: y + r * 0.5, z: z, r: r, rTop: r * 0.88, h: sh, seg: 10, color: color, flat: true });
        ctx.cyl({ x: x, y: y + r * 0.5 + sh, z: z, r: r * 0.95, rTop: r * 1.5, h: ch * 0.8, seg: 6, color: capColor });
        ctx.box({ x: x, y: y + r * 0.5 + sh + ch * 0.8, z: z, w: r * 3.1, h: ch * 0.3, d: r * 3.1, color: capColor });
      }
      function col(c, f) { return ctx.shade(c, f); }
      function mod1(v) { return v - Math.floor(v); }
      function brighten(mesh, k) {
        var m = mesh.material; if (!m || !m.map) return;
        if (m.emissive) { m.emissive.setHex(0xffffff); m.emissiveMap = m.map; m.emissiveIntensity = k; m.needsUpdate = true; }
      }
      function texFloor(o) {   // 정렬된 바닥/천장 질감 판 (타일 경계가 bx,bz 에 맞는다)
        var m = o.ceil
          ? ctx.ceilingFlat({ x0: o.x0, x1: o.x1, z0: o.z0, z1: o.z1, y: o.y, tex: o.tex, tile: [o.tw, o.th], gloss: o.gloss })
          : ctx.floor({ x0: o.x0, x1: o.x1, z0: o.z0, z1: o.z1, y: o.y, tex: o.tex, tile: [o.tw, o.th], gloss: o.gloss === undefined ? 0.85 : o.gloss, reflect: !!o.reflect });
        if (m.material && m.material.map) {
          var u = -(o.bx - o.x0) / o.tw, v = o.ceil ? -(o.bz - o.z0) / o.th : -(o.z1 - o.bz) / o.th;
          m.material.map.offset.set(mod1(u), mod1(v));
        }
        return m;
      }
      // 평면 x=at(axis 'x') 또는 z=at(axis 'z') 위에서 아치 곡선 위쪽 ~ top 까지 채우는 띠
      function spandrel(o) {
        var n = Q(o.n || 12), pts = K.profilePts(o.profile || 'round', o.a, o.rise, n), ym = (o.y0 + o.top) / 2;
        function P(u, y) { return o.axis === 'x' ? [o.at, y, o.c + u] : [o.c + u, y, o.at]; }
        var hint = o.axis === 'x' ? [o.at + o.nrm, ym, o.c] : [o.c, ym, o.at + o.nrm];
        for (var i = 0; i < n; i++) {
          var p0 = pts[i], p1 = pts[i + 1];
          if (o.y0 + Math.max(p0[1], p1[1]) >= o.top) continue;
          batFor(o.color).addQuad(P(p0[0], o.y0 + p0[1]), P(p1[0], o.y0 + p1[1]), P(p1[0], o.top), P(p0[0], o.top), o.color, hint);
        }
      }
      // 아치 안쪽 부채꼴(그림판)
      function archFill(o) {
        var n = Q(o.n || 12), pts = K.profilePts(o.profile || 'round', o.a, o.rise, n);
        function P(u, y) { return o.axis === 'x' ? [o.at, y, o.c + u] : [o.c + u, y, o.at]; }
        var hint = o.axis === 'x' ? [o.at + o.nrm, o.y0, o.c] : [o.c, o.y0, o.at + o.nrm];
        for (var i = 0; i < n; i++) {
          var p0 = pts[i], p1 = pts[i + 1], a = P(0, o.y0), b = P(p0[0], o.y0 + p0[1]), c = P(p1[0], o.y0 + p1[1]);
          batFor(o.color).addTris([a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]], o.color, hint);
        }
      }
      // 아치 안쪽 면(통로 천장)
      function soffit(o) {
        var n = Q(o.n || 12), pts = K.profilePts(o.profile || 'round', o.a, o.rise, n);
        function P(at, u, y) { return o.axis === 'x' ? [at, y, o.c + u] : [o.c + u, y, at]; }
        var mid = (o.at0 + o.at1) / 2, hint = o.axis === 'x' ? [mid, o.y0, o.c] : [o.c, o.y0, mid];
        for (var i = 0; i < n; i++) {
          var p0 = pts[i], p1 = pts[i + 1];
          batFor(o.color).addQuad(P(o.at0, p0[0], o.y0 + p0[1]), P(o.at1, p0[0], o.y0 + p0[1]), P(o.at1, p1[0], o.y0 + p1[1]), P(o.at0, p1[0], o.y0 + p1[1]), o.color, hint);
        }
      }
      // 벽에 실제 창 구멍을 뚫는다. axis 'x': 벽 법선이 x(벽은 z 방향), 'z': 법선이 z
      function wallOpen(o) {
        var ax = o.axis;
        function box(u0, u1, ya, yb) {
          if (u1 - u0 < 0.001 || yb - ya < 0.001) return;
          if (ax === 'x') B(o.n0, o.n1, ya, yb, u0, u1, o.color); else B(u0, u1, ya, yb, o.n0, o.n1, o.color);
        }
        var wins = o.wins.slice().sort(function (a, b) { return a.c - b.c; }), u = o.u0;
        for (var i = 0; i < wins.length; i++) {
          var w = wins[i], e0 = w.c - w.w / 2, e1 = w.c + w.w / 2, head = w.sill + w.h;
          box(u, e0, o.y0, o.y1);
          box(e0, e1, o.y0, w.sill);
          if (!w.top || w.top === 'flat') box(e0, e1, head, o.y1);
          else {
            var prof = w.top === 'pointed' ? 'pointed' : 'round', rise = w.top === 'pointed' ? w.w * 0.72 : w.w / 2;
            [[o.n0, -1], [o.n1, 1]].forEach(function (f) { spandrel({ axis: ax, at: f[0], c: w.c, a: w.w / 2, y0: head, rise: rise, top: o.y1, nrm: f[1], profile: prof, color: o.color }); });
            soffit({ axis: ax, at0: o.n0, at1: o.n1, c: w.c, a: w.w / 2, y0: head, rise: rise, profile: prof, color: o.color });
          }
          // 안/밖 돌출 창턱
          if (o.sillStone) {
            if (ax === 'x') B(o.n1 - (o.sillIn || 0.12), o.n1 + 0.05, w.sill - 0.08, w.sill + 0.02, e0 - 0.08, e1 + 0.08, o.sillStone); else B(e0 - 0.08, e1 + 0.08, w.sill - 0.08, w.sill + 0.02, o.n1 - (o.sillIn || 0.12), o.n1 + 0.05, o.sillStone);
          }
          u = e1;
        }
        box(u, o.u1, o.y0, o.y1);
      }
      var GLASS_PALE = [0xe8eff6, 0xdbe6f1, 0xf3f5f8, 0xd0deec, 0xeaf0f4];
      var GLASS_WARM = [0xf8eed2, 0xf1e2b8, 0xfff5dc, 0xe9d9a8];
      var GLASS_STAIN = [0x2f5db0, 0xc0392b, 0xe6b52e, 0x2f5db0, 0x3a8a5a, 0xe6b52e, 0x7a3fa0];
      function winAt(o) {  // 벽 중심면에 유리창 + 틀
        var a = { x: o.x, y: o.sill, z: o.z, face: o.face, w: o.w, h: o.h, top: o.top || 'round', pattern: o.pattern || 'grid', colors: o.colors || GLASS_PALE, seed: o.seed || 3, frame: true, beam: !!o.beam, beamReach: o.reach || 9 };
        ctx.window(a);
      }

      // ---------- 질감(캔버스) ----------
      var texCosmati = ctx.tex.custom(640, 490, function (g, w, h) {
        var r = ctx.rng(11), i, cx = w / 2, cy = h / 2;
        g.fillStyle = '#ece7da'; g.fillRect(0, 0, w, h);
        for (i = 0; i < 46; i++) {
          g.strokeStyle = 'rgba(150,128,118,' + (0.05 + r() * 0.08) + ')'; g.lineWidth = 1; g.beginPath();
          var vx = r() * w, vy = r() * h; g.moveTo(vx, vy);
          for (var s = 0; s < 4; s++) { vx += (r() - 0.5) * 90; vy += (r() - 0.5) * 60; g.lineTo(vx, vy); }
          g.stroke();
        }
        g.strokeStyle = '#dfbf6a'; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
        g.strokeStyle = '#b0494a'; g.lineWidth = 3; g.strokeRect(25, 25, w - 50, h - 50);
        var k = 0.86;
        function disc(x, y, rad, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, rad * (x === cx && y === cy ? k : 1), 0, 6.2832); g.fill(); }
        disc(cx, cy, 224, '#628a72'); disc(cx, cy, 214, '#ece7da'); disc(cx, cy, 200, '#a24b4f'); disc(cx, cy, 152, '#ece7da');
        for (i = 0; i < 12; i++) {
          var an = i * Math.PI / 6;
          g.strokeStyle = (i % 2) ? '#dfbf6a' : '#628a72'; g.lineWidth = 5; g.beginPath(); g.arc(cx + Math.cos(an) * 176 * k, cy + Math.sin(an) * 176 * k, 40 * k, 0, 6.2832); g.stroke();
        }
        for (i = 0; i < 24; i++) { var a2 = i * Math.PI / 12; disc(cx + Math.cos(a2) * 130 * k, cy + Math.sin(a2) * 130 * k, 8, i % 2 ? '#628a72' : '#a24b4f'); }
        disc(cx, cy, 108, '#a24b4f'); disc(cx, cy, 92, '#ece7da'); disc(cx, cy, 80, '#628a72'); disc(cx, cy, 60, '#dfbf6a'); disc(cx, cy, 44, '#a24b4f'); disc(cx, cy, 22, '#ece7da');
        [[0, 0], [w, 0], [0, h], [w, h]].forEach(function (p) { disc(p[0], p[1], 104, '#dfbf6a'); disc(p[0], p[1], 92, '#628a72'); disc(p[0], p[1], 76, '#a24b4f'); disc(p[0], p[1], 44, '#ece7da'); });
        [[w / 2, 0], [w / 2, h], [0, h / 2], [w, h / 2]].forEach(function (p) { disc(p[0], p[1], 40, '#628a72'); disc(p[0], p[1], 28, '#ece7da'); disc(p[0], p[1], 14, '#a24b4f'); });
      });
      var texPanels = ctx.tex.custom(256, 256, function (g, w, h) {
        var r = ctx.rng(5); g.fillStyle = '#e9e2d3'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 24; i++) { g.strokeStyle = 'rgba(150,128,118,' + (0.05 + r() * 0.08) + ')'; g.beginPath(); var x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 80, y + (r() - 0.5) * 60); g.stroke(); }
        g.strokeStyle = '#dfbf6a'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
        g.strokeStyle = '#b0494a'; g.lineWidth = 2; g.strokeRect(16, 16, w - 32, h - 32);
        g.fillStyle = '#628a72'; g.beginPath(); g.moveTo(w / 2, 60); g.lineTo(w - 60, h / 2); g.lineTo(w / 2, h - 60); g.lineTo(60, h / 2); g.closePath(); g.fill();
        g.fillStyle = '#a24b4f'; g.beginPath(); g.arc(w / 2, h / 2, 30, 0, 6.2832); g.fill();
        g.fillStyle = '#ece7da'; g.beginPath(); g.arc(w / 2, h / 2, 12, 0, 6.2832); g.fill();
      });
      var texFresco = ctx.tex.custom(512, 512, function (g, w, h) {
        var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#80402f'); gr.addColorStop(1, '#5a2a22');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#d9b45a'; g.lineWidth = 12; g.strokeRect(10, 10, w - 20, h - 20); g.lineWidth = 4; g.strokeRect(30, 30, w - 60, h - 60);
        var robes = ['#2f4f8a', '#3e6f55', '#a53b3b'];
        for (var i = 0; i < 3; i++) {
          var x = 110 + i * 146, rr = robes[i];
          g.fillStyle = rr; g.beginPath(); g.moveTo(x - 38, 440); g.lineTo(x - 22, 210); g.lineTo(x + 22, 210); g.lineTo(x + 38, 440); g.closePath(); g.fill();
          g.fillStyle = '#e8cfae'; g.beginPath(); g.arc(x, 180, 26, 0, 6.2832); g.fill();
          g.strokeStyle = '#e8c860'; g.lineWidth = 4; g.beginPath(); g.arc(x, 180, 40, 0, 6.2832); g.stroke();
          g.fillStyle = '#d8c7a0'; g.fillRect(x - 6, 250, 12, 170);
        }
        g.fillStyle = 'rgba(255,230,160,0.35)'; for (i = 0; i < 40; i++) g.fillRect(40 + (i * 37) % 430, 60 + (i * 91) % 60, 5, 5);
      });
      function cofferTile(variant) {
        return ctx.tex.custom(512, 512, function (g, w, h) {
          g.fillStyle = '#c9a13b'; g.fillRect(0, 0, w, h);
          var c = w / 4, i, j, k;
          for (j = 0; j < 4; j++) for (i = 0; i < 4; i++) {
            var x = i * c, y = j * c;
            g.fillStyle = '#e6c560'; g.fillRect(x + 3, y + 3, c - 6, c - 6);
            g.fillStyle = '#b08a2e'; g.fillRect(x + 12, y + 12, c - 24, c - 24);
            g.fillStyle = ((i + j) % 2) ? '#a23a3a' : '#2f4c80'; g.fillRect(x + 24, y + 24, c - 48, c - 48);
            g.fillStyle = '#e0bb52'; g.beginPath(); g.arc(x + c / 2, y + c / 2, c * 0.2, 0, 6.2832); g.fill();
            for (k = 0; k < 8; k++) { var a = k * Math.PI / 4; g.beginPath(); g.arc(x + c / 2 + Math.cos(a) * c * 0.27, y + c / 2 + Math.sin(a) * c * 0.27, c * 0.05, 0, 6.2832); g.fill(); }
            g.fillStyle = ((i + j) % 2) ? '#8a2a2a' : '#223c6a'; g.beginPath(); g.arc(x + c / 2, y + c / 2, c * 0.11, 0, 6.2832); g.fill();
            g.fillStyle = '#f0d070'; g.beginPath(); g.arc(x + c / 2, y + c / 2, c * 0.05, 0, 6.2832); g.fill();
          }
        });
      }
      var texCoffer = cofferTile();
      function cartouche(withEmblem) {
        return ctx.tex.custom(512, 512, function (g, w, h) {
          g.fillStyle = '#c9a13b'; g.fillRect(0, 0, w, h);
          g.fillStyle = '#e6c560'; g.fillRect(14, 14, w - 28, h - 28);
          g.fillStyle = '#b08a2e'; g.fillRect(34, 34, w - 68, h - 68);
          g.fillStyle = '#e0bb52'; g.fillRect(48, 48, w - 96, h - 96);
          g.fillStyle = '#2f4c80'; g.fillRect(84, 84, w - 168, h - 168);
          g.strokeStyle = '#b08a2e'; g.lineWidth = 6; g.strokeRect(96, 96, w - 192, h - 192);
          g.fillStyle = '#e0bb52';
          for (var k = 0; k < 16; k++) { var a = k * Math.PI / 8; g.beginPath(); g.arc(w / 2 + Math.cos(a) * 190, h / 2 + Math.sin(a) * 190, 12, 0, 6.2832); g.fill(); }
          if (withEmblem) {
            g.save(); g.translate(w / 2, h / 2 + 30);
            [-0.7, 0.7].forEach(function (rot, idx) {
              g.save(); g.rotate(rot); g.fillStyle = idx ? '#e8e8ee' : '#e0bb52';
              g.fillRect(-9, -120, 18, 250); g.beginPath(); g.arc(0, -135, 26, 0, 6.2832); g.fill();
              g.fillStyle = '#25396b'; g.beginPath(); g.arc(0, -135, 12, 0, 6.2832); g.fill();
              g.fillStyle = idx ? '#e8e8ee' : '#e0bb52'; g.fillRect(-9, 100, 40, 14); g.fillRect(-9, 80, 30, 12); g.restore();
            });
            g.fillStyle = '#e0bb52';
            for (var t = 0; t < 3; t++) { g.beginPath(); g.ellipse(0, -80 - t * 38, 52 - t * 8, 20, 0, 0, 6.2832); g.fill(); g.strokeStyle = '#8e2b2b'; g.lineWidth = 4; g.stroke(); }
            g.beginPath(); g.arc(0, -205, 10, 0, 6.2832); g.fill(); g.restore();
          } else {
            g.fillStyle = '#e0bb52';
            for (var q = 0; q < 12; q++) { var a3 = q * Math.PI / 6; g.beginPath(); g.ellipse(w / 2 + Math.cos(a3) * 70, h / 2 + Math.sin(a3) * 70, 44, 16, a3, 0, 6.2832); g.fill(); }
            g.fillStyle = '#8e2b2b'; g.beginPath(); g.arc(w / 2, h / 2, 40, 0, 6.2832); g.fill();
            g.fillStyle = '#f0d070'; g.beginPath(); g.arc(w / 2, h / 2, 18, 0, 6.2832); g.fill();
          }
        });
      }

      // 후진 반돔 모자이크(정면 투영: u=x, v=높이). 가운데 구세주, 좌우 두 성인, 종려, 양, 강.
      function mosaicTex() {
        return G.canvasTexture(1024, 512, function (g, w, h) {
          var r = ctx.rng(77), x, y;
          for (y = 0; y < h; y += 8) for (x = 0; x < w; x += 8) {
            var v = 0.84 + r() * 0.3; g.fillStyle = 'rgb(' + Math.round(213 * v) + ',' + Math.round(166 * v) + ',' + Math.round(62 * v) + ')'; g.fillRect(x, y, 7, 7);
          }
          g.fillStyle = '#1f3566'; g.beginPath(); g.arc(512, 512, 512, Math.PI, 0); g.arc(512, 512, 456, 0, Math.PI, true); g.fill();
          g.fillStyle = '#e8c860'; for (x = 0; x < 40; x++) { var aa = Math.PI + (x + 0.5) / 40 * Math.PI; g.fillRect(512 + Math.cos(aa) * 484 - 4, 512 + Math.sin(aa) * 484 - 2, 8, 4); }
          function person(cx, top, bodyH, robe, mantle, halo, big) {
            var bw = big ? 66 : 42;
            g.fillStyle = mantle; g.beginPath(); g.moveTo(cx - bw - 14, top + bodyH); g.lineTo(cx - bw + 4, top + 56); g.lineTo(cx + bw - 4, top + 56); g.lineTo(cx + bw + 14, top + bodyH); g.closePath(); g.fill();
            g.fillStyle = robe; g.beginPath(); g.moveTo(cx - bw + 8, top + bodyH); g.lineTo(cx - bw * 0.55, top + 60); g.lineTo(cx + bw * 0.55, top + 60); g.lineTo(cx + bw - 8, top + bodyH); g.closePath(); g.fill();
            g.fillStyle = '#e8c860'; g.beginPath(); g.arc(cx, top + 26, big ? 54 : 38, 0, 6.2832); g.fill();
            g.fillStyle = halo; g.beginPath(); g.arc(cx, top + 26, big ? 46 : 32, 0, 6.2832); g.fill();
            g.fillStyle = '#e9c8a6'; g.beginPath(); g.arc(cx, top + 28, big ? 26 : 19, 0, 6.2832); g.fill();
            g.fillStyle = '#4a2f1e'; g.beginPath(); g.arc(cx, top + 14, big ? 24 : 17, Math.PI, 0); g.fill();
            if (big) { g.fillStyle = '#a53b3b'; g.fillRect(cx - 5, top - 16, 10, 40); g.fillRect(cx - 18, top - 4, 36, 10); }
          }
          // 보좌
          g.fillStyle = '#5a2a4a'; g.fillRect(432, 248, 160, 190); g.fillStyle = '#d9b45a'; g.fillRect(432, 248, 160, 8);
          person(512, 188, 250, '#a53b3b', '#34508f', '#f6e6b0', true);
          g.fillStyle = '#efe6cf'; g.fillRect(560, 312, 46, 58); g.fillStyle = '#c9a13b'; g.fillRect(578, 322, 10, 36); g.fillRect(568, 336, 30, 8);
          person(300, 232, 250, '#8a6a3c', '#b89a64', '#f6e6b0', false);
          person(724, 232, 250, '#9a4a3a', '#d8c8a0', '#f6e6b0', false);
          function palm(cx, base) {
            g.fillStyle = '#6a4a2a'; g.fillRect(cx - 5, base - 150, 10, 150);
            g.fillStyle = '#3f8a4a';
            for (var k = 0; k < 7; k++) { var a = -Math.PI / 2 + (k - 3) * 0.5; g.save(); g.translate(cx, base - 150); g.rotate(a); g.beginPath(); g.ellipse(0, -38, 14, 46, 0, 0, 6.2832); g.fill(); g.restore(); }
          }
          palm(130, 450); palm(405, 462); palm(619, 462); palm(894, 450);
          for (x = 0; x < 6; x++) {
            [190 + x * 18, 700 + x * 18].forEach(function (sx) {
              g.fillStyle = '#f4f0e6'; g.beginPath(); g.ellipse(sx, 478, 15, 10, 0, 0, 6.2832); g.fill();
              g.fillStyle = '#3a2a22'; g.beginPath(); g.arc(sx + 15, 472, 6, 0, 6.2832); g.fill();
            });
          }
          g.fillStyle = '#4f86c0'; g.fillRect(0, 490, w, 22); g.strokeStyle = '#d6ecff'; g.lineWidth = 3;
          for (x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 500); g.quadraticCurveTo(x + 10, 494, x + 20, 500); g.quadraticCurveTo(x + 30, 506, x + 40, 500); g.stroke(); }
        }, false);
      }
      // 후진 벽 띠: 호두나무 → 대리석판 → 검붉은 덩굴 → 남색 글귀 → 금빛 사도 열
      function apseWallTex() {
        return G.canvasTexture(1024, 478, function (g, w, h) {
          var r = ctx.rng(31), pxm = h / 7.0, i, x;
          g.fillStyle = '#5a3a22'; g.fillRect(0, h - 1.5 * pxm, w, 1.5 * pxm);
          g.strokeStyle = 'rgba(30,15,5,0.5)'; g.lineWidth = 3; for (x = 0; x < w; x += 34) { g.strokeRect(x + 3, h - 1.4 * pxm, 28, 1.0 * pxm); }
          g.fillStyle = '#d9b45a'; g.fillRect(0, h - 1.65 * pxm, w, 0.16 * pxm);
          for (x = 0; x < w; x += 128) {
            var alt = (x / 128) % 2;
            g.fillStyle = alt ? '#cbb3a6' : '#d9d2c2'; g.fillRect(x + 3, h - 4.4 * pxm, 122, 2.6 * pxm);
            g.fillStyle = alt ? '#7b2d2f' : '#3e5f4b'; g.fillRect(x + 30, h - 4.1 * pxm, 68, 2.0 * pxm);
            g.strokeStyle = '#d2a94e'; g.lineWidth = 3; g.strokeRect(x + 10, h - 4.3 * pxm, 108, 2.4 * pxm);
          }
          g.fillStyle = '#5a1f22'; g.fillRect(0, h - 5.0 * pxm, w, 0.55 * pxm);
          g.strokeStyle = '#d9b45a'; g.lineWidth = 3; g.beginPath(); for (x = 0; x < w; x += 16) g.lineTo(x, h - 4.72 * pxm + Math.sin(x * 0.11) * 8); g.stroke();
          g.fillStyle = '#1f3566'; g.fillRect(0, h - 5.55 * pxm, w, 0.55 * pxm);
          g.fillStyle = '#e8c860'; for (x = 6; x < w; x += 14) g.fillRect(x, h - 5.4 * pxm, 7 + (x * 7 % 6), 0.25 * pxm);
          for (i = 0; i < 40; i++) for (var j = 0; j < 20; j++) { var v = 0.84 + r() * 0.3; g.fillStyle = 'rgb(' + Math.round(213 * v) + ',' + Math.round(166 * v) + ',' + Math.round(62 * v) + ')'; g.fillRect(i * 26, j * (1.45 * pxm / 20), 25, 1.45 * pxm / 20 + 1); }
          var cols = ['#7a2a2a', '#2f4f8a', '#3e6f55', '#8a6a3c', '#a53b3b'];
          for (i = 0; i < 12; i++) {
            var fx = 40 + i * 84; g.fillStyle = cols[i % 5]; g.fillRect(fx - 14, 0.35 * pxm, 28, 1.05 * pxm);
            g.fillStyle = '#e9c8a6'; g.beginPath(); g.arc(fx, 0.25 * pxm, 11, 0, 6.2832); g.fill();
            g.strokeStyle = '#f6e6b0'; g.lineWidth = 3; g.beginPath(); g.arc(fx, 0.25 * pxm, 15, 0, 6.2832); g.stroke();
          }
        }, false);
      }

      // ---------- 재질(키트 팩토리) ----------
      var matMosaic = ctx.mats.standard({ map: mosaicTex(), side: T.DoubleSide, roughness: 0.38, metalness: 0.45 });
      var matApseWall = ctx.mats.standard({ map: apseWallTex(), side: T.DoubleSide, roughness: 0.55, metalness: 0.1 });
      if (matMosaic.emissive) { matMosaic.emissive.setHex(0xffffff); matMosaic.emissiveMap = matMosaic.map; matMosaic.emissiveIntensity = 0.3; }
      if (matApseWall.emissive) { matApseWall.emissive.setHex(0xffffff); matApseWall.emissiveMap = matApseWall.map; matApseWall.emissiveIntensity = 0.2; }
      ctx.onHour(function (env) {
        var k = 0.16 + 0.2 * Math.min(1, env.day === undefined ? 1 : env.day);
        if (matMosaic.emissive) matMosaic.emissiveIntensity = k + 0.08;
        if (matApseWall.emissive) matApseWall.emissiveIntensity = k * 0.7;
      });

      mark('before');
      // =====================================================================
      // 1. 바닥
      // =====================================================================
      texFloor({ x0: -XB, x1: XB, z0: ZT1, z1: ZE, y: 0, tex: texCosmati, tw: 9.54, th: 7.3, bx: -XN, bz: -4.1, reflect: true });
      SIDES.forEach(function (s) {
        texFloor({ x0: s < 0 ? -XO : XB, x1: s < 0 ? -XB : XO, z0: -5.3, z1: ZE, y: 0, tex: texPanels, tw: 3.8, th: 3.65, bx: s < 0 ? -XO : XB, bz: -5.3 });
      });
      // 익랑·성가대석·후진 바닥(4단 높음)
      B(-XT, XT, 0, TY - 0.01, ZAP, ZT1, STU_SH);
      texFloor({ x0: -XT, x1: XT, z0: ZT0, z1: ZT1, y: TY, tex: texCosmati, tw: 9.54, th: 7.3, bx: -XN, bz: ZT1, reflect: true });
      texFloor({ x0: -XN - 0.2, x1: XN + 0.2, z0: ZAP, z1: ZT0, y: TY, tex: texCosmati, tw: 9.54, th: 7.3, bx: -XN, bz: ZT0 });
      ctx.floorZone({ x0: -XT, x1: XT, z0: ZAP, z1: ZT1, y: TY });
      // 신랑→익랑 계단 4단 + 붉은 카펫
      ctx.steps({ x0: -XN, x1: XN, z0: ZT1, z1: ZT1 + 0.8, y0: 0, y1: TY, n: 4, dir: [0, -1], color: MARB });
      solid.addBeam([0, 0.075 + 0.014, ZT1 + 0.8 - 0.03], [0, TY + 0.014, ZT1 + 0.2], 0.02, 3.2, 0xa8323a, { vary: 0 });
      B(-1.6, 1.6, TY, TY + 0.014, -8.0, ZT1 + 0.2, 0xa8323a, { vary: 0 });
      B(-1.6, -1.5, TY + 0.014, TY + 0.02, -8.0, ZT1 + 0.2, GOLD2, { vary: 0 }); B(1.5, 1.6, TY + 0.014, TY + 0.02, -8.0, ZT1 + 0.2, GOLD2, { vary: 0 });

      mark('before');
      // =====================================================================
      // 2. 신랑 아케이드 (피어 6 + 아치 5 + 사도 벽감 12)
      // =====================================================================
      var APOS = {   // 사도상(입구→익랑 순). s=-1 왼쪽(남), s=+1 오른쪽(북, 익랑→입구 순)
        '-1': ['saw', 'knife', 'club', 'chalice', 'xcross', 'keys'],
        '1': ['sword', 'staff', 'spear', 'crossstaff', 'book', 'club']
      };
      function statue(cx, cz, y0, fx, fz, H, kind) {
        var u = H / 2.3, ry = Math.atan2(fx, fz);
        function P(lf, lr) { return [cx + fx * lf - fz * lr, cz + fz * lf + fx * lr]; }
        var M = 0xf0ebe0, M2 = 0xe3ddd0, HAIR = 0xd5cdbd, p;
        ctx.cyl({ x: cx, y: y0, z: cz, r: 0.54 * u, rTop: 0.31 * u, h: 1.0 * u, seg: 9, color: M });
        ctx.cyl({ x: cx, y: y0 + 0.95 * u, z: cz, r: 0.31 * u, rTop: 0.27 * u, h: 0.5 * u, seg: 9, color: M2 });
        ctx.box({ x: cx, y: y0 + 1.38 * u, z: cz, w: 0.7 * u, h: 0.46 * u, d: 0.36 * u, color: M, ry: ry });
        [-1, 1].forEach(function (sg) { p = P(0, sg * 0.31 * u); ctx.ico({ x: p[0], y: y0 + 1.78 * u, z: p[1], r: 0.16 * u, color: M, detail: 0 }); });
        ctx.cyl({ x: cx, y: y0 + 1.78 * u, z: cz, r: 0.08 * u, h: 0.14 * u, seg: 6, color: M });
        p = P(0.02 * u, 0); ctx.sphere({ x: p[0], y: y0 + 2.0 * u, z: p[1], r: 0.155 * u, color: 0xf2ece1, w: 8, h: 6 });
        ctx.sphere({ x: p[0], y: y0 + 2.13 * u, z: p[1], r: 0.17 * u, sy: 0.1 * u, color: HAIR, w: 8, h: 4 });
        p = P(0.1 * u, 0); ctx.ico({ x: p[0], y: y0 + 1.9 * u, z: p[1], r: 0.1 * u, sy: 0.14 * u, color: HAIR, detail: 0 });
        (function () { var a = P(0.12 * u, -0.3 * u), b2 = P(0.2 * u, 0.28 * u); solid.addBeam([a[0], y0 + 1.76 * u, a[1]], [b2[0], y0 + 0.9 * u, b2[1]], 0.1 * u, 0.1 * u, M2, { vary: 0.02 }); for (var fi = -1; fi <= 1; fi++) { var fp = P(0.44 * u * (1 - Math.abs(fi) * 0.12), fi * 0.24 * u); ctx.box({ x: fp[0], y: y0 + 0.05 * u, z: fp[1], w: 0.05 * u, h: 0.85 * u, d: 0.07 * u, color: M2, ry: ry }); } p = P(0.17 * u, 0); ctx.box({ x: p[0], y: y0 + 1.95 * u, z: p[1], w: 0.04 * u, h: 0.1 * u, d: 0.05 * u, color: M, ry: ry }); })();
        p = P(-0.2 * u, -0.28 * u); ctx.box({ x: p[0], y: y0 + 0.3 * u, z: p[1], w: 0.14 * u, h: 1.5 * u, d: 0.5 * u, color: M2, ry: ry });
        p = P(0, 0.4 * u); ctx.box({ x: p[0], y: y0 + 0.55 * u, z: p[1], w: 0.14 * u, h: 0.7 * u, d: 0.13 * u, color: M, ry: ry });
        var hand = P(0.32 * u, -0.45 * u), sh = P(0, -0.3 * u);
        solid.addBeam([sh[0], y0 + 1.72 * u, sh[1]], [hand[0], y0 + 1.3 * u, hand[1]], 0.13 * u, 0.13 * u, M, { vary: 0.02 });
        var gold = 0xd9b45a, iron = 0xc3c8d0, wood = 0x9b7b52, hy = y0 + 1.3 * u;
        function vert(h0, h1, rad, c, seg) { ctx.cyl({ x: hand[0], y: y0 + h0 * u, z: hand[1], r: rad * u, h: (h1 - h0) * u, seg: seg || 5, color: c }); }
        if (kind === 'keys') {
          [0, 1].forEach(function (k) { var q = P(0.32 * u, (-0.45 - k * 0.1) * u); ctx.box({ x: q[0], y: hy - 0.1 * u, z: q[1], w: 0.04 * u, h: 0.4 * u, d: 0.04 * u, color: gold }); ctx.ico({ x: q[0], y: hy + 0.34 * u, z: q[1], r: 0.07 * u, color: gold, detail: 0 }); ctx.box({ x: q[0], y: hy - 0.06 * u, z: q[1], w: 0.04 * u, h: 0.04 * u, d: 0.12 * u, color: gold, ry: ry }); });
        } else if (kind === 'sword') {
          ctx.box({ x: hand[0], y: y0 + 0.25 * u, z: hand[1], w: 0.07 * u, h: 1.15 * u, d: 0.025 * u, color: iron, ry: ry }); ctx.box({ x: hand[0], y: hy - 0.05 * u, z: hand[1], w: 0.3 * u, h: 0.04 * u, d: 0.05 * u, color: gold, ry: ry }); ctx.box({ x: hand[0], y: hy, z: hand[1], w: 0.05 * u, h: 0.22 * u, d: 0.05 * u, color: gold });
        } else if (kind === 'xcross') {
          var c0 = P(0.32 * u, -0.62 * u), up = P(0, 0), rr = [P(0, 1)[0] - up[0], P(0, 1)[1] - up[1]];
          solid.addBeam([c0[0] + rr[0] * 0.4 * u, y0 + 0.55 * u, c0[1] + rr[1] * 0.4 * u], [c0[0] - rr[0] * 0.4 * u, y0 + 2.0 * u, c0[1] - rr[1] * 0.4 * u], 0.08 * u, 0.08 * u, wood);
          solid.addBeam([c0[0] - rr[0] * 0.4 * u, y0 + 0.55 * u, c0[1] - rr[1] * 0.4 * u], [c0[0] + rr[0] * 0.4 * u, y0 + 2.0 * u, c0[1] + rr[1] * 0.4 * u], 0.08 * u, 0.08 * u, wood);
        } else if (kind === 'chalice') {
          ctx.cyl({ x: hand[0], y: hy, z: hand[1], r: 0.03 * u, h: 0.15 * u, seg: 5, color: gold }); ctx.cyl({ x: hand[0], y: hy + 0.15 * u, z: hand[1], r: 0.05 * u, rTop: 0.09 * u, h: 0.14 * u, seg: 7, color: gold });
        } else if (kind === 'staff') { vert(0, 2.15, 0.03, wood); ctx.sphere({ x: hand[0], y: y0 + 2.2 * u, z: hand[1], r: 0.06 * u, color: gold, w: 6, h: 4 });
        } else if (kind === 'crossstaff') { vert(0, 2.2, 0.03, wood); ctx.box({ x: hand[0], y: y0 + 2.0 * u, z: hand[1], w: 0.28 * u, h: 0.045 * u, d: 0.045 * u, color: wood, ry: ry });
        } else if (kind === 'spear') { vert(0, 2.3, 0.025, wood); ctx.cone({ x: hand[0], y: y0 + 2.3 * u, z: hand[1], r: 0.05 * u, h: 0.22 * u, seg: 4, color: iron });
        } else if (kind === 'saw') { ctx.box({ x: hand[0], y: hy - 0.55 * u, z: hand[1], w: 0.035 * u, h: 0.95 * u, d: 0.17 * u, color: iron, ry: ry });
        } else if (kind === 'knife') { ctx.box({ x: hand[0], y: hy - 0.1 * u, z: hand[1], w: 0.03 * u, h: 0.38 * u, d: 0.07 * u, color: iron, ry: ry });
        } else if (kind === 'club') { ctx.cyl({ x: hand[0], y: y0 + 0.35 * u, z: hand[1], r: 0.03 * u, rTop: 0.075 * u, h: 1.0 * u, seg: 6, color: wood });
        } else if (kind === 'book') { ctx.box({ x: hand[0], y: hy - 0.05 * u, z: hand[1], w: 0.26 * u, h: 0.07 * u, d: 0.2 * u, color: 0xefe6cf, ry: ry + 0.4 }); ctx.box({ x: hand[0], y: hy - 0.02 * u, z: hand[1], w: 0.27 * u, h: 0.02 * u, d: 0.21 * u, color: gold, ry: ry + 0.4 }); }
      }
      function pedestal(s, zc) {
        var xf = s * XN, xc = xf + s * 0.33, fr = xf - s * 0.12;
        ctx.box({ x: xc, y: 0, z: zc, w: 1.0, h: 0.22, d: 1.6, color: MARB });
        ctx.box({ x: xc, y: 0.22, z: zc, w: 0.8, h: 0.85, d: 1.4, color: PINK2 });
        ctx.box({ x: xc, y: 1.07, z: zc, w: 0.96, h: 0.23, d: 1.6, color: MARB });
        ctx.box({ x: xc - s * 0.49, y: 1.07, z: zc, w: 0.04, h: 0.05, d: 1.64, color: col(MARB, 0.9) });
        ctx.box({ x: fr + s * 0.0 + (-s * 0.0), y: 0.42, z: zc, w: 0.04, h: 0.5, d: 0.95, color: 0xa9786f });
        ctx.solid.add(Geo.cyl(8, 1), GOLD, { x: fr - s * 0.03, y: 0.67, z: zc, rz: PI / 2, sx: 0.22, sy: 0.03, sz: 0.22, flat: true, vary: 0 });
        ctx.solid.add(Geo.cyl(8, 1), 0x6a4a2a, { x: fr - s * 0.04, y: 0.67, z: zc, rz: PI / 2, sx: 0.12, sy: 0.03, sz: 0.12, flat: true, vary: 0 });
        ctx.box({ x: fr - s * 0.02, y: 1.12, z: zc, w: 0.03, h: 0.1, d: 0.8, color: 0x3a3a46 });
        ctx.addCollider({ x0: Math.min(fr, xf + s * 1.0), x1: Math.max(fr, xf + s * 1.0), z0: zc - 0.82, z1: zc + 0.82 });
      }

      SIDES.forEach(function (s) {
        var xf = s * XN, xb = s * XB, xn = xf + s * ND;
        // 피어 6개
        for (var k = 0; k < 6; k++) {
          var zp = ZP[k], zA = (k === 5) ? ZT1 : zp - 1.5, zBb = (k === 0) ? ZE : zp + 1.5;
          var nx0 = Math.min(xf, xb), nx1 = Math.max(xf, xb), nn0 = Math.min(xn, xb), nn1 = Math.max(xn, xb), nj0 = Math.min(xf, xn), nj1 = Math.max(xf, xn);
          B(nn0, nn1, 0, YTA, zA, zBb, STU);                                 // 벽감 뒤 덩어리
          B(nj0, nj1, 0, YTA, zA, zp - NR, STU); B(nj0, nj1, 0, YTA, zp + NR, zBb, STU);   // 문설주
          B(nj0, nj1, NY + NR, YTA, zp - NR, zp + NR, STU);                    // 벽감 위 상인방
          spandrel({ axis: 'x', at: xf, c: zp, a: NR, y0: NY, rise: NR, top: NY + NR, nrm: -s, color: STU });
          // 벽감 안쪽: 뒤판(청록회색) + 곡면 천장 + 조개 늑
          var bk = 0x8a9d92;
          B(Math.min(xn, xn - s * 0.03), Math.max(xn, xn - s * 0.03), 0, NY, zp - NR, zp + NR, bk);
          archFill({ axis: 'x', at: xn - s * 0.03, c: zp, a: NR, y0: NY, rise: NR, nrm: -s, color: col(bk, 1.1) });
          soffit({ axis: 'x', at0: xf, at1: xn, c: zp, a: NR, y0: NY, rise: NR, color: 0xd8d2c4 });
          for (var q = 0; q <= 6; q++) {
            var an = PI * q / 6, ex = zp + Math.cos(an) * NR * 0.97, ey = NY + Math.sin(an) * NR * 0.97;
            solid.addBeam([xn - s * 0.05, NY, zp], [xn - s * 0.05, ey, ex], 0.035, 0.03, 0xd6cfbe, { vary: 0 });
          }
          solid.addBeam([xn - s * 0.05, NY + 0.0, zp - NR], [xn - s * 0.05, NY, zp + NR], 0.05, 0.04, GOLD, { vary: 0 });
          // 천상 예루살렘의 문(벽감 뒤 그림): 짙은 청회색 문 + 금 테
          var xd = xn - s * 0.045;
          B(Math.min(xd, xd - s * 0.01), Math.max(xd, xd - s * 0.01), PH + 0.05, NY, zp - 0.62, zp + 0.62, 0x4b5c6e);
          archFill({ axis: 'x', at: xd - s * 0.01, c: zp, a: 0.62, y0: NY, rise: 0.62, nrm: -s, color: 0x4b5c6e });
          B(Math.min(xd - s * 0.01, xd - s * 0.02), Math.max(xd - s * 0.01, xd - s * 0.02), PH + 0.05, NY, zp - 0.64, zp - 0.58, GOLD); B(Math.min(xd - s * 0.01, xd - s * 0.02), Math.max(xd - s * 0.01, xd - s * 0.02), PH + 0.05, NY, zp + 0.58, zp + 0.64, GOLD);
          solid.addBeam([xd - s * 0.025, PH + 0.05, zp], [xd - s * 0.025, NY + 0.62, zp], 0.02, 0.03, GOLD, { vary: 0 });
          // 벽감 테두리 아치 + 녹색 대리석 기둥 2
          ctx.arch({ x: xf, y: NY, z: zp, span: NR * 2, rise: NR, t: 0.2, depth: 0.3, axis: 'z', type: 'round', color: STU2, seg: 8 });
          [-1, 1].forEach(function (sg) {
            ctx.column({ x: xf - s * 0.02, z: zp + sg * 0.95, y: PH, h: NY - PH, r: 0.1, style: 'round', capital: 'block', base: false, color: GREEN, capColor: GOLD, collide: false });
            pil(xf, zp + sg * 1.3, 0, 8.55, 0.2, STU2, GOLD2);
          });
          // 상인방 위 스투코 부조 판(흰색 + 금 테)
          B(Math.min(xf, xf - s * 0.06), Math.max(xf, xf - s * 0.06), 6.0, 7.9, zp - 1.15, zp + 1.15, STU2);
          B(Math.min(xf - s * 0.06, xf - s * 0.1), Math.max(xf - s * 0.06, xf - s * 0.1), 6.15, 7.75, zp - 0.95, zp + 0.95, col(STU, 0.95));
          B(Math.min(xf - s * 0.06, xf - s * 0.12), Math.max(xf - s * 0.06, xf - s * 0.12), 6.15, 6.25, zp - 0.95, zp + 0.95, GOLD);
          B(Math.min(xf - s * 0.06, xf - s * 0.12), Math.max(xf - s * 0.06, xf - s * 0.12), 7.65, 7.75, zp - 0.95, zp + 0.95, GOLD);
          // 바닥 쪽 징두리
          B(Math.min(xf, xf - s * 0.1), Math.max(xf, xf - s * 0.1), 0, 0.35, zA, zBb, STU_SH);
          // 충돌체(피어 전체)
          ctx.addCollider({ x0: Math.min(xf - s * 0.0, xb), x1: Math.max(xf - s * 0.0, xb), z0: zA, z1: zBb });
          // 사도상
          var kind = APOS[String(s)][k];
          pedestal(s, zp);
          statue(xf + s * 0.55, zp, PH, -s, 0, 2.44, kind);
          ctx.addGlow({ x: xf + s * 0.4, y: 3.0, z: zp, size: 1.3, color: 0xffd9a0, kind: 'lamp' });
        }
        mark('side-piers');
        // 아치 5개: 스팬드럴 + 소핏 + 테두리 + 창
        for (var a = 0; a < 5; a++) {
          var zb = ZB[a];
          [[xf, -s], [xb, s]].forEach(function (f) { spandrel({ axis: 'x', at: f[0], c: zb, a: 2.15, y0: YS, rise: AR, top: YTA, nrm: f[1], color: STU }); });
          soffit({ axis: 'x', at0: xf, at1: xb, c: zb, a: 2.15, y0: YS, rise: AR, color: 0xdcd6c8, n: 14 });
          ctx.arch({ x: xf, y: YS, z: zb, span: 4.3, rise: AR, t: 0.3, depth: 0.32, axis: 'z', type: 'round', color: STU2, seg: 10 });
          ctx.arch({ x: xb, y: YS, z: zb, span: 4.3, rise: AR, t: 0.22, depth: 0.24, axis: 'z', type: 'round', color: STU2, seg: 10 });
        }
        mark('side-arches');
        // 위쪽 벽(창 구멍 5개)
        var wins = ZB.map(function (zc, i) { return { c: zc, sill: 9.7, w: i === 2 ? 2.8 : 1.8, h: 2.0, top: 'round' }; });
        wallOpen({ axis: 'x', n0: Math.min(xf, xb), n1: Math.max(xf, xb), u0: ZT1, u1: ZE, y0: YTA, y1: HC, wins: wins, color: STU, sillStone: MARB, sillIn: 0.1 });
        ZB.forEach(function (zc, i) {
          winAt({ x: (xf + xb) / 2, z: zc, sill: 9.7, w: i === 2 ? 2.8 : 1.8, h: 2.0, top: 'round', face: [-s, 0], pattern: 'lancet', seed: 10 + i + (s > 0 ? 7 : 0), beam: (i === 1 || i === 3), reach: 9, colors: GLASS_PALE });
        });
        mark('side-clerestory+windows');
        // 코니스·글귀띠·타원 그림·상부 금 코니스
        B(Math.min(xf, xf - s * 0.05), Math.max(xf, xf - s * 0.05), 8.1, 8.7, ZT1, ZE, NAVY);
        for (var d = 0; d < 50; d++) { var dz = ZT1 + 0.6 + d * 0.8; if (dz > ZE - 0.4) break; B(Math.min(xf - s * 0.05, xf - s * 0.08), Math.max(xf - s * 0.05, xf - s * 0.08), 8.28, 8.52, dz, dz + 0.1 + ((d * 7) % 5) * 0.05, GOLD2, { vary: 0 }); }
        B(Math.min(xf, xf - s * 0.4), Math.max(xf, xf - s * 0.4), 8.7, 9.1, ZT1, ZE, STU2);
        B(Math.min(xf - s * 0.4, xf - s * 0.46), Math.max(xf - s * 0.4, xf - s * 0.46), 8.78, 8.88, ZT1, ZE, GOLD);
        B(Math.min(xf, xf - s * 0.42), Math.max(xf, xf - s * 0.42), 13.15, 13.5, ZT1, ZE, GOLD2);
        B(Math.min(xf, xf - s * 0.14), Math.max(xf, xf - s * 0.14), 13.5, HC, ZT1, ZE, STU2);
        for (var m = 0; m < 42; m++) { var mz = ZT1 + 0.4 + m * 0.95; if (mz > ZE - 0.3) break; B(Math.min(xf - s * 0.14, xf - s * 0.28), Math.max(xf - s * 0.14, xf - s * 0.28), 13.58, 14.1, mz, mz + 0.26, GOLD, { vary: 0.02 }); }
        ZP.forEach(function (zp) {
          var ox = xf - s * 0.05;
          ctx.solid.add(Geo.cyl(12, 1), GOLD, { x: ox - s * 0.0, y: 11.1, z: zp, rz: PI / 2, sx: 1.3, sy: 0.07, sz: 0.85, flat: true, vary: 0 });
          ctx.solid.add(Geo.cyl(12, 1), 0x4b3c33, { x: ox - s * 0.05, y: 11.1, z: zp, rz: PI / 2, sx: 1.15, sy: 0.05, sz: 0.72, flat: true, vary: 0 });
          ctx.solid.add(Geo.cyl(12, 1), 0xd9c3a0, { x: ox - s * 0.09, y: 11.2, z: zp, rz: PI / 2, sx: 0.55, sy: 0.03, sz: 0.3, flat: true, vary: 0 });
        });
        mark('side-cornices');
        // ------- 안쪽 측랑 / 열주 / 바깥 측랑 -------
        var xa = s * XA, xc = s * XC, xo = s * XO, xw = s * (XO + 1.0);
        var cn = [[Math.min(xa, xc), Math.max(xa, xc)]];
        ZP.forEach(function (zp) { pil(s * (XA + XC) / 2, zp, 0, 5.4, 0.26, STU, GOLD2); ctx.addCollider({ x: s * (XA + XC) / 2, z: zp, r: 0.4 }); });
        B(Math.min(xa, xc), Math.max(xa, xc), 5.4, 6.3, -5.3, ZE, STU2);
        B(Math.min(xa, xc), Math.max(xa, xc), 6.3, 7.5, -5.3, ZE, STU);
        B(Math.min(xa + s * 0.0, xa - s * 0.1), Math.max(xa, xa - s * 0.1), 6.2, 6.4, -5.3, ZE, GOLD);
        B(Math.min(xc, xc + s * 0.1), Math.max(xc, xc + s * 0.1), 6.0, 6.2, -5.3, ZE, GOLD);
        // 바깥 벽(두께 1.0) + 경당 아치/제단화
        B(Math.min(xo, xw), Math.max(xo, xw), 0, 7.8, -5.3, ZE, 0xe2dacb);
        B(Math.min(xo, xo - s * 0.1), Math.max(xo, xo - s * 0.1), 0, 1.2, -5.3, ZE, STU_SH);
        B(Math.min(xo, xo - s * 0.14), Math.max(xo, xo - s * 0.14), 1.2, 1.3, -5.3, ZE, 0xb98a66);
        ZP.forEach(function (zp) { pil(xo, zp, 0, 6.2, 0.3, STU2, GOLD2); });
        ZB.forEach(function (zb, i) {
          var big = (s < 0 && i === 0);   // 코르시니 경당(가장 큼)
          var aw = big ? 1.9 : 1.55, ay = big ? 3.5 : 3.3, ar = aw * 0.9;
          B(Math.min(xo - s * 0.0, xo + s * 0.12), Math.max(xo, xo + s * 0.12), 0.5, ay, zb - aw, zb + aw, 0x7e5e44);
          archFill({ axis: 'x', at: xo + s * 0.12 - s * 0.0, c: zb, a: aw, y0: ay, rise: ar, nrm: -s, color: i % 2 ? 0x6e5f7a : 0x8a6a48 });
          // 제단화 속 인물(색 면)
          B(Math.min(xo + s * 0.12, xo + s * 0.1), Math.max(xo + s * 0.12, xo + s * 0.1), 1.2, 3.2, zb - 0.45, zb + 0.45, i % 2 ? 0xd7c8a8 : 0x3b5d90);
          ctx.sphere({ x: xo + s * 0.1, y: 3.4, z: zb, r: 0.22, color: 0xe8cfae, w: 8, h: 6 });
          ctx.arch({ x: xo, y: ay, z: zb, span: aw * 2, rise: ar, t: 0.28, depth: 0.3, axis: 'z', type: 'round', color: STU2, seg: 8 });
          ctx.box({ x: xo - s * 0.35, y: 0, z: zb, w: 0.7, h: 0.95, d: 2.4, color: MARB });
          ctx.box({ x: xo - s * 0.4, y: 0.95, z: zb, w: 0.78, h: 0.08, d: 2.5, color: GOLD });
          ctx.addCollider({ x0: Math.min(xo - s * 0.75, xo), x1: Math.max(xo - s * 0.75, xo), z0: zb - 1.25, z1: zb + 1.25 });
        });
        ctx.addCollider({ x0: Math.min(xo, s * XT), x1: Math.max(xo, s * XT), z0: -5.9, z1: ZE + 2 });
        mark('side-aisle-walls');
        // 안쪽 측랑 작은 돔(돛형 궁륭), 바깥 측랑 평천장(목재+금)
        ctx.vault({ type: 'sail', x0: Math.min(s * XB, xa), x1: Math.max(s * XB, xa), z0: -5.3, z1: ZE, y: 6.3, rise: 1.5, bays: [1, 10], color: 0xf1eadb });
        var oc = texFloor({ ceil: true, x0: Math.min(xc, xo), x1: Math.max(xc, xo), z0: -5.3, z1: ZE, y: 6.2, tex: ctx.tex.coffer({ base: 0x6b3e2e, gold: 0xd9b45a, border: 0xa07a30, n: 2 }), tw: 3.9, th: 3.975, bx: Math.min(xc, xo), bz: -5.3 });
        brighten(oc, 0.2);
      });

      // 아케이드 끝벽: 익랑 앞(측랑 끝)
      SIDES.forEach(function (s) {
        B(Math.min(s * XB, s * XT), Math.max(s * XB, s * XT), 0, HC, ZT1, -5.3, 0xe2dacb);
        ctx.addCollider({ x0: Math.min(s * XB, s * XT), x1: Math.max(s * XB, s * XT), z0: ZT1, z1: -5.3 });
      });

      mark('before');
      // =====================================================================
      // 3. 입구 벽(문 5개 + 큰 창)
      // =====================================================================
      wallOpen({ axis: 'z', n0: ZE, n1: ZE + 1.0, u0: -XO - 1.0, u1: XO + 1.0, y0: 0, y1: HC, color: STU, sillStone: MARB, sillIn: 0.1,
        wins: [{ c: 0, sill: 7.2, w: 3.2, h: 3.4, top: 'round' }, { c: -3.8, sill: 7.2, w: 1.3, h: 2.6, top: 'round' }, { c: 3.8, sill: 7.2, w: 1.3, h: 2.6, top: 'round' }] });
      winAt({ x: 0, z: ZE + 0.5, sill: 7.2, w: 3.2, h: 3.4, top: 'round', face: [0, -1], pattern: 'grid', seed: 3, beam: false, reach: 12 });
      winAt({ x: -3.8, z: ZE + 0.5, sill: 7.2, w: 1.3, h: 2.6, top: 'round', face: [0, -1], pattern: 'grid', seed: 4 });
      winAt({ x: 3.8, z: ZE + 0.5, sill: 7.2, w: 1.3, h: 2.6, top: 'round', face: [0, -1], pattern: 'grid', seed: 5 });
      [[0, 2.4, 4.7], [-7.97, 1.7, 3.8], [7.97, 1.7, 3.8], [-12, 1.7, 3.4], [12, 1.7, 3.4]].forEach(function (d) {
        var dx = d[0], dw = d[1], dh = d[2], zz = ZE;
        B(dx - dw / 2 - 0.25, dx - dw / 2, 0, dh + 0.25, zz - 0.1, zz + 0.05, MARB); B(dx + dw / 2, dx + dw / 2 + 0.25, 0, dh + 0.25, zz - 0.1, zz + 0.05, MARB);
        B(dx - dw / 2 - 0.25, dx + dw / 2 + 0.25, dh, dh + 0.25, zz - 0.1, zz + 0.05, MARB);
        B(dx - dw / 2, dx + dw / 2, 0, dh, zz - 0.05, zz + 0.2, BRONZE);
        for (var py = 0; py < 3; py++) { B(dx - dw / 2 + 0.12, dx - 0.04, 0.3 + py * (dh - 0.5) / 3, 0.3 + (py + 0.8) * (dh - 0.5) / 3, zz - 0.08, zz - 0.05, 0x7b6140); B(dx + 0.04, dx + dw / 2 - 0.12, 0.3 + py * (dh - 0.5) / 3, 0.3 + (py + 0.8) * (dh - 0.5) / 3, zz - 0.08, zz - 0.05, 0x7b6140); }
        ctx.sphere({ x: dx - 0.12, y: dh * 0.45, z: zz - 0.1, r: 0.06, color: GOLD, w: 6, h: 4 }); ctx.sphere({ x: dx + 0.12, y: dh * 0.45, z: zz - 0.1, r: 0.06, color: GOLD, w: 6, h: 4 });
      });
      B(-XO, XO, 0, 1.3, ZE - 0.08, ZE, STU_SH, { vary: 0.02 });
      B(-XO, XO, 9.1 - 0.4, 9.1, ZE - 0.3, ZE, STU2); B(-XO, XO, 13.15, 13.5, ZE - 0.42, ZE, GOLD2); B(-XO, XO, 13.5, HC, ZE - 0.14, ZE, STU2);
      ctx.addCollider({ x0: -XT, x1: XT, z0: ZE, z1: ZE + 2 });
      [-3.3, 3.3].forEach(function (x) { ctx.holyFont({ x: x, z: 33.1 }); });

      mark('before');
      // =====================================================================
      // 4. 천장: 금박 격자 평천장(+ 실제 돌출 보)
      // =====================================================================
      function cofferBeams(x0, x1, z0, z1, nx, nz) {
        var i, x, z, dx = (x1 - x0) / nx, dz = (z1 - z0) / nz;
        for (i = 0; i <= nx; i++) { x = x0 + dx * i; B(x - 0.12, x + 0.12, HC - 0.3, HC, z0, z1, GOLD, { vary: 0.03 }); }
        for (i = 0; i <= nz; i++) { z = z0 + dz * i; B(x0, x1, HC - 0.3, HC, z - 0.12, z + 0.12, GOLD, { vary: 0.03 }); }
      }
      var cn1 = texFloor({ ceil: true, x0: -XN, x1: XN, z0: ZT1, z1: ZE, y: HC - 0.001, tex: texCoffer, tw: 9.54, th: 4 * (ZE - ZT1) / 16, bx: -XN, bz: ZT1 });
      brighten(cn1, 0.5); cofferBeams(-XN, XN, ZT1, ZE, 4, 16);
      var cn2 = texFloor({ ceil: true, x0: -XT, x1: XT, z0: ZT0, z1: ZT1, y: HC - 0.001, tex: texCoffer, tw: 4 * (2 * XT) / 15, th: 9.54, bx: -XT, bz: ZT0 });
      brighten(cn2, 0.5); cofferBeams(-XT, XT, ZT0, ZT1, 15, 4);
      var cn3 = texFloor({ ceil: true, x0: -XN, x1: XN, z0: ZAC, z1: ZT0, y: HC - 0.001, tex: texCoffer, tw: 9.54, th: 4 * (ZT0 - ZAC) / 6, bx: -XN, bz: ZAC });
      brighten(cn3, 0.5); cofferBeams(-XN, XN, ZAC, ZT0, 4, 6);
      [[6.85, false], [14.15, true], [21.45, false]].forEach(function (c) {
        var cp = ctx.plane({ x: 0, y: HC - 0.32, z: c[0], rx: PI / 2, w: 4.6, h: 4.6, tex: cartouche(c[1]), tile: 4.6 });
        brighten(cp, 0.55);
        B(-2.4, 2.4, HC - 0.34, HC - 0.3, c[0] - 2.4, c[0] + 2.4, GOLD_D); B(-2.3, 2.3, HC - 0.4, HC - 0.34, c[0] - 2.3, c[0] + 2.3, GOLD, { vary: 0 });
      });
      // 익랑·성가대석 벽 위 금 코니스
      B(-XT, -XT + 0.42, 13.15, 13.5, ZT0, ZT1, GOLD2); B(XT - 0.42, XT, 13.15, 13.5, ZT0, ZT1, GOLD2);
      B(-XT, -XT + 0.14, 13.5, HC, ZT0, ZT1, STU2); B(XT - 0.14, XT, 13.5, HC, ZT0, ZT1, STU2);
      [[4.77, XT], [-XT, -4.77]].forEach(function (r) { B(r[0], r[1], 13.15, 13.5, ZT0, ZT0 + 0.42, GOLD2); B(r[0], r[1], 13.5, HC, ZT0, ZT0 + 0.14, STU2); });

      mark('before');
      // =====================================================================
      // 5. 익랑 (+4단): 벽, 창, 오르간, 성체 제대, 개선 아치
      // =====================================================================
      // 앞벽(측랑 끝 위)·뒷벽·끝벽 창
      SIDES.forEach(function (s) {
        // 뒷벽 (z=ZT0 .. -16.44), x 4.77..18.3
        wallOpen({ axis: 'z', n0: ZT0 - 1.0, n1: ZT0, u0: Math.min(s * XN, s * XT), u1: Math.max(s * XN, s * XT), y0: 0, y1: HC, color: 0xe2d9c8, sillStone: MARB,
          wins: [{ c: s * 8.6, sill: 9.0, w: 1.5, h: 2.4, top: 'round' }, { c: s * 13.6, sill: 9.0, w: 1.5, h: 2.4, top: 'round' }] });
        [8.6, 13.6].forEach(function (xx, i) { winAt({ x: s * xx, z: ZT0 - 0.5, sill: 9.0, w: 1.5, h: 2.4, top: 'round', face: [0, 1], seed: 20 + i + (s > 0 ? 3 : 0), colors: GLASS_WARM, pattern: 'lancet' }); });
        // 끝벽
        wallOpen({ axis: 'x', n0: Math.min(s * XT, s * (XT + 1)), n1: Math.max(s * XT, s * (XT + 1)), u0: ZT0, u1: ZT1, y0: 0, y1: HC, color: 0xe2d9c8, sillStone: MARB,
          wins: [{ c: -6.8, sill: 9.0, w: 1.3, h: 2.4, top: 'round' }, { c: -14.4, sill: 9.0, w: 1.3, h: 2.4, top: 'round' }] });
        [-6.8, -14.4].forEach(function (zz, i) { winAt({ x: s * (XT + 0.5), z: zz, sill: 9.0, w: 1.3, h: 2.4, top: 'round', face: [-s, 0], seed: 30 + i, colors: GLASS_WARM, pattern: 'lancet' }); });
        // 앞벽 창(측랑 끝 벽 위) z=-5.3..-5.9 얇은 벽이므로 위쪽만 창 구멍
        [9.0, 14.0].forEach(function (xx, i) { /* 앞벽은 측랑 끝벽(0..HC, 두께 .6) — 위쪽 창은 장식 유리로 */
          ctx.window({ x: s * xx, y: 9.0, z: ZT1 + 0.04, face: [0, -1], w: 1.5, h: 2.4, top: 'round', pattern: 'lancet', colors: GLASS_WARM, seed: 40 + i, frame: true, beam: false });
        });
        // 하부 대리석 판(질감) + 프레스코
        var lowTex = ctx.tex.pattern('stone', { c1: 0xe6d7c8, c2: 0xd6c2b0 });
        ctx.wallFace({ x0: s * XN, z0: ZT0 + 0.01, x1: s * XT, z1: ZT0 + 0.01, y0: TY, y1: 3.2, facing: [0, 1], tex: lowTex, tile: [2.5, 2.9] });
        ctx.wallFace({ x0: s * XB, z0: ZT1 - 0.01, x1: s * XT, z1: ZT1 - 0.01, y0: TY, y1: 3.2, facing: [0, -1], tex: lowTex, tile: [2.5, 2.9] });
        ctx.wallFace({ x0: s * (XT - 0.01), z0: ZT0, x1: s * (XT - 0.01), z1: ZT1, y0: TY, y1: 3.2, facing: [-s, 0], tex: lowTex, tile: [2.5, 2.9] });
        ctx.wallFace({ x0: s * XN, z0: ZT0 + 0.01, x1: s * XT, z1: ZT0 + 0.01, y0: 3.2, y1: 8.0, facing: [0, 1], tex: texFresco, tile: [4.2, 4.8] });
        ctx.wallFace({ x0: s * XB, z0: ZT1 - 0.01, x1: s * XT, z1: ZT1 - 0.01, y0: 3.2, y1: 8.0, facing: [0, -1], tex: texFresco, tile: [4.2, 4.8] });
        ctx.wallFace({ x0: s * (XT - 0.01), z0: ZT0, x1: s * (XT - 0.01), z1: ZT1, y0: 3.2, y1: 8.0, facing: [-s, 0], tex: texFresco, tile: [4.2, 4.8] });
        // 코니스(프레스코 위·아래 금 띠)
        B(Math.min(s * XN, s * XT), Math.max(s * XN, s * XT), 3.2, 3.4, ZT0, ZT0 + 0.1, GOLD2); B(Math.min(s * XN, s * XT), Math.max(s * XN, s * XT), 8.0, 8.35, ZT0, ZT0 + 0.2, STU2);
        B(Math.min(s * XB, s * XT), Math.max(s * XB, s * XT), 3.2, 3.4, ZT1 - 0.1, ZT1, GOLD2); B(Math.min(s * XB, s * XT), Math.max(s * XB, s * XT), 8.0, 8.35, ZT1 - 0.2, ZT1, STU2);
        B(Math.min(s * XT, s * (XT - 0.1)), Math.max(s * XT, s * (XT - 0.1)), 3.2, 3.4, ZT0, ZT1, GOLD2); B(Math.min(s * XT, s * (XT - 0.2)), Math.max(s * XT, s * (XT - 0.2)), 8.0, 8.35, ZT0, ZT1, STU2);
        // 벽기둥
        [8.8, 13.6].forEach(function (xx) { pil(s * xx, ZT0, TY, 8.0, 0.28, STU2, GOLD2); });
      });
      // 후면(익랑 뒷벽·성가대석 벽) 충돌
      SIDES.forEach(function (s) { ctx.addCollider({ x0: Math.min(s * XN, s * XT), x1: Math.max(s * XN, s * XT), z0: ZAP, z1: ZT0 }); });

      // 오른쪽 끝(북): 오르간
      (function () {
        var ox = XT, zc = -10.65;
        [-1, 0, 1].forEach(function (dz) { B(ox - 0.25, ox, TY, 3.9, zc + dz * 1.8 - 0.65, zc + dz * 1.8 + 0.65, 0x5a3a22); B(ox - 0.3, ox - 0.25, TY + 0.2, 3.7, zc + dz * 1.8 - 0.5, zc + dz * 1.8 + 0.5, 0x7a5236); });
        B(ox - 1.4, ox, 4.2, 4.6, zc - 3.0, zc + 3.0, GOLD2); B(ox - 1.45, ox - 1.4, 4.2, 4.6, zc - 3.0, zc + 3.0, GOLD_D);
        for (var q = -6; q <= 6; q++) ctx.cyl({ x: ox - 1.3, y: 4.6, z: zc + q * 0.46, r: 0.04, h: 0.9, seg: 5, color: GOLD });
        B(ox - 1.4, ox - 1.34, 5.5, 5.62, zc - 3.0, zc + 3.0, GOLD2);
        [-1, 1].forEach(function (sg) { ctx.column({ x: ox - 1.0, z: zc + sg * 2.7, y: TY, h: 3.9, r: 0.28, style: 'round', capital: 'ionic', color: YEL, capColor: GOLD2, collide: true }); });
        B(ox - 0.9, ox, 4.6, 9.4, zc - 3.0, zc + 3.0, 0x6b4a2a);
        var hs = [[-2.5, 2.6], [-1.9, 3.3], [-1.3, 2.6], [-0.7, 3.6], [0, 4.2], [0.7, 3.6], [1.3, 2.6], [1.9, 3.3], [2.5, 2.6]];
        hs.forEach(function (p) { ctx.cyl({ x: ox - 0.95, y: 5.0, z: zc + p[0], r: 0.19, rTop: 0.17, h: p[1] + 0.2, seg: 8, color: 0xcdd0d8 }); });
        [-1.3, 1.3].forEach(function (zz) { for (var t = -2; t <= 2; t++) ctx.cyl({ x: ox - 0.95, y: 5.0, z: zc + zz + t * 0.14 * 1.0 + (zz < 0 ? -0.9 : 0.9), r: 0.07, h: 1.0 + Math.abs(t) * -0.1 + 0.6, seg: 5, color: 0xcdd0d8 }); });
        B(ox - 1.0, ox, 9.4, 9.8, zc - 3.1, zc + 3.1, GOLD2); B(ox - 1.1, ox - 1.0, 9.4, 9.9, zc - 3.1, zc + 3.1, GOLD_D);
        ctx.addCollider({ x0: ox - 1.7, x1: ox, z0: zc - 3.4, z1: zc + 3.4 });
      })();
      // 왼쪽 끝(남): 성체 제대 (금 기둥 4 + 금 박공 + 하늘빛 승천화)
      (function () {
        var bx = -XT, zc = -10.65;
        B(bx, bx + 0.12, 6.4, 11.5, zc - 2.6, zc + 2.6, 0x7aa6e0); B(bx + 0.12, bx + 0.2, 6.3, 11.6, zc - 2.7, zc + 2.7, GOLD);
        ctx.sphere({ x: bx + 0.3, y: 9.0, z: zc - 1.2, r: 0.8, sy: 0.35, sz: 1.0, color: 0xf4f6fb, w: 8, h: 5 }); ctx.sphere({ x: bx + 0.3, y: 8.3, z: zc + 1.0, r: 0.7, sy: 0.3, sz: 1.1, color: 0xf4f6fb, w: 8, h: 5 });
        ctx.box({ x: bx + 0.25, y: 9.4, z: zc, w: 0.06, h: 1.4, d: 0.5, color: 0xf1e6cf });
        [-1.65, -0.55, 0.55, 1.65].forEach(function (dz) { ctx.column({ x: bx + 1.6, z: zc + dz * 1.15, y: TY, h: 5.8, r: 0.27, style: 'round', capital: 'composite', color: GOLD2, capColor: GOLD2, collide: true }); });
        B(bx + 1.1, bx + 2.1, 6.1, 6.7, zc - 3.0, zc + 3.0, GOLD2); B(bx + 1.0, bx + 2.2, 6.1, 6.2, zc - 3.1, zc + 3.1, GOLD_D);
        var gp = [bx + 1.6, 6.7, zc - 3.0, bx + 1.6, 6.7, zc + 3.0, bx + 1.6, 7.9, zc];
        solid.addTris(gp, GOLD2, [bx + 4, 7, zc]); solid.addBeam([bx + 1.6, 6.7, zc - 3.0], [bx + 1.6, 7.9, zc], 0.16, 0.2, GOLD_D); solid.addBeam([bx + 1.6, 6.7, zc + 3.0], [bx + 1.6, 7.9, zc], 0.16, 0.2, GOLD_D);
        B(bx + 0.2, bx + 1.6, TY, TY + 0.9, zc - 2.2, zc + 2.2, MARB); B(bx + 0.2, bx + 1.6, TY + 0.9, TY + 1.0, zc - 2.3, zc + 2.3, STU2);
        ctx.box({ x: bx + 0.9, y: TY + 1.0, z: zc, w: 0.6, h: 0.55, d: 0.6, color: GOLD2 }); ctx.cone({ x: bx + 0.9, y: TY + 1.55, z: zc, r: 0.4, h: 0.4, seg: 8, color: GOLD2 });
        ctx.box({ x: bx + 1.1, y: TY + 1.0, z: zc - 1.1, w: 0.1, h: 0.4, d: 0.1, color: GOLD }); ctx.addFlame({ x: bx + 1.1, y: TY + 1.55, z: zc - 1.1, scale: 1.0 });
        ctx.box({ x: bx + 1.1, y: TY + 1.0, z: zc + 1.1, w: 0.1, h: 0.4, d: 0.1, color: GOLD }); ctx.addFlame({ x: bx + 1.1, y: TY + 1.55, z: zc + 1.1, scale: 1.0 });
        ctx.addCollider({ x0: bx, x1: bx + 2.1, z0: zc - 3.2, z1: zc + 3.2 });
      })();
      // 개선 아치: 붉은 화강암 기둥 2 + 금 주두 + 아치 띠
      [-1, 1].forEach(function (s) {
        ctx.column({ x: s * 4.27, z: -6.7, y: TY, h: 5.8, r: 0.5, style: 'round', capital: 'composite', color: PINK, capColor: GOLD2, collide: true });
      });
      ctx.arch({ x: 0, y: TY + 5.8, z: -6.7, span: 8.54, rise: 3.4, t: 0.7, depth: 1.0, axis: 'x', type: 'round', color: STU2, seg: 20 });
      ctx.arch({ x: 0, y: TY + 5.8, z: -6.7, span: 9.9, rise: 3.8, t: 0.16, depth: 1.12, axis: 'x', type: 'round', color: GOLD, seg: 20 });

      mark('before');
      // =====================================================================
      // 6. 고딕 치보리오 + 교황 제대 (z=-10.65)
      // =====================================================================
      (function () {
        var cx = 0, cz = -10.65, y0 = TY + 0.2, hw = 1.6;
        B(-2.7, 2.7, TY, y0, cz - 2.7, cz + 2.7, MARB); B(-2.8, 2.8, TY, TY + 0.08, cz - 2.8, cz + 2.8, STU_SH);
        // 붉은 카펫 + 금 테
        B(-2.0, 2.0, y0, y0 + 0.014, cz - 2.0, cz + 2.7, 0xa8323a, { vary: 0 });
        B(-2.0, -1.92, y0 + 0.014, y0 + 0.02, cz - 2.0, cz + 2.7, GOLD2, { vary: 0 }); B(1.92, 2.0, y0 + 0.014, y0 + 0.02, cz - 2.0, cz + 2.7, GOLD2, { vary: 0 });
        ctx.addCollider({ x0: -2.8, x1: 2.8, z0: cz - 2.8, z1: cz + 2.8 });
        // 제대(금빛 앞면)
        B(-1.1, 1.1, y0, y0 + 1.0, cz - 0.5, cz + 0.5, 0xd9b45a); B(-1.2, 1.2, y0 + 0.95, y0 + 1.06, cz - 0.6, cz + 0.6, MARB);
        B(-0.9, 0.9, y0 + 0.15, y0 + 0.85, cz + 0.5, cz + 0.52, 0xb98a2e); B(-0.8, 0.8, y0 + 0.2, y0 + 0.8, cz + 0.52, cz + 0.54, 0x7a2222);
        ctx.box({ x: 0, y: y0 + 1.06, z: cz, w: 0.06, h: 0.7, d: 0.06, color: GOLD }); ctx.box({ x: 0, y: y0 + 1.5, z: cz, w: 0.36, h: 0.06, d: 0.06, color: GOLD });
        [-0.7, 0.7].forEach(function (x) { ctx.cyl({ x: x, y: y0 + 1.06, z: cz, r: 0.06, rTop: 0.04, h: 0.45, seg: 6, color: GOLD }); ctx.cyl({ x: x, y: y0 + 1.5, z: cz, r: 0.04, h: 0.3, seg: 6, color: 0xfff6e0 }); ctx.addFlame({ x: x, y: y0 + 1.95, z: cz, scale: 1.0 }); });
        // 화강암 기둥 4 (분홍 화강암, 금 주두, 받침)
        var CH = 3.5;
        [[-hw, -hw], [hw, -hw], [-hw, hw], [hw, hw]].forEach(function (p) {
          ctx.column({ x: cx + p[0], z: cz + p[1], y: y0, h: CH, r: 0.2, style: 'round', capital: 'corinthian', color: PINK, capColor: GOLD2, base: true, collide: true });
        });
        var ys = y0 + CH;
        // 뾰족 아치 4면
        [[0, -hw, 'x'], [0, hw, 'x'], [-hw, 0, 'z'], [hw, 0, 'z']].forEach(function (a) {
          ctx.arch({ x: cx + a[0], y: ys, z: cz + a[1], span: hw * 2 - 0.4, rise: 1.5, t: 0.3, depth: 0.42, axis: a[2], type: 'pointed', color: 0xf4ecda, seg: 12 });
          ctx.arch({ x: cx + a[0], y: ys, z: cz + a[1], span: hw * 2 - 0.4 - 0.55, rise: 1.2, t: 0.08, depth: 0.46, axis: a[2], type: 'pointed', color: GOLD, seg: 12 });
        });
        // 박공(뾰족 삼각형 + 금 테) 4면: 프레스코 띠(붉은색)와 남색 판
        B(cx - hw - 0.3, cx + hw + 0.3, ys, ys + 0.25, cz - hw - 0.3, cz + hw + 0.3, 0xf2ead8);
        B(cx - hw - 0.15, cx + hw + 0.15, ys + 0.25, ys + 0.45, cz - hw - 0.15, cz + hw + 0.15, GOLD);
        [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (f) {
          var along = f[0] === 0, e = hw + 0.3, apex = ys + 2.3, wall = hw + 0.05, pts;
          function Pp(u, y) { return along ? [cx + u, y, cz + f[1] * wall] : [cx + f[0] * wall, y, cz + u]; }
          var a0 = Pp(-e, ys + 0.45), a1 = Pp(e, ys + 0.45), a2 = Pp(0, apex), hint = along ? [cx, ys + 1, cz + f[1] * 5] : [cx + f[0] * 5, ys + 1, cz];
          solid.addTris([].concat(a0, a1, a2), 0xf0e7d3, hint);
          var b0 = Pp(-e + 0.35, ys + 0.6), b1 = Pp(e - 0.35, ys + 0.6), b2 = Pp(0, apex - 0.55), hint2 = along ? [cx, ys + 1, cz + f[1] * 6] : [cx + f[0] * 6, ys + 1, cz];
          solid.addTris([].concat(b0, b1, b2), 0x7c2a30, hint2);
          var c0 = Pp(-e + 0.7, ys + 0.75), c1 = Pp(e - 0.7, ys + 0.75), c2 = Pp(0, apex - 1.05);
          solid.addTris([].concat(c0, c1, c2), 0x274a85, hint2);
          solid.addBeam([a0[0], a0[1], a0[2]], [a2[0], a2[1], a2[2]], 0.12, 0.14, GOLD); solid.addBeam([a1[0], a1[1], a1[2]], [a2[0], a2[1], a2[2]], 0.12, 0.14, GOLD);
          for (var cr = 1; cr <= 4; cr++) { var tt = cr / 5; [a0, a1].forEach(function (aa) { ctx.ico({ x: aa[0] + (a2[0] - aa[0]) * tt, y: aa[1] + (a2[1] - aa[1]) * tt + 0.06, z: aa[2] + (a2[2] - aa[2]) * tt, r: 0.07, color: GOLD2, detail: 0 }); }); }
          ctx.cone({ x: a2[0], y: a2[1], z: a2[2], r: 0.09, h: 0.4, seg: 4, color: GOLD2 });
        });
        // 모서리 첨탑 4 + 작은 첨탑
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) {
          ctx.box({ x: cx + p[0] * (hw + 0.3), y: ys + 0.45, z: cz + p[1] * (hw + 0.3), w: 0.3, h: 0.4, d: 0.3, color: 0xf2ead8 });
          ctx.cone({ x: cx + p[0] * (hw + 0.3), y: ys + 0.85, z: cz + p[1] * (hw + 0.3), r: 0.2, h: 1.7, seg: 4, color: 0xf2ead8 });
          ctx.ico({ x: cx + p[0] * (hw + 0.3), y: ys + 2.62, z: cz + p[1] * (hw + 0.3), r: 0.08, color: GOLD2, detail: 0 });
        });
        // 위층: 금빛 격자 성유물 상자 + 사각뿔 첨탑 + 십자가
        B(cx - 0.9, cx + 0.9, ys + 0.45, ys + 1.65, cz - 0.9, cz + 0.9, GOLD2);
        [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (f) {
          var along = f[0] === 0; for (var gi = -2; gi <= 2; gi++) { if (along) B(cx + gi * 0.3 - 0.04, cx + gi * 0.3 + 0.04, ys + 0.55, ys + 1.55, cz + f[1] * 0.92 - 0.02, cz + f[1] * 0.92 + 0.02, 0x5a3a22); else B(cx + f[0] * 0.92 - 0.02, cx + f[0] * 0.92 + 0.02, ys + 0.55, ys + 1.55, cz + gi * 0.3 - 0.04, cz + gi * 0.3 + 0.04, 0x5a3a22); }
        });
        ctx.cyl({ x: cx, y: ys + 1.65, z: cz, r: 1.15, rTop: 0.1, h: 2.4, seg: 4, color: 0xf2ead8, ry: PI / 4 });
        ctx.cyl({ x: cx, y: ys + 4.05, z: cz, r: 0.05, h: 0.45, seg: 5, color: GOLD2 }); ctx.box({ x: cx, y: ys + 4.25, z: cz, w: 0.28, h: 0.05, d: 0.05, color: GOLD2 });
        ctx.addGlow({ x: cx, y: ys + 1.1, z: cz, size: 1.8, color: 0xffd98a, kind: 'lamp' });
        // 고해소(콘페시오): U자 난간
        var rz0 = -8.4, rz1 = -6.9;
        B(-1.7, 1.7, TY, TY + 0.02, rz0 - 0.1, rz1, 0x2a2a30);
        B(-1.8, 1.8, TY + 0.82, TY + 0.92, rz1 - 0.1, rz1 + 0.1, MARB); B(-1.8, -1.6, TY + 0.82, TY + 0.92, rz0, rz1, MARB); B(1.6, 1.8, TY + 0.82, TY + 0.92, rz0, rz1, MARB);
        B(-1.8, 1.8, TY, TY + 0.1, rz1 - 0.12, rz1 + 0.12, MARB);
        for (var bi = -9; bi <= 9; bi++) ctx.cyl({ x: bi * 0.19, y: TY + 0.1, z: rz1, r: 0.045, rTop: 0.035, h: 0.72, seg: 6, color: MARB });
        [-1.7, 1.7].forEach(function (x) { for (var bj = 0; bj < 7; bj++) ctx.cyl({ x: x, y: TY + 0.1, z: rz1 - 0.1 - bj * 0.21, r: 0.045, rTop: 0.035, h: 0.72, seg: 6, color: MARB }); });
        ctx.addCollider({ x0: -1.9, x1: 1.9, z0: rz0 - 0.1, z1: rz1 + 0.2 });
        ctx.addLight({ x: 0, y: 4.5, z: -9.5, color: 0xffc27a, intensity: 1.1, distance: 20, kind: 'lamp' });
      })();

      mark('before');
      // =====================================================================
      // 7. 성가대석 + 후진 + 교황좌
      // =====================================================================
      SIDES.forEach(function (s) {
        wallOpen({ axis: 'x', n0: Math.min(s * XN, s * (XN + 1)), n1: Math.max(s * XN, s * (XN + 1)), u0: ZAC, u1: ZT0, y0: 0, y1: HC, color: 0xe2d9c8, sillStone: MARB,
          wins: [{ c: -19.6, sill: 8.2, w: 1.5, h: 2.4, top: 'round' }, { c: -25.4, sill: 8.2, w: 1.5, h: 2.4, top: 'round' }] });
        [-19.6, -25.4].forEach(function (zz, i) { winAt({ x: s * (XN + 0.5), z: zz, sill: 8.2, w: 1.5, h: 2.4, top: 'round', face: [-s, 0], seed: 50 + i, colors: GLASS_WARM, pattern: 'lancet' }); });
        var lowTex2 = ctx.tex.pattern('stone', { c1: 0xe8dccd, c2: 0xd8c8b6 });
        ctx.wallFace({ x0: s * (XN - 0.01), z0: ZAC, x1: s * (XN - 0.01), z1: ZT0, y0: 1.6, y1: 4.6, facing: [-s, 0], tex: lowTex2, tile: [2.5, 2.9] });
        ctx.wallFace({ x0: s * (XN - 0.01), z0: ZAC, x1: s * (XN - 0.01), z1: ZT0, y0: 4.6, y1: 8.0, facing: [-s, 0], tex: texFresco, tile: [4.2, 3.4] });
        // 호두나무 참사회석
        var sx0 = s * (XN - 0.75), sx1 = s * XN;
        B(Math.min(sx0, sx1), Math.max(sx0, sx1), TY, TY + 0.45, ZAC + 1.0, ZT0 - 0.6, WALNUT); B(Math.min(s * (XN - 0.45), sx1), Math.max(s * (XN - 0.45), sx1), TY + 0.45, TY + 1.5, ZAC + 1.0, ZT0 - 0.6, col(WALNUT, 1.12));
        for (var sk = 0; sk < 9; sk++) { var zz2 = ZAC + 1.6 + sk * 1.45; B(Math.min(sx1, s * (XN - 0.5)), Math.max(sx1, s * (XN - 0.5)), TY + 0.5, TY + 1.9, zz2, zz2 + 0.1, 0x6a4529); }
        B(Math.min(s * (XN - 0.55), sx1), Math.max(s * (XN - 0.55), sx1), TY + 1.5, TY + 1.6, ZAC + 1.0, ZT0 - 0.6, GOLD);
        B(Math.min(sx0, sx1), Math.max(sx0, sx1), TY + 0.45, TY + 0.5, ZAC + 1.0, ZT0 - 0.6, col(WALNUT, 0.8));
        ctx.addCollider({ x0: Math.min(sx0, sx1), x1: Math.max(sx0, sx1), z0: ZAC + 1.0, z1: ZT0 - 0.6 });
        // 성가대 발코니(금 가림막) 3개
        [-18.4, -22.0, -25.6].forEach(function (zz) {
          B(Math.min(s * (XN - 0.55), s * XN), Math.max(s * (XN - 0.55), s * XN), 5.0, 5.4, zz - 0.9, zz + 0.9, GOLD2);
          B(Math.min(s * (XN - 0.5), s * XN), Math.max(s * (XN - 0.5), s * XN), 5.4, 6.6, zz - 0.9, zz + 0.9, 0x6b4a2a);
          B(Math.min(s * (XN - 0.55), s * (XN - 0.45)), Math.max(s * (XN - 0.55), s * (XN - 0.45)), 6.6, 6.8, zz - 0.95, zz + 0.95, GOLD2);
          for (var l = -3; l <= 3; l++) B(Math.min(s * (XN - 0.52), s * (XN - 0.46)), Math.max(s * (XN - 0.52), s * (XN - 0.46)), 5.5, 6.5, zz + l * 0.25 - 0.03, zz + l * 0.25 + 0.03, GOLD);
        });
      });
      // 후진 반원: 벽 + 창 4(실제 구멍) + 반돔 모자이크
      (function () {
        var R = XN, cx = 0, cz = ZAC, y0 = TY, WH = 7.0, yt = y0 + WH, RISE = R;
        var N = 90, wins = [28, 62, 118, 152], wsill = y0 + 3.5, whead = y0 + 5.9, half = 5.4;
        var pos = [], uv = [];
        function vtx(a, rad, y, wallV) { return [cx + rad * Math.cos(a), y, cz - rad * Math.sin(a), 1 - a / PI, (y - y0) / WH]; }
        function quad(A, B2, C, D) { [A, B2, C, A, C, D].forEach(function (v) { pos.push(v[0], v[1], v[2]); uv.push(v[3], v[4]); }); }
        function inHole(deg) { for (var i = 0; i < wins.length; i++) if (Math.abs(deg - wins[i]) <= half) return i + 1; return 0; }
        for (var i = 0; i < N; i++) {
          var a0 = i / N * PI, a1 = (i + 1) / N * PI, d = (i + 0.5) / N * 180, h = inHole(d);
          if (!h) quad(vtx(a0, R, y0), vtx(a1, R, y0), vtx(a1, R, yt), vtx(a0, R, yt));
          else {
            quad(vtx(a0, R, y0), vtx(a1, R, y0), vtx(a1, R, wsill), vtx(a0, R, wsill)); quad(vtx(a0, R, whead), vtx(a1, R, whead), vtx(a1, R, yt), vtx(a0, R, yt));
            var P0 = function (a, rad, y) { return [cx + rad * Math.cos(a), y, cz - rad * Math.sin(a)]; };
            solid.addQuad(P0(a0, R, wsill), P0(a1, R, wsill), P0(a1, R + 0.7, wsill), P0(a0, R + 0.7, wsill), 0xe7e0d2, [cx, wsill + 2, cz]);
            solid.addQuad(P0(a0, R, whead), P0(a1, R, whead), P0(a1, R + 0.7, whead), P0(a0, R + 0.7, whead), 0xdcd5c6, [cx, whead - 2, cz]);
          }
          var dprev = i / N * 180 - 0.0001;
          if (h && !inHole((i - 0.5) / N * 180)) { var Pp = function (a, rad, y) { return [cx + rad * Math.cos(a), y, cz - rad * Math.sin(a)]; }; solid.addQuad(Pp(a0, R, wsill), Pp(a0, R + 0.7, wsill), Pp(a0, R + 0.7, whead), Pp(a0, R, whead), 0xe2dbcc, [cx, (wsill + whead) / 2, cz - 0.0 + 1]); }
          if (h && !inHole((i + 1.5) / N * 180)) { var Pq = function (a, rad, y) { return [cx + rad * Math.cos(a), y, cz - rad * Math.sin(a)]; }; solid.addQuad(Pq(a1, R, wsill), Pq(a1, R + 0.7, wsill), Pq(a1, R + 0.7, whead), Pq(a1, R, whead), 0xe2dbcc, [cx, (wsill + whead) / 2, cz + 1]); }
        }
        var gw = new T.BufferGeometry();
        gw.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); gw.setAttribute('uv', new T.BufferAttribute(new Float32Array(uv), 2)); gw.computeVertexNormals();
        ctx.mesh(gw, matApseWall);
        wins.forEach(function (deg, i) {
          var a = deg * PI / 180, rr = R + 0.35;
          winAt({ x: cx + rr * Math.cos(a), z: cz - rr * Math.sin(a), sill: wsill, w: 1.0, h: whead - wsill - 0.5, top: 'pointed', face: [-Math.cos(a), Math.sin(a)], seed: 60 + i, colors: GLASS_STAIN, pattern: 'lancet' });
        });
        // 반돔(모자이크, 정면 투영 UV)
        var seg = Q(48), rings = Q(16), dp = [], du = [], di = [];
        for (var j = 0; j <= rings; j++) {
          var e = j / rings * PI / 2, rr2 = R * Math.cos(e), yy = yt + RISE * Math.sin(e);
          for (var q = 0; q <= seg; q++) { var an = q / seg * PI, x = cx + rr2 * Math.cos(an), z = cz - rr2 * Math.sin(an); dp.push(x, yy, z); du.push((x - cx) / (2 * R) + 0.5, (yy - yt) / RISE); }
        }
        for (j = 0; j < rings; j++) for (q = 0; q < seg; q++) { var a_ = j * (seg + 1) + q, b_ = a_ + 1, c_ = a_ + seg + 1, d_ = c_ + 1; di.push(a_, c_, b_, b_, c_, d_); }
        var gd = new T.BufferGeometry();
        gd.setAttribute('position', new T.BufferAttribute(new Float32Array(dp), 3)); gd.setAttribute('uv', new T.BufferAttribute(new Float32Array(du), 2)); gd.setIndex(di); gd.computeVertexNormals();
        ctx.mesh(gd, matMosaic);
        // 후진 입구 위 벽(아치 스팬드럴): 남색 + 금 아치 띠 + 천사
        spandrel({ axis: 'z', at: ZAC, c: 0, a: R, y0: yt, rise: RISE, top: HC, nrm: 1, color: NAVY });
        ctx.arch({ x: 0, y: yt, z: ZAC + 0.14, span: 2 * R, rise: RISE, t: 0.7, depth: 0.3, axis: 'x', type: 'round', color: GOLD2, seg: 28 });
        ctx.arch({ x: 0, y: yt, z: ZAC + 0.2, span: 2 * R + 1.7, rise: RISE + 0.6, t: 0.12, depth: 0.3, axis: 'x', type: 'round', color: STU2, seg: 28 });
        for (var dsh = 0; dsh < 22; dsh++) { var aa = PI * (0.1 + 0.8 * dsh / 21), rad = R + 1.15; ctx.box({ x: Math.cos(aa) * rad, y: yt + Math.sin(aa) * rad * (RISE / R), z: ZAC + 0.06, w: 0.34, h: 0.1, d: 0.04, color: GOLD2, ry: 0, rz: aa + PI / 2 }); }
        [-1, 1].forEach(function (s) {
          var ax = s * 3.6, ay = 12.0;
          ctx.box({ x: ax, y: ay - 0.5, z: ZAC + 0.06, w: 0.45, h: 1.2, d: 0.06, color: 0xf0e6cf });
          ctx.sphere({ x: ax, y: ay + 0.95, z: ZAC + 0.07, r: 0.22, color: 0xe8c8a6, w: 8, h: 6 }); ctx.solid.add(Geo.cyl(12, 1), GOLD2, { x: ax, y: ay + 0.95, z: ZAC + 0.04, rx: PI / 2, sx: 0.34, sy: 0.02, sz: 0.34, flat: true, vary: 0 });
          [-1, 1].forEach(function (w) { ctx.box({ x: ax + w * 0.65, y: ay + 0.1, z: ZAC + 0.05, w: 0.9, h: 0.16, d: 0.04, color: GOLD, rz: w * s * 0.5 }); ctx.box({ x: ax + w * 0.75, y: ay - 0.3, z: ZAC + 0.05, w: 0.7, h: 0.14, d: 0.04, color: GOLD2, rz: w * s * 0.35 }); });
        });
        // 후진 충돌(원 고리)
        var cn = Math.max(8, Math.round(PI * R / 0.9));
        for (var k = 0; k <= cn; k++) { var ak = PI * k / cn; ctx.addCollider({ x: cx + Math.cos(ak) * (R + 0.75), z: cz - Math.sin(ak) * (R + 0.75), r: 0.8 }); }
        // 교황좌(카테드라) 5단
        ctx.steps({ x0: -1.7, x1: 1.7, z0: -33.5, z1: -31.5, y0: TY, y1: TY + 0.5, n: 5, dir: [0, -1], color: MARB });
        B(-1.7, 1.7, TY, TY + 0.5, -34.3, -33.5, MARB); ctx.floorZone({ x0: -1.7, x1: 1.7, z0: -34.4, z1: -33.4, y: TY + 0.5 });
        B(-1.7, 1.7, TY + 0.4, TY + 0.5, -34.3, -31.5, PINK2);
        B(-0.55, 0.55, TY + 0.5, TY + 0.95, -34.1, -33.4, MARB); B(-0.6, 0.6, TY + 0.95, TY + 1.0, -34.1, -33.3, 0xa8323a);
        B(-0.6, 0.6, TY + 0.5, TY + 3.0, -34.3, -34.1, MARB);
        [-1, 1].forEach(function (s) { ctx.column({ x: s * 0.78, z: -33.6, y: TY + 0.5, h: 2.5, r: 0.1, style: 'round', capital: 'block', color: PINK, capColor: GOLD2, collide: false }); });
        ctx.arch({ x: 0, y: TY + 3.0, z: -33.6, span: 1.8, rise: 1.1, t: 0.2, depth: 0.45, axis: 'x', type: 'pointed', color: MARB });
        ctx.addCollider({ x0: -1.8, x1: 1.8, z0: -34.45, z1: -33.2 });
      })();

      mark('before');
      // =====================================================================
      // 8. 좌석 + 촛불대 + 조명
      // =====================================================================
      ctx.renderSeats(layout, 'bench', { wood: 0xa4713f, seat: 0xbd8a52, back: 0x8c5e36 });
      ctx.candleStand(0, { wood: 0x8a5d3b });
      ctx.setSky({ outside: false });
      ctx.setCameraBounds({ x0: -13.6, x1: 13.6, z0: -34.1, z1: 34.1, yMax: 13.0 });
    }
  };
})();
