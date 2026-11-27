// 아바타 실험실 한 장: node tools/lab_shot.mjs "<쿼리>" out.png [--size 1280x720]
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2), q = args[0] || '', out = args[1] || 'lab.png';
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [W, H] = opt('--size', '1280x720').split('x').map(Number);
const { srv, url } = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
await p.goto(url + 'avatar_lab.html?' + q);
await p.waitForFunction(() => window.__lab && window.__lab.done, null, { timeout: 240000 });
await p.waitForTimeout(500);
await p.screenshot({ path: out });
console.log(out, errs.length ? errs.slice(0, 6).join('\n') : 'errors 0');
await b.close(); srv.close();
