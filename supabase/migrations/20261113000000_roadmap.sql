-- =====================================================================
-- 로드맵 보드 (관리자 콘솔 '로드맵')
--   * 내용의 출처: docs/ux/UX_PLAN.md 4장(과제 40개) · 6장(릴리스) · 7장(결정 Q1~Q8)
--   * 이 파일의 시드 부분은 admin/tools_seed_roadmap.mjs 가 생성한다. 직접 고치지 말고 문서를 고친 뒤 다시 생성.
--   * 멱등: 여러 번 실행해도 안전. 시드는 on conflict do nothing 이라 관리자가 바꾼 상태·메모를 덮어쓰지 않는다.
--   * 접근: 표에는 아무에게도 직접 권한이 없고(RLS 켬, 정책 없음), 관리자 RPC 로만 읽고 쓴다
--     (init 마이그레이션의 admin_* 와 같은 규칙: SECURITY DEFINER, search_path 고정, public/anon 회수).
-- =====================================================================

create table if not exists public.roadmap_items (
  id          text primary key,
  title       text not null,
  category    text not null,
  release     text not null check (release in ('R1','R2','R3')),
  priority    text not null check (priority in ('P0','P1','P2')),
  effort      text not null check (effort in ('S','M','L')),
  risk        text,
  depends     text,
  evidence    text,
  value       text,
  status      text not null default 'todo'
              check (status in ('todo','doing','review','done','blocked','dropped')),
  owner_note  text not null default '' check (char_length(owner_note) <= 500),
  sort_order  int  not null default 0,
  updated_at  timestamptz not null default now()
);

create table if not exists public.roadmap_decisions (
  id          text primary key,
  question    text not null,
  decision    text not null,
  rationale   text,
  decided_on  date not null
);

revoke all on public.roadmap_items, public.roadmap_decisions from public, anon, authenticated;
alter table public.roadmap_items     enable row level security;   -- 정책 없음: 직접 접근 불가
alter table public.roadmap_decisions enable row level security;   -- 정책 없음: 직접 접근 불가

-- 목록 (관리자만) ---------------------------------------------------------
create or replace function public.admin_roadmap()
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  perform public._assert_admin();
  return jsonb_build_object(
    'generated_at', now(),
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.sort_order, i.id) from public.roadmap_items i), '[]'::jsonb),
    'decisions', coalesce((select jsonb_agg(to_jsonb(d) order by d.id) from public.roadmap_decisions d), '[]'::jsonb)
  );
end;
$$;

-- 상태·메모 수정 (관리자만). null 인 인자는 "바꾸지 않음". ---------------------
create or replace function public.admin_roadmap_set(item_id text, new_status text, new_note text)
returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  r public.roadmap_items;
begin
  perform public._assert_admin();
  if new_status is not null and new_status not in ('todo','doing','review','done','blocked','dropped') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  if new_note is not null and char_length(new_note) > 500 then
    raise exception 'note_too_long' using errcode = '22023';
  end if;
  update public.roadmap_items i
     set status     = coalesce(new_status, i.status),
         owner_note = coalesce(new_note, i.owner_note),
         updated_at = now()
   where i.id = item_id
  returning * into r;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  return to_jsonb(r);
end;
$$;

revoke all on function public.admin_roadmap()                       from public, anon;
revoke all on function public.admin_roadmap_set(text, text, text)   from public, anon;
grant execute on function public.admin_roadmap()                     to authenticated;
grant execute on function public.admin_roadmap_set(text, text, text) to authenticated;

-- 시드: 과제 40개 ---------------------------------------------------------
insert into public.roadmap_items
  (id, title, category, release, priority, effort, risk, depends, evidence, value, status, sort_order)
values
  ('M-01', '탭을 오늘·성당·기록·더보기로 재편, ''묵주'' 탭은 더보기로', '메뉴', 'R1', 'P0', 'S', '기존 사용자 혼란(적음)', '–', 'RA §6 IA 함의; OP §6 제안 IA', '핵심이 한눈에 보이고 기록에 바로 갈 수 있음', 'review', 1),
  ('P-01', '시작 버튼에 신비 이름 표시, 바꿨을 때 ''오늘로'' 되돌리기', '기도화면', 'R1', 'P0', 'S', '없음', 'M-01', 'RA §3-3 (자동 선택 + 1탭 변경)', '무엇을 바칠지 확실해짐', 'review', 2),
  ('P-02', '눈 감고 바치기: 구슬 진동 차등(성모송 약, 주님의 기도·영광송 중, 단 끝 강) + 볼륨 키로 넘기기(기본 꺼짐), 실기기 확인', '접근성', 'R1', 'P0', 'S', '기기마다 세기가 다름, 볼륨 조절과 충돌', '–', 'RA §1-10, §1-17 (차등 진동·볼륨 키 호평)', '화면을 보지 않고 바침', 'review', 3),
  ('P-03', '완료 화면: "기록됨 · 이번 달 n번째", 54일 n일차, 기록 보기', '기도화면', 'R1', 'P0', 'S', '숫자가 경쟁처럼 보일 위험(순위 금지로 해결)', '–', 'RA §3-9; OT §3-10 (점수 아닌 기록)', '마친 보람, 다음 행동 안내', 'review', 4),
  ('A-01', '글자 상한 1.6→2.0, 성당 기도 카드 2줄 자름 제거(스크롤)', '접근성', 'R1', 'P0', 'S', '큰 배율에서 넘침(줄바꿈 테스트)', '–', 'RA §4 (글자 불만), OP §5 (가독성 퇴행)', '어르신이 끝까지 읽음', 'review', 5),
  ('O-01', '게스트로 시작: Supabase 익명 로그인 + 동의 한 화면, 로그인은 ''기록 지키기''로 나중에', '온보딩', 'R1', 'P0', 'M', '익명 계정이 쌓임(정리 정책 필요), 약관 문구 수정', '사용자 결정 Q1', 'OT §1-1 (무가입 입장), RA §4 (강제 로그인 불만), OP §1.15 (굿뉴스: 로그인 선택)', '첫 실행 30초 안에 기도 시작', 'review', 6),
  ('O-02', '성당 첫 입장 때 아바타 편집 강제 제거 → 기본 아바타 + 무작위 세례명', '온보딩', 'R1', 'P0', 'S', '없음', '–', '3D §1.1 (꾸미기 부담으로 이탈) [S]; OT §1-1 (같은 아바타)', '바로 성당 안으로', 'review', 7),
  ('C-01', '성당 조작을 Roblox 규약으로: 왼쪽 절반 떠다니는 스틱, 오른쪽 상황 버튼 1개(앉기/초/무릎), 드래그 회전·핀치는 유지', '성당 3D', 'R1', 'P0', 'M', '회전 드래그와 스틱 터치 영역 충돌(왼쪽·오른쪽 반으로 분리)', '–', '3D §3-1,2,4 [S/I]', '처음 해도 헤매지 않음', 'review', 8),
  ('C-02', '성당 탭 = 마지막 성당 카드 + [입장], ''준비 중'' 성당 숨김', '메뉴', 'R1', 'P0', 'S', '없음', 'M-01', 'OT §3-1 (진입 마찰 0)', '두 번 탭으로 입장', 'review', 9),
  ('C-03', '성당 기도 카드 위계: [다음]을 주 버튼으로, 쉬기·전체 화면·끝내기는 ⋮, ''일어나기''는 앉기 버튼 자리로', '성당 3D', 'R1', 'P0', 'S', '없음', 'C-01', '3D §3-6 (HUD 최소화) [I]', '기도에 집중', 'review', 10),
  ('C-04', '실기기 성능 측정: `perf`에 화질 단계 기록, 기기 3종(저·중·고) 기준 FPS 표 작성, 15fps 아래면 low 고정', '성당 3D', 'R1', 'P0', 'S', '측정 전에는 판단 근거 없음', '–', '3D §3-9 (VRChat 품질 단계) [S]', '끊김·발열 감소', 'review', 11),
  ('S-01', '서버 용량 계획: 부하 테스트(봇 500/2000), 보이지 않는 샤딩(성당당 DO 여러 개, 인원 합산 표시), 과부하 시 아바타 수·전송률 단계 감소', '성당 3D', 'R1', 'P0', 'M', 'Cloudflare 요금, DO 단일 스레드 한계', '–', 'OT §4-6 / 3D §1.1 (산사 20석 → 첫날 서버 다운) [확인/S]', '홍보 날 성당이 안 죽음', 'review', 12),
  ('D-01', '고지 정리: AI 화자명 ''수녀님/신부님'' → ''여성/남성 목소리(AI)'', 성당 정보에 "성사 아님 · 실제 봉헌 아님 · 해당 성당 공식 서비스 아님"', '설정', 'R1', 'P0', 'S', '없음', '–', 'OT §4-4,5 (실제와 혼동, 사칭 인상); 3D §1.8 (Pro Deo 고지)', '신뢰, 교회 측 오해 방지', 'review', 13),
  ('X-01', '측정 이벤트 추가(6장 목록), `prayer_start.source`에 widget/reminder 값', '기록', 'R1', 'P0', 'S', '허용 목록 갱신 누락', '–', 'auth SPEC §4', '개선 효과 판단', 'review', 14),
  ('P-04', '기도 준비 시트: 지향 고르기(프리셋 + 내 지향, 기기 안 저장), 방식 선택, 3초 숨 고르기. 기도 중 지향 한 줄 표시', '기도화면', 'R2', 'P1', 'M', '지향은 민감정보, 서버 전송 금지', '–', 'RA §3-8 (지향 표시, Hallow 오버레이); RA §1-15 (급한 시작)', '기도의 이유가 보임', 'todo', 15),
  ('P-05', '''소리로 이끌기'' 자동 진행 + 포그라운드 미디어 서비스(화면 꺼짐 재생, 잠금화면 컨트롤, 배터리 최적화 안내)', '기도화면', 'R2', 'P1', 'L', '기기별 백그라운드 종료, 음성·화면 동기화', 'P-06', 'RA §4 1순위 불만, §5-2', '걷거나 운전하며 바침', 'todo', 16),
  ('P-06', '쉼 설정: 신비 알림 뒤 묵상 0/5/10/20초, 단 사이 쉼, 시작 전 준비, 속도 기억', '기도화면', 'R2', 'P1', 'M', '설정이 늘어남(기본값 1개로)', '–', 'RA §5-4, §1-7,8 (쉼 요청)', '서두르지 않는 기도', 'todo', 17),
  ('R-01', '알림: 삼종기도 6·12·18시(부활 시기 ''부활 삼종기도''), 매일 묵주기도 시각, 15시 자비. 기본 꺼짐, 조용한 알림', '설정', 'R2', 'P1', 'M', '정확한 알람 권한(Android 14), 시간대', '–', 'RA §1-20, §4 (잘못된 기본값, 큰 소리 불만); OT §3-7 (종)', '하루 리듬', 'todo', 18),
  ('R-02', '''오늘 기도했어요'' 1탭(실물 묵주·성당 기도 포함)', '기록', 'R2', 'P1', 'S', '없음', 'M-01', 'OP §3-2 (1일 1회 탭); RA §1-17 (실물 묵주 사용)', '앱 밖 기도도 인정', 'todo', 19),
  ('R-03', '9일·54일 기도 엔진: 아무 날이나 시작, 오늘의 신비 자동, 빠진 날 보충(조용히 초기화하지 않음), 청원→감사 전환, 빛의 신비 선택', '기록', 'R2', 'P1', 'L', '규칙 오류가 신앙 문제로 번짐(검토 필요)', 'D-02', 'RA §3-7, §1-13,17,18; OP §5 (기도일 수 초기화 = 사목 문제)', '한국 신자의 핵심 수요', 'todo', 20),
  ('R-04', '기록 탭: 달력 + 9일/54일 + 내 지향(응답받음·정렬)', '기록', 'R2', 'P1', 'M', '지향 백업 요구(로컬 내보내기로 대응)', 'R-03, P-04', 'RA §1-13 (지향 정렬 요청); OP §3-3', '은총의 기록', 'todo', 21),
  ('W-01', '홈 위젯: 오늘의 신비 + 이어하기/54일 n일차, 탭하면 바로 기도', '메뉴', 'R2', 'P1', 'M', '네이티브 코드(home_widget)', 'R-03', 'RA §5-11 (한국 묵주 앱에 없음)', '앱을 찾지 않고 시작', 'todo', 22),
  ('A-02', '큰 글씨 모드(앱 전체 1.3배, 버튼 64dp, 고대비 옵션)', '접근성', 'R2', 'P1', 'M', '레이아웃 넘침 전수 점검', 'A-01', 'RA §5-3 (접근성 공백)', '어르신 전용 앱처럼 쓰기 쉬움', 'todo', 23),
  ('O-03', '온보딩 3단계 이내: ①동의 ②글자 크기 고르기(미리보기) ③조용히/소리로 → 오늘', '온보딩', 'R2', 'P1', 'S', '–', 'O-01', 'OT §3-1; OP §5 (온보딩 부실); Calm 유료벽 반면교사 OT §1-17', '첫 기도까지 최단', 'todo', 24),
  ('C-05', '빈 방 대책: 전 샤드 합산 "지금 N명 기도 중", "오늘 켜진 초 N", 사람 가까이 스폰, 정시 종(6·12·18시 삼종 + 21시 함께 묵주기도)', '성당 3D', 'R2', 'P1', 'M', '가짜 인원 금지 원칙 준수', 'S-01', '3D §4 빈 방 7가지 [I]; 3D §1.1 찬미 삼종 [S]; OT §3-5', '혼자여도 함께 느낌', 'todo', 25),
  ('C-06', '고요 모드: 다른 사람 동작·이름표 숨김, HUD 숨김, 환경음만', '성당 3D', 'R2', 'P1', 'S', '없음', '–', '3D §5-4 (침묵 모드) [I]; OT §1-1 (채팅 없음)', '성체조배 같은 침묵', 'todo', 26),
  ('C-07', '시간대 빛 + 전례 시기 색(제대보·조명: 대림·사순 자색, 성탄·부활 백색 등), 부활 시기 레지나 첼리', '성당 3D', 'R2', 'P1', 'M', '전례력 계산 오류(표 기반으로)', '–', '3D §5-1,2 (Vatican Minecraft 전례색 [S])', '다시 올 이유, 실제감', 'todo', 27),
  ('C-08', '동작을 전례 동작으로: 성호경·목례·무릎 꿇기·평화의 인사(손 흔들기 대체)', '성당 3D', 'R2', 'P1', 'S', '프로토콜 `e` 범위 확장(서버 동시 배포)', '–', '3D §3-7 (의례 동사) [I]; OT §3 복사 금지(합장 X)', '말 없는 인사', 'todo', 28),
  ('C-09', '탭해서 이동: 장의자·촛불대·제대를 탭하면 걸어가서 동작', '접근성', 'R2', 'P1', 'M', '경로 탐색(직선 + 통로 지점으로 단순화)', 'C-01', '3D §3-3 (Gather, Vatican 투어) [S/I]', '손이 불편한 사람도 이동', 'todo', 29),
  ('C-10', '품질 3단계(low/mid/high) + 앉으면 30fps + 간단 모드(좌석표에서 자리 고르기 → 앉은 고정 시점) + 실패 원인별 문구(오프라인 → "혼자 모드로 들어갑니다", WebView 실패 → 간단 모드 제안)', '성당 3D', 'R2', 'P1', 'L', '작업량, 사실감과의 균형', 'C-04', '3D §3-9,10 [S/I]; OT §4-7 (저사양 실패)', '저가폰도 성당 이용', 'todo', 30),
  ('SO-01', '안전 장치: 아바타 길게 누르기 → 숨기기/차단/신고(사유 선택), 개인 공간(겹침 방지)', '소셜', 'R2', 'P1', 'M', '신고 처리 운영 부담(1인)', '–', 'OP §4 (Hallow 신고·차단·뮤트) [V]; 3D §1.3 (개인 경계) [S]', '불쾌한 사람을 피함', 'todo', 31),
  ('SET-01', '설정 재구성: 기도 화면 / 소리·진동 / 알림 / 성당 / 계정 / 정보', '설정', 'R2', 'P1', 'S', '–', 'M-01', 'RA §6 (자주 찾는 설정 목록)', '찾기 쉬움', 'todo', 32),
  ('D-02', '교리 검토: 지향 프리셋, 54일 규칙, 고지 문구, AI 음성을 사제·교구 담당자에게 확인', '설정', 'R2', 'P1', 'S', '일정이 외부에 달림', '–', 'OT §3 표 주석, OP 조사자 주의', '오류·논란 예방', 'todo', 33),
  ('SO-02', '촛불에 "함께 기도합니다" 1일 1탭, 촛불 위에 숫자만 표시', '소셜', 'R3', 'P2', 'M', '서버 저장 추가', 'S-01', 'OP §3-2,5 (YouVersion·Hallow) [V]', '남의 지향에 동참', 'todo', 34),
  ('SO-03', '고리기도(살아있는 묵주): 5명 초대 링크, 매일 단 배정, 완료 체크, 빠진 단은 누구나 대신', '소셜', 'R3', 'P2', 'L', '초대·그룹 서버, 카카오 공유', 'O-01, SO-01', 'RA §1-9, OP §1.10 (Rosario 5인) [V]; OP §1.15 고리기도 [U]', '레지오·가족이 함께', 'todo', 35),
  ('SO-04', '정시 함께 묵주기도: 21시에 성당 안 동기화 진행(서버가 단계를 알림, 좌측=선창·우측=후창)', '소셜', 'R3', 'P2', 'L', '동기화 지연, 늦게 온 사람 처리', 'C-05, P-05', 'OP §3-6 (Taizé 고정 시간) [S]; 3D §5-3 [I]', '실제 공동 기도', 'todo', 36),
  ('C-11', '작은 경당(소성당) 공간: 8~20석, 사람이 적어도 꽉 찬 느낌', '성당 3D', 'R3', 'P2', 'M', '새 레이아웃 제작', '–', '3D §4 작은 방 우선 [I]', '빈 대성당 문제 해소', 'todo', 37),
  ('C-12', '사순 십자가의 길: 성당 안 14처 순례 동선(지점 이동)', '성당 3D', 'R3', 'P2', 'L', '기도문 검토', 'C-07, D-02', '3D §5-7 [I]', '시기별 재방문', 'todo', 38),
  ('K-01', '기도문 모음(삼종, 자비의 기도, 성모 찬송, 구원의 기도 문구 선택)', '메뉴', 'R3', 'P2', 'M', '문구 저작권·정확성(CBCK 기도서)', 'D-02', 'RA §5-8 (문구 선택)', '앱 하나로 충분', 'todo', 39),
  ('B-01', '본당 연결: "실제 미사·고해는 본당에서" 안내 + 가까운 성당 미사 시간 링크', '메뉴', 'R3', 'P2', 'M', '데이터 출처(굿뉴스 링크로 대체)', '–', 'OT §5-5; 3D §5-9', '온라인에서 실제 신앙생활로', 'todo', 40)
on conflict (id) do nothing;

-- 시드: 결정 8개 (2026-11-12, 권장 기본값 전부 채택) ---------------------------
insert into public.roadmap_decisions (id, question, decision, rationale, decided_on)
values
  ('Q1', '로그인 필수를 유지할까, 게스트(익명 로그인)로 시작하게 할까?', '권장 기본값 채택: 게스트로 시작. 같은 서버 구조(익명 사용자)로 분석·동의를 그대로 유지하고, 7일 기록 뒤 ''기록 지키기''로 연결을 권한다.', '산사·InPeace·바오로딸·Righthand가 모두 무가입이고 강제 로그인은 불만의 중심. 익명 사용자도 auth.users 행이라 RLS·동의·이벤트 구조를 그대로 쓴다. (UX_PLAN 4.1)', date '2026-11-12'),
  ('Q2', '54일 기도에 빛의 신비를 넣을까?', '권장 기본값 채택: 시작할 때 고르게 하고, 기본은 ''네 가지 신비 순환''으로 한다. 전통 방식(환희·고통·영광)도 선택지로 둔다(한국 앱들이 둘 다 지원).', '한국 앱들이 두 방식을 모두 지원한다. 선택지를 남기되 기본값만 정한다. 54일 규칙은 D-02(교리 검토) 대상.', date '2026-11-12'),
  ('Q3', '성당에 자유 입력(닉네임·채팅)을 앞으로 넣을까?', '권장 기본값 채택: 넣지 않는다. 세례명 목록, 프리셋 지향, 동작만 쓴다. 신고 처리 운영을 1인이 감당할 수 없다.', '자유 입력이 없으면 신고할 거리도 거의 없고, 신고 처리 운영을 1인이 감당할 수 없다. (UX_PLAN 4.1 소셜은 프리셋으로만)', date '2026-11-12'),
  ('Q4', '명동대성당 등 한국 실존 성당 모형을 그대로 둘까?', '권장 기본값 채택: 유지하되 "공식 서비스 아님" 고지를 넣고, 홍보 전 서울·전주·대구 교구 홍보 담당에게 알리고 의견을 묻는다.', '실존 성당 모형은 사칭 인상을 줄 수 있어 고지(D-01)를 넣고 홍보 전 교구 홍보 담당에게 알린다.', date '2026-11-12'),
  ('Q5', '후원(기부)을 넣을까?', '권장 기본값 채택: R3까지 넣지 않는다. 넣더라도 ''더보기 > 앱 후원'' 한 곳에서 1회 후원만. 기도·성당 안에는 넣지 않는다.', '기도 중 결제·유료 봉헌초는 성물·은총 매매로 읽힌다. 후원을 넣더라도 기도 밖 한 곳에서만. (UX_PLAN 5장)', date '2026-11-12'),
  ('Q6', '알림 기본값을 켤까?', '권장 기본값 채택: 꺼짐. 첫 완주 화면에서 "매일 이 시간에 알려 드릴까요?"를 한 번 묻는다. 소리는 무음 알림이 기본이다.', '잘못된 기본값과 큰 소리 알림이 대표적 불만이다. 첫 완주 직후에 한 번만 묻는다. (R-01)', date '2026-11-12'),
  ('Q7', '''소리로 이끌기''를 AI 음성으로 할까, 사람 녹음을 구할까?', '권장 기본값 채택: 지금의 AI 음성(고지 포함)으로 시작한다. 본당 성가대나 수도회 녹음 협조를 R3 과제로 둔다(사람 목소리 선호).', '사람 목소리 선호가 있으나 당장은 AI 음성 + 고지(D-01)로 시작하고 사람 녹음 협조는 R3 과제로 둔다.', date '2026-11-12'),
  ('Q8', '저사양 기기에서 3D 대신 간단 모드를 자동으로 보여 줄까?', '권장 기본값 채택: 첫 입장 5초 동안 평균 15fps 아래이면 "간단 모드로 바꿀까요?"를 묻는다(강제 전환 없음). 사실감을 우선하는 사용자 결정을 존중한다.', '사실감을 우선하는 사용자 결정을 존중해 강제 전환은 하지 않는다. (C-10, C-04)', date '2026-11-12')
on conflict (id) do nothing;
