// 시험용: three.js 없이(가짜 canvas) 모든 성당 빌더를 Node(vm)에서 돌려 충돌체·바닥 구역을 모은다.
// 경로 탐색·스테이션 시험이 실제 월드와 같은 충돌체로 동작하는지 확인하는 데 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = process.env.CHURCH_ROOT || path.resolve(here, '../../assets/church');   // CHURCH_ROOT: 고치기 전 사본과 비교할 때

// 빛 번짐 굽기(gi_bake.mjs)용: 캔버스마다 fillRect 로 칠한 색의 면적 가중 평균(선형)을 적어 둔다(el.__fill). 절차 질감(양탄자·회반죽·벽돌 …)의 대표 색.
function hexLin(s) {
  let m = /^#([0-9a-f]{6})$/i.exec(s), r, g, b, a = 1;
  if (m) { const v = parseInt(m[1], 16); r = v >> 16; g = (v >> 8) & 255; b = v & 255; }
  else if ((m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(s))) { r = +m[1]; g = +m[2]; b = +m[3]; a = m[4] === undefined ? 1 : +m[4]; }
  else return null;
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return [lin(r), lin(g), lin(b), a];
}
function trackCtx(el, noop) {
  const st = { fillStyle: null, globalAlpha: 1 };
  el.__fill = { s: [0, 0, 0], w: 0 };
  return new Proxy(noop, {
    get: (t, k) => {
      if (k === 'canvas') return el;
      if (k === 'fillStyle' || k === 'globalAlpha') return st[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({ addColorStop: noop });
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData' || k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      if (k === 'fillRect') return (x, y, w, h) => {
        const c = typeof st.fillStyle === 'string' ? hexLin(st.fillStyle) : null, W = el.width || 1, Hh = el.height || 1;
        if (!c) return;
        const x0 = Math.max(0, Math.min(W, x)), x1 = Math.max(0, Math.min(W, x + w)), y0 = Math.max(0, Math.min(Hh, y)), y1 = Math.max(0, Math.min(Hh, y + h));
        const area = (x1 - x0) * (y1 - y0) / (W * Hh), k2 = area * c[3] * (st.globalAlpha === undefined ? 1 : st.globalAlpha);
        if (!(k2 > 0)) return;
        const f = el.__fill, a = Math.min(1, k2); f.s = f.s.map((v, i) => v * (1 - a) + c[i] * a); f.w = Math.min(1, f.w + k2);   // 'over' 합성의 평균 근사
      };
      return noop;
    },
    set: (t, k, v) => { if (k === 'fillStyle' || k === 'globalAlpha') st[k] = v; return true; }
  });
}

function makeSandbox(opts = {}) {
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
    createElement: () => {
      const el = { width: 0, height: 0, style: {}, getContext: () => ctx2d, toDataURL: () => sandbox.__dataURL || '', addEventListener: noop };
      if (opts.trackFill) { let c2 = null; el.getContext = () => c2 || (c2 = trackCtx(el, noop)); }
      return el;
    },
    getElementById: () => null, readyState: 'complete', addEventListener: noop, body: { insertAdjacentHTML: noop }
  };
  sandbox.location = { search: '' };
  sandbox.navigator = { userAgent: 'node' };
  sandbox.Image = function () {};
  vm.createContext(sandbox);
  return sandbox;
}

/** 모든 성당을 빌드해 [{id, layout, colliders, zones}] 를 돌려준다(실제 world.js 와 같은 방식으로 충돌체를 모은다). */
export function loadChurches(opts = {}) {
  const sb = makeSandbox(opts);
  if (opts.search) sb.location.search = opts.search;   // 예: '?photoglass=0' (G-29 대응표 끄기)
  // opts.photos: 앱처럼 사진 질감 팩(tex_pack*.js)의 '있음'만 흉내 낸다(그림은 읽지 않는다). hasPhoto 로 갈리는 빌더 분기(사진 표면 배치)가
  // 실제 앱과 같아진다 — 미리 굽는 AO(ao_bake.mjs)는 앱과 같은 정점 순서가 필요하다.
  if (opts.photos) {
    const P = {};
    fs.readdirSync(assets).filter((f) => /^tex_pack(_[a-z]+)?\.js$/.test(f)).forEach((f) => {
      const src = fs.readFileSync(path.join(assets, f), 'utf8'), re = /P\["([^"]+)"\]=/g; let m;
      while ((m = re.exec(src))) P[m[1]] = 'data:';
    });
    sb.ChurchTexPack = P;
    sb.__dataURL = 'data:,';   // 빌더가 캔버스로 만들어 팩에 넣는 질감(당고개 dg_*)도 '있음'으로
    sb.document.head = { appendChild: () => {} };   // 실물 스캔 성상(scan3d.js)을 '세운다'로(앱처럼 대체 도형 대신 받침을 짓는다; 스캔 그물은 읽지 않는다)
  }
  const run = (f) => vm.runInContext(fs.readFileSync(path.join(assets, f), 'utf8'), sb, { filename: f });
  // photos(앱과 같은 지오메트리): scan3d.js 도 싣는다 — 실물 스캔 성상을 세우면 대체 도형(절차 십자가 등)을 그리지 않는다.
  ['three.min.js', 'three_extras.js', 'palette.js', 'layouts.js', 'shrine_places.js', 'shrine.js', ...(opts.photos ? ['scan3d.js'] : []), 'scene_logic.js', 'stations.js', 'geo.js', 'photos.js', 'kit_tex.js', 'glass_gen.js', 'kit.js', 'glass_placements.js', 'cross_data.js', 'way_cross.js', 'liturgy.js'].forEach(run);
  // meshStatues(photos 와 함께): 입체 성모상 묶음(statue3d_mary_meshy.js — meshopt 디코더 동봉)을 미리 실어 성모 자리가 실제 성상 LOD 를 세우게 한다
  // (풀기는 비동기 — 시험은 shrine_statue 가 보일 때까지 기다린다).
  if (opts.meshStatues) { sb.atob = (s) => Buffer.from(s, 'base64').toString('binary'); run('statue3d_mary_meshy.js'); }
  fs.readdirSync(assets).filter((f) => /^ch_[a-z]+\.js$/.test(f)).sort().forEach(run);
  const out = [];
  for (const id of Object.keys(sb.ChurchBuilders)) {
    const b = sb.ChurchBuilders[id];
    if (b.viewing) continue;   // 감상실(ch_glass, 'glass_room')은 성당이 아니다: 좌석·스테이션·서버 없음
    if (opts.only && opts.only.indexOf(id) < 0) continue;
    const ctx = sb.ChurchKit.createContext({ layout: b.layout, quality: opts.quality || 'low', aoDefer: !!opts.aoDefer });
    const ret = b.build(ctx);
    if (sb.ChurchShrine) sb.ChurchShrine.build(ctx, b.layout);   // world.js 와 같은 자리에서 성모 기도 자리 충돌체
    const S = ctx._;
    const colliders = S.colliders.slice(), zones = S.zones.slice();
    if (ret && ret.colliders) ret.colliders.forEach((c) => colliders.push(c));
    if (ret && ret.floorZones) ret.floorZones.forEach((z) => zones.push(z));
    // glassSlots: 진본 사진 창 자리(G-29, world.js glassSlots() 와 같은 목록을 시험에서 쓰려고 원자료를 넘긴다)
    // walls: 벽 기록(십자가의 길 판을 거는 자리 유도, way_cross.js derive). _prepare 전이라 창 host 는 아직 없다.
    out.push({ id, ret, layout: b.layout, colliders, zones, windows: S.windows, roses: S.roses, glassSlots: S.glassSlots, walls: S.walls, prepare: () => ctx._prepare(), ctx, builder: b });
  }
  return { churches: out, Kit: sb.ChurchKit, Logic: sb.ChurchLogic, Stations: sb.ChurchStations, Layouts: sb.ChurchLayouts, WayCross: sb.ChurchWayCross, CrossData: sb.ChurchCrossData, Liturgy: sb.ChurchLiturgy, THREE: sb.THREE, sandbox: sb };
}
