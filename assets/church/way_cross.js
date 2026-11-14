/* way_cross.js — 십자가의 길 14처 판(성당 안 순례). SPEC §30.
   ChurchWayCross.derive(o)   순수 계산(THREE 없음, Node 시험 tools/church_web/way_cross.test.mjs):
       o = {layout, logic, stations(ChurchStations 인스턴스), walls(ctx._.walls), windows, roses, glassSlots, n=14}
       → {plaques:[{n, index, side:'R'|'L', x, y(판 중심), z, nx, nz(실내 쪽 법선), w, h, wall:{...}, stand:{x,z,yaw}}], why}
     규칙(빌더를 고치지 않고 레이아웃·벽·충돌체에서 유도):
       - 신랑 축 = 좌석 방향 평균(제대 쪽 f). 입구 스폰에서 제대 앞 스테이션 쪽으로 [3m, 길이-3m] 구간.
       - 좌우(제대를 바라볼 때 오른쪽 R, 왼쪽 L)마다, 축에서 바깥으로 가며 '걸을 수 있는 가장 바깥 칸' 바로 바깥의 벽(ctx.wall 기록,
         축과 나란한 것)의 안쪽 면에 판을 건다. 벽 높이가 판 위(바닥+2.8m)를 넘어야 하고, 판(+여유 0.15m)이 그 벽의 창·사진 창·장미창과
         겹치지 않아야 하며, 판 앞 1.2~2.4m 에 충돌 없고 입구에서 닿는 '서는 자리'가 있고 그 자리에서 벽까지 직선으로 막히지 않아야 한다.
       - 순서는 실제 관례: 제대를 바라볼 때 오른쪽 벽의 제대 쪽에서 1처 → 입구 쪽으로 7처 → 왼쪽 벽 입구 쪽 8처 → 제대 쪽 14처(한 바퀴).
         한쪽에 7곳이 안 되면 다른 쪽에서 채운다(성당 전체 14곳이 안 되면 판을 걸지 않고 why 를 돌려준다).
       - layout.crossWay = {start:'R'|'L', front:{x,z}, plaques:[{x,z,face:[nx,nz]}…14]} 로 성당별로 정할 수 있다(선택).
         front: 그 점보다 제대 쪽에는 걸지 않는다(피렌체: 쿠폴라 아래 낮은 성가대 울타리).
   ChurchWayCross.create(App, H) → 판 그리기·근접 이벤트. H = {post}
       - 판 = 캔버스 아틀라스 한 장(14칸: 위 작은 십자가 + 금테 액자 + 그림 + 로마 숫자 판) 사각형 14개를 한 지오메트리로(draw call 1)
         + 액자 뒤판 상자 14개(조명 받는 나무, draw call 1). 그림 재질은 사진 창과 같은 셰이더(ChurchGlassView.shaders):
         조명·안개·SSAO 없음, 알파 0 표시로 최종 패스의 색보정·톤매핑을 건너뛴다(걷기 프로필에서도 그림 색 그대로), 밤에는 어둡게.
       - 그림은 성당마다 다른 연작(대체 성화)이다: cross_data.js 의 series 가 성당 id → 연작을 정하고, 그 연작의 아틀라스
         (cross_pack.js 또는 cross_pack_<id>.js, WebP data URI)를 성당에 들어올 때 비동기로 읽는다(packLoader). 연작 파일을 못 읽으면
         기본 연작(푸겔)으로, 그것도 못 읽으면 판을 걸지 않는다(이벤트·걷기도 없음). 성당을 옮기면 앞 연작은 내린다.
       - 이벤트: {e:'crossNear', n:1..14|null}(서는 자리 1.8m 안에 들어오면, 2.6m 밖으로 나가면 null; 걷는 중에만).
       - walkTo({kind:'cross', index:0..13}) 는 main.js 가 station(index) 로 서는 자리를 얻어 걷는다. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ChurchWayCross = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // 판 치수(m): 액자 폭·높이, 그 위 십자가 장식, 바닥에서 액자 아래까지
  // 캔버스 칸의 판 영역 248×504 = 위 십자가 76 + 액자 428(폭 전체). 판 사각형 = 액자 폭 × 칸 비율.
  var P = { frameW: 0.7, bottom: 1.35, wallGap: 0.02, depth: 0.05, quadGap: 0.004 };
  P.quadW = P.frameW;
  P.quadH = P.quadW * 504 / 248;
  P.frameH = P.quadH * 428 / 504;
  P.crossH = P.quadH * 76 / 504;
  var NEAR_IN = 1.8, NEAR_OUT = 2.6, NEAR_EVERY = 0.2;

  function seatAxis(layout) {
    var sx = 0, sz = 0, g = layout.seatGroups || [];
    for (var i = 0; i < g.length; i++) { var y = g[i].yaw || 0; sx += -Math.sin(y); sz += -Math.cos(y); }
    var l = Math.sqrt(sx * sx + sz * sz);
    if (l < 1e-6) return { x: 0, z: -1 };
    return { x: sx / l, z: sz / l };
  }

  // 벽 기록 하나를 축 좌표로: along(축 방향 s)·lateral(옆 방향 t) 구간, 안쪽 면 t. 축과 나란하지 않으면 null.
  function wallInAxis(w, sp, f, r, side) {
    var dx = w.x1 - w.x0, dz = w.z1 - w.z0, len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.5) return null;
    var dot = Math.abs((dx * f.x + dz * f.z) / len);
    if (dot < 0.995) return null;
    var s0 = (w.x0 - sp.x) * f.x + (w.z0 - sp.z) * f.z, s1 = (w.x1 - sp.x) * f.x + (w.z1 - sp.z) * f.z;
    var t = ((w.x0 - sp.x) * r.x + (w.z0 - sp.z) * r.z) * side;     // 바깥쪽이 + 인 옆 거리(벽 중심선)
    return { s0: Math.min(s0, s1), s1: Math.max(s0, s1), t: t, inner: t - w.t / 2, y0: w.y || 0, y1: (w.y || 0) + w.h, rec: w };
  }

  function derive(o) {
    var layout = o.layout, logic = o.logic, S = o.stations, N = o.n || 14;
    var sp = layout.spawn, f = seatAxis(layout), r = { x: -f.z, z: f.x };   // r = 제대를 바라볼 때 오른쪽
    var st = S.stations(), altar = st.altar;
    var len = (altar.x - sp.x) * f.x + (altar.z - sp.z) * f.z;
    if (!(len > 12)) return { plaques: [], why: 'short_nave' };
    var sB = 3.0, sF = len - 3.0;
    // layout.crossWay.front = {x,z}: 판을 이 점(축 방향)보다 제대 쪽에는 걸지 않는다(낮은 성가대 울타리 등, 성당별 자료)
    var cwF = layout.crossWay && layout.crossWay.front;
    if (cwF) sF = Math.min(sF, (cwF.x - sp.x) * f.x + (cwF.z - sp.z) * f.z);
    var B = layout.bounds, maxT = Math.max(B.x1 - B.x0, B.z1 - B.z0);
    var tmp = { x: 0, z: 0 };
    function free(x, z) { tmp.x = x; tmp.z = z; return !logic.moveCircle(tmp, 0, 0); }
    function at(s, t, side) { return { x: sp.x + f.x * s + r.x * t * side, z: sp.z + f.z * s + r.z * t * side }; }
    function inB(p) { return p.x >= B.x0 && p.x <= B.x1 && p.z >= B.z0 && p.z <= B.z1; }
    // 막힌 것(창·장미창·사진 창): 벽 평면에서 along/높이 구간
    var openings = [];
    (o.windows || []).forEach(function (w) {
      var rise = w.top === 'pointed' ? w.w * 0.72 : (w.top === 'round' || w.top === 'trefoil' ? w.w / 2 : 0);
      openings.push({ x: w.x, z: w.z, nx: w.F ? w.F.nx : 0, nz: w.F ? w.F.nz : 0, hw: w.w / 2, y0: w.y, y1: w.y + w.h + rise });
    });
    (o.roses || []).forEach(function (w) { openings.push({ x: w.x, z: w.z, nx: w.F ? w.F.nx : 0, nz: w.F ? w.F.nz : 0, hw: w.r, y0: w.y - w.r, y1: w.y + w.r }); });
    (o.glassSlots || []).forEach(function (w) { openings.push({ x: w.x, z: w.z, nx: w.nx, nz: w.nz, hw: w.w / 2, y0: w.y - w.h / 2, y1: w.y + w.h / 2 }); });
    var avoid = [altar];
    (st.candle || []).forEach(function (c) { avoid.push(c); avoid.push(c.stand); });
    (st.font || []).forEach(function (c) { avoid.push(c); });

    var ov = layout.crossWay && layout.crossWay.plaques;
    var cands = { R: [], L: [] };
    [1, -1].forEach(function (side) {
      var key = side > 0 ? 'R' : 'L';
      var walls = [];
      (o.walls || []).forEach(function (w) { var a = wallInAxis(w, sp, f, r, side); if (a && a.t > 0) walls.push(a); });
      // 충돌 상자(AABB) 중 벽처럼 생긴 것(옆 두께 0.2m 이상, 축 방향 2.9m 이상): 빌더가 ctx.wall 대신 상자로 벽을 짓는 성당이 많다.
      (logic.colliders || []).forEach(function (c) {
        if (c.k !== 0 && c.x0 === undefined) return;
        if (c.r !== undefined && c.x0 === undefined) return;
        var xs = [c.x0, c.x1], zs = [c.z0, c.z1], smin = 1e9, smax = -1e9, tmin = 1e9, tmax = -1e9;
        for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) {
          var dx = xs[a] - sp.x, dz = zs[b] - sp.z, sv = dx * f.x + dz * f.z, tv = (dx * r.x + dz * r.z) * side;
          smin = Math.min(smin, sv); smax = Math.max(smax, sv); tmin = Math.min(tmin, tv); tmax = Math.max(tmax, tv);
        }
        if (tmax - tmin < 0.2 || smax - smin < 2.9 || tmin <= 0) return;   // 측랑 제단·무덤(폭 2~2.8m) 같은 가구 앞면은 벽으로 보지 않는다
        walls.push({ s0: smin, s1: smax, t: (tmin + tmax) / 2, inner: tmin, y0: -1e9, y1: 1e9, collider: true });
      });
      // 걷기 경계(bounds) 변: 벽을 경계에 맞춰 지은 성당(마조레 등). 축과 나란한 변만, 우선순위는 가장 낮다.
      [[B.x0, 0], [B.x1, 0], [B.z0, 1], [B.z1, 1]].forEach(function (e) {
        var ex = e[1] === 0 ? 1 : 0;   // 변이 x=상수면 축 z 와 나란
        var along = ex ? Math.abs(f.z) : Math.abs(f.x);
        if (along < 0.995) return;
        var tv = e[1] === 0 ? (e[0] - sp.x) * r.x * side : (e[0] - sp.z) * r.z * side;
        if (tv <= 0) return;
        walls.push({ s0: -1e9, s1: 1e9, t: tv, inner: tv, y0: -1e9, y1: 1e9, collider: true, bound: true });
      });
      for (var s = sB; s <= sF + 1e-6; s += 0.25) {
        // 걸을 수 있는 가장 바깥 칸(옆 거리 t)
        // (입구에서 닿는 칸만: 두꺼운 벽 바깥의 빈 곳은 건너뛴다)
        var tFree = -1;
        for (var t = 0; t <= maxT; t += 0.1) {
          var p = at(s, t, side);
          if (!inB(p)) break;
          if (free(p.x, p.z) && S.isReachable(p.x, p.z)) tFree = t;
        }
        if (tFree < 0) continue;
        var pf = at(s, tFree, side);
        // 그 바로 바깥의 벽(안쪽 면이 tFree 와 tFree+1.2 사이). 아바타 반경(0.3)만큼은 늘 떨어져 있다.
        var best = null;
        for (var k = 0; k < walls.length; k++) {
          var W = walls[k];
          if (W.inner < tFree - 0.05 || W.inner > tFree + 1.2) continue;
          var mg = W.collider && !W.bound ? 0.35 : 0.1;   // 상자 벽은 보이는 면이 충돌 상자보다 짧을 수 있어 여유를 더 둔다(성 베드로 기둥 면)
          if (s - P.frameW / 2 - mg < W.s0 || s + P.frameW / 2 + mg > W.s1) continue;
          var fy = logic.floorY(pf.x, pf.z);
          if (W.y0 > fy + P.bottom - 0.1 || W.y1 < fy + P.bottom + P.frameH + P.crossH + 0.05) continue;
          if (!best || W.inner < best.inner - 1e-6 || (Math.abs(W.inner - best.inner) < 1e-6 && best.bound)) best = W;
        }
        if (!best) continue;
        var floorY = logic.floorY(pf.x, pf.z);
        var tPlate = best.inner - P.wallGap - P.depth - P.quadGap;
        var c = at(s, tPlate, side), nx = -r.x * side, nz = -r.z * side;
        var yc = floorY + P.bottom + P.quadH / 2;
        // 창과 겹치지 않기(같은 벽 면 근처, 실내 쪽을 보는 창)
        var y0 = floorY + P.bottom - 0.15, y1 = floorY + P.bottom + P.frameH + P.crossH + 0.15, hit = false;
        for (var q = 0; q < openings.length; q++) {
          var O = openings[q];
          if (O.nx * nx + O.nz * nz < 0.7) continue;
          var oT = ((O.x - sp.x) * r.x + (O.z - sp.z) * r.z) * side;
          if (Math.abs(oT - best.inner) > 1.0) continue;
          var oS = (O.x - sp.x) * f.x + (O.z - sp.z) * f.z;
          if (Math.abs(oS - s) > O.hw + P.frameW / 2 + 0.15) continue;
          if (O.y1 < y0 || O.y0 > y1) continue;
          hit = true; break;
        }
        if (hit) continue;
        // 판 바로 앞(벽에서 0.35m)이 판 폭 전체에서 비어 있어야 한다(벽 앞 가구·기둥에 가려 걸리지 않게)
        var blocked = false;
        for (var e2 = -1; e2 <= 1 && !blocked; e2++) {
          var fp = at(s + e2 * P.frameW / 2, best.inner - 0.35, side);
          if (!free(fp.x, fp.z)) blocked = true;
        }
        if (blocked) continue;
        // 서는 자리: 판 앞 1.2~2.4m, 충돌 없고 닿고 판까지 직선
        var stand = null;
        for (var d = 1.3; d <= 2.41 && !stand; d += 0.1) {
          var offs = [0, 0.4, -0.4];
          for (var oi = 0; oi < offs.length; oi++) {
            var q2 = at(s + offs[oi], best.inner - d, side);
            if (!inB(q2) || !free(q2.x, q2.z) || !S.isReachable(q2.x, q2.z)) continue;
            var nearWall = at(s, best.inner - 0.35, side);
            if (free(nearWall.x, nearWall.z) && !S.lineClear(q2, nearWall)) continue;
            if (!free(nearWall.x, nearWall.z) && !S.lineClear(q2, at(s, Math.max(tFree, best.inner - d + 0.3), side))) continue;
            stand = { x: q2.x, z: q2.z, yaw: Math.atan2(-(c.x - q2.x), -(c.z - q2.z)) };
            break;
          }
        }
        if (!stand) continue;
        var tooClose = false;
        for (var a = 0; a < avoid.length; a++) if (Math.hypot(avoid[a].x - stand.x, avoid[a].z - stand.z) < 1.8) { tooClose = true; break; }
        if (tooClose) continue;
        // 촛불대 가구 앞면에 걸지 않는다(판 중심이 스탠드에서 2m 안이면 버린다)
        var cs = (layout.candles && layout.candles.stands) || [];
        for (var ci2 = 0; ci2 < cs.length && !tooClose; ci2++) if (Math.hypot(cs[ci2].x - c.x, cs[ci2].z - c.z) < 2.0 + (cs[ci2].slots > 48 ? 1.5 : 0)) tooClose = true;
        // 넓은 봉헌대(초 칸이 판 앞을 가림): 어느 초 칸이든 판에서 2m 안이면 버린다
        var sl = logic.slots || [];
        for (var si2 = 0; si2 < sl.length && !tooClose; si2++) if (Math.hypot(sl[si2].x - c.x, sl[si2].z - c.z) < 2.0) tooClose = true;
        if (tooClose) continue;
        cands[key].push({ s: s, side: key, x: c.x, y: yc, z: c.z, nx: nx, nz: nz, w: P.quadW, h: P.quadH, wall: { inner: best.inner, s0: best.s0, s1: best.s1 }, stand: stand });
      }
    });

    // 한쪽 7곳: 목표 s 를 고르게 나눠 가장 가까운 후보(이웃 판과 2.2m 이상)
    function pick(list, want, lo, hi, gap) {
      gap = gap || 2.2;
      var out = [];
      if (!list.length || want <= 0) return out;
      var used = {};
      for (var k = 0; k < want; k++) {
        var target = lo + (hi - lo) * (k + 0.5) / want, best = -1, bd = 1e9;
        for (var i = 0; i < list.length; i++) {
          if (used[i]) continue;
          var ok = true;
          for (var j = 0; j < out.length; j++) if (Math.abs(out[j].s - list[i].s) < gap) { ok = false; break; }
          if (!ok) continue;
          var dd = Math.abs(list[i].s - target);
          if (dd < bd) { bd = dd; best = i; }
        }
        if (best < 0) break;
        used[best] = 1; out.push(list[best]);
      }
      return out;
    }
    var half = Math.ceil(N / 2), R, L;
    // 판 사이 2.2m 를 먼저, 자리가 모자라면 1.6m 까지 좁힌다(성 베드로: 거대한 기둥 면과 봉헌대 사이)
    for (var gi = 0; gi < 2; gi++) {
      var gap = gi ? 1.6 : 2.2;
      R = pick(cands.R, half, sB, sF, gap); L = pick(cands.L, N - half, sB, sF, gap);
      if (R.length < half && L.length >= N - half) L = pick(cands.L, N - R.length, sB, sF, gap);
      else if (L.length < N - half && R.length >= half) R = pick(cands.R, N - L.length, sB, sF, gap);
      if (R.length + L.length >= N) break;
    }
    if (R.length + L.length < N) return { plaques: [], why: 'room', counts: { R: cands.R.length, L: cands.L.length, pickR: R.length, pickL: L.length } };
    // 순서: 오른쪽 벽 제대 쪽(큰 s) → 입구 쪽, 왼쪽 벽 입구 쪽 → 제대 쪽. layout.crossWay.start='L' 이면 좌우를 바꾼다.
    R.sort(function (a, b) { return b.s - a.s; });
    L.sort(function (a, b) { return a.s - b.s; });
    var first = layout.crossWay && layout.crossWay.start === 'L' ? L.slice().reverse() : R;
    var second = layout.crossWay && layout.crossWay.start === 'L' ? R.slice().reverse() : L;
    var all = first.concat(second);
    all.forEach(function (p, i) { p.n = i + 1; p.index = i; });
    if (ov && ov.length === N) {
      // 레이아웃이 직접 정한 자리(선택): 위치·방향만 바꾸고 서는 자리는 다시 찾는다(시험이 확인).
      all = ov.map(function (q, i) {
        var fl = Math.sqrt(q.face[0] * q.face[0] + q.face[1] * q.face[1]) || 1, nx2 = q.face[0] / fl, nz2 = q.face[1] / fl;
        var fy2 = logic.floorY(q.x, q.z), sx = q.x + nx2 * 1.6, sz = q.z + nz2 * 1.6;
        return { n: i + 1, index: i, side: q.side || '', x: q.x, y: fy2 + P.bottom + P.quadH / 2, z: q.z, nx: nx2, nz: nz2, w: P.quadW, h: P.quadH, stand: { x: sx, z: sz, yaw: Math.atan2(-(q.x - sx), -(q.z - sz)) } };
      });
    }
    return { plaques: all, why: 'ok', counts: { R: cands.R.length, L: cands.L.length } };
  }

  // 근접 판정(순수): 서는 자리에서 NEAR_IN 안에 들어오면 그 판, 이미 그 판이면 NEAR_OUT 까지 유지. 가장 가까운 판 하나 또는 null.
  function nearPlaque(plaques, x, z, cur) {
    var best = null, bd = 1e9;
    for (var i = 0; i < plaques.length; i++) {
      var p = plaques[i], d = Math.hypot(x - p.stand.x, z - p.stand.z);
      var lim = cur && p.n === cur.n ? NEAR_OUT : NEAR_IN;
      if (d <= lim && d < bd) { bd = d; best = p; }
    }
    return best;
  }

  // ---------------- 그림 연작(대체 성화) 싣기 ----------------
  // 성당마다 다른 14처 연작을 건다(data/stations_series.json → cross_data.js 의 series). 실제 그 성당의 14처가 아니라
  // 저작권이 끝난 대체 성화다(앱이 묵상 시트·출처 화면에서 밝힌다).
  //   packLoader(root, doc) → { seriesFor(churchId), load(id), release(keepId), resident(), stats }
  //   - 기본 연작(series.default)은 cross_pack.js → window.ChurchCrossPack, 나머지는 cross_pack_<id>.js → window.ChurchCrossPacks[id].
  //   - load(id): <script> 로 읽는다. 못 읽으면 기본 연작으로 물러난다(stats.fallbacks). 기본 연작도 못 읽으면 거부.
  //   - release(keepId): keepId 가 아닌 연작의 <script>·data URI 문자열을 내린다(텍스처는 create().clear 가 dispose).
  //   doc 은 시험에서 가짜로 넣는다(createElement('script') + head.appendChild 만 쓴다).
  function packLoader(root, doc) {
    var loading = {}, tags = {}, stats = { loads: 0, fallbacks: 0, released: 0 };
    function conf() {
      var S = root.ChurchCrossData && root.ChurchCrossData.series;
      return S && S.packs && S.packs[S.default] ? S : { default: 'fugel', churches: {}, packs: { fugel: { file: 'cross_pack.js' } } };
    }
    function seriesFor(churchId) {
      var S = conf(), id = S.churches && S.churches[churchId];
      if (!id || !S.packs[id]) id = S.default;
      return { id: id, file: S.packs[id].file, isDefault: id === S.default };
    }
    function get(id) {
      var S = conf(), p = null;
      if (root.ChurchCrossPacks && root.ChurchCrossPacks[id]) p = root.ChurchCrossPacks[id];
      else if (id === S.default && root.ChurchCrossPack) p = root.ChurchCrossPack;
      if (p && !p.id) p.id = id;
      return p;
    }
    function loadOne(id) {
      var have = get(id);
      if (have) return Promise.resolve(have);
      if (loading[id]) return loading[id];
      var S = conf();
      if (!S.packs[id] || !doc) return Promise.reject(new Error('pack ' + id));
      loading[id] = new Promise(function (res, rej) {
        var s = doc.createElement('script');
        s.src = S.packs[id].file;
        s.onload = function () { delete loading[id]; var p = get(id); if (p) { stats.loads++; res(p); } else rej(new Error('pack ' + id)); };
        s.onerror = function () { delete loading[id]; if (tags[id] === s) delete tags[id]; if (s.parentNode) s.parentNode.removeChild(s); rej(new Error('pack ' + id)); };
        tags[id] = s;
        doc.head.appendChild(s);
      });
      return loading[id];
    }
    function load(id) {
      var S = conf();
      return loadOne(id).catch(function (e) {
        if (id === S.default) throw e;
        stats.fallbacks++;
        if (root.console) root.console.warn('[church] way of cross: series ' + id + ' → ' + S.default);
        return loadOne(S.default);
      });
    }
    function release(keepId) {
      var S = conf(), ids = Object.keys(S.packs);
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (id === keepId || loading[id]) continue;
        var had = false;
        if (root.ChurchCrossPacks && root.ChurchCrossPacks[id]) { delete root.ChurchCrossPacks[id]; had = true; }
        if (id === S.default && root.ChurchCrossPack) { root.ChurchCrossPack = null; had = true; }
        if (tags[id]) { if (tags[id].parentNode) tags[id].parentNode.removeChild(tags[id]); delete tags[id]; }
        if (had) stats.released++;
      }
    }
    function resident() {
      var S = conf(), out = [];
      Object.keys(S.packs).forEach(function (id) { if (get(id)) out.push(id); });
      return out;
    }
    return { seriesFor: seriesFor, load: load, release: release, resident: resident, stats: stats };
  }

  // ---------------- 그리기(브라우저) ----------------
  // 캔버스 칸 하나에 판(십자가 장식 + 금테 액자 + 그림 + 로마 숫자 판)을 그린다. 칸 = 256×512(high) 또는 128×256(low), 가장자리 4px 여백.
  function drawPlaque(g, img, pack, idx, ox, oy, k, roman) {
    var W = 248 * k, H = 504 * k, x0 = ox + 4 * k, y0 = oy + 4 * k;
    var gold = '#b8913f', goldHi = '#e2c27a', wood = '#3b2a1e', woodHi = '#5a4130';
    // 위 십자가
    var cx = x0 + W / 2, barW = 13 * k;
    g.fillStyle = gold;
    g.fillRect(cx - barW / 2, y0 + 4 * k, barW, 74 * k);
    g.fillRect(cx - 26 * k, y0 + 22 * k, 52 * k, barW);
    g.fillStyle = goldHi;
    g.fillRect(cx - barW / 2 + 2 * k, y0 + 6 * k, 3 * k, 70 * k);
    // 액자(금테 + 짙은 나무 판)
    var fy = y0 + 76 * k, fh = H - 76 * k;
    g.fillStyle = gold; g.fillRect(x0, fy, W, fh);
    g.fillStyle = goldHi; g.fillRect(x0 + 3 * k, fy + 3 * k, W - 6 * k, 3 * k);
    g.fillStyle = wood; g.fillRect(x0 + 10 * k, fy + 10 * k, W - 20 * k, fh - 20 * k);
    g.fillStyle = woodHi; g.fillRect(x0 + 10 * k, fy + 10 * k, W - 20 * k, 2 * k);
    // 그림(액자 안쪽 위, 비율 0.81) + 얇은 금 테두리
    var pw = W - 40 * k, ph = Math.round(pw / 0.812), px = x0 + 20 * k, py = fy + 20 * k;
    g.fillStyle = goldHi; g.fillRect(px - 3 * k, py - 3 * k, pw + 6 * k, ph + 6 * k);
    if (img) {
      var c = idx % pack.cols, rr = Math.floor(idx / pack.cols);
      g.drawImage(img, c * pack.cellW, rr * pack.cellH, pack.cellW, pack.cellH, px, py, pw, ph);
    }
    // 로마 숫자 판
    var ny = py + ph + 12 * k, nh = fy + fh - 18 * k - ny;
    g.fillStyle = '#2a1d14'; g.fillRect(px, ny, pw, nh);
    g.fillStyle = goldHi;
    g.font = 'bold ' + Math.round(Math.min(nh * 0.62, 64 * k)) + 'px Georgia, "Times New Roman", serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(roman, cx, ny + nh / 2 + 2 * k);
  }

  function create(App, H) {
    var root = typeof window !== 'undefined' ? window : this;
    var T = root.THREE, post = H.post;
    var plaques = [], token = 0, mesh = null, mat = null, back = null, backMat = null, tex = null, ready = false;
    var nearCur = null, nearT = 0, lastN, series = null, stats = { loads: 0, errors: 0, resident: 0 };
    var ray = T ? new T.Raycaster() : null, vN = T ? new T.Vector2() : null;
    var packs = packLoader(root, typeof document !== 'undefined' ? document : null);

    function loadImg(src) {
      return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('img')); }; im.src = src; });
    }

    function clear() {
      token++;
      if (mesh) { if (mesh.parent) mesh.parent.remove(mesh); mesh.geometry.dispose(); mat.dispose(); mesh = null; mat = null; }
      if (back) { if (back.parent) back.parent.remove(back); back.geometry.dispose(); backMat.dispose(); back = null; backMat = null; }
      if (tex) { tex.dispose(); tex = null; }
      plaques = []; ready = false; nearCur = null; stats.resident = 0;
      if (lastN) { lastN = null; post({ e: 'crossNear', n: null }); }
    }

    function buildAtlas(img, pack) {
      var low = App.R && App.R.tier === 'low', k = low ? 0.5 : 1, cw = 256 * k, ch = 512 * k;
      var cv = document.createElement('canvas'); cv.width = 2048 * k; cv.height = 1024 * k;
      var g = cv.getContext('2d');
      var data = root.ChurchCrossData && root.ChurchCrossData.stations;
      for (var i = 0; i < 14; i++) {
        var col = i % 8, row = Math.floor(i / 8);
        drawPlaque(g, img, pack, i, col * cw, row * ch, k, data && data[i] ? data[i].roman : String(i + 1));
      }
      var caps = App.renderer.capabilities, t = new T.CanvasTexture(cv);
      t.encoding = caps.isWebGL2 ? T.sRGBEncoding : T.LinearEncoding;
      t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter;
      t.anisotropy = Math.min(low ? 4 : 8, caps.getMaxAnisotropy());
      t.flipY = true;
      App.renderer.initTexture(t);
      return t;
    }

    function buildMeshes() {
      var n = plaques.length, pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), idx = [];
      plaques.forEach(function (p, i) {
        var rx = p.nz, rz = -p.nx, hw = p.w / 2, hh = p.h / 2, o = i * 12, c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        var col = i % 8, row = Math.floor(i / 8), u0 = col / 8, u1 = (col + 1) / 8, v1 = 1 - row / 2, v0 = 1 - (row + 1) / 2;
        // 칸 가장자리 4px 여백을 빼고 판 영역만
        var du = (u1 - u0) * 4 / 256, dv = (v1 - v0) * 4 / 512;
        for (var k = 0; k < 4; k++) {
          pos[o + k * 3] = p.x + rx * hw * c[k][0]; pos[o + k * 3 + 1] = p.y + hh * c[k][1]; pos[o + k * 3 + 2] = p.z + rz * hw * c[k][0];
          uv[i * 8 + k * 2] = c[k][0] > 0 ? u1 - du : u0 + du; uv[i * 8 + k * 2 + 1] = c[k][1] > 0 ? v1 - dv : v0 + dv;
        }
        idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
      });
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeBoundingSphere();
      var Sh = root.ChurchGlassView.shaders, caps = App.renderer.capabilities;
      mat = new T.ShaderMaterial({
        uniforms: { uMapA: { value: tex }, uMapB: { value: null }, uMix: { value: 0 }, uBias: { value: -0.5 }, uK: { value: 0.92 }, uTint: { value: new T.Vector3(1, 1, 1) }, uRefl: { value: new T.Vector3(0, 0, 0) },
          uDecode: { value: caps.isWebGL2 ? 0 : 1 }, uSelfTone: { value: 0 }, uDebug: { value: 0 }, uFade: { value: 1 } },
        vertexShader: Sh.vs, fragmentShader: Sh.fs, extensions: { derivatives: true },
        fog: false, lights: false, toneMapped: false, transparent: true, depthWrite: true,
        blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.SrcAlphaFactor, blendDst: T.OneMinusSrcAlphaFactor,
        blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneMinusSrcAlphaFactor
      });
      mesh = new T.Mesh(geo, mat);
      mesh.renderOrder = 5.5; mesh.userData.noAO = true; mesh.userData.wayCross = true; mesh.castShadow = false; mesh.receiveShadow = false;
      App.world.group.add(mesh);
      // 액자 뒤판(나무 상자): 조명을 받아 벽에서 떠 보이게
      var bp = [], bi = [], bn = [];
      plaques.forEach(function (p) {
        var rx = p.nz, rz = -p.nx, hw = P.frameW / 2, yb = p.y - p.h / 2, yt = yb + P.frameH;
        var f0 = -(P.depth + P.quadGap), f1 = -P.quadGap;   // 판 앞면에서 뒤로
        function v(a, y, d) { return [p.x + rx * hw * a + p.nx * d, y, p.z + rz * hw * a + p.nz * d]; }
        var faces = [
          [v(-1, yb, f1), v(1, yb, f1), v(1, yt, f1), v(-1, yt, f1), [p.nx, 0, p.nz]],
          [v(1, yb, f1), v(1, yb, f0), v(1, yt, f0), v(1, yt, f1), [rx, 0, rz]],
          [v(-1, yb, f0), v(-1, yb, f1), v(-1, yt, f1), v(-1, yt, f0), [-rx, 0, -rz]],
          [v(-1, yt, f1), v(1, yt, f1), v(1, yt, f0), v(-1, yt, f0), [0, 1, 0]],
          [v(-1, yb, f0), v(1, yb, f0), v(1, yb, f1), v(-1, yb, f1), [0, -1, 0]]
        ];
        faces.forEach(function (fc) {
          var b = bp.length / 3;
          for (var q = 0; q < 4; q++) { bp.push(fc[q][0], fc[q][1], fc[q][2]); bn.push(fc[4][0], fc[4][1], fc[4][2]); }
          // 앞면이 법선 쪽을 보도록 감기 방향을 맞춘다
          var A = fc[0], Bv = fc[1], Cv = fc[2], ux = Bv[0] - A[0], uy = Bv[1] - A[1], uz = Bv[2] - A[2], wx = Cv[0] - A[0], wy = Cv[1] - A[1], wz = Cv[2] - A[2];
          var cxp = uy * wz - uz * wy, cyp = uz * wx - ux * wz, czp = ux * wy - uy * wx;
          if (cxp * fc[4][0] + cyp * fc[4][1] + czp * fc[4][2] >= 0) bi.push(b, b + 1, b + 2, b, b + 2, b + 3);
          else bi.push(b, b + 2, b + 1, b, b + 3, b + 2);
        });
      });
      var bg = new T.BufferGeometry();
      bg.setAttribute('position', new T.BufferAttribute(new Float32Array(bp), 3));
      bg.setAttribute('normal', new T.BufferAttribute(new Float32Array(bn), 3));
      bg.setIndex(bi); bg.computeBoundingSphere();
      backMat = new T.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.6, metalness: 0 });
      back = new T.Mesh(bg, backMat);
      back.castShadow = false; back.receiveShadow = true; back.userData.wayCrossBack = true;
      App.world.group.add(back);
    }

    // 성당을 지은 직후(main.js loadWorld)
    function load(world) {
      clear();
      if (!world || world.builder.viewing || !App.stations || !root.ChurchGlassView) return;
      var S_ = world.ctx && world.ctx._;
      var res = derive({ layout: world.layout, logic: world.logic, stations: App.stations, walls: S_ ? S_.walls : [], windows: S_ ? S_.windows : [], roses: S_ ? S_.roses : [], glassSlots: world.glassSlots ? world.glassSlots() : [] });
      plaques = res.plaques; App.crossWhy = res.why;
      if (!plaques.length) return;
      var tok = token; stats.loads++;
      // 이 성당의 그림 연작(대체 성화) 하나만 싣는다. 다른 연작의 아틀라스 문자열·<script> 는 내린다(성당을 옮겨도 한 연작만 남는다).
      var ser = packs.seriesFor(world.id);
      series = ser.id; packs.release(ser.id);
      packs.load(ser.id).then(function (pack) { return loadImg(pack.src).then(function (img) { return { img: img, pack: pack }; }); }).then(function (o) {
        if (tok !== token) { packs.release(series); return; }   // 그 사이 성당이 바뀌었다: 늦게 온 연작은 내린다
        series = o.pack.id || ser.id;   // 연작 파일을 못 읽어 기본 연작으로 물러났으면 그 id
        tex = buildAtlas(o.img, o.pack);
        buildMeshes();
        ready = true; stats.resident = 1;
      }).catch(function (e) {
        if (tok !== token) return;
        stats.errors++; plaques = [];
        if (root.console) console.warn('[church] way of cross: ' + (e && e.message));
      });
    }

    function update(dt, me, cam) {
      if (!ready) return;
      var env = App.world && App.world.env, night = env && env.night ? env.night : 0;
      var self = App.R.tier !== 'low' && root.ThreeX && root.ThreeX.EffectComposer ? 0 : 1;
      mat.uniforms.uK.value = 0.92 * (1 - 0.62 * night); mat.uniforms.uSelfTone.value = self;
      mat.blendSrcAlpha = self ? T.OneFactor : T.ZeroFactor;
      nearT += dt;
      if (nearT < NEAR_EVERY || !me) return;
      nearT = 0;
      var best = me.mode === 'walk' ? nearPlaque(plaques, me.x, me.z, nearCur) : null;
      nearCur = best;
      var n = best ? best.n : null;
      if (n !== (lastN || null)) { lastN = n; post({ e: 'crossNear', n: n }); }
    }

    // 화면 NDC 로 판을 고른다 → index 또는 -1
    function pick(nx, ny, cam) {
      if (!ready) return -1;
      vN.set(nx, ny); ray.setFromCamera(vN, cam);
      var o = ray.ray.origin, d = ray.ray.direction, best = -1, bt = 1e9;
      for (var i = 0; i < plaques.length; i++) {
        var p = plaques[i], den = d.x * p.nx + d.z * p.nz;
        if (den > -1e-4) continue;
        var t = ((p.x - o.x) * p.nx + (p.z - o.z) * p.nz) / den;
        if (t <= 0 || t >= bt || t > 40) continue;
        var px = o.x + d.x * t - p.x, py = o.y + d.y * t - p.y, pz = o.z + d.z * t - p.z;
        var a = (px * p.nz - pz * p.nx) / (p.w / 2), b = py / (p.h / 2);
        if (Math.abs(a) <= 1.1 && Math.abs(b) <= 1.05) { bt = t; best = i; }
      }
      return best;
    }

    return {
      load: load, clear: clear, update: update, pick: pick,
      count: function () { return plaques.length; },
      ready: function () { return ready; },
      // main.js walkTo: 서는 자리 {x,z,yaw,index,reach}
      station: function (index) {
        var p = plaques[index | 0];
        return p ? { x: p.stand.x, z: p.stand.z, yaw: p.stand.yaw, index: p.index, reach: NEAR_IN } : null;
      },
      plaques: function () { return plaques; },
      series: function () { return series; },
      debug: function () { return { ready: ready, count: plaques.length, series: series, packs: packs.resident(), fallbacks: packs.stats.fallbacks, near: lastN || null, why: App.crossWhy, meshes: (mesh ? 1 : 0) + (back ? 1 : 0), stats: JSON.parse(JSON.stringify(stats)) }; }
    };
  }

  return { derive: derive, create: create, packLoader: packLoader, nearPlaque: nearPlaque, P: P, NEAR_IN: NEAR_IN, NEAR_OUT: NEAR_OUT, seatAxis: seatAxis };
});
