// scene_logic.js: 좌석(낱자리·줄 의자)·바닥 높이·충돌 미끄러짐·조이스틱 → 속도
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './lib/load.mjs';
const L = load('scene_logic.js').RoomLogic;

const lay = { id: 't', bounds: { x0: -5, x1: 5, z0: -5, z1: 5 }, spawn: { x: 0, z: 4 },
  seats: [{ x: -2, z: 0, yaw: Math.PI / 2, stand: { x: -1.4, z: 0 } }, { x: 2, z: 0, yaw: -Math.PI / 2, y: 0.2 }],
  seatGroups: [{ g: 'A', rows: 2, perRow: 3, origin: { x: -1, z: -3 }, dx: 1, dz: 1.5, yaw: 0 }] };

test('낱자리 먼저, 그다음 줄 의자: id·번호 왕복', () => {
  const lg = L.create(lay, { colliders: [] });
  assert.equal(lg.seats.length, 2 + 6);
  assert.deepEqual(lg.seatIds.slice(0, 3), ['S0', 'S1', 'A00-0']);
  for (let i = 0; i < lg.seats.length; i++) assert.equal(lg.seatIndex(lg.seatAt(i)), i);
  assert.equal(lg.seatAt(99), null);
  assert.equal(lg.seatIndex('nope'), -1);
});
test('좌석 높이·서는 자리', () => {
  const lg = L.create(lay, { colliders: [], zones: [{ x0: -3, x1: 3, z0: -1, z1: 1, y: 0.1 }] });
  assert.equal(lg.seatFloor('S0'), 0.1);                // 구역 바닥
  assert.equal(lg.seatFloor('S1'), 0.2);                // 낱자리 y(발판)가 우선
  assert.ok(Math.abs(lg.seatPos('S1').y - (0.2 + L.C.SEAT_H)) < 1e-9);
  assert.deepEqual(lg.standPos('S0'), { x: -1.4, z: 0, yaw: Math.PI / 2 });
  const st = lg.standPos('S1');                         // stand 가 없으면 좌석 뒤(-f) 0.55m — S1 은 +x 를 보므로 x 가 줄어든다
  assert.ok(Math.abs(st.x - 1.45) < 1e-9 && Math.abs(st.z) < 1e-9);
});
test('가까운 빈자리: 찬 자리는 건너뛴다', () => {
  const lg = L.create(lay, { colliders: [] });
  assert.equal(lg.nearestSeat(-1.6, 0.1), 'S0');
  assert.equal(lg.nearestSeat(-1.6, 0.1, (id) => id === 'S0'), null);
  assert.equal(lg.nearestSeat(0, 4), null);             // 멀면 없음
});
test('충돌: 상자·원에서 미끄러지고 걷기 영역 밖으로 못 나간다', () => {
  const lg = L.create(lay, { colliders: [{ x0: -1, x1: 1, z0: 1, z1: 1.2 }, { x: 3, z: 3, r: 0.5 }] });
  const p = { x: 0, z: 2 };
  for (let i = 0; i < 30; i++) lg.moveCircle(p, 0, -0.11);   // 벽을 향해(한 프레임 최대 걸음 = 2.2 m/s × 0.05 s)
  assert.ok(p.z >= 1.2 + L.C.RADIUS - 1e-6, 'wall stops ' + p.z);
  const q = { x: 3, z: 2 };
  for (let i = 0; i < 20; i++) lg.moveCircle(q, 0, 0.11);
  assert.ok(Math.hypot(q.x - 3, q.z - 3) >= 0.5 + L.C.RADIUS - 1e-6);
  const r = { x: 4.5, z: 0 };
  for (let i = 0; i < 30; i++) lg.moveCircle(r, 0.11, 0);
  assert.ok(r.x <= 5 - L.C.RADIUS + 1e-9);
});
test('조이스틱 → 속도(카메라 기준)', () => {
  const lg = L.create(lay, { colliders: [] }), o = {};
  lg.joyToVelocity(0, 1, 0, o);                         // 앞 = -z
  assert.ok(o.vz < 0 && Math.abs(o.vx) < 1e-9 && Math.abs(o.speed - lg.walkSpeed) < 1e-9);
  lg.joyToVelocity(0.01, 0.01, 0, o);
  assert.equal(o.speed, 0);                             // 죽은 구역
});
test('줄 의자는 앞 띠가 충돌체', () => {
  const lg = L.create(lay, { colliders: [] });
  assert.equal(lg.bands.length, 2);
  assert.equal(lg.colliders.length, 2);
});
