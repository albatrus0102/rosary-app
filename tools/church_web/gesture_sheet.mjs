// 사용: node tools/church_web/gesture_sheet.mjs <outDir> [church=basic]
// 성호경 동작 프레임 시트(앞쪽 3/4 시점): 초 켜기 동작(손 뻗기 → 성호경 → 두 손 모음 → 놓음), 앉은 기도 시작 성호경, 기도 끝 성호경.
// 동작 포즈는 emoteT 만의 함수이므로 emoteT 를 정해 놓고 찍는다(결정적). 결과: <outDir>/sheet_light.png, sheet_pray_start.png, sheet_pray_end.png, sheet_all.png + 낱장.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../assets/church');
const out = process.argv[2] || '/tmp/church_gesture';
const church = process.argv[3] || 'basic';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 420, height: 520 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
await page.goto('file://' + root + '/test.html?' + new URLSearchParams({ church, autotier: '0', msaa: '0', hour: '11', markers: '0' }).toString());
await page.waitForFunction(() => window.__church && window.__church.world && window.__church.meAv, null, { timeout: 120000 });
const sleep = (ms) => page.waitForTimeout(ms);
// 시점: 아바타 기준 각도(180 = 정면, 215 = 앞쪽 3/4), 올려다보는 각, 거리 배율
const view = async (deg, pitch, zoom) => {
  await page.evaluate(([deg, pitch, zoom]) => { const A = window.__church; A.ctl.yaw = A.me.yaw + deg * Math.PI / 180; A.ctl.pitch = pitch; A.ctl.zoom = zoom; A.ctl.lastDragT = A.t + 1e6; A.camInit = false; }, [deg, pitch, zoom]);
  await sleep(900);
};
const frames = {};
// 동작 중인 emoteT 를 고정해(update 가 dt 를 더하므로 매 프레임 되돌린다) 찍는다
async function sheet(name, times, begin, zoom = 0.42, deg = 215, pitch = 0.14) {
  const files = [];
  await begin();
  await view(deg, pitch, zoom);
  for (const t of times) {
    await page.evaluate((t) => {
      const A = window.__church, av = A.meAv; window.__pin = t;
      if (window.__pinId) cancelAnimationFrame(window.__pinId);
      const loop = () => { if (av.emote >= 0) av.emoteT = window.__pin; window.__pinId = requestAnimationFrame(loop); };
      loop();
    }, t);
    await sleep(350);
    const f = path.join(out, `${name}_${String(Math.round(t * 100)).padStart(4, '0')}.png`);
    await page.screenshot({ path: f });
    files.push({ f, t });
  }
  await page.evaluate(() => { cancelAnimationFrame(window.__pinId); window.__pinId = 0; });
  frames[name] = files;
}

// 1) 서 있는 채 초 켜기 동작
await page.evaluate(() => { const A = window.__church; A.me.x = 0; A.me.z = 6; A.me.yaw = 0; window.ChurchAPI.setRosary({ on: false }); });
await sleep(600);
await sheet('light', [0.3, 0.8, 1.5, 2.0, 2.6, 3.2, 3.55, 4.1, 4.8, 5.5, 5.8], async () => {
  await page.evaluate(() => { const A = window.__church; A.meAv.playLightGesture(); });
});
await sleep(800);
// 2) 앉아서 기도 시작/끝 성호경
await page.evaluate(() => { const A = window.__church, L = A.logic; const id = L.seatIds.find((s) => /-2$/.test(s) && L.seatInfo(s).row === 3) || L.seatIds[10]; const st = L.standPos(id); A.me.x = st.x; A.me.z = st.z; window.ChurchAPI.sit({ seat: id }); });
await page.waitForFunction(() => window.__church.me.mode === 'seated', null, { timeout: 60000 });
await sleep(1200);
await sheet('start', [0.3, 0.8, 1.3, 1.7, 2.1, 2.5, 3.0], async () => {
  await page.evaluate(() => window.ChurchAPI.setPraying({ on: true, ms: 1 }));
}, 0.5, 215, 0.12);
await sleep(4500);
await sheet('end', [0.3, 0.8, 1.3, 1.7, 2.1, 2.5], async () => {
  await page.evaluate(() => window.ChurchAPI.setPraying({ on: false }));
}, 0.5, 215, 0.12);
await sleep(300);

// 낱장을 시트 한 장으로 합친다(브라우저 페이지에서 그리드)
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const names = { light: '초 켜기 동작', start: '기도 시작 성호경(앉아)', end: '기도 끝 성호경(앉아)' };
const html = (keys) => `<body style="margin:0;background:#1b1b22;color:#eee;font:13px sans-serif">${keys.map((k) => `<div style="padding:6px 10px">${names[k]}</div><div style="display:flex;flex-wrap:wrap">${frames[k].map((x) => `<div style="position:relative;width:310px;height:384px;overflow:hidden;margin:2px"><img src="${b64(x.f)}" style="width:310px;margin-top:-20px"><span style="position:absolute;left:6px;top:4px;background:#000a;padding:1px 5px;border-radius:4px">${x.t.toFixed(2)}s</span></div>`).join('')}</div>`).join('')}</body>`;
const sp = await browser.newPage({ viewport: { width: 1600, height: 900 } });
for (const keys of [['light'], ['start'], ['end'], ['light', 'start', 'end']]) {
  await sp.setContent(html(keys));
  await sp.waitForTimeout(300);
  const f = path.join(out, keys.length > 1 ? 'sheet_all.png' : keys[0] === 'light' ? 'sheet_light.png' : keys[0] === 'start' ? 'sheet_pray_start.png' : 'sheet_pray_end.png');
  await sp.screenshot({ path: f, fullPage: true });
  console.log('saved', f);
}
if (errors.length) console.log('errors:', errors.slice(0, 8));
await browser.close();
