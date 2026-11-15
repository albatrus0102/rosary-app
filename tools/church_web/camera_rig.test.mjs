// 3인칭 카메라 리그(cam_guard.js createRig, docs/church/CAMERA.md) 시험: 기둥 많은 성당의 신랑을 걸을 때
// '정신없는 자동 줌'(카메라 거리 급변)이 예전보다 크게 줄고, 내 캐릭터가 화면에서 사라지거나 화면을 다 덮지 않는지.
// 예전 = main.js 의 옛 계산(상자 경계 + 벽 가드로 매 프레임 바로 당기고 바로 놓음, 위치만 7/s 로 따라감).
// 사용자 제보: "걸어갈 때 너무 정신없이 자동 줌인·아웃이 너무 많이 되고 … 내가 어디 있는지도 모르겠어"
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Guard = require('../../assets/church/cam_guard.js');
const Stations = require('../../assets/church/stations.js');

const { churches, Logic, THREE } = loadChurches();
const DT = 1 / 30, SPEED = 1.4;

function setup(id) {
  const c = churches.find((x) => x.id === id);
  if (c.ret && c.ret.group) c.ctx.root.add(c.ret.group);
  c.prepare().forEach((it) => c.ctx.root.add(it.batch.build(it.material, it.name, { spatial: true })));
  const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones });
  const S = c.ctx._, B = c.layout.bounds, cb0 = S.cameraBounds || {};
  const cb = { x0: cb0.x0 ?? B.x0, x1: cb0.x1 ?? B.x1, z0: cb0.z0 ?? B.z0, z1: cb0.z1 ?? B.z1, yMax: cb0.yMax || 9 };
  const sp = c.layout.spawn || { x: 0, z: 0 }, yLow = (L.floorY(sp.x, sp.z) || 0) + 1.05;
  return { c, L, cb, guard: Guard.build(c.ctx.root, { bounds: cb, yLow, see: false }), oldGuard: Guard.build(c.ctx.root, { bounds: cb, yLow, see: false, thinPass: false }) };
}

// 입구 → 제대 앞 → 촛불대들 → 입구: 실제 걷기 경로를 일정 속도로 따라가며 매 프레임 (x,z,걷는 방향)
function walkFrames(env) {
  const St = Stations.create(env.L), st = St.stations(), sp = env.c.layout.spawn;
  const goals = [st.altar, ...st.candle.slice(0, 3), { x: sp.x, z: sp.z }];
  const frames = [];
  let cur = { x: sp.x, z: sp.z };
  for (const g of goals) {
    const p = St.findPath(cur, g);
    if (!p) continue;
    for (let i = 0; i + 1 < p.pts.length; i++) {
      const a = p.pts[i], b = p.pts[i + 1], len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(len / (SPEED * DT)));
      const yaw = Math.atan2(-(b.x - a.x), -(b.z - a.z));   // 아바타가 향한 쪽(카메라는 그 반대편 +sin/+cos 에 선다)
      for (let k = 0; k < n; k++) frames.push({ x: a.x + (b.x - a.x) * k / n, z: a.z + (b.z - a.z) * k / n, yaw });
    }
    cur = g;
  }
  return frames;
}

const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

// 한 번 걷기: mode 'old' | 'new'. side=true 면 카메라를 걷는 방향 옆(90°)에 두어 기둥 줄을 가로질러 본다(최악).
function run(env, frames, mode, side) {
  const { cb } = env, rig = Guard.createRig(), O = {}, pos = { x: 0, y: 0, z: 0 }, pitch = 0.45, D = 7.2;
  const cam = new THREE.PerspectiveCamera(62, 9 / 19.5, 0.3, 700), v = new THREE.Vector3();
  let camYaw = frames[0].yaw, init = false, prev = -1, jumps = 0, tv = 0, ep = 0, epAmt = 0, epDir = 0, worstFill = 0, fills = 0, minA = 1;
  for (const f of frames) {
    const fy = (env.L.floorY(f.x, f.z) || 0) + 1.0, mx = f.x, mz = f.z;
    camYaw += wrap(f.yaw + (side ? Math.PI / 2 : 0) - camYaw) * (1 - Math.exp(-DT * 1.6));   // 걷는 쪽 뒤로 천천히 정렬
    const dx = Math.sin(camYaw), dz = Math.cos(camYaw);
    let tx, ty, tz, fwd = 0, pe = pitch, lyaw = camYaw;
    if (mode === 'old') {
      let reach = 1;
      if (dx > 1e-4) reach = Math.min(reach, (cb.x1 - mx) / (dx * Math.cos(pitch) * D)); else if (dx < -1e-4) reach = Math.min(reach, (cb.x0 - mx) / (dx * Math.cos(pitch) * D));
      if (dz > 1e-4) reach = Math.min(reach, (cb.z1 - mz) / (dz * Math.cos(pitch) * D)); else if (dz < -1e-4) reach = Math.min(reach, (cb.z0 - mz) / (dz * Math.cos(pitch) * D));
      reach = Math.max(0.3, Math.min(1, reach));
      const ch = Math.cos(pitch) * D * reach, cv = Math.sin(pitch) * D * reach;
      tx = Math.max(cb.x0, Math.min(cb.x1, mx + dx * ch)); tz = Math.max(cb.z0, Math.min(cb.z1, mz + dz * ch)); ty = Math.min(cb.yMax, Math.max(0.7, fy + cv));
      const t = env.oldGuard.clipWide(mx, fy, mz, tx, ty, tz, 0.35, 0.3);
      if (t < 1) { tx = mx + (tx - mx) * t; ty = fy + (ty - fy) * t; tz = mz + (tz - mz) * t; }
    } else {
      rig.solve({ mx, fy, mz, yaw: camYaw, pitch, D, cb, guard: env.guard, auto: true }, DT, O);
      tx = O.x; ty = Math.min(cb.yMax, Math.max(0.7, O.y)); tz = O.z; fwd = O.fwd; pe = O.pitch; lyaw = O.yaw;
    }
    if (!init) { pos.x = tx; pos.y = ty; pos.z = tz; init = true; }
    const kp = 1 - Math.exp(-DT * 7);
    pos.x += (tx - pos.x) * kp; pos.y += (ty - pos.y) * kp; pos.z += (tz - pos.z) * kp;
    const g = mode === 'old' ? env.oldGuard : env.guard, t2 = g.clipWide(mx, fy, mz, pos.x, pos.y, pos.z, mode === 'old' ? 0.35 : 0.08, 0.3);
    if (t2 < 1) { pos.x = mx + (pos.x - mx) * t2; pos.y = fy + (pos.y - fy) * t2; pos.z = mz + (pos.z - mz) * t2; }
    const dist = Math.hypot(pos.x - mx, pos.y - fy, pos.z - mz);
    if (prev >= 0) {
      // 급변 = 초당 2m 넘게 거리가 바뀌는 구간 하나(같은 방향으로 이어지는 프레임은 한 번), 그 구간 변화가 0.4m 이상일 때
      const dd = dist - prev, fast = Math.abs(dd) / DT > 2, dir = Math.sign(dd);
      tv += Math.abs(dd);
      if (fast && (ep === 0 || dir === epDir)) { ep++; epAmt += Math.abs(dd); epDir = dir; }
      else { if (ep && epAmt >= 0.4) { jumps++; if (process.env.CAMRIG_DBG && mode === 'new' && !side) console.log('jump', env.c.id, f.x.toFixed(1), f.z.toFixed(1), 'dist', dist.toFixed(2), 'amt', (epDir * epAmt).toFixed(2), 'lift', (O.lift || 0).toFixed(2), 'yaw', (camYaw * 57.3).toFixed(0)); } ep = fast ? 1 : 0; epAmt = fast ? Math.abs(dd) : 0; epDir = dir; }
    }
    prev = dist;
    // 화면 점유: 발(바닥)~머리(1.75m) 화면 높이 비율
    cam.position.set(pos.x, pos.y, pos.z); cam.lookAt(mx - Math.sin(lyaw) * fwd, fy, mz - Math.cos(lyaw) * fwd); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    v.set(mx, fy - 1.0, mz).project(cam); const yF = v.y; v.set(mx, fy + 0.75, mz).project(cam); const fill = (v.y - yF) / 2;
    worstFill = Math.max(worstFill, fill); if (fill > 0.7) { fills++; if (process.env.CAMRIG_FILL && mode === 'new' && fills % 15 === 1) console.log('fill', env.c.id, mx.toFixed(1), mz.toFixed(1), 'yaw', (camYaw * 57.3 % 360).toFixed(0), 'dist', dist.toFixed(2), 'Od', (O.dist || 0).toFixed(2), 'lift', (O.lift || 0).toFixed(2), 'pe', pe.toFixed(2), 'camY', (pos.y - fy).toFixed(2), 'yMax', (cb.yMax - fy).toFixed(1)); }
    const hd = Math.hypot(pos.x - mx, pos.y - (fy + 0.55), pos.z - mz);
    minA = Math.min(minA, Guard.avatarAlpha(hd));
  }
  const secs = frames.length * DT;
  return { secs, jumps, perMin: jumps / secs * 60, tvPerSec: tv / secs, fillsPct: fills / frames.length * 100, worstFill, minA };
}

const results = {};
for (const id of ['stpeter', 'milan', 'florence']) {
  test(`camera rig ${id}: 걷는 동안 자동 줌 급변이 크게 줄고 내 캐릭터가 화면에 남는다`, () => {
    const env = setup(id), frames = walkFrames(env);
    assert.ok(frames.length > 300, 'walk frames');
    const r = {};
    for (const side of [false, true]) {
      const o = run(env, frames, 'old', side), n = run(env, frames, 'new', side);
      r[side ? 'side' : 'back'] = { old: o, new: n };
      if (process.env.CAMRIG_REPORT) console.log(id, side ? 'side' : 'back', JSON.stringify({ old: o, new: n }, (k, v) => (typeof v === 'number' ? +v.toFixed(2) : v)));
      // 급변(초당 3m 이상 거리 변화) 횟수: 예전의 1/3 이하, 거리 총변화량: 예전의 1/2 이하
      // 옆(기둥 줄을 가로질러 보는 최악): 급변 횟수 1/2.5 이하, 거리 총변화량 65% 이하. 뒤: 나빠지지 않는다.
      if (side) {
        assert.ok(n.jumps <= o.jumps / 2.5, `${id} 옆: 급변 ${o.jumps} → ${n.jumps}`);
        assert.ok(n.tvPerSec <= o.tvPerSec * 0.65, `${id} 옆: 거리 변화량 ${o.tvPerSec.toFixed(2)} → ${n.tvPerSec.toFixed(2)} m/s`);
      } else {
        assert.ok(n.jumps <= o.jumps, `${id} 뒤: 급변 ${o.jumps} → ${n.jumps}`);
        assert.ok(n.tvPerSec <= o.tvPerSec * 1.15, `${id} 뒤: 거리 변화량 ${o.tvPerSec.toFixed(2)} → ${n.tvPerSec.toFixed(2)}`);
      }
      // 캐릭터: 최소 불투명도 유지(사라지지 않음), 화면을 70% 넘게 덮는 프레임은 예전보다 많지 않고 6% 이하
      assert.ok(n.minA >= Guard.MIN_ALPHA - 1e-9, 'avatar alpha');
      assert.ok(n.fillsPct <= Math.max(1, o.fillsPct) && n.fillsPct <= 6, `${id}: 아바타가 화면을 덮는 프레임 ${o.fillsPct.toFixed(1)}% → ${n.fillsPct.toFixed(1)}%`);
    }
    results[id] = r;
    if (process.env.CAMRIG_REPORT) console.log(id, JSON.stringify(r, (k, v) => (typeof v === 'number' ? +v.toFixed(2) : v)));
  });
}

test('리그: 막히면 즉시 앞으로, 풀리면 잠깐 버틴 뒤 천천히 돌아간다(히스테리시스)', () => {
  // 가짜 가드: t 를 바꿔 끼운다
  let tt = 1; const g = { clipWide: () => tt }, rig = Guard.createRig(), O = {}, I = { mx: 0, fy: 1, mz: 0, yaw: 0, pitch: 0.45, D: 7.2, cb: null, guard: g, auto: true };
  rig.solve(I, DT, O); assert.ok(Math.abs(O.dist - 7.2) < 1e-6);
  tt = 0.5; rig.solve(I, DT, O); assert.ok(O.dist <= 3.6 + Guard.RIG.slack + 1e-6, '벽 여유 안으로 바로 당김');
  for (let i = 0; i < 30; i++) rig.solve(I, DT, O); assert.ok(O.dist <= 3.6 + 0.05, '곧 막힌 거리까지');
  tt = 1; rig.solve(I, DT, O); assert.ok(O.dist < 3.7, '바로 놓지 않는다');
  for (let i = 0; i < 10; i++) rig.solve(I, DT, O);
  assert.ok(O.dist < 4.0, '버티는 시간(0.5s) 동안 거의 그대로');
  for (let i = 0; i < 120; i++) rig.solve(I, DT, O);
  assert.ok(O.dist > 6.8, '4초 뒤엔 돌아왔다');
  tt = 0.97; for (let i = 0; i < 30; i++) rig.solve(I, DT, O);
  const d1 = O.dist; tt = 1; for (let i = 0; i < 30; i++) rig.solve(I, DT, O);
  assert.ok(Math.abs(O.dist - d1) < 0.35, '작은 차이는 무시');
  // 자동 줌 끔: 막혀도 거리 그대로
  const r2 = Guard.createRig(); tt = 0.3; r2.solve({ ...I, auto: false }, DT, O); assert.ok(Math.abs(O.dist - 7.2) < 1e-6);
});

test('리그: 뒤가 벽이면 카메라를 어깨 위로 올리고 앞을 본다(lift)', () => {
  // 뒤 벽: 낮은 각도의 선은 0.2 에서 막히고, 가파른 선(어깨 위)은 열려 있다
  let tt = 0.2; const g = { clipWide: (ax, ay, az, bx, by, bz) => ((by - ay) > 1.5 * Math.hypot(bx - ax, bz - az) ? 1 : tt) }, rig = Guard.createRig(), O = {}, I = { mx: 0, fy: 1, mz: 0, yaw: 0, pitch: 0.45, D: 7.2, cb: null, guard: g, auto: true };
  for (let i = 0; i < 90; i++) rig.solve(I, DT, O);
  assert.ok(O.lift > 0.9 && O.pitch > 1.0 && O.fwd > 1.3 && O.dist > 3, `lift ${O.lift} pitch ${O.pitch}`);
  tt = 1; for (let i = 0; i < 120; i++) rig.solve(I, DT, O);
  assert.ok(O.lift < 0.05 && Math.abs(O.pitch - 0.45) < 0.03, '풀리면 원래 각도');
});

test('리그: 벽·구석에 등을 대고 서도(뒤로 1.3m 도 못 물러남) 90% 이상에서 카메라가 2m 이상 떨어진 시점을 찾는다', () => {
  for (const id of ['milan', 'stpeter']) {
    const env = setup(id), B = env.c.layout.bounds, O = {};
    let n = 0, ok = 0;
    for (let px = B.x0 + 0.7; px < B.x1; px += 1.7) for (let pz = B.z0 + 0.7; pz < B.z1; pz += 1.7) {
      if (env.L.moveCircle({ x: px, z: pz }, 0, 0)) continue;
      const fy = (env.L.floorY(px, pz) || 0) + 1.0;
      for (let k = 0; k < 8; k++) {
        const yaw = k * Math.PI / 4, ch = Math.cos(0.45) * 7.2, cv = Math.sin(0.45) * 7.2;
        if (7.2 * env.guard.clipWide(px, fy, pz, px + Math.sin(yaw) * ch, fy + cv, pz + Math.cos(yaw) * ch, Guard.RIG.probe, 0.3) >= 1.3) continue;
        const rig = Guard.createRig();
        for (let i = 0; i < 90; i++) rig.solve({ mx: px, fy, mz: pz, yaw, pitch: 0.45, D: 7.2, cb: env.cb, guard: env.guard, auto: true }, DT, O);
        n++; if (O.dist >= 2) ok++;
      }
    }
    assert.ok(n > 30 && ok >= n * 0.9, `${id}: 구석 ${n}곳 중 ${ok}곳만 2m 이상`);
  }
});
