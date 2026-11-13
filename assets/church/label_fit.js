/* label_fit.js — 3D 이름표(아바타·스테이션 표식)를 화면에서 읽기 좋은 크기로 맞추는 순수 계산. three.js·DOM 없이 Node 에서도 돈다.
   - 월드에 고정된 스프라이트는 카메라가 가까우면 화면을 덮고 멀면 깨알이 된다. 화면에서 보이는 알약(pill) 높이가
     [minPx, maxPx] CSS px 에 머물도록 월드 높이를 거리(카메라 앞쪽 깊이)에 비례해 조정한다. draw call 은 늘지 않는다.
   - 두 이름표가 화면에서 겹치면 한쪽(표식)을 위로 밀어 올릴 px 를 계산한다(우선순위: 내 이름 > 표식).
   테스트: tools/church_web/label_fit.test.mjs
   ChurchLabelFit = { PRESETS, pxPerMeter, fit, anchorLift, farFade, depthOf, overlapRaise } */
(function (root) {
  'use strict';
  // base: 기존 월드 높이(스프라이트 전체, m) / pill: 스프라이트 높이 중 알약이 차지하는 비율
  // 아바타 이름표 텍스처 256x64, 알약 높이 40 → 0.625 / 표식 256x72, 알약 높이 56 → 0.778
  var PRESETS = {
    self:   { base: 0.195, pill: 0.625, minPx: 14, maxPx: 20 },   // 내 이름: 머리 위에 작게
    peer:   { base: 0.195, pill: 0.625, minPx: 14, maxPx: 26, fadeFrom: 21, fadeTo: 25 },   // 다른 사람: 25m 보다 멀면 숨김
    marker: { base: 0.46,  pill: 0.778, minPx: 18, maxPx: 26 }    // 표식: 글자가 읽히도록 조금 크게(글자 높이 ≈ 알약의 57%)
  };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // 깊이 depth(m)에서 1m 가 화면에서 차지하는 CSS px (세로 시야각 fovDeg, 화면 높이 viewH)
  function pxPerMeter(depth, viewH, fovDeg) {
    var d = Math.max(0.05, depth);
    return viewH / (2 * d * Math.tan(fovDeg * Math.PI / 360));
  }

  // 알약의 화면 높이가 [minPx, maxPx] 가 되도록 스프라이트의 월드 높이를 정한다. -> {h, px}
  function fit(depth, viewH, fovDeg, preset) {
    var ppm = pxPerMeter(depth, viewH, fovDeg);
    var natural = preset.base * preset.pill * ppm;
    var px = clamp(natural, preset.minPx, preset.maxPx);
    return { h: px / (preset.pill * ppm), px: px };
  }

  // 알약의 아래쪽 가장자리를 기준 높이에 고정하기 위해 스프라이트 중심을 올릴 높이(m). 커지면 위로, 작아지면 아래로.
  function anchorLift(h, preset) { return (h - preset.base) * preset.pill * 0.5; }

  // 멀수록 줄어든다: depth<=from 1, depth>=to 0 (선형). preset 에 fadeFrom/fadeTo 가 없으면 항상 1.
  function farFade(depth, preset) {
    if (preset.fadeFrom === undefined) return 1;
    return clamp((preset.fadeTo - depth) / (preset.fadeTo - preset.fadeFrom), 0, 1);
  }

  // 카메라 앞쪽 깊이: 카메라 위치 c, 앞쪽 단위 벡터 f, 점 p
  function depthOf(c, f, px, py, pz) {
    return (px - c.x) * f.x + (py - c.y) * f.y + (pz - c.z) * f.z;
  }

  // 화면 사각형(중심 cx,cy, 크기 w,h; CSS px, y 아래가 +) 두 개가 겹치면 b 를 위로 올릴 px(>=0), 아니면 0.
  // a(우선순위 높음)는 그대로 둔다. gap: 띄울 여백.
  function overlapRaise(a, b, gap) {
    gap = gap || 2;
    var dx = Math.abs(a.cx - b.cx), dy = b.cy - a.cy;          // dy<0: b 가 a 보다 위
    if (dx >= (a.w + b.w) / 2) return 0;
    if (Math.abs(dy) >= (a.h + b.h) / 2) return 0;
    // b 의 아래 가장자리가 a 의 위 가장자리 위로 가도록 올린다
    var need = (b.cy + b.h / 2) - (a.cy - a.h / 2) + gap;
    return need > 0 ? need : 0;
  }

  var API = { PRESETS: PRESETS, pxPerMeter: pxPerMeter, fit: fit, anchorLift: anchorLift, farFade: farFade, depthOf: depthOf, overlapRaise: overlapRaise };
  root.ChurchLabelFit = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
