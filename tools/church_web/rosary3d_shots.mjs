// 사용: node tools/church_web/rosary3d_shots.mjs [outDir] [ids,...] — 묵주 3D(assets/rosary3d) C안·A안을 360×800 DPR2 화면 안에 찍는다.
// 기도 화면 틀(머리줄·신비·진행·제목·버튼)은 tools/rosary3d/preview.html 이 흉내 내고, 3D 는 실제 페이지를 iframe 으로 띄운다.
// 프레임 비용(ms)·그리기 호출·메모리(형상·텍스처 수)도 함께 적는다.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const preview = path.resolve(here, '../rosary3d/preview.html');
const out = process.argv[2] || '/tmp/rosary_shots';
const ids = (process.argv[3] || 'olive,pearl,crystal').split(',');
const theme = process.argv[4] || 'navy';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
for (const id of ids) {
  for (const view of ['c', 'a']) {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => errors.push(id + ' pageerror ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(id + ' ' + m.text()); });
    await page.goto('file://' + preview + `?id=${id}&view=${view}&step=${view === 'c' ? 10 : 30}&theme=${theme}`);
    await page.waitForFunction(() => document.querySelector('iframe'));
    let frame; while (!(frame = page.frames().find((f) => f.url().includes('rosary3d/index.html')))) await page.waitForTimeout(50);
    await frame.waitForFunction(() => window.RosaryAPI);
    await frame.evaluate(([id, view, step, theme]) => window.RosaryAPI.init({ rosary: id, view, step, theme, quality: 'high' }), [id, view, view === 'c' ? 10 : 30, theme]);
    await frame.waitForFunction(() => window.__rosary && window.__rosary.R && window.__rosary.settled(), null, { timeout: 180000 });
    await page.waitForTimeout(300);
    const st = await frame.evaluate(() => { const t0 = performance.now(); for (let i = 0; i < 5; i++) window.__rosary.renderOnce(); return { per: (performance.now() - t0) / 5, ...window.__rosary.stats() }; });
    const file = path.join(out, `rosary_${id}_${view}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 80 });
    console.log(id, view, JSON.stringify({ frameMs: +st.per.toFixed(1), calls: st.calls, tris: st.tris, geo: st.geometries, tex: st.textures, buildMs: st.built && st.built.ms }), (fs.statSync(file).size / 1024).toFixed(0) + 'KB');
    await page.close();
  }
}
await browser.close();
if (errors.length) { console.log('ERRORS', errors.slice(0, 10)); process.exitCode = 1; }
