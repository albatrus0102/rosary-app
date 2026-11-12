// SQL tests for supabase/migrations/*.sql using an in-memory Postgres (PGlite).
// Run:  cd tools/auth_sql_tests && npm install && node run.mjs
//
// The Supabase environment is stubbed: `auth` schema, auth.users, auth.uid() (reads the
// `request.jwt.claim.sub` setting like PostgREST does) and the roles anon / authenticated /
// service_role.  Requests are simulated with `SET ROLE <role>` + set_config(jwt.claim.sub).
// See README.md for the (small) differences to real Supabase.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.resolve(here, '../../supabase/migrations');

const db = new PGlite();

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const U3 = '33333333-3333-4333-8333-333333333333'; // admin
const U4 = '44444444-4444-4444-8444-444444444444'; // non-admin with lots of data (for admin RPC seeds)
const SEEDED = [U1, U2, U3, U4];

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
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}
function eq(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${msg || 'not equal'}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
  }
}

// run sql as a role (+ optional user); always returns to superuser afterwards
async function as(role, uid, sql, params) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`);
  if (role !== 'postgres') await db.exec(`set role ${role}`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role');
  }
}
const asUser = (uid, sql, params) => as('authenticated', uid, sql, params);
const asAnon = (sql, params) => as('anon', null, sql, params);
const sudo = (sql, params) => as('postgres', null, sql, params);

async function fails(promiseFn, re) {
  try {
    await promiseFn();
  } catch (e) {
    if (re && !re.test(e.message)) throw new Error(`failed with unexpected message: ${e.message}`);
    return e.message;
  }
  throw new Error('expected an error but statement succeeded');
}
async function count(table, where = 'true') {
  return Number((await sudo(`select count(*)::int as n from public.${table} where ${where}`)).rows[0].n);
}

// ---------------------------------------------------------------- setup
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_app_meta_data jsonb default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  -- Supabase default privileges: new public functions/tables are granted broadly. Mimic them
  -- so the migration has to revoke explicitly.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`);

const files = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
for (const f of files) {
  await db.exec(readFileSync(path.join(migDir, f), 'utf8'));
}
// idempotency: applying the migration a second time must not fail
await check('migration applies twice without error (idempotent)', async () => {
  for (const f of files) await db.exec(readFileSync(path.join(migDir, f), 'utf8'));
});

for (const [id, email] of [[U1, 'one@example.test'], [U2, 'two@example.test'], [U3, 'admin@example.test'], [U4, 'four@example.test']]) {
  await db.query(`insert into auth.users (id, email, raw_app_meta_data) values ($1, $2, '{"provider":"kakao"}')`, [id, email]);
}

const EV = (cat, name, props = {}, uid = U1) => [
  `insert into public.events (user_id, session_id, at, category, name, props, app_version, platform)
   values ($1, gen_random_uuid(), now(), $2, $3, $4::jsonb, '1.0.0', 'android')`,
  [uid, cat, name, JSON.stringify(props)],
];
const PR = (id, uid = U1, extra = {}) => [
  `insert into public.prayer_records (id, user_id, at, mystery_set, decades, hail_marys, completed, seconds, source)
   values ($1, $2, now(), $3, 5, 53, true, $4, 'app')`,
  [id, uid, extra.set ?? 'joyful', extra.seconds ?? 900],
];
const DEV = (uid = U1, id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') => [
  `insert into public.devices (user_id, device_id, model, os, app_version, locale)
   values ($1, $2, 'Pixel', 'Android 14', '1.0.0', 'ko')`,
  [uid, id],
];

// ---------------------------------------------------------------- profile trigger
await check('profiles row is created by auth.users insert trigger', async () => {
  eq(await count('profiles'), 4);
  const r = await sudo(`select provider from public.profiles where id = '${U1}'`);
  eq(r.rows[0].provider, 'kakao');
});
await check('touch_profile upserts and updates last_seen/provider/locale', async () => {
  await asUser(U1, `select public.touch_profile('google', 'ko-KR')`);
  const r = await sudo(`select provider, locale from public.profiles where id = '${U1}'`);
  eq(r.rows[0], { provider: 'google', locale: 'ko-KR' });
  await sudo(`delete from public.profiles where id = '${U2}'`); // simulate missing trigger row
  await asUser(U2, `select public.touch_profile('email', null)`);
  eq(await count('profiles', `id = '${U2}'`), 1);
});

// ---------------------------------------------------------------- (a) consent gates
await check('(a) events(usage) rejected without consent, allowed after set_consent(usage,true)', async () => {
  await fails(() => asUser(U1, ...EV('usage', 'app_open')), /row-level security/);
  await asUser(U1, `select public.set_consent('usage', true, '2026-11-v1', 'app')`);
  await asUser(U1, ...EV('usage', 'app_open'));
  eq(await count('events', `user_id='${U1}'`), 1);
});
await check('(a) consent is per category: usage consent does not allow church/diagnostics events', async () => {
  await fails(() => asUser(U1, ...EV('church', 'church_enter', { church: 'a' })), /row-level security/);
  await fails(() => asUser(U1, ...EV('diagnostics', 'error', { where: 'x' })), /row-level security/);
  await asUser(U1, `select public.set_consent('church', true, '2026-11-v1', 'app')`);
  await asUser(U1, ...EV('church', 'church_enter', { church: 'a', online: false }));
  await asUser(U1, `select public.set_consent('diagnostics', true, '2026-11-v1', 'app')`);
  await asUser(U1, ...EV('diagnostics', 'error', { where: 'x', message: 'm' }));
});
await check('(a) prayer_records rejected without sync consent, allowed after', async () => {
  await fails(() => asUser(U1, ...PR('b0000000-0000-4000-8000-000000000001')), /row-level security/);
  await asUser(U1, `select public.set_consent('sync', true, '2026-11-v1', 'app')`);
  await asUser(U1, ...PR('b0000000-0000-4000-8000-000000000001'));
  eq(await count('prayer_records', `user_id='${U1}'`), 1);
});
await check('(a) devices rejected without diagnostics consent, allowed after', async () => {
  await fails(() => asUser(U2, ...DEV(U2)), /row-level security/);
  await asUser(U2, `select public.set_consent('diagnostics', true, '2026-11-v1', 'app')`);
  await asUser(U2, ...DEV(U2));
  // upsert path (update) is also consent-checked and works
  await asUser(U2, `update public.devices set app_version = '1.0.1', last_seen = now() where device_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'`);
});
await check('(a) a user cannot insert rows on behalf of another user', async () => {
  await asUser(U2, `select public.set_consent('usage', true, '2026-11-v1', 'app')`);
  await fails(() => asUser(U2, ...EV('usage', 'app_open', {}, U1)), /row-level security/);
  await fails(() => asUser(U2, ...PR('b0000000-0000-4000-8000-000000000009', U1)), /row-level security/);
});

// ---------------------------------------------------------------- (b) isolation
await check('(b) users cannot read other users rows (all tables)', async () => {
  await asUser(U2, ...EV('usage', 'app_open', {}, U2));
  for (const t of ['events', 'prayer_records', 'devices', 'consents', 'profiles']) {
    const col = t === 'profiles' ? 'id' : 'user_id';
    const r = await asUser(U2, `select count(*)::int n from public.${t} where ${col} = '${U1}'`);
    eq(r.rows[0].n, 0, `U2 sees U1 rows in ${t}`);
  }
  const mine = await asUser(U1, `select count(*)::int n from public.events where user_id <> '${U1}'`);
  eq(mine.rows[0].n, 0);
});
await check('(b) users cannot modify/delete other users rows', async () => {
  const before = await count('devices', `user_id='${U1}'`) + (await count('events', `user_id='${U1}'`)) + (await count('prayer_records', `user_id='${U1}'`));
  const r1 = await asUser(U2, `delete from public.events where user_id = '${U1}'`);
  const r2 = await asUser(U2, `delete from public.prayer_records where user_id = '${U1}'`);
  const r3 = await asUser(U2, `update public.devices set model = 'hacked' where user_id = '${U1}'`);
  const r4 = await asUser(U2, `update public.profiles set locale = 'xx' where id = '${U1}'`);
  eq([r1.affectedRows, r2.affectedRows, r3.affectedRows, r4.affectedRows], [0, 0, 0, 0]);
  const after = await count('devices', `user_id='${U1}'`) + (await count('events', `user_id='${U1}'`)) + (await count('prayer_records', `user_id='${U1}'`));
  eq(after, before);
});
await check('(b) users cannot rewrite their own immutable data or profile provider (no UPDATE privilege)', async () => {
  await fails(() => asUser(U1, `update public.prayer_records set seconds = 1`), /permission denied/);
  await fails(() => asUser(U1, `update public.events set name = 'x'`), /permission denied/);
  await fails(() => asUser(U1, `update public.profiles set provider = 'x'`), /permission denied/);
  await asUser(U1, `update public.profiles set last_seen_at = now()`); // allowed
});
await check('(b) admins table is not readable/writable by users', async () => {
  await fails(() => asUser(U1, `select * from public.admins`), /permission denied/);
  await fails(() => asUser(U1, `insert into public.admins(user_id, email) values ('${U1}', 'x')`), /permission denied/);
});

// ---------------------------------------------------------------- (c) revocation
await check('(c) revoking a consent deletes that category immediately; later inserts fail again', async () => {
  // usage
  await asUser(U1, ...EV('usage', 'screen_view', { screen: 'home' }));
  assert((await count('events', `user_id='${U1}' and category='usage'`)) >= 2);
  await asUser(U1, `select public.set_consent('usage', false, '2026-11-v1', 'app')`);
  eq(await count('events', `user_id='${U1}' and category='usage'`), 0);
  assert((await count('events', `user_id='${U1}' and category='church'`)) === 1, 'church events must survive usage revoke');
  await fails(() => asUser(U1, ...EV('usage', 'app_open')), /row-level security/);
  // sync
  await asUser(U1, `select public.set_consent('sync', false, '2026-11-v1', 'app')`);
  eq(await count('prayer_records', `user_id='${U1}'`), 0);
  await fails(() => asUser(U1, ...PR('b0000000-0000-4000-8000-000000000002')), /row-level security/);
  // church
  await asUser(U1, `select public.set_consent('church', false, '2026-11-v1', 'app')`);
  eq(await count('events', `user_id='${U1}' and category='church'`), 0);
  await fails(() => asUser(U1, ...EV('church', 'church_enter', { church: 'a' })), /row-level security/);
  // diagnostics (events + devices)
  await asUser(U1, ...DEV(U1));
  assert((await count('devices', `user_id='${U1}'`)) === 1);
  await asUser(U1, `select public.set_consent('diagnostics', false, '2026-11-v1', 'app')`);
  eq(await count('events', `user_id='${U1}' and category='diagnostics'`), 0);
  eq(await count('devices', `user_id='${U1}'`), 0);
  await fails(() => asUser(U1, ...DEV(U1)), /row-level security/);
  // other user untouched
  assert((await count('events', `user_id='${U2}'`)) >= 1, "U2's data must be untouched");
});
await check('(c) revocation also happens via a direct consents insert (trigger), not only via set_consent', async () => {
  await asUser(U1, `select public.set_consent('usage', true, '2026-11-v1', 'app')`);
  await asUser(U1, ...EV('usage', 'app_open'));
  await asUser(U1, `insert into public.consents (user_id, kind, version, granted, source) values ('${U1}', 'usage', '2026-11-v1', false, 'raw')`);
  eq(await count('events', `user_id='${U1}' and category='usage'`), 0);
});
await check('(c) revoking a required consent (terms) does not wipe optional data', async () => {
  await asUser(U1, `select public.set_consent('sync', true, '2026-11-v1', 'app')`);
  await asUser(U1, ...PR('b0000000-0000-4000-8000-000000000003'));
  await asUser(U1, `select public.set_consent('terms', false, '2026-11-v1', 'app')`);
  eq(await count('prayer_records', `user_id='${U1}'`), 1);
});

// ---------------------------------------------------------------- (d) append only
await check('(d) consents are append-only for users: UPDATE / DELETE / TRUNCATE denied', async () => {
  await fails(() => asUser(U1, `update public.consents set granted = true`), /permission denied/);
  await fails(() => asUser(U1, `delete from public.consents`), /permission denied/);
  await fails(() => asUser(U1, `truncate public.consents`), /permission denied/);
});
await check('(d) consents UPDATE is blocked even for the table owner (trigger)', async () => {
  await fails(() => sudo(`update public.consents set granted = not granted where id = (select min(id) from public.consents)`), /append-only/);
});
await check('(d) latest consent row wins (including same-transaction ties) and has_consent reflects it', async () => {
  const has = async (k) => (await asUser(U4, `select public.has_consent('${k}') as v`)).rows[0].v;
  eq(await has('usage'), false);
  await asUser(U4, `select public.set_consent('usage', true, '2026-11-v1', 'app')`);
  eq(await has('usage'), true);
  await asUser(U4, `select public.set_consent('usage', false, '2026-11-v1', 'app')`);
  eq(await has('usage'), false);
  await asUser(U4, `select public.set_consent('usage', true, '2026-11-v1', 'app')`);
  eq(await has('usage'), true);
  // two rows in one transaction share the same `at`; the higher id must win
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','${U4}', false); set role authenticated;`);
  try {
    await db.exec(`begin; select public.set_consent('sync', true, 'v', 'app'); select public.set_consent('sync', false, 'v', 'app'); commit;`);
    eq((await db.query(`select public.has_consent('sync') as v`)).rows[0].v, false);
  } finally { await db.exec('reset role'); }
  eq(await count('consents', `user_id='${U4}' and kind='usage'`), 3);
});
await check('(d) set_consent validates kind and requires login', async () => {
  await fails(() => asUser(U4, `select public.set_consent('bogus', true, 'v', 'app')`), /invalid consent kind/);
  await fails(() => asUser(null, `select public.set_consent('usage', true, 'v', 'app')`), /not authenticated/);
  await fails(() => asUser(U4, `insert into public.consents(user_id, kind, version, granted) values ('${U4}', 'bogus', 'v', true)`), /check constraint/);
});

// ---------------------------------------------------------------- (e) export
await check('(e) export_my_data returns only the caller data', async () => {
  await asUser(U2, `select public.set_consent('sync', true, '2026-11-v1', 'app')`);
  await asUser(U2, ...PR('c0000000-0000-4000-8000-000000000001', U2, { set: 'glorious' }));
  const r = (await asUser(U2, `select public.export_my_data() as j`)).rows[0].j;
  eq(r.user_id, U2);
  for (const k of ['consents', 'prayer_records', 'events', 'devices']) {
    for (const row of r[k]) eq(row.user_id, U2, `${k} row of other user in export`);
  }
  assert(r.prayer_records.length === 1 && r.prayer_records[0].mystery_set === 'glorious');
  assert(r.events.length >= 1 && r.devices.length === 1 && r.consents.length >= 2);
  assert(!JSON.stringify(r).includes(U1), 'export contains another users id');
  eq(r.profile.id, U2);
  await fails(() => asUser(null, `select public.export_my_data()`), /not authenticated/);
});

// ---------------------------------------------------------------- (f) delete account
await check('(f) delete_my_account removes the user and cascades all rows; others untouched', async () => {
  await asUser(U1, `select public.set_consent('diagnostics', true, 'v', 'app')`);
  await asUser(U1, ...DEV(U1));
  await asUser(U1, ...EV('diagnostics', 'error', { where: 'z' }));
  await asUser(U1, `select public.set_consent('usage', true, 'v', 'app')`);
  await asUser(U1, ...EV('usage', 'app_open'));
  assert((await count('consents', `user_id='${U1}'`)) > 0);
  await asUser(U1, `select public.delete_my_account()`);
  eq(await count('profiles', `id='${U1}'`), 0);
  eq((await sudo(`select count(*)::int n from auth.users where id='${U1}'`)).rows[0].n, 0);
  for (const t of ['consents', 'events', 'prayer_records', 'devices']) {
    eq(await count(t, `user_id='${U1}'`), 0, `rows left in ${t}`);
  }
  assert((await count('events', `user_id='${U2}'`)) >= 1, 'other users data must remain');
  assert((await sudo(`select count(*)::int n from auth.users where id='${U2}'`)).rows[0].n === 1);
});
await check('(f) delete_my_account refuses when auth.uid() is null and for anon', async () => {
  await fails(() => asUser(null, `select public.delete_my_account()`), /not authenticated/);
  await fails(() => asAnon(`select public.delete_my_account()`), /permission denied/);
  eq((await sudo(`select count(*)::int n from auth.users`)).rows[0].n, 3);
});

// ---------------------------------------------------------------- (h) props size
await check('(h) props larger than 2048 bytes rejected, 2048 accepted; props must be an object', async () => {
  await asUser(U2, `select public.set_consent('usage', true, 'v', 'app')`);
  const big = { x: 'a'.repeat(3000) };
  await fails(() => asUser(U2, ...EV('usage', 'setting_change', big, U2)), /check constraint/);
  const ok = { x: 'a'.repeat(2048 - '{"x": ""}'.length) }; // jsonb text form is {"x": "..."}
  eq(JSON.stringify(ok).length + 1, 2048);
  await asUser(U2, ...EV('usage', 'setting_change', ok, U2));
  await fails(() => asUser(U2, `insert into public.events(category, name, props) values ('usage','x','[1]')`), /check constraint/);
  await fails(() => asUser(U2, `insert into public.events(category, name) values ('usage','Bad Name!')`), /check constraint/);
  await fails(() => asUser(U2, `insert into public.events(category, name, platform) values ('usage','x','windows')`), /check constraint/);
});
await check('(h) prayer_records range checks', async () => {
  await asUser(U2, `select public.set_consent('sync', true, 'v', 'app')`);
  await fails(() => asUser(U2, `insert into public.prayer_records(id, at, mystery_set, decades, hail_marys, completed, seconds) values (gen_random_uuid(), now(), 'joyful', 6, 1, true, 1)`), /check constraint/);
  await fails(() => asUser(U2, `insert into public.prayer_records(id, at, mystery_set, decades, hail_marys, completed, seconds) values (gen_random_uuid(), now(), 'bogus', 1, 1, true, 1)`), /check constraint/);
  await fails(() => asUser(U2, `insert into public.prayer_records(id, at, mystery_set, decades, hail_marys, completed, seconds) values (gen_random_uuid(), now(), 'joyful', 1, 1, true, 86401)`), /check constraint/);
  // idempotent upload: on conflict do nothing works with insert privilege only
  const id = 'c0000000-0000-4000-8000-0000000000aa';
  await asUser(U2, `insert into public.prayer_records(id, at, mystery_set, decades, hail_marys, completed, seconds) values ('${id}', now(), 'joyful', 1, 1, true, 1) on conflict (id) do nothing`);
  await asUser(U2, `insert into public.prayer_records(id, at, mystery_set, decades, hail_marys, completed, seconds) values ('${id}', now(), 'joyful', 1, 1, true, 1) on conflict (id) do nothing`);
  eq(await count('prayer_records', `id='${id}'`), 1);
});

// ---------------------------------------------------------------- (i) anon
await check('(i) anon role has no access to tables or RPCs', async () => {
  for (const t of ['profiles', 'consents', 'prayer_records', 'events', 'devices', 'admins']) {
    await fails(() => asAnon(`select * from public.${t}`), /permission denied/);
  }
  await fails(() => asAnon(`insert into public.events(category,name) values ('usage','x')`), /permission denied/);
  for (const fn of ['has_consent(\'usage\')', 'export_my_data()', 'is_admin()', 'admin_overview(30)', 'admin_dau(30)',
    'admin_retention()', 'admin_feature_usage(30)', 'admin_screens(30)', 'admin_prayer_daily(30)',
    'admin_church_usage(30)', 'admin_versions()', 'admin_errors(30)', 'admin_consent_rates()', 'purge_old_data()',
    'touch_profile(null,null)', 'set_consent(\'usage\', true, \'v\', \'app\')']) {
    await fails(() => asAnon(`select public.${fn}`), /permission denied/);
  }
});
await check('(i) authenticated users cannot call internal helpers or purge_old_data', async () => {
  await fails(() => asUser(U2, `select public.purge_old_data()`), /permission denied/);
  await fails(() => asUser(U2, `select public._apply_revocation('${U2}', 'usage')`), /permission denied/);
  await fails(() => asUser(U2, `select public._assert_admin()`), /permission denied/);
});
await check('(i) RLS is enabled on every table', async () => {
  const r = await sudo(`select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`);
  eq(r.rows, []);
});
await check('(i) SECURITY DEFINER functions all pin search_path', async () => {
  const r = await sudo(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and not coalesce(p.proconfig::text,'') like '%search_path%'`);
  eq(r.rows, []);
});

// ---------------------------------------------------------------- (g) admin RPCs
// seed sample data as superuser, through the real tables
{
  // extra synthetic users for cohorts/retention. U3 is admin. U4 + new users 5..12.
  const extra = [];
  for (let i = 5; i <= 14; i++) {
    const h = i.toString(16);
    extra.push(`${h.repeat(8)}-${h.repeat(4)}-4${h.repeat(3)}-8${h.repeat(3)}-${h.repeat(12)}`);
  }
  SEEDED.push(...extra);
  for (const e of extra) await db.query(`insert into auth.users(id, email) values ($1, $2)`, [e, 'x@example.test']);
  await sudo(`insert into public.admins(user_id, email) values ('${U3}', 'admin@example.test')`);

  // signup dates: spread over the last 40 days (KST)
  let k = 0;
  for (const u of [U2, U4, ...extra]) {
    const daysAgo = [40, 35, 20, 14, 9, 8, 3, 2, 1, 0][k % 10]; k++;
    await sudo(`update public.profiles set created_at = now() - interval '${daysAgo} days' where id = '${u}'`);
  }
  // consents: everyone opts into usage; some into others
  let n = 0;
  for (const u of [U2, U4, ...extra]) {
    await sudo(`insert into public.consents(user_id, kind, version, granted, source) values ('${u}','usage','2026-11-v1',true,'seed')`);
    if (n % 2 === 0) await sudo(`insert into public.consents(user_id, kind, version, granted, source) values ('${u}','sync','2026-11-v1',true,'seed')`);
    if (n % 3 === 0) await sudo(`insert into public.consents(user_id, kind, version, granted, source) values ('${u}','church','2026-11-v1',true,'seed')`);
    if (n % 4 === 0) await sudo(`insert into public.consents(user_id, kind, version, granted, source) values ('${u}','diagnostics','2026-11-v1',true,'seed')`);
    n++;
  }
  // usage events for the past 30 days: user i is active on day offsets with pattern
  // signup day (D0), D1, D7 for some users
  const users = [U2, U4, ...extra];
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const signup = [40, 35, 20, 14, 9, 8, 3, 2, 1, 0][i % 10];
    const offsets = [0];
    if (i % 2 === 0) offsets.push(1);
    if (i % 3 === 0) offsets.push(7);
    if (i % 4 === 0) offsets.push(30);
    for (const off of offsets) {
      const daysAgo = signup - off;
      if (daysAgo < 0) continue;
      await sudo(`insert into public.events(user_id, session_id, at, category, name, props, app_version, platform)
        values ('${u}', gen_random_uuid(), now() - interval '${daysAgo} days', 'usage', 'app_open', '{}', '${i % 2 ? '1.0.0' : '1.1.0'}', '${i % 2 ? 'ios' : 'android'}'),
               ('${u}', gen_random_uuid(), now() - interval '${daysAgo} days', 'usage', 'screen_view', '{"screen":"${i % 2 ? 'home' : 'prayer'}"}', '1.0.0', 'ios'),
               ('${u}', gen_random_uuid(), now() - interval '${daysAgo} days', 'usage', 'prayer_start', '{"set":"joyful","mode":"auto"}', '1.0.0', 'ios')`);
    }
    // prayer records
    const sets = ['joyful', 'luminous', 'sorrowful', 'glorious'];
    for (let j = 0; j < 3; j++) {
      await sudo(`insert into public.prayer_records(id, user_id, at, mystery_set, decades, hail_marys, completed, seconds, source)
        values (gen_random_uuid(), '${u}', now() - interval '${j} days', '${sets[(i + j) % 4]}', 5, 53, ${(i + j) % 5 !== 0}, ${600 + 60 * j}, 'app')`);
    }
    // church events
    const churches = ['seoul_cathedral', 'myeongdong'];
    const ch = churches[i % 2];
    await sudo(`insert into public.events(user_id, session_id, at, category, name, props, platform) values
      ('${u}', gen_random_uuid(), now(), 'church', 'church_enter', '{"church":"${ch}","online":false}', 'ios'),
      ('${u}', gen_random_uuid(), now(), 'church', 'church_exit', '{"church":"${ch}","seconds":300,"sat_seconds":120}', 'ios'),
      ('${u}', gen_random_uuid(), now(), 'church', 'church_exit', '{"church":"${ch}","seconds":"junk","sat_seconds":-5}', 'ios'),
      ('${u}', gen_random_uuid(), now(), 'church', 'church_sit', '{"church":"${ch}"}', 'ios'),
      ('${u}', gen_random_uuid(), now(), 'church', 'church_candle', '{"church":"${ch}"}', 'ios')`);
    // errors + devices
    await sudo(`insert into public.events(user_id, session_id, at, category, name, props, platform) values
      ('${u}', gen_random_uuid(), now(), 'diagnostics', 'error', '{"where":"audio","message":"player failed"}', 'android')`);
    await sudo(`insert into public.devices(user_id, device_id, model, os, app_version, locale)
      values ('${u}', gen_random_uuid(), 'Pixel', '${i % 2 ? 'iOS 17' : 'Android 14'}', '${i % 3 ? '1.0.0' : '1.1.0'}', 'ko')`);
  }
}

const ADMIN_CALLS = [
  ['admin_overview', 'admin_overview(30)'],
  ['admin_dau', 'admin_dau(30)'],
  ['admin_retention', 'admin_retention()'],
  ['admin_feature_usage', 'admin_feature_usage(30)'],
  ['admin_screens', 'admin_screens(30)'],
  ['admin_prayer_daily', 'admin_prayer_daily(30)'],
  ['admin_church_usage', 'admin_church_usage(30)'],
  ['admin_versions', 'admin_versions()'],
  ['admin_errors', 'admin_errors(30)'],
  ['admin_consent_rates', 'admin_consent_rates()'],
];
const adminJson = {};

await check('(g) all admin RPCs reject non-admin users (42501 not_admin)', async () => {
  for (const [, call] of ADMIN_CALLS) {
    await fails(() => asUser(U4, `select public.${call}`), /not_admin/);
    await fails(() => asUser(null, `select public.${call}`), /not_admin/);
  }
  eq((await asUser(U4, `select public.is_admin() as v`)).rows[0].v, false);
  eq((await asUser(U3, `select public.is_admin() as v`)).rows[0].v, true);
});
await check('(g) all admin RPCs return jsonb for an admin', async () => {
  for (const [name, call] of ADMIN_CALLS) {
    const r = await asUser(U3, `select public.${call} as j, pg_typeof(public.${call})::text as t`);
    eq(r.rows[0].t, 'jsonb', `${name} return type`);
    adminJson[name] = r.rows[0].j;
  }
});
await check('(g) admin JSON never contains any seeded user id (no per-user rows)', async () => {
  for (const [name, j] of Object.entries(adminJson)) {
    const text = JSON.stringify(j);
    for (const id of SEEDED) assert(!text.includes(id), `${name} leaks user id ${id}`);
    assert(!/"user_id"|"email"|@example/.test(text), `${name} has user-level keys`);
  }
});
await check('(g) admin_overview: totals / DAU / WAU / MAU are plausible', async () => {
  const o = adminJson.admin_overview;
  eq(o.total_users, 13, 'total_users');           // U2, U3, U4 + 10 seeded; U1 was deleted in (f)
  assert(o.new_users >= 1 && o.new_users <= o.total_users);
  assert(o.dau >= 1 && o.dau <= o.wau && o.wau <= o.mau && o.mau <= o.total_users, `dau/wau/mau ${o.dau}/${o.wau}/${o.mau}`);
  assert(o.usage_consented_users === 12, `usage_consented_users ${o.usage_consented_users}`);
  assert(Number(o.avg_sessions_per_active_user) >= 1);
});
await check('(g) admin_dau: continuous 30 days, sums match raw data', async () => {
  const d = adminJson.admin_dau;
  eq(d.length, 30);
  const raw = Number((await sudo(`select count(*)::int n from (select distinct user_id, (at at time zone 'Asia/Seoul')::date d from public.events
     where category='usage' and at >= ((now() at time zone 'Asia/Seoul')::date - 29)::timestamp at time zone 'Asia/Seoul') t`)).rows[0].n);
  eq(d.reduce((a, r) => a + r.dau, 0), raw);
  assert(d.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.day)));
  const ranged = (await asUser(U3, `select public.admin_dau(7) j`)).rows[0].j;
  eq(ranged.length, 7);
  eq((await asUser(U3, `select jsonb_array_length(public.admin_dau(100000)) n`)).rows[0].n, 365, 'days clamp');
});
await check('(g) admin_retention: cohorts with D1/D7/D30 eligible/retained/rate', async () => {
  const r = adminJson.admin_retention;
  assert(r.cohorts.length >= 2, 'cohort weeks');
  for (const k of ['d1', 'd7', 'd30']) {
    const o = r.overall[k];
    assert(o.eligible >= o.retained && o.retained >= 0);
  }
  assert(r.overall.d1.eligible > 0 && r.overall.d1.retained > 0, 'D1 seeded');
  assert(r.overall.d7.retained > 0, 'D7 seeded');
  assert(r.overall.d1.rate > 0 && r.overall.d1.rate <= 1);
  eq(r.cohorts.reduce((a, c) => a + c.d1.eligible, 0), r.overall.d1.eligible);
});
await check('(g) admin_feature_usage / admin_screens counts', async () => {
  const f = adminJson.admin_feature_usage;
  const names = f.map((x) => x.name);
  assert(names.includes('app_open') && names.includes('prayer_start') && names.includes('church_enter'));
  assert(!names.includes('screen_view') && !names.includes('error'));
  assert(f.every((x) => x.count >= x.users && x.users > 0));
  const s = adminJson.admin_screens;
  assert(s.map((x) => x.screen).sort().join() === 'home,prayer', 'screens');
});
await check('(g) admin_prayer_daily: per day + totals + per mystery', async () => {
  const p = adminJson.admin_prayer_daily;
  eq(p.daily.length, 30);
  const sumDaily = p.daily.reduce((a, d) => a + d.completed, 0);
  eq(p.totals.completed, sumDaily);
  const raw = (await sudo(`select count(*) filter (where completed)::int c, round(sum(seconds)/60.0,1)::float m from public.prayer_records
    where at >= ((now() at time zone 'Asia/Seoul')::date - 29)::timestamp at time zone 'Asia/Seoul'`)).rows[0];
  eq(p.totals.completed, raw.c);
  eq(Number(p.totals.minutes), raw.m);
  const bm = p.totals.by_mystery;
  eq(bm.joyful + bm.luminous + bm.sorrowful + bm.glorious, p.totals.completed);
  assert(p.users > 0);
});
await check('(g) admin_church_usage: per church, robust to junk numeric props', async () => {
  const c = adminJson.admin_church_usage;
  eq(c.map((x) => x.church).sort(), ['myeongdong', 'seoul_cathedral']);
  for (const x of c) {
    assert(x.enters > 0 && x.users > 0 && x.sits > 0 && x.candles > 0);
    eq(Number(x.seconds), x.enters * 300, 'seconds sum ignores junk');
    eq(Number(x.sat_seconds), x.enters * 120);
  }
});
await check('(g) admin_versions / admin_errors / admin_consent_rates', async () => {
  const v = adminJson.admin_versions;
  assert(v.app_versions.length >= 2 && v.os.length >= 2 && v.platforms.length >= 1);
  assert(v.app_versions.every((x) => x.devices > 0));
  const e = adminJson.admin_errors;
  eq(e.length, 1);
  eq([e[0].where, e[0].message], ['audio', 'player failed']);
  assert(e[0].count >= 1 && e[0].users >= 1);
  const c = adminJson.admin_consent_rates;
  eq(c.kinds.map((k) => k.kind), ['usage', 'sync', 'church', 'diagnostics']);
  const usage = c.kinds[0];
  eq(usage.granted, 12);
  assert(usage.rate > 0 && usage.rate <= 1 && c.kinds.every((k) => k.granted <= c.total_users));
});

// ---------------------------------------------------------------- retention / purge
await check('purge_old_data deletes events/devices older than 24 months and returns counts (service_role only)', async () => {
  const u = U4;
  await sudo(`insert into public.events(user_id, at, category, name) values
    ('${u}', now() - interval '25 months', 'usage', 'app_open'),
    ('${u}', now() - interval '30 months', 'usage', 'app_open'),
    ('${u}', now() - interval '23 months', 'usage', 'app_open')`);
  await sudo(`insert into public.devices(user_id, device_id, last_seen) values ('${u}', gen_random_uuid(), now() - interval '26 months')`);
  const r = (await as('service_role', null, `select public.purge_old_data() j`)).rows[0].j;
  eq(r, { events_deleted: 2, devices_deleted: 1 });
  eq(await count('events', `at < now() - interval '24 months'`), 0);
  assert((await count('events', `at < now() - interval '22 months' and at > now() - interval '24 months'`)) === 1, 'recent event kept');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) {
  console.log('Failed: ' + failures.join('; '));
  process.exit(1);
}
