/* layouts.js — 장면 레이아웃의 단일 원본. window.RoomLayouts / Node require 둘 다 지원.
   장면은 ch_<id>.js 맨 위에서 RoomLayouts.register(layout) 로 등록한다(THREE 없이 실행되는 순수 데이터).
   layout = {id, bounds:{x0,x1,z0,z1}, spawn:{x,z,r}, seats:[{x,z,yaw,stand?,reach?}] | seatGroups:[…], …} */
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
    get: function (id) { return byId[id] || null; },
    ids: function () { return Object.keys(byId); }
  };
  root.RoomLayouts = L;
  root.RoomBuilders = root.RoomBuilders || {};
  if (typeof module === 'object' && module.exports) module.exports = L;
})(typeof window !== 'undefined' ? window : this);
