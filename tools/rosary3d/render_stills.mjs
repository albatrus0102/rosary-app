// 사용: node tools/rosary3d/render_stills.mjs <outDir> [id,id,...]
// 3D 묵주 정의(assets/rosary3d/defs.js)로 '전체 묵주' 정지 그림(1024×1024, 상아색 바탕)을 렌더한다.
// 법률 검토 M5: assets/images/rosary_*.webp 를 우리 손으로 만든 것으로 바꿀 때의 원본(PNG)을 만든다.
// 필요: playwright(chromium). 예) NODE_PATH=/opt/node-tools/node_modules node tools/rosary3d/render_stills.mjs /tmp/stills
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const pageUrl = 'file://' + path.resolve(here, '../../assets/rosary3d/index.html');
const out = process.argv[2] || '/tmp/rosary_stills';
const ids = (process.argv[3] || 'lapis,knot,rosewood,crystal,pearl,jade,pastel,gold,ceramic,ebony,silver').split(',');
const SIZE = 1024;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(id + ' pageerror ' + e.message));
  await page.addInitScript(() => { window.__rosaryShots = true; });
  await page.goto(pageUrl);
  await page.waitForFunction(() => window.RosaryAPI);
  await page.evaluate((rid) => window.RosaryAPI.init({ rosary: rid, view: 'a', step: 0, theme: 'ivory', quality: 'high' }), id);
  await page.waitForFunction(() => window.__rosary && window.__rosary.R && window.__rosary.settled(), null, { timeout: 180000 });
  await page.waitForTimeout(400);
  const file = path.join(out, `rosary_${id}.png`);
  await page.screenshot({ path: file });
  console.log('saved', file);
  await page.close();
}
await browser.close();
if (errors.length) { console.log('ERRORS', errors.slice(0, 10)); process.exitCode = 1; }
