// 걸음 접촉 시트: node tools/church_web/gait_sheet.mjs <outDir> [assets 폴더=assets/church] [이름 접두=after]
// 코드로 그린 아바타를 빈 바닥(10cm 격자)에서 걷게 하고 한 주기를 8장으로 옆·앞에서 찍는다(카메라는 몸을 따라가므로 디딘 발이 격자에 붙어 있으면 미끄러지지 않는 것).
// 속도: 1.2 m/s(보통 걸음), 2.0 m/s, 4.0 m/s(최고 속도 — 빠른 걸음). 결과: <outDir>/<접두>_<side|front>_<속도>.png
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || '/tmp/gait_sheet';
const dir = path.resolve(process.argv[3] || path.join(here, '../../assets/church'));
const tag = process.argv[4] || 'after';
fs.mkdirSync(out, { recursive: true });
const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#ddd}</style></head><body>
${['three.min.js', 'palette.js', 'baptismal_names.js', 'geo.js', 'label_fit.js', 'avatar.js'].map((f) => `<script src="file://${dir}/${f}"></script>`).join('\n')}
<script>
const T = THREE, W = 300, H = 380;
const r = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.outputEncoding = T.sRGBEncoding; document.body.appendChild(r.domElement);
const sc = new T.Scene(); sc.background = new T.Color(0xe8e4dc);
sc.add(new T.HemisphereLight(0xffffff, 0x887766, 1.1)); const dl = new T.DirectionalLight(0xffffff, 0.9); dl.position.set(3, 6, 4); sc.add(dl);
const grid = new T.GridHelper(200, 2000, 0x555555, 0x9a948a); grid.position.y = 0.001; sc.add(grid);
const big = new T.GridHelper(200, 200, 0x222222, 0x333333); big.position.y = 0.002; sc.add(big);
const cam = new T.PerspectiveCamera(24, W / H, 0.1, 100);
window.mk = (g) => { const a = new ChurchAvatar.Avatar({ g, skin: 1, style: 1, hair: 2, outfit: 3, name: 0, nv: 2 }, { showTag: false }); a.setLod(0); if (a.phase !== undefined) a.phase = 0.3; sc.add(a.root); return a; };
window.run = (av, v, dur, state) => { const dt = 1 / 60; let n = Math.round(dur / dt); while (n-- > 0) { state.t += dt; const vv = Math.min(v, v * state.t / 0.3); state.z -= vv * dt; av.setWalk(Math.min(1, vv / 4 * 1.05)); av.setPose(0, 0, state.z, 0); av.update(dt, state.t); } };
window.shot = (av, state, view) => {
  const z = state.z;
  if (view === 'side') { cam.position.set(4.6, 0.85, z - 0.15); cam.lookAt(0, 0.78, z - 0.15); }
  else { cam.position.set(0.35, 0.95, z - 5.0); cam.lookAt(0, 0.75, z); }
  r.render(sc, cam); return r.domElement.toDataURL('image/png');
};
</script></body></html>`;
const pagePath = path.join(out, `_sheet_${tag}.html`);
fs.writeFileSync(pagePath, html);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 300, height: 380 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto('file://' + pagePath);
await page.waitForFunction(() => window.ChurchAvatar && window.run);
// 한 주기 길이: 옛 코드는 phase 2π, 새 코드는 gait.ph 1 바퀴. 둘 다 phase(라디안)를 읽어 2π 를 8칸으로 나눈다.
const cases = [['1.2', 1.2], ['2.0', 2.0], ['4.0', 4.0]];
const files = [];
for (const [name, v] of cases) for (const view of ['side', 'front']) {
  const imgs = await page.evaluate(([v, view]) => {
    const av = mk(1), st = { t: 0, z: 0 };
    run(av, v, 3, st);
    const ph0 = av.phase, res = [];
    // 위상이 2π/8 씩 나아갈 때마다 찍는다(옛 phase 는 누적값, 새 phase = 2π·uR)
    const unwrap = { last: av.phase, acc: 0 };
    for (let k = 0; k < 8; k++) {
      const target = k * Math.PI / 4; let guard = 0;
      while (unwrap.acc < target && guard++ < 600) { run(av, v, 1 / 60, st); let d = av.phase - unwrap.last; if (d < -Math.PI) d += 2 * Math.PI; unwrap.acc += d; unwrap.last = av.phase; }
      res.push(shot(av, st, view));
    }
    av.root.parent.remove(av.root);
    void ph0;
    return res;
  }, [v, view]);
  const strip = path.join(out, `${tag}_${view}_${name}.png`);
  // 8장을 가로로 이어 붙인다(브라우저 캔버스로)
  const data = await page.evaluate(async (imgs) => {
    const c = document.createElement('canvas'); c.width = 300 * imgs.length; c.height = 380; const g = c.getContext('2d');
    for (let i = 0; i < imgs.length; i++) { const im = new Image(); im.src = imgs[i]; await im.decode(); g.drawImage(im, i * 300, 0); g.fillStyle = '#000'; g.font = '16px sans-serif'; g.fillText(String(i + 1) + '/8', i * 300 + 8, 20); }
    return c.toDataURL('image/png');
  }, imgs);
  fs.writeFileSync(strip, Buffer.from(data.split(',')[1], 'base64'));
  files.push(strip);
}
await browser.close();
console.log(JSON.stringify({ files, errors }));
