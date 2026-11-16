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
  function arg(a) {
    if (typeof a === 'string') { try { return JSON.parse(a); } catch (e) { return {}; } }
    return a || {};
  }

  var METHODS = ['init', 'setJoystick', 'sit', 'stand', 'setPraying', 'setPrayerPosture', 'setRosary', 'setAvatar', 'setPeers', 'peerJoin', 'peerLeave', 'peerSnap',
    'peerSeat', 'peerStand', 'peerPraying', 'peerEmote', 'setCandles', 'lightCandle', 'setAmbient', 'setHour', 'setSolo', 'setQuality',
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
        try { app.api[m](a); } catch (e) { if (root.console) console.error('[church] ' + m + ' failed', e); }
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
      API[m] = function (x) { try { app.api[m](arg(x)); } catch (e) { if (root.console) console.error('[church] ' + m + ' failed', e); } };
    });
    var q = queue; queue = [];
    q.forEach(function (c) { API[c[0]](c[1]); });
  };
  root.ChurchAPI = API;
  root.ChurchBridge = { post: post };
})(typeof window !== 'undefined' ? window : this);
