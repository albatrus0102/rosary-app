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
    assert.ok(lay.seats.length >= 60 && lay.seats.length <= 200 || lay.id === 'basic' && lay.seats.length === 144, 'seat count ' + lay.seats.length);
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
  test(`layout ${lay.id}: spawn is not inside a seat band, corridor behind each seat is free`, () => {
    const L = Logic.create(lay, {});
    const p = { x: lay.spawn.x, z: lay.spawn.z };
    assert.equal(L.moveCircle(p, 0, 0), false, 'spawn collides');
    for (const s of L.seats) {
      const sp = L.standPos(s.id);
      const q = { x: sp.x, z: sp.z };
      assert.equal(L.moveCircle(q, 0, 0), false, 'stand pos blocked for ' + s.id);
    }
  });
}

test('basic layout equals SPEC §1/§10', () => {
  const b = layouts.find((l) => l.id === 'basic');
  assert.equal(b.seatGroups[0].origin.z, -9.65);
  assert.equal(b.seats[0].id, 'L00-0');
  assert.equal(b.candles.stands[0].slots, 96);
});
