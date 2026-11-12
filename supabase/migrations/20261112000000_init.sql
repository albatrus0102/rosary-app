-- =====================================================================
-- 묵주기도 앱: 로그인 · 동의 · 사용 분석 초기 스키마  (docs/auth/SPEC.md §3)
--
-- 설계 요약
--  * 모든 표에 RLS 활성화. 사용자는 자기 행만 접근, anon 역할은 아무것도 못 함.
--  * 선택 동의(usage / sync / church / diagnostics) 없이는 서버가 INSERT 자체를 거부(RLS).
--  * 동의 철회(granted=false 행이 consents 에 들어오는 순간) 해당 범주 데이터 즉시 삭제
--    -> consents 의 AFTER INSERT 트리거가 처리하므로 set_consent 를 거치지 않는 경로도 안전.
--  * consents 는 추가 전용(UPDATE 트리거로 차단, UPDATE/DELETE 권한 없음).
--  * profiles 행은 auth.users INSERT 트리거로 만들고, touch_profile() 도 같은 행을
--    upsert 하므로(트리거가 실패/누락되어도) 어느 쪽이든 안전하다.
--  * 관리자 집계 RPC 는 jsonb 집계만 반환하며 admins 에 없으면 예외(42501 not_admin).
--  * 하루 경계는 한국 표준시(Asia/Seoul) 기준.
--  * 이 파일은 여러 번 실행해도 안전하도록 작성됨(if not exists / drop ... if exists /
--    create or replace). 표 구조를 바꾸는 변경은 새 마이그레이션 파일로 추가할 것.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 표
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  provider     text,
  locale       text
);

create table if not exists public.consents (
  id        bigserial primary key,
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind      text not null check (kind in
              ('terms', 'privacy', 'age14', 'usage', 'sync', 'church', 'diagnostics')),
  version   text not null check (char_length(version) between 1 and 32),
  granted   boolean not null,
  at        timestamptz not null default now(),
  source    text check (source is null or char_length(source) <= 32)
);

create table if not exists public.prayer_records (
  id          uuid primary key,                       -- 클라이언트가 생성(멱등 업로드)
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  at          timestamptz not null,
  mystery_set text not null check (mystery_set in ('joyful', 'luminous', 'sorrowful', 'glorious')),
  decades     smallint not null check (decades between 0 and 5),
  hail_marys  smallint not null check (hail_marys between 0 and 60),
  completed   boolean not null,
  seconds     integer not null check (seconds between 0 and 86400),
  source      text not null default 'app' check (source in ('app', 'church')),
  created_at  timestamptz not null default now()
);

create table if not exists public.events (
  id          bigserial primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id  uuid,
  at          timestamptz not null default now(),
  category    text not null check (category in ('usage', 'church', 'diagnostics')),
  name        text not null check (name ~ '^[a-z][a-z0-9_]{0,63}$'),
  props       jsonb not null default '{}'::jsonb
                check (jsonb_typeof(props) = 'object' and octet_length(props::text) <= 2048),
  app_version text check (app_version is null or char_length(app_version) <= 32),
  platform    text check (platform in ('android', 'ios'))
);

create table if not exists public.devices (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  device_id   uuid not null,
  model       text check (model is null or char_length(model) <= 64),
  os          text check (os is null or char_length(os) <= 64),
  app_version text check (app_version is null or char_length(app_version) <= 32),
  locale      text check (locale is null or char_length(locale) <= 16),
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  primary key (user_id, device_id)
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email   text
);

-- ---------------------------------------------------------------------
-- 2. 인덱스
-- ---------------------------------------------------------------------
create index if not exists events_user_at_idx        on public.events (user_id, at);
create index if not exists events_cat_name_at_idx    on public.events (category, name, at);
create index if not exists events_at_idx             on public.events (at);
create index if not exists prayer_records_user_at_idx on public.prayer_records (user_id, at);
create index if not exists prayer_records_at_idx     on public.prayer_records (at);
create index if not exists consents_user_kind_at_idx on public.consents (user_id, kind, at desc, id desc);

-- ---------------------------------------------------------------------
-- 3. 권한(GRANT) : 먼저 전부 회수한 뒤 필요한 것만 authenticated 에 부여
--    (Supabase 는 기본적으로 anon/authenticated 에 넓게 부여하므로 명시적으로 회수)
-- ---------------------------------------------------------------------
revoke all on public.profiles, public.consents, public.prayer_records,
              public.events, public.devices, public.admins from public, anon, authenticated;
revoke all on sequence public.consents_id_seq, public.events_id_seq from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant update (last_seen_at, locale) on public.profiles to authenticated;
grant select, insert on public.consents to authenticated;                 -- 추가 전용
grant select, insert, delete on public.prayer_records to authenticated;   -- 수정 불가(불변 기록)
grant select, insert, delete on public.events to authenticated;
grant select, insert, update, delete on public.devices to authenticated;
grant usage on sequence public.events_id_seq, public.consents_id_seq to authenticated;
-- admins: 아무에게도 직접 권한 없음(SQL 편집기의 postgres 로만 관리, 확인은 is_admin()).

-- ---------------------------------------------------------------------
-- 4. 함수 (모두 SECURITY DEFINER, search_path 고정)
-- ---------------------------------------------------------------------

-- 자기 최신 동의가 granted 인지
create or replace function public.has_consent(kind text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select c.granted
       from public.consents c
      where c.user_id = auth.uid() and c.kind = has_consent.kind
      order by c.at desc, c.id desc
      limit 1),
    false);
$$;

-- 철회 시 해당 범주 데이터 삭제 (내부용; consents AFTER INSERT 트리거가 호출)
create or replace function public._apply_revocation(p_user uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_kind = 'usage' then
    delete from public.events where user_id = p_user and category = 'usage';
  elsif p_kind = 'church' then
    delete from public.events where user_id = p_user and category = 'church';
  elsif p_kind = 'diagnostics' then
    delete from public.events  where user_id = p_user and category = 'diagnostics';
    delete from public.devices where user_id = p_user;
  elsif p_kind = 'sync' then
    delete from public.prayer_records where user_id = p_user;
  end if;
  -- terms / privacy / age14 철회: 여기서는 삭제하지 않음(앱이 로그아웃·계정삭제 안내).
end;
$$;

create or replace function public._consents_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.granted = false then
    perform public._apply_revocation(new.user_id, new.kind);
  end if;
  return new;
end;
$$;

create or replace function public._consents_block_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'consents is append-only' using errcode = '42501';
end;
$$;

drop trigger if exists consents_after_insert on public.consents;
create trigger consents_after_insert
  after insert on public.consents
  for each row execute function public._consents_after_insert();

drop trigger if exists consents_block_update on public.consents;
create trigger consents_block_update
  before update on public.consents
  for each row execute function public._consents_block_update();

-- 동의 기록 추가 (+ 철회면 즉시 삭제는 트리거가 수행)
create or replace function public.set_consent(kind text, granted boolean, version text, source text default 'app')
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_variable
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if kind is null or kind not in ('terms','privacy','age14','usage','sync','church','diagnostics') then
    raise exception 'invalid consent kind: %', kind using errcode = '22023';
  end if;
  if granted is null then
    raise exception 'granted must not be null' using errcode = '22023';
  end if;
  insert into public.consents (user_id, kind, version, granted, source)
  values (uid, kind, version, granted, source);
end;
$$;

-- 프로필 보장 + 마지막 접속 갱신 (트리거가 만든 행이 없어도 만든다)
create or replace function public.touch_profile(provider text default null, locale text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_variable
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into public.profiles (id, provider, locale)
  values (uid, left(provider, 32), left(locale, 16))
  on conflict (id) do update
    set last_seen_at = now(),
        provider = coalesce(excluded.provider, public.profiles.provider),
        locale   = coalesce(excluded.locale,   public.profiles.locale);
end;
$$;

-- auth.users 가입 시 profiles 자동 생성 (실패해도 가입을 막지 않음)
create or replace function public._handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, provider)
  values (new.id, left(coalesce(new.raw_app_meta_data ->> 'provider', 'email'), 32))
  on conflict (id) do nothing;
  return new;
exception when others then
  raise warning 'profile creation failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public._handle_new_user();

-- 내 데이터 내보내기 (자기 것만)
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  return jsonb_build_object(
    'exported_at', now(),
    'user_id', uid,
    'profile', (select to_jsonb(p) from public.profiles p where p.id = uid),
    'consents', coalesce((select jsonb_agg(to_jsonb(c) order by c.at, c.id)
                            from public.consents c where c.user_id = uid), '[]'::jsonb),
    'prayer_records', coalesce((select jsonb_agg(to_jsonb(r) order by r.at)
                                  from public.prayer_records r where r.user_id = uid), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.at, e.id)
                          from public.events e where e.user_id = uid), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(to_jsonb(d) order by d.first_seen)
                           from public.devices d where d.user_id = uid), '[]'::jsonb)
  );
end;
$$;

-- 계정 삭제: auth.users 의 내 행 삭제 -> 모든 표가 ON DELETE CASCADE
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = uid;
end;
$$;

-- 보존 기간 정리: events 24개월 초과, 24개월 이상 보이지 않은 devices. 건수를 반환.
-- 사용자는 호출 불가(service_role / postgres / pg_cron 전용).
create or replace function public.purge_old_data()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n_events  bigint;
  n_devices bigint;
begin
  with d as (delete from public.events
              where at < now() - interval '24 months' returning 1)
  select count(*) into n_events from d;
  with d as (delete from public.devices
              where last_seen < now() - interval '24 months' returning 1)
  select count(*) into n_devices from d;
  return jsonb_build_object('events_deleted', n_events, 'devices_deleted', n_devices);
end;
$$;

-- pg_cron 예약 (Supabase: Database > Extensions 에서 pg_cron 활성화 후 주석 해제해 실행)
-- select cron.schedule('purge-old-data', '30 18 * * *', $$select public.purge_old_data()$$);
-- (UTC 18:30 = 한국 03:30 매일)

-- ---------------------------------------------------------------------
-- 5. 관리자 집계 RPC  (jsonb 집계만 반환, 개인별 행 없음)
-- ---------------------------------------------------------------------

-- 내부 도우미 -----------------------------------------------------------
create or replace function public._kst_today() returns date
language sql stable set search_path = public, pg_temp
as $$ select (now() at time zone 'Asia/Seoul')::date $$;

create or replace function public._kst_day(ts timestamptz) returns date
language sql immutable set search_path = public, pg_temp
as $$ select (ts at time zone 'Asia/Seoul')::date $$;

create or replace function public._clamp_days(d int) returns int
language sql immutable set search_path = public, pg_temp
as $$ select greatest(1, least(coalesce(d, 30), 365)) $$;

-- days 일(오늘 포함) 구간의 시작 시각 (KST 자정)
create or replace function public._range_start(d int) returns timestamptz
language sql stable set search_path = public, pg_temp
as $$ select ((public._kst_today() - (public._clamp_days(d) - 1))::timestamp at time zone 'Asia/Seoul') $$;

-- 클라이언트가 보낸 속성 값을 안전하게 숫자로 (잘못된 값은 0)
create or replace function public._num(t text) returns numeric
language sql immutable set search_path = public, pg_temp
as $$ select case when t ~ '^[0-9]{1,9}(\.[0-9]{1,6})?$' then t::numeric else 0 end $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select auth.uid() is not null and exists (select 1 from public.admins a where a.user_id = auth.uid()) $$;

create or replace function public._assert_admin() returns void
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
end;
$$;

-- 개요 ------------------------------------------------------------------
create or replace function public.admin_overview(days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  d int := public._clamp_days(days);
  r jsonb;
begin
  perform public._assert_admin();
  with lc as (
    select distinct on (user_id) user_id, granted
      from public.consents where kind = 'usage'
     order by user_id, at desc, id desc
  )
  select jsonb_build_object(
    'days', d,
    'generated_at', now(),
    'total_users', (select count(*) from public.profiles),
    'new_users', (select count(*) from public.profiles where created_at >= public._range_start(d)),
    'dau', (select count(distinct user_id) from public.events
             where category = 'usage' and at >= public._range_start(1)),
    'dau_yesterday', (select count(distinct user_id) from public.events
             where category = 'usage' and at >= public._range_start(2) and at < public._range_start(1)),
    'wau', (select count(distinct user_id) from public.events
             where category = 'usage' and at >= public._range_start(7)),
    'mau', (select count(distinct user_id) from public.events
             where category = 'usage' and at >= public._range_start(30)),
    'usage_consented_users', (select count(*) from lc where granted),
    'avg_sessions_per_active_user', (
      select round(count(distinct (user_id, session_id))::numeric / nullif(count(distinct user_id), 0), 2)
        from public.events
       where category = 'usage' and session_id is not null and at >= public._range_start(d))
  ) into r;
  return r;
end;
$$;

-- 일별 활성 사용자 --------------------------------------------------------
create or replace function public.admin_dau(days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  d int := public._clamp_days(days);
  r jsonb;
begin
  perform public._assert_admin();
  select coalesce(jsonb_agg(jsonb_build_object(
           'day', g.day,
           'dau', coalesce(a.dau, 0),
           'sessions', coalesce(a.sessions, 0),
           'new_users', coalesce(n.c, 0)) order by g.day), '[]'::jsonb)
    into r
    from (select generate_series(public._kst_today() - (d - 1), public._kst_today(), interval '1 day')::date as day) g
    left join (
      select public._kst_day(at) as day,
             count(distinct user_id) as dau,
             count(distinct (user_id, session_id)) as sessions
        from public.events
       where category = 'usage' and at >= public._range_start(d)
       group by 1) a on a.day = g.day
    left join (
      select public._kst_day(created_at) as day, count(*) as c
        from public.profiles
       where created_at >= public._range_start(d)
       group by 1) n on n.day = g.day;
  return r;
end;
$$;

-- 유지율: 가입 주(KST 월요일 시작) 코호트별 D1/D7/D30 (정확히 n일째 접속) ---------
-- eligible = 현재 usage 동의 중이고 n일이 이미 지난 사용자, retained = 그중 n일째 usage 이벤트가 있는 사용자
create or replace function public.admin_retention()
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  today date := public._kst_today();
  start_ts timestamptz := ((public._kst_today() - 84)::timestamp at time zone 'Asia/Seoul');
  r jsonb;
begin
  perform public._assert_admin();
  with lc as (
    select distinct on (user_id) user_id, granted
      from public.consents where kind = 'usage'
     order by user_id, at desc, id desc
  ),
  act as (
    select distinct user_id, public._kst_day(at) as day
      from public.events
     where category = 'usage' and at >= start_ts
  ),
  c as (
    select p.id,
           public._kst_day(p.created_at) as d0,
           date_trunc('week', p.created_at at time zone 'Asia/Seoul')::date as wk,
           coalesce(lc.granted, false) as tracked
      from public.profiles p
      left join lc on lc.user_id = p.id
     where p.created_at >= start_ts
  ),
  f as (
    select c.wk, c.tracked,
      (c.tracked and c.d0 + 1  <= today) as e1,
      (c.tracked and c.d0 + 7  <= today) as e7,
      (c.tracked and c.d0 + 30 <= today) as e30,
      exists (select 1 from act a where a.user_id = c.id and a.day = c.d0 + 1)  as r1,
      exists (select 1 from act a where a.user_id = c.id and a.day = c.d0 + 7)  as r7,
      exists (select 1 from act a where a.user_id = c.id and a.day = c.d0 + 30) as r30
      from c
  ),
  w as (
    select wk,
           count(*) as size,
           count(*) filter (where tracked) as tracked,
           count(*) filter (where e1)  as e1,  count(*) filter (where e1  and r1)  as r1,
           count(*) filter (where e7)  as e7,  count(*) filter (where e7  and r7)  as r7,
           count(*) filter (where e30) as e30, count(*) filter (where e30 and r30) as r30
      from f group by wk
  ),
  o as (
    select count(*) as size,
           count(*) filter (where tracked) as tracked,
           count(*) filter (where e1)  as e1,  count(*) filter (where e1  and r1)  as r1,
           count(*) filter (where e7)  as e7,  count(*) filter (where e7  and r7)  as r7,
           count(*) filter (where e30) as e30, count(*) filter (where e30 and r30) as r30
      from f
  )
  select jsonb_build_object(
    'generated_at', now(),
    'cohorts', coalesce((select jsonb_agg(jsonb_build_object(
        'cohort_week', wk, 'size', size, 'tracked', tracked,
        'd1',  jsonb_build_object('eligible', e1,  'retained', r1,  'rate', round(r1::numeric  / nullif(e1, 0), 4)),
        'd7',  jsonb_build_object('eligible', e7,  'retained', r7,  'rate', round(r7::numeric  / nullif(e7, 0), 4)),
        'd30', jsonb_build_object('eligible', e30, 'retained', r30, 'rate', round(r30::numeric / nullif(e30, 0), 4))
      ) order by wk desc) from w), '[]'::jsonb),
    'overall', (select jsonb_build_object(
        'size', size, 'tracked', tracked,
        'd1',  jsonb_build_object('eligible', e1,  'retained', r1,  'rate', round(r1::numeric  / nullif(e1, 0), 4)),
        'd7',  jsonb_build_object('eligible', e7,  'retained', r7,  'rate', round(r7::numeric  / nullif(e7, 0), 4)),
        'd30', jsonb_build_object('eligible', e30, 'retained', r30, 'rate', round(r30::numeric / nullif(e30, 0), 4))
      ) from o)
  ) into r;
  return r;
end;
$$;

-- 기능(이벤트)별 사용 -------------------------------------------------------
create or replace function public.admin_feature_usage(days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  d int := public._clamp_days(days);
  r jsonb;
begin
  perform public._assert_admin();
  select coalesce(jsonb_agg(jsonb_build_object(
           'category', category, 'name', name, 'count', n, 'users', u) order by n desc, name), '[]'::jsonb)
    into r
    from (select category, name, count(*) as n, count(distinct user_id) as u
            from public.events
           where category in ('usage', 'church')
             and name <> 'screen_view'
             and at >= public._range_start(d)
           group by category, name
           order by n desc, name
           limit 50) t;
  return r;
end;
$$;

-- 화면별 조회 ---------------------------------------------------------------
create or replace function public.admin_screens(days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  d int := public._clamp_days(days);
  r jsonb;
begin
  perform public._assert_admin();
  select coalesce(jsonb_agg(jsonb_build_object('screen', screen, 'count', n, 'users', u)
                            order by n desc, screen), '[]'::jsonb)
    into r
    from (select coalesce(left(props ->> 'screen', 64), 'unknown') as screen,
                 count(*) as n, count(distinct user_id) as u
            from public.events
           where category = 'usage' and name = 'screen_view'
             and at >= public._range_start(d)
           group by 1
           order by n desc, 1
           limit 30) t;
  return r;
end;
$$;

-- 기도 일별 ----------------------------------------------------------------
create or replace function public.admin_prayer_daily(days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  d int := public._clamp_days(days);
  r jsonb;
begin
  perform public._assert_admin();
  with g as (
    select generate_series(public._kst_today() - (d - 1), public._kst_today(), interval '1 day')::date as day
  ),
  p as (
    select public._kst_day(at) as day,
           count(*) as records,
           count(*) filter (where completed) as completed,
           coalesce(sum(seconds), 0) as seconds,
           count(*) filter (where completed and mystery_set = 'joyful')    as joyful,
           count(*) filter (where completed and mystery_set = 'luminous')  as luminous,
           count(*) filter (where completed and mystery_set = 'sorrowful') as sorrowful,
           count(*) filter (where completed and mystery_set = 'glorious')  as glorious,
           count(distinct user_id) as users
      from public.prayer_records
     where at >= public._range_start(d)
     group by 1
  )
  select jsonb_build_object(
    'days', d,
    'daily', coalesce((select jsonb_agg(jsonb_build_object(
        'day', g.day,
        'records', coalesce(p.records, 0),
        'completed', coalesce(p.completed, 0),
        'minutes', round(coalesce(p.seconds, 0) / 60.0, 1),
        'users', coalesce(p.users, 0),
        'by_mystery', jsonb_build_object(
            'joyful', coalesce(p.joyful, 0), 'luminous', coalesce(p.luminous, 0),
            'sorrowful', coalesce(p.sorrowful, 0), 'glorious', coalesce(p.glorious, 0))
      ) order by g.day) from g left join p on p.day = g.day), '[]'::jsonb),
    'totals', (select jsonb_build_object(
        'records', coalesce(sum(records), 0),
        'completed', coalesce(sum(completed), 0),
        'minutes', round(coalesce(sum(seconds), 0) / 60.0, 1),
        'by_mystery', jsonb_build_object(
            'joyful', coalesce(sum(joyful), 0), 'luminous', coalesce(sum(luminous), 0),
            'sorrowful', coalesce(sum(sorrowful), 0), 'glorious', coalesce(sum(glorious), 0))
      ) from p),
    'users', (select count(distinct user_id) from public.prayer_records
               where at >= public._range_start(d))
  ) into r;
  return r;
end;
$$;

-- 성당 이용 ----------------------------------------------------------------
create or replace function public.admin_church_usage(days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  d int := public._clamp_days(days);
  r jsonb;
begin
  perform public._assert_admin();
  select coalesce(jsonb_agg(jsonb_build_object(
           'church', church, 'enters', enters, 'users', users,
           'seconds', seconds, 'sat_seconds', sat_seconds,
           'sits', sits, 'candles', candles) order by enters desc, church), '[]'::jsonb)
    into r
    from (select coalesce(left(props ->> 'church', 64), 'unknown') as church,
                 count(*) filter (where name = 'church_enter') as enters,
                 count(distinct user_id) as users,
                 coalesce(sum(public._num(props ->> 'seconds')) filter (where name = 'church_exit'), 0) as seconds,
                 coalesce(sum(public._num(props ->> 'sat_seconds')) filter (where name = 'church_exit'), 0) as sat_seconds,
                 count(*) filter (where name = 'church_sit') as sits,
                 count(*) filter (where name = 'church_candle') as candles
            from public.events
           where category = 'church'
             and name in ('church_enter', 'church_exit', 'church_sit', 'church_candle')
             and at >= public._range_start(d)
           group by 1
           order by enters desc, 1
           limit 50) t;
  return r;
end;
$$;

-- 앱 버전·OS 분포 ------------------------------------------------------------
create or replace function public.admin_versions()
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  r jsonb;
begin
  perform public._assert_admin();
  select jsonb_build_object(
    'generated_at', now(),
    'app_versions', coalesce((select jsonb_agg(jsonb_build_object('version', v, 'devices', n, 'users', u)
                                               order by n desc, v)
        from (select coalesce(app_version, 'unknown') as v, count(*) as n, count(distinct user_id) as u
                from public.devices group by 1 order by n desc, 1 limit 30) t), '[]'::jsonb),
    'os', coalesce((select jsonb_agg(jsonb_build_object('os', o, 'devices', n) order by n desc, o)
        from (select coalesce(os, 'unknown') as o, count(*) as n
                from public.devices group by 1 order by n desc, 1 limit 30) t), '[]'::jsonb),
    'platforms', coalesce((select jsonb_agg(jsonb_build_object('platform', p, 'users', u) order by u desc, p)
        from (select coalesce(platform, 'unknown') as p, count(distinct user_id) as u
                from public.events
               where at >= public._range_start(30) group by 1) t), '[]'::jsonb)
  ) into r;
  return r;
end;
$$;

-- 오류 상위 ------------------------------------------------------------------
create or replace function public.admin_errors(days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  d int := public._clamp_days(days);
  r jsonb;
begin
  perform public._assert_admin();
  select coalesce(jsonb_agg(jsonb_build_object(
           'where', w, 'message', m, 'count', n, 'users', u, 'last_at', last_at) order by n desc, w, m), '[]'::jsonb)
    into r
    from (select coalesce(left(props ->> 'where', 64), 'unknown') as w,
                 coalesce(left(props ->> 'message', 160), '') as m,
                 count(*) as n, count(distinct user_id) as u, max(at) as last_at
            from public.events
           where category = 'diagnostics' and name = 'error'
             and at >= public._range_start(d)
           group by 1, 2
           order by n desc, 1, 2
           limit 20) t;
  return r;
end;
$$;

-- 선택 동의 비율 --------------------------------------------------------------
create or replace function public.admin_consent_rates()
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  r jsonb;
  total bigint;
begin
  perform public._assert_admin();
  select count(*) into total from public.profiles;
  select jsonb_build_object(
    'total_users', total,
    'generated_at', now(),
    'kinds', coalesce(jsonb_agg(jsonb_build_object(
        'kind', k.kind, 'granted', k.granted, 'total', total,
        'rate', round(k.granted::numeric / nullif(total, 0), 4)) order by k.ord), '[]'::jsonb)
  ) into r
  from (
    select kinds.kind, kinds.ord,
           (select count(*) from (
              select distinct on (c.user_id) c.granted
                from public.consents c
               where c.kind = kinds.kind
               order by c.user_id, c.at desc, c.id desc) x
             where x.granted) as granted
      from (values ('usage', 1), ('sync', 2), ('church', 3), ('diagnostics', 4)) as kinds(kind, ord)
  ) k;
  return r;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. 함수 실행 권한: public/anon 회수 -> authenticated 에만 부여
-- ---------------------------------------------------------------------
revoke all on function public.has_consent(text)                          from public, anon;
revoke all on function public.set_consent(text, boolean, text, text)     from public, anon;
revoke all on function public.touch_profile(text, text)                  from public, anon;
revoke all on function public.export_my_data()                           from public, anon;
revoke all on function public.delete_my_account()                        from public, anon;
revoke all on function public.is_admin()                                 from public, anon;
revoke all on function public.admin_overview(int)                        from public, anon;
revoke all on function public.admin_dau(int)                             from public, anon;
revoke all on function public.admin_retention()                          from public, anon;
revoke all on function public.admin_feature_usage(int)                   from public, anon;
revoke all on function public.admin_screens(int)                         from public, anon;
revoke all on function public.admin_prayer_daily(int)                    from public, anon;
revoke all on function public.admin_church_usage(int)                    from public, anon;
revoke all on function public.admin_versions()                           from public, anon;
revoke all on function public.admin_errors(int)                          from public, anon;
revoke all on function public.admin_consent_rates()                      from public, anon;

grant execute on function public.has_consent(text)                       to authenticated;
grant execute on function public.set_consent(text, boolean, text, text)  to authenticated;
grant execute on function public.touch_profile(text, text)               to authenticated;
grant execute on function public.export_my_data()                        to authenticated;
grant execute on function public.delete_my_account()                     to authenticated;
grant execute on function public.is_admin()                              to authenticated;
grant execute on function public.admin_overview(int)                     to authenticated;
grant execute on function public.admin_dau(int)                          to authenticated;
grant execute on function public.admin_retention()                       to authenticated;
grant execute on function public.admin_feature_usage(int)                to authenticated;
grant execute on function public.admin_screens(int)                      to authenticated;
grant execute on function public.admin_prayer_daily(int)                 to authenticated;
grant execute on function public.admin_church_usage(int)                 to authenticated;
grant execute on function public.admin_versions()                        to authenticated;
grant execute on function public.admin_errors(int)                       to authenticated;
grant execute on function public.admin_consent_rates()                   to authenticated;

-- 내부 함수는 사용자에게 노출하지 않는다 (SECURITY DEFINER 소유자가 호출)
revoke all on function public._apply_revocation(uuid, text)  from public, anon, authenticated;
revoke all on function public._consents_after_insert()       from public, anon, authenticated;
revoke all on function public._consents_block_update()       from public, anon, authenticated;
revoke all on function public._handle_new_user()             from public, anon, authenticated;
revoke all on function public._assert_admin()                from public, anon, authenticated;
revoke all on function public._kst_today()                   from public, anon, authenticated;
revoke all on function public._kst_day(timestamptz)          from public, anon, authenticated;
revoke all on function public._clamp_days(int)               from public, anon, authenticated;
revoke all on function public._range_start(int)              from public, anon, authenticated;
revoke all on function public._num(text)                     from public, anon, authenticated;

-- purge_old_data: 일반 사용자 호출 금지. service_role(있다면)만.
revoke all on function public.purge_old_data() from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.purge_old_data() to service_role;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7. RLS 활성화 + 정책 (사용자는 자기 행만, anon 은 정책 없음 = 접근 불가)
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.consents       enable row level security;
alter table public.prayer_records enable row level security;
alter table public.events         enable row level security;
alter table public.devices        enable row level security;
alter table public.admins         enable row level security;   -- 정책 없음: 직접 접근 불가

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- consents: select / insert 만
drop policy if exists consents_select_own on public.consents;
create policy consents_select_own on public.consents
  for select to authenticated using (user_id = auth.uid());
drop policy if exists consents_insert_own on public.consents;
create policy consents_insert_own on public.consents
  for insert to authenticated with check (user_id = auth.uid());

-- prayer_records: sync 동의 필요
drop policy if exists prayer_records_select_own on public.prayer_records;
create policy prayer_records_select_own on public.prayer_records
  for select to authenticated using (user_id = auth.uid());
drop policy if exists prayer_records_insert_own on public.prayer_records;
create policy prayer_records_insert_own on public.prayer_records
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_consent('sync'));
drop policy if exists prayer_records_delete_own on public.prayer_records;
create policy prayer_records_delete_own on public.prayer_records
  for delete to authenticated using (user_id = auth.uid());

-- events: category 와 같은 이름의 동의 필요 (usage / church / diagnostics)
drop policy if exists events_select_own on public.events;
create policy events_select_own on public.events
  for select to authenticated using (user_id = auth.uid());
drop policy if exists events_insert_own on public.events;
create policy events_insert_own on public.events
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_consent(category));
drop policy if exists events_delete_own on public.events;
create policy events_delete_own on public.events
  for delete to authenticated using (user_id = auth.uid());

-- devices: diagnostics 동의 필요
drop policy if exists devices_select_own on public.devices;
create policy devices_select_own on public.devices
  for select to authenticated using (user_id = auth.uid());
drop policy if exists devices_insert_own on public.devices;
create policy devices_insert_own on public.devices
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_consent('diagnostics'));
drop policy if exists devices_update_own on public.devices;
create policy devices_update_own on public.devices
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.has_consent('diagnostics'));
drop policy if exists devices_delete_own on public.devices;
create policy devices_delete_own on public.devices
  for delete to authenticated using (user_id = auth.uid());
