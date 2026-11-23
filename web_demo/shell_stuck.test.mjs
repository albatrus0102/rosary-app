// web_demo/shell_stuck.test.mjs — 「성당을 짓는 중」이 끝없이 돌지 않는가(2026-11-23 멈춤 결함의 회귀 시험).
//   node --test web_demo/shell_stuck.test.mjs   (Playwright 가 없으면 브라우저 시험은 건너뛴다)
// 원인: 장면(main.js)이 1.8초 뒤 혼자 기본 성당을 짓고 한 번뿐인 firstFrame 을 먼저 보내 버려서, 그 뒤 누른 「둘러보기」의 「짓는 중」이 걷히지 않았다.
// 고침: 셸이 ChurchNoAutoStart 로 자동 시작을 끄고, 첫 프레임이 이미 쓰였으면 심장 박동(그린 프레임 수)으로 보고, 늦거나 깨지면 「다시 시도」 안내.
// 진짜 장면 대신 가짜 장면(같은 이벤트 규약)을 실어 셸만 빠르게 본다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '..');
const require = createRequire(import.meta.url);

test('장면은 ChurchNoAutoStart 가 있으면 혼자 시작하지 않고, 셸은 스크립트를 싣기 전에 그것을 켠다', () => {
  const main = fs.readFileSync(path.join(REPO, 'assets/church/main.js'), 'utf8');
  assert.match(main, /if \(!App\.started && !root\.ChurchNoAutoStart\) start\(\{\}\)/, 'main.js 자동 시작에 ChurchNoAutoStart 확인이 없다');
  const shell = fs.readFileSync(path.join(here, 'shell/shell.js'), 'utf8');
  const iFlag = shell.indexOf('root.ChurchNoAutoStart = true'), iLoad = shell.lastIndexOf('loadAll();');
  assert.ok(iFlag > 0 && iLoad > iFlag, 'shell.js 가 loadAll() 전에 ChurchNoAutoStart 를 켜야 한다');
  assert.match(shell, /BUILD_SLOW_MS/, '짓는 중 안전망(BUILD_SLOW_MS)이 없다');
});

let pw = null;
try { pw = require('playwright'); } catch (e) { pw = null; }

// 가짜 장면: ?fake= 로 행동을 고른다
const FAKE = `(function (root) {
  var m = (/[?&]fake=(\\w+)/.exec(root.location.search) || [])[1] || 'ok', drawn = 0, started = false;
  function post(o) { root.FlutterChurch.postMessage(JSON.stringify(o)); }
  root.__autoStartOff = !!root.ChurchNoAutoStart;
  function startLoop(ff) { setInterval(function () { drawn += 10; post({ e: 'hb', f: drawn, st: 'run' }); }, 200); if (ff) setTimeout(function () { post({ e: 'firstFrame' }); }, ff); }
  root.ChurchAPI = {
    init: function (o) {
      if (m === 'throw') throw new Error('boom');
      if (m === 'nostart') return;
      post({ e: 'stations', church: o.church, candle: 0, altar: 1, font: 0, entrance: 1 });
      if (m === 'preposted') return;   // 첫 프레임은 이미 보냈다(아래) — 다시 오지 않는다
      if (m === 'gl') { setTimeout(function () { post({ e: 'gl', lost: 1 }); post({ e: 'firstFrame' }); }, 100); return; }
      if (m === 'err') { setTimeout(function () { post({ e: 'jsError', kind: 'error', msg: 'x is undefined' }); }, 50); startLoop(600); return; }
      startLoop(m === 'slow' ? 1500 : m === 'never' ? 0 : 150);
    },
    setInput: function () {}, setJoystick: function () {}, setViewMode: function () {}, walkTo: function () {}, cancelWalk: function () {}, setPraying: function () {}, setRosary: function () {}
  };
  // 옛 main.js 처럼: 셸이 끄지 않았다면(또는 preposted) 혼자 시작해 첫 프레임을 써 버린다
  if (m === 'preposted') setTimeout(function () { started = true; post({ e: 'stations', church: 'basic', candle: 0, altar: 1, font: 0, entrance: 1 }); startLoop(50); }, 0);
})(window);`;

function site() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rj-stuck-'));
  for (const f of ['i18n.js', 'shell.js', 'tour.js', 'shell.css']) fs.copyFileSync(path.join(here, 'shell', f), path.join(dir, f));
  fs.writeFileSync(path.join(dir, 'fake.js'), FAKE);
  const cfg = { church: 'yeouido', lang: 'ko', scripts: [['fake.js', 1]], captions: {} };
  fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="shell.css"></head><body><canvas id="c"></canvas>
<script src="i18n.js"></script><script>window.DEMO=${JSON.stringify(cfg)};</script><script src="shell.js"></script><script src="tour.js"></script></body></html>`);
  const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
  const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; const f = path.join(dir, p); if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': T[path.extname(f)] }); r.end(fs.readFileSync(f)); });
  return new Promise((res) => srv.listen(0, '127.0.0.1', () => res({ srv, dir, url: 'http://127.0.0.1:' + srv.address().port + '/' })));
}

test('셸: 짓는 중 안전망(가짜 장면)', { skip: pw ? false : 'playwright 없음' }, async () => {
  const s = await site();
  const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    async function run(fake, q = '') {
      const page = await browser.newPage();
      await page.goto(s.url + '?fake=' + fake + q);
      await page.waitForFunction(() => !document.getElementById('btnTour').disabled, null, { timeout: 10000 });
      if (fake === 'preposted') await page.waitForFunction(() => window.DemoShell.firstFrame, null, { timeout: 5000 });
      await page.click('#btnTour');
      return page;
    }
    const state = (page) => page.evaluate(() => ({ building: !document.getElementById('building').hidden, stuck: window.DemoShell.stuck, stuckShown: !document.getElementById('stuck').hidden, tour: !!window.DemoShell.tour, off: window.__autoStartOff, msg: document.getElementById('stuckMsg').textContent }));
    // 정상: 첫 프레임이 오면 걷히고 둘러보기가 시작된다. 장면의 자동 시작은 꺼져 있다
    let p = await run('ok');
    await p.waitForFunction(() => document.getElementById('building').hidden, null, { timeout: 5000 });
    let st = await state(p);
    assert.equal(st.tour, true); assert.equal(st.stuckShown, false); assert.equal(st.off, true, 'ChurchNoAutoStart 가 장면보다 먼저 켜져야 한다');
    await p.close();
    // 회귀(원래 결함): 장면이 입장 전에 첫 프레임을 이미 보냈다 → 심장 박동으로 걷혀야 한다(예전에는 60초 동안 돌았다)
    p = await run('preposted');
    const ok = await p.waitForFunction(() => document.getElementById('building').hidden, null, { timeout: 5000 }).then(() => true, () => false);
    st = await state(p);
    assert.ok(ok, '첫 프레임이 이미 쓰인 장면에서 「짓는 중」이 걷히지 않았다'); assert.equal(st.tour, true);
    await p.close();
    // 느림: 정한 시간이 지나면 「다시 시도」 안내, 그 뒤 첫 프레임이 오면 안내도 걷히고 이어 간다
    p = await run('slow', '&slowms=500');
    await p.waitForFunction(() => window.DemoShell.stuck === 'slow', null, { timeout: 3000 });
    st = await state(p);
    assert.equal(st.stuckShown, true); assert.match(st.msg, /오래/);
    await p.waitForFunction(() => document.getElementById('building').hidden && document.getElementById('stuck').hidden && window.DemoShell.tour, null, { timeout: 5000 });
    await p.close();
    // 끝내 오지 않음: 안내가 남고 단추가 있다
    p = await run('never', '&slowms=400');
    await p.waitForFunction(() => window.DemoShell.stuck === 'slow', null, { timeout: 3000 });
    assert.equal(await p.isVisible('#btnRetry'), true);
    await p.close();
    // init 예외 · 장면이 시작하지 못함 · 짓는 중 잡히지 않은 오류 · WebGL 문맥 잃음 → 바로 안내
    for (const [fake, kind] of [['throw', 'fail'], ['nostart', 'fail'], ['gl', 'gl']]) {
      p = await run(fake);
      await p.waitForFunction((k) => window.DemoShell.stuck === k, kind, { timeout: 3000 });
      st = await state(p);
      assert.equal(st.stuckShown, true, fake); assert.equal(st.tour, false, fake + ': 깨진 장면에서 둘러보기를 시작하면 안 된다');
      await p.close();
    }
    p = await run('err');
    await p.waitForFunction(() => window.DemoShell.stuck === 'fail', null, { timeout: 3000 });
    await p.waitForFunction(() => document.getElementById('stuck').hidden && window.DemoShell.tour, null, { timeout: 5000 });   // 오류 뒤에도 첫 프레임이 오면 이어 간다
    await p.close();
    // 다른 언어: 안내 문구에 한글이 없다
    p = await run('never', '&slowms=300&lang=it');
    await p.waitForFunction(() => window.DemoShell.stuck === 'slow', null, { timeout: 3000 });
    const t = await p.evaluate(() => document.getElementById('stuck').textContent);
    assert.ok(!/[가-힣]/.test(t), t); assert.match(t, /Riprova/);
    await p.close();
  } finally { await browser.close(); s.srv.close(); fs.rmSync(s.dir, { recursive: true, force: true }); }
});
