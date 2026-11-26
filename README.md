# 3D 공방 패키지 — 독서공방(reading-journal)용 공유판

작성: Claude Opus 5.5 · 2026-11-26 UTC · 원본: rosary-app 의 3D 엔진(같은 소유자, 공유 승인 범위 A·C·D·G)

순수 three.js(r149) 단일 HTML 앱에 넣을 수 있는 3D 장면 엔진 축소판과, 독서공방 「공방 가게」 예시 장면(`ch_house.js`)이다.
WebView·브라우저 어디서나 돌고 Flutter 등 특정 틀이 필요 없다. 오프라인 동작(사진 질감·구운 AO 도 파일로 함께 있다).

- 코드 크기: **1.29 MB**(`web/*.js` + `test.html`, 질감 제외; 그중 three.min.js 608 KB, 구운 AO·빛 번짐 데이터 78 KB) — 목표 1.5 MB 이하
- 질감: `web/tex/` 45장 **7.0 MB** — CC0 ambientCG 1k 36장(색·법선·거칠기 12벌) + 소유자 제공 색 지도 1k 9장(owner-supplied, generated with ChatGPT)
- 사진: `docs/shots/` 6장(960×540, deviceScaleFactor 1)
- 사실감: 모든 보이는 것은 두께 있는 3D 지오메트리(벽·창틀·창살·창턱·문·데크 판·울타리 기둥·책상·의자·스툴·책장과 책 상자·등·그네와 A 자 틀·잎 수백 장으로 된 나무·화단 식물), PBR 사진 질감(색·법선·거칠기), 구운 AO + 빛 번짐, ACES 톤매핑. 평면 판은 간판·종이·화면 같은 '인쇄된 면'과 먼 배경 판뿐이다.

![외관 낮](docs/shots/exterior-day.jpg)
![외관 밤](docs/shots/exterior-night.jpg)
![실내](docs/shots/interior.jpg)
![앉은 시점](docs/shots/seat-view.jpg)
![마당 그네](docs/shots/yard-swing.jpg)
![걷는 두 사람](docs/shots/peers-walking.jpg)

## 1. 파일

| 파일 | 하는 일 | 라이선스 |
|---|---|---|
| `web/three.min.js` | three.js r149 | MIT (Copyright 2010-2023 Three.js Authors, 파일 머리에 고지) |
| `web/three_extras.js` | three r149 examples 중 EffectComposer·RenderPass·ShaderPass·UnrealBloomPass·CopyShader·RoomEnvironment·Reflector 만 묶음(`tools/build_extras.mjs`로 다시 만든다; Sky·SSAO·SMAA·RGBE 제외 → 110 KB→22 KB) | MIT (three.js) |
| `web/geo.js` | 정점색 합친 배치(Batch: 수천 도형 = draw call 1), 기본 도형, 캔버스 질감 | 자작 |
| `web/kit.js` | 빌더 도구 `ctx.*`(벽·창(실제 구멍 + 투명 유리 + 창살·창턱)·바닥·천장·상자·원기둥·계단·바닥 구역·충돌체·점광원(최대 3)·빛 무리·누르기 자리·PBR 표면 `surf`) | 자작 |
| `web/kit_tex.js` | 절차 생성 질감(나무·회반죽·돌·체크 등 — 사진이 없을 때의 대체) | 자작 |
| `web/photos.js` | 사진 질감 읽기(`tex/<이름>.jpg`·`_n`·`_r`), 칸 바꿔 끼우기(`RoomPhotoMap`) | 자작 |
| `web/world.js` | 월드 코어: 빌더 실행, 시간대 조명(반구광 + 해/달 그림자 + 빌더 점광원), 하늘·구름·별, 창 햇빛 무늬, 바닥 반사, 구운 AO 연결 | 자작 |
| `web/render.js` | 렌더러(sRGB·ACES·물리 조명), PMREM(RoomEnvironment), 블룸·색보정·피사계 심도, 화질 3단계·자동 하향 | 자작 |
| `web/looks.js` | 장면별 룩(노출·색온도·블룸 — 낮/밤) | 자작 |
| `web/ao_fx.js` · `web/gi_fx.js` | 미리 구운 AO(`ao_<id>.js`)·빛 번짐(`gi_<id>.js`)을 재질에 붙임 | 자작 |
| `web/ao_house.js` · `web/gi_house.js` | 공방의 구운 AO(정점 + 바닥 격자) · 빛 번짐(간접광 한 번 튕김 + 색 번짐, 낮·밤). `node tools/ao_bake.mjs house` · `node tools/gi_bake.mjs house` 로 생성 | 자작(생성물) |
| `web/frame_pace.js` | 고주사율 화면 프레임 박자 | 자작 |
| `web/perf_hud.js` | 성능 표시(fps·1% low·draw·삼각형·GPU ms) + 10초 기록 + **30초 벤치** | 자작 |
| `web/controls.js` | 터치/마우스/키보드: 이동 손잡이, 시점 끌기, 두 손가락 확대, 누르기 | 자작 |
| `web/cam_guard.js` | 카메라 쪽 가림물(벽)을 셰이더로 지우는 인형집 단면, 앉은 시점 쪽 고르기 | 자작 |
| `web/scene_logic.js` | 순수 로직(THREE 없음): 좌석(낱자리 `seats`·줄 의자)·충돌 미끄러짐·바닥 높이·조이스틱 | 자작 |
| `web/layouts.js` | 레이아웃 등록부(`RoomLayouts`) | 자작 |
| `web/avatar.js` | 스킨드 아바타(LOD 3단계, 걷기·앉기·서기·인사, 이름표 `cfg.label`) | 자작 |
| `web/palette.js` | 아바타 색표(피부 4·머리 4×2·머리색 10·옷 12) | 자작 |
| `web/markers.js` | 좌석 표식(바닥 빛 고리 + 이름표, 누르기 판정) | 자작 |
| `web/label_fit.js` | 이름표 화면 크기 맞추기 | 자작 |
| `web/audio.js` | 합성 발소리(파일 없음) | 자작 |
| `web/scan3d.js` | 3D 스캔 묶음 로더(로더만, 묶음 없음) | 자작 |
| `web/net_view.js` | 다른 사람 보기(서버 무관 스냅숏 → 보간) + 내 자세 내보내기 | 자작 |
| `web/bridge.js` | 호스트 연결(`window.Room3D`) | 자작 |
| `web/main.js` | 앱 코어: 상태 기계·카메라·그리기 고리·심장 박동·성능 보고 | 자작 |
| `web/ch_house.js` | **예시 빌더: 독서 공방 가게** | 자작 |
| `web/test.html` | 시험 페이지(호스트 흉내) | 자작 |
| `web/tex/*.jpg`(CC0 12벌) | 사진 질감 1k(색·법선·거칠기) | **CC0 1.0** — ambientCG(아래 표) |
| `web/tex/{plaster_cream,wood_oak,wood_end,rope,linen_a,linen_b,lawn,stone,metal}.jpg` | 소유자가 그네 마당 참고 그림과 함께 만든 색 지도 1k(webp → jpg) | **owner-supplied, generated with ChatGPT** — 소유자 소유 그림, 이 공유 패키지 안에서 쓰도록 제공됨 |
| `tools/serve.mjs` · `shot.mjs` · `shots.mjs` | 정적 서버, 한 장/여섯 장 찍기(Playwright) | 자작 |
| `tools/ao_bake.mjs` · `gi_bake.mjs` · `ao_bvh.mjs` · `harness.mjs` | AO·빛 번짐 굽기(광선 추적, 결정적 — 원본 엔진과 같은 굽기 파이프라인) · BVH · Node 에서 빌더 돌리기 | 자작 |
| `tools/build_extras.mjs` · `extras_entry.js` | three_extras 다시 만들기(esbuild + three@0.149.0 필요) | 자작 |
| `test/*.test.mjs` | Node 단위 시험 + 브라우저 끝까지 시험 | 자작 |

CC0 질감 출처(ambientCG, 모두 CC0 1.0 — 독서공방 저장소 `docs/handover/2026-11-26-metaverse-shop/tex/LICENSES.md` 에 기록된 것을 1k 로 줄임):

| 칸(`surf`) | ambientCG | 쓰는 곳 |
|---|---|---|
| `wood_floor` | WoodFloor040 | 실내·복도 바닥 |
| `wood_dark` | WoodFloor051 | 책상·작업대 상판, 화단 틀, 입간판 |
| `wood_light` | Wood098 | 데크, 문짝, 책장, 울타리, 처마 천장 |
| `stucco` | Plaster002 | 벽(안·밖), 이웃 건물 |
| `plaster` | Plaster001 | (예비) |
| `paving` | PavingStones128 | 보도 |
| `asphalt` | Asphalt033 | 골목 |
| `grass` | Grass004 | 옆마당 잔디 |
| `soil` | Ground048 | 화단 흙 |
| `concrete` | Concrete034 | 앞 화단, 디딤돌, 경계석 |
| `cork` | Cork001 | 코르크 보드 |
| `jute` | Carpet016 | 가운데 러그 |

소유자 제공 색 지도(법선은 비슷한 CC0 법선을 빌려 쓴다 — `photos.js NORMAL_OF`, 거칠기는 절차 생성):

| 칸 | 파일 | 쓰는 곳 | 빌린 법선 |
|---|---|---|---|
| `plaster_cream` | plaster_lime_cream | 집 벽(안·밖), 마당 뒤 담 | stucco_n |
| `wood_oak` | wood_oak_swing | 그네·A 자 틀, 창틀·창살, 문·문틀 | wood_light_n |
| `wood_end` | wood_endgrain | 그네 윗보 끝 | wood_light_n |
| `rope` | rope_jute | 그네 밧줄·매듭 | jute_n |
| `linen_a` · `linen_b` | linen_cushion_a/b | 그네 앉는 방석 · 등 쿠션 | jute_n |
| `lawn` | lawn_grass | 옆마당 잔디 | grass_n |
| `stone` | stone_stepping | 둥근 디딤돌, 화단 돌 테두리, 담 위 돌림띠 | concrete_n |
| `metal` | metal_brushed | 마당 벽등(검게 칠함) | — |

### 1-1. 질감 칸 바꿔 끼우기(독서공방 저장소의 ChatGPT 질감 — 이 패키지에 없음)
독서공방 저장소 `docs/handover/2026-11-26-metaverse-shop/gpt/`(브랜치 `claude/dokseogongbang-24-7g5n82`)의 ChatGPT 그림은 **색 지도만** 있고,
DESIGN.md·GPT-PROMPTS.md·GPT-TEXTURES.md 에 라이선스 문구가 없다(소유자가 만든 생성물). 그래서 **복사하지 않고** 칸 이름으로만 연결한다.
페이지에서 `photos.js` 를 읽기 전에 `window.RoomPhotoMap = { 칸: 'URL' }` 를 두면 그 칸의 색 지도가 바뀌고 법선·거칠기는 쓰지 않는다.
못 읽으면 CC0 사진으로, 그것도 없으면 절차 생성 질감으로 돌아간다(오프라인 안전). `test.html?gpt=<gpt 폴더 경로>/` 가 아래 표대로 끼운다.

| 칸 | 기대하는 파일 |
|---|---|
| `wood_floor` | `gpt/tex/T01-floor-oak.png` |
| `wood_dark` | `gpt/tex/T02-wood-furniture.png` |
| `plaster`, `stucco` | `gpt/tex/T03-plaster.png` |
| `cork` | `gpt/tex/T04-cork.png` |
| `jute` | `gpt/tex/T05-rug.png` |
| `paving` | `gpt/tex/T06-paving.png` |
| `asphalt` | `gpt/tex/T07-asphalt.png` |
| `soil` | `gpt/tex/T08-soil.png` |
| `grass` | `gpt/tex/T09-grass.png` |
| (없음) | `T10-stepping-stone.png` 은 이음매 없는 질감이 아니라 오려 쓰는 한 장이라 칸이 없다(디딤돌은 3D 원기둥 + `concrete`) |
| 배경 판 | `setPanel({id:'backdrop', data:{day:'gpt/P-01-alley-day.png', night:'gpt/P-01-alley-night.png'}})` — 시간대에 맞춰 바뀐다 |
| (없음) | `P-06-wall-art.png` — 액자 그림 자리(지금은 색 면)는 B 항목 |

## 2. 브리지 API (`web/bridge.js`)

### 들어오는 호출(호스트 → 장면)
세 길 중 아무 것이나. 장면이 준비되기 전 호출은 줄에 쌓였다가 처리된다(손잡이·누르기 제외).
```js
window.Room3D.setHour({ hour: 21 });                                          // ① 같은 페이지 / WebView evaluateJavascript
frame.contentWindow.postMessage({ room3d: 'call', fn: 'setHour', args: { hour: 21 } }, '*');   // ② iframe
window.Room3D.call('{"fn":"setHour","args":{"hour":21}}');                    // ③ 문자열 JSON 한 줄
```
| 메서드 | 인자 | 뜻 |
|---|---|---|
| `init` | `{room:'house', avatar, hour, quality:'auto'|'high'|'mid'|'low', fixedClock, poseHz}` | 장면 시작(호스트가 부르는 페이지는 `window.RoomNoAutoStart = true`) |
| `setSeats` | `[{i, taken, mine}]` | 좌석 점유(예: RTDB 독서실 자리). 남이 가진 자리는 표식이 숨고, 내 자리를 남이 가져가면 일어선다 |
| `setMe` | `{avatar:{g, skin, style, hair, outfit, label}}` | 내 아바타 |
| `setHour` | `{hour}` | 시간대(낮 기본·밤 조명 프리셋은 looks.js `house`) |
| `setTimerText` | `{text:'25:00'}` | 창가 1 책상의 타이머 화면 |
| `setPanel` | `{id, data}` | 판 다시 그리기: `sign{title,sub}` · `timer{text}` · `board{notes:[…]}` · `tablet{title,lines}` · `calendar{month,marks}` · `backdrop{url | day,night}` |
| `setGarden` | `[{flower:0..7, stage:0..3, pot:0|1|2}]` | 화단 16자리(앞 화단 6 + 옆마당 화단 5+5). stage 0 씨앗·1 새싹·2 봉오리·3 꽃 |
| `setSkin` | `{skin:'oak'|'walnut'|'white'}` | 바닥 나무 색조(자리 표시용) |
| `pause` / `resume` / `dispose` | — | 그리기·소리 멈춤/재개 / WebGL 문맥까지 정리 |
| `setPeers` | `[{id, x, z, yaw, state:'walk'|'sit', seat, avatar}]`, `{partial}` | 다른 사람(4절) |
| `sit` / `stand` | `{i}` / — | 앉기(번호 없으면 가까운 빈자리) / 일어서기 |
| `setJoystick` | `{x, y}` | 호스트가 그린 이동 손잡이(-1..1) |
| `setQuality` · `setPerfHud` · `setSteps` · `setPoseRate` · `setViewInset` · `setCamera` · `tapAt` | | 화질 · 성능 표시 · 발소리 `{on, vol}` · 내 자세 보내기 빈도 `{hz}` · 아래 패널 비율 `{bottom}` · 카메라 `{dist, follow, view:'tp'|'fp'}` · 화면 좌표 누르기 `{x, y}` |

### 나가는 이벤트(장면 → 호스트) — `{e:'이름', …}`
있는 길로 모두 보낸다: ① `window.Room3DHost.postMessage(JSON 문자열)`(네이티브 셸이 심은 객체) ② iframe 이면 `parent.postMessage({room3d:'event', …})`
③ 같은 페이지면 `Room3D.on(fn)` 과 `window` 의 `room3d` CustomEvent.

| 이벤트 | 내용 |
|---|---|
| `ready` | 스크립트 준비(init 을 부를 수 있다) |
| `firstFrame` | 첫 그림(입장 화면을 걷을 때) |
| `seatTap {i}` | 좌석(표식·의자)을 누름 — 자리 잡기는 호스트가 정하고 `sit({i})` 로 앉힌다 |
| `sat {i}` / `stood {i}` | 앉기·일어서기 완료 |
| `perf {fps, tier}` | 4초 뒤 첫 표본, 이후 5초마다(구간 평균) |
| `tierDown {tier, fps}` | 자동 화질 하향(평균 프레임 45 ms 초과) |
| `glFail {msg}` | WebGL 을 만들지 못함(호스트가 2D 대체 화면으로) |
| `contextLost` / `contextRestored` | WebGL 문맥 잃음/되찾음 |
| `myPose {x, z, yaw, state, seat, t}` | 내 자세(onMyPose, 4절) |
| `tap {id}` | 빌더 누르기 자리(`innerDoor` = 복도 끝 나무 문 → 앱 서재 화면으로) |
| `error {kind, msg}` · `hb {f, st}` · `perfReport {text}` | 오류 · 1초 심장 박동 · 성능 기록 |

## 3. 예시 장면 `ch_house.js`(DESIGN.md 안 A)
- 실내 5.0×6.6 m · 천장 2.7 m(바닥은 데크 한 단 위 0.16 m) + 안쪽 복도 1.2×2.4 m 끝 나무 문(잠긴 장식 문, 누르면 `tap{id:'innerDoor'}`).
- 왼쪽 벽 통창(바닥 0.35 m~2.35 m, 창살 3) + 정면 창(창살·가로살), 두 창은 앞 왼쪽 모서리에서 만난다(모서리 기둥만 남음). 벽은 두께 0.2 m, 창은 실제 구멍 + 나무 틀·창턱.
- 유리 낀 나무 문(안으로 열려 있음) + 데크 한 단, 간판(독서공방 SINCE 2026)·벽등·화분 나무·세로 입간판·노란 자전거·가로등.
- 좌석 **6**: `0~2` 창가 1인 책상(창을 봄) · `3` 작업대 스툴(발판 높이 0.2 m) · **`4·5` 옆마당 2인 그네**.
  그네는 소유자 참고 그림(`ref_swing_yard`)을 따른다: A 자 오크 틀, 살 등받이·팔걸이, 윗보에 감아 맨 황마 밧줄 둘, 크림 리넨 방석 + 등 쿠션 둘, 둥근 디딤돌이 깔린 잔디,
  집 벽을 따라 돌 테두리 화단(수국·라벤더·앱 꽃), 검은 헛간 벽등, 큰 나무 창틀 창, 담쟁이 낀 회벽 담. 참고 그림과는 좌우가 거울(집이 그네의 오른쪽) — 마당이 집 왼쪽에 있기 때문.
  누가 앉아 있을 때만 앞뒤로 ±1.6°(3.6초 주기) 아주 작게 흔들리고, 앉은 아바타도 같은 만큼 옮겨져(`hooks.seatOffset`) 어긋나지 않는다. 움직임 줄이기 설정이면 흔들지 않는다.
- 조명: 펜던트 2(점광원, 약 3000K) + 벽등(점광원) + 다운라이트 6 + 복도 등 + 플로어 스탠드 + 책상 등(발광 + 빛 무리). 낮/밤은 시간대 + 룩(`looks.js` house).
- 옆마당: 잔디 · 둥근 디딤돌 7 · 낮은 울타리 + 뒤 회벽 담 · 화단 2 · 나무·덤불, 앞 화단 1(정면 창 아래). 꽃·잎은 3D 도형(줄기·잎·꽃잎).
- 골목: 보도·경계석·아스팔트 + 먼 배경 판(길 건너 건물 줄, 절차 그림 — `setPanel backdrop` 으로 바꿈) + 이웃 건물 덩어리.
- 썸네일 카메라 2: `?thumb=0` 외관(골목에서) · `?thumb=1` 실내(복도 쪽을 보며).
- 충돌체는 순수 함수 `planColliders()` 하나 — 화면(build)과 시험이 같은 목록을 쓴다. 집 뒤·이웃 건물은 막혀 있고, 집은 문으로만 드나든다.
- 아직 B 항목 도구가 없어 단순 대체: 판(간판·타이머·코르크 쪽지·태블릿·캘린더)은 3D 틀 위의 캔버스 면, 전시 선반 표지·액자 그림은 색 면, 책은 상자.

## 4. 걷는 사람 보이기(G) — `net_view.js`
- 들어오기: `setPeers([{id, x, z, yaw, state, seat, avatar}])` 를 받는 대로(2~4 Hz 권장). 목록에 없는 사람은 1.5초 뒤, 소식이 8초 없으면 지운다(`partial:true` 면 빠진 사람을 지우지 않음).
- 보간: 사람마다 표본 4개, 지금보다 delay(받는 간격 × 1.6, 180~900 ms) 앞의 자리를 그린다. 끝 표본을 앞지르지 않는다(멈춘 사람이 미끄러지지 않게).
  한 번에 2.5 m 넘게 뛰거나 2.5초 넘게 끊겼다 오면 보간 없이 그 자리로 옮긴다. 앉은 사람은 좌석 자리로(0.7초 앉는 동작).
- 내보내기(onMyPose): `myPose` 이벤트를 `hz`(기본 3, `setPoseRate`)로 — 5 cm·0.05 rad 이상 움직였을 때만, 앉기/서기 같은 상태 변화는 바로, 멈춰 있으면 2초마다 한 번(살아 있음).
- **원본(로사리움) 현장감 설계에서 가져온 것**(rosary-app `docs/church/SPEC.md` §3·§6·§12, `server/church/src/room_logic.ts` — 원본 서버는 설계·시험까지이고 실서비스 배포 기록은 없어 실측이 아니라 설계 판단이다):
  내 위치는 클라이언트가 권위이고 **움직이는 동안만 5 Hz 이하**로 보내며 멈추면 '멈춤'(m:0)을 한 번 보낸다 — 받는 메시지가 과금 대상이라 멈춘 사람(대부분 앉아 있다)은 보내지 않는다.
  서버는 바뀐 사람만 **5 Hz 스냅숏 하나로 묶어** 내려보내고, 받는 쪽은 스냅숏 사이를 **200 ms 지연 보간**한다. 앉기·일어서기는 위치와 따로 이벤트로 보내 좌석은 서버가 권위(이미 찼으면 거절)다.
  끊기면 그 사람의 좌석·아바타를 **바로** 지우고, 앱은 1·2·4·8·16초(상한 30초) 지수 백오프로 다시 붙는 동안 혼자 모드로 계속 걷게 한다. 받는 메시지는 초당 12개, 속도는 7 m/s 로 막고, 화면에는 가까운 80명만 그린다(서버는 반경 40 m 관심 영역).
  이 패키지는 이를 RTDB(풀 스냅숏 setPeers)에 맞춰 옮겼다: 2~4 Hz 에서는 200 ms 고정 지연이 표본 간격보다 짧아 끊겨 보이므로 지연을 받는 간격의 1.6배로 늘렸고(이 부분은 원본이 아니라 이번 설계 판단),
  RTDB 는 끊김 알림이 늦을 수 있어 '스냅숏에서 빠진 지 1.5초'·'소식 없음 8초' 두 단계로 지운다. 3 Hz·소수점 2자리(한 번 약 40바이트)면 4명 방에서 초당 0.5 KB 남짓이다.

## 5. 시험·사진
```sh
node --test test/*.test.mjs          # 단위(scene_logic·집 충돌/빠져나가기/갈 수 있는 곳·좌석·그네·net_view·bridge·AO 최신) + 브라우저 끝까지(e2e)
node tools/shots.mjs                  # docs/shots/*.jpg 6장(외관 낮·밤, 실내, 앉은 시점, 마당 그네 두 사람, 걷는 두 사람)
node tools/shot.mjs "thumb=1&hour=21" /tmp/a.png    # 한 장
node tools/serve.mjs 8123             # 브라우저로 http://127.0.0.1:8123/test.html (사진 질감은 http 로 열어야 올라간다)
node tools/ao_bake.mjs house && node tools/gi_bake.mjs house   # 지오메트리를 바꾼 뒤 다시 굽기(--check 로 최신인지만; test/bake.test.mjs 가 어긋나면 실패)
```
- 필요: Node 22, `playwright`(Chromium). 브라우저 시험·사진은 소프트웨어 렌더(swiftshader)라 느리다(사진 6장 약 5분).
- `test.html` URL: `room hour quality autotier frames thumb sit peerseat view peers x z yaw pitch zoom look hideui fixed gpt`.

## 6. 성능 예산(중급 안드로이드)과 30초 벤치
- 예산: **보이는 삼각형 약 170k · draw call 약 260 · 질감 80 MB 이하**. 지금 공방(960×540, 헤드리스 측정): 본 그리기 한 번(간단 단계 — 그림자·반사 없음) 삼각형 **71k(외관)·95k(실내)·113k(사람 셋)**, draw **49~56**. 높음 단계는 그림자 맵·바닥 반사 패스까지 더해 프레임 합계 190k~254k 삼각형·draw 104~156. 정적 장면 111k 삼각형(잎 수천 장 포함). 질감 파일은 1k 지만 `photos.js` 가 올리기 전에 줄인다(가까이 크게 보이는 바닥·벽 색 1024, 다른 색·법선 512, 거칠기 256; 같은 그림은 한 번만 올림) → 장면 재질 질감 합계 **약 80 MB**(밉맵 포함 추정, 렌더 타깃 제외 — 헤드리스 측정). 고사양은 `window.RoomPhotoMax = 1024`.
- 화질 자동 하향: 높음 → 보통 → 간단(3초 평균 45 ms 초과). 앉아 가만히 있으면 30 fps 로 쉰다.
- **30초 벤치(기기에서)**: 서 있는 상태에서 `setPerfHud({on:true})`(또는 `?perfhud=1`) → 오른쪽 위 「30초 벤치」. `layout.benchPath`(스폰 → 데크 → 실내 → 복도 끝)를 따라 12초 걷고(카메라 ±60° 흔듦) 6초 제자리 한 바퀴, 12초 되돌아온다.
  끝나면 평균·1% low fps, 50/100 ms 넘는 프레임 수, 해상도·draw·삼각형 최대, 질감 MB, GPU 이름을 보여 주고 `perfReport` 이벤트로 넘긴다(클립보드 복사도 시도). 같은 기기에서 화질 단계별로 한 번씩.

## 7. 원본에서 뺀 것과 이유
- **종교 요소 전부**(공유 조건): 제대·감실·십자고상·성수대·독서대·발다키노·성상·벽감·촛불대/봉헌초·불꽃·스테인드글라스·장미창·사진 창·후진·돔·궁륭·늑골·메달리온 띠·줄 의자의 무릎틀,
  아바타의 기도·무릎 꿇기·성호·묵주·세례명 목록, 출입 금지(경건) 모듈, 전례 장식, 십자가의 길, 성상 스캔 묶음, 성당별 룩·사진 팩·HDRI, 오르간·종소리. 주석의 해당 언급도 정리했고 이름공간을 `Church*` → `Room*` 로 바꿨다.
- 원본 앱 전용: Flutter 채널(→ 범용 브리지), 창 감상실, 반사 탐침·부드러운 빛줄기(파일 미포함), 자동 걷기 「가기」 경로 탐색·스테이션 표식(→ 좌석 표식), 혼자 모드 배경 인물(NPC), 터치 기록.
- 용량: three_extras 에서 Sky·SSAO·SMAA·RGBE 제외.

## 8. 아직 없는 것
- **B** 새 소품 도구(카드·글 판·책장 끼우기·전시 선반 표지·액자 그림 등) — 지금은 단순 대체.
- **E** 조명 정식판(시간대 연출·노을/새벽 전용 룩·라이트맵) — 지금은 낮/밤 기본 프리셋(ACES, 밤 실내 약 3000K) + 구운 AO·빛 번짐. 빛 번짐 굽기는 원본의 HDRI 대신 RoomEnvironment 평균(고른 0.5)을 쓴다.
- **F** 나머지(카메라 경로 재생기·첫 입장 소개·튜토리얼 등), **H**, **I**.
- 실기기 성능은 재지 않았다(위 30초 벤치로 잰다). 앱 정원 그림(일러스트)과 실사풍 가게가 어울리는지는 앱에서 봐야 한다.
