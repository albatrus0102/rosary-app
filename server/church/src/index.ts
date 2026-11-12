// Worker 진입점: /health, /ws?room=<churchId>-<N>&v=1 → Durable Object 라우팅.
import { ChurchRoom } from './room';
import { CHURCH_IDS, LAYOUTS } from './layouts';
import { PROTOCOL_VERSION, parseRoomName } from './room_logic';

export { ChurchRoom };

export interface Env {
  CHURCH_ROOM: DurableObjectNamespace<ChurchRoom>;
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': '*',
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
      return json({ ok: true, v: PROTOCOL_VERSION, churches: CHURCH_IDS }, 200, CORS_HEADERS);
    }

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
      }
      const room = url.searchParams.get('room');
      const parsed = parseRoomName(room);
      if (!parsed) return new Response('bad room', { status: 400 });
      if (!Object.prototype.hasOwnProperty.call(LAYOUTS, parsed.churchId)) {
        return new Response('unknown church', { status: 400 });
      }
      if (url.searchParams.get('v') !== String(PROTOCOL_VERSION)) {
        return new Response('unsupported version', { status: 400 });
      }
      const id = env.CHURCH_ROOM.idFromName(room as string);
      const stub = env.CHURCH_ROOM.get(id);
      const forward = new Request(request);
      forward.headers.set('x-church-room', room as string);
      return stub.fetch(forward);
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
