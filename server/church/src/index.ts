// Worker 진입점: /health, /stats, /ws → 성당 디렉터리(ChurchDirectory)에서 방을 배정받아 Durable Object 로 라우팅.
//
// 접속 형식(기존 앱과 호환):
//   /ws?room=<churchId>-<N>&v=1      기존 앱 형식. 성당(churchId)만 읽고 방 번호 N 은 서버가 배정한다(S-01 샤딩).
//   /ws?church=<churchId>[&v=1]      같은 뜻의 새 형식(v 생략 가능).
//   /ws?room=<churchId>-<N>&v=1&pin=1  그 방에 직접 접속(스모크·디버그용; 샤딩 우회).
// 배정된 방 이름은 welcome.room 과 업그레이드 응답 헤더 `x-church-room` 으로 돌아온다. 입장을 거절하지 않는다.
import { ChurchRoom } from './room';
import { ChurchDirectory } from './directory';
import { CHURCH_IDS, LAYOUTS } from './layouts';
import { PROTOCOL_VERSION, parseRoomName, kstDay } from './room_logic';
import { emptyStats, sumStats, type ChurchStats } from './directory_logic';

export { ChurchRoom, ChurchDirectory };

export interface Env {
  CHURCH_ROOM: DurableObjectNamespace<ChurchRoom>;
  CHURCH_DIRECTORY: DurableObjectNamespace<ChurchDirectory>;
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': '*',
};

/** 디렉터리가 느리거나 죽었을 때 접속을 막지 않고 이 시간 뒤에 임시 방으로 보낸다. */
const ASSIGN_TIMEOUT_MS = 1500;
const FALLBACK_ROOMS = 4;
const STATS_CACHE_MS = 5000;

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

let statsCache: { at: number; body: unknown } | null = null;

async function collectStats(env: Env): Promise<unknown> {
  const now = Date.now();
  if (statsCache && now - statsCache.at < STATS_CACHE_MS) return statsCache.body;
  const churches: Record<string, ChurchStats> = {};
  await Promise.all(
    CHURCH_IDS.map(async (id) => {
      try {
        const dir = env.CHURCH_DIRECTORY.get(env.CHURCH_DIRECTORY.idFromName(id));
        churches[id] = await withTimeout(dir.stats(id), 3000);
      } catch {
        churches[id] = emptyStats();
      }
    }),
  );
  const body = {
    ok: true,
    at: now,
    tz: 'Asia/Seoul',
    day: kstDay(now),
    total: sumStats(Object.values(churches)),
    churches,
  };
  statsCache = { at: now, body };
  return body;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
      return json({ ok: true, v: PROTOCOL_VERSION, churches: CHURCH_IDS }, 200, CORS_HEADERS);
    }

    if (url.pathname === '/stats') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
      const body = await collectStats(env);
      return json(body, 200, { ...CORS_HEADERS, 'cache-control': 'public, max-age=5' });
    }

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
      }
      const roomParam = url.searchParams.get('room');
      const churchParam = url.searchParams.get('church');
      let churchId: string;
      let pinned: string | null = null;
      if (roomParam !== null) {
        const parsed = parseRoomName(roomParam);
        if (!parsed) return new Response('bad room', { status: 400 });
        churchId = parsed.churchId;
        if (url.searchParams.get('pin') === '1') pinned = roomParam;
      } else if (churchParam !== null && /^[a-z]+$/.test(churchParam)) {
        churchId = churchParam;
      } else {
        return new Response('bad room', { status: 400 });
      }
      if (!Object.prototype.hasOwnProperty.call(LAYOUTS, churchId)) {
        return new Response('unknown church', { status: 400 });
      }
      const v = url.searchParams.get('v') ?? (roomParam === null ? String(PROTOCOL_VERSION) : null);
      if (v !== String(PROTOCOL_VERSION)) {
        return new Response('unsupported version', { status: 400 });
      }

      let room = pinned;
      if (room === null) {
        try {
          const dir = env.CHURCH_DIRECTORY.get(env.CHURCH_DIRECTORY.idFromName(churchId));
          room = (await withTimeout(dir.assign(churchId), ASSIGN_TIMEOUT_MS)).room;
        } catch {
          // 디렉터리 장애: 입장은 막지 않는다. 임시로 앞쪽 몇 개 방에 흩어 보낸다.
          room = `${churchId}-${1 + Math.floor(Math.random() * FALLBACK_ROOMS)}`;
        }
      }
      const stub = env.CHURCH_ROOM.get(env.CHURCH_ROOM.idFromName(room));
      const forward = new Request(request);
      forward.headers.set('x-church-room', room);
      return stub.fetch(forward);
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
