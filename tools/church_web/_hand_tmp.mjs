// 사용: node tools/church_web/rosary_shots.mjs <outDir> [church=basic]
// 묵주를 든 아바타(SPEC §32) 스크린샷: 서기·앉아 기도·무릎 꿇기 × 정면/측면, 그리고 다른 사람(peer, r:1)이 든 모습.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = '/home/user/rosary-app/assets/church';
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

await view(150,0.05,0.22); await shot('hand_a'); await view(230,0.05,0.22); await shot('hand_b');
await browser.close();
