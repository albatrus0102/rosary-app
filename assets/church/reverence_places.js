/* reverence_places.js — 성당별 제단 출입 금지 구역 보정표(reverence.js). 일반 규칙으로 맞으면 비워 둔다.
   ChurchReverencePlaces[id] = { front: 앞 가장자리 세계 좌표(축이 z 면 z), halfW: 축 좌우 반폭(m), extra: [{x0,x1,z0,z1}] 더 막을 곳 }
   브라우저: window.ChurchReverencePlaces, Node: require. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChurchReverencePlaces = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  return {};
});
