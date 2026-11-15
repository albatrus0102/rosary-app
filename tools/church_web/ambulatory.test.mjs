// 둘레 통로 시험: 제단 출입 금지 구역(reverence.js)은 제단·성가대석 안만 막고, 신자가 실제로 걷는 둘레 통로는 연다.
// 사용자 제보(밀라노): "뒤로 못 들어가네" — 구역이 후진 벽까지 닿아 제대(성가대석) 뒤 주보랑으로 걸어 갈 수 없었다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');

const { churches } = loadChurches();
const mk = (id) => { const c = churches.find((x) => x.id === id), L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones }); return { c, L, S: Stations.create(L) }; };

test('밀라노: 제대·성가대석은 막고, 제대 뒤 주보랑은 걸어서 닿고 한 바퀴 돈다', () => {
  const { L, S } = mk('milan'), rv = L.reverence;
  assert.ok(rv.inZone(0, -18.2, 0), '제대가 구역 안');
  assert.ok(rv.inZone(0, -26, 0), '성가대석 안이 구역 안');
  for (const [x, z] of [[0, -32.5], [-3.5, -30.5], [3.5, -30.5], [-6.5, -25], [6.5, -25]]) {
    assert.ok(!rv.inZone(x, z, 0.3) && S.isReachable(x, z), `주보랑 ${x},${z} 에 닿지 않는다`);
  }
  // 왼쪽 → 오른쪽 주보랑: 성가대석 뒤(z < -29)로 돌아간다
  const p = S.findPath({ x: -6.5, z: -25 }, { x: 6.5, z: -25 });
  assert.ok(p, '경로 없음');
  assert.ok(Math.min(...p.pts.map((q) => q.z)) < -29, '성가대석 뒤로 돌지 않는다');
  assert.ok(p.pts.every((q) => !rv.inZone(q.x, q.z, 0)), '경로가 금지 구역을 지난다');
});

test('피렌체: 팔각 성가대 울타리 안은 막고, 울타리 뒤 둘레·트리부나는 걷는다(성당 밖으로는 못 나간다)', () => {
  const { L, S } = mk('florence'), rv = L.reverence;
  assert.ok(rv.inZone(0, -15.7, 0), '제대가 구역 안');
  for (const [x, z] of [[0, -20.5], [-3, -19], [3, -19], [0, -26]]) assert.ok(S.isReachable(x, z), `둘레 ${x},${z} 에 닿지 않는다`);
  for (const [x, z] of [[0, -32.5], [-10, -32.5]]) assert.ok(!S.isReachable(x, z), `성당 밖 ${x},${z} 에 닿는다`);
});

test('성 베드로·명동: 제단 둘레의 측랑·익랑 통로가 구역에 막히지 않는다', () => {
  const cases = { stpeter: [[-14, -9], [14, -9], [-12, -22], [12, -22]], myeongdong: [[-10, -12], [10, -12]] };
  for (const [id, pts] of Object.entries(cases)) {
    const { L, S } = mk(id);
    for (const [x, z] of pts) assert.ok(!L.reverence.inZone(x, z, 0.3) && S.isReachable(x, z), `${id} ${x},${z}`);
  }
});
