// 성모상 그림(사용자가 ChatGPT 로 만들어 올린 투명 배경 PNG, art/statues/*.png)을 성당별 data URI 묶음으로 만든다
//   → assets/church/art_statue_<key>.js (shrine.js 가 그 성당에 들어올 때만 읽는다. 출처: docs/church/ASSET_LICENSES.md 'AI 생성 성모상')
// 1) 줄이기(Pillow): art/statues/<name>.png → art/images_src/statues/<name>.webp, 512×1024, 알파 포함, 80KB 이하
//      python3 -c "from PIL import Image; im=Image.open('art/statues/N.png').convert('RGBA').resize((512,1024),Image.LANCZOS); im.save('art/images_src/statues/N.webp','WEBP',quality=82,alpha_quality=90,method=6)"
// 2) node tools/church_web/build_art_statues.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const STATUES = {
  plain_white: { file: 'mary_plain_white', note: '흰 돌 성모(소박한 형태) — 당고개' },
  immaculate_blue: { file: 'mary_immaculate_blue', note: '푸른 망토·열두 별 관의 원죄 없으신 성모 — 우리 본당·라테라노·성 바오로·밀라노·피렌체' },
  hanbok_rosary: { file: 'mary_hanbok_rosary', note: '한복 차림에 묵주를 든 성모 — 명동' }
};
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [key, s] of Object.entries(STATUES)) {
    const b = fs.readFileSync(path.join(repo, 'art/images_src/statues', s.file + '.webp'));
    if (b.length > 80 * 1024) throw new Error(s.file + ' 는 80KB 이하여야 한다: ' + b.length);
    const js = '/* art_statue_' + key + '.js — 생성 파일(tools/church_web/build_art_statues.mjs). ' + s.note + '.\n' +
      '   AI 생성 성모상 그림(ChatGPT, 사용자 제공, art/statues/' + s.file + '.png)을 512×1024 webp(알파)로 줄임. docs/church/ASSET_LICENSES.md */\n' +
      '((window.ChurchArt = window.ChurchArt || {}).statues = window.ChurchArt.statues || {}).' + key + ' = { w: 512, h: 1024, src: "data:image/webp;base64,' + b.toString('base64') + '" };\n';
    fs.writeFileSync(path.join(repo, 'assets/church/art_statue_' + key + '.js'), js);
    console.log('wrote art_statue_' + key + '.js', (b.length / 1024).toFixed(1) + 'KB webp ->', (js.length / 1024).toFixed(1) + 'KB js');
  }
}
