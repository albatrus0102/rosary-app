#!/usr/bin/env node
// glb 아바타 걷기 확인(Playwright chromium + SwiftShader): 스탠드인 걷기 클립을 avatar_glb.js 로 재생하며 몸을 0.8 / 2.0 / 4.0 m/s 로 옮기고
// 디딘 발(발목·발끝 중 낮은 뼈)의 세계 좌표 속도 / 몸 속도(미끄러짐 비율)를 재고, 한 클립 주기를 8장(옆·앞)으로 찍는다. 막혔을 때(몸 정지 + 걷기 입력)도 잰다.
//   준비: cd tools/avatar_glb && npm ci && node build_loader.mjs && node runtime_check.mjs(또는 스탠드인·apack 만들기)  → work/pack/apack_S01.js, apack_anims.js
//   node tools/avatar_glb/walk_check.mjs <outDir> [avatar_glb.js 가 든 폴더=assets/church] [접두=after]
// 해석: docs/church/WALK_GAIT.md
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] || '/tmp/glb_walk');
const glbDir = path.resolve(process.argv[3] || path.join(here, '../../assets/church'));
const tag = process.argv[4] || 'after';
const A = path.resolve(here, '../../assets/church');
fs.mkdirSync(out, { recursive: true });
const scripts = [`${A}/three.min.js`, `${A}/geo.js`, `${A}/palette.js`, `${A}/baptismal_names.js`, `${A}/label_fit.js`, `${A}/avatar.js`, `${here}/dist/three_glb.js`, `${glbDir}/avatar_glb.js`, `${here}/work/pack/apack_S01.js`, `${here}/work/pack/apack_anims.js`];
const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">${scripts.map((s) => `<script src="file://${s}"></script>`).join('')}
<script>
const T = THREE, W = 300, H = 380;
const r = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.outputEncoding = T.sRGBEncoding; document.body.appendChild(r.domElement);
const sc = new T.Scene(); sc.background = new T.Color(0xe8e4dc);
sc.add(new T.HemisphereLight(0xffffff, 0x887766, 1.1)); const dl = new T.DirectionalLight(0xffffff, 0.9); dl.position.set(3, 6, 4); sc.add(dl);
const g1 = new T.GridHelper(200, 2000, 0x555555, 0x9a948a); g1.position.y = 0.001; sc.add(g1);
const cam = new T.PerspectiveCamera(24, W / H, 0.1, 100);
window.ready = Promise.all([ChurchGlb.load('S01'), ChurchGlb.loadAnims('anims')]);
window.mk = () => { const a = new ChurchGlb.GlbAvatar({ g: 0, skin: 1, hair: 2, outfit: 0, name: 1, nv: 2 }, { type: 'S01', anims: 'anims' }); a.setLod(0); sc.add(a.root); return a; };
const v3 = new T.Vector3();
function footW(a, name) { const b = a.B[name]; b.updateWorldMatrix(true, false); v3.setFromMatrixPosition(b.matrixWorld); a.body.updateWorldMatrix(true, false); return v3.clone().applyMatrix4(a.body.matrixWorld); }
// 몸을 옮기며 dt 마다 update. speed(t) m/s, walkIn(t) = setWalk 값, blocked = 몸은 서 있고 입력만 걷기
window.walk = (a, st, dur, speed, walkIn) => {
  const dt = 1 / 60, rec = [];
  for (let i = 0; i < Math.round(dur / dt); i++) {
    st.t += dt; const v = speed(st.t); st.z -= v * dt;
    a.setWalk(walkIn(st.t, v)); a.setPose(0, 0, st.z, 0); a.update(dt, st.t); a.root.updateMatrixWorld(true);
    const f = ['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot'].map((n) => footW(a, n));
    rec.push({ t: st.t, v, f: f.map((p) => [p.x, p.y, p.z]) });
  }
  return rec;
};
window.shot = (a, st, view) => {
  if (view === 'side') { cam.position.set(4.8, 0.95, st.z - 0.15); cam.lookAt(0, 0.85, st.z - 0.15); }
  else { cam.position.set(0.35, 1.0, st.z - 5.2); cam.lookAt(0, 0.8, st.z); }
  r.render(sc, cam); return r.domElement.toDataURL('image/png');
};
</script></body></html>`;
const page0 = path.join(out, `_glb_${tag}.html`); fs.writeFileSync(page0, html);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 300, height: 380 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto('file://' + page0);
await page.evaluate(() => window.ready);
const res = {};
// 미끄러짐: 매 프레임 네 뼈 중 가장 낮은 뼈(디딘 발)의 수평 속도 / 몸 속도
for (const v of [0.8, 2.0, 4.0]) {
  res['v' + v] = await page.evaluate((v) => {
    const a = mk(), st = { t: 0, z: 0 };
    walk(a, st, 2.0, (t) => Math.min(v, v * t / 0.3), (t, s) => Math.min(1, s / 4 * 1.05));
    const rec = walk(a, st, 3.0, () => v, (t, s) => Math.min(1, s / 4 * 1.05));
    let slip = 0, body = 0, ymin = 1e9;
    for (let i = 1; i < rec.length; i++) {
      const fr = rec[i], pv = rec[i - 1]; let lo = 0;
      for (let k = 1; k < 4; k++) if (fr.f[k][1] < fr.f[lo][1]) lo = k;
      ymin = Math.min(ymin, fr.f[lo][1]);
      slip += Math.hypot(fr.f[lo][0] - pv.f[lo][0], fr.f[lo][2] - pv.f[lo][2]) * 60; body += fr.v;
    }
    a.root.parent.remove(a.root);
    return { ratio: slip / body, footV: slip / (rec.length - 1), bodyV: body / (rec.length - 1), timeScale: a.actions.walk ? a.actions.walk.timeScale : null };
  }, v);
}
// 막힘: 몸은 제자리, 입력은 끝까지 걷기 → 발이 움직이는 속도(몸 기준)
res.blocked = await page.evaluate(() => {
  const a = mk(), st = { t: 0, z: 0 };
  const rec = walk(a, st, 3.0, () => 0, () => 1);
  let m = 0; for (let i = 61; i < rec.length; i++) for (let k = 0; k < 4; k++) m += Math.hypot(rec[i].f[k][0] - rec[i - 1].f[k][0], rec[i].f[k][1] - rec[i - 1].f[k][1], rec[i].f[k][2] - rec[i - 1].f[k][2]) * 60 / 4;
  a.root.parent.remove(a.root);
  return { legFootV: m / (rec.length - 61) };
});
// 접촉 시트: 클립 한 주기(walk 클립 길이 / timeScale)를 8장
const files = [];
for (const v of [1.2, 4.0]) for (const view of ['side', 'front']) {
  const imgs = await page.evaluate(([v, view]) => {
    const a = mk(), st = { t: 0, z: 0 };
    walk(a, st, 2.5, (t) => Math.min(v, v * t / 0.3), (t, s) => Math.min(1, s / 4 * 1.05));
    const act = a.actions.walk, period = act.getClip().duration / Math.max(0.05, act.timeScale), res = [];
    for (let k = 0; k < 8; k++) { res.push(shot(a, st, view)); walk(a, st, period / 8, () => v, (t, s) => Math.min(1, s / 4 * 1.05)); }
    a.root.parent.remove(a.root);
    return res;
  }, [v, view]);
  const data = await page.evaluate(async (imgs) => {
    const c = document.createElement('canvas'); c.width = 300 * imgs.length; c.height = 380; const g = c.getContext('2d');
    for (let i = 0; i < imgs.length; i++) { const im = new Image(); im.src = imgs[i]; await im.decode(); g.drawImage(im, i * 300, 0); g.fillStyle = '#000'; g.font = '16px sans-serif'; g.fillText((i + 1) + '/8', i * 300 + 8, 20); }
    return c.toDataURL('image/png');
  }, imgs);
  const f = path.join(out, `${tag}_glb_${view}_${v.toFixed(1)}.png`);
  fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64')); files.push(f);
}
await browser.close();
console.log(JSON.stringify({ res, files, errors }, (k, v) => (typeof v === 'number' ? +v.toFixed(3) : v)));
