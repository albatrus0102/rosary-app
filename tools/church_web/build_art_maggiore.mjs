// 마조레 파올리나 경당의 성화 '로마 백성의 구원(Salus Populi Romani)' 사진을 data URI 로 묶는다 → assets/church/art_maggiore.js
// (ch_maggiore.js 가 그 성당에 들어올 때만 읽는다. 원본: art/images_src/maggiore/salus_populi_romani.webp, 출처·라이선스: docs/church/licenses/maggiore.md)
//   node tools/church_web/build_art_maggiore.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = path.join(repo, 'art/images_src/maggiore/salus_populi_romani.webp');
const b = fs.readFileSync(src);
if (b.length > 60 * 1024) throw new Error('성화 그림은 60KB 이하여야 한다: ' + b.length);
const w = b.readUInt16LE(26) & 0x3fff, h = b.readUInt16LE(28) & 0x3fff;   // VP8(손실) 헤더의 크기
const js = '/* art_maggiore.js — 생성 파일(tools/church_web/build_art_maggiore.mjs). 성화 〈로마 백성의 구원(Salus Populi Romani)〉, 작가 미상, 7~13세기, 산타 마리아 마조레 대성전 파올리나 경당.\n' +
  '   사진: Wikimedia Commons "Salus Populi Romani after restoration.jpg"(LossRom) — 원작 Public domain, 사진 CC0 1.0. 여백을 잘라 내고 크기를 줄임(docs/church/licenses/maggiore.md). */\n' +
  '(window.ChurchArt = window.ChurchArt || {}).maggiore = { salus: { w: ' + w + ', h: ' + h + ', src: "data:image/webp;base64,' + b.toString('base64') + '" } };\n';
fs.writeFileSync(path.join(repo, 'assets/church/art_maggiore.js'), js);
console.log('wrote art_maggiore.js', w + 'x' + h, (b.length / 1024).toFixed(1) + 'KB webp ->', (js.length / 1024).toFixed(1) + 'KB js');
