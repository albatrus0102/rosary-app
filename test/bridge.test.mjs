// bridge.js: 들어오는 호출(전역 함수·postMessage·문자열 JSON)·줄 세우기·나가는 이벤트(호스트 객체·부모 창·CustomEvent·on)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { WEB } from './lib/load.mjs';
const SRC = fs.readFileSync(path.join(WEB, 'bridge.js'), 'utf8');

function makeWin(opts = {}) {
  const L = {}, w = {
    console: { log() {}, error() {} },
    addEventListener: (t, f) => { (L[t] = L[t] || []).push(f); },
    dispatchEvent: (e) => { (L[e.type] || []).forEach((f) => f(e)); return true; },
    CustomEvent: class { constructor(type, o) { this.type = type; this.detail = o && o.detail; } },
    _fire: (t, ev) => (L[t] || []).forEach((f) => f(ev))
  };
  w.window = w; w.parent = opts.parent || w;
  if (opts.host) w.Room3DHost = opts.host;
  w.CustomEvent = w.CustomEvent; w.JSON = JSON; w.Object = Object; w.Array = Array; w.String = String;
  const ctx = vm.createContext(w);
  vm.runInContext(SRC, ctx);
  return w;
}
test('준비 전 호출은 줄에 쌓였다가 바인드되면 차례로(손잡이·누르기는 쌓지 않음)', () => {
  const w = makeWin(), calls = [];
  w.Room3D.setHour({ hour: 21 });
  w.Room3D.setJoystick({ x: 1, y: 0 });
  w.Room3D.setGarden([{ flower: 1, stage: 3 }]);
  w.Room3D._bind({ api: { setHour: (a) => calls.push(['setHour', a.hour]), setJoystick: () => calls.push(['joy']), setGarden: (a) => calls.push(['garden', a.value.length]) } });
  assert.deepEqual(calls, [['setHour', 21], ['garden', 1]]);
  w.Room3D.setJoystick({ x: 0, y: 1 });
  assert.equal(calls.at(-1)[0], 'joy');
});
test('세 가지 길: 전역 함수 · postMessage({room3d:"call"}) · call(JSON 문자열)', () => {
  const w = makeWin(), got = [];
  w.Room3D._bind({ api: { setHour: (a) => got.push(a.hour), sit: (a) => got.push('sit' + a.i) } });
  w.Room3D.setHour('{"hour":7}');
  w._fire('message', { data: { room3d: 'call', fn: 'sit', args: { i: 2 } } });
  w._fire('message', { data: JSON.stringify({ room3d: 'call', fn: 'setHour', args: { hour: 9 } }) });
  w._fire('message', { data: { room3d: 'call', fn: 'eval', args: {} } });       // 목록에 없는 이름은 무시
  w._fire('message', { data: { other: 1 } });
  w.Room3D.call('{"fn":"setHour","args":{"hour":11}}');
  assert.deepEqual(got, [7, 'sit2', 9, 11]);
});
test('나가는 이벤트: 호스트 객체(문자열)·부모 창·on()·room3d CustomEvent', () => {
  const host = [], par = [], parent = { postMessage: (m) => par.push(m) };
  const w = makeWin({ host: { postMessage: (s) => host.push(s) }, parent });
  const seen = [], ce = [];
  const off = w.Room3D.on((e) => seen.push(e.e));
  w.addEventListener('room3d', (e) => ce.push(e.detail.e));
  w.RoomBridge.post({ e: 'seatTap', i: 3 });
  assert.equal(typeof host[0], 'string');
  assert.deepEqual(JSON.parse(host[0]), { e: 'seatTap', i: 3 });
  assert.deepEqual(JSON.parse(JSON.stringify(par[0])), { room3d: 'event', e: 'seatTap', i: 3 });   // vm 다른 영역의 객체라 JSON 으로 비교
  assert.deepEqual([...seen], ['seatTap']); assert.deepEqual([...ce], ['seatTap']);
  off(); w.RoomBridge.post({ e: 'stood', i: 3 });
  assert.deepEqual(seen, ['seatTap']);
  assert.equal(w.__roomEvents.length, 2);
});
test('API 오류는 {e:"error"} 로 알리고 같은 문구는 한 번만', () => {
  const w = makeWin(), ev = [];
  w.Room3D.on((e) => ev.push(e));
  w.Room3D._bind({ api: { setHour: () => { throw new Error('boom'); } } });
  w.Room3D.setHour({ hour: 1 }); w.Room3D.setHour({ hour: 1 });
  const errs = ev.filter((e) => e.e === 'error');
  assert.equal(errs.length, 1); assert.match(errs[0].msg, /setHour: boom/);
});
test('정해진 메서드 목록(README 표와 같다)', () => {
  const w = makeWin();
  for (const m of ['init', 'setSeats', 'setMe', 'setHour', 'setTimerText', 'setPanel', 'setGarden', 'setSkin', 'pause', 'resume', 'dispose', 'setPeers', 'sit', 'stand'])
    assert.equal(typeof w.Room3D[m], 'function', m);
});
