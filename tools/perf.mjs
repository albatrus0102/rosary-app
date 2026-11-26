// 성능 숫자(헤드리스, 960×540, deviceScaleFactor 1): 시점마다 한 프레임의 draw call·삼각형(높음 단계: 그림자 맵 캐시 제외, 반사·후처리 포함)과
// 장면 재질 질감 메모리 추정(MB, RGBA8 × 밉맵 4/3, 같은 그림은 한 번 — perf_hud.js texEstimate 와 같은 셈) · 질감 파일 합계.
//   node tools/perf.mjs [--only a,b]  → 표(JSON 한 줄씩)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const VIEWS = [
  { name: 'exterior-day', q: 'thumb=0&hour=15.5' },
  { name: 'interior', q: 'thumb=1&hour=20.5' },
  { name: 'yard-swing', q: 'sit=4&peerseat=5&hour=17.6&view=28,8,0.95' },
  { name: 'counter', q: 'thumb=3&coffee=americano&hour=19' },
  { name: 'peers-walking', q: 'peers=2&route=street&hour=16&x=-4.6&z=5.25&yaw=-100&pitch=8&zoom=0.85' }
];
const args = process.argv.slice(2), oi = args.indexOf('--only'), only = oi >= 0 ? args[oi + 1].split(',') : null;
const { srv, url } = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const v of VIEWS) {
  if (only && !only.includes(v.name)) continue;
  const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  await p.goto(url + 'test.html?hideui=1&autotier=0&quiet=1&frames=30&' + v.q);
  await p.waitForFunction(() => window.__room && window.__room.done, null, { timeout: 240000 });
  const r = await p.evaluate(() => {
    const a = window.__room, rr = a.R.renderer;
    a.R.render(a.scene, a.camera, 0.016, a.world);
    const info = { calls: rr.info.render.calls, tris: rr.info.render.triangles };
    // 본 그리기 한 번(간단 단계와 같은 것 — 보이는 삼각형): 후처리·반사 없이 장면만
    rr.info.reset(); rr.info.autoReset = false; rr.render(a.scene, a.camera); const main = { calls: rr.info.render.calls, tris: rr.info.render.triangles }; rr.info.autoReset = true;
    const seen = {}; let bytes = 0;
    a.scene.traverse((o) => { let ms = o.material; if (!ms) return; if (!Array.isArray(ms)) ms = [ms]; for (const m of ms) for (const k in m) { const t = m[k]; if (!t || !t.isTexture || t.isRenderTargetTexture) continue; const id = t.source ? t.source.uuid : t.uuid; if (seen[id]) continue; seen[id] = 1; const im = t.image || {}; bytes += (im.width || 0) * (im.height || 0) * 4 * (t.generateMipmaps !== false && t.minFilter !== 1006 ? 4 / 3 : 1); } });
    return { tier: a.R.tier, frame: info, mainPass: main, texMB: +(bytes / 1048576).toFixed(1), glTextures: rr.info.memory.textures };
  });
  console.log(JSON.stringify({ view: v.name, ...r }));
  await p.close();
}
await b.close(); srv.close();
let sum = 0; for (const f of fs.readdirSync(path.join(here, '../web/tex'))) sum += fs.statSync(path.join(here, '../web/tex', f)).size;
console.log(JSON.stringify({ texFilesMB: +(sum / 1e6).toFixed(1) }));
