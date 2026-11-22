// 절차 생성 스테인드글라스(assets/church/glass_gen.js) 견본 시트: 양식마다 body·head·disc 칸을 그려 PNG 하나로 저장한다.
// 사용: node tools/church_web/glass_gen_sheet.mjs <out.png> [--styles milan_narr,florence_saints] [--unit 256]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const gen = path.resolve(here, '../../assets/church/glass_gen.js');

const a = process.argv.slice(2);
const out = a[0] || '/tmp/glass_gen_sheet.png';
let styles = null, unit = 256;
for (let i = 1; i < a.length; i++) { if (a[i] === '--styles') styles = a[++i].split(','); else if (a[i] === '--unit') unit = +a[++i]; }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
await page.setContent('<html><body style="margin:0;background:#333"></body></html>');
await page.addScriptTag({ path: gen });
const size = await page.evaluate(({ styles, unit }) => {
  const G = window.ChurchGlassGen, ids = styles || Object.keys(G.STYLES);
  // 양식마다 한 줄: body 변주 전부 + head + disc
  const rows = ids.map((id) => { const s = G.STYLES[id]; const t = []; for (let v = 0; v < s.variants; v++) t.push({ style: id, part: 'body', variant: v }); t.push({ style: id, part: 'head', variant: 0 }); t.push({ style: id, part: 'disc', variant: 0 }); return t; });
  const W = Math.max(...rows.map((r) => r.reduce((n, t) => n + G.SIZE[t.part][0], 0))) * unit + 20, H = rows.length * (2 * unit + 28) + 10;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; document.body.appendChild(cv);
  const g = cv.getContext('2d'); g.fillStyle = '#222'; g.fillRect(0, 0, W, H); g.font = '14px sans-serif';
  rows.forEach((r, ri) => {
    let x = 10; const y = 10 + ri * (2 * unit + 28);
    g.fillStyle = '#ddd'; g.fillText(ids[ri] + ' — ' + G.STYLES[ids[ri]].era, 10, y + 12);
    r.forEach((t) => { G.drawTile(g, t, x, y + 18, unit); x += G.SIZE[t.part][0] * unit + 4; });
  });
  return { W, H };
}, { styles, unit });
await page.setViewportSize({ width: size.W, height: size.H });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('saved', out, size);
