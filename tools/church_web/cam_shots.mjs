// 3인칭 카메라 확인 샷(docs/church/CAMERA.md): 입장 시점, 벽·기둥 너머(잘라내기), 좁은 통로, 기도 자리(앞옆 45°) 등.
// 사용: node tools/church_web/cam_shots.mjs [--out DIR] [--size 412x892] [--frames 50] [case ...]
//   case 이름을 주지 않으면 모두. 'spawn' 을 주면 모든 성당의 입장 시점만.
// 헤드리스 swiftshader 라 느리다(성당당 수십 초). 결과: DIR/cam_<case>.png
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
const outDir = opt('out', '/tmp/cam_shots');
const [W, H] = opt('size', '412x892').split('x').map(Number);
const frames = +opt('frames', 50);
const named = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
fs.mkdirSync(outDir, { recursive: true });

const CHURCHES = ['basic', 'danggogae', 'florence', 'lateran', 'maggiore', 'milan', 'myeongdong', 'stpaul', 'stpeter'];
// yaw = 카메라 방위(도, 카메라는 아바타의 +sin/+cos 쪽), pitch(도). js = 세계가 뜬 뒤 실행할 것(ChurchAPI).
const CASES = {
  // 벽 너머: 명동 측랑의 아바타를 신랑 쪽에서(사이 아케이드·기둥을 잘라낸다)
  wall_myeongdong: { church: 'myeongdong', x: 7.6, z: 9.9, yaw: -90, pitch: 26 },
  // 성 베드로 큰 피어 옆(예전엔 카메라가 피어 앞에 붙어 화면이 대리석으로 가득)
  pier_stpeter: { church: 'stpeter', x: 7.5, z: 6, yaw: 90, pitch: 26 },
  // 피렌체 신랑 기둥 뒤
  column_florence: { church: 'florence', x: 2.4, z: 15.85, yaw: 90, pitch: 26 },
  // 좁은 통로: 명동 오른쪽 성단 옆 좁은 측랑(세례대 앞), 뒤가 끝벽
  narrow_myeongdong: { church: 'myeongdong', x: 7.6, z: -20.4, yaw: 180, pitch: 26 },
  // 벽에 등을 대고: 명동 측랑 벽 앞(뒤 0.6m 가 벽)
  wallback_myeongdong: { church: 'myeongdong', x: 8.3, z: 14, yaw: 90, pitch: 26 },
  // 당고개 입구 홀 성모상 옆 좁은 곳
  narrow_danggogae: { church: 'danggogae', x: 5.6, z: 13.6, yaw: 60, pitch: 26 },
  // 신자석에서 무릎 꿇고 기도(묵주 패널 40%)
  kneel_myeongdong: { church: 'myeongdong', sit: 'R03-1', kneel: true, inset: 0.4 },
  kneel_stpeter: { church: 'stpeter', sit: 'first', kneel: true, inset: 0.4 },
  sit_florence: { church: 'florence', sit: 'first', kneel: false, inset: 0.4 }
};
for (const id of CHURCHES) CASES['spawn_' + id] = { church: id };

let list = Object.keys(CASES);
if (named.length === 1 && named[0] === 'spawn') list = list.filter((k) => k.startsWith('spawn_'));
else if (named.length) list = list.filter((k) => named.includes(k));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
let failed = 0;
for (const name of list) {
  const C = CASES[name], t0 = Date.now();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const q = new URLSearchParams({ church: C.church, autotier: '0', msaa: '0', hideui: '1', solo: '1', hour: '11', markers: '0', frames: String(C.sit ? frames + 100 : frames) });
  if (C.x !== undefined) { q.set('x', C.x); q.set('z', C.z); }
  if (C.yaw !== undefined) q.set('yaw', C.yaw);
  if (C.pitch !== undefined) q.set('pitch', C.pitch);
  await page.goto('file://' + assets + '/test.html?' + q.toString());
  await page.waitForFunction(() => window.__church && window.__church.world, null, { timeout: 120000 });
  if (C.sit) {
    await page.evaluate((c) => {
      const A = window.ChurchAPI, app = window.__church, L = app.logic;
      let seat = c.sit === 'first' ? null : c.sit;
      if (!seat || !L.seatInfo(seat)) {   // 신랑 가운데쯤의 좌석
        const ids = L.seatIds; seat = ids[Math.floor(ids.length * 0.3)];
      }
      const si = L.seatInfo(seat), st = L.standPos(seat);
      app.me.x = st.x; app.me.z = st.z;
      if (c.inset) A.setViewInset({ bottom: c.inset });
      A.sit({ seat });
      if (c.kneel) setTimeout(() => A.setPrayerPosture({ posture: 'kneel' }), 50);
      window.__seat = { seat, yaw: si.yaw };
    }, C);
  }
  await page.waitForFunction(() => window.__church && window.__church.done, null, { timeout: 900000, polling: 500 });
  const file = path.join(outDir, `cam_${name}.png`);
  await page.screenshot({ path: file });
  const info = await page.evaluate(() => {
    const a = window.__church, p = a.camPos, me = a.me;
    return { cam: [p.x, p.y, p.z].map((v) => +v.toFixed(2)), me: [me.x, me.z].map((v) => +v.toFixed(2)), mode: me.mode, dist: +Math.hypot(p.x - me.x, p.z - me.z).toFixed(2), cut: a.cut && a.cut.k ? Array.from(a.cut.k).map((v) => +v.toFixed(2)) : null, seat: window.__seat || null };
  });
  console.log(name, ((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(info), errors.length ? 'ERRORS: ' + errors.slice(0, 3).join(' | ') : 'ok', '->', file);
  if (errors.length) failed++;
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
