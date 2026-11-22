// 아시시 확인 샷(docs/church/interiors/assisi.md §확인): 상부 신랑·후진·벽화 띠·장미창·궁륭, 하부 신랑, 묘소, 계단(층 사이), 앉은 기도 시점.
// 사용: node tools/church_web/assisi_shots.mjs [--out 폴더] [--hour 11] [view ...]
//   fixed 시점은 three 카메라를 직접 놓는다(아바타 숨김). rig 시점(stairs_*, pray)은 앱 카메라 리그(cam_guard)로 아바타를 그 층에 세워 찍는다.
// 헤드리스 swiftshader 라 느리다(시점당 20~60초). 결과 줄: 시점, 파일, draw call·삼각형, 그린 층 표(U·L·C), 오류.
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
const outDir = path.resolve(opt('out', path.resolve(here, '../../art/assisi/shots')));
const named = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
fs.mkdirSync(outDir, { recursive: true });
const YU = 10.2, YL = 3.6;
// fixed: pos = 카메라, look = 보는 점, at = 아바타(층을 정함)
const VIEWS = {
  nave: { file: '01_upper_nave', size: '720x900', pos: [0, YU + 1.6, 26.6], look: [0, YU + 4.0, -6], fov: 58, at: [0, 26.3, YU] },
  apse: { file: '02_upper_apse', size: '900x700', pos: [0, YU + 1.7, 3.2], look: [0, YU + 3.0, -11], fov: 60, at: [0, 2.6, YU] },
  fresco: { file: '03_upper_fresco_wall', size: '960x600', pos: [-2.0, YU + 1.7, 14.0], look: [3.9, YU + 2.6, 9.0], fov: 60, at: [-2.0, 14.0, YU] },
  rose: { file: '04_upper_rose', size: '720x900', pos: [0, YU + 1.7, 12.0], look: [0, YU + 8.6, 28.08], fov: 55, at: [0, 12.0, YU] },
  vault: { file: '05_upper_vault', size: '720x900', pos: [0, YU + 1.6, 24.0], look: [0, YU + 10.8, 6.0], fov: 70, at: [0, 24.0, YU] },
  transept: { file: '06_upper_transept_door', size: '960x600', pos: [-2.5, YU + 1.7, 0.5], look: [7.4, YU + 2.0, -7.5], fov: 62, at: [-2.5, 0.5, YU] },
  lower: { file: '07_lower_nave', size: '900x700', pos: [0, YL + 1.6, 22.5], look: [0, YL + 1.6, -6], fov: 62, at: [0, 22.5, YL] },
  lower_altar: { file: '08_lower_altar', size: '900x700', pos: [-1.6, YL + 1.6, 3.0], look: [0, YL + 1.2, -4.5], fov: 60, at: [-1.6, 3.0, YL] },
  wells: { file: '09_lower_crypt_stairs', size: '900x700', pos: [0, YL + 1.8, 13.0], look: [1.8, YL - 1.0, 5.5], fov: 60, at: [0, 13.0, YL] },
  crypt: { file: '10_crypt', size: '900x700', pos: [0, 1.55, 0.9], look: [0, 1.0, -3.75], fov: 66, at: [0, 0.9, 0] },
  crypt_side: { file: '11_crypt_ambulatory', size: '900x700', pos: [2.2, 1.5, -2.0], look: [-0.4, 1.1, -4.6], fov: 66, at: [2.2, -2.0, 0] },
  stair_up: { file: '12_stair_lower_to_upper', size: '720x900', pos: [4.9, YL + 1.6, -6.4], look: [4.9, YL + 4.5, -16], fov: 62, at: [4.9, -6.6, YL] },
  terrace: { file: '13_terrace_corridor', size: '720x900', pos: [7.4, YU + 1.6, -20.6], look: [7.4, YU + 1.4, -7.0], fov: 60, at: [7.4, -20.6, YU] },
  night: { file: '14_upper_nave_night', size: '720x900', pos: [0, YU + 1.6, 26.6], look: [0, YU + 4.0, -6], fov: 58, at: [0, 26.3, YU], hour: 22 }
};
// rig: 아바타를 그 자리·층에 세우고 앱 카메라 리그(3인칭)로 몇 프레임 → 층 사이 계단·묘소·앉은 기도
const RIG = {
  rig_stairs_mid: { file: '15_rig_stairs_mid', size: '720x900', at: [4.9, -13.0, 7.0], yaw: 180 },
  rig_well: { file: '16_rig_crypt_stairs', size: '720x900', at: [1.8, 7.0, 2.0], yaw: 0 },
  rig_crypt: { file: '17_rig_crypt', size: '720x900', at: [0, 0.2, 0], yaw: 0 },
  rig_lower: { file: '18_rig_lower', size: '720x900', at: [0, 16.0, YL], yaw: 0 },
  pray: { file: '19_rig_seated_prayer', size: '720x900', sit: 'R03-1', at: [0, 9.9, YU], yaw: 0 }
};
const list = named.length ? named : Object.keys(VIEWS).concat(Object.keys(RIG));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
let failed = 0;
for (const name of list) {
  const V = VIEWS[name] || RIG[name], rig = !VIEWS[name], t0 = Date.now();
  const [W, H] = V.size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const q = new URLSearchParams({ church: 'assisi', autotier: '0', msaa: '0', hideui: '1', solo: '1', markers: '0', hour: String(V.hour ?? opt('hour', '11')), frames: rig ? '90' : '40', x: String(V.at[0]), z: String(V.at[1]), y: String(V.at[2]) });
  if (rig && V.yaw !== undefined) q.set('yaw', String(V.yaw));
  if (V.sit) q.set('sit', V.sit);
  await page.goto('file://' + assets + '/test.html?' + q.toString());
  await page.waitForFunction(() => window.__church && window.__church.done, null, { timeout: 900000, polling: 500 });
  await page.waitForTimeout(1200);
  const info = await page.evaluate(([v, rig]) => {
    const A = window.__church, cam = A.camera;
    if (A.crowd && A.crowd.set) A.crowd.set(false);
    if (!rig) {
      A.meAv.root.visible = false;
      A.scene.traverse((o) => { if (o.userData && o.userData.isAvatar) o.visible = false; });
      cam.fov = v.fov; cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
      cam.position.set(v.pos[0], v.pos[1], v.pos[2]); cam.lookAt(v.look[0], v.look[1], v.look[2]); cam.updateMatrixWorld();
      if (A.world.setViewer) A.world.setViewer(v.pos[1] - 1.6);
      for (let i = 0; i < 4; i++) { A.world.update(1 / 30, A.t + i / 30, A.me, cam); A.R.render(A.scene, cam, 1 / 30, A.world); }
    }
    const r = A.renderer.info.render;
    return { calls: r.calls, tris: r.triangles, levels: A.world.levelKey ? A.world.levelKey() : '', me: [A.me.x, A.me.z, A.me.fy, A.me.mode].map((x) => typeof x === 'number' ? +x.toFixed(2) : x), cam: [cam.position.x, cam.position.y, cam.position.z].map((x) => +x.toFixed(2)) };
  }, [V, rig]);
  const out = path.join(outDir, V.file + '.jpg');
  await page.screenshot({ path: out, type: 'jpeg', quality: 84 });
  console.log(name, out, JSON.stringify(info), ((Date.now() - t0) / 1000).toFixed(1) + 's', errors.length ? 'ERRORS ' + errors.join(' | ') : 'ok');
  if (errors.length) failed++;
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
