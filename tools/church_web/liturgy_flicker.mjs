// 전례 시기 장식의 깜빡임(z-fighting) 검사: flicker.mjs 의 방법 그대로(깊이 비교를 Less ↔ LessEqual 로 번갈아 그려 같은 깊이로 뭉개진 면을 찾는다),
// 제대 부근 시점에서 장식 없음과 시기별 장식을 잰다. 장식이 있을 때 최악 블록이 기준(THRESH)을 넘으면 실패.
// 사용: node tools/church_web/liturgy_flicker.mjs [church ...] [--seasons christmas,lent,easter,souls] [--out dir]   (기본 basic milan)
import { createRequire } from 'node:module';
import { measure, THRESH } from './flicker.mjs';
import { CAMS, seasonArgs } from './liturgy_shots.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const a = process.argv.slice(2), ids = [];
let seasons = ['none', 'christmas', 'lent', 'easter', 'souls'], out = null;
for (let i = 0; i < a.length; i++) { if (a[i] === '--seasons') seasons = ['none', ...a[++i].split(',')]; else if (a[i] === '--out') out = a[++i]; else ids.push(a[i]); }
if (!ids.length) ids.push('basic', 'milan');
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let bad = 0;
for (const id of ids) {
  const c = CAMS[id];
  for (const s of seasons) {
    // measure() 가 만드는 페이지에 시기를 미리 넣는다(성당을 불러올 때 그 시기대로 짓는다)
    const wrapped = { newPage: async (o) => { const p = await browser.newPage(o); await p.addInitScript((args) => { const t = setInterval(() => { if (window.ChurchLiturgy) { clearInterval(t); window.ChurchLiturgy.set(args); } }, 10); }, seasonArgs(s)); return p; } };
    const { res, errors } = await measure(wrapped, id, { frames: 8, size: '640x360', out: out ? `${out}/${s}` : null, views: [{ tag: 'altar', x: c.pos[0], z: c.pos[1], yaw: 0, pitch: c.pitch, hour: 11 }] });
    for (const r of res) {
      const ok = r.worst.mean <= THRESH;
      console.log(`${id.padEnd(11)} ${s.padEnd(10)} mean ${r.mean}  worst block ${r.worst.mean} @(${r.worst.bx},${r.worst.by})  over24 ${r.over24}  ${ok ? 'ok' : 'FLICKER'}${errors.length ? '  ERRORS ' + errors.join(' | ') : ''}`);
      if (!ok || errors.length) bad++;
    }
  }
}
await browser.close();
process.exit(bad ? 1 : 0);
