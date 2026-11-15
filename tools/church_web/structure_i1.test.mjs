// 구조 수정 I-1(명동대성당·우리 본당, docs/church/STRUCTURE_AUDIT_OTHERS.md §2.6·§4.5)이 되돌아가지 않게 지키는 시험.
// three.js 없이 빌더를 Node(vm)에서 돌려 개구부·궁륭·십자가의 길 판·충돌체를 잰다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { measure } from './church_openings.mjs';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');
const WayCross = require('../../assets/church/way_cross.js');

const { churches } = loadChurches();
const md = churches.find((c) => c.id === 'myeongdong'), ba = churches.find((c) => c.id === 'basic');
const inside = (L, x, z) => L.colliders.some((c) => (c.x0 !== undefined ? x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 : Math.hypot(x - c.x, z - c.z) < c.r));

test('myeongdong openings: tower window instead of a rose, tympanum, aisle-end roses, twin aisle lights, single clerestory lancets', () => {
  const o = measure('myeongdong').openings, by = Object.fromEntries(o.map((e) => [e.key, e]));
  assert.equal(o.length, 53);
  assert.ok(!o.some((e) => e.zone === 'other'), '이름 없는 개구부');
  // 정면: 장미창·측랑 앞 작은 창은 없다. 종탑 2층 창(창턱 9, 꼭대기 15 위)과 가운데 문 위 반월창
  assert.ok(!by.facade_rose && !by.facadeSideL && !by.facadeSideR);
  assert.equal(o.filter((e) => e.zone === 'facade').length, 2);
  assert.ok(Math.abs(by.facade_tower.sill - 9) < 0.05 && by.facade_tower.apex > 15 && by.facade_tower.w > 2.3);
  assert.ok(Math.abs(by.facade_tympanum.sill - 3.4) < 0.05 && by.facade_tympanum.apex < 4.8);
  assert.equal(by.facade_tympanum.palette, 'pale', '문 위 반월창은 색조만 있는 중립 무늬(이남규 창을 흉내 내지 않는다)');
  // 측랑 끝 작은 장미창 2
  for (const k of ['aisleEndL_rose', 'aisleEndR_rose']) { assert.equal(by[k].shape, 'circle'); assert.ok(Math.abs(by[k].y - 6.6) < 0.05 && by[k].w < 1.5); }
  // 측랑 창 16: 2연창(유리 폭 2m 이상), 창턱 3.0 — 그 아래 십자가의 길 판(꼭대기 2.77)이 걸린다
  const aisle = o.filter((e) => e.zone === 'aisle' || e.zone === 'aisle_chancel');
  assert.equal(aisle.length, 16);
  aisle.forEach((e) => { assert.ok(e.w > 2.0 && e.w < 2.3, e.key + ' 폭 ' + e.w); assert.ok(Math.abs(e.sill - 3.0) < 0.01); assert.ok(e.apex > 6.9 && e.apex < 7.5); });
  // 고측창 18: 좁은 단일 첨두
  const clere = o.filter((e) => e.zone === 'clerestory' || e.zone === 'clerestory_chancel');
  assert.equal(clere.length, 18);
  clere.forEach((e) => { assert.ok(e.w < 1.2, e.key + ' 폭 ' + e.w); assert.equal(e.shape, 'pointed'); });
  // 후진 5창: 사도화 띠 위(7.6)에서 벽 리브 아래(15.4~15.8)까지
  const apse = o.filter((e) => e.zone === 'apse');
  assert.equal(apse.length, 5);
  apse.forEach((e) => { assert.ok(Math.abs(e.sill - 7.6) < 0.01 && e.apex > 15.3 && e.apex < 15.9, e.key); });
});

test('myeongdong vault is a groin (rib) vault: the ridge runs on across bay boundaries and wall arches stay open', () => {
  const P = md.ctx.solid.p;
  // 칸 경계(z)·벽(x) 근처에서 궁륭 면(기공 14 위, 종석·리브 아래)의 가장 높은 점
  const top = (test2) => { let m = -1; for (let i = 0; i < P.length; i += 3) if (P[i + 1] > 13.9 && P[i + 1] < 19.3 && test2(P[i], P[i + 2])) m = Math.max(m, P[i + 1]); return m; };
  // 신랑 한가운데(x≈0)의 칸 경계 z=19, 9: 횡단 아치의 꼭대기 = 궁륭 꼭대기(19). 닫힌(수도원식) 궁륭이면 기공 높이 14 로 내려온다
  for (const z of [19, 9, -1]) assert.ok(top((x, zz) => Math.abs(x) < 0.05 && Math.abs(zz - z) < 0.05) > 18.8, '칸 경계 z=' + z + ' 에서 궁륭이 기공까지 내려온다');
  // 고측창 위 벽 아치: 벽(x=±4.05)의 칸 가운데(z=21.5)에서도 궁륭이 높이 올라가 창(12~16.5)이 가려지지 않는다
  assert.ok(top((x, zz) => Math.abs(Math.abs(x) - 4.05) < 0.05 && Math.abs(zz - 21.5) < 0.05) > 18.5);
  // 기둥 자리(네 모서리)에서는 기공 높이
  let low = 99; for (let i = 0; i < P.length; i += 3) if (Math.abs(Math.abs(P[i]) - 4.05) < 0.02 && Math.abs(P[i + 2] - 19) < 0.02 && P[i + 1] > 13.9 && P[i + 1] < 19.3) low = Math.min(low, P[i + 1]);
  assert.ok(low < 14.05);
});

test('myeongdong: only the SPEC §30 plaques (builder plaques removed), one per bay under the aisle windows, on the real wall face', () => {
  const L = Logic.create(md.layout, { colliders: md.colliders, zones: md.zones }), S = Stations.create(L);
  const r = WayCross.derive({ layout: md.layout, logic: L, stations: S, walls: md.walls, windows: md.windows, roses: md.roses, glassSlots: md.glassSlots });
  assert.equal(r.why, 'ok'); assert.equal(r.plaques.length, 14);
  const bays = [-3.5, 1.5, 6.5, 11.5, 16.5, 21.5, 27.75];
  r.plaques.forEach((p, i) => {
    assert.ok(Math.abs(Math.abs(p.x) - 8.926) < 1e-6, '판이 벽 면(±9.0)에서 떨어져 있다');
    assert.ok(Math.abs(p.z - (i < 7 ? bays[i] : bays[13 - i])) < 1e-6, (i + 1) + '처가 칸 가운데가 아니다');
    assert.equal(p.side, i < 7 ? 'R' : 'L');
    assert.ok(p.y + p.h / 2 < 2.84, '판 꼭대기가 창대 띠(2.84)보다 높다');
    assert.ok(!inside(L, p.x - Math.sign(p.x) * 0.02, p.z), '판이 벽 충돌체 안에 묻혔다');
    assert.ok(inside(L, p.x + Math.sign(p.x) * 0.08, p.z), '판 뒤가 벽이 아니다');
  });
});

test('myeongdong: plaster-and-grey-brick interior (no red brick surface), cathedra and sanctuary lamp present', () => {
  assert.ok(!md.ctx.surfaces.md_brick_red, '실내 붉은 벽돌 표면이 남아 있다');
  assert.equal(md.roses.length, 2);          // 측랑 끝 장미창 2 (정면 장미창 없음)
  assert.equal(md.windows.length, 0);
  assert.equal(md.layout.seatGroups.reduce((a, g) => a + g.rows * g.perRow, 0), 132);
});

test('basic: presider chair, credence table, font, choir and two confessionals are solid; seats and spawn untouched', () => {
  const L = Logic.create(ba.layout, { colliders: ba.colliders, zones: ba.zones }), S = Stations.create(L);
  assert.equal(L.seats.length, 144);
  for (const [x, z, what] of [[0, -19.2, '주례석'], [1.45, -19.3, '복사석'], [3.4, -18.75, '주수상'], [-10.4, -15.4, '세례대'], [10.3, -12.2, '성가대 오르간'], [10.3, -10.4, '성가대 의자'], [9.5, 18.8, '고해소(오른쪽)'], [-9.5, 18.8, '고해소(왼쪽)']]) {
    assert.ok(inside(L, x, z), what + ' 자리에 충돌체가 없다');
  }
  // 스폰·제대 앞·성수대 앞·맨 뒤 통로는 비어 있고 걸어서 닿는다
  for (const [x, z] of [[0, 17], [0, -16], [0, 14], [7, 16.5], [-7, 16.5], [8.5, -13.6], [-10.6, -13.6]]) { assert.ok(S.free(x, z), `(${x}, ${z}) 막힘`); assert.ok(S.isReachable(x, z), `(${x}, ${z}) 못 감`); }
  // 성가대 자리 옆면에 십자가의 길 판이 걸리지 않는다(충돌체를 둘로 나눈 이유)
  const r = WayCross.derive({ layout: ba.layout, logic: L, stations: S, walls: ba.walls, windows: ba.windows, roses: ba.roses, glassSlots: ba.glassSlots });
  assert.equal(r.why, 'ok');
  r.plaques.forEach((p) => assert.ok(Math.abs(Math.abs(p.x) - 11.93) < 0.02, p.n + '처가 옆벽이 아닌 곳에 걸렸다 (x ' + p.x + ')'));
});
