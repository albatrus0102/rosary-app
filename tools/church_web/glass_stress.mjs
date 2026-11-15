// 스테인드글라스 대량 투입 스트레스 시험(PERF_SCALE.md §5) — `node --test` 밖. 헤드리스 SwiftShader 라 ms 는 상대 비교용.
// 사용: node tools/church_web/glass_stress.mjs [--church milan] [--n 55] [--modes legacy,stream] [--dpr 2] [--json out.json]
//   legacy = ?gstream=0(예전: 입장 때 창 id 마다 1k 를 모두 올림) · stream = 먼 창 아틀라스 + 가까운 창만 1k(기본)
// 재는 것: 입장~창 준비 시간, 메인 스레드 긴 작업(longtask) 합·최대, 창 질감 상주 MB·장수, GL 질감 수, JS 힙,
//          신랑을 따라 걸으며(순간 이동 + 프레임) 프레임 시간 중앙/최대·draw call·삼각형, 업로드·해제 횟수.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2), o = { church: 'milan', n: 55, modes: ['legacy', 'stream'], dpr: 2, path: 'aisle', root: process.env.CHURCH_ROOT || path.resolve(here, '../../assets/church') };
let json = null;
for (let i = 0; i < a.length; i++) {
  if (a[i] === '--church') o.church = a[++i]; else if (a[i] === '--n') o.n = +a[++i]; else if (a[i] === '--modes') o.modes = a[++i].split(',');
  else if (a[i] === '--dpr') o.dpr = +a[++i]; else if (a[i] === '--json') json = a[++i]; else if (a[i] === '--path') o.path = a[++i];
}
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
const out = [];
for (const mode of o.modes) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: o.dpr });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const q = []; let tNow = 0;
    window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
    window.__step = (n, dtMs) => { for (let i = 0; i < n; i++) { const cbs = q.splice(0); tNow = (tNow || performance.now()) + dtMs; cbs.forEach((cb) => cb(tNow)); } };
    window.__long = { n: 0, sum: 0, max: 0 };
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { __long.n++; __long.sum += e.duration; __long.max = Math.max(__long.max, e.duration); } }).observe({ entryTypes: ['longtask'] }); } catch (e) { /* ignore */ }
  });
  const qs = new URLSearchParams({ church: o.church, autotier: '0', quality: 'high', solo: '0', hideui: '1', gstress: String(o.n) });
  if (mode === 'legacy') qs.set('gstream', '0');
  const t0 = Date.now();
  await page.goto('file://' + o.root + '/test.html?' + qs);
  await page.waitForFunction(() => window.__church && window.__church.world && window.__church.place, null, { timeout: 240000, polling: 200 });
  // 창이 다 준비될 때까지(legacy: 1k 전부, stream: 먼 층 + 처음 시점의 가까운 창) 프레임을 돌린다
  for (let i = 0; i < 200; i++) {
    const d = await page.evaluate(() => { __step(1, 50); const d = __church.place.debug(); return { p: d.pending, far: d.far && d.far.state }; });
    if (d.p === 0 && i > 3) break;
    await page.waitForTimeout(150);
  }
  const ready = Date.now() - t0;
  const entry = await page.evaluate(() => ({ long: { ...__long }, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : -1 }));
  // 걷기: 입구 → 제대 12 지점, 지점마다 6프레임(50ms) — 스트리밍 판단·업로드가 걷는 동안 일어난다.
  // --path aisle(기본): 가짜 창이 걸린 벽에서 3m 안쪽을 좌우 번갈아(가까운 창 1k 가 오르내림) · nave: 신랑 가운데 ±3m
  // 지점마다 따로 evaluate 하고 사이에 실제 시간을 둔다(비동기 팩 읽기·디코드는 이벤트 루프가 돌아야 끝난다; 한 evaluate 안에서 몰아 돌리면 하나도 끝나지 않는다).
  await page.evaluate(() => { window.__w = { ms: [], calls: 0, tris: 0 }; window.__long = { n: 0, sum: 0, max: 0 }; });
  for (let k = 0; k < 12; k++) {
    await page.evaluate(({ pathMode, k }) => {
    const A = __church, gl = A.renderer.getContext(), px = new Uint8Array(4), L = A.world.layout, D = Math.PI / 180, W = window.__w, ms = W.ms;
    {
      const z = L.bounds.z1 - 3 - (L.bounds.z1 - L.bounds.z0 - 8) * k / 11;
      const cb = A.world.cameraBounds, wx = Math.min(-cb.x0, cb.x1) - 3;
      A.me.x = pathMode === 'aisle' ? (k % 2 ? wx : -wx) : L.spawn.x + (k % 2 ? 3 : -3); A.me.z = z; A.me.y = A.logic.floorY(A.me.x, A.me.z); A.ctl.yaw = pathMode === 'aisle' ? (k % 2 ? -1 : 1) * 60 * D : (k % 3 - 1) * 50 * D; A.me.yaw = A.ctl.yaw; A.ctl.pitch = 8 * D; A.camInit = false;
      for (let f = 0; f < 6; f++) {
        const t = performance.now(); __step(1, 50); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ms.push(performance.now() - t);
        W.calls = Math.max(W.calls, A.renderer.info.render.calls); W.tris = Math.max(W.tris, A.renderer.info.render.triangles);
      }
    }
    }, { pathMode: o.path, k });
    // 지점 간격(약 5~6m)을 걷는 속도(4m/s)로 가는 만큼 실제 시간을 둔다: 그동안 팩 읽기·디코드가 진행되고 다음 지점의 첫 프레임에서 업로드된다
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const A = __church, gl = A.renderer.getContext(), px = new Uint8Array(4), W = window.__w; for (let f = 0; f < 3; f++) { const t = performance.now(); __step(1, 50); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); W.ms.push(performance.now() - t); } });
    await page.waitForTimeout(1000);
  }
  const walk = await page.evaluate(() => {
    const A = __church, W = window.__w, ms = W.ms.slice(), calls = W.calls, tris = W.tris;
    ms.sort((x, y) => x - y);
    const d = A.place.debug();
    return { walkLongN: __long.n, walkLongMaxMs: Math.round(__long.max), frameMed: Math.round(ms[ms.length >> 1]), frameMax: Math.round(ms[ms.length - 1]), calls, tris, glTex: A.renderer.info.memory.textures,
      glassMB: d.stats.texMb, farMB: d.far ? d.far.mb : 0, resident1k: d.stats.resident, uploads: d.stats.uploads, evicted: d.stats.evicted, created: d.stats.created, uploadMsMax: d.stats.uploadMsMax,
      heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : -1, slots: d.slots, groups: d.groups.length };
  });
  const r = { mode, path: o.path, church: o.church, n: o.n, dpr: o.dpr, readyMs: ready, longTasks: entry.long.n, longSumMs: Math.round(entry.long.sum), longMaxMs: Math.round(entry.long.max), heapEntryMB: entry.heapMB, ...walk, errors: errors.slice(0, 3) };
  out.push(r);
  console.log(JSON.stringify(r));
  await ctx.close();
}
await browser.close();
if (json) fs.writeFileSync(json, JSON.stringify(out, null, 1));
