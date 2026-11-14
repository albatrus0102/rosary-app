// 전례 시기 장식 스크린샷(SPEC §33, docs/church/LITURGICAL_DECOR.md).
// 사용: node tools/church_web/liturgy_shots.mjs --out <폴더> [--churches stpeter,milan,basic] [--seasons advent,christmas,lent,easter,ordinary,souls]
//        [--hour 11] [--quality high|low] [--size 800x600] [--sheet]   (--sheet: 성당별 모음 이미지 <id>_sheet.png 도 만든다)
// 시기 이름 'none' 은 장식 없음(비교용). 'advent3' 처럼 숫자를 붙이면 대림 주차, 'pentecost'·'goodfriday'·'allsaints' 도 된다.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../assets/church');

// 제대 부근을 보는 카메라(서 있는 자리 x,z / yaw / pitch / zoom)
export const CAMS = {
  basic: { pos: [0, -12.6], pitch: 13, zoom: 1.0 },
  florence: { pos: [0, -12.2], pitch: 13, zoom: 1.0 },
  lateran: { pos: [0, -4.2], pitch: 13, zoom: 1.1 },
  maggiore: { pos: [0, -13.4], pitch: 13, zoom: 1.1 },
  milan: { pos: [0, -13.6], pitch: 13, zoom: 1.0 },
  myeongdong: { pos: [0, -7.8], pitch: 13, zoom: 1.0 },
  stpaul: { pos: [0, -11.6], pitch: 13, zoom: 1.1 },
  stpeter: { pos: [0, -1.6], pitch: 13, zoom: 1.1 }
};

// 시기 이름 → setLiturgy 인자
export function seasonArgs(name) {
  const m = /^advent(\d)$/.exec(name);
  if (m) return { season: 'advent', color: +m[1] === 3 ? 'rose' : 'violet', week: +m[1] };
  switch (name) {
    case 'none': return { season: 'none' };
    case 'advent': return { season: 'advent', color: 'violet', week: 2 };
    case 'christmas': return { season: 'christmas', color: 'white' };
    case 'lent': return { season: 'lent', color: 'violet' };
    case 'goodfriday': return { season: 'triduum', color: 'red' };
    case 'easter': return { season: 'easter', color: 'white' };
    case 'pentecost': return { season: 'easter', color: 'red', feast: 'pentecost' };
    case 'ordinary': return { season: 'ordinary', color: 'green' };
    case 'souls': return { season: 'ordinary', color: 'violet', memorial: true };
    case 'allsaints': return { season: 'ordinary', color: 'white', memorial: true, feast: 'allSaints' };
    default: throw new Error('unknown season ' + name);
  }
}

export async function shootAll(o) {
  const { out, churches, seasons, hour = 11, quality = 'high', size = '800x600', sheet = false, cams = CAMS } = o;
  const [w, h] = size.split('x').map(Number);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const res = [];
  for (const id of churches) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    const c = cams[id] || { pos: [0, 0], pitch: 13, zoom: 1 };
    const q = new URLSearchParams({ church: id, autotier: '0', msaa: '0', hideui: '1', frames: '6', hour: String(hour), quality, x: String(c.pos[0]), z: String(c.pos[1]), yaw: String(c.yaw || 0), pitch: String(c.pitch), zoom: String(c.zoom), markers: '0' });
    await page.goto('file://' + root + '/test.html?' + q.toString());
    await page.waitForFunction(() => window.__church && window.__church.world && window.__church.done, null, { timeout: 900000 });
    await page.evaluate(() => { window.__church.meAv.root.visible = false; });
    const files = [];
    for (const s of seasons) {
      // 그리기 고리는 몇 프레임 뒤 멈춘다(멈춘 화면을 찍는다). setLiturgy 가 고리를 다시 깨운다.
      await page.evaluate((a) => { const A = window.__church; A.maxFrames = A.frameCount + 5; A.done = false; window.ChurchAPI.setLiturgy(a); }, seasonArgs(s));
      await page.waitForFunction(() => window.__church.done, null, { timeout: 900000 });
      const info = await page.evaluate(() => {
        const A = window.__church, ri = A.renderer.info;
        return { calls: ri.render.calls, tris: ri.render.triangles, lit: A.liturgy ? A.liturgy.stats() : null };
      });
      const file = path.join(out, `${id}_${s}${quality === 'low' ? '_low' : ''}.png`);
      await page.screenshot({ path: file });
      files.push(file);
      res.push({ id, season: s, file, ...info, errors: errors.slice() });
    }
    if (sheet) {
      const sp = await browser.newPage({ viewport: { width: w * 3 / 2, height: Math.ceil(seasons.length / 3) * (h / 2 + 22) } });
      const html = '<body style="margin:0;background:#111;color:#fff;font:14px sans-serif;display:grid;grid-template-columns:repeat(3,1fr)">' +
        files.map((f, i) => `<div><div style="padding:2px 6px">${id} · ${seasons[i]}</div><img src="file://${f}" style="width:100%;display:block"></div>`).join('') + '</body>';
      await sp.setContent(html); await sp.waitForLoadState('load');
      await sp.screenshot({ path: path.join(out, `${id}_sheet${quality === 'low' ? '_low' : ''}.png`) });
      await sp.close();
    }
    await page.close();
  }
  await browser.close();
  return res;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), o = { churches: ['stpeter', 'milan', 'basic'], seasons: ['advent', 'christmas', 'lent', 'easter', 'ordinary', 'souls'] };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === '--out') o.out = a[++i]; else if (k === '--churches') o.churches = a[++i].split(','); else if (k === '--seasons') o.seasons = a[++i].split(',');
    else if (k === '--hour') o.hour = +a[++i]; else if (k === '--quality') o.quality = a[++i]; else if (k === '--size') o.size = a[++i]; else if (k === '--sheet') o.sheet = true;
  }
  if (!o.out) { console.error('--out <폴더> 가 필요합니다'); process.exit(2); }
  const res = await shootAll(o);
  let bad = 0;
  for (const r of res) { console.log(r.id, r.season, 'calls', r.calls, 'tris', r.tris, JSON.stringify(r.lit), r.errors.length ? 'ERRORS ' + r.errors.join(' | ') : ''); bad += r.errors.length; }
  process.exit(bad ? 1 : 0);
}
