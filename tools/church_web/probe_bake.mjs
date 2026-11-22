// probe_bake.mjs — 성당 안 반사 탐침(probe_fx.js)의 자리와 박스 투영 상자를 지오메트리 광선으로 잰다(docs/church/RENDER_V4.md §2).
// 결과: assets/church/probe_places.js (성당마다 탐침 2개: [0] 신랑 가운데, [1] 성소(제대 스테이션 2m 앞쪽), 상자 = 탐침에서 ±x·±z·위로 쏜 광선 7개씩의 중앙값).
// 사용: node tools/church_web/probe_bake.mjs [성당 ...] [--check]   (--check: 다시 재어 파일과 같은지만, 다르면 종료 코드 1)
// 지오메트리가 조금 바뀌어도 상자는 대략 맞다(그래서 AO 처럼 검사합으로 묶지 않는다). 벽·천장 자리를 크게 바꿨을 때 다시 돌린다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBVH, makeTracer } from './ao_bvh.mjs';
import { collect, loadForBake, ASSETS } from './ao_bake.mjs';

const r2 = (v) => Math.round(v * 100) / 100;
function median(a) { const s = a.filter((x) => x > 0).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : -1; }

/** 한 성당: {p:[[x,y,z]×2], box:[[x0,y0,z0,x1,y1,z1]×2]} */
export function placeProbes(c, H) {
  const col = collect(c), bvh = buildBVH(col.tris, col.fn, col.two), trace = makeTracer(bvh);
  const L = c.layout, logic = H.Logic.create(L, { colliders: c.colliders, zones: c.zones });
  const cb = c.ctx._.cameraBounds || { x0: L.bounds.x0, x1: L.bounds.x1, z0: L.bounds.z0, z1: L.bounds.z1, yMax: 9 };
  let alt = null;
  try { alt = H.Stations.create(logic).stations().altar; } catch (e) { alt = null; }
  const sp = L.spawn || { x: 0, z: 0 };
  const az = alt ? alt.z - 2 : L.bounds.z0 + (L.bounds.z1 - L.bounds.z0) * 0.2, ax = alt ? alt.x : 0;
  const pts = [[(sp.x + ax) / 2, (sp.z + az) / 2], [ax, az]];
  const out = { p: [], box: [] };
  for (const [x, z] of pts) {
    let fy = 0; try { fy = logic.floorY(x, z) || 0; } catch (e) { fy = 0; }
    const y = fy + 2.4, R = 80;
    // ±x·±z: 수직축에 수직인 방향으로 ±3m 에 펼친 7개 광선(기둥 하나에 걸려도 중앙값은 벽), 위: 3×3 에서 ±2m
    const dist = (dx, dy, dz) => {
      const ds = [];
      for (let k = -3; k <= 3; k++) {
        const ox = x + (dx ? 0 : k), oz = z + (dz ? 0 : k), oy = dy ? y : y + (k * 0.25);
        ds.push(trace(ox, oy, oz, dx || 1e-7, dy || 1e-7, dz || 1e-7, 0.05, R, null));
      }
      return median(ds);
    };
    const up = (() => { const ds = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) ds.push(trace(x + i * 2, y, z + j * 2, 1e-7, 1, 1e-7, 0.05, R, null)); return median(ds); })();
    const px = dist(1, 0, 0), nx = dist(-1, 0, 0), pz = dist(0, 0, 1), nz = dist(0, 0, -1);
    const clampX = (v, d) => (v > 0 ? v : d);
    const box = [
      Math.max(cb.x0 - 2, x - clampX(nx, x - cb.x0)), fy - 0.05, Math.max(cb.z0 - 2, z - clampX(nz, z - cb.z0)),
      Math.min(cb.x1 + 2, x + clampX(px, cb.x1 - x)), fy + (up > 0 ? up + 2.4 : Math.max(8, cb.yMax || 9)), Math.min(cb.z1 + 2, z + clampX(pz, cb.z1 - z)),
    ].map(r2);
    out.p.push([r2(x), r2(y), r2(z)]);
    out.box.push(box);
  }
  return out;
}

export function render(all) {
  const ids = Object.keys(all).sort();
  return '/* probe_places.js — tools/church_web/probe_bake.mjs 로 생성(직접 고치지 말 것). 성당 안 반사 탐침(probe_fx.js) 자리·박스 투영 상자.\n' +
    '   p: [[x,y,z] 신랑, [x,y,z] 성소], box: 탐침마다 [x0,y0,z0,x1,y1,z1] */\n' +
    'window.ChurchProbePlaces = {\n' + ids.map((id) => '  ' + id + ': ' + JSON.stringify(all[id])).join(',\n') + '\n};\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), ids = a.filter((x) => !x.startsWith('--')), check = a.includes('--check');
  const H = await loadForBake(ids.length ? ids : null);
  const all = {};
  for (const c of H.churches) { all[c.id] = placeProbes(c, H); console.log(c.id, JSON.stringify(all[c.id])); }
  const f = path.join(ASSETS, 'probe_places.js'), text = render(all);
  if (check) { const same = fs.existsSync(f) && fs.readFileSync(f, 'utf8') === text; console.log(same ? 'ok' : 'STALE'); process.exit(same ? 0 : 1); }
  if (ids.length && fs.existsSync(f)) {   // 일부만 다시 쟀으면 나머지는 파일 값 그대로
    const sb = { window: {} }; new Function('window', fs.readFileSync(f, 'utf8'))(sb.window);
    const old = sb.window.ChurchProbePlaces || {};
    for (const k in old) if (!all[k]) all[k] = old[k];
  }
  fs.writeFileSync(f, render(all));
  console.log('wrote', f);
}
