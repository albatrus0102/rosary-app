// 밀라노 개발용 임시 유리(E-4) 결과 보고서 생성: docs/church/MILAN_55_RESULT.md
// 사용: node tools/church_web/milan55_report.mjs            # 문서를 다시 쓴다
//       node tools/church_web/milan55_report.mjs --check    # 문서가 최신인지 확인(다르면 종료 코드 1)
//       node tools/church_web/milan55_report.mjs --json     # 55행 결과를 JSON 으로
// 값은 모두 빌더(ch_milan.js)를 실제로 돌려 잰 anchor 와 대응표(assets/church/dev/devglass_milan.js)에서 계산한다(dev/devglass.js plan()).
// 그리기 비용(선택)은 art/glass_milan55/shots/e4_perf.json 이 있으면 싣는다(tools/church_web/milan55_shots.mjs --compare 로 만든다).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { measureMilan } from './milan_openings.mjs';
import { VIEWS } from './milan55_shots.mjs';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const DG = require('../../assets/church/dev/devglass.js');
const table = require('../../assets/church/dev/devglass_milan.js');
const OUT = path.join(repo, 'docs/church/MILAN_55_RESULT.md');
const r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000;

export function results() {
  const m = measureMilan();
  const packFile = path.join(repo, 'assets/church/dev', table.pack);
  let sizes = null, packInfo = null;
  if (fs.existsSync(packFile)) {
    const txt = fs.readFileSync(packFile, 'utf8'), pack = JSON.parse(txt.slice(txt.indexOf(']=') + 2, txt.lastIndexOf(';')));
    sizes = Object.fromEntries(Object.entries(pack.images).map(([k, v]) => [k, [v.w, v.h]]));
    const webp = Object.values(pack.images).reduce((n, v) => n + Math.floor((v.src.length - 23) * 3 / 4), 0);
    packInfo = { file: 'assets/church/dev/' + table.pack, bytes: fs.statSync(packFile).size, webp, n: Object.keys(pack.images).length, kind: pack.kind };
  }
  const plan = DG.plan(table, m.anchors, { dev: true, sizes });
  const by = Object.fromEntries(m.anchors.map((a) => [a.key, a]));
  const rows = table.rows.map((r, i) => {
    const p = plan[i], a = p.status === 'placed' ? by[p.anchor] : null, px = (sizes && sizes[r.texture]) || r.px;
    return {
      dev_id: r.dev_id, v_id: r.v_id || null, subject_ko: r.subject_ko || null, px,
      status: p.status === 'placed' ? 'placed' : (p.why === 'hold' ? 'qa_hold' : (p.why === 'unplaced' ? 'qa_unplaced' : 'skipped')),
      why: p.status === 'placed' ? '' : (p.why === 'hold' ? (r.hold_ko || '보류') : (p.why === 'unplaced' ? '실제 위치 미확정' : p.why)),
      anchor: r.anchor || null, certainty: r.certainty, placement_evidence: r.placement_evidence, evidence_ko: r.evidence_ko,
      real_work_copyrighted: !!r.real_work_copyrighted, release_approved: r.release_approved, texture_matches_historical_work: r.texture_matches_historical_work,
      transform: p.rect ? { x: r3(p.rect.x), y: r3(p.rect.y), z: r3(p.rect.z), yawDeg: r2(p.rect.yawDeg), w: r3(p.rect.w), h: r3(p.rect.h) } : null,
      opening: a ? { w: a.w, h: a.h, sill: a.sill, apex: a.apex } : null,
      cover: p.rect ? r2(p.rect.cover) : null, rest: p.rect ? p.rect.rest : null, texelMm: p.rect ? Math.round(p.rect.h / px[1] * 1000) : null
    };
  });
  return { m, rows, summary: DG.summary(plan), packInfo };
}

function md() {
  const { m, rows, summary: s, packInfo } = results();
  const L = [];
  const yaw = (v) => (Object.is(v, -0) ? 0 : v);
  L.push('# 밀라노 55개 개발용 임시 유리 — 구현 결과 (E-4)');
  L.push('');
  L.push('> **자동 생성 문서다. 직접 고치지 말 것**: `node tools/church_web/milan55_report.mjs` (표를 고친 뒤 다시 돌린다. `--check` 는 최신인지 확인).');
  L.push('> 계획·분석은 `MILAN_55_PLACEMENT.md`(E-1), 실제 창 조사는 `MILAN_GLASS_RESEARCH.md`(E-2), 체계·빌드·릴리스 차단은 `GLASS_DEV_PIPELINE.md`.');
  L.push('> 55장은 **AI 창작 시안**이다. 실제 밀라노 창의 도상이 아니다(`texture_matches_historical_work=false`, `release_approved=false` 55행 전부). 개발용 APK 에만 들어간다.');
  L.push('');
  L.push('## 0. 한눈에');
  L.push('');
  L.push(`- 55개 중 **성당 안 배치 ${s.placed}** · **QA Gallery 전용 ${s.qa}**(자리는 알지만 보류 ${s.hold} + 위치 미확정 ${s.qa - s.hold}) · 걸려다 못 건 것 ${s.skipped}.`);
  L.push(`- 배치 ${s.placed}개의 확신도: 확인(confirmed) ${s.confirmed} · 개연(probable) ${s.probable} · 추정(assumed) ${s.assumed}. 근거는 표의 마지막 칸과 대응표의 \`evidence_ko\`.`);
  L.push(`- 밀라노 씬의 개구부는 **${m.openings.length}개**(유리 ${m.openings.filter((o) => o.kind === 'glass').length} + 문 ${m.openings.filter((o) => o.kind === 'door').length}), 전부 빌더가 key 를 붙여 anchor 로 내보낸다(\`ctx._.glassAnchors\`). 창별 Mesh 는 여전히 없다(유리는 한 배치) → 시안 판의 식별자는 \`userData.devGlass = ['DEV-0xx@<key>', …]\`.`);
  if (packInfo) L.push(`- 그림 팩 \`${packInfo.file}\`: ${packInfo.n}장, 원본 해상도 그대로(WebP q90 합 ${(packInfo.webp / 1048576).toFixed(2)}MB, data URI JS ${(packInfo.bytes / 1048576).toFixed(2)}MB). 일반 APK 에는 0KB.`);
  L.push('- 그리기: 긴 변 512px 이하 52장은 실행 중 아틀라스 1장(2048×1024)으로 묶어 draw call 1, 큰 3장(DEV-001~003)은 1씩, 뒤판 1 → **최대 +5**.');
  L.push('');
  L.push('## 1. 55개 DEV 별 적용 상태');
  L.push('');
  L.push('상태: **배치** = 성당 안 개구부에 걸림 · **보류** = 실제 자리는 알지만 그 건축이 없어 QA Gallery 에만 · **미확정** = 실제 위치를 몰라 QA Gallery 에만.');
  L.push('world x, y, z = 판 가운데(유리 평면에서 실내 쪽 3cm). yaw = 판의 +Z(앞면)가 실내를 보는 Y 회전(도). 판 = 그림 비율 그대로(contain, 꼭대기 맞춤)의 폭×높이(m).');
  L.push('덮음 = 판이 개구부 상자를 덮는 비율. 나머지: lead = 어두운 납틀색 뒤판, glass = 기존 절차적 유리가 보임. 텍셀 = 그림 1화소의 크기.');
  L.push('');
  L.push('| DEV | 실제 창(V) | 상태 | 개구부 key | world x, y, z | yaw° | 판 폭×높이 | 개구부 폭×높이 | 덮음·나머지 | 텍셀(mm) | 확신도 | 미배치 원인 / 근거 |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  const ST = { placed: '배치', qa_hold: '보류(QA)', qa_unplaced: '미확정(QA)', skipped: '실패' };
  for (const r of rows) {
    const t = r.transform, why = r.status === 'placed' ? r.evidence_ko : '**' + r.why + '** — ' + r.evidence_ko;
    L.push('| ' + [r.dev_id, (r.v_id || '—') + (r.real_work_copyrighted ? ' ©' : ''), ST[r.status], r.anchor ? '`' + r.anchor + '`' : '—',
      t ? `${t.x}, ${t.y}, ${t.z}` : '—', t ? yaw(t.yawDeg) : '—', t ? `${r2(t.w)}×${r2(t.h)}` : '—', r.opening ? `${r2(r.opening.w)}×${r2(r.opening.h)}` : '—',
      t ? `${Math.round(r.cover * 100)}% · ${r.rest}` : '—', r.texelMm || '—', r.certainty, why.replace(/\|/g, '/')].join(' | ') + ' |');
  }
  L.push('');
  L.push('© = 그 자리의 **실제 작품**이 저작권 존속(V07·V44·V46·V47 Hajnal, V39 Carpi; 대응표의 `real_work_copyrighted`) → 나중에 진본 사진으로 바꾸는 대상에서 뺀다. 지금 걸린 것은 사용자가 준 AI 시안이다.');
  L.push('');
  const n = (st) => rows.filter((r) => r.status === st).length;
  L.push(`합계: 배치 ${n('placed')} · 보류 ${n('qa_hold')} · 미확정 ${n('qa_unplaced')} · 실패 ${n('skipped')} = ${rows.length}.`);
  L.push('');
  L.push('### 1.1 미배치 13개의 원인');
  L.push('');
  L.push('- **DEV-016~018, 022~024 (6)** — 도면의 P16~18·P22~24 는 주보랑(회랑) 바깥벽이 아니라 **두 성구실 방의 바깥벽 창**이다(조사 E-2 §4 c). 회랑 바깥벽은 실제로도 맹벽이라 거기에 뚫지 않았다. 성구실 방(회랑에서 문으로 들어가는 직사각 방, 바깥벽에 랜싯 3개씩)을 지으면 대응표의 `hang:false` 만 지우고 그 방이 내보내는 anchor key(`sacS_1`… 로 예약)에 걸린다.');
  L.push('- **DEV-049~055 (7)** — 실제 위치 미확정. 번호 창은 47개(+V12bis)뿐이라 티부리오 창일 가능성이 있으나(추정) 임의로 걸지 않았다.');
  L.push('');
  L.push('## 2. 건축 변경 (devglass 와 무관하게 건물의 일부, 창에는 절차적 유리)');
  L.push('');
  const A = Object.fromEntries(m.anchors.map((a) => [a.key, a]));
  const sz = (k) => `${r2(A[k].w)}×${r2(A[k].h)}m(창턱 ${r2(A[k].sill)}, 꼭대기 ${r2(A[k].apex)})`;
  L.push('| 부분 | 전 | 후 |');
  L.push('|---|---|---|');
  L.push(`| 정문 안쪽 벽 | 문 5 + 상단 작은 창 3 이 기둥줄(x = 0, ±4.51, ±9.02)에 있어 옆문 4개·상단 양옆 창이 벽기둥 뒤에 숨음. 하단 창 없음 | 문 5 · 하단 창 5 · 상단 창 3 을 **랑 중심선**(x = 0, ±6.77, ±11.28)으로. 벽기둥은 그대로 → 가리지 않음. 하단 = 반원 머리 ${sz('cfLower_c')} / ${sz('cfLower_s1')}, 상단 = 첨두 ${sz('cfUpper_c')} / ${sz('cfUpper_s1')} (실제 유리 치수 × 0.47) |`);
  L.push(`| 익랑 끝 벽 가운데 칸 | 바닥 가까이부터 큰 창 하나 4.4×13.4m | 실제대로 **아래 = 경당 입구 아치(폭 5.6m, 꼭대기 11.5m), 위 = 큰 첨두창** ${sz('chapS_upper')} (남 = V12bis, 북 = 번호·주제 미확인) |`);
  L.push(`| 익랑 끝 경당 ×2 | 없음 | 반육각형 후진(한 변 2.8m = 실제 6m × 0.47, 끝 벽에서 깊이 3.12m), 창 3개 ${sz('chapS_c')}(실제 2.18×16.36m × 0.47), 리브 궁륭(꼭대기 12.8m), 단순한 제단·성인상·촛대, 사선 벽·끝 벽·제단 충돌체. 형태는 조사로 확인, **치수는 ±20% 단서로 지음**(\`ch_milan.js\` 의 \`CHAP\` 표만 고치면 됨) |`);
  L.push(`| 익랑 창 8개 | 1.75×7.8 / 1.9×7.9m (창턱 2.7) | 실제 비례 쪽으로: 끝 벽 양옆 칸·동쪽 벽 ${sz('trEndS_west')}, 서쪽 벽 ${sz('trWestS')}. 실제 환산은 1.66×10.57 / 1.41×10.15m 인데 이 칸의 궁륭 꼭대기가 11.28m 라 9.0m 까지만(85~89%) |`);
  L.push('| 회랑 직선 벽 | 맹벽 | **그대로 맹벽**(실제와 같다). 창을 뚫는 계획은 조사 결과로 취소 |');
  L.push(`| 걷기 경계(layout.bounds) | x ±20.4 | x ±${m.layout.bounds.x1}(경당까지; 그 밖은 벽 충돌체가 막음). \`server/church/src/layouts.json\` 다시 내보냄 |`);
  L.push('| 익랑 끝 벽 충돌체 | 한 덩어리 | 입구 아치 양옆 두 조각 + 경당 벽. 카메라 경계·건물 윤곽(camFix)에 경당 추가 |');
  L.push('| 십자가의 길 14처 | 자동 유도(익랑 끝 큰 창 아래·측랑 벽) | **벽기둥 앞면 14곳으로 고정**(`layout.crossWay.plaques`): 경당 입구 양옆 벽기둥 2 + 측랑 벽기둥 5, 좌우 대칭. 창·문·경당 아치와 겹치지 않음(시험) |');
  L.push('');
  const perfFile = path.join(repo, 'art/glass_milan55/shots/e4_perf.json');
  if (fs.existsSync(perfFile)) {
    const P = JSON.parse(fs.readFileSync(perfFile, 'utf8'));
    L.push('### 2.1 그리기 비용 (헤드리스 크롬, 화질 mid, 960×540, renderer.info)');
    L.push('');
    L.push(`정점 ${P.base.vertices.toLocaleString('en')} → ${P.after.vertices.toLocaleString('en')} (삼각형 +${Math.round((P.after.vertices - P.base.vertices) / 3).toLocaleString('en')}, +${((P.after.vertices / P.base.vertices - 1) * 100).toFixed(1)}%). 배치 Mesh 수 ${P.base.meshes} → ${P.after.meshes}(새 배치 없음: 벽·유리·창살 모두 기존 배치에 들어간다).`);
    L.push('');
    L.push('| 시점 | 전: draw call / 삼각형 | 후(devglass 끔) | 후(devglass 켬) |');
    L.push('|---|---|---|---|');
    for (const v of P.views) L.push(`| ${v.view} — ${VIEWS[v.view] ? VIEWS[v.view].note : ''} | ${v.base.calls} / ${v.base.tris.toLocaleString('en')} | ${v.off.calls} / ${v.off.tris.toLocaleString('en')} | ${v.on.calls} / ${v.on.tris.toLocaleString('en')} |`);
    L.push('');
    L.push('삼각형 수는 화면에 걸친 배치 전체의 합이다(배치는 성당 전체가 한 덩어리라 일부만 보여도 다 센다). devglass 는 판 42장(삼각형 84) + 뒤판이 전부다.');
    L.push('');
  }
  L.push('## 3. 화면 캡처 (`art/glass_milan55/shots/e4_*.jpg`, devglass 켬, 화질 mid, 11시)');
  L.push('');
  L.push('| 파일 | 시점 |');
  L.push('|---|---|');
  for (const [k, v] of Object.entries(VIEWS)) { if (!v.extra) L.push(`| \`e4_${k}.jpg\` | ${v.note} |`); }
  L.push('');
  L.push('직접 열어 확인한 것: 그림이 위아래·좌우로 뒤집히지 않음(DEV-002 의 수태고지: 천사 왼쪽·성모 오른쪽 = 원본과 같음), 늘어나지 않음(판 비율 = 그림 비율, 시험), 창틀 밖으로 나오지 않음(판 모서리는 스플레이 뒤), z-fighting 없음(판 3cm·뒤판 1.8cm 앞), 진본 사진 `milan_apse_lower` 는 그대로이고 DEV-020 은 그 위에만.');
  L.push('알려진 모습: 모델의 돌 창살(세로 문설주·가로대)이 그림 위를 지나간다(창틀·트레이서리 유지 규칙). 랜싯 시안(65×345 안팎)은 1텍셀 2cm 안팎이라 가까이서 흐리다. 넓은 창(후진·위 큰 창)에는 랜싯 그림이 가운데 띠로만 걸리고 둘레는 절차적 유리다.');
  L.push('');
  L.push('## 4. 재현');
  L.push('');
  L.push('```');
  L.push('node tools/church_web/milan_openings.mjs                 # 개구부 78개(key·world 좌표·크기)');
  L.push('node --test tools/church_web/devglass.test.mjs           # 대응표·anchor·판 계산·릴리스 차단·해제·QA Gallery·건축 시험');
  L.push('node tools/church_web/milan55_shots.mjs                  # 캡처 8장 → art/glass_milan55/shots/e4_*.jpg');
  L.push('node tools/church_web/milan55_shots.mjs --leak 3         # 실제 WebGL 에서 출입 반복 해제 확인');
  L.push('node tools/church_web/milan55_report.mjs                 # 이 문서');
  L.push('브라우저: assets/church/test.html?church=milan&devglass=1   ·   ?church=qa_milan55&devglass=1');
  L.push('bash tools/build_dev_apk.sh                              # 개발용 APK(build/dev-apk/rosarium-dev-*.apk)');
  L.push('bash tools/check_release_apk.sh <일반 apk>               # 일반 APK 에 시안이 없는지');
  L.push('```');
  L.push('');
  return L.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  if (a.includes('--json')) console.log(JSON.stringify(results().rows, null, 1));
  else {
    const text = md();
    if (a.includes('--check')) {
      const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
      if (cur !== text) { console.error('docs/church/MILAN_55_RESULT.md 가 최신이 아니다: node tools/church_web/milan55_report.mjs'); process.exit(1); }
      console.log('MILAN_55_RESULT.md 최신');
    } else { fs.writeFileSync(OUT, text); console.log('wrote', path.relative(repo, OUT), text.split('\n').length, 'lines'); }
  }
}
