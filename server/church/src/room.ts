// Durable Object: 방 하나(`<churchId>-<N>`). WebSocket Hibernation API 사용.
//
// 상태 정책(하이버네이션):
//  - 방 상태(피어·좌석·촛불)는 메모리(RoomLogic)에만 둔다. 저장소(storage)에는 아무것도 쓰지 않는다.
//  - 각 소켓의 attachment에 {connId, room, 피어 스냅샷}을 직렬화해 둔다. DO가 메모리에서 내려갔다
//    깨어나면(생성자 재실행) ctx.getWebSockets()의 attachment로 피어와 좌석을 복원한다.
//  - 촛불은 attachment에 담지 않으므로 DO가 퇴출(배포·장애·장시간 무활동)되면 사라진다(30분짜리 임시 상태).
//  - 접속자가 있는 동안 200ms 알람이 계속 돌아 DO는 사실상 깨어 있다. 알람은 접속자가 0이 되면 멈춘다.
import { DurableObject } from 'cloudflare:workers';
import type { Env } from './index';
import { LAYOUTS } from './layouts';
import { RoomLogic, parseRoomName, type Message, type PeerSnapshot } from './room_logic';

const TICK_MS = 200;

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

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
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
    if (this.logic && this.logic.peerCount() > 0) {
      ctx.blockConcurrencyWhile(async () => this.ensureAlarm());
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
    });
    return this.logic;
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

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const connId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ connId, room } satisfies Attachment);
    this.sockets.set(connId, server);
    logic.onConnect(connId);
    await this.ensureAlarm(); // hello 타임아웃 정리도 알람이 한다
    return new Response(null, { status: 101, webSocket: client });
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
    // 접속자(또는 hello 대기 연결)가 남아 있을 때만 다음 알람을 건다.
    if (logic.peerCount() > 0 || logic.connectionCount() > 0) await this.ensureAlarm();
  }
}
