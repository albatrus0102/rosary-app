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
    // 성수대(빌더의 holyFont 와 같은 자리: x = ±(hw(28.6) - 0.5) = ±4.159, z = 28.6). 선언해야 스테이션·「성호 긋기」 단추가 생긴다.
    fonts: [{ x: -4.159, z: 28.6, face: [1, 0] }, { x: 4.159, z: 28.6, face: [-1, 0] }],
    candles: {
      stands: [
        { x: 8.9, z: 17.2, slots: 96, reach: 2.2, cols: 16, face: [-1, 0], pitch: 0.5, step: 0.25, ystep: 0.3, y0: 0.8 },
        { x: -8.9, z: 17.2, slots: 96, reach: 2.2, cols: 16, face: [1, 0], pitch: 0.5, step: 0.25, ystep: 0.3, y0: 0.8 }
      ]
    },
    // 14처(I-5): 측랑 바깥벽의 민벽 구간에만 건다(경당 입구·회랑 아치·촛불대 앞을 피한다). 오른쪽 벽 제대 쪽 1처 → 입구 쪽 7처, 왼쪽 벽 입구 쪽 8처 → 제대 쪽 14처.
    crossWay: {
      plaques: [7.2, 8.85, 10.5, 24.0, 25.8, 27.6, 33.1].map(function (z) { return { x: 10.876, z: z, face: [-1, 0], side: 'R' }; })
        .concat([33.1, 27.6, 25.8, 24.0, 10.5, 8.85, 7.2].map(function (z) { return { x: -10.876, z: z, face: [1, 0], side: 'L' }; }))
    },
    info: { name: '성 베드로 대성전', place: '바티칸 시국', builtYear: 1626 }
  };
  ChurchLayouts.register(layout);

  // ---------------------------------------------------------------- 빌더
  ChurchBuilders['stpeter'] = {
    layout: layout,
    thumb: { x: 0, z: 12, yaw: 0, pitch: 5, zoom: 1.7, hour: 11 },
    build: function (ctx) {
      var T = ctx.THREE, PI = Math.PI, solid = ctx.solid, glass = ctx.glass, glow = ctx.glow;
      var Geo = ChurchGeo.Geo;
      var rnd = ctx.rng(7);
      var __v0 = 0;
      function VC(label) { if (window.__stpDbg) { var t = 0, bb = ctx._.batches; for (var k in bb) t += bb[k].vertexCount; var sb = ctx._.surfBatches; for (k in sb) t += sb[k].batch.vertexCount; console.log('[vc] ' + label + ' +' + (t - __v0) + ' = ' + t); __v0 = t; } }

      // ---- 색(조사서 §5) ----
      var CREAM = 0xdcd2bc, CREAM_D = 0xc6baa2, GOLD = 0xd4af37, GOLD_D = 0xb8892b, BRONZE = 0x3e2f1f, WHITE = 0xe0dbce,
        YEL = 0xd2a657, RED = 0x7a2e2c, GREY = 0x8d9296, GREEN = 0x3f6652, BLUE = 0x2f4c7a, AMBER = 0xf2b441;
      var GLASS_PALE = [0xfff4d6, 0xffefc4, 0xfffaf0, 0xffeab0];

      // ---- 치수(앱 m) ----
      var YS = 12.35;          // 엔타블러처 윗단 = 궁륭 시작선
      var RISE = 4.5;          // 궁륭 상승(정점 16.85)
      var ZE = 34.5;           // 입구 안쪽 벽
      var CX = 0, CZ = -9;     // 돔 중심
      var PIER_OUT = 7.0, AISLE_OUT = 10.95;
      // 돔 피어 둘레 회랑(I-5, STRUCTURE_AUDIT_ROME §1.4 ①): 바깥벽 안쪽 면 x=±R_OUT, 아치·궁륭 시작선 AMB_Y(신랑 아케이드와 같은 6.25), 벽 윗단 AMB_TOP
      var R_OUT = 16.7, AMB_Y = 6.25, AMB_TOP = 9.2, low = ctx.quality === 'low';
      var PIERS = [[32.4, 34.5], [23.75, 27.9], [15.1, 19.25], [6.45, 10.6]];
      var ARCHZ = [30.15, 21.5, 12.85, 4.2];
      function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
      function hw(z) { return 4.25 + 0.5 * clamp((z - 1.95) / 32.55, 0, 1); }

      // ---------------------------------------------------------------- 도우미
      function P3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
      function onWall(cx, cz, n, u, d) { return [cx + n[1] * u + n[0] * d, cz - n[0] * u + n[1] * d]; }
      // 벽 위 상자: (cx,cz)=벽 위 기준점, n=실내쪽 법선, u=벽 따라 이동, d=벽에서 실내쪽 중심 거리
      // 위키미디어 공용 사진 판(art_stpeter.js, C-15): 이 성당에 들어올 때만 읽고, 읽히면 cb(질감)을 부른다(art_florence.js 와 같은 방식)
      var artWait = [], artAsked = false;
      function artPhoto(key, cb) {
        if (typeof document === 'undefined' || !document.head || !document.head.appendChild) return;
        function one(it) {
          var a = window.ChurchArt && window.ChurchArt.stpeter && window.ChurchArt.stpeter[it[0]]; if (!a) return;
          var im = new Image();
          im.onload = function () { var tx = new T.Texture(im); tx.encoding = T.sRGBEncoding; tx.anisotropy = 8; tx.needsUpdate = true; it[1](tx); };
          im.src = a.src;
        }
        if (window.ChurchArt && window.ChurchArt.stpeter) { one([key, cb]); return; }
        artWait.push([key, cb]);
        if (artAsked) return;
        artAsked = true;
        var sc = document.createElement('script'); sc.src = 'art_stpeter.js'; sc.async = true; sc.onload = function () { artWait.forEach(one); artWait = []; }; document.head.appendChild(sc);
      }
      function wbox(cx, cz, n, u, d, y, w, h, dep, color, X) {
        var p = onWall(cx, cz, n, u, d), o = { x: p[0], y: y, z: p[1], w: w, h: h, d: dep, ry: Math.atan2(n[0], n[1]), color: color };
        if (X) for (var k in X) o[k] = X[k];
        ctx.box(o);
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



      // 솔로몬식 꼬인 기둥(LOOK_DEV.md §3): 축 자체가 나선으로 감기고(3회전, 베르니니 발다키노처럼) 단면에 깊은 두 골이 같이 돈다.
      // 아래 1/3 은 잔 홈(세로 홈이 함께 꼬임), 위 2/3 는 굵은 꼬임 + 골을 따라 금 잎사귀 알(넝쿨 장식 대용). 청동은 금속 배치(광택·환경 반사).
      function twistCol(x, z, y0, h, r, color) {
        var rings = 72, seg = 28, turns = 3, pos = [], idx = [], i, j, e = r * 0.2;
        for (i = 0; i <= rings; i++) {
          var t = i / rings, y = y0 + h * t, taper = 1 - 0.12 * t, th = turns * PI * 2 * t;
          var cx = x + Math.cos(th) * e * Math.min(1, t * 6) * Math.min(1, (1 - t) * 6), cz = z + Math.sin(th) * e * Math.min(1, t * 6) * Math.min(1, (1 - t) * 6);
          var lower = t < 0.3 ? 1 - t / 0.3 : 0, up = 1 - lower;
          for (j = 0; j < seg; j++) {
            var a = j / seg * PI * 2;
            var groove = Math.cos(2 * (a - th));                 // 두 골이 축과 같이 돈다
            var flute = Math.cos(14 * (a - th * 0.5));          // 아래쪽 잔 홈
            var rr = r * taper * (1 + up * 0.13 * groove + lower * (0.05 * groove + 0.035 * flute));
            pos.push(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr);
          }
        }
        for (i = 0; i < rings; i++) for (j = 0; j < seg; j++) {
          var a0 = i * seg + j, a1 = i * seg + (j + 1) % seg, b0 = (i + 1) * seg + j, b1 = (i + 1) * seg + (j + 1) % seg;
          idx.push(a0, b0, a1, a1, b0, b1);
        }
        var g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3));
        g.setIndex(idx); g.computeVertexNormals();
        ctx.metalB.add(g, color, { flat: false, vary: 0.02, c2: ctx.shade(color, 1.45) });
        // 골을 따라 오르는 금 잎사귀 알(위 2/3, 회전마다 7개 × 두 골)
        var leaf = Geo.ico ? Geo.ico(0) : null;
        if (leaf) for (i = 0; i < turns * 7; i++) {
          var tt = 0.32 + 0.64 * (i + 0.5) / (turns * 7), thh = turns * PI * 2 * tt;
          for (var k = 0; k < 2; k++) {
            var aa = thh + PI / 2 + k * PI, rl = r * (1 - 0.12 * tt) * 0.93;
            var ccx = x + Math.cos(thh) * e, ccz = z + Math.sin(thh) * e;
            ctx.metalB.add(leaf, k ? GOLD_D : GOLD, { x: ccx + Math.cos(aa) * rl, y: y0 + h * tt, z: ccz + Math.sin(aa) * rl, sx: 0.05, sy: 0.075, sz: 0.05, flat: true, vary: 0.05 });
          }
        }
      }

      // 가벼운 조각상(원뿔 옷 + 망토 + 머리). 정면 = ry 방향(atan2(nx,nz))
      function figure(o) {
        var h = o.h || 1.7, y = o.y || 0, kind = o.kind || 'saint', sc = h / 1.7, ry = o.ry || 0;
        var robe = o.robe === undefined ? (kind === 'mary' ? 0xf4f0ea : 0xe6dccb) : o.robe, mantle = o.mantle === undefined ? (kind === 'mary' ? 0xcfd9ea : 0xcdbfa6) : o.mantle, skin = o.skin === undefined ? 0xf3dcc4 : o.skin;
        var sa = Math.sin(ry), ca = Math.cos(ry);
        var ST = (o.robe === undefined) ? { surf: 'marble_white' } : {};
        ctx.cyl({ x: o.x, y: y, z: o.z, r: 0.32 * sc, rTop: 0.14 * sc, h: h * 0.72, seg: 7, color: robe, surf: ST.surf });
        ctx.cyl({ x: o.x - 0.13 * sc * sa, y: y + h * 0.04, z: o.z - 0.13 * sc * ca, r: 0.34 * sc, rTop: 0.17 * sc, h: h * 0.7, seg: 6, color: mantle, surf: ST.surf });
        ctx.ico({ x: o.x, y: y + h * 0.82, z: o.z, r: 0.17 * sc, color: skin, detail: 1, flat: false });
        ctx.box({ x: o.x + 0.2 * sc * sa, y: y + h * 0.5, z: o.z + 0.2 * sc * ca, w: 0.34 * sc, h: 0.1 * sc, d: 0.1 * sc, color: robe, ry: ry });
        if (kind === 'angel') {
          [-1, 1].forEach(function (sg) { ctx.box({ x: o.x - 0.16 * sc * sa + sg * 0.26 * sc * ca, y: y + h * 0.45, z: o.z - 0.16 * sc * ca - sg * 0.26 * sc * sa, w: 0.08 * sc, h: h * 0.42, d: 0.3 * sc, color: 0xffffff, ry: ry, rz: sg * 0.4 }); });
        }
      }

      // 홈 파인 거대 벽기둥(코린트식). 벽 위 (cx,cz), 실내 법선 n, 기둥 중심 u 위치
      function pilaster(cx, cz, n, u, h, o) {
        o = o || {};
        var W = o.w || 0.95, Pr = 0.3, col = o.color || CREAM, y0 = o.y0 || 0;
        var plinthH = 0.5, baseH = 0.22, capH = 1.0;
        var MS = { surf: 'marble_beige' };
        wbox(cx, cz, n, u, (Pr + 0.2) / 2, y0, W + 0.36, plinthH, Pr + 0.2, ctx.shade(col, 0.94), MS);
        wbox(cx, cz, n, u, (Pr + 0.14) / 2, y0 + plinthH, W + 0.2, baseH * 0.55, Pr + 0.14, col, MS);
        wbox(cx, cz, n, u, (Pr + 0.08) / 2, y0 + plinthH + baseH * 0.55, W + 0.1, baseH * 0.45, Pr + 0.08, ctx.shade(col, 1.04), MS);
        var sh = h - plinthH - baseH - capH;
        wbox(cx, cz, n, u, Pr / 2, y0 + plinthH + baseH, W, sh, Pr, col, MS);
        for (var f = -2; f <= 2; f += 1) wbox(cx, cz, n, u + f * 0.17, Pr / 2 + 0.006, y0 + plinthH + baseH + 0.12, 0.05, sh - 0.24, Pr + 0.012, ctx.shade(col, 0.74));
        var cy = y0 + h - capH;
        wbox(cx, cz, n, u, (Pr + 0.1) / 2, cy, W + 0.1, 0.3, Pr + 0.1, GOLD_D, { mat: 'metal' });
        for (var k = -1; k <= 1; k++) wico(cx, cz, n, u + k * 0.26, Pr + 0.02, cy + 0.42, 0.14, k % 2 ? GOLD : GOLD_D);
        wbox(cx, cz, n, u, (Pr + 0.18) / 2, cy + 0.3, W + 0.2, 0.36, Pr + 0.18, GOLD, { mat: 'metal' });
        wbox(cx, cz, n, u, (Pr + 0.3) / 2, cy + 0.82, W + 0.36, 0.18, Pr + 0.3, ctx.shade(col, 1.03));
      }

      // 벽을 따르는 엔타블러처(건축보·프리즈 면·코니스). A,B = 벽 위 두 점 (x,z), f=실내 법선
      function entablature(ax, az, bx, bz, f, tex, y0) {
        y0 = y0 === undefined ? 10.4 : y0;
        ctx.cornice({ x0: ax, z0: az, x1: bx, z1: bz, y: y0, h: 0.5, depth: 0.26, facing: f, color: CREAM_D, surf: 'marble_beige' });
        if (tex) ctx.wallFace({ x0: ax + f[0] * 0.11, z0: az + f[1] * 0.11, x1: bx + f[0] * 0.11, z1: bz + f[1] * 0.11, y0: y0 + 0.5, y1: y0 + 1.2, facing: f, tex: tex, tile: [16, 0.7] });
        ctx.cornice({ x0: ax, z0: az, x1: bx, z1: bz, y: y0 + 1.2, h: 0.12, depth: 0.2, facing: f, color: GOLD_D });
        ctx.cornice({ x0: ax, z0: az, x1: bx, z1: bz, y: y0 + 1.32, h: 0.2, depth: 0.36, facing: f, color: CREAM, surf: 'marble_beige' });
        ctx.cornice({ x0: ax, z0: az, x1: bx, z1: bz, y: y0 + 1.52, h: 0.4, depth: 0.58, facing: f, color: ctx.shade(CREAM, 1.03), surf: 'marble_beige' });
        ctx.cornice({ x0: ax, z0: az, x1: bx, z1: bz, y: y0 + 1.92, h: 0.2, depth: 0.5, facing: f, color: GOLD_D });
      }

      // 압출 패널(구멍 가능)
      function extrude(shape, depth, color, x, y, z, rotY) {
        var g = new T.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false, curveSegments: 10 });
        if (rotY) g.rotateY(rotY);
        ctx.surfBatch('travertine').add(g, 0xe0d6c0, { x: x, y: y, z: z, flat: true });
      }
      function archHolePath(cx, y0, w, hRect) {
        var p = new T.Path();
        p.moveTo(cx - w / 2, y0); p.lineTo(cx + w / 2, y0); p.lineTo(cx + w / 2, y0 + hRect);
        p.absarc(cx, y0 + hRect, w / 2, 0, PI, false);
        p.lineTo(cx - w / 2, y0);
        return p;
      }

      // ---- 회랑·경당용 가벼운 부품(I-5): 기존 배치(석회암·대리석·광택·금속)에 합쳐져 draw call 을 늘리지 않는다 ----
      function wq(x0, z0, x1, z1, y0, y1, hx, hz) {   // 안쪽 면만 있는 벽(석회암). (hx,hz) = 실내 쪽 점
        ctx.surfBatch('travertine').addQuad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], 0xe0d6c0, [hx, (y0 + y1) / 2, hz]);
      }
      function col2(xa, xb, z0, z1) { ctx.addCollider({ x0: Math.min(xa, xb), x1: Math.max(xa, xb), z0: Math.min(z0, z1), z1: Math.max(z0, z1) }); }
      function colWall(cx, cz, n, hw2, dep) { var a = onWall(cx, cz, n, -hw2, 0), b = onWall(cx, cz, n, hw2, dep); col2(a[0], b[0], a[1], b[1]); }
      // 아치 구멍이 난 벽(x 방향 / z 방향). 두께 th 는 zBack(xMin) 에서 +쪽으로
      function archWallX(xa, xb, zBack, th, top, cx, span, spring) {
        var x0 = Math.min(xa, xb), x1 = Math.max(xa, xb), sh = new T.Shape();
        sh.moveTo(x0, 0); sh.lineTo(x1, 0); sh.lineTo(x1, top); sh.lineTo(x0, top); sh.lineTo(x0, 0);
        sh.holes.push(archHolePath(cx, 0, span, spring));
        extrude(sh, th, CREAM, 0, 0, zBack, 0);
      }
      function archWallZ(z0, z1, xMin, th, top, cz, span, spring) {
        var sh = new T.Shape();
        sh.moveTo(-z1, 0); sh.lineTo(-z0, 0); sh.lineTo(-z0, top); sh.lineTo(-z1, top); sh.lineTo(-z1, 0);
        sh.holes.push(archHolePath(-cz, 0, span, spring));
        extrude(sh, th, CREAM, xMin, 0, 0, PI / 2);
      }
      // 작은 오더 벽기둥(상자 5개: 받침·몸·오목 판·금 주두·주두 판) · 임포스트 엔타블러처(상자 3개) · 색 대리석 상감 판(사각형 2장)
      function lpil(cx, cz, n, u, h) {
        h = h || AMB_Y - 0.52;
        var MS = { surf: 'marble_beige' }, W = 0.72, fc = ctx.shade(CREAM, 0.76);
        wbox(cx, cz, n, u, 0.13, 0, W + 0.3, 0.45, 0.26, CREAM_D, MS);
        wbox(cx, cz, n, u, 0.09, 0.45, W, h - 0.95, 0.18, CREAM, MS);
        wbox(cx, cz, n, u, 0.094, 0.68, 0.4, h - 1.42, 0.19, fc);
        wbox(cx, cz, n, u, 0.12, h - 0.5, W + 0.1, 0.3, 0.24, GOLD_D, { mat: 'metal' });
        wbox(cx, cz, n, u, 0.15, h - 0.2, W + 0.26, 0.2, 0.3, CREAM, MS);
      }
      function ent2(ax, az, bx, bz, f, y) {
        y = y === undefined ? AMB_Y - 0.52 : y;
        var mx = (ax + bx) / 2, mz = (az + bz) / 2, len = Math.sqrt((bx - ax) * (bx - ax) + (bz - az) * (bz - az));
        wbox(mx, mz, f, 0, 0.06, y, len, 0.26, 0.12, CREAM_D, { surf: 'marble_beige' });
        wbox(mx, mz, f, 0, 0.04, y + 0.26, len, 0.06, 0.08, GOLD_D, { mat: 'metal' });
        wbox(mx, mz, f, 0, 0.15, y + 0.32, len, 0.2, 0.3, CREAM, { surf: 'marble_beige' });
      }
      function panel(cx, cz, n, u, y, w, h, color) {
        function Q(g, d, c) {
          var a = onWall(cx, cz, n, u - w / 2 - g, d), b = onWall(cx, cz, n, u + w / 2 + g, d), hp = onWall(cx, cz, n, u, d + 1);
          ctx.gloss.addQuad([a[0], y - g, a[1]], [b[0], y - g, b[1]], [b[0], y + h + g, b[1]], [a[0], y + h + g, a[1]], c, [hp[0], y + h / 2, hp[1]]);
        }
        Q(0.1, 0.012, 0xcbbd9f); Q(0, 0.024, 0xc9a15a); Q(-0.26, 0.036, color);
      }
      // 벽 앞 제대(단 + 제대 + 제단화 틀·색 대리석 기둥 2 + 박공 + 촛대 2). (x,z) = 벽 위 가운데, n = 실내 법선. 불꽃은 발광 배치(스프라이트 없음)
      function sideAltar(x, z, n, w, pic, o) {
        o = o || {};
        var ry = Math.atan2(n[0], n[1]), a = onWall(x, z, n, 0, 0.62), fw = w + 0.2, fh = o.fh || 3.6, fy = 1.55;
        wbox(x, z, n, 0, 0.75, 0, w + 1.0, 0.14, 1.5, 0xe2dac8, { surf: 'marble_white' });
        ctx.altar({ x: a[0], z: a[1], y: 0.14, w: w, d: 0.9, h: 1.0, ry: ry, style: 'block', cloth: true, candles: 0, flowers: false, collide: false });
        colWall(x, z, n, (w + 1.0) / 2, 1.5);
        var ph = fh - 0.36;
        wbox(x, z, n, 0, 0.07, fy, fw, fh, 0.14, 0x8a6a3a, { mat: 'gloss' });
        wbox(x, z, n, 0, 0.1, fy + 0.18, fw - 0.36, ph, 0.12, ctx.shade(pic, 0.8));
        wbox(x, z, n, 0, 0.105, fy + 0.18 + ph * 0.5, fw - 0.36, ph * 0.5, 0.12, ctx.shade(pic, 1.45));
        var f0 = fy + 0.18 + ph * 0.14, f1 = f0 + ph * 0.5, hp = onWall(x, z, n, 0, 2), hint = [hp[0], f0, hp[1]];
        function W3(u, y, d) { var q = onWall(x, z, n, u, d); return [q[0], y, q[1]]; }
        function oct(rr, d, col) {
          var tr = [], k8;
          for (k8 = 0; k8 < 8; k8++) { var b0 = k8 * PI / 4, b1 = b0 + PI / 4; tr = tr.concat(W3(0, f1 + 0.17, d), W3(Math.cos(b0) * rr, f1 + 0.17 + Math.sin(b0) * rr, d), W3(Math.cos(b1) * rr, f1 + 0.17 + Math.sin(b1) * rr, d)); }
          solid.addTris(tr, col, hint);
        }
        if (!o.noFigure) {   // noFigure: 그림 속 인물(크림 삼각형·후광)을 그리지 않는다(제대 위에 입체 성모상이 선다: shrine.js)
          solid.addQuad(W3(-0.4, f0, 0.176), W3(0.4, f0, 0.176), W3(0.14, f1, 0.176), W3(-0.14, f1, 0.176), o.pic2 === undefined ? 0xf1e6cf : o.pic2, hint);
          oct(0.27, 0.172, 0xd8b13f); oct(0.15, 0.18, 0xf3dcc4);
        }
        [-1, 1].forEach(function (k) {
          var c = onWall(x, z, n, k * (fw / 2 + 0.24), 0.22), q = onWall(x, z, n, k * (w / 2 - 0.25), 0.42);
          ctx.cyl({ x: c[0], y: 1.2, z: c[1], r: 0.15, rTop: 0.13, h: fh + 0.35, seg: 8, color: o.colc || RED, mat: 'gloss' });
          ctx.cyl({ x: q[0], y: 1.17, z: q[1], r: 0.07, rTop: 0.03, h: 0.42, seg: 6, color: GOLD });
          ctx.cyl({ x: q[0], y: 1.59, z: q[1], r: 0.028, h: 0.3, seg: 5, color: 0xfff6e0, mat: 'solid' });
          glow.add(Geo.cyl(4, 0), 0xffd78a, { x: q[0], y: 1.89, z: q[1], sx: 0.03, sy: 0.12, sz: 0.03, flat: true, vary: 0 });
        });
        wbox(x, z, n, 0, 0.22, fy + fh, fw + 1.1, 0.26, 0.44, CREAM, { surf: 'marble_beige' });
        wbox(x, z, n, 0, 0.16, fy + fh + 0.26, fw * 0.62, 0.36, 0.3, GOLD_D);
      }
      // 피어 면 기념비(색 대리석 판 + 검은 대좌 + 붉은 석관 + 흰 상)
      function monument(cx, cz, n, tint) {
        panel(cx, cz, n, 0, 0.9, 2.2, 4.0, tint);
        wbox(cx, cz, n, 0, 0.3, 0, 2.3, 0.9, 0.6, 0x3a3532, { mat: 'gloss' });
        wbox(cx, cz, n, 0, 0.26, 0.9, 1.8, 0.7, 0.5, RED, { mat: 'gloss' });
        var p = onWall(cx, cz, n, 0, 0.3);
        figure({ x: p[0], y: 1.6, z: p[1], h: 1.9, kind: 'saint', ry: Math.atan2(n[0], n[1]), robe: 0xf1ece2, mantle: 0xe2dccf });
        colWall(cx, cz, n, 1.2, 0.62);
      }
      // 모서리 경당의 작은 돔: 네 벽의 반원 호(시작선 ys)에서 고리(ringY)로 올라가는 펜던티브 + 금 모자이크/남색 띠 돔 + 정상 채광 원반
      function cornerDome(cx, cz, hx, hz, ys, ringY, r, rise) {
        var M = low ? 4 : 6, NT = 3, seg = low ? 12 : 16, rings = 5, rOc = 0.5, i, j, R = ringY - ys;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var hw2 = d[0] ? hz : hx, hd = d[0] ? hx : hz;   // 벽 반길이, 중심에서 벽까지
          function P(k, t) {
            var w = -hw2 + 2 * hw2 * k / M, yA = ys + R * Math.sqrt(Math.max(0, 1 - (w / hw2) * (w / hw2)));
            var bx = d[0] ? d[0] * hd : w, bz = d[0] ? w : d[1] * hd, ang = Math.atan2(bz, bx);
            var e = t * t * (3 - 2 * t), px = bx + (r * Math.cos(ang) - bx) * e, pz = bz + (r * Math.sin(ang) - bz) * e;
            return [cx + px, yA + (ringY - yA) * t, cz + pz];
          }
          for (i = 0; i < M; i++) for (j = 0; j < NT; j++) solid.addQuad(P(i, j / NT), P(i + 1, j / NT), P(i + 1, (j + 1) / NT), P(i, (j + 1) / NT), 0xcfa94a, [cx, ys, cz], { vary: 0.04 });
        });
        var y0 = ringY + 0.3, phM = Math.acos(rOc / r);
        function Pp(rr, a, y) { return [cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr]; }
        function D(a, ph) { return [cx + r * Math.cos(ph) * Math.cos(a), y0 + rise * Math.sin(ph), cz + r * Math.cos(ph) * Math.sin(a)]; }
        for (i = 0; i < seg; i++) {
          var a0 = i / seg * PI * 2, a1 = (i + 1) / seg * PI * 2;
          solid.addQuad(Pp(r - 0.1, a0, ringY), Pp(r - 0.1, a1, ringY), Pp(r - 0.1, a1, y0), Pp(r - 0.1, a0, y0), CREAM, [cx, ringY, cz]);
          solid.addQuad(Pp(r - 0.1, a0, ringY), Pp(r - 0.1, a1, ringY), Pp(r + 0.06, a1, ringY), Pp(r + 0.06, a0, ringY), GOLD_D, [cx, ringY - 3, cz]);
          for (j = 0; j < rings; j++) {
            var h0 = phM * j / rings, h1 = phM * (j + 1) / rings, gold = j === rings - 1 || (i + j) % 2 === 0;
            solid.addQuad(D(a0, h0), D(a1, h0), D(a1, h1), D(a0, h1), j === rings - 1 ? 0xf6e4a0 : (gold ? 0xd8b13f : (j % 2 ? 0x34548a : BLUE)), [cx, ringY - 2, cz], { vary: 0.03 });
          }
        }
        glow.add(Geo.cyl(10, 1), 0xfff3cf, { x: cx, y: y0 + rise * Math.sin(phM) - 0.02, z: cz, sx: rOc * 1.05, sy: 0.02, sz: rOc * 1.05, flat: true, vary: 0 });
      }

      // 평면 창살 유리 패널. p0=왼쪽아래, U=폭 벡터, V=높이 벡터, hint=보는 쪽 점, off=뒤판 이동
      function paneGrid(p0, U, V, cols, rows, colors, hint, off) {
        var p1 = P3(p0, U), p3 = P3(p0, V), p2 = P3(p1, V);
        if (off) {
          glass.addQuad(P3(p0, off), P3(p1, off), P3(p2, off), P3(p3, off), 0x2b231f, hint, { vary: 0 });
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
        g.fillStyle = '#f2eadb'; g.fillRect(0, 0, w, h);
        for (i = 0; i < 700; i++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '120,100,80,' : '255,250,235,') + (rnd() * 0.07) + ')'; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 9, 0, 6.3); g.fill(); }
        // 바깥 띠
        g.fillStyle = '#c7c1b2'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14); g.fillRect(0, 0, 14, h); g.fillRect(w - 14, 0, 14, h);
        g.fillStyle = '#93b09e'; g.fillRect(14, 14, w - 28, 5); g.fillRect(14, h - 19, w - 28, 5); g.fillRect(14, 14, 5, h - 28); g.fillRect(w - 19, 14, 5, h - 28);
        // 모서리 사분원
        [[0, 0], [w, 0], [0, h], [w, h]].forEach(function (c) {
          g.fillStyle = '#b4b6b6'; g.beginPath(); g.arc(c[0], c[1], R * 0.62, 0, 6.3); g.fill();
          g.fillStyle = '#f2eadb'; g.beginPath(); g.arc(c[0], c[1], R * 0.54, 0, 6.3); g.fill();
          g.fillStyle = '#c99088'; g.beginPath(); g.arc(c[0], c[1], R * 0.36, 0, 6.3); g.fill();
          g.fillStyle = '#e9d6a6'; g.beginPath(); g.arc(c[0], c[1], R * 0.2, 0, 6.3); g.fill();
        });
        // 마름모 + 중앙 원
        g.strokeStyle = '#d8b873'; g.lineWidth = 4; g.beginPath(); g.moveTo(R, 22); g.lineTo(w - 22, R); g.lineTo(R, h - 22); g.lineTo(22, R); g.closePath(); g.stroke();
        g.fillStyle = '#e9d6a6'; g.beginPath(); g.moveTo(R, 36); g.lineTo(w - 36, R); g.lineTo(R, h - 36); g.lineTo(36, R); g.closePath(); g.fill();
        var rings = [[0.40, '#c99088'], [0.355, '#f4efe4'], [0.325, '#93b09e'], [0.28, '#e9d6a6'], [0.22, '#b4b6b6'], [0.17, '#c99088'], [0.12, '#f4efe4']];
        rings.forEach(function (r) { g.fillStyle = r[1]; g.beginPath(); g.arc(R, R, w * r[0], 0, 6.3); g.fill(); });
        g.fillStyle = '#d8b873';
        for (i = 0; i < 12; i++) { var a = i * PI / 6; g.beginPath(); g.moveTo(R, R); g.lineTo(R + Math.cos(a - 0.12) * w * 0.11, R + Math.sin(a - 0.12) * w * 0.11); g.lineTo(R + Math.cos(a) * w * 0.19, R + Math.sin(a) * w * 0.19); g.lineTo(R + Math.cos(a + 0.12) * w * 0.11, R + Math.sin(a + 0.12) * w * 0.11); g.fill(); }
        g.strokeStyle = 'rgba(80,60,50,0.5)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
        for (i = 0; i < 40; i++) { g.strokeStyle = 'rgba(110,90,80,' + (0.04 + rnd() * 0.08) + ')'; g.lineWidth = 1; g.beginPath(); var vx = rnd() * w, vy = rnd() * h; g.moveTo(vx, vy); for (var s = 0; s < 4; s++) { vx += (rnd() - 0.5) * 80; vy += (rnd() - 0.5) * 80; g.lineTo(vx, vy); } g.stroke(); }
      });
      var texCross = ctx.tex.custom(1024, 1024, function (g, w, h) {
        var R = w / 2, i;
        g.fillStyle = '#f0e6d2'; g.fillRect(0, 0, w, h);
        for (i = 0; i < 900; i++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '120,100,80,' : '255,250,235,') + (rnd() * 0.07) + ')'; g.beginPath(); g.arc(rnd() * w, rnd() * h, 3 + rnd() * 14, 0, 6.3); g.fill(); }
        g.fillStyle = '#c7c1b2'; g.fillRect(0, 0, w, 22); g.fillRect(0, h - 22, w, 22); g.fillRect(0, 0, 22, h); g.fillRect(w - 22, 0, 22, h);
        // 큰 팔각 + 원
        var rings = [[0.46, '#b4b6b6'], [0.44, '#f4efe4'], [0.41, '#b0645a'], [0.36, '#e6c17a'], [0.33, '#7f9c84'], [0.28, '#f4efe4'], [0.24, '#b0645a'], [0.19, '#e6c17a'], [0.13, '#2f4c7a'], [0.07, '#e6c17a']];
        rings.forEach(function (r) { g.fillStyle = r[1]; g.beginPath(); g.arc(R, R, w * r[0], 0, 6.3); g.fill(); });
        for (i = 0; i < 16; i++) { var a = i * PI / 8; g.fillStyle = i % 2 ? '#f4efe4' : '#b4b6b6'; g.beginPath(); g.moveTo(R, R); g.lineTo(R + Math.cos(a - 0.14) * w * 0.28, R + Math.sin(a - 0.14) * w * 0.28); g.lineTo(R + Math.cos(a) * w * 0.4, R + Math.sin(a) * w * 0.4); g.lineTo(R + Math.cos(a + 0.14) * w * 0.28, R + Math.sin(a + 0.14) * w * 0.28); g.fill(); }
        [[0.14, 0.14], [0.86, 0.14], [0.14, 0.86], [0.86, 0.86]].forEach(function (c) {
          [[0.1, '#b4b6b6'], [0.085, '#f4efe4'], [0.07, '#b0645a'], [0.045, '#e6c17a'], [0.02, '#7f9c84']].forEach(function (r) { g.fillStyle = r[1]; g.beginPath(); g.arc(c[0] * w, c[1] * h, w * r[0], 0, 6.3); g.fill(); });
        });
        g.strokeStyle = '#cfa24a'; g.lineWidth = 5; g.strokeRect(60, 60, w - 120, h - 120);
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
      ctx.floor({ x0: -13.35, x1: 13.35, z0: -0.125, z1: 34.475, y: 0, tex: texFloor, tile: [8.9, 8.65], gloss: 0.9, reflect: true });
      ctx.floor({ x0: -26.7, x1: 26.7, z0: -13.45, z1: -4.55, y: 0, tex: texFloor, tile: [8.9, 8.9], gloss: 0.85, reflect: false });
      ctx.floor({ x0: -8.5, x1: 8.5, z0: -17.625, z1: -0.125, y: 0.012, tex: texCross, tile: [17, 17.5], gloss: 0.9, reflect: true });
      ctx.floor({ x0: -4.45, x1: 4.45, z0: -35.3, z1: -17.5, y: 0, tex: texFloor, tile: [8.9, 8.9], gloss: 0.85, reflect: false });
      // 회랑·모서리 경당·대경당 바닥(I-5): 같은 질감·광택 0.85 판이라 익랑·후진 팔 바닥과 한 메시로 합쳐진다(draw call +0). 칸마다 원형 무늬 한 장
      [-1, 1].forEach(function (s) {
        function fl(xa, xb, z0, z1) { ctx.floor({ x0: Math.min(s * xa, s * xb), x1: Math.max(s * xa, s * xb), z0: z0, z1: z1, y: 0.01, tex: texFloor, tile: [Math.abs(xb - xa), z1 - z0], gloss: 0.85, reflect: false }); }
        fl(AISLE_OUT, R_OUT, 1.95, 7.75); fl(AISLE_OUT, R_OUT, -4.75, 1.95);
        fl(AISLE_OUT, R_OUT, -19.95, -13.25); fl(AISLE_OUT, R_OUT, -25.75, -19.95); fl(4.25, AISLE_OUT, -25.75, -19.95);
        fl(AISLE_OUT + 0.6, 16.95, 9.1, 16.6);
      });
      // 입구 붉은 반암 원반 + 중심축 황동 표시
      ctx.cyl({ x: 0, y: 0, z: 32.0, r: 0.62, h: 0.03, seg: 20, color: 0x9c3a34 });
      ctx.cyl({ x: 0, y: 0.03, z: 32.0, r: 0.66, rTop: 0.66, h: 0.012, seg: 20, color: GOLD_D, vary: 0 });
      ctx.cyl({ x: 0, y: 0.04, z: 32.0, r: 0.54, h: 0.012, seg: 20, color: 0xb04640, vary: 0 });
      [26.5, 22.0, 17.5, 13.0, 8.5].forEach(function (z) { ctx.box({ x: 0, y: 0, z: z, w: 1.4, h: 0.02, d: 0.09, color: GOLD_D, vary: 0 }); });

      VC('floors');
      // ---------------------------------------------------------------- 신랑 아케이드(양쪽)
      var pilNave = [];
      [-1, 1].forEach(function (s) {
        var n = [-s, 0];
        PIERS.forEach(function (pz, pi) {
          var zc = (pz[0] + pz[1]) / 2, len = pz[1] - pz[0], hc = hw(zc);
          ctx.box({ x: s * (hc + PIER_OUT) / 2, y: 0, z: zc, w: PIER_OUT - hc, h: YS, d: len, color: 0xe0d6c0, surf: 'travertine' });
          ctx.aoDecal({ x0: s * hc - 0.0, x1: s * PIER_OUT, z0: zc - len / 2, z1: zc + len / 2, y: 0, pad: 0.3 });
          // 걸레받이/받침
          ctx.box({ x: s * (hc + PIER_OUT) / 2, y: 0, z: zc, w: PIER_OUT - hc + 0.22, h: 0.55, d: len + 0.22, color: CREAM_D, surf: 'marble_beige' });
          // 신랑 쪽 벽기둥 2개 + 가운데 벽감
          if (pi > 0) {
            var off = len / 2 - 0.62;
            pilaster(s * hc, zc, n, -off, 10.4); pilaster(s * hc, zc, n, off, 10.4);
            niche(s * hc, zc, n, 0, 1.2, 1.5, 3.3, 'saint');
            niche(s * hc, zc, n, 0, 6.0, 1.2, 2.3, pi % 2 ? 'mary' : 'saint');
            // 다색 대리석 상감(붉은/녹색 띠)
            wbox(s * hc, zc, n, -off + 0.0, 0.34, 1.3, 0.28, 7.6, 0.05, (pi + s) % 2 ? RED : GREEN, { mat: 'gloss' });
            wbox(s * hc, zc, n, off, 0.34, 1.3, 0.28, 7.6, 0.05, (pi + s) % 2 ? GREEN : RED, { mat: 'gloss' });
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
          ctx.box({ x: d[0], y: 0, z: ZE + 0.28, w: d[1] - 0.04, h: d[2], d: 0.16, color: BRONZE, mat: 'metal' });
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
      // o.also = [{axis,t0,t1,c,aF,y0,rise,step}…]: 같은 재질의 다른 원통 조각(회랑 통로 궁륭)을 같은 메시에 넣는다(draw call +0). step = 길이 방향 분할(기본 0.95)
      function barrel(o) {
        var N = 28, pos = [], nor = [], uv = [], idx = [], tile0 = o.tile || 1.25;
        function gen(o) {
        var ax = o.axis === 'x' ? 'x' : 'z', aF = o.aF, c = o.c, y0 = o.y0, rise = o.rise, tile = o.tile || tile0;
        var edges = [o.t0, o.t1];
        (o.lun || []).forEach(function (l) { edges.push(l.t - l.w, l.t + l.w); });
        edges.sort(function (a, b) { return a - b; });
        var uni = [edges[0]];
        for (var q = 1; q < edges.length; q++) if (edges[q] - uni[uni.length - 1] > 1e-3) uni.push(edges[q]);
        var br = [];
        for (q = 0; q < uni.length - 1; q++) {
          var len = uni[q + 1] - uni[q], nn = Math.max(1, Math.ceil(len / (o.step || 0.95)));
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
        return { pt: pt, outN: outN };
        }
        var G0 = gen(o), pt = G0.pt, outN = G0.outN, ax = o.axis === 'x' ? 'x' : 'z', c = o.c;
        (o.also || []).forEach(gen);
        var geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3));
        geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(nor), 3));
        geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(uv), 2));
        geo.setIndex(idx);
        var mat = ctx.mats.standard({ map: o.tex, color: 0xffffff, side: T.DoubleSide, metalness: 0.5, roughness: 0.5 });
        ctx.mesh(geo, mat);
        // 채광창(진짜 구멍) : 측면 두께 + 뒤쪽 유리
        (o.lun || []).forEach(function (l) {
          [1, -1].forEach(function (sd) {
            var jA = sd > 0 ? N - 6 : 1, jB = sd > 0 ? N - 1 : 6, tA = l.t - l.w, tB = l.t + l.w, d = 0.3;
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
            var cols = 3, rows = jB - jA, hc0 = I((tA + tB) / 2, (jA + jB) / 2);
            var hintIn = ax === 'z' ? [c, hc0[1] - 1.0, hc0[2]] : [hc0[0], hc0[1] - 1.0, c];
            for (var rr = 0; rr < rows; rr++) for (var cc = 0; cc < cols; cc++) {
              var t0 = tA + (tB - tA) * cc / cols, t1 = tA + (tB - tA) * (cc + 1) / cols, j0 = jA + rr, j1 = jA + rr + 1;
              var qd = [Ob(t0, j0, d - 0.1), Ob(t1, j0, d - 0.1), Ob(t1, j1, d - 0.1), Ob(t0, j1, d - 0.1)], mc = [0, 0, 0];
              qd.forEach(function (p) { mc[0] += p[0] / 4; mc[1] += p[1] / 4; mc[2] += p[2] / 4; });
              var sq = qd.map(function (p) { return [mc[0] + (p[0] - mc[0]) * 0.86, mc[1] + (p[1] - mc[1]) * 0.86, mc[2] + (p[2] - mc[2]) * 0.86]; });
              glass.addQuad(sq[0], sq[1], sq[2], sq[3], GLASS_PALE[(cc + rr * 2) % 4], hintIn, { vary: 0.05 });
            }
            for (var rb = 0; rb < rows; rb++) for (var cb = 0; cb < cols; cb++) {
              var tb0 = tA + (tB - tA) * cb / cols, tb1 = tA + (tB - tA) * (cb + 1) / cols, jb0 = jA + rb, jb1 = jA + rb + 1;
              glass.addQuad(Ob(tb0, jb0, d + 0.01), Ob(tb1, jb0, d + 0.01), Ob(tb1, jb1, d + 0.01), Ob(tb0, jb1, d + 0.01), 0x2b231f, hintIn, { vary: 0 });
            }
            // 빛줄기: 창 중심(안쪽 면), 실내를 향한 수평 법선
            var cpt = I((tA + tB) / 2, (jA + jB) / 2);
            var face = ax === 'z' ? [sd > 0 ? -1 : 1, 0] : [0, sd > 0 ? -1 : 1];
            if (o.beams !== false && l.beam !== false) ctx.addWindowBeam({ x: cpt[0], y: cpt[1], z: cpt[2], face: face, w: (tB - tA) * 0.9, h: 2.2, colors: [0xfff1c0, 0xffe39a, 0xfff6dc], reach: o.beamReach || 8.5 });
          });
        });
      }

      // ---- 신랑 궁륭(입구 ~ 교차부 아치면) ----
      barrel({ axis: 'z', t0: -2.5, t1: ZE, c: 0, aF: function (z) { return hw(z); }, y0: YS, rise: RISE, tex: texCoffer, tile: 1.3, lun: ARCHZ.map(function (z, i) { return { t: z, w: 1.2, beam: i % 2 === 0 }; }) });
      // 횡단 늑골(칸 경계)
      [8.525, 17.175, 25.825].forEach(function (z) { ctx.vaultRib({ axis: 'z', center: 0, pos: z, y: YS, a: hw(z) + 0.15, rise: RISE + 0.15, profile: 'round', t: 0.42, d: 0.55, color: CREAM }); ctx.vaultRib({ axis: 'z', center: 0, pos: z, y: YS, a: hw(z) + 0.15, rise: RISE + 0.15, profile: 'round', t: 0.12, d: 0.7, color: GOLD }); });

      // ---- 익랑(동·서) 궁륭 + 후진 팔 궁륭 ----
      [-1, 1].forEach(function (s) {
        var amb = function (axis, c, a, t0, t1) { return { axis: axis, c: c, aF: function () { return a; }, y0: AMB_Y, rise: a, t0: Math.min(t0, t1), t1: Math.max(t0, t1), step: 4 }; };
        barrel({ axis: 'x', t0: s > 0 ? 6.5 : -21.25, t1: s > 0 ? 21.25 : -6.5, c: CZ, aF: function () { return 4.25; }, y0: YS, rise: RISE, tex: texCoffer, tile: 1.3, step: 4, lun: [s * 13.0, s * 17.3].map(function (t, i) { return { t: t, w: 1.1, beam: i === 0 }; }), beamReach: 8,
          also: [amb('z', s * 13.825, 2.875, -4.15, 1.45), amb('z', s * 13.825, 2.875, -19.45, -13.85), amb('x', -22.85, 2.9, s * 4.85, s * 10.45)] });
      });
      barrel({ axis: 'z', t0: -30.25, t1: -15.5, c: 0, aF: function () { return 4.25; }, y0: YS, rise: RISE, tex: texCoffer, tile: 1.3, step: 4, lun: [-18.6, -26.5].map(function (t, i) { return { t: t, w: 1.1, beam: i === 0 }; }), beamReach: 8 });

      VC('vaults');
      // 대경당(아치 3번 칸, I-5 ④): 오른쪽(+x) 성체 경당 / 왼쪽(−x) 성가대 경당. 걸어 들어가는 깊은 방 x ±11.55…±16.95, z 9.1…16.6
      function deepChapel(s, zc) {
        var xa = s * (AISLE_OUT + 0.6), xb = s * 16.95, zA = 9.1, zB = 16.6, xm = (xa + xb) / 2, nB = [-s, 0], wy = 8.3;
        wq(xb, zA, xb, zB, 0, wy, xm, zc); wq(xa, zA, xb, zA, 0, wy, xm, zc); wq(xa, zB, xb, zB, 0, wy, xm, zc);
        ctx.vault({ type: 'barrel', axis: 'z', x0: Math.min(xa, xb), x1: Math.max(xa, xb), z0: zA, z1: zB, y: 6.2, rise: 2.0, seg: 12, color: 0xefe6d2 });
        ent2(xb, zA, xb, zB, nB, 5.68); ent2(xa, zA, xb, zA, [0, 1], 5.68); ent2(xa, zB, xb, zB, [0, -1], 5.68);
        col2(xb, s * 17.35, zA, zB); col2(xa, s * 17.35, zB, zB + 0.4);
        // 격자문: 열어 둔 청동 문짝 2장(입구 안쪽)
        [-1, 1].forEach(function (k) {
          var gz = zc + k * 1.68, gx = s * (AISLE_OUT + 1.35);
          ctx.box({ x: gx, y: 0, z: gz, w: 1.45, h: 3.3, d: 0.06, color: BRONZE, mat: 'metal' });
          ctx.box({ x: gx, y: 3.3, z: gz, w: 1.5, h: 0.1, d: 0.1, color: GOLD_D });
          ctx.box({ x: gx, y: 1.6, z: gz, w: 1.5, h: 0.08, d: 0.09, color: GOLD_D });
          col2(xa, s * (AISLE_OUT + 2.1), gz - 0.08, gz + 0.08);
        });
        if (s > 0) {   // 성체 경당: 제대 위 금동 원형 신전 감실 + 무릎 꿇은 천사 둘 + 영성체 난간 + 성체등
          sideAltar(xb, zc, nB, 2.6, 0x8a5a3a, { fh: 3.4, colc: BLUE });
          var t = onWall(xb, zc, nB, 0, 0.5);
          ctx.cyl({ x: t[0], y: 1.17, z: t[1], r: 0.34, h: 0.62, seg: 12, color: GOLD, flat: false });
          ctx.sphere({ x: t[0], y: 1.79, z: t[1], r: 0.34, color: GOLD_D, w: 10, h: 6 });
          ctx.box({ x: t[0], y: 2.12, z: t[1], w: 0.05, h: 0.32, d: 0.05, color: GOLD }); ctx.box({ x: t[0], y: 2.28, z: t[1], w: 0.05, h: 0.05, d: 0.2, color: GOLD });
          [-1, 1].forEach(function (k) { var q = onWall(xb, zc, nB, k * 2.25, 0.8); figure({ x: q[0], y: 0, z: q[1], h: 1.5, kind: 'angel', ry: Math.atan2(nB[0], nB[1]), robe: 0xc99a45, mantle: 0xb8892b }); });
          [[zA, zc - 0.85], [zc + 0.85, zB]].forEach(function (r) {
            var rx = s * 14.3, zm = (r[0] + r[1]) / 2, L = r[1] - r[0];
            ctx.box({ x: rx, y: 0, z: zm, w: 0.26, h: 0.2, d: L, color: WHITE, surf: 'marble_white' });
            ctx.box({ x: rx, y: 0.78, z: zm, w: 0.24, h: 0.1, d: L, color: GOLD_D });
            for (var b = 0; b < 5; b++) ctx.cyl({ x: rx, y: 0.2, z: r[0] + L * (b + 0.5) / 5, r: 0.06, rTop: 0.045, h: 0.58, seg: 6, color: WHITE });
            col2(rx - 0.15, rx + 0.15, r[0], r[1]);
          });
          ctx.cyl({ x: s * 15.6, y: 2.75, z: zc - 2.0, r: 0.012, h: 3.4, seg: 4, color: GOLD_D });
          glow.add(Geo.cyl(8, 1), new T.Color(0xff5a4a).multiplyScalar(2.2), { x: s * 15.6, y: 2.5, z: zc - 2.0, sx: 0.09, sy: 0.24, sz: 0.09, flat: true, vary: 0 });
          ctx.addGlow({ x: s * 15.6, y: 2.62, z: zc - 2.0, size: 0.9, color: 0xff4030, pulse: 0.15, kind: 'always' });
          panel(s * 12.9, zA, [0, 1], 0, 1.2, 1.8, 3.0, RED); panel(s * 12.9, zB, [0, -1], 0, 1.2, 1.8, 3.0, RED);
        } else {       // 성가대 경당: 제대(원죄 없으신 잉태 제단화) + 양옆 벽 목재 성가대석 2단
          sideAltar(xb, zc, nB, 2.4, 0x5b7fb5, { fh: 3.4, colc: GREEN });
          [[zA, 1], [zB, -1]].forEach(function (w) {
            var z0 = w[0], d = w[1], xc = s * 13.9, wd = 0x5a3a24;
            ctx.box({ x: xc, y: 0, z: z0 + d * 0.06, w: 3.7, h: 3.1, d: 0.12, color: ctx.shade(wd, 0.85), mat: 'wood' });
            ctx.box({ x: xc, y: 0, z: z0 + d * 0.4, w: 3.6, h: 1.35, d: 0.56, color: wd, mat: 'wood' });
            ctx.box({ x: xc, y: 0, z: z0 + d * 0.98, w: 3.6, h: 0.85, d: 0.6, color: ctx.shade(wd, 1.15), mat: 'wood' });
            ctx.box({ x: xc, y: 3.1, z: z0 + d * 0.25, w: 3.8, h: 0.14, d: 0.5, color: GOLD_D });
            col2(xc - 1.85, xc + 1.85, z0, z0 + d * 1.3);
          });
        }
      }

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
        sh.holes.push(archHolePath(ARCHZ[3], 0, 4.5, AMB_Y));   // 아치 4번 칸: 모서리 경당(그레고리오/클레멘스)으로 여는 큰 아치(I-5 ①-2)
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
        ctx.surfBatch('travertine').add(gi, 0xe0d6c0, { x: s * AISLE_OUT, y: 0, z: 0, flat: true });
        // 경당 내부(작은 방): 바닥·옆·뒤·천장
        [30.15, 21.5, 12.85].forEach(function (zc, ci) {
          if (ci === 2) { deepChapel(s, zc); return; }
          var pieta = ci === 0 && s > 0, bapt = ci === 0 && s < 0;   // 피에타는 오른쪽 첫 경당 한 곳, 왼쪽 첫 경당은 세례 경당(I-5 ③)
          var xa = s * AISLE_OUT, xb = s * (AISLE_OUT + 2.9), hz = 1.9, hh = 5.9, inC = [s * (AISLE_OUT + 1.5), 2.2, zc];
          solid.addQuad([xa, 0.01, zc - hz], [xb, 0.01, zc - hz], [xb, 0.01, zc + hz], [xa, 0.01, zc + hz], 0xd9cdb4, inC);
          solid.addQuad([xb, 0, zc - hz], [xb, hh, zc - hz], [xb, hh, zc + hz], [xb, 0, zc + hz], pieta ? 0x6a5a52 : 0xcfbf9f, inC);
          solid.addQuad([xa, 0, zc - hz], [xb, 0, zc - hz], [xb, hh, zc - hz], [xa, hh, zc - hz], CREAM_D, inC);
          solid.addQuad([xa, 0, zc + hz], [xb, 0, zc + hz], [xb, hh, zc + hz], [xa, hh, zc + hz], CREAM_D, inC);
          solid.addQuad([xa, hh, zc - hz], [xb, hh, zc - hz], [xb, hh, zc + hz], [xa, hh, zc + hz], 0xe9dfc9, inC);
          // 제대 + 조각
          if (bapt) {   // 세례 경당: 붉은 반암 수반 + 금동 덮개, 뒷벽에 '그리스도의 세례' 모자이크 색 면
            var fx = s * (AISLE_OUT + 1.65);
            ctx.cyl({ x: fx, y: 0, z: zc, r: 1.2, h: 0.16, seg: 14, color: 0xd8d0be });
            ctx.cyl({ x: fx, y: 0.16, z: zc, r: 0.5, rTop: 0.42, h: 0.5, seg: 10, color: 0x5a2422, mat: 'gloss' });
            ctx.cyl({ x: fx, y: 0.66, z: zc, r: 0.62, rTop: 0.98, h: 0.42, seg: 14, color: RED, mat: 'gloss' });
            ctx.cyl({ x: fx, y: 1.08, z: zc, r: 1.0, h: 0.07, seg: 14, color: GOLD_D });
            ctx.cone({ x: fx, y: 1.15, z: zc, r: 0.9, h: 0.75, seg: 12, color: GOLD });
            ctx.sphere({ x: fx, y: 2.02, z: zc, r: 0.14, color: GOLD, w: 8, h: 6 });
            [-1, 1].forEach(function (k) { wbox(xb, zc, [-s, 0], k * 0.95, 0.05, 1.5, 0.8, 3.6, 0.08, 0x5b7fb5); wbox(xb, zc, [-s, 0], k * 1.42, 0.06, 1.4, 0.14, 3.8, 0.1, GOLD_D); });
            wbox(xb, zc, [-s, 0], 0, 0.06, 5.1, 2.98, 0.14, 0.1, GOLD_D);
          } else {
          ctx.box({ x: s * (AISLE_OUT + 2.3), y: 0, z: zc, w: 0.9, h: 1.0, d: 2.2, color: WHITE });
          ctx.box({ x: s * (AISLE_OUT + 2.3), y: 1.0, z: zc, w: 1.0, h: 0.08, d: 2.3, color: GOLD_D });
          }
          if (bapt) { /* 세례반만 */ } else if (pieta) {
            // 피에타 경당(C-15): 미켈란젤로 〈피에타〉 사진 판(위키미디어 공용, 사진 Gary Todd, Public Domain Mark — art_stpeter.js, docs/church/licenses/stpeter.md)을
            // 제대 뒤 벽감에 세우고, 실제처럼 경당 어귀를 방탄유리(옅은 반사)로 막는다. 예전의 상자·원뿔·공으로 만든 조각군은 없앴다(REVERENCE.md).
            // (T-80) 사진 판 대신 실물 주형 3D 스캔(SMK KAS115 전체 해상도 1.5M, 퍼블릭 도메인 — scan3d_pieta.js, 100k/8k 삼각형, 무광 흰 대리석 + 경당 열쇠 빛)을
            // 제대 위 높은 받침에 세운다(실제처럼 제대 뒤에서 높이 올라앉은 군상, 높이 1.74m = 실물). 스캔을 못 세우면 예전 사진 판.
            var pw = 3.4, phh = pw * 883 / 1024, pyb = 1.26, pxx = AISLE_OUT + 2.86;   // 뒷벽(3.8m) 거의 전체 — 사진 가장자리는 어둡게 눌러 어두운 벽에 녹아든다
            var PX = AISLE_OUT + 2.42, PB = 1.5;                                                                                              // 군상 가운데(깊이 0.91 → 뒤 끝이 뒷벽 바로 앞) · 받침 윗면
            var pietaScan = ctx.scan({ key: 'pieta', x: PX, y: PB, z: zc, ry: -PI / 2, h: 1.74, mat: 'marbleLit', name: 'pieta_scan' }, pietaPhoto);
            if (!pietaScan) ctx.box({ x: AISLE_OUT + 2.72, y: 1.08, z: zc, w: 0.34, h: 0.18, d: 3.7, color: 0xe6e0d4, mat: 'gloss' });   // 받침(제대 뒤 단)
            else {
              ctx.box({ x: PX, y: 1.08, z: zc, w: 0.98, h: PB - 1.08 - 0.05, d: 1.95, color: 0xe6e0d4, mat: 'gloss' });                     // 높은 받침(제대 위)
              ctx.box({ x: PX, y: PB - 0.05, z: zc, w: 1.04, h: 0.05, d: 2.0, color: GOLD_D });                                               // 받침 윗판 금 테
            }
            function pietaPhoto() {
              var pietaMat = ctx.mats.lambert({ color: 0x2a2623 });
              ctx.plane({ x: pxx, y: pyb + phh / 2, z: zc, ry: -PI / 2, w: pw, h: phh, mat: pietaMat });
              artPhoto('pieta', function (tx) { pietaMat.map = tx; pietaMat.color.setHex(0xffffff); pietaMat.emissive = new T.Color(0xffffff); pietaMat.emissiveMap = tx; pietaMat.emissiveIntensity = 0.42; pietaMat.needsUpdate = true; });
            }
            // 방탄유리: 경당 어귀 벽 바로 안쪽(벽이 아치 밖을 가린다). 입체 군상 앞에서는 빼다 — 반사 막(환경 반사)이 군상 위에 회색 안개를 덮어
            // 대비를 17% 깎고(표준편차 77 → 64) 얼굴을 흐린다(T-80 2차). 난간이 들어갈 수 없음을 보인다. 사진 판(스캔 실패)일 때만 예전처럼.
            if (!pietaScan && ctx._.batches.glassRefl) {
              var gx = AISLE_OUT + 0.66, gz0 = zc - hz, gz1 = zc + hz;
              ctx._.batches.glassRefl.addTris([gx, 0, gz0, gx, 0, gz1, gx, hh, gz1, gx, 0, gz0, gx, hh, gz1, gx, hh, gz0], 0xffffff, [AISLE_OUT - 3, 2, zc], { vary: 0 });
            }
          } else figure({ x: s * (AISLE_OUT + 2.6), y: 1.1, z: zc, h: 2.2, kind: ci === 1 ? 'saint' : 'mary', ry: 0 });
          // 난간(걸을 수 없음을 보이는 낮은 대리석 난간)
          ctx.box({ x: s * (AISLE_OUT + 0.15), y: 0, z: zc, w: 0.25, h: 0.28, d: 3.3, color: WHITE });
          for (var bz = -1.5; bz <= 1.5; bz += 0.3) ctx.cyl({ x: s * (AISLE_OUT + 0.15), y: 0.28, z: zc + bz, r: 0.05, rTop: 0.04, h: 0.62, seg: 6, color: WHITE });
          ctx.box({ x: s * (AISLE_OUT + 0.15), y: 0.9, z: zc, w: 0.22, h: 0.1, d: 3.4, color: WHITE });
          ctx.addCollider({ x0: Math.min(s * AISLE_OUT, s * (AISLE_OUT + 3)), x1: Math.max(s * AISLE_OUT, s * (AISLE_OUT + 3)), z0: zc - 2.0, z1: zc + 2.0 });
          // 경당 벽 안 은은한 빛(창 대신)
          if (!pieta) glass.addQuad([xb - s * 0.02, 2.0, zc - 0.5], [xb - s * 0.02, 2.0, zc + 0.5], [xb - s * 0.02, 4.4, zc + 0.5], [xb - s * 0.02, 4.4, zc - 0.5], 0xffe8b0, inC);
        });
        // 측랑 외벽 하단 걸레받이 + 코니스
        ctx.cornice({ x0: s * AISLE_OUT, z0: ZE, x1: s * AISLE_OUT, z1: 6.45, y: 7.2, h: 0.4, depth: 0.3, facing: [-s, 0], color: CREAM_D });
        ctx.cornice({ x0: s * AISLE_OUT, z0: ZE, x1: s * AISLE_OUT, z1: 6.45, y: 0, h: 0.5, depth: 0.15, facing: [-s, 0], color: CREAM_D });
        // 4번 칸 큰 아치의 테(측랑 쪽·경당 쪽 모두 보인다)
        ctx.arch({ x: s * (AISLE_OUT + 0.3), z: ARCHZ[3], y: AMB_Y, span: 4.5, rise: 2.25, t: 0.26, depth: 0.72, axis: 'z', seg: 8, color: CREAM_D });
        // 측랑 끝 제대(돔 피어 동쪽 면, I-5 ②): 오른쪽 성 예로니모 제대(제대 아래 성 요한 23세 유리관), 왼쪽 거룩한 변모 제대
        sideAltar(s * 8.97, 1.95, [0, 1], 2.2, s > 0 ? 0x8a6a4a : 0x4f7fc0, { fh: 3.8, colc: s > 0 ? RED : GREEN, pic2: s > 0 ? 0xd9c7a8 : 0xf4efe0 });
        if (s > 0) { ctx.box({ x: s * 8.97, y: 0.26, z: 3.04, w: 1.7, h: 0.6, d: 0.06, color: 0x9db4c2, mat: 'gloss' }); ctx.box({ x: s * 8.97, y: 0.42, z: 3.08, w: 1.35, h: 0.2, d: 0.04, color: 0xf1ece2 }); }
        // 충돌: 외벽(4번 칸 아치 z 1.95…6.45 와 대경당 입구 z 11.25…14.45 는 열려 있다)
        col2(s * AISLE_OUT, s * (AISLE_OUT + 0.7), 6.45, 11.25); col2(s * AISLE_OUT, s * (AISLE_OUT + 0.7), 14.45, ZE + 0.7);
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
        figure({ x: p[0], y: y + 0.08, z: p[1], h: h * 0.76, kind: kind, ry: Math.atan2(n[0], n[1]), robe: 0xf1ece2, mantle: 0xe2dccf, halo: false });
      }

      VC('fonts');
      // ---------------------------------------------------------------- 교차부: 돔 피어 4개(모서리 깎음)
      function prism(poly, y0, y1, color) {
        var cx0 = 0, cz0 = 0, i, n = poly.length, PB = ctx.surfBatch('travertine');
        poly.forEach(function (p) { cx0 += p[0] / n; cz0 += p[1] / n; });
        for (i = 0; i < n; i++) {
          var a = poly[i], b = poly[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.sqrt(dx * dx + dz * dz) || 1;
          var nx = dz / l, nz = -dx / l, mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
          if (nx * (mx - cx0) + nz * (mz - cz0) < 0) { nx = -nx; nz = -nz; }
          PB.addQuad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], 0xe0d6c0, [mx + nx, (y0 + y1) / 2, mz + nz]);
        }
        var tr = [];
        for (i = 1; i < n - 1; i++) tr.push(poly[0][0], y1, poly[0][1], poly[i][0], y1, poly[i][1], poly[i + 1][0], y1, poly[i + 1][1]);
        PB.addTris(tr, 0xe0d6c0, [cx0, y1 + 3, cz0]);
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
        [4, 6, 12].forEach(function (kk) {
          var ac2 = (kk + 0.5) * 2 * PI / wc, p = Pp(R, ac2, 0);
          ctx.addWindowBeam({ x: p[0], y: (wy0 + wy1) / 2 - 0.2, z: p[2], face: [-Math.cos(ac2), -Math.sin(ac2)], w: 1.5, h: 3.4, colors: [0xfff1c0, 0xffe39a, 0xfff6dc], reach: 14, dome: true });
        });
      })();

      (function dome() {
        var R = RING_R, y0 = 27.0, rise = 11.0, rOc = 1.55, seg = 32, rings = 10, phiMax = Math.acos(rOc / R), i, s, mosaicB = ctx.surfBatch('mosaic_gold');
        var palette = [[0xd8b13f, 0x2f4c7a], [0x2f4c7a, 0xd8b13f], [0xd8b13f, 0x3a5f9a], [0x2f4c7a, 0xe0bd4c], [0xe3c256, 0x2f4c7a], [0x2f4c7a, 0xefd57a], [0xf2dc86, 0x2f4c7a], [0xd8b13f, 0x2f4c7a], [0xefd57a, 0xd8b13f], [0xf6e4a0, 0xf6e4a0]];
        function D(a, ph) { return [CX + R * Math.cos(ph) * Math.cos(a), y0 + rise * Math.sin(ph), CZ + R * Math.cos(ph) * Math.sin(a)]; }
        for (i = 0; i < rings; i++) {
          var ph0 = phiMax * i / rings, ph1 = phiMax * (i + 1) / rings;
          for (s = 0; s < seg; s++) {
            var a0 = s / seg * PI * 2, a1 = (s + 1) / seg * PI * 2;
            var col = palette[i][(s >> 1) & 1], isBlue = (col === 0x2f4c7a || col === 0x3a5f9a);
            (isBlue ? solid : mosaicB).addQuad(D(a0, ph0), D(a1, ph0), D(a1, ph1), D(a0, ph1), isBlue ? col : ctx.shade(0xffffff, 1.0), [CX, 18, CZ], { vary: 0.03 });
          }
        }
        // 16 늑골
        for (var k = 0; k < 16; k++) {
          var ak = k / 16 * PI * 2, pts = [];
          for (var m = 0; m <= 8; m++) pts.push(D(ak, phiMax * m / 8));
          for (m = 0; m < 8; m++) { var A = pts[m], B = pts[m + 1]; solid.addBeam([A[0] * 0.995 + CX * 0.005, A[1] - 0.05, A[2] * 0.995 + CZ * 0.005], [B[0] * 0.995 + CX * 0.005, B[1] - 0.05, B[2] * 0.995 + CZ * 0.005], 0.3, 0.42, 0xf0e6cc, { vary: 0.02 }); }
          // 모자이크 인물 메달(구획마다 4단)
          var am = (k + 0.5) / 16 * PI * 2;
          for (m = 0; m < 3; m++) {
            var pp = D(am, phiMax * (0.18 + m * 0.26)), nrm = new T.Vector3(CX - pp[0], 16 - pp[1] + 6, CZ - pp[2]).normalize();
            nrm = new T.Vector3(CX - pp[0], (y0 - 4) - pp[1], CZ - pp[2]).normalize();
            var q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), nrm);
            solid.add(Geo.cyl(10, 1), (m + k) % 2 ? 0xf4e4a8 : 0xe9d6a6, { x: pp[0] + nrm.x * 0.05, y: pp[1] + nrm.y * 0.05, z: pp[2] + nrm.z * 0.05, q: q, sx: 0.75 - m * 0.08, sy: 0.04, sz: 0.75 - m * 0.08, flat: true, vary: 0.04 });
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

      // 반원 후진/익랑 끝: 벽 + 격자 반돔(질감) + 충돌체. dirv = 열린 쪽에서 안쪽(끝) 방향
      function myApse(cx, cz, r, dirv, rise) {
        var base = Math.atan2(dirv[1], dirv[0]), n = 16, i, j;
        for (i = 0; i < n; i++) {
          var a0 = base - PI / 2 + PI * i / n, a1 = base - PI / 2 + PI * (i + 1) / n;
          solid.addQuad([cx + Math.cos(a0) * r, 0, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, 0, cz + Math.sin(a1) * r], [cx + Math.cos(a1) * r, YS, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, YS, cz + Math.sin(a0) * r], CREAM, [cx, YS / 2, cz]);
        }
        var M = 8, pos = [], nor = [], uv = [], idx = [];
        for (j = 0; j < M; j++) for (i = 0; i < n; i++) {
          var cs = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], base0 = pos.length / 3, vs = [];
          cs.forEach(function (c) {
            var a = base - PI / 2 + PI * c[0] / n, ph = PI / 2 * c[1] / M * 0.985, rr = r * Math.cos(ph), yy = YS + rise * Math.sin(ph);
            var p3 = [cx + Math.cos(a) * rr, yy, cz + Math.sin(a) * rr];
            vs.push(p3);
            var nx = -Math.cos(a) * Math.cos(ph) / r, ny = -Math.sin(ph) / rise, nz = -Math.sin(a) * Math.cos(ph) / r, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            // 타원체 안쪽 법선(근사)
            pos.push(p3[0], p3[1], p3[2]); nor.push(nx / l, ny / l, nz / l);
            uv.push(c[0] / n * 8.0, c[1] / M * 3.4);
          });
          var e1 = [vs[1][0] - vs[0][0], vs[1][1] - vs[0][1], vs[1][2] - vs[0][2]], e2 = [vs[3][0] - vs[0][0], vs[3][1] - vs[0][1], vs[3][2] - vs[0][2]];
          var gn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
          if (gn[0] * nor[base0 * 3] + gn[1] * nor[base0 * 3 + 1] + gn[2] * nor[base0 * 3 + 2] >= 0) idx.push(base0, base0 + 1, base0 + 2, base0, base0 + 2, base0 + 3);
          else idx.push(base0, base0 + 2, base0 + 1, base0, base0 + 3, base0 + 2);
        }
        var geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3));
        geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(nor), 3));
        geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(uv), 2));
        geo.setIndex(idx);
        ctx.mesh(geo, ctx.mats.standard({ map: texCoffer, color: 0xffffff, side: T.DoubleSide, metalness: 0.5, roughness: 0.5 }));
        // 반돔 늑골
        for (i = 0; i <= 6; i++) {
          var ar = base - PI / 2 + PI * i / 6, prev = null;
          for (j = 0; j <= 8; j++) {
            var ph2 = PI / 2 * j / 8 * 0.97, rr2 = r * Math.cos(ph2) * 0.995, cur = [cx + Math.cos(ar) * rr2, YS + rise * Math.sin(ph2) - 0.05, cz + Math.sin(ar) * rr2];
            if (prev) solid.addBeam(prev, cur, 0.22, 0.3, CREAM, { vary: 0.02 });
            prev = cur;
          }
        }
        var cn = Math.max(6, Math.round(PI * r / 1.0)), cr = 0.8;
        for (var k = 0; k <= cn; k++) { var ak = base - PI / 2 + PI * k / cn; ctx.addCollider({ x: cx + Math.cos(ak) * (r + cr - 0.05), z: cz + Math.sin(ak) * (r + cr - 0.05), r: cr }); }
      }

      // ---------------------------------------------------------------- 익랑 · 후진 벽, 끝 반원
      [-1, 1].forEach(function (s) {
        // 익랑 벽(안쪽면 z=-4.75 / -13.25)
        // (I-5 ①-3) 돔 피어 옆 x 10.95…16.7 구간은 회랑 통로로 여는 아치(폭 4.8), 그 바깥 16.7…21.25 만 통벽
        ctx.box({ x: s * (R_OUT + 21.25) / 2, y: 0, z: -4.45, w: 21.25 - R_OUT, h: YS, d: 0.6, color: 0xe0d6c0, surf: 'travertine' });
        ctx.box({ x: s * (R_OUT + 21.25) / 2, y: 0, z: -13.55, w: 21.25 - R_OUT, h: YS, d: 0.6, color: 0xe0d6c0, surf: 'travertine' });
        archWallX(s * AISLE_OUT, s * R_OUT, -4.75, 0.6, YS, s * 13.825, 4.8, AMB_Y);
        archWallX(s * AISLE_OUT, s * R_OUT, -13.85, 0.6, YS, s * 13.825, 4.8, AMB_Y);
        [-4.45, -13.55].forEach(function (z) {
          ctx.arch({ x: s * 13.825, z: z, y: AMB_Y, span: 4.8, rise: 2.4, t: 0.28, depth: 0.74, axis: 'x', seg: 10, color: CREAM_D });
          ctx.box({ x: s * 13.825, y: AMB_Y + 2.3, z: z + (z > -9 ? -0.36 : 0.36), w: 0.5, h: 0.55, d: 0.16, color: GOLD_D });
        });
        col2(s * 16.225, s * 21.25, -4.75, -4.1); col2(s * AISLE_OUT, s * 11.425, -4.75, -4.1);
        col2(s * 16.225, s * 21.25, -13.9, -13.25); col2(s * AISLE_OUT, s * 11.425, -13.9, -13.25);
        entablature(s * 10.95, -4.75, s * 21.25, -4.75, [0, -1], texBand);
        entablature(s * 10.95, -13.25, s * 21.25, -13.25, [0, 1], texBand);
        [17.35, 20.55].forEach(function (x) { pilaster(s * x, -4.75, [0, -1], 0, 10.4); pilaster(s * x, -13.25, [0, 1], 0, 10.4); });
        [18.95].forEach(function (x) {
          niche(s * x, -4.75, [0, -1], 0, 1.3, 1.3, 3.4, 'saint'); niche(s * x, -13.25, [0, 1], 0, 1.3, 1.3, 3.4, 'saint');
          // 기념비(어두운 대리석 + 흰 상)
          wbox(s * x, -4.75, [0, -1], 0, 0.16, 6.3, 1.7, 2.4, 0.3, 0x3a3532); wbox(s * x, -13.25, [0, 1], 0, 0.16, 6.3, 1.7, 2.4, 0.3, 0x3a3532);
        });
        // 끝 반원 + 반돔
        myApse(s * 21.25, -9, 4.25, [s, 0], RISE);
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
          wbox(wp[0], wp[1], nrm, 0, 0.1, 1.7, 1.6, 4.2, 0.06, [0x5b7fb5, 0xb5524a, 0x5b7fb5][ai]);
          wbox(wp[0], wp[1], nrm, 0, 0.12, 4.0, 1.0, 1.4, 0.05, 0xd8b13f);
        });
      });

      // 후진 팔 벽
      [-1, 1].forEach(function (s) {
        // (I-5 ①-4) 첫 칸(z −25.75…−19.95)은 서쪽 모서리 경당으로 여는 아치(폭 4.5), 그 뒤(−30.25…−25.75)는 통벽
        ctx.box({ x: s * 4.55, y: 0, z: -28.0, w: 0.6, h: YS, d: 4.5, color: 0xe0d6c0, surf: 'travertine' });
        archWallZ(-25.75, -19.95, s > 0 ? 4.25 : -4.85, 0.6, YS, -22.85, 4.5, AMB_Y);
        ctx.arch({ x: s * 4.55, z: -22.85, y: AMB_Y, span: 4.5, rise: 2.25, t: 0.28, depth: 0.74, axis: 'z', seg: 10, color: CREAM_D });
        ctx.box({ x: s * 4.19, y: AMB_Y + 2.15, z: -22.85, w: 0.16, h: 0.55, d: 0.5, color: GOLD_D });
        col2(s * 4.25, s * 4.85, -30.25, -25.1); col2(s * 4.25, s * 4.85, -20.6, -19.95);
        entablature(s * 4.25, -15.5, s * 4.25, -30.25, [-s, 0], texBand);
        [-17.7, -26.45, -29.55].forEach(function (z) { pilaster(s * 4.25, z, [-s, 0], 0, 10.4); });
        // 바오로 3세(좌)/우르바노 8세(우) 기념비 감실
        niche(s * 4.25, -28.0, [-s, 0], 0, 1.2, 1.3, 3.2, 'saint');
        wbox(s * 4.25, -28.0, [-s, 0], 0, 0.16, 6.2, 1.7, 2.6, 0.3, 0x3a3532);
      });
      myApse(0, -30.25, 4.25, [0, -1], RISE);
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
      // ---------------------------------------------------------------- 돔 피어 둘레 회랑 + 모서리 경당 4곳 (I-5, STRUCTURE_AUDIT_ROME §1.4 ①)
      // 측랑 4번 칸 → 동쪽 모서리 경당(+x 그레고리오 / −x 클레멘스) → 동쪽 통로 → 익랑 → 서쪽 통로 → 서쪽 모서리 경당(+x 성 미카엘·페트로닐라 / −x 기둥의 성모)
      // → 안칸 → 후진 팔. 통로·안칸의 격자 원통 궁륭은 익랑 궁륭 메시에 들어 있다(barrel also). 벽·기둥·돔은 모두 기존 배치에 합쳐진다.
      [-1, 1].forEach(function (s) {
        var nIn = [-s, 0], nPier = [s, 0], xo = s * R_OUT, xp = s * AISLE_OUT, xm = s * 13.825;
        // 바깥벽·끝벽(안쪽 면만: 카메라가 벽 밖으로 나가도 안이 보인다)
        wq(xo, 7.75, xo, -4.15, 0, AMB_TOP, xm, 2); wq(xo, -13.85, xo, -25.75, 0, AMB_TOP, xm, -20);
        wq(s * 11.55, 7.75, xo, 7.75, 0, AMB_TOP, xm, 4); wq(s * 4.85, -25.75, xo, -25.75, 0, AMB_TOP, xm, -22);
        col2(xo, s * 17.3, -4.75, 7.75); col2(xo, s * 17.3, -25.75, -13.25);
        col2(s * 11.55, s * 17.35, 7.75, 9.1); col2(s * 4.25, s * 17.3, -26.35, -25.75);
        // 칸 사이 아치 벽(경당 ↔ 통로, 서쪽 경당 ↔ 안칸) + 아치 테
        archWallX(xp, xo, 1.45, 0.5, AMB_TOP, s * 13.95, 4.7, AMB_Y);
        archWallX(xp, xo, -19.95, 0.5, AMB_TOP, xm, 4.8, AMB_Y);
        archWallZ(-25.75, -19.95, s > 0 ? 10.45 : -10.95, 0.5, AMB_TOP, -22.85, 4.5, AMB_Y);
        ctx.arch({ x: s * 13.95, z: 1.7, y: AMB_Y, span: 4.7, rise: 2.35, t: 0.24, depth: 0.62, axis: 'x', seg: 8, color: CREAM_D });
        ctx.arch({ x: xm, z: -19.7, y: AMB_Y, span: 4.8, rise: 2.4, t: 0.24, depth: 0.62, axis: 'x', seg: 8, color: CREAM_D });
        ctx.arch({ x: s * 10.7, z: -22.85, y: AMB_Y, span: 4.5, rise: 2.25, t: 0.24, depth: 0.62, axis: 'z', seg: 8, color: CREAM_D });
        col2(xp, s * 11.6, 1.45, 1.95); col2(s * 16.3, xo, 1.45, 1.95);
        col2(xp, s * 11.425, -19.95, -19.45); col2(s * 16.225, xo, -19.95, -19.45);
        col2(s * 10.45, xp, -25.75, -25.1); col2(s * 10.45, xp, -20.6, -19.95);
        // 모서리 경당의 작은 돔(펜던티브 + 금 모자이크)
        cornerDome(s * 14.125, 4.85, 2.575, 2.9, AMB_Y, 9.0, 2.42, 2.2);
        cornerDome(xm, -22.85, 2.875, 2.9, AMB_Y, 9.0, 2.7, 2.3);
        // 임포스트 엔타블러처(아치 시작선 높이) + 작은 오더 벽기둥
        ent2(xo, 7.75, xo, 1.95, nIn); ent2(s * 11.55, 7.75, xo, 7.75, [0, -1]);
        ent2(xo, 1.45, xo, -4.15, nIn); ent2(xp, 1.45, xp, -4.15, nPier);
        ent2(xo, -13.85, xo, -19.45, nIn); ent2(xp, -13.85, xp, -19.45, nPier);
        ent2(xo, -19.95, xo, -25.75, nIn); ent2(xp, -25.75, xo, -25.75, [0, 1]);
        ent2(s * 4.85, -25.75, s * 10.45, -25.75, [0, 1]); ent2(s * 4.85, -19.95, s * 10.45, -19.95, [0, -1]);
        [7.2, 2.5, 0.9, -3.6, -14.4, -18.9, -20.5, -25.2].forEach(function (z) { lpil(xo, z, nIn, 0); });
        [0.9, -3.6, -14.4, -18.9].forEach(function (z) { lpil(xp, z, nPier, 0); });
        [5.4, 9.9].forEach(function (x) { lpil(s * x, -25.75, [0, 1], 0); });
        // 색 대리석 상감 판 + 피어 바깥 면 기념비
        panel(s * 14.125, 7.75, [0, -1], 0, 1.2, 2.0, 3.0, GREEN);
        panel(xo, -1.35, nIn, 0, 1.2, 2.0, 3.0, RED); panel(xo, -16.65, nIn, 0, 1.2, 2.0, 3.0, GREEN);
        panel(s * 7.65, -25.75, [0, 1], 0, 1.2, 2.2, 3.0, GREEN); panel(s * 7.65, -19.95, [0, -1], 0, 1.2, 2.4, 3.0, RED);
        monument(xp, -1.35, nPier, YEL); monument(xp, -16.65, nPier, GREEN);
        // 제대: 동쪽 모서리 경당은 바깥벽 가운데, 서쪽 모서리 경당은 서쪽 끝벽 가운데
        sideAltar(xo, 4.85, nIn, 2.2, s > 0 ? 0x5b7fb5 : 0xb5524a, { colc: s > 0 ? GREEN : RED });       // 구원의 성모 제대 / 성 대 그레고리오 제대
        sideAltar(xm, -25.75, [0, 1], 2.2, s > 0 ? 0x7a6a9a : 0x5b7fb5, { colc: s > 0 ? RED : YEL, noFigure: s < 0 });    // 성 미카엘 제대 / 기둥의 성모 제대
      });
      VC('ambulatory');
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
          ctx.metalB.addTris([p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], tip[0], tip[1], tip[2]], long ? 0xf0c850 : 0xd9a93a, [0, gy, -20], { vary: 0.03 });
          // 광선 가운데 곡선 쪽 두께감: 얇은 상자 (끝 장식)
          if (long) ctx.sphere({ x: tip[0], y: tip[1], z: tip[2] + 0.02, r: 0.1, color: 0xf6d35e, w: 6, h: 4 });
        }
        // 타원 창(호박색 유리) + 금 테두리
        // G-29: 진본 사진 창(비둘기 창)을 걸면 타원을 사진 비율(가로/세로 0.69)에 맞추고 유리를 평면으로 짓는다.
        // 사진에 비둘기가 있으므로 절차적 비둘기·빛 원반은 따로 떼어 둔다(사진이 덮이면 숨김, 못 읽으면 그대로 = 폴백).
        var ph = ctx.glassPhoto('gloria');
        var ow = 0.95, oh = 1.25, seg = 20;
        if (ph) ow = oh * ph.aspect;
        var GZ = function (x) { return (ph ? WZ(ow) : WZ(x)) + 0.16; };
        for (i = 0; i < seg; i++) {
          var a0 = i / seg * PI * 2, a1 = (i + 1) / seg * PI * 2;
          var x0 = Math.cos(a0) * ow, y0 = gy + Math.sin(a0) * oh, x1 = Math.cos(a1) * ow, y1 = gy + Math.sin(a1) * oh;
          glass.addTris([0, gy, GZ(0), x0, y0, GZ(x0), x1, y1, GZ(x1)], i % 2 ? 0xffc948 : 0xffdf80, [0, gy, -20], { vary: 0.04 });
          var f0 = Math.cos(a0) * (ow + 0.13), g0 = gy + Math.sin(a0) * (oh + 0.13), f1 = Math.cos(a1) * (ow + 0.13), g1 = gy + Math.sin(a1) * (oh + 0.13);
          solid.addQuad([x0, y0, GZ(x0) - 0.01], [x1, y1, GZ(x1) - 0.01], [f1, g1, WZ(f1) + 0.15], [f0, g0, WZ(f0) + 0.15], GOLD, [0, gy, -20], { vary: 0 });
        }
        // 비둘기(성령): 흰 몸 + 날개
        if (!ph) {
          ctx.sphere({ x: 0, y: gy + 0.05, z: WZ(0) + 0.24, r: 0.2, sx: 0.28, sy: 0.18, sz: 0.1, color: 0xffffff, w: 8, h: 6 });
          ctx.box({ x: -0.34, y: gy + 0.1, z: WZ(0) + 0.24, w: 0.45, h: 0.05, d: 0.04, color: 0xffffff, rz: 0.4 });
          ctx.box({ x: 0.34, y: gy + 0.1, z: WZ(0) + 0.24, w: 0.45, h: 0.05, d: 0.04, color: 0xffffff, rz: -0.4 });
          glow.add(Geo.cyl(16, 1), 0xfff4c0, { x: 0, y: gy, z: WZ(0) + 0.19, sx: 0.4, sy: 0.02, sz: 0.55, rx: PI / 2, flat: true, vary: 0 });
          ctx.addGlow({ x: 0, y: gy, z: WZ(0) + 1.0, size: 9, color: 0xffc860, kind: 'always' });
        } else {
          var fb = [], zf = GZ(0), white = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
          var body = new T.Mesh(new T.SphereGeometry(1, 8, 6), white); body.scale.set(0.28, 0.18, 0.1); body.position.set(0, gy + 0.05, zf + 0.08); fb.push(body);
          [-1, 1].forEach(function (sg) { var wg = new T.Mesh(new T.BoxGeometry(0.45, 0.05, 0.04), white); wg.position.set(sg * 0.34, gy + 0.125, zf + 0.08); wg.rotation.z = -sg * 0.4; fb.push(wg); });
          var disc = new T.Mesh(new T.CircleGeometry(1, 16), new T.MeshBasicMaterial({ color: 0xfff4c0 })); disc.scale.set(0.4, 0.55, 1); disc.position.set(0, gy, zf + 0.03); fb.push(disc);
          fb.forEach(function (m) { ctx.add(m); ctx.stats.meshes++; });
          ctx.addGlow({ x: 0, y: gy, z: WZ(0) + 1.0, size: 9, color: 0xffc860, kind: 'always' });
          var ge = ctx._.glows[ctx._.glows.length - 1];
          ctx.glassSlot({ photo: ph, x: 0, y: gy, z: zf + 0.012, face: [0, 1], w: 2 * ow, h: 2 * oh, fallback: fb, glows: [ge] });
        }
        // 구름·아기천사
        for (i = 0; i < 16; i++) {
          var ca = -PI * 0.1 + (i / 15) * PI * 1.2, cr = 1.9 + (i % 3) * 0.5, cxp = Math.cos(ca + PI) * cr * 1.15, cyp = gy - 0.4 + Math.sin(ca + PI) * cr * 0.9;
          if (Math.abs(cxp) > 3.4) continue;
          ctx.ico({ x: cxp, y: cyp, z: WZ(cxp) + 0.3, sx: 0.55, sy: 0.36, sz: 0.3, color: i % 3 ? 0xf5ecd8 : 0xe6c970, detail: 0 });
        }
        for (i = 0; i < 6; i++) { var ax = -2.4 + i * 0.96; figure({ x: ax, y: gy - 2.3 + (i % 2) * 0.4, z: WZ(ax) + 0.55, h: 0.8, kind: 'angel', robe: 0xf1e3b8, mantle: 0xe6c970, halo: false }); }
        // 의자 받침 대좌 + 교부 4인 + 의자
        ctx.box({ x: 0, y: 0, z: -33.55, w: 4.6, h: 0.9, d: 1.6, color: 0xdad2c0 });
        ctx.box({ x: 0, y: 0.9, z: -33.55, w: 4.7, h: 0.12, d: 1.7, color: GOLD_D });
        [-1.65, -0.6, 0.6, 1.65].forEach(function (x, ai) { figure({ x: x, y: 1.0, z: -33.35, h: 2.7, kind: 'saint', robe: ai % 2 ? 0x4a3524 : 0x5a4028, mantle: 0xb8892b, halo: false }); });
        ctx.box({ x: 0, y: 3.1, z: -33.95, w: 1.7, h: 0.5, d: 1.05, color: 0x4a3524, mat: 'metal' });
        ctx.box({ x: 0, y: 3.6, z: -34.2, w: 1.5, h: 2.5, d: 0.35, color: 0x3e2f1f, mat: 'metal' });
        ctx.box({ x: 0, y: 3.6, z: -34.0, w: 1.15, h: 2.15, d: 0.08, color: 0xc99a45 });
        ctx.cone({ x: 0, y: 6.1, z: -34.2, r: 0.9, h: 0.55, seg: 4, color: GOLD });
        ctx.box({ x: -0.8, y: 3.7, z: -33.95, w: 0.18, h: 1.1, d: 0.9, color: 0x4a3524, mat: 'metal' }); ctx.box({ x: 0.8, y: 3.7, z: -33.95, w: 0.18, h: 1.1, d: 0.9, color: 0x4a3524, mat: 'metal' });
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
        ctx.aoDecal({ x0: -2.8, x1: 2.8, z0: -11.45, z1: -6.55, y: 0, pad: 0.35 });
        ctx.box({ x: 0, y: 0, z: -9, w: 5.6, h: 0.18, d: 4.9, color: 0xe2dac8, surf: 'marble_white' });
        ctx.box({ x: 0, y: 0.18, z: -9, w: 5.0, h: 0.16, d: 4.5, color: 0xe8e0cf, surf: 'marble_white' });
        ctx.box({ x: 0, y: 0.34, z: -9, w: 4.8, h: 0.16, d: 4.3, color: 0xeee7d6, surf: 'marble_white' });
        // 앞 계단
        ctx.box({ x: 0, y: 0, z: -6.5, w: 4.2, h: 0.17, d: 0.9, color: 0xe0d8c5 });
        ctx.box({ x: 0, y: 0, z: -6.15, w: 3.6, h: 0.1, d: 0.5, color: 0xdad1be });
        // 제대 (흰 대리석)
        ctx.altar({ x: 0, z: -9.15, y: PY, w: 3.0, d: 1.3, h: 1.05, style: 'block', color: WHITE, candles: 4, flowers: false, collide: false });
        // 받침(마름모 대리석)
        [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].forEach(function (c) {
          var x = bx + c[0], z = bz + c[1];
          ctx.aoDecal({ x0: x - 0.62, x1: x + 0.62, z0: z - 0.62, z1: z + 0.62, y: PY, pad: 0.25 });
          ctx.box({ x: x, y: PY, z: z, w: 1.25, h: 0.22, d: 1.25, color: 0xdcd5c4, surf: 'marble_white' });
          ctx.box({ x: x, y: PY + 0.22, z: z, w: 1.05, h: 1.1, d: 1.05, color: 0xf0eadc, surf: 'marble_white' });
          ctx.box({ x: x, y: PY + 1.32, z: z, w: 1.18, h: 0.16, d: 1.18, color: GOLD_D });
          ctx.box({ x: x, y: PY + 0.3, z: z, w: 0.7, h: 0.6, d: 1.07, color: 0x8a3a38, surf: 'marble_rose' });
          // 꼬인 청동 기둥
          var cy0 = PY + 1.48, ch = 4.5, r = 0.36;
          twistCol(x, z, cy0, ch, r * 0.92, 0x4e3a24);
          [0.0, 0.5, 1.0].forEach(function (t) { ctx.cyl({ x: x, y: cy0 + (ch - 0.16) * t, z: z, r: r * 1.22, h: 0.16, seg: 10, color: GOLD }); });
          ctx.cyl({ x: x, y: cy0 + ch, z: z, r: r * 1.1, rTop: r * 1.7, h: 0.55, seg: 10, color: GOLD });
          ctx.box({ x: x, y: cy0 + ch + 0.55, z: z, w: 1.15, h: 0.2, d: 1.15, color: GOLD_D });
        });
        // 덮개: 건축보 + 코니스
        var ty = PY + 1.48 + 4.5 + 0.75;
        ctx.box({ x: 0, y: ty, z: bz, w: 4.9, h: 0.5, d: 4.9, color: 0x5c4128, mat: 'metal' });
        ctx.box({ x: 0, y: ty + 0.5, z: bz, w: 5.2, h: 0.18, d: 5.2, color: GOLD });
        ctx.box({ x: 0, y: ty + 0.68, z: bz, w: 4.8, h: 0.5, d: 4.8, color: 0x6a4a2c, mat: 'metal' });
        ctx.box({ x: 0, y: ty + 1.18, z: bz, w: 5.0, h: 0.14, d: 5.0, color: GOLD_D });
        ctx.box({ x: 0, y: ty + 0.82, z: bz + 2.42, w: 4.2, h: 0.22, d: 0.06, color: GOLD }); ctx.box({ x: 0, y: ty + 0.82, z: bz - 2.42, w: 4.2, h: 0.22, d: 0.06, color: GOLD });
        ctx.box({ x: 2.42, y: ty + 0.82, z: bz, w: 0.06, h: 0.22, d: 4.2, color: GOLD }); ctx.box({ x: -2.42, y: ty + 0.82, z: bz, w: 0.06, h: 0.22, d: 4.2, color: GOLD });
        ctx.cyl({ x: 0, y: ty - 0.03, z: bz, r: 1.2, h: 0.03, seg: 18, color: GOLD });
        ctx.cyl({ x: 0, y: ty - 0.05, z: bz, r: 0.5, h: 0.03, seg: 12, color: 0xfff6dc, mat: 'gloss' });
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
            ctx.metalB.addBeam(prev, p, 0.2, 0.36, u > 0.5 ? GOLD : 0x4a3524, { vary: 0.03 });
            prev = p;
          }
          figure({ x: c[0] * 2.4, y: topY + 0.05, z: bz + c[1] * 2.4, h: 1.2, kind: 'angel', robe: 0xc99a45, mantle: 0xb8892b, halo: false });
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
        // (C-15) 실제 자리: 신랑 오른쪽 마지막 피어(성 론지노 피어) 앞, 줄무늬 설화석고 받침 위 대리석 의자에 앉은 청동 좌상 — 뒤는 붉은 금란 무늬 모자이크 벽.
        // 그 정면 사진 판(위키미디어 공용, 사진 Gary Todd, Public Domain Mark — art_stpeter.js)을 피어 면에 세운다. 예전의 상자·공으로 만든 인물은 없앴다.
        var bw = 1.7, bh = bw * 1043 / 704, by = 1.4, bxx = 3.88;   // 판은 피어 벽기둥(돌출 0.3)과 붉은 띠 앞에 선다 — 실제로도 벽기둥 앞에 금란 무늬 벽판을 세워 두었다
        ctx.box({ x: 3.4, y: 0, z: z, w: 1.1, h: 0.5, d: 2.0, color: 0xd8d0be, mat: 'gloss' });
        ctx.box({ x: 3.45, y: 0.5, z: z, w: 0.9, h: 0.9, d: 1.82, color: 0xe9dfc6, mat: 'gloss' });                                            // 설화석고 받침(사진 아래 끝의 받침 윗면과 이어진다)
        ctx.box({ x: 4.07, y: by, z: z, w: 0.36, h: bh, d: bw + 0.04, color: 0x7a2a2a });                                                     // 벽판 몸(옆에서 보이는 두께)
        ctx.box({ x: 4.05, y: by + bh, z: z, w: 0.44, h: 0.14, d: bw + 0.3, color: GOLD_D });                                                 // 금 테
        [-1, 1].forEach(function (k) { ctx.box({ x: 4.05, y: by, z: z + k * (bw / 2 + 0.08), w: 0.44, h: bh, d: 0.12, color: GOLD_D }); });
        var peterMat = ctx.mats.lambert({ color: 0x5a2424 });
        ctx.plane({ x: bxx, y: by + bh / 2, z: z, ry: -PI / 2, w: bw, h: bh, mat: peterMat });
        artPhoto('peter', function (tx) { peterMat.map = tx; peterMat.color.setHex(0xffffff); peterMat.emissive = new T.Color(0xffffff); peterMat.emissiveMap = tx; peterMat.emissiveIntensity = 0.22; peterMat.needsUpdate = true; });
        ctx.addCollider({ x0: 2.75, x1: 4.3, z0: z - 1.05, z1: z + 1.05 });
      })();

      VC('peter');
      // ---------------------------------------------------------------- 좌석(의자) + 촛불대
      ctx.renderSeats(layout, 'chair', { wood: 0xa06a40, seat: 0xc0443f, back: 0xb07a4c });
      ctx.candleStand(0, {}); ctx.candleStand(1, {});

      VC('seats+candles');
      // ---------------------------------------------------------------- 마무리
      ctx.setSky({ outside: false });
      ctx.setCameraBounds({ x0: -25.2, x1: 25.2, z0: -34.2, z1: 34.2, yMax: 28 });
    }
  };
})();
