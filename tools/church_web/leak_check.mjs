// 성당 입·퇴장 반복 누수 검사(PERF_SCALE.md §4 '30분 누수') — `node --test` 밖, 헤드리스.
// 사용: node tools/church_web/leak_check.mjs [--rounds 3] [--churches stpeter,milan,florence,stpaul]
// 성당을 차례로 바꾸기를 rounds 번 되풀이하고, 같은 성당으로 돌아왔을 때 GL 질감·지오메트리 수, 셰이더 프로그램 수, JS 힙(GC 뒤)이 늘지 않는지 본다.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2), o = { rounds: 3, solo: '0', churches: ['stpeter', 'milan', 'florence', 'stpaul'], root: process.env.CHURCH_ROOT || path.resolve(here, '../../assets/church') };
for (let i = 0; i < a.length; i++) { if (a[i] === '--rounds') o.rounds = +a[++i]; else if (a[i] === '--churches') o.churches = a[++i].split(','); else if (a[i] === '--solo') o.solo = '1'; }
// --solo: 혼자 모드 배경 신자 켬. 신자 이름표 질감은 이름별 캐시(avatar.js)라 처음 몇 바퀴는 새 이름만큼 늘어난다(이름 수로 묶인 값, 누수 아님).
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc', '--enable-precise-memory-info'] });
const page = await browser.newPage({ viewport: { width: 240, height: 400 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => { const q = []; let tNow = 0; window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; }; window.__step = (n, dtMs) => { for (let i = 0; i < n; i++) { const cbs = q.splice(0); tNow = (tNow || performance.now()) + dtMs; cbs.forEach((cb) => cb(tNow)); } }; });
await page.goto('file://' + o.root + '/test.html?' + new URLSearchParams({ church: o.churches[0], autotier: '0', quality: 'high', solo: o.solo, hideui: '1' }));
await page.waitForFunction(() => window.__church && window.__church.world, null, { timeout: 180000, polling: 200 });
async function settle() {
  for (let i = 0; i < 40; i++) {
    const ok = await page.evaluate(() => { __step(2, 50); const d = __church.place && __church.place.debug(); return !d || d.pending === 0; });
    if (ok && i > 3) break;
    await page.waitForTimeout(200);
  }
}
async function snap() {
  return page.evaluate(() => { if (window.gc) { gc(); gc(); } const r = __church.renderer.info; return { tex: r.memory.textures, geo: r.memory.geometries, progs: r.programs.length, heap: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : -1, church: __church.church }; });
}
await settle();
const rows = [];
for (let r = 0; r < o.rounds; r++) {
  for (const id of o.churches) {
    await page.evaluate((id) => ChurchAPI.setChurch({ church: id }), id);
    await settle();
    const s = await snap(); s.round = r; rows.push(s);
    console.log(JSON.stringify(s));
  }
}
// 판정: 마지막 바퀴와 첫 바퀴(같은 성당)의 차이
const bad = [];
for (const id of o.churches) {
  const f = rows.find((x) => x.church === id && x.round === 0), l = rows.filter((x) => x.church === id).pop();
  const d = { church: id, tex: l.tex - f.tex, geo: l.geo - f.geo, progs: l.progs - f.progs, heapMB: +(l.heap - f.heap).toFixed(1) };
  console.log('delta', JSON.stringify(d));
  if (d.tex > 0 || d.geo > 4 || d.heapMB > 8) bad.push(d);
}
console.log(bad.length ? 'LEAK? ' + JSON.stringify(bad) : 'no growth across rounds', errors.length ? 'errors: ' + errors.slice(0, 3).join(' | ') : '');
await browser.close();
