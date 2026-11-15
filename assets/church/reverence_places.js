/* reverence_places.js — 성당별 제단 출입 금지 구역 보정표(reverence.js). 일반 규칙으로 맞으면 비워 둔다.
   ChurchReverencePlaces[id] = { front: 앞 가장자리 세계 좌표(축이 z 면 z), halfW: 축 좌우 반폭(m), depth: 첫 구역 깊이(m), extra: [{x0,x1,z0,z1}] 더 막을 곳 }
   브라우저: window.ChurchReverencePlaces, Node: require. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChurchReverencePlaces = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  return {
    // 성 베드로: 교황 제대 단(±2.8m, z -11.45~-6.55, 바닥 구역 없음)만 막고, 그 뒤 통로로 앱스 좌석(주교좌 제대 앞)에 간다.
    // 앱스 제대(주교좌)는 맨 뒤 좌석 뒤의 두 번째 구역이 일반 규칙으로 막는다.
    stpeter: { halfW: 3.3, depth: 9 },
    // 피렌체: 제단 단(±3.2m) 옆 좌석(OL·OR)은 지금 빌더에서 제대 뒤(z -16.5~-18.6) 통로로만 닿는다 →
    // 구역을 제대 뒷면 0.5m 뒤에서 끊어 그 통로를 남긴다. (제대 뒤 통행: REVERENCE.md '사용자 결정' — 빌더에 앞쪽 통로를 내는 게 옳다)
    florence: { halfW: 3.5, depth: 3.2 }
  };
});
