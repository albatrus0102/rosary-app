// 피렌체 구조·창 확인용 캡처(I-3). `node --test` 밖. 한 번 읽고 자유 카메라로 여러 장면을 차례로 그린다(순차, 소프트웨어 GL).
// 사용: node tools/church_web/florence_shots.mjs --out <dir> [--views nave,crossing,...] [--size 800x450] [--root <assets/church 사본>]
//       [--devglass] [--church florence|qa_florence] [--hour 11] [--jpg 80] [--prefix a_] [--stats]
// 자유 카메라: 아바타 추적 카메라(와 이 성당의 돔 기울기 보정)를 거치지 않고 눈 위치·보는 점을 직접 준다 → 수정 전후를 같은 시점에서 비교한다.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));

// [눈 x,y,z, 보는 점 x,y,z, fov]
export const VIEWS = {
  nave: [0, 4.2, 27, 0, 9.5, -13, 62],             // 신랑에서 팔각 쪽(큰 아치·동 트리부나)
  navehigh: [0, 9, 14, 0, 13, -14, 62],            // 신랑 끝 큰 아치와 그 너머
  crossing: [0, 1.9, -6.5, 0, 10.5, -30, 66],      // 팔각에서 동 트리부나(경당 아치·윗창·발코니·반돔)
  tribune: [0, 1.8, -21.5, 0, 6.8, -33, 70],       // 동 트리부나 안(경당 5)
  tribuneS: [9.5, 1.8, -12.93, 20, 7.5, -12.93, 70], // 남 트리부나
  tribup: [0, 1.8, -24.5, 0, 14, -30.5, 72],       // 트리부나 윗창과 반돔
  back: [0, 4.6, -21.5, 0, 10.5, 12, 66],              // 제대 뒤에서 신랑 쪽(서쪽 큰 아치·측랑 통로)
  aisleN: [-4.6, 2.2, 22.5, -8.6, 3.6, 10.5, 62],  // 북 측랑 벽 그림 3점
  aisleS: [6.7, 1.9, 9, 6.6, 3.2, -9, 62],         // 남 측랑 끝 → 팔각 통로
  passage: [4.2, 1.9, -9.5, 7.2, 3.0, 2.5, 66],    // 팔각 안에서 서남 대각 면(통로 아치)
  dome: [0, 1.6, -11.0, 0, 30, -13.6, 78],         // 돔·드럼 창
  drum: [0, 1.7, -4.5, 0, 21.6, -23, 50],          // 드럼 동쪽 창 줄
  facade: [0, 3.0, 12, 0, 9.5, 34, 62],            // 정면 안쪽 벽(오큘러스 3)
  balcony: [2.2, 3.0, 24, -3.8, 12.8, 8, 60],      // 신랑 벽 발코니 띠
};

export async function shots(o) {
  const { out, views = Object.keys(VIEWS), size = '800x450', root = path.resolve(here, '../../assets/church'), devglass = false, church = 'florence', hour = 11, jpg = 0, prefix = '', extra = '' } = o;
  const [W, H] = size.split('x').map(Number);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  const q = new URLSearchParams({ church, autotier: '0', msaa: '0', frames: '5', solo: '1', hideui: '1', hour: String(hour) });
  if (devglass) q.set('devglass', '1');
  await page.goto('file://' + root + '/test.html?' + q.toString() + extra);
  await page.waitForFunction(() => window.__church && window.__church.world, null, { timeout: 180000, polling: 500 });
  await page.waitForFunction(() => window.__church && window.__church.done, null, { timeout: 900000, polling: 500 });
  await page.evaluate(() => {
    window.__florenceTilt = 0;
    const A = window.__church;
    window.__snap = async (v, n) => {
      const cam = A.camera;
      if (A.meAv && A.meAv.group) A.meAv.group.visible = false;
      if (A.markers && A.markers.items) A.markers.items.forEach((it) => { ['ring', 'sp', 'hit'].forEach((k2) => { if (it[k2]) it[k2].visible = false; }); });
      A.me.x = v[0]; A.me.z = v[2];
      for (let i = 0; i < (n || 3); i++) {
        A.world.update(i === 0 ? 1 : 0.05, A.t, A.me, cam);
        if (A.place) A.place.update(0.05, A.me, cam);
        cam.fov = v[6] || 62; cam.updateProjectionMatrix();
        cam.position.set(v[0], v[1], v[2]); cam.lookAt(v[3], v[4], v[5]); cam.updateMatrixWorld(true);
        A.R.render(A.scene, cam, 0.05, A.world);
        await new Promise((r) => setTimeout(r, 60));
      }
      const info = A.R.renderer.info;
      return { calls: info.render.calls, tris: info.render.triangles };
    };
  });
  const res = {};
  for (const name of views) {
    const v = VIEWS[name]; if (!v) { console.log('unknown view ' + name); continue; }
    const r = await page.evaluate(({ v, n }) => window.__snap(v, n), { v, n: devglass || o.settle ? 8 : 3 });
    const file = path.join(out, prefix + name + (jpg ? '.jpg' : '.png'));
    await page.screenshot(jpg ? { path: file, type: 'jpeg', quality: jpg } : { path: file });
    res[name] = r;
    console.log(name.padEnd(10), JSON.stringify(r), file);
  }
  const stats = await page.evaluate(() => ({ world: window.__church.world.stats, dev: window.ChurchDevGlass ? window.ChurchDevGlass.debug().summary : null,
    place: window.__church.place && window.__church.place.debug ? (() => { try { const d = window.__church.place.debug(); return { slots: d.slots && d.slots.length, stats: d.stats }; } catch (e) { return String(e); } })() : null }));
  console.log('stats', JSON.stringify(stats), errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
  await browser.close();
  return { res, stats, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === '--out') o.out = a[++i]; else if (k === '--views') o.views = a[++i].split(','); else if (k === '--size') o.size = a[++i]; else if (k === '--root') o.root = path.resolve(a[++i]);
    else if (k === '--devglass') o.devglass = true; else if (k === '--church') o.church = a[++i]; else if (k === '--hour') o.hour = +a[++i]; else if (k === '--jpg') o.jpg = +a[++i];
    else if (k === '--prefix') o.prefix = a[++i]; else if (k === '--settle') o.settle = true; else if (k === '--extra') o.extra = a[++i];
  }
  if (!o.out) { console.error('--out <dir> 가 필요하다'); process.exit(2); }
  const r = await shots(o);
  process.exit(r.errors.length ? 1 : 0);
}
