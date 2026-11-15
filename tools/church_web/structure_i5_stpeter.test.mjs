// 성 베드로 구조 수정(I-5, docs/church/STRUCTURE_AUDIT_ROME.md §1.4) 회귀 시험: 돔 피어 둘레 회랑·모서리 경당·대경당의 통행과 성능 구조(스프라이트·충돌체 수).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');
const WayCross = require('../../assets/church/way_cross.js');

const { churches } = loadChurches();
const c = churches.find((x) => x.id === 'stpeter');
const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones });
const S = Stations.create(L);

test('stpeter I-5: 측랑 → 모서리 경당 → 통로 → 익랑 → 통로 → 서쪽 경당 → 후진 팔이 양쪽 모두 걸어서 이어진다', () => {
  for (const s of [1, -1]) {
    const path = [[9, 4.2], [13.8, 4.8], [13.8, -1.4], [13.8, -9], [13.8, -16.6], [13.8, -22.8], [7.6, -22.8], [0, -22.8]];
    for (const [x, z] of path) {
      assert.ok(S.free(s * x, z), `막힘 (${s * x}, ${z})`);
      assert.ok(S.isReachable(s * x, z), `입구에서 못 감 (${s * x}, ${z})`);
    }
    // 이웃한 점 사이가 직선으로 뚫려 있다(벽을 돌아가는 길이 아니라 아치로 바로 통한다)
    for (let i = 1; i < path.length - 1; i++) {   // 마지막 구간(후진 팔 안)은 의자 줄 사이라 직선이 아니어도 된다
      assert.ok(S.lineClear({ x: s * path[i - 1][0], z: path[i - 1][1] }, { x: s * path[i][0], z: path[i][1] }), `직선 막힘 ${path[i - 1]} → ${path[i]} (s=${s})`);
    }
  }
});

test('stpeter I-5: 성체 경당·성가대 경당은 걸어 들어가는 깊은 방, 나머지 경당 넷은 난간으로 막힘', () => {
  assert.ok(S.isReachable(12.6, 12.85) && S.isReachable(13.5, 12.85), '성체 경당 입구·난간 앞');
  assert.ok(S.isReachable(15.0, 14.0) || S.isReachable(14.9, 12.85), '성체 경당 난간 안쪽');
  assert.ok(S.isReachable(-13.0, 12.85) && S.isReachable(-14.5, 12.85), '성가대 경당 안');
  for (const z of [30.15, 21.5]) for (const s of [1, -1]) assert.ok(!S.free(s * 12.4, z), `작은 경당 (${s * 12.4}, ${z}) 은 출입 불가`);
  // 방 바깥(벽 뒤)으로는 못 나간다
  for (const s of [1, -1]) { assert.ok(!S.free(s * 17.2, 12.85)); assert.ok(!S.free(s * 17.0, 4.85)); assert.ok(!S.free(s * 17.0, -22.85)); assert.ok(!S.free(s * 13.8, -26.0)); assert.ok(!S.free(s * 13.8, 8.4)); }
});

test('stpeter I-5: 측랑 끝 제대·모서리 경당 제대는 충돌체가 있고 제대 앞은 비어 있다', () => {
  for (const s of [1, -1]) {
    assert.ok(!S.free(s * 8.97, 2.6), '측랑 끝 제대');
    assert.ok(S.isReachable(s * 8.97, 4.4), '측랑 끝 제대 앞');
    assert.ok(!S.free(s * 16.2, 4.85), '동쪽 모서리 경당 제대');
    assert.ok(!S.free(s * 13.8, -25.2), '서쪽 모서리 경당 제대');
  }
});

test('stpeter I-5: 성능 구조 — 스프라이트(불꽃·빛 번짐)·충돌체·낱개 메시가 늘지 않는다', () => {
  const st = c.ctx._;
  assert.equal(st.flames.length, 18, '불꽃 스프라이트는 기존 18개(새 제대의 촛불은 발광 배치)');
  assert.ok(st.glows.length <= 4, '빛 번짐 스프라이트 ≤ 4(성체등 1개만 추가)');
  assert.ok(c.colliders.length < 300, '충돌체 < 300: ' + c.colliders.length);
  // 낱개 메시(판 합치기 전): 새 바닥 12장(합쳐져 draw call +0) 말고는 늘지 않는다
  // (C-15) 피에타·성 베드로 청동상 사진 판 2장(저마다 질감이 달라 합칠 수 없다)만 더한다: 52 → 54
  assert.ok(c.ctx.stats.meshes <= 54, '낱개 메시 ' + c.ctx.stats.meshes);
  const sb = st.surfBatches;
  for (const k of Object.keys(sb)) if (!/limestone/.test(k)) assert.ok(sb[k].batch.vertexCount < 30000, k + ' 배치가 공간 분할 문턱(3만 정점)을 넘지 않는다: ' + sb[k].batch.vertexCount);
});

test('stpeter I-5: 14처는 측랑 바깥벽 민벽 구간(경당 입구·회랑 아치·촛불대 앞이 아님)에 걸린다', () => {
  const r = WayCross.derive({ layout: c.layout, logic: L, stations: S, walls: c.walls, windows: c.windows, roses: c.roses, glassSlots: c.glassSlots });
  assert.equal(r.why, 'ok');
  assert.equal(r.plaques.length, 14);
  const open = [[1.95, 6.45], [11.25, 14.45], [19.9, 23.1], [28.55, 31.75]], stand = [13.15, 21.25];
  r.plaques.forEach((p) => {
    assert.ok(Math.abs(Math.abs(p.x) - 10.876) < 0.01, `${p.n}처 x ${p.x}`);
    for (const [a, b] of open) assert.ok(p.z + 0.35 < a || p.z - 0.35 > b, `${p.n}처(z ${p.z})가 개구부 ${a}…${b} 에 걸림`);
    assert.ok(p.z + 0.35 < stand[0] || p.z - 0.35 > stand[1], `${p.n}처가 촛불대 뒤`);
    assert.ok(S.isReachable(p.stand.x, p.stand.z));
  });
  assert.equal(r.plaques[0].side, 'R'); assert.equal(r.plaques[13].side, 'L');
});
