// 원피스 자락 장면 시트: node tools/church_web/skirt_shots.mjs <outDir> [assets 폴더=assets/church] [접두=after]
// 여성 아바타(원피스)를 4 m/s·1.2 m/s 로 걷게 하고(뒤·옆·비스듬히 뒤), 앉기·무릎 꿇기 자세를 찍는다 — 다리가 자락을 뚫고 나오는지 눈으로 본다(skirt_lib.mjs 가 수치로 잰다).
// 결과: <outDir>/<접두>_skirt_<장면>.png (한 줄에 8장)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || '/tmp/skirt_shots';
const dir = path.resolve(process.argv[3] || path.join(here, '../../assets/church'));
const tag = process.argv[4] || 'after';
fs.mkdirSync(out, { recursive: true });
const W = 260, H = 360;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#ddd}</style></head><body>
${['three.min.js', 'palette.js', 'baptismal_names.js', 'geo.js', 'label_fit.js', 'avatar.js'].map((f) => `<script src="file://${dir}/${f}"></script>`).join('\n')}
<script>
const T = THREE, W = ${W}, H = ${H};
const r = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.outputEncoding = T.sRGBEncoding; document.body.appendChild(r.domElement);
const sc = new T.Scene(); sc.background = new T.Color(0xe8e4dc);
sc.add(new T.HemisphereLight(0xffffff, 0x887766, 1.1)); const dl = new T.DirectionalLight(0xffffff, 0.9); dl.position.set(3, 6, 4); sc.add(dl);
const grid = new T.GridHelper(200, 400, 0x555555, 0x9a948a); grid.position.y = 0.001; sc.add(grid);
const cam = new T.PerspectiveCamera(24, W / H, 0.1, 100);
window.mk = (outfit) => { const a = new ChurchAvatar.Avatar({ g: 0, skin: 1, style: 1, hair: 2, outfit, name: 0, nv: 2 }, { showTag: false }); a.setLod(0); a.off = 1; a.phase = 0.3; sc.add(a.root); return a; };
window.walk = (av, v, dur, st) => { const dt = 1 / 60; let n = Math.round(dur / dt); while (n-- > 0) { st.t += dt; const vv = Math.min(v, v * st.t / 0.3); st.z -= vv * dt; av.setWalk(Math.min(1, vv / 4 * 1.05)); av.setPose(0, 0, st.z, 0); av.update(dt, st.t); } };
window.shot = (av, st, view) => {
  const z = st.z;
  if (view === 'side') { cam.position.set(4.6, 0.85, z - 0.15); cam.lookAt(0, 0.7, z - 0.15); }
  else if (view === 'back') { cam.position.set(0, 1.5, z + 4.2); cam.lookAt(0, 0.7, z); }       // 앱 3인칭처럼 뒤에서
  else if (view === 'backq') { cam.position.set(2.6, 1.3, z + 3.2); cam.lookAt(0, 0.65, z); }   // 비스듬히 뒤
  else { cam.position.set(1.8, 1.2, z - 3.6); cam.lookAt(0, 0.62, z); }                         // 비스듬히 앞
  r.render(sc, cam); return r.domElement.toDataURL('image/png');
};
</script></body></html>`;
const pagePath = path.join(out, `_skirt_${tag}.html`);
fs.writeFileSync(pagePath, html);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto('file://' + pagePath);
await page.waitForFunction(() => window.ChurchAvatar && window.walk);
const files = [];
async function strip(name, imgs) {
  const data = await page.evaluate(async ([imgs, W, H]) => {
    const c = document.createElement('canvas'); c.width = W * imgs.length; c.height = H; const g = c.getContext('2d');
    for (let i = 0; i < imgs.length; i++) { const im = new Image(); im.src = imgs[i]; await im.decode(); g.drawImage(im, i * W, 0); g.fillStyle = '#000'; g.font = '14px sans-serif'; g.fillText(String(i + 1), i * W + 6, 16); }
    return c.toDataURL('image/png');
  }, [imgs, W, H]);
  const f = path.join(out, `${tag}_skirt_${name}.png`);
  fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64'));
  files.push(f);
}
// 걷기: 한 주기를 8장으로(위상 기준)
for (const [v, view, outfit] of [[4, 'back', 6], [4, 'backq', 6], [4, 'side', 6], [4, 'front', 6], [1.2, 'back', 2], [1.2, 'backq', 2]]) {
  const imgs = await page.evaluate(([v, view, outfit]) => {
    const av = mk(outfit), st = { t: 0, z: 0 }; walk(av, v, 3, st);
    const res = [], u = { last: av.phase, acc: 0 };
    for (let k = 0; k < 8; k++) {
      const target = k * Math.PI / 4; let guard = 0;
      while (u.acc < target && guard++ < 600) { walk(av, v, 1 / 60, st); let d = av.phase - u.last; if (d < -Math.PI) d += 2 * Math.PI; u.acc += d; u.last = av.phase; }
      res.push(shot(av, st, view));
    }
    av.root.parent.remove(av.root); return res;
  }, [v, view, outfit]);
  await strip(`walk${v}_${view}`, imgs);
}
// 계단 오르기(단 0.30m × 0.17m, 8단): 1.2 m/s 로 오르며 0.1초마다(옆·비스듬히 뒤)
for (const view of ['side', 'backq']) {
  const imgs = await page.evaluate((view) => {
    const gy = (z) => { const d = -z - 1; return d <= 0 ? 0 : Math.min(8, Math.floor(d / 0.3) + 1) * 0.17; };
    if (!window.stairMesh) { window.stairMesh = new T.Group(); for (let i = 1; i <= 8; i++) { const m = new T.Mesh(new T.BoxGeometry(1.4, 0.17 * i, 0.3), new T.MeshStandardMaterial({ color: 0xb8b0a0 })); m.position.set(0, 0.17 * i / 2, -1 - 0.3 * (i - 1) - 0.15); window.stairMesh.add(m); } const top = new T.Mesh(new T.BoxGeometry(1.4, 1.36, 20), new T.MeshStandardMaterial({ color: 0xb8b0a0 })); top.position.set(0, 0.68, -3.4 - 10); window.stairMesh.add(top); sc.add(window.stairMesh); }
    window.stairMesh.visible = true;
    const av = mk(6), st = { t: 0, z: 0, y: 0 }, res = [], dt = 1 / 60;
    av.setGround((x, z) => gy(z));
    const step = () => { st.t += dt; const vv = Math.min(1.2, 1.2 * st.t / 0.3); st.z -= vv * dt; let q = 0; for (let i = -3; i <= 3; i++) q += gy(st.z - 0.15 * i); st.y += (q / 7 - st.y) * Math.min(1, dt * 14); av.setWalk(Math.min(1, vv / 4 * 1.05)); av.setPose(0, st.y, st.z, 0); av.update(dt, st.t); };
    while (st.t < 0.7) step();
    for (let k = 0; k < 8; k++) { for (let i = 0; i < 6; i++) step(); const z = st.z, y = st.y;
      if (view === 'side') { cam.position.set(4.6, 0.85 + y, z - 0.15); cam.lookAt(0, 0.7 + y, z - 0.15); } else { cam.position.set(2.6, 1.3 + y, z + 3.2); cam.lookAt(0, 0.65 + y, z); }
      r.render(sc, cam); res.push(r.domElement.toDataURL('image/png')); }
    av.root.parent.remove(av.root); window.stairMesh.visible = false; return res;
  }, view);
  await strip(`stairs1.2_${view}`, imgs);
}
// 앉기·무릎 꿇기: 앉는 도중 → 앉음 → 무릎 꿇는 도중 → 무릎 꿇음 → 일어서는 도중(뒤·앞 번갈아)
const imgs = await page.evaluate(() => {
  const av = mk(6), st = { t: 0, z: 0 }, res = [], dt = 1 / 60;
  const run = (dur, f) => { let n = Math.round(dur / dt); while (n-- > 0) { st.t += dt; f && f(); av.setWalk(0); av.setPose(0, 0, 0, 0); av.update(dt, st.t); } };
  run(0.5); av.setSeated(true); run(0.25); res.push(shot(av, st, 'backq')); run(1.5); res.push(shot(av, st, 'backq'), shot(av, st, 'front'));
  av.setKneel(true); run(0.35); res.push(shot(av, st, 'front')); run(1.2); res.push(shot(av, st, 'backq'), shot(av, st, 'front'));
  av.setKneel(false); run(1.2); av.setSeated(false); run(0.2); res.push(shot(av, st, 'backq')); run(1.0); res.push(shot(av, st, 'front'));
  return res;
});
await strip('sit_kneel', imgs);
await browser.close();
console.log(JSON.stringify({ files, errors }));
