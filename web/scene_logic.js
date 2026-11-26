/* scene_logic.js — three.js 의존 없는 순수 게임 로직(좌석·충돌·바닥 높이). 레이아웃 기반.
   브라우저: window.RoomLogic, Node: require. 시험: test/scene_logic.test.mjs
   좌석은 두 가지로 줄 수 있다: layout.seats = [{id?, x, z, yaw, stand?:{x,z}, reach?}] (낱자리 — 책상·스툴),
   또는 layout.seatGroups(줄 의자: 줄마다 앞 띠가 충돌체). 둘을 함께 써도 된다. 좌석 번호(i)는 seats 배열 순서다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RoomLogic = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var C = {
    // WALK_SPEED: 조이스틱 끝 속도(m/s). 아바타는 이 속도까지 늘 걷는다(뛰지 않는다).
    WALK_SPEED: 2.2, RADIUS: 0.3, SEAT_REACH: 1.3,
    SEAT_H: 0.45, BAND_NEAR: -0.62, BAND_FAR: 0.20, STAND_FWD: 0.72,
    // 여러 층(layout.levels): 한 걸음에 오를 수 있는 높이, 몸이 차지하는 높이(충돌체 높이 범위와 견줌), 같은 층으로 치는 높이 차
    STEP: 0.45, BODY0: 0.15, BODY1: 1.7, SAME_LEVEL: 1.0
  };
  // 줄 의자(seatGroups) 기하: 좌석 높이·등받이. u = 좌석 중심에서 앞(f)으로 잰 거리(m).
  var ROW = { SEAT_FRONT: 0.20, SEAT_REAR: -0.29, SEAT_TOP: 0.45, BACK_U: -0.29 };

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function seatId(g, row, idx) { return g + pad2(row) + '-' + idx; }
  function fwd(yaw) { return [-Math.sin(yaw), -Math.cos(yaw)]; }

  // 레이아웃 -> 좌석 배열 [{id,g,row,idx,x,z,yaw}] (낱자리 seats 먼저, 그다음 줄 의자)
  function seatsOf(layout) {
    var out = [], gl = layout.seatGroups || [];
    (layout.seats || []).forEach(function (s, i) {
      var o = { id: s.id || ('S' + i), g: 'S', row: 0, idx: i, x: s.x, z: s.z, yaw: s.yaw || 0, single: true };
      if (s.stand) o.stand = { x: s.stand.x, z: s.stand.z };
      if (s.reach) o.reach = s.reach;
      if (s.y !== undefined) o.fy = s.y;
      if (s.h !== undefined) o.h = s.h;
      out.push(o);
    });
    for (var gi = 0; gi < gl.length; gi++) {
      var G = gl[gi];
      for (var r = 0; r < G.rows; r++) {
        for (var i = 0; i < G.perRow; i++) {
          out.push({
            id: seatId(G.g, r, i), g: G.g, row: r, idx: i,
            x: G.origin.x + G.dx * i + (G.rowDx || 0) * r,
            z: G.origin.z + G.dz * r + (G.dzIdx || 0) * i,
            yaw: G.yaw || 0
          });
          if (G.y !== undefined) out[out.length - 1].fy = G.y + (G.rowDy || 0) * r;
        }
      }
    }
    return out;
  }

  // 줄 의자마다 앞 띠(앞줄 등받이: 충돌 AABB) + 시각화용 정보. 낱자리(seats)는 띠가 없다(가구 충돌체는 빌더가 준다).
  function rowBands(layout) {
    var out = [], gl = layout.seatGroups || [];
    for (var gi = 0; gi < gl.length; gi++) {
      var G = gl[gi];
      var yaw = G.yaw || 0, f = fwd(yaw);
      var pad = G.pad || [0.6, 0.6];
      for (var r = 0; r < G.rows; r++) {
        var x0 = G.origin.x + (G.rowDx || 0) * r, z0 = G.origin.z + G.dz * r;
        var n = G.perRow - 1;
        var x1 = x0 + G.dx * n, z1 = z0 + (G.dzIdx || 0) * n;
        var ex = x1 - x0, ez = z1 - z0, el = Math.sqrt(ex * ex + ez * ez);
        if (el < 1e-6) { ex = Math.cos(yaw); ez = -Math.sin(yaw); } else { ex /= el; ez /= el; }
        var sx = x0 - ex * pad[0], sz = z0 - ez * pad[0], tx = x1 + ex * pad[1], tz = z1 + ez * pad[1];
        var pts = [
          [sx + f[0] * C.BAND_NEAR, sz + f[1] * C.BAND_NEAR], [sx + f[0] * C.BAND_FAR, sz + f[1] * C.BAND_FAR],
          [tx + f[0] * C.BAND_NEAR, tz + f[1] * C.BAND_NEAR], [tx + f[0] * C.BAND_FAR, tz + f[1] * C.BAND_FAR]
        ];
        var minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
        for (var k = 0; k < 4; k++) {
          minX = Math.min(minX, pts[k][0]); maxX = Math.max(maxX, pts[k][0]);
          minZ = Math.min(minZ, pts[k][1]); maxZ = Math.max(maxZ, pts[k][1]);
        }
        out.push({
          g: G.g, row: r, yaw: yaw, f: f, e: [ex, ez],
          start: [sx, sz], end: [tx, tz],               // 줄 방향 양 끝(여백 포함). 좌석 중심선 위
          x0: minX, x1: maxX, z0: minZ, z1: maxZ,       // 외접 AABB(충돌)
          rect: { s: [sx, sz], t: [tx, tz] }
        });
      }
    }
    return out;
  }

  function normCollider(c) {
    if (c.ax !== undefined && c.bx !== undefined) {
      var sg = { k: 2, ax: c.ax, az: c.az, bx: c.bx, bz: c.bz, r: c.r || 0.25 };
      if (c.y0 !== undefined || c.y1 !== undefined) { sg.y0 = c.y0 === undefined ? -1e9 : c.y0; sg.y1 = c.y1 === undefined ? 1e9 : c.y1; }
      return sg;
    }
    var n = (c.r !== undefined && c.x0 === undefined) ? { k: 1, x: c.x, z: c.z, r: c.r }
      : { k: 0, x0: Math.min(c.x0, c.x1), x1: Math.max(c.x0, c.x1), z0: Math.min(c.z0, c.z1), z1: Math.max(c.z0, c.z1) };
    // 여러 층: 높이 범위(y0..y1)가 있는 충돌체는 그 높이에 몸이 걸칠 때만 막는다. 없으면 모든 층에서 막는다(한 층 장면은 늘 이쪽)
    if (c.y0 !== undefined || c.y1 !== undefined) { n.y0 = c.y0 === undefined ? -1e9 : c.y0; n.y1 = c.y1 === undefined ? 1e9 : c.y1; }
    return n;
  }

  function create(layout, extra) {
    extra = extra || {};
    var seats = seatsOf(layout);
    var byId = {};
    for (var i = 0; i < seats.length; i++) { seats[i].f = fwd(seats[i].yaw); byId[seats[i].id] = seats[i]; }
    var bands = rowBands(layout);
    var colliders = [];
    var zones = (extra.zones || []).slice();
    var b = layout.bounds;
    var R = C.RADIUS;
    var walk = { minX: b.x0 + R, maxX: b.x1 - R, minZ: b.z0 + R, maxZ: b.z1 - R };
    // 여러 층(layout.levels): 같은 (x,z) 에 바닥이 여럿 — floorY(x,z,yRef) 는 yRef + STEP 아래의 가장 높은 바닥, 충돌체는 높이 범위를 본다.
    // levels 가 없는 장면(한 층)은 아래 함수들이 yRef·y 인자를 무시한다.
    var multi = !!(layout.levels && layout.levels.length);
    // 걷기 최고 속도(m/s): 장면마다 layout.walkSpeed 로 바꿀 수 있다. 없으면 C.WALK_SPEED.
    var walkTop = layout.walkSpeed > 0 ? Math.min(C.WALK_SPEED, layout.walkSpeed) : C.WALK_SPEED;
    var ground = layout.ground !== false;
    var groupY = {}, groupDy = {};
    var SG = layout.seatGroups || [];
    for (i = 0; i < SG.length; i++) if (SG[i].y !== undefined) { groupY[SG[i].g] = SG[i].y; groupDy[SG[i].g] = SG[i].rowDy || 0; }

    var keep = [];   // 출입 금지 구역(addKeepOut): setColliders 로 다시 지어도 남는다
    function rebuild(list) {
      colliders.length = 0;
      for (var q = 0; q < bands.length; q++) {
        var bc = { k: 0, x0: bands[q].x0, x1: bands[q].x1, z0: bands[q].z0, z1: bands[q].z1 };
        if (multi && groupY[bands[q].g] !== undefined) { var by = groupY[bands[q].g] + groupDy[bands[q].g] * Math.max(0, bands[q].row); bc.y0 = by - 0.05; bc.y1 = by + 1.1; }   // 줄 의자는 그 층에서만 막는다
        colliders.push(bc);
      }
      for (q = 0; q < list.length; q++) colliders.push(normCollider(list[q]));
      for (q = 0; q < keep.length; q++) colliders.push(keep[q]);
    }
    rebuild(extra.colliders || []);

    // 몸(발 높이 y 에서 BODY0..BODY1)이 충돌체의 높이 범위에 걸치는가. y 가 없거나 한 층이면 늘 걸친다
    function atLevel(c, y) { return y === undefined || y === null || c.y0 === undefined || (c.y1 >= y + C.BODY0 && c.y0 <= y + C.BODY1); }
    var L = {
      multi: multi, levels: multi ? layout.levels : null,
      layout: layout, C: C, ROW: ROW, walkSpeed: walkTop, seats: seats, seatIds: seats.map(function (s) { return s.id; }),
      bands: bands, colliders: colliders, bounds: walk, spawn: layout.spawn,
      seatInfo: function (id) { return byId[id] || null; },
      setColliders: function (list) { rebuild(list || []); },
      setZones: function (z) { zones = (z || []).slice(); },
      layoutZones: function () { return zones; },
      addKeepOut: function (c) { var n = normCollider(c); n.keep = true; keep.push(n); colliders.push(n); return n; },
      // 바닥 높이. yRef(여러 층만): 그 높이(발)에서 한 걸음(STEP) 안으로 오를 수 있는 가장 높은 바닥 — 계단을 오르내리면 층이 저절로 바뀐다.
      // yRef 없이 부르면(또는 한 층 장면) 예전처럼 그 자리의 가장 높은 바닥(바닥 0 포함).
      // 몸(루트) 높이 목표(2026-11-22 2차, WALK_GAIT.md §6): 발 높이 fy 에 걷는 방향 앞뒤 0.45m 안 바닥을 섞어 계단을 비탈처럼 오르내린다.
      // 예전에는 단 높이(계단 바닥)를 그대로 × dt·14 로 따라가 단마다 몸·카메라가 0.07초에 15cm 씩 「툭」 올랐다(루트 높이 가속도 150 m/s²).
      // (dx, dz): 걷는 방향 단위 벡터(멈춰 있으면 0 → fy 그대로). 발은 아바타가 단 위에 따로 디딘다(avatar.js setGround).
      bodyY: function (x, z, fy, dx, dz) {
        if (!(dx || dz)) return fy;
        var sum = fy, n = 1, y, o, k;
        for (k = 1; k <= 3; k++) for (o = -1; o <= 1; o += 2) {   // 앞뒤 0.15·0.3·0.45m(단 세 개쯤) 바닥의 평균 — 한 단을 넘을 때 목표가 단 높이의 1/7 씩만 바뀐다
          y = L.floorY(x + dx * 0.15 * k * o, z + dz * 0.15 * k * o, fy);
          if (Math.abs(y - fy) > 0.5) return fy;   // 다른 층·높은 턱이 끼면 섞지 않는다
          sum += y; n++;
        }
        return sum / n;
      },
      floorY: function (x, z, yRef) {
        var q, zn;
        if (!multi || yRef === undefined || yRef === null) {
          var y = 0;
          for (q = 0; q < zones.length; q++) {
            zn = zones[q];
            if (x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1 && zn.y > y) y = zn.y;
          }
          return y;
        }
        var lim = yRef + C.STEP, best = lim >= 0 && ground ? 0 : -1e9;   // 땅(0): layout.ground === false 면 후보가 아니다(맨 아래층 바닥도 구역으로 준다 — 겹친 층 아래 흙 속을 바닥으로 치지 않게)
        for (q = 0; q < zones.length; q++) {
          zn = zones[q];
          if (x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1 && zn.y > best && zn.y <= lim) best = zn.y;
        }
        return best < -1e8 ? 0 : best;
      },
      // 여러 층: 그 (x,z) 의 바닥 높이 후보(아래부터, 0 포함). 한 층이면 [floorY]
      floorsAt: function (x, z) {
        if (!multi) return [L.floorY(x, z)];
        var out = ground ? [0] : [];
        for (var q = 0; q < zones.length; q++) {
          var zn = zones[q];
          if (x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1 && out.indexOf(zn.y) < 0) out.push(zn.y);
        }
        return out.sort(function (a, c2) { return a - c2; });
      },
      // 높이 y(발)의 몸에 걸치는 충돌체만(여러 층). 한 층이면 전부
      collidersAt: function (y) {
        if (!multi || y === undefined || y === null) return colliders;
        var out = [];
        for (var q = 0; q < colliders.length; q++) if (atLevel(colliders[q], y)) out.push(colliders[q]);
        return out;
      },
      // 좌석이 놓인 바닥 높이(여러 층이면 줄의 y, 아니면 그 자리 바닥)
      seatFloor: function (id) {
        var s = byId[id]; if (!s) return 0;
        return s.fy !== undefined && (multi || s.single) ? s.fy : L.floorY(s.x, s.z);   // 낱자리 y: 발판 높이(높은 스툴)
      },
      seatPos: function (id) {
        var s = byId[id]; if (!s) return null;
        return { x: s.x, z: s.z, y: L.seatFloor(id) + (s.h !== undefined ? s.h : C.SEAT_H), yaw: s.yaw };
      },
      // 좌석 번호(i, seats 순서) <-> id
      seatIndex: function (id) { var s = byId[id]; return s ? seats.indexOf(s) : -1; },
      seatAt: function (i) { return seats[i | 0] ? seats[i | 0].id : null; },
      // 일어설 때 가는 곳: 낱자리는 stand(없으면 좌석 뒤 0.55m), 줄 의자는 좌석 앞(+f)의 줄 안 통로
      standPos: function (id) {
        var s = byId[id]; if (!s) return null;
        if (s.single) { var st = s.stand || { x: s.x - s.f[0] * 0.55, z: s.z - s.f[1] * 0.55 }; return { x: st.x, z: st.z, yaw: s.yaw }; }
        var fw = Math.min(C.STAND_FWD, L.seatPitch(id) * 0.4);
        return { x: s.x + s.f[0] * fw, z: s.z + s.f[1] * fw, yaw: s.yaw };
      },
      seatPitch: function (id) {
        var s = byId[id]; if (!s) return 1.9;
        for (var q = 0; q < SG.length; q++) if (SG[q].g === s.g) return Math.abs(SG[q].dz) || 1.9;
        return 1.9;
      },
      // isTaken: function(id)->bool 또는 {id:truthy}
      nearestSeat: function (x, z, isTaken, reach, y) {
        reach = reach || C.SEAT_REACH;
        var lv = multi && y !== undefined && y !== null;   // 여러 층: 다른 층의 좌석(바로 위·아래)은 고르지 않는다
        var r2 = reach * reach, best = null, bd = 1e9;
        var fn = typeof isTaken === 'function' ? isTaken : null;
        for (var q = 0; q < seats.length; q++) {
          var s = seats[q];
          var dx = x - s.x, dz = z - s.z, d2 = dx * dx + dz * dz;
          var rs = s.reach ? s.reach * s.reach : r2;
          if (d2 > rs || d2 >= bd) continue;
          if (lv && Math.abs(L.seatFloor(s.id) - y) > C.SAME_LEVEL) continue;
          if (!s.single && dx * s.f[0] + dz * s.f[1] < -0.1) continue; // 줄 의자: 등받이 뒤(뒷줄 통로)에서는 불가
          if (fn ? fn(s.id) : (isTaken && isTaken[s.id])) continue;
          bd = d2; best = s.id;
        }
        return best;
      },
      // 원(반경 r)을 (dx,dz)만큼 움직이고 충돌 해소(미끄러짐). p={x,z} 를 수정. 부딪히면 true.
      // y(여러 층만): 발 높이 — 그 높이의 몸에 걸치는 충돌체만 막는다(아래·위층의 벽은 지나간다). 없으면 모든 충돌체.
      moveCircle: function (p, dx, dz, r, y) {
        r = r || R;
        var lv = multi && y !== undefined && y !== null;
        p.x += dx; p.z += dz;
        var hit = false;
        for (var iter = 0; iter < 3; iter++) {
          var any = false;
          for (var q = 0; q < colliders.length; q++) {
            var c = colliders[q];
            if (lv && c.y0 !== undefined && (c.y1 < y + C.BODY0 || c.y0 > y + C.BODY1)) continue;
            if (c.k === 0) {
              if (p.x < c.x0 - r || p.x > c.x1 + r || p.z < c.z0 - r || p.z > c.z1 + r) continue;
              var cx = p.x < c.x0 ? c.x0 : (p.x > c.x1 ? c.x1 : p.x);
              var cz = p.z < c.z0 ? c.z0 : (p.z > c.z1 ? c.z1 : p.z);
              var ex = p.x - cx, ez = p.z - cz, d2 = ex * ex + ez * ez;
              if (d2 >= r * r) continue;
              if (d2 > 1e-10) {
                var d = Math.sqrt(d2);
                p.x = cx + ex / d * r; p.z = cz + ez / d * r;
              } else {
                // 중심이 상자 안: 가장 얕은 축으로 밀어낸다
                var l = p.x - c.x0, rt = c.x1 - p.x, tp = p.z - c.z0, bt = c.z1 - p.z;
                var m = Math.min(l, rt, tp, bt);
                if (m === l) p.x = c.x0 - r; else if (m === rt) p.x = c.x1 + r;
                else if (m === tp) p.z = c.z0 - r; else p.z = c.z1 + r;
              }
              any = true;
            } else if (c.k === 2) {
              var sx = c.bx - c.ax, sz = c.bz - c.az, sl2 = sx * sx + sz * sz;
              var tt = sl2 > 1e-12 ? ((p.x - c.ax) * sx + (p.z - c.az) * sz) / sl2 : 0;
              tt = tt < 0 ? 0 : (tt > 1 ? 1 : tt);
              var qx = c.ax + sx * tt, qz = c.az + sz * tt, e3x = p.x - qx, e3z = p.z - qz, rs = c.r + r, d3 = e3x * e3x + e3z * e3z;
              if (d3 >= rs * rs) continue;
              if (d3 > 1e-10) { var d3l = Math.sqrt(d3); p.x = qx + e3x / d3l * rs; p.z = qz + e3z / d3l * rs; }
              else { var sln = Math.sqrt(sl2) || 1; p.x = qx - sz / sln * rs; p.z = qz + sx / sln * rs; }
              any = true;
            } else {
              var ex2 = p.x - c.x, ez2 = p.z - c.z, rr = c.r + r, dd = ex2 * ex2 + ez2 * ez2;
              if (dd >= rr * rr) continue;
              if (dd > 1e-10) { var dl = Math.sqrt(dd); p.x = c.x + ex2 / dl * rr; p.z = c.z + ez2 / dl * rr; }
              else p.x = c.x + rr;
              any = true;
            }
          }
          if (!any) break;
          hit = true;
        }
        if (p.x < walk.minX) { p.x = walk.minX; hit = true; } else if (p.x > walk.maxX) { p.x = walk.maxX; hit = true; }
        if (p.z < walk.minZ) { p.z = walk.minZ; hit = true; } else if (p.z > walk.maxZ) { p.z = walk.maxZ; hit = true; }
        return hit;
      },
      clampBounds: function (p, r) {
        r = r === undefined ? 0 : r;
        p.x = Math.max(b.x0 + r, Math.min(b.x1 - r, p.x));
        p.z = Math.max(b.z0 + r, Math.min(b.z1 - r, p.z));
      },
      // 조이스틱(jx 오른쪽, jy 앞) + 카메라 yaw -> 이동 벡터(m/s). 결과 out={vx,vz,speed,yaw}. yaw=이동 방향 아바타 yaw
      joyToVelocity: function (jx, jy, camYaw, out) {
        var mag = Math.sqrt(jx * jx + jy * jy);
        if (mag < 0.05) { out.vx = 0; out.vz = 0; out.speed = 0; return out; }
        var m = Math.min(1, mag);
        var fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
        var dx = fx * jy + rx * jx, dz = fz * jy + rz * jx;
        var dl = Math.sqrt(dx * dx + dz * dz) || 1;
        dx /= dl; dz /= dl;
        out.speed = walkTop * m; out.vx = dx * out.speed; out.vz = dz * out.speed;
        out.yaw = Math.atan2(-dx, -dz);
        return out;
      }
    };
    return L;
  }

  return { C: C, ROW: ROW, create: create, seatsOf: seatsOf, rowBands: rowBands, seatId: seatId, fwd: fwd };
});
