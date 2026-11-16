// 3인칭 카메라 리그(cam_guard.js createRig, docs/church/CAMERA.md) 시험.
// 1) 기둥 많은 성당의 신랑을 걸을 때 '정신없는 자동 줌'(카메라 거리 급변)이 예전보다 크게 줄고, 내 캐릭터가 화면을 덮지 않으며,
//    카메라가 벽·기둥 면에 붙지(0.3m 안) 않는다. 예전 = 옛 계산(상자 경계 + 벽 가드로 매 프레임 바로 당기고 바로 놓음).
// 2) 좁은 통로(명동 성단 옆 측랑·세례대 앞)·벽에 등을 댄 자리·당고개 입구 홀: 최소 거리를 지키거나 올라가서 보고, 정말 막혔을 때만 1인칭.
// 3) 사용자 줌이 이긴다(핀치로 멀어지면 멀어진다), 입장 시점은 넓게, 시점 바꿈은 히스테리시스(왔다 갔다 하지 않음).
// 사용자 제보: "걸어갈 때 너무 정신없이 자동 줌", "막힌 곳에 가면 갑자기 커진다", "좁은 곳에서 머리가 화면 가득", "핀치로 줌아웃이 안 된다"
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Guard = require('../../assets/church/cam_guard.js');
const Stations = require('../../assets/church/stations.js');

const { churches, Logic, THREE } = loadChurches();
const DT = 1 / 30, SPEED = 1.4;
const envs = new Map();

function setup(id) {
  if (envs.has(id)) return envs.get(id);
  const c = churches.find((x) => x.id === id);
  if (c.ret && c.ret.group) c.ctx.root.add(c.ret.group);
  c.prepare().forEach((it) => c.ctx.root.add(it.batch.build(it.material, it.name, { spatial: true })));
  const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones });
  const S = c.ctx._, B = c.layout.bounds, cb0 = S.cameraBounds || {};
  const cb = { x0: cb0.x0 ?? B.x0, x1: cb0.x1 ?? B.x1, z0: cb0.z0 ?? B.z0, z1: cb0.z1 ?? B.z1, yMax: cb0.yMax || 9 };
  const sp = c.layout.spawn || { x: 0, z: 0 }, yLow = (L.floorY(sp.x, sp.z) || 0) + 1.05;
  const e = {
    c, L, cb,
    guard: Guard.build(c.ctx.root, { bounds: cb, yLow, see: false, ...Guard.spaceOpts(L, c.layout, c.zones) }),
    oldGuard: Guard.build(c.ctx.root, { bounds: cb, yLow, see: false, thinPass: false, space: false })
  };
  envs.set(id, e);
  return e;
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

// 카메라가 면에 붙었나: 0.3m 짜리 선 6방향 중 하나라도 면(모든 면, 가는 면 포함)에 닿는다
function hugging(g, x, y, z) {
  const r = 0.3;
  return g.clip(x, y, z, x + r, y, z, 0) < 1 || g.clip(x, y, z, x - r, y, z, 0) < 1 || g.clip(x, y, z, x, y, z + r, 0) < 1 ||
    g.clip(x, y, z, x, y, z - r, 0) < 1 || g.clip(x, y, z, x, y + r, z, 0) < 1 || g.clip(x, y, z, x, y - r, z, 0) < 1;
}

// main.js updateCamera 와 같은 순서: 리그 → 위치 따라가기(7/s) → 안전망. mode 'old' | 'new'. side=true 면 카메라를 걷는 방향 옆(90°)에.
function run(env, frames, mode, side, D = 7.2) {
  const { cb } = env, rig = Guard.createRig(), O = {}, pos = { x: 0, y: 0, z: 0 }, pitch = 0.45;
  const cam = new THREE.PerspectiveCamera(62, 9 / 19.5, 0.3, 700), v = new THREE.Vector3();
  let camYaw = frames[0].yaw, init = false, prev = -1, jumps = 0, tv = 0, ep = 0, epAmt = 0, epDir = 0, worstFill = 0, fills = 0, minA = 1, hug = 0, fpF = 0, opts = 0, lastOpt = 0, cuts = 0;
  for (const f of frames) {
    const fy = (env.L.floorY(f.x, f.z) || 0) + 1.0, mx = f.x, mz = f.z;
    camYaw += wrap(f.yaw + (side ? Math.PI / 2 : 0) - camYaw) * (1 - Math.exp(-DT * 1.6));   // 걷는 쪽 뒤로 천천히 정렬
    const dx = Math.sin(camYaw), dz = Math.cos(camYaw);
    let tx, ty, tz, fwd = 0, lyaw = camYaw, fp = 0;
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
      tx = O.x; ty = Math.min(cb.yMax, Math.max(0.7, O.y)); tz = O.z; fwd = O.fwd; lyaw = O.yaw; fp = O.fp;
      if (O.opt !== lastOpt) { opts++; lastOpt = O.opt; }
    }
    if (!init || O.cut) { pos.x = tx; pos.y = ty; pos.z = tz; init = true; }
    const kp = 1 - Math.exp(-DT * 7);
    pos.x += (tx - pos.x) * kp; pos.y += (ty - pos.y) * kp; pos.z += (tz - pos.z) * kp;
    if (mode === 'old') {
      const t2 = env.oldGuard.clipWide(mx, fy, mz, pos.x, pos.y, pos.z, 0.35, 0.3);
      if (t2 < 1) { pos.x = mx + (pos.x - mx) * t2; pos.y = fy + (pos.y - fy) * t2; pos.z = mz + (pos.z - mz) * t2; }
    } else if (!rig.ok(pos.x, pos.y, pos.z) && rig.ok(tx, ty, tz)) { pos.x = tx; pos.y = ty; pos.z = tz; }
    if (fp > 0.5) { fpF++; prev = -1; continue; }   // 1인칭 프레임은 아래 3인칭 지표에서 뺀다(따로 센다)
    if (mode === 'new' && O.cut) { cuts++; prev = -1; }   // 시점 끊기(휘돌면 벽에 막힐 때)는 줌이 아니라 장면 전환: 따로 센다
    const dist = Math.hypot(pos.x - mx, pos.y - fy, pos.z - mz);
    if (prev >= 0) {
      // 급변 = 초당 2m 넘게 거리가 바뀌는 구간 하나(같은 방향으로 이어지는 프레임은 한 번), 그 구간 변화가 0.4m 이상일 때
      const dd = dist - prev, fast = Math.abs(dd) / DT > 2, dir = Math.sign(dd);
      tv += Math.abs(dd);
      if (fast && (ep === 0 || dir === epDir)) { ep++; epAmt += Math.abs(dd); epDir = dir; }
      else { if (ep && epAmt >= 0.4) { jumps++; if (process.env.CAMRIG_DBG && mode === 'new' && process.env.CAMRIG_DBG === env.c.id + (side ? 's' : 'b')) console.log('jump', mx.toFixed(1), mz.toFixed(1), 'dist', dist.toFixed(2), 'amt', (epDir * epAmt).toFixed(2), 'opt', O.opt, 'pe', O.pitch.toFixed(2), 'Od', O.dist.toFixed(2)); } ep = fast ? 1 : 0; epAmt = fast ? Math.abs(dd) : 0; epDir = dir; }
    }
    prev = dist;
    if (hugging(env.oldGuard, pos.x, pos.y, pos.z)) hug++;
    // 화면 점유: 발(바닥)~머리(1.75m) 화면 높이 비율
    cam.position.set(pos.x, pos.y, pos.z); cam.lookAt(mx - Math.sin(lyaw) * fwd, fy, mz - Math.cos(lyaw) * fwd); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    v.set(mx, fy - 1.0, mz).project(cam); const yF = v.y; v.set(mx, fy + 0.75, mz).project(cam); const fill = Math.abs(v.y - yF) / 2;
    worstFill = Math.max(worstFill, fill); if (fill > 0.7) fills++;
    const hd = Math.hypot(pos.x - mx, pos.y - (fy + 0.55), pos.z - mz);
    minA = Math.min(minA, Guard.avatarAlpha(hd));
  }
  const secs = frames.length * DT, n = frames.length;
  return { secs, jumps, perMin: jumps / secs * 60, tvPerSec: tv / secs, fillsPct: fills / n * 100, worstFill, minA, hugPct: hug / n * 100, fpPct: fpF / n * 100, optPerMin: opts / secs * 60, cutPerMin: cuts / secs * 60 };
}

const backTot = { o: 0, n: 0, k: 0, to: 0, tn: 0 };
for (const id of ['stpeter', 'milan', 'florence', 'myeongdong']) {
  test(`camera rig ${id}: 걷는 동안 자동 줌 급변이 줄고, 캐릭터가 화면을 덮지 않고, 카메라가 면에 붙지 않는다`, () => {
    const env = setup(id), frames = walkFrames(env);
    assert.ok(frames.length > 300, 'walk frames');
    backTot.k++;
    for (const side of [false, true]) {
      const o = run(env, frames, 'old', side), n = run(env, frames, 'new', side);
      if (process.env.CAMRIG_REPORT) console.log(id, side ? 'side' : 'back', JSON.stringify({ old: o, new: n }, (k, v) => (typeof v === 'number' ? +v.toFixed(2) : v)));
      // 급변 횟수·거리 총변화량: 옆(기둥 줄을 가로질러 보는 최악)은 예전의 1/2.5 이하, 뒤는 성당마다 예전과 비슷하고(+4 안) 네 성당 합은 예전보다 적다(아래 시험)
      if (!side) { backTot.o += o.jumps; backTot.n += n.jumps; backTot.to += o.tvPerSec; backTot.tn += n.tvPerSec; }
      assert.ok(side ? n.jumps <= Math.max(1, o.jumps / 2.5) : n.jumps <= o.jumps + 4, `${id} ${side ? '옆' : '뒤'}: 급변 ${o.jumps} → ${n.jumps}`);
      assert.ok(n.tvPerSec <= o.tvPerSec * (side ? 0.65 : 1.3) + 0.05, `${id} ${side ? '옆' : '뒤'}: 거리 변화량 ${o.tvPerSec.toFixed(2)} → ${n.tvPerSec.toFixed(2)} m/s`);
      // 캐릭터가 화면을 70% 넘게 덮는 프레임 1% 이하, 카메라가 면 0.3m 안: 예전의 절반 이하이고 1%(옆 최악 2%) 이하, 1인칭 1% 이하, 시점 바꿈·끊기 제한
      assert.ok(n.fillsPct <= 1, `${id}: 아바타가 화면을 덮는 프레임 ${o.fillsPct.toFixed(1)}% → ${n.fillsPct.toFixed(1)}%`);
      assert.ok(n.hugPct <= (side ? 2 : 1) && n.hugPct <= o.hugPct * 0.5 + 0.01, `${id}: 카메라가 면에 붙은 프레임 ${o.hugPct.toFixed(1)}% → ${n.hugPct.toFixed(1)}%`);
      assert.ok(n.fpPct <= 1, `${id}: 1인칭 ${n.fpPct.toFixed(1)}%`);
      assert.ok(n.optPerMin <= 16, `${id}: 시점 바꿈 분당 ${n.optPerMin.toFixed(1)}`);
      assert.ok(n.cutPerMin <= (side ? 6 : 2.5), `${id}: 시점 끊기 분당 ${n.cutPerMin.toFixed(1)}`);
      assert.ok(n.minA >= 0.99, `${id}: 아바타가 흐려졌다(${n.minA.toFixed(2)}) — 최소 거리를 못 지켰다`);
    }
  });
}

test('camera rig: 뒤에서 따라갈 때 급변 횟수·거리 변화량의 네 성당 합이 예전보다 적다', () => {
  assert.equal(backTot.k, 4, '네 성당을 모두 돌았다');
  assert.ok(backTot.n < backTot.o, `급변 합 ${backTot.o} → ${backTot.n}`);
  assert.ok(backTot.tn < backTot.to, `거리 변화량 합 ${backTot.to.toFixed(2)} → ${backTot.tn.toFixed(2)} m/s`);
});

// 가짜 공간(설 수 있는 곳 = ok(x,y,z)) 가드
function fakeGuard(ok) { return { space: { at: (x, y, z) => (ok(x, y, z) ? 3 : 0), covered: () => true, solid: () => 0 }, clip: () => 1, out: { thin: 1 } }; }

test('리그: 막히면 앞으로(벽 속에 서지 않게), 풀리면 잠깐 버틴 뒤 사용자 거리로 천천히 돌아간다', () => {
  let wall = 99; const g = fakeGuard((x, y, z) => z < wall), rig = Guard.createRig(), O = {}, I = { mx: 0, fy: 1, mz: 0, yaw: 0, pitch: 0.45, D: 7.2, cb: null, guard: g, auto: true };
  rig.solve(I, DT, O); assert.ok(Math.abs(O.dist - 7.2) < 1e-6);
  wall = 3.6 * Math.cos(0.45);   // 3.6m 앞이 벽(그 너머는 설 수 없다: 바깥)
  for (let i = 0; i < 40; i++) rig.solve(I, DT, O);
  assert.ok(O.z < wall, '벽 너머에 서지 않는다');
  assert.ok(O.dist >= Guard.RIG.minD - 0.25 || O.pitch > 0.6, `최소 거리(${O.dist.toFixed(2)}) 또는 올려 본다(${O.pitch.toFixed(2)})`);
  wall = 99; rig.solve(I, DT, O); const d0 = O.dist;
  for (let i = 0; i < 10; i++) rig.solve(I, DT, O);
  assert.ok(O.dist < d0 + 0.8, '바로 놓지 않는다(버팀)');
  for (let i = 0; i < 150; i++) rig.solve(I, DT, O);
  assert.ok(O.dist > 7.0 && Math.abs(O.pitch - 0.45) < 0.03, `5초 뒤엔 사용자 거리·각도(${O.dist.toFixed(2)}, ${O.pitch.toFixed(2)})`);
  // 자동 줌 끔: 막혀도 거리·각도 그대로
  const r2 = Guard.createRig(); wall = 1; r2.solve({ ...I, auto: false }, DT, O); assert.ok(Math.abs(O.dist - 7.2) < 1e-6 && O.pitch === 0.45);
});

test('리그: 뒤가 막히면 당기기 전에 먼저 카메라를 올린다(높은 3/4 → 내려다보기), 앞(가는 길)을 본다', () => {
  // 뒤로 수평 1.5m 까지만 설 수 있다(그 너머는 벽 밖) — 높이는 제한 없음
  const g = fakeGuard((x, y, z) => z < 1.5), rig = Guard.createRig(), O = {}, I = { mx: 0, fy: 1, mz: 0, yaw: 0, pitch: 0.45, D: 7.2, cb: null, guard: g, auto: true };
  for (let i = 0; i < 90; i++) rig.solve(I, DT, O);
  // 높이는 가슴 위 hMax 까지(그보다 높이 날지 않는다), 거리는 최소 거리 이상
  assert.ok(O.pitch > 1.0 && O.lift > 0.9 && O.fwd > 1.5 && O.dist >= Guard.RIG.minD && O.y - 1 <= Guard.RIG.hMax + 0.05 && O.fp === 0, `pitch ${O.pitch} dist ${O.dist} fwd ${O.fwd} y ${O.y}`);
});

test('리그: 낮은 천장이면 내려서 사용자 거리를 지킨다(당고개 입구 홀처럼)', () => {
  const g = fakeGuard((x, y, z) => y < 3.6), rig = Guard.createRig(), O = {}, I = { mx: 0, fy: 1, mz: 0, yaw: 0, pitch: 0.45, D: 7.2, cb: null, guard: g, auto: true };
  for (let i = 0; i < 90; i++) rig.solve(I, DT, O);
  assert.ok(O.dist > 6.5 && O.pitch < 0.4 && O.y < 3.6, `dist ${O.dist} pitch ${O.pitch}`);
});

test('리그: 정말 막혔을 때만 1인칭(아바타 숨김), 자리가 나면 부드럽게 돌아온다(히스테리시스)', () => {
  let r = 1.0; const g = fakeGuard((x, y, z) => Math.hypot(x, z) < r && y < 2.6), rig = Guard.createRig(), O = {}, I = { mx: 0, fy: 1, mz: 0, yaw: 0, pitch: 0.45, D: 7.2, cb: null, guard: g, auto: true };
  for (let i = 0; i < 30; i++) rig.solve(I, DT, O);
  assert.ok(O.fp > 0.9, `1인칭 ${O.fp}`);
  r = 2.6; for (let i = 0; i < 15; i++) rig.solve(I, DT, O);
  assert.ok(O.fp > 0.9, '경계 근처(fpD + 여유 미만)에서는 그대로(왔다 갔다 하지 않음)');
  r = 99; for (let i = 0; i < 10; i++) rig.solve(I, DT, O);
  assert.ok(O.fp > 0.5, '돌아오기 전 잠깐 기다린다');
  for (let i = 0; i < 60; i++) rig.solve(I, DT, O);
  assert.ok(O.fp < 0.01, '자리가 나면 3인칭으로');
});

test('리그: 시점 바꿈은 히스테리시스 — 경계에서 비용이 조금씩 흔들려도 왔다 갔다 하지 않는다', () => {
  let lim = 3.0; const g = fakeGuard((x, y, z) => z < lim), rig = Guard.createRig(), O = {}, I = { mx: 0, fy: 1, mz: 0, yaw: 0, pitch: 0.45, D: 7.2, cb: null, guard: g, auto: true };
  let changes = 0, last = -1;
  for (let i = 0; i < 300; i++) { lim = 3.0 + 0.5 * Math.sin(i * 0.7); rig.solve(I, DT, O); if (O.opt !== last) { changes++; last = O.opt; } }
  assert.ok(changes <= 3, `시점 바꿈 ${changes}번`);
});

test('사용자 줌이 이긴다: 좁은 곳(당고개 입구 홀)에서도 핀치로 멀어지면 카메라가 멀어지고, 막힘이 풀리면 사용자 거리로', () => {
  const env = setup('danggogae'), sp = env.c.layout.spawn, fy = (env.L.floorY(sp.x, sp.z) || 0) + 1.0, O = {};
  const rig = Guard.createRig(), I = { mx: 5.6, fy, mz: 13.6, yaw: 1.05, pitch: 0.45, D: 7.2 * 0.6, cb: env.cb, guard: env.guard, auto: true };
  for (let i = 0; i < 60; i++) rig.solve(I, DT, O);
  const near = O.dist;
  I.D = 7.2 * 1.4; for (let i = 0; i < 60; i++) rig.solve(I, DT, O);
  assert.ok(O.dist > near + 2 && O.fp === 0, `핀치 아웃: ${near.toFixed(2)} → ${O.dist.toFixed(2)}`);
  assert.ok(rig.ok(O.x, O.y, O.z), '선 자리는 설 수 있는 곳');
});

test('좁은 통로·벽에 등을 댄 자리: 최소 거리(또는 내려다보기)를 지키고 카메라가 면에 붙지 않는다, 1인칭은 드물다', () => {
  const cases = [
    // 명동 오른쪽 성단 옆 좁은 측랑(세례대 앞·봉헌초대 사이), 사방
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => ['myeongdong', 7.6, -20.4, k * Math.PI / 4]),
    ...[0, 2, 4, 6].map((k) => ['myeongdong', 6.0, -19.0, k * Math.PI / 4]),
    // 명동 측랑 벽 앞(등 뒤 0.6m 가 벽), 성 베드로 큰 피어 옆, 피렌체 기둥 옆
    ['myeongdong', 8.3, 14, Math.PI / 2], ['myeongdong', -8.3, 4, -Math.PI / 2], ['stpeter', 7.5, 6, Math.PI / 2], ['florence', 3.4, 15.85, Math.PI / 2],
    // 당고개 입구 홀 성모상 옆
    ['danggogae', 5.6, 13.6, 1.05], ['danggogae', -5.6, 13.6, -1.05]
  ];
  const cam = new THREE.PerspectiveCamera(62, 9 / 19.5, 0.3, 700), v = new THREE.Vector3();
  let fp = 0;
  for (const [id, x, z, yaw] of cases) {
    const env = setup(id), fy = (env.L.floorY(x, z) || 0) + 1.0, rig = Guard.createRig(), O = {};
    for (let i = 0; i < 60; i++) rig.solve({ mx: x, fy, mz: z, yaw, pitch: 0.45, D: 7.2, cb: env.cb, guard: env.guard, auto: true }, DT, O);
    if (O.fp > 0.5) { fp++; continue; }
    const tag = `${id} (${x},${z}) yaw ${(yaw * 57.3).toFixed(0)}: dist ${O.dist.toFixed(2)} pitch ${O.pitch.toFixed(2)}`;
    assert.ok(O.dist >= Guard.RIG.minD - 0.25, tag + ' — 너무 가깝다');
    assert.ok(!hugging(env.oldGuard, O.x, O.y, O.z), tag + ' — 카메라가 면에 붙었다');
    cam.position.set(O.x, O.y, O.z); cam.lookAt(x - Math.sin(O.yaw) * O.fwd, fy, z - Math.cos(O.yaw) * O.fwd); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    v.set(x, fy - 1.0, z).project(cam); const yF = v.y, xF = v.x; v.set(x, fy + 0.75, z).project(cam);
    assert.ok(Math.abs(v.y - yF) / 2 < 0.6, tag + ' — 아바타가 화면을 덮는다');
    assert.ok(Math.abs(xF) < 1 && yF > -1 && v.y < 1, tag + ' — 아바타가 화면 밖');
  }
  assert.ok(fp <= 2, `1인칭 ${fp}/${cases.length}`);
});

test('리그: 벽·구석에 등을 대고 서도 90% 이상에서 2m 이상 떨어진 3인칭 시점을 찾는다', () => {
  for (const id of ['milan', 'stpeter', 'myeongdong']) {
    const env = setup(id), B = env.c.layout.bounds, O = {};
    let n = 0, ok = 0;
    for (let px = B.x0 + 0.7; px < B.x1; px += 1.7) for (let pz = B.z0 + 0.7; pz < B.z1; pz += 1.7) {
      if (env.L.moveCircle({ x: px, z: pz }, 0, 0)) continue;
      const fy = (env.L.floorY(px, pz) || 0) + 1.0;
      for (let k = 0; k < 8; k++) {
        const yaw = k * Math.PI / 4, ch = Math.cos(0.45) * 7.2, cv = Math.sin(0.45) * 7.2;
        if (7.2 * env.oldGuard.clipWide(px, fy, pz, px + Math.sin(yaw) * ch, fy + cv, pz + Math.cos(yaw) * ch, 0.8, 0.3) >= 1.3) continue;
        const rig = Guard.createRig();
        for (let i = 0; i < 90; i++) rig.solve({ mx: px, fy, mz: pz, yaw, pitch: 0.45, D: 7.2, cb: env.cb, guard: env.guard, auto: true }, DT, O);
        n++; if (O.dist >= 2 && O.fp === 0) ok++;
      }
    }
    assert.ok(n > 30 && ok >= n * 0.9, `${id}: 구석 ${n}곳 중 ${ok}곳만 2m 이상`);
  }
});

test('입장 시점: 모든 성당에서 아바타가 작게~중간, 화면 아래쪽, 성당 안쪽(입장 방향)을 넓게 본다', () => {
  const cam = new THREE.PerspectiveCamera(62, 9 / 19.5, 0.3, 700), v = new THREE.Vector3(), f = new THREE.Vector3();
  for (const c of churches) {
    const env = setup(c.id), sp = c.layout.spawn || { x: 0, z: 0, r: 0 }, fy = (env.L.floorY(sp.x, sp.z) || 0) + 1.0, rig = Guard.createRig(), O = {};
    rig.solve({ mx: sp.x, fy, mz: sp.z, yaw: sp.r || 0, pitch: 0.45, D: 7.2, cb: env.cb, guard: env.guard, auto: true }, DT, O);   // 입장 첫 프레임(main.js 는 바로 그 자리에)
    const tag = `${c.id}: dist ${O.dist.toFixed(2)} pitch ${O.pitch.toFixed(2)} yaw ${(O.yaw - (sp.r || 0)).toFixed(2)} fwd ${O.fwd.toFixed(2)}`;
    assert.ok(O.fp === 0 && O.dist >= 4.5, tag + ' — 너무 가깝다');
    assert.ok(Math.abs(wrap(O.yaw - (sp.r || 0))) < 0.5, tag + ' — 입장 방향(성당 안쪽)을 보지 않는다');
    cam.position.set(O.x, O.y, O.z); cam.lookAt(sp.x - Math.sin(O.yaw) * O.fwd, fy, sp.z - Math.cos(O.yaw) * O.fwd); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    v.set(sp.x, fy - 1.0, sp.z).project(cam); const yF = v.y; v.set(sp.x, fy + 0.75, sp.z).project(cam); const yH = v.y;
    assert.ok(Math.abs(yH - yF) / 2 < 0.3, tag + ` — 아바타가 크다(${((yH - yF) / 2).toFixed(2)})`);
    assert.ok(yH < 0.4 && yF > -1, tag + ` — 아바타 위치(${yF.toFixed(2)}..${yH.toFixed(2)})`);
    // 시선이 아래로 60° 넘게 꺾이지 않는다(바닥만 보이는 내려다보기 아님)
    cam.getWorldDirection(f);
    assert.ok(f.y > -Math.sin(60 * Math.PI / 180), tag + ` — 너무 내려다본다(${(Math.asin(-f.y) * 57.3).toFixed(0)}°)`);
  }
});
