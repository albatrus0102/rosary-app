// 3인칭 카메라 가드(cam_guard.js) 시험: 모든 성당에서 걸을 수 있는 자리마다 카메라를 360° 돌려(main.js updateCamera 와 같은 리그 계산)
// 카메라가 실내에 있는지, 면에 붙지 않았는지 본다. 리그는 사이의 벽을 잘라내고 벽 너머 실내에 서기도 한다(카메라 공간 복셀). '실내' = 위로 쏜 선이 천장/지붕에 닿고, 수평 8방향 중 6방향 이상이 면에 닿는다(문 한 곳은 열려 있을 수 있다).
// 예전(상자 경계만, 2.8천/9.5천 표본)에는 성 베드로 후진·밀라노 경당 같은 굽은 벽 밖 상자 모서리로 카메라가 나가 하늘이 보였다.
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
  const guard = Guard.build(c.ctx.root, { bounds: cb, yLow: (L.floorY(sp.x, sp.z) || 0) + 1.05, see: false, ...Guard.spaceOpts(L, c.layout, c.zones) });
  const probe = Guard.build(c.ctx.root, { bounds: { x0: cb.x0 - 20, x1: cb.x1 + 20, z0: cb.z0 - 20, z1: cb.z1 + 20 }, minArea: 0, see: false, space: false });
  return { L, cb, guard, probe };
}

// main.js updateCamera 의 목표 위치(스무딩 전) — useGuard=false 면 예전 방식(상자 경계만), true 면 지금 리그(두 프레임: 첫 프레임은 바로 그 자리)
function camAt(env, me, yaw, pitch, zoom, useGuard) {
  const { cb, guard } = env, D = 7.2 * zoom, dx = Math.sin(yaw), dz = Math.cos(yaw), fy = me.y + 1.0;
  if (useGuard) {
    const rig = Guard.createRig(), O = {}, I = { mx: me.x, fy, mz: me.z, yaw, pitch, D, cb, guard, auto: true };
    rig.solve(I, 1 / 30, O); rig.solve(I, 1 / 30, O);
    if (O.fpOn) return null;   // 1인칭(정말 막힌 곳): 카메라는 머리 자리
    return [O.x, Math.min(cb.yMax, Math.max(0.7, O.y)), O.z];
  }
  let reach = 1;
  if (dx > 1e-4) reach = Math.min(reach, (cb.x1 - me.x) / (dx * Math.cos(pitch) * D)); else if (dx < -1e-4) reach = Math.min(reach, (cb.x0 - me.x) / (dx * Math.cos(pitch) * D));
  if (dz > 1e-4) reach = Math.min(reach, (cb.z1 - me.z) / (dz * Math.cos(pitch) * D)); else if (dz < -1e-4) reach = Math.min(reach, (cb.z0 - me.z) / (dz * Math.cos(pitch) * D));
  reach = Math.max(0.3, Math.min(1, reach));
  const ch = Math.cos(pitch) * D * reach, cv = Math.sin(pitch) * D * reach;
  return [Math.max(cb.x0, Math.min(cb.x1, me.x + dx * ch)), Math.min(cb.yMax, Math.max(0.7, fy + cv)), Math.max(cb.z0, Math.min(cb.z1, me.z + dz * ch))];
}

// 카메라가 면에 붙었나(0.25m 선 6방향)
function hugging(probe, [x, y, z]) {
  const r = 0.25;
  return [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]].some(([a, b, c]) => probe.clip(x, y, z, x + a, y + b, z + c, 0) < 1);
}

function outside(probe, p) {
  const [x, y, z] = p, R = 150, up = probe.clip(x, y, z, x, y + R, z, 0) >= 1;
  let miss = 0;
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (probe.clip(x, y, z, x + Math.sin(a) * R, y, z + Math.cos(a) * R, 0) >= 1) miss++; }
  return miss >= 3 || (up && miss >= 1);
}

function sweep(c, env, useGuard) {
  const { L } = env, B = c.layout.bounds; let bad = 0, n = 0, hug = 0, fp = 0, pas = 0; const ex = [];
  for (let x = B.x0 + 0.6; x < B.x1; x += 2.2) for (let z = B.z0 + 0.6; z < B.z1; z += 2.2) {
    const p = { x, z }; if (L.moveCircle(p, 0, 0)) continue;
    const me = { x, z, y: L.floorY(x, z) || 0 };
    if (outside(env.probe, [x, me.y + 1.0, z])) continue;   // 머리부터 바깥(입구 앞 마당 등)은 제외
    if (env.guard.space.solid(x, me.y + 1.5, z) || env.guard.space.solid(x, me.y + 1.0, z)) continue;   // 걷는 곳이 벽 두께 안(모델 틈): 카메라 문제가 아니다
    for (const zoom of [1, 1.6]) for (let k = 0; k < 12; k++) for (const pitch of [0.06, 0.45]) {
      n++; const cp = camAt(env, me, k * Math.PI / 6, pitch, zoom, useGuard);
      if (!cp) { fp++; continue; }
      // 만든 이가 열어 둔 카메라 통로(걷는 곳 밖, 카메라 상자 안: 당고개 로비 뒤 등)는 벽 하나 너머에서만 서며 바깥 판정에서 뺀다(따로 센다)
      if (cp[0] < B.x0 || cp[0] > B.x1 || cp[2] < B.z0 || cp[2] > B.z1) { pas++; continue; }
      if (outside(env.probe, cp)) { bad++; if (ex.length < 3) ex.push(`(${x.toFixed(1)},${z.toFixed(1)}) yaw${k * 30} → (${cp.map((v) => v.toFixed(1))})`); }
      if (useGuard && hugging(env.probe, cp)) hug++;
    }
  }
  return { bad, n, ex, hug, fp, pas };
}

for (const c of churches) {
  test(`cam_guard: ${c.id} — 카메라를 360° 돌려도 벽·천장 밖으로 안 나가고, 면에 붙지 않는다`, () => {
    const env = setup(c);
    assert.ok(env.guard.triangles > 100, 'guard triangles');
    assert.ok(env.guard.space && env.guard.space.reachable > 1000, 'camera space');
    const now = sweep(c, env, true), old = sweep(c, env, false);
    if (process.env.CAMG_DEBUG) console.log(c.id, 'tris', env.guard.triangles, 'old', old.bad, '/', old.n, 'new', now.bad, 'hug', now.hug, 'fp', now.fp, 'pas', now.pas, JSON.stringify(now.ex));
    // 남는 것은 모델의 실제 구멍(열린 정문, 모델링 안 된 경당 아치, 벽 조각 틈)뿐: 표본의 1% 이하, 예전의 1/4 이하
    assert.ok(now.bad <= now.n * 0.01, `${now.bad}/${now.n} 바깥: ${now.ex.join('; ')}`);
    if (old.bad > 40) assert.ok(now.bad * 4 <= old.bad, `예전 ${old.bad} → 지금 ${now.bad}`);
    assert.ok(now.hug <= now.n * 0.01, `면에 붙음 ${now.hug}/${now.n}`);
    assert.ok(now.fp <= now.n * 0.02, `1인칭 ${now.fp}/${now.n}`);
    assert.ok(now.pas <= now.n * 0.06, `카메라 통로 ${now.pas}/${now.n}`);
  });
}
