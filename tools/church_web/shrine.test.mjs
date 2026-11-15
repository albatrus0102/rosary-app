// 성모 기도 자리(shrine.js · shrine_places.js): 구조가 확정된 8개 성당에 자리 1곳, 걷기 경계 안, 기존 충돌체·좌석·14처 판·봉헌초와
// 겹치지 않음, 봉헌초 슬롯(맨 끝 14개), 스테이션(서는 자리) 존재·도달 가능. 구조 수정 중인 성 베드로(pending)은 자리 없음.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadChurches } from './church_harness.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Places = require('../../assets/church/shrine_places.js');
const Shrine = require('../../assets/church/shrine.js');
const { churches, Logic, Stations, WayCross } = loadChurches();
const READY = ['basic', 'myeongdong', 'lateran', 'stpaul', 'milan', 'danggogae', 'maggiore', 'florence', 'stpeter'], PENDING = [];
const by = Object.fromEntries(churches.map((c) => [c.id, c]));
const rect = (q) => q.r !== undefined && q.x0 === undefined ? { x0: q.x - q.r, x1: q.x + q.r, z0: q.z - q.r, z1: q.z + q.r } : { x0: Math.min(q.x0, q.x1), x1: Math.max(q.x0, q.x1), z0: Math.min(q.z0, q.z1), z1: Math.max(q.z0, q.z1) };
const overlap = (a, b, e = 0.02) => a.x0 < b.x1 - e && a.x1 > b.x0 + e && a.z0 < b.z1 - e && a.z1 > b.z0 + e;

test('table covers every church: 8 placed, 1 pending', () => {
  assert.deepEqual(Object.keys(Places).sort(), READY.concat(PENDING).sort());
  for (const id of PENDING) { assert.equal(Places[id].pending, true); assert.ok(Places[id].note); assert.equal(Shrine.placeOf(id), null); }
  for (const id of READY) { const p = Places[id]; assert.ok(['mary', 'plain', 'existing'].includes(p.kind)); assert.ok(p.label_ko); assert.equal(p.yaw % 90, 0); }
});

for (const id of PENDING) test(`shrine ${id}: pending -> no place, layout untouched`, () => {
  const c = by[id];
  assert.equal(c.layout.shrine, undefined);
  assert.ok(c.layout.candles.stands.every((s) => !s.shrine));
});

for (const id of READY) test(`shrine ${id}: one place, clear, lightable, reachable`, () => {
  const c = by[id], lay = c.layout, p = Places[id], sh = lay.shrine, b = lay.bounds;
  assert.ok(sh, 'layout.shrine');
  const mine = lay.candles.stands.filter((s) => s.shrine);
  assert.equal(mine.length, 1);
  assert.equal(sh.stand, lay.candles.stands.length - 1, 'shrine stand is the last stand (existing slot ids unchanged)');
  assert.ok(mine[0].slots >= 12 && mine[0].slots <= 16);
  const fp = Shrine.footprint(p);
  assert.ok(fp.x0 >= b.x0 - 0.35 && fp.x1 <= b.x1 + 0.35 && fp.z0 >= b.z0 - 0.35 && fp.z1 <= b.z1 + 0.35, 'inside walk bounds');
  // 충돌체: 자리 충돌체가 들어 있고, 다른 충돌체·좌석 줄과 겹치지 않는다(existing 은 성상 받침과 맞닿기만)
  const own = c.colliders.filter((q) => q.x0 === fp.x0 && q.x1 === fp.x1 && q.z0 === fp.z0 && q.z1 === fp.z1);
  assert.equal(own.length, 1, 'own collider registered once');
  for (const q of c.colliders) if (q !== own[0]) assert.ok(!overlap(fp, rect(q)), `overlaps collider ${JSON.stringify(q)}`);
  const L = Logic.create(lay, { colliders: c.colliders, zones: c.zones }), S = Stations.create(L), st = S.stations();
  for (const q of L.bands) assert.ok(!overlap(fp, q), 'overlaps a pew row');
  // 다른 봉헌초 대·14처 판과 떨어져 있다
  lay.candles.stands.forEach((s) => { if (!s.shrine) assert.ok(Math.hypot(s.x - p.x, s.z - p.z) > 3, 'too close to a candle stand'); });
  const cw = WayCross.derive({ layout: lay, logic: L, stations: S, walls: c.walls, windows: c.windows, roses: c.roses, glassSlots: c.glassSlots });
  for (const q of cw.plaques || []) assert.ok(Math.hypot(q.x - p.x, q.z - p.z) > 1.2, 'too close to a cross plaque');
  // 슬롯: 맨 끝 14개, 서는 자리에서 닿는다
  const slots = L.slots.filter((s) => s.stand === sh.stand);
  assert.equal(slots.length, mine[0].slots);
  assert.equal(slots[0].slot, L.slots.length - slots.length);
  slots.forEach((s) => assert.ok(s.x >= fp.x0 && s.x <= fp.x1 && s.z >= fp.z0 && s.z <= fp.z1, 'slot on the stand'));
  // 스테이션: 무릎틀 바로 앞, 걸어서 갈 수 있고 초에 닿는다
  const stn = st.candle.find((q) => q.shrine);
  assert.ok(stn && stn.label === p.label_ko && stn.index === sh.stand);
  const f = Shrine.face(p), d = (stn.x - p.x) * f[0] + (stn.z - p.z) * f[1], lat = Math.abs((stn.x - p.x) * f[1] - (stn.z - p.z) * f[0]);
  assert.ok(d > 1.35 && d < 2.0 && lat < 0.6, `station in front of the kneeler (d ${d.toFixed(2)}, lat ${lat.toFixed(2)})`);
  assert.ok(S.free(stn.x, stn.z) && S.findPath(lay.spawn, stn), 'reachable from spawn');
  assert.ok(slots.some((s) => Math.hypot(s.x - stn.x, s.z - stn.z) <= 1.8));
  assert.equal(L.floorY(stn.x, stn.z), sh.y, 'station on the same floor as the shrine');
});
