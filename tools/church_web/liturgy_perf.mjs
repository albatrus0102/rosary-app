// 전례 시기 장식의 비용(SPEC §33): 장식 없음 ↔ 시기별 장식을 같은 페이지에서 번갈아 그려 그리기 호출·삼각형·프레임 시간(헤드리스 소프트웨어 GL)을 비교하고,
// 시기를 모두 돌린 뒤 지오메트리·텍스처 수가 처음으로 돌아오는지(누수 없음) 본다.
// 사용: node tools/church_web/liturgy_perf.mjs [--churches basic,stpeter,milan] [--quality high|mid|low] [--frames 30] [--rounds 3] [--root <자산 폴더>]
// 헤드리스 fps 는 실기기와 다르다: 여기서는 '장식 전/후의 상대 차이'만 본다.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAMS, seasonArgs } from './liturgy_shots.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(k); return i < 0 ? d : a[i + 1]; };
const churches = opt('--churches', 'basic,stpeter,milan').split(','), quality = opt('--quality', 'high');
const frames = +opt('--frames', 30), rounds = +opt('--rounds', 3), root = path.resolve(opt('--root', path.resolve(here, '../../assets/church')));
const SEASONS = ['advent', 'christmas', 'lent', 'easter', 'ordinary', 'souls'];
const median = (v) => { const s = v.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
let bad = 0;
for (const id of churches) {
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  const c = CAMS[id] || { pos: [0, 0], pitch: 13, zoom: 1 };
  const q = new URLSearchParams({ church: id, autotier: '0', msaa: '0', hideui: '1', frames: '6', hour: '11', quality, x: String(c.pos[0]), z: String(c.pos[1]), yaw: '0', pitch: String(c.pitch), zoom: String(c.zoom), markers: '0' });
  await page.goto('file://' + root + '/test.html?' + q.toString());
  await page.waitForFunction(() => window.__church && window.__church.world && window.__church.done, null, { timeout: 900000 });
  // n 프레임을 그리고 평균 프레임 시간(ms)·그리기 호출·삼각형을 돌려준다
  const run = async (args) => {
    await page.evaluate(([args2, n]) => { const A = window.__church; window.__t0 = performance.now(); A.maxFrames = A.frameCount + n; A.done = false; window.ChurchAPI.setLiturgy(args2); }, [args, frames]);
    await page.waitForFunction(() => window.__church.done, null, { timeout: 900000 });
    return page.evaluate((n) => { const A = window.__church, ri = A.renderer.info; return { ms: (performance.now() - window.__t0) / n, calls: ri.render.calls, tris: ri.render.triangles, geo: ri.memory.geometries, tex: ri.memory.textures, stats: A.liturgy.stats() }; }, frames);
  };
  await run(seasonArgs('none'));   // 데우기
  const base0 = await run(seasonArgs('none'));
  console.log(`== ${id} (${quality})  장식 없음: calls ${base0.calls} tris ${base0.tris} geometries ${base0.geo} textures ${base0.tex}`);
  for (const s of SEASONS) {
    const off = [], on = [];
    let r1 = null;
    for (let i = 0; i < rounds; i++) { off.push((await run(seasonArgs('none'))).ms); r1 = await run(seasonArgs(s)); on.push(r1.ms); }
    const mo = median(off), mn = median(on), d = (mn - mo) / mo * 100;
    console.log(`${s.padEnd(10)} calls +${String(r1.calls - base0.calls).padStart(2)}  tris +${String(r1.tris - base0.tris).padStart(5)}  물체 ${r1.stats.calls} 정점 ${String(r1.stats.verts).padStart(5)}  frame ${mo.toFixed(1)} → ${mn.toFixed(1)} ms (${d >= 0 ? '+' : ''}${d.toFixed(1)}%)`);
    if (r1.calls - base0.calls > 8) { console.log('  !! 그리기 호출 예산(+8) 초과'); bad++; }
  }
  const end = await run(seasonArgs('none'));
  const leak = end.geo - base0.geo || end.tex - base0.tex;
  console.log(`해제 뒤: geometries ${end.geo} (${end.geo - base0.geo >= 0 ? '+' : ''}${end.geo - base0.geo}) textures ${end.tex} (${end.tex - base0.tex >= 0 ? '+' : ''}${end.tex - base0.tex})${leak ? '  !! 누수' : '  누수 없음'}`);
  if (leak) bad++;
  if (errors.length) { console.log('ERRORS ' + errors.join(' | ')); bad++; }
  await page.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
