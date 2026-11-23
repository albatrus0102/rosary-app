// web_demo/stations.test.mjs — 웹 데모 십자가의 길: 앱과 같은 원본(data/*.json)·출시 빌드 연작 규칙, 모든 언어 문구, 판 앞 칩·시트·다음 처로 걷기.
//   node --test web_demo/stations.test.mjs   (Playwright 가 없으면 브라우저 시험은 건너뛴다)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { generateStations, OUT_STATIONS, releaseGate, REPO } from './gen_prayers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const X = require('./shell/stations.js');
const I18N = require('./shell/i18n.js');
const LANGS = ['ko', 'it', 'en', 'es', 'pt'];
const read = (f) => fs.readFileSync(path.join(REPO, f), 'utf8');

test('shell/stations.js 는 원본에서 다시 뽑은 것과 같다', () => {
  assert.equal(fs.readFileSync(OUT_STATIONS, 'utf8'), generateStations());
});

test('공식 기도문은 앱(stations_prayers.json · 생성된 Dart)과 글자 그대로, 출처 한 줄도 같다', () => {
  const pr = JSON.parse(read('data/stations_prayers.json'));
  const dart = read('lib/domain/stations_prayers_data.dart');
  assert.equal(X.credit, pr.source.credit);
  assert.deepEqual(X.opening, pr.opening); assert.deepEqual(X.toStation, pr.to_station); assert.deepEqual(X.verse, pr.verse); assert.deepEqual(X.after, pr.after);
  assert.equal(X.openingRubric, pr.intro_rubrics[pr.intro_rubrics.length - 1]);
  for (const st of X.stations) {
    const p = pr.stations[st.n - 1];
    assert.equal(st.announce, p.announce); assert.deepEqual(st.prayer, p.prayer);
    for (const l of st.prayer) assert.ok(dart.includes(JSON.stringify(l)) || dart.includes("'" + l + "'"), '앱 Dart 에 없는 줄: ' + l);
  }
  assert.equal(X.stations.length, 14);
});

test('연작: 출시 빌드 규칙대로(숨긴 연작 없음 · 대체 배정) · 그림은 장면이 싣는 묶음', () => {
  const gate = releaseGate(read('lib/app/release_gate.dart'));
  assert.ok(gate.hidden.includes('previati'));
  for (const h of gate.hidden) assert.ok(!X.series[h], '숨긴 연작이 실렸다: ' + h);
  for (const [c, id] of Object.entries(X.assign)) {
    assert.ok(X.series[id], c + ' → ' + id);
    assert.ok(fs.existsSync(path.join(REPO, 'assets/church', X.series[id].pack)), X.series[id].pack);
  }
  assert.equal(X.assign.stpeter, gate.overrides.stpeter);
  assert.ok(!JSON.stringify(X).includes('previati') && !JSON.stringify(X).includes('Previati'));
});

test('모든 언어에 십자가의 길 문구가 있고, 한국어가 아닌 문구에 한글이 없다', () => {
  const keys = Object.keys(I18N.ui.ko).filter((k) => /^s[A-Z]/.test(k));
  assert.ok(keys.length >= 20);
  for (const l of LANGS) for (const k of keys) {
    assert.ok(I18N.ui[l][k], l + ' ' + k);
    if (l !== 'ko') assert.ok(!/[가-힣]/.test(I18N.ui[l][k]), l + ' ' + k + ' 에 한글');
  }
  // 한국어가 아닌 출처 한 줄에 쓰는 칸에도 한글이 없다
  for (const s of Object.values(X.series)) for (const k of ['artist', 'year', 'photo', 'license']) assert.ok(!/[가-힣]/.test(s[k]), k + ' ' + s[k]);
});

let pw = null;
try { pw = require('playwright'); } catch (e) { pw = null; }

const FAKE = `(function (root) {
  function post(o) { setTimeout(function () { root.FlutterChurch.postMessage(JSON.stringify(o)); }, 30); }
  root.__calls = [];
  var api = {
    init: function (o) { root.FlutterChurch.postMessage(JSON.stringify({ e: 'stations', church: o.church, candle: 0, altar: 1, font: 0, entrance: 1, cross: 14 })); post({ e: 'firstFrame' }); },
    walkTo: function (o) { post({ e: 'walkDone', kind: o.kind, index: o.index || 0 }); }
  };
  root.ChurchAPI = new Proxy(api, { get: function (t, k) { return function (o) { root.__calls.push([k, o]); if (t[k]) return t[k](o); }; } });
})(window);`;

function site() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rj-stations-'));
  for (const f of ['i18n.js', 'shell.js', 'prayers.js', 'rosary.js', 'stations.js', 'cross.js', 'tour.js', 'shell.css']) fs.copyFileSync(path.join(here, 'shell', f), path.join(dir, f));
  fs.copyFileSync(path.join(REPO, 'assets/church/cross_pack.js'), path.join(dir, 'cross_pack.js'));
  fs.writeFileSync(path.join(dir, 'fake.js'), FAKE);
  const cfg = { church: 'basic', lang: 'ko', scripts: [['fake.js', 1]], captions: {} };
  fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="shell.css"></head><body><canvas id="c"></canvas>
<script src="i18n.js"></script><script>window.DEMO=${JSON.stringify(cfg)};</script><script src="shell.js"></script><script src="prayers.js"></script><script src="rosary.js"></script><script src="stations.js"></script><script src="cross.js"></script><script src="tour.js"></script></body></html>`);
  const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
  const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; const f = path.join(dir, p); if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': T[path.extname(f)] }); r.end(fs.readFileSync(f)); });
  return new Promise((res) => srv.listen(0, '127.0.0.1', () => res({ srv, dir, url: 'http://127.0.0.1:' + srv.address().port + '/' })));
}

const LAYOUT = () => {
  const bad = [], vw = innerWidth;
  const sheet = document.querySelector('#crossSheet .sheet');
  const r = sheet.getBoundingClientRect();
  if (r.left < -0.5 || r.right > vw + 0.5) bad.push('시트 화면 밖');
  sheet.querySelectorAll('*').forEach((c) => {
    if (!c.offsetParent) return;
    const b = c.getBoundingClientRect();
    if (b.width && (b.right > r.right + 0.5 || b.left < r.left - 0.5)) bad.push('삐져나옴 ' + (c.id || c.className || c.tagName));
    if (c.tagName === 'BUTTON' && (b.height < 47.5 || b.width < 47.5)) bad.push('작은 단추 ' + (c.id || c.textContent));
  });
  if (document.documentElement.scrollWidth > vw + 1) bad.push('가로 스크롤');
  return bad;
};

test('브라우저(가짜 장면): 「십자가의 길」 → 1처 시트 → 다음 처로(걸어감) → 2처 시트 · 칩 · 마치며', { skip: pw ? false : 'playwright 없음' }, async () => {
  const s = await site();
  const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const lang of LANGS) {
      const page = await browser.newPage({ viewport: { width: 344, height: 760 } });
      const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
      await page.goto(s.url + '?lang=' + lang);
      await page.waitForFunction(() => !document.getElementById('btnFree').disabled);
      await page.click('#btnFree');
      await page.waitForFunction(() => document.getElementById('building').hidden && !document.getElementById('aWay').hidden);
      await page.click('#aWay');
      await page.waitForFunction(() => !document.getElementById('crossSheet').hidden);
      let st = await page.evaluate(() => ({ prog: document.getElementById('csProg').textContent, body: document.getElementById('csBody').textContent, bg: getComputedStyle(document.getElementById('csArt')).backgroundImage.slice(0, 30) }));
      assert.equal(st.prog, '1 / 14');
      await page.waitForFunction(() => getComputedStyle(document.getElementById('csArt')).backgroundImage.startsWith('url("data:image/webp'));
      if (lang === 'ko') {
        assert.ok(st.body.includes(X.stations[0].title) && st.body.includes(X.stations[0].announce) && st.body.includes(X.opening.lines[0]) && st.body.includes(X.credit), 'ko 1처 본문');
        assert.ok(st.body.includes(X.series.fugel.ko));
      } else {
        assert.ok(st.body.includes(I18N.ui[lang].rPending), lang + ' 안내');
        assert.ok(!/[가-힣]/.test(await page.evaluate(() => document.querySelector('#crossSheet').textContent)), lang + ' 시트에 한글');
      }
      assert.deepEqual(await page.evaluate(LAYOUT), [], lang + ' 시트 배치');
      await page.click('#csRight');   // 다음 처로 → 닫고 2처 판으로 걸어가 닿으면 다시 열린다
      await page.waitForFunction(() => !document.getElementById('crossSheet').hidden && document.getElementById('csProg').textContent === '2 / 14');
      const walk = await page.evaluate(() => window.__calls.filter((c) => c[0] === 'walkTo').map((c) => c[1]));
      assert.deepEqual(walk.slice(-2), [{ kind: 'cross', index: 0 }, { kind: 'cross', index: 1 }]);
      await page.click('#csLeft');   // 닫기
      // 판 앞에 서면 칩 → 누르면 그 처
      await page.evaluate(() => window.FlutterChurch.postMessage(JSON.stringify({ e: 'crossNear', n: 14 })));
      await page.waitForFunction(() => !document.getElementById('crossChip').hidden);
      const chip = await page.evaluate(() => { const b = document.getElementById('crossChip').getBoundingClientRect(); return { t: document.getElementById('crossChip').textContent, w: b.width, h: b.height, r: b.right }; });
      assert.ok(chip.h >= 48 && chip.r <= 344, JSON.stringify(chip));
      assert.ok(chip.t.includes(lang === 'ko' ? '14처' : 'XIV'), chip.t);
      await page.click('#crossChip');
      await page.waitForFunction(() => document.getElementById('csProg').textContent === '14 / 14');
      await page.click('#csRight');   // 마치며
      const end = await page.evaluate(() => ({ prog: document.getElementById('csProg').textContent, right: document.getElementById('csRight').textContent }));
      assert.equal(end.prog, I18N.ui[lang].sEnd); assert.equal(end.right, I18N.ui[lang].sFinish);
      await page.click('#csRight');
      await page.waitForFunction(() => document.getElementById('crossSheet').hidden);
      assert.deepEqual(errs, [], lang + ' 오류');
      await page.close();
    }
  } finally { await browser.close(); s.srv.close(); fs.rmSync(s.dir, { recursive: true, force: true }); }
});
