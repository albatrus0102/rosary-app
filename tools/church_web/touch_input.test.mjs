// 걷는 동안 앱(Flutter)이 3D 화면 위 손가락을 맡아 보내는 입력(setInput look/dx/dy/k)이 웹에 실제로 닿고,
// 걸으면서(자동 따라가기가 켜진 채) 시점을 돌려도 따라가기가 yaw 를 되돌리지 않는지 본다.
// 사용자 제보(Galaxy Fold): "조이스틱으로 걸으면서 다른 손가락으로 시점을 돌리기를 하는데 왜 안되지?"
// 원인 1: bridge.js 의 METHODS 에 setInput 이 없어 window.ChurchAPI.setInput 이 없었다 → Flutter 의 호출이 조용히 버려졌다.
// 실행: node --test tools/church_web/touch_input.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = path.join(root, 'assets', 'church');
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');

function controls() {
  const win = { innerWidth: 400, innerHeight: 800, addEventListener() {}, document: null, console };
  win.window = win;
  vm.runInNewContext(read('controls.js'), win);
  const handlers = {};
  const canvas = { clientWidth: 400, addEventListener(t, f) { handlers[t] = f; }, setPointerCapture() {} };
  const ctl = win.ChurchControls.create(canvas);
  return { ctl, C: win.ChurchControls, ev: (type, id, x, y) => handlers[type]({ type, pointerId: id, clientX: x, clientY: y, pointerType: 'touch' }) };
}

// main.js 의 `var api = { ... }` 에 있는 메서드 이름들
function mainApiNames() {
  const src = read('main.js');
  const block = src.slice(src.indexOf('  var api = {'), src.indexOf('\n  };', src.indexOf('  var api = {')));
  return [...block.matchAll(/^ {4}(\w+): function/gm)].map((m) => m[1]);
}

test('bridge: main.js 의 모든 api 메서드가 window.ChurchAPI 로 나간다(setInput 포함)', () => {
  const names = mainApiNames();
  assert.ok(names.includes('setInput') && names.includes('setPerfHud') && names.includes('setCamera'));
  const win = { console };
  win.window = win;
  vm.runInNewContext(read('bridge.js'), win);
  // 바인드 전에도 목록에 있어야 한다(Flutter 의 churchApiScript 는 메서드가 있을 때만 부른다).
  for (const m of names) assert.equal(typeof win.ChurchAPI[m], 'function', `ChurchAPI.${m} 없음`);
  // 바인드 후 setInput 이 실제 api 로 간다(문자열 인자도).
  const got = [];
  const api = {};
  for (const m of names) api[m] = (o) => got.push([m, o]);
  api.brandNew = (o) => got.push(['brandNew', o]);
  win.ChurchAPI._bind({ api });
  win.ChurchAPI.setInput({ look: true, dx: 3, dy: -1 });
  win.ChurchAPI.setInput('{"k":1.2}');
  assert.equal(JSON.stringify(got), JSON.stringify([['setInput', { look: true, dx: 3, dy: -1 }], ['setInput', { k: 1.2 }]]));
  // 목록에 적는 것을 잊은 새 메서드도 바인드 때 내보낸다.
  assert.equal(typeof win.ChurchAPI.brandNew, 'function');
});

test('bridge: Flutter 가 부르는 모든 메서드가 웹 목록에 있다(church_scene_controller.dart)', () => {
  const dart = fs.readFileSync(path.join(root, 'lib', 'church', 'church_scene_controller.dart'), 'utf8');
  const called = new Set([...dart.matchAll(/_(?:call|invoke)\('(\w+)'/g)].map((m) => m[1]));
  const win = { console };
  win.window = win;
  vm.runInNewContext(read('bridge.js'), win);
  const methods = win.ChurchAPI._methods;
  assert.ok(called.has('setInput') && called.has('setJoystick'));
  for (const m of called) assert.ok(methods.includes(m), `bridge.js METHODS 에 '${m}' 없음 — 기기에서 조용히 버려진다`);
});

test('lookBy: 한 축이 빠져도 다른 축은 적용한다, 잘못된 값은 버린다', () => {
  const { ctl } = controls();
  const y0 = ctl.yaw, p0 = ctl.pitch;
  ctl.lookBy(40);
  assert.ok(Math.abs(ctl.yaw - (y0 - 40 * 0.0065)) < 1e-9);
  assert.equal(ctl.pitch, p0);
  ctl.lookBy(undefined, 20);
  assert.ok(ctl.pitch > p0);
  const y1 = ctl.yaw;
  ctl.lookBy(NaN, 5); ctl.lookBy('x', 0);
  assert.equal(ctl.yaw, y1);
});

// 한 프레임: 앱이 보낸 시점 끌기를 적용하고(main.js setInput), 그다음 자동 따라가기(main.js updateCamera → followStep).
function frame(env, t, dx) {
  if (dx) env.ctl.lookBy(dx, 0);
  env.ctl.now = t;
  return env.C.followStep(env.ctl, { follow: true, walkSt: env.walkSt || false, seated: false, spot: false, t, meYaw: env.meYaw, speed: 1.4, dt: 1 / 60 });
}

test('걸으면서(자동 따라가기 켬) 앱 시점 손가락으로 돌리면 yaw 는 끈 만큼만 바뀐다(따라가기가 되돌리지 않음)', () => {
  const env = controls();
  env.ctl.ext = true;
  env.meYaw = 0.3; env.ctl.yaw = 0.2;   // 아바타가 카메라와 거의 같은 쪽으로 걷는 중(따라가기 조건 충족)
  // 먼저 손가락 없이 3초 걸으면 따라가기가 yaw 를 아바타 쪽으로 당긴다(조건이 정말 켜져 있음을 확인).
  let t = 10, pulled = 0;
  for (let i = 0; i < 180; i++) { t += 1 / 60; pulled += frame(env, t, 0); }
  assert.ok(pulled > 0.01, '따라가기가 켜져 있어야 시험이 의미 있다');
  // 앱이 시점 손가락을 잡았다(setInput {look:true}) → 매 프레임 dx 를 보낸다. 손가락이 멈춰 있는 프레임도 섞는다.
  env.ctl.setLookExt(true);
  const y0 = env.ctl.yaw;
  let followed = 0, sent = 0;
  for (let i = 0; i < 300; i++) {
    t += 1 / 60;
    const dx = i % 3 === 0 ? 0 : 6;
    sent += dx;
    followed += frame(env, t, dx);
  }
  assert.equal(followed, 0, '시점 손가락이 닿아 있는 동안 따라가기는 yaw 를 건드리지 않는다');
  assert.ok(Math.abs(env.ctl.yaw - (y0 - sent * 0.0065)) < 1e-9);
  // 자동 걷기(walkTo) 중이어도 같다.
  env.walkSt = true;
  for (let i = 0; i < 120; i++) { t += 1 / 60; followed += frame(env, t, 0); }
  assert.equal(followed, 0);
  // 손가락을 떼면(look:false) 바로 당기지 않고, 끌기 뒤 쉬는 시간(자동 걷기 1.5초)이 지나야 다시 따라간다.
  env.ctl.setLookExt(false);
  assert.equal(env.ctl.dragging, false);
  let after = 0;
  for (let i = 0; i < 60; i++) { t += 1 / 60; after += frame(env, t, 0); }
  assert.equal(after, 0, '떼고 1초 안에는 따라가지 않는다');
  for (let i = 0; i < 120; i++) { t += 1 / 60; after += frame(env, t, 0); }
  assert.ok(Math.abs(after) > 0, '쉬는 시간이 지나면 다시 따라간다');
});

test('웹 손가락(앉아 있을 때 등)으로 끄는 동안에도 따라가기는 쉬고, 앱 확대(k)는 줌을 바꾼다', () => {
  const env = controls();
  env.meYaw = 0.4; env.ctl.yaw = 0.1;
  env.ev('pointerdown', 1, 300, 300);
  let t = 50, f = 0;
  for (let i = 0; i < 200; i++) { t += 1 / 60; env.ev('pointermove', 1, 300 + i, 300); f += frame(env, t, 0); }
  assert.equal(f, 0);
  env.ev('pointerup', 1, 500, 300);
  const z = env.ctl.zoom;
  env.ctl.setLookExt(true); env.ctl.pinchBy(1.25); env.ctl.setLookExt(false);
  assert.ok(env.ctl.zoom < z);
});

test('터치 기록 갈고리: 웹이 받은 포인터 이벤트를 trace 로 알린다(꺼져 있으면 부르지 않음)', () => {
  const env = controls();
  const seen = [];
  env.ev('pointerdown', 1, 10, 10);
  env.ctl.trace = (ty, e) => seen.push([ty, e.pointerId]);
  env.ev('pointermove', 1, 20, 10);
  env.ev('pointerup', 1, 20, 10);
  env.ev('pointercancel', 2, 0, 0);
  assert.deepEqual(seen, [['move', 1], ['up', 1], ['cancel', 2]]);
});

// main.js 를 그대로 불러(three.js 는 실제 파일, DOM·WebGL 은 가짜) ChurchAPI.setInput 경로와 터치 기록 묶음을 본다.
function loadMain() {
  const msgs = [], timers = [];
  const sb = {
    console, performance, URLSearchParams,
    setTimeout: () => 0, clearTimeout() {}, setInterval: (f) => { timers.push(f); return timers.length; }, clearInterval() {},
    requestAnimationFrame() {}, location: { search: '' }, navigator: { userAgent: 'node-test Chrome/131.0' }, devicePixelRatio: 2.5,
    innerWidth: 400, innerHeight: 800, addEventListener() {},
    FlutterChurch: { postMessage: (s) => msgs.push(JSON.parse(s)) },
  };
  sb.window = sb; sb.self = sb;
  sb.document = { getElementById: () => ({ addEventListener() {}, style: {} }), readyState: 'complete', addEventListener() {}, body: {} };
  vm.createContext(sb);
  for (const f of ['three.min.js', 'bridge.js', 'controls.js', 'main.js']) vm.runInContext(read(f), sb, { filename: f });
  return { sb, msgs, timers };
}

test('main.js: ChurchAPI.setInput 이 실제로 시점을 돌리고, 터치 기록이 받은 것·yaw 를 앱에 묶어 보낸다', () => {
  const { sb, msgs, timers } = loadMain();
  assert.equal(typeof sb.ChurchAPI.setInput, 'function');
  const App = sb.__church;
  const handlers = {};
  App.ctl = sb.ChurchControls.create({ clientWidth: 400, addEventListener(t, f) { handlers[t] = f; }, setPointerCapture() {} });
  sb.ChurchAPI.setInput({ trace: true });
  sb.ChurchAPI.setInput({ ext: true });
  const y0 = App.ctl.yaw;
  sb.ChurchAPI.setInput({ look: true });
  assert.equal(App.ctl.extLook, true);
  assert.equal(App.ctl.dragging, true);
  sb.ChurchAPI.setInput({ dx: 50, dy: 0 });
  sb.ChurchAPI.setInput('{"dx":10,"dy":5}');   // Flutter 가 보내는 모양(JSON) 그대로도
  assert.ok(Math.abs(App.ctl.yaw - (y0 - 60 * 0.0065)) < 1e-9);
  const z = App.ctl.zoom;
  sb.ChurchAPI.setInput({ k: 1.5 });
  assert.ok(App.ctl.zoom < z);
  // 웹 포인터도 기록된다(앉아 있을 때 웹이 직접 받는 손가락)
  handlers.pointerdown({ type: 'pointerdown', pointerId: 9, clientX: 100, clientY: 100, pointerType: 'touch' });
  handlers.pointerup({ type: 'pointerup', pointerId: 9, clientX: 100, clientY: 100, pointerType: 'touch' });
  sb.ChurchAPI.setInput({ look: false });
  assert.equal(App.ctl.extLook, false);
  assert.equal(timers.length, 1, '0.5초 묶음 타이머');
  timers[0]();
  const tr = msgs.filter((m) => m.e === 'trace');
  assert.equal(tr.length, 1);
  const s = tr[0].s;
  assert.equal(s.looks, 2);
  assert.equal(s.ks, 1);
  assert.equal(s.ext, 1);
  assert.ok(Math.abs(s.yaw - App.ctl.yaw) < 1e-3);
  const items = tr[0].items;
  assert.equal(items[0].k, 'hdr');
  assert.match(items[0].ua, /Chrome\/131/);
  assert.equal(items.filter((i) => i.k === 'in').length, 6);
  const ins = items.filter((i) => i.k === 'in' && i.a.dx !== undefined);
  assert.ok(ins[1].yaw < ins[0].yaw, 'yaw 가 받은 순서대로 바뀐다');
  assert.equal(JSON.stringify(items.filter((i) => i.k === 'p').map((i) => i.ty)), '["down","up"]');
  assert.ok(items.every((i) => typeof i.t === 'number'));
  // 끄면 갈고리도 빠진다
  sb.ChurchAPI.setInput({ trace: false });
  assert.equal(App.ctl.trace, null);
});
