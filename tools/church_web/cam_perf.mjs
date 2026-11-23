// 카메라 잘라내기의 그리기 비용(docs/church/CAMERA_MODES.md §숫자): 보통(mid) 화질에서 그 자리에 서서 화면을 돌리는 n 프레임의
// 평균 프레임 시간(헤드리스 소프트웨어 GL — 실기기와 다르다, 예전/지금의 상대 차이만)·그리기 호출·삼각형.
// 사용: node tools/church_web/cam_perf.mjs [--root 고치기 전 자산 폴더] [--quality mid] [--frames 40] [case ...]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const root = path.resolve(opt('root', path.resolve(here, '../../assets/church')));
const quality = opt('quality', 'mid'), frames = +opt('frames', 40);
const named = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const CASES = {
  crypt: { church: 'assisi', x: 2.2, z: -3.75, y: 0 },
  yeouido_loft: { church: 'yeouido', x: 0, z: 16.5, y: 0 },
  nave: { church: 'assisi', x: 0, z: 16, y: 10.2 },
  milan_amb: { church: 'milan', x: 0, z: -32.5, y: 0 }
};
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
for (const name of named.length ? named : Object.keys(CASES)) {
  const C = CASES[name];
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const q = new URLSearchParams({ church: C.church, autotier: '0', msaa: '0', hideui: '1', solo: '1', markers: '0', hour: '11', frames: '20', x: String(C.x), z: String(C.z), y: String(C.y), yaw: '0', pitch: '26', quality });
  await page.goto('file://' + root + '/test.html?' + q.toString());
  await page.waitForFunction(() => window.__church && window.__church.done, null, { timeout: 900000, polling: 500 });
  const r = await page.evaluate(async (n) => {
    const A = window.__church, ri = A.renderer.info, ms = []; let calls = 0, tris = 0;
    for (let i = 0; i < n; i++) {
      A.ctl.dragging = true; A.ctl.yaw += 2 * Math.PI / n; A.ctl.lastDragT = A.t;
      A.maxFrames = A.frameCount + 1; A.done = false; A.rafOn = false; A.paused = true;
      const t0 = performance.now();
      window.ChurchAPI.resume(); A.last = performance.now() - 33;
      while (!A.done) await new Promise((res) => setTimeout(res, 5));
      ms.push(performance.now() - t0); calls += ri.render.calls; tris += ri.render.triangles;
    }
    ms.sort((a, b) => a - b);
    return { med: ms[ms.length >> 1], mean: ms.reduce((a, b) => a + b, 0) / n, calls: calls / n, tris: tris / n };
  }, frames);
  console.log(name, quality, 'median', r.med.toFixed(1) + 'ms', 'mean', r.mean.toFixed(1) + 'ms', 'calls', r.calls.toFixed(0), 'tris', r.tris.toFixed(0));
  await page.close();
}
await browser.close();
