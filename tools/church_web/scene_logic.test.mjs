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

test('pew bands cover backrest+seat (seat -0.20 .. +0.62 in z) and span x [2.6, 9]', () => {
  const b = L.bands.find((q) => q.g === 'R' && q.row === 4);
  const zs = -10 + 1.9 * 4 + 0.35;   // 좌석 중심
  assert.ok(Math.abs(b.z0 - (zs - Logic.C.BAND_FAR)) < 1e-9);
  assert.ok(Math.abs(b.z1 - (zs - Logic.C.BAND_NEAR)) < 1e-9);
  assert.ok(Math.abs(b.x0 - 2.6) < 1e-9 && Math.abs(b.x1 - 9) < 1e-9);
  // 그룹마다 맨 앞줄 앞 가림판(좌석 없음) 하나
  const fr = L.bands.filter((q) => q.front);
  assert.equal(fr.length, 2);
  assert.equal(L.bands.length, 24 + 2);
  const f0 = fr.find((q) => q.g === 'R'), z0 = -10 + 0.35;
  assert.ok(f0.z1 < z0 - 1.0 && f0.z0 > z0 - 1.9, JSON.stringify(f0));
});

test('pew geometry invariants (SPEC §28): legroom, shelf, kneeler, seat under the hips', () => {
  const P = Logic.PEW, C = Logic.C, a = Logic.pewAhead(1.9);
  // 좌석: 높이 0.45, 깊이 0.4~0.55, 좌석 중심이 좌석판 안쪽
  assert.equal(P.SEAT_TOP, C.SEAT_H);
  const depth = P.SEAT_FRONT - P.SEAT_REAR;
  assert.ok(depth >= 0.4 && depth <= 0.55, 'seat depth ' + depth);
  assert.ok(P.SEAT_REAR < -0.2 && P.SEAT_FRONT > 0.15);
  // 등받이는 좌석 뒤에 있고 뒤로 기울며 높이 0.9~1.0
  assert.ok(P.BACK_U <= P.SEAT_REAR + 1e-9 && P.BACK_TILT > 0.08 && P.BACK_TILT < 0.3);
  assert.ok(P.BACK_TOP >= 0.9 && P.BACK_TOP <= 1.0);
  // 발 둘 곳: 좌석 앞끝 ~ 앞줄 무릎틀 >= 0.6 m, 앞줄 선반까지 >= 0.9 m
  assert.ok(a.legroom >= 0.6, 'legroom ' + a.legroom);
  assert.ok(a.clear >= 0.9, 'clear ' + a.clear);
  // 책 선반: 앞줄 등받이 뒷면에 붙고(틈 없음) 깊이 0.12~0.22, 높이 0.6~0.8
  const backRearAtShelf = P.BACK_U - P.BACK_T - Math.tan(P.BACK_TILT) * (P.SHELF_Y - P.SEAT_TOP);
  assert.ok(P.SHELF_U1 >= backRearAtShelf - 0.03 && P.SHELF_U1 <= backRearAtShelf + 0.03, 'shelf touches back');
  const sd = P.SHELF_U1 - P.SHELF_U0;
  assert.ok(sd >= 0.12 && sd <= 0.22 && P.SHELF_Y >= 0.6 && P.SHELF_Y <= 0.8 && P.SHELF_LIP > 0.02);
  // 무릎틀: 높이 0.10~0.16, 깊이 0.2~0.3, 선반보다 뒷줄 쪽으로 더 나옴
  assert.ok(P.KNEEL_TOP >= 0.10 && P.KNEEL_TOP <= 0.16);
  const kd = P.KNEEL_U1 - P.KNEEL_U0;
  assert.ok(kd >= 0.2 && kd <= 0.3 && P.KNEEL_U0 < P.SHELF_U0);
  // 충돌 띠는 등받이·좌석·선반을 덮는다. 줄 안 통로(중심이 다닐 수 있는 폭) >= 0.45 m
  assert.ok(C.BAND_FAR >= P.SEAT_FRONT - 1e-9 && C.BAND_NEAR <= P.SHELF_U0 + 1e-9);
  const corridor = 1.9 - (C.BAND_FAR - C.BAND_NEAR) - 2 * C.RADIUS;
  assert.ok(corridor >= 0.45, 'corridor ' + corridor);
  // 통로를 걷는 사람의 발(중심에서 0.13 m)이 무릎틀에 3 cm 넘게 파고들지 않는다
  assert.ok((1.9 + C.BAND_NEAR - C.RADIUS) + 0.13 <= 1.9 + P.KNEEL_U0 + 0.03);
  // 서는 자리는 통로 안
  assert.ok(C.STAND_FWD >= C.BAND_FAR + C.RADIUS && C.STAND_FWD <= 1.9 + C.BAND_NEAR - C.RADIUS);
});

test('kneel spot: on the kneeler of the row ahead (or of the frontal for row 0)', () => {
  const P = Logic.PEW;
  for (const id of ['L00-0', 'L05-3', 'R11-5']) {
    const k = L.kneelSpot(id);
    assert.ok(k.rail && k.y === P.KNEEL_TOP);
    assert.ok(k.fwd > 1.9 + P.KNEEL_U0 && k.fwd < 1.9 + P.KNEEL_U1, 'fwd ' + k.fwd);
  }
  // 가림판이 없는 그룹의 맨 앞줄은 좌석 앞 바닥
  const lay2 = JSON.parse(JSON.stringify(Layouts.basic)); lay2.seatGroups[0].frontal = false;
  const L2 = Logic.create(lay2, {});
  assert.deepEqual(L2.kneelSpot('L00-0'), { fwd: 0.5, y: 0, rail: false });
  assert.ok(L2.kneelSpot('L01-0').rail && L2.kneelSpot('R00-0').rail);
  assert.equal(L2.bands.filter((q) => q.front).length, 1);
});

test('collision: pew blocks walking and slides along it', () => {
  const zs = -10 + 1.9 * 4 + 0.35, zf = zs - Logic.C.BAND_FAR;   // 좌석 앞끝
  // 좌석 앞 통로에서 +z(뒤쪽)로 걸어도 의자를 뚫지 못한다
  const p = P(5, zs - 0.9);
  for (let i = 0; i < 60; i++) L.moveCircle(p, 0, 0.05);
  assert.ok(p.z <= zf - 0.3 + 1e-6, 'z=' + p.z);
  // 대각선(+z, +x)으로 밀면 x는 계속 진행(미끄러짐)
  const q = P(4, zs - 0.9);
  for (let i = 0; i < 20; i++) L.moveCircle(q, 0.05, 0.05);
  assert.ok(q.x > 4.9, 'x slid to ' + q.x);
  assert.ok(q.z <= zf - 0.3 + 1e-6);
  // 앞줄 등받이(뒷면 선반 포함)도 뚫지 못한다
  const w = P(5, zs - 0.7);
  for (let i = 0; i < 60; i++) L.moveCircle(w, 0, -0.05);
  assert.ok(w.z >= zs - 1.9 - Logic.C.BAND_NEAR + 0.3 - 1e-6, 'z=' + w.z);
});

test('row corridors are walkable from aisle to last seat', () => {
  for (const side of [-1, 1]) {
    for (const row of [0, 6, 11]) {
      const zc = -10 + 1.9 * row + 0.35 - Logic.C.STAND_FWD;
      const p = P(side * 1.5, zc);
      for (let i = 0; i < 200; i++) L.moveCircle(p, side * 0.05, 0);
      assert.ok(Math.abs(p.x) > 8.5, 'reached x=' + p.x); // 벽쪽 통로까지 도달
      assert.ok(Math.abs(p.z - zc) < 1e-6);
    }
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
  // 좌석 바로 앞 통로
  const x = s.x, z = s.z - 0.6;
  assert.equal(L.nearestSeat(x, z, {}), 'L03-2');
  // 점유되면 이웃 좌석(1m 옆)
  const alt = L.nearestSeat(x, z, { 'L03-2': 'someone' });
  assert.ok(alt === 'L03-1' || alt === 'L03-3', alt);
  // 양옆 다 점유되면 null(1.3m 밖은 불가, 앞줄 좌석은 등받이 너머라 불가)
  assert.equal(L.nearestSeat(x, z, { 'L03-2': 1, 'L03-1': 1, 'L03-3': 1 }), null);
  // 함수형 occupancy
  assert.equal(L.nearestSeat(x, z, (id) => id === 'L03-2'), alt);
  // 멀면 null
  assert.equal(L.nearestSeat(0, 0, {}), null);
  // 등받이 뒤(뒷줄 통로)에서는 뒷줄의 좌석이 선택된다(등받이를 가로지르지 않음)
  const behind = L.nearestSeat(x, s.z + 0.95, {});
  assert.equal(behind, 'L04-2');
});

test('stand position is the corridor in front of the seat and is free of colliders', () => {
  const sp = L.standPos('R05-3');
  const s = L.seatPos('R05-3');
  assert.ok(Math.abs(sp.x - s.x) < 1e-9);
  assert.ok(Math.abs(sp.z - (s.z - Logic.C.STAND_FWD)) < 1e-9);
  for (const id of L.seatIds) {
    const q = L.standPos(id), p = P(q.x, q.z);
    assert.equal(L.moveCircle(p, 0, 0), false, id);
  }
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
