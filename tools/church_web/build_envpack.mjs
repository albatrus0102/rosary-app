// 사용: node tools/church_web/build_envpack.mjs <file.hdr> [name]  -> assets/church/env_church.js (HDR 를 base64 로)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/church');
const src = process.argv[2], name = process.argv[3] || path.basename(src);
const b = fs.readFileSync(src);
fs.writeFileSync(path.join(assets, 'env_church.js'), `/* env_church.js — ${name} (Poly Haven, CC0) RGBE 파노라마를 base64 로 넣은 것. build_envpack.mjs 로 생성 */\nwindow.ChurchEnvHDR={name:${JSON.stringify(name)},b64:${JSON.stringify(b.toString('base64'))}};\n`);
console.log('wrote env_church.js', (b.length / 1024).toFixed(0) + 'KB hdr');
