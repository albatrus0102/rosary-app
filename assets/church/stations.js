/* stations.js — three.js 의존 없는 순수 로직: 성당 스테이션(가서 행동하는 자리) 유도 + 걷기 그리드 경로 탐색.
   브라우저: window.ChurchStations, Node: require. 시험: tools/church_web/stations.test.mjs (8개 성당 전부)

   스테이션(모두 레이아웃과 충돌체에서 일반적으로 유도한다. 빌더를 고치지 않는다):
   - candle[i]  = layout.candles.stands[i]. 서는 자리(approach)는 스탠드 앞면(face 쪽, 걸을 수 있는 쪽)에서
                  0.7~1.5m 떨어진, 충돌 없고 입구에서 닿을 수 있는 자리 중 스탠드 정면에 가장 가까운 곳. 거기서 nearestCandleSlot 이 잡힌다.
   - altar      = 신랑 축(좌석 방향 f 의 평균, 입구 스폰에서 출발)을 따라 걸을 수 있는 한 가장 멀리 간 지점(제대·난간·발다키노 바로 앞).
                  축이 전체 길이의 30% 도 못 가서 막히면(통로 한가운데 장애물 같은 예외), 축 좌우 1.2m 안에서 f 방향으로 가장 먼 '닿을 수 있는' 칸을 쓴다.
                  바라보는 방향은 f(좌석과 같은 쪽 = 제대).
   - entrance   = layout.spawn.
   - seat       = 비어 있는 좌석 중 걷는 거리가 가장 짧은 곳의 standPos(좌석 뒤 통로). 점유 정보는 호출 때 받는다.
   - font[i]    = layout.fonts:[{x,z,face?,reach?}] 가 있을 때만(성수대). 없으면 빈 배열.
   layout.stations = {altar:{x,z}} 처럼 직접 지정하면 유도 대신 그 값을 쓴다(선택). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChurchStations = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var SQ2 = Math.SQRT2;
  var NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQ2], [1, -1, SQ2], [-1, 1, SQ2], [-1, -1, SQ2]];

  // 최소 힙(키 배열 + 값 배열)
  function Heap() { this.k = []; this.v = []; }
  Heap.prototype.push = function (key, val) {
    var k = this.k, v = this.v, i = k.length;
    k.push(key); v.push(val);
    while (i > 0) {
      var p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  };
  Heap.prototype.pop = function () {
    var k = this.k, v = this.v, n = k.length;
    if (!n) return -1;
    var top = v[0], lk = k.pop(), lv = v.pop();
    n--;
    if (n > 0) {
      var i = 0;
      for (;;) {
        var c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && k[c + 1] < k[c]) c++;
        if (k[c] >= lk) break;
        k[i] = k[c]; v[i] = v[c]; i = c;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  };
  Heap.prototype.size = function () { return this.k.length; };

  function dist(a, b) { return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.z - b.z) * (a.z - b.z)); }
  function yawToward(fromX, fromZ, toX, toZ) { return Math.atan2(-(toX - fromX), -(toZ - fromZ)); }

  function create(logic, opts) {
    opts = opts || {};
    var layout = logic.layout, C = logic.C, B = layout.bounds;
    var CELLS = opts.cells || [0.5, 0.25];
    var grids = {};
    var tmp = { x: 0, z: 0 };
    var derived = null;

    function free(x, z) { tmp.x = x; tmp.z = z; return !logic.moveCircle(tmp, 0, 0); }

    function getGrid(cell) {
      var key = String(cell);
      if (grids[key]) return grids[key];
      var nx = Math.ceil((B.x1 - B.x0) / cell), nz = Math.ceil((B.z1 - B.z0) / cell);
      var blocked = new Uint8Array(nx * nz), p = { x: 0, z: 0 };
      for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) {
        p.x = B.x0 + (i + 0.5) * cell; p.z = B.z0 + (j + 0.5) * cell;
        blocked[j * nx + i] = logic.moveCircle(p, 0, 0) ? 1 : 0;
      }
      var g = { cell: cell, nx: nx, nz: nz, blocked: blocked, reach: null };
      grids[key] = g;
      return g;
    }
    function ci(g, x) { return Math.max(0, Math.min(g.nx - 1, Math.floor((x - B.x0) / g.cell))); }
    function cj(g, z) { return Math.max(0, Math.min(g.nz - 1, Math.floor((z - B.z0) / g.cell))); }
    function cx(g, i) { return B.x0 + (i + 0.5) * g.cell; }
    function cz(g, j) { return B.z0 + (j + 0.5) * g.cell; }

    // (x,z) 에서 가장 가까운 열린 칸(반경 maxCells 안). 없으면 -1
    function nearestOpen(g, x, z, maxCells, okFn) {
      var i0 = ci(g, x), j0 = cj(g, z), best = -1, bd = 1e18;
      for (var r = 0; r <= maxCells; r++) {
        for (var j = j0 - r; j <= j0 + r; j++) for (var i = i0 - r; i <= i0 + r; i++) {
          if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) continue;
          if (r > 0 && Math.abs(i - i0) !== r && Math.abs(j - j0) !== r) continue;
          var idx = j * g.nx + i;
          if (g.blocked[idx]) continue;
          if (okFn && !okFn(idx)) continue;
          var dx = cx(g, i) - x, dz = cz(g, j) - z, d = dx * dx + dz * dz;
          if (d < bd) { bd = d; best = idx; }
        }
        if (best >= 0 && r >= 1) break;
      }
      return best;
    }

    function passable(g, i, j, di, dj) {
      var ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= g.nx || nj >= g.nz) return false;
      if (g.blocked[nj * g.nx + ni]) return false;
      if (di !== 0 && dj !== 0 && (g.blocked[j * g.nx + ni] || g.blocked[nj * g.nx + i])) return false; // 모서리 가로지르기 금지
      return true;
    }

    // 입구(스폰)에서 닿을 수 있는 칸 표시
    function reachGrid(g) {
      if (g.reach) return g.reach;
      var sp = layout.spawn, s = nearestOpen(g, sp.x, sp.z, 6), seen = new Uint8Array(g.nx * g.nz);
      g.reach = seen;
      if (s < 0) return seen;
      var q = [s]; seen[s] = 1;
      for (var h = 0; h < q.length; h++) {
        var idx = q[h], i = idx % g.nx, j = (idx - i) / g.nx;
        for (var n = 0; n < 8; n++) {
          var d = NB[n];
          if (!passable(g, i, j, d[0], d[1])) continue;
          var ni = j * g.nx + i + d[1] * g.nx + d[0];
          if (seen[ni]) continue;
          seen[ni] = 1; q.push(ni);
        }
      }
      return seen;
    }
    function isReachable(x, z) {
      var g = getGrid(CELLS[0]), r = reachGrid(g);
      var idx = nearestOpen(g, x, z, 2);
      return idx >= 0 && !!r[idx];
    }

    function lineClear(a, b) {
      var dx = b.x - a.x, dz = b.z - a.z, d = Math.sqrt(dx * dx + dz * dz), n = Math.max(1, Math.ceil(d / 0.15));
      for (var k = 1; k <= n; k++) {
        var u = k / n;
        if (!free(a.x + dx * u, a.z + dz * u)) return false;
      }
      return true;
    }

    function astar(g, s, t) {
      var N = g.nx * g.nz, gs = new Float32Array(N), came = new Int32Array(N), closed = new Uint8Array(N);
      for (var q = 0; q < N; q++) { gs[q] = 1e9; came[q] = -1; }
      var ti = t % g.nx, tj = (t - ti) / g.nx;
      function hf(i, j) { var dx = Math.abs(i - ti), dz = Math.abs(j - tj); return (dx + dz) + (SQ2 - 2) * Math.min(dx, dz); }
      var heap = new Heap();
      gs[s] = 0; heap.push(hf(s % g.nx, Math.floor(s / g.nx)), s);
      while (heap.size()) {
        var cur = heap.pop();
        if (closed[cur]) continue;
        if (cur === t) break;
        closed[cur] = 1;
        var i = cur % g.nx, j = (cur - i) / g.nx;
        for (var n = 0; n < 8; n++) {
          var d = NB[n];
          if (!passable(g, i, j, d[0], d[1])) continue;
          var ni = cur + d[1] * g.nx + d[0];
          if (closed[ni]) continue;
          var ng = gs[cur] + d[2];
          if (ng < gs[ni]) { gs[ni] = ng; came[ni] = cur; heap.push(ng + hf(ni % g.nx, Math.floor(ni / g.nx)), ni); }
        }
      }
      if (t !== s && came[t] < 0) return null;
      var out = [], c = t;
      while (c >= 0) { out.push(c); if (c === s) break; c = came[c]; }
      out.reverse();
      return out;
    }

    // 걷기 경로: [{x,z}...] (시작점 포함, 도착점 포함) + 길이(m). 길이 없으면 null.
    function findPath(from, to, o) {
      o = o || {};
      var cells = o.cell ? [o.cell] : CELLS;
      for (var ci0 = 0; ci0 < cells.length; ci0++) {
        var g = getGrid(cells[ci0]);
        var s = nearestOpen(g, from.x, from.z, 4), t = nearestOpen(g, to.x, to.z, 4);
        if (s < 0 || t < 0) continue;
        var cellsPath = astar(g, s, t);
        if (!cellsPath) continue;
        var raw = [{ x: from.x, z: from.z }];
        for (var k = 0; k < cellsPath.length; k++) {
          var idx = cellsPath[k], i = idx % g.nx, j = (idx - i) / g.nx;
          raw.push({ x: cx(g, i), z: cz(g, j) });
        }
        raw.push({ x: to.x, z: to.z });
        // 직선으로 갈 수 있는 한 가장 먼 점으로 건너뛴다(string pulling)
        var pts = [raw[0]], a = 0;
        while (a < raw.length - 1) {
          var far = a + 1;
          for (var b = raw.length - 1; b > a + 1; b--) { if (lineClear(raw[a], raw[b])) { far = b; break; } }
          pts.push(raw[far]); a = far;
        }
        var len = 0;
        for (k = 1; k < pts.length; k++) len += dist(pts[k - 1], pts[k]);
        return { pts: pts, len: len, cell: g.cell };
      }
      return null;
    }

    // from 에서 모든 칸까지의 걷는 거리(Dijkstra). 좌석 고르기용.
    function distField(g, from) {
      var N = g.nx * g.nz, d = new Float32Array(N);
      for (var q = 0; q < N; q++) d[q] = 1e9;
      var s = nearestOpen(g, from.x, from.z, 4);
      if (s < 0) return d;
      var heap = new Heap(); d[s] = 0; heap.push(0, s);
      var done = new Uint8Array(N);
      while (heap.size()) {
        var cur = heap.pop();
        if (done[cur]) continue;
        done[cur] = 1;
        var i = cur % g.nx, j = (cur - i) / g.nx;
        for (var n = 0; n < 8; n++) {
          var dd = NB[n];
          if (!passable(g, i, j, dd[0], dd[1])) continue;
          var ni = cur + dd[1] * g.nx + dd[0], nd = d[cur] + dd[2] * g.cell;
          if (nd < d[ni]) { d[ni] = nd; heap.push(nd, ni); }
        }
      }
      return d;
    }

    // ---- 스테이션 유도 ----
    function navAxis() {
      var sx = 0, sz = 0, n = layout.seatGroups.length;
      for (var q = 0; q < n; q++) { var yaw = layout.seatGroups[q].yaw || 0; sx += -Math.sin(yaw); sz += -Math.cos(yaw); }
      var l = Math.sqrt(sx * sx + sz * sz);
      if (l < 1e-6) return { x: 0, z: -1, yaw: 0 };
      sx /= l; sz /= l;
      return { x: sx, z: sz, yaw: Math.atan2(-sx, -sz) };
    }

    function deriveAltar(g, reach) {
      var ov = layout.stations && layout.stations.altar;
      var ax = navAxis(), sp = layout.spawn;
      if (ov) return { x: ov.x, z: ov.z, yaw: ov.yaw === undefined ? ax.yaw : ov.yaw, reach: ov.reach || 1.6, how: 'layout' };
      // 1) 축을 따라 걷기
      var bestS = 0, stepLen = 0.25, maxS = Math.sqrt((B.x1 - B.x0) * (B.x1 - B.x0) + (B.z1 - B.z0) * (B.z1 - B.z0));
      for (var s = 0; s <= maxS; s += stepLen) {
        var px = sp.x + ax.x * s, pz = sp.z + ax.z * s;
        if (px < B.x0 || px > B.x1 || pz < B.z0 || pz > B.z1) break;
        if (!free(px, pz)) break;
        bestS = s;
      }
      // 축 방향으로 갈 수 있는 총 길이(경계까지)
      var span = 0;
      for (s = 0; s <= maxS; s += stepLen) { var qx = sp.x + ax.x * s, qz = sp.z + ax.z * s; if (qx < B.x0 || qx > B.x1 || qz < B.z0 || qz > B.z1) break; span = s; }
      var p = { x: sp.x + ax.x * bestS, z: sp.z + ax.z * bestS, how: 'axis' };
      if (bestS < span * 0.3) {
        // 2) 축이 입구 쪽에서 너무 일찍 막혔다(통로 한가운데 장애물 같은 예외): 축 좌우 1.2m 띠 안에서 f 방향으로 가장 먼 '닿을 수 있는' 칸
        var lx = -ax.z, lz = ax.x, best = -1e9, bp = null;
        for (var j = 0; j < g.nz; j++) for (var i = 0; i < g.nx; i++) {
          var idx = j * g.nx + i;
          if (g.blocked[idx] || !reach[idx]) continue;
          var dx = cx(g, i) - sp.x, dz = cz(g, j) - sp.z;
          var lat = dx * lx + dz * lz, fw = dx * ax.x + dz * ax.z;
          if (Math.abs(lat) > 1.2) continue;
          if (fw > best) { best = fw; bp = { x: cx(g, i), z: cz(g, j), how: 'band' }; }
        }
        if (bp && best > bestS) p = bp;
      }
      return { x: p.x, z: p.z, yaw: ax.yaw, reach: 1.6, how: p.how };
    }

    function deriveCandles(g, reach) {
      var out = [], stands = (layout.candles && layout.candles.stands) || [], slots = logic.slots;
      for (var si = 0; si < stands.length; si++) {
        var S = stands[si], face = S.face || [-1, 0];
        var fl = Math.sqrt(face[0] * face[0] + face[1] * face[1]) || 1, fx = face[0] / fl, fz = face[1] / fl;
        var px = fz, pz = -fx, rr = S.reach || C.CANDLE_REACH;
        var mine = []; for (var q = 0; q < slots.length; q++) if (slots[q].stand === si) mine.push(slots[q]);
        function inReach(x, z) {
          for (var m = 0; m < mine.length; m++) { var dx = x - mine[m].x, dz = z - mine[m].z; if (dx * dx + dz * dz <= rr * rr) return true; }
          return false;
        }
        var best = null, bs = 1e9;
        var offs = [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2, -2, 2.5, -2.5, 3, -3];
        for (var oi = 0; oi < offs.length; oi++) {
          for (var d = 0.6; d <= 1.6001; d += 0.1) {
            var x = S.x + fx * d + px * offs[oi], z = S.z + fz * d + pz * offs[oi];
            if (x < B.x0 || x > B.x1 || z < B.z0 || z > B.z1) continue;
            if (!free(x, z) || !inReach(x, z) || !isReachable(x, z)) continue;
            var sc = Math.abs(offs[oi]) * 0.7 + Math.abs(d - 1.0);
            if (sc < bs) { bs = sc; best = { x: x, z: z }; }
          }
          if (best && oi >= 2) break;
        }
        if (!best) {
          // 대안: 스탠드 중심에서 reach 안의 닿을 수 있는 가장 가까운 칸
          var idx = nearestOpen(g, S.x + fx * 1.0, S.z + fz * 1.0, 10, function (k) { return !!reach[k]; });
          if (idx >= 0) { var ii = idx % g.nx, jj = (idx - ii) / g.nx; best = { x: cx(g, ii), z: cz(g, jj) }; }
        }
        if (!best) continue;
        out.push({ index: si, x: best.x, z: best.z, yaw: yawToward(best.x, best.z, S.x, S.z), reach: rr, stand: { x: S.x, z: S.z } });
      }
      return out;
    }

    function deriveFonts(g, reach) {
      var out = [], list = layout.fonts || [];
      for (var q = 0; q < list.length; q++) {
        var F = list[q], best = null, bs = 1e9, fc = F.face;
        var fl = fc ? (Math.sqrt(fc[0] * fc[0] + fc[1] * fc[1]) || 1) : 1;
        for (var a = 0; a < 16; a++) {
          var ang = a * Math.PI / 8;
          for (var d = 0.7; d <= 1.3; d += 0.2) {
            var x = F.x + Math.cos(ang) * d, z = F.z + Math.sin(ang) * d;
            if (x < B.x0 || x > B.x1 || z < B.z0 || z > B.z1 || !free(x, z) || !isReachable(x, z)) continue;
            var sc = Math.abs(d - 0.9);
            if (fc) sc += (1 - ((x - F.x) * fc[0] + (z - F.z) * fc[1]) / (d * fl)) * 1.5;
            else sc += dist({ x: x, z: z }, layout.spawn) * 0.01;
            if (sc < bs) { bs = sc; best = { x: x, z: z }; }
          }
        }
        if (!best) continue;
        out.push({ index: q, x: best.x, z: best.z, yaw: yawToward(best.x, best.z, F.x, F.z), reach: F.reach || 1.5, stand: { x: F.x, z: F.z } });
      }
      return out;
    }

    function derive() {
      var g = getGrid(CELLS[0]), reach = reachGrid(g), sp = layout.spawn;
      derived = {
        entrance: { x: sp.x, z: sp.z, yaw: sp.r || 0, reach: 1.5 },
        altar: deriveAltar(g, reach),
        candle: deriveCandles(g, reach),
        font: deriveFonts(g, reach)
      };
      return derived;
    }

    var S = {
      logic: logic, findPath: findPath, isReachable: isReachable, free: free, lineClear: lineClear,
      stations: function () { return derived || derive(); },
      // 새 충돌체를 넣었을 때(드묾) 캐시를 버린다
      invalidate: function () { grids = {}; derived = null; },
      // 이름으로 스테이션 하나. kind: candle|altar|entrance|font. 없으면 null. from 이 있으면 candle/font 는 걷는 거리가 짧은 쪽.
      station: function (kind, index, from) {
        var st = S.stations();
        if (kind === 'altar') return st.altar;
        if (kind === 'entrance') return st.entrance;
        var list = kind === 'candle' ? st.candle : (kind === 'font' ? st.font : null);
        if (!list || !list.length) return null;
        if (index !== undefined && index !== null && list[index | 0]) return list[index | 0];
        if (!from || list.length === 1) return list[0];
        var best = list[0], bl = 1e18;
        for (var q = 0; q < list.length; q++) {
          var p = findPath(from, list[q]), l = p ? p.len : 1e17;
          if (l < bl) { bl = l; best = list[q]; }
        }
        return best;
      },
      // 걸어서 가장 가까운 빈 좌석. isTaken: fn(id)->bool 또는 {id:truthy}. 없으면 null.
      nearestFreeSeat: function (from, isTaken) {
        var g = getGrid(CELLS[0]), reach = reachGrid(g), df = distField(g, from);
        var fn = typeof isTaken === 'function' ? isTaken : function (id) { return isTaken && isTaken[id]; };
        var best = null, bd = 1e18;
        for (var q = 0; q < logic.seats.length; q++) {
          var s = logic.seats[q];
          if (fn(s.id)) continue;
          var sp = logic.standPos(s.id);
          var idx = nearestOpen(g, sp.x, sp.z, 2, function (k) { return !!reach[k]; });
          if (idx < 0) continue;
          var d = df[idx];
          if (d < bd) { bd = d; best = { id: s.id, x: sp.x, z: sp.z, yaw: sp.yaw, reach: 1.0 }; }
        }
        return best;
      },
      // 특정 좌석 앞(뒤 통로)
      seatStation: function (id) {
        var sp = logic.standPos(id);
        return sp ? { id: id, x: sp.x, z: sp.z, yaw: sp.yaw, reach: 1.0 } : null;
      },
      // 걷기 상태. path = findPath 결과. 매 프레임 step(w, me, dt, out) 로 원하는 속도를 얻는다.
      startWalk: function (path, target, kind, index) {
        return { pts: path.pts, i: 1, target: target, kind: kind, index: index, t: 0, ref: { x: path.pts[0].x, z: path.pts[0].z }, refT: 0, replans: 0 };
      },
      stepWalk: function (w, me, dt, out) {
        out.done = false; out.stuck = false; out.vx = 0; out.vz = 0; out.speed = 0;
        var pts = w.pts, last = pts.length - 1;
        if (w.i > last) w.i = last;
        var tg = pts[w.i], dx = tg.x - me.x, dz = tg.z - me.z, d = Math.sqrt(dx * dx + dz * dz);
        while (w.i < last && d < 0.4) { w.i++; tg = pts[w.i]; dx = tg.x - me.x; dz = tg.z - me.z; d = Math.sqrt(dx * dx + dz * dz); }
        if (w.i === last && d < 0.15) { out.done = true; return out; }
        var sp = w.i === last ? Math.min(C.WALK_SPEED, 0.8 + d * 3.2) : C.WALK_SPEED;
        out.vx = dx / d * sp; out.vz = dz / d * sp; out.speed = sp; out.yaw = Math.atan2(-dx, -dz);
        w.t += dt; w.refT += dt;
        if (w.refT >= 1.0) {
          var mx = me.x - w.ref.x, mz = me.z - w.ref.z;
          if (mx * mx + mz * mz < 0.15 * 0.15) out.stuck = true;
          w.ref.x = me.x; w.ref.z = me.z; w.refT = 0;
        }
        return out;
      }
    };
    return S;
  }

  return { create: create, yawToward: yawToward };
});
