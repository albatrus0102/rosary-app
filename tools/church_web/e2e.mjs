// 사용: node tools/church_web/e2e.mjs  — Playwright 로 웹 장면의 API/이벤트/성능을 점검한다(콘솔 에러 0 필수).
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../assets/church');
const SPEC_METHODS = ['init', 'setJoystick', 'sit', 'stand', 'setPraying', 'setAvatar', 'setPeers', 'peerJoin', 'peerLeave', 'peerSnap', 'peerSeat', 'peerStand', 'peerPraying', 'peerEmote', 'setCandles', 'lightCandle', 'setAmbient', 'setHour', 'setSolo', 'setQuality', 'emote', 'setSeatTaken', 'walkTo', 'cancelWalk', 'tapAt'];
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
await page.waitForFunction(() => window.__ev.filter((e) => e.e === 'pos' && e.m === 1).length >= 4, null, { timeout: 120000 }).catch(() => {});
await page.evaluate(() => ChurchAPI.setJoystick({ x: 0, y: 0 }));
await page.waitForFunction(() => window.__ev.some((e) => e.e === 'pos' && e.m === 0), null, { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(500);
const pos = await page.evaluate(() => window.__ev.filter((e) => e.e === 'pos'));
const moving = pos.filter((p) => p.m === 1), stops = pos.filter((p) => p.m === 0);
check('pos events while walking (<=~12/s)', moving.length >= 2 && moving.length <= 25, { moving: moving.length });
check('exactly one m:0 after stopping', stops.length === 1, { stops: stops.length });
check('walked toward altar (z decreased)', moving.length && moving[moving.length - 1].z < 17);
// C-01 터치 영역 분리(걷는 중). 800x450 뷰포트: 왼쪽 절반 x<400
await page.evaluate(() => { window.__pe = (t, id, x, y) => document.getElementById('c').dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' })); });
check('walking: move zone on', await page.evaluate(() => __church.ctl.moveZone === true));
const L = await page.evaluate(() => {
  const c = __church.ctl, y0 = c.yaw, o = {}, mv = { x: 0, y: 0 };
  __pe('pointerdown', 1, 200, 300); __pe('pointermove', 1, 200, 230);
  c.getMove(mv); o.up = { x: mv.x, y: mv.y }; o.active = c.webActive; o.yawSame = c.yaw === y0;
  const st = document.getElementById('stick'); o.stickShown = st.style.display === 'block'; o.stickAt = st.style.transform;
  __pe('pointermove', 1, 260, 300); c.getMove(mv); o.right = { x: mv.x, y: mv.y };
  __pe('pointerup', 1, 260, 300); c.getMove(mv); o.after = { x: mv.x, y: mv.y }; o.activeAfter = c.webActive; o.stickHidden = st.style.display === 'none';
  return o;
});
check('left touch: floating stick at the touch point, forward drag = y 1, camera untouched', L.active && L.up.y > 0.95 && Math.abs(L.up.x) < 0.01 && L.yawSame && L.stickShown && /translate\(140px,\s*240px\)/.test(L.stickAt), L);
check('left touch: right drag = x 1; release stops and hides the stick', L.right.x > 0.9 && L.after.x === 0 && L.after.y === 0 && !L.activeAfter && L.stickHidden, L);
const R = await page.evaluate(() => {
  const c = __church.ctl, y0 = c.yaw, mv = { x: 0, y: 0 };
  __pe('pointerdown', 2, 600, 300); __pe('pointermove', 2, 500, 300);
  c.getMove(mv); const o = { yawChanged: c.yaw !== y0, web: c.webActive, mv: { x: mv.x, y: mv.y } };
  __pe('pointerup', 2, 500, 300); return o;
});
check('right touch: orbits the camera and never moves', R.yawChanged && !R.web && R.mv.x === 0 && R.mv.y === 0, R);
const P = await page.evaluate(() => {
  const c = __church.ctl, z0 = c.zoom, mv = { x: 0, y: 0 };
  __pe('pointerdown', 3, 200, 300); __pe('pointermove', 3, 200, 240);          // 왼손: 스틱
  __pe('pointerdown', 4, 500, 200); __pe('pointerdown', 5, 600, 200);          // 오른손 두 손가락: 핀치
  __pe('pointermove', 5, 700, 200);
  c.getMove(mv); const o = { zoomChanged: c.zoom !== z0, zoom: c.zoom, stick: c.webActive, y: mv.y };
  __pe('pointerup', 5, 700, 200); __pe('pointerup', 4, 500, 200); __pe('pointerup', 3, 200, 240);
  o.dragging = c.dragging; return o;
});
check('pinch on the right while the left stick is held: zoom changes, stick keeps walking', P.zoomChanged && P.stick && P.y > 0.9 && !P.dragging, P);
await page.evaluate(() => { __church.ctl.zoom = 1; });
// 가까운 좌석으로 이동 후 near/sit/seated/stood
await page.evaluate(() => { const m = __church.me; m.x = -5.2; m.z = -10 + 1.9 * 3 + 1.0; });
await page.waitForFunction(() => __church.near && __church.near.seat === 'L03-2', null, { timeout: 120000 }).catch(() => {});
const near = await page.evaluate(() => window.__ev.filter((e) => e.e === 'near').pop());
check('near seat reported', near && near.seat === 'L03-2', near);
await page.evaluate(() => ChurchAPI.sit({}));
await page.waitForFunction(() => window.__ev.some((e) => e.e === 'seated'), null, { timeout: 150000 }).catch(() => {});
const seated = await page.evaluate(() => window.__ev.filter((e) => e.e === 'seated'));
check('seated event after sit animation', seated.length === 1 && seated[0].seat === 'L03-2', seated);
await page.evaluate(() => { ChurchAPI.setJoystick({ x: 1, y: 1 }); ChurchAPI.setPraying({ on: true, ms: 1 }); });
await page.waitForTimeout(1500);
check('joystick ignored while seated', await page.evaluate(() => Math.abs(__church.me.x + 5.2) < 0.01));
// C-02/C-01: 왼쪽 절반 = 떠다니는 스틱(걷는 중에만), 오른쪽 절반 = 카메라. 앉으면 화면 전체가 카메라 영역.
await page.evaluate(() => { window.__pe = (t, id, x, y) => document.getElementById('c').dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' })); });
check('seated: move zone is off (whole screen orbits)', await page.evaluate(() => __church.ctl.moveZone === false));
const seatYaw = await page.evaluate(() => { const c = __church.ctl, y0 = c.yaw; __pe('pointerdown', 6, 200, 300); __pe('pointermove', 6, 150, 300); const r = { moved: c.yaw !== y0, web: c.webActive }; __pe('pointerup', 6, 150, 300); return r; });
check('seated: left-half drag orbits the camera, no stick', seatYaw.moved && !seatYaw.web, seatYaw);
await page.evaluate(() => { ChurchAPI.setJoystick({ x: 0, y: 0 }); ChurchAPI.stand({}); });
await page.waitForFunction(() => window.__ev.some((e) => e.e === 'stood'), null, { timeout: 150000 }).catch(() => {});
const stood = await page.evaluate(() => window.__ev.filter((e) => e.e === 'stood').length);
check('stood event after standing', stood === 1);
check('standing returns to the row corridor', await page.evaluate(() => Math.abs(__church.me.z - (-10 + 1.9 * 3 + 1.0)) < 0.05));
// 서버가 좌석을 거부한 경우
await page.evaluate(() => ChurchAPI.sit({}));
await page.waitForTimeout(300);
await page.evaluate(() => ChurchAPI.setSeatTaken({ seat: 'L03-2' }));
await page.waitForFunction(() => window.__ev.filter((e) => e.e === 'stood').length >= 2, null, { timeout: 150000 }).catch(() => {});
const st2 = await page.evaluate(() => ({ mode: __church.me.mode, stood: window.__ev.filter((e) => e.e === 'stood').length, taken: __church.net.isTaken('L03-2') }));
check('setSeatTaken while sitting -> stands up and posts stood', st2.mode === 'walk' && st2.stood === 2 && st2.taken, st2);
check('taken seat is not offered again', await page.evaluate(() => __church.logic.nearestSeat(-5.2, -10 + 1.9 * 3 + 1.0, (id) => __church.net.isTaken(id)) !== 'L03-2'));
// 스테이션으로 걸어가기(walkTo): 촛불 봉헌대·제대 앞·가까운 빈 자리, 취소, 앉은 채 요청, 표식 탭
{
  const evs = (kind) => page.evaluate((k) => window.__ev.filter((e) => e.e === k), kind);
  const clearEv = () => page.evaluate(() => { window.__ev.length = 0; });
  const waitEv = (name, t = 150000) => page.waitForFunction((n) => window.__ev.some((e) => e.e === n), name, { timeout: t }).then(() => true).catch(() => false);
  const tp = (x, z) => page.evaluate(([x, z]) => { const m = __church.me; m.x = x; m.z = z; m.vx = m.vz = 0; }, [x, z]);
  check('basic: 2 station markers (candle + altar), no font', await page.evaluate(() => __church.markers && __church.markers.items.map((i) => i.kind).sort().join(',') === 'altar,candle'));
  const stEv = await page.evaluate(() => window.__ev.filter((e) => e.e === 'stations').pop());
  check('stations event announces candle/altar/font counts', stEv && stEv.candle === 1 && stEv.altar === 1 && stEv.font === 0, stEv);
  // 1) 촛불 봉헌대
  await tp(5, 3); await clearEv();
  await page.evaluate(() => ChurchAPI.walkTo({ kind: 'candle' }));
  check('walkTo candle: walkDone arrives', await waitEv('walkDone'));
  const w1 = await page.evaluate(() => { const ev = window.__ev; const di = ev.findIndex((e) => e.e === 'walkDone'); const si = ev.findIndex((e) => e.e === 'walkStart'); let ni = -1; ev.forEach((e, i) => { if (e.e === 'near' && e.candle !== null && i <= di) ni = i; }); return { si, di, ni, done: ev[di], m: __church.me }; });
  check('walkStart precedes walkDone and near.candle is reported before walkDone', w1.si >= 0 && w1.si < w1.di && w1.ni >= 0 && w1.done.kind === 'candle', { si: w1.si, di: w1.di, ni: w1.ni });
  check('walkTo candle: ended at the stand (x~9.5, z~0) and faces it', Math.hypot(w1.m.x - 9.5, w1.m.z - 0) < 0.5, { x: w1.m.x, z: w1.m.z });
  check('after the walk the avatar is back in control (no walk state)', await page.evaluate(() => __church.walkSt === null && __church.me.mode === 'walk'));
  // 2) 제대 앞
  await tp(0, -8); await clearEv();
  await page.evaluate(() => ChurchAPI.walkTo({ kind: 'altar' }));
  check('walkTo altar: walkDone', await waitEv('walkDone'));
  const w2 = await page.evaluate(() => ({ near: window.__ev.filter((e) => e.e === 'near' && e.station === 'altar').length, m: { x: __church.me.x, z: __church.me.z }, done: window.__ev.find((e) => e.e === 'walkDone') }));
  check('walkTo altar: near.station is "altar" at the front of the altar', w2.near >= 1 && w2.done.kind === 'altar' && Math.abs(w2.m.z + 16) < 0.4, w2);
  // 3) 조이스틱이 걷기를 끊는다
  await tp(0, -8); await clearEv();
  await page.evaluate(() => ChurchAPI.walkTo({ kind: 'entrance' }));
  check('walkTo entrance: walkStart', await waitEv('walkStart'));
  await page.evaluate(() => ChurchAPI.setJoystick({ x: 1, y: 0 }));
  check('joystick input cancels the auto-walk (walkCancel, no walkDone)', await waitEv('walkCancel') && (await evs('walkDone')).length === 0);
  await page.evaluate(() => ChurchAPI.setJoystick({ x: 0, y: 0 }));
  // 4) 가까운 빈 자리 -> near.seat; 앉은 채 요청하면 먼저 일어선다
  await tp(0, 0); await clearEv();
  await page.evaluate(() => ChurchAPI.walkTo({ kind: 'seat' }));
  check('walkTo seat: walkDone with a seat id', await waitEv('walkDone'));
  const w4 = await page.evaluate(() => ({ done: window.__ev.find((e) => e.e === 'walkDone'), near: __church.near.seat, taken: __church.net.isTaken(window.__ev.find((e) => e.e === 'walkDone').seat) }));
  check('walkTo seat: lands where that seat is nearby and free (near.seat set)', w4.done.kind === 'seat' && !!w4.done.seat && !!w4.near && !w4.taken, w4);
  await page.evaluate(() => ChurchAPI.sit({}));
  check('sits at the arrival spot', await waitEv('seated'));
  await clearEv();
  await page.evaluate(() => ChurchAPI.walkTo({ kind: 'candle' }));
  check('walkTo while seated stands up first, then starts walking', await waitEv('stood') && await waitEv('walkStart'));
  await page.evaluate(() => ChurchAPI.cancelWalk({}));
  check('cancelWalk api posts walkCancel', await waitEv('walkCancel', 20000));
  // 5) 없는 스테이션(성수대)은 walkFail
  await clearEv();
  await page.evaluate(() => ChurchAPI.walkTo({ kind: 'font' }));
  await page.waitForTimeout(300);
  check('walkTo font on a church without one -> walkFail', (await evs('walkFail')).some((e) => e.kind === 'font'));
  // 6) 표식을 탭하면 걸어간다(레이캐스트 + 화면 좌표)
  await tp(0, 6); await clearEv();
  await page.waitForFunction(() => __church.markers.items.every((i) => i.a > 0.6), null, { timeout: 120000 }).catch(() => {});
  const tapXY = await page.evaluate(() => { const it = __church.markers.items.find((i) => i.kind === 'altar'); const v = it.ring.position.clone().project(__church.camera); return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, onScreen: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; });
  const pick = await page.evaluate((t) => __church.markers.pick(t.x / innerWidth * 2 - 1, -(t.y / innerHeight * 2 - 1), __church.camera, innerWidth, innerHeight), tapXY);
  check('marker pick() finds the altar marker at its ring', tapXY.onScreen && pick && pick.kind === 'altar', { tapXY, pick });
  await page.evaluate((t) => ChurchAPI.tapAt({ x: t.x, y: t.y }), tapXY);
  check('tapAt on a marker starts walking there (walkStart altar)', await waitEv('walkStart', 20000) && (await evs('walkStart'))[0].kind === 'altar');
  await page.evaluate(() => ChurchAPI.cancelWalk({}));
  check('marker fades out when you stand at it', await (async () => { await tp(0, -16); await page.waitForFunction(() => __church.markers.items.find((i) => i.kind === 'altar').a < 0.1, null, { timeout: 60000 }).catch(() => {}); return page.evaluate(() => __church.markers.items.find((i) => i.kind === 'altar').a < 0.1); })());
  await tp(-5.2, -10 + 1.9 * 3 + 1.0);
}
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
// 실제 성당(피렌체)에서도 입구 -> 촛불 봉헌대를 걸어서 도착한다
{
  const pg = await browser.newPage({ viewport: { width: 640, height: 360 } });
  await pg.addInitScript(() => { window.__ev = []; window.FlutterChurch = { postMessage: (s) => window.__ev.push(JSON.parse(s)) }; });
  pg.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  await pg.goto('file://' + root + '/index.html');
  await pg.waitForFunction(() => window.ChurchAPI && window.__ev.some((e) => e.e === 'ready'));
  await pg.evaluate(() => ChurchAPI.init({ church: 'florence', hour: 12, quality: 'low', solo: false, ambient: false, avatar: { skin: 1, style: 0, hair: 2, outfit: 6, name: 3 } }));
  await pg.waitForFunction(() => window.__church && window.__church.world && window.__church.world.id === 'florence', null, { timeout: 180000 });
  const sev = await pg.evaluate(() => window.__ev.find((e) => e.e === 'stations'));
  check('florence: stations event (2 candle stands, altar)', sev && sev.church === 'florence' && sev.candle === 2 && sev.altar === 1, sev);
  await pg.evaluate(() => ChurchAPI.walkTo({ kind: 'candle', index: 0 }));
  const ok = await pg.waitForFunction(() => window.__ev.some((e) => e.e === 'walkDone'), null, { timeout: 240000 }).then(() => true).catch(() => false);
  const fl = await pg.evaluate(() => ({ near: __church.near, m: { x: __church.me.x, z: __church.me.z }, fail: window.__ev.filter((e) => e.e === 'walkFail').length }));
  check('florence: walkTo candle reaches the stand (walkDone, near.candle set)', ok && fl.near.candle !== null && Math.hypot(fl.m.x - 6.0, fl.m.z - 29.2) < 0.5 && fl.fail === 0, fl);
  await pg.close();
}
// 카메라: 스폰 지점에서 피치를 최소로 내리면 걷지 않고도 정면 높이 시야에 닿는다(카메라 높이가 눈높이 위 1.6m 이하)
{
  const pg = await browser.newPage({ viewport: { width: 640, height: 360 } });
  await pg.addInitScript(() => { window.__ev = []; window.FlutterChurch = { postMessage: (s) => window.__ev.push(JSON.parse(s)) }; });
  pg.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  await pg.goto('file://' + root + '/index.html');
  await pg.waitForFunction(() => window.ChurchAPI && window.__ev.some((e) => e.e === 'ready'));
  await pg.evaluate(() => ChurchAPI.init({ church: 'basic', hour: 12, quality: 'low', solo: false, ambient: false, avatar: { skin: 1, style: 0, hair: 2, outfit: 6, name: 3 } }));
  await pg.waitForFunction(() => window.__church && window.__church.world && window.__church.frameCount > 3, null, { timeout: 180000 });
  await pg.evaluate(() => {
    const pe = (t, id, x, y) => document.getElementById('c').dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' }));
    pe('pointerdown', 9, 500, 300);
    for (let i = 0; i < 8; i++) pe('pointermove', 9, 500, 300 - (i + 1) * 80);   // 위로 끌기 = 피치 감소(최소까지)
    pe('pointerup', 9, 500, -400);
  });
  const f0 = await pg.evaluate(() => __church.frameCount);
  await pg.waitForFunction((f) => __church.frameCount > f + 25, f0, { timeout: 120000 });
  const cam = await pg.evaluate(() => ({ pitch: __church.ctl.pitch, camY: __church.camera.position.y, eye: __church.me.y + 1.0, meZ: __church.me.z, camZ: __church.camera.position.z }));
  check('spawn + minimal pitch: camera is at most 1.6 m above the eye (level view without walking)', cam.pitch <= 0.061 && cam.camY - cam.eye <= 1.6 && cam.camY >= 0.7, cam);
  // 천장 올려다보기(ctl.look): 최소 피치에서 더 위로 끌면 look 이 쌓이고, 아래로 끌면 피치보다 look 이 먼저 줄며, 걸으면 서서히 0 으로.
  const LK = await pg.evaluate(() => {
    const A = __church, c = A.ctl, o = {};
    const pe = (t, x, y) => document.getElementById('c').dispatchEvent(new PointerEvent(t, { pointerId: 11, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' }));
    c.pitch = 0.3; c.look = 0;
    pe('pointerdown', 500, 300); pe('pointermove', 500, 200);          // 100px 위로: 피치 0.3 → 0.06, 남은 0.16 은 look
    o.a = { pitch: c.pitch, look: c.look };
    pe('pointermove', 500, 100);                                       // 100px 더: look 만 +0.4
    o.b = { pitch: c.pitch, look: c.look };
    pe('pointermove', 500, 150);                                       // 50px 아래로: look 먼저 -0.2, 피치 그대로
    o.c = { pitch: c.pitch, look: c.look };
    pe('pointermove', 500, 300);                                       // 150px 아래로: look 0.36 을 다 쓰고 남은 0.24 는 피치로
    o.d = { pitch: c.pitch, look: c.look };
    for (let i = 0; i < 20; i++) pe('pointermove', 500, 300 - (i + 1) * 60);   // 아주 많이 위로: 상한 1.35
    o.e = { pitch: c.pitch, look: c.look };
    pe('pointerup', 500, -900);
    return o;
  });
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  check('look-up: dragging up past the minimum pitch accumulates ctl.look', near(LK.a.pitch, 0.06) && near(LK.a.look, 0.16) && near(LK.b.pitch, 0.06) && near(LK.b.look, 0.56), LK);
  check('look-up: dragging down lowers look before raising pitch', near(LK.c.pitch, 0.06) && near(LK.c.look, 0.36) && near(LK.d.look, 0) && near(LK.d.pitch, 0.3), LK);
  check('look-up: capped at 1.35 rad, pitch stays at minimum', near(LK.e.look, 1.35) && near(LK.e.pitch, 0.06), LK.e);
  const f1 = await pg.evaluate(() => __church.frameCount);
  await pg.waitForFunction((f) => __church.frameCount > f + 6, f1, { timeout: 120000 });
  const gaze = await pg.evaluate(() => { const d = new THREE.Vector3(); __church.camera.getWorldDirection(d); const u = new THREE.Vector3(0, 1, 0).applyQuaternion(__church.camera.quaternion); return { elevDeg: Math.asin(d.y) * 180 / Math.PI, upY: u.y }; });
  check('look-up: camera gazes upward (elevation > 60 deg) without rolling over', gaze.elevDeg > 60 && gaze.upY > 0, gaze);
  await pg.evaluate(() => ChurchAPI.setJoystick({ x: 0, y: 1 }));
  const decayed = await pg.waitForFunction(() => __church.ctl.look === 0, null, { timeout: 120000 }).then(() => true).catch(() => false);
  await pg.evaluate(() => ChurchAPI.setJoystick({ x: 0, y: 0 }));
  check('look-up: walking decays look back to 0', decayed, await pg.evaluate(() => ({ look: __church.ctl.look })));
  await pg.close();
}
// 창 감상(SPEC §22): 성당 안 → viewWindow(room) → viewReady·질감·아바타 숨김·정지 시 그리기 멈춤 → 제스처 → endView 로 같은 자리 복귀,
// 'church' 모드(지금 성당의 창 자리), 잘못된 id 는 viewError.
{
  const pg = await browser.newPage({ viewport: { width: 480, height: 640 } });
  await pg.addInitScript(() => { window.__ev = []; window.FlutterChurch = { postMessage: (s) => window.__ev.push(JSON.parse(s)) }; });
  pg.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await pg.goto('file://' + root + '/index.html');
  await pg.waitForFunction(() => window.ChurchAPI && window.__ev.some((e) => e.e === 'ready'));
  const missingV = await pg.evaluate(() => ['viewWindow', 'endView', 'setViewLight', 'setViewTier', 'resetView'].filter((k) => typeof window.ChurchAPI[k] !== 'function'));
  check('ChurchAPI has the view methods', missingV.length === 0, missingV);
  await pg.evaluate(() => ChurchAPI.init({ church: 'basic', hour: 12, quality: 'low', solo: false, ambient: false, avatar: { skin: 1, style: 0, hair: 2, outfit: 6, name: 3 } }));
  await pg.waitForFunction(() => window.__church && window.__church.world && window.__church.frameCount > 3, null, { timeout: 180000 });
  await pg.evaluate(() => { const m = __church.me; m.x = 1.5; m.z = 6; __church.ctl.yaw = 0.4; });
  await pg.waitForTimeout(500);
  const before = await pg.evaluate(() => ({ x: __church.me.x, z: __church.me.z, yaw: __church.ctl.yaw, church: __church.church }));
  await pg.evaluate(() => ChurchAPI.viewWindow({ win: 'dove_stpeter', mode: 'room', tier: 't2', light: 'ref' }));
  const vr = await pg.waitForFunction(() => window.__ev.some((e) => e.e === 'viewReady' || e.e === 'viewError'), null, { timeout: 180000 }).then(() => true).catch(() => false);
  const ready = await pg.evaluate(() => window.__ev.find((e) => e.e === 'viewReady'));
  check('viewWindow(room): viewReady {win, tier, ms}', vr && ready && ready.win === 'dove_stpeter' && /^t[12]$/.test(ready.tier) && ready.ms >= 0, ready);
  await pg.waitForFunction(() => { const d = __church.view.debug(); return d.idle && d.tierShown === 't2'; }, null, { timeout: 180000 });
  const st = await pg.evaluate(() => ({ church: __church.church, d: __church.view.debug(), me: __church.meAv.root.visible, raf: __church.rafOn, stations: __church.stations, zone: __church.ctl.moveZone, vm: __church.ctl.viewMode }));
  check('room mode: glass_room scene, t2 shown, <=2 textures, avatar hidden, joystick zone off', st.church === 'glass_room' && st.d.resident.length <= 2 && st.d.resident.includes('dove_stpeter:t2') && !st.me && st.stations === null && st.vm && !st.zone, st);
  check('render-on-demand: the rAF loop stops when idle', st.raf === false, { raf: st.raf });
  check('view profile: SSAO off, Neutral curve', st.d.passes === null || (st.d.passes.ssao === false && (st.d.passes.curve === 1 || st.d.passes.curve === -1)), st.d.passes);
  const z = await pg.evaluate(() => {
    const pe = (t, id, x, y) => document.getElementById('c').dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' }));
    pe('pointerdown', 21, 200, 320); pe('pointerdown', 22, 280, 320); pe('pointermove', 22, 400, 320); pe('pointerup', 22, 400, 320); pe('pointerup', 21, 200, 320);
    const a = __church.view.debug();
    pe('pointerdown', 23, 240, 320); pe('pointermove', 23, 300, 360); pe('pointerup', 23, 300, 360);
    const b = __church.view.debug();
    return { zoom: a.zoom, raf: __church.rafOn, panX: b.panX, panY: b.panY };
  });
  check('pinch zooms (2 fingers) and one finger pans while zoomed; drawing resumes', z.zoom > 1.5 && (z.panX !== 0 || z.panY !== 0), z);
  await pg.waitForFunction(() => __church.view.debug().idle, null, { timeout: 120000 });
  await pg.evaluate(() => {
    const pe = (t, x, y) => document.getElementById('c').dispatchEvent(new PointerEvent(t, { pointerId: 24, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' }));
    pe('pointerdown', 240, 320); pe('pointerup', 240, 320); pe('pointerdown', 242, 321); pe('pointerup', 242, 321);
  });
  await pg.waitForFunction(() => __church.view.debug().idle, null, { timeout: 120000 });
  const rs = await pg.evaluate(() => ({ d: __church.view.debug(), g: window.__ev.filter((e) => e.e === 'viewGesture').map((e) => e.kind) }));
  check('double tap resets to 1x and posts viewGesture zoom/pan/reset', rs.d.zoom === 1 && rs.d.panX === 0 && rs.d.panY === 0 && ['zoom', 'pan', 'reset'].every((k) => rs.g.includes(k)), rs.g);
  await pg.evaluate(() => { ChurchAPI.setViewLight({ light: 'sun', hour: 8.5 }); });
  await pg.waitForFunction(() => __church.view.debug().idle, null, { timeout: 120000 });
  check('setViewLight sun', await pg.evaluate(() => __church.view.debug().light === 'sun'));
  await pg.evaluate(() => ChurchAPI.endView());
  await pg.waitForFunction(() => __church.world && __church.world.id === 'basic' && __church.frameCount > 0, null, { timeout: 180000 });
  await pg.waitForTimeout(800);
  const after = await pg.evaluate(() => ({ x: __church.me.x, z: __church.me.z, yaw: __church.ctl.yaw, church: __church.church, av: __church.meAv.root.visible, end: window.__ev.find((e) => e.e === 'viewEnd'), d: __church.view.debug(), raf: __church.rafOn, vm: __church.ctl.viewMode, markers: !!__church.markers }));
  check('endView: viewEnd {win, seconds, zoomMax, panned} and back at the same place in the same church', after.end && after.end.win === 'dove_stpeter' && after.end.zoomMax > 1.5 && after.end.panned === true && typeof after.end.seconds === 'number' && after.church === 'basic' && Math.hypot(after.x - before.x, after.z - before.z) < 0.05 && Math.abs(after.yaw - before.yaw) < 1e-6, { before, after: { ...after, d: undefined } });
  check('endView: textures released, avatar/markers back, loop running', after.d.resident.length === 0 && after.d.stats.created === after.d.stats.disposed && after.av && after.markers && after.raf && !after.vm, after.d.stats);
  // church 모드: 기본 성당의 옆벽 창 앞에서
  await pg.evaluate(() => { const m = __church.me; m.x = -9; m.z = 0; __church.ctl.yaw = -Math.PI / 2; });
  await pg.waitForTimeout(400);
  await pg.evaluate(() => { window.__ev.length = 0; ChurchAPI.viewWindow({ win: 'lancet_gesta', mode: 'church', tier: 't1' }); });
  await pg.waitForFunction(() => window.__ev.some((e) => e.e === 'viewReady' || e.e === 'viewError'), null, { timeout: 180000 });
  await pg.waitForFunction(() => __church.view.debug().idle, null, { timeout: 180000 });
  const ch = await pg.evaluate(() => ({ d: __church.view.debug(), church: __church.church, ev: window.__ev.filter((e) => /^view/.test(e.e)) }));
  check('church mode: stays in basic, window placed on a wall slot facing the avatar', ch.church === 'basic' && ch.d.mode === 'church' && ch.d.slot && Math.abs(ch.d.slot.x + 12) < 0.6 && ch.ev.some((e) => e.e === 'viewReady'), { slot: ch.d.slot, ev: ch.ev });
  await pg.evaluate(() => ChurchAPI.endView());
  await pg.waitForTimeout(300);
  check('church mode endView restores walk mode', await pg.evaluate(() => !__church.view.active && __church.world.id === 'basic' && !__church.world.viewMode));
  await pg.evaluate(() => { window.__ev.length = 0; ChurchAPI.viewWindow({ win: '../etc', mode: 'room' }); ChurchAPI.viewWindow({ win: 'no_such_window', mode: 'room' }); });
  await pg.waitForFunction(() => window.__ev.filter((e) => e.e === 'viewError').length >= 2, null, { timeout: 60000 }).catch(() => {});
  const ve = await pg.evaluate(() => window.__ev.filter((e) => e.e === 'viewError'));
  check('bad / unknown window id -> viewError unknown (no crash)', ve.length >= 2 && ve.every((e) => e.reason === 'unknown'), ve);
  await pg.close();
}
// 감상만 하려고 연 경우: init 없이 viewWindow → 감상실로 바로(성당을 짓지 않음)
{
  const pg = await browser.newPage({ viewport: { width: 360, height: 640 } });
  await pg.addInitScript(() => { window.__ev = []; window.FlutterChurch = { postMessage: (s) => window.__ev.push(JSON.parse(s)) }; });
  pg.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  await pg.goto('file://' + root + '/index.html');
  await pg.waitForFunction(() => window.ChurchAPI && window.__ev.some((e) => e.e === 'ready'));
  await pg.evaluate(() => ChurchAPI.viewWindow({ win: 'rose_chartres_south', tier: 't1', light: 'night' }));
  const ok = await pg.waitForFunction(() => window.__ev.some((e) => e.e === 'viewReady'), null, { timeout: 180000 }).then(() => true).catch(() => false);
  const info = await pg.evaluate(() => ({ church: __church.church, stations: window.__ev.filter((e) => e.e === 'stations').length, light: __church.view.debug().light }));
  check('viewWindow before init boots straight into the viewing room (no church, no stations event)', ok && info.church === 'glass_room' && info.stations === 0 && info.light === 'night', info);
  await pg.close();
}
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
check('perf event carries tier, avg fps and seated flag', perf.length >= 1 && perf.every((e) => typeof e.fps === 'number' && ['low', 'high'].includes(e.tier) && (e.sat === 0 || e.sat === 1)), perf.slice(-2));
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
