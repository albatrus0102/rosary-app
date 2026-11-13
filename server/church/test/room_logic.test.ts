import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RoomLogic,
  AOI_LEAVE_RADIUS,
  AOI_RADIUS,
  MAX_SPEED,
  MOVE_BUDGET_MAX,
  RATE_LIMIT_PER_SEC,
  SEAT_FAR_DISTANCE,
  WHO_MAX,
  WHO_MIN_MS,
  parseRoomName,
  type Message,
  type StoredCandle,
} from '../src/room_logic';
import { seatPosition, seatIds, totalCandleSlots, type Layout } from '../src/layout';
import { BASIC_FALLBACK } from '../src/layouts_fallback';
import { CandleStore, type StorageLike } from '../src/candle_store';

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
      { x: 14, z: -6, slots: 96, reach: 2.0 },
    ],
  },
};

// AOI 시험용: 반경 40m 를 충분히 벗어날 수 있는 넓은 성당(좌석 없음).
const WIDE: Layout = {
  id: 'wide',
  scalePercent: 100,
  bounds: { x0: -150, x1: 150, z0: -150, z1: 150 },
  spawn: { x: 0, z: 0, r: 0 },
  seatGroups: [{ g: 'S', rows: 2, perRow: 4, origin: { x: 5, z: 5 }, dx: 1, dz: 1, rowDx: 0, yaw: 0 }],
  candles: { stands: [{ x: 0, z: 2, slots: 96, reach: 1.8 }] },
};

class Harness {
  t = 1_000_000;
  out = new Map<string, Message[]>();
  closed: Array<[string, number, string]> = [];
  saved: StoredCandle[] = [];
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
      persistCandle: (c) => this.saved.push(c),
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
    for (let i = 0; i < 400; i++) {
      const p = this.logic.getPeer(c)!;
      if (Math.hypot(p.x - x, p.z - z) < 0.01) return;
      this.t += 500;
      this.send(c, { t: 'pos', x, z, r: 0, m: 1 });
    }
  }
}

test('parseRoomName', () => {
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
  const good = { skin: 3, style: 3, hair: 9, outfit: 11, name: 4095 };
  const bad: Message[] = [
    { ...good, skin: 4 },
    { ...good, skin: -1 },
    { ...good, style: 4 },
    { ...good, hair: 10 },
    { ...good, outfit: 12 },
    { ...good, name: 4096 },
    { ...good, name: -1 },
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

test('hello: name 0..NAME_MAX(4095), 성별 g(추가 필드)는 0/1만, nv 는 2만 중계', () => {
  const base = { skin: 1, style: 2, hair: 3, outfit: 4 };
  const ok: Message[] = [
    { ...base, name: 39 }, // g·nv 없음
    { ...base, name: 0, g: 0 },
    { ...base, name: 99, g: 1 },
    { ...base, name: 0, g: 0, nv: 2 },
    { ...base, name: 3787, g: 1, nv: 2 }, // 통합 목록의 마지막 이름
    { ...base, name: 4095, g: 0, nv: 2 }, // 상한
    { ...base, name: 759, nv: 2 }, // g 없이 nv 만
  ];
  for (const [i, av] of ok.entries()) {
    const h = new Harness();
    const a = h.join(1, av);
    const welcome = h.msgs(a, 'welcome');
    assert.equal(welcome.length, 1, `ok case ${i}`);
    // 나중에 들어온 사람의 welcome에 g·nv 포함 그대로 중계된다.
    const b = h.join(2);
    const peers = h.msgs(b, 'welcome')[0].peers as Message[];
    assert.deepEqual(peers[0].avatar, { ...av }, `relay ${i}`);
  }
  // 알 수 없는 nv 는 버리고(없는 것으로) 중계한다: 받는 쪽이 옛 형식으로 안전하게 읽는다.
  for (const nv of [1, 3, 0, -2, 2.5, '2', true, null]) {
    const h = new Harness();
    const a = h.join(1, { ...base, name: 7, g: 1, nv });
    assert.equal(h.msgs(a, 'welcome').length, 1, `nv ${nv}`);
    const b = h.join(2);
    const peers = h.msgs(b, 'welcome')[0].peers as Message[];
    assert.deepEqual(peers[0].avatar, { ...base, name: 7, g: 1 }, `nv ${nv}`);
  }
  const bad: Message[] = [
    { ...base, name: 4096 }, // 상한 초과
    { ...base, name: 4096, g: 0, nv: 2 },
    { ...base, name: 100000, g: 0, nv: 2 },
    { ...base, name: -1, g: 0, nv: 2 },
    { ...base, name: 5, g: 2 },
    { ...base, name: 5, g: -1 },
    { ...base, name: 5, g: 0.5 },
    { ...base, name: 5, g: '1' },
    { ...base, name: 5, g: true },
  ];
  for (const [i, av] of bad.entries()) {
    const h = new Harness();
    h.logic.onConnect('x');
    h.send('x', { t: 'hello', id: h.uuid(1), v: 1, avatar: av });
    assert.deepEqual(h.msgs('x'), [{ t: 'error', code: 'bad_msg' }], `bad case ${i}`);
    assert.equal(h.logic.peerCount(), 0);
  }
  // g: null 은 없는 것으로 본다.
  const h = new Harness();
  const a = h.join(1, { ...base, name: 39, g: null });
  assert.equal(h.msgs(a, 'welcome').length, 1);
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

test('인원 제한 없음: 31번째 이후에도 full 없이 입장, 안전 상한 초과만 error busy', () => {
  const h = new Harness(BASIC, 'basic-1');
  for (let i = 1; i <= 120; i++) h.join(i);
  assert.equal(h.logic.peerCount(), 120);
  for (let i = 1; i <= 120; i++) {
    assert.equal(h.msgs(`c${i}`, 'full').length, 0);
    assert.equal(h.msgs(`c${i}`, 'welcome').length, 1);
  }
  assert.equal(h.msgs('c120', 'welcome')[0].n, 120);
  assert.equal(h.closed.length, 0);
  // 안전 상한(테스트에서는 5로 줄여서 확인)
  const h2 = new Harness(BASIC, 'basic-1', 5);
  for (let i = 1; i <= 5; i++) h2.join(i);
  const over = h2.join(6);
  assert.deepEqual(h2.msgs(over), [{ t: 'error', code: 'busy' }]);
  assert.ok(h2.closed.some(([c, code]) => c === over && code === 4002));
  assert.equal(h2.logic.peerCount(), 5);
  h2.logic.onClose('c1');
  assert.equal(h2.msgs(h2.join(7), 'welcome').length, 1);
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

test("좌석: 8m보다 멀면 'far'", () => {
  assert.equal(SEAT_FAR_DISTANCE, 8);
  const h = new Harness();
  const a = h.join(1); // 스폰 (0,17); L00-0 은 (-3.2,-9.3)이라 매우 멀다
  h.clear();
  h.send(a, { t: 'sit', seat: 'L00-0' });
  assert.deepEqual(h.msgs(a), [{ t: 'seat_denied', seat: 'L00-0', reason: 'far' }]);
  assert.equal(h.logic.seatOwner('L00-0'), null);
  // L11-0 (-3.2, 11.25): 스폰에서 약 6.5m → 이제 허용
  h.clear();
  h.send(a, { t: 'sit', seat: 'L11-0' });
  assert.equal(h.msgs(a, 'seated').length, 1);
  // 경계: 8.01m 는 far, 7.99m 는 허용
  const h2 = new Harness();
  const b = h2.join(2);
  h2.walkTo(b, -3.2, 11.25 + 8.01);
  h2.clear();
  h2.send(b, { t: 'sit', seat: 'L11-0' });
  assert.equal(h2.msgs(b, 'seat_denied')[0]?.reason, 'far');
  h2.walkTo(b, -3.2, 11.25 + 7.99);
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

test('촛불: 켜기(until 0), 모두에게 전송, 이미 켜진 슬롯은 무시, 만료 없음, 범위·거리', () => {
  const h = new Harness();
  const a = h.join(1);
  const b = h.join(2);
  h.clear();
  // 스폰(0,17)에서 촛불대(10.5,0)까지 20m → 무시
  h.send(a, { t: 'candle', slot: 5, intention: 3 });
  assert.equal(h.out.size, 0);
  nearCandle(h, a);
  nearCandle(h, b);
  h.clear();
  h.send(a, { t: 'candle', slot: 5, intention: 3 });
  const lit = { t: 'candle', slot: 5, until: 0, intention: 3 };
  assert.deepEqual(h.msgs(a), [lit]);
  assert.deepEqual(h.msgs(b), [lit]);
  assert.equal(h.saved.length, 1);
  assert.deepEqual({ ...h.saved[0] }, { slot: 5, until: 0, intention: 3, seq: 1 });
  // 같은 슬롯 중복(스탠드에 빈 슬롯 있음): 기존 유지, 요청자에게만 현재 상태
  h.clear();
  h.send(b, { t: 'candle', slot: 5, intention: 6 });
  assert.deepEqual(h.msgs(b), [lit]);
  assert.equal(h.msgs(a).length, 0);
  assert.equal(h.saved.length, 1);
  // 시간이 아무리 지나도 꺼지지 않는다
  h.t += 365 * 24 * 3600 * 1000;
  h.logic.tick();
  assert.deepEqual(h.logic.activeCandles(), [{ slot: 5, until: 0, intention: 3 }]);
  const c = h.join(3);
  assert.deepEqual(h.msgs(c, 'welcome')[0].candles, [{ slot: 5, until: 0, intention: 3 }]);
  // 한 사람이 여러 개 켤 수 있다(개수 제한 없음)
  h.clear();
  for (let slot = 10; slot < 40; slot++) {
    h.t += 100;
    h.send(a, { t: 'candle', slot, intention: slot % 8 });
  }
  assert.equal(h.msgs(a, 'candle').length, 30);
  assert.equal(h.logic.activeCandles().length, 31);
  // 범위 검증: basic 은 슬롯 96개
  h.clear();
  for (const bad of [
    { t: 'candle', slot: 96, intention: 0 },
    { t: 'candle', slot: -1, intention: 0 },
    { t: 'candle', slot: 0, intention: 8 },
    { t: 'candle', slot: 0.5, intention: 0 },
    { t: 'candle', slot: '1', intention: 0 },
  ]) {
    h.t += 100;
    h.send(a, bad);
  }
  assert.equal(h.msgs(a, 'error').length, 5);
  h.clear();
  h.t += 100;
  h.send(a, { t: 'candle', slot: 95, intention: 0 });
  assert.equal(h.msgs(a, 'candle').length, 1);
});

test('촛불: 스탠드가 꽉 차면 가장 오래된 초를 조용히 교체(해당 슬롯으로 브로드캐스트)', () => {
  const h = new Harness(SYNTH); // 첫 스탠드(-4,20): 슬롯 0..2
  const a = h.join(1);
  const b = h.join(2);
  h.walkTo(a, -4, 20);
  h.walkTo(b, -4, 20);
  // 켠 순서: 1, 0, 2 → 가장 오래된 것은 슬롯 1
  for (const slot of [1, 0, 2]) {
    h.t += 100;
    h.send(a, { t: 'candle', slot, intention: slot });
  }
  assert.equal(h.logic.activeCandles().length, 3);
  h.clear();
  h.t += 100;
  h.send(b, { t: 'candle', slot: 2, intention: 7 }); // 꽉 참 → 슬롯 1 교체
  const expected = { t: 'candle', slot: 1, until: 0, intention: 7 };
  assert.deepEqual(h.msgs(a), [expected]);
  assert.deepEqual(h.msgs(b), [expected]);
  assert.equal(h.msgs(a, 'error').length, 0);
  assert.equal(h.saved.at(-1)!.slot, 1);
  // 다음으로 오래된 것은 슬롯 0
  h.clear();
  h.t += 100;
  h.send(b, { t: 'candle', slot: 1, intention: 5 });
  assert.deepEqual(h.msgs(a), [{ t: 'candle', slot: 0, until: 0, intention: 5 }]);
  // 두 번째 스탠드(96개)는 영향 없음
  assert.equal(h.logic.activeCandles().length, 3);
});

test('촛불: 저장소 보존 — 가짜 저장소에서 복원', async () => {
  const kv = new Map<string, unknown>();
  const fake: StorageLike = {
    async put(k, v) {
      kv.set(k, structuredClone(v));
    },
    async list({ prefix }) {
      return new Map([...kv].filter(([k]) => k.startsWith(prefix)));
    },
  };
  const store = new CandleStore(fake);
  const h = new Harness();
  // persistCandle → 저장소
  const logic1 = new RoomLogic({
    layout: BASIC,
    now: () => h.t,
    send: (c, m) => h.out.set(c, [...(h.out.get(c) ?? []), m]),
    persistCandle: (c) => void store.save(c),
  });
  logic1.onConnect('a');
  logic1.handleMessage('a', JSON.stringify({ t: 'hello', id: h.uuid(1), v: 1, avatar: { skin: 0, style: 0, hair: 0, outfit: 0, name: 0 } }));
  for (let i = 0; i < 40; i++) {
    h.t += 500;
    logic1.handleMessage('a', JSON.stringify({ t: 'pos', x: 10.5, z: 0, r: 0 }));
  }
  for (const [slot, intention] of [[3, 1], [4, 2], [3, 5]] as const) {
    h.t += 100;
    logic1.handleMessage('a', JSON.stringify({ t: 'candle', slot, intention }));
  }
  await Promise.resolve();
  assert.deepEqual([...kv.keys()].sort(), ['c:3', 'c:4']);
  // "재시작": 새 RoomLogic 에 저장소 내용을 복원
  const logic2 = new RoomLogic({ layout: BASIC, now: () => h.t, send: () => {} });
  logic2.restoreCandles(await store.load());
  assert.deepEqual(logic2.activeCandles(), [
    { slot: 3, until: 0, intention: 1 },
    { slot: 4, until: 0, intention: 2 },
  ]);
  // 복원된 seq 를 이어받아 "가장 오래된" 판정이 유지된다(슬롯 3 이 더 오래됨).
  const small: Layout = { ...BASIC, candles: { stands: [{ x: 10.5, z: 0, slots: 2, reach: 1.8 }] } };
  const out: Message[] = [];
  const logic3 = new RoomLogic({ layout: small, now: () => h.t, send: (_c, m) => out.push(m) });
  logic3.restoreCandles([
    { slot: 0, until: 0, intention: 1, seq: 7 },
    { slot: 1, until: 0, intention: 2, seq: 5 },
  ]);
  logic3.onConnect('b');
  logic3.handleMessage('b', JSON.stringify({ t: 'hello', id: h.uuid(2), v: 1, avatar: { skin: 0, style: 0, hair: 0, outfit: 0, name: 0 } }));
  for (let i = 0; i < 40; i++) {
    h.t += 500;
    logic3.handleMessage('b', JSON.stringify({ t: 'pos', x: 10.5, z: 0, r: 0 }));
  }
  out.length = 0;
  logic3.handleMessage('b', JSON.stringify({ t: 'candle', slot: 0, intention: 6 }));
  assert.deepEqual(out, [{ t: 'candle', slot: 1, until: 0, intention: 6 }]); // seq 5 (슬롯 1)가 가장 오래됨
  // 깨진 레코드는 무시
  const logic4 = new RoomLogic({ layout: BASIC, now: () => h.t, send: () => {} });
  logic4.restoreCandles([{ slot: 999, until: 0, intention: 0, seq: 1 }, { slot: 1, until: 0, intention: 99, seq: 2 }, null as never]);
  assert.deepEqual(logic4.activeCandles(), []);
});
test('이모트: 범위 검증, 쿨다운 없음, 본인 포함 브로드캐스트', () => {
  const h = new Harness();
  const a = h.join(1);
  const b = h.join(2);
  h.clear();
  h.send(a, { t: 'emote', e: 1 });
  assert.deepEqual(h.msgs(b), [{ t: 'emote', id: h.uuid(1), e: 1 }]);
  assert.deepEqual(h.msgs(a), [{ t: 'emote', id: h.uuid(1), e: 1 }]);
  h.clear();
  h.send(a, { t: 'emote', e: 2 }); // 같은 시각에 다시 보내도 막지 않는다
  h.send(a, { t: 'emote', e: 0 });
  assert.equal(h.msgs(b, 'emote').length, 2);
  h.clear();
  h.send(a, { t: 'emote', e: 3 });
  h.send(a, { t: 'emote', e: -1 });
  h.send(a, { t: 'emote', e: 'a' });
  assert.equal(h.msgs(a, 'error').length, 3);
});

test('메시지 속도 제한: 초당 40개 초과 → error rate 후 무시', () => {
  assert.equal(RATE_LIMIT_PER_SEC, 40);
  const h = new Harness();
  const a = h.join(1);
  h.t += 5000;
  h.clear();
  for (let i = 0; i < 40; i++) h.send(a, { t: 'ping' });
  assert.equal(h.msgs(a, 'pong').length, 40);
  assert.equal(h.msgs(a, 'error').length, 0);
  h.send(a, { t: 'ping' }); // 41번째
  h.send(a, { t: 'ping' });
  assert.equal(h.msgs(a, 'pong').length, 40);
  assert.deepEqual(h.msgs(a, 'error'), [{ t: 'error', code: 'rate' }]); // 에러는 초당 1회만
  // 1초 지나면 다시 정상
  h.t += 1001;
  h.clear();
  h.send(a, { t: 'ping' });
  assert.deepEqual(h.msgs(a), [{ t: 'pong' }]);
  // 초당 40개 미만의 꾸준한 흐름은 영향 없음
  h.clear();
  for (let i = 0; i < 100; i++) {
    h.t += 30;
    h.send(a, { t: 'ping' });
  }
  assert.equal(h.msgs(a, 'pong').length, 100);
  // 한도 초과 상태에서는 상태 변경 메시지도 무시된다
  h.t += 5000;
  for (let i = 0; i < 40; i++) h.send(a, { t: 'ping' });
  h.clear();
  h.send(a, { t: 'pos', x: 0, z: 10, r: 0, m: 1 });
  assert.equal(h.logic.getPeer(a)!.z, 17);
});

test('유휴 자동 일어서기 없음: 아무리 오래 있어도 앉은 자리 유지', () => {
  const h = new Harness();
  const a = h.join(1);
  const b = h.join(2);
  h.walkTo(a, -3.2, 12.9);
  h.send(a, { t: 'sit', seat: 'L11-0' });
  h.clear();
  h.t += 24 * 3600 * 1000;
  h.logic.tick();
  h.logic.flush();
  assert.equal(h.logic.getPeer(a)!.seat, 'L11-0');
  assert.equal(h.logic.seatOwner('L11-0'), h.uuid(1));
  assert.equal(h.msgs(b, 'stood').length, 0);
  // 연결이 끊어질 때만 비워진다
  h.logic.onClose(a);
  assert.equal(h.logic.seatOwner('L11-0'), null);
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
  const snap = h.logic.getPeer(a)!;
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
  assert.equal(totalCandleSlots(SYNTH), 99);
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

test('layout: 합성 레이아웃의 촛불 슬롯은 스탠드 전역 번호, 스탠드별 reach+5', () => {
  assert.equal(totalCandleSlots(SYNTH), 99);
  const h = new Harness(SYNTH);
  const a = h.join(1);
  h.clear();
  h.send(a, { t: 'candle', slot: 99, intention: 0 }); // 총 99슬롯 → 0..98
  assert.equal(h.msgs(a)[0].code, 'bad_msg');
  // 슬롯 4 는 두 번째 스탠드(14,-6, reach 2 → 7.0m). 스폰(2,25)에서는 멀다.
  h.clear();
  h.send(a, { t: 'candle', slot: 4, intention: 1 });
  assert.equal(h.out.size, 0);
  h.walkTo(a, 14, -6 + 7.2); // 7.2 > 7.0
  h.clear();
  h.send(a, { t: 'candle', slot: 4, intention: 1 });
  assert.equal(h.out.size, 0);
  h.walkTo(a, 14, -6 + 6.9);
  h.clear();
  h.send(a, { t: 'candle', slot: 98, intention: 1 }); // 두 번째 스탠드의 마지막 슬롯
  assert.equal(h.msgs(a, 'candle').length, 1);
  // 같은 위치에서 첫 번째 스탠드 슬롯(0..2)은 너무 멀다
  h.clear();
  h.send(a, { t: 'candle', slot: 1, intention: 1 });
  assert.equal(h.out.size, 0);
  // 첫 번째 스탠드(-4,20, reach 1 → 6.0m)
  h.walkTo(a, -4, 20 - 6.1);
  h.clear();
  h.send(a, { t: 'candle', slot: 1, intention: 1 });
  assert.equal(h.out.size, 0);
  h.walkTo(a, -4, 20 - 5.9);
  h.send(a, { t: 'candle', slot: 1, intention: 1 });
  assert.equal(h.msgs(a, 'candle').length, 1);
});

test('layout: basic 촛불 reach(1.8+5=6.8m), 슬롯 96개', () => {
  assert.equal(totalCandleSlots(BASIC), 96);
  const h = new Harness();
  const a = h.join(1);
  h.walkTo(a, 10.5, 6.9);
  h.clear();
  h.send(a, { t: 'candle', slot: 95, intention: 0 });
  assert.equal(h.out.size, 0);
  h.walkTo(a, 10.5, 6.7);
  h.send(a, { t: 'candle', slot: 95, intention: 0 });
  assert.equal(h.msgs(a, 'candle').length, 1);
});

// ------------------------------------------------------------------ AOI (관심 영역)

/** WIDE 에서 피어들을 지정 좌표로 걸어서 옮긴다. */
function place(h: Harness, c: string, x: number, z: number): void {
  h.walkTo(c, x, z);
}

test('AOI: welcome.peers 는 반경 40m 안만, 가까운 순, 앉은 피어 포함; n 은 전체', () => {
  const h = new Harness(WIDE);
  const far = h.join(1);
  const mid = h.join(2);
  const near = h.join(3);
  const sitter = h.join(4);
  place(h, far, 100, 0);
  place(h, mid, 30, 0);
  place(h, near, 10, 0);
  place(h, sitter, 5, 5); // S00-0 (5,5)
  h.send(sitter, { t: 'sit', seat: 'S00-0' });
  h.logic.flush();
  const me = h.join(5); // 스폰 (0,0)
  const w = h.msgs(me, 'welcome')[0];
  assert.equal(w.n, 5);
  assert.deepEqual(w.peers.map((p: Message) => p.id), [h.uuid(4), h.uuid(3), h.uuid(2)]); // 7.07, 10, 30 — far(100) 제외
  assert.equal(w.peers[0].seat, 'S00-0');
  assert.deepEqual(w.seats, { 'S00-0': h.uuid(4) });
  // join 은 반경 안의 사람에게만
  assert.equal(h.msgs(mid, 'join').filter((m) => m.peer.id === h.uuid(5)).length, 1);
  assert.equal(h.msgs(far, 'join').filter((m) => m.peer.id === h.uuid(5)).length, 0);
  assert.equal(h.msgs(near, 'join').at(-1)!.n, 5);
});

test('AOI: 반경 진입 시 join, 이탈 시 leave{aoi:true}(히스테리시스), 진짜 퇴장은 aoi 없음', () => {
  assert.ok(AOI_RADIUS === 40 && AOI_LEAVE_RADIUS > AOI_RADIUS);
  const h = new Harness(WIDE);
  const a = h.join(1);
  const b = h.join(2);
  place(h, b, 100, 0);
  h.logic.flush();
  assert.deepEqual(h.logic.visibleTo(a), []);
  assert.deepEqual(h.logic.visibleTo(b), []);
  h.clear();
  // b 가 다가온다: 41m → 아직 안 보임
  place(h, b, 41, 0);
  h.logic.flush();
  assert.equal(h.msgs(a, 'join').length, 0);
  assert.equal(h.msgs(a, 'snap').length, 0); // 보이지 않으므로 snap 도 없다
  // 39m → 서로에게 join (가시 집합은 대칭)
  place(h, b, 39, 0);
  h.clear();
  h.logic.flush();
  const ja = h.msgs(a, 'join');
  assert.equal(ja.length, 1);
  assert.equal(ja[0].peer.id, h.uuid(2));
  assert.equal(ja[0].n, 2);
  assert.equal(h.msgs(b, 'join')[0].peer.id, h.uuid(1));
  assert.equal(h.msgs(a, 'snap').length, 0); // join 에 최신 상태가 들어 있으므로 snap 중복 없음
  // 이후 움직임은 snap 으로
  h.t += 300;
  h.send(b, { t: 'pos', x: 38, z: 0, r: 0, m: 1 });
  h.clear();
  h.logic.flush();
  assert.equal(h.msgs(a, 'snap').length, 1);
  // 41m (히스테리시스 안): 계속 보인다
  place(h, b, 43, 0);
  h.clear();
  h.logic.flush();
  assert.equal(h.msgs(a, 'leave').length, 0);
  assert.deepEqual(h.logic.visibleTo(a), [h.uuid(2)]);
  // 44m 초과: 숨김 통지
  place(h, b, 45, 0);
  h.clear();
  h.logic.flush();
  assert.deepEqual(h.msgs(a, 'leave'), [{ t: 'leave', id: h.uuid(2), n: 2, aoi: true }]);
  assert.deepEqual(h.msgs(b, 'leave'), [{ t: 'leave', id: h.uuid(1), n: 2, aoi: true }]);
  assert.deepEqual(h.logic.visibleTo(a), []);
  // 숨은 동안의 움직임은 보내지 않는다
  h.t += 300;
  h.send(b, { t: 'pos', x: 46, z: 0, r: 0, m: 1 });
  h.clear();
  h.logic.flush();
  assert.equal(h.out.size, 0);
  // 다시 들어오면 join
  place(h, b, 30, 0);
  h.clear();
  h.logic.flush();
  assert.equal(h.msgs(a, 'join').length, 1);
  // 멀리 있는 사람의 진짜 퇴장은 모두에게, aoi 필드 없음
  const c = h.join(3);
  place(h, c, 140, 140);
  h.clear();
  h.logic.onClose(c);
  assert.deepEqual(h.msgs(a), [{ t: 'leave', id: h.uuid(3), n: 2 }]);
  assert.ok(!('aoi' in h.msgs(a)[0]));
});

test('AOI: seated/praying/emote 는 가까운 사람 + 본인에게만, 촛불은 모두에게', () => {
  const h = new Harness(WIDE);
  const actor = h.join(1);
  const near = h.join(2);
  const far = h.join(3);
  place(h, far, 120, 0);
  h.logic.flush();
  h.clear();
  h.send(actor, { t: 'emote', e: 1 });
  assert.equal(h.msgs(actor, 'emote').length, 1);
  assert.equal(h.msgs(near, 'emote').length, 1);
  assert.equal(h.msgs(far, 'emote').length, 0);
  h.clear();
  place(h, actor, 5, 5); // 좌석 위치 근처
  h.clear();
  h.send(actor, { t: 'sit', seat: 'S00-0' });
  h.send(actor, { t: 'pray', on: true, ms: 1 });
  for (const m of ['seated', 'praying']) {
    assert.equal(h.msgs(actor, m).length, 1, m);
    assert.equal(h.msgs(near, m).length, 1, m);
    assert.equal(h.msgs(far, m).length, 0, m);
  }
  // 촛불: WIDE 스탠드(0,2) 근처로 가서 켜면 멀리 있는 사람에게도 전달
  const c = h.join(4);
  h.clear();
  h.send(c, { t: 'candle', slot: 7, intention: 2 });
  for (const p of [actor, near, far, c]) {
    assert.deepEqual(h.msgs(p, 'candle'), [{ t: 'candle', slot: 7, until: 0, intention: 2 }]);
  }
});

test('AOI: snap 은 수신자 가시 집합의 변경 피어만 (본인 제외)', () => {
  const h = new Harness(WIDE);
  const a = h.join(1);
  const b = h.join(2);
  const f = h.join(3);
  place(h, f, 120, 0);
  h.logic.flush();
  h.t += 300;
  h.send(f, { t: 'pos', x: 121, z: 0, r: 0, m: 1 });
  h.send(b, { t: 'pos', x: 1, z: 0, r: 0, m: 1 });
  h.clear();
  h.logic.flush();
  assert.deepEqual(h.msgs(a, 'snap')[0].p.map((e: unknown[]) => e[0]), [h.uuid(2)]);
  assert.deepEqual(h.msgs(b, 'snap').length, 0);
  assert.equal(h.msgs(f, 'snap').length, 0); // 아무도 안 보임
  assert.equal(h.msgs(a, 'snap')[0].n, 3);
});

test('AOI: rebuildVisibility (복원 후 가시 집합 재계산)', () => {
  const h = new Harness(WIDE);
  const a = h.join(1);
  const b = h.join(2);
  const f = h.join(3);
  place(h, f, 120, 0);
  const snaps = ['c1', 'c2', 'c3'].map((c) => h.logic.getPeer(c)!);
  const h2 = new Harness(WIDE);
  snaps.forEach((snap, i) => assert.ok(h2.logic.restorePeer(`r${i}`, snap)));
  assert.deepEqual(h2.logic.visibleTo('r0'), []);
  h2.logic.rebuildVisibility();
  assert.deepEqual(h2.logic.visibleTo('r0'), [h.uuid(2)]);
  assert.deepEqual(h2.logic.visibleTo('r2'), []);
  void a;
  void b;
});

test('who: 이 방 명단은 세례명·상태만(id·위치·좌석 없음), 본인 제외, AOI 밖도 포함', () => {
  const h = new Harness(WIDE);
  const a = h.join(1, { skin: 0, style: 0, hair: 0, outfit: 0, name: 11, g: 1, nv: 2 });
  const b = h.join(2, { skin: 0, style: 0, hair: 0, outfit: 0, name: 22, g: 0, nv: 2 });
  const c = h.join(3); // 옛 형식(g·nv 없음)
  h.walkTo(c, 100, 100); // a 의 AOI 밖
  const seat = seatIds(WIDE)[0];
  const sp = seatPosition(WIDE, seat)!;
  h.walkTo(b, sp.x, sp.z);
  h.send(b, { t: 'sit', seat });
  h.send(b, { t: 'pray', on: true, ms: 2 });
  h.logic.setOthers({ peers: 5, seated: 0, praying: 0, candlesToday: 0 });
  h.clear();
  h.t += WHO_MIN_MS;
  h.send(a, { t: 'who' });
  const w = h.msgs(a, 'who');
  assert.equal(w.length, 1);
  assert.deepEqual(w[0], {
    t: 'who',
    n: 8,
    room: 3,
    list: [
      { name: 22, st: 'p', g: 0, nv: 2 },
      { name: 7, st: 'w' },
    ],
  });
  const text = JSON.stringify(w[0]);
  for (const i of [1, 2, 3]) assert.ok(!text.includes(h.uuid(i)));
  // 다른 사람에게는 아무것도 가지 않는다.
  assert.equal(h.msgs(b).length, 0);
  assert.equal(h.msgs(c).length, 0);
});

test('who: 연결당 WHO_MIN_MS 에 한 번만 답하고, hello 전에는 bad_msg', () => {
  const h = new Harness();
  const a = h.join(1);
  h.join(2);
  h.clear();
  h.send(a, { t: 'who' });
  h.t += WHO_MIN_MS - 1;
  h.send(a, { t: 'who' });
  assert.equal(h.msgs(a, 'who').length, 1);
  assert.equal(h.msgs(a, 'error').length, 0);
  h.t += 1;
  h.send(a, { t: 'who' });
  assert.equal(h.msgs(a, 'who').length, 2);
  h.logic.onConnect('x');
  h.send('x', { t: 'who' });
  assert.deepEqual(h.msgs('x'), [{ t: 'error', code: 'bad_msg' }]);
});

test('who: WHO_MAX 명까지만 담고 more 로 알린다', () => {
  const h = new Harness();
  for (let i = 1; i <= WHO_MAX + 3; i++) h.join(i);
  h.clear();
  h.t += WHO_MIN_MS;
  h.send('c1', { t: 'who' });
  const w = h.msgs('c1', 'who')[0];
  assert.equal(w.list.length, WHO_MAX);
  assert.equal(w.more, true);
  assert.equal(w.room, WHO_MAX + 3);
});
