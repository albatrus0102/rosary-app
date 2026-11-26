/* stations.js — three.js 없는 순수 로직: 걸을 수 있는 칸 격자 + A* 길 찾기 + 길 따라 걷기.
   원본(rosary-app assets/church/stations.js, 같은 소유자)의 한 층 부분을 줄여 옮겼다(제대·초·성수대 스테이션은 뺐다).
   - findPath(from, to): [{x,z}…] 직선으로 갈 수 있는 점만 남긴 길(string pulling) + 길이. 충돌체는 scene_logic moveCircle(반경 extra 만큼 더 넓게 볼 수 있다).
   - seatStation(id): 좌석에 앉으려고 서는 자리(standPos — 좌석 옆·앞) + 바라볼 방향(좌석 방향).
   - startWalk / stepWalk: 매 프레임 원하는 속도를 낸다(main.js 내 아바타·coffee.js 바리스타가 같이 쓴다).
   브라우저: window.RoomStations, Node: require. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RoomStations = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var SQ2 = Math.SQRT2;
  var NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQ2], [1, -1, SQ2], [-1, 1, SQ2], [-1, -1, SQ2]];
  function Heap() { this.k = []; this.v = []; }
  Heap.prototype.size = function () { return this.k.length; };
  Heap.prototype.push = function (key, val) {
    var k = this.k, v = this.v, i = k.length; k.push(key); v.push(val);
    while (i > 0) { var p = (i - 1) >> 1; if (k[p] <= k[i]) break; var tk = k[p]; k[p] = k[i]; k[i] = tk; var tv = v[p]; v[p] = v[i]; v[i] = tv; i = p; }
  };
  Heap.prototype.pop = function () {
    var k = this.k, v = this.v, top = v[0], lk = k.pop(), lv = v.pop(), n = k.length;
    if (n) {
      k[0] = lk; v[0] = lv; var i = 0;
      for (;;) {
        var l = 2 * i + 1, r = l + 1, m = i;
        if (l < n && k[l] < k[m]) m = l; if (r < n && k[r] < k[m]) m = r;
        if (m === i) break;
        var tk = k[m]; k[m] = k[i]; k[i] = tk; var tv = v[m]; v[m] = v[i]; v[i] = tv; i = m;
      }
    }
    return top;
  };
  function dist(a, b) { return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.z - b.z) * (a.z - b.z)); }

  // logic: scene_logic. opts: {cell(m, 기본 0.2), radius(걷는 몸 반경, 기본 logic 반경), speed(m/s)}
  function create(logic, opts) {
    opts = opts || {};
    var B0 = logic.bounds || logic.layout.bounds, B = B0.minX !== undefined ? { x0: B0.minX, x1: B0.maxX, z0: B0.minZ, z1: B0.maxZ } : B0, cell = opts.cell || 0.2, grid = null, tmp = { x: 0, z: 0 };
    var R = opts.radius;
    function free(x, z) { tmp.x = x; tmp.z = z; return !logic.moveCircle(tmp, 0, 0, R); }
    function getGrid() {
      if (grid) return grid;
      var nx = Math.ceil((B.x1 - B.x0) / cell), nz = Math.ceil((B.z1 - B.z0) / cell), bl = new Uint8Array(nx * nz);
      for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) bl[j * nx + i] = free(B.x0 + (i + 0.5) * cell, B.z0 + (j + 0.5) * cell) ? 0 : 1;
      grid = { nx: nx, nz: nz, blocked: bl };
      return grid;
    }
    function ci(x) { var g = getGrid(); return Math.max(0, Math.min(g.nx - 1, Math.floor((x - B.x0) / cell))); }
    function cj(z) { var g = getGrid(); return Math.max(0, Math.min(g.nz - 1, Math.floor((z - B.z0) / cell))); }
    function cx(i) { return B.x0 + (i + 0.5) * cell; }
    function cz(j) { return B.z0 + (j + 0.5) * cell; }
    function nearestOpen(x, z, maxCells) {
      var g = getGrid(), i0 = ci(x), j0 = cj(z), best = -1, bd = 1e18;
      for (var r = 0; r <= maxCells; r++) {
        for (var j = j0 - r; j <= j0 + r; j++) for (var i = i0 - r; i <= i0 + r; i++) {
          if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) continue;
          if (r > 0 && Math.abs(i - i0) !== r && Math.abs(j - j0) !== r) continue;
          var idx = j * g.nx + i; if (g.blocked[idx]) continue;
          var dx = cx(i) - x, dz = cz(j) - z, d = dx * dx + dz * dz;
          if (d < bd) { bd = d; best = idx; }
        }
        if (best >= 0 && r >= 1) break;
      }
      return best;
    }
    function passable(i, j, di, dj) {
      var g = getGrid(), ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= g.nx || nj >= g.nz || g.blocked[nj * g.nx + ni]) return false;
      if (di && dj && (g.blocked[j * g.nx + ni] || g.blocked[nj * g.nx + i])) return false;
      return true;
    }
    function lineClear(a, b) {
      var dx = b.x - a.x, dz = b.z - a.z, d = Math.sqrt(dx * dx + dz * dz), n = Math.max(1, Math.ceil(d / 0.1));
      for (var k = 1; k < n; k++) { var u = k / n; if (!free(a.x + dx * u, a.z + dz * u)) return false; }
      return true;
    }
    function astar(s, t) {
      var g = getGrid(), N = g.nx * g.nz, gs = new Float32Array(N), came = new Int32Array(N), closed = new Uint8Array(N), q;
      for (q = 0; q < N; q++) { gs[q] = 1e9; came[q] = -1; }
      var ti = t % g.nx, tj = (t - ti) / g.nx, heap = new Heap();
      function hf(i, j) { var dx = Math.abs(i - ti), dz = Math.abs(j - tj); return (dx + dz) + (SQ2 - 2) * Math.min(dx, dz); }
      gs[s] = 0; heap.push(hf(s % g.nx, Math.floor(s / g.nx)), s);
      while (heap.size()) {
        var cur = heap.pop();
        if (closed[cur]) continue;
        if (cur === t) break;
        closed[cur] = 1;
        var i = cur % g.nx, j = (cur - i) / g.nx;
        for (var n = 0; n < 8; n++) {
          var d = NB[n]; if (!passable(i, j, d[0], d[1])) continue;
          var ni = cur + d[1] * g.nx + d[0]; if (closed[ni]) continue;
          var ng = gs[cur] + d[2];
          if (ng < gs[ni]) { gs[ni] = ng; came[ni] = cur; heap.push(ng + hf(ni % g.nx, Math.floor(ni / g.nx)), ni); }
        }
      }
      if (t !== s && came[t] < 0) return null;
      var out = [], c = t;
      while (c >= 0 && out.length <= N) { out.push(c); if (c === s) break; c = came[c]; }
      return out.reverse();
    }
    function findPath(from, to) {
      var g = getGrid(), s = nearestOpen(from.x, from.z, 4), t = nearestOpen(to.x, to.z, 4);
      if (s < 0 || t < 0) return null;
      var cp = astar(s, t);
      if (!cp) return null;
      var raw = [{ x: from.x, z: from.z }];
      for (var k = 0; k < cp.length; k++) { var i = cp[k] % g.nx; raw.push({ x: cx(i), z: cz((cp[k] - i) / g.nx) }); }
      raw.push({ x: to.x, z: to.z });
      var pts = [raw[0]], a = 0;
      while (a < raw.length - 1) {
        var far = a + 1;
        for (var b = raw.length - 1; b > a + 1; b--) if (lineClear(raw[a], raw[b])) { far = b; break; }
        pts.push(raw[far]); a = far;
      }
      var len = 0;
      for (k = 1; k < pts.length; k++) len += dist(pts[k - 1], pts[k]);
      return { pts: pts, len: len };
    }
    var S = {
      free: free, findPath: findPath, lineClear: lineClear,
      invalidate: function () { grid = null; },
      seatStation: function (id) { var sp = logic.standPos(id); return sp ? { id: id, x: sp.x, z: sp.z, yaw: sp.yaw } : null; },
      startWalk: function (path, target) { return { pts: path.pts, i: 1, target: target, t: 0, ref: { x: path.pts[0].x, z: path.pts[0].z }, refT: 0, replans: 0, len: path.len }; },
      // 매 프레임: 원하는 속도(out.vx, vz, speed, yaw). 도착하면 out.done, 1초에 15cm 도 못 가면 out.stuck
      stepWalk: function (w, me, dt, out, top) {
        out.done = false; out.stuck = false; out.vx = out.vz = out.speed = 0;
        var pts = w.pts, last = pts.length - 1;
        if (w.i > last) w.i = last;
        var tg = pts[w.i], dx = tg.x - me.x, dz = tg.z - me.z, d = Math.sqrt(dx * dx + dz * dz);
        while (w.i < last && d < 0.12) {   // 0.12 m 안에서 다음 점으로(예전 0.3 m 는 모서리를 잘라 가구에 파고들었다)
          w.i++; tg = pts[w.i]; dx = tg.x - me.x; dz = tg.z - me.z; d = Math.sqrt(dx * dx + dz * dz); }
        if (w.i === last && d < 0.06) { out.done = true; return out; }
        top = top || opts.speed || 1.3;
        var sp = w.i === last ? Math.min(top, 0.35 + d * 2.4) : top;
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
  return { create: create };
});
