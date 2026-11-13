// 십자가의 길 14처 판 스크린샷(헤드리스 chromium + swiftshader).
//   node tools/church_web/cross_shots.mjs <outdir> [id ...] [--quality low|high] [--hour 11]
// 성당마다 (a) 3처·10처 판을 서는 자리 눈높이에서 정면으로(아바타 숨김), (b) 1처에서 판 줄을 따라 비스듬히 본 모습.
// 판 자리는 브라우저와 같은 derive(way_cross.js)로 Node 에서 미리 계산하고 URL(x,z,yaw,pitch,zoom)로 넘긴다.
// cross_pack.js 는 addInitScript 로 먼저 넣어 처음 몇 프레임 안에 판이 걸리게 한다(frames=N 으로 그리기를 멈춘 뒤 찍는다).
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../assets/church');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const quality = opt('--quality', 'high'), hour = opt('--hour', '11'), before = opt('--before', '0') === '1';   // --before 1: 판 없이(?cross=0) 같은 자리
const out = args[0] || '/tmp/cross_shots';
const ids = args.slice(1).length ? args.slice(1) : ['basic', 'stpeter', 'stpaul', 'milan', 'florence', 'myeongdong', 'lateran', 'maggiore'];
fs.mkdirSync(out, { recursive: true });
const { churches, Logic, Stations, WayCross } = loadChurches();
const deg = (r) => r * 180 / Math.PI;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
let bad = 0;
for (const id of ids) {
  const c = churches.find((k) => k.id === id);
  const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones });
  const res = WayCross.derive({ layout: c.layout, logic: L, stations: Stations.create(L), walls: c.walls, windows: c.windows, roses: c.roses, glassSlots: c.glassSlots });
  if (res.plaques.length !== 14) { console.log(id, 'no plaques', res.why); continue; }
  const views = [];
  for (const n of [3, 10]) {
    // 순례자 눈높이: 서는 자리에서 판을 정면으로(아바타는 숨기고 카메라를 아바타 자리까지 당긴다)
    const p = res.plaques[n - 1], st = p.stand;
    views.push({ name: `eye${n}`, x: st.x, z: st.z, yaw: deg(st.yaw), pitch: 3, zoom: 0.3, look: 14, hideMe: true });
  }
  {
    const p = res.plaques[0], st = p.stand;
    const toward = Math.atan2(-(p.x - st.x), -(p.z - st.z));
    views.push({ name: 'aisle1', x: st.x, z: st.z, yaw: deg(toward + (p.side === 'R' ? 0.8 : -0.8)), pitch: 6, zoom: 0.9 });
  }
  for (const v of views) {
    const page = await browser.newPage({ viewport: { width: 412, height: 860 } });
    await page.addInitScript({ path: path.join(root, 'cross_pack.js') });
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    const q = new URLSearchParams({ church: id, quality, autotier: '0', msaa: '0', hideui: '1', hour, markers: '0', frames: '14',
      x: v.x.toFixed(2), z: v.z.toFixed(2), yaw: v.yaw.toFixed(1), pitch: String(v.pitch), zoom: String(v.zoom) });
    if (v.look) q.set('look', String(v.look));
    if (before) q.set('cross', '0');
    await page.goto('file://' + root + '/test.html?' + q.toString());
    if (v.hideMe) {
      await page.waitForFunction(() => window.__church && window.__church.meAv, null, { timeout: 120000 });
      await page.evaluate(() => { window.__church.meAv.root.visible = false; });
    }
    await page.waitForFunction(() => window.__church && window.__church.done, null, { timeout: 600000 });
    const dbg = await page.evaluate(() => window.__church.cross && window.__church.cross.debug());
    const file = path.join(out, `church_${id}_${quality}_${v.name}${before ? '_before' : ''}.png`);
    await page.screenshot({ path: file });
    console.log('saved', file, JSON.stringify({ ready: dbg && dbg.ready, count: dbg && dbg.count, near: dbg && dbg.near }), errors.length ? 'ERRORS ' + errors.join(' | ') : '');
    if (errors.length || (!before && !(dbg && dbg.ready))) bad++;
    await page.close();
  }
}
await browser.close();
process.exit(bad ? 1 : 0);
