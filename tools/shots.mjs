// 사진 10장(장면 확인용): node tools/shots.mjs [출력 폴더=docs/shots] [--size 960x540]
// 외관 낮 · 외관 밤 · 실내 · 앉은 시점 · 마당 그네에 나란히 앉은 두 사람 · 걷는 두 사람 · 화단 가까이 · 커피 카운터와 바리스타 · 책상 위 라떼 · 손에 든 아이스 커피. 장면마다 정해진 프레임 수만큼 그린 뒤 찍는다(느린 소프트웨어 렌더에서도 같은 그림). deviceScaleFactor 1, 소프트웨어 렌더(swiftshader) — 기기보다 느리지만 그림은 같다.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const outDir = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : path.join(here, '../docs/shots'));
const si = args.indexOf('--size'), [W, H] = (si >= 0 ? args[si + 1] : '960x540').split('x').map(Number);
fs.mkdirSync(outDir, { recursive: true });
const SHOTS = [
  { name: 'exterior-day', q: 'thumb=0&hour=15.5', frames: 40 },
  { name: 'exterior-night', q: 'thumb=0&hour=21.5', frames: 40 },
  { name: 'interior', q: 'thumb=1&hour=20.5', frames: 40 },
  { name: 'seat-view', q: 'sit=0&hour=20.5', frames: 140 },
  { name: 'yard-swing', q: 'sit=4&peerseat=5&hour=17.6&view=28,8,0.95', frames: 120 },
  { name: 'peers-walking', q: 'peers=2&route=street&hour=16&x=-4.6&z=5.25&yaw=-100&pitch=8&zoom=0.85', frames: 60 },
  { name: 'flower-bed', q: 'thumb=2&hour=16.5', frames: 40 },
  { name: 'counter-barista', q: 'coffee=americano&hour=19&x=0.7&z=0.55&yaw=-90&pitch=6&zoom=0.75&camturn=28', frames: 90 },
  { name: 'seat-latte', q: 'cup=latte&sit=0&hour=19&view=118,20,0.55', frames: 140 },
  { name: 'held-iced', q: 'cup=iced&hour=15&x=0.1&z=1.6&yaw=-20&pitch=4&zoom=0.5&camturn=200', frames: 60 }
];
const oi = args.indexOf('--only'), only = oi >= 0 ? args[oi + 1].split(',') : null;   // --only exterior-day,yard-swing
const { srv, url } = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let bad = 0;
for (const s of SHOTS) {
  if (only && !only.includes(s.name)) continue;
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url + 'test.html?hideui=1&autotier=0&quiet=1&frames=' + s.frames + '&' + s.q);
  await p.waitForFunction(() => (window.__roomEvents || []).some((e) => e.e === 'firstFrame'), null, { timeout: 60000 });
  await p.waitForFunction(() => window.__room && window.__room.done, null, { timeout: 180000 });   // frames=N: N 프레임(카메라 스프링이 자리 잡을 만큼) 그린 뒤 그리기를 멈춘다 → 찍는 동안 페이지가 한가하다
  const file = path.join(outDir, s.name + '.jpg');   // JPEG 90: 6장 합계 3 MB 아래
  await p.screenshot({ path: file, type: 'jpeg', quality: 90, timeout: 60000 });
  const info = await p.evaluate(() => { const a = window.__room, r = a.R.renderer.info.render; return { calls: r.calls, tris: r.triangles, mode: a.me.mode, peers: a.net.visibleCount() }; });
  console.log(s.name, JSON.stringify(info), errs.length ? 'ERR ' + errs.join(' | ') : 'ok');
  if (errs.length) bad++;
  await p.close();
}
await b.close(); srv.close();
process.exit(bad ? 1 : 0);
