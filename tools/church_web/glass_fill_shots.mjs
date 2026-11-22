// 스테인드글라스 채우기(GLASS_INVENTORY.md) 전/후 화면: 성당마다 대표 창을 배포판 모드(devglass 없음)로 찍는다.
// 사용: node tools/church_web/glass_fill_shots.mjs <출력 폴더> [--root <assets/church 사본>] [--only milan,florence] [--size 960x540] [--hour 11]
//   --root: '전' 화면을 찍을 때 고치기 전 assets/church 사본을 가리킨다(기본: 저장소의 assets/church).
//   아바타는 숨기고(창을 가리지 않게) look(올려다보기)으로 창을 화면 가운데로 올린다.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));

// 카메라: me 위치(x,z), yaw(카메라가 me 뒤 (sin yaw, cos yaw) 쪽에 선다 → 보는 방향은 (-sin, -cos)), look = 올려다보는 각(도), zoom = 거리 배율
export const VIEWS = [
  { id: 'basic', name: 'side', x: -6, z: 2, yaw: 90, look: 14, zoom: 0.8 },
  { id: 'basic', name: 'apse', x: 0, z: -8, yaw: 0, look: 22, zoom: 0.9 },
  { id: 'milan', name: 'aisleS', x: 11.6, z: 21, yaw: -90, look: 16, zoom: 0.5 },
  { id: 'milan', name: 'apse', x: 0, z: -31, yaw: 0, look: 20, zoom: 0.45 },
  { id: 'milan', name: 'counterfacade', x: 0, z: 26, yaw: 180, look: 20, zoom: 1 },
  { id: 'florence', name: 'tribune', x: -12, z: -12.9, yaw: 90, look: 18, zoom: 0.9 },
  { id: 'florence', name: 'drum', x: 0, z: -2, yaw: 0, look: 42, zoom: 0.8 },
  { id: 'florence', name: 'aisle', x: -6, z: 11.4, yaw: 90, look: 14, zoom: 0.8 },
  { id: 'myeongdong', name: 'apse', x: 0, z: -20, yaw: 0, look: 22, zoom: 1 },
  { id: 'myeongdong', name: 'aisle', x: -8.6, z: 11.5, yaw: 90, look: 10, zoom: 0.55 },
  { id: 'myeongdong', name: 'transept', x: -9, z: -10.5, yaw: 90, look: 24, zoom: 1 },
  { id: 'maggiore', name: 'facade', x: 0, z: 26, yaw: 180, look: 14, zoom: 1 },
  { id: 'lateran', name: 'apse', x: 0, z: -27, yaw: 0, look: 8, zoom: 0.6 },
  { id: 'lateran', name: 'facade', x: 0, z: 26, yaw: 180, look: 20, zoom: 0.9 },
  { id: 'stpaul', name: 'transept', x: 12, z: -20, yaw: -90, look: 24, zoom: 1 },
  { id: 'stpeter', name: 'apse', x: 0, z: -24, yaw: 0, look: 14, zoom: 1 },
  { id: 'danggogae', name: 'side', x: -4.2, z: 4.3, yaw: 90, look: 6, zoom: 0.7 },
  { id: 'yeouido', name: 'front', x: 0, z: -2, yaw: 0, look: 12, zoom: 0.9 }
];

async function main() {
  const a = process.argv.slice(2);
  const out = a[0];
  if (!out) { console.error('출력 폴더가 필요하다'); process.exit(2); }
  let root = path.resolve(here, '../../assets/church'), only = null, size = '960x540', hour = '11';
  for (let i = 1; i < a.length; i++) {
    if (a[i] === '--root') root = path.resolve(a[++i]);
    else if (a[i] === '--only') only = a[++i].split(',');
    else if (a[i] === '--size') size = a[++i];
    else if (a[i] === '--hour') hour = a[++i];
  }
  fs.mkdirSync(out, { recursive: true });
  const [w, h] = size.split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  for (const v of VIEWS) {
    if (only && !only.includes(v.id) && !only.includes(v.id + ':' + v.name)) continue;
    const q = new URLSearchParams({ church: v.id, autotier: '0', msaa: '0', frames: '8', solo: '1', hour, x: v.x, z: v.z, yaw: v.yaw, look: v.look, zoom: v.zoom });
    const t0 = Date.now();
    await page.goto('file://' + root + '/test.html?' + q.toString());
    await page.waitForFunction(() => window.__church && window.__church.world, null, { timeout: 120000 });
    await page.evaluate(() => { const A = window.__church; if (A.meAv && A.meAv.root) A.meAv.root.visible = false; document.body.classList.add('hideui'); });
    await page.waitForFunction(() => window.__church && window.__church.done, null, { timeout: 600000 });
    const file = path.join(out, v.id + '_' + v.name + '.png');
    await page.screenshot({ path: file });
    const info = await page.evaluate(() => { const W = window.__church.world, a = W && W.ctx && W.ctx._ && W.ctx._.glassAtlas; const R = window.__church.renderer; return { atlas: a || null, calls: R && R.info ? R.info.render.calls : null, tex: R && R.info ? R.info.memory.textures : null }; });
    console.log(file, ((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(info));
  }
  await browser.close();
  if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
