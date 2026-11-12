/* ch_maggiore.js — 성 마리아 마조레 대성전(Basilica di Santa Maria Maggiore, 로마). scalePercent 80.
   조사서: docs/church/interiors/maggiore.md (§6 좌표, §11 채택값). 2열 이오니아 열주(각 20) + 수평 들보, 평평한 금빛 격자 천장,
   모자이크 띠 + 고창(실제 개구부+유리), 개선문 모자이크, 금빛 반돔 후진, 포르피리 발다키노, 코스마테스크 바닥, 콘페시오 난간, 측랑 끝 경당 2곳. */
(function () {
  'use strict';

  // ---------- (A) 레이아웃: 순수 데이터 ----------
  var layout = {
    id: 'maggiore', scalePercent: 80,
    bounds: { x0: -11.98, x1: 11.98, z0: -23.2, z1: 34.2 },
    spawn: { x: 0, z: 29.5, r: 0 },
    seatGroups: [
      { g: 'L', rows: 14, perRow: 4, origin: { x: -1.5, z: -12.0 }, dx: -1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.5, 0.5] },
      { g: 'R', rows: 14, perRow: 4, origin: { x: 1.5, z: -12.0 }, dx: 1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.5, 0.5] }
    ],
    candles: { stands: [{ x: -10.5, z: -5.4, slots: 96, reach: 1.8, cols: 16, face: [1, 0], pitch: 0.5, step: 0.25, ystep: 0.3, y0: 0.8 }] },
    info: { name: '성 마리아 마조레 대성전', place: '이탈리아 로마', builtYear: 432 }
  };
  ChurchLayouts.register(layout);

  // ---------- (B) 빌더 ----------
  ChurchBuilders['maggiore'] = {
    layout: layout,
    thumb: { x: 0, z: 23, yaw: 0, pitch: 7, zoom: 0.8, hour: 12 },
    build: function (ctx) {
      var T = ctx.THREE, PI = Math.PI, low = ctx.quality === 'low';
      var G = window.ChurchGeo, Geo = G.Geo;
      var solid = ctx.solid;
      var rnd = ctx.rng(4242);
      var _mk = 0; function mark(n) { if (window.__mgDebug) console.log('MARK ' + n + ' ' + (solid.vertexCount - _mk)); _mk = solid.vertexCount; }

      // ----- 치수(앱 m; 조사서 §6 + §11) -----
      var Z_A = -23.2, Z_E = 34.4, NB = 21, BAY = (Z_E - Z_A) / NB;   // 베이 2.743
      var XC = 6.8, XN = 6.4, XA = 12.2;                               // 기둥 중심 / 신랑 벽 안쪽면 / 측랑 외벽 안쪽면
      var Y_COL = 5.5, Y_ENT = 6.8, Y_TOP = 14.4, Y_AV = 6.0;          // 기둥 꼭대기 / 들보 위 / 천장 / 측랑 궁륭 시작
      var PY = 0.4;                                                    // 성소 단 높이
      function colZ(k) { return Z_A + BAY * k; }
      function bayC(k) { return Z_A + BAY * (k + 0.5); }

      // ----- 팔레트(조사서 §5; 조명에 어두워지는 것을 감안해 살짝 밝게) -----
      var MARBLE = 0xe6dfcd, MARBLE_D = 0xcfc7b3, GOLD = 0xd8b23a, GOLD_L = 0xeac85a, GOLD_D = 0x9a7a22;
      var PORPH = 0x5e2338, SERP = 0x3a6b52, LAPIS = 0x2a4a8a, GRANITE = 0xa4a49e, PLASTER = 0xeadfc6, FRESCO = 0xdcc096, WOOD = 0x6b4a30, WOOD_D = 0x3b2a1e;
      var GL = [0xfff4d6, 0xf6e8b8, 0xe6eefa, 0xfdf0cc, 0xeadfb0, 0xf3dcae];
      var css = ctx.tex.shade;
      var TG = 0xc79a2a, TGG = 0x6a5016;   // 모자이크용 짙은 금색(톤매핑·환경광에 하얗게 날아가지 않게)

      // ----- 작은 도구 -----
      function B(x0, x1, y0, y1, z0, z1, c, o) { ctx.boxAABB({ x0: x0, x1: x1, y0: y0, y1: y1, z0: z0, z1: z1, color: c, vary: o && o.vary }); }
      function BM(x0, x1, y0, y1, z0, z1, c, o) { ctx.boxAABB(mb({ x0: x0, x1: x1, y0: y0, y1: y1, z0: z0, z1: z1, color: c, vary: o && o.vary })); }
      function cylX(x, y, z, r, len, c, seg) { // x축 방향 원기둥(중심 x)
        MBATCH.add(Geo.cyl(seg || 10, 1), c, { x: x + len / 2, y: y, z: z, rz: PI / 2, sx: r, sy: len, sz: r, flat: true, vary: 0.03 });
      }
      var HASM = !!(ctx.hasPhoto && ctx.hasPhoto('marble_white'));
      var MBATCH = HASM ? ctx.surfBatch('marble_white') : (ctx.gloss || solid);   // 광택 대리석(사진 질감 또는 광택 재질)
      function mb(o) { if (HASM) o.surf = 'marble_white'; else if (ctx.gloss) o.gloss = true; return o; }
      var GLB = ctx.gloss || solid, MET = ctx.metalB || solid;
      var _cyO = {};
      function cylO(x, y, z, r, rTop, h, seg, c, flat, vary, batch) { // 마구리 없는 원기둥(정점 절약)
        var key = seg + '_' + (rTop / r).toFixed(3);
        var g = _cyO[key] || (_cyO[key] = new T.CylinderGeometry(rTop / r, 1, 1, seg, 1, true).translate(0, 0.5, 0));
        (batch || solid).add(g, c, { x: x, y: y, z: z, sx: r, sy: h, sz: r, flat: !!flat, vary: vary });
      }
      function groin(x0, x1, z0, z1, y, rise, nz, color) { // 측랑 교차 궁륭(칸마다 6x6)
        var res = 6, bd = (z1 - z0) / nz, ax = (x1 - x0) / 2, az = bd / 2, ox = (x0 + x1) / 2;
        var fu = ChurchKit.profileFn('round', ax, rise), fv = ChurchKit.profileFn('round', az, rise);
        var cTop = G.toColor(color), cLow = cTop.clone().multiplyScalar(0.9);
        for (var bz = 0; bz < nz; bz++) {
          var oz = z0 + bd * (bz + 0.5);
          for (var i = 0; i < res; i++) for (var j = 0; j < res; j++) {
            var u0 = -ax + 2 * ax * i / res, u1 = -ax + 2 * ax * (i + 1) / res, v0 = -az + 2 * az * j / res, v1 = -az + 2 * az * (j + 1) / res;
            function H(u, v) { return Math.min(fu(u), fv(v)); }
            var h00 = H(u0, v0), h10 = H(u1, v0), h11 = H(u1, v1), h01 = H(u0, v1);
            solid.addQuad([ox + u0, y + h00, oz + v0], [ox + u1, y + h10, oz + v0], [ox + u1, y + h11, oz + v1], [ox + u0, y + h01, oz + v1], cLow.clone().lerp(cTop, Math.min(1, (h00 + h11) / (2 * rise))), [ox, y - 1, oz]);
          }
        }
      }
      function twisted(x, z, y, h, r, c, gold) { // 솔로몬 꼬임 기둥(가벼운 버전)
        cylO(x, y, z, r * 0.62, r * 0.62, h, 10, ctx.shade(c, 0.85), false, undefined, GLB);
        var N = low ? 12 : 20;
        for (var st = 0; st < 3; st++) for (var i = 0; i < N; i++) {
          var a0 = i * 0.36 + st * 2.094, a1 = (i + 1) * 0.36 + st * 2.094;
          GLB.addBeam([x + Math.cos(a0) * r * 0.62, y + h * i / N, z + Math.sin(a0) * r * 0.62], [x + Math.cos(a1) * r * 0.62, y + h * (i + 1) / N, z + Math.sin(a1) * r * 0.62], r * 0.3, r * 0.3, c, { vary: 0.03 });
        }
      }
      function mtex(w, h, mw, mh, draw) { // 미터 단위로 그리는 캔버스 질감
        return ctx.tex.custom(w, h, function (g, W, H) { g.save(); g.scale(W / mw, H / mh); draw(g, mw, mh); g.restore(); });
      }
      function goldFill(g, x, y, w, h, cell, base, grout) {
        g.fillStyle = css(grout === undefined ? GOLD_D : grout, 1); g.fillRect(x, y, w, h);
        var nx = Math.ceil(w / cell), ny = Math.ceil(h / cell);
        for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
          g.fillStyle = css(base === undefined ? GOLD_L : base, 0.8 + rnd() * 0.36);
          g.fillRect(x + i * cell, y + j * cell, Math.min(cell * 0.92, w - i * cell), Math.min(cell * 0.92, h - j * cell));
        }
      }
      function blueFill(g, x, y, w, h, cell, c1, c2) {
        var nx = Math.ceil(w / cell), ny = Math.ceil(h / cell);
        for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
          g.fillStyle = css(ctx.mix(c1, c2, j / Math.max(1, ny - 1)), 0.85 + rnd() * 0.3);
          g.fillRect(x + i * cell, y + j * cell, Math.min(cell * 0.94, w - i * cell), Math.min(cell * 0.94, h - j * cell));
        }
      }
      function saint(g, x, y, h, robe, mant) {  // x 중심, y 발
        g.fillStyle = css(robe, 1); g.beginPath(); g.moveTo(x - h * 0.17, y); g.lineTo(x - h * 0.11, y - h * 0.72); g.lineTo(x + h * 0.11, y - h * 0.72); g.lineTo(x + h * 0.17, y); g.closePath(); g.fill();
        g.fillStyle = css(mant, 1); g.beginPath(); g.moveTo(x - h * 0.05, y); g.lineTo(x - h * 0.11, y - h * 0.7); g.lineTo(x - h * 0.2, y - h * 0.1); g.lineTo(x - h * 0.17, y); g.closePath(); g.fill();
        g.fillStyle = '#f0cfa8'; g.beginPath(); g.arc(x, y - h * 0.8, h * 0.075, 0, 6.3); g.fill();
        g.strokeStyle = css(GOLD_L, 1); g.lineWidth = h * 0.025; g.beginPath(); g.arc(x, y - h * 0.8, h * 0.115, 0, 6.3); g.stroke();
      }
      function lamb(g, x, y, s) {
        g.fillStyle = '#f4efe2'; g.beginPath(); g.ellipse(x, y - s * 0.28, s * 0.3, s * 0.2, 0, 0, 6.3); g.fill();
        g.beginPath(); g.ellipse(x + s * 0.3, y - s * 0.42, s * 0.11, s * 0.1, 0, 0, 6.3); g.fill();
        g.fillStyle = '#d8d0bc'; [-0.18, -0.06, 0.1, 0.2].forEach(function (d) { g.fillRect(x + s * d, y - s * 0.12, s * 0.05, s * 0.14); });
      }
      var PALS = [0xf4efe2, 0x2a4a8a, 0xb5533c, 0xd8b23a, 0x4d7a5a, 0xe9e0cc, 0x7a3045];

      // ----- 재질(키트 팩토리) -----
      function texMat(tex, o) { o = o || {}; var m = ctx.mats.lambert({ tex: tex, side: o.side, color: o.color }); return m; }
      var glowMats = []; // 시간대에 따라 밝기를 바꾸는 자기발광 재질
      function emissiveMat(tex, k, o) {
        var m = texMat(tex, o);
        if (m.emissive) { m.emissive.setHex(0xffffff); m.emissiveMap = tex; m.emissiveIntensity = k; glowMats.push({ m: m, k: k }); }
        if (o.sheen !== undefined && m.metalness !== undefined) { m.metalness = o.sheen; m.roughness = 0.42; m.envMapIntensity = 1.3; }
        return m;
      }
      ctx.onHour(function (env) {
        var f = 0.55 + 0.45 * (1 - env.night);
        glowMats.forEach(function (g) { if (g.m.emissiveIntensity !== undefined) g.m.emissiveIntensity = g.k * f; });
      });

      // ----- 텍스처 입힌 면(UV) 누적기 -----
      function TexSink() { this.P = []; this.N = []; this.U = []; }
      TexSink.prototype.quad = function (a, b, c, d, ua, ub, uc, ud, n) {
        var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        var cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
        var flip = cx * n[0] + cy * n[1] + cz * n[2] < 0;
        var order = flip ? [[a, ua], [c, uc], [b, ub], [a, ua], [d, ud], [c, uc]] : [[a, ua], [b, ub], [c, uc], [a, ua], [c, uc], [d, ud]];
        for (var i = 0; i < 6; i++) { this.P.push(order[i][0][0], order[i][0][1], order[i][0][2]); this.N.push(n[0], n[1], n[2]); this.U.push(order[i][1][0], order[i][1][1]); }
      };
      TexSink.prototype.mesh = function (mat) {
        var g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(new Float32Array(this.P), 3));
        g.setAttribute('normal', new T.BufferAttribute(new Float32Array(this.N), 3));
        g.setAttribute('uv', new T.BufferAttribute(new Float32Array(this.U), 2));
        g.computeBoundingSphere();
        var m = ctx.mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
      };

      // ----- 개구부가 있는 벽: 앞면(방 쪽)은 색/질감, 개구부는 실제로 뚫리고 안쪽 면(리빌)이 생긴다 -----
      function frameOf(px, pz, nx, nz) { return { px: px, pz: pz, nx: nx, nz: nz, ux: nz, uz: -nx }; }
      function P3(F, u, v, d) { return [F.px + F.ux * u + F.nx * (d || 0), v, F.pz + F.uz * u + F.nz * (d || 0)]; }
      function archPts(h) {
        var rise = h.rise === undefined ? h.w / 2 : h.rise, n = low ? 8 : 14;
        return ChurchKit.profilePts(h.top === 'pointed' ? 'pointed' : 'round', h.w / 2, rise, n);
      }
      function openWall(o) {
        var F = o.F, t = o.t === undefined ? 0.7 : o.t, vc = o.vary === undefined ? 0.02 : o.vary;
        var rc = o.rcolor === undefined ? PLASTER : o.rcolor;
        function fq(ua, va, ub, vb, uc, vc2, ud, vd) {
          var A = P3(F, ua, va), Bq = P3(F, ub, vb), C = P3(F, uc, vc2), D = P3(F, ud, vd);
          if (o.tex) o.tex.quad(A, Bq, C, D, o.uv(A), o.uv(Bq), o.uv(C), o.uv(D), [F.nx, 0, F.nz]);
          else solid.addQuad(A, Bq, C, D, o.color, P3(F, (ua + uc) / 2, (va + vc2) / 2, 3), { vary: vc });
        }
        function rq(a, b, c, d, hint) { solid.addQuad(a, b, c, d, rc, hint, { vary: 0.01 }); }
        var holes = (o.holes || []).slice().sort(function (a, b) { return (a.u - a.w / 2) - (b.u - b.w / 2); });
        var cur = o.u0;
        holes.forEach(function (h) {
          var l = h.u - h.w / 2, r = h.u + h.w / 2, spring = h.yb + h.h;
          if (l > cur + 1e-6) fq(cur, o.y0, l, o.y0, l, o.y1, cur, o.y1);
          cur = r;
          if (h.yb > o.y0 + 1e-6) fq(l, o.y0, r, o.y0, r, h.yb, l, h.yb);
          var hint = P3(F, h.u, h.yb + h.h * 0.5, -t * 0.5);
          if (h.top === 'flat' || h.top === undefined && false) {
            if (spring < o.y1) fq(l, spring, r, spring, r, o.y1, l, o.y1);
            rq(P3(F, l, spring, 0), P3(F, r, spring, 0), P3(F, r, spring, -t), P3(F, l, spring, -t), hint);
          } else {
            var pts = archPts(h);
            for (var i = 0; i < pts.length - 1; i++) {
              var ua = h.u + pts[i][0], ub = h.u + pts[i + 1][0], va = spring + pts[i][1], vb = spring + pts[i + 1][1];
              fq(ua, va, ub, vb, ub, o.y1, ua, o.y1);
              rq(P3(F, ua, va, 0), P3(F, ub, vb, 0), P3(F, ub, vb, -t), P3(F, ua, va, -t), hint);
            }
          }
          // 좌우 문설주 + 문턱
          rq(P3(F, l, h.yb, 0), P3(F, l, spring, 0), P3(F, l, spring, -t), P3(F, l, h.yb, -t), hint);
          rq(P3(F, r, h.yb, 0), P3(F, r, spring, 0), P3(F, r, spring, -t), P3(F, r, h.yb, -t), hint);
          if (h.yb > o.y0 + 1e-6) rq(P3(F, l, h.yb, 0), P3(F, r, h.yb, 0), P3(F, r, h.yb, -t), P3(F, l, h.yb, -t), P3(F, h.u, h.yb + 2, -t * 0.5));
        });
        if (o.u1 > cur + 1e-6) fq(cur, o.y0, o.u1, o.y0, o.u1, o.y1, cur, o.y1);
      }
      function mkWindow(F, u, yb, gw, gh, top, seed, beam, depth, reach) {
        var p = P3(F, u, yb, -(depth === undefined ? 0.32 : depth));
        ctx.window({ x: p[0], y: p[1], z: p[2], face: [F.nx, F.nz], w: gw, h: gh, top: top || 'round', pattern: 'lancet', colors: GL, seed: seed, beam: !!beam, beamReach: reach || 9 });
      }
      // 창 구멍 사양(유리 폭 gw, 사각부 높이 gh, 아래틀 yb)
      function winHole(u, yb, gw, gh) { return { u: u, w: gw + 0.36, yb: yb - 0.22, h: gh + 0.32, top: 'round', rise: (gw + 0.36) / 2 }; }

      // =====================================================================
      // 바닥(코스마테스크): 신랑 중앙 + 측랑 + 성소
      // =====================================================================
      var floorTex = mtex(1024, 1024, 13.6, 14.4, function (g, W, H) {
        g.fillStyle = '#e4dcc8'; g.fillRect(0, 0, W, H);
        g.lineWidth = 0.012;
        for (var v = 0; v < 70; v++) { g.strokeStyle = 'rgba(130,120,110,' + (0.04 + rnd() * 0.07) + ')'; g.beginPath(); var x = rnd() * W, y = rnd() * H; g.moveTo(x, y); for (var s = 0; s < 4; s++) { x += (rnd() - 0.5) * 1.6; y += (rnd() - 0.5) * 1.6; g.lineTo(x, y); } g.stroke(); }
        function disc(cx, cy, R, rings) { rings.forEach(function (r) { g.fillStyle = r[1]; g.beginPath(); g.arc(cx, cy, R * r[0], 0, 6.3); g.fill(); }); }
        var PO = '#6a2438', SE = '#2f5d46', GR = '#8f8f89', WH = '#e8e1ce', GO = '#c9a227', DK = '#4a3a3a';
        // 가장자리 띠
        g.fillStyle = GR; g.fillRect(0.28, 0, 0.1, H); g.fillRect(13.22, 0, 0.1, H);
        g.fillStyle = PO; g.fillRect(0.42, 0, 0.07, H); g.fillRect(13.11, 0, 0.07, H);
        // 양옆 구획: 마름모 격자
        [[0.6, 4.6], [9.0, 13.0]].forEach(function (rg) {
          var x0 = rg[0], x1 = rg[1];
          g.save(); g.beginPath(); g.rect(x0, 0, x1 - x0, H); g.clip();
          for (var j = -1; j < 20; j++) for (var i = -1; i < 7; i++) {
            var cx = x0 + (i + (j % 2 ? 0.5 : 0)) * 0.9, cy = j * 0.8;
            g.fillStyle = (i + j) % 2 ? '#9f9988' : '#dcd4c0'; g.beginPath(); g.moveTo(cx, cy - 0.44); g.lineTo(cx + 0.46, cy); g.lineTo(cx, cy + 0.44); g.lineTo(cx - 0.46, cy); g.closePath(); g.fill();
            if (j % 3 === 0 && i % 2 === 0) { g.fillStyle = SE; g.beginPath(); g.arc(cx, cy, 0.09, 0, 6.3); g.fill(); }
          }
          g.restore();
          g.strokeStyle = GR; g.lineWidth = 0.06; g.strokeRect(x0, 0.02, x1 - x0, H - 0.04);
          [3.6, 10.8].forEach(function (cz) { disc((x0 + x1) / 2, cz, 1.0, [[1, GR], [0.93, WH], [0.82, PO], [0.66, WH], [0.58, SE], [0.34, PO], [0.12, GO]]); });
        });
        // 중앙 통로
        g.fillStyle = WH; g.fillRect(4.75, 0, 4.1, H);
        g.fillStyle = PO; g.fillRect(4.78, 0, 0.12, H); g.fillRect(8.7, 0, 0.12, H);
        g.fillStyle = GR; g.fillRect(4.92, 0, 0.05, H); g.fillRect(8.63, 0, 0.05, H);
        // 큰 원판(길로슈)
        disc(6.8, 3.6, 1.55, [[1, GR], [0.94, WH], [0.88, PO], [0.8, WH], [0.74, SE], [0.64, WH], [0.5, PO], [0.34, WH], [0.2, GO]]);
        for (var a = 0; a < 20; a++) { g.fillStyle = a % 2 ? GO : SE; g.beginPath(); g.arc(6.8 + Math.cos(a * 0.314) * 1.36, 3.6 + Math.sin(a * 0.314) * 1.36, 0.06, 0, 6.3); g.fill(); }
        // 사각 구획 + 원 + 모서리 원판
        g.fillStyle = GR; g.fillRect(5.0, 9.1, 3.6, 3.4); g.fillStyle = WH; g.fillRect(5.06, 9.16, 3.48, 3.28);
        g.strokeStyle = DK; g.lineWidth = 0.03; g.beginPath(); g.moveTo(5.06, 9.16); g.lineTo(8.54, 12.44); g.moveTo(8.54, 9.16); g.lineTo(5.06, 12.44); g.stroke();
        disc(6.8, 10.8, 1.2, [[1, GR], [0.92, SE], [0.8, WH], [0.62, PO], [0.3, GO]]);
        [[5.45, 9.7], [8.15, 9.7], [5.45, 11.9], [8.15, 11.9]].forEach(function (p) { disc(p[0], p[1], 0.38, [[1, GR], [0.8, PO], [0.4, WH]]); });
        // 띠 장식(작은 사각)
        for (var q = 0; q < 28; q++) { g.fillStyle = q % 2 ? PO : SE; g.fillRect(5.2 + (q % 2) * 0, 0.3 + q * 0.5, 0.0, 0); }
        g.fillStyle = GO; for (var m = 0; m < 14; m++) { g.fillRect(6.72, 5.7 + m * 0.0, 0, 0); }
        for (var s2 = 0; s2 < 9; s2++) { var yy = 5.75 + s2 * 0.42 - (s2 > 4 ? 0 : 0); if (yy > 7.7 && yy < 8.9) continue; g.fillStyle = s2 % 2 ? PO : SE; g.fillRect(6.55, yy, 0.5, 0.18); }
      });
      var tileN = [13.6, 14.4];
      ctx.floor({ x0: -XC, x1: XC, z0: -15.6, z1: Z_E, y: 0, tex: floorTex, tile: tileN, gloss: 0.6, reflect: 0.25 });
      var aisleTex = ctx.tex.checker({ c1: 0xf2eee4, c2: 0xd7cfbd });
      ctx.floor({ x0: XC, x1: XA + 0.5, z0: Z_A, z1: Z_E, y: 0, tex: aisleTex, tile: 2.7, gloss: 0.8, reflect: false });
      ctx.floor({ x0: -XA - 0.5, x1: -XC, z0: Z_A, z1: Z_E, y: 0, tex: aisleTex, tile: 2.7, gloss: 0.8, reflect: false });
      var cosm = ctx.tex.pattern('cosmati', { c1: 0xf2eee4, c2: 0x3a6b52, c3: 0x7a3045 });
      ctx.floor({ x0: -XA, x1: XA, z0: -28.8, z1: Z_A, y: PY, tex: cosm, tile: 2.8, gloss: 0.85, reflect: false });
      ctx.floor({ x0: -5.6, x1: 5.6, z0: -34.4, z1: -28.8, y: PY, tex: cosm, tile: 2.8, gloss: 0.85, reflect: false });

      mark('floors');
      // =====================================================================
      // 열주 + 수평 들보 (한쪽 20개: 대리석 18 + 화강암 2)
      // =====================================================================
      function ionicColumn(x, z, c) {
        var r = 0.375, cd = ctx.shade(c, 0.93), MB_ = MBATCH;
        BM(x - 0.52, x + 0.52, 0, 0.14, z - 0.52, z + 0.52, ctx.shade(c, 0.97));                  // 플린스
        cylO(x, 0.14, z, 0.5, 0.45, 0.1, 12, c, false, undefined, MB_);
        cylO(x, 0.24, z, 0.44, 0.41, 0.17, 12, cd, false, undefined, MB_);                         // 스코티아+토루스
        cylO(x, 0.41, z, r, 0.315, 4.5, low ? 10 : 14, c, false, undefined, MB_);                  // 기둥몸
        cylO(x, 4.91, z, 0.34, 0.34, 0.06, 12, GOLD_D, false, undefined, MET);                      // 목 띠(금동)
        cylO(x, 4.97, z, 0.33, 0.43, 0.14, 12, c, false, undefined, MB_);                           // 에키누스
        BM(x - 0.32, x + 0.32, 5.1, 5.27, z - 0.58, z + 0.58, ctx.shade(c, 1.02));                  // 쿠션
        [-1, 1].forEach(function (sg) {                                                           // 볼류트 원판(축이 x)
          cylX(x, 5.15, z + sg * 0.5, 0.22, 0.68, cd, 10);
          MET.add(Geo.cyl(8, 1), GOLD_D, { x: x + 0.37, y: 5.2, z: z + sg * 0.5, rz: PI / 2, sx: 0.09, sy: 0.74, sz: 0.09, flat: true, vary: 0.02 });
        });
        BM(x - 0.38, x + 0.38, 5.4, 5.5, z - 0.66, z + 0.66, ctx.shade(c, 1.05));                  // 아바쿠스
        ctx.addCollider({ x: x, z: z, r: 0.42 });
        if (ctx.aoDecalCircle) ctx.aoDecalCircle({ x: x, z: z, r: 0.52, y: 0, pad: 0.22 });
      }
      [-1, 1].forEach(function (s) {
        for (var k = 1; k <= 20; k++) ionicColumn(s * XC, colZ(k), (k === 2 || k === 4) ? GRANITE : MARBLE);
      });
      // 들보(건축 띠): 아키트레이브 3단 + 프리즈 + 치형 + 코니스
      [-1, 1].forEach(function (s) {
        var cz = (Z_A + Z_E) / 2, len = Z_E - Z_A, x = s * XC;
        ctx.box(mb({ x: x, y: 5.5, z: cz, w: 0.72, h: 0.17, d: len, color: MARBLE }));
        ctx.box(mb({ x: x, y: 5.67, z: cz, w: 0.77, h: 0.17, d: len, color: ctx.shade(MARBLE, 0.97) }));
        ctx.box(mb({ x: x, y: 5.84, z: cz, w: 0.82, h: 0.17, d: len, color: MARBLE }));
        ctx.box(mb({ x: x, y: 6.01, z: cz, w: 0.74, h: 0.3, d: len, color: 0xe4dccb }));                 // 프리즈
        ctx.box(mb({ x: x, y: 6.31, z: cz, w: 0.82, h: 0.1, d: len, color: MARBLE }));
        ctx.box(mb({ x: x, y: 6.41, z: cz, w: 0.98, h: 0.1, d: len, color: MARBLE_D }));                 // 받침 몰딩
        ctx.box(mb({ x: x, y: 6.51, z: cz, w: 1.14, h: 0.2, d: len, color: MARBLE }));                   // 코로나
        ctx.box({ x: x, y: 6.71, z: cz, w: 1.18, h: 0.1, d: len, color: GOLD, metal: true });          // 금빛 시마
        for (var z = Z_A + 0.3; z < Z_E - 0.2; z += 0.45) ctx.box(mb({ x: x - s * 0.43, y: 6.31, z: z, w: 0.12, h: 0.1, d: 0.17, color: MARBLE_D, vary: 0 }));
      });

      // =====================================================================
      // 신랑 벽(모자이크 띠 + 고창 실제 개구부) — 텍스처 면 + 창 구멍
      // =====================================================================
      var TW = 2 * BAY;
      var clereTex = mtex(1024, 1024, TW, 7.6, function (g, W, H) {
        function Y(m) { return 7.6 - m; }
        g.fillStyle = css(PLASTER, 1); g.fillRect(0, 0, W, H);
        // 모자이크 띠 m 0..3.1
        for (var b = 0; b < 2; b++) {
          var bx = b * BAY;
          goldFill(g, bx, Y(3.1), BAY, 3.1, 0.07, TG, TGG);
          var px = bx + 0.26, pw = BAY - 0.52, pt = Y(2.75), ph = 2.2;
          g.fillStyle = css(GOLD_D, 1); g.fillRect(px - 0.06, pt - 0.06, pw + 0.12, ph + 0.12);
          blueFill(g, px, pt, pw, ph * 0.72, 0.07, 0x274c8f, 0x7ea8d8);
          g.fillStyle = css(0x6b7a3a, 1); g.fillRect(px, pt + ph * 0.72, pw, ph * 0.28);
          for (var i = 0; i < 5; i++) saint(g, px + 0.35 + i * (pw - 0.7) / 4, pt + ph * 0.94, 1.2, PALS[(i + b * 3) % PALS.length], PALS[(i * 2 + b + 1) % PALS.length]);
          g.fillStyle = css(0xe8dcc0, 1); g.fillRect(px + 0.1, pt + 0.18, 0.5, 0.32); g.fillStyle = css(0xb5533c, 1); g.fillRect(px + 0.08, pt + 0.12, 0.54, 0.08);
          g.fillRect(px + pw - 0.62, pt + 0.2, 0.46, 0.34); g.fillStyle = css(0xe8dcc0, 1); g.fillRect(px + pw - 0.6, pt + 0.26, 0.42, 0.28);
        }
        g.fillStyle = css(GOLD, 1); g.fillRect(0, Y(3.4), W, 0.3); g.fillStyle = css(GOLD_D, 1); g.fillRect(0, Y(3.15), W, 0.04);
        // 고창 구간 m 3.4..7.3
        for (b = 0; b < 2; b++) {
          bx = b * BAY;
          g.fillStyle = css(0xe2d4b4, 1); g.fillRect(bx, Y(7.3), BAY, 3.9);
          if (b === 1) { // 프레스코 칸
            var fx = bx + 0.3, fw = BAY - 0.6, ft = Y(7.0), fh = 3.2;
            g.fillStyle = css(0x9b4430, 1); g.fillRect(fx - 0.12, ft - 0.12, fw + 0.24, fh + 0.24);
            g.fillStyle = css(FRESCO, 1); g.fillRect(fx, ft, fw, fh);
            g.fillStyle = css(0xe9d6ac, 1); g.beginPath(); g.moveTo(fx + 0.3, ft + fh); g.lineTo(fx + 0.3, ft + 1.1); g.arc(fx + fw / 2, ft + 1.1, fw / 2 - 0.3, PI, 0); g.lineTo(fx + fw - 0.3, ft + fh); g.closePath(); g.fill();
            g.fillStyle = css(0xc7a56e, 1); g.fillRect(fx, ft, 0.22, fh); g.fillRect(fx + fw - 0.22, ft, 0.22, fh);
            saint(g, fx + fw / 2, ft + fh - 0.1, 2.0, 0xb5533c, 0xf4efe2);
            saint(g, fx + 0.65, ft + fh - 0.1, 1.5, 0x2a4a8a, 0xe9e0cc);
            saint(g, fx + fw - 0.65, ft + fh - 0.1, 1.5, 0x4d7a5a, 0xd8b23a);
          }
          g.fillStyle = css(GOLD, 1); g.fillRect(bx - 0.07, Y(7.3), 0.14, 3.9);
        }
        g.fillStyle = css(GOLD, 1); g.fillRect(0, Y(7.6), W, 0.4);
      });
      var clereMat = emissiveMat(clereTex, 0.14, { sheen: 0.3 });
      var uvClereR = function (p) { return [(p[2] - Z_A) / TW, (p[1] - Y_ENT) / 7.6]; };       // 오른쪽 벽(+x 쪽): z가 오른쪽
      var uvClereL = function (p) { return [0.5 - (p[2] - Z_A) / TW, (p[1] - Y_ENT) / 7.6]; };  // 왼쪽 벽: -z가 오른쪽
      var FR = frameOf(XN, Z_A, -1, 0), FL = frameOf(-XN, Z_E, 1, 0);
      var SINK_R = new TexSink(), SINK_L = new TexSink();
      var WSILL = 10.0, WGW = 1.0, WGH = 2.1;
      function holesFor(F) {
        var hs = [];
        for (var k = 0; k < NB; k += 2) hs.push(winHole((bayC(k) - F.pz) / F.uz, WSILL, WGW, WGH));
        return hs;
      }
      openWall({ F: FR, u0: 0, u1: Z_E - Z_A, y0: Y_ENT, y1: Y_TOP, t: 0.8, holes: holesFor(FR), tex: SINK_R, uv: uvClereR });
      openWall({ F: FL, u0: 0, u1: Z_E - Z_A, y0: Y_ENT, y1: Y_TOP, t: 0.8, holes: holesFor(FL), tex: SINK_L, uv: uvClereL });
      SINK_R.mesh(clereMat); SINK_L.mesh(clereMat);
      [[FR, 1], [FL, 2]].forEach(function (pr) {
        var F = pr[0];
        for (var k = 0; k < NB; k += 2) {
          var u = (bayC(k) - F.pz) / F.uz;
          mkWindow(F, u, WSILL, WGW, WGH, 'round', 3 + k + pr[1] * 17, (k === 6 || k === 14), 0.35, 8);
          // 창 둘레 아치 몰딩(금빛)
          var h = winHole(u, WSILL, WGW, WGH), c = P3(F, u, 0, 0.05), sp = h.yb + h.h;
          ctx.arch({ x: c[0], y: sp, z: c[2], span: h.w + 0.05, rise: h.w / 2, axis: 'z', t: 0.16, depth: 0.12, color: GOLD, seg: 8 });
          [-1, 1].forEach(function (sg) { var q = P3(F, u + sg * (h.w / 2 + 0.08), 0, 0.05); ctx.box({ x: q[0], y: h.yb, z: q[2], w: 0.12, h: h.h, d: 0.16, color: GOLD }); });
        }
        // 모자이크 패널 금박 틀(입체)
        for (var k2 = 0; k2 < NB; k2++) {
          var uu = (bayC(k2) - F.pz) / F.uz, hw = BAY / 2 - 0.2;
          [[-1, 0], [1, 0]].forEach(function (sg) { var q = P3(F, uu + sg[0] * (hw), 0, 0.05); ctx.box({ x: q[0], y: 7.29, z: q[2], w: 0.14, h: 2.38, d: 0.14, color: GOLD }); });
          var q1 = P3(F, uu, 0, 0.05); ctx.box({ x: q1[0], y: 7.29, z: q1[2], w: 0.14, h: 0.12, d: hw * 2 + 0.14, color: GOLD });
          ctx.box({ x: q1[0], y: 9.55, z: q1[2], w: 0.14, h: 0.12, d: hw * 2 + 0.14, color: GOLD });
        }
        var q2 = P3(F, 28.8, 0, 0.1);
        ctx.box({ x: q2[0], y: 9.78, z: (Z_A + Z_E) / 2, w: 0.32, h: 0.28, d: Z_E - Z_A, color: GOLD });          // 모자이크 띠 위 코니스
        ctx.box({ x: q2[0] + F.nx * 0.1, y: 13.85, z: (Z_A + Z_E) / 2, w: 0.5, h: 0.5, d: Z_E - Z_A, color: GOLD_D });  // 천장 아래 큰 코니스
        ctx.box({ x: q2[0] + F.nx * 0.2, y: 13.98, z: (Z_A + Z_E) / 2, w: 0.3, h: 0.14, d: Z_E - Z_A, color: GOLD });
      });

      mark('nave walls');
      // =====================================================================
      // 금빛 격자 천장(입체 코퍼: 금 리브 + 오목한 붉은 칸 + 장미꽃)
      // =====================================================================
      var CELLX = 2 * XN / 6, CELLZ = (Z_E - Z_A) / 27;
      var cofTex = mtex(256, 256, 1, 1, function (g) {
        g.fillStyle = css(GOLD, 1); g.fillRect(0, 0, 1, 1);
        g.fillStyle = css(GOLD_D, 1); g.fillRect(0.1, 0.1, 0.8, 0.8);
        g.fillStyle = css(0x3e2412, 1); g.fillRect(0.14, 0.14, 0.72, 0.72);
        g.fillStyle = css(0x56331a, 1); g.fillRect(0.18, 0.18, 0.64, 0.64);
        g.fillStyle = css(GOLD_L, 1);
        for (var p = 0; p < 8; p++) { var a = p * PI / 4; g.beginPath(); g.ellipse(0.5 + Math.cos(a) * 0.2, 0.5 + Math.sin(a) * 0.2, 0.1, 0.045, a, 0, 6.3); g.fill(); }
        g.beginPath(); g.arc(0.5, 0.5, 0.11, 0, 6.3); g.fill(); g.fillStyle = css(0x3e2412, 1); g.beginPath(); g.arc(0.5, 0.5, 0.05, 0, 6.3); g.fill();
        g.fillStyle = css(GOLD_L, 1); [[0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]].forEach(function (c) { g.beginPath(); g.arc(c[0], c[1], 0.035, 0, 6.3); g.fill(); });
      });
      cofTex.wrapS = cofTex.wrapT = T.RepeatWrapping; cofTex.repeat.set(6, 27);
      var cofMat = emissiveMat(cofTex, 0.16, { side: T.FrontSide, sheen: 0.3 });
      var cofPlane = new T.Mesh(new T.PlaneGeometry(2 * XN, Z_E - Z_A), cofMat);
      cofPlane.rotation.x = PI / 2; cofPlane.position.set(0, Y_TOP, (Z_A + Z_E) / 2); ctx.add(cofPlane); ctx.stats.meshes++; cofPlane.castShadow = true; cofPlane.receiveShadow = true;
      // 리브(아래로 튀어나온 금 보)
      for (var ci = 0; ci <= 6; ci++) ctx.box({ x: -XN + ci * CELLX, y: Y_TOP - 0.3, z: (Z_A + Z_E) / 2, w: 0.22, h: 0.3, d: Z_E - Z_A, color: GOLD });
      for (var cj = 0; cj <= 27; cj++) ctx.box({ x: 0, y: Y_TOP - 0.3, z: Z_A + cj * CELLZ, w: 2 * XN, h: 0.3, d: 0.22, color: GOLD });
      // 칸마다 금 테두리(2단) + 장미꽃
      for (cj = 0; cj < 27; cj++) for (ci = 0; ci < 6; ci++) {
        var ccx = -XN + (ci + 0.5) * CELLX, ccz = Z_A + (cj + 0.5) * CELLZ;
        cylO(ccx, Y_TOP - 0.16, ccz, 0.3, 0.12, 0.16, 8, GOLD_L, true, 0.02, MET);
      }
      // 양쪽 아래 처마 금띠
      ctx.ceilingFlat({ x0: -XA, x1: XA, z0: -28.8, z1: Z_A, y: Y_TOP, tex: ctx.tex.coffer({ base: 0x3e2412, gold: GOLD, border: GOLD_D, n: 3 }), tile: 6.4 });

      mark('ceiling');
      // =====================================================================
      // 측랑: 궁륭 + 외벽(창 개구부, 경당 아치) + 벽기둥 + 곁 제대
      // =====================================================================
      [-1, 1].forEach(function (s) {
        groin(s < 0 ? -XA : XC, s < 0 ? -XC : XA, Z_A, Z_E, Y_AV, 1.0, NB, 0xdfd2b2);
      });
      var W_AISLE = [4, 6, 8, 10, 12, 14, 16, 18], ALT = [4, 8, 12, 16];
      var CH_Z0 = -19.5, CH_Z1 = -13.5, CH_ZC = -16.5;
      var aisleFr = { R: frameOf(XA, Z_A, -1, 0), L: frameOf(-XA, Z_E, 1, 0) };
      ['R', 'L'].forEach(function (sd) {
        var F = aisleFr[sd], sg = sd === 'R' ? 1 : -1, holes = [];
        W_AISLE.forEach(function (k) { holes.push(winHole((bayC(k) - F.pz) / F.uz, 4.2, 0.9, 0.8)); });
        holes.push({ u: (CH_ZC - F.pz) / F.uz, w: CH_Z1 - CH_Z0, yb: 0, h: 3.0, top: 'round', rise: 3.0 });
        openWall({ F: F, u0: 0, u1: Z_E - Z_A, y0: 0, y1: Y_AV, t: 0.6, holes: holes, color: 0xdccdaa, vary: 0.015 });
        W_AISLE.forEach(function (k, i) {
          var u = (bayC(k) - F.pz) / F.uz;
          mkWindow(F, u, 4.2, 0.9, 0.8, 'round', 70 + k + (sd === 'R' ? 0 : 40), false, 0.28);
          var h = winHole(u, 4.2, 0.9, 0.8), c = P3(F, u, 0, 0.05);
          ctx.arch({ x: c[0], y: h.yb + h.h, z: c[2], span: h.w + 0.05, rise: h.w / 2, axis: 'z', t: 0.14, depth: 0.12, color: MARBLE });
        });
        // 경당 입구 아치 테두리
        var cc = P3(F, 0, 0, 0.06);
        ctx.arch({ x: sg * (XA - 0.06), y: 3.0, z: CH_ZC, span: CH_Z1 - CH_Z0, rise: 3.0, axis: 'z', t: 0.42, depth: 0.5, color: MARBLE });
        [-1, 1].forEach(function (e) { ctx.box({ x: sg * (XA - 0.1), y: 0, z: CH_ZC + e * (CH_Z1 - CH_Z0 + 0.5) / 2, w: 0.3, h: 3.0, d: 0.5, color: MARBLE }); });
        ctx.addCollider({ x0: XA - 0.02, x1: XA + 0.9, z0: sd === 'R' ? CH_Z0 : CH_Z0, z1: CH_Z1 });
        // 걸레받이/징두리
        B(sg > 0 ? XA - 0.1 : -XA, sg > 0 ? XA : -XA + 0.1, 0, 1.2, Z_A, Z_E, 0xd9cdb2);
        B(sg > 0 ? XA - 0.16 : -XA, sg > 0 ? XA : -XA + 0.16, 1.2, 1.3, Z_A, Z_E, MARBLE);
        // 벽기둥(베이 경계)
        for (var k = 0; k <= NB; k++) {
          var z = Z_A + BAY * k;
          if (z > CH_Z0 - 0.4 && z < CH_Z1 + 0.4) continue;
          var px = sg * (XA - 0.11);
          ctx.box({ x: px, y: 0, z: z, w: 0.22, h: 0.3, d: 0.62, color: MARBLE });
          ctx.box({ x: px, y: 0.3, z: z, w: 0.2, h: 5.2, d: 0.46, color: MARBLE });
          ctx.box({ x: px, y: 5.5, z: z, w: 0.26, h: 0.12, d: 0.62, color: MARBLE_D });
          ctx.box({ x: px, y: 5.62, z: z, w: 0.3, h: 0.16, d: 0.72, color: MARBLE });
        }
      });
      // 측랑 벽 프레스코 칸(제대 없는 베이)
      [-1, 1].forEach(function (sg) {
        for (var k = 1; k < NB; k++) {
          var zc = bayC(k);
          if (ALT.indexOf(k) >= 0 || (zc > CH_Z0 - 1.6 && zc < CH_Z1 + 1.6) || (sg < 0 && zc > -9.7 && zc < -1.2)) continue;
          var px = sg * (XA - 0.04), col = [0xe2c997, 0xd8bf94, 0xe6d3a8][k % 3];
          ctx.box({ x: px, y: 1.55, z: zc, w: 0.05, h: 2.3, d: 1.5, color: GOLD_D });
          ctx.box(mb({ x: px - sg * 0.02, y: 1.62, z: zc, w: 0.05, h: 2.16, d: 1.36, color: MARBLE }));
          ctx.box({ x: px - sg * 0.04, y: 1.8, z: zc, w: 0.05, h: 0.5, d: 1.0, color: SERP, gloss: true });
          ctx.box({ x: px - sg * 0.04, y: 3.1, z: zc, w: 0.05, h: 0.5, d: 1.0, color: SERP, gloss: true });
          GLB.add(Geo.cyl(14, 1), PORPH, { x: px - sg * 0.04 + 0.02, y: 2.7, z: zc, rz: PI / 2, sx: 0.36, sy: 0.04, sz: 0.36, flat: true, vary: 0.02 });
        }
      });
      // 곁 제대(아이디큘라 + 그림)
      var _pt = {};
      function paintTex(kind) {  // 제대 그림(단순화한 성화 4종)
        if (_pt[kind]) return _pt[kind];
        return (_pt[kind] = mtex(192, 224, 1.5, 1.7, function (g) {
          var sky = [[0x2c4a6e, 0xd9a15a], [0x1c1a2e, 0x7a3a2a], [0x3a5a4a, 0xe6c88a], [0x2a2a4a, 0xc98a5a]][kind];
          var gr = g.createLinearGradient(0, 0, 0, 1.7); gr.addColorStop(0, css(sky[0], 1)); gr.addColorStop(0.75, css(sky[1], 1)); g.fillStyle = gr; g.fillRect(0, 0, 1.5, 1.7);
          g.fillStyle = css(0x3a3020, 1); g.fillRect(0, 1.35, 1.5, 0.35);
          if (kind === 1) { // 십자가
            g.fillStyle = css(0x2a1a10, 1); g.fillRect(0.7, 0.2, 0.1, 1.2); g.fillRect(0.45, 0.45, 0.6, 0.09);
            g.fillStyle = '#e8cfae'; g.beginPath(); g.arc(0.75, 0.38, 0.07, 0, 6.3); g.fill(); g.fillRect(0.69, 0.44, 0.12, 0.5);
            saint(g, 0.3, 1.45, 0.9, 0x2a4a8a, 0xf4efe2); saint(g, 1.2, 1.45, 0.9, 0xa8432f, 0xf4efe2);
          } else if (kind === 3) { // 수태고지
            saint(g, 0.4, 1.5, 1.2, 0xf4efe2, 0xd8b23a); saint(g, 1.1, 1.5, 1.1, 0x2a4a8a, 0xa8432f);
            g.fillStyle = css(0xfff0b0, 1); g.beginPath(); g.arc(0.75, 0.3, 0.14, 0, 6.3); g.fill();
          } else { // 성모 / 성인
            saint(g, 0.75, 1.5, 1.45, kind === 0 ? 0x2a4a8a : 0xa8432f, kind === 0 ? 0xa8432f : 0xe9e0cc);
            g.fillStyle = '#e8cfae'; g.beginPath(); g.arc(0.9, 0.95, 0.07, 0, 6.3); g.fill();
          }
          g.strokeStyle = css(GOLD_D, 1); g.lineWidth = 0.05; g.strokeRect(0.025, 0.025, 1.45, 1.65);
        }));
      }
      function sideAltar(sg, z, idx) {
        var xw = sg * XA, xin = sg * (XA - 0.5);
        ctx.box({ x: sg * (XA - 0.45), y: 0, z: z, w: 0.8, h: 1.0, d: 2.5, color: MARBLE });
        ctx.box({ x: sg * (XA - 0.45), y: 1.0, z: z, w: 0.9, h: 0.08, d: 2.6, color: MARBLE_D });
        ctx.box({ x: sg * (XA - 0.8), y: 1.08, z: z, w: 0.04, h: 0.02, d: 2.2, color: 0xfffaf0 });
        ctx.box({ x: sg * (XA - 0.84), y: 0.1, z: z, w: 0.04, h: 0.85, d: 2.2, color: 0xfaf4e6 });
        ctx.box({ x: sg * (XA - 0.85), y: 0.8, z: z, w: 0.05, h: 0.12, d: 2.2, color: GOLD });
        [-0.8, 0.8].forEach(function (dz) { ctx.cyl({ x: sg * (XA - 0.62), y: 1.08, z: z + dz, r: 0.05, h: 0.4, seg: 6, color: GOLD }); ctx.addFlame({ x: sg * (XA - 0.62), y: 1.56, z: z + dz, scale: 0.9 }); });
        // 아이디큘라
        [-1.15, 1.15].forEach(function (dz) { ctx.cyl({ x: sg * (XA - 0.22), y: 1.08, z: z + dz, r: 0.14, rTop: 0.12, h: 1.9, seg: 10, color: PORPH, flat: false }); ctx.box({ x: sg * (XA - 0.22), y: 2.98, z: z + dz, w: 0.34, h: 0.16, d: 0.34, color: GOLD }); });
        ctx.box({ x: sg * (XA - 0.2), y: 3.14, z: z, w: 0.36, h: 0.2, d: 2.9, color: MARBLE });
        solid.addTris([sg * (XA - 0.2), 3.34, z - 1.4, sg * (XA - 0.2), 3.34, z + 1.4, sg * (XA - 0.2), 3.92, z], MARBLE, [sg * 3, 4, z], { vary: 0.01 });
        ctx.box({ x: sg * (XA - 0.1), y: 1.15, z: z, w: 0.06, h: 1.9, d: 1.75, color: GOLD_D });
        ctx.box({ x: sg * (XA - 0.14), y: 1.2, z: z, w: 0.04, h: 1.8, d: 1.65, color: GOLD, vary: 0 });
        ctx.plane({ x: sg * (XA - 0.17), y: 2.1, z: z, ry: sg > 0 ? -PI / 2 : PI / 2, w: 1.5, h: 1.7, tex: paintTex(idx % 4), tile: [1.5, 1.7], gloss: 0.3 });
        ctx.addCollider({ x0: sg > 0 ? XA - 1.0 : -XA, x1: sg > 0 ? XA : -XA + 1.0, z0: z - 1.4, z1: z + 1.4 });
      }
      ALT.forEach(function (k, i) { sideAltar(1, bayC(k), i); sideAltar(-1, bayC(k) + (k === 4 ? 0.2 : 0), i + 2); });
      // 오른쪽 측랑 끝: 세례당 문(닫힘)
      ctx.box({ x: XA - 0.14, y: 0, z: bayC(19), w: 0.14, h: 3.6, d: 2.0, color: WOOD_D });
      ctx.box({ x: XA - 0.2, y: 0.4, z: bayC(19), w: 0.1, h: 1.2, d: 1.6, color: 0x6b4a30 }); ctx.box({ x: XA - 0.2, y: 1.9, z: bayC(19), w: 0.1, h: 1.4, d: 1.6, color: 0x6b4a30 });
      ctx.box({ x: XA - 0.12, y: 3.6, z: bayC(19), w: 0.2, h: 0.2, d: 2.4, color: MARBLE });

      // 측랑 끝벽(개선문 쪽) + 익랑 측벽
      [-1, 1].forEach(function (s) {
        B(s < 0 ? -XA : XN, s < 0 ? -XN : XA, 0, Y_TOP, Z_A - 0.5, Z_A, 0xd8c8a2);
        B(s < 0 ? -XA : XA - 0.5, s < 0 ? -XA + 0.5 : XA, 0, Y_TOP, -28.8, Z_A, 0xd8c8a2);
        // 측랑 끝 그림(제대 위)
        ctx.box({ x: s * 9.3, y: 1.6, z: Z_A + 0.12, w: 2.6, h: 3.4, d: 0.1, color: GOLD });
        ctx.box({ x: s * 9.3, y: 1.8, z: Z_A + 0.19, w: 2.2, h: 3.0, d: 0.06, color: s < 0 ? LAPIS : 0x8a3a2a });
        ctx.box({ x: s * 9.3, y: 0, z: Z_A + 0.6, w: 3.0, h: 1.0, d: 1.0, color: MARBLE });
        ctx.addCollider({ x0: s * 9.3 - 1.6, x1: s * 9.3 + 1.6, z0: Z_A, z1: Z_A + 1.2 });
      });

      mark('aisles');
      // =====================================================================
      // 경당(시스티나 오른쪽 / 파올리나 왼쪽): 얕은 방 + 돛형 돔 + 제대
      // =====================================================================
      function chapel(sg, name) {
        var xi = sg * XA, xo = sg * (XA + 6.2), xm = (xi + xo) / 2, x0 = Math.min(xi, xo), x1 = Math.max(xi, xo);
        ctx.floor({ x0: x0, x1: x1, z0: CH_Z0, z1: CH_Z1, y: 0.02, tex: ctx.tex.pattern('cosmati', { c1: 0xf2eee4, c2: PORPH, c3: SERP }), tile: 3 });
        // 사방 벽(다색 대리석 판)
        B(x0, x1, 0, 6.2, CH_Z0 - 0.5, CH_Z0, 0xd9c7a3); B(x0, x1, 0, 6.2, CH_Z1, CH_Z1 + 0.5, 0xd9c7a3);
        B(sg > 0 ? xo : xo - 0.5, sg > 0 ? xo + 0.5 : xo, 0, 6.2, CH_Z0, CH_Z1, 0xdcc9a2);
        [[CH_Z0, 1], [CH_Z1, -1]].forEach(function (zz) {
          [[0.4, 2.2, PORPH], [2.6, 4.4, SERP], [4.7, 5.9, 0xb5533c]].forEach(function (pn, i) {
            [-1, 1].forEach(function () { });
            ctx.box({ x: xm, y: pn[0], z: zz[0] + zz[1] * 0.04, w: 4.6, h: pn[1] - pn[0], d: 0.05, color: pn[2] });
            ctx.box({ x: xm, y: pn[0] - 0.06, z: zz[0] + zz[1] * 0.05, w: 4.8, h: 0.08, d: 0.06, color: GOLD });
          });
        });
        // 제단 정면
        var bx = sg > 0 ? xo - 0.04 : xo + 0.04;
        if (name === 'paolina') {
          ctx.box({ x: sg * (XA + 5.7), y: 0.9, z: CH_ZC, w: 0.3, h: 4.6, d: 3.4, color: GOLD });
          ctx.box({ x: sg * (XA + 5.55), y: 1.1, z: CH_ZC, w: 0.2, h: 4.2, d: 3.0, color: LAPIS });
          var icon = mtex(256, 384, 1, 1.5, function (g) {
            goldFill(g, 0, 0, 1, 1.5, 0.03, GOLD_L, GOLD_D);
            g.fillStyle = css(LAPIS, 1); g.beginPath(); g.moveTo(0.5, 0.28); g.bezierCurveTo(0.85, 0.5, 0.88, 1.1, 0.8, 1.5); g.lineTo(0.2, 1.5); g.bezierCurveTo(0.12, 1.1, 0.15, 0.5, 0.5, 0.28); g.fill();
            g.fillStyle = '#e6c49a'; g.beginPath(); g.arc(0.5, 0.5, 0.11, 0, 6.3); g.fill(); g.beginPath(); g.arc(0.62, 0.95, 0.06, 0, 6.3); g.fill();
            g.strokeStyle = css(GOLD_L, 1); g.lineWidth = 0.025; g.beginPath(); g.arc(0.5, 0.5, 0.16, 0, 6.3); g.stroke();
          });
          var ip = ctx.plane({ x: sg * (XA + 5.43), y: 3.0, z: CH_ZC, ry: sg > 0 ? -PI / 2 : PI / 2, w: 1.5, h: 2.2, tex: icon, tile: [1.5, 2.2] });
          ctx.cyl({ x: sg * (XA + 4.6), y: 0, z: CH_ZC, r: 1.3, rTop: 1.2, h: 1.0, seg: 10, color: MARBLE });
        } else {
          ctx.box({ x: sg * (XA + 5.5), y: 0.9, z: CH_ZC, w: 0.5, h: 3.6, d: 3.4, color: GOLD });
          ctx.box({ x: sg * (XA + 5.2), y: 0.9, z: CH_ZC, w: 0.4, h: 0.7, d: 2.4, color: GOLD_L });
          ctx.box({ x: sg * (XA + 5.2), y: 2.2, z: CH_ZC, w: 0.6, h: 1.4, d: 1.0, color: 0xf0e2b0 });
          [-1, 1].forEach(function (e) { ctx.cone({ x: sg * (XA + 5.1), y: 1.6, z: CH_ZC + e * 1.2, r: 0.35, h: 1.4, seg: 6, color: 0xfff4d6 }); ctx.sphere({ x: sg * (XA + 5.1), y: 3.0, z: CH_ZC + e * 1.2, r: 0.17, color: 0xf0cfa8, w: 8, h: 6 }); });
          ctx.cyl({ x: sg * (XA + 4.5), y: 0, z: CH_ZC, r: 1.3, rTop: 1.2, h: 1.0, seg: 10, color: MARBLE });
        }
        ctx.vault({ type: 'sail', x0: x0, x1: x1, z0: CH_Z0, z1: CH_Z1, y: 5.0, rise: 2.0, bays: [1, 1], color: GOLD_L });
        B(x0, x1, 4.9, 5.1, CH_Z0, CH_Z1, GOLD_D, { vary: 0 });
        ctx.addGlow({ x: xm, y: 4.0, z: CH_ZC, size: 5, color: 0xffd98a, kind: 'always' });
        ctx.addCollider({ x0: x0, x1: x1, z0: CH_Z0 - 0.6, z1: CH_Z1 + 0.6 });
      }
      chapel(1, 'sistina'); chapel(-1, 'paolina');

      mark('chapels');
      // =====================================================================
      // 입구 벽(문 개구부 + 고창) / 열린 문 / 성수대 / 바깥
      // =====================================================================
      var FE = frameOf(0, Z_E, 0, -1);   // u = (nz,-nx) = (-1,0): x 반대
      var entHoles = [{ u: 0, w: 3.0, yb: 0, h: 4.0, top: 'flat' }];
      [-4.2, 0, 4.2].forEach(function (x, i) { entHoles.push(winHole(-x, 9.6, i === 1 ? 1.4 : 1.0, 2.2)); });
      [-9.2, 9.2].forEach(function (x) { entHoles.push(winHole(-x, 4.2, 0.9, 0.8)); });
      openWall({ F: FE, u0: -XA, u1: XA, y0: 0, y1: Y_TOP, t: 0.6, holes: entHoles, color: 0xdccfae });
      [-4.2, 0, 4.2].forEach(function (x, i) { var gw = i === 1 ? 1.4 : 1.0; mkWindow(FE, -x, 9.6, gw, 2.2, 'round', 200 + i, true, 0.28, 12); var h = winHole(-x, 9.6, gw, 2.2); ctx.arch({ x: x, y: h.yb + h.h, z: Z_E - 0.05, span: h.w + 0.05, rise: h.w / 2, axis: 'x', t: 0.16, depth: 0.12, color: GOLD }); });
      [-9.2, 9.2].forEach(function (x, i) { mkWindow(FE, -x, 4.2, 0.9, 0.8, 'round', 210 + i, false, 0.28); });
      // 모자이크 패널 띠(입구 벽, 입체 금틀 + 색 면)
      [[-9, 9, 6.9, 2.6]].forEach(function () {
        for (var q = 0; q < 5; q++) {
          var cx = -4.8 + q * 2.4 + (q > 2 ? 0 : 0); if (Math.abs(cx) < 0.01 && false) continue;
          ctx.box({ x: cx, y: 7.2, z: Z_E - 0.04, w: 2.1, h: 1.9, d: 0.08, color: GOLD });
          ctx.box({ x: cx, y: 7.3, z: Z_E - 0.09, w: 1.9, h: 1.7, d: 0.05, color: [LAPIS, 0x3a5a98, 0x2a4a8a, 0x3a5a98, LAPIS][q] });
          [-0.5, 0, 0.5].forEach(function (d) { ctx.box({ x: cx + d, y: 7.35, z: Z_E - 0.12, w: 0.18, h: 0.9, d: 0.04, color: PALS[(q + Math.floor((d + 0.5) * 2)) % PALS.length] }); ctx.sphere({ x: cx + d, y: 8.32, z: Z_E - 0.13, r: 0.1, color: 0xf0cfa8, w: 6, h: 4 }); });
        }
      });
      ctx.box({ x: 0, y: Y_ENT, z: Z_E - 0.1, w: 2 * XA, h: 0.3, d: 0.2, color: MARBLE });
      ctx.box({ x: 0, y: 13.75, z: Z_E - 0.15, w: 2 * XA, h: 0.65, d: 0.3, color: GOLD_D });
      B(-XA, XA, 0, 1.3, Z_E - 0.1, Z_E, 0xd9cdb2);
      ctx.addCollider({ x0: -XA, x1: XA, z0: Z_E - 0.2, z1: Z_E + 2 });
      // 문틀 + 열린 문짝
      ctx.box({ x: -1.62, y: 0, z: Z_E - 0.25, w: 0.28, h: 4.2, d: 0.7, color: MARBLE });
      ctx.box({ x: 1.62, y: 0, z: Z_E - 0.25, w: 0.28, h: 4.2, d: 0.7, color: MARBLE });
      ctx.box({ x: 0, y: 4.0, z: Z_E - 0.25, w: 3.5, h: 0.3, d: 0.7, color: MARBLE });
      [[-1.5, 1.2, -1], [1.5, -1.2, 1]].forEach(function (d) {
        var hx = d[0], ry = d[1], sg = d[2];
        var dirx = -sg * Math.cos(Math.abs(ry)), dirz = Math.sin(Math.abs(ry));
        var cx = hx + dirx * 0.7, cz = Z_E + 0.1 + dirz * 0.7;
        ctx.box({ x: cx, y: 0, z: cz, w: 1.4, h: 3.9, d: 0.1, ry: -sg * 1.2 * -1, color: 0x6b4a30 });
        ctx.box({ x: cx, y: 0.4, z: cz, w: 1.0, h: 1.4, d: 0.14, ry: sg * 1.2, color: 0x835c3c });
        ctx.box({ x: cx, y: 2.1, z: cz, w: 1.0, h: 1.4, d: 0.14, ry: sg * 1.2, color: 0x835c3c });
      });
      // 왼쪽 끝 성문(닫힘)
      ctx.box({ x: -9.2, y: 0, z: Z_E - 0.12, w: 1.9, h: 3.0, d: 0.12, color: 0x9a7a3a });
      ctx.box({ x: -9.2, y: 0.3, z: Z_E - 0.2, w: 1.5, h: 2.4, d: 0.08, color: GOLD_D });
      ctx.holyFont({ x: -3.2, z: 32.6 }); ctx.holyFont({ x: 3.2, z: 32.6 });

      // 바깥 풍경(문으로 보임)
      ctx.setSky({ outside: true });
      [[-400, 400, Z_E - 0.1, 400], [-400, -XA - 0.6, -40, Z_E + 0.5], [XA + 0.6, 400, -40, Z_E + 0.5]].forEach(function (g) {
        ctx.plane({ x: (g[0] + g[1]) / 2, y: -0.05, z: (g[2] + g[3]) / 2, rx: -PI / 2, w: g[1] - g[0], h: g[3] - g[2], color: 0xd9ceb4 });
      });
      ctx.path({ x0: -2.4, x1: 2.4, z0: Z_E + 0.4, z1: 90, color: 0xcfc2a6 });
      ctx.scatterTrees({ x0: -80, x1: 80, z0: Z_E + 14, z1: 120, count: 8, seed: 5, minH: 5, maxH: 9, exclude: [{ x0: -8, x1: 8, z0: 0, z1: 130 }], palette: [0x7fb07a, 0x8fc088, 0x6aa070, 0xa5cf8a] });
      ctx.hills({ color: 0xa9c8a0, count: 14, radius: 220 });

      mark('entrance+outside');
      // =====================================================================
      // 개선 아치 벽(5세기 모자이크) + 아치 입체 테두리
      // =====================================================================
      var FT = frameOf(0, Z_A, 0, 1);    // u=(1,0)
      var ARC_A = 4.6, ARC_Y = 6.4;
      var triTex = mtex(1024, 1024, 12.8, 14.4, function (g) {
        function X(x) { return x + 6.4; } function Y(y) { return 14.4 - y; }
        goldFill(g, 0, 0, 12.8, 14.4, 0.1, TG, TGG);
        // 아래 대리석 기둥판
        [-1, 1].forEach(function (s) {
          var x0 = s < 0 ? -6.4 : 5.0, w = 1.4;
          g.fillStyle = css(0xe9e2d2, 1); g.fillRect(X(x0), Y(4.6), w, 4.6);
          g.fillStyle = css(GOLD, 1); g.fillRect(X(x0 + 0.1), Y(4.5), w - 0.2, 4.4);
          g.fillStyle = css(PORPH, 1); g.fillRect(X(x0 + 0.2), Y(4.3), w - 0.4, 1.9);
          g.fillStyle = css(SERP, 1); g.fillRect(X(x0 + 0.2), Y(2.2), w - 0.4, 1.8);
          // 성인 열(3줄)
          [[5.0, 7.0], [7.2, 9.2], [9.4, 11.4], [11.5, 13.0]].forEach(function (rw, ri) {
            for (var f = 0; f < 2; f++) saint(g, X(s * (5.45 + f * 0.62)), Y(rw[0]), rw[1] - rw[0] - 0.05, PALS[(ri + f * 2 + (s > 0 ? 1 : 0)) % PALS.length], PALS[(ri * 3 + f) % PALS.length]);
          });
        });
        // 아치 띠
        [[4.95, 5.25, 0x274c8f], [5.25, 5.32, 0xf4efe2], [5.32, 5.6, 0xa8432f], [5.6, 5.68, 0xf4efe2], [5.68, 5.9, 0x2f6b4e]].forEach(function (b) {
          var r = (b[0] + b[1]) / 2; g.strokeStyle = css(b[2], 1); g.lineWidth = b[1] - b[0];
          g.beginPath(); g.moveTo(X(-r), Y(5.0)); g.lineTo(X(-r), Y(ARC_Y)); g.arc(X(0), Y(ARC_Y), r, PI, 2 * PI); g.lineTo(X(r), Y(5.0)); g.stroke();
        });
        // 프리즈(위): 청색 바탕, 예루살렘·베들레헴, 어린양
        blueFill(g, 0, 0, 12.8, 1.2, 0.08, 0x1c3a78, 0x2a4a8a);
        g.fillStyle = css(GOLD_L, 1); for (var s2 = 0; s2 < 60; s2++) g.fillRect(rnd() * 12.8, rnd() * 1.1, 0.05, 0.05);
        [[0.2, 1], [10.6, 1]].forEach(function (bd, bi) {
          var bx = bd[0];
          for (var t = 0; t < 4; t++) { g.fillStyle = css(t % 2 ? 0xf0e6cf : 0xd9c9a4, 1); g.fillRect(bx + t * 0.5, 0.45 - (t % 2) * 0.15, 0.46, 0.7 + (t % 2) * 0.15); g.fillStyle = css(0xb5533c, 1); g.fillRect(bx + t * 0.5 - 0.03, 0.4 - (t % 2) * 0.15, 0.52, 0.08); g.fillStyle = css(0x3a2d28, 1); g.fillRect(bx + t * 0.5 + 0.16, 0.75, 0.12, 0.2); }
        });
        [-1, 1].forEach(function (s) { for (var l = 0; l < 3; l++) lamb(g, X(s * (1.5 + l * 1.15)) + 0, 1.18, 0.78 * (s < 0 ? -1 : 1) < 0 ? 0.78 : 0.78); });
        g.fillStyle = css(GOLD, 1); g.beginPath(); g.arc(X(0), 0.6, 0.5, 0, 6.3); g.fill(); g.fillStyle = css(0x3a5a98, 1); g.beginPath(); g.arc(X(0), 0.6, 0.4, 0, 6.3); g.fill(); lamb(g, X(0) - 0.18, 0.92, 0.7);
        // 성모 메달리온 + 천사
        g.fillStyle = css(GOLD, 1); g.beginPath(); g.arc(X(0), Y(12.1), 1.0, 0, 6.3); g.fill();
        g.fillStyle = css(0x274c8f, 1); g.beginPath(); g.arc(X(0), Y(12.1), 0.88, 0, 6.3); g.fill();
        g.fillStyle = css(0x1e3a6e, 1); g.beginPath(); g.moveTo(X(0), Y(12.45)); g.bezierCurveTo(X(0.7), Y(12.2), X(0.7), Y(11.5), X(0.5), Y(11.28)); g.lineTo(X(-0.5), Y(11.28)); g.bezierCurveTo(X(-0.7), Y(11.5), X(-0.7), Y(12.2), X(0), Y(12.45)); g.fill();
        g.fillStyle = '#f0cfa8'; g.beginPath(); g.arc(X(0), Y(12.45), 0.15, 0, 6.3); g.fill(); g.beginPath(); g.arc(X(0.2), Y(11.9), 0.1, 0, 6.3); g.fill();
        g.strokeStyle = css(GOLD_L, 1); g.lineWidth = 0.05; g.beginPath(); g.arc(X(0), Y(12.45), 0.23, 0, 6.3); g.stroke();
        [-1, 1].forEach(function (s) {
          var ax = X(s * 2.5), ay = Y(11.9);
          g.fillStyle = css(0x8a6a3a, 1); g.beginPath(); g.ellipse(ax + s * 0.5, ay - 0.2, 0.6, 0.28, s * -0.7, 0, 6.3); g.fill();
          g.fillStyle = css(0xe9eef8, 1); g.beginPath(); g.moveTo(ax - 0.28, ay + 0.8); g.lineTo(ax - 0.15, ay - 0.35); g.lineTo(ax + 0.15, ay - 0.35); g.lineTo(ax + 0.28, ay + 0.8); g.fill();
          g.fillStyle = '#f0cfa8'; g.beginPath(); g.arc(ax, ay - 0.5, 0.15, 0, 6.3); g.fill();
          g.fillStyle = css(0x2a4a8a, 1); g.fillRect(ax - s * 0.9, ay - 0.1, 0.5, 0.08);
        });
      });
      var triMat = emissiveMat(triTex, 0.22, { sheen: 0.45 });
      var TRI = new TexSink();
      openWall({ F: FT, u0: -6.4, u1: 6.4, y0: 0, y1: Y_TOP, t: 0.9, holes: [{ u: 0, w: 2 * ARC_A, yb: 0, h: ARC_Y, top: 'round', rise: ARC_A }], tex: TRI, uv: function (p) { return [(p[0] + 6.4) / 12.8, p[1] / 14.4]; }, rcolor: GOLD });
      // 위 텍스처 면은 신랑 폭(±6.4)만: 바깥은 단색 벽
      TRI.mesh(triMat);
      ctx.arch({ x: 0, y: ARC_Y, z: Z_A - 0.43, span: 2 * ARC_A, rise: ARC_A, axis: 'x', t: 0.36, depth: 0.9, color: GOLD, type: 'round' });
      // 개선문 앞 기둥 옆 화강 기둥판(금테)
      [-1, 1].forEach(function (s) { ctx.box({ x: s * 5.95, y: 0, z: Z_A + 0.1, w: 0.9, h: 0.5, d: 0.3, color: MARBLE }); });

      mark('triumph');
      // =====================================================================
      // 성소: 단, 난간, 콘페시오, 제대, 발다키노
      // =====================================================================
      var PT = 0xe6e0d0;
      BM(-XC, XC, -1.2, PY, Z_A, -18.6, PT, { vary: 0.01 });
      BM(-XC, -2.6, -1.2, PY, -18.6, -15.6, PT, { vary: 0.01 }); BM(2.6, XC, -1.2, PY, -18.6, -15.6, PT, { vary: 0.01 });
      BM(-2.6, 2.6, -1.2, PY, -16.4, -15.6, PT, { vary: 0.01 });
      BM(-2.6, 2.6, -1.3, -1.18, -18.6, -16.4, 0xb8b2a2, { vary: 0 });         // 콘페시오 바닥
      // 단 위 상판 장식(포르피리·사문석 원판과 띠)
      [[-4.3, -21.0], [4.3, -21.0], [-4.3, -17.2], [4.3, -17.2]].forEach(function (p) {
        ctx.cyl({ x: p[0], y: PY, z: p[1], r: 0.85, rTop: 0.85, h: 0.012, seg: 16, color: PORPH, flat: false, vary: 0 });
        ctx.cyl({ x: p[0], y: PY + 0.012, z: p[1], r: 0.55, rTop: 0.55, h: 0.012, seg: 16, color: 0xe6e0d0, flat: false, vary: 0 });
        ctx.cyl({ x: p[0], y: PY + 0.024, z: p[1], r: 0.32, rTop: 0.32, h: 0.012, seg: 16, color: SERP, flat: false, vary: 0 });
      });
      B(-XC, XC, PY, PY + 0.012, Z_A + 0.4, Z_A + 0.55, SERP, { vary: 0 });
      B(-XC, XC, PY, PY + 0.012, -15.9, -15.75, GOLD_D, { vary: 0 });
      ctx.addCollider({ x0: -XC, x1: XC, z0: Z_A - 0.2, z1: -15.6 });
      ctx.steps({ x0: -1.1, x1: 1.1, z0: -15.6, z1: -14.4, y0: 0, y1: PY, n: 3, dir: [0, -1], color: PT });
      // 평면 난간(정면): 중앙 계단 양옆 + 콘페시오 둘레
      function baluster(x, z, y) { cylO(x, y, z, 0.06, 0.04, 0.62, 6, 0xf6f1e4, false, 0.01, MBATCH); }
      function railRun(x0, z0, x1, z1, y) {
        var len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 0.3));
        for (var i = 0; i <= n; i++) baluster(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, y);
        var dx = x1 - x0, dz = z1 - z0, ang = Math.atan2(-dz, dx);
        ctx.box(mb({ x: (x0 + x1) / 2, y: y + 0.62, z: (z0 + z1) / 2, w: len + 0.1, h: 0.1, d: 0.2, ry: ang, color: MARBLE }));
        ctx.box(mb({ x: (x0 + x1) / 2, y: y, z: (z0 + z1) / 2, w: len + 0.1, h: 0.07, d: 0.16, ry: ang, color: MARBLE_D }));
      }
      railRun(-XC + 0.2, -15.7, -1.2, -15.7, PY); railRun(1.2, -15.7, XC - 0.2, -15.7, PY);
      [-1, 1].forEach(function (s) { ctx.box({ x: s * 1.2, y: PY, z: -15.7, w: 0.22, h: 0.95, d: 0.22, color: MARBLE }); ctx.box({ x: s * 1.2, y: PY + 0.95, z: -15.7, w: 0.3, h: 0.1, d: 0.3, color: GOLD }); });
      railRun(-2.5, -16.5, 2.5, -16.5, PY); railRun(-2.5, -18.5, 2.5, -18.5, PY); railRun(-2.5, -16.5, -2.5, -18.5, PY); railRun(2.5, -16.5, 2.5, -18.5, PY);
      // 콘페시오: 기도하는 비오 9세상(흰 대리석 단순 인물) + 성유물함의 빛
      ctx.cyl({ x: 0, y: -1.2, z: -17.5, r: 0.28, rTop: 0.2, h: 0.5, seg: 8, color: 0xf4f0e6 });
      ctx.sphere({ x: 0, y: -0.58, z: -17.5, r: 0.14, color: 0xf4f0e6, w: 8, h: 6 });
      ctx.box({ x: 0, y: -0.9, z: -17.9, w: 0.5, h: 0.4, d: 0.1, color: 0xf4f0e6 });
      ctx.box({ x: 1.6, y: -1.2, z: -17.5, w: 0.5, h: 0.45, d: 0.4, color: GOLD }); ctx.box({ x: 1.6, y: -0.8, z: -17.5, w: 0.3, h: 0.14, d: 0.24, color: 0xd9f0ff });
      ctx.addGlow({ x: 0, y: -0.3, z: -17.5, size: 2.0, color: 0xffd9a0, kind: 'always' });
      // 제대 + 촛대 + 발다키노
      ctx.altar({ x: 0, z: -21.2, y: PY, w: 2.2, d: 1.0, h: 1.0, style: 'block', candles: 0, flowers: false, collide: false });
      ctx.box({ x: 0, y: PY + 1.0, z: -21.2, w: 2.3, h: 0.04, d: 1.1, color: 0xfffaf0 });
      ctx.box({ x: 0, y: PY + 0.1, z: -20.68, w: 1.7, h: 0.75, d: 0.04, color: GOLD }); ctx.box({ x: 0, y: PY + 0.25, z: -20.66, w: 1.3, h: 0.45, d: 0.04, color: 0xfff4d6 });
      [-3.5, 3.5, -2.3, 2.3].forEach(function (x, i) {
        var zc = i < 2 ? -19.4 : -20.0, hh = i < 2 ? 2.0 : 1.5;
        ctx.cyl({ x: x, y: PY, z: zc, r: 0.2, rTop: 0.06, h: hh, seg: 8, color: GOLD, flat: false });
        ctx.cyl({ x: x, y: PY + hh, z: zc, r: 0.06, rTop: 0.06, h: 0.5, seg: 6, color: 0xfff6e0 });
        ctx.addFlame({ x: x, y: PY + hh + 0.7, z: zc, scale: 1.4 });
        ctx.addCollider({ x: x, z: zc, r: 0.3 });
      });
      ctx.addGlow({ x: 0, y: PY + 1.6, z: -20.6, size: 3.2, color: 0xffd9a0, kind: 'always' });
      // 발다키노(네 개의 꼬인 포르피리 기둥 + 금빛 지붕)
      (function () {
        var bx = 0, bz = -21.2, hw = 1.55, bh = 3.8, y0 = PY + 0.35;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
          var x = bx + c[0] * hw, z = bz + c[1] * hw;
          ctx.box({ x: x, y: PY, z: z, w: 0.9, h: 0.35, d: 0.9, color: PORPH, gloss: true }); ctx.box({ x: x, y: PY + 0.35, z: z, w: 0.7, h: 0.1, d: 0.7, color: GOLD });
          twisted(x, z, y0 + 0.1, bh - 0.45, 0.28, PORPH, GOLD);
          ctx.box({ x: x, y: y0 + bh - 0.35, z: z, w: 0.8, h: 0.35, d: 0.8, color: GOLD }); ctx.cyl({ x: x, y: y0 + bh - 0.05, z: z, r: 0.36, rTop: 0.44, h: 0.2, seg: 8, color: GOLD_L });
          [0.8, 1.9, 3.0].forEach(function (hy) { ctx.cyl({ x: x, y: y0 + 0.1 + hy, z: z, r: 0.3, rTop: 0.3, h: 0.08, seg: 10, color: GOLD, flat: false }); });
          ctx.addCollider({ x: x, z: z, r: 0.45 });
        });
        var yT = y0 + bh, W2 = 2 * hw;
        ctx.box({ x: bx, y: yT, z: bz, w: W2 + 0.9, h: 0.3, d: W2 + 0.9, color: GOLD });                       // 아키트레이브
        ctx.box({ x: bx, y: yT + 0.3, z: bz, w: W2 + 0.8, h: 0.28, d: W2 + 0.8, color: 0xf3e8c8 });           // 프리즈(흰빛)
        ctx.box({ x: bx, y: yT + 0.58, z: bz, w: W2 + 1.3, h: 0.16, d: W2 + 1.3, color: GOLD_L });             // 코니스
        ctx.box({ x: bx, y: yT + 0.74, z: bz, w: W2 + 1.1, h: 0.08, d: W2 + 1.1, color: GOLD });
        [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {                                            // 네 면 박공
          var cx = bx + d[0] * (hw + 0.5), cz = bz + d[1] * (hw + 0.5), ex = d[1] !== 0 ? 1 : 0, ez = d[0] !== 0 ? 1 : 0, hs = hw + 0.5;
          var a1 = [cx - ex * hs, yT + 0.82, cz - ez * hs], a2 = [cx + ex * hs, yT + 0.82, cz + ez * hs], ap = [cx, yT + 1.7, cz];
          solid.addTris([].concat(a1, a2, ap), 0xf6efd8, [cx + d[0] * 3, yT + 1.2, cz + d[1] * 3], { vary: 0.01 });
          MET.addBeam(a1, ap, 0.1, 0.12, GOLD); MET.addBeam(a2, ap, 0.1, 0.12, GOLD);
        });
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
          var px = bx + c[0] * (hw + 0.5), pz = bz + c[1] * (hw + 0.5);
          ctx.cyl({ x: px, y: yT + 0.82, z: pz, r: 0.18, rTop: 0.1, h: 0.5, seg: 8, color: GOLD, flat: false }); ctx.sphere({ x: px, y: yT + 1.36, z: pz, r: 0.13, color: GOLD_L, w: 8, h: 6 });
          MET.addBeam([px, yT + 0.9, pz], [bx, yT + 2.5, bz], 0.15, 0.15, GOLD);
        });
        ctx.cyl({ x: bx, y: yT + 0.82, z: bz, r: 0.9, rTop: 0.6, h: 0.5, seg: 12, color: 0xf3e8c8 });
        ctx.cyl({ x: bx, y: yT + 1.32, z: bz, r: 0.6, rTop: 0.3, h: 1.0, seg: 12, color: GOLD_L, flat: false });
        ctx.sphere({ x: bx, y: yT + 2.5, z: bz, r: 0.3, color: GOLD_L, w: 10, h: 8 });
        ctx.box({ x: bx, y: yT + 2.7, z: bz, w: 0.1, h: 0.75, d: 0.1, color: GOLD }); ctx.box({ x: bx, y: yT + 3.1, z: bz, w: 0.42, h: 0.1, d: 0.1, color: GOLD });
      })();

      mark('sanctuary');
      // =====================================================================
      // 익랑 + 후진: 반돔(금 모자이크, 푸른 원) / 벽(대리석+모자이크) / 창(실제 개구부)
      // =====================================================================
      var AR = 5.6, ACZ = -28.8, AH = 7.0, ARISE = 4.6, AY0 = PY;
      // 후진 입구(반원 아치) 벽
      openWall({ F: frameOf(0, ACZ, 0, 1), u0: -XA, u1: XA, y0: PY, y1: Y_TOP, t: 0.5, holes: [{ u: 0, w: 2 * AR, yb: PY, h: AH, top: 'round', rise: ARISE }], color: 0xd8c8a2, rcolor: GOLD_D });
      var domeTex = mtex(1024, 512, 17.6, 8, function (g) {
        goldFill(g, 0, 0, 17.6, 8, 0.12, TG, TGG);
        // 덩굴 무늬
        g.strokeStyle = css(0x4a6a3a, 1); g.lineWidth = 0.09;
        for (var i = 0; i < 14; i++) { var cx = 0.6 + i * 1.3, cy = 6.3 + (i % 2) * 0.35; g.beginPath(); g.arc(cx, cy, 0.5, 0, 5); g.stroke(); g.beginPath(); g.arc(cx + 0.6, cy - 0.3, 0.28, 0, 5.2); g.stroke(); }
        g.fillStyle = css(0x4a6a3a, 1); for (i = 0; i < 40; i++) { g.beginPath(); g.ellipse(0.3 + i * 0.44, 5.6 + (i % 3) * 0.2, 0.12, 0.2, 0.6, 0, 6.3); g.fill(); }
        // 푸른 원(그리스도와 성모)
        g.fillStyle = css(GOLD_D, 1); g.beginPath(); g.arc(8.8, 3.4, 2.6, 0, 6.3); g.fill();
        g.fillStyle = css(0x1e3a6e, 1); g.beginPath(); g.arc(8.8, 3.4, 2.45, 0, 6.3); g.fill();
        g.fillStyle = css(0x2f5aa0, 1); g.beginPath(); g.arc(8.8, 3.4, 1.85, 0, 6.3); g.fill();
        g.fillStyle = css(0x1e3a6e, 1); g.beginPath(); g.arc(8.8, 3.4, 1.7, 0, 6.3); g.fill();
        g.fillStyle = css(GOLD_L, 1); for (i = 0; i < 28; i++) g.fillRect(8.8 + Math.cos(i * 0.224) * 2.12 - 0.05, 3.4 + Math.sin(i * 0.224) * 2.12 - 0.05, 0.1, 0.1);
        saint(g, 8.0, 4.7, 3.3, 0xf4efe2, 0xd8b23a); saint(g, 9.7, 4.7, 3.3, 0xa8432f, 0x2a4a8a);
        g.strokeStyle = css(GOLD, 1); g.lineWidth = 0.12; g.beginPath(); g.moveTo(8.85, 0.9); g.lineTo(8.85, 2.3); g.moveTo(8.5, 1.4); g.lineTo(9.2, 1.4); g.stroke();
        [-1, 1].forEach(function (s) { saint(g, 8.8 + s * 3.9, 4.6, 3.0, PALS[(s + 3) % 7], 0xf4efe2); saint(g, 8.8 + s * 5.2, 4.6, 3.0, PALS[(s + 5) % 7], 0x2a4a8a); saint(g, 8.8 + s * 6.5, 4.6, 3.0, 0xe9e0cc, 0xa8432f); });
        // 아래 어린양 띠
        g.fillStyle = css(0x2a4a8a, 1); g.fillRect(0, 7.2, 17.6, 0.8); for (i = 0; i < 12; i++) lamb(g, 0.9 + i * 1.4, 7.85, 0.9);
      });
      domeTex.wrapS = domeTex.wrapT = T.RepeatWrapping; domeTex.repeat.set(-1, 1); domeTex.offset.set(1, 0);
      var domeGeo = new T.SphereGeometry(1, 40, 14, PI, PI, 0, PI / 2);
      domeGeo.scale(AR, ARISE, AR); domeGeo.translate(0, PY + AH, ACZ);
      var domeMesh = ctx.mesh(domeGeo, emissiveMat(domeTex, 0.28, { side: T.BackSide, sheen: 0.5 })); domeMesh.receiveShadow = true;
      // 후진 벽(15면: 면마다 실제 창 개구부)
      var apseTex = mtex(1024, 512, 17.6, 7.0, function (g) {
        function WX(i) { return (1 - (i + 0.5) / 15) * 17.6; }
        blueFill(g, 0, 0, 17.6, 3.5, 0.1, 0x1e3a6e, 0x2a4a8a);
        g.fillStyle = css(GOLD, 1); g.fillRect(0, 3.5, 17.6, 0.28);
        g.fillStyle = css(0xe8e0cf, 1); g.fillRect(0, 3.78, 17.6, 1.7);
        for (var i = 0; i < 28; i++) { g.fillStyle = css(i % 3 === 0 ? SERP : (i % 3 === 1 ? PORPH : 0xb5533c), 1); g.fillRect(0.15 + i * 0.63, 3.95, 0.45, 1.35); g.strokeStyle = css(GOLD, 1); g.lineWidth = 0.04; g.strokeRect(0.15 + i * 0.63, 3.95, 0.45, 1.35); }
        g.fillStyle = css(GOLD, 1); g.fillRect(0, 5.48, 17.6, 0.12);
        g.fillStyle = css(WOOD, 1); g.fillRect(0, 5.6, 17.6, 1.4); g.fillStyle = css(WOOD_D, 1); for (i = 0; i < 40; i++) g.fillRect(0.2 + i * 0.44, 5.75, 0.3, 1.1);
        // 창 사이의 모자이크 장면
        var wi = [1, 4, 7, 10, 13];
        for (i = 0; i < 6; i++) {
          var xa = i === 0 ? 0.3 : WX(wi[i - 1]) - 0.1 - 1.0, xb = i === 5 ? 17.3 : WX(wi[i]) + 1.1;
          if (i === 0) { xa = WX(wi[0]) + 0.9; xb = WX(wi[1]) - 0.9; }
        }
        for (i = 0; i < 4; i++) {
          var sx = (WX(wi[i]) + WX(wi[i + 1])) / 2 - 1.2;
          goldFill(g, sx - 0.1, 0.35, 2.6, 2.8, 0.06, TG, TGG);
          blueFill(g, sx, 0.45, 2.4, 2.6, 0.06, 0x2a4a8a, 0x7ea8d8);
          g.fillStyle = css(0x6b7a3a, 1); g.fillRect(sx, 2.3, 2.4, 0.75);
          for (var f = 0; f < 3; f++) saint(g, sx + 0.5 + f * 0.7, 2.95, 1.6, PALS[(i + f) % PALS.length], PALS[(i + 2 * f + 1) % PALS.length]);
        }
      });
      var AT = new TexSink(), AN = 15, AW = [1, 4, 7, 10, 13];
      for (var ai = 0; ai < AN; ai++) {
        var f0 = ai / AN * PI, f1 = (ai + 1) / AN * PI;
        var pL = [AR * Math.cos(f1), ACZ - AR * Math.sin(f1)], pR = [AR * Math.cos(f0), ACZ - AR * Math.sin(f0)];
        var ln = Math.hypot(pR[0] - pL[0], pR[1] - pL[1]), ux = (pR[0] - pL[0]) / ln, uz = (pR[1] - pL[1]) / ln;
        var mx = (pL[0] + pR[0]) / 2, mz = (pL[1] + pR[1]) / 2, nl = Math.hypot(mx, mz - ACZ), nx = -mx / nl, nz = (ACZ - mz) / nl;
        var Fa = { px: pL[0], pz: pL[1], ux: ux, uz: uz, nx: nx, nz: nz };
        var hs = AW.indexOf(ai) >= 0 ? [winHole(ln / 2, 3.2, 0.6, 2.2)] : [];
        openWall({
          F: Fa, u0: 0, u1: ln, y0: PY, y1: PY + AH, t: 0.5, holes: hs, tex: AT, rcolor: PLASTER,
          uv: function (p) { var ph = Math.atan2(-(p[2] - ACZ), p[0]); if (ph < 0) ph = 0; return [1 - ph / PI, (p[1] - PY) / AH]; }
        });
        if (hs.length) {
          mkWindow(Fa, ln / 2, 3.2, 0.6, 2.2, 'round', 300 + ai, true, 0.3, 10);
          var hh = hs[0], cc2 = P3(Fa, ln / 2, 0, 0.04);
          ctx.arch({ x: cc2[0], y: hh.yb + hh.h, z: cc2[2], span: hh.w, rise: hh.w / 2, axis: Math.abs(nz) > Math.abs(nx) ? 'x' : 'z', t: 0.12, depth: 0.1, color: GOLD });
        }
        // 성가대석(나무 벤치)
        ctx.box({ x: mx * 0.94, y: PY, z: ACZ + (mz - ACZ) * 0.94, w: ln * 0.98, h: 0.8, d: 0.45, ry: Math.atan2(-uz, ux), color: WOOD });
        ctx.box({ x: mx * 0.97, y: PY + 0.8, z: ACZ + (mz - ACZ) * 0.97, w: ln, h: 0.08, d: 0.22, ry: Math.atan2(-uz, ux), color: WOOD_D });
      }
      AT.mesh(emissiveMat(apseTex, 0.14, { sheen: 0.25 }));
      [-1, 1].forEach(function (s) { ctx.box({ x: s * (AR + 0.35), y: PY, z: ACZ + 0.2, w: 0.5, h: 1.0, d: 0.5, color: MARBLE }); });

      // 보이는 익랑 측벽에도 가벼운 금빛 띠
      [-1, 1].forEach(function (s) { ctx.box({ x: s * (XA - 0.08), y: 3.0, z: -26, w: 0.12, h: 0.3, d: 5.6, color: GOLD_D }); });
      // 후진 이후 벽(익랑 뒷벽 좌우)
      [[-XA, -AR - 0.3], [AR + 0.3, XA]].forEach(function (r) { B(r[0], r[1], PY, Y_TOP, ACZ - 0.4, ACZ, 0xd8c8a2); });

      mark('apse');
      // =====================================================================
      // 조명·분위기: 점광원 1개 + 매달린 등 + 시간대 후크
      // =====================================================================
      ctx.addLight({ x: 0, y: 6.5, z: -17, color: 0xffcf8a, intensity: 1.0, distance: 24, kind: 'lamp' });
      [[-9.4, -2.6], [-9.4, 8.4], [-9.4, 20], [9.4, -2.6], [9.4, 8.4], [9.4, 20]].forEach(function (p) { ctx.lantern({ x: p[0], y: 4.6, z: p[1], chain: 1.4 }); });
      [[-3.4, 8], [3.4, 8], [-3.4, 22], [3.4, 22]].forEach(function () { });

      mark('lights');
      // =====================================================================
      // 좌석 + 촛불대
      // =====================================================================
      ctx.renderSeats(layout, 'bench', { wood: 0x7a5538, seat: 0x8a6642, back: 0x5e402a });
      ctx.candleStand(0, { wood: 0x4a3220 });
      mark('seats');
      ctx.setCameraBounds({ x0: -11.7, x1: 11.7, z0: -22.4, z1: 33.6, yMax: 13.4 });
    }
  };
})();
