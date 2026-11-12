// 스테이션 유도 + 걷기 경로 탐색 시험. 8개 성당 전부(실제 빌더의 충돌체)에서 입구 -> 모든 스테이션이 닿는지 확인하고 표를 출력한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');
const Layouts = require('../../assets/church/layouts.js');

const { churches } = loadChurches();
const mk = (c) => { const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones }); return { L, S: Stations.create(L) }; };

// main.js 의 걷기와 같은 물리(관성 + moveCircle)로 경로를 따라간다. {ok, t, pos, stuck}
function simulate(L, S, from, path, target) {
  const me = { x: from.x, z: from.z, vx: 0, vz: 0 }, p = { x: 0, z: 0 }, out = {};
  const w = S.startWalk(path, target, 'x');
  const dt = 1 / 30;
  let t = 0, stuck = 0;
  while (t < 150) {
    S.stepWalk(w, me, dt, out);
    if (out.stuck) stuck++;
    if (out.done) return { ok: true, t, pos: { x: me.x, z: me.z }, stuck };
    const k = Math.min(1, dt * 12);
    me.vx += (out.vx - me.vx) * k; me.vz += (out.vz - me.vz) * k;
    p.x = me.x; p.z = me.z;
    L.moveCircle(p, me.vx * dt, me.vz * dt);
    me.x = p.x; me.z = p.z;
    t += dt;
  }
  return { ok: false, t, pos: { x: me.x, z: me.z }, stuck };
}

const rows = [];

for (const c of churches) {
  test(`stations ${c.id}: derived, free, reachable from spawn`, () => {
    const { L, S } = mk(c);
    const st = S.stations();
    const sp = c.layout.spawn;
    assert.deepEqual([st.entrance.x, st.entrance.z], [sp.x, sp.z]);
    assert.equal(st.candle.length, c.layout.candles.stands.length, 'one candle station per stand');
    for (const k of st.candle) {
      assert.ok(S.free(k.x, k.z), 'candle approach collides');
      assert.ok(S.isReachable(k.x, k.z), 'candle approach unreachable');
      assert.notEqual(L.nearestCandleSlot(k.x, k.z, null), null, 'no slot in reach at approach');
      const d = Math.hypot(k.x - k.stand.x, k.z - k.stand.z);
      assert.ok(d >= 0.5 && d <= 1.9, 'approach distance ' + d);
    }
    // 제대: 축 위의 닿는 점이고, 그 앞(제대 쪽)으로 더 걸을 수 없다
    const a = st.altar;
    assert.ok(S.free(a.x, a.z) && S.isReachable(a.x, a.z), 'altar free+reachable');
    assert.ok(Math.abs(a.x - sp.x) < 1.3, 'altar near the nave axis x=' + a.x);
    assert.ok(Math.abs(a.yaw - (c.layout.seatGroups[0].yaw || 0)) < 1e-9, 'altar faces the seat direction');
    assert.ok(a.z < sp.z - 15, 'altar is far from the entrance, z=' + a.z);
    // 축을 따라 한 칸(0.25m) 더 가면 막힌다(= 가장 먼 지점)
    if (a.how === 'axis') {
      const f = Logic.fwd(a.yaw), nx = a.x + f[0] * 0.25, nz = a.z + f[1] * 0.25;
      assert.ok(!S.free(nx, nz) || nz < c.layout.bounds.z0 || nz > c.layout.bounds.z1, 'altar is the farthest axis point');
    }
    assert.equal(st.font.length, 0, 'no fonts unless the layout lists them');
  });

  test(`paths ${c.id}: spawn reaches every station and the walk arrives`, () => {
    const { L, S } = mk(c);
    const st = S.stations(), sp = c.layout.spawn;
    const targets = [['entrance', st.entrance], ['altar', st.altar]].concat(st.candle.map((k, i) => ['candle' + (st.candle.length > 1 ? i : ''), k]));
    const seat = S.nearestFreeSeat(sp, {});
    assert.ok(seat, 'a free seat exists');
    targets.push(['seat', seat]);
    for (const [name, tg] of targets) {
      const path = S.findPath(sp, tg);
      assert.ok(path, `${c.id} ${name}: no path`);
      const sim = simulate(L, S, sp, path, tg);
      assert.ok(sim.ok, `${c.id} ${name}: walk did not arrive (${JSON.stringify(sim)})`);
      assert.ok(Math.hypot(sim.pos.x - tg.x, sim.pos.z - tg.z) < 0.3);
      assert.ok(sim.t < path.len / 2.0 + 6, `${c.id} ${name}: too slow ${sim.t} for ${path.len}`);
      rows.push({ church: c.id, station: name, 'path m': +path.len.toFixed(1), waypoints: path.pts.length, 'walk s': +sim.t.toFixed(1), cell: path.cell });
    }
  });

  test(`paths ${c.id}: every seat's aisle spot is reachable; candle/seat arrival triggers near`, () => {
    const { L, S } = mk(c);
    const sp = c.layout.spawn;
    let n = 0;
    for (const s of L.seats) {
      const tg = S.seatStation(s.id);
      const path = S.findPath(sp, tg);
      assert.ok(path, `${c.id} ${s.id}: no path`);
      n++;
    }
    assert.equal(n, L.seats.length);
    // 좌석 도착 지점에서 nearSeat 가 그 좌석(또는 같은 줄 이웃)을 가리킨다
    const seat = S.nearestFreeSeat(sp, {});
    assert.equal(L.nearestSeat(seat.x, seat.z, {}), seat.id);
    // 한 곳에서 가장 가까운 좌석들이 차 있으면 다른 좌석을 고른다
    const taken = {};
    for (let i = 0; i < 6; i++) { const s2 = S.nearestFreeSeat(sp, taken); taken[s2.id] = 1; }
    assert.equal(Object.keys(taken).length, 6, 'six distinct seats');
  });
}

test('path length table (church x station, meters from spawn)', () => {
  const byChurch = {};
  for (const r of rows) (byChurch[r.church] ||= {})[r.station] = r['path m'];
  const cols = ['entrance', 'altar', 'candle', 'candle0', 'candle1', 'seat'];
  console.log('\nchurch       ' + cols.map((c) => c.padStart(8)).join(''));
  for (const id of Object.keys(byChurch)) console.log(id.padEnd(13) + cols.map((c) => String(byChurch[id][c] ?? '-').padStart(8)).join(''));
  console.table(rows);
  assert.equal(Object.keys(byChurch).length, churches.length);
});

test('unreachable target returns null (walled-off room)', () => {
  const lay = JSON.parse(JSON.stringify(Layouts.basic));
  const L = Logic.create(lay, { colliders: [{ x0: 5, x1: 5.6, z0: -20, z1: 20 }] }); // 성당을 둘로 가르는 벽
  const S = Stations.create(L);
  assert.equal(S.findPath({ x: 0, z: 17 }, { x: 9, z: 0 }), null);
  assert.ok(S.findPath({ x: 0, z: 17 }, { x: -3, z: 0 }));
  assert.equal(S.isReachable(9, 0), false);
});

test('fonts: layout.fonts yields a font station with an approach point facing it', () => {
  const lay = JSON.parse(JSON.stringify(Layouts.basic));
  lay.fonts = [{ x: -10.8, z: 18.2 }];
  const L = Logic.create(lay, { colliders: [{ x: -10.8, z: 18.2, r: 0.4 }] });
  const S = Stations.create(L);
  const f = S.stations().font;
  assert.equal(f.length, 1);
  assert.ok(S.free(f[0].x, f[0].z) && S.isReachable(f[0].x, f[0].z));
  const d = Math.hypot(f[0].x + 10.8, f[0].z - 18.2);
  assert.ok(d > 0.6 && d < 1.4, 'distance ' + d);
  const toFont = Stations.yawToward(f[0].x, f[0].z, -10.8, 18.2);
  assert.ok(Math.abs(f[0].yaw - toFont) < 1e-9);
  assert.ok(S.findPath(lay.spawn, f[0]));
  assert.equal(S.station('font', undefined, lay.spawn), f[0]);
});

test('station() picks the closest candle stand by walking distance', () => {
  const c = churches.find((x) => x.id === 'milan');
  const { S } = mk(c);
  const left = S.stations().candle[0];
  const near = S.station('candle', undefined, { x: left.x, z: left.z + 3 });
  assert.equal(near.index, 0);
  assert.equal(S.station('candle', 1).index, 1);
  assert.equal(S.station('font'), null);
});

test('layout.stations override replaces the derived altar', () => {
  const lay = JSON.parse(JSON.stringify(Layouts.basic));
  lay.stations = { altar: { x: 3, z: -5 } };
  const S = Stations.create(Logic.create(lay, {}));
  assert.deepEqual([S.stations().altar.x, S.stations().altar.z], [3, -5]);
});

test('grid path hugs corridors: bench rows are crossed only through the aisle', () => {
  const c = churches.find((x) => x.id === 'basic');
  const { L, S } = mk(c);
  // 왼쪽 벽쪽 통로(-10.5, 8)에서 오른쪽 벽쪽 통로(10.5, 8)로: 중앙 통로를 지나야 한다
  const path = S.findPath({ x: -10.5, z: 8 }, { x: 10.0, z: 8 });
  assert.ok(path);
  for (let i = 1; i < path.pts.length; i++) assert.ok(S.lineClear(path.pts[i - 1], path.pts[i]), 'segment ' + i + ' is clear');
  assert.ok(path.len >= 20.5);
  void L;
});
