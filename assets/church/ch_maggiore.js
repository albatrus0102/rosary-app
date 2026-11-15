/* ch_maggiore.js — 성 마리아 마조레 대성전(Basilica di Santa Maria Maggiore, 로마). scalePercent 80.
   조사서: docs/church/interiors/maggiore.md (§6 좌표, §11 채택값) + 구조 대조 docs/church/STRUCTURE_AUDIT_ROME.md §3(르타루이 실측 평면).
   2열 이오니아 열주(각 20) + 수평 들보 — 성소 단 앞에서 한 번 끊겨 큰 아치(쌍기둥, 안쪽이 화강암)가 되고, 그 너머로 그리스 십자 + 돔의 대경당 둘:
   시스티나(+x, 가운데 성체 감실)·파올리나(−x, '로마 백성의 구원' 성모 성화). 평평한 금빛 격자 천장, 모자이크 띠 + 고창(실제 개구부+유리),
   개선문 모자이크, 후진 폭의 성가대 칸 + 금빛 반돔 후진, 포르피리 발다키노, 코스마테스크 바닥, 콘페시오 난간, 정면 안쪽 벽의 원형 창(오큘러스). */
(function () {
  'use strict';

  // ---------- (A) 레이아웃: 순수 데이터 ----------
  // 평면 상수(빌더와 공유): 신랑 z −23.2(개선 아치)…28.2(입구 벽) = 51.4(실제 64.3 m). 큰 아치 축 z = ARZC, 대경당 중심 (±CHX, ARZC).
  var ARZ0 = -13.02, ARZ1 = -6.91, ARZC = (ARZ0 + ARZ1) / 2, CHX = 21.2, XA_L = 12.2;
  // 십자가의 길 14처(측랑 외벽에 고정: 창·곁 제대·벽기둥·큰 아치·봉헌대·무덤을 피한 칸 가운데). 순서 = 제대를 볼 때 오른쪽 벽 제대 쪽 1처 → 입구 → 왼쪽 벽 입구 쪽 8처 → 제대 쪽 14처.
  var E0 = ARZ1 + 1.05, PITCH_L = (28.2 - E0) / 13, S0 = ARZ0 - 1.05;
  function eBayC(i) { return E0 + PITCH_L * (i + 0.5); }
  function sBayC(j) { return S0 - PITCH_L * (j + 0.5); }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  var CROSS_R = [sBayC(0), eBayC(0), eBayC(1), eBayC(3), eBayC(4), eBayC(6), eBayC(7)];     // 1..7 (+x 벽)
  var CROSS_L = [eBayC(12), eBayC(10), eBayC(8), eBayC(7), eBayC(5), sBayC(0), sBayC(1)];   // 8..14 (−x 벽)
  function crossPlaques() {
    var out = [], px = XA_L - 0.074;
    CROSS_R.forEach(function (z) { out.push({ x: r3(px), z: r3(z), face: [-1, 0], side: 'R' }); });
    CROSS_L.forEach(function (z) { out.push({ x: r3(-px), z: r3(z), face: [1, 0], side: 'L' }); });
    return out;
  }
  var HPI = Math.PI / 2;
  var layout = {
    id: 'maggiore', scalePercent: 80,
    bounds: { x0: -30.0, x1: 30.0, z0: -23.2, z1: 28.0 },
    spawn: { x: 0, z: 24.5, r: 0 },
    seatGroups: [
      { g: 'L', rows: 14, perRow: 4, origin: { x: -1.5, z: -12.0 }, dx: -1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.5, 0.5] },
      { g: 'R', rows: 14, perRow: 4, origin: { x: 1.5, z: -12.0 }, dx: 1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.5, 0.5] },
      // 파올리나 경당: '로마 백성의 구원' 성화를 바라보는 기도 자리(−x 를 봄). 시스티나 경당: 가운데 성체 감실을 바라보는 기도 자리(+x 를 봄).
      // 두 경당의 줄 수가 같아야(각 2 그룹) 좌석 방향 평균(신랑 축)이 정확히 −z 로 남는다(stations.js navAxis, way_cross.js seatAxis).
      { g: 'PA', rows: 2, perRow: 3, origin: { x: -23.0, z: r3(ARZC + 1.4) }, dx: 0, dz: 0, dzIdx: 1.0, rowDx: 1.9, yaw: HPI, pad: [0.5, 0.5] },
      { g: 'PB', rows: 2, perRow: 3, origin: { x: -23.0, z: r3(ARZC - 1.4) }, dx: 0, dz: 0, dzIdx: -1.0, rowDx: 1.9, yaw: HPI, pad: [0.5, 0.5] },
      { g: 'SA', rows: 1, perRow: 3, origin: { x: 18.0, z: r3(ARZC + 1.7) }, dx: 0, dz: 0, dzIdx: 1.0, rowDx: -1.9, yaw: -HPI, pad: [0.5, 0.5] },
      { g: 'SB', rows: 1, perRow: 3, origin: { x: 18.0, z: r3(ARZC - 1.7) }, dx: 0, dz: 0, dzIdx: -1.0, rowDx: -1.9, yaw: -HPI, pad: [0.5, 0.5] }
    ],
    candles: { stands: [{ x: -10.5, z: 3.0, slots: 96, reach: 1.8, cols: 16, face: [1, 0], pitch: 0.5, step: 0.25, ystep: 0.3, y0: 0.8 }] },
    crossWay: { plaques: crossPlaques() },
    info: { name: '성 마리아 마조레 대성전', place: '이탈리아 로마', builtYear: 432 }
  };
  ChurchLayouts.register(layout);

  // ---------- (B) 빌더 ----------
  ChurchBuilders['maggiore'] = {
    layout: layout,
    thumb: { x: 0, z: 19, yaw: 0, pitch: 7, zoom: 0.8, hour: 12 },
    build: function (ctx) {
      var T = ctx.THREE, PI = Math.PI, low = ctx.quality === 'low';
      var G = window.ChurchGeo, Geo = G.Geo;
      var solid = ctx.solid;
      var rnd = ctx.rng(4242);
      var _mk = 0; function mark(n) { if (window.__mgMark) window.__mgMark(n); if (window.__mgDebug) console.log('MARK ' + n + ' ' + (solid.vertexCount - _mk)); _mk = solid.vertexCount; }

      // ----- 치수(앱 m; 조사서 §6 + §11, 구조 대조 STRUCTURE_AUDIT_ROME §3.4) -----
      var Z_A = -23.2, Z_E = 28.2;                                     // 개선 아치 벽 / 입구 벽 안쪽면 (51.4 = 실제 64.3 m, 르타루이 실측)
      var XC = 6.8, XN = 6.4, XA = 12.2;                               // 기둥 중심 / 신랑 벽 안쪽면 / 측랑 외벽 안쪽면
      var Y_COL = 5.5, Y_ENT = 6.8, Y_TOP = 14.4, Y_AV = 6.0, AV_RISE = 1.0;   // 기둥 꼭대기 / 들보 위 / 천장 / 측랑 궁륭 시작·상승
      var PY = 0.4;                                                    // 성소 단 높이
      // 열주(한쪽 20개): 큰 아치 양옆에 쌍기둥(간격 PAIR, 안쪽이 화강암), 그 밖은 PITCH 간격. 아치 구간 = 열주 길이의 0.198~0.317 지점(실측 비율).
      var PAIR = 1.05, PITCH = PITCH_L, AR_R = 2.62;                   // 쌍기둥 간격 / 기둥 간격 2.62(실제 3.27 m) / 큰 아치 반지름(순폭 5.24)
      var TZ0 = ARZC - AR_R, TZ1 = ARZC + AR_R;                        // 큰 아치 통로(신랑 벽 → 측랑 → 경당 입구)의 양 옆면 z
      var PZ0 = S0 - 0.25, PZ1 = E0 + 0.25;                            // 아치 양옆 벽체(쌍기둥 뒤, 측랑을 가로지른다)의 바깥면 z
      var COLS = [Z_A + 0.22, S0 - 3 * PITCH, S0 - 2 * PITCH, S0 - PITCH, S0, ARZ0, ARZ1, E0];
      for (var ck = 1; ck <= 12; ck++) COLS.push(E0 + PITCH * ck);
      // 벽 장식의 칸(기둥 사이): 입구 쪽 eBay(0..12), 성소 쪽 sBay(0..2), 개선 아치 벽에 붙은 좁은 칸 stub
      var NE = 13, NS = 3, STUB1 = S0 - NS * PITCH;
      function eBay(i) { return { z0: E0 + PITCH * i, z1: i === NE - 1 ? Z_E : E0 + PITCH * (i + 1), zc: eBayC(i), win: i % 2 === 0, i: i, run: 'e' }; }
      function sBay(j) { return { z0: S0 - PITCH * (j + 1), z1: S0 - PITCH * j, zc: sBayC(j), win: j % 2 === 0, i: j, run: 's' }; }
      var BAYS = []; (function () { var q; for (q = NS - 1; q >= 0; q--) BAYS.push(sBay(q)); for (q = 0; q < NE; q++) BAYS.push(eBay(q)); })();

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
        // 교차 궁륭 = 두 반원 통 궁륭의 합집합 → 면 높이 = max(fu, fv): 칸의 네 변은 열린 아치(횡단 아치·벽 아치), 대각선은 아래로 선 모서리.
        // (예전 min(fu, fv) 는 교집합 = 칸마다 네 변이 기공선까지 내려오는 닫힌 궁륭이라 칸 경계마다 면이 커튼처럼 처졌다.)
        var res = low ? 4 : 6, bd = (z1 - z0) / nz, ax = (x1 - x0) / 2, az = bd / 2, ox = (x0 + x1) / 2;
        var fu = ChurchKit.profileFn('round', ax, rise), fv = ChurchKit.profileFn('round', az, rise);
        var cTop = G.toColor(color), cLow = cTop.clone().multiplyScalar(0.88);
        function H(u, v) { return Math.max(fu(u), fv(v)); }
        for (var bz = 0; bz < nz; bz++) {
          var oz = z0 + bd * (bz + 0.5);
          for (var i = 0; i < res; i++) for (var j = 0; j < res; j++) {
            var u0 = -ax + 2 * ax * i / res, u1 = -ax + 2 * ax * (i + 1) / res, v0 = -az + 2 * az * j / res, v1 = -az + 2 * az * (j + 1) / res;
            var h00 = H(u0, v0), h10 = H(u1, v0), h11 = H(u1, v1), h01 = H(u0, v1);
            var ck = cLow.clone().lerp(cTop, Math.min(1, (h00 + h10 + h11 + h01) / (4 * rise)));
            var qa = [ox + u0, y + h00, oz + v0], qb = [ox + u1, y + h10, oz + v0], qc = [ox + u1, y + h11, oz + v1], qd = [ox + u0, y + h01, oz + v1];
            // 삼각형 나눔을 접힘(대각선)에 맞춘다
            if (i + j === res - 1) solid.addQuad(qb, qc, qd, qa, ck, [ox, y - 1, oz]); else solid.addQuad(qa, qb, qc, qd, ck, [ox, y - 1, oz]);
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
      TexSink.prototype.tri = function (a, b, c, ua, ub, uc, n) {
        var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        var flip = (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] < 0;
        var order = flip ? [[a, ua], [c, uc], [b, ub]] : [[a, ua], [b, ub], [c, uc]];
        for (var i = 0; i < 3; i++) { this.P.push(order[i][0][0], order[i][0][1], order[i][0][2]); this.N.push(n[0], n[1], n[2]); this.U.push(order[i][1][0], order[i][1][1]); }
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
      function archPts(h) {   // 반원(타원) 아치는 각도 등분(가장자리가 꺾여 보이지 않게), 첨두는 키트 프로필
        var rise = h.rise === undefined ? h.w / 2 : h.rise, n = h.seg || (low ? 8 : 14), out = [];
        if (h.top === 'pointed') return ChurchKit.profilePts('pointed', h.w / 2, rise, n);
        for (var k = 0; k <= n; k++) out.push([-Math.cos(PI * k / n) * h.w / 2, Math.sin(PI * k / n) * rise]);
        return out;
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
          if (h.top !== 'circle' && h.yb > o.y0 + 1e-6) fq(l, o.y0, r, o.y0, r, h.yb, l, h.yb);
          var hint = P3(F, h.u, h.yb + h.h * 0.5, -t * 0.5);
          if (h.top === 'circle') {
            var cp = [], cn = low ? 12 : 24; for (var cq = 0; cq <= cn; cq++) cp.push([-Math.cos(PI * cq / cn) * h.w / 2, Math.sin(PI * cq / cn) * h.w / 2]);
            for (var ci = 0; ci < cp.length - 1; ci++) {
              var xa = h.u + cp[ci][0], xb = h.u + cp[ci + 1][0], ya = cp[ci][1], yb2 = cp[ci + 1][1];
              fq(xa, h.yb + ya, xb, h.yb + yb2, xb, o.y1, xa, o.y1);
              fq(xa, o.y0, xb, o.y0, xb, h.yb - yb2, xa, h.yb - ya);
              rq(P3(F, xa, h.yb + ya, 0), P3(F, xb, h.yb + yb2, 0), P3(F, xb, h.yb + yb2, -t), P3(F, xa, h.yb + ya, -t), P3(F, h.u, h.yb, -t * 0.5));
              rq(P3(F, xa, h.yb - ya, 0), P3(F, xb, h.yb - yb2, 0), P3(F, xb, h.yb - yb2, -t), P3(F, xa, h.yb - ya, -t), P3(F, h.u, h.yb, -t * 0.5));
            }
            return;
          }
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
      ctx.floor({ x0: XC, x1: XA + 0.6, z0: Z_A, z1: Z_E, y: 0, tex: aisleTex, tile: 2.7, gloss: 0.8, reflect: false });
      ctx.floor({ x0: -XA - 0.6, x1: -XC, z0: Z_A, z1: Z_E, y: 0, tex: aisleTex, tile: 2.7, gloss: 0.8, reflect: false });
      var cosm = ctx.tex.pattern('cosmati', { c1: 0xf2eee4, c2: 0x3a6b52, c3: 0x7a3045 });
      // 개선 아치 뒤: 후진 폭의 성가대 칸(x ±CHOIR_X) + 반원 후진. 양옆(측랑 머리)은 벽이다(르타루이 도면 k).
      var CHOIR_X = 5.6;
      ctx.floor({ x0: -CHOIR_X, x1: CHOIR_X, z0: -28.8, z1: Z_A, y: PY, tex: cosm, tile: 2.8, gloss: 0.85, reflect: false });
      ctx.floor({ x0: -CHOIR_X, x1: CHOIR_X, z0: -34.4, z1: -28.8, y: PY, tex: cosm, tile: 2.8, gloss: 0.85, reflect: false });

      mark('floors');
      // =====================================================================
      // 열주 + 수평 들보 (한쪽 20개: 대리석 18 + 화강암 2 = 큰 아치 양옆 안쪽 기둥)
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
        COLS.forEach(function (z) { ionicColumn(s * XC, z, (z === ARZ0 || z === ARZ1) ? GRANITE : MARBLE); });
      });
      // 들보(건축 띠): 아키트레이브 3단 + 프리즈 + 치형 + 코니스 — 큰 아치 구간(TZ0…TZ1)에서 끊긴다
      [-1, 1].forEach(function (s) {
        [[Z_A, TZ0], [TZ1, Z_E]].forEach(function (rn) {
          var cz = (rn[0] + rn[1]) / 2, len = rn[1] - rn[0], x = s * XC;
          ctx.box(mb({ x: x, y: 5.5, z: cz, w: 0.72, h: 0.17, d: len, color: MARBLE }));
          ctx.box(mb({ x: x, y: 5.67, z: cz, w: 0.77, h: 0.17, d: len, color: ctx.shade(MARBLE, 0.97) }));
          ctx.box(mb({ x: x, y: 5.84, z: cz, w: 0.82, h: 0.17, d: len, color: MARBLE }));
          ctx.box(mb({ x: x, y: 6.01, z: cz, w: 0.74, h: 0.3, d: len, color: 0xe4dccb }));                 // 프리즈
          ctx.box(mb({ x: x, y: 6.31, z: cz, w: 0.82, h: 0.1, d: len, color: MARBLE }));
          ctx.box(mb({ x: x, y: 6.41, z: cz, w: 0.98, h: 0.1, d: len, color: MARBLE_D }));                 // 받침 몰딩
          ctx.box(mb({ x: x, y: 6.51, z: cz, w: 1.14, h: 0.2, d: len, color: MARBLE }));                   // 코로나
          ctx.box({ x: x, y: 6.71, z: cz, w: 1.18, h: 0.1, d: len, color: GOLD, metal: true });          // 금빛 시마
          for (var z = rn[0] + 0.3; z < rn[1] - 0.2; z += 0.9) ctx.box(mb({ x: x - s * 0.43, y: 6.31, z: z, w: 0.12, h: 0.1, d: 0.17, color: MARBLE_D, vary: 0 }));
        });
      });

      // =====================================================================
      // 신랑 벽(모자이크 띠 + 고창 실제 개구부) — 텍스처 면 + 창 구멍. 질감 3열: A 창 칸 | B 프레스코 칸 | C 반 칸(좁은 칸·큰 아치 둘레의 금 모자이크 바탕)
      // =====================================================================
      var TWM = 2.5 * PITCH, UA = 0, UB = 0.4, UC = 0.8, UWB = 0.4, UWC = 0.2, CW = PITCH / 2;
      var clereTex = mtex(1280, 1024, TWM, 7.6, function (g, W, H) {
        function Y(m) { return 7.6 - m; }
        g.fillStyle = css(PLASTER, 1); g.fillRect(0, 0, W, H);
        // 모자이크 띠 m 0..3.1
        for (var b = 0; b < 2; b++) {
          var bx = b * PITCH;
          goldFill(g, bx, Y(3.1), PITCH, 3.1, 0.07, TG, TGG);
          var px = bx + 0.26, pw = PITCH - 0.52, pt = Y(2.75), ph = 2.2;
          g.fillStyle = css(GOLD_D, 1); g.fillRect(px - 0.06, pt - 0.06, pw + 0.12, ph + 0.12);
          blueFill(g, px, pt, pw, ph * 0.72, 0.07, 0x274c8f, 0x7ea8d8);
          g.fillStyle = css(0x6b7a3a, 1); g.fillRect(px, pt + ph * 0.72, pw, ph * 0.28);
          for (var i = 0; i < 5; i++) saint(g, px + 0.35 + i * (pw - 0.7) / 4, pt + ph * 0.94, 1.2, PALS[(i + b * 3) % PALS.length], PALS[(i * 2 + b + 1) % PALS.length]);
          g.fillStyle = css(0xe8dcc0, 1); g.fillRect(px + 0.1, pt + 0.18, 0.5, 0.32); g.fillStyle = css(0xb5533c, 1); g.fillRect(px + 0.08, pt + 0.12, 0.54, 0.08);
          g.fillRect(px + pw - 0.62, pt + 0.2, 0.46, 0.34); g.fillStyle = css(0xe8dcc0, 1); g.fillRect(px + pw - 0.6, pt + 0.26, 0.42, 0.28);
        }
        // C 열: 금 모자이크 바탕 + 작은 마름모·별 무늬(이어 붙일 수 있게 좌우가 같다)
        var cx0 = 2 * PITCH;
        goldFill(g, cx0, Y(3.1), CW, 3.1, 0.07, TG, TGG);
        [0.75, 2.3].forEach(function (my) {
          var mx = cx0 + CW / 2, yy = Y(my);
          g.fillStyle = css(0x274c8f, 1); g.beginPath(); g.moveTo(mx, yy - 0.3); g.lineTo(mx + 0.22, yy); g.lineTo(mx, yy + 0.3); g.lineTo(mx - 0.22, yy); g.closePath(); g.fill();
          g.fillStyle = css(GOLD_L, 1); g.beginPath(); g.arc(mx, yy, 0.08, 0, 6.3); g.fill();
        });
        g.fillStyle = css(0x2f6b4e, 1); g.beginPath(); g.arc(cx0 + CW / 2, Y(1.52), 0.13, 0, 6.3); g.fill();
        g.fillStyle = css(0xa8432f, 1); g.fillRect(cx0, Y(0.12), CW, 0.06); g.fillRect(cx0, Y(3.04), CW, 0.06);
        g.fillStyle = css(GOLD, 1); g.fillRect(0, Y(3.4), W, 0.3); g.fillStyle = css(GOLD_D, 1); g.fillRect(0, Y(3.15), W, 0.04);
        // 고창 구간 m 3.4..7.3
        for (b = 0; b < 2; b++) {
          bx = b * PITCH;
          g.fillStyle = css(0xe2d4b4, 1); g.fillRect(bx, Y(7.3), PITCH, 3.9);
          if (b === 1) { // 프레스코 칸
            var fx = bx + 0.3, fw = PITCH - 0.6, ft = Y(7.0), fh = 3.2;
            g.fillStyle = css(0x9b4430, 1); g.fillRect(fx - 0.12, ft - 0.12, fw + 0.24, fh + 0.24);
            g.fillStyle = css(FRESCO, 1); g.fillRect(fx, ft, fw, fh);
            g.fillStyle = css(0xe9d6ac, 1); g.beginPath(); g.moveTo(fx + 0.3, ft + fh); g.lineTo(fx + 0.3, ft + 1.1); g.arc(fx + fw / 2, ft + 1.1, fw / 2 - 0.3, PI, 0); g.lineTo(fx + fw - 0.3, ft + fh); g.closePath(); g.fill();
            g.fillStyle = css(0xc7a56e, 1); g.fillRect(fx, ft, 0.22, fh); g.fillRect(fx + fw - 0.22, ft, 0.22, fh);
            saint(g, fx + fw / 2, ft + fh - 0.1, 2.0, 0xb5533c, 0xf4efe2);
            saint(g, fx + 0.65, ft + fh - 0.1, 1.5, 0x2a4a8a, 0xe9e0cc);
            saint(g, fx + fw - 0.65, ft + fh - 0.1, 1.5, 0x4d7a5a, 0xd8b23a);
          }
          g.fillStyle = css(GOLD, 1); g.fillRect(bx, Y(7.3), 0.07, 3.9); g.fillRect(bx + PITCH - 0.07, Y(7.3), 0.07, 3.9);
        }
        g.fillStyle = css(0xe2d4b4, 1); g.fillRect(cx0, Y(7.3), CW, 3.9);
        g.fillStyle = css(GOLD, 1); g.fillRect(0, Y(7.6), W, 0.4);
      });
      var clereMat = emissiveMat(clereTex, 0.14, { sheen: 0.3 });
      var FR = frameOf(XN, Z_A, -1, 0), FL = frameOf(-XN, Z_E, 1, 0);   // FR: u = z − Z_A (z 가 오른쪽), FL: u = Z_E − z
      var SINK = new TexSink();
      var WSILL = 10.0, WGW = 1.0, WGH = 2.1, Y_BAND = WSILL - 0.22;    // Y_BAND = 모자이크 띠 위 코니스 = 고창 구멍 아래
      function uOf(F, z) { return (z - F.pz) / F.uz; }
      // 벽 구간 [z0, z1] 을 질감의 한 열(u0 부터 폭 uw)에 맞춘다. 왼쪽 벽은 좌우를 뒤집어(실내에서 볼 때 그림이 거울상이 되지 않게) 붙인다.
      function bayUV(F, z0, z1, u0, uw) {
        return function (p) { var f = (p[2] - z0) / (z1 - z0); if (F.uz < 0) f = 1 - f; return [u0 + uw * f, (p[1] - Y_ENT) / 7.6]; };
      }
      function naveSeg(F, z0, z1, u0, uw, y0, y1, hole) {
        openWall({ F: F, u0: Math.min(uOf(F, z0), uOf(F, z1)), u1: Math.max(uOf(F, z0), uOf(F, z1)), y0: y0, y1: y1, t: 0.8, holes: hole ? [hole] : [], tex: SINK, uv: bayUV(F, z0, z1, u0, uw) });
      }
      function clereWindow(F, zc, seed, beam) {
        var u = uOf(F, zc);
        mkWindow(F, u, WSILL, WGW, WGH, 'round', seed, beam, 0.35, 8);
        var h = winHole(u, WSILL, WGW, WGH), c = P3(F, u, 0, 0.05), sp = h.yb + h.h;   // 창 둘레 아치 몰딩(금빛)
        ctx.arch({ x: c[0], y: sp, z: c[2], span: h.w + 0.05, rise: h.w / 2, axis: 'z', t: 0.16, depth: 0.12, color: GOLD, seg: 8 });
        [-1, 1].forEach(function (sg) { var q = P3(F, u + sg * (h.w / 2 + 0.08), 0, 0.05); ctx.box({ x: q[0], y: h.yb, z: q[2], w: 0.12, h: h.h, d: 0.16, color: GOLD }); });
      }
      [[FR, 1], [FL, 2]].forEach(function (pr) {
        var F = pr[0], sx = -F.nx;   // sx: 이 벽의 x 부호
        // 일반 칸
        BAYS.forEach(function (b, bi) {
          naveSeg(F, b.z0, b.z1, b.win ? UA : UB, UWB, Y_ENT, Y_TOP, b.win ? winHole(uOf(F, b.zc), WSILL, WGW, WGH) : null);
          if (b.win) clereWindow(F, b.zc, 3 + bi * 2 + pr[1] * 17, b.run === 'e' && (b.i === 4 || b.i === 10));
          // 모자이크 패널 금박 틀(입체)
          var uu = uOf(F, b.zc), hw = (b.z1 - b.z0) / 2 - 0.2;
          [-1, 1].forEach(function (sg) { var q = P3(F, uu + sg * hw, 0, 0.05); ctx.box({ x: q[0], y: 7.29, z: q[2], w: 0.14, h: 2.38, d: 0.14, color: GOLD }); });
          var q1 = P3(F, uu, 0, 0.05); ctx.box({ x: q1[0], y: 7.29, z: q1[2], w: 0.14, h: 0.12, d: hw * 2 + 0.14, color: GOLD });
          ctx.box({ x: q1[0], y: 9.55, z: q1[2], w: 0.14, h: 0.12, d: hw * 2 + 0.14, color: GOLD });
        });
        // 개선 아치 벽에 붙은 좁은 칸
        naveSeg(F, Z_A, STUB1, UC, UWC * (STUB1 - Z_A) / CW, Y_ENT, Y_TOP, null);
        // 큰 아치 구간(쌍기둥 위 벽기둥 + 아치): 위쪽(고창 구간)은 창 칸 질감을 구간 전체에 펴고 가운데에 고창 하나
        naveSeg(F, S0, E0, UA, UWB, Y_BAND, Y_TOP, { u: uOf(F, ARZC), w: WGW + 0.36, yb: Y_BAND, h: WGH + 0.32, top: 'round', rise: (WGW + 0.36) / 2 });
        clereWindow(F, ARZC, 91 + pr[1] * 17, false);
        // 아래쪽(모자이크 띠 높이): 반원 아치를 뚫고 남은 면에 C 열(금 모자이크)을 반 칸씩 이어 붙인다
        var zs = [S0, E0], an = low ? 10 : 16, k;
        for (k = 0; k <= an; k++) zs.push(ARZC - AR_R * Math.cos(PI * k / an));
        for (k = -3; k <= 3; k++) zs.push(ARZC + k * CW);
        zs.sort(function (a, b) { return a - b; });
        function archY(z) { var d = z - ARZC, q = AR_R * AR_R - d * d; return Y_ENT + (q > 0 ? Math.sqrt(q) : 0); }
        for (k = 0; k < zs.length - 1; k++) {
          var za = zs[k], zb = zs[k + 1];
          if (zb - za < 1e-4) continue;
          var ti = Math.floor(((za + zb) / 2 - ARZC) / CW), tz0 = ARZC + ti * CW, uvf = bayUV(F, tz0, tz0 + CW, UC, UWC);
          var A = [F.px, archY(za), za], Bq = [F.px, archY(zb), zb], C = [F.px, Y_BAND, zb], D = [F.px, Y_BAND, za];
          SINK.quad(A, Bq, C, D, uvf(A), uvf(Bq), uvf(C), uvf(D), [F.nx, 0, F.nz]);
        }
        // 아치 테두리(대리석 아키볼트 + 금 구슬 띠) + 쐐기돌, 쌍기둥 위 벽기둥
        ctx.arch(mb({ x: sx * (XN - 0.05), y: Y_ENT, z: ARZC, span: 2 * AR_R, rise: AR_R, axis: 'z', t: 0.3, depth: 0.14, color: MARBLE, seg: 16 }));
        ctx.arch({ x: sx * (XN - 0.1), y: Y_ENT, z: ARZC, span: 2 * AR_R + 0.04, rise: AR_R + 0.02, axis: 'z', t: 0.07, depth: 0.1, color: GOLD, seg: 16 });
        ctx.box({ x: sx * (XN - 0.12), y: Y_ENT + AR_R - 0.1, z: ARZC, w: 0.2, h: 0.5, d: 0.44, color: GOLD });
        [(S0 + TZ0) / 2, (TZ1 + E0) / 2].forEach(function (pz) {
          ctx.box(mb({ x: sx * (XN - 0.05), y: Y_ENT, z: pz, w: 0.1, h: Y_BAND - Y_ENT - 0.32, d: 0.86, color: MARBLE }));
          ctx.box({ x: sx * (XN - 0.07), y: Y_BAND - 0.32, z: pz, w: 0.14, h: 0.3, d: 1.0, color: GOLD });
          ctx.box(mb({ x: sx * (XN - 0.05), y: 10.06, z: pz, w: 0.1, h: 3.5, d: 0.7, color: MARBLE }));
          ctx.box({ x: sx * (XN - 0.07), y: 13.56, z: pz, w: 0.14, h: 0.28, d: 0.84, color: GOLD });
        });
        var q2x = F.px + F.nx * 0.1, zc = (Z_A + Z_E) / 2, zl = Z_E - Z_A;
        ctx.box({ x: q2x, y: 9.78, z: zc, w: 0.32, h: 0.28, d: zl, color: GOLD });                       // 모자이크 띠 위 코니스
        ctx.box({ x: q2x + F.nx * 0.1, y: 13.85, z: zc, w: 0.5, h: 0.5, d: zl, color: GOLD_D });        // 천장 아래 큰 코니스
        ctx.box({ x: q2x + F.nx * 0.2, y: 13.98, z: zc, w: 0.3, h: 0.14, d: zl, color: GOLD });
      });
      SINK.mesh(clereMat);

      mark('nave walls');
      // =====================================================================
      // 금빛 격자 천장(입체 코퍼: 금 리브 + 오목한 붉은 칸 + 장미꽃)
      // =====================================================================
      var NCZ = 24, CELLX = 2 * XN / 6, CELLZ = (Z_E - Z_A) / NCZ;   // 칸 2.13 × 2.14
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
      cofTex.wrapS = cofTex.wrapT = T.RepeatWrapping; cofTex.repeat.set(6, NCZ);
      var cofMat = emissiveMat(cofTex, 0.16, { side: T.FrontSide, sheen: 0.3 });
      var cofPlane = new T.Mesh(new T.PlaneGeometry(2 * XN, Z_E - Z_A), cofMat);
      cofPlane.rotation.x = PI / 2; cofPlane.position.set(0, Y_TOP, (Z_A + Z_E) / 2); ctx.add(cofPlane); ctx.stats.meshes++; cofPlane.castShadow = true; cofPlane.receiveShadow = true;
      // 리브(아래로 튀어나온 금 보)
      for (var ci = 0; ci <= 6; ci++) ctx.box({ x: -XN + ci * CELLX, y: Y_TOP - 0.3, z: (Z_A + Z_E) / 2, w: 0.22, h: 0.3, d: Z_E - Z_A, color: GOLD });
      for (var cj = 0; cj <= NCZ; cj++) ctx.box({ x: 0, y: Y_TOP - 0.3, z: Z_A + cj * CELLZ, w: 2 * XN, h: 0.3, d: 0.22, color: GOLD });
      // 칸마다 금 테두리(2단) + 장미꽃
      for (cj = 0; cj < NCZ; cj++) for (ci = 0; ci < 6; ci++) {
        var ccx = -XN + (ci + 0.5) * CELLX, ccz = Z_A + (cj + 0.5) * CELLZ;
        cylO(ccx, Y_TOP - 0.16, ccz, 0.3, 0.12, 0.16, 8, GOLD_L, true, 0.02, MET);
      }
      // 성가대 칸 천장(후진 폭)
      ctx.ceilingFlat({ x0: -CHOIR_X, x1: CHOIR_X, z0: -28.8, z1: Z_A - 0.9, y: Y_TOP, tex: ctx.tex.coffer({ base: 0x3e2412, gold: GOLD, border: GOLD_D, n: 3 }), tile: 6.4 });

      mark('ceiling');
      // =====================================================================
      // 측랑: 교차 궁륭 + 외벽(창 개구부) + 벽기둥 + 곁 제대 + 큰 아치 통로(신랑 → 측랑 → 대경당)
      // =====================================================================
      var VAULT_C = 0xdfd2b2, AW_TOP = Y_AV + AV_RISE, X_IN = XN + 0.8, X_CH = XA + 0.6;   // X_IN 신랑 벽의 측랑 쪽 면, X_CH 측랑 외벽 바깥면(= 경당 입구)
      // 작은 촛불(자기발광 조형 — 스프라이트를 쓰지 않아 그리기 호출이 늘지 않는다)
      var FLAME_C = new T.Color(0xffc56a).multiplyScalar(2.6);
      function flameG(x, y, z, s) { ctx.glow.add(Geo.sph(6, 4), FLAME_C, { x: x, y: y, z: z, sx: 0.028 * s, sy: 0.075 * s, sz: 0.028 * s, flat: false, vary: 0 }); }
      [-1, 1].forEach(function (s) {
        var x0 = s < 0 ? -XA : XC, x1 = s < 0 ? -XC : XA;
        groin(x0, x1, Z_A, STUB1, Y_AV, AV_RISE, 1, VAULT_C);
        groin(x0, x1, STUB1, S0, Y_AV, AV_RISE, NS, VAULT_C);
        groin(x0, x1, E0, Z_E, Y_AV, AV_RISE, NE, VAULT_C);
        // 궁륭의 신랑 쪽 벽 아치(들보 위 ~ 궁륭 사이)를 막는 띠 = 신랑 벽의 측랑 쪽 면
        [[Z_A, PZ0], [PZ1, Z_E]].forEach(function (rn) { B(s < 0 ? -XC : XN + 0.05, s < 0 ? -XN - 0.05 : XC, 6.6, AW_TOP + 0.15, rn[0], rn[1], VAULT_C, { vary: 0.01 }); });
      });
      var W_E = [1, 3, 5, 7, 9, 11], W_S = [1];                 // 측랑 창이 있는 칸
      var ALT_R = [2, 5, 8], ALT_L = [6, 9, 11], DOOR_R = 11;   // 곁 제대 칸, 세례당 문 칸. 왼쪽 0 = 프란치스코 교황 무덤, 1~4 = 봉헌 촛불대
      var PANEL = { R: [sBayC(2), sBayC(1), eBayC(9), eBayC(10), eBayC(12)], L: [sBayC(2)] };   // 대리석 판 장식 칸(제대·14처·무덤·문이 없는 칸)
      var aisleFr = { R: frameOf(XA, Z_A, -1, 0), L: frameOf(-XA, Z_E, 1, 0) };
      ['R', 'L'].forEach(function (sd) {
        var F = aisleFr[sd], sg = sd === 'R' ? 1 : -1;
        [[Z_A, PZ0, W_S, sBayC, 20], [PZ1, Z_E, W_E, eBayC, 0]].forEach(function (rn) {
          var us = rn[2].map(function (k) { return uOf(F, rn[3](k)); });
          openWall({ F: F, u0: Math.min(uOf(F, rn[0]), uOf(F, rn[1])), u1: Math.max(uOf(F, rn[0]), uOf(F, rn[1])), y0: 0, y1: AW_TOP, t: 0.6,
            holes: us.map(function (u) { return winHole(u, 4.2, 0.9, 0.8); }), color: 0xdccdaa, vary: 0.015 });
          us.forEach(function (u, i) {
            mkWindow(F, u, 4.2, 0.9, 0.8, 'round', 70 + rn[2][i] + rn[4] + (sd === 'R' ? 0 : 40), false, 0.28);
            var h = winHole(u, 4.2, 0.9, 0.8), c = P3(F, u, 0, 0.05);
            ctx.arch({ x: c[0], y: h.yb + h.h, z: c[2], span: h.w + 0.05, rise: h.w / 2, axis: 'z', t: 0.14, depth: 0.12, color: MARBLE });
          });
          // 걸레받이/징두리
          B(sg > 0 ? XA - 0.1 : -XA, sg > 0 ? XA : -XA + 0.1, 0, 1.2, rn[0], rn[1], 0xd9cdb2);
          B(sg > 0 ? XA - 0.16 : -XA, sg > 0 ? XA : -XA + 0.16, 1.2, 1.3, rn[0], rn[1], MARBLE);
        });
        // 벽기둥(칸 경계)
        var pz = [STUB1, S0 - 2 * PITCH, S0 - PITCH];
        for (var k = 1; k < NE; k++) pz.push(E0 + PITCH * k);
        pz.forEach(function (z) {
          var px = sg * (XA - 0.11);
          ctx.box({ x: px, y: 0, z: z, w: 0.22, h: 0.3, d: 0.62, color: MARBLE });
          ctx.box({ x: px, y: 0.3, z: z, w: 0.2, h: 5.2, d: 0.46, color: MARBLE });
          ctx.box({ x: px, y: 5.5, z: z, w: 0.26, h: 0.12, d: 0.62, color: MARBLE_D });
          ctx.box({ x: px, y: 5.62, z: z, w: 0.3, h: 0.16, d: 0.72, color: MARBLE });
        });
        // 대리석 판 장식(사문석·포르피리 상감)
        PANEL[sd].forEach(function (zc) {
          var px = sg * (XA - 0.04);
          ctx.box({ x: px, y: 1.55, z: zc, w: 0.05, h: 2.3, d: 1.5, color: GOLD_D });
          ctx.box(mb({ x: px - sg * 0.02, y: 1.62, z: zc, w: 0.05, h: 2.16, d: 1.36, color: MARBLE }));
          ctx.box({ x: px - sg * 0.04, y: 1.8, z: zc, w: 0.05, h: 0.5, d: 1.0, color: SERP, gloss: true });
          ctx.box({ x: px - sg * 0.04, y: 3.1, z: zc, w: 0.05, h: 0.5, d: 1.0, color: SERP, gloss: true });
          GLB.add(Geo.cyl(14, 1), PORPH, { x: px - sg * 0.04 + 0.02, y: 2.7, z: zc, rz: PI / 2, sx: 0.36, sy: 0.04, sz: 0.36, flat: true, vary: 0.02 });
        });
      });
      // 곁 제대(아이디큘라 + 그림). 그림 3종은 한 장의 질감에 나란히 → 한 메시(그리기 호출 1)
      var paintTex = mtex(576, 224, 4.5, 1.7, function (g) {
        [0, 1, 3].forEach(function (kind, ki) {
          g.save(); g.translate(ki * 1.5, 0); g.beginPath(); g.rect(0, 0, 1.5, 1.7); g.clip();
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
          } else { // 성모
            saint(g, 0.75, 1.5, 1.45, 0x2a4a8a, 0xa8432f);
            g.fillStyle = '#e8cfae'; g.beginPath(); g.arc(0.9, 0.95, 0.07, 0, 6.3); g.fill();
          }
          g.strokeStyle = css(GOLD_D, 1); g.lineWidth = 0.05; g.strokeRect(0.025, 0.025, 1.45, 1.65);
          g.restore();
        });
      });
      var PAINT = new TexSink();
      function sideAltar(sg, z, ki) {
        ctx.box({ x: sg * (XA - 0.45), y: 0, z: z, w: 0.8, h: 1.0, d: 2.3, color: MARBLE });
        ctx.box({ x: sg * (XA - 0.45), y: 1.0, z: z, w: 0.9, h: 0.08, d: 2.4, color: MARBLE_D });
        ctx.box({ x: sg * (XA - 0.8), y: 1.08, z: z, w: 0.04, h: 0.02, d: 2.0, color: 0xfffaf0 });
        ctx.box({ x: sg * (XA - 0.84), y: 0.1, z: z, w: 0.04, h: 0.85, d: 2.0, color: 0xfaf4e6 });
        ctx.box({ x: sg * (XA - 0.85), y: 0.8, z: z, w: 0.05, h: 0.12, d: 2.0, color: GOLD });
        [-0.75, 0.75].forEach(function (dz) { ctx.cyl({ x: sg * (XA - 0.62), y: 1.08, z: z + dz, r: 0.05, h: 0.4, seg: 6, color: GOLD }); flameG(sg * (XA - 0.62), 1.56, z + dz, 1); });
        // 아이디큘라
        [-1.02, 1.02].forEach(function (dz) { ctx.cyl({ x: sg * (XA - 0.22), y: 1.08, z: z + dz, r: 0.14, rTop: 0.12, h: 1.9, seg: 10, color: PORPH, flat: false }); ctx.box({ x: sg * (XA - 0.22), y: 2.98, z: z + dz, w: 0.34, h: 0.16, d: 0.34, color: GOLD }); });
        ctx.box({ x: sg * (XA - 0.2), y: 3.14, z: z, w: 0.36, h: 0.2, d: 2.5, color: MARBLE });
        solid.addTris([sg * (XA - 0.2), 3.34, z - 1.22, sg * (XA - 0.2), 3.34, z + 1.22, sg * (XA - 0.2), 3.86, z], MARBLE, [sg * 3, 4, z], { vary: 0.01 });
        ctx.box({ x: sg * (XA - 0.1), y: 1.15, z: z, w: 0.06, h: 1.9, d: 1.7, color: GOLD_D });
        ctx.box({ x: sg * (XA - 0.14), y: 1.2, z: z, w: 0.04, h: 1.8, d: 1.6, color: GOLD, vary: 0 });
        var px = sg * (XA - 0.17), u0 = ki / 3, u1 = (ki + 1) / 3, zl = z - sg * 0.7, zr = z + sg * 0.7;   // 실내에서 볼 때 왼쪽 → 오른쪽
        PAINT.quad([px, 1.3, zl], [px, 1.3, zr], [px, 2.9, zr], [px, 2.9, zl], [u0, 0], [u1, 0], [u1, 1], [u0, 1], [-sg, 0, 0]);
        ctx.addCollider({ x0: sg > 0 ? XA - 1.0 : -XA, x1: sg > 0 ? XA : -XA + 1.0, z0: z - 1.3, z1: z + 1.3 });
      }
      ALT_R.forEach(function (k, i) { sideAltar(1, eBayC(k), i); });
      ALT_L.forEach(function (k, i) { sideAltar(-1, eBayC(k), 2 - i); });
      var paintMat = texMat(paintTex, {}); if (paintMat.roughness !== undefined) paintMat.roughness = 0.55;
      PAINT.mesh(paintMat);
      // 오른쪽 측랑 입구 쪽: 세례당 문(닫힘)
      (function () {
        var z = eBayC(DOOR_R);
        ctx.box({ x: XA - 0.14, y: 0, z: z, w: 0.14, h: 3.6, d: 2.0, color: WOOD_D });
        ctx.box({ x: XA - 0.2, y: 0.4, z: z, w: 0.1, h: 1.2, d: 1.6, color: 0x6b4a30 }); ctx.box({ x: XA - 0.2, y: 1.9, z: z, w: 0.1, h: 1.4, d: 1.6, color: 0x6b4a30 });
        ctx.box({ x: XA - 0.12, y: 3.6, z: z, w: 0.2, h: 0.2, d: 2.4, color: MARBLE });
      })();
      // 왼쪽 측랑: 프란치스코 교황 무덤(2025) — 파올리나 경당 입구 옆의 낮은 벽감. 흰 대리석 틀 + 십자가 부조 + 바닥의 밝은 평석(글자는 넣지 않는다)
      (function () {
        var z = eBayC(0), xw = -XA;
        ctx.box(mb({ x: xw + 0.09, y: 0, z: z - 0.86, w: 0.18, h: 2.3, d: 0.14, color: MARBLE }));
        ctx.box(mb({ x: xw + 0.09, y: 0, z: z + 0.86, w: 0.18, h: 2.3, d: 0.14, color: MARBLE }));
        ctx.box(mb({ x: xw + 0.11, y: 2.3, z: z, w: 0.22, h: 0.16, d: 1.96, color: MARBLE }));
        ctx.box({ x: xw + 0.03, y: 0, z: z, w: 0.05, h: 2.3, d: 1.6, color: 0xefe7d6, vary: 0.01 });        // 벽감 안쪽 판
        ctx.box({ x: xw + 0.07, y: 1.05, z: z, w: 0.04, h: 0.62, d: 0.07, color: 0xb9b6ae, metal: true });   // 십자가(은빛)
        ctx.box({ x: xw + 0.07, y: 1.42, z: z, w: 0.04, h: 0.07, d: 0.4, color: 0xb9b6ae, metal: true });
        ctx.box(mb({ x: xw + 0.75, y: 0, z: z, w: 1.1, h: 0.05, d: 1.5, color: 0xe9e6dd }));                  // 평석
        ctx.box({ x: xw + 0.75, y: 0.05, z: z, w: 0.86, h: 0.012, d: 1.26, color: 0xdedad0, vary: 0 });
      })();

      // 측랑 끝벽(개선문 쪽): 측랑 머리는 막힌 벽이고 제대가 있다
      [-1, 1].forEach(function (s) {
        B(s < 0 ? -XA : XN, s < 0 ? -XN : XA, 0, Y_TOP, Z_A - 0.5, Z_A, 0xd8c8a2);
        // 측랑 끝 그림(제대 위)
        ctx.box({ x: s * 9.3, y: 1.6, z: Z_A + 0.12, w: 2.6, h: 3.4, d: 0.1, color: GOLD });
        ctx.box({ x: s * 9.3, y: 1.8, z: Z_A + 0.19, w: 2.2, h: 3.0, d: 0.06, color: s < 0 ? LAPIS : 0x8a3a2a });
        ctx.box({ x: s * 9.3, y: 0, z: Z_A + 0.6, w: 3.0, h: 1.0, d: 1.0, color: MARBLE });
        ctx.addCollider({ x0: s * 9.3 - 1.6, x1: s * 9.3 + 1.6, z0: Z_A, z1: Z_A + 1.2 });
      });

      // ----- 큰 아치 통로: 신랑 벽의 아치에서 측랑을 가로질러 대경당 입구까지 하나의 반원 통 궁륭(기공 Y_ENT, 반지름 AR_R) -----
      // 통로 양옆은 측랑을 가로지르는 벽체(쌍기둥 뒤, 두께 PZ0…TZ0)이고, 측랑 길은 그 벽체의 아치(폭 4.4, 정점 6.2)로 지나간다.
      var TUN_C = 0xe9e1cf, AO_C = (X_IN + XA) / 2, AO_W = 4.4, AO_S = 4.0;
      [-1, 1].forEach(function (s) {
        var tn = low ? 8 : 12, k;
        for (k = 0; k < tn; k++) {
          var a0 = PI * k / tn, a1 = PI * (k + 1) / tn;
          var za = ARZC - AR_R * Math.cos(a0), zb = ARZC - AR_R * Math.cos(a1), ya = Y_ENT + AR_R * Math.sin(a0), yb = Y_ENT + AR_R * Math.sin(a1);
          solid.addQuad([s * XN, ya, za], [s * X_CH, ya, za], [s * X_CH, yb, zb], [s * XN, yb, zb], ctx.shade(TUN_C, 0.93 + 0.07 * Math.sin((a0 + a1) / 2)), [s * 9, 0, ARZC], { vary: 0.01 });
        }
        [XN + 0.95, AO_C, X_CH - 0.3].forEach(function (ux) {      // 통 궁륭의 금 띠(횡단 아치)
          ctx.arch({ x: s * ux, y: Y_ENT, z: ARZC, span: 2 * (AR_R - 0.12), rise: AR_R - 0.12, axis: 'z', t: 0.14, depth: 0.5, color: GOLD, seg: 12 });
        });
        var xr = s > 0 ? [X_IN, X_CH] : [-X_CH, -X_IN], xo = s > 0 ? [X_IN, XA] : [-XA, -X_IN];
        function pierFace(z, nz, rng, y1, t) {
          var F = frameOf(0, z, 0, nz), u0 = F.ux > 0 ? rng[0] : -rng[1], u1 = F.ux > 0 ? rng[1] : -rng[0];
          openWall({ F: F, u0: u0, u1: u1, y0: 0, y1: y1, t: t, holes: [{ u: F.ux * s * AO_C, w: AO_W, yb: 0, h: AO_S, top: 'round', rise: AO_W / 2, seg: low ? 8 : 12 }], color: 0xe6dfcd, rcolor: 0xe0d8c4, vary: 0.012 });
          ctx.arch(mb({ x: s * AO_C, y: AO_S, z: z + nz * 0.05, span: AO_W, rise: AO_W / 2, axis: 'x', t: 0.26, depth: 0.1, color: MARBLE, seg: 12 }));
        }
        pierFace(TZ0, 1, xr, Y_ENT, TZ0 - PZ0); pierFace(TZ1, -1, xr, Y_ENT, PZ1 - TZ1);     // 통로 쪽 면(+ 아치 안쪽 면)
        pierFace(PZ0, -1, xo, AW_TOP, 0.02); pierFace(PZ1, 1, xo, AW_TOP, 0.02);             // 측랑 쪽 면
        [[PZ0, TZ0], [TZ1, PZ1]].forEach(function (zr, zi) {
          // 벽체의 신랑 쪽 마구리(쌍기둥 사이로 보인다) + 통로 기공선의 받침 몰딩 + 걸레받이
          solid.addQuad([s * X_IN, 0, zr[0]], [s * X_IN, 0, zr[1]], [s * X_IN, Y_ENT, zr[1]], [s * X_IN, Y_ENT, zr[0]], 0xe6dfcd, [0, 3, (zr[0] + zr[1]) / 2], { vary: 0.012 });
          var zf = zi === 0 ? TZ0 : TZ1, dn = zi === 0 ? 1 : -1;
          ctx.box(mb({ x: s * (X_IN + X_CH) / 2, y: Y_ENT - 0.26, z: zf + dn * 0.07, w: X_CH - X_IN, h: 0.26, d: 0.14, color: MARBLE }));
          ctx.box({ x: s * (X_IN + X_CH) / 2, y: Y_ENT - 0.34, z: zf + dn * 0.05, w: X_CH - X_IN, h: 0.08, d: 0.1, color: GOLD });
          ctx.addCollider({ x0: s > 0 ? XC + 0.2 : -(AO_C - AO_W / 2), x1: s > 0 ? AO_C - AO_W / 2 : -XC - 0.2, z0: zr[0], z1: zr[1] });
          ctx.addCollider({ x0: s > 0 ? AO_C + AO_W / 2 : -X_CH, x1: s > 0 ? X_CH : -(AO_C + AO_W / 2), z0: zr[0], z1: zr[1] });
        });
      });

      mark('aisles');
      // =====================================================================
      // 대경당(시스티나 +x / 파올리나 −x): 그리스 십자 + 모서리를 딴 가운데 칸 + 펜던티브 + 드럼 + 돔. 걸어 들어갈 수 있다.
      // 르타루이 도면: 각 약 21 × 21~24 m(가운데 칸 12.7 m) → 앱 17 × 17(가운데 10.2, 팔 폭 7.0·깊이 3.4). 벽·천장·바닥 그림은 아틀라스 한 장 → 메시 1.
      // =====================================================================
      var CHS = 5.1, ARW = 3.5, ARD = 3.4, YS = 7.6, RING = YS + ARW, DR_H = 2.6, DM_R = 5.0, DM_RISE = 4.7;
      var GIALLO = 0xc39a52, VERDE = 0x2c4c3c, ROSSO = 0x7c372c, BIANCO = 0xddd5c2, AFRIC = 0x43363c;   // 지알로 안티코 / 베르데 안티코 / 로소 안티코 / 흰 대리석 / 아프리카노
      var AT = { W: 2048, H: 1024 };
      var RG = {
        side: { x: 0, y: 0, w: 340, h: 760, mw: 3.4, mh: 7.6 }, end: { x: 346, y: 0, w: 700, h: 760, mw: 7.0, mh: 7.6 }, cham: { x: 1052, y: 0, w: 226, h: 760, mw: 2.26, mh: 7.6 },
        dome: { x: 1290, y: 0, w: 512, h: 512, mw: 1, mh: 1 }, pend: { x: 1808, y: 0, w: 236, h: 256, mw: 1, mh: 1 }, drum: { x: 1808, y: 262, w: 236, h: 156, mw: 3.93, mh: 2.6 },
        altp: { x: 1808, y: 424, w: 236, h: 330, mw: 2.0, mh: 2.8 }, floor: { x: 1290, y: 518, w: 250, h: 250, mw: 3.4, mh: 3.4 }, rel: { x: 1546, y: 518, w: 250, h: 250, mw: 2.0, mh: 2.0 },
        vault: { x: 0, y: 766, w: 780, h: 256, mw: 11.0, mh: 3.4 }, lun: { x: 786, y: 766, w: 500, h: 256, mw: 7.0, mh: 3.5 }
      };
      function ruv(R, mx, my) { return [(R.x + 1 + (R.w - 2) * mx / R.mw) / AT.W, 1 - (R.y + 1 + (R.h - 2) * (1 - my / R.mh)) / AT.H]; }   // my = 아래에서부터
      var chTex = ctx.tex.custom(AT.W, AT.H, function (g) {
        g.fillStyle = css(BIANCO, 1); g.fillRect(0, 0, AT.W, AT.H);
        function reg(R, fn) { g.save(); g.beginPath(); g.rect(R.x, R.y, R.w, R.h); g.clip(); g.translate(R.x, R.y); g.scale(R.w / R.mw, R.h / R.mh); fn(R.mw, R.mh); g.restore(); }
        function marb(x, y, w, h, c, k) {   // 대리석 판: 바탕 + 결
          g.fillStyle = css(c, 1); g.fillRect(x, y, w, h);
          g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
          var n = Math.max(3, Math.round(w * h * (k || 3)));
          for (var i = 0; i < n; i++) {
            if (i % 3 === 0) { g.fillStyle = css(c, rnd() < 0.5 ? 0.86 : 1.1); g.globalAlpha = 0.22; g.beginPath(); g.ellipse(x + rnd() * w, y + rnd() * h, 0.12 + rnd() * 0.3, 0.08 + rnd() * 0.2, rnd() * 3, 0, 6.3); g.fill(); }
            g.strokeStyle = css(c, rnd() < 0.55 ? 0.62 + rnd() * 0.16 : 1.18 + rnd() * 0.2); g.globalAlpha = 0.4 + rnd() * 0.45; g.lineWidth = 0.012 + rnd() * 0.04;
            var px = x + rnd() * w, py = y + rnd() * h; g.beginPath(); g.moveTo(px, py);
            for (var q = 0; q < 4; q++) { px += (rnd() - 0.5) * 0.7; py += (rnd() - 0.3) * 0.6; g.lineTo(px, py); }
            g.stroke();
          }
          g.globalAlpha = 1; g.restore();
        }
        function slab(x, y, w, h, c) {   // 흰 틀 + 금 줄 + 색 대리석 판
          marb(x, y, w, h, BIANCO, 2); marb(x + 0.09, y + 0.09, w - 0.18, h - 0.18, c, 4);
          g.strokeStyle = css(GOLD, 1); g.lineWidth = 0.035; g.strokeRect(x + 0.09, y + 0.09, w - 0.18, h - 0.18);
          g.strokeStyle = css(ctx.shade(BIANCO, 0.8), 1); g.lineWidth = 0.015; g.strokeRect(x, y, w, h);
        }
        function entab(w) {   // 위 1.3 m: 아키트레이브 + 프리즈(포르피리 바탕에 금 덩굴) + 코니스
          marb(0, 0, w, 1.3, BIANCO, 1.5);
          g.fillStyle = css(0x5a2030, 1); g.fillRect(0, 0.4, w, 0.6);
          g.strokeStyle = css(GOLD_L, 1); g.lineWidth = 0.035;
          for (var x = 0.12; x < w; x += 0.55) { g.beginPath(); g.arc(x + 0.14, 0.7, 0.14, 0.4, 5.6); g.stroke(); g.beginPath(); g.arc(x + 0.37, 0.7, 0.07, 3.4, 8.2); g.stroke(); }
          g.fillStyle = css(GOLD, 1); g.fillRect(0, 0.36, w, 0.04); g.fillRect(0, 1.0, w, 0.04); g.fillRect(0, 1.24, w, 0.03);
          g.fillStyle = css(GOLD_D, 1); for (x = 0.05; x < w; x += 0.2) g.fillRect(x, 0.2, 0.1, 0.1);
        }
        function plinth(w) { marb(0, 7.1, w, 0.5, AFRIC, 3); g.fillStyle = css(BIANCO, 1); g.fillRect(0, 7.05, w, 0.06); }
        function fresco(x, y, w, h, k) {
          var gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, css([0x39608f, 0x5a4a7a, 0x2f5a6a][k % 3], 1)); gr.addColorStop(0.7, css([0xd9b67a, 0xe0b08a, 0xcfc08a][k % 3], 1)); gr.addColorStop(1, css(0x6a5a3a, 1));
          g.fillStyle = gr; g.fillRect(x, y, w, h);
          g.fillStyle = 'rgba(255,240,200,0.5)'; g.beginPath(); g.arc(x + w / 2, y + h * 0.22, Math.min(w, h) * 0.2, 0, 6.3); g.fill();
          var n = Math.max(2, Math.round(w / 0.75)), fh = Math.min(h * 0.62, w * 0.9);
          for (var i = 0; i < n; i++) saint(g, x + w * (i + 0.5) / n, y + h * 0.97, fh * (0.85 + 0.15 * ((i + k) % 2)), PALS[(i * 2 + k) % PALS.length], PALS[(i + k + 3) % PALS.length]);
          g.fillStyle = 'rgba(120,96,70,0.26)'; g.fillRect(x, y, w, h);
        }
        // 팔 옆벽(3.4): 징두리 판 2 + 금테 프레스코 + 위 알라바스터 판
        reg(RG.side, function (w) {
          marb(0, 0, w, 7.6, BIANCO, 1.2); entab(w); plinth(w);
          slab(0.42, 5.6, 1.2, 1.4, VERDE); slab(1.78, 5.6, 1.2, 1.4, ROSSO);
          g.fillStyle = css(GOLD, 1); g.fillRect(0.5, 2.45, 2.4, 2.95); g.fillStyle = css(GOLD_D, 1); g.fillRect(0.56, 2.51, 2.28, 2.83); fresco(0.62, 2.57, 2.16, 2.71, 1);
          slab(0.42, 1.42, 2.56, 0.86, GIALLO);
          g.fillStyle = css(PORPH, 1); g.beginPath(); g.ellipse(1.7, 1.85, 0.5, 0.24, 0, 0, 6.3); g.fill(); g.strokeStyle = css(GOLD, 1); g.lineWidth = 0.03; g.stroke();
        });
        // 팔 끝벽(7.0): 가운데는 제단·무덤이 가린다
        reg(RG.end, function (w) {
          marb(0, 0, w, 7.6, BIANCO, 1.2); entab(w); plinth(w);
          [0.3, 5.6].forEach(function (x, i) { slab(x, 5.6, 1.1, 1.4, i ? VERDE : ROSSO); slab(x, 2.0, 1.1, 3.45, GIALLO); slab(x, 1.42, 1.1, 0.5, VERDE); });
          marb(1.55, 1.42, 3.9, 5.6, 0xd8c9a8, 2);
        });
        // 모서리 면(2.26): 벽감 + 흰 대리석상 + 포르피리 판
        reg(RG.cham, function (w) {
          marb(0, 0, w, 7.6, BIANCO, 1.2); entab(w); plinth(w);
          var nx = 0.48, nw = 1.3, nb = 6.7, nt = 3.75;
          g.fillStyle = css(GIALLO, 0.92); g.fillRect(nx - 0.13, nt - 0.8, nw + 0.26, nb - nt + 0.9);
          var gr = g.createLinearGradient(nx, 0, nx + nw, 0); gr.addColorStop(0, '#3d342c'); gr.addColorStop(0.5, '#75695b'); gr.addColorStop(1, '#3d342c');
          g.fillStyle = gr; g.beginPath(); g.moveTo(nx, nb); g.lineTo(nx, nt); g.arc(nx + nw / 2, nt, nw / 2, PI, 0); g.lineTo(nx + nw, nb); g.closePath(); g.fill();
          saint(g, w / 2, nb - 0.04, 3.0, 0xf1ece0, 0xdcd5c6);
          slab(0.3, 1.42, w - 0.6, 1.2, PORPH);
          g.fillStyle = css(GOLD_L, 1); g.beginPath(); g.ellipse(w / 2, 2.02, 0.42, 0.3, 0, 0, 6.3); g.fill(); g.fillStyle = css(0x39608f, 1); g.beginPath(); g.ellipse(w / 2, 2.02, 0.34, 0.23, 0, 0, 6.3); g.fill();
        });
        // 펜던티브: 금 테두리 + 푸른 바탕의 예언자
        reg(RG.pend, function () {
          var gr = g.createLinearGradient(0, 0, 0, 1); gr.addColorStop(0, css(0x4a6fa8, 1)); gr.addColorStop(1, css(0x2a4a7a, 1)); g.fillStyle = gr; g.fillRect(0, 0, 1, 1);
          g.fillStyle = 'rgba(255,236,180,0.55)'; g.beginPath(); g.arc(0.5, 0.36, 0.26, 0, 6.3); g.fill();
          for (var i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,250,235,0.4)'; g.beginPath(); g.ellipse(0.15 + rnd() * 0.7, 0.6 + rnd() * 0.3, 0.14, 0.05, 0, 0, 6.3); g.fill(); }
          saint(g, 0.5, 0.86, 0.62, 0xb5533c, 0xd8b23a);
          g.fillStyle = css(0xf4efe2, 1); g.fillRect(0.6, 0.55, 0.16, 0.11);
          g.strokeStyle = css(GOLD, 1); g.lineWidth = 0.09; g.strokeRect(0, 0, 1, 1); g.strokeStyle = css(GOLD_D, 1); g.lineWidth = 0.02; g.strokeRect(0.06, 0.06, 0.88, 0.88);
        });
        // 드럼 한 칸(3.93 × 2.6): 쌍 벽기둥 + 창 틀
        reg(RG.drum, function (w, h) {
          marb(0, 0, w, h, 0xeadfc8, 1);
          [0.1, 0.56, w - 0.94, w - 0.48].forEach(function (x) { marb(x, 0.14, 0.38, h - 0.3, BIANCO, 2); g.fillStyle = css(GOLD, 1); g.fillRect(x - 0.03, 0.14, 0.44, 0.2); g.fillRect(x - 0.03, h - 0.3, 0.44, 0.12); });
          var cx = w / 2;
          g.fillStyle = css(BIANCO, 0.94); g.beginPath(); g.moveTo(cx - 0.72, h - 0.22); g.lineTo(cx - 0.72, 0.95); g.arc(cx, 0.95, 0.72, PI, 0); g.lineTo(cx + 0.72, h - 0.22); g.closePath(); g.fill();
          g.fillStyle = '#2b2620'; g.beginPath(); g.moveTo(cx - 0.52, h - 0.4); g.lineTo(cx - 0.52, 0.95); g.arc(cx, 0.95, 0.52, PI, 0); g.lineTo(cx + 0.52, h - 0.4); g.closePath(); g.fill();
          g.fillStyle = css(GOLD, 1); g.fillRect(0, 0, w, 0.12); g.fillRect(0, h - 0.16, w, 0.16);
        });
        // 돔(극좌표: 가운데 = 정점): 영광의 빛 → 하늘 → 구름 → 둘레에 선 성인들
        reg(RG.dome, function () {
          var gr = g.createRadialGradient(0.5, 0.5, 0.02, 0.5, 0.5, 0.5); gr.addColorStop(0, '#fff3c4'); gr.addColorStop(0.28, '#f0cf7a'); gr.addColorStop(0.55, '#8fb0d8'); gr.addColorStop(0.88, '#4a6fa8'); gr.addColorStop(1, '#3a5a8a');
          g.fillStyle = gr; g.fillRect(0, 0, 1, 1);
          var i, a, r;
          for (i = 0; i < 46; i++) { a = rnd() * 6.283; r = 0.17 + rnd() * 0.2; g.fillStyle = 'rgba(255,250,235,0.34)'; g.beginPath(); g.ellipse(0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r, 0.055, 0.022, a + PI / 2, 0, 6.3); g.fill(); }
          for (i = 0; i < 16; i++) {
            a = i / 16 * 2 * PI; g.save(); g.translate(0.5 + Math.cos(a) * 0.462, 0.5 + Math.sin(a) * 0.462); g.rotate(a - PI / 2);
            saint(g, 0, 0, 0.16, PALS[i % PALS.length], PALS[(i * 3 + 2) % PALS.length]); g.restore();
          }
          for (i = 0; i < 8; i++) {
            a = (i + 0.5) / 8 * 2 * PI; g.save(); g.translate(0.5 + Math.cos(a) * 0.2, 0.5 + Math.sin(a) * 0.2); g.rotate(a - PI / 2);
            saint(g, 0, 0, 0.085, 0xf4efe2, 0xe9c8c0); g.restore();
          }
          g.strokeStyle = css(GOLD, 1); g.lineWidth = 0.02; g.beginPath(); g.arc(0.5, 0.5, 0.488, 0, 6.3); g.stroke();
          g.strokeStyle = css(GOLD_L, 1); g.lineWidth = 0.012; g.beginPath(); g.arc(0.5, 0.5, 0.085, 0, 6.3); g.stroke();
        });
        // 통 궁륭(호 11.0 × 깊이 3.4): 금박 스투코 칸 + 프레스코 칸
        reg(RG.vault, function (w, h) {
          marb(0, 0, w, h, 0xf0e8d6, 0.6);
          for (var i = 0; i < 5; i++) {
            var px = 0.22 + i * 2.14, pw = 2.0;
            g.fillStyle = css(GOLD, 1); g.fillRect(px, 0.3, pw, h - 0.6);
            if (i % 2) fresco(px + 0.1, 0.4, pw - 0.2, h - 0.8, i);
            else {
              g.fillStyle = css(0x2f4f86, 1); g.beginPath(); g.ellipse(px + pw / 2, h / 2, pw / 2 - 0.2, h / 2 - 0.55, 0, 0, 6.3); g.fill();
              g.fillStyle = css(GOLD_L, 1); for (var p = 0; p < 8; p++) { var a = p * PI / 4; g.beginPath(); g.ellipse(px + pw / 2 + Math.cos(a) * 0.32, h / 2 + Math.sin(a) * 0.32, 0.2, 0.08, a, 0, 6.3); g.fill(); }
              g.beginPath(); g.arc(px + pw / 2, h / 2, 0.16, 0, 6.3); g.fill();
            }
          }
          g.fillStyle = css(GOLD_D, 1); g.fillRect(0, 0, w, 0.14); g.fillRect(0, h - 0.14, w, 0.14);
        });
        // 루네트(반원 7.0 × 3.5): 프레스코 + 가운데 반원 창 틀
        reg(RG.lun, function (w, h) {
          g.fillStyle = css(0xf0e8d6, 1); g.fillRect(0, 0, w, h);
          g.save(); g.beginPath(); g.arc(3.5, 3.5, 3.36, PI, 0); g.closePath(); g.clip();
          var gr = g.createLinearGradient(0, 0, 0, 3.5); gr.addColorStop(0, css(0x39608f, 1)); gr.addColorStop(1, css(0xd9b67a, 1)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
          [0.75, 1.5, 5.5, 6.25].forEach(function (x, i) { saint(g, x, 3.42, i % 3 === 0 ? 1.15 : 1.55, PALS[(i + 2) % PALS.length], PALS[(i * 2 + 5) % PALS.length]); });
          g.restore();
          g.strokeStyle = css(GOLD, 1); g.lineWidth = 0.12; g.beginPath(); g.arc(3.5, 3.5, 3.4, PI, 0); g.stroke();
          g.fillStyle = css(BIANCO, 1); g.beginPath(); g.arc(3.5, 3.5, 1.86, PI, 0); g.closePath(); g.fill();
          g.fillStyle = '#2b2620'; g.beginPath(); g.arc(3.5, 3.5, 1.6, PI, 0); g.closePath(); g.fill();
        });
        // 제단화(2.0 × 2.8) · 흰 대리석 부조(2.0 × 2.0)
        reg(RG.altp, function (w, h) { fresco(0, 0, w, h, 2); g.strokeStyle = css(GOLD_D, 1); g.lineWidth = 0.08; g.strokeRect(0, 0, w, h); });
        reg(RG.rel, function (w) {
          marb(0, 0, w, w, 0xe9e4d8, 2);
          [0.4, 1.0, 1.6].forEach(function (x, i) { saint(g, x, 1.88, i === 1 ? 1.6 : 1.35, 0xd6cfbf, 0xf6f2e8); });
          g.strokeStyle = css(0xbfb7a4, 1); g.lineWidth = 0.07; g.strokeRect(0.03, 0.03, w - 0.06, w - 0.06);
        });
        // 바닥 한 칸(3.4): 흰 대리석 판 + 가는 테두리 + 마름모 띠 + 가운데 작은 포르피리 원판(차분한 오푸스 섹틸레)
        reg(RG.floor, function (w) {
          marb(0, 0, w, w, 0xd6cebb, 2.5);
          g.fillStyle = css(0x8f8a80, 1); g.fillRect(0, 0, w, 0.04); g.fillRect(0, w - 0.04, w, 0.04); g.fillRect(0, 0, 0.04, w); g.fillRect(w - 0.04, 0, 0.04, w);
          g.strokeStyle = css(0xb9ad92, 1); g.lineWidth = 0.1; g.beginPath(); g.moveTo(w / 2, 0.14); g.lineTo(w - 0.14, w / 2); g.lineTo(w / 2, w - 0.14); g.lineTo(0.14, w / 2); g.closePath(); g.stroke();
          g.strokeStyle = css(VERDE, 1); g.lineWidth = 0.035; g.stroke();
          [[0.5, 0x8f8a80], [0.46, GIALLO], [0.36, PORPH], [0.12, 0xcbbf9f]].forEach(function (d) { g.fillStyle = css(d[1], 1); g.beginPath(); g.arc(w / 2, w / 2, d[0], 0, 6.3); g.fill(); });
          [[0, 0], [w, 0], [0, w], [w, w]].forEach(function (c) { g.fillStyle = css(0x8f8a80, 1); g.beginPath(); g.arc(c[0], c[1], 0.3, 0, 6.3); g.fill(); g.fillStyle = css(ROSSO, 1); g.beginPath(); g.arc(c[0], c[1], 0.25, 0, 6.3); g.fill(); });
        });
      });
      chTex.wrapS = chTex.wrapT = T.ClampToEdgeWrapping; chTex.anisotropy = 8;
      var CS = new TexSink();
      // 성화 '로마 백성의 구원(Salus Populi Romani)': 위키미디어 공용의 자유 이용 사진(art_maggiore.js, docs/church/licenses/maggiore.md)을 이 성당에 들어올 때 읽는다.
      // 읽기 전·실패 때는 절차 생성 성화(금 바탕의 성모자)가 그 자리에 있다.
      var iconTex = mtex(256, 384, 1, 1.5, function (g) {
        goldFill(g, 0, 0, 1, 1.5, 0.03, GOLD_L, GOLD_D);
        g.fillStyle = css(0x1c2a52, 1); g.beginPath(); g.moveTo(0.42, 0.2); g.bezierCurveTo(0.78, 0.36, 0.84, 1.0, 0.8, 1.5); g.lineTo(0.16, 1.5); g.bezierCurveTo(0.1, 1.0, 0.12, 0.42, 0.42, 0.2); g.fill();
        g.fillStyle = '#e6c49a'; g.beginPath(); g.ellipse(0.44, 0.46, 0.09, 0.12, 0, 0, 6.3); g.fill(); g.beginPath(); g.arc(0.68, 0.72, 0.065, 0, 6.3); g.fill();
        g.fillStyle = css(0xb5772c, 1); g.beginPath(); g.moveTo(0.58, 0.8); g.lineTo(0.8, 0.82); g.lineTo(0.78, 1.3); g.lineTo(0.5, 1.3); g.closePath(); g.fill();
        g.strokeStyle = css(GOLD_D, 1); g.lineWidth = 0.02; g.beginPath(); g.arc(0.44, 0.44, 0.2, 0, 6.3); g.stroke(); g.beginPath(); g.arc(0.68, 0.72, 0.11, 0, 6.3); g.stroke();
      });
      var iconMat = emissiveMat(iconTex, 0.42, {});
      (function () {
        if (typeof document === 'undefined' || !document.head || !document.head.appendChild) return;
        function apply() {
          var a = window.ChurchArt && window.ChurchArt.maggiore && window.ChurchArt.maggiore.salus; if (!a) return;
          var im = new Image();
          im.onload = function () { var tx = new T.Texture(im); tx.encoding = T.sRGBEncoding; tx.anisotropy = 8; tx.needsUpdate = true; iconMat.map = tx; if (iconMat.emissiveMap !== undefined) iconMat.emissiveMap = tx; iconMat.needsUpdate = true; };
          im.src = a.src;
        }
        if (window.ChurchArt && window.ChurchArt.maggiore) { apply(); return; }
        var sc = document.createElement('script'); sc.src = 'art_maggiore.js'; sc.async = true; sc.onload = apply; document.head.appendChild(sc);
      })();
      var ICON = new TexSink();

      function chapel(sg, name) {
        var cz = ARZC, D_E = CHX - X_CH - CHS, pau = name === 'paolina';
        function W(a, b) { return [sg * (CHX + a), cz + b]; }                 // 경당 국소 좌표(a 바깥쪽 +, b = z 차) → 월드 x, z
        function V(a, y, b) { return [sg * (CHX + a), y, cz + b]; }
        function nrm(A, Bq, H) { var dx = Bq[0] - A[0], dz = Bq[2] - A[2], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l; if (nx * (H[0] - A[0]) + nz * (H[2] - A[2]) < 0) { nx = -nx; nz = -nz; } return [nx, 0, nz]; }
        function wallQ(p0, p1, y0, y1, R, h) {   // 평면 선분 p0→p1(국소), 영역 R 전체. 법선은 h(국소) 쪽
          var A = V(p0[0], y0, p0[1]), Bq = V(p1[0], y0, p1[1]), C = V(p1[0], y1, p1[1]), D = V(p0[0], y1, p0[1]);
          CS.quad(A, Bq, C, D, ruv(R, 0, 0), ruv(R, R.mw, 0), ruv(R, R.mw, R.mh), ruv(R, 0, R.mh), nrm(A, Bq, V(h[0], 0, h[1])));
        }
        function box(p0, p1, y0, y1, c, o) {     // 국소 두 모서리 → 월드 AABB 상자
          var a = W(p0[0], p0[1]), b = W(p1[0], p1[1]), q = { x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: y0, y1: y1, z0: Math.min(a[1], b[1]), z1: Math.max(a[1], b[1]), color: c };
          if (o === 'm') mb(q); else if (o === 'g') q.gloss = true; else if (o === 'x') q.metal = true;
          ctx.boxAABB(q);
        }
        function col(p, y, r, rt, h, c, batch, seg) { var w = W(p[0], p[1]); cylO(w[0], y, w[1], r, rt, h, seg || 10, c, false, 0.02, batch || GLB); }
        function blockLocal(p0, p1) { var a = W(p0[0], p0[1]), b = W(p1[0], p1[1]); ctx.addCollider({ x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), z0: Math.min(a[1], b[1]), z1: Math.max(a[1], b[1]) }); }
        var k, FAR = CHS + ARD;
        // 가벼운 인물상(정점 약 300): 옷(원뿔대 2) + 머리 + 선택(날개·삼중관·축복하는 팔). f = 바라보는 쪽 단위 벡터(월드 x,z)
        function fig(x, y, z, h, f, c, batch, o) {
          o = o || {};
          cylO(x, y, z, h * 0.2, h * 0.09, h * 0.74, 8, c, false, 0.03, batch);
          cylO(x - f[0] * h * 0.05, y + h * 0.3, z - f[1] * h * 0.05, h * 0.19, h * 0.11, h * 0.45, 8, ctx.shade(c, 0.9), false, 0.03, batch);
          batch.add(Geo.sph(6, 4), o.head === undefined ? c : o.head, { x: x, y: y + h * 0.84, z: z, sx: h * 0.1, sy: h * 0.11, sz: h * 0.1, flat: false, vary: 0.02 });
          if (o.wings) [-1, 1].forEach(function (e) { batch.addBeam([x - f[0] * h * 0.1 + e * f[1] * h * 0.1, y + h * 0.5, z - f[1] * h * 0.1 - e * f[0] * h * 0.1], [x - f[0] * h * 0.16 + e * f[1] * h * 0.36, y + h * 0.98, z - f[1] * h * 0.16 - e * f[0] * h * 0.36], h * 0.2, h * 0.05, ctx.shade(c, 1.06)); });
          if (o.tiara) cylO(x, y + h * 0.93, z, h * 0.075, h * 0.015, h * 0.16, 6, c, false, 0.02, batch);
          if (o.arm) batch.addBeam([x + f[0] * h * 0.08 + f[1] * h * 0.12, y + h * 0.62, z + f[1] * h * 0.08 - f[0] * h * 0.12], [x + f[0] * h * 0.3 + f[1] * h * 0.16, y + h * 0.8, z + f[1] * h * 0.3 - f[0] * h * 0.16], h * 0.07, h * 0.07, c);
        }

        // ----- 바닥 -----
        function floorQ(a0, a1, b0, b1) { CS.quad(V(a0, 0, b0), V(a1, 0, b0), V(a1, 0, b1), V(a0, 0, b1), ruv(RG.floor, 0, 0), ruv(RG.floor, 3.4, 0), ruv(RG.floor, 3.4, 3.4), ruv(RG.floor, 0, 3.4), [0, 1, 0]); }
        for (var fi = 0; fi < 3; fi++) for (var fj = 0; fj < 3; fj++) floorQ(-CHS + 3.4 * fi, -CHS + 3.4 * (fi + 1), -CHS + 3.4 * fj, -CHS + 3.4 * (fj + 1));
        [-1, 0].forEach(function (h) {
          floorQ(CHS, FAR, h * ARW, (h + 1) * ARW); floorQ(-CHS - D_E, -CHS, h * ARW, (h + 1) * ARW);
          floorQ(h * ARW, (h + 1) * ARW, CHS, FAR); floorQ(h * ARW, (h + 1) * ARW, -FAR, -CHS);
        });

        // ----- 네 팔: 옆벽·끝벽·통 궁륭·루네트 -----
        var ARMS = [{ d: [1, 0], D: ARD, kind: 'far' }, { d: [-1, 0], D: D_E, kind: 'ent' }, { d: [0, 1], D: ARD, kind: 'side' }, { d: [0, -1], D: ARD, kind: 'side' }];
        ARMS.forEach(function (A) {
          var d = A.d, p = [-d[1], d[0]], D = A.D, E = CHS + D;
          function L(al, lat) { return [d[0] * al + p[0] * lat, d[1] * al + p[1] * lat]; }
          A.L = L; A.E = E;
          [-1, 1].forEach(function (e) {
            wallQ(L(CHS, e * ARW), L(E, e * ARW), 0, YS, RG.side, L(CHS + D / 2, 0));
            // 팔 어귀의 벽기둥(대리석 몸 + 금 주두 + 엔타블러처 토막)과 코니스
            box(L(CHS, e * ARW), L(CHS + 0.56, e * (ARW - 0.24)), 0, 0.5, MARBLE_D, 'm');
            box(L(CHS + 0.04, e * ARW), L(CHS + 0.52, e * (ARW - 0.2)), 0.5, 6.1, MARBLE, 'm');
            box(L(CHS - 0.02, e * ARW), L(CHS + 0.58, e * (ARW - 0.27)), 6.1, 6.6, GOLD);
            box(L(CHS, e * ARW), L(CHS + 0.56, e * (ARW - 0.24)), 6.6, YS, MARBLE, 'm');
            box(L(CHS + 0.56, e * ARW), L(E, e * (ARW - 0.2)), 7.3, YS, MARBLE, 'm');
            box(L(CHS + 0.56, e * ARW), L(E, e * (ARW - 0.11)), 7.21, 7.3, GOLD);
          });
          var vn = low ? 6 : 10, ax = L(CHS + D / 2, 0);
          for (k = 0; k < vn; k++) {
            var a0 = PI * k / vn, a1 = PI * (k + 1) / vn, l0 = -ARW * Math.cos(a0), l1 = -ARW * Math.cos(a1), y0 = YS + ARW * Math.sin(a0), y1 = YS + ARW * Math.sin(a1);
            var q0 = L(CHS, l0), q1 = L(E, l0), q2 = L(E, l1), q3 = L(CHS, l1), lm = (l0 + l1) / 2, ym = (y0 + y1) / 2, nl = Math.hypot(lm, ym - YS) || 1;
            var nn = [sg * (-p[0] * lm / nl), -(ym - YS) / nl, -p[1] * lm / nl];
            CS.quad(V(q0[0], y0, q0[1]), V(q1[0], y0, q1[1]), V(q2[0], y1, q2[1]), V(q3[0], y1, q3[1]),
              ruv(RG.vault, 11 * k / vn, 0), ruv(RG.vault, 11 * k / vn, 3.4), ruv(RG.vault, 11 * (k + 1) / vn, 3.4), ruv(RG.vault, 11 * (k + 1) / vn, 0), nn);
          }
          // 어귀 아치(금박 스투코 아키볼트)
          var am = W(d[0] * (CHS + 0.28), d[1] * (CHS + 0.28));
          ctx.arch({ x: am[0], y: YS, z: am[1], span: 2 * (ARW - 0.34), rise: ARW - 0.34, axis: d[0] !== 0 ? 'z' : 'x', t: 0.34, depth: 0.56, color: GOLD, seg: low ? 8 : 12 });
          if (A.kind === 'ent') {
            // 입구 벽: 큰 아치 통로가 뚫린 끝벽(통로 반지름 AR_R, 기공 Y_ENT)
            openWall({ F: frameOf(sg * X_CH, cz, sg, 0), u0: -ARW, u1: ARW, y0: 0, y1: RING, t: 0.02, holes: [{ u: 0, w: 2 * AR_R, yb: 0, h: Y_ENT, top: 'round', rise: AR_R, seg: low ? 10 : 16 }], color: 0xece5d6, vary: 0.012 });
            ctx.arch(mb({ x: sg * (X_CH + 0.07), y: Y_ENT, z: cz, span: 2 * AR_R, rise: AR_R, axis: 'z', t: 0.3, depth: 0.14, color: MARBLE, seg: 16 }));
            ctx.box({ x: sg * (X_CH + 0.06), y: 9.85, z: cz, w: 0.1, h: 0.62, d: 2.7, color: GOLD });
            ctx.box({ x: sg * (X_CH + 0.1), y: 9.93, z: cz, w: 0.08, h: 0.46, d: 2.5, color: PORPH, gloss: true });
            [-1, 1].forEach(function (e) { box(L(E, e * ARW), L(E - 0.2, e * AR_R), 7.3, YS, MARBLE, 'm'); });
          } else {
            wallQ(L(E, -ARW), L(E, ARW), 0, YS, RG.end, L(CHS, 0));
            box(L(E, -ARW), L(E - 0.2, ARW), 7.3, YS, MARBLE, 'm'); box(L(E, -ARW), L(E - 0.11, ARW), 7.21, 7.3, GOLD);
            // 루네트(프레스코) + 반원 창(유리 — 시간대에 따라 밝기가 바뀐다)
            var ln = low ? 8 : 12, c0 = L(E, 0), nE = [sg * -d[0], 0, -d[1]], gz = L(E - 0.05, 0), gl = [];
            for (k = 0; k < ln; k++) {
              var b0 = PI * k / ln, b1 = PI * (k + 1) / ln, m0 = -ARW * Math.cos(b0), m1 = -ARW * Math.cos(b1), h0 = ARW * Math.sin(b0), h1 = ARW * Math.sin(b1), e0 = L(E, m0), e1 = L(E, m1);
              CS.tri(V(c0[0], YS, c0[1]), V(e0[0], YS + h0, e0[1]), V(e1[0], YS + h1, e1[1]), ruv(RG.lun, 3.5, 0), ruv(RG.lun, 3.5 + m0, h0), ruv(RG.lun, 3.5 + m1, h1), nE);
              var g0 = L(E - 0.05, m0 * 0.44), g1 = L(E - 0.05, m1 * 0.44);
              gl.push(sg * (CHX + gz[0]), YS + 0.06, cz + gz[1], sg * (CHX + g0[0]), YS + 0.06 + h0 * 0.44, cz + g0[1], sg * (CHX + g1[0]), YS + 0.06 + h1 * 0.44, cz + g1[1]);
            }
            ctx.glass.addTris(gl, G.toColor(GL[(A.kind === 'far' ? 0 : 3)]), [sg * CHX, YS + 1, cz], { vary: 0.06 });
            [-0.5, 0.5].forEach(function (m) { var b0q = L(E - 0.07, m), w0 = W(b0q[0], b0q[1]); ctx.box({ x: w0[0], y: YS + 0.06, z: w0[1], w: 0.07, h: 1.42, d: 0.07, color: 0x3a342c }); });
          }
        });

        // ----- 모서리 면 + 펜던티브 -----
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c) {
          wallQ([c[0] * CHS, c[1] * ARW], [c[0] * ARW, c[1] * CHS], 0, YS, RG.cham, [0, 0]);
          var w0 = W(c[0] * CHS, c[1] * ARW), w1 = W(c[0] * ARW, c[1] * CHS), ix = -sg * c[0] * 0.09, iz = -c[1] * 0.09;
          MBATCH.addBeam([w0[0] + ix, 7.45, w0[1] + iz], [w1[0] + ix, 7.45, w1[1] + iz], 0.3, 0.22, MARBLE, { vary: 0.02 });
          MET.addBeam([w0[0] + ix, 7.25, w0[1] + iz], [w1[0] + ix, 7.25, w1[1] + iz], 0.09, 0.12, GOLD);
          var pn = low ? 3 : 5;
          function PP(si, ti) {
            var ph = PI / 2 * ti / pn, cs = Math.cos(ph), rho = Math.hypot(CHS, ARW * cs), y = YS + ARW * Math.sin(ph);
            var tA = Math.atan2(c[1] * ARW * cs, c[0] * CHS), tB = Math.atan2(c[1] * CHS, c[0] * ARW * cs), dt = tB - tA;
            if (dt > PI) dt -= 2 * PI; if (dt < -PI) dt += 2 * PI;
            var th = tA + dt * si / pn; return V(rho * Math.cos(th), y, rho * Math.sin(th));
          }
          for (var si = 0; si < pn; si++) for (var ti = 0; ti < pn; ti++) {
            var P0 = PP(si, ti), P1 = PP(si + 1, ti), P2 = PP(si + 1, ti + 1), P3q = PP(si, ti + 1);
            var mx = (P0[0] + P2[0]) / 2 - sg * CHX, mz = (P0[2] + P2[2]) / 2 - cz, ml = Math.hypot(mx, mz) || 1;
            CS.quad(P0, P1, P2, P3q, ruv(RG.pend, si / pn, ti / pn), ruv(RG.pend, (si + 1) / pn, ti / pn), ruv(RG.pend, (si + 1) / pn, (ti + 1) / pn), ruv(RG.pend, si / pn, (ti + 1) / pn), [-mx / ml * 0.8, -0.6, -mz / ml * 0.8]);
          }
          var cc = W(c[0] * CHS, c[1] * CHS); ctx.addCollider({ x: cc[0], z: cc[1], r: 1.13 });
        });

        // ----- 고리 코니스 + 드럼(창 8) + 돔 + 정점 채광 -----
        var sn = low ? 16 : 24, rn = low ? 4 : 6, cx = sg * CHX, Y_D = RING + DR_H, PMAX = 0.9;
        function ringP(r, y, a) { return [cx + sg * r * Math.cos(a), y, cz + r * Math.sin(a)]; }
        for (k = 0; k < sn; k++) {
          var a0 = 2 * PI * k / sn, a1 = 2 * PI * (k + 1) / sn, am2 = (a0 + a1) / 2, nIn = [-sg * Math.cos(am2), 0, -Math.sin(am2)];
          MET.addBeam(ringP(CHS - 0.14, RING + 0.12, a0), ringP(CHS - 0.14, RING + 0.12, a1), 0.3, 0.3, GOLD);
          MBATCH.addBeam(ringP(DM_R - 0.1, Y_D - 0.02, a0), ringP(DM_R - 0.1, Y_D - 0.02, a1), 0.2, 0.24, MARBLE, { vary: 0.02 });
          var per = sn / 8, f0 = (k % per) / per, f1 = f0 + 1 / per;
          CS.quad(ringP(DM_R, RING, a0), ringP(DM_R, RING, a1), ringP(DM_R, Y_D, a1), ringP(DM_R, Y_D, a0), ruv(RG.drum, 3.93 * f0, 0), ruv(RG.drum, 3.93 * f1, 0), ruv(RG.drum, 3.93 * f1, 2.6), ruv(RG.drum, 3.93 * f0, 2.6), nIn);
          for (var r = 0; r < rn; r++) {
            var p0 = PMAX * r / rn, p1 = PMAX * (r + 1) / rn, r0 = DM_R * Math.cos(p0 * PI / 2), r1 = DM_R * Math.cos(p1 * PI / 2), y0 = Y_D + DM_RISE * Math.sin(p0 * PI / 2), y1 = Y_D + DM_RISE * Math.sin(p1 * PI / 2);
            var pm = (p0 + p1) / 2 * PI / 2, nd = [nIn[0] * Math.cos(pm), -Math.sin(pm), nIn[2] * Math.cos(pm)];
            function duv(pp, a) { return ruv(RG.dome, 0.5 + 0.49 * (1 - pp) * Math.cos(a), 0.5 + 0.49 * (1 - pp) * Math.sin(a)); }
            CS.quad(ringP(r0, y0, a0), ringP(r0, y0, a1), ringP(r1, y1, a1), ringP(r1, y1, a0), duv(p0, a0), duv(p0, a1), duv(p1, a1), duv(p1, a0), nd);
          }
        }
        var rT = DM_R * Math.cos(PMAX * PI / 2), yT = Y_D + DM_RISE * Math.sin(PMAX * PI / 2), oc = [];
        for (k = 0; k < 12; k++) { var o0 = ringP(rT, yT, 2 * PI * k / 12), o1 = ringP(rT, yT, 2 * PI * (k + 1) / 12); oc.push(cx, yT, cz, o0[0], o0[1], o0[2], o1[0], o1[1], o1[2]); }
        ctx.glass.addTris(oc, G.toColor(0xfff4d6), [cx, yT - 2, cz], { vary: 0.03 });
        for (k = 0; k < 8; k++) {   // 드럼 창(유리 판: 사각 + 반원)
          var wa = 2 * PI * (k + 0.5) / 8, hw = 0.5 / (DM_R - 0.05), wr = DM_R - 0.05, gy0 = RING + 0.42, gy1 = RING + 1.63, gc = G.toColor(GL[k % GL.length]);
          var gv = [], gA = ringP(wr, gy0, wa - hw), gB = ringP(wr, gy0, wa + hw), gC = ringP(wr, gy1, wa + hw), gD = ringP(wr, gy1, wa - hw), gM = [(gC[0] + gD[0]) / 2, gy1, (gC[2] + gD[2]) / 2];
          gv.push(gA[0], gA[1], gA[2], gB[0], gB[1], gB[2], gC[0], gC[1], gC[2], gA[0], gA[1], gA[2], gC[0], gC[1], gC[2], gD[0], gD[1], gD[2]);
          for (var q = 0; q < 6; q++) { var t0 = PI * q / 6, t1 = PI * (q + 1) / 6, c0 = Math.cos(t0), c1 = Math.cos(t1), e0 = [gM[0] + (gD[0] - gM[0]) * c0, gy1 + 0.5 * Math.sin(t0), gM[2] + (gD[2] - gM[2]) * c0], e1 = [gM[0] + (gD[0] - gM[0]) * c1, gy1 + 0.5 * Math.sin(t1), gM[2] + (gD[2] - gM[2]) * c1]; gv.push(gM[0], gM[1], gM[2], e0[0], e0[1], e0[2], e1[0], e1[1], e1[2]); }
          ctx.glass.addTris(gv, gc, [cx, RING + 1, cz], { vary: 0.08 });
        }

        // ----- 걷기 경계(벽 바깥은 모두 막는다) -----
        var OUT = 31 - CHX, IN = XA - CHX;   // 국소 a: 바깥 한계 / 측랑 외벽 안쪽면
        blockLocal([IN, Z_A - 1 - cz], [OUT, -FAR]); blockLocal([IN, FAR], [OUT, Z_E + 1 - cz]);
        [-1, 1].forEach(function (e) {
          blockLocal([IN, e * CHS], [-ARW, e * FAR]); blockLocal([ARW, e * CHS], [OUT, e * FAR]);
          blockLocal([IN, e * ARW], [-CHS, e * CHS]); blockLocal([CHS, e * ARW], [OUT, e * CHS]);
          blockLocal([IN, e * AR_R], [X_CH - CHX, e * ARW]);
        });
        blockLocal([FAR, -ARW], [OUT, ARW]);

        // ----- 설치물 -----
        function tomb(A, tone) {   // 교황 무덤 기념물: 기단 + 사문석 기둥 4 + 엔타블러처 + 다락 + 박공, 가운데 벽감의 교황상, 양옆 부조
          var L = A.L, E = A.E, zf = E - 0.75;
          box(L(E, -2.75), L(zf, 2.75), 0, 1.15, MARBLE, 'm'); box(L(E, -2.85), L(zf - 0.08, 2.85), 1.15, 1.3, MARBLE_D, 'm');
          box(L(E - 0.04, -2.2), L(E - 0.1, 2.2), 0.25, 0.95, tone, 'g');
          [-2.45, -0.95, 0.95, 2.45].forEach(function (m) { col(L(zf + 0.2, m), 1.3, 0.2, 0.17, 3.0, VERDE, GLB); box(L(zf + 0.42, m - 0.25), L(zf - 0.02, m + 0.25), 4.3, 4.55, GOLD); box(L(zf + 0.42, m - 0.24), L(zf - 0.02, m + 0.24), 1.3, 1.42, GOLD); });
          box(L(E, -2.8), L(zf - 0.05, 2.8), 4.55, 5.05, MARBLE, 'm'); box(L(E, -2.9), L(zf - 0.14, 2.9), 5.05, 5.2, MARBLE_D, 'm');
          box(L(E, -2.3), L(zf + 0.15, 2.3), 5.2, 6.35, MARBLE, 'm'); box(L(E, -2.4), L(zf + 0.08, 2.4), 6.35, 6.5, GOLD);
          var g0 = L(zf + 0.12, -1.5), g1 = L(zf + 0.12, 1.5), g2 = L(zf + 0.12, 0), hh = L(CHS, 0);
          solid.addTris([sg * (CHX + g0[0]), 6.5, cz + g0[1], sg * (CHX + g1[0]), 6.5, cz + g1[1], sg * (CHX + g2[0]), 7.15, cz + g2[1]], MARBLE, [sg * (CHX + hh[0]), 6.8, cz + hh[1]], { vary: 0.01 });
          var cr = L(zf + 0.08, 0), cw = W(cr[0], cr[1]); MET.add(Geo.sph(8, 6), GOLD, { x: cw[0], y: 6.72, z: cw[1], sx: 0.26, sy: 0.3, sz: 0.1, flat: false });
          // 가운데 벽감 + 교황상(흰 대리석: 앉아 축복하는 모습)
          box(L(E - 0.02, -0.72), L(E - 0.08, 0.72), 1.3, 4.3, 0x5b5148);
          var sp = L(E - 0.45, 0), sw = W(sp[0], sp[1]);
          fig(sw[0], 1.3, sw[1], 2.5, [-sg * A.d[0], -A.d[1]], 0xf1ece0, GLB, { tiara: true, arm: true });
          // 양옆·다락의 부조(질감)
          var nq = [sg * -A.d[0], 0, -A.d[1]];
          [[-1.7, 1.5, 1.3, 2.7], [1.7, 1.5, 1.3, 2.7], [0, 5.3, 2.2, 0.95], [-1.72, 5.3, 1.0, 0.95], [1.72, 5.3, 1.0, 0.95]].forEach(function (r) {
            var al = r[1] > 5 ? zf + 0.13 : E - 0.03, a0 = L(al, r[0] - r[2] / 2), a1 = L(al, r[0] + r[2] / 2);
            CS.quad(V(a0[0], r[1], a0[1]), V(a1[0], r[1], a1[1]), V(a1[0], r[1] + r[3], a1[1]), V(a0[0], r[1] + r[3], a0[1]), ruv(RG.rel, 0, 0), ruv(RG.rel, 2, 0), ruv(RG.rel, 2, 2), ruv(RG.rel, 0, 2), nq);
          });
          blockLocal(L(E, -2.9), L(zf - 0.2, 2.9));
        }
        tomb(ARMS[2], pau ? ROSSO : PORPH); tomb(ARMS[3], pau ? PORPH : ROSSO);
        var FA = ARMS[0], Lf = FA.L;
        if (pau) {
          // 파올리나(보르게세) 경당 제단: 벽옥 기둥 4 + 금동 주두, 청금석 바탕에 금빛 광채, 그 가운데 '로마 백성의 구원' 성화
          [[FAR - 2.3, 0.15], [FAR - 1.95, 0.3]].forEach(function (st) { box(Lf(st[0], -2.7), Lf(FAR, 2.7), 0, st[1], 0xe6e0d0, 'm'); var a = W(st[0], -2.7), b = W(FAR, 2.7); ctx.floorZone({ x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), z0: Math.min(a[1], b[1]), z1: Math.max(a[1], b[1]), y: st[1] }); });
          box(Lf(FAR - 1.25, -1.45), Lf(FAR - 0.5, 1.45), 0.3, 1.25, MARBLE, 'm');                    // 제대
          box(Lf(FAR - 1.3, -1.55), Lf(FAR - 0.45, 1.55), 1.25, 1.33, 0xfffaf0);
          box(Lf(FAR - 1.27, -1.2), Lf(FAR - 1.25, 1.2), 0.42, 1.13, GOLD); box(Lf(FAR - 1.29, -1.05), Lf(FAR - 1.27, 1.05), 0.5, 1.05, LAPIS, 'g');
          box(Lf(FAR - 0.5, -2.5), Lf(FAR, 2.5), 0.3, 1.75, MARBLE, 'm'); box(Lf(FAR - 0.56, -2.56), Lf(FAR, 2.56), 1.75, 1.9, MARBLE_D, 'm');   // 기단
          [-2.15, -1.45, 1.45, 2.15].forEach(function (m) {
            col(Lf(FAR - 0.3, m), 1.9, 0.19, 0.16, 3.2, 0xa4502f, GLB, 12);
            box(Lf(FAR - 0.52, m - 0.24), Lf(FAR - 0.08, m + 0.24), 1.9, 2.04, GOLD); box(Lf(FAR - 0.54, m - 0.26), Lf(FAR - 0.06, m + 0.26), 5.1, 5.42, GOLD);
          });
          box(Lf(FAR - 0.58, -2.5), Lf(FAR, 2.5), 5.42, 5.6, MARBLE, 'm'); box(Lf(FAR - 0.56, -2.48), Lf(FAR, 2.48), 5.6, 5.9, 0xb7895a, 'g'); box(Lf(FAR - 0.66, -2.6), Lf(FAR, 2.6), 5.9, 6.08, GOLD);
          var t0 = Lf(FAR - 0.5, -2.5), t1 = Lf(FAR - 0.5, 2.5), t2 = Lf(FAR - 0.5, 0);
          solid.addTris([sg * (CHX + t0[0]), 6.08, cz + t0[1], sg * (CHX + t1[0]), 6.08, cz + t1[1], sg * (CHX + t2[0]), 7.1, cz + t2[1]], MARBLE, [sg * CHX, 6.5, cz], { vary: 0.01 });
          MET.addBeam([sg * (CHX + t0[0] - 0.05), 6.1, cz + t0[1]], [sg * (CHX + t2[0] - 0.05), 7.14, cz + t2[1]], 0.1, 0.14, GOLD); MET.addBeam([sg * (CHX + t1[0] - 0.05), 6.1, cz + t1[1]], [sg * (CHX + t2[0] - 0.05), 7.14, cz + t2[1]], 0.1, 0.14, GOLD);
          box(Lf(FAR - 0.6, -0.75), Lf(FAR - 0.5, 0.75), 6.14, 6.6, GOLD);                              // 박공의 금빛 부조(눈 위에 터를 그리는 리베리오 교황)
          box(Lf(FAR - 0.12, -1.12), Lf(FAR - 0.04, 1.12), 1.9, 5.42, LAPIS, 'g');                      // 청금석 바탕
          var ic = Lf(FAR - 0.16, 0), IY = 3.62, icw = W(ic[0], ic[1]);
          for (k = 0; k < 20; k++) { var ra = 2 * PI * k / 20, rl = k % 2 ? 1.0 : 1.32; MET.addBeam([icw[0], IY, icw[1]], [icw[0], IY + Math.sin(ra) * rl, icw[1] + Math.cos(ra) * rl * 0.8], 0.035, 0.05, GOLD_L); }
          box(Lf(FAR - 0.26, -0.66), Lf(FAR - 0.14, 0.66), IY - 0.9, IY + 0.9, GOLD);                    // 금 액자
          box(Lf(FAR - 0.29, -0.56), Lf(FAR - 0.26, 0.56), IY - 0.8, IY + 0.8, 0x5a3a78, 'g');            // 자수정 테
          var i0 = Lf(FAR - 0.3, -sg * 0.475), i1 = Lf(FAR - 0.3, sg * 0.475);                            // 실내에서 볼 때 왼쪽 → 오른쪽
          ICON.quad(V(i0[0], IY - 0.71, i0[1]), V(i1[0], IY - 0.71, i1[1]), V(i1[0], IY + 0.71, i1[1]), V(i0[0], IY + 0.71, i0[1]), [0, 0], [1, 0], [1, 1], [0, 1], [-sg, 0, 0]);
          [-1, 1].forEach(function (e) {   // 액자를 받든 금빛 천사 + 제대 촛대 6
            var ap = Lf(FAR - 0.34, e * 0.98), aw = W(ap[0], ap[1]);
            box(Lf(FAR - 0.5, e * 0.98 - 0.2), Lf(FAR - 0.14, e * 0.98 + 0.2), 2.34, 2.46, GOLD);
            fig(aw[0], 2.46, aw[1], 1.05, [-sg, 0], GOLD, MET, { wings: true, head: GOLD_L });
            [0.45, 0.85, 1.25].forEach(function (m, mi) { var cp = Lf(FAR - 0.62, e * m), cw2 = W(cp[0], cp[1]), ch = 0.5 + mi * 0.07; cylO(cw2[0], 1.33, cw2[1], 0.07, 0.03, ch, 6, GOLD, false, 0.02, MET); cylO(cw2[0], 1.33 + ch, cw2[1], 0.022, 0.022, 0.3, 5, 0xfff6e0); flameG(cw2[0], 1.33 + ch + 0.37, cw2[1], 1.2); });
          });
          var cr2 = W(ic[0], ic[1]); MET.add(Geo.sph(8, 6), GOLD_L, { x: cr2[0], y: IY + 1.12, z: cr2[1], sx: 0.2, sy: 0.16, sz: 0.2, flat: false });
          ctx.addGlow({ x: sg * (CHX + FAR - 0.9), y: IY, z: cz, size: 4.2, color: 0xffd98a, kind: 'always' });
          blockLocal(Lf(FAR - 1.4, -2.7), Lf(FAR, 2.7));
        } else {
          // 시스티나 경당: 가운데 성체 감실(금동 천사 넷이 받든 신전 모형) + 붉은 성소등, 안쪽 팔에는 제단화가 있는 제대
          box([-1.5, -1.5], [1.5, 1.5], 0, 0.16, 0xe6e0d0, 'm'); box([-1.25, -1.25], [1.25, 1.25], 0.16, 0.32, 0xe6e0d0, 'm');
          box([-0.75, -1.0], [0.75, 1.0], 0.32, 1.3, MARBLE, 'm'); box([-0.8, -1.06], [0.8, 1.06], 1.3, 1.38, 0xfffaf0);
          box([-0.77, -0.8], [-0.75, 0.8], 0.45, 1.15, GOLD);
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
            var aw = W(c[0] * 0.5, c[1] * 0.62);
            fig(aw[0], 1.38, aw[1], 1.25, [sg * c[0] * 0.7071, c[1] * 0.7071], GOLD, MET, { wings: true, head: GOLD_L });
            MET.addBeam([aw[0], 2.45, aw[1]], [cx + sg * c[0] * 0.3, 2.95, cz + c[1] * 0.3], 0.07, 0.07, GOLD);
          });
          cylO(cx, 2.9, cz, 0.62, 0.62, 0.14, 8, GOLD, true, 0.02, MET); cylO(cx, 3.04, cz, 0.5, 0.5, 0.95, 8, GOLD_L, true, 0.02, MET);
          for (k = 0; k < 8; k++) { var ta = 2 * PI * (k + 0.5) / 8; cylO(cx + Math.cos(ta) * 0.54, 3.04, cz + Math.sin(ta) * 0.54, 0.045, 0.045, 0.95, 5, GOLD_D, false, 0.02, MET); }
          cylO(cx, 3.99, cz, 0.64, 0.6, 0.12, 8, GOLD, true, 0.02, MET);
          MET.add(Geo.sph(10, 6), GOLD_L, { x: cx, y: 4.1, z: cz, sx: 0.52, sy: 0.5, sz: 0.52, flat: false });
          cylO(cx, 4.56, cz, 0.12, 0.1, 0.22, 6, GOLD, false, 0.02, MET); ctx.box({ x: cx, y: 4.78, z: cz, w: 0.05, h: 0.34, d: 0.05, color: GOLD }); ctx.box({ x: cx, y: 4.94, z: cz, w: 0.05, h: 0.05, d: 0.2, color: GOLD });
          ctx.glow.add(Geo.cyl(8, 1), new T.Color(0xff4a3a).multiplyScalar(2.2), { x: cx - sg * 1.05, y: 1.5, z: cz + 1.25, sx: 0.07, sy: 0.2, sz: 0.07, flat: true, vary: 0 });
          cylO(cx - sg * 1.05, 0.32, cz + 1.25, 0.1, 0.04, 1.18, 6, GOLD, false, 0.02, MET);
          ctx.addGlow({ x: cx, y: 3.4, z: cz, size: 3.6, color: 0xffd98a, kind: 'always' });
          ctx.addCollider({ x0: cx - 1.55, x1: cx + 1.55, z0: cz - 1.55, z1: cz + 1.55 });
          box(Lf(FAR - 1.0, -1.3), Lf(FAR - 0.3, 1.3), 0, 1.05, MARBLE, 'm'); box(Lf(FAR - 1.05, -1.4), Lf(FAR - 0.25, 1.4), 1.05, 1.13, 0xfffaf0);
          box(Lf(FAR - 0.3, -1.55), Lf(FAR, 1.55), 0, 1.6, MARBLE_D, 'm');
          [-1.3, 1.3].forEach(function (m) { col(Lf(FAR - 0.22, m), 1.6, 0.16, 0.14, 2.9, VERDE, GLB); box(Lf(FAR - 0.42, m - 0.2), Lf(FAR - 0.02, m + 0.2), 4.5, 4.72, GOLD); });
          box(Lf(FAR - 0.46, -1.6), Lf(FAR, 1.6), 4.72, 5.1, MARBLE, 'm'); box(Lf(FAR - 0.52, -1.7), Lf(FAR, 1.7), 5.1, 5.24, GOLD);
          box(Lf(FAR - 0.1, -1.08), Lf(FAR - 0.04, 1.08), 1.62, 4.62, GOLD);
          var p0 = Lf(FAR - 0.12, -1.0), p1 = Lf(FAR - 0.12, 1.0);
          CS.quad(V(p0[0], 1.7, p0[1]), V(p1[0], 1.7, p1[1]), V(p1[0], 4.5, p1[1]), V(p0[0], 4.5, p0[1]), ruv(RG.altp, 0, 0), ruv(RG.altp, 2, 0), ruv(RG.altp, 2, 2.8), ruv(RG.altp, 0, 2.8), [-sg, 0, 0]);
          [-0.8, 0.8].forEach(function (m) { var cp = Lf(FAR - 0.6, m), cw2 = W(cp[0], cp[1]); cylO(cw2[0], 1.13, cw2[1], 0.07, 0.03, 0.55, 6, GOLD, false, 0.02, MET); flameG(cw2[0], 1.76, cw2[1], 1.2); });
          blockLocal(Lf(FAR - 1.15, -1.7), Lf(FAR, 1.7));
        }
      }
      chapel(1, 'sistina'); chapel(-1, 'paolina');
      CS.mesh(emissiveMat(chTex, 0.1, { sheen: 0.12 }));
      ICON.mesh(iconMat);

      mark('chapels');
      // =====================================================================
      // 입구 벽(문 개구부 + 고창) / 열린 문 / 성수대 / 바깥
      // =====================================================================
      var FE = frameOf(0, Z_E, 0, -1);   // u = (nz,-nx) = (-1,0): x 반대
      // 아래: 신랑 문 3(가운데 열림, 좌우 닫힌 청동문) + 측랑 끝 창. 위: 양옆 고창 + 가운데 원형 창(오큘러스, 지름 3.6 = 실제 4.5 m 장미창 자리 — 그림은 걸지 않는다)
      var ROSE_Y = 11.0, ROSE_R = 1.8, Y_SPLIT = Y_ENT;
      var lowHoles = [{ u: 0, w: 3.0, yb: 0, h: 4.0, top: 'flat' }, { u: -4.2, w: 2.0, yb: 0, h: 3.4, top: 'flat' }, { u: 4.2, w: 2.0, yb: 0, h: 3.4, top: 'flat' }];
      [-9.2, 9.2].forEach(function (x) { lowHoles.push(winHole(-x, 4.2, 0.9, 0.8)); });
      openWall({ F: FE, u0: -XA, u1: XA, y0: 0, y1: Y_SPLIT, t: 0.6, holes: lowHoles, color: 0xdccfae });
      openWall({ F: FE, u0: -XA, u1: XA, y0: Y_SPLIT, y1: Y_TOP, t: 0.6, color: 0xdccfae,
        holes: [winHole(-4.2, 9.6, 1.0, 2.2), winHole(4.2, 9.6, 1.0, 2.2), { u: 0, w: 2 * ROSE_R + 0.08, yb: ROSE_Y, h: 0, top: 'circle' }] });
      [-4.2, 4.2].forEach(function (x, i) { mkWindow(FE, -x, 9.6, 1.0, 2.2, 'round', 200 + i * 2, true, 0.28, 12); var h = winHole(-x, 9.6, 1.0, 2.2); ctx.arch({ x: x, y: h.yb + h.h, z: Z_E - 0.05, span: h.w + 0.05, rise: h.w / 2, axis: 'x', t: 0.16, depth: 0.12, color: GOLD }); });
      ctx.rose({ x: 0, y: ROSE_Y, z: Z_E + 0.3, face: [0, -1], r: ROSE_R, petals: 12, colors: GL, seed: 201, frame: false, beam: true, beamReach: 12 });
      for (var rk = 0; rk < 24; rk++) {   // 원형 창 둘레 금 몰딩
        var ra0 = 2 * PI * rk / 24, ra1 = 2 * PI * (rk + 1) / 24, rr = ROSE_R + 0.13;
        MET.addBeam([Math.cos(ra0) * rr, ROSE_Y + Math.sin(ra0) * rr, Z_E - 0.05], [Math.cos(ra1) * rr, ROSE_Y + Math.sin(ra1) * rr, Z_E - 0.05], 0.16, 0.12, GOLD);
      }
      // 개발용 임시 유리 체계가 쓰는 개구부 anchor(GLASS_DEV_PIPELINE §7): 원형 창 자리만 내보낸다
      if (ctx._ && ctx._.glassAnchors) ctx._.glassAnchors.push({ key: 'facade_center', kind: 'glass', x: 0, y: ROSE_Y, z: Z_E + 0.3, nx: 0, nz: -1, yaw: PI, w: 2 * ROSE_R, h: 2 * ROSE_R, sill: ROSE_Y - ROSE_R, spring: ROSE_Y, apex: ROSE_Y + ROSE_R, lights: 1, photoH: 0 });
      [-9.2, 9.2].forEach(function (x, i) { mkWindow(FE, -x, 4.2, 0.9, 0.8, 'round', 210 + i, false, 0.28); });
      // 좌우 문(닫힌 청동문)
      [-4.2, 4.2].forEach(function (x) {
        ctx.box({ x: x, y: 0, z: Z_E + 0.3, w: 2.0, h: 3.4, d: 0.1, color: 0x5a4a32, metal: true });
        [-0.5, 0.5].forEach(function (dx) { [0.35, 1.85].forEach(function (y) { ctx.box({ x: x + dx, y: y, z: Z_E + 0.24, w: 0.78, h: 1.3, d: 0.05, color: 0x7a6238, metal: true }); }); });
        ctx.box(mb({ x: x, y: 3.4, z: Z_E - 0.05, w: 2.5, h: 0.24, d: 0.2, color: MARBLE }));
        [-1.12, 1.12].forEach(function (dx) { ctx.box(mb({ x: x + dx, y: 0, z: Z_E - 0.05, w: 0.22, h: 3.4, d: 0.2, color: MARBLE })); });
      });
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
      ctx.holyFont({ x: -2.6, z: Z_E - 1.8 }); ctx.holyFont({ x: 2.6, z: Z_E - 1.8 });

      // 바깥 풍경(문으로 보임)
      ctx.setSky({ outside: true });
      [[-400, 400, Z_E - 0.1, 400], [-400, -XA - 0.6, -40, Z_E + 0.5], [XA + 0.6, 400, -40, Z_E + 0.5]].forEach(function (g) {
        ctx.plane({ x: (g[0] + g[1]) / 2, y: -0.05, z: (g[2] + g[3]) / 2, rx: -PI / 2, w: g[1] - g[0], h: g[3] - g[2], color: 0xd9ceb4 });
      });
      ctx.path({ x0: -2.4, x1: 2.4, z0: Z_E + 0.4, z1: 90, color: 0xcfc2a6 });
      ctx.scatterTrees({ x0: -80, x1: 80, z0: Z_E + 14, z1: 120, count: 5, seed: 5, minH: 5, maxH: 9, exclude: [{ x0: -8, x1: 8, z0: 0, z1: 130 }], palette: [0x7fb07a, 0x8fc088, 0x6aa070, 0xa5cf8a] });
      ctx.hills({ color: 0xa9c8a0, count: 14, radius: 220 });

      mark('entrance+outside');
      // =====================================================================
      // 개선 아치 벽(5세기 모자이크) + 아치 입체 테두리
      // =====================================================================
      var FT = frameOf(0, Z_A, 0, 1);    // u=(1,0)
      var ARC_A = 5.4, ARC_Y = 5.6;   // 개구 반폭 5.4(후진 폭 13.65 m) / 기공 높이(정점 11.0)
      var triTex = mtex(1024, 1024, 12.8, 14.4, function (g) {
        function X(x) { return x + 6.4; } function Y(y) { return 14.4 - y; }
        goldFill(g, 0, 0, 12.8, 14.4, 0.1, TG, TGG);
        // 아래 대리석 기둥판
        [-1, 1].forEach(function (s) {
          var x0 = s < 0 ? -6.4 : 5.4, w = 1.0;
          g.fillStyle = css(0xe9e2d2, 1); g.fillRect(X(x0), Y(4.6), w, 4.6);
          g.fillStyle = css(GOLD, 1); g.fillRect(X(x0 + 0.1), Y(4.5), w - 0.2, 4.4);
          g.fillStyle = css(PORPH, 1); g.fillRect(X(x0 + 0.2), Y(4.3), w - 0.4, 1.9);
          g.fillStyle = css(SERP, 1); g.fillRect(X(x0 + 0.2), Y(2.2), w - 0.4, 1.8);
          // 아치 어깨의 성인 열(아치 바깥 띠 밖에만)
          [[7.0, 8.8], [9.0, 10.8], [11.3, 13.0]].forEach(function (rw, ri) {
            var dy = rw[0] - ARC_Y, xa = dy < 6.0 ? Math.sqrt(36 - dy * dy) : 0;
            for (var fx = Math.max(xa + 0.35, ri === 2 ? 1.6 : 0); fx < 6.2; fx += 0.62) saint(g, X(s * fx), Y(rw[0]), rw[1] - rw[0] - 0.05, PALS[(ri + Math.round(fx * 3) + (s > 0 ? 1 : 0)) % PALS.length], PALS[(ri * 3 + Math.round(fx * 2)) % PALS.length]);
          });
        });
        // 아치 띠
        [[5.4, 5.58, 0x274c8f], [5.58, 5.64, 0xf4efe2], [5.64, 5.82, 0xa8432f], [5.82, 5.88, 0xf4efe2], [5.88, 6.0, 0x2f6b4e]].forEach(function (b) {
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
      [-1, 1].forEach(function (s) { ctx.box({ x: s * 5.92, y: 0, z: Z_A + 0.1, w: 0.9, h: 0.5, d: 0.3, color: MARBLE }); });

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
      var AR = 5.4, ACZ = -28.8, AH = 7.0, ARISE = 4.6, AY0 = PY;
      // 후진 입구(반원 아치) 벽
      openWall({ F: frameOf(0, ACZ, 0, 1), u0: -CHOIR_X, u1: CHOIR_X, y0: PY, y1: Y_TOP, t: 0.5, holes: [{ u: 0, w: 2 * AR, yb: PY, h: AH, top: 'round', rise: ARISE }], color: 0xd8c8a2, rcolor: GOLD_D });
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

      // 성가대 칸의 옆벽(후진 폭): 회벽 + 금빛 띠. 그 바깥(측랑 머리)은 막힌 방이다
      [-1, 1].forEach(function (s) {
        B(s < 0 ? -CHOIR_X - 0.5 : CHOIR_X, s < 0 ? -CHOIR_X : CHOIR_X + 0.5, PY, Y_TOP, ACZ, Z_A - 0.9, 0xd8c8a2);
        ctx.box({ x: s * (CHOIR_X - 0.06), y: 3.0, z: (ACZ + Z_A - 0.9) / 2, w: 0.12, h: 0.3, d: Z_A - 0.9 - ACZ, color: GOLD_D });
        ctx.box({ x: s * (CHOIR_X - 0.06), y: PY + AH - 0.15, z: (ACZ + Z_A - 0.9) / 2, w: 0.12, h: 0.3, d: Z_A - 0.9 - ACZ, color: GOLD });
      });

      mark('apse');
      // =====================================================================
      // 조명·분위기: 점광원 1개 + 매달린 등 + 시간대 후크
      // =====================================================================
      ctx.addLight({ x: 0, y: 6.5, z: -17, color: 0xffcf8a, intensity: 1.0, distance: 24, kind: 'lamp' });
      [[-9.5, -1.9], [-9.5, 8.6], [-9.5, 19.0], [9.5, -1.9], [9.5, 8.6], [9.5, 19.0]].forEach(function (p) { ctx.lantern({ x: p[0], y: 4.6, z: p[1], chain: 1.4 }); });
      [[-3.4, 8], [3.4, 8], [-3.4, 22], [3.4, 22]].forEach(function () { });

      mark('lights');
      // =====================================================================
      // 좌석 + 촛불대
      // =====================================================================
      ctx.renderSeats(layout, 'bench', { wood: 0x7a5538, seat: 0x8a6642, back: 0x5e402a });
      ctx.candleStand(0, { wood: 0x4a3220 });
      mark('seats');
      ctx.setCameraBounds({ x0: -29.5, x1: 29.5, z0: -22.4, z1: Z_E - 0.6, yMax: 13.4 });
    }
  };
})();
