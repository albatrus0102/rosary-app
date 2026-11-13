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

  var METHODS = ['init', 'setJoystick', 'sit', 'stand', 'setPraying', 'setPrayerPosture', 'setAvatar', 'setPeers', 'peerJoin', 'peerLeave', 'peerSnap',
    'peerSeat', 'peerStand', 'peerPraying', 'peerEmote', 'setCandles', 'lightCandle', 'setAmbient', 'setHour', 'setSolo', 'setQuality',
    'emote', 'setSeatTaken', 'setChurch', 'walkTo', 'cancelWalk', 'tapAt',
    'viewWindow', 'endView', 'setViewLight', 'setViewTier', 'resetView',   // G1 창 감상(SPEC §22)
    'pause', 'resume', 'getState', 'restore'];   // 보이지 않는 동안 일시정지·상태 복원
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
    var q = queue; queue = [];
    q.forEach(function (c) { API[c[0]](c[1]); });
  };
  root.ChurchAPI = API;
  root.ChurchBridge = { post: post };
})(typeof window !== 'undefined' ? window : this);
