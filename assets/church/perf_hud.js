/* perf_hud.js — 성능 표시(진단, 기본 꺼짐). 설정 '성당 성능 표시' 또는 ?perfhud=1 로 켠다.
   화면 오른쪽 위(웹이 터치를 받는 쪽)에 fps(평균·1% low)·프레임 ms·JS ms·GPU ms(타이머 확장이 있으면, 없으면 '대기 추정')·해상도·pixel ratio·화질 단계·draw call·삼각형.
   '10초 기록' → 요약(평균·최저 fps, 1% low, 단계, 해상도, 성당 id, 기기 요약)을 보여 주고 {e:'perfReport', text} 로 Flutter 에 넘긴다(Flutter 가 클립보드에 복사).
   개인 정보 없음, 분석 전송 없음. main.js 가 매 프레임 frame(rawSec, jsMs, renderMs) 를 부른다(켜져 있을 때만).
   (2026-11-15, PERF_SCALE.md §6) 실기기 판정용: 최근 60초 최악 프레임, 질감 메모리 추정(MB), GPU 이름, '30초 벤치'(자동으로 걷고 돌며 재고 요약을 복사),
   '창 55 스트레스'(가짜 스테인드글라스 55장·서로 다른 1k 질감을 이 성당에 더함, 같은 벤치로 비교). */
(function (root) {
  'use strict';
  var H = { on: false, el: null, txt: null, out: null, App: null, buf: [], js: [], rd: [], gpu: [], lastUi: 0, rec: null, gl: null, tq: null, pend: [],
    secMax: [], secT: 0, secCur: 0, texMb: 0, texT: 0, gpuName: '', bench: null, stress: 0 };
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
    var bb = document.createElement('button');
    bb.textContent = '30초 벤치'; bb.setAttribute('aria-label', '30초 동안 자동으로 걷고 돌며 성능 재기');
    bb.style.cssText = b.style.cssText + 'margin-left:6px;';
    bb.addEventListener('click', function (e) { e.stopPropagation(); startBench(); });
    d.appendChild(bb);
    var sb = document.createElement('button');
    sb.setAttribute('aria-label', '스테인드글라스 55장 스트레스 켜고 끄기');
    sb.style.cssText = 'display:block;margin-top:6px;min-height:32px;padding:0 12px;border:1px solid #e8c27a;border-radius:16px;background:transparent;color:#f4e9d8;font:12px system-ui,sans-serif;';
    sb.addEventListener('click', function (e) { e.stopPropagation(); setStress(H.stress ? 0 : 55); });
    d.appendChild(sb);
    H.sbtn = sb; H.bbtn = bb;
    stressLabel();
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
    return { tier: R ? R.tier : '?', mode: A ? A.qMode : '?', pr: rr ? +rr.getPixelRatio().toFixed(2) : 0, w: cw, h: ch, calls: info.calls, tris: info.triangles, church: A ? A.church : '?',
      texMb: H.texMb, gpu: H.gpuName, glTex: rr ? rr.info.memory.textures : 0, progs: rr && rr.info.programs ? rr.info.programs.length : 0 };
  }
  // 질감 메모리 추정(MB): 장면 재질이 쓰는 질감(중복 없이, RGBA8 × 밉맵 4/3) + 렌더 타깃(후처리·반사·그림자 대략). 2초마다.
  function texEstimate() {
    var A = H.App, rr = A && A.R && A.R.renderer;
    if (!A || !A.scene || !rr) return 0;
    var seen = {}, bytes = 0;
    function add(t) {
      if (!t || !t.isTexture || t.isRenderTargetTexture) return;
      var k = t.source ? t.source.uuid : t.uuid;
      if (seen[k]) return; seen[k] = 1;
      var im = t.image || {}, w = im.width || 0, h = im.height || 0;
      if (t.isCompressedTexture && t.mipmaps && t.mipmaps.length) { for (var i = 0; i < t.mipmaps.length; i++) bytes += (t.mipmaps[i].data && t.mipmaps[i].data.byteLength) || 0; return; }
      if (t.userData && t.userData.w) { w = t.userData.w; h = t.userData.h; }   // 올린 뒤 CPU 그림을 놓은 질감(창 스트리밍)은 크기를 따로 적어 둔다
      bytes += w * h * 4 * (t.generateMipmaps !== false && t.minFilter !== T_LINEAR ? 4 / 3 : 1);
    }
    A.scene.traverse(function (o) {
      var ms = o.material; if (!ms) return;
      if (!Array.isArray(ms)) ms = [ms];
      for (var i = 0; i < ms.length; i++) { var m = ms[i]; for (var k in m) { var v = m[k]; if (v && v.isTexture) add(v); } if (m.uniforms) for (var u in m.uniforms) add(m.uniforms[u] && m.uniforms[u].value); }
    });
    var mb = bytes / 1048576;
    // 렌더 타깃: 화면 크기 × (HalfFloat 8B × 2 + MSAA 4배 × 8B 대략 + 깊이 4B × 2) + 그림자 2048² × 4B + 반사(반해상도 RGBA8)
    var c = rr.domElement, px = c.width * c.height, tier = A.R.tier;
    var rt = tier === 'low' ? 0 : px * (8 * 2 + 8 * (tier === 'high' ? 4 : 2) + 8) + 2048 * 2048 * 4 + (tier === 'high' ? px / 4 * 4 * (A.world && A.world.reflectorCount ? A.world.reflectorCount() : 0) : 0);
    H.rtMb = rt / 1048576;
    return mb;
  }
  var T_LINEAR = 1006;
  function gpuName() {
    try {
      var gl = H.App.R.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
      return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).replace(/\s+/g, ' ').slice(0, 60);
    } catch (e) { return '?'; }
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
    // 최근 60초 최악 프레임: 1초 칸마다 최댓값, 60칸
    H.secCur = Math.max(H.secCur, ms); H.secT += ms;
    if (H.secT >= 1000) { H.secMax.push(H.secCur); if (H.secMax.length > 60) H.secMax.shift(); H.secT = 0; H.secCur = 0; }
    if (H.bench) benchFrame(ms, jsMs);
    if (H.tq) try { gpuPoll(); } catch (e) { H.tq = null; }
    if (H.rec) { H.rec.f.push(ms); H.rec.js.push(jsMs); if (performance.now() - H.rec.t0 >= 10000) endRec(); }
    var now = performance.now();
    if (now - H.lastUi < 500) return;
    H.lastUi = now;
    if (now - H.texT > 2000) { H.texT = now; H.texMb = texEstimate(); if (!H.gpuName) H.gpuName = gpuName(); }
    var s = state(), fps = 1000 / Math.max(1, avg(H.buf)), low = 1000 / Math.max(1, pct(H.buf, 0.99));
    var worst = Math.max(H.secCur, H.secMax.length ? Math.max.apply(null, H.secMax) : 0), Pd = H.App && H.App.place ? H.App.place.debug() : null;
    var g = H.gpu.length ? 'GPU ' + avg(H.gpu).toFixed(1) + ' ms' : 'GPU 대기(추정) ' + Math.max(0, avg(H.buf) - avg(H.js)).toFixed(1) + ' ms';
    H.txt.textContent = 'FPS ' + fps.toFixed(0) + ' (1% low ' + low.toFixed(0) + ')\n' +
      '프레임 ' + avg(H.buf).toFixed(1) + ' ms · JS ' + avg(H.js).toFixed(1) + ' ms\n' +
      '그리기 호출(JS) ' + avg(H.rd).toFixed(1) + ' ms\n' + g + '\n' +
      '해상도 ' + s.w + '×' + s.h + ' (×' + s.pr + ')\n' +
      '화질 ' + s.tier + (s.mode === 'auto' ? ' (자동)' : '') + '\n' +
      'draw ' + s.calls + ' · 삼각형 ' + (s.tris / 1000).toFixed(0) + 'k\n' +
      '최악 프레임(60초) ' + worst.toFixed(0) + ' ms\n' +
      '질감 ' + s.texMb.toFixed(0) + 'MB + 타깃 ' + (H.rtMb || 0).toFixed(0) + 'MB (추정)\n' +
      (Pd ? '창 ' + Pd.slots + '자리 · 1k ' + Pd.stats.resident + '장 · ' + Pd.stats.texMb + 'MB\n' : '') +
      'GPU ' + (s.gpu || '?');
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
  // ---- 30초 벤치: 제대까지 자동 걷기(카메라를 좌우로 흔듦) → 제자리 한 바퀴 → 입구로 자동 걷기. 끝나면 요약을 보이고 복사(perfReport). ----
  function startBench() {
    var A = H.App;
    if (H.bench || !A || !A.api || !A.me || A.me.mode !== 'walk') { if (H.out) H.out.textContent = '서 있을 때(걷기 상태) 시작할 수 있어요.'; return; }
    H.bench = { t0: performance.now(), t: 0, f: [], js: [], calls: 0, tris: 0, phase: 0, tier0: A.R.tier, yaw0: A.ctl.yaw, texMax: 0, spikes50: 0, spikes100: 0 };
    H.bbtn.textContent = '벤치 중…'; H.bbtn.disabled = true; H.btn.disabled = true;
    H.out.textContent = '30초 동안 자동으로 걷고 돌아요. 화면을 만지지 마세요.';
    A.api.walkTo({ kind: 'altar' });
  }
  function benchFrame(ms, jsMs) {
    var B = H.bench, A = H.App, rr = A.R.renderer;
    B.f.push(ms); B.js.push(jsMs); B.t += ms / 1000;
    if (ms > 50) B.spikes50++; if (ms > 100) B.spikes100++;
    B.calls = Math.max(B.calls, rr.info.render.calls); B.tris = Math.max(B.tris, rr.info.render.triangles);
    var ctl = A.ctl;
    if (B.t < 12) {
      // 걷는 동안 카메라를 ±60° 로 흔든다(회전 비용). 끌기 중으로 표시해 자동 따라가기를 막는다.
      ctl.yaw = A.me.yaw + Math.sin(B.t * 1.3) * 1.05; ctl.lastDragT = A.t;
    } else if (B.t < 18) {
      if (B.phase === 0) { B.phase = 1; if (A.api.cancelWalk) A.api.cancelWalk(); B.yaw1 = ctl.yaw; }
      ctl.yaw = B.yaw1 + (B.t - 12) / 6 * Math.PI * 2; ctl.lastDragT = A.t;
    } else if (B.t < 30) {
      if (B.phase === 1) { B.phase = 2; A.api.walkTo({ kind: 'entrance' }); }
      ctl.yaw = A.me.yaw + Math.sin(B.t * 1.1) * 0.9; ctl.lastDragT = A.t;
    } else endBench();
  }
  function endBench() {
    var B = H.bench, A = H.App; H.bench = null;
    if (A.api.cancelWalk) A.api.cancelWalk();
    var s = state(), f = B.f, tot = 0, i;
    for (i = 0; i < f.length; i++) tot += f[i];
    var Pd = A.place ? A.place.debug() : null;
    var text = '[로사리움 성당 30초 벤치]\n' +
      '성당 ' + s.church + ' · 화질 ' + B.tier0 + (B.tier0 !== s.tier ? '→' + s.tier : '') + (s.mode === 'auto' ? ' (자동)' : '') + (H.stress ? ' · 창 스트레스 ' + H.stress : '') + '\n' +
      '평균 ' + (f.length * 1000 / Math.max(1, tot)).toFixed(1) + ' fps · 1% low ' + (1000 / Math.max(1, pct(f, 0.99))).toFixed(1) + ' fps · 최악 ' + Math.max.apply(null, f.length ? f : [0]).toFixed(0) + ' ms\n' +
      '프레임 중앙 ' + pct(f, 0.5).toFixed(1) + ' · 90% ' + pct(f, 0.9).toFixed(1) + ' · 99% ' + pct(f, 0.99).toFixed(1) + ' ms · JS ' + avg(B.js).toFixed(1) + ' ms' + (H.gpu.length ? ' · GPU ' + avg(H.gpu).toFixed(1) + ' ms' : '') + '\n' +
      '50ms 넘는 프레임 ' + B.spikes50 + ' · 100ms 넘는 프레임 ' + B.spikes100 + ' (총 ' + f.length + ')\n' +
      '해상도 ' + s.w + '×' + s.h + ' (pixel ratio ' + s.pr + ') · draw 최대 ' + B.calls + ' · 삼각형 최대 ' + B.tris + '\n' +
      '질감 ' + texEstimate().toFixed(0) + 'MB + 타깃 ' + (H.rtMb || 0).toFixed(0) + 'MB (추정) · GL 질감 ' + s.glTex + ' · 셰이더 ' + s.progs + '\n' +
      (Pd ? '창 ' + Pd.slots + '자리 · 1k 상주 ' + Pd.stats.resident + ' · 업로드 ' + Pd.stats.uploads + ' · 해제 ' + Pd.stats.evicted + ' · 최장 업로드 ' + Pd.stats.uploadMsMax + 'ms\n' : '') +
      'GPU ' + (s.gpu || gpuName()) + '\n기기 ' + uaShort();
    H.out.textContent = text + '\n(복사했어요)';
    H.bbtn.textContent = '30초 벤치'; H.bbtn.disabled = false; H.btn.disabled = false;
    try { if (root.ChurchBridge) root.ChurchBridge.post({ e: 'perfReport', text: text }); } catch (e) { /* ignore */ }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () {}); } catch (e) { /* ignore */ }
    H.lastReport = text;
  }
  // 개발자 스위치: 가짜 스테인드글라스 n장(서로 다른 1k 질감 id)을 이 성당에 더해 다시 건다
  function setStress(n) {
    var A = H.App;
    H.stress = n | 0; stressLabel();
    if (A && A.place && A.place.setStress && A.world) { A.place.setStress(H.stress); A.place.load(A.world); }
  }
  function stressLabel() { if (H.sbtn) H.sbtn.textContent = '창 55 스트레스: ' + (H.stress ? '켬' : '끔'); }
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
  root.ChurchPerfHud = { set: set, frame: frame, bench: startBench, setStress: setStress, benching: function () { return !!H.bench; }, gpuBegin: function () { return H.on ? gpuBegin() : null; }, gpuEnd: gpuEnd, get on() { return H.on; }, _h: H, record: startRec, report: function () { return H.lastReport || null; } };
  try { if (/[?&]perfhud=1/.test(root.location.search)) document.addEventListener('DOMContentLoaded', function () { var t = setInterval(function () { if (root.__church && root.__church.R) { clearInterval(t); set(true, root.__church); } }, 200); }); } catch (e) { /* ignore */ }
})(typeof window !== 'undefined' ? window : this);
