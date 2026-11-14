// 보이지 않는 동안 일시정지(pause/resume)와 상태 복원(getState/restore): 실제 main.js·bridge.js·controls.js·scene_logic.js·stations.js 를
// Node(vm)에서 돌린다. 렌더러·월드·아바타·소리는 가짜(그리기 없음)이고 rAF·시계는 시험이 직접 돌린다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');

function boot(opts = {}) {
  const noop = () => {};
  const sb = { console: { log: noop, error: console.error, warn: noop }, URLSearchParams, Math, Date, JSON, isFinite };
  sb.window = sb; sb.self = sb;
  let now = 1000;
  const rafq = [];
  sb.performance = { now: () => now };
  sb.requestAnimationFrame = (f) => { rafq.push(f); return rafq.length; };
  sb.setTimeout = noop; sb.clearTimeout = noop; sb.setInterval = noop; sb.clearInterval = noop;
  sb.addEventListener = noop;
  sb.innerWidth = 400; sb.innerHeight = 800; sb.devicePixelRatio = 1;
  sb.location = { search: '?markers=0' };
  sb.navigator = { userAgent: 'node' };
  const canvas = { style: {}, addEventListener: noop, clientWidth: 400, clientHeight: 800, getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 800 }) };
  sb.document = { getElementById: (id) => (id === 'c' ? canvas : null), readyState: 'complete', addEventListener: noop, body: { insertAdjacentHTML: noop }, createElement: () => ({ style: {}, getContext: () => null, addEventListener: noop }) };
  const ev = [];
  sb.FlutterChurch = { postMessage: (s) => ev.push(JSON.parse(s)) };
  vm.createContext(sb);
  const run = (f) => vm.runInContext(fs.readFileSync(path.join(assets, f), 'utf8'), sb, { filename: f });
  ['three.min.js', 'layouts.js', 'scene_logic.js', 'stations.js', 'controls.js', 'bridge.js'].forEach(run);
  const T = sb.THREE;
  // --- 가짜들 ---
  const audio = { calls: [], suspended: 0, ctx: { state: 'running', suspend() { audio.suspended++; this.state = 'suspended'; } }, setAmbient(on) { audio.calls.push(!!on); if (on) this.ctx.state = 'running'; }, footstep: noop, chime: noop };
  sb.ChurchAudio = audio;
  const R = { renderer: {}, tier: 'low', resize: noop, setExposure: noop, setTier: noop, renders: 0, render() { R.renders++; return false; } };
  sb.ChurchRender = { create: () => R };
  sb.ChurchRenderUtil = { markCaster: noop };
  class Avatar {
    constructor() { this.root = new T.Object3D(); this.kneelAmt = 0; this.kneelLin = 0; this.kneelTarget = 0; this.seated = false; this.kneel = false; this.pray = false; }
    setConfig() {} setWalk() {} playEmote() {} update() {} snapPose() {}
    setSeated(v) { this.seated = !!v; }
    setPray(v) { this.pray = !!v; }
    setRosary(v) { this.rosary = !!v; }
    setKneel(v) { this.kneel = !!v; this.kneelTarget = v ? 1 : 0; this.kneelLin = this.kneelTarget; this.kneelAmt = this.kneelTarget; }
    setPose(x, y, z, yaw) { this.root.position.set(x, y, z); this.root.rotation.y = yaw; }
    kneelOffset() { return 0; }
  }
  sb.ChurchAvatar = { Avatar, setView: noop };
  const taken = Object.assign({}, opts.taken);
  const net = { occ: {}, mySeat: null, setLogic: noop, isTaken: (id) => !!taken[id], setMySeat(s) { net.mySeat = s; }, setFocus: noop, update: noop, setPeers: noop };
  const crowdTaken = Object.assign({}, opts.crowd);
  const crowd = { rerolls: 0, setLogic: noop, isTaken: (id) => !!crowdTaken[id], set(flag, force) { if (force) { crowd.rerolls++; for (const k of Object.keys(crowdTaken)) delete crowdTaken[k]; } }, update: noop };
  sb.ChurchNetView = { create: () => net, createCrowd: () => crowd };
  sb.ChurchGlassView = { create: () => ({ active: false, parked: false, unpark: noop, onResize: noop, api: { endView: noop } }) };
  sb.ChurchWorld = {
    create: (scene, o) => {
      const layout = sb.ChurchLayouts.get(o.church);
      const logic = sb.ChurchLogic.create(layout, { colliders: [{ x0: -1.4, x1: 1.4, z0: -17.6, z1: -16.4 }], zones: [] });
      return { id: layout.id, layout, logic, builder: {}, stats: {}, group: new T.Group(), env: { exp: 1 }, cameraBounds: { x0: -12, x1: 12, z0: -20, z1: 20, yMax: 12 },
        setEnvironment: noop, setHighlight: noop, dispose: noop, setHour: noop, update: noop, isLit: () => false, setCandles: noop, lightCandle: noop };
    }
  };
  run('main.js');
  const App = sb.__church, API = sb.ChurchAPI;
  API.init({ church: 'basic', hour: 12, ambient: !!opts.ambient, solo: false, quality: 'low', avatar: { skin: 1 } });
  // 프레임 n 개(16.7ms 간격). 대기 중인 rAF 가 없으면 시간만 흐른다.
  const frames = (n) => { let ran = 0; for (let i = 0; i < n; i++) { now += 1000 / 60; const q = rafq.splice(0); q.forEach((f) => { f(now); ran++; }); } return ran; };
  return { sb, App, API, ev, audio, R, net, crowd, frames, rafq, advance: (ms) => { now += ms; }, clock: () => now };
}
const last = (ev, e) => ev.filter((x) => x.e === e).pop();

test('ChurchAPI 에 pause/resume/getState/restore 가 있다', () => {
  const h = boot();
  for (const m of ['pause', 'resume', 'getState', 'restore']) assert.equal(typeof h.API[m], 'function', m);
});

test('pause: 그리기 고리(rAF)가 완전히 멈추고 소리가 꺼지며 상태를 알린다', () => {
  const h = boot({ ambient: true });
  assert.ok(h.frames(10) >= 10);
  const renders = h.R.renders, fc = h.App.frameCount;
  assert.ok(renders >= 9);
  h.API.setJoystick({ x: 0, y: 1 });
  h.frames(30);
  assert.ok(h.App.me.z < 17, 'walked forward');
  h.API.pause();
  const st = last(h.ev, 'state');
  assert.ok(st, 'state event');
  assert.equal(st.church, 'basic');
  assert.equal(st.seat, null);
  assert.ok(Math.abs(st.z - h.App.me.z) < 0.01);
  h.frames(5);   // 이미 청해 둔 프레임 하나는 아무것도 하지 않고 끝난다
  assert.equal(h.rafq.length, 0, 'no pending rAF while paused');
  assert.equal(h.App.rafOn, false);
  const r2 = h.R.renders, f2 = h.App.frameCount, z = h.App.me.z, t = h.App.t;
  assert.equal(h.frames(600), 0, 'no frame callbacks for 10 s');
  assert.equal(h.R.renders, r2); assert.equal(h.App.frameCount, f2);
  assert.equal(h.App.me.z, z); assert.equal(h.App.t, t);
  assert.ok(f2 > fc);
  // 소리: 끄고 AudioContext 를 멈춘다. 켜짐 설정(App.ambient)은 그대로.
  assert.equal(h.audio.calls.at(-1), false);
  assert.equal(h.audio.suspended, 1);
  assert.equal(h.App.ambient, true);
  // 일시정지 중 resize·setQuality 가 고리를 깨우지 않는다
  h.API.setQuality({ quality: 'low' });
  assert.equal(h.rafq.length, 0);
  // 조이스틱은 0 으로 풀린다(돌아왔을 때 혼자 걷지 않게)
  assert.equal(h.App.ctl.joyY, 0);
});

test('resume: 멈춘 자리에서 잇고 시간이 건너뛰지 않는다', () => {
  const h = boot({ ambient: true });
  h.frames(5);
  h.API.walkTo({ kind: 'altar' });
  h.frames(60);
  const w = h.App.walkSt;
  assert.ok(w, 'auto walk in progress');
  h.API.pause(); h.frames(3);
  const st = last(h.ev, 'state');
  assert.equal(st.walk.kind, 'altar');
  const before = { x: h.App.me.x, z: h.App.me.z, yaw: h.App.me.yaw, cy: h.App.ctl.yaw, t: h.App.t };
  h.advance(10 * 60 * 1000);   // 10분 뒤
  h.API.resume();
  assert.equal(h.rafq.length, 1, 'loop restarted');
  h.frames(1);
  // 한 프레임 동안의 변화만 있다(10분치를 한꺼번에 움직이지 않는다)
  assert.ok(h.App.t - before.t <= 0.05 + 1e-9, 'sim time advanced by one clamped step at most: ' + (h.App.t - before.t));
  assert.ok(Math.hypot(h.App.me.x - before.x, h.App.me.z - before.z) < 0.3, 'no position jump');
  assert.ok(Math.abs(h.App.ctl.yaw - before.cy) < 0.1);
  assert.equal(h.App.walkSt, w, 'same auto walk continues');
  h.frames(1500);
  assert.ok(last(h.ev, 'walkDone'), 'walk finishes after resume');
  assert.equal(h.audio.calls.at(-1), true, 'ambient restored');
  // perf 표본도 멈춰 있던 시간을 세지 않는다
  const perf = last(h.ev, 'perf');
  assert.ok(perf && perf.fps >= 50, JSON.stringify(perf));
});

test('일시정지 중 setAmbient 는 소리를 켜지 않고, resume 때 켠다', () => {
  const h = boot({ ambient: false });
  h.frames(3); h.API.pause(); h.frames(2);
  const n = h.audio.calls.length;
  h.API.setAmbient({ on: true });
  assert.equal(h.audio.calls.length, n);
  h.API.resume();
  assert.equal(h.audio.calls.at(-1), true);
  // pause/resume 는 멱등
  h.API.resume(); h.API.pause(); h.API.pause();
  assert.equal(h.ev.filter((e) => e.e === 'state').length, 2);
});

test('앉아서 무릎 꿇은 상태가 state 에 담기고, 새 장면에 restore 하면 같은 자리·자세·시점', () => {
  const a = boot();
  a.frames(3);
  const seat = 'L03-2', sp = a.App.logic.standPos(seat);
  a.App.me.x = sp.x; a.App.me.z = sp.z;
  a.API.sit({ seat });
  a.frames(80);
  assert.equal(a.App.me.mode, 'seated');
  a.API.setPrayerPosture({ posture: 'kneel' });
  a.App.ctl.yaw = 0.7; a.App.ctl.pitch = 0.3; a.App.ctl.zoom = 1.2;
  a.frames(2);
  a.API.pause();
  const st = last(a.ev, 'state');
  assert.equal(st.seat, seat); assert.equal(st.posture, 'kneel');
  assert.equal(st.cp, 0.3); assert.equal(st.cz, 1.2);

  const b = boot();   // WebView 를 새로 만든 것과 같다: 입구에서 시작
  b.frames(3);
  assert.equal(b.App.me.z, 17);
  b.API.restore(JSON.parse(JSON.stringify(st)));
  assert.equal(b.App.me.mode, 'seated'); assert.equal(b.App.me.seat, seat);
  const p = b.App.logic.seatPos(seat);
  assert.equal(b.App.me.x, p.x); assert.equal(b.App.me.z, p.z);
  assert.equal(b.App.posture, 'kneel'); assert.equal(b.App.meAv.kneel, true); assert.equal(b.App.meAv.seated, true);
  assert.equal(b.net.mySeat, seat);
  assert.equal(b.App.ctl.pitch, 0.3); assert.equal(b.App.ctl.zoom, 1.2); assert.ok(Math.abs(b.App.ctl.yaw - st.cy) < 1e-9);
  assert.deepEqual(last(b.ev, 'seated'), { e: 'seated', seat });
  const r = last(b.ev, 'restored');
  assert.equal(r.seat, seat); assert.equal(r.lost, 0);
  b.frames(30);
  assert.equal(b.App.me.mode, 'seated');
  // 다른 성당의 상태는 무시한다
  const c = boot(); c.frames(2);
  c.API.restore(Object.assign({}, st, { church: 'stpeter' }));
  assert.equal(c.App.me.mode, 'walk'); assert.equal(c.App.me.z, 17);
});

test('restore: 자리에 이미 누가 앉았으면 그 줄 통로에 서고 lost:1', () => {
  const seat = 'R05-1';
  const h = boot({ taken: { [seat]: 'p9' } });
  h.frames(2);
  h.API.restore({ church: 'basic', x: 0, z: 0, r: 0, seat, posture: 'sit', cy: 0, cp: 0.45, cz: 1, cl: 0 });
  assert.equal(h.App.me.mode, 'walk'); assert.equal(h.App.me.seat, null);
  const st = h.App.logic.standPos(seat);
  assert.ok(Math.hypot(h.App.me.x - st.x, h.App.me.z - st.z) < 0.8, 'near the row aisle');
  const r = last(h.ev, 'restored');
  assert.equal(r.seat, null); assert.equal(r.lost, 1);
  assert.equal(h.ev.filter((e) => e.e === 'seated').length, 0);
});

test('restore: 배경 신자(혼자 모드)가 앉은 자리는 다시 뽑아 비운다', () => {
  const seat = 'L01-1';
  const h = boot({ crowd: { [seat]: 1 } });
  h.frames(2);
  h.API.restore({ church: 'basic', x: 0, z: 0, r: 0, seat, posture: 'sit' });
  assert.ok(h.crowd.rerolls >= 1);
  assert.equal(h.App.me.mode, 'seated');
});

test('restore: 걷던 위치·방향·시점과 목적지를 잇고, 잘못된 값은 안전하게 처리한다', () => {
  const h = boot();
  h.frames(2);
  h.API.restore({ church: 'basic', x: 3.2, z: 6.5, r: 1.1, seat: null, cy: 2, cp: 9, cz: -3, cl: 0.4, walk: { kind: 'altar', index: 0 } });
  assert.ok(Math.hypot(h.App.me.x - 3.2, h.App.me.z - 6.5) < 0.6, 'restored near the saved spot (pushed out of a pew if needed)');
  assert.equal(h.App.ctl.yaw, 2); assert.equal(h.App.ctl.pitch, 1.25); assert.equal(h.App.ctl.zoom, 0.55); assert.equal(h.App.ctl.look, 0.4);
  assert.equal(last(h.ev, 'walkStart').kind, 'altar');
  assert.equal(last(h.ev, 'restored').lost, 0);
  const g = boot(); g.frames(2);
  g.API.restore({ church: 'basic', x: 'NaN', z: null, r: undefined, seat: 'nope', walk: { kind: 'bogus' } });
  assert.equal(g.App.me.mode, 'walk');
  assert.ok(isFinite(g.App.me.x) && isFinite(g.App.me.z) && isFinite(g.App.me.yaw));
  g.frames(5);   // 오류 없이 계속 돈다
  // 벽 밖 좌표는 걸을 수 있는 범위로 들어온다
  g.API.restore({ church: 'basic', x: 999, z: -999, r: 0 });
  assert.ok(Math.abs(g.App.me.x) < 20 && Math.abs(g.App.me.z) < 30);
});

test('묵주(setRosary): 서 있을 때도 들고, state 에 rosary:1 로 담겨 restore 로 되살아난다(SPEC §32)', () => {
  const a = boot();
  a.frames(3);
  assert.equal(typeof a.API.setRosary, 'function');
  a.API.pause();
  assert.equal(last(a.ev, 'state').rosary, undefined);   // 안 들었으면 필드가 없다
  a.API.resume();
  a.API.setRosary({ on: true });                          // 걷는 중(자리로 가는 동안)에도 든다
  assert.equal(a.App.me.mode, 'walk'); assert.equal(a.App.meAv.rosary, true);
  const seat = 'L03-2', sp = a.App.logic.standPos(seat);
  a.App.me.x = sp.x; a.App.me.z = sp.z;
  a.API.sit({ seat }); a.frames(80);
  a.API.setPraying({ on: true, ms: 1 });
  assert.equal(a.App.meAv.rosary, true); assert.equal(a.App.meAv.pray, true);
  a.API.pause();
  const st = last(a.ev, 'state');
  assert.equal(st.rosary, 1); assert.equal(st.seat, seat);

  const b = boot(); b.frames(3);
  assert.equal(!!b.App.meAv.rosary, false);
  b.API.restore(JSON.parse(JSON.stringify(st)));
  assert.equal(b.App.meAv.rosary, true); assert.equal(b.App.me.mode, 'seated');
  // 묵주 없는 상태를 복원하면 내려놓는다. 내려놓기는 자세와 무관하다.
  b.API.restore(Object.assign({}, st, { rosary: undefined }));
  assert.equal(b.App.meAv.rosary, false);
  a.API.resume(); a.API.setRosary({ on: false });
  assert.equal(a.App.meAv.rosary, false); assert.equal(a.App.meAv.pray, true);
});
