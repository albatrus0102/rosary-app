// UX_PLAN.md 의 4장(과제 표) · 6장(릴리스) · 7장(결정 사항)과
// docs/ux/UX_REVIEW_ITEMS.json(U-xx) · docs/ux/GLASS_ROADMAP_ITEMS.json(G-xx)을 읽어
//   - supabase/migrations/20261113000000_roadmap.sql         (스키마 + 멱등 시드: 원래 40개. 운영에 이미 적용돼 내용이 바뀌지 않는다)
//   - supabase/migrations/20261114000000_roadmap_items_2.sql (release 에 G1~G3 허용 + U·G 과제 시드 + 현황 상태 보정)
//   - supabase/migrations/20261115000000_roadmap_items_3.sql (2차 화면 캡처 검토: UX_REVIEW_ITEMS.json 의 round 2 과제 + 기존 U 과제 메모 보강)
//   - supabase/migrations/20261116000000_roadmap_items_4.sql (남은 일 일괄 등록: docs/ux/BACKLOG_ROADMAP_ITEMS.json 의 T-xx 과제 + 기존 과제 현황 보정)
//   - admin/roadmap_seed.json                                (RPC 가 없을 때 읽기 전용 대체본: R+U+G+T 전부, 네 번째 마이그레이션 적용 뒤 상태)
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

// 2026-11-12 구현 완료(코드·테스트), 실기기/실서버 확인이 남은 항목의 메모.
const NOTES = {
  'S-01': '구현·단위시험 완료. 2000명 네트워크 시험은 이 환경에서 미통과: 별도 시험 서버에서 재시험 필요(홍보 전).',
  'P-02': '볼륨 키 넘기기는 위젯 시험만 확인: 실기기 확인 필요.',
  'O-01': 'Supabase에서 익명 로그인·수동 연결 허용 필요. 실서버 미검증.',
  'C-04': '실기기 FPS 표는 비어 있음(docs/church/PERF.md 절차대로 측정).',
};
const items = t4.map((r, i) => {
  const [id, title, category, evidence, value, effort, risk, priority, depends] = r;
  if (!/^[SML]$/.test(effort) || !/^P[012]$/.test(priority)) throw new Error('bad row ' + id);
  return { id, title, category, release: rel[id] || 'R3', priority, effort, risk, depends, evidence, value,
    status: DOING.has(id) ? 'review' : 'todo', owner_note: NOTES[id] || '', sort_order: i + 1 };
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

// ---- 두 번째 마이그레이션의 입력: U(외부 UX 검토) · G(유리화 계획)
const readJson = (rel) => JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
const U_ALL = readJson('docs/ux/UX_REVIEW_ITEMS.json');
// round 가 없는 것 = 1차 검토(두 번째 마이그레이션, 내용 고정). round 2 = 2차 화면 캡처 검토(세 번째 마이그레이션).
const U_ITEMS = U_ALL.filter((x) => x.round == null).map(({ review2, ...x }) => x);
const U2_ITEMS = U_ALL.filter((x) => x.round === 2);
// 1차 과제 가운데 2차 검토가 보강한 것: 메모만 덧붙인다(관리자가 이미 쓴 메모는 건드리지 않는다).
const U_REVIEW2 = U_ALL.filter((x) => x.round == null && x.review2).map((x) => ({ id: x.id, note: '2차 검토: ' + x.review2 }));
// JSON 의 status(todo/in_progress/review/done) → 보드 상태. review = 구현됨, 실기기 확인 대기.
const STATUS2 = { todo: 'todo', in_progress: 'doing', review: 'review', done: 'done' };
const U2_NOTE = '2차 화면 캡처 검토';
const note2 = (x) => (x.decision ? '[결정 필요] ' + x.decision + (x.note ? ' · ' + x.note : '') : x.note ? x.note : U2_NOTE);
const G_ITEMS = readJson('docs/ux/GLASS_ROADMAP_ITEMS.json');
// 네 번째 마이그레이션: 2026-11-14 '지금까지 해야 할 일을 모두 로드맵에 기록' 요청. T-xx(예약·신규 요청·보류·결정 대기·출시 전·기술부채).
// JSON 의 status 는 DB 상태값(todo/dropped/done 등) 그대로, note 가 owner_note 로 들어간다.
const B_ITEMS = readJson('docs/ux/BACKLOG_ROADMAP_ITEMS.json');
const B_CATEGORIES = ['예약(월 01시)', '신규 요청', '보류', '결정 대기', '출시 전', '기술부채'];
const DB_STATUS = ['todo', 'doing', 'review', 'done', 'blocked', 'dropped'];
const G_NOTE_DEFAULT = '제안: 소유자 확인 대기';
// 이미 구현된 기존 과제의 현황 보정(코드·커밋에서 근거를 확인한 것만). 관리자가 이미 바꾼 상태·메모·제목은 건드리지 않는다:
//   상태는 아직 'todo' 일 때만, 메모는 비었거나 기본 문구일 때만, 제목은 title_from 과 같을 때만 바꾼다.
//   C-12: 성당 안 14처 판·순례 구현(커밋 c888110, 47f71b8). 사제 검수·실기기 확인 전이라 review.
//   G-01: 성당 메인 IA 완료(커밋 e96c3fb): 소유자 지시로 '유리화 탭(기본)' 대신 성당 탭 + [성당|창] 보기가 됨.
//   G-29: 진본 스테인드글라스 성당 안 연결 완료(커밋 859be21, 7점·4개 성당).
//   U-33: 출시 전 실기기 확인 범위(소리·성능·TalkBack·저사양 3D·선창 뒷단 목소리)를 메모에 보강.
const M4_UPDATES = [
  { id: 'C-12', status: 'review', note_default: [''], note: '2026-11-13 구현: 성당 안 14처 판·순례(SPEC 30), 기도 배경·더보기·사순 카드. 사제 검수(T-31)·실기기 확인 대기.' },
  { id: 'G-01', title_from: 'IA 개편: 유리화 탭(기본) 추가, 성당을 유리화 탭의 [창|성당] 보기로 합침, 탭 4개 유지',
    title: "IA 개편: 성당 탭(기본) + [성당|창] 보기로 갤러리(창)를 같은 탭 안에 둠, 탭 4개 유지(소유자 지시로 '유리화' 기본 탭에서 변경)",
    status: 'done', note_default: ['', G_NOTE_DEFAULT], note: "2026-11-13 완료: 탭 '성당'·[성당|창]·가상 성당 헤더(커밋 e96c3fb). 제목은 현재 구조에 맞게 갱신." },
  { id: 'G-29', status: 'done', note_default: ['', G_NOTE_DEFAULT], note: '2026-11-13 완료: 성당 안 진본 스테인드글라스 연결 7점·4개 성당(커밋 859be21).' },
  { id: 'U-33', note_default: ['2차 화면 캡처 검토'],
    note: '출시 전 확인 묶음: 소리·성능·TalkBack·저사양 3D·선창 뒷단 목소리(앞단 뒤 앱이 부르는 resp 클립)도 이 검증표로 실기기 확인. 음성 클립 없는 오래된 APK 로는 검증 불가(T-36).' },
];
const U_NOTE = '신규(외부 UX 검토)';
const G_NOTE = '제안: 소유자 확인 대기';
// 오늘(2026-11-12/13) 코드에 구현됐고 실기기 확인만 남은 것. 근거를 코드·시험에서 확인한 행만 적는다.
//   C-09: lib/church/church_go_sheet.dart('가기' 시트) + assets/church/bridge.js walkTo/tapAt + test/church_walk_test.dart
// 기도 화면 1단계(텍스트 우선: prayer_text_view/prayer_bead_strip/rosary_map_sheet)는 UX_PLAN 의 A-01 로 이미 '검토'라 따로 바꾸지 않는다.
const STATUS_UPDATES = [
  { id: 'C-09', status: 'review', note: '2026-11-13 구현: 가기 시트·장면 탭 이동(walkTo/tapAt). 실기기 확인 대기.' },
];
{
  const seen = new Set(items.map((x) => x.id));
  const need = ['id', 'title', 'category', 'release', 'priority', 'effort', 'risk', 'depends', 'value', 'evidence'];
  for (const [list, rels, pre] of [[U_ITEMS, ['R1', 'R2', 'R3'], 'U-'], [G_ITEMS, ['G1', 'G2', 'G3'], 'G-']]) {
    for (const x of list) {
      for (const k of need) if (typeof x[k] !== 'string' || !x[k].trim()) throw new Error(`${x.id}: missing ${k}`);
      if (!x.id.startsWith(pre) || seen.has(x.id)) throw new Error('bad or duplicate id ' + x.id);
      seen.add(x.id);
      if (!rels.includes(x.release) || !/^P[012]$/.test(x.priority) || !/^[SML]$/.test(x.effort)) throw new Error('bad enum ' + x.id);
    }
  }
  if (U_ITEMS.length < 14 || U_ITEMS.length > 20) throw new Error('unexpected U count ' + U_ITEMS.length);
  if (U_ALL.length !== U_ITEMS.length + U2_ITEMS.length) throw new Error('UX_REVIEW_ITEMS: round must be absent or 2');
  for (const x of U2_ITEMS) {
    for (const k of need) if (typeof x[k] !== 'string' || !x[k].trim()) throw new Error(`${x.id}: missing ${k}`);
    if (!x.id.startsWith('U-') || seen.has(x.id)) throw new Error('bad or duplicate id ' + x.id);
    seen.add(x.id);
    if (!['R1', 'R2', 'R3'].includes(x.release) || !/^P[012]$/.test(x.priority) || !/^[SML]$/.test(x.effort)) throw new Error('bad enum ' + x.id);
    if (!STATUS2[x.status]) throw new Error('bad status ' + x.id);
    if (x.decision != null && (typeof x.decision !== 'string' || !x.decision.trim())) throw new Error('bad decision ' + x.id);
    if (note2(x).length > 500) throw new Error('note too long ' + x.id);
  }
  for (const u of U_REVIEW2) if (u.note.length > 500) throw new Error('review2 note too long ' + u.id);
  if (G_ITEMS.length !== 34) throw new Error('expected 34 G items, got ' + G_ITEMS.length);
  for (const u of STATUS_UPDATES) if (!ids40.has(u.id)) throw new Error('status update for unknown id ' + u.id);
}
{
  const seen = new Set([...items.map((x) => x.id), ...U_ITEMS.map((x) => x.id), ...U2_ITEMS.map((x) => x.id), ...G_ITEMS.map((x) => x.id)]);
  const need = ['id', 'title', 'category', 'release', 'priority', 'effort', 'risk', 'depends', 'value', 'evidence', 'status', 'note'];
  if (B_ITEMS.length < 30 || B_ITEMS.length > 50) throw new Error('unexpected T count ' + B_ITEMS.length);
  for (const x of B_ITEMS) {
    for (const k of need) if (typeof x[k] !== 'string' || !x[k].trim()) throw new Error(`${x.id}: missing ${k}`);
    if (!/^T-\d{2}$/.test(x.id) || seen.has(x.id)) throw new Error('bad or duplicate id ' + x.id);
    seen.add(x.id);
    if (!['R1', 'R2', 'R3'].includes(x.release) || !/^P[012]$/.test(x.priority) || !/^[SML]$/.test(x.effort)) throw new Error('bad enum ' + x.id);
    if (!B_CATEGORIES.includes(x.category)) throw new Error('bad category ' + x.id);
    if (!DB_STATUS.includes(x.status)) throw new Error('bad status ' + x.id);
    if (x.note.length > 500) throw new Error('note too long ' + x.id);
    if (x.category === '결정 대기' && !x.note.startsWith('[결정 필요]')) throw new Error('decision note ' + x.id);
  }
  for (const x of B_ITEMS) for (const d of x.depends.split(/[,\s]+/).filter((v) => /^[A-Z]+-\d+$/.test(v))) if (!seen.has(d)) throw new Error(`${x.id}: unknown dependency ${d}`);
  for (const u of M4_UPDATES) {
    if (!seen.has(u.id)) throw new Error('M4 update for unknown id ' + u.id);
    if (u.status && !DB_STATUS.includes(u.status)) throw new Error('bad M4 status ' + u.id);
    if (u.note && u.note.length > 500) throw new Error('M4 note too long ' + u.id);
  }
}
const extra = [
  ...U_ITEMS.map((x) => ({ ...x, status: 'todo', owner_note: U_NOTE })),
  ...G_ITEMS.map((x) => ({ ...x, status: 'todo', owner_note: G_NOTE })),
].map((x, i) => ({ ...x, sort_order: items.length + i + 1 }));
const extra2 = U2_ITEMS.map(({ round, decision, note, ...x }, i) => ({
  ...x, status: STATUS2[x.status], owner_note: note2(U2_ITEMS[i]), sort_order: items.length + extra.length + i + 1,
}));
// 정적 사본(JSON)은 두 번째 마이그레이션까지 적용된 뒤의 모습
const seedItems = items.map((x) => {
  const u = STATUS_UPDATES.find((y) => y.id === x.id);
  return u && (x.status === 'todo' || x.status === 'doing')
    ? { ...x, status: u.status, owner_note: x.owner_note || u.note } : x;
}).concat(extra).map((x) => {
  // 세 번째 마이그레이션: 기본 메모 그대로인 1차 U 과제에만 2차 보강 메모를 쓴다.
  const r = U_REVIEW2.find((y) => y.id === x.id);
  return r && (x.owner_note === '' || x.owner_note === U_NOTE) ? { ...x, owner_note: r.note } : x;
}).concat(extra2);
const extra4 = B_ITEMS.map(({ note, ...x }, i) => ({
  ...x, owner_note: B_ITEMS[i].note, sort_order: items.length + extra.length + extra2.length + i + 1,
}));
// 네 번째 마이그레이션의 현황 보정(SQL 과 같은 규칙)
const applyM4 = (x) => {
  const u = M4_UPDATES.find((y) => y.id === x.id);
  if (!u) return x;
  const y = { ...x };
  if (u.title && y.title === u.title_from) y.title = u.title;
  if (u.status && y.status === 'todo') y.status = u.status;
  if (u.note && u.note_default.includes(y.owner_note)) y.owner_note = u.note;
  return y;
};
const seedAll = seedItems.map(applyM4).concat(extra4);

// ---- JSON
writeFileSync(path.join(root, 'admin/roadmap_seed.json'),
  JSON.stringify({ source: 'docs/ux/UX_PLAN.md + UX_REVIEW_ITEMS.json + GLASS_ROADMAP_ITEMS.json + BACKLOG_ROADMAP_ITEMS.json', decided_on: DECIDED_ON, items: seedAll, decisions }, null, 2) + '\n');

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

// ---- SQL 2: release 허용값 확대 + U·G 시드 + 상태 보정
const itemRows2 = extra.map((x) => `  (${[x.id, x.title, x.category, x.release, x.priority, x.effort, x.risk, x.depends, x.evidence, x.value, x.status, x.owner_note].map(q).join(', ')}, ${x.sort_order})`).join(',\n');
// 첫 마이그레이션 시드는 owner_note 를 넣지 않았다(정적 사본에만 NOTES 가 있었다). 같아지도록 비어 있는 메모만 채운다.
const noteUpdates2 = Object.entries(NOTES).map(([id, note]) => `update public.roadmap_items
   set owner_note = ${q(note)}, updated_at = now()
 where id = ${q(id)} and owner_note = '';`).join('\n\n');
const updates2 = STATUS_UPDATES.map((u) => `update public.roadmap_items
   set status = ${q(u.status)},
       owner_note = case when owner_note = '' then ${q(u.note)} else owner_note end,
       updated_at = now()
 where id = ${q(u.id)} and status in ('todo', 'doing');`).join('\n\n');

const sql2 = `-- =====================================================================
-- 로드맵 과제 추가(2): 외부 UX 검토(U-xx) ${U_ITEMS.length}개 + 유리화 계획(G-xx) ${G_ITEMS.length}개
--   * 20261113000000_roadmap.sql 이 먼저 적용돼 있어야 한다.
--   * 내용의 출처: docs/ux/UX_REVIEW_ITEMS.json, docs/ux/GLASS_ROADMAP_ITEMS.json (docs/ux/CHATGPT_REVIEW.md, GLASS_APP_PLAN.md)
--   * 이 파일은 admin/tools_seed_roadmap.mjs 가 생성한다. 직접 고치지 말고 JSON 을 고친 뒤 다시 생성.
--   * 멱등: 여러 번 실행해도 안전. 시드는 on conflict do nothing, 상태 보정은 아직 'todo'/'doing' 인 행에만 적용한다.
--   * release 허용값을 R1,R2,R3 에서 R1,R2,R3,G1,G2,G3 으로 넓힌다(G = 유리화 계획 릴리스).
-- =====================================================================

-- release 검사 제약을 안전하게 교체한다(자동 이름이든 사람이 붙인 이름이든 release 를 검사하는 check 는 모두 제거).
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.roadmap_items'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%release%'
  loop
    execute format('alter table public.roadmap_items drop constraint %I', c.conname);
  end loop;
  alter table public.roadmap_items
    add constraint roadmap_items_release_check check (release in ('R1','R2','R3','G1','G2','G3'));
end
$$;

-- 시드: 외부 UX 검토 ${U_ITEMS.length}개(U) + 유리화 계획 ${G_ITEMS.length}개(G) -------------------------------
insert into public.roadmap_items
  (id, title, category, release, priority, effort, risk, depends, evidence, value, status, owner_note, sort_order)
values
${itemRows2}
on conflict (id) do nothing;

-- 현황 보정: 구현은 됐지만 상태가 아직 todo/doing 인 행만 'review'(실기기 확인 대기)로. 관리자가 이미 바꾼 행은 건드리지 않는다.
${updates2}

-- 메모 보정: 구현 현황 메모(정적 사본과 같게). 관리자가 이미 쓴 메모는 덮어쓰지 않는다.
${noteUpdates2}
`;
writeFileSync(path.join(root, 'supabase/migrations/20261114000000_roadmap_items_2.sql'), sql2);

// ---- SQL 3: 2차 화면 캡처 검토 과제 + 1차 과제 메모 보강
const itemRows3 = extra2.map((x) => `  (${[x.id, x.title, x.category, x.release, x.priority, x.effort, x.risk, x.depends, x.evidence, x.value, x.status, x.owner_note].map(q).join(', ')}, ${x.sort_order})`).join(',\n');
const noteUpdates3 = U_REVIEW2.map((u) => `update public.roadmap_items
   set owner_note = ${q(u.note)}, updated_at = now()
 where id = ${q(u.id)} and owner_note in ('', ${q(U_NOTE)});`).join('\n\n');
const sql3 = `-- =====================================================================
-- 로드맵 과제 추가(3): 2차 ChatGPT 화면 캡처 검토 ${U2_ITEMS.length}개(U-${String(U_ITEMS.length + 1).padStart(2, '0')}~) + 1차 과제 ${U_REVIEW2.length}개 메모 보강
--   * 20261114000000_roadmap_items_2.sql 이 먼저 적용돼 있어야 한다.
--   * 내용의 출처: docs/ux/UX_REVIEW_ITEMS.json 의 round 2 항목과 review2 필드 (docs/ux/CHATGPT_REVIEW.md 8장)
--   * 이 파일은 admin/tools_seed_roadmap.mjs 가 생성한다. 직접 고치지 말고 JSON 을 고친 뒤 다시 생성.
--   * 멱등: 시드는 on conflict do nothing. 메모 보강은 메모가 비었거나 기본 문구('${U_NOTE}')인 행에만 적용한다.
--   * 상태: 이미 구현된 것은 'review'(실기기 확인 대기)·'done', 진행 중은 'doing'. 소유자 결정이 필요한 과제는 메모가 '[결정 필요]'로 시작한다.
-- =====================================================================

insert into public.roadmap_items
  (id, title, category, release, priority, effort, risk, depends, evidence, value, status, owner_note, sort_order)
values
${itemRows3}
on conflict (id) do nothing;

-- 1차 검토 과제의 메모 보강(2차 검토가 같은 과제를 다시 짚은 것). 관리자가 이미 쓴 메모는 덮어쓰지 않는다.
${noteUpdates3}
`;
writeFileSync(path.join(root, 'supabase/migrations/20261115000000_roadmap_items_3.sql'), sql3);

// ---- SQL 4: 남은 일 일괄 등록(T-xx) + 기존 과제 현황 보정
const itemRows4 = extra4.map((x) => `  (${[x.id, x.title, x.category, x.release, x.priority, x.effort, x.risk, x.depends, x.evidence, x.value, x.status, x.owner_note].map(q).join(', ')}, ${x.sort_order})`).join(',\n');
const inList = (a) => a.map(q).join(', ');
const updates4 = M4_UPDATES.map((u) => {
  const sets = [];
  const conds = [];
  if (u.title) { sets.push(`title = case when title = ${q(u.title_from)} then ${q(u.title)} else title end`); conds.push(`title = ${q(u.title_from)}`); }
  if (u.status) { sets.push(`status = case when status = 'todo' then ${q(u.status)} else status end`); conds.push(`status = 'todo'`); }
  if (u.note) { sets.push(`owner_note = case when owner_note in (${inList(u.note_default)}) then ${q(u.note)} else owner_note end`); conds.push(`owner_note in (${inList(u.note_default)})`); }
  return `update public.roadmap_items
   set ${sets.join(',\n       ')},
       updated_at = now()
 where id = ${q(u.id)}
   and (${conds.join(' or ')});`;
}).join('\n\n');
const catCount = B_CATEGORIES.map((c) => `${c} ${B_ITEMS.filter((x) => x.category === c).length}`).join(' · ');
const sql4 = `-- =====================================================================
-- 로드맵 과제 추가(4): 남은 일 일괄 등록 T-xx ${B_ITEMS.length}개 (${catCount}) + 기존 과제 ${M4_UPDATES.length}개 현황 보정
--   * 20261115000000_roadmap_items_3.sql 이 먼저 적용돼 있어야 한다. 앞선 마이그레이션의 내용은 바꾸지 않는다.
--   * 내용의 출처: docs/ux/BACKLOG_ROADMAP_ITEMS.json (2026-11-14 사용자 지시 '지금까지 해야할 일을 모두 로드맵에 저장'), docs/BACKLOG.md
--   * 분류(category)가 표시: 예약(월 01시) · 신규 요청 · 보류 · 결정 대기 · 출시 전 · 기술부채. 보류 = 상태 'dropped'(보류·제외).
--   * 이 파일은 admin/tools_seed_roadmap.mjs 가 생성한다. 직접 고치지 말고 JSON 을 고친 뒤 다시 생성.
--   * 멱등: 시드는 on conflict do nothing. 현황 보정은 상태가 아직 'todo' 인 행·메모가 비었거나 기본 문구인 행·제목이 원래 그대로인 행에만 적용한다(관리자가 바꾼 것은 건드리지 않음).
--   * 이 저장소에서는 아직 실제 Supabase 에 적용하지 않았다.
-- =====================================================================

insert into public.roadmap_items
  (id, title, category, release, priority, effort, risk, depends, evidence, value, status, owner_note, sort_order)
values
${itemRows4}
on conflict (id) do nothing;

-- 기존 과제 현황 보정(구현 근거가 있는 것만)
${updates4}
`;
writeFileSync(path.join(root, 'supabase/migrations/20261116000000_roadmap_items_4.sql'), sql4);

const cnt = (r) => seedAll.filter((x) => x.release === r).length;
console.log(`base=${items.length} U=${U_ITEMS.length} U2=${U2_ITEMS.length} G=${G_ITEMS.length} T=${B_ITEMS.length} total=${seedAll.length} (R1 ${cnt('R1')}, R2 ${cnt('R2')}, R3 ${cnt('R3')}, G1 ${cnt('G1')}, G2 ${cnt('G2')}, G3 ${cnt('G3')}), decisions=${decisions.length}`);
