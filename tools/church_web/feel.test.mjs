// 손맛 시험(docs/church/CAMERA_MODES.md §손맛, controls.js FEEL): 사용자 2026-11-23 「좀 더 부드럽고 고급스럽게(떼면 천천히 멈추는 등) … 진짜 게임처럼」.
// 1) 시점 관성: 손을 떼면 미끄러지다 멈춘다(정해진 시간 안, 거꾸로 돌지 않음), 탭·멈춘 채 떼기는 바로 선다, pitch 끝은 부드럽게
// 2) 30·60·120Hz 에서 같은 결과(dt 지수식) 3) 피벗 따라가기는 넘치지 않는다(임계 감쇠) 4) 손잡이를 놓으면 정해진 거리 안에서 미끄러지듯 선다
// 5) 줌 스프링·손잡이 곡선·자동 뒤로 맞추기(끌 수 있다)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../../assets/church/controls.js');
const F = C.FEEL;

function ctlNew() { return { yaw: 0, pitch: 0.45, look: 0, zoom: 1, zoomS: 1, zoomV: 0, vYaw: 0, vPitch: 0, accYaw: 0, accPitch: 0, held: false, coast: false, dragging: false, extLook: false, now: 0, lastDragT: -99, walkFwdT: 0 }; }

// hz 로 끌기(초당 w rad, dur 초) → 놓고 3초. 반환: 놓은 뒤 더 돈 양, 멈춘 시각, 거꾸로 돈 프레임
function flick(hz, w, dur, wp = 0) {
  const c = ctlNew(), dt = 1 / hz;
  c.pitch = 0.6;
  let t = 0;
  c.dragging = true;
  for (; t < dur - 1e-9; t += dt) { c.now = t; c.yaw += w * dt; c.accYaw += w * dt; const p0 = c.pitch; c.pitch = Math.min(1.25, Math.max(0.06, c.pitch + wp * dt)); c.accPitch += c.pitch - p0; C.stepLook(c, dt); }
  c.dragging = false;
  const y0 = c.yaw, p0 = c.pitch; let stopT = -1, back = 0, prev = c.yaw, pmax = c.pitch;
  for (let s = 0; s < 3; s += dt) {
    c.now = t + s; C.stepLook(c, dt);
    if (Math.sign(c.yaw - prev) === -Math.sign(w) && Math.abs(c.yaw - prev) > 1e-12) back++;
    prev = c.yaw; pmax = Math.max(pmax, c.pitch);
    if (stopT < 0 && c.vYaw === 0 && c.vPitch === 0) stopT = s + dt;
  }
  return { extra: c.yaw - y0, stopT, back, pitchExtra: c.pitch - p0, pmax, coastEnd: c.coast };
}

test('시점 관성: 손을 떼면 미끄러지다 0.3~0.7초 안에 멈추고, 거꾸로 돌지 않는다', () => {
  const r = flick(60, 2.0, 0.5);
  assert.ok(r.extra > 0.12 && r.extra < 0.4, `놓은 뒤 더 돈 양 ${r.extra.toFixed(3)}rad(속도 × τ ≈ ${(2 * F.lookFriction).toFixed(2)})`);
  assert.ok(r.stopT > 0.3 && r.stopT < 0.7, `멈춘 시각 ${r.stopT.toFixed(2)}초`);
  assert.equal(r.back, 0, '거꾸로 돈 프레임');
  assert.equal(r.coastEnd, false, '멈추면 관성 상태가 풀린다');
  // 아주 빠르게 튕겨도 상한(lookMaxYaw)까지만
  const fast = flick(60, 40, 0.3);
  assert.ok(fast.extra <= F.lookMaxYaw * F.lookFriction + 1e-6, `상한 ${fast.extra.toFixed(2)}`);
});

test('시점 관성: 탭(움직임 없음)·멈춘 채 떼기는 바로 서고, 다시 닿으면 관성이 바로 멈춘다', () => {
  const c = ctlNew(), dt = 1 / 60;
  c.dragging = true; for (let i = 0; i < 10; i++) C.stepLook(c, dt);   // 탭: 끌기량 0
  c.dragging = false; C.stepLook(c, dt);
  assert.equal(c.vYaw, 0); assert.equal(c.yaw, 0);
  // 끌다가 0.3초 멈춘 뒤 떼기
  c.dragging = true; for (let i = 0; i < 30; i++) { c.yaw += 0.05; c.accYaw += 0.05; C.stepLook(c, dt); }
  for (let i = 0; i < 18; i++) C.stepLook(c, dt);
  const y = c.yaw; c.dragging = false; for (let i = 0; i < 60; i++) C.stepLook(c, dt);
  assert.ok(Math.abs(c.yaw - y) < 0.01, `멈춘 채 뗀 뒤 ${(c.yaw - y).toFixed(3)}rad 더 돌았다`);
  // 튕긴 뒤 다시 닿으면 그 자리에서 멈춘다
  c.dragging = true; for (let i = 0; i < 20; i++) { c.yaw += 0.05; c.accYaw += 0.05; C.stepLook(c, dt); }
  c.dragging = false; C.stepLook(c, dt); C.stepLook(c, dt);
  assert.ok(c.vYaw > 1);
  c.dragging = true; const y2 = c.yaw; C.stepLook(c, dt); C.stepLook(c, dt);
  assert.equal(c.yaw, y2, '닿는 순간 관성이 멈춘다');
});

test('시점 관성: pitch 끝(1.25)에 가까워지면 부드럽게 서고 넘지 않는다(딱 멈추지 않는다)', () => {
  const r = flick(60, 0, 0.3, 2.0);
  assert.ok(r.pmax <= F.pitchMax + 1e-9, `pitch ${r.pmax}`);
  // 끝 바로 앞까지 갔다가 속도가 줄며 선다: 마지막 몇 프레임 동안 움직임이 점점 작다
  const c = ctlNew(), dt = 1 / 60; c.pitch = 1.0; c.vPitch = 2.0; c.held = false;
  const steps = [];
  for (let i = 0; i < 40; i++) { const p = c.pitch; C.stepLook(c, dt); steps.push(c.pitch - p); }
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i] <= steps[i - 1] + 1e-12, `pitch 걸음이 커졌다 ${i}`);
  assert.ok(c.pitch <= F.pitchMax && c.pitch > F.pitchMax - F.lookSoft, `멈춘 pitch ${c.pitch.toFixed(3)}`);
});

test('프레임률 독립: 30·60·120Hz 에서 관성·줌·따라가기·걷기 감속이 같다(허용 오차 안)', () => {
  const rs = [30, 60, 120].map((hz) => flick(hz, 2.0, 0.5));
  for (const r of rs) assert.ok(Math.abs(r.extra - rs[1].extra) < 0.02 * rs[1].extra + 0.004, `관성 ${rs.map((x) => x.extra.toFixed(4)).join(' / ')}`);
  for (const r of rs) assert.ok(Math.abs(r.stopT - rs[1].stopT) < 0.05, `멈춘 시각 ${rs.map((x) => x.stopT.toFixed(3)).join(' / ')}`);
  // 줌 스프링: 0.5초 뒤 값
  const z = [30, 60, 120].map((hz) => { const c = ctlNew(); c.zoom = 1.5; for (let t = 0; t < 0.5 - 1e-9; t += 1 / hz) C.stepLook(c, 1 / hz); return c.zoomS; });
  for (const v of z) assert.ok(Math.abs(v - z[1]) < 1e-6, `줌 ${z.join(' / ')}`);
  // 피벗 따라가기: 1.4m/s 로 1초 걷고 멈춘 0.5초 뒤 위치
  const fo = [30, 60, 120].map((hz) => { const s = C.createFollow(); s.step(0, 0, 0, 1 / hz); let x = 0; for (let t = 0; t < 1.5 - 1e-9; t += 1 / hz) { if (t < 1 - 1e-9) x += 1.4 / hz; s.step(x, 0, 0, 1 / hz); } return s.x; });
  for (const v of fo) assert.ok(Math.abs(v - fo[1]) < 0.01, `따라가기 ${fo.map((v2) => v2.toFixed(4)).join(' / ')}`);
  // 걷기 감속 거리
  const dd = [30, 60, 120].map((hz) => decel(hz).dist);
  for (const v of dd) assert.ok(Math.abs(v - dd[1]) < 0.01, `감속 거리 ${dd.map((v2) => v2.toFixed(4)).join(' / ')}`);
});

test('피벗 따라가기(임계 감쇠): 출발·정지에 살짝 늦고 넘치거나 출렁이지 않는다, 순간 이동은 바로', () => {
  for (const hz of [30, 60, 120]) {
    const s = C.createFollow(), dt = 1 / hz; s.step(0, 0, 0, dt);
    let x = 0, over = 0, lag = 0;
    for (let t = 0; t < 3; t += dt) {
      if (t < 1.5) x += 1.4 * dt;
      s.step(x, 0, 0, dt);
      if (s.x > x + 1e-9) over++;
      if (t > 1.0 && t < 1.5) lag = Math.max(lag, x - s.x);
    }
    assert.equal(over, 0, `${hz}Hz: 피벗이 아바타를 앞질렀다`);
    assert.ok(lag > 0.1 && lag < 0.45, `${hz}Hz: 걷는 중 늦음 ${lag.toFixed(2)}m(2·v/ω)`);
    assert.ok(Math.abs(s.x - x) < 0.01, `${hz}Hz: 멈추고 1.5초 뒤 ${(x - s.x).toFixed(3)}m 남음`);
    s.step(x + 5, 0, 0, dt);
    assert.equal(s.x, x + 5, '순간 이동(1.5m 넘게)은 따라가지 않고 바로');
  }
});

// 1.4m/s 로 걷다가 손잡이를 놓는다 → 멈출 때까지의 거리·시간
function decel(hz) {
  const me = { vx: 1.4, vz: 0 }, dt = 1 / hz; let dist = 0, t = 0;
  for (; t < 2 && (me.vx !== 0 || me.vz !== 0); t += dt) { C.moveStep(me, 0, 0, dt, false); dist += me.mvx * dt; }
  return { dist, t };
}

test('걷기: 손잡이를 놓으면 0.25~0.45초에 미끄러지듯 서고, 감속 거리는 0.08~0.3m, 출발은 부드럽게', () => {
  const d = decel(60);
  assert.ok(d.t > 0.25 && d.t < 0.45, `멈춘 시간 ${d.t.toFixed(2)}초`);
  assert.ok(d.dist > 0.08 && d.dist < 0.3, `감속 거리 ${d.dist.toFixed(3)}m`);
  // 출발: 첫 프레임에 최고 속도로 튀지 않고 0.5초 안에 90%
  const me = { vx: 0, vz: 0 }, dt = 1 / 60;
  C.moveStep(me, 1.4, 0, dt, false);
  assert.ok(me.vx < 0.3, `첫 프레임 속도 ${me.vx.toFixed(2)}`);
  let t = dt; while (me.vx < 1.26 && t < 2) { C.moveStep(me, 1.4, 0, dt, false); t += dt; }
  assert.ok(t < 0.5, `90% 까지 ${t.toFixed(2)}초`);
  // 누르기 이동(자동 걷기)은 길을 따라가야 해서 예전 그대로(autoWalkRate): 0.45초 안에 선다
  const a = { vx: 1.4, vz: 0 }; let n = 0; while (a.vx !== 0 && n < 200) { C.moveStep(a, 0, 0, dt, true); n++; }
  assert.ok(n * dt < 0.45, `자동 걷기 멈춤 ${(n * dt).toFixed(2)}초`);
});

test('줌: 핀치 목표로 부드럽게(넘치지 않고 0.4초 안에 95%), 처음·복원은 바로', () => {
  const c = ctlNew(), dt = 1 / 60; c.zoom = 1.5;
  let t = 0, over = false, prev = c.zoomS, back = false;
  while (c.zoomS < 1.475 && t < 2) { C.stepLook(c, dt); t += dt; if (c.zoomS > 1.5 + 1e-9) over = true; if (c.zoomS < prev - 1e-12) back = true; prev = c.zoomS; }
  assert.ok(t > 0.1 && t < 0.4, `95% 까지 ${t.toFixed(2)}초`);
  assert.ok(!over && !back, '넘치거나 되돌아가지 않는다');
  c.zoom = 0.6; c.zoomSnap = true; C.stepLook(c, dt);
  assert.equal(c.zoomS, 0.6, '복원·입장은 바로');
});

test('손잡이 곡선: 가운데 죽은 구역 0, 끝은 1, 단조 증가, 가운데 근처는 선형보다 느리다(천천히 정확하게)', () => {
  const o = {};
  C.shapeJoy(0.1, 0, o); assert.equal(o.x, 0);
  C.shapeJoy(0, 1, o); assert.ok(Math.abs(o.y - 1) < 1e-12 && o.x === 0);
  C.shapeJoy(0.6, 0.8, o); assert.ok(Math.abs(Math.hypot(o.x, o.y) - 1) < 1e-12 && Math.abs(o.x / o.y - 0.75) < 1e-12, '방향은 그대로');
  let prev = -1;
  for (let m = 0; m <= 1.0001; m += 0.02) { C.shapeJoy(m, 0, o); assert.ok(o.x >= prev - 1e-12); prev = o.x; }
  C.shapeJoy(0.4, 0, o); const lin = (0.4 - F.joyDead) / (1 - F.joyDead);
  assert.ok(o.x < lin, `0.4 → ${o.x.toFixed(3)}(선형 ${lin.toFixed(3)})`);
});

test('자동 뒤로 맞추기: 2초 안 만지고 앞쪽으로 1초 넘게 걸어야 아주 천천히, 만지는 중·관성 중·끔이면 돌지 않는다', () => {
  const run = (o) => {
    const c = ctlNew(); c.yaw = 0.8; c.lastDragT = o.lastDrag ?? -10; c.coast = !!o.coast;
    const s = { follow: true, walkSt: false, seated: false, spot: false, t: 0, meYaw: 0, speed: 1.4, dt: 1 / 60 };
    const ys = [];
    for (let i = 0; i < 180; i++) { s.t = i / 60; C.followStep(c, s); ys.push(c.yaw); }
    return ys;
  };
  const ys = run({});
  assert.ok(Math.abs(ys[50] - 0.8) < 1e-9, '걷기 시작 1초 안에는 돌지 않는다');
  assert.ok(ys[179] < 0.8 && ys[179] > 0.4, `3초 뒤 ${ys[179].toFixed(3)}(아주 천천히)`);
  for (let i = 1; i < ys.length; i++) assert.ok(Math.abs(ys[i] - ys[i - 1]) < 0.02, '한 프레임에 크게 돌지 않는다');
  assert.ok(Math.abs(run({ lastDrag: 1.0 })[179] - 0.8) < 0.15, '방금 만졌으면 거의 돌지 않는다');
  assert.equal(run({ coast: true })[179], 0.8, '관성으로 도는 중에는 돌지 않는다');
  F.recenter = false;
  try { assert.equal(run({})[179], 0.8, 'FEEL.recenter = false 면 끈다'); } finally { F.recenter = true; }
});

test('main.js: 손맛 함수를 쓴다(관성·줌 스프링·피벗 스프링·가속·손잡이 곡선), dt 상한 0.05초', async () => {
  const fs = await import('node:fs');
  const main = fs.readFileSync(new URL('../../assets/church/main.js', import.meta.url), 'utf8');
  for (const k of ['CTL.stepLook(ctl, dt)', 'CTL.createFollow()', 'CTL.moveStep(me, vel.vx, vel.vz, dt', 'CTL.shapeJoy(joy.x, joy.y, joy)', 'ctl.zoomS']) assert.ok(main.includes(k), k);
  assert.match(main, /dt = Math\.min\(0\.05, raw\)/);
  assert.ok(!/Math\.min\(1, dt \* 1[12]\)/.test(main), '프레임률에 따라 달라지는 min(1, dt·k) 감쇠가 남았다');
});
