# 로그인·분석 백엔드 설정 가이드 (비개발자용)

이 문서는 **직접 해야 하는 클릭 작업**만 순서대로 적었습니다. 코드는 이미 준비되어 있습니다.
각 서비스(Supabase, 카카오, 구글, GitHub, Cloudflare)의 화면 이름·메뉴 위치는 자주 바뀌고 이 문서를 쓸 때 직접 열어 확인하지 못했으므로, **"확인 필요"** 라고 적힌 곳은 실제 화면과 공식 문서를 보고 맞춰 주세요.

준비물: 이메일 계정, GitHub 계정, 이 저장소 접근 권한.

> **하지 말아야 할 것**: `service_role` 키(또는 "secret" 키)를 앱, 관리자 페이지, GitHub 저장소 어디에도 넣지 마세요. 앱과 관리자 페이지에는 공개용 **anon(publishable) 키**만 씁니다. 이 키는 공개돼도 되고, 데이터는 행 단위 보안(RLS)과 관리자 로그인이 지킵니다.

---

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 에서 가입하고 **New project** 를 만듭니다. (화면 이름 **확인 필요**)
2. **Region(지역)** 을 고릅니다.
   - 한국 이용자가 대부분이면 **Northeast Asia (Seoul)** 를 권장합니다 — 지연이 짧고, 개인정보가 국내 서버에 저장됩니다. Supabase에서 서울 지역 제공 여부와 이름은 **확인 필요**.
   - 지역을 해외로 고르면 개인정보 **국외 이전** 고지·근거가 필요합니다(`docs/legal/privacy_policy.md` 8., `consent_texts.md`의 국외 이전 고지). 서울을 골라도 운영사가 해외 법인이라 지원·운영 과정의 해외 접근이 있을 수 있어 **법률 검토 때 확인**하세요.
   - **프로젝트를 만든 뒤에는 지역을 바꿀 수 없습니다**(바꾸려면 새 프로젝트 + 데이터 이전 — **확인 필요**). 선택한 지역을 법률 문서의 `{{Supabase 프로젝트 지역에 따른 국가}}` 칸에 적습니다.
3. 데이터베이스 비밀번호를 정해 안전한 곳(비밀번호 관리자)에 보관합니다.
4. 프로젝트가 만들어지면 **Project Settings > API** (화면 이름 **확인 필요**)에서 두 값을 메모합니다.
   - **Project URL** — 예: `https://abcdefghijklmnop.supabase.co` (`abcdefghijklmnop` 부분이 *project-ref*)
   - **anon public key** — 공개용 키(`eyJ...` 로 시작하는 긴 문자열 또는 `sb_publishable_...` 형태 — **확인 필요**)

## 2. 데이터베이스 마이그레이션 실행

이 저장소의 `supabase/migrations/20261112000000_init.sql` 이 표·보안 정책·함수를 한 번에 만듭니다. 여러 번 실행해도 안전하게 만들어져 있습니다.

**방법 A: SQL 편집기 (가장 쉬움)**
1. Supabase 대시보드 왼쪽의 **SQL Editor** → **New query**.
2. `supabase/migrations/20261112000000_init.sql` 파일 내용을 전부 복사해 붙여 넣고 **Run**.
3. 오류 없이 "Success" 가 나오면 됩니다. 왼쪽 **Table Editor** 에 `profiles, consents, prayer_records, events, devices, admins` 가 보이고 모두 "RLS enabled" 이면 정상입니다.

**방법 B: Supabase CLI (개발자용)**
```
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

이 SQL은 로컬 시험(`tools/auth_sql_tests`, 39개 검사)을 통과했지만, **진짜 Supabase 위에서의 실행은 아직 해보지 않았습니다.** 실행 중 오류가 나면 메시지를 그대로 개발자에게 전달하세요.

## 3. 로그인 방식 켜기

대시보드 **Authentication > Providers** (이름 **확인 필요**)에서 설정합니다. 모든 공급자가 공통으로 쓰는 **콜백(리디렉션) URL** 은 다음 형태입니다.

```
https://<project-ref>.supabase.co/auth/v1/callback
```
(`<project-ref>` 를 1단계에서 메모한 값으로 바꿉니다. 대시보드의 각 Provider 설정 화면에도 복사용으로 표시됩니다 — **확인 필요**.)

### 3-1. 카카오
1. https://developers.kakao.com (카카오 디벨로퍼스)에 로그인하고 **내 애플리케이션 > 애플리케이션 추가하기** 로 앱을 만듭니다. (메뉴 이름 **확인 필요**)
2. 앱 설정의 **앱 키** 에서 **REST API 키** 를 메모합니다.
3. **제품 설정 > 카카오 로그인** 에서 **활성화 설정을 ON** 으로 바꿉니다.
4. 같은 화면의 **Redirect URI** 에 위의 Supabase 콜백 URL `https://<project-ref>.supabase.co/auth/v1/callback` 을 등록합니다.
5. **보안 > Client Secret** 에서 코드를 생성하고 **활성화** 합니다. 이 값을 메모합니다.
6. **카카오 로그인 > 동의항목** 에서 항목을 설정합니다: 닉네임·프로필 사진은 선택, **카카오계정(이메일)** 은 필수/선택 중 정합니다. **이메일 동의항목은 "비즈 앱"으로 전환해야 쓸 수 있을 수 있습니다 — 확인 필요.** Supabase의 카카오 연동이 이메일을 요구하는지, 이메일 없이도 가입이 되게 하는 설정이 있는지도 **확인 필요**.
7. Supabase **Authentication > Providers > Kakao** 에서 **Enable** 을 켜고 **Client ID = 카카오 REST API 키**, **Client Secret = 5번의 값** 을 입력해 저장합니다.
8. 카카오 개발자 콘솔에서 앱이 "개발 중" 상태이면 **팀원으로 등록된 계정만** 로그인할 수 있습니다. 실제 출시 전에 앱 상태/검수 요건을 **확인 필요**.

### 3-2. 구글
1. https://console.cloud.google.com 에서 프로젝트를 만들거나 고릅니다.
2. **APIs & Services > OAuth consent screen**(최근에는 "Google Auth Platform" 이름일 수 있음 — **확인 필요**)에서 앱 이름, 지원 이메일, 개인정보 처리방침 링크를 입력합니다. 게시 상태가 "테스트"이면 테스트 사용자만 로그인됩니다.
3. **Credentials > Create credentials > OAuth client ID** → 유형 **Web application**.
4. **Authorized redirect URIs** 에 Supabase 콜백 URL `https://<project-ref>.supabase.co/auth/v1/callback` 을 추가합니다.
5. 만들어진 **Client ID** 와 **Client secret** 을 Supabase **Providers > Google** 에 입력하고 **Enable**.
6. (나중에 네이티브 구글 로그인으로 바꿀 경우) Android용 OAuth client(패키지 `kr.rosary.rosary_app` + 서명 SHA-1)를 추가로 만들고, 그 Client ID 들을 Supabase Google 설정의 "허용 클라이언트 ID" 칸에 넣어야 할 수 있습니다 — **확인 필요**. 지금 앱이 웹 브라우저(OAuth) 방식이면 3~5번만 필요합니다.

### 3-3. 이메일
1. **Authentication > Providers > Email** 을 **Enable**.
2. **Confirm email(이메일 인증)** 을 켜는 것을 권장합니다(가짜 이메일 방지). 켜면 가입 후 메일의 링크를 눌러야 로그인됩니다.
3. 기본으로 제공되는 메일 발송은 **시간당 발송 수가 매우 적고 테스트 용도**로 알려져 있습니다(정확한 한도 **확인 필요**). 출시 전에는 **Authentication > SMTP Settings** 에서 **직접 운영하는 메일 서비스(SMTP)** 를 연결하는 것을 권장합니다(예: Resend, Amazon SES, SendGrid 등 — 서비스 선택과 설정값은 **확인 필요**). 발신 도메인에는 SPF/DKIM 설정이 필요합니다. 이메일 발송 업체를 쓰면 처리방침의 "처리업무 위탁" 표에 그 업체를 추가하세요.
4. **Authentication > Email Templates** 에서 인증·비밀번호 재설정 메일 문구를 한국어로 바꿀 수 있습니다.

## 4. 리디렉션 URL 허용 목록

**Authentication > URL Configuration** (이름 **확인 필요**):

- **Site URL**: 관리자 대시보드 주소(7단계에서 정해지면) 또는 임시로 `https://<project-ref>.supabase.co`
- **Redirect URLs** (허용 목록)에 다음을 **모두** 추가합니다.
  - `kr.rosary.rosaryapp://login-callback`  ← 앱 딥링크(필수. 소셜 로그인·이메일 링크가 앱으로 돌아오는 주소)
  - 관리자 대시보드 주소 (예: `https://<계정>.github.io/<저장소>/admin/` 또는 Cloudflare Pages 주소) — 관리자 이메일 로그인에 필요하지 않을 수 있으나 비밀번호 재설정 링크에 쓰려면 필요 (**확인 필요**)

## 5. 앱에 연결하기 (빌드 값)

앱은 빌드할 때 두 값을 받습니다. (`lib/auth/backend_config.dart`가 읽습니다)

```
flutter build apk --release \
  --dart-define=SUPABASE_URL=https://<project-ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<anon public key>
```
개발 중 실행은 `flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...`.
두 값이 없으면 앱은 **로그인 없이 열리고 아무것도 업로드하지 않습니다**(개발용). **출시 빌드에는 반드시 넣으세요.**

### GitHub Actions(자동 빌드)에서 쓰기
1. GitHub 저장소 **Settings > Secrets and variables > Actions > New repository secret** (이름 **확인 필요**).
2. 시크릿 이름은 **`SUPABASE_URL`**, **`SUPABASE_ANON_KEY`** 로 만듭니다. (anon 키는 공개용이지만 저장소 변수보다 시크릿에 두는 편이 로그에서 가려져 편합니다.)
3. 빌드 워크플로(`.github/workflows/build-apk.yml`)의 빌드 명령에 다음을 추가해야 합니다 — **워크플로 수정은 개발자(리더)가 합니다.**
```yaml
- run: flutter build apk --release --split-per-abi \
    --dart-define=SUPABASE_URL=${{ secrets.SUPABASE_URL }} \
    --dart-define=SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }}
```

## 6. 나를 관리자로 지정하기

1. 앱에서 **먼저 한 번 로그인**하여 내 계정을 만듭니다. (관리자 페이지는 이메일+비밀번호 로그인만 지원하므로, 관리자는 **이메일로 가입한 계정**이어야 합니다. 소셜 계정을 관리자로 쓰려면 같은 이메일로 이메일 가입을 추가로 하거나 Supabase 대시보드에서 사용자를 만드세요 — **확인 필요**.)
2. Supabase 대시보드 **Authentication > Users** 에서 내 이메일 행의 **User UID** 를 복사합니다.
3. **SQL Editor** 에서 실행합니다 (UID와 이메일을 바꾸세요).
```sql
insert into public.admins (user_id, email)
values ('00000000-0000-0000-0000-000000000000', 'me@example.com');
```
4. 관리자를 빼려면 `delete from public.admins where user_id = '...';`.

`admins` 표는 일반 사용자는 읽을 수도 쓸 수도 없습니다. SQL 편집기(운영자 권한)로만 바꿀 수 있습니다.

## 7. 관리자 대시보드 설정과 배포

대시보드는 `admin/` 폴더의 **정적 웹 페이지**입니다(빌드 불필요). 이메일+비밀번호로 로그인하고, 집계 함수만 호출합니다. 이용자별 기록은 볼 수 없습니다.

### 7-1. 설정 파일
1. `admin/config.example.js` 를 복사해 **`admin/config.js`** 를 만듭니다.
2. 1단계에서 메모한 값을 넣습니다.
```js
window.ADMIN_CONFIG = {
  SUPABASE_URL: 'https://<project-ref>.supabase.co',
  SUPABASE_ANON_KEY: '<anon public key>',
};
```
`config.js` 에는 **anon 키만** 넣습니다. 이 파일은 웹에 공개되어도 되는 값만 담습니다.

### 7-2. 호스팅 (둘 중 하나)
**A. Cloudflare Pages (간단)**
1. Cloudflare 대시보드 **Workers & Pages > Create > Pages > Connect to Git** 로 이 저장소를 연결합니다. (메뉴 이름 **확인 필요**)
2. Build command: 비움 / **Build output directory: `admin`** .
3. 배포가 끝나면 `https://<이름>.pages.dev` 주소가 생깁니다. `config.js` 는 저장소에 커밋되어 있어야 합니다(anon 키이므로 괜찮음). 접근을 더 막고 싶으면 Cloudflare Access 를 붙일 수 있습니다(**확인 필요**).

**B. GitHub Pages**
1. 저장소 **Settings > Pages** 에서 Source 를 **GitHub Actions** 로 바꿉니다.
2. 저장소에 `admin/` 폴더만 올리는 워크플로를 추가합니다(워크플로 파일은 개발자가 추가). 최소 예시:
```yaml
name: admin-pages
on: { push: { branches: [main], paths: ['admin/**'] } }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/upload-pages-artifact@v3
        with: { path: admin }
      - uses: actions/deploy-pages@v4
```
(액션 버전 **확인 필요**) 주소는 `https://<계정>.github.io/<저장소>/` 입니다.

3. 어느 쪽이든 배포된 주소를 4단계 **Redirect URLs** 에 추가하세요. 공개 저장소의 Pages는 누구나 로그인 화면을 볼 수 있지만, 관리자로 등록된 계정이 아니면 데이터를 볼 수 없습니다.

## 8. 보존 기간 자동 삭제 (pg_cron)

이벤트와 오래된 기기 정보를 24개월이 지나면 지웁니다.
1. 대시보드 **Database > Extensions** 에서 **pg_cron** 을 켭니다 (이름 **확인 필요**).
2. **SQL Editor** 에서 실행합니다(매일 한국 시간 03:30).
```sql
select cron.schedule('purge-old-data', '30 18 * * *', $$select public.purge_old_data()$$);
```
3. 확인: `select * from cron.job;` 에 한 줄이 보이면 됩니다. 실행 기록은 `select * from cron.job_run_details order by start_time desc limit 5;`.
4. 취소: `select cron.unschedule('purge-old-data');`

`purge_old_data()` 는 일반 사용자가 호출할 수 없게 막혀 있습니다.

## 9. 확인 체크리스트

**서버**
- [ ] SQL 편집기에서 마이그레이션이 오류 없이 끝났다.
- [ ] Table Editor 의 6개 표 모두 RLS 가 켜져 있다.
- [ ] (SQL) `select count(*) from pg_policies where schemaname='public';` 가 0 이 아니다.
- [ ] 로그아웃 상태(anon 키)로 `GET <SUPABASE_URL>/rest/v1/events` 를 호출하면 데이터가 나오지 않는다(권한 오류 또는 빈 응답).

**로그인**
- [ ] 이메일 가입 → 인증 메일 수신 → 앱 로그인 성공.
- [ ] 카카오 / 구글 로그인 각각 성공하고 앱으로 돌아온다(딥링크 `kr.rosary.rosaryapp://login-callback`).
- [ ] 첫 로그인 후 `profiles` 에 내 행이 생겼다.

**동의·데이터**
- [ ] 필수 3개만 동의하고 시작해도 앱이 정상 동작한다. 이때 `events`, `prayer_records`, `devices` 에 내 행이 **하나도 없다.**
- [ ] 선택 동의 4개를 켜면 해당 범주의 행만 생긴다. `consents` 에 동의 이력이 추가된다.
- [ ] 선택 동의를 끄면 해당 범주의 행이 **즉시 사라진다.**
- [ ] 설정 > 계정 > 내 데이터 내려받기에 내 데이터만 들어 있다.
- [ ] 계정 삭제 후 Authentication > Users 와 모든 표에서 내 행이 사라졌다.

**관리자**
- [ ] `admins` 에 내 UID 를 넣고 대시보드에 로그인하면 숫자와 그래프가 보인다.
- [ ] 관리자가 아닌 계정으로 로그인하면 "관리자 권한이 없습니다" 가 나온다.
- [ ] 대시보드 어디에도 이메일·사용자 ID 가 보이지 않는다.

**법률·스토어**
- [ ] `docs/legal/*` 의 `{{빈칸}}` 을 모두 채우고 법률 전문가 검토를 받았다.
- [ ] 처리방침·약관을 앱 안과 공개 URL 에 게시했다.
- [ ] 동의서 문구가 바뀌었다면 `consentVersion` 을 올렸다.
- [ ] 스토어 개인정보 양식(`store_disclosures.md`)을 제출 직전 화면과 대조했다.

## 10. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 소셜 로그인 후 앱으로 돌아오지 않음 | 4단계 Redirect URLs 에 `kr.rosary.rosaryapp://login-callback` 가 있는지, 앱의 딥링크 설정(AndroidManifest/Info.plist)이 같은 스킴인지 |
| 카카오 로그인 오류 "KOE..." | 카카오 콘솔의 Redirect URI, 동의항목(이메일), Client Secret 활성화, 앱 팀원 등록 여부 — 오류 코드의 뜻은 **확인 필요** |
| 가입 메일이 안 옴 | 기본 메일의 발송 한도, 스팸함, SMTP 설정 |
| 대시보드 "관리자 권한이 없습니다" | 6단계의 UID 가 로그인한 계정의 UID 인지 |
| 대시보드 "설정이 필요합니다" | `admin/config.js` 가 배포되었는지, 값이 `YOUR-...` 그대로가 아닌지 |
| 앱이 아무것도 업로드하지 않음 | 빌드에 `--dart-define` 값이 들어갔는지, 선택 동의가 켜져 있는지 |
