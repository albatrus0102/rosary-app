/* perf_hud.js — 성능 표시(진단, 기본 꺼짐). 설정 '성당 성능 표시' 또는 ?perfhud=1 로 켠다.
   화면 오른쪽 위(웹이 터치를 받는 쪽)에 fps(평균·1% low)·프레임 ms·JS ms·GPU ms(타이머 확장이 있으면, 없으면 '대기 추정')·해상도·pixel ratio·화질 단계·draw call·삼각형.
   '10초 기록' → 요약(평균·최저 fps, 1% low, 단계, 해상도, 성당 id, 기기 요약)을 보여 주고 {e:'perfReport', text} 로 Flutter 에 넘긴다(Flutter 가 클립보드에 복사).
   개인 정보 없음, 분석 전송 없음. main.js 가 매 프레임 frame(rawSec, jsMs, renderMs) 를 부른다(켜져 있을 때만). */
(function (root) {
  'use strict';
  var H = { on: false, el: null, txt: null, out: null, App: null, buf: [], js: [], rd: [], gpu: [], lastUi: 0, rec: null, gl: null, tq: null, pend: [] };
  var N = 120;   // 최근 프레임 창(약 2초)

  function css() {
    return 'position:fixed;right:8px;top:22%;z-index:50;min-width:172px;max-width:240px;padding:8px 10px;border-radius:12px;' +
      'background:rgba(28,24,20,.82);color:#f4e9d8;font:12px/1.4 system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35);white-space:pre;';
  }
  function build() {
    if (H.el) return;
    var d = document.createElement('div');
    d.id = 'perfhud'; d.setAttribute('role', 'region'); d.setAttribute('aria-label', '성능 표시'); d.style.cssText = css();
    var t = document.createElement('div'); t.setAttribute('aria-live', 'off'); d.appendChild(t);
    var b = document.createElement('button');
    b.textContent = '10초 기록'; b.setAttribute('aria-label', '10초 동안 성능 기록하기');
    b.style.cssText = 'margin-top:6px;min-height:36px;padding:0 14px;border:0;border-radius:18px;background:#e8c27a;color:#2a1f10;font:600 13px system-ui,sans-serif;';
    b.addEventListener('click', function (e) { e.stopPropagation(); startRec(); });
    d.appendChild(b);
    var o = document.createElement('div'); o.setAttribute('aria-live', 'polite'); o.style.cssText = 'margin-top:6px;white-space:pre-wrap;'; d.appendChild(o);
    ['pointerdown', 'touchstart', 'mousedown'].forEach(function (k) { d.addEventListener(k, function (e) { e.stopPropagation(); }); });
    document.body.appendChild(d);
    H.el = d; H.txt = t; H.out = o; H.btn = b;
  }
  function pct(arr, p) { if (!arr.length) return 0; var a = arr.slice().sort(function (x, y) { return x - y; }); return a[Math.min(a.length - 1, Math.floor(a.length * p))]; }
  function avg(arr) { var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i]; return arr.length ? s / arr.length : 0; }
  function push(a, v) { a.push(v); if (a.length > N) a.shift(); }
  function uaShort() {
    var ua = (root.navigator && navigator.userAgent) || '';
    var m = ua.match(/Android [0-9.]+(; [^;)]+)?/), c = ua.match(/Chrome\/(\d+)/), ios = ua.match(/iPhone OS [0-9_]+|iPad; CPU OS [0-9_]+/);
    return (m ? m[0] : (ios ? ios[0] : 'web')) + (c ? ' · Chrome ' + c[1] : '');
  }
  function state() {
    var A = H.App, R = A && A.R, rr = R && R.renderer, info = rr ? rr.info.render : { calls: 0, triangles: 0 };
    var cw = rr ? rr.domElement.width : 0, ch = rr ? rr.domElement.height : 0;
    return { tier: R ? R.tier : '?', mode: A ? A.qMode : '?', pr: rr ? +rr.getPixelRatio().toFixed(2) : 0, w: cw, h: ch, calls: info.calls, tris: info.triangles, church: A ? A.church : '?' };
  }
  // GPU 시간(EXT_disjoint_timer_query_webgl2): 실기기에서만 대개 있다. 결과는 몇 프레임 뒤에 읽는다.
  function gpuBegin() {
    if (!H.tq || H.pend.length > 3) return null;
    var gl = H.gl, q = gl.createQuery(); gl.beginQuery(H.tq.TIME_ELAPSED_EXT, q); return q;
  }
  function gpuEnd(q) { if (!q) return; H.gl.endQuery(H.tq.TIME_ELAPSED_EXT); H.pend.push(q); }
  function gpuPoll() {
    var gl = H.gl;
    while (H.pend.length) {
      var q = H.pend[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      var ns = gl.getQueryParameter(q, gl.QUERY_RESULT), dis = gl.getParameter(H.tq.GPU_DISJOINT_EXT);
      if (!dis) push(H.gpu, ns / 1e6);
      gl.deleteQuery(q); H.pend.shift();
    }
  }

  function frame(raw, jsMs, renderMs) {
    if (!H.on) return;
    var ms = raw * 1000;
    push(H.buf, ms); push(H.js, jsMs); push(H.rd, renderMs);
    if (H.tq) try { gpuPoll(); } catch (e) { H.tq = null; }
    if (H.rec) { H.rec.f.push(ms); H.rec.js.push(jsMs); if (performance.now() - H.rec.t0 >= 10000) endRec(); }
    var now = performance.now();
    if (now - H.lastUi < 500) return;
    H.lastUi = now;
    var s = state(), fps = 1000 / Math.max(1, avg(H.buf)), low = 1000 / Math.max(1, pct(H.buf, 0.99));
    var g = H.gpu.length ? 'GPU ' + avg(H.gpu).toFixed(1) + ' ms' : 'GPU 대기(추정) ' + Math.max(0, avg(H.buf) - avg(H.js)).toFixed(1) + ' ms';
    H.txt.textContent = 'FPS ' + fps.toFixed(0) + ' (1% low ' + low.toFixed(0) + ')\n' +
      '프레임 ' + avg(H.buf).toFixed(1) + ' ms · JS ' + avg(H.js).toFixed(1) + ' ms\n' +
      '그리기 호출(JS) ' + avg(H.rd).toFixed(1) + ' ms\n' + g + '\n' +
      '해상도 ' + s.w + '×' + s.h + ' (×' + s.pr + ')\n' +
      '화질 ' + s.tier + (s.mode === 'auto' ? ' (자동)' : '') + '\n' +
      'draw ' + s.calls + ' · 삼각형 ' + (s.tris / 1000).toFixed(0) + 'k';
    H.el.setAttribute('aria-label', '성능 표시: 초당 ' + fps.toFixed(0) + '프레임, 화질 ' + s.tier);
  }
  function startRec() {
    if (H.rec) return;
    H.rec = { t0: performance.now(), f: [], js: [], tier0: H.App && H.App.R ? H.App.R.tier : '?' };
    H.btn.textContent = '기록 중…'; H.btn.disabled = true; H.out.textContent = '10초 동안 평소처럼 걷고 돌려 보세요.';
  }
  function endRec() {
    var r = H.rec; H.rec = null;
    var s = state(), f = r.f, tot = 0, i;
    for (i = 0; i < f.length; i++) tot += f[i];
    // 1초 창별 fps 의 최솟값
    var minFps = 1e9, acc = 0, n = 0;
    for (i = 0; i < f.length; i++) { acc += f[i]; n++; if (acc >= 1000) { minFps = Math.min(minFps, n * 1000 / acc); acc = 0; n = 0; } }
    if (minFps === 1e9) minFps = f.length ? f.length * 1000 / tot : 0;
    var text = '[로사리움 성당 성능 10초]\n' +
      '성당 ' + s.church + ' · 화질 ' + r.tier0 + (r.tier0 !== s.tier ? '→' + s.tier : '') + (s.mode === 'auto' ? ' (자동)' : '') + '\n' +
      '평균 ' + (f.length * 1000 / Math.max(1, tot)).toFixed(1) + ' fps · 최저(1초) ' + minFps.toFixed(1) + ' fps · 1% low ' + (1000 / Math.max(1, pct(f, 0.99))).toFixed(1) + ' fps\n' +
      '프레임 중앙 ' + pct(f, 0.5).toFixed(1) + ' ms · 90% ' + pct(f, 0.9).toFixed(1) + ' ms · JS ' + avg(r.js).toFixed(1) + ' ms' + (H.gpu.length ? ' · GPU ' + avg(H.gpu).toFixed(1) + ' ms' : '') + '\n' +
      '해상도 ' + s.w + '×' + s.h + ' (pixel ratio ' + s.pr + ') · draw ' + s.calls + ' · 삼각형 ' + s.tris + '\n' +
      '기기 ' + uaShort();
    H.out.textContent = text + '\n(복사했어요)';
    H.btn.textContent = '10초 기록'; H.btn.disabled = false;
    try { if (root.ChurchBridge) root.ChurchBridge.post({ e: 'perfReport', text: text }); } catch (e) { /* ignore */ }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () {}); } catch (e) { /* ignore */ }
    H.lastReport = text;
  }
  function set(on, App) {
    H.App = App || H.App; H.on = !!on;
    if (on) {
      build(); H.el.style.display = '';
      try {
        var rr = H.App && H.App.R && H.App.R.renderer;
        if (rr && rr.capabilities.isWebGL2) { H.gl = rr.getContext(); H.tq = H.gl.getExtension('EXT_disjoint_timer_query_webgl2'); }
      } catch (e) { H.tq = null; }
    } else if (H.el) H.el.style.display = 'none';
  }
  root.ChurchPerfHud = { set: set, frame: frame, gpuBegin: function () { return H.on ? gpuBegin() : null; }, gpuEnd: gpuEnd, get on() { return H.on; }, _h: H, record: startRec, report: function () { return H.lastReport || null; } };
  try { if (/[?&]perfhud=1/.test(root.location.search)) document.addEventListener('DOMContentLoaded', function () { var t = setInterval(function () { if (root.__church && root.__church.R) { clearInterval(t); set(true, root.__church); } }, 200); }); } catch (e) { /* ignore */ }
})(typeof window !== 'undefined' ? window : this);
