// Tests for supabase/migrations/20261116000000_roadmap_items_4.sql on PGlite:
//   remaining work registered as T-xx (예약·신규 요청·보류·결정 대기·출시 전·기술부채), seeded idempotently from
//   docs/ux/BACKLOG_ROADMAP_ITEMS.json; C-12/G-01/G-29/U-33 corrected without touching admin edits; earlier migration files unchanged;
//   static seed JSON equals the DB after every migration.
// Run:  cd tools/auth_sql_tests && node roadmap_items4_test.mjs     (also part of `npm test`)
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
const M4 = '20261116000000_roadmap_items_4.sql';
const ADMIN = '33333333-3333-4333-8333-333333333333';
const USER = '44444444-4444-4444-8444-444444444444';
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



const T = JSON.parse(readFileSync(path.join(root, 'docs/ux/BACKLOG_ROADMAP_ITEMS.json'), 'utf8'));
const U2N = JSON.parse(readFileSync(path.join(root, 'docs/ux/UX_REVIEW_ITEMS.json'), 'utf8')).filter((x) => x.round === 2).length;
const BASE = 40 + 18 + 34 + U2N;          // 107 before M4
const get = async (h, id) => (await h.sudo(`select title, status, owner_note, updated_at from public.roadmap_items where id = '${id}'`)).rows[0];
const OLD_G01 = 'IA 개편: 유리화 탭(기본) 추가, 성당을 유리화 탭의 [창|성당] 보기로 합침, 탭 4개 유지';

await check('earlier migration files are untouched (their seeds do not know T-xx or the M4 corrections)', async () => {
  for (const f of [M1, M2, M3]) {
    assert(!/'T-\d\d'/.test(sqlOf(f)), f + ' mentions T-xx');
    assert(!sqlOf(f).includes('성당 탭(기본)'), f + ' has the new G-01 title');
  }
  assert(sqlOf(M2).includes(OLD_G01), 'M2 still has the original G-01 title');
});

await check('source JSON: T items are well formed and grouped (3 예약, 1 신규, 3 보류, 10 결정, 8 출시 전, 8 기술부채)', async () => {
  assert(T.length >= 30 && T.length <= 50, 'count ' + T.length);
  const cat = (c) => T.filter((x) => x.category === c);
  eq(['예약(월 01시)', '신규 요청', '보류', '결정 대기', '출시 전', '기술부채'].map((c) => cat(c).length), [3, 1, 3, 10, 8, 8]);
  eq(new Set(T.map((x) => x.id)).size, T.length, 'unique ids');
  for (const x of T) {
    assert(/^T-\d\d$/.test(x.id), x.id);
    for (const k of ['title', 'risk', 'depends', 'value', 'evidence', 'note']) assert(typeof x[k] === 'string' && x[k].trim(), x.id + ' ' + k);
    assert(['R1', 'R2', 'R3'].includes(x.release) && /^P[012]$/.test(x.priority) && /^[SML]$/.test(x.effort), x.id + ' enums');
    assert(x.note.length <= 500, x.id + ' note length');
  }
  eq(cat('예약(월 01시)').map((x) => x.status), ['todo', 'todo', 'todo']);
  assert(cat('예약(월 01시)').every((x) => x.note.includes('2026-11-16') && x.note.includes('01:00')), 'scheduled notes carry the time');
  eq(cat('보류').map((x) => x.status), ['dropped', 'dropped', 'dropped']);
  assert(cat('결정 대기').every((x) => x.status === 'todo' && x.note.startsWith('[결정 필요]')), 'decision items');
  assert(cat('출시 전').every((x) => x.release === 'R1'), 'pre-release items are R1');
  eq(T.filter((x) => x.status === 'done').map((x) => x.id), ['T-55']);
  const t01 = T.find((x) => x.id === 'T-01'), t04 = T.find((x) => x.id === 'T-04');
  assert(/옛 작품/.test(t01.note) && /최후 수단/.test(t01.note) && /티에폴로/.test(t01.note), 'T-01 old-works-first note');
  assert(/우리 본당/.test(t04.title) && /명동/.test(t04.note) && /ai_stations_prompts/.test(t04.evidence), 'T-04 narrowed scope');
  // every dependency exists
  const ids = new Set([...SEED.items.map((i) => i.id)]);
  for (const x of T) for (const d of x.depends.split(/[,\s]+/).filter((v) => /^[A-Z]+-\d+$/.test(v))) assert(ids.has(d), x.id + ' dep ' + d);
});

// ---- DB A: production-like upgrade (M1..M3 applied, the admin already edited rows)
const A = await boot(M4);
await check('before M4: 107 items and no T-xx', async () => {
  eq(await n(A), BASE);
  eq(await n(A, `id like 'T-%'`), 0);
  eq((await get(A, 'G-01')).title, OLD_G01);
});
await A.asUser(ADMIN, `select public.admin_roadmap_set('G-29', 'blocked', null)`);      // status edited, note still default
await A.asUser(ADMIN, `select public.admin_roadmap_set('U-33', null, '내 메모')`);       // note edited
await A.asUser(ADMIN, `select public.admin_roadmap_set('C-12', null, '교구 검수 중')`);  // note edited, status still todo
await A.db.exec(sqlOf(M4));

await check('M4 seeds the T items exactly as in the JSON (status, note, sort_order after the existing rows)', async () => {
  eq(await n(A), BASE + T.length);
  const rows = (await A.sudo(`select * from public.roadmap_items where id like 'T-%' order by sort_order`)).rows;
  eq(rows.map((r) => r.id), T.map((x) => x.id));
  for (const x of T) {
    const r = rows.find((y) => y.id === x.id);
    for (const k of ['title', 'category', 'release', 'priority', 'effort', 'risk', 'depends', 'evidence', 'value', 'status']) eq(r[k], x[k], `${x.id}.${k}`);
    eq(r.owner_note, x.note, x.id + ' note');
  }
  const m = (await A.sudo(`select count(*)::int c, count(distinct sort_order)::int d, min(sort_order)::int lo from public.roadmap_items where id like 'T-%'`)).rows[0];
  eq([m.c, m.d, m.lo], [T.length, T.length, BASE + 1]);
  const all = (await A.sudo(`select count(*)::int c, count(distinct sort_order)::int d from public.roadmap_items`)).rows[0];
  eq(all.c, all.d, 'sort_order unique across the board');
});

await check('M4 corrects C-12 / G-01 / G-29 / U-33 but keeps what the admin edited', async () => {
  const c12 = await get(A, 'C-12');
  eq([c12.status, c12.owner_note], ['review', '교구 검수 중'], 'C-12: status moved, own note kept');
  const g01 = await get(A, 'G-01');
  assert(g01.title.startsWith('IA 개편: 성당 탭(기본) + [성당|창]'), g01.title);
  eq(g01.status, 'done');
  assert(g01.owner_note.startsWith('2026-11-13 완료'), g01.owner_note);
  const g29 = await get(A, 'G-29');
  eq(g29.status, 'blocked', 'admin status kept');
  assert(g29.owner_note.startsWith('2026-11-13 완료'), 'default note filled');
  eq((await get(A, 'U-33')).owner_note, '내 메모');
  eq((await get(A, 'U-33')).status, 'todo');
  for (const id of ['U-22', 'U-28', 'U-19']) assert((await get(A, id)).status !== undefined);
});

// ---- DB B: untouched server with every migration
const B = await boot(M4);
await B.db.exec(sqlOf(M4));
await check('static fallback admin/roadmap_seed.json equals the DB after all migrations', async () => {
  const rows = (await B.sudo(`select id, title, category, release, priority, effort, risk, depends, evidence, value, status, owner_note, sort_order from public.roadmap_items order by sort_order, id`)).rows;
  eq(SEED.items.length, rows.length);
  eq(SEED.items.length, BASE + T.length);
  eq(SEED.items.map((i) => i.id), rows.map((r) => r.id), 'same order');
  for (const r of rows) {
    const s = SEED.items.find((i) => i.id === r.id);
    eq(Object.keys(s).sort(), Object.keys(r).sort(), r.id + ' keys');
    for (const k of Object.keys(r)) eq(s[k], r[k], `${r.id}.${k}`);
  }
  eq(SEED.items.filter((i) => i.category === '예약(월 01시)').map((i) => i.id), ['T-01', 'T-02', 'T-03']);
});

await check('re-running M4 (and M3, M2) is idempotent: no new rows, no change to rows already corrected, admin edits kept', async () => {
  const before = await get(B, 'G-01');
  await B.asUser(ADMIN, `select public.admin_roadmap_set('T-01', 'doing', '진행 중')`);
  await B.asUser(ADMIN, `select public.admin_roadmap_set('T-17', 'dropped', '현재 유지로 결정')`);
  await B.db.exec(sqlOf(M4));
  await B.db.exec(sqlOf(M3));
  await B.db.exec(sqlOf(M2));
  await B.db.exec(sqlOf(M4));
  eq(await n(B), BASE + T.length);
  eq(await get(B, 'T-01').then((r) => [r.status, r.owner_note]), ['doing', '진행 중']);
  eq(await get(B, 'T-17').then((r) => [r.status, r.owner_note]), ['dropped', '현재 유지로 결정']);
  const after = await get(B, 'G-01');
  eq([after.title, after.status, after.owner_note], [before.title, before.status, before.owner_note]);
  eq(String(after.updated_at), String(before.updated_at), 'G-01 updated_at not touched by the re-run');
  await B.sudo(`delete from public.roadmap_items where id = 'T-30'`);
  await B.db.exec(sqlOf(M4));
  eq(await n(B), BASE + T.length);
});

await check('access rules are unchanged for the T rows; admin_roadmap returns every item', async () => {
  await fails(() => B.asUser(USER, `select public.admin_roadmap_set('T-01', 'done', 'x')`), /not_admin/);
  await fails(() => B.asAnon(`select public.admin_roadmap()`), /permission denied/);
  await fails(() => B.asUser(ADMIN, `select * from public.roadmap_items where id = 'T-01'`), /permission denied/);
  const board = (await B.asUser(ADMIN, `select public.admin_roadmap() j`)).rows[0].j;
  eq(board.items.length, BASE + T.length);
  eq(new Set(board.items.map((i) => i.id)).size, BASE + T.length, 'unique ids');
  const orders = board.items.map((i) => i.sort_order);
  eq(orders, [...orders].sort((a, b) => a - b), 'sorted by sort_order');
  const c = (rel) => board.items.filter((i) => i.release === rel).length;
  eq(['G1', 'G2', 'G3'].map(c), [15, 13, 6]);
  eq(['R1', 'R2', 'R3'].map(c).reduce((a, b) => a + b, 0), BASE - 34 + T.length);
  const r = (await B.asUser(ADMIN, `select public.admin_roadmap_set('T-05', 'todo', '시스티나 진행') j`)).rows[0].j;     // a held item can be revived
  eq([r.id, r.status, r.category], ['T-05', 'todo', '보류']);
  await fails(() => B.asUser(ADMIN, `select public.admin_roadmap_set('T-99', 'done', '')`), /not_found/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
