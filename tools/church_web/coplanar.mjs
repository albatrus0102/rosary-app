// 같은 높이에 겹쳐 놓인 위쪽을 보는 가로 면(바닥·문턱·단 윗면) 찾기. z-fighting(깜빡임)의 원인이 되는 배치를 정적으로 잡는다.
// 성당 빌더를 Node 에서 돌려(church_harness) _prepare 후의 실제 메시 삼각형을 모은다. 두 삼각형이 높이 차 TOL 이내이고 겹침 넓이가 MIN_AREA 이상이면 쌍으로 보고한다.
import { loadChurches } from './church_harness.mjs';

export const TOL = 0.001;        // 1 mm
export const MIN_AREA = 0.3;

function area(poly) { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
// Sutherland–Hodgman: subject(볼록) 를 clip(볼록, 반시계) 로 자른다
function clipPoly(subject, clip) {
  let out = subject;
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length], inp = out; out = [];
    const side = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    for (let j = 0; j < inp.length; j++) {
      const p = inp[j], q = inp[(j + 1) % inp.length], sp = side(p), sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
  }
  return out;
}
const ccw = (t) => (area(t) < 0 ? [t[0], t[2], t[1]] : t);

/** 한 성당의 위쪽·아래쪽을 보는 가로 삼각형을 모은다: [{y, up, tri:[[x,z]x3], mesh, bb}] */
export function horizontalTris(c) {
  const items = c.prepare();
  const root = c.ctx.root; root.updateMatrixWorld(true);
  const out = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.geometry || !o.geometry.attributes.position) return;
    const m = o.material; if (m && (m.transparent || m.depthWrite === false)) return;
    const pos = o.geometry.attributes.position, idx = o.geometry.index, n = idx ? idx.count : pos.count;
    // InstancedMesh: 인스턴스마다 instanceMatrix 를 곱한 월드 좌표로 본다(예전에는 지역 좌표 한 벌만 보았다 — 같은 모듈을 여러 덩어리로 나누면 덩어리끼리 겹쳐 보였다)
    const mats = [];
    if (o.isInstancedMesh && o.instanceMatrix) { const T = o.matrixWorld.constructor; for (let k = 0; k < o.count; k++) { const im = new T().fromArray(o.instanceMatrix.array, k * 16); mats.push(new T().multiplyMatrices(o.matrixWorld, im).elements); } }
    else mats.push(o.matrixWorld.elements);
    for (const e of mats) {
    const P = (k) => { const i = idx ? idx.getX(k) : k, x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); return [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]; };
    for (let i = 0; i + 2 < n; i += 3) {
      const a = P(i), b = P(i + 1), d = P(i + 2);
      const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0], len = Math.hypot(nx, ny, nz);
      if (len < 1e-9 || ny / len < 0.9999) continue;   // 위를 보는 면만(아래를 보는 면은 올려놓은 물건의 밑면이라 위 물체에 덮여 안 보인다)
      const side = m && m.side === 2;   // THREE.DoubleSide
      const tri = ccw([[a[0], a[2]], [b[0], b[2]], [d[0], d[2]]]);
      if (Math.abs(area(tri)) < 1e-6) continue;
      out.push({ y: (a[1] + b[1] + d[1]) / 3, up: side ? 0 : 1, tri, mesh: o, col: m && m.color ? m.color.getHexString() : '', key: 'mesh:' + (m && m.color ? m.color.getHexString() : '') + ':' + (m && m.map ? m.map.uuid : '') });
    }
    }
  });
  // 정점색 배치(벽·박스·계단·가구): 월드 좌표의 풀린 삼각형 목록. 유리·빛·AO 자국은 깊이를 안 쓰거나 일부러 겹치므로 뺀다.
  (items || []).forEach((it) => {
    if (it.decal || /^(glass|glassRefl|glow|outside)$/.test(it.name)) return;
    const p = it.batch.p, mesh = { name: 'batch:' + it.name, geometry: { type: 'Batch' } };
    for (let i = 0; i + 8 < p.length; i += 9) {
      const e1 = [p[i + 3] - p[i], p[i + 4] - p[i + 1], p[i + 5] - p[i + 2]], e2 = [p[i + 6] - p[i], p[i + 7] - p[i + 1], p[i + 8] - p[i + 2]];
      const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0], len = Math.hypot(nx, ny, nz);
      if (len < 1e-9 || ny / len < 0.9999) continue;
      const tri = ccw([[p[i], p[i + 2]], [p[i + 3], p[i + 5]], [p[i + 6], p[i + 8]]]);
      if (Math.abs(area(tri)) < 1e-6) continue;
      const cc = it.batch.c, q = (k) => Math.round((cc[i + k] + cc[i + 3 + k] + cc[i + 6 + k]) / 3 / 0.03);
      out.push({ y: (p[i + 1] + p[i + 4] + p[i + 7]) / 3, up: 1, tri, mesh, col: it.name, key: 'batch:' + it.name + ':' + q(0) + ',' + q(1) + ',' + q(2) });
    }
  });
  return out;
}

export function findCoplanar(tris) {
  const T = tris.map((t, i) => ({ ...t, i, x0: Math.min(...t.tri.map((p) => p[0])), x1: Math.max(...t.tri.map((p) => p[0])), z0: Math.min(...t.tri.map((p) => p[1])), z1: Math.max(...t.tri.map((p) => p[1])) }));
  T.sort((a, b) => a.y - b.y);
  const hits = [];
  for (let i = 0; i < T.length; i++) {
    const a = T[i];
    for (let j = i + 1; j < T.length && T[j].y - a.y <= TOL; j++) {
      const b = T[j];
      if (a.up !== b.up && a.up * b.up !== 0) continue;
      if (a.up <= 0 && a.y < 1) continue;                                   // 바닥 아래를 보는 면(상자 밑면)은 바닥판 아래라 안 보인다                      // 마주 보는 면(안쪽 면끼리)은 같은 높이여도 한쪽은 뒷면이라 안 보인다
      if (a.x1 <= b.x0 || b.x1 <= a.x0 || a.z1 <= b.z0 || b.z1 <= a.z0) continue;
      if (a.key === b.key) continue;                                          // 같은 배치·같은 색·같은 법선이면 어느 쪽이 이겨도 같은 화면(깜빡임 없음)
      const ov = Math.abs(area(clipPoly(a.tri, b.tri)));
      if (ov >= MIN_AREA) hits.push({ y: +((a.y + b.y) / 2).toFixed(4), area: +ov.toFixed(3), a, b, at: [(Math.max(a.x0, b.x0) + Math.min(a.x1, b.x1)) / 2, (Math.max(a.z0, b.z0) + Math.min(a.z1, b.z1)) / 2] });
    }
  }
  return hits;
}

// 같은 면을 이루는 삼각형 쌍(사각형의 대각선 양쪽)이나 같은 메시 안에서 이웃한 삼각형은 겹침 넓이가 0 이라 걸리지 않는다.
export function audit(opts = {}) {
  const { churches } = loadChurches();
  const res = {};
    for (const c of churches) {
    if (opts.only && !opts.only.includes(c.id)) continue;
    const hits = findCoplanar(horizontalTris(c));
    // (y, 위치 8cm 격자) 로 묶어 같은 자리 중복은 하나로
    const seen = new Map();
    hits.forEach((h) => { const k = h.y.toFixed(3) + '|' + Math.round(h.at[0] / 0.5) + '|' + Math.round(h.at[1] / 0.5); if (!seen.has(k)) seen.set(k, h); });
    res[c.id] = [...seen.values()];
  }
  return res;
}
