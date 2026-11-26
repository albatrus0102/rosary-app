/* bridge.js — 호스트(단일 HTML 앱·WebView 셸·iframe 부모) <-> 3D 장면 연결. 호스트 등 특정 틀에 기대지 않는다.

   ■ 들어오는 호출(호스트 → 장면): 셋 중 아무 길이나 쓴다. 장면이 준비되기 전에 온 호출은 줄에 쌓았다가 준비되면 차례로 처리한다.
     1) 전역 함수:      window.Room3D.setHour({hour: 21})         (같은 페이지·WebView evaluateJavascript)
     2) postMessage:   frame.contentWindow.postMessage({room3d: 'call', fn: 'setHour', args: {hour: 21}}, '*')   (iframe 으로 넣었을 때)
     3) 문자열 JSON:    window.Room3D.call('{"fn":"setHour","args":{"hour":21}}')   (네이티브 셸이 문자열만 넘길 때)
     메서드: init setSeats setMe setHour setTimerText setPanel setGarden setSkin pause resume dispose
             setPeers sit stand setJoystick setQuality setPerfHud setSteps setPoseRate setViewInset tapAt (README 「브리지 API」)

   ■ 나가는 이벤트(장면 → 호스트): {e:'이름', ...}. 아래 길로 모두 보낸다(있는 것만).
     1) window.Room3DHost.postMessage(JSON 문자열)   — 네이티브 셸이 심은 객체(Android addJavascriptInterface 등)
     2) window.parent.postMessage({room3d: 'event', ...이벤트}, '*')   — iframe 안일 때
     3) window 의 'room3d' CustomEvent(detail = 이벤트)  +  Room3D.on(fn) 으로 건 함수   — 같은 페이지일 때
     이벤트: ready firstFrame seatTap{i} sat{i} stood{i} perf{fps,tier} tierDown{tier,fps} glFail{msg} contextLost contextRestored
             myPose{x,z,yaw,state,seat,t} tap{id} error{kind,msg} hb{f,st} perfReport{text} */
(function (root) {
  'use strict';
  var queue = [], app = null, listeners = [];
  root.__roomEvents = root.__roomEvents || [];

  function post(o) {
    var s;
    try { s = JSON.stringify(o); } catch (e) { return; }
    var H = root.Room3DHost;
    if (H && typeof H.postMessage === 'function') { try { H.postMessage(s); } catch (e) { /* ignore */ } }
    try { if (root.parent && root.parent !== root && root.parent.postMessage) root.parent.postMessage(Object.assign({ room3d: 'event' }, o), '*'); } catch (e) { /* ignore */ }
    for (var i = 0; i < listeners.length; i++) { try { listeners[i](o); } catch (e) { /* 듣는 쪽 오류는 무시 */ } }
    try { if (typeof CustomEvent === 'function' && root.dispatchEvent) root.dispatchEvent(new CustomEvent('room3d', { detail: o })); } catch (e) { /* ignore */ }
    var ev = root.__roomEvents; ev.push(o); if (ev.length > 600) ev.splice(0, ev.length - 500);   // 시험·진단용 최근 기록
    if (root.console && root.__roomLog && o.e !== 'myPose' && o.e !== 'hb' && o.e !== 'perf') console.log('[room->host] ' + s);
  }
  // 처리되지 않은 오류를 {e:'error'} 로 알린다(한 페이지에서 30건까지, 같은 문구는 한 번)
  var errSeen = {}, errN = 0;
  function jsError(kind, msg, src, line) {
    try {
      msg = String(msg == null ? '' : msg).slice(0, 300);
      var key = kind + '|' + msg + '|' + (line | 0);
      if (errSeen[key] || errN >= 30) return;
      errSeen[key] = 1; errN++;
      post({ e: 'error', kind: kind, msg: msg, src: String(src || '').split(/[\/\\]/).pop().split('?')[0].slice(0, 60), line: line | 0 });
    } catch (e) { /* 기록이 또 오류를 만들지 않는다 */ }
  }
  if (typeof root.addEventListener === 'function') {
    root.addEventListener('error', function (ev) { jsError('error', (ev && ev.message) || (ev && ev.error && ev.error.message), ev && ev.filename, ev && ev.lineno); });
    root.addEventListener('unhandledrejection', function (ev) { var r = ev && ev.reason; jsError('rejection', (r && r.message) || r, '', 0); });
  }
  function arg(a) {
    if (typeof a === 'string') { try { return JSON.parse(a); } catch (e) { return {}; } }
    if (typeof a === 'number' || Array.isArray(a)) return { value: a };
    return a || {};
  }

  var METHODS = ['init', 'setSeats', 'setMe', 'setHour', 'setTimerText', 'setPanel', 'setGarden', 'setSkin', 'pause', 'resume', 'dispose',
    'setPeers', 'sit', 'stand', 'setJoystick', 'setQuality', 'setPerfHud', 'setSteps', 'setPoseRate', 'setViewInset', 'tapAt', 'orderCoffee', 'setMyCup'];
  var NO_QUEUE = { setJoystick: 1, tapAt: 1 };   // 오래되면 의미 없는 입력은 쌓지 않는다
  var API = {};
  function invoke(m, a) {
    if (!app) { if (!NO_QUEUE[m] && queue.length < 400) queue.push([m, a]); return; }
    if (typeof app.api[m] !== 'function') { jsError('api', 'unknown method ' + m, '', 0); return; }
    try { app.api[m](a); } catch (e) { if (root.console) console.error('[room] ' + m + ' failed', e); jsError('api', m + ': ' + (e && e.message), '', 0); }
  }
  METHODS.forEach(function (m) { API[m] = function (a) { invoke(m, arg(a)); }; });
  // 문자열 JSON 한 줄로 부르기: {"fn":"setHour","args":{...}}
  API.call = function (s) { var o = arg(s); if (o && typeof o.fn === 'string') invoke(o.fn, arg(o.args)); };
  API.on = function (fn) { if (typeof fn === 'function') listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; };
  API._methods = METHODS;
  API._bind = function (a) {
    app = a;
    Object.keys(a.api || {}).forEach(function (m) { if (!API[m] && m.charAt(0) !== '_') { METHODS.push(m); API[m] = function (x) { invoke(m, arg(x)); }; } });
    var q = queue; queue = [];
    q.forEach(function (c) { invoke(c[0], c[1]); });
  };
  // iframe 부모가 보내는 호출
  if (typeof root.addEventListener === 'function') {
    root.addEventListener('message', function (ev) {
      var d = ev && ev.data;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return; } }
      if (!d || d.room3d !== 'call' || typeof d.fn !== 'string' || METHODS.indexOf(d.fn) < 0) return;
      invoke(d.fn, arg(d.args));
    });
  }
  root.Room3D = API;
  root.RoomBridge = { post: post, jsError: jsError };
})(typeof window !== 'undefined' ? window : this);
