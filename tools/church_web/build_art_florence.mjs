// 피렌체 대성당 북 측랑 벽 그림 3점의 사진을 data URI 로 묶는다 → assets/church/art_florence.js
// (ch_florence.js 가 그 성당에 들어올 때만 읽는다. 원본: art/images_src/florence/*.webp — tools/commons_art/make_commons_art.py 가 위키미디어 공용 사진을
//  원근 보정·자르기·줄여 만든다. 출처·라이선스·변경사항: docs/church/licenses/florence.md)
//   node tools/church_web/build_art_florence.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = {};
for (const key of ['tolentino', 'hawkwood', 'dante']) {
  const b = fs.readFileSync(path.join(repo, 'art/images_src/florence', key + '.webp'));
  if (b.length > 200 * 1024) throw new Error(key + ': 그림은 200KB 이하여야 한다: ' + b.length);
  if (b.toString('ascii', 12, 16) !== 'VP8 ') throw new Error(key + ': 손실 VP8 WebP 여야 한다');
  out[key] = { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff, src: 'data:image/webp;base64,' + b.toString('base64') };
}
const js = '/* art_florence.js — 생성 파일(tools/church_web/build_art_florence.mjs). 피렌체 대성당 북 측랑 벽 그림 3점(원작 모두 Public domain, 15세기).\n' +
  '   톨렌티노: Commons "Andrea del castagno, Monumento equestre di Niccolò da Tolentino, 1456, 01.JPG"(사진 Sailko, CC BY 3.0 — 원근 보정·자르기·밝기 보정·축소) ·\n' +
  '   호크우드: Commons "Paolo uccello, Monumento equestre di John Hawkwood, 1436, 01-edit.jpg"(사진 Sailko, 편집 MenkinAlRire, CC BY 3.0 — 자르기·축소) ·\n' +
  '   단테: Commons "Dante Domenico di Michelino.jpg"(PD-Art, 촬영자 미상 — 자르기·축소). docs/church/licenses/florence.md */\n' +
  '(window.ChurchArt = window.ChurchArt || {}).florence = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(repo, 'assets/church/art_florence.js'), js);
console.log('wrote art_florence.js', Object.entries(out).map(([k, v]) => k + ' ' + v.w + 'x' + v.h).join(', '), (js.length / 1024).toFixed(1) + 'KB js');
