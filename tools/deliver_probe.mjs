// 자리로 가져다 주기 재기(실제 페이지, 그리기 끔): 좌석마다 바로 앉힌 뒤(sit {now}) setMyCup(kind) → 바리스타가 만들고 → 길 따라 가져다 놓고 → 돌아간다.
// 판정: coffeeReady{kind, seat} 가 컵을 놓는 순간 한 번(만들기 시간 뒤), coffeePicked 없음, 바리스타가 충돌체(바리스타 통로 제외)에 0.05 m 넘게 파고들지 않음,
// 끝나면 집(home) 0.3 m 안. --leave 면 배달 중에 일어서서 다른 곳으로 걸어가도 컵이 그 좌석 자리에 놓이는지.
// 사용: node tools/deliver_probe.mjs [--seats 0,3,4] [--leave] [--shot out.png(그네 가는 길 한 장)]
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SEATS = opt('--seats', '0,1,2,3,4,5').split(',').map(Number), LEAVE = args.includes('--leave');
const { srv, url } = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 320, height: 180 }, deviceScaleFactor: 1 });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(url + 'test.html?hideui=1&autotier=0&quiet=1&quality=low&markers=0');
await p.waitForFunction(() => window.__room && window.__room.world && window.__room.coffee, null, { timeout: 90000 });
const res = await p.evaluate(async ({ SEATS, LEAVE }) => {
  const A = window.__room, L = A.logic, C = A.coffee, bar = C.barista, lay = A.world.layout, bc = lay.coffee.barista;
  A.R.render = function () { return null; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const hm0 = lay.coffee.home, cols = L.colliders.filter((c) => !(c.k === 0 && hm0.x > c.x0 && hm0.x < c.x1 && hm0.z > c.z0 && hm0.z < c.z1));
  function pen(x, z, r) {
    let m = 0;
    for (const c of cols) {
      let d;
      if (c.k === 1) d = c.r + r - Math.hypot(x - c.x, z - c.z);
      else if (c.k === 0) { const cx = Math.max(c.x0, Math.min(c.x1, x)), cz = Math.max(c.z0, Math.min(c.z1, z)); d = (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) ? r + 1 : r - Math.hypot(x - cx, z - cz); }
      else continue;
      if (d > m) m = d;
    }
    return m;
  }
  const out = [];
  for (const i of SEATS) {
    if (A.me.mode !== 'walk') { window.Room3D.stand(); await wait(1800); }
    window.Room3D.sit({ i, now: true }); await wait(200);
    const ev = []; const h = (e) => { if (/coffee|barista/.test(e.e)) ev.push({ e: e.e, seat: e.seat, kind: e.kind, t: performance.now() }); };
    window.Room3D.on(h);
    const t0 = performance.now();
    window.Room3D.setMyCup({ kind: 'latte' });
    let worst = null, maxPen = 0, path = 0, last = null, readyT = -1, leftT = -1, st = '';
    for (let k = 0; k < 900; k++) {
      await wait(50);
      const js = C.jobState(); st = js ? js.st : 'none';
      const bp = bar.root.position;
      if (js && js.st !== 'brew') { const pv = pen(bp.x, bp.z, 0.17); if (pv > maxPen) { maxPen = pv; worst = [+bp.x.toFixed(2), +bp.z.toFixed(2), js.st]; } if (last) path += Math.hypot(bp.x - last.x, bp.z - last.z); last = { x: bp.x, z: bp.z }; }
      if (readyT < 0 && ev.some((e) => e.e === 'coffeeReady')) readyT = (performance.now() - t0) / 1000;
      if (LEAVE && leftT < 0 && js && js.st === 'go') { window.Room3D.stand(); leftT = (performance.now() - t0) / 1000; }
      if (!js && readyT >= 0) break;
    }
    window.Room3D.off && window.Room3D.off(h);
    const hm = lay.coffee.home, bp = bar.root.position, cs = C.state();
    out.push({ i, readyT: +readyT.toFixed(2), events: ev.map((e) => e.e + (e.seat !== undefined ? ':' + e.seat : '')), maxPen: +maxPen.toFixed(3), path: +path.toFixed(1), homeDist: +Math.hypot(bp.x - hm.x, bp.z - hm.z).toFixed(2), cup: cs.where + (cs.seat !== undefined ? ':' + cs.seat : ''), leftT, worst });
    window.Room3D.setMyCup({ kind: null });
  }
  return out;
}, { SEATS, LEAVE });
let fail = 0;
console.log('좌석 | coffeeReady(s) | 이벤트 | 바리스타 파고듦(m) | 걸은 길(m) | 집까지(m) | 컵');
for (const r of res) {
  const bad = [];
  if (r.readyT < 2.9) bad.push('너무 빠름');
  if (r.events.filter((e) => e.startsWith('coffeeReady')).length !== 1 || !r.events.includes('coffeeReady:' + r.i)) bad.push('coffeeReady');
  if (r.events.some((e) => e.startsWith('coffeePicked'))) bad.push('coffeePicked');
  if (r.maxPen > 0.05) bad.push('충돌');
  if (r.homeDist > 0.3) bad.push('안 돌아감');
  if (!r.cup.startsWith('spot:' + r.i) && !(LEAVE && r.cup.startsWith('spot:' + r.i))) bad.push('컵 자리');
  if (bad.length) fail++;
  console.log([r.i, r.readyT, r.events.join(' '), r.maxPen + (r.worst ? '@' + r.worst.join(',') : ''), r.path, r.homeDist, r.cup, bad.join(',') || 'OK'].join(' | '));
}
if (errs.length) { console.log('ERRORS', errs.slice(0, 5)); fail++; }
await b.close(); srv.close();
process.exit(fail ? 1 : 0);
