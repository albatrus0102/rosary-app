/* bridge.js — window.ChurchAPI (Flutter -> 웹) 와 FlutterChurch 채널 (웹 -> Flutter). SPEC §3 + v2/v3 + §22(창 감상). */
(function (root) {
  'use strict';
  var queue = [], app = null;
  root.__churchEvents = root.__churchEvents || [];

  function post(o) {
    var s;
    try { s = JSON.stringify(o); } catch (e) { return; }
    var ch = root.FlutterChurch;
    if (ch && typeof ch.postMessage === 'function') {
      try { ch.postMessage(s); } catch (e) { /* ignore */ }
    } else {
      root.__churchEvents.push(o);
      if (root.console && o.e !== 'pos' && o.e !== 'perf') console.log('[church->flutter] ' + s);
    }
  }
  // 오류 기록(로사리움 「오류 기록 보내기」, lib/diag/diag_sources.dart DiagJs): 처리되지 않은 오류·거부된 Promise·
  // API 메서드 실패를 {e:'jsError'} 로 Flutter 에 넘긴다. 한 페이지에서 30건까지, 같은 문구는 한 번. 파일은 이름만.
  var errSeen = {}, errN = 0;
  function jsError(kind, msg, src, line, col, stack) {
    try {
      msg = String(msg == null ? '' : msg).slice(0, 300);
      var key = kind + '|' + msg + '|' + (line | 0);
      if (errSeen[key] || errN >= 30) return;
      errSeen[key] = 1; errN++;
      post({ e: 'jsError', kind: kind, msg: msg, src: String(src || '').split(/[\/\\]/).pop().split('?')[0].slice(0, 60),
        line: line | 0, col: col | 0, stack: String(stack || '').slice(0, 1500) });
    } catch (e) { /* 기록이 또 오류를 만들지 않는다 */ }
  }
  if (typeof root.addEventListener === 'function') {
    root.addEventListener('error', function (ev) {
      var er = ev && ev.error;
      jsError('error', (ev && ev.message) || (er && er.message), ev && ev.filename, ev && ev.lineno, ev && ev.colno, er && er.stack);
    });
    root.addEventListener('unhandledrejection', function (ev) {
      var r = ev && ev.reason;
      jsError('rejection', (r && r.message) || r, '', 0, 0, r && r.stack);
    });
  }
  // bridge.js 앞 스크립트의 오류(index.html 첫 스크립트가 모아 둔 것).
  if (root.__churchErrBuf && root.__churchErrBuf.length) {
    root.__churchErrBuf.forEach(function (b) { jsError(b[0], b[1], b[2], b[3], b[4], b[5]); });
  }
  root.__churchErrBuf = null;
  function arg(a) {
    if (typeof a === 'string') { try { return JSON.parse(a); } catch (e) { return {}; } }
    return a || {};
  }

  var METHODS = ['init', 'setJoystick', 'sit', 'stand', 'setPraying', 'setPrayerPosture', 'setRosary', 'setAvatar', 'setPeers', 'peerJoin', 'peerLeave', 'peerSnap',
    'peerSeat', 'peerStand', 'peerPraying', 'peerEmote', 'setCandles', 'lightCandle', 'setAmbient', 'setSteps', 'setHour', 'setSolo', 'setQuality',
    'emote', 'setSeatTaken', 'setChurch', 'walkTo', 'cancelWalk', 'tapAt',
    'viewWindow', 'endView', 'setViewLight', 'setViewTier', 'resetView',   // G1 창 감상(SPEC §22)
    'pause', 'resume', 'getState', 'restore',   // 보이지 않는 동안 일시정지·상태 복원
    'setLiturgy',   // 전례 시기 장식(SPEC §33)
    'setViewInset',   // 아래 패널(성당 묵주 패널)만큼 장면을 위로(T-81)
    // 앱 입력 연동(앱 손잡이 ext·손잡이 원 stick·앱이 읽은 시점 look/dx/dy·확대 k·터치 기록 trace), 성능 표시, 카메라 설정.
    // 이 셋이 빠져 있어 기기에서는 window.ChurchAPI.setInput 이 없었고, Flutter 의 호출(churchApiScript)이 조용히 버려졌다(멀티터치 시점 고장의 원인).
    'setInput', 'setPerfHud', 'setCamera'];
  var NO_QUEUE = { setJoystick: 1, tapAt: 1, cancelWalk: 1 };   // 오래되면 의미 없는 입력은 쌓지 않는다
  var API = {};
  METHODS.forEach(function (m) {
    API[m] = function (a) {
      a = arg(a);
      if (app) {
        try { app.api[m](a); } catch (e) { if (root.console) console.error('[church] ' + m + ' failed', e); jsError('api', m + ': ' + (e && e.message), '', 0, 0, e && e.stack); }
      } else if (!NO_QUEUE[m] && queue.length < 400) queue.push([m, a]);
    };
  });
  API._methods = METHODS;
  API._bind = function (a) {
    app = a;
    // 목록에 없는 api 메서드도 내보낸다(새 메서드를 여기 적는 것을 잊어도 조용히 버려지지 않게).
    Object.keys(a.api || {}).forEach(function (m) {
      if (API[m] || m.charAt(0) === '_') return;
      METHODS.push(m);
      API[m] = function (x) { try { app.api[m](arg(x)); } catch (e) { if (root.console) console.error('[church] ' + m + ' failed', e); jsError('api', m + ': ' + (e && e.message), '', 0, 0, e && e.stack); } };
    });
    var q = queue; queue = [];
    q.forEach(function (c) { API[c[0]](c[1]); });
  };
  root.ChurchAPI = API;
  root.ChurchBridge = { post: post, jsError: jsError };
})(typeof window !== 'undefined' ? window : this);
