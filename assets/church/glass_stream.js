/* glass_stream.js — 성당 안 스테인드글라스 대량 투입 대비 스트리밍 규칙(순수 계산) + 팩 디코드 도우미. PERF_SCALE.md §3.
   glass_place.js 가 쓴다. 이 파일의 계산(plan·layoutAtlas·screenPx·budget)은 three·DOM 없이 돌아가서 node --test 로 고정한다(glass_stream.test.mjs).

   구조(창 수가 늘어도 draw call·셰이더·GPU 메모리가 거의 일정):
   - 먼 창(far): 성당의 모든 창 그림을 작은 사본(긴 변 cell px)으로 '아틀라스 한 장'에 모은다(gpack_far_<성당>.js 한 파일, 입장 때 한 번).
     모든 자리를 한 지오메트리·한 재질로 그린다 → 창이 10개든 100개든 draw call 1.
   - 가까운 창(near): 화면에 크게 보일 창만 1k 질감을 따로 올린다(창 id 당 1장, 같은 그림을 쓰는 자리는 한 지오메트리 → id 당 draw call 1).
     동시에 올리는 수·MB 는 화질 단계별 상한(BUDGET). 넘치면 덜 중요한 것(점수 낮고 오래 안 쓴 것)부터 해제(LRU).
   - 판단은 시야(회전)가 아니라 '거리 기준 크기'로 한다: 고개만 돌릴 때는 아무것도 읽거나 올리지 않는다(회전 버벅임 방지). 시야 안이면 우선순위만 높인다.
   - 디코드는 메인 스레드 밖: data URI → fetch → Blob → createImageBitmap(뒤집기·비곱셈 알파·색공간 변환 없음). 없으면 <img>.decode().
     업로드는 프레임당 1장(glass_place.update), 디코드는 동시에 1개. 팩 문자열·<script>·ImageBitmap 은 올린 직후 놓는다.
   ChurchGlassStream = { BUDGET, budget(tier), screenPx(slot, cam, focal), plan(groups, view, budget), layoutAtlas(items, cell, opts), decodeUri(uri), loadScript(src) } */
(function (root) {
  'use strict';

  // 화질 단계별 상한. near = 동시에 올려 두는 1k 창 질감 수, nearMb = 그 합(밉맵 포함 추정), cell = 먼 창 사본의 긴 변(px).
  // high 의 64MB 는 1k 세로창(약 520×1024, 2.7MB) 23장 또는 정사각 1k(5.3MB) 12장 분량이지만 near 수(8)가 먼저 걸린다.
  var BUDGET = {
    high: { near: 8, nearMb: 64, cell: 256 },
    mid: { near: 6, nearMb: 40, cell: 256 },
    low: { near: 4, nearMb: 24, cell: 128 }
  };
  // 들어가기/남기 문턱(먼 사본 해상도 대비). 화면에서 창의 긴 변이 cell × ENTER 보다 크게 보일 수 있으면 1k 를 원하고, × STAY 아래로 내려가야 놓는다.
  var ENTER = 0.9, STAY = 0.6, VIS_BOOST = 1.5;

  function budget(tier) { return BUDGET[tier] || BUDGET.high; }

  // 정면에서 볼 때 화면에 비칠 창의 긴 변(px). focal = 화면 높이(px) / (2·tan(fov/2)).
  function screenPx(s, cam, focal) {
    var dx = s.x - cam.x, dy = s.y - cam.y, dz = s.z - cam.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return Math.max(s.w, s.h) * focal / Math.max(0.5, d);
  }
  function inView(s, cam) {
    if (!cam.dir) return false;
    var dx = s.x - cam.x, dy = s.y - cam.y, dz = s.z - cam.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    var r = Math.max(s.w, s.h) * 0.5;
    return (dx * cam.dir[0] + dy * cam.dir[1] + dz * cam.dir[2]) / d > (cam.cosHalf || 0.5) - r / d;
  }

  // groups: [{id, slots:[{x,y,z,w,h}], near:'none'|'loading'|'ready'|'error', mb, used}]
  // view: {cam:{x,y,z,dir:[3],cosHalf}, focal, cell, now}
  // → {want:[id...] 점수순(상한 안), load:[id...] 새로 읽을 것(점수순), evict:[id...] 해제할 것, score:{id:점수}}
  function plan(groups, view, bud) {
    var cell = view.cell || bud.cell, out = { want: [], load: [], evict: [], score: {} };
    var cand = [];
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (g.near === 'error') continue;
      var px = 0, vis = false;
      for (var j = 0; j < g.slots.length; j++) {
        var p = screenPx(g.slots[j], view.cam, view.focal);
        if (p > px) px = p;
        if (!vis && inView(g.slots[j], view.cam)) vis = true;
      }
      var held = g.near === 'ready' || g.near === 'loading';
      // 고를 때는 거리 기준 크기만 쓴다(시야를 넣으면 고개를 돌릴 때마다 상한 경계의 창이 바뀌어 읽기·해제가 생긴다). 이미 있는 것은 조금 우대(깜빡 교체 방지).
      var sc = px * (held ? 1.15 : 1);
      out.score[g.id] = sc;
      if (px > cell * ENTER || (held && px > cell * STAY)) cand.push({ g: g, s: sc, v: vis });
    }
    cand.sort(function (a, b) { return b.s - a.s || (a.g.id < b.g.id ? -1 : 1); });
    var n = 0, mb = 0, wantSet = {};
    for (i = 0; i < cand.length; i++) {
      var c = cand[i], m = c.g.mb || 3;
      if (n >= bud.near || mb + m > bud.nearMb) break;
      n++; mb += m; wantSet[c.g.id] = 1; out.want.push(c.g.id);
      if (c.g.near === 'none') out.load.push(c.g.id);
    }
    // 읽는 순서만 시야 안의 창을 먼저(VIS_BOOST)
    out.load.sort(function (a, b) { return vis_(b) * out.score[b] - vis_(a) * out.score[a]; });
    function vis_(id) { for (var k = 0; k < cand.length; k++) if (cand[k].g.id === id) return cand[k].v ? VIS_BOOST : 1; return 1; }
    // 원하지 않는 상주 질감: 상한 안이면 남겨 둔다(되돌아올 때 다시 읽지 않게 = LRU 캐시).
    // 새로 읽을 자리가 모자랄 때만, 그리고 상한이 줄었을 때만 점수 낮고 오래된 것부터 해제한다.
    // 읽는 중인 것은 아직 후보(점수 > 남기 문턱)면 끝까지 읽게 둔다(걷는 동안 읽기-취소가 되풀이되지 않게).
    var cnt = 0, used = 0, spare = [];
    for (i = 0; i < groups.length; i++) {
      g = groups[i];
      if (g.near !== 'ready' && g.near !== 'loading') continue;
      cnt++; used += g.mb || 3;
      if (wantSet[g.id]) continue;
      if (g.near === 'loading' && (out.score[g.id] || 0) > cell * STAY) continue;
      spare.push(g);
    }
    spare.sort(function (a, b) { return ((out.score[a.id] || 0) - (out.score[b.id] || 0)) || ((a.used || 0) - (b.used || 0)); });
    var si = 0;
    function evictOne() { if (si >= spare.length) return false; var v = spare[si++]; out.evict.push(v.id); cnt--; used -= v.mb || 3; return true; }
    while ((cnt > bud.near || used > bud.nearMb) && evictOne()) { /* 상한이 줄었다 */ }
    var keep = [];
    for (i = 0; i < out.load.length; i++) {
      while ((cnt + 1 > bud.near || used + 3 > bud.nearMb) && evictOne()) { /* 자리 만들기 */ }
      if (cnt + 1 > bud.near || used + 3 > bud.nearMb) break;
      keep.push(out.load[i]); cnt++; used += 3;
    }
    out.load = keep;
    return out;
  }

  // 먼 창 아틀라스 배치: 정사각 칸(cell) 격자, 그림은 칸 안에 비율 그대로(contain) + 둘레 pad px.
  // items: [{id, aspect(가로/세로)}] → {w, h, cols, rows, rects:{id:{x,y,w,h,u0,v0,u1,v1}}}. v 는 위가 1(WebGL, flipY 업로드 기준).
  function layoutAtlas(items, cell, o) {
    o = o || {};
    var pad = o.pad === undefined ? 2 : o.pad, cols = Math.max(1, Math.min(o.cols || 8, items.length || 1)), rows = Math.max(1, Math.ceil(items.length / cols));
    var w = cols * cell, h = rows * cell;
    if (o.pot) { w = pot(w); h = pot(h); }
    var rects = {};
    items.forEach(function (it, i) {
      var cx = (i % cols) * cell, cy = Math.floor(i / cols) * cell, a = it.aspect > 0 ? it.aspect : 1, inner = cell - pad * 2;
      var rw = a >= 1 ? inner : Math.round(inner * a), rh = a >= 1 ? Math.round(inner / a) : inner;
      var x = cx + Math.round((cell - rw) / 2), y = cy + Math.round((cell - rh) / 2);
      rects[it.id] = { x: x, y: y, w: rw, h: rh, u0: x / w, u1: (x + rw) / w, v0: 1 - (y + rh) / h, v1: 1 - y / h };
    });
    return { w: w, h: h, cols: cols, rows: rows, rects: rects };
  }
  function pot(v) { var p = 1; while (p < v) p *= 2; return p; }
  // 밉맵 포함 GPU 바이트 추정(RGBA8)
  function texMb(w, h) { return w * h * 4 * 4 / 3 / 1048576; }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = function () { if (s.parentNode) s.parentNode.removeChild(s); res(); };
      s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); rej(new Error('script ' + src)); };
      document.head.appendChild(s);
    });
  }
  var canBitmap = typeof root.createImageBitmap === 'function' && typeof root.fetch === 'function' && !/[?&]gbitmap=0/.test((root.location && root.location.search) || '');
  // data URI → {img, bitmap:bool}. ImageBitmap 은 이미 뒤집혀 있다(three 의 flipY 는 ImageBitmap 에 듣지 않는다 → 질감 flipY=false).
  // flip=false 면 똑바로(캔버스에 그릴 때: 먼 창 아틀라스).
  function decodeUri(uri, flip) {
    if (canBitmap) {
      return fetch(uri).then(function (r) { return r.blob(); }).then(function (b) {
        return root.createImageBitmap(b, { imageOrientation: flip === false ? 'none' : 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
      }).then(function (bm) { return { img: bm, bitmap: true }; }, function () { return decodeImg(uri); });
    }
    return decodeImg(uri);
  }
  function decodeImg(uri) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () { res({ img: img, bitmap: false }); }; img.onerror = function () { rej(new Error('texture')); };
      img.src = uri;
    }).then(function (o) { return o.img.decode ? o.img.decode().then(function () { return o; }, function () { return o; }) : o; });
  }

  root.ChurchGlassStream = { BUDGET: BUDGET, ENTER: ENTER, STAY: STAY, budget: budget, screenPx: screenPx, inView: inView, plan: plan, layoutAtlas: layoutAtlas, texMb: texMb,
    loadScript: loadScript, decodeUri: decodeUri, canBitmap: function () { return canBitmap; } };
})(typeof window !== 'undefined' ? window : this);
