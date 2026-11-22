// 성당 씬의 구조 조회(H-2, docs/church/STRUCTURE_AUDIT_OTHERS.md) — 씬 코드를 고치지 않고 빌더를 Node(vm)에서 그대로 돌려,
// 빌더가 키트에 넘긴 구조 호출(바닥·벽·기둥·궁륭·돔·후진·제대·독서대·감실·성상·성수대·계단·단·충돌체·카메라 경계)을 기록해 표로 낸다.
// church_openings.mjs(창 개구부)와 짝이다: 창은 그 스크립트가, 구조·설치물은 이 스크립트가 잰다.
//
// 사용: node tools/church_web/church_structure.mjs florence            # 요약(평면 범위·좌석·설치물·단·궁륭 높이)
//       node tools/church_web/church_structure.mjs florence --calls    # 기록한 키트 호출 전부(종류별)
//       node tools/church_web/church_structure.mjs florence --json     # 전부 JSON
//       node tools/church_web/church_structure.mjs --all               # 등록된 모든 성당 요약 한 줄씩
// 한계: 빌더가 키트 도우미를 거치지 않고 배치(ctx.solid.addQuad 등)에 직접 넣은 조형(피렌체의 벽 패널·명동의 slab·밀라노의 기둥 템플릿)은
//       '호출'로 잡히지 않는다 → 그런 것은 배치 정점의 경계 상자(bbox)와 빌더 소스의 상수로 확인한다. 높이는 solid/표면 배치 정점의 최대 y 로 잰다.
// 단위는 앱 미터(= 실제 m × scalePercent/100). 좌표: 입구 +z, 제대 −z, 위 +y.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');

function makeSandbox() {   // church_openings.mjs 와 같은 가짜 canvas 샌드박스
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
  sandbox.URLSearchParams = URLSearchParams;
  sandbox.addEventListener = noop;
  vm.createContext(sandbox);
  return sandbox;
}
const r2 = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 + 0 : v);
const RECORD = ['floor', 'ceilingFlat', 'wall', 'column', 'pilaster', 'arcade', 'arch', 'vault', 'vaultRib', 'dome', 'apse', 'window', 'rose', 'altar', 'baldachin', 'pulpit', 'tabernacle',
  'crucifix', 'statue', 'statueNiche', 'holyFont', 'candleStand', 'steps', 'floorZone', 'carpet', 'chandelier', 'lantern', 'addLight', 'addCollider', 'setCameraBounds', 'setSky', 'renderSeats', 'glassSlot', 'medallionFrieze'];

function slim(o) {   // 호출 인자에서 숫자·짧은 문자열·짧은 배열만 남긴다(질감·재질 객체는 뺀다)
  if (!o || typeof o !== 'object') return o;
  const out = {};
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (typeof v === 'number') out[k] = r2(v);
    else if (typeof v === 'string' || typeof v === 'boolean') out[k] = v;
    else if (Array.isArray(v) && v.length <= 4 && v.every((q) => typeof q === 'number')) out[k] = v.map(r2);
    else if (v && typeof v === 'object' && !v.isTexture && !v.isMaterial && Object.keys(v).length <= 8 && Object.values(v).every((q) => typeof q === 'number' || typeof q === 'string' || typeof q === 'boolean')) out[k] = slim(v);
  }
  return out;
}

export function measureStructure(id, opts = {}) {
  const sb = makeSandbox();
  const run = (f) => vm.runInContext(fs.readFileSync(path.join(assets, f), 'utf8'), sb, { filename: f });
  ['three.min.js', 'three_extras.js', 'palette.js', 'layouts.js', 'shrine_places.js', 'shrine.js', 'scene_logic.js', 'stations.js', 'geo.js', 'photos.js', 'kit_tex.js', 'glass_gen.js', 'kit.js', 'glass_placements.js', 'cross_data.js', 'way_cross.js', 'liturgy.js', 'ch_' + id + '.js'].forEach(run);
  const b = sb.ChurchBuilders[id];
  if (!b) throw new Error('빌더 없음: ' + id);
  const ctx = sb.ChurchKit.createContext({ layout: b.layout, quality: opts.quality || 'low' });
  const calls = {};
  for (const name of RECORD) {
    if (typeof ctx[name] !== 'function') continue;
    const orig = ctx[name].bind(ctx);
    ctx[name] = function (...a) { (calls[name] = calls[name] || []).push(name === 'candleStand' ? { i: a[0] } : slim(a[0])); return orig(...a); };
  }
  b.build(ctx);
  const S = ctx._ || {};
  // 배치 정점 경계 상자(지은 조형 전체의 범위와 최고 높이)
  const bbox = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 }, perBatch = {};
  const batches = {};
  for (const k of Object.keys(S.batches || {})) batches[k] = S.batches[k];
  for (const k of Object.keys(S.surfBatches || {})) batches['surf_' + k] = S.surfBatches[k].batch;
  for (const name of Object.keys(batches)) {
    const bt = batches[name]; const pos = bt && bt.p;
    if (!pos || !pos.length || /outside|glassRefl/.test(name)) continue;
    const bb = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9, verts: pos.length / 3 };
    for (let i = 0; i + 2 < pos.length; i += 3) {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2];
      if (x < bb.x0) bb.x0 = x; if (x > bb.x1) bb.x1 = x; if (y < bb.y0) bb.y0 = y; if (y > bb.y1) bb.y1 = y; if (z < bb.z0) bb.z0 = z; if (z > bb.z1) bb.z1 = z;
    }
    perBatch[name] = Object.fromEntries(Object.entries(bb).map(([k, v]) => [k, r2(v)]));
    if (!/^outside/.test(name) && Math.abs(bb.x0) < 80 && Math.abs(bb.z1) < 80) for (const k of ['x0', 'y0', 'z0']) { bbox[k] = Math.min(bbox[k], bb[k]); const K = k[0] + '1'; bbox[K] = Math.max(bbox[K], bb[K]); }
  }
  // 좌석
  const L = b.layout, groups = (L.seatGroups || []).map((g) => {
    const xs = [g.origin.x, g.origin.x + g.dx * (g.perRow - 1) + (g.rowDx || 0) * (g.rows - 1)], zs = [g.origin.z, g.origin.z + g.dz * (g.rows - 1)];
    return { g: g.g, rows: g.rows, perRow: g.perRow, seats: g.rows * g.perRow, x: [r2(Math.min(...xs)), r2(Math.max(...xs))], z: [r2(Math.min(...zs)), r2(Math.max(...zs))], yaw: g.yaw || 0 };
  });
  const colliders = S.colliders || [];
  return {
    id, scalePercent: L.scalePercent, bounds: L.bounds, spawn: L.spawn, crossWay: L.crossWay || null,
    seats: { total: groups.reduce((a, g) => a + g.seats, 0), groups },
    candleStands: (L.candles && L.candles.stands || []).map((s) => ({ x: s.x, z: s.z, slots: s.slots, face: s.face })),
    cameraBounds: S.cameraBounds || null, sky: S.sky || null,
    counts: { colliders: colliders.length, floorZones: (S.floorZones || []).length, kitWindows: (S.windows || []).length, kitRoses: (S.roses || []).length },
    bbox: Object.fromEntries(Object.entries(bbox).map(([k, v]) => [k, r2(v)])), perBatch,
    floorZones: (S.floorZones || []).map(slim), calls
  };
}

function fmt(o) { return Object.entries(o).map(([k, v]) => k + '=' + (Array.isArray(v) ? '[' + v.join(',') + ']' : (v && typeof v === 'object' ? '{' + fmt(v) + '}' : v))).join(' '); }

function printSummary(m, withCalls) {
  const s = m.scalePercent / 100, real = (v) => r2(v / s);
  console.log(`# ${m.id}  scale ${m.scalePercent}%  (앱 m; 괄호 = 실제 환산 m)`);
  console.log(`bounds x ${m.bounds.x0}..${m.bounds.x1}  z ${m.bounds.z0}..${m.bounds.z1}   = ${r2(m.bounds.x1 - m.bounds.x0)} × ${r2(m.bounds.z1 - m.bounds.z0)}  (${real(m.bounds.x1 - m.bounds.x0)} × ${real(m.bounds.z1 - m.bounds.z0)})`);
  console.log(`지은 조형 bbox  x ${m.bbox.x0}..${m.bbox.x1}  y ${m.bbox.y0}..${m.bbox.y1}  z ${m.bbox.z0}..${m.bbox.z1}   최고 높이 ${m.bbox.y1} (${real(m.bbox.y1)})`);
  console.log(`spawn (${m.spawn.x}, ${m.spawn.z})  카메라 경계 ${m.cameraBounds ? fmt(m.cameraBounds) : '-'}  바깥 풍경 ${m.sky ? fmt(m.sky) : '-'}`);
  console.log(`좌석 ${m.seats.total}석: ` + m.seats.groups.map((g) => `${g.g} ${g.rows}×${g.perRow} x[${g.x}] z[${g.z}]`).join(' | '));
  console.log(`촛불대: ` + m.candleStands.map((c) => `(${c.x}, ${c.z}) ${c.slots}칸`).join(' | '));
  console.log(`충돌체 ${m.counts.colliders}  높은 바닥 ${m.counts.floorZones}  키트 창 ${m.counts.kitWindows}  키트 장미창 ${m.counts.kitRoses}`);
  const show = withCalls ? Object.keys(m.calls) : ['altar', 'baldachin', 'pulpit', 'tabernacle', 'crucifix', 'statue', 'statueNiche', 'holyFont', 'steps', 'floorZone', 'floor', 'vault', 'dome', 'apse', 'column', 'arcade', 'chandelier', 'lantern', 'addLight'];
  for (const k of show) {
    const arr = m.calls[k]; if (!arr || !arr.length) continue;
    console.log(`\n[${k}] ${arr.length}`);
    const lim = withCalls ? arr.length : Math.min(arr.length, k === 'column' ? 40 : 16);
    for (let i = 0; i < lim; i++) console.log('  ' + fmt(arr[i] || {}));
    if (lim < arr.length) console.log(`  … (${arr.length - lim}개 더, --calls 로 전부)`);
  }
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const args = process.argv.slice(2), flag = (f) => args.includes(f), ids = args.filter((a) => !a.startsWith('--'));
  const all = fs.readdirSync(assets).filter((f) => /^ch_[a-z]+\.js$/.test(f) && f !== 'ch_glass.js').map((f) => f.slice(3, -3));
  if (flag('--all')) {
    for (const id of all) {
      try { const m = measureStructure(id); console.log(`${id}\t${m.scalePercent}%\tbounds ${r2(m.bounds.x1 - m.bounds.x0)}×${r2(m.bounds.z1 - m.bounds.z0)}\t최고 ${m.bbox.y1}\t좌석 ${m.seats.total}\t충돌체 ${m.counts.colliders}\t제대 ${(m.calls.altar || []).length}\t독서대 ${(m.calls.pulpit || []).length}\t감실 ${(m.calls.tabernacle || []).length}\t성수대 ${(m.calls.holyFont || []).length}`); }
      catch (e) { console.log(`${id}\t실패: ${e.message}`); }
    }
  } else if (!ids.length) {
    console.log('사용: node tools/church_web/church_structure.mjs <id> [--calls|--json] | --all\n성당 id: ' + all.join(', '));
  } else {
    for (const id of ids) {
      const m = measureStructure(id);
      if (flag('--json')) console.log(JSON.stringify(m, null, 1)); else printSummary(m, flag('--calls'));
    }
  }
}
