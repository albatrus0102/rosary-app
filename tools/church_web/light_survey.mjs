// 성당 화면 밝기 측정(밝기 띠 비교): 시점마다 화면 휘도의 평균·백분위를 재고 그림을 남긴다. `node --test` 에는 넣지 않는다(헤드리스 swiftshader, 수 분).
// 사용: node tools/church_web/light_survey.mjs <출력 폴더> [성당 ...] [--hours 11,22] [--tiers high,mid] [--size 360x800] [--views a,b] [--tag 이름]
//   -> <출력>/<tag>_<성당>_<시점>_h<시>_<단계>.jpg + <출력>/<tag>_lum.json (행: 성당·시점·시·단계·평균·p10·p50·p90·p99·draw call·삼각형·점광원 수)
//   CHURCH_ROOT=<assets 사본> 으로 '이전' 사본을 잰다. 휘도 = sRGB 화소의 Rec.709 휘도(0..255, 감마 그대로 — 사람이 보는 밝기에 가깝다) + 선형 평균(lin).
// 시점: 카메라를 직접 놓는다(아바타 숨김). 여러 층 성당은 setViewer 로 그 층을 그린다. 기준 성당은 스폰 → 제대 쪽 신랑·제대 앞 두 시점.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.CHURCH_ROOT || path.resolve(here, '../../assets/church');

const YU = 10.2, YL = 3.6;
// 아시시: 층마다 (assisi_shots.mjs 와 같은 자리, 휴대폰 세로 화면)
export const VIEWS = {
  assisi: {
    upper_nave: { pos: [0, YU + 1.7, 26.0], look: [0, YU + 3.4, -6], fov: 58, fy: YU },
    upper_apse: { pos: [0, YU + 1.7, 3.2], look: [0, YU + 3.0, -11], fov: 60, fy: YU },
    lower_nave: { pos: [0, YL + 1.6, 22.5], look: [0, YL + 1.6, -6], fov: 62, fy: YL },
    lower_altar: { pos: [-1.6, YL + 1.6, 3.0], look: [0, YL + 1.2, -4.5], fov: 60, fy: YL },
    crypt: { pos: [0, 1.55, 0.9], look: [0, 1.0, -3.75], fov: 66, fy: 0 },
    stair_up: { pos: [4.9, YL + 1.6, -6.4], look: [4.9, YL + 4.5, -16], fov: 62, fy: YL },
    stair_crypt: { pos: [1.8, 2.8 + 1.5, 9.6], look: [1.8, 0.8, 3.0], fov: 62, fy: 2.8 }
  }
};
function defaultViews(L) {
  const b = L.bounds, s = L.spawn, zN = (b.z0 + b.z1) / 2 + (b.z1 - b.z0) * 0.1, zA = b.z0 + (b.z1 - b.z0) * 0.22, fy = s.y || 0;
  return {
    nave: { pos: [0, fy + 1.8, zN + 2.8], look: [0, fy + 2.4, zN - 12], fov: 58, fy },
    altar: { pos: [0, fy + 1.8, zA + 2.8], look: [0, fy + 2.2, zA - 12], fov: 58, fy }
  };
}

async function run(outDir, ids, o) {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const rows = [];
  const [W, H] = o.size.split('x').map(Number);
  for (const tier of o.tiers) {
    for (const id of ids) {
      const t0 = Date.now();
      const page = await browser.newPage({ viewport: { width: W, height: H } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const q = new URLSearchParams({ church: id, autotier: '0', msaa: '0', quality: tier, solo: '1', hideui: '1', markers: '0', hour: String(o.hours[0]), frames: '30' });
      await page.goto('file://' + root + '/test.html?' + q.toString());
      await page.waitForFunction(() => window.__church && window.__church.done, null, { timeout: 900000, polling: 500 });
      await page.waitForTimeout(800);
      const L = await page.evaluate(() => ({ bounds: __church.world.layout.bounds, spawn: __church.world.layout.spawn }));
      const views = VIEWS[id] || defaultViews(L);
      const names = o.views ? o.views.filter((v) => views[v]) : Object.keys(views);
      for (const vn of names) for (const hour of o.hours) {
        const res = await page.evaluate(([v, hour]) => {
          const A = window.__church, cam = A.camera;
          if (A.crowd && A.crowd.set) A.crowd.set(false);
          A.meAv.root.visible = false;
          A.scene.traverse((ob) => { if (ob.userData && ob.userData.isAvatar) ob.visible = false; });
          A.world.setHour(hour);
          A.me.x = v.pos[0]; A.me.z = v.pos[2]; A.me.y = v.fy; A.me.fy = v.fy;
          cam.fov = v.fov; cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
          cam.position.set(v.pos[0], v.pos[1], v.pos[2]); cam.lookAt(v.look[0], v.look[1], v.look[2]); cam.updateMatrixWorld();
          if (A.world.setViewer) A.world.setViewer(v.fy);
          // 층 노출(있으면)이 따라오도록 몇 초 분량을 돌린다(world.update 는 시간 상수로 섞는다)
          for (let i = 0; i < 40; i++) A.world.update(1 / 10, A.t + i / 10, A.me, cam);
          let calls = 0, tris = 0;
          for (let i = 0; i < 6; i++) {
            A.world.update(1 / 30, A.t + 4 + i / 30, A.me, cam);
            if (A.world.probeStep) { try { A.world.probeStep(A.renderer); } catch (e) { /* ignore */ } }
            A.R.setExposure(A.world.env.exp * (A.expK || 1));
            if (A.R.setGrade) A.R.setGrade(A.world.env.grade);
            A.R.render(A.scene, cam, 1 / 30, A.world);
            const r = A.renderer.info.render; calls = r.calls; tris = r.triangles;
          }
          const c = A.renderer.domElement, cv = document.createElement('canvas');
          cv.width = c.width; cv.height = c.height;
          A.R.render(A.scene, cam, 1 / 30, A.world);
          const g = cv.getContext('2d'); g.drawImage(c, 0, 0);
          const d = g.getImageData(0, 0, cv.width, cv.height).data, hist = new Float64Array(256);
          let s = 0, sl = 0, n = 0;
          const lin = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
          for (let i = 0; i < d.length; i += 4) {
            const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
            hist[Math.min(255, Math.round(y))]++; s += y; n++;
            sl += 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
          }
          const pct = (p) => { let acc = 0; for (let k = 0; k < 256; k++) { acc += hist[k]; if (acc >= p * n) return k; } return 255; };
          let pl = 0; A.scene.traverse((ob) => { if (ob.isPointLight && ob.visible && ob.intensity > 0) pl++; });
          return { mean: +(s / n).toFixed(1), lin: +(sl / n).toFixed(4), p10: pct(0.1), p50: pct(0.5), p90: pct(0.9), p99: pct(0.99), clip: +(hist[255] / n * 100).toFixed(2), calls, tris, pointLights: pl, exp: +A.world.env.exp.toFixed(3), lv: A.world.levelKey ? A.world.levelKey() : '', url: cv.toDataURL('image/jpeg', 0.86) };
        }, [views[vn], hour]);
        const file = path.join(outDir, `${o.tag}_${id}_${vn}_h${hour}_${tier}.jpg`);
        fs.writeFileSync(file, Buffer.from(res.url.split(',')[1], 'base64'));
        delete res.url;
        const row = { id, view: vn, hour, tier, ...res };
        rows.push(row);
        console.log(JSON.stringify(row));
      }
      if (errors.length) console.log('page errors', id, errors.join(' | '));
      console.log('done', id, tier, ((Date.now() - t0) / 1000).toFixed(0) + 's');
      await page.close();
    }
  }
  await browser.close();
  return rows;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), ids = [];
  const o = { hours: [11, 22], tiers: ['high', 'mid'], size: '360x800', views: null, tag: 'run' };
  const outDir = a.shift();
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--hours') o.hours = a[++i].split(',').map(Number); else if (a[i] === '--tiers') o.tiers = a[++i].split(',');
    else if (a[i] === '--size') o.size = a[++i]; else if (a[i] === '--views') o.views = a[++i].split(','); else if (a[i] === '--tag') o.tag = a[++i];
    else ids.push(a[i]);
  }
  if (!ids.length) ids.push('assisi');
  fs.mkdirSync(outDir, { recursive: true });
  const rows = await run(outDir, ids, o);
  fs.writeFileSync(path.join(outDir, o.tag + '_lum.json'), JSON.stringify(rows, null, 1));
}
