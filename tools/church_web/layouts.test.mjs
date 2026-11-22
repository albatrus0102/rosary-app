import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadLayouts } from './export_layouts.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');

const layouts = loadLayouts();
test('at least basic is registered', () => { assert.ok(layouts.find((l) => l.id === 'basic')); });

for (const lay of layouts) {
  test(`layout ${lay.id}: seats valid`, () => {
    assert.match(lay.id, /^[a-z]+$/);
    // 상한 300: 여의도동 270(신랑 140 + 성가대석 두 덩이 130 — 여러 층으로 성가대석 왼쪽 큰 덩이를 열었다, 2026-11-22)
    assert.ok(lay.seats.length >= 60 && lay.seats.length <= 300 || lay.id === 'basic' && lay.seats.length === 144, 'seat count ' + lay.seats.length);
    const ids = new Set();
    const b = lay.bounds;
    for (const s of lay.seats) {
      assert.match(s.id, /^[A-Z]{1,2}\d\d-\d{1,2}$/);
      assert.ok(!ids.has(s.id), 'dup ' + s.id); ids.add(s.id);
      assert.ok(s.x > b.x0 && s.x < b.x1 && s.z > b.z0 && s.z < b.z1, 'seat outside bounds ' + s.id);
    }
    assert.ok(lay.spawn.x > b.x0 && lay.spawn.x < b.x1 && lay.spawn.z > b.z0 && lay.spawn.z < b.z1);
    assert.ok(lay.candles.stands.length >= 1 && lay.candles.stands.every((s) => s.slots >= 1));
  });
  test(`layout ${lay.id}: spawn is not inside a seat band, corridor in front of each seat is free`, () => {
    const L = Logic.create(lay, {});
    const p = { x: lay.spawn.x, z: lay.spawn.z };
    // 여러 층(layout.levels): 스폰·좌석 앞 자리는 그 층의 높이에서 잰다(다른 층의 줄 띠·벽은 그 층 사람을 막지 않는다). 한 층은 y 를 무시한다
    assert.equal(L.moveCircle(p, 0, 0, undefined, L.multi ? L.floorY(p.x, p.z, lay.spawn.y) : undefined), false, 'spawn collides');
    for (const s of L.seats) {
      const sp = L.standPos(s.id);
      const q = { x: sp.x, z: sp.z };
      assert.equal(L.moveCircle(q, 0, 0, undefined, L.multi ? L.seatFloor(s.id) : undefined), false, 'stand pos blocked for ' + s.id);
    }
  });
}

test('basic layout equals SPEC §1/§10', () => {
  const b = layouts.find((l) => l.id === 'basic');
  assert.equal(b.seatGroups[0].origin.z, -9.65);
  assert.equal(b.seats[0].id, 'L00-0');
  assert.equal(b.candles.stands[0].slots, 96);
});
