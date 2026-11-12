/* ch_example.js — 빌더 API 예시(로마식 대성전 느낌의 작은 모형). 등록하지 않고 test.html?builder=../../tools/church_web/ch_example.js&church=example 로 시험. */
(function () {
  'use strict';
  var layout = {
    id: 'example', scalePercent: 100,
    bounds: { x0: -14, x1: 14, z0: -30, z1: 26 },
    spawn: { x: 0, z: 22, r: 0 },
    seatGroups: [
      { g: 'L', rows: 8, perRow: 6, origin: { x: -2.8, z: -2.5 }, dx: -0.7, dz: 1.5, rowDx: 0, yaw: 0, pad: [0.5, 0.5] },
      { g: 'R', rows: 8, perRow: 6, origin: { x: 2.8, z: -2.5 }, dx: 0.7, dz: 1.5, rowDx: 0, yaw: 0, pad: [0.5, 0.5] }
    ],
    candles: { stands: [{ x: 12.6, z: 8, slots: 32, cols: 8, face: [-1, 0], pitch: 0.5, step: 0.25, ystep: 0.3 }] }
  };
  ChurchLayouts.register(layout);
  ChurchBuilders['example'] = {
    layout: layout,
    thumb: { x: 0, z: 18, yaw: 0, pitch: 14, zoom: 1, hour: 11 },
    build: function (ctx) {
      var GOLD = 0xd9b45a, MARBLE = 0xf1e9dc, H = 11;
      ctx.floor({ x0: -14, x1: 14, z0: -30, z1: 26, tex: ctx.tex.pattern('cosmati', { c1: 0xf1e7d6, c2: 0xc4906a, c3: 0x6e7a6a }), tile: 4 });
      ctx.carpet({ x0: -1.2, x1: 1.2, z0: -22, z1: 24, color: 0xb83a48 });
      // 외벽 + 반원 후진(모자이크 반돔)
      ctx.wall({ x0: -14.3, z0: -22, x1: -14.3, z1: 26.3, h: H, t: 0.6, color: MARBLE, collide: true });
      ctx.wall({ x0: 14.3, z0: -22, x1: 14.3, z1: 26.3, h: H, t: 0.6, color: MARBLE, collide: true });
      ctx.wall({ x0: -14, z0: 26.3, x1: 14, z1: 26.3, h: H, t: 0.6, color: MARBLE, collide: true });
      ctx.apse({ cx: 0, cz: -22, r: 7, y: 0, h: H - 3, rise: 5, dir: [0, -1], color: 0xe9dfc9, mosaic: true });
      // 이오니아식 기둥 열 + 아치(신랑 양옆)
      [-7.5, 7.5].forEach(function (x) {
        ctx.arcade({ x0: x, z0: -20, x1: x, z1: 22, y: 0, h: 5.2, spacing: 6, pierR: 0.5, style: 'fluted', capital: 'ionic', color: MARBLE, capColor: 0xf6efe4, type: 'round', topY: H - 3 });
      });
      ctx.medallionFrieze({ x0: -7.1, z0: -20, x1: -7.1, z1: 22, y: 7.2, h: 1.3, facing: [1, 0], color: 0x2f4f9a });
      ctx.medallionFrieze({ x0: 7.1, z0: -20, x1: 7.1, z1: 22, y: 7.2, h: 1.3, facing: [-1, 0], color: 0x2f4f9a });
      // 금빛 코퍼 평천장
      ctx.ceilingFlat({ x0: -7.6, x1: 7.6, z0: 4, z1: 26, y: H - 0.5, tex: ctx.tex.coffer({ base: 0x23305f, gold: 0xe0b84a, border: 0xb98a2e }), tile: 5 });
      ctx.ceilingFlat({ x0: -7.6, x1: 7.6, z0: -22, z1: -8, y: H - 0.5, tex: ctx.tex.coffer({ base: 0x23305f, gold: 0xe0b84a, border: 0xb98a2e }), tile: 5 });
      // 측랑: 교차 궁륭
      [[-14, -7.6], [7.6, 14]].forEach(function (r) { ctx.vault({ type: 'groin', x0: r[0], x1: r[1], z0: -20, z1: 22, y: 7.5, rise: 2.2, bays: [1, 7], color: 0xf3ead8 }); });
      // 창(측랑 외벽) + 벽감 조각
      for (var i = 0; i < 6; i++) {
        var z = -17 + i * 6.4;
        ctx.window({ x: -14, z: z, y: 3, face: [1, 0], w: 1.6, h: 3.2, top: 'round', seed: i + 1, beamReach: 9 });
        ctx.window({ x: 14, z: z, y: 3, face: [-1, 0], w: 1.6, h: 3.2, top: 'round', seed: i + 9, beamReach: 9 });
      }
      for (var k = 0; k < 4; k++) ctx.statueNiche({ x: -6.95, y: 0.6, z: -14 + k * 9, face: [1, 0], w: 1.2, h: 3.0, kind: k % 2 ? 'saint' : 'mary' });
      // 제대 + 발다키노 + 후진 창
      ctx.floor({ x0: -7, x1: 7, z0: -22, z1: -8, y: 0.6, color: 0xefe6d4, zone: true });
      ctx.steps({ x0: -7, x1: 7, z0: -8, z1: -7, y0: 0, y1: 0.6, n: 2, dir: [0, -1], color: 0xe4dccb });
      ctx.baldachin({ x: 0, z: -15, y: 0.6, w: 3.6, d: 3.6, h: 4.2, canopyH: 1.2, style: 'twisted' });
      ctx.altar({ x: 0, z: -15, y: 0.6, w: 2.2, d: 1.0, h: 1.0, style: 'tomb' });
      ctx.crucifix({ x: 0, y: 3.2, z: -26.7, h: 3.4 });
      // 돔(교차부 위): 드럼 창 + 채광탑 + 빛줄기
      ctx.dome({ x: 0, z: -2, y: H - 0.5, r: 6, rise: 4.5, drum: { h: 3.5, windows: 10, w: 1.4, colors: [0xfff1c0, 0xfde9b0, 0xffe0a0] }, lantern: { h: 1.8 }, bands: [0xe8d9b8, 0xf3ead8], ribs: 16 });
      ctx.chandelier({ x: 0, y: 7.5, z: 8, chain: 2.5, r: 1.0, tiers: 2 });
      ctx.addLight({ x: 0, y: 4, z: -13, color: 0xffc27a, intensity: 1.0, distance: 18 });
      ctx.candleStand(0, {});
      ctx.renderSeats(layout, 'chair', {});
      ctx.setCameraBounds({ x0: -13.6, x1: 13.6, z0: -29, z1: 25.5, yMax: H + 3 });
    }
  };
})();
