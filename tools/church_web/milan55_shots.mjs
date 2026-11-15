// 밀라노 개발용 임시 유리(E-4) 화면 캡처 + 그리기 비용 측정 — `node --test` 에는 넣지 않는다(헤드리스 swiftshader 로 수 분).
// 사용: node tools/church_web/milan55_shots.mjs [--out art/glass_milan55/shots] [--views aisleS,aisleN,...] [--off] [--size 960x540]
//                                               [--quality mid] [--hour 11] [--prefix e4_] [--perf] [--leak N]
//   --off    devglass 를 끄고 찍는다(기존 절차적 유리; 회귀 비교용, 파일 이름에 _off)
//   --perf   시점마다 draw call·삼각형 수를 잰다(renderer.info) → JSON 한 줄
//   --leak N 밀라노 ↔ QA Gallery ↔ 기본 성당을 N 번 오가며 dev 질감·재질 해제를 확인한다(created == disposed, 상주 0)
// 시점: 아바타 자세(x, z, yaw, pitch, look, zoom) — 카메라는 아바타 뒤. yaw 0 = 제대(-z), -90 = 남(+x), 90 = 북(-x), 180 = 입구(+z).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.CHURCH_ROOT || path.resolve(here, '../../assets/church');

// 자유 카메라 시점: cam = 카메라 위치, at = 보는 점, fov(세로 시야각). 아바타는 숨긴다.
export const VIEWS = {
  aisleS: { church: 'milan', cam: [9.7, 1.8, 28.13], at: [13.95, 6.9, 28.13], fov: 66, note: '남측랑 1~3칸(가운데 DEV-002, 오른쪽 DEV-001 = 입구 쪽 첫 창, 왼쪽 DEV-003)' },
  aisleN: { church: 'milan', cam: [-9.7, 1.8, 14.6], at: [-13.95, 6.9, 14.6], fov: 66, note: '북측랑 4~6칸(가운데 DEV-035, 왼쪽 DEV-036, 오른쪽 DEV-034)' },
  transeptS: { church: 'milan', cam: [8.6, 2.0, -10.22], at: [22.5, 9.2, -10.22], fov: 76, note: '남익랑 끝 벽: 아래 성 요한 보노 경당 아치, 위 큰 창(DEV-040), 양옆 칸 DEV-010·014' },
  transeptN: { church: 'milan', cam: [-8.6, 2.0, -13.0], at: [-22.5, 9.2, -10.22], fov: 76, note: '북익랑 끝 벽: 아래 나무의 성모 경당, 위 큰 창(절차적 유리), 양옆 칸 DEV-026·030' },
  chapelS: { church: 'milan', cam: [17.4, 1.8, -10.22], at: [23.7, 6.2, -10.22], fov: 74, note: '성 요한 보노 경당 안: 서쪽 사선 DEV-011 · 끝 DEV-012 · 동쪽 사선 DEV-013' },
  apse: { church: 'milan', cam: [0, 1.9, -30.5], at: [0, 6.4, -35.4], fov: 88, note: '후진 세 창(DEV-021·020·019; 가운데 아래는 진본 사진 그대로)' },
  counterfacade: { church: 'milan', cam: [0, 2.0, 24.0], at: [0, 7.6, 34.9], fov: 74, note: '정문 안쪽 벽: 문 5 · 하단 반원 머리 창 5(DEV-044·042·045·043·041) · 상단 첨두창 3(DEV-048·047·046)' },
  qa: { church: 'qa_milan55', x: 1.6, z: null, dz: -6.5, yaw: -64, pitch: 5, look: 10, zoom: 0.8, note: 'QA Gallery(55장 전부, 이름표·상태 색)' }
};

export async function openPage(browser, { church, devglass = true, size = '960x540', quality = 'mid', hour = 11, extra = {} }) {
  const [W, H] = size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/dev\/devglass_boot|ERR_FILE_NOT_FOUND/.test(m.text())) errors.push('console.error: ' + m.text()); });
  await page.addInitScript(() => {
    const q = []; let tNow = 0;
    window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
    window.__step = (n, dtMs) => { for (let i = 0; i < n; i++) { const cbs = q.splice(0); tNow = (tNow || performance.now()) + dtMs; cbs.forEach((cb) => cb(tNow)); } };
  });
  const q = new URLSearchParams({ church, autotier: '0', msaa: '0', quality, solo: '0', hideui: '1', hour: String(hour), markers: '0', ...(devglass ? { devglass: '1' } : {}), ...extra });
  await page.goto('file://' + root + '/test.html?' + q.toString());
  await page.waitForFunction(() => window.__church && window.__church.world && window.__church.R, null, { timeout: 180000, polling: 250 });
  await page.waitForTimeout(800);
  await settle(page, devglass);
  return { page, errors, W, H };
}
// 사진 창·dev 유리·십자가의 길이 다 실릴 때까지 기다리고 페이드를 끝낸다
export async function settle(page, devglass) {
  await page.waitForFunction(() => !window.__church.place || window.__church.place.debug().pending === 0, null, { timeout: 120000, polling: 200 });
  if (devglass) {
    await page.waitForFunction(() => {
      const D = window.ChurchDevGlass; if (!D) return false;
      const c = D.current(); return !c || c.state === 'fading' || c.state === 'ready' || c.state === 'error';
    }, null, { timeout: 120000, polling: 200 });
  }
  await page.evaluate(() => __step(30, 33));
}
export async function pose(page, v) {
  if (v.cam) {
    // 자유 카메라: 고리를 돌리지 않고(걷기 카메라·성당별 카메라 보정이 덮어쓰지 않게) 직접 놓고 그린다
    await page.evaluate((v) => {
      const A = __church, c = A.camera;
      A.meAv.root.visible = false;
      c.fov = v.fov || 62; c.updateProjectionMatrix();
      c.position.set(v.cam[0], v.cam[1], v.cam[2]); c.lookAt(v.at[0], v.at[1], v.at[2]); c.updateMatrixWorld();
      for (let i = 0; i < 3; i++) A.R.render(A.scene, c, 0.016, A.world);
    }, v);
    return;
  }
  await page.evaluate((v) => {
    const A = __church, D = Math.PI / 180, sp = A.world.layout.spawn;
    const z = v.z === null || v.z === undefined ? sp.z + (v.dz || 0) : v.z;
    A.me.x = v.x; A.me.z = z; A.me.y = A.logic.floorY(v.x, z); A.me.vx = A.me.vz = 0;
    A.ctl.yaw = v.yaw * D; A.me.yaw = A.ctl.yaw; A.ctl.pitch = v.pitch * D; A.ctl.look = (v.look || 0) * D; A.ctl.zoom = v.zoom || 1; A.camInit = false;
    if (v.hideMe !== false) A.meAv.root.visible = false;
  }, v);
  await page.evaluate(() => __step(8, 33));
}
export async function perfOf(page) {
  return page.evaluate(() => {
    const A = __church, i = A.renderer.info;
    A.R.render(A.scene, A.camera, 0.016, A.world);
    return { calls: i.render.calls, tris: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, stats: A.world.stats };
  });
}

async function leak(browser, n, o) {
  const { page, errors } = await openPage(browser, { ...o, church: 'milan' });
  const base = await page.evaluate(() => ({ mem: { ...__church.renderer.info.memory } }));
  const seq = [];
  for (let i = 0; i < n; i++) {
    for (const id of ['qa_milan55', 'basic', 'milan']) {
      await page.evaluate((id) => window.ChurchAPI.setChurch({ church: id }), id);
      await page.evaluate(() => __step(4, 33));
      await settle(page, true);
      seq.push(await page.evaluate(() => { const d = ChurchDevGlass.debug(); return { church: __church.church, state: d.state, placed: d.summary ? d.summary.placed : 0, stats: d.stats, mem: { ...__church.renderer.info.memory } }; }));
    }
  }
  await page.evaluate(() => window.ChurchAPI.setChurch({ church: 'basic' }));
  await page.evaluate(() => __step(6, 33));
  const end = await page.evaluate(() => ({ stats: ChurchDevGlass.debug().stats, state: ChurchDevGlass.debug().state, mem: { ...__church.renderer.info.memory } }));
  await page.close();
  return { base, seq, end, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const out = path.resolve(opt('--out', path.resolve(here, '../../art/glass_milan55/shots')));
  const names = opt('--views', Object.keys(VIEWS).join(',')).split(',').filter((v) => VIEWS[v]);
  const off = a.includes('--off'), size = opt('--size', '960x540'), quality = opt('--quality', 'mid'), hour = +opt('--hour', 11), prefix = opt('--prefix', 'e4_');
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  let bad = 0;
  if (a.includes('--leak')) {
    const r = await leak(browser, +opt('--leak', 3), { size: '480x270', quality, hour });
    const ok = r.end.stats.created === r.end.stats.disposed && r.end.stats.meshes === 0 && r.end.state === 'off' && !r.errors.length;
    console.log(JSON.stringify({ leak: ok ? 'ok' : 'LEAK', end: r.end, base: r.base, last: r.seq.slice(-3), errors: r.errors }));
    if (!ok) bad++;
  } else {
    fs.mkdirSync(out, { recursive: true });
    const by = {};
    names.forEach((n) => { (by[VIEWS[n].church] = by[VIEWS[n].church] || []).push(n); });
    for (const church of Object.keys(by)) {      // 성당마다 한 페이지를 열고 시점만 바꾼다(순차)
      const { page, errors } = await openPage(browser, { church, devglass: !off, size, quality, hour });
      for (const n of by[church]) {
        await pose(page, VIEWS[n]);
        const file = path.join(out, `${prefix}${n}${off ? '_off' : ''}.jpg`);
        await page.screenshot({ path: file, type: 'jpeg', quality: 62 });
        const line = { view: n, file: path.relative(process.cwd(), file), kb: Math.round(fs.statSync(file).size / 1024) };
        if (a.includes('--perf')) Object.assign(line, await perfOf(page));
        console.log(JSON.stringify(line));
      }
      const dbg = off ? null : await page.evaluate(() => { const d = window.ChurchDevGlass ? ChurchDevGlass.debug() : null; return d && { state: d.state, summary: d.summary, meshes: d.meshes, atlas: d.atlas, ms: d.ms, skipped: d.rows.filter((r) => r.status === 'skipped').map((r) => r.dev_id + ':' + r.why) }; });
      if (dbg) console.log(JSON.stringify({ church, devglass: dbg }));
      if (errors.length) { bad++; console.log('ERRORS ' + church + ':\n' + errors.join('\n')); }
      await page.close();
    }
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
}
