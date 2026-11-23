// 창 스트리밍 규칙(glass_stream.js)·렌더 구조 예산 고정(PERF_SCALE.md). 렌더 수치(프레임 ms 등)는 glass_stress.mjs·perf_compare.mjs(헤드리스).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { loadChurches } from './church_harness.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');
const sb = { location: { search: '' } }; sb.window = sb;
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(assets, 'glass_stream.js'), 'utf8'), sb);
const GS = sb.ChurchGlassStream;

// 측랑 양쪽 벽에 창 n개(베이 간격 4m, 폭 1.5 × 높이 3m) + 카메라는 신랑 가운데에서 제대를 본다
function aisle(n, { aspectRose = 0 } = {}) {
  const g = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, z = 30 - Math.floor(i / 2) * 4;
    const rose = aspectRose && i % 7 === 0;
    g.push({ id: 'w' + i, slots: [{ x: side * 12, y: 4, z, w: rose ? 3 : 1.5, h: 3 }], near: 'none', mb: rose ? 5.3 : 2.7, used: 0 });
  }
  return g;
}
const cam = (z, dir = [0, 0, -1]) => ({ x: 0, y: 1.7, z, dir, cosHalf: Math.cos(0.9) });
const FOCAL = 1600 / (2 * Math.tan(31 * Math.PI / 180));   // 360×800 @ DPR 2, 세로 시야 62°

test('plan never asks for more 1k textures (count and MB) than the tier budget, even with 96 windows', () => {
  for (const tier of ['high', 'mid', 'low']) {
    const bud = GS.budget(tier), groups = aisle(96, { aspectRose: 1 });
    for (let z = 34; z >= -30; z -= 4) {
      const r = GS.plan(groups, { cam: cam(z), focal: FOCAL, cell: bud.cell }, bud);
      assert.ok(r.want.length <= bud.near, `${tier} z${z}: want ${r.want.length} > ${bud.near}`);
      const mb = r.want.reduce((s, id) => s + groups.find((g) => g.id === id).mb, 0);
      assert.ok(mb <= bud.nearMb + 1e-9, `${tier} z${z}: ${mb}MB > ${bud.nearMb}MB`);
      // 적용: 원하는 것은 올라갔다고 치고, 해제된 것은 내린다
      for (const id of r.evict) groups.find((g) => g.id === id).near = 'none';
      for (const id of r.want) groups.find((g) => g.id === id).near = 'ready';
      const res = groups.filter((g) => g.near === 'ready');
      assert.ok(res.length <= bud.near, `${tier} z${z}: resident ${res.length}`);
      assert.ok(res.reduce((s, g) => s + g.mb, 0) <= bud.nearMb + 1e-9, `${tier} z${z}: resident MB`);
    }
  }
});

test('turning the camera alone does not start loads or evictions (no streaming work on rotation)', () => {
  const bud = GS.budget('high'), groups = aisle(40);
  const r0 = GS.plan(groups, { cam: cam(10), focal: FOCAL, cell: bud.cell }, bud);
  for (const id of r0.want) groups.find((g) => g.id === id).near = 'ready';
  for (const dir of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0.7, 0, -0.7]]) {
    const r = GS.plan(groups, { cam: cam(10, dir), focal: FOCAL, cell: bud.cell }, bud);
    assert.deepEqual(Array.from(r.load), [], 'no new loads when only the view direction changes ' + dir);
    assert.deepEqual(Array.from(r.evict), [], 'no evictions when only the view direction changes ' + dir);
  }
});

test('hysteresis: a resident window between the stay and enter thresholds is kept, a new one is not loaded', () => {
  const bud = GS.budget('high');
  // 창 크기 3m: px = 3·focal/d. ENTER·cell 과 STAY·cell 사이가 되는 거리
  const d = 3 * FOCAL / (bud.cell * (GS.ENTER + GS.STAY) / 2);
  const mk = (near) => [{ id: 'a', slots: [{ x: 0, y: 1.7, z: -d, w: 1.5, h: 3 }], near, mb: 2.7 }];
  assert.deepEqual(Array.from(GS.plan(mk('ready'), { cam: cam(0), focal: FOCAL, cell: bud.cell }, bud).want), ['a']);
  assert.deepEqual(Array.from(GS.plan(mk('none'), { cam: cam(0), focal: FOCAL, cell: bud.cell }, bud).want), []);
});

test('over budget: evicts the least useful (lowest score, then least recently used) resident textures', () => {
  const bud = { near: 2, nearMb: 100, cell: 256 };
  const g = [0, 1, 2, 3].map((i) => ({ id: 'g' + i, slots: [{ x: 0, y: 1.7, z: -(2 + i * 3), w: 1.5, h: 3 }], near: 'ready', mb: 2.7, used: i }));
  const r = GS.plan(g, { cam: cam(0), focal: FOCAL, cell: bud.cell }, bud);
  assert.deepEqual(Array.from(r.want), ['g0', 'g1']);
  assert.deepEqual(Array.from(r.evict).sort(), ['g2', 'g3']);
});

test('far atlas layout: cells do not overlap, keep the photo aspect, stay inside, power of two when asked', () => {
  const items = Array.from({ length: 55 }, (_, i) => ({ id: 'w' + i, aspect: [0.27, 0.5, 1, 1.75, 0.69][i % 5] }));
  for (const pot of [false, true]) {
    const L = GS.layoutAtlas(items, 256, { pot, cols: 8 });
    if (pot) { assert.equal(L.w & (L.w - 1), 0); assert.equal(L.h & (L.h - 1), 0); }
    const rs = items.map((it) => ({ it, r: L.rects[it.id] }));
    for (const { it, r } of rs) {
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= L.w && r.y + r.h <= L.h);
      assert.ok(Math.abs(r.w / r.h - it.aspect) / it.aspect < 0.03, `aspect ${r.w}/${r.h} vs ${it.aspect}`);
      assert.ok(r.u0 >= 0 && r.u1 <= 1 && r.v0 >= 0 && r.v1 <= 1 && r.u1 > r.u0 && r.v1 > r.v0);
    }
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i].r, b = rs[j].r;
      assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, 'overlap');
    }
    // 55창 먼 층(256px 칸) GPU 메모리: 밉맵 포함 25MB 이하
    assert.ok(GS.texMb(L.w, L.h) <= 25, 'far atlas ' + GS.texMb(L.w, L.h).toFixed(1) + 'MB');
  }
});

test('stained glass GPU budget per tier with streaming stays far below loading every window (55 windows)', () => {
  const all1k = 55 * 2.7;   // 예전 방식: 창 id 마다 1k 상주(세로창 평균 2.7MB)
  for (const tier of ['high', 'mid', 'low']) {
    const b = GS.budget(tier), far = GS.texMb(8 * b.cell, 7 * b.cell);
    assert.ok(far + b.nearMb < all1k * 0.6, `${tier}: ${far + b.nearMb}MB vs ${all1k}MB`);
  }
});

test('render structure guards: one render per vsync, merged post passes, single reflector per floor height, plane merge', () => {
  const main = fs.readFileSync(path.join(assets, 'main.js'), 'utf8');
  assert.ok(main.includes('if (now === App.lastNow) return;'), 'duplicate rAF chains are dropped');
  // (2026-11-23) the same line also stamps App.loopT: kick() treats a chain that has not run for 1 s as dead (scene_stall.test.mjs)
  assert.ok(/App\.rafOn = true;( App\.loopT = performance\.now\(\);)?\n\s+resize\(\);/.test(main), 'rafOn is set before the first resize() (resize→kick used to start a 2nd loop)');
  const render = fs.readFileSync(path.join(assets, 'render.js'), 'utf8');
  assert.ok(render.includes('bloom.render = bloomRender') && render.includes('if (postMerge) return;'), 'AO and bloom are composited in the final pass');
  const world = fs.readFileSync(path.join(assets, 'world.js'), 'utf8');
  assert.ok(world.includes('Math.abs(groups[i].y - f.y) <= 0.03'), 'coplanar floors share one reflector');
  assert.ok(world.includes('dd < SHADOW_COS'), 'shadow map is redrawn only when the sun moved');
  const { churches } = loadChurches();
  const sp = churches.find((c) => c.id === 'stpeter');
  sp.prepare();
  let planes = 0; sp.ctx.root.traverse((o) => { if (o.isMesh && o.geometry.type === 'PlaneGeometry') planes++; });
  assert.ok(planes <= 4, 'St Peter standalone textured planes after merge: ' + planes);
});

test('walking past: an in-flight load that is still a candidate is not cancelled; loads + residents never exceed the budget', () => {
  const bud = { near: 4, nearMb: 100, cell: 128 };
  const groups = aisle(30);
  let cancelled = 0;
  for (let z = 34; z >= -26; z -= 1) {   // 1m 씩 걷기
    const r = GS.plan(groups, { cam: cam(z), focal: FOCAL / 2, cell: bud.cell }, bud);
    for (const id of r.evict) { const g = groups.find((x) => x.id === id); if (g.near === 'loading') cancelled++; g.near = 'none'; }
    for (const g of groups) if (g.near === 'loading') g.near = 'ready';   // 지난번에 읽기 시작한 것은 이제 다 읽혔다
    for (const id of Array.from(r.load).slice(0, 1)) groups.find((x) => x.id === id).near = 'loading';   // 한 번에 하나씩 읽는다
    const held = groups.filter((g) => g.near !== 'none').length;
    assert.ok(held <= bud.near, `z${z}: ${held} > ${bud.near}`);
  }
  assert.equal(cancelled, 0, 'no load cancelled while walking at walking pace');
});
