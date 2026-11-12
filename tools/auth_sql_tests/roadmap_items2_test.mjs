// Tests for supabase/migrations/20261114000000_roadmap_items_2.sql on PGlite:
//   release check relaxed to R1..R3,G1..G3 · U-xx (external UX review) and G-xx (glass plan) seeded idempotently ·
//   status reality-sync only touches rows still todo/doing · admin RPCs unchanged in access rules.
// Run:  cd tools/auth_sql_tests && node roadmap_items2_test.mjs     (also part of `npm test`)
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const migDir = path.join(root, 'supabase/migrations');
const M1 = '20261113000000_roadmap.sql';
const M2 = '20261114000000_roadmap_items_2.sql';
const ADMIN = '33333333-3333-4333-8333-333333333333';
const USER = '44444444-4444-4444-8444-444444444444';
const U_ITEMS = JSON.parse(readFileSync(path.join(root, 'docs/ux/UX_REVIEW_ITEMS.json'), 'utf8'));
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

// A fresh in-memory DB with every migration before M2 applied (the state of a production server today).
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

// ---- DB A: production-like upgrade path (admin has already edited some rows before M2 is applied)
const A = await boot(M2);

await check('before M2: G releases are rejected and only the 40 original items exist', async () => {
  eq(await n(A), 40);
  await fails(() => A.sudo(`update public.roadmap_items set release = 'G1' where id = 'M-01'`), /check/);
});

// admin edits made on the live server before the upgrade
await A.asUser(ADMIN, `select public.admin_roadmap_set('M-01', 'done', '폰에서 확인함')`);
await A.asUser(ADMIN, `select public.admin_roadmap_set('C-09', 'blocked', '장의자 경로 문제')`);   // owner already decided: must survive
await A.asUser(ADMIN, `select public.admin_roadmap_set('C-05', 'doing', null)`);
const M1_ONLY_BOARD = (await A.asUser(ADMIN, `select public.admin_roadmap() j`)).rows[0].j;

await A.db.exec(sqlOf(M2));

await check('constraint now accepts exactly R1,R2,R3,G1,G2,G3 (single release check)', async () => {
  for (const r of ['R1', 'R2', 'R3', 'G1', 'G2', 'G3']) {
    await A.sudo(`update public.roadmap_items set release = '${r}' where id = 'C-12'`);
    eq((await A.sudo(`select release from public.roadmap_items where id = 'C-12'`)).rows[0].release, r);
  }
  await A.sudo(`update public.roadmap_items set release = 'R3' where id = 'C-12'`);
  for (const bad of ['G4', 'G0', 'R4', 'g1', 'r1', '', 'G1 ', 'X1']) {
    await fails(() => A.sudo(`update public.roadmap_items set release = '${bad}' where id = 'C-12'`), /check/);
  }
  await fails(() => A.sudo(`update public.roadmap_items set release = null where id = 'C-12'`), /null|not-null|violates/);
  const cons = (await A.sudo(`select conname, pg_get_constraintdef(oid) def from pg_constraint
     where conrelid = 'public.roadmap_items'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%release%'`)).rows;
  eq(cons.length, 1, 'exactly one release check');
  assert(/G3/.test(cons[0].def) && !/G4/.test(cons[0].def), cons[0].def);
  // other checks survive
  await fails(() => A.sudo(`update public.roadmap_items set priority = 'P9' where id = 'M-01'`), /check/);
  await fails(() => A.sudo(`update public.roadmap_items set status = 'finished' where id = 'M-01'`), /check/);
});

await check('inserting new rows works for G1..G3 and still rejects bad releases', async () => {
  const ins = (id, rel) => A.sudo(`insert into public.roadmap_items (id, title, category, release, priority, effort) values ('${id}', 't', 'c', '${rel}', 'P1', 'S')`);
  for (const [id, rel] of [['T-1', 'G1'], ['T-2', 'G2'], ['T-3', 'G3']]) await ins(id, rel);
  await fails(() => ins('T-4', 'G9'), /check/);
  await A.sudo(`delete from public.roadmap_items where id like 'T-%'`);
});

await check('seeds 18 U items and 34 G items exactly as in the JSON sources (92 total)', async () => {
  eq(await n(A), 92);
  eq(await n(A, `id like 'U-%'`), U_ITEMS.length);
  eq(await n(A, `id like 'G-%'`), 34);
  eq(G_ITEMS.length, 34);
  const rows = (await A.sudo(`select * from public.roadmap_items where id ~ '^[UG]-' order by id`)).rows;
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  for (const x of [...U_ITEMS, ...G_ITEMS]) {
    const r = by[x.id];
    assert(r, 'missing ' + x.id);
    for (const k of ['title', 'category', 'release', 'priority', 'effort', 'risk', 'depends', 'evidence', 'value']) eq(r[k], x[k], `${x.id}.${k}`);
    eq(r.status, 'todo', x.id + ' status');
    eq(r.owner_note, x.id.startsWith('U-') ? '신규(외부 UX 검토)' : '제안: 소유자 확인 대기', x.id + ' note');
  }
  eq([...new Set(U_ITEMS.map((x) => x.release))].sort(), ['R1', 'R2'], 'U releases');
  eq(['G1', 'G2', 'G3'].map((r) => G_ITEMS.filter((x) => x.release === r).length), [15, 13, 6]);
  assert(U_ITEMS.every((x) => /CHATGPT_REVIEW §\d/.test(x.evidence)), 'U evidence cites CHATGPT_REVIEW §n');
  assert(U_ITEMS.every((x) => !/^R/.test(x.release) || ['R1', 'R2', 'R3'].includes(x.release)));
});

await check('reality sync: C-09 todo -> review with note; admin-edited rows are not touched', async () => {
  const get = async (id) => (await A.sudo(`select status, owner_note from public.roadmap_items where id = '${id}'`)).rows[0];
  // C-09 was set to blocked by the owner before the upgrade: must stay
  eq(M1_ONLY_BOARD.items.find((i) => i.id === 'C-09').status, 'blocked');
  eq(await get('C-09'), { status: 'blocked', owner_note: '장의자 경로 문제' });
  eq((await get('M-01')).status, 'done');
  eq((await get('C-05')).status, 'doing');
  // everything else among the original 40 keeps its pre-upgrade status
  const after = (await A.asUser(ADMIN, `select public.admin_roadmap() j`)).rows[0].j;
  // (M2 only fills still-empty implementation notes of P-02, S-01, O-01, C-04; statuses never change here)
  const FILLED = new Set(['P-02', 'S-01', 'O-01', 'C-04']);
  for (const o of M1_ONLY_BOARD.items) {
    const a = after.items.find((i) => i.id === o.id);
    eq(a.status, o.status, o.id + ' status');
    if (FILLED.has(o.id) && o.owner_note === '') assert(a.owner_note.length > 0, o.id + ' note filled');
    else eq(a.owner_note, o.owner_note, o.id + ' note');
  }
});

// ---- DB B: untouched production-like state: the status sync applies
const B = await boot(M2);
await B.db.exec(sqlOf(M2));
await check('reality sync on an untouched server: only C-09 moves (todo -> review) and gets the note', async () => {
  const board = (await B.asUser(ADMIN, `select public.admin_roadmap() j`)).rows[0].j;
  const base = board.items.filter((i) => !/^[UG]-/.test(i.id));
  eq(base.length, 40);
  eq(base.filter((i) => i.status === 'review').length, 15, '14 R1 + C-09');
  eq(base.filter((i) => i.status === 'todo').length, 25);
  const c09 = base.find((i) => i.id === 'C-09');
  eq(c09.status, 'review');
  assert(/실기기 확인 대기/.test(c09.owner_note), c09.owner_note);
});

await check('static fallback admin/roadmap_seed.json equals the DB after all migrations', async () => {
  const rows = (await B.sudo(`select id, release, priority, effort, status, owner_note, sort_order from public.roadmap_items order by sort_order, id`)).rows;
  eq(SEED.items.length, rows.length);
  for (const r of rows) {
    const s = SEED.items.find((i) => i.id === r.id);
    assert(s, 'seed json lacks ' + r.id);
    eq([s.release, s.priority, s.effort, s.status, s.owner_note, s.sort_order], [r.release, r.priority, r.effort, r.status, r.owner_note, r.sort_order], r.id);
  }
  eq(SEED.decisions.length, 8);
  const c = (rel) => SEED.items.filter((i) => i.release === rel).length;
  eq(['R1', 'R2', 'R3', 'G1', 'G2', 'G3'].map(c), [14 + U_ITEMS.filter((x) => x.release === 'R1').length, 19 + U_ITEMS.filter((x) => x.release === 'R2').length, 7 + U_ITEMS.filter((x) => x.release === 'R3').length, 15, 13, 6]);
});

await check('re-running M2 (and M1) is idempotent: no new rows, admin edits kept, one constraint', async () => {
  await B.asUser(ADMIN, `select public.admin_roadmap_set('U-01', 'doing', '오늘 시작')`);
  await B.asUser(ADMIN, `select public.admin_roadmap_set('G-01', 'dropped', '보류')`);
  await B.asUser(ADMIN, `select public.admin_roadmap_set('C-09', 'done', '폰 확인 완료')`);
  await B.db.exec(sqlOf(M2));
  await B.db.exec(sqlOf(M1));
  await B.db.exec(sqlOf(M2));
  eq(await n(B), 92);
  const g = async (id) => (await B.sudo(`select status, owner_note from public.roadmap_items where id = '${id}'`)).rows[0];
  eq(await g('U-01'), { status: 'doing', owner_note: '오늘 시작' });
  eq(await g('G-01'), { status: 'dropped', owner_note: '보류' });
  eq(await g('C-09'), { status: 'done', owner_note: '폰 확인 완료' }, 'done is never pulled back to review');
  const cons = (await B.sudo(`select count(*)::int c from pg_constraint where conrelid = 'public.roadmap_items'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%release%'`)).rows[0].c;
  eq(Number(cons), 1);
  // a deleted row is re-seeded, a reverted C-09 'todo' (admin put it back) is moved again only while todo/doing
  await B.sudo(`delete from public.roadmap_items where id = 'U-05'`);
  await B.db.exec(sqlOf(M2));
  eq(await n(B), 92);
  await B.asUser(ADMIN, `select public.admin_roadmap_set('C-09', 'todo', '')`);
  await B.db.exec(sqlOf(M2));
  eq((await g('C-09')).status, 'review');
});

await check('non-admin and anon are still blocked; tables stay closed (also for the new rows)', async () => {
  for (const c of [`admin_roadmap()`, `admin_roadmap_set('G-01', 'done', 'x')`, `admin_roadmap_set('U-01', 'done', 'x')`]) {
    await fails(() => B.asUser(USER, `select public.${c}`), /not_admin/);
    await fails(() => B.asAnon(`select public.${c}`), /permission denied/);
  }
  eq((await B.sudo(`select status from public.roadmap_items where id = 'U-02'`)).rows[0].status, 'todo');
  for (const who of [() => B.asUser(USER, `select * from public.roadmap_items`), () => B.asUser(ADMIN, `select * from public.roadmap_items where id = 'G-01'`), () => B.asAnon(`select * from public.roadmap_items`)]) {
    await fails(who, /permission denied/);
  }
  await fails(() => B.asUser(ADMIN, `insert into public.roadmap_items (id, title, category, release, priority, effort) values ('G-99', 't', 'c', 'G1', 'P0', 'S')`), /permission denied/);
  eq((await B.sudo(`select relrowsecurity from pg_class where relname = 'roadmap_items'`)).rows[0].relrowsecurity, true);
});

await check('admin_roadmap returns all 92 items (R1 23, R2 28, R3 7, G1 15, G2 13, G3 6) and 8 decisions', async () => {
  const board = (await B.asUser(ADMIN, `select public.admin_roadmap() j`)).rows[0].j;
  eq(board.items.length, 92);
  eq(board.decisions.length, 8);
  const c = (rel) => board.items.filter((i) => i.release === rel).length;
  eq(['R1', 'R2', 'R3', 'G1', 'G2', 'G3'].map(c), [14 + U_ITEMS.filter((x) => x.release === 'R1').length, 19 + U_ITEMS.filter((x) => x.release === 'R2').length, 7, 15, 13, 6]);
  eq(['R1', 'R2', 'R3', 'G1', 'G2', 'G3'].map(c).reduce((a, b) => a + b, 0), 92);
  eq(new Set(board.items.map((i) => i.id)).size, 92, 'unique ids');
  const orders = board.items.map((i) => i.sort_order);
  eq(orders, [...orders].sort((a, b) => a - b), 'sorted by sort_order');
});

await check('admin can set status/note on U and G items through the RPC', async () => {
  const r = (await B.asUser(ADMIN, `select public.admin_roadmap_set('G-02', 'review', '검증 완료') j`)).rows[0].j;
  eq([r.id, r.release, r.status, r.owner_note], ['G-02', 'G1', 'review', '검증 완료']);
  const r2 = (await B.asUser(ADMIN, `select public.admin_roadmap_set('U-10', 'doing', null) j`)).rows[0].j;
  eq([r2.status, r2.owner_note], ['doing', '신규(외부 UX 검토)']);
  await fails(() => B.asUser(ADMIN, `select public.admin_roadmap_set('G-02', 'finished', '')`), /invalid_status/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
