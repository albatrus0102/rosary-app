// 십자가의 길 14처 판 자리 유도(way_cross.js derive) 시험: 8개 성당 전부, 실제 빌더의 충돌체·벽·창으로.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');
const WayCross = require('../../assets/church/way_cross.js');
const CrossData = require('../../assets/church/cross_data.js');

const { churches } = loadChurches();

function derive(c) {
  const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones });
  const S = Stations.create(L);
  const r = WayCross.derive({ layout: c.layout, logic: L, stations: S, walls: c.walls, windows: c.windows, roses: c.roses, glassSlots: c.glassSlots });
  return { L, S, r };
}

// 점이 충돌 상자/원 안(반경 0)인가
function insideCollider(L, x, z) {
  for (const c of L.colliders) {
    if (c.x0 !== undefined) { if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return true; }
    else if (Math.hypot(x - c.x, z - c.z) < c.r) return true;
  }
  return false;
}

test('cross_data.js: 14 stations with roman numerals', () => {
  assert.equal(CrossData.stations.length, 14);
  CrossData.stations.forEach((s, i) => { assert.equal(s.n, i + 1); assert.ok(s.roman && s.title && s.short); });
  assert.equal(CrossData.stations[13].roman, 'XIV');
});

const rows = [];
for (const c of churches) {
  test(`way of the cross ${c.id}: 14 plaques on walls, free stand spots, walkable loop`, () => {
    const { L, S, r } = derive(c);
    assert.equal(r.why, 'ok', JSON.stringify(r.counts));
    const P = r.plaques;
    assert.equal(P.length, 14);
    const st = S.stations();
    P.forEach((p, i) => {
      assert.equal(p.n, i + 1); assert.equal(p.index, i);
      // 판 법선은 서는 자리 쪽(실내)을 본다, 판은 수평 법선
      const dx = p.stand.x - p.x, dz = p.stand.z - p.z, d = Math.hypot(dx, dz);
      assert.ok((dx * p.nx + dz * p.nz) / d > 0.85, `${p.n}처 판이 서는 자리를 보지 않음`);
      assert.ok(d >= 1.2 && d <= 3.0, `${p.n}처 서는 거리 ${d.toFixed(2)}`);
      // 서는 자리는 충돌 없고 입구에서 닿는다
      assert.ok(S.free(p.stand.x, p.stand.z), `${p.n}처 서는 자리 충돌`);
      assert.ok(S.isReachable(p.stand.x, p.stand.z), `${p.n}처 서는 자리에 못 감`);
      // 판 바로 앞(실내 쪽 10cm·35cm)은 충돌체 안이 아니다(벽·가구에 묻히지 않음)
      for (const k of [0.1, 0.35]) {
        for (const e of [-0.3, 0, 0.3]) {
          const x = p.x + p.nx * k + p.nz * e, z = p.z + p.nz * k - p.nx * e;
          assert.ok(!insideCollider(L, x, z), `${p.n}처 판 앞(${k}m)이 충돌체 안`);
        }
      }
      // 판 뒤 15cm 안에 벽(충돌체 또는 걷기 경계 밖)이 있다 = 벽에 붙어 있다
      let backed = false;
      for (let k = 0.02; k <= 0.2 && !backed; k += 0.02) {
        const x = p.x - p.nx * k, z = p.z - p.nz * k, B = c.layout.bounds;
        if (insideCollider(L, x, z) || x <= B.x0 || x >= B.x1 || z <= B.z0 || z >= B.z1) backed = true;
      }
      assert.ok(backed, `${p.n}처 판 뒤에 벽이 없음`);
      // 높이: 바닥에서 액자 아래 1.35m
      const fy = L.floorY(p.stand.x, p.stand.z);
      assert.ok(Math.abs(p.y - p.h / 2 - fy - WayCross.P.bottom) < 0.6, `${p.n}처 높이`);
      // 촛불대·성수대·제대 앞 자리와 겹치지 않는다
      for (const o of [st.altar, ...st.candle, ...st.font]) {
        assert.ok(Math.hypot(o.x - p.stand.x, o.z - p.stand.z) >= 1.8, `${p.n}처가 다른 스테이션과 겹침`);
      }
    });
    // 판끼리 2m 이상
    for (let i = 0; i < 14; i++) for (let j = i + 1; j < 14; j++) {
      assert.ok(Math.hypot(P[i].x - P[j].x, P[i].z - P[j].z) >= 2.0, `${i + 1}처·${j + 1}처가 너무 가까움`);
    }
    // 창(개구부)과 겹치지 않는다: 같은 벽면(법선 같고 1m 안)에서 수평·수직 구간이 겹치는 창 없음
    for (const p of P) {
      for (const w of c.windows) {
        if (!w.F) continue;
        if (w.F.nx * p.nx + w.F.nz * p.nz < 0.7) continue;
        const across = (w.x - p.x) * p.nx + (w.z - p.z) * p.nz;
        if (Math.abs(across) > 1.0) continue;
        const along = (w.x - p.x) * p.nz - (w.z - p.z) * p.nx;
        if (Math.abs(along) > w.w / 2 + p.w / 2) continue;
        const rise = w.top === 'pointed' ? w.w * 0.72 : (w.top === 'round' || w.top === 'trefoil' ? w.w / 2 : 0);
        const y0 = p.y - p.h / 2, y1 = p.y + p.h / 2;
        assert.ok(w.y > y1 || w.y + w.h + rise < y0, `${p.n}처가 창과 겹침`);
      }
    }
    // 순례 동선: 입구 → 1처, n처 → n+1처 모두 걸어서 간다
    let len = 0;
    const sp = c.layout.spawn;
    const first = S.findPath({ x: sp.x, z: sp.z }, P[0].stand);
    assert.ok(first, '입구에서 1처로 못 감');
    for (let i = 0; i < 13; i++) {
      const path = S.findPath(P[i].stand, P[i + 1].stand);
      assert.ok(path, `${i + 1}처 → ${i + 2}처 길 없음`);
      len += path.len;
    }
    // 관례 순서: 앞 7곳(또는 한쪽)은 같은 쪽 벽
    assert.equal(P[0].side, P[1].side);
    assert.notEqual(P[0].side, P[13].side);
    rows.push({ id: c.id, R: P.filter((p) => p.side === 'R').length, L: P.filter((p) => p.side === 'L').length, loop_m: Math.round(len), first_m: Math.round(first.len) });
  });
}

test('near: enter 1.8m, keep until 2.6m (hysteresis), nearest wins', () => {
  const P = [{ n: 1, stand: { x: 0, z: 0 } }, { n: 2, stand: { x: 5, z: 0 } }];
  assert.equal(WayCross.nearPlaque(P, 0.5, 0, null).n, 1);
  assert.equal(WayCross.nearPlaque(P, 2.2, 0, null), null);
  assert.equal(WayCross.nearPlaque(P, 2.2, 0, P[0]).n, 1);
  assert.equal(WayCross.nearPlaque(P, 2.7, 0, P[0]), null);
  assert.equal(WayCross.nearPlaque(P, 4.0, 0, P[0]).n, 2);
});

test.after(() => { if (rows.length) console.table(rows); });
