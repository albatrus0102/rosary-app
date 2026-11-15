// 3인칭 카메라 벽 가드(cam_guard.js) 시험: 모든 성당에서 걸을 수 있는 자리마다 카메라를 360° 돌려(main.js updateCamera 와 같은 계산)
// 카메라가 실내에 있는지 본다. '실내' = 위로 쏜 선이 천장/지붕에 닿고, 수평 8방향 중 6방향 이상이 면에 닿는다(문 한 곳은 열려 있을 수 있다).
// 예전(상자 경계만)에는 성 베드로 후진·밀라노 경당 같은 굽은 벽 밖 상자 모서리로 카메라가 나가 하늘이 보였다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Guard = require('../../assets/church/cam_guard.js');

const { churches, Logic, THREE } = loadChurches();

function setup(c) {
  if (c.ret && c.ret.group) c.ctx.root.add(c.ret.group);
  const items = c.prepare();
  items.forEach((it) => c.ctx.root.add(it.batch.build(it.material, it.name, { spatial: true })));
  const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones });
  const S = c.ctx._, B = c.layout.bounds, cb0 = S.cameraBounds || {};
  const cb = { x0: cb0.x0 ?? B.x0, x1: cb0.x1 ?? B.x1, z0: cb0.z0 ?? B.z0, z1: cb0.z1 ?? B.z1, yMax: cb0.yMax || 9 };
  const sp = c.layout.spawn || { x: 0, z: 0 };
  const guard = Guard.build(c.ctx.root, { bounds: cb, yLow: (L.floorY(sp.x, sp.z) || 0) + 1.05 });
  const probe = Guard.build(c.ctx.root, { bounds: { x0: cb.x0 - 20, x1: cb.x1 + 20, z0: cb.z0 - 20, z1: cb.z1 + 20 }, minArea: 0 });
  return { L, cb, guard, probe };
}

// main.js updateCamera 의 목표 위치(스무딩 전) — useGuard=false 면 예전 방식
function camAt(env, me, yaw, pitch, zoom, useGuard) {
  const { cb, guard } = env, D = 7.2 * zoom, dx = Math.sin(yaw), dz = Math.cos(yaw), fy = me.y + 1.0;
  let reach = 1;
  if (dx > 1e-4) reach = Math.min(reach, (cb.x1 - me.x) / (dx * Math.cos(pitch) * D)); else if (dx < -1e-4) reach = Math.min(reach, (cb.x0 - me.x) / (dx * Math.cos(pitch) * D));
  if (dz > 1e-4) reach = Math.min(reach, (cb.z1 - me.z) / (dz * Math.cos(pitch) * D)); else if (dz < -1e-4) reach = Math.min(reach, (cb.z0 - me.z) / (dz * Math.cos(pitch) * D));
  reach = Math.max(0.3, Math.min(1, reach));
  const ch = Math.cos(pitch) * D * reach, cv = Math.sin(pitch) * D * reach;
  let cx = Math.max(cb.x0, Math.min(cb.x1, me.x + dx * ch)), cz = Math.max(cb.z0, Math.min(cb.z1, me.z + dz * ch)), cy = Math.min(cb.yMax, Math.max(0.7, fy + cv));
  if (useGuard) { const t = guard.clipWide(me.x, fy, me.z, cx, cy, cz, 0.35, 0.3); if (t < 1) { cx = me.x + (cx - me.x) * t; cy = fy + (cy - fy) * t; cz = me.z + (cz - me.z) * t; } }
  return [cx, cy, cz];
}

function outside(probe, p) {
  const [x, y, z] = p, R = 150, up = probe.clip(x, y, z, x, y + R, z, 0) >= 1;
  let miss = 0;
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (probe.clip(x, y, z, x + Math.sin(a) * R, y, z + Math.cos(a) * R, 0) >= 1) miss++; }
  return miss >= 3 || (up && miss >= 1);
}

function sweep(c, env, useGuard) {
  const { L } = env, B = c.layout.bounds; let bad = 0, n = 0; const ex = [];
  for (let x = B.x0 + 0.6; x < B.x1; x += 2.2) for (let z = B.z0 + 0.6; z < B.z1; z += 2.2) {
    const p = { x, z }; if (L.moveCircle(p, 0, 0)) continue;
    const me = { x, z, y: L.floorY(x, z) || 0 };
    if (outside(env.probe, [x, me.y + 1.0, z])) continue;   // 머리부터 바깥(입구 앞 마당 등)은 제외
    for (const zoom of [1, 1.6]) for (let k = 0; k < 12; k++) for (const pitch of [0.06, 0.45]) {
      n++; const cp = camAt(env, me, k * Math.PI / 6, pitch, zoom, useGuard);
      if (outside(env.probe, cp)) { bad++; if (ex.length < 3) ex.push(`(${x.toFixed(1)},${z.toFixed(1)}) yaw${k * 30} → (${cp.map((v) => v.toFixed(1))})`); }
    }
  }
  return { bad, n, ex };
}

for (const c of churches) {
  test(`cam_guard: ${c.id} — 카메라를 360° 돌려도 벽·천장 밖으로 안 나간다`, () => {
    const env = setup(c);
    assert.ok(env.guard.triangles > 100, 'guard triangles');
    const now = sweep(c, env, true);
    if (process.env.CAMG_DEBUG) { const old = sweep(c, env, false); console.log(c.id, 'tris', env.guard.triangles, 'old', old.bad, '/', old.n, 'new', now.bad, JSON.stringify(now.ex)); }
    assert.equal(now.bad, 0, `${now.bad}/${now.n} 바깥: ${now.ex.join('; ')}`);
  });
}
