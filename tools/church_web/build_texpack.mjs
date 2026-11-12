// 사진 질감(JPEG)을 data: URI 로 묶어 JS 파일로 만든다. (file:// 로 열린 WebView 에서 이미지 파일을 WebGL 질감으로 쓰면
// 교차 출처 오류가 나므로 data URI 가 안전하다.)
//   node tools/church_web/build_texpack.mjs              -> assets/church/tex_pack.js (공용 tex_*.jpg)
//   node tools/church_web/build_texpack.mjs --church ID  -> assets/church/tex_pack_ID.js (tex_ID_*.jpg 만)
// 성당별 팩은 index.html/test.html 의 BUILDERS 블록에 register_builders.mjs 가 자동으로 넣는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/church');
const files = fs.readdirSync(assets);
const ids = files.map((f) => /^ch_([a-z]+)\.js$/.exec(f)).filter(Boolean).map((m) => m[1]);
function pack(list, out) {
  if (!list.length) { if (fs.existsSync(path.join(assets, out))) fs.unlinkSync(path.join(assets, out)); console.log('no textures for', out); return; }
  let js = '/* ' + out + ' — build_texpack.mjs 로 생성(직접 고치지 말 것). 사진 질감 data URI 모음 */\n(function(){var P=window.ChurchTexPack=window.ChurchTexPack||{};\n';
  let total = 0;
  for (const f of list.sort()) {
    const b = fs.readFileSync(path.join(assets, f));
    total += b.length;
    js += `P[${JSON.stringify(f)}]='data:image/jpeg;base64,${b.toString('base64')}';\n`;
  }
  js += '})();\n';
  fs.writeFileSync(path.join(assets, out), js);
  console.log('wrote', out, list.length, 'files', (total / 1024).toFixed(0) + 'KB jpg ->', (js.length / 1024).toFixed(0) + 'KB js');
}
const arg = process.argv.indexOf('--church');
if (arg > 0) {
  const id = process.argv[arg + 1];
  pack(files.filter((f) => f.startsWith(`tex_${id}_`) && f.endsWith('.jpg')), `tex_pack_${id}.js`);
} else {
  const isChurch = (f) => ids.some((id) => f.startsWith(`tex_${id}_`));
  pack(files.filter((f) => /^tex_.*\.jpg$/.test(f) && !isChurch(f)), 'tex_pack.js');
}
