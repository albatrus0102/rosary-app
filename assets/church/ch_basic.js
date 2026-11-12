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

      // ----- 바닥: 광택 대리석(흰/검정 체스판) + 신자석 마루 + 성소 단 -----
      ctx.floor({ x0: -W, x1: W, z0: Z0, z1: 20.1, y: 0, surf: 'marble_checker', gloss: 0.9 });
      [-1, 1].forEach(function (s) {
        ctx.boxAABB({ x0: s < 0 ? -9.2 : 2.4, x1: s < 0 ? -2.4 : 9.2, z0: -10.9, z1: 12.1, y0: 0, y1: 0.02, surf: 'wood_dark', color: 0xb8a090 });
      });
      ctx.boxAABB({ x0: -W, x1: W, z0: Z0, z1: -14, y0: 0, y1: 0.49, surf: 'marble_white' });
      ctx.floor({ x0: -W, x1: W, z0: Z0, z1: -14, y: 0.5, surf: 'marble_white', gloss: 0.95, zone: true });
      ctx.steps({ x0: -9, x1: 9, z0: -14, z1: -13.2, y0: 0, y1: 0.5, n: 2, dir: [0, -1], surf: 'marble_white' });
      ctx.carpet({ x0: -0.9, x1: 0.9, z0: -13.2, z1: 19.2, y: 0, color: 0x8a2433, border: 0xb8963f });
      ctx.carpet({ x0: -1.5, x1: 1.5, z0: -18.2, z1: -14, y: 0.5, color: 0x8a2433, border: 0xb8963f });

      // ----- 벽: 회반죽 + 징두리 + 돌 몰딩(창 구멍이 뚫린 진짜 벽) -----
      var WS = 'plaster';
      ctx.wall({ x0: -W - 0.3, z0: Z0 - 0.3, x1: -W - 0.3, z1: 20.4, h: WH, t: 0.6, color: CREAM, surf: WS, collide: false });
      ctx.wall({ x0: W + 0.3, z0: Z0 - 0.3, x1: W + 0.3, z1: 20.4, h: WH, t: 0.6, color: CREAM, surf: WS, collide: false });
      ctx.wall({ x0: -W, z0: Z0 - 0.3, x1: W, z1: Z0 - 0.3, h: WH, t: 0.6, color: CREAM, surf: WS, collide: false });
      ctx.wall({ x0: -W, z0: ZF + 0.3, x1: -2.2, z1: ZF + 0.3, h: WH, t: 0.6, color: CREAM, surf: WS, collide: false });
      ctx.wall({ x0: 2.2, z0: ZF + 0.3, x1: W, z1: ZF + 0.3, h: WH, t: 0.6, color: CREAM, surf: WS, collide: false });
      ctx.wall({ x0: -2.2, z0: ZF + 0.3, x1: 2.2, z1: ZF + 0.3, y: 4.6, h: WH - 4.6, t: 0.6, color: CREAM, surf: WS, collide: false, plinth: false });
      ctx.addCollider({ x0: -W, x1: W, z0: ZF, z1: 21 });
      // 문틀(돌)과 열린 나무 문짝
      ctx.box({ x: -2.3, y: 0, z: ZF + 0.3, w: 0.26, h: 4.8, d: 0.74, surf: 'limestone' });
      ctx.box({ x: 2.3, y: 0, z: ZF + 0.3, w: 0.26, h: 4.8, d: 0.74, surf: 'limestone' });
      ctx.box({ x: 0, y: 4.6, z: ZF + 0.3, w: 4.9, h: 0.24, d: 0.74, surf: 'limestone' });
      [[-2.2, -1.3, 1], [2.2, 1.3, -1]].forEach(function (d) {
        var hx = d[0], ry = d[1], sg = d[2];
        var dirx = sg * Math.cos(ry * sg), dirz = Math.sin(Math.abs(ry));
        var cx = hx + dirx * 1.1, cz = ZF + 0.35 + dirz * 1.1;
        ctx.box({ x: cx, y: 0, z: cz, w: 2.2, h: 4.5, d: 0.14, ry: ry, surf: 'wood_dark' });
        ctx.box({ x: cx, y: 0.5, z: cz, w: 1.7, h: 1.6, d: 0.19, ry: ry, surf: 'wood_dark', color: 0xd8c0b0 });
        ctx.box({ x: cx, y: 2.4, z: cz, w: 1.7, h: 1.6, d: 0.19, ry: ry, surf: 'wood_dark', color: 0xd8c0b0 });
        ctx.sphere({ x: cx, y: 1.9, z: cz, r: 0.07, color: GOLD, w: 10, h: 8 });
      });
      ctx.window({ x: 0, y: 4.9, z: ZF, face: [0, -1], w: 3.6, h: 0.1, top: 'round', pattern: 'solid', seed: 17, frame: true, beam: false, painted: true });

      // 박공(원통 궁륭 양 끝 채움)
      var pts = ChurchKit.profilePts('round', W, RISE, 24);
      [[Z0, 1], [ZF, -1]].forEach(function (g) {
        var tris = [];
        for (var i = 0; i < pts.length - 1; i++) tris.push(pts[i][0], WH, g[0], pts[i + 1][0], WH, g[0], pts[i][0], WH + pts[i][1], g[0], pts[i + 1][0], WH, g[0], pts[i + 1][0], WH + pts[i + 1][1], g[0], pts[i][0], WH + pts[i][1], g[0]);
        ctx.surfBatch(WS).addTris(tris, 0xffffff, [0, 7, g[0] + g[1] * 3]);
      });
      ctx.rose({ x: 0, y: 8.3, z: Z0 + 0.02, face: [0, 1], r: 1.5, petals: 12, seed: 5, beam: false });
      ctx.rose({ x: 0, y: 8.4, z: ZF - 0.02, face: [0, -1], r: 1.3, petals: 10, seed: 9, beam: false });

      // 징두리(어두운 나무 패널) + 몰딩
      [-1, 1].forEach(function (s) {
        ctx.boxAABB({ x0: s < 0 ? -W : W - 0.1, x1: s < 0 ? -W + 0.1 : W, z0: Z0, z1: ZF, y0: 0.3, y1: 1.35, surf: 'wood_cherry' });
        ctx.boxAABB({ x0: s < 0 ? -W : W - 0.16, x1: s < 0 ? -W + 0.16 : W, z0: Z0, z1: ZF, y0: 1.35, y1: 1.45, surf: 'wood_dark' });
      });
      ctx.boxAABB({ x0: -W, x1: W, z0: Z0, z1: Z0 + 0.1, y0: 0.3, y1: 1.35, surf: 'wood_cherry' });

      // 벽기둥(돌 반원 기둥)
      [-17.5, -10.5, -3.5, 3.5, 10.5, 17.5].forEach(function (z) {
        [-1, 1].forEach(function (s) {
          if (s > 0 && Math.abs(z) === 3.5) return;
          ctx.column({ x: s * 11.5, z: z, y: 0, h: WH - 0.35, r: 0.42, style: 'round', capital: 'doric', surf: 'limestone', collide: false, ao: false });
          ctx.addCollider({ x0: s < 0 ? -12 : 11.0, x1: s < 0 ? -11 : 12, z0: z - 0.5, z1: z + 0.5 });
        });
      });

      // ----- 천장: 회반죽 원통 궁륭 + 어두운 나무 보 -----
      ctx.vault({ type: 'barrel', profile: 'round', x0: -W, x1: W, z0: Z0, z1: ZF, y: WH, rise: RISE, color: 0xffffff, surf: WS });
      [-17.5, -10.5, -3.5, 3.5, 10.5, 17.5].forEach(function (z) { ctx.vaultRib({ axis: 'z', center: 0, pos: z, y: WH, a: W, rise: RISE, profile: 'round', t: 0.34, d: 0.5, color: 0xffffff, surf: 'wood_dark' }); });
      ctx.beam3([0, WH + RISE - 0.2, Z0 + 0.2], [0, WH + RISE - 0.2, ZF - 0.2], 0.3, 0.45, 0xffffff, ctx.surfBatch('wood_dark'));
      [-6.5, 6.5].forEach(function (x) {
        var yy = WH + RISE * Math.sqrt(1 - Math.pow(x / W, 2)) - 0.2;
        ctx.beam3([x, yy, Z0 + 0.2], [x, yy, ZF - 0.2], 0.22, 0.32, 0xe0d0c8, ctx.surfBatch('wood_dark'));
      });
      [-10, -3, 4, 11].forEach(function (z) { [-6, 6].forEach(function (x) { ctx.lantern({ x: x, y: 7.6, z: z, chain: 1.95 }); }); });
      [-6.5, 0.5, 7.5].forEach(function (z) { ctx.chandelier({ x: 0, y: 7.1, z: z, chain: 2.5, r: 0.85, tiers: 1 }); });

      // ----- 창: 벽에 뚫린 진짜 개구부 + 스테인드글라스 + 창살 -----
      [-14, -7, 0, 7, 14].forEach(function (z, i) {
        ctx.window({ x: -W, z: z, y: 3.0, face: [1, 0], w: 1.9, h: 1.9, top: 'pointed', seed: 11 + i, beamReach: 11 });
        ctx.window({ x: W, z: z, y: 3.0, face: [-1, 0], w: 1.9, h: 1.9, top: 'pointed', seed: 31 + i, beamReach: 11 });
      });

      // ----- 성소 -----
      var SY = 0.5;
      ctx.boxAABB({ x0: -3.3, x1: 3.3, z0: Z0, z1: Z0 + 0.12, y0: SY, y1: SY + 6.0, surf: 'marble_beige' });
      ctx.boxAABB({ x0: -3.3, x1: -3.16, z0: Z0, z1: Z0 + 0.16, y0: SY, y1: SY + 6.0, color: GOLD });
      ctx.boxAABB({ x0: 3.16, x1: 3.3, z0: Z0, z1: Z0 + 0.16, y0: SY, y1: SY + 6.0, color: GOLD });
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
        ctx.box({ x: s[0], y: SY, z: -18.4, w: 1.1, h: 0.8, d: 1.1, surf: 'marble_white' });
        ctx.statue({ x: s[0], y: SY + 0.8, z: -18.4, h: 1.9, kind: s[1], ry: 0 });
        ctx.addCollider({ x0: s[0] - 0.6, x1: s[0] + 0.6, z0: -19, z1: -17.8 });
      });
      ctx.addLight({ x: 0, y: 3.4, z: -15.5, color: 0xffc27a, intensity: 1.0, distance: 16, kind: 'lamp' });

      // ----- 입구 성수대 + 촛불대 + 좌석 -----
      ctx.holyFont({ x: -3.3, z: 18.5 });
      ctx.holyFont({ x: 3.3, z: 18.5 });
      ctx.candleStand(0, {});
      ctx.renderSeats(layout, 'bench', {});

      // ----- 바깥 풍경(열린 문으로 보인다) -----
      ctx.setSky({ outside: true });
      ctx.setCameraBounds({ x0: -11.65, x1: 11.65, z0: -19.65, z1: 25, yMax: 9.4 });
      ctx.ground({ color: 0x6f9a5c, y: -0.05 });
      ctx.path({ x0: -1.8, x1: 1.8, z0: 20, z1: 90 });
      ctx.scatterTrees({ x0: -90, x1: 90, z0: 27, z1: 120, count: 70, seed: 3, minH: 4, maxH: 8.5, exclude: [{ x0: -6, x1: 6, z0: 0, z1: 130 }] });
      ctx.scatterTrees({ x0: -30, x1: 30, z0: 24, z1: 60, count: 12, seed: 8, minH: 3, maxH: 5.5, exclude: [{ x0: -7, x1: 7, z0: 0, z1: 130 }] });
      ctx.scatterTrees({ x0: -16, x1: 16, z0: 24, z1: 50, count: 22, seed: 12, minH: 4, maxH: 7, exclude: [{ x0: -5.5, x1: 5.5, z0: 0, z1: 130 }] });
      ctx.hills({ color: 0x6f8f70, count: 16, radius: 200 });
      for (var f = 0; f < 8; f++) {
        var fx = (f % 2 ? 1 : -1) * (3.5 + (f * 0.37) % 1.6), fz = 22 + f * 1.9;
        ctx.ico({ x: fx, y: 0.25, z: fz, r: 0.5, color: 0x4f7a47, detail: 1, mat: 'outside' });
      }
    }
  };
})();
