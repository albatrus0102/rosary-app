// 한 장 찍기: node tools/shot.mjs "<쿼리>" 출력.png [--size 960x540] [--wait 2500]
// 예: node tools/shot.mjs "hour=21&thumb=0" /tmp/a.png
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');   // 전역(NODE_PATH) 설치도 찾는다
import { serve } from './serve.mjs';
const args = process.argv.slice(2);
const q = args[0] || '', out = args[1] || 'shot.png';
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [W, H] = opt('--size', '960x540').split('x').map(Number), wait = +opt('--wait', 3000);
const { srv, url } = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.goto(url + 'test.html?hideui=1&autotier=0&quiet=1&' + q);
await p.waitForFunction(() => (window.__roomEvents || []).some((e) => e.e === 'firstFrame'), null, { timeout: 60000 });
await p.waitForTimeout(wait);
if (/[?&]frames=/.test('&' + q)) await p.waitForFunction(() => window.__room && window.__room.done, null, { timeout: 180000 });
await p.screenshot({ path: out });
const info = await p.evaluate(() => { const a = window.__room; const r = a.R.renderer.info.render; return { calls: r.calls, tris: r.triangles, verts: a.world.stats.vertices, meshes: a.world.stats.meshes, fps: a.fps, tier: a.R.tier }; });
console.log(out, JSON.stringify(info), errs.length ? 'ERRORS:\n' + errs.join('\n') : 'errors 0');
await b.close(); srv.close();
process.exit(errs.length ? 1 : 0);
