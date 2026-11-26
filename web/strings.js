/* strings.js — 장면이 화면에 쓰는 글자(간판·쪽지·태블릿·캘린더·좌석 이름·표식)를 호스트가 준다. 엔진 JS 에는 한글 글자를 두지 않는다(시험: test/strings.test.mjs).
   - 기본값은 중립 영어. 호스트는 setStrings({키: 글자}) 로 바꾼다(브리지). 바뀌면 on(fn) 으로 건 함수가 불린다(판 다시 그리기·표식 다시 만들기).
   - 키: signTitle · signSub · boardNotes(배열) · tabletTitle · seatLabels(배열, 좌석 순) · seatPrefix(좌석 이름이 없을 때 앞말) · seatFree(빈 좌석 표식) ·
     monthNames(배열 12, 캘린더 머리) · weekdays(배열 7, 일요일부터). */
(function (root) {
  'use strict';
  var DEFAULTS = {
    signTitle: 'Reading Room', signSub: 'SINCE 2026',
    boardNotes: ['3 books this week', '10 review cards', '30 min today', 'Pick: essays', 'Want to read'],
    tabletTitle: 'Now reading',
    seatLabels: [],
    seatPrefix: 'Seat ', seatFree: 'Free seat',
    monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  };
  var cur = {}, fns = [];
  function clean(k, v) {
    var d = DEFAULTS[k];
    if (Array.isArray(d)) return Array.isArray(v) ? v.map(function (x) { return String(x == null ? '' : x).slice(0, 60); }) : null;
    return typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, 80) : null;
  }
  var S = {
    DEFAULTS: DEFAULTS,
    get: function (k) { return cur[k] !== undefined ? cur[k] : DEFAULTS[k]; },
    // 좌석 i 의 이름(호스트 이름 → 장면 layout 의 영어 이름 → 앞말 + 번호)
    seatLabel: function (i, layoutLabels) { var a = S.get('seatLabels'); return (a && a[i]) || (layoutLabels && layoutLabels[i]) || (S.get('seatPrefix') + (i + 1)); },
    set: function (o) {
      if (!o || typeof o !== 'object') return [];
      var changed = [];
      Object.keys(o).forEach(function (k) {
        if (!(k in DEFAULTS)) return;
        if (o[k] === null) { if (k in cur) { delete cur[k]; changed.push(k); } return; }
        var v = clean(k, o[k]); if (v === null) return;
        cur[k] = v; changed.push(k);
      });
      if (changed.length) fns.slice().forEach(function (f) { try { f(changed); } catch (e) { /* 듣는 쪽 오류는 무시 */ } });
      return changed;
    },
    reset: function () { cur = {}; },
    on: function (fn) { if (typeof fn === 'function') fns.push(fn); return function () { var i = fns.indexOf(fn); if (i >= 0) fns.splice(i, 1); }; }
  };
  root.RoomStrings = S;
  if (typeof module === 'object' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : this);
