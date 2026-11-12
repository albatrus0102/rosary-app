// 깜빡임(z-fighting·시간 노이즈) 회귀 검사 — `node --test` 에는 넣지 않는다(헤드리스 swiftshader 로 수 분 걸림).
// 사용: node tools/church_web/flicker.mjs [church ...] [--frames 10] [--size 640x360] [--out dir] [--quality high] [--mode tie|jit]
//       --mode jit: 참고 측정(카메라 ±1cm 흔들기, 실제 손떨림에 가까움). 판정은 tie(기본)만.
//       기본 church = lateran stpeter(대조군). 실패하면 종료 코드 1.
//
// 방법: 카메라·아바타 고정, rAF 를 가로채 16.67ms 씩 프레임을 직접 넘긴다. 매 프레임 불투명 재질의 depthFunc 를
// Less ↔ LessEqual 로 번갈아 바꾼다. 카메라가 고정이므로 두 프레임이 달라지는 곳은 (1) 깊이 버퍼에서 '같은 깊이'로
// 뭉개진 면(=조금만 움직여도 z-fighting 으로 깜빡이는 곳) 또는 (2) 시간에 따라 바뀌는 셰이더·조명 노이즈뿐이다.
// 연속 프레임 RGB 평균 절대차를 32×32 블록마다 평균 내어, 어느 블록이든 THRESH 를 넘으면 실패.
//
// THRESH = 2.0 (0..255 단위, 블록 평균). 근거(800x450 high): 고친 뒤 라테라노·성 베드로 최악 블록 ≤ 0.7,
// 고치기 전(SSAO 의 16비트 깊이 버퍼) 라테라노 수랑 벽 프레스코 5~6, 성 베드로 신랑 8 이상.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.CHURCH_ROOT || path.resolve(here, '../../assets/church');   // CHURCH_ROOT: 비교용 사본 경로

export const THRESH = 2.0;
// 성당별 시점(최대 2개): x,z,yaw(도),pitch(도),hour
export const VIEWS = {
  lateran: [{ tag: 'nave', x: 0, z: 2, yaw: 0, pitch: 4, hour: 11 }, { tag: 'aisle', x: 7.8, z: 10, yaw: 35, pitch: 6, hour: 16 }],
  stpeter: [{ tag: 'nave', x: 0, z: 20, yaw: 0, pitch: 4, hour: 11 }, { tag: 'side', x: 8, z: 10, yaw: 60, pitch: 6, hour: 16 }],
};
const DEFAULT_VIEW = [{ tag: 'nave', x: undefined, z: undefined, yaw: undefined, pitch: 4, hour: 11 }];

export async function measure(browser, id, { frames = 10, size = '640x360', quality = 'high', out = null, views = null, mode = 'tie' } = {}) {
  const [W, H] = size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const q = []; let tNow = 0;
    window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
    window.__step = (n, dtMs) => { for (let i = 0; i < n; i++) { const cbs = q.splice(0); tNow = (tNow || performance.now()) + dtMs; cbs.forEach((cb) => cb(tNow)); } };
  });
  await page.goto('file://' + root + '/test.html?' + new URLSearchParams({ church: id, autotier: '0', msaa: '0', quality, solo: '1' }));
  await page.waitForFunction(() => window.__church && window.__church.world && window.__church.R, null, { timeout: 180000, polling: 500 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { document.body.classList.add('hideui'); if (__church.meAv) __church.meAv.root.visible = false; });
  const res = [];
  for (const v of (views || VIEWS[id] || DEFAULT_VIEW)) {
    await page.evaluate((v) => {
      const A = __church, D = Math.PI / 180;
      A.world.setHour(v.hour);
      if (v.x !== undefined) { A.me.x = v.x; A.me.z = v.z; A.me.y = A.logic.floorY(v.x, v.z); }
      if (v.yaw !== undefined) { A.ctl.yaw = v.yaw * D; A.me.yaw = A.ctl.yaw; }
      A.ctl.pitch = v.pitch * D; A.ctl.look = 0; A.camInit = false;
    }, v);
    for (let i = 0; i < 3; i++) await page.evaluate(() => __step(4, 16.67));   // 카메라 안착·그림자 갱신
    const r = await page.evaluate(({ N, mode }) => {
      const A = __church, c = document.getElementById('c'), W = c.width, H = c.height;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d', { willReadFrequently: true });
      const mats = []; A.scene.traverse((o) => { const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []); ms.forEach((m) => { if (!m.transparent && m.depthTest !== false && mats.indexOf(m) < 0) mats.push(m); }); });
      const orig = mats.map((m) => m.depthFunc);
      if (mode === 'jit' && !A.R.__jitWrap) {   // 참고용: 카메라를 시선 방향으로 ±1cm 씩 흔든다(손떨림 흉내). 실패 판정에는 쓰지 않는다.
        const r0 = A.R.render; A.R.__jitWrap = true;
        A.R.render = function (s, cam, dt, w) { if (A.__jitOff) { const v = new THREE.Vector3(); cam.getWorldDirection(v); cam.position.addScaledVector(v, A.__jitOff); cam.updateMatrixWorld(); } return r0.call(this, s, cam, dt, w); };
      }
      function grab(f) { if (mode === 'jit') A.__jitOff = (f % 2 ? 1 : -1) * 0.01; if (mode === 'tie') { const df = (f % 2) ? THREE.LessEqualDepth : THREE.LessDepth; mats.forEach((m) => { m.depthFunc = df; }); } __step(1, 16.67); g.drawImage(c, 0, 0); return g.getImageData(0, 0, W, H).data; }
      let prev = grab(0); const first = cv.toDataURL('image/jpeg', 0.85);
      const acc = new Float32Array(W * H), mx = new Float32Array(W * H);
      for (let f = 1; f <= N; f++) {
        const cur = grab(f);
        for (let i = 0, p = 0; i < W * H; i++, p += 4) {
          const d = (Math.abs(cur[p] - prev[p]) + Math.abs(cur[p + 1] - prev[p + 1]) + Math.abs(cur[p + 2] - prev[p + 2])) / 3;
          acc[i] += d / N; if (d > mx[i]) mx[i] = d;
        }
        prev = cur;
      }
      mats.forEach((m, i) => { m.depthFunc = orig[i]; }); A.__jitOff = 0;
      let sum = 0, over = 0; for (let i = 0; i < W * H; i++) { sum += acc[i]; if (mx[i] > 24) over++; }
      const blocks = [];
      for (let by = 0; by < Math.ceil(H / 32); by++) for (let bx = 0; bx < Math.ceil(W / 32); bx++) {
        let s = 0, n = 0;
        for (let y = by * 32; y < Math.min(H, by * 32 + 32); y++) for (let x = bx * 32; x < Math.min(W, bx * 32 + 32); x++) { s += acc[y * W + x]; n++; }
        blocks.push({ bx, by, mean: +(s / n).toFixed(3) });
      }
      blocks.sort((a, b) => b.mean - a.mean);
      const img = g.createImageData(W, H);
      for (let i = 0; i < W * H; i++) { img.data[i * 4] = Math.min(255, mx[i] * 4); img.data[i * 4 + 1] = Math.min(255, acc[i] * 20); img.data[i * 4 + 3] = 255; }
      g.putImageData(img, 0, 0);
      return { mean: +(sum / (W * H)).toFixed(4), over24: over, worst: blocks[0], top: blocks.slice(0, 4), first, heat: cv.toDataURL('image/png') };
    }, { N: frames, mode });
    if (out) {
      fs.mkdirSync(out, { recursive: true });
      fs.writeFileSync(path.join(out, `${id}_${v.tag}_${mode}_frame.jpg`), Buffer.from(r.first.split(',')[1], 'base64'));
      fs.writeFileSync(path.join(out, `${id}_${v.tag}_${mode}_heat.png`), Buffer.from(r.heat.split(',')[1], 'base64'));
    }
    delete r.first; delete r.heat;
    res.push({ id, view: v.tag, ...r, pass: mode !== 'tie' || r.worst.mean <= THRESH });
  }
  await page.close();
  return { res, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), ids = [], o = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--frames') o.frames = Math.min(10, +a[++i]); else if (a[i] === '--size') o.size = a[++i];
    else if (a[i] === '--out') o.out = a[++i]; else if (a[i] === '--quality') o.quality = a[++i]; else if (a[i] === '--mode') o.mode = a[++i]; else ids.push(a[i]);
  }
  if (!ids.length) ids.push('lateran', 'stpeter');
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let ok = true;
  for (const id of ids) {
    const t0 = Date.now();
    const { res, errors } = await measure(browser, id, o);
    for (const r of res) {
      console.log(`${r.pass ? 'ok  ' : 'FAIL'} ${id}/${r.view} [${o.mode || 'tie'}] worstBlock=${r.worst.mean} (bx${r.worst.bx},by${r.worst.by}) mean=${r.mean} px>24=${r.over24} thresh=${THRESH}`);
      ok = ok && r.pass;
    }
    if (errors.length) { console.log('page errors:', errors.join(' | ')); ok = false; }
    console.log(`  ${id}: ${Date.now() - t0}ms`);
  }
  await browser.close();
  process.exit(ok ? 0 : 1);
}
