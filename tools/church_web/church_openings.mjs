// 성당 씬의 창 개구부 조회(E-3, docs/church/GLASS_ALL_CHURCHES_PLAN.md) — 씬 코드를 고치지 않고 빌더를 Node(vm)에서 그대로 돌려 잰다.
// milan_openings.mjs(E-1, 밀라노 전용)를 일반화한 것이다. 밀라노는 그 스크립트를 쓴다(여기서는 다루지 않는다).
//
// 사용: node tools/church_web/church_openings.mjs florence          # 개구부 표(구역별)
//       node tools/church_web/church_openings.mjs florence --json   # 개구부 전체(JSON: world 좌표·법선·크기·형태·현재 유리)
//       node tools/church_web/church_openings.mjs florence --md     # 문서용 마크다운 표(같은 치수의 창은 한 줄로 접음; 전부는 --md-full)
//       node tools/church_web/church_openings.mjs --all             # 성당별 요약(개구부 수·구역별 수·좌표계)
//       node tools/church_web/church_openings.mjs --ids             # 다룰 수 있는 성당 id
//       node tools/church_web/church_openings.mjs --check           # data/glass_windows/<id>.json 의 개구부 key·좌표가 지금 빌더와 맞는지 검사
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
const assets = process.env.CHURCH_ASSETS ? path.resolve(process.env.CHURCH_ASSETS) : path.resolve(here, '../../assets/church');   // CHURCH_ASSETS: 다른 사본(전/후 비교)

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
  let n = 0, pale = 0, amber = 0;
  for (const c of colors) {
    if (typeof c !== 'number') continue;
    const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 70) continue;                                      // 납틀·뒷판(거의 검정)은 유리 색이 아니다
    const sat = mx ? (mx - mn) / mx : 0, lum = (r + g + b) / 765;
    n++;
    if (sat < 0.22 && lum > 0.6) pale++;                        // 무색에 가까운 옅은 유리
    else if (r >= g && g >= b && lum > 0.55) amber++;           // 크림~호박색(설화석고·옅은 호박 유리)
  }
  if (!n) return 'stained';
  if (pale + amber < n) return 'stained';                       // 파랑·빨강·초록 등 다른 색상이 섞여 있다 = 색유리
  return amber > pale ? 'warm' : 'pale';
}
const KIND_KO = { stained: '절차적 색유리', warm: '절차적 옅은 호박색(설화석고풍)', pale: '절차적 무색·옅은 유리' };

/** 성당 빌더를 돌려 원자료(키트 창·장미창·손 지은 유리 묶음·사진 자리)를 모은다. */
export function measureRaw(id, opts = {}) {
  const sb = makeSandbox();
  if (opts.search) sb.location.search = opts.search;
  const run = (f) => { if (f === 'glass_gen.js' && !fs.existsSync(path.join(assets, f))) return; vm.runInContext(fs.readFileSync(path.join(assets, f), 'utf8'), sb, { filename: f }); };
  ['three.min.js', 'three_extras.js', 'palette.js', 'layouts.js', 'shrine_places.js', 'shrine.js', 'scene_logic.js', 'stations.js', 'geo.js', 'photos.js', 'kit_tex.js', 'glass_gen.js', 'kit.js', 'glass_placements.js', 'cross_data.js', 'way_cross.js', 'liturgy.js', 'ch_' + id + '.js'].forEach(run);
  const b = sb.ChurchBuilders[id];
  if (!b) throw new Error('빌더 없음: ' + id);
  const ctx = sb.ChurchKit.createContext({ layout: b.layout, quality: opts.quality || 'low' });
  const tris = [];   // 손으로 지은 유리 삼각형 {v:[9], col, hint}
  const glassAdd = ctx.glass.addTris.bind(ctx.glass);
  ctx.glass.addTris = function (verts, color, hint, o) {
    // 색: 숫자(hex) 또는 THREE.Color(빌더가 G.toColor 로 넘김) → hex. 정점별 색 배열은 첫 색만(옅음/색유리 판정용)
    const hx = (c) => (c == null ? null : (typeof c === 'number' ? c : (c.getHex ? c.getHex() : null)));
    const col = Array.isArray(color) ? hx(color[0]) : hx(color);
    for (let i = 0; i + 8 < verts.length; i += 9) tris.push({ v: Array.prototype.slice.call(verts, i, i + 9), col, hint: hint ? Array.from(hint) : null });
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
function clusterTris(tris, o = {}) {
  const gap = o.gap === undefined ? 0.3 : o.gap, planeTol = o.planeTol === undefined ? 0.12 : o.planeTol, dotMin = o.dot === undefined ? 0.99 : o.dot;
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
  // union-find: 법선이 거의 같고(기본 각 8° 이내) 평면 거리 planeTol(기본 0.12m) 이내, 상자가 gap 이내로 맞닿은 것
  // (성 베드로의 궁륭 채광창처럼 곡면을 따라 줄줄이 놓인 유리는 어댑터가 planeTol 을 넓혀 한 창으로 묶는다)
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
        if (a.nx * c.nx + a.ny * c.ny + a.nz * c.nz < dotMin) continue;
        if (Math.abs(a.d - c.d) > planeTol) continue;
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
      colors: wn.colors || null, painted: !!wn.painted, glass: wn.glass ? [wn.glass] : null, photo: wn.photo ? wn.photo.win : null, photoSlot: wn.photo ? wn.photo.slot + '[' + wn.photo.index + ']' : null, beam: wn.beam !== false });
  }
  for (const rs of S.roses) {
    const F = rs.F;
    out.push({ src: 'kit.rose', shape: 'circle', pattern: 'rose' + (rs.petals || 12), x: rs.x, y: rs.y, z: rs.z, nx: F.nx, nz: F.nz, w: rs.r * 2, h: rs.r * 2, sill: rs.y - rs.r, spring: rs.y, apex: rs.y + rs.r, rise: rs.r,
      colors: rs.colors || null, glass: rs.glass ? [rs.glass] : null, photo: rs.photo ? rs.photo.win : null, photoSlot: rs.photo ? rs.photo.slot + '[' + rs.photo.index + ']' : null, beam: !!rs.beam });
  }
  const ad = ADAPTERS[id] || {};
  const custom = clusterTris(raw.tris, ad.cluster || {});
  const uses = (S.glassUse || []).filter((u) => u.at);
  for (const c of custom) {
    c.shape = shapeOfCustom(c);
    // 빌더가 손으로 지은 창에 건 절차 생성 무늬(ctx.stained·stainedDisc, glass_gen.js): 무늬 판 가운데가 이 묶음 안에 있으면 그 양식
    const gs = uses.filter((u) => Math.abs(u.at[1] - c.y) <= c.h / 2 + 0.3 && Math.hypot(u.at[0] - c.x, u.at[2] - c.z) <= c.w / 2 + 0.3 && Math.abs((u.at[0] - c.x) * c.nx + (u.at[2] - c.z) * c.nz) < 0.25);
    if (gs.length) c.glass = [...new Set(gs.map((u) => u.style))];
    // 키트 장미창 뒤에 빌더가 덧댄 납틀·살(같은 자리의 손 지은 유리)은 같은 창이므로 따로 세지 않는다
    if (out.some((k) => k.src !== 'custom' && Math.hypot(k.x - c.x, k.y - c.y, k.z - c.z) < 0.35 && Math.abs(k.w - c.w) < 0.4)) continue;
    out.push(c);
  }
  if (ad.mergeBy) {                      // 어댑터가 '같은 창'이라고 한 조각들을 하나로(상자 합집합)
    const groups = new Map(), keep = [];
    for (const o of out) { const k = ad.mergeBy(o); if (k === null || k === undefined) keep.push(o); else { if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); } }
    for (const g of groups.values()) {
      const m = { ...g[0] }, n = g.length;
      m.sill = Math.min(...g.map((o) => o.sill)); m.apex = Math.max(...g.map((o) => o.apex)); m.w = Math.max(...g.map((o) => o.w)); m.h = m.apex - m.sill;
      m.x = g.reduce((a, o) => a + o.x, 0) / n; m.z = g.reduce((a, o) => a + o.z, 0) / n; m.y = (m.sill + m.apex) / 2;
      let nx = g.reduce((a, o) => a + o.nx, 0), nz = g.reduce((a, o) => a + o.nz, 0); const l = Math.hypot(nx, nz) || 1; m.nx = nx / l; m.nz = nz / l;
      m.spring = Math.min(...g.map((o) => o.spring)); m.rise = m.apex - m.spring; m.tris = g.reduce((a, o) => a + (o.tris || 0), 0); m.parts = n;
      m.area = g.reduce((a, o) => a + (o.area || 0), 0); m.glass = [...new Set(g.flatMap((o) => o.glass || []))]; if (!m.glass.length) m.glass = null; m.fill = m.area / Math.max(1e-6, m.w * m.h); m.shape = n > 1 ? 'round' : m.shape;
      const cs = []; g.forEach((o) => (o.colors || []).forEach((c) => { if (!cs.includes(c)) cs.push(c); })); m.colors = cs;
      keep.push(m);
    }
    out.length = 0; keep.forEach((o) => out.push(o));
  }
  // 사진 자리(ctx.glassSlot): 가까운 개구부에 붙이고, 없으면 따로 적는다
  const slots = (S.glassSlots || []).map((s) => ({ win: s.win, slot: s.slot, index: s.index, shape: s.shape, x: r3(s.x), y: r3(s.y), z: r3(s.z), nx: r3(s.nx), nz: r3(s.nz), w: r3(s.w), h: r3(s.h) }));
  for (const s of slots) {
    let best = null, bd = 1.0;
    for (const o of out) { const d = Math.hypot(o.x - s.x, o.y - s.y, o.z - s.z); if (d < bd) { bd = d; best = o; } }
    if (best && !best.photo) { best.photo = s.win; best.photoSlot = s.slot + '[' + (s.index || 0) + ']'; }
    else if (!best) out.push({ src: 'glassSlot', shape: s.shape || 'rect', x: s.x, y: s.y, z: s.z, nx: s.nx, nz: s.nz, w: s.w, h: s.h, sill: s.y - s.h / 2, spring: s.y, apex: s.y + s.h / 2, rise: 0, colors: null, photo: s.win, photoSlot: s.slot + '[' + (s.index || 0) + ']' });
  }
  const res = [];
  for (const o of out) {
    const pk = paletteKind(o.colors);
    res.push({
      key: null, zone: 'other', src: o.src, shape: o.shape, top: o.top || null, pattern: o.pattern || null,
      x: r3(o.x), y: r3(o.y), z: r3(o.z), nx: r3(o.nx), nz: r3(o.nz), yawDeg: o.horiz ? null : yawOf(o.nx, o.nz),
      w: r3(o.w), h: r3(o.h), sill: r3(o.sill), spring: r3(o.spring), apex: r3(o.apex), rise: r3(o.rise), aspect: r3(o.w / o.h),
      realW: r2(o.w / scale), realH: r2(o.h / scale), realSill: r2(o.sill / scale),
      palette: pk, colors: (o.colors || []).slice(0, 6).map(hex), photo: o.photo || null, photoSlot: o.photoSlot || null, glass: o.glass || null,
      glassNow: o.photo ? '사진 슬롯 ' + o.photo + ' (' + o.photoSlot + ')' : (o.glass ? '절차 생성 무늬 ' + o.glass.join('+') : KIND_KO[pk] + (o.pattern ? ' · ' + o.pattern : '')),
      tris: o.tris || null, fill: o.fill ? r2(o.fill) : null
    });
  }
  // 어댑터 규칙으로 구역·key 를 붙인다. 규칙 = {zone, test(e), side?(e) → 접두 꼬리표, key(e, i, n) | prefix, sort?(a, b), kind?, note?}
  // 같은 규칙·같은 side 안에서는 기본으로 입구(+z) → 제대(-z) 순서로 번호(1부터)를 매긴다.
  for (const rule of ad.rules || []) {
    const hit = res.filter((e) => !e.key && rule.test(e));
    const groups = {};
    for (const e of hit) { const sd = rule.side ? rule.side(e) : ''; (groups[sd] = groups[sd] || []).push(e); }
    for (const [sd, g] of Object.entries(groups)) {
      g.sort(rule.sort || ((a, b2) => b2.z - a.z || a.x - b2.x));
      g.forEach((e, i) => {
        e.zone = rule.zone; e.key = rule.key ? rule.key(e, i, g.length, sd) : rule.prefix + sd + (g.length > 1 || rule.always ? '_' + (rule.tag || 'b') + (i + 1) : '');
        if (rule.kind) e.kind = rule.kind; if (rule.note) e.note = typeof rule.note === 'function' ? rule.note(e, i) : rule.note;
        if (rule.glassNow) e.glassNow = rule.glassNow;
      });
    }
  }
  for (const e of res) if (!e.kind) e.kind = 'window';
  // key 중복·미지정 정리: 미지정은 other_<n>, 중복은 _2, _3 …
  const seen = {}; let oi = 0;
  const order = (ad.rules || []).map((r) => r.zone);
  res.sort((a, b2) => (order.indexOf(a.zone) < 0 ? 99 : order.indexOf(a.zone)) - (order.indexOf(b2.zone) < 0 ? 99 : order.indexOf(b2.zone)) || String(a.key).localeCompare(String(b2.key), 'en', { numeric: true }) || b2.z - a.z || a.x - b2.x || a.y - b2.y);
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
const Lr = (e) => (e.x > 0.5 ? 'R' : (e.x < -0.5 ? 'L' : 'C'));            // 제대를 볼 때 왼쪽(-x) / 오른쪽(+x)
const NS = (plus) => (e) => (e.x > 0.5 ? plus : (e.x < -0.5 ? (plus === 'S' ? 'N' : 'S') : 'C'));
const compass8 = (deg) => ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'][((Math.round(deg / 45) % 8) + 8) % 8];

// ---- 피렌체 두오모 (ch_florence.js): 제대 = 동(-z), 입구 = 서(+z), +x = 남, -x = 북. 팔각(돔) 중심 (0, -12.93). 45%.
ADAPTERS.florence = {
  axes: { altar: '-z (동)', entrance: '+z (서)', plusX: '남', minusX: '북',
    summary: '입구 +z(서) → 제대 -z(동). 제대를 볼 때 오른쪽 +x = 남, 왼쪽 -x = 북. 근거: ch_florence.js 머리말 "제대(동쪽) -z", 651행 "북쪽(−x) 트리부나 바닥의 자오선".' },
  consts: { domeCenter: [0, -12.93], naveBayZ: [29.2, 20.3, 11.4, 2.5] },
  rules: [
    { zone: 'facade', test: (e) => e.z > 33 && e.shape === 'circle', key: (e) => 'facade_' + (Math.abs(e.x) < 0.5 ? 'center' : (e.x > 0 ? 'S' : 'N')) },
    { zone: 'aisle', test: (e) => near(Math.abs(e.x), 9.3, 0.6) && e.src === 'kit.window', side: NS('S'), prefix: 'aisle', always: true },
    { zone: 'nave_oculus', test: (e) => near(Math.abs(e.x), 4.5, 0.6) && e.shape === 'circle' && e.y < 18, side: NS('S'), prefix: 'naveOc', always: true },
    { zone: 'drum', test: (e) => e.y > 20 && e.shape === 'circle', key: (e) => 'drum_' + compass8(Math.atan2(-e.x, -(e.z + 12.93)) * 180 / Math.PI) },
    // 트리부나 경당 창: 트리부나 = E(동, 성 자노비) / S(남) / N(북). 번호는 팔각 쪽에서 그 트리부나 안을 볼 때 왼쪽 → 오른쪽 1…5
    { zone: 'tribune_chapel', test: (e) => e.src === 'kit.window' && e.w < 0.9 && e.sill < 5,
      side: (e) => (e.x > 12 ? 'S' : (e.x < -12 ? 'N' : 'E')),
      sort: (a, b2) => (a.x > 12 ? a.z - b2.z : (a.x < -12 ? b2.z - a.z : a.x - b2.x)),
      key: (e, i, n, sd) => 'trib' + sd + '_c' + (i + 1) },
    // 트리부나 윗창(경당 아치 위, 예언자 창; I-3 에서 뚫음): 번호는 바로 아래 경당과 같다(u1 은 c1 위)
    { zone: 'tribune_upper', test: (e) => e.src === 'kit.window' && e.w < 0.9 && e.sill > 7,
      side: (e) => (e.x > 12 ? 'S' : (e.x < -12 ? 'N' : 'E')),
      sort: (a, b2) => (a.x > 12 ? a.z - b2.z : (a.x < -12 ? b2.z - a.z : a.x - b2.x)),
      key: (e, i, n, sd) => 'trib' + sd + '_u' + (i + 1) }
  ]
};

// ---- 명동대성당 (ch_myeongdong.js): 입구 = 북북서(+z), 제대 = 남남동(-z). +x = 서남서(제대를 볼 때 오른쪽), -x = 동북동(왼쪽). 100%.
ADAPTERS.myeongdong = {
  axes: { altar: '-z (남남동)', entrance: '+z (북북서)', plusX: '서남서(오른쪽 R)', minusX: '동북동(왼쪽 L)',
    summary: '입구 +z(북북서) → 제대 -z(남남동). 제대를 볼 때 오른쪽 R = +x = 서남서, 왼쪽 L = -x = 동북동. 근거: interiors/myeongdong.md §2(서울신문: 입구 북북서) · 210행 "+x(서남서)".' },
  consts: { naveBayZ: [21.5, 16.5, 11.5, 6.5, 1.5, -3.5], chancelBayZ: [-17.5, -22.5], transeptZ: [-5.3, -15.7] },
  rules: [
    // 정면(I-1 구조 수정 뒤): 종탑 2층의 2연 첨두 큰 창 + 가운데 문 위 반월창(팀파눔). 장미창·측랑 앞 작은 창은 실제에 없어 지웠다.
    { zone: 'facade', test: (e) => e.z > 31 && e.sill > 8, key: () => 'facade_tower' },
    { zone: 'facade', test: (e) => e.z > 31 && e.sill < 5, key: () => 'facade_tympanum' },
    { zone: 'aisle_end', test: (e) => e.shape === 'circle' && near(e.z, -25.3, 0.4) && near(Math.abs(e.x), 6.75, 0.5), key: (e) => 'aisleEnd' + Lr(e) + '_rose' },
    { zone: 'apse', test: (e) => e.z < -27 && e.sill > 5, key: (e) => 'apse_' + (Math.abs(e.x) < 0.5 ? 'C' : (e.x < 0 ? 'L' : 'R') + (Math.abs(e.x) < 3.8 ? '1' : '2')) },
    { zone: 'transept_end', test: (e) => Math.abs(e.x) > 13.5, side: Lr, prefix: 'trEnd' },
    { zone: 'transept_upper', test: (e) => near(Math.abs(e.x), 11.25, 0.5) && e.sill > 9, key: (e) => 'trUp' + Lr(e) + (e.z > -10 ? '_front' : '_back') },
    { zone: 'transept_upper', test: (e) => near(Math.abs(e.x), 6.75, 0.5) && e.sill > 9, key: (e) => 'trIn' + Lr(e) + (e.z > -10 ? '_front' : '_back') },
    { zone: 'aisle', test: (e) => near(Math.abs(e.x), 9.695, 0.5) && e.z > -5, side: Lr, prefix: 'aisle', tag: 'n', always: true },
    { zone: 'aisle_chancel', test: (e) => near(Math.abs(e.x), 9.695, 0.5) && e.z < -5, side: Lr, prefix: 'aisle', tag: 's', always: true },
    { zone: 'clerestory', test: (e) => near(Math.abs(e.x), 4.745, 0.5) && e.z > 25, side: Lr, prefix: 'clere', key: (e) => 'clere' + Lr(e) + '_n0' },
    { zone: 'clerestory', test: (e) => near(Math.abs(e.x), 4.745, 0.5) && e.z > -5, side: Lr, prefix: 'clere', tag: 'n', always: true },
    { zone: 'clerestory_chancel', test: (e) => near(Math.abs(e.x), 4.745, 0.5) && e.z < -5, side: Lr, prefix: 'clere', tag: 's', always: true }
  ]
};

// ---- 성 베드로 (ch_stpeter.js): 입구 = 동(+z), 제대·후진 = 서(-z). +x = 북(제대를 볼 때 오른쪽), -x = 남. 돔 중심 (0, -9). 37%.
ADAPTERS.stpeter = {
  axes: { altar: '-z (서)', entrance: '+z (동)', plusX: '북', minusX: '남',
    summary: '입구 +z(동) → 후진 -z(서). 제대를 볼 때 오른쪽 +x = 북, 왼쪽 -x = 남. 근거: interiors/stpeter.md 28·147행.' },
  consts: { domeCenter: [0, -9] },
  // 궁륭 채광창(barrel() 의 lun)은 곡면을 따라 5줄로 놓여 있어 평면 묶음으로는 5조각이 된다 → 같은 창의 줄을 하나로 합친다. 가운데 문의 바깥빛(사각 + 반원)도 하나로.
  mergeBy: (o) => {
    if (o.src !== 'custom') return null;
    if (o.z > 34.9 && o.sill < 5) return 'door';
    if (o.sill > 12.5 && o.apex < 15.7 && o.h < 1.1) {
      if (Math.abs(o.x) >= 8) return 't' + Math.round(o.x) + (o.z > -9 ? 'f' : 'b');
      return (o.z > 0 ? 'n' : 'a') + (o.x > 0 ? '+' : '-') + Math.round(o.z);
    }
    return null;
  },
  rules: [
    { zone: 'gloria', test: (e) => !!e.photo || (e.z < -33 && e.shape === 'ellipse'), key: () => 'gloria' },
    { zone: 'door_light', kind: 'not_window', test: (e) => e.z > 34 && e.sill < 1, key: () => 'entrance_door_light', note: '가운데 문의 바깥빛 면(창 아님)' },
    { zone: 'facade', test: (e) => e.z > 34 && e.sill > 5, key: () => 'facade_upper' },
    { zone: 'aisle_skylight', test: (e) => e.shape === 'horizontal', side: NS('N'), prefix: 'aisleSky', always: true, glassNow: '절차적 밝은 면(작은 돔 천창)' },
    { zone: 'chapel_light', kind: 'not_window', test: (e) => Math.abs(e.x) > 13 && e.sill < 3 && e.z > 0, side: NS('N'), prefix: 'chapelLight', always: true, note: '측랑 경당 벽 안 빛 면("창 대신", ch_stpeter.js 517행)' },
    { zone: 'lantern', test: (e) => e.sill > 35, key: (e) => 'lantern_' + compass8(Math.atan2(e.x, -(e.z + 9)) * 180 / Math.PI + 180) },
    { zone: 'drum', test: (e) => e.sill > 20 && e.sill < 35, sort: (a, b2) => Math.atan2(a.x, a.z + 9) - Math.atan2(b2.x, b2.z + 9), key: (e, i) => 'drum_' + String(i + 1).padStart(2, '0') },
    { zone: 'nave_lunette', test: (e) => e.sill > 11 && e.sill < 20 && e.z > 0 && Math.abs(e.x) < 8, side: NS('N'), prefix: 'naveLun', always: true },
    { zone: 'transept_lunette', test: (e) => e.sill > 11 && e.sill < 20 && Math.abs(e.x) >= 8, side: NS('N'), prefix: 'trLun', always: true, sort: (a, b2) => b2.z - a.z || Math.abs(a.x) - Math.abs(b2.x) },
    { zone: 'apse_lunette', test: (e) => e.sill > 11 && e.sill < 20 && e.z < -12 && Math.abs(e.x) < 8, side: NS('N'), prefix: 'apseLun', always: true }
  ]
};

// ---- 산타 마리아 마조레 (ch_maggiore.js): 정면 = 남동(+z), 후진 = 북서(-z). +x = 북동(제대를 볼 때 오른쪽, 시스티나 경당 쪽), -x = 남서(왼쪽, 파올리나 경당 쪽). 80%.
ADAPTERS.maggiore = {
  axes: { altar: '-z (북서)', entrance: '+z (남동)', plusX: '북동(오른쪽 R)', minusX: '남서(왼쪽 L)',
    summary: '입구 +z(남동) → 후진 -z(북서). 제대를 볼 때 오른쪽 R = +x = 북동, 왼쪽 L = -x = 남서. 근거: interiors/maggiore.md 180행.' },
  rules: [
    { zone: 'facade', test: (e) => e.z > 27.5 && e.sill > 8, key: (e) => 'facade_' + (Math.abs(e.x) < 0.5 ? 'center' : Lr(e)) },
    { zone: 'facade_aisle', test: (e) => e.z > 27.5 && e.sill < 8, side: Lr, prefix: 'facadeAisle' },
    { zone: 'clerestory', test: (e) => near(Math.abs(e.x), 6.75, 0.5), side: Lr, prefix: 'clere', always: true },
    { zone: 'aisle', test: (e) => near(Math.abs(e.x), 12.48, 0.5), side: Lr, prefix: 'aisle', always: true },
    { zone: 'apse', test: (e) => e.z < -29, sort: (a, b2) => a.x - b2.x, prefix: 'apse', always: true, tag: 'w' },
    { zone: 'chapel', test: (e) => Math.abs(e.x) > 13, side: Lr, prefix: 'chapel', always: true, note: '대경당(시스티나 R·파올리나 L)의 루네트 창·드럼 창·정점 채광 — 손 지은 무색 유리' }
  ]
};

// ---- 라테라노 (ch_lateran.js): 입구 = 동(+z), 후진 = 서(-z). +x = 북(오른쪽, 오르간), -x = 남(왼쪽, 성체 제대). 53%.
ADAPTERS.lateran = {
  axes: { altar: '-z (서)', entrance: '+z (동)', plusX: '북', minusX: '남',
    summary: '입구 +z(동) → 후진 -z(서). 제대를 볼 때 오른쪽 +x = 북(오르간 쪽 익랑), 왼쪽 -x = 남(성체 제대 쪽 익랑). 근거: interiors/lateran.md 28·132행, ch_lateran.js 356행.' },
  rules: [
    { zone: 'facade', test: (e) => e.z > 34, key: (e) => 'facade_' + (Math.abs(e.x) < 0.5 ? 'center' : NS('N')(e)) },
    { zone: 'clerestory', test: (e) => near(Math.abs(e.x), 5.57, 0.3) && e.z > -3, side: NS('N'), prefix: 'clere', always: true },
    { zone: 'transept', test: (e) => near(e.z, -5.9, 0.4), key: (e) => 'trFront' + NS('N')(e) + (Math.abs(e.x) > 11 ? '_outer' : '_inner') },
    { zone: 'transept', test: (e) => near(e.z, -14.9, 0.4), key: (e) => 'trBack' + NS('N')(e) + (Math.abs(e.x) > 11 ? '_outer' : '_inner') },
    { zone: 'transept', test: (e) => Math.abs(e.x) > 16, side: NS('N'), prefix: 'trEnd', always: true },   // 익랑 끝벽 x ±16.9 (H-1 B3: XT 18.3 → 16.4)
    { zone: 'choir', test: (e) => near(Math.abs(e.x), 5.27, 0.3) && e.z < -17, side: NS('N'), prefix: 'choir', always: true },
    { zone: 'apse', test: (e) => e.z < -30, sort: (a, b2) => a.x - b2.x, prefix: 'apse', always: true, tag: 'w' }
  ]
};

// ---- 성 밖 성 바오로 (ch_stpaul.js): 입구 = 서(+z), 후진 = 동(-z). +x = 남(제대를 볼 때 오른쪽), -x = 북. 53%.
ADAPTERS.stpaul = {
  axes: { altar: '-z (동)', entrance: '+z (서)', plusX: '남', minusX: '북',
    summary: '입구 +z(서, 테베레 강 쪽) → 후진 -z(동). 제대를 볼 때 오른쪽 +x = 남, 왼쪽 -x = 북. 근거: interiors/stpaul.md 184행.' },
  rules: [
    { zone: 'facade', test: (e) => e.z > 33, key: (e) => 'facade_' + (Math.abs(e.x) < 0.5 ? 'center' : NS('S')(e)) },
    { zone: 'aisle', test: (e) => near(Math.abs(e.x), 17.5, 0.4) && e.z > -15, side: NS('S'), prefix: 'aisle', always: true },
    { zone: 'clerestory', test: (e) => near(Math.abs(e.x), 6.6, 0.4), side: NS('S'), prefix: 'clere', always: true },
    { zone: 'transept_end', test: (e) => Math.abs(e.x) > 18.5, side: NS('S'), prefix: 'trEnd', always: true },
    { zone: 'transept_back', test: (e) => e.z < -28, sort: (a, b2) => a.x - b2.x, prefix: 'trBack', always: true, tag: 'w' }
  ]
};

// ---- 우리 본당 (ch_basic.js): 가상의 본당(실제 건물 없음). 입구 +z, 제대 -z. 방위는 정해져 있지 않다 → 좌(L, -x)/우(R, +x)만 쓴다. 100%.
// 당고개(지하 성당): 옆벽 한지 유리화 빛 상자 28판 = 줄(란셋)마다 아래 직사각 판 + 위 뾰족 아치 판. 빌더가 ctx.window(painted)로 자리만 등록한다.
ADAPTERS.danggogae = {
  axes: { altar: '-z', entrance: '+z', plusX: '오른쪽 R', minusX: '왼쪽 L', summary: '입구 +z → 제대 -z(지하 성당, 바깥 창 없음 — 뒤에서 불 밝힌 한지 빛 상자).' },
  rules: [
    { zone: 'hanji_lower', test: (e) => e.shape === 'rect', side: Lr, prefix: 'hanjiLow', always: true },
    { zone: 'hanji_upper', test: (e) => e.shape === 'pointed', side: Lr, prefix: 'hanjiTop', always: true }
  ]
};
// 여의도동(2026-11-22 개정): 피어와 드럼 사이의 키 큰 현대 색유리 2 + 로비(성당 문 밖) 색유리 벽 3폭(2024 최영심 작품 자리 — 추상) + 로비 유리 정면 3폭(맑은 유리).
// 3차: 1층 로비 색유리 2폭 + 1층 유리 정면 3폭(바닥 −4.2, 창 아래 끝 y < 0).
// 옆벽 슬릿 창·경사 천장 천창은 창 개구부(kit.window)가 아니라 빌더의 빛나는 판이라 목록에 없다(yeouido.md §4.1).
ADAPTERS.yeouido = {
  axes: { altar: '-z', entrance: '+z', plusX: '오른쪽 R', minusX: '왼쪽 L', summary: '입구 +z → 제대 -z. 로비는 뒷벽 밖 z 21.5…35.0(2026-11-23 계단 홀을 넓혀 길어짐).' },
  rules: [
    { zone: 'front', test: (e) => e.z < -9, side: Lr, prefix: 'front', always: false, key: (e) => 'front' + (e.x < 0 ? 'L' : 'R') },
    // 1층 로비(2026-11-22 3차, 바닥 −4.2): 안쪽 끝 벽 색유리 2폭(최영심 2024 1층 작품 자리 — 추상) + 거리 쪽 유리 정면 3폭(맑은 유리)
    { zone: 'lobby1f_glass', test: (e) => e.y < 0 && e.z > 34, key: (e) => 'lobby1fGlass' + (e.x < -7 ? '1' : '2') },
    { zone: 'lobby1f_front', test: (e) => e.y < 0 && e.z > 21 && e.x < -10.5, key: (e) => 'lobby1fFront' + (e.z < 26 ? '1' : (e.z < 30.5 ? '2' : '3')) },
    { zone: 'lobby_glass', test: (e) => e.z > 34, key: (e) => 'lobbyGlass' + (e.x < -8 ? '1' : (e.x < -5 ? '2' : '3')) },
    { zone: 'lobby_front', test: (e) => e.z > 21 && e.x < -10.5, key: (e) => 'lobbyFront' + (e.z < 26 ? '1' : (e.z < 30.5 ? '2' : '3')) }
  ]
};
// ---- 아시시 상부 성당 (ch_assisi.js): 입구 = 동(+z), 제대·후진 = 서(-z), +x = 북(제대를 볼 때 오른쪽), -x = 남. 60%. 하부 성당·묘소에는 창이 없다(어스름 — assisi.md §3-4)
ADAPTERS.assisi = {
  axes: { altar: '-z (서)', entrance: '+z (동)', plusX: '북(오른쪽)', minusX: '남(왼쪽)', summary: '입구 +z(동, 위 광장 파사드) → 제대 -z(서). 상부 성당만 창이 있다(바닥 y 10.2).' },
  rules: [
    { zone: 'rose', test: (e) => e.shape === 'circle', key: () => 'rose' },
    { zone: 'nave', test: (e) => Math.abs(Math.abs(e.x) - 3.9) < 0.4 && e.z > 0, side: NS('N'), prefix: 'nave', always: true },
    { zone: 'transept', test: (e) => Math.abs(Math.abs(e.x) - 9.0) < 0.4, key: (e) => 'trans' + (e.x > 0 ? 'N' : 'S') },
    { zone: 'apse', test: (e) => e.z < -8, sort: (a, b2) => b2.x - a.x, key: (e, i) => 'apse_' + (i + 1) }
  ]
};
ADAPTERS.basic = {
  axes: { altar: '-z', entrance: '+z', plusX: '오른쪽 R(방위 없음)', minusX: '왼쪽 L(방위 없음)',
    summary: '입구 +z → 제대 -z. 가상의 본당이라 방위가 없다(제대를 볼 때 오른쪽 R = +x, 왼쪽 L = -x).' },
  rules: [
    { zone: 'entrance', test: (e) => e.z > 19 && e.shape === 'circle', key: () => 'entrance_rose' },
    { zone: 'entrance', test: (e) => e.z > 19 && e.shape !== 'circle', key: () => 'entrance_transom' },
    { zone: 'sanctuary', test: (e) => e.z < -19, key: () => 'apse_rose' },
    { zone: 'side', test: (e) => near(Math.abs(e.x), 12, 0.5), side: Lr, prefix: 'side', always: true }
  ]
};


function printTable(rows, cols) {
  const head = '| ' + cols.map((c) => c[0]).join(' | ') + ' |\n|' + cols.map(() => '---').join('|') + '|\n';
  return head + rows.map((r) => '| ' + cols.map((c) => { const v = c[1](r); return v === null || v === undefined ? '' : String(v); }).join(' | ') + ' |').join('\n') + '\n';
}
const SHAPE_KO = { pointed: '첨두', round: '반원 아치', rect: '사각', circle: '원', ellipse: '타원', horizontal: '수평(천창)' };
export const OPEN_COLS = [
  ['key', (o) => '`' + o.key + '`'], ['구역', (o) => o.zone], ['x', (o) => o.x], ['y(중심)', (o) => o.y], ['z', (o) => o.z], ['yaw°', (o) => o.yawDeg],
  ['폭×높이', (o) => o.w + '×' + o.h], ['창턱', (o) => o.sill], ['형태', (o) => SHAPE_KO[o.shape] || o.shape], ['가로/세로', (o) => o.aspect], ['실제 환산(m)', (o) => o.realW + '×' + o.realH], ['지금 유리', (o) => o.glassNow + (o.note ? ' · ' + o.note : '')]
];
/** 같은 구역·같은 치수·같은 쪽(key 머리)인 개구부를 한 줄로 접는다(문서 표가 길어지지 않게). 전체는 --md-full / --json. */
export function foldRows(openings) {
  const out = [], idx = {};
  for (const o of openings) {
    const grp = o.key.replace(/(_[a-z]?\d+|_[A-Z]{1,2}|_(front|back|inner|outer|center))$/, ''), base = o.glassNow.replace(/\[\d+\]/, '[i]').replace(/alabaster_stpaul_\d/, 'alabaster_stpaul_1·2');
    const k = [o.zone, grp, o.w, o.h, o.sill, o.shape, base].join('|');
    if (idx[k] === undefined) { idx[k] = out.length; out.push({ zone: o.zone, base, items: [] }); }
    out[idx[k]].items.push(o);
  }
  return out;
}
const uniq = (a) => [...new Set(a)];
export const FOLD_COLS = [
  ['key', (g) => (g.items.length === 1 ? '`' + g.items[0].key + '`' : '`' + g.items[0].key + '` … `' + g.items[g.items.length - 1].key + '`')], ['수', (g) => g.items.length], ['구역', (g) => g.zone],
  ['x', (g) => uniq(g.items.map((o) => o.x)).join(', ')], ['y(중심)', (g) => uniq(g.items.map((o) => o.y)).join(', ')], ['z', (g) => uniq(g.items.map((o) => o.z)).join(', ')], ['yaw°', (g) => uniq(g.items.map((o) => o.yawDeg)).join(', ')],
  ['폭×높이', (g) => g.items[0].w + '×' + g.items[0].h], ['창턱', (g) => g.items[0].sill], ['형태', (g) => SHAPE_KO[g.items[0].shape] || g.items[0].shape], ['가로/세로', (g) => g.items[0].aspect], ['실제 환산(m)', (g) => g.items[0].realW + '×' + g.items[0].realH],
  ['지금 유리', (g) => g.base + (g.items[0].note ? ' · ' + g.items[0].note : '')]
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), ids = Object.keys(ADAPTERS);
  if (a.includes('--ids')) { console.log(ids.join(' ')); process.exit(0); }
  if (a.includes('--check')) {
    // 계획 데이터(data/glass_windows/<id>.json)가 지금 빌더와 어긋났는지 본다: 개구부 수·key·좌표(±2cm)·실제 창이 가리키는 key
    const dir = path.resolve(here, '../../data/glass_windows'); let bad = 0;
    for (const cid of ids) {
      const f = path.join(dir, cid + '.json');
      if (!fs.existsSync(f)) { console.log(cid.padEnd(11) + ' (데이터 없음)'); continue; }
      const d = JSON.parse(fs.readFileSync(f, 'utf8')), m = measure(cid), by = Object.fromEntries(m.openings.map((o) => [o.key, o])), errs = [];
      if (d.model.openings.length !== m.openings.length) errs.push(`개구부 수 ${d.model.openings.length} → ${m.openings.length}`);
      for (const o of d.model.openings) { const n = by[o.key]; if (!n) errs.push('사라진 key ' + o.key); else if (Math.abs(n.x - o.x) > 0.02 || Math.abs(n.y - o.y) > 0.02 || Math.abs(n.z - o.z) > 0.02 || Math.abs(n.w - o.w) > 0.02 || Math.abs(n.h - o.h) > 0.02) errs.push('옮겨진/크기 바뀐 ' + o.key); }
      for (const w of d.real_windows) for (const k of w.opening_keys || []) if (!by[k]) errs.push(w.id + ' → 없는 key ' + k);
      const fixed = {}; d.real_windows.forEach((w) => { if ((w.opening_keys || []).length === 1 && w.cls === 'a') (fixed[w.opening_keys[0]] = fixed[w.opening_keys[0]] || []).push(w.id); });
      Object.entries(fixed).forEach(([k, v]) => { if (v.length > 1) errs.push('중복 anchor ' + k + ' ← ' + v.join(',')); });
      console.log(cid.padEnd(11) + (errs.length ? ' 불일치 ' + errs.length + '건: ' + errs.slice(0, 6).join(' · ') : ` 일치 (개구부 ${m.openings.length}, 실제 창 행 ${d.real_windows.length})`));
      bad += errs.length;
    }
    process.exit(bad ? 1 : 0);
  }
  const id = a.find((s) => !s.startsWith('--'));
  if (a.includes('--all') || !id) {
    for (const cid of ids) {
      const m = measure(cid), by = {};
      m.openings.forEach((o) => { by[o.zone] = (by[o.zone] || 0) + 1; });
      const ph = m.openings.filter((o) => o.photo).length;
      console.log(`${cid.padEnd(11)} scale ${String(m.layout.scalePercent).padStart(3)}%  개구부 ${String(m.openings.length).padStart(3)} (사진 슬롯 ${ph}, 절차적 ${m.openings.length - ph})  직접 등록 빛줄기 ${m.beams}  ${Object.entries(by).map(([k, v]) => k + ' ' + v).join(' · ')}`);
      if (m.axes) console.log('            축: ' + m.axes.summary);
    }
    process.exit(0);
  }
  const m = measure(id);
  if (a.includes('--json')) console.log(JSON.stringify(m, null, 1));
  else if (a.includes('--md-full')) console.log(printTable(m.openings, OPEN_COLS));
  else if (a.includes('--md')) console.log(printTable(foldRows(m.openings), FOLD_COLS));
  else {
    const by = {};
    m.openings.forEach((o) => { (by[o.zone] = by[o.zone] || []).push(o); });
    console.log(`${id} (scalePercent ${m.layout.scalePercent}): 개구부 ${m.openings.length}개, 사진 창 자리 ${m.glassSlots.length}, 직접 등록 빛줄기 ${m.beams}, 손 지은 유리 삼각형 ${m.customTris}, 유리 배치 물체 ${m.glassObjects}`);
    if (m.axes) console.log('축: ' + m.axes.summary);
    for (const z of Object.keys(by)) {
      console.log(`\n[${z}] ${by[z].length}개`);
      by[z].forEach((o) => console.log(`  ${o.key.padEnd(20)} ${o.src.padEnd(10)} x ${String(o.x).padStart(8)} y ${String(o.y).padStart(7)} z ${String(o.z).padStart(8)} yaw ${String(o.yawDeg).padStart(7)}  ${o.w}x${o.h} ${o.shape} (창턱 ${o.sill})  ${o.glassNow}${o.note ? ' · ' + o.note : ''}`));
    }
  }
}
