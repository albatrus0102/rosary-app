// web_demo/e2e.mjs — 빌드한 데모를 헤드리스 Chromium(Playwright)으로 열어 점검한다(콘솔 오류 0 필수).
//   node web_demo/e2e.mjs --out <캡처 폴더> [--cases ko:danggogae,it:stpeter:phone] [--dir build/web_demo] [--tour]
// 사례 = lang:church[:phone]. 시작 화면 → (둘러보기 | 직접 걸어 보기) → 중간 캡처. 헤드리스 swiftshader 라 느리다.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const DIR = path.resolve(opt('--dir', path.join(here, '../build/web_demo')));
const OUT = path.resolve(opt('--out', '/tmp/web_demo_shots'));
const CASES = opt('--cases', 'ko:danggogae,it:stpeter').split(',').map((s) => { const [lang, church, dev] = s.split(':'); return { lang, church, phone: dev === 'phone' }; });
const TOUR_MS = +opt('--tour-ms', '260000');
const QUAL = opt('--q', '');   // low|mid|high: 링크에 ?q= 를 붙여 화질을 정한다(소프트웨어 렌더링에서 느림 경고를 줄일 때)
fs.mkdirSync(OUT, { recursive: true });

// 링크 파일에서 (lang, church) 에 맞는 토큰을 찾는다
const links = fs.readFileSync(DIR + '_links.txt', 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t'));
const tokenOf = (lang, church) => { const r = links.find((l) => l[1] === church && l[2] === lang); if (!r) throw new Error('링크 없음 ' + lang + ':' + church); return r[3]; };

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.json': 'application/json', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIR, p);
  if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, { 'content-type': 'text/html' }); res.end(fs.readFileSync(path.join(DIR, '404.html'))); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
let fail = 0;
const check = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!c) fail++; };

for (const c of CASES) {
  const tag = c.lang + '_' + c.church + (c.phone ? '_phone' : '');
  const ctx = await browser.newContext(c.phone
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }
    : { viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', (r) => errors.push('requestfailed ' + r.url()));
  page.on('response', (r) => { if (r.status() >= 400) errors.push('http ' + r.status() + ' ' + r.url()); });
  const t0 = Date.now();
  await page.goto(base + tokenOf(c.lang, c.church) + (QUAL ? '?q=' + QUAL : ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.DemoShell && window.DemoShell.ready, null, { timeout: 120000 });
  check(tag + ' scripts loaded', true, { sec: Math.round((Date.now() - t0) / 100) / 10 });
  await page.screenshot({ path: path.join(OUT, tag + '_1start.png'), timeout: 180000 });
  if (!a.includes('--no-tour')) {
    await page.click('#btnTour');
    await page.waitForFunction(() => window.DemoShell.firstFrame, null, { timeout: 180000 });
    check(tag + ' first frame', true, { sec: Math.round((Date.now() - t0) / 100) / 10 });
    await page.waitForFunction(() => window.DemoShell.tour && window.DemoShell.tour.log.some((l) => l[1] === 'vault'), null, { timeout: 150000 }).catch(() => {});
    await page.waitForTimeout(6000);
    await page.screenshot({ path: path.join(OUT, tag + '_2vault.png'), timeout: 180000 });
    // 중간 지점(제대 쪽으로 걷는 중 또는 그 뒤)까지 기다린 뒤 캡처
    await page.waitForFunction(() => (window.__tourMarks || []).length >= 0 && window.DemoShell.tour && window.DemoShell.tour.log.some((l) => l[1] === 'altar'), null, { timeout: 150000 }).catch(() => {});
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(OUT, tag + '_2tour.png'), timeout: 180000 });
    const mid = await page.evaluate(() => ({ cap: document.getElementById('cap').textContent, log: window.DemoShell.tour && window.DemoShell.tour.log }));
    console.log('tour mid', JSON.stringify(mid).slice(0, 400));
    // 끝까지(또는 시간 제한) 기다린다
    const ended = await page.waitForFunction(() => !window.DemoShell.tour, null, { timeout: TOUR_MS }).then(() => true).catch(() => false);
    const log = await page.evaluate(() => window.__tourLog || (window.DemoShell.tour && window.DemoShell.tour.log));
    console.log('tour log', JSON.stringify(log));
    check(tag + ' tour finished', ended);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, tag + '_3free.png'), timeout: 180000 });
  } else {
    await page.click('#btnFree');
    await page.waitForFunction(() => window.DemoShell.firstFrame, null, { timeout: 180000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, tag + '_3free.png'), timeout: 180000 });
  }
  const st = await page.evaluate(() => ({ church: __church.church, mode: __church.me.mode, errs: window.DemoShell.errors.length, fps: Math.round(__church.fps) }));
  console.log('state', JSON.stringify(st));
  check(tag + ' church loaded', st.church === c.church, st);
  // 「render loop restarted」는 장면의 감시 장치가 프레임 하나가 2.5초를 넘길 때 남기는 기록이다. 헤드리스 소프트웨어 렌더링(약 2fps)에서만 난다 — 따로 세고 실패로 치지 않는다.
  const stalls = errors.filter((x) => /stall: render loop restarted/.test(x)), real = errors.filter((x) => !/stall: render loop restarted/.test(x));
  if (stalls.length) console.log('note ' + tag + ' 느린 렌더링 감시 기록 ' + stalls.length + '건(소프트웨어 GL)');
  check(tag + ' no console errors', real.length === 0, real.slice(0, 5));
  await ctx.close();
}
await browser.close(); server.close();
console.log(fail ? 'FAILED ' + fail : 'ALL PASS');
process.exit(fail ? 1 : 0);
