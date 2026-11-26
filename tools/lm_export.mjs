// lm_export.mjs — 공방(ch_house)을 PC 라이트맵 굽기(pc_bake/bake.py, Blender 4.2 Cycles CPU)용으로 내보낸다.
// 빌더를 Node 에서 앱과 같은 설정으로 짓고(harness.mjs), 앱과 **같은 함수**(web/lightmap.js collectTargets)로 대상을 골라
//   pc_bake/scene/house.glb          — 굽기 묶음마다 메시 1(이름 = 대상 id), TEXCOORD_0 = TEXCOORD_1 = 라이트맵 uv2(겹침 없음 + 둘레 pad), COLOR_0 = 반사율
//   pc_bake/scene/house_targets.json — 대상 목록(정점 수·검사합·기준 해상도·텍셀 수·uv2.bin 자리) + 화질별 합계
//   pc_bake/scene/house_lights.json  — 등불(종류·자리·색·낮/밤 세기·원뿔)·창 포털·해/달·하늘(낮·밤) — 단위는 three(물리 조명) 그대로, 변환은 bake.py
//   pc_bake/scene/house_uv2.bin      — 대상마다 정점 uv2(Uint16 ×2, 낱개 삼각형 순 = 앱 지오메트리 순) — 굽기 결과와 함께 앱으로 간다
// 를 쓴다. 결정적(같은 지오메트리 = 같은 바이트). --check: 쓰지 않고 지금 파일과 같은지만(다르면 종료 코드 1 → 다시 내보내라).
// 사용: node tools/lm_export.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { loadRooms, WEB } from './harness.mjs';
import { unwrap, UNWRAP_V } from './lm_unwrap.mjs';
import { refEnv, texAverages } from './gi_bake.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const OUT = path.resolve(here, '../pc_bake/scene');
// 기준(= normal 화질) 텍셀 밀도·여백. fast ×0.5, high ×2(상한 4096), smoke ×0.25 — 여백 4px 은 smoke 에서도 1px 남는다
export const BASE = { tpm: 32, pad: 4, maxSize: 2048, near: 6, minK: 0.2, focus: [0, 1.2, 0] };
export const QUALITY = {
  smoke: { scale: 0.25, samples: 16, bounces: 2, keySamples: 4, maxSize: 512 },
  fast: { scale: 0.5, samples: 64, bounces: 3, keySamples: 16, maxSize: 1024 },
  normal: { scale: 1, samples: 256, bounces: 4, keySamples: 32, maxSize: 2048 },
  high: { scale: 2, samples: 512, bounces: 6, keySamples: 64, maxSize: 4096 }
};
// 등 종류(ch_house addGlow bake) → 굽기 빛. I = three 물리 조명 세기(점광원 = candela 꼴: 1 m 앞 조도 I). 펜던트·벽등은 앱 점광원과 같은 값(0.6·0.55 × 22).
export const LAMPS = {
  pendant: { light: 'point', I: 13.2, radius: 0.03, label: 'pendant (table)' },
  down: { light: 'spot', I: 3.5, angle: 110, blend: 0.5, radius: 0.03, label: 'ceiling downlight' },
  eave: { light: 'spot', I: 3.0, angle: 100, blend: 0.5, radius: 0.03, label: 'eave downlight' },
  wall: { light: 'point', I: 12.1, radius: 0.04, label: 'wall lamp (sign)' },
  barn: { light: 'spot', I: 8.0, angle: 130, blend: 0.6, radius: 0.04, label: 'barn lamp (yard)' },
  street: { light: 'spot', I: 30.0, angle: 120, blend: 0.6, radius: 0.08, label: 'street lamp' },
  desk: { light: 'point', I: 3.0, radius: 0.03, label: 'desk lamp' },
  floor: { light: 'point', I: 5.0, radius: 0.08, label: 'floor lamp' },
  counter: { light: 'point', I: 8.0, radius: 0.03, label: 'counter pendant' }
};
const FILL = 0.8;   // 앱 HDRI(RoomEnvironment) 확산을 하늘빛에 얹는 몫(재질 envK 평균)

const r6 = (v) => Math.round(v * 1e6) / 1e6;
const rgb6 = (a) => a.map(r6);

function texAvg(tex, avgs) {
  if (!tex) return null;
  const ph = tex.userData && tex.userData.photo;
  if (ph) { const e = avgs['tex_' + ph + '.jpg']; return e ? e.rgb : null; }
  const im = tex.image;
  if (im && im.__fill && im.__fill.w > 0.3) return im.__fill.s.slice();
  return null;
}
function baseAlbedo(m, avgs) {
  const col = m.color ? [m.color.r, m.color.g, m.color.b] : [1, 1, 1];
  let ta = texAvg(m.map, avgs); if (m.map && !ta) ta = [0.55, 0.55, 0.55];
  const kd = 1 - (m.metalness || 0) * 0.5;
  return (ta ? [col[0] * ta[0], col[1] * ta[1], col[2] * ta[2]] : col).map((v) => v * kd);
}

/** 대상 → 월드 낱개 삼각형 {P, N, C(반사율)} */
function soupOf(t, THREE, avgs) {
  if (t.kind === 'item') {
    const b = t.item.batch, m = t.item.material, base = baseAlbedo(m, avgs), n = b.p.length / 3;
    const P = Float32Array.from(b.p), N = Float32Array.from(b.n), C = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) C[i * 3 + k] = Math.min(0.95, base[k] * (m.vertexColors && b.c.length ? b.c[i * 3 + k] : 1));
    return { P, N, C };
  }
  const o = t.mesh, g = o.geometry, m = Array.isArray(o.material) ? o.material[0] : o.material, base = baseAlbedo(m, avgs);
  const pos = g.attributes.position, nor = g.attributes.normal, col = m.vertexColors ? g.attributes.color : null, ix = g.index, n = ix ? ix.count : pos.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3), v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
  for (let k = 0; k < n; k++) {
    const vi = ix ? ix.getX(k) : k;
    v.fromBufferAttribute(pos, vi).applyMatrix4(o.matrixWorld); P[k * 3] = v.x; P[k * 3 + 1] = v.y; P[k * 3 + 2] = v.z;
    v.fromBufferAttribute(nor, vi).applyMatrix3(nm).normalize(); N[k * 3] = v.x; N[k * 3 + 1] = v.y; N[k * 3 + 2] = v.z;
    for (let j = 0; j < 3; j++) C[k * 3 + j] = Math.min(0.95, base[j] * (col ? [col.getX(vi), col.getY(vi), col.getZ(vi)][j] : 1));
  }
  if (m.side === 1) for (let k = 0; k < n * 3; k++) N[k] = -N[k];
  return { P, N, C };
}

/** 정점 합치기(같은 위치·법선·uv·색) → 색인 메시 */
function indexed(P, N, UV, C) {
  const n = P.length / 3, map = new Map(), idx = new Uint32Array(n), oP = [], oN = [], oU = [], oC = [];
  const f = new Float32Array(10), u32 = new Uint32Array(f.buffer);
  for (let i = 0; i < n; i++) {
    f[0] = P[i * 3]; f[1] = P[i * 3 + 1]; f[2] = P[i * 3 + 2]; f[3] = N[i * 3]; f[4] = N[i * 3 + 1]; f[5] = N[i * 3 + 2]; f[6] = UV[i * 2]; f[7] = UV[i * 2 + 1]; f[8] = C[i * 3]; f[9] = C[i * 3 + 1];
    const key = Array.prototype.join.call(u32, ',') + ',' + C[i * 3 + 2];
    let k = map.get(key);
    if (k === undefined) { k = map.size; map.set(key, k); oP.push(f[0], f[1], f[2]); oN.push(f[3], f[4], f[5]); oU.push(f[6], f[7]); oC.push(f[8], f[9], C[i * 3 + 2]); }
    idx[i] = k;
  }
  return { P: Float32Array.from(oP), N: Float32Array.from(oN), U: Float32Array.from(oU), C: Float32Array.from(oC), I: idx };
}

/** 최소 GLB 쓰기(바이너리 하나, 메시마다 노드 하나) */
export function writeGLB(meshes, extras) {
  const views = [], accessors = [], bufs = [];
  let off = 0;
  function add(arr, target, type, compType, count, minmax) {
    const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength), pad = (4 - (b.length % 4)) % 4;
    views.push({ buffer: 0, byteOffset: off, byteLength: b.length, target });
    bufs.push(b); if (pad) bufs.push(Buffer.alloc(pad));
    off += b.length + pad;
    const a = { bufferView: views.length - 1, componentType: compType, count, type };
    if (minmax) Object.assign(a, minmax);
    accessors.push(a); return accessors.length - 1;
  }
  const gm = [], nodes = [], mats = [];
  meshes.forEach((m) => {
    const nv = m.P.length / 3, mn = [1e30, 1e30, 1e30], mx = [-1e30, -1e30, -1e30];
    for (let i = 0; i < nv; i++) for (let k = 0; k < 3; k++) { const v = m.P[i * 3 + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v; }
    const aP = add(m.P, 34962, 'VEC3', 5126, nv, { min: mn.map((v) => Math.fround(v)), max: mx.map((v) => Math.fround(v)) });
    const aN = add(m.N, 34962, 'VEC3', 5126, nv);
    const aU = add(m.U, 34962, 'VEC2', 5126, nv);
    const aU2 = add(m.U, 34962, 'VEC2', 5126, nv);
    const aC = add(m.C, 34962, 'VEC3', 5126, nv);
    const aI = add(m.I, 34963, 'SCALAR', 5125, m.I.length);
    mats.push({ name: m.name, pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 }, doubleSided: !!m.double });
    gm.push({ name: m.name, primitives: [{ attributes: { POSITION: aP, NORMAL: aN, TEXCOORD_0: aU, TEXCOORD_1: aU2, COLOR_0: aC }, indices: aI, material: mats.length - 1 }] });
    nodes.push({ name: m.name, mesh: gm.length - 1, extras: m.extras });
  });
  const json = { asset: { version: '2.0', generator: 'room lm_export.mjs', extras }, scene: 0, scenes: [{ name: 'house', nodes: nodes.map((n, i) => i) }], nodes, meshes: gm, materials: mats, accessors, bufferViews: views, buffers: [{ byteLength: off }] };
  let js = Buffer.from(JSON.stringify(json), 'utf8'); const jp = (4 - (js.length % 4)) % 4; if (jp) js = Buffer.concat([js, Buffer.alloc(jp, 0x20)]);
  const bin = Buffer.concat(bufs);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const c0 = Buffer.alloc(8); c0.writeUInt32LE(js.length, 0); c0.writeUInt32LE(0x4e4f534a, 4);
  const c1 = Buffer.alloc(8); c1.writeUInt32LE(bin.length, 0); c1.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([head, c0, js, c1, bin]);
}

/** 등불·포털·해/달·하늘 */
export function lightsOf(c, THREE) {
  const S = c.ctx._, R = refEnv(c.id), col = new THREE.Color(), lamps = [], seq = {};
  S.glows.forEach((g) => {
    if (!g.bake) return;
    const b = typeof g.bake === 'string' ? { type: g.bake } : g.bake, def = LAMPS[b.type];
    if (!def) throw new Error('unknown lamp type ' + b.type);
    const p = g.sp.position, k = seq[b.type] || 0; seq[b.type] = k + 1;
    col.setHex(g.sp.material && g.sp.material.color ? g.sp.material.color.getHex() : 0xffc977);
    const L = { name: b.type + '_' + k, type: b.type, light: def.light, label: def.label, pos: rgb6([p.x, b.y === undefined ? p.y : b.y, p.z]), color: rgb6([col.r, col.g, col.b]),
      intensity: { day: r6(def.I * R.lampDay), night: r6(def.I * R.lamp) }, radius: def.radius };
    if (def.light === 'spot') { L.dir = [0, -1, 0]; L.angle = def.angle; L.blend = def.blend; }
    lamps.push(L);
  });
  // 창 포털(창·문 구멍마다 안쪽을 보는 직사각형 — Cycles 가 하늘빛을 창으로 몰아 쏜다. 빛을 더하지 않는다)
  // 벽 방향: 창은 kit 이 정한 hostAxisX, 문 구멍처럼 없으면 실내 상자(plan.room)에서 더 가까운 벽
  const rm = (c.layout.plan && c.layout.plan.room) || { x0: -2.5, x1: 2.5, z0: -3.3, z1: 3.3 }, cx = (rm.x0 + rm.x1) / 2, cz = (rm.z0 + rm.z1) / 2;
  const portals = S.windows.map((w, i) => {
    const ax = w.hostAxisX !== undefined ? !!w.hostAxisX : (Math.abs((rm.z1 - rm.z0) / 2 - Math.abs(w.z - cz)) < Math.abs((rm.x1 - rm.x0) / 2 - Math.abs(w.x - cx)));
    const n = ax ? [0, 0, Math.sign(cz - w.z) || -1] : [Math.sign(cx - w.x) || 1, 0, 0];
    return { name: (w.opening ? 'door_' : 'window_') + i, center: rgb6([w.x, w.y + w.h / 2, w.z]), size: [w.w, w.h], normal: n, axis: ax ? 'x' : 'z' };
  });
  const rot = (d) => { const a = (c.layout.sunRot || 0) * Math.PI / 180, x = d[0], z = d[2]; const v = [x * Math.cos(a) - z * Math.sin(a), d[1], x * Math.sin(a) + z * Math.cos(a)]; const l = Math.hypot(...v); return rgb6(v.map((q) => q / l)); };
  const world = (hs, hg, ibl) => ({ up: rgb6(hs.map((v, i) => (v + FILL * ibl[i]) / Math.PI)), down: rgb6(hg.map((v, i) => (v + FILL * ibl[i]) / Math.PI)) });
  return {
    format: 'room-lightmap-lights', v: 1, scene: c.id,
    units: 'three.js physicallyCorrectLights: point/spot intensity = candela-like (irradiance I/d^2), key.irradiance = W/m^2-like, world = radiance (irradiance/pi). Coordinates: three/glTF Y-up metres.',
    times: {
      day: { hour: 11, lampK: r6(R.lampDay), key: { type: 'sun', mode: 'realtime', dir: rot(R.sun), irradiance: rgb6(R.sunE), angleDeg: 1.5 }, world: world(R.hsD, R.hgD, R.iblD) },
      night: { hour: 22, lampK: r6(R.lamp), key: { type: 'moon', mode: 'realtime', dir: rot(R.moon), irradiance: rgb6(R.moonE), angleDeg: 3 }, world: world(R.hsA, R.hgA, R.iblA) }
    },
    lamps, portals
  };
}

export function exportHouse() {
  const H = loadRooms({ quality: 'high', photos: true, aoDefer: true, only: ['house'] });
  const c = H.rooms[0], items = c.prepare(), sb = H.sandbox;
  vm.runInContext(fs.readFileSync(path.join(WEB, 'lightmap.js'), 'utf8'), sb, { filename: 'lightmap.js' });
  const targets = sb.RoomLightmap.collectTargets(c.ctx, items), avgs = texAverages();
  const meshes = [], rows = [], uvParts = [];
  let off = 0;
  const tot = {}; Object.keys(QUALITY).forEach((q) => { tot[q] = { texels: 0 }; });
  targets.forEach((t) => {
    const s = soupOf(t, H.THREE, avgs), nv = s.P.length / 3;
    let uv = new Float32Array(nv * 2), row = { id: t.id, kind: t.kind, lm: t.lm, n: t.n, sum: t.sum, tris: nv / 3 };
    if (t.lm) {
      const u = unwrap(s.P, { tpm: BASE.tpm, pad: BASE.pad, maxSize: BASE.maxSize, near: BASE.near, minK: BASE.minK, focus: BASE.focus });
      uv = u.uv;
      const q16 = new Uint16Array(nv * 2); for (let i = 0; i < q16.length; i++) q16[i] = Math.round(Math.max(0, Math.min(1, uv[i])) * 65535);
      for (let i = 0; i < q16.length; i++) uv[i] = q16[i] / 65535;   // GLB 에도 앱과 같은(양자화한) uv2
      uvParts.push(q16);
      Object.assign(row, { off, w: u.w, h: u.h, charts: u.charts, texels: u.texels, tpm: r6(u.tpm) });
      off += q16.length;
      Object.keys(QUALITY).forEach((q) => { const sz = sizeFor(u.w, u.h, q); tot[q].texels += sz[0] * sz[1]; });
    }
    rows.push(row);
    const ix = indexed(s.P, s.N, uv, s.C);
    meshes.push({ name: t.id, ...ix, extras: { lm: t.lm, kind: t.kind } });
  });
  const lights = lightsOf(c, H.THREE);
  const glb = writeGLB(meshes, { scene: 'house', lightsFile: 'house_lights.json', targetsFile: 'house_targets.json' });
  const uv2 = Buffer.alloc(off * 2); let o2 = 0; uvParts.forEach((p) => { Buffer.from(p.buffer, p.byteOffset, p.byteLength).copy(uv2, o2); o2 += p.byteLength; });
  // 연기 시험(smoke): 창가 책상(배치) + 실내 나무 바닥(판) 둘 — 5분 안에 끝나는 작은 굽기
  const smoke = ['surf_wood_dark', 'plane_wood_floor_0'].filter((id) => rows.some((r) => r.id === id && r.lm));
  const tj = {
    format: 'room-lightmap-export', v: 1, unwrap: UNWRAP_V, scene: 'house', glb: 'house.glb', lights: 'house_lights.json', uv2: 'house_uv2.bin',
    base: BASE, quality: QUALITY, smoke: { targets: smoke, quality: 'smoke' },
    totals: Object.fromEntries(Object.keys(QUALITY).map((q) => [q, { texels: tot[q].texels }])),
    targets: rows
  };
  return { files: { 'house.glb': glb, 'house_targets.json': Buffer.from(JSON.stringify(tj, null, 1) + '\n'), 'house_lights.json': Buffer.from(JSON.stringify(lights, null, 1) + '\n'), 'house_uv2.bin': uv2 }, targets: tj, lights };
}

/** 화질별 해상도(기준 × 배율, 상한) — bake.py 와 같은 식 */
export function sizeFor(w, h, q) {
  const Q = QUALITY[q]; let s = Q.scale;
  if (Math.max(w, h) * s > Q.maxSize) s = Q.maxSize / Math.max(w, h);
  return [Math.max(4, Math.round(w * s)), Math.max(4, Math.round(h * s))];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const t0 = Date.now(), r = exportHouse();
  let bad = 0;
  for (const [f, b] of Object.entries(r.files)) {
    const p = path.join(OUT, f);
    if (check) { const cur = fs.existsSync(p) ? fs.readFileSync(p) : null; if (!cur || !cur.equals(b)) { bad++; console.log('stale ' + f); } }
    else { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(p, b); }
  }
  const lm = r.targets.targets.filter((t) => t.lm);
  console.log((check ? (bad ? 'STALE' : 'ok   ') : 'wrote') + ' house — targets ' + r.targets.targets.length + ' (lightmapped ' + lm.length + '), lamps ' + r.lights.lamps.length + ', portals ' + r.lights.portals.length +
    ', texels ' + Object.entries(r.targets.totals).map(([q, v]) => q + ' ' + (v.texels / 1e6).toFixed(2) + 'M').join(' · ') + ', glb ' + (r.files['house.glb'].length / 1024).toFixed(0) + ' KB, ' + (Date.now() - t0) + ' ms');
  if (check && bad) process.exit(1);
}
