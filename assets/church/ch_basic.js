/* ch_basic.js — 우리 본당(basic): SPEC 1~7절 성당. 빌더 API 의 기준 구현. */
(function () {
  'use strict';
  var layout = ChurchLayouts.basic;

  ChurchBuilders['basic'] = {
    layout: layout,
    thumb: { x: 0, z: 13, yaw: 0, pitch: 16, zoom: 0.9, hour: 15.5 },
    build: function (ctx) {
      var T = ctx.THREE, PI = Math.PI;
      var CREAM = 0xf6ead6, WOOD_D = 0x7a5236, GOLD = 0xd9b45a, WAINS = 0xd7b392;
      var W = 12, Z0 = -20, ZF = 19.5, WH = 6.5, RISE = 3.6;

      // ----- 바닥 -----
      ctx.floor({ x0: -W, x1: W, z0: Z0, z1: 20.1, y: 0, tex: ctx.tex.checker({ c1: 0xf5ead8, c2: 0xe6d5bb }), tile: 4 });
      // 신자석 마루(정점색 상자) + 성소 단
      [-1, 1].forEach(function (s) {
        ctx.boxAABB({ x0: s < 0 ? -9.2 : 2.4, x1: s < 0 ? -2.4 : 9.2, z0: -10.9, z1: 12.1, y0: 0, y1: 0.02, color: 0xc89f72, vary: 0.03 });
      });
      ctx.boxAABB({ x0: -W, x1: W, z0: Z0, z1: -14, y0: 0, y1: 0.49, color: 0xefe3cf });
      ctx.floor({ x0: -W, x1: W, z0: Z0, z1: -14, y: 0.5, tex: ctx.tex.pattern('diamond', { c1: 0xf7eee0, c2: 0xe9d3bf, c3: 0xd9b8a0 }), tile: 3, zone: true });
      ctx.steps({ x0: -9, x1: 9, z0: -14, z1: -13.2, y0: 0, y1: 0.5, n: 2, dir: [0, -1], color: 0xefe3cf });
      ctx.carpet({ x0: -1.1, x1: 1.1, z0: -13.2, z1: 19.2, y: 0, color: 0xc4505a, border: GOLD });
      ctx.carpet({ x0: -1.7, x1: 1.7, z0: -18.2, z1: -14, y: 0.5, color: 0xc4505a, border: GOLD });

      // ----- 벽 -----
      ctx.wall({ x0: -W - 0.3, z0: Z0 - 0.3, x1: -W - 0.3, z1: 20.4, h: WH, t: 0.6, color: CREAM, collide: false });
      ctx.wall({ x0: W + 0.3, z0: Z0 - 0.3, x1: W + 0.3, z1: 20.4, h: WH, t: 0.6, color: CREAM, collide: false });
      ctx.wall({ x0: -W, z0: Z0 - 0.3, x1: W, z1: Z0 - 0.3, h: WH, t: 0.6, color: CREAM, collide: false });
      // 입구 벽(문 개구부 4.4 x 4.6)
      ctx.wall({ x0: -W, z0: ZF + 0.3, x1: -2.2, z1: ZF + 0.3, h: WH, t: 0.6, color: CREAM, collide: false });
      ctx.wall({ x0: 2.2, z0: ZF + 0.3, x1: W, z1: ZF + 0.3, h: WH, t: 0.6, color: CREAM, collide: false });
      ctx.wall({ x0: -2.2, z0: ZF + 0.3, x1: 2.2, z1: ZF + 0.3, y: 4.6, h: WH - 4.6, t: 0.6, color: CREAM, collide: false });
      ctx.addCollider({ x0: -W, x1: W, z0: ZF, z1: 21 });
      // 문틀과 열린 문짝
      ctx.box({ x: -2.3, y: 0, z: ZF + 0.3, w: 0.22, h: 4.8, d: 0.7, color: 0xe3d6bb });
      ctx.box({ x: 2.3, y: 0, z: ZF + 0.3, w: 0.22, h: 4.8, d: 0.7, color: 0xe3d6bb });
      ctx.box({ x: 0, y: 4.6, z: ZF + 0.3, w: 4.8, h: 0.22, d: 0.7, color: 0xe3d6bb });
      [[-2.2, -1.3, 1], [2.2, 1.3, -1]].forEach(function (d) {
        var hx = d[0], ry = d[1], sg = d[2];
        var dirx = sg * Math.cos(ry * sg), dirz = Math.sin(Math.abs(ry));
        var cx = hx + dirx * 1.1, cz = ZF + 0.35 + dirz * 1.1;
        ctx.box({ x: cx, y: 0, z: cz, w: 2.2, h: 4.5, d: 0.14, ry: ry, color: 0x8d5b3a });
        ctx.box({ x: cx + 0.0, y: 0.5, z: cz, w: 1.7, h: 1.6, d: 0.18, ry: ry, color: 0xa4714b });
        ctx.box({ x: cx, y: 2.4, z: cz, w: 1.7, h: 1.6, d: 0.18, ry: ry, color: 0xa4714b });
        ctx.sphere({ x: cx - sg * 0.75 * Math.cos(ry * sg) * 0, y: 1.9, z: cz, r: 0.07, color: GOLD, w: 6, h: 4 });
      });
      // 문 위 반원 채광 글라스
      ctx.window({ x: 0, y: 4.9, z: ZF, face: [0, -1], w: 3.6, h: 0.1, top: 'round', pattern: 'solid', seed: 17, frame: true, beam: false });

      // 박공(원통 궁륭 양 끝 채움)
      var pts = ChurchKit.profilePts('round', W, RISE, 20);
      [[Z0, 1], [ZF, -1]].forEach(function (g) {
        var tris = [];
        for (var i = 0; i < pts.length - 1; i++) tris.push(pts[i][0], WH, g[0], pts[i + 1][0], WH, g[0], pts[i][0], WH + pts[i][1], g[0], pts[i + 1][0], WH, g[0], pts[i + 1][0], WH + pts[i + 1][1], g[0], pts[i][0], WH + pts[i][1], g[0]);
        ctx.solid.addTris(tris, CREAM, [0, 7, g[0] + g[1] * 3]);
      });
      ctx.rose({ x: 0, y: 8.3, z: Z0 + 0.02, face: [0, 1], r: 1.5, petals: 12, seed: 5, beam: false });
      ctx.rose({ x: 0, y: 8.4, z: ZF - 0.02, face: [0, -1], r: 1.3, petals: 10, seed: 9, beam: false });

      // 징두리 + 걸레받이
      [-1, 1].forEach(function (s) {
        ctx.boxAABB({ x0: s < 0 ? -W : W - 0.08, x1: s < 0 ? -W + 0.08 : W, z0: Z0, z1: ZF, y0: 0, y1: 1.3, color: WAINS });
        ctx.boxAABB({ x0: s < 0 ? -W : W - 0.14, x1: s < 0 ? -W + 0.14 : W, z0: Z0, z1: ZF, y0: 1.3, y1: 1.4, color: 0xb98a66 });
      });
      ctx.boxAABB({ x0: -W, x1: W, z0: Z0, z1: Z0 + 0.08, y0: 0, y1: 1.3, color: WAINS });

      // 벽기둥(반원 기둥)
      [-17.5, -10.5, -3.5, 3.5, 10.5, 17.5].forEach(function (z) {
        [-1, 1].forEach(function (s) {
          if (s > 0 && Math.abs(z) === 3.5) return; // 촛불대가 놓이는 자리
          ctx.column({ x: s * 11.5, z: z, y: 0, h: WH, r: 0.42, style: 'round', capital: 'block', color: 0xefe0c4, capColor: 0xe3d0ae, collide: false });
          ctx.addCollider({ x0: s < 0 ? -12 : 11.0, x1: s < 0 ? -11 : 12, z0: z - 0.5, z1: z + 0.5 });
        });
      });

      // ----- 천장: 원통 궁륭 + 나무 보 -----
      ctx.vault({ type: 'barrel', profile: 'round', x0: -W, x1: W, z0: Z0, z1: ZF, y: WH, rise: RISE, color: 0xf8ecd9 });
      [-17.5, -10.5, -3.5, 3.5, 10.5, 17.5].forEach(function (z) { ctx.vaultRib({ axis: 'z', center: 0, pos: z, y: WH, a: W, rise: RISE, profile: 'round', t: 0.34, d: 0.5, color: WOOD_D }); });
      ctx.solid.addBeam([0, WH + RISE - 0.2, Z0 + 0.2], [0, WH + RISE - 0.2, ZF - 0.2], 0.3, 0.45, WOOD_D);
      [-6.5, 6.5].forEach(function (x) {
        var yy = WH + RISE * Math.sqrt(1 - Math.pow(x / W, 2)) - 0.2;
        ctx.solid.addBeam([x, yy, Z0 + 0.2], [x, yy, ZF - 0.2], 0.22, 0.32, ctx.shade(WOOD_D, 1.1));
      });
      // 매달린 등
      [-10, -3, 4, 11].forEach(function (z) { [-6, 6].forEach(function (x) { ctx.lantern({ x: x, y: 7.6, z: z, chain: 1.95 }); }); });
      [-6.5, 0.5, 7.5].forEach(function (z) { ctx.chandelier({ x: 0, y: 7.1, z: z, chain: 2.5, r: 0.85, tiers: 1 }); });

      // ----- 창(스테인드글라스) -----
      [-14, -7, 0, 7, 14].forEach(function (z, i) {
        ctx.window({ x: -W, z: z, y: 2.6, face: [1, 0], w: 2.0, h: 2.0, top: 'pointed', seed: 11 + i, beamReach: 9 });
        ctx.window({ x: W, z: z, y: 2.6, face: [-1, 0], w: 2.0, h: 2.0, top: 'pointed', seed: 31 + i, beamReach: 9 });
      });

      // ----- 성소 -----
      var SY = 0.5;
      ctx.boxAABB({ x0: -3.3, x1: 3.3, z0: Z0, z1: Z0 + 0.12, y0: SY, y1: SY + 6.8, color: 0xf3dcc4 });
      ctx.boxAABB({ x0: -3.3, x1: -3.16, z0: Z0, z1: Z0 + 0.16, y0: SY, y1: SY + 6.8, color: GOLD });
      ctx.boxAABB({ x0: 3.16, x1: 3.3, z0: Z0, z1: Z0 + 0.16, y0: SY, y1: SY + 6.8, color: GOLD });
      ctx.crucifix({ x: 0, y: SY + 2.9, z: Z0 + 0.3, h: 3.4, ry: 0 });
      ctx.altar({ x: 0, z: -17, y: SY, w: 2.6, d: 1.1, h: 1.0 });
      ctx.pulpit({ x: -4.6, z: -16, y: SY, ry: 0, style: 'ambo' });
      ctx.tabernacle({ x: 5, z: -18.4, y: SY, lamp: true });
      [-2.5, 2.5].forEach(function (x) {
        ctx.cyl({ x: x, y: SY, z: -17.3, r: 0.18, rTop: 0.07, h: 1.5, seg: 8, color: GOLD });
        ctx.cyl({ x: x, y: SY + 1.5, z: -17.3, r: 0.06, h: 0.5, seg: 6, color: 0xfff6e0 });
        ctx.addFlame({ x: x, y: SY + 2.2, z: -17.3, scale: 1.3 });
        ctx.addCollider({ x: x, z: -17.3, r: 0.25 });
      });
      // 성인상(받침 + 조각)
      [[-8.5, 'mary'], [8.5, 'saint']].forEach(function (s) {
        ctx.box({ x: s[0], y: SY, z: -18.4, w: 1.1, h: 0.8, d: 1.1, color: 0xe8e0d0 });
        ctx.statue({ x: s[0], y: SY + 0.8, z: -18.4, h: 1.9, kind: s[1], ry: 0 });
        ctx.addCollider({ x0: s[0] - 0.6, x1: s[0] + 0.6, z0: -19, z1: -17.8 });
      });
      ctx.addLight({ x: 0, y: 3.4, z: -15.5, color: 0xffc27a, intensity: 1.0, distance: 16, kind: 'lamp' });

      // ----- 입구 성수대 + 촛불대 + 좌석 -----
      ctx.holyFont({ x: -3.3, z: 18.5 });
      ctx.holyFont({ x: 3.3, z: 18.5 });
      ctx.candleStand(0, {});
      ctx.renderSeats(layout, 'bench', { wood: 0x9b6a45, seat: 0xc79463, back: 0x84573b });

      // ----- 바깥 풍경(열린 문으로 보인다) -----
      ctx.setSky({ outside: true });
      ctx.setCameraBounds({ x0: -11.65, x1: 11.65, z0: -19.65, z1: 25, yMax: 9.4 });
      ctx.ground({ color: 0xb4d896, y: -0.05 });
      ctx.path({ x0: -1.8, x1: 1.8, z0: 20, z1: 90 });
      ctx.scatterTrees({ x0: -90, x1: 90, z0: 27, z1: 120, count: 70, seed: 3, minH: 4, maxH: 8.5, exclude: [{ x0: -6, x1: 6, z0: 0, z1: 130 }] });
      ctx.scatterTrees({ x0: -30, x1: 30, z0: 24, z1: 60, count: 12, seed: 8, minH: 3, maxH: 5.5, exclude: [{ x0: -7, x1: 7, z0: 0, z1: 130 }] });
      ctx.scatterTrees({ x0: -16, x1: 16, z0: 24, z1: 50, count: 22, seed: 12, minH: 4, maxH: 7, exclude: [{ x0: -5.5, x1: 5.5, z0: 0, z1: 130 }] });
      // 벚꽃나무(분홍 저폴리) 두 그루
      [[-8.5, 30], [9, 36]].forEach(function (c) {
        ctx.cyl({ x: c[0], y: -0.05, z: c[1], r: 0.35, rTop: 0.2, h: 3.2, seg: 6, color: 0x8b6a4f });
        for (var k = 0; k < 6; k++) ctx.ico({ x: c[0] + Math.cos(k * 1.1) * 1.4, y: 3.4 + (k % 3) * 0.7, z: c[1] + Math.sin(k * 1.1) * 1.4, r: 1.7 - (k % 3) * 0.2, color: [0xf6a6c0, 0xf8b8cd, 0xf3a0b8][k % 3], detail: 1 });
      });
      ctx.hills({ color: 0x9dc89a, count: 16, radius: 200 });
      // 문 앞 화단
      for (var f = 0; f < 10; f++) {
        var fx = (f % 2 ? 1 : -1) * (3.5 + (f * 0.37) % 1.6), fz = 22 + f * 1.7;
        ctx.ico({ x: fx, y: 0.3, z: fz, r: 0.55, color: [0xf6a6c0, 0xf8c5d4, 0xf2b0cc][f % 3], detail: 1 });
        ctx.ico({ x: fx + 0.5, y: 0.15, z: fz + 0.3, r: 0.4, color: 0x8fcf8c, detail: 0 });
      }
    }
  };
})();
