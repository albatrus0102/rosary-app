/* rosary.js — 앉은 자리에서 바치는 묵주기도(앱 lib/church: ChurchSeatedBar → ChurchRosaryPanel 을 웹으로 옮긴 것).
   앉으면 아래에 「앉아 있어요」 줄(자세 앉아서|무릎 꿇고 · 「묵주기도 시작」 · 「일어나기」). 시작하면 묵주 패널:
   머리줄(묵주기도 중 · 기도 시간 · ⋮ 잠깐 쉬기/끝내기) · 왼쪽 묵주알(현재 알 가운데) · 제목과 n/10 · 「신비 · n단」 · 그 단의 신비 ·
   기도문(펼치기/접기) · 이전 | 다음 · 아래 줄(자세 · 일어나기). 순서는 앱 buildRosarySequence 와 같다(73단계; 공식 본문을 아직 못 받은 기도는 자리·이름만 두고 「받는 대로 넣습니다」).
   신비는 오늘 요일로(앱 mysterySetForWeekday). 미리 보기용으로 「다음 단으로」를 더 둔다(앱에는 없다 — 다섯 단을 다 바치지 않고 짜임을 보게).
   기도문은 글로만 보여 준다(어느 언어든 소리로 읽지 않는다). 기도문·신비 = prayers.js(출처에서 글자 그대로 뽑은 파일). */
(function (root) {
  'use strict';
  var S = root.DemoShell, I = root.DemoI18N, P = root.DemoPrayers, doc = root.document;
  if (!S || !P) return;
  var L = S.L, lang = S.lang, D = P[lang] || P.en, SETS = ['joyful', 'luminous', 'sorrowful', 'glorious'];
  function $(id) { return doc.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tr(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o && o[k] !== undefined ? o[k] : m; }); }

  // ---- 순서(앱 buildRosarySequence): 성호경 · 사도신경 · 주님의 기도 · 성모송 3 · 영광송 · [단마다 주님의 기도 · 성모송 10 · 영광송 · 구원을 비는 기도] · 마침 성호경 ----
  function buildSteps() {
    var st = [{ k: 'sign' }, { k: 'creed' }, { k: 'our' }];
    for (var n = 1; n <= 3; n++) st.push({ k: 'hail', n: n, of: 3 });
    st.push({ k: 'glory' });
    for (var d = 1; d <= 5; d++) {
      st.push({ k: 'our', d: d });
      for (var h = 1; h <= 10; h++) st.push({ k: 'hail', d: d, n: h, of: 10 });
      st.push({ k: 'glory', d: d });
      if (D.prayers.fatima) st.push({ k: 'fatima', d: d });   // 확인된 본문이 없는 언어도 자리는 남긴다(이름 + 안내, prayers.js pending)
    }
    st.push({ k: 'closing' });
    return st;
  }
  function todaySet() { var w = P.weekday[new Date().getDay()]; return SETS[w === undefined || w === null ? 0 : w]; }

  var R = S.rosary = { steps: buildSteps(), i: 0, set: todaySet(), active: false, paused: false, finished: false, secs: 0, open: true, posture: 'sit', started: false };
  R.setName = function () { return D.sets[R.set].name; };
  function stepTitle(s) { var p = D.prayers[s.k === 'closing' ? 'sign' : s.k]; return s.k === 'closing' ? tr(L.rClosingTitle, { t: p.t }) : p.t; }
  function stepText(s) { var p = D.prayers[s.k === 'closing' ? 'sign' : s.k]; return p.pending ? null : p.x; }
  function where(s) { return s.k === 'closing' ? L.rClosing : s.d ? tr(L.rDecade, { n: s.d }) : L.rIntro; }
  function mystery(s) { if (!s.d || s.k === 'closing') return null; var m = D.sets[R.set].m[s.d - 1]; return m.med || m.t; }   // ko 는 묵상 문구, 다른 언어는 신비 이름
  function bead(s) { return s.k === 'hail' ? 'bs' : s.k === 'our' ? 'bb' : (s.k === 'glory' || s.k === 'fatima') ? 'bl' : 'bc'; }

  // ---- 화면 ----
  function seg(id) {
    return '<div class="seg" role="group" id="' + id + '"><button type="button" data-p="sit">' + esc(L.rSit) + '</button><button type="button" data-p="kneel">' + esc(L.rKneel) + '</button></div>';
  }
  var box = doc.createElement('div');
  box.id = 'rosaryRoot';
  box.innerHTML =
    '<div id="seatbar" class="plaque" hidden role="region" aria-label="' + esc(L.rTitle) + '">' +
      '<p class="sbnote">' + esc(L.rSeatedNote) + '</p><p class="sbtoday" id="sbToday"></p>' + seg('sbSeg') +
      '<div class="row"><button type="button" id="sbStart" class="btn fill">' + esc(L.rStart) + '</button><button type="button" id="sbStand" class="btn outline">' + esc(L.stand) + '</button></div>' +
    '</div>' +
    '<div id="rosary" class="plaque" hidden role="region" aria-label="' + esc(L.rTitle) + '">' +
      '<div class="rhead"><span id="rState"></span><span id="rTime" class="rtime">00:00</span>' +
        '<button type="button" id="rMenu" class="icon" aria-haspopup="true" aria-expanded="false" aria-label="' + esc(L.rMore) + '">⋮</button>' +
        '<div id="rMenuBox" hidden><button type="button" id="rPause"></button><button type="button" id="rEnd">' + esc(L.rEnd) + '</button></div></div>' +
      '<p id="rDone" hidden></p>' +
      '<div id="rMain"><div class="rbody"><div id="rBeads" aria-hidden="true"></div><div class="info">' +
        '<div id="rStep" class="rstep"></div><div id="rLine" class="rline"></div><div id="rMyst" class="rmyst"></div>' +
        '<div class="tools"><button type="button" id="rToggle" class="btn text"></button><button type="button" id="rSkip" class="btn text">' + esc(L.rNextDecade) + '</button></div>' +
        '<div class="nav"><button type="button" id="rPrev" class="btn outline">' + esc(L.rPrev) + '</button><button type="button" id="rNext" class="btn fill">' + esc(L.rNext) + '</button></div>' +
      '</div></div>' +
      '<div id="rText" class="rtext"><div id="rPrayer" class="rprayer"></div><p class="rsrc">' + esc(L.rTextOnly) + ' ' + esc(L.rSource) + '</p></div></div>' +
      '<div class="rfoot">' + seg('rSeg') + '<button type="button" id="rStand" class="btn tonal">' + esc(L.stand) + '</button></div>' +
    '</div>';
  doc.getElementById('demoRoot').appendChild(box);

  function inset() {
    // 패널이 덮는 만큼 장면을 위로(앱 setViewInset): 앉은 아바타가 패널 위에 보이게
    var el = !$('rosary').hidden ? $('rosary') : !$('seatbar').hidden ? $('seatbar') : null, f = 0;
    if (el) { var h = root.innerHeight || 1; f = Math.max(0, Math.min(0.6, (h - el.getBoundingClientRect().top) / h)); }
    if (Math.abs(f - (R.sentInset || 0)) < 0.02 && !(f === 0 && R.sentInset)) return;
    R.sentInset = f; S.api('setViewInset', { bottom: f });
  }
  function praying(on) { S.api('setPraying', { on: on, ms: SETS.indexOf(R.set) }); S.api('setRosary', { on: on }); }
  var tick = 0;
  function timer() {
    clearInterval(tick);
    if (R.active && !R.paused && !R.finished) tick = setInterval(function () { R.secs++; $('rTime').textContent = mmss(R.secs); }, 1000);
  }
  function mmss(t) { var m = Math.floor(t / 60), s = t % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }

  function renderBeads() {
    var html = '', c = R.i;
    for (var k = -2; k <= 2; k++) {
      var j = c + k; if (j < 0 || j >= R.steps.length) continue;
      html += '<i class="b ' + bead(R.steps[j]) + (k === 0 ? ' cur' : '') + '" style="top:' + (50 + k * 21) + '%"></i>';
    }
    var s = R.steps[c], dots = '';
    for (var d = 1; d <= 5; d++) dots += '<i class="' + (s.d && d < s.d || s.k === 'closing' ? 'done' : s.d === d ? 'now' : '') + '"></i>';
    $('rBeads').innerHTML = '<span class="chain"></span>' + html + '<span class="dec">' + dots + '</span>';
  }
  function render() {
    var s = R.steps[R.i];
    $('rState').textContent = R.finished ? L.rDone : R.paused ? L.rPausedState : L.rOn;
    $('rTime').textContent = mmss(R.secs);
    $('rMenu').hidden = R.finished;
    $('rPause').textContent = R.paused ? L.rResume : L.rPause;
    $('rDone').hidden = !R.finished; $('rMain').hidden = R.finished;
    $('rDone').textContent = tr(L.rFinished, { name: R.setName() });
    $('rStand').className = 'btn ' + (R.finished ? 'fill' : 'tonal');
    if (!R.finished) {
      var cnt = s.k === 'hail' ? ' <b>' + s.n + '/' + s.of + '</b>' : '';
      $('rStep').innerHTML = esc(stepTitle(s)) + cnt;
      $('rLine').textContent = R.setName() + ' · ' + where(s);
      var my = mystery(s); $('rMyst').textContent = my || ''; $('rMyst').hidden = !my;
      var tx = stepText(s);
      $('rPrayer').textContent = tx === null ? L.rPending : tx;   // 공식 본문을 아직 받지 못한 기도: 자리와 이름만, 본문은 지어내지 않는다
      $('rPrayer').classList.toggle('pending', tx === null);
      $('rText').hidden = !R.open;
      $('rToggle').textContent = (R.open ? '▾ ' : '▴ ') + (R.open ? L.rTextClose : L.rTextOpen);
      $('rToggle').setAttribute('aria-expanded', R.open ? 'true' : 'false');
      $('rPrev').disabled = R.i === 0;
      $('rSkip').hidden = s.k === 'closing';
      $('rText').scrollTop = 0;
      renderBeads();
    }
    ['sbSeg', 'rSeg'].forEach(function (id) {
      Array.prototype.forEach.call($(id).querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-p') === R.posture ? 'true' : 'false'); });
    });
    requestAnimationFrame(inset);
  }
  function show() {
    var on = S.seated && R.active, sb = S.seated && !R.active;
    $('rosary').hidden = !on; $('seatbar').hidden = !sb;
    if (sb) $('sbToday').textContent = tr(L.rToday, { name: R.setName() });
    doc.body.classList.toggle('rosary-on', on || sb);
    if (on) render(); else requestAnimationFrame(inset);
  }
  R.show = show;

  // ---- 동작 ----
  R.start = function () {   // 앉은 줄의 「묵주기도 시작」: 하던 것이 있으면 이어서(앱 _startRosaryFromSitBar)
    if (!S.seated || R.active) return;
    if (R.finished) { R.i = 0; R.finished = false; R.secs = 0; }
    R.active = true; R.paused = false; R.started = true;
    praying(true); timer(); show();
  };
  function go(i) {
    if (R.finished || !R.active) return;
    if (i >= R.steps.length) { R.finished = true; praying(false); timer(); render(); return; }   // 마지막 기도 다음 = 마침
    R.i = Math.max(0, i); render();
  }
  R.next = function () { go(R.i + 1); };
  R.back = function () { if (R.i > 0) go(R.i - 1); };
  R.nextDecade = function () {   // 미리 보기용: 다음 단의 주님의 기도로(마지막 단이면 마침 성호경)
    var s = R.steps[R.i], want = (s.d || 0) + 1;
    for (var j = R.i + 1; j < R.steps.length; j++) { var t = R.steps[j]; if ((t.d === want && t.k === 'our') || t.k === 'closing') { go(j); return; } }
  };
  R.togglePause = function () {
    if (!R.active || R.finished) return;
    R.paused = !R.paused; praying(!R.paused); timer(); render();
  };
  R.setPosture = function (p) {
    if (p !== 'sit' && p !== 'kneel') return;
    R.posture = p; S.api('setPrayerPosture', { posture: p }); if (R.active) render(); else show();
  };
  R.stand = function () { S.api('stand'); };
  R.end = function () {   // 끝내기: 진행을 지우고 일어난다(앱 _endPrayer)
    R.i = 0; R.secs = 0; R.finished = false; R.ended = true;
    S.api('stand'); S.toast(L.rDone);
  };
  R.toggleText = function () { R.open = !R.open; render(); };
  // 장면 이벤트(shell.js 가 부른다)
  S.onSeated = function () {
    if (R.posture === 'kneel') S.api('setPrayerPosture', { posture: 'kneel' });   // 고른 자세는 앉은 뒤에 적용(앱과 같다)
    show();
  };
  S.onStood = function () {
    if (R.active) { praying(false); }
    R.active = false; R.paused = false; timer(); closeMenu();
    if (R.finished || R.ended) { R.i = 0; R.secs = 0; R.finished = false; R.ended = false; }
    show();
  };

  function closeMenu() { $('rMenuBox').hidden = true; $('rMenu').setAttribute('aria-expanded', 'false'); }
  function on(id, f) { $(id).addEventListener('click', function (e) { S.userInput(); f(e); this.blur(); }); }
  on('sbStart', R.start); on('sbStand', R.stand); on('rStand', function () { closeMenu(); R.stand(); });
  on('rNext', R.next); on('rPrev', R.back); on('rSkip', R.nextDecade); on('rToggle', R.toggleText);
  on('rMenu', function () { var o = $('rMenuBox').hidden; $('rMenuBox').hidden = !o; $('rMenu').setAttribute('aria-expanded', o ? 'true' : 'false'); });
  on('rPause', function () { closeMenu(); R.togglePause(); });
  on('rEnd', function () { closeMenu(); R.end(); });
  ['sbSeg', 'rSeg'].forEach(function (id) {
    Array.prototype.forEach.call($(id).querySelectorAll('button'), function (b) { b.addEventListener('click', function () { S.userInput(); R.setPosture(b.getAttribute('data-p')); b.blur(); }); });
  });
  root.addEventListener('resize', function () { requestAnimationFrame(inset); });
})(window);
