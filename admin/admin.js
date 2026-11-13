/* 로사리움 관리자 대시보드 — 빌드 없는 정적 페이지.
   supabase-js(anon key) + 관리자 로그인 세션으로 집계 RPC 만 호출한다. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var nf = new Intl.NumberFormat('ko-KR');
  var state = { days: 30, client: null, data: {}, tab: 'analytics' };

  var MYSTERY = [
    { key: 'joyful', label: '환희', css: '--c1' },
    { key: 'luminous', label: '빛', css: '--c2' },
    { key: 'sorrowful', label: '고통', css: '--c3' },
    { key: 'glorious', label: '영광', css: '--c4' },
  ];
  var EVENT_LABELS = {
    app_open: '앱 열기', login_success: '로그인 성공', consent_change: '동의 변경',
    prayer_start: '기도 시작', decade_complete: '단 완료', prayer_finish: '기도 종료',
    rosary_style_change: '묵주 모양 변경', mode_change: '모드 변경', leader_voice_change: '선창 음성 변경',
    text_scale_change: '글자 크기 변경', setting_change: '설정 변경', stats_open: '통계 열기',
    church_pick: '성당 선택', church_enter: '성당 입장', church_exit: '성당 퇴장', church_sit: '착석',
    church_candle: '초 봉헌', avatar_save: '아바타 저장',
  };
  var SCREEN_LABELS = {
    home: '홈', prayer: '기도', stats: '통계', settings: '설정', rosary_styles: '묵주 모양',
    church_select: '성당 선택', church: '성당', account: '계정',
  };
  var KIND_LABELS = {
    usage: '화면·기능 사용 분석', sync: '기도 기록 동기화', church: '성당 이용 기록', diagnostics: '오류·기기 정보',
  };
  var PLATFORM_LABELS = { android: '안드로이드', ios: 'iOS', unknown: '알 수 없음' };

  // ---------- DOM / SVG helpers
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === 'class') e.className = attrs[k]; else if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function s(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in (attrs || {})) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function show(id, on) { $(id).hidden = !on; }
  function fmt(n) { return n == null ? '–' : nf.format(Number(n)); }
  function pct(r) { return r == null ? '–' : (Number(r) * 100).toFixed(r >= 0.1 || r === 0 ? 0 : 1) + '%'; }
  function shortDay(d) { return d.slice(5).replace('-', '/'); }
  function dur(sec) {
    sec = Math.round(Number(sec) || 0);
    if (sec < 60) return sec + '초';
    var m = Math.round(sec / 60);
    if (m < 60) return m + '분';
    return Math.floor(m / 60) + '시간 ' + (m % 60) + '분';
  }
  function cssVar(n) { return 'var(' + n + ')'; }

  function setState(el, kind, msg) {
    el.removeAttribute('data-state');
    clear(el);
    el.appendChild(h('div', { class: 'state' + (kind === 'err' ? ' err' : ''), text: msg }));
  }
  function ready(el) { el.removeAttribute('data-state'); clear(el); }

  // ---------- tooltip
  var tip = $('tip');
  function showTip(evt, text) {
    tip.textContent = text; tip.hidden = false;
    var x = evt.clientX + 12, y = evt.clientY + 14;
    var w = tip.offsetWidth;
    if (x + w > window.innerWidth - 8) x = evt.clientX - w - 12;
    tip.style.left = Math.max(8, x) + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { tip.hidden = true; }

  // ---------- charts
  function niceMax(v) {
    if (v <= 4) return 4;
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var m = v / p;
    var n = m <= 1 ? 1 : m <= 2 ? 2 : m <= 4 ? 4 : m <= 8 ? 8 : 10;
    return n * p;
  }
  function chartWidth(el) { return Math.max(260, Math.floor(el.clientWidth || el.parentNode.clientWidth || 320)); }

  // 공통 축 (y 격자 4칸, x 눈금 일부)
  function axes(svg, W, H, m, max, labels) {
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    for (var i = 0; i <= 4; i++) {
      var y = m.t + ih - (ih * i) / 4;
      svg.appendChild(s('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, class: i === 0 ? 'axis' : 'grid' }));
      svg.appendChild(s('text', { x: m.l - 8, y: y + 4, 'text-anchor': 'end' }, fmt(Math.round((max * i) / 4 * 10) / 10)));
    }
    var n = labels.length;
    var step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 64))));
    labels.forEach(function (lab, i) {
      if (i % step !== 0 && i !== n - 1) return;
      if (i === n - 1 && i % step !== 0 && (n - 1) % step < step / 2 && n > 2) return;
      var x = n === 1 ? m.l + iw / 2 : m.l + (iw * i) / (n - 1);
      svg.appendChild(s('text', { x: x, y: H - 8, 'text-anchor': 'middle' }, lab));
    });
  }

  function lineChart(el, rows, opt) {
    // rows: [{label, value, tip}]
    ready(el);
    var W = chartWidth(el), H = 230, m = { l: 44, r: 14, t: 12, b: 28 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var max = niceMax(Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1])));
    var svg = s('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opt.aria });
    axes(svg, W, H, m, max, rows.map(function (r) { return r.label; }));
    var n = rows.length;
    var X = function (i) { return n === 1 ? m.l + iw / 2 : m.l + (iw * i) / (n - 1); };
    var Y = function (v) { return m.t + ih - (ih * v) / max; };
    var d = rows.map(function (r, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(r.value).toFixed(1); }).join(' ');
    svg.appendChild(s('path', { d: d + ' L' + X(n - 1).toFixed(1) + ' ' + (m.t + ih) + ' L' + X(0).toFixed(1) + ' ' + (m.t + ih) + ' Z', fill: 'var(--accent)', opacity: '0.12' }));
    svg.appendChild(s('path', { d: d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    if (n <= 45) rows.forEach(function (r, i) { svg.appendChild(s('circle', { cx: X(i), cy: Y(r.value), r: 3, fill: 'var(--accent)' })); });
    var guide = s('line', { y1: m.t, y2: m.t + ih, stroke: 'var(--muted)', 'stroke-dasharray': '3 3', visibility: 'hidden' });
    var dot = s('circle', { r: 5, fill: 'var(--surface)', stroke: 'var(--accent)', 'stroke-width': 2.5, visibility: 'hidden' });
    svg.appendChild(guide); svg.appendChild(dot);
    var hit = s('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent' });
    function move(evt) {
      var box = svg.getBoundingClientRect();
      var px = (evt.touches ? evt.touches[0].clientX : evt.clientX) - box.left;
      var i = n === 1 ? 0 : Math.round(((px - m.l) / iw) * (n - 1));
      i = Math.max(0, Math.min(n - 1, i));
      guide.setAttribute('x1', X(i)); guide.setAttribute('x2', X(i)); guide.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', X(i)); dot.setAttribute('cy', Y(rows[i].value)); dot.setAttribute('visibility', 'visible');
      showTip(evt.touches ? evt.touches[0] : evt, rows[i].tip);
    }
    function out() { guide.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); hideTip(); }
    hit.addEventListener('mousemove', move); hit.addEventListener('touchstart', move, { passive: true });
    hit.addEventListener('touchmove', move, { passive: true });
    hit.addEventListener('mouseleave', out); hit.addEventListener('touchend', out);
    svg.appendChild(hit);
    el.appendChild(svg);
  }

  // 누적 막대(일별). rows: [{label, parts:[v...], tip}]
  function stackedColumns(el, rows, colors, aria) {
    ready(el);
    var W = chartWidth(el), H = 230, m = { l: 44, r: 14, t: 12, b: 28 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var totals = rows.map(function (r) { return r.parts.reduce(function (a, b) { return a + b; }, 0); });
    var max = niceMax(Math.max.apply(null, totals.concat([1])));
    var svg = s('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': aria });
    var n = rows.length, slot = iw / n, bw = Math.max(2, Math.min(28, slot * 0.7));
    // axes with labels centered on columns
    for (var i = 0; i <= 4; i++) {
      var y = m.t + ih - (ih * i) / 4;
      svg.appendChild(s('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, class: i === 0 ? 'axis' : 'grid' }));
      svg.appendChild(s('text', { x: m.l - 8, y: y + 4, 'text-anchor': 'end' }, fmt(Math.round((max * i) / 4 * 10) / 10)));
    }
    var step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 64))));
    rows.forEach(function (r, i) {
      var cx = m.l + slot * i + slot / 2;
      var acc = 0;
      r.parts.forEach(function (v, k) {
        if (!v) return;
        var y0 = m.t + ih - (ih * acc) / max, hgt = (ih * v) / max;
        svg.appendChild(s('rect', { x: cx - bw / 2, y: y0 - hgt, width: bw, height: Math.max(1, hgt), fill: colors[k], rx: 1.5 }));
        acc += v;
      });
      if (i % step === 0) svg.appendChild(s('text', { x: cx, y: H - 8, 'text-anchor': 'middle' }, r.label));
      var hit = s('rect', { x: m.l + slot * i, y: m.t, width: slot, height: ih, fill: 'transparent' });
      hit.addEventListener('mousemove', function (e) { showTip(e, r.tip); });
      hit.addEventListener('touchstart', function (e) { showTip(e.touches[0], r.tip); }, { passive: true });
      hit.addEventListener('mouseleave', hideTip); hit.addEventListener('touchend', hideTip);
      svg.appendChild(hit);
    });
    el.appendChild(svg);
  }

  // 가로 막대. rows: [{label, value, text, tip}]
  function barList(el, rows, opt) {
    ready(el);
    opt = opt || {};
    var W = chartWidth(el), rh = 30;
    var narrow = W < 420;
    var labelW = Math.min(opt.labelW || 120, Math.floor(W * (narrow ? 0.38 : 0.34)));
    var valW = opt.valW || 64;
    var bx = labelW + 8, bwMax = Math.max(40, W - bx - valW - 8);
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    var svg = s('svg', { width: W, height: rows.length * rh, viewBox: '0 0 ' + W + ' ' + rows.length * rh, role: 'img', 'aria-label': opt.aria });
    var maxChars = Math.max(4, Math.floor(labelW / 7.2));
    rows.forEach(function (r, i) {
      var y = i * rh, bw = Math.max(r.value > 0 ? 2 : 0, (bwMax * r.value) / max);
      var g = s('g', {});
      var lab = r.label.length > maxChars ? r.label.slice(0, maxChars - 1) + '…' : r.label;
      g.appendChild(s('text', { x: labelW, y: y + rh / 2 + 4, 'text-anchor': 'end', class: 'strong' }, lab));
      g.appendChild(s('rect', { x: bx, y: y + 6, width: bw, height: rh - 12, rx: 3, fill: r.color || 'var(--bar)' }));
      g.appendChild(s('text', { x: bx + bw + 6, y: y + rh / 2 + 4 }, r.text != null ? r.text : fmt(r.value)));
      var hit = s('rect', { x: 0, y: y, width: W, height: rh, fill: 'transparent' });
      var tipText = r.tip || (r.label + ': ' + fmt(r.value));
      hit.addEventListener('mousemove', function (e) { showTip(e, tipText); });
      hit.addEventListener('touchstart', function (e) { showTip(e.touches[0], tipText); }, { passive: true });
      hit.addEventListener('mouseleave', hideTip); hit.addEventListener('touchend', hideTip);
      g.appendChild(hit);
      svg.appendChild(g);
    });
    el.appendChild(svg);
  }

  function kpi(label, value, sub) {
    return h('div', { class: 'kpi' }, [h('div', { class: 'v', text: value }), h('div', { class: 'l', text: label }), sub ? h('div', { class: 's', text: sub }) : null]);
  }

  // ---------- renderers (each takes the RPC json)
  var R = {};
  R.kpi = function (o) {
    var el = $('kpi'); clear(el);
    [
      kpi('총 가입자', fmt(o.total_users)),
      kpi('신규 가입', fmt(o.new_users), '최근 ' + o.days + '일'),
      kpi('DAU', fmt(o.dau), '오늘 · 어제 ' + fmt(o.dau_yesterday)),
      kpi('WAU', fmt(o.wau), '최근 7일'),
      kpi('MAU', fmt(o.mau), '최근 30일'),
      kpi('사용자당 세션', o.avg_sessions_per_active_user == null ? '–' : String(o.avg_sessions_per_active_user), '최근 ' + o.days + '일 평균'),
      kpi('사용 분석 동의', fmt(o.usage_consented_users), o.total_users ? pct(o.usage_consented_users / o.total_users) + ' of 가입자' : ''),
    ].forEach(function (k) { el.appendChild(k); });
  };

  R.dau = function (rows) {
    var el = $('dau');
    if (!rows || !rows.some(function (r) { return r.dau > 0; })) return setState(el, 'empty', '이 기간에 기록된 활성 사용자가 없습니다.');
    lineChart(el, rows.map(function (r) {
      return { label: shortDay(r.day), value: r.dau, tip: r.day + '\nDAU ' + fmt(r.dau) + ' · 신규 ' + fmt(r.new_users) + ' · 세션 ' + fmt(r.sessions) };
    }), { aria: '일별 활성 사용자 꺾은선 그래프' });
  };

  R.retention = function (o) {
    var el = $('retention');
    if (!o || !o.cohorts || !o.cohorts.length) return setState(el, 'empty', '최근 12주 안에 가입한 사용자가 없습니다.');
    ready(el);
    var wrap = h('div', { class: 'tbl-wrap' });
    var t = h('table');
    t.appendChild(h('thead', {}, [h('tr', {}, [
      h('th', { text: '가입 주(월요일)' }), h('th', { text: '가입자' }), h('th', { text: 'D1' }), h('th', { text: 'D7' }), h('th', { text: 'D30' })])]));
    var tb = h('tbody');
    function cell(c) {
      var td = h('td', { class: 'heat' });
      if (!c || !c.eligible) { td.textContent = '–'; td.style.color = 'var(--muted)'; return td; }
      var a = Math.min(1, c.rate || 0);
      td.style.background = 'color-mix(in srgb, var(--accent) ' + Math.round(8 + a * 62) + '%, transparent)';
      td.appendChild(document.createTextNode(pct(c.rate)));
      td.appendChild(h('span', { class: 'sub', text: c.retained + '/' + c.eligible }));
      return td;
    }
    o.cohorts.forEach(function (c) {
      tb.appendChild(h('tr', {}, [h('td', { text: c.cohort_week }), h('td', { text: fmt(c.size) }), cell(c.d1), cell(c.d7), cell(c.d30)]));
    });
    if (o.overall) {
      var tr = h('tr', {}, [h('td', { text: '전체' }), h('td', { text: fmt(o.overall.size) }), cell(o.overall.d1), cell(o.overall.d7), cell(o.overall.d30)]);
      tr.style.fontWeight = '600'; tb.appendChild(tr);
    }
    t.appendChild(tb); wrap.appendChild(t); el.appendChild(wrap);
  };

  R.features = function (rows) {
    var el = $('features');
    if (!rows || !rows.length) return setState(el, 'empty', '이 기간에 기록된 기능 사용이 없습니다.');
    barList(el, rows.slice(0, 12).map(function (r) {
      var label = EVENT_LABELS[r.name] || r.name;
      return { label: label, value: r.count, tip: label + ' (' + r.name + ')\n' + fmt(r.count) + '회 · ' + fmt(r.users) + '명' };
    }), { aria: '기능별 사용 횟수 막대 그래프' });
  };
  R.screens = function (rows) {
    var el = $('screens');
    if (!rows || !rows.length) return setState(el, 'empty', '이 기간에 기록된 화면 조회가 없습니다.');
    barList(el, rows.slice(0, 12).map(function (r) {
      var label = SCREEN_LABELS[r.screen] || r.screen;
      return { label: label, value: r.count, tip: label + ' (' + r.screen + ')\n' + fmt(r.count) + '회 · ' + fmt(r.users) + '명' };
    }), { aria: '화면별 조회수 막대 그래프' });
  };

  R.prayer = function (o) {
    var el = $('prayer'), kp = $('prayer-kpi'), lg = $('prayer-legend');
    clear(kp); clear(lg);
    if (!o || !o.daily || !o.totals || !Number(o.totals.records)) { clear(el); return setState(el, 'empty', '이 기간에 동기화된 기도 기록이 없습니다.'); }
    var t = o.totals;
    kp.appendChild(kpi('완주', fmt(t.completed), '전체 ' + fmt(t.records) + '건 중'));
    kp.appendChild(kpi('총 기도 시간', fmt(Math.round(Number(t.minutes))) + '분', dur(Number(t.minutes) * 60)));
    kp.appendChild(kpi('기도한 사람', fmt(o.users)));
    var bm = t.by_mystery || {};
    MYSTERY.forEach(function (m) {
      kp.appendChild(kpi(m.label + ' 신비 완주', fmt(bm[m.key] || 0), t.completed ? pct((bm[m.key] || 0) / t.completed) : ''));
      lg.appendChild(h('span', {}, [h('i', { style: 'background:' + cssVar(m.css) }), m.label + ' 신비']));
    });
    stackedColumns(el, o.daily.map(function (d) {
      var p = MYSTERY.map(function (m) { return (d.by_mystery && d.by_mystery[m.key]) || 0; });
      return { label: shortDay(d.day), parts: p, tip: d.day + '\n완주 ' + fmt(d.completed) + '건 · 기도 ' + fmt(Math.round(Number(d.minutes))) + '분\n' + MYSTERY.map(function (m, i) { return m.label + ' ' + p[i]; }).join(' · ') };
    }), MYSTERY.map(function (m) { return cssVar(m.css); }), '일별 묵주기도 완주 수(신비별 누적) 막대 그래프');
  };

  R.church = function (rows) {
    var el = $('church');
    if (!rows || !rows.length) return setState(el, 'empty', '이 기간에 기록된 성당 이용이 없습니다.');
    ready(el);
    var max = Math.max.apply(null, rows.map(function (r) { return r.enters; }).concat([1]));
    var wrap = h('div', { class: 'tbl-wrap' }), t = h('table');
    t.appendChild(h('thead', {}, [h('tr', {}, ['성당', '입장', '이용자', '총 체류', '평균 체류', '착석 시간', '착석', '초 봉헌'].map(function (x, i) { return h('th', { text: x, class: i === 0 ? 'txt' : '' }); }))]));
    var tb = h('tbody');
    rows.forEach(function (r) {
      var avg = r.enters ? Number(r.seconds) / r.enters : 0;
      var bar = h('div', { style: 'height:4px;border-radius:2px;background:var(--bar);margin-top:4px;width:' + Math.max(3, Math.round((r.enters / max) * 100)) + '%' });
      var first = h('td', { class: 'txt' }, [document.createTextNode(r.church), bar]);
      tb.appendChild(h('tr', {}, [first, h('td', { text: fmt(r.enters) }), h('td', { text: fmt(r.users) }),
        h('td', { text: dur(r.seconds) }), h('td', { text: dur(avg) }), h('td', { text: dur(r.sat_seconds) }),
        h('td', { text: fmt(r.sits) }), h('td', { text: fmt(r.candles) })]));
    });
    t.appendChild(tb); wrap.appendChild(t); el.appendChild(wrap);
  };

  R.versions = function (o) {
    var el = $('versions'), el2 = $('os');
    if (!o || !o.app_versions || !o.app_versions.length) { setState(el, 'empty', '수집된 기기 정보가 없습니다.'); } else {
      barList(el, o.app_versions.slice(0, 10).map(function (r) {
        return { label: r.version, value: r.devices, tip: '버전 ' + r.version + '\n기기 ' + fmt(r.devices) + '대 · ' + fmt(r.users) + '명' };
      }), { aria: '앱 버전 분포 막대 그래프', labelW: 90 });
    }
    if (!o || !o.os || !o.os.length) { setState(el2, 'empty', '수집된 기기 정보가 없습니다.'); } else {
      barList(el2, o.os.slice(0, 10).map(function (r) {
        return { label: r.os, value: r.devices, color: 'var(--bar-2)', tip: r.os + '\n기기 ' + fmt(r.devices) + '대' };
      }), { aria: '운영체제 분포 막대 그래프', labelW: 110 });
      if (o.platforms && o.platforms.length) {
        el2.appendChild(h('p', { class: 'muted small-text', text: '최근 30일 플랫폼: ' + o.platforms.map(function (p) { return (PLATFORM_LABELS[p.platform] || p.platform) + ' ' + fmt(p.users) + '명'; }).join(' · ') }));
      }
    }
  };

  R.errors = function (rows) {
    var el = $('errors');
    if (!rows || !rows.length) return setState(el, 'empty', '이 기간에 보고된 오류가 없습니다.');
    ready(el);
    var wrap = h('div', { class: 'tbl-wrap' }), t = h('table');
    t.appendChild(h('thead', {}, [h('tr', {}, [h('th', { class: 'txt', text: '위치 / 메시지' }), h('th', { text: '횟수' }), h('th', { text: '사용자' }), h('th', { text: '마지막' })])]));
    var tb = h('tbody');
    rows.forEach(function (r) {
      var last = r.last_at ? new Date(r.last_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '–';
      tb.appendChild(h('tr', {}, [h('td', { class: 'txt' }, [document.createTextNode(r.where), h('span', { class: 'sub', text: r.message || '(메시지 없음)' })]),
        h('td', { text: fmt(r.count) }), h('td', { text: fmt(r.users) }), h('td', { text: last })]));
    });
    t.appendChild(tb); wrap.appendChild(t); el.appendChild(wrap);
  };

  R.consent = function (o) {
    var el = $('consent');
    if (!o || !o.kinds || !o.total_users) return setState(el, 'empty', '아직 가입자가 없습니다.');
    barList(el, o.kinds.map(function (k) {
      var label = KIND_LABELS[k.kind] || k.kind;
      return { label: label, value: k.rate == null ? 0 : k.rate * 100, text: pct(k.rate) + ' (' + fmt(k.granted) + '명)', tip: label + '\n동의 ' + fmt(k.granted) + ' / ' + fmt(k.total) + '명', color: 'var(--c4)' };
    }), { aria: '선택 동의 비율 막대 그래프', labelW: 150, valW: 96 });
  };

  // ---------- data loading
  var LOADERS = [
    ['admin_overview', function () { return { days: state.days }; }, 'kpi', 'kpi'],
    ['admin_dau', function () { return { days: state.days }; }, 'dau', 'dau'],
    ['admin_retention', function () { return {}; }, 'retention', 'retention'],
    ['admin_feature_usage', function () { return { days: state.days }; }, 'features', 'features'],
    ['admin_screens', function () { return { days: state.days }; }, 'screens', 'screens'],
    ['admin_prayer_daily', function () { return { days: state.days }; }, 'prayer', 'prayer'],
    ['admin_church_usage', function () { return { days: state.days }; }, 'church', 'church'],
    ['admin_versions', function () { return {}; }, 'versions', 'versions'],
    ['admin_errors', function () { return { days: state.days }; }, 'errors', 'errors'],
    ['admin_consent_rates', function () { return {}; }, 'consent', 'consent'],
  ];
  var ERR_TARGETS = { kpi: ['kpi'], versions: ['versions', 'os'], prayer: ['prayer'] };

  function isNotAdmin(err) {
    var t = ((err && (err.message || err.details || err.hint)) || '') + ' ' + ((err && err.code) || '');
    return /not_admin|42501/.test(t);
  }

  function loadAll() {
    ['dau', 'retention', 'features', 'screens', 'prayer', 'church', 'versions', 'os', 'errors', 'consent'].forEach(function (id) {
      clear($(id)); $(id).setAttribute('data-state', 'loading');
    });
    clear($('kpi')); clear($('prayer-kpi')); clear($('prayer-legend'));
    var notAdmin = false;
    return Promise.all(LOADERS.map(function (L) {
      return Promise.resolve(state.client.rpc(L[0], L[1]())).then(function (res) {
        if (res.error) throw res.error;
        R[L[3]](res.data);
      }).catch(function (err) {
        if (isNotAdmin(err)) { notAdmin = true; return; }
        var msg = '불러오지 못했습니다: ' + ((err && err.message) || '알 수 없는 오류');
        (ERR_TARGETS[L[2]] || [L[2]]).forEach(function (id) { setState($(id), 'err', msg); });
        if (L[2] === 'kpi') $('kpi').appendChild(h('div', { class: 'state err', text: msg }));
      });
    })).then(function () { if (notAdmin) showNotAdmin(); });
  }

  // ---------- views
  function showView(name) { show('login-view', name === 'login'); show('notice-view', name === 'notice'); show('dash-view', name === 'dash'); }
  function notice(title, body, withLogout) {
    $('notice-title').textContent = title; $('notice-body').textContent = body;
    show('notice-btn', !!withLogout); showView('notice');
  }
  function showNotAdmin() {
    notice('관리자 권한이 없습니다', '이 계정은 관리자로 등록되어 있지 않습니다. 관리자 목록(admins 표)에 사용자 ID가 추가되어야 합니다. 다른 계정으로 로그인하려면 로그아웃하세요.', true);
  }

  function enterDashboard(user) {
    $('who').textContent = user && user.email ? user.email : '';
    return Promise.resolve(state.client.rpc('is_admin')).then(function (res) {
      if (res.error || res.data !== true) {
        if (res.error && !isNotAdmin(res.error)) return notice('불러오지 못했습니다', res.error.message || '알 수 없는 오류', true);
        return showNotAdmin();
      }
      showView('dash');
      if (window.AdminRoadmap) window.AdminRoadmap.setClient(state.client);
      selectTab(tabFromHash(), true);
      return loadAll();
    });
  }

  // ---------- 탭 (분석 / 로드맵)
  function tabFromHash() { return /^#roadmap/.test(location.hash) ? 'roadmap' : 'analytics'; }
  function selectTab(name, noHash) {
    var rm = name === 'roadmap';
    state.tab = name;
    $('analytics-view').hidden = rm; $('roadmap-view').hidden = !rm;
    $('range').hidden = rm;
    Array.prototype.forEach.call(document.querySelectorAll('.tabs .tab'), function (b) {
      var on = b.getAttribute('data-tab') === name;
      b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (!noHash) { try { history.replaceState(null, '', rm ? '#roadmap' : location.pathname + location.search); } catch (e) { /* ignore */ } }
    if (rm && window.AdminRoadmap) window.AdminRoadmap.show(false);
  }

  function signOut() {
    return Promise.resolve(state.client.auth.signOut()).catch(function () {}).then(function () { showView('login'); });
  }

  function init() {
    var cfg = window.ADMIN_CONFIG;
    if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || /YOUR-/.test(cfg.SUPABASE_URL + cfg.SUPABASE_ANON_KEY)) {
      return notice('설정이 필요합니다', 'admin/config.js 에 SUPABASE_URL 과 SUPABASE_ANON_KEY 를 입력하세요. (config.example.js 를 복사해 만듭니다.)', false);
    }
    if (!window.supabase || !window.supabase.createClient) {
      return notice('라이브러리를 불러오지 못했습니다', '네트워크 연결을 확인하고 새로고침하세요. (supabase-js CDN)', false);
    }
    state.client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

    $('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('login-btn'), msg = $('login-msg');
      msg.hidden = true; btn.disabled = true; btn.textContent = '로그인 중…';
      Promise.resolve(state.client.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value }))
        .then(function (res) {
          if (res.error || !res.data || !res.data.user) {
            msg.textContent = '로그인하지 못했습니다. 이메일과 비밀번호를 확인하세요.' + (res.error && res.error.message ? ' (' + res.error.message + ')' : '');
            msg.hidden = false; return;
          }
          $('password').value = '';
          return enterDashboard(res.data.user);
        })
        .catch(function (err) { msg.textContent = '오류: ' + ((err && err.message) || err); msg.hidden = false; })
        .then(function () { btn.disabled = false; btn.textContent = '로그인'; });
    });
    $('logout').addEventListener('click', signOut);
    $('notice-btn').addEventListener('click', signOut);
    $('refresh').addEventListener('click', function () {
      if (state.tab === 'roadmap' && window.AdminRoadmap) window.AdminRoadmap.show(true); else loadAll();
    });
    Array.prototype.forEach.call(document.querySelectorAll('.tabs .tab'), function (b) {
      b.addEventListener('click', function () { selectTab(b.getAttribute('data-tab')); });
    });
    $('range').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-days]'); if (!b) return;
      state.days = Number(b.getAttribute('data-days'));
      Array.prototype.forEach.call($('range').querySelectorAll('button'), function (x) {
        var on = x === b; x.classList.toggle('on', on); if (on) x.setAttribute('aria-pressed', 'true'); else x.removeAttribute('aria-pressed');
      });
      loadAll();
    });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (!$('dash-view').hidden && state.client) rerender(); }, 150);
    });

    // 저장된 세션이 있으면 바로 입장
    Promise.resolve(state.client.auth.getSession()).then(function (res) {
      var sess = res && res.data && res.data.session;
      if (sess && sess.user) return enterDashboard(sess.user);
      showView('login');
    }).catch(function () { showView('login'); });
  }

  // 창 크기가 바뀌면 마지막으로 받은 데이터로 다시 그린다.
  var lastData = {};
  var _origRender = {};
  Object.keys(R).forEach(function (k) {
    _origRender[k] = R[k];
    R[k] = function (d) { lastData[k] = d; return _origRender[k](d); };
  });
  function rerender() {
    Object.keys(lastData).forEach(function (k) {
      if (['kpi', 'retention', 'church', 'errors'].indexOf(k) >= 0) return; // 폭에 영향 없는 표
      try { _origRender[k](lastData[k]); } catch (e) { /* ignore */ }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
