/* perf_hud.js — 성능 표시(진단, 기본 꺼짐). setPerfHud({on:true}) 또는 ?perfhud=1 로 켠다.
   화면 오른쪽 위에 fps(평균·1% low)·프레임 ms·JS ms·GPU ms(타이머 확장이 있으면)·해상도·pixel ratio·화질 단계·draw call·삼각형.
   개인 정보 없음, 분석 전송 없음. main.js 가 매 프레임 frame(rawSec, jsMs, renderMs) 를 부른다(켜져 있을 때만). */
(function (root) {
  'use strict';
  var H = { on: false, el: null, txt: null, out: null, App: null, buf: [], js: [], rd: [], gpu: [], lastUi: 0, rec: null, gl: null, tq: null, pend: [],
    secMax: [], secT: 0, secCur: 0, texMb: 0, texT: 0, gpuName: '', bench: null };
  var N = 120;   // 최근 프레임 창(약 2초)

  function css() {
    return 'position:fixed;right:8px;top:22%;z-index:50;min-width:172px;max-width:240px;padding:8px 10px;border-radius:12px;' +
      'background:rgba(28,24,20,.82);color:#f4e9d8;font:12px/1.4 system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35);white-space:pre;';
  }
  function build() {
    if (H.el) return;
    var d = document.createElement('div');
    d.id = 'perfhud'; d.setAttribute('role', 'region'); d.setAttribute('aria-label', 'Performance'); d.style.cssText = css();
    var t = document.createElement('div'); t.setAttribute('aria-live', 'off'); d.appendChild(t);
    var b = document.createElement('button');
    b.textContent = 'Record 10 s'; b.setAttribute('aria-label', 'Record performance for 10 seconds');
    b.style.cssText = 'margin-top:6px;min-height:36px;padding:0 14px;border:0;border-radius:18px;background:#e8c27a;color:#2a1f10;font:600 13px system-ui,sans-serif;';
    b.addEventListener('click', function (e) { e.stopPropagation(); startRec(); });
    d.appendChild(b);
    var bb = document.createElement('button');
    bb.textContent = '30 s bench'; bb.setAttribute('aria-label', 'Walk and turn automatically for 30 seconds to measure performance');
    bb.style.cssText = b.style.cssText + 'margin-left:6px;';
    bb.addEventListener('click', function (e) { e.stopPropagation(); startBench(); });
    d.appendChild(bb);
    H.bbtn = bb;
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
    return { tier: R ? R.tier : '?', mode: A ? A.qMode : '?', pr: rr ? +rr.getPixelRatio().toFixed(2) : 0, w: cw, h: ch, calls: info.calls, tris: info.triangles, room: A ? A.room : '?',
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
      return String((ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '?').replace(/\s+/g, ' ').slice(0, 60);
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
    var g = H.gpu.length ? 'GPU ' + avg(H.gpu).toFixed(1) + ' ms' : 'GPU wait (est.) ' + Math.max(0, avg(H.buf) - avg(H.js)).toFixed(1) + ' ms';
    H.txt.textContent = 'FPS ' + fps.toFixed(0) + ' (1% low ' + low.toFixed(0) + ')\n' +
      'frame ' + avg(H.buf).toFixed(1) + ' ms · JS ' + avg(H.js).toFixed(1) + ' ms\n' +
      'draw calls (JS) ' + avg(H.rd).toFixed(1) + ' ms\n' + g + '\n' +
      'resolution ' + s.w + '×' + s.h + ' (×' + s.pr + ')\n' +
      'tier ' + s.tier + (s.mode === 'auto' ? ' (auto)' : '') + '\n' +
      'draw ' + s.calls + ' · tris ' + (s.tris / 1000).toFixed(0) + 'k\n' +
      'worst frame (60 s) ' + worst.toFixed(0) + ' ms\n' +
      'textures ' + s.texMb.toFixed(0) + 'MB + targets ' + (H.rtMb || 0).toFixed(0) + 'MB (est.)\n' +
      (Pd ? 'window ' + Pd.slots + ' slots · 1k ' + Pd.stats.resident + ' · ' + Pd.stats.texMb + 'MB\n' : '') +
      'GPU ' + (s.gpu || '?');
    H.el.setAttribute('aria-label', 'Performance: ' + fps.toFixed(0) + ' fps, tier ' + s.tier);
  }
  function startRec() {
    if (H.rec) return;
    H.rec = { t0: performance.now(), f: [], js: [], tier0: H.App && H.App.R ? H.App.R.tier : '?' };
    H.btn.textContent = 'Recording…'; H.btn.disabled = true; H.out.textContent = 'Walk and look around normally for 10 seconds.';
  }
  function endRec() {
    var r = H.rec; H.rec = null;
    var s = state(), f = r.f, tot = 0, i;
    for (i = 0; i < f.length; i++) tot += f[i];
    var minFps = 1e9, acc = 0, n = 0;
    for (i = 0; i < f.length; i++) { acc += f[i]; n++; if (acc >= 1000) { minFps = Math.min(minFps, n * 1000 / acc); acc = 0; n = 0; } }
    if (minFps === 1e9) minFps = f.length ? f.length * 1000 / tot : 0;
    var text = '[3D room performance, 10 s]\n' +
      'scene ' + s.room + ' · tier ' + r.tier0 + (r.tier0 !== s.tier ? '→' + s.tier : '') + (s.mode === 'auto' ? ' (auto)' : '') + '\n' +
      'mean ' + (f.length * 1000 / Math.max(1, tot)).toFixed(1) + ' fps · min (1 s) ' + minFps.toFixed(1) + ' fps · 1% low ' + (1000 / Math.max(1, pct(f, 0.99))).toFixed(1) + ' fps\n' +
      'frame median ' + pct(f, 0.5).toFixed(1) + ' ms · 90% ' + pct(f, 0.9).toFixed(1) + ' ms · JS ' + avg(r.js).toFixed(1) + ' ms' + (H.gpu.length ? ' · GPU ' + avg(H.gpu).toFixed(1) + ' ms' : '') + '\n' +
      'resolution ' + s.w + '×' + s.h + ' (pixel ratio ' + s.pr + ') · draw ' + s.calls + ' · tris ' + s.tris + '\n' +
      'device ' + uaShort();
    H.out.textContent = text + '\n(copied)';
    H.btn.textContent = 'Record 10 s'; H.btn.disabled = false;
    try { if (root.RoomBridge) root.RoomBridge.post({ e: 'perfReport', text: text }); } catch (e) { /* ignore */ }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () {}); } catch (e) { /* ignore */ }
    H.lastReport = text;
  }
  // 걷기는 가상 손잡이(ctl.setJoystick)로 한다 — 실제 사용자 입력과 같은 길(충돌·발소리·아바타 걸음)을 탄다.
  function startBench() {
    var A = H.App;
    if (H.bench || !A || !A.api || !A.me || A.me.mode !== 'walk') { if (H.out) H.out.textContent = 'Start while standing (walk mode).'; return; }
    var path = (A.logic && A.logic.layout && A.logic.layout.benchPath) || [{ x: A.me.x, z: A.me.z - 3 }];
    H.bench = { t0: performance.now(), t: 0, f: [], js: [], calls: 0, tris: 0, phase: 0, tier0: A.R.tier, yaw0: A.ctl.yaw, texMax: 0, spikes50: 0, spikes100: 0, path: path, wi: 0, dir: 1 };
    H.bbtn.textContent = 'Benchmarking…'; H.bbtn.disabled = true; H.btn.disabled = true;
    H.out.textContent = 'Walking and turning automatically for 30 seconds. Do not touch the screen.';
  }
  function steer(B, A) {
    var p = B.path[B.wi], me = A.me, ctl = A.ctl;
    if (!p) { ctl.setJoystick(0, 0); return; }
    var dx = p.x - me.x, dz = p.z - me.z, d = Math.sqrt(dx * dx + dz * dz);
    if (d < 0.35) { B.wi += B.dir; return; }
    dx /= d; dz /= d;
    var cy = ctl.yaw, fx = -Math.sin(cy), fz = -Math.cos(cy), rx = Math.cos(cy), rz = -Math.sin(cy);
    ctl.setJoystick(dx * rx + dz * rz, dx * fx + dz * fz);
  }
  function benchFrame(ms, jsMs) {
    var B = H.bench, A = H.App, rr = A.R.renderer;
    B.f.push(ms); B.js.push(jsMs); B.t += ms / 1000;
    if (ms > 50) B.spikes50++; if (ms > 100) B.spikes100++;
    B.calls = Math.max(B.calls, rr.info.render.calls); B.tris = Math.max(B.tris, rr.info.render.triangles);
    var ctl = A.ctl;
    if (B.t < 12) {
      steer(B, A);
      ctl.yaw = A.me.yaw + Math.sin(B.t * 1.3) * 1.05; ctl.lastDragT = A.t;   // 걷는 동안 카메라를 ±60° 로 흔든다(회전 비용)
    } else if (B.t < 18) {
      if (B.phase === 0) { B.phase = 1; ctl.setJoystick(0, 0); B.yaw1 = ctl.yaw; }
      ctl.yaw = B.yaw1 + (B.t - 12) / 6 * Math.PI * 2; ctl.lastDragT = A.t;
    } else if (B.t < 30) {
      if (B.phase === 1) { B.phase = 2; B.dir = -1; B.wi = Math.min(B.wi, B.path.length - 1); }
      steer(B, A);
      ctl.yaw = A.me.yaw + Math.sin(B.t * 1.1) * 0.9; ctl.lastDragT = A.t;
    } else endBench();
  }
  function endBench() {
    var B = H.bench, A = H.App; H.bench = null;
    A.ctl.setJoystick(0, 0);
    var s = state(), f = B.f, tot = 0, i;
    for (i = 0; i < f.length; i++) tot += f[i];
    var text = '[3D room 30 s bench]\n' +
      'scene ' + s.room + ' · tier ' + B.tier0 + (B.tier0 !== s.tier ? '→' + s.tier : '') + (s.mode === 'auto' ? ' (auto)' : '') + '\n' +
      'mean ' + (f.length * 1000 / Math.max(1, tot)).toFixed(1) + ' fps · 1% low ' + (1000 / Math.max(1, pct(f, 0.99))).toFixed(1) + ' fps · worst ' + Math.max.apply(null, f.length ? f : [0]).toFixed(0) + ' ms\n' +
      'frame median ' + pct(f, 0.5).toFixed(1) + ' · 90% ' + pct(f, 0.9).toFixed(1) + ' · 99% ' + pct(f, 0.99).toFixed(1) + ' ms · JS ' + avg(B.js).toFixed(1) + ' ms' + (H.gpu.length ? ' · GPU ' + avg(H.gpu).toFixed(1) + ' ms' : '') + '\n' +
      'frames over 50 ms ' + B.spikes50 + ' · over 100 ms ' + B.spikes100 + ' (of ' + f.length + ')\n' +
      'resolution ' + s.w + '×' + s.h + ' (pixel ratio ' + s.pr + ') · max draw ' + B.calls + ' · max tris ' + B.tris + '\n' +
      'textures ' + texEstimate().toFixed(0) + 'MB + targets ' + (H.rtMb || 0).toFixed(0) + 'MB (est.) · GL textures ' + s.glTex + ' · shaders ' + s.progs + '\n' +
      'GPU ' + (s.gpu || gpuName()) + '\ndevice ' + uaShort();
    H.out.textContent = text + '\n(copied)';
    H.bbtn.textContent = '30 s bench'; H.bbtn.disabled = false; H.btn.disabled = false;
    try { if (root.RoomBridge) root.RoomBridge.post({ e: 'perfReport', text: text }); } catch (e) { /* ignore */ }
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
  root.RoomPerfHud = { set: set, frame: frame, bench: startBench, benching: function () { return !!H.bench; }, gpuBegin: function () { return H.on ? gpuBegin() : null; }, gpuEnd: gpuEnd, get on() { return H.on; }, _h: H, record: startRec, report: function () { return H.lastReport || null; } };
  try { if (/[?&]perfhud=1/.test(root.location.search)) document.addEventListener('DOMContentLoaded', function () { var t = setInterval(function () { if (root.__room && root.__room.R) { clearInterval(t); set(true, root.__room); } }, 200); }); } catch (e) { /* ignore */ }
})(typeof window !== 'undefined' ? window : this);
