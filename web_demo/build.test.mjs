// 시험: node --test web_demo/build.test.mjs
// 빌드가 받는 곳마다 토큰 폴더를 만들고, 루트는 중립 「없음」 페이지이며, noindex 머리글이 있고, 토큰이 저장소 파일에 없는지.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build, newToken, TOKEN_RE, extractCaptions, captionsFor, walk, REPO } from './build.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'web_demo_test-'));
const links = path.join(tmp, 'links.json');
const out = path.join(tmp, 'site');
const sample = { recipients: { 'test-a': { church: 'stpeter', lang: 'it' }, 'test-b': { church: 'danggogae', lang: 'ko' }, 'test-c': { church: 'basic', lang: 'en' } } };
fs.writeFileSync(links, JSON.stringify(sample));

test('토큰은 130비트 이상 base32 이고 겹치지 않는다', () => {
  const s = new Set();
  for (let i = 0; i < 200; i++) { const t = newToken(); assert.match(t, TOKEN_RE); assert.ok(t.length * 5 >= 128); s.add(t); }
  assert.equal(s.size, 200);
});

test('빌드: 받는 곳마다 v/<토큰>/index.html, 루트는 중립 페이지', () => {
  const r = build({ linksFile: links, outDir: out, quiet: true });
  const rec = JSON.parse(fs.readFileSync(links, 'utf8')).recipients;   // 토큰이 파일에 적혔다
  const toks = Object.values(rec).map((x) => x.token);
  assert.equal(toks.length, 3);
  for (const t of toks) assert.match(t, TOKEN_RE);
  for (const [id, x] of Object.entries(rec)) {
    const html = fs.readFileSync(path.join(out, 'v', x.token, 'index.html'), 'utf8');
    assert.ok(html.includes('"church":"' + x.church + '"'), id + ' 성당');
    assert.ok(html.includes('"lang":"' + x.lang + '"'), id + ' 언어');
    assert.ok(html.includes('<meta name="robots" content="noindex,nofollow'), id + ' noindex meta');
    assert.ok(html.includes('ch_' + x.church + '.js'), id + ' 빌더');
  }
  assert.deepEqual(fs.readdirSync(path.join(out, 'v')).sort(), toks.slice().sort());
  // 루트와 404 는 같은 중립 페이지(토큰·성당 이름 없음)
  const root = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.equal(root, fs.readFileSync(path.join(out, '404.html'), 'utf8'));
  assert.match(root, /Not found/);
  assert.match(root, /noindex/);
  for (const w of ['Rosarium', 'church', ...toks]) assert.ok(!root.includes(w), '루트에 ' + w);
  // 공용 자산
  assert.ok(fs.existsSync(path.join(out, 'assets/church/main.js')));
  assert.ok(fs.existsSync(path.join(out, 'assets/shell/shell.js')));
  assert.ok(!fs.existsSync(path.join(out, 'assets/church/dev')), '개발용 dev/ 는 싣지 않는다');
  assert.ok(r.files < 20000);
  for (const f of walk(out)) assert.ok(f.size <= 25 * 1024 * 1024, f.rel);
});

test('noindex: _headers 와 robots.txt', () => {
  const h = fs.readFileSync(path.join(out, '_headers'), 'utf8');
  assert.match(h, /X-Robots-Tag: noindex, nofollow/);
  assert.match(h, /Referrer-Policy: no-referrer/);
  assert.match(h, /\/v\/\*\n\s+Cache-Control: no-store/);
  assert.equal(fs.readFileSync(path.join(out, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
});

test('철회: 링크 파일에서 지우고 다시 지으면 그 폴더가 사라진다', () => {
  const j = JSON.parse(fs.readFileSync(links, 'utf8'));
  const gone = j.recipients['test-b'].token, kept = j.recipients['test-a'].token;
  delete j.recipients['test-b'];
  fs.writeFileSync(links, JSON.stringify(j));
  build({ linksFile: links, outDir: out, quiet: true });
  assert.ok(!fs.existsSync(path.join(out, 'v', gone)));
  assert.ok(fs.existsSync(path.join(out, 'v', kept)));
});

test('잘못된 링크 파일은 거부한다', () => {
  const bad = path.join(tmp, 'bad.json');
  for (const rec of [{ x: { church: 'nowhere', lang: 'ko' } }, { x: { church: 'basic', lang: 'xx' } }, { x: { church: 'basic', lang: 'ko', token: 'short' } }]) {
    fs.writeFileSync(bad, JSON.stringify({ recipients: rec }));
    assert.throws(() => build({ linksFile: bad, outDir: path.join(tmp, 'bad_out'), quiet: true }));
  }
});

test('자막: video_plan.md 에서 역할별 줄을 뽑고 받는 분의 언어와 다르면 쓰지 않는다', () => {
  const stpeter = captionsFor('stpeter', 'it');
  for (const k of ['intro', 'walk', 'vault', 'altar', 'cross', 'candle', 'sit']) assert.ok(stpeter[k], 'stpeter it ' + k);
  assert.match(stpeter.altar, /gradini/);
  assert.deepEqual(captionsFor('stpeter', 'ko'), {});
  assert.deepEqual(captionsFor('basic', 'ko'), {});
  const md = '- 자막 언어: **영어** · x\n| 1 | 0:00 | 제목 카드 | Hello 〔이메일〕 |\n| 2 | 0:10 | 제단 계단 앞에서 멈추는 모습 | Stop here |\n';
  const x = extractCaptions(md);
  assert.equal(x.lang, 'en'); assert.equal(x.roles.altar, 'Stop here'); assert.ok(!x.roles.intro);
});

test('토큰이 저장소(추적되는 파일)에 없다', () => {
  const rec = JSON.parse(fs.readFileSync(links, 'utf8')).recipients;
  const toks = Object.values(rec).map((x) => x.token);
  let tracked;
  try { tracked = execFileSync('git', ['ls-files', '-z'], { cwd: REPO }).toString().split('\0').filter(Boolean); } catch { return; }   // git 이 없으면 건너뜀
  assert.ok(!tracked.includes('web_demo/links.local.json'), 'links.local.json 은 추적되면 안 된다');
  const pat = /\/v\/[a-z2-7]{26,}\b/;
  for (const f of tracked.filter((p) => p.startsWith('web_demo/') || p.startsWith('docs/') || p === '.gitignore')) {
    const p = path.join(REPO, f);
    if (!fs.existsSync(p)) continue;
    const s = fs.readFileSync(p, 'utf8');
    assert.ok(!pat.test(s), f + ' 에 비밀 링크 모양이 있다');
    for (const t of toks) assert.ok(!s.includes(t), f + ' 에 시험 토큰');
  }
  // 로컬 대응표가 실제로 있다면 그 토큰도 어느 추적 파일에도 없어야 한다
  const local = path.join(REPO, 'web_demo/links.local.json');
  if (fs.existsSync(local)) {
    const lt = Object.values(JSON.parse(fs.readFileSync(local, 'utf8')).recipients).map((x) => x.token).filter(Boolean);
    for (const f of tracked) {
      const p = path.join(REPO, f);
      if (!fs.existsSync(p) || fs.statSync(p).size > 5e6) continue;
      const s = fs.readFileSync(p, 'latin1');
      for (const t of lt) assert.ok(!s.includes(t), f + ' 에 로컬 토큰');
    }
    assert.ok(execFileSync('git', ['check-ignore', 'web_demo/links.local.json'], { cwd: REPO }).toString().includes('links.local.json'));
  }
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
