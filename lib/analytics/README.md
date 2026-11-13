# 사용 분석 · 오류 보고 · 기도 기록 동기화 연결 안내 (A3)

`lib/analytics/*`, `lib/sync/*`가 이 문서의 대상이다. 이 파일들은 `lib/auth/`를 **import하지 않는다**. 동의는 `ConsentGate`(`bool Function(String kind)`), 서버 접근은 `EventUploader`로 주입한다. 리더가 `main.dart` 등에 한 번에 연결한다.

## 0. 개인정보 최소화 장치 (코드와 테스트로 강제)

이벤트는 로그인 계정에 묶이므로 식별 가능 정보로 취급한다.

| # | 장치 | 위치 / 테스트 |
|---|------|---------------|
| 1 | 이벤트 `props`에는 이메일, 공급자 사용자 id, 다른 사람의 id가 **들어갈 수 없다**. `user_id`는 서버 업로더가 현재 로그인 사용자로 채운다(`SupabaseEventUploader`). 값이 이메일·UUID·URL·전화번호처럼 보이면 버린다. `session_id`(앱 실행마다 새 UUID)만 예외이며 속성이 아니라 행의 별도 열이다. | `PropsSanitizer`, `Redactor.looksIdentifying`. `analytics_sanitizer_test.dart` |
| 2 | 광고 ID, 정확한 위치, IP는 코드에 없다. `devices` 행은 `device_id`(무작위 UUID, `device_id_v1`), `model`, `os`, `app_version`, `locale` 다섯 개뿐이다. | `DeviceReporter`. `analytics_device_test.dart` (행 전체를 `equals`로 비교) |
| 3 | 속성 키는 **이벤트별 허용 목록**(SPEC §4)만 통과한다. 목록 밖 키는 조용히 버려지고, `intention/text/note/name/email/user_id/id/phone/url/lat/lng/ip/ad_id` 등은 어떤 이벤트에서도 금지다. 값은 영문·숫자·`_`·`-` 40자 이하 문자열, bool, 유한한 수(절댓값 10억 미만)만. 중첩 값·자유 문장·한글은 버림. 전체 JSON 2KB 이하. | `AnalyticsEvents.specs`, `PropsSanitizer`. `analytics_sanitizer_test.dart` |
| 4 | 로그는 이벤트 **이름만** 출력한다(`analytics: stats_open`). 속성·사용자 id는 출력하지 않는다. | `analytics_core_test.dart` "debug logs print event names only" |
| 5 | 오류 문구는 기기 경로(`<path>/파일명`), 6자리 이상 숫자열, 이메일, URL, UUID, 32자 이상 토큰을 가린 뒤 200/1000자로 자른다. | `Redactor`, `ErrorReporter`. `analytics_error_reporter_test.dart` |
| 6 | 동의가 꺼진 범주는 `track` 시점에 버리고, 올리기 직전에도 다시 확인해 버린다. 철회하면 `purgeCategory`로 큐를 비운다. 로그아웃/사용자 변경 시 올라가지 않은 이벤트는 모두 버린다. 저장된 큐가 다른 사용자의 것이면 시작 때 버린다. | `analytics_core_test.dart` |

## 1. `main()` 초기화

`lib/main.dart`에서 (A2의 `AuthBootstrap.init()` 이후, `runApp` 이전). `auth`는 `AuthService`, `consent`는 `ConsentStore`, `stats`는 `PrayerStatsStore.load()` 결과라고 가정한다.

```dart
import 'package:package_info_plus/package_info_plus.dart';
import 'analytics/analytics.dart';
import 'analytics/analytics_observer.dart';
import 'analytics/device_reporter.dart';
import 'analytics/error_reporter.dart';
import 'analytics/supabase_event_uploader.dart';
import 'sync/prayer_sync.dart';

// ... AuthBootstrap.init(), auth/consent/stats 준비 후 ...
Future<void> _startAnalytics({
  required AuthService auth,
  required ConsentStore consent,
  required PrayerStatsStore stats,
}) async {
  if (!BackendConfig.isConfigured) return; // 설정 없으면 아무것도 올리지 않는다(SPEC §0)

  final uploader = SupabaseEventUploader();
  bool gate(String kind) => consent.has(kind); // ConsentGate
  final pkg = await PackageInfo.fromPlatform();

  await Analytics.init(
    uploader: uploader,
    consent: gate,
    userId: auth.current.userId, // 로그인 전이면 null: 기록 안 함
    appVersion: '${pkg.version}+${pkg.buildNumber}',
    // platform은 생략하면 iOS면 'ios', 그 외 'android'
  );

  // 로그인 사용자가 바뀌면(로그인/로그아웃) 큐를 비우고 새 사용자에게 app_open 기록.
  auth.state.addListener(() => Analytics.instance.setUserId(auth.current.userId));

  // 동의 변경: 철회하면 그 범주의 대기 이벤트를 즉시 버린다.
  consent.changes.listen((c) {
    if (!c.granted) Analytics.instance.purgeCategory(c.kind); // sync는 무시됨
    Analytics.instance.track('consent_change', {
      'kind': c.kind,
      'granted': c.granted,
    }); // usage 동의가 꺼져 있으면 자동으로 버려진다
  });

  // 처리되지 않은 오류(diagnostics 동의가 켜져 있을 때만 전송). 기존 핸들러에 이어 붙는다.
  ErrorReporter.install(consent: gate);

  // 기기 정보: 앱 시작 때 한 번. 동의가 나중에 켜지면 다시 호출한다(아래 참고).
  Future<void> reportDevice() => DeviceReporter.report(
    uploader: uploader,
    consent: gate,
    deviceIdStore: PrefsDeviceIdStore(),
  );
  unawaited(reportDevice());
  consent.addListener(() => unawaited(reportDevice())); // 이미 올렸으면 아무 일 없음

  // 기도 기록 동기화(섹션 5 참고).
  final sync = PrayerSync(
    uploader: uploader,
    consent: gate,
    store: PrayerStatsStoreRepository(stats),
    userId: () => auth.current.userId,
  )..start();
  unawaited(sync.syncNow());
  auth.state.addListener(() => unawaited(sync.syncNow())); // 로그인 직후
  consent.addListener(() => unawaited(sync.syncNow())); // sync 동의를 켠 직후
}
```

- 로그인 성공 직후 `Analytics.instance.track('login_success', {'provider': 'kakao'})`(공급자 id: `kakao|google|apple|email`, `LoginProvider.id`)를 A2 코드의 로그인 완료 지점(또는 위 `auth.state` 리스너에서 `signedIn`이 되었을 때 한 번)에서 호출한다. 공급자의 사용자 id나 이메일은 넘기지 않는다.
- `Analytics.instance`는 초기화 전에는 아무것도 하지 않는 객체라서, 설정이 없는 개발 빌드에서도 `track` 호출이 안전하다.
- 앱이 백그라운드로 갈 때의 `flush()`는 `Analytics.init`이 `WidgetsBindingObserver`로 알아서 등록한다.

## 2. 화면 전환: `navigatorObservers`

`lib/app/app.dart`의 `MaterialApp`에 한 줄.

```dart
MaterialApp(
  navigatorObservers: [AnalyticsObserver()],
  // ...
)
```

`AnalyticsObserver`는 **이름이 있는 `PageRoute`만** 기록한다. 지금 코드의 `MaterialPageRoute`에는 이름이 없으므로 이름을 붙인다(소문자 영문 id).

```dart
// home_screen.dart `_startPrayer`
MaterialPageRoute<void>(
  settings: const RouteSettings(name: 'prayer'),
  builder: (_) => PrayerScreen(...),
)
// settings_screen.dart 선창 녹음 관리 (SPEC에 없는 화면 이름도 소문자 id면 된다)
MaterialPageRoute<void>(
  settings: const RouteSettings(name: 'leader_record'),
  builder: (_) => LeaderRecordScreen(...),
)
// A2의 계정 화면, 약관 화면을 push하는 곳
settings: const RouteSettings(name: 'account'),   // 'legal' 등
```

`'/'`는 `home`으로 기록된다. 다이얼로그·바텀시트(`PopupRoute`)는 무시된다.

**하단 탭은 라우트가 아니다**(`AppShell`의 `IndexedStack`). `_AppShellState._select`에서 직접 기록한다.

```dart
// app_shell.dart
static const _screenIds = ['home', 'rosary_styles', 'settings', 'church_select'];

void _select(int i) {
  if (i == _index) return;
  setState(() => _index = i);
  // 성당 탭의 실제 화면(church_select/church)은 church_tab.dart 에서 기록한다(아래 3절).
  if (i != _church) Analytics.instance.screen(_screenIds[i]);
}
```

앱을 처음 켤 때 첫 화면 `home`은 `'/'` 라우트의 `didPush`로 기록된다.

## 3. `track` 호출 위치 (SPEC §4 전부)

모든 호출은 `Analytics.instance.track('이름', {속성})`. 이름은 허용 목록에 있는 것만 통과한다(디버그 빌드에서는 모르는 이름이면 `AssertionError`, 릴리스에서는 무시). 속성 키는 아래 표의 것만 허용되고 나머지는 버려진다. 값은 enum의 `.name` 같은 짧은 영문 문자열이다.

### usage

| 이벤트 | 속성 | 호출 위치 |
|--------|------|-----------|
| `app_open` | - | 자동(`Analytics.init`과 `setUserId`가 기록). 직접 호출하지 않는다. |
| `screen_view` | `screen` | 2절(옵저버 + 탭 선택). 직접 호출은 `Analytics.instance.screen('stats')`. |
| `login_success` | `provider` | 1절. 로그인 완료 지점 한 곳. |
| `consent_change` | `kind`, `granted` | 1절의 `consent.changes` 리스너 한 곳(계정 화면 토글과 동의 화면이 모두 `ConsentStore`를 거치므로 개별 호출 불필요). |
| `prayer_start` | `set`(`MysterySet.name`), `mode`(`PrayerMode.name`), `resumed`(bool), `source`(`app`) | `prayer_screen.dart`의 `initState`/세션 시작 지점. `resumed`는 `initialIndex > 0` 여부. |
| `decade_complete` | `set`, `decade`(1..5) | `prayer_screen.dart`에서 한 단이 끝나는(구원송/영광송 직후) 지점. 세션 리스너에서 단 번호가 바뀔 때 한 번. |
| `prayer_finish` | `set`, `completed`, `decades`, `seconds` | `PrayerSessionTracker`가 기록을 쓰는 지점과 같은 곳. 가장 간단한 연결: `prayer_screen.dart`의 `dispose` 전 `tracker.finish()` 직후, 방금 쓴 `PrayerRecord` 값으로 호출. `completed`, `decades`, `seconds`는 그 기록의 값. |
| `rosary_style_change` | `style`(`RosaryStyle.name`) | `rosary_style_screen.dart` 34행 근처 `onSelect: (style) { settings.rosaryStyle = style; track(...) }`. |
| `mode_change` | `mode`(`PrayerMode.name`) | `settings_screen.dart`에서 `settings.prayerMode = ...`을 대입하는 곳. |
| `leader_voice_change` | `source`, `persona` | `settings_screen.dart`에서 `leaderVoiceSource`/`leaderPersona`를 바꾸는 곳(둘 다 현재 값의 `.name`). |
| `text_scale_change` | `scale`(수) | `settings_screen.dart`의 `prayerTextScale` 변경 완료 시(슬라이더는 `onChangeEnd`에서만). |
| `setting_change` | `key`(예: `chime_ten`, `tick_bead`, `haptic`, `dynamic_color`, `tts_rate`, `prayer_font`, `chime_volume`, `leader_audio`, `church_ambient`, `church_quality`) | `settings_screen.dart`의 나머지 설정 변경 지점. 값은 보내지 않고 **어떤 설정인지**만 기록한다. |
| `stats_open` | `range`(`week`/`month`/`year`/`all` 등 `StatsRange`의 name) | `stats_screen.dart`가 열릴 때와 기간 탭을 바꿀 때. |

#### 스테인드글라스 감상(G-14, usage)

창은 `win`(카탈로그 id, `^[a-z0-9_]{1,40}$`)으로만 가리킨다. 값은 열거형·숫자·bool만.

| 이벤트 | 속성 | 호출 위치 |
|--------|------|-----------|
| `glass_open` | `win`, `from`(gallery/today/church/widget/collection), `view`(room/church/flat) | `GlassViewScreen`이 열릴 때. |
| `glass_view_end` | `win`, `seconds`, `zoom_max`(1~32), `panned`, `light`(ref/sun/night), `photo_mode` | 감상 화면을 떠날 때(웹의 `ViewEnd`가 오면 그 값, 없으면 화면 쪽 값). |
| `glass_filter` | `kind`(church/era/shape/color), `value`(영문 열거형 키) | 갤러리 필터 칩을 켤 때. |
| `glass_info` | `win`, `section`(about/credit/review) | 창 정보 시트를 열 때(about), 출처·검토 항목을 누를 때. |
| `glass_fav` | `win`, `on` | G2(내 컬렉션)에서 연결. |
| `glass_capture` | `win`, `shared`, `saved` | G2(캡처·공유)에서 연결. |
| `glass_pray` | `win`, `kind`(decade/rosary/meditation) | 창에서 기도로 넘어가는 버튼. |
| `glass_download` | `scope`(win/all), `mb`, `ok`, `wifi` | G2(CDN 내려받기)에서 연결. |

diagnostics: `glass_load{win,tier(t1/t2/t3/tile),ms,ok}`, `glass_mem{tex_mb,budget_mb,downgraded,tier(low/mid/high)}`.
화면 id: `glass_gallery`(성당 탭의 '창' 보기), `glass_view`(감상 라우트), `glass_info`(정보 시트), `glass_licenses`(출처 화면).

### church (동의 `church`)

| 이벤트 | 속성 | 호출 위치 |
|--------|------|-----------|
| `church_pick` | `church`(카탈로그 `ChurchInfo.id`) | `church_tab.dart`의 `_enter`(성당 고르기 직후) 또는 `church_select_screen.dart`의 선택 콜백. |
| `church_enter` | `church`, `online`(bool) | `ChurchScreen` 초기화에서 `ChurchNet` 연결 방식이 정해진 뒤. 솔로(`SoloChurchNet`)면 `online: false`. |
| `church_exit` | `church`, `seconds`(머문 시간), `sat_seconds`(앉아 있던 시간) | `ChurchScreen.dispose`(= '성당 바꾸기'로 나갈 때). 다른 탭·다른 화면·백그라운드로 가는 것은 퇴장이 아니며(돌아오면 그 자리 그대로, `church_enter` 를 새로 기록하지 않음), 보이지 않던 시간은 `seconds`·`sat_seconds` 에서 뺀다. |
| `church_sit` | `church` | 좌석에 앉는 동작이 성공한 지점. |
| `church_candle` | `church` | `church_candle_sheet.dart`에서 촛불을 켠 순간. **지향(intention) 값은 절대 넘기지 않는다**(넘겨도 허용 목록 밖이라 버려진다). |
| `avatar_save` | (없음) | 아바타 편집기 저장 버튼 콜백. |
| `presence_sheet_open` | `church`, `online`(bool) | `church_presence_sheet.dart`의 `showChurchPresenceSheet`(칩의 성당 이름·인원을 눌러 '지금 접속 중' 시트를 연 순간). |
| `presence_toggle` | `church`, `view`(`here`\|`all`) | 같은 시트에서 보기를 바꾼 순간. **세례명·인원 수는 넘기지 않는다.** |

### diagnostics (동의 `diagnostics`)

| 이벤트 | 속성 | 호출 위치 |
|--------|------|-----------|
| `error` | `where`, `message`, `stack` | 직접 호출하지 않는다. `ErrorReporter.install`(1절)이 `FlutterError.onError`/`PlatformDispatcher.onError`에서 기록. 잡아서 처리한 오류를 보내고 싶으면 `reporter.report('church_net', e, st)`. |
| `perf` | `fps_avg`, `church` | 성당 장면 컨트롤러가 일정 시간 평균 FPS를 낼 때(선택 사항). |

## 4. 동의가 `ConsentGate`로 흐르는 법

- `ConsentGate`는 호출할 때마다 **현재** 동의를 돌려주는 함수다. `ConsentStore.has(kind)`를 그대로 넘기면 된다(로그아웃 상태, 버전 불일치, 서버 확인 전에는 `false`가 되므로 안전하다).
- `Analytics.track`은 호출 시점에 이벤트 범주(usage/church/diagnostics)의 동의를 확인하고 꺼져 있으면 버린다. 올리기 직전에도 다시 확인한다.
- **철회**: `ConsentStore.changes`에서 `granted == false`를 받으면 `Analytics.instance.purgeCategory(kind)`(1절). 서버 쪽 삭제는 `set_consent` RPC가 한다. `sync` 철회는 로컬에서 아무것도 지우지 않고(`PrayerSync`가 다음부터 아무것도 안 함), `diagnostics` 철회는 큐 정리 + (서버가) `devices` 삭제.
- **다시 동의**: 이후의 새 이벤트부터 기록된다(과거 것은 복구하지 않는다). `diagnostics`를 다시 켜면 1절의 `consent.addListener`가 `DeviceReporter.report`를 다시 시도한다.
- 계정 삭제·로그아웃 시: `auth.state` 리스너가 `setUserId(null)`을 불러 올라가지 않은 이벤트를 버린다. (`AuthService.signOut`보다 **먼저** 큐를 비우고 싶으면 로그아웃 버튼에서 `Analytics.instance.setUserId(null)`을 직접 한 번 더 불러도 된다. 멱등이다.)
- 로그인 전에는 `userId`가 없으므로 어떤 이벤트도 기록되지 않는다.

## 5. `PrayerSync` 연결

`PrayerSync`는 `sync` 동의가 켜져 있고 로그인했을 때만 일한다. 서버에 없는 로컬 기록은 100개씩 올리고(멱등, 올린 id는 `synced_prayer_ids_v1`에 기억), 서버에만 있는 기록은 로컬에 합친다(id 합집합, 로컬 삭제 없음). 오프라인이면 조용히 실패하고 30초부터 2배씩(최대 10분) 다시 시도한다.

1. **로그인 직후 / 동의 변경 직후**: 1절의 `sync.syncNow()` 호출 두 곳.
2. **기록이 더해질 때마다**: 방법 A(권장, 다른 파일 수정 불필요) — 1절의 `..start()`가 `PrayerStatsStore`의 변경 알림을 듣고 2초 뒤 한 번 동기화한다. 방법 B(즉시 단건 업로드) — `PrayerStatsStore.add`를 부르는 곳(현재는 `PrayerSessionTracker` 내부)에서 `await store.add(r); await sync.onLocalRecordAdded(r);`. 둘 다 써도 안전하다(멱등).
3. 앱 종료 시 `sync.dispose()`(타이머 정리). 보통은 필요 없다.
4. `PrayerRecord`의 `hail_marys`는 서버 CHECK(0..60)에 맞춰 60으로 자르고 `decades`는 0..5, `seconds`는 0..86400으로 맞춘다.
5. 계정을 바꿔 로그인하면 "올린 id" 기억을 초기화하므로, 이 기기의 로컬 기록 전부가 **새 계정**에 올라간다. 다른 사람의 기록이 섞이는 것을 피하려면 로그아웃 때 `PrayerStatsStore.clear()`를 할지 리더가 정한다(앱 정책).

## 6. 서버에 필요한 것 (A1 / 실제 Supabase 프로젝트)

- `events`, `devices`, `prayer_records` 표와 RLS는 SPEC §3대로. `SupabaseEventUploader`는 `user_id`를 `Supabase.instance.client.auth.currentUser`로 채운다. RLS의 `has_consent()` 때문에 동의가 서버에 기록되기 전(`set_consent` 호출 전)에 올리면 거부된다. 그러면 큐가 백오프로 재시도하므로 데이터는 유실되지 않는다.
- `devices.last_seen`은 앱이 보내지 않는다(행에 모델·OS·앱 버전·로캘·device_id만 넣는 규칙). 마지막 접속 시각을 갱신하려면 DB에서 `BEFORE INSERT OR UPDATE` 트리거로 `now()`를 넣어야 한다.
- `events.platform` CHECK는 `android|ios`다. 데스크톱 개발 빌드는 `android`로 기록된다.
- 이벤트 업로드는 `insert`(비멱등)다. 응답을 못 받은 채 성공한 업로드를 재시도하면 중복 행이 생길 수 있다(드묾). 통계가 이에 민감하면 서버에 클라이언트 생성 id 열을 추가하는 후속 작업이 필요하다.

## 7. 파일 구성

| 파일 | 내용 |
|------|------|
| `analytics_types.dart` | `ConsentGate`, `ConsentKinds`, `EventUploader`, `FakeEventUploader` |
| `supabase_event_uploader.dart` | `SupabaseEventUploader` (supabase_flutter 필요. 분리해 두어 테스트가 의존하지 않는다) |
| `analytics_events.dart` | `AnalyticsEvents`(이름·범주·허용 키 목록), `PropsSanitizer` |
| `analytics_redact.dart` | `Redactor` |
| `analytics_queue_store.dart` | `QueueStore`, `FileQueueStore`(앱 지원 폴더의 파일; 이유는 파일 주석), `MemoryQueueStore` |
| `analytics.dart` | `Analytics` 싱글톤 |
| `analytics_observer.dart` | `AnalyticsObserver` |
| `error_reporter.dart` | `ErrorReporter` |
| `device_reporter.dart` | `DeviceReporter`, `DeviceInfoProvider`, `DeviceIdStore` |
| `../sync/prayer_sync.dart` | `PrayerSync`, `PrayerRecordRepository`, `PrayerStatsStoreRepository` |
