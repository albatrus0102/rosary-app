// gi_bake.mjs — 장면마다 '빛 번짐'(간접광 1번 튕김 + 색 번짐)을 광선 추적으로 미리 굽는다().
// 1차 AO(ao_bake.mjs)와 같은 빌더·같은 BVH(ao_bvh.mjs)·같은 정점 순서를 쓴다. 정점마다(같은 자리·같은 방향은 25cm 묶음으로 한 번)·바닥 격자 칸마다
// 반구 광선(코사인 가중 고정 패턴)을 쏘아, 맞은 면이 내보내는 빛(그 면의 색 × (그 자리의 해·주변광·등불) + 자체발광)과 창으로 빠지는 하늘빛을 모은다.
//   · 낮 갈래(D): 해(그림자 광선) + 하늘(창) + 주변광 — 대표 시각 11시, 장면 룩(looks.js) 적용.
//   앱에 이미 있는 빛(해·빌더 점광원)이 그 정점에 직접 비추는 몫은 넣지 않는다(앱이 그린다). 앱에 빛이 없는 샹들리에 빛 무리·불꽃은 직접 몫도 넣는다.
// 값은 '그 장면 평균에 대한 비'(채널마다 평균 1)로 바꾸고 로그 영역에서 눌러(γ) ±1단으로 묶은 뒤 다시 평균 휘도 1 로 맞춘다 → 룩 조정(전체 밝기)은 그대로,
// 곳마다의 색·밝기 변화만 남는다. 앱(gi_fx.js)은 간접 확산광(반구광 + HDRI 확산)에만 곱한다.
// 새는 빛 막기: 뒷면에 먼저 닿은 광선은 '막힘'(값에서 뺀다, 얇은 벽 너머를 보지 않는다), 뒷면 비율이 높은 점(물체 속)은 이웃 값으로 메운다,
// 이웃 평균(거르기)은 서로 보이는(짧은 광선이 막히지 않는) 같은 방향 이웃만.
// 결과: assets/room/gi_<장면>.js — 배치별 {n, s(AO 와 같은 검사합)} + 평면별 차분 → deflate-raw → base64 한 덩어리(정점 낮·밤 RGB, 바닥 격자 낮·밤 RGB).
//
// 사용: node tools/gi_bake.mjs [장면 ...] [--rays 96] [--workers 4] [--check]
//   장면을 빼면 전부(감상실 제외, room_harness 가 찾는 ch_*.js 전부 — 새 장면도 ch_<id>.js 만 있으면 된다).
//   --check: 굽지 않고, 지금 빌더의 정점 수·검사합이 gi_<장면>.js 와 같은지만 본다(다르면 종료 코드 1 → 다시 구워라).
// 결정적: 같은 지오메트리면 바이트까지 같은 파일(고정 표본 패턴·고정 해시, 작업자 수와 무관).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, workerData, parentPort } from 'node:worker_threads';
import { buildBVH, makeTracer, hemiDirs, frame } from './ao_bvh.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ASSETS = process.env.ROOM_WEB || path.resolve(here, '../web');
// rays: 반구 광선 수 · cell: 바닥 격자(m) · key: 정점 묶음(m) · fR: 이웃 평균 반경(m) · gamma/gammaN/gammaC: 낮 휘도/밤 휘도/색 로그 누르기 · lim/limD·limN/limND·limC: 밝게/어둡게 상한(단) — 어둡게는 작게(구석·의자 밑은 AO 가 이미 어둡게 한다, 두 번 어둡게 하면 보이는 곳이 평균 맞추기로 밝아진다) · refCell: 둘레 평균 칸(m, 3×3×3 흐림) · q: 1단 = 32단계
export const GI = { v: 1, rays: 96, cell: 0.3, key: 0.25, fR: 1.0, fMax: 40, gamma: 0.55, gammaN: 0.35, gammaC: 0.7, lim: 0.5, limD: 0.25, limN: 0.3, limND: 0.2, limC: 0.3, refCell: 2.5, q: 32, hourDay: 11, hourNight: 22 };
const SKIP = new Set(['glass', 'glassRefl', 'glow', 'aodecal']);
const LS = 10;   // 등불 한 개: x,y,z, r,g,b(세기 × 색), lum, range, soft, virtual(앱에 빛이 없음 = 직접 몫도 굽는다)
export const TEXAVG = path.join(here, 'gi_texavg.json');

/** 점 묶음 열쇠(앱 gi_fx.js recvKey 와 같은 식 — 부동소수 연산이 IEEE 로 정확한 것만 쓴다: 곱셈·Math.round, 법선은 정규화하지 않는다). 위치 25cm·법선 약 15° 칸.
 *  정수 6개를 한 문자열로. 앱은 정점을 같은 순서로 훑으며 처음 나온 열쇠에 다음 번호를 준다 → 굽기와 같은 점 번호. */
export function recvKey(x, y, z, nx, ny, nz) {
  const inv = 1 / GI.key;
  return Math.round(x * inv) + ',' + Math.round(y * inv) + ',' + Math.round(z * inv) + ',' + Math.round(nx * 4) + ',' + Math.round(ny * 4) + ',' + Math.round(nz * 4);
}
/** 배치 정점 위치 검사합(ao_bake.mjs·ao_fx.js 와 같은 식) */
export function checksum(P) { let s = 0; for (let i = 0; i < P.length; i++) s += P[i] * ((i % 13) + 1); return s; }
function shared(arr) { const sab = new SharedArrayBuffer(arr.byteLength); new arr.constructor(sab).set(arr); return sab; }
function hash01(a, b) {
  let h = (Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 7, 0x85ebca77)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x846ca68b) >>> 0; h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 한 점의 낮(D)·밤(A) 조도(RGB)와 뒷면 비율·하늘 비율을 잰다 → out[0..7]. sc: {alb, emD, emA, envk, lamps, env} (전부 타입 배열·숫자) */
export function makeGather(bvh, sc, rays) {
  const trace = makeTracer(bvh), dirs = hemiDirs(rays), N = rays, bh = [0, -1];
  const fn = bvh.fn, alb = sc.alb, emD = sc.emD, emA = sc.emA, envk = sc.envk, L = sc.lamps, E = sc.env, nL = L.length / LS, wl = new Float64Array(Math.max(1, nL));
  const INV_PI = 1 / Math.PI;
  const occl = (ox, oy, oz, dx, dy, dz, tmax) => trace(ox, oy, oz, dx, dy, dz, 0.002, tmax, null) >= 0;
  const visL = (l, sx, sy, sz) => { const o = l * LS, lx = L[o] - sx, ly = L[o + 1] - sy, lz = L[o + 2] - sz, d = Math.sqrt(lx * lx + ly * ly + lz * lz); return !occl(sx, sy, sz, lx / d, ly / d, lz / d, Math.max(0.01, d - 0.12)); };
  const sun = E.sun, sunE = E.sunE, moon = E.moon, moonE = E.moonE, sunOn = sunE[0] + sunE[1] + sunE[2] > 0, moonOn = moonE[0] + moonE[1] + moonE[2] > 0;
  return function gather(seed, px, py, pz, nx, ny, nz, out) {
    const f = frame(nx, ny, nz);
    const ox = px + nx * 0.01, oy = py + ny * 0.01, oz = pz + nz * 0.01;
    let dR = 0, dG = 0, dB = 0, aR = 0, aG = 0, aB = 0, valid = 0, back = 0, miss = 0;
    for (let k = 0; k < N; k++) {
      const a = dirs[k * 3], b = dirs[k * 3 + 1], c = dirs[k * 3 + 2];
      const dx = f[0] * a + f[3] * b + nx * c, dy = f[1] * a + f[4] * b + ny * c, dz = f[2] * a + f[5] * b + nz * c;
      const t = trace(ox, oy, oz, dx, dy, dz, 0.002, 1e4, bh);
      if (bh[0] < (t < 0 ? Infinity : t)) { back++; continue; }   // 뒷면이 먼저: 얇은 벽·물체 속 — 너머를 보지 않는다(값에서 뺀다)
      valid++;
      if (t < 0) { miss++; const up = dy > 0 ? 1 : 0.35; dR += E.skyD[0] * up; dG += E.skyD[1] * up; dB += E.skyD[2] * up; aR += E.skyA[0] * up; aG += E.skyA[1] * up; aB += E.skyA[2] * up; continue; }
      const tri = bh[1];
      let qnx = fn[tri * 3], qny = fn[tri * 3 + 1], qnz = fn[tri * 3 + 2];
      if (dx * qnx + dy * qny + dz * qnz > 0) { qnx = -qnx; qny = -qny; qnz = -qnz; }   // 양면 재질을 뒤에서
      const qx = ox + dx * t, qy = oy + dy * t, qz = oz + dz * t, sx = qx + qnx * 0.01, sy = qy + qny * 0.01, sz = qz + qnz * 0.01;
      const ar = alb[tri * 3], ag = alb[tri * 3 + 1], ab = alb[tri * 3 + 2], ek = envk[tri], hw = 0.5 + 0.5 * qny;
      // 낮: 반구광 + HDRI 확산(그 재질의 envK) + 해(그림자 광선)
      let eR = E.hgD[0] + (E.hsD[0] - E.hgD[0]) * hw + E.iblD[0] * ek, eG = E.hgD[1] + (E.hsD[1] - E.hgD[1]) * hw + E.iblD[1] * ek, eB = E.hgD[2] + (E.hsD[2] - E.hgD[2]) * hw + E.iblD[2] * ek;
      if (sunOn) {
        const cs = qnx * sun[0] + qny * sun[1] + qnz * sun[2];
        if (cs > 0 && !occl(sx, sy, sz, sun[0], sun[1], sun[2], 1e4)) { eR += sunE[0] * cs; eG += sunE[1] * cs; eB += sunE[2] * cs; }
      }
      dR += ar * eR * INV_PI + emD[tri * 3]; dG += ag * eG * INV_PI + emD[tri * 3 + 1]; dB += ab * eB * INV_PI + emD[tri * 3 + 2];
      // 밤: 반구광 + HDRI(밤 envK) + 달 + 등불 하나(기여에 비례해 고르는 확률 표본, 그림자 광선 1개)
      let nR = E.hgA[0] + (E.hsA[0] - E.hgA[0]) * hw + E.iblA[0] * ek, nG = E.hgA[1] + (E.hsA[1] - E.hgA[1]) * hw + E.iblA[1] * ek, nB = E.hgA[2] + (E.hsA[2] - E.hgA[2]) * hw + E.iblA[2] * ek;
      if (moonOn) {
        const cm = qnx * moon[0] + qny * moon[1] + qnz * moon[2];
        if (cm > 0 && !occl(sx, sy, sz, moon[0], moon[1], moon[2], 1e4)) { nR += moonE[0] * cm; nG += moonE[1] * cm; nB += moonE[2] * cm; }
      }
      if (nL) {
        let tot = 0;
        for (let l = 0; l < nL; l++) {
          const o = l * LS, lx = L[o] - sx, ly = L[o + 1] - sy, lz = L[o + 2] - sz, d2 = lx * lx + ly * ly + lz * lz, rg = L[o + 7];
          if (d2 >= rg * rg) { wl[l] = 0; continue; }
          const d = Math.sqrt(d2), cl = (lx * qnx + ly * qny + lz * qnz) / d;
          if (cl <= 0) { wl[l] = 0; continue; }
          const r4 = d2 * d2 / (rg * rg * rg * rg), win = (1 - r4) * (1 - r4), w = L[o + 6] * cl * win / (d2 + L[o + 8] * L[o + 8]);
          wl[l] = w; tot += w;
        }
        // 가장 센 등불은 늘 그림자 광선으로 재고, 나머지는 기여에 비례해 하나를 고른다(분산 줄이기)
        let best = -1, bw = 0;
        for (let l = 0; l < nL; l++) if (wl[l] > bw) { bw = wl[l]; best = l; }
        if (best >= 0 && visL(best, sx, sy, sz)) { const o = best * LS, s2 = bw / L[o + 6]; nR += L[o + 3] * s2; nG += L[o + 4] * s2; nB += L[o + 5] * s2; }
        const rest = tot - bw;
        if (rest > bw * 1e-3) {
          let u = hash01(seed, k) * rest, l = 0;
          for (; l < nL - 1; l++) { if (l === best) continue; u -= wl[l]; if (u <= 0 && wl[l] > 0) break; }
          while ((wl[l] === 0 || l === best) && l > 0) l--;
          if (l !== best && wl[l] > 0 && visL(l, sx, sy, sz)) { const o = l * LS, s2 = rest / L[o + 6]; nR += L[o + 3] * s2; nG += L[o + 4] * s2; nB += L[o + 5] * s2; }
        }
      }
      aR += ar * nR * INV_PI + emA[tri * 3]; aG += ag * nG * INV_PI + emA[tri * 3 + 1]; aB += ab * nB * INV_PI + emA[tri * 3 + 2];
    }
    const kk = valid ? Math.PI / valid : 0;
    out[0] = dR * kk; out[1] = dG * kk; out[2] = dB * kk; out[3] = aR * kk; out[4] = aG * kk; out[5] = aB * kk;
    out[6] = back / N; out[7] = valid ? miss / valid : 0;
    for (let l = 0; l < nL; l++) {
      const o = l * LS; if (!L[o + 9]) continue;
      const lx = L[o] - ox, ly = L[o + 1] - oy, lz = L[o + 2] - oz, d2 = lx * lx + ly * ly + lz * lz, rg = L[o + 7];
      if (d2 >= rg * rg) continue;
      const d = Math.sqrt(d2), cl = (lx * nx + ly * ny + lz * nz) / d;
      if (cl <= 0) continue;
      const r4 = d2 * d2 / (rg * rg * rg * rg), win = (1 - r4) * (1 - r4), sf = Math.max(0.9, L[o + 8]), g = cl * win / (d2 + sf * sf);
      if (g * L[o + 6] < 1e-4) continue;
      if (occl(ox, oy, oz, lx / d, ly / d, lz / d, Math.max(0.01, d - 0.12))) continue;
      out[3] += L[o + 3] * g; out[4] += L[o + 4] * g; out[5] += L[o + 5] * g;
    }
    return out;
  };
}

// ---- 작업자 ----
if (!isMainThread && workerData && workerData.giBake) {
  const d = workerData;
  const bvh = { nodes: new Float32Array(d.nodes), meta: new Int32Array(d.meta), idx: new Uint32Array(d.idx), tris: new Float32Array(d.tris), fn: new Float32Array(d.fn), two: new Uint8Array(d.two) };
  const sc = { alb: new Float32Array(d.alb), emD: new Float32Array(d.emD), emA: new Float32Array(d.emA), envk: new Float32Array(d.envk), lamps: new Float64Array(d.lamps), env: d.env };
  const g = makeGather(bvh, sc, d.rays), pts = new Float64Array(d.pts), out = new Float32Array(d.out), o8 = new Float64Array(8);
  for (let i = d.a; i < d.b; i++) {
    g(i, pts[i * 6], pts[i * 6 + 1], pts[i * 6 + 2], pts[i * 6 + 3], pts[i * 6 + 4], pts[i * 6 + 5], o8);
    for (let j = 0; j < 8; j++) out[i * 8 + j] = o8[j];
  }
  parentPort.postMessage('done');
}

async function traceAll(bvh, sc, pts, o) {
  const n = pts.length / 6, out = new Float32Array(new SharedArrayBuffer(n * 8 * 4)), rays = o.rays || GI.rays;
  const W = Math.max(1, Math.min(o.workers || os.cpus().length, 8, Math.ceil(n / 1000)));
  if (W === 1) {
    const g = makeGather(bvh, sc, rays), o8 = new Float64Array(8);
    for (let i = 0; i < n; i++) { g(i, pts[i * 6], pts[i * 6 + 1], pts[i * 6 + 2], pts[i * 6 + 3], pts[i * 6 + 4], pts[i * 6 + 5], o8); for (let j = 0; j < 8; j++) out[i * 8 + j] = o8[j]; }
    return out;
  }
  const sh = { nodes: shared(bvh.nodes), meta: shared(bvh.meta), idx: shared(bvh.idx), tris: shared(bvh.tris), fn: shared(bvh.fn), two: shared(bvh.two),
    alb: shared(sc.alb), emD: shared(sc.emD), emA: shared(sc.emA), envk: shared(sc.envk), lamps: shared(sc.lamps), pts: shared(pts), out: out.buffer };
  // 잘게 나눠 번갈아 맡긴다(장면 안쪽·바깥쪽 점의 비용 차이가 작업자 하나에 몰리지 않게). 결과는 점 번호 자리에 쓰므로 나누는 방식과 무관.
  const chunk = Math.max(500, Math.ceil(n / (W * 6))), jobs = [];
  let next = 0;
  async function runWorker() {
    while (next < n) {
      const a = next, b = Math.min(n, a + chunk); next = b;
      await new Promise((res, rej) => {
        const wk = new Worker(new URL(import.meta.url), { workerData: { giBake: true, ...sh, a, b, rays, env: sc.env } });
        wk.once('message', () => { wk.terminate(); res(); }); wk.once('error', rej);
      });
    }
  }
  for (let w = 0; w < W; w++) jobs.push(runWorker());
  await Promise.all(jobs);
  return out;
}

// ---- 기준 조명(world.js sampleEnv + looks.js, 앱과 같은 식) ----
let envVm = null;
function envContext() {
  if (envVm) return envVm;
  const sb = { console, location: { search: '' } }; sb.window = sb; sb.self = sb;
  vm.createContext(sb);
  ['three.min.js', 'looks.js', 'world.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ASSETS, f), 'utf8'), sb, { filename: f }));
  envVm = sb; return sb;
}
let hdrMean = null;
/** env_room.js 의 HDRI(RGBE) 평균 복사휘도(위도 가중) → [r,g,b]. 앱의 확산 IBL = π × 이 값 × envMapIntensity(근사) */
export function hdriMean() {
  // 이 패키지는 HDRI 파일 대신 three 의 RoomEnvironment(밝은 방, render.js)를 쓴다 — 평균 복사휘도를 고르게 0.5 로 둔다(값은 평균 1 로 맞춰지므로 비율만 쓴다)
  if (!hdrMean) hdrMean = [0.5, 0.5, 0.5];
  return hdrMean;
}
const rgbOf = (c) => [c.r, c.g, c.b];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
/** 장면 id 의 낮·밤 기준 조명(룩 적용) → gather 의 env */
export function refEnv(id) {
  const sb = envContext(), W = sb.RoomWorld, LK = sb.RoomLooks, T = sb.THREE, M = hdriMean();
  const look = LK.get(id);
  const one = (hour) => {
    const env = W.sampleEnv(hour, {}), L = LK.blend(look, env.night, {}), c = new T.Color();
    env.di *= L.keyK; if (L.keyTintK) env.dc.lerp(c.setHex(look.keyTint), L.keyTintK);
    env.hi *= L.ambK; if (L.ambTintK) { env.hs.lerp(c.setHex(look.ambTint), L.ambTintK); env.hg.lerp(c, L.ambTintK * 0.5); }
    env.envK *= L.envK; env.lamp *= L.lampK;
    return { env, L, glass: mul(rgbOf(env.glass), env.gk * L.glassK) };
  };
  const d = one(GI.hourDay), n = one(GI.hourNight);
  const sd = d.env.sunDir, md = n.env.sunDir;
  return {
    sun: d.env.moon ? [0, 1, 0] : sd.slice(), sunE: d.env.moon ? [0, 0, 0] : mul(rgbOf(d.env.dc), d.env.di),
    moon: md.slice(), moonE: mul(rgbOf(n.env.dc), n.env.di),
    hsD: mul(rgbOf(d.env.hs), d.env.hi), hgD: mul(rgbOf(d.env.hg), d.env.hi), iblD: mul(M, Math.PI * d.env.envK), skyD: d.glass,
    hsA: mul(rgbOf(n.env.hs), n.env.hi), hgA: mul(rgbOf(n.env.hg), n.env.hi), iblA: mul(M, Math.PI * n.env.envK), skyA: n.glass,
    lamp: n.env.lamp, lampDay: d.env.lamp, look
  };
}

// ---- 질감 평균 색 ----
let texAvgCache = null;
/** 사진 질감 평균(선형) 표: tools/gi_texavg.json, 없거나 사진이 바뀌었으면 gi_texavg.py(PIL)로 다시 잰다 */
export function texAverages() {
  if (texAvgCache) return texAvgCache;
  // web/tex/<이름>.jpg 의 평균 색(선형) — 키는 'tex_<이름>.jpg'(아래 texAvg 와 같은 꼴). python3 + Pillow 로 잰다.
  const code = 'import sys,os,json\nfrom PIL import Image\nd=sys.argv[1];o={}\n' +
    'def lin(c):\n c=c/255.0\n return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4\n' +
    'for f in sorted(os.listdir(d)):\n if not f.endswith(".jpg") or f.endswith("_n.jpg") or f.endswith("_r.jpg"): continue\n' +
    ' im=Image.open(os.path.join(d,f)).convert("RGB").resize((64,64));px=list(im.getdata());n=len(px)\n' +
    ' o["tex_"+f]={"rgb":[sum(lin(p[i]) for p in px)/n for i in range(3)]}\nprint(json.dumps(o))\n';
  const r = spawnSync('python3', ['-c', code, path.join(ASSETS, 'tex')], { encoding: 'utf8', maxBuffer: 16 << 20 });
  let cur = {};
  if (r.status === 0) cur = JSON.parse(r.stdout); else console.warn('[gi] 사진 평균 색을 잴 수 없습니다(python3 + Pillow 필요) — 회색으로 둡니다', (r.stderr || '').slice(0, 200));
  texAvgCache = cur;
  return cur;
}
function texAvg(tex, avgs) {
  if (!tex) return null;
  const ph = tex.userData && tex.userData.photo;
  if (ph) { const e = avgs['tex_' + ph + '.jpg']; return e ? e.rgb : null; }
  const im = tex.image;
  if (im && im.__fill && im.__fill.w > 0.3) return im.__fill.s.slice();
  return null;
}

/** 준비된 장면 → 가림 삼각형 + 면마다 반사율·자체발광·envK + 구울 배치 */
export function collectGI(c, H) {
  const items = c.prepare(), S = c.ctx._, avgs = texAverages();
  const liftOf = new Map(); S.physMats.forEach((p) => { if (p.lift) liftOf.set(p.m, p.lift); });
  const defOf = new Map(); Object.keys(S.surfBatches).forEach((k) => defOf.set('surf_' + k, S.surfBatches[k].def));
  const tris = [], fn = [], two = [], alb = [], emD = [], emA = [], envk = [];
  function matInfo(m, def) {
    const col = m.color ? rgbOf(m.color) : [1, 1, 1];
    let ta = texAvg(m.map, avgs);
    if (m.map && !ta) ta = def && def.tint !== undefined ? rgbOf(new H.THREE.Color(def.tint)) : [0.55, 0.55, 0.55];
    const base = ta ? [col[0] * ta[0], col[1] * ta[1], col[2] * ta[2]] : col;
    const met = m.metalness || 0, kd = 1 - met * 0.5;   // 금속: 확산 대신 거울 반사지만, 주변을 물들이는 정도로 색의 절반
    let eD = [0, 0, 0], eA = [0, 0, 0];
    if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0) {
      const em = rgbOf(m.emissive), ea = m.emissiveMap ? (texAvg(m.emissiveMap, avgs) || ta || [0.6, 0.6, 0.6]) : [1, 1, 1], lf = liftOf.get(m);
      const iD = lf ? lf[0] : (m.emissiveIntensity || 0), iA = lf ? lf[1] : (m.emissiveIntensity || 0);
      eD = [em[0] * ea[0] * iD, em[1] * ea[1] * iD, em[2] * ea[2] * iD]; eA = [em[0] * ea[0] * iA, em[1] * ea[1] * iA, em[2] * ea[2] * iA];
    }
    return { base: base.map((v) => v * kd), eD, eA, ek: m.envMapIntensity === undefined ? 1 : m.envMapIntensity, vc: !!m.vertexColors };
  }
  function addTri(q, nx, ny, nz, ds, a, info) {
    const l = Math.hypot(nx, ny, nz); if (l < 1e-9) return;
    tris.push(...q); fn.push(nx / l, ny / l, nz / l); two.push(ds ? 1 : 0);
    alb.push(Math.min(0.95, a[0]), Math.min(0.95, a[1]), Math.min(0.95, a[2])); emD.push(...info.eD); emA.push(...info.eA); envk.push(info.ek);
  }
  const targets = [];
  items.forEach((it) => {
    const m = it.material;
    if (it.ao) targets.push({ name: it.name, P: it.batch.p, N: it.batch.n });
    if (SKIP.has(it.name) || (m && (m.transparent || m.depthWrite === false))) return;
    const info = matInfo(m, defOf.get(it.name)), P = it.batch.p, N = it.batch.n, C = it.batch.c, ds = m && m.side === 2;
    for (let i = 0; i + 8 < P.length; i += 9) {
      let a = info.base;
      if (info.vc && C && C.length >= i + 9) a = [a[0] * (C[i] + C[i + 3] + C[i + 6]) / 3, a[1] * (C[i + 1] + C[i + 4] + C[i + 7]) / 3, a[2] * (C[i + 2] + C[i + 5] + C[i + 8]) / 3];
      addTri([P[i], P[i + 1], P[i + 2], P[i + 3], P[i + 4], P[i + 5], P[i + 6], P[i + 7], P[i + 8]], N[i] + N[i + 3] + N[i + 6], N[i + 1] + N[i + 4] + N[i + 7], N[i + 2] + N[i + 5] + N[i + 8], ds, a, info);
    }
  });
  const root = c.ctx.root; root.updateMatrixWorld(true);
  const THREE = c.ctx.THREE, M = new THREE.Matrix4(), IM = new THREE.Matrix4(), v = new THREE.Vector3(), nm = new THREE.Matrix3();
  root.traverseVisible((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || m.transparent || m.depthWrite === false || m.visible === false || m.blending === 2) return;
    const g = o.geometry, pos = g.attributes.position, nor = g.attributes.normal, col = m.vertexColors ? g.attributes.color : null, ix = g.index, n = ix ? ix.count : pos.count;
    const inst = o.isInstancedMesh ? o.count : 1, info = matInfo(m, null);
    for (let k = 0; k < inst; k++) {
      M.copy(o.matrixWorld);
      if (o.isInstancedMesh) { o.getMatrixAt(k, IM); if (Math.abs(IM.determinant()) < 1e-12) continue; M.multiply(IM); }
      nm.getNormalMatrix(M);
      const sideFlip = m.side === 1 ? -1 : 1;
      for (let t = 0; t + 2 < n; t += 3) {
        const q = [];
        let nx = 0, ny = 0, nz = 0, cr = 0, cg = 0, cb = 0;
        for (let j = 0; j < 3; j++) {
          const vi = ix ? ix.getX(t + j) : t + j;
          v.fromBufferAttribute(pos, vi).applyMatrix4(M); q.push(v.x, v.y, v.z);
          if (nor) { v.fromBufferAttribute(nor, vi).applyMatrix3(nm); nx += v.x; ny += v.y; nz += v.z; }
          if (col) { cr += col.getX(vi) / 3; cg += col.getY(vi) / 3; cb += col.getZ(vi) / 3; }
        }
        if (!nor) {
          const e1 = [q[3] - q[0], q[4] - q[1], q[5] - q[2]], e2 = [q[6] - q[0], q[7] - q[1], q[8] - q[2]];
          nx = e1[1] * e2[2] - e1[2] * e2[1]; ny = e1[2] * e2[0] - e1[0] * e2[2]; nz = e1[0] * e2[1] - e1[1] * e2[0];
        }
        const a = col ? [info.base[0] * cr, info.base[1] * cg, info.base[2] * cb] : info.base;
        addTri(q, nx * sideFlip, ny * sideFlip, nz * sideFlip, m.side === 2, a, info);
      }
    }
  });
  return { tris: new Float32Array(tris), fn: new Float32Array(fn), two: new Uint8Array(two), alb: new Float32Array(alb), emD: new Float32Array(emD), emA: new Float32Array(emA), envk: new Float32Array(envk), targets };
}

/* */
export function lampsOf(c, H, R) {
  const S = c.ctx._, out = [], col = new H.THREE.Color();
  const push = (x, y, z, hex, I, range, soft, virt) => {
    col.setHex(hex === undefined ? 0xffc27a : hex);
    const r = col.r * I, g = col.g * I, b = col.b * I, lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum > 1e-6) out.push(x, y, z, r, g, b, lum, range, soft, virt ? 1 : 0);
  };
  S.lights.forEach((sl) => push(sl.x, sl.y, sl.z, sl.color, (sl.intensity || 1) * 22 * (sl.kind === 'always' ? 1 : R.lamp), (sl.distance || 14) * 1.2, 0.5, false));
  // 여러 층 룩(world.js levelLook)의 층별 점광원: 앱은 보는 층의 것 하나만 켜지만, 그 층 점들은 늘 그 층 빛을 받으므로 전부 넣는다(빌더 점광원과 같은 자리는 한 번만)
  const LL = (c.builder && c.builder.levelLook) || [];
  LL.forEach((L) => { const sl = L.light; if (!sl || S.lights.some((q) => q.x === sl.x && q.y === sl.y && q.z === sl.z)) return; push(sl.x, sl.y, sl.z, sl.color, (sl.intensity || 1) * 22 * (sl.kind === 'always' ? 1 : R.lamp), (sl.distance || 14) * 1.2, 0.5, false); });
  S.glows.forEach((g) => { if (g.kind === 'none') return; const p = g.sp.position, s = g.size || 1.5; push(p.x, p.y, p.z, g.sp.material && g.sp.material.color ? g.sp.material.color.getHex() : 0xffc977, 5 * s * s * (g.kind === 'always' ? 1 : R.lamp), 6 + s * 4, 0.6, true); });
  return new Float64Array(out);
}

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** 한 장면을 굽는다 → { text(gi_<id>.js 내용), stats, data } */
export async function bakeRoom(c, H, o = {}) {
  const t0 = Date.now();
  const rays = o.rays || GI.rays, cell = o.cell || GI.cell, KEY = GI.key;
  const R = refEnv(c.id);
  const col = collectGI(c, H);
  const bvh = buildBVH(col.tris, col.fn, col.two);
  const lamps = lampsOf(c, H, R);
  const sc = { alb: col.alb, emD: col.emD, emA: col.emA, envk: col.envk, lamps, env: { sun: R.sun, sunE: R.sunE, moon: R.moon, moonE: R.moonE, hsD: R.hsD, hgD: R.hgD, iblD: R.iblD, skyD: R.skyD, hsA: R.hsA, hgA: R.hgA, iblA: R.iblA, skyA: R.skyA } };
  // 정점 점: 같은 자리(25cm)·같은 방향(약 15°)은 한 번만 잰다. 넓이 가중치(평균용) = 닿은 삼각형 넓이의 1/3
  const keyIdx = new Map(), uniq = [], area = [], vref = [], bigA = [];
  col.targets.forEach((tg) => {
    const P = tg.P, N = tg.N, n = P.length / 3, ref = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const k = recvKey(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], N[i * 3], N[i * 3 + 1], N[i * 3 + 2]);   // 열쇠는 배치 법선 그대로(앱과 같게)
      let nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2]; const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l;
      let u = keyIdx.get(k);
      if (u === undefined) { u = uniq.length / 6; keyIdx.set(k, u); uniq.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], nx, ny, nz); area.push(0); bigA.push(0); }
      ref[i] = u;
    }
    for (let i = 0; i + 8 < P.length; i += 9) {
      const ax = P[i + 3] - P[i], ay = P[i + 4] - P[i + 1], az = P[i + 5] - P[i + 2], bx = P[i + 6] - P[i], by = P[i + 7] - P[i + 1], bz = P[i + 8] - P[i + 2];
      const a3 = 0.5 * Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / 3;
      area[ref[i / 3]] += a3; area[ref[i / 3 + 1]] += a3; area[ref[i / 3 + 2]] += a3;
      for (let q = 0; q < 3; q++) if (a3 * 3 > bigA[ref[i / 3 + q]]) bigA[ref[i / 3 + q]] = a3 * 3;
    }
    vref.push(ref);
  });
  const NU = uniq.length / 6;
  // 바닥 격자: 1차 AO 바닥 지도와 같은 방법으로 걷는 바닥 높이의 위쪽 면을 찾는다
  const L = c.layout, b = L.bounds, logic = H.Logic.create(L, { colliders: c.colliders, zones: c.zones });
  const fx0 = b.x0 - cell, fz0 = b.z0 - cell, FW = Math.ceil((b.x1 - b.x0) / cell) + 2, FH = Math.ceil((b.z1 - b.z0) / cell) + 2;
  const trace = makeTracer(bvh), fh = new Float32Array(FW * FH).fill(NaN), fpts = [], fidx = [];
  for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) {
    const x = fx0 + (i + 0.5) * cell, z = fz0 + (j + 0.5) * cell;
    let y0 = 0; try { y0 = logic.floorY(x, z) || 0; } catch (e) { y0 = 0; }
    let t = trace(x, y0 + 0.06, z, 0, -1, 0, 0, 0.14, null), top = y0 + 0.06;
    if (t < 0) { top = y0 + 1.2; t = trace(x, top, z, 0, -1, 0, 0, 1.3, null); }
    if (t < 0) continue;
    fh[j * FW + i] = top - t; fpts.push(x, top - t, z, 0, 1, 0); fidx.push(j * FW + i);
  }
  const all = new Float64Array(uniq.length + fpts.length); all.set(uniq, 0); all.set(fpts, uniq.length);
  const tT = Date.now();
  // 개발용 GI_CACHE=<폴더>: 광선 추적 결과를 저장해 두고(같은 점 수·광선 수면) 다시 쓴다 — 뒤처리(누르기·평균)만 고칠 때 빨리 다시 굽는다
  let res = null;
  const cf = process.env.GI_CACHE ? path.join(process.env.GI_CACHE, c.id + '_' + rays + '_' + all.length + '.f32') : null;
  if (cf && fs.existsSync(cf)) res = new Float32Array(new Uint8Array(fs.readFileSync(cf)).buffer);
  if (!res) { res = await traceAll(bvh, sc, all, { rays, workers: o.workers }); if (cf) { fs.mkdirSync(process.env.GI_CACHE, { recursive: true }); fs.writeFileSync(cf, Buffer.from(res.buffer)); } }
  const traceMs = Date.now() - tT;
  if (o.debug) return { res, uniq, NU, area, fpts, col, bvh, R, lamps };
  // ---- 이웃 평균(서로 보이는 같은 방향 이웃만) + 물체 속 점 메우기 ----
  const BUR = 0.7, fR = GI.fR, cellOf = (x) => Math.floor(x / fR);
  const grid = new Map();
  for (let u = 0; u < NU; u++) { const k = cellOf(uniq[u * 6]) + ',' + cellOf(uniq[u * 6 + 1]) + ',' + cellOf(uniq[u * 6 + 2]); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(u); }
  const V = new Float64Array(NU * 6), bur = new Uint8Array(NU), bh = [0, -1];
  for (let u = 0; u < NU; u++) bur[u] = res[u * 8 + 6] > BUR ? 1 : 0;
  const seesEach = (u, w) => {
    const ax = uniq[u * 6] + uniq[u * 6 + 3] * 0.04, ay = uniq[u * 6 + 1] + uniq[u * 6 + 4] * 0.04, az = uniq[u * 6 + 2] + uniq[u * 6 + 5] * 0.04;
    const bx = uniq[w * 6] + uniq[w * 6 + 3] * 0.04, by = uniq[w * 6 + 1] + uniq[w * 6 + 4] * 0.04, bz = uniq[w * 6 + 2] + uniq[w * 6 + 5] * 0.04;
    const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz);
    if (d < 1e-4) return true;
    const t = trace(ax, ay, az, dx / d, dy / d, dz / d, 0.0, d, bh);
    return t < 0 && !(bh[0] < d);
  };
  for (let u = 0; u < NU; u++) {
    const px = uniq[u * 6], py = uniq[u * 6 + 1], pz = uniq[u * 6 + 2], nx = uniq[u * 6 + 3], ny = uniq[u * 6 + 4], nz = uniq[u * 6 + 5];
    const cx = cellOf(px), cy = cellOf(py), cz = cellOf(pz), buried = bur[u];
    const acc = [0, 0, 0, 0, 0, 0]; let ws = 0, taken = 0;
    if (!buried) { for (let j = 0; j < 6; j++) acc[j] = res[u * 8 + j]; ws = 1; }
    for (let dx = -1; dx <= 1 && taken < GI.fMax; dx++) for (let dy = -1; dy <= 1 && taken < GI.fMax; dy++) for (let dz = -1; dz <= 1 && taken < GI.fMax; dz++) {
      const a = grid.get((cx + dx) + ',' + (cy + dy) + ',' + (cz + dz)); if (!a) continue;
      for (let q = 0; q < a.length && taken < GI.fMax; q++) {
        const w = a[q]; if (w === u || bur[w]) continue;
        const ex = uniq[w * 6] - px, ey = uniq[w * 6 + 1] - py, ez = uniq[w * 6 + 2] - pz, d = Math.hypot(ex, ey, ez);
        if (d > fR) continue;
        const nd = nx * uniq[w * 6 + 3] + ny * uniq[w * 6 + 4] + nz * uniq[w * 6 + 5];
        if (!buried && nd < 0.8) continue;
        if (!buried && !seesEach(u, w)) continue;
        const wt = (1 - d / fR) * (1 - d / fR) * (buried ? 1 : nd);
        for (let j = 0; j < 6; j++) acc[j] += res[w * 8 + j] * wt;
        ws += wt; taken++;
      }
    }
    if (ws > 0) { for (let j = 0; j < 6; j++) V[u * 6 + j] = acc[j] / ws; } else { bur[u] = 2; }   // 2 = 값 없음(중립 1)
  }
  // 바닥 칸: 3×3 이웃 중 높이가 같고(±8cm) 서로 보이는 칸만 섞는다(벽 밑동 너머로 번지지 않게)
  const NF = fidx.length, FV = new Float64Array(NF * 6), fval = new Int32Array(FW * FH).fill(-1);
  fidx.forEach((ci, k) => { if (res[(NU + k) * 8 + 6] <= BUR) fval[ci] = k; });
  for (let k = 0; k < NF; k++) {
    const ci = fidx[k], i = ci % FW, j = (ci - i) / FW, acc = [0, 0, 0, 0, 0, 0]; let ws = 0;
    const self = fval[ci] >= 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= FW || jj >= FH) continue;
      const q = fval[jj * FW + ii]; if (q < 0) continue;
      if (Math.abs(fh[jj * FW + ii] - fh[ci]) > 0.08) continue;
      if (di || dj) {
        const ax = fx0 + (i + 0.5) * cell, az = fz0 + (j + 0.5) * cell, bx = fx0 + (ii + 0.5) * cell, bz = fz0 + (jj + 0.5) * cell, y = fh[ci] + 0.12, d = Math.hypot(bx - ax, bz - az);
        const t = trace(ax, y, az, (bx - ax) / d, 0, (bz - az) / d, 0, d, bh); if (t >= 0 || bh[0] < d) continue;
      }
      const wt = (di ? 0.5 : 1) * (dj ? 0.5 : 1) * (self || di || dj ? 1 : 0);
      for (let m = 0; m < 6; m++) acc[m] += res[(NU + q) * 8 + m] * wt;
      ws += wt;
    }
    if (ws > 0) for (let m = 0; m < 6; m++) FV[k * 6 + m] = acc[m] / ws; else FV[k * 6] = NaN;
  }
  // ---- 장면 평균(넓이 가중, 실내·묻히지 않은 점만) → 비 → 로그 영역 누르기 → 평균 휘도 1 ----
  // 하늘이 반 넘게 보이는 점(지붕 윗면·바깥 벽·창 속 턱)은 실내에서 보이지 않거나 창빛 그 자체 → 중립(1)으로 둔다. 평균에는 1 로 넣는다.
  const inside = (u) => { const x = uniq[u * 6], z = uniq[u * 6 + 2]; return x > b.x0 - 0.35 && x < b.x1 + 0.35 && z > b.z0 - 0.35 && z < b.z1 + 0.35; };
  for (let u = 0; u < NU; u++) if (res[u * 8 + 7] >= 0.5) bur[u] = 2;
  const wts = new Float64Array(NU); let wsum = 0, wm = 0;
  for (let u = 0; u < NU; u++) { wts[u] = inside(u) ? area[u] : 0; wsum += wts[u]; }
  const mean = [0, 0, 0, 0, 0, 0];
  for (let u = 0; u < NU; u++) if (wts[u] && bur[u] !== 2) { for (let j = 0; j < 6; j++) mean[j] += V[u * 6 + j] * wts[u]; wm += wts[u]; }
  for (let j = 0; j < 6; j++) mean[j] = Math.max(1e-6, mean[j] / Math.max(1e-9, wm));
  // 비(로그): 낮 RGB 3개 + 밤 휘도 1개
  const RV = new Float64Array(NU * 4), RF = new Float64Array(NF * 4);
  const raw4 = (x, xo, out, oo) => {
    for (let j = 0; j < 3; j++) out[oo + j] = Math.log2(Math.max(1e-4, x[xo + j] / mean[j]));
    out[oo + 3] = Math.log2(Math.max(1e-4, lum(x[xo + 3] / mean[3], x[xo + 4] / mean[4], x[xo + 5] / mean[5])));
  };
  for (let u = 0; u < NU; u++) if (bur[u] !== 2) raw4(V, u * 6, RV, u * 4);
  for (let k = 0; k < NF; k++) if (!Number.isNaN(FV[k * 6])) raw4(FV, k * 6, RF, k * 4);
  // 넓은 둘레(약 7.5m)의 평균을 빼서 '곳마다의 차이'만 남긴다: 장면 전체 평균으로만 맞추면 잘 보이는 신랑이 통째로 어두워지거나
  // (안 보이는 높은 궁륭·지붕 밑이 평균을 끌어올려서) 등불 둘레가 통째로 밝아진다 → 화면 밝기가 바뀐다. 방향 갈래(위·옆·아래·바닥)마다 따로.
  const clsOf = (u) => (uniq[u * 6 + 4] > 0.7 ? 0 : (uniq[u * 6 + 4] < -0.7 ? 2 : 1));
  const fw = new Float64Array(NF);
  // 그 칸까지 평균에 넣으면 보이는 통로 바닥이 통째로 밝아진다)
  for (let k = 0; k < NF; k++) {
    const x = fpts[k * 6], y = fpts[k * 6 + 1], z = fpts[k * 6 + 2];
    fw[k] = !Number.isNaN(FV[k * 6]) && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && trace(x, y + 0.05, z, 0, 1, 0, 0.01, 1.2, null) < 0 ? 1 : 0;
  }
  const GC = GI.refCell, gx0 = b.x0 - 2 * GC, gz0 = b.z0 - 2 * GC;
  let gy0 = Infinity, gy1 = -Infinity; for (let u = 0; u < NU; u++) { const y = uniq[u * 6 + 1]; if (y < gy0) gy0 = y; if (y > gy1) gy1 = y; }
  gy0 -= GC;
  const GX = Math.ceil((b.x1 - b.x0) / GC) + 4, GZ = Math.ceil((b.z1 - b.z0) / GC) + 4, GY = Math.ceil((gy1 - gy0) / GC) + 2, GN = GX * GY * GZ;
  const gS = new Float64Array(4 * GN * 5);   // 갈래 4 × 칸 × (값 4 + 무게)
  const gIdx = (x, y, z) => { const i = Math.max(0, Math.min(GX - 1, Math.floor((x - gx0) / GC))), j = Math.max(0, Math.min(GY - 1, Math.floor((y - gy0) / GC))), k = Math.max(0, Math.min(GZ - 1, Math.floor((z - gz0) / GC))); return (k * GY + j) * GX + i; };
  const addG = (cl, x, y, z, arr, o2, w) => { const c = (cl * GN + gIdx(x, y, z)) * 5; for (let j = 0; j < 4; j++) gS[c + j] += arr[o2 + j] * w; gS[c + 4] += w; };
  for (let u = 0; u < NU; u++) if (wts[u] && bur[u] !== 2) addG(clsOf(u), uniq[u * 6], uniq[u * 6 + 1], uniq[u * 6 + 2], RV, u * 4, wts[u]);
  for (let k = 0; k < NF; k++) if (fw[k]) addG(3, fpts[k * 6], fpts[k * 6 + 1], fpts[k * 6 + 2], RF, k * 4, fw[k]);
  const gB = new Float64Array(gS.length);   // 3×3×3 상자 흐림
  for (let cl = 0; cl < 4; cl++) for (let k = 0; k < GZ; k++) for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    const o2 = (cl * GN + (k * GY + j) * GX + i) * 5;
    for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = i + di, jj = j + dj, kk = k + dk; if (ii < 0 || jj < 0 || kk < 0 || ii >= GX || jj >= GY || kk >= GZ) continue;
      const q = (cl * GN + (kk * GY + jj) * GX + ii) * 5; for (let m = 0; m < 5; m++) gB[o2 + m] += gS[q + m];
    }
  }
  const ref = (cl, x, y, z, out) => {   // 칸 중심 사이 삼선형 보간(무게 있는 칸만)
    const fx = (x - gx0) / GC - 0.5, fy = (y - gy0) / GC - 0.5, fz = (z - gz0) / GC - 0.5, i0 = Math.floor(fx), j0 = Math.floor(fy), k0 = Math.floor(fz);
    const acc = [0, 0, 0, 0]; let ws = 0;
    for (let dk = 0; dk < 2; dk++) for (let dj = 0; dj < 2; dj++) for (let di = 0; di < 2; di++) {
      const ii = Math.max(0, Math.min(GX - 1, i0 + di)), jj = Math.max(0, Math.min(GY - 1, j0 + dj)), kk = Math.max(0, Math.min(GZ - 1, k0 + dk));
      const q = (cl * GN + (kk * GY + jj) * GX + ii) * 5; if (gB[q + 4] <= 0) continue;
      const w = (di ? fx - i0 : 1 - (fx - i0)) * (dj ? fy - j0 : 1 - (fy - j0)) * (dk ? fz - k0 : 1 - (fz - k0)) + 1e-6;
      for (let m = 0; m < 4; m++) acc[m] += gB[q + m] / gB[q + 4] * w; ws += w;
    }
    for (let m = 0; m < 4; m++) out[m] = ws > 0 ? acc[m] / ws : 0;
  };
  // 둘레 평균을 빼고 로그 영역에서 누른다: 휘도 γ·상한, 색(채널 - 휘도) γ·상한, 밤 휘도 γ·상한
  const r4 = [0, 0, 0, 0];
  const comp = (arr, o2, cl, x, y, z, out, oo) => {
    ref(cl, x, y, z, r4);
    const d0 = arr[o2] - r4[0], d1 = arr[o2 + 1] - r4[1], d2 = arr[o2 + 2] - r4[2], dn = arr[o2 + 3] - r4[3];
    const Y = Math.log2(Math.max(1e-4, lum(2 ** d0, 2 ** d1, 2 ** d2))), Yc = Math.max(-GI.limD, Math.min(GI.lim, Y * GI.gamma));
    const cc = (v) => Math.max(-GI.limC, Math.min(GI.limC, (v - Y) * GI.gammaC));
    out[oo] = Yc + cc(d0); out[oo + 1] = Yc + cc(d1); out[oo + 2] = Yc + cc(d2);
    out[oo + 3] = out[oo + 4] = out[oo + 5] = Math.max(-GI.limND, Math.min(GI.limN, dn * GI.gammaN));   // 밤: 휘도만(색은 앱이 낮 색 + 등불 색조로)
  };
  const LV = new Float64Array(NU * 6), LF = new Float64Array(NF * 6);
  for (let u = 0; u < NU; u++) if (bur[u] !== 2) comp(RV, u * 4, clsOf(u), uniq[u * 6], uniq[u * 6 + 1], uniq[u * 6 + 2], LV, u * 6);
  for (let k = 0; k < NF; k++) if (!Number.isNaN(FV[k * 6])) comp(RF, k * 4, 3, fpts[k * 6], fpts[k * 6 + 1], fpts[k * 6 + 2], LF, k * 6);
  // 아주 큰 삼각형(8~20m² 넘는 바닥·천장·벽 한 장)의 꼭짓점 값은 몇 m 를 한 줄로 이어 버린다(방 구석의 값이 바닥 한가운데까지) → 중립 쪽으로.
  // 바닥은 바닥 격자가 따로 맡는다.
  for (let u = 0; u < NU; u++) { const f = Math.max(0, Math.min(1, (bigA[u] - 8) / 12)); if (f > 0) for (let j = 0; j < 6; j++) LV[u * 6 + j] *= 1 - f; }
  // 넓이 가중 평균을 1 로: 낮은 채널마다(로그 이동), 밤은 휘도만(밤 색은 낮 색 + 등불 색조, gi_fx.js). 상한 때문에 3번 되풀이.
  // 방향 갈래(위를 보는 면·옆면·아래를 보는 면·바닥 격자)마다 따로 맞춘다: 위·아래 차이는 앱의 반구광(하늘·땅 색)이 이미 그린다 →
  // 빛 번짐은 '같은 방향의 면끼리'의 곳마다 차이만 더한다(바닥이 화면 대부분인 시점에서 전체 밝기가 바뀌지 않게).
  const nY = (arr, o2) => Math.log2(Math.max(1e-4, lum(2 ** arr[o2 + 3], 2 ** arr[o2 + 4], 2 ** arr[o2 + 5])));
  const C4 = (arr, o2, sh, out, oo) => { for (let j = 0; j < 3; j++) out[oo + j] = arr[o2 + j] + sh[j]; out[oo + 3] = nY(arr, o2) + sh[3]; };
  const shifts = [0, 1, 2, 3].map(() => [0, 0, 0, 0]), t4 = [0, 0, 0, 0];
  for (let it = 0; it < 3; it++) {
    const m2 = shifts.map(() => [0, 0, 0, 0, 0]);
    const acc = (cl, arr, o2, w) => { C4(arr, o2, shifts[cl], t4, 0); for (let j = 0; j < 4; j++) m2[cl][j] += Math.pow(2, Math.max(-3.9, Math.min(3.9, t4[j]))) * w; m2[cl][4] += w; };
    for (let u = 0; u < NU; u++) if (wts[u]) { if (bur[u] === 2) { const m = m2[clsOf(u)]; for (let j = 0; j < 4; j++) m[j] += wts[u]; m[4] += wts[u]; } else acc(clsOf(u), LV, u * 6, wts[u]); }
    for (let k = 0; k < NF; k++) if (fw[k]) acc(3, LF, k * 6, fw[k]);
    for (let cl = 0; cl < 4; cl++) if (m2[cl][4] > 0) for (let j = 0; j < 4; j++) shifts[cl][j] -= Math.log2(m2[cl][j] / m2[cl][4]);
  }
  const Q = GI.q, qz = (lg) => Math.max(0, Math.min(255, Math.round(128 + lg * Q)));
  // 점 값(처음 나온 순서 = 앱이 정점을 훑으며 같은 열쇠로 번호를 매기는 순서) → 평면 4개(낮 G, (R-G)/2, (B-G)/2, 밤 휘도/2) → deflate
  let nV = 0; vref.forEach((r) => { nV += r.length; });
  const uq = new Uint8Array(NU * 4).fill(128);
  // 색(R-G, B-G)과 밤 휘도는 2단계 간격(1/16단)으로: 색 변화는 은은하고, 밤(등불)은 낮보다 완만하다 — 자료 크기의 큰 몫
  const qc = (q4, o2) => { const g = q4[o2 + 1]; for (const j of [0, 2]) q4[o2 + j] = Math.max(0, Math.min(255, g + 2 * Math.round((q4[o2 + j] - g) / 2))); q4[o2 + 3] = Math.min(254, 2 * Math.round(q4[o2 + 3] / 2)); };
  for (let u = 0; u < NU; u++) { if (bur[u] === 2) continue; C4(LV, u * 6, shifts[clsOf(u)], t4, 0); for (let j = 0; j < 4; j++) uq[u * 4 + j] = qz(t4[j]); qc(uq, u * 4); }
  const toPlanes = (q4, n) => {
    const P4 = Array.from({ length: 4 }, () => new Uint8Array(n));
    for (let i = 0; i < n; i++) { const g = q4[i * 4 + 1]; P4[0][i] = g; P4[1][i] = (((q4[i * 4] - g) >> 1) + 256) & 255; P4[2][i] = (((q4[i * 4 + 2] - g) >> 1) + 256) & 255; P4[3][i] = q4[i * 4 + 3] >> 1; }
    return P4;
  };
  const planesV = toPlanes(uq, NU);
  const entries = col.targets.map((tg, k) => ({ name: tg.name, n: vref[k].length, s: checksum(tg.P) }));
  // 바닥: 값 없는 칸은 이웃(최대 6번 넓힘)으로 메우고, 그래도 없으면 중립
  const fq = new Uint8Array(FW * FH * 4).fill(128), fset = new Uint8Array(FW * FH);
  fidx.forEach((ci, k) => { if (Number.isNaN(FV[k * 6])) return; C4(LF, k * 6, shifts[3], t4, 0); for (let j = 0; j < 4; j++) fq[ci * 4 + j] = qz(t4[j]); qc(fq, ci * 4); fset[ci] = 1; });
  for (let pass = 0; pass < 6; pass++) {
    const add = [];
    for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) {
      const ci = j * FW + i; if (fset[ci]) continue;
      const sm = [0, 0, 0, 0]; let w = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= FW || jj >= FH) continue; const q = jj * FW + ii; if (!fset[q]) continue; for (let m = 0; m < 4; m++) sm[m] += fq[q * 4 + m]; w++; }
      if (w) add.push([ci, sm.map((v) => Math.round(v / w))]);
    }
    add.forEach(([ci, sm]) => { for (let m = 0; m < 4; m++) fq[ci * 4 + m] = sm[m]; fset[ci] = 1; });
  }
  const planesF = toPlanes(fq, FW * FH);
  const delta = (a) => { const o2 = new Uint8Array(a.length); let prev = 128; for (let i = 0; i < a.length; i++) { o2[i] = (a[i] - prev + 256) & 255; prev = a[i]; } return o2; };
  const raw = Buffer.concat([...planesV, ...planesF.map(delta)]);   // 점 평면은 그대로(이웃 점끼리 이어지지 않아 차분이 오히려 크다), 바닥 격자는 차분
  const z = zlib.deflateRawSync(raw, { level: 9, memLevel: 9 }).toString('base64');
  // 밤 세기 배율: 밤 간접광(평균 조도)이 낮보다 약하면 변화도 덜(최소 0.35) — 밤에 번짐이 빛나 보이지 않게
  const mD = lum(mean[0], mean[1], mean[2]), mA = lum(mean[3], mean[4], mean[5]);
  const nk = +Math.max(0.35, Math.min(0.8, Math.sqrt(mA / mD))).toFixed(3);
  // 등불 색조(밤에 평균보다 밝은 곳을 이 색 쪽으로 조금): 등불 세기 가중 평균 색, 휘도 1
  let lt = [0, 0, 0];
  for (let l = 0; l < lamps.length; l += LS) { lt[0] += lamps[l + 3]; lt[1] += lamps[l + 4]; lt[2] += lamps[l + 5]; }
  const ltl = lum(lt[0], lt[1], lt[2]); lt = ltl > 0 ? lt.map((v) => +(v / ltl).toFixed(3)) : [1, 1, 1];
  // 확인용 통계: 넓이 가중 평균 휘도(복원값, 1 에 가까워야 한다)·변화 폭
  const dec = (q) => Math.pow(2, (q - 128) / Q);
  const st = [0, 0], lo = [Infinity, Infinity], hi = [0, 0];
  for (let u = 0; u < NU; u++) if (wts[u]) {
    const Yd = lum(dec(uq[u * 4]), dec(uq[u * 4 + 1]), dec(uq[u * 4 + 2])), Yn = dec(uq[u * 4 + 3]);
    [Yd, Yn].forEach((Y, s2) => { st[s2] += Y * wts[u]; if (Y < lo[s2]) lo[s2] = Y; if (Y > hi[s2]) hi[s2] = Y; });
  }
  const data = { v: GI.v, rays, q: Q, key: GI.key, b: entries, nR: NU, f: { x0: +fx0.toFixed(4), z0: +fz0.toFixed(4), cell, w: FW, h: FH }, nk, lt, mY: [+(st[0] / wsum).toFixed(4), +(st[1] / wsum).toFixed(4)], z };
  const text = '/* gi_' + c.id + '.js — tools/room_web/gi_bake.mjs 로 생성(직접 고치지 말 것). 미리 구운 빛 번짐(docs/room/RENDER_GI.md): 점(열쇠 순서)·바닥 격자의 낮 RGB 비 + 밤 휘도 비, 평면 차분 deflate-raw(base64). */\n' +
    '(window.RoomGIBake=window.RoomGIBake||{})[' + JSON.stringify(c.id) + ']=' + JSON.stringify(data) + ';\n';
  const stats = { id: c.id, tris: col.tris.length / 9, verts: nV, recv: NU, buried: bur.reduce((a2, v) => a2 + (v ? 1 : 0), 0), floor: FW + 'x' + FH, lamps: lamps.length / LS, bytes: text.length, mY: data.mY, range: [lo.map((v) => +v.toFixed(2)), hi.map((v) => +v.toFixed(2))], nk, traceMs, ms: Date.now() - t0 };
  return { text, stats, data };
}

/** gi_<id>.js 읽기 → 데이터(없으면 null) */
export function readGI(id, dir = ASSETS) {
  const f = path.join(dir, 'gi_' + id + '.js');
  if (!fs.existsSync(f)) return null;
  const sb = { window: {} }; vm.createContext(sb); vm.runInContext(fs.readFileSync(f, 'utf8'), sb);
  return sb.window.RoomGIBake[id];
}
/** 압축 덩어리를 풀어 평면 8개로(점 4 + 바닥 4, 앱 gi_fx.js 와 같은 식) */
export function unpack(d) {
  const raw = zlib.inflateRawSync(Buffer.from(d.z, 'base64')), F = d.f.w * d.f.h, out = [];
  let p = 0;
  for (let k = 0; k < 8; k++) {
    const n = k < 4 ? d.nR : F, a = new Uint8Array(n); let prev = 128;
    if (k < 4) { for (let i = 0; i < n; i++) a[i] = raw[p++]; } else for (let i = 0; i < n; i++) { prev = (prev + raw[p++]) & 255; a[i] = prev; }
    out.push(a);
  }
  return { planes: out, rest: raw.length - p };
}

/** 지금 빌더와 gi_<id>.js 가 맞는가: [{id, ok, why}] */
export function checkFresh(rooms) {
  return rooms.map((c) => {
    const data = readGI(c.id);
    if (!data) return { id: c.id, ok: false, why: 'no file' };
    if (data.v !== GI.v) return { id: c.id, ok: false, why: 'version ' + data.v };
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

export async function loadForGI(only) {
  const { loadRooms } = await import('./harness.mjs');
  return loadRooms({ quality: 'high', photos: true, aoDefer: true, only });
}

if (isMainThread && process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), ids = [], o = {};
  let check = false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--rays') o.rays = +a[++i]; else if (a[i] === '--workers') o.workers = +a[++i]; else if (a[i] === '--check') check = true; else ids.push(a[i]);
  }
  const H = await loadForGI(ids.length ? ids : null);
  const list = H.rooms.filter((c) => !ids.length || ids.includes(c.id));
  if (check) {
    const r = checkFresh(list);
    r.forEach((x) => console.log(x.ok ? 'ok   ' : 'STALE', x.id, x.why || ''));
    process.exit(r.every((x) => x.ok) ? 0 : 1);
  }
  const T0 = Date.now();
  for (const c of list) {
    const { text, stats } = await bakeRoom(c, H, o);
    fs.writeFileSync(path.join(ASSETS, 'gi_' + c.id + '.js'), text);
    console.log(JSON.stringify(stats));
  }
  console.log('total ' + ((Date.now() - T0) / 1000).toFixed(1) + 's');
}
