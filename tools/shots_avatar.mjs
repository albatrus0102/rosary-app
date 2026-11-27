// 아바타·앉기·배달 사진(docs/shots/av-*.jpg, deviceScaleFactor 1). node tools/shots_avatar.mjs [이름…]
//  row(8명 + 참고 그림 띠) · face-F1 · face-M4(참고 얼굴과 나란히) · desk-read · stool · swing-two · walking · barista-swing
// 참고 그림 폴더: REF_DIR(기본 ../faces — 소유자 F1..F4·M1..M4.png; 없으면 나란히 붙이기를 건너뛴다)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(ROOT, 'docs/shots');
const REF = process.env.REF_DIR || path.resolve(ROOT, '../faces');
const want = process.argv.slice(2);
const { srv, url } = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function page(q, W, H, prep, settle = 1500) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url + q);
  if (prep) await prep(p);
  await p.waitForTimeout(settle);
  return { p, errs };
}
const lab = async (q, W, H) => { const r = await page('avatar_lab.html?' + q, W, H, (p) => p.waitForFunction(() => window.__lab && window.__lab.done, null, { timeout: 240000 }), 300); return r; };
const scene = (q) => page('test.html?hideui=1&autotier=0&quiet=1&quality=mid&me=0&body=human&markers=0&' + q, 960, 540, (p) => p.waitForFunction(() => (window.__roomEvents || []).some((e) => e.e === 'sceneReady'), null, { timeout: 180000 }), 1200);
const wait = (p, fn, ms = 240000) => p.waitForFunction(fn, null, { timeout: ms });
function py(code) { execFileSync('python3', ['-c', code], { stdio: 'inherit' }); }
const jobs = {
  async row() {
    const { p, errs } = await lab('mode=row', 1600, 700); const tmp = path.join(OUT, '_row.png'); await p.screenshot({ path: tmp }); await p.close();
    py(`
from PIL import Image
import os
a=Image.open(${JSON.stringify(tmp)}).convert('RGB'); W=a.width
ids=['F1','F2','F3','F4','M1','M2','M3','M4']; ref=${JSON.stringify(REF)}
strip=Image.new('RGB',(W,330),(201,199,205))
for i,n in enumerate(ids):
  f=os.path.join(ref,n+'.png')
  if os.path.exists(f):
    im=Image.open(f).convert('RGB').crop((300,0,660,1080)).resize((110,330))
    strip.paste(im,(int(W/2+(i-3.5)*0.62*W/(2*6.6*0.26795*W/a.height)-55),0))   # 아바타와 같은 간격(0.62 m 를 화면 px 로)
out=Image.new('RGB',(W,a.height+330)); out.paste(strip,(0,0)); out.paste(a,(0,330)); out.save(${JSON.stringify(path.join(OUT, 'av-row-vs-ref.jpg'))},quality=86)
os.remove(${JSON.stringify(tmp)})`);
    return errs;
  },
  async faceF1() { return face(0, 'F1'); },
  async faceM4() { return face(7, 'M4'); },
  async deskRead() {
    const { p, errs } = await scene('sit=0&sitnow=1&read=1&view=40,14,0.55');
    await p.waitForTimeout(4000); await p.screenshot({ path: path.join(OUT, 'av-desk-read.jpg'), quality: 86 }); await p.close(); return errs;
  },
  async stool() {
    const { p, errs } = await scene('sit=3&sitnow=1&view=-150,10,0.6');
    await p.waitForTimeout(3000); await p.screenshot({ path: path.join(OUT, 'av-stool.jpg'), quality: 86 }); await p.close(); return errs;
  },
  async swingTwo() {
    const { p, errs } = await scene('sit=4&sitnow=1&peerseat=5&peern=6&read=1&view=180,12,0.75');
    await p.waitForTimeout(5000); await p.screenshot({ path: path.join(OUT, 'av-swing-two.jpg'), quality: 86 }); await p.close(); return errs;
  },
  async walking() {
    const { p, errs } = await scene('peers=2&route=street&thumb=0&hour=15');
    await p.waitForTimeout(5000); await p.screenshot({ path: path.join(OUT, 'av-walking.jpg'), quality: 86 }); await p.close(); return errs;
  },
  async baristaSwing() {
    const { p, errs } = await scene('sit=4&sitnow=1&view=150,18,1.25');
    await p.evaluate(() => { const A = window.__room; A.R.render = A.R.render; window.Room3D.setMyCup({ kind: 'latte' }); });
    // 바리스타가 마당에 들어와 그네 탁자로 가는 중(go, 탁자 4 m 안)
    await wait(p, () => { const j = window.__room.coffee.jobState(); return j && j.st === 'go' && Math.hypot(j.x + 6.07, j.z + 1.88) < 4.5; }, 600000);
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(OUT, 'av-barista-swing.jpg'), quality: 86 }); await p.close(); return errs;
  }
};
async function face(n, id) {
  const { p, errs } = await lab('mode=face&n=' + n, 640, 640); const tmp = path.join(OUT, '_f.png'); await p.screenshot({ path: tmp }); await p.close();
  py(`
from PIL import Image
import os
a=Image.open(${JSON.stringify(tmp)}).convert('RGB'); f=os.path.join(${JSON.stringify(REF)},'${id}.png')
out=Image.new('RGB',(1280,640),(201,199,205)); out.paste(a,(640,0))
if os.path.exists(f): out.paste(Image.open(f).convert('RGB').crop((840,0,1920,1080)).resize((640,640)),(0,0))
out.save(${JSON.stringify(path.join(OUT, 'av-face-'))}+'${id}-vs-ref.jpg',quality=86); os.remove(${JSON.stringify(tmp)})`);
  return errs;
}
for (const [k, f] of Object.entries(jobs)) {
  if (want.length && !want.includes(k)) continue;
  const t0 = Date.now();
  try { const e = await f(); console.log(k, ((Date.now() - t0) / 1000).toFixed(0) + 's', e && e.length ? 'ERR ' + e.slice(0, 3).join(' | ') : 'ok'); }
  catch (e) { console.log(k, 'FAIL', e.message.split('\n')[0]); }
}
await b.close(); srv.close();
