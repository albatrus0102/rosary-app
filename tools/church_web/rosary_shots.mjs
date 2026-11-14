// 사용: node tools/church_web/rosary_shots.mjs <outDir> [church=basic]
// 묵주를 든 아바타(SPEC §32) 스크린샷: 서기·앉아 기도·무릎 꿇기 × 정면/측면, 그리고 다른 사람(peer, r:1)이 든 모습.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../assets/church');
const out = process.argv[2] || '/tmp/church_rosary';
const church = process.argv[3] || 'basic';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 720, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
const q = new URLSearchParams({ church, autotier: '0', msaa: '0', hour: '11', markers: '0' });
await page.goto('file://' + root + '/test.html?' + q.toString());
await page.waitForFunction(() => window.__church && window.__church.world && window.__church.meAv, null, { timeout: 120000 });
const sleep = (ms) => page.waitForTimeout(ms);
// 시점: 아바타 기준 각도(0 = 뒤, 180 = 정면, 90 = 옆), 올려다보는 각, 거리 배율
const view = async (deg, pitch, zoom) => {
  await page.evaluate(([deg, pitch, zoom]) => { const A = window.__church; A.ctl.yaw = A.me.yaw + deg * Math.PI / 180; A.ctl.pitch = pitch; A.ctl.zoom = zoom; A.ctl.lastDragT = A.t + 1e6; A.camInit = false; }, [deg, pitch, zoom]);
  await sleep(900);
};
const shot = async (name) => { await page.screenshot({ path: path.join(out, name + '.png') }); console.log('saved', path.join(out, name + '.png')); };

// 1) 서기: 묵주기도 하러 자리로 가는 동안 오른손에 든다
await page.evaluate(() => { const A = window.__church; A.me.x = 0; A.me.z = 6; A.me.yaw = 0; window.ChurchAPI.setRosary({ on: true }); });
await sleep(800);
await view(180, 0.12, 0.42); await shot('stand_front');
await view(270, 0.12, 0.42); await shot('stand_side');

// 2) 앉아 기도
const seat = await page.evaluate(() => { const A = window.__church, L = A.logic; const id = L.seatIds.find((s) => /-2$/.test(s) && L.seatInfo(s).row === 3) || L.seatIds[10]; const st = L.standPos(id); A.me.x = st.x; A.me.z = st.z; window.ChurchAPI.sit({ seat: id }); return id; });
await page.waitForFunction(() => window.__church.me.mode === 'seated', null, { timeout: 60000 });
await page.evaluate(() => window.ChurchAPI.setPraying({ on: true, ms: 1 }));
await sleep(1500);
await view(180, 0.10, 0.5); await shot('sit_front');
await view(270, 0.10, 0.5); await shot('sit_side');
await view(215, 0.25, 0.42); await shot('sit_quarter');

// 3) 무릎 꿇기(앞 등받이에 손)
await page.evaluate(() => window.ChurchAPI.setPrayerPosture({ posture: 'kneel' }));
await sleep(2500);
await view(180, 0.16, 0.5); await shot('kneel_front');
await view(270, 0.10, 0.5); await shot('kneel_side');
await view(35, 0.35, 0.45); await shot('kneel_back_quarter');

// 4) 다른 사람: 옆자리 두 명(한 명은 묵주 r:1, 한 명은 없음), 내 묵주는 내려놓고 본다
await page.evaluate((seat) => {
  const A = window.__church, L = A.logic, i = L.seatIds.indexOf(seat), a = L.seatIds[i + 1], b = L.seatIds[i + 2];
  const cfg = (g, o) => ({ g, skin: 2, style: 1, hair: 4, outfit: o, name: 3, nv: 2 });
  const pa = L.seatPos(a), pb = L.seatPos(b);
  A.net.setPeers([
    { id: 'p1', avatar: cfg(0, 3), x: pa.x, z: pa.z, r: pa.yaw, st: 'p', seat: a, ms: 1, ro: 1 },
    { id: 'p2', avatar: cfg(1, 8), x: pb.x, z: pb.z, r: pb.yaw, st: 'p', seat: b, ms: 1 }
  ], { [a]: 'p1', [b]: 'p2' });
  window.ChurchAPI.setPrayerPosture({ posture: 'sit' });
  window.ChurchAPI.setRosary({ on: false });
}, seat);
await sleep(2500);
await view(200, 0.14, 0.62); await shot('peers_front');
const info = await page.evaluate(() => ({ calls: window.__church.R && window.__church.R.renderer && window.__church.R.renderer.info ? window.__church.R.renderer.info.render.calls : null, tris: window.ChurchAvatar.ROSARY.TRIS }));
console.log(JSON.stringify(info), errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
process.exit(errors.length ? 1 : 0);
