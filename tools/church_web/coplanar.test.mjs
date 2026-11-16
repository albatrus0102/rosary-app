// 깜빡임(z-fighting) 정적 회귀 시험 — 사용자 제보 "성 바오로 대성전 발 앞의 줄이 깜빡거린다"(2026-11-16).
// 원인: 후진 문지방(벽 개구부 밑면, y = SY)이 후진 바닥판(ctx.floor, y = SY)과 같은 높이·같은 자리에 한 장 더 깔려 두 면이 같은 깊이로 뭉개졌다.
// 이 시험은 성당 빌더를 Node 에서 돌려 _prepare 뒤 실제 면을 모아 두 가지를 본다.
//  1) 걷는 높이(y -1mm … 1m: 바닥·문지방·계단 윗면·단·낮은 가구)에서, 위를 보는 두 면이 1mm 이내 같은 높이로 겹치며(넓이 0.3㎡ 이상) 색·재질이 다르면 안 된다.
//  2) 반사판(Reflector, 바닥 위 6mm 에 깔린다)이 겹치는 다른 높이의 바닥·단 윗면이 반사판과 ±2mm 안에 있으면 안 된다(깊이가 뭉개져 반사판 가장자리가 깜빡인다). 단이 더 높거나(성소 단) 1cm 덮개 바닥이면 반사판을 가려 안전하다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadChurches } from './church_harness.mjs';
import { horizontalTris, findCoplanar, TOL, MIN_AREA } from './coplanar.mjs';

const { churches } = loadChurches();
const WALK_MIN = -0.001, WALK_MAX = 1.0;

for (const c of churches) {
  test(`${c.id}: 걷는 높이에서 같은 높이로 겹친 위쪽 면(z-fighting)이 없다`, () => {
    const hits = findCoplanar(horizontalTris(c)).filter((h) => h.y >= WALK_MIN && h.y <= WALK_MAX);
    const lines = hits.slice(0, 8).map((h) => `y=${h.y} 넓이 ${h.area}㎡ (${h.at.map((v) => v.toFixed(2)).join(', ')}) ${h.a.mesh.name || h.a.mesh.geometry.type}/${h.a.col} ↔ ${h.b.mesh.name || h.b.mesh.geometry.type}/${h.b.col}`);
    assert.equal(hits.length, 0, `${hits.length}곳 (허용 높이차 ${TOL * 1000}mm, 최소 넓이 ${MIN_AREA}㎡)\n  ` + lines.join('\n  '));
  });

  test(`${c.id}: 반사판과 같은 높이(±2mm)인 다른 바닥 윗면이 없다`, () => {
    const S = c.ctx._;
    c.prepare();
    const bad = [];
    for (const f of S.floors) {
      const mirror = f.y + 0.006;   // world.js buildReflectors: 반사판은 바닥 위 6mm
      for (const g of S.floorRects) {
        if (Math.abs(g.y - f.y) <= 0.0015 || Math.abs(g.y - mirror) >= 0.002) continue;   // 반사판 높이 ±2mm 안(바닥 y + 6mm 와 같은 높이 — 반사판과 깊이가 뭉개진다). 1cm 덮개 바닥(밀라노·성 베드로의 y+0.01 바닥)은 4mm 위라 반사판을 가린다
        const w = Math.min(f.x1, g.x1) - Math.max(f.x0, g.x0), d = Math.min(f.z1, g.z1) - Math.max(f.z0, g.z0);
        if (w > 0.05 && d > 0.05 && w * d > 0.1) bad.push(`반사판(y=${mirror.toFixed(3)}, [${f.x0},${f.x1}]x[${f.z0},${f.z1}]) 와 바닥 y=${g.y} [${g.x0},${g.x1}]x[${g.z0},${g.z1}] 가 ${(w * d).toFixed(2)}㎡ 겹치며 ${(Math.abs(g.y - mirror) * 1000).toFixed(1)}mm 차이`);
      }
    }
    assert.equal(bad.length, 0, bad.slice(0, 5).join('\n'));
  });
}

test('시험 자체 점검: 같은 높이로 겹친 두 면을 실제로 찾아낸다', () => {
  const sq = (x0, z0, x1, z1) => [[[x0, z0], [x1, z0], [x1, z1]], [[x0, z0], [x1, z1], [x0, z1]]];
  const mk = (y, key, tris) => tris.map((tri) => ({ y, up: 1, tri, mesh: { name: key, geometry: { type: 'x' } }, col: key, key }));
  assert.ok(findCoplanar([...mk(0.5, 'a', sq(0, 0, 2, 2)), ...mk(0.5005, 'b', sq(1, 1, 3, 3))]).length > 0, '1mm 이내 겹침을 못 찾는다');
  assert.equal(findCoplanar([...mk(0.5, 'a', sq(0, 0, 2, 2)), ...mk(0.52, 'b', sq(1, 1, 3, 3))]).length, 0, '2cm 떨어진 면을 잘못 잡는다');
  assert.equal(findCoplanar([...mk(0.5, 'a', sq(0, 0, 2, 2)), ...mk(0.5, 'a', sq(1, 1, 3, 3))]).length, 0, '같은 색 면은 걸리지 않아야 한다');
});
