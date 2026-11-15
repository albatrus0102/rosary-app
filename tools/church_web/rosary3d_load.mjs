// 사용: node tools/church_web/rosary3d_load.mjs — 묵주 14종을 차례로 실제 페이지에 올려(묵주 하나만 메모리에) 생성 시간·텍스처 용량·
// 그리기 호출·삼각형을 적고, 바꿀 때 이전 묵주가 정리되는지(형상·텍스처 수가 늘지 않는지) 확인한다. 콘솔 에러 0 필수.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const D = require('../../assets/rosary3d/defs.js');
const page0 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/rosary3d/index.html');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 360, height: 332 }, deviceScaleFactor: 2 });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto('file://' + page0);
await p.waitForFunction(() => window.RosaryAPI);
await p.evaluate(() => RosaryAPI.init({ rosary: 'olive', step: 10 }));
let fail = 0, mem = [];
for (const id of D.ORDER) {
  await p.evaluate((id) => RosaryAPI.setRosary({ id }), id);
  await p.waitForFunction((id) => __rosary.R && __rosary.R.def.id === id && __rosary.settled(), id, { timeout: 120000 });
  const r = await p.evaluate(() => {
    __rosary.renderOnce();
    const seen = new Set(); let bytes = 0;
    __rosary.R.group.traverse((o) => { const ms = o.material ? [].concat(o.material) : []; for (const m of ms) for (const k of ['map', 'bumpMap', 'roughnessMap', 'metalnessMap']) { const t = m[k]; if (t && !seen.has(t.uuid)) { seen.add(t.uuid); bytes += t.image.width * t.image.height * 4; } } });
    const s = __rosary.stats(); return { buildMs: s.built.ms, texKB: Math.round(bytes / 1024), calls: s.calls, tris: s.tris, geo: s.geometries, tex: s.textures, visible: __rosary.R.small.count + __rosary.R.big.count };
  });
  mem.push(r.geo);
  const ok = r.visible > 0 && r.calls > 0;
  if (!ok) fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + id.padEnd(11) + JSON.stringify(r));
}
// 묵주 하나만: 한 바퀴 돈 뒤 형상 수가 처음 것보다 크게 늘지 않는다
await p.evaluate(() => RosaryAPI.setRosary({ id: 'olive' }));
await p.waitForFunction(() => __rosary.R.def.id === 'olive' && __rosary.settled());
const g = await p.evaluate(() => { __rosary.renderOnce(); return __rosary.stats().geometries; });
console.log((g <= mem[0] + 2 ? 'PASS' : 'FAIL') + ' one rosary in memory (olive geometries ' + mem[0] + ' → after 14 swaps ' + g + ')'); if (g > mem[0] + 2) fail++;
if (errors.length) { console.log('ERRORS', errors.slice(0, 5)); fail++; }
await b.close();
process.exitCode = fail ? 1 : 0;
