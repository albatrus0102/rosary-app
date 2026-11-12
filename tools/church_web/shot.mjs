// 사용: node tools/church_web/shot.mjs <id> [out.png] [--hour 11] [--pos x,z] [--yaw 도] [--pitch 도] [--zoom 1] [--solo] [--peers N]
//        [--size 960x540] [--sit] [--candles N] [--eval "js"] [--wait ms]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../assets/church');

export async function shoot(opts) {
  const { id = 'basic', out, hour, pos, yaw, pitch, zoom, solo, peers, size = '960x540', sit, candles, evalJs, wait = 1200, page: given, browser: gb } = opts;
  const [w, h] = size.split('x').map(Number);
  const browser = gb || await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = given || await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  const q = new URLSearchParams({ church: id, autotier: '0', msaa: '0', frames: '6' });
  if (hour !== undefined) q.set('hour', hour);
  if (solo) q.set('solo', '1');
  if (peers) q.set('peers', peers);
  if (pos) { const [x, z] = pos.split(','); q.set('x', x); q.set('z', z); }
  if (yaw !== undefined) q.set('yaw', yaw);
  if (pitch !== undefined) q.set('pitch', pitch);
  if (zoom !== undefined) q.set('zoom', zoom);
  if (sit) q.set('sit', sit === true ? '1' : sit);
  if (candles) q.set('candles', candles);
  await page.goto('file://' + root + '/test.html?' + q.toString());
  await page.waitForFunction(() => window.__church && window.__church.world, null, { timeout: 60000 });
  if (evalJs) await page.evaluate(evalJs);
  await page.waitForFunction(() => window.__church && window.__church.done, null, { timeout: 600000 });
  if (out) await page.screenshot({ path: out });
  const info = await page.evaluate(() => ({ stats: window.__church.world.stats, fps: window.__church.fps }));
  if (!given) await browser.close();
  return { errors, info };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const o = { id: a[0] || 'basic', out: a[1] && !a[1].startsWith('--') ? a[1] : `/tmp/church_${a[0] || 'basic'}.png` };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === '--hour') o.hour = a[++i]; else if (k === '--pos') o.pos = a[++i]; else if (k === '--yaw') o.yaw = a[++i];
    else if (k === '--pitch') o.pitch = a[++i]; else if (k === '--zoom') o.zoom = a[++i]; else if (k === '--solo') o.solo = true;
    else if (k === '--peers') o.peers = a[++i]; else if (k === '--size') o.size = a[++i]; else if (k === '--sit') o.sit = true;
    else if (k === '--candles') o.candles = a[++i]; else if (k === '--eval') o.evalJs = a[++i]; else if (k === '--wait') o.wait = +a[++i];
  }
  const r = await shoot(o);
  console.log(JSON.stringify(r.info), r.errors.length ? 'ERRORS:\n' + r.errors.join('\n') : 'no errors');
  console.log('saved', o.out);
  process.exit(r.errors.length ? 1 : 0);
}
