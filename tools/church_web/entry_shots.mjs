// 성당 '입구' 화면(lib/church/church_entry_card.dart)의 큰 카드에 쓰는 내부 렌더 샷.
// 우리 3D 성당을 빌더가 지정한 썸네일 시점(ChurchBuilders.<id>.thumb)에서 한 장씩 찍는다(권리 문제 없음).
//
// 사용: node tools/church_web/entry_shots.mjs [id ...] [--all] [--width 960] [--quality 72] [--scale 2]
//   -> assets/images/church_entry/render_<id>.webp (16:9, 기본 960x540, WebP q72)
//
// - 사람이 만든 대표 그림(assets/images/church_entry/hero_<id>.webp)이 이미 있는 성당은 앱이 그 그림을 쓰므로
//   기본으로 건너뛴다(APK 용량). --all 을 주면 그런 성당도 찍는다.
// - 렌더 코드(assets/church/*.js)가 바뀌면 다시 돌리면 된다. 성당당 1장, 순차(헤드리스 swiftshader 라 느리다).
// - --scale: 이 배율로 크게 그린 뒤 줄여서 계단 현상을 없앤다(기본 2).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fixedCam } from './thumb_cam.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = process.env.CHURCH_ROOT || path.resolve(here, '../../assets/church');
const outDir = path.resolve(here, '../../assets/images/church_entry');
fs.mkdirSync(outDir, { recursive: true });

const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : def; };
const flags = new Set(['--width', '--quality', '--scale']);
const named = argv.filter((a, i) => !a.startsWith('--') && !flags.has(argv[i - 1]));
const width = +opt('width', 960), height = Math.round(width * 9 / 16);
const quality = +opt('quality', 72), scale = +opt('scale', 2);
const includeHero = argv.includes('--all');
// ch_glass.js 는 감상실('glass_room', 성당 목록에 없음)이라 찍지 않는다.
const all = fs.readdirSync(assets).map((f) => /^ch_([a-z]+)\.js$/.exec(f)).filter(Boolean).map((m) => m[1]).filter((id) => id !== 'glass' && id !== 'example').sort();
const ids = (named.length ? named : all).filter((id) => named.length || includeHero || !fs.existsSync(path.join(outDir, `hero_${id}.webp`)));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failed = 0;
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const t0 = Date.now();
  await page.goto(`file://${assets}/test.html?church=${id}&hideui=1&thumb=1&autotier=0&msaa=0&quality=high&frames=6`);
  try { await page.waitForFunction(() => window.__church && window.__church.done, null, { timeout: 900000, polling: 500 }); } catch (e) { errors.push('timeout'); }
  const fixedPng = await fixedCam(page);
  const tmp = path.join(outDir, `render_${id}.raw.png`);
  if (fixedPng) fs.writeFileSync(tmp, Buffer.from(fixedPng.split(',')[1], 'base64')); else await page.screenshot({ path: tmp });
  await page.close();
  const dest = path.join(outDir, `render_${id}.webp`);
  // PIL 로 줄여서 WebP 저장.
  const py = `from PIL import Image\nim=Image.open(r'${tmp}').convert('RGB')\nim=im.resize((${width},${height}),Image.LANCZOS)\nim.save(r'${dest}','WEBP',quality=${quality},method=6)\n`;
  execFileSync('python3', ['-I', '-c', py]);
  fs.unlinkSync(tmp);
  const kb = (fs.statSync(dest).size / 1024).toFixed(1);
  console.log(id, kb + 'KB', ((Date.now() - t0) / 1000).toFixed(0) + 's', errors.length ? 'ERRORS: ' + errors.join('; ') : 'ok');
  if (errors.length) failed++;
}
await browser.close();
process.exit(failed ? 1 : 0);
