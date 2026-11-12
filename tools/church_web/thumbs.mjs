// 사용: node tools/church_web/thumbs.mjs [id ...]  ->  assets/church_thumbs/<id>.png (400x240, 팔레트 양자화로 작게)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');
const outDir = path.resolve(here, '../../assets/church_thumbs');
fs.mkdirSync(outDir, { recursive: true });
const all = fs.readdirSync(assets).map((f) => /^ch_([a-z]+)\.js$/.exec(f)).filter(Boolean).map((m) => m[1]).sort();
const lowFlag = process.argv.includes('--low');
const ids = process.argv.slice(2).filter((a) => !a.startsWith('--')).length ? process.argv.slice(2).filter((a) => !a.startsWith('--')) : all;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failed = 0;
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 400, height: 240 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`file://${assets}/test.html?church=${id}&hideui=1&thumb=1&hour=15&autotier=0&msaa=0&frames=5${lowFlag ? '&quality=low' : ''}`);
  try { await page.waitForFunction(() => window.__church && window.__church.done, null, { timeout: 600000 }); } catch (e) { errors.push('timeout'); }
  const tmp = path.join(outDir, `${id}.raw.png`);
  await page.screenshot({ path: tmp });
  await page.close();
  const dest = path.join(outDir, `${id}.png`);
  // PIL 팔레트 양자화(각 파일 ~60KB 이하 목표)
  const py = `from PIL import Image\nim=Image.open(r'${tmp}').convert('RGB')\nfor n in (96,64,48,32):\n    q=im.quantize(colors=n,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)\n    q.save(r'${dest}',optimize=True)\n    import os\n    if os.path.getsize(r'${dest}')<60000: break\n`;
  execFileSync('python3', ['-I', '-c', py]);
  fs.unlinkSync(tmp);
  const kb = (fs.statSync(dest).size / 1024).toFixed(1);
  console.log(id, kb + 'KB', errors.length ? 'ERRORS: ' + errors.join('; ') : 'ok');
  if (errors.length) failed++;
}
await browser.close();
process.exit(failed ? 1 : 0);
