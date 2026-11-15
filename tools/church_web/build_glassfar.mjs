// 사용: node tools/church_web/build_glassfar.mjs [church ...]
// 성당 안 진본 창의 '먼 창 사본' 팩을 만든다(PERF_SCALE.md §3): assets/church/gpack_far_<church>.js
//   window.ChurchGlassPack['far_<church>'] = { '<창 id>': 'data:image/webp;base64,...', ... }  (긴 변 256px, webp q0.8)
// 성당에 들어올 때 이 한 파일만 읽어 모든 창을 아틀라스 한 장(draw call 1)으로 그리고, 가까운 창만 1k(gpack_<id>_1k.js)를 따로 읽는다.
// 원본: assets/church/glass_<id>_th.webp(갤러리 썸네일, 긴 변 약 700~800px). 없으면 gpack_<id>_1k.js 의 그림. 줄이기·webp 인코딩은 헤드리스 Chromium 캔버스로 한다.
// 창 대응표(glass_placements.js)나 창 그림을 바꾸면 다시 실행한다. 창이 55개가 되어도 팩은 약 55 × 15KB ≈ 0.8MB.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const assets = path.resolve(here, '../../assets/church');
const P = require(path.join(assets, 'glass_placements.js'));
const LONG = 256, Q = 0.8;
const only = process.argv.slice(2);
const churches = Object.keys(P.churches).filter((c) => !only.length || only.includes(c));

function sourceUri(id) {
  const th = path.join(assets, `glass_${id}_th.webp`);
  if (fs.existsSync(th)) return 'data:image/webp;base64,' + fs.readFileSync(th).toString('base64');
  const pk = path.join(assets, `gpack_${id}_1k.js`);
  if (fs.existsSync(pk)) { const m = /'(data:image\/[a-z]+;base64,[^']+)'/.exec(fs.readFileSync(pk, 'utf8')); if (m) return m[1]; }
  throw new Error('no source image for ' + id);
}

const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
let total = 0;
for (const c of churches) {
  const ids = P.winsOf(c);
  if (!ids.length) continue;
  const out = {};
  for (const id of ids) {
    out[id] = await page.evaluate(async ({ uri, LONG, Q }) => {
      const im = new Image(); im.src = uri; await im.decode();
      const k = LONG / Math.max(im.naturalWidth, im.naturalHeight);
      const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, w, h);
      return cv.toDataURL('image/webp', Q);
    }, { uri: sourceUri(id), LONG, Q });
  }
  const file = path.join(assets, `gpack_far_${c}.js`);
  fs.writeFileSync(file, `/* build_glassfar.mjs 로 생성(직접 고치지 말 것): ${c} 성당 창 ${ids.length}점의 먼 창 사본(긴 변 ${LONG}px) */\n(window.ChurchGlassPack=window.ChurchGlassPack||{})['far_${c}']=${JSON.stringify(out)};\n`);
  const kb = fs.statSync(file).size / 1024; total += kb;
  console.log(c, ids.length, 'windows', kb.toFixed(1) + 'KB');
}
await browser.close();
console.log('total', total.toFixed(1) + 'KB');
