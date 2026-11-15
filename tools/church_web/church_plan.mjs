// 성당 씬의 '평면 위상' 조회(H-1 구조도 대조, docs/church/STRUCTURE_AUDIT_ROME.md) — church_structure.mjs(H-2: 키트 호출·설치물 표)의 짝.
// 씬 코드를 고치지 않고 빌더를 Node(vm)에서 그대로 돌려 (1) 걷기 지도(충돌체로 막힌 칸/걸을 수 있는 칸의 문자 평면도),
// (2) 기둥 줄(같은 x 줄의 z 목록 = 베이 수·간격), (3) 큰 충돌체·높은 바닥 구역을 낸다. 실제 평면도와 '갈 수 있는 곳'을 견줄 때 쓴다.
//
// 사용: node tools/church_web/church_plan.mjs stpeter              # 걷기 지도(칸 1 m) + 기둥 줄 + 큰 충돌체
//       node tools/church_web/church_plan.mjs stpeter --cell 0.5   # 칸 크기
//       node tools/church_web/church_plan.mjs stpeter --no-map     # 지도 없이 표만
// 지도: 위 = 제대 쪽(−z), 아래 = 입구(+z), 왼쪽 = −x.  '#' 막힘  '.' 걸음  'o' 원형 충돌체(기둥)  '^' 높은 바닥(단)  's' 좌석 줄  'S' 스폰  'c' 촛불대
// 단위는 앱 미터(= 실제 m × scalePercent/100). 한계: 키트 column 을 거치지 않은 손 지은 기둥은 '기둥 줄'에 안 잡히고 충돌체로만 보인다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');

function makeSandbox() {   // church_openings.mjs 와 같은 가짜 canvas 샌드박스
  const sandbox = { console, performance, setTimeout, clearTimeout };
  sandbox.window = sandbox; sandbox.self = sandbox;
  const noop = () => {};
  const ctx2d = new Proxy(noop, {
    get: (t, k) => {
      if (k === 'canvas') return {};
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: noop });
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData' || k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      return noop;
    },
    set: () => true
  });
  sandbox.document = {
    createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctx2d, toDataURL: () => '', addEventListener: noop }),
    getElementById: () => null, readyState: 'complete', addEventListener: noop, body: { insertAdjacentHTML: noop }
  };
  sandbox.location = { search: '' };
  sandbox.navigator = { userAgent: 'node' };
  sandbox.Image = function () {};
  vm.createContext(sandbox);
  return sandbox;
}
const r2 = (v) => Math.round(v * 100) / 100 + 0;

export function measurePlan(id, opts = {}) {
  const sb = makeSandbox();
  const run = (f) => vm.runInContext(fs.readFileSync(path.join(assets, f), 'utf8'), sb, { filename: f });
  ['three.min.js', 'three_extras.js', 'palette.js', 'layouts.js', 'shrine_places.js', 'shrine.js', 'scene_logic.js', 'stations.js', 'geo.js', 'photos.js', 'kit_tex.js', 'kit.js', 'glass_placements.js', 'cross_data.js', 'way_cross.js', 'liturgy.js', 'ch_' + id + '.js'].forEach(run);
  const b = sb.ChurchBuilders[id];
  if (!b) throw new Error('빌더 없음: ' + id);
  const ctx = sb.ChurchKit.createContext({ layout: b.layout, quality: opts.quality || 'low' });
  const columns = [];
  const col = ctx.column.bind(ctx);
  ctx.column = function (o) { columns.push({ x: r2(o.x), z: r2(o.z), y: o.y || 0, h: o.h, r: o.r === undefined ? 0.4 : o.r, style: o.style || 'round', capital: o.capital || '-', collide: o.collide !== false }); return col(o); };
  b.build(ctx);
  const S = ctx._;
  const bands = sb.ChurchLogic && sb.ChurchLogic.rowBands ? sb.ChurchLogic.rowBands(b.layout) : [];
  return { id, layout: b.layout, columns, colliders: S.colliders.slice(), zones: S.zones.slice(), bands };
}

function printPlan(id, o) {
  const m = measurePlan(id), L = m.layout, B = L.bounds, k = (L.scalePercent || 100) / 100, cell = o.cell, rad = 0.3;
  console.log(`# ${id}  scale ${L.scalePercent || 100}%  bounds x ${B.x0}…${B.x1}  z ${B.z0}…${B.z1}  (실제 환산 ${r2((B.x1 - B.x0) / k)} × ${r2((B.z1 - B.z0) / k)} m)`);
  if (o.map) {
    console.log(`걷기 지도(칸 ${cell} m; 위 = 제대 −z, 왼쪽 = −x):`);
    const stands = (L.candles && L.candles.stands) || [];
    for (let z = B.z0; z <= B.z1 + 1e-6; z += cell) {
      let s = '';
      for (let x = B.x0; x <= B.x1 + 1e-6; x += cell) {
        let ch = '.';
        for (const z0 of m.zones) if (x >= z0.x0 && x <= z0.x1 && z >= z0.z0 && z <= z0.z1 && z0.y > 0.05) { ch = '^'; break; }
        for (const bd of m.bands) if (bd.x0 !== undefined && x >= bd.x0 && x <= bd.x1 && z >= bd.z0 - 0.5 && z <= bd.z1 + 0.5) { ch = 's'; break; }
        for (const c of m.colliders) {
          if (c.r !== undefined) { if (Math.hypot(x - c.x, z - c.z) < c.r + rad) { ch = 'o'; break; } }
          else if (x > c.x0 - rad && x < c.x1 + rad && z > c.z0 - rad && z < c.z1 + rad) { ch = '#'; break; }
        }
        for (const st of stands) if (Math.abs(x - st.x) <= cell / 2 && Math.abs(z - st.z) <= cell / 2) ch = 'c';
        if (Math.abs(x - L.spawn.x) <= cell / 2 && Math.abs(z - L.spawn.z) <= cell / 2) ch = 'S';
        s += ch;
      }
      console.log(String(r2(z)).padStart(7) + ' ' + s);
    }
  }
  const grp = new Map();
  for (const c of m.columns) { const key = `${c.style} r${c.r} h${c.h} y${c.y} cap:${c.capital}${c.collide ? '' : ' (충돌 없음)'}`; if (!grp.has(key)) grp.set(key, []); grp.get(key).push(c); }
  console.log(`\n기둥(ctx.column) ${m.columns.length}개:`);
  for (const [key, arr] of grp) {
    console.log(`- ${key}: ${arr.length}개 (높이 실제 ${r2(arr[0].h / k)} m, 지름 실제 ${r2(arr[0].r * 2 / k)} m)`);
    const lines = new Map();
    for (const c of arr) { if (!lines.has(c.x)) lines.set(c.x, []); lines.get(c.x).push(c.z); }
    const ls = [...lines.entries()].sort((a, b) => a[0] - b[0]);
    for (const [x, zs] of ls.slice(0, 12)) { zs.sort((a, b) => a - b); const d = zs.length > 1 ? r2((zs[zs.length - 1] - zs[0]) / (zs.length - 1)) : 0; console.log(`    x=${x}: ${zs.length}개, 평균 간격 ${d} (실제 ${r2(d / k)}) z=[${zs.join(', ')}]`); }
    if (ls.length > 12) console.log(`    … x 줄 ${ls.length}개`);
  }
  const aabb = m.colliders.filter((c) => c.x0 !== undefined), circ = m.colliders.filter((c) => c.r !== undefined);
  console.log(`\n충돌체 ${m.colliders.length} (상자 ${aabb.length}, 원 ${circ.length}); 높은 바닥 구역 ${m.zones.length}`);
  const big = aabb.map((c) => ({ c, a: (c.x1 - c.x0) * (c.z1 - c.z0) })).filter((e) => e.a >= o.minArea).sort((a, b) => b.a - a.a).slice(0, 30);
  console.log(`큰 상자(≥ ${o.minArea} m²):`);
  for (const e of big) console.log(`  x ${r2(e.c.x0)}…${r2(e.c.x1)}  z ${r2(e.c.z0)}…${r2(e.c.z1)}  (${r2(e.a)} m²)`);
  if (m.zones.length) { console.log('높은 바닥:'); for (const z of m.zones.slice(0, 30)) console.log(`  x ${r2(z.x0)}…${r2(z.x1)}  z ${r2(z.z0)}…${r2(z.z1)}  y ${r2(z.y)}`); }
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const args = process.argv.slice(2), val = (n, d) => { const i = args.indexOf(n); return i >= 0 ? parseFloat(args[i + 1]) : d; };
  const ids = args.filter((a) => !a.startsWith('--') && !/^[0-9.]+$/.test(a));
  if (!ids.length) console.log('사용: node tools/church_web/church_plan.mjs <성당 id> [--cell 1] [--no-map] [--min-area 6]');
  for (const id of ids) printPlan(id, { cell: val('--cell', 1), map: !args.includes('--no-map'), minArea: val('--min-area', 6) });
}
