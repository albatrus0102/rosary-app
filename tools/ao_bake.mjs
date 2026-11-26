// ao_bake.mjs — 장면마다 AO(주변광 가림)를 광선 추적으로 미리 굽는다( §2).
// 장면 빌더를 Node 에서 앱과 같은 설정(높음 화질 지오메트리 + 사진 팩 있음)으로 돌리고, 합친 정적 배치의 정점마다·바닥 격자 칸마다
// 반구 광선(코사인 가중 32개, 반경 R)을 쏘아 가림을 잰다. 결과는 assets/room/ao_<장면>.js(정점 값 = base64 문자 1개(64단계),
// 바닥 = 작은 PNG(R: AO, G: 바닥 높이, B: 유효)) — 앱은 장면에 들어갈 때 그 파일만 읽는다(ao_fx.js).
//
// 사용: node tools/ao_bake.mjs [장면 ...] [--rays 32] [--workers 4] [--check]
//   장면을 빼면 전부. --check: 굽지 않고, 지금 빌더의 정점 수·검사합이 ao_<장면>.js 와 같은지만 본다(다르면 종료 코드 1 → 다시 구워라).
//   빌더(ch_*.js·kit.js·geo.js)를 고쳐 지오메트리가 바뀌면 test/ao_bake.test.mjs 의 '최신' 시험이 실패한다 → 이 명령으로 다시 굽는다.
// 결정적: 같은 지오메트리면 바이트까지 같은 파일(고정 표본 패턴, 작업자 수와 무관).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, workerData, parentPort } from 'node:worker_threads';
import { buildBVH, makeTracer, hemiDirs, aoAt } from './ao_bvh.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ASSETS = process.env.ROOM_WEB || path.resolve(here, '../web');
export const BAKE = { v: 1, rays: 32, R: 2.0, cell: 0.15 };
const SKIP = new Set(['glass', 'glassRefl', 'glow', 'aodecal']);
export const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// ---- 작업자: BVH(공유 메모리)로 점 묶음의 AO 를 잰다 ----
if (!isMainThread && workerData && workerData.aoBake) {
  const d = workerData;
  const bvh = { nodes: new Float32Array(d.nodes), meta: new Int32Array(d.meta), idx: new Uint32Array(d.idx), tris: new Float32Array(d.tris), fn: new Float32Array(d.fn), two: new Uint8Array(d.two) };
  const trace = makeTracer(bvh), dirs = hemiDirs(d.rays), pts = new Float64Array(d.pts), out = new Float32Array(d.out), o2 = [0, 0];
  for (let i = d.a; i < d.b; i++) {
    aoAt(trace, dirs, d.R, pts[i * 6], pts[i * 6 + 1], pts[i * 6 + 2], pts[i * 6 + 3], pts[i * 6 + 4], pts[i * 6 + 5], o2);
    out[i * 2] = o2[0]; out[i * 2 + 1] = o2[1];
  }
  parentPort.postMessage('done');
}

/** 배치 정점 위치 검사합(앱 ao_fx.js checksum 과 같은 식) */
export function checksum(P) {
  let s = 0; for (let i = 0; i < P.length; i++) s += P[i] * ((i % 13) + 1);
  return s;
}

function shared(arr) { const sab = new SharedArrayBuffer(arr.byteLength); new arr.constructor(sab).set(arr); return sab; }

/** 준비된 장면(room_harness 항목) → 가림 삼각형 + 구울 대상 배치 */
export function collect(c) {
  const items = c.prepare();
  const tris = [], fn = [], two = [];
  function addTri(ax, ay, az, bx, by, bz, cx, cy, cz, nx, ny, nz, ds) {
    const l = Math.hypot(nx, ny, nz); if (l < 1e-9) return;
    tris.push(ax, ay, az, bx, by, bz, cx, cy, cz); fn.push(nx / l, ny / l, nz / l); two.push(ds ? 1 : 0);
  }
  const targets = [];
  items.forEach((it) => {
    const m = it.material;
    if (it.ao) targets.push({ name: it.name, P: it.batch.p, N: it.batch.n });
    if (SKIP.has(it.name) || (m && (m.transparent || m.depthWrite === false))) return;
    const P = it.batch.p, N = it.batch.n, ds = m && m.side === 2;
    for (let i = 0; i + 8 < P.length; i += 9) addTri(P[i], P[i + 1], P[i + 2], P[i + 3], P[i + 4], P[i + 5], P[i + 6], P[i + 7], P[i + 8], N[i] + N[i + 3] + N[i + 6], N[i + 1] + N[i + 4] + N[i + 7], N[i + 2] + N[i + 5] + N[i + 8], ds);
  });
  // 빌더가 직접 만든 메시(판·바닥 판·인스턴스 기둥·직접 지은 배치)
  const root = c.ctx.root; root.updateMatrixWorld(true);
  const THREE = c.ctx.THREE, M = new THREE.Matrix4(), IM = new THREE.Matrix4(), v = new THREE.Vector3(), nm = new THREE.Matrix3();
  root.traverseVisible((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || m.transparent || m.depthWrite === false || m.visible === false || m.blending === 2) return;
    const g = o.geometry, pos = g.attributes.position, nor = g.attributes.normal, ix = g.index, n = ix ? ix.count : pos.count;
    const inst = o.isInstancedMesh ? o.count : 1;
    for (let k = 0; k < inst; k++) {
      M.copy(o.matrixWorld);
      if (o.isInstancedMesh) { o.getMatrixAt(k, IM); if (Math.abs(IM.determinant()) < 1e-12) continue; M.multiply(IM); }
      nm.getNormalMatrix(M);
      const sideFlip = m.side === 1 ? -1 : 1;
      for (let t = 0; t + 2 < n; t += 3) {
        const q = [];
        let nx = 0, ny = 0, nz = 0;
        for (let j = 0; j < 3; j++) {
          const vi = ix ? ix.getX(t + j) : t + j;
          v.fromBufferAttribute(pos, vi).applyMatrix4(M); q.push(v.x, v.y, v.z);
          if (nor) { v.fromBufferAttribute(nor, vi).applyMatrix3(nm); nx += v.x; ny += v.y; nz += v.z; }
        }
        if (!nor) {
          const e1 = [q[3] - q[0], q[4] - q[1], q[5] - q[2]], e2 = [q[6] - q[0], q[7] - q[1], q[8] - q[2]];
          nx = e1[1] * e2[2] - e1[2] * e2[1]; ny = e1[2] * e2[0] - e1[0] * e2[2]; nz = e1[0] * e2[1] - e1[1] * e2[0];
        }
        addTri(q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7], q[8], nx * sideFlip, ny * sideFlip, nz * sideFlip, m.side === 2);
      }
    }
  });
  return { tris: new Float32Array(tris), fn: new Float32Array(fn), two: new Uint8Array(two), targets };
}

function crc32(buf) {
  if (zlib.crc32) return zlib.crc32(buf) >>> 0;
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xffffffff) >>> 0;
}
/** RGB 8비트 PNG(필터 0, zlib 최고 압축) */
export function encodePNG(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1); }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** 점 목록(Float64Array 6n: 위치·법선)의 AO 를 작업자 여럿으로 잰다 → Float32Array 2n (ao, 묻힘 비율) */
export async function traceAll(bvh, pts, o = {}) {
  const n = pts.length / 6, out = new Float32Array(new SharedArrayBuffer(n * 2 * 4));
  const rays = o.rays || BAKE.rays, R = o.R || BAKE.R;
  const W = Math.max(1, Math.min(o.workers || os.cpus().length, 8, Math.ceil(n / 2000)));
  if (W === 1 || n < 4000) {
    const trace = makeTracer(bvh), dirs = hemiDirs(rays), o2 = [0, 0];
    for (let i = 0; i < n; i++) { aoAt(trace, dirs, R, pts[i * 6], pts[i * 6 + 1], pts[i * 6 + 2], pts[i * 6 + 3], pts[i * 6 + 4], pts[i * 6 + 5], o2); out[i * 2] = o2[0]; out[i * 2 + 1] = o2[1]; }
    return out;
  }
  const sh = { nodes: shared(bvh.nodes), meta: shared(bvh.meta), idx: shared(bvh.idx), tris: shared(bvh.tris), fn: shared(bvh.fn), two: shared(bvh.two), pts: shared(pts), out: out.buffer };
  const step = Math.ceil(n / W), jobs = [];
  for (let w = 0; w < W; w++) {
    const a = w * step, b = Math.min(n, a + step);
    if (a >= b) break;
    jobs.push(new Promise((res, rej) => {
      const wk = new Worker(new URL(import.meta.url), { workerData: { aoBake: true, ...sh, a, b, rays, R } });
      wk.once('message', () => { wk.terminate(); res(); }); wk.once('error', rej);
    }));
  }
  await Promise.all(jobs);
  return out;
}

/** 한 장면을 굽는다 → { text(ao_<id>.js 내용), stats } */
export async function bakeRoom(c, Logic, o = {}) {
  const t0 = Date.now();
  const rays = o.rays || BAKE.rays, R = o.R || BAKE.R, cell = o.cell || BAKE.cell;
  const col = collect(c);
  const bvh = buildBVH(col.tris, col.fn, col.two);
  // 정점: 같은 위치·법선은 한 번만 잰다
  const keyIdx = new Map(), uniq = [], vref = [];
  col.targets.forEach((tg) => {
    const P = tg.P, N = tg.N, n = P.length / 3, ref = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const k = Math.round(P[i * 3] * 1000) + ',' + Math.round(P[i * 3 + 1] * 1000) + ',' + Math.round(P[i * 3 + 2] * 1000) + ',' + Math.round(N[i * 3] * 50) + ',' + Math.round(N[i * 3 + 1] * 50) + ',' + Math.round(N[i * 3 + 2] * 50);
      let u = keyIdx.get(k);
      if (u === undefined) {
        u = uniq.length / 6; keyIdx.set(k, u);
        let nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2]; const l = Math.hypot(nx, ny, nz) || 1;
        uniq.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], nx / l, ny / l, nz / l);
      }
      ref[i] = u;
    }
    vref.push(ref);
  });
  // 바닥 격자: 걷는 바닥 높이(logic.floorY) 근처의 위를 보는 면을 찾아 그 높이에서 잰다
  const L = c.layout, b = L.bounds;
  const logic = Logic.create(L, { colliders: c.colliders, zones: c.zones });
  const fx0 = b.x0 - cell, fz0 = b.z0 - cell, FW = Math.ceil((b.x1 - b.x0) / cell) + 2, FH = Math.ceil((b.z1 - b.z0) / cell) + 2;
  const trace = makeTracer(bvh), fh = new Float32Array(FW * FH).fill(NaN);
  const fpts = [], fidx = [];
  for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) {
    const x = fx0 + (i + 0.5) * cell, z = fz0 + (j + 0.5) * cell;
    let y0 = 0; try { y0 = logic.floorY(x, z) || 0; } catch (e) { y0 = 0; }
    let t = trace(x, y0 + 0.06, z, 0, -1, 0, 0, 0.14, null), top = y0 + 0.06;
    if (t < 0) { top = y0 + 1.2; t = trace(x, top, z, 0, -1, 0, 0, 1.3, null); }
    if (t < 0) continue;
    const h = top - t;
    fh[j * FW + i] = h; fpts.push(x, h, z, 0, 1, 0); fidx.push(j * FW + i);
  }
  const all = new Float64Array(uniq.length + fpts.length);
  all.set(uniq, 0); all.set(fpts, uniq.length);
  const res = await traceAll(bvh, all, { rays, R, workers: o.workers });
  const NU = uniq.length / 6;
  // 정점 값 → base64 문자(64단계)
  const entries = col.targets.map((tg, k) => {
    const ref = vref[k], n = ref.length;
    let d = '';
    const parts = [];
    for (let i = 0; i < n; i++) { const a = res[ref[i] * 2]; let q = Math.round(Math.max(0, Math.min(1, a)) * 63); d += B64[q]; if (d.length >= 65536) { parts.push(d); d = ''; } }
    parts.push(d);
    return { name: tg.name, n, s: checksum(tg.P), d: parts.join('') };
  });
  // 바닥: 묻힌 칸(기둥 속)·못 찾은 칸은 이웃 값으로 메운다(쌍선형 보간이 기둥 밑동의 어둠을 묽히지 않게)
  const fa = new Float32Array(FW * FH).fill(NaN);
  let hmin = Infinity, hmax = -Infinity;
  fidx.forEach((ci, k) => {
    const r = NU + k, bur = res[r * 2 + 1];
    if (bur > 0.5) return;
    fa[ci] = res[r * 2]; if (fh[ci] < hmin) hmin = fh[ci]; if (fh[ci] > hmax) hmax = fh[ci];
  });
  const valid = new Uint8Array(FW * FH); for (let i = 0; i < fa.length; i++) if (!Number.isNaN(fa[i])) valid[i] = 2;
  for (let pass = 0; pass < 4; pass++) {
    const add = [];
    for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) {
      const ci = j * FW + i; if (valid[ci]) continue;
      let s = 0, sh2 = 0, w = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= FW || jj >= FH) continue;
        const q = jj * FW + ii; if (!valid[q]) continue;
        s += fa[q]; sh2 += fh[q]; w++;
      }
      if (w) add.push([ci, s / w, Number.isNaN(fh[ci]) ? sh2 / w : fh[ci]]);
    }
    add.forEach(([ci, a, h]) => { fa[ci] = a; fh[ci] = h; valid[ci] = 1; });
  }
  let floor = null, nValid = 0;
  if (hmax >= hmin) {
    const hr = Math.max(0.01, hmax - hmin), rgb = new Uint8Array(FW * FH * 3);
    for (let i = 0; i < FW * FH; i++) {
      if (!valid[i]) { rgb[i * 3] = 255; rgb[i * 3 + 1] = 0; rgb[i * 3 + 2] = 0; continue; }
      if (valid[i] === 2) nValid++;
      rgb[i * 3] = Math.round(Math.max(0, Math.min(1, fa[i])) * 255);
      rgb[i * 3 + 1] = Math.round(Math.max(0, Math.min(1, (fh[i] - hmin) / hr)) * 255);
      rgb[i * 3 + 2] = 255;
    }
    const png = encodePNG(FW, FH, rgb);
    floor = { x0: +fx0.toFixed(4), z0: +fz0.toFixed(4), cell, w: FW, h: FH, h0: +hmin.toFixed(4), hr: +hr.toFixed(4), png: 'data:image/png;base64,' + png.toString('base64') };
  }
  const data = { v: BAKE.v, rays, R, b: entries, f: floor };
  const text = '/* ao_' + c.id + '.js — tools/ao_bake.mjs 로 생성(직접 고치지 말 것). 미리 구운 AO: 정점(배치 순서, base64 1글자 = 64단계) + 바닥 PNG(R=AO, G=높이, B=유효). */\n' +
    '(window.RoomAOBake=window.RoomAOBake||{})[' + JSON.stringify(c.id) + ']=' + JSON.stringify(data) + ';\n';
  const stats = { id: c.id, tris: col.tris.length / 9, verts: entries.reduce((a, e) => a + e.n, 0), uniq: NU, floorCells: fidx.length, floorValid: nValid, floorSize: floor ? FW + 'x' + FH : '-', bytes: text.length, ms: Date.now() - t0 };
  return { text, stats, data };
}

/** 지금 빌더와 ao_<id>.js 가 맞는가: [{id, ok, why}] */
export function checkFresh(rooms) {
  return rooms.map((c) => {
    const f = path.join(ASSETS, 'ao_' + c.id + '.js');
    if (!fs.existsSync(f)) return { id: c.id, ok: false, why: 'no file' };
    const src = fs.readFileSync(f, 'utf8'), m = /=(\{.*\});\s*$/s.exec(src);
    const data = JSON.parse(m[1]);
    const targets = c.prepare().filter((it) => it.ao);
    if (targets.length !== data.b.length) return { id: c.id, ok: false, why: 'batch count ' + targets.length + ' != ' + data.b.length };
    for (let k = 0; k < targets.length; k++) {
      const P = targets[k].batch.p, e = data.b[k];
      if (P.length / 3 !== e.n) return { id: c.id, ok: false, why: targets[k].name + ' verts ' + P.length / 3 + ' != ' + e.n };
      if (Math.abs(checksum(P) - e.s) > 1e-6 * Math.max(1, Math.abs(e.s))) return { id: c.id, ok: false, why: targets[k].name + ' checksum' };
    }
    return { id: c.id, ok: true };
  });
}

export async function loadForBake(only) {
  const { loadRooms } = await import('./harness.mjs');
  return loadRooms({ quality: 'high', photos: true, aoDefer: true, only });
}

if (isMainThread && process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), ids = [], o = {};
  let check = false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--rays') o.rays = +a[++i]; else if (a[i] === '--workers') o.workers = +a[++i]; else if (a[i] === '--check') check = true; else ids.push(a[i]);
  }
  const H = await loadForBake(ids.length ? ids : null);
  const list = H.rooms.filter((c) => !ids.length || ids.includes(c.id));
  if (check) {
    const r = checkFresh(list);
    r.forEach((x) => console.log(x.ok ? 'ok   ' : 'STALE', x.id, x.why || ''));
    process.exit(r.every((x) => x.ok) ? 0 : 1);
  }
  for (const c of list) {
    const { text, stats } = await bakeRoom(c, H.Logic, o);
    fs.writeFileSync(path.join(ASSETS, 'ao_' + c.id + '.js'), text);
    console.log(JSON.stringify(stats));
  }
}
