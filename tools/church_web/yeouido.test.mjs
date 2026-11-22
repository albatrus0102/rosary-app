// 여의도동성당(ch_yeouido.js) 전용 시험: 설계서(docs/church/interiors/yeouido.md §6·§9.7·§9.8)의 좌표가 실제 빌더에서 그대로 나오는지.
//  2026-11-22 3차(여러 층 엔진 — scene_logic levels): 1층 로비(F1 −4.2) · 성당과 2층 로비(0) · 성가대석(3.75~5.15)을 같은 (x,z) 에 겹쳐 짓는다.
//  좌석 270(신랑 140 + 성가대석 'C' 15 + 'D' 115, 층별 바닥) · 스폰 → 1층 로비 → 곡선 계단 → 2층 로비 → 신랑 → 제대 앞을 누르기 이동으로 ·
//  성가대석 두 덩이 · 성가대석 밑(예전 닫힌 방 자리) · 계단참 밑 · 1층 → 2층 계단 밑(1층) · 한 걸음에 한 단 넘게 튀지 않음 · 겹친 층에서 떨어지지 않음 ·
//  층별 충돌체 · 카메라 리그가 다른 층(위층 바닥 너머)에 서지 않음 · 14처 14곳 · 전례 장식 12상태 · 성능 예산 · 권리 지킴.
//  2026-11-22 2차: 마름모 평면 + 경사 천장 + 버팀기둥 옆벽 + 부채꼴 4덩이 + 로비·곡선 계단·성가대석. 2026-11-16: 높은 드럼 + 기둥 6 + 반원 3단 제단 + 큰 둥근 피어.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');
const Guard = require('../../assets/church/cam_guard.js');

const here = path.dirname(fileURLToPath(import.meta.url));
const { churches, Kit, WayCross, Liturgy, CrossData } = loadChurches();
const c = churches.find((x) => x.id === 'yeouido');
const lay = c.layout, B = lay.bounds;
const L = Logic.create(lay, { colliders: c.colliders, zones: c.zones }), S = Stations.create(L), rv = L.reverence;
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const eq = (a, b, m) => assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m);
const Bd = c.builder, F1 = Bd.floors.F1, Lf = Bd.loft;
// 그 높이(y, 발)의 몸으로 서 있을 수 있나(여러 층: 그 층 충돌체만). y 없으면 그 자리 가장 높은 바닥 — 성당 바닥 높이의 것만 쓰는 옛 시험은 y = 0
const free = (x, z, y = 0) => !L.moveCircle({ x, z }, 0, 0, undefined, y);

// 누르기 이동(stations 경로 + main.js 와 같은 걷기: 발 높이 fy 로 moveCircle·floorY)으로 끝까지 걷는다(assisi.test.mjs 와 같은 방식)
function walkTo(from, to) {
  const p = S.findPath(from, to);
  if (!p) return { ok: false, why: 'nopath', pts: [] };
  const me = { x: from.x, z: from.z, fy: L.floorY(from.x, from.z, from.y === undefined ? 0 : from.y) }, w = S.startWalk(p, to, 'tap'), out = {}, pts = [];
  let maxJump = 0, minY = me.fy, maxY = me.fy;
  for (let t = 0; t < 300; t += 1 / 30) {
    S.stepWalk(w, me, 1 / 30, out);
    if (out.done) break;
    const q = { x: me.x, z: me.z };
    L.moveCircle(q, out.vx / 30, out.vz / 30, undefined, me.fy);
    const ny = L.floorY(q.x, q.z, me.fy);
    maxJump = Math.max(maxJump, Math.abs(ny - me.fy)); minY = Math.min(minY, ny); maxY = Math.max(maxY, ny);
    me.x = q.x; me.z = q.z; me.fy = ny; pts.push({ x: me.x, z: me.z, y: me.fy });
  }
  return { ok: Math.hypot(me.x - to.x, me.z - to.z) < 0.7, end: me, maxJump, minY, maxY, pts, len: p.len };
}
// 한 걸음에 오르내리는 높이: 성가대석 단(0.28) · 1층 → 2층 계단(0.15) · 2층 → 3층 계단(0.129) · 제단 계단(0.2) 중 가장 큰 것
const STEP_MAX = Math.max(Lf.tiers[1][2], -F1 / Bd.stairDown.n, Lf.top / Bd.stair.n, 0.2) + 0.02;
const SPAWN = { x: lay.spawn.x, z: lay.spawn.z, y: 0 };
// 계단 홀 타원 위 점(각 th 도, 비율 rho) — 두 곡선 계단은 rho 0.7…1.0 띠
const hallPt = (deg, rho = 0.85) => ({ x: Bd.stairHall.cx + rho * Bd.stairHall.a * Math.cos(deg * Math.PI / 180), z: Bd.stairHall.cz + rho * Bd.stairHall.b * Math.sin(deg * Math.PI / 180) });

test('yeouido: 레이아웃 — 여러 층(1층 로비 · 성당 = 2층 · 성가대석 = 3층), 좌석 270(신랑 부채꼴 140 + 성가대석 C 15 + D 115), 스폰은 예전 그대로(정문 안쪽, 성가대석 아래)', () => {
  assert.equal(lay.id, 'yeouido'); assert.equal(lay.scalePercent, 100); assert.equal(lay.ground, false);
  assert.deepEqual({ ...B }, { x0: -17, x1: 17, z0: -15.5, z1: 30.5 });
  assert.deepEqual([lay.spawn.x, lay.spawn.z, lay.spawn.r, lay.spawn.y], [0, 16.5, 0, 0]);
  assert.ok(L.multi);
  eq(lay.levels.map((l) => [l.id, l.y]), [['nave', 0], ['lobby1', F1], ['loft', Lf.y]]);
  assert.ok(near(F1, -4.2) && Bd.floors.slab > 0.2 && Bd.floors.slab < 0.5, '1층 바닥·2층 판');
  // 실제처럼 겹친다: 2층 로비 밑 = 1층 로비, 성가대석 밑 = 성당 바닥, 계단참 밑 = 2층(아래 계단 꼭대기로 가는 길) 밑 = 1층
  eq(L.floorsAt(-7.5, 26.5), [F1, 0], '2층 로비 밑 = 1층 로비');
  eq(L.floorsAt(-8, 17), [0, Lf.y + Lf.tiers[3][2]], '성가대석 왼쪽 덩이 밑 = 성당');
  eq(L.floorsAt(8.5, 17), [0, Lf.y + Lf.tiers[3][2]], '성가대석 오른쪽 덩이 밑 = 성당(예전 닫힌 방)');
  const Ld = Bd.landing; eq(L.floorsAt((Ld.x0 + Ld.x1) / 2, (Ld.z0 + Ld.z1) / 2), [F1, 0, Lf.top], '계단참 밑 = 2층, 그 밑 = 1층');
  const mid = hallPt(-40), fl = L.floorsAt(mid.x, mid.z);
  assert.ok(fl.length === 3 && fl[0] === F1 && fl[1] > F1 + 2 && fl[1] < 0 && fl[2] > 2, '계단 띠(높은 쪽): 1층 · 아래 계단 · 위 계단 ' + fl);
  assert.equal(L.seats.length, 270);
  const count = (g) => L.seats.filter((s) => s.g === g).length;
  assert.deepEqual(['L', 'R', 'OL', 'OR', 'C', 'D'].map(count), [42, 42, 28, 28, 15, 115]);
  const zs = [...new Set(L.seats.filter((s) => !/^[CD]/.test(s.g)).map((s) => +s.z.toFixed(2)))].sort((a, b) => a - b);
  assert.deepEqual(zs, [-1.3, 0.6, 2.5, 4.4, 6.3, 8.2, 10.1]);
  const firstX = (g, r) => Math.min(...L.seats.filter((s) => s.g === g && s.row === r).map((s) => Math.abs(s.x)));
  assert.ok(firstX('OR', 6) > firstX('OR', 0) + 1.0 && firstX('OL', 6) > firstX('OL', 0) + 1.0, '바깥 덩이는 줄마다 바깥으로(부채꼴)');
  for (const s of L.seats) {
    assert.ok(s.x > B.x0 && s.x < B.x1 && s.z > B.z0 && s.z < B.z1, s.id);
    assert.ok(/^(L|R|OL|OR|C|D)\d\d-\d+$/.test(s.id), s.id);
    const loft = /^[CD]$/.test(s.g), want = loft ? Lf.y + Lf.tiers[s.row + 1][2] : 0;
    assert.ok(near(L.seatFloor(s.id), want), s.id + ' 바닥 ' + L.seatFloor(s.id) + ' ≠ ' + want);
    assert.ok(near(L.seatPos(s.id).y, want + 0.45), s.id + ' 앉는 높이');
    if (loft) assert.ok(near(L.floorY(s.x, s.z, want), want), s.id + ' 의자 밑 단');
    const sp = L.standPos(s.id);
    assert.ok(free(sp.x, sp.z, want), s.id + ' 서는 자리가 막혔다');
    assert.ok(near(L.floorY(sp.x, sp.z, want), want), s.id + ' 서는 자리도 같은 단');
    assert.ok(S.isReachable(sp.x, sp.z, want), s.id + ' 서는 자리에 못 간다');
    assert.equal(L.nearestSeat(sp.x, sp.z, {}, undefined, want), s.id, s.id + ' 그 자리에서 이 좌석이 잡힌다');
  }
  // 같은 xz 의 다른 층에서는 좌석을 고르지 않는다(성가대석 의자 바로 밑 성당 바닥)
  const d = L.seats.find((s) => s.id === 'D02-10'), ds = L.standPos(d.id);
  assert.equal(L.nearestSeat(ds.x, ds.z, {}, undefined, 0), null, '성가대석 밑에서 위 좌석이 잡히면 안 된다');
  // 신자석 줄 충돌체는 그 줄의 단에서만(성가대석 밑 성당 사람을 막지 않는다)
  assert.ok(free(d.x, d.z + 0.3, 0), '성가대석 의자 밑(성당 바닥)은 걸을 수 있다');
  assert.ok(!free(d.x, d.z + 0.3, L.seatFloor(d.id)), '그 의자 줄(성가대석 단)은 막힌다');
  assert.equal(lay.candles.stands.length, 1, '봉헌초 = 성모상 앞 받침 하나(shrine.js)');
  assert.ok(lay.candles.stands[0].shrine);
});

test('yeouido: 걷기 — 스폰 → 1층 로비 → 곡선 계단 → 2층 로비 → 신랑 → 제대 앞, 누르기 이동으로 끝까지(한 걸음에 한 단 넘게 튀지 않음)', () => {
  assert.ok(free(SPAWN.x, SPAWN.z, 0), '스폰');
  const st = S.stations(), stair = hallPt(-20);
  const legs = [
    ['스폰 → 1층 로비', SPAWN, { x: -6.5, z: 25.6, y: F1 }, F1],
    ['1층 로비 → 1층 → 2층 계단 가운데', { x: -6.5, z: 25.6, y: F1 }, { x: stair.x, z: stair.z, y: L.floorY(stair.x, stair.z, -1.0) }, null],
    ['계단 가운데 → 2층 로비', { x: stair.x, z: stair.z, y: L.floorY(stair.x, stair.z, -1.0) }, { x: -7.5, z: 26.5, y: 0 }, 0],
    ['2층 로비 → 신랑', { x: -7.5, z: 26.5, y: 0 }, { x: 0, z: 6.0, y: 0 }, 0],
    ['신랑 → 제대 앞', { x: 0, z: 6.0, y: 0 }, st.altar, 0]
  ];
  for (const [what, from, to, y] of legs) {
    const r = walkTo(from, to);
    assert.ok(r.ok, `${what}: 끝까지 걷지 못한다 ${JSON.stringify(r.end || r.why)}`);
    if (y !== null) assert.ok(near(r.end.fy, y), `${what}: 끝 높이 ${r.end.fy}`);
    assert.ok(r.maxJump <= STEP_MAX, `${what}: 바닥이 튄다 ${r.maxJump.toFixed(3)}`);
    assert.ok(r.pts.every((q) => q.y > 0.1 || !rv.inZone(q.x, q.z, 0)), what + ' 가는 길이 제단 금지 구역을 지난다');
  }
  // 1층 로비까지 가는 길은 1층 → 2층 계단을 한 단씩 내려간다(중간 높이를 지난다), 입구 → 1층 → 입구 왕복
  const down = walkTo(SPAWN, { x: -6.5, z: 25.6, y: F1 });
  assert.ok(near(down.minY, F1) && near(down.maxY, 0) && down.pts.some((q) => q.y < -1.5 && q.y > -3), '계단을 지난다');
  const back = walkTo({ x: -6.5, z: 25.6, y: F1 }, SPAWN);
  assert.ok(back.ok && near(back.end.fy, 0) && back.maxJump <= STEP_MAX, '1층 로비에서 입구로');
  // 1층 → 2층 계단: 아래 끝(TH0 쪽)에서 위 끝(계단참 밑)까지 디딤이 한 단씩 오른다(F1 → 0), 2층 → 3층 계단은 0 → 계단참
  let pd = -1e9, pu = -1;
  for (let d = Bd.stair.th0 - 1; d >= Bd.stair.th1 + 1; d -= 2) {
    const p = hallPt(d), yd = L.floorY(p.x, p.z, pd < -1e8 ? F1 : pd), yu = L.floorY(p.x, p.z, pu < 0 ? 0 : pu);
    assert.ok(yd >= pd - 1e-9 && yd <= 0 + 1e-9, `아래 계단 ${d}° 높이 ${yd} < ${pd}`); pd = yd;
    assert.ok(yu >= pu - 1e-9, `위 계단 ${d}° 높이 ${yu} < ${pu}`); pu = yu;
    assert.ok(yu - yd > 4.0, `${d}°: 위 계단 밑면과 아래 계단 사이(머리 위) ${(yu - yd).toFixed(2)}`);
  }
  assert.ok(near(pd, 0, 0.2) && near(pu, Lf.top, 0.2), '계단 끝 높이 ' + pd + ' / ' + pu);
});

test('yeouido: 걷기 — 성가대석 두 덩이(오른쪽 C · 왼쪽 D, 3층)·계단참·로비 벽감·성모상 앞·옆 모서리까지, 돌아오기', () => {
  const st = S.stations(), Ld = Bd.landing, top = Lf.top;
  const goals = [
    ['제대 앞', st.altar, 0], ['왼쪽 옆 모서리', { x: -14.2, z: 0.4, y: 0 }, 0], ['오른쪽 옆 모서리', { x: 14.2, z: 0.4, y: 0 }, 0],
    ['2층 로비(유리 정면 쪽)', { x: -7.5, z: 26.5, y: 0 }, 0], ['벽감 성모상 앞', st.candle[0], 0], ['계단참', { x: (Ld.x0 + Ld.x1) / 2, z: (Ld.z0 + Ld.z1) / 2, y: top }, top],
    ['성가대석 오른쪽 통로', { x: (Lf.aisle.x0 + Lf.aisle.x1) / 2, z: 19.0, y: Lf.y + Lf.tiers[4][2] }, Lf.y + Lf.tiers[4][2]],
    ['성가대석 앞 띠(오른쪽)', { x: 7.0, z: Lf.z + 0.6, y: Lf.y }, Lf.y], ['성가대석 앞 띠(왼쪽 끝)', { x: -9.6, z: Lf.z + 0.55, y: Lf.y }, Lf.y],
    ['성가대석 왼쪽 덩이 맨 뒤 줄 끝', { x: -10.3, z: Lf.tiers[5][0] + 0.25, y: Lf.y + Lf.tiers[5][2] }, Lf.y + Lf.tiers[5][2]],
    ['성가대석 가운데 통로', { x: 5.65, z: 16.0, y: Lf.y + Lf.tiers[2][2] }, Lf.y + Lf.tiers[2][2]]
  ];
  for (const [what, g, y] of goals) {
    assert.ok(S.isReachable(g.x, g.z, y), what + ' 에 닿지 않는다');
    const r = walkTo(SPAWN, g);
    assert.ok(r.ok, `입구에서 ${what} 까지 걷지 못한다 ${JSON.stringify(r.end || r.why)}`);
    assert.ok(near(r.end.fy, y), `${what} 높이 ${r.end.fy}`);
    assert.ok(r.maxJump <= STEP_MAX, `${what} 가는 길에 바닥이 튄다 ${r.maxJump.toFixed(3)}`);
    const back = walkTo({ x: g.x, z: g.z, y }, SPAWN);
    assert.ok(back.ok && near(back.end.fy, 0) && back.maxJump <= STEP_MAX, `${what} 에서 입구로 돌아오지 못한다`);
  }
  // 성가대석에 올라 왼쪽 덩이 좌석에 앉을 수 있다(맨 왼쪽·가운데·오른쪽 끝)
  for (const id of ['D00-0', 'D02-11', 'D04-22', 'C04-2']) {
    const sp = L.standPos(id), y = L.seatFloor(id), r = walkTo(SPAWN, { x: sp.x, z: sp.z, y });
    assert.ok(r.ok && near(r.end.fy, y), id + ' 서는 자리까지 ' + JSON.stringify(r.end));
    assert.equal(L.nearestSeat(r.end.x, r.end.z, {}, undefined, r.end.fy), id, id + ' 앉기');
  }
});

test('yeouido: 성가대석 밑·계단참 밑·1층 → 2층 계단 밑 — 예전에 막았던 곳이 트여 걸을 수 있고, 머리 위 위층으로 뛰어오르지 않는다', () => {
  // 성가대석 밑 전체(예전 오른쪽 닫힌 방 x 5.3…11 · 왼쪽 큰 덩이 밑): 성당 바닥 0 으로 걸어 들어가 머문다
  for (const [x, z, what] of [[8.5, 17.0, '오른쪽 밑(예전 닫힌 방)'], [10.2, 20.3, '오른쪽 뒤 구석(오르간·통로 밑)'], [6.0, 13.0, '두 덩이 사이 밑'], [-9.6, 18.5, '왼쪽 뒤 구석']]) {
    assert.ok(free(x, z, 0) && S.isReachable(x, z, 0), what);
    const r = walkTo(SPAWN, { x, z, y: 0 });
    assert.ok(r.ok && r.maxY === 0 && r.minY === 0, `${what}: 성당 바닥으로만 ${JSON.stringify(r.end)}`);
  }
  // 왼쪽 ↔ 오른쪽: 맨 앞(제단 계단 앞)과 성가대석 밑 두 길로 건넌다
  for (const [from, to] of [[{ x: -9.5, z: -4.5 }, { x: 9.5, z: -4.5 }], [{ x: -9.5, z: 15 }, { x: 9.8, z: 16.5 }]]) assert.ok(walkTo(from, to).ok, `${from.x},${from.z} → ${to.x},${to.z}`);
  // 성가대석 밑을 오래 걸어도 위층(성가대석 단)으로 뛰어오르지 않는다
  const me = { x: -10, z: 14, fy: 0 };
  for (let i = 0; i < 400; i++) { const q = { x: me.x, z: me.z }; L.moveCircle(q, 0.05, (i % 80 < 40 ? 0.03 : -0.03), undefined, me.fy); me.x = q.x; me.z = q.z; me.fy = L.floorY(me.x, me.z, me.fy); assert.equal(me.fy, 0); }
  assert.ok(me.x > 9, '성가대석 밑을 끝까지 가로질렀다 x ' + me.x.toFixed(2));
  // 계단참 밑(예전 흰 벽 덩어리): 2층에서 걸어 들어가고, 그 길로 1층 → 2층 계단 꼭대기에 닿는다
  const Ld = Bd.landing, ul = { x: (Ld.x0 + Ld.x1) / 2, z: (Ld.z0 + Ld.z1) / 2, y: 0 };
  assert.ok(free(ul.x, ul.z, 0) && S.isReachable(ul.x, ul.z, 0), '계단참 밑');
  const r1 = walkTo({ x: -7.5, z: 26.5, y: 0 }, ul); assert.ok(r1.ok && r1.maxY === 0 && r1.minY === 0, '2층 로비 → 계단참 밑');
  const top = hallPt(-85, 0.85);
  assert.ok(L.floorY(top.x, top.z, 0) <= 0 && L.floorY(top.x, top.z, 0) > -0.5, '계단참 밑 옆 = 1층 → 2층 계단 꼭대기 디딤');
  // 1층 → 2층 계단의 높은 쪽 밑(1층): 1층 로비에서 걸어 들어가 그 밑에 머문다(머리 위 디딤 밑면 ≥ 2m), 낮은 쪽 밑은 흰 벽으로 막혀 있다
  const us = hallPt(-55, 0.85), hi = L.floorsAt(us.x, us.z);
  assert.ok(hi[0] === F1 && hi[1] - F1 >= Bd.stairDown.usw, '계단 밑 머리 위 높이 ' + hi);
  assert.ok(free(us.x, us.z, F1) && S.isReachable(us.x, us.z, F1), '계단 밑(1층)');
  const r2 = walkTo({ x: -6.5, z: 25.6, y: F1 }, { x: us.x, z: us.z, y: F1 });
  assert.ok(r2.ok && r2.maxY === F1 && r2.minY === F1, '1층 로비 → 계단 밑: 1층으로만 ' + JSON.stringify(r2.end));
  const lo = hallPt(20, 0.85);
  assert.ok(!S.isReachable(lo.x, lo.z, F1) || L.floorY(lo.x, lo.z, F1) > F1, '계단 낮은 쪽 밑(머리가 닿는 곳)은 1층에서 들어가지 못한다');
  // 1층 → 2층 계단 위를 걸어도 위 계단(2층 → 3층)으로 뛰어오르지 않는다: 아래 계단 꼭대기 = 0
  const wk = walkTo({ x: -6.5, z: 25.6, y: F1 }, { x: ul.x, z: ul.z, y: 0 });
  assert.ok(wk.ok && near(wk.end.fy, 0) && wk.maxY <= 1e-9 && wk.maxJump <= STEP_MAX, '1층 → 계단참 밑 ' + JSON.stringify(wk.end));
});

test('yeouido: 겹친 층에서 떨어지지 않는다 — 걸을 수 있는 칸 옆(0.25m)이 한 단보다 많이 낮으면 그 사이가 막혀 있다(우물·계단 띠·성가대석 난간·계단참)', () => {
  let n = 0;
  for (let x = B.x0 + 0.25; x < B.x1; x += 0.5) for (let z = B.z0 + 0.25; z < B.z1; z += 0.5) {
    for (const y of L.floorsAt(x, z)) {
      if (L.floorY(x, z, y) !== y || !free(x, z, y) || !S.isReachable(x, z, y)) continue;
      n++;
      for (const [dx, dz] of [[0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25]]) {
        const ny = L.floorY(x + dx, z + dz, y);
        if (y - ny > STEP_MAX + 1e-6) assert.ok(!free(x + dx, z + dz, y), `${x.toFixed(2)},${z.toFixed(2)} (y ${y}) 옆이 ${ny} 로 뚝 떨어지는데 막혀 있지 않다`);
      }
    }
  }
  assert.ok(n > 2500, '훑은 칸 ' + n);
  // 막힌 곳: 뒷벽(문 밖)·어두운 문·우물(2층)·후진 바깥·제대·감실·독서대·피어·성수대·마름모 벽 밖·로비 유리 정면 밖(두 층)
  for (const [x, z, y, what] of [[3.0, 21.2, 0, '뒷벽'], [6.2, 21.3, 0, '어두운 문'], [Bd.stairHall.cx, Bd.stairHall.cz, 0, '우물(2층)'], [-7, -12, 0, '왼쪽 후진 바깥'], [7, -12, 0, '오른쪽 후진 바깥'], [-5.2, -14.8, 0, '후진 원 밖'],
    [0, -8.9, 0, '제대'], [0, -13.4, 0, '감실'], [-2.75, -8.15, 0, '독서대'], [-7.55, -8.95, 0, '왼쪽 피어'], [7.55, -8.95, 0, '오른쪽 피어'], [-2.4, 20.45, 0, '성수대'], [-12.5, -5.0, 0, '앞 비스듬한 벽 밖'],
    [13.0, 15.0, 0, '곧은 옆벽 밖'], [-14.0, 24.0, 0, '로비 유리 정면 밖'], [-14.0, 24.0, F1, '1층 유리 정면 밖'], [0, 21.2, F1, '1층 뒷벽(2층 정문 밑)'], [Bd.stairHall.cx, Bd.stairHall.cz, F1, '1층 우물 밑 큰 화분'],
    [0, Lf.z - 0.05, Lf.y, '성가대석 앞 난간'], [Bd.loft.door.x0 + 0.5, 21.25, 0, '성가대석 문 밑 벽(2층)']]) assert.ok(!free(x, z, y), what);
  for (const [x, z] of [[-6.5, -11], [6.5, -11], [-5.2, -14.8]]) assert.ok(!S.isReachable(x, z, 0), `${x},${z} 에 닿는다`);
  // 층별 충돌체: 2층 로비 가구·우물 난간은 1층 사람을, 성가대석 난간·오르간은 성당 사람을 막지 않는다
  assert.ok(free(-9.2, 22.9, F1) && !free(-9.2, 22.9, 0), '2층 탁자 밑 = 1층 로비');
  assert.ok(free(Bd.stairHall.cx - 1.7, Bd.stairHall.cz, F1), '2층 우물 난간 밑 = 1층');
  assert.ok(free(10.2, 12.9, 0) && !free(10.2, 12.9, Lf.y), '오르간 밑 = 성당');
  // 제단 높이 0.6(3단), 신자석 홀은 0, 계단 끝 틈 없음(0.1m 격자)
  assert.ok(near(L.floorY(0, -8.0, 0.6), 0.6)); assert.ok(near(L.floorY(0, -4.0, 0), 0));
  const y = L.floorY(0, -6.0, 0); assert.ok(y > 0.1 && y < 0.6, '계단 단 ' + y);
  assert.ok(near(L.floorY(0, -5.2, 0), 0) && L.floorY(0, -5.5, 0) > 0.1, '축 위 첫 계단');
  assert.ok(near(L.floorY(4.2, -6.5, 0), 0) && near(L.floorY(4.2, -7.6, 0.6), 0.6), 'x 4.2 의 둥근 앞 가장자리');
  for (let x = -8; x <= 8; x += 0.1) for (let z = -10; z <= -5; z += 0.1) if (free(x, z, 0) && S.isReachable(x, z, 0)) assert.ok(L.floorY(x, z, 0) < 0.01, `계단 끝 틈 ${x.toFixed(1)},${z.toFixed(1)}`);
  assert.ok(c.colliders.length <= 420, '충돌체 ' + c.colliders.length);
});

test('yeouido: 제단 출입 금지 구역 — 제단·후진(제대·감실·십자가)은 막고, 제대 앞 자리는 첫 계단 앞', () => {
  assert.ok(rv && rv.zone, '구역');
  for (const [x, z, what] of [[0, -8.9, '제대'], [0, -13.4, '감실'], [-2.75, -8.15, '독서대'], [2.05, -11.25, '사제석'], [0, -14.8, '후진 끝'], [-6.4, -9.2, '제단 왼쪽 끝 계단'], [6.4, -9.2, '제단 오른쪽 끝 계단']]) assert.ok(rv.inZone(x, z, 0) || !free(x, z), `${what} (${x},${z}) 가 구역 밖`);
  const st = S.stations();
  assert.equal(st.altar.how, 'axis');
  assert.ok(near(st.altar.x, 0), JSON.stringify(st.altar));
  assert.ok(st.altar.z > -5.4 && st.altar.z < -3.9, '제대 앞 자리 z ' + st.altar.z + '(첫 계단 -5.4 앞, 맨 앞줄 -3.8 뒤)');
  assert.ok(near(L.floorY(st.altar.x, st.altar.z), 0), '제대 앞 자리는 신자석 바닥 높이');
  assert.ok(!rv.inZone(st.altar.x, st.altar.z, 0.2));
  // 피어 바깥(|x| > 9)과 성모상 자리는 신자가 걷는 곳. 구역 폭은 표(reverence_places.js)로 반원 제단 끝까지
  for (const x of [-9.5, 9.5]) assert.ok(!rv.inZone(x, -8, 0.3), '피어 옆 ' + x);
  assert.ok(rv.zone.halfW > 6 && rv.zone.halfW < 6.5, 'halfW ' + rv.zone.halfW);
});

test('yeouido: 스테이션 — 봉헌초 = 로비 벽감의 성모상(Meshy 3D 성모상) 앞 나무 초 받침, 성수대 기도 자리는 없다', () => {
  const st = S.stations();
  assert.equal(st.candle.length, 1);
  const k = st.candle[0], N = Bd.niche;
  assert.ok(k.shrine && near(k.x, N.x, 0.3) && k.z > 22.6 && k.z < 24.2, JSON.stringify(k));
  assert.ok(S.free(k.x, k.z) && S.isReachable(k.x, k.z));
  assert.ok(near(L.floorY(k.x, k.z), 0), '로비 바닥');
  assert.notEqual(L.nearestCandleSlot(k.x, k.z, null), null);
  assert.equal(L.slots.length, 14);
  assert.equal(st.font.length, 0);
  const P = require('../../assets/church/shrine_places.js').yeouido;
  assert.equal(P.kind, 'existing'); assert.equal(P.mesh, 'mary_meshy'); assert.equal(P.yaw, 0); assert.equal(P.stand, 'wood'); assert.equal(P.kneeler, false);
  assert.ok(near(P.x, N.x) && near(P.altar_h, N.y0), '성상은 벽감 턱 위');
  assert.ok(P.z + P.altar_d > 21.0 && P.z + P.altar_d < 21.5, '성상이 벽감(뒷벽 로비 쪽 반) 안');
  assert.ok(!free(N.x, 21.3), '벽감 벽');
  assert.ok(free(-7.6, -6.6), '예전 자리(신랑 제단 앞 왼쪽)에는 받침이 없다');
});

test('yeouido: 십자가의 길 14곳 = 성가대석 앞 난간의 부조 판 자리(그림 판은 그리지 않음), 서는 자리는 난간 아래 신랑 바닥, 푸겔 연작', () => {
  const r = WayCross.derive({ layout: lay, logic: L, stations: S, walls: c.walls, windows: c.windows, roses: c.roses, glassSlots: c.glassSlots });
  assert.equal(r.why, 'ok');
  assert.equal(r.plaques.length, 14);
  assert.equal(lay.crossWay.panels, false);
  const R = Bd.relief;
  r.plaques.forEach((p, i) => {
    assert.ok(near(p.x, R.x[i]) && near(p.z, Bd.loft.z - 0.2) && near(p.y, R.y), p.n + '처 자리');
    assert.ok(p.nz < -0.99, p.n + '처 신랑 쪽을 본다');
    assert.ok(S.free(p.stand.x, p.stand.z) && S.isReachable(p.stand.x, p.stand.z), p.n + '처 서는 자리');
    assert.ok(near(L.floorY(p.stand.x, p.stand.z), 0), p.n + '처 서는 자리 = 신랑 바닥');
  });
  assert.ok(r.plaques[0].x > r.plaques[13].x, '1처 = 신랑에서 볼 때 왼쪽(+x) 끝');
  for (let i = 1; i < 14; i++) assert.ok(r.plaques[i].x < r.plaques[i - 1].x);
  assert.equal(CrossData.series.churches.yeouido, 'fugel');
});

test('yeouido: 창 13(정면 색유리 2 + 로비 색유리 벽 2층 3·1층 2 + 로비 유리 정면 2층 3·1층 3) — 권리 있는 자리는 추상 색면만, 유리 정면은 맑은 유리, 사진 창·장미창·빛줄기 없음', () => {
  assert.equal(c.windows.length, 13);
  const front = c.windows.filter((w) => near(w.z, -10));
  assert.equal(front.length, 2);
  for (const w of front) {
    assert.ok(w.pattern === 'lancet' && w.top === 'flat' && !w.photo && w.beam === false && w.glass === 'yeouido_abstract');
    assert.ok(Math.abs(w.x) - w.w / 2 >= 5.5 - 1e-6 && Math.abs(w.x) + w.w / 2 <= 6.6, '창 x ' + w.x);
  }
  const GEN = require('../../assets/church/glass_gen.js');
  const lob = c.windows.filter((w) => w.z > 30);
  assert.equal(lob.length, 5);
  assert.equal(lob.filter((w) => w.y < 0).length, 2, '1층 색유리 2폭');
  for (const w of lob) { assert.equal(w.glass, 'yeouido_lobby'); const St = GEN.STYLES[w.glass]; assert.ok(St.body === 'abstract' && St.head === 'abstract', '로비 색유리 = 추상 색면(생존 작가 작품 — 옮기지 않음)'); }
  const gf = c.windows.filter((w) => w.x < -10.5 && w.z > 21);
  assert.equal(gf.length, 6);
  assert.equal(gf.filter((w) => w.y < 0).length, 3, '1층 유리 정면 3폭');
  for (const w of gf) for (const col of w.colors) {
    const r = (col >> 16) & 255, g = (col >> 8) & 255, b = col & 255;
    assert.ok(Math.max(r, g, b) - Math.min(r, g, b) < 30 && Math.min(r, g, b) > 200, '맑은 유리 ' + col.toString(16));
  }
  assert.equal(c.roses.length, 0); assert.equal(c.glassSlots.length, 0);
  assert.equal(c.ctx._.beams.length, 0);
  const src = fs.readFileSync(path.resolve(here, '../../assets/church/ch_yeouido.js'), 'utf8');
  assert.ok(!/https?:\/\//.test(src) && !/loadTexture|glassPhoto|glassSlot\(|statue\(|statueNiche/.test(src), '사진·외부 그림·성상 도형을 쓰지 않는다');
  assert.ok(!fs.existsSync(path.resolve(here, '../../assets/church/tex_pack_yeouido.js')), '전용 사진 묶음 없음(절차 생성)');
});

test('yeouido: 전례 장식 — 상태 12개가 제단 위 자리에 놓이고 스테이션·14처를 바꾸지 않는다', () => {
  const P = Liturgy.PLACES.yeouido;
  assert.deepEqual([P.altar.x, P.altar.z, P.altar.y], [0, -8.9, 0.6]);
  const STATES = {
    advent1: { season: 'advent', color: 'violet', week: 1 }, advent3: { season: 'advent', color: 'rose', week: 3 }, advent4: { season: 'advent', color: 'violet', week: 4 },
    christmas: { season: 'christmas', color: 'white', feast: 'christmas' }, lent: { season: 'lent', color: 'violet' }, laetare: { season: 'lent', color: 'rose', week: 4 },
    goodfriday: { season: 'triduum', color: 'red', feast: 'goodFriday' }, easter: { season: 'easter', color: 'white', feast: 'easter' }, pentecost: { season: 'easter', color: 'red', feast: 'pentecost' },
    ordinary: { season: 'ordinary', color: 'green' }, souls: { season: 'ordinary', color: 'violet', memorial: true }, allsaints: { season: 'ordinary', color: 'white', memorial: true, feast: 'allSaints' }
  };
  const st = S.stations();
  for (const n of Object.keys(STATES)) {
    const pl = Liturgy.plan('yeouido', STATES[n]);
    assert.ok(pl.items.length >= 1, n);
    for (const it of pl.items) {
      assert.ok(it.z < -6.6 && it.z > -15.5 && Math.abs(it.x) < 7.2, `${n} ${it.kind} 제단 위`);
      if (it.kind !== 'veil') assert.ok(near(it.y, 0.6), `${n} ${it.kind} 높이 ${it.y}`);
    }
    const L2 = Logic.create(lay, { colliders: c.colliders.concat(pl.colliders), zones: c.zones }), S2 = Stations.create(L2), st2 = S2.stations();
    assert.ok(near(st2.altar.x, st.altar.x) && near(st2.altar.z, st.altar.z), n + ' 제대 앞');
    const r2 = WayCross.derive({ layout: lay, logic: L2, stations: S2, walls: c.walls, windows: c.windows, roses: c.roses, glassSlots: c.glassSlots });
    assert.equal(r2.plaques.length, 14, n);
  }
  const v = Liturgy.plan('yeouido', STATES.lent).items.find((i) => i.kind === 'veil');
  assert.deepEqual([v.x, v.y, v.z, v.h], [0, 5.4, -14.14, 2.2], '가림천 = 드럼의 인물상 자리 표시');
});

test('yeouido: 성능 예산(고화질 빌드) — 묶음 메시·삼각형·점광원 1·스프라이트 0·반사 바닥 0', () => {
  const ctx = Kit.createContext({ layout: lay, quality: 'high' });
  c.builder.build(ctx);
  const items = ctx._prepare();
  let tris = 0;
  for (const it of items) tris += it.batch.p.length / 9;
  let own = 0;
  ctx.root.traverse((o) => { if (o.isMesh) { own++; tris += o.geometry.attributes.position.count / 3; } });
  const meshes = items.length + own;
  assert.equal(own, 0, '전용 메시 없음: 모두 kit 묶음');
  assert.equal(ctx.stats.meshes, 0, 'ctx.plane·ctx.mesh 를 쓰지 않는다');
  assert.ok(meshes <= 16, '빌더 메시 ' + meshes);   // 2026-11-22 로비·계단·성가대석·경사 천장을 더해 14 → 16(벽돌 타일·흰 미장 묶음). 3차(1층 로비·두 번째 계단)도 묶음을 늘리지 않는다
  assert.ok(tris <= 70000, '삼각형 ' + tris);         // 같은 때 약 29k → 약 50k(로비·계단 홀·성가대석 줄·버팀기둥·샹들리에 6) → 3차 약 6만(1층 로비·1층 → 2층 계단·성가대석 왼쪽 덩이 의자)
  assert.ok(tris >= 15000, '삼각형이 너무 적다(빌드가 비었나) ' + tris);
  assert.equal(ctx._.lights.length, 1, '점광원 1개');
  assert.equal(ctx._.glows.length + ctx._.flames.length, 0, '스프라이트(개별 draw call) 없음: 빛은 발광 면으로');
  assert.equal(ctx._.floors.length, 0, '바닥 반사 없음');
  assert.ok(ctx._.cameraBounds && ctx._.cameraBounds.yMax <= 9, '카메라 yMax(천장 10m 아래)');
  const lo = Kit.createContext({ layout: lay, quality: 'low' });
  c.builder.build(lo);
  let lt = 0; for (const it of lo._prepare()) lt += it.batch.p.length / 9;
  assert.ok(lt < tris, 'low ' + lt + ' < high ' + tris);
  console.log(`# yeouido 고화질: 빌더 메시 ${meshes}(묶음 ${items.length} + 전용 ${own}), 삼각형 ${Math.round(tris)}, 충돌체 ${ctx._.colliders.length} / 간단: 삼각형 ${Math.round(lt)}`);
});


test('yeouido: 카메라 리그 — 성가대석 밑·계단 위·계단 밑·1층 로비에서 360° 돌려도 다른 층(위층 바닥 너머)에 서지 않고 실내에 선다', () => {
  if (c.ret && c.ret.group) c.ctx.root.add(c.ret.group);
  const items = c.prepare();
  items.forEach((it) => c.ctx.root.add(it.batch.build(it.material, it.name, { spatial: true })));
  const cb0 = c.ctx._.cameraBounds, cb = { x0: cb0.x0, x1: cb0.x1, z0: cb0.z0, z1: cb0.z1, yMax: cb0.yMax, pitchMax: cb0.pitchMax };
  assert.ok(cb.pitchMax > 0.8 && cb.pitchMax < 1.05, '계단 홀에서 거의 바로 위로 올라가지 않게(올림 상한)');
  const so = Guard.spaceOpts(L, lay, c.zones); so.spaceTop = cb.yMax;
  assert.ok(near(so.levelLow, F1), '카메라 공간은 1층 바닥부터');
  eq(so.levelYs, [0, Lf.y], '층 칸막이 = 2층 바닥 · 성가대석 바닥');
  const g = Guard.build(c.ctx.root, { bounds: cb, yLow: so.levelLow + 1.05, see: false, ...so });
  assert.ok(g.space && g.space.reachable > 1000 && g.partitions.every((n) => n > 500), '공간·칸막이 ' + JSON.stringify(g.partitions));
  const spots = [['성가대석 밑 오른쪽', 8.5, 17.0, 0], ['성가대석 밑 왼쪽', -6.0, 16.0, 0], ['스폰', 0, 16.5, 0], ['성가대석 왼쪽 덩이', -4.5, Lf.z + 0.55, Lf.y],
    ['2층 → 3층 계단 가운데', ...Object.values(hallPt(0)), null], ['1층 → 2층 계단 가운데', ...Object.values(hallPt(-20)), null], ['1층 → 2층 계단 아래쪽', ...Object.values(hallPt(50)), null], ['1층 → 2층 계단 20°', ...Object.values(hallPt(20)), null], ['1층 → 2층 계단 −60°', ...Object.values(hallPt(-60)), null],
    ['1층 → 2층 계단 밑(1층)', ...Object.values(hallPt(-55, 0.82)), F1], ['계단참 밑(2층)', 9.3, 22.2, 0], ['1층 로비', -6.5, 25.6, F1], ['2층 로비', -6.5, 25.6, 0]];
  let n = 0, other = 0, out = 0, fp = 0, high = 0, thru = 0; const bad = [], fpAt = {};
  for (const [what, x, z, y0] of spots) {
    const fy = y0 === null ? L.floorY(x, z, what.startsWith('1층') ? -1.0 : 2.0) : y0;
    assert.ok(free(x, z, fy), what + ' 서는 자리');
    for (let k = 0; k < 12; k++) for (const pitch of [0.06, 0.45]) {
      n++;
      const rig = Guard.createRig(), O = {}, I = { mx: x, fy: fy + 1.0, mz: z, yaw: k * Math.PI / 6, pitch, D: 7.2, cb, guard: g, auto: true };
      for (let f = 0; f < 3; f++) rig.solve(I, 1 / 30, O);
      if (O.fpOn) { fp++; fpAt[what] = (fpAt[what] || 0) + 1; continue; }
      const cy = Math.min(cb.yMax, Math.max(fy + 0.7, O.y));
      // 다른 층: 머리 → 카메라 선이 그 사람의 층이 아닌 걷는 바닥 구역(층 바닥 높이)을 지난다(기하가 아닌 다른 출처로 잰다)
      for (const h of [0, Lf.y]) {
        if (Math.abs(h - fy) < 0.05) continue;
        const ay = fy + 1.0; if ((ay < h) === (cy < h)) continue;
        const t = (h - ay) / (cy - ay), hx = x + (O.x - x) * t, hz = z + (O.z - z) * t;
        if (L.floorsAt(hx, hz).some((f) => Math.abs(f - h) < 0.05)) { other++; if (bad.length < 4) bad.push(`${what} yaw${k * 30} → (${O.x.toFixed(1)},${cy.toFixed(1)},${O.z.toFixed(1)})`); break; }
      }
      // 위층 바닥 위에 선 카메라(우물·계단 띠 같은 구멍으로 올라간 경우 — 선이 층 바닥을 지나지 않아도 다른 층이다)
      if (L.floorsAt(O.x, O.z).some((f) => f > fy + 1.0 && f < cy)) { other++; if (bad.length < 4) bad.push(`위층 바닥 위 ${what} yaw${k * 30} → (${O.x.toFixed(1)},${cy.toFixed(1)},${O.z.toFixed(1)})`); continue; }
      // 걷는 바닥(계단 디딤·성가대석 단 포함)을 지나 선 카메라: 겹친 계단에서 아래 계단 → 위 계단 너머 등(층 칸막이만으로는 못 막던 것)
      for (let u = 0.05, py = fy + 1.0; u <= 1.0001; u += 0.05) {
        const qx = x + (O.x - x) * u, qy = fy + 1.0 + (cy - fy - 1.0) * u, qz = z + (O.z - z) * u;
        if (L.floorsAt(qx, qz).some((f) => f > Math.min(py, qy) + 0.02 && f < Math.max(py, qy) - 0.02 && Math.abs(f - fy) > 0.4)) { thru++; if (bad.length < 4) bad.push(`바닥 너머 ${what} yaw${k * 30}`); break; }
        py = qy;
      }
      if (!g.space.at(O.x, cy, O.z)) out++;
      if (O.pitch > 1.0) high++;   // 올림 상한(pitchMax) 위 — 0 이어야 한다
    }
  }
  assert.equal(other, 0, `다른 층에 선 카메라 ${other}/${n}: ${bad.join('; ')}`);
  assert.ok(out <= n * 0.02, `카메라 공간 밖 ${out}/${n}`);
  // 1인칭: 위 계단 바로 밑을 지나는 아래 계단 가운데(머리 위 위 계단, 옆은 2층 판)에서 몇 방향은 3인칭 자리가 없다 — 좁은 겹친 계단이라 받아들인다
  assert.ok(fp <= n * 0.07, `1인칭 ${fp}/${n} ${JSON.stringify(fpAt)}`);
  assert.equal(high, 0, '거의 바로 위에서 내려다보는 카메라');
  assert.ok(thru <= n * 0.01, `걷는 바닥(계단 디딤) 너머에 선 카메라 ${thru}/${n}: ${bad.join('; ')}`);
  console.log(`# yeouido 카메라 리그: 표본 ${n}, 다른 층 ${other}, 바닥 너머 ${thru}, 공간 밖 ${out}, 1인칭 ${fp}, 높이 내려다보기(pitch > 1.0) ${high}, 1인칭 자리 ${JSON.stringify(fpAt)}`);
});

