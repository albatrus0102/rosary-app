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
| `src/room.ts` | Durable Object `ChurchRoom` (Hibernation API, 200ms 알람, 디렉터리에 인원 보고) |
| `src/directory_logic.ts` | 순수 로직 `DirectoryLogic`: 방 배정(가장 찬 방 우선, 정원 목표 60), 합산 현황, TTL |
| `src/directory.ts` | Durable Object `ChurchDirectory`(성당당 하나): 방 배정·합산 현황 RPC |
| `src/index.ts` | Worker 라우팅: `/health`, `/stats`, `/ws`(디렉터리에서 방을 배정받음) |
| `test/room_logic.test.ts` | 단위 테스트(`node:test` + `tsx`) |
| `test/capacity.test.ts` | S-01 단위 테스트(과부하 단계, 합산 현황, 방 배정 정책) |
| `scripts/smoke.mjs` | `wrangler dev` 상대 스모크 테스트(Node `ws` 클라이언트 2~3개) |
| `scripts/loadtest.mjs` | 부하 테스트(봇 N개, `--dry` 인-프로세스 모드). `npm run loadtest`, `npm run loadtest:dry` |

> 주의: 현재 `src/layouts.json`은 `basic` 하나(촛불 슬롯 96개)만 들어 있는 자리표시입니다. 웹 쪽 내보내기 스크립트를 돌리면 덮어써지며, 배열 / `{layouts:[...]}` / `{churches:[...]}` / id를 키로 하는 객체 형태를 모두 읽습니다. 배포 전에 반드시 내보내기를 다시 실행하세요.

## 엔드포인트

- `GET /health` → `{"ok":true,"v":1,"churches":["basic", ...]}` (CORS 허용: `*`)
- `GET /stats` → 성당별·전체 합산 현황(접속 인원, 앉은 사람, 기도 중, 오늘 켜진 초, 활성 방 수). Worker 안에서 5초 캐시. 자세한 내용은 [`docs/church/SERVER.md`](../../docs/church/SERVER.md)
- `GET /ws?room=<churchId>-<N>&v=1` (WebSocket 업그레이드 필수)
  - 업그레이드 헤더가 없으면 426, `room` 형식 오류/N이 1..50 밖/카탈로그에 없는 churchId/`v`≠1 이면 400
  - **v3: 방 인원 제한 없음.** 서버는 `full`을 보내지 않습니다(클라이언트는 필드를 파싱만 할 수 있게 유지).
  - **S-01 샤딩(보이지 않음):** 앱이 보내는 `room=<churchId>-N` 의 N 은 무시하고 서버가 성당 디렉터리에서 방을 배정합니다(정원 목표 60명, 가장 찬 방 우선, 넘치면 새 방, 거절 없음). 배정된 방은 `welcome.room` 과 응답 헤더 `x-church-room` 으로 알려 줍니다. `n` 은 성당 전체(모든 방) 인원입니다. `?church=<id>` 형식도 받고(`v` 생략 가능), `&pin=1` 이면 방을 직접 지정합니다(스모크·디버그용). 서버 내부 안전 상한 방당 2000명을 넘으면 `{"t":"error","code":"busy"}` 후 연결을 닫습니다(close 코드 4002) — 샤딩 때문에 정상 운영에서는 도달하지 않습니다.
  - `hello`는 접속 후 10초 안에 보내야 하며, 그렇지 않으면 연결을 닫습니다.
- 핑: 클라이언트가 정확히 `{"t":"ping"}` 문자열을 보내면 런타임이 DO를 깨우지 않고 `{"t":"pong"}`으로 자동 응답합니다(다른 모양의 ping도 로직이 처리). 자동 응답 핑은 메시지 속도 제한에 포함되지 않습니다.

## 서버 규칙 요약 (v3 기준, 구현 결정 포함)

- `hello`: uuid 모양, `v`=1, avatar 범위(skin 0..3, style 0..3, hair 0..9, outfit 0..11, name 0..4095 = 통합 세례명 목록 인덱스, 선택 필드 g 0..1·nv 2). 위반 시 `error bad_msg`(버전 불일치는 `error version` 후 종료). 같은 id가 이미 접속 중이면 이전 연결을 내보내고(코드 4000) 새 연결을 받습니다.
- `pos`: 레이아웃 경계로 클램프, yaw는 ±4π로 클램프. 속도 7m/s는 서버 시각 기준 "예산" 방식(평균 7m/s, 최대 3.5m 버스트)으로 보정하며 초과분은 같은 방향으로 잘라냅니다. 보정된 위치를 본인에게 돌려보내지는 않습니다. 앉아 있는 동안의 `pos`는 무시합니다.
- 좌석: 서버가 권위. 판정 순서는 `invalid`(레이아웃에 없는 id, 비정규 표기 포함) → `taken` → `far`(마지막으로 알려진 위치에서 좌석 중심까지 **8m** 초과). 한 사람 한 자리이며, 앉은 상태에서 다른 자리를 요청하면 `seat_denied invalid`(먼저 `stand`). 같은 자리를 다시 요청하면 `seated`를 다시 보냅니다. **자리는 연결이 끊기거나 `stand`할 때만 비워집니다(유휴 자동 일어서기 없음).**
- `pray`: 앉아 있을 때만 유효(서 있으면 조용히 무시). `on:true`는 ms 0..3, `on:false`는 ms -1..3.
- 촛불: 슬롯은 스탠드 순서대로 전역 번호이며 스탠드별 슬롯 수는 레이아웃이 정합니다(현재 `basic` 96개). **만료 없음**: 모든 `candle` 메시지와 welcome 목록의 `until`은 `0`입니다. 한 사람이 켜는 개수 제한 없음. 요청자의 마지막 위치가 해당 슬롯 촛불대에서 `reach + 5m` 이내여야 하며 멀면 조용히 무시합니다. 요청한 슬롯이 이미 켜져 있을 때: 그 스탠드에 빈 슬롯이 남아 있으면 요청은 무시하고 요청자에게만 현재 상태를 돌려주며, 스탠드가 꽉 찼으면 **가장 오래된 초를 조용히 교체**하고 교체된 슬롯의 `candle`을 모두에게 보냅니다(요청한 슬롯과 다를 수 있음).
- 이모트: 0..2, 쿨다운 없음, 가까운 사람과 본인에게 전송합니다(본인 포함).
- 메시지 속도 제한: 한 연결에서 1초에 **40개**를 넘으면 `error rate`(초당 최대 1회 응답)를 보내고 해당 메시지를 버립니다(서버 보호용).
- snap: 5Hz(200ms 알람)로 묶어 변경된 피어만, 수신자별로 본인 항목을 뺀 한 메시지로 전송합니다. 소수점은 x,z 2자리, r 3자리.

### 관심 영역(AOI)

- 각 접속자는 반경 **40m** 안의 피어만 봅니다. 서버가 접속자별 가시 집합(visible set)을 관리합니다.
- `welcome.peers`: 입장 위치 기준 40m 안의 피어만, 가까운 순(앉은 피어 포함). `welcome.seats`(좌석 점유 맵)와 `welcome.candles`는 전체입니다.
- 새 접속자의 `join`은 40m 안의 피어에게만 갑니다. 피어가 움직여 반경에 들어오면 `join`(최신 상태 포함)이 가고, 반경을 벗어나면 `{"t":"leave","id":"..","n":..,"aoi":true}`가 갑니다. `aoi:true`는 "연결은 살아 있고 범위 밖일 뿐"이라는 뜻이므로 클라이언트는 아바타 기록은 두고 숨기면 됩니다. 연결이 끊긴 진짜 퇴장은 `aoi` 필드 없이 **모든** 접속자에게 갑니다.
- 경계에서 깜박이지 않도록 이탈은 44m(`AOI_LEAVE_RADIUS`)를 넘을 때 통지합니다(진입은 40m).
- `snap`은 수신자의 가시 집합 안에서 변경된 피어만 담습니다. `seated`/`stood`/`praying`/`emote`는 그 행위자를 보고 있는 피어와 본인에게만 갑니다. 촛불 `candle`은 모두에게 갑니다.
- `n`은 모든 메시지에서 정확한 전체 인원수입니다. 다만 먼 곳의 입장은 그 사람들에게 `join`이 가지 않으므로, 먼 접속자는 다음 `snap`/`leave`를 받을 때 갱신된 `n`을 얻습니다.
- 과부하 단계(S-01): 방이 바쁘면(인원 > 60/120 또는 초당 수신 > 500/1000) 반경 40 → 28 → 20m, 수신자당 가시 아바타 80 → 50 → 30명(가까운 순), snap 간격 200 → 400 → 800ms 로 줄어듭니다. 줄어든 반경 밖·상한 밖 피어는 `leave{aoi:true}` 로 알립니다. 정원 목표 60명이라 정상 운영에서는 단계 0 에 머뭅니다.
- 알려진 한계: 40m 안에 매우 많은 사람이 몰리면 welcome/snap이 커질 수 있습니다(서버는 별도 상한 없음, 클라이언트는 가까운 80명만 그림).

## 상태와 하이버네이션

- 피어·좌석은 DO 메모리의 `RoomLogic`에만 둡니다. 각 소켓의 attachment에 `{connId, room, 피어 스냅샷}`을 저장하고, DO가 깨어날 때(생성자) `ctx.getWebSockets()`로 피어와 좌석을 복원한 뒤 가시 집합을 다시 계산합니다.
- **촛불은 DO 저장소(`ctx.storage`, SQLite 백엔드 API)에 보존합니다.** 슬롯당 키 하나(`c:<슬롯>`), 값은 `{slot, until:0, intention, seq}`(seq는 켠 순서이며 "가장 오래된 초" 판정에 씀). 촛불을 켤 때만 쓰기가 발생하고, 방이 처음 쓰일 때(첫 접속 또는 하이버네이션 복원) 한 번 읽습니다. `wrangler dev`를 껐다 켜도 촛불이 남는 것을 확인했습니다.
- 접속자가 있는 동안 200ms 알람이 계속 돌고, 접속자가 0이 되면 멈춥니다.

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

스모크 스크립트는 `/health`, 잘못된 요청(400), 입장/welcome/join, 이동/snap, 멀리서 앉기(far), 앉기/seated, 같은 자리(taken), 기도, 촛불(until 0), 이모트, 35명 추가 입장(full 없음), ping/pong, bad_msg, 일어서기/stood, 퇴장/leave를 확인하고 PASS/FAIL을 출력합니다. 직접 지정 방(`pin=1`, 임의 번호 1..40)을 쓰므로 반복 실행해도 서로 간섭하지 않고, 마지막 구간에서 자동 배정·`/stats`·`presence` 를 확인합니다. 실행에 약 1분 걸립니다. 인원 수(`n`) 검사는 그 성당에 다른 접속자가 없다고 가정하므로 조용한 개발 서버에서 실행하세요(`n` 이 성당 전체 인원이라서).

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
- 촛불 영속화는 촛불을 켤 때마다 SQLite 행 쓰기 1건과 방 시작 시 읽기가 생깁니다. 촛불은 만료가 없고 슬롯 수가 정해져 있어(교체 시 같은 키를 덮어씀) 저장 용량은 슬롯 수 × 스탠드 수로 제한됩니다. 무료 한도는 확인하지 않았습니다.
- v3로 인원 제한이 없어졌으므로 많은 사람이 동시에 접속하면 DO 한 개(방 하나)의 CPU와 수신 메시지(요청 환산) 사용량이 커집니다. 한 DO의 처리량 한계와 무료 플랜 한도를 소유자가 확인해야 합니다.

## 개인정보

- 계정·로그인 없음. 기기에서 만든 랜덤 UUID만 사용합니다.
- 닉네임·채팅 같은 자유 입력 글 없음. 이름표는 세례명 목록의 인덱스, 촛불 지향은 프리셋 인덱스입니다.
- 위치·좌석·촛불은 접속 중 메모리(와 소켓 attachment)에만 있고 저장소에 기록하지 않습니다. 서버 코드는 로그를 남기지 않습니다(Cloudflare 자체 요청 로그는 별개).

## 운영 메모

- 방 이름은 `<churchId>-N`(N=1..50)입니다. 앱은 계속 `<churchId>-1` 로 접속하지만 서버가 실제 방을 배정합니다(S-01, `docs/church/SERVER.md`). 사용자에게 보이는 인원 제한은 없고, 방이 바쁘면 전송 간격·AOI 반경·가시 아바타 수가 단계적으로 줄어듭니다(`room_logic.ts` 의 `LOAD_LEVELS`).
- 새 성당을 추가하려면 웹의 `layouts.js`에 추가하고 `export_layouts.mjs`를 실행한 뒤 다시 배포합니다. Worker는 카탈로그에 없는 churchId를 400으로 거부합니다.
- 방 DO 이름은 `idFromName("<churchId>-<N>")`, 디렉터리 DO 이름은 `idFromName("<churchId>")`입니다.
- 방마다 촛불 저장소가 따로 있으므로 같은 성당이라도 방이 다르면 촛불 모양이 다릅니다. 빈 성당은 항상 `-1` 방으로 모입니다.
