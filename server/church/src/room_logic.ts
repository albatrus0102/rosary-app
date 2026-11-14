// 사이버 성당 방 로직 (순수 TypeScript, Cloudflare 의존 없음).
// 프로토콜 계약: docs/church/SPEC.md §2, §6, v2(§8~10): 경계·좌석·촛불은 Layout 객체에서 계산한다.
import {
  CANDLE_REACH_SLACK,
  isValidSeat,
  seatPosition,
  standRangeForSlot,
  totalCandleSlots,
  type Layout,
} from './layout';

export type { Layout } from './layout';

export const PROTOCOL_VERSION = 1;
/** 서버 내부 안전 상한(사용자에게 보이는 인원 제한이 아님). 초과하면 `error busy`. */
export const MAX_PEERS_SAFETY = 2000;

export const MAX_SPEED = 7; // m/s
/** 속도 예산 상한(m). 약 0.5초 분량의 버스트(네트워크 지연 후 몰려 도착)만 허용한다. */
export const MOVE_BUDGET_MAX = 3.5;
export const SEAT_FAR_DISTANCE = 8; // m (v3: 3 → 8)
export const RATE_LIMIT_PER_SEC = 40; // v3: 12 → 40 (서버 보호용)
export const HELLO_TIMEOUT_MS = 10_000;
export const MAX_MESSAGE_CHARS = 2048;
/** 관심 영역(AOI): 이 거리 안의 피어만 보인다. 이미 보이는 피어는 AOI_LEAVE_RADIUS 를 넘어야 숨긴다(경계 깜박임 방지). */
export const AOI_RADIUS = 40;
export const AOI_LEAVE_RADIUS = 44;

// ---------------------------------------------------------------- 과부하 단계(S-01)
// 방 하나가 바쁠수록 브로드캐스트 비용을 단계적으로 줄인다. 사용자에게 보이는 제한이 아니라
// 멀리 있는 아바타부터 덜 자주/덜 멀리 보이게 하는 내부 조절이다. 모두 순수 함수/상수다.
export interface LoadParams {
  level: 0 | 1 | 2;
  /** snap 전송 간격(ms). 단계 0은 알람(200ms)마다 그대로 보낸다. */
  snapMs: number;
  /** 가시 진입 반경(m)과 이탈 반경(m, 경계 깜박임 방지로 진입보다 약간 큼) */
  aoiRadius: number;
  aoiLeaveRadius: number;
  /** 수신자 한 명이 동시에 보는 최대 아바타 수(가까운 순) */
  maxVisible: number;
}
export const LOAD_LEVELS: readonly LoadParams[] = [
  { level: 0, snapMs: 200, aoiRadius: AOI_RADIUS, aoiLeaveRadius: AOI_LEAVE_RADIUS, maxVisible: 80 },
  { level: 1, snapMs: 400, aoiRadius: 28, aoiLeaveRadius: 31, maxVisible: 50 },
  { level: 2, snapMs: 800, aoiRadius: 20, aoiLeaveRadius: 22, maxVisible: 30 },
];
/** 단계 i+1 로 올라가는 조건: 방 인원 > LOAD_UP_PEERS[i] 또는 초당 수신 메시지 > LOAD_UP_RATE[i]. */
export const LOAD_UP_PEERS = [60, 120] as const;
export const LOAD_UP_RATE = [500, 1000] as const;
/** 내려올 때는 올라가는 문턱의 이 비율 아래로 떨어져야 한다(단계가 깜박이지 않게). */
export const LOAD_DOWN_FACTOR = 0.85;
/** 단계 > 0 일 때 가시 집합을 전체 재정렬하는 최소 간격(ms). 인원이 많으면 인원 * 10ms 로 늘린다. */
export const REBALANCE_MS = 2000;

/** 현재 인원과 초당 수신 메시지 수로 다음 과부하 단계를 정한다(올라갈 땐 즉시, 내려올 땐 히스테리시스). */
export function nextLoadLevel(prev: 0 | 1 | 2, peers: number, msgRate: number): 0 | 1 | 2 {
  let target = 0;
  for (let i = 0; i < LOAD_UP_PEERS.length; i++) {
    if (peers > LOAD_UP_PEERS[i] || msgRate > LOAD_UP_RATE[i]) target = i + 1;
  }
  if (target >= prev) return target as 0 | 1 | 2;
  let l = prev as number;
  while (l > target) {
    const stay =
      peers > LOAD_UP_PEERS[l - 1] * LOAD_DOWN_FACTOR || msgRate > LOAD_UP_RATE[l - 1] * LOAD_DOWN_FACTOR;
    if (stay) break;
    l--;
  }
  return l as 0 | 1 | 2;
}

export function loadParams(level: number): LoadParams {
  return LOAD_LEVELS[Math.max(0, Math.min(LOAD_LEVELS.length - 1, level | 0))];
}

/** 한국 표준시(UTC+9) 기준 날짜 `YYYY-MM-DD`. 오늘 켜진 초를 00:00 KST 에 끊기 위해 쓴다. */
export function kstDay(ms: number): string {
  return new Date(ms + 9 * 3600_000).toISOString().slice(0, 10);
}

/** 성당 전체(모든 방) 합산 현황. 클라이언트가 '지금 N명 기도 중'을 그릴 때 쓴다. */
export interface Presence {
  n: number;
  seated: number;
  praying: number;
  candlesToday: number;
}
/** 다른 방들의 합계(이 방 제외). */
export interface OtherRooms {
  peers: number;
  seated: number;
  praying: number;
  candlesToday: number;
}
export const PRESENCE_MIN_MS = 10_000;
export const PRESENCE_MAX_MS = 60_000;
/** `who`(이 방 접속자 명단) 응답에 담는 최대 인원과, 한 연결이 다시 물을 수 있는 최소 간격(ms). */
export const WHO_MAX = 200;
export const WHO_MIN_MS = 2000;

export type St = 'w' | 's' | 'p';

/**
 * 아바타. `name`은 세례명 인덱스(0..NAME_MAX)이고 서버는 그대로 중계한다(해석은 받는
 * 클라이언트가 한다). `g`(성별 0 여성/1 남성)와 `nv`(이름 형식 버전)는 추가 필드다.
 * `nv`가 NAME_VERSION(2)이면 `name`은 성별과 무관한 통합 세례명 목록 인덱스다. 그 밖의
 * `nv` 값은 버린다(없는 것으로 중계 → 받는 쪽이 옛 형식으로 읽고, 범위를 벗어나면 기본 이름).
 */
export interface Avatar {
  skin: number;
  style: number;
  hair: number;
  outfit: number;
  name: number;
  g?: number;
  nv?: number;
}

/** 세례명 인덱스 상한(Flutter `baptismalNameMaxIndex`와 같다). */
export const NAME_MAX = 4095;
/** 아바타 이름 형식 버전(Flutter `avatarNameVersion`): 2 = 통합 세례명 목록 인덱스. */
export const NAME_VERSION = 2;

export interface PeerView {
  id: string;
  avatar: Avatar;
  x: number;
  z: number;
  r: number;
  st: St;
  seat: string | null;
  ms: number;
  /** 무릎 꿇고 기도 중이면 1 (st === 'p' 일 때만). 앉아서 기도면 필드 없음. */
  k?: 1;
  /** 묵주를 들고 기도 중이면 1 (st === 'p' 일 때만). 없으면 필드 없음. `r` 은 방향이라 여기서는 `ro`. */
  ro?: 1;
}

export interface Candle {
  slot: number;
  /** 0 = 만료 없음 */
  until: number;
  intention: number;
}

/** 저장소에 보존되는 촛불(seq: 켠 순서, 가장 작은 것이 가장 오래됨). */
export interface StoredCandle extends Candle {
  seq: number;
}

/** 하이버네이션 후 복원/연결 attachment용으로 내보내는 피어 상태. */
export type PeerSnapshot = PeerView;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Message = Record<string, any>;

export interface LogicOptions {
  layout: Layout;
  room?: string;
  /** 안전 상한(기본 2000). 테스트에서 줄여 쓸 수 있다. */
  capacity?: number;
  now?: () => number;
  /** 한 연결에 JSON 메시지 하나를 보낸다. */
  send: (connId: string, message: Message) => void;
  /** 연결을 닫는다(선택). */
  close?: (connId: string, code: number, reason: string) => void;
  /** 피어 상태가 바뀌었을 때 호출(DO attachment 저장용, 선택). */
  persist?: (connId: string, snapshot: PeerSnapshot) => void;
  /** 촛불이 켜지거나 교체될 때 호출(DO 저장소 보존용, 선택). */
  persistCandle?: (candle: StoredCandle) => void;
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
  /** 기도 자세: 0 앉아서, 1 무릎 꿇고 (st === 'p' 일 때만 1) */
  k: 0 | 1;
  /** 묵주를 들고 기도: 0 | 1 (st === 'p' 일 때만 1) */
  ro: 0 | 1;
  lastPosAt: number;
  moveBudget: number;
  dirty: boolean;
  /** 이 피어가 지금 보고 있는(AOI 안) 다른 피어 id */
  visible: Set<string>;
}

interface Conn {
  connId: string;
  connectedAt: number;
  peerId: string | null;
  recent: number[]; // 최근 수신 시각(최대 13개) — 슬라이딩 윈도 속도 제한
  lastRateErrorAt: number;
  lastWhoAt: number;
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
function dist(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
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

function parseAvatar(a: unknown): Avatar | null {
  if (typeof a !== 'object' || a === null) return null;
  const o = a as Record<string, unknown>;
  const hasG = o.g !== undefined && o.g !== null;
  if (
    !isInt(o.skin, 0, 3) ||
    !isInt(o.style, 0, 3) ||
    !isInt(o.hair, 0, 9) ||
    !isInt(o.outfit, 0, 11) ||
    !isInt(o.name, 0, NAME_MAX) ||
    (hasG && !isInt(o.g, 0, 1))
  ) {
    return null;
  }
  const out: Avatar = { skin: o.skin, style: o.style, hair: o.hair, outfit: o.outfit, name: o.name };
  if (hasG) out.g = o.g as number;
  if (o.nv === NAME_VERSION) out.nv = NAME_VERSION;
  return out;
}

export class RoomLogic {
  room: string;
  readonly layout: Layout;
  private readonly capacity: number;
  private readonly clock: () => number;
  private readonly sendFn: LogicOptions['send'];
  private readonly closeFn: LogicOptions['close'];
  private readonly persistFn: LogicOptions['persist'];
  private readonly persistCandleFn: LogicOptions['persistCandle'];

  private conns = new Map<string, Conn>();
  private peersByConn = new Map<string, Peer>();
  private peersById = new Map<string, Peer>();
  private seats = new Map<string, string>(); // seatId → peer uuid
  private candles = new Map<number, StoredCandle>();
  private candleSeq = 0;

  // 과부하 조절 상태
  private level: 0 | 1 | 2 = 0;
  private params: LoadParams = LOAD_LEVELS[0];
  private rateCount = 0;
  private rateWindowStart: number;
  private msgRate = 0;
  private lastFlushAt = -Infinity;
  private lastRebalanceAt = 0;
  // 성당 전체 현황(샤딩): 다른 방들의 합계는 ChurchDirectory 가 알려 준다.
  private others: OtherRooms = { peers: 0, seated: 0, praying: 0, candlesToday: 0 };
  private lit = { day: '', count: 0 };
  private lastPresenceKey = '';
  private lastPresenceAt = -Infinity;

  constructor(opts: LogicOptions) {
    this.layout = opts.layout;
    this.room = opts.room ?? `${opts.layout.id}-1`;
    this.capacity = opts.capacity ?? MAX_PEERS_SAFETY;
    this.clock = opts.now ?? Date.now;
    this.sendFn = opts.send;
    this.closeFn = opts.close;
    this.persistFn = opts.persist;
    this.persistCandleFn = opts.persistCandle;
    this.rateWindowStart = this.clock();
    this.lastRebalanceAt = this.rateWindowStart;
  }

  // ---------------------------------------------------------------- 조회

  peerCount(): number {
    return this.peersByConn.size;
  }
  connectionCount(): number {
    return this.conns.size;
  }
  /** 현재 과부하 단계(0 보통, 1 바쁨, 2 매우 바쁨). */
  loadLevel(): 0 | 1 | 2 {
    return this.level;
  }
  /** 최근 1초 창의 초당 수신 메시지 수(tick 에서 갱신). */
  messageRate(): number {
    return this.msgRate;
  }
  /** 이 방의 현황(ChurchDirectory 에 보고). */
  localPresence(): { peers: number; seated: number; praying: number } {
    let seated = 0;
    let praying = 0;
    for (const p of this.peersByConn.values()) {
      if (p.st === 's') seated++;
      else if (p.st === 'p') {
        seated++;
        praying++;
      }
    }
    return { peers: this.peersByConn.size, seated, praying };
  }
  /** 이 방에서 오늘(KST) 켜진 초 수. */
  candlesToday(now = this.clock()): number {
    return this.lit.day === kstDay(now) ? this.lit.count : 0;
  }
  /** 저장소 보존용 오늘의 초 카운터. */
  litState(): { day: string; count: number } {
    return { ...this.lit };
  }
  restoreLit(state: { day?: unknown; count?: unknown } | null | undefined): void {
    if (state && typeof state.day === 'string' && typeof state.count === 'number' && state.count >= 0) {
      this.lit = { day: state.day, count: Math.floor(state.count) };
    }
  }
  /** 다른 방들의 합계를 받는다(n 과 presence 계산에 쓴다). */
  setOthers(o: OtherRooms): void {
    this.others = {
      peers: Math.max(0, o.peers | 0),
      seated: Math.max(0, o.seated | 0),
      praying: Math.max(0, o.praying | 0),
      candlesToday: Math.max(0, o.candlesToday | 0),
    };
  }
  /** 성당 전체(모든 방) 인원. 클라이언트가 보는 `n`. */
  totalCount(): number {
    return this.peersByConn.size + this.others.peers;
  }
  presence(now = this.clock()): Presence {
    const l = this.localPresence();
    return {
      n: l.peers + this.others.peers,
      seated: l.seated + this.others.seated,
      praying: l.praying + this.others.praying,
      candlesToday: this.candlesToday(now) + this.others.candlesToday,
    };
  }
  /** 값이 바뀌었거나 오래됐을 때만(최소 10초 간격) 모두에게 `presence` 메시지를 보낸다. 보냈으면 true. */
  maybeBroadcastPresence(now = this.clock()): boolean {
    if (this.peersByConn.size === 0) return false;
    const pr = this.presence(now);
    const key = `${pr.n}|${pr.seated}|${pr.praying}|${pr.candlesToday}`;
    const age = now - this.lastPresenceAt;
    if (!(age >= PRESENCE_MAX_MS || (key !== this.lastPresenceKey && age >= PRESENCE_MIN_MS))) return false;
    this.lastPresenceKey = key;
    this.lastPresenceAt = now;
    const msg = { t: 'presence', ...pr };
    for (const p of this.peersByConn.values()) this.send(p.connId, msg);
    return true;
  }
  /** 테스트/디버그용 피어 조회. */
  getPeer(connId: string): PeerView | null {
    const p = this.peersByConn.get(connId);
    return p ? this.view(p) : null;
  }
  /** 테스트/디버그용: connId 피어가 현재 보고 있는 피어 id 목록. */
  visibleTo(connId: string): string[] {
    const p = this.peersByConn.get(connId);
    return p ? [...p.visible] : [];
  }
  seatOwner(seat: string): string | null {
    return this.seats.get(seat) ?? null;
  }
  /** 켜져 있는 촛불 전부(슬롯 순). until 은 항상 0(만료 없음). */
  activeCandles(): Candle[] {
    return [...this.candles.values()]
      .sort((a, b) => a.slot - b.slot)
      .map((c) => ({ slot: c.slot, until: 0, intention: c.intention }));
  }

  /** 저장소에서 읽은 촛불을 복원한다(브로드캐스트·저장 없음). 레이아웃 밖의 슬롯은 버린다. */
  restoreCandles(list: StoredCandle[]): void {
    const total = totalCandleSlots(this.layout);
    for (const c of list) {
      if (!c || !isInt(c.slot, 0, total - 1) || !isInt(c.intention, 0, 7)) continue;
      const seq = isFiniteNum(c.seq) ? c.seq : 0;
      this.candles.set(c.slot, { slot: c.slot, until: 0, intention: c.intention, seq });
      if (seq > this.candleSeq) this.candleSeq = seq;
    }
  }

  // ---------------------------------------------------------------- 연결 수명

  onConnect(connId: string): void {
    this.conns.set(connId, {
      connId,
      connectedAt: this.clock(),
      peerId: null,
      recent: [],
      lastRateErrorAt: -Infinity,
      lastWhoAt: -Infinity,
    });
  }

  onClose(connId: string): void {
    const peer = this.peersByConn.get(connId);
    this.conns.delete(connId);
    if (peer) this.removePeer(peer);
  }

  /** DO가 깨어난 뒤 attachment로부터 피어를 복원한다(브로드캐스트 없음). 모두 복원한 뒤 rebuildVisibility()를 부른다. */
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
      k: seat && snap.st === 'p' && snap.k === 1 ? 1 : 0,
      ro: seat && snap.st === 'p' && snap.ro === 1 ? 1 : 0,
      lastPosAt: now,
      moveBudget: MOVE_BUDGET_MAX,
      dirty: false,
      visible: new Set(),
    };
    this.peersByConn.set(connId, peer);
    this.peersById.set(peer.id, peer);
    if (seat) this.seats.set(seat, peer.id);
    this.conns.get(connId)!.peerId = peer.id;
    return true;
  }

  /** 복원 직후, 알림 없이 모든 피어의 가시 집합을 현재 위치로 다시 계산한다. */
  rebuildVisibility(): void {
    for (const p of this.peersByConn.values()) p.visible.clear();
    this.rebalanceVisibility(false);
  }

  /**
   * 모든 수신자의 가시 집합을 현재 단계의 반경·상한으로 다시 계산한다(가까운 순 최대 maxVisible).
   * notify 가 true 면 차이를 join / leave{aoi:true} 로 알린다.
   */
  private rebalanceVisibility(notify: boolean): void {
    const prm = this.params;
    const all = [...this.peersByConn.values()];
    const n = this.totalCount();
    for (const r of all) {
      const cand: Array<{ p: Peer; d: number }> = [];
      for (const o of all) {
        if (o === r) continue;
        const d = dist(r, o);
        if (d <= (r.visible.has(o.id) ? prm.aoiLeaveRadius : prm.aoiRadius)) cand.push({ p: o, d });
      }
      cand.sort((a, b) => a.d - b.d);
      const keepList = cand.length > prm.maxVisible ? cand.slice(0, prm.maxVisible) : cand;
      const keep = new Set(keepList.map((c) => c.p.id));
      if (notify) {
        for (const id of r.visible) {
          if (!keep.has(id)) this.send(r.connId, { t: 'leave', id, n, aoi: true });
        }
        for (const c of keepList) {
          if (!r.visible.has(c.p.id)) this.send(r.connId, { t: 'join', peer: this.view(c.p), n });
        }
      }
      r.visible = keep;
    }
  }

  // ---------------------------------------------------------------- 메시지 처리

  /** raw가 null이면 텍스트가 아닌(바이너리) 프레임. */
  handleMessage(connId: string, raw: string | null): void {
    const conn = this.conns.get(connId);
    if (!conn) return;
    const now = this.clock();
    this.rateCount++;

    // 속도 제한: 최근 41개 수신 시각이 1초 안에 모두 들어 있으면 초과(초당 40개 초과).
    conn.recent.push(now);
    if (conn.recent.length > RATE_LIMIT_PER_SEC + 1) conn.recent.shift();
    if (conn.recent.length === RATE_LIMIT_PER_SEC + 1 && now - conn.recent[0] < 1000) {
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
        this.onSit(peer, m);
        break;
      case 'stand':
        this.standPeer(peer, now);
        break;
      case 'pray':
        this.onPray(peer, m);
        break;
      case 'candle':
        this.onCandle(peer, m);
        break;
      case 'emote':
        this.onEmote(peer, m);
        break;
      case 'who':
        this.onWho(conn, peer, now);
        return; // 상태가 바뀌지 않으므로 저장하지 않는다
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
    const old = this.peersById.get(id);
    if (old !== undefined) {
      this.conns.delete(old.connId);
      this.removePeer(old);
      this.closeFn?.(old.connId, 4000, 'replaced');
    }

    if (this.peersByConn.size >= this.capacity) {
      this.send(conn.connId, { t: 'error', code: 'busy' });
      this.closeFn?.(conn.connId, 4002, 'busy');
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
      k: 0,
      ro: 0,
      lastPosAt: now,
      moveBudget: MOVE_BUDGET_MAX,
      dirty: false,
      visible: new Set(),
    };

    // AOI: 반경 안의 피어만(가까운 순, 최대 maxVisible) welcome 에 넣고, 그들에게만 join 을 보낸다.
    // 이미 maxVisible 명을 보고 있는 피어에게는 join 을 보내지 않는다(다음 재정렬 때 가까운 순으로 정리됨).
    const prm = this.params;
    let near: Array<{ p: Peer; d: number }> = [];
    for (const other of this.peersByConn.values()) {
      const d = dist(peer, other);
      if (d <= prm.aoiRadius) near.push({ p: other, d });
    }
    near.sort((a, b) => a.d - b.d);
    if (near.length > prm.maxVisible) near = near.slice(0, prm.maxVisible);

    this.peersByConn.set(conn.connId, peer);
    this.peersById.set(id, peer);
    conn.peerId = id;
    const n = this.totalCount();

    const seatsObj: Record<string, string> = {};
    for (const [s, pid] of this.seats) seatsObj[s] = pid;
    const joinTo: Peer[] = [];
    for (const { p } of near) {
      peer.visible.add(p.id);
      if (p.visible.size < prm.maxVisible) {
        p.visible.add(id);
        joinTo.push(p);
      }
    }
    this.send(conn.connId, {
      t: 'welcome',
      you: id,
      room: this.room,
      n,
      peers: near.map(({ p }) => this.view(p)),
      seats: seatsObj,
      candles: this.activeCandles(),
      now,
      presence: this.presence(now),
    });
    const joinMsg = { t: 'join', peer: this.view(peer), n };
    for (const p of joinTo) this.send(p.connId, joinMsg);
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
    const d = Math.hypot(dx, dz);
    if (d > peer.moveBudget) {
      const k = peer.moveBudget / d;
      tx = peer.x + dx * k;
      tz = peer.z + dz * k;
      peer.moveBudget = 0;
    } else {
      peer.moveBudget -= d;
    }
    const tr = clamp(m.r, -FOUR_PI, FOUR_PI);
    if (tx !== peer.x || tz !== peer.z || tr !== peer.r) {
      peer.x = clamp(tx, b.x0, b.x1);
      peer.z = clamp(tz, b.z0, b.z1);
      peer.r = tr;
      peer.dirty = true;
    }
  }

  private onSit(peer: Peer, m: Message): void {
    if (typeof m.seat !== 'string') {
      this.send(peer.connId, { t: 'error', code: 'bad_msg' });
      return;
    }
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
    this.broadcastNear(peer, { t: 'seated', id: peer.id, seat });
  }

  private standPeer(peer: Peer, now: number): void {
    if (peer.seat === null) return;
    if (this.seats.get(peer.seat) === peer.id) this.seats.delete(peer.seat);
    peer.seat = null;
    peer.st = 'w';
    peer.ms = -1;
    peer.k = 0;
    peer.ro = 0;
    peer.lastPosAt = now;
    peer.moveBudget = MOVE_BUDGET_MAX;
    peer.dirty = true;
    this.broadcastNear(peer, { t: 'stood', id: peer.id });
  }

  private onPray(peer: Peer, m: Message): void {
    // k(선택): 기도 자세. 0 앉아서(기본), 1 무릎 꿇고. 있으면 0|1 이어야 한다.
    // r(선택): 묵주를 들고 기도(묵주기도). 0 없음(기본), 1 묵주. 있으면 0|1 이어야 한다.
    if (
      typeof m.on !== 'boolean' ||
      !isInt(m.ms, -1, 3) ||
      (m.on && m.ms < 0) ||
      (m.k !== undefined && !isInt(m.k, 0, 1)) ||
      (m.r !== undefined && !isInt(m.r, 0, 1))
    ) {
      this.send(peer.connId, { t: 'error', code: 'bad_msg' });
      return;
    }
    if (peer.seat === null) return; // 앉아 있을 때만 유효(조용히 무시)
    peer.st = m.on ? 'p' : 's';
    peer.ms = m.on ? m.ms : -1;
    peer.k = m.on && m.k === 1 ? 1 : 0;
    peer.ro = m.on && m.r === 1 ? 1 : 0;
    peer.dirty = true;
    const out: Message = { t: 'praying', id: peer.id, on: m.on, ms: m.ms };
    if (peer.k) out.k = 1;
    if (peer.ro) out.r = 1;
    this.broadcastNear(peer, out);
  }

  private onCandle(peer: Peer, m: Message): void {
    if (!isInt(m.slot, 0, totalCandleSlots(this.layout) - 1) || !isInt(m.intention, 0, 7)) {
      this.send(peer.connId, { t: 'error', code: 'bad_msg' });
      return;
    }
    const range = standRangeForSlot(this.layout, m.slot);
    if (!range) return;
    const { stand, base } = range;
    if (Math.hypot(peer.x - stand.x, peer.z - stand.z) > stand.reach + CANDLE_REACH_SLACK) {
      return; // 해당 촛불대에서 너무 멀면 조용히 무시
    }
    let target = m.slot;
    const lit = this.candles.get(m.slot);
    if (lit) {
      // 이 스탠드에 빈 슬롯이 남아 있으면 요청은 무시(요청자에게 현재 상태만 알림).
      // 꽉 찼으면 가장 오래된 초를 조용히 교체한다.
      let oldest: StoredCandle | null = null;
      let count = 0;
      for (let s = base; s < base + stand.slots; s++) {
        const c = this.candles.get(s);
        if (!c) continue;
        count++;
        if (oldest === null || c.seq < oldest.seq) oldest = c;
      }
      if (count < stand.slots || oldest === null) {
        this.send(peer.connId, { t: 'candle', slot: lit.slot, until: 0, intention: lit.intention });
        return;
      }
      target = oldest.slot;
    }
    const c: StoredCandle = { slot: target, until: 0, intention: m.intention, seq: ++this.candleSeq };
    this.candles.set(target, c);
    const day = kstDay(this.clock());
    if (this.lit.day !== day) this.lit = { day, count: 0 };
    this.lit.count++;
    this.persistCandleFn?.(c);
    const out = { t: 'candle', slot: target, until: 0, intention: c.intention };
    for (const p of this.peersByConn.values()) this.send(p.connId, out); // 촛불은 모두에게
  }

  private onEmote(peer: Peer, m: Message): void {
    if (!isInt(m.e, 0, 2)) {
      this.send(peer.connId, { t: 'error', code: 'bad_msg' });
      return;
    }
    this.broadcastNear(peer, { t: 'emote', id: peer.id, e: m.e });
  }

  /**
   * 이 방 접속자 명단. 개인 식별 정보는 담지 않는다: 피어 id·위치·좌석 없이 세례명 인덱스
   * (`name`,`g`,`nv`)와 상태(`st`)만, 요청자 본인은 빼고(클라이언트가 '나'로 그린다) 입장 순으로
   * 최대 WHO_MAX 명. `room` 은 이 방 인원(본인 포함), `n` 은 성당 전체 인원, 잘렸으면 `more: true`.
   * 한 연결당 WHO_MIN_MS 에 한 번만 답한다(그보다 잦은 요청은 조용히 무시).
   */
  private onWho(conn: Conn, peer: Peer, now: number): void {
    if (now - conn.lastWhoAt < WHO_MIN_MS) return;
    conn.lastWhoAt = now;
    const list: Message[] = [];
    let more = false;
    for (const p of this.peersByConn.values()) {
      if (p === peer) continue;
      if (list.length >= WHO_MAX) {
        more = true;
        break;
      }
      const e: Message = { name: p.avatar.name, st: p.st };
      if (p.avatar.g !== undefined) e.g = p.avatar.g;
      if (p.avatar.nv !== undefined) e.nv = p.avatar.nv;
      list.push(e);
    }
    const out: Message = { t: 'who', n: this.totalCount(), room: this.peersByConn.size, list };
    if (more) out.more = true;
    this.send(conn.connId, out);
  }

  // ---------------------------------------------------------------- 주기 작업

  /**
   * 5Hz로 호출. (1) 움직인 피어에 대해 AOI 가시 집합을 갱신해 join / leave(aoi:true)를 보내고,
   * (2) 변경된 피어를 수신자별(가시 집합 안, 본인 제외)로 snap 하나에 묶어 보낸다.
   */
  flush(now = this.clock()): void {
    // 과부하 단계 > 0 이면 snap 을 snapMs 간격으로 묶는다(dirty 표시는 쌓이므로 최신 위치만 나간다).
    const prm = this.params;
    if (prm.level > 0 && now - this.lastFlushAt < prm.snapMs - 30) return;
    this.lastFlushAt = now;
    const changed: Peer[] = [];
    for (const p of this.peersByConn.values()) {
      if (p.dirty) {
        changed.push(p);
        p.dirty = false;
      }
    }
    if (changed.length === 0) return;
    const n = this.totalCount();

    // 가시 집합 갱신 (변경된 피어 × 전체)
    const hide = new Map<Peer, Peer[]>(); // 수신자 → 숨길 피어
    const show = new Map<Peer, Peer[]>(); // 수신자 → 새로 보일 피어
    const push = (m: Map<Peer, Peer[]>, k: Peer, v: Peer) => {
      const arr = m.get(k);
      if (arr) arr.push(v);
      else m.set(k, [v]);
    };
    for (const d of changed) {
      for (const p of this.peersByConn.values()) {
        if (p === d) continue;
        const dd = dist(d, p);
        // p 가 d 를 보는가
        if (p.visible.has(d.id)) {
          if (dd > prm.aoiLeaveRadius) {
            p.visible.delete(d.id);
            push(hide, p, d);
          }
        } else if (dd <= prm.aoiRadius && p.visible.size < prm.maxVisible) {
          p.visible.add(d.id);
          push(show, p, d);
        }
        // d 가 p 를 보는가
        if (d.visible.has(p.id)) {
          if (dd > prm.aoiLeaveRadius) {
            d.visible.delete(p.id);
            push(hide, d, p);
          }
        } else if (dd <= prm.aoiRadius && d.visible.size < prm.maxVisible) {
          d.visible.add(p.id);
          push(show, d, p);
        }
      }
    }
    for (const [r, list] of hide) {
      for (const p of list) this.send(r.connId, { t: 'leave', id: p.id, n, aoi: true });
    }
    for (const [r, list] of show) {
      for (const p of list) this.send(r.connId, { t: 'join', peer: this.view(p), n });
    }

    const entries = new Map<Peer, Array<string | number>>();
    for (const p of changed) entries.set(p, [p.id, round(p.x, 2), round(p.z, 2), round(p.r, 3), p.st]);
    for (const r of this.peersByConn.values()) {
      const justShown = show.get(r);
      const list: Array<Array<string | number>> = [];
      for (const p of changed) {
        if (p === r || !r.visible.has(p.id)) continue;
        if (justShown && justShown.includes(p)) continue; // join 에 이미 최신 상태가 들어 있음
        list.push(entries.get(p)!);
      }
      if (list.length > 0) this.send(r.connId, { t: 'snap', n, p: list });
    }
  }

  /** 알람마다 호출: hello 없이 오래 둔 연결 정리. (v3: 유휴 자동 일어서기·촛불 만료 없음) */
  tick(now = this.clock()): void {
    for (const conn of [...this.conns.values()]) {
      if (conn.peerId === null && now - conn.connectedAt > HELLO_TIMEOUT_MS) {
        this.conns.delete(conn.connId);
        this.closeFn?.(conn.connId, 4003, 'hello_timeout');
      }
    }
    this.updateLoad(now);
  }

  /** 수신 메시지 속도와 인원으로 과부하 단계를 갱신한다(알람마다). 단계가 바뀌면 가시 집합을 다시 정렬한다. */
  private updateLoad(now: number): void {
    const elapsed = now - this.rateWindowStart;
    if (elapsed >= 1000) {
      this.msgRate = (this.rateCount * 1000) / elapsed;
      this.rateCount = 0;
      this.rateWindowStart = now;
    }
    const peers = this.peersByConn.size;
    const next = nextLoadLevel(this.level, peers, this.msgRate);
    if (next !== this.level) {
      this.level = next;
      this.params = LOAD_LEVELS[next];
      this.rebalanceVisibility(true);
      this.lastRebalanceAt = now;
    } else if (this.level > 0 && now - this.lastRebalanceAt >= Math.max(REBALANCE_MS, peers * 10)) {
      this.rebalanceVisibility(true);
      this.lastRebalanceAt = now;
    }
  }

  // ---------------------------------------------------------------- 내부

  private removePeer(peer: Peer): void {
    if (peer.seat !== null && this.seats.get(peer.seat) === peer.id) this.seats.delete(peer.seat);
    this.peersByConn.delete(peer.connId);
    if (this.peersById.get(peer.id) === peer) this.peersById.delete(peer.id);
    const n = this.totalCount();
    // 진짜 퇴장은 모두에게(aoi 필드 없음): 수신자의 아바타 기록을 지우게 한다.
    for (const p of this.peersByConn.values()) {
      p.visible.delete(peer.id);
      this.send(p.connId, { t: 'leave', id: peer.id, n });
    }
  }

  private view(p: Peer): PeerView {
    const v: PeerView = {
      id: p.id,
      avatar: { ...p.avatar },
      x: round(p.x, 2),
      z: round(p.z, 2),
      r: round(p.r, 3),
      st: p.st,
      seat: p.seat,
      ms: p.ms,
    };
    if (p.k) v.k = 1;
    if (p.ro) v.ro = 1;
    return v;
  }

  private persist(peer: Peer): void {
    if (!this.persistFn) return;
    this.persistFn(peer.connId, this.view(peer));
  }

  private send(connId: string, message: Message): void {
    this.sendFn(connId, message);
  }

  /** 행위자를 보고 있는(가시 집합에 가진) 피어들과 행위자 본인에게 보낸다. */
  private broadcastNear(actor: Peer, message: Message): void {
    this.send(actor.connId, message);
    for (const p of this.peersByConn.values()) {
      if (p !== actor && p.visible.has(actor.id)) this.send(p.connId, message);
    }
  }
}
