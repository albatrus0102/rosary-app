// 사용: node tools/church_web/e2e.mjs  — Playwright 로 웹 장면의 API/이벤트/성능을 점검한다(콘솔 에러 0 필수).
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../assets/church');
const SPEC_METHODS = ['init', 'setJoystick', 'sit', 'stand', 'setPraying', 'setAvatar', 'setPeers', 'peerJoin', 'peerLeave', 'peerSnap', 'peerSeat', 'peerStand', 'peerPraying', 'peerEmote', 'setCandles', 'lightCandle', 'setAmbient', 'setHour', 'setSolo', 'setQuality', 'emote', 'setSeatTaken'];
let fail = 0;
function check(name, cond, extra) { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fail++; }

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
// Flutter 채널 흉내: 이벤트를 모은다
await page.addInitScript(() => { window.__ev = []; window.FlutterChurch = { postMessage: (s) => window.__ev.push(JSON.parse(s)) }; });
await page.goto('file://' + root + '/index.html');
await page.waitForFunction(() => window.ChurchAPI && window.__ev.some((e) => e.e === 'ready'));
check('ready event posted', true);
const missing = await page.evaluate((m) => m.filter((k) => typeof window.ChurchAPI[k] !== 'function'), SPEC_METHODS);
check('ChurchAPI has every SPEC method', missing.length === 0, missing);
// 초기화 전 호출은 큐에 쌓였다가 init 후 적용된다
await page.evaluate(() => { ChurchAPI.setAmbient({ on: false }); ChurchAPI.setHour({ hour: 12 }); ChurchAPI.init({ church: 'nonexistent', avatar: { skin: 2, style: 3, hair: 4, outfit: 5, name: 12 }, hour: 11, ambient: false, solo: false, quality: 'low' }); });
await page.waitForFunction(() => window.__church && window.__church.world);
check('unknown church falls back to basic', (await page.evaluate(() => __church.world.id)) === 'basic');
check('low quality pixel ratio <= 1.5', await page.evaluate(() => __church.renderer.getPixelRatio() <= 1.5));
const N = await page.evaluate(() => ({ seats: __church.logic.seats.length, slots: __church.logic.slotCount }));
check('basic 144 seats / 96 slots', N.seats === 144 && N.slots === 96, N);
// 걷기: 조이스틱 -> pos 이벤트(<=10Hz), 멈추면 m:0 한 번
await page.evaluate(() => ChurchAPI.setJoystick({ x: 0, y: 1 }));
await page.waitForTimeout(1500);
await page.evaluate(() => ChurchAPI.setJoystick({ x: 0, y: 0 }));
await page.waitForTimeout(800);
const pos = await page.evaluate(() => window.__ev.filter((e) => e.e === 'pos'));
const moving = pos.filter((p) => p.m === 1), stops = pos.filter((p) => p.m === 0);
check('pos events while walking (<=~12/s)', moving.length >= 2 && moving.length <= 25, { moving: moving.length });
check('exactly one m:0 after stopping', stops.length === 1, { stops: stops.length });
check('walked toward altar (z decreased)', moving.length && moving[moving.length - 1].z < 17);
// 가까운 좌석으로 이동 후 near/sit/seated/stood
await page.evaluate(() => { const m = __church.me; m.x = -5.2; m.z = -10 + 1.9 * 3 + 1.0; });
await page.waitForTimeout(400);
const near = await page.evaluate(() => window.__ev.filter((e) => e.e === 'near').pop());
check('near seat reported', near && near.seat === 'L03-2', near);
await page.evaluate(() => ChurchAPI.sit({}));
await page.waitForFunction(() => window.__ev.some((e) => e.e === 'seated'), null, { timeout: 15000 }).catch(() => {});
const seated = await page.evaluate(() => window.__ev.filter((e) => e.e === 'seated'));
check('seated event after sit animation', seated.length === 1 && seated[0].seat === 'L03-2', seated);
await page.evaluate(() => { ChurchAPI.setJoystick({ x: 1, y: 1 }); ChurchAPI.setPraying({ on: true, ms: 1 }); });
await page.waitForTimeout(500);
check('joystick ignored while seated', await page.evaluate(() => Math.abs(__church.me.x + 5.2) < 0.01));
await page.evaluate(() => { ChurchAPI.setJoystick({ x: 0, y: 0 }); ChurchAPI.stand({}); });
await page.waitForFunction(() => window.__ev.some((e) => e.e === 'stood'), null, { timeout: 15000 }).catch(() => {});
const stood = await page.evaluate(() => window.__ev.filter((e) => e.e === 'stood').length);
check('stood event after standing', stood === 1);
check('standing returns to the row corridor', await page.evaluate(() => Math.abs(__church.me.z - (-10 + 1.9 * 3 + 1.0)) < 0.05));
// 서버가 좌석을 거부한 경우
await page.evaluate(() => ChurchAPI.sit({}));
await page.waitForTimeout(300);
await page.evaluate(() => ChurchAPI.setSeatTaken({ seat: 'L03-2' }));
await page.waitForFunction(() => window.__ev.filter((e) => e.e === 'stood').length >= 2, null, { timeout: 15000 }).catch(() => {});
const st2 = await page.evaluate(() => ({ mode: __church.me.mode, stood: window.__ev.filter((e) => e.e === 'stood').length, taken: __church.net.isTaken('L03-2') }));
check('setSeatTaken while sitting -> stands up and posts stood', st2.mode === 'walk' && st2.stood === 2 && st2.taken, st2);
check('taken seat is not offered again', await page.evaluate(() => __church.logic.nearestSeat(-5.2, -10 + 1.9 * 3 + 1.0, (id) => __church.net.isTaken(id)) !== 'L03-2'));
// 혼자 모드 NPC
await page.evaluate(() => ChurchAPI.setSolo({ on: true }));
const npc = await page.evaluate(() => Object.keys(__church.crowd.isTaken ? (() => { const o = {}; __church.logic.seatIds.forEach((id) => { if (__church.crowd.isTaken(id)) o[id] = 1; }); return o; })() : {}).length);
check('solo NPCs 6..10 seated', npc >= 6 && npc <= 10, npc);
await page.evaluate(() => ChurchAPI.setSolo({ on: false }));
check('solo off removes NPC seats', await page.evaluate(() => __church.logic.seatIds.every((id) => !__church.crowd.isTaken(id))));
// 촛불: 만료 없음(until:0), 96 슬롯
await page.evaluate(() => { ChurchAPI.setCandles({ candles: [{ slot: 5, until: 0, intention: 3 }] }); ChurchAPI.lightCandle({ slot: 95, until: 0, intention: 7 }); ChurchAPI.lightCandle({ slot: 95, until: 0, intention: 2 }); });
check('candles lit (5, 95) and re-light does not duplicate', await page.evaluate(() => __church.world.isLit(5) && __church.world.isLit(95) && __church.world.litCount() === 2));
// 많은 피어: AOI / 80명 제한
const t0 = Date.now();
await page.evaluate(() => {
  const peers = [];
  for (let i = 0; i < 3000; i++) peers.push({ id: 'p' + i, avatar: { skin: i % 4, style: i % 4, hair: i % 10, outfit: i % 12, name: i % 40 }, x: (i % 60) * 0.35 - 10, z: 18 - Math.floor(i / 60) * 0.7, r: 0, st: 'w', seat: null, ms: -1 });
  ChurchAPI.setPeers({ peers, seats: {} });
});
await page.waitForTimeout(1500);
const vis = await page.evaluate(() => ({ total: __church.net.count(), visible: __church.net.visibleCount() }));
check('3000 remembered peers, <=80 drawn', vis.total === 3000 && vis.visible <= 80 && vis.visible > 0, vis);
await page.evaluate(() => { for (let i = 0; i < 3000; i++) ChurchAPI.peerLeave({ id: 'p' + i, aoi: true }); });
await page.waitForTimeout(800);
const hid = await page.evaluate(() => ({ total: __church.net.count(), visible: __church.net.visibleCount() }));
check('aoi leave hides but keeps records', hid.total === 3000 && hid.visible === 0, hid);
await page.evaluate(() => ChurchAPI.peerSnap({ p: [['p7', 0, 15, 0, 'w'], ['p8', 1, 15, 0, 'w']] }));
await page.waitForTimeout(800);
check('snapshot re-shows hidden peers', await page.evaluate(() => __church.net.visibleCount() === 2));
await page.evaluate(() => ChurchAPI.peerLeave({ id: 'p7' }));
check('true leave removes record', await page.evaluate(() => __church.net.count() === 2999));
const ft = await page.evaluate(async () => { const t = performance.now(); let n = 0; for (let i = 0; i < 200; i++) { ChurchAPI.peerSnap({ p: Array.from({ length: 200 }, (_, k) => ['p' + (k + 100), 1, 2, 0, 'w']) }); n++; } return performance.now() - t; });
check('200 snapshot batches x200 peers cheap (<500ms)', ft < 500, Math.round(ft));
// 화질 자동 하향: 고화질로 시작한 뒤 프레임 시간이 길면 tier 'low' perf 이벤트가 온다(소프트웨어 렌더에서는 보통 발생)
{
  const pg = await browser.newPage({ viewport: { width: 640, height: 360 } });
  await pg.addInitScript(() => { window.__ev = []; window.FlutterChurch = { postMessage: (s) => window.__ev.push(JSON.parse(s)) }; });
  pg.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  await pg.goto('file://' + root + '/index.html');
  await pg.waitForFunction(() => window.ChurchAPI && window.__ev.some((e) => e.e === 'ready'));
  await pg.evaluate(() => ChurchAPI.init({ church: 'basic', hour: 12, quality: 'high', solo: false, ambient: false, avatar: { skin: 1, style: 0, hair: 2, outfit: 6, name: 3 } }));
  const t = await pg.waitForFunction(() => window.__church && window.__church.R && window.__church.R.tier, null, { timeout: 120000 }).then(() => true).catch(() => false);
  check('high tier starts with composer-capable renderer', t && await pg.evaluate(() => ['high', 'low'].includes(__church.R.tier)));
  const down = await pg.waitForFunction(() => window.__ev.some((e) => e.e === 'perf' && e.tier === 'low'), null, { timeout: 200000 }).then(() => true).catch(() => false);
  const info = await pg.evaluate(() => ({ tier: __church.R.tier, avg: __church.R.lastAvgMs }));
  console.log('INFO auto-downgrade (software GL)', JSON.stringify({ down, ...info }));
  check('slow frames trigger automatic downgrade with tier field', down ? info.tier === 'low' : info.avg !== undefined && info.avg <= 45, info);
  await pg.close();
}
// perf 이벤트(5초 주기)
await page.waitForTimeout(5500);
const perf = await page.evaluate(() => window.__ev.filter((e) => e.e === 'perf'));
check('perf event posted', perf.length >= 1, perf.slice(-1));
// 시간대/성당 변경, 이모트, 소리 켜기(헤드리스에서 오류 없이)
await page.evaluate(() => { ChurchAPI.setHour({ hour: 18.5 }); ChurchAPI.setHour({ hour: 22 }); ChurchAPI.emote({ e: 1 }); ChurchAPI.peerEmote({ id: 'p8', e: 0 }); ChurchAPI.setAvatar({ avatar: { skin: 0, style: 1, hair: 9, outfit: 11, name: 39 } }); ChurchAPI.setAmbient({ on: true }); ChurchAPI.setQuality({ quality: 'high' }); });
await page.waitForTimeout(1000);
// 프레임 시간
const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t = performance.now(); (function f() { n++; if (performance.now() - t > 3000) res(n / 3); else requestAnimationFrame(f); })(); }));
console.log('INFO headless software-GL fps ~', fps.toFixed(1));
check('no runaway frame cost (>2 fps even in software GL)', fps > 2);
check('no console errors', errors.length === 0, errors.slice(0, 5));
await browser.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
