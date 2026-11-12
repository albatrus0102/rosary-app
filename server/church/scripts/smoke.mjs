// 로컬 스모크 테스트: 실행 중인 `wrangler dev`(기본 http://127.0.0.1:8787)에 클라이언트 2개를 붙여
// hello/welcome/join/pos/snap/sit/seated/pray/candle/stand/leave 를 확인한다.
// 사용: node scripts/smoke.mjs [baseUrl] [churchId]   예) node scripts/smoke.mjs http://127.0.0.1:8787 basic
import WebSocket from 'ws';

const base = (process.argv[2] || process.env.CHURCH_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const church = process.argv[3] || 'basic';
const room = `${church}-${1 + Math.floor(Math.random() * 40)}`; // 반복 실행해도 서로 간섭하지 않게
const wsUrl = base.replace(/^http/, 'ws') + `/ws?room=${room}&v=1`;

let failures = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`);
  if (!ok) failures++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uuid = () => crypto.randomUUID();

class Client {
  constructor(name) {
    this.name = name;
    this.id = uuid();
    this.msgs = [];
    this.waiters = [];
  }
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', (data) => {
        const m = JSON.parse(data.toString());
        this.msgs.push(m);
        this.waiters = this.waiters.filter((w) => !w(m));
      });
    });
  }
  send(o) {
    this.ws.send(JSON.stringify(o));
  }
  /** 조건을 만족하는 메시지를 (이미 받은 것 포함) 기다린다. */
  waitFor(pred, ms = 3000) {
    const found = this.msgs.find(pred);
    if (found) return Promise.resolve(found);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), ms);
      this.waiters.push((m) => {
        if (pred(m)) {
          clearTimeout(timer);
          resolve(m);
          return true;
        }
        return false;
      });
    });
  }
  close() {
    this.ws.close();
  }
}

async function main() {
  console.log(`대상: ${wsUrl}`);

  // /health
  const health = await fetch(base + '/health').then((r) => r.json()).catch(() => null);
  check('/health', health && health.ok === true && health.v === 1 && Array.isArray(health.churches) && health.churches.includes('basic'), JSON.stringify(health));

  // 잘못된 요청: 업그레이드가 거부되면 ws 가 unexpected-response 로 상태 코드를 알려 준다.
  const badStatus = (query) =>
    new Promise((resolve) => {
      const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/ws?${query}`);
      ws.on('unexpected-response', (_req, res) => {
        resolve(res.statusCode);
        res.resume();
      });
      ws.on('open', () => {
        ws.close();
        resolve(101);
      });
      ws.on('error', () => {});
    });
  check('room 번호 범위 밖 → 400', (await badStatus(`room=${church}-99&v=1`)) === 400);
  check('알 수 없는 churchId → 400', (await badStatus('room=nochurch-1&v=1')) === 400);
  check('v!=1 → 400', (await badStatus(`room=${church}-1&v=2`)) === 400);
  check('형식 오류 room → 400', (await badStatus('room=basic&v=1')) === 400);

  const a = new Client('A');
  const b = new Client('B');
  const avatarA = { skin: 1, style: 0, hair: 3, outfit: 5, name: 7 };
  const avatarB = { skin: 2, style: 1, hair: 4, outfit: 6, name: 8 };

  await a.connect();
  a.send({ t: 'hello', id: a.id, v: 1, avatar: avatarA });
  const wa = await a.waitFor((m) => m.t === 'welcome');
  check('A welcome', wa && wa.you === a.id && wa.n === 1 && wa.room === room && Array.isArray(wa.peers) && wa.peers.length === 0, JSON.stringify(wa));

  await b.connect();
  b.send({ t: 'hello', id: b.id, v: 1, avatar: avatarB });
  const wb = await b.waitFor((m) => m.t === 'welcome');
  check('B welcome (A가 peers에 있음)', wb && wb.n === 2 && wb.peers.some((p) => p.id === a.id), JSON.stringify(wb));
  const ja = await a.waitFor((m) => m.t === 'join');
  check('A가 B의 join 수신', ja && ja.peer.id === b.id && ja.n === 2, JSON.stringify(ja));

  // 이동 → snap
  a.send({ t: 'pos', x: 0, z: 16.5, r: 0.3, m: 1 });
  const snap = await b.waitFor((m) => m.t === 'snap' && m.p.some((e) => e[0] === a.id));
  const entry = snap && snap.p.find((e) => e[0] === a.id);
  check('B가 A의 snap 수신', !!entry && Math.abs(entry[2] - 16.5) < 0.01 && entry[4] === 'w', JSON.stringify(snap));
  check('A는 자기 snap을 받지 않음', !a.msgs.some((m) => m.t === 'snap' && m.p.some((e) => e[0] === a.id)));

  // 앉기: basic 의 L11-0 은 (-3.2, 11.25). 스폰(0,17)에서 5.5m 라 far → 걸어가서 앉는다.
  a.send({ t: 'sit', seat: 'L11-0' });
  const far = await a.waitFor((m) => m.t === 'seat_denied');
  check('멀리서 앉기 → seat_denied far', far && far.reason === 'far' && far.seat === 'L11-0', JSON.stringify(far));

  // 속도 제한(7m/s) 때문에 몇 걸음 나눠서 이동
  const target = { x: -3.2, z: 12.9 };
  for (let i = 0; i < 12; i++) {
    a.send({ t: 'pos', x: target.x, z: target.z, r: 0, m: 1 });
    await sleep(250);
  }
  a.send({ t: 'sit', seat: 'L11-0' });
  const seatedA = await a.waitFor((m) => m.t === 'seated');
  check('A seated (본인에게도 전송)', seatedA && seatedA.id === a.id && seatedA.seat === 'L11-0', JSON.stringify(seatedA));
  const seatedB = await b.waitFor((m) => m.t === 'seated' && m.id === a.id);
  check('B가 seated 수신', !!seatedB);

  // 같은 자리를 B가 요청 → taken (B를 근처로 이동)
  for (let i = 0; i < 14; i++) {
    b.send({ t: 'pos', x: target.x, z: target.z, r: 0, m: 1 });
    await sleep(250);
  }
  b.send({ t: 'sit', seat: 'L11-0' });
  const taken = await b.waitFor((m) => m.t === 'seat_denied' && m.reason === 'taken');
  check('B 같은 자리 → taken', !!taken, JSON.stringify(b.msgs.filter((m) => m.t === 'seat_denied')));

  // 기도
  a.send({ t: 'pray', on: true, ms: 2 });
  const prayB = await b.waitFor((m) => m.t === 'praying' && m.id === a.id && m.on === true && m.ms === 2);
  check('B가 praying 수신', !!prayB);

  // 촛불: B를 촛불대로 보낸다 (10.5, 0). 최대 속도 때문에 시간이 걸린다.
  b.send({ t: 'sit', seat: 'L11-1' }); // B도 앉았다가 일어서서 이동
  await sleep(100);
  const seatedB2 = await b.waitFor((m) => m.t === 'seated' && m.id === b.id);
  check('B 다른 자리 앉기', !!seatedB2);
  b.send({ t: 'stand' });
  const stoodB = await a.waitFor((m) => m.t === 'stood' && m.id === b.id);
  check('A가 B의 stood 수신', !!stoodB);
  for (let i = 0; i < 35; i++) {
    b.send({ t: 'pos', x: 10.5, z: 0, r: 0, m: 1 });
    await sleep(250);
  }
  b.send({ t: 'candle', slot: 5, intention: 3 });
  const candleA = await a.waitFor((m) => m.t === 'candle' && m.slot === 5);
  const now = Date.now();
  check('A가 candle 수신 (until ≈ +30분)', candleA && candleA.intention === 3 && Math.abs(candleA.until - (now + 30 * 60 * 1000)) < 60_000, JSON.stringify(candleA));

  // 이모트
  b.send({ t: 'emote', e: 1 });
  const em = await a.waitFor((m) => m.t === 'emote' && m.id === b.id && m.e === 1);
  check('A가 emote 수신', !!em);

  // ping/pong, bad_msg
  a.send({ t: 'ping' });
  check('pong', !!(await a.waitFor((m) => m.t === 'pong')));
  a.send({ t: 'nope' });
  check('error bad_msg', !!(await a.waitFor((m) => m.t === 'error' && m.code === 'bad_msg')));

  // 일어서기
  a.send({ t: 'stand' });
  const stoodA = await b.waitFor((m) => m.t === 'stood' && m.id === a.id);
  check('B가 A의 stood 수신', !!stoodA);

  // 새 클라이언트 C의 welcome 에 촛불이 보임
  const c = new Client('C');
  await c.connect();
  c.send({ t: 'hello', id: c.id, v: 1, avatar: avatarA });
  const wc = await c.waitFor((m) => m.t === 'welcome');
  check('C welcome에 촛불 포함', wc && wc.n === 3 && wc.candles.some((x) => x.slot === 5 && x.until > Date.now()), JSON.stringify(wc));
  c.close();
  const lc = await a.waitFor((m) => m.t === 'leave' && m.n === 2);
  check('C 퇴장 → leave n=2', !!lc, JSON.stringify(a.msgs.filter((m) => m.t === 'leave')));

  // 퇴장
  b.close();
  const lb = await a.waitFor((m) => m.t === 'leave' && m.id === b.id && m.n === 1);
  check('B 퇴장 → A가 leave n=1 수신', !!lb);
  a.close();
  await sleep(200);

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAIL`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('FAIL  예외:', e.message || e);
  process.exit(1);
});
