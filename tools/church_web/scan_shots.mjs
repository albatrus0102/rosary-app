// 실물 스캔 성상(scan3d.js) 스크린샷 + 그 시점의 draw call·삼각형 전후 비교. `node --test` 밖.
//   node tools/church_web/scan_shots.mjs <outdir> [--base <다른 assets/church 사본>] [--size 960x540] [--hour 11] [--quality high] [id ...]
// 성당마다 장면 안의 스캔 성상(LOD, userData.scan3d)을 찾아 그 앞쪽(바라보는 방향)에 카메라를 둔다:
//   close = 높이 × 1.25 거리, normal = 높이 × 3.2 거리(눈높이 쪽으로 조금 내림). 아바타는 숨긴다.
// --base 를 주면 같은 카메라 자리에서 사본(예: git archive HEAD)의 draw call·삼각형도 재고 사진(_base)도 찍는다.
// 결과: <outdir>/<id>_<name>_<view>.png, <outdir>/scan_perf.json
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../assets/church');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const base = opt('--base', null), size = opt('--size', '960x540'), hour = opt('--hour', '11'), quality = opt('--quality', 'high');
const out = args[0] || '/tmp/scan_shots', ids = args.slice(1).length ? args.slice(1) : ['stpeter', 'lateran', 'stpaul', 'basic', 'florence', 'myeongdong'];
const [W, H] = size.split('x').map(Number);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });

async function open(dir, id) {
  const page = await browser.newPage({ viewport: { width: W, height: H } }), errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  const q = new URLSearchParams({ church: id, quality, autotier: '0', msaa: '0', hideui: '1', hour, markers: '0', frames: '10', solo: '0' });   // solo=0: 혼자 기도 군중 없음(실행마다 달라 전후 비교가 흔들린다)
  await page.goto('file://' + dir + '/test.html?' + q.toString());
  await page.waitForFunction(() => window.__church && window.__church.done, null, { timeout: 600000 });
  await page.waitForFunction(() => { const L = []; window.__church.scene.traverse((o) => { if (o.userData.scan3d) L.push(o); }); return L.every((o) => o.visible && o.levels.length === 2); }, null, { timeout: 60000 }).catch(() => errors.push('scan not visible'));
  return { page, errors };
}
// 카메라 자리: 스캔 성상마다 close·normal
async function spots(page) {
  return page.evaluate(() => {
    const T = window.THREE, out = [];
    window.__church.scene.traverse((o) => {
      if (!o.userData.scan3d || !o.visible) return;
      const bb = new T.Box3().setFromObject(o.levels[0].object), c = bb.getCenter(new T.Vector3()), h = bb.max.y - bb.min.y, a = o.rotation.y;
      const f = [Math.sin(a), Math.cos(a)], tris = o.levels.map((l) => l.object.geometry.index.count / 3);
      [['close', 1.25, 0], ['normal', 3.2, -0.25]].forEach(([v, k, dy]) => {
        const d = Math.max(1.6, h * k);
        out.push({ name: o.name, key: o.userData.scan3d, view: v, h: +h.toFixed(2), tris, cam: [c.x + f[0] * d, c.y + dy * h + 0.15, c.z + f[1] * d], look: [c.x, c.y, c.z] });
      });
    });
    return out;
  });
}
async function shoot(page, s, file) {
  const r = await page.evaluate(({ s }) => {
    const C = window.__church;
    if (C.meAv) C.meAv.root.visible = false;
    C.camera.position.set(s.cam[0], s.cam[1], s.cam[2]); C.camera.lookAt(s.look[0], s.look[1], s.look[2]); C.camera.updateMatrixWorld();
    C.camera.matrixWorldInverse.copy(C.camera.matrixWorld).invert();
    for (let i = 0; i < 4; i++) { C.world.update(0.016, C.t, C.me, C.camera); C.R.render(C.scene, C.camera, 0.016, C.world); }
    const info = C.renderer.info.render, r = { calls: info.calls, tris: info.triangles };
    let lod = null; const L = []; C.scene.traverse((o) => { if (o.name === s.name && o.isLOD) lod = o.getCurrentLevel(); if (o.userData.scan3d && o.visible) L.push(o); });
    if (L.length) {   // 스캔 성상만 숨기고 한 번 더 — 성상 자체의 몫(나머지는 묶음 내용이 바뀐 몫)
      L.forEach((o) => { o.visible = false; });
      for (let i = 0; i < 2; i++) { C.world.update(0.016, C.t, C.me, C.camera); C.R.render(C.scene, C.camera, 0.016, C.world); }
      r.hiddenCalls = info.calls; r.hiddenTris = info.triangles;
      L.forEach((o) => { o.visible = true; });
      for (let i = 0; i < 2; i++) { C.world.update(0.016, C.t, C.me, C.camera); C.R.render(C.scene, C.camera, 0.016, C.world); }
    }
    return { ...r, lod };
  }, { s });
  if (file) await page.screenshot({ path: file });
  return r;
}
const all = [];
for (const id of ids) {
  const a = await open(root, id), S = await spots(a.page);
  if (!S.length) console.log(id, 'no scan statues', a.errors.join(' | '));
  const seen = {};
  for (const s of S) {
    const n = (seen[s.name + s.view] = (seen[s.name + s.view] || 0) + 1), tag = `${id}_${s.name}${n > 1 ? '_' + n : ''}_${s.view}`;
    s.after = await shoot(a.page, s, path.join(out, tag + '.png'));
    s.id = id; s.tag = tag; all.push(s);
  }
  await a.page.close();
  if (base) {
    const b = await open(base, id);
    for (const s of all.filter((x) => x.id === id)) s.before = await shoot(b.page, s, s.view === 'normal' ? path.join(out, s.tag + '_base.png') : null);
    if (b.errors.length) console.log(id, 'base errors', b.errors.slice(0, 3).join(' | '));
    await b.page.close();
  }
  for (const s of all.filter((x) => x.id === id)) console.log(`${s.tag.padEnd(44)} h ${s.h} lodTris ${s.tris.join('/')} level ${s.after.lod} calls ${s.before ? s.before.calls + ' -> ' : ''}${s.after.calls} (scans hidden ${s.after.hiddenCalls}) tris ${s.before ? s.before.tris + ' -> ' : ''}${s.after.tris} (hidden ${s.after.hiddenTris})`);
  if (a.errors.length) console.log(id, 'ERRORS', a.errors.slice(0, 5).join(' | '));
}
fs.writeFileSync(path.join(out, 'scan_perf.json'), JSON.stringify(all, null, 1));
await browser.close();
