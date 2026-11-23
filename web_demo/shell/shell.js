/* shell.js — 웹 데모 껍데기. 앱(Flutter)이 하던 일을 브라우저에서 한다: 장면 스크립트 불러오기(진행 막대) →
   FlutterChurch 채널로 장면 이벤트 받기 → window.ChurchAPI 로 장면 몰기(init · setJoystick · walkTo · sit · lightCandle · emote · setViewMode · setQuality …).
   assets/church 는 고치지 않고 그대로 쓴다. 둘러보기(자동 시연)는 tour.js. 페이지가 정한 설정은 window.DEMO({church, lang, scripts, captions}). */
(function (root) {
  'use strict';
  var D = root.DEMO, I = root.DemoI18N, doc = root.document;
  var lang = I.ui[D.lang] ? D.lang : 'en', L = I.ui[lang];
  var touch = false;
  try { touch = !!(root.matchMedia && root.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in root && (navigator.maxTouchPoints || 0) > 0); } catch (e) { touch = false; }
  if (/[?&]touch=1/.test(root.location.search)) touch = true;   // 시험용: 데스크톱에서 터치 배치 보기
  var quality = touch ? 'mid' : 'high';
  var qm = /[?&]q=(low|mid|high)\b/.exec(root.location.search);   // 점검용: ?q=low 로 화질을 정해 시작(느린 소프트웨어 렌더링에서 시험할 때)
  if (qm) quality = qm[1];
  var QUALS = ['low', 'mid', 'high'];
  var S = root.DemoShell = {
    lang: lang, L: L, touch: touch, church: D.church, ready: false, started: false, stations: null, near: { seat: null, candle: null, station: null },
    seated: false, seat: null, mode: 'start', tour: null, errors: [], quality: quality, viewMode: 'tp', sound: true, listeners: []
  };
  function $(id) { return doc.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tr(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o && o[k] !== undefined ? o[k] : m; }); }

  // 장면 안 한국어 글(이름표·아바타 세례명)은 한국어가 아닌 링크에서 번역하거나 숨긴다. assets/church 의 작은 고리 둘(markers.js · avatar.js)이 읽는다.
  if (lang !== 'ko') { root.ChurchLabelMap = I.labels[lang] || null; root.ChurchNoTags = true; }

  // ---- 장면에서 오는 이벤트(FlutterChurch 채널 대용). 스크립트보다 먼저 만들어 둔다 ----
  root.FlutterChurch = { postMessage: function (s) {
    var o; try { o = JSON.parse(s); } catch (e) { return; }
    if (!o || !o.e) return;
    if (o.e === 'pos' || o.e === 'perf' || o.e === 'hb' || o.e === 'life') { if (o.e === 'pos' && o.m) S.lastMove = Date.now(); fire(o); return; }
    onEvent(o); fire(o);
  } };
  function fire(o) {
    for (var i = S.listeners.length - 1; i >= 0; i--) { var l = S.listeners[i]; if (l.pred(o)) { S.listeners.splice(i, 1); l.res(o); } }
  }
  function onEvent(o) {
    switch (o.e) {
      case 'ready': S.sceneReady = true; break;
      case 'stations': S.stations = o; updateActs(); break;
      case 'near': S.near = { seat: o.seat || null, candle: o.candle === undefined ? null : o.candle, station: o.station || null }; break;
      case 'seated': S.seated = true; S.seat = o.seat; api('setPraying', { on: true, ms: 0 }); api('setRosary', { on: true }); updateActs(); break;
      case 'stood': S.seated = false; S.seat = null; api('setPraying', { on: false, ms: 0 }); api('setRosary', { on: false }); updateActs(); break;
      case 'walkDone': onWalkDone(o); break;
      case 'walkFail': if (!S.tour) toast(L.walkFail); S.pendingAfter = null; break;
      case 'walkCancel': S.pendingAfter = null; break;
      case 'firstFrame': S.firstFrame = true; hideBuilding(); break;
      case 'jsError': S.errors.push(o); if (root.console) (o.kind === 'stall' ? console.warn : console.error)('[church] ' + o.kind + ': ' + o.msg); break;   // 「stall」은 성을 짓는 동안 한 프레임이 길어졌다는 감시 기록(오류 아님)
      default: break;
    }
  }
  // 조건이 맞는 이벤트를 기다린다. 시간이 지나면 null.
  S.waitEvent = function (pred, ms) {
    return new Promise(function (res) {
      var rec = { pred: pred, res: res }, t = setTimeout(function () { var i = S.listeners.indexOf(rec); if (i >= 0) S.listeners.splice(i, 1); res(null); }, ms || 30000);
      rec.res = function (v) { clearTimeout(t); res(v); };
      S.listeners.push(rec);
    });
  };
  function api(m, o) {
    var A = root.ChurchAPI;
    if (A && A[m]) { try { A[m](o || {}); } catch (e) { if (root.console) console.error('[demo] api ' + m, e); } }
  }
  S.api = api;

  // ---- 화면 만들기 ----
  var name = (I.names[D.church] || {})[lang] || D.church, nameKo = (I.names[D.church] || {}).ko || D.church;
  var approver = (I.approver[I.churchApprover[D.church] || 'any'] || I.approver.any)[lang];
  var note = tr(D.church === 'basic' ? L.noteFict : L.noteReal, { name: name, approver: approver });
  doc.documentElement.lang = lang;
  doc.title = name + ' — Rosarium';
  var ui = doc.createElement('div');
  ui.id = 'demoRoot';
  ui.innerHTML =
    '<div id="start"><div class="card">' +
      '<p class="kicker">Rosarium</p><h1>' + esc(name) + '</h1>' +
      '<p class="tag">' + esc(L.tagline) + '</p>' +
      '<p class="note">' + esc(note) + '</p>' +
      '<div class="btns"><button id="btnTour" class="big primary" disabled>' + esc(L.tour) + '</button>' +
      '<button id="btnFree" class="big" disabled>' + esc(L.free) + '</button></div>' +
      '<div class="load"><div id="bar"><div id="barFill"></div></div><div id="loadTxt" role="status"></div></div>' +
      '<p class="foot">' + esc(L.foot) + '</p>' +
    '</div></div>' +
    '<div id="building" hidden><div class="spin"></div><div>' + esc(L.building) + '</div></div>' +
    '<div id="top" hidden><div class="nm">' + esc(name) + '</div><button id="btnSound" class="chip">♪ ' + esc(L.sound) + '</button><button id="btnQual" class="chip"></button></div>' +
    '<div id="cap" role="status" aria-live="polite"></div>' +
    '<div id="toast" role="status"></div>' +
    '<div id="hud" hidden><div id="acts">' +
      '<button class="act" id="aAltar">' + esc(L.altar) + '</button><button class="act" id="aCandle">' + esc(L.candle) + '</button>' +
      '<button class="act" id="aSit">' + esc(L.sit) + '</button><button class="act" id="aCross" hidden>' + esc(L.cross) + '</button>' +
      '<button class="act" id="aView">' + esc(L.view) + '</button></div>' +
      '<div id="help">' + esc(touch ? L.helpTouch : L.help) + '</div></div>' +
    '<div id="tourbar" hidden><button class="act" id="aStop">' + esc(L.stopTour) + '</button><div id="tourhint">' + esc(touch ? L.tourHintTouch : L.tourHint) + '</div></div>' +
    '<div id="joy" hidden><div id="joyKnob"></div></div>';
  doc.body.appendChild(ui);
  if (touch) doc.body.classList.add('touch');

  // WebGL 이 되는 브라우저인가(장면 canvas 와 따로 만든 임시 canvas 로 본다)
  function hasWebgl() { try { var c = doc.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
  S.webgl = hasWebgl();

  // ---- 스크립트 불러오기(순서 유지, 크기 가중 진행 막대) ----
  var total = 0, done = 0;
  D.scripts.forEach(function (s) { total += s[1]; });
  function progress() {
    var p = Math.min(100, Math.round(done / Math.max(1, total) * 100));
    $('barFill').style.width = p + '%';
    $('loadTxt').textContent = tr(L.loading, { p: p });
    S.progress = p;
  }
  function loadAll() {
    progress();
    var left = D.scripts.length, failed = false;
    D.scripts.forEach(function (s) {
      var el = doc.createElement('script');
      el.src = s[0]; el.async = false;
      el.onload = function () { done += s[1]; progress(); if (--left === 0 && !failed) loaded(); };
      el.onerror = function () { if (!failed) { failed = true; $('loadTxt').textContent = L.loadFail; } };
      doc.head.appendChild(el);
    });
  }
  function loaded() {
    S.ready = true;
    $('loadTxt').textContent = S.webgl ? L.ready : L.noWebgl;
    if (S.webgl) { $('btnTour').disabled = false; $('btnFree').disabled = false; }
    $('barFill').style.transition = 'none'; $('barFill').style.width = '100%';
    api('setInput', { ext: true });   // 이동 손잡이는 셸이 그린다(웹 장면의 자체 손잡이는 끈다). 끌기=시점, 휠·두 손가락=확대는 장면이 그대로.
  }

  // ---- 입장 ----
  function showBuilding() { $('building').hidden = false; }
  function hideBuilding() { $('building').hidden = true; }
  function enter(thenTour) {
    if (!S.ready || S.started || !S.webgl) return;
    S.started = true;
    $('start').hidden = true; showBuilding();
    // 「성당을 짓는 중」을 먼저 그린 뒤 init(월드를 짓는 동안 화면이 멈춘다)
    requestAnimationFrame(function () { setTimeout(function () {
      api('init', { church: D.church, hour: 11, ambient: S.sound, solo: true, quality: S.quality });
      api('setInput', { ext: true });
      S.mode = 'free';
      $('top').hidden = false; $('hud').hidden = false; $('joy').hidden = !touch;
      updateQual(); updateActs();
      var fin = false;
      var go = function () { if (fin) return; fin = true; hideBuilding(); if (thenTour && root.DemoShell.runTour) root.DemoShell.runTour(); };
      S.waitEvent(function (o) { return o.e === 'firstFrame'; }, 60000).then(go);
      setTimeout(function () { if (!S.firstFrame) hideBuilding(); }, 60000);
      setTimeout(function () { var h = $('help'); if (h) h.style.opacity = '0'; }, 14000);
    }, 30); });
  }
  $('btnTour').addEventListener('click', function () { enter(true); });
  $('btnFree').addEventListener('click', function () { enter(false); });

  // ---- 위쪽 단추 ----
  function updateQual() { $('btnQual').textContent = '⚙ ' + L.quality + ': ' + L['q_' + S.quality]; $('btnSound').classList.toggle('off', !S.sound); }
  $('btnQual').addEventListener('click', function () {
    S.quality = QUALS[(QUALS.indexOf(S.quality) + 1) % QUALS.length];
    api('setQuality', { quality: S.quality }); updateQual(); this.blur(); userInput();
  });
  $('btnSound').addEventListener('click', function () { S.sound = !S.sound; api('setAmbient', { on: S.sound }); updateQual(); this.blur(); });

  // ---- 아래 단추 ----
  function hasFont() { return !!(S.stations && S.stations.font > 0); }
  function updateActs() {
    $('aCross').hidden = !hasFont();   // 성호 단추는 성수대가 있는 모형(성 베드로·아시시)에서만 — 앱과 같은 규칙
    $('aCandle').hidden = !(S.stations && S.stations.candle > 0);
    $('aSit').textContent = S.seated ? L.stand : L.sit;
    $('aAltar').disabled = S.seated;
  }
  S.updateActs = updateActs;
  var VIEWS = ['tp', 'fp'], VIEW_LABEL = { tp: 'viewTp', fp: 'viewFp' };   // 앱과 같이 뒤에서 보기 ↔ 1인칭(자동 1인칭 없앰, docs/church/CAMERA_MODES.md)
  S.setView = function (m) { S.viewMode = m; api('setViewMode', { mode: m }); $('aView').textContent = L.view + ': ' + L[VIEW_LABEL[m]]; };
  $('aView').addEventListener('click', function () { userInput(); S.setView(VIEWS[(VIEWS.indexOf(S.viewMode) + 1) % VIEWS.length]); this.blur(); });
  $('aAltar').addEventListener('click', function () { userInput(); api('walkTo', { kind: 'altar' }); this.blur(); });
  $('aCross').addEventListener('click', function () { userInput(); S.pendingAfter = 'cross'; api('walkTo', { kind: 'font' }); this.blur(); });
  $('aCandle').addEventListener('click', function () { userInput(); S.pendingAfter = 'candle'; api('walkTo', { kind: 'candle' }); this.blur(); });
  $('aSit').addEventListener('click', function () {
    userInput(); this.blur();
    if (S.seated) { api('stand'); return; }
    S.pendingAfter = 'sit'; api('walkTo', { kind: 'seat' });
  });
  $('aStop').addEventListener('click', function () { userInput(); });
  // 자동 걷기가 끝나면 하려던 일을 잇는다(앱의 walkDone 처리와 같다)
  function onWalkDone(o) {
    var what = S.pendingAfter; S.pendingAfter = null;
    if (S.tour) return;   // 둘러보기는 tour.js 가 직접 기다린다
    if (what === 'cross' && o.kind === 'font') api('emote', { e: 1 });
    else if (what === 'candle' && o.kind === 'candle') S.lightHere(false, null);
    else if (what === 'sit' && o.kind === 'seat') api('sit', { seat: o.seat || undefined });
  }

  // ---- 초 켜기: 닿는 빈 자리에서 정해진 지향 8가지 중 하나(글 입력 칸 없음) ----
  S.lit = {};
  // auto: 지향 번호를 미리 정해 잠깐 보여 준 뒤 켠다(둘러보기). 아니면 사용자가 고른다.
  S.lightHere = function (auto, idx) {
    return new Promise(function (res) {
      var slot = S.near.candle;
      if (slot === null || slot === undefined) { res(false); return; }
      if (S.lit[slot]) { toast(L.candleFull); res(false); return; }
      var box = doc.createElement('div'); box.id = 'intent';
      var items = I.intentions[lang];
      box.innerHTML = '<div class="box" role="dialog" aria-modal="true"><h2>' + esc(L.intentionTitle) + '</h2><p>' + esc(L.intentionNote) + '</p>' +
        items.map(function (t, i) { return '<button data-i="' + i + '">' + esc(t) + '</button>'; }).join('') + '</div>';
      doc.body.appendChild(box);
      S.intentBox = box;
      function finish(i) {
        if (!box.parentNode) return;
        box.parentNode.removeChild(box); S.intentBox = null;
        if (i === null) { res(false); return; }
        S.lit[slot] = 1;
        api('lightCandle', { slot: slot, until: Date.now() + 24 * 3600 * 1000, intention: i, color: 0, mine: true });
        res(true);
      }
      S.closeIntent = function () { finish(null); };
      Array.prototype.forEach.call(box.querySelectorAll('button'), function (b) {
        b.addEventListener('click', function () { finish(+b.getAttribute('data-i')); });
      });
      if (auto) {
        var b0 = box.querySelector('button[data-i="' + idx + '"]'); if (b0) b0.classList.add('pick');
        setTimeout(function () { finish(idx); }, 2600);
      }
    });
  };

  // ---- 자막 · 알림 ----
  var capT = 0, toastT = 0;
  S.caption = function (txt, ms) {
    var c = $('cap'); clearTimeout(capT);
    if (!txt) { c.classList.remove('on'); return; }
    c.textContent = txt; c.classList.add('on');
    if (ms) capT = setTimeout(function () { c.classList.remove('on'); }, ms);
  };
  function toast(txt) { var t = $('toast'); t.textContent = txt; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 3200); }
  S.toast = toast;

  // ---- 이동 손잡이(터치) ----
  (function () {
    var joy = $('joy'), knob = $('joyKnob'), pid = null, R = 48;
    function set(e) {
      var r = joy.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), l = Math.hypot(dx, dy);
      if (l > R) { dx = dx / l * R; dy = dy / l * R; l = R; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      var live = l / R >= 0.12;
      api('setJoystick', { x: live ? dx / R : 0, y: live ? -dy / R : 0 });
    }
    joy.addEventListener('pointerdown', function (e) { if (pid !== null) return; userInput(); pid = e.pointerId; try { joy.setPointerCapture(pid); } catch (x) { /* ignore */ } set(e); e.preventDefault(); });
    joy.addEventListener('pointermove', function (e) { if (e.pointerId === pid) set(e); });
    function up(e) { if (e.pointerId !== pid) return; pid = null; knob.style.transform = ''; api('setJoystick', { x: 0, y: 0 }); }
    joy.addEventListener('pointerup', up); joy.addEventListener('pointercancel', up);
  })();

  // ---- 사용자 입력은 둘러보기를 끊는다 ----
  function userInput() { if (S.tour && S.tour.stop) S.tour.stop(); }
  S.userInput = userInput;
  ['keydown', 'wheel'].forEach(function (t) { root.addEventListener(t, function () { if (S.tour && S.tour.armed) userInput(); }, true); });
  root.addEventListener('pointerdown', function (e) {
    if (!(S.tour && S.tour.armed)) return;
    userInput();
  }, true);

  if (!S.webgl) $('loadTxt').textContent = L.noWebgl;
  loadAll();
})(window);
