-- =====================================================================
-- 게스트 우선 시작(Supabase 익명 로그인) 보조 마이그레이션  (docs/ux/UX_PLAN.md O-01)
--
-- 익명 사용자도 auth.users 에 실제 행이 있고 역할은 authenticated 이므로, 기존 RLS 정책·
-- has_consent()·set_consent()·export_my_data()·delete_my_account() 는 바꾸지 않고 그대로
-- 동작한다(테스트: tools/auth_sql_tests/guest_sql.test.mjs).
-- 이 파일이 더하는 것은 쌓이는 익명 계정의 정리 함수뿐이다. 자동 예약은 하지 않는다.
--
-- 멱등: 여러 번 실행해도 안전(create or replace, 권한 재설정).
-- =====================================================================

-- 오래 쓰이지 않고 기도 기록도 없는 게스트(익명 사용자)를 지운다. 건수를 반환.
--  * 대상: auth.users.is_anonymous 이고, 만든 지 p_days(기본 30, 최소 7)일이 지났으며,
--    그 기간 안에 로그인·세션 갱신·프로필 접속·이벤트·기기 기록이 없고,
--    서버에 prayer_records 가 한 건도 없는 사용자.
--  * 삭제는 auth.users 행 삭제이며 profiles/consents/events/devices 가 연쇄 삭제된다.
--  * 연결(로그인)된 계정은 is_anonymous = false 이므로 절대 대상이 아니다.
--  * p_dry_run = true 이면 지우지 않고 대상 수만 센다.
-- 호출 권한: service_role / postgres 만(일반 사용자·anon 불가). 예약하지 않는다.
-- 수동 실행(SQL 편집기):  select public.purge_stale_guests();          -- 실제 삭제
--                         select public.purge_stale_guests(30, true);   -- 대상 수만 확인
create or replace function public.purge_stale_guests(p_days int default 30, p_dry_run boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cutoff timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 30), 7));
  ids    uuid[];
begin
  select coalesce(array_agg(u.id), '{}'::uuid[]) into ids
    from auth.users u
   where u.is_anonymous
     and u.created_at < cutoff
     and coalesce(u.last_sign_in_at, u.created_at) < cutoff
     and not exists (select 1 from auth.sessions s
                      where s.user_id = u.id
                        and coalesce(s.updated_at, s.created_at) >= cutoff)
     and not exists (select 1 from public.profiles p
                      where p.id = u.id and p.last_seen_at >= cutoff)
     and not exists (select 1 from public.events e
                      where e.user_id = u.id and e.at >= cutoff)
     and not exists (select 1 from public.devices d
                      where d.user_id = u.id and d.last_seen >= cutoff)
     and not exists (select 1 from public.prayer_records r where r.user_id = u.id);

  if not p_dry_run and cardinality(ids) > 0 then
    delete from auth.users where id = any (ids);
  end if;
  return jsonb_build_object('guests_deleted', case when p_dry_run then 0 else cardinality(ids) end,
                            'guests_matched', cardinality(ids),
                            'dry_run', p_dry_run);
end;
$$;

revoke all on function public.purge_stale_guests(int, boolean) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.purge_stale_guests(int, boolean) to service_role;
  end if;
end $$;
