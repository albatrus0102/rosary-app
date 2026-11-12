// Playwright check of admin/index.html with a mocked supabase-js (no network, no real backend).
// Usage: node admin_ui_test.cjs [outDir]
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const adminDir = path.resolve(__dirname, '../../admin');
const out = process.argv[2] || '/tmp/admin_shots';
fs.mkdirSync(out, { recursive: true });

function day(offset) {
  const d = new Date(Date.now() + 9 * 3600e3 - offset * 86400e3);
  return d.toISOString().slice(0, 10);
}
function mockData(days, { empty = false } = {}) {
  const rnd = (i, a, b) => Math.round(a + (b - a) * (0.5 + 0.5 * Math.sin(i * 1.7) * Math.cos(i * 0.37)));
  const ds = Array.from({ length: days }, (_, i) => day(days - 1 - i));
  const z = (n) => (empty ? 0 : n);
  return {
    admin_overview: { days, total_users: z(1284), new_users: z(Math.round(days * 6.4)), dau: z(142), dau_yesterday: z(155), wau: z(463), mau: z(802), usage_consented_users: z(911), avg_sessions_per_active_user: z(2.34) },
    admin_dau: ds.map((d, i) => ({ day: d, dau: z(rnd(i, 90, 160)), sessions: z(rnd(i, 180, 340)), new_users: z(rnd(i, 2, 14)) })),
    admin_retention: empty ? { cohorts: [], overall: null } : {
      cohorts: Array.from({ length: 12 }, (_, i) => {
        const size = rnd(i, 30, 80), mk = (e, r) => ({ eligible: e, retained: Math.round(e * r), rate: e ? Math.round(r * 1e4) / 1e4 : null });
        const e1 = i < 11 ? size : Math.round(size / 2);
        return { cohort_week: day(7 * i + 3), size, tracked: Math.round(size * 0.7), d1: mk(Math.round(e1 * .7), 0.42 - i * .01), d7: i < 10 ? mk(Math.round(size * .7), 0.24 - i * 0.004) : mk(0, 0), d30: i < 7 ? mk(Math.round(size * .7), 0.13) : mk(0, 0) };
      }),
      overall: { size: 560, tracked: 400, d1: { eligible: 390, retained: 150, rate: 0.3846 }, d7: { eligible: 300, retained: 66, rate: 0.22 }, d30: { eligible: 120, retained: 14, rate: 0.1167 } },
    },
    admin_feature_usage: empty ? [] : [['app_open', 3200, 702], ['prayer_start', 1890, 520], ['prayer_finish', 1544, 498], ['decade_complete', 7210, 480], ['church_enter', 640, 210], ['setting_change', 412, 150], ['stats_open', 330, 190], ['rosary_style_change', 120, 60], ['leader_voice_change', 90, 51], ['church_candle', 80, 40], ['mode_change', 70, 33], ['avatar_save', 15, 9]].map(([name, count, users]) => ({ category: name.startsWith('church') || name === 'avatar_save' ? 'church' : 'usage', name, count, users })),
    admin_screens: empty ? [] : [['home', 5100, 780], ['prayer', 2400, 560], ['stats', 800, 310], ['settings', 640, 280], ['church', 600, 200], ['church_select', 520, 205], ['rosary_styles', 130, 70], ['account', 90, 60]].map(([screen, count, users]) => ({ screen, count, users })),
    admin_prayer_daily: empty ? { days, daily: ds.map((d) => ({ day: d, records: 0, completed: 0, minutes: 0, users: 0, by_mystery: { joyful: 0, luminous: 0, sorrowful: 0, glorious: 0 } })), totals: { records: 0, completed: 0, minutes: 0, by_mystery: {} }, users: 0 } : (() => {
      const daily = ds.map((d, i) => { const bm = { joyful: rnd(i, 4, 20), luminous: rnd(i + 1, 1, 8), sorrowful: rnd(i + 2, 3, 15), glorious: rnd(i + 3, 5, 22) }; const c = bm.joyful + bm.luminous + bm.sorrowful + bm.glorious; return { day: d, records: c + 4, completed: c, minutes: c * 14.5, users: Math.round(c * .8), by_mystery: bm }; });
      const sum = (f) => daily.reduce((a, d) => a + f(d), 0);
      return { days, daily, users: 402, totals: { records: sum((d) => d.records), completed: sum((d) => d.completed), minutes: sum((d) => d.minutes), by_mystery: { joyful: sum((d) => d.by_mystery.joyful), luminous: sum((d) => d.by_mystery.luminous), sorrowful: sum((d) => d.by_mystery.sorrowful), glorious: sum((d) => d.by_mystery.glorious) } } };
    })(),
    admin_church_usage: empty ? [] : [['seoul_cathedral', 210, 90, 63000, 24000, 180, 41], ['myeongdong', 160, 71, 41000, 15000, 120, 25], ['yakhyeon', 90, 40, 20500, 7000, 60, 10], ['a_very_long_church_identifier_for_wrapping_tests', 30, 12, 6000, 1800, 20, 4]].map(([church, enters, users, seconds, sat_seconds, sits, candles]) => ({ church, enters, users, seconds, sat_seconds, sits, candles })),
    admin_versions: empty ? { app_versions: [], os: [], platforms: [] } : { app_versions: [{ version: '1.2.0', devices: 540, users: 520 }, { version: '1.1.1', devices: 260, users: 250 }, { version: '1.1.0', devices: 120, users: 118 }, { version: '1.0.0', devices: 40, users: 39 }], os: [{ os: 'Android 14', devices: 380 }, { os: 'iOS 17.5', devices: 210 }, { os: 'Android 13', devices: 190 }, { os: 'iOS 16.7', devices: 110 }, { os: 'Android 12', devices: 70 }], platforms: [{ platform: 'android', users: 600 }, { platform: 'ios', users: 320 }] },
    admin_errors: empty ? [] : [{ where: 'audio.player', message: 'PlatformException: audio focus lost', count: 42, users: 17, last_at: new Date().toISOString() }, { where: 'sync.upload', message: 'SocketException: Failed host lookup', count: 31, users: 22, last_at: new Date(Date.now() - 86400e3).toISOString() }, { where: 'ui', message: 'RenderFlex overflowed by 12 pixels on the right', count: 5, users: 4, last_at: new Date(Date.now() - 3 * 86400e3).toISOString() }],
    admin_consent_rates: { total_users: z(1284), kinds: [['usage', 911], ['sync', 702], ['church', 388], ['diagnostics', 645]].map(([kind, granted]) => ({ kind, granted: z(granted), total: z(1284), rate: z(Math.round(granted / 1284 * 1e4) / 1e4) })) },
  };
}

const FAKE_LIB = `
(function(){
  var cfg = window.__MOCK || {};
  window.__calls = [];
  window.supabase = { createClient: function(url, key){
    window.__calls.push(['createClient', url, key]);
    var session = cfg.session ? { user: { email: cfg.email || 'admin@example.test' } } : null;
    return {
      auth: {
        getSession: function(){ return Promise.resolve({ data: { session: session } }); },
        signInWithPassword: function(a){
          window.__calls.push(['signIn', a.email]);
          if (cfg.badPassword) return Promise.resolve({ data: {}, error: { message: 'Invalid login credentials' } });
          session = { user: { email: a.email } };
          return Promise.resolve({ data: { user: session.user, session: session }, error: null });
        },
        signOut: function(){ session = null; return Promise.resolve({ error: null }); }
      },
      rpc: function(name, args){
        window.__calls.push(['rpc', name, args || {}]);
        if (name === 'is_admin') return Promise.resolve({ data: cfg.isAdmin !== false, error: null });
        if (cfg.failRpc && cfg.failRpc === name) return Promise.resolve({ data: null, error: { message: 'boom: timeout' } });
        var days = (args && args.days) || 30;
        var set = (cfg.data || {})[days] || (cfg.data || {})[30] || {};
        var d = set[name];
        return Promise.resolve({ data: d === undefined ? null : d, error: null });
      }
    };
  } };
})();`;

const CONFIG = 'window.ADMIN_CONFIG = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "anon-test" };';

(async () => {
  const server = http.createServer((req, res) => {
    const p = req.url.split('?')[0];
    const f = path.join(adminDir, p === '/' ? 'index.html' : p);
    if (!f.startsWith(adminDir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
    const ext = path.extname(f);
    res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[ext] || 'text/plain' });
    res.end(fs.readFileSync(f));
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  let failed = 0;
  const ok = (c, m) => { console.log((c ? 'PASS  ' : 'FAIL  ') + m); if (!c) failed++; };

  async function open({ mock, scheme = 'light', width = 1280, height = 900, config = CONFIG }) {
    const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/cdn.jsdelivr.net/**', (r) => r.fulfill({ contentType: 'application/javascript', body: FAKE_LIB }));
    await page.route('**/config.js', (r) => r.fulfill({ contentType: 'application/javascript', body: config }));
    await page.addInitScript((m) => { window.__MOCK = m; }, mock);
    await page.goto(base);
    return { page, ctx, errors };
  }
  const dataFn = (o) => ({ 7: mockData(7, o), 30: mockData(30, o), 90: mockData(90, o) });

  // 1. login screen (light) + bad password
  {
    const { page, ctx, errors } = await open({ mock: { badPassword: true, data: dataFn() } });
    await page.waitForSelector('#login-form');
    await page.screenshot({ path: `${out}/01_login_light.png` });
    await page.fill('#email', 'x@y.z'); await page.fill('#password', 'bad');
    await page.click('#login-btn');
    await page.waitForSelector('#login-msg:not([hidden])');
    ok((await page.textContent('#login-msg')).includes('로그인하지 못했습니다'), 'bad login shows error');
    ok(errors.length === 0, 'no page errors (login)');
    await ctx.close();
  }
  // 2. not an admin
  {
    const { page, ctx } = await open({ mock: { isAdmin: false, data: dataFn() } });
    await page.fill('#email', 'user@example.test'); await page.fill('#password', 'pw');
    await page.click('#login-btn');
    await page.waitForSelector('#notice-view:not([hidden])');
    ok((await page.textContent('#notice-title')).includes('관리자 권한이 없습니다'), 'not-admin message shown');
    await page.screenshot({ path: `${out}/02_not_admin.png` });
    const calls = await page.evaluate(() => window.__calls.filter((c) => c[0] === 'rpc').map((c) => c[1]));
    ok(calls.length === 1 && calls[0] === 'is_admin', 'no aggregate RPC is called for non-admins');
    await ctx.close();
  }
  // 3. admin desktop light
  {
    const { page, ctx, errors } = await open({ mock: { isAdmin: true, data: dataFn() } });
    await page.fill('#email', 'admin@example.test'); await page.fill('#password', 'pw');
    await page.click('#login-btn');
    await page.waitForSelector('#dau svg');
    await page.waitForSelector('#consent svg');
    await page.waitForTimeout(200);
    const calls = await page.evaluate(() => window.__calls.filter((c) => c[0] === 'rpc').map((c) => c[1]));
    for (const n of ['admin_overview', 'admin_dau', 'admin_retention', 'admin_feature_usage', 'admin_screens', 'admin_prayer_daily', 'admin_church_usage', 'admin_versions', 'admin_errors', 'admin_consent_rates'])
      ok(calls.includes(n), `rpc ${n} called`);
    ok((await page.textContent('#kpi')).includes('1,284'), 'KPI total users rendered');
    await page.screenshot({ path: `${out}/03_dashboard_light_desktop.png`, fullPage: true });
    // range selector
    await page.click('#range button[data-days="7"]');
    await page.waitForTimeout(200);
    const dauArgs = await page.evaluate(() => window.__calls.filter((c) => c[1] === 'admin_dau').map((c) => c[2].days));
    ok(dauArgs.includes(7), 'range 7 calls admin_dau(7)');
    await page.click('#range button[data-days="90"]');
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}/04_dashboard_90d.png`, fullPage: true });
    // tooltip
    const svg = await page.$('#dau svg');
    const box = await svg.boundingBox();
    await page.mouse.move(box.x + box.width * 0.6, box.y + 100);
    await page.waitForTimeout(100);
    ok(!(await page.$eval('#tip', (e) => e.hidden)), 'tooltip appears on hover');
    await page.screenshot({ path: `${out}/05_tooltip.png`, clip: { x: 0, y: Math.max(0, box.y - 60), width: 1280, height: 340 } });
    // no horizontal overflow
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal overflow (desktop)');
    // logout
    await page.click('#logout');
    await page.waitForSelector('#login-form:not([hidden])');
    ok(true, 'logout returns to login');
    ok(errors.length === 0, 'no page errors (dashboard): ' + errors.join(';'));
    await ctx.close();
  }
  // 4. dark mobile, existing session
  {
    const { page, ctx, errors } = await open({ scheme: 'dark', width: 390, height: 844, mock: { isAdmin: true, session: true, data: dataFn() } });
    await page.waitForSelector('#consent svg');
    await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal page overflow (mobile)');
    await page.screenshot({ path: `${out}/06_dashboard_dark_mobile.png`, fullPage: true });
    ok(errors.length === 0, 'no page errors (mobile dark)');
    await ctx.close();
  }
  // 5. dark desktop
  {
    const { page, ctx } = await open({ scheme: 'dark', mock: { isAdmin: true, session: true, data: dataFn() } });
    await page.waitForSelector('#consent svg');
    await page.screenshot({ path: `${out}/07_dashboard_dark_desktop.png`, fullPage: true });
    await ctx.close();
  }
  // 6. empty data
  {
    const { page, ctx, errors } = await open({ mock: { isAdmin: true, session: true, data: dataFn({ empty: true }) } });
    await page.waitForSelector('#dau .state');
    await page.waitForTimeout(200);
    ok((await page.textContent('#dau')).includes('활성 사용자가 없습니다'), 'empty state text');
    await page.screenshot({ path: `${out}/08_empty.png`, fullPage: true });
    ok(errors.length === 0, 'no page errors (empty)');
    await ctx.close();
  }
  // 7. one RPC fails
  {
    const { page, ctx } = await open({ mock: { isAdmin: true, session: true, failRpc: 'admin_errors', data: dataFn() } });
    await page.waitForSelector('#errors .err');
    ok((await page.textContent('#errors')).includes('boom'), 'per-section error message');
    ok(await page.$('#dau svg') !== null, 'other sections still render');
    await page.screenshot({ path: `${out}/09_section_error.png`, fullPage: true });
    await ctx.close();
  }
  // 8. missing config
  {
    const { page, ctx } = await open({ mock: {}, config: '' });
    await page.waitForSelector('#notice-view:not([hidden])');
    ok((await page.textContent('#notice-title')).includes('설정이 필요합니다'), 'missing config notice');
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(failed ? `\n${failed} UI check(s) failed` : '\nall UI checks passed');
  process.exit(failed ? 1 : 0);
})();
