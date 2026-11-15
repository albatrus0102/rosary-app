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
    // 경당 제대는 모두 제대 단(벽 앞 1.5m)이 충돌체라 오를 수 없다(reverence.test 가 확인). 성체 경당(+x)은 영성체 난간(x 14.3) 안쪽을 막는다.
    // 밀라노: 제단·성가대석(합창석 뒷벽 z≈-29 까지)만 막는다. 그 뒤 주보랑(후진 둘레, z -29.5~-34)은 실제로 방문객이 걷는 길이라 연다
    // (예전에는 구역이 후진 벽까지 닿아 측랑 → 주보랑 → 반대편 측랑 둘레가 끊겼다). 성가대석 안은 둘레 벽·구역으로 계속 막힌다.
    milan: { depth: 17.6 },
    // 피렌체: 팔각 성가대 울타리 안(제대, 뒷벽 z≈-18)만 막는다. 울타리 둘레(팔각 둘레 통로)와 동쪽 트리부나는 걸어 다닌다.
    florence: { depth: 4.7 },
    stpeter: { halfW: 3.3, depth: 9, extra: [{ x0: 14.45, x1: 16.95, z0: 9.1, z1: 16.6 }] }
  };
});
