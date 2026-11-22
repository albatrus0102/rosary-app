// 빛 번짐(RENDER_GI.md) 전/후 나란히 비교 — 같은 사본을 ?gi=0(전)과 그대로(후)로 열어 같은 시점을 찍고 한 장(왼쪽 전, 오른쪽 후)으로 붙인다.
// `node --test` 밖(헤드리스 swiftshader 로 수 분). 화면 평균 휘도(선형)도 적는다 — 빛 번짐은 전체 밝기를 바꾸지 않아야 한다(±5% 안).
// 사용: node tools/church_web/gi_shots.mjs <out dir> [성당 ...] [--hours 11,22] [--views nave,altar] [--quality high|mid] [--size 360x800] [--extra gidbg=1]
//   --before <쿼리>: 전 사본의 쿼리(기본 gi=0). CHURCH_ROOT=<assets 사본> 으로 다른 사본도 찍는다.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWS } from './look_shots.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.CHURCH_ROOT || path.resolve(here, '../../assets/church');

function defaultViews(L) {
  const b = L.bounds;
  return {
    nave: { x: 0, z: (b.z0 + b.z1) / 2 + (b.z1 - b.z0) * 0.1, yaw: 0, pitch: 6 },
    altar: { x: 0, z: b.z0 + (b.z1 - b.z0) * 0.22, yaw: 0, pitch: 4, look: 10 },
  };
}

async function shoot(browser, id, query, o) {
  const [W, H] = o.size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (/gi_|gifx/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => {
    const q = []; let tNow = 0;
    window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
    window.__step = (n, dtMs) => { for (let i = 0; i < n; i++) { const cbs = q.splice(0); tNow = (tNow || performance.now()) + dtMs; cbs.forEach((cb) => cb(tNow)); } };
  });
  await page.goto('file://' + root + '/test.html?' + new URLSearchParams({ church: id, autotier: '0', msaa: '0', quality: o.quality, solo: '0', hideui: '1', ...Object.fromEntries(new URLSearchParams(query)) }));
  await page.waitForFunction(() => window.__church && window.__church.world && window.__church.R, null, { timeout: 180000, polling: 500 });
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => !window.__church.place || window.__church.place.debug().pending === 0, null, { timeout: 120000, polling: 250 }).catch(() => {});
  await page.waitForFunction(() => !__church.world.aoPending || !__church.world.aoPending(), null, { timeout: 30000, polling: 100 }).catch(() => {});
  const L = await page.evaluate(() => ({ bounds: __church.world.layout.bounds, spawn: __church.world.layout.spawn, gi: __church.world.giFx ? __church.world.giFx.stats : null }));
  const views = VIEWS[id] || defaultViews(L), out = {};
  for (const vn of o.views) {
    const v = views[vn] || defaultViews(L)[vn];
    for (const hour of o.hours) {
      await page.evaluate(({ v, hour }) => {
        const A = __church, D = Math.PI / 180;
        A.world.setHour(hour);
        A.me.x = v.x; A.me.z = v.z; A.me.y = A.logic.floorY(v.x, v.z);
        A.ctl.yaw = v.yaw * D; A.me.yaw = A.ctl.yaw; A.ctl.pitch = v.pitch * D; A.ctl.look = (v.look || 0) * D; A.ctl.zoom = v.zoom || 1; A.camInit = false;
      }, { v, hour });
      await page.evaluate(() => __step(8, 50));
      out[vn + '_' + hour] = await page.evaluate(() => { const c = document.getElementById('c'), cv = document.createElement('canvas'); cv.width = c.width; cv.height = c.height; __step(1, 16.67); cv.getContext('2d').drawImage(c, 0, 0); return cv.toDataURL('image/png'); });
    }
  }
  await page.close();
  return { shots: out, errors, gi: L.gi };
}

// 두 장을 나란히 + 평균 휘도(선형)
async function compose(browser, a, b, label) {
  const page = await browser.newPage({ viewport: { width: 100, height: 100 } });
  const r = await page.evaluate(async ({ a, b, label }) => {
    const load = (u) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = u; });
    const A = await load(a), B = await load(b), W = A.width, H = A.height;
    const cv = document.createElement('canvas'); cv.width = W * 2 + 8; cv.height = H + 26;
    const g = cv.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(A, 0, 26); g.drawImage(B, W + 8, 26);
    const lumOf = (x0) => { const d = g.getImageData(x0, 26, W, H).data; let s = 0; const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; for (let i = 0; i < d.length; i += 16) s += 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]); return s / (d.length / 16); };
    const la = lumOf(0), lb = lumOf(W + 8);
    g.fillStyle = '#eee'; g.font = '14px sans-serif';
    g.fillText(label + '  전(gi=0) Y=' + la.toFixed(4), 6, 18); g.fillText('후(빛 번짐) Y=' + lb.toFixed(4) + ' (' + ((lb / la - 1) * 100).toFixed(1) + '%)', W + 14, 18);
    return { url: cv.toDataURL('image/png'), la, lb };
  }, { a, b, label });
  await page.close();
  return r;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), ids = [];
  const o = { hours: [11], views: ['nave', 'altar'], quality: 'high', size: '360x800', before: 'gi=0', extra: '' };
  const outDir = a.shift();
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--hours') o.hours = a[++i].split(',').map(Number); else if (a[i] === '--views') o.views = a[++i].split(',');
    else if (a[i] === '--quality') o.quality = a[++i]; else if (a[i] === '--size') o.size = a[++i]; else if (a[i] === '--before') o.before = a[++i];
    else if (a[i] === '--extra') o.extra = a[++i]; else ids.push(a[i]);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const rows = [];
  for (const id of ids) {
    const A = await shoot(browser, id, o.before + (o.extra ? '&' + o.extra : ''), o), B = await shoot(browser, id, o.extra, o);
    for (const k of Object.keys(B.shots)) {
      const c = await compose(browser, A.shots[k], B.shots[k], id + ' ' + k + 'h ' + o.quality);
      const f = path.join(outDir, `${id}_${k.replace('.', '_')}_${o.quality}${o.extra ? '_' + o.extra.replace(/[=&]/g, '') : ''}.png`);
      fs.writeFileSync(f, Buffer.from(c.url.split(',')[1], 'base64'));
      rows.push({ id, view: k, before: +c.la.toFixed(4), after: +c.lb.toFixed(4), pct: +((c.lb / c.la - 1) * 100).toFixed(2) });
      console.log(id, k, 'Y', c.la.toFixed(4), '→', c.lb.toFixed(4), ((c.lb / c.la - 1) * 100).toFixed(1) + '%', f);
    }
    console.log(id, 'gi', JSON.stringify(B.gi), A.errors.concat(B.errors).slice(0, 4).join(' | '));
  }
  fs.writeFileSync(path.join(outDir, 'lum_' + o.quality + '.json'), JSON.stringify(rows, null, 1));
  await browser.close();
}
