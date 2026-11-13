/* ch_milan.js — 밀라노 대성당(Duomo di Milano) 내부. docs/church/interiors/milan.md (§2,§6,§11 채택값, scalePercent 47).
   5랑 신랑부(52 다발 기둥, 감실 주두) + 채색 리브 궁륭 + 익랑 + 팔각 티부리오 + 후진 대형 스테인드글라스 3개 + 높인 제대 구역. */
(function () {
  'use strict';
  var M = 4.512;            // 모듈(베이) = 9.6 m * 0.47
  var ZF = 34.9;            // 정면 안쪽 벽 z
  var XN = M, XA = 2 * M, XW = 3 * M, XT = 20.2;   // 중앙 신랑 기둥줄 / 측랑 기둥줄 / 바깥 벽 / 익랑 끝 벽
  function zk(k) { return ZF - M * k; }            // 기둥 가로줄 z (k=1..13)

  var layout = {
    id: 'milan', scalePercent: 47,
    bounds: { x0: -20.4, x1: 20.4, z0: -34.5, z1: 34.5 },
    spawn: { x: 0, z: 32.5, r: 0 },
    seatGroups: [
      { g: 'NL', rows: 12, perRow: 3, origin: { x: -1.3, z: -3.0 }, dx: -1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.6, 0.5] },
      { g: 'NR', rows: 12, perRow: 3, origin: { x: 1.3, z: -3.0 }, dx: 1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.6, 0.5] },
      { g: 'TL', rows: 4, perRow: 6, origin: { x: -10.6, z: -13.3 }, dx: -1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.6, 0.6], frontal: false },
      { g: 'TR', rows: 4, perRow: 6, origin: { x: 10.6, z: -13.3 }, dx: 1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.6, 0.6], frontal: false }
    ],
    candles: {
      stands: [
        { x: -11.7, z: 10.09, slots: 48, reach: 1.8, cols: 8, face: [1, 0], pitch: 0.5, step: 0.25, ystep: 0.3, y0: 0.8 },
        { x: 11.7, z: 10.09, slots: 48, reach: 1.8, cols: 8, face: [-1, 0], pitch: 0.5, step: 0.25, ystep: 0.3, y0: 0.8 }
      ]
    },
    info: { name: '밀라노 대성당', place: '이탈리아 밀라노', builtYear: '1386–1965' }
  };
  ChurchLayouts.register(layout);

  ChurchBuilders['milan'] = {
    layout: layout,
    thumb: { x: 0, z: 26, yaw: 0, pitch: 12, zoom: 1.35, hour: 14 },
    build: function (ctx) { buildMilan(ctx); }
  };

  /* ------------------------------------------------------------------ */
  function buildMilan(ctx) {
    var T = ctx.THREE, S = ctx.solid, GL = ctx.glass, GW = ctx.glow, PI = Math.PI;
    var MT = ctx.metalB || S, GS = ctx.gloss || S, WD = ctx.woodB || S, RF = (ctx._ && ctx._.batches && ctx._.batches.glassRefl) || null;
    var GG = window.ChurchGeo, Geo = GG.Geo;
    var _gc = {};
    function openCyl(seg, rt) { var k = 'oc' + seg + '_' + rt; return _gc[k] || (_gc[k] = new T.CylinderGeometry(rt, 1, 1, seg, 1, true).translate(0, 0.5, 0)); }
    function openCone(seg) { var k = 'ok' + seg; return _gc[k] || (_gc[k] = new T.ConeGeometry(1, 1, seg, 1, true).translate(0, 0.5, 0)); }
    function tetra() { return _gc.tet || (_gc.tet = new T.TetrahedronGeometry(1, 0)); }
    var rnd = ctx.rng(4711);
    function C(c) { return ctx.color(c); }
    function hyp(a, b) { return Math.sqrt(a * a + b * b); }
    function dist(p, q) { return hyp(p[0] - q[0], p[1] - q[1]); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    // 높이 상수(앱 m = 실제 × 0.47)
    var H_PIER = 11.28, SP_N = 14.66, Y_N = 21.8, SP_I = 11.28, SP_O = 7.9, R_AIS = 3.38, R_NAVE = Y_N - SP_N;
    var GOLD = 0xc9a24a, WALNUT = 0x4a3223;
    var PAL_HI = [0xb3171f, 0x2556b8, 0xb3171f, 0x1d3f9a, 0x2556b8, 0xe0a323, 0x7a1a2e, 0x1d3f9a, 0xe0a323, 0x2f8f55, 0x6b3fa6, 0xb3171f];
    var PAL_APSE = [0xb3171f, 0x1a46a8, 0xb3171f, 0x1a46a8, 0x2552b8, 0xe8a926, 0x9a1630, 0x1a46a8, 0xf0b93a, 0xb3171f, 0x6d1426, 0xd7ccb0, 0x2c8a4e, 0xe8a926];
    var HASP = !!(ctx.hasPhoto && ctx.hasPhoto('stone_grey') && ctx.surfBatch);
    var STONE = 0x948a80, STONE_L = 0xaaa096, STONE_D = 0x6a625a, PINKST = 0xa08f87, WALLC = HASP ? 0xe6dfd8 : 0x857c73;
    var WB = HASP ? ctx.surfBatch('stone_grey') : S;   // 벽·아케이드: 사진 석재 질감

    // 성당 내부 분위기: 코어 조명(반구광·태양·환경 반사·안개)을 내부용으로 낮춘다(밀라노는 어둡고 따뜻한 내부)
    var sceneRef = null, MOOD = { hemi: 0.62, dir: 0.8, env: 0.6 };
    ctx.onHour(function (env) {
      try {
        if (!sceneRef && ctx.root.parent && ctx.root.parent.parent) sceneRef = ctx.root.parent.parent;
        if (!sceneRef) return;
        sceneRef.children.forEach(function (o) {
          if (o.isHemisphereLight) o.intensity *= MOOD.hemi;
          if (o.isDirectionalLight) o.intensity *= MOOD.dir;
        });
        if (ctx._ && ctx._.physMats) ctx._.physMats.forEach(function (pm) { pm.m.envMapIntensity *= MOOD.env; });
        if (sceneRef.fog) { sceneRef.fog.color.multiplyScalar(0.55); sceneRef.fog.near = 45; sceneRef.fog.far = 150; }
      } catch (e) { /* ignore */ }
    });

    /* ===== 수학/도우미 ===== */
    // 첨두 아치 높이 함수(반폭 a, 높이 R)
    function pf(a, R) {
      var Rr = (a * a + R * R) / (2 * a), cx = Rr - a;
      return function (u) { var d = Math.abs(u) + cx, v = Rr * Rr - d * d; return v > 0 ? Math.sqrt(v) : 0; };
    }
    function pfInv(a, R) {
      var Rr = (a * a + R * R) / (2 * a), cx = Rr - a;
      return function (h) { var v = Rr * Rr - h * h; return v > 0 ? Math.max(0, Math.sqrt(v) - cx) : 0; };
    }
    function bil(P, u, w) {
      var s = (u + 1) / 2, t = (w + 1) / 2;
      return [(1 - s) * (1 - t) * P[0][0] + s * (1 - t) * P[1][0] + s * t * P[2][0] + (1 - s) * t * P[3][0],
        (1 - s) * (1 - t) * P[0][1] + s * (1 - t) * P[1][1] + s * t * P[2][1] + (1 - s) * t * P[3][1]];
    }
    function tone(base, k) { return C(base).clone().multiplyScalar(k); }

    // 리브(아래로 뾰족한 삼각 단면) 띠. pts: [[x,y,z]...], hint: 보는 쪽 점
    function ribStrip(pts, w, d, color, hint, flat) {
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i], p1 = pts[i + 1];
        var dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2], L = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (L < 1e-6) continue;
        dx /= L; dy /= L; dz /= L;
        var lx = -dz, lz = dx, ll = hyp(lx, lz);
        if (ll < 1e-4) { lx = 1; lz = 0; } else { lx /= ll; lz /= ll; }
        var nx = -lz * dy, ny = lz * dx - lx * dz, nz = lx * dy;
        var mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2, mz = (p0[2] + p1[2]) / 2;
        if (nx * (hint[0] - mx) + ny * (hint[1] - my) + nz * (hint[2] - mz) < 0) { nx = -nx; ny = -ny; nz = -nz; }
        var hw = w / 2;
        if (flat) {
          var dd = d * 0.7;
          S.addQuad([p0[0] + lx * hw + nx * dd, p0[1] + ny * dd, p0[2] + lz * hw + nz * dd], [p1[0] + lx * hw + nx * dd, p1[1] + ny * dd, p1[2] + lz * hw + nz * dd], [p1[0] - lx * hw + nx * dd, p1[1] + ny * dd, p1[2] - lz * hw + nz * dd], [p0[0] - lx * hw + nx * dd, p0[1] + ny * dd, p0[2] - lz * hw + nz * dd], color, [mx + nx * 5, my + ny * 5, mz + nz * 5], { vary: 0.03 });
          continue;
        }
        var L0 = [p0[0] + lx * hw, p0[1], p0[2] + lz * hw], R0 = [p0[0] - lx * hw, p0[1], p0[2] - lz * hw], A0 = [p0[0] + nx * d, p0[1] + ny * d, p0[2] + nz * d];
        var L1 = [p1[0] + lx * hw, p1[1], p1[2] + lz * hw], R1 = [p1[0] - lx * hw, p1[1], p1[2] - lz * hw], A1 = [p1[0] + nx * d, p1[1] + ny * d, p1[2] + nz * d];
        S.addQuad(L0, L1, A1, A0, color, [mx + lx * 5 + nx, my + ny, mz + lz * 5 + nz], { vary: 0.03 });
        S.addQuad(A0, A1, R1, R0, color, [mx - lx * 5 + nx, my + ny, mz - lz * 5 + nz], { vary: 0.03 });
      }
    }

    var secLog = [], secLast = 0;
    function tot() {
      var n = 0, B = (ctx._ && ctx._.batches) || {};
      Object.keys(B).forEach(function (k) { if (B[k] && B[k].p) n += B[k].p.length / 3; });
      if (typeof WB !== 'undefined' && WB !== S && WB.p) n += WB.p.length / 3;
      Object.keys(texGroupsRef).forEach(function (k) { n += texGroupsRef[k].pos.length / 3; });
      return n;
    }
    var texGroupsRef = {};
    function mark(name) { var t = tot(); secLog.push(name + ':' + Math.round(t - secLast)); secLast = t; ctx.stats.sections = secLog; }
    /* ===== 1. 질감(캔버스) ===== */
    // 채색 궁륭 질감: 첨두 교차 궁륭 한 칸(반폭 a,b / 높이 R). 웹 2색 + 트롱프뢰유 리브 + 금별
    function vaultTex(a, b, R, pal, wpx, hpx) {
      var fa = pf(a, R), fb = pf(b, R);
      return ctx.tex.custom(wpx, hpx, function (g, w, h) {
        var img = g.createImageData(w, h), d = img.data, i, j;
        function gdist(u, v) {   // 그루인(교차선)까지의 근사 거리(m)
          var e = 0.02, dd = fa(u) - fb(v);
          var gx = (fa(u + e) - fb(v) - (fa(u - e) - fb(v))) / (2 * e), gz = (fa(u) - fb(v + e) - (fa(u) - fb(v - e))) / (2 * e);
          var gl = hyp(gx, gz) + 1e-3;
          return { dd: dd, d: Math.abs(dd) / gl };
        }
        var cA = C(pal.webA), cB = C(pal.webB), cR = C(pal.rib), cD = C(pal.line), cG = C(pal.gold), cO = C(pal.ochre);
        function put(idx, c, k) { d[idx] = Math.min(255, c.r * 255 * k); d[idx + 1] = Math.min(255, c.g * 255 * k); d[idx + 2] = Math.min(255, c.b * 255 * k); d[idx + 3] = 255; }
        for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
          var s = (i + 0.5) / w, t = 1 - (j + 0.5) / h, u = (s * 2 - 1) * a, v = (t * 2 - 1) * b;
          var q = gdist(u, v), edge = Math.min(a - Math.abs(u), b - Math.abs(v));
          var n = 0.94 + 0.12 * (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453 % 1 + 1) % 1 * 0.5;
          var base = q.dd > 0 ? cA : cB, k = n;
          var dm = Math.min(q.d, edge);
          // 격자 무늬(웹 안의 가는 사선 장식)
          var band = Math.sin((q.dd > 0 ? (v * 1.7 + u * 0.4) : (u * 1.1 - v * 1.6)) * 7.0);
          var col = base;
          if (dm > 0.5) {
            if (band > 0.82) col = cO;
            // 금별 격자
            var sx = ((u / 0.82) % 1 + 1) % 1 - 0.5, sy = ((v / 0.82) % 1 + 1) % 1 - 0.5;
            if (Math.abs(sx) + Math.abs(sy) < 0.11 || (Math.abs(sx) < 0.025 && Math.abs(sy) < 0.2) || (Math.abs(sy) < 0.025 && Math.abs(sx) < 0.2)) col = cG;
          }
          if (dm < 0.34) { col = cR; k *= (dm < 0.07 ? 0.78 : (dm > 0.27 ? 0.86 : 1.0)); }
          else if (dm < 0.40) { col = cD; k *= 0.9; }
          else if (dm < 0.46) { col = cG; k *= 0.95; }
          // 정점 원형 장식
          var rc = hyp(u, v * (a / b) * 0.6);
          if (rc < 0.95) { col = rc < 0.55 ? cG : (rc < 0.8 ? cD : cO); }
          put((j * w + i) * 4, col, k);
        }
        g.putImageData(img, 0, 0);
      });
    }
    var PAL_A = { webA: 0x2e4a87, webB: 0x8a5a2b, rib: 0xc8baa4, line: 0x2b1e18, gold: 0xe0b445, ochre: 0xb98a3a };
    var PAL_B = { webA: 0x8a5a2b, webB: 0x2e4a87, rib: 0xc8baa4, line: 0x2b1e18, gold: 0xe0b445, ochre: 0xb98a3a };
    var tex = {};
    function getTex(key) {
      if (tex[key]) return tex[key];
      var pal = key.indexOf('B') === key.length - 1 ? PAL_B : PAL_A;
      if (key.indexOf('nave') === 0) tex[key] = vaultTex(M, M / 2, R_NAVE, pal, 512, 256);
      else if (key.indexOf('end') === 0) tex[key] = vaultTex(M, M * 0.738, R_NAVE, pal, 512, 320);
      else if (key.indexOf('aisE') === 0) tex[key] = vaultTex(M / 2, M * 0.738, R_AIS, pal, 256, 320);
      else tex[key] = vaultTex(M / 2, M / 2, R_AIS, pal, 256, 256);
      return tex[key];
    }
    // 바닥: 마름모 격자 상감(흰 분홍/회색 + 붉은·검은 포인트)
    var floorTex = ctx.tex.custom(512, 512, function (g, w, h) {
      var c = w / 2;
      g.fillStyle = '#cfc2b4'; g.fillRect(0, 0, w, h);
      for (var j = 0; j < 2; j++) for (var i = 0; i < 2; i++) {
        var cx = i * c + c / 2, cy = j * c + c / 2, r = c / 2;
        function dia(rr, col) { g.fillStyle = col; g.beginPath(); g.moveTo(cx, cy - rr); g.lineTo(cx + rr, cy); g.lineTo(cx, cy + rr); g.lineTo(cx - rr, cy); g.closePath(); g.fill(); }
        dia(r * 0.98, '#ece3d6'); dia(r * 0.72, '#b9bdc0'); dia(r * 0.5, '#9e3b32'); dia(r * 0.28, '#1f1f24'); dia(r * 0.12, '#e9dfd0');
        g.fillStyle = '#26262b'; g.fillRect(i * c - 3, j * c - 3, 6, 6);
      }
      g.strokeStyle = 'rgba(70,60,60,0.35)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
      for (var v = 0; v < 40; v++) { g.strokeStyle = 'rgba(110,95,90,' + (0.04 + rnd() * 0.07) + ')'; g.beginPath(); var x = rnd() * w, y = rnd() * h; g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 70, y + (rnd() - 0.5) * 50); g.stroke(); }
    });
    var crossTex = ctx.tex.custom(512, 512, function (g, w, h) {   // 교차부: 큰 별/원 상감
      var c = w / 2;
      g.fillStyle = '#b7a99a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1f1f24'; g.beginPath(); g.arc(c, c, c * 0.96, 0, 6.2832); g.fill();
      g.fillStyle = '#9e3b32'; g.beginPath(); g.arc(c, c, c * 0.88, 0, 6.2832); g.fill();
      g.fillStyle = '#d9cebf'; g.beginPath(); g.arc(c, c, c * 0.78, 0, 6.2832); g.fill();
      for (var k = 0; k < 16; k++) {
        var a0 = k * PI / 8, a1 = a0 + PI / 8, rr = c * 0.76;
        g.fillStyle = k % 2 ? '#a9a39c' : '#2a2a30';
        g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a0) * rr, c + Math.sin(a0) * rr); g.lineTo(c + Math.cos(a0 + PI / 16) * rr * 0.72, c + Math.sin(a0 + PI / 16) * rr * 0.72); g.lineTo(c + Math.cos(a1) * rr, c + Math.sin(a1) * rr); g.closePath(); g.fill();
      }
      g.fillStyle = '#e3b84a'; g.beginPath(); g.arc(c, c, c * 0.14, 0, 6.2832); g.fill();
      g.fillStyle = '#9e3b32'; g.beginPath(); g.arc(c, c, c * 0.07, 0, 6.2832); g.fill();
    });

    mark('tex');
    /* ===== 2. 바닥 ===== */
    ctx.floor({ x0: -XT, x1: XT, z0: -ZF, z1: ZF + 0.1, y: 0, tex: floorTex, tile: M });
    ctx.floor({ x0: -XN, x1: XN, z0: zk(11), z1: zk(9), y: 0.012, tex: crossTex, tile: 2 * XN });
    // 자오선(황동 띠) + 12궁 원판
    MT.add(Geo.box(), 0xd0a23a, { x: 0, y: 0.014, z: 32.0, sx: 2 * XW - 0.6, sy: 0.02, sz: 0.1, flat: true, vary: 0 });
    for (var zi = 0; zi < 12; zi++) S.add(Geo.cyl(10, 1), (zi % 2) ? 0xe6dccc : 0xa8795f, { x: -12.4 + zi * 2.25, y: 0.012, z: 32.0, sx: 0.4, sy: 0.025, sz: 0.4, flat: true, vary: 0 });
    // 제대 구역 단
    var SY = 0.8;
    S.add(Geo.box(), 0xbcaf9f, { x: 0, y: 0, z: (-12.6 - 29.0) / 2, sx: 8.8, sy: SY - 0.01, sz: 16.4, flat: true, vary: 0.02 });
    ctx.floor({ x0: -4.4, x1: 4.4, z0: -29.0, z1: -12.6, y: SY, tex: ctx.tex.pattern('diamond', { c1: 0xf2e9dd, c2: 0xb9a79a, c3: 0x9e3b32 }), tile: 2.256, zone: true });
    ctx.steps({ x0: -4.4, x1: 4.4, z0: -12.6, z1: -11.5, y0: 0, y1: SY, n: 2, dir: [0, -1], color: 0xe1d4c6 });
    // 붉은 단 가장자리
    S.add(Geo.box(), 0x9e3b32, { x: 0, y: SY - 0.04, z: -12.55, sx: 8.8, sy: 0.05, sz: 0.1, flat: true, vary: 0 });

    mark('floor');
    /* ===== 3. 궁륭(채색 질감 메시 + 리브) ===== */
    var texGroups = texGroupsRef, ribDone = {};
    function vaultCell(o) {
      var P = o.P, a = 0.5 * dist(P[0], P[1]), b = 0.5 * dist(P[0], P[3]), R = o.R, ySp = o.ySp;
      var fa = pf(a, R), fb = pf(b, R), nu = o.nu, nw = o.nw, i, j, pts = [];
      for (i = 0; i <= nu; i++) {
        pts[i] = [];
        var u = -1 + 2 * i / nu;
        for (j = 0; j <= nw; j++) {
          var w = -1 + 2 * j / nw, xz = bil(P, u, w);
          pts[i][j] = [xz[0], ySp + Math.max(fa(u * a), fb(w * b)), xz[1]];
        }
      }
      var ctr = bil(P, 0, 0), hint = [ctr[0], ySp - 4, ctr[1]];
      if (o.tex) {
        var tg = texGroups[o.tex] || (texGroups[o.tex] = { pos: [], uv: [] });
        for (i = 0; i < nu; i++) for (j = 0; j < nw; j++) {
          var A = pts[i][j], B = pts[i + 1][j], Cc = pts[i + 1][j + 1], D = pts[i][j + 1];
          var uA = [i / nu, j / nw], uB = [(i + 1) / nu, j / nw], uC = [(i + 1) / nu, (j + 1) / nw], uD = [i / nu, (j + 1) / nw];
          tg.pos.push(A[0], A[1], A[2], B[0], B[1], B[2], Cc[0], Cc[1], Cc[2], A[0], A[1], A[2], Cc[0], Cc[1], Cc[2], D[0], D[1], D[2]);
          tg.uv.push(uA[0], uA[1], uB[0], uB[1], uC[0], uC[1], uA[0], uA[1], uC[0], uC[1], uD[0], uD[1]);
        }
      } else {
        for (i = 0; i < nu; i++) for (j = 0; j < nw; j++) {
          var uu = -1 + 2 * (i + 0.5) / nu, ww = -1 + 2 * (j + 0.5) / nw;
          var dd = fa(uu * a) - fb(ww * b);
          var col = tone(dd > 0 ? o.colA : o.colB, 0.92 + 0.14 * rnd());
          S.addQuad(pts[i][j], pts[i + 1][j], pts[i + 1][j + 1], pts[i][j + 1], col, hint, { vary: 0.02 });
        }
      }
      if (o.rib) {
        var rw = o.rib.w, rd = o.rib.d, rc = o.rib.color, ns = o.rib.n || 8, inva = pfInv(a, R), invb = pfInv(b, R), k;
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (sg) {
          var pp = [];
          for (k = 0; k <= ns; k++) {
            var h = R * k / ns, uu2 = inva(h) / a * sg[0], ww2 = invb(h) / b * sg[1], xz2 = bil(P, uu2, ww2);
            pp.push([xz2[0], ySp + h - 0.03, xz2[1]]);
          }
          ribStrip(pp, rw, rd, rc, hint, o.rib.flat);
        });
        function edgeRib(isU, sgn) {
          var e0 = isU ? bil(P, -1, sgn) : bil(P, sgn, -1), e1 = isU ? bil(P, 1, sgn) : bil(P, sgn, 1);
          var key = [e0, e1].sort(function (p, q) { return p[0] - q[0] || p[1] - q[1]; }).map(function (p) { return Math.round(p[0] * 20) + ',' + Math.round(p[1] * 20); }).join('|') + '/' + ySp + '/' + R;
          if (ribDone[key]) return; ribDone[key] = 1;
          var pp = [], m = ns + 3;
          for (k = 0; k <= m; k++) {
            var t = -1 + 2 * k / m, xz2 = isU ? bil(P, t, sgn) : bil(P, sgn, t), hh = isU ? fa(t * a) : fb(t * b);
            pp.push([xz2[0], ySp + hh - 0.03, xz2[1]]);
          }
          ribStrip(pp, rw * 1.15, rd * 1.1, rc, hint, o.rib.flat);
        }
        edgeRib(true, -1); edgeRib(true, 1); edgeRib(false, -1); edgeRib(false, 1);
        if (o.boss !== false) MT.add(Geo.ico(0), GOLD, { x: ctr[0], y: ySp + R - 0.25, z: ctr[1], sx: rw * 0.95, sy: rw * 0.7, sz: rw * 0.95, flat: true, vary: 0 });
      }
    }
    // 높은 칸(신랑형) / 측랑 칸 도우미
    var navRib = { w: 0.42, d: 0.34, color: 0x9d9180, n: 6 }, aisRib = { w: 0.3, d: 0.24, color: 0x908574, n: 4, flat: true };
    var cellN = 0;
    function highCell(x0, x1, z0, z1, axisZ) {   // axisZ: 신랑형(u=x) / false: 익랑형(u=z)
      var P = axisZ ? [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] : [[x0, z0], [x0, z1], [x1, z1], [x1, z0]];
      var b = axisZ ? (z1 - z0) / 2 : (x1 - x0) / 2;
      var key = Math.abs(b - M / 2) < 0.05 ? 'nave' : 'end';
      vaultCell({ P: P, ySp: SP_N, R: R_NAVE, nu: 12, nw: 6, tex: key + ((cellN++ % 2) ? 'B' : 'A'), rib: navRib });
    }
    function lowCell(x0, x1, z0, z1, ySp, axisZ) {
      var P = axisZ ? [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] : [[x0, z0], [x0, z1], [x1, z1], [x1, z0]];
      var b = axisZ ? (z1 - z0) / 2 : (x1 - x0) / 2;
      var key = Math.abs(b - M / 2) < 0.05 ? 'ais' : 'aisE';
      vaultCell({ P: P, ySp: ySp, R: R_AIS, nu: 6, nw: 6, tex: key + ((cellN++ % 2) ? 'B' : 'A'), rib: aisRib, boss: true });
    }
    var s, k;
    for (k = 1; k <= 9; k++) {   // 중앙 신랑 9칸
      highCell(-XN, XN, zk(k), zk(k - 1), true);
      [-1, 1].forEach(function (sg) {
        lowCell(sg < 0 ? -XA : XN, sg < 0 ? -XN : XA, zk(k), zk(k - 1), SP_I, true);
        lowCell(sg < 0 ? -XW : XA, sg < 0 ? -XA : XW, zk(k), zk(k - 1), SP_O, true);
      });
    }
    // 신랑 위 연장: 성가대(사제단) 2칸 + 측랑 연장 B10
    highCell(-XN, XN, zk(12), zk(11), true);
    highCell(-XN, XN, zk(13), zk(12), true);
    [-1, 1].forEach(function (sg) {
      lowCell(sg < 0 ? -XA : XN, sg < 0 ? -XN : XA, zk(12), zk(11), SP_I, true);
      lowCell(sg < 0 ? -XW : XA, sg < 0 ? -XA : XW, zk(12), zk(11), SP_O, true);
      // 익랑 팔: 중앙(높은) 칸 2 + 끝 칸, 팔 측랑 끝 칸
      highCell(sg < 0 ? -XA : XN, sg < 0 ? -XN : XA, zk(11), zk(9), false);
      highCell(sg < 0 ? -XW : XA, sg < 0 ? -XA : XW, zk(11), zk(9), false);
      highCell(sg < 0 ? -XT : XW, sg < 0 ? -XW : XT, zk(11), zk(9), false);
      lowCell(sg < 0 ? -XT : XW, sg < 0 ? -XW : XT, zk(9), zk(8), SP_O, false);
      lowCell(sg < 0 ? -XT : XW, sg < 0 ? -XW : XT, zk(12), zk(11), SP_O, false);
    });
    // 아케이드 위가 아닌 측랑(성구실 쪽) 칸 B11
    [-1, 1].forEach(function (sg) { lowCell(sg < 0 ? -XA : XN, sg < 0 ? -XN : XA, zk(13), zk(12), SP_I, true); });

    // 주보랑(후진 둘레) 5칸: 안쪽 기둥 고리 -> 바깥 벽 다각형
    var RING = [[XN, zk(13)], [4.04, -26.9], [1.74, -29.5], [-1.74, -29.5], [-4.04, -26.9], [-XN, zk(13)]];
    var OUTW = [[XA, zk(13)], [XA, -29.0], [4.0, -34.9], [-4.0, -34.9], [-XA, -29.0], [-XA, zk(13)]];
    var ambC = [0xa56b33, 0x4a63a0];
    for (k = 0; k < 5; k++) {
      vaultCell({ P: [RING[k], OUTW[k], OUTW[k + 1], RING[k + 1]], ySp: SP_I, R: R_AIS, nu: 8, nw: 8, colA: ambC[k % 2], colB: ambC[(k + 1) % 2], rib: { w: 0.3, d: 0.24, color: 0x908574, n: 6 } });
    }
    // 후진 중앙 궁륭: 기둥 고리(RING) 안쪽 부채꼴 5면 -> 정점 K
    var KP = [0, -25.9], apseHint = [0, 10, -26];
    var apseRibs = [];
    for (k = 0; k < 6; k++) {
      var E0 = RING[k], E1 = RING[(k + 1) % 6], edgeLen = dist(E0, E1), fbE = pf(edgeLen / 2, k === 5 ? R_NAVE : 4.4);
      var nS = 8, nT = 7;
      for (var ti = 0; ti < nT; ti++) for (var si = 0; si < nS; si++) {
        function pt(t, sx) {
          var ex = lerp(E0[0], E1[0], sx), ez = lerp(E0[1], E1[1], sx);
          var px = lerp(KP[0], ex, t), pz = lerp(KP[1], ez, t);
          var h = Math.max(R_NAVE * (1 - Math.pow(t, 1.6)), fbE((sx - 0.5) * edgeLen));
          return [px, SP_N + h, pz];
        }
        var t0 = ti / nT, t1 = (ti + 1) / nT, s0 = si / nS, s1 = (si + 1) / nS;
        S.addQuad(pt(t0, s0), pt(t0, s1), pt(t1, s1), pt(t1, s0), tone((ti + si) % 2 ? 0x2e4a87 : 0x8a5a2b, 0.95 + 0.1 * rnd()), apseHint, { vary: 0.02 });
      }
      // 리브: 기둥 -> 정점
      var rp = [];
      for (var q = 0; q <= 8; q++) { var tt = 1 - q / 8; var ex0 = E0[0], ez0 = E0[1]; rp.push([lerp(KP[0], ex0, tt), SP_N + R_NAVE * (1 - Math.pow(tt, 1.6)) - 0.03, lerp(KP[1], ez0, tt)]); }
      ribStrip(rp, 0.42, 0.34, 0x9d9180, apseHint);
      var ep = [];
      for (q = 0; q <= 12; q++) { var ss = q / 12; ep.push([lerp(E0[0], E1[0], ss), SP_N + fbE((ss - 0.5) * edgeLen) - 0.03, lerp(E0[1], E1[1], ss)]); }
      if (k !== 5) ribStrip(ep, 0.42, 0.34, 0x9d9180, apseHint);
    }
    MT.add(Geo.ico(0), GOLD, { x: KP[0], y: SP_N + R_NAVE - 0.3, z: KP[1], sx: 0.5, sy: 0.4, sz: 0.5, flat: true, vary: 0 });
    // 거룩한 못의 붉은 등
    GW.add(Geo.sph(8, 6), 0xff4a38, { x: 0, y: SP_N + R_NAVE - 1.1, z: KP[1], s: 0.2, vary: 0 });
    ctx.addGlow({ x: 0, y: SP_N + R_NAVE - 1.1, z: KP[1], size: 2.6, color: 0xff3a28, kind: 'always', pulse: 0.2 });

    mark('vault');
    /* ===== 4. 교차부 + 팔각 티부리오 ===== */
    (function tiburio() {
      var cx = 0, cz = (zk(9) + zk(11)) / 2, a = XN, Y_OCT = 23.2;
      var fa = pf(a, R_NAVE);
      var hintIn = [cx, 18, cz];
      // 4면 첨두 아치(고리) + 팀파눔
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) {
        var N = 14, low = [], high = [], thick = 0.55, i;
        // 평면: d = 바깥 방향. 면 위치
        function P3(u, y, side) {   // u: 면 따라(-a..a), side: 면 두께 방향
          if (d[0] === 0) return [cx + u, y, cz + d[1] * a + side * d[1]];
          return [cx + d[0] * a + side * d[0], y, cz + u];
        }
        // 고리: 안쪽 곡선(intrados) -> 바깥 곡선(+두께)
        var ring = [];
        for (i = 0; i <= N; i++) {
          var u = -a + 2 * a * i / N, yi = SP_N + fa(u);
          ring.push([u, yi, yi + thick * 1.3]);
        }
        // 팀파눔 상단 선: K(±a, 18) -> P(±1.87, Y_OCT) -> 평평
        function upper(u) {
          var au = Math.abs(u), p = 1.87;
          if (au >= p) return lerp(Y_OCT, 18.0, (au - p) / (a - p));
          return Y_OCT;
        }
        for (i = 0; i < N; i++) {
          var r0 = ring[i], r1 = ring[i + 1];
          // 고리 면(안쪽을 향하는 면)
          [-0.35, 0.35].forEach(function (sd) {
            S.addQuad(P3(r0[0], r0[1], sd), P3(r1[0], r1[1], sd), P3(r1[0], r1[2], sd), P3(r0[0], r0[2], sd), STONE_L, [cx + (d[0] === 0 ? 0 : -d[0] * 3 * Math.sign(sd)), 18, cz + (d[1] === 0 ? 0 : -d[1] * 3 * Math.sign(sd))], { vary: 0.03 });
          });
          // 저면(소핏)
          S.addQuad(P3(r0[0], r0[1], -0.35), P3(r1[0], r1[1], -0.35), P3(r1[0], r1[1], 0.35), P3(r0[0], r0[1], 0.35), STONE, [cx, 12, cz], { vary: 0.03 });
          // 팀파눔
          var y0a = r0[2], y1a = r1[2], ya0 = upper(r0[0]), ya1 = upper(r1[0]);
          if (ya0 > y0a + 0.01 || ya1 > y1a + 0.01) {
            var q0 = P3(r0[0], y0a, 0), q1 = P3(r1[0], y1a, 0), q2 = P3(r1[0], Math.max(ya1, y1a), 0), q3 = P3(r0[0], Math.max(ya0, y0a), 0);
            S.addQuad(q0, q1, q2, q3, tone(0x8f7e6a, 0.95 + rnd() * 0.1), hintIn, { vary: 0.02 });
          }
        }
        // 팀파눔 메달리온(교회 박사): 금 원판 2
        [-2.2, 2.2].forEach(function (uo) {
          var ym = upper(uo) - 1.0, c0 = P3(uo, ym, -0.02);
          var rr = 0.62;
          MT.add(Geo.cyl(12, 1), 0xd5a840, { x: c0[0], y: c0[1], z: c0[2], rx: d[0] === 0 ? PI / 2 : 0, rz: d[0] === 0 ? 0 : PI / 2, sx: rr, sy: 0.04, sz: rr, flat: true, vary: 0 });
          S.add(Geo.cyl(12, 1), 0x2e4a87, { x: c0[0] - (d[0] === 0 ? 0 : d[0] * 0.03), y: c0[1], z: c0[2] - (d[1] === 0 ? 0 : d[1] * 0.03), rx: d[0] === 0 ? PI / 2 : 0, rz: d[0] === 0 ? 0 : PI / 2, sx: rr * 0.78, sy: 0.05, sz: rr * 0.78, flat: true, vary: 0 });
        });
      });
      // 펜던티브(네 모서리): K(±a, 18, ±a) 부터 팔각 바닥으로 오르는 삼각형
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c) {
        var K = [cx + c[0] * a, 18.0, cz + c[1] * a], Pp = [cx + c[0] * a, Y_OCT, cz + c[1] * 1.87], Qq = [cx + c[0] * 1.87, Y_OCT, cz + c[1] * a];
        S.addTris([K[0], K[1], K[2], Pp[0], Pp[1], Pp[2], Qq[0], Qq[1], Qq[2]], tone(0x9d7a4e, 1.0), [cx, 16, cz], { vary: 0.03 });
        // 메달리온 장식
        var mid = [(K[0] + Pp[0] + Qq[0]) / 3, (K[1] + Pp[1] + Qq[1]) / 3 + 0.2, (K[2] + Pp[2] + Qq[2]) / 3];
        MT.add(Geo.cyl(10, 1), 0xd5a840, { x: mid[0] - c[0] * 0.15, y: mid[1], z: mid[2] - c[1] * 0.15, rx: 0.6 * c[1], rz: -0.6 * c[0], sx: 0.7, sy: 0.04, sz: 0.7, flat: true, vary: 0 });
      });
      // 팔각 드럼(8면) + 창, 팔각 첨두 돔
      var apo = a, RO = apo / Math.cos(PI / 8), DH = 3.6;
      var ov = [], i;
      for (i = 0; i < 8; i++) { var an = PI / 8 + i * PI / 4; ov.push([cx + Math.cos(an) * RO, cz + Math.sin(an) * RO, an]); }
      for (i = 0; i < 8; i++) {
        var A = ov[i], B = ov[(i + 1) % 8], mid2 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], nxy = [cx - mid2[0], cz - mid2[1]], nl = hyp(nxy[0], nxy[1]);
        var Fw = { x: mid2[0], z: mid2[1], nx: nxy[0] / nl, nz: nxy[1] / nl };
        Fw.ux = Fw.nz; Fw.uz = -Fw.nx;
        windowPanel({ F: Fw, W: dist(A, B), y0: Y_OCT, y1: Y_OCT + DH, color: 0x9d9180, win: { sill: Y_OCT + 0.55, w: 1.5, h: 1.45, rise: 1.0, lights: 2, rows: 2, pal: PAL_HI, seed: 30 + i, splay: 0.22, dg: 0.3, beam: 0.9, beamReach: 12 } });
      }
      // 드럼 위 코니스
      for (i = 0; i < 8; i++) { var A2 = ov[i], B2 = ov[(i + 1) % 8]; S.addQuad([A2[0], Y_OCT + DH, A2[1]], [B2[0], Y_OCT + DH, B2[1]], [B2[0] * 0.995 + cx * 0.005, Y_OCT + DH + 0.25, B2[1]], [A2[0] * 0.995, Y_OCT + DH + 0.25, A2[1]], 0xa89d8f, [cx, Y_OCT + 2, cz], { vary: 0.02 }); }
      var yD = Y_OCT + DH, domeRise = 30.46 - yD, fdome = pf(RO, domeRise), ringsN = 6;
      var domeCols = [0x2c4580, 0x3a5aa0];
      for (var ri = 0; ri < ringsN; ri++) {
        var rr0 = RO * (1 - ri / ringsN), rr1 = RO * (1 - (ri + 1) / ringsN);
        // pointed profile: height as function of radius
        var h0 = fdome(rr0), h1 = ri === ringsN - 1 ? domeRise : fdome(rr1);
        for (i = 0; i < 8; i++) {
          var an0 = PI / 8 + i * PI / 4, an1 = an0 + PI / 4;
          var p00 = [cx + Math.cos(an0) * rr0, yD + h0, cz + Math.sin(an0) * rr0], p01 = [cx + Math.cos(an1) * rr0, yD + h0, cz + Math.sin(an1) * rr0];
          var p10 = [cx + Math.cos(an0) * rr1, yD + h1, cz + Math.sin(an0) * rr1], p11 = [cx + Math.cos(an1) * rr1, yD + h1, cz + Math.sin(an1) * rr1];
          var col = tone(domeCols[(ri + i) % 2], 0.95 + 0.1 * rnd());
          if (ri === ringsN - 1) S.addTris([p00[0], p00[1], p00[2], p01[0], p01[1], p01[2], p10[0], p10[1], p10[2]], col, [cx, yD - 2, cz], { vary: 0.02 });
          else S.addQuad(p00, p01, p11, p10, col, [cx, yD - 2, cz], { vary: 0.02 });
          // 금별
          if (ri > 0 && ri < ringsN - 1) {
            var mx = (p00[0] + p01[0] + p10[0] + p11[0]) / 4, my = (p00[1] + p01[1] + p10[1] + p11[1]) / 4 - 0.05, mz = (p00[2] + p01[2] + p10[2] + p11[2]) / 4;
            MT.add(Geo.ico(0), 0xe3b84a, { x: mx, y: my, z: mz, s: 0.17, flat: true, vary: 0 });
          }
        }
      }
      // 돔 리브 8 + 정점 채광탑(빛)
      for (i = 0; i < 8; i++) {
        var ang = PI / 8 + i * PI / 4, rp2 = [];
        for (var q2 = 0; q2 <= 12; q2++) { var rr = RO * (1 - q2 / 12); rp2.push([cx + Math.cos(ang) * rr, yD + (q2 === 12 ? domeRise : fdome(rr)) - 0.05, cz + Math.sin(ang) * rr]); }
        ribStrip(rp2, 0.38, 0.3, 0xa79882, [cx, yD - 3, cz]);
      }
      GW.add(Geo.cyl(8, 1), 0xfff0c8, { x: cx, y: 30.3, z: cz, sx: 0.8, sy: 0.12, sz: 0.8, flat: true, vary: 0 });
      ctx.addGlow({ x: cx, y: 29.6, z: cz, size: 7, color: 0xffe2a8, kind: 'always' });
      // 교차부 상부 빛줄기
      for (i = 0; i < 4; i++) {
        var ab = i * PI / 2 + PI / 4;
        ctx.addWindowBeam({ x: cx + Math.cos(ab) * 3.0, y: Y_OCT + 2.0, z: cz + Math.sin(ab) * 3.0, face: [-Math.cos(ab), -Math.sin(ab)], w: 0.9, h: 1.3, colors: [0xffe3a0, 0xffd27a, 0xfff2cf], reach: 8, dome: true });
      }
    })();

    mark('tiburio');
    /* ===== 5. 기둥(인스턴스 템플릿) ===== */
    var pierList = [];
    for (k = 1; k <= 8; k++) [-XA, -XN, XN, XA].forEach(function (x) { pierList.push([x, zk(k), 1]); });
    [-XW, -XA, -XN, XN, XA, XW].forEach(function (x) { pierList.push([x, zk(9), Math.abs(x) === XN ? 1.17 : 1]); pierList.push([x, zk(11), Math.abs(x) === XN ? 1.17 : 1]); });
    [-XN, XN].forEach(function (x) { pierList.push([x, zk(12), 1]); pierList.push([x, zk(13), 1]); });
    [[4.04, -26.9], [-4.04, -26.9], [1.74, -29.5], [-1.74, -29.5]].forEach(function (p) { pierList.push([p[0], p[1], 1]); });
    (function piers() {
      var tb = new GG.Batch(5), tg = new GG.Batch(6);   // tg: 광택 대리석 몸통, tb: 나머지 석재
      var ROSE = !!(ctx.hasPhoto && ctx.hasPhoto('marble_rose') && tg.enableUV && ctx.mats.surface);
      if (ROSE) { var td = ctx.surfaces && ctx.surfaces.marble_rose, tl = td && td.tile ? td.tile : 1.6; tg.enableUV(tl, tl); }
      function cyl(bt, seg, r, rt, y, h, col, ry) { bt.add(Geo.cyl(seg, rt / r), col, { x: 0, y: y, z: 0, sx: r, sy: h, sz: r, ry: ry || 0, flat: true, vary: 0.02 }); }
      function ocyl(bt, seg, r, rt, y, h, col, ry) { bt.add(openCyl(seg, rt / r), col, { x: 0, y: y, z: 0, sx: r, sy: h, sz: r, ry: ry || 0, flat: true, vary: 0.02 }); }
      function cone(bt, seg, r, y, h, col, ry, x, z) { bt.add(openCone(seg), col, { x: x || 0, y: y, z: z || 0, sx: r, sy: h, sz: r, ry: ry || 0, flat: true, vary: 0.02 }); }
      // 받침
      cyl(tb, 8, 0.98, 0.98, 0, 0.3, 0x9b9188, PI / 8);
      cyl(tb, 8, 0.84, 0.8, 0.3, 0.34, 0xaaa095, PI / 8);
      // 다발 기둥 몸통: 24각 물결 단면 2단(사진 대리석)
      var ys = [0.64, 5.9, H_PIER], i, c, N = 24;
      var prof = [];
      for (i = 0; i < N; i++) { var an = i / N * PI * 2, r = (i % 3 === 1 ? 0.67 : 0.57); prof.push([Math.cos(an) * r, Math.sin(an) * r]); }
      for (c = 0; c < 2; c++) {
        var col = ROSE ? tone(c === 1 ? 0xcdc3bf : 0xc3bcb8, 0.95 + 0.1 * rnd()) : tone(c === 1 ? PINKST : STONE, 0.97 + 0.06 * rnd());
        for (i = 0; i < N; i++) {
          var p0 = prof[i], p1 = prof[(i + 1) % N];
          tg.addQuad([p0[0], ys[c], p0[1]], [p1[0], ys[c], p1[1]], [p1[0], ys[c + 1], p1[1]], [p0[0], ys[c + 1], p0[1]], tone(col, 0.92 + 0.16 * rnd()), [(p0[0] + p1[0]) * 4, (ys[c] + ys[c + 1]) / 2, (p0[1] + p1[1]) * 4], { vary: 0.03 });
        }
      }
      ocyl(tb, 10, 0.7, 0.7, 5.84, 0.14, STONE_L);
      // 주두 아래 칼라
      ocyl(tb, 8, 0.74, 0.92, H_PIER - 0.02, 0.3, STONE_L, PI / 8);
      // 감실 주두 띠: 팔각 몸체 + 4 감실(성인상) + 천개 + 첨탑
      var y0 = H_PIER + 0.28;
      cyl(tb, 8, 1.12, 1.18, y0, 0.2, 0xb4aa9e, PI / 8);
      ocyl(tb, 8, 1.02, 1.02, y0 + 0.2, 1.75, 0xaaa094, PI / 8);
      cyl(tb, 8, 1.18, 1.0, y0 + 1.95, 0.3, 0xb4aa9e, PI / 8);
      for (i = 0; i < 4; i++) {
        var ang = i * PI / 2, cx = Math.sin(ang), cz = Math.cos(ang), rr = 0.97;
        tb.add(Geo.box(), 0x3b352f, { x: cx * rr, y: y0 + 0.4, z: cz * rr, ry: ang, sx: 0.62, sy: 1.25, sz: 0.2, flat: true, vary: 0.02 });
        cone(tb, 5, 0.17, y0 + 0.45, 0.88, 0xf0e8da, 0, cx * (rr + 0.1), cz * (rr + 0.1));
        tb.add(tetra(), 0xf2e6d2, { x: cx * (rr + 0.1), y: y0 + 1.4, z: cz * (rr + 0.1), s: 0.11, flat: true, vary: 0 });
        cone(tb, 4, 0.46, y0 + 1.5, 0.7, 0xbfb5a8, ang + PI / 4, cx * (rr + 0.04), cz * (rr + 0.04));
        var ang2 = ang + PI / 4, px = Math.sin(ang2) * 1.0, pz = Math.cos(ang2) * 1.0;
        cone(tb, 4, 0.14, y0 + 1.95, 0.95, 0xb0a69a, PI / 4, px, pz);
      }
      ocyl(tb, 8, 0.84, 0.9, y0 + 2.25, 0.35, 0xb0a69a, PI / 8);
      var aoo = (ctx._ && ctx._.aoOpts) || {};
      if (tb.bakeAO) { tb.bakeAO(aoo); tg.bakeAO(aoo); }
      var m4 = new T.Matrix4(), tc = new T.Color(), insts = [];
      var shaftMat = ROSE ? ctx.mats.surface('marble_rose', { vertex: true }) : (ctx.mats.gloss || ctx.mats.solid);
      [[tb, ctx.mats.solid], [tg, shaftMat]].forEach(function (pr) {
        var grp = pr[0].build(pr[1], 'pier');
        var inst = new T.InstancedMesh(grp.children[0].geometry, pr[1], pierList.length);
        inst.frustumCulled = false; inst.castShadow = true; inst.receiveShadow = true;
        insts.push(inst);
        ctx.add(inst); ctx.stats.meshes++;
        ctx.stats.instancedVerts = (ctx.stats.instancedVerts || 0) + (pr[0].p.length / 3) * pierList.length;
      });
      pierList.forEach(function (p, idx) {
        m4.makeScale(p[2], 1, p[2]); m4.setPosition(p[0], 0, p[1]);
        var tk = 0.94 + 0.12 * rnd(); tc.setRGB(tk, tk * 0.99, tk * 0.98);
        insts.forEach(function (inst) { inst.setMatrixAt(idx, m4); inst.setColorAt(idx, tc); });
        ctx.addCollider({ x: p[0], z: p[1], r: 0.78 * p[2] });
        if (ctx.aoDecalCircle) ctx.aoDecalCircle({ x: p[0], z: p[1], r: 1.0 * p[2], pad: 0.55 });
      });
      // 신랑 줄 기둥: 주두 위 세로 궁륭 다발(리브 받침) 14.66까지, 교차부 4기둥 14.66까지
      pierList.forEach(function (p) {
        if (Math.abs(Math.abs(p[0]) - XN) < 0.01) {
          ctx.cyl({ x: p[0], y: H_PIER + 2.9, z: p[1], r: 0.46 * p[2], rTop: 0.34 * p[2], h: SP_N - H_PIER - 2.9 + 0.1, seg: 8, color: STONE_L });
        }
      });
      // LED 점등(기둥 중간)
      pierList.forEach(function (p) {
        if (Math.abs(Math.abs(p[0]) - XN) < 0.01 || Math.abs(Math.abs(p[0]) - XA) < 0.01) {
          var side = p[0] > 0 ? 1 : -1;
          GW.add(Geo.sph(5, 3), 0xfff0d0, { x: p[0] - side * 0.1, y: 9.6, z: p[1] + 0.75, s: 0.1, flat: true, vary: 0 });
        }
      });
    })();

    mark('piers');
    /* ===== 6. 벽 패널 + 창(진짜 개구부, 스테인드글라스) ===== */
    function PF(F, u, v, d) { return [F.x + F.ux * u - F.nx * d, v, F.z + F.uz * u - F.nz * d]; }
    function outlinePts(w, sill, h, rise, n) {
      var a = w / 2, f = pf(a, rise), pts = [[-a, sill], [a, sill], [a, sill + h]], kk;
      for (kk = 1; kk < n; kk++) { var u = a - 2 * a * kk / n; pts.push([u, sill + h + f(u)]); }
      pts.push([-a, sill + h]);
      return pts;
    }
    function cross2(a, b) { return a[0] * b[1] - a[1] * b[0]; }
    function rayHit(c, dir, poly) {
      var best = null, bt = 1e9, n = poly.length;
      for (var i = 0; i < n; i++) {
        var p1 = poly[i], p2 = poly[(i + 1) % n], e = [p2[0] - p1[0], p2[1] - p1[1]], den = cross2(dir, e);
        if (Math.abs(den) < 1e-9) continue;
        var d1 = [p1[0] - c[0], p1[1] - c[1]], t = cross2(d1, e) / den, s = cross2(d1, dir) / den;
        if (t > 1e-9 && s >= -1e-7 && s <= 1 + 1e-7 && t < bt) { bt = t; best = { p: [c[0] + dir[0] * t, c[1] + dir[1] * t], e: i }; }
      }
      return best;
    }
    // 내부 외곽선(볼록 다각형 outer)과 구멍(inner) 사이를 삼각형으로 채운다(구멍은 c 에 대해 별 모양)
    function starRing(c, inner, outer) {
      var tris = [], n = inner.length, hits = [], i, j;
      for (i = 0; i < n; i++) hits.push(rayHit(c, [inner[i][0] - c[0], inner[i][1] - c[1]], outer));
      for (i = 0; i < n; i++) {
        var i2 = (i + 1) % n, h0 = hits[i], h1 = hits[i2];
        if (!h0 || !h1) continue;
        var F = [h0.p], e = h0.e;
        while (e !== h1.e) { e = (e + 1) % outer.length; F.push(outer[e]); }
        F.push(h1.p);
        if (F.length === 2 && Math.abs(F[0][0] - F[1][0]) + Math.abs(F[0][1] - F[1][1]) < 1e-9) { tris.push([inner[i], inner[i2], h1.p]); continue; }
        tris.push([inner[i], inner[i2], F[F.length - 1]]);
        for (j = F.length - 1; j > 0; j--) tris.push([inner[i], F[j], F[j - 1]]);
      }
      return tris;
    }
    function shrinkPoly(poly, kf) {
      var cx = 0, cy = 0, i; for (i = 0; i < poly.length; i++) { cx += poly[i][0]; cy += poly[i][1]; } cx /= poly.length; cy /= poly.length;
      return poly.map(function (p) { return [cx + (p[0] - cx) * kf, cy + (p[1] - cy) * kf]; });
    }
    function wallTone(y) { var k = y < 1.2 ? 0.8 : (y < 3.2 ? 0.8 + 0.2 * (y - 1.2) / 2 : 1.0); return k * (y > 9 ? Math.max(0.82, 1 - (y - 9) * 0.015) : 1); }
    function addFaceTris(F, tris, base, d, vary) {
      tris.forEach(function (t) {
        var v = [], cols = [], mx = 0, my = 0, mz = 0;
        t.forEach(function (p) { var q = PF(F, p[0], p[1], d || 0); v.push(q[0], q[1], q[2]); cols.push(tone(base, wallTone(p[1]) * (vary || 1))); mx += q[0] / 3; my += q[1] / 3; mz += q[2] / 3; });
        WB.addTris(v, cols, [mx + F.nx * 6, my, mz + F.nz * 6], { vary: 0.03 });
      });
    }
    function mullion(F, u, v0, v1, depth, w, col) {
      var q = PF(F, u, v0, depth), ry = Math.atan2(-F.uz, F.ux);
      S.add(Geo.box(), col, { x: q[0], y: q[1], z: q[2], ry: ry, sx: w, sy: v1 - v0, sz: 0.2, flat: true, vary: 0.02 });
    }
    function windowPanel(o) {
      var F = o.F, W = o.W, y0 = o.y0, y1 = o.y1, base = o.color === undefined ? WALLC : o.color;
      var outer = [[-W / 2, y0], [W / 2, y0], [W / 2, y1], [-W / 2, y1]];
      var win = o.win;
      if (!win) { addFaceTris(F, [[outer[0], outer[1], outer[2]], [outer[0], outer[2], outer[3]]], base); return; }
      var n = win.n || 10, sp = win.splay === undefined ? 0.22 : win.splay, dg = win.dg || 0.32, a = win.w / 2;
      var sill = win.sill, h = win.h, rise = win.rise;
      var G = outlinePts(win.w, sill, h, rise, n);
      var O = outlinePts(win.w + 2 * sp, sill - sp * 0.8, h + sp * 0.8, rise + sp * 1.3, n);
      var c = [0, sill + h * 0.55];
      var tris = starRing(c, O, outer);
      addFaceTris(F, tris, base);
      // 안쪽 벽 두께(스플레이)
      var rcol = tone(base, 1.06);
      for (var i = 0; i < G.length; i++) {
        var j = (i + 1) % G.length;
        var A = PF(F, O[i][0], O[i][1], 0), B = PF(F, O[j][0], O[j][1], 0), Cc = PF(F, G[j][0], G[j][1], dg), D = PF(F, G[i][0], G[i][1], dg);
        WB.addQuad(A, B, Cc, D, rcol, PF(F, 0, sill + h * 0.5, -3), { vary: 0.03 });
      }
      // 납틀 뒷판
      var back = [];
      for (i = 1; i < G.length - 1; i++) { var p0 = PF(F, c[0], c[1], dg + 0.04), p1 = PF(F, G[i][0], G[i][1], dg + 0.04), p2 = PF(F, G[i + 1][0], G[i + 1][1], dg + 0.04); back.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]); }
      var pA = PF(F, c[0], c[1], dg + 0.04), pB = PF(F, G[0][0], G[0][1], dg + 0.04), pC = PF(F, G[1][0], G[1][1], dg + 0.04); back.push(pA[0], pA[1], pA[2], pB[0], pB[1], pB[2], pC[0], pC[1], pC[2]);
      var pD = PF(F, G[G.length - 1][0], G[G.length - 1][1], dg + 0.04); back.push(pA[0], pA[1], pA[2], pD[0], pD[1], pD[2], pB[0], pB[1], pB[2]);
      S.addTris(back, 0x2c241f, PF(F, 0, sill + h * 0.5, -4), { vary: 0 });
      // G-29: 사진 창(가로로 긴 '아래 여섯 단')을 이 창 아랫부분에 건다 → 그 높이(phH)까지는 사진 속 돌 창살이 보이므로 우리 창살·가로대를 만들지 않는다
      var ph = win.photo || null, phH = ph ? Math.min(h, win.w / ph.aspect) : 0;
      // 유리 칸
      var pal = win.pal || PAL_HI, wr = GG.rng(win.seed || 1), lights = win.lights || 2, rows = win.rows || Math.max(2, Math.round(h / 0.8)), gd = dg + 0.02;
      function pick() { return pal[Math.floor(wr() * pal.length)]; }
      function cell(poly, col) {
        var sh = shrinkPoly(poly, 0.9), vv = [];
        for (var q = 1; q < sh.length - 1; q++) { var a0 = PF(F, sh[0][0], sh[0][1], gd), b0 = PF(F, sh[q][0], sh[q][1], gd), c0 = PF(F, sh[q + 1][0], sh[q + 1][1], gd); vv.push(a0[0], a0[1], a0[2], b0[0], b0[1], b0[2], c0[0], c0[1], c0[2]); }
        if (win.door) S.addTris(vv, col, PF(F, 0, sill + h * 0.5, -3), { vary: 0.06 });
        else { GL.addTris(vv, C(col), PF(F, 0, sill + h * 0.5, -3), { vary: 0.1 }); if (RF) RF.addTris(vv, 0xffffff, PF(F, 0, sill + h * 0.5, -3), { vary: 0 }); }
      }
      function cellTop(poly, col) {
        var vv = [];
        for (var q = 1; q < poly.length - 1; q++) { var a0 = PF(F, poly[0][0], poly[0][1], gd - 0.012), b0 = PF(F, poly[q][0], poly[q][1], gd - 0.012), c0 = PF(F, poly[q + 1][0], poly[q + 1][1], gd - 0.012); vv.push(a0[0], a0[1], a0[2], b0[0], b0[1], b0[2], c0[0], c0[1], c0[2]); }
        GL.addTris(vv, C(col), PF(F, 0, sill + h * 0.5, -3), { vary: 0.08 }); if (RF) RF.addTris(vv, 0xffffff, PF(F, 0, sill + h * 0.5, -3), { vary: 0 });
      }
      var beamCols = [];
      var lw = win.w / lights, li, rj;
      var GROUND = [0x1a3f9a, 0xa81a2a], ACCENT = [0xe8a926, 0xf0e3b0, 0x2c8a4e, 0xf0b93a, 0xd7ccb0, 0xb86a1e];
      for (li = 0; li < lights; li++) for (rj = 0; rj < rows; rj++) {
        var u0 = -a + lw * li, u1 = u0 + lw, v0 = sill + h * rj / rows, v1 = sill + h * (rj + 1) / rows;
        var cc;
        if (win.door) cc = (rj + li) % 2 ? 0x4e3425 : 0x5b3d2a;
        else if (win.medal) cc = GROUND[(li + rj) % 2]; else cc = pick();
        if (beamCols.length < 3 && rnd() < 0.3 && !win.door) beamCols.push(win.medal ? ACCENT[Math.floor(wr() * ACCENT.length)] : cc);
        cell([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], cc);
        if (win.medal) {
          // 메달리온(팔각) : 바탕 위에 밝은 색 면
          var mu = (u0 + u1) / 2, mv = (v0 + v1) / 2, rx = (u1 - u0) * 0.36, ry2 = (v1 - v0) * 0.36, oct = [];
          for (var q = 0; q < 8; q++) { var aq = q * PI / 4 + PI / 8; oct.push([mu + Math.cos(aq) * rx * 1.08, mv + Math.sin(aq) * ry2 * 1.08]); }
          cellTop(oct, ACCENT[Math.floor(wr() * ACCENT.length)]);
          cellTop([[mu - rx * 0.28, mv - ry2 * 0.28], [mu + rx * 0.28, mv - ry2 * 0.28], [mu + rx * 0.28, mv + ry2 * 0.28], [mu - rx * 0.28, mv + ry2 * 0.28]], GROUND[(li + rj + 1) % 2]);
        }
      }
      // 아치부 부채꼴 칸
      var top = sill + h, ar = [], cA = [0, top + rise * 0.2], f = pf(a, rise), m = 12;
      for (i = 0; i <= m; i++) { var u = a - 2 * a * i / m; ar.push([u, top + f(u)]); }
      for (i = 0; i < m; i++) cell([cA, ar[i], ar[i + 1]], pick());
      cell([cA, [-a, top], [a, top]], pick());
      // 중간 문설주 + 가로대
      var stoneC = tone(base, 1.12);
      for (li = 1; li < lights; li++) { var mu = -a + lw * li; mullion(F, mu, sill + phH, top + rise * 0.2, dg - 0.02, 0.1, stoneC); }
      mullion(F, 0, top - 0.04, top + 0.04, dg - 0.02, 2 * a, stoneC);
      for (rj = 1; rj < rows; rj += 2) { if (sill + h * rj / rows > sill + phH + 0.1) mullion(F, 0, sill + h * rj / rows - 0.03, sill + h * rj / rows + 0.03, dg - 0.02, 2 * a, tone(base, 1.04)); }
      if (ph) {
        mullion(F, 0, sill + phH - 0.05, sill + phH + 0.05, dg - 0.02, 2 * a, stoneC);   // 사진 위 가로대
        var pc = PF(F, 0, sill + phH / 2, gd - 0.012);
        ctx.glassSlot({ photo: ph, x: pc[0], y: pc[1], z: pc[2], face: [F.nx, F.nz], w: 2 * a, h: phH });
      }
      // 창 둘레 석재 틀(아치 몰딩)
      var oc = tone(base, 1.18);
      for (i = 2; i < O.length - 1; i++) {
        var pA2 = O[i], pB2 = O[i + 1];
        var l0 = PF(F, pA2[0], pA2[1], 0.0), l1 = PF(F, pB2[0], pB2[1], 0.0);
        S.addQuad(l0, l1, [l1[0] + F.nx * 0.12, l1[1] + 0.1, l1[2] + F.nz * 0.12], [l0[0] + F.nx * 0.12, l0[1] + 0.1, l0[2] + F.nz * 0.12], oc, PF(F, 0, sill + h * 0.5, -3), { vary: 0.03 });
      }
      if (win.beam && !win.door) {
        while (beamCols.length < 3) beamCols.push(pick());
        var bc = PF(F, 0, sill + h * 0.55, 0);
        ctx.addWindowBeam({ x: bc[0], y: bc[1], z: bc[2], face: [F.nx, F.nz], w: win.w, h: h * 0.9, colors: beamCols, reach: win.beamReach || 10 });
      }
    }
    function fr(x, z, nx, nz) { var l = hyp(nx, nz); nx /= l; nz /= l; return { x: x, z: z, nx: nx, nz: nz, ux: nz, uz: -nx }; }
    function miniStatue(x, y, z, h, col) {
      S.add(openCone(6), col, { x: x, y: y, z: z, sx: h * 0.16, sy: h * 0.72, sz: h * 0.16, flat: true, vary: 0.02 });
      S.add(tetra(), col, { x: x, y: y + h * 0.82, z: z, s: h * 0.09, flat: true, vary: 0 });
    }
    // 뒤쪽(벽 쪽)·바닥이 없는 상자: 벽 판이 한 면짜리라 바깥에서 보여도 뒤통수가 보이지 않게
    function boxOpen(batch, color, cx, y0, cz, w, h, d, ry) {
      var c = Math.cos(ry), sn = Math.sin(ry);
      function P(lx, y, lz) { return [cx + lx * c + lz * sn, y, cz - lx * sn + lz * c]; }
      var hw = w / 2, hd = d / 2, y1 = y0 + h, mid = [cx + sn * 6, (y0 + y1) / 2, cz + c * 6];
      batch.addQuad(P(-hw, y0, hd), P(hw, y0, hd), P(hw, y1, hd), P(-hw, y1, hd), color, mid, { vary: 0.02 });                      // 앞
      batch.addQuad(P(hw, y0, hd), P(hw, y0, -hd), P(hw, y1, -hd), P(hw, y1, hd), color, [cx + c * 6, (y0 + y1) / 2, cz - sn * 6], { vary: 0.02 });   // 오른쪽
      batch.addQuad(P(-hw, y0, -hd), P(-hw, y0, hd), P(-hw, y1, hd), P(-hw, y1, -hd), color, [cx - c * 6, (y0 + y1) / 2, cz + sn * 6], { vary: 0.02 }); // 왼쪽
      batch.addQuad(P(-hw, y1, -hd), P(hw, y1, -hd), P(hw, y1, hd), P(-hw, y1, hd), color, [cx, y1 + 6, cz], { vary: 0.02 });               // 위
    }
    function pilaster(x, z, nx, nz, w, d, h, capH) {
      var ry = Math.atan2(nx, nz), pc = HASP ? 0xc4bbb3 : STONE, pl = HASP ? 0xd8d0c8 : STONE_L, pd = HASP ? 0x9d948c : STONE_D;
      boxOpen(WB, pc, x + nx * d / 2, 0, z + nz * d / 2, w, h, d, ry);
      boxOpen(WB, pl, x + nx * (d / 2 + 0.05), h - 0.25, z + nz * (d / 2 + 0.05), w + 0.2, 0.25, d + 0.1, ry);
      boxOpen(WB, pd, x + nx * (d / 2 + 0.05), 0, z + nz * (d / 2 + 0.05), w + 0.2, 0.4, d + 0.1, ry);
    }

    // 바깥 벽(양쪽 8칸): 안쪽 면 x=±XW
    for (k = 1; k <= 8; k++) {
      var zc = (zk(k) + zk(k - 1)) / 2, altar = (k === 7 || k === 8);
      [-1, 1].forEach(function (sg) {
        var F = fr(sg * XW, zc, -sg, 0);
        windowPanel({ F: F, W: M, y0: 0, y1: 11.6, color: WALLC, win: { sill: altar ? 4.5 : 2.7, w: 1.75, h: altar ? 3.4 : 5.4, rise: 2.4, lights: 2, rows: altar ? 5 : 7, pal: PAL_HI, seed: k * 7 + (sg > 0 ? 3 : 0), splay: 0.3, dg: 0.4, beam: 1, beamReach: 9 } });
      });
    }
    // 바깥 벽 징두리(광택 짙은 대리석 띠 + 몰딩)
    function dado(x, z, nx, nz, len) {
      var ry = Math.atan2(nx, nz);
      GS.add(Geo.box(), 0x6b4a42, { x: x + nx * 0.04, y: 0, z: z + nz * 0.04, ry: ry, sx: len - 0.9, sy: 1.15, sz: 0.08, flat: true, vary: 0.03 });
      GS.add(Geo.box(), 0xa89a8e, { x: x + nx * 0.06, y: 1.15, z: z + nz * 0.06, ry: ry, sx: len - 0.9, sy: 0.1, sz: 0.13, flat: true, vary: 0.02 });
    }
    for (k = 1; k <= 8; k++) [-1, 1].forEach(function (sg) { dado(sg * XW, bayC(k), -sg, 0, M); });
    [-1, 1].forEach(function (sg) {
      dado(sg * XT, (zk(11) + zk(9)) / 2, -sg, 0, 2 * M); dado(sg * XT, (zk(9) + zk(8)) / 2, -sg, 0, M); dado(sg * XT, (zk(12) + zk(11)) / 2, -sg, 0, M);
      dado(sg * (XW + XT) / 2, zk(8), 0, -1, XT - XW); dado(sg * (XW + XT) / 2, zk(12), 0, 1, XT - XW); dado(sg * (XA + XW) / 2, zk(12), 0, 1, M);
    });
    // 바깥 벽 벽기둥(칸 경계)
    for (k = 0; k <= 8; k++) [-1, 1].forEach(function (sg) { pilaster(sg * XW, zk(k), -sg, 0, 0.9, 0.5, SP_O + 0.2); });
    // 정면(콘트로파차타): 문 5개 + 위 작은 창
    (function facade() {
      var dx = [-XA, -XN, 0, XN, XA];
      dx.forEach(function (x, i) {
        var big = i === 2, F = fr(x, ZF, 0, -1);
        windowPanel({ F: F, W: M, y0: 0, y1: 7.0, color: WALLC, win: { sill: 0, w: big ? 2.7 : 2.0, h: big ? 3.9 : 3.3, rise: big ? 2.6 : 2.0, lights: 1, rows: 1, door: true, pal: PAL_HI, seed: i + 2, splay: 0.3, dg: 0.5, beam: 0 } });
        windowPanel({ F: F, W: M, y0: 7.0, y1: 22, color: WALLC, win: i === 2 || i === 1 || i === 3 ? { sill: 8.2, w: 1.2, h: 2.6, rise: 1.4, lights: 1, rows: 3, pal: PAL_HI, seed: 60 + i, splay: 0.25, dg: 0.35, beam: 0 } : null });
      });
      [-1, 1].forEach(function (sg) { windowPanel({ F: fr(sg * 12.4, ZF, 0, -1), W: 2.26, y0: 0, y1: 22, color: WALLC, win: null }); });
      [-XA, -XN, XN, XA].forEach(function (x) { pilaster(x, ZF, 0, -1, 1.3, 0.8, Math.abs(x) === XN ? SP_N : SP_I + 0.5); });
    })();
    // 익랑 끝 벽(x=±XT): 가운데 큰 창 + 양옆 측랑 창
    [-1, 1].forEach(function (sg) {
      var N = [-sg, 0];
      windowPanel({ F: fr(sg * XT, (zk(11) + zk(9)) / 2, N[0], N[1]), W: 2 * M, y0: 0, y1: 22, color: WALLC, win: { sill: 3.4, w: 4.4, h: 8.8, rise: 4.6, lights: 3, rows: 11, medal: true, pal: PAL_APSE, seed: 90 + sg, splay: 0.4, dg: 0.5, beam: 1, beamReach: 12 } });
      windowPanel({ F: fr(sg * XT, (zk(9) + zk(8)) / 2, N[0], N[1]), W: M, y0: 0, y1: 12, color: WALLC, win: { sill: 2.7, w: 1.75, h: 5.4, rise: 2.4, lights: 2, rows: 7, pal: PAL_HI, seed: 101 + sg, splay: 0.3, dg: 0.4, beam: 1, beamReach: 9 } });
      windowPanel({ F: fr(sg * XT, (zk(12) + zk(11)) / 2, N[0], N[1]), W: M, y0: 0, y1: 12, color: WALLC, win: { sill: 2.7, w: 1.75, h: 5.4, rise: 2.4, lights: 2, rows: 7, pal: PAL_HI, seed: 111 + sg, splay: 0.3, dg: 0.4, beam: 1, beamReach: 9 } });
      pilaster(sg * XT, zk(9), -sg, 0, 0.9, 0.5, SP_I + 0.3); pilaster(sg * XT, zk(11), -sg, 0, 0.9, 0.5, SP_I + 0.3);
      pilaster(sg * XT, zk(8), -sg, 0, 0.9, 0.5, SP_O + 0.2); pilaster(sg * XT, zk(12), -sg, 0, 0.9, 0.5, SP_O + 0.2);
      // 익랑 남/북 벽(z=zk(8): x∈[XW,XT]; z=zk(12): x∈[XA..XT])
      windowPanel({ F: fr(sg * (XW + XT) / 2, zk(8), 0, -1), W: XT - XW, y0: 0, y1: 12, color: WALLC, win: { sill: 2.7, w: 1.9, h: 5.4, rise: 2.5, lights: 2, rows: 7, pal: PAL_HI, seed: 121 + sg, splay: 0.3, dg: 0.4, beam: 1, beamReach: 9 } });
      windowPanel({ F: fr(sg * (XW + XT) / 2, zk(12), 0, 1), W: XT - XW, y0: 0, y1: 12, color: WALLC, win: { sill: 2.7, w: 1.9, h: 5.4, rise: 2.5, lights: 2, rows: 7, pal: PAL_HI, seed: 131 + sg, splay: 0.3, dg: 0.4, beam: 1, beamReach: 9 } });
      windowPanel({ F: fr(sg * (XA + XW) / 2, zk(12), 0, 1), W: M, y0: 0, y1: 12, color: WALLC, win: null });
      // 성구실 쪽 벽(x=±XA, z∈[zk(12), zk(13)+...]) 맹아치
      windowPanel({ F: fr(sg * XA, (zk(12) + zk(13)) / 2, -sg, 0), W: M, y0: 0, y1: 15.2, color: WALLC, win: null });
      windowPanel({ F: fr(sg * XA, (zk(13) - 29.0) / 2 + zk(13) / 2 - zk(13) / 2, -sg, 0), W: 0.01, y0: 0, y1: 0.01, color: WALLC, win: null });
    });
    // 후진 외벽(다각형): 큰 창 3개
    (function apseWalls() {
      var Q = OUTW;
      // 성구실 쪽 직선 구간(아래쪽 x=±XA, z -23.76..-29)
      [-1, 1].forEach(function (sg) {
        windowPanel({ F: fr(sg * XA, (zk(13) + -29.0) / 2, -sg, 0), W: Math.abs(zk(13) + 29.0), y0: 0, y1: 15.2, color: WALLC, win: null });
      });
      for (var e = 1; e <= 3; e++) {
        var A = Q[e], B = Q[e + 1], mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], len = dist(A, B);
        var ex = B[0] - A[0], ez = B[1] - A[1], nx = -ez, nz = ex;
        var toC = [0 - mid[0], -26.0 - mid[1]];
        if (nx * toC[0] + nz * toC[1] < 0) { nx = -nx; nz = -nz; }
        var F = fr(mid[0], mid[1], nx, nz), center = e === 2;
        windowPanel({ F: F, W: len, y0: 0, y1: 15.2, color: WALLC, win: center ? { sill: 2.0, w: 4.8, h: 5.5, rise: 3.6, lights: 4, rows: 8, medal: true, pal: PAL_APSE, seed: 7, splay: 0.45, dg: 0.55, beam: 1, beamReach: 14, n: 14, photo: ctx.glassPhoto('apse_center_lower') } : { sill: 2.0, w: 3.5, h: 5.0, rise: 3.1, lights: 3, rows: 7, medal: true, pal: PAL_APSE, seed: e * 13, splay: 0.4, dg: 0.5, beam: 1, beamReach: 12, n: 12 } });
        S.add(Geo.box(), STONE_L, { x: mid[0] + F.nx * 0.08, y: 12.4, z: mid[1] + F.nz * 0.08, ry: Math.atan2(F.nx, F.nz), sx: len, sy: 0.2, sz: 0.2, flat: true, vary: 0.02 });
      }
    })();

    mark('walls+windows');
    /* ===== 7. 아케이드(첨두 아치 벽) + 고창 ===== */
    function archWall(o) {
      var axisZ = o.axis === 'z', t = o.t || 0.7, fix = o.fix, c = o.c, aH = o.a, b = o.b;
      var nS = 8, fA = pf(aH, o.rise), fT = pf(b, o.R), i;
      function P3(u, y, side) { return axisZ ? [fix + side * t / 2, y, c + u] : [c + u, y, fix + side * t / 2]; }
      function nrmHint(side, u, y) { return axisZ ? [fix + side * 6, y, c + u] : [c + u, y, fix + side * 6]; }
      var cut = o.cut;
      for (i = 0; i < nS; i++) {
        var u0 = -aH + 2 * aH * i / nS, u1 = -aH + 2 * aH * (i + 1) / nS;
        var l0 = o.spA + fA(u0), l1 = o.spA + fA(u1);
        var tp0 = o.ySpTop + fT(u0), tp1 = o.ySpTop + fT(u1);
        if (cut) { tp0 = Math.min(tp0, cut); tp1 = Math.min(tp1, cut); }
        // 소핏
        WB.addQuad(P3(u0, l0, -1), P3(u1, l1, -1), P3(u1, l1, 1), P3(u0, l0, 1), HASP ? 0xb9b0a8 : STONE, axisZ ? [fix, l0 - 3, c] : [c, l0 - 3, fix], { vary: 0.03 });
        [-1, 1].forEach(function (sd) {
          if (tp0 > l0 + 0.02 || tp1 > l1 + 0.02) WB.addQuad(P3(u0, l0, sd), P3(u1, l1, sd), P3(u1, Math.max(tp1, l1), sd), P3(u0, Math.max(tp0, l0), sd), tone(WALLC, 1.0), nrmHint(sd, (u0 + u1) / 2, (l0 + tp0) / 2), { vary: 0.03 });
        });
      }
      // 외측 몰딩(아치 둘레)
      var hintMid = axisZ ? [fix, o.spA - 4, c] : [c, o.spA - 4, fix];
      [-1, 1].forEach(function (sd) {
        var pp = [];
        for (i = 0; i <= nS; i++) { var u = -aH + 2 * aH * i / nS; var q = P3(u, o.spA + fA(u) + 0.12, sd * 1.09); pp.push(q); }
        ribStrip(pp, 0.26, 0.1, STONE_L, [pp[nS / 2][0] + (axisZ ? sd * 4 : 0), pp[nS / 2][1], pp[nS / 2][2] + (axisZ ? 0 : sd * 4)], true);
      });
      // 고창(아케이드 위 작은 첨두창) - 신랑 줄만
      if (o.win) {
        var yC = cut + 0.6;
        var span = [];
        // 뾰족 아치 곡선 위에서 y >= cut 인 구간의 외곽(볼록)
        var uEdge = 0;
        for (var uu = 0; uu < b; uu += 0.02) { if (o.ySpTop + fT(uu) < cut) { uEdge = uu; break; } uEdge = b; }
        var poly = [];
        var nn = 14;
        poly.push([-uEdge, cut]); poly.push([uEdge, cut]);
        for (i = 1; i < nn; i++) { var uq = uEdge - 2 * uEdge * i / nn; poly.push([uq, o.ySpTop + fT(uq) - 0.02]); }
        // 위 순서: BL, BR, (오른쪽 -> 왼쪽 아치 점)
        poly = [[-uEdge, cut], [uEdge, cut]];
        for (i = 0; i <= nn; i++) { var uq2 = uEdge - 2 * uEdge * i / nn; poly.push([uq2, o.ySpTop + fT(uq2) - 0.03]); }
        poly = poly.filter(function (p, ix) { return ix < 2 || ix > 2 || true; });
        // 평면 프레임(축에 맞춤)
        var side = o.winSide;
        var F = axisZ ? fr(fix + side * t / 2, c, side, 0) : fr(c, fix + side * t / 2, 0, side);
        // 외곽(볼록 다각형)을 CCW(u 증가 순)로 만든다: 이 프레임의 u 방향 부호 반영
        var uSign = (F.ux * (axisZ ? 0 : 1) + F.uz * (axisZ ? 1 : 0));
        var outer = poly.map(function (p) { return [p[0] * uSign, p[1]]; });
        // 순서를 CCW로 정렬(각도 기준)
        var cc2 = [0, (cut + o.ySpTop + o.R) / 2 - 0.3];
        outer.sort(function (p, q) { return Math.atan2(p[1] - cc2[1], p[0] - cc2[0]) - Math.atan2(q[1] - cc2[1], q[0] - cc2[0]); });
        var wsill = cut + 0.75, wh = Math.min(2.8, o.ySpTop + o.R - wsill - 1.9), wr = 1.3;
        if (wh > 0.8) {
          // 창 개구부 패널(볼록 외곽에 맞춰)
          var wt = { sill: wsill, w: 1.1, h: wh, rise: wr, lights: 1, rows: 3, pal: PAL_HI, seed: o.seed || 5, splay: 0.16, dg: 0.28, beam: 0 };
          windowPanelPoly(F, outer, WALLC, wt);
        } else {
          addFaceTris(F, fanTris(outer), WALLC);
        }
      }
    }
    function fanTris(poly) { var t = []; for (var i = 1; i < poly.length - 1; i++) t.push([poly[0], poly[i], poly[i + 1]]); return t; }
    function windowPanelPoly(F, outer, base, win) {
      var n = 8, sp = win.splay, dg = win.dg, a = win.w / 2, sill = win.sill, h = win.h, rise = win.rise;
      var G = outlinePts(win.w, sill, h, rise, n), O = outlinePts(win.w + 2 * sp, sill - sp * 0.8, h + sp * 0.8, rise + sp * 1.3, n), c = [0, sill + h * 0.55];
      addFaceTris(F, starRing(c, O, outer), base);
      for (var i = 0; i < G.length; i++) {
        var j = (i + 1) % G.length;
        WB.addQuad(PF(F, O[i][0], O[i][1], 0), PF(F, O[j][0], O[j][1], 0), PF(F, G[j][0], G[j][1], dg), PF(F, G[i][0], G[i][1], dg), tone(base, 1.06), PF(F, 0, sill + h * 0.5, -3), { vary: 0.03 });
      }
      // 유리(단순 5~6색 칸)
      var pal = win.pal, wr = GG.rng(win.seed), rows = win.rows, gd = dg + 0.02, hintG = PF(F, 0, sill + h * 0.5, -3), top = sill + h;
      function cellP(poly, col) { var sh = shrinkPoly(poly, 0.88), vv = []; for (var q = 1; q < sh.length - 1; q++) { var a0 = PF(F, sh[0][0], sh[0][1], gd), b0 = PF(F, sh[q][0], sh[q][1], gd), c0 = PF(F, sh[q + 1][0], sh[q + 1][1], gd); vv.push(a0[0], a0[1], a0[2], b0[0], b0[1], b0[2], c0[0], c0[1], c0[2]); } GL.addTris(vv, C(col), hintG, { vary: 0.1 }); if (RF) RF.addTris(vv, 0xffffff, hintG, { vary: 0 }); }
      var bk = []; // 뒷판
      for (i = 1; i < G.length - 1; i++) { var p0 = PF(F, 0, c[1], dg + 0.04), p1 = PF(F, G[i][0], G[i][1], dg + 0.04), p2 = PF(F, G[i + 1][0], G[i + 1][1], dg + 0.04); bk.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]); }
      S.addTris(bk, 0x2c241f, hintG, { vary: 0 });
      for (var r = 0; r < rows; r++) cellP([[-a, sill + h * r / rows], [a, sill + h * r / rows], [a, sill + h * (r + 1) / rows], [-a, sill + h * (r + 1) / rows]], pal[Math.floor(wr() * pal.length)]);
      var f = pf(a, rise), cA = [0, top + rise * 0.2], ar = [];
      for (i = 0; i <= 6; i++) { var u = a - 2 * a * i / 6; ar.push([u, top + f(u)]); }
      for (i = 0; i < 6; i++) cellP([cA, ar[i], ar[i + 1]], pal[Math.floor(wr() * pal.length)]);
      cellP([cA, [-a, top], [a, top]], pal[Math.floor(wr() * pal.length)]);
      mullion(F, 0, sill, top + rise * 0.2, dg - 0.02, 0.08, tone(base, 1.12));
    }

    // 신랑 줄(x=±XN): z 방향 아케이드 신랑 9칸 + 사제단 2칸, 측랑 줄(x=±XA): 10칸
    function bayC(kk) { return (zk(kk) + zk(kk - 1)) / 2; }
    function arcadeLine(x, sg, bays, isNave) {
      bays.forEach(function (cz, bi) {
        archWall({ axis: 'z', fix: x, c: cz, a: isNave ? 1.2 : 1.25, b: M / 2, spA: isNave ? 12.1 : 10.3, rise: isNave ? 2.5 : 2.3, ySpTop: isNave ? SP_N : SP_I, R: isNave ? R_NAVE : R_AIS, t: isNave ? 0.7 : 0.6, cut: isNave ? 15.4 : null, win: isNave, winSide: -sg, seed: bi * 3 + (sg > 0 ? 1 : 0) });
      });
    }
    var naveBays = [], k2;
    for (k2 = 1; k2 <= 9; k2++) naveBays.push(bayC(k2));
    var presBays = [(zk(12) + zk(11)) / 2, (zk(13) + zk(12)) / 2];
    [-1, 1].forEach(function (sg) {
      arcadeLine(sg * XN, sg, naveBays.concat(presBays), true);
      arcadeLine(sg * XA, sg, naveBays.concat([presBays[0]]), false);
      // 익랑 팔(중앙 높은 줄): z=zk(9), zk(11) 위 x 방향 아케이드 3칸
      [zk(9), zk(11)].forEach(function (zz, zi2) {
        var side = zi2 === 0 ? -1 : 1;   // 팔 중앙 쪽을 향함: zk(9)에서는 -z 방향(중앙)이 +… 중앙이 z 작은 쪽
        [[XN, XA], [XA, XW]].forEach(function (pr) {
          var cx2 = sg * (pr[0] + pr[1]) / 2;
          archWall({ axis: 'x', fix: zz, c: cx2, a: 1.2, b: M / 2, spA: 12.1, rise: 2.5, ySpTop: SP_N, R: R_NAVE, t: 0.7, cut: null, win: false, winSide: zi2 === 0 ? -1 : 1, seed: 40 + zi2 * 5 + (sg > 0 ? 1 : 0) });
        });
        archWall({ axis: 'x', fix: zz, c: sg * (XW + XT) / 2 + sg * 0.0, a: 2.3, b: (XT - XW) / 2, spA: 11.0, rise: 3.4, ySpTop: SP_N, R: R_NAVE, t: 0.7, cut: null, win: false });
      });
    });
    // 팔 측랑 모서리 벽기둥(성구실 모서리)
    [-1, 1].forEach(function (sg) {
      pilaster(sg * XA, zk(12), -sg, 0, 1.0, 0.7, SP_I + 0.3);
    });

    mark('arcades');
    /* ===== 8. 후진 기둥 고리: 성가대 뒤 벽(레트로코로) + 성가대석 + 아치 ===== */
    (function choir() {
      // 고리 현 사이 하단 대리석 벽 (높이 4.8) + 위 개방 아치(첨두)
      for (var e = 0; e < 5; e++) {
        var A = RING[e], B = RING[e + 1], len = dist(A, B), mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
        var ang = Math.atan2(-(B[1] - A[1]), B[0] - A[0]);
        var nl = [-(B[1] - A[1]) / len, (B[0] - A[0]) / len];   // 법선
        var toC = [KP[0] - mx, KP[1] - mz]; if (nl[0] * toC[0] + nl[1] * toC[1] < 0) { nl[0] = -nl[0]; nl[1] = -nl[1]; }
        // 하부 벽
        S.add(Geo.box(), 0xa89988, { x: mx, y: 0, z: mz, ry: ang, sx: len - 1.0, sy: 2.4, sz: 0.9, flat: true, vary: 0.02 });
        S.add(Geo.box(), 0xb08f7a, { x: mx, y: 2.4, z: mz, ry: ang, sx: len - 1.0, sy: 2.3, sz: 0.8, flat: true, vary: 0.03 });
        S.add(Geo.box(), 0xdacbb9, { x: mx, y: 4.7, z: mz, ry: ang, sx: len - 0.9, sy: 0.22, sz: 1.0, flat: true, vary: 0.02 });
        // 부조 패널
        var np = Math.max(2, Math.round((len - 1) / 1.4));
        for (var pp = 0; pp < np; pp++) {
          var tt = (pp + 0.5) / np - 0.5, px = mx + Math.cos(ang) * tt * (len - 1.2), pz = mz - Math.sin(ang) * tt * (len - 1.2);
          S.add(Geo.box(), 0x8f6f5c, { x: px + nl[0] * 0.42, y: 2.75, z: pz + nl[1] * 0.42, ry: ang, sx: (len - 1.2) / np * 0.72, sy: 1.6, sz: 0.05, flat: true, vary: 0.03 });
        }
        // 위 첨두 아치(고리 현 위, 개방) + 팀파눔
        var pierR = 0.78, spanH = len / 2 - pierR - 0.1;
        var dirx = Math.cos(ang), dirz = -Math.sin(ang);
        var fA = pf(spanH, 2.5), fT = pf(len / 2, R_NAVE * 0.62);
        var nS = 10;
        for (var i = 0; i < nS; i++) {
          var u0 = -spanH + 2 * spanH * i / nS, u1 = -spanH + 2 * spanH * (i + 1) / nS;
          var l0 = 12.1 + fA(u0), l1 = 12.1 + fA(u1), t0 = SP_N + fT(u0), t1 = SP_N + fT(u1);
          function P3(u, y, sd) { return [mx + dirx * u + nl[0] * sd * 0.35, y, mz + dirz * u + nl[1] * sd * 0.35]; }
          S.addQuad(P3(u0, l0, -1), P3(u1, l1, -1), P3(u1, l1, 1), P3(u0, l0, 1), STONE, [mx, l0 - 3, mz], { vary: 0.03 });
          [-1, 1].forEach(function (sd) {
            S.addQuad(P3(u0, l0, sd), P3(u1, l1, sd), P3(u1, Math.max(t1, l1), sd), P3(u0, Math.max(t0, l0), sd), tone(WALLC, 1.04), [mx + nl[0] * sd * 6, (l0 + t0) / 2, mz + nl[1] * sd * 6], { vary: 0.03 });
          });
        }
        // 충돌: 현을 따라 원
        var nc = Math.max(2, Math.round(len / 0.9));
        for (var c = 0; c <= nc; c++) ctx.addCollider({ x: lerp(A[0], B[0], c / nc), z: lerp(A[1], B[1], c / nc), r: 0.6 });
      }
      // 성가대석: 직선 2열(기둥 줄 안쪽) + 반원
      function stall(x0, z0, x1, z1) {
        var len = hyp(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, ang = Math.atan2(-(z1 - z0), x1 - x0);
        var nx = (z1 - z0) / len, nz = -(x1 - x0) / len;
        // 안쪽(제단 쪽) 방향이 (nx,nz) 가 되도록 부호는 호출부에서 보장
        WD.add(Geo.box(), WALNUT, { x: mx, y: 0, z: mz, ry: ang, sx: len, sy: 0.55, sz: 0.7, flat: true, vary: 0.03 });
        WD.add(Geo.box(), 0x6a4630, { x: mx - nx * 0.05, y: 0.55, z: mz - nz * 0.05, ry: ang, sx: len, sy: 0.07, sz: 0.62, flat: true, vary: 0.03 });
        WD.add(Geo.box(), WALNUT, { x: mx - nx * 0.5, y: 0.4, z: mz - nz * 0.5, ry: ang, sx: len, sy: 2.4, sz: 0.3, flat: true, vary: 0.03 });
        WD.add(Geo.box(), 0x3a2619, { x: mx - nx * 0.5, y: 2.8, z: mz - nz * 0.5, ry: ang, sx: len + 0.1, sy: 0.25, sz: 0.55, flat: true, vary: 0.03 });
        var np = Math.round(len / 0.7);
        for (var q = 0; q <= np; q++) {
          var tt = q / np - 0.5;
          WD.add(Geo.cyl(4, 0), 0x5a3a28, { x: mx + Math.cos(ang) * tt * len - nx * 0.5, y: 3.05, z: mz - Math.sin(ang) * tt * len - nz * 0.5, ry: ang + PI / 4, sx: 0.2, sy: 0.55, sz: 0.2, flat: true, vary: 0.03 });
        }
      }
      var fz0 = -15.7, fz1 = -23.2;
      stall(-3.4, fz0, -3.4, fz1); stall(3.4, fz1, 3.4, fz0);
      ctx.addCollider({ x0: -4.2, x1: -2.75, z0: fz1 - 0.2, z1: fz0 + 0.2 }); ctx.addCollider({ x0: 2.75, x1: 4.2, z0: fz1 - 0.2, z1: fz0 + 0.2 });
      // 후진 쪽 반원 성가대석(고리 안쪽 0.9m)
      for (var e2 = 1; e2 <= 3; e2++) {
        var A2 = RING[e2], B2 = RING[e2 + 1], mx2 = (A2[0] + B2[0]) / 2, mz2 = (A2[1] + B2[1]) / 2, l2 = dist(A2, B2);
        var nl2 = [-(B2[1] - A2[1]) / l2, (B2[0] - A2[0]) / l2]; if (nl2[0] * (KP[0] - mx2) + nl2[1] * (KP[1] - mz2) < 0) { nl2[0] = -nl2[0]; nl2[1] = -nl2[1]; }
        var off = 1.2;
        var a1 = [A2[0] + nl2[0] * off + (B2[0] - A2[0]) * 0.1 / 1, A2[1] + nl2[1] * off + (B2[1] - A2[1]) * 0.1], b1 = [B2[0] + nl2[0] * off - (B2[0] - A2[0]) * 0.1, B2[1] + nl2[1] * off - (B2[1] - A2[1]) * 0.1];
        // 안쪽(nl2)이 앞면(바깥쪽 등받이가 벽 쪽)이어야 하므로 stall 이 만드는 등받이 방향을 맞춤
        var sx0 = b1[0], sz0 = b1[1], sx1 = a1[0], sz1 = a1[1];
        var nn = [(sz1 - sz0), -(sx1 - sx0)]; var nlen = hyp(nn[0], nn[1]); nn[0] /= nlen; nn[1] /= nlen;
        if (nn[0] * nl2[0] + nn[1] * nl2[1] > 0) { var tx = sx0, tz = sz0; sx0 = sx1; sz0 = sz1; sx1 = tx; sz1 = tz; }
        stall(sx0, sz0, sx1, sz1);
      }
    })();

    mark('choir');
    /* ===== 9. 제대·치보리오·강론대·오르간 ===== */
    (function sanctuary() {
      // 주제대
      ctx.altar({ x: 0, z: -18.2, y: SY, w: 3.0, d: 1.25, h: 1.0, style: 'block', color: 0xefe7dc, candles: 2, flowers: false });
      S.add(Geo.box(), 0x9e3b32, { x: 0, y: SY, z: -18.2 + 0.62, sx: 2.2, sy: 0.7, sz: 0.04, flat: true, vary: 0 });
      // 십자가와 촛대 6
      [-2.2, 2.2].forEach(function (x) {
        ctx.cyl({ x: x, y: SY, z: -17.4, r: 0.2, rTop: 0.07, h: 1.9, seg: 8, color: GOLD });
        ctx.cyl({ x: x, y: SY + 1.9, z: -17.4, r: 0.06, h: 0.5, seg: 6, color: 0xfff6e0 });
        ctx.addFlame({ x: x, y: SY + 2.55, z: -17.4, scale: 1.4 });
        ctx.addCollider({ x: x, z: -17.4, r: 0.3 });
      });
      // 치보리오(템피에토): 코린트 기둥 8 + 금동 돔 + 감실
      var tx = 0, tz = -23.9, tr = 1.55, tH = 3.6;
      for (var i = 0; i < 8; i++) {
        var an = i * PI / 4 + PI / 8, px = tx + Math.cos(an) * tr, pz = tz + Math.sin(an) * tr;
        ctx.column({ x: px, z: pz, y: SY, h: tH, r: 0.17, style: 'round', capital: 'doric', color: GOLD, capColor: 0xe0bd62, base: true, collide: false });
      }
      ctx.addCollider({ x: tx, z: tz, r: 1.95 });
      MT.add(Geo.cyl(8, 1), 0xb78a30, { x: tx, y: SY + tH, z: tz, ry: PI / 8, sx: tr + 0.45, sy: 0.35, sz: tr + 0.45, flat: true, vary: 0 });
      MT.add(Geo.cyl(8, 0.86), 0xd9b04a, { x: tx, y: SY + tH + 0.35, z: tz, ry: PI / 8, sx: tr + 0.2, sy: 0.5, sz: tr + 0.2, flat: true, vary: 0 });
      MT.add(Geo.hemi(8, 5), 0xcf9f3e, { x: tx, y: SY + tH + 0.8, z: tz, ry: PI / 8, sx: tr + 0.1, sy: 1.5, sz: tr + 0.1, flat: true, vary: 0 });
      MT.add(Geo.cyl(6, 0.2), 0xe3bd58, { x: tx, y: SY + tH + 2.2, z: tz, sx: 0.28, sy: 0.7, sz: 0.28, flat: true, vary: 0 });
      MT.add(Geo.box(), 0xe3bd58, { x: tx, y: SY + tH + 2.75, z: tz, sx: 0.08, sy: 0.7, sz: 0.08, flat: true, vary: 0 });
      MT.add(Geo.box(), 0xe3bd58, { x: tx, y: SY + tH + 3.0, z: tz, sx: 0.4, sy: 0.08, sz: 0.08, flat: true, vary: 0 });
      // 감실(원통 탑) + 천사
      MT.add(Geo.cyl(10, 0.9), 0x8f6a22, { x: tx, y: SY, z: tz, sx: 0.55, sy: 1.6, sz: 0.55, flat: true, vary: 0.02 });
      MT.add(Geo.cyl(10, 0.2), 0xe0b44a, { x: tx, y: SY + 1.6, z: tz, sx: 0.5, sy: 0.6, sz: 0.5, flat: true, vary: 0 });
      ctx.addGlow({ x: tx, y: SY + 1.3, z: tz + 1.3, size: 2.2, color: 0xffcf80, kind: 'always' });
      // 성 가롤로·암브로시오 은상
      [-1, 1].forEach(function (sg) { miniStatue(sg * 2.9, SY, -22.2, 1.9, 0xd9dadb); ctx.addCollider({ x: sg * 2.9, z: -22.2, r: 0.35 }); });
      // 천사상(제대 양옆, 흰 대리석)
      [-1, 1].forEach(function (sg) { miniStatue(sg * 2.3, SY, -20.3, 2.3, 0xf3efe8); S.add(Geo.box(), 0xf3efe8, { x: sg * 2.3 - sg * 0.2, y: SY + 0.9, z: -20.15, rz: sg * 0.35, sx: 0.08, sy: 1.1, sz: 0.5, flat: true, vary: 0 }); S.add(Geo.box(), 0xf3efe8, { x: sg * 2.3 + sg * 0.2, y: SY + 0.9, z: -20.15, rz: -sg * 0.35, sx: 0.08, sy: 1.1, sz: 0.5, flat: true, vary: 0 }); ctx.addCollider({ x: sg * 2.3, z: -20.3, r: 0.4 }); });
      // 원형 강론대 2개: 교차부 동쪽 기둥을 감싼 금동 고리 + 청동 받침 + 원뿔 닫집
      [-1, 1].forEach(function (sg) {
        var px = sg * XN, pz = zk(11);
        for (var q = 0; q < 4; q++) { var a2 = q * PI / 2 + PI / 4; MT.add(Geo.cyl(6, 0.8), 0x6b4a2e, { x: px + Math.cos(a2) * 1.05, y: SY, z: pz + Math.sin(a2) * 1.05, sx: 0.2, sy: 2.4, sz: 0.2, flat: true, vary: 0.02 }); }
        MT.add(Geo.cyl(12, 1.05), 0x8f6a22, { x: px, y: SY + 2.4, z: pz, sx: 1.55, sy: 0.35, sz: 1.55, flat: true, vary: 0 });
        MT.add(Geo.cyl(12, 1.0), 0xd2a746, { x: px, y: SY + 2.75, z: pz, sx: 1.5, sy: 0.95, sz: 1.5, flat: true, vary: 0 });
        MT.add(Geo.cyl(12, 1), 0xe6c45f, { x: px, y: SY + 3.7, z: pz, sx: 1.58, sy: 0.12, sz: 1.58, flat: true, vary: 0 });
        for (var q2 = 0; q2 < 6; q2++) { var a3 = q2 * PI / 3, qx = px + Math.cos(a3) * 1.4, qz = pz + Math.sin(a3) * 1.4; MT.add(Geo.cyl(5, 0.7), 0xd9b04a, { x: qx, y: SY + 3.7, z: qz, sx: 0.05, sy: 1.7, sz: 0.05, flat: true, vary: 0 }); }
        MT.add(Geo.cyl(12, 0.06), 0x6b4a2e, { x: px, y: SY + 5.4, z: pz, sx: 1.7, sy: 1.3, sz: 1.7, flat: true, vary: 0 });
        ctx.addCollider({ x: px, z: pz, r: 1.2 });
      });
      // 높은 곳 오르간 2대(채색 문짝 + 금 파이프), 제대 구역 양옆 측랑 위
      [-1, 1].forEach(function (sg) {
        var ox = sg * 3.75, oz = -17.0, oy = 16.0;
        S.add(Geo.box(), 0x6a4a2c, { x: ox, y: oy, z: oz, sx: 1.2, sy: 5.2, sz: 3.6, flat: true, vary: 0.02 });
        S.add(Geo.box(), 0x2f4f8f, { x: ox - sg * 0.62, y: oy + 0.4, z: oz, sx: 0.06, sy: 4.3, sz: 3.4, flat: true, vary: 0.02 });
        for (var q = 0; q < 14; q++) {
          var pz2 = oz - 1.45 + q * 0.223, ph = 1.7 + 1.5 * Math.abs(Math.sin(q * 0.55 + 0.6));
          MT.add(Geo.cyl(6, 1), 0xd8c892, { x: ox - sg * 0.7, y: oy + 1.4, z: pz2, sx: 0.07, sy: ph, sz: 0.07, flat: true, vary: 0.03 });
        }
        S.add(Geo.cyl(6, 0.1), 0x5a3a22, { x: ox, y: oy - 1.4, z: oz, sx: 0.6, sy: 1.4, sz: 0.6, flat: true, vary: 0.02 });
      });
      ctx.addLight({ x: 0, y: 6.5, z: -21.5, color: 0xffc27a, intensity: 1.15, distance: 26, kind: 'lamp' });
    })();

    mark('sanctuary');
    /* ===== 10. 측랑 제단·기념비·세례대·촛대·성수대 ===== */
    (function sidefurn() {
      // 측랑 제단 4(오른쪽 B7,B8 / 왼쪽 B7,B8), 바깥 벽 앞
      [7, 8].forEach(function (kk) {
        var zc = (zk(kk) + zk(kk - 1)) / 2;
        [-1, 1].forEach(function (sg) {
          var x = sg * (XW - 0.55), ry = Math.atan2(-sg, 0);
          S.add(Geo.box(), 0xcab8a6, { x: x, y: 0, z: zc, ry: ry, sx: 2.6, sy: 0.9, sz: 0.9, flat: true, vary: 0.02 });
          S.add(Geo.box(), 0xf2ece2, { x: x - sg * 0.05, y: 0.9, z: zc, ry: ry, sx: 2.7, sy: 0.08, sz: 1.0, flat: true, vary: 0.02 });
          [-1, 1].forEach(function (cc) {
            S.add(Geo.cyl(8, 1), 0x1e1e22, { x: x + sg * 0.0, y: 0.98, z: zc + cc * 1.05, sx: 0.16, sy: 2.4, sz: 0.16, flat: true, vary: 0.01 });
            MT.add(Geo.box(), GOLD, { x: x, y: 3.35, z: zc + cc * 1.05, sx: 0.5, sy: 0.18, sz: 0.5, flat: true, vary: 0 });
          });
          S.add(Geo.box(), 0xc8553f, { x: x + sg * 0.32, y: 1.1, z: zc, ry: ry, sx: 1.7, sy: 2.1, sz: 0.1, flat: true, vary: 0.03 });
          MT.add(Geo.box(), GOLD, { x: x - sg * 0.12, y: 3.2, z: zc, ry: ry, sx: 2.9, sy: 0.3, sz: 0.7, flat: true, vary: 0.02 });
          S.add(Geo.cyl(4, 0), 0x2b2b30, { x: x + sg * 0.0, y: 3.45, z: zc, ry: ry + PI / 4, sx: 1.45, sy: 0.9, sz: 0.5, flat: true, vary: 0.02 });
          ctx.addCollider({ x0: sg > 0 ? XW - 1.2 : -XW + 0.1, x1: sg > 0 ? XW - 0.1 : -XW + 1.2, z0: zc - 1.4, z1: zc + 1.4 });
          ctx.addFlame({ x: x - sg * 0.35, y: 1.45, z: zc - 1.0, scale: 1.0 });
        });
      });
      // 기념비/무덤 (바깥 벽 앞, B2..B5)
      [2, 3, 4, 5].forEach(function (kk) {
        var zc = (zk(kk) + zk(kk - 1)) / 2;
        [-1, 1].forEach(function (sg) {
          var x = sg * (XW - 0.35), ry = Math.atan2(-sg, 0);
          S.add(Geo.box(), 0x2a2a30, { x: x, y: 0.3, z: zc, ry: ry, sx: 2.0, sy: 2.6, sz: 0.3, flat: true, vary: 0.02 });
          MT.add(Geo.box(), GOLD, { x: x - sg * 0.02, y: 2.85, z: zc, ry: ry, sx: 2.2, sy: 0.12, sz: 0.4, flat: true, vary: 0 });
          S.add(Geo.box(), 0xd9d1c6, { x: x - sg * 0.5, y: 0, z: zc, ry: ry, sx: 1.7, sy: 0.7, sz: 0.7, flat: true, vary: 0.02 });
          S.add(Geo.box(), 0xe8e0d4, { x: x - sg * 0.5, y: 0.7, z: zc, ry: ry, sx: 1.8, sy: 0.1, sz: 0.8, flat: true, vary: 0.02 });
          miniStatue(x - sg * 0.55, 0.8, zc, 1.1, 0xe8dfd2);
          ctx.addCollider({ x0: sg > 0 ? XW - 1.15 : -XW + 0.1, x1: sg > 0 ? XW - 0.1 : -XW + 1.15, z0: zc - 1.0, z1: zc + 1.0 });
        });
      });
      // 세례대(왼쪽 바깥 측랑 둘째 칸): 네 기둥 닫집 + 반암 욕조
      (function bapt() {
        var bx = -11.3, bz = 28.1;
        S.add(Geo.cyl(10, 0.9), 0x7a2f35, { x: bx, y: 0, z: bz, sx: 0.9, sy: 0.75, sz: 0.9, flat: true, vary: 0.02 });
        S.add(Geo.cyl(10, 1), 0x6a2830, { x: bx, y: 0.75, z: bz, sx: 0.95, sy: 0.12, sz: 0.95, flat: true, vary: 0.02 });
        GW.add(Geo.cyl(10, 1), 0x6a9bb0, { x: bx, y: 0.85, z: bz, sx: 0.8, sy: 0.02, sz: 0.8, flat: true, vary: 0 });
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (cc) { MT.add(Geo.cyl(8, 1), 0xd9b04a, { x: bx + cc[0] * 1.15, y: 0, z: bz + cc[1] * 1.15, sx: 0.1, sy: 3.4, sz: 0.1, flat: true, vary: 0 }); });
        MT.add(Geo.box(), GOLD, { x: bx, y: 3.4, z: bz, sx: 2.8, sy: 0.18, sz: 2.8, flat: true, vary: 0 });
        MT.add(Geo.cyl(4, 0), 0xcf9f3e, { x: bx, y: 3.58, z: bz, ry: PI / 4, sx: 1.9, sy: 1.1, sz: 1.9, flat: true, vary: 0 });
        ctx.addCollider({ x: bx, z: bz, r: 1.45 });
      })();
      // 성수대(정면 문 안쪽)
      ctx.holyFont({ x: -2.3, z: 33.4 }); ctx.holyFont({ x: 2.3, z: 33.4 });
      // 트리불치오 청동 촛대(북쪽 익랑) + 성 바르톨로메오 상(남쪽 익랑)
      (function tri() {
        var tx = -15.5, tz = -10.2;
        ctx.cyl({ x: tx, y: 0, z: tz, r: 0.5, rTop: 0.28, h: 0.8, seg: 8, color: 0x6b5030 });
        ctx.cyl({ x: tx, y: 0.8, z: tz, r: 0.14, h: 3.9, seg: 6, color: 0x8a6a3a });
        for (var q = 0; q < 7; q++) {
          var a3 = q / 7 * PI * 2, rr = 0.9;
          S.addBeam([tx, 3.6, tz], [tx + Math.cos(a3) * rr, 4.6, tz + Math.sin(a3) * rr], 0.07, 0.07, 0x8a6a3a);
          S.add(Geo.cyl(6, 1), 0xfff0cf, { x: tx + Math.cos(a3) * rr, y: 4.6, z: tz + Math.sin(a3) * rr, sx: 0.05, sy: 0.25, sz: 0.05, flat: true, vary: 0 });
          GW.add(Geo.cyl(4, 0), 0xffd070, { x: tx + Math.cos(a3) * rr, y: 4.85, z: tz + Math.sin(a3) * rr, sx: 0.06, sy: 0.14, sz: 0.06, vary: 0 });
        }
        ctx.addCollider({ x: tx, z: tz, r: 0.5 });
        ctx.box({ x: 15.5, y: 0, z: -16.0, w: 1.1, h: 0.9, d: 1.1, color: 0xe3dccf });
        miniStatue(15.5, 0.9, -16.0, 1.9, 0xf0e8dc);
        ctx.addCollider({ x: 15.5, z: -16.0, r: 0.8 });
      })();
      // 신자석 / 촛불대
      ctx.renderSeats(layout, 'bench', { wood: 0x4f3322, seat: 0x6a4630, back: 0x3f281a });
      ctx.candleStand(0, { wood: 0x5a3d28 }); ctx.candleStand(1, { wood: 0x5a3d28 });
    })();

    mark('sidefurn');
    /* ===== 11. 벽 충돌체 ===== */
    (function colliders() {
      var inset = 0.45;
      [-1, 1].forEach(function (sg) {
        // 바깥 벽
        ctx.addCollider({ x0: sg > 0 ? XW - inset : -XW - 1.2, x1: sg > 0 ? XW + 1.2 : -XW + inset, z0: zk(8), z1: ZF + 1.2 });
        // 익랑 끝 벽 / 남북 벽
        ctx.addCollider({ x0: sg > 0 ? XT - inset : -XT - 1.2, x1: sg > 0 ? XT + 1.2 : -XT + inset, z0: zk(12) - 1.2, z1: zk(8) + 1.2 });
        ctx.addCollider({ x0: sg > 0 ? XW - 0.1 : -XT - 1.2, x1: sg > 0 ? XT + 1.2 : -XW + 0.1, z0: zk(8) - 0.0, z1: zk(8) + 1.2 });
        ctx.addCollider({ x0: sg > 0 ? XA : -XT - 1.2, x1: sg > 0 ? XT + 1.2 : -XA, z0: zk(12) - 1.2, z1: zk(12) + inset });
        // 성구실 쪽 벽 x=±XA, z -19.25..-29
        ctx.addCollider({ x0: sg > 0 ? XA - inset : -XA - 1.2, x1: sg > 0 ? XA + 1.2 : -XA + inset, z0: -29.2, z1: zk(12) + 0.2 });
      });
      ctx.addCollider({ x0: -XW - 1.2, x1: XW + 1.2, z0: ZF - 0.2, z1: ZF + 1.4 });   // 정면
      // 후진 사선·끝 벽(원 사슬)
      for (var e = 1; e <= 3; e++) {
        var A = OUTW[e], B = OUTW[e + 1], len = dist(A, B), n = Math.ceil(len / 0.8);
        for (var i = 0; i <= n; i++) ctx.addCollider({ x: lerp(A[0], B[0], i / n), z: lerp(A[1], B[1], i / n), r: 0.85 });
      }
      ctx.addCollider({ x0: -10, x1: 10, z0: -36.5, z1: -34.9 + 0.25 });
      // 정면 벽기둥
      [-XA, -XN, XN, XA].forEach(function (x) { ctx.addCollider({ x0: x - 0.7, x1: x + 0.7, z0: ZF - 0.9, z1: ZF + 0.1 }); });
      // 성구실 모서리 벽 돌출 / 팔 모서리
      ctx.setCameraBounds({ x0: -XT + 0.1, x1: XT - 0.1, z0: -34.4, z1: ZF - 0.5, yMax: 28 });
      ctx.setSky({ outside: false });
    })();

    /* ===== 12. 카메라 보정(고창 성당): 건물 윤곽 밖으로 못 나가게 + 위를 더 보게 ===== */
    (function camFix() {
      function inside(x, z) {
        var m = 0.35;
        if (Math.abs(x) <= XW - m && z <= ZF - m && z >= zk(8) - 0.3) return true;          // 신랑부
        if (Math.abs(x) <= XT - m && z <= zk(8) + 0.3 && z >= zk(12) + m) return true;       // 익랑
        if (Math.abs(x) <= XA - m && z <= zk(12) + 0.3 && z >= -34.3) return true;           // 성가대·후진
        return false;
      }
      var tmp = { x: 0, z: 0 };
      ctx.onUpdate(function () {
        var A = window.__church;
        if (!A || !A.camera || !A.me || !A.world) return;
        var cam = A.camera, me = A.me;
        var cx = cam.position.x, cz = cam.position.z;
        if (!inside(cx, cz)) {
          var lo = 0, hi = 1, px = me.x, pz = me.z;
          for (var it = 0; it < 14; it++) { var mid = (lo + hi) / 2; if (inside(px + (cx - px) * mid, pz + (cz - pz) * mid)) lo = mid; else hi = mid; }
          cam.position.x = px + (cx - px) * lo; cam.position.z = pz + (cz - pz) * lo;
          cam.position.y = Math.max(cam.position.y, me.y + 1.4);
          cam.lookAt(A.camLook);
        }
        var wantFov = A.camera.aspect < 0.8 ? 66 : 62;
        if (Math.abs(cam.fov - wantFov) > 0.01) { cam.fov = wantFov; cam.updateProjectionMatrix(); }
        cam.rotateX(0.12 + 0.30 * (1 - Math.min(1, A.ctl ? (A.ctl.pitch - 0.12) / 0.8 : 0.5)));
      });
    })();

    /* ===== 13. 조립: 질감 궁륭 메시 ===== */
    Object.keys(texGroups).forEach(function (key) {
      var tg = texGroups[key], g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(tg.pos), 3));
      g.setAttribute('uv', new T.BufferAttribute(new Float32Array(tg.uv), 2));
      g.computeVertexNormals();
      var mesh = new T.Mesh(g, ctx.mats.lambert({ tex: getTex(key), side: T.DoubleSide }));
      mesh.castShadow = true; mesh.receiveShadow = true;
      ctx.add(mesh); ctx.stats.meshes++;
      ctx.stats.vaultVerts = (ctx.stats.vaultVerts || 0) + tg.pos.length / 3;
    });
  }
})();
