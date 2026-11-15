// 성 베드로 구조 수정(I-5) 전후 비용 — 시점별 draw call·삼각형(결정적)과 프레임 시간(상대값). `node --test` 밖.
// 사용: node tools/church_web/stpeter_perf.mjs [--root <assets/church 사본>] [--views nave,altar,...] [--quality high] [--size 360x800] [--frames 12] [--json out.json]
// 시점: nave·altar 는 perf_compare.mjs 와 같은 자리(PERF_SCALE.md 표와 견줄 수 있다). aisle·aisleEnd 는 측랑,
//       amb*·sacrament·choir 는 I-5 에서 새로 걸어 들어갈 수 있게 된 회랑·모서리 경당·대경당(수정 전에는 벽 밖이라 재지 않는다).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));

export const VIEWS = {
  nave: { x: 0, z: 11.6, yaw: 0, pitch: 6 },
  altar: { x: 0, z: -13.8, yaw: 0, pitch: 5 },
  aisle: { x: 9, z: 20, yaw: 0, pitch: 6 },
  aisleEnd: { x: 9, z: 7.5, yaw: 0, pitch: 6 },
  ambEast: { x: 13.8, z: -2.0, yaw: 180, pitch: 6, isNew: true },       // 익랑 → 동쪽 통로 → 그레고리오 경당(카메라는 익랑 안)
  ambCorner: { x: 9.2, z: 4.4, yaw: -90, pitch: 6, isNew: true },       // 측랑 4번 칸에서 큰 아치로 모서리 경당 쪽
  transept: { x: 16.5, z: -9, yaw: 90, pitch: 6, isNew: true },         // 익랑 팔에서 교차부 쪽
  ambWest: { x: 13.8, z: -16.2, yaw: 0, pitch: 6, isNew: true },        // 익랑 → 서쪽 통로 → 성 미카엘 경당(카메라는 익랑 안)
  ambWestIn: { x: 13.8, z: -22.8, yaw: 90, pitch: 6, isNew: true },     // 서쪽 모서리 경당 → 후진 팔
  sacrament: { x: 12.2, z: 12.85, yaw: -90, pitch: 4, isNew: true },    // 성체 경당 안
  choir: { x: -12.2, z: 12.85, yaw: 90, pitch: 4, isNew: true },        // 성가대 경당 안
};

export async function measureViews(root, o = {}) {
  const { size = '360x800', frames = 12, quality = 'high', views = Object.keys(VIEWS), shotDir = null } = o;
  const [W, H] = size.split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const q = []; let tNow = 0;
    window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
    window.__step = (n, dtMs) => { for (let i = 0; i < n; i++) { const cbs = q.splice(0); tNow = (tNow || performance.now()) + dtMs; cbs.forEach((cb) => cb(tNow)); } };
  });
  await page.goto('file://' + root + '/test.html?' + new URLSearchParams({ church: 'stpeter', autotier: '0', msaa: '0', quality, solo: '1', hideui: '1' }));
  await page.waitForFunction(() => window.__church && window.__church.world && window.__church.R, null, { timeout: 240000, polling: 500 });
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => !window.__church.place || window.__church.place.debug().pending === 0, null, { timeout: 120000, polling: 250 }).catch(() => {});
  const out = [];
  const stats = await page.evaluate(() => __church.world.stats);
  for (const vn of views) {
    const v = VIEWS[vn];
    if (!v) continue;
    await page.evaluate(({ v }) => {
      const A = __church, D = Math.PI / 180;
      A.world.setHour(11);
      A.me.x = v.x; A.me.z = v.z; A.me.y = A.logic.floorY(v.x, v.z);
      A.ctl.yaw = v.yaw * D; A.me.yaw = A.ctl.yaw; A.ctl.pitch = v.pitch * D; if ('look' in A.ctl) A.ctl.look = 0; A.camInit = false;
    }, { v });
    for (let i = 0; i < 3; i++) await page.evaluate(() => __step(10, 50));
    const r = await page.evaluate((N) => {
      const A = __church, gl = A.renderer.getContext(), px = new Uint8Array(4), arr = [];
      for (let f = 0; f < 3; f++) { __step(1, 16.67); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
      for (let f = 0; f < N; f++) { const t = performance.now(); __step(1, 16.67); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); arr.push(performance.now() - t); }
      arr.sort((a, b) => a - b);
      const info = A.renderer.info;
      return { med: +arr[arr.length >> 1].toFixed(1), calls: info.render.calls, tris: info.render.triangles, texGL: info.memory.textures, geos: info.memory.geometries };
    }, frames);
    if (shotDir) await page.screenshot({ path: path.join(shotDir, vn + '.jpg'), type: 'jpeg', quality: 80 });
    out.push({ view: vn, ...r });
    console.log(`${vn.padEnd(10)} med ${String(r.med).padStart(7)}ms  calls ${String(r.calls).padStart(4)}  tris ${String(r.tris).padStart(7)}  texGL ${r.texGL}  geos ${r.geos}`);
  }
  await browser.close();
  return { views: out, stats, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), o = {};
  let root = path.resolve(here, '../../assets/church'), json = null;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--root') root = path.resolve(a[++i]); else if (a[i] === '--views') o.views = a[++i].split(',');
    else if (a[i] === '--quality') o.quality = a[++i]; else if (a[i] === '--size') o.size = a[++i];
    else if (a[i] === '--frames') o.frames = +a[++i]; else if (a[i] === '--json') json = a[++i]; else if (a[i] === '--shots') o.shotDir = a[++i];
  }
  const r = await measureViews(root, o);
  console.log('stats', JSON.stringify(r.stats));
  if (r.errors.length) console.log('ERRORS:\n' + r.errors.slice(0, 5).join('\n'));
  if (json) fs.writeFileSync(json, JSON.stringify(r, null, 1));
}
