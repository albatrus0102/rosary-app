/* reverence.js — 불경(不敬) 방지 규칙. three.js 의존 없는 순수 로직. docs/church/REVERENCE.md.
   브라우저: window.ChurchReverence, Node: require. 시험: tools/church_web/reverence.test.mjs (모든 성당)

   1) 제단(presbyterium) 출입 금지 구역 — 평신도 아바타는 제대 앞(스테이션)까지만 간다.
      레이아웃·충돌체·바닥 높이 구역에서 일반적으로 유도한다(성당 빌더 ch_*.js 는 고치지 않는다):
      - 제대 앞 자리 = 입구(spawn)에서 신랑 축(좌석이 바라보는 쪽)을 따라 걸을 수 있는 한 간 곳(stations.js 와 같은 규칙,
        layout.stations.altar 가 있으면 그 값).
      - 그 자리가 성당 폭 대부분을 덮지 않는 '높은 단' 위면, 금지 구역은 단의 첫 계단 발치부터(제단 계단 아래에서 멈춘다).
        단이 없거나 단이 성당 폭 전체(익랑·넓은 단)면 제대 바로 앞(+0.35m)부터.
      - 폭: 단이 있으면 단 폭(+0.3m), 아니면 축 좌우 6m. 단, 촛불대·성모상·좌석 같은 '신자 자리'는 1m 이상 비켜 둔다.
      - 깊이: 경계 끝(앱스·주교좌·감실 뒤까지).
      성당별 보정은 reverence_places.js (ChurchReverencePlaces[id] = {front, halfW, extra:[{x0,x1,z0,z1}]}).
      금지 구역은 충돌체로 들어가므로 걷기(조이스틱)·누르기 이동(경로 탐색)·자리 복원이 모두 막힌다.
      다른 사람이 보낸 좌표는 clamp() 로 구역 앞 가장자리로 내린다(net_view.js, 수신 측).
   2) 동작: '인사'(손 흔들기, e=0)는 입구 가까이(8m)에서 걷는 중일 때만. 그 밖(신랑·제대 앞·앉음·기도·묵주기도)에서는
      '고개 숙임'(e=2)으로 바꾼다. 성호경(1)·고개 숙임(2)은 언제나 허용. 다른 번호는 무시(-1). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChurchReverence = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var K = {
    R: 0.3, FRONT_PAD: 0.35, HALF_W: 6, PLAT_PAD: 0.3, PUBLIC_GAP: 1.0, MIN_HALF_W: 1.2,
    FULL_WIDTH: 0.8, MAX_STEP_RUN: 10, WAVE_NEAR_ENTRANCE: 8
  };
  var EMOTE = { WAVE: 0, CROSS: 1, BOW: 2 };

  function placesTable() {
    var g = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
    if (g.ChurchReverencePlaces) return g.ChurchReverencePlaces;
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      try { return require('./reverence_places.js'); } catch (e) { /* 없으면 보정 없음 */ }
    }
    return {};
  }

  // 반경 r 원이 충돌체(정규화된 logic.colliders)와 겹치지 않는가
  function freeAt(cols, x, z, r) {
    for (var q = 0; q < cols.length; q++) {
      var c = cols[q];
      if (c.k === 0) {
        var cx = x < c.x0 ? c.x0 : (x > c.x1 ? c.x1 : x), cz = z < c.z0 ? c.z0 : (z > c.z1 ? c.z1 : z);
        var ex = x - cx, ez = z - cz;
        if (ex * ex + ez * ez < r * r) return false;
      } else {
        var dx = x - c.x, dz = z - c.z, rr = c.r + r;
        if (dx * dx + dz * dz < rr * rr) return false;
      }
    }
    return true;
  }

  function axisOf(layout) {
    var sx = 0, sz = 0, G = layout.seatGroups || [];
    for (var q = 0; q < G.length; q++) { var yaw = G[q].yaw || 0; sx += -Math.sin(yaw); sz += -Math.cos(yaw); }
    var l = Math.sqrt(sx * sx + sz * sz);
    if (l < 1e-6) return { x: 0, z: -1 };
    return { x: sx / l, z: sz / l };
  }

  // 신자가 쓰는 자리(좌석·촛불대·성모상·성수대·십자가의 길 판)
  function publicPoints(layout, logic) {
    var pts = [];
    (logic.seats || []).forEach(function (s) { pts.push([s.x, s.z]); var st = logic.standPos(s.id); if (st) pts.push([st.x, st.z]); });
    var stands = (layout.candles && layout.candles.stands) || [];
    stands.forEach(function (S) { pts.push([S.x, S.z]); });
    (logic.slots || []).forEach(function (s) { pts.push([s.x, s.z]); });
    if (layout.shrine) pts.push([layout.shrine.x, layout.shrine.z]);
    (layout.fonts || []).forEach(function (f) { pts.push([f.x, f.z]); });
    var cw = layout.crossWay;
    if (cw && cw.plaques) cw.plaques.forEach(function (p) { pts.push([p.x, p.z]); if (p.stand) pts.push([p.stand.x, p.stand.z]); });
    return pts;
  }

  // 금지 구역 유도. logic = ChurchLogic.create 결과(금지 구역 넣기 전). 결과 {x0,x1,z0,z1, front, axis, halfW, station, how} | null
  function derive(logic, places) {
    var layout = logic.layout;
    if (!layout || layout.viewing || !layout.seatGroups || !layout.seatGroups.length || !layout.spawn) return null;
    var ax = axisOf(layout);
    var alongZ = Math.abs(ax.x) < 0.05, alongX = Math.abs(ax.z) < 0.05;
    if (!alongZ && !alongX) return null;                       // 축이 비스듬한 성당은 아직 없다(시험이 확인)
    var P = (places || placesTable())[layout.id] || {};
    var B = layout.bounds, sp = layout.spawn, cols = logic.colliders;
    // u = 축 방향 거리(입구 → 제대), v = 축 옆 거리(입구 기준)
    var lx = -ax.z, lz = ax.x;
    function U(x, z) { return (x - sp.x) * ax.x + (z - sp.z) * ax.z; }
    function V(x, z) { return (x - sp.x) * lx + (z - sp.z) * lz; }
    function at(u, v) { return { x: sp.x + ax.x * u + lx * v, z: sp.z + ax.z * u + lz * v }; }
    function inB(p) { return p.x >= B.x0 && p.x <= B.x1 && p.z >= B.z0 && p.z <= B.z1; }

    // 1) 제대 앞 자리
    var st, how;
    var ov = layout.stations && layout.stations.altar;
    if (ov) { st = { x: ov.x, z: ov.z }; how = 'layout'; }
    else {
      var best = 0;
      for (var s = 0; s < 400; s += 0.25) {
        var p = at(s, 0);
        if (!inB(p) || !freeAt(cols, p.x, p.z, K.R)) break;
        best = s;
      }
      st = at(best, 0); how = 'axis';
    }
    var uSt = U(st.x, st.z);

    // 2) 앞 가장자리: 단(바닥 높이 > 0) 위면 단의 첫 계단 발치까지 물러난다
    var front = uSt + K.FRONT_PAD, platHalf = 0;
    var fy = logic.floorY(st.x, st.z);
    var width = alongZ ? (B.x1 - B.x0) : (B.z1 - B.z0);
    if (fy > 0.02) {
      var zs = (logic.layoutZones && logic.layoutZones()) || [];
      var full = false;
      zs.forEach(function (z) {
        if (z.y <= 0.02 || st.x < z.x0 || st.x > z.x1 || st.z < z.z0 || st.z > z.z1) return;
        var zw = alongZ ? (z.x1 - z.x0) : (z.z1 - z.z0);
        if (zw >= width * K.FULL_WIDTH) full = true;
      });
      if (!full) {
        var foot = uSt;
        for (var b = 0; b < K.MAX_STEP_RUN; b += 0.05) { var q = at(uSt - b, 0); if (logic.floorY(q.x, q.z) <= 0.02) { foot = uSt - b; break; } }
        if (foot < uSt) {
          front = foot;
          // 단 폭: 축(v=0) 위 [foot, uSt+3] 을 지나는 높은 구역들의 옆 폭
          zs.forEach(function (z) {
            if (z.y <= 0.02) return;
            var a0 = U(z.x0, z.z0), a1 = U(z.x1, z.z1), v0 = V(z.x0, z.z0), v1 = V(z.x1, z.z1);
            if (Math.max(a0, a1) < foot - 0.01 || Math.min(a0, a1) > uSt + 3) return;
            if (Math.min(v0, v1) > 0 || Math.max(v0, v1) < 0) return;
            platHalf = Math.max(platHalf, Math.abs(v0), Math.abs(v1));
          });
          how += '+steps';
        }
      }
    }
    // 표의 front = 앞 가장자리의 세계 좌표(축이 z 면 z, x 면 x)
    if (typeof P.front === 'number') { front = alongZ ? (P.front - sp.z) * ax.z : (P.front - sp.x) * ax.x; how += '+table'; }

    // 3) 폭
    var halfW = platHalf > 0 ? platHalf + K.PLAT_PAD : K.HALF_W;
    if (typeof P.halfW === 'number') halfW = P.halfW;
    publicPoints(layout, logic).forEach(function (p) {
      var u = U(p[0], p[1]), v = Math.abs(V(p[0], p[1]));
      if (u < front - K.PUBLIC_GAP) return;
      if (v < halfW + K.PUBLIC_GAP) halfW = Math.max(K.MIN_HALF_W, v - K.PUBLIC_GAP);
    });

    // 4) AABB(축 정렬)
    var bb = { x0: B.x0, x1: B.x1, z0: B.z0, z1: B.z1 };
    var c0 = at(front, -halfW), c1 = at(front, halfW);
    var out;
    if (alongZ) {
      out = { x0: Math.max(B.x0, Math.min(c0.x, c1.x)), x1: Math.min(B.x1, Math.max(c0.x, c1.x)) };
      if (ax.z < 0) { out.z0 = bb.z0; out.z1 = c0.z; } else { out.z0 = c0.z; out.z1 = bb.z1; }
    } else {
      out = { z0: Math.max(B.z0, Math.min(c0.z, c1.z)), z1: Math.min(B.z1, Math.max(c0.z, c1.z)) };
      if (ax.x < 0) { out.x0 = bb.x0; out.x1 = c0.x; } else { out.x0 = c0.x; out.x1 = bb.x1; }
    }
    out.axis = ax; out.front = front; out.halfW = halfW; out.station = st; out.how = how;
    out.extra = (P.extra || []).map(function (r) { return { x0: Math.min(r.x0, r.x1), x1: Math.max(r.x0, r.x1), z0: Math.min(r.z0, r.z1), z1: Math.max(r.z0, r.z1) }; });
    return out;
  }

  // 금지 구역 객체(logic.reverence)
  function make(zone, layout) {
    var rects = zone ? [zone].concat(zone.extra || []) : [];
    var sp = layout.spawn || { x: 0, z: 0 };
    var rv = {
      zone: zone, rects: rects,
      inZone: function (x, z, pad) {
        pad = pad || 0;
        for (var q = 0; q < rects.length; q++) { var r = rects[q]; if (x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad) return true; }
        return false;
      },
      // p={x,z} 가 구역(+r) 안이면 구역 앞 가장자리(신랑 쪽) 밖으로 내린다. 바꿨으면 true.
      clamp: function (p, r) {
        r = r === undefined ? K.R : r;
        var hit = false;
        for (var q = 0; q < rects.length; q++) {
          var c = rects[q];
          if (!(p.x > c.x0 - r && p.x < c.x1 + r && p.z > c.z0 - r && p.z < c.z1 + r)) continue;
          var ax = zone.axis;
          if (q === 0 && Math.abs(ax.x) < 0.05) p.z = ax.z < 0 ? c.z1 + r : c.z0 - r;
          else if (q === 0) p.x = ax.x < 0 ? c.x1 + r : c.x0 - r;
          else {
            var l = p.x - c.x0, rt = c.x1 - p.x, tp = p.z - c.z0, bt = c.z1 - p.z, m = Math.min(l, rt, tp, bt);
            if (m === l) p.x = c.x0 - r; else if (m === rt) p.x = c.x1 + r; else if (m === tp) p.z = c.z0 - r; else p.z = c.z1 + r;
          }
          hit = true;
        }
        return hit;
      },
      // e: 0 인사 | 1 성호경 | 2 고개 숙임. st = {x,z, busy(앉음·기도·묵주기도·무릎)}. 돌려주는 값 -1 = 재생하지 않음.
      emoteFor: function (e, st) { return emoteFor(e, st, rv); },
      spawn: sp
    };
    return rv;
  }

  function emoteFor(e, st, rv) {
    e = e | 0;
    if (e === EMOTE.CROSS || e === EMOTE.BOW) return e;
    if (e !== EMOTE.WAVE) return -1;
    if (!st || st.busy) return EMOTE.BOW;
    if (rv) {
      if (rv.inZone(st.x, st.z, 2)) return EMOTE.BOW;
      var dx = st.x - rv.spawn.x, dz = st.z - rv.spawn.z;
      if (dx * dx + dz * dz > K.WAVE_NEAR_ENTRANCE * K.WAVE_NEAR_ENTRANCE) return EMOTE.BOW;
    }
    return EMOTE.WAVE;
  }

  var api = {
    K: K, EMOTE: EMOTE, derive: derive, make: make, freeAt: freeAt, axisOf: axisOf, publicPoints: publicPoints,
    active: null,
    // ChurchLogic.create 끝에서 부른다: 구역을 유도해 충돌체로 넣고 logic.reverence 를 단다.
    apply: function (logic, places) {
      var zone = derive(logic, places);
      var rv = make(zone, logic.layout);
      logic.reverence = rv;
      if (zone && logic.addKeepOut) rv.rects.forEach(function (r) { logic.addKeepOut({ x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1 }); });
      api.active = rv;
      return rv;
    },
    // 아바타(avatar.js)에서: 지금 자세·자리로 이모트를 거른다. 브라우저에서는 마지막으로 지은 성당 기준.
    filterEmote: function (e, av) {
      var busy = !!(av && (av.sitTarget || av.prayTarget || av.rosaryTarget || av.kneelTarget));
      var pos = av && av.root && av.root.position;
      return emoteFor(e, { x: pos ? pos.x : 0, z: pos ? pos.z : 0, busy: busy }, api.active);
    }
  };
  return api;
});
