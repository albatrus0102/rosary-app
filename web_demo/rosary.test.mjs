// web_demo/rosary.test.mjs — 웹 데모 묵주기도: 기도문이 확인된 출처와 글자 하나 다르지 않은가, 문구가 모든 언어에 있는가, 둘러보기가 묵주 화면에 닿는가.
//   node --test web_demo/rosary.test.mjs   (Playwright 가 없으면 브라우저 시험은 건너뛴다)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { generate, OUT, SOURCES, SKIP, IDS, SETS, REPO } from './gen_prayers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const P = require('./shell/prayers.js');
const I18N = require('./shell/i18n.js');
const LANGS = ['ko', 'it', 'en', 'es', 'pt'];
const src = (k) => fs.readFileSync(path.join(REPO, SOURCES[k]), 'utf8');
// texts.md 의 ```text 묶음들(본문은 반드시 이 안에서 나와야 한다)
const blocks = (md) => [...md.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);

test('shell/prayers.js 는 출처에서 다시 뽑은 것과 같다(손으로 고치지 않았다)', () => {
  assert.equal(fs.readFileSync(OUT, 'utf8'), generate(), 'node web_demo/gen_prayers.mjs 로 다시 만드세요');
});

test('한국어: 기도문·신비는 앱 lib/domain/prayer_data.dart 와 글자 그대로', () => {
  const dart = src('ko');
  // Dart 문자열은 줄마다 '…\\n' 으로 나뉘어 있다: 본문을 줄로 나눠 그 리터럴이 그대로 있는지 본다
  for (const id of IDS) {
    const p = P.ko.prayers[id];
    assert.ok(p && p.x, 'ko ' + id);
    const lines = p.x.split('\n');
    const lit = lines.map((l, i) => "'" + l.replace(/'/g, "\\'") + (i < lines.length - 1 ? '\\n' : '') + "'");
    let at = dart.indexOf("title: '" + p.t + "'");
    assert.ok(at > 0, 'ko 제목 ' + p.t);
    for (const s of lit) { const j = dart.indexOf(s, at); assert.ok(j > at, 'ko ' + id + ' 줄 ' + s); at = j; }
  }
  for (const s of SETS) for (const m of P.ko.sets[s].m) {
    assert.ok(dart.includes("title: '" + m.t + "'") && dart.includes("meditation: '" + m.med + "'"), 'ko 신비 ' + m.t);
  }
  assert.deepEqual(P.weekday, [3, 0, 2, 3, 1, 2, 0], '요일 배분(일..토 → 영광·환희·고통·영광·빛·고통·환희)');
});

test('다른 언어: 본문은 texts.md 의 ```text 묶음과 바이트까지 같고, 자리 표시는 없다', () => {
  for (const l of ['en', 'it', 'es', 'pt']) {
    const md = src(l), bl = blocks(md);
    for (const id of IDS) {
      const p = P[l].prayers[id];
      if (SKIP[l] && SKIP[l][id]) { assert.ok(p && p.pending && p.x === undefined && p.t, l + ' ' + id + ' 는 이름만(본문 없음)'); continue; }
      assert.ok(p && typeof p.x === 'string', l + ' ' + id);
      assert.ok(bl.includes(p.x), l + ' ' + id + ' 본문이 출처 묶음과 다르다');
      assert.ok(!p.x.includes('〔'), l + ' ' + id + ' 자리 표시');
      assert.ok(md.includes('### ' + p.t + '\n'), l + ' 제목 ' + p.t);
    }
    const lev = src('lev');
    for (const s of SETS) {
      const g = P[l].sets[s];
      assert.equal(g.m.length, 5);
      assert.ok(md.includes(g.name) || lev.includes(g.name), l + ' 묶음 이름 ' + g.name);
      for (const m of g.m) assert.ok(bl.some((b) => b.includes(m.t)), l + ' 신비 ' + m.t);
    }
  }
  // en 은 USCCB 의 공식 파티마 기도가 있다 — 자리 표시를 쓰면 안 된다
  assert.ok(P.en.prayers.fatima.x && !P.en.prayers.fatima.pending);
  // it 현행 주님의 기도(「non abbandonarci alla tentazione」)
  assert.match(P.it.prayers.our.x, /non abbandonarci alla tentazione/);
});

test('모든 언어에 묵주 문구·자막이 있고, 한국어가 아닌 언어에 한글이 없다', () => {
  const keys = Object.keys(I18N.ui.ko).filter((k) => /^r[A-Z]|^tourEndRosary$/.test(k));
  assert.ok(keys.length >= 25, keys.length);
  for (const l of LANGS) {
    for (const k of keys) assert.ok(I18N.ui[l][k], l + ' ' + k);
    for (const k of ['rosStart', 'rosSign', 'rosCreed', 'rosDecade', 'rosHand']) assert.ok(I18N.captions[l][k], l + ' 자막 ' + k);
    if (l !== 'ko') {
      assert.ok(!/[가-힣]/.test(JSON.stringify(I18N.captions[l])), l + ' 자막에 한글');
      assert.ok(!/[가-힣]/.test(JSON.stringify(P[l])), l + ' 기도문에 한글');
    }
  }
  assert.equal(I18N.ui.ko.rPending, '이 자리의 기도문은 공식 본문을 받는 대로 넣습니다.');
  assert.equal(I18N.ui.en.rPending, 'This prayer will be added as soon as we receive the official text.');
});

test('묵주 화면은 소리를 내지 않는다(기도문은 글로만)', () => {
  const r = fs.readFileSync(path.join(here, 'shell/rosary.js'), 'utf8');
  assert.ok(!/speechSynthesis|new Audio|AudioContext|\.play\(/.test(r));
});

let pw = null;
try { pw = require('playwright'); } catch (e) { pw = null; }

// 가짜 장면: 걷기는 곧바로 도착, 앉기·일어나기 이벤트를 보낸다. 받은 API 호출을 기록한다
const FAKE = `(function (root) {
  function post(o) { setTimeout(function () { root.FlutterChurch.postMessage(JSON.stringify(o)); }, 30); }
  root.__calls = [];
  var api = {
    init: function (o) { root.FlutterChurch.postMessage(JSON.stringify({ e: 'stations', church: o.church, candle: 0, altar: 1, font: 0, entrance: 1 })); post({ e: 'firstFrame' }); },
    walkTo: function (o) { post({ e: 'walkDone', kind: o.kind, seat: o.kind === 'seat' ? 'S1' : undefined }); },
    sit: function () { post({ e: 'seated', seat: 'S1' }); },
    stand: function () { post({ e: 'stood' }); }
  };
  root.ChurchAPI = new Proxy(api, { get: function (t, k) { return function (o) { root.__calls.push([k, o]); if (t[k]) return t[k](o); }; } });
})(window);`;

function site() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rj-rosary-'));
  for (const f of ['i18n.js', 'shell.js', 'prayers.js', 'rosary.js', 'tour.js', 'shell.css']) fs.copyFileSync(path.join(here, 'shell', f), path.join(dir, f));
  fs.writeFileSync(path.join(dir, 'fake.js'), FAKE);
  const cfg = { church: 'basic', lang: 'ko', scripts: [['fake.js', 1]], captions: {} };
  fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="shell.css"></head><body><canvas id="c"></canvas>
<script src="i18n.js"></script><script>window.DEMO=${JSON.stringify(cfg)};</script><script src="shell.js"></script><script src="prayers.js"></script><script src="rosary.js"></script><script src="tour.js"></script></body></html>`);
  const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
  const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; const f = path.join(dir, p); if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': T[path.extname(f)] }); r.end(fs.readFileSync(f)); });
  return new Promise((res) => srv.listen(0, '127.0.0.1', () => res({ srv, dir, url: 'http://127.0.0.1:' + srv.address().port + '/' })));
}

// 패널 안에서 삐져나오거나 48px 보다 작은 단추가 있는가
const LAYOUT = () => {
  const bad = [], vw = innerWidth;
  for (const id of ['rosary', 'seatbar']) {
    const el = document.getElementById(id); if (el.hidden) continue;
    const r = el.getBoundingClientRect();
    if (r.left < 0 || r.right > vw + 0.5) bad.push(id + ' 화면 밖 ' + r.left + '..' + r.right);
    el.querySelectorAll('*').forEach((c) => {
      if (!c.offsetParent || c.closest('#rMenuBox')) return;
      const b = c.getBoundingClientRect();
      if (b.width && (b.right > r.right + 0.5 || b.left < r.left - 0.5)) bad.push(id + ' 삐져나옴 ' + (c.id || c.className || c.tagName));
      if (c.tagName === 'BUTTON' && (b.height < 47.5 || b.width < 47.5)) bad.push('작은 단추 ' + (c.id || c.textContent) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
      if (c.scrollWidth > c.clientWidth + 1 && getComputedStyle(c).overflowX !== 'hidden' && !c.classList.contains('rline')) bad.push('가로 넘침 ' + (c.id || c.className));
    });
  }
  return bad;
};

test('브라우저(가짜 장면): 둘러보기가 묵주 화면까지 가고, 손으로 앉기 → 시작 → 다음 → 다음 단 → 마침 → 일어나기', { skip: pw ? false : 'playwright 없음' }, async () => {
  const s = await site();
  const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const lang of LANGS) {
      const page = await browser.newPage({ viewport: { width: 344, height: 760 } });
      const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
      await page.goto(s.url + '?lang=' + lang + '&tourspeed=25');
      await page.waitForFunction(() => !document.getElementById('btnTour').disabled);
      await page.click('#btnTour');
      // 둘러보기: 앉아서 묵주 화면을 열고 1단 성모송까지 보인 뒤 앉은 채로 넘겨준다
      await page.waitForFunction(() => window.__tourLog && window.__tourLog.some((l) => l[1] === 'end'), null, { timeout: 30000 });
      let st = await page.evaluate(() => ({ log: window.__tourLog.map((l) => l[1]), seated: window.DemoShell.seated, panel: !document.getElementById('rosary').hidden, i: window.DemoShell.rosary.i, step: window.DemoShell.rosary.steps[window.DemoShell.rosary.i], text: document.getElementById('rPrayer').textContent, myst: document.getElementById('rMyst').textContent, acts: document.getElementById('acts').hidden }));
      for (const m of ['sit', 'rosary', 'rosary-sign', 'rosary-creed', 'rosary-decade', 'rosary-hand', 'end']) assert.ok(st.log.includes(m), lang + ' 둘러보기 ' + m + ' ' + st.log);
      assert.equal(st.seated, true); assert.equal(st.panel, true); assert.equal(st.acts, true, '앉은 동안 걷기 단추는 숨는다');
      assert.deepEqual([st.step.k, st.step.d, st.step.n], ['hail', 1, 3], lang + ' 1단 성모송 3');
      assert.equal(st.text, P[lang].prayers.hail.x);
      const today = P.weekday[new Date().getDay()], m1 = P[lang].sets[SETS[today]].m[0];
      assert.equal(st.myst, m1.med || m1.t, lang + ' 오늘의 신비 1단');
      assert.deepEqual(await page.evaluate(LAYOUT), [], lang + ' 344px 배치');
      // 손으로: 일어나기 → 다시 앉기 → 이어서(1단 성모송 3) → 다음 → 다음 단 → … → 마침 → 일어나기
      await page.click('#rStand');
      await page.waitForFunction(() => !window.DemoShell.seated && document.getElementById('rosary').hidden && !document.getElementById('acts').hidden);
      await page.click('#aSit');
      await page.waitForFunction(() => !document.getElementById('seatbar').hidden);
      assert.deepEqual(await page.evaluate(LAYOUT), [], lang + ' 앉은 줄 배치');
      await page.click('#sbStart');
      st = await page.evaluate(() => window.DemoShell.rosary.steps[window.DemoShell.rosary.i]);
      assert.deepEqual([st.k, st.d, st.n], ['hail', 1, 3], '이어서 하기');
      await page.click('#rNext'); await page.click('#rNext');
      st = await page.evaluate(() => window.DemoShell.rosary.steps[window.DemoShell.rosary.i]);
      assert.deepEqual([st.k, st.n], ['hail', 5]);
      await page.click('#rSkip');
      st = await page.evaluate(() => ({ s: window.DemoShell.rosary.steps[window.DemoShell.rosary.i], line: document.getElementById('rLine').textContent }));
      assert.deepEqual([st.s.k, st.s.d], ['our', 2]);
      // 1단 끝의 파티마 자리: 확인된 본문이 없으면 이름 + 안내
      await page.evaluate(() => { const R = window.DemoShell.rosary; R.i = R.steps.findIndex((x) => x.k === 'fatima' && x.d === 2) - 1; R.next(); });
      const f = await page.evaluate(() => ({ t: document.getElementById('rStep').textContent, x: document.getElementById('rPrayer').textContent }));
      assert.equal(f.t, P[lang].prayers.fatima.t);
      assert.equal(f.x, P[lang].prayers.fatima.pending ? I18N.ui[lang].rPending : P[lang].prayers.fatima.x, lang + ' 파티마 자리');
      for (let k = 0; k < 4; k++) await page.click('#rSkip');   // 3·4·5단 → 마침 성호경
      st = await page.evaluate(() => window.DemoShell.rosary.steps[window.DemoShell.rosary.i]);
      assert.equal(st.k, 'closing');
      await page.click('#rNext');
      const done = await page.evaluate(() => ({ fin: window.DemoShell.rosary.finished, txt: document.getElementById('rDone').textContent }));
      assert.equal(done.fin, true); assert.ok(done.txt.includes(P[lang].sets[SETS[today]].name));
      await page.click('#rStand');
      await page.waitForFunction(() => !window.DemoShell.seated);
      const calls = await page.evaluate(() => window.__calls.map((c) => c[0]));
      assert.ok(calls.includes('setPraying') && calls.includes('setRosary') && calls.includes('setViewInset'));
      if (lang !== 'ko') assert.ok(!/[가-힣]/.test(await page.evaluate(() => document.getElementById('rosaryRoot').textContent)), lang + ' 묵주 화면에 한글');
      assert.deepEqual(errs, [], lang + ' 오류');
      await page.close();
    }
  } finally { await browser.close(); s.srv.close(); fs.rmSync(s.dir, { recursive: true, force: true }); }
});
