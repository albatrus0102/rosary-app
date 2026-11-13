// 사용: node tools/church_web/build_glasspack.mjs [id ...]
// 감상 모드(glass_view.js)가 file:// WebView 에서 창 사진을 읽을 수 있게 data URI 스크립트를 만든다.
//   - file:// 페이지에서는 WebGL 이 같은 폴더의 .webp 도 '교차 출처'로 거부한다(texImage2D SecurityError, fetch/XHR 도 막힘).
//     <script> 는 file:// 에서도 읽히므로 그림을 data URI 문자열로 감싸 보낸다(tex_pack.js 와 같은 방식).
//   - assets/church/glass_catalog.js  : window.ChurchGlassCatalog = <glass_catalog.json>
//   - assets/church/gpack_<id>_1k.js / gpack_<id>_2k.js : window.ChurchGlassPack['<id>_1k'] = 'data:image/webp;base64,...'
//   http(s) 로 열거나(시험 서버·앱 루프백 서버 G-03) viewWindow({base}) 를 주면 .webp 를 직접 읽으므로 이 파일들은 쓰이지 않는다.
//   카탈로그나 webp 를 바꾸면 다시 실행한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const assets = path.join(repo, 'assets/church');
const cat = JSON.parse(fs.readFileSync(path.join(assets, 'glass_catalog.json'), 'utf8'));
const only = process.argv.slice(2);
fs.writeFileSync(path.join(assets, 'glass_catalog.js'), '/* build_glasspack.mjs 로 생성(직접 고치지 말 것): glass_catalog.json 사본 */\nwindow.ChurchGlassCatalog=' + JSON.stringify(cat) + ';\n');
let total = 0, n = 0;
for (const w of cat.windows) {
  if (only.length && !only.includes(w.id)) continue;
  if (!/^[a-z0-9_]{1,40}$/.test(w.id)) throw new Error('bad id ' + w.id);
  for (const tier of ['1k', '2k']) {
    const f = w.files && w.files[tier];
    // bundled:false 인 단계(성당 안에서 쓰지 않는 창의 2k, tools/glass_bundle)는 앱에 넣지 않는다.
    if (!f || f.bundled === false) continue;
    const src = path.join(repo, f.path);
    const b64 = fs.readFileSync(src).toString('base64');
    const out = path.join(assets, `gpack_${w.id}_${tier}.js`);
    fs.writeFileSync(out, `/* build_glasspack.mjs 로 생성: ${path.basename(f.path)} */\n(window.ChurchGlassPack=window.ChurchGlassPack||{})['${w.id}_${tier}']='data:image/webp;base64,${b64}';\n`);
    total += fs.statSync(out).size; n++;
  }
}
console.log(`glass_catalog.js + ${n} packs, ${(total / 1048576).toFixed(1)} MB`);
