// net_view.js 순수 부분: 표본 보간·순간 이동 스냅·오래된 사람 지우기·내 자세 내보내기(onMyPose)
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './lib/load.mjs';
const NV = load('net_view.js').RoomNetView;
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

test('보간: 두 표본 사이를 시간 비율로, 끝에서는 앞지르지 않는다', () => {
  const I = NV.createInterp();
  I.push(1000, 0, 0, 0); I.push(1333, 1, 0, 0); I.push(1666, 2, 0, 0);
  const o = {};
  I.sample(1166.5, o); assert.ok(near(o.x, 0.5, 1e-3));
  I.sample(1500, o); assert.ok(near(o.x, 1.5, 0.01));
  I.sample(5000, o); assert.equal(o.x, 2);                          // 마지막 표본에 머문다
  I.sample(0, o); assert.equal(o.x, 0);
  assert.ok(I.delay() >= NV.DEF.DELAY_MIN && I.delay() <= NV.DEF.DELAY_MAX);
  assert.ok(near(I.delay(), 333 * NV.DEF.DELAY_K, 1));               // 받는 간격(3Hz)의 1.6배
});
test('보간: 방향은 짧은 쪽으로 돈다(±π 넘김)', () => {
  const I = NV.createInterp(), o = {};
  I.push(0, 0, 0, 3.0); I.push(100, 0, 0, -3.0);
  I.sample(50, o);
  assert.ok(Math.abs(Math.abs(o.yaw) - Math.PI) < 0.05, 'yaw ' + o.yaw);
});
test('순간 이동·긴 끊김은 보간하지 않고 스냅', () => {
  const I = NV.createInterp(), o = {};
  I.push(0, 0, 0, 0); I.push(300, 0.5, 0, 0);
  I.push(600, 6, 0, 0);                                             // 5.5 m 뜀 > TELEPORT_M
  assert.equal(I.count(), 1);
  I.sample(450, o); assert.equal(o.x, 6); assert.equal(o.snapped, true);
  I.sample(700, o); assert.equal(o.snapped, false);
  I.push(600 + NV.DEF.SNAP_GAP_MS + 1, 6.2, 0, 0);                  // 오래 끊겼다 다시 옴
  assert.equal(I.count(), 1);
});
test('피어 표: 추가·변경·목록에서 빠지면 GRACE 뒤·소식 없으면 STALE 뒤 지운다', () => {
  const T = NV.createTable({ graceMs: 1000, staleMs: 5000 });
  let ev = T.set([{ id: 'a', x: 0, z: 0, yaw: 0, state: 'walk', avatar: { label: 'A' } }, { id: 'b', x: 1, z: 1, state: 'sit', seat: 2 }], 0);
  assert.deepEqual(ev.added.sort(), ['a', 'b']);
  assert.equal(T.seatOwner(2), 'b');
  ev = T.set([{ id: 'a', x: 0.2, z: 0, yaw: 0, state: 'walk', avatar: { label: 'A2' } }], 300);
  assert.deepEqual(ev.changed, ['a']);
  assert.equal(T.peers.size, 2);                                    // b 는 아직(GRACE 안)
  ev = T.set([{ id: 'a', x: 0.4, z: 0, yaw: 0, state: 'walk', avatar: { label: 'A2' } }], 1400);
  assert.deepEqual(ev.removed, ['b']);
  ev = T.set([{ id: 'c', x: 0, z: 0 }], 1500, { partial: true });   // 일부만: a 는 남는다
  assert.ok(T.peers.has('a') && T.peers.has('c'));
  ev = T.sweep(1400 + 5001);                                        // a 는 1400 이후 소식 없음
  assert.ok(ev.removed.includes('a'));
  assert.equal(T.seatOwner(2), null);
});
test('피어 표: 멈춘 사람은 표본을 더하지 않지만 살아 있음은 갱신', () => {
  const T = NV.createTable({ staleMs: 3000 });
  T.set([{ id: 'a', x: 1, z: 1, yaw: 0 }], 0);
  for (let t = 300; t <= 6000; t += 300) T.set([{ id: 'a', x: 1, z: 1, yaw: 0 }], t);
  assert.ok(T.peers.has('a'));
  assert.equal(T.peers.get('a').interp.count(), 1);
});
test('내 자세 내보내기: hz 박자·움직일 때만·상태 바뀌면 바로·keepAlive', () => {
  const out = [], S = NV.createPoseSender({ hz: 4, keepAliveMs: 2000, seatedIdleMs: 2000, send: (p) => out.push(p) });   // 앉은 박동은 기본 0 — 여기서는 켜서 시험
  let x = 0;
  for (let t = 0; t <= 1000; t += 16) { x += 0.02; S.tick(t, { x, z: 0, yaw: 0, state: 'walk', seat: null }); }
  assert.ok(out.length >= 4 && out.length <= 6, 'sent ' + out.length);   // 1초에 약 4번(+처음)
  const n = out.length;
  for (let t = 1016; t <= 2500; t += 16) S.tick(t, { x, z: 0, yaw: 0, state: 'walk', seat: null });   // 멈춤
  assert.ok(out.length - n <= 1, 'still → at most keep-alive');
  S.tick(2510, { x, z: 0, yaw: 0, state: 'sit', seat: 1 });           // 앉음: 박자를 기다리지 않는다
  assert.equal(out[out.length - 1].state, 'sit'); assert.equal(out[out.length - 1].seat, 1);
  const m = out.length;
  S.tick(2520, { x, z: 0, yaw: 0, state: 'sit', seat: 1 });
  assert.equal(out.length, m);
  S.tick(2520 + 2001, { x, z: 0, yaw: 0, state: 'sit', seat: 1 });   // keepAlive
  assert.equal(out.length, m + 1);
  S.setRate(99); assert.equal(S.rate(), 10);                          // 상한
});
test('보간 결과는 2~4Hz 스냅숏에서도 매끄럽다(프레임 사이 이동 거리가 고르다)', () => {
  const T = NV.createTable(), speed = 1.2;
  let maxJump = 0, prev = null;
  for (let t = 0; t <= 6000; t += 16) {
    if (t % 333 < 16) T.set([{ id: 'w', x: speed * t / 1000, z: 0, yaw: -Math.PI / 2 }], t + (t % 7));   // 3Hz, 조금 흔들리는 도착
    const r = T.peers.get('w'), o = r.interp.sample(t - r.interp.delay(), {});
    if (prev && t > 1000) maxJump = Math.max(maxJump, Math.abs(o.x - prev));
    prev = o.x;
  }
  assert.ok(maxJump < speed * 0.016 * 2.5, 'max per-frame jump ' + maxJump);
});
