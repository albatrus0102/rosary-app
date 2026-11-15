// 입체 성모상(shrine.js + statue3d_<img>.js) 근접 스크린샷 — 정면·좌 45°·우 60°(아바타 숨김, 카메라 직접 배치).
//   node tools/church_web/statue_shots.mjs <outdir> [id ...] [--dist 2.2] [--hour 11] [--quality high]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const Places = require('../../assets/church/shrine_places.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/church');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const dist = +opt('--dist', '1.5'), hour = opt('--hour', '11'), quality = opt('--quality', 'high');
const out = args[0] || '/tmp/statue_shots', ids = args.slice(1).length ? args.slice(1) : ['basic', 'danggogae', 'myeongdong'];
const ANG = [['front', 0], ['left45', -45], ['right60', 60]];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
let bad = 0;
for (const id of ids) {
  const p = Places[id], page = await browser.newPage({ viewport: { width: 540, height: 720 } }), errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.addInitScript({ path: path.join(root, 'statue3d_' + p.img + '.js') });
  const q = new URLSearchParams({ church: id, quality, autotier: '0', msaa: '0', hideui: '1', hour, markers: '0', frames: '10', solo: '1' });
  await page.goto('file://' + root + '/test.html?' + q.toString());
  await page.waitForFunction(() => window.__church && window.__church.done, null, { timeout: 600000 });
  const ok = await page.waitForFunction(() => { const s = window.__church.scene.getObjectByName('shrine_statue'); return s && s.visible; }, null, { timeout: 30000 }).then(() => true, () => false);
  const info = await page.evaluate(() => { const s = window.__church.scene.getObjectByName('shrine_statue'); return s ? s.levels.map((l) => l.object.geometry.index.count / 3) : null; });
  for (const [name, a] of ANG) {
    await page.evaluate(({ p, a, dist }) => {
      const C = window.__church, T = window.THREE, y = p.yaw * Math.PI / 180, r = y + a * Math.PI / 180;
      const cx = p.x + Math.sin(y) * -0.12, cz = p.z + Math.cos(y) * -0.12, cy = (p.y || 0) + 1.6;
      if (C.meAv) C.meAv.root.visible = false;
      C.camera.position.set(cx + Math.sin(r) * dist, cy + 0.1, cz + Math.cos(r) * dist);
      C.camera.lookAt(cx, cy, cz); C.camera.updateMatrixWorld();
      C.camera.matrixWorldInverse.copy(C.camera.matrixWorld).invert();
      for (let i = 0; i < 3; i++) { C.world.update(0.016, C.t, C.me, C.camera); C.R.render(C.scene, C.camera, 0.016, C.world); }
      void T;
    }, { p, a, dist });
    const file = path.join(out, `${id}_${name}.png`);
    await page.screenshot({ path: file });
    console.log('saved', file);
  }
  console.log(id, 'statue', ok ? 'visible' : 'MISSING', 'tris per LOD', JSON.stringify(info), errors.length ? 'ERRORS ' + errors.join(' | ') : '');
  if (!ok || errors.length) bad++;
  await page.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
