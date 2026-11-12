// 사이버 성당 부하 테스트(S-01). 두 가지 방식:
//
//  1) 네트워크: 봇 N개가 WebSocket 으로 서버에 접속해 걷고, 앉고, 이모트·촛불을 한다(기본 500, 홍보 전 2000).
//     node scripts/loadtest.mjs [--url http://127.0.0.1:8787] [--bots 500] [--church basic|mix] [--ramp 25] [--duration 60]
//  2) --dry: 네트워크 없이 같은 방 로직(RoomLogic + 방 배정 DirectoryLogic)을 한 프로세스 안에서 가상 시계로 돌린다(CI용).
//     node --import tsx scripts/loadtest.mjs --dry [--bots 2000] [--duration 30]
//
// 옵션
//   --url <base>        서버 주소(기본 http://127.0.0.1:8787, `wrangler dev`). 로컬이 아니면 --allow-remote 가 필요하다.
//   --allow-remote      로컬이 아닌 서버(배포된 Worker)에 부하를 걸어도 된다는 확인. 요금이 나올 수 있다.
//   --bots <n>          봇 수(기본 500)
//   --church <id|mix>   접속할 성당(기본 basic). mix 는 카탈로그 전체에 고르게 나눈다.
//   --ramp <per-sec>    초당 접속 시작 수(기본 25). 2000명이면 80~100 정도를 권한다.
//   --duration <sec>    모두 접속한 뒤 유지할 시간(기본 60초; --dry 에서는 가상 초, 기본 30)
//   --seed <n>          난수 시드(기본 1)
//   --single            (--dry 전용) 샤딩을 끄고 모두 `<성당>-1` 한 방에 넣어 과부하 단계(전송 간격·반경·가시 수 감소)를 관찰한다.
//   --json              마지막에 요약을 JSON 으로도 출력
//   --dry               네트워크 없이 인-프로세스 실행(tsx 로더 필요: node --import tsx ...)
//
// 측정값은 이 스크립트가 직접 잰 것만 출력한다(외삽 없음).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// ------------------------------------------------------------------ 인자
function parseArgs(argv) {
  const o = { url: 'http://127.0.0.1:8787', bots: 500, church: 'basic', ramp: 25, duration: null, seed: 1, dry: false, json: false, allowRemote: false, single: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--url') o.url = next();
    else if (a === '--bots') o.bots = parseInt(next(), 10);
    else if (a === '--church') o.church = next();
    else if (a === '--ramp') o.ramp = parseFloat(next());
    else if (a === '--duration') o.duration = parseFloat(next());
    else if (a === '--seed') o.seed = parseInt(next(), 10);
    else if (a === '--dry') o.dry = true;
    else if (a === '--json') o.json = true;
    else if (a === '--allow-remote') o.allowRemote = true;
    else if (a === '--single') o.single = true;
    else if (a === '-h' || a === '--help') {
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 24).join('\n'));
      process.exit(0);
    } else {
      console.error('알 수 없는 옵션: ' + a);
      process.exit(2);
    }
  }
  if (!Number.isFinite(o.bots) || o.bots < 1) throw new Error('--bots 는 1 이상');
  if (!Number.isFinite(o.ramp) || o.ramp <= 0) throw new Error('--ramp 는 0 보다 커야 함');
  if (o.duration === null) o.duration = o.dry ? 30 : 60;
  return o;
}

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadLayouts() {
  const raw = JSON.parse(fs.readFileSync(path.join(here, '../src/layouts.json'), 'utf8'));
  const list = Array.isArray(raw) ? raw : raw.layouts || raw.churches || Object.values(raw);
  const out = {};
  for (const l of Array.isArray(list) ? list : Object.values(list)) if (l && typeof l.id === 'string') out[l.id] = l;
  return out;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}
function stats(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return { n: s.length, p50: percentile(s, 50), p95: percentile(s, 95), p99: percentile(s, 99), max: s.length ? s[s.length - 1] : NaN };
}
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : '-');
function table(rows) {
  const w = rows[0].map((_, c) => Math.max(...rows.map((r) => String(r[c]).length)));
  for (const [i, r] of rows.entries()) {
    console.log(r.map((v, c) => (c === 0 ? String(v).padEnd(w[c]) : String(v).padStart(w[c]))).join('  '));
    if (i === 0) console.log(w.map((x) => '-'.repeat(x)).join('  '));
  }
}

// ------------------------------------------------------------------ 봇 두뇌(네트워크/인-프로세스 공통)
/** 걷고(2.5m/s, 5Hz) 가끔 앉아 기도하고, 이모트를 하고, 촛불대로 가서 초를 켠다. 메시지를 만들어 돌려줄 뿐이다. */
class Brain {
  constructor(layout, rng, seatList, seatPos, stands) {
    this.layout = layout;
    this.rng = rng;
    this.seatList = seatList;
    this.seatPos = seatPos;
    this.stands = stands;
    this.x = layout.spawn.x;
    this.z = layout.spawn.z;
    this.r = 0;
    this.state = 'idle'; // idle | walk | toSeat | sitting | toCandle
    this.until = 0;
    this.tx = this.x;
    this.tz = this.z;
    this.seat = null;
    this.stand = null;
    this.prayed = false;
  }
  rand(a, b) {
    return a + this.rng() * (b - a);
  }
  newWaypoint() {
    const b = this.layout.bounds;
    this.tx = this.rand(b.x0 + 1, b.x1 - 1);
    this.tz = this.rand(b.z0 + 1, b.z1 - 1);
    this.state = 'walk';
  }
  onMessage(m) {
    if (m.t === 'seat_denied' && this.state === 'toSeat') this.state = 'idle';
  }
  /** dtMs 마다 호출. 보낼 메시지 배열을 돌려준다. */
  step(now, dtMs) {
    const out = [];
    const dt = dtMs / 1000;
    const roll = (perSec) => this.rng() < perSec * dt;
    if (this.state === 'sitting') {
      if (now >= this.until) {
        if (this.prayed) out.push({ t: 'pray', on: false, ms: -1 });
        out.push({ t: 'stand' });
        this.state = 'idle';
        this.until = now + this.rand(1000, 4000);
        this.prayed = false;
      } else if (!this.prayed && roll(0.5)) {
        out.push({ t: 'pray', on: true, ms: Math.floor(this.rand(0, 4)) });
        this.prayed = true;
      }
      return out;
    }
    if (this.state === 'idle') {
      if (now >= this.until) this.newWaypoint();
    }
    if (this.state === 'walk' || this.state === 'toSeat' || this.state === 'toCandle') {
      const dx = this.tx - this.x;
      const dz = this.tz - this.z;
      const d = Math.hypot(dx, dz);
      const stepLen = 2.5 * dt;
      if (d > 0.3) {
        const k = Math.min(1, stepLen / d);
        this.x += dx * k;
        this.z += dz * k;
        this.r = Math.atan2(dx, -dz);
        out.push({ t: 'pos', x: +this.x.toFixed(2), z: +this.z.toFixed(2), r: +this.r.toFixed(3), m: 1 });
      } else if (this.state === 'toSeat') {
        out.push({ t: 'sit', seat: this.seat });
        this.state = 'sitting';
        this.until = now + this.rand(20_000, 90_000);
        this.prayed = false;
      } else if (this.state === 'toCandle') {
        out.push({ t: 'candle', slot: this.stand.base + Math.floor(this.rand(0, this.stand.slots)), intention: Math.floor(this.rand(0, 8)) });
        this.state = 'idle';
        this.until = now + this.rand(1000, 4000);
      } else {
        this.state = 'idle';
        this.until = now + this.rand(1000, 6000);
      }
    }
    if (this.state === 'walk' || this.state === 'idle') {
      if (this.seatList.length > 0 && roll(1 / 45)) {
        this.seat = this.seatList[Math.floor(this.rng() * this.seatList.length)];
        const p = this.seatPos(this.seat);
        if (p) {
          this.tx = p.x;
          this.tz = p.z;
          this.state = 'toSeat';
        }
      } else if (this.stands.length > 0 && roll(1 / 150)) {
        this.stand = this.stands[Math.floor(this.rng() * this.stands.length)];
        this.tx = this.stand.x;
        this.tz = this.stand.z;
        this.state = 'toCandle';
      } else if (roll(1 / 60)) {
        out.push({ t: 'emote', e: Math.floor(this.rand(0, 3)) });
      }
    }
    return out;
  }
}

async function loadLayoutHelpers() {
  const { seatIds, seatPosition } = await import('../src/layout.ts');
  return { seatIds, seatPosition };
}

function makeBrainFactory(layouts, helpers, seed) {
  const cache = {};
  const info = (id) => {
    if (cache[id]) return cache[id];
    const layout = layouts[id];
    const seatList = helpers.seatIds(layout);
    let base = 0;
    const stands = layout.candles.stands.map((s) => {
      const st = { x: s.x, z: s.z, slots: s.slots, base };
      base += s.slots;
      return st;
    });
    cache[id] = { layout, seatList, stands, seatPos: (s) => helpers.seatPosition(layout, s) };
    return cache[id];
  };
  let n = 0;
  return (id) => {
    const c = info(id);
    return new Brain(c.layout, mulberry32(seed * 7919 + ++n), c.seatList, c.seatPos, c.stands);
  };
}

const AVATAR = () => ({ skin: 0, style: 0, hair: Math.floor(Math.random() * 10), outfit: Math.floor(Math.random() * 12), name: Math.floor(Math.random() * 40) });

// ------------------------------------------------------------------ 네트워크 모드
async function runNetwork(o) {
  const { default: WebSocket } = await import('ws');
  const base = o.url.replace(/\/$/, '');
  const host = new URL(base).hostname;
  const local = ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host);
  if (!local && !o.allowRemote) {
    console.error(`원격 서버(${host})에 부하를 걸려면 --allow-remote 를 붙이세요. 배포된 서버에 쓰면 Cloudflare 요금이 나올 수 있습니다.`);
    process.exit(2);
  }
  const health = await fetch(base + '/health').then((r) => r.json()).catch(() => null);
  if (!health || !health.ok) {
    console.error(`${base}/health 에 연결할 수 없습니다. 먼저 'npm run dev'(wrangler dev)를 실행하세요.`);
    process.exit(2);
  }
  const layouts = loadLayouts();
  const helpers = await loadLayoutHelpers();
  const churches = o.church === 'mix' ? health.churches.filter((c) => layouts[c]) : [o.church];
  if (!churches.every((c) => layouts[c])) {
    console.error('알 수 없는 성당: ' + o.church);
    process.exit(2);
  }
  const mk = makeBrainFactory(layouts, helpers, o.seed);
  const wsBase = base.replace(/^http/, 'ws');

  const m = {
    attempted: 0, opened: 0, welcomed: 0, failedConnect: 0, dropped: 0, closedOther: 0,
    connectMs: [], welcomeMs: [], rtt: [], sent: 0, recv: 0, bytes: 0, errors: {}, rooms: {}, maxN: 0, presenceSeen: 0,
  };
  const bots = [];
  let stopping = false;
  const t0 = Date.now();

  function startBot(i) {
    const church = churches[i % churches.length];
    const brain = mk(church);
    const bot = { i, church, brain, ws: null, state: 'connecting', id: crypto.randomUUID(), pingAt: 0, nextPing: 0, nextPos: 0 };
    bots.push(bot);
    m.attempted++;
    const tStart = Date.now();
    const ws = new WebSocket(`${wsBase}/ws?room=${church}-1&v=1`, { handshakeTimeout: 15000 });
    bot.ws = ws;
    ws.on('open', () => {
      m.opened++;
      m.connectMs.push(Date.now() - tStart);
      bot.helloAt = Date.now();
      ws.send(JSON.stringify({ t: 'hello', id: bot.id, v: 1, avatar: AVATAR() }));
      m.sent++;
    });
    ws.on('message', (data) => {
      const s = data.toString();
      m.recv++;
      m.bytes += s.length;
      let msg;
      try {
        msg = JSON.parse(s);
      } catch {
        return;
      }
      if (msg.t === 'welcome') {
        bot.state = 'ready';
        m.welcomed++;
        m.welcomeMs.push(Date.now() - bot.helloAt);
        m.rooms[msg.room] = (m.rooms[msg.room] || 0) + 1;
        m.maxN = Math.max(m.maxN, msg.n);
        bot.nextPing = Date.now() + 1000 + Math.random() * 2000;
      } else if (msg.t === 'pong') {
        if (bot.pingAt) {
          m.rtt.push(Date.now() - bot.pingAt);
          bot.pingAt = 0;
        }
      } else if (msg.t === 'presence') {
        m.presenceSeen++;
        m.maxN = Math.max(m.maxN, msg.n);
      } else if (msg.t === 'error') {
        m.errors[msg.code] = (m.errors[msg.code] || 0) + 1;
      } else {
        bot.brain.onMessage(msg);
      }
    });
    ws.on('error', () => {
      if (bot.state === 'connecting') {
        bot.state = 'failed';
        m.failedConnect++;
      }
    });
    ws.on('close', () => {
      if (stopping) return;
      if (bot.state === 'ready') {
        m.dropped++;
        bot.state = 'dropped';
      } else if (bot.state === 'connecting') {
        bot.state = 'failed';
        m.failedConnect++;
      } else m.closedOther++;
    });
  }

  console.log(`대상 ${base}  봇 ${o.bots}  성당 ${churches.join(',')}  램프 ${o.ramp}/초  유지 ${o.duration}초`);

  // 램프업 + 봇 동작 루프(100ms)
  let started = 0;
  const tickMs = 100;
  const lastPosAt = new Map();
  const loop = setInterval(() => {
    const now = Date.now();
    const target = Math.min(o.bots, Math.floor(((now - t0) / 1000) * o.ramp) + 1);
    while (started < target) startBot(started++);
    for (const bot of bots) {
      if (bot.state !== 'ready' || bot.ws.readyState !== 1) continue;
      const last = lastPosAt.get(bot.i) || 0;
      if (now - last >= 200) {
        lastPosAt.set(bot.i, now);
        for (const msg of bot.brain.step(now, 200)) {
          bot.ws.send(JSON.stringify(msg));
          m.sent++;
        }
      }
      if (now >= bot.nextPing && !bot.pingAt) {
        bot.pingAt = now;
        bot.nextPing = now + 3000;
        bot.ws.send('{"t":"ping","k":1}'); // 자동 응답 문자열과 다르게 보내 DO 로직 경로를 지나게 한다
        m.sent++;
      }
    }
  }, tickMs);

  // 모두 시도 + 안정 시간 기다리기
  const rampSec = o.bots / o.ramp;
  const progress = setInterval(() => {
    const t = ((Date.now() - t0) / 1000).toFixed(0);
    process.stdout.write(`\r  ${t}s  시도 ${m.attempted}  welcome ${m.welcomed}  실패 ${m.failedConnect}  끊김 ${m.dropped}   `);
  }, 1000);
  await new Promise((r) => setTimeout(r, (rampSec + 5 + o.duration) * 1000));
  clearInterval(progress);
  process.stdout.write('\n');

  // 종료 직전에 서버가 센 인원을 읽는다(우리가 접속 중일 때).
  const liveStats = await fetch(base + '/stats').then((r) => r.json()).catch(() => null);
  clearInterval(loop);
  stopping = true;
  const elapsed = (Date.now() - t0) / 1000;
  for (const b of bots) {
    try {
      b.ws.close();
    } catch {}
  }

  const c = stats(m.connectMs);
  const w = stats(m.welcomeMs);
  const r = stats(m.rtt);
  console.log('\n=== 결과 (네트워크) ===');
  table([
    ['항목', '값'],
    ['봇(계획/시도)', `${o.bots} / ${m.attempted}`],
    ['연결 성공(open)', m.opened],
    ['welcome 받음', m.welcomed],
    ['연결 실패', m.failedConnect],
    ['접속 후 끊김(dropped)', m.dropped],
    ['서버 error 응답', JSON.stringify(m.errors)],
    ['연결 시간 ms p50/p95/p99/max', `${f1(c.p50)} / ${f1(c.p95)} / ${f1(c.p99)} / ${f1(c.max)}`],
    ['hello→welcome ms p50/p95/p99/max', `${f1(w.p50)} / ${f1(w.p95)} / ${f1(w.p99)} / ${f1(w.max)}`],
    [`왕복 지연 ms(ping→pong, n=${r.n}) p50/p95/p99/max`, `${f1(r.p50)} / ${f1(r.p95)} / ${f1(r.p99)} / ${f1(r.max)}`],
    ['송신 메시지/초(봇→서버)', f1(m.sent / elapsed)],
    ['수신 메시지/초(서버→봇)', f1(m.recv / elapsed)],
    ['수신 KB/초', f1(m.bytes / 1024 / elapsed)],
    ['봇이 본 최대 n(성당 전체 인원)', m.maxN],
    ['presence 메시지 수신 수', m.presenceSeen],
    ['측정 시간(초)', f1(elapsed)],
  ]);
  const roomRows = Object.entries(m.rooms).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  console.log(`\n배정된 방 ${roomRows.length}개 (welcome 기준 입장 수)`);
  table([['방', '입장 수'], ...roomRows.slice(0, 60)]);
  if (liveStats) {
    console.log(`\n서버 /stats (종료 직전): 접속 ${liveStats.total.live}명, 활성 방 ${liveStats.total.rooms}개, 오늘 켜진 초 ${liveStats.total.candlesToday}`);
  }
  const summary = { mode: 'network', bots: o.bots, attempted: m.attempted, welcomed: m.welcomed, failedConnect: m.failedConnect, dropped: m.dropped, errors: m.errors, connect: c, welcome: w, rtt: r, rooms: m.rooms, stats: liveStats && liveStats.total };
  if (o.json) console.log(JSON.stringify(summary));
  const ok = m.welcomed === o.bots && m.failedConnect === 0 && m.dropped === 0;
  console.log(ok ? '\nOK: 전원 입장, 실패·끊김 없음' : '\n주의: 전원 입장하지 못했거나 실패/끊김이 있음');
  process.exit(ok ? 0 : 1);
}

// ------------------------------------------------------------------ 인-프로세스(--dry)
async function runDry(o) {
  let logicMod;
  let dirMod;
  try {
    logicMod = await import('../src/room_logic.ts');
    dirMod = await import('../src/directory_logic.ts');
  } catch (e) {
    console.error("--dry 는 TypeScript 로더가 필요합니다: node --import tsx scripts/loadtest.mjs --dry  (npm run loadtest:dry)\n" + e.message);
    process.exit(2);
  }
  const { RoomLogic } = logicMod;
  const { DirectoryLogic, ROOM_TARGET } = dirMod;
  const layouts = loadLayouts();
  const helpers = await loadLayoutHelpers();
  const churches = o.church === 'mix' ? Object.keys(layouts) : [o.church];
  if (!churches.every((c) => layouts[c])) {
    console.error('알 수 없는 성당: ' + o.church);
    process.exit(2);
  }
  const mk = makeBrainFactory(layouts, helpers, o.seed);

  const STEP = 200;
  let T = Date.UTC(2026, 10, 12, 3, 0, 0);
  const dirs = {};
  const rooms = new Map(); // name → {logic, church, n, windowMs, maxWindowMs, windows[], accepts, lastReport}
  const bots = [];
  const counters = { outMsgs: 0, outBytes: 0, welcomed: 0, errors: {} };
  const hr = () => Number(process.hrtime.bigint()) / 1e6;

  function roomFor(church, name, n) {
    let r = rooms.get(name);
    if (r) return r;
    r = { church, name, n, windowMs: 0, maxWindowMs: 0, windows: [], totalMs: 0, accepts: 0, lastReport: 0, maxPeers: 0, maxLevel: 0 };
    r.logic = new RoomLogic({
      layout: layouts[church],
      room: name,
      now: () => T,
      send: (connId, msg) => {
        const s = JSON.stringify(msg); // 실제 DO 는 전송 때 직렬화하므로 비용에 포함한다
        counters.outMsgs++;
        counters.outBytes += s.length;
        const bot = bots[connId.slice(1) | 0];
        if (msg.t === 'welcome') {
          bot.welcomed = true;
          counters.welcomed++;
        } else if (msg.t === 'error') counters.errors[msg.code] = (counters.errors[msg.code] || 0) + 1;
        else bot.brain.onMessage(msg);
      },
      close: () => {},
    });
    rooms.set(name, r);
    return r;
  }

  const timed = (r, fn) => {
    const s = hr();
    fn();
    const d = hr() - s;
    r.windowMs += d;
    r.totalMs += d;
  };

  const rampPerStep = (o.ramp * STEP) / 1000;
  let joinedF = 0;
  const totalSteps = Math.ceil((o.bots / o.ramp) * 1000 / STEP) + Math.ceil((o.duration * 1000) / STEP) + 5;
  const wallStart = hr();
  console.log(`--dry 인-프로세스: 봇 ${o.bots}  성당 ${churches.join(',')}  램프 ${o.ramp}/초  가상 시간 약 ${((totalSteps * STEP) / 1000).toFixed(0)}초`);
  for (let step = 0; step < totalSteps; step++) {
    T += STEP;
    // 1) 접속
    joinedF += rampPerStep;
    while (bots.length < o.bots && bots.length < Math.floor(joinedF)) {
      const i = bots.length;
      const church = churches[i % churches.length];
      const dir = dirs[church] || (dirs[church] = new DirectoryLogic(church));
      const { room, n } = o.single ? { room: `${church}-1`, n: 1 } : dir.assign(T);
      const r = roomFor(church, room, n);
      const bot = { i, church, room: r, brain: mk(church), welcomed: false, conn: `b${i}` };
      bots.push(bot);
      r.accepts++;
      r.logic.onConnect(bot.conn);
      timed(r, () => r.logic.handleMessage(bot.conn, JSON.stringify({ t: 'hello', id: crypto.randomUUID(), v: 1, avatar: AVATAR() })));
    }
    // 2) 봇 행동
    for (const bot of bots) {
      if (!bot.welcomed) continue;
      for (const msg of bot.brain.step(T, STEP)) {
        const raw = JSON.stringify(msg);
        timed(bot.room, () => bot.room.logic.handleMessage(bot.conn, raw));
      }
    }
    // 3) 방 알람(tick + flush) 과 디렉터리 보고
    for (const r of rooms.values()) {
      timed(r, () => {
        r.logic.tick(T);
        r.logic.flush(T);
      });
      r.windows.push(r.windowMs);
      r.maxWindowMs = Math.max(r.maxWindowMs, r.windowMs);
      r.windowMs = 0;
      r.maxPeers = Math.max(r.maxPeers, r.logic.peerCount());
      r.maxLevel = Math.max(r.maxLevel, r.logic.loadLevel());
      if (T - r.lastReport >= 1000) {
        r.lastReport = T;
        const l = r.logic.localPresence();
        const others = dirs[r.church].report(
          r.n,
          { peers: l.peers, conns: r.logic.connectionCount(), seated: l.seated, praying: l.praying, candlesToday: r.logic.candlesToday(T), day: logicMod.kstDay(T), accepts: r.accepts },
          T,
        );
        r.accepts = 0;
        r.logic.setOthers(others);
        r.logic.maybeBroadcastPresence(T);
      }
    }
  }
  const wallMs = hr() - wallStart;
  const simSec = (totalSteps * STEP) / 1000;

  // 요약
  let visSum = 0;
  let visMax = 0;
  let visCount = 0;
  for (const b of bots) {
    if (!b.welcomed) continue;
    const v = b.room.logic.visibleTo(b.conn).length;
    visSum += v;
    visMax = Math.max(visMax, v);
    visCount++;
  }
  const roomList = [...rooms.values()].sort((a, b) => a.church.localeCompare(b.church) || a.n - b.n);
  const allWindows = roomList.flatMap((r) => r.windows).sort((a, b) => a - b);
  const maxPeers = Math.max(...roomList.map((r) => r.maxPeers));
  const levels = [0, 0, 0];
  for (const r of roomList) levels[r.logic.loadLevel()]++;
  const worst = Math.max(...roomList.map((r) => r.maxWindowMs));
  const meanWindowBusy = roomList.reduce((a, r) => a + r.totalMs, 0) / roomList.length / (totalSteps * STEP) * 100;
  const sumPresence = Object.values(dirs).map((d) => d.stats(T)).reduce((a, s) => a + s.live, 0);

  console.log('\n=== 결과 (--dry, 인-프로세스, 가상 시계) ===');
  table([
    ['항목', '값'],
    ['봇(계획/welcome)', `${o.bots} / ${counters.welcomed}`],
    ['방 수', roomList.length],
    ['방 최대 인원(목표 ' + ROOM_TARGET + ')', maxPeers],
    ['종료 시 과부하 단계별 방 수 (0/1/2)', levels.join(' / ')],
    ['방 알람 한 번(200ms 창)의 CPU ms: p50/p95/최악', `${f1(percentile(allWindows, 50))} / ${f1(percentile(allWindows, 95))} / ${f1(worst)}`],
    ['방 평균 CPU 점유율(200ms 창 대비)', f1(meanWindowBusy) + ' %'],
    ['서버→클라이언트 메시지/가상초', f1(counters.outMsgs / simSec)],
    ['서버→클라이언트 KB/가상초(전체)', f1(counters.outBytes / 1024 / simSec)],
    ['봇 한 명이 보는 아바타 수: 평균/최대', `${f1(visSum / Math.max(1, visCount))} / ${visMax}`],
    ['디렉터리 합산 접속(종료 시)', sumPresence],
    ['서버 error 응답', JSON.stringify(counters.errors)],
    ['실제 걸린 시간(초) / 가상 시간(초)', `${f1(wallMs / 1000)} / ${f1(simSec)}`],
  ]);
  const top = roomList.slice(0, 12);
  console.log(`\n방별 (처음 ${top.length}개) — 최대 인원 / 최대 과부하 단계 / 최악 창 ms`);
  table([['방', '인원', '단계', 'ms'], ...top.map((r) => [r.name, r.maxPeers, r.maxLevel, f1(r.maxWindowMs)])]);
  console.log('\n주의: --dry 는 네트워크·Cloudflare 런타임 없이 로직 CPU 만 잰 값입니다(실제 DO 의 WebSocket 입출력 비용 제외).');

  const checks = [
    ['전원 welcome', counters.welcomed === o.bots],
    [`방당 최대 인원 <= ${ROOM_TARGET} (방 수 한도 안에서)`, o.single || maxPeers <= ROOM_TARGET],
    ['방 알람 최악 창 < 100ms', worst < 100],
  ];
  for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (o.json) console.log(JSON.stringify({ mode: 'dry', bots: o.bots, welcomed: counters.welcomed, rooms: roomList.length, maxPeers, worstWindowMs: worst }));
  process.exit(checks.every((c) => c[1]) ? 0 : 1);
}

const opts = parseArgs(process.argv.slice(2));
if (opts.dry) await runDry(opts);
else await runNetwork(opts);
