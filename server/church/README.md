# 사이버 성당 서버 (`rosary-church`)

묵주기도 앱의 '사이버 성당' 실시간 서버입니다. Cloudflare Workers + Durable Objects(WebSocket Hibernation API)로 만들었고, 성당별로 방(`<churchId>-<N>`)을 나누어 같은 방의 접속자들이 아바타로 서로 보이게 합니다.

- 프로토콜과 서버 규칙(단일 원본): [`docs/church/SPEC.md`](../../docs/church/SPEC.md) §2, §6, v2 §8~10
- 계정 없음, 자유 입력 글 없음(모든 값은 인덱스 범위로 검증), 상태는 접속 중 메모리에만 존재합니다.

## 구조

| 파일 | 역할 |
|---|---|
| `src/room_logic.ts` | Cloudflare 의존 없는 순수 로직(`RoomLogic`). 검증, 좌석, 촛불, 속도 제한, snap 배치 |
| `src/layout.ts` | `Layout` 타입, 좌석 좌표·촛불 슬롯 계산(SPEC §10) |
| `src/layouts.json` | 성당별 레이아웃. 원본은 `assets/church/layouts.js` 이고 `node tools/church_web/export_layouts.mjs` 로 생성 |
| `src/layouts_fallback.ts` | `layouts.json`에 `basic`이 없을 때만 쓰는 하드코딩 폴백. `layouts.json`이 자리 잡으면 이 파일과 `layouts.ts`의 `FALLBACK` 관련 두 줄을 지워도 됩니다 |
| `src/layouts.ts` | json + 폴백으로 카탈로그(`LAYOUTS`, `CHURCH_IDS`) 구성 |
| `src/room.ts` | Durable Object `ChurchRoom` (Hibernation API, 200ms 알람) |
| `src/index.ts` | Worker 라우팅: `/health`, `/ws` |
| `test/room_logic.test.ts` | 단위 테스트(`node:test` + `tsx`) |
| `scripts/smoke.mjs` | `wrangler dev` 상대 스모크 테스트(Node `ws` 클라이언트 2~3개) |

> 주의: 현재 `src/layouts.json`은 `basic` 하나만 들어 있는 자리표시입니다. 웹 쪽 내보내기 스크립트를 돌리면 덮어써지며, 배열 / `{layouts:[...]}` / `{churches:[...]}` / id를 키로 하는 객체 형태를 모두 읽습니다. 배포 전에 반드시 내보내기를 다시 실행하세요.

## 엔드포인트

- `GET /health` → `{"ok":true,"v":1,"churches":["basic", ...]}` (CORS 허용: `*`)
- `GET /ws?room=<churchId>-<N>&v=1` (WebSocket 업그레이드 필수)
  - 업그레이드 헤더가 없으면 426, `room` 형식 오류/N이 1..50 밖/카탈로그에 없는 churchId/`v`≠1 이면 400
  - 방 용량 30명. 가득 차면 `{"t":"full","next":"<같은 성당의 다음 방>"}`을 보내고 닫습니다(50 다음은 1).
  - `hello`는 접속 후 10초 안에 보내야 하며, 그렇지 않으면 연결을 닫습니다.
- 핑: 클라이언트가 정확히 `{"t":"ping"}` 문자열을 보내면 런타임이 DO를 깨우지 않고 `{"t":"pong"}`으로 자동 응답합니다(다른 모양의 ping도 로직이 처리). 자동 응답 핑은 메시지 속도 제한과 유휴 판정에 포함되지 않습니다.

## 서버 규칙 요약 (구현 결정 포함)

- `hello`: uuid 모양, `v`=1, avatar 범위(skin 0..3, style 0..3, hair 0..9, outfit 0..11, name 0..39). 위반 시 `error bad_msg`(버전 불일치는 `error version` 후 종료). 같은 id가 이미 접속 중이면 이전 연결을 내보내고(코드 4000) 새 연결을 받습니다.
- `pos`: 레이아웃 경계로 클램프, yaw는 ±4π로 클램프. 속도 7m/s는 서버 시각 기준 "예산" 방식(평균 7m/s, 최대 3.5m 버스트)으로 보정하며 초과분은 같은 방향으로 잘라냅니다. 보정된 위치를 본인에게 돌려보내지는 않습니다(다른 사람에게 보이는 위치만 제한). 앉아 있는 동안의 `pos`는 무시합니다.
- 좌석: 서버가 권위. 판정 순서는 `invalid`(레이아웃에 없는 id, 비정규 표기 포함) → `taken` → `far`(마지막으로 알려진 위치에서 좌석 중심까지 3m 초과). 한 사람 한 자리이며, 앉은 상태에서 다른 자리를 요청하면 `seat_denied invalid`(먼저 `stand`). 같은 자리를 다시 요청하면 `seated`를 다시 보냅니다. 연결이 끊기거나 일어서면 즉시 해제, 앉으면 위치가 좌석 중심으로 고정됩니다. `seated`/`stood`/`praying`/`candle`은 본인에게도 전송, `emote`는 본인을 제외한 방 전원에게만 보냅니다.
- `pray`: 앉아 있을 때만 유효(서 있으면 조용히 무시). `on:true`는 ms 0..3, `on:false`는 ms -1..3.
- 촛불: 슬롯은 스탠드 순서대로 전역 번호(0..합계-1), 켠 뒤 30분 유지, 켜져 있는 슬롯 요청은 무시하되 요청자에게만 현재 상태(`candle`)를 다시 보냅니다. 요청자의 마지막 위치가 해당 슬롯의 촛불대에서 `reach + 1.2m` 이내여야 하며, 멀면 조용히 무시합니다.
- 이모트: 0..2, 한 사람당 1.5초에 한 번(초과분은 조용히 무시).
- 메시지 속도 제한: 한 연결에서 1초에 12개를 넘으면 `error rate`(초당 최대 1회 응답)를 보내고 해당 메시지를 버립니다.
- 유휴: 앉은 채로 90분 동안 `ping` 외 메시지가 없으면 자동 `stood`(연결은 유지). 활동 판정에서 `ping`은 제외합니다. 앱이 주기적으로 핑을 보내도 자리를 계속 차지하지 않게 하려는 것입니다.
- snap: 5Hz(200ms 알람)로 묶어 변경된 피어만, 수신자별로 본인 항목을 뺀 한 메시지로 전송합니다. 소수점은 x,z 2자리, r 3자리.

## 상태와 하이버네이션

- 방 상태(피어, 좌석, 촛불)는 DO 메모리의 `RoomLogic`에만 둡니다. 저장소(storage)에는 쓰지 않습니다.
- 각 소켓의 attachment에 `{connId, room, 피어 스냅샷}`을 저장하고, DO가 깨어날 때(생성자) `ctx.getWebSockets()`로 피어와 좌석을 복원합니다. 촛불은 복원하지 않으므로 DO가 퇴출되면 사라집니다(임시 상태, 최대 30분).
- 접속자가 있는 동안 200ms 알람이 계속 돌고, 접속자가 0이 되면 알람이 멈춥니다.

## 로컬 개발

```bash
cd server/church
npm install
npm test            # 단위 테스트 (node:test + tsx)
npm run typecheck   # tsc --noEmit
npm run dev         # wrangler dev → http://127.0.0.1:8787 (처음에는 workerd 다운로드로 시간이 걸림)
# 다른 터미널에서
npm run smoke       # 또는 node scripts/smoke.mjs [baseUrl] [churchId]
```

스모크 스크립트는 `/health`, 잘못된 요청(400), 입장/welcome/join, 이동/snap, 멀리서 앉기(far), 앉기/seated, 같은 자리(taken), 기도, 촛불, 이모트, ping/pong, bad_msg, 일어서기/stood, 퇴장/leave를 확인하고 PASS/FAIL을 출력합니다. 매번 임의의 방 번호(1..40)를 사용해 반복 실행해도 서로 간섭하지 않습니다.

## 배포

배포는 Cloudflare 계정과 API 토큰이 준비된 뒤에 합니다.

```bash
cd server/church
node ../../tools/church_web/export_layouts.mjs   # 레이아웃을 최신으로 (한 번 확인)
npm test
npx wrangler login                               # 또는 CLOUDFLARE_API_TOKEN 환경변수
npx wrangler deploy
```

- 배포 후 주소 형태: `https://rosary-church.<계정-서브도메인>.workers.dev`
- 앱 설정의 `ChurchConfig.serverUrl`: `wss://rosary-church.<계정-서브도메인>.workers.dev/ws` (앱이 `?room=<churchId>-<N>&v=1`을 붙입니다)
- 배포 확인: `curl https://rosary-church.<계정-서브도메인>.workers.dev/health`
- `wrangler.toml`의 마이그레이션은 `new_sqlite_classes`(SQLite 백엔드)입니다. 이 형식만 무료 플랜에서 Durable Objects를 쓸 수 있습니다. 나중에 클래스 이름을 바꾸거나 지우려면 새 `[[migrations]]` 항목이 필요합니다.

## 비용 메모 (확인하지 않았음)

**현재 한도와 가격은 제가 확인하지 못했습니다. 배포 전에 소유자가 Cloudflare 공식 문서와 대시보드에서 직접 확인해야 합니다.** 아래는 설계 시 알고 있던 내용입니다.

- 2025년 기준 Workers 무료 플랜에서 SQLite 백엔드 Durable Objects를 쓸 수 있고, 일일 요청·실행 시간(GB-s)·SQLite 읽기/쓰기에 무료 한도가 있습니다.
- DO로 들어오는 WebSocket 메시지는 20개당 요청 1건 비율로 과금 단위에 들어가고, 서버에서 나가는 메시지는 과금되지 않는 것으로 알고 있습니다. 그래서 클라이언트는 이동 중에만 5Hz 이하로 `pos`를 보내고, 서버는 `snap`으로 묶어서 보냅니다.
- 5Hz 알람은 접속자가 있는 방마다 하루 종일 돌 수 있으므로, **알람 호출이 요청·SQLite 쓰기·실행 시간으로 어떻게 계산되는지 특히 확인**하세요. 부담이 크면 `src/room.ts`의 알람 대신 `setInterval` 기반 배치로 바꾸거나 `TICK_MS`를 늘리는 것을 검토할 수 있습니다(snap 지연이 늘어납니다).
- 핑은 런타임 자동 응답이라 DO 실행으로 계산되지 않는 것으로 알고 있습니다(확인 필요).

## 개인정보

- 계정·로그인 없음. 기기에서 만든 랜덤 UUID만 사용합니다.
- 닉네임·채팅 같은 자유 입력 글 없음. 이름표는 세례명 목록의 인덱스, 촛불 지향은 프리셋 인덱스입니다.
- 위치·좌석·촛불은 접속 중 메모리(와 소켓 attachment)에만 있고 저장소에 기록하지 않습니다. 서버 코드는 로그를 남기지 않습니다(Cloudflare 자체 요청 로그는 별개).

## 운영 메모

- 방 이름은 `<churchId>-1` … `<churchId>-50`, 방당 최대 30명입니다. 한 방이 차면 같은 성당의 다음 번호 방으로 안내합니다(50 다음은 1). 모든 방이 차 있으면 클라이언트가 안내를 무한히 따라가지 않도록 시도 횟수를 제한해야 합니다.
- 새 성당을 추가하려면 웹의 `layouts.js`에 추가하고 `export_layouts.mjs`를 실행한 뒤 다시 배포합니다. Worker는 카탈로그에 없는 churchId를 400으로 거부합니다.
- DO 이름은 `idFromName("<churchId>-<N>")`입니다.
