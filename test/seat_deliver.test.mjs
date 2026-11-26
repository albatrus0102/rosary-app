// 앉기(측정 원인 1~6)·자리로 가져다 주기·길 찾기 — 순수 로직은 Node, 끝까지는 실브라우저(tools/sit_probe·deliver_probe 가 프레임마다 잰다)
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, house, penetration } from './lib/load.mjs';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ST = require('../web/stations.js');
const g = load('coffee.js');
const C = g.RoomCoffee;
const { layout, colliders, logic } = house();
const free = (x, z, r) => colliders.every((c) => penetration(c, x, z, r) <= 1e-6);

test('좌석 자리: 서는 자리는 좌석 옆·앞(등받이 뒤가 아님), 비어 있고, 좌석 맞춤(seatFit)은 앉는 면 + 0.085', () => {
  layout.seats.forEach((s, i) => {
    const id = logic.seatAt(i), st = logic.standPos(id), f = [-Math.sin(s.yaw), -Math.cos(s.yaw)];
    const back = (st.x - s.x) * f[0] + (st.z - s.z) * f[1];   // 앞(+) / 뒤(-)
    assert.ok(back > -0.1, 'seat ' + i + ' stand point is not behind the chair (' + back.toFixed(2) + ')');
    assert.ok(free(st.x, st.z, 0.3), 'stand point free ' + i);
    const fit = logic.seatFit(id);
    assert.ok(fit && Math.abs(fit.hip - (s.top + 0.085 - logic.seatFloor(id))) < 1e-9);
  });
  assert.ok(Math.abs(layout.seats[3].top - (0.16 + 0.63)) < 1e-9, 'bar stool seat 0.63');
  assert.ok(Math.abs(layout.plan.counter.top - (0.16 + 0.92)) < 1e-9, 'counter 0.92');
  assert.ok(Math.abs(logic.seatFloor('S3') - (0.16 + 0.22)) < 1e-9, 'feet on the stool ring');
});
test('길 찾기: 문에서 모든 좌석의 서는 자리까지 길이 있고, 길 위 어디에도 가구에 파고들지 않는다', () => {
  const S = ST.create(logic, { cell: 0.2 });
  layout.seats.forEach((s, i) => {
    const st = logic.standPos(logic.seatAt(i)), p = S.findPath(layout.spawn, st);
    assert.ok(p && p.len > 1, 'path to seat ' + i);
    for (let k = 1; k < p.pts.length; k++) {
      const a = p.pts[k - 1], b = p.pts[k], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.05);
      for (let q = 0; q <= n; q++) { const x = a.x + (b.x - a.x) * q / n, z = a.z + (b.z - a.z) * q / n; assert.ok(free(x, z, 0.2), 'path point ' + x.toFixed(2) + ',' + z.toFixed(2)); }
    }
  });
});
test('배달 로직: 앉아서 주문 → 만들기 → carry(바리스타 손) → delivered 때만 coffeeReady{seat} → 그 좌석에서 일어서면 든다, 다른 좌석이면 그 자리에 둔다', () => {
  const lg = C.Logic(layout.coffee);
  lg.onSit(4);
  assert.deepEqual(lg.order('latte', { seat: 4 }), [{ e: 'coffeeOrdered', kind: 'latte', seat: 4 }]);
  assert.deepEqual(lg.tick(3.1, { x: 0, z: 0, seated: true }), [], '만들어도 coffeeReady 는 아직(놓을 때)');
  assert.equal(lg.cupState().where, 'barista');
  assert.deepEqual(lg.delivered(), [{ e: 'coffeeReady', kind: 'latte', seat: 4 }]);
  assert.equal(lg.cupState().where, 'spot'); assert.equal(lg.cupState().seat, 4);
  lg.onStand(); assert.equal(lg.cupState().where, 'hand', '그 좌석에서 일어서면 든다');
  // 배달 중 일어나 다른 데로: 컵은 그 좌석에 둔다(정한 규칙)
  lg.onSit(0); lg.order('tea', { seat: 0 }); lg.onStand(); lg.tick(3.1, { x: 0, z: 0, seated: false });
  lg.delivered(); assert.deepEqual([lg.cupState().where, lg.cupState().seat], ['spot', 0]);
  lg.onSit(2); lg.onStand(); assert.deepEqual([lg.cupState().where, lg.cupState().seat], ['spot', 0], '다른 좌석에서 일어서도 그대로');
  // 카운터 주문(서서)은 예전 그대로: coffeeReady 는 카운터에 놓일 때, coffeePicked 는 집을 때
  const l2 = C.Logic(layout.coffee); l2.order('iced');
  assert.deepEqual(l2.tick(3.1, { x: -1.5, z: 2, seated: false }), [{ e: 'coffeeReady', kind: 'iced' }]);
});
test('배달 자리: 좌석마다 바리스타가 서는 자리는 비어 있고(바 스툴은 통로 안), 컵 자리에서 팔 닿는 거리(0.75 m 안)', () => {
  const K = layout.coffee;
  K.serve.forEach((sv, i) => {
    const cs = K.cupSpots[i];
    assert.ok(Math.hypot(cs.x - sv.x, cs.z - sv.z) < 0.75, 'reach ' + i);
    if (!sv.across) assert.ok(free(sv.x, sv.z, 0.22), 'serve point free ' + i);
  });
});
const BROWSER = process.env.ROOM_SKIP_BROWSER !== '1';
test('실브라우저: 좌석 6 모두 걸어가서 돌아서고 내려앉는다(순간 이동 없음·골반 높이·발 받침·등받이)', { skip: !BROWSER, timeout: 600000 }, () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/sit_probe.mjs')], { encoding: 'utf8', timeout: 590000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
test('실브라우저: 좌석 6 모두 자리로 가져다 주고(coffeeReady 는 놓을 때 한 번, coffeePicked 없음) 충돌 없이 카운터 뒤로 돌아간다', { skip: !BROWSER, timeout: 900000 }, () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/deliver_probe.mjs')], { encoding: 'utf8', timeout: 890000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const r2 = spawnSync(process.execPath, [path.join(ROOT, 'tools/deliver_probe.mjs'), '--seats', '1,4', '--leave'], { encoding: 'utf8', timeout: 890000 });
  assert.equal(r2.status, 0, '배달 중 일어서도 컵은 그 좌석에: ' + r2.stdout + r2.stderr);
});
