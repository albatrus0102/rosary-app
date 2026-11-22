// ao_bvh.mjs — 미리 굽는 AO(ao_bake.mjs)용 BVH·광선 추적. 브라우저·three 없이 순수 JS(결정적: 같은 입력이면 같은 출력).
// 삼각형은 Float32Array(삼각형마다 9개: a,b,c) + 앞면 법선(3개) + 양면 여부(1바이트). 뒷면에 닿은 광선은 가림으로 치지 않는다
// (물체 속에 묻힌 정점·벽 뒤 면이 큰 삼각형에 까만 번짐을 만들지 않게: 묻힌 정점은 '열림'으로 남는다).

const LEAF = 4, BINS = 12;

/** tris: Float32Array(9n), fn: Float32Array(3n) 앞면 법선, two: Uint8Array(n) 1=양면. → {nodes, idx, tris, fn, two} (전부 SharedArrayBuffer 로 옮길 수 있는 타입 배열) */
export function buildBVH(tris, fn, two) {
  const n = tris.length / 9;
  const cx = new Float32Array(n), cy = new Float32Array(n), cz = new Float32Array(n);
  const bb = new Float32Array(n * 6);
  for (let t = 0; t < n; t++) {
    const o = t * 9;
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let k = 0; k < 3; k++) {
      const x = tris[o + k * 3], y = tris[o + k * 3 + 1], z = tris[o + k * 3 + 2];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    bb[t * 6] = x0; bb[t * 6 + 1] = y0; bb[t * 6 + 2] = z0; bb[t * 6 + 3] = x1; bb[t * 6 + 4] = y1; bb[t * 6 + 5] = z1;
    cx[t] = (x0 + x1) / 2; cy[t] = (y0 + y1) / 2; cz[t] = (z0 + z1) / 2;
  }
  const idx = new Uint32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  // 노드: [minx,miny,minz,maxx,maxy,maxz] + meta[2]: 잎이면 (start, -count), 아니면 (left, right)
  const cap = Math.max(1, 2 * Math.ceil(n / 1)), box = [], meta = [];
  const cent = [cx, cy, cz];
  function bounds(a, b) {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let i = a; i < b; i++) {
      const t = idx[i] * 6;
      if (bb[t] < x0) x0 = bb[t]; if (bb[t + 1] < y0) y0 = bb[t + 1]; if (bb[t + 2] < z0) z0 = bb[t + 2];
      if (bb[t + 3] > x1) x1 = bb[t + 3]; if (bb[t + 4] > y1) y1 = bb[t + 4]; if (bb[t + 5] > z1) z1 = bb[t + 5];
    }
    return [x0, y0, z0, x1, y1, z1];
  }
  const binCnt = new Int32Array(BINS), binB = new Float64Array(BINS * 6);
  function area(b) { const dx = b[3] - b[0], dy = b[4] - b[1], dz = b[5] - b[2]; return dx < 0 ? 0 : 2 * (dx * dy + dy * dz + dz * dx); }
  const stack = [[0, n, -1, 0]];
  while (stack.length) {
    const [a, b, parent, side] = stack.pop();
    const me = meta.length / 2;
    const B = bounds(a, b);
    box.push(...B); meta.push(0, 0);
    if (parent >= 0) meta[parent * 2 + side] = me;
    const cnt = b - a;
    if (cnt <= LEAF) { meta[me * 2] = a; meta[me * 2 + 1] = -cnt; continue; }
    // 중심 범위에서 가장 긴 축, 구간 SAH
    let c0 = [Infinity, Infinity, Infinity], c1 = [-Infinity, -Infinity, -Infinity];
    for (let i = a; i < b; i++) { const t = idx[i]; for (let k = 0; k < 3; k++) { const v = cent[k][t]; if (v < c0[k]) c0[k] = v; if (v > c1[k]) c1[k] = v; } }
    let ax = 0; if (c1[1] - c0[1] > c1[ax] - c0[ax]) ax = 1; if (c1[2] - c0[2] > c1[ax] - c0[ax]) ax = 2;
    const ext = c1[ax] - c0[ax];
    let mid = -1;
    if (ext > 1e-9) {
      binCnt.fill(0);
      for (let k = 0; k < BINS; k++) { binB[k * 6] = binB[k * 6 + 1] = binB[k * 6 + 2] = Infinity; binB[k * 6 + 3] = binB[k * 6 + 4] = binB[k * 6 + 5] = -Infinity; }
      const C = cent[ax], sc = BINS / ext;
      for (let i = a; i < b; i++) {
        const t = idx[i]; let k = Math.floor((C[t] - c0[ax]) * sc); if (k >= BINS) k = BINS - 1;
        binCnt[k]++;
        const o = t * 6, q = k * 6;
        for (let j = 0; j < 3; j++) { if (bb[o + j] < binB[q + j]) binB[q + j] = bb[o + j]; if (bb[o + 3 + j] > binB[q + 3 + j]) binB[q + 3 + j] = bb[o + 3 + j]; }
      }
      let best = Infinity, bestK = -1;
      for (let s = 1; s < BINS; s++) {
        const L = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], R = L.slice(); let nl = 0, nr = 0;
        for (let k = 0; k < BINS; k++) {
          const T = k < s ? L : R; if (k < s) nl += binCnt[k]; else nr += binCnt[k];
          for (let j = 0; j < 3; j++) { if (binB[k * 6 + j] < T[j]) T[j] = binB[k * 6 + j]; if (binB[k * 6 + 3 + j] > T[3 + j]) T[3 + j] = binB[k * 6 + 3 + j]; }
        }
        if (!nl || !nr) continue;
        const cost = area(L) * nl + area(R) * nr;
        if (cost < best) { best = cost; bestK = s; }
      }
      if (bestK > 0) {
        const split = c0[ax] + bestK / sc;
        let i = a, j = b - 1;
        while (i <= j) { if (C[idx[i]] < split) i++; else { const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; j--; } }
        mid = i;
      }
    }
    if (mid <= a || mid >= b) {   // 나눌 수 없으면(같은 중심) 반으로
      mid = (a + b) >> 1;
      const C = cent[ax], part = Array.prototype.slice.call(idx, a, b).sort((p, q) => C[p] - C[q] || p - q);
      for (let i = 0; i < part.length; i++) idx[a + i] = part[i];
    }
    stack.push([mid, b, me, 1]);
    stack.push([a, mid, me, 0]);
  }
  void cap;
  return { nodes: new Float32Array(box), meta: new Int32Array(meta), idx, tris, fn, two };
}

/** 가장 가까운 앞면(또는 양면) 교차 거리(없으면 -1). 뒷면에 닿은 것은 건너뛴다. backHit: [0] 에 가장 가까운 뒷면 거리를 적는다(없으면 Infinity). */
export function makeTracer(bvh) {
  const { nodes, meta, idx, tris, fn, two } = bvh;
  const stack = new Int32Array(128);
  return function trace(ox, oy, oz, dx, dy, dz, tmin, tmax, backHit) {
    const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz;
    let best = tmax, hit = -1, back = Infinity, sp = 0;
    stack[sp++] = 0;
    while (sp) {
      const nd = stack[--sp], o = nd * 6;
      let t0 = (nodes[o] - ox) * ix, t1 = (nodes[o + 3] - ox) * ix; if (t0 > t1) { const s = t0; t0 = t1; t1 = s; }
      let u0 = (nodes[o + 1] - oy) * iy, u1 = (nodes[o + 4] - oy) * iy; if (u0 > u1) { const s = u0; u0 = u1; u1 = s; }
      if (u0 > t0) t0 = u0; if (u1 < t1) t1 = u1;
      let w0 = (nodes[o + 2] - oz) * iz, w1 = (nodes[o + 5] - oz) * iz; if (w0 > w1) { const s = w0; w0 = w1; w1 = s; }
      if (w0 > t0) t0 = w0; if (w1 < t1) t1 = w1;
      if (t1 < t0 || t1 < tmin || t0 > best) continue;
      const m0 = meta[nd * 2], m1 = meta[nd * 2 + 1];
      if (m1 > 0) { stack[sp++] = m1; stack[sp++] = m0; continue; }
      const cnt = -m1;
      for (let i = m0; i < m0 + cnt; i++) {
        const t = idx[i], q = t * 9;
        const ax = tris[q], ay = tris[q + 1], az = tris[q + 2];
        const e1x = tris[q + 3] - ax, e1y = tris[q + 4] - ay, e1z = tris[q + 5] - az;
        const e2x = tris[q + 6] - ax, e2y = tris[q + 7] - ay, e2z = tris[q + 8] - az;
        const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (det > -1e-12 && det < 1e-12) continue;
        const inv = 1 / det, sx = ox - ax, sy = oy - ay, sz = oz - az;
        const u = (sx * px + sy * py + sz * pz) * inv; if (u < 0 || u > 1) continue;
        const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
        const v = (dx * qx + dy * qy + dz * qz) * inv; if (v < 0 || u + v > 1) continue;
        const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (tt < tmin || tt >= best) continue;
        const facing = dx * fn[t * 3] + dy * fn[t * 3 + 1] + dz * fn[t * 3 + 2];
        if (facing > 0 && !two[t]) { if (tt < back) back = tt; continue; }
        best = tt; hit = t;
      }
    }
    if (backHit) backHit[0] = back;
    return hit >= 0 ? best : -1;
  };
}

// 반구 표본(코사인 가중 Hammersley, 고정 패턴: 같은 법선이면 같은 방향 → 이웃 정점끼리 얼룩이 아니라 매끈한 값)
export function hemiDirs(n) {
  const out = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    let b = i, r = 0, f = 0.5; while (b) { if (b & 1) r += f; b >>= 1; f *= 0.5; }
    const u = (i + 0.5) / n, phi = 2 * Math.PI * r, s = Math.sqrt(u);
    out[i * 3] = s * Math.cos(phi); out[i * 3 + 1] = s * Math.sin(phi); out[i * 3 + 2] = Math.sqrt(Math.max(0, 1 - u));
  }
  return out;
}
// Duff 외(2017) 무분기 정규 직교 기저
export function frame(nx, ny, nz) {
  const s = nz >= 0 ? 1 : -1, a = -1 / (s + nz), b = nx * ny * a;
  return [1 + s * nx * nx * a, s * b, -s * nx, b, s + ny * ny * a, -ny];
}

/** 점 p, 법선 n 의 AO(1 = 열림, 0 = 막힘). 가림 세기 = 1 - t/R(가까울수록 진하다). buried: 앞면보다 뒷면에 먼저 닿은 비율(묻힌 점 판정)도 돌려준다. */
export function aoAt(trace, dirs, R, px, py, pz, nx, ny, nz, out) {
  const N = dirs.length / 3, f = frame(nx, ny, nz), bh = [0];
  const ox = px + nx * 0.004, oy = py + ny * 0.004, oz = pz + nz * 0.004;
  let occ = 0, bur = 0;
  for (let i = 0; i < N; i++) {
    const a = dirs[i * 3], b = dirs[i * 3 + 1], c = dirs[i * 3 + 2];
    const dx = f[0] * a + f[3] * b + nx * c, dy = f[1] * a + f[4] * b + ny * c, dz = f[2] * a + f[5] * b + nz * c;
    const t = trace(ox, oy, oz, dx, dy, dz, 0.002, R, bh);
    if (t >= 0) occ += 1 - t / R;
    if (bh[0] < 1.0 && (t < 0 || bh[0] < t)) bur++;   // 앞면보다 뒷면에 먼저(1m 안) 닿음 = 물체 속(기둥 발치 등)
  }
  out[0] = 1 - occ / N; out[1] = bur / N;
  return out;
}
