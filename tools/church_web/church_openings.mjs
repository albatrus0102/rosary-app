// 성당 씬의 창 개구부 조회(E-3, docs/church/GLASS_ALL_CHURCHES_PLAN.md) — 씬 코드를 고치지 않고 빌더를 Node(vm)에서 그대로 돌려 잰다.
// milan_openings.mjs(E-1, 밀라노 전용)를 일반화한 것이다. 밀라노는 그 스크립트를 쓴다(여기서는 다루지 않는다).
//
// 사용: node tools/church_web/church_openings.mjs florence          # 개구부 표(구역별)
//       node tools/church_web/church_openings.mjs florence --json   # 개구부 전체(JSON: world 좌표·법선·크기·형태·현재 유리)
//       node tools/church_web/church_openings.mjs florence --md     # 문서용 마크다운 표
//       node tools/church_web/church_openings.mjs --all             # 성당별 요약(개구부 수·구역별 수·좌표계)
//       node tools/church_web/church_openings.mjs --ids             # 다룰 수 있는 성당 id
//   성당 id: stpeter, lateran, maggiore, stpaul, florence, myeongdong, basic  (밀라노는 milan_openings.mjs)
//
// 재는 방법(성당마다 창을 짓는 방식이 달라 세 갈래를 모두 모은다):
//   (1) 키트 창 ctx.window / ctx.rose — 빌더가 넘긴 사양(S_.windows / S_.roses: 위치·face·w·h·top·pattern·colors·photo)을 그대로 읽는다.
//       돔 드럼 창(ctx.dome({drum}))도 내부에서 ctx.window 를 부르므로 여기 들어온다.
//   (2) 손으로 지은 유리 — 빌더가 glass 배치에 직접 넣는 삼각형(ctx.glass.addTris / addQuad)을 가로채, 같은 평면·맞닿은 것끼리 묶어 개구부 하나로 본다.
//       (성 베드로의 격자 창·랜턴, 명동의 트레이서리 창, 피렌체·성 바오로의 손 지은 창 등)
//   (3) 사진 창 자리 ctx.glassSlot — G-29 진본 사진 판이 걸린 자리(S_.glassSlots).
//   구역·key 는 성당별 어댑터(ADAPTERS)가 위치로 이름 붙인다. 이름을 못 붙인 것은 zone 'other' 로 남긴다(숨기지 않는다).
// 좌표계(모든 성당 공통): 입구 +z, 제대 -z, 위 +y. x 의 방위(어느 쪽이 남/북)는 성당마다 다르다 → ADAPTERS[id].axes.
// 단위는 앱 미터(= 실제 m × scalePercent/100). yaw = atan2(nx, nz): 판의 +Z(앞면)가 실내를 보게 하는 Y 회전(glass_place.js buildMesh 와 같은 규약).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');

// church_harness.mjs / milan_openings.mjs 와 같은 가짜 canvas 샌드박스
function makeSandbox() {
  const sandbox = { console, performance, setTimeout, clearTimeout };
  sandbox.window = sandbox; sandbox.self = sandbox;
  const noop = () => {};
  const ctx2d = new Proxy(noop, {
    get: (t, k) => {
      if (k === 'canvas') return {};
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: noop });
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData' || k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      return noop;
    },
    set: () => true
  });
  sandbox.document = {
    createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctx2d, toDataURL: () => '', addEventListener: noop }),
    getElementById: () => null, readyState: 'complete', addEventListener: noop, body: { insertAdjacentHTML: noop }
  };
  sandbox.location = { search: '' };
  sandbox.navigator = { userAgent: 'node' };
  sandbox.Image = function () {};
  vm.createContext(sandbox);
  return sandbox;
}

const r3 = (v) => Math.round(v * 1000) / 1000 + 0, r2 = (v) => Math.round(v * 100) / 100 + 0;
const yawOf = (nx, nz) => { const v = r2(Math.atan2(nx, nz) * 180 / Math.PI); return v <= -179.99 ? 180 : v; };
const hex = (c) => (typeof c === 'number' ? '#' + c.toString(16).padStart(6, '0') : String(c));
const near = (a, b, e = 0.7) => Math.abs(a - b) < e;

// 유리 색 묶음을 '색유리(그림 자리) / 무색·옅은 유리 / 설화석고' 로 가른다(현재 모델이 그 창을 무엇으로 그리고 있는지).
function paletteKind(colors) {
  if (!colors || !colors.length) return 'stained';              // 키트 기본값 JEWEL
  let sat = 0, lum = 0, warm = 0, n = 0;
  for (const c of colors) {
    if (typeof c !== 'number') continue;
    const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    sat += mx ? (mx - mn) / mx : 0; lum += (r + g + b) / 765; warm += (r - b) / 255; n++;
  }
  if (!n) return 'stained';
  sat /= n; lum /= n; warm /= n;
  if (sat > 0.45) return 'stained';
  if (lum > 0.72 && warm > 0.12) return 'warm';                 // 따뜻한 옅은 색(설화석고·호박색 유리)
  return 'pale';                                                // 무색에 가까운 옅은 유리
}
const KIND_KO = { stained: '절차적 색유리', warm: '절차적 옅은 호박색(설화석고풍)', pale: '절차적 무색·옅은 유리' };

/** 성당 빌더를 돌려 원자료(키트 창·장미창·손 지은 유리 묶음·사진 자리)를 모은다. */
export function measureRaw(id, opts = {}) {
  const sb = makeSandbox();
  if (opts.search) sb.location.search = opts.search;
  const run = (f) => vm.runInContext(fs.readFileSync(path.join(assets, f), 'utf8'), sb, { filename: f });
  ['three.min.js', 'three_extras.js', 'palette.js', 'layouts.js', 'scene_logic.js', 'stations.js', 'geo.js', 'photos.js', 'kit_tex.js', 'kit.js', 'glass_placements.js', 'cross_data.js', 'way_cross.js', 'liturgy.js', 'ch_' + id + '.js'].forEach(run);
  const b = sb.ChurchBuilders[id];
  if (!b) throw new Error('빌더 없음: ' + id);
  const ctx = sb.ChurchKit.createContext({ layout: b.layout, quality: opts.quality || 'low' });
  const tris = [];   // 손으로 지은 유리 삼각형 {v:[9], col, hint}
  const glassAdd = ctx.glass.addTris.bind(ctx.glass);
  ctx.glass.addTris = function (verts, color, hint, o) {
    for (let i = 0; i + 8 < verts.length; i += 9) tris.push({ v: Array.prototype.slice.call(verts, i, i + 9), col: Array.isArray(color) ? null : color, hint: hint ? Array.from(hint) : null });
    return glassAdd(verts, color, hint, o);
  };
  let glassObjs = 0;
  const gAdd = ctx.glass.add.bind(ctx.glass);
  ctx.glass.add = function (...a) { glassObjs++; return gAdd(...a); };
  const beams = [];
  if (ctx.addWindowBeam) { const ab = ctx.addWindowBeam.bind(ctx); ctx.addWindowBeam = function (o) { beams.push(o); return ab(o); }; }
  b.build(ctx);                       // 키트 창은 _prepare 때 지어지므로 여기까지 잡힌 삼각형은 전부 '손으로 지은 유리'
  const S = ctx._;
  return { id, layout: b.layout, S, tris, glassObjs, beams };
}

// 손 지은 유리 삼각형 → 평면별·맞닿은 것끼리 묶음(개구부)
function clusterTris(tris, gap = 0.3) {
  const items = [];
  for (const t of tris) {
    const v = t.v, ax = v[0], ay = v[1], az = v[2], ux = v[3] - ax, uy = v[4] - ay, uz = v[5] - az, wx = v[6] - ax, wy = v[7] - ay, wz = v[8] - az;
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.hypot(nx, ny, nz);
    if (l < 1e-10) continue;
    nx /= l; ny /= l; nz /= l;
    const cx = (v[0] + v[3] + v[6]) / 3, cy = (v[1] + v[4] + v[7]) / 3, cz = (v[2] + v[5] + v[8]) / 3;
    if (t.hint && nx * (t.hint[0] - cx) + ny * (t.hint[1] - cy) + nz * (t.hint[2] - cz) < 0) { nx = -nx; ny = -ny; nz = -nz; }   // 배치의 hint 규약: 앞면이 hint 를 본다 = 실내 쪽
    items.push({ v, nx, ny, nz, d: nx * cx + ny * cy + nz * cz, col: t.col, area: l / 2,
      bb: [Math.min(v[0], v[3], v[6]), Math.min(v[1], v[4], v[7]), Math.min(v[2], v[5], v[8]), Math.max(v[0], v[3], v[6]), Math.max(v[1], v[4], v[7]), Math.max(v[2], v[5], v[8])] });
  }
  // union-find: 법선이 거의 같고(각 8° 이내) 평면 거리 0.12m 이내, 상자가 gap 이내로 맞닿은 것
  const par = items.map((_, i) => i), find = (i) => (par[i] === i ? i : (par[i] = find(par[i])));
  const cell = 2.0, grid = new Map();
  items.forEach((it, i) => {
    const k = Math.floor((it.bb[0] + it.bb[3]) / 2 / cell) + ',' + Math.floor((it.bb[1] + it.bb[4]) / 2 / cell) + ',' + Math.floor((it.bb[2] + it.bb[5]) / 2 / cell);
    if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); it.cell = k.split(',').map(Number);
  });
  items.forEach((a, i) => {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const arr = grid.get((a.cell[0] + dx) + ',' + (a.cell[1] + dy) + ',' + (a.cell[2] + dz)); if (!arr) continue;
      for (const j of arr) {
        if (j <= i) continue; const c = items[j];
        if (a.nx * c.nx + a.ny * c.ny + a.nz * c.nz < 0.99) continue;
        if (Math.abs(a.d - c.d) > 0.12) continue;
        if (a.bb[0] - c.bb[3] > gap || c.bb[0] - a.bb[3] > gap || a.bb[1] - c.bb[4] > gap || c.bb[1] - a.bb[4] > gap || a.bb[2] - c.bb[5] > gap || c.bb[2] - a.bb[5] > gap) continue;
        par[find(i)] = find(j);
      }
    }
  });
  const groups = new Map();
  items.forEach((it, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(it); });
  const out = [];
  for (const g of groups.values()) {
    let nx = 0, ny = 0, nz = 0, area = 0; const cols = new Map();
    for (const it of g) { nx += it.nx * it.area; ny += it.ny * it.area; nz += it.nz * it.area; area += it.area; if (it.col != null) cols.set(it.col, (cols.get(it.col) || 0) + it.area); }
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const horiz = Math.abs(ny) > 0.8;
    // 판 좌표: 세로 창이면 u = (nz, -nx) 정규화(실내에서 볼 때 왼→오), v = y. 수평(천창)이면 u = x, v = z.
    const hl = Math.hypot(nx, nz) || 1, ux = horiz ? 1 : nz / hl, uz = horiz ? 0 : -nx / hl;
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9, sx = 0, sy = 0, sz = 0, n = 0; const pts = [];
    for (const it of g) for (let k = 0; k < 9; k += 3) {
      const x = it.v[k], y = it.v[k + 1], z = it.v[k + 2], u = x * ux + z * uz, vv = horiz ? z : y;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, vv); v1 = Math.max(v1, vv); sx += x; sy += y; sz += z; n++; pts.push([u, vv]);
    }
    // 개구부 상자의 가운데를 world 로: 평균점의 평면 깊이를 유지하고 u·v 가운데로 옮긴다
    const mx = sx / n, my = sy / n, mz = sz / n, mu = mx * ux + mz * uz, uc = (u0 + u1) / 2, vc = (v0 + v1) / 2;
    const x = mx + ux * (uc - mu), z = horiz ? vc : mz + uz * (uc - mu), y = horiz ? my : vc;
    // 기공(spring): 좌우 끝(u0·u1)에 닿는 점들의 가장 높은 v. 꼭대기까지 남는 높이 = rise
    let spring = v0; for (const p of pts) if (Math.abs(p[0] - u0) < 0.02 || Math.abs(p[0] - u1) < 0.02) spring = Math.max(spring, p[1]);
    const w = u1 - u0, h = v1 - v0, fill = area / Math.max(1e-6, w * h);
    const colors = [...cols.entries()].sort((a, c) => c[1] - a[1]).map((e) => e[0]);
    out.push({ src: 'custom', x, y, z, nx: horiz ? 0 : nx / hl, nz: horiz ? 0 : nz / hl, ny, horiz, w, h, sill: v0, spring, apex: v1, rise: v1 - spring, fill, tris: g.length, area, colors });
  }
  return out;
}

function shapeOfCustom(c) {
  if (c.horiz) return 'horizontal';
  const a = c.w / c.h;
  if (c.fill > 0.72 && c.fill < 0.84 && a > 0.55 && a < 1.8 && c.rise > c.h * 0.3) return a > 0.9 && a < 1.1 ? 'circle' : 'ellipse';   // 원·타원: 면적비 ≈ π/4
  if (c.rise < 0.03) return 'rect';
  return c.rise > c.w * 0.62 ? 'pointed' : 'round';
}

/** 개구부 목록(어댑터 적용 전). 모두 같은 필드: src, shape, x,y,z(유리 가운데), nx,nz, yawDeg, w,h, sill, spring, apex, colors, glassNow, photo */
export function measure(id, opts = {}) {
  const raw = measureRaw(id, opts), S = raw.S, scale = raw.layout.scalePercent / 100;
  const out = [];
  const rise = (top, w) => (top === 'pointed' ? w * 0.72 : (top === 'round' || top === 'trefoil' ? w / 2 : 0));   // kit.js topRise 와 같다
  for (const wn of S.windows) {
    const F = wn.F, rs = rise(wn.top, wn.w), H = wn.h + rs;
    out.push({ src: 'kit.window', shape: wn.top === 'pointed' ? 'pointed' : (wn.top === 'round' || wn.top === 'trefoil' ? 'round' : 'rect'), top: wn.top, pattern: wn.pattern,
      x: wn.x, y: wn.y + H / 2, z: wn.z, nx: F.nx, nz: F.nz, w: wn.w, h: H, sill: wn.y, spring: wn.y + wn.h, apex: wn.y + H, rise: rs,
      colors: wn.colors || null, painted: !!wn.painted, photo: wn.photo ? wn.photo.win : null, photoSlot: wn.photo ? wn.photo.slot + '[' + wn.photo.index + ']' : null, beam: wn.beam !== false });
  }
  for (const rs of S.roses) {
    const F = rs.F;
    out.push({ src: 'kit.rose', shape: 'circle', pattern: 'rose' + (rs.petals || 12), x: rs.x, y: rs.y, z: rs.z, nx: F.nx, nz: F.nz, w: rs.r * 2, h: rs.r * 2, sill: rs.y - rs.r, spring: rs.y, apex: rs.y + rs.r, rise: rs.r,
      colors: rs.colors || null, photo: rs.photo ? rs.photo.win : null, photoSlot: rs.photo ? rs.photo.slot + '[' + rs.photo.index + ']' : null, beam: !!rs.beam });
  }
  const custom = clusterTris(raw.tris, opts.gap || 0.3);
  for (const c of custom) { c.shape = shapeOfCustom(c); out.push(c); }
  // 사진 자리(ctx.glassSlot): 가까운 개구부에 붙이고, 없으면 따로 적는다
  const slots = (S.glassSlots || []).map((s) => ({ win: s.win, slot: s.slot, index: s.index, shape: s.shape, x: r3(s.x), y: r3(s.y), z: r3(s.z), nx: r3(s.nx), nz: r3(s.nz), w: r3(s.w), h: r3(s.h) }));
  for (const s of slots) {
    let best = null, bd = 1.0;
    for (const o of out) { const d = Math.hypot(o.x - s.x, o.y - s.y, o.z - s.z); if (d < bd) { bd = d; best = o; } }
    if (best && !best.photo) { best.photo = s.win; best.photoSlot = s.slot + '[' + (s.index || 0) + ']'; }
    else if (!best) out.push({ src: 'glassSlot', shape: s.shape || 'rect', x: s.x, y: s.y, z: s.z, nx: s.nx, nz: s.nz, w: s.w, h: s.h, sill: s.y - s.h / 2, spring: s.y, apex: s.y + s.h / 2, rise: 0, colors: null, photo: s.win, photoSlot: s.slot + '[' + (s.index || 0) + ']' });
  }
  const ad = ADAPTERS[id] || {};
  const res = [];
  for (const o of out) {
    if (ad.skip && ad.skip(o)) continue;
    const pk = paletteKind(o.colors);
    const e = {
      key: null, zone: 'other', src: o.src, shape: o.shape, top: o.top || null, pattern: o.pattern || null,
      x: r3(o.x), y: r3(o.y), z: r3(o.z), nx: r3(o.nx), nz: r3(o.nz), yawDeg: o.horiz ? null : yawOf(o.nx, o.nz),
      w: r3(o.w), h: r3(o.h), sill: r3(o.sill), spring: r3(o.spring), apex: r3(o.apex), rise: r3(o.rise), aspect: r3(o.w / o.h),
      realW: r2(o.w / scale), realH: r2(o.h / scale), realSill: r2(o.sill / scale),
      palette: pk, colors: (o.colors || []).slice(0, 6).map(hex), photo: o.photo || null, photoSlot: o.photoSlot || null,
      glassNow: o.photo ? '사진 슬롯 ' + o.photo + ' (' + o.photoSlot + ')' : KIND_KO[pk] + (o.pattern ? ' · ' + o.pattern : ''),
      tris: o.tris || null, fill: o.fill ? r2(o.fill) : null
    };
    const nm = ad.name ? ad.name(e) : null;
    if (nm) { e.zone = nm.zone; e.key = nm.key; if (nm.note) e.note = nm.note; }
    res.push(e);
  }
  // key 중복·미지정 정리: 미지정은 other_<n>, 중복은 _2, _3 …
  const seen = {}; let oi = 0;
  const order = ad.zones || [];
  res.sort((a, b2) => (order.indexOf(a.zone) < 0 ? 99 : order.indexOf(a.zone)) - (order.indexOf(b2.zone) < 0 ? 99 : order.indexOf(b2.zone)) || String(a.key).localeCompare(String(b2.key)) || b2.z - a.z || a.x - b2.x || a.y - b2.y);
  for (const e of res) {
    if (!e.key) e.key = 'other_' + String(++oi).padStart(2, '0');
    if (seen[e.key]) { seen[e.key]++; e.key = e.key + '_' + seen[e.key]; e.dupKey = true; } else seen[e.key] = 1;
  }
  return { id, layout: { id: raw.layout.id, scalePercent: raw.layout.scalePercent, bounds: raw.layout.bounds, spawn: raw.layout.spawn, info: raw.layout.info }, axes: ad.axes || null, consts: ad.consts || null, openings: res, glassSlots: slots, beams: raw.beams.length, glassObjects: raw.glassObjs, customTris: raw.tris.length };
}

// ------------------------------------------------------------------ 성당별 어댑터
// axes: 좌표계 설명(제대 방향, +x 가 어느 방위인지와 근거). name(e): 개구부 → {zone, key}. skip(o): 창이 아닌 유리(등·성수대 등) 걸러내기.
// 여기 적는 수치는 각 빌더의 상수(파일 머리말·주석)에서 옮긴 것이다.
const sideNS = (x, plusIs) => (x > 0.5 ? plusIs : (x < -0.5 ? (plusIs === 'S' ? 'N' : 'S') : 'C'));
export const ADAPTERS = {};

function printTable(rows, cols) {
  const head = '| ' + cols.map((c) => c[0]).join(' | ') + ' |\n|' + cols.map(() => '---').join('|') + '|\n';
  return head + rows.map((r) => '| ' + cols.map((c) => { const v = c[1](r); return v === null || v === undefined ? '' : String(v); }).join(' | ') + ' |').join('\n') + '\n';
}
const SHAPE_KO = { pointed: '첨두', round: '반원 아치', rect: '사각', circle: '원', ellipse: '타원', horizontal: '수평(천창)' };
export const OPEN_COLS = [
  ['key', (o) => '`' + o.key + '`'], ['구역', (o) => o.zone], ['x', (o) => o.x], ['y(중심)', (o) => o.y], ['z', (o) => o.z], ['yaw°', (o) => o.yawDeg],
  ['폭×높이', (o) => o.w + '×' + o.h], ['창턱', (o) => o.sill], ['형태', (o) => SHAPE_KO[o.shape] || o.shape], ['가로/세로', (o) => o.aspect], ['실제 환산(m)', (o) => o.realW + '×' + o.realH], ['지금 유리', (o) => o.glassNow + (o.note ? ' · ' + o.note : '')]
];
/** 같은 구역·같은 치수의 연속 개구부를 한 줄로 접는다(문서 표가 길어지지 않게). key 는 첫…끝. */
export function foldRows(openings) {
  const out = [];
  for (const o of openings) {
    const last = out[out.length - 1];
    const same = last && last.zone === o.zone && last.w === o.w && last.h === o.h && last.sill === o.sill && last.shape === o.shape && last.glassNowBase === o.glassNow.replace(/\[\d+\]/, '[i]') && last.grp === o.key.replace(/\d+$/, '');
    if (same) { last.items.push(o); continue; }
    out.push({ zone: o.zone, w: o.w, h: o.h, sill: o.sill, shape: o.shape, glassNowBase: o.glassNow.replace(/\[\d+\]/, '[i]'), grp: o.key.replace(/\d+$/, ''), items: [o] });
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), ids = Object.keys(ADAPTERS);
  if (a.includes('--ids')) { console.log(ids.join(' ')); process.exit(0); }
  const id = a.find((s) => !s.startsWith('--'));
  if (a.includes('--all') || !id) {
    for (const cid of ids) {
      const m = measure(cid), by = {};
      m.openings.forEach((o) => { by[o.zone] = (by[o.zone] || 0) + 1; });
      const ph = m.openings.filter((o) => o.photo).length;
      console.log(`${cid.padEnd(11)} scale ${String(m.layout.scalePercent).padStart(3)}%  개구부 ${String(m.openings.length).padStart(3)} (사진 슬롯 ${ph}, 절차적 ${m.openings.length - ph})  빛줄기 ${m.beams}  ${Object.entries(by).map(([k, v]) => k + ' ' + v).join(' · ')}`);
      if (m.axes) console.log('            축: ' + m.axes.summary);
    }
    process.exit(0);
  }
  const m = measure(id);
  if (a.includes('--json')) console.log(JSON.stringify(m, null, 1));
  else if (a.includes('--md')) console.log(printTable(m.openings, OPEN_COLS));
  else {
    const by = {};
    m.openings.forEach((o) => { (by[o.zone] = by[o.zone] || []).push(o); });
    console.log(`${id} (scalePercent ${m.layout.scalePercent}): 개구부 ${m.openings.length}개, 사진 창 자리 ${m.glassSlots.length}, 빛줄기 ${m.beams}, 손 지은 유리 삼각형 ${m.customTris}, 유리 배치 물체 ${m.glassObjects}`);
    if (m.axes) console.log('축: ' + m.axes.summary);
    for (const z of Object.keys(by)) {
      console.log(`\n[${z}] ${by[z].length}개`);
      by[z].forEach((o) => console.log(`  ${o.key.padEnd(20)} ${o.src.padEnd(10)} x ${String(o.x).padStart(8)} y ${String(o.y).padStart(7)} z ${String(o.z).padStart(8)} yaw ${String(o.yawDeg).padStart(7)}  ${o.w}x${o.h} ${o.shape} (창턱 ${o.sill})  ${o.glassNow}${o.note ? ' · ' + o.note : ''}`));
    }
  }
}
