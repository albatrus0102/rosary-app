// Tests for supabase/migrations/20261115000000_roadmap_items_3.sql on PGlite:
//   second ChatGPT review (screen captures): U-19.. seeded idempotently with mapped statuses, '[결정 필요]' notes,
//   note enrichment of first-review items only where the note is still the default, static seed JSON equals the DB.
// Run:  cd tools/auth_sql_tests && node roadmap_items3_test.mjs     (also part of `npm test`)
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const migDir = path.join(root, 'supabase/migrations');
const M1 = '20261113000000_roadmap.sql';
const M2 = '20261114000000_roadmap_items_2.sql';
const M3 = '20261115000000_roadmap_items_3.sql';
const ADMIN = '33333333-3333-4333-8333-333333333333';
const USER = '44444444-4444-4444-8444-444444444444';
// round 가 없는 것만 이 마이그레이션(1차 검토)의 몫이다. round 2 는 roadmap_items3_test.mjs 가 본다.
const U_ALL = JSON.parse(readFileSync(path.join(root, 'docs/ux/UX_REVIEW_ITEMS.json'), 'utf8'));
const U_ITEMS = U_ALL.filter((x) => x.round == null);
// 네 번째 마이그레이션(T-xx 추가 + C-12·G-01·G-29·U-33 보정)은 roadmap_items4_test.mjs 가 본다. 이 시험은 그 이전 상태와 비교한다.
const M4_IDS = new Set(['C-12', 'G-01', 'G-29', 'U-33']);
const U2_IDS = new Set(U_ALL.filter((x) => x.round === 2).map((x) => x.id));
const REVIEW2_IDS = new Set(U_ITEMS.filter((x) => x.review2).map((x) => x.id));
const G_ITEMS = JSON.parse(readFileSync(path.join(root, 'docs/ux/GLASS_ROADMAP_ITEMS.json'), 'utf8'));
const SEED = JSON.parse(readFileSync(path.join(root, 'admin/roadmap_seed.json'), 'utf8'));
const files = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
const sqlOf = (f) => readFileSync(path.join(migDir, f), 'utf8');

let passed = 0, failed = 0;
async function check(name, fn) {
  try { await fn(); passed++; console.log(`PASS  ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n      ${e.message}`); }
}
const assert = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || 'not equal'}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`); };
async function fails(fn, re) {
  try { await fn(); } catch (e) { if (re && !re.test(e.message)) throw new Error(`unexpected error: ${e.message}`); return; }
  throw new Error('expected an error but statement succeeded');
}

// A fresh in-memory DB with every migration before `upTo` applied.
async function boot(upTo) {
  const db = new PGlite();
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
  for (const f of files.filter((f) => f < upTo)) await db.exec(sqlOf(f));
  await db.query(`insert into auth.users (id, email) values ($1, 'admin@example.test'), ($2, 'user@example.test')`, [ADMIN, USER]);
  await db.exec(`insert into public.admins(user_id, email) values ('${ADMIN}', 'admin@example.test')`);
  const as = async (role, uid, sql, params) => {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`);
    if (role !== 'postgres') await db.exec(`set role ${role}`);
    try { return await db.query(sql, params); } finally { await db.exec('reset role'); }
  };
  return {
    db,
    sudo: (sql, p) => as('postgres', null, sql, p),
    asUser: (uid, sql, p) => as('authenticated', uid, sql, p),
    asAnon: (sql, p) => as('anon', null, sql, p),
  };
}
const n = async (h, where = 'true') => Number((await h.sudo(`select count(*)::int n from public.roadmap_items where ${where}`)).rows[0].n);


const U2 = U_ALL.filter((x) => x.round === 2);
const REVIEW2 = U_ITEMS.filter((x) => x.review2);
const STATUS = { todo: 'todo', in_progress: 'doing', review: 'review', done: 'done' };
const get = async (h, id) => (await h.sudo(`select status, owner_note from public.roadmap_items where id = '${id}'`)).rows[0];

await check('source JSON: second-review items are well formed (ids continue, evidence, statuses, decisions)', async () => {
  assert(U2.length >= 10 && U2.length <= 25, 'count ' + U2.length);
  eq(U2.map((x) => x.id), U2.map((_, i) => 'U-' + String(U_ITEMS.length + 1 + i).padStart(2, '0')), 'ids continue after the first review');
  for (const x of U2) {
    assert(/2차 ChatGPT 화면 캡처 검토/.test(x.evidence), x.id + ' evidence');
    assert(STATUS[x.status], x.id + ' status ' + x.status);
    assert(['R1', 'R2', 'R3'].includes(x.release) && /^P[012]$/.test(x.priority) && /^[SML]$/.test(x.effort), x.id + ' enums');
  }
  // the two P0 fixes are implemented (waiting for a device check), the device checklist is P0 and still to do
  eq(U2.filter((x) => x.priority === 'P0').map((x) => [x.id, x.status]), [['U-19', 'review'], ['U-20', 'review'], ['U-33', 'todo']]);
  // owner decisions are flagged, not decided
  eq(U2.filter((x) => x.decision).map((x) => x.id), ['U-22', 'U-28']);
  assert(U2.filter((x) => x.decision).every((x) => x.status === 'todo'), 'decision items are not started');
  assert(REVIEW2.length > 0 && REVIEW2.every((x) => x.review2.length < 480));
});

// ---- DB A: production-like upgrade (M1+M2 applied, the admin already edited rows)
const A = await boot(M3);
await check('before M3: 92 items, none of the second-review ids', async () => {
  eq(await n(A), 92);
  eq(await n(A, `id in (${U2.map((x) => `'${x.id}'`).join(',')})`), 0);
});
await A.asUser(ADMIN, `select public.admin_roadmap_set('U-01', 'doing', '내 메모')`);     // edited note must survive
await A.asUser(ADMIN, `select public.admin_roadmap_set('U-07', 'blocked', null)`);        // status edited, note still default
await A.db.exec(sqlOf(M3));

await check('M3 seeds the second-review items exactly as in the JSON, with mapped status and notes', async () => {
  eq(await n(A), 92 + U2.length);
  const rows = (await A.sudo(`select * from public.roadmap_items where id ~ '^U-' order by id`)).rows;
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  for (const x of U2) {
    const r = by[x.id];
    assert(r, 'missing ' + x.id);
    for (const k of ['title', 'category', 'release', 'priority', 'effort', 'risk', 'depends', 'evidence', 'value']) eq(r[k], x[k], `${x.id}.${k}`);
    eq(r.status, STATUS[x.status], x.id + ' status');
    if (x.decision) assert(r.owner_note.startsWith('[결정 필요] ' + x.decision), x.id + ' note ' + r.owner_note);
    else eq(r.owner_note, x.note || '2차 화면 캡처 검토', x.id + ' note');
    assert(r.owner_note.length <= 500);
  }
  const max = (await A.sudo(`select count(*)::int c, count(distinct sort_order)::int d from public.roadmap_items`)).rows[0];
  eq(max.c, max.d, 'sort_order is unique');
});

await check('M3 adds the second-review note only where the note was still the default; statuses never change', async () => {
  eq(await get(A, 'U-01'), { status: 'doing', owner_note: '내 메모' });
  const u07 = await get(A, 'U-07');
  eq(u07.status, 'blocked');
  assert(u07.owner_note.startsWith('2차 검토: '), u07.owner_note);
  for (const x of REVIEW2.filter((x) => !['U-01', 'U-07'].includes(x.id))) {
    eq(await get(A, x.id), { status: 'todo', owner_note: '2차 검토: ' + x.review2 }, x.id);
  }
  for (const x of U_ITEMS.filter((x) => !x.review2)) eq((await get(A, x.id)).owner_note, '신규(외부 UX 검토)', x.id);
});

// ---- DB B: untouched server with every migration
const B = await boot(M3);
await B.db.exec(sqlOf(M3));
await check('static fallback admin/roadmap_seed.json equals the DB after M3 (apart from what the 4th migration adds or fixes)', async () => {
  const rows = (await B.sudo(`select id, title, release, priority, effort, status, owner_note, sort_order from public.roadmap_items order by sort_order, id`)).rows;
  const seed = SEED.items.filter((i) => !/^T-/.test(i.id));
  eq(seed.length, rows.length);
  eq(seed.map((i) => i.id), rows.map((r) => r.id), 'same order');
  for (const r of rows) {
    const s = seed.find((i) => i.id === r.id);
    if (M4_IDS.has(r.id)) continue;
    eq([s.title, s.release, s.priority, s.effort, s.status, s.owner_note, s.sort_order], [r.title, r.release, r.priority, r.effort, r.status, r.owner_note, r.sort_order], r.id);
  }
  for (const s of SEED.items) for (const k of ['round', 'decision', 'review2', 'note']) assert(!(k in s), `${s.id}: seed json must not carry ${k}`);
  eq(seed.filter((i) => i.owner_note.startsWith('[결정 필요]')).map((i) => i.id), ['U-22', 'U-28']);
});

await check('re-running M3 (and M2) is idempotent and keeps admin edits', async () => {
  await B.asUser(ADMIN, `select public.admin_roadmap_set('U-19', 'done', '폰에서 확인')`);
  await B.asUser(ADMIN, `select public.admin_roadmap_set('U-22', 'dropped', '직접 고르기 유지')`);
  await B.asUser(ADMIN, `select public.admin_roadmap_set('U-12', null, '')`);     // cleared note is filled again (still "empty")
  await B.db.exec(sqlOf(M3));
  await B.db.exec(sqlOf(M2));
  await B.db.exec(sqlOf(M3));
  eq(await n(B), 92 + U2.length);
  eq(await get(B, 'U-19'), { status: 'done', owner_note: '폰에서 확인' });
  eq(await get(B, 'U-22'), { status: 'dropped', owner_note: '직접 고르기 유지' });
  assert((await get(B, 'U-12')).owner_note.startsWith('2차 검토: '));
  await B.sudo(`delete from public.roadmap_items where id = 'U-33'`);
  await B.db.exec(sqlOf(M3));
  eq(await n(B), 92 + U2.length);
});

await check('access rules are unchanged for the new rows', async () => {
  await fails(() => B.asUser(USER, `select public.admin_roadmap_set('U-20', 'done', 'x')`), /not_admin/);
  await fails(() => B.asAnon(`select public.admin_roadmap()`), /permission denied/);
  await fails(() => B.asUser(ADMIN, `select * from public.roadmap_items where id = 'U-20'`), /permission denied/);
  const board = (await B.asUser(ADMIN, `select public.admin_roadmap() j`)).rows[0].j;
  eq(board.items.length, 92 + U2.length);
  eq(board.items.filter((i) => i.status === 'review' && /^U-/.test(i.id)).map((i) => i.id), ['U-20']);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
