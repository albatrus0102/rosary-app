// UX_PLAN.md 의 4장(과제 표) · 6장(릴리스) · 7장(결정 사항)을 읽어
//   - supabase/migrations/20261113000000_roadmap.sql  (스키마 + 멱등 시드)
//   - admin/roadmap_seed.json                         (RPC 가 없을 때 읽기 전용 대체본)
// 을 생성한다.  사용:  node admin/tools_seed_roadmap.mjs   (저장소 어디서든 실행 가능)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(path.join(root, 'docs/ux/UX_PLAN.md'), 'utf8');
const DECIDED_ON = '2026-11-12';
const DOING = new Set('M-01,P-01,P-02,P-03,A-01,O-01,O-02,C-01,C-02,C-03,C-04,S-01,D-01,X-01'.split(','));

function section(re) {
  const m = md.match(re);
  if (!m) throw new Error('section not found: ' + re);
  return m.index;
}
function rowsOf(text) {
  return text.split('\n').filter((l) => l.startsWith('|')).map((l) => l.replace(/^\||\|\s*$/g, '').split(/(?<!\\)\|/).map((c) => c.trim()));
}

// ---- 4장 표
const s4 = section(/^## 4\. /m), s41 = section(/^### 4\.1 /m);
const t4 = rowsOf(md.slice(s4, s41)).filter((r) => /^[A-Z]+-\d+$/.test(r[0]));
if (t4.length !== 40) throw new Error('expected 40 items, got ' + t4.length);

// ---- 6장 릴리스
const s6 = section(/^## 6\. /m), s7 = section(/^## 7\. /m);
const sec6 = md.slice(s6, s7);
function ids(re) {
  const m = sec6.match(re);
  if (!m) throw new Error('release block not found: ' + re);
  return [...m[0].matchAll(/`([^`]+)`/g)].flatMap((x) => x[1].split(/[,\s]+/)).filter((x) => /^[A-Z]+-\d+$/.test(x));
}
// R1: "### R1" ~ 다음 "###" 전까지 / R2 도 동일 (설명 속 `C-10` 등도 포함되도록 코드 span 전부 수집)
const block = (name) => { const a = sec6.search(new RegExp('^### ' + name, 'm')); const rest = sec6.slice(a + 4); const b = rest.search(/^### /m); return sec6.slice(a, b < 0 ? undefined : a + 4 + b); };
const rel = {};
for (const [name, r] of [['R1', 'R1'], ['R2', 'R2']]) {
  const b = block(name);
  // 순위 설명("순서는 ...")은 R1 의 같은 항목을 다시 나열하므로 중복 허용, 첫 등장 기준으로 한 번만 지정
  for (const m of b.matchAll(/`([^`]+)`/g)) for (const id of m[1].split(/[,\s]+/)) if (/^[A-Z]+-\d+$/.test(id)) rel[id] ??= r;
}
const R3_DOC = block('R3').match(/`([^`]+)`/)[1].split(/[,\s]+/).filter(Boolean);
for (const id of R3_DOC) if (rel[id]) throw new Error('R3 id also in R1/R2: ' + id);

const items = t4.map((r, i) => {
  const [id, title, category, evidence, value, effort, risk, priority, depends] = r;
  if (!/^[SML]$/.test(effort) || !/^P[012]$/.test(priority)) throw new Error('bad row ' + id);
  return { id, title, category, release: rel[id] || 'R3', priority, effort, risk, depends, evidence, value,
    status: DOING.has(id) ? 'doing' : 'todo', owner_note: '', sort_order: i + 1 };
});
const ids40 = new Set(items.map((x) => x.id));
for (const id of Object.keys(rel)) if (!ids40.has(id)) throw new Error('release lists unknown id ' + id);
for (const id of DOING) if (!ids40.has(id) || rel[id] !== 'R1') throw new Error('doing id not in R1: ' + id);
for (const id of R3_DOC) if (!ids40.has(id)) throw new Error('R3 unknown id ' + id);

// ---- 7장 결정
const strip = (t) => t.replace(/\*\*/g, '').replace(/`\[[^\]]*\]`/g, '').replace(/\s+/g, ' ').replace(/\s+([)）])/g, '$1').trim();
const RATIONALE = {
  Q1: '산사·InPeace·바오로딸·Righthand가 모두 무가입이고 강제 로그인은 불만의 중심. 익명 사용자도 auth.users 행이라 RLS·동의·이벤트 구조를 그대로 쓴다. (UX_PLAN 4.1)',
  Q2: '한국 앱들이 두 방식을 모두 지원한다. 선택지를 남기되 기본값만 정한다. 54일 규칙은 D-02(교리 검토) 대상.',
  Q3: '자유 입력이 없으면 신고할 거리도 거의 없고, 신고 처리 운영을 1인이 감당할 수 없다. (UX_PLAN 4.1 소셜은 프리셋으로만)',
  Q4: '실존 성당 모형은 사칭 인상을 줄 수 있어 고지(D-01)를 넣고 홍보 전 교구 홍보 담당에게 알린다.',
  Q5: '기도 중 결제·유료 봉헌초는 성물·은총 매매로 읽힌다. 후원을 넣더라도 기도 밖 한 곳에서만. (UX_PLAN 5장)',
  Q6: '잘못된 기본값과 큰 소리 알림이 대표적 불만이다. 첫 완주 직후에 한 번만 묻는다. (R-01)',
  Q7: '사람 목소리 선호가 있으나 당장은 AI 음성 + 고지(D-01)로 시작하고 사람 녹음 협조는 R3 과제로 둔다.',
  Q8: '사실감을 우선하는 사용자 결정을 존중해 강제 전환은 하지 않는다. (C-10, C-04)',
};
const t7 = rowsOf(md.slice(s7)).filter((r) => /^Q\d+$/.test(r[0]));
if (t7.length !== 8) throw new Error('expected 8 decisions, got ' + t7.length);
const decisions = t7.map(([id, question, def]) => ({
  id, question: strip(question), decision: '권장 기본값 채택: ' + strip(def), rationale: RATIONALE[id], decided_on: DECIDED_ON,
}));

// ---- JSON
writeFileSync(path.join(root, 'admin/roadmap_seed.json'),
  JSON.stringify({ source: 'docs/ux/UX_PLAN.md', decided_on: DECIDED_ON, items, decisions }, null, 2) + '\n');

// ---- SQL
const q = (v) => (v == null ? 'null' : "'" + String(v).replace(/'/g, "''") + "'");
const itemRows = items.map((x) => `  (${[x.id, x.title, x.category, x.release, x.priority, x.effort, x.risk, x.depends, x.evidence, x.value, x.status].map(q).join(', ')}, ${x.sort_order})`).join(',\n');
const decRows = decisions.map((x) => `  (${[x.id, x.question, x.decision, x.rationale].map(q).join(', ')}, date '${x.decided_on}')`).join(',\n');

const sql = `-- =====================================================================
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

-- 시드: 과제 ${items.length}개 ---------------------------------------------------------
insert into public.roadmap_items
  (id, title, category, release, priority, effort, risk, depends, evidence, value, status, sort_order)
values
${itemRows}
on conflict (id) do nothing;

-- 시드: 결정 ${decisions.length}개 (${DECIDED_ON}, 권장 기본값 전부 채택) ---------------------------
insert into public.roadmap_decisions (id, question, decision, rationale, decided_on)
values
${decRows}
on conflict (id) do nothing;
`;
writeFileSync(path.join(root, 'supabase/migrations/20261113000000_roadmap.sql'), sql);
const cnt = (r) => items.filter((x) => x.release === r).length;
console.log(`items=${items.length} (R1 ${cnt('R1')}, R2 ${cnt('R2')}, R3 ${cnt('R3')}), decisions=${decisions.length}`);
