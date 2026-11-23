// web_demo/build.mjs — 허락 요청 편지에 붙일 「비밀 링크」 웹 데모를 정적 폴더로 만든다.
//   node web_demo/build.mjs [--links <파일>] [--out <폴더>] [--base <주소>] [--quiet]
// 입력: web_demo/links.local.json(받는 곳 id → {church, lang, token}; 저장소에 올리지 않는다. 없으면 links.defaults.json 으로 만든다).
// 출력: build/web_demo/ (배포용 정적 폴더; Cloudflare Pages). 받는 곳마다 v/<토큰>/index.html 하나.
// 성당 장면(assets/church)은 고치지 않고 그대로 복사한다. 쓰는 법은 web_demo/README.md.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(here, '..');
export const CHURCH_DIR = path.join(REPO, 'assets/church');
export const LANGS = ['ko', 'it', 'en', 'es', 'pt'];
export const CHURCHES = ['basic', 'stpeter', 'lateran', 'maggiore', 'stpaul', 'milan', 'florence', 'assisi', 'myeongdong', 'danggogae', 'yeouido'];
// 성당 → 허락 서류 묶음(자막 줄을 가져올 video_plan.md 가 있는 곳)
const PACKAGE_OF = { basic: null, stpeter: 'stpeter', lateran: 'lateran', maggiore: 'maggiore', stpaul: 'stpaul', milan: 'milan', florence: 'florence', assisi: 'assisi', myeongdong: 'seoul-archdiocese', danggogae: 'danggogae', yeouido: 'yeouido' };
const LANG_NAME = { '한국어': 'ko', '영어': 'en', '스페인어': 'es', '이탈리아어': 'it', '포르투갈어': 'pt' };
export const TOKEN_RE = /^[a-z2-7]{26,}$/;   // base32 소문자, 26자 = 130비트 이상

// ---- 토큰: 무작위 160비트, base32(RFC 4648, 패딩 없음, 소문자) ----
export function newToken(bytes = 20) {
  const buf = crypto.randomBytes(bytes), A = 'abcdefghijklmnopqrstuvwxyz234567';
  let bits = 0, val = 0, out = '';
  for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += A[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += A[(val << (5 - bits)) & 31];
  return out;
}

// ---- 자막: video_plan.md 의 표에서 장면 설명으로 역할을 찾아 자막을 뽑는다(받는 분의 언어와 같을 때만 쓴다) ----
const ROLE_RULES = [
  ['intro', /제목 카드/],
  ['walk', /걷기/, /제대 쪽으로 걸어가다|올려다/],
  ['vault', /올려다/],
  ['altar', /멈추는/],
  ['cross', /성호/],
  ['candle', /초 켜기/],
  ['sit', /무릎 꿇고|묵주 패널/]
];
export function extractCaptions(md) {
  const lm = /자막 언어:\s*\*\*([^*(]+)/.exec(md);
  const lang = lm ? LANG_NAME[lm[1].trim()] || null : null;
  const roles = {};
  for (const line of md.split('\n')) {
    const m = /^\|\s*\d+\s*\|[^|]*\|([^|]*)\|(.+)\|\s*$/.exec(line);
    if (!m) continue;
    const scene = m[1], caption = m[2].trim();
    if (caption.includes('〔')) continue;   // 자리 표시(〔이메일〕 등)가 든 줄은 쓰지 않는다
    for (const [role, inc, exc] of ROLE_RULES) {
      if (roles[role] || !inc.test(scene) || (exc && exc.test(scene))) continue;
      roles[role] = caption;
    }
  }
  return { lang, roles };
}
export function captionsFor(church, lang, repo = REPO) {
  const pkg = PACKAGE_OF[church];
  if (!pkg) return {};
  const f = path.join(repo, 'docs/legal/church_permission/package', pkg, 'video_plan.md');
  if (!fs.existsSync(f)) return {};
  const { lang: l, roles } = extractCaptions(fs.readFileSync(f, 'utf8'));
  return l === lang ? roles : {};
}

// ---- 링크 파일 ----
export function loadLinks(file, { create } = {}) {
  if (!fs.existsSync(file)) {
    if (!create) throw new Error('링크 파일이 없습니다: ' + file);
    const def = JSON.parse(fs.readFileSync(path.join(here, 'links.defaults.json'), 'utf8'));
    fs.writeFileSync(file, JSON.stringify(def, null, 2) + '\n', { mode: 0o600 });
  }
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rec = j.recipients;
  if (!rec || typeof rec !== 'object') throw new Error('recipients 가 없습니다: ' + file);
  const seen = new Set();
  for (const [id, r] of Object.entries(rec)) {
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error('받는 곳 id 는 영문 소문자·숫자·붙임표만: ' + id);
    if (!CHURCHES.includes(r.church)) throw new Error(id + ': 알 수 없는 성당 ' + r.church + ' (' + CHURCHES.join(', ') + ')');
    if (!LANGS.includes(r.lang)) throw new Error(id + ': 알 수 없는 언어 ' + r.lang + ' (' + LANGS.join(', ') + ')');
    if (r.token !== undefined && !TOKEN_RE.test(r.token)) throw new Error(id + ': 토큰 모양이 틀립니다(소문자 base32 26자 이상)');
    if (r.token) { if (seen.has(r.token)) throw new Error(id + ': 토큰이 겹칩니다'); seen.add(r.token); }
  }
  // 토큰이 없는 곳에는 새로 만들어 파일에 적는다(이 파일은 저장소에 올리지 않는다)
  let changed = false;
  for (const r of Object.values(rec)) if (!r.token) { let t; do t = newToken(); while (seen.has(t)); r.token = t; seen.add(t); changed = true; }
  if (changed) fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n', { mode: 0o600 });
  return rec;
}

// ---- 장면 스크립트 목록: assets/church/index.html 의 <script src> 를 순서대로 ----
export function sceneScripts(church) {
  const html = fs.readFileSync(path.join(CHURCH_DIR, 'index.html'), 'utf8');
  const out = [];
  for (const m of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
    const f = m[1];
    const cm = /^ch_([a-z]+)\.js$/.exec(f);
    if (cm && cm[1] !== church && cm[1] !== 'basic' && cm[1] !== 'glass') continue;   // 다른 성당의 빌더는 싣지 않는다
    if (f === 'tex_pack_assisi.js' && church !== 'assisi') continue;
    out.push([f, fs.statSync(path.join(CHURCH_DIR, f)).size]);
  }
  if (!out.some((s) => s[0] === 'ch_' + church + '.js')) throw new Error('성당 빌더가 목록에 없습니다: ch_' + church + '.js');
  return out;
}

const escJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16));

function pageHtml(r) {
  const I = require_i18n();
  const name = (I.names[r.church] || {})[r.lang] || r.church;
  const cfg = { church: r.church, lang: r.lang, scripts: sceneScripts(r.church), captions: captionsFor(r.church, r.lang) };
  return `<!doctype html>
<html lang="${r.lang}">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#15110c">
<meta name="color-scheme" content="dark">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>${name.replace(/[<>&]/g, '')} — Rosarium</title>
<base href="../../assets/church/">
<link rel="stylesheet" href="../shell/shell.css">
<style>
  canvas{background:#15110c;display:block;position:fixed;left:0;top:0;width:100%;height:100%;touch-action:none;outline:none}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="stick"><div id="knob"></div></div>
<script>/* 오류 기록: 장면 스크립트가 오기 전의 오류를 bridge.js 가 가져간다(assets/church/index.html 과 같다). */window.__churchErrBuf=[];window.addEventListener('error',function(e){var b=window.__churchErrBuf;if(b&&b.length<20)b.push(['error',e&&e.message,e&&e.filename,e&&e.lineno,e&&e.colno,e&&e.error&&e.error.stack]);});</script>
<script src="../shell/i18n.js"></script>
<script>window.DEMO=${escJson(cfg)};</script>
<script src="../shell/shell.js"></script>
<script src="../shell/tour.js"></script>
<noscript><p style="color:#f6ecda;font:16px sans-serif;padding:24px">JavaScript is required.</p></noscript>
</body>
</html>
`;
}
const I18N = createRequire(import.meta.url)('./shell/i18n.js');
function require_i18n() { return I18N; }

const NOT_FOUND = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Not found</title>
<style>html,body{height:100%;margin:0;background:#fff;color:#444;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}body{display:flex;align-items:center;justify-content:center;text-align:center}h1{font-size:20px;font-weight:600;margin:0 0 6px}p{margin:0;color:#777;font-size:14px}</style>
</head>
<body><div><h1>404 — Not found</h1><p>The page you are looking for does not exist.</p></div></body>
</html>
`;
const ROBOTS = 'User-agent: *\nDisallow: /\n';
const HEADERS = `/*
  X-Robots-Tag: noindex, nofollow, noarchive
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
/v/*
  Cache-Control: no-store
/assets/*
  Cache-Control: public, max-age=600
`;

function copyDir(src, dst, filter) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f);
    if (fs.statSync(s).isFile() && (!filter || filter(f))) fs.copyFileSync(s, path.join(dst, f));
  }
}

export function walk(dir, base = dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f), st = fs.statSync(p);
    if (st.isDirectory()) walk(p, base, out); else out.push({ rel: path.relative(base, p), size: st.size, abs: p });
  }
  return out;
}

export function build({ linksFile, outDir, base = '', quiet = false } = {}) {
  const explicit = !!linksFile;
  linksFile = linksFile || path.join(here, 'links.local.json');
  outDir = path.resolve(outDir || path.join(REPO, 'build/web_demo'));
  if (outDir === path.parse(outDir).root || outDir === REPO || outDir.includes(path.sep + '.git')) throw new Error('출력 폴더가 위험합니다: ' + outDir);
  const rec = loadLinks(linksFile, { create: !explicit });
  fs.rmSync(outDir, { recursive: true, force: true });   // 폐기(철회)는 링크 파일에서 지우고 다시 짓는 것 — 옛 v/ 폴더는 여기서 사라진다
  fs.mkdirSync(outDir, { recursive: true });
  // 공용 자산: 장면 스크립트·질감 묶음·창 사진(개발용 dev/ · 창 원본 glass_src/ · 시험 페이지 제외)
  copyDir(CHURCH_DIR, path.join(outDir, 'assets/church'), (f) => /\.(js|webp)$/.test(f) || f === 'glass_catalog.json');
  copyDir(path.join(here, 'shell'), path.join(outDir, 'assets/shell'));
  for (const [id, r] of Object.entries(rec)) {
    const d = path.join(outDir, 'v', r.token);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'index.html'), pageHtml(r));
  }
  fs.writeFileSync(path.join(outDir, 'index.html'), NOT_FOUND);
  fs.writeFileSync(path.join(outDir, '404.html'), NOT_FOUND);
  fs.writeFileSync(path.join(outDir, 'robots.txt'), ROBOTS);
  fs.writeFileSync(path.join(outDir, '_headers'), HEADERS);
  // 보낼 주소 목록(배포 폴더 밖; 비밀이므로 저장소에 올리지 않는다)
  const listFile = outDir + '_links.txt';
  const lines = Object.entries(rec).map(([id, r]) => [id, r.church, r.lang, (base || '') + '/v/' + r.token + '/'].join('\t'));
  fs.writeFileSync(listFile, '# id\tchurch\tlang\turl\n' + lines.join('\n') + '\n', { mode: 0o600 });
  const files = walk(outDir);
  const total = files.reduce((a, f) => a + f.size, 0);
  const big = files.slice().sort((a, b) => b.size - a.size);
  if (big[0].size > 25 * 1024 * 1024) throw new Error('25MB 를 넘는 파일: ' + big[0].rel);
  if (files.length > 20000) throw new Error('파일이 20,000개를 넘습니다');
  const summary = { out: outDir, list: listFile, recipients: Object.keys(rec).length, files: files.length, bytes: total, largest: big.slice(0, 8).map((f) => [f.rel, f.size]) };
  if (!quiet) {
    let gz = 0; for (const f of files) gz += zlib.gzipSync(fs.readFileSync(f.abs), { level: 6 }).length;
    summary.gzipBytes = gz;
    const mb = (n) => (n / 1048576).toFixed(2) + ' MB';
    console.log(`만든 곳: ${outDir}\n받는 곳 ${summary.recipients}곳 · 파일 ${files.length}개 · 합계 ${mb(total)} (gzip 약 ${mb(gz)})`);
    console.log('큰 파일: ' + summary.largest.map(([n, s]) => n + ' ' + mb(s)).join(' · '));
    console.log('주소 목록(비밀): ' + listFile);
  }
  return summary;
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const a = process.argv.slice(2), opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  try { build({ linksFile: opt('--links') && path.resolve(opt('--links')), outDir: opt('--out'), base: opt('--base') || '', quiet: a.includes('--quiet') }); }
  catch (e) { console.error('오류: ' + e.message); process.exit(1); }
}
