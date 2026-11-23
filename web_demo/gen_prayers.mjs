// web_demo/gen_prayers.mjs — 웹 데모 묵주기도에 싣는 기도문·신비를 확인된 출처에서 글자 그대로 뽑아 shell/prayers.js 를 만든다.
//   node web_demo/gen_prayers.mjs           # shell/prayers.js 를 다시 쓴다
//   node web_demo/gen_prayers.mjs --check   # 지금 파일이 출처와 같은지만 본다(다르면 종료 코드 1)
// 출처(손으로 옮겨 적지 않는다 — 기도문을 기억으로 쓰지 않는다):
//   ko  lib/domain/prayer_data.dart (앱의 기도문·신비 20단·요일 배분 그대로)
//   en  docs/legal/church_permission/package/prayer-usccb/texts.md (신비 묶음 이름은 그 파일이 「제가 붙인 이름」이라 밝혀서 prayer-lev 의 영어판 Compendium 것)
//   it  prayer-cei/texts.md (현행 주님의 기도 = 그 절의 첫 본문)
//   es  prayer-cee/texts.md
//   pt  prayer-cnbb/texts.md (신비 묶음 이름은 그 파일이 「제가 붙인 이름」이라 밝혀서 prayer-lev 의 포르투갈어판 Compendium 것)
// 싣지 않는 본문: 자리 표시(〔…〕)만 있는 것, 형태가 둘이라 아직 고르지 않은 것, 「일부만 확인」이라 적힌 것(SKIP 표).
// 그 기도는 순서에서 빼지 않고 이름만 싣는다(pending) — 화면은 그 자리에 「공식 본문을 받는 대로 넣습니다」를 보인다(사용자 지시 2026-11-23).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(here, '..');
export const OUT = path.join(here, 'shell/prayers.js');
const PKG = 'docs/legal/church_permission/package';
export const SOURCES = {
  ko: 'lib/domain/prayer_data.dart',
  en: PKG + '/prayer-usccb/texts.md',
  it: PKG + '/prayer-cei/texts.md',
  es: PKG + '/prayer-cee/texts.md',
  pt: PKG + '/prayer-cnbb/texts.md',
  lev: PKG + '/prayer-lev/texts.md'
};
export const IDS = ['sign', 'creed', 'our', 'hail', 'glory', 'fatima'];
export const SETS = ['joyful', 'luminous', 'sorrowful', 'glorious'];   // 앱 MysterySet 순서(서버 ms 0..3)

// 기도문 절 제목(texts.md 의 ### 줄) → 기도 id
const HEADS = {
  en: { 'The Sign of the Cross': 'sign', 'The Apostles’ Creed': 'creed', 'The Our Father': 'our', 'The Hail Mary': 'hail', 'The Glory Be': 'glory', 'The Fatima prayer': 'fatima', 'The mysteries of the Rosary': 'myst' },
  it: { 'Segno della Croce': 'sign', 'Simbolo degli Apostoli': 'creed', 'Padre nostro': 'our', 'Ave Maria': 'hail', 'Gloria al Padre': 'glory', 'Preghiera di Fatima': 'fatima', 'Misteri del Rosario': 'myst' },
  es: { 'Señal de la Cruz': 'sign', 'Símbolo de los Apóstoles': 'creed', 'Padre nuestro': 'our', 'Avemaría': 'hail', 'Gloria al Padre': 'glory', 'Oración de Fátima': 'fatima', 'Misterios del Rosario': 'myst' },
  pt: { 'Sinal da Cruz': 'sign', 'Creio (Símbolo dos Apóstolos)': 'creed', 'Pai-Nosso': 'our', 'Ave-Maria': 'hail', 'Glória ao Pai': 'glory', 'Oração de Fátima': 'fatima', 'Mistérios do Rosário': 'myst' }
};
// 일부러 빼는 본문과 까닭(보고·시험이 읽는다)
export const SKIP = {
  it: { fatima: 'prayer-cei: 「Stato: 〔확인 필요〕 verificato solo in parte」 — CEI 가 승인한 형태인지 확인 전' },
  es: { fatima: 'prayer-cee: 본문이 비어 있음(〔확인 필요〕 자리 표시)' },
  pt: { fatima: 'prayer-cnbb: CNBB 쪽에 형태가 둘(A·B)이고 아직 고르지 않음' }
};
// 신비 묶음 이름을 prayer-lev(Compendium 각 언어판)에서 가져오는 언어
const LEV_SET_NAMES = { en: 'Inglese — The mysteries of the Rosary', pt: 'Portoghese — Mistérios do Rosário' };

function read(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }

// ---- texts.md: ### 절마다 첫 ```text 묶음 ----
export function mdSections(md) {
  const out = {};
  const parts = md.split(/^### /m).slice(1);
  for (const p of parts) {
    const head = p.slice(0, p.indexOf('\n')).trim();
    const m = /```text\n([\s\S]*?)\n```/.exec(p);
    if (m && !(head in out)) out[head] = m[1];
  }
  return out;
}
function setOf(heading) {
  const h = heading.toLowerCase();
  if (/joyful|gioia|gozosos|alegria/.test(h)) return 'joyful';
  if (/luminous|light|luce|luminosos|luz/.test(h)) return 'luminous';
  if (/sorrowful|dolore|dolorosos|dor\b|dor$/.test(h)) return 'sorrowful';
  if (/glorious|gloria|gloriosos|glória/.test(h)) return 'glorious';
  return null;
}
const HEAD_RE = /^(The .*Mysteries|The Mysteries of Light|Misteri |Misterios |Mistérios )/;
// 신비 묶음: 묶음 이름 줄 → (요일 줄) → 다섯 단. 마침표로 끝나는 목록은 마침표가 올 때까지 줄을 잇는다(원문 줄 나눔 그대로 \n).
export function parseMysteries(block) {
  const lines = block.split('\n');
  const groups = [];
  let cur = null;
  for (const line of lines) {
    if (HEAD_RE.test(line)) {
      const name = line.replace(/\s*\([^)]*\)\s*$/, '');   // 「Misterios luminosos (jueves)」 → 요일 빼고
      cur = { set: setOf(name), name, lines: [] }; groups.push(cur); continue;
    }
    if (!cur || /^\(.*\)$/.test(line.trim())) continue;   // 요일 줄
    cur.lines.push(line);
  }
  const res = {};
  for (const g of groups) {
    const dotted = g.lines.some((l) => /\.$/.test(l));
    const items = [];
    let acc = null;
    for (const l of g.lines) {
      acc = acc === null ? l : acc + '\n' + l;
      if (!dotted || /\.$/.test(l)) { items.push(acc); acc = null; }
    }
    if (acc !== null) items.push(acc);
    if (!g.set || res[g.set]) throw new Error('신비 묶음을 알 수 없음: ' + g.name);
    if (items.length !== 5) throw new Error(g.name + ': 단이 5개가 아님(' + items.length + ')');
    res[g.set] = { name: g.name, m: items.map((t) => ({ t: t.replace(/^\d\. /, '') })) };
  }
  for (const s of SETS) if (!res[s]) throw new Error('신비 묶음 없음: ' + s);
  return res;
}

// ---- Dart(앱): 문자열 상수 풀기 ----
function dartStr(src) {
  // 붙어 있는 '…' '…' 리터럴들을 이어 붙인다
  let out = '';
  for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) {
    out += m[1].replace(/\\(u\{?[0-9A-Fa-f]+\}?|.)/g, (x, e) => {
      if (e[0] === 'u') return String.fromCodePoint(parseInt(e.replace(/[u{}]/g, ''), 16));
      return { n: '\n', t: '\t', "'": "'", '"': '"', '\\': '\\', $: '$' }[e] ?? e;
    });
  }
  return out;
}
export function parseDart(src) {
  const pr = {};
  const DART_IDS = { signOfCross: 'sign', apostlesCreed: 'creed', ourFather: 'our', hailMary: 'hail', gloryBe: 'glory', fatima: 'fatima' };
  for (const m of src.matchAll(/static const (\w+) = Prayer\(([\s\S]*?)\n  \);/g)) {
    const id = DART_IDS[m[1]];
    if (!id) continue;
    const body = m[2];
    const title = dartStr(/title:\s*('(?:[^'\\]|\\.)*')/.exec(body)[1]);
    const text = dartStr(/text:\s*([\s\S]*?),\s*\n\s*endsWithAmen:/.exec(body)[1]);
    pr[id] = { t: title, x: text };
  }
  const sets = {};
  const names = {};
  for (const m of src.matchAll(/MysterySet\.(\w+) => '([^']*)'/g)) names[m[1]] = m[2];
  for (const s of SETS) sets[s] = { name: names[s], m: [] };
  for (const m of src.matchAll(/Mystery\(\s*set: MysterySet\.(\w+),\s*index: (\d),\s*title: ('(?:[^'\\]|\\.)*'),\s*meditation: ('(?:[^'\\]|\\.)*'),?\s*\)/g)) {
    sets[m[1]].m[+m[2] - 1] = { t: dartStr(m[3]), med: dartStr(m[4]) };
  }
  // 요일 배분: mysterySetForWeekday 의 switch(1=월..7=일) → JS getDay(0=일..6=토)
  const DOW = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const fn = /MysterySet mysterySetForWeekday\(int weekday\) => switch \(weekday\) \{([\s\S]*?)\n\};/.exec(src)[1];
  const weekday = new Array(7).fill(null);
  for (const m of fn.matchAll(/((?:DateTime\.\w+(?:\s*\|\|\s*)?)+) => MysterySet\.(\w+)/g)) {
    for (const d of m[1].matchAll(/DateTime\.(\w+)/g)) weekday[DOW[d[1]]] = SETS.indexOf(m[2]);
  }
  return { prayers: pr, sets, weekday };
}

export function generate() {
  const ko = parseDart(read(SOURCES.ko));
  const data = { ko: { prayers: ko.prayers, sets: ko.sets }, weekday: ko.weekday, skipped: {} };
  const lev = mdSections(read(SOURCES.lev));
  for (const l of ['en', 'it', 'es', 'pt']) {
    const sec = mdSections(read(SOURCES[l]));
    const prayers = {};
    let myst = null;
    for (const [head, id] of Object.entries(HEADS[l])) {
      const block = sec[head];
      if (id === 'myst') { myst = parseMysteries(block); continue; }
      if (SKIP[l] && SKIP[l][id]) { prayers[id] = { t: head, pending: true }; continue; }   // 자리는 남기고(이름 + 「공식 본문을 받는 대로 넣습니다」) 본문은 싣지 않는다
      if (block === undefined) throw new Error(l + ': 절 없음 ' + head);
      if (block.includes('〔')) throw new Error(l + ': 자리 표시가 남은 본문 ' + head);
      prayers[id] = { t: head, x: block };
    }
    if (LEV_SET_NAMES[l]) {
      const names = parseMysteries(lev[LEV_SET_NAMES[l]]);
      for (const s of SETS) myst[s].name = names[s].name;
    }
    data[l] = { prayers, sets: myst };
    if (SKIP[l]) data.skipped[l] = Object.keys(SKIP[l]);
  }
  for (const l of ['ko', 'en', 'it', 'es', 'pt']) for (const id of ['sign', 'creed', 'our', 'hail', 'glory']) if (!data[l].prayers[id]) throw new Error(l + ': 꼭 있어야 하는 기도 없음 ' + id);
  const json = JSON.stringify(data, null, 1).replace(/[\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16));
  return `/* prayers.js — 만든 파일(손대지 마세요): node web_demo/gen_prayers.mjs. 묵주기도 기도문·신비를 확인된 출처에서 글자 그대로 옮겼다.
   ko = lib/domain/prayer_data.dart · en = prayer-usccb · it = prayer-cei · es = prayer-cee · pt = prayer-cnbb (docs/legal/church_permission/package/<id>/texts.md);
   en·pt 신비 묶음 이름 = prayer-lev(Compendium). skipped·pending = 확인된 본문이 없어 이름과 안내만 보이는 기도. weekday = getDay()(0=일) → 신비(0 환희 · 1 빛 · 2 고통 · 3 영광). */
(function (root) { root.DemoPrayers = ${json}; if (typeof module !== 'undefined' && module.exports) module.exports = root.DemoPrayers; })(typeof window !== 'undefined' ? window : globalThis);
`;
}

// ---- 십자가의 길(shell/stations.js): 앱과 같은 원본 data/stations_prayers.json · stations_of_cross.json · stations_series.json ----
// 연작은 출시 빌드 규칙(lib/app/release_gate.dart 의 hiddenStationSeriesIds · stationSeriesOverrides)대로: 숨긴 연작은 싣지 않고 대체 연작으로.
export const OUT_STATIONS = path.join(here, 'shell/stations.js');
export function releaseGate(src) {
  const hid = /hiddenStationSeriesIds = \{([^}]*)\}/.exec(src)[1];
  const ov = /stationSeriesOverrides = \{([^}]*)\}/.exec(src)[1];
  return {
    hidden: [...hid.matchAll(/'([^']+)'/g)].map((m) => m[1]),
    overrides: Object.fromEntries([...ov.matchAll(/'([^']+)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]]))
  };
}
export function generateStations() {
  const pr = JSON.parse(read('data/stations_prayers.json'));
  const sc = JSON.parse(read('data/stations_of_cross.json'));
  const se = JSON.parse(read('data/stations_series.json'));
  const gate = releaseGate(read('lib/app/release_gate.dart'));
  const cross = fs.readFileSync(path.join(REPO, 'assets/church/cross_data.js'), 'utf8');
  const packs = {};
  for (const m of cross.matchAll(/"(\w+)": \{\s*"file": "([^"]+)"/g)) packs[m[1]] = m[2];
  const series = {};
  for (const s of se.series) {
    if (gate.hidden.includes(s.id)) continue;   // 출시 빌드에서 숨긴 연작(프레비아티)은 싣지 않는다
    if (!packs[s.id] || packs[s.id].startsWith('dev/')) throw new Error('장면에 이 연작의 그림 묶음이 없다: ' + s.id);
    // ko 출처 한 줄 = 앱 StationsSeries.creditLine 과 같은 꼴
    series[s.id] = { pack: packs[s.id], ko: `${s.title}, ${s.year}, ${s.place}. 사진·스캔 ${s.photographer}. ${s.license_label}. ${s.changes}.`, artist: s.artist_latin, year: s.year, photo: /[가-힣]/.test(s.photographer) ? '' : s.photographer, license: s.license_label };
  }
  const assign = {};
  for (const [c, id] of Object.entries(se.assignments)) assign[c] = gate.hidden.includes(id) ? (gate.overrides[c] || se.default) : id;
  const byN = Object.fromEntries(pr.stations.map((x) => [x.n, x]));
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'];
  const data = {
    credit: pr.source.credit, markers: Object.fromEntries(Object.entries(pr.markers).map(([k, v]) => [k, { g: v.glyph, o: v.official }])),
    openingRubric: pr.intro_rubrics[pr.intro_rubrics.length - 1], opening: pr.opening, toStation: pr.to_station, verse: pr.verse, after: pr.after,
    closing: sc.closing, disclosure: se.disclosure, def: se.default, assign, series,
    stations: sc.stations.map((s) => ({ n: s.n, roman: ROMAN[s.n - 1], title: s.title, refs: s.refs, tradition: !!s.tradition, meditation: s.meditation, petition: s.petition, announce: byN[s.n].announce, prayer: byN[s.n].prayer }))
  };
  const json = JSON.stringify(data, null, 1).replace(/[\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16));
  return `/* stations.js — 만든 파일(손대지 마세요): node web_demo/gen_prayers.mjs. 십자가의 길: 앱과 같은 원본
   data/stations_prayers.json(『가톨릭 기도서』 공식 기도문, 글자 그대로) · data/stations_of_cross.json · data/stations_series.json.
   연작은 출시 빌드 규칙(release_gate.dart: hidden ${JSON.stringify(gate.hidden)} → ${JSON.stringify(gate.overrides)})대로. 그림은 장면의 cross_pack*.js 를 다시 쓴다.
   한국어 말고는 확인된 십자가의 길 본문이 없어 화면이 「공식 본문을 받는 대로 넣습니다」를 보인다. */
(function (root) { root.DemoStations = ${json}; if (typeof module !== 'undefined' && module.exports) module.exports = root.DemoStations; })(typeof window !== 'undefined' ? window : globalThis);
`;
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const outs = [[OUT, generate()], [OUT_STATIONS, generateStations()]];
  let bad = 0;
  for (const [f, s] of outs) {
    if (process.argv.includes('--check')) {
      const cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
      if (cur !== s) { console.error(path.basename(f) + ' 가 출처와 다릅니다 — node web_demo/gen_prayers.mjs'); bad = 1; } else console.log(path.basename(f) + ' 같음');
    } else { fs.writeFileSync(f, s); console.log('썼음: ' + f + ' (' + s.length + ' 바이트)'); }
  }
  process.exit(bad);
}
