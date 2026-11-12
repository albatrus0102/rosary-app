// 성당별 방 디렉터리의 순수 로직(Cloudflare 의존 없음). S-01 '보이지 않는 샤딩'.
//
// 한 성당에는 방(Durable Object)이 여러 개 있을 수 있다(`<churchId>-1`, `-2`, ...). 방들은 서로를 열거할 수 없으므로
// 성당마다 디렉터리 DO 하나(ChurchDirectory)가 방별 인원을 모아 두고, Worker 가 접속할 때마다 "어느 방으로 갈지"를 묻는다.
//
// 배치 정책(거절 없음):
//  - 방 정원 목표 ROOM_TARGET(60명). 목표 미만인 방 중 **가장 찬 방**에 넣는다(방이 한산하게 흩어지지 않고 북적이게).
//    인원이 같으면 번호가 작은 방. 모두 빈 성당이면 항상 `<churchId>-1`(촛불이 저장된 방)로 모인다.
//  - 목표 미만인 방이 하나도 없으면 아직 안 쓴 가장 작은 번호의 새 방을 연다.
//  - 번호 1..MAX_ROOM_NUMBER(50) 모두가 목표 이상이면, 가장 한산한 방에 넣는다. 절대 입장을 거절하지 않는다.
//  - 방이 보고를 ROOM_TTL_MS(20초) 동안 안 하면 그 방의 인원은 0으로 본다(죽은 방 만료).
//  - 방이 보고하기 전에 몰려드는 접속을 위해, 배치할 때마다 '미확정(pending)' 1명을 그 방에 더해 두고,
//    방이 접속을 받았다고 보고하면(accepts) 가장 오래된 pending 부터 지운다. 안 오는 접속은 PENDING_TTL_MS(15초)에 사라진다.
import { MAX_ROOM_NUMBER, kstDay, type OtherRooms } from './room_logic';

/** 방 정원 목표(명). 이 인원까지는 과부하 단계 0(전송 200ms, 반경 40m)이 유지된다(LOAD_UP_PEERS[0] 와 같은 값). */
export const ROOM_TARGET = 60;
export const ROOM_TTL_MS = 20_000;
export const PENDING_TTL_MS = 15_000;

/** 방이 디렉터리에 보내는 보고. */
export interface RoomReport {
  /** hello 를 마친 접속자 수 */
  peers: number;
  /** 소켓이 열려 있는 연결 수(hello 전 포함). 배치 판단에 쓴다. */
  conns: number;
  seated: number;
  praying: number;
  /** 이 방에서 오늘(KST) 켜진 초 수와 그 기준 날짜 */
  candlesToday: number;
  day: string;
  /** 지난 보고 이후 새로 받은 접속 수 */
  accepts: number;
}

interface RoomEntry {
  n: number;
  peers: number;
  conns: number;
  seated: number;
  praying: number;
  candlesToday: number;
  day: string;
  at: number; // 마지막 보고 시각(ms)
  pending: number[]; // 배치 시각들
}

export interface ChurchStats {
  /** 지금 접속 중(hello 완료) 인원, 방 합산 */
  live: number;
  seated: number;
  praying: number;
  /** 오늘(KST 00:00 이후) 켜진 초 수, 방 합산 */
  candlesToday: number;
  /** 살아 있는(TTL 안에 보고한) 방 수 */
  rooms: number;
}

export interface DirectorySnapshot {
  rooms: Array<{ n: number; candlesToday: number; day: string }>;
}

export class DirectoryLogic {
  private rooms = new Map<number, RoomEntry>();
  /** 저장해야 할 변화(방 추가·오늘의 초 증가·방이 비어 감)가 있었는지 */
  dirty = false;

  constructor(
    readonly churchId: string,
    private readonly target = ROOM_TARGET,
    private readonly ttlMs = ROOM_TTL_MS,
    private readonly maxRooms = MAX_ROOM_NUMBER,
  ) {}

  private live(e: RoomEntry | undefined, now: number): e is RoomEntry {
    return e !== undefined && now - e.at <= this.ttlMs;
  }

  private prune(e: RoomEntry, now: number): void {
    while (e.pending.length > 0 && now - e.pending[0] > PENDING_TTL_MS) e.pending.shift();
  }

  /** 방 n 의 현재 부하(배치 판단용): 살아 있으면 연결 수 + 미확정, 아니면 미확정만. */
  private load(n: number, now: number): number {
    const e = this.rooms.get(n);
    if (!e) return 0;
    this.prune(e, now);
    return (this.live(e, now) ? e.conns : 0) + e.pending.length;
  }

  /** 새 접속자가 들어갈 방 번호를 정하고 미확정 1명을 더한다. 거절하지 않는다. */
  assign(now: number): { room: string; n: number } {
    let best = -1;
    let bestLoad = -1;
    let least = 1;
    let leastLoad = Infinity;
    for (let n = 1; n <= this.maxRooms; n++) {
      const l = this.load(n, now);
      if (l < this.target && l > bestLoad) {
        best = n;
        bestLoad = l;
      }
      if (l < leastLoad) {
        least = n;
        leastLoad = l;
      }
    }
    const n = best !== -1 ? best : least; // 목표 미만이 없으면 가장 한산한 방(그래도 입장시킨다)
    let e = this.rooms.get(n);
    if (!e) {
      e = { n, peers: 0, conns: 0, seated: 0, praying: 0, candlesToday: 0, day: '', at: -Infinity, pending: [] };
      this.rooms.set(n, e);
    }
    e.pending.push(now);
    return { room: `${this.churchId}-${n}`, n };
  }

  /** 방의 보고를 받아 저장하고, 이 방을 뺀 다른 방들의 합계를 돌려준다. */
  report(n: number, r: RoomReport, now: number): OtherRooms {
    if (!Number.isInteger(n) || n < 1 || n > this.maxRooms) return this.others(-1, now);
    let e = this.rooms.get(n);
    if (!e) {
      e = { n, peers: 0, conns: 0, seated: 0, praying: 0, candlesToday: 0, day: '', at: -Infinity, pending: [] };
      this.rooms.set(n, e);
      this.dirty = true;
    }
    const clean = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
    if (r.candlesToday !== e.candlesToday || r.day !== e.day) this.dirty = true;
    if (e.peers > 0 && clean(r.peers) === 0) this.dirty = true;
    e.peers = clean(r.peers);
    e.conns = clean(r.conns);
    e.seated = clean(r.seated);
    e.praying = clean(r.praying);
    e.candlesToday = clean(r.candlesToday);
    e.day = typeof r.day === 'string' ? r.day : '';
    e.at = now;
    // 이미 접속한 사람 수만큼 가장 오래된 미확정부터 지운다.
    const accepts = clean(r.accepts);
    if (accepts > 0) e.pending.splice(0, accepts);
    this.prune(e, now);
    return this.others(n, now);
  }

  /** `except` 번호의 방을 뺀 합계(살아 있는 방만; 오늘의 초는 TTL과 무관하게 오늘 날짜 것만). */
  private others(except: number, now: number): OtherRooms {
    const today = kstDay(now);
    const o: OtherRooms = { peers: 0, seated: 0, praying: 0, candlesToday: 0 };
    for (const e of this.rooms.values()) {
      if (e.n === except) continue;
      if (this.live(e, now)) {
        o.peers += e.peers;
        o.seated += e.seated;
        o.praying += e.praying;
      }
      if (e.day === today) o.candlesToday += e.candlesToday;
    }
    return o;
  }

  stats(now: number): ChurchStats {
    const o = this.others(-1, now);
    let rooms = 0;
    for (const e of this.rooms.values()) if (this.live(e, now)) rooms++;
    return { live: o.peers, seated: o.seated, praying: o.praying, candlesToday: o.candlesToday, rooms };
  }

  /** 방별 현황(운영 확인용). */
  roomList(now: number): Array<{ room: string; peers: number; live: boolean }> {
    return [...this.rooms.values()]
      .sort((a, b) => a.n - b.n)
      .map((e) => ({ room: `${this.churchId}-${e.n}`, peers: this.live(e, now) ? e.peers : 0, live: this.live(e, now) }));
  }

  snapshot(): DirectorySnapshot {
    this.dirty = false;
    return { rooms: [...this.rooms.values()].map((e) => ({ n: e.n, candlesToday: e.candlesToday, day: e.day })) };
  }

  /** 저장된 상태를 복원한다(인원은 복원하지 않는다: 방이 다시 보고할 때까지 0명으로 본다). */
  restore(s: DirectorySnapshot | null | undefined): void {
    if (!s || !Array.isArray(s.rooms)) return;
    for (const r of s.rooms) {
      if (!r || !Number.isInteger(r.n) || r.n < 1 || r.n > this.maxRooms || this.rooms.has(r.n)) continue;
      this.rooms.set(r.n, {
        n: r.n,
        peers: 0,
        conns: 0,
        seated: 0,
        praying: 0,
        candlesToday: typeof r.candlesToday === 'number' ? r.candlesToday : 0,
        day: typeof r.day === 'string' ? r.day : '',
        at: -Infinity,
        pending: [],
      });
    }
  }
}

export function emptyStats(): ChurchStats {
  return { live: 0, seated: 0, praying: 0, candlesToday: 0, rooms: 0 };
}

export function sumStats(list: ChurchStats[]): ChurchStats {
  const t = emptyStats();
  for (const s of list) {
    t.live += s.live;
    t.seated += s.seated;
    t.praying += s.praying;
    t.candlesToday += s.candlesToday;
    t.rooms += s.rooms;
  }
  return t;
}
