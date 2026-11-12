// S-01 서버 용량: 과부하 단계(순수 함수 + RoomLogic 적용), 성당 합산 현황, 방 디렉터리 배치 정책.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RoomLogic,
  LOAD_LEVELS,
  LOAD_UP_PEERS,
  LOAD_UP_RATE,
  nextLoadLevel,
  loadParams,
  kstDay,
  type Message,
} from '../src/room_logic';
import { DirectoryLogic, ROOM_TARGET, ROOM_TTL_MS, PENDING_TTL_MS, sumStats, type RoomReport } from '../src/directory_logic';
import type { Layout } from '../src/layout';

// 스폰이 한쪽 끝(-140, 0)인 아주 넓은 성당: 군중은 스폰에 모이고, 시험 대상은 걸어서 중앙으로 간다.
const FAR: Layout = {
  id: 'far',
  scalePercent: 100,
  bounds: { x0: -150, x1: 150, z0: -150, z1: 150 },
  spawn: { x: -140, z: 0, r: 0 },
  seatGroups: [{ g: 'S', rows: 2, perRow: 4, origin: { x: 5, z: 5 }, dx: 1, dz: 1, rowDx: 0, yaw: 0 }],
  candles: { stands: [{ x: 0, z: 2, slots: 96, reach: 1.8 }] },
};

class H {
  t = Date.UTC(2026, 10, 12, 3, 0, 0); // 2026-11-12 12:00 KST
  out = new Map<string, Message[]>();
  logic: RoomLogic;
  constructor() {
    this.logic = new RoomLogic({
      layout: FAR,
      room: 'far-1',
      now: () => this.t,
      send: (c, m) => {
        if (!this.out.has(c)) this.out.set(c, []);
        this.out.get(c)!.push(m);
      },
    });
  }
  msgs(c: string, t?: string): Message[] {
    const all = this.out.get(c) ?? [];
    return t ? all.filter((m) => m.t === t) : all;
  }
  uuid(i: number): string {
    return `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
  }
  send(c: string, m: Message): void {
    this.logic.handleMessage(c, JSON.stringify(m));
  }
  join(i: number): string {
    const c = `c${i}`;
    this.logic.onConnect(c);
    this.send(c, { t: 'hello', id: this.uuid(i), v: 1, avatar: { skin: 0, style: 0, hair: 0, outfit: 0, name: 0 } });
    this.t += 30;
    return c;
  }
  walkTo(c: string, x: number, z = 0): void {
    for (let i = 0; i < 200; i++) {
      const p = this.logic.getPeer(c)!;
      if (Math.hypot(p.x - x, p.z - z) < 0.01) return;
      this.t += 500;
      this.send(c, { t: 'pos', x, z, r: 0, m: 1 });
    }
  }
  /** 알람 한 번(tick → flush)을 흉내 낸다. */
  alarm(advance = 200): void {
    this.t += advance;
    this.logic.tick(this.t);
    this.logic.flush(this.t);
  }
}

// ------------------------------------------------------------------ 순수 함수

test('LOAD_LEVELS: 문서화된 값(200/400/800ms, 40/28/20m, 80/50/30명)과 단조 감소', () => {
  assert.deepEqual(LOAD_LEVELS.map((l) => l.snapMs), [200, 400, 800]);
  assert.deepEqual(LOAD_LEVELS.map((l) => l.aoiRadius), [40, 28, 20]);
  assert.deepEqual(LOAD_LEVELS.map((l) => l.maxVisible), [80, 50, 30]);
  for (const l of LOAD_LEVELS) assert.ok(l.aoiLeaveRadius > l.aoiRadius);
  assert.deepEqual([...LOAD_UP_PEERS], [60, 120]);
  assert.equal(loadParams(99).level, 2);
  assert.equal(loadParams(-5).level, 0);
});

test('nextLoadLevel: 인원 문턱(60 초과 → 1, 120 초과 → 2)', () => {
  assert.equal(nextLoadLevel(0, 0, 0), 0);
  assert.equal(nextLoadLevel(0, 60, 0), 0);
  assert.equal(nextLoadLevel(0, 61, 0), 1);
  assert.equal(nextLoadLevel(0, 120, 0), 1);
  assert.equal(nextLoadLevel(0, 121, 0), 2);
  assert.equal(nextLoadLevel(0, 2000, 0), 2);
});

test('nextLoadLevel: 메시지 속도 문턱(500/s, 1000/s 초과)', () => {
  assert.equal(nextLoadLevel(0, 10, LOAD_UP_RATE[0]), 0);
  assert.equal(nextLoadLevel(0, 10, LOAD_UP_RATE[0] + 1), 1);
  assert.equal(nextLoadLevel(0, 10, LOAD_UP_RATE[1] + 1), 2);
});

test('nextLoadLevel: 내려올 때는 히스테리시스(문턱의 85% 아래로)', () => {
  assert.equal(nextLoadLevel(1, 55, 0), 1); // 60 이하지만 51 초과: 유지
  assert.equal(nextLoadLevel(1, 51, 0), 0); // 60 * 0.85 = 51 이하
  assert.equal(nextLoadLevel(2, 110, 0), 2); // 120 * 0.85 = 102 초과: 유지
  assert.equal(nextLoadLevel(2, 100, 0), 1);
  assert.equal(nextLoadLevel(2, 40, 0), 0); // 여러 단계를 한 번에 내려올 수 있다
  assert.equal(nextLoadLevel(1, 10, 400), 0); // 속도 문턱 500 * 0.85 = 425 미만이면 내려온다
  assert.equal(nextLoadLevel(1, 10, 450), 1);
});

test('kstDay: 00:00 KST 경계', () => {
  assert.equal(kstDay(Date.UTC(2026, 10, 11, 14, 59, 59)), '2026-11-11');
  assert.equal(kstDay(Date.UTC(2026, 10, 11, 15, 0, 0)), '2026-11-12');
});

// ------------------------------------------------------------------ RoomLogic 에 적용

function crowd(h: H, from: number, to: number): void {
  for (let i = from; i <= to; i++) h.join(i);
}

test('과부하: 61명이면 단계 1, 121명이면 단계 2, 줄면 단계가 내려온다', () => {
  const h = new H();
  crowd(h, 1, 60);
  h.alarm();
  assert.equal(h.logic.loadLevel(), 0);
  h.join(61);
  h.alarm();
  assert.equal(h.logic.loadLevel(), 1);
  crowd(h, 62, 121);
  h.alarm();
  assert.equal(h.logic.loadLevel(), 2);
  for (let i = 122 - 1; i > 100; i--) h.logic.onClose(`c${i}`); // 100명
  h.alarm();
  assert.equal(h.logic.loadLevel(), 1);
  for (let i = 100; i > 40; i--) h.logic.onClose(`c${i}`); // 40명
  h.alarm();
  assert.equal(h.logic.loadLevel(), 0);
});

test('과부하: 메시지 속도가 높으면 인원이 적어도 단계가 오른다', () => {
  const h = new H();
  for (let i = 1; i <= 20; i++) h.join(i);
  h.alarm(1000); // 속도 창 초기화
  for (let k = 0; k < 30; k++) {
    for (let i = 1; i <= 20; i++) h.send(`c${i}`, { t: 'ping' });
    h.t += 30; // 20*30 = 600 메시지가 약 0.9초 안에 들어온다
  }
  h.alarm(100);
  assert.ok(h.logic.messageRate() > LOAD_UP_RATE[0], `rate=${h.logic.messageRate()}`);
  assert.equal(h.logic.loadLevel(), 1);
  assert.equal(h.logic.peerCount(), 20);
});

test('과부하: 가시 수 상한 — 단계 1 은 50, 단계 2 는 30명까지만 본다', () => {
  const h = new H();
  crowd(h, 1, 61); // 전원이 같은 자리(스폰)
  h.alarm();
  assert.equal(h.logic.loadLevel(), 1);
  assert.ok(h.logic.visibleTo('c1').length <= 50, `visible=${h.logic.visibleTo('c1').length}`);
  assert.ok(h.logic.visibleTo('c1').length >= 49);
  crowd(h, 62, 125);
  h.alarm();
  assert.equal(h.logic.loadLevel(), 2);
  for (const c of ['c1', 'c40', 'c100']) assert.ok(h.logic.visibleTo(c).length <= 30, `${c}=${h.logic.visibleTo(c).length}`);
  // 새 입장자의 welcome 도 상한을 따른다.
  h.join(200);
  const w = h.msgs('c200', 'welcome')[0];
  assert.ok(w.peers.length <= 30);
  assert.equal(w.n, 126); // n 은 상한과 무관하게 정확한 전체 인원
});

test('과부하: 상한에 걸린 피어는 보이는 쪽에게 leave{aoi:true} 로 알린다(진짜 퇴장 아님)', () => {
  const h = new H();
  crowd(h, 1, 60);
  h.alarm();
  h.out.clear();
  h.join(61);
  h.alarm(); // 단계 1 진입 → 재정렬
  const hidden = h.msgs('c1', 'leave');
  assert.ok(hidden.length > 0);
  assert.ok(hidden.every((m) => m.aoi === true));
});

test('과부하: 단계 1 의 AOI 반경은 28m(이탈 31m)', () => {
  const h = new H();
  const a = h.join(1);
  const b = h.join(2);
  h.walkTo(a, 0);
  h.walkTo(b, 35); // A 와 35m: 단계 0(40m)에서는 보이고, 단계 1(28m)에서는 숨겨진다
  h.alarm();
  assert.ok(h.logic.visibleTo(a).includes(h.uuid(2)));
  h.out.clear();
  for (let i = 3; i <= 62; i++) h.join(i); // 군중은 스폰(-140)에 있어 A,B 와 멀다. 총 62명 → 단계 1
  h.alarm();
  assert.equal(h.logic.loadLevel(), 1);
  assert.ok(!h.logic.visibleTo(a).includes(h.uuid(2)));
  assert.ok(h.msgs(a, 'leave').some((m) => m.id === h.uuid(2) && m.aoi === true));
  // 30m 로 다가오면(진입 28m 밖, 이탈 31m 안이지만 이미 숨김 상태) 아직 안 보이고, 25m 면 보인다.
  h.walkTo(b, 30);
  h.alarm(400);
  assert.ok(!h.logic.visibleTo(a).includes(h.uuid(2)));
  h.walkTo(b, 25);
  h.alarm(400);
  assert.ok(h.logic.visibleTo(a).includes(h.uuid(2)));
});

test('과부하: snap 전송이 단계 1 에서는 400ms, 단계 2 에서는 800ms 간격으로 묶인다', () => {
  const h = new H();
  const a = h.join(1);
  const b = h.join(2);
  h.walkTo(a, 0);
  h.walkTo(b, 5);
  for (let i = 3; i <= 62; i++) h.join(i); // 단계 1
  h.alarm();
  assert.equal(h.logic.loadLevel(), 1);
  h.alarm(400); // 직전 flush 와 간격을 확보
  h.out.clear();
  // 200ms 간격으로 움직이며 알람: 단계 1 이므로 snap 은 400ms 에 한 번만 나간다.
  const snaps: number[] = [];
  for (let k = 1; k <= 6; k++) {
    h.t += 100;
    h.send(b, { t: 'pos', x: 5 + k * 0.3, z: 0, r: 0, m: 1 });
    h.alarm(100);
    const got = h.msgs(a, 'snap').length;
    snaps.push(got);
  }
  const total = snaps[snaps.length - 1];
  assert.ok(total >= 2 && total <= 4, `snaps over 1.2s: ${total}`); // 200ms 간격이었다면 6번
  // 마지막 snap 에는 최신 위치가 들어 있다(쌓인 변경은 최신값만 나간다).
  const last = h.msgs(a, 'snap').at(-1)!;
  const entry = last.p.find((e: Array<string | number>) => e[0] === h.uuid(2));
  assert.ok(entry && (entry[1] as number) > 5);
});

test('과부하: 단계 0 에서는 flush 마다 즉시 전송(기존 동작 유지)', () => {
  const h = new H();
  const a = h.join(1);
  const b = h.join(2);
  h.walkTo(a, 0);
  h.walkTo(b, 5);
  h.out.clear();
  for (let k = 1; k <= 3; k++) {
    h.send(b, { t: 'pos', x: 5 + k * 0.3, z: 0, r: 0, m: 1 });
    h.t += 100;
    h.logic.flush(h.t);
  }
  assert.equal(h.msgs(a, 'snap').length, 3);
});

// ------------------------------------------------------------------ 성당 합산 현황

test('샤딩: n 은 다른 방 인원을 합산하고, welcome/leave/join/snap 모두 같은 n 을 쓴다', () => {
  const h = new H();
  const a = h.join(1);
  h.logic.setOthers({ peers: 40, seated: 10, praying: 5, candlesToday: 7 });
  const b = h.join(2);
  const w = h.msgs(b, 'welcome')[0];
  assert.equal(w.n, 42);
  assert.deepEqual(w.presence, { n: 42, seated: 10, praying: 5, candlesToday: 7 });
  h.walkTo(a, -138); // 같은 군중 근처(스폰 -140 에서 가까움)
  h.logic.onClose(b);
  const lv = h.msgs(a, 'leave').at(-1)!;
  assert.equal(lv.n, 41);
});

test('presence: 값이 바뀌고 10초가 지났을 때만 보내고, 60초가 지나면 같아도 보낸다', () => {
  const h = new H();
  const a = h.join(1);
  assert.equal(h.logic.maybeBroadcastPresence(h.t), true); // 첫 방송
  assert.equal(h.msgs(a, 'presence').length, 1);
  assert.deepEqual(h.msgs(a, 'presence')[0], { t: 'presence', n: 1, seated: 0, praying: 0, candlesToday: 0 });
  h.logic.setOthers({ peers: 3, seated: 0, praying: 0, candlesToday: 0 });
  h.t += 5_000;
  assert.equal(h.logic.maybeBroadcastPresence(h.t), false); // 바뀌었지만 10초 미만
  h.t += 6_000;
  assert.equal(h.logic.maybeBroadcastPresence(h.t), true);
  assert.equal(h.msgs(a, 'presence').at(-1)!.n, 4);
  h.t += 30_000;
  assert.equal(h.logic.maybeBroadcastPresence(h.t), false); // 같고 60초 미만
  h.t += 31_000;
  assert.equal(h.logic.maybeBroadcastPresence(h.t), true);
});

test('presence: 방에 아무도 없으면 보내지 않는다', () => {
  const h = new H();
  assert.equal(h.logic.maybeBroadcastPresence(h.t), false);
});

test('오늘 켜진 초: 켠 횟수를 세고(교체 포함), 자정(KST)에 0으로 돌아가며, 복원할 수 있다', () => {
  const h = new H();
  const a = h.join(1);
  h.walkTo(a, 0, 2);
  assert.equal(h.logic.candlesToday(h.t), 0);
  h.send(a, { t: 'candle', slot: 0, intention: 1 });
  h.send(a, { t: 'candle', slot: 1, intention: 2 });
  assert.equal(h.logic.candlesToday(h.t), 2);
  assert.equal(h.logic.litState().day, '2026-11-12');
  // 저장소에서 복원
  const h2 = new H();
  h2.logic.restoreLit(h.logic.litState());
  assert.equal(h2.logic.candlesToday(h2.t), 2);
  // 다음 날 00:00 KST 이후에는 어제 값이 오늘 수에 들어가지 않는다.
  const nextDay = Date.UTC(2026, 10, 12, 15, 0, 1);
  assert.equal(h2.logic.candlesToday(nextDay), 0);
  // 잘못된 값은 무시
  const h3 = new H();
  h3.logic.restoreLit({ day: 5, count: 'x' } as never);
  assert.equal(h3.logic.candlesToday(h3.t), 0);
});

test('localPresence: 앉은 사람과 기도 중인 사람 수', () => {
  const h = new H();
  const a = h.join(1);
  h.join(2);
  h.walkTo(a, 5, 5);
  h.send(a, { t: 'sit', seat: 'S00-0' });
  assert.deepEqual(h.logic.localPresence(), { peers: 2, seated: 1, praying: 0 });
  h.send(a, { t: 'pray', on: true, ms: 1 });
  assert.deepEqual(h.logic.localPresence(), { peers: 2, seated: 1, praying: 1 });
});

// ------------------------------------------------------------------ 디렉터리 배치 정책

const rep = (o: Partial<RoomReport> = {}): RoomReport => ({
  peers: 0,
  conns: 0,
  seated: 0,
  praying: 0,
  candlesToday: 0,
  day: '2026-11-12',
  accepts: 0,
  ...o,
});
const T0 = Date.UTC(2026, 10, 12, 3, 0, 0);

test('디렉터리: 빈 성당이면 항상 -1 방', () => {
  const d = new DirectoryLogic('basic');
  assert.equal(d.assign(T0).room, 'basic-1');
});

test('디렉터리: 정원 목표(60) 미만인 방 중 가장 찬 방에 넣는다', () => {
  const d = new DirectoryLogic('basic');
  d.report(1, rep({ peers: 20, conns: 20 }), T0);
  d.report(2, rep({ peers: 45, conns: 45 }), T0);
  d.report(3, rep({ peers: 10, conns: 10 }), T0);
  assert.equal(d.assign(T0 + 1).room, 'basic-2');
  d.report(2, rep({ peers: 46, conns: 46, accepts: 1 }), T0 + 2); // 방금 배치된 1명이 도착했다고 보고
  d.report(2, rep({ peers: 59, conns: 59 }), T0 + 2);
  assert.equal(d.assign(T0 + 3).room, 'basic-2'); // 59 → 60 (pending 포함 60)
  assert.equal(d.assign(T0 + 4).room, 'basic-1'); // 2번이 찼으니 그다음으로 찬 1번
});

test('디렉터리: 모든 방이 목표에 닿으면 새 방을 연다(거절 없음)', () => {
  const d = new DirectoryLogic('basic');
  d.report(1, rep({ peers: ROOM_TARGET, conns: ROOM_TARGET }), T0);
  assert.equal(d.assign(T0).room, 'basic-2');
  d.report(2, rep({ peers: ROOM_TARGET, conns: ROOM_TARGET }), T0);
  assert.equal(d.assign(T0).room, 'basic-3');
});

test('디렉터리: 2000명이 연달아 들어와도 전원 배정되고 방당 목표(60)를 넘지 않는다', () => {
  const d = new DirectoryLogic('basic');
  const counts = new Map<string, number>();
  for (let i = 0; i < 2000; i++) {
    const { room } = d.assign(T0 + i); // 방이 보고하기 전(미확정만으로)에도 균등하게 찬다
    counts.set(room, (counts.get(room) ?? 0) + 1);
  }
  assert.equal([...counts.values()].reduce((a, b) => a + b, 0), 2000);
  assert.ok(Math.max(...counts.values()) <= ROOM_TARGET);
  assert.equal(counts.size, Math.ceil(2000 / ROOM_TARGET)); // 34개 방
  // 가득 찬 방들이 먼저 채워지고 마지막 방만 덜 찬다.
  const sorted = [...counts.values()].sort((a, b) => b - a);
  assert.equal(sorted.filter((c) => c === ROOM_TARGET).length, 33);
});

test('디렉터리: 방 수 한도까지 모두 목표 이상이면 가장 한산한 방에 넣는다(거절 없음)', () => {
  const d = new DirectoryLogic('basic', 5, ROOM_TTL_MS, 3); // 목표 5명, 방 3개
  for (let n = 1; n <= 3; n++) d.report(n, rep({ peers: 5 + n, conns: 5 + n }), T0);
  assert.equal(d.assign(T0).room, 'basic-1'); // 6명으로 가장 한산
  d.report(1, rep({ peers: 9, conns: 9 }), T0);
  assert.equal(d.assign(T0).room, 'basic-2'); // 이제 7명인 2번이 가장 한산
});

test('디렉터리: 보고가 끊긴 방은 TTL(20초) 뒤 0명으로 본다', () => {
  const d = new DirectoryLogic('basic');
  d.report(1, rep({ peers: 30, conns: 30 }), T0);
  d.report(2, rep({ peers: 10, conns: 10 }), T0);
  assert.equal(d.stats(T0 + 1000).live, 40);
  d.report(2, rep({ peers: 10, conns: 10 }), T0 + 15_000); // 2번만 계속 보고
  assert.equal(d.stats(T0 + ROOM_TTL_MS + 1000).live, 10);
  assert.equal(d.stats(T0 + ROOM_TTL_MS + 1000).rooms, 1);
  assert.equal(d.assign(T0 + ROOM_TTL_MS + 1000).room, 'basic-2'); // 죽은 1번 대신 살아 있는 2번이 가장 참
});

test('디렉터리: 미확정 배치는 방의 accepts 보고로 정리되고 15초 뒤 만료된다', () => {
  const d = new DirectoryLogic('basic', 3);
  d.assign(T0); // basic-1 pending 1
  d.assign(T0); // pending 2
  d.assign(T0); // pending 3 → 목표 도달
  assert.equal(d.assign(T0).room, 'basic-2');
  // 1번 방이 3명을 받았다고 보고: pending 3 → 0, conns 3 (합계는 그대로 3)
  d.report(1, rep({ peers: 3, conns: 3, accepts: 3 }), T0 + 500);
  assert.equal(d.assign(T0 + 501).room, 'basic-2'); // 2번에 pending 2개 → 가장 찬 방은 2번(2) 
  // 오지 않는 접속의 pending 은 만료된다.
  const d2 = new DirectoryLogic('basic', 2);
  d2.assign(T0);
  d2.assign(T0); // basic-1 이 가득(pending 2)
  assert.equal(d2.assign(T0 + 1).room, 'basic-2');
  assert.equal(d2.assign(T0 + PENDING_TTL_MS + 100).room, 'basic-1');
});

test('디렉터리: report 는 이 방을 뺀 다른 방들의 합계를 돌려준다', () => {
  const d = new DirectoryLogic('basic');
  d.report(1, rep({ peers: 30, conns: 30, seated: 5, praying: 2, candlesToday: 4 }), T0);
  const o = d.report(2, rep({ peers: 10, conns: 10, seated: 3, praying: 1, candlesToday: 1 }), T0 + 10);
  assert.deepEqual(o, { peers: 30, seated: 5, praying: 2, candlesToday: 4 });
  const o1 = d.report(1, rep({ peers: 31, conns: 31, seated: 5, praying: 2, candlesToday: 4 }), T0 + 20);
  assert.deepEqual(o1, { peers: 10, seated: 3, praying: 1, candlesToday: 1 });
});

test('디렉터리: stats 는 살아 있는 방의 합계, 오늘(KST) 켜진 초는 만료된 방 것도 포함하되 어제 것은 제외', () => {
  const d = new DirectoryLogic('basic');
  d.report(1, rep({ peers: 5, conns: 5, candlesToday: 3 }), T0);
  d.report(2, rep({ peers: 7, conns: 7, candlesToday: 2, day: '2026-11-11' }), T0); // 어제 기준 값
  const s = d.stats(T0 + 1000);
  assert.deepEqual(s, { live: 12, seated: 0, praying: 0, candlesToday: 3, rooms: 2 });
  const later = d.stats(T0 + 5 * 60_000); // 보고가 끊김: 인원 0, 오늘의 초는 유지
  assert.deepEqual(later, { live: 0, seated: 0, praying: 0, candlesToday: 3, rooms: 0 });
  // 자정(KST) 이후에는 어제 날짜의 카운터가 0 으로 본다.
  const nextDay = Date.UTC(2026, 10, 12, 15, 0, 1);
  assert.equal(d.stats(nextDay).candlesToday, 0);
});

test('디렉터리: snapshot/restore 는 방 번호와 오늘의 초만 되살린다', () => {
  const d = new DirectoryLogic('basic');
  d.report(1, rep({ peers: 5, conns: 5, candlesToday: 3 }), T0);
  assert.equal(d.dirty, true);
  const snap = d.snapshot();
  assert.equal(d.dirty, false);
  const d2 = new DirectoryLogic('basic');
  d2.restore(snap);
  d2.restore({ rooms: [{ n: 999, candlesToday: 1, day: 'x' }] } as never); // 범위 밖은 무시
  const s = d2.stats(T0 + 1000);
  assert.equal(s.live, 0);
  assert.equal(s.candlesToday, 3);
  assert.equal(d2.assign(T0 + 1000).room, 'basic-1');
});

test('디렉터리: 잘못된 보고(방 번호 범위 밖, 음수·NaN)는 무시하거나 0 으로 정리한다', () => {
  const d = new DirectoryLogic('basic');
  d.report(0, rep({ peers: 9 }), T0);
  d.report(51, rep({ peers: 9 }), T0);
  assert.equal(d.stats(T0).live, 0);
  d.report(1, rep({ peers: -4, conns: NaN as never }), T0);
  assert.equal(d.stats(T0).live, 0);
});

test('sumStats: 성당별 합산', () => {
  const t = sumStats([
    { live: 3, seated: 1, praying: 1, candlesToday: 5, rooms: 1 },
    { live: 7, seated: 2, praying: 0, candlesToday: 1, rooms: 2 },
  ]);
  assert.deepEqual(t, { live: 10, seated: 3, praying: 1, candlesToday: 6, rooms: 3 });
});
