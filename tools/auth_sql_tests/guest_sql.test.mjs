// SQL tests for the guest-first (Supabase anonymous sign-in) flow and
// supabase/migrations/20261113100000_guest.sql (purge_stale_guests) on PGlite.
// Run:  cd tools/auth_sql_tests && node guest_sql.test.mjs   (after `npm install`)
//
// Anonymous users are ordinary auth.users rows with is_anonymous = true and the
// `authenticated` role, so the existing RLS / consent / delete / export paths must work
// unchanged. The stub below adds the real columns/tables the guest migration reads
// (auth.users.is_anonymous/created_at/last_sign_in_at, auth.sessions).
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.resolve(here, '../../supabase/migrations');
const db = new PGlite();

const G1 = 'a1111111-1111-4111-8111-111111111111'; // active-ish guest we act as
const G2 = 'a2222222-2222-4222-8222-222222222222'; // another guest
const REAL = 'b3333333-3333-4333-8333-333333333333'; // linked / real account
const OLD_EMPTY = 'c0000000-0000-4000-8000-000000000001'; // stale: should be purged
const OLD_EVENTS_OLD = 'c0000000-0000-4000-8000-000000000002'; // stale, only old events: purged
const OLD_WITH_RECORD = 'c0000000-0000-4000-8000-000000000003'; // has prayer record: kept
const OLD_ACTIVE_SESSION = 'c0000000-0000-4000-8000-000000000004'; // refreshed session recently: kept
const OLD_REAL = 'c0000000-0000-4000-8000-000000000005'; // old but not anonymous: kept
const NEW_GUEST = 'c0000000-0000-4000-8000-000000000006'; // created today: kept
const OLD_RECENT_EVENT = 'c0000000-0000-4000-8000-000000000007'; // recent event: kept
const OLD_9D = 'c0000000-0000-4000-8000-000000000008'; // 9 days old, inactive (for p_days clamp)

let passed = 0;
let failed = 0;
const failures = [];
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed++;
    failures.push(name);
    console.log(`FAIL  ${name}\n      ${e.message}`);
  }
}
const assert = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const eq = (a, b, m) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${m || 'not equal'}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  }
};
async function as(role, uid, sql, params) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`);
  if (role !== 'postgres') await db.exec(`set role ${role}`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role');
  }
}
const asUser = (uid, sql, p) => as('authenticated', uid, sql, p);
const asAnon = (sql, p) => as('anon', null, sql, p);
const asService = (sql, p) => as('service_role', null, sql, p);
const sudo = (sql, p) => as('postgres', null, sql, p);
async function fails(fn, re) {
  try { await fn(); } catch (e) {
    if (re && !re.test(e.message)) throw new Error(`failed with unexpected message: ${e.message}`);
    return;
  }
  throw new Error('expected an error but statement succeeded');
}
async function exists(table, uid, col = 'user_id') {
  return Number((await sudo(`select count(*)::int n from public.${table} where ${col} = '${uid}'`)).rows[0].n) > 0;
}
async function userExists(uid) {
  return Number((await sudo(`select count(*)::int n from auth.users where id = '${uid}'`)).rows[0].n) > 0;
}

// ---------------------------------------------------------------- setup (Supabase stub)
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_app_meta_data jsonb default '{}'::jsonb,
    is_anonymous boolean not null default false,
    created_at timestamptz not null default now(),
    last_sign_in_at timestamptz
  );
  create table auth.sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    created_at timestamptz,
    updated_at timestamptz
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`);
const files = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
for (const f of files) await db.exec(readFileSync(path.join(migDir, f), 'utf8'));

await check('guest migration is applied after init and re-applies without error (idempotent)', async () => {
  assert(files.some((f) => f.includes('guest')), 'guest migration file present');
  for (const f of files) await db.exec(readFileSync(path.join(migDir, f), 'utf8'));
});

const anon = (id) => sudo(
  `insert into auth.users (id, raw_app_meta_data, is_anonymous) values ($1, '{"provider":"anonymous"}', true)`, [id]);
await anon(G1);
await anon(G2);
await sudo(`insert into auth.users (id, email, raw_app_meta_data, is_anonymous)
            values ('${REAL}', 'real@example.test', '{"provider":"kakao"}', false)`);

// ---------------------------------------------------------------- anonymous users behave like users
await check('anonymous sign-up creates a profile row (provider "anonymous")', async () => {
  const r = await sudo(`select provider from public.profiles where id = '${G1}'`);
  eq(r.rows[0].provider, 'anonymous');
});

await check('anonymous user: consent flow (set_consent / has_consent, append-only)', async () => {
  for (const k of ['terms', 'privacy', 'age14']) {
    await asUser(G1, `select public.set_consent($1, true, '2026-11-v1', 'consent_screen')`, [k]);
  }
  const has = (await asUser(G1, `select public.has_consent('terms') a, public.has_consent('usage') b`)).rows[0];
  eq(has, { a: true, b: false }, 'required granted, optional default off');
  // other guest sees nothing
  eq((await asUser(G2, `select public.has_consent('terms') a`)).rows[0].a, false);
  // direct insert for another user is rejected by RLS
  await fails(() => asUser(G1, `insert into public.consents (user_id, kind, version, granted) values ('${G2}', 'usage', 'v', true)`), /row-level security/);
});

await check('anonymous user: RLS - optional consent gates inserts, rows are private', async () => {
  const ev = `insert into public.events (user_id, session_id, at, category, name, props, app_version, platform)
              values ($1, gen_random_uuid(), now(), 'usage', 'app_open', '{}'::jsonb, '1.0.0', 'android')`;
  await fails(() => asUser(G1, ev, [G1]), /row-level security/); // no usage consent yet
  await asUser(G1, `select public.set_consent('usage', true, '2026-11-v1', 'consent_screen')`);
  await asUser(G1, ev, [G1]);
  await fails(() => asUser(G1, ev, [G2]), /row-level security/); // cannot write as someone else
  eq((await asUser(G2, `select count(*)::int n from public.events`)).rows[0].n, 0);
  eq((await asUser(G1, `select count(*)::int n from public.events`)).rows[0].n, 1);
  await fails(() => asAnon(`select count(*) from public.events`), /permission denied/);
});

await check('anonymous user: prayer records need sync consent; export_my_data returns only own data', async () => {
  const pr = `insert into public.prayer_records (id, user_id, at, mystery_set, decades, hail_marys, completed, seconds, source)
              values (gen_random_uuid(), $1, now(), 'joyful', 5, 53, true, 900, 'app')`;
  await fails(() => asUser(G1, pr, [G1]), /row-level security/);
  await asUser(G1, `select public.set_consent('sync', true, '2026-11-v1', 'consent_screen')`);
  await asUser(G1, pr, [G1]);
  const j = (await asUser(G1, `select public.export_my_data() j`)).rows[0].j;
  eq(j.user_id, G1);
  eq(j.prayer_records.length, 1);
  eq(j.consents.length >= 5, true);
  assert(!JSON.stringify(j).includes(G2), 'no other user data');
});

await check('linking a guest keeps the same user id and its data (is_anonymous flips, rows stay)', async () => {
  await sudo(`insert into auth.users (id, raw_app_meta_data, is_anonymous) values ('${REAL.replace('b3', 'b4')}', '{}', true)`);
  const L = REAL.replace('b3', 'b4');
  await asUser(L, `select public.set_consent('terms', true, '2026-11-v1', 'consent_screen')`);
  // what linkIdentity/updateUser does server side: same row, is_anonymous = false, email set
  await sudo(`update auth.users set is_anonymous = false, email = 'linked@example.test' where id = '${L}'`);
  eq((await asUser(L, `select public.has_consent('terms') a`)).rows[0].a, true);
  await sudo(`delete from auth.users where id = '${L}'`);
});

await check('delete_my_account works for an anonymous user and cascades all rows; others untouched', async () => {
  assert(await exists('events', G1) && await exists('prayer_records', G1) && await exists('consents', G1));
  await asUser(G1, `select public.delete_my_account()`);
  assert(!(await userExists(G1)), 'guest user row gone');
  for (const t of ['events', 'prayer_records', 'consents', 'devices']) assert(!(await exists(t, G1)), `${t} cascaded`);
  assert(!(await exists('profiles', G1, 'id')), 'profile cascaded');
  assert(await userExists(G2), 'other guest untouched');
  await asUser(G1, `select public.delete_my_account()`); // already gone: harmless no-op
  assert(await userExists(G2), 'repeat call never touches other users');
});

await check('a fresh guest can be created after sign-out/deletion (new id, empty data)', async () => {
  const G3 = 'a3333333-3333-4333-8333-333333333333';
  await anon(G3);
  eq((await asUser(G3, `select public.has_consent('terms') a`)).rows[0].a, false);
  eq((await asUser(G3, `select count(*)::int n from public.consents`)).rows[0].n, 0);
  await sudo(`delete from auth.users where id = '${G3}'`);
});

// ---------------------------------------------------------------- purge_stale_guests
const old = (days) => `now() - interval '${days} days'`;
async function seedOld(id, { anonymous = true, days = 60 } = {}) {
  await sudo(
    `insert into auth.users (id, raw_app_meta_data, is_anonymous, created_at, last_sign_in_at)
     values ($1, '{}', $2, ${old(days)}, ${old(days)})`, [id, anonymous]);
  await sudo(`update public.profiles set last_seen_at = ${old(days)}, created_at = ${old(days)} where id = '${id}'`);
}
await seedOld(OLD_EMPTY);
await seedOld(OLD_EVENTS_OLD);
await sudo(`insert into public.consents (user_id, kind, version, granted, at) values ('${OLD_EVENTS_OLD}', 'usage', 'v', true, ${old(59)})`);
await sudo(`insert into public.events (user_id, at, category, name) values ('${OLD_EVENTS_OLD}', ${old(55)}, 'usage', 'app_open')`);
await seedOld(OLD_WITH_RECORD);
await sudo(`insert into public.prayer_records (id, user_id, at, mystery_set, decades, hail_marys, completed, seconds)
            values (gen_random_uuid(), '${OLD_WITH_RECORD}', ${old(50)}, 'joyful', 5, 53, true, 900)`);
await seedOld(OLD_ACTIVE_SESSION);
await sudo(`insert into auth.sessions (user_id, created_at, updated_at) values ('${OLD_ACTIVE_SESSION}', ${old(60)}, ${old(2)})`);
await seedOld(OLD_REAL, { anonymous: false });
await sudo(`insert into auth.users (id, raw_app_meta_data, is_anonymous) values ('${NEW_GUEST}', '{}', true)`);
await seedOld(OLD_RECENT_EVENT);
await sudo(`insert into public.consents (user_id, kind, version, granted) values ('${OLD_RECENT_EVENT}', 'usage', 'v', true)`);
await sudo(`insert into public.events (user_id, at, category, name) values ('${OLD_RECENT_EVENT}', ${old(3)}, 'usage', 'app_open')`);
await seedOld(OLD_9D, { days: 9 });

await check('purge_stale_guests: only service_role/postgres may call it', async () => {
  await fails(() => asUser(G2, `select public.purge_stale_guests()`), /permission denied/);
  await fails(() => asAnon(`select public.purge_stale_guests()`), /permission denied/);
  await fails(() => asUser(OLD_REAL, `select public.purge_stale_guests(30, true)`), /permission denied/);
  await asService(`select public.purge_stale_guests(30, true)`); // allowed
});

await check('purge_stale_guests: dry run counts without deleting', async () => {
  const r = (await asService(`select public.purge_stale_guests(30, true) j`)).rows[0].j;
  eq([r.guests_deleted, r.guests_matched, r.dry_run], [0, 2, true]);
  assert(await userExists(OLD_EMPTY) && await userExists(OLD_EVENTS_OLD));
});

await check('purge_stale_guests: deletes inactive anonymous users without prayer records (>30d), keeps the rest', async () => {
  const r = (await asService(`select public.purge_stale_guests() j`)).rows[0].j;
  eq([r.guests_deleted, r.guests_matched, r.dry_run], [2, 2, false]);
  assert(!(await userExists(OLD_EMPTY)), 'old empty guest purged');
  assert(!(await userExists(OLD_EVENTS_OLD)), 'old guest with only old events purged');
  assert(!(await exists('consents', OLD_EVENTS_OLD)) && !(await exists('events', OLD_EVENTS_OLD)), 'cascade');
  assert(!(await exists('profiles', OLD_EMPTY, 'id')), 'profile cascaded');
  for (const [id, why] of [
    [OLD_WITH_RECORD, 'has prayer records'],
    [OLD_ACTIVE_SESSION, 'recently refreshed session'],
    [OLD_REAL, 'not anonymous (linked account)'],
    [NEW_GUEST, 'created today'],
    [OLD_RECENT_EVENT, 'recent event'],
    [OLD_9D, 'younger than 30 days'],
    [G2, 'active guest'],
    [REAL, 'real account'],
  ]) assert(await userExists(id), `kept: ${why}`);
  assert(await exists('prayer_records', OLD_WITH_RECORD), 'records of kept guest intact');
});

await check('purge_stale_guests: second run is a no-op; p_days is clamped to >= 7 days', async () => {
  eq((await asService(`select public.purge_stale_guests() j`)).rows[0].j.guests_deleted, 0);
  // p_days = 0 would purge everything inactive; it is clamped to 7, so NEW_GUEST (today) stays
  const r = (await asService(`select public.purge_stale_guests(0) j`)).rows[0].j;
  eq(r.guests_deleted, 1, 'only the 9-day-old inactive guest (>= 7 days)');
  assert(!(await userExists(OLD_9D)));
  assert(await userExists(NEW_GUEST), 'fresh guest never purged');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) {
  console.log('Failed: ' + failures.join('; '));
  process.exit(1);
}
