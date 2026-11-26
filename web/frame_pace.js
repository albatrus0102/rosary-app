/* frame_pace.js — 프레임 박자(RENDER_V3.md §5). main.js 의 그리기 고리가 쓴다.
   vsync 간격을 rAF 시각으로 재고(최근 60개의 하위 25%):
   ① snap(raw): dt 를 vsync 배수로 맞춘다(rAF 시각 흔들림이 걷기·카메라를 떨리게 하지 않게; 배수에서 20% 넘게 벗어나면 그대로)
   RoomFramePace.create({enabled}) → P: P.tick(now, allowed) · P.skip() · P.work(ms) · P.snap(rawSec) · P.div · P.vsync */
(function (root) {
  'use strict';
  function create(o) {
    o = o || {};
    var iv = new Float32Array(60), n = 0, k = 0, lastNow = 0, vs = 0;
    var P = { upN: 0, div: 1, vsync: 0, holdS: 5, since: 0, late: 0, cnt: 0, winT: 0, workAvg: 0, lastRender: 0, upAt: -1e9, on: o.enabled !== false, frames: 0 };
    P.tick = function (now, allowed) {
      P.frames++;
      if (lastNow) { var d = now - lastNow; if (d > 2 && d < 100) { iv[k] = d; k = (k + 1) % 60; if (n < 60) n++; } }
      lastNow = now;
      if (n >= 30 && (P.frames % 30) === 0) {
        // 하위 25% 값 둘레(±15%)에 모인 간격의 평균 = vsync(흔들림 평균). 늦은 프레임(2·3배 간격)은 이 무리에 들지 않는다.
        var a = Array.prototype.slice.call(iv, 0, n).sort(function (x, y) { return x - y; }), q = a[Math.floor(n * 0.25)], sm = 0, c = 0;
        for (var j = 0; j < n; j++) if (a[j] > q * 0.85 && a[j] < q * 1.15) { sm += a[j]; c++; }
        var est = c ? sm / c : q;
        // 고주사율로 한 번 잰 값은 10초(약 10번) 연달아 더 큰 값이 나올 때만 버린다: 무거워서 모든 vsync 를 놓치는 동안 60Hz 로 착각하지 않게
        if (!vs || est < vs * 1.15) { vs = est; P.upN = 0; } else if (++P.upN >= 10) { vs = est; P.upN = 0; }
        P.vsync = vs;
      }
      if (!P.on || allowed === false || !vs || vs > 11) { P.div = 1; P.lastRender = 0; P.winT = 0; P.late = P.cnt = 0; return; }
      if ((P.frames % P.div) === 0) {   // 그릴 차례: 지난 그린 프레임과의 간격으로 늦음을 센다
        if (P.lastRender) { var gap = now - P.lastRender; P.cnt++; if (gap > vs * P.div * 1.5) P.late++; }
        P.lastRender = now;
      }
      if (!P.winT) P.winT = now;
      if (now - P.winT < 2000) return;
      var lr = P.cnt ? P.late / P.cnt : 0, tnow = now / 1000;
      if (P.div === 1 && lr > 0.15) { P.div = 2; P.since = tnow; if (tnow - P.upAt < 3) P.holdS = Math.min(60, P.holdS * 2); }
      else if (P.div === 2 && tnow - P.since > P.holdS && P.workAvg < vs * 0.45 && lr < 0.02) { P.div = 1; P.upAt = tnow; }
      P.late = 0; P.cnt = 0; P.winT = now;
    };
    // 이번 프레임이 그릴 차례인가(div 2 면 두 vsync 에 한 번)
    P.skip = function () { return P.div > 1 && (P.frames % P.div) !== 0; };
    P.work = function (ms) { P.workAvg = P.workAvg ? P.workAvg * 0.9 + ms * 0.1 : ms; };
    P.snap = function (raw) {
      if (!vs) return raw;
      var v = vs / 1000, m = Math.round(raw / v);
      return m >= 1 && Math.abs(raw - m * v) < v * 0.2 ? m * v : raw;
    };
    return P;
  }
  root.RoomFramePace = { create: create };
  if (typeof module === 'object' && module.exports) module.exports = root.RoomFramePace;
})(typeof window !== 'undefined' ? window : this);
