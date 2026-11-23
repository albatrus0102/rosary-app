/* cross.js — 성당 안 십자가의 길(앱 lib/church: ChurchCrossChip · _openCross → lib/ui/stations_sheet.dart 순례 모드를 웹으로 옮긴 것).
   14처 판·근접(crossNear)·판 누르면 그 앞으로 걷기는 장면(assets/church/way_cross.js)이 그대로 한다. 여기서는:
   - 판 앞에 서면 칩 「십자가의 길 n처 · 명칭 — 묵상하기 ›」 → 묵상 시트
   - 판 앞에 걸어와 닿으면(walkDone kind 'cross') 그 처의 시트가 저절로 열린다
   - 시트: 그림(그 성당 판과 같은 연작 — 장면의 cross_pack 그림을 다시 쓴다) · 제n처 · 명칭 · 성경 근거 · (1처) 시작 기도 · 공식 기도문(기호 ┼ ◎ ○) ·
     기호 범례 · 출처 한 줄 · 접힌 「묵상」(앱이 덧붙인 글) · 그림 출처와 대체 성화 안내 · 닫기 | 다음 처로(닫고 다음 판 앞까지 걷는다) · 14처 뒤 「마치며」
   - 「십자가의 길」 단추(앱 '가기' 시트의 십자가의 길과 같다): 1처 판 앞으로 걷는다
   한국어 말고는 확인된 십자가의 길 본문이 없다: 그림과 처 번호만 보이고 기도문 자리에 「공식 본문을 받는 대로 넣습니다」. 소리 없음.
   자료 = stations.js(앱과 같은 data/*.json 에서 만든 파일; 출시 빌드에서 숨긴 연작은 없다). */
(function (root) {
  'use strict';
  var S = root.DemoShell, X = root.DemoStations, doc = root.document;
  if (!S || !X) return;
  var L = S.L, ko = S.lang === 'ko', LAST = 14;
  function $(id) { return doc.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tr(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o && o[k] !== undefined ? o[k] : m; }); }
  var seriesId = X.assign[S.church] || X.def, series = X.series[seriesId] || X.series[X.def];
  var C = S.cross = { near: null, open: false, n: 1, closing: false };

  // ---- 그림: 장면이 판에 쓰는 연작 아틀라스(7×2 칸)의 한 칸 ----
  function pack() {
    var P = root.ChurchCrossPacks && root.ChurchCrossPacks[seriesId];
    if (!P && seriesId === X.def) P = root.ChurchCrossPack;
    return P || null;
  }
  var loading = null;
  function ensurePack() {
    if (pack()) return Promise.resolve(pack());
    if (loading) return loading;
    loading = new Promise(function (res) {
      var s = doc.createElement('script'); s.src = series.pack;
      s.onload = function () { res(pack()); }; s.onerror = function () { res(null); };
      doc.head.appendChild(s);
    });
    return loading;
  }
  function paintArt(el, n) {
    var P = pack();
    if (!P) { ensurePack().then(function (p) { if (p && C.open && C.n === n) paintArt(el, n); }); return; }
    var i = n - 1, col = i % P.cols, row = Math.floor(i / P.cols);
    el.style.backgroundImage = 'url("' + P.src + '")';
    el.style.backgroundSize = (P.cols * 100) + '% ' + (P.rows * 100) + '%';
    el.style.backgroundPosition = (P.cols > 1 ? col / (P.cols - 1) * 100 : 0) + '% ' + (P.rows > 1 ? row / (P.rows - 1) * 100 : 0) + '%';
    el.style.aspectRatio = P.cellW + ' / ' + P.cellH;
  }

  // ---- 칩 · 단추 ----
  var chip = doc.createElement('button');
  chip.type = 'button'; chip.id = 'crossChip'; chip.className = 'chip crosschip'; chip.hidden = true;
  $('demoRoot').appendChild(chip);
  var act = doc.createElement('button');
  act.type = 'button'; act.className = 'act'; act.id = 'aWay'; act.textContent = L.sWay; act.hidden = true;
  $('acts').insertBefore(act, $('aView'));
  function stationName(n) { var st = X.stations[n - 1]; return ko ? tr(L.sChip, { n: n, t: st.title }) : tr(L.sChip, { n: st.roman }); }
  function updateChip() {
    var show = C.near && !C.open && !S.seated && !S.tour && S.mode === 'free';
    chip.hidden = !show;
    if (show) chip.innerHTML = '<span class="ct">' + esc(stationName(C.near)) + '</span><span class="cm">' + esc(L.sMeditate) + ' ›</span>';
    act.hidden = !(S.stations && S.stations.cross >= LAST);
  }
  C.update = updateChip;
  chip.addEventListener('click', function () { S.userInput(); if (C.near) C.openSheet(C.near); this.blur(); });
  act.addEventListener('click', function () { S.userInput(); S.api('setJoystick', { x: 0, y: 0 }); S.api('walkTo', { kind: 'cross', index: 0 }); this.blur(); });

  // ---- 시트 ----
  var box = doc.createElement('div');
  box.id = 'crossSheet'; box.hidden = true;
  box.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="csHead">' +
    '<div class="grab"></div><div class="shead"><span id="csHead">' + esc(L.sTitle) + '</span><span id="csProg"></span>' +
    '<button type="button" id="csClose" class="icon" aria-label="' + esc(L.sClose) + '">✕</button></div>' +
    '<div id="csBody" class="sbody"></div>' +
    '<div class="sact"><button type="button" id="csLeft" class="btn text"></button><button type="button" id="csRight" class="btn fill"></button></div></div>';
  doc.body.appendChild(box);

  function part(p) {   // 기호 하나 + 그 기호가 이끄는 줄들(지시문은 작게)
    var m = X.markers[p.role] || { g: '', o: '' };
    return '<div class="spart"><span class="mk" title="' + esc(m.o) + '">' + esc(m.g) + '</span><div>' +
      p.lines.map(function (l) { return typeof l === 'string' ? '<p>' + esc(l) + '</p>' : '<p class="rub">' + esc(l.rubric) + '</p>'; }).join('') + '</div></div>';
  }
  function artNote() {
    var credit = ko ? series.ko : tr(L.sArtCredit, { artist: series.artist, year: series.year, photo: series.photo ? ' · ' + series.photo : '', license: series.license });
    return '<div class="sart"><p>' + esc(L.sArt + ' ' + credit) + '</p><p class="disc">' + esc(ko ? X.disclosure : L.sDisclosure) + '</p></div>';
  }
  function body() {
    var st = X.stations[C.n - 1], h = '';
    if (C.closing) {
      h += '<div class="sclose"><div class="sun">☼</div><h3>' + esc(L.sClosingTitle) + '</h3>';
      h += ko ? '<p>' + esc(X.closing) + '</p><p class="small">' + esc(L.sClosingNote) + '</p>' : '<p class="small">' + esc(L.rPending) + '</p>';
      return h + '</div>';
    }
    h += '<div class="sfig"><div id="csArt" class="sartimg" role="img" aria-label="' + esc(tr(L.sImgAlt, { label: tr(L.sLabel, { n: ko ? C.n : st.roman }) })) + '"></div></div>';
    h += '<p class="slabel">' + esc(tr(L.sLabel, { n: ko ? C.n : st.roman })) + '</p>';
    if (ko) {
      h += '<h3 class="stitle">' + esc(st.title) + '</h3><p class="refs">' + esc(st.tradition ? st.refs : '성경 ' + st.refs) + '</p>';
      if (C.n === 1) h += '<h4>' + esc(L.sOpening) + '</h4><p class="rub">' + esc(X.openingRubric) + '</p>' + part(X.opening);
      h += '<h4>' + esc(L.sPrayer) + '</h4><p class="rub">' + esc(X.toStation.rubric.replace('{n}', C.n)) + '</p>' + part(X.toStation);
      h += '<p class="ann"><b>' + esc(tr(L.sLabel, { n: C.n })) + ' </b>' + esc(st.announce) + '</p>';
      X.verse.forEach(function (v) { h += part(v); });
      h += part({ role: 'cantor', lines: st.prayer });
      X.after.forEach(function (r) { h += '<p class="rub">' + esc(r) + '</p>'; });
      h += '<p class="legend">' + ['leader', 'all', 'cantor'].map(function (k) { return '<span><b>' + esc(X.markers[k].g) + '</b> ' + esc(X.markers[k].o) + '</span>'; }).join('') + '</p>';
      h += '<p class="small">' + esc(X.credit) + '</p>';
      h += '<details class="smed"><summary><b>' + esc(L.sMeditation) + '</b><span>' + esc(L.sMedNote) + '</span></summary><p>' + esc(st.meditation) + '</p><p class="pet">' + esc(st.petition) + '</p></details>';
    } else {
      h += '<h4>' + esc(L.sPrayer) + '</h4><p class="pending">' + esc(L.rPending) + '</p>';
    }
    return h + artNote();
  }
  function render() {
    $('csProg').textContent = C.closing ? L.sEnd : C.n + ' / ' + LAST;
    $('csBody').innerHTML = body(); $('csBody').scrollTop = 0;
    if (!C.closing) paintArt($('csArt'), C.n);
    $('csLeft').textContent = C.closing ? tr(L.sBackTo, { n: ko ? 14 : 'XIV' }) : L.sClose;
    $('csRight').textContent = C.closing ? L.sFinish : C.n >= LAST ? L.sEnding : L.sNextStation;
  }
  C.openSheet = function (n) {
    if (C.open || S.seated) return;
    C.n = Math.max(1, Math.min(LAST, n)); C.closing = false; C.open = true;
    box.hidden = false; updateChip(); render();
    setTimeout(function () { $('csRight').focus({ preventScroll: true }); }, 0);
  };
  function close() { C.open = false; box.hidden = true; updateChip(); }
  C.close = close;
  $('csClose').addEventListener('click', close);
  box.addEventListener('click', function (e) { if (e.target === box) close(); });   // 바깥(어두운 곳)을 누르면 닫힌다
  doc.addEventListener('keydown', function (e) { if (C.open && e.key === 'Escape') close(); });
  $('csLeft').addEventListener('click', function () { if (C.closing) { C.closing = false; render(); } else close(); });
  $('csRight').addEventListener('click', function () {
    if (C.closing) { close(); S.toast(L.sDone); return; }   // 순례 마치기
    if (C.n >= LAST) { C.closing = true; render(); return; }
    var n = C.n; close();
    S.api('setJoystick', { x: 0, y: 0 }); S.api('walkTo', { kind: 'cross', index: n });   // 다음 처 판 앞까지 걷는다(index 는 0부터)
  });
  // 시트를 누르는 동안 장면·둘러보기로 입력이 새지 않게
  ['pointerdown', 'wheel', 'keydown'].forEach(function (t) { box.addEventListener(t, function (e) { e.stopPropagation(); }); });

  // ---- 장면 이벤트(shell.js 가 부른다) ----
  S.onCrossNear = function (n) { C.near = n || null; updateChip(); };
  S.onCrossArrive = function (index) { if (!S.tour && !S.seated) C.openSheet((index || 0) + 1); };
  if (S.stations) updateChip();
})(window);
