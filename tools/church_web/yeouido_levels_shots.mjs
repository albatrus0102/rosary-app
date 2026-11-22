// 여의도동성당 여러 층 확인 샷(2026-11-22 3차, docs/church/interiors/yeouido.md §9.8): 1층 로비 · 곡선 계단 둘 · 2층 로비 · 계단참 밑 ·
// 성가대석 밑 · 1층 → 2층 계단 밑 · 성가대석 두 덩이 · 성가대석에서 본 신랑 · 계단 위 카메라 리그(앱 3인칭).
// 사용: node tools/church_web/yeouido_levels_shots.mjs [--out 폴더] [--hour 11] [view ...]
//   fixed 시점은 three 카메라를 직접 놓는다(아바타 숨김, 아바타 자리 = 그 층). rig 시점은 아바타를 그 자리·층에 세우고 앱 카메라 리그로 찍는다.
// 헤드리스 swiftshader 라 느리다(시점당 20~60초). 결과 줄: 시점, 파일, draw call·삼각형, 아바타·카메라 자리, 오류.
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
const outDir = path.resolve(opt('out', path.resolve(here, '../../art/yeouido/shots_levels')));
const named = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
fs.mkdirSync(outDir, { recursive: true });
// 계단 홀 타원(ch_yeouido.js SH): 중심 (10, 26), 반지름 x 5 · z 4.5. 각 th(도): 0 = +x, 90 = +z
const F1 = -4.2, LT = 3.75, LTOP = 5.15;
const P = (rho, th) => [+(10 + rho * 5 * Math.cos(th * Math.PI / 180)).toFixed(2), +(26 + rho * 4.5 * Math.sin(th * Math.PI / 180)).toFixed(2)];
// 계단 높이(근사: 각에 따라 고르게 — 아바타 층을 고르는 데만 쓴다, 실제 높이는 앱이 floorY 로 맞춘다)
const yUp = (th) => LTOP * (78 - th) / 168, yDn = (th) => F1 * (1 - (78 - th) / 168);
const at3 = (p, y) => [p[0], y, p[1]];
const VIEWS = {
  lobby1: { file: '01_lobby_1F', size: '960x640', pos: [-9.6, F1 + 1.6, 23.0], look: [9.0, F1 + 1.4, 27.6], fov: 64, at: [-9.6, 23.0, F1] },
  lobby1_stair: { file: '02_lobby_1F_stair', size: '720x900', pos: [5.6, F1 + 1.6, 28.6], look: [13.4, F1 + 3.0, 23.4], fov: 64, at: [5.6, 28.6, F1] },
  stair_dn: { file: '03_stair_1F_to_2F', size: '720x900', pos: at3(P(0.85, 30), yDn(30) + 1.6), look: at3(P(0.85, -40), yDn(-40) + 1.0), fov: 66, at: [...P(0.85, 30), yDn(30)] },
  lobby2: { file: '04_lobby_2F', size: '960x640', pos: [-9.6, 1.6, 23.0], look: [9.0, 1.0, 27.0], fov: 62, at: [-9.6, 23.0, 0] },
  lobby2_well: { file: '05_lobby_2F_well_down', size: '720x900', pos: [7.4, 2.6, 26.0], look: [10.4, F1 + 0.3, 26.2], fov: 66, at: [7.4, 26.0, 0] },
  under_landing: { file: '06_under_landing', size: '720x900', pos: [6.4, 1.6, 23.8], look: [11.0, 0.4, 22.2], fov: 66, at: [6.4, 23.8, 0] },
  stair_up: { file: '07_stair_2F_to_loft', size: '720x900', pos: at3(P(0.85, 60), yUp(60) + 1.6), look: at3(P(0.85, -10), yUp(-10) + 1.2), fov: 66, at: [...P(0.85, 60), yUp(60)] },
  under_loft: { file: '08_under_loft_right', size: '960x640', pos: [2.5, 1.6, 14.5], look: [10.0, 1.4, 19.5], fov: 64, at: [2.5, 14.5, 0] },
  under_loft_wide: { file: '09_under_loft_from_nave', size: '960x640', pos: [0, 1.6, 7.0], look: [0, 2.0, 20.0], fov: 66, at: [0, 7.0, 0] },
  under_stair: { file: '10_under_stair_1F', size: '720x900', pos: at3(P(0.35, -20), F1 + 1.55), look: at3(P(0.95, -70), F1 + 1.3), fov: 70, at: [...P(0.35, -20), F1] },
  loft_left: { file: '11_loft_left_block', size: '960x640', pos: [-2.0, LT + 0.84 + 1.6, 19.4], look: [-9.5, LT + 0.4, 13.2], fov: 64, at: [-2.0, 19.4, LT + 0.84] },
  loft_right: { file: '12_loft_right_block', size: '720x900', pos: [9.2, LTOP + 1.6, 20.4], look: [6.4, LT + 0.5, 12.6], fov: 64, at: [9.2, 20.4, LTOP] },
  nave_from_loft: { file: '13_nave_from_loft', size: '720x900', pos: [-1.8, LT + 0.56 + 1.6, 16.0], look: [0, 2.6, -10], fov: 60, at: [-1.8, 16.0, LT + 0.56] }
};
const RIG = {
  rig_stair_up: { file: '14_rig_stair_up_mid', size: '720x900', at: [...P(0.85, 0), yUp(0)], yaw: 0 },
  rig_stair_up_top: { file: '15_rig_stair_up_top', size: '720x900', at: [...P(0.85, -60), yUp(-60)], yaw: 1.2 },
  rig_stair_dn: { file: '16_rig_stair_dn_mid', size: '720x900', at: [...P(0.85, 0), yDn(0)], yaw: 0 },
  rig_stair_dn_low: { file: '17_rig_stair_dn_low', size: '720x900', at: [...P(0.85, 55), yDn(55)], yaw: -0.9 },
  rig_under_stair: { file: '18_rig_under_stair_1F', size: '720x900', at: [...P(0.82, -50), F1], yaw: 2.6 },
  rig_under_loft: { file: '19_rig_under_loft', size: '720x900', at: [8.0, 17.0, 0], yaw: 0 },
  rig_loft_left: { file: '20_rig_loft_left', size: '720x900', at: [-6.0, 14.9, LT + 0.28], yaw: 0 },
  rig_lobby1: { file: '21_rig_lobby_1F', size: '720x900', at: [-3.0, 25.0, F1], yaw: -1.4 },
  rig_seat_D: { file: '22_rig_seated_loft', size: '720x900', sit: 'D02-6', at: [0.65, 17.0, LT + 0.84], yaw: 0 }
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
  const q = new URLSearchParams({ church: 'yeouido', autotier: '0', msaa: '0', hideui: '1', solo: '1', markers: '0', liturgy: 'ordinary', hour: String(V.hour ?? opt('hour', '11')), frames: rig ? '90' : '40', x: String(V.at[0]), z: String(V.at[1]), y: String(V.at[2]) });
  if (rig && V.yaw !== undefined) q.set('yaw', String(V.yaw * 180 / Math.PI));
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
      if (A.world.setViewer) A.world.setViewer(v.at[2]);
      for (let i = 0; i < 4; i++) { A.world.update(1 / 30, A.t + i / 30, A.me, cam); A.R.render(A.scene, cam, 1 / 30, A.world); }
    }
    const r = A.renderer.info.render;
    return { calls: r.calls, tris: r.triangles, me: [A.me.x, A.me.z, A.me.fy, A.me.mode].map((x) => typeof x === 'number' ? +x.toFixed(2) : x), cam: [cam.position.x, cam.position.y, cam.position.z].map((x) => +x.toFixed(2)) };
  }, [V, rig]);
  const out = path.join(outDir, V.file + '.jpg');
  await page.screenshot({ path: out, type: 'jpeg', quality: 84 });
  console.log(name, out, JSON.stringify(info), ((Date.now() - t0) / 1000).toFixed(1) + 's', errors.length ? 'ERRORS ' + errors.join(' | ') : 'ok');
  if (errors.length) failed++;
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
