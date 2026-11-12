// Durable Object: 방 하나(`<churchId>-<N>`). WebSocket Hibernation API 사용.
//
// 상태 정책(하이버네이션, v3):
//  - 피어·좌석은 메모리(RoomLogic)에만 둔다. 각 소켓의 attachment에 {connId, room, 피어 스냅샷}을
//    직렬화해 두고, DO가 깨어나면(생성자 재실행) ctx.getWebSockets()로 피어와 좌석을 복원한다.
//  - 촛불은 만료가 없으므로 ctx.storage(슬롯당 키 `c:<slot>`)에 보존하고, 방이 처음 쓰일 때
//    (생성자 복원 경로 또는 첫 접속) 저장소에서 읽어 복원한다. 쓰기는 촛불을 켤 때만 일어난다.
//  - 접속자가 있는 동안 200ms 알람이 계속 돌고, 접속자가 0이 되면 멈춘다.
//  - 샤딩(S-01): 방은 성당 디렉터리(ChurchDirectory)에 인원을 보고한다(변화 시 최대 1초 1회, 접속자가 있으면 5초마다
//    하트비트, 비면 즉시 0). 응답으로 다른 방들의 합계를 받아 `n`(성당 전체 인원)과 `presence` 메시지에 쓴다.
import { DurableObject } from 'cloudflare:workers';
import type { Env } from './index';
import { CandleStore, LitCounterStore } from './candle_store';
import { LAYOUTS } from './layouts';
import { RoomLogic, kstDay, parseRoomName, type Message, type PeerSnapshot } from './room_logic';

const TICK_MS = 200;
/** 디렉터리 보고: 값이 바뀌었을 때 최소 간격 / 접속자가 있을 때 하트비트 간격(ms). 디렉터리 TTL(20초)보다 충분히 짧다. */
const REPORT_MIN_MS = 1000;
const REPORT_HEARTBEAT_MS = 5000;

interface Attachment {
  connId: string;
  room: string;
  peer?: PeerSnapshot;
}

export class ChurchRoom extends DurableObject<Env> {
  private logic: RoomLogic | null = null;
  private room = '';
  private sockets = new Map<string, WebSocket>();
  private alarmArmed = false;
  private candleStore: CandleStore;
  private candlesLoaded: Promise<void> | null = null;
  private litStore: LitCounterStore;
  private lastReportAt = 0;
  private lastReportKey = '';
  private acceptsSinceReport = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.candleStore = new CandleStore(ctx.storage);
    this.litStore = new LitCounterStore(ctx.storage);
    // 핑은 DO를 깨우지 않고 런타임이 자동 응답한다(정확히 이 문자열일 때).
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));

    // 하이버네이션에서 깨어난 경우: 남아 있는 소켓에서 상태 복원.
    for (const ws of ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as Attachment | null;
      if (!att || typeof att.connId !== 'string' || typeof att.room !== 'string') continue;
      const logic = this.ensureLogic(att.room);
      if (!logic) continue;
      this.sockets.set(att.connId, ws);
      logic.onConnect(att.connId);
      if (att.peer) logic.restorePeer(att.connId, att.peer);
    }
    if (this.logic) {
      this.logic.rebuildVisibility();
      ctx.blockConcurrencyWhile(async () => {
        await this.loadCandles();
        if (this.logic && this.logic.peerCount() > 0) await this.ensureAlarm();
      });
    }
  }

  private ensureLogic(room: string): RoomLogic | null {
    if (this.logic) return this.logic;
    const parsed = parseRoomName(room);
    const layout = parsed ? LAYOUTS[parsed.churchId] : undefined;
    if (!layout) return null;
    this.room = room;
    this.logic = new RoomLogic({
      layout,
      room,
      send: (connId, msg) => this.sendTo(connId, msg),
      close: (connId, code, reason) => this.closeConn(connId, code, reason),
      persist: (connId, snap) => this.persistPeer(connId, snap),
      persistCandle: (c) => {
        // 쓰기 실패는 방 동작을 막지 않는다(출력 게이트가 완료 전 응답을 보류한다).
        this.candleStore.save(c).catch(() => {});
        if (this.logic) this.litStore.save(this.logic.litState()).catch(() => {});
      },
    });
    return this.logic;
  }

  private loadCandles(): Promise<void> {
    if (!this.candlesLoaded) {
      this.candlesLoaded = Promise.all([this.candleStore.load(), this.litStore.load()])
        .then(([list, lit]) => {
          this.logic?.restoreCandles(list);
          this.logic?.restoreLit(lit);
        })
        .catch(() => {
          this.candlesLoaded = null; // 다음 기회에 다시 시도
        });
    }
    return this.candlesLoaded;
  }

  private sendTo(connId: string, msg: Message): void {
    const ws = this.sockets.get(connId);
    if (!ws) return;
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // 이미 닫힌 소켓: webSocketClose/Error 에서 정리된다.
    }
  }

  private closeConn(connId: string, code: number, reason: string): void {
    const ws = this.sockets.get(connId);
    this.sockets.delete(connId);
    if (!ws) return;
    try {
      ws.close(code, reason);
    } catch {
      // ignore
    }
  }

  private persistPeer(connId: string, snap: PeerSnapshot): void {
    const ws = this.sockets.get(connId);
    if (!ws) return;
    try {
      ws.serializeAttachment({ connId, room: this.room, peer: snap } satisfies Attachment);
    } catch {
      // ignore
    }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }
    const room = request.headers.get('x-church-room') ?? '';
    const logic = this.ensureLogic(room);
    if (!logic) return new Response('bad room', { status: 400 });
    await this.loadCandles();

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const connId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ connId, room } satisfies Attachment);
    this.sockets.set(connId, server);
    logic.onConnect(connId);
    this.acceptsSinceReport++;
    await this.ensureAlarm(); // hello 타임아웃 정리도 알람이 한다
    // 배정된 방 이름은 welcome.room 으로도 오고, 업그레이드 응답 헤더로도 온다.
    return new Response(null, { status: 101, webSocket: client, headers: { 'x-church-room': room } });
  }

  private connIdOf(ws: WebSocket): string | null {
    const att = ws.deserializeAttachment() as Attachment | null;
    return att && typeof att.connId === 'string' ? att.connId : null;
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const connId = this.connIdOf(ws);
    if (!connId || !this.logic) return;
    this.logic.handleMessage(connId, typeof message === 'string' ? message : null);
    await this.ensureAlarm();
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    this.dropSocket(ws);
    // 방이 비었으면 알람이 멈추므로 여기서 바로 0명을 보고한다.
    if (this.logic && this.logic.peerCount() === 0 && this.logic.connectionCount() === 0) {
      await this.maybeReport(Date.now(), true);
    }
    try {
      // 1005/1006 등 예약 코드는 close()에 넣을 수 없다.
      ws.close(code >= 1000 && code <= 4999 && code !== 1005 && code !== 1006 ? code : 1000, reason);
    } catch {
      // ignore
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.dropSocket(ws);
  }

  private dropSocket(ws: WebSocket): void {
    const connId = this.connIdOf(ws);
    if (!connId) return;
    this.sockets.delete(connId);
    this.logic?.onClose(connId); // 좌석·피어 즉시 해제 + leave 브로드캐스트(멱등)
  }

  // ------------------------------------------------------------ 알람(5Hz)

  private async ensureAlarm(): Promise<void> {
    if (this.alarmArmed) return;
    this.alarmArmed = true;
    const existing = await this.ctx.storage.getAlarm();
    if (existing === null) await this.ctx.storage.setAlarm(Date.now() + TICK_MS);
  }

  async alarm(): Promise<void> {
    this.alarmArmed = false;
    const logic = this.logic;
    if (!logic) return;
    const now = Date.now();
    logic.tick(now);
    logic.flush(now);
    await this.maybeReport(now, false);
    // 접속자(또는 hello 대기 연결)가 남아 있을 때만 다음 알람을 건다.
    if (logic.peerCount() > 0 || logic.connectionCount() > 0) await this.ensureAlarm();
  }

  // ------------------------------------------------------------ 디렉터리 보고

  /** 값이 바뀌면(최소 1초 간격) 또는 하트비트 때(5초) 성당 디렉터리에 현황을 보고한다. 실패해도 방 동작에는 영향이 없다. */
  private async maybeReport(now: number, force: boolean): Promise<void> {
    const logic = this.logic;
    const parsed = parseRoomName(this.room);
    if (!logic || !parsed || !this.env.CHURCH_DIRECTORY) return;
    const l = logic.localPresence();
    const conns = logic.connectionCount();
    const cT = logic.candlesToday(now);
    const key = `${l.peers}|${conns}|${l.seated}|${l.praying}|${cT}`;
    const age = now - this.lastReportAt;
    const changed = key !== this.lastReportKey;
    const idle = l.peers === 0 && conns === 0;
    if (!force) {
      const due = (changed && age >= REPORT_MIN_MS) || (!idle && age >= REPORT_HEARTBEAT_MS);
      if (!due) return;
    }
    const accepts = this.acceptsSinceReport;
    this.lastReportAt = now;
    this.lastReportKey = key;
    this.acceptsSinceReport = 0;
    try {
      const dir = this.env.CHURCH_DIRECTORY.get(this.env.CHURCH_DIRECTORY.idFromName(parsed.churchId));
      const others = await dir.report(parsed.churchId, parsed.n, {
        peers: l.peers,
        conns,
        seated: l.seated,
        praying: l.praying,
        candlesToday: cT,
        day: kstDay(now),
        accepts,
      });
      logic.setOthers(others);
      logic.maybeBroadcastPresence(now);
    } catch {
      this.acceptsSinceReport += accepts; // 다음 보고에 합쳐서 보낸다
      this.lastReportKey = ''; // 다음 알람에 다시 시도(최소 간격은 지킨다)
    }
  }
}
