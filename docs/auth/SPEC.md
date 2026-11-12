# 로그인·동의·사용 분석 설계서 (모든 구현 에이전트의 공용 계약)

사용자 결정: 로그인 = 카카오, 구글, 애플, 이메일. 저장소 = Supabase. 앱 사용 이용 행태를 최대한 파악하되 **동의 기반**: 로그인은 전체 필수(앱 첫 실행 시 로그인), 수집 항목은 가입 때 **분리된 선택 동의** 4개이고 언제든 철회 가능. 수집 항목: 화면·기능 사용, 기도 기록 동기화, 성당 이용, 오류·기기 정보.

## 0. 원칙
- 필수 동의와 선택 동의를 반드시 분리한다. 선택 동의를 거부해도 앱은 정상 사용 가능(로그인은 필수).
- 기도 기록은 종교 활동 정보일 수 있으므로(민감정보 가능성) `sync`/`usage`/`church` 동의 없이는 서버에 어떤 것도 저장하지 않는다. 서버 RLS도 같은 규칙을 강제한다(앱 버그가 있어도 안전).
- 자유 입력 글, 기도 내용, 촛불 지향(intention), 정확한 위치, 연락처, 광고 ID는 **절대 수집하지 않는다**. 이벤트 속성은 열거형 값과 숫자만.
- 동의 철회 즉시 그 범주의 서버 데이터를 삭제한다(`set_consent` RPC). 계정 삭제는 앱 안에서 가능해야 하며 서버의 모든 행을 연쇄 삭제한다.
- 오프라인 우선: 최초 로그인만 네트워크가 필요하고, 이후에는 저장된 세션으로 오프라인에서도 앱을 연다. 이벤트·동기화는 로컬 큐에 쌓았다가 온라인일 때 올린다.
- Supabase 설정이 없으면(`BackendConfig.isConfigured == false`) 앱은 로그인 없이 열리고(개발용) 아무것도 업로드하지 않는다. 릴리스 전 설정 필수.
- 로그인 필수 여부는 상수 `AuthConfig.requireLogin`(기본 true) 하나로 바꿀 수 있게 만든다(스토어 심사 대응용).

## 1. 설정값 (Flutter)
`lib/auth/backend_config.dart`: `BackendConfig.supabaseUrl`, `anonKey` = `String.fromEnvironment('SUPABASE_URL')`, `String.fromEnvironment('SUPABASE_ANON_KEY')`(빌드 시 `--dart-define`; anon key는 공개용이며 비밀이 아님. RLS가 보호한다). `isConfigured`. 딥링크 스킴: `kr.rosary.rosaryapp://login-callback`.

## 2. 동의 종류와 버전
필수: `terms`(이용약관), `privacy`(개인정보 수집·이용), `age14`(만 14세 이상). 선택: `usage`(화면·기능 사용 분석), `sync`(기도 기록 동기화), `church`(성당 이용 기록), `diagnostics`(오류·기기 정보).
`consentVersion = '2026-11-v1'` 상수(문서·앱·서버가 같은 값). 버전이 바뀌면 다시 동의를 받는다. 동의 변경 기록은 `consents`에 **추가만**(삭제·수정 금지), 종류별 최신 행이 유효.

## 3. 데이터베이스 (Supabase Postgres, `supabase/migrations/`)
```
profiles(id uuid PK → auth.users ON DELETE CASCADE, created_at, last_seen_at, provider text, locale text)
consents(id bigserial PK, user_id → auth.users CASCADE, kind text CHECK(8종), version text, granted boolean, at timestamptz default now(), source text)
prayer_records(id uuid PK (클라이언트 생성), user_id → auth.users CASCADE, at timestamptz, mystery_set text CHECK(joyful|luminous|sorrowful|glorious), decades smallint 0..5, hail_marys smallint 0..60, completed boolean, seconds int 0..86400, source text CHECK(app|church), created_at default now())
events(id bigserial PK, user_id → auth.users CASCADE, session_id uuid, at timestamptz, category text CHECK(usage|church|diagnostics), name text, props jsonb default '{}', app_version text, platform text CHECK(android|ios))
devices(user_id → auth.users CASCADE, device_id uuid, model text, os text, app_version text, locale text, first_seen, last_seen, PK(user_id, device_id))
admins(user_id uuid PK → auth.users CASCADE, email text)
```
RLS(모든 표 활성화): 사용자는 **자기 행만** select/insert/delete(수정은 `profiles.last_seen_at`와 `devices`만). insert 정책이 `has_consent()`를 요구: `events` usage→`usage`, church→`church`, diagnostics→`diagnostics`; `prayer_records`→`sync`; `devices`→`diagnostics`. `consents`는 insert/select만. 익명(anon) 역할은 모든 표 접근 불가. `props` 크기 2KB 이하 CHECK.
함수(SECURITY DEFINER, `search_path` 고정): `has_consent(kind text) returns boolean`(자기 최신 동의), `set_consent(kind, granted, version, source)`(행 추가 + granted=false 이면 해당 범주 데이터 즉시 삭제: usage→events(category usage), church→events(category church), diagnostics→events(diagnostics)+devices, sync→prayer_records), `touch_profile(provider, locale)`, `export_my_data() returns jsonb`, `delete_my_account()`(auth.users의 자기 행 삭제 → 연쇄 삭제), `purge_old_data()`(events 24개월 초과 삭제; pg_cron 예약은 문서로 안내).
관리자용 집계 RPC(SECURITY DEFINER, `admins`에 있는 사용자만 실행, **집계만 반환·개인별 행 반환 금지**): `admin_overview(days)`(총 가입자, 신규, DAU/WAU/MAU, 평균 세션 수), `admin_dau(days)`, `admin_retention()`(D1/D7/D30 코호트), `admin_feature_usage(days)`(이벤트 이름별 횟수·고유 사용자), `admin_screens(days)`, `admin_prayer_daily(days)`(완주 수·기도 시간·신비별), `admin_church_usage(days)`(성당별 입장·체류시간·좌석), `admin_versions()`(앱 버전·OS 분포), `admin_errors(days)`(오류 종류 상위), `admin_consent_rates()`(선택 동의 비율).

## 4. 이벤트 사전 (이름·속성 고정; 속성은 열거형/숫자만)
usage: `app_open`, `screen_view{screen}`, `login_success{provider}`, `consent_change{kind,granted}`, `prayer_start{set,mode,resumed,source}`, `decade_complete{set,decade}`, `prayer_finish{set,completed,decades,seconds}`, `rosary_style_change{style}`, `mode_change{mode}`, `leader_voice_change{source,persona}`, `text_scale_change{scale}`, `setting_change{key}`, `stats_open{range}`.
church(동의 `church`): `church_pick{church}`, `church_enter{church,online}`, `church_exit{church,seconds,sat_seconds}`, `church_sit{church}`, `church_candle{church}` (지향 값은 기록하지 않는다), `avatar_save{}`.
diagnostics(동의 `diagnostics`): `error{where,message(≤200자),stack(≤1000자)}`, `perf{fps_avg,church}`; 기기 정보는 `devices` 표로만.
앱은 `Analytics.instance.track(name, props)` 하나로 기록한다. 화면 이름은 소문자 영문 id(`home`, `prayer`, `stats`, `settings`, `rosary_styles`, `church_select`, `church`, `account`, ...).

## 5. Flutter 구조
- `lib/auth/` (A2): `auth_config.dart`(`requireLogin`), `backend_config.dart`, `auth_service.dart`(추상 `AuthService`: `ValueListenable<AuthState>`/Stream, `signInWithKakao/Google/Apple`, `signUpWithEmail/signInWithEmail/resetPassword`, `signOut`, `deleteAccount`, 현재 사용자 id·provider·이메일), `supabase_auth_service.dart`, `fake_auth_service.dart`(테스트), `consent_store.dart`(`ConsentStore`: 로컬 캐시 + 서버 동기화, `has(kind)`, `grant/revoke`, 변경 스트림, `needsConsent`), `auth_gate.dart`(`AuthGate({required Widget child, ...})`: 미설정→child, 세션 없음→`LoginScreen`, 필수 동의 없음/버전 불일치→`ConsentScreen`, 그 외→child), `login_screen.dart`, `consent_screen.dart`, `account_screen.dart`(로그인 정보, 선택 동의 토글, 내 데이터 내려받기, 로그아웃, 계정 삭제), `legal_screen.dart`(약관/방침 본문 표시), `legal_texts.dart`(문서 본문 상수, docs/legal 초안과 같은 내용).
- `lib/analytics/` (A3): `analytics.dart`(싱글톤, 동의 확인, 배치 큐, 오프라인 영속 큐, 플러시 규칙: 20개 또는 30초 또는 앱이 백그라운드로 갈 때, 실패 시 지수 백오프, 큐 최대 500개), `analytics_observer.dart`(NavigatorObserver로 `screen_view`), `error_reporter.dart`(FlutterError/PlatformDispatcher 훅, 동의 시만), `device_reporter.dart`, `lib/sync/prayer_sync.dart`(로컬 `PrayerRecord`와 서버 `prayer_records` 병합).
- 결합은 서로의 파일을 건드리지 않는 인터페이스로: A3는 `ConsentGate`(= `bool Function(String kind)`)와 `EventUploader`(추상: `Future<void> uploadEvents(List<Map>)`, `uploadDevice`, `fetchPrayerRecords`, `upsertPrayerRecords`)를 주입받고 Supabase 구현은 별도 클래스로 둔다. A2는 `supabase_flutter` 초기화(`AuthBootstrap.init()`)를 담당한다.
- 앱 연결(main.dart의 초기화, MaterialApp의 navigatorObservers, AuthGate로 감싸기, 설정 화면의 '계정' 항목, 각 기능의 `track` 호출, `PrayerRecord.id` 추가)은 다른 에이전트들의 작업이 끝난 뒤 리더가 한 번에 한다. 각 에이전트는 `README.md`에 정확한 연결 코드 조각을 남긴다.

## 6. 문서 (A1)
`docs/legal/`: 개인정보처리방침, 이용약관, 동의서 문구(필수 3 + 선택 4, 각 항목의 수집 항목·목적·보유기간), 데이터 인벤토리, 개인정보 국외 이전 고지(Supabase 지역은 프로젝트 설정에 따름), 구글 플레이 데이터 보안 양식 답안, 앱스토어 개인정보 라벨 답안, 계정 삭제 절차. **초안이며 법률 검토가 필요**하다고 문서 첫머리에 명시. 운영자 이름·주소·개인정보 보호책임자 연락처는 `{{빈칸}}`으로 남긴다. 한국 개인정보 보호법(수집·이용 동의, 민감정보 분리 동의, 국외 이전 고지, 파기, 만 14세 미만 제한)을 기준으로 항목을 점검하되 해석은 확정하지 않는다.
`docs/auth/SETUP.md`: 사용자가 직접 하는 Supabase 프로젝트 생성, SQL 실행, 카카오·구글·애플·이메일 공급자 설정(리디렉션 URL, 앱 딥링크, SMTP), `--dart-define` 값, 관리자 지정(`insert into admins`), 관리자 대시보드 배포.
`admin/`: 단일 정적 페이지(관리자 로그인 + 위 집계 RPC 호출 + 표·막대 그래프). 서비스 키는 절대 넣지 않는다(anon key + 관리자 로그인 세션).

## 7. 파일 소유권
- A1: `supabase/*`, `admin/*`, `docs/legal/*`, `docs/auth/SETUP.md`, `tools/auth_sql_tests/*`.
- A2: `lib/auth/*`, `test/auth_*`, `android/app/src/main/AndroidManifest.xml`의 딥링크 intent-filter 한 블록, `ios/Runner/Info.plist`의 URL 스킴 한 블록, `pubspec.yaml`에 `supabase_flutter`(한 줄).
- A3: `lib/analytics/*`, `lib/sync/*`, `test/analytics_*`, `test/sync_*`, `pubspec.yaml`에 `package_info_plus`, `device_info_plus`(각 한 줄). pubspec 동시 편집 충돌 시 재시도.
- 모두: 커밋 금지, `dart format`/분석/테스트 통과, 다른 에이전트 파일은 읽기만.
