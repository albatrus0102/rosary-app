// coffee.js 순수 로직 + ch_house 커피 배치: 주문→준비→집기→좌석별 내려놓기, 바리스타 충돌체, 다른 사람 컵(net_view)
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, house, penetration } from './lib/load.mjs';
const g = load('coffee.js', 'net_view.js');
const C = g.RoomCoffee, NV = g.RoomNetView;
const { layout, colliders, logic, L } = house();
const K = layout.coffee;

test('메뉴 4종(무료): 알아보는 이름만 받는다', () => {
  assert.deepEqual(C.KINDS, ['americano', 'latte', 'iced', 'tea']);
  assert.equal(C.kindOf('Latte'), 'latte'); assert.equal(C.kindOf('black tea'), 'tea'); assert.equal(C.kindOf('mocha'), null);
  const src = String(g.RoomCoffee.create);
  assert.ok(!/price|won|₩|\$/.test(src), '돈 관련 없음');
});
test('주문 → 약 3초 만들기 → coffeeReady → 카운터에서 집기 → 손에', () => {
  const lg = C.Logic(K);
  assert.deepEqual(lg.order('espresso'), []);
  assert.deepEqual(lg.order('latte'), [{ e: 'coffeeOrdered', kind: 'latte' }]);
  const far = { x: -1.5, z: 2, seated: false };
  let ev = lg.tick(1.0, far); assert.equal(lg.phase, 'brewing'); assert.deepEqual(ev, []);
  ev = lg.tick(1.0, far); assert.deepEqual(ev, []);
  ev = lg.tick(1.05, far); assert.deepEqual(ev, [{ e: 'coffeeReady', kind: 'latte' }]);
  assert.equal(lg.cupState().where, 'counter'); assert.deepEqual(lg.cupState().pos, K.pickup);
  ev = lg.tick(0.1, { x: 0.9, z: 0.1, seated: false });   // 카운터 앞(주문 안내 자리 안 + 픽업 1.3 m 안)
  assert.deepEqual(ev, [{ e: 'nearCounter', on: true }, { e: 'coffeePicked', kind: 'latte' }]);
  assert.equal(lg.cupState().where, 'hand');
  ev = lg.tick(0.1, far); assert.deepEqual(ev, [{ e: 'nearCounter', on: false }]);
});
test('앉으면 좌석의 컵 자리(책상·카운터·그네 옆 탁자)에, 일어서면 다시 손에', () => {
  assert.equal(K.cupSpots.length, layout.seats.length);
  for (let i = 0; i < layout.seats.length; i++) {
    const lg = C.Logic(K); lg.give('iced');
    lg.onSit(i);
    const st = lg.cupState(), s = layout.seats[i], sp = K.cupSpots[i];
    assert.equal(st.where, 'spot'); assert.deepEqual(st.pos, sp);
    assert.ok(Math.hypot(sp.x - s.x, sp.z - s.z) < (i >= 4 ? 1.65 : 0.75), 'cup within reach of seat ' + i);   // 그네 둘은 옆 탁자 하나를 같이 쓴다
    // 컵 자리는 가구 위(충돌체 안 = 책상·카운터·탁자)이고, 높이는 0.5~1.25 m
    assert.ok(colliders.some((c) => penetration(c, sp.x, sp.z, 0.001) > 0), 'cup on furniture ' + i);
    assert.ok(sp.y > 0.5 && sp.y < 1.25);
    lg.onStand(); assert.equal(lg.cupState().where, 'hand');
  }
  // 컵 자리가 없는 좌석이면 든 채로 앉는다
  const lg = C.Logic({ ...K, cupSpots: [] }); lg.give('tea'); lg.onSit(0); assert.equal(lg.cupState().where, 'hand');
  // 새로 주문하면 들고 있던 잔은 없어지고(한 사람 한 잔) 다시 만든다
  const l2 = C.Logic(K); l2.give('tea'); l2.order('americano'); assert.equal(l2.cupState().where, 'none'); assert.equal(l2.kind, 'americano');
});
test('바리스타: 카운터 뒤 통로 안, 통로 전체가 충돌체(손님이 못 들어감), 픽업·주문 자리는 손님 쪽에서 닿는다', () => {
  const b = K.barista, zone = colliders.find((c) => c.tag === 'barista');
  assert.ok(zone, 'barista collider');
  assert.ok(b.x >= zone.x0 && b.x <= zone.x1 && b.z0 >= zone.z0 && b.z1 <= zone.z1);
  const R = L.C.RADIUS, free = (x, z) => colliders.every((c) => penetration(c, x, z, R) <= 1e-6);
  for (let z = b.z0; z <= b.z1; z += 0.1) assert.ok(!free(b.x, z), 'walkable behind counter at z ' + z);
  // 주문 안내 사각형 안에 걸을 수 있는 곳이 있고, 그곳에서 픽업 자리가 1.3 m 안
  let ok = 0;
  for (let x = K.near.x0; x <= K.near.x1; x += 0.05) for (let z = K.near.z0; z <= K.near.z1; z += 0.05) if (free(x, z) && Math.hypot(x - K.pickup.x, z - K.pickup.z) <= 1.3) ok++;
  assert.ok(ok > 20, 'reachable pickup spots: ' + ok);
  // 바 스툴(좌석 3)은 카운터를 본다
  assert.ok(L.fwd(logic.seats[3].yaw)[0] > 0.99);
});
test('다른 사람 컵: setPeers 의 cup 필드 → 표에 기록·바뀜 알림, 걷는 사람은 손에·앉은 사람은 컵 자리에', () => {
  const t = NV.createTable();
  let ev = t.set([{ id: 'a', x: 0, z: 0, cup: 'latte' }, { id: 'b', x: 1, z: 1, cup: 'beer' }], 0);
  assert.equal(t.peers.get('a').cup, 'latte'); assert.equal(t.peers.get('b').cup, null);
  ev = t.set([{ id: 'a', x: 0, z: 0, cup: 'iced' }, { id: 'b', x: 1, z: 1 }], 100);
  assert.deepEqual(ev.changed, ['a']);
  assert.equal(C.peerCupWhere('latte', null, K.cupSpots), 'hand');
  assert.equal(C.peerCupWhere('latte', 2, K.cupSpots), 'spot');
  assert.equal(C.peerCupWhere(null, 2, K.cupSpots), 'none');
});
