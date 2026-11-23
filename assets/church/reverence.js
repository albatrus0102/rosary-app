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
      성당별 보정은 reverence_places.js (ChurchReverencePlaces[id] = {front, halfW, depth, extra:[{x0,x1,z0,z1}]}).
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
    FULL_WIDTH: 0.8, MAX_STEP_RUN: 10, WAVE_NEAR_ENTRANCE: 8, PLAT_MIN_HALF_W: 4.5, CENTRAL: 3, MIN_DEPTH: 2
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
      } else if (c.k === 2) {   // 두께 있는 선분(scene_logic normCollider)
        var sx = c.bx - c.ax, sz = c.bz - c.az, sl2 = sx * sx + sz * sz;
        var t = sl2 > 1e-12 ? ((x - c.ax) * sx + (z - c.az) * sz) / sl2 : 0;
        t = t < 0 ? 0 : (t > 1 ? 1 : t);
        var qx = x - (c.ax + sx * t), qz = z - (c.az + sz * t), rs = c.r + r;
        if (qx * qx + qz * qz < rs * rs) return false;
      } else {
        var dx = x - c.x, dz = z - c.z, rr = c.r + r;
        if (dx * dx + dz * dz < rr * rr) return false;
      }
    }
    return true;
  }

  // 여러 층: 입구(스폰) 층의 바닥 높이(layout.spawn.y 가 있으면 그 높이에서 잰다)
  function spawnLevel(logic) {
    var sp = logic.layout.spawn;
    return logic.floorY(sp.x, sp.z, sp.y === undefined ? null : sp.y);
  }

  function axisOf(layout) {
    var sx = 0, sz = 0, G = layout.seatGroups || [];
    for (var q = 0; q < G.length; q++) { var yaw = G[q].yaw || 0; sx += -Math.sin(yaw); sz += -Math.cos(yaw); }
    var l = Math.sqrt(sx * sx + sz * sz);
    if (l < 1e-6) return { x: 0, z: -1 };
    return { x: sx / l, z: sz / l };
  }

  // 신자가 쓰는 자리(좌석·촛불대·성모상·성수대·십자가의 길 판)
  // ly(여러 층만): 그 층(±1m)의 자리만 — 다른 층(아래 하부 성당의 좌석 등)은 이 층 제단 구역과 무관하다
  function publicPoints(layout, logic, ly) {
    var pts = [];
    function on(fy) { return ly === undefined || ly === null || fy === undefined || Math.abs(fy - ly) <= 1.0; }
    var gy = {};
    (layout.seatGroups || []).forEach(function (G) { gy[G.g] = G.y; });
    (logic.seats || []).forEach(function (s) { if (!on(s.fy)) return; pts.push([s.x, s.z]); var st = logic.standPos(s.id); if (st) pts.push([st.x, st.z]); });
    (logic.bands || []).forEach(function (b) { if (!on(gy[b.g])) return; pts.push(b.start); pts.push(b.end); });   // 신자석 줄 끝(여백 포함): 줄에 드나드는 통로
    var stands = (layout.candles && layout.candles.stands) || [];
    stands.forEach(function (S) { if (on(S.fy)) pts.push([S.x, S.z]); });
    (logic.slots || []).forEach(function (s) { if (on(s.fy)) pts.push([s.x, s.z]); });
    if (layout.shrine && on(layout.shrine.fy)) pts.push([layout.shrine.x, layout.shrine.z]);
    (layout.fonts || []).forEach(function (f) { if (on(f.fy)) pts.push([f.x, f.z]); });
    var cw = layout.crossWay;
    if (cw && cw.plaques) cw.plaques.forEach(function (p) { if (!on(p.fy)) return; pts.push([p.x, p.z]); if (p.stand) pts.push([p.stand.x, p.stand.z]); });
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
    // 여러 층(scene_logic levels): 제단은 입구(스폰)와 같은 층 — 그 층의 충돌체·바닥만 본다(아래층 벽이 축을 막지 않게)
    var ySp = logic.multi ? spawnLevel(logic) : null;
    if (logic.multi) cols = logic.collidersAt(ySp);
    function fl(x, z) { return ySp === null ? logic.floorY(x, z) : logic.floorY(x, z, ySp + 0.7); }
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
    var fy = fl(st.x, st.z), base0 = ySp === null ? 0 : ySp;
    if (fy > base0 + 0.02) {
      var zs = (logic.layoutZones && logic.layoutZones()) || [];
      {   // 단이 성당 폭 전체여도(익랑·넓은 제단) 같은 규칙: 신자는 첫 계단 앞(신자석 쪽)에서 멈춘다(2026-11-15 사용자 결정)
        // 제대가 놓인 단의 계단 발치 = 뒤로 걸으며 바닥이 내려간 뒤 1m 이상 평평한 곳(층계참·신랑 바닥)이 시작되는 곳.
        // (피렌체처럼 낮은 단(좌석이 있는 성가대석) 안에 높은 제단이 있으면 높은 제단 계단에서 멈춘다)
        var foot = uSt, base = 0, prev = fy, runStart = -1;
        for (var b = 0.05; b < K.MAX_STEP_RUN; b += 0.05) {
          var q = at(uSt - b, 0), y = fl(q.x, q.z);
          if (y < fy - 0.05 && Math.abs(y - prev) < 0.01) {
            if (runStart < 0) runStart = b;
            if (b - runStart >= 1.0 || y <= base0 + 0.02) { foot = uSt - runStart; base = y; break; }
          } else runStart = -1;
          prev = y;
        }
        if (foot < uSt) {
          front = foot;
          // 단 폭: 축(v=0) 위 [foot, uSt+3] 을 지나는, 층계참보다 높은 구역들의 옆 폭.
          // 단이 성당 폭 대부분(80%+)이면 익랑·넓은 단이라 폭은 기본(축 좌우 6m)으로 둔다(옆 벽 십자가의 길·경당 길을 남긴다).
          var width = alongZ ? (B.x1 - B.x0) : (B.z1 - B.z0);
          zs.forEach(function (z) {
            if (z.y <= base + 0.02) return;
            if ((alongZ ? z.x1 - z.x0 : z.z1 - z.z0) >= width * K.FULL_WIDTH) return;
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

    // 3) 폭과 깊이. 신자 자리(좌석·촛불대 등)는 1m 이상 비켜 둔다:
    //    축 옆(|v| >= CENTRAL)의 자리는 폭을 줄이고, 축 가까이의 자리(예: 성 베드로 앱스 좌석)는 구역을 그 앞에서 끊는다.
    //    끊긴 뒤 맨 뒤 신자 자리보다 더 깊은 곳(앱스 제대·주교좌)은 두 번째 구역으로 막는다.
    var halfW = platHalf > 0 ? Math.max(platHalf + K.PLAT_PAD, K.PLAT_MIN_HALF_W) : K.HALF_W;
    if (typeof P.halfW === 'number') halfW = P.halfW;
    var pub = publicPoints(layout, logic, ySp).map(function (p) { return { u: U(p[0], p[1]), v: Math.abs(V(p[0], p[1])) }; })
      .filter(function (p) { return p.u > front - K.PUBLIC_GAP; }).sort(function (a, b) { return a.u - b.u; });
    var far = typeof P.depth === 'number' ? front + P.depth : 1e9, lastCentral = -1e9;
    for (var i = 0; i < pub.length; i++) {
      var pp = pub[i];
      if (pp.v >= halfW + K.PUBLIC_GAP) continue;
      if (pp.v < K.CENTRAL) { if (pp.u < front + K.PUBLIC_GAP) continue; if (far > 1e8) far = pp.u - K.PUBLIC_GAP; if (pp.u > far) lastCentral = Math.max(lastCentral, pp.u); continue; }
      if (pp.u < far + K.PUBLIC_GAP) halfW = Math.max(K.MIN_HALF_W, pp.v - K.PUBLIC_GAP);
    }
    var segs = [[front, far]];
    if (far < 1e8 && lastCentral > -1e8) segs.push([lastCentral + K.PUBLIC_GAP, 1e9]);

    // 4) AABB(축 정렬). 첫 구역의 앞 가장자리가 '신랑 쪽'이다(clamp 가 그쪽으로 내린다).
    function rect(u0, u1) {
      var a = at(u0, -halfW), b2 = at(Math.min(u1, 1e4), halfW);
      var r = { x0: Math.max(B.x0, Math.min(a.x, b2.x)), x1: Math.min(B.x1, Math.max(a.x, b2.x)), z0: Math.max(B.z0, Math.min(a.z, b2.z)), z1: Math.min(B.z1, Math.max(a.z, b2.z)) };
      return (r.x1 - r.x0 > 0.5 && r.z1 - r.z0 > 0.5) ? r : null;
    }
    var out = rect(segs[0][0], segs[0][1]);
    if (!out) return null;
    out.extra = [];
    if (segs[1]) { var r2 = rect(segs[1][0], segs[1][1]); if (r2 && (alongZ ? r2.z1 - r2.z0 : r2.x1 - r2.x0) >= K.MIN_DEPTH) out.extra.push(r2); }
    (P.extra || []).forEach(function (r) { out.extra.push({ x0: Math.min(r.x0, r.x1), x1: Math.max(r.x0, r.x1), z0: Math.min(r.z0, r.z1), z1: Math.max(r.z0, r.z1) }); });
    out.axis = ax; out.front = front; out.halfW = halfW; out.station = st; out.how = how;
    // 제대 앞 자리(stations.js 가 쓴다): 구역 앞 가장자리 바로 앞, 축 위(지정 자리가 있으면 그 옆 위치). 무릎 꿇기·기도는 여기서.
    // 축 위가 막혀 있으면(라테라노 콘페시오 난간) 축을 따라 신자석 쪽으로 3m 까지 물러나고, 그래도 막히면 축에서 가장 가까운 빈 곳.
    var stand = null;
    for (var du = 0; du <= 3 && !stand; du += 0.25) { var c1 = at(front - K.R - 0.15 - du, 0); if (freeAt(cols, c1.x, c1.z, K.R + 0.05)) stand = c1; }
    for (var dv = 0; dv <= halfW && !stand; dv += 0.25) {
      for (var sg = 1; sg >= -1 && !stand; sg -= 2) { var c2 = at(front - K.R - 0.15, sg * dv); if (freeAt(cols, c2.x, c2.z, K.R + 0.05)) stand = c2; }
    }
    stand = stand || at(front - K.R - 0.15, 0);
    out.stand = { x: stand.x, z: stand.z };
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
    K: K, EMOTE: EMOTE, derive: derive, spawnLevel: spawnLevel, make: make, freeAt: freeAt, axisOf: axisOf, publicPoints: publicPoints,
    active: null,
    // ChurchLogic.create 끝에서 부른다: 구역을 유도해 충돌체로 넣고 logic.reverence 를 단다.
    apply: function (logic, places) {
      var zone = derive(logic, places);
      var rv = make(zone, logic.layout);
      logic.reverence = rv;
      // 여러 층: 금지 구역은 제단 층에서만 막는다(같은 자리 아래층 — 하부 성당·묘소 — 는 열어 둔다)
      var ly = logic.multi ? spawnLevel(logic) : null;
      if (zone && logic.addKeepOut) rv.rects.forEach(function (r) { var c = { x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1 }; if (ly !== null) { c.y0 = ly - 0.3; c.y1 = ly + 4; } logic.addKeepOut(c); });
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
