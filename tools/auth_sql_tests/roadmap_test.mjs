// Tests for supabase/migrations/20261113000000_roadmap.sql (roadmap board RPCs) on PGlite, run after ALL migrations
// (so 20261114000000_roadmap_items_2.sql has added the U-xx / G-xx rows). See roadmap_items2_test.mjs for that migration itself.
// Run:  cd tools/auth_sql_tests && node roadmap_test.mjs     (also part of `npm test`)
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.resolve(here, '../../supabase/migrations');
const db = new PGlite();
const ADMIN = '33333333-3333-4333-8333-333333333333';
const USER = '44444444-4444-4444-8444-444444444444';

let passed = 0, failed = 0;
async function check(name, fn) {
  try { await fn(); passed++; console.log(`PASS  ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n      ${e.message}`); }
}
const assert = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || 'not equal'}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`); };
async function as(role, uid, sql, params) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`);
  if (role !== 'postgres') await db.exec(`set role ${role}`);
  try { return await db.query(sql, params); } finally { await db.exec('reset role'); }
}
const asUser = (uid, sql, p) => as('authenticated', uid, sql, p);
const asAnon = (sql, p) => as('anon', null, sql, p);
const sudo = (sql, p) => as('postgres', null, sql, p);
async function fails(fn, re) {
  try { await fn(); } catch (e) { if (re && !re.test(e.message)) throw new Error(`unexpected error: ${e.message}`); return; }
  throw new Error('expected an error but statement succeeded');
}

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_app_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`);
const files = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
const roadmapSql = readFileSync(path.join(migDir, '20261113000000_roadmap.sql'), 'utf8');
const roadmap2Sql = readFileSync(path.join(migDir, '20261114000000_roadmap_items_2.sql'), 'utf8');
for (const f of files) await db.exec(readFileSync(path.join(migDir, f), 'utf8'));
await db.query(`insert into auth.users (id, email) values ($1, 'admin@example.test'), ($2, 'user@example.test')`, [ADMIN, USER]);
await sudo(`insert into public.admins(user_id, email) values ('${ADMIN}', 'admin@example.test')`);

const CALLS = ['admin_roadmap()', `admin_roadmap_set('M-01', 'done', 'x')`];

await check('non-admin (authenticated) and anon cannot call roadmap RPCs', async () => {
  for (const c of CALLS) {
    await fails(() => asUser(USER, `select public.${c}`), /not_admin/);
    await fails(() => asAnon(`select public.${c}`), /permission denied/);
  }
  eq((await sudo(`select status from public.roadmap_items where id = 'M-01'`)).rows[0].status, 'review', 'non-admin write must not apply');
});
await check('nobody can read or write roadmap tables directly (no table privileges)', async () => {
  for (const t of ['roadmap_items', 'roadmap_decisions']) {
    await fails(() => asUser(USER, `select * from public.${t}`), /permission denied/);
    await fails(() => asUser(ADMIN, `select * from public.${t}`), /permission denied/);
    await fails(() => asAnon(`select * from public.${t}`), /permission denied/);
  }
  await fails(() => asUser(ADMIN, `update public.roadmap_items set status = 'done'`), /permission denied/);
  await fails(() => asUser(USER, `insert into public.roadmap_decisions values ('Q9','q','d','r', now()::date)`), /permission denied/);
  const rls = (await sudo(`select relname, relrowsecurity from pg_class where relname in ('roadmap_items','roadmap_decisions') order by 1`)).rows;
  eq(rls.map((r) => r.relrowsecurity), [true, true], 'RLS enabled on both tables');
});

let board;
await check('admin lists the 40 original items (+18 U, +34 G) and 8 decisions with expected seed content', async () => {
  board = (await asUser(ADMIN, `select public.admin_roadmap() j`)).rows[0].j;
  const base = board.items.filter((i) => /^[A-Z]+-\d+$/.test(i.id) && !/^[UG]-/.test(i.id));
  eq(base.length, 40, 'original UX_PLAN items');
  eq(board.items.length, 40 + 18 + 34, 'all items');
  eq(board.decisions.length, 8);
  eq(board.decisions.map((d) => d.id), ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8']);
  const by = (r) => base.filter((i) => i.release === r);
  eq([by('R1').length, by('R2').length, by('R3').length], [14, 19, 7]);
  eq(by('R1').map((i) => i.status).filter((s) => s !== 'review').length, 0, 'all R1 review');
  // 2번째 마이그레이션이 C-09(구현됨, 실기기 확인 대기)를 review 로 올린다. 나머지 R2/R3 는 todo.
  eq(base.filter((i) => i.release !== 'R1' && i.status !== 'todo').map((i) => i.id), ['C-09'], 'only C-09 moved to review');
  eq(base.find((i) => i.id === 'C-09').status, 'review');
  eq(base.filter((i) => i.priority === 'P0').length, 14);
  eq(base.filter((i) => i.priority === 'P1').length, 19);
  eq(base.filter((i) => i.priority === 'P2').length, 7);
  eq(board.items.filter((i) => i.id === 'P-05' || i.id === 'C-10').map((i) => i.release), ['R2', 'R2']);
  eq(board.items[0].id, 'M-01', 'ordered by sort_order');
  assert(board.decisions.every((d) => d.decided_on === '2026-11-12' && d.decision && d.question));
});
await check('admin can update status and note; updated_at moves', async () => {
  const before = (await sudo(`select updated_at from public.roadmap_items where id = 'P-01'`)).rows[0].updated_at;
  await sudo(`select pg_sleep(0.01)`);
  const r = (await asUser(ADMIN, `select public.admin_roadmap_set('P-01', 'review', '실기기 확인 필요') j`)).rows[0].j;
  eq([r.id, r.status, r.owner_note], ['P-01', 'review', '실기기 확인 필요']);
  const row = (await sudo(`select status, owner_note, updated_at from public.roadmap_items where id = 'P-01'`)).rows[0];
  eq([row.status, row.owner_note], ['review', '실기기 확인 필요']);
  assert(new Date(row.updated_at) > new Date(before), 'updated_at advanced');
  // null = unchanged
  await asUser(ADMIN, `select public.admin_roadmap_set('P-01', null, '메모만')`);
  await asUser(ADMIN, `select public.admin_roadmap_set('P-01', 'done', null)`);
  const r2 = (await sudo(`select status, owner_note from public.roadmap_items where id = 'P-01'`)).rows[0];
  eq([r2.status, r2.owner_note], ['done', '메모만']);
  const again = (await asUser(ADMIN, `select public.admin_roadmap() j`)).rows[0].j;
  eq(again.items.find((i) => i.id === 'P-01').status, 'done');
});
await check('invalid status, too-long note and unknown id are rejected without changes', async () => {
  await fails(() => asUser(ADMIN, `select public.admin_roadmap_set('P-02', 'finished', '')`), /invalid_status/);
  await fails(() => asUser(ADMIN, `select public.admin_roadmap_set('P-02', 'done', repeat('가', 501))`), /note_too_long/);
  await fails(() => asUser(ADMIN, `select public.admin_roadmap_set('ZZ-99', 'done', '')`), /not_found/);
  const ok = (await asUser(ADMIN, `select public.admin_roadmap_set('P-02', 'blocked', repeat('가', 500)) j`)).rows[0].j;
  eq(ok.owner_note.length, 500, '500 chars accepted');
  eq((await sudo(`select status from public.roadmap_items where id = 'P-02'`)).rows[0].status, 'blocked');
  await fails(() => sudo(`update public.roadmap_items set release = 'R9' where id = 'P-02'`), /check/);
  await fails(() => sudo(`update public.roadmap_items set release = 'G4' where id = 'P-02'`), /check/);
  await fails(() => sudo(`update public.roadmap_items set effort = 'XL' where id = 'P-02'`), /check/);
});
await check('re-running the migration (seed) does not overwrite edits and adds no rows', async () => {
  await db.exec(roadmapSql);
  await db.exec(roadmapSql);
  const rows = (await sudo(`select id, status, owner_note from public.roadmap_items where id in ('P-01','P-02')  order by id`)).rows;
  eq([rows[0].status, rows[0].owner_note], ['done', '메모만']);
  eq(rows[1].status, 'blocked');
  eq(Number((await sudo(`select count(*)::int n from public.roadmap_items`)).rows[0].n), 92);
  eq(Number((await sudo(`select count(*)::int n from public.roadmap_decisions`)).rows[0].n), 8);
});
await check('seed fills rows that were deleted but keeps the others', async () => {
  await sudo(`delete from public.roadmap_items where id = 'B-01'`);
  await sudo(`delete from public.roadmap_items where id = 'U-01'`);
  await db.exec(roadmapSql);                                   // 1st migration brings back B-01 only
  eq(Number((await sudo(`select count(*)::int n from public.roadmap_items`)).rows[0].n), 91);
  await db.exec(roadmap2Sql);                                  // 2nd migration brings back U-01
  eq(Number((await sudo(`select count(*)::int n from public.roadmap_items`)).rows[0].n), 92);
  eq((await sudo(`select status from public.roadmap_items where id = 'P-01'`)).rows[0].status, 'done');
});
await check('functions are SECURITY DEFINER with fixed search_path and not executable by public/anon', async () => {
  const r = (await sudo(`select proname, prosecdef, proconfig::text cfg, has_function_privilege('anon', oid, 'execute') a,
      has_function_privilege('authenticated', oid, 'execute') u
    from pg_proc where proname in ('admin_roadmap','admin_roadmap_set') order by 1`)).rows;
  eq(r.length, 2);
  for (const f of r) { eq([f.prosecdef, f.a, f.u], [true, false, true], f.proname); assert(/search_path=public, pg_temp/.test(f.cfg), 'search_path ' + f.cfg); }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
