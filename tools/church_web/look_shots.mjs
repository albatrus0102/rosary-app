// 룩 개발(LOOK_DEV.md) 비교 스크린샷 + 프레임 비용 측정 — `node --test` 에는 넣지 않는다(헤드리스 swiftshader 로 수 분 걸림).
// 사용: node tools/church_web/look_shots.mjs <out dir> [church ...] [--sizes 360x800,1280x800] [--hours 11,18.3,22] [--views entrance,nave,...]
//                                               [--quality high|low] [--perf] [--frames 24]
//       CHURCH_ROOT=<assets 사본> 으로 '이전' 사본을 찍는다. --perf: 각 크기 첫 시점에서 프레임 비용(ms, gl.finish 포함) 중앙값을 잰다.
// 시점(x,z,yaw,pitch,look 도): 카메라는 아바타 뒤에 있다(yaw 0 = 제대(-z) 쪽을 본다).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.CHURCH_ROOT || path.resolve(here, '../../assets/church');

export const VIEWS = {
  stpeter: {
    entrance: { x: 0, z: 31, yaw: 0, pitch: 8 },
    nave: { x: 0, z: 12, yaw: 0, pitch: 6 },
    altar: { x: 0, z: -3.2, yaw: 0, pitch: 4, look: 14 },
    aisle: { x: 9, z: 12, yaw: 0, pitch: 6 },
    window: { x: 6.2, z: 17.2, yaw: -90, pitch: 8, look: 10 },
  },
};
// 다른 성당: 스폰에서 제대 쪽 + 중간
function defaultViews(layout) {
  const b = layout.bounds, s = layout.spawn;
  return {
    entrance: { x: s.x, z: s.z - 1, yaw: 0, pitch: 8 },
    nave: { x: 0, z: (b.z0 + b.z1) / 2 + (b.z1 - b.z0) * 0.1, yaw: 0, pitch: 6 },
    altar: { x: 0, z: b.z0 + (b.z1 - b.z0) * 0.22, yaw: 0, pitch: 4, look: 10 },
  };
}

async function run(outDir, ids, o) {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const perf = [];
  for (const size of o.sizes) {
    const [W, H] = size.split('x').map(Number);
    for (const id of ids) {
      const page = await browser.newPage({ viewport: { width: W, height: H } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(() => {
        const q = []; let tNow = 0;
        window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
        window.__step = (n, dtMs) => { for (let i = 0; i < n; i++) { const cbs = q.splice(0); tNow = (tNow || performance.now()) + dtMs; cbs.forEach((cb) => cb(tNow)); } };
      });
      await page.goto('file://' + root + '/test.html?' + new URLSearchParams({ church: id, autotier: '0', msaa: '0', quality: o.quality, solo: '1', hideui: '1' }));
      await page.waitForFunction(() => window.__church && window.__church.world && window.__church.R, null, { timeout: 180000, polling: 500 });
      await page.waitForTimeout(1500);
      await page.waitForFunction(() => !window.__church.place || window.__church.place.debug().pending === 0, null, { timeout: 120000, polling: 250 });
      const layout = await page.evaluate(() => ({ bounds: __church.world.layout.bounds, spawn: __church.world.layout.spawn }));
      const views = VIEWS[id] || defaultViews(layout);
      const names = o.views ? o.views.filter((v) => views[v]) : Object.keys(views);
      let first = true;
      for (const vn of names) {
        for (const hour of o.hours) {
          const v = views[vn];
          await page.evaluate(({ v, hour }) => {
            const A = __church, D = Math.PI / 180;
            A.world.setHour(hour);
            A.me.x = v.x; A.me.z = v.z; A.me.y = A.logic.floorY(v.x, v.z);
            A.ctl.yaw = v.yaw * D; A.me.yaw = A.ctl.yaw; A.ctl.pitch = v.pitch * D; A.ctl.look = (v.look || 0) * D; A.ctl.zoom = v.zoom || 1; A.camInit = false;
          }, { v, hour });
          for (let i = 0; i < 3; i++) await page.evaluate(() => __step(10, 50));
          const file = path.join(outDir, `${id}_${vn}_h${String(hour).replace('.', '_')}_${size}.png`);
          const url = await page.evaluate(() => { const c = document.getElementById('c'), cv = document.createElement('canvas'); cv.width = c.width; cv.height = c.height; __step(1, 16.67); cv.getContext('2d').drawImage(c, 0, 0); return cv.toDataURL('image/png'); });
          fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
          if (o.perf && first && hour === o.hours[0]) {
            const ms = await page.evaluate((N) => {
              const A = __church, gl = A.renderer.getContext(), px = new Uint8Array(4), arr = [];
              for (let f = 0; f < 4; f++) { __step(1, 16.67); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
              for (let f = 0; f < N; f++) { const t = performance.now(); __step(1, 16.67); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); arr.push(performance.now() - t); }
              arr.sort((a, b) => a - b);
              const info = A.renderer.info.render;
              return { med: +arr[arr.length >> 1].toFixed(1), p90: +arr[Math.floor(arr.length * 0.9)].toFixed(1), calls: info.calls, tris: info.triangles };
            }, o.frames);
            perf.push({ id, size, view: vn, ...ms });
            console.log(`perf ${id} ${size} ${vn}: median ${ms.med}ms p90 ${ms.p90}ms calls ${ms.calls} tris ${ms.tris}`);
          }
          first = false;
        }
      }
      if (errors.length) console.log('page errors', id, errors.join(' | '));
      await page.close();
      console.log('done', id, size);
    }
  }
  await browser.close();
  return perf;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), ids = [];
  const o = { sizes: ['360x800', '1280x800'], hours: [11, 18.3, 22], quality: 'high', perf: false, frames: 24, views: null };
  const outDir = a.shift();
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--sizes') o.sizes = a[++i].split(','); else if (a[i] === '--hours') o.hours = a[++i].split(',').map(Number);
    else if (a[i] === '--views') o.views = a[++i].split(','); else if (a[i] === '--quality') o.quality = a[++i];
    else if (a[i] === '--perf') o.perf = true; else if (a[i] === '--frames') o.frames = +a[++i]; else ids.push(a[i]);
  }
  if (!ids.length) ids.push('stpeter');
  fs.mkdirSync(outDir, { recursive: true });
  const perf = await run(outDir, ids, o);
  if (perf.length) fs.writeFileSync(path.join(outDir, 'perf.json'), JSON.stringify(perf, null, 1));
}
