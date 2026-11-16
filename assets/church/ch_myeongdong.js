/* ch_myeongdong.js — 명동대성당(서울, 1898). 고딕 리바이벌 라틴 십자형 삼랑식, 신랑 6칸.
   치수는 docs/church/interiors/myeongdong.md §2.3/§6/§11 의 추정값(scalePercent 100). 모든 벽은 창·아치 자리가 진짜로 뚫린 두께 있는 벽(slab)으로 만든다.
   실내 마감(STRUCTURE_AUDIT_OTHERS.md §2, 사진 대조): 벽면·궁륭 면 = 흰~연회색 회반죽, 기둥·아치·리브·창틀·띠 = 회색 벽돌. 붉은 벽돌은 외벽에만 있다.
   창: 측랑 = 2연 첨두 + 원창, 고측창 = 좁은 단일 첨두, 정면 = 종탑 2층의 2연 첨두 큰 창(장미창 없음), 후진 5창, 측랑 끝 작은 장미창 2, 가운데 문 위 반월창. */
(function () {
  'use strict';

  // (A) 레이아웃 — 순수 데이터(THREE 사용 금지)
  var layout = {
    id: 'myeongdong', scalePercent: 100,
    bounds: { x0: -13.5, x1: 13.5, z0: -25, z1: 31.5 },
    spawn: { x: 0, z: 27.5, r: 0 },
    seatGroups: [
      // 신랑: 중앙 통로 양쪽 12줄 x 4석 (줄 간격 1.9 m = 줄 사이 통로 1.4 m)
      { g: 'L', rows: 12, perRow: 4, origin: { x: -1.4, z: -4.5 }, dx: -0.72, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.25, 0.2] },
      { g: 'R', rows: 12, perRow: 4, origin: { x: 1.4, z: -4.5 }, dx: 0.72, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.25, 0.2] },
      // 측랑: 좌우 9줄 x 2석
      { g: 'AL', rows: 9, perRow: 2, origin: { x: -6.45, z: -2.5 }, dx: -0.75, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.25, 0.2] },
      { g: 'AR', rows: 9, perRow: 2, origin: { x: 6.45, z: -2.5 }, dx: 0.75, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.25, 0.2] }
    ],
    candles: {
      stands: [
        { x: 6.7, z: -17.6, slots: 48, reach: 1.8, cols: 8, face: [-1, 0], pitch: 0.5, step: 0.22, ystep: 0.3, y0: 0.8 },
        { x: -6.7, z: -17.6, slots: 48, reach: 1.8, cols: 8, face: [1, 0], pitch: 0.5, step: 0.22, ystep: 0.3, y0: 0.8 }
      ]
    },
    // 십자가의 길 14처(SPEC §30): 측랑 벽의 칸마다 하나씩, 창(창턱 3.0) 바로 아래 가운데에 건다. 판 = 벽 면(x ±9.0)에서 7.4cm.
    // 서는 자리는 신자석 끝(x ±7.4)과 벽 사이 통로(아바타 반경 0.3 → x ±7.71, 판에서 1.22m). 1처 = 제대를 볼 때 오른쪽 벽의 제대 쪽 → 입구 쪽, 8처 = 왼쪽 벽 입구 쪽 → 제대 쪽.
    crossWay: { plaques: (function () {
      var zs = [-3.5, 1.5, 6.5, 11.5, 16.5, 21.5, 27.75], out = [], i;
      for (i = 0; i < 7; i++) out.push({ x: 8.926, z: zs[i], face: [-1, 0], side: 'R', stand: { x: 7.71, z: zs[i] } });
      for (i = 6; i >= 0; i--) out.push({ x: -8.926, z: zs[i], face: [1, 0], side: 'L', stand: { x: -7.71, z: zs[i] } });
      return out;
    })() },
    info: { name: '명동대성당', place: '서울 중구 명동', builtYear: 1898 }
  };
  ChurchLayouts.register(layout);

  // (B) 빌더
  ChurchBuilders['myeongdong'] = {
    layout: layout,
    thumb: { x: 0, z: 23.5, yaw: 0, pitch: 11, zoom: 0.95, hour: 11 },
    build: function (ctx) {
      var T = ctx.THREE, PI = Math.PI, KIT = ChurchKit, G = ChurchGeo, solid = ctx.solid, glass = ctx.glass, glow = ctx.glow;
      var abs = Math.abs, sqrt = Math.sqrt, min = Math.min, max = Math.max, cos = Math.cos, sin = Math.sin;

      // ---------- 팔레트 ----------
      var C = {
        plaster: 0xcdcac3, vault: 0xd7d4cd, rib: 0x7c786e, boss: 0xe6d6a2,
        wood: 0x5d3820, woodMid: 0x7a5232, woodLight: 0x94683f, woodRed: 0x6d3f2b,
        gold: 0xd9b45a, white: 0xf7f2e8, cream: 0xf0e8d8, slate: 0x7b8591, glassLead: 0x2a2320,
        iron: 0x2f2b28, stone: 0xa5a29a, tracery: 0x8c8982, copper: 0xb97a45, red: 0xb52a30, blue: 0x24489f
      };
      var pfCache = {};
      function pf(a, r) { var k = a.toFixed(3) + '_' + r.toFixed(3); return pfCache[k] || (pfCache[k] = KIT.profileFn('pointed', a, r)); }
      var E = 1e-5;

      // ---------- 표면(kit 의 사진 질감 + PBR 표면 배치) ----------
      // 실내에는 붉은 벽돌이 없다(외벽에만 있다): 회반죽 면 + 회색 벽돌 구조재 두 가지뿐이다.
      var mGrey = { s: 'brick_grey' }, mPl = { c: C.plaster };
      var mOut = { c: 0xb9ac96 }, mWainscot = { c: 0x6a4630, wood: true };

      // 면 하나 출력. mat: {s: 표면 이름} 또는 {c: 색}. (r* 는 호환용 인자 — UV 는 batch 가 월드 좌표로 투영한다)
      function Q(mat, a, b, c, d, ra, rb, rc, rd, hint) {
        var col = mat.c !== undefined ? mat.c : (mat.col === undefined ? 0xffffff : mat.col);
        var bt = mat.s ? ctx.surfBatch(mat.s) : (mat.wood ? ctx.woodB : solid);
        if (d) bt.addQuad(a, b, c, d, col, hint, { vary: mat.s ? 0.025 : 0 });
        else bt.addTris([a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]], col, hint, { vary: mat.s ? 0.025 : 0 });
      }

      // UV 상자(회색 벽돌 띠·벽기둥 등)
      function uvBox(mat, x0, x1, y0, y1, z0, z1) {
        var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
        Q(mat, [x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [z0, y0], [z1, y0], [z1, y1], [z0, y1], [x1 + 9, cy, cz]);
        Q(mat, [x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [z1, y0], [z0, y0], [z0, y1], [z1, y1], [x0 - 9, cy, cz]);
        Q(mat, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0], [x1, y0], [x1, y1], [x0, y1], [cx, cy, z1 + 9]);
        Q(mat, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0], [x0, y0], [x0, y1], [x1, y1], [cx, cy, z0 - 9]);
        Q(mat, [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [x0, z0], [x1, z0], [x1, z1], [x0, z1], [cx, y1 + 9, cz]);
      }
      // UV 원기둥/원뿔대(옆면 + 선택적 윗면)
      function uvCyl(mat, x, z, y0, y1, r0, r1, seg, cap, rot) {
        var circ = PI * (r0 + r1), j;
        for (j = 0; j < seg; j++) {
          var a0 = (j / seg) * PI * 2 + (rot || 0), a1 = ((j + 1) / seg) * PI * 2 + (rot || 0), am = (a0 + a1) / 2;
          var u0 = circ * j / seg, u1 = circ * (j + 1) / seg;
          Q(mat, [x + cos(a0) * r0, y0, z + sin(a0) * r0], [x + cos(a1) * r0, y0, z + sin(a1) * r0], [x + cos(a1) * r1, y1, z + sin(a1) * r1], [x + cos(a0) * r1, y1, z + sin(a0) * r1],
            [u0, y0], [u1, y0], [u1, y1], [u0, y1], [x + cos(am) * 9, (y0 + y1) / 2, z + sin(am) * 9]);
          if (cap) Q(mat, [x + cos(a0) * r1, y1, z + sin(a0) * r1], [x + cos(a1) * r1, y1, z + sin(a1) * r1], [x, y1, z], null, [x + cos(a0) * r1, z + sin(a0) * r1], [x + cos(a1) * r1, z + sin(a1) * r1], [x, z], null, [x, y1 + 9, z]);
        }
      }

      // ---------- 두께 있는 벽(slab): 창·아치 자리가 진짜로 뚫림 ----------
      // o.map(u,v,d)->[x,y,z]; 면 dA<dB; faceA/faceB: [[y0,y1,mat],...]; holes: {u0,u1,lo(u),hi(u),n,blind,side,depth,rev}
      function slab(o) {
        var M = o.map, dA = o.dA, dB = o.dB;
        var bot = o.bot || function () { return 0; }, top = o.top, holes = o.holes || [];
        var S = [o.u0, o.u1], u, st = o.step || 0.5, i, k;
        for (u = o.u0 + st; u < o.u1 - 1e-4; u += st) S.push(u);
        (o.extraU || []).forEach(function (v) { S.push(v); });
        function uList(side) {
          var L = S.slice();
          holes.forEach(function (h) { if (h.blind && h.side !== side) return; var n = h.n || 1; for (var q = 0; q <= n; q++) L.push(h.u0 + (h.u1 - h.u0) * q / n); });
          L.sort(function (a, b) { return a - b; });
          var out = [L[0]];
          for (var q2 = 1; q2 < L.length; q2++) if (L[q2] - out[out.length - 1] > 1e-4) out.push(L[q2]);
          return out;
        }
        var U = null;
        function emit(d, side, layers, ua, ub, la, ha, lb, hb) {
          for (var li = 0; li < layers.length; li++) {
            var L = layers[li], l0 = L[0], l1 = L[1];
            var la2 = max(la, l0), ha2 = min(ha, l1), lb2 = max(lb, l0), hb2 = min(hb, l1);
            if (ha2 <= la2 + 1e-5 && hb2 <= lb2 + 1e-5) continue;
            ha2 = max(ha2, la2); hb2 = max(hb2, lb2);
            Q(L[2], M(ua, la2, d), M(ub, lb2, d), M(ub, hb2, d), M(ua, ha2, d), [ua, la2], [ub, lb2], [ub, hb2], [ua, ha2], M((ua + ub) / 2, (la2 + ha2 + lb2 + hb2) / 4, d + side * 30));
          }
        }
        function face(d, layers, side) {
          if (!layers) return;
          U = uList(side);
          for (var i2 = 0; i2 < U.length - 1; i2++) {
            var ua = U[i2], ub = U[i2 + 1], mid = (ua + ub) / 2, ea = ua + E, eb = ub - E, h = null;
            for (var q = 0; q < holes.length; q++) if (mid > holes[q].u0 && mid < holes[q].u1) h = holes[q];
            var ba = bot(ea), bb = bot(eb), ta = top(ea), tb = top(eb);
            if (h && (!h.blind || h.side === side)) {
              var la = h.lo(ea), lb = h.lo(eb), ha = h.hi(ea), hb = h.hi(eb);
              if (la > ba + 1e-3 || lb > bb + 1e-3) emit(d, side, layers, ua, ub, ba, la, bb, lb);
              if (ha < ta - 1e-3 || hb < tb - 1e-3) emit(d, side, layers, ua, ub, ha, ta, hb, tb);
            } else emit(d, side, layers, ua, ub, ba, ta, bb, tb);
          }
        }
        face(dA, o.faceA, -1); face(dB, o.faceB, 1);
        // 창/아치 안쪽 면(reveal)
        holes.forEach(function (h) {
          var mat = h.rev || o.rev || mGrey, d0, d1, N = h.n || 1, j;
          if (!h.blind) { d0 = dA; d1 = dB; } else if (h.side === 1) { d0 = dB - h.depth; d1 = dB; } else { d0 = dA; d1 = dA + h.depth; }
          var dm = (d0 + d1) / 2, um = (h.u0 + h.u1) / 2;
          for (j = 0; j < N; j++) {
            var ua = h.u0 + (h.u1 - h.u0) * j / N, ub = h.u0 + (h.u1 - h.u0) * (j + 1) / N;
            var la = h.lo(ua + E), lb = h.lo(ub - E), ha = h.hi(ua + E), hb = h.hi(ub - E);
            if (la > 0.02 || lb > 0.02) Q(mat, M(ua, la, d0), M(ub, lb, d0), M(ub, lb, d1), M(ua, la, d1), [ua, 0], [ub, 0], [ub, d1 - d0], [ua, d1 - d0], M((ua + ub) / 2, la + 5, dm));
            Q(mat, M(ua, ha, d0), M(ub, hb, d0), M(ub, hb, d1), M(ua, ha, d1), [ua, 0], [ub, 0], [ub, d1 - d0], [ua, d1 - d0], M((ua + ub) / 2, ha - 5, dm));
          }
          var lo0 = h.lo(h.u0 + E), hi0 = h.hi(h.u0 + E), lo1 = h.lo(h.u1 - E), hi1 = h.hi(h.u1 - E);
          if (hi0 > lo0) Q(mat, M(h.u0, lo0, d0), M(h.u0, lo0, d1), M(h.u0, hi0, d1), M(h.u0, hi0, d0), [0, lo0], [d1 - d0, lo0], [d1 - d0, hi0], [0, hi0], M(h.u0 + 5, (lo0 + hi0) / 2, dm));
          if (hi1 > lo1) Q(mat, M(h.u1, lo1, d0), M(h.u1, lo1, d1), M(h.u1, hi1, d1), M(h.u1, hi1, d0), [0, lo1], [d1 - d0, lo1], [d1 - d0, hi1], [0, hi1], M(h.u1 - 5, (lo1 + hi1) / 2, dm));
          if (h.blind) {   // 막힌 아치: 안쪽 뒷판
            var dd = h.side === 1 ? dB - h.depth : dA + h.depth;
            for (j = 0; j < N; j++) {
              var ua2 = h.u0 + (h.u1 - h.u0) * j / N, ub2 = h.u0 + (h.u1 - h.u0) * (j + 1) / N;
              var a1 = h.lo(ua2 + E), a2 = h.hi(ua2 + E), b1 = h.lo(ub2 - E), b2 = h.hi(ub2 - E);
              Q(h.back || { c: 0x5f5a55 }, M(ua2, a1, dd), M(ub2, b1, dd), M(ub2, b2, dd), M(ua2, a2, dd), [ua2, a1], [ub2, b1], [ub2, b2], [ua2, a2], M(um, (a1 + a2) / 2, dd + h.side * 30));
            }
          }
        });
      }
      // 좌표 변환기
      function mapZ(p) { var f = function (u, v, d) { return [p + d, v, u]; }; f.ry = -PI / 2; f.ax = 'z'; return f; }   // 벽이 z 방향으로 달림 (x = p + d)
      function mapX(p) { var f = function (u, v, d) { return [u, v, p + d]; }; f.ry = 0; f.ax = 'x'; return f; }          // 벽이 x 방향으로 달림 (z = p + d)
      function mapAng(Ax, Az, Bx, Bz, cx, cz) {   // A->B 면, d>0 이 중심(cx,cz) 쪽(안쪽)
        var dx = Bx - Ax, dz = Bz - Az, L = sqrt(dx * dx + dz * dz); dx /= L; dz /= L;
        var nx = -dz, nz = dx;
        if (nx * (cx - Ax) + nz * (cz - Az) < 0) { nx = -nx; nz = -nz; }
        var f = function (u, v, d) { return [Ax + dx * u + nx * d, v, Az + dz * u + nz * d]; };
        f.ry = Math.atan2(-dz, dx); f.ax = 'a'; f.L = L; f.nx = nx; f.nz = nz;
        return f;
      }
      // 구멍 생성기
      function holePointed(uc, w, y0, y1, rise, n) {
        var f = pf(w / 2, rise);
        return { uc: uc, w: w, y0: y0, y1: y1, rise: rise, u0: uc - w / 2, u1: uc + w / 2, n: n || 8, lo: function () { return y0; }, hi: function (u) { return y1 + f(u - uc); } };
      }
      function holeCircle(uc, yc, r) {
        return { uc: uc, u0: uc - r, u1: uc + r, n: 20, circle: true, yc: yc, r: r, lo: function (u) { var q = r * r - (u - uc) * (u - uc); return yc - (q > 0 ? sqrt(q) : 0); }, hi: function (u) { var q = r * r - (u - uc) * (u - uc); return yc + (q > 0 ? sqrt(q) : 0); } };
      }
      // 아치 테두리(회색 벽돌 몰딩): 벽 양쪽 면에 띠를 붙인다
      function archRing(M, uc, y0, a, rise, w, dFaces) {
        var n = 10, fi = pf(a, rise), fo = pf(a + w, rise + w * 0.9), i;
        dFaces.forEach(function (dd) {
          for (i = 0; i < n; i++) {
            var k0 = -1 + 2 * i / n, k1 = -1 + 2 * (i + 1) / n;
            var i0 = [uc + a * k0, y0 + fi(a * k0)], i1 = [uc + a * k1, y0 + fi(a * k1)];
            var o0 = [uc + (a + w) * k0, y0 + fo((a + w) * k0)], o1 = [uc + (a + w) * k1, y0 + fo((a + w) * k1)];
            Q(mGrey, M(i0[0], i0[1], dd[0]), M(i1[0], i1[1], dd[0]), M(o1[0], o1[1], dd[0]), M(o0[0], o0[1], dd[0]), i0, i1, o1, o0, M(uc, y0 + 3, dd[0] + dd[1] * 30));
          }
        });
      }
      // 벽 좌표계(M)의 상자: 벽 면 dw 에서 df 까지 튀어나온 띠·창대(벽 쪽 면은 만들지 않는다)
      function mBox(mat, M, u0, u1, v0, v1, dw, df) {
        var um = (u0 + u1) / 2, vm = (v0 + v1) / 2, dm = (dw + df) / 2, z = [0, 0];
        Q(mat, M(u0, v0, df), M(u1, v0, df), M(u1, v1, df), M(u0, v1, df), z, z, z, z, M(um, vm, df + (df - dw) * 99));
        Q(mat, M(u0, v0, dw), M(u0, v0, df), M(u0, v1, df), M(u0, v1, dw), z, z, z, z, M(u0 - 9, vm, dm));
        Q(mat, M(u1, v0, dw), M(u1, v0, df), M(u1, v1, df), M(u1, v1, dw), z, z, z, z, M(u1 + 9, vm, dm));
        Q(mat, M(u0, v1, dw), M(u1, v1, dw), M(u1, v1, df), M(u0, v1, df), z, z, z, z, M(um, v1 + 9, dm));
        Q(mat, M(u0, v0, dw), M(u1, v0, dw), M(u1, v0, df), M(u0, v0, df), z, z, z, z, M(um, v0 - 9, dm));
      }
      // 창·문 둘레 몰딩(회색 벽돌 창틀): 문설주 + 첨두 아치 띠가 벽 면 dw 에서 df 까지 튀어나온다(앞면 + 바깥·안쪽 옆면).
      // h = holePointed 구멍, wB = 띠 폭. 벽 면에 떠 있는 판이 아니라 두께가 있어 비스듬히 봐도 틈이 없다.
      function surround(M, h, wB, dw, df, lite) {   // lite: 앞면만(높은 곳의 창 — 옆면은 아래에서 보이지 않는다)
        var a = h.w / 2, fi = pf(a, h.rise), fo = pf(a + wB, h.rise + wB * 0.9), n = 10, i, z = [0, 0], dm = (dw + df) / 2, far = df + (df - dw) * 99;
        [-1, 1].forEach(function (k) {
          var ui = h.uc + k * a, uo = h.uc + k * (a + wB), vm = (h.y0 + h.y1) / 2;
          Q(mGrey, M(ui, h.y0, df), M(uo, h.y0, df), M(uo, h.y1, df), M(ui, h.y1, df), z, z, z, z, M(h.uc, vm, far));
          if (lite) return;
          Q(mGrey, M(uo, h.y0, dw), M(uo, h.y0, df), M(uo, h.y1, df), M(uo, h.y1, dw), z, z, z, z, M(uo + k * 9, vm, dm));
          Q(mGrey, M(ui, h.y0, dw), M(ui, h.y0, df), M(ui, h.y1, df), M(ui, h.y1, dw), z, z, z, z, M(ui - k * 9, vm, dm));
        });
        for (i = 0; i < n; i++) {
          var k0 = -1 + 2 * i / n, k1 = -1 + 2 * (i + 1) / n;
          var i0 = [h.uc + a * k0, h.y1 + fi(a * k0)], i1 = [h.uc + a * k1, h.y1 + fi(a * k1)];
          var o0 = [h.uc + (a + wB) * k0, h.y1 + fo((a + wB) * k0)], o1 = [h.uc + (a + wB) * k1, h.y1 + fo((a + wB) * k1)];
          var mu = (o0[0] + o1[0]) / 2 - h.uc, mv = (o0[1] + o1[1]) / 2 - h.y1 + 0.3;
          Q(mGrey, M(i0[0], i0[1], df), M(i1[0], i1[1], df), M(o1[0], o1[1], df), M(o0[0], o0[1], df), z, z, z, z, M(h.uc, h.y1 + 1, far));
          if (lite) continue;
          Q(mGrey, M(o0[0], o0[1], dw), M(o1[0], o1[1], dw), M(o1[0], o1[1], df), M(o0[0], o0[1], df), z, z, z, z, M(h.uc + mu * 9, h.y1 + mv * 9, dm));
          Q(mGrey, M(i0[0], i0[1], dw), M(i1[0], i1[1], dw), M(i1[0], i1[1], df), M(i0[0], i0[1], df), z, z, z, z, M(h.uc, h.y1 - 0.3, dm));
        }
      }

      // ---------- 유리(스테인드글라스): 진짜 창 구멍 안에 납틀 + 색유리 칸 ----------
      var JEW = { blue: [0x1b3f9a, 0x2a56b8, 0x23479f, 0x315fc2], red: [0xb52a30, 0xc8383c, 0xa3242c], amber: [0xe0a93c, 0xeabb4a, 0xd49a2e], cream: [0xe8dfc2, 0xf0e8cf], green: [0x2f7d5b, 0x3b9168], purple: [0x6f3b86], skin: [0xf0d1ae] };
      function pickc(arr, r) { return arr[Math.floor(r() * arr.length) % arr.length]; }
      function lancetOutline(us, hw, y0, hR, rise, n) {
        var pts = [[us - hw, y0], [us + hw, y0], [us + hw, y0 + hR]], f = pf(hw, rise), i;
        for (i = 1; i <= n; i++) { var u = hw - 2 * hw * i / n; pts.push([us + u, y0 + hR + f(u)]); }
        pts.push([us - hw, y0 + hR]);
        return pts;
      }
      function windowGlass(o) {
        var M = o.M, d = o.d, inS = o.inS, uc = o.uc, y0 = o.y0, w = o.w, hR = o.hRect, rise = o.rise, r = G.rng(o.seed || 1);
        function P(u, v, dd) { return M(uc + u, v, d + inS * (dd || 0)); }
        var hintP = P(0, y0 + hR / 2, 30);
        function poly(pts, color, dd, vary) {
          var n = pts.length, cu = 0, cv = 0, i, vs = [];
          for (i = 0; i < n; i++) { cu += pts[i][0]; cv += pts[i][1]; }
          cu /= n; cv /= n;
          var c0 = P(cu, cv, dd);
          for (i = 0; i < n; i++) { var a = P(pts[i][0], pts[i][1], dd), b = P(pts[(i + 1) % n][0], pts[(i + 1) % n][1], dd); vs.push(c0[0], c0[1], c0[2], a[0], a[1], a[2], b[0], b[1], b[2]); }
          glass.addTris(vs, color, hintP, { vary: vary === undefined ? 0.07 : vary });
          if (dd > 0 && o.refl && ctx._.batches.glassRefl) ctx._.batches.glassRefl.addTris(vs, 0xffffff, hintP, { vary: 0 });
        }
        function shrink(pts, k) {
          var cu = 0, cv = 0, n = pts.length, i;
          for (i = 0; i < n; i++) { cu += pts[i][0]; cv += pts[i][1]; }
          cu /= n; cv /= n;
          return pts.map(function (p) { return [cu + (p[0] - cu) * k, cv + (p[1] - cv) * k]; });
        }
        function circle(cu, cv, rr, n) { var pts = [], i; for (i = 0; i < n; i++) pts.push([cu + cos(i / n * PI * 2) * rr, cv + sin(i / n * PI * 2) * rr]); return pts; }
        // 한 개의 첨두창 칸: 납틀 배경 + 색 칸들
        function lancet(us, hw, yy0, hh, rs, colorFn, cols) {
          poly(lancetOutline(us, hw, yy0, hh, rs, 8), C.glassLead, 0, 0);
          var rows = max(2, Math.round(hh / (o.rowH || 0.5))), i, j;
          cols = cols || (hw > 0.5 ? 3 : 2);
          for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
            var x0 = us - hw + 2 * hw * i / cols, x1 = us - hw + 2 * hw * (i + 1) / cols, yb = yy0 + hh * j / rows, yt = yy0 + hh * (j + 1) / rows;
            poly(shrink([[x0, yb], [x1, yb], [x1, yt], [x0, yt]], 0.9), colorFn(i, j, cols, rows), 0.006);
          }
          var f = pf(hw, rs), nn = 6, ctr = [us, yy0 + hh + rs * 0.34], outer = [], inner = [];
          for (i = 0; i <= nn; i++) { var u = -hw + 2 * hw * i / nn; var p = [us + u, yy0 + hh + f(u)]; outer.push(p); inner.push([ctr[0] + (p[0] - ctr[0]) * 0.42, ctr[1] + (p[1] - ctr[1]) * 0.42]); }
          for (i = 0; i < nn; i++) poly(shrink([outer[i], outer[i + 1], inner[i + 1], inner[i]], 0.9), colorFn(i, rows, nn, rows + 1), 0.006);
          poly(shrink(inner.concat([[us + hw * 0.0 + 0.0, ctr[1] - 0.05]]), 0.9), pickc(JEW.amber, r), 0.006);
        }
        var style = o.style || 'tapestry';
        function tapestry(i, j, cols, rows) {
          var sd = (o.seed || 0) % 3;
          if (cols >= 3) {                                   // 세 칸: 양쪽 금색 띠, 가운데는 파랑 바탕에 붉은·흰 띠
            if (i === 0 || i === cols - 1) return pickc(JEW.amber, r);
            return (j + sd) % 4 === 0 ? pickc(JEW.red, r) : ((j + sd) % 4 === 2 ? pickc(JEW.cream, r) : pickc(JEW.blue, r));
          }
          if (i === 0) return (j + sd) % 2 ? pickc(JEW.amber, r) : pickc(JEW.red, r);   // 두 칸: 바깥은 금/붉은 리본
          return (j + sd) % 3 === 0 ? pickc(JEW.cream, r) : pickc(JEW.blue, r);
        }
        if (style === 'twin') {          // 쌍둥이 첨두창 + 위 원창(장미 무늬)
          var hw = w / 4 - 0.035;
          // 돌 트레이서리 판: 창 구멍 전체를 유리 바로 뒤(바깥쪽 1.5cm)에서 막는다 — 두 첨두창과 원창 사이(스팬드럴)가 뚫려 보이지 않게
          (function () {
            var pts = lancetOutline(0, w / 2, y0, hR, rise, 10), n = pts.length, cu = 0, cv = 0, i, vs = [];
            for (i = 0; i < n; i++) { cu += pts[i][0]; cv += pts[i][1]; }
            var c0 = P(cu / n, cv / n, -0.015);
            for (i = 0; i < n; i++) { var a = P(pts[i][0], pts[i][1], -0.015), b = P(pts[(i + 1) % n][0], pts[(i + 1) % n][1], -0.015); vs.push(c0[0], c0[1], c0[2], a[0], a[1], a[2], b[0], b[1], b[2]); }
            solid.addTris(vs, C.tracery, hintP, { vary: 0.02 });
          })();
          lancet(-w / 4, hw, y0, hR, hw * 1.35, tapestry, 2);
          lancet(w / 4, hw, y0, hR, hw * 1.35, function (i, j, c, rw) { return tapestry(c - 1 - i, j + 1, c, rw); }, 2);
          var oc = [0, y0 + hR + hw * 1.35 + 0.1], orad = w * 0.17;
          poly(circle(oc[0], oc[1], orad * 1.05, 14), C.glassLead, 0, 0);
          for (var q = 0; q < 6; q++) {
            var a0 = q / 6 * PI * 2, a1 = (q + 1) / 6 * PI * 2;
            poly(shrink([[oc[0], oc[1]], [oc[0] + cos(a0) * orad, oc[1] + sin(a0) * orad], [oc[0] + cos((a0 + a1) / 2) * orad * 1.0, oc[1] + sin((a0 + a1) / 2) * orad * 1.0], [oc[0] + cos(a1) * orad, oc[1] + sin(a1) * orad]], 0.88), q % 2 ? pickc(JEW.red, r) : pickc(JEW.amber, r), 0.006);
          }
          // 가운데 돌 멀리온
          ctx.box({ x: M(uc, 0, d)[0], y: y0, z: M(uc, 0, d)[2], w: 0.1, h: hR + hw * 1.35 - 0.05, d: 0.18, ry: M.ry, color: C.stone });
        } else if (style === 'medal') {  // 후진 로사리오 창: 파란 바탕 + 원형 장면 3개(색 면)
          lancet(0, w / 2 - 0.02, y0, hR, rise - 0.02, function (i, j, cols, rows) {
            if (i === 0 || i === cols - 1) return pickc(JEW.amber, r);
            return ((i + j) % 5 === 0) ? pickc(JEW.red, r) : pickc(JEW.blue, r);
          }, 3);
          var meds = o.figure ? [0.12, 0.88] : [0.17, 0.46, 0.75], mr = w * 0.33;
          meds.forEach(function (mf, mi) {
            var cv = y0 + hR * mf, cc = [pickc(JEW.red, r), pickc(JEW.cream, r), pickc(JEW.green, r), pickc(JEW.purple, r)][(mi + (o.seed || 0)) % 4];
            poly(circle(0, cv, mr, 16), C.glassLead, 0.009, 0);
            poly(circle(0, cv, mr * 0.93, 16), pickc(JEW.amber, r), 0.011);
            poly(circle(0, cv, mr * 0.78, 16), cc, 0.013);
            var bodyc = [pickc(JEW.blue, r), pickc(JEW.red, r), pickc(JEW.cream, r)][(mi + 1 + (o.seed || 0)) % 3];
            poly([[-mr * 0.34, cv - mr * 0.6], [mr * 0.34, cv - mr * 0.6], [mr * 0.2, cv + mr * 0.2], [-mr * 0.2, cv + mr * 0.2]], bodyc, 0.016);
            poly(circle(0, cv + mr * 0.38, mr * 0.16, 8), pickc(JEW.skin, r), 0.018, 0.02);
            poly(circle(0, cv + mr * 0.38, mr * 0.27, 10), pickc(JEW.amber, r), 0.015);
          });
          if (o.figure) {   // 가운데 창: 붉은 옷의 큰 인물(색 면)
            var fv = y0 + hR * 0.5;
            poly(circle(0, fv + 1.0, 0.36, 14), pickc(JEW.amber, r), 0.016);
            poly([[-0.46, fv - 1.3], [0.46, fv - 1.3], [0.3, fv + 0.62], [-0.3, fv + 0.62]], pickc(JEW.red, r), 0.02);
            poly([[-0.14, fv - 1.3], [0.14, fv - 1.3], [0.1, fv + 0.62], [-0.1, fv + 0.62]], pickc(JEW.cream, r), 0.022);
            poly(circle(0, fv + 1.0, 0.17, 8), pickc(JEW.skin, r), 0.024, 0.02);
            poly([[-0.62, fv - 0.15], [-0.3, fv + 0.42], [-0.2, fv + 0.3], [-0.46, fv - 0.3]], pickc(JEW.blue, r), 0.021);
          }
        } else if (style === 'tymp') {   // 문 위 반월창(팀파눔): 납틀 바탕 + 부채꼴 두 겹의 옅은 무늬 유리.
          // 실제 이 자리의 이남규 1989년 창(저작권 존속)은 그림도 화풍도 흉내 내지 않는다 — 색조만 있는 중립 방사 무늬(GLASS_ALL_CHURCHES_PLAN §2.6).
          var ta = w / 2 - 0.03, tf = pf(w / 2, rise), tn = 8, ti, tc = [0, y0 + 0.04], tOut = [], tMid = [], tInn = [];
          var PALE = [[0xe9d9a8, 0xe3cf98], [0xcfdbe0, 0xc3d2da], [0xf0ead8, 0xe8e0c8], [0xd3dcc6, 0xc9d6bd]];
          var lead = [[-w / 2, y0], [w / 2, y0]];
          for (ti = 1; ti < 12; ti++) { var lu = w / 2 - w * ti / 12; lead.push([lu, y0 + tf(lu)]); }
          poly(lead, C.glassLead, 0, 0);
          for (ti = 0; ti <= tn; ti++) {
            var tu = -ta + 2 * ta * ti / tn, tp = [tu, max(tc[1], y0 + tf(tu) - 0.035)];
            tOut.push(tp); tMid.push([tc[0] + (tp[0] - tc[0]) * 0.58, tc[1] + (tp[1] - tc[1]) * 0.58]); tInn.push([tc[0] + (tp[0] - tc[0]) * 0.22, tc[1] + (tp[1] - tc[1]) * 0.22]);
          }
          for (ti = 0; ti < tn; ti++) {
            poly(shrink([tMid[ti], tMid[ti + 1], tOut[ti + 1], tOut[ti]], 0.9), pickc(PALE[ti % 2], r), 0.006, 0.04);
            poly(shrink([tInn[ti], tInn[ti + 1], tMid[ti + 1], tMid[ti]], 0.88), pickc(PALE[2 + ti % 2], r), 0.006, 0.04);
          }
          poly(shrink(tInn.concat([tc]), 0.86), pickc(PALE[0], r), 0.006, 0.04);
        } else {                         // 단일 첨두창
          lancet(0, w / 2 - 0.02, y0, hR, rise - 0.02, tapestry, w > 1.25 ? 3 : 2);
        }
        if (o.beam) {
          var pw = P(0, y0 + hR * 0.5, 0), pn = P(0, 0, 1), p0 = P(0, 0, 0);
          ctx.addWindowBeam({ x: pw[0], y: pw[1], z: pw[2], face: [pn[0] - p0[0], pn[2] - p0[2]], w: w * 0.8 * (o.beamK || 1), h: hR * 0.9, colors: [0x2457b5, 0xe0a93c, 0xb52a30], reach: o.beam });
        }
      }
      // 창 구멍 + 유리를 한 번에: 구멍은 slab 의 holes 에 넣고, 유리는 벽 바깥쪽(두께의 1/3)에 놓는다
      function glazeInSlab(slabDef, h, inS, style, seed, beam, figure, refl, beamK) {
        var d = inS > 0 ? slabDef.dA + 0.2 : slabDef.dB - 0.2;
        windowGlass({ M: slabDef.map, d: d, inS: inS, uc: h.uc, y0: h.y0, w: h.w, hRect: h.y1 - h.y0, rise: h.rise, style: style, seed: seed, beam: beam, beamK: beamK, figure: figure, refl: refl });
      }

      // ---------- 늑골 궁륭 ----------
      var vaultTrisRes = ctx.quality === 'low' ? 4 : 6;
      function vaultCell(o) {
        var x0 = o.x0, x1 = o.x1, z0 = o.z0, z1 = o.z1, y = o.y, rise = o.rise, res = o.res || vaultTrisRes;
        var ax = (x1 - x0) / 2, az = (z1 - z0) / 2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        var fu = pf(ax, rise), fv = pf(az, rise);
        // 교차 리브 궁륭(그로인 볼트) = 두 첨두 통 궁륭의 **합집합**: 칸의 네 가장자리는 열린 아치(횡단 아치·벽 아치)이고 대각선은 아래로 선 모서리(리브 자리)다.
        // (예전에는 min(fu, fv) = 교집합이라 칸마다 네 변이 기공 높이까지 내려오는 수도원식 궁륭이 됐다: 칸 경계마다 흰 면이 커튼처럼 처지고,
        //  고측창·측랑 창·벽 아치의 기공 위쪽이 궁륭 면 뒤에 가려 실내에서 보이지 않았다 — STRUCTURE_AUDIT_OTHERS §2.6 V1.)
        // 대각선 위 높이 D(t) = 두 통 궁륭 중 낮은 쪽. 그 사이의 면(웹)은 대각선에서 가장자리 아치까지 곧게 잇는다 → 대각선 리브와 면의 접힘이 정확히 겹친다.
        function D(t) { return min(fu(ax * t), fv(az * t)); }
        function H(u, v) {
          var p = min(1, abs(u) / ax), q = min(1, abs(v) / az), d0;
          if (p <= q) { if (p >= 1) return 0; d0 = D(p); return d0 + (fu(u) - d0) * (q - p) / (1 - p); }
          d0 = D(q); return d0 + (fv(v) - d0) * (p - q) / (1 - q);
        }
        var cTop = G.toColor(o.color || C.vault), cLow = cTop.clone().multiplyScalar(0.86), i, j;
        for (i = 0; i < res; i++) for (j = 0; j < res; j++) {
          var u0 = -ax + 2 * ax * i / res, u1 = -ax + 2 * ax * (i + 1) / res, v0 = -az + 2 * az * j / res, v1 = -az + 2 * az * (j + 1) / res;
          var h00 = H(u0, v0), h10 = H(u1, v0), h11 = H(u1, v1), h01 = H(u0, v1);
          var ck = cLow.clone().lerp(cTop, min(1, (h00 + h11 + h10 + h01) / (4 * rise)));
          var qa = [cx + u0, y + h00, cz + v0], qb = [cx + u1, y + h10, cz + v0], qc = [cx + u1, y + h11, cz + v1], qd = [cx + u0, y + h01, cz + v1];
          // 삼각형 나눔을 접힘(대각선) 방향에 맞춘다: 반대 대각선 위의 칸은 b–d 로 나눈다
          if (i + j === res - 1) solid.addQuad(qb, qc, qd, qa, ck, [cx, y - 1, cz]); else solid.addQuad(qa, qb, qc, qd, ck, [cx, y - 1, cz]);
        }
        var rt = o.ribT || 0.36, rc = o.ribColor || C.rib, ed = o.edges || { n: 1, s: 1, w: 1, e: 1 }, k, rn = res <= 4 ? 4 : 5;
        function rib(pts, t) { for (var q = 0; q < pts.length - 1; q++) solid.addBeam(pts[q], pts[q + 1], t, t * 1.3, rc, { vary: 0.02 }); }
        var dg1 = [], dg2 = [];
        for (k = 0; k <= rn; k++) {
          var uu = -ax + 2 * ax * k / rn, vv = -az + 2 * az * k / rn;
          dg1.push([cx + uu, y + H(uu, vv) - 0.04, cz + vv]);
          dg2.push([cx + uu, y + H(uu, -vv) - 0.04, cz - vv]);
        }
        rib(dg1, rt); rib(dg2, rt);
        function edgeU(zz) { var pts = []; for (var q = 0; q <= rn; q++) { var uq = -ax + 2 * ax * q / rn; pts.push([cx + uq, y + fu(uq) - 0.04, zz]); } rib(pts, rt * 1.25); }
        function edgeV(xx) { var pts = []; for (var q = 0; q <= rn; q++) { var vq = -az + 2 * az * q / rn; pts.push([xx, y + fv(vq) - 0.04, cz + vq]); } rib(pts, rt * 1.25); }
        if (ed.n) edgeU(z0); if (ed.s) edgeU(z1); if (ed.w) edgeV(x0); if (ed.e) edgeV(x1);
        // 종석(보스): 한 칸에 하나
        ctx.cyl({ x: cx, y: y + rise - 0.26, z: cz, r: 0.34, rTop: 0.3, h: 0.16, seg: 10, color: o.bossColor || C.boss });
        ctx.sphere({ x: cx, y: y + rise - 0.3, z: cz, r: 0.2, sy: 0.14, color: o.bossColor || C.boss, w: 8, h: 4 });
      }
      function vaultRun(o) {
        var nx = o.nx || 1, nz = o.nz || 1, bw = (o.x1 - o.x0) / nx, bd = (o.z1 - o.z0) / nz;
        for (var bx = 0; bx < nx; bx++) for (var bz = 0; bz < nz; bz++) {
          vaultCell({ x0: o.x0 + bw * bx, x1: o.x0 + bw * (bx + 1), z0: o.z0 + bd * bz, z1: o.z0 + bd * (bz + 1), y: o.y, rise: o.rise, color: o.color, ribColor: o.ribColor, ribT: o.ribT, res: o.res, bossColor: o.bossColor,
            edges: { n: 1, s: bz === nz - 1 ? 1 : 0, w: 1, e: bx === nx - 1 ? 1 : 0 } });
        }
      }

      // ---------- 평면 좌표 ----------
      var NAVE_Z = [-6, -1, 4, 9, 14, 19, 24, 31.5], CHANCEL_Z = [-25, -20, -15];
      var APSE_V = [[-4.5, -25], [-4.5, -27], [-3.64, -29.65], [-1.39, -31.28], [1.39, -31.28], [3.64, -29.65], [4.5, -27], [4.5, -25]], APSE_C = [0, -27];
      var SPR = 14, CROWN = 5;   // 신랑 궁륭 시작/상승(꼭대기 19)

      // ---------- 바닥 ----------
      // 실제는 흰 정사각 타일이 중앙 통로까지 한 가지로 깔려 있다(테두리 띠 없음). 흰 대리석 표면을 조금 눌러(반사·블룸이 타지 않게) 전체에 쓴다.
      var FLOOR_C = 0xc8c5be;
      ctx.floor({ x0: -9, x1: 9, z0: -25, z1: 31.5, y: 0, surf: 'marble_white', color: FLOOR_C, gloss: 0.85, reflect: 0.3 });
      ctx.floor({ x0: -13.5, x1: -9, z0: -15, z1: -6, y: 0, surf: 'marble_white', color: FLOOR_C, gloss: 0.85, reflect: false });
      ctx.floor({ x0: 9, x1: 13.5, z0: -15, z1: -6, y: 0, surf: 'marble_white', color: FLOOR_C, gloss: 0.85, reflect: false });
      // 신자석 마루(짙은 나무 단)
      [[-3.95, -1.0], [1.0, 3.95]].forEach(function (r) { ctx.boxAABB({ mat: 'wood', x0: r[0], x1: r[1], y0: 0, y1: 0.03, z0: -5.4, z1: 17.4, color: 0x68452c, vary: 0.03 }); });
      [[-7.6, -6.1], [6.1, 7.6]].forEach(function (r) { ctx.boxAABB({ mat: 'wood', x0: r[0], x1: r[1], y0: 0, y1: 0.03, z0: -3.2, z1: 14.1, color: 0x68452c, vary: 0.03 }); });

      // ---------- 기둥(다발기둥): 회색 벽돌 ----------
      var colliders = [];
      function addPierCollider(x, z, r) { ctx.addCollider({ x: x, z: z, r: r }); }
      function pier(x, z, s, big) {
        var rc = big ? 0.62 : 0.44, rs = big ? 0.18 : 0.15, dist = big ? 0.74 : 0.54, k, a;
        uvBox(mGrey, x - rc * 1.45, x + rc * 1.45, 0, 0.32, z - rc * 1.45, z + rc * 1.45);                  // 기단
        uvCyl(mGrey, x, z, 0.32, 4.8, rc, rc * 0.97, 8, false, PI / 8);                                      // 코어(8각)
        for (k = 0; k < 8; k++) {                                                                              // 붙임기둥 (사방 + 대각)
          a = k * PI / 4;
          var big4 = k % 2 === 0;
          uvCyl(mGrey, x + cos(a) * dist * (big4 ? 1 : 0.92), z + sin(a) * dist * (big4 ? 1 : 0.92), 0.32, 4.7, big4 ? rs : rs * 0.62, big4 ? rs * 0.92 : rs * 0.55, 6, false);
        }
        [1.3, 2.8].forEach(function (yy) { uvCyl(mGrey, x, z, yy, yy + 0.1, rc * 1.12, rc * 1.12, 8, true, PI / 8); });  // 가로 띠
        uvCyl(mGrey, x, z, 4.62, 4.98, rc * 1.2, rc * 1.3, 8, true, PI / 8);                                  // 주두
        uvBox(mGrey, x - rc * 1.35, x + rc * 1.35, 4.98, 5.1, z - rc * 1.35, z + rc * 1.35);
        // 신랑 쪽으로 궁륭까지 올라가는 가는 기둥 다발
        var nx = x - s * 0.0, face = s * 4.05, sgn = -s;  // 신랑 안쪽 방향 = -s
        var bundle = big ? 5 : 3, zs = big ? [-0.44, -0.22, 0, 0.22, 0.44] : [-0.27, 0, 0.27];
        uvBox(mGrey, min(face, face + sgn * 0.12), max(face, face + sgn * 0.12), 4.98, SPR, z - (big ? 0.62 : 0.42), z + (big ? 0.62 : 0.42));
        for (k = 0; k < bundle; k++) {
          var mid = Math.abs(zs[k]) < 0.01;
          uvCyl(mGrey, face + sgn * (0.12 + (mid ? 0.1 : 0.06)), z + zs[k], 5.1, SPR, mid ? 0.16 : 0.1, mid ? 0.15 : 0.09, 6, false);
        }
        [8.5, 11.6].forEach(function (yy) { uvBox(mGrey, min(face, face + sgn * 0.3), max(face, face + sgn * 0.3), yy, yy + 0.16, z - 0.5, z + 0.5); });
        uvCyl(mGrey, face + sgn * 0.2, z, SPR - 0.3, SPR + 0.1, 0.27, 0.3, 8, true);                          // 궁륭 시작 주두
        ctx.addCollider({ x: x, z: z, r: big ? 0.78 : 0.58 });
      }
      [-1, 1].forEach(function (s) {
        [24, 19, 14, 9, 4, -1, -20, -25].forEach(function (z) { pier(s * 4.5, z, s, false); });
        [-6, -15].forEach(function (z) { pier(s * 4.5, z, s, true); });
      });
      // 측랑 바깥벽 붙임기둥(반기둥)
      [-1, 1].forEach(function (s) {
        [24, 19, 14, 9, 4, -1, -20].forEach(function (z) {
          uvCyl(mGrey, s * 8.86, z, 0, 5.5, 0.2, 0.18, 6, false);
          uvCyl(mGrey, s * 8.86, z, 5.4, 5.7, 0.28, 0.3, 6, true);
        });
        [[-15, 0.2], [-25, 0.2]].forEach(function (q) { uvCyl(mGrey, s * 8.86, q[0], 0, 5.5, q[1], 0.18, 6, false); });
      });

      // ---------- 신랑/성단 안벽(아케이드 + 트리포리움 + 고측창) ----------
      function elevation(s, bounds, kindEnd) {
        // s: -1 왼쪽(-x) / +1 오른쪽. bounds: 오름차순 칸 경계 z 목록
        var M = mapZ(s * 4.5), holes = [], nb = bounds.length - 1, i, j;
        var cw = function (zz) { return abs(zz + 6) < 0.01 || abs(zz + 15) < 0.01 ? 0.78 : 0.58; };
        var naveSide = -s;    // 신랑 쪽 면(d 부호): 왼쪽(s=-1) 벽은 신랑이 +x 쪽 = +d
        var wins = [];
        for (i = 0; i < nb; i++) {
          var z0 = bounds[i], z1 = bounds[i + 1], zc = (z0 + z1) / 2, len = z1 - z0;
          var u0 = z0 + cw(z0), u1 = (i === nb - 1 && kindEnd === 'wall') ? z1 - 0.4 : z1 - cw(z1);
          var span = u1 - u0, ac = (u0 + u1) / 2, ah = span / 2;
          var ar = min(3.4, 2.7 * ah / 1.95);
          var hole = holePointed(ac, span, 0, 4.8, ar, 8); hole.arch = true; holes.push(hole);
          // 트리포리움: 칸마다 뾰족아치 4개(막힌 감실)
          var cl = u1 - u0, gap = 0.14, tw = (cl - gap * 5) / 4;
          for (j = 0; j < 4; j++) {
            var tc = u0 + gap + tw / 2 + j * (tw + gap);
            var th = holePointed(tc, tw, 8.75, 10.3, min(1.15, tw * 0.9), 4);
            th.blind = true; th.side = naveSide; th.depth = 0.38; th.back = { c: 0x625d58 }; th.rev = mGrey;
            holes.push(th);
          }
          // 고측창
          // 고측창: 칸마다 좁은 단일 첨두창(사진 대조 M3 — 쌍둥이 창은 측랑 쪽이다)
          var wd = holePointed(zc, 1.1, 12.0, 15.4, 1.1, 6); wd.win = true; holes.push(wd); wins.push(wd);
        }
        var top = function (u) {
          for (var q = 0; q < nb; q++) if (u <= bounds[q + 1] + 1e-9 || q === nb - 1) { var a = (bounds[q + 1] - bounds[q]) / 2, c = (bounds[q] + bounds[q + 1]) / 2; return SPR + pf(a, CROWN)(u - c); }
          return SPR;
        };
        var layer = [[0, 30, mPl]];
        var def = { map: M, dA: -0.45, dB: 0.45, u0: bounds[0], u1: bounds[nb], top: top, holes: holes, step: 0.9,
          faceA: [[0, 30, mPl]], faceB: [[0, 30, mPl]], rev: mGrey };
        slab(def);
        // 아케이드 아치 테두리 + 창 유리
        holes.forEach(function (h) {
          if (h.arch) archRing(M, h.uc, 4.8, h.w / 2, h.rise, 0.3, [[-0.51, -1], [0.51, 1]]);
        });
        wins.forEach(function (h, idx) {
          glazeInSlab(def, h, naveSide > 0 ? 1 : -1, 'tapestry', 11 + idx * 3 + (s > 0 ? 40 : 0), 10);
          surround(M, h, 0.16, naveSide * 0.45, naveSide * 0.47, true);
        });
        // 층 띠(스트링코스)
        var sx0 = s * 4.05 + naveSide * 0.0;
        [[8.4, 8.62], [11.5, 11.72]].forEach(function (b) {
          uvBox(mGrey, min(s * 4.05, s * 4.05 + naveSide * 0.09), max(s * 4.05, s * 4.05 + naveSide * 0.09), b[0], b[1], bounds[0] + 0.0, bounds[nb]);
        });
      }
      [-1, 1].forEach(function (s) { elevation(s, NAVE_Z, 'wall'); elevation(s, CHANCEL_Z, 'open'); });

      // ---------- 입구 벽(문 3 + 가운데 문 위 반월창 + 종탑 2층의 큰 창) ----------
      // 실제 정면에는 장미창이 없다: 가운데 종탑 2층에 2연 첨두 + 원창의 큰 창 하나가 있고(실내에서는 오르간 뒤), 가운데 문 위 첨두 팀파눔이 유리다.
      // slab 은 한 u 구간에 구멍 하나만 다루므로 벽을 아래(문)·위(종탑 창) 두 장으로 나눈다(YS).
      (function () {
        var M = mapX(31.5), f45 = pf(4.05, CROWN), YS = 8.0;
        var top = function (u) { return abs(u) <= 4.5 ? SPR + f45(u) : 9.5; };
        var hc = holePointed(0, 2.4, 0, 3.4, 1.3, 10), hl = holePointed(-6.75, 1.6, 0, 2.8, 0.9, 8), hr = holePointed(6.75, 1.6, 0, 2.8, 0.9, 8);
        var tw = holePointed(0, 2.6, 9.0, 14.0, 1.8, 10);
        var lo = { map: M, dA: 0, dB: 0.9, u0: -9, u1: 9, top: function () { return YS; }, holes: [hc, hl, hr], step: 1,
          faceA: [[0, 30, mPl]], faceB: [[0, 30, mOut]], rev: mGrey };
        var up = { map: M, dA: 0, dB: 0.9, u0: -9, u1: 9, bot: function () { return YS; }, top: top, holes: [tw], step: 1, extraU: [-4.5 - 1e-3, -4.5, 4.5, 4.5 + 1e-3],
          faceA: [[0, 30, mPl]], faceB: [[0, 30, mOut]], rev: mGrey };
        slab(lo); slab(up);
        surround(M, hc, 0.28, 0, -0.07);
        [hl, hr].forEach(function (h) { surround(M, h, 0.22, 0, -0.06); });
        surround(M, tw, 0.24, 0, -0.07);
        mBox(mGrey, M, -1.62, 1.62, 8.82, 9.0, 0, -0.1);                 // 종탑 창 창대
        [[-9, -7.77], [-5.73, -1.48], [1.48, 5.73], [7.77, 9]].forEach(function (q) { uvBox(mGrey, q[0], q[1], 0, 0.5, 31.43, 31.5); });   // 걸레받이(문 사이)
        // 문짝(닫힌 나무문). 가운데 문은 인방(3.4) 위 첨두 팀파눔이 유리다.
        [[hc, 3.4, true], [hl, 2.8, false], [hr, 2.8, false]].forEach(function (q) {
          var h = q[0], tymp = q[2];
          slab({ map: M, dA: 0.32, dB: 0.46, u0: h.u0 + 0.02, u1: h.u1 - 0.02, top: function (u) { return tymp ? min(q[1], h.hi(u) - 0.03) : h.hi(u) - 0.03; }, holes: [], step: 0.4, faceA: [[0, 30, { c: 0x6a4630 }]], faceB: [[0, 30, { c: 0x6a4630 }]] });
          ctx.box({ mat: 'wood', x: h.uc, y: 0, z: 31.5 + 0.3, w: 0.06, h: q[1] - 0.2, d: 0.1, color: 0x3d2a1c });
          for (var gk = 0; gk < 2; gk++) ctx.box({ x: h.uc + (gk ? 0.2 : -0.2), y: 1.05, z: 31.5 + 0.3, w: 0.07, h: 0.07, d: 0.07, color: C.gold });
          [-1, 1].forEach(function (k) {     // 문짝마다 판 두 장(아래·위)
            var pw = (h.w - 0.34) / 2, px = h.uc + k * (pw / 2 + 0.07);
            ctx.box({ x: px, y: 0.35, z: 31.5 + 0.28, w: pw, h: 0.95, d: 0.05, color: 0x7a5236 });
            ctx.box({ x: px, y: 1.5, z: 31.5 + 0.28, w: pw, h: q[1] - 1.85, d: 0.05, color: 0x7a5236 });
          });
          if (tymp) {
            ctx.box({ mat: 'wood', x: h.uc, y: q[1] - 0.1, z: 31.5 + 0.36, w: h.w, h: 0.2, d: 0.22, color: 0x4a2f1e });       // 인방
            windowGlass({ M: M, d: 0.42, inS: -1, uc: h.uc, y0: q[1], w: h.w, hRect: 0, rise: h.rise, style: 'tymp', seed: 7 });
          }
        });
        // 종탑 2층 창: 2연 첨두 + 원창(저녁 햇빛이 신랑으로 든다). 오르간 가운데 탑이 아래쪽을 가린다(실제와 같다).
        glazeInSlab(up, tw, -1, 'twin', 5, 14);
      })();

      // ---------- 측랑 바깥벽(회반죽 + 회색 벽돌 창틀: 2연 첨두 + 원창) ----------
      // 창턱 3.0 아래에는 십자가의 길 판(SPEC §30, layout.crossWay)이 칸마다 하나씩 걸린다(판 꼭대기 2.77).
      function aisleWall(s, z0, z1, winZs) {
        var M = mapZ(s * 9.45), holes = [], sg = s > 0 ? -1 : 1, dw = sg * 0.45;   // sg: 실내 쪽 d 방향, dw: 안쪽 면(x = ±9.0)
        winZs.forEach(function (zc, idx) { var h = holePointed(zc, 2.2, 3.0, 5.9, 1.5, 10); h.idx = idx; holes.push(h); });
        var inner = [[0, 30, mPl]], outer = [[0, 30, mOut]];
        var def = { map: M, dA: -0.45, dB: 0.45, u0: z0, u1: z1, top: function () { return 9.5; }, holes: holes, step: 3,
          faceA: s > 0 ? inner : outer, faceB: s > 0 ? outer : inner, rev: mGrey };
        slab(def);
        holes.forEach(function (h, idx) {
          // 빛줄기: 신랑부 창만(폭은 예전 단창 수준). 성단 옆 좁은 측랑(촛불 봉헌대 자리)은 없앤다 — 그 안에 서면 화면이 하얗게 탔다
          glazeInSlab(def, h, sg, 'twin', 71 + idx * 5 + (s > 0 ? 20 : 0), z0 === -6 ? 6 : 0, false, false, 0.55);
          surround(M, h, 0.2, dw, dw + sg * 0.06);
        });
        // 몰딩: 걸레받이 + 창턱 높이의 창대 띠(회색 벽돌)
        mBox(mGrey, M, z0, z1, 0, 0.5, dw, dw + sg * 0.07);
        mBox(mGrey, M, z0, z1, 2.84, 3.0, dw, dw + sg * 0.08);
        if (z0 === -6) ctx.addCollider({ x0: s > 0 ? 8.95 : -14, x1: s > 0 ? 14 : -8.95, z0: -6, z1: 32.5 });
      }
      aisleWall(-1, -6, 31.5, [21.5, 16.5, 11.5, 6.5, 1.5, -3.5]);
      aisleWall(1, -6, 31.5, [21.5, 16.5, 11.5, 6.5, 1.5, -3.5]);
      aisleWall(-1, -25, -15, [-17.5, -22.5]);
      aisleWall(1, -25, -15, [-17.5, -22.5]);
      // 벽 붙임기둥(반기둥)의 충돌체: 벽 충돌 면을 실제 벽 면(±8.95)에 맞췄으므로 기둥은 따로 막는다
      [-1, 1].forEach(function (s) { [24, 19, 14, 9, 4, -1].forEach(function (z) { ctx.addCollider({ x: s * 8.9, z: z, r: 0.24 }); }); });
      // 성단 옆 측랑 끝벽(측면 제대 뒤): 첨두 벽감 틀 안에 작은 6엽 장미창(서쪽 = +x 는 사진으로 확인, 동쪽은 대칭 추정)
      [-1, 1].forEach(function (s) {
        var M = mapX(-25), u0 = s > 0 ? 4.5 : -9.0, u1 = s > 0 ? 9.0 : -4.5, uc = s * 6.75, RY = 6.6, RR = 0.7;
        var rh = holeCircle(uc, RY, RR);
        slab({ map: M, dA: -0.9, dB: 0, u0: u0, u1: u1, top: function () { return 9.5; }, holes: [rh], step: 3, faceA: [[0, 30, mOut]], faceB: [[0, 30, mPl]], rev: mGrey });
        ctx.rose({ x: uc, y: RY, z: -25.32, face: [0, 1], r: RR - 0.04, petals: 6, seed: 21 + (s > 0 ? 1 : 0), beam: false, frame: false });
        // 장미창 둘레 벽돌 테(두께 있는 고리) + 6엽 돌 살
        var n = 20, i, zr = [0, 0];
        for (i = 0; i < n; i++) {
          var a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2, ri = RR, ro = RR + 0.17, am = (a0 + a1) / 2;
          var I0 = [uc + cos(a0) * ri, RY + sin(a0) * ri], I1 = [uc + cos(a1) * ri, RY + sin(a1) * ri], O0 = [uc + cos(a0) * ro, RY + sin(a0) * ro], O1 = [uc + cos(a1) * ro, RY + sin(a1) * ro];
          Q(mGrey, M(I0[0], I0[1], 0.06), M(I1[0], I1[1], 0.06), M(O1[0], O1[1], 0.06), M(O0[0], O0[1], 0.06), zr, zr, zr, zr, M(uc, RY, 30));
          Q(mGrey, M(O0[0], O0[1], 0), M(O1[0], O1[1], 0), M(O1[0], O1[1], 0.06), M(O0[0], O0[1], 0.06), zr, zr, zr, zr, M(uc + cos(am) * 9, RY + sin(am) * 9, 0.03));
          Q(mGrey, M(I0[0], I0[1], 0), M(I1[0], I1[1], 0), M(I1[0], I1[1], 0.06), M(I0[0], I0[1], 0.06), zr, zr, zr, zr, M(uc, RY, 0.03));
        }
        for (i = 0; i < 6; i++) {
          var sa = i / 6 * PI * 2 + PI / 6;
          solid.addBeam([uc + cos(sa) * RR * 0.26, RY + sin(sa) * RR * 0.26, -25.27], [uc + cos(sa) * RR, RY + sin(sa) * RR, -25.27], 0.05, 0.07, C.tracery, { vary: 0 });
        }
        // 첨두 벽감 틀(회색 벽돌 띠): 문설주 + 아치. 장미창과 그 아래 제대 벽화·성상을 한 틀로 묶는다
        surround(M, { uc: uc, w: 3.1, y0: 0.5, y1: 5.3, rise: 2.35 }, 0.2, 0, 0.06);
        [[u0, uc - 1.75], [uc + 1.75, u1]].forEach(function (q) { if (q[1] - q[0] > 0.05) mBox(mGrey, M, q[0], q[1], 0, 0.5, 0, 0.07); });
        mBox(mGrey, M, uc - 1.75, uc + 1.75, 0, 0.5, 0, 0.07);
      });

      // ---------- 익랑(좌우 팔) ----------
      [-1, 1].forEach(function (s) {
        // 끝벽(x=±13.5): 세 개의 긴 첨두창
        var Me = mapZ(s * 13.5), fe = pf(4.5, CROWN);
        var hs = [holePointed(-11.8, 1.1, 5.5, 12.0, 0.9, 8), holePointed(-10.5, 1.1, 5.5, 13.6, 0.95, 8), holePointed(-9.2, 1.1, 5.5, 12.0, 0.9, 8)];
        var inner = [[0, 30, mPl]];
        var defE = { map: Me, dA: s > 0 ? 0 : -0.9, dB: s > 0 ? 0.9 : 0, u0: -15, u1: -6, top: function (u) { return SPR + fe(u + 10.5); }, holes: hs, step: 0.8,
          faceA: s > 0 ? inner : [[0, 30, mOut]], faceB: s > 0 ? [[0, 30, mOut]] : inner, rev: mGrey };
        slab(defE);
        hs.forEach(function (h, i) { glazeInSlab(defE, h, s > 0 ? -1 : 1, 'tapestry', 90 + i * 7 + (s > 0 ? 9 : 0), 11); surround(Me, h, 0.09, 0, s > 0 ? -0.03 : 0.03, true); });
        // 끝벽 몰딩: 걸레받이 + 세 창 아래 창대 띠(회색 벽돌)
        mBox(mGrey, Me, -15, -6, 0, 0.5, 0, s > 0 ? -0.07 : 0.07);
        mBox(mGrey, Me, -15, -6, 5.32, 5.5, 0, s > 0 ? -0.08 : 0.08);
        // 앞·뒤벽(z=-6 / z=-15): 측랑이 이어지는 아치 + 창
        [[-6, 0, 0.9, -1, 'front'], [-15, -0.9, 0, 1, 'back']].forEach(function (q) {
          var Mw = mapX(q[0]), ub = s > 0 ? [4.5, 13.5] : [-13.5, -4.5], c1 = s * 6.75, c2 = s * 11.25;
          var fa = pf(2.25, CROWN);
          var op = holePointed(s * 7.0, 3.8, 0, 4.8, 2.7, 10), w1 = holePointed(c1, 1.2, 10.0, 13.4, 1.0, 8), w2 = holePointed(c2, 1.4, 12.0, 15.0, 1.0, 8);
          var innerSide = q[3];   // 안쪽 면의 d 부호
          var defW = { map: Mw, dA: q[1], dB: q[2], u0: ub[0], u1: ub[1], top: function (u) { return SPR + fa(u - (abs(u - c1) < abs(u - c2) ? c1 : c2)); }, holes: [op, w1, w2], step: 0.8, extraU: [s * 9 - 1e-3, s * 9, s * 9 + 1e-3],
            faceA: [[0, 30, mPl]], faceB: [[0, 30, mPl]], rev: mGrey };
          slab(defW);
          // 익랑 안쪽 면(z = q[0])의 걸레받이·창대 띠: 익랑 팔 구간(x 9…13.5)만 — 측랑 아치 자리는 비운다
          mBox(mGrey, Mw, s > 0 ? 9.0 : -13.5, s > 0 ? 13.5 : -9.0, 0, 0.5, innerSide < 0 ? q[1] : q[2], innerSide < 0 ? q[1] - 0.07 : q[2] + 0.07);
          mBox(mGrey, Mw, s > 0 ? 9.0 : -13.5, s > 0 ? 13.5 : -9.0, 5.32, 5.5, innerSide < 0 ? q[1] : q[2], innerSide < 0 ? q[1] - 0.08 : q[2] + 0.08);
          archRing(Mw, op.uc, 4.8, 1.9, 2.7, 0.3, [[q[1] - 0.06, -1], [q[2] + 0.06, 1]]);
          glazeInSlab(defW, w1, innerSide, 'tapestry', 120 + (s > 0 ? 3 : 0), 11);
          glazeInSlab(defW, w2, innerSide, 'tapestry', 130 + (s > 0 ? 5 : 0) + (q[4] === 'back' ? 9 : 0), 11);
        });
      });
      ctx.addCollider({ x0: 13.5, x1: 15, z0: -16, z1: -5 }); ctx.addCollider({ x0: -15, x1: -13.5, z0: -16, z1: -5 });
      [-1, 1].forEach(function (s) { ctx.addCollider({ x0: s > 0 ? 8.7 : -14, x1: s > 0 ? 14 : -8.7, z0: -26, z1: -15 }); });

      // ---------- 후진(5면 첨두창 = 로사리오 15단) ----------
      (function () {
        var i;
        for (i = 0; i < APSE_V.length - 1; i++) {
          var A = APSE_V[i], B = APSE_V[i + 1], M = mapAng(A[0], A[1], B[0], B[1], APSE_C[0], APSE_C[1] + 3), L = M.L, fa = pf(L / 2, 0.9 * L);
          var holes = [], win = null, f = i - 1;       // i=1..5 이 다섯 면
          if (i >= 1 && i <= 5) {
            var center = (i === 3), w = center ? 1.5 : 1.3;
            // 사도화 띠 위(창턱 7.6)에서 궁륭의 벽 리브 바로 아래까지: 가운데 1.5 × 8.2, 양옆 1.3 × 7.8 (벽 꼭대기 약 16.5)
            win = holePointed(L / 2, w, 7.6, center ? 14.0 : 13.6, 1.8, 8);
            holes.push(win);
          }
          var def = { map: M, dA: -0.9, dB: 0, u0: 0, u1: L, top: function (u) { return SPR + fa(u - L / 2); }, holes: holes, step: 0.6,
            faceA: [[0, 40, mOut]], faceB: [[0, 2.5, mWainscot], [2.5, 6.7, mPl], [6.7, 40, mPl]], rev: mGrey };
          slab(def);
          // 징두리 위 가로 띠 + 아래 금빛 판(사도화) 틀
          if (win) glazeInSlab(def, win, 1, 'medal', 150 + i * 4, i === 3 ? 12 : 10, i === 3, i === 3);
          if (win) { surround(M, win, 0.2, 0, 0.06); mBox(mGrey, M, 0.04, L - 0.04, 7.42, 7.6, 0, 0.08); }   // 창틀 + 창대 띠
          // 14사도화: 면마다 3,3,2,3,3 (가운데 면은 2) — 금 바탕 + 어두운 인물 색 면
          var np = (i >= 1 && i <= 5) ? [3, 3, 2, 3, 3][i - 1] : 0;
          for (var pj = 0; pj < np; pj++) {
            var pu = L * (pj + 0.5) / np, pw = min(0.78, L / np - 0.18);
            var p0 = M(pu - pw / 2, 2.6, 0.04), p1 = M(pu + pw / 2, 2.6, 0.04), p2 = M(pu + pw / 2, 5.0, 0.04), p3 = M(pu - pw / 2, 5.0, 0.04);
            Q({ c: C.gold }, p0, p1, p2, p3, [0, 0], [0, 0], [0, 0], [0, 0], M(pu, 3.8, 20));
            var fig = M(pu, 3.0, 0.07), fig2 = M(pu + pw * 0.22, 3.0, 0.07);
            Q({ c: [0x5a3b2a, 0x7a2f2f, 0x2d4570, 0x4c5a39][(pj + i) % 4] }, M(pu - pw * 0.3, 2.75, 0.07), M(pu + pw * 0.3, 2.75, 0.07), M(pu + pw * 0.16, 4.2, 0.07), M(pu - pw * 0.16, 4.2, 0.07), [0, 0], [0, 0], [0, 0], [0, 0], M(pu, 3.5, 20));
            var hp = M(pu, 4.45, 0.075);
            ctx.sphere({ x: hp[0], y: hp[1], z: hp[2], r: 0.1, color: 0xefd0aa, w: 6, h: 4 });
          }
        }
      })();

      // ---------- 궁륭 ----------
      var VY = SPR, VR = CROWN;
      vaultRun({ x0: -4.05, x1: 4.05, z0: -6, z1: 24, nz: 6, y: VY, rise: VR, color: C.vault });
      vaultRun({ x0: -4.05, x1: 4.05, z0: 24, z1: 31.5, nz: 1, y: VY, rise: VR, color: C.vault });
      vaultRun({ x0: -4.5, x1: 4.5, z0: -15, z1: -6, y: VY, rise: VR, color: C.vault, res: 8 });
      vaultRun({ x0: -4.05, x1: 4.05, z0: -25, z1: -15, nz: 2, y: VY, rise: VR, color: C.vault });
      [-1, 1].forEach(function (s) {
        vaultRun({ x0: s > 0 ? 4.5 : -13.5, x1: s > 0 ? 13.5 : -4.5, z0: -15, z1: -6, nx: 2, y: VY, rise: VR, color: C.vault });
        var ax0 = s > 0 ? 4.95 : -8.9, ax1 = s > 0 ? 8.9 : -4.95;
        vaultRun({ x0: ax0, x1: ax1, z0: -6, z1: 24, nz: 6, y: 5.5, rise: 3.0, color: C.vault, ribT: 0.24, res: 4 });
        vaultRun({ x0: ax0, x1: ax1, z0: 24, z1: 31.5, nz: 1, y: 5.5, rise: 3.0, color: C.vault, ribT: 0.24, res: 4 });
        vaultRun({ x0: ax0, x1: ax1, z0: -25, z1: -15, nz: 2, y: 5.5, rise: 3.0, color: C.vault, ribT: 0.24, res: 4 });
      });
      // 교차부·후진(폭 ±4.5)과 신랑·성단(폭 ±4.05)의 횡단 아치가 만나는 곳: 두 아치 사이의 초승달 면을 회색 벽돌 아치 면으로 막는다
      // (넓은 쪽에서 좁은 쪽을 보면 그 틈으로 좁은 쪽 궁륭의 뒷면 = 빈 지붕 속이 보인다). face: 그 면을 보는 쪽의 z 방향.
      [[-6, -1], [-15, 1], [-25, -1]].forEach(function (q) {
        var zc = q[0], fA = pf(4.5, CROWN), fB = pf(4.05, CROWN), n = 18, k, z0 = [0, 0];
        for (k = 0; k < n; k++) {
          var ua = -4.5 + 9 * k / n, ub = -4.5 + 9 * (k + 1) / n;
          Q(mGrey, [ua, SPR + fB(ua) - 0.3, zc], [ub, SPR + fB(ub) - 0.3, zc], [ub, SPR + fA(ub) + 0.05, zc], [ua, SPR + fA(ua) + 0.05, zc], z0, z0, z0, z0, [0, SPR, zc + q[1] * 30]);
        }
      });

      // 후진 우산형 늑골 궁륭
      (function () {
        var Cc = APSE_C, V = APSE_V, i, a, b, res = 8, cTop = G.toColor(C.vault), cLow = cTop.clone().multiplyScalar(0.86);
        function ptAt(A, B, s01, t) { return [A[0] + (B[0] - A[0]) * s01, 0, A[1] + (B[1] - A[1]) * s01]; }
        for (i = 0; i < V.length; i++) {
          a = V[i]; b = V[(i + 1) % V.length];
          var L = sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])), fa = pf(L / 2, min(CROWN, 0.9 * L));
          function P(s01, t) { var x = a[0] + (b[0] - a[0]) * s01, z = a[1] + (b[1] - a[1]) * s01; return [x * (1 - t) + Cc[0] * t, SPR + fa(s01 * L - L / 2) * (1 - t) + CROWN * t, z * (1 - t) + Cc[1] * t]; }
          for (var s = 0; s < res; s++) for (var t = 0; t < 5; t++) {
            var s0 = s / res, s1 = (s + 1) / res, t0 = t / 5, t1 = (t + 1) / 5;
            var ck = cLow.clone().lerp(cTop, (t0 + 0.2));
            solid.addQuad(P(s0, t0), P(s1, t0), P(s1, t1), P(s0, t1), ck, [Cc[0], SPR - 1, Cc[1]]);
          }
          // 벽 늑골(창문 위 호) — 마지막 변(열린 쪽)은 성단 쪽 칸이 그린다
          if (i < V.length - 1) { var pts = []; for (var q = 0; q <= 10; q++) { var pp = P(q / 10, 0); pts.push([pp[0], pp[1] - 0.04, pp[2]]); } for (q = 0; q < 10; q++) solid.addBeam(pts[q], pts[q + 1], 0.3, 0.38, C.rib, { vary: 0.02 }); }
          // 정점으로 모이는 방사 늑골(각 꼭짓점)
          var rpts = []; for (var q2 = 0; q2 <= 8; q2++) { var pr = P(0, q2 / 8); rpts.push([pr[0], pr[1] - 0.04, pr[2]]); }
          for (q2 = 0; q2 < 8; q2++) solid.addBeam(rpts[q2], rpts[q2 + 1], 0.28, 0.36, C.rib, { vary: 0.02 });
        }
        ctx.cyl({ x: Cc[0], y: SPR + CROWN - 0.3, z: Cc[1], r: 0.42, rTop: 0.34, h: 0.18, seg: 12, color: C.boss });
        ctx.sphere({ x: Cc[0], y: SPR + CROWN - 0.34, z: Cc[1], r: 0.26, sy: 0.16, color: C.boss, w: 8, h: 4 });
      })();

      // ---------- 성소(제대부) ----------
      var PY = 0.6;
      ctx.boxAABB({ x0: -5.1, x1: 5.1, z0: -31.4, z1: -11, y0: 0, y1: PY - 0.01, color: 0xe5dccb });
      ctx.floor({ x0: -4.5, x1: 4.5, z0: -31.3, z1: -11, y: PY, tex: ctx.tex.pattern('diamond', { c1: 0xefe7d6, c2: 0xe1d4bb, c3: 0xc9b392 }), tile: 2.4 });
      ctx.boxAABB({ x0: -5.1, x1: -4.5, z0: -25, z1: -11, y0: 0, y1: PY, color: 0xd9cfbb }); ctx.boxAABB({ x0: 4.5, x1: 5.1, z0: -25, z1: -11, y0: 0, y1: PY, color: 0xd9cfbb });
      // 계단 3단 + 붉은 융단
      [[0.2, -9.8], [0.4, -10.2], [0.6, -10.6]].forEach(function (st, i) {
        ctx.boxAABB({ x0: -5.1, x1: 5.1, z0: -11, z1: st[1], y0: 0, y1: st[0], color: ctx.shade(0xe9e0cd, 1 - i * 0.02) });
        ctx.boxAABB({ x0: -1.7, x1: 1.7, z0: i === 2 ? -11 : st[1] - 0.4, z1: st[1], y0: st[0], y1: st[0] + 0.012, color: 0xa72b35, vary: 0 });
      });
      ctx.carpet({ x0: -1.7, x1: 1.7, z0: -29.2, z1: -11, y: PY, color: 0xa72b35, border: C.gold });
      ctx.carpet({ x0: -3.0, x1: 3.0, z0: -19.5, z1: -16.5, y: PY, color: 0xa72b35, border: C.gold });
      ctx.addCollider({ x0: -5.1, x1: 5.1, z0: -32, z1: -9.8 });
      // 제대 난간(옛 영성체 난간): 가운데 트임
      [[-4.4, -1.3], [1.3, 4.4]].forEach(function (r) {
        ctx.boxAABB({ mat: 'wood', x0: r[0], x1: r[1], y0: PY + 0.55, y1: PY + 0.66, z0: -11.6, z1: -11.35, color: C.woodMid });
        for (var bx = r[0] + 0.1; bx < r[1]; bx += 0.28) ctx.boxAABB({ mat: 'wood', x0: bx - 0.04, x1: bx + 0.04, y0: PY, y1: PY + 0.55, z0: -11.55, z1: -11.4, color: C.wood });
      });

      // 회중용 목조 제대 + 독서대 + 십자가
      ctx.altar({ x: 0, z: -14.2, y: PY, w: 2.4, d: 1.0, h: 1.0, style: 'block', color: 0x6a4a30, candles: 2, flowers: false });
      [-1, 1].forEach(function (s) { flowers(s * 2.0, -14.0, PY, 0.85); });
      ctx.pulpit({ x: 1.9, z: -12.2, y: PY, ry: 0, style: 'ambo', color: 0x6a4a30 });
      ctx.crucifix({ x: 3.5, y: PY + 0.55, z: -13.0, h: 4.4, ry: 0, glow: false, scan: true });   // 실물 스캔 십자고상(scan3d.js, 채색 목조 — 대용)
      ctx.box({ mat: 'wood', x: 3.5, y: PY, z: -13.0, w: 0.6, h: 0.55, d: 0.6, color: C.wood }); ctx.addCollider({ x: 3.5, z: -13.0, r: 0.5 });

      function flowers(x, z, y, sc) {
        ctx.cyl({ x: x, y: y, z: z, r: 0.2 * sc, rTop: 0.28 * sc, h: 0.5 * sc, seg: 8, color: 0xf3ebde });
        var r2 = G.rng((x * 31 + z * 17) | 0 || 5);
        for (var k = 0; k < 9; k++) ctx.ico({ x: x + (r2() - 0.5) * 0.5 * sc, y: y + (0.55 + r2() * 0.5) * sc, z: z + (r2() - 0.5) * 0.5 * sc, r: 0.15 * sc, color: [0xffffff, 0xfff4f4, 0xf4f1e6, 0xe8f0e0][k % 4], detail: 0 });
        for (k = 0; k < 3; k++) ctx.ico({ x: x + (r2() - 0.5) * 0.7 * sc, y: y + (0.5 + r2() * 0.3) * sc, z: z + (r2() - 0.5) * 0.7 * sc, r: 0.13 * sc, color: 0x7fae6a, detail: 0 });
      }
      // 흰 고딕 제대 양옆의 천사상 2(사진 대조 M11): 대리석 받침 위, 제대 쪽으로 조금 돌아선다
      [-1, 1].forEach(function (s) {
        ctx.cyl({ x: s * 3.35, y: PY, z: -28.2, r: 0.34, rTop: 0.28, h: 0.2, seg: 8, color: 0xe9e1d0 });
        ctx.cyl({ x: s * 3.35, y: PY + 0.2, z: -28.2, r: 0.24, h: 0.95, seg: 8, color: 0xf2ebdc });
        ctx.cyl({ x: s * 3.35, y: PY + 1.15, z: -28.2, r: 0.3, rTop: 0.34, h: 0.1, seg: 8, color: 0xe9e1d0 });
        // (T-80) 실물 스캔 천사(18세기 초 바로크 석상, noe-3d.at CC BY 4.0 — 대용, 흰 대리석 재질). 신자 쪽(+z)을 보며 제대 쪽으로 0.5 rad 돌아선다.
        // 오른쪽은 좌우를 뒤집어 짝을 맞춘다(둘 다 고개를 제대 쪽으로 든다). 스캔을 못 세우면 절차 생성 천사.
        ctx.scan({ key: 'angel', x: s * 3.35, y: PY + 1.25, z: -28.2, ry: -s * 0.5, h: 1.45, mirror: s > 0, name: 'myeongdong_angel' }, function () {
          ctx.statue({ x: s * 3.35, y: PY + 1.25, z: -28.2, ry: -s * 0.5, h: 1.45, kind: 'angel', robe: 0xf4f0e8, mantle: 0xe6dcc6, halo: false });
        });
      });

      // 설교대(왼쪽, 첨탑 닫집)
      (function () {
        var px = -3.55, pz = -12.9, y = PY, i;
        ctx.cyl({ mat: 'wood', x: px, y: y, z: pz, r: 0.62, rTop: 0.3, h: 0.42, seg: 8, color: C.woodMid });
        ctx.cyl({ mat: 'wood', x: px, y: y + 0.4, z: pz, r: 0.3, h: 1.2, seg: 8, color: C.wood });
        ctx.cyl({ mat: 'wood', x: px, y: y + 1.55, z: pz, r: 0.7, rTop: 0.86, h: 1.0, seg: 8, color: C.woodMid });
        ctx.cyl({ mat: 'wood', x: px, y: y + 2.5, z: pz, r: 0.92, h: 0.1, seg: 8, color: C.wood });
        for (i = 0; i < 8; i++) {
          var a = i * PI / 4 + PI / 8, bx = px + cos(a) * 0.84, bz = pz + sin(a) * 0.84;
          ctx.box({ mat: 'wood', x: bx, y: y + 1.7, z: bz, w: 0.46, h: 0.7, d: 0.06, ry: -a + PI / 2, color: i % 2 ? 0x8a5e3a : 0x9a6c43 });
          ctx.cone({ x: bx, y: y + 2.4, z: bz, r: 0.1, h: 0.2, seg: 4, color: C.gold });
        }
        // 뒤판 + 소리판 + 첨탑
        ctx.box({ mat: 'wood', x: px - 0.95, y: y + 2.55, z: pz, w: 0.14, h: 2.5, d: 1.1, color: C.wood });
        ctx.cyl({ mat: 'wood', x: px, y: y + 5.0, z: pz, r: 1.0, h: 0.32, seg: 8, color: C.wood });
        ctx.cyl({ x: px, y: y + 5.32, z: pz, r: 1.06, h: 0.1, seg: 8, color: C.gold });
        ctx.cone({ mat: 'wood', x: px, y: y + 5.4, z: pz, r: 1.0, h: 2.8, seg: 8, color: 0x6a4630 });
        for (i = 0; i < 8; i++) { var a2 = i * PI / 4, pxx = px + cos(a2) * 0.94, pzz = pz + sin(a2) * 0.94; ctx.cone({ mat: 'wood', x: pxx, y: y + 5.32, z: pzz, r: 0.09, h: 0.8, seg: 4, color: C.woodMid }); ctx.sphere({ x: pxx, y: y + 6.15, z: pzz, r: 0.06, color: C.gold, w: 5, h: 3 }); }
        ctx.cone({ x: px, y: y + 8.15, z: pz, r: 0.1, h: 0.55, seg: 4, color: C.gold });
        ctx.box({ x: px, y: y + 8.55, z: pz, w: 0.06, h: 0.4, d: 0.06, color: C.gold }); ctx.box({ x: px, y: y + 8.8, z: pz, w: 0.26, h: 0.06, d: 0.06, color: C.gold });
        // 계단 4칸(제대 쪽으로)
        for (i = 0; i < 4; i++) ctx.box({ mat: 'wood', x: px + 1.05 + i * 0.0, y: y + i * 0.5, z: pz + 0.8 + i * 0.5, w: 0.8, h: 0.5, d: 0.5, color: C.woodMid });
      })();

      // 성가대석 칸막이(왼쪽·오른쪽 기둥 선에 맞춤): 짙은 나무 + 첨두 장식
      [-1, 1].forEach(function (s) {
        var x = s * 3.8;
        ctx.boxAABB({ mat: 'wood', x0: x - 0.16, x1: x + 0.16, y0: PY, y1: PY + 2.0, z0: -24.5, z1: -16.4, color: C.wood });
        ctx.boxAABB({ mat: 'wood', x0: x - 0.2, x1: x + 0.2, y0: PY + 1.95, y1: PY + 2.1, z0: -24.5, z1: -16.4, color: C.woodMid });
        for (var zz = -24.2; zz < -16.4; zz += 0.7) {
          ctx.box({ mat: 'wood', x: x - s * 0.17, y: PY + 0.3, z: zz, w: 0.04, h: 1.6, d: 0.42, color: 0x6e4630 });
          ctx.cone({ mat: 'wood', x: x, y: PY + 2.1, z: zz, r: 0.12, h: 0.38, seg: 4, color: C.woodMid });
        }
        ctx.boxAABB({ mat: 'wood', x0: x - s * 0.9 - 0.3, x1: x - s * 0.9 + 0.3, y0: PY, y1: PY + 0.5, z0: -24.2, z1: s < 0 ? -19.3 : -16.7, color: C.woodMid });
      });

      // 주교좌(카테드라) — 주교좌성당의 핵심 가구. **자리는 추정**이다: 성단 안에 있다는 것만 확인했고 정확한 자리는 근거를 찾지 못했다
      // (STRUCTURE_AUDIT_OTHERS.md §2 M7). 복음 편(제대를 볼 때 왼쪽) 성가대 칸막이 앞에, 성단 가운데를 향해 놓는다.
      (function () {
        var cx = -2.72, cz = -17.9, y = PY, wood = 0x55331f, woodHi = 0x7a5232, red = 0x8f1f2a, gold = C.gold, i;
        // 2단 받침
        ctx.boxAABB({ mat: 'wood', x0: -3.62, x1: -1.75, y0: y, y1: y + 0.13, z0: cz - 0.95, z1: cz + 0.95, color: woodHi });
        ctx.boxAABB({ mat: 'wood', x0: -3.62, x1: -2.02, y0: y + 0.13, y1: y + 0.26, z0: cz - 0.72, z1: cz + 0.72, color: 0x6a4630 });
        ctx.boxAABB({ x0: -3.2, x1: -1.79, y0: y + 0.13, y1: y + 0.14, z0: cz - 0.42, z1: cz + 0.42, color: red, vary: 0 });     // 받침 위 붉은 깔개
        var by = y + 0.26;
        // 좌석 상자 + 방석
        ctx.boxAABB({ mat: 'wood', x0: cx - 0.5, x1: cx + 0.26, y0: by, y1: by + 0.46, z0: cz - 0.42, z1: cz + 0.42, color: wood });
        ctx.boxAABB({ mat: 'wood', x0: cx + 0.26, x1: cx + 0.3, y0: by + 0.06, y1: by + 0.4, z0: cz - 0.34, z1: cz + 0.34, color: woodHi });   // 앞판 새김
        ctx.boxAABB({ x0: cx - 0.42, x1: cx + 0.28, y0: by + 0.46, y1: by + 0.56, z0: cz - 0.36, z1: cz + 0.36, color: red, vary: 0.02 });
        // 팔걸이(기둥 + 가로대 + 둥근 머리)
        [-1, 1].forEach(function (k) {
          var az = cz + k * 0.46;
          ctx.boxAABB({ mat: 'wood', x0: cx - 0.5, x1: cx + 0.3, y0: by, y1: by + 0.8, z0: az - 0.06, z1: az + 0.06, color: wood });
          ctx.boxAABB({ mat: 'wood', x0: cx - 0.5, x1: cx + 0.36, y0: by + 0.8, y1: by + 0.88, z0: az - 0.09, z1: az + 0.09, color: woodHi });
          ctx.sphere({ mat: 'wood', x: cx + 0.34, y: by + 0.88, z: az, r: 0.085, color: woodHi, w: 8, h: 6 });
          ctx.boxAABB({ mat: 'wood', x0: cx - 0.46, x1: cx + 0.22, y0: by + 0.14, y1: by + 0.66, z0: az + k * 0.06, z1: az + k * 0.075, color: woodHi });   // 옆판 새김
        });
        // 높은 등받이: 나무 틀 + 붉은 천 + 금 십자, 위는 박공 + 작은 첨탑 둘
        var bx0 = cx - 0.62, bx1 = cx - 0.5, bt = by + 2.25;
        ctx.boxAABB({ mat: 'wood', x0: bx0, x1: bx1, y0: by, y1: bt, z0: cz - 0.52, z1: cz + 0.52, color: wood });
        ctx.boxAABB({ x0: bx1, x1: bx1 + 0.02, y0: by + 0.6, y1: bt - 0.2, z0: cz - 0.36, z1: cz + 0.36, color: red, vary: 0.02 });
        ctx.boxAABB({ x0: bx1 + 0.02, x1: bx1 + 0.035, y0: by + 1.25, y1: by + 1.85, z0: cz - 0.035, z1: cz + 0.035, color: gold, vary: 0 });
        ctx.boxAABB({ x0: bx1 + 0.02, x1: bx1 + 0.035, y0: by + 1.6, y1: by + 1.67, z0: cz - 0.2, z1: cz + 0.2, color: gold, vary: 0 });
        (function () {   // 박공(삼각 머리)
          var z0 = cz - 0.56, z1 = cz + 0.56, yt = bt + 0.62, col = G.toColor(wood), hi = [bx1 + 9, bt, cz], lo2 = [bx0 - 9, bt, cz];
          ctx.woodB.addTris([bx1, bt, z0, bx1, bt, z1, bx1, yt, cz], col, hi, { vary: 0.02 });
          ctx.woodB.addTris([bx0, bt, z0, bx0, bt, z1, bx0, yt, cz], col, lo2, { vary: 0.02 });
          ctx.woodB.addQuad([bx0, bt, z0], [bx1, bt, z0], [bx1, yt, cz], [bx0, yt, cz], col, [cx, bt + 3, cz - 9], { vary: 0.02 });
          ctx.woodB.addQuad([bx0, bt, z1], [bx1, bt, z1], [bx1, yt, cz], [bx0, yt, cz], col, [cx, bt + 3, cz + 9], { vary: 0.02 });
        })();
        ctx.boxAABB({ x0: bx1, x1: bx1 + 0.015, y0: bt + 0.12, y1: bt + 0.3, z0: cz - 0.1, z1: cz + 0.1, color: gold, vary: 0 });   // 박공의 금 문장 판
        ctx.box({ x: cx - 0.56, y: bt + 0.62, z: cz, w: 0.05, h: 0.3, d: 0.05, color: gold }); ctx.box({ x: cx - 0.56, y: bt + 0.78, z: cz, w: 0.05, h: 0.05, d: 0.2, color: gold });
        [-1, 1].forEach(function (k) {
          ctx.boxAABB({ mat: 'wood', x0: bx0 - 0.02, x1: bx1 + 0.02, y0: by, y1: bt + 0.12, z0: cz + k * 0.56 - 0.07, z1: cz + k * 0.56 + 0.07, color: woodHi });
          ctx.cone({ mat: 'wood', x: cx - 0.56, y: bt + 0.12, z: cz + k * 0.56, r: 0.1, h: 0.46, seg: 4, color: woodHi, ry: PI / 4 });
          ctx.sphere({ x: cx - 0.56, y: bt + 0.6, z: cz + k * 0.56, r: 0.045, color: gold, w: 6, h: 4 });
        });
        // 닫집(칸막이에서 내민 지붕) + 술 장식
        var cy = by + 3.25;
        ctx.boxAABB({ mat: 'wood', x0: -3.64, x1: cx + 0.42, y0: cy, y1: cy + 0.14, z0: cz - 0.68, z1: cz + 0.68, color: wood });
        ctx.boxAABB({ x0: -3.64, x1: cx + 0.44, y0: cy - 0.2, y1: cy, z0: cz - 0.7, z1: cz - 0.67, color: red, vary: 0.02 });
        ctx.boxAABB({ x0: -3.64, x1: cx + 0.44, y0: cy - 0.2, y1: cy, z0: cz + 0.67, z1: cz + 0.7, color: red, vary: 0.02 });
        ctx.boxAABB({ x0: cx + 0.42, x1: cx + 0.45, y0: cy - 0.2, y1: cy, z0: cz - 0.7, z1: cz + 0.7, color: red, vary: 0.02 });
        ctx.boxAABB({ x0: cx + 0.45, x1: cx + 0.46, y0: cy - 0.22, y1: cy - 0.18, z0: cz - 0.7, z1: cz + 0.7, color: gold, vary: 0 });
        for (i = -2; i <= 2; i++) ctx.cone({ mat: 'wood', x: cx + 0.34, y: cy + 0.14, z: cz + i * 0.3, r: 0.07, h: i === 0 ? 0.5 : 0.32, seg: 4, color: woodHi, ry: PI / 4 });
        ctx.boxAABB({ x0: -3.63, x1: -3.6, y0: by + 2.3, y1: cy - 0.2, z0: cz - 0.6, z1: cz + 0.6, color: 0x7d1b25, vary: 0.02 });       // 닫집 아래 뒷천
        [-1, 1].forEach(function (k) { ctx.boxAABB({ mat: 'wood', x0: -3.64, x1: -3.56, y0: PY + 2.1, y1: cy, z0: cz + k * 0.64 - 0.04, z1: cz + k * 0.64 + 0.04, color: wood }); });   // 닫집 받침대
      })();

      // 주제대 뒤 제단 벽(백색·금색 고딕 첨탑 + 성모상)
      (function () {
        var zb = -30.0, y = PY, cream = 0xf2ebdc, gold = C.gold;
        function spire(x, y0, r, h, color) { ctx.cyl({ x: x, y: y0, z: zb, r: r * 0.65, rTop: r * 0.5, h: 0.2, seg: 4, color: cream, ry: PI / 4 }); ctx.cone({ x: x, y: y0 + 0.2, z: zb, r: r, h: h, seg: 4, color: color || cream, ry: PI / 4 }); ctx.sphere({ x: x, y: y0 + 0.2 + h, z: zb, r: 0.07, color: gold, w: 5, h: 3 }); ctx.box({ x: x, y: y0 + 0.2 + h, z: zb, w: 0.04, h: 0.28, d: 0.04, color: gold }); for (var q = 1; q < 5; q++) { var ff = q / 5; ctx.sphere({ x: x + r * (1 - ff) * 0.72, y: y0 + 0.2 + h * ff * 0.92, z: zb, r: 0.045, color: gold, w: 4, h: 3 }); ctx.sphere({ x: x - r * (1 - ff) * 0.72, y: y0 + 0.2 + h * ff * 0.92, z: zb, r: 0.045, color: gold, w: 4, h: 3 }); } }
        function gablet(x, y0, w, h, d) { var hw = w / 2, z0 = zb - d / 2, z1 = zb + d / 2; solid.addTris([x - hw, y0, z1, x + hw, y0, z1, x, y0 + h, z1], cream, [x, y0, z1 + 5]); solid.addTris([x - hw, y0, z0, x + hw, y0, z0, x, y0 + h, z0], cream, [x, y0, z0 - 5]); solid.addQuad([x - hw, y0, z0], [x - hw, y0, z1], [x, y0 + h, z1], [x, y0 + h, z0], ctx.shade(cream, 0.94), [x - 5, y0 + h, zb]); solid.addQuad([x + hw, y0, z1], [x + hw, y0, z0], [x, y0 + h, z0], [x, y0 + h, z1], ctx.shade(cream, 0.9), [x + 5, y0 + h, zb]); ctx.box({ x: x - hw * 0.5, y: y0 + h * 0.5 - 0.0, z: zb + d / 2 + 0.01, w: 0.04, h: 0.04, d: 0.04, color: gold }); }
        // 제대(대리석) + 감실
        ctx.altar({ x: 0, z: -28.4, y: y, w: 3.0, d: 1.2, h: 1.1, style: 'block', color: 0xf5efe4, candles: 2, flowers: false });
        // 레타블 기단 + 금띠
        ctx.boxAABB({ x0: -2.9, x1: 2.9, z0: zb - 0.42, z1: zb + 0.42, y0: y, y1: y + 1.55, color: cream });
        ctx.boxAABB({ x0: -2.9, x1: 2.9, z0: zb + 0.4, z1: zb + 0.46, y0: y + 1.5, y1: y + 1.62, color: gold });
        for (var gi = -2; gi <= 2; gi++) ctx.boxAABB({ x0: gi * 1.1 - 0.35, x1: gi * 1.1 + 0.35, z0: zb + 0.4, z1: zb + 0.44, y0: y + 0.25, y1: y + 1.25, color: ctx.shade(cream, 0.93) });
        ctx.box({ x: 0, y: y + 1.62, z: zb + 0.1, w: 0.82, h: 0.8, d: 0.6, color: 0xe2c25d });
        ctx.cone({ x: 0, y: y + 2.42, z: zb + 0.1, r: 0.55, h: 0.35, seg: 4, color: 0xe6c260, ry: PI / 4 });
        ctx.box({ x: 0, y: y + 2.76, z: zb + 0.1, w: 0.06, h: 0.3, d: 0.06, color: gold }); ctx.box({ x: 0, y: y + 2.95, z: zb + 0.1, w: 0.2, h: 0.05, d: 0.05, color: gold });
        ctx.box({ x: 0.9, y: y + 1.62, z: zb + 0.35, w: 0.04, h: 0.04, d: 0.04, color: gold });
        // 중앙 감실(성모상) 탑
        var ty = y + 2.8;
        ctx.boxAABB({ x0: -1.0, x1: 1.0, z0: zb - 0.4, z1: zb + 0.34, y0: ty, y1: ty + 2.7, color: cream });
        ctx.boxAABB({ x0: -0.72, x1: 0.72, z0: zb + 0.33, z1: zb + 0.36, y0: ty + 0.25, y1: ty + 2.35, color: 0x3d5088 });
        for (var sk = 0; sk < 8; sk++) ctx.sphere({ x: -0.5 + (sk % 4) * 0.33, y: ty + 0.5 + Math.floor(sk / 4) * 1.6, z: zb + 0.37, r: 0.035, color: gold, w: 4, h: 3 });
        ctx.statue({ x: 0, y: ty + 0.38, z: zb + 0.62, ry: 0, h: 1.75, kind: 'mary', halo: true });
        ctx.cyl({ x: -1.03, y: ty, z: zb + 0.36, r: 0.07, h: 2.7, seg: 6, color: gold }); ctx.cyl({ x: 1.03, y: ty, z: zb + 0.36, r: 0.07, h: 2.7, seg: 6, color: gold });
        gablet(0, ty + 2.7, 2.3, 1.7, 0.78);
        spire(0, ty + 4.3, 0.6, 2.7, cream);
        // 좌우 탑(성인 감실) + 첨탑
        [-1, 1].forEach(function (s) {
          var tx = s * 1.8;
          ctx.boxAABB({ x0: tx - 0.4, x1: tx + 0.4, z0: zb - 0.36, z1: zb + 0.3, y0: y + 1.55, y1: y + 3.7, color: cream });
          ctx.boxAABB({ x0: tx - 0.28, x1: tx + 0.28, z0: zb + 0.29, z1: zb + 0.32, y0: y + 1.9, y1: y + 3.4, color: 0x5a4a6a });
          ctx.statue({ x: tx, y: y + 1.95, z: zb + 0.5, ry: 0, h: 1.2, kind: 'saint', robe: s > 0 ? 0xe9dfca : 0xd8d0e6, mantle: s > 0 ? 0x9a6a4a : 0x6a7aa8, halo: true });
          gablet(tx, y + 3.7, 0.95, 0.9, 0.7);
          spire(tx, y + 4.55, 0.38, 1.9, cream);
          // 바깥쪽 낮은 탑
          var ox = s * 2.65;
          ctx.boxAABB({ x0: ox - 0.28, x1: ox + 0.28, z0: zb - 0.3, z1: zb + 0.24, y0: y + 1.55, y1: y + 2.8, color: cream });
          spire(ox, y + 2.8, 0.3, 1.45, cream);
          ctx.box({ x: tx + s * 0.4 + s * 0.1, y: y + 1.62, z: zb + 0.2, w: 0.02, h: 0.02, d: 0.02, color: gold });
        });
        // 촛대 4개 + 불꽃
        [-2.3, -1.2, 1.2, 2.3].forEach(function (cx) {
          ctx.cyl({ x: cx, y: y + 1.62, z: zb + 0.15, r: 0.1, rTop: 0.05, h: 0.8, seg: 6, color: gold });
          ctx.cyl({ x: cx, y: y + 2.42, z: zb + 0.15, r: 0.05, h: 0.35, seg: 6, color: 0xfff6e0 });
          ctx.addFlame({ x: cx, y: y + 2.95, z: zb + 0.15, scale: 1.1 });
        });
        ctx.addCollider({ x0: -3, x1: 3, z0: -31, z1: -29.4 });
        // 성체등: 감실 곁의 붉은 등(늘 켜져 있다) — 가는 놋쇠 대 위의 붉은 유리 잔
        var lx = 2.25, lz = -28.9;
        ctx.cyl({ x: lx, y: y, z: lz, r: 0.16, rTop: 0.05, h: 0.12, seg: 8, color: gold, mat: 'metal' });
        ctx.cyl({ x: lx, y: y + 0.12, z: lz, r: 0.022, h: 1.25, seg: 6, color: gold, mat: 'metal' });
        ctx.cyl({ x: lx, y: y + 1.37, z: lz, r: 0.05, rTop: 0.085, h: 0.06, seg: 8, color: gold, mat: 'metal' });
        glow.add(G.Geo.cyl(8, 1.25), new T.Color(0xe02818).multiplyScalar(1.6), { x: lx, y: y + 1.43, z: lz, sx: 0.06, sy: 0.14, sz: 0.06, flat: true, vary: 0 });
        ctx.addGlow({ x: lx, y: y + 1.52, z: lz, size: 0.7, color: 0xff3020, kind: 'always', pulse: 0.12 });
      })();

      // ---------- 측면 제대, 성상, 세례대 ----------
      (function () {
        // 왼쪽: 79위 복자 성화 + 제대 / 김대건 성상
        ctx.boxAABB({ x0: -8.2, x1: -5.3, z0: -25.0, z1: -24.8, y0: 1.7, y1: 5.6, color: C.gold });
        ctx.boxAABB({ x0: -8.05, x1: -5.45, z0: -24.8, z1: -24.76, y0: 1.85, y1: 5.45, color: 0xe9ddc2 });
        var pr = G.rng(41), pi, pj;
        for (pj = 0; pj < 4; pj++) for (pi = 0; pi < 6; pi++) ctx.boxAABB({ x0: -7.9 + pi * 0.4, x1: -7.6 + pi * 0.4, z0: -24.77, z1: -24.74, y0: 1.95 + pj * 0.5, y1: 2.35 + pj * 0.5, color: [0x8a2f2f, 0x2f4a80, 0x6a4a2a, 0x3a5a3a, 0xc9a95a][Math.floor(pr() * 5)] });
        ctx.boxAABB({ x0: -7.65, x1: -5.85, z0: -24.6, z1: -23.8, y0: 0, y1: 1.0, color: 0xf2ece0 }); ctx.boxAABB({ x0: -7.75, x1: -5.75, z0: -24.65, z1: -23.75, y0: 1.0, y1: 1.1, color: 0xfaf6ee });
        ctx.addCollider({ x0: -7.8, x1: -5.6, z0: -25.5, z1: -23.5 });
        ctx.box({ x: -8.2, y: 0, z: -22.3, w: 0.9, h: 0.9, d: 0.9, color: 0xe8e0d0 }); ctx.statue({ x: -8.2, y: 0.9, z: -22.3, ry: 0.3, h: 1.8, kind: 'saint', robe: 0x2a2a30, mantle: 0x2a2a30, halo: false }); ctx.addCollider({ x: -8.2, z: -22.3, r: 0.6 });
        // 오른쪽: 성 베네딕토 성상 + 제대 + 세례대
        ctx.boxAABB({ x0: 5.3, x1: 8.2, z0: -25.0, z1: -24.8, y0: 1.7, y1: 5.6, color: 0xf2e9d4 });
        ctx.boxAABB({ x0: 6.15, x1: 7.35, z0: -24.8, z1: -24.76, y0: 2.0, y1: 5.25, color: 0x3e4f86 });
        // 성상은 닫집 달린 받침(까치발) 위에 선다 — 그 아래가 측면 제대(사진 'Western Aisle …')
        ctx.cyl({ x: 6.75, y: 2.05, z: -24.52, r: 0.1, rTop: 0.34, h: 0.34, seg: 8, color: 0xe9e1d0 });
        ctx.cyl({ x: 6.75, y: 2.39, z: -24.52, r: 0.38, h: 0.07, seg: 8, color: 0xf4eee2 });
        ctx.statue({ x: 6.75, y: 2.46, z: -24.5, ry: 0, h: 1.75, kind: 'saint', robe: 0x2f2a28, mantle: 0x2f2a28, halo: true });
        ctx.cyl({ x: 6.75, y: 4.42, z: -24.52, r: 0.42, rTop: 0.46, h: 0.12, seg: 8, color: 0xf4eee2 });
        ctx.cone({ x: 6.75, y: 4.54, z: -24.52, r: 0.44, h: 0.62, seg: 8, color: 0xe9e1d0 });
        ctx.sphere({ x: 6.75, y: 5.18, z: -24.52, r: 0.05, color: C.gold, w: 6, h: 4 });
        for (var ck = 0; ck < 8; ck++) ctx.cone({ x: 6.75 + cos(ck * PI / 4 + PI / 8) * 0.42, y: 4.54, z: -24.52 + sin(ck * PI / 4 + PI / 8) * 0.42, r: 0.045, h: 0.24, seg: 4, color: 0xf4eee2 });
        ctx.boxAABB({ x0: 5.85, x1: 7.65, z0: -24.6, z1: -23.8, y0: 0, y1: 1.0, color: 0xf2ece0 }); ctx.boxAABB({ x0: 5.75, x1: 7.75, z0: -24.65, z1: -23.75, y0: 1.0, y1: 1.1, color: 0xfaf6ee });
        ctx.addCollider({ x0: 5.5, x1: 7.9, z0: -25.5, z1: -23.5 });
        // 세례대
        var fx = 8.1, fz = -21.6;
        ctx.cyl({ x: fx, y: 0, z: fz, r: 0.34, rTop: 0.22, h: 0.7, seg: 8, color: 0xdcd3c0 });
        ctx.cyl({ x: fx, y: 0.7, z: fz, r: 0.46, rTop: 0.5, h: 0.3, seg: 8, color: 0xe8e0d0 });
        ctx.cone({ mat: 'wood', x: fx, y: 1.0, z: fz, r: 0.5, h: 0.7, seg: 8, color: 0x7a5232 });
        ctx.sphere({ x: fx, y: 1.74, z: fz, r: 0.07, color: C.gold, w: 5, h: 3 });
        ctx.addCollider({ x: fx, z: fz, r: 0.55 });
      })();
      ctx.candleStand(0, { wood: 0x5a3a24 });
      ctx.candleStand(1, { wood: 0x5a3a24 });

      // ---------- 2층 성가대석 + 파이프 오르간 ----------
      (function () {
        var gy = 6.5;
        ctx.boxAABB({ mat: 'wood', x0: -4.05, x1: 4.05, y0: gy - 0.28, y1: gy, z0: 24.0, z1: 31.5, color: 0x6f4b31 });
        ctx.boxAABB({ x0: -4.05, x1: 4.05, y0: gy - 0.34, y1: gy - 0.28, z0: 24.0, z1: 31.5, color: 0xe6dcc6 });
        [25.6, 27.7, 29.8].forEach(function (zz) { ctx.boxAABB({ mat: 'wood', x0: -4.05, x1: 4.05, y0: gy - 0.62, y1: gy - 0.34, z0: zz - 0.18, z1: zz + 0.18, color: C.wood }); });
        // 아래 천장(현관부) 비교적 낮은 평 천장
        // 난간(나무 패널 + 첨두 장식)
        ctx.boxAABB({ mat: 'wood', x0: -4.05, x1: 4.05, y0: gy, y1: gy + 0.12, z0: 24.0, z1: 24.34, color: C.woodMid });
        ctx.boxAABB({ mat: 'wood', x0: -4.05, x1: 4.05, y0: gy + 1.0, y1: gy + 1.12, z0: 23.98, z1: 24.36, color: C.wood });
        for (var px = -3.8; px <= 3.81; px += 0.8) {
          ctx.box({ mat: 'wood', x: px, y: gy + 0.12, z: 24.17, w: 0.62, h: 0.88, d: 0.1, color: 0x7a5232 });
          ctx.box({ mat: 'wood', x: px, y: gy + 0.3, z: 24.1, w: 0.42, h: 0.52, d: 0.05, color: 0x5a3822 });
          ctx.cone({ mat: 'wood', x: px - 0.4, y: gy + 1.12, z: 24.17, r: 0.07, h: 0.3, seg: 4, color: C.woodMid });
        }
        // 받침 기둥 2개(회색 벽돌) — 충돌체
        [-1, 1].forEach(function (s) {
          uvCyl(mGrey, s * 2.9, 24.5, 0, gy - 0.34, 0.32, 0.3, 8, false, PI / 8);
          uvCyl(mGrey, s * 2.9, 24.5, gy - 0.7, gy - 0.34, 0.36, 0.42, 8, true, PI / 8);
          ctx.addCollider({ x: s * 2.9, z: 24.5, r: 0.45 });
        });
        // 오르간(은회색 파이프 + 짙은 나무 케이스)
        var oz = 30.75;
        ctx.boxAABB({ mat: 'wood', x0: -3.6, x1: 3.6, y0: gy, y1: gy + 1.5, z0: oz - 0.45, z1: oz + 0.7, color: 0x4a2f1e });
        function pipeTower(cx, w, hTop, n, base) {
          for (var k = 0; k < n; k++) {
            var px2 = cx - w / 2 + w * (k + 0.5) / n, ph = hTop - Math.abs(k - (n - 1) / 2) * 0.28;
            ctx.cyl({ x: px2, y: base, z: oz - 0.2, r: 0.1, rTop: 0.075, h: ph, seg: 8, color: 0xc9cdd2 });
            ctx.cyl({ x: px2, y: base + ph, z: oz - 0.2, r: 0.075, rTop: 0.02, h: 0.12, seg: 8, color: 0xd9dce0 });
          }
          ctx.boxAABB({ mat: 'wood', x0: cx - w / 2 - 0.1, x1: cx + w / 2 + 0.1, y0: base - 0.02, y1: base + 0.1, z0: oz - 0.4, z1: oz + 0.05, color: 0x5c3a24 });
        }
        pipeTower(0, 1.9, 4.6, 7, gy + 1.5); pipeTower(-1.75, 1.3, 3.5, 5, gy + 1.5); pipeTower(1.75, 1.3, 3.5, 5, gy + 1.5);
        pipeTower(-2.95, 1.0, 2.6, 4, gy + 1.5); pipeTower(2.95, 1.0, 2.6, 4, gy + 1.5);
        [-1, 1].forEach(function (s) { ctx.cone({ mat: 'wood', x: s * 0.95, y: gy + 6.2, z: oz - 0.2, r: 0.22, h: 0.7, seg: 4, color: C.woodMid }); });
        ctx.cone({ mat: 'wood', x: 0, y: gy + 6.2, z: oz - 0.2, r: 0.3, h: 1.0, seg: 4, color: C.woodMid });
      })();

      // 십자가의 길 14처: 빌더가 따로 걸던 청동 판은 없앴다 — SPEC §30 의 판(way_cross.js)이 같은 측랑 벽에 걸리므로 14처가 두 벌이 되고 서로 겹쳤다.
      // 판 자리는 위 layout.crossWay 가 정한다(칸마다 창 아래 가운데).

      // ---------- 신자석 장식: 끝판(첨두 + 새김 무늬) ----------
      ctx.renderSeats(layout, 'bench', {});
      // ---------- 기둥의 까치발 촛대등 + 현관 성수대 ----------
      // 실제 조명은 신랑 한가운데 매달린 큰 샹들리에가 아니라, 기둥마다 주두 높이에서 까치발로 내민 촛대형(크리스털) 샹들리에다(사진 대조 M8).
      function bracketLamp(s, z) {
        var k, n = 6, r = 0.36, M = ctx.metalB, brass = 0xb9903c, xw = s * 3.7, x = s * 3.08, ya = 5.02, y = 4.42;
        var flameCol = new T.Color(0xffd78a).multiplyScalar(2.4), crystal = new T.Color(0xe6eef6).multiplyScalar(1.15);
        M.addBeam([xw, ya, z], [x - s * 0.06, ya, z], 0.045, 0.045, brass, { vary: 0 });                                   // 가로 팔
        M.addBeam([xw, ya - 0.5, z], [x + s * 0.12, ya - 0.03, z], 0.035, 0.035, brass, { vary: 0 });                      // 받침 사선
        M.addBeam([xw, ya - 0.56, z], [xw, ya + 0.1, z], 0.05, 0.09, brass, { vary: 0 });                                  // 기둥에 붙는 판
        M.add(G.Geo.sph(6, 4), brass, { x: x - s * 0.06, y: ya, z: z, s: 0.045, flat: true, vary: 0 });
        M.add(G.Geo.cyl(6, 1), brass, { x: x, y: y + 0.12, z: z, sx: 0.014, sy: ya - y - 0.12, sz: 0.014, flat: true, vary: 0 });   // 매다는 대
        M.add(G.Geo.cyl(8, 0.55), brass, { x: x, y: y - 0.1, z: z, sx: 0.085, sy: 0.24, sz: 0.085, flat: true, vary: 0 });        // 가운데 몸통
        M.add(G.Geo.sph(6, 4), brass, { x: x, y: y - 0.14, z: z, s: 0.06, flat: true, vary: 0 });
        for (k = 0; k < n; k++) {
          var a0 = k / n * PI * 2 + PI / 6, px = x + cos(a0) * r, pz = z + sin(a0) * r;
          M.addBeam([x, y - 0.02, z], [px, y + 0.03, pz], 0.022, 0.022, brass, { vary: 0 });                                 // 촛대 팔
          M.add(G.Geo.cyl(6, 1.5), brass, { x: px, y: y + 0.03, z: pz, sx: 0.035, sy: 0.035, sz: 0.035, flat: true, vary: 0 });   // 받침 접시
          ctx.cyl({ x: px, y: y + 0.065, z: pz, r: 0.022, h: 0.17, seg: 5, color: 0xf3ead0, mat: 'solid' });               // 양초
          glow.add(G.Geo.ico(0), flameCol, { x: px, y: y + 0.285, z: pz, sx: 0.032, sy: 0.055, sz: 0.032, flat: true, vary: 0 });    // 불꽃
          if (k % 2 === 0) glow.add(G.Geo.ico(0), crystal, { x: x + cos(a0) * r * 0.62, y: y - 0.1, z: z + sin(a0) * r * 0.62, sx: 0.022, sy: 0.05, sz: 0.022, flat: true, vary: 0 });   // 크리스털 방울
        }
        glow.add(G.Geo.ico(0), crystal, { x: x, y: y - 0.26, z: z, sx: 0.035, sy: 0.07, sz: 0.035, flat: true, vary: 0 });
        ctx.addGlow({ x: x, y: y + 0.2, z: z, size: 1.25, color: 0xffc977, kind: 'lamp', pulse: 0.04 });
      }
      [24, 19, 14, 9, 4, -1].forEach(function (z) { [-1, 1].forEach(function (s) { bracketLamp(s, z); }); });
      [-2.6, 2.6].forEach(function (x) { ctx.holyFont({ x: x, z: 30.7 }); });

      // ---------- 지붕(안에서는 보이지 않음; 햇빛 차단용 닫힌 껍질) ----------
      (function () {
        var rc = C.slate, up = function (x, z) { return [x, 60, z]; };
        function sl(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3) { solid.addQuad([x0, y0, z0], [x1, y1, z1], [x2, y2, z2], [x3, y3, z3], rc, [(x0 + x2) / 2, 60, (z0 + z2) / 2]); }
        // 신랑 + 성단 + 후진 방향 맞배지붕 (z -27 .. 32.4)
        sl(-5.8, 16, -27, -5.8, 16, 32.4, 0, 23.4, 32.4, 0, 23.4, -27);
        sl(5.8, 16, 32.4, 5.8, 16, -27, 0, 23.4, -27, 0, 23.4, 32.4);
        solid.addTris([-5.8, 16, 32.4, 5.8, 16, 32.4, 0, 23.4, 32.4], 0xb9ac96, [0, 20, 60]);
        // 익랑 맞배지붕 (x -14.4 .. 14.4, 중심 z -10.5)
        sl(-14.4, 16, -4.9, 14.4, 16, -4.9, 14.4, 23.4 - 0.4, -10.5, -14.4, 23.4 - 0.4, -10.5);
        sl(14.4, 16, -16.1, -14.4, 16, -16.1, -14.4, 23.0, -10.5, 14.4, 23.0, -10.5);
        solid.addTris([14.4, 16, -4.9, 14.4, 16, -16.1, 14.4, 23.0, -10.5], 0xb9ac96, [60, 18, -10.5]); solid.addTris([-14.4, 16, -16.1, -14.4, 16, -4.9, -14.4, 23.0, -10.5], 0xb9ac96, [-60, 18, -10.5]);
        // 측랑 외기 지붕(한쪽 경사)
        [-1, 1].forEach(function (s) {
          sl(s * 4.95, 11.7, -25.9, s * 4.95, 11.7, 32.4, s * 10.3, 9.6, 32.4, s * 10.3, 9.6, -25.9);
        });
        // 후진 원뿔 지붕
        var V = APSE_V, q;
        for (q = 0; q < V.length - 1; q++) { var a = V[q], b = V[q + 1]; solid.addTris([a[0] * 1.25, 15.6, -27 + (a[1] + 27) * 1.25, b[0] * 1.25, 15.6, -27 + (b[1] + 27) * 1.25, 0, 22, -27], rc, [0, 60, -27]); }
        // 바닥 아래 지반(밖으로 새는 빛 방지용 어두운 바닥)
        ctx.boxAABB({ x0: -16, x1: 16, y0: -0.4, y1: -0.05, z0: -34, z1: 34, color: 0x6b6459 });
      })();

      // ---------- 조명/충돌/카메라 ----------
      ctx.addLight({ x: 0, y: 8.5, z: -17, color: 0xffd9a0, intensity: 0.7, distance: 24, kind: 'lamp' });
      ctx.setSky({ outside: false });
      ctx.setCameraBounds({ x0: -8.85, x1: 8.85, z0: -24.5, z1: 31.3, yMax: 13 });
      ctx.addCollider({ x0: -14, x1: 14, z0: 31.5, z1: 33 });

    }
  };
})();
