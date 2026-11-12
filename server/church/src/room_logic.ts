// 사이버 성당 방 로직 (순수 TypeScript, Cloudflare 의존 없음).
// 프로토콜 계약: docs/church/SPEC.md §2, §6, v2(§8~10): 경계·좌석·촛불은 Layout 객체에서 계산한다.
import {
  CANDLE_REACH_SLACK,
  isValidSeat,
  seatPosition,
  standForSlot,
  totalCandleSlots,
  type Layout,
} from './layout';

export type { Layout } from './layout';

export const PROTOCOL_VERSION = 1;
export const ROOM_CAPACITY = 30;

export const MAX_SPEED = 7; // m/s
/** 속도 예산 상한(m). 약 0.5초 분량의 버스트(네트워크 지연 후 몰려 도착)만 허용한다. */
export const MOVE_BUDGET_MAX = 3.5;
export const SEAT_FAR_DISTANCE = 3; // m
export const CANDLE_LIFETIME_MS = 30 * 60 * 1000;
export const IDLE_STAND_MS = 90 * 60 * 1000;
export const RATE_LIMIT_PER_SEC = 12;
export const EMOTE_MIN_INTERVAL_MS = 1500;
export const HELLO_TIMEOUT_MS = 10_000;
export const MAX_MESSAGE_CHARS = 2048;

export type St = 'w' | 's' | 'p';

export interface Avatar {
  skin: number;
  style: number;
  hair: number;
  outfit: number;
  name: number;
}

export interface PeerView {
  id: string;
  avatar: Avatar;
  x: number;
  z: number;
  r: number;
  st: St;
  seat: string | null;
  ms: number;
}

export interface Candle {
  slot: number;
  until: number;
  intention: number;
}

/** 하이버네이션 후 복원/연결 attachment용으로 내보내는 피어 상태. */
export interface PeerSnapshot extends PeerView {
  lastActivityAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Message = Record<string, any>;

export interface LogicOptions {
  layout: Layout;
  room?: string;
  capacity?: number;
  now?: () => number;
  /** 한 연결에 JSON 메시지 하나를 보낸다. */
  send: (connId: string, message: Message) => void;
  /** 연결을 닫는다(선택). */
  close?: (connId: string, code: number, reason: string) => void;
  /** 피어 상태가 바뀌었을 때 호출(DO attachment 저장용, 선택). */
  persist?: (connId: string, snapshot: PeerSnapshot) => void;
}

interface Peer {
  connId: string;
  id: string;
  avatar: Avatar;
  x: number;
  z: number;
  r: number;
  st: St;
  seat: string | null;
  ms: number;
  lastPosAt: number;
  moveBudget: number;
  lastActivityAt: number;
  lastEmoteAt: number;
  dirty: boolean;
}

interface Conn {
  connId: string;
  connectedAt: number;
  peerId: string | null;
  recent: number[]; // 최근 수신 시각(최대 13개) — 슬라이딩 윈도 속도 제한
  lastRateErrorAt: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FOUR_PI = 4 * Math.PI;

function isInt(v: unknown, lo: number, hi: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
}
function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

export const MAX_ROOM_NUMBER = 50;

/** '<churchId>-<N>'(churchId 소문자 영문, N 1..50) 분해. 형식이 틀리면 null. 카탈로그 검증은 호출자 몫. */
export function parseRoomName(room: string | null | undefined): { churchId: string; n: number } | null {
  if (typeof room !== 'string') return null;
  const m = /^([a-z]+)-([1-9][0-9]?)$/.exec(room);
  if (!m) return null;
  const n = parseInt(m[2], 10);
  return n >= 1 && n <= MAX_ROOM_NUMBER ? { churchId: m[1], n } : null;
}

/** 같은 성당의 다음 방 이름(50 다음은 1). 형식이 틀리면 'basic-1'. */
export function nextRoomName(room: string): string {
  const p = parseRoomName(room);
  if (!p) return 'basic-1';
  return `${p.churchId}-${p.n >= MAX_ROOM_NUMBER ? 1 : p.n + 1}`;
}

function parseAvatar(a: unknown): Avatar | null {
  if (typeof a !== 'object' || a === null) return null;
  const o = a as Record<string, unknown>;
  if (
    !isInt(o.skin, 0, 3) ||
    !isInt(o.style, 0, 3) ||
    !isInt(o.hair, 0, 9) ||
    !isInt(o.outfit, 0, 11) ||
    !isInt(o.name, 0, 39)
  ) {
    return null;
  }
  return { skin: o.skin, style: o.style, hair: o.hair, outfit: o.outfit, name: o.name };
}

export class RoomLogic {
  room: string;
  readonly layout: Layout;
  private readonly capacity: number;
  private readonly clock: () => number;
  private readonly sendFn: LogicOptions['send'];
  private readonly closeFn: LogicOptions['close'];
  private readonly persistFn: LogicOptions['persist'];

  private conns = new Map<string, Conn>();
  private peersByConn = new Map<string, Peer>();
  private connById = new Map<string, string>(); // peer uuid → connId
  private seats = new Map<string, string>(); // seatId → peer uuid
  private candles = new Map<number, Candle>();

  constructor(opts: LogicOptions) {
    this.layout = opts.layout;
    this.room = opts.room ?? `${opts.layout.id}-1`;
    this.capacity = opts.capacity ?? ROOM_CAPACITY;
    this.clock = opts.now ?? Date.now;
    this.sendFn = opts.send;
    this.closeFn = opts.close;
    this.persistFn = opts.persist;
  }

  // ---------------------------------------------------------------- 조회

  peerCount(): number {
    return this.peersByConn.size;
  }
  connectionCount(): number {
    return this.conns.size;
  }
  /** 테스트/디버그용 피어 조회. */
  getPeer(connId: string): PeerView | null {
    const p = this.peersByConn.get(connId);
    return p ? this.view(p) : null;
  }
  seatOwner(seat: string): string | null {
    return this.seats.get(seat) ?? null;
  }
  activeCandles(now = this.clock()): Candle[] {
    const out: Candle[] = [];
    for (const c of this.candles.values()) if (c.until > now) out.push({ ...c });
    return out.sort((a, b) => a.slot - b.slot);
  }

  // ---------------------------------------------------------------- 연결 수명

  onConnect(connId: string): void {
    this.conns.set(connId, {
      connId,
      connectedAt: this.clock(),
      peerId: null,
      recent: [],
      lastRateErrorAt: -Infinity,
    });
  }

  onClose(connId: string): void {
    const peer = this.peersByConn.get(connId);
    this.conns.delete(connId);
    if (peer) this.removePeer(peer);
  }

  /** DO가 깨어난 뒤 attachment로부터 피어를 복원한다(브로드캐스트 없음). */
  restorePeer(connId: string, snap: PeerSnapshot): boolean {
    const avatar = parseAvatar(snap.avatar);
    if (!avatar || typeof snap.id !== 'string' || !UUID_RE.test(snap.id)) return false;
    if (!this.conns.has(connId)) this.onConnect(connId);
    const now = this.clock();
    const b = this.layout.bounds;
    const seat = snap.seat && isValidSeat(this.layout, snap.seat) && !this.seats.has(snap.seat) ? snap.seat : null;
    const peer: Peer = {
      connId,
      id: snap.id.toLowerCase(),
      avatar,
      x: clamp(isFiniteNum(snap.x) ? snap.x : this.layout.spawn.x, b.x0, b.x1),
      z: clamp(isFiniteNum(snap.z) ? snap.z : this.layout.spawn.z, b.z0, b.z1),
      r: clamp(isFiniteNum(snap.r) ? snap.r : 0, -FOUR_PI, FOUR_PI),
      st: seat ? (snap.st === 'p' ? 'p' : 's') : 'w',
      seat,
      ms: seat && snap.st === 'p' && isInt(snap.ms, 0, 3) ? snap.ms : -1,
      lastPosAt: now,
      moveBudget: MOVE_BUDGET_MAX,
      lastActivityAt: isFiniteNum(snap.lastActivityAt) ? snap.lastActivityAt : now,
      lastEmoteAt: -Infinity,
      dirty: false,
    };
    this.peersByConn.set(connId, peer);
    this.connById.set(peer.id, connId);
    if (seat) this.seats.set(seat, peer.id);
    const conn = this.conns.get(connId)!;
    conn.peerId = peer.id;
    return true;
  }

  // ---------------------------------------------------------------- 메시지 처리

  /** raw가 null이면 텍스트가 아닌(바이너리) 프레임. */
  handleMessage(connId: string, raw: string | null): void {
    const conn = this.conns.get(connId);
    if (!conn) return;
    const now = this.clock();

    // 속도 제한: 최근 13개 수신 시각이 1초 안에 모두 들어 있으면 초과(초당 12개 초과).
    conn.recent.push(now);
    if (conn.recent.length > RATE_LIMIT_PER_SEC + 1) conn.recent.shift();
    if (
      conn.recent.length === RATE_LIMIT_PER_SEC + 1 &&
      now - conn.recent[0] < 1000
    ) {
      if (now - conn.lastRateErrorAt >= 1000) {
        conn.lastRateErrorAt = now;
        this.send(connId, { t: 'error', code: 'rate' });
      }
      return;
    }

    if (raw === null || raw.length > MAX_MESSAGE_CHARS) {
      this.send(connId, { t: 'error', code: 'bad_msg' });
      return;
    }
    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch {
      this.send(connId, { t: 'error', code: 'bad_msg' });
      return;
    }
    if (typeof msg !== 'object' || msg === null || Array.isArray(msg)) {
      this.send(connId, { t: 'error', code: 'bad_msg' });
      return;
    }
    const m = msg as Message;
    const t = m.t;

    if (t === 'ping') {
      this.send(connId, { t: 'pong' });
      return;
    }
    if (t === 'hello') {
      this.onHello(conn, m, now);
      return;
    }

    const peer = this.peersByConn.get(connId);
    if (!peer) {
      // hello 전에는 ping/hello 외에 아무것도 허용하지 않는다.
      this.send(connId, { t: 'error', code: 'bad_msg' });
      return;
    }

    switch (t) {
      case 'pos':
        this.onPos(peer, m, now);
        break;
      case 'sit':
        this.onSit(peer, m, now);
        break;
      case 'stand':
        peer.lastActivityAt = now;
        this.standPeer(peer, now);
        break;
      case 'pray':
        this.onPray(peer, m, now);
        break;
      case 'candle':
        this.onCandle(peer, m, now);
        break;
      case 'emote':
        this.onEmote(peer, m, now);
        break;
      default:
        this.send(connId, { t: 'error', code: 'bad_msg' });
        return;
    }
    this.persist(peer);
  }

  private onHello(conn: Conn, m: Message, now: number): void {
    if (conn.peerId !== null) {
      this.send(conn.connId, { t: 'error', code: 'bad_msg' }); // 중복 hello
      return;
    }
    if (m.v !== PROTOCOL_VERSION) {
      this.send(conn.connId, { t: 'error', code: 'version' });
      this.closeFn?.(conn.connId, 4001, 'version');
      return;
    }
    if (typeof m.id !== 'string' || !UUID_RE.test(m.id)) {
      this.send(conn.connId, { t: 'error', code: 'bad_msg' });
      return;
    }
    const avatar = parseAvatar(m.avatar);
    if (!avatar) {
      this.send(conn.connId, { t: 'error', code: 'bad_msg' });
      return;
    }
    const id = m.id.toLowerCase();

    // 같은 id가 이미 접속 중이면(재접속 직후 이전 연결이 아직 안 끊김) 이전 연결을 내보낸다.
    const oldConnId = this.connById.get(id);
    if (oldConnId !== undefined) {
      const oldPeer = this.peersByConn.get(oldConnId);
      this.conns.delete(oldConnId);
      if (oldPeer) this.removePeer(oldPeer);
      this.closeFn?.(oldConnId, 4000, 'replaced');
    }

    if (this.peersByConn.size >= this.capacity) {
      this.send(conn.connId, { t: 'full', next: nextRoomName(this.room) });
      this.closeFn?.(conn.connId, 4002, 'full');
      return;
    }

    const peer: Peer = {
      connId: conn.connId,
      id,
      avatar,
      x: this.layout.spawn.x,
      z: this.layout.spawn.z,
      r: 0,
      st: 'w',
      seat: null,
      ms: -1,
      lastPosAt: now,
      moveBudget: MOVE_BUDGET_MAX,
      lastActivityAt: now,
      lastEmoteAt: -Infinity,
      dirty: false,
    };
    this.peersByConn.set(conn.connId, peer);
    this.connById.set(id, conn.connId);
    conn.peerId = id;

    const seatsObj: Record<string, string> = {};
    for (const [s, pid] of this.seats) seatsObj[s] = pid;
    const peers: PeerView[] = [];
    for (const other of this.peersByConn.values()) {
      if (other !== peer) peers.push(this.view(other));
    }
    this.send(conn.connId, {
      t: 'welcome',
      you: id,
      room: this.room,
      n: this.peersByConn.size,
      peers,
      seats: seatsObj,
      candles: this.activeCandles(now),
      now,
    });
    this.broadcast({ t: 'join', peer: this.view(peer), n: this.peersByConn.size }, peer.connId);
    this.persist(peer);
  }

  private onPos(peer: Peer, m: Message, now: number): void {
    if (!isFiniteNum(m.x) || !isFiniteNum(m.z) || !isFiniteNum(m.r)) {
      this.send(peer.connId, { t: 'error', code: 'bad_msg' });
      return;
    }
    if (m.m !== undefined && m.m !== 0 && m.m !== 1 && typeof m.m !== 'boolean') {
      this.send(peer.connId, { t: 'error', code: 'bad_msg' });
      return;
    }
    peer.lastActivityAt = now;
    if (peer.seat !== null) return; // 앉아 있는 동안 위치 무시

    // 속도 예산: 평균 MAX_SPEED m/s, 버스트는 MOVE_BUDGET_MAX m까지 (서버 시각 기준).
    const dt = Math.max(0, (now - peer.lastPosAt) / 1000);
    peer.lastPosAt = now;
    peer.moveBudget = Math.min(MOVE_BUDGET_MAX, peer.moveBudget + MAX_SPEED * dt);

    const b = this.layout.bounds;
    let tx = clamp(m.x, b.x0, b.x1);
    let tz = clamp(m.z, b.z0, b.z1);
    const dx = tx - peer.x;
    const dz = tz - peer.z;
    const dist = Math.hypot(dx, dz);
    if (dist > peer.moveBudget) {
      const k = peer.moveBudget / dist;
      tx = peer.x + dx * k;
      tz = peer.z + dz * k;
      peer.moveBudget = 0;
    } else {
      peer.moveBudget -= dist;
    }
    const tr = clamp(m.r, -FOUR_PI, FOUR_PI);
    if (tx !== peer.x || tz !== peer.z || tr !== peer.r) {
      peer.x = clamp(tx, b.x0, b.x1);
      peer.z = clamp(tz, b.z0, b.z1);
      peer.r = tr;
      peer.dirty = true;
    }
  }

  private onSit(peer: Peer, m: Message, now: number): void {
    if (typeof m.seat !== 'string') {
      this.send(peer.connId, { t: 'error', code: 'bad_msg' });
      return;
    }
    peer.lastActivityAt = now;
    const seat = m.seat;
    const echo = seat.slice(0, 16);
    const pos = seatPosition(this.layout, seat);
    if (!pos) {
      this.send(peer.connId, { t: 'seat_denied', seat: echo, reason: 'invalid' });
      return;
    }
    if (peer.seat === seat) {
      // 같은 자리 재요청: 멱등하게 확정만 다시 알린다.
      this.send(peer.connId, { t: 'seated', id: peer.id, seat });
      return;
    }
    if (peer.seat !== null) {
      // 한 사람 한 자리: 다른 자리로 옮기려면 먼저 stand.
      this.send(peer.connId, { t: 'seat_denied', seat, reason: 'invalid' });
      return;
    }
    if (this.seats.has(seat)) {
      this.send(peer.connId, { t: 'seat_denied', seat, reason: 'taken' });
      return;
    }
    if (Math.hypot(peer.x - pos.x, peer.z - pos.z) > SEAT_FAR_DISTANCE) {
      this.send(peer.connId, { t: 'seat_denied', seat, reason: 'far' });
      return;
    }
    this.seats.set(seat, peer.id);
    peer.seat = seat;
    peer.st = 's';
    peer.ms = -1;
    peer.x = pos.x;
    peer.z = pos.z;
    peer.r = 0;
    peer.dirty = true;
    this.broadcast({ t: 'seated', id: peer.id, seat });
  }

  private standPeer(peer: Peer, now: number): void {
    if (peer.seat === null) return;
    if (this.seats.get(peer.seat) === peer.id) this.seats.delete(peer.seat);
    peer.seat = null;
    peer.st = 'w';
    peer.ms = -1;
    peer.lastPosAt = now;
    peer.moveBudget = MOVE_BUDGET_MAX;
    peer.dirty = true;
    this.broadcast({ t: 'stood', id: peer.id });
  }

  private onPray(peer: Peer, m: Message, now: number): void {
    if (typeof m.on !== 'boolean' || !isInt(m.ms, -1, 3) || (m.on && m.ms < 0)) {
      this.send(peer.connId, { t: 'error', code: 'bad_msg' });
      return;
    }
    peer.lastActivityAt = now;
    if (peer.seat === null) return; // 앉아 있을 때만 유효(조용히 무시)
    peer.st = m.on ? 'p' : 's';
    peer.ms = m.on ? m.ms : -1;
    peer.dirty = true;
    this.broadcast({ t: 'praying', id: peer.id, on: m.on, ms: m.ms });
  }

  private onCandle(peer: Peer, m: Message, now: number): void {
    if (!isInt(m.slot, 0, totalCandleSlots(this.layout) - 1) || !isInt(m.intention, 0, 7)) {
      this.send(peer.connId, { t: 'error', code: 'bad_msg' });
      return;
    }
    peer.lastActivityAt = now;
    const stand = standForSlot(this.layout, m.slot);
    if (!stand || Math.hypot(peer.x - stand.x, peer.z - stand.z) > stand.reach + CANDLE_REACH_SLACK) {
      return; // 해당 촛불대에서 너무 멀면 무시
    }
    const lit = this.candles.get(m.slot);
    if (lit && lit.until > now) {
      // 이미 켜져 있으면 무시. 요청자에게만 현재 상태를 알려 화면을 맞춘다.
      this.send(peer.connId, { t: 'candle', slot: lit.slot, until: lit.until, intention: lit.intention });
      return;
    }
    const c: Candle = { slot: m.slot, until: now + CANDLE_LIFETIME_MS, intention: m.intention };
    this.candles.set(c.slot, c);
    this.broadcast({ t: 'candle', slot: c.slot, until: c.until, intention: c.intention });
  }

  private onEmote(peer: Peer, m: Message, now: number): void {
    if (!isInt(m.e, 0, 2)) {
      this.send(peer.connId, { t: 'error', code: 'bad_msg' });
      return;
    }
    peer.lastActivityAt = now;
    if (now - peer.lastEmoteAt < EMOTE_MIN_INTERVAL_MS) return; // 속도 제한: 조용히 무시
    peer.lastEmoteAt = now;
    this.broadcast({ t: 'emote', id: peer.id, e: m.e }, peer.connId); // 본인은 로컬 재생
  }

  // ---------------------------------------------------------------- 주기 작업

  /** 5Hz로 호출: 변경된 피어만 모아 수신자별로 snap 하나를 보낸다(본인 항목 제외). */
  flush(now = this.clock()): void {
    void now;
    const changed: Peer[] = [];
    for (const p of this.peersByConn.values()) {
      if (p.dirty) {
        changed.push(p);
        p.dirty = false;
      }
    }
    if (changed.length === 0) return;
    const entries = changed.map((p) => [p.id, round(p.x, 2), round(p.z, 2), round(p.r, 3), p.st]);
    const n = this.peersByConn.size;
    for (const recipient of this.peersByConn.values()) {
      const list = entries.filter((e) => e[0] !== recipient.id);
      if (list.length > 0) this.send(recipient.connId, { t: 'snap', n, p: list });
    }
  }

  /** 알람마다 호출: 90분 유휴 자동 일어서기, 만료 촛불 정리, hello 없는 연결 정리. */
  tick(now = this.clock()): void {
    for (const peer of [...this.peersByConn.values()]) {
      if (peer.seat !== null && now - peer.lastActivityAt > IDLE_STAND_MS) {
        this.standPeer(peer, now);
        this.persist(peer);
      }
    }
    for (const [slot, c] of this.candles) if (c.until <= now) this.candles.delete(slot);
    for (const conn of [...this.conns.values()]) {
      if (conn.peerId === null && now - conn.connectedAt > HELLO_TIMEOUT_MS) {
        this.conns.delete(conn.connId);
        this.closeFn?.(conn.connId, 4003, 'hello_timeout');
      }
    }
  }

  // ---------------------------------------------------------------- 내부

  private removePeer(peer: Peer): void {
    if (peer.seat !== null && this.seats.get(peer.seat) === peer.id) this.seats.delete(peer.seat);
    this.peersByConn.delete(peer.connId);
    if (this.connById.get(peer.id) === peer.connId) this.connById.delete(peer.id);
    this.broadcast({ t: 'leave', id: peer.id, n: this.peersByConn.size });
  }

  private view(p: Peer): PeerView {
    return {
      id: p.id,
      avatar: { ...p.avatar },
      x: round(p.x, 2),
      z: round(p.z, 2),
      r: round(p.r, 3),
      st: p.st,
      seat: p.seat,
      ms: p.ms,
    };
  }

  private persist(peer: Peer): void {
    if (!this.persistFn) return;
    this.persistFn(peer.connId, { ...this.view(peer), lastActivityAt: peer.lastActivityAt });
  }

  private send(connId: string, message: Message): void {
    this.sendFn(connId, message);
  }

  private broadcast(message: Message, exceptConnId?: string): void {
    for (const connId of this.peersByConn.keys()) {
      if (connId !== exceptConnId) this.sendFn(connId, message);
    }
  }
}
