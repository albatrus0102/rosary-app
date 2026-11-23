// 여의도동성당 여러 층 확인 샷(2026-11-23 개정, docs/church/interiors/yeouido.md §9.10): 1층 로비 · 넓힌 곡선 계단 둘 · 2층 로비 · 계단참 → 옆 갤러리 ·
// 성가대석 맨 앞 오른쪽 입구 · 단 3과 가운데 통로 · 성가대석에서 본 신랑 · 계단 위(사용자 제보 자리)·갤러리·통로 카메라 리그(앱 3인칭).
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
// 계단 홀 타원(ch_yeouido.js SH, 2026-11-23 개정 — 계단 폭 3배): 중심 (9, 28.25), 반지름 x 7.5 · z 6.75, 띠 0.40…1.0. 각 th(도): 0 = +x, 90 = +z
// 두 곡선 계단은 78° → −55°: 위 계단 2층(0) → 성가대석 맨 앞 띠(LT), 아래 계단 1층(F1) → 2층(0). 계단참(LT) −55° → −84°, 옆 갤러리 x 11…13
const F1 = -4.2, LT = 3.75, LTOP = LT + 0.28 * 3, TH0 = 78, TH1 = -55, HC = [9, 28.25], HA = 7.5, HB = 6.75;
const P = (rho, th) => [+(HC[0] + rho * HA * Math.cos(th * Math.PI / 180)).toFixed(2), +(HC[1] + rho * HB * Math.sin(th * Math.PI / 180)).toFixed(2)];
// 계단 높이(근사: 각에 따라 고르게 — 아바타 층을 고르는 데만 쓴다, 실제 높이는 앱이 floorY 로 맞춘다)
const yUp = (th) => LT * (TH0 - th) / (TH0 - TH1), yDn = (th) => F1 * (1 - (TH0 - th) / (TH0 - TH1));
const at3 = (p, y) => [p[0], y, p[1]];
const VIEWS = {
  lobby1: { file: '01_lobby_1F', size: '960x640', pos: [-9.6, F1 + 1.6, 24.0], look: [8.0, F1 + 1.4, 30.0], fov: 64, at: [-9.6, 24.0, F1] },
  stair_dn_from_1F: { file: '02_stair_1F_to_2F_from_lobby', size: '960x640', pos: [3.0, F1 + 1.7, 33.5], look: [14.0, F1 + 2.4, 27.0], fov: 66, at: [3.0, 33.5, F1] },
  stair_dn: { file: '03_stair_1F_to_2F_on', size: '720x900', pos: at3(P(0.7, 50), yDn(50) + 1.6), look: at3(P(0.7, -10), yDn(-10) + 1.0), fov: 66, at: [...P(0.7, 50), yDn(50)] },
  lobby2: { file: '04_lobby_2F', size: '960x640', pos: [-9.6, 1.6, 24.0], look: [9.0, 1.2, 29.5], fov: 62, at: [-9.6, 24.0, 0] },
  stair_up_from_2F: { file: '05_stair_2F_to_loft_from_lobby', size: '960x640', pos: [2.6, 1.7, 33.6], look: [13.5, 2.6, 29.0], fov: 66, at: [2.6, 33.6, 0] },
  stair_up: { file: '06_stair_2F_to_loft_on', size: '720x900', pos: at3(P(0.7, 40), yUp(40) + 1.6), look: at3(P(0.7, -30), yUp(-30) + 1.2), fov: 66, at: [...P(0.7, 40), yUp(40)] },
  landing: { file: '07_landing_to_gallery', size: '720x900', pos: at3(P(0.72, -40), yUp(-40) + 1.6), look: [12.0, LT + 1.2, 19.0], fov: 66, at: [...P(0.72, -40), yUp(-40)] },
  gallery: { file: '08_gallery_to_loft_entrance', size: '720x900', pos: [12.0, LT + 1.6, 21.2], look: [11.2, LT + 1.0, 12.4], fov: 64, at: [12.0, 21.2, LT] },
  loft_entrance: { file: '09_loft_entrance_front_right', size: '960x640', pos: [3.5, LT + 1.6, 12.8], look: [11.5, LT + 1.2, 13.2], fov: 64, at: [3.5, 12.8, LT] },
  loft_rows: { file: '10_loft_rows_aisle', size: '960x640', pos: [0.0, LT + 1.7, 12.6], look: [0.0, LTOP + 0.6, 21.0], fov: 70, at: [0.0, 12.6, LT] },
  loft_rows_side: { file: '11_loft_rows_from_right', size: '960x640', pos: [10.3, LT + 1.8, 13.0], look: [-4.0, LT + 0.6, 18.0], fov: 66, at: [10.3, 13.0, LT] },
  nave_from_loft: { file: '12_nave_from_loft_back', size: '720x900', pos: [-2.5, LTOP + 1.6, 20.4], look: [0, 2.6, -10], fov: 60, at: [-2.5, 20.4, LTOP] },
  loft_from_nave: { file: '13_loft_from_nave', size: '960x640', pos: [0, 1.6, 4.0], look: [0, 4.4, 18.0], fov: 66, at: [0, 4.0, 0] },
  under_stair: { file: '14_under_stair_1F', size: '720x900', pos: at3(P(0.25, -10), F1 + 1.55), look: at3(P(0.8, -45), F1 + 1.3), fov: 70, at: [...P(0.25, -10), F1] }
};
const RIG = {
  rig_stair_dn: { file: '15_rig_stair_1F_to_2F', size: '720x900', at: [...P(0.7, 20), yDn(20)], yaw: 0.6 },
  rig_stair_up: { file: '16_rig_stair_2F_to_loft_mid', size: '720x900', at: [...P(0.7, 10), yUp(10)], yaw: 0.2 },
  rig_user_spot: { file: '17_rig_user_spot_stair_top', size: '720x900', at: [...P(0.72, -48), yUp(-48)], yaw: 0 },
  rig_landing: { file: '18_rig_landing', size: '720x900', at: [...P(0.72, -70), LT], yaw: 0.3 },
  rig_gallery: { file: '19_rig_gallery', size: '720x900', at: [12.0, 17.0, LT], yaw: 0 },
  rig_loft_entrance: { file: '20_rig_loft_entrance', size: '720x900', at: [9.6, 12.85, LT], yaw: -1.2 },
  rig_loft_aisle: { file: '21_rig_loft_aisle', size: '720x900', at: [0.0, 16.6, LT + 0.56], yaw: 3.14 },
  rig_seat_D: { file: '22_rig_seated_loft', size: '720x900', sit: 'D01-4', at: [-3.8, 16.5, LT + 0.56], yaw: 0, frames: 220 },   // 앉는 동작·기도 시점이 자리 잡을 때까지
  rig_lobby1: { file: '23_rig_lobby_1F', size: '720x900', at: [-3.0, 27.0, F1], yaw: -1.4 }
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
  const q = new URLSearchParams({ church: 'yeouido', autotier: '0', msaa: '0', hideui: '1', solo: '1', markers: '0', liturgy: 'ordinary', hour: String(V.hour ?? opt('hour', '11')), frames: rig ? String(V.frames || 90) : '40', x: String(V.at[0]), z: String(V.at[1]), y: String(V.at[2]) });
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
