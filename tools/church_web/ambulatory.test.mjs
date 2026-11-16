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

// 로마 3대 성전(사용자 제보 "마조레 성요한 바오로 모두 뒤쪽을 갈 수가 없음"): 제대·성소·후진 안은 막고, 제대 뒤를 실제 순례자처럼 걸어서 돈다.
// 경로는 입구(스폰)에서 누르기 이동(stations 경로 + 걷기 물리 moveCircle, main.js 와 같은 걷기)으로 끝까지 걸어가 본다.
function walkTo(L, S, from, to) {
  const path = S.findPath(from, to);
  if (!path) return { ok: false, pts: [], end: null };
  const me = { x: from.x, z: from.z, vx: 0, vz: 0 }, w = S.startWalk(path, to, 'tap'), out = {}, m = { x: 0, z: 0 }, pts = [];
  for (let t = 0; t < 240; t += 1 / 30) {
    S.stepWalk(w, me, 1 / 30, out);
    if (out.done) break;
    m.x = me.x; m.z = me.z; L.moveCircle(m, out.vx / 30, out.vz / 30); me.x = m.x; me.z = m.z;
    pts.push({ x: me.x, z: me.z });
  }
  return { ok: Math.hypot(me.x - to.x, me.z - to.z) < 0.7, pts, end: me };
}
function backCase(id, { inside, back, cross }) {
  const { c, L, S } = mk(id), rv = L.reverence;
  for (const [x, z, what] of inside) assert.ok(rv.inZone(x, z, 0), `${id}: ${what} (${x},${z}) 가 금지 구역 밖`);
  for (const [x, z, what] of back) {
    assert.ok(!rv.inZone(x, z, 0.3), `${id}: ${what} (${x},${z}) 가 금지 구역 안`);
    assert.ok(S.isReachable(x, z), `${id}: ${what} (${x},${z}) 에 닿지 않는다`);
    const r = walkTo(L, S, c.layout.spawn, { x, z });
    assert.ok(r.ok, `${id}: 입구에서 ${what} 까지 걸어가지 못한다(끝 ${r.end ? r.end.x.toFixed(2) + ',' + r.end.z.toFixed(2) : '경로 없음'})`);
    assert.ok(r.pts.every((q) => !rv.inZone(q.x, q.z, 0)), `${id}: ${what} 가는 길이 금지 구역을 지난다`);
  }
  for (const { from, to, zMax, what } of cross) {
    const r = walkTo(L, S, from, to);
    assert.ok(r.ok, `${id}: ${what} 를 걸어서 건너지 못한다`);
    assert.ok(Math.min(...r.pts.map((q) => q.z)) < zMax, `${id}: ${what} 가 z < ${zMax}(제대 뒤)로 돌지 않는다`);
    assert.ok(r.pts.every((q) => !rv.inZone(q.x, q.z, 0)), `${id}: ${what} 가 금지 구역을 지난다`);
  }
}

test('라테라노: 교황 제대·성가대석·후진(교황좌)은 막고, 제대 뒤 익랑을 건너며 후진 둘레 주보랑을 한 바퀴 돈다', () => {
  backCase('lateran', {
    inside: [[0, -9.4, '교황 제대'], [0, -24, '성가대석'], [0, -33.4, '교황좌'], [0, -6.5, '제대 앞 단']],
    back: [[0, -13.3, '제대 뒤 익랑'], [-7.02, -14.9, '왼쪽 주보랑 문'], [7.02, -22, '오른쪽 곧은 주보랑'], [0, -36.7, '후진 뒤 주보랑']],
    cross: [
      { from: { x: -12, z: -10 }, to: { x: 12, z: -10 }, zMax: -12.2, what: '왼쪽 → 오른쪽 익랑(제대 뒤)' },
      { from: { x: -7.02, z: -28 }, to: { x: 7.02, z: -28 }, zMax: -35.5, what: '왼쪽 → 오른쪽 주보랑(후진 뒤)' }
    ]
  });
});

test('마조레: 성소 단·교황 제대·개선 아치 문·후진은 막고, 측랑 끝 아치 문 → 익랑 팔 → 개선 아치 뒤 성가대 칸을 가로지른다', () => {
  backCase('maggiore', {
    inside: [[0, -21.2, '교황 제대(발다키노)'], [0, -23.8, '개선 아치 문'], [0, -31, '후진'], [0, -17.5, '콘페시오']],
    back: [[9.3, -23.45, '오른쪽 측랑 끝 문'], [-8.5, -26.3, '왼쪽 익랑 팔'], [0, -26.3, '성가대 칸(제대 뒤)'], [8.5, -26.3, '오른쪽 익랑 팔']],
    cross: [{ from: { x: -9.3, z: -21 }, to: { x: 9.3, z: -21 }, zMax: -24.4, what: '왼쪽 → 오른쪽 측랑(개선 아치 뒤)' }]
  });
});

test('성 바오로: 치보리움·제대·콘페시오·후진(교황좌)은 막고, 제대 뒤 익랑을 건너 후진 옆 경당 4곳에 들어간다', () => {
  backCase('stpaul', {
    inside: [[0, -18.5, '교황 제대(치보리움)'], [0, -14.5, '콘페시오'], [0, -34.3, '교황좌'], [0, -30, '후진']],
    back: [[0, -24.5, '제대 뒤 익랑'], [-14, -30.6, '성 스테파노 경당'], [-9.5, -30.6, '십자가 경당'], [9.5, -30.6, '성 라우렌시오 경당'], [14, -30.6, '성 베네딕토 경당']],
    cross: [{ from: { x: -15, z: -20 }, to: { x: 15, z: -20 }, zMax: -21.6, what: '왼쪽 → 오른쪽 익랑(치보리움 뒤)' }]
  });
});
