# 관리자 콘솔 '로드맵' 사용법

`docs/ux/UX_PLAN.md` 의 개선 과제 40개(4장), 릴리스 R1~R3(6장), 결정 Q1~Q8(7장)을 관리자 콘솔(`admin/`)의 **로드맵** 탭에서 보고, 과제별 상태와 메모를 고칠 수 있다. 결정일 2026-11-12, 권장 기본값을 모두 채택했다.

## 1. 서버에 적용하기 (한 번만)

1. Supabase 대시보드 **SQL Editor** 를 연다. (init 마이그레이션 `20261112000000_init.sql` 이 이미 적용되어 있어야 한다. `is_admin()` 과 `admins` 표를 쓴다.)
2. `supabase/migrations/20261113000000_roadmap.sql` 의 내용을 붙여 넣고 **Run**. 여러 번 실행해도 안전하다. 시드는 `on conflict do nothing` 이라 이미 바꾼 상태·메모를 덮어쓰지 않는다.
3. Table Editor 에서 `roadmap_items`(40행), `roadmap_decisions`(8행)이 "RLS enabled" 인지 확인한다. 두 표는 정책이 없어 앱·콘솔에서 직접 읽거나 쓸 수 없고, 관리자 전용 함수 `admin_roadmap()` / `admin_roadmap_set()` 으로만 접근한다.
4. 처음 적용하면 R1 의 14개 과제는 `진행 중`, 나머지 26개는 `할 일` 로 들어간다.

## 2. 나를 관리자로 등록하기

콘솔은 이메일+비밀번호 로그인이고 `public.admins` 에 등록된 계정만 로드맵을 읽고 쓸 수 있다. 등록 방법은 `docs/auth/SETUP.md` 의 **6. 나를 관리자로 지정하기** 를 그대로 따른다. 요약:

```sql
insert into public.admins (user_id, email)
values ('<Authentication > Users 의 User UID>', 'me@example.com');
```

콘솔 설정(`admin/config.js`)과 배포는 같은 문서의 7장을 따른다. 로드맵은 로그인 후 상단 **분석 / 로드맵** 탭에서 열린다. 주소 끝에 `#roadmap` 을 붙이면 바로 로드맵 탭이 열린다.

## 3. 화면 사용법

- **진행 요약**: 상태별 개수(할 일·진행 중·검토·완료·막힘·보류·제외)와 릴리스(R1/R2/R3)별 진행 막대. 진한 부분은 완료, 연한 부분은 진행 중·검토.
- **필터**: 릴리스, 우선순위(P0~P2), 분류, 상태, 글자 검색(ID·제목·메모·의존·근거). `필터 초기화` 로 되돌린다.
- **과제 카드**: ID, 우선순위·효과(S/M/L)·분류 칩, 제목, 의존 과제, `자세히`(사용자 가치·위험·근거).
- **상태 바꾸기**: 카드의 상태 선택 상자를 바꾸면 **즉시 저장**된다(`admin_roadmap_set`). 저장에 실패하면 이전 값으로 되돌아가고 카드에 오류가 표시된다.
- **메모**: 입력 칸에 쓰고 다른 곳을 누르면(blur) 저장된다. 500자까지. 비우면 메모가 지워진다.
- **결정 사항**: Q1~Q8 의 결정과 이유(펼치기).
- 상태와 메모의 변경 시각(KST)이 저장 직후 카드에 표시되며, 서버의 `updated_at` 에 기록된다.
- 상태 값: `todo` 할 일 · `doing` 진행 중 · `review` 검토 · `done` 완료 · `blocked` 막힘 · `dropped` 보류·제외.

## 4. 마이그레이션 전/오류 때의 동작

`admin_roadmap` 함수가 서버에 없거나 불러오기에 실패하면, 위쪽에 한국어 안내 띠가 나오고 `admin/roadmap_seed.json` 의 **읽기 전용 사본**을 보여 준다(상태·메모 입력은 잠김). 마이그레이션을 적용하고 `새로고침` 을 누르면 편집 가능한 화면으로 바뀐다. (`file://` 로 직접 열면 JSON 을 읽지 못한다. 정적 서버로 연다.)

## 5. 문서가 바뀌었을 때 (내용 다시 만들기)

시드 SQL 과 JSON 은 문서 표를 읽어 생성한다. 직접 고치지 않는다.

```bash
node admin/tools_seed_roadmap.mjs
```

- `supabase/migrations/20261113000000_roadmap.sql` 과 `admin/roadmap_seed.json` 이 다시 쓰인다.
- 이미 운영 중인 서버에는 **새 과제 행만** 추가된다. 기존 과제의 제목·릴리스 등을 바꾸려면 별도 `update` 문(새 마이그레이션)이 필요하다. 상태·메모는 콘솔에서 바꾼다.

## 6. 테스트

```bash
cd tools/auth_sql_tests && npm install && npm test        # run.mjs + roadmap_test.mjs (PGlite)
node --check admin/admin.js && node --check admin/roadmap.js
```

`roadmap_test.mjs` 가 확인하는 것: 일반 사용자·anon 은 두 함수를 호출할 수 없고 두 표를 직접 읽을 수 없음, 관리자는 과제 40개·결정 8개를 받음, 상태·메모 수정, 잘못된 상태/500자 초과/없는 ID 거부, 시드 재실행이 수정 내용을 덮어쓰지 않음.
