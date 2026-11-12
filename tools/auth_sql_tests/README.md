# auth_sql_tests

`supabase/migrations/*.sql` 을 진짜 Postgres(PGlite = WebAssembly로 만든 PostgreSQL 18, 메모리 DB)에 적용하고
RLS · 동의 · 관리자 RPC 동작을 검사합니다. 네트워크·클라우드 계정이 필요 없습니다.

```
cd tools/auth_sql_tests
npm install
node run.mjs                         # SQL 검사 (39개)
NODE_PATH=$(npm root -g) node admin_ui_test.cjs /tmp/admin_shots   # 관리자 페이지 UI 검사 (playwright 필요, 스크린샷 저장)
```
종료 코드가 0이 아니면 실패입니다.

## 시뮬레이션 방식과 한계
- 역할 `anon`, `authenticated`, `service_role` 은 `CREATE ROLE`로 만들고 `SET ROLE` 로 전환합니다. PGlite에서 정상 동작하며 실제 PostgreSQL의 RLS · GRANT 가 그대로 적용됩니다(별도의 RLS 흉내 없음).
- `auth.uid()` 는 PostgREST 와 같이 `request.jwt.claim.sub` 설정값을 읽는 스텁입니다. 실제 Supabase 는 `request.jwt.claims` JSON 도 지원하지만 여기서는 `sub` 만 사용합니다.
- `auth.users` 는 `id, email, raw_app_meta_data` 만 가진 스텁 표입니다(실제 표는 열이 훨씬 많고 `auth.identities` 등이 함께 있음). `delete from auth.users` 의 연쇄 삭제는 검증하지만, GoTrue(인증 서버)의 동작은 검증하지 않습니다.
- Supabase 의 기본 권한(default privileges)을 `ALTER DEFAULT PRIVILEGES` 로 흉내 내서, 마이그레이션이 권한을 명시적으로 회수하는지 확인합니다. 실제 Supabase 와 기본 권한이 완전히 같다는 보장은 없습니다.
- PostgREST(HTTP API)를 거치지 않으므로 `on_conflict`/`Prefer` 헤더, 컬럼 단위 권한의 오류 메시지 형식 등은 다를 수 있습니다. `pg_cron` 은 없으며 `purge_old_data()` 를 직접 호출해 검증합니다.
- 시간대 `Asia/Seoul` 은 PGlite에 포함된 tz 데이터로 동작합니다.
- 관리자 UI 검사(`admin_ui_test.cjs`)는 supabase-js 를 가짜 UMD 로 대체하므로 실제 CDN 라이브러리·네트워크·인증을 검증하지 않습니다.
