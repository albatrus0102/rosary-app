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
    // 판끼리 1.6m 이상(먼저 2.2m 로 고르고 모자라면 1.6m)
    for (let i = 0; i < 14; i++) for (let j = i + 1; j < 14; j++) {
      assert.ok(Math.hypot(P[i].x - P[j].x, P[i].z - P[j].z) >= 1.55, `${i + 1}처·${j + 1}처가 너무 가까움`);
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

// ---------------- 그림 연작(대체 성화): 성당별 아틀라스 로드·폴백·해제 ----------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const churchDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/church');

// 가짜 문서: <script src> 를 붙이면 실제 파일을 읽어 window(root) 에서 실행한다. fail 에 든 파일은 onerror.
function fakeDoc(rootObj, fail = new Set()) {
  const tags = [];
  return {
    tags,
    createElement: () => ({ parentNode: null }),
    head: {
      appendChild(s) {
        s.parentNode = this; tags.push(s);
        queueMicrotask(() => {
          const f = path.join(churchDir, s.src);
          if (fail.has(s.src) || !fs.existsSync(f)) { s.onerror(); return; }
          new Function('window', fs.readFileSync(f, 'utf8'))(rootObj);
          s.onload();
        });
      },
      removeChild(s) { const i = tags.indexOf(s); if (i >= 0) tags.splice(i, 1); s.parentNode = null; }
    }
  };
}

test('series: every church maps to a bundled atlas pack; default is fugel', () => {
  const S = CrossData.series;
  assert.equal(S.default, 'fugel');
  assert.equal(S.packs.fugel.file, 'cross_pack.js');
  for (const c of churches) {
    const sid = S.churches[c.id];
    assert.ok(sid && S.packs[sid], `${c.id} 연작 배정`);
  }
  for (const [id, p] of Object.entries(S.packs)) {
    const f = path.join(churchDir, p.file);
    assert.ok(fs.existsSync(f), p.file);
    assert.ok(fs.statSync(f).size < 150 * 1024, `${p.file} 150KB 미만`);
    const src = fs.readFileSync(f, 'utf8');
    assert.ok(src.includes('data:image/webp;base64,'), id);
    if (id !== 'fugel') assert.ok(src.includes(`ChurchCrossPacks || {})["${id}"]`), `${id} 등록 이름`);
  }
  // 성당마다 다른 그림: 연작이 4개 이상 쓰인다
  assert.ok(new Set(Object.values(S.churches)).size >= 4);
});

test('series loader: loads the church series only, releases the previous one', async () => {
  const rootObj = { ChurchCrossData: CrossData, console: { warn() {} } };
  const doc = fakeDoc(rootObj);
  const PL = WayCross.packLoader(rootObj, doc);
  assert.deepEqual(PL.resident(), []);
  const a = PL.seriesFor('milan');
  assert.equal(a.id, CrossData.series.churches.milan);
  PL.release(a.id);
  const pa = await PL.load(a.id);
  assert.equal(pa.id, a.id); assert.equal(pa.cols, 7); assert.equal(pa.rows, 2);
  assert.deepEqual(PL.resident(), [a.id]);
  assert.equal(doc.tags.length, 1);
  // 다른 성당으로: 앞 연작의 <script>·문자열이 내려가고 새 연작 하나만 남는다
  const b = PL.seriesFor('stpeter');
  assert.notEqual(b.id, a.id);
  PL.release(b.id);
  assert.deepEqual(PL.resident(), []);
  assert.equal(doc.tags.length, 0);
  await PL.load(b.id);
  assert.deepEqual(PL.resident(), [b.id]);
  // 기본 연작 성당: cross_pack.js(window.ChurchCrossPack)
  const d = PL.seriesFor('myeongdong');
  assert.equal(d.id, 'fugel'); assert.ok(d.isDefault);
  PL.release(d.id);
  const pd = await PL.load(d.id);
  assert.equal(pd, rootObj.ChurchCrossPack);
  assert.deepEqual(PL.resident(), ['fugel']);
  assert.equal(doc.tags.length, 1);
  // 같은 연작을 다시 청하면 다시 읽지 않는다
  const loads = PL.stats.loads;
  await PL.load(d.id);
  assert.equal(PL.stats.loads, loads);
  // 모르는 성당은 기본 연작
  assert.equal(PL.seriesFor('nowhere').id, 'fugel');
  PL.release(null);
  assert.deepEqual(PL.resident(), []);
  assert.equal(rootObj.ChurchCrossPack, null);
});

test('series loader: falls back to the default series when a pack fails; rejects when the default fails too', async () => {
  const rootObj = { ChurchCrossData: CrossData, console: { warn() {} } };
  const bad = CrossData.series.packs[CrossData.series.churches.florence].file;
  const PL = WayCross.packLoader(rootObj, fakeDoc(rootObj, new Set([bad])));
  const p = await PL.load(CrossData.series.churches.florence);
  assert.equal(p.id, 'fugel');
  assert.equal(PL.stats.fallbacks, 1);
  assert.deepEqual(PL.resident(), ['fugel']);
  const root2 = { ChurchCrossData: CrossData, console: { warn() {} } };
  const PL2 = WayCross.packLoader(root2, fakeDoc(root2, new Set([bad, 'cross_pack.js'])));
  await assert.rejects(PL2.load(CrossData.series.churches.florence));
  assert.deepEqual(PL2.resident(), []);
  // cross_data.js 에 series 가 없던 옛 데이터: 푸겔만
  const root3 = { ChurchCrossData: { stations: [] } };
  assert.equal(WayCross.packLoader(root3, fakeDoc(root3)).seriesFor('milan').id, 'fugel');
});
