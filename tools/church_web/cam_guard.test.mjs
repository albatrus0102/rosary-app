// 카메라 잘라내기(cam_guard.js createCut) 전수 시험: 모든 성당의 걸을 수 있는 자리마다(여러 층은 그 자리의 바닥마다) 카메라를 360°(30° 간격) ×
// pitch 2 × 줌 2 로 돌려(카메라는 벽을 개의치 않고 사용자 각도·거리 그대로 — 벽 속·건물 밖에도 선다) 잘라내기가 자리 잡은 뒤(0.3초)
// 아바타(머리·가슴)가 지우지 못한 면에 가려지는지 본다. docs/church/CAMERA_MODES.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { makeEnv, load, DT } from './cam_sim.mjs';
const require = createRequire(import.meta.url);
const Guard = require('../../assets/church/cam_guard.js');

function sweep(env) {
  const { L, c, guard } = env, B = c.layout.bounds; let n = 0, occ = 0; const ex = [];
  for (let x = B.x0 + 0.6; x < B.x1; x += 2.6) for (let z = B.z0 + 0.6; z < B.z1; z += 2.6) for (const fl of (L.multi ? L.floorsAt(x, z) : [null])) {
    if (fl !== null && L.floorY(x, z, fl) !== fl) continue;
    const p = { x, z }; if (L.moveCircle(p, 0, 0, undefined, fl === null ? undefined : fl)) continue;
    const foot = fl === null ? (L.floorY(x, z) || 0) : fl, fy = foot + 1.0;
    for (const zoom of [1, 1.6]) for (let k = 0; k < 12; k++) for (const pitch of [0.2, 0.45]) {
      const D = 7.2 * zoom, yaw = k * Math.PI / 6, cp = Math.cos(pitch);
      const cx = x + Math.sin(yaw) * cp * D, cy = fy + Math.sin(pitch) * D, cz = z + Math.cos(yaw) * cp * D;
      const C = Guard.createCut(), O = {}, I = { guard, cx, cy, cz, mx: x, my: fy, mz: z, hy: foot + 1.55, foot, low: false, fp: 0 };
      for (let f = 0; f < 10; f++) C.step(I, DT, O);
      n++;
      if (C.blocked(guard, x, foot + 1.55, z) && C.blocked(guard, x, fy, z)) { occ++; if (ex.length < 4) ex.push(`(${x.toFixed(1)},${z.toFixed(1)},${foot.toFixed(1)}) yaw${k * 30} p${pitch} z${zoom}`); }
    }
  }
  return { n, occ, ex };
}

for (const id of load().churches.map((c) => c.id)) {
  test(`잘라내기: ${id} — 카메라를 어디에 두든(벽 속·건물 밖 포함) 아바타가 지우지 못한 면에 가려지지 않는다(1% 이하)`, () => {
    const env = makeEnv(id, Guard);
    assert.ok(env.guard.triangles > 100, 'guard triangles');
    const r = sweep(env);
    if (process.env.CAMG_DEBUG) console.log(id, r.n, r.occ, JSON.stringify(r.ex));
    assert.ok(r.n > 200, `표본 ${r.n}`);
    assert.ok(r.occ <= r.n * 0.01, `${id}: 가림 ${r.occ}/${r.n}: ${r.ex.join('; ')}`);
  });
}
