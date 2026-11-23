// 시점 모드 확인 샷(docs/church/CAMERA_MODES.md): 그 자리에 서서 화면을 끌어 돌리는 동안의 프레임 띠(아시시 묘소 · 여의도동 계단 · 트인 신랑).
// 사용: node tools/church_web/cam_mode_shots.mjs [--root assets폴더] [--out 폴더] [--tag after] [--cam auto|fp|tp] [case ...]
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
  crypt: { church: 'assisi', x: 2.2, z: -3.75, y: 0, yaw: 0 },
  yeouido_stair: { church: 'yeouido', x: 13.99, z: 27.31, y: 1.6, yaw: 200 },
  nave: { church: 'assisi', x: 0, z: 16, y: 10.2, yaw: 0 }
};
const SHOTS = +opt('shots', 8), PER = +opt('per', 4), STEP = +opt('step', 0.1);   // 칸 8개, 칸마다 4프레임, 프레임마다 0.1rad(띠 전체 약 180°)
const list = named.length ? named : Object.keys(CASES);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
let failed = 0;
for (const name of list) {
  const C = CASES[name], t0 = Date.now();
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const q = new URLSearchParams({ church: C.church, autotier: '0', msaa: '0', hideui: '1', solo: '1', markers: '0', hour: '11', frames: '45', x: String(C.x), z: String(C.z), y: String(C.y), yaw: String(C.yaw), pitch: '26', quality: 'low' });
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
