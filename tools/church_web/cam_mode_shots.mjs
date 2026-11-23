// 카메라 확인 샷(docs/church/CAMERA_MODES.md): 그 자리에 서서 화면을 끌어 360° 돌리는 동안의 프레임 띠(아시시 묘소·계단 · 여의도동 계단·성가대석 아래 · 명동 측랑 · 트인 신랑).
// 사용: node tools/church_web/cam_mode_shots.mjs [--root assets폴더] [--out 폴더] [--tag after] [--cam fp|tp] [--quality low|mid] [--pitch 도] [case ...]
//   --root 로 고치기 전 사본(예: git show 로 꺼낸 main.js·cam_guard.js)을 주면 같은 자리를 예전 카메라로 찍는다.
// 결과: OUT/<tag>_<case>_NN.jpg(띠 칸마다) + 줄마다 카메라 → 아바타 거리(프레임별)·1인칭 여부. 헤드리스 swiftshader 라 느리다(칸당 수 초).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const root = path.resolve(opt('root', path.resolve(here, '../../assets/church')));
const outDir = path.resolve(opt('out', '/tmp/cam_mode_shots'));
const tag = opt('tag', 'after'), camMode = opt('cam', '');
const named = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
fs.mkdirSync(outDir, { recursive: true });
const CASES = {
  crypt: { church: 'assisi', x: 2.2, z: -3.75, y: 0, yaw: 0 },                       // 아시시 묘소(둥근 방, 천장 3.2m — 하부 성당 바닥 밑)
  assisi_stair: { church: 'assisi', x: 1.8, z: 7.0, y: 2.0, yaw: 0 },                // 아시시 묘소로 내려가는 우물 계단(하부 성당 신랑 가운데)
  assisi_upstair: { church: 'assisi', x: 4.9, z: -13.0, y: 7.0, yaw: 180 },          // 아시시 하부 → 상부 계단(36단)
  yeouido_stair: { church: 'yeouido', x: 13.99, z: 27.31, y: 1.6, yaw: 200 },        // 여의도동 곡선 계단(겹친 두 계단)
  yeouido_loft: { church: 'yeouido', x: 0, z: 16.5, y: 0, yaw: 0 },                  // 여의도동 성가대석 아래
  aisle: { church: 'myeongdong', x: 7.6, z: -20.4, y: 0, yaw: 0 },                   // 명동 성단 옆 좁은 측랑
  nave: { church: 'assisi', x: 0, z: 16, y: 10.2, yaw: 0 }                          // 트인 신랑(아시시 상부)
};
// 기본: 칸 12개, 칸마다 3프레임, 프레임마다 10°(띠 전체 360°)
const SHOTS = +opt('shots', 12), PER = +opt('per', 3), STEP = +opt('step', Math.PI / 18);
const list = named.length ? named : Object.keys(CASES);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
let failed = 0;
for (const name of list) {
  const C = CASES[name], t0 = Date.now();
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const q = new URLSearchParams({ church: C.church, autotier: '0', msaa: '0', hideui: '1', solo: '1', markers: '0', hour: '11', frames: '45', x: String(C.x), z: String(C.z), y: String(C.y), yaw: String(C.yaw), quality: opt('quality', 'low') });
  if (opt('pitch')) q.set('pitch', opt('pitch'));   // 예전 기본 구도는 --pitch 26(도), 지금은 FEEL.pitchDefault
  if (camMode) q.set('cam', camMode);
  await page.goto('file://' + root + '/test.html?' + q.toString());
  await page.waitForFunction(() => window.__church && window.__church.done, null, { timeout: 900000, polling: 500 });
  const dists = [];
  for (let k = 0; k < SHOTS; k++) {
    const d = await page.evaluate(async ([per, step]) => {
      const A = window.__church, out = [];
      for (let i = 0; i < per; i++) {
        A.ctl.dragging = true; A.ctl.yaw += step; A.ctl.lastDragT = A.t;
        // 한 프레임만 더 돌린다(frames 제한을 하나 늘리고 resume → kick). 프레임 시간은 0.05초(main.js dt 상한)로 맞춘다
        A.maxFrames = A.frameCount + 1; A.done = false; A.rafOn = false; A.paused = true;
        window.ChurchAPI.resume();
        A.last = performance.now() - 60;
        const t1 = performance.now();
        while (!A.done && performance.now() - t1 < 20000) await new Promise((r) => setTimeout(r, 20));
        const p = A.camPos, me = A.me;
        out.push([+Math.hypot(p.x - me.x, p.y - (me.y + 1.0), p.z - me.z).toFixed(2), A.meAv && A.meAv.root.visible ? 0 : 1]);
      }
      return out;
    }, [PER, STEP]);
    dists.push(...d);
    await page.screenshot({ path: path.join(outDir, `${tag}_${name}_${String(k).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 80 });
  }
  console.log(tag, name, ((Date.now() - t0) / 1000).toFixed(0) + 's', 'dist', dists.map((x) => x[0]).join(' '), 'fp', dists.filter((x) => x[1]).length + '/' + dists.length, errors.length ? 'ERRORS ' + errors.slice(0, 3).join(' | ') : 'ok');
  if (errors.length) failed++;
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
