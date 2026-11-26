// ch_house.js: 충돌체(planColliders — 화면과 같은 목록)·좌석·집을 걸어서 빠져나갈 수 없음·갈 수 있는 곳
import test from 'node:test';
import assert from 'node:assert/strict';
import { house, penetration } from './lib/load.mjs';
const { B, layout, colliders, logic, L } = house();
const R = L.C.RADIUS, P = layout.plan;
const free = (x, z, r = R) => colliders.every((c) => penetration(c, x, z, r) <= 1e-6);
const inRoom = (x, z) => x > P.room.x0 && x < P.room.x1 && z > P.room.z0 && z < P.room.z1;
const inCorr = (x, z) => x > P.corridor.x0 && x < P.corridor.x1 && z > P.corridor.z0 && z <= P.corridor.z1;

test('충돌체: 모두 유한한 숫자, 벽은 PLAN 과 같다', () => {
  assert.ok(colliders.length > 30 && colliders.length < 300);
  for (const c of colliders) for (const k of ['x0', 'x1', 'z0', 'z1', 'x', 'z', 'r']) if (c[k] !== undefined) assert.ok(Number.isFinite(c[k]), c.tag + '.' + k);
  const walls = colliders.filter((c) => c.tag.startsWith('wall:'));
  assert.equal(walls.length, P.walls.filter((w) => w.collide !== false).length);
  for (const c of colliders) if (c.x0 !== undefined) assert.ok(c.x1 > c.x0 && c.z1 > c.z0, c.tag);
});
test('스폰·좌석 서는 자리는 비어 있고 걷기 영역 안', () => {
  const b = layout.bounds;
  for (const p of [layout.spawn, ...layout.seats.map((s) => s.stand)]) {
    assert.ok(free(p.x, p.z), 'blocked ' + JSON.stringify(p));
    assert.ok(p.x > b.x0 + R && p.x < b.x1 - R && p.z > b.z0 + R && p.z < b.z1 - R);
  }
});
test('좌석 6: 창가 셋은 창(-x)을, 작업대 스툴은 +x 를, 마당 그네 둘(4·5)은 집 쪽(+x)을 본다', () => {
  assert.equal(logic.seats.length, 6);
  assert.equal(layout.seatLabels.length, 6);
  const f = (i) => L.fwd(logic.seats[i].yaw);
  for (let i = 0; i < 3; i++) { assert.ok(f(i)[0] < -0.99, 'desk seat faces window'); assert.ok(inRoom(logic.seats[i].x, logic.seats[i].z)); }
  assert.ok(f(3)[0] > 0.99);
  assert.ok(Math.abs(logic.seatFloor('S3') - 0.36) < 1e-9, 'stool footrest');
  assert.ok(Math.abs(logic.seatFloor('S0') - 0.16) < 1e-9, 'room floor');
  // 서는 자리에서 가장 가까운 빈자리 = 그 좌석
  layout.seats.forEach((s, i) => assert.equal(logic.nearestSeat(s.stand.x, s.stand.z), 'S' + i));
  // 앉은 사람 앞(f 쪽 0.6m)에 책상·작업대가 있다
  for (let i = 0; i < 4; i++) { const s = logic.seats[i], v = f(i); assert.ok(!free(s.x + v[0] * 0.6, s.z + v[1] * 0.6, 0.05), 'desk in front of seat ' + i); }
});
test('마당 그네: 나란히 두 자리(겹침 없음), 실내 좌석과 따로, 틀은 충돌체', () => {
  const a = logic.seats[4], b = logic.seats[5];
  assert.equal(a.yaw, b.yaw); assert.ok(L.fwd(a.yaw)[1] > 0.99, 'faces the street (+z)');
  assert.ok(Math.abs(a.z - b.z) < 1e-9, 'same row');
  const side = Math.abs(a.x - b.x);
  assert.ok(side >= 0.55 && side <= 0.7, 'side-by-side spacing ' + side);   // 앉은 아바타 어깨 폭 약 0.45 m
  assert.ok(!inRoom(a.x, a.z) && !inRoom(b.x, b.z));
  assert.equal(logic.seatFloor('S4'), 0); assert.equal(logic.seatFloor('S5'), 0);
  const sw = colliders.find((c) => c.tag === 'swing');
  assert.ok(sw && a.x > sw.x0 && b.x < sw.x1 && a.z > sw.z0 && a.z < sw.z1, 'swing frame covers both seats');
  // 몸통(반지름 0.25)이 밧줄·팔걸이(좌석 가운데 ±0.74) 안쪽에 들어간다 — 끼임 없음
  const xc = (a.x + b.x) / 2;
  for (const s of [a, b]) assert.ok(Math.abs(s.x - xc) + 0.25 <= 0.7, 'avatar clears ropes/arms');
});
function f4(s) { return L.fwd(s.yaw)[0]; }

// 걷기 흉내(main.js 와 같은 걸음: 한 프레임 최대 2.2 m/s × 0.05 s)
function walk(p, heading, n, step = 0.11) {
  const path = [];
  for (let i = 0; i < n; i++) { logic.moveCircle(p, -Math.sin(heading) * step, -Math.cos(heading) * step); path.push({ x: p.x, z: p.z }); }
  return path;
}
test('집을 걸어서 빠져나갈 수 없다: 실내에서 어느 쪽으로 걸어도 문으로만 나간다', () => {
  let rnd = 12345; const rng = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 400; k++) {
    const p = { x: P.room.x0 + 0.4 + rng() * 4.2, z: P.room.z0 + 0.4 + rng() * 6.2 };
    if (!free(p.x, p.z)) continue;
    let prev = { ...p };
    for (const q of walk(p, rng() * Math.PI * 2, 120)) {
      assert.ok(free(q.x, q.z, R - 0.02), 'inside collider at ' + JSON.stringify(q));
      const was = inRoom(prev.x, prev.z) || inCorr(prev.x, prev.z), now = inRoom(q.x, q.z) || inCorr(q.x, q.z);
      if (was && !now) assert.ok(q.x > P.door.x0 && q.x < P.door.x1 && q.z > P.room.z1 - 0.1, 'left the house not through the door: ' + JSON.stringify(q));
      prev = q;
    }
  }
});
test('바깥에서 마구 걸어도 걷기 영역·집 뒤·이웃 건물로 못 들어간다', () => {
  let rnd = 999; const rng = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  const p = { x: layout.spawn.x, z: layout.spawn.z }, b = logic.bounds;
  let heading = 0;
  for (let i = 0; i < 40000; i++) {
    if (i % 25 === 0) heading = rng() * Math.PI * 2;
    logic.moveCircle(p, -Math.sin(heading) * 0.11, -Math.cos(heading) * 0.11);
    assert.ok(p.x >= b.minX - 1e-9 && p.x <= b.maxX + 1e-9 && p.z >= b.minZ - 1e-9 && p.z <= b.maxZ + 1e-9);
    assert.ok(free(p.x, p.z, R - 0.02), 'penetrates at ' + JSON.stringify(p));
    assert.ok(!(p.z < -3.5 && !inCorr(p.x, p.z)), 'behind the house ' + JSON.stringify(p));
    assert.ok(!(p.x > 2.7 && p.z < 3.5), 'inside neighbor ' + JSON.stringify(p));
  }
});
// 0.1 m 격자 너비 우선 탐색: 스폰에서 어디까지 갈 수 있나
function reach() {
  const b = logic.bounds, h = 0.1, nx = Math.ceil((b.maxX - b.minX) / h) + 1, nz = Math.ceil((b.maxZ - b.minZ) / h) + 1;
  const ok = (i, j) => free(b.minX + i * h, b.minZ + j * h), seen = new Uint8Array(nx * nz);
  const s = [Math.round((layout.spawn.x - b.minX) / h), Math.round((layout.spawn.z - b.minZ) / h)], q = [s];
  seen[s[1] * nx + s[0]] = 1;
  while (q.length) {
    const [i, j] = q.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, c = j + dj;
      if (a < 0 || c < 0 || a >= nx || c >= nz || seen[c * nx + a] || !ok(a, c)) continue;
      seen[c * nx + a] = 1; q.push([a, c]);
    }
  }
  return (x, z) => { const i = Math.round((x - b.minX) / h), j = Math.round((z - b.minZ) / h); return !!seen[j * nx + i]; };
}
test('스폰에서 네 좌석·복도 끝·옆마당까지 걸어갈 수 있다', () => {
  const can = reach();
  layout.seats.forEach((s, i) => assert.ok(can(s.stand.x, s.stand.z), 'seat ' + i));   // 그네(4·5) 포함
  assert.ok(can(0, -5.2), 'corridor end');
  assert.ok(can(-4.5, 0), 'side yard (through the gate)');
  assert.ok(can(-0.2, 1.0), 'rug aisle');
  assert.ok(!can(0, -6.5) && !can(5, 0), 'outside the lot is not reachable');
});
test('정원 자리 16 · 기본 꽃 목록과 맞다', () => {
  const s = B.gardenSlots();
  assert.equal(s.length, 16);
  for (const g of s) assert.ok(!free(g.x, g.z, 0.01), 'flower slot sits in a bed/planter');
});
test('썸네일 카메라 2', () => {
  assert.equal(B.thumbs.length, 2);
  assert.ok(!inRoom(B.thumbs[0].x, B.thumbs[0].z) && inRoom(B.thumbs[1].x, B.thumbs[1].z));
});
