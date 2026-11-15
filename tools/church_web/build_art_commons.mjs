// 성 밖 성 바오로·성 베드로 대성전의 위키미디어 공용 사진 판을 data URI 로 묶는다 → assets/church/art_stpaul.js · art_stpeter.js
// (ch_stpaul.js · ch_stpeter.js 가 그 성당에 들어올 때만 읽는다. 원본: art/images_src/<성당>/*.webp — tools/commons_art/make_commons_art.py,
//  출처·라이선스·변경사항: docs/church/licenses/stpaul.md · stpeter.md)
//   node tools/church_web/build_art_commons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PACKS = {
  stpaul: {
    keys: { apse: 'apse_mosaic', tombFront: 'tomb_front', tombFloor: 'tomb_floor' }, maxKB: 240,
    note: '성 밖 성 바오로 대성전. 후진 모자이크(13세기, 19세기 복원): Commons "Apse mosaic Basilica of St Paul Outside the Walls.jpg"(사진 Alberto Fernandez Fernandez, 색 보정 Amandajm, CC BY 2.5 —\n' +
      '   반돔 곡면에 맞게 원근을 다시 폄·사진 밖은 금 바탕으로 채움·축소) · 사도 바오로 무덤: Commons "St. Paul\'s Tomb.jpg"(사진 StPaul.jpg, CC BY 4.0 — 자르기·원근 보정·축소)',
  },
  stpeter: {
    keys: { pieta: 'pieta', peter: 'peter_bronze' }, maxKB: 200,
    note: '성 베드로 대성전. 미켈란젤로 〈피에타〉(1498–99): Commons "Michelangelo\'s Pieta, St. Peter\'s Basilica, Vatican City (48466681337).jpg" · 성 베드로 청동 좌상(13세기, 아르놀포 디 캄비오 추정):\n' +
      '   Commons "St. Peter\'s Basilica, Bronze Statue of St. Peter (48466478846).jpg" — 둘 다 사진 Gary Todd, Public Domain Mark 1.0(자르기·축소, 피에타는 가장자리를 어둡게)',
  },
};
for (const [church, p] of Object.entries(PACKS)) {
  const out = {};
  for (const [key, file] of Object.entries(p.keys)) {
    const b = fs.readFileSync(path.join(repo, 'art/images_src', church, file + '.webp'));
    if (b.length > p.maxKB * 1024) throw new Error(file + ': 그림은 ' + p.maxKB + 'KB 이하여야 한다: ' + b.length);
    if (b.toString('ascii', 12, 16) !== 'VP8 ') throw new Error(file + ': 손실 VP8 WebP 여야 한다');
    out[key] = { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff, src: 'data:image/webp;base64,' + b.toString('base64') };
  }
  const js = '/* art_' + church + '.js — 생성 파일(tools/church_web/build_art_commons.mjs). ' + p.note + '. docs/church/licenses/' + church + '.md */\n' +
    '(window.ChurchArt = window.ChurchArt || {}).' + church + ' = ' + JSON.stringify(out) + ';\n';
  fs.writeFileSync(path.join(repo, 'assets/church/art_' + church + '.js'), js);
  console.log('wrote art_' + church + '.js', Object.entries(out).map(([k, v]) => k + ' ' + v.w + 'x' + v.h).join(', '), (js.length / 1024).toFixed(1) + 'KB js');
}
