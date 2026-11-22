// 스테인드글라스 전수 목록(docs/church/GLASS_INVENTORY.md): 모든 성당의 창 개구부마다 '실제 건물에 무엇이 있나'와 '우리 모델이 무엇을 보여 주나'.
// 사용: node tools/church_web/glass_inventory.mjs            # 성당별 요약 + 빈자리(gap) 목록
//       node tools/church_web/glass_inventory.mjs --json     # 전체(JSON) — data/glass_inventory.json 으로 저장해 둔다
//       node tools/church_web/glass_inventory.mjs --md       # 문서용 표
//       CHURCH_ASSETS=<assets/church 사본> node … --json     # 다른 사본(고치기 전)으로 같은 목록 — 전/후 비교
//
// 실제 쪽(REAL): 조사 문서(GLASS_ALL_CHURCHES_PLAN.md, MILAN_GLASS_RESEARCH.md, interiors/*.md)를 창 key 규칙으로 옮긴 것이다.
//   kind: stained(그림·무늬 색유리) · stained_protected(색유리이나 원작 저작권 존속 → 추상만) · stained_unverified(색유리로 보이나 도상 미확인)
//         plain(그림 유리 아님: 무색·옅은 유리, 종류 미확인 포함) · clear(무색 격자 확인) · alabaster(설화석고) · hanji(한지 유리화 빛 상자, 권리 존속)
//         virtual(가상의 본당: 실제 창 없음) · not_window(창이 아닌 빛 면)
// 모델 쪽(model): 배포판(release) — photo:<진본 사진 창> · gen:<glass_gen 양식> · plain(무늬 없는 옅은 절차 유리) · cells(예전 절차적 색 격자 = 자리표시 모양) · hanji(한지 빛 판)
//   개발판(dev): 밀라노만 dev/devglass.js 의 임시 시안이 그 앞을 덮는다(그 밖의 성당은 배포판과 같다).
// 빈자리(gap): 실제가 색유리(stained*·virtual·hanji)인데 모델이 사진·생성 무늬·한지 판이 아닌 곳, 또는 모델이 예전 색 격자(cells)인 곳.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { measure } from './church_openings.mjs';
import { measureMilan } from './milan_openings.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const GEN = require('../../assets/church/glass_gen.js');
// 양식이 '추상'인가(인물·장면 없음): 권리 존속 자리에 허용되는 것
const isAbstract = (st) => { const S = GEN.STYLES[st]; return !!S && (S.body === 'abstract' || S.body === 'parish') && (S.head === 'abstract' || S.head === 'parish') && (S.disc === 'abstract' || S.disc === 'parish'); };

const R = (kind, what, era, src, extra) => Object.assign({ kind, what, era: era || '', src: src || '' }, extra || {});
const PLAN = 'GLASS_ALL_CHURCHES_PLAN.md', MGR = 'MILAN_GLASS_RESEARCH.md';

// ---- 실제 창 프로그램(성당별 key → 실제) ----
const MILAN_V = {   // aisleS_bk = Vk, aisleN_bk = V(40−k) (MILAN_GLASS_RESEARCH §2.1)
  1: ['성 요한 사도의 생애', '1473–78 de Mottis'], 2: ['구약 이야기(옛 패널 모음)', '1417–1548'], 3: ['구약 이야기', '1417–1548'], 4: ['구약 이야기', '1417–1548'],
  5: ['신약 이야기(포파풍)', '15세기 말~16세기 전반'], 6: ['성 엘리지오의 생애', '1480–86'], 7: ['복자 페라리·슈스터 추기경', '1988 하이날', 'protected'], 8: ['성녀 아녜스·테클라·눈의 성모', '1897–1905 베르티니'],
  32: ['성 암브로시오의 생애', '1888–95 베르티니'], 33: ['성 요셉의 생애', '1576–1657'], 34: ['성녀 헬레나·십자가 발견', '1570–77'], 35: ['성모의 영광', '1565–67'], 36: ['네 관 쓴 순교 성인', '1567–69'],
  37: ['성 미카엘과 악마들의 전투', '1939–47 부파(1956 사망 — 2026년 말까지 보호)', 'protected'], 38: ['15~19세기 패널 모음', '15~19세기'], 39: ['다윗 임금의 생애', '1939–47 카르피', 'protected']
};
const MILAN_KEY = {
  trWestS: ['V09 성 제르바시오·프로타시오', '1846–49 베르티니'], trEndS_west: ['V10 성 야고보의 생애', '1562–66'], trEndS_east: ['V14 알렉산드리아의 성녀 카타리나', '1549–57'], trEastS: ['V15 투르의 성 마르티노', '1570–17세기 초'],
  trEastN: ['V25 다마스쿠스의 성 요한', '1479–89'], trEndN_east: ['V26 성 카롤로 보로메오의 생애', '1910 벨트라미·부파 외(부파 보호 기간)', 'protected'], trEndN_west: ['V30 시에나의 성녀 카타리나', '1562–67'], trWestN: ['V31 사도들(입상)·성모 대관', '1567'],
  chapS_w: ['V11 성 요한 보노', '1838–42 베르티니'], chapS_c: ['V12 성 요한 보노의 영광', '1838–42 베르티니'], chapS_e: ['V13 성 요한 보노', '1838–42 베르티니'], chapS_upper: ['V12bis 구세주 그리스도와 성인들', '1838–42 베르티니'],
  chapN_e: ['V27 성모의 생애', '1842–47 베르티니'], chapN_c: ['V28 성모의 생애', '1842–47 베르티니'], chapN_w: ['V29 성모의 생애', '1842–47 베르티니'], chapN_upper: ['북익랑 경당 위 큰 창(번호 미확인)', '미확인', 'unverified'],
  apse_south: ['V19 신약 이야기', '1838–65 베르티니 공방'], apse_center: ['V20 요한 묵시록(라차 창)', '1416–1545; 하부 1834–38'], apse_north: ['V21 구약 이야기', '1835–65 베르티니 공방'],
  cfLower_n2: ['V40 성녀 테클라의 순교', '1860'], cfLower_n1: ['V41 주교로 뽑히는 성 암브로시오', '1855'], cfLower_c: ['V45 성모 승천', '1834–54'], cfLower_s1: ['V42 오리아 영지를 파는 성 카롤로', '1855'], cfLower_s2: ['V43 성 미카엘(추정)', '19세기'],
  cfUpper_n1: ['V44 교회(Ecclesia)', '1955 하이날', 'protected'], cfUpper_c: ['V47 삼위일체', '1955 하이날', 'protected'], cfUpper_s1: ['V46 시나고가', '1955 하이날', 'protected']
};
function realMilan(o) {
  const k = o.key;
  if (o.kind === 'door') return R('not_window', '정문 문짝(나무)', '', MGR + ' §3.6');
  let m = /^aisle([NS])_b(\d)$/.exec(k);
  if (m) { const v = m[1] === 'S' ? +m[2] : 40 - +m[2], e = MILAN_V[v]; return R(e[2] === 'protected' ? 'stained_protected' : 'stained', 'V' + String(v).padStart(2, '0') + ' ' + e[0], e[1], MGR + ' §3.1·3.5'); }
  if (MILAN_KEY[k]) { const e = MILAN_KEY[k]; return R(e[2] === 'protected' ? 'stained_protected' : (e[2] === 'unverified' ? 'stained_unverified' : 'stained'), e[0], e[1], MGR + ' §3.2~3.6'); }
  if (/^clere/.test(k)) return R('stained', '고창 장식 유리(서사 없음)', '1950년대 초', MGR + ' §4(f)');
  if (/^tiburio_/.test(k)) return R('stained_protected', '티부리오: 제2차 바티칸 공의회 연작', '1968', MGR + ' §4(f)');
  return R('stained_unverified', '?', '', '');
}
const REAL = {
  milan: realMilan,
  florence(o) {
    const k = o.key;
    if (k === 'facade_center') return R('stained', '성모 승천(오쿨루스)', '1404–05 기베르티', PLAN + ' §1.3');
    if (/^facade_[NS]$/.test(k)) return R('stained', '옥좌의 성 라우렌시오 / 성 스테파노(좌우 미확정)', '1412–15 기베르티', PLAN + ' §1.3');
    if (/^aisle[NS]_b[34]$/.test(k)) return R('stained', '측랑 이련창 성인들(3~4단)', '1394–96', PLAN + ' §1.3');
    if (/^aisle[NS]_b[12]$/.test(k) || /^naveOc/.test(k) || k === 'drum_W') return R('plain', 'ICCD 그림 창 44점에 없음(무도상 유리, 종류 미확인)', '', PLAN + ' §1.3·1.4');
    if (k === 'drum_E') return R('stained', '성모 대관(도나텔로)', '1433–37', PLAN + ' §1.3');
    if (/^drum_/.test(k)) return R('stained', '드럼 오쿨루스(주님 승천·겟세마니·성전 봉헌·성탄·부활·십자가에서 내려지심 — 면 미확정)', '1443–45', PLAN + ' §1.3');
    if (/^trib[ENS]_c/.test(k)) return R('stained', '트리부나 경당 창: 봉헌 성인 + 성인 둘', '1439–43 기베르티(3점 1890–1906 재제작)', PLAN + ' §1.3');
    if (/^trib[ENS]_u/.test(k)) return R('stained', '트리부나 윗창: 예언자·구약의 임금·성조', '1434–42', PLAN + ' §1.3');
    return R('stained_unverified', '?', '', '');
  },
  myeongdong(o) {
    const k = o.key;
    if (/^apse_/.test(k)) return R('stained', '묵주기도 15단(창마다 세 장면, 배열 미확인)', '1898 무렵 제스타 공방', PLAN + ' §2.3');
    if (k === 'trEndL') return R('stained', '성탄과 동방 박사들의 경배', '1898 무렵', PLAN + ' §2.3');
    if (k === 'trEndR') return R('stained', '예수님과 열두 사도', '1898 무렵', PLAN + ' §2.3');
    if (k === 'facade_tympanum') return R('stained_protected', '제44차 세계 성체대회 기념(추상 색면 + 성체)', '1989 이남규', PLAN + ' §2.3·2.6');
    if (/^aisle[LR]_n/.test(k)) return R('stained', '신자석 무늬창("꽃 모양", 인물 없음)', '1898 무렵', PLAN + ' §2.3');
    if (/^clere[LR]_n/.test(k)) return R('stained', '고측창 무늬 색유리', '1898 무렵', PLAN + ' §2.3');
    if (/^aisleEnd/.test(k)) return R('stained', '측랑 끝 작은 장미창(동쪽은 대칭 추정)', '', PLAN + ' §2.3');
    if (k === 'facade_tower' || /^tr(Up|In)/.test(k) || /_s\d$/.test(k)) return R('stained_unverified', '도상 미확인(같은 성당의 무늬창으로 봄)', '', PLAN + ' §2.4');
    return R('stained_unverified', '?', '', '');
  },
  stpeter(o) {
    if (o.key === 'gloria') return R('stained', '성령의 비둘기', '1657–66 베르니니', PLAN + ' §3.3');
    if (o.kind === 'not_window') return R('not_window', '창이 아닌 빛 면(문 바깥빛·경당 벽 안 빛)', '', PLAN + ' §3.2');
    return R('clear', '무색 유리 격자(그림 없음)', '', PLAN + ' §3.3');
  },
  maggiore(o) {
    if (o.key === 'facade_center' && o.shape === 'circle') return R('stained_protected', '장미창 — 교회의 어머니 성모', '1995 하이날', PLAN + ' §4.3');
    if (/^facade/.test(o.key)) return R('plain', '정면의 다른 창(확인 못 함 — 그림 유리 기록 없음)', '', PLAN + ' §4.4');
    return R('plain', '그림 유리 없음(무색·옅은 유리)', '', PLAN + ' §4.3');
  },
  lateran(o) {
    if (/^apse_/.test(o.key)) return R('clear', '희고 옅은 유리 + 격자 납틀(그림 없음)', '', PLAN + ' §5.3');
    return R('plain', '그림 유리 없음', '', PLAN + ' §5.3');
  },
  stpaul() { return R('alabaster', '설화석고 판(1891 폭발로 색유리 소실 뒤)', '', PLAN + ' §6.3'); },
  basic() { return R('virtual', '가상의 본당(실제 창 없음) — 창작 무늬', '', PLAN + ' §7'); },
  danggogae() { return R('hanji', '한지 유리화 빛 상자(작가 미확인, 2011)', '2011', 'interiors/danggogae.md §6.4'); },
  yeouido(o) {
    if (/^front/.test(o.key)) return R('stained_protected', '정면 키 큰 현대 색유리(작가 미확인)', '현대', 'interiors/yeouido.md §4.1');
    if (/^lobbyGlass/.test(o.key)) return R('stained_protected', '로비 전면 색유리(최영심 빅토리아, 2024 — 생존 작가)', '2024', 'interiors/yeouido.md §4.1');
    if (/^lobbyFront/.test(o.key)) return R('clear', '로비 유리 정면(맑은 유리, 밖은 밝은 빛)', '', 'interiors/yeouido.md §2.5');
    return R('plain', '창(실물 미확인 — 옅은 빛 유리로 둠)', '', 'interiors/yeouido.md §6.3');
  }
};

const STAINED = new Set(['stained', 'stained_protected', 'stained_unverified', 'virtual']);
// 실제 종류별로 허용하는 모델 표현
function judge(real, model) {
  if (real.kind === 'not_window') return { ok: true, gap: null };
  if (model.release === 'cells') return { ok: false, gap: STAINED.has(real.kind) ? '자리표시 색 격자(그림 없는 색 칸)' : '실제는 옅은 유리인데 색 격자' };
  if (STAINED.has(real.kind)) {
    if (/^photo:|^gen:/.test(model.release)) {
      if (real.kind === 'stained_protected' && /^gen:/.test(model.release) && !model.release.slice(4).split(' ')[0].split('+').every(isAbstract)) return { ok: false, gap: '권리 존속 창 자리에 인물 무늬(추상만 허용)' };
      return { ok: true, gap: null };
    }
    return { ok: false, gap: '색유리 자리인데 ' + (model.release === 'plain' ? '무늬 없는 옅은 유리' : model.release) };
  }
  if (real.kind === 'hanji') return model.release === 'hanji' ? { ok: true, gap: null } : { ok: false, gap: '한지 빛 판 없음' };
  // plain · clear · alabaster: 무늬 없는 옅은 유리, 그 재질의 생성 무늬, 또는 진본 재질 사진
  if (model.release === 'plain' || /^photo:/.test(model.release) || /^gen:(clear|alabaster|florence_plain|grisaille)/.test(model.release)) return { ok: true, gap: null };
  return { ok: false, gap: '실제는 ' + real.kind + ' 인데 ' + model.release };
}

function modelOf(o, church) {
  const gen = o.glass && o.glass.length ? 'gen:' + o.glass.join('+') : null;
  let release;
  if (church === 'danggogae') release = 'hanji';                 // 빌더가 키트 자리 앞에 한지 빛 판(무늬 없음) + 창살을 짓는다(ch_danggogae.js §6.4)
  else if (o.photo) release = 'photo:' + o.photo;
  else if (gen) release = gen;
  else release = o.palette === 'stained' ? 'cells' : 'plain';
  const dev = church === 'milan' && o.kind !== 'door' ? 'dev 시안(dev/devglass.js)이 앞을 덮음 · 뒤는 ' + release : release;
  return { release, dev, fallback: o.photo && gen ? gen : null };
}

export function inventory(opts = {}) {
  const out = {};
  const ids = opts.ids || ['basic', 'stpeter', 'lateran', 'maggiore', 'stpaul', 'milan', 'florence', 'myeongdong', 'danggogae', 'yeouido'];
  for (const id of ids) {
    let rows = [];
    if (id === 'milan') {
      const m = measureMilan();
      const use = new Map(); for (const u of m.glassUse) if (u.key) { if (!use.has(u.key)) use.set(u.key, new Set()); use.get(u.key).add(u.style); }
      const slotKeys = new Set(['apse_center']);
      rows = m.openings.map((o) => ({ key: o.key, zone: o.zone, kind: o.kind === 'door' ? 'door' : 'window', shape: 'pointed', w: o.w, h: o.h, x: o.x, y: o.y, z: o.z,
        glass: use.has(o.key) ? [...use.get(o.key)] : null, photo: slotKeys.has(o.key) && m.glassSlots.length ? m.glassSlots[0].win + '(아래 일부)' : null,
        palette: o.kind === 'door' ? 'door' : 'stained' }));
    } else {
      const m = measure(id);
      rows = m.openings.map((o) => ({ key: o.key, zone: o.zone, kind: o.kind, shape: o.shape, w: o.w, h: o.h, x: o.x, y: o.y, z: o.z, glass: o.glass, photo: o.photo, palette: o.palette }));
    }
    out[id] = rows.map((o) => {
      const real = REAL[id](o), model = modelOf(o, id), j = judge(real, model);
      // 밀라노 사진 창(V20 아래 일부)은 같은 창 위쪽이 생성 무늬다 → 모델 표기는 둘 다
      if (id === 'milan' && o.photo) model.release = (o.glass ? 'gen:' + o.glass.join('+') : 'cells') + ' + photo:' + o.photo;
      return { key: o.key, zone: o.zone, shape: o.shape, size: (+o.w).toFixed(2) + '×' + (+o.h).toFixed(2), real, model, ok: j.ok, gap: j.gap };
    });
  }
  return out;
}

export function summary(inv) {
  const s = {};
  for (const [id, rows] of Object.entries(inv)) {
    const c = { openings: rows.length, stained: 0, protected: 0, unverified: 0, plain: 0, alabaster: 0, hanji: 0, virtual: 0, notWindow: 0, photo: 0, gen: 0, plainModel: 0, cells: 0, hanjiModel: 0, gaps: 0 };
    for (const r of rows) {
      const k = r.real.kind;
      if (k === 'stained') c.stained++; else if (k === 'stained_protected') c.protected++; else if (k === 'stained_unverified') c.unverified++;
      else if (k === 'plain' || k === 'clear') c.plain++; else if (k === 'alabaster') c.alabaster++; else if (k === 'hanji') c.hanji++; else if (k === 'virtual') c.virtual++; else c.notWindow++;
      const m = r.model.release;
      if (/photo:/.test(m)) c.photo++; else if (/^gen:/.test(m)) c.gen++; else if (m === 'cells') c.cells++; else if (m === 'plain') c.plainModel++; else if (m === 'hanji') c.hanjiModel++;
      if (!r.ok) c.gaps++;
    }
    s[id] = c;
  }
  return s;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), inv = inventory(), sm = summary(inv);
  if (a.includes('--json')) { console.log(JSON.stringify({ generated: 'tools/church_web/glass_inventory.mjs', assets: process.env.CHURCH_ASSETS || 'assets/church', summary: sm, churches: inv }, null, 1)); process.exit(0); }
  if (a.includes('--md')) {
    for (const [id, rows] of Object.entries(inv)) {
      console.log('\n### ' + id + '\n\n| key | 구역 | 크기 | 실제 | 시대·작가 | 모델(배포판) | 개발판 | 판정 |\n|---|---|---|---|---|---|---|---|');
      for (const r of rows) console.log(`| \`${r.key}\` | ${r.zone} | ${r.size} | ${r.real.kind}: ${r.real.what} | ${r.real.era} | ${r.model.release}${r.model.fallback ? ' (대역 ' + r.model.fallback + ')' : ''} | ${r.model.dev === r.model.release ? '같음' : r.model.dev} | ${r.ok ? 'OK' : '빈자리: ' + r.gap} |`);
    }
    process.exit(0);
  }
  console.log('성당        개구부 | 실제: 색유리 권리 미확인 옅음 설화 한지 가상 창아님 | 모델: 사진 생성 옅음 색격자 한지 | 빈자리');
  for (const [id, c] of Object.entries(sm)) console.log(`${id.padEnd(11)} ${String(c.openings).padStart(5)} | ${[c.stained, c.protected, c.unverified, c.plain, c.alabaster, c.hanji, c.virtual, c.notWindow].map((v) => String(v).padStart(4)).join(' ')} | ${[c.photo, c.gen, c.plainModel, c.cells, c.hanjiModel].map((v) => String(v).padStart(4)).join(' ')} | ${c.gaps}`);
  for (const [id, rows] of Object.entries(inv)) for (const r of rows) if (!r.ok) console.log('  빈자리', id, r.key, '—', r.gap, '(실제 ' + r.real.kind + ', 모델 ' + r.model.release + ')');
}
