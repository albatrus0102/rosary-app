import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Layouts = require('../../assets/church/layouts.js');

// basic 성당의 고정 장애물(ch_basic.js 와 동일한 값)
const extra = {
  colliders: [
    { x0: -1.4, x1: 1.4, z0: -17.6, z1: -16.4 },     // 제대
    { x: -4.6, z: -16, r: 0.5 },                      // 독서대
    { x: 11.5, z: 3.5, r: 0.5 },                      // 벽기둥
    { x0: 10.4, x1: 12, z0: -4.2, z1: 4.2 }           // 촛불대
  ],
  zones: [{ x0: -12, x1: 12, z0: -20, z1: -14, y: 0.5 }]
};
const L = Logic.create(Layouts.basic, extra);
const P = (x, z) => ({ x, z });

test('basic layout reproduces SPEC §1 (144 seats, ids, positions)', () => {
  assert.equal(L.seats.length, 144);
  assert.ok(L.seatInfo('L03-2'));
  const s = L.seatPos('L03-2');
  assert.ok(Math.abs(s.x - (-5.2)) < 1e-9);
  assert.ok(Math.abs(s.z - (-10 + 1.9 * 3 + 0.35)) < 1e-9);
  assert.equal(s.y, 0.45);
  const r = L.seatPos('R11-5');
  assert.ok(Math.abs(r.x - 8.2) < 1e-9);
  assert.ok(Math.abs(r.z - (-10 + 1.9 * 11 + 0.35)) < 1e-9);
  assert.equal(new Set(L.seatIds).size, 144);
});

test('bench bands are 0.5 m thick at z_r +- 0.25 and span x [2.6, 9]', () => {
  const b = L.bands.find((q) => q.g === 'R' && q.row === 4);
  const zr = -10 + 1.9 * 4;
  assert.ok(Math.abs(b.z0 - (zr - 0.25)) < 1e-9);
  assert.ok(Math.abs(b.z1 - (zr + 0.25)) < 1e-9);
  assert.ok(Math.abs(b.x0 - 2.6) < 1e-9 && Math.abs(b.x1 - 9) < 1e-9);
});

test('collision: bench blocks walking and slides along it', () => {
  const zr = -10 + 1.9 * 4;
  // 벤치 뒤쪽 통로(z_r+0.9)에서 -z로 걸어도 벤치를 뚫지 못한다
  const p = P(5, zr + 0.9);
  for (let i = 0; i < 60; i++) L.moveCircle(p, 0, -0.05);
  assert.ok(p.z >= zr + 0.25 + 0.3 - 1e-6, 'z=' + p.z);
  // 대각선(-z, +x)으로 밀면 x는 계속 진행(미끄러짐)
  const q = P(4, zr + 0.9);
  for (let i = 0; i < 20; i++) L.moveCircle(q, 0.05, -0.05);
  assert.ok(q.x > 4.9, 'x slid to ' + q.x);
  assert.ok(q.z >= zr + 0.55 - 1e-6);
});

test('row corridors are walkable from aisle to last seat', () => {
  for (const side of [-1, 1]) {
    const zr = -10 + 1.9 * 6;
    const p = P(side * 1.5, zr + 0.95);
    for (let i = 0; i < 200; i++) L.moveCircle(p, side * 0.05, 0);
    assert.ok(Math.abs(p.x) > 8.5, 'reached x=' + p.x); // 벽쪽 통로까지 도달
    assert.ok(Math.abs(p.z - (zr + 0.95)) < 1e-6);
  }
});

test('altar/lectern/pilaster colliders', () => {
  const p = P(0, -14);
  for (let i = 0; i < 40; i++) L.moveCircle(p, 0, -0.05);
  assert.ok(p.z >= -16.4 + 0.3 - 1e-6, 'altar z=' + p.z);
  const q = P(-4.6, -14);
  for (let i = 0; i < 40; i++) L.moveCircle(q, 0, -0.05);
  assert.ok(q.z >= -16 + 0.5 + 0.3 - 1e-6);
  const w = P(10.8, 6);
  for (let i = 0; i < 10; i++) L.moveCircle(w, 0, -0.05);
  assert.ok(Math.hypot(w.x - 11.5, w.z - 3.5) >= 0.8 - 1e-6 || w.z > 4.5 || w.z < 3);
});

test('bounds clamp (walls, back wall)', () => {
  const p = P(11, 0);
  L.moveCircle(p, 5, 0);
  assert.ok(p.x <= 12 - 0.3 + 1e-9);
  const q = P(0, -19);
  L.moveCircle(q, 0, -3);
  assert.ok(q.z >= -20 + 0.3 - 1e-9);
  const w = P(-11, 5);
  L.moveCircle(w, -5, 0);
  assert.ok(w.x >= -12 + 0.3 - 1e-9);
});

test('nearest free seat within 1.3 m with occupancy', () => {
  const s = L.seatPos('L03-2');
  // 좌석 바로 뒤 통로
  const x = s.x, z = s.z + 0.6;
  assert.equal(L.nearestSeat(x, z, {}), 'L03-2');
  // 점유되면 이웃 좌석(1m 옆)
  const alt = L.nearestSeat(x, z, { 'L03-2': 'someone' });
  assert.ok(alt === 'L03-1' || alt === 'L03-3', alt);
  // 양옆 다 점유되면 null(1.3m 밖은 불가)
  assert.equal(L.nearestSeat(x, z, { 'L03-2': 1, 'L03-1': 1, 'L03-3': 1 }), null);
  // 함수형 occupancy
  assert.equal(L.nearestSeat(x, z, (id) => id === 'L03-2'), alt);
  // 멀면 null
  assert.equal(L.nearestSeat(0, 0, {}), null);
  // 벤치 반대편(앞 통로)에서는 앞줄의 좌석이 선택된다(벤치를 가로지르지 않음)
  const front = L.nearestSeat(x, s.z - 0.8, {});
  assert.equal(front, 'L02-2');
});

test('stand position is the corridor behind the seat and is free of colliders', () => {
  const sp = L.standPos('R05-3');
  const s = L.seatPos('R05-3');
  assert.ok(Math.abs(sp.x - s.x) < 1e-9);
  assert.ok(Math.abs(sp.z - (s.z + 0.65)) < 1e-9);
  const p = P(sp.x, sp.z);
  const hit = L.moveCircle(p, 0, 0);
  assert.equal(hit, false);
});

test('candle slots: 96 slots, reach 1.8 m, skip lit', () => {
  assert.equal(L.slotCount, 96);
  const sp = L.slotPos(0);           // 뒤쪽 위쪽 줄 첫 칸
  assert.ok(sp.x > 11.5 && Math.abs(sp.z + 3.75) < 1e-9, JSON.stringify(sp));
  const front = L.slotPos(80);       // 가장 앞줄(row 5)
  assert.ok(Math.abs(front.x - 10.5) < 1e-9);
  assert.equal(L.nearestCandleSlot(9.8, 0, null) !== null, true);
  assert.equal(L.nearestCandleSlot(5, 0, null), null);
  assert.equal(L.nearestCandleSlot(9.8, 12, null), null);
  const first = L.nearestCandleSlot(9.9, -2.5, null);
  const second = L.nearestCandleSlot(9.9, -2.5, (s) => s === first);
  assert.notEqual(first, second);
});

test('floor height and joystick velocity', () => {
  assert.equal(L.floorY(0, -17), 0.5);
  assert.equal(L.floorY(0, 0), 0);
  const o = {};
  L.joyToVelocity(0, 1, 0, o);
  assert.ok(Math.abs(o.vz + 3.2) < 1e-9 && Math.abs(o.vx) < 1e-9);
  assert.ok(Math.abs(o.yaw) < 1e-9);
  L.joyToVelocity(1, 0, 0, o); // 오른쪽
  assert.ok(Math.abs(o.vx - 3.2) < 1e-9);
  L.joyToVelocity(0, 1, Math.PI / 2, o); // 카메라가 -x를 봄
  assert.ok(Math.abs(o.vx + 3.2) < 1e-9);
});
