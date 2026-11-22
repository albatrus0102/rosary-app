// 장면 멎음 예방(2026-11-23, 여의도동 계단 위 '멎음' 제보 — docs/church/interiors/yeouido.md §9.9): 실제 main.js·bridge.js·controls.js 를 Node(vm)에서 돌린다.
// 렌더러·월드·아바타는 가짜, rAF·시계·setInterval 은 시험이 직접 돌린다. 모두 고치기 전 코드에서는 실패한다:
//  ① 심장 박동 {e:'hb'}(그린 프레임 수·상태) ② 한 부분의 예외가 그리기를 막지 않고 오류 기록(jsError 'frame')에 남는다
//  ③ 다음 프레임 요청 전 예외에도 고리가 이어진다 ④ 죽은 고리(rAF 가 오지 않음)를 스스로 다시 띄운다 ⑤ WebGL 문맥 잃음을 알린다
//  ⑥ 내 위치 NaN 을 마지막 정상값으로 되돌린다 ⑦ 아주 큰 각에서 각 접기가 끝나지 않던 고리(장면 멎음) ⑧ pause/resume 받음 답
//  ⑨ 숨어 있는 동안 청해 둔 rAF 가 사라진 채(rafOn 그대로) resume 해도 고리가 다시 돈다
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = process.env.CHURCH_ROOT || path.resolve(here, '../../assets/church');

function boot(opts = {}) {
  const noop = () => {};
  const sb = { console: { log: noop, error: noop, warn: noop }, URLSearchParams, Math, Date, JSON, isFinite };
  sb.window = sb; sb.self = sb;
  let now = 1000;
  const rafq = [], intervals = [], canvasEv = {};
  sb.performance = { now: () => now };
  sb.requestAnimationFrame = (f) => { rafq.push(f); return rafq.length; };
  sb.setTimeout = noop; sb.clearTimeout = noop; sb.clearInterval = noop;
  sb.setInterval = (f) => { intervals.push(f); return intervals.length; };
  sb.addEventListener = noop;
  sb.innerWidth = 400; sb.innerHeight = 800; sb.devicePixelRatio = 1;
  sb.location = { search: '?markers=0' };
  sb.navigator = { userAgent: 'node' };
  const canvas = { style: {}, addEventListener: (t, f) => { (canvasEv[t] = canvasEv[t] || []).push(f); }, clientWidth: 400, clientHeight: 800, getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 800 }) };
  const docEv = {};
  sb.document = { hidden: false, getElementById: (id) => (id === 'c' ? canvas : null), readyState: 'complete', addEventListener: (t, f) => { (docEv[t] = docEv[t] || []).push(f); }, body: { insertAdjacentHTML: noop }, createElement: () => ({ style: {}, getContext: () => null, addEventListener: noop }) };
  const ev = [];
  sb.FlutterChurch = { postMessage: (s) => ev.push(JSON.parse(s)) };
  vm.createContext(sb);
  const run = (f) => vm.runInContext(fs.readFileSync(path.join(assets, f), 'utf8'), sb, { filename: f });
  ['three.min.js', 'layouts.js', 'shrine_places.js', 'shrine.js', 'scene_logic.js', 'stations.js', 'controls.js', 'bridge.js'].forEach(run);
  const T = sb.THREE;
  sb.ChurchAudio = { ctx: null, setAmbient: noop, footstep: noop, chime: noop, resume: noop, setSteps: noop };
  const gl = { lost: false, isContextLost() { return gl.lost; } };
  const R = { renderer: { getContext: () => gl }, tier: 'low', resize: noop, setExposure: noop, setTier: noop, renders: 0, render() { R.renders++; if (opts.renderThrows) throw new Error('render boom'); return false; } };
  sb.ChurchRender = { create: () => R };
  sb.ChurchRenderUtil = { markCaster: noop };
  class Avatar {
    constructor() { this.root = new T.Object3D(); this.kneelAmt = 0; this.kneelLin = 0; this.kneelTarget = 0; }
    setConfig() {} setWalk() {} playEmote() {} update() {} snapPose() {} setSeated() {} setPray() {} setRosary() {} setKneel() {}
    setPose(x, y, z, yaw) { this.root.position.set(x, y, z); this.root.rotation.y = yaw; }
    kneelOffset() { return 0; }
  }
  sb.ChurchAvatar = { Avatar, setView: noop };
  const net = { occ: {}, setLogic: noop, isTaken: () => false, setMySeat: noop, setFocus: noop, update: noop, setPeers: noop };
  const crowd = { setLogic: noop, isTaken: () => false, set: noop, update: noop };
  sb.ChurchNetView = { create: () => net, createCrowd: () => crowd };
  sb.ChurchGlassView = { create: () => ({ active: false, parked: false, unpark: noop, onResize: noop, api: { endView: noop } }) };
  const world = { throwUpdate: false };
  sb.ChurchWorld = {
    create: (scene, o) => {
      const layout = sb.ChurchLayouts.get(o.church);
      const logic = sb.ChurchLogic.create(layout, { colliders: [], zones: [] });
      return Object.assign(world, { id: layout.id, layout, logic, builder: {}, stats: {}, group: new T.Group(), env: { exp: 1 }, cameraBounds: { x0: -12, x1: 12, z0: -20, z1: 20, yMax: 12 },
        setEnvironment: noop, setHighlight: noop, dispose: noop, setHour: noop, update() { if (world.throwUpdate) throw new Error('world boom'); }, isLit: () => false, setCandles: noop, lightCandle: noop });
    }
  };
  run('main.js');
  const App = sb.__church, API = sb.ChurchAPI;
  API.init({ church: 'basic', hour: 12, ambient: false, solo: false, quality: 'low', avatar: { skin: 1 } });
  // 프레임 n 개(16.7ms 간격). vm 시간 제한 안에서 돌린다(끝나지 않는 고리 = 장면 멎음을 시험 실패로 잡는다)
  sb.__frames = (n) => { let ran = 0; for (let i = 0; i < n; i++) { now += 1000 / 60; const q = rafq.splice(0); q.forEach((f) => { f(now); ran++; }); } return ran; };
  const frames = (n) => vm.runInContext('__frames(' + n + ')', sb, { timeout: 4000 });
  const tick = () => intervals.forEach((f) => f());
  return { sb, App, API, ev, R, gl, world, frames, rafq, intervals, tick, canvasEv, docEv, advance: (ms) => { now += ms; } };
}
const lastE = (ev, e) => ev.filter((x) => x.e === e).pop();
const errs = (ev, kind) => ev.filter((x) => x.e === 'jsError' && (!kind || x.kind === kind));

test('① 심장 박동: 1초마다 {e:"hb", f: 그린 프레임 수, st}', () => {
  const h = boot();
  h.frames(30);
  assert.ok(h.intervals.length >= 1, '박동 타이머');
  h.tick();
  const hb = lastE(h.ev, 'hb');
  assert.ok(hb, '박동');
  assert.equal(hb.st, 'run');
  assert.ok(hb.f >= 25, '그린 프레임 수 ' + hb.f);
  h.frames(30); h.tick();
  assert.ok(lastE(h.ev, 'hb').f > hb.f, '프레임이 늘어난다');
  h.API.pause(); h.frames(3); h.tick();
  assert.equal(lastE(h.ev, 'hb').st, 'paused');
});

test('② 한 부분(월드 갱신)이 매 프레임 예외를 던져도 그리기는 계속되고, 오류 기록(jsError frame)에 한 번 남는다', () => {
  const h = boot();
  h.frames(5);
  h.world.throwUpdate = true;
  const r0 = h.R.renders;
  h.frames(60);
  assert.ok(h.R.renders - r0 >= 55, '그린 수 ' + (h.R.renders - r0));
  const e = errs(h.ev, 'frame');
  assert.equal(e.length, 1, '같은 오류는 한 번');
  assert.match(e[0].msg, /world: world boom/);
  // 걷기도 계속된다(조이스틱)
  const z0 = h.App.me.z;
  h.API.setJoystick({ x: 0, y: 1 }); h.frames(30);
  assert.ok(h.App.me.z < z0 - 0.3, '걷는다');
});

test('③ 다음 프레임을 청하기 전에 예외가 나도 고리가 끊기지 않는다', () => {
  const h = boot();
  h.frames(5);
  let n = 0;
  h.App.view = { get active() { if (n++ < 3) throw new Error('view boom'); return false; }, parked: false, api: { endView() {} } };
  h.frames(10);
  const r0 = h.R.renders;
  h.frames(20);
  assert.ok(h.R.renders - r0 >= 18, '고리가 이어진다 ' + (h.R.renders - r0));
  assert.ok(errs(h.ev, 'frame').some((e) => /view boom/.test(e.msg)));
});

test('④ 청해 둔 rAF 가 사라져 고리가 죽으면(rafOn 그대로) 박동이 2.5초 넘으면 다시 띄우고 오류 기록에 남긴다', () => {
  const h = boot();
  h.frames(10);
  h.rafq.length = 0;   // 웹뷰가 콜백을 버렸다
  assert.equal(h.App.rafOn, true);
  assert.equal(h.frames(60), 0, '고리가 죽었다');
  h.advance(2600); h.tick();
  assert.ok(errs(h.ev, 'stall').length === 1, 'stall 기록');
  const r0 = h.R.renders;
  h.frames(30);
  assert.ok(h.R.renders - r0 >= 28, '다시 돈다');
});

test('⑤ WebGL 문맥을 잃으면 알리고(jsError webgl·{e:"gl"}·박동 st:"gl"), 되찾으면 다시 그린다', () => {
  const h = boot();
  h.frames(10);
  assert.ok(h.canvasEv.webglcontextlost && h.canvasEv.webglcontextrestored, '문맥 이벤트를 듣는다');
  h.gl.lost = true;
  h.canvasEv.webglcontextlost.forEach((f) => f({ preventDefault() {} }));
  assert.equal(lastE(h.ev, 'gl').lost, 1);
  assert.equal(errs(h.ev, 'webgl').length, 1);
  h.frames(10); h.tick();
  const hb = lastE(h.ev, 'hb');
  assert.equal(hb.st, 'gl');
  h.frames(30); h.tick();
  assert.equal(lastE(h.ev, 'hb').f, hb.f, '잃은 동안은 그린 수가 늘지 않는다(앱이 멎음으로 본다)');
  h.gl.lost = false;
  h.canvasEv.webglcontextrestored.forEach((f) => f({}));
  assert.equal(lastE(h.ev, 'gl').lost, 0);
  h.frames(10); h.tick();
  assert.equal(lastE(h.ev, 'hb').st, 'run');
  assert.ok(lastE(h.ev, 'hb').f > hb.f);
  // 이벤트 없이 잃은 경우도 박동이 문맥을 물어 알아챈다
  h.gl.lost = true; h.tick();
  assert.equal(lastE(h.ev, 'hb').st, 'gl');
});

test('⑥ 내 위치가 NaN 이 되면 마지막 정상값으로 되돌리고 오류 기록에 남긴다', () => {
  const h = boot();
  h.API.setJoystick({ x: 0, y: 1 }); h.frames(20);
  const ok = { x: h.App.me.x, z: h.App.me.z };
  h.App.me.x = NaN; h.App.me.vx = NaN;
  h.frames(2);
  assert.ok(Number.isFinite(h.App.me.x) && Number.isFinite(h.App.me.z), JSON.stringify([h.App.me.x, h.App.me.z]));
  assert.ok(Math.hypot(h.App.me.x - ok.x, h.App.me.z - ok.z) < 0.5);
  assert.ok(errs(h.ev, 'frame').some((e) => /nan: me/.test(e.msg)));
  for (const v of ['x', 'y', 'z']) assert.ok(Number.isFinite(h.App.camera.position[v]), '카메라 ' + v);
  h.App.ctl.zoom = Infinity; h.frames(2);
  assert.ok(Number.isFinite(h.App.ctl.zoom) && Number.isFinite(h.App.camera.position.x));
});

test('⑦ 아주 큰 각(1e17)에서도 프레임이 끝난다(예전 while 각 접기는 끝나지 않아 장면이 멎었다)', () => {
  const h = boot();
  h.frames(5);
  h.App.me.yaw = 1e17;
  h.API.setJoystick({ x: 1, y: 0 });
  assert.doesNotThrow(() => h.frames(5), '시간 안에 끝난다');
  assert.ok(Number.isFinite(h.App.me.yaw) && Math.abs(h.App.me.yaw) < 100);
  h.App.ctl.yaw = 3e16;
  assert.doesNotThrow(() => h.frames(5));
  assert.ok(Math.abs(h.App.ctl.yaw) < 1e7);
});

test('⑧ pause/resume 를 받았다는 답 {e:"life"} — 앱 오류 기록(발자취)이 일시정지·재개가 웹에 닿았는지 보여 준다', () => {
  const h = boot();
  h.frames(5);
  h.API.pause();
  assert.equal(lastE(h.ev, 'life').s, 'paused');
  h.API.resume();
  const l = lastE(h.ev, 'life');
  assert.equal(l.s, 'resumed');
  assert.ok(typeof l.raf === 'number' && typeof l.age === 'number' && typeof l.f === 'number');
});

test('⑨ 숨어 있는 동안 청해 둔 rAF 가 사라진 채(rafOn 그대로) resume 해도 고리가 다시 돈다', () => {
  const h = boot();
  h.frames(10);
  h.API.pause();   // 숨으면 rAF 가 오지 않아 고리가 paused 를 보지 못한다(rafOn 은 true 로 남는다)
  h.rafq.length = 0;   // 그동안 웹뷰가 콜백을 버렸다
  h.advance(30000);
  assert.equal(h.App.rafOn, true);
  h.API.resume();
  const r0 = h.R.renders;
  h.frames(30);
  assert.ok(h.R.renders - r0 >= 28, 'resume 뒤 그린 수 ' + (h.R.renders - r0));
  // 보이게 될 때(visibilitychange)도 같은 확인을 한다
  h.rafq.length = 0; h.advance(2000);
  (h.docEv.visibilitychange || []).forEach((f) => f());
  assert.ok(h.rafq.length >= 1, 'visibilitychange 가 고리를 깨운다');
});
