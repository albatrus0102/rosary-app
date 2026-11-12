import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RoomLogic,
  CANDLE_LIFETIME_MS,
  IDLE_STAND_MS,
  MAX_SPEED,
  MOVE_BUDGET_MAX,
  nextRoomName,
  parseRoomName,
  type Message,
} from '../src/room_logic';
import { seatPosition, seatIds, totalCandleSlots, type Layout } from '../src/layout';
import { BASIC_FALLBACK } from '../src/layouts_fallback';

const BASIC = BASIC_FALLBACK;

// 기본과 전혀 다른 합성 레이아웃: 경계, 2글자 그룹, rowDx, 촛불대 2개.
const SYNTH: Layout = {
  id: 'synth',
  scalePercent: 60,
  bounds: { x0: -5, x1: 15, z0: -8, z1: 30 },
  spawn: { x: 2, z: 25, r: 0 },
  seatGroups: [
    { g: 'A', rows: 3, perRow: 4, origin: { x: 0, z: 0 }, dx: 1.5, dz: 2, rowDx: 0.5, yaw: 0 },
    { g: 'BC', rows: 2, perRow: 2, origin: { x: 10, z: 10 }, dx: -1, dz: 1.5, rowDx: 0, yaw: 0 },
  ],
  candles: {
    stands: [
      { x: -4, z: 20, slots: 3, reach: 1.0 },
      { x: 14, z: -6, slots: 5, reach: 2.0 },
    ],
  },
};

class Harness {
  t = 1_000_000;
  out = new Map<string, Message[]>();
  closed: Array<[string, number, string]> = [];
  logic: RoomLogic;
  private counter = 0;
  constructor(layout: Layout = BASIC, room = `${layout.id}-1`, capacity?: number) {
    this.logic = new RoomLogic({
      layout,
      room,
      capacity,
      now: () => this.t,
      send: (c, m) => {
        if (!this.out.has(c)) this.out.set(c, []);
        this.out.get(c)!.push(m);
      },
      close: (c, code, reason) => this.closed.push([c, code, reason]),
    });
  }
  msgs(c: string, t?: string): Message[] {
    const all = this.out.get(c) ?? [];
    return t ? all.filter((m) => m.t === t) : all;
  }
  clear(): void {
    this.out.clear();
  }
  uuid(i: number): string {
    return `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
  }
  send(c: string, m: Message | string): void {
    this.logic.handleMessage(c, typeof m === 'string' ? m : JSON.stringify(m));
  }
  /** 연결 + hello. connId는 'c<i>' */
  join(i: number, avatar: Message = { skin: 1, style: 0, hair: 3, outfit: 5, name: 7 }): string {
    const c = `c${i}`;
    this.logic.onConnect(c);
    this.send(c, { t: 'hello', id: this.uuid(i), v: 1, avatar });
    this.t += 100; // 메시지 간 시간을 띄워 속도 제한 창이 겹치지 않게
    return c;
  }
  /** 위치를 (예산 범위 안에서) 직접 이동시킨다. 걸음마다 시간을 흘린다. */
  walkTo(c: string, x: number, z: number): void {
    for (let i = 0; i < 200; i++) {
      const p = this.logic.getPeer(c)!;
      if (Math.hypot(p.x - x, p.z - z) < 0.01) return;
      this.t += 500;
      this.send(c, { t: 'pos', x, z, r: 0, m: 1 });
    }
  }
}

test('nextRoomName / parseRoomName', () => {
  assert.equal(nextRoomName('basic-1'), 'basic-2');
  assert.equal(nextRoomName('stpeter-49'), 'stpeter-50');
  assert.equal(nextRoomName('stpeter-50'), 'stpeter-1');
  assert.deepEqual(parseRoomName('stpeter-7'), { churchId: 'stpeter', n: 7 });
  assert.equal(parseRoomName('stpeter-0'), null);
  assert.equal(parseRoomName('stpeter-51'), null);
  assert.equal(parseRoomName('stpeter-01'), null);
  assert.equal(parseRoomName('Stpeter-1'), null);
  assert.equal(parseRoomName('church'), null);
});

test('hello: welcome 형식, join 브로드캐스트, 스폰 위치', () => {
  const h = new Harness();
  const a = h.join(1);
  const w = h.msgs(a, 'welcome')[0];
  assert.equal(w.you, h.uuid(1));
  assert.equal(w.room, 'basic-1');
  assert.equal(w.n, 1);
  assert.deepEqual(w.peers, []);
  assert.deepEqual(w.seats, {});
  assert.deepEqual(w.candles, []);
  assert.equal(w.now, 1_000_000);
  const b = h.join(2);
  const w2 = h.msgs(b, 'welcome')[0];
  assert.equal(w2.n, 2);
  assert.equal(w2.peers.length, 1);
  assert.deepEqual(w2.peers[0], {
    id: h.uuid(1),
    avatar: { skin: 1, style: 0, hair: 3, outfit: 5, name: 7 },
    x: 0,
    z: 17,
    r: 0,
    st: 'w',
    seat: null,
    ms: -1,
  });
  const join = h.msgs(a, 'join')[0];
  assert.equal(join.n, 2);
  assert.equal(join.peer.id, h.uuid(2));
  assert.equal(h.msgs(b, 'join').length, 0);
});

test('hello: 범위·형식 검증', () => {
  const good = { skin: 3, style: 3, hair: 9, outfit: 11, name: 39 };
  const bad: Message[] = [
    { ...good, skin: 4 },
    { ...good, skin: -1 },
    { ...good, style: 4 },
    { ...good, hair: 10 },
    { ...good, outfit: 12 },
    { ...good, name: 40 },
    { ...good, name: 1.5 },
    { ...good, name: '3' },
    { skin: 0, style: 0, hair: 0, outfit: 0 },
  ];
  for (const [i, av] of bad.entries()) {
    const h = new Harness();
    h.logic.onConnect('x');
    h.send('x', { t: 'hello', id: h.uuid(1), v: 1, avatar: av });
    assert.deepEqual(h.msgs('x'), [{ t: 'error', code: 'bad_msg' }], `case ${i}`);
    assert.equal(h.logic.peerCount(), 0);
  }
  const h = new Harness();
  h.logic.onConnect('x');
  h.send('x', { t: 'hello', id: 'not-a-uuid', v: 1, avatar: good });
  assert.deepEqual(h.msgs('x'), [{ t: 'error', code: 'bad_msg' }]);
  h.clear();
  h.send('x', { t: 'hello', id: h.uuid(1), v: 2, avatar: good });
  assert.deepEqual(h.msgs('x'), [{ t: 'error', code: 'version' }]);
  assert.equal(h.closed.length, 1);
  h.clear();
  h.send('x', { t: 'hello', id: h.uuid(1), v: 1, avatar: good });
  assert.equal(h.msgs('x', 'welcome').length, 1); // 경계값은 통과
  h.send('x', { t: 'hello', id: h.uuid(1), v: 1, avatar: good });
  assert.equal(h.msgs('x', 'error').length, 1); // 중복 hello
});

test('hello 전에는 ping 외 메시지 거부, 알 수 없는 t/깨진 JSON은 bad_msg', () => {
  const h = new Harness();
  h.logic.onConnect('x');
  h.send('x', { t: 'ping' });
  assert.deepEqual(h.msgs('x'), [{ t: 'pong' }]);
  h.clear();
  h.send('x', { t: 'pos', x: 0, z: 0, r: 0 });
  assert.deepEqual(h.msgs('x'), [{ t: 'error', code: 'bad_msg' }]);
  const a = h.join(1);
  h.clear();
  h.send(a, '{nope');
  h.send(a, '[]');
  h.send(a, '"x"');
  h.send(a, { t: 'zzz' });
  h.send(a, { x: 1 });
  h.logic.handleMessage(a, null);
  assert.equal(h.msgs(a, 'error').length, 6);
  assert.ok(h.msgs(a, 'error').every((m) => m.code === 'bad_msg'));
});

test('같은 id 재접속은 이전 연결을 교체한다', () => {
  const h = new Harness();
  const a = h.join(1);
  h.logic.onConnect('c1b');
  h.send('c1b', { t: 'hello', id: h.uuid(1), v: 1, avatar: { skin: 0, style: 0, hair: 0, outfit: 0, name: 0 } });
  assert.equal(h.logic.peerCount(), 1);
  assert.ok(h.closed.some(([c, code]) => c === a && code === 4000));
  assert.equal(h.msgs('c1b', 'welcome')[0].n, 1);
});

test('용량 30: 31번째는 full + next(같은 성당), 나가면 다시 입장 가능', () => {
  const h = new Harness(BASIC, 'basic-7');
  for (let i = 1; i <= 30; i++) h.join(i);
  assert.equal(h.logic.peerCount(), 30);
  const over = h.join(31);
  assert.deepEqual(h.msgs(over), [{ t: 'full', next: 'basic-8' }]);
  assert.ok(h.closed.some(([c, code]) => c === over && code === 4002));
  assert.equal(h.logic.peerCount(), 30);
  h.logic.onClose('c1');
  const again = h.join(32);
  assert.equal(h.msgs(again, 'welcome').length, 1);
  const h2 = new Harness(SYNTH, 'synth-50');
  for (let i = 1; i <= 30; i++) h2.join(i);
  const o2 = h2.join(31);
  assert.deepEqual(h2.msgs(o2), [{ t: 'full', next: 'synth-1' }]);
});

test('leave: 인원수 갱신 및 좌석 해제', () => {
  const h = new Harness();
  const a = h.join(1);
  const b = h.join(2);
  const c = h.join(3);
  h.clear();
  h.logic.onClose(b);
  assert.deepEqual(h.msgs(a), [{ t: 'leave', id: h.uuid(2), n: 2 }]);
  assert.deepEqual(h.msgs(c), [{ t: 'leave', id: h.uuid(2), n: 2 }]);
  h.logic.onClose(b); // 멱등
  assert.equal(h.msgs(a).length, 1);
  h.logic.onClose(c);
  assert.equal(h.msgs(a).at(-1)!.n, 1);
});

test('pos: 경계 클램프 (basic)', () => {
  const h = new Harness();
  const a = h.join(1);
  h.send(a, { t: 'pos', x: 999, z: 999, r: 0, m: 1 });
  let p = h.logic.getPeer(a)!;
  assert.ok(p.x <= 12 && p.z <= 20);
  h.walkTo(a, 12, 20);
  p = h.logic.getPeer(a)!;
  assert.equal(p.x, 12);
  assert.equal(p.z, 20);
  h.walkTo(a, -999, -999);
  p = h.logic.getPeer(a)!;
  assert.equal(p.x, -12);
  assert.equal(p.z, -20);
  h.t += 1000;
  h.send(a, { t: 'pos', x: -12, z: -20, r: 100, m: 0 });
  assert.ok(Math.abs(h.logic.getPeer(a)!.r - 4 * Math.PI) < 1e-3);
});

test('pos: 잘못된 값(NaN/문자열/무한대 문자열)은 bad_msg', () => {
  const h = new Harness();
  const a = h.join(1);
  h.clear();
  h.send(a, '{"t":"pos","x":"1","z":2,"r":0}');
  h.send(a, '{"t":"pos","x":1,"z":null,"r":0}');
  h.send(a, '{"t":"pos","x":1,"z":2}');
  h.send(a, '{"t":"pos","x":1e999,"z":2,"r":0}'); // Infinity로 파싱됨
  h.send(a, '{"t":"pos","x":1,"z":2,"r":0,"m":5}');
  assert.equal(h.msgs(a, 'error').length, 5);
  assert.equal(h.logic.getPeer(a)!.x, 0);
});

test('pos: 최대 속도 7m/s 보정 (서버 시각 기준, 방향 유지)', () => {
  const h = new Harness();
  const a = h.join(1);
  h.t += 10_000; // 예산을 상한까지 채운다
  h.send(a, { t: 'pos', x: 0, z: 17, r: 0, m: 0 }); // 예산 충전 + 제자리
  // 순간이동 시도: z=17 → z=0
  h.send(a, { t: 'pos', x: 0, z: 0, r: 0, m: 1 });
  let p = h.logic.getPeer(a)!;
  assert.ok(Math.abs(17 - p.z - MOVE_BUDGET_MAX) < 0.01, `moved ${17 - p.z}`);
  // 100ms 후 다시 요청: 0.7m만 더 이동
  h.t += 100;
  h.send(a, { t: 'pos', x: 0, z: 0, r: 0, m: 1 });
  const p2 = h.logic.getPeer(a)!;
  assert.ok(Math.abs(p.z - p2.z - MAX_SPEED * 0.1) < 0.02, `moved ${p.z - p2.z}`);
  // 평균 속도: 10초 동안 매 200ms 요청 → 총 이동 ≤ 7*10 + 버스트
  h.walkTo(a, 12, 20); // 정지 상태 정리
  const start = h.logic.getPeer(a)!;
  const t0 = h.t;
  for (let i = 0; i < 50; i++) {
    h.t += 200;
    h.send(a, { t: 'pos', x: -12, z: -20, r: 0, m: 1 });
  }
  const end = h.logic.getPeer(a)!;
  const moved = Math.hypot(end.x - start.x, end.z - start.z);
  assert.ok(moved <= (MAX_SPEED * (h.t - t0)) / 1000 + MOVE_BUDGET_MAX + 0.01, `moved ${moved}`);
  p = end;
});

test('pos: 정상 걷기(3m/s)는 그대로 반영되고 snap에는 변경된 피어만', () => {
  const h = new Harness();
  const a = h.join(1);
  const b = h.join(2);
  const c = h.join(3);
  h.logic.flush(); // 입장 직후 dirty 없음
  assert.equal(h.msgs(a, 'snap').length, 0);
  h.clear();
  h.t += 200;
  h.send(a, { t: 'pos', x: 0, z: 16.4, r: 0.5, m: 1 }); // 0.6m / 0.2s = 3m/s
  assert.equal(h.logic.getPeer(a)!.z, 16.4);
  h.logic.flush();
  // 변경된 건 a뿐: a 본인에게는 snap 없음, 나머지에게는 a만 포함
  assert.equal(h.msgs(a, 'snap').length, 0);
  for (const r of [b, c]) {
    const snaps = h.msgs(r, 'snap');
    assert.equal(snaps.length, 1);
    assert.deepEqual(snaps[0], { t: 'snap', n: 3, p: [[h.uuid(1), 0, 16.4, 0.5, 'w']] });
  }
  // 다음 flush: 아무도 안 움직였으면 아무것도 안 보낸다
  h.clear();
  h.logic.flush();
  assert.equal(h.out.size, 0);
  // 두 명이 움직이면 각자 상대 것만 받는다
  h.t += 200;
  h.send(a, { t: 'pos', x: 0.5, z: 16.4, r: 0.5, m: 1 });
  h.send(b, { t: 'pos', x: -0.5, z: 16.9, r: 1, m: 1 });
  h.clear();
  h.logic.flush();
  assert.deepEqual(h.msgs(a, 'snap')[0].p.map((e: unknown[]) => e[0]), [h.uuid(2)]);
  assert.deepEqual(h.msgs(b, 'snap')[0].p.map((e: unknown[]) => e[0]), [h.uuid(1)]);
  assert.deepEqual(h.msgs(c, 'snap')[0].p.map((e: unknown[]) => e[0]).sort(), [h.uuid(1), h.uuid(2)].sort());
});

test('좌석: 같은 자리 경합은 정확히 한 명만 성공', () => {
  const h = new Harness();
  const a = h.join(1);
  const b = h.join(2);
  h.walkTo(a, -3.2, -9.65 + 1.9 * 3 + 1);
  h.walkTo(b, -3.2, -9.65 + 1.9 * 3 + 1);
  h.clear();
  h.send(a, { t: 'sit', seat: 'L03-0' });
  h.send(b, { t: 'sit', seat: 'L03-0' });
  assert.deepEqual(h.msgs(a, 'seated'), [{ t: 'seated', id: h.uuid(1), seat: 'L03-0' }]);
  assert.deepEqual(h.msgs(b, 'seated'), [{ t: 'seated', id: h.uuid(1), seat: 'L03-0' }]); // 모두에게 전달
  assert.deepEqual(h.msgs(b, 'seat_denied'), [{ t: 'seat_denied', seat: 'L03-0', reason: 'taken' }]);
  assert.equal(h.msgs(a, 'seat_denied').length, 0);
  assert.equal(h.logic.seatOwner('L03-0'), h.uuid(1));
  const pa = h.logic.getPeer(a)!;
  assert.equal(pa.st, 's');
  assert.equal(pa.seat, 'L03-0');
  assert.equal(pa.x, -3.2);
  assert.ok(Math.abs(pa.z - (-10 + 1.9 * 3 + 0.35)) < 1e-9);
});

test('좌석: basic 좌표는 SPEC §1 공식과 일치', () => {
  const near = (p: { x: number; z: number } | null, x: number, z: number) => {
    assert.ok(p && Math.abs(p.x - x) < 1e-9 && Math.abs(p.z - z) < 1e-9, JSON.stringify(p));
  };
  near(seatPosition(BASIC, 'L03-2'), -5.2, -10 + 1.9 * 3 + 0.35);
  near(seatPosition(BASIC, 'R11-5'), 8.2, -10 + 1.9 * 11 + 0.35);
  assert.equal(seatIds(BASIC).length, 144);
});

test('좌석: 잘못된 id는 invalid', () => {
  const h = new Harness();
  const a = h.join(1);
  for (const s of ['X03-2', 'L12-0', 'L03-6', 'L3-2', 'l03-2', 'L03-02', 'L03-', '', 'L03-2 ', 'LL03-2', '../../x']) {
    h.clear();
    h.t += 200;
    h.send(a, { t: 'sit', seat: s });
    assert.deepEqual(h.msgs(a), [{ t: 'seat_denied', seat: s, reason: 'invalid' }], JSON.stringify(s));
  }
  h.clear();
  h.send(a, { t: 'sit', seat: 5 });
  assert.deepEqual(h.msgs(a), [{ t: 'error', code: 'bad_msg' }]);
});

test("좌석: 3m보다 멀면 'far'", () => {
  const h = new Harness();
  const a = h.join(1); // 스폰 (0,17)
  h.clear();
  h.send(a, { t: 'sit', seat: 'L00-0' });
  assert.deepEqual(h.msgs(a), [{ t: 'seat_denied', seat: 'L00-0', reason: 'far' }]);
  assert.equal(h.logic.seatOwner('L00-0'), null);
  // 가까이 가면 성공: L11-0 은 (-3.2, 10.9+0.35)
  h.walkTo(a, -3.2, 12.9); // 거리 ~1.9
  h.clear();
  h.send(a, { t: 'sit', seat: 'L11-0' });
  assert.equal(h.msgs(a, 'seated').length, 1);
  // 3m 경계: 3.01m 는 far, 2.99m 는 허용
  const h2 = new Harness();
  const b = h2.join(2);
  h2.walkTo(b, -3.2, 11.25 + 3.01);
  h2.clear();
  h2.send(b, { t: 'sit', seat: 'L11-0' });
  assert.equal(h2.msgs(b, 'seat_denied')[0]?.reason, 'far');
  h2.walkTo(b, -3.2, 11.25 + 2.99);
  h2.clear();
  h2.send(b, { t: 'sit', seat: 'L11-0' });
  assert.equal(h2.msgs(b, 'seated').length, 1);
});

test("좌석: 'taken'이 'far'보다 먼저 판정된다", () => {
  const h = new Harness();
  const a = h.join(1);
  const b = h.join(2);
  h.walkTo(a, -3.2, 12.9);
  h.send(a, { t: 'sit', seat: 'L11-0' });
  h.clear();
  h.send(b, { t: 'sit', seat: 'L11-0' }); // b는 멀리 있음
  assert.equal(h.msgs(b, 'seat_denied')[0].reason, 'taken');
});

test('좌석: 한 사람 한 자리, 같은 자리 재요청은 멱등, stand 후 이동 가능', () => {
  const h = new Harness();
  const a = h.join(1);
  h.walkTo(a, -3.2, 12.9);
  h.send(a, { t: 'sit', seat: 'L11-0' });
  h.clear();
  h.send(a, { t: 'sit', seat: 'L11-1' });
  assert.deepEqual(h.msgs(a), [{ t: 'seat_denied', seat: 'L11-1', reason: 'invalid' }]);
  assert.equal(h.logic.seatOwner('L11-1'), null);
  assert.equal(h.logic.seatOwner('L11-0'), h.uuid(1));
  h.clear();
  h.send(a, { t: 'sit', seat: 'L11-0' });
  assert.deepEqual(h.msgs(a), [{ t: 'seated', id: h.uuid(1), seat: 'L11-0' }]);
  h.clear();
  h.send(a, { t: 'stand' });
  assert.deepEqual(h.msgs(a), [{ t: 'stood', id: h.uuid(1) }]);
  assert.equal(h.logic.seatOwner('L11-0'), null);
  h.clear();
  h.send(a, { t: 'sit', seat: 'L11-1' });
  assert.equal(h.msgs(a, 'seated').length, 1);
});

test('좌석: 접속 해제 시 해제되어 다른 사람이 앉을 수 있다', () => {
  const h = new Harness();
  const a = h.join(1);
  const b = h.join(2);
  h.walkTo(a, -3.2, 12.9);
  h.walkTo(b, -3.2, 12.9);
  h.send(a, { t: 'sit', seat: 'L11-0' });
  h.logic.onClose(a);
  assert.equal(h.logic.seatOwner('L11-0'), null);
  h.clear();
  h.send(b, { t: 'sit', seat: 'L11-0' });
  assert.equal(h.msgs(b, 'seated').length, 1);
});

test('좌석: 앉아 있는 동안 pos 무시, welcome에 좌석 반영', () => {
  const h = new Harness();
  const a = h.join(1);
  h.walkTo(a, -3.2, 12.9);
  h.send(a, { t: 'sit', seat: 'L11-0' });
  const before = h.logic.getPeer(a)!;
  h.t += 1000;
  h.send(a, { t: 'pos', x: 5, z: 5, r: 1, m: 1 });
  assert.deepEqual(h.logic.getPeer(a), before);
  const b = h.join(2);
  const w = h.msgs(b, 'welcome')[0];
  assert.deepEqual(w.seats, { 'L11-0': h.uuid(1) });
  assert.equal(w.peers[0].seat, 'L11-0');
  assert.equal(w.peers[0].st, 's');
});

test('pray: 앉았을 때만, ms 범위 검증, st 전이', () => {
  const h = new Harness();
  const a = h.join(1);
  const b = h.join(2);
  h.clear();
  h.send(a, { t: 'pray', on: true, ms: 2 }); // 서 있음 → 무시
  assert.equal(h.out.size, 0);
  h.walkTo(a, -3.2, 12.9);
  h.send(a, { t: 'sit', seat: 'L11-0' });
  h.clear();
  h.send(a, { t: 'pray', on: true, ms: 2 });
  assert.deepEqual(h.msgs(b), [{ t: 'praying', id: h.uuid(1), on: true, ms: 2 }]);
  assert.equal(h.logic.getPeer(a)!.st, 'p');
  assert.equal(h.logic.getPeer(a)!.ms, 2);
  h.clear();
  for (const bad of [
    { t: 'pray', on: true, ms: 4 },
    { t: 'pray', on: true, ms: -1 },
    { t: 'pray', on: true, ms: 1.5 },
    { t: 'pray', on: 'yes', ms: 1 },
    { t: 'pray', on: false, ms: -2 },
    { t: 'pray', on: true },
  ]) {
    h.t += 200;
    h.send(a, bad);
  }
  assert.equal(h.msgs(a, 'error').length, 6);
  h.t += 1500;
  h.clear();
  h.send(a, { t: 'pray', on: false, ms: -1 });
  assert.equal(h.logic.getPeer(a)!.st, 's');
  assert.equal(h.logic.getPeer(a)!.ms, -1);
  h.send(a, { t: 'pray', on: true, ms: 0 });
  h.send(a, { t: 'stand' });
  const pa = h.logic.getPeer(a)!;
  assert.equal(pa.st, 'w');
  assert.equal(pa.ms, -1);
});

function nearCandle(h: Harness, c: string): void {
  h.walkTo(c, 10.5, 0);
}

test('촛불: 켜기, 중복 무시, 30분 후 재점등, 범위 검증, 거리', () => {
  const h = new Harness();
  const a = h.join(1);
  const b = h.join(2);
  h.clear();
  // 멀리서는 무시
  h.send(a, { t: 'candle', slot: 5, intention: 3 });
  assert.equal(h.out.size, 0);
  nearCandle(h, a);
  nearCandle(h, b);
  h.clear();
  h.send(a, { t: 'candle', slot: 5, intention: 3 });
  const lit = { t: 'candle', slot: 5, until: h.t + CANDLE_LIFETIME_MS, intention: 3 };
  assert.deepEqual(h.msgs(a), [lit]);
  assert.deepEqual(h.msgs(b), [lit]);
  // 같은 슬롯 중복: 다른 지향이어도 기존 유지, 요청자에게만 현재 상태
  h.clear();
  h.t += 1000;
  h.send(b, { t: 'candle', slot: 5, intention: 6 });
  assert.deepEqual(h.msgs(b), [lit]);
  assert.equal(h.msgs(a).length, 0);
  // welcome에 until 포함
  const c = h.join(3);
  assert.deepEqual(h.msgs(c, 'welcome')[0].candles, [{ slot: 5, until: lit.until, intention: 3 }]);
  // 30분 경과 후 만료 → 재점등
  h.t = lit.until + 1;
  h.logic.tick();
  assert.deepEqual(h.logic.activeCandles(), []);
  h.clear();
  h.send(b, { t: 'candle', slot: 5, intention: 6 });
  assert.equal(h.msgs(a)[0].intention, 6);
  assert.equal(h.msgs(a)[0].until, h.t + CANDLE_LIFETIME_MS);
  // 범위 검증
  h.clear();
  for (const bad of [
    { t: 'candle', slot: 24, intention: 0 },
    { t: 'candle', slot: -1, intention: 0 },
    { t: 'candle', slot: 0, intention: 8 },
    { t: 'candle', slot: 0.5, intention: 0 },
    { t: 'candle', slot: '1', intention: 0 },
  ]) {
    h.t += 200;
    h.send(a, bad);
  }
  assert.equal(h.msgs(a, 'error').length, 5);
});

test('촛불: 만료 직전(경계)은 아직 켜진 상태', () => {
  const h = new Harness();
  const a = h.join(1);
  nearCandle(h, a);
  h.clear();
  h.send(a, { t: 'candle', slot: 0, intention: 1 });
  const until = h.msgs(a)[0].until;
  h.t = until - 1;
  h.clear();
  h.send(a, { t: 'candle', slot: 0, intention: 2 });
  assert.equal(h.msgs(a)[0].intention, 1);
});

test('이모트: 범위 검증, 본인 제외 브로드캐스트, 속도 제한', () => {
  const h = new Harness();
  const a = h.join(1);
  const b = h.join(2);
  h.clear();
  h.send(a, { t: 'emote', e: 1 });
  assert.deepEqual(h.msgs(b), [{ t: 'emote', id: h.uuid(1), e: 1 }]);
  assert.equal(h.msgs(a).length, 0);
  h.clear();
  h.t += 100;
  h.send(a, { t: 'emote', e: 2 }); // 너무 빠름 → 무시
  assert.equal(h.out.size, 0);
  h.t += 2000;
  h.send(a, { t: 'emote', e: 2 });
  assert.equal(h.msgs(b).length, 1);
  h.clear();
  h.send(a, { t: 'emote', e: 3 });
  h.send(a, { t: 'emote', e: -1 });
  h.send(a, { t: 'emote', e: 'a' });
  assert.equal(h.msgs(a, 'error').length, 3);
});

test('메시지 속도 제한: 초당 12개 초과 → error rate 후 무시', () => {
  const h = new Harness();
  const a = h.join(1);
  h.t += 5000;
  h.clear();
  for (let i = 0; i < 12; i++) h.send(a, { t: 'ping' });
  assert.equal(h.msgs(a, 'pong').length, 12);
  assert.equal(h.msgs(a, 'error').length, 0);
  h.send(a, { t: 'ping' }); // 13번째
  h.send(a, { t: 'ping' });
  assert.equal(h.msgs(a, 'pong').length, 12);
  assert.deepEqual(h.msgs(a, 'error'), [{ t: 'error', code: 'rate' }]); // 에러는 초당 1회만
  // 1초 지나면 다시 정상
  h.t += 1001;
  h.clear();
  h.send(a, { t: 'ping' });
  assert.deepEqual(h.msgs(a), [{ t: 'pong' }]);
  // 느린 12/s 미만은 영향 없음
  h.clear();
  for (let i = 0; i < 30; i++) {
    h.t += 100;
    h.send(a, { t: 'ping' });
  }
  assert.equal(h.msgs(a, 'pong').length, 30);
  // 한도 초과 상태에서는 상태 변경 메시지도 무시된다
  h.t += 5000;
  for (let i = 0; i < 12; i++) h.send(a, { t: 'ping' });
  h.clear();
  h.send(a, { t: 'pos', x: 0, z: 10, r: 0, m: 1 });
  assert.equal(h.logic.getPeer(a)!.z, 17);
});

test('유휴 90분 후 자동 stand (ping은 활동이 아님)', () => {
  const h = new Harness();
  const a = h.join(1);
  const b = h.join(2);
  h.walkTo(a, -3.2, 12.9);
  h.send(a, { t: 'sit', seat: 'L11-0' });
  h.clear();
  h.t += IDLE_STAND_MS - 60_000;
  h.send(a, { t: 'ping' });
  h.logic.tick();
  assert.equal(h.logic.getPeer(a)!.seat, 'L11-0');
  h.t += 60_001;
  h.logic.tick();
  assert.deepEqual(h.msgs(b, 'stood'), [{ t: 'stood', id: h.uuid(1) }]);
  assert.deepEqual(h.msgs(a, 'stood'), [{ t: 'stood', id: h.uuid(1) }]);
  assert.equal(h.logic.getPeer(a)!.st, 'w');
  assert.equal(h.logic.seatOwner('L11-0'), null);
  // 활동이 있으면 연장된다
  const c = h.join(3);
  h.walkTo(c, -3.2, 12.9);
  h.send(c, { t: 'sit', seat: 'L11-1' });
  h.t += IDLE_STAND_MS - 1000;
  h.send(c, { t: 'pray', on: true, ms: 0 });
  h.t += 2000;
  h.logic.tick();
  assert.equal(h.logic.getPeer(c)!.seat, 'L11-1');
});

test('hello 없이 오래 둔 연결은 tick에서 닫힌다', () => {
  const h = new Harness();
  h.logic.onConnect('idle');
  h.logic.tick();
  assert.equal(h.closed.length, 0);
  h.t += 11_000;
  h.logic.tick();
  assert.deepEqual(h.closed, [['idle', 4003, 'hello_timeout']]);
  assert.equal(h.logic.connectionCount(), 0);
});

test('restorePeer: attachment로부터 피어/좌석 복원', () => {
  const h = new Harness();
  const a = h.join(1);
  h.walkTo(a, -3.2, 12.9);
  h.send(a, { t: 'sit', seat: 'L11-0' });
  h.send(a, { t: 'pray', on: true, ms: 1 });
  const snap = { ...h.logic.getPeer(a)!, lastActivityAt: h.t };
  const h2 = new Harness();
  assert.ok(h2.logic.restorePeer('r1', snap));
  assert.equal(h2.logic.seatOwner('L11-0'), h.uuid(1));
  const b = h2.join(2);
  const w = h2.msgs(b, 'welcome')[0];
  assert.equal(w.peers[0].st, 'p');
  assert.equal(w.peers[0].ms, 1);
  assert.equal(w.n, 2);
  // 잘못된 snapshot은 거부
  assert.equal(h2.logic.restorePeer('r2', { ...snap, id: 'x' }), false);
});

// ------------------------------------------------------------------ 레이아웃 일반성 (basic에 하드코딩되지 않음)

test('layout: 합성 레이아웃의 좌석 좌표와 유효성', () => {
  assert.deepEqual(seatPosition(SYNTH, 'A02-3'), { x: 0 + 1.5 * 3 + 0.5 * 2, z: 4 });
  assert.deepEqual(seatPosition(SYNTH, 'BC01-1'), { x: 9, z: 11.5 });
  assert.equal(seatPosition(SYNTH, 'A03-0'), null); // rows=3 → 0..2
  assert.equal(seatPosition(SYNTH, 'A00-4'), null); // perRow=4 → 0..3
  assert.equal(seatPosition(SYNTH, 'L03-2'), null); // basic 의 그룹은 여기 없음
  assert.equal(seatPosition(SYNTH, 'B00-0'), null); // 1글자 'B' 그룹 없음
  assert.equal(seatPosition(SYNTH, 'BC02-0'), null);
  assert.equal(seatPosition(SYNTH, 'A01-03'), null); // 비정규 표기
  assert.equal(seatIds(SYNTH).length, 3 * 4 + 2 * 2);
  assert.equal(seatPosition(BASIC, 'A00-0'), null);
  assert.equal(totalCandleSlots(SYNTH), 8);
});

test('layout: 합성 레이아웃의 스폰·경계·앉기·far', () => {
  const h = new Harness(SYNTH);
  const a = h.join(1);
  const w = h.msgs(a, 'welcome')[0];
  assert.equal(w.room, 'synth-1');
  const p0 = h.logic.getPeer(a)!;
  assert.equal(p0.x, 2);
  assert.equal(p0.z, 25);
  // 경계 x∈[-5,15], z∈[-8,30]
  h.walkTo(a, 99, 99);
  let p = h.logic.getPeer(a)!;
  assert.equal(p.x, 15);
  assert.equal(p.z, 30);
  h.walkTo(a, -99, -99);
  p = h.logic.getPeer(a)!;
  assert.equal(p.x, -5);
  assert.equal(p.z, -8);
  // basic 좌석은 거부, A02-3 은 멀면 far
  h.clear();
  h.send(a, { t: 'sit', seat: 'L03-2' });
  assert.equal(h.msgs(a)[0].reason, 'invalid');
  h.clear();
  h.send(a, { t: 'sit', seat: 'A02-3' }); // (5.5, 4) 까지 거리 큼
  assert.equal(h.msgs(a)[0].reason, 'far');
  h.walkTo(a, 5.5, 6.5);
  h.clear();
  h.send(a, { t: 'sit', seat: 'A02-3' });
  assert.equal(h.msgs(a, 'seated').length, 1);
  const s = h.logic.getPeer(a)!;
  assert.equal(s.x, 5.5);
  assert.equal(s.z, 4);
  // 2글자 그룹
  const b = h.join(2);
  h.walkTo(b, 9, 12);
  h.clear();
  h.send(b, { t: 'sit', seat: 'BC01-1' });
  assert.equal(h.msgs(b, 'seated').length, 1);
});

test('layout: 합성 레이아웃의 촛불 슬롯은 스탠드 전역 번호, 스탠드별 reach+1.2', () => {
  const h = new Harness(SYNTH);
  const a = h.join(1);
  h.clear();
  h.send(a, { t: 'candle', slot: 8, intention: 0 }); // 총 8슬롯 → 0..7
  assert.equal(h.msgs(a)[0].code, 'bad_msg');
  // 슬롯 4 는 두 번째 스탠드(14,-6, reach 2 → 3.2m). 스폰(2,25)에서는 멀다.
  h.clear();
  h.send(a, { t: 'candle', slot: 4, intention: 1 });
  assert.equal(h.out.size, 0);
  h.walkTo(a, 14, -2.9); // 거리 3.1 ≤ 3.2
  h.clear();
  h.send(a, { t: 'candle', slot: 4, intention: 1 });
  assert.equal(h.msgs(a, 'candle').length, 1);
  // 같은 위치에서 첫 번째 스탠드 슬롯(0..2)은 너무 멀다
  h.clear();
  h.send(a, { t: 'candle', slot: 1, intention: 1 });
  assert.equal(h.out.size, 0);
  // 첫 번째 스탠드(-4,20, reach 1 → 2.2m)
  h.walkTo(a, -4, 20 - 2.3);
  h.clear();
  h.send(a, { t: 'candle', slot: 1, intention: 1 });
  assert.equal(h.out.size, 0); // 2.3 > 2.2
  h.walkTo(a, -4, 20 - 2.1);
  h.send(a, { t: 'candle', slot: 1, intention: 1 });
  assert.equal(h.msgs(a, 'candle').length, 1);
});

test('layout: basic 촛불 reach(1.8+1.2=3.0m)', () => {
  const h = new Harness();
  const a = h.join(1);
  h.walkTo(a, 10.5, 3.1);
  h.clear();
  h.send(a, { t: 'candle', slot: 23, intention: 0 });
  assert.equal(h.out.size, 0);
  h.walkTo(a, 10.5, 2.9);
  h.send(a, { t: 'candle', slot: 23, intention: 0 });
  assert.equal(h.msgs(a, 'candle').length, 1);
});
