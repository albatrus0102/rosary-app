/* layouts.js — 성당 레이아웃의 단일 원본 (SPEC §10). window.ChurchLayouts / Node require 둘 다 지원.
   다른 성당은 ch_<id>.js 맨 위에서 ChurchLayouts.register(layout) 로 등록한다. */
(function (root) {
  'use strict';
  var byId = {};
  var L = {
    byId: byId,
    register: function (layout) {
      if (!layout || !/^[a-z]+$/.test(layout.id)) throw new Error('layout.id must be lowercase letters');
      byId[layout.id] = layout;
      L[layout.id] = layout;
      return layout;
    },
    get: function (id) { return byId[id] || byId.basic; },
    ids: function () { return Object.keys(byId); }
  };

  // 우리 본당(basic): SPEC 1~2절 그대로
  L.register({
    id: 'basic', scalePercent: 100,
    bounds: { x0: -12, x1: 12, z0: -20, z1: 20 },
    spawn: { x: 0, z: 17, r: 0 },
    seatGroups: [
      { g: 'L', rows: 12, perRow: 6, origin: { x: -3.2, z: -9.65 }, dx: -1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.6, 0.8] },
      { g: 'R', rows: 12, perRow: 6, origin: { x: 3.2, z: -9.65 }, dx: 1.0, dz: 1.9, rowDx: 0, yaw: 0, pad: [0.6, 0.8] }
    ],
    candles: { stands: [{ x: 10.5, z: 0, slots: 96, reach: 1.8, cols: 16, face: [-1, 0], pitch: 0.5, step: 0.25, ystep: 0.3, y0: 0.8 }] },
    info: { name: '우리 본당' }
  });

  root.ChurchLayouts = L;
  root.ChurchBuilders = root.ChurchBuilders || {};
  if (typeof module === 'object' && module.exports) module.exports = L;
})(typeof window !== 'undefined' ? window : this);
