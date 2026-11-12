# lib/auth — 로그인·동의·계정

SPEC: `docs/auth/SPEC.md`. 동의 문구의 원본: `docs/legal/consent_texts.md`.
이 폴더의 파일만으로 끝나는 부분과, 리더가 `main.dart`/`app.dart`/설정 화면에 한 번에 연결할 부분이 나뉩니다.
아래 코드 조각은 그대로 복사해 쓸 수 있습니다.

## 파일

| 파일 | 역할 |
|---|---|
| `auth_config.dart` | `AuthConfig.requireLogin`(기본 `true`) |
| `backend_config.dart` | `BackendConfig.supabaseUrl/anonKey/isConfigured`, 딥링크 `kr.rosary.rosaryapp://login-callback` |
| `auth_bootstrap.dart` | `AuthBootstrap.init()` — 설정된 경우에만 `Supabase.initialize`(PKCE, 키스토어 세션). 두 번 불러도 안전. 설정 여부(bool) 반환 |
| `secure_session_storage.dart` | 세션·PKCE 검증값을 플랫폼 키스토어(`flutter_secure_storage`)에 저장. 키스토어를 못 쓰면 shared_preferences로 대체 |
| `auth_state.dart` | `AuthState`(loading/signedOut/signedIn + 오류 문구), `LoginProvider`, `AuthFailure`, `EmailSignUpOutcome` |
| `auth_service.dart` | 추상 `AuthService` |
| `supabase_auth_service.dart` | 실제 구현(`SupabaseAuthService`) |
| `fake_auth_service.dart` | 테스트용 `FakeAuthService` |
| `consent_store.dart` | `ConsentKind`, `consentVersion`, `ConsentStore`, `ConsentBackend`, `SupabaseConsentBackend` |
| `auth_gate.dart` | `AuthGate` |
| `login_screen.dart`, `email_auth_sheet.dart` | 로그인 화면, 이메일 가입/로그인 시트 |
| `consent_screen.dart`, `consent_detail_sheet.dart` | 첫 로그인 동의 화면, '자세히' 시트 |
| `account_screen.dart` | 설정 > 계정 |
| `legal_screen.dart`, `legal_texts.dart`, `legal_docs.dart` | 약관·방침 표시, 동의 문구 상수, 문서 본문(생성 파일) |
| `tool/gen_legal_docs.py` | `docs/legal/*.md` → `legal_docs.dart` 생성 |

## 1. main() 초기화 순서

```dart
// lib/main.dart
import 'package:shared_preferences/shared_preferences.dart';
import 'auth/auth_bootstrap.dart';
import 'auth/auth_service.dart';
import 'auth/consent_store.dart';
import 'auth/supabase_auth_service.dart';
import 'auth/fake_auth_service.dart'; // 미설정(개발) 때만 쓰임

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  // 1) Supabase(설정된 경우에만). 다른 서버 연동(분석·동기화)보다 먼저.
  final backendConfigured = await AuthBootstrap.init();

  final prefs = await SharedPreferences.getInstance();
  final settings = await AppSettings.load();
  registerFontLicenses();

  // 2) 인증 서비스: 설정됐으면 Supabase, 아니면 로그인 없이 열리는 개발용 가짜.
  final AuthService auth = backendConfigured
      ? SupabaseAuthService()
      : FakeAuthService();

  // 3) 동의 저장소: 로그인한 사용자별 로컬 캐시 + 서버 동기화.
  final consents = ConsentStore(
    prefs: prefs,
    authService: auth,
    backend: backendConfigured ? SupabaseConsentBackend() : null,
  );

  runApp(RosaryApp(settings, authService: auth, consentStore: consents));
}
```

- 앱이 포그라운드로 돌아올 때 `consents.flush()`를 부르면 오프라인 중 쌓인 동의 기록이 올라갑니다(로그인·`ConsentStore.sync()` 때도 자동으로 올라감).
- `SupabaseAuthService(onLocalDataCleared: ...)`에 계정 삭제 뒤 비울 로컬 캐시(분석 큐, 기도 기록 서버 캐시 등)를 넘기면 `deleteAccount()`가 로그아웃 뒤 호출합니다.
- 빌드 시: `--dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...` (anon 키는 공개용; 서비스 롤 키는 절대 넣지 않음).

## 2. 홈을 AuthGate로 감싸기

`AuthGate`는 `Navigator` **아래**(`MaterialApp.home`)에 둬야 합니다(`builder:`가 아님).

```dart
// lib/app/app.dart 의 MaterialApp
home: AuthGate(
  authService: authService,
  consentStore: consentStore,
  child: AppShell(settings: settings),
),
```

단계 규칙: 백엔드 미설정 → 본문 / 인증 확인 중 → 스플래시 / 로그아웃 + `requireLogin` → `LoginScreen` / 로그인 + 필수 동의 미완(또는 `consentVersion` 불일치) → `ConsentScreen` / 그 외 → 본문.
단계가 바뀌면 본문 위에 쌓인 화면(계정 화면, 시트)은 자동으로 닫히고, 로그아웃하면 `LoginScreen`으로 돌아옵니다.
로그인 필수 해제(스토어 심사 대응)는 `lib/auth/auth_config.dart`의 `requireLogin = false` 한 줄.

## 3. 설정 화면의 '계정' 항목

```dart
ListTile(
  leading: const Icon(Icons.account_circle_outlined),
  title: const Text('계정'),
  subtitle: const Text('로그인 정보, 선택 동의, 데이터 내려받기, 계정 삭제'),
  trailing: const Icon(Icons.chevron_right),
  onTap: () => Navigator.of(context).push(
    MaterialPageRoute<void>(
      settings: const RouteSettings(name: 'account'), // 화면 id: account
      builder: (_) => AccountScreen(
        authService: authService,
        consentStore: consentStore,
      ),
    ),
  ),
),
```

백엔드가 설정되지 않은 개발 빌드에서는 이 항목을 숨기는 것을 권장합니다(`BackendConfig.isConfigured`).

## 4. 다른 기능이 동의를 읽는 법

```dart
if (consentStore.has(ConsentKind.sync)) { /* 기도 기록을 서버로 */ }
consentStore.changes.listen((c) { /* c.kind, c.granted */ });   // 변경 스트림
consentStore.addListener(...);                                    // ChangeNotifier
```

A3의 `ConsentGate`는 `consentStore.has`를 그대로 넘기면 됩니다(`ConsentGate = bool Function(String)`).
로그아웃 상태에서는 모든 `has(kind)`가 `false`입니다. `has`는 **현재 `consentVersion`으로** 동의한 경우에만 `true`.
철회(`revoke`)는 로컬에 즉시 반영되고, 서버의 `set_consent(kind, false, ...)`가 해당 범주 데이터를 삭제합니다(오프라인이면 큐에 두었다가 올림).
동의 철회 직후 그 범주의 로컬 업로드 큐도 비우려면 `consentStore.changes`를 구독하세요.

## 5. 실제 Supabase 프로젝트가 있어야 동작하는 것

- 소셜 로그인 2종(카카오·Google, 브라우저 흐름) — 공급자와 리디렉션 URL 설정 필요(`docs/auth/SETUP.md`). 딥링크 스킴은 Android 인텐트 필터와 iOS `CFBundleURLTypes`에 등록되어 있습니다.
- 이메일 가입/로그인/비밀번호 재설정, 확인 메일 링크의 앱 복귀
- `set_consent`·`consents` 조회, `export_my_data`, `delete_my_account` RPC
- 세션 갱신(만료된 세션은 온라인이 되면 `supabase_flutter`가 자동 갱신; 오프라인에서는 저장된 세션을 로그인 상태로 취급)

테스트는 모두 `FakeAuthService`/가짜 `ConsentBackend`만 씁니다(네트워크 없음).

## 6. 릴리스 전 할 일 (코드의 TODO와 동일)

- **공식 브랜드 자산**: 로그인 버튼은 일반 아이콘만 씁니다. 카카오·Google 공식 버튼 자산과 문구 가이드를 적용해야 합니다(카카오 노란색 `0xFFFEE500`/글자 `0xFF191919`만 고정 색).
- **법률 검토**: 약관·방침·동의 문구는 초안입니다. `docs/legal/*.md`를 고치면 `python3 lib/auth/tool/gen_legal_docs.py`로 `legal_docs.dart`를 다시 만들고, `legal_texts.dart`의 선택 동의 문구(원본: `consent_texts.md`)도 맞춘 뒤 `consentVersion`을 올립니다(앱·서버·문서 같은 값).
- 키스토어를 쓸 수 없는 기기에서는 세션이 shared_preferences(비암호화)로 대체됩니다. 출시 전 실제 기기에서 `SecureWithFallback.usingFallback`이 `false`인지 확인하세요.
- Android `minSdk`는 `flutter.minSdkVersion`(24) — `flutter_secure_storage` 요구사항 충족. iOS Keychain은 별도 설정 없음.

## 7. 표준 준수 메모

- **인증**: PKCE 흐름만 사용(`AuthFlowType.pkce`). 세션 토큰과 PKCE 검증값은 플랫폼 키스토어(Android Keystore/iOS Keychain)에 저장하고, 쓸 수 없을 때만(테스트 등) 기본 저장소로 대체.
- **로그**: 토큰·이메일·사용자 ID를 로그에 남기지 않습니다. `debugPrint`는 이벤트 이름(예: `auth event: signedIn`)과 예외 타입만.
- **동의 분리·기록**: 필수 3 + 선택 4 분리, 선택은 기본 꺼짐·전체 동의도 선택을 미리 체크하지 않음. 동의 변경은 서버에 추가만(`set_consent`).
- **접근성(WCAG 2.2 AA)**: 색은 테마 색 역할만 사용(카카오 버튼 제외, 글자 대비 충분). 모든 버튼·행의 터치 영역 48dp 이상(주 버튼 56dp). 키보드 포커스 때 굵은 테두리(`focusSide`). 오류 문구는 `Semantics(liveRegion: true)`와 아이콘으로 알리고(`LiveErrorText`), SnackBar는 스크린 리더에도 안내(`SemanticsService`). 제목에는 `Semantics(header: true)`. 글자 1.5배·360×640에서 넘침 없음(테스트로 확인).
- **개인정보**: 동의 화면에 서버 전송·저장, 항목별 필드, 수집하지 않는 정보, 국외 저장(Supabase 지역) 고지를 모두 표시. 선택 동의 '자세히'에는 수집·이용 목적, 수집 항목, 보유·이용 기간, 거부 권리와 불이익, 철회 방법을 표시.

## 테스트

`flutter test test/auth_gate_test.dart test/auth_login_test.dart test/auth_consent_test.dart test/auth_account_test.dart test/auth_layout_test.dart test/auth_misc_test.dart`
(`test/auth_test_support.dart`는 공용 가짜·호스트 도우미.)
