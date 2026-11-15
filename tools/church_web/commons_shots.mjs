// 커먼즈 사진 적용 자리(C-15) 확인용 캡처 + 텍스처 메모리 추정. `node --test` 밖. 자유 카메라(florence_shots.mjs 와 같은 방식).
// 사용: node tools/church_web/commons_shots.mjs --out <dir> [--only florence,stpaul,stpeter,lateran] [--size 800x450] [--prefix a_] [--jpg 82]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../assets/church');

// 성당 → { 이름: [눈 x,y,z, 보는 점 x,y,z, fov] }
export const VIEWS = {
  florence: { frescoes: [-6.2, 2.6, 9.6, -8.9, 3.7, 16.2, 62], hawkwood: [-5.9, 3.3, 13.7, -8.9, 3.6, 13.7, 62], dante: [-5.6, 2.9, 5.55, -8.9, 3.3, 5.55, 50] },
  stpaul: { apse: [0, 2.2, -19.5, 0, 9.6, -30, 72], apse_far: [0, 2.0, 8, 0, 7.5, -30, 40], tomb: [0, 0.75, -14.0, 0, -0.35, -15.8, 62] },
  stpeter: { pieta: [7.6, 1.7, 30.15, 13.8, 2.3, 30.15, 58], pieta_side: [9.2, 1.7, 27.4, 13.8, 2.2, 30.4, 58], peter: [0.6, 1.7, -0.4, 4.2, 2.5, -0.4, 58], peter_side: [1.4, 1.7, 2.6, 4.2, 2.4, -0.6, 58] },
  lateran: { ciborium: [0, 1.9, 1.0, 0, 5.6, -9.4, 58], ciborium_side: [5.2, 2.2, -3.2, 0, 5.2, -9.4, 58] },
};

export async function run(o) {
  const { out, only = Object.keys(VIEWS), size = '800x450', prefix = '', jpg = 82, hour = 11 } = o;
  const [W, H] = size.split('x').map(Number);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const res = {};
  for (const church of only) {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    const q = new URLSearchParams({ church, autotier: '0', msaa: '0', frames: '5', solo: '1', hideui: '1', hour: String(hour) });
    await page.goto('file://' + root + '/test.html?' + q.toString());
    await page.waitForFunction(() => window.__church && window.__church.world, null, { timeout: 180000, polling: 500 });
    await page.waitForFunction(() => window.__church && window.__church.done, null, { timeout: 900000, polling: 500 });
    await page.waitForTimeout(1500);   // 그림 묶음(art_*.js) 읽기
    await page.evaluate(() => {
      window.__florenceTilt = 0;
      const A = window.__church;
      window.__snap = async (v) => {
        const cam = A.camera;
        if (A.meAv && A.meAv.group) A.meAv.group.visible = false;
        if (A.markers && A.markers.items) A.markers.items.forEach((it) => { ['ring', 'sp', 'hit'].forEach((k2) => { if (it[k2]) it[k2].visible = false; }); });
        A.me.x = v[0]; A.me.z = v[2];
        for (let i = 0; i < 4; i++) {
          A.world.update(i === 0 ? 1 : 0.05, A.t, A.me, cam);
          if (A.place) A.place.update(0.05, A.me, cam);
          cam.fov = v[6] || 62; cam.updateProjectionMatrix();
          cam.position.set(v[0], v[1], v[2]); cam.lookAt(v[3], v[4], v[5]); cam.updateMatrixWorld(true);
          A.R.render(A.scene, cam, 0.05, A.world);
          await new Promise((r) => setTimeout(r, 60));
        }
      };
    });
    for (const [name, v] of Object.entries(VIEWS[church])) {
      await page.evaluate((v2) => window.__snap(v2), v);
      await page.screenshot({ path: path.join(out, prefix + church + '_' + name + '.jpg'), type: 'jpeg', quality: jpg });
    }
    // 텍스처 메모리 추정: 장면의 재질이 쓰는 질감(중복 제외)의 너비×높이×4바이트(밉맵 ×4/3)
    res[church] = await page.evaluate(() => {
      const A = window.__church, seen = new Set(); let bytes = 0;
      A.scene.traverse((m) => {
        const ms = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
        ms.forEach((mt) => { for (const k in mt) { const t = mt[k]; if (t && t.isTexture && t.image && !seen.has(t.uuid)) { seen.add(t.uuid); const w = t.image.width || 0, h = t.image.height || 0; bytes += w * h * 4 * (t.generateMipmaps ? 4 / 3 : 1); } } });
      });
      const mem = A.R.renderer.info.memory;
      return { gpuTextures: mem.textures, geometries: mem.geometries, sceneTextures: seen.size, sceneTexMB: +(bytes / 1048576).toFixed(1) };
    });
    console.log(church, JSON.stringify(res[church]), errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
    await page.close();
  }
  await browser.close();
  return res;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === '--out') o.out = a[++i]; else if (k === '--only') o.only = a[++i].split(','); else if (k === '--size') o.size = a[++i]; else if (k === '--prefix') o.prefix = a[++i]; else if (k === '--jpg') o.jpg = +a[++i];
  }
  if (!o.out) { console.error('--out <dir> 가 필요하다'); process.exit(2); }
  await run(o);
}
