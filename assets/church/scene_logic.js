/* scene_logic.js — three.js 의존 없는 순수 게임 로직(좌석·충돌·촛불·바닥 높이). 레이아웃 기반.
   브라우저: window.ChurchLogic, Node: require. 시험: tools/church_web/scene_logic.test.mjs */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChurchLogic = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var C = {
    WALK_SPEED: 3.2, RADIUS: 0.3, SEAT_REACH: 1.3, CANDLE_REACH: 1.8,
    SEAT_H: 0.45, BAND_NEAR: -0.62, BAND_FAR: 0.20, STAND_FWD: 0.72
  };
  // 신자석(긴 의자) 기하. u = 좌석 중심에서 제대 쪽(f)으로 잰 거리(m), y = 바닥에서의 높이(m). SPEC §28.
  // 한 줄 = [등받이(뒤로 기울임) + 좌석판] 이고, 등받이 뒷면에 '뒷줄 사람'이 쓰는 책 선반과 무릎틀(kneeler)이 달린다.
  // 좌석 앞끝(SEAT_FRONT)과 앞줄 무릎틀 사이가 발 둘 곳이자 줄 안 통로다. 충돌 띠 = [BAND_NEAR, BAND_FAR].
  // kit.js(그리기)·avatar.js(무릎 꿇는 자리)·시험이 모두 이 값을 쓴다. 좌석 중심 좌표·id 는 바뀌지 않는다.
  var PEW = {
    SEAT_FRONT: 0.20, SEAT_REAR: -0.29, SEAT_TOP: 0.45, SEAT_T: 0.05,
    BACK_U: -0.29, BACK_T: 0.05, BACK_TILT: 0.17, BACK_Y0: 0.36, BACK_TOP: 0.95,   // BACK_U = 좌석 높이에서 등받이 앞면
    SHELF_U0: -0.58, SHELF_U1: -0.40, SHELF_Y: 0.69, SHELF_T: 0.03, SHELF_LIP: 0.035,
    KNEEL_U0: -0.80, KNEEL_U1: -0.56, KNEEL_TOP: 0.145, KNEEL_T: 0.085,
    END_T: 0.07, END_U0: -0.50, END_U1: 0.25, END_ARM: 0.70, END_TOP: 1.02
  };
  // 줄 간격 pitch 일 때, 좌석 중심에서 본 '앞줄 등받이' 쪽 치수(뒷줄 사람 기준)
  function pewAhead(pitch) {
    var tilt = Math.tan(PEW.BACK_TILT);
    return {
      legroom: pitch + PEW.KNEEL_U0 - PEW.SEAT_FRONT,                    // 좌석 앞끝 ~ 앞줄 무릎틀
      clear: pitch + PEW.SHELF_U0 - PEW.SEAT_FRONT,                      // 좌석 앞끝 ~ 앞줄 책 선반 끝
      backFace: pitch + PEW.BACK_U - PEW.BACK_T - tilt * (PEW.BACK_TOP - PEW.SEAT_TOP),   // 앞줄 등받이 윗단 뒷면
      shelf: pitch + (PEW.SHELF_U0 + PEW.SHELF_U1) / 2,
      kneel: pitch + (PEW.KNEEL_U0 + PEW.KNEEL_U1) / 2                  // 무릎틀 중심
    };
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function seatId(g, row, idx) { return g + pad2(row) + '-' + idx; }
  function fwd(yaw) { return [-Math.sin(yaw), -Math.cos(yaw)]; }

  // 레이아웃 -> 좌석 배열 [{id,g,row,idx,x,z,yaw}]
  function seatsOf(layout) {
    var out = [];
    for (var gi = 0; gi < layout.seatGroups.length; gi++) {
      var G = layout.seatGroups[gi];
      for (var r = 0; r < G.rows; r++) {
        for (var i = 0; i < G.perRow; i++) {
          out.push({
            id: seatId(G.g, r, i), g: G.g, row: r, idx: i,
            x: G.origin.x + G.dx * i + (G.rowDx || 0) * r,
            z: G.origin.z + G.dz * r + (G.dzIdx || 0) * i,
            yaw: G.yaw || 0
          });
        }
      }
    }
    return out;
  }

  // 줄마다 신자석 띠(등받이+좌석+뒷면 선반: 충돌 AABB) + 시각화용 정보. 그룹마다 맨 앞줄 앞 가림판(front:true, row -1) 하나 추가.
  function rowBands(layout) {
    var out = [];
    for (var gi = 0; gi < layout.seatGroups.length; gi++) {
      var G = layout.seatGroups[gi];
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
        if (r === 0 && G.frontal !== false) {
          // 맨 앞줄 앞의 가림판(frontal): 좌석 없이 등받이 판 + 책 선반 + 무릎틀만 있다(맨 앞줄 사람이 쓴다).
          // start/end 는 '있었을 앞줄'의 좌석 중심선(= 첫 줄에서 pitch 만큼 앞). 기둥 등에 막히는 곳은 그룹에 frontal:false.
          var pt = Math.abs(G.dz) || 1.9, n0 = pt + C.BAND_NEAR, n1 = pt + PEW.BACK_U + 0.02;
          var fp = [[sx + f[0] * n0, sz + f[1] * n0], [sx + f[0] * n1, sz + f[1] * n1], [tx + f[0] * n0, tz + f[1] * n0], [tx + f[0] * n1, tz + f[1] * n1]];
          var fx0 = 1e9, fx1 = -1e9, fz0 = 1e9, fz1 = -1e9;
          for (k = 0; k < 4; k++) { fx0 = Math.min(fx0, fp[k][0]); fx1 = Math.max(fx1, fp[k][0]); fz0 = Math.min(fz0, fp[k][1]); fz1 = Math.max(fz1, fp[k][1]); }
          out.push({
            g: G.g, row: -1, front: true, yaw: yaw, f: f, e: [ex, ez],
            start: [sx + f[0] * pt, sz + f[1] * pt], end: [tx + f[0] * pt, tz + f[1] * pt],
            x0: fx0, x1: fx1, z0: fz0, z1: fz1,
            rect: { s: [sx + f[0] * pt, sz + f[1] * pt], t: [tx + f[0] * pt, tz + f[1] * pt] }
          });
        }
      }
    }
    return out;
  }

  // 촛불대 슬롯 위치(전역 번호)
  function candleSlots(layout) {
    var out = [];
    var stands = (layout.candles && layout.candles.stands) || [];
    for (var si = 0; si < stands.length; si++) {
      var S = stands[si];
      var cols = S.cols || 8, pitch = S.pitch || 0.7, step = S.step || 0.35, y0 = S.y0 === undefined ? 0.8 : S.y0, ystep = S.ystep || 0.35;
      var face = S.face || [-1, 0];
      var fl = Math.sqrt(face[0] * face[0] + face[1] * face[1]) || 1;
      var fx = face[0] / fl, fz = face[1] / fl;
      var px = fz, pz = -fx; // 줄 방향(법선에 수직)
      var rows = Math.ceil(S.slots / cols);
      for (var s = 0; s < S.slots; s++) {
        var row = Math.floor(s / cols), col = s % cols;
        var back = step * (rows - 1 - row);
        var off = (col - (cols - 1) / 2) * pitch;
        out.push({
          slot: out.length, stand: si, row: row, col: col,
          x: S.x + px * off - fx * back, z: S.z + pz * off - fz * back,
          y: y0 + ystep * (rows - 1 - row), reach: S.reach || C.CANDLE_REACH
        });
      }
    }
    return out;
  }

  function normCollider(c) {
    if (c.r !== undefined && c.x0 === undefined) return { k: 1, x: c.x, z: c.z, r: c.r };
    return { k: 0, x0: Math.min(c.x0, c.x1), x1: Math.max(c.x0, c.x1), z0: Math.min(c.z0, c.z1), z1: Math.max(c.z0, c.z1) };
  }

  function create(layout, extra) {
    extra = extra || {};
    var seats = seatsOf(layout);
    var byId = {};
    for (var i = 0; i < seats.length; i++) { seats[i].f = fwd(seats[i].yaw); byId[seats[i].id] = seats[i]; }
    var bands = rowBands(layout);
    var slots = candleSlots(layout);
    var colliders = [];
    var zones = (extra.zones || []).slice();
    var b = layout.bounds;
    var R = C.RADIUS;
    var walk = { minX: b.x0 + R, maxX: b.x1 - R, minZ: b.z0 + R, maxZ: b.z1 - R };

    function rebuild(list) {
      colliders.length = 0;
      for (var q = 0; q < bands.length; q++) colliders.push({ k: 0, x0: bands[q].x0, x1: bands[q].x1, z0: bands[q].z0, z1: bands[q].z1 });
      for (q = 0; q < list.length; q++) colliders.push(normCollider(list[q]));
    }
    rebuild(extra.colliders || []);

    var L = {
      layout: layout, C: C, PEW: PEW, seats: seats, seatIds: seats.map(function (s) { return s.id; }),
      bands: bands, slots: slots, colliders: colliders, bounds: walk, spawn: layout.spawn,
      seatInfo: function (id) { return byId[id] || null; },
      setColliders: function (list) { rebuild(list || []); },
      setZones: function (z) { zones = (z || []).slice(); },
      floorY: function (x, z) {
        var y = 0;
        for (var q = 0; q < zones.length; q++) {
          var zn = zones[q];
          if (x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1 && zn.y > y) y = zn.y;
        }
        return y;
      },
      seatPos: function (id) {
        var s = byId[id]; if (!s) return null;
        return { x: s.x, z: s.z, y: L.floorY(s.x, s.z) + C.SEAT_H, yaw: s.yaw };
      },
      // 일어설 때 가는 곳: 좌석 앞(+f)의 줄 안 통로(좌석 앞끝과 앞줄 무릎틀 사이)
      standPos: function (id) {
        var s = byId[id]; if (!s) return null;
        var fw = Math.min(C.STAND_FWD, L.seatPitch(id) * 0.4);
        return { x: s.x + s.f[0] * fw, z: s.z + s.f[1] * fw, yaw: s.yaw };
      },
      seatPitch: function (id) {
        var s = byId[id]; if (!s) return 1.9;
        for (var q = 0; q < layout.seatGroups.length; q++) if (layout.seatGroups[q].g === s.g) return Math.abs(layout.seatGroups[q].dz) || 1.9;
        return 1.9;
      },
      // 무릎 꿇는 자리: {fwd: 좌석 중심에서 무릎까지 앞으로(m), y: 무릎 받침 윗면 높이, rail: 앞에 등받이(손 얹을 곳)가 있는지}.
      // 앞줄(또는 가림판)의 무릎틀 위. 가림판이 없는 맨 앞줄은 좌석 바로 앞 바닥.
      kneelSpot: function (id) {
        var s = byId[id]; if (!s) return null;
        var G = null;
        for (var q = 0; q < layout.seatGroups.length; q++) if (layout.seatGroups[q].g === s.g) G = layout.seatGroups[q];
        if (s.row === 0 && G.frontal === false) return { fwd: 0.5, y: 0, rail: false };
        return { fwd: pewAhead(L.seatPitch(id)).kneel, y: PEW.KNEEL_TOP, rail: true };
      },
      // isTaken: function(id)->bool 또는 {id:truthy}
      nearestSeat: function (x, z, isTaken, reach) {
        reach = reach || C.SEAT_REACH;
        var r2 = reach * reach, best = null, bd = 1e9;
        var fn = typeof isTaken === 'function' ? isTaken : null;
        for (var q = 0; q < seats.length; q++) {
          var s = seats[q];
          var dx = x - s.x, dz = z - s.z, d2 = dx * dx + dz * dz;
          if (d2 > r2 || d2 >= bd) continue;
          if (dx * s.f[0] + dz * s.f[1] < -0.1) continue; // 등받이 뒤(뒷줄 통로)에서는 불가: 좌석은 앞쪽 통로에서 앉는다
          if (fn ? fn(s.id) : (isTaken && isTaken[s.id])) continue;
          bd = d2; best = s.id;
        }
        return best;
      },
      slotCount: slots.length,
      slotPos: function (slot) { return slots[slot] || null; },
      // isLit: function(slot)->bool (켜진 초는 건너뜀)
      nearestCandleSlot: function (x, z, isLit, reach) {
        var best = null, bd = 1e9;
        for (var q = 0; q < slots.length; q++) {
          var s = slots[q];
          var dx = x - s.x, dz = z - s.z, d2 = dx * dx + dz * dz;
          var rr = reach || s.reach;
          if (d2 > rr * rr || d2 >= bd) continue;
          if (isLit && isLit(q)) continue;
          bd = d2; best = q;
        }
        return best;
      },
      // 원(반경 r)을 (dx,dz)만큼 움직이고 충돌 해소(미끄러짐). p={x,z} 를 수정. 부딪히면 true.
      moveCircle: function (p, dx, dz, r) {
        r = r || R;
        p.x += dx; p.z += dz;
        var hit = false;
        for (var iter = 0; iter < 3; iter++) {
          var any = false;
          for (var q = 0; q < colliders.length; q++) {
            var c = colliders[q];
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
        out.speed = C.WALK_SPEED * m; out.vx = dx * out.speed; out.vz = dz * out.speed;
        out.yaw = Math.atan2(-dx, -dz);
        return out;
      }
    };
    return L;
  }

  return { C: C, PEW: PEW, pewAhead: pewAhead, create: create, seatsOf: seatsOf, rowBands: rowBands, candleSlots: candleSlots, seatId: seatId, fwd: fwd };
});
