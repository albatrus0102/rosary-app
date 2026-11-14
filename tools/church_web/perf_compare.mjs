// 헤드리스(swiftshader) 프레임 비용 비교 — 사본 여러 개(커밋별 assets/church)를 같은 시점·같은 조건에서 잰다. `node --test` 밖.
// 사용: node tools/church_web/perf_compare.mjs --roots a=/path/assets/church,b=/path2 [--churches stpeter,florence,milan] [--size 360x800]
//       [--frames 30] [--quality high|low] [--json out.json]
// 값: 프레임 시간 중앙값/90%(ms, gl.readPixels 로 GPU 완료까지), draw call, 삼각형, 상주 텍스처 수·추정 MB(장면 재질의 map 류 + 렌더 타깃 제외), 지오메트리 수.
// 절대값은 소프트웨어 GL 이라 실기기와 다르다. 같은 기계에서 사본끼리의 비율만 본다(PERF.md).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const VIEWS = {
  nave: (L) => ({ x: L.spawn.x, z: L.spawn.z - (L.bounds.z1 - L.bounds.z0) * 0.3, yaw: 0, pitch: 6 }),
  altar: (L) => ({ x: 0, z: L.bounds.z0 + (L.bounds.z1 - L.bounds.z0) * 0.3, yaw: 0, pitch: 5 }),
};

export async function measure(browser, rootDir, id, { size = '360x800', frames = 30, quality = 'high' } = {}) {
  const [W, H] = size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const q = []; let tNow = 0;
    window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
    window.__step = (n, dtMs) => { for (let i = 0; i < n; i++) { const cbs = q.splice(0); tNow = (tNow || performance.now()) + dtMs; cbs.forEach((cb) => cb(tNow)); } };
  });
  await page.goto('file://' + rootDir + '/test.html?' + new URLSearchParams({ church: id, autotier: '0', msaa: '0', quality, solo: '1', hideui: '1' }));
  await page.waitForFunction(() => window.__church && window.__church.world && window.__church.R, null, { timeout: 180000, polling: 500 });
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => !window.__church.place || window.__church.place.debug().pending === 0, null, { timeout: 120000, polling: 250 }).catch(() => {});
  const L = await page.evaluate(() => ({ bounds: __church.world.layout.bounds, spawn: __church.world.layout.spawn }));
  const out = [];
  for (const vn of Object.keys(VIEWS)) {
    const v = VIEWS[vn](L);
    await page.evaluate(({ v }) => {
      const A = __church, D = Math.PI / 180;
      A.world.setHour(11);
      A.me.x = v.x; A.me.z = v.z; A.me.y = A.logic.floorY(v.x, v.z);
      A.ctl.yaw = v.yaw * D; A.me.yaw = A.ctl.yaw; A.ctl.pitch = v.pitch * D; if ('look' in A.ctl) A.ctl.look = 0; A.camInit = false;
    }, { v });
    for (let i = 0; i < 3; i++) await page.evaluate(() => __step(10, 50));
    const r = await page.evaluate((N) => {
      const A = __church, gl = A.renderer.getContext(), px = new Uint8Array(4), arr = [];
      for (let f = 0; f < 4; f++) { __step(1, 16.67); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
      for (let f = 0; f < N; f++) { const t = performance.now(); __step(1, 16.67); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); arr.push(performance.now() - t); }
      arr.sort((a, b) => a - b);
      const info = A.renderer.info;
      // 상주 텍스처 추정: 장면 재질이 쓰는 텍스처(중복 제거) 크기 × 4바이트 × 밉맵 4/3
      const seen = new Set(); let bytes = 0;
      A.scene.traverse((o) => { const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []); ms.forEach((m) => { for (const k in m) { const t = m[k]; if (t && t.isTexture && !seen.has(t.uuid)) { seen.add(t.uuid); const im = t.image || {}; const w = im.width || (im.data && im.width) || 0, h = im.height || 0; bytes += w * h * 4 * (t.generateMipmaps !== false ? 4 / 3 : 1); } } if (m.uniforms) for (const k in m.uniforms) { const t = m.uniforms[k].value; if (t && t.isTexture && !t.isRenderTargetTexture && !seen.has(t.uuid)) { seen.add(t.uuid); const im = t.image || {}; bytes += (im.width || 0) * (im.height || 0) * 4; } } }); });
      return { med: +arr[arr.length >> 1].toFixed(1), p90: +arr[Math.floor(arr.length * 0.9)].toFixed(1), calls: info.render.calls, tris: info.render.triangles, texGL: info.memory.textures, geos: info.memory.geometries, texSceneMB: +(bytes / 1048576).toFixed(1), tier: A.R.tier };
    }, frames);
    out.push({ id, view: vn, ...r });
  }
  if (errors.length) out.forEach((o) => { o.errors = errors.slice(0, 3); });
  await page.close();
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), o = { churches: ['stpeter', 'florence', 'milan'], size: '360x800', frames: 30, quality: 'high' };
  let roots = [], json = null;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--roots') roots = a[++i].split(',').map((s) => s.split('='));
    else if (a[i] === '--churches') o.churches = a[++i].split(','); else if (a[i] === '--size') o.size = a[++i];
    else if (a[i] === '--frames') o.frames = +a[++i]; else if (a[i] === '--quality') o.quality = a[++i]; else if (a[i] === '--json') json = a[++i];
  }
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const all = [];
  for (const id of o.churches) {
    for (const [name, dir] of roots) {
      const rs = await measure(browser, dir, id, o);
      for (const r of rs) { all.push({ rev: name, ...r }); console.log(`${name.padEnd(10)} ${id.padEnd(9)} ${r.view.padEnd(6)} ${o.quality} med ${r.med}ms p90 ${r.p90}ms calls ${r.calls} tris ${r.tris} texGL ${r.texGL} texMB ${r.texSceneMB} geos ${r.geos}${r.errors ? ' ERR ' + r.errors.join(' | ') : ''}`); }
    }
  }
  await browser.close();
  if (json) fs.writeFileSync(json, JSON.stringify(all, null, 1));
}
