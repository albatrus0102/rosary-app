// lm_unwrap.mjs — 라이트맵용 둘째 UV(uv2) 펼치기 + 아틀라스 싣기(순수 JS, 결정적 — THREE 없음).
// xatlas 가 이 저장소·소유자 PC 어디에도 없어 같은 일을 작게 한다: 평면에 가까운 이웃 삼각형을 한 조각(chart)으로 묶고,
// 그 평면에 투영해 미터 단위 직사각형으로 만든 뒤, 텍셀 밀도(texels/m)로 키워 선반(shelf) 방식으로 겹치지 않게 싣는다.
// 조각 둘레에는 pad 화소를 남긴다(굽기 margin 이 그 안을 채운다 → 겹침·번짐 없음).
//
// unwrap(P, opts) → { w, h, uv(Float32Array 정점×2, glTF 방향: v 는 위→아래), charts, texels, tpm, scale }
//   P: 삼각형 낱개 정점 위치(Float32Array|Array, 삼각형×9, 월드 m)
//   opts: tpm(기본 32 texel/m) · pad(4 화소) · maxSize(2048) · cos(0.94 ≈ 20°: 한 조각으로 묶는 법선 차) ·
//         focus([x,y,z]) · near(6 m: 이 거리 밖 조각은 거리에 반비례해 밀도를 낮춘다) · minK(0.2) · align(4: 아틀라스 가로·세로 배수)
// 한 조각 안 삼각형은 같은 평면 투영이라 서로 겹치지 않는다(법선이 기준과 20° 안 + 이웃으로만 자람). 조각끼리는 직사각형이 겹치지 않는다.
export const UNWRAP_V = 1;

function faceInfo(P, t) {
  const i = t * 9;
  const ax = P[i + 3] - P[i], ay = P[i + 4] - P[i + 1], az = P[i + 5] - P[i + 2];
  const bx = P[i + 6] - P[i], by = P[i + 7] - P[i + 1], bz = P[i + 8] - P[i + 2];
  const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  const l = Math.hypot(nx, ny, nz);
  return { nx: l > 0 ? nx / l : 0, ny: l > 0 ? ny / l : 1, nz: l > 0 ? nz / l : 0, area: l / 2 };
}

/** 이웃(모서리를 나눈) 삼각형으로 자라는 평면 조각들 → [[삼각형 번호...], ...] */
export function buildCharts(P, cosMax = 0.94) {
  const nt = Math.floor(P.length / 9), Q = 1e4;
  const vid = new Map(), V = new Int32Array(nt * 3);
  for (let k = 0; k < nt * 3; k++) {
    const key = Math.round(P[k * 3] * Q) + ',' + Math.round(P[k * 3 + 1] * Q) + ',' + Math.round(P[k * 3 + 2] * Q);
    let id = vid.get(key); if (id === undefined) { id = vid.size; vid.set(key, id); }
    V[k] = id;
  }
  const edges = new Map();
  for (let t = 0; t < nt; t++) for (let e = 0; e < 3; e++) {
    const a = V[t * 3 + e], b = V[t * 3 + (e + 1) % 3];
    if (a === b) continue;
    const key = a < b ? a + '_' + b : b + '_' + a;
    const l = edges.get(key); if (l) l.push(t); else edges.set(key, [t]);
  }
  const F = []; for (let t = 0; t < nt; t++) F.push(faceInfo(P, t));
  const chartOf = new Int32Array(nt).fill(-1), charts = [];
  for (let s = 0; s < nt; s++) {
    if (chartOf[s] >= 0) continue;
    const id = charts.length, list = [s], seed = F[s];
    chartOf[s] = id;
    if (seed.area > 1e-12) {
      for (let q = 0; q < list.length; q++) {
        const t = list[q];
        for (let e = 0; e < 3; e++) {
          const a = V[t * 3 + e], b = V[t * 3 + (e + 1) % 3];
          const nb = edges.get(a < b ? a + '_' + b : b + '_' + a);
          if (!nb) continue;
          for (const u of nb) {
            if (chartOf[u] >= 0) continue;
            const f = F[u];
            if (f.area <= 1e-12 || f.nx * seed.nx + f.ny * seed.ny + f.nz * seed.nz < cosMax) continue;
            chartOf[u] = id; list.push(u);
          }
        }
      }
    }
    charts.push(list);
  }
  return { charts, faces: F };
}

/** 직사각형들(w,h 화소)을 폭 W 선반에 싣는다 → {h, pos:[[x,y]...]} (큰 높이부터, 순서는 결정적) */
export function shelfPack(rects, W) {
  const order = rects.map((r, i) => i).sort((a, b) => (rects[b].h - rects[a].h) || (rects[b].w - rects[a].w) || (a - b));
  const pos = new Array(rects.length);
  let x = 0, y = 0, sh = 0;
  for (const i of order) {
    const r = rects[i];
    if (r.w > W) return null;
    if (x + r.w > W) { y += sh; x = 0; sh = 0; }
    pos[i] = [x, y]; x += r.w; if (r.h > sh) sh = r.h;
  }
  return { h: y + sh, pos };
}

const ceilTo = (v, a) => Math.ceil(v / a) * a;

export function unwrap(P, opts = {}) {
  const tpm0 = opts.tpm || 32, pad = opts.pad === undefined ? 4 : opts.pad, maxSize = opts.maxSize || 2048, align = opts.align || 4;
  const focus = opts.focus || [0, 1, 0], near = opts.near || 6, minK = opts.minK || 0.2;
  const nt = Math.floor(P.length / 9);
  const { charts, faces } = buildCharts(P, opts.cos || 0.94);
  // 조각마다: 평면 기준(법선 평균, u = 가장 큰 삼각형의 가장 긴 변), 미터 좌표, 거리 밀도
  const C = charts.map((list) => {
    let nx = 0, ny = 0, nz = 0, big = list[0], bigA = -1, cx = 0, cy = 0, cz = 0, A = 0;
    for (const t of list) {
      const f = faces[t]; nx += f.nx * f.area; ny += f.ny * f.area; nz += f.nz * f.area;
      if (f.area > bigA) { bigA = f.area; big = t; }
      const i = t * 9; cx += (P[i] + P[i + 3] + P[i + 6]) / 3; cy += (P[i + 1] + P[i + 4] + P[i + 7]) / 3; cz += (P[i + 2] + P[i + 5] + P[i + 8]) / 3; A += f.area;
    }
    let l = Math.hypot(nx, ny, nz); if (l < 1e-12) { const f = faces[list[0]]; nx = f.nx; ny = f.ny; nz = f.nz; l = 1; }
    nx /= l; ny /= l; nz /= l;
    const i = big * 9; let ux = 0, uy = 0, uz = 0, best = -1;
    for (let e = 0; e < 3; e++) {
      const a = e * 3, b = ((e + 1) % 3) * 3;
      let dx = P[i + b] - P[i + a], dy = P[i + b + 1] - P[i + a + 1], dz = P[i + b + 2] - P[i + a + 2];
      const dn = dx * nx + dy * ny + dz * nz; dx -= dn * nx; dy -= dn * ny; dz -= dn * nz;
      const dl = Math.hypot(dx, dy, dz); if (dl > best) { best = dl; ux = dx; uy = dy; uz = dz; }
    }
    let ul = Math.hypot(ux, uy, uz);
    if (ul < 1e-9) { if (Math.abs(ny) < 0.9) { ux = nz; uy = 0; uz = -nx; } else { ux = 1; uy = 0; uz = 0; } ul = Math.hypot(ux, uy, uz); }
    ux /= ul; uy /= ul; uz /= ul;
    const vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;
    let u0 = 1e30, u1 = -1e30, v0 = 1e30, v1 = -1e30;
    for (const t of list) for (let j = 0; j < 3; j++) {
      const k = t * 9 + j * 3, uu = P[k] * ux + P[k + 1] * uy + P[k + 2] * uz, vv = P[k] * vx + P[k + 1] * vy + P[k + 2] * vz;
      if (uu < u0) u0 = uu; if (uu > u1) u1 = uu; if (vv < v0) v0 = vv; if (vv > v1) v1 = vv;
    }
    const n = list.length; cx /= n; cy /= n; cz /= n;
    const d = Math.hypot(cx - focus[0], cy - focus[1], cz - focus[2]);
    const k = Math.max(minK, Math.min(1, near / Math.max(near, d)));
    return { list, u: [ux, uy, uz], v: [vx, vy, vz], u0, u1, v0, v1, k, area: A };
  });
  let scale = 1, out = null;
  for (let tries = 0; tries < 40 && !out; tries++) {
    const tpm = tpm0 * scale;
    const rects = C.map((c) => ({ w: Math.max(1, Math.ceil((c.u1 - c.u0) * tpm * c.k)) + 2 * pad, h: Math.max(1, Math.ceil((c.v1 - c.v0) * tpm * c.k)) + 2 * pad }));
    let area = 0; for (const r of rects) area += r.w * r.h;
    let maxW = 0; for (const r of rects) if (r.w > maxW) maxW = r.w;
    let W = ceilTo(Math.max(maxW, Math.sqrt(area * 1.12)), align);
    let pk = null;
    for (let g = 0; g < 8; g++) {   // 너무 길쭉하면 폭을 넓혀 다시
      if (W > maxSize) break;
      pk = shelfPack(rects, W);
      if (pk && ceilTo(pk.h, align) <= Math.max(W * 1.5, 16)) break;
      W = ceilTo(W * 1.15, align);
    }
    if (pk && W <= maxSize && ceilTo(pk.h, align) <= maxSize) {
      const H = Math.max(align, ceilTo(pk.h, align)), uv = new Float32Array(nt * 6);
      let texels = 0;
      C.forEach((c, ci) => {
        const r = rects[ci], [ox, oy] = pk.pos[ci], s = tpm * c.k;
        const iw = r.w - 2 * pad, ih = r.h - 2 * pad;
        const su = (c.u1 - c.u0) > 0 ? Math.min(s, iw / (c.u1 - c.u0)) : 0, sv = (c.v1 - c.v0) > 0 ? Math.min(s, ih / (c.v1 - c.v0)) : 0;
        texels += iw * ih;
        for (const t of c.list) for (let j = 0; j < 3; j++) {
          const k = t * 9 + j * 3;
          const uu = P[k] * c.u[0] + P[k + 1] * c.u[1] + P[k + 2] * c.u[2] - c.u0, vv = P[k] * c.v[0] + P[k + 1] * c.v[1] + P[k + 2] * c.v[2] - c.v0;
          const px = ox + pad + (su ? uu * su : iw / 2), py = oy + pad + (sv ? vv * sv : ih / 2);
          uv[t * 6 + j * 2] = px / W; uv[t * 6 + j * 2 + 1] = py / H;
        }
      });
      out = { w: W, h: H, uv, charts: C.length, texels, tpm, scale, rects: rects.map((r, i) => ({ x: pk.pos[i][0], y: pk.pos[i][1], w: r.w, h: r.h })) };
    } else scale *= 0.85;
  }
  if (!out) throw new Error('lm_unwrap: could not pack into ' + maxSize);
  return out;
}

/** 시험용: 두 조각 직사각형이 겹치는가(화소) */
export function rectsOverlap(rects) {
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) return [i, j];
  }
  return null;
}
