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
- `avatar`: `{skin:0..3, style:0..3, hair:0..9, outfit:0..11, name:0..99, g:0..1}` — `g`는 성별(0 여성, 1 남성, **추가 필드**), `style`은 성별마다 따로 해석하는 머리 모양 0..3, `name`은 **성별 `g`별 세례명 목록 안의 인덱스**(아래 4절). `g`가 없으면(옛 클라이언트) 옛 형식으로 보고 `name`은 0..39(옛 목록 인덱스)만 허용하며, 서버는 그 값을 그대로 중계하고 받는 클라이언트가 옮겨 읽는다. `g`가 0/1이 아니면 거부(`bad_msg`).
- 상태 `st`: `'w'`(서 있음/걷기) | `'s'`(앉음) | `'p'`(앉아서 기도 중).
- `ms`: 0..3 — 기도 중인 신비 묵주기도 종류(환희, 빛, 고통, 영광), 기도 중이 아니면 -1.
- `e`(이모트): 0 인사(손 흔들기), 1 성호경, 2 고개 숙임.
- `intention`: 0..7 (5절 프리셋).
- 위치 `x ∈ [-12,12]`, `z ∈ [-20,20]`, `r`(yaw 라디안) ∈ [-4π, 4π].

### 클라이언트 → 서버
```json
{"t":"hello","id":"<uuid>","v":1,"avatar":{"skin":1,"style":0,"hair":3,"outfit":5,"name":7,"g":0}}
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
{"e":"near","seat":"L03-2"|null,"candle":5|null,"station":"altar"|"font"|null}   // 가장 가까운 앉을 수 있는(비어 있고 반경 1.3m) 좌석, 반경 1.8m 안 촛불 슬롯, 제대 앞/성수대에 서 있는지(들어갈 때 1.3m, 나갈 때 2.0m). 값이 바뀔 때만
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
- **성별** `g`: 0 여성, 1 남성(아바타 체형·머리 모양·세례명 목록이 성별에 따라 달라진다).
- **세례명 목록**(이 순서 고정, 앞쪽일수록 많이 쓰는 이름): 성별별로 따로 있고 와이어의 `name`은 그 성별 목록 안의 인덱스다. 상한은 서버 `NAME_MAX = 99`(= Flutter `baptismalNameMaxIndex`)이고 각 목록은 100개 이하다. 정의는 `lib/church/church_constants.dart`의 `femaleBaptismalNames`(65개: 마리아, 안나, 엘리사벳, 데레사, 아녜스, 루치아, 마르타, 클라라, 카타리나, 체칠리아, 비비안나, 율리안나, …)와 `maleBaptismalNames`(71개: 요셉, 베드로, 바오로, 요한, 안드레아, 토마스, 프란치스코, 미카엘, 가브리엘, 라파엘, 스테파노, 마르코, …)이며 웹 `palette.js`의 `namesF`/`namesM`이 같은 값이다(테스트가 일치를 확인). 목록을 늘릴 때는 뒤에만 추가한다(기존 인덱스 불변).
- **옛 형식 호환**: `g`가 없는 값(옛 앱·옛 저장값)의 `name`은 옛 40개 목록(`legacyBaptismalNames` / `palette.js`의 `namesLegacy`: 0..19 여성 이름, 20..39 남성 이름)의 인덱스다. 읽을 때(Flutter `AvatarConfig.fromJson`, 웹 `ChurchAvatar.normalizeCfg`) 20 이상이면 남성으로 보고 같은 이름을 새 목록에서 찾으며, 옛 머리 모양(짧은 머리·단발·올림머리·곱슬)은 여성 [0,0,3,1], 남성 [1,0,0,2]로 옮긴다. 새 앱이 보내는 값에는 항상 `g`가 있다. 한계: 옛 앱은 `g`와 `name > 39`를 모르므로 새 앱 사용자의 이름표가 맞지 않게 보일 수 있고(옛 앱의 고정 40개 목록 기준), 서버가 새 검증으로 배포되기 전에는 새 앱의 `hello`가 거부된다 → **서버를 먼저 배포**한다.
- 피부색 4, 머리색 10, 옷색 12 — 색상표는 `assets/church/palette.js`(웹)와 `lib/church/avatar/avatar_config.dart`(Flutter)가 **같은 HEX 값**을 가진다.
- **머리 모양**(`style` 0..3, 성별별): 여성 단발, 어깨 길이, 포니테일, 낮은 쪽머리 / 남성 짧게 친 머리, 가르마, 웨이브, 넓은 이마(이마 선이 물러난 모양). 모두 매끈한 클레이 질감의 차분한 실제 머리 모양이다(`palette.js`의 `stylesF`/`stylesM`). 3D는 `avatar.js`(머리 껍질 + 작은 덩어리), 2D 미리보기는 `avatar_preview.dart`가 같은 비율로 그린다.
- **체형**: 성별에 따라 어깨·가슴·허리·엉덩이 폭, 팔·다리 굵기, 턱선, 목 굵기, 눈썹 굵기만 조금 다르다(스케일만; 키·뼈 길이·좌석/기도 포즈는 같음). 삼각형 예산(근접 ≤6000, 중간 ≤1500, 원거리 ≤400)은 8가지 성별×머리 조합 모두에 적용된다(`ChurchAvatar.stats()`의 `g<성별>s<모양>`).
- 촛불 지향 프리셋(인덱스 0..7): 가족과 이웃을 위해, 아픈 이들을 위해, 세상의 평화를 위해, 돌아가신 이들을 위해, 감사의 마음으로, 시험과 일을 위해, 통회와 용서를 위해, 나라와 교회를 위해.

## 5. Flutter 구조 (lib/church/)
- `avatar/avatar_config.dart`, `avatar/avatar_editor_screen.dart`(첫 입장 설정과 편집 화면을 겸함), `avatar/avatar_pickers.dart`(성별·머리 모양·색·세례명 고르기 위젯), `avatar/avatar_preview.dart`(2D CustomPaint 미리보기), `net/church_net.dart`(인터페이스·이벤트), `net/web_socket_church_net.dart`, `net/solo_church_net.dart`, `church_constants.dart`(세례명·지향 목록·좌석 id 규칙·ChurchConfig.serverUrl), 설정 필드는 `lib/app/settings.dart`에 추가.
- `church_screen.dart`(WebView + HUD), `church_scene_controller.dart`(브리지 추상화 + WebView 구현 + 테스트용 가짜), `church_hud.dart`, `church_prayer_card.dart`.
- 앱 셸에 4번째 목적지 '성당'(`Icons.church`) 추가.
- **첫 입장 설정**(`churchAvatarChosen`이 false일 때): 장면을 불러오는 동안 전체 화면 한 페이지 '처음 오셨네요'를 먼저 보여 준다. 성별(여성/남성 큰 선택, 무작위로 미리 선택), 머리 모양 4칩(작은 얼굴 그림), 머리색·피부색, 세례명(큰 칩 + '바꾸기' → 검색·인기 12개·가나다순 목록 시트, 성별 목록만, 한 번 누르면 선택), '성당 들어가기'(56dp) 한 번으로 시작한다. 성별을 바꾸면 세례명은 새 목록에 같은 이름이 있으면 유지하고 없으면 가장 인기 있는 이름으로 바꾼다. 확인하면 저장 후 `init`/`hello`가 나가고, 뒤로 가면 성당 선택 화면으로 돌아간다(O-02의 무작위 세례명·스낵바는 없어졌다). HUD의 얼굴 버튼은 같은 화면에 옷 색과 '무작위'가 더 붙은 편집 화면을 연다.

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

---
# v3: 이용 제한 해제 (사용자 결정: "독서공방과 다르게 제한 두는 건 다 없애, 그럴 필요 없어")
이 절이 위 내용과 충돌하면 **v3이 우선**한다. 사용자가 느끼는 이용 제한은 두지 않는다. 부정 사용·서버 보호용 내부 장치만 남기고, 남기는 것은 사용자에게 보이지 않게 한다.

## 15. 없애는 제한
- **방 인원**: 성당당 방 하나(`<churchId>-1`)에 모두 들어온다. 사용자에게 보이는 인원 상한과 `full`/`next` 이동은 쓰지 않는다(프로토콜 필드는 호환을 위해 남기되 서버는 보내지 않는다). 서버 내부 안전 상한은 2000. 많은 인원에서도 서버와 클라이언트가 버티도록 **관심 영역(AOI) 필터**를 둔다: `snap`/`join`에는 각 수신자 기준 반경 40m 안의 피어만 포함하고(앉은 피어와 가까운 피어 우선), 멀어지면 `leave`가 아니라 보이지 않게만 한다(수신자별 가시 집합을 서버가 관리). `n`(전체 인원수)은 항상 정확히 보낸다. 클라이언트는 화면에 보이는 아바타를 가까운 순 최대 80명으로 그린다(렌더링 성능용, 사용자 제한 아님).
- **자리 유지 시간**: 90분 자동 일어나기 삭제. 연결이 끊기면 그때만 자리가 비워진다.
- **촛불**: 30분 만료 삭제. 켠 촛불은 계속 켜져 있다(`until: 0`은 만료 없음). 서버가 Durable Object 저장소에 보존한다. 스탠드의 슬롯은 24개에서 96개로 늘리고, 꽉 차면 가장 오래된 초가 자연스럽게 꺼진다(사용자에게 거절 메시지를 보이지 않는다). 한 사람이 켤 수 있는 초 개수 제한 없음.
- **이모트 쿨다운**(1.5초) 삭제. 메시지 수신 속도 제한은 초당 12개에서 초당 40개로 완화(서버 보호용으로만).
- **앉기 거리**: 서버 'far' 허용 거리를 3m에서 8m로 완화(사용자가 앉기를 눌렀는데 거절되는 일을 없앰), 촛불 허용 거리도 reach+1.2m에서 reach+5m로 완화.
- **앱**: 촛불 만료 표시, '곧 꺼집니다' 같은 문구, 좌석 대기·제한 안내가 있다면 삭제. 기도 시간 상한(통계의 3분 간격 상한은 통계 계산용이라 유지).

## 16. 남기는 장치(제한이 아니라 안전장치)
- 위치 경계 클램프(벽), 최대 이동 속도 검증(클라이언트 최대 속도의 2배 이상), 한 사람 한 좌석(물리적 의미), 좌석 중복 점유 방지, 값 범위 검증(인덱스·좌표), 서버 안전 상한 2000, 로그인과 동의.
- **자유 입력(닉네임·채팅)은 이번 요청 범위에 넣지 않는다.** 이는 이용 제한이 아니라 신고·차단·운영 책임이 따르는 기능이라 사용자의 별도 결정이 필요하다.

---
# v4: 가서 행동하기 (InPeace 식 스테이션)
사용자 요청: 촛불 봉헌 같은 동작은 성당 안 **그 자리에 직접 가서** 한다. 구현은 `assets/church/stations.js`(순수 로직, `tools/church_web/stations.test.mjs`가 8개 성당 전부 시험), `markers.js`(표식), `main.js`(걷기), Flutter `church_go_sheet.dart`.

## 18. 스테이션 (빌더를 고치지 않고 레이아웃·충돌체에서 일반적으로 유도)
- `candle[i]` = `layout.candles.stands[i]`. 서는 자리는 스탠드 `face` 쪽(걸을 수 있는 쪽) 0.6~1.6m, 충돌 없음·입구에서 닿음·`reach` 안에 슬롯이 있는 자리 중 스탠드 정면에 가장 가까운 곳.
- `altar` = 신랑 축(좌석 `yaw` 방향 평균, 입구 스폰에서 출발)을 따라 걸을 수 있는 한 가장 멀리 간 지점(제대·난간·발다키노 바로 앞). 축이 전체의 30%도 못 가서 막히면 축 좌우 1.2m 띠에서 가장 먼 닿는 칸. 바라보는 방향은 좌석 방향. 이 규칙으로 8개 성당 모두 제대(또는 성소 단) 앞에 선다. `layout.stations.altar:{x,z}`로 직접 지정할 수도 있다.
- `entrance` = `layout.spawn`. `seat` = 비어 있는 좌석 중 걷는 거리가 가장 짧은 곳의 `standPos`(좌석 뒤 통로).
- `font[i]` = `layout.fonts:[{x,z,face?,reach?}]`가 있을 때만(성수대). 현재 8개 성당 레이아웃에는 없다.
- 경로: 충돌체(`moveCircle`과 같은 것)로 만든 걷기 격자(칸 0.5m, 막히면 0.25m로 재시도) 위 A* + 직선 시야 단순화. 걷기는 평소 속도·걷기 동작이며 1초에 0.15m도 못 가면 두 번까지 길을 다시 찾고, 그래도 안 되면 `walkFail`.

## 19. 브리지 추가
웹 → Flutter:
```
{"e":"stations","church":"basic","candle":1,"altar":1,"font":0,"entrance":1}   // 성당을 불러온 뒤 한 번
{"e":"walkStart","kind":"candle","m":23}                                      // 경로 길이(m, 반올림)
{"e":"walkDone","kind":"candle","index":0,"seat":null}                        // 도착(직전에 near 가 먼저 온다). seat 는 kind=seat 일 때 좌석 id
{"e":"walkFail","kind":"font","why":"none|nopath|stuck"}
{"e":"walkCancel","kind":"candle","why":"input|touch|sit|api"}               // 스틱·키보드·이동 영역 터치·앉기·cancelWalk
```
Flutter → 웹:
```
walkTo({kind:'candle'|'altar'|'seat'|'entrance'|'font', index?, seat?})   // index: 스탠드/성수대 번호(생략 시 걷기 가까운 쪽), seat: 특정 좌석(차 있으면 가까운 빈 자리)
cancelWalk({})
tapAt({x,y})     // 화면 좌표(CSS px). Flutter 가 가로챈 왼쪽 절반의 탭을 넘긴다. 표식에 맞으면 그곳으로 걷는다.
```
- 앉아 있을 때 `walkTo`를 부르면 먼저 일어선 뒤(`stood`) 걷는다. 걷는 중 `sit`을 부르면 걷기가 취소된다.
- 표식(바닥의 빛 고리 + 떠 있는 이름표)은 도달 범위 안에서는 사라지고, 앉으면 모두 숨는다. 터치 판·이름표·고리를 레이캐스트하고, 못 맞히면 화면에서 36px 안의 표식을 고른다. `?markers=0`으로 끌 수 있다(썸네일은 자동으로 끔).
- Flutter: 오른쪽 위 줄 아래의 **가기** 버튼 → '어디로 갈까요?' 시트(촛불 봉헌대·제대 앞·가까운 빈 자리·입구, 성수대는 `stations.font>0`일 때만) → `walkTo`. 걷는 동안 '걷는 중… (취소)' 칩, 실패하면 스낵바. 이동 영역에 손이 닿으면 걷기를 취소한다(`cancelWalk`).
- **행동은 그 자리에서만**: 초 켜기는 `near.candle`이 있을 때만 버튼이 나오고(그 밖의 경로 없음, 시험으로 고정), 촛불 봉헌대에 도착(`walkDone candle`)하면 봉헌 시트가 한 번 저절로 열리며 '나중에'로 닫을 수 있다. 제대 앞(`near.station=altar`)에는 '기도하기'(고개 숙임 `emote 2`) 뒤 앉기가, 성수대(`font`)에는 '성호 긋기'(`emote 1`)가 나온다. 성사 흉내는 없다.
- 분석: `church_gesture{church,e}` — 이모트는 `e`=0..2, 걷기 도착은 `e='walk_<kind>'`.
- 첫 방문 안내: 첫 입장 뒤 6초 동안 '가기 버튼으로 …' 말풍선(처음 쓰면 바로 사라짐). `SharedPreferences` 키 `church_walk_hint_seen`.


## 20. 카메라: 천장 올려다보기 (`ctl.look`)

- 오른쪽(시점) 끌기에서 위로 끌어 피치가 최소(0.06rad)에 닿으면, 남는 양이 `ctl.look`(라디안, 0..1.35≈77°)에 쌓인다. 아래로 끌면 `look`을 먼저 줄이고 0이 된 뒤에야 피치가 올라간다. 끌기 감도는 피치와 같다(0.004rad/px).
- `main.js` `updateCamera`: 카메라 위치는 그대로(벽 안으로 들어가지 않음), 바라보는 점만 아바타 → '카메라 앞 20m, 고도각 look' 쪽으로 섞는다(look 0.2rad 에서 완전히 시선 쪽). 상한 77°라 시선이 뒤로 넘어가 뒤집히지 않는다. 걷기(속도 > 0.6m/s, 끌지 않을 때)를 시작하면 1.2rad/s 로 0 까지 줄어든다.
- URL `look=<도>`(시험용, 0..77로 자름). 피렌체 돔 기울기 훅(`ch_florence.js`)은 `look` 이 커질수록 기울기를 1-look/1.0 배로 양보한다(전체 시선 고도가 look 에 대해 항상 단조 증가).
- 시험: `e2e.mjs` 의 look-up 항목(포인터 이벤트로 누적·감소·상한·걷기 감쇠).

## 21. 깜빡임(z-fighting) 회귀 검사

- 원인 기록(라테라노 '벽에서 계속 깜빡임'): `high` 화질의 SSAOPass 가 장면을 자기 `beautyRenderTarget` 에 다시 그리는데, 이 타깃엔 깊이 텍스처가 없어 three r149 가 16비트 깊이 버퍼를 잡았다. near 0.3 에서 10m 거리 깊이 해상도 ≈5mm, 30m ≈5cm 라 벽 위 프레스코·판이 벽과 같은 깊이로 뭉개져 카메라가 조금만 움직여도 줄무늬로 깜빡였다. `render.js` 에서 32비트 깊이 텍스처를 붙여 고쳤다.
- 새 판·장식은 바탕 면과 **같은 평면에 두지 않는다**(최소 1.5cm 앞, 또는 실제로 파낸 벽감).
- `node tools/church_web/flicker.mjs [id ...]`(기본 lateran stpeter, 수 분 걸려 `node --test` 밖): 카메라 고정, 프레임마다 depthFunc Less↔LessEqual 을 바꿔 같은 깊이로 뭉개진 면을 드러낸다. 32×32 블록 평균 차이 > 2.0 이면 실패.

---
# G1: 스테인드글라스 감상 모드 (GLASS_APP_PLAN §3·§4, 과제 G-04·G-05·G-07·G-08·G-11)
창에 대해서는 이 절과 `docs/ux/GLASS_APP_PLAN.md`가 §13("사진·이미지는 쓰지 않는다")보다 우선한다. 구현: `assets/church/glass_math.js`(순수 계산), `glass_view.js`(감상 모드), `ch_glass.js`(감상실), `render.js`(프로필), `main.js`(그리기 고리), `controls.js`(제스처).

## 22. 감상 브리지
Flutter → 웹:
```
viewWindow({win:'<카탈로그 id>', mode:'room'|'church', tier:'t1'|'t2', light:'ref'|'sun'|'night', hour?, base?})
   // mode 'room'(기본) = 감상실 장면(church id 'glass_room')을 그 창 크기로 지어 들어간다. 이미 감상 중이면 창만 바꾼다(방을 새 크기로 다시 짓는다).
   // mode 'church' = 지금 성당에서 내 앞쪽의 가장 가까운 창 자리(빌더의 ctx.window/ctx.rose)에 그 사진 창을 비율 그대로(contain) 끼우고 활강한다.
   //                 앞쪽에 창 자리가 없거나 init 전이면 'room' 으로 간다. (G1 선택 항목: 기본 동작만, 창 자리별 실제 배치표는 G-29)
   // tier: 't2'(기본) = t1 을 먼저 보이고 t2 가 오면 0.25초 교차 페이드. maxTextureSize < 2048 또는 deviceMemory < 2GB 면 t1 로 내린다. T3 는 G2.
   // light 기본 'ref'. hour 0..24(sun 일 때 해 위치). base: 질감·카탈로그를 읽을 URL 접두사(G-03 루프백 서버 'http://127.0.0.1:<port>/<token>/').
   // init 전에 불러도 된다(감상실로 바로 시작, 성당을 짓지 않는다).
endView({})                           // 감상을 끝내고 들어오기 전 장면·자리·카메라로 돌아간다(앉아 있었으면 같은 좌석). 바로 감상으로 열었으면 그리지 않고 쉰다.
setViewLight({light, hour?})          // 'ref' | 'sun' | 'night'
setViewTier({tier})                   // 't1' | 't2' (교차 페이드)
resetView({})                         // 처음 구도로 0.4초 복귀(두 번 탭과 같음)
```
웹 → Flutter (`FlutterChurch`, 다른 이벤트와 같은 JSON):
```
{"e":"viewReady","win":"rose_chartres_north","tier":"t1","ms":420}   // 그 창 질감으로 그린 첫 프레임. tier = 그때 보인 단계(t2 는 뒤이어 페이드), ms = viewWindow 부터
{"e":"viewEnd","win":"...","seconds":63,"zoomMax":3.2,"panned":true}  // seconds = viewReady 부터 endView 까지, zoomMax = 도달한 최대 배율(소수 1자리)
{"e":"viewError","win":"...","reason":"texture"|"webgl"|"memory"|"unknown"}
   // texture: 그림/팩/카탈로그를 못 읽음·교차 출처로 막힘, webgl: 렌더러 없음·문맥 잃음, memory: 질감 업로드 OUT_OF_MEMORY, unknown: id 형식이 틀리거나 카탈로그에 없음
{"e":"viewPerf","win":"...","fps":58,"texMb":17.1}                   // 감상 중 5초마다. fps = 실제로 그린 시간 동안의 평균(멈춰 있으면 0), texMb = 올라간 창 질감(밉맵 포함 추정)
{"e":"viewGesture","kind":"zoom"|"pan"|"reset"}                      // 종류마다 1.5초에 한 번까지
```
- 질감 위치: http(s) 또는 `base` 가 있으면 `glass_<id>_1k.webp`(t1)·`_2k.webp`(t2)와 `glass_catalog.json`을 직접 읽는다(교차 출처면 CORS 필요, 2D 캔버스로 오염 여부를 먼저 본다). **file:// WebView 에서는** WebGL 이 같은 폴더의 그림도 교차 출처로 거부하고 fetch/XHR 도 막히므로 `gpack_<id>_<1k|2k>.js`(data URI)·`glass_catalog.js`를 `<script>` 로 읽는다. 둘 다 `node tools/church_web/build_glasspack.mjs` 가 만든다(약 72MB, 카탈로그·webp 를 바꾸면 다시 실행).
- 메모리: 창 질감은 동시에 최대 2장(페이드 중 t1+t2). 새 창·`endView` 때 모두 해제한다. `__church.view.debug().stats` = `{created, disposed, resident, peak, texMb, loads, errors, frames}`.
- 감상 중 Flutter 는 왼쪽 절반 조이스틱 가로채기를 끄고 모든 터치를 웹으로 넘긴다(웹 `ctl.viewMode`: 한 손가락 = 이동(확대했을 때만), 두 손가락 = 확대, 두 번 탭 = 복귀). 아바타·이름표·표식은 숨고, `tapAt`·`setJoystick`은 무시된다. 감상실은 실시간 서버에 붙지 않는다(Flutter 는 감상실에 대해 방 연결을 만들지 않는다).

## 23. 감상 카메라와 그리기
- 활강: 들어갈 때 0.9초 ease-in-out(창을 바꿀 때 0.54초)으로 창 중심 법선 위 수평·정면 자리로 간다. 세로 시야각 35°(망원), 창 외곽이 화면의 84% 안에 들어가는 거리(`frameDistance`). 굴림·기울기 없음.
- 확대 1배~상한: 상한 = min(8, 질감 1텍셀이 CSS 2px 이 되는 배율)(`zoomMax`). 확대는 시야각으로 한다(tan 비율, 원근 불변). 핀치 중심 아래 점이 고정된다. 이동은 확대했을 때만, 화면 가장자리가 창 외곽+4%를 넘지 않게. 두 번 탭/`resetView` = 0.4초 복귀.
- 필요할 때만 그린다: 입력·활강·페이드·빛 바꾸기·질감 도착 때만 프레임을 그리고, 할 일이 없으면 rAF 를 멈춘다(`main.js` `kick()` 이 다시 깨운다). 감상 중 자동 화질 하향은 끈다. 화소 비율은 기기값(최대 3, low 1.5)까지.

## 24. 색 프로필(G-04)과 창 재질(G-05)
- `render.js` 최종 패스: **'walk'**(성당 걷기) = 예전과 같은 채도 0.94·난색 +3%·비네트 0.16 + ACES(three r149 와 같은 식, 성당 모습 불변). **'view'**(감상) = 보정 없음(채도 1·난색 0·비네트 0) + **Khronos PBR Neutral**(색상각 보존), SSAO 끔(유리·창틀이 어두워지지 않고 8비트 beauty 타깃도 피한다), 블룸은 'sun' 에서만(문턱 1.6 = 유리 알베도 범위 위의 HDR, 강도 0.15, 반경 0.4). low 화질(후처리 없음)은 three `CustomToneMapping` 을 Neutral 로 바꿔 같은 프로필을 쓴다. 전환: `R.setProfile('view'|'walk', {bloom})`(GlassView 가 부른다).
- **사진 창 화소는 어느 프로필에서도 보정·톤매핑을 건너뛴다**: 유리 셰이더가 알파 0(덮임 비율만큼)을 쓰고, 최종 패스가 `mix(톤매핑(장면), 유리곡선(c), 1-alpha)`로 고른다. 유리곡선 = 최댓값 ≤ 1.0 이면 항등(기준광에서 화면 값 = 사진 값), 넘치면(햇빛) 색상각을 지키며 흰색 쪽으로 누른다. PBR Neutral 자체는 0.04 를 빼는 발끝(유전체 반사 4% 보정)이 있어 발광 유리의 중간톤을 ΔE≈4 어둡게 하므로 유리에는 쓰지 않는다. 기존 절차적 창(`ctx.mats.glass`)은 그대로(알파 1, 걷기 모습 불변).
- 창 판: `ShaderMaterial`, draw call 1. 질감 sRGB(`sRGBEncoding`, WebGL2 는 하드웨어 디코드, WebGL1 은 셰이더 디코드), 밉맵 + `LinearMipmapLinear` + 최대 이방성 + 밉 LOD 치우침 -0.5(삼선형은 이상적 면적 평균보다 흐려 장미창 같은 고운 납선의 블록 ΔE 를 키운다; 시험용 `?lodbias=`), ClampToEdge. 출력 = `tex.rgb(선형) × 투과량 × 색조 (+ 밤 반사)`. 조명·안개·SSAO·그림자·AO 데칼 없음(`fog:false, lights:false, toneMapped:false, noAO`). 윤곽 = 알파 0.5 등고선을 `fwidth` 로 1px 부드럽게(반투명 정렬 문제 없이 depthWrite, 절차적 변주 없음 — `glass.test.mjs` 가 셰이더에 rand/noise/sin/time 이 없음을 고정).
- 크기: 판 모양은 언제나 사진 비율(`aspect_w_over_h`). 크기 = 카탈로그 `real_size_m`(둘 다 알면 높이 기준, 하나만 알면 비율로), 모르면 형태별 기본값(장미 8m, 원형 3.5m, 랜싯 6m/다연창 8m/반원 4.5m, 패널 1.2m, 부분 2.4m)으로 `est`.
- 둘레: 개구부 뒤 돌판 위에 흐린 밉(bias 7.5)으로 읽은 창 색의 빛 번짐(기준광 0.10, 햇빛 0.06~0.16 × 투과량) + 윤곽 바로 바깥의 얇은 그늘(창틀). 개구부 테두리 돌 띠.
- 빛 상태(`lightState`): **ref** = 투과 1.0·색조 1·바닥 색빛 없음·반사 없음. **sun** = 해 고도·방위(world.js 와 같은 경로, 창은 동쪽 벽)로 투과 0.15~1.55배, 정면 햇빛이면 창 모양 바닥 색빛(창 질감 96px 흐림, 태양 방향으로 바닥에 투영한 가산 사각형), 낮은 해는 호박색, 등지면 약간 차가운 색. **night** = 투과 0.04 + 아주 약한 따뜻한 반사, 촛대 2개의 불꽃·촛불빛.

## 25. 감상실 `ch_glass.js` (church id `glass_room`)
- `ChurchBuilders['glass_room']`(`viewing:true`), 레이아웃은 `ChurchLayouts` 에 등록하지 않는다(서버 `layouts.json`·레이아웃/스테이션 시험·썸네일 대상 아님). 좌석·촛불대·스테이션·표식·군중 없음.
- 창을 실제 크기로 동쪽 벽(-z, 실내 방향 +z)에 끼운다: 개구부 = 창 외곽 + 여백(긴 변의 6%, 0.12~0.6m), 깊이 0.25~0.7m 의 돌 뒤판, 판은 뒤판 앞 1.2cm. 창 중심 높이: 2.6m 이하 창은 눈높이(1.55m) 근처, 큰 창은 바닥에서 0.9m. 방 폭·높이·깊이는 창 크기와 세로 화면(비율 0.42)에서의 구도 거리로 정한다(큰 장미창이면 50m 넘게 깊어진다).
- 돌은 따뜻한 회색(`stone_grey` 사진 질감, 채도 낮게, 창보다 어둡게), 반사 바닥 없음, 그림자·안개·먼지·빛줄기 끔(`world.setViewMode(true)`). 실내 조명은 `ctx.envOverride` 로 빛 상태별로 정한다(해 직사광 없음, 부드러운 반구광 + 창에서 나오는 약한 점광, 밤은 촛불).
- 빌더 도구 추가: `ctx.envOverride(fn(env,hour))`, `ctx.setViewSlot({x,y,z,nx,nz,w,h,depth,backZ,open})`, `ctx.view`(GlassView 매개변수). 월드: `world.setViewMode(on)`, `world.viewSlot`, `world.windowSlots()`.

## 26. 시험
- `node --test "tools/church_web/*.test.mjs"` — `glass.test.mjs`(카탈로그 조회·크기 추정·구도·확대/이동 한계·단계 선택·색 함수·CIEDE2000(Sharma 자료)·빛 상태·셰이더에 변주 없음).
- `node tools/church_web/glasscolor.mjs`(수 분, `node --test` 밖) — (1) 색: 기준광 정면 t2 렌더를 마스터 사진(4096, 선형 빛 area 축소)과 4×4 블록으로 비교, 윤곽 안쪽 블록의 ΔE2000 중앙값 ≤ 1.5·p95 ≤ 4.0·C*>20 블록 평균 색상각 이동 ≤ 2°. **재는 것은 '렌더 파이프라인이 사진 값을 바꾸지 않는가'이지 실제 유리 색이 아니다**(리샘플링 차이 포함, SwiftShader 기준). (2) 감상실 깜박임(정지 카메라 10프레임, depthFunc 교대, 32×32 블록 ≤ 2.0). (3) 윤곽 IoU ≥ 0.98(장미·랜싯·원형창) + 화면 비율 오차 ≤ 1%. (4) 창 30개 연속 열기에서 동시 질감 ≤ 2장, 끝나면 0장.
