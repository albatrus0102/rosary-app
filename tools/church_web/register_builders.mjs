// assets/church/ch_*.js 를 찾아 index.html / test.html 의 BUILDERS 블록을 다시 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/church');
const files = fs.readdirSync(root).filter((f) => /^ch_[a-z]+\.js$/.test(f)).sort((a, b) => (a === 'ch_basic.js' ? -1 : b === 'ch_basic.js' ? 1 : a.localeCompare(b)));
const all = fs.readdirSync(root);
const packs = all.filter((f) => /^tex_pack_[a-z]+\.js$/.test(f)).sort();
const block = '<!-- BUILDERS:BEGIN (자동 생성: node tools/church_web/register_builders.mjs — 직접 고치지 말 것) -->\n' + packs.concat(files).map((f) => `<script src="${f}"></script>`).join('\n') + '\n<!-- BUILDERS:END -->';
for (const page of ['index.html', 'test.html']) {
  const p = path.join(root, page);
  if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, 'utf8');
  const n = s.replace(/<!-- BUILDERS:BEGIN[\s\S]*?<!-- BUILDERS:END -->/, block);
  if (n !== s) fs.writeFileSync(p, n);
  console.log(page, files.join(' '));
}
