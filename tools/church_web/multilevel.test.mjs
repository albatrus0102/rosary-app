// 여러 층 걷기 엔진(scene_logic levels + stations createMulti) 시험 — 작은 두 층 모형으로.
// docs/church/interiors/assisi.md §엔진: 바닥 = 지금 발 높이 + 한 걸음(0.45m) 아래의 가장 높은 바닥, 충돌체는 높이 범위(y0..y1)를 본다,
// 길 찾기 그래프의 마디 = (xz 칸, 바닥 높이). 한 층 성당(levels 없음)은 예전 그대로(yRef·y 인자를 무시).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');

// 모형: 아래층(y 0, 전체) 위에 위층 판(y 3, z < 2). 오른쪽(x 3..5) 계단 12단(z 8 → 2, 단 0.25m)이 두 층을 잇는다.
// 아래층 벽(높이 0..2.9)이 z 2 에 x −6..3 으로 있고, 가운데에 문(x −1..1)이 있다. 위층 가장자리 난간(높이 3..4.2)이 z 2 에 x −6..3.
const UP = 3, RISE = 0.25, N = 12;
function model() {
  const zones = [{ x0: -6, x1: 6, z0: -10, z1: 10, y: 0 }, { x0: -6, x1: 6, z0: -10, z1: 2, y: UP }];
  const colliders = [];
  for (let i = 1; i <= N; i++) {
    const z1 = 8 - (i - 1) * 0.5, z0 = z1 - 0.5, h = i * RISE;
    zones.push({ x0: 3, x1: 5, z0, z1, y: h });
    colliders.push({ x0: 3, x1: 5, z0, z1, y0: -1, y1: h - 0.3 });   // 계단 밑 덩어리: 아래층 사람만 막는다
  }
  colliders.push({ x0: 2.8, x1: 3, z0: 2, z1: 8, y0: 0.4, y1: 4.5 });   // 계단 안쪽 난간(계단 위 사람만)
  colliders.push({ x0: -6, x1: -1, z0: 1.9, z1: 2.1, y0: 0, y1: 2.9 }, { x0: 1, x1: 3, z0: 1.9, z1: 2.1, y0: 0, y1: 2.9 });   // 아래층 벽(문 x −1..1)
  colliders.push({ x0: -6, x1: 2.8, z0: 1.9, z1: 2.1, y0: UP, y1: UP + 1.2 });   // 위층 가장자리 난간
  const layout = {
    id: 'mltest', scalePercent: 100, ground: false,
    bounds: { x0: -6, x1: 6, z0: -10, z1: 10 },
    spawn: { x: 0, z: -8, r: 0, y: UP },
    levels: [{ id: 'U', label_ko: '위층', y: UP, go: { x: 0, z: -4 } }, { id: 'L', label_ko: '아래층', y: 0, go: { x: -3, z: 6 } }],
    seatGroups: [
      { g: 'U', rows: 2, perRow: 3, origin: { x: -1.5, z: -6 }, dx: -0.7, dz: 1.9, rowDx: 0, yaw: 0, y: UP },
      { g: 'L', rows: 2, perRow: 3, origin: { x: -1.5, z: -6 }, dx: -0.7, dz: 1.9, rowDx: 0, yaw: Math.PI, y: 0 }
    ],
    candles: { stands: [{ x: 4.5, z: -8, slots: 4, cols: 4, face: [-1, 0], fy: UP }, { x: -5, z: 6, slots: 4, cols: 4, face: [1, 0], fy: 0 }] }
  };
  return { layout, zones, colliders };
}

// main.js 의 걷기(moveCircle 에 발 높이, 뒤 floorY(x,z,발 높이))를 그대로 흉내 낸다
function walker(L, x, z, y) {
  return {
    x, z, fy: y, maxJump: 0, mid: false,
    move(dx, dz) {
      const p = { x: this.x, z: this.z };
      L.moveCircle(p, dx, dz, undefined, this.fy);
      const ny = L.floorY(p.x, p.z, this.fy);
      this.maxJump = Math.max(this.maxJump, Math.abs(ny - this.fy));
      if (ny > 1 && ny < 2) this.mid = true;
      this.x = p.x; this.z = p.z; this.fy = ny;
    }
  };
}
function walkPath(L, S, from, to) {
  const p = S.findPath(from, to);
  if (!p) return null;
  const w = walker(L, from.x, from.z, from.y), st = S.startWalk(p, to, 'tap'), out = {};
  for (let t = 0; t < 120; t += 1 / 30) {
    S.stepWalk(st, w, 1 / 30, out);
    if (out.done) break;
    w.move(out.vx / 30, out.vz / 30);
  }
  return { w, path: p, ok: Math.hypot(w.x - to.x, w.z - to.z) < 0.7 };
}

test('여러 층: floorY 는 발 높이로 층을 고르고, 인자 없이 부르면 가장 높은 바닥(예전과 같은 뜻)', () => {
  const { layout, zones, colliders } = model();
  const L = Logic.create(layout, { zones, colliders, reverence: false });
  assert.equal(L.multi, true);
  assert.equal(L.floorY(0, -5, 0), 0, '아래층 사람은 위층 판 밑에서도 아래층 바닥');
  assert.equal(L.floorY(0, -5, UP), UP, '위층 사람은 위층');
  assert.equal(L.floorY(0, -5), UP, '인자 없음 = 가장 높은 바닥');
  assert.equal(L.floorY(4, 5.2, 0), 0, '계단 가운데 단(1.5m)은 아래층 발에서 한 걸음이 아니다');
  assert.equal(L.floorY(4, 5.2, 1.25), 1.5);
  assert.deepEqual(L.floorsAt(0, -5), [0, UP]);
  assert.deepEqual(L.floorsAt(-9, 0), [], 'ground:false — 구역 밖은 바닥 후보가 없다(땅 0 도 아니다)');
});

test('여러 층: 충돌체는 그 높이의 몸만 막는다 — 위층 난간은 아래층 사람을, 아래층 벽은 위층 사람을 막지 않는다', () => {
  const { layout, zones, colliders } = model();
  const L = Logic.create(layout, { zones, colliders, reverence: false });
  const hit = (x, z, y) => L.moveCircle({ x, z }, 0, 0, undefined, y);
  assert.ok(hit(-3, 2, UP), '위층 가장자리 난간(위층)');
  assert.ok(hit(-3, 2, 0), '아래층 벽(아래층)');
  assert.ok(!hit(0, 2, 0), '아래층 벽의 문');
  assert.ok(hit(0, 2, UP), '위층 난간은 문 위에도 있다 — 떨어지지 않는다');
  assert.ok(!hit(4, 5.2, 1.5), '계단 위');
  assert.ok(hit(4, 5.2, 0), '계단 밑(아래층)은 막혔다');
  assert.ok(hit(0, 2, undefined), 'y 없이 물으면 모든 충돌체(예전 뜻)');
  assert.equal(L.collidersAt(UP).length < L.colliders.length, true);
});

test('여러 층: 계단으로 걸어 올라가고 내려온다 — 한 걸음에 한 단(0.25m) 넘게 튀지 않고, 끝 층이 맞다', () => {
  const { layout, zones, colliders } = model();
  const L = Logic.create(layout, { zones, colliders, reverence: false });
  const w = walker(L, 4, 9, 0);
  for (let i = 0; i < 200 && w.z > -1; i++) w.move(0, -0.05);
  assert.ok(Math.abs(w.fy - UP) < 1e-9, '위층에 닿음 ' + w.fy);
  assert.ok(w.maxJump <= RISE + 1e-9, '튐 ' + w.maxJump);
  for (let i = 0; i < 300 && w.z < 9.5; i++) w.move(0, 0.05);
  assert.equal(w.fy, 0, '아래층으로 내려옴');
  assert.ok(w.maxJump <= RISE + 1e-9);
  // 아래층에서 위층 판 밑으로(문을 지나) 걸어도 아래층에 머문다(위층으로 '뛰어오르지' 않음)
  const w2 = walker(L, 0, 6, 0);
  for (let i = 0; i < 200; i++) w2.move(0, -0.05);
  assert.equal(w2.fy, 0); assert.ok(w2.z < -3, '판 밑으로 들어감 z ' + w2.z);
  // 위층에서 난간 쪽으로 걸으면 막혀서 떨어지지 않는다
  const w3 = walker(L, -3, -2, UP);
  for (let i = 0; i < 200; i++) w3.move(0, 0.05);
  assert.equal(w3.fy, UP); assert.ok(w3.z < 2, '난간에서 멈춤');
});

test('여러 층: 길 찾기·누르기 이동이 층을 건넌다(아래 → 위, 위 → 아래) + 다른 층의 같은 자리를 구분한다', () => {
  const { layout, zones, colliders } = model();
  const L = Logic.create(layout, { zones, colliders, reverence: false });
  const S = Stations.create(L);
  assert.equal(S.multi, true);
  assert.ok(S.isReachable(0, -5, UP) && S.isReachable(0, -5, 0), '같은 xz 의 두 층 모두 닿는다');
  assert.ok(!S.isReachable(4, 5.2, 0), '계단 밑 덩어리');
  const r1 = walkPath(L, S, { x: 0, z: -8, y: UP }, { x: -4.5, z: -5, y: 0 });
  assert.ok(r1 && r1.ok, '위 → 아래층 같은 자리 근처');
  assert.equal(r1.w.fy, 0);
  assert.ok(r1.w.maxJump <= RISE + 1e-9);
  assert.ok(r1.w.mid, '계단을 지나 내려간다');
  const r2 = walkPath(L, S, { x: -4.5, z: -5, y: 0 }, { x: 2, z: -8, y: UP });
  assert.ok(r2 && r2.ok && r2.w.fy === UP, '아래 → 위');
});

test('여러 층: 좌석·초·스테이션·가기(층) 목적지가 제 층을 갖는다', () => {
  const { layout, zones, colliders } = model();
  const L = Logic.create(layout, { zones, colliders, reverence: false });
  const S = Stations.create(L), st = S.stations();
  const u = L.seats.find((s) => s.g === 'U'), l = L.seats.find((s) => s.g === 'L' && s.x === u.x && s.z === u.z);
  assert.ok(l, '두 층에 같은 xz 좌석');
  assert.equal(L.seatPos(u.id).y, UP + 0.45); assert.equal(L.seatPos(l.id).y, 0.45);
  assert.equal(L.nearestSeat(u.x, u.z - 0.5, null, 1.3, UP), u.id, '위층에서는 위층 좌석');
  assert.equal(L.nearestSeat(u.x, u.z - 0.5, null, 1.3), u.id, '높이 없이 물으면 예전처럼');
  assert.notEqual(L.nearestSeat(u.x, u.z - 0.5, null, 1.3, 0), u.id, '아래층에서는 위층 좌석을 고르지 않는다');
  assert.equal(L.slots.filter((s) => s.fy === UP).length, 4);
  assert.equal(L.nearestCandleSlot(-4.4, 6, null, 1.8, UP), null, '아래층 초는 위층에서 안 잡힌다');
  assert.notEqual(L.nearestCandleSlot(-4.4, 6, null, 1.8, 0), null);
  assert.equal(st.levels.length, 2);
  assert.equal(st.levels[1].y, 0); assert.equal(st.levels[0].y, UP);
  assert.equal(S.station('level', 1).label, '아래층');
  assert.ok(st.candle.every((c) => c.y !== undefined));
  assert.equal(st.candle[1].y, 0);
  const r = walkPath(L, S, { x: 0, z: -8, y: UP }, S.station('level', 1));
  assert.ok(r && r.ok && r.w.fy === 0, '가기 → 아래층');
  const seatS = S.nearestFreeSeat({ x: -3, z: 6, y: 0 }, {});
  assert.ok(seatS && seatS.y === 0, '아래층에서 가까운 빈 자리 = 아래층 좌석');
});

test('한 층 성당: levels 가 없으면 yRef·y 인자를 무시한다(예전 빠른 길)', () => {
  const layout = { id: 'one', scalePercent: 100, bounds: { x0: -5, x1: 5, z0: -5, z1: 5 }, spawn: { x: 0, z: 4, r: 0 }, seatGroups: [{ g: 'A', rows: 1, perRow: 2, origin: { x: 1, z: 0 }, dx: 0.7, dz: 1.9, rowDx: 0, yaw: 0 }], candles: { stands: [] } };
  const zones = [{ x0: -1, x1: 1, z0: -5, z1: -3, y: 0.6 }];
  const colliders = [{ x0: -5, x1: 5, z0: 2.9, z1: 3.1, y0: 5, y1: 6 }];
  const L = Logic.create(layout, { zones, colliders, reverence: false });
  assert.equal(L.multi, false);
  assert.equal(L.floorY(0, -4, -10), 0.6); assert.equal(L.floorY(0, -4), 0.6);
  assert.ok(L.moveCircle({ x: 0, z: 3 }, 0, 0, undefined, 0), '한 층: 높이 범위가 있어도 막는다');
  assert.deepEqual(L.floorsAt(0, -4), [0.6]);
  assert.equal(Stations.create(L).multi, undefined);
});

// 계단식 줄(rowDy, 2026-11-22 여의도동 성가대석): 줄마다 바닥이 rowDy 만큼 오른다 — 좌석 바닥(fy)·앉는 높이·줄 충돌 띠 높이 범위가 그 줄의 단
test('여러 층: 계단식 줄(rowDy) — 줄마다 좌석 바닥과 줄 띠의 높이 범위가 한 단씩 오른다', () => {
  const zones = [{ x0: -6, x1: 6, z0: -10, z1: 10, y: 0 }];
  for (let r = 0; r < 3; r++) zones.push({ x0: -6, x1: 6, z0: -2 + 1.6 * r, z1: -0.4 + 1.6 * r, y: 3 + 0.3 * (r + 1) });
  const layout = {
    id: 'tiers', scalePercent: 100, ground: false, bounds: { x0: -6, x1: 6, z0: -10, z1: 10 }, spawn: { x: 0, z: -8, r: 0, y: 0 },
    levels: [{ id: 'A', label_ko: '아래', y: 0, go: { x: 0, z: -8 } }, { id: 'B', label_ko: '위', y: 3, go: { x: 0, z: -3 } }],
    seatGroups: [{ g: 'T', rows: 3, perRow: 2, origin: { x: -0.35, z: -1.15 }, dx: 0.7, dz: 1.6, rowDx: 0, yaw: 0, y: 3.3, rowDy: 0.3, frontal: false }],
    candles: { stands: [] }
  };
  const L = Logic.create(layout, { zones, colliders: [] });
  for (const s of L.seats) {
    assert.ok(Math.abs(L.seatFloor(s.id) - (3.3 + 0.3 * s.row)) < 1e-9, s.id);
    assert.ok(Math.abs(L.seatPos(s.id).y - (3.75 + 0.3 * s.row)) < 1e-9, s.id);
  }
  const band = (r) => L.colliders.find((c) => c.z0 <= -1.15 + 1.6 * r && c.z1 >= -1.15 + 1.6 * r);
  for (let r = 0; r < 3; r++) { const b = band(r); assert.ok(Math.abs(b.y0 - (3.25 + 0.3 * r)) < 1e-9 && Math.abs(b.y1 - (4.4 + 0.3 * r)) < 1e-9, '줄 ' + r + ' 띠 ' + b.y0 + '..' + b.y1); }
  // 줄 띠는 그 단의 사람만 막는다: 그 밑(아래층 0)은 지나간다
  assert.equal(L.moveCircle({ x: 0, z: -1.15 + 1.6 + 0.3 }, 0, 0, undefined, 0), false);
  assert.equal(L.moveCircle({ x: 0, z: -1.15 + 1.6 + 0.3 }, 0, 0, undefined, 3.6), true);
});
