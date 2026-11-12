/* 묵주기도 관리자 — '로드맵' 탭.
   - 관리자 RPC admin_roadmap() / admin_roadmap_set() 로 읽고 쓴다.
   - RPC 가 없거나(마이그레이션 전) 실패하면 roadmap_seed.json 의 읽기 전용 사본을 보여 준다.
   - 데이터는 모두 textContent 로만 넣는다(innerHTML 사용 안 함). */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var STATUS = [
    ['todo', '할 일'], ['doing', '진행 중'], ['review', '검토'], ['done', '완료'], ['blocked', '막힘'], ['dropped', '보류·제외'],
  ];
  var STATUS_LABEL = {}; STATUS.forEach(function (s) { STATUS_LABEL[s[0]] = s[1]; });
  var RELEASES = [
    ['R1', 'R1 · 약 1주', '빠르게 고칠 것 (P0)'],
    ['R2', 'R2 · 약 1개월', '매일 쓰게 만드는 것 (P1)'],
    ['R3', 'R3 · 이후', '함께하는 기도 (P2)'],
  ];
  var PRIORITIES = ['P0', 'P1', 'P2'];
  var EFFORT_LABEL = { S: 'S · 1일 이하', M: 'M · 2~5일', L: 'L · 1주 이상' };

  var st = {
    client: null, items: [], decisions: [], readOnly: false, loaded: false, loading: false,
    f: { q: '', release: '', priority: '', category: '', status: '' },
  };

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === 'class') e.className = attrs[k]; else if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function chip(text, cls) { return h('span', { class: 'rm-chip' + (cls ? ' ' + cls : ''), text: text }); }
  function dash(v) { return v == null || String(v).trim() === '' || String(v).trim() === '–' ? '–' : String(v); }

  // ---------- 요약
  function renderSummary() {
    var box = $('rm-summary'); clear(box);
    var total = st.items.length;
    var counts = {}; STATUS.forEach(function (s) { counts[s[0]] = 0; });
    st.items.forEach(function (i) { counts[i.status] = (counts[i.status] || 0) + 1; });
    $('rm-sub').textContent = '전체 ' + total + '개';

    var chips = h('div', { class: 'rm-counts' });
    STATUS.forEach(function (s) {
      chips.appendChild(h('div', { class: 'rm-count', 'data-status': s[0] }, [
        h('span', { class: 'v', text: String(counts[s[0]]) }),
        h('span', { class: 'l', text: s[1] }),
      ]));
    });
    box.appendChild(chips);

    var bars = h('div', { class: 'rm-bars' });
    RELEASES.forEach(function (r) {
      var its = st.items.filter(function (i) { return i.release === r[0]; });
      var done = its.filter(function (i) { return i.status === 'done'; }).length;
      var live = its.filter(function (i) { return i.status === 'doing' || i.status === 'review'; }).length;
      var n = its.length;
      var p = n ? Math.round((done / n) * 100) : 0;
      var track = h('div', { class: 'rm-track', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(n), 'aria-valuenow': String(done), 'aria-label': r[1] + ' 완료 ' + done + '/' + n }, [
        h('i', { class: 'done', style: 'width:' + (n ? (done / n) * 100 : 0) + '%' }),
        h('i', { class: 'live', style: 'width:' + (n ? (live / n) * 100 : 0) + '%' }),
      ]);
      bars.appendChild(h('div', { class: 'rm-bar' }, [
        h('div', { class: 'rm-bar-head' }, [
          h('strong', { text: r[1] }),
          h('span', { class: 'muted small-text', text: '완료 ' + done + ' / ' + n + ' (' + p + '%) · 진행·검토 ' + live }),
        ]),
        track,
      ]));
    });
    box.appendChild(bars);
  }

  // ---------- 필터
  function fillSelect(sel, all, opts) {
    clear(sel);
    sel.appendChild(h('option', { value: '', text: all }));
    opts.forEach(function (o) { sel.appendChild(h('option', { value: o[0], text: o[1] })); });
  }
  function initFilters() {
    fillSelect($('rm-f-release'), '전체', RELEASES.map(function (r) { return [r[0], r[1]]; }));
    fillSelect($('rm-f-priority'), '전체', PRIORITIES.map(function (p) { return [p, p]; }));
    fillSelect($('rm-f-status'), '전체', STATUS);
    $('rm-q').addEventListener('input', function (e) { st.f.q = e.target.value; renderBoard(); });
    [['release', 'rm-f-release'], ['priority', 'rm-f-priority'], ['category', 'rm-f-category'], ['status', 'rm-f-status']].forEach(function (p) {
      $(p[1]).addEventListener('change', function (e) { st.f[p[0]] = e.target.value; renderBoard(); });
    });
    $('rm-reset').addEventListener('click', function () {
      st.f = { q: '', release: '', priority: '', category: '', status: '' };
      $('rm-q').value = '';
      ['rm-f-release', 'rm-f-priority', 'rm-f-category', 'rm-f-status'].forEach(function (id) { $(id).value = ''; });
      renderBoard();
    });
  }
  function refreshCategoryFilter() {
    var seen = {}, cats = [];
    st.items.forEach(function (i) { if (i.category && !seen[i.category]) { seen[i.category] = 1; cats.push([i.category, i.category]); } });
    fillSelect($('rm-f-category'), '전체', cats);
    $('rm-f-category').value = seen[st.f.category] ? st.f.category : '';
  }
  function matches(i) {
    var f = st.f;
    if (f.release && i.release !== f.release) return false;
    if (f.priority && i.priority !== f.priority) return false;
    if (f.category && i.category !== f.category) return false;
    if (f.status && i.status !== f.status) return false;
    var q = f.q.trim().toLowerCase();
    if (q) {
      var hay = [i.id, i.title, i.category, i.depends, i.value, i.risk, i.evidence, i.owner_note].join(' ').toLowerCase();
      return q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
    }
    return true;
  }

  // ---------- 보드
  function fmtTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var k = new Date(d.getTime() + 9 * 3600e3).toISOString();
    return k.slice(0, 10) + ' ' + k.slice(11, 16) + ' KST';
  }

  function card(item) {
    var ro = st.readOnly;
    var msg = h('span', { class: 'rm-save muted small-text', role: 'status' });
    var el = h('article', { class: 'rm-card', 'data-status': item.status, 'data-id': item.id });

    var sel = h('select', { class: 'rm-select rm-status', 'aria-label': item.id + ' 상태' });
    STATUS.forEach(function (s) { sel.appendChild(h('option', { value: s[0], text: s[1] })); });
    sel.value = item.status;
    if (ro) sel.disabled = true;

    var note = h('input', { class: 'rm-note', type: 'text', maxlength: '500', placeholder: ro ? '' : '메모 (자동 저장)', 'aria-label': item.id + ' 메모' });
    note.value = item.owner_note || '';
    if (ro) note.readOnly = true;

    function flash(text, bad) {
      msg.textContent = text; msg.className = 'rm-save small-text' + (bad ? ' err' : ' muted');
    }
    function save(patch, onFail) {
      msg.className = 'rm-save muted small-text'; msg.textContent = '저장 중…';
      sel.disabled = true;
      return Promise.resolve(st.client.rpc('admin_roadmap_set', {
        item_id: item.id,
        new_status: patch.status === undefined ? null : patch.status,
        new_note: patch.note === undefined ? null : patch.note,
      })).then(function (res) {
        if (res.error) throw res.error;
        var r = res.data || {};
        item.status = r.status || item.status;
        item.owner_note = r.owner_note != null ? r.owner_note : item.owner_note;
        item.updated_at = r.updated_at || item.updated_at;
        el.setAttribute('data-status', item.status);
        sel.value = item.status; note.value = item.owner_note || '';
        flash('저장됨 ' + fmtTime(item.updated_at));
        renderSummary();
        if (st.f.status) setTimeout(renderBoard, 600); // 상태 필터 중이면 잠시 뒤 목록 갱신
      }).catch(function (err) {
        if (onFail) onFail();
        flash('저장하지 못했습니다: ' + ((err && err.message) || '알 수 없는 오류'), true);
      }).then(function () { sel.disabled = false; });
    }
    sel.addEventListener('change', function () {
      var prev = item.status;
      save({ status: sel.value }, function () { sel.value = prev; });
    });
    note.addEventListener('blur', function () {
      if (note.value === (item.owner_note || '')) return;
      save({ note: note.value }); // 실패해도 입력은 남겨 두어 다시 시도할 수 있게 함
    });
    note.addEventListener('keydown', function (e) { if (e.key === 'Enter') note.blur(); });

    el.appendChild(h('div', { class: 'rm-top' }, [
      h('span', { class: 'rm-id', text: item.id }),
      chip(item.priority, 'pri-' + String(item.priority).toLowerCase()),
      chip(EFFORT_LABEL[item.effort] || item.effort, 'eff'),
      chip(item.category || '', 'cat'),
    ]));
    el.appendChild(h('h3', { class: 'rm-title', text: item.title }));
    el.appendChild(h('div', { class: 'rm-ctl' }, [sel, note]));
    el.appendChild(h('div', { class: 'rm-dep small-text' }, [
      h('span', { class: 'muted', text: '의존: ' }), h('span', { text: dash(item.depends) }),
      msg,
    ]));
    el.appendChild(h('details', { class: 'rm-more' }, [
      h('summary', { text: '자세히 (가치 · 위험 · 근거)' }),
      h('dl', {}, [
        h('dt', { text: '사용자 가치' }), h('dd', { text: dash(item.value) }),
        h('dt', { text: '위험' }), h('dd', { text: dash(item.risk) }),
        h('dt', { text: '근거(조사)' }), h('dd', { text: dash(item.evidence) }),
      ]),
    ]));
    return el;
  }

  function renderBoard() {
    var box = $('rm-board'); box.removeAttribute('data-state'); clear(box);
    var shown = 0;
    RELEASES.forEach(function (r) {
      var all = st.items.filter(function (i) { return i.release === r[0]; });
      var its = all.filter(matches);
      if (!its.length) return;
      shown += its.length;
      var sec = h('section', { class: 'rm-release', 'aria-label': r[1] }, [
        h('h2', {}, [r[1], h('span', { class: 'tag', text: r[2] + ' · ' + its.length + (its.length !== all.length ? '/' + all.length : '') + '개' })]),
      ]);
      var grid = h('div', { class: 'rm-grid' });
      its.forEach(function (i) { grid.appendChild(card(i)); });
      sec.appendChild(grid);
      box.appendChild(sec);
    });
    if (!shown) box.appendChild(h('div', { class: 'state', text: st.items.length ? '조건에 맞는 과제가 없습니다. 필터를 바꿔 보세요.' : '표시할 과제가 없습니다.' }));
  }

  function renderDecisions() {
    var box = $('rm-decisions'); clear(box);
    if (!st.decisions.length) { box.appendChild(h('div', { class: 'state', text: '결정 사항이 없습니다.' })); return; }
    st.decisions.forEach(function (d) {
      box.appendChild(h('details', { class: 'rm-dec' }, [
        h('summary', {}, [h('b', { class: 'rm-id', text: d.id }), ' ', h('span', { text: d.question })]),
        h('div', { class: 'rm-dec-body' }, [
          h('p', {}, [h('strong', { text: '결정: ' }), h('span', { text: d.decision })]),
          h('p', { class: 'muted' }, [h('strong', { text: '이유: ' }), h('span', { text: dash(d.rationale) })]),
          h('p', { class: 'muted small-text', text: '결정일 ' + String(d.decided_on || '').slice(0, 10) }),
        ]),
      ]));
    });
  }

  function banner(kind, text) {
    var b = $('rm-banner');
    if (!text) { b.hidden = true; return; }
    b.className = 'rm-banner ' + kind; b.textContent = text; b.hidden = false;
  }

  function apply(data, readOnly) {
    st.items = (data.items || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0) || (a.id < b.id ? -1 : 1); });
    st.decisions = data.decisions || [];
    st.readOnly = readOnly; st.loaded = true;
    refreshCategoryFilter(); renderSummary(); renderBoard(); renderDecisions();
  }

  function isMissingRpc(err) {
    var t = ((err && (err.message || err.details || err.hint)) || '') + ' ' + ((err && err.code) || '');
    return /PGRST202|42883|42P01|Could not find the function|does not exist|schema cache/i.test(t);
  }

  function loadSeed(reason) {
    return fetch('roadmap_seed.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      apply(j, true);
      banner('warn', reason + ' 읽기 전용 정적 사본(roadmap_seed.json)을 보여 주고 있으며 상태는 저장되지 않습니다.');
    }).catch(function (e) {
      $('rm-board').removeAttribute('data-state'); clear($('rm-board'));
      $('rm-board').appendChild(h('div', { class: 'state err', text: reason + ' 정적 사본도 불러오지 못했습니다: ' + ((e && e.message) || e) }));
      banner('err', reason);
    });
  }

  function load() {
    if (!st.client || st.loading) return Promise.resolve();
    st.loading = true;
    var box = $('rm-board'); clear(box); box.setAttribute('data-state', 'loading');
    return Promise.resolve(st.client.rpc('admin_roadmap')).then(function (res) {
      if (res.error) throw res.error;
      if (!res.data || !Array.isArray(res.data.items)) throw new Error('응답 형식이 올바르지 않습니다.');
      banner('', '');
      apply(res.data, false);
    }).catch(function (err) {
      if (isMissingRpc(err)) {
        return loadSeed('로드맵 기능이 아직 서버에 설치되지 않았습니다. supabase/migrations/20261113000000_roadmap.sql 을 적용하세요. (docs/ux/ROADMAP_ADMIN.md)');
      }
      return loadSeed('로드맵을 불러오지 못했습니다: ' + ((err && err.message) || '알 수 없는 오류') + '.');
    }).then(function () { st.loading = false; });
  }

  var inited = false;
  window.AdminRoadmap = {
    setClient: function (c) { st.client = c; st.loaded = false; },
    // 탭을 열 때마다 호출. force 면 다시 불러온다.
    show: function (force) {
      if (!inited) { initFilters(); inited = true; }
      if (force || !st.loaded) return load();
      return Promise.resolve();
    },
  };
})();
