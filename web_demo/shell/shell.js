/* shell.js — 웹 데모 껍데기. 앱(Flutter)이 하던 일을 브라우저에서 한다: 장면 스크립트 불러오기(진행 막대) →
   FlutterChurch 채널로 장면 이벤트 받기 → window.ChurchAPI 로 장면 몰기(init · setJoystick · walkTo · sit · lightCandle · emote · setViewMode · setQuality …).
   assets/church 는 고치지 않고 그대로 쓴다. 둘러보기(자동 시연)는 tour.js. 페이지가 정한 설정은 window.DEMO({church, lang, scripts, captions}). */
(function (root) {
  'use strict';
  var D = root.DEMO, I = root.DemoI18N, doc = root.document;
  var lang = I.pickLang(root.location.search, D.lang), L = I.ui[lang];   // 주소의 ?lang=(올바른 값만)이 페이지 기본 언어보다 먼저
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
  // 장면은 셸이 「둘러보기」·「직접 걸어 보기」를 누를 때 init 으로 짓는다. 장면 혼자 1.8초 뒤 기본 성당을 짓는 미리보기 동작(main.js boot)은 끈다 —
  // 켜져 있으면 시작 화면 뒤에서 basic 을 짓느라 기기가 멎고, 한 번뿐인 firstFrame 을 먼저 써 버려 입장 뒤 「짓는 중」이 끝나지 않았다(2026-11-23 재현).
  root.ChurchNoAutoStart = true;

  // ---- 장면에서 오는 이벤트(FlutterChurch 채널 대용). 스크립트보다 먼저 만들어 둔다 ----
  root.FlutterChurch = { postMessage: function (s) {
    var o; try { o = JSON.parse(s); } catch (e) { return; }
    if (!o || !o.e) return;
    if (o.e === 'pos' || o.e === 'perf' || o.e === 'hb' || o.e === 'life') {
      if (o.e === 'pos' && o.m) S.lastMove = Date.now();
      if (o.e === 'hb') { S.hb = o; if (S.building && S.ffBefore && S.drawnAtInit !== null && (o.f || 0) > S.drawnAtInit) built('hb'); }   // 입장 전에 이미 첫 프레임을 보낸 장면: 입장 뒤 그린 프레임 수가 늘면 다 지은 것
      fire(o); return;
    }
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
      case 'firstFrame': S.firstFrame = true; if (S.building) built('firstFrame'); break;
      case 'jsError':
        S.errors.push(o); if (root.console) (o.kind === 'stall' ? console.warn : console.error)('[church] ' + o.kind + ': ' + o.msg);   // 「stall」은 성을 짓는 동안 한 프레임이 길어졌다는 감시 기록(오류 아님)
        if (S.building && (o.kind === 'error' || o.kind === 'rejection' || o.kind === 'api')) showStuck('fail', o.kind + ': ' + o.msg);   // 짓는 동안 잡히지 않은 오류: 알리고 계속 기다린다(첫 프레임이 오면 걷힌다)
        break;
      case 'gl': S.glLost = !!o.lost; if (o.lost && S.started) showStuck('gl', 'context lost'); else if (!o.lost && S.stuck === 'gl') hideStuck(); break;
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
      '<div class="langrow"><label for="langSel">' + esc(L.langLabel) + '</label><select id="langSel" aria-label="' + esc(L.langLabel) + '">' +
        I.langs.map(function (l) { return '<option value="' + l + '" lang="' + l + '"' + (l === lang ? ' selected' : '') + '>' + esc(I.langNames[l]) + '</option>'; }).join('') + '</select></div>' +
      '<p class="kicker">Rosarium</p><h1>' + esc(name) + '</h1>' +
      '<p class="tag">' + esc(L.tagline) + '</p>' +
      '<p class="note">' + esc(note) + '</p>' +
      '<div class="btns"><button id="btnTour" class="big primary" disabled>' + esc(L.tour) + '</button>' +
      '<button id="btnFree" class="big" disabled>' + esc(L.free) + '</button></div>' +
      '<div class="load"><div id="bar"><div id="barFill"></div></div><div id="loadTxt" role="status"></div></div>' +
      '<p class="foot">' + esc(L.foot) + '</p>' +
    '</div></div>' +
    '<div id="building" hidden><div class="spin"></div><div>' + esc(L.building) + '</div></div>' +
    '<div id="stuck" hidden role="alertdialog" aria-live="assertive"><div class="box"><p id="stuckMsg"></p><button id="btnRetry" class="big primary">' + esc(L.retry) + '</button><p id="stuckWhy"></p></div></div>' +
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
    // 스크립트가 다 왔어도 실행 중에 깨졌으면(onload 는 그래도 온다) 장면 API 가 없다 — 「짓는 중」에 들어가지 않게 여기서 알린다
    if (!root.ChurchAPI || typeof root.ChurchAPI.init !== 'function') { $('loadTxt').textContent = L.loadFail; if (root.console) console.error('[demo] ChurchAPI missing after load'); return; }
    S.ready = true;
    $('loadTxt').textContent = S.webgl ? L.ready : L.noWebgl;
    if (S.webgl) { $('btnTour').disabled = false; $('btnFree').disabled = false; }
    $('barFill').style.transition = 'none'; $('barFill').style.width = '100%';
    api('setInput', { ext: true });   // 이동 손잡이는 셸이 그린다(웹 장면의 자체 손잡이는 끈다). 끌기=시점, 휠·두 손가락=확대는 장면이 그대로.
  }

  // ---- 입장 ----
  // 「짓는 중」은 장면의 첫 프레임(firstFrame)이 와야 걷힌다. 오지 않으면 끝없이 돌지 않게:
  //   · BUILD_SLOW_MS 가 지나면 「평소보다 오래 걸린다 + 다시 시도」(그 뒤에 첫 프레임이 오면 저절로 걷히고 이어 간다)
  //   · init 이 예외 · 장면이 시작하지 못함(WebGL 문맥을 못 만듦) · 짓는 중 WebGL 문맥 잃음 · 잡히지 않은 오류 → 바로 같은 안내
  // 30초: 소프트웨어 렌더링 + CPU 4배 감속 + 화면 2.6배에서 첫 프레임 약 21초(2026-11-23 측정). 폰 GPU 는 이보다 빠르다.
  var BUILD_SLOW_MS = 30000, slm = /[?&]slowms=(\d+)/.exec(root.location.search);   // 시험용: ?slowms= 로 기다리는 시간을 바꾼다
  if (slm) BUILD_SLOW_MS = +slm[1];
  S.BUILD_SLOW_MS = BUILD_SLOW_MS;
  S.building = false; S.stuck = null; S.drawnAtInit = null;
  function showBuilding() { $('building').hidden = false; }
  function hideBuilding() { $('building').hidden = true; }
  function showStuck(kind, why) {
    S.stuck = kind; S.stuckWhy = why || '';
    $('stuckMsg').textContent = kind === 'slow' ? L.buildSlow : kind === 'gl' ? L.glLost : L.buildFail;
    $('stuckWhy').textContent = why ? String(why).slice(0, 160) : '';
    $('stuck').hidden = false;
    if (root.console) console.warn('[demo] stuck ' + kind + (why ? ': ' + why : ''));
  }
  function hideStuck() { S.stuck = null; $('stuck').hidden = true; }
  S.showStuck = showStuck; S.hideStuck = hideStuck;
  $('btnRetry').addEventListener('click', function () { root.location.reload(); });
  var onBuilt = null, slowT = 0;
  function built(why) {
    if (!S.building) return;
    S.building = false; S.builtBy = why; S.buildMs = Date.now() - S.buildT0; clearTimeout(slowT);
    hideBuilding();
    if (S.stuck && S.stuck !== 'gl') hideStuck();
    if (S.glLost) { showStuck('gl', 'context lost'); onBuilt = null; return; }   // 문맥을 잃은 채로는 둘러보기를 시작하지 않는다
    var f = onBuilt; onBuilt = null; if (f) f();
  }
  function enter(thenTour) {
    if (!S.ready || S.started || !S.webgl) return;
    S.started = true; S.building = true; S.buildT0 = Date.now();
    S.ffBefore = !!S.firstFrame;   // 장면이 입장 전에 이미 그렸는가(그러면 firstFrame 이 다시 오지 않는다 → 심장 박동의 그린 프레임 수로 본다)
    $('start').hidden = true; showBuilding();
    onBuilt = function () { if (thenTour && root.DemoShell.runTour) root.DemoShell.runTour(); };
    slowT = setTimeout(function () { if (S.building && !S.stuck) showStuck('slow', ''); }, BUILD_SLOW_MS);
    // 「성당을 짓는 중」을 먼저 그린 뒤 init(월드를 짓는 동안 화면이 멈춘다)
    requestAnimationFrame(function () { setTimeout(function () {
      var A = root.ChurchAPI, st0 = S.stations;
      if (!A || typeof A.init !== 'function') { showStuck('fail', 'ChurchAPI missing'); return; }
      try { A.init({ church: D.church, hour: 11, ambient: S.sound, solo: true, quality: S.quality }); }
      catch (e) { if (root.console) console.error('[demo] api init', e); showStuck('fail', 'init: ' + ((e && e.message) || e)); return; }
      // init 은 동기로 월드를 짓고 그 안에서 stations 를 보낸다. 오지 않았으면 장면이 시작하지 못한 것(WebGL 문맥을 못 만듦 등)
      if (!S.stations || (S.stations === st0 && !S.ffBefore) || (S.stations.church && S.stations.church !== D.church)) { showStuck('fail', 'scene did not start'); return; }
      S.drawnAtInit = S.hb ? (S.hb.f || 0) : 0;
      api('setInput', { ext: true });
      S.mode = 'free';
      $('top').hidden = false; $('hud').hidden = false; $('joy').hidden = !touch;
      updateQual(); updateActs();
      setTimeout(function () { var h = $('help'); if (h) h.style.opacity = '0'; }, 14000);
    }, 30); });
  }
  // 언어 바꾸기: 같은 쪽을 ?lang=xx 로 다시 연다(replace 라서 뒤로 가기가 되풀이되지 않는다). 장면 이름표·자막 처리는 시작할 때만 정해지므로 다시 열어야 한다.
  $('langSel').addEventListener('change', function () {
    var v = this.value; if (I.langs.indexOf(v) < 0 || v === lang) return;
    var q = root.location.search.replace(/([?&])lang=[^&#]*&?/, '$1').replace(/[?&]$/, '');
    root.location.replace(root.location.pathname + (q ? q + '&' : '?') + 'lang=' + v + root.location.hash);
  });
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
