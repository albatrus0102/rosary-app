// 시점 모드(좁으면 자동 1인칭 + 「시점」 단추)와 스프링 암 시험(docs/church/CAMERA_MODES.md).
// 사용자 제보(2026-11-23): 「아시시 대성당 묘소는 거의 돌려볼 수가 없어. 너무 좁아가지고 … 돌려보려고 해도 자꾸 튀어나와 튕기고」.
// 1) 히스테리시스: 좁음/트임이 0.2초마다 바뀌어도 1초 안에 1인칭 ↔ 3인칭이 다시 바뀌지 않는다
// 2) 튀지 않는다: 좁은 곳 표본(아시시 묘소·계단, 여의도동 계단·성가대석 아래, 명동 성단 옆, 밀라노·성 바오로 주보랑)에서 화면을 돌려도
//    한 프레임 거리 변화가 POP 을 넘는 일이 거의 없고 되튐(앞뒤로 번갈아 튐)이 없다
// 3) 묘소에서는 1인칭, 트인 신랑에서는 3인칭 4) 고정 모드·기도 중 막기 5) 끄는 각도는 리그가 덮지 않는다 6) 다리(bridge.js) 메서드
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeEnv, samplePlaces, simulate, rotateFrames, walkFrames, runSamples, POP, DT } from './cam_sim.mjs';
const require = createRequire(import.meta.url);
const Guard = require('../../assets/church/cam_guard.js');
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');

// 가짜 공간: 빈 거리(free)·천장(up)을 바꿀 수 있는 가드
function fakeGuard(st) {
  return {
    clip: (ax, ay, az, bx, by, bz) => { const len = Math.hypot(bx - ax, by - ay, bz - az), horiz = Math.abs(by - ay) < 1e-6, r = horiz ? st.free : st.up; return Math.min(1, r / len); },
    out: { thin: 1 }, space: null
  };
}

test('시점 모드: 히스테리시스 — 좁음/트임이 0.2초마다 바뀌어도 1초 안에 다시 바뀌지 않는다, 들어가면 1초는 머문다', () => {
  const st = { free: 5, up: 5 }, g = fakeGuard(st), V = Guard.createView(), O = {};
  const I = { guard: g, floorAt: null, mx: 0, mz: 0, foot: 0, cb: null, boom: 7, mode: 'auto', block: false };
  const flips = [];
  let last = false;
  for (let i = 0; i < 300; i++) {
    const t = i * DT;
    st.free = Math.floor(t / 0.2) % 2 ? 1.2 : 3.5;   // 0.2초마다 좁음 ↔ 트임
    I.mx = (i % 2) * 0.25;   // 다시 재게(0.2m 넘게 움직임)
    V.step(I, DT, O);
    if (O.want !== last) { flips.push(t); last = O.want; }
  }
  for (let k = 1; k < flips.length; k++) assert.ok(flips[k] - flips[k - 1] >= 1.0, `바뀐 시각 ${flips.map((x) => x.toFixed(2)).join(',')}`);
  // 경계 값(들어가는 문턱과 나오는 문턱 사이)에서는 지금 상태를 지킨다
  const V2 = Guard.createView(); st.free = 1.5;
  for (let i = 0; i < 60; i++) V2.step(I, DT, O);
  assert.equal(O.want, true, '좁으면 1인칭');
  st.free = 2.2;   // freeIn 1.9 과 freeOut 2.6 사이
  for (let i = 0; i < 120; i++) V2.step(I, DT, O);
  assert.equal(O.want, true, '문턱 사이에서는 1인칭 그대로');
  st.free = 4;
  for (let i = 0; i < 20; i++) V2.step(I, DT, O);
  assert.equal(O.want, true, '트여도 1초는 기다린다');
  for (let i = 0; i < 30; i++) V2.step(I, DT, O);
  assert.equal(O.want, false, '1초 넘게 트이면 3인칭');
});

test('시점 모드: 0.5초 ease-in-out 으로 섞는다(처음·끝이 느리다), 고정 모드·기도 중 막기', () => {
  const st = { free: 1.0, up: 5 }, g = fakeGuard(st), V = Guard.createView(), O = {};
  const I = { guard: g, floorAt: null, mx: 0, mz: 0, foot: 0, cb: null, boom: 7, mode: 'auto', block: false };
  V.step({ ...I, guard: fakeGuard({ free: 5, up: 5 }) }, DT, O);   // 첫 프레임은 트인 곳
  const fs2 = [];
  for (let i = 0; i < 40; i++) { V.step(I, DT, O); fs2.push(O.f); }
  const t0 = fs2.findIndex((f) => f > 0), t1 = fs2.findIndex((f) => f >= 1);
  assert.ok(t0 > 0 && t1 > t0, 'enterT 뒤에 섞기 시작');
  const dur = (t1 - t0 + 1) * DT;
  assert.ok(dur > 0.4 && dur < 0.6, `섞는 시간 ${dur.toFixed(2)}초`);
  assert.ok(fs2[t0] < 0.05 && fs2[t1 - 1] > 0.95, 'ease-in-out(처음·끝 느림)');
  // 고정
  const Vf = Guard.createView(); Vf.step({ ...I, guard: fakeGuard({ free: 5, up: 5 }), mode: 'fp' }, DT, O);
  assert.equal(O.f, 1, '1인칭 고정: 트인 곳에서도(처음 프레임은 바로)');
  const Vt = Guard.createView(); for (let i = 0; i < 60; i++) Vt.step({ ...I, mode: 'tp' }, DT, O);
  assert.equal(O.f, 0, '뒤에서 보기 고정: 좁아도 3인칭');
  // 앉기·기도 시점 중에는 1인칭을 쓰지 않는다(기도 카메라) → 일어나면 지금 모드로
  const Vb = Guard.createView(); for (let i = 0; i < 60; i++) Vb.step({ ...I, mode: 'fp' }, DT, O);
  assert.equal(O.f, 1);
  for (let i = 0; i < 30; i++) Vb.step({ ...I, mode: 'fp', block: true }, DT, O);
  assert.equal(O.f, 0, '앉으면 기도 카메라');
  for (let i = 0; i < 30; i++) Vb.step({ ...I, mode: 'fp', block: false }, DT, O);
  assert.equal(O.f, 1, '일어나면 1인칭 고정으로');
});

test('리그: 끄는 동안은 사용자 각도 그대로(옵션이 덮지 않는다), 끌기 시작하면 리그 각도를 넘긴다(bake)', () => {
  // 뒤로 1.5m 만 설 수 있다 → 끌지 않으면 리그가 카메라를 올린다
  const g = { space: { at: (x, y, z) => (z < 1.5 ? 3 : 0), covered: () => true, solid: () => 0 }, clip: () => 1, out: { thin: 1 } };
  const rig = Guard.createRig(), O = {}, I = { mx: 0, fy: 1, mz: 0, yaw: 0, pitch: 0.45, D: 7.2, cb: null, guard: g, auto: true };
  for (let i = 0; i < 90; i++) rig.solve(I, DT, O);
  assert.ok(O.pitch > 0.9, '끌지 않으면 올린다(예전 그대로)');
  const lifted = O.pitch;
  I.drag = true; rig.solve(I, DT, O);
  assert.ok(O.baked && Math.abs(O.bakePitch - lifted) < 0.05, '끌기 시작: 리그 각도를 사용자 각도로 넘긴다');
  I.pitch = O.bakePitch; I.yaw += O.bakeYaw;
  for (let i = 0; i < 60; i++) {
    I.yaw += 0.04; I.pitch = Math.min(1.25, Math.max(0.06, I.pitch + 0.01 * Math.sin(i / 5)));
    rig.solve(I, DT, O);
    assert.ok(Math.abs(O.yaw - I.yaw) < 1e-9 && Math.abs(O.pitch - I.pitch) < 1e-9, `끄는 중 프레임 ${i}: 리그가 각도를 바꿨다`);
    assert.ok(!O.cut, '끄는 중에는 시점을 끊지 않는다');
  }
  // 손을 떼도 걸어가기 전에는 사용자 각도 그대로
  I.drag = false;
  for (let i = 0; i < 60; i++) rig.solve(I, DT, O);
  assert.ok(Math.abs(O.pitch - I.pitch) < 1e-9 && Math.abs(O.yaw - I.yaw) < 1e-9, '손을 떼도 그 자리에서는 각도를 되돌리지 않는다');
});

test('리그(스프링 암): 줄일 때는 빠르게, 늘릴 때는 천천히(약 0.5초) — 한 프레임에 크게 튀지 않는다', () => {
  let wall = 99; const g = { space: { at: (x, y, z) => (z < wall ? 3 : 0), covered: () => true, solid: () => 0 }, clip: () => 1, out: { thin: 1 } };
  const rig = Guard.createRig(), O = {}, I = { mx: 0, fy: 1, mz: 0, yaw: 0, pitch: 0.45, D: 7.2, cb: null, guard: g, auto: true, drag: true };
  rig.solve(I, DT, O);
  wall = 3.0; let prev = O.dist, maxStep = 0, n = 0;
  for (let i = 0; i < 30; i++) { rig.solve(I, DT, O); maxStep = Math.max(maxStep, Math.abs(O.dist - prev)); prev = O.dist; if (O.z < wall) n = n || i + 1; }
  assert.ok(O.z < wall && n <= 18, `막히면 0.6초 안에 벽 앞으로(${n}프레임 — 4m 를 초당 10m 로)`);
  assert.ok(maxStep <= 10 * DT + 1e-6, `줄이는 한 프레임 ${maxStep.toFixed(2)}m(초당 10m 까지)`);
  wall = 99; const d0 = O.dist; let t = 0;
  for (let i = 0; i < 120 && O.dist < 7.0; i++) { rig.solve(I, DT, O); t += DT; maxStep = Math.max(maxStep, O.dist - prev); prev = O.dist; }
  assert.ok(t > 0.6, `늘리기는 천천히(${t.toFixed(2)}초에 ${d0.toFixed(1)} → 7)`);
});

// 실제 성당 표본(카메라 표본, cam_sim.mjs)
const res = runSamples(Guard, { mode: 'auto' });
const sum = (pred, k) => Object.entries(res).filter(([tag]) => pred(tag)).reduce((a, [, o]) => a + o[k], 0);

test('카메라 표본: 좁은 곳을 돌려 보고 걸어도 튀지 않는다(튐 ≤ 3·되튐 ≤ 1), 1인칭 ↔ 3인칭이 1초 안에 다시 바뀌지 않는다', () => {
  if (process.env.CAMMODE_REPORT) console.log(JSON.stringify(res));
  const pops = sum(() => true, 'pops'), reb = sum(() => true, 'rebounds'), ff = sum(() => true, 'flipFlop'), n = sum(() => true, 'n');
  assert.ok(n > 50000, `표본 프레임 ${n}`);
  assert.ok(pops <= 3, `튐 ${pops}(한 프레임 > ${POP}m)`);
  assert.ok(reb <= 1, `되튐 ${reb}`);
  assert.equal(ff, 0, '왔다 갔다');
  for (const [tag, o] of Object.entries(res)) assert.ok(o.maxJump < 0.5, `${tag}: 한 프레임 최대 ${o.maxJump.toFixed(2)}m`);
});

test('카메라 표본: 아시시 묘소·계단은 1인칭, 트인 신랑(모든 표본 성당)은 3인칭', () => {
  const pct = (tag) => res[tag].fpF / res[tag].n;
  assert.ok(pct('assisi:crypt') > 0.95, `묘소 1인칭 ${(pct('assisi:crypt') * 100).toFixed(0)}%`);
  assert.ok(pct('assisi:lower_stairs') > 0.9, '하부 → 상부 계단 1인칭');
  assert.ok(pct('assisi:crypt_stairs') > 0.7, '묘소 계단 1인칭');
  // 여의도동 곡선 계단: 2026-11-23 폭 4.5m(3배)로 넓혔지만 두 계단이 같은 띠에 겹쳐 아래 계단은 머리 위가 낮다 → 자리에 따라 1·3인칭이 갈린다(측정 62%).
  // 어느 쪽이 맞다고 못 박지 않고, 튐·왕복 없음은 다른 시험이 지킨다. 표본이 사라지지 않았는지만 본다.
  assert.ok(res['yeouido:stairs'].n > 0, '여의도동 계단 표본');
  for (const id of ['assisi', 'yeouido', 'myeongdong', 'milan', 'stpaul']) assert.equal(res[id + ':open_nave'].fpF, 0, `${id} 트인 신랑에서 1인칭`);
  // 성가대석 아래(천장 3.4m, 넓다)는 3인칭으로 본다(낮춰 보기)
  assert.ok(pct('yeouido:under_loft') < 0.1, `성가대석 아래 1인칭 ${(pct('yeouido:under_loft') * 100).toFixed(0)}%`);
});

test('묘소: 빌더 표시(tight 구역)만으로도 1인칭 — 입장 첫 프레임은 섞지 않고 바로', () => {
  const env = makeEnv('assisi', Guard), cb = env.cb;
  assert.ok(cb.tight && cb.tight.length, 'ch_assisi.js 카메라 상자 tight');
  const C = env.c.builder.crypt, V = Guard.createView(), O = {};
  V.step({ guard: null, floorAt: null, mx: C.x + 2.2, mz: C.z, foot: 0, cb, boom: 7, mode: 'auto', block: false }, DT, O);
  assert.equal(O.f, 1); assert.equal(O.why, 'zone');
  // 하부 성당(같은 xz, 위층)은 구역 밖
  const V2 = Guard.createView();
  V2.step({ guard: null, floorAt: null, mx: C.x + 2.2, mz: C.z, foot: env.c.builder.heights.lower, cb, boom: 7, mode: 'auto', block: false }, DT, O);
  assert.equal(O.f, 0, '하부 성당은 묘소 구역이 아니다');
});

test('뒤에서 보기 고정: 묘소에서도 3인칭(튀지 않는다), 1인칭 고정: 신랑에서도 1인칭', () => {
  const env = makeEnv('assisi', Guard), { pts } = samplePlaces(env);
  const crypt = pts.find((p) => p.tag === 'crypt'), nave = pts.find((p) => p.tag === 'open_nave');
  const tp = simulate(env, rotateFrames(crypt, 0), { Guard, mode: 'tp' });
  assert.equal(tp.fpF, 0);
  assert.ok(tp.pops <= 1 && tp.rebounds === 0, `묘소 3인칭 고정 튐 ${tp.pops}`);
  const fp = simulate(env, rotateFrames(nave, 0), { Guard, mode: 'fp' });
  assert.equal(fp.fpF, fp.n);
  // 계단을 걸어 내려가며(자동): 1인칭으로 들어갔다 나오는 횟수가 적다
  const w = walkFrames(env, { x: 0, z: 16, y: env.c.builder.heights.lower }, { x: 0, z: 1.2, y: 0 });
  const s = simulate(env, w, { Guard, mode: 'auto' });
  assert.ok(s.flips <= 2 && s.flipFlop === 0, `묘소로 내려가며 전환 ${s.flips}번`);
});

test('다리: setViewMode 가 bridge.js METHODS·main.js api 에 있고, Flutter 가 부른다', () => {
  const win = { console }; win.window = win;
  vm.runInNewContext(fs.readFileSync(path.join(assets, 'bridge.js'), 'utf8'), win);
  assert.ok(win.ChurchAPI._methods.includes('setViewMode'), 'bridge.js METHODS 에 setViewMode 없음 — 기기에서 조용히 버려진다');
  assert.equal(typeof win.ChurchAPI.setViewMode, 'function');
  const main = fs.readFileSync(path.join(assets, 'main.js'), 'utf8');
  assert.match(main, /setViewMode: function \(o\) \{ setViewMode\(o && o\.mode\); \}/);
  const dart = fs.readFileSync(path.resolve(here, '../../lib/church/church_scene_controller.dart'), 'utf8');
  assert.match(dart, /_call\('setViewMode', \{'mode': mode\}\)/);
});
