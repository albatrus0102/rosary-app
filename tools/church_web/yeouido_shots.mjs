// 여의도동성당 확인 샷: 사용자 사진(2026-11-16, 저장소에 넣지 않음)과 같은 시점에서 카메라를 직접 놓고(아바타 숨김) 찍는다.
// 사용: node tools/church_web/yeouido_shots.mjs [--out art/yeouido/shots] [--hour 11] [view ...]
//   view: nave(신랑 가운데 통로에서 제단), side(제단 앞 왼쪽에서 오른쪽 위 — 결혼식 사진 시점), close(제단 앞 가까이),
//         up(드럼 올려다보기), shrine(제단 앞 왼쪽 성모상), entrance(정문 안쪽), night(22시 신랑)
// 헤드리스 swiftshader 라 느리다(시점당 20~40초). 앱 카메라 리그를 쓰지 않고 three 카메라를 직접 놓는다(사진과 맞춰 보기 위함).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const outDir = path.resolve(opt('out', path.resolve(here, '../../art/yeouido/shots')));
const named = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
fs.mkdirSync(outDir, { recursive: true });

// pos: 카메라(눈) 자리, look: 보는 점, fov: 세로 화각(도), size: 화면(사진 비율)
const VIEWS = {
  nave: { file: '1_nave_aisle', size: '600x800', pos: [0, 1.55, 6.0], look: [0, 2.7, -14], fov: 50 },
  side: { file: '2_sanctuary_side', size: '700x680', pos: [-5.8, 1.6, 1.0], look: [0.6, 5.2, -11.5], fov: 58 },
  close: { file: '3_sanctuary_close', size: '900x507', pos: [0.3, 1.75, -3.4], look: [0, 3.6, -14], fov: 60 },
  up: { file: '4_drum_up', size: '500x776', pos: [-0.3, 1.7, -2.6], look: [0, 8.4, -13.5], fov: 64 },
  shrine: { file: '5_mary_shrine', size: '960x540', pos: [-5.2, 1.6, -2.0], look: [-7.6, 1.4, -7.4], fov: 52 },
  entrance: { file: '6_entrance', size: '960x540', pos: [0, 1.6, 18.5], look: [0, 3.2, -10], fov: 55 },
  night: { file: '7_night', size: '600x800', pos: [0, 1.55, 6.0], look: [0, 2.7, -14], fov: 50, hour: 22 }
};
const list = named.length ? named : Object.keys(VIEWS);

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
let failed = 0;
for (const name of list) {
  const V = VIEWS[name], t0 = Date.now();
  const [W, H] = V.size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const q = new URLSearchParams({ church: 'yeouido', autotier: '0', msaa: '0', hideui: '1', solo: '1', markers: '0', liturgy: opt('liturgy', 'ordinary'), hour: String(V.hour ?? opt('hour', '11')), frames: '40', x: String(V.pos[0]), z: String(V.pos[2]) });
  await page.goto('file://' + assets + '/test.html?' + q.toString());
  await page.waitForFunction(() => window.__church && window.__church.done, null, { timeout: 600000, polling: 500 });
  await page.waitForTimeout(1500);   // 3D 성모상 묶음(비동기)
  const info = await page.evaluate((v) => {
    const A = window.__church, cam = A.camera;
    A.meAv.root.visible = false;
    if (A.crowd && A.crowd.set) A.crowd.set(false);
    A.scene.traverse((o) => { if (o.userData && o.userData.isAvatar) o.visible = false; });
    cam.fov = v.fov; cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
    cam.position.set(v.pos[0], v.pos[1], v.pos[2]); cam.lookAt(v.look[0], v.look[1], v.look[2]); cam.updateMatrixWorld();
    for (let i = 0; i < 4; i++) { A.world.update(1 / 30, A.t + i / 30, A.me, cam); A.R.render(A.scene, cam, 1 / 30, A.world); }
    const r = A.renderer.info.render;
    return { calls: r.calls, tris: r.triangles };
  }, V);
  const out = path.join(outDir, V.file + '.jpg');
  await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
  console.log(name, out, JSON.stringify(info), ((Date.now() - t0) / 1000).toFixed(1) + 's', errors.length ? 'ERRORS ' + errors.join(' | ') : 'ok');
  if (errors.length) failed++;
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
