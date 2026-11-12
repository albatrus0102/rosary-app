# 사이버 성당 설계서 (모든 구현 에이전트의 공용 계약)

목표: 참고 화면("책 마실")처럼 3D 저폴리 성당 안을 조이스틱으로 걸어 다니다가 자리에 앉으면 묵주기도가 시작되는 기능. 실시간 접속으로 같은 성당에 다른 사용자가 아바타로 보인다. 오프라인이거나 서버 주소가 없으면 **혼자 모드**(배경 신자 NPC, 접속자 수 숫자 미표시)로 동작한다.

## 0. 원칙
- 자유 입력 글(UGC) 금지: 닉네임·채팅 없음. 이름표는 **세례명 목록에서 고르기**, 촛불 지향은 **프리셋 목록에서 고르기**. 서버는 모든 값을 인덱스 범위로 검증한다.
- 계정 없음. 기기에서 만든 랜덤 UUID(클라이언트 id)만 사용. 위치·상태는 접속 중에만 존재(저장 안 함).
- 가짜 접속자 수 표시 금지. 혼자 모드의 NPC는 "배경 신자"일 뿐 인원수에 포함하지 않는다.
- 외부 자산(이미지·모델·소리 파일) 없이 **전부 코드로 생성**(도형, WebAudio 합성). 저작권 문제 없음. 라이브러리는 three.js(MIT)만.
- 성능 목표: 중급 안드로이드에서 30fps 이상. 그림자 맵 금지(블롭 그림자), pixelRatio 최대 2, 지오메트리·재질 재사용.

## 1. 월드 좌표 (미터, y는 위)
- 성당 바닥: x ∈ [-12, 12], z ∈ [-20, 20]. 입구 문 z=+19.5, **제대(제단) z=-17**(바닥이 0.5 높은 성소 z ∈ [-20,-14]). 신자석은 제대를 향함(정면 = -z, yaw 0일 때 -z를 본다).
- 중앙 통로 x ∈ [-2.2, 2.2]. 신자석 블록 2개: 왼쪽 x ∈ [-9, -2.6], 오른쪽 x ∈ [2.6, 9]. 좌우 벽쪽 통로 폭 2.5m.
- 신자석 줄(row) r = 0..11, 줄 z 위치 `z_r = -10 + 1.9 * r` (−10 … 10.9). 각 줄의 긴 의자(벤치)는 두께 0.5m의 장애물이고, 줄과 줄 사이 1.4m 공간은 걸어 다니는 통로다(아바타는 벤치를 통과할 수 없고, 줄 사이 공간으로 들어가 앉는다).
- 좌석 id: `{side}{row2}-{idx}` — side는 `L`/`R`, row는 두 자리 00..11, idx는 0..5. 예: `L03-2`. 좌석 중심 x: L은 `-3.2 - 1.0*idx`, R은 `+3.2 + 1.0*idx`; z는 `z_r + 0.35`(벤치 앞면 바로 앞에 앉는다, 벤치 본체는 z_r - 0.25..z_r+0.05 정도). 앉으면 제대를 본다(yaw 0). 총 좌석 2*12*6 = 144.
- 촛불대(봉헌 초): 오른쪽 벽 x=+10.5, z ∈ [-3, 3] 구간에 선반 형태. 슬롯 `slot` 0..23(3줄×8개). 가까이 가면(반경 1.8m) 초를 켤 수 있다.
- 성수대: 입구 좌우. 장식용.
- 스폰: 입구 안쪽 (0, 17), yaw 0. 

## 2. 서버 프로토콜 (WebSocket, JSON 텍스트, 필드 이름 고정)
접속: `wss://<HOST>/ws?room=church-1&v=1`. 방 용량 30명. 가득 차면 서버가 `full`을 보내고 클라이언트는 `next` 방으로 재접속(`church-2`, …).

### 값 범위 (서버가 모두 검증, 범위 밖이면 거부/무시)
- `avatar`: `{skin:0..3, style:0..3, hair:0..9, outfit:0..11, name:0..39}` — name은 세례명 목록 인덱스(아래 4절).
- 상태 `st`: `'w'`(서 있음/걷기) | `'s'`(앉음) | `'p'`(앉아서 기도 중).
- `ms`: 0..3 — 기도 중인 신비 묵주기도 종류(환희, 빛, 고통, 영광), 기도 중이 아니면 -1.
- `e`(이모트): 0 인사(손 흔들기), 1 성호경, 2 고개 숙임.
- `intention`: 0..7 (5절 프리셋).
- 위치 `x ∈ [-12,12]`, `z ∈ [-20,20]`, `r`(yaw 라디안) ∈ [-4π, 4π].

### 클라이언트 → 서버
```json
{"t":"hello","id":"<uuid>","v":1,"avatar":{"skin":1,"style":0,"hair":3,"outfit":5,"name":7}}
{"t":"pos","x":1.2,"z":8.4,"r":0.3,"m":1}            // 걷는 중에만 5Hz 이하, 멈추면 m:0으로 한 번
{"t":"sit","seat":"L03-2"}
{"t":"stand"}
{"t":"pray","on":true,"ms":2}                          // 앉은 뒤 기도 시작/중단(잠깐 쉬기)
{"t":"candle","slot":5,"intention":3}
{"t":"emote","e":1}
{"t":"ping"}
```
### 서버 → 클라이언트
```json
{"t":"welcome","you":"<uuid>","room":"church-1","n":12,"peers":[{"id":"..","avatar":{...},"x":0,"z":5,"r":0,"st":"w","seat":null,"ms":-1}],"seats":{"L03-2":"<id>"},"candles":[{"slot":5,"until":1760000000000,"intention":3}],"now":1759999000000}
{"t":"join","peer":{...peer 객체...},"n":13}
{"t":"leave","id":"..","n":12}
{"t":"snap","n":13,"p":[["<id>",1.2,8.4,0.3,"w"], ...]}     // 변경된 피어만, 서버가 5Hz로 묶어 전송
{"t":"seated","id":"..","seat":"L03-2"}                       // 좌석 확정(본인에게도 전송)
{"t":"stood","id":".."}
{"t":"seat_denied","seat":"L03-2","reason":"taken|invalid|far"}
{"t":"praying","id":"..","on":true,"ms":2}
{"t":"candle","slot":5,"until":1760001800000,"intention":3}
{"t":"emote","id":"..","e":1}
{"t":"full","next":"church-2"}
{"t":"pong"}
{"t":"error","code":"bad_msg|rate|version"}
```
서버 규칙: 좌석은 서버가 권위(이미 있으면 `seat_denied taken`); 연결이 끊기면 좌석·피어 즉시 해제; 속도 제한 최대 7m/s(초과 시 위치 보정); 위치는 성당 경계 안으로 클램프; 클라이언트 메시지 수신 속도 제한(초당 12개 초과 시 `error rate` 후 무시); 앉은 상태에서 90분 넘게 입력 없으면 자동 `stood`; 촛불은 켠 뒤 30분 유지, 같은 슬롯이 켜져 있으면 무시; 인원수 `n`은 방 단위. 방 인스턴스는 `church-1..church-N`.

## 3. 웹 장면 ↔ Flutter 브리지
웹 페이지: `assets/church/index.html`(평면 구조, 하위 폴더 없음), 클래식 스크립트만 사용(ES module 금지: file 로딩 제한). 로드: `webview_flutter`의 `loadFlutterAsset('assets/church/index.html')`.

### 웹 → Flutter (JS 채널 이름 `FlutterChurch`, 메시지는 JSON 문자열 한 개)
```
{"e":"ready"}
{"e":"near","seat":"L03-2"|null,"candle":5|null}       // 가장 가까운 앉을 수 있는(비어 있고 반경 1.3m) 좌석, 반경 1.8m 안 촛불 슬롯. 값이 바뀔 때만
{"e":"seated","seat":"L03-2"}                            // 앉는 애니메이션이 끝났을 때
{"e":"stood"}
{"e":"pos","x":..,"z":..,"r":..,"m":0|1}                // 10Hz 이하, 멈추면 한 번 m:0
{"e":"perf","fps":58}                                     // 5초마다
```
### Flutter → 웹 (`window.ChurchAPI.<method>(jsonObject)`; 인자는 모두 JSON 직렬화 가능한 객체 하나)
```
init({avatar, hour, ambient, solo, quality})  // hour 0..24 실수(기기 시간), quality 'low'|'high'
setJoystick({x, y})          // -1..1, y>0 이 앞으로(카메라 기준 전진)
sit({seat?})                 // seat 생략 시 가장 가까운 빈 좌석; 서버가 거부하면 Flutter가 setSeatTaken 호출
stand({})
setPraying({on, ms})         // 앉은 아바타의 기도 포즈(고개 숙임, 손 모음)
setAvatar({avatar})
setPeers({peers:[{id,avatar,x,z,r,st,seat,ms}], seats:{seatId:id}})   // 전체 교체
peerJoin({peer}) peerLeave({id}) peerSnap({p:[[id,x,z,r,st],...]})
peerSeat({id,seat}) peerStand({id}) peerPraying({id,on,ms}) peerEmote({id,e})
setCandles({candles:[{slot,until,intention}]})   // 전체 교체
lightCandle({slot,until,intention})
setAmbient({on})  setHour({hour})  setSolo({on})  setQuality({quality})
emote({e})
```
- 내 아바타 위치는 웹이 권위(클라이언트 측 이동). Flutter가 `pos`를 받아 서버로 보낸다(5Hz 제한).
- 다른 아바타 위치는 도착한 스냅샷 사이를 200ms 보간한다.
- 혼자 모드(`solo:true`): 배경 신자 NPC 6~10명이 무작위 빈 좌석에 앉아 기도하는 모습(고개 숙임)과 천천히 걷는 소수의 인물. 접속자 수와 무관.
- 웹은 자체 테스트 페이지 `assets/church/test.html`(모의 브리지, 키보드 WASD 이동)을 제공한다. Playwright(headless chromium, `--use-gl=swiftshader --enable-unsafe-swiftshader`)로 스크린샷 검증한다.

## 4. 공용 상수 (웹·서버·Flutter가 같은 값 사용)
- 세례명 목록(인덱스 0..39, 이 순서 고정): 마리아, 안나, 엘리사벳, 마르타, 데레사, 아녜스, 체칠리아, 클라라, 루치아, 막달레나, 소피아, 로사, 카타리나, 베로니카, 젬마, 모니카, 비비안나, 율리안나, 헬레나, 에밀리아, 베드로, 바오로, 요한, 요셉, 안드레아, 토마스, 프란치스코, 미카엘, 가브리엘, 라파엘, 스테파노, 마르코, 루카, 마태오, 야고보, 필립보, 시몬, 다미아노, 아우구스티노, 베네딕토.
- 피부색 4, 머리 모양 4(짧은 머리, 단발, 올림머리, 곱슬), 머리색 10, 옷색 12 — 색상표는 `assets/church/palette.js`(웹)와 `lib/church/avatar/avatar_config.dart`(Flutter)가 **같은 HEX 값**을 가진다. 색상표 정의는 웹 에이전트가 `palette.js`를 먼저 만들고(첫 편집), Flutter 쪽은 그것을 복사해 쓴다.
- 촛불 지향 프리셋(인덱스 0..7): 가족과 이웃을 위해, 아픈 이들을 위해, 세상의 평화를 위해, 돌아가신 이들을 위해, 감사의 마음으로, 시험과 일을 위해, 통회와 용서를 위해, 나라와 교회를 위해.

## 5. Flutter 구조 (lib/church/)
- `avatar/avatar_config.dart`, `avatar/avatar_editor_screen.dart`, `avatar/avatar_preview.dart`(2D CustomPaint 미리보기), `net/church_net.dart`(인터페이스·이벤트), `net/web_socket_church_net.dart`, `net/solo_church_net.dart`, `church_constants.dart`(세례명·지향 목록·좌석 id 규칙·ChurchConfig.serverUrl), 설정 필드는 `lib/app/settings.dart`에 추가.
- `church_screen.dart`(WebView + HUD), `church_scene_controller.dart`(브리지 추상화 + WebView 구현 + 테스트용 가짜), `church_hud.dart`, `church_prayer_card.dart`.
- 앱 셸에 4번째 목적지 '성당'(`Icons.church`) 추가.

### ChurchNet 인터페이스 (W3b가 구현, W3a가 사용)
```dart
enum NetState { offline, connecting, online }
sealed class ChurchEvent { ... }  // Welcome(you, room, n, peers, seats, candles, now), Join(peer, n), Leave(id, n), Snap(n, list), Seated(id, seat), Stood(id), SeatDenied(seat, reason), Praying(id, on, ms), Candle(slot, until, intention), Emote(id, e), Full(next)
abstract class ChurchNet {
  ValueListenable<NetState> get state;
  ValueListenable<int> get count;     // 방 인원수(offline이면 0)
  Stream<ChurchEvent> get events;
  Future<void> connect();  Future<void> disconnect();  void dispose();
  void sendPos(double x, double z, double r, bool moving);  // 내부에서 5Hz로 제한
  void requestSit(String seat);  void sendStand();  void sendPraying(bool on, int ms);
  void lightCandle(int slot, int intention);  void emote(int e);
}
```
`ChurchConfig.serverUrl`이 빈 문자열이면 `SoloChurchNet`(항상 offline)만 사용. 연결이 끊기면 자동 재연결(지수 백오프 1,2,4,8,16초 상한 30초), 재연결 중에는 혼자 모드로 계속 걷기/기도 가능.

### 기도 연동 (W3a)
- 앉음 → `RosarySession`(오늘의 신비, `settings.savedPrayer`가 있고 같은 신비면 이어서)로 기도 시작. 하단 카드: '지금 기도 중' + 신비 이름/단/현재 기도 제목 + 기도문 앞 2줄 + 이전/다음 + 기도 시간(mm:ss) + [잠깐 쉬기/이어 기도] + [일어나기] + [끝내기]; '전체 화면으로 기도' 버튼은 기존 `PrayerScreen`을 열어 같은 진행을 이어 간다(`PrayerScreen`에 선택 인자 `RosarySession? session` 추가 — 외부 세션이면 dispose하지 않음).
- 잠깐 쉬기: 타이머 정지, `st:'s'`로. 일어나기: 진행 저장(`settings.saveProgress`), 아바타가 일어섬. 끝내기: 진행 삭제 후 일어섬, 완료 인사.
- 앉아 있는 동안 진동·종소리·선창 음성 등 기존 기도 기능은 그대로.

## 6. 서버 (server/church/, Cloudflare Workers + Durable Objects)
- `src/room_logic.ts`(CF 의존 없는 순수 로직: 검증, 좌석, 촛불, 속도 제한, 브로드캐스트 큐) + `src/index.ts`(Worker 라우팅 `/ws`, `/health`) + `src/room.ts`(Durable Object, WebSocket Hibernation API, 5Hz 알람으로 snap 배치 전송) + `wrangler.toml` + `package.json` + `README.md`(배포 방법, 비용 메모) + 테스트.
- 방 선택: `/ws?room=church-N` → 해당 이름의 DO. N은 1..50만 허용. `/health`는 JSON `{ok:true}`.
- 수신 메시지는 과금 대상이므로 클라이언트는 이동 중에만 5Hz로 보내고, 서버→클라이언트 송신은 snap 배치로 묶는다.
- 테스트: 순수 로직 단위 테스트(좌석 경합, 범위 검증, 속도 제한, 만원 처리, 연결 해제 시 정리) + 로컬 실행(`wrangler dev`) 상태에서 Node WebSocket 클라이언트 2개로 입장/이동/앉기/촛불을 확인하는 스모크 스크립트.
- 배포는 사용자의 Cloudflare 토큰이 준비된 뒤 별도로 수행한다(에이전트는 배포하지 않는다).

## 7. 파일 소유권
- W1(웹): `assets/church/*` 전부.
- W2(서버): `server/church/*` 전부.
- W3a(Flutter 화면): `lib/church/church_*.dart`, `lib/ui/app_shell.dart`, `lib/ui/prayer_screen.dart`(session 인자 추가만), `pubspec.yaml`(webview_flutter, assets 항목), 관련 테스트.
- W3b(Flutter 넷·아바타·설정): `lib/church/avatar/*`, `lib/church/net/*`, `lib/church/church_constants.dart`, `lib/app/settings.dart`(성당 필드 추가만), `pubspec.yaml`의 `web_socket_channel`만(한 줄, W3a와 충돌하면 재시도), 관련 테스트.
- 서로의 파일은 읽기만. 커밋하지 말 것. 각자 `dart format`/분석/테스트를 통과시킨 뒤 짧게 보고.

---
# v2 확장: 다중 성당 (사용자 요청: 유명 성당 목록, 내부는 실제와 최대한 같게)

이 절이 위 내용과 충돌하면 **v2가 우선**한다. 위 1~7절의 성당은 카탈로그의 `basic`('우리 본당')이 된다.

## 8. 카탈로그
1차(wave 2a): `stpeter` 성 베드로 대성전(바티칸), `lateran` 라테라노 성 요한 대성전(로마), `maggiore` 성 마리아 마조레 대성전(로마), `stpaul` 성 밖의 성 바오로 대성전(로마), `milan` 밀라노 대성당(두오모), `florence` 피렌체 대성당(산타 마리아 델 피오레), `myeongdong` 명동대성당(서울).
2차(wave 2b, 1차 이후): `stmark` 베네치아 산 마르코 대성당, `jeondong` 전주 전동성당, `yakhyeon` 약현성당(서울), `gyesan` 계산성당(대구), `fatima` 파티마 성모 성지 대성당, `lourdes` 루르드 로사리오 대성전, `sagrada` 사그라다 파밀리아, `notredame` 파리 노트르담 대성당.
기본: `basic` 우리 본당(1~7절 그대로). 카탈로그 id는 소문자 영문뿐.

## 9. 방·서버
- 방 이름: `<churchId>-<N>` (예 `stpeter-1`), N=1..50, 방 용량 30. 접속 URL `?room=stpeter-1&v=1`. 서버는 카탈로그에 없는 churchId를 400으로 거부.
- 서버는 `server/church/src/layouts.json`(아래 스키마)으로 성당별 경계·좌석·촛불대를 검증한다. 좌석/위치/촛불 검증 로직은 layouts에서 계산한다(1~7절의 상수는 `basic` 레이아웃의 값일 뿐).
- `GET /health` 응답에 `churches:[ids...]` 포함.

## 10. 레이아웃 스키마 (단일 원본: `assets/church/layouts.js` → `window.ChurchLayouts`)
```json
{ "id":"basic", "scalePercent":100,
  "bounds":{"x0":-12,"x1":12,"z0":-20,"z1":20},
  "spawn":{"x":0,"z":17,"r":0},
  "seatGroups":[{"g":"L","rows":12,"perRow":6,"origin":{"x":-3.2,"z":-9.65},"dx":-1.0,"dz":1.9,"rowDx":0,"yaw":0}],
  "candles":{"stands":[{"x":10.5,"z":0,"slots":24,"reach":1.8}]} }
```
- 좌석 id `${g}${row2}-${idx}`: g는 대문자 1~2자(성당 안에서 유일), row 두 자리 00..99, idx 0..39. 위치 `x = origin.x + dx*idx + rowDx*row`, `z = origin.z + dz*row`; 앉으면 `yaw`(0 = -z를 봄) 방향을 본다. 좌석 그룹은 직선 격자만 허용(곡선·사선 배치는 여러 그룹으로 근사).
- 촛불 슬롯은 스탠드 순서대로 전역 번호(0..합계-1). 서버 허용 거리 = reach+1.2m.
- `basic`의 레이아웃은 1~2절과 정확히 같아야 한다(좌석 id `L03-2` 등 호환).
- 내보내기: `node tools/church_web/export_layouts.mjs` 가 `assets/church/layouts.js`에서 `server/church/src/layouts.json`을 만든다(W1이 스크립트 제공, W2는 생성된 JSON을 사용, 파일이 없으면 `basic`만 직접 하드코딩해 시작).

## 11. 웹 빌더 구조 (W1이 먼저 정리, 이후 성당 제작 에이전트들이 사용)
- 각 성당은 `assets/church/ch_<id>.js` 하나: `ChurchBuilders['<id>'] = { layout, build(ctx) }`. `ctx`는 W1이 제공하는 도구 모음(three 네임스페이스, 재질/텍스처 도우미(대리석 격자·모자이크·나무결·벽돌 캔버스 텍스처), 박스/기둥/아치/궁륭/돔/창/제대 도우미, 충돌체 등록 `addCollider`, 조명 등록 `addLight`, 창 빛줄기 `addWindowBeam`, 시간대 훅). `build`는 월드 그룹과 충돌체 목록을 돌려준다. W1이 `docs/church/BUILDER_API.md`에 전부 문서화한다.
- `ChurchAPI.init({church:'<id>', ...})` 가 해당 빌더를 호출한다. 알 수 없는 id는 `basic`.
- 성당마다 파일이 분리되므로 여러 에이전트가 충돌 없이 동시에 제작한다. 빌더 파일은 `index.html`에 `<script>` 로 등록한다(W1이 `index.html`의 빌더 목록 한 줄 규칙을 정한다).

## 12. Flutter
- `ChurchCatalog`(W3b, `lib/church/church_catalog.dart`): id, 이름, 도시·나라, 종류(대성전/대성당/성당), 건립 연도, 축소 비율 `scalePercent`, 짧은 설명(2문장), 1차/2차 구분. 설명·연도는 `docs/church/interiors/<id>.md` 조사서가 나오면 그 내용으로 채운다(그 전에는 이름·도시만, 설명은 빈칸 허용).
- `ChurchSelectScreen`(W3a): Material 3. `SliverAppBar.large('성당 고르기')`, 구역 머리글(로마·바티칸 / 이탈리아 / 한국 / 우리 본당), 카드 격자(썸네일 `assets/church_thumbs/<id>.png`, 없으면 색 블록 대체, 이름, 도시, 축소 비율 칩). 카드를 누르면 상세 시트(설명, '입장' FilledButton). 마지막 선택을 `settings.churchId`(W3b, 기본 'basic')에 저장. 성당 탭: 선택 화면 → 입장 → `ChurchScreen(churchId)`. HUD에 성당 이름 표시, 바꾸기 버튼.
- `ChurchNet.connect({churchId})`, `ChurchConfig.roomName(churchId, n)`(W3b).
- 썸네일은 W1이 `tools/church_web/thumbs.mjs`(Playwright)로 각 성당 내부를 캡처해 `assets/church_thumbs/<id>.png`(400×240 이하, 40KB 안팎)로 만든다. 사진을 쓰지 않으므로 저작권 문제가 없다. Flutter pubspec 자산 항목은 W3a가 추가.

## 13. 충실도 정책 (실제 내부와 최대한 같게)
- 조사서(`docs/church/interiors/<id>.md`)의 **검증된 수치와 평면**을 따른다: 신랑(중앙 본당) 길이·폭·높이, 측랑 수, 익랑, 후진(앱스), 돔 지름·높이, 베이(칸) 수, 기둥 개수와 양식, 천장 유형(원통 궁륭/교차 궁륭/격자 천장), 제대·발다키노·성가대, 바닥 문양, 창 배치와 색.
- 축소: 가장 긴 변이 약 70m 이하가 되도록 균일 축소(`scalePercent`)하고 **비율은 유지**한다. 대신 기둥 간격·창 개수는 실제의 칸 수를 유지한다.
- 좌석: 고정 신자석이 있는 성당은 실제 배치에 맞춰, 없는 성당(성 베드로 등)은 신랑 양옆과 익랑에 의자 줄을 놓는다. 좌석 수는 성당당 60~200석.
- 양식화: 저폴리(박스·원기둥·아치·돔), 캔버스 생성 텍스처, 색은 조사서의 팔레트. 조각·프레스코는 색 면과 단순한 패턴으로 대체. 앱 안 정보 시트에 "실제 건축을 단순화한 3D 모형이며 실제 크기의 N%입니다"를 표시.
- 사실 검증: 모든 수치는 출처(위키백과 등)와 함께 조사서에 적고, 확인하지 못한 것은 '미확인'으로 표시한다. 사진·이미지는 쓰지 않는다.

## 14. 참고 시안 (사용자가 ChatGPT로 만든 이미지)
경로: `/tmp/claude-0/-home-user/127c52ad-6e6f-576e-8168-2e8eda5aa1ed/scratchpad/church_refs/` — `stpeter.png`, `lateran.png`, `maggiore.png`, `stpaul.png`, `milan.png`, `florence.png`, `myeongdong.png`(성당 내부), `style_lowpoly.png`(저폴리 캐릭터·장면 스타일 기준), `ui_church_select.png`(성당 고르기 화면 시안), `ui_stats.png`(기도 기록 화면 시안). Read 도구로 볼 수 있다.
- 사용 규칙: **분위기·색감·구도·대표 요소**만 참고한다. 수치·평면·개수는 조사서(`docs/church/interiors/<id>.md`)가 우선한다(인공지능 이미지는 사실과 다를 수 있다). 이미지의 글자(라틴어 명문 등)와 인물 모습은 따라 하지 않고 색 면·단순한 패턴으로 대체한다. 이미지 파일은 저장소에 넣지 않는다.
- 각 시안에서 뽑을 요소: 베드로=대형 코퍼 원통 궁륭, 청동 꼬임 기둥 발다키노, 돔에서 내려오는 빛줄기, 다색 대리석 바닥 문양, 양옆 의자 줄. 라테라노=기둥마다 거대한 사도상 벽감, 금빛 코퍼 천장, 고딕 치보리움, 황금 후진 모자이크, 붉은 카펫 계단. 마조레=양쪽 이오니아식 대리석 기둥 열, 평평한 금빛 코퍼 천장, 개선문 모자이크, 코스마테스크 바닥. 성 바오로=반원 아치로 이어진 회색 화강암 기둥 열, 위쪽 교황 초상 원형 메달 띠, 금빛 개선문 모자이크, 고딕 닫집(치보리움), 나무 신자석. 밀라노=가는 선이 모인 거대한 기둥과 상단 조각 벽감, 채색된 리브 궁륭, 후진의 커다란 스테인드글라스, 어두운 분위기. 피렌체=절제된 흰색·회색 석조 고딕 신랑, 팔각 돔 아래 최후의 심판 프레스코, 다색 대리석 바닥, 작은 스테인드글라스. 명동=회색 벽돌 기둥과 흰 리브 궁륭, 제대 뒤 키 큰 스테인드글라스 3~5개, 나무 신자석, 샹들리에, 설교대.
- 스타일 기준 `style_lowpoly.png`: 부드러운 파스텔·흙색, 크림색 후드의 동글한 아바타(뒷모습), 각진 저폴리 나무·바위, 따뜻한 석양 조명. 성당 장면도 같은 톤(부드러운 면, 낮은 대비, 따뜻한 빛)으로 맞춘다.
- UI 시안 `ui_church_select.png`: 분홍빛 그라데이션 히어로 헤더 + 제목 '성당 고르기'와 한 줄 안내, `SearchBar`(성당 이름이나 도시로 검색하기), 필터 칩(전체/지역/건축 양식/추천순), 2열 카드(썸네일 + 즐겨찾기 북마크 버튼 + 이름 + 도시 + '실제의 N%' 칩). `ui_stats.png`: 상단 일러스트(언덕과 십자가) 헤더, 이번 달/올해/전체 요약 카드 3개, 월 달력(기도한 날 원), '최근 12개월 기도 횟수' 막대 그래프와 범위 드롭다운, 하단 내비게이션.
