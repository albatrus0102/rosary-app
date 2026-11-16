// 사용: node tools/church_web/rosary_looks_sheet.mjs <출력.png> [church=basic] [id,id,...]
// 서서 묵주를 든 자세(setRosary + setPraying stand)를 앞쪽 3/4 시점으로, 묵주 모습별로 찍어 한 장으로 합친다(T-86).
// 기본: 올리브 원목 · 진주 · 청색 수정 · 금. 장면 하니스는 gesture_sheet.mjs 와 같다.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../assets/church');
const outFile = process.argv[2] || '/tmp/rosary_looks_sheet.png';
const church = process.argv[3] || 'basic';
const ids = (process.argv[4] || 'olive,pearl,crystal,gold').split(',');
const labels = { olive: '올리브 원목', pearl: '아이보리 진주', crystal: '청색 수정', gold: '금도금' };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rosary_looks_'));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 420, height: 520 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
await page.goto('file://' + root + '/test.html?' + new URLSearchParams({ church, autotier: '0', msaa: '0', hour: '11', markers: '0' }).toString());
await page.waitForFunction(() => window.__church && window.__church.world && window.__church.meAv, null, { timeout: 120000 });
const sleep = (ms) => page.waitForTimeout(ms);
await page.addStyleTag({ content: 'body > *:not(canvas) { display: none !important; }' });   // 시험 하니스의 단추·로그를 가린다
const CLIP = { x: 100, y: 170, width: 140, height: 150 };
const ZOOM = +(process.env.ZOOM || 0.3), DEG = +(process.env.DEG || 215), PITCH = +(process.env.PITCH || 0.1);
await page.evaluate(() => { const A = window.__church; A.me.x = 0; A.me.z = 6; A.me.yaw = 0; });
await sleep(600);
const files = [];
for (let i = 0; i < ids.length; i++) {
  const id = ids[i];
  await page.evaluate((id) => {
    const API = window.ChurchAPI, look = window.ChurchRosaryLooks.get(id);
    if (!window.__ro) { window.__ro = true; API.setRosary({ on: true }); API.setPraying({ on: true, ms: 0, stand: true }); }   // 처음: look 없이 켜서 기본 모습 → 바로 look 으로 바뀌는 길도 거친다
    API.setRosary({ on: true, look });   // 들고 있는 중에 바꾸기(기도 중 묵주 바꾸기)와 같은 경로
  }, id);
  await page.evaluate(([DEG, PITCH, ZOOM]) => { const A = window.__church; A.meAv.snapPose(); A.ctl.yaw = A.me.yaw + DEG * Math.PI / 180; A.ctl.pitch = PITCH; A.ctl.zoom = ZOOM; A.ctl.lastDragT = A.t + 1e6; A.camInit = false; }, [DEG, PITCH, ZOOM]);
  await sleep(i === 0 ? 1800 : 900);
  const f = path.join(tmp, `r_${id}.png`);
  await page.screenshot({ path: f });
  const fc = path.join(tmp, `c_${id}.png`);
  await page.screenshot({ path: fc, clip: CLIP });   // 묵주 확대(손 부근)
  files.push({ f, fc, id });
}
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const html = `<body style="margin:0;background:#1b1b22;color:#eee;font:14px sans-serif"><div style="display:flex">${files.map((o) => `<div style="width:420px"><div style="padding:6px 10px">${labels[o.id] || o.id}</div><img src="${b64(o.f)}" width="420"><img src="${b64(o.fc)}" width="420" style="display:block;margin-top:4px"></div>`).join('')}</div></body>`;
const sp = await browser.newPage({ viewport: { width: 420 * files.length, height: 1080 } });
await sp.setContent(html);
await sp.waitForTimeout(400);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
await sp.screenshot({ path: outFile, fullPage: true });
console.log('saved', outFile);
if (errors.length) console.log('errors:', errors.slice(0, 8));
await browser.close();
