// 원피스 자락 관통 측정(2026-11-23): 여성 아바타(avatar.js)의 다리(스타킹) 표면이 원피스 자락을 뚫고 밖으로 나오는지 잰다.
// 스킨된 정점을 CPU 로 계산(SkinnedMesh.boneTransform)해, 다리 정점·다리 삼각형 가운데 점마다 자락(원피스 몸통 loft 의 허리 아래 줄들)에서
// 가장 가까운 점을 찾고, 그 점이 아랫단 가장자리가 아닌데 바깥쪽(법선 방향)에 있으면 「뚫고 나옴」으로 센다.
// 아랫단 아래로 나온 다리(정상)는 가장 가까운 점이 아랫단 가장자리라서 세지 않는다. skirt.test.mjs·skirt_report.mjs 가 쓴다.
import { loadAvatar, ASSETS } from './gait_lib.mjs';

const layouts = {};
/** 옷(cloth) 지오메트리 안에서 원피스 몸통 loft 와 다리 loft 의 정점 범위(avatar.js assemble: buildCoat → buildSleeves → buildPants 순서, 여성) */
export function clothLayout(dir = ASSETS, q = 0) {
  const key = dir + ':' + q;
  if (layouts[key]) return layouts[key];
  const { A } = loadAvatar(dir), D = A._dbg;
  const mb = new D.MB();
  D.buildCoat(mb, q);
  D.buildSleeves(mb, q);
  const legStart = mb.vc;
  D.buildPants(mb, q);
  const legEnd = mb.vc;
  const nu = q === 0 ? 24 : 10, rows = q === 0 ? 14 : 7;   // avatar.js buildCoat: 여성 열 수, 줄 수(COAT_YS / COAT_YS_MID)
  const restY = (r) => mb.pos[(r * nu) * 3 + 1];
  let r0 = 0; while (r0 < rows - 1 && restY(r0) > 0.95) r0++;   // 허리(0.93) 언저리부터 아래 = 자락
  const legIdx = [];
  for (let i = 0; i < mb.idx.length; i += 3) if (mb.idx[i] >= legStart && mb.idx[i] < legEnd) legIdx.push(mb.idx[i], mb.idx[i + 1], mb.idx[i + 2]);
  return (layouts[key] = { nu, rows, r0, legStart, legEnd, legIdx, restY: Array.from({ length: rows }, (_, r) => restY(r)) });
}

function closestOnTri(p, a, b, c, out) {   // Ericson, Real-Time Collision Detection 5.1.5. out = [x,y,z, wa, wb, wc]
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const set = (u, v, w) => { out[0] = a[0] * u + b[0] * v + c[0] * w; out[1] = a[1] * u + b[1] * v + c[1] * w; out[2] = a[2] * u + b[2] * v + c[2] * w; out[3] = u; out[4] = v; out[5] = w; return out; };
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return set(1, 0, 0);
  const bp = [p[0] - b[0], p[1] - b[1], p[2] - b[2]], d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return set(0, 1, 0);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return set(1 - v, v, 0); }
  const cp = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return set(0, 0, 1);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return set(1 - w, 0, w); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return set(0, 1 - w, w); }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  return set(1 - v - w, v, w);
}

function segTri(p, q, a, b, c) {   // 선분 pq 와 삼각형 abc 가 만나는가(Möller–Trumbore, 0 < t < 1)
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
  const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]], det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
  if (Math.abs(det) < 1e-12) return false;
  const f = 1 / det, s = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], u = f * (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]);
  if (u < 0 || u > 1) return false;
  const qq = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]], v = f * (d[0] * qq[0] + d[1] * qq[1] + d[2] * qq[2]);
  if (v < 0 || u + v > 1) return false;
  const t = f * (e2[0] * qq[0] + e2[1] * qq[1] + e2[2] * qq[2]);
  return t > 0 && t < 1;
}

/** 지금 자세(av.update 뒤)에서 다리가 자락 천을 뚫고 나온 정도.
 *  다리 loft 의 세로줄(엉덩이 안쪽 맨 윗고리 → 발목)마다 위에서부터 내려가며 자락 삼각형을 지나는 횟수를 센다.
 *  골반 안(자락 안)에서 출발하므로 천을 홀수 번 지난 뒤의 점은 「천을 뚫고 밖에 있는 다리」다(아랫단 구멍으로 나온 다리는 천을 지나지 않으므로 세지 않는다).
 *  cross: 천을 지난 세로 선분 수(0 이면 뚫음 없음), count: 천 밖에 나온 점(정점 + 세로 선분 가운데 점) 수, maxDepth: 그 가운데 아랫단보다 위의 점이 자락 겉면에서 떨어진 최대 거리(m).
 *  level: 'near' | 'mid'. diag: 천을 지난 선분의 자리(골반 기준)도 돌려준다. */
export function skirtPenetration(av, { dir = ASSETS, level = 'near', diag = false } = {}) {
  const { T } = loadAvatar(dir);
  const q = level === 'near' ? 0 : 1, L = clothLayout(dir, q), mesh = av.meshes[level].cloth;
  av.root.updateMatrixWorld(true);
  mesh.skeleton.update();
  const v = new T.Vector3(), P = {};
  const pos = mesh.geometry.attributes.position;
  const sk = (i) => { if (P[i]) return P[i]; v.fromBufferAttribute(pos, i); mesh.boneTransform(i, v); v.applyMatrix4(mesh.matrixWorld); return (P[i] = [v.x, v.y, v.z]); };
  const tris = [], { nu, rows, r0 } = L;
  for (let r = r0; r < rows - 1; r++) for (let i = 0; i < nu; i++) {
    const a = r * nu + i, b = r * nu + (i + 1) % nu, c = (r + 1) * nu + i, d = (r + 1) * nu + (i + 1) % nu;
    tris.push([sk(a), sk(b), sk(c)], [sk(b), sk(d), sk(c)]);
  }
  const o = new Array(6);
  const dist = (p) => { let best = 1e9; for (const t of tris) { closestOnTri(p, t[0], t[1], t[2], o); best = Math.min(best, (p[0] - o[0]) ** 2 + (p[1] - o[1]) ** 2 + (p[2] - o[2]) ** 2); } return Math.sqrt(best); };
  const lr = q === 0 ? 8 : 5, ln = q === 0 ? 10 : 6;   // avatar.js buildPants: 다리 고리 수 · 열 수(여성은 밑단·골반 없음 → 왼다리, 오른다리 순서)
  let hemY = 1e9; for (let i = 0; i < nu; i++) hemY = Math.min(hemY, sk((rows - 1) * nu + i)[1]);   // 아랫단에서 가장 낮은 점(세계 y)
  const hips = new T.Vector3(); av.bones[1].getWorldPosition(hips);
  const inv = new T.Matrix4().copy(av.bones[1].matrixWorld).invert(), lv = new T.Vector3();
  let count = 0, maxDepth = 0, cross = 0; const where = [];
  for (let leg = 0; leg < 2; leg++) for (let i = 0; i < ln; i++) {
    let odd = false;
    for (let j = 0; j < lr - 1; j++) {
      const p = sk(L.legStart + leg * lr * ln + j * ln + i), n = sk(L.legStart + leg * lr * ln + (j + 1) * ln + i);
      let c = 0; for (const t of tris) if (segTri(p, n, t[0], t[1], t[2])) c++;
      if (c) { cross++; if (diag) { lv.set((p[0] + n[0]) / 2, (p[1] + n[1]) / 2, (p[2] + n[2]) / 2).applyMatrix4(inv); where.push({ leg: leg ? 'R' : 'L', j, i, x: +lv.x.toFixed(3), y: +lv.y.toFixed(3), z: +lv.z.toFixed(3) }); } }
      const wasOdd = odd; if (c % 2) odd = !odd;
      // 선분 가운데 점은 앞뒤 상태가 모두 바깥일 때만. 깊이는 아랫단(가장 낮은 점)보다 위의 점만(천을 뚫은 다리가 그 아래로 이어지는 길이는 빼고)
      const mid = [(p[0] + n[0]) / 2, (p[1] + n[1]) / 2, (p[2] + n[2]) / 2];
      for (const [pt, out] of [[mid, wasOdd && odd], [n, odd]]) {
        if (!out) continue;
        count++;
        if (pt[1] > hemY) maxDepth = Math.max(maxDepth, dist(pt));
      }
    }
  }
  if (diag) return { count, maxDepth, cross, where };
  return { count, maxDepth, cross };
}
