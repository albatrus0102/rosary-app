// 성모 자리 3D 성상 — 기본 카메라(서는 자리에서 성상을 바라봄)·가까이 스크린샷 + 그리기 호출/삼각형 수.
//   node tools/church_web/shrine_mesh_shots.mjs <outdir> [--root <assets/church 사본>] [--tag name] [id ...]
// 기본 id: danggogae stpeter milan. --root 로 예전 커밋 사본(git archive)을 줘서 전/후를 같은 방식으로 잰다.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(k); if (i < 0) return d; const v = a[i + 1]; a.splice(i, 2); return v; };
const root = path.resolve(opt('--root', path.join(here, '../../assets/church'))), tag = opt('--tag', 'after');
const out = a[0] || '/tmp/shrine_mesh', ids = a.slice(1).length ? a.slice(1) : ['danggogae', 'stpeter', 'milan'];
const Places = require(path.join(root, 'shrine_places.js'));
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
let bad = 0;
for (const id of ids) {
  const p = Places[id], page = await browser.newPage({ viewport: { width: 540, height: 720 } }), errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.addInitScript(() => {
    const q = []; let tNow = 0;
    window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
    window.__step = (n, dtMs) => { for (let i = 0; i < n; i++) { const cbs = q.splice(0); tNow = (tNow || performance.now()) + dtMs; cbs.forEach((cb) => cb(tNow)); } };
  });
  await page.goto('file://' + root + '/test.html?' + new URLSearchParams({ church: id, quality: 'high', autotier: '0', msaa: '0', hideui: '1', hour: '11', markers: '0', solo: '1' }));
  await page.waitForFunction(() => window.__church && window.__church.world && window.__church.R, null, { timeout: 600000, polling: 500 });
  await page.waitForTimeout(1500);
  const ok = await page.waitForFunction(() => { const s = window.__church.scene.getObjectByName('shrine_statue'); return s && s.visible; }, null, { timeout: 30000, polling: 250 }).then(() => true, () => false);
  const stat = async (name) => {
    const r = await page.evaluate(() => { const A = __church; __step(4, 50); const i = A.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries }; });
    console.log(`${tag} ${id} ${name}: calls ${r.calls} tris ${r.tris} geos ${r.geos}`);
    return r;
  };
  // 기본 카메라: 서는 자리(무릎틀 앞)에서 성상을 바라본다
  const st = await page.evaluate((id) => { const A = __church, s = A.world.layout.shrine, L = A.world.layout, stand = L.candles.stands[s.stand]; return { x: stand.x + stand.face[0] * (stand.pond ? 1.5 : 1.0), z: stand.z + stand.face[1] * (stand.pond ? 1.5 : 1.0), y: A.logic.floorY(stand.x, stand.z), yaw: s.yaw }; }, id);
  const place = async (x, z, y, yawDeg) => page.evaluate(({ x, z, y, yawDeg }) => {
    const A = __church, D = Math.PI / 180; A.me.x = x; A.me.z = z; A.me.y = y; A.ctl.yaw = yawDeg * D; A.me.yaw = A.ctl.yaw; A.ctl.pitch = 0.08; if ('look' in A.ctl) A.ctl.look = 0; A.camInit = false; __step(40, 50);
  }, { x, z, y, yawDeg });
  const yawTo = (yawFace) => yawFace;
  await place(st.x, st.z, st.y, yawTo(st.yaw));
  await stat('default'); await page.screenshot({ path: path.join(out, `${id}_${tag}_default.png`) });
  // 가까이: 성상 앞 1.5m 에서 얼굴 높이(아바타 숨김)
  await page.evaluate(({ p }) => {
    const C = __church, y = p.yaw * Math.PI / 180, fy = C.logic.floorY(p.x, p.z) + (p.altar_h || 0) + 0.9;   // 바닥(성 베드로는 제대 윗면) + 성상 가슴 높이
    const az = p.z + (p.altar_d ? Math.cos(y) * p.altar_d : 0), bx = p.x + (p.altar_d ? Math.sin(y) * p.altar_d : 0);
    if (C.meAv) C.meAv.root.visible = false;
    const aim = () => { C.camera.position.set(bx + Math.sin(y) * 2.4, fy + 0.35, az + Math.cos(y) * 2.4); C.camera.lookAt(bx, fy, az); C.camera.updateMatrixWorld(); C.camera.matrixWorldInverse.copy(C.camera.matrixWorld).invert(); };
    aim(); for (let i = 0; i < 3; i++) { C.world.update(0.016, C.t, C.me, C.camera); aim(); C.R.render(C.scene, C.camera, 0.016, C.world); }   // world.update 가 카메라를 건드리는 성당(밀라노)이 있어 매번 다시 겨눈다
  }, { p });
  await page.screenshot({ path: path.join(out, `${id}_${tag}_close.png`) });
  console.log(id, 'statue', ok ? 'visible' : 'MISSING', errors.length ? 'ERRORS ' + errors.join(' | ') : '');
  if (tag === 'after' && (!ok || errors.length)) bad++;
  await page.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
