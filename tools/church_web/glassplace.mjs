// 성당 안 진본 창(G-29) 렌더 시험 — `node --test` 밖(헤드리스 swiftshader 로 몇 분).
// 사용: node tools/church_web/glassplace.mjs [--only color,fps,flicker,fallback,mem,events] [--church florence,stpeter,stpaul,milan] [--out dir]
//
// (1) color : 걷기('walk') 프로필 그대로(색보정·ACES·SSAO·블룸 켜짐) 창 정면에 카메라를 놓고 그린 화면을 마스터 사진과 비교한다
//             (glasscolor.mjs 와 같은 방법: 4×4 블록, 윤곽 안쪽, CIEDE2000). high / low 화질 둘 다. 합격: 중앙값 ≤ 3.0.
//             ※ 재는 것은 '걷기 화면에서도 렌더 파이프라인이 사진 값을 바꾸지 않는가'. 실제 유리 색을 재는 것이 아니다.
// (2) fps   : 같은 시점에서 ?photoglass=0(절차적 유리만) 과 켠 상태의 프레임 시간(R.render 직접 호출 N 회 평균). 합격: 느려짐 ≤ 5%.
// (3) flicker: flicker.mjs 방법(카메라 고정, depthFunc 교대)으로 창이 보이는 시점의 최악 32×32 블록 ≤ 2.0.
// (4) fallback: gpack 을 못 읽게 막아도 오류 없이 절차적 유리로 그린다(질감 0장, viewError 없음).
// (5) mem   : 성당마다 올라간 창 질감 수 = 그 성당 대응표의 창 수, 다른 성당으로 가면 앞 성당 것은 해제.
// (6) events: 창 앞에 서면 glassNear{id}, 벗어나면 glassNear{id:null}, 창을 누르면 glassTap{id}.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { grabMaster, compareColor } from './glasscolor.mjs';
import { measure as flickerMeasure, THRESH as FLICKER_THRESH } from './flicker.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const GP = require('../../assets/church/glass_placements.js');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../assets/church');
const ARGS = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
export const LIMITS = { median: 3.0, fpsLoss: 0.05, flicker: FLICKER_THRESH };
export const CHURCHES = ['florence', 'stpeter', 'stpaul', 'milan'];
// 깜박임·fps 시점: 창이 화면에 들어오는 걷기 시점
export const VIEWS = {
  florence: [{ tag: 'drum', x: 0, z: 6, yaw: 0, pitch: 5, look: 38, hour: 11 }, { tag: 'facade', x: 0, z: 16, yaw: 180, pitch: 5, look: 40, hour: 11 }],
  stpeter: [{ tag: 'apse', x: 0, z: -22, yaw: 0, pitch: 5, look: 22, hour: 11 }],
  stpaul: [{ tag: 'nave', x: 0, z: 14, yaw: 0, pitch: 6, look: 18, hour: 11 }, { tag: 'aisle', x: 13, z: 12, yaw: -90, pitch: 5, look: 12, hour: 11 }],
  milan: [{ tag: 'apse', x: 0, z: -18, yaw: 0, pitch: 5, look: 8, hour: 11 }]
};

async function open(browser, id, { quality = 'high', size = '640x640', photo = true, extra = {}, block = false } = {}) {
  const [W, H] = size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|ERR_FILE_NOT_FOUND/.test(m.text())) errors.push(m.text()); });
  if (block) await page.route(/gpack_/, (r) => r.abort());
  const q = new URLSearchParams({ church: id, autotier: '0', msaa: '0', quality, solo: '0', hideui: '1', markers: '0', hour: '11', ...(photo ? {} : { photoglass: '0' }), ...extra });
  await page.goto('file://' + root + '/test.html?' + q);
  await page.waitForFunction(() => window.__church && window.__church.world && window.__church.frameCount > 2, null, { timeout: 240000, polling: 250 });
  await page.waitForFunction(() => { const d = __church.place.debug(); return d.groups.every((g) => g.state === 'ready' || g.state === 'error'); }, null, { timeout: 240000, polling: 250 });
  return { page, errors };
}
// 그리기 고리를 멈춘다(이후에는 시험이 R.render 를 직접 부른다)
async function freeze(page) {
  await page.evaluate(() => { __church.maxFrames = __church.frameCount; if (__church.meAv) __church.meAv.root.visible = false; });
  await page.waitForFunction(() => __church.done, null, { timeout: 120000, polling: 100 });
}

// 창 정면(법선 위, 창이 화면 높이·폭의 70% 안)에 카메라를 놓고 걷기 프로필로 그린다 → 화면 화소 + 창 사각형
async function grabFront(page, slotIndex, fov = 35) {
  return page.evaluate(({ si, fov }) => {
    const A = __church, c = document.getElementById('c'), s = A.place.slots()[si], cam = A.camera;
    const d = ChurchGlassMath.frameDistance(s.w, s.h, c.width / c.height, fov, 0.7);
    cam.fov = fov; cam.position.set(s.x + s.nx * d, s.y, s.z + s.nz * d); cam.lookAt(s.x, s.y, s.z);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    A.world.setSkyCenter(cam.position);
    A.place.update(0, null, null);
    for (let i = 0; i < 2; i++) A.R.render(A.scene, cam, 0.016, A.world);
    const cv = document.createElement('canvas'); cv.width = c.width; cv.height = c.height;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(c, 0, 0);
    const px = Array.from(g.getImageData(0, 0, c.width, c.height).data);
    const rx = s.nz, rz = -s.nx;
    const P = (a, b) => { const v = new THREE.Vector3(s.x + rx * a * s.w / 2, s.y + b * s.h / 2, s.z + rz * a * s.w / 2).project(cam); return [(v.x + 1) / 2 * c.width, (1 - v.y) / 2 * c.height]; };
    const tl = P(-1, 1), br = P(1, -1);
    return { W: c.width, H: c.height, rect: [tl[0], tl[1], br[0], br[1]], px, win: s.win, slot: s.slot, profile: A.R.profile, passes: A.R.passes(), tier: A.R.tier, png: cv.toDataURL('image/png') };
  }, { si: slotIndex, fov });
}

export async function colorTest(browser, churches, out, extra = {}) {
  const rows = [];
  for (const id of churches) for (const quality of ['high', 'low']) {
    const { page, errors } = await open(browser, id, { quality, extra });
    await freeze(page);
    const slots = await page.evaluate(() => __church.place.slots().map((s, i) => ({ i, win: s.win, slot: s.slot })));
    // 창 종류(win+slot)마다 하나를 잰다. 측정 카메라와 창 사이에 성당 가구(조각상 벽감, 성가대석)가 끼면 색이 아니라 가림을 재게 되므로
    // 같은 종류의 다른 자리(최대 4곳) → 더 가까운 카메라(시야각 60°, 85°) 순으로 다시 재고 가장 좋은 값을 적는다(tries = 잰 횟수).
    const groups = {};
    for (const s of slots) (groups[s.win + '|' + s.slot] = groups[s.win + '|' + s.slot] || []).push(s);
    for (const key of Object.keys(groups)) {
      const cands = [];
      groups[key].slice(0, 4).forEach((s) => cands.push({ s, fov: 35 }));
      for (const fov of [60, 85]) cands.push({ s: groups[key][0], fov });
      let best = null, tries = 0;
      for (const c of cands) {
        const R = await grabFront(page, c.s.i, c.fov);
        const M = await grabMaster(page, c.s.win, R.W, R.H, R.rect);
        const r = compareColor(R.px, M, R.W, R.H, R.rect);
        tries++;
        if (!best || r.median < best.r.median) best = { R, r, c };
        if (r.median <= LIMITS.median && r.p95 <= 25) break;
      }
      const { R, r, c } = best;
      if (out) { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, `front_${id}_${c.s.slot}_${c.s.win}_${quality}.png`), Buffer.from(R.png.split(',')[1], 'base64')); }
      rows.push({ church: id, quality, slot: c.s.slot, win: c.s.win, index: c.s.i, fov: c.fov, tries, profile: R.profile, ssao: R.passes.ssao, bloom: R.passes.bloom, ...r, pass: r.median <= LIMITS.median });
    }
    if (errors.length) rows.push({ church: id, quality, errors });
    await page.close();
  }
  return rows;
}

async function frameMs(page, v, n) {
  return page.evaluate(({ v, n }) => {
    const A = __church, D = Math.PI / 180, cam = A.camera;
    A.world.setHour(v.hour);
    A.me.x = v.x; A.me.z = v.z; A.ctl.yaw = v.yaw * D; A.me.yaw = A.ctl.yaw; A.ctl.pitch = v.pitch * D; A.ctl.look = (v.look || 0) * D; A.camInit = false;
    // 카메라는 main.js 와 같은 식으로 한 번 계산하게 고리를 3프레임 돌린 뒤 멈춘 상태여야 한다(호출 쪽이 보장)
    const gl = A.renderer.getContext();
    const px = new Uint8Array(4);
    for (let i = 0; i < 3; i++) A.R.render(A.scene, cam, 0.016, A.world);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t0 = performance.now();
    for (let i = 0; i < n; i++) { A.R.render(A.scene, cam, 0.016, A.world); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
    return { ms: (performance.now() - t0) / n, calls: A.renderer.info.render.calls, tris: A.renderer.info.render.triangles };
  }, { v, n });
}
async function poseAndFreeze(page, v) {
  await page.evaluate((v) => {
    const A = __church, D = Math.PI / 180;
    A.world.setHour(v.hour);
    A.me.x = v.x; A.me.z = v.z; A.me.y = A.logic.floorY(v.x, v.z); A.ctl.yaw = v.yaw * D; A.me.yaw = A.ctl.yaw; A.ctl.pitch = v.pitch * D; A.ctl.look = (v.look || 0) * D; A.camInit = false;
    A.maxFrames = A.frameCount + 4;
  }, v);
  await page.waitForFunction(() => __church.done, null, { timeout: 240000, polling: 100 });
}
export async function fpsTest(browser, churches, n = 12) {
  const rows = [];
  for (const id of churches) for (const quality of ['high', 'low']) {
    const v = VIEWS[id][0];
    // 번갈아 두 번씩 재서 작은 쪽을 쓴다(헤드리스 CPU 잡음 완화)
    const ms = { off: [], on: [] }; let calls = {};
    for (let rep = 0; rep < 2; rep++) for (const photo of [false, true]) {
      const { page } = await open(browser, id, { quality, photo, size: '412x732' });
      await poseAndFreeze(page, v);
      const r = await frameMs(page, v, n);
      ms[photo ? 'on' : 'off'].push(r.ms); calls[photo ? 'on' : 'off'] = r.calls;
      await page.close();
    }
    const off = Math.min(...ms.off), on = Math.min(...ms.on);
    rows.push({ church: id, quality, view: v.tag, msOff: +off.toFixed(1), msOn: +on.toFixed(1), fpsOff: +(1000 / off).toFixed(2), fpsOn: +(1000 / on).toFixed(2), loss: +((on - off) / off).toFixed(3), callsOff: calls.off, callsOn: calls.on, pass: (on - off) / off <= LIMITS.fpsLoss });
  }
  return rows;
}

export async function flickerTest(browser, churches, out) {
  const rows = [];
  for (const id of churches) {
    const { res, errors } = await flickerMeasure(browser, id, { views: VIEWS[id].map((v) => ({ ...v })), size: '412x732', out, frames: 10 });
    // flicker.mjs 는 look 을 0 으로 두므로(일반 시점) 창이 화면에 들어오게 pitch 로만 올려다본다 → 아래 jit 참고값도 같은 시점
    res.forEach((r) => rows.push({ church: id, view: r.view, worst: r.worst.mean, mean: r.mean, over24: r.over24, pass: r.pass }));
    if (errors.length) rows.push({ church: id, errors });
  }
  return rows;
}

export async function fallbackTest(browser, churches) {
  const rows = [];
  for (const id of churches) {
    const { page, errors } = await open(browser, id, { block: true, size: '412x732' });
    const d = await page.evaluate(() => ({ d: __church.place.debug(), ev: (window.__churchEvents || []).filter((e) => /^view|^glass/.test(e.e)).length, frames: __church.frameCount, meshes: __church.world.group.children.filter((m) => m.userData && m.userData.glassPlace).length }));
    rows.push({ church: id, states: d.d.groups.map((g) => g.state).join(','), resident: d.d.stats.resident, errorsCounted: d.d.stats.errors, photoMeshes: d.meshes, pageErrors: errors.length, events: d.ev,
      pass: d.d.groups.every((g) => g.state === 'error') && d.d.stats.resident === 0 && d.meshes === 0 && errors.length === 0 });
    await page.close();
  }
  return rows;
}

export async function memTest(browser) {
  const { page, errors } = await open(browser, 'florence', { size: '412x732' });
  const rows = [];
  const snap = async (id) => {
    await page.waitForFunction((id) => __church.world && __church.world.id === id && __church.place.debug().groups.every((g) => g.state === 'ready' || g.state === 'error'), id, { timeout: 240000, polling: 250 });
    const d = await page.evaluate(() => __church.place.debug());
    const want = GP.winsOf(id).length;
    rows.push({ church: id, resident: d.stats.resident, want, texMb: d.stats.texMb, created: d.stats.created, disposed: d.stats.disposed, loadMs: d.groups.map((g) => g.ms).join('/'), pass: d.stats.resident === want });
  };
  await snap('florence');
  for (const id of ['stpaul', 'basic', 'stpeter', 'milan', 'lateran', 'florence']) {
    await page.evaluate((id) => ChurchAPI.setChurch({ church: id }), id);
    await snap(id);
  }
  if (errors.length) rows.push({ errors });
  await page.close();
  return rows;
}

export async function eventsTest(browser) {
  const rows = [];
  const { page, errors } = await open(browser, 'stpeter', { size: '412x732' });
  const ev = () => page.evaluate(() => (window.__churchEvents || []).filter((e) => /^glass/.test(e.e)));
  // 후진 앞에서 창을 올려다본다 → glassNear{dove_stpeter}
  await page.evaluate(() => { const A = __church; A.me.x = 0; A.me.z = -26; A.ctl.yaw = 0; A.me.yaw = 0; A.ctl.look = 30 * Math.PI / 180; A.camInit = false; });
  await page.waitForFunction(() => (window.__churchEvents || []).some((e) => e.e === 'glassNear' && e.id === 'dove_stpeter'), null, { timeout: 120000, polling: 250 }).catch(() => {});
  let e = await ev();
  rows.push({ step: 'near', got: JSON.stringify(e[e.length - 1] || null), pass: !!e.length && e[e.length - 1].e === 'glassNear' && e[e.length - 1].id === 'dove_stpeter' && e[e.length - 1].slot === 'gloria' });
  // 창을 누른다(창 중심의 화면 좌표) → glassTap
  await page.evaluate(() => { const A = __church, s = A.place.slots()[0], v = new THREE.Vector3(s.x, s.y, s.z).project(A.camera); ChurchAPI.tapAt({ x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }); });
  e = await ev();
  rows.push({ step: 'tap', got: JSON.stringify(e[e.length - 1] || null), pass: !!e.length && e[e.length - 1].e === 'glassTap' && e[e.length - 1].id === 'dove_stpeter' });
  // 빈 벽을 누르면 아무 일도 없다
  const n0 = e.length;
  await page.evaluate(() => ChurchAPI.tapAt({ x: 6, y: innerHeight - 6 }));
  e = await ev();
  rows.push({ step: 'tap-miss', got: e.length - n0, pass: e.length === n0 });
  // 돌아서서 입구 쪽으로 간다 → glassNear{id:null}
  await page.evaluate(() => { const A = __church; A.me.z = 10; A.ctl.yaw = Math.PI; A.me.yaw = Math.PI; A.ctl.look = 0; A.camInit = false; });
  await page.waitForFunction(() => { const l = (window.__churchEvents || []).filter((e) => e.e === 'glassNear'); return l.length && l[l.length - 1].id === null; }, null, { timeout: 120000, polling: 250 }).catch(() => {});
  e = (await ev()).filter((x) => x.e === 'glassNear');
  rows.push({ step: 'leave', got: JSON.stringify(e[e.length - 1] || null), pass: !!e.length && e[e.length - 1].id === null });
  // 'church' 감상 모드는 걸린 자리로 간다
  await page.evaluate(() => { const A = __church; A.me.z = -20; A.ctl.yaw = 0; A.me.yaw = 0; ChurchAPI.viewWindow({ win: 'dove_stpeter', mode: 'church' }); });
  await page.waitForFunction(() => (window.__churchEvents || []).some((e) => e.e === 'viewReady' || e.e === 'viewError'), null, { timeout: 120000, polling: 250 }).catch(() => {});
  const vd = await page.evaluate(() => { const d = __church.view.debug(), s = __church.place.slots()[0]; return { mode: d.mode, dx: Math.abs(d.slot.x - s.x), dy: Math.abs(d.slot.y - s.y), dz: Math.abs(d.slot.z - s.z), w: d.size.w / s.w, h: d.size.h / s.h, ev: window.__churchEvents.filter((e) => /^view/.test(e.e)).map((e) => e.e).join(',') }; });
  rows.push({ step: 'view-church', got: JSON.stringify(vd), pass: vd.mode === 'church' && vd.dx < 0.01 && vd.dy < 0.01 && vd.dz < 0.01 && Math.abs(vd.w - 1) < 1e-3 && Math.abs(vd.h - 1) < 1e-3 && /viewReady/.test(vd.ev) });
  await page.evaluate(() => ChurchAPI.endView({}));
  const after = await page.evaluate(() => ({ active: __church.view.active, resident: __church.place.debug().stats.resident, profile: __church.R.profile }));
  rows.push({ step: 'end-view', got: JSON.stringify(after), pass: !after.active && after.resident === 1 && after.profile === 'walk' });
  if (errors.length) rows.push({ errors });
  await page.close();
  return rows;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2); let only = null, churches = CHURCHES, out = null; const extra = {};
  for (let i = 0; i < a.length; i++) { if (a[i] === '--only') only = a[++i].split(','); else if (a[i] === '--church') churches = a[++i].split(','); else if (a[i] === '--out') out = a[++i]; else if (a[i] === '--extra') { const [k, v] = a[++i].split('='); extra[k] = v; } }
  const want = (k) => !only || only.includes(k);
  const browser = await chromium.launch({ args: ARGS });
  let ok = true;
  const show = (name, rows) => { console.log('== ' + name); rows.forEach((r) => { if (r.pass === false || r.errors) ok = false; console.log((r.pass === false || r.errors ? 'FAIL ' : 'ok   ') + JSON.stringify(r)); }); };
  if (want('color')) {
    const rows = await colorTest(browser, churches, out, extra); show('color (walk profile, front view) limit median ' + LIMITS.median, rows);
    for (const q of ['high', 'low']) { const m = rows.filter((r) => r.quality === q && r.median !== undefined).map((r) => r.median).sort((x, y) => x - y); if (m.length) console.log(`   ${q}: median of medians ${m[Math.floor(m.length / 2)]}, worst ${m[m.length - 1]}`); }
  }
  if (want('fps')) show('fps (photoglass off vs on) limit loss ' + LIMITS.fpsLoss, await fpsTest(browser, churches));
  if (want('flicker')) show('flicker limit ' + LIMITS.flicker, await flickerTest(browser, churches, out));
  if (want('fallback')) show('fallback (gpack blocked)', await fallbackTest(browser, churches));
  if (want('mem')) show('memory', await memTest(browser));
  if (want('events')) show('events', await eventsTest(browser));
  await browser.close();
  console.log(ok ? 'ALL OK' : 'FAILED');
  process.exit(ok ? 0 : 1);
}
