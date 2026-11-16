// 실물 성상 3D 스캔(SMK STL · Zenodo/스케치팹 GLB) → assets/church/scan3d_<key>.js (meshopt 압축 + 양자화, 디코더 동봉).
// 사용: node tools/statues/make_scan_pack.mjs [key ...]   (인자 없으면 scan_packs.json 전부)
//   원본: art/statue_handoff/received/ (저장소에 올리지 않음 — 메인 저장소 경로를 SCAN_SRC 로 바꿀 수 있다)
//   설정: tools/statues/scan_packs.json — 원본 파일·돌림(도)·높이(m)·근거리/원거리 삼각형·재질·출처 문구.
// 처리(meshy_decimate.mjs + make_statue_meshy_pack.mjs 와 같은 줄기):
//   1. 원본 읽기: STL(면마다 정점 3) 또는 GLB(노드 변환을 모두 곱해 월드 좌표로, 프리미티브 여럿을 하나로).
//      kind 'color' 면 바탕색 질감(KHR_materials_pbrSpecularGlossiness 의 diffuse 또는 baseColor)을 정점마다 뽑아 정점 색으로 굽는다(질감 없이 draw call 1).
//   2. 설정의 돌림(rot, 도, XYZ 순)으로 Y 위·앞 +Z 로 맞추고, 높이 h(m)로 줄이고, 바닥 y=0·가운데 x=z=0 으로 옮긴다.
//   3. 위치 용접 → 면적 가중 법선(단순화의 작은 가중에만 쓴다).
//   4. 근거리: meshopt simplifyWithUpdate(정점을 오차가 가장 작은 자리로 옮기며 접기, 법선 가중 0.05).
//      설정의 detail(얼굴 구)은 따로 detailShare 몫으로 단순화(경계 정점 잠금 → 틈 없음). 원거리: 근거리를 다시 단순화(정점 공유).
//      T-80 1차(전체를 고르게, 법선 가중 0.6, 원본 정점만 남김, 고해상도 법선을 그대로)는 얼굴을 각지고 뭉개지게 했다 — STATUE_SOURCES.md §8.
//   5. 위치 uint16(오차 ≤ 0.02mm, 로그) + (색 uint8 sRGB) → meshopt 압축 → base64. 법선은 싣지 않고 load() 가 근거리 메쉬에서
//      모서리 각 가중으로 다시 계산한다(단순화 뒤 메쉬와 맞는 음영). 뒤집힌 삼각형 수를 로그로 남긴다. 출처(meta.src)를 팩에 넣는다.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const require = createRequire(path.join(here, '../avatar_glb/package.json'));
const { MeshoptEncoder, MeshoptSimplifier, MeshoptDecoder } = await import(require.resolve('meshoptimizer'));
const { build } = await import(require.resolve('esbuild'));
const cfg = JSON.parse(fs.readFileSync(path.join(here, 'scan_packs.json'), 'utf8'));
const SRC = process.env.SCAN_SRC || [path.join(repo, 'art/statue_handoff/received'), '/home/user/rosary-app/art/statue_handoff/received'].find((d) => fs.existsSync(d));
const OUT = process.env.SCAN_OUT || path.join(repo, 'assets/church');
await MeshoptEncoder.ready; await MeshoptSimplifier.ready; await MeshoptDecoder.ready;

// ---------------------------------------------------------------- 읽기
function readStl(file) {
  const b = fs.readFileSync(file), nt = b.readUInt32LE(80);
  if (84 + nt * 50 !== b.length) throw new Error('ASCII STL 은 지원하지 않음: ' + file);
  const P = new Float32Array(nt * 9);
  for (let t = 0; t < nt; t++) for (let k = 0; k < 9; k++) P[t * 9 + k] = b.readFloatLE(84 + t * 50 + 12 + k * 4);
  const I = new Uint32Array(nt * 3); for (let i = 0; i < I.length; i++) I[i] = i;
  return { P, I, C: null };
}
async function readGlb(file, wantColor) {
  const { NodeIO } = await import(require.resolve('@gltf-transform/core'));
  const { ALL_EXTENSIONS } = await import(require.resolve('@gltf-transform/extensions'));
  const sharp = (await import(require.resolve('sharp'))).default;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS), doc = await io.read(file);
  const Ps = [], Is = [], Cs = [], imgCache = new Map();
  let base = 0;
  async function image(tex) {
    if (!tex) return null;
    if (imgCache.has(tex)) return imgCache.get(tex);
    const { data, info } = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const r = { data, w: info.width, h: info.height }; imgCache.set(tex, r); return r;
  }
  function sample(im, u, v) {   // 쌍선형, 반복 감싸기. glTF UV 는 왼쪽 위 원점.
    const x = (u - Math.floor(u)) * im.w - 0.5, y = (v - Math.floor(v)) * im.h - 0.5, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, o = [0, 0, 0];
    for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
      const xx = ((x0 + dx) % im.w + im.w) % im.w, yy = ((y0 + dy) % im.h + im.h) % im.h, p = (yy * im.w + xx) * 4;
      for (let k = 0; k < 3; k++) o[k] += im.data[p + k] * w;
    }
    return o;
  }
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const M = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pa = prim.getAttribute('POSITION'), n = pa.getCount(), v = [0, 0, 0];
      const P = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pa.getElement(i, v);
        P[i * 3] = M[0] * v[0] + M[4] * v[1] + M[8] * v[2] + M[12];
        P[i * 3 + 1] = M[1] * v[0] + M[5] * v[1] + M[9] * v[2] + M[13];
        P[i * 3 + 2] = M[2] * v[0] + M[6] * v[1] + M[10] * v[2] + M[14];
      }
      const ia = prim.getIndices(), I = new Uint32Array(ia ? ia.getCount() : n);
      for (let i = 0; i < I.length; i++) I[i] = (ia ? ia.getScalar(i) : i) + base;
      // 행렬식이 음수면(거울) 감기 순서를 뒤집는다
      const det = M[0] * (M[5] * M[10] - M[6] * M[9]) - M[4] * (M[1] * M[10] - M[2] * M[9]) + M[8] * (M[1] * M[6] - M[2] * M[5]);
      if (det < 0) for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; }
      Ps.push(P); Is.push(I);
      if (wantColor) {
        const mat = prim.getMaterial(), sg = mat && mat.getExtension('KHR_materials_pbrSpecularGlossiness');
        const tex = (sg && sg.getDiffuseTexture()) || (mat && mat.getBaseColorTexture()), f = (sg && sg.getDiffuseFactor()) || (mat && mat.getBaseColorFactor()) || [1, 1, 1, 1];
        const im = await image(tex), uv = prim.getAttribute('TEXCOORD_0'), C = new Float32Array(n * 3), t = [0, 0];
        for (let i = 0; i < n; i++) {
          let c = [255, 255, 255];
          if (im && uv) { uv.getElement(i, t); c = sample(im, t[0], t[1]); }
          for (let k = 0; k < 3; k++) C[i * 3 + k] = c[k] / 255 * f[k];   // sRGB 0..1(질감 값 그대로)
        }
        Cs.push(C);
      }
      base += n;
    }
  }
  const cat = (arr, T) => { const o = new T(arr.reduce((s, a) => s + a.length, 0)); let off = 0; for (const a of arr) { o.set(a, off); off += a.length; } return o; };
  return { P: cat(Ps, Float32Array), I: cat(Is, Uint32Array), C: wantColor ? cat(Cs, Float32Array) : null };
}

// ---------------------------------------------------------------- 기하 손질
function rotate(P, rot) {
  const [ax, ay, az] = (rot || [0, 0, 0]).map((d) => d * Math.PI / 180);
  const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
  for (let i = 0; i < P.length; i += 3) {
    let x = P[i], y = P[i + 1], z = P[i + 2], t;
    t = y * cx - z * sx; z = y * sx + z * cx; y = t;   // X
    t = x * cy + z * sy; z = -x * sy + z * cy; x = t;  // Y
    t = x * cz - y * sz; y = x * sz + y * cz; x = t;   // Z
    P[i] = x; P[i + 1] = y; P[i + 2] = z;
  }
}
function bbox(P) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { const v = P[i + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v; }
  return { mn, mx };
}
// 위치 용접 → 쓰는 정점만 남긴 압축 배열(색은 같은 자리 정점들의 평균), 퇴화 삼각형 제거
function weld(P, I, C) {
  const remap = MeshoptSimplifier.generatePositionRemap(P, 3), n = P.length / 3, id = new Int32Array(n).fill(-1);
  const used = new Uint8Array(n); for (let i = 0; i < I.length; i++) used[remap[I[i]]] = 1;
  let m = 0; for (let i = 0; i < n; i++) if (used[i] && remap[i] === i) id[i] = m++;
  const P2 = new Float32Array(m * 3), C2 = C ? new Float32Array(m * 3) : null, cnt = C ? new Float32Array(m) : null;
  for (let i = 0; i < n; i++) if (id[i] >= 0) P2.set(P.subarray(i * 3, i * 3 + 3), id[i] * 3);
  if (C) for (let i = 0; i < n; i++) { const j = id[remap[i]]; if (j < 0) continue; for (let k = 0; k < 3; k++) C2[j * 3 + k] += C[i * 3 + k]; cnt[j]++; }
  if (C) for (let j = 0; j < m; j++) for (let k = 0; k < 3; k++) C2[j * 3 + k] /= cnt[j] || 1;
  const out = [];
  for (let t = 0; t < I.length; t += 3) { const a = id[remap[I[t]]], b = id[remap[I[t + 1]]], c = id[remap[I[t + 2]]]; if (a !== b && b !== c && a !== c) out.push(a, b, c); }
  return { P: P2, I: Uint32Array.from(out), C: C2 };
}
function normals(P, I) {
  const N = new Float32Array(P.length);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;   // 길이 = 면적 × 2 → 면적 가중
    for (const v of [a, b, c]) { N[v] += nx; N[v + 1] += ny; N[v + 2] += nz; }
  }
  for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
  return N;
}
function compact(I, P, N, C) {   // 인덱스가 쓰는 정점만
  const map = new Int32Array(P.length / 3).fill(-1), vs = [], oi = new Uint32Array(I.length);
  for (let i = 0; i < I.length; i++) { const v = I[i]; if (map[v] < 0) { map[v] = vs.length; vs.push(v); } oi[i] = map[v]; }
  const pick = (A, k) => { if (!A) return null; const o = new Float32Array(vs.length * k); vs.forEach((v, j) => o.set(A.subarray(v * k, v * k + k), j * k)); return o; };
  return { I: oi, P: pick(P, 3), N: pick(N, 3), C: pick(C, 3) };
}

// 정점 법선: 모서리 각 가중(꼭짓점에서 삼각형이 이루는 각만큼) — 저폴리에서 길쭉한 삼각형이 음영을 끌고 가지 않는다.
// 단순화가 끝난 메쉬에서 다시 계산한다(고해상도 법선을 살아남은 정점에 그대로 두면, 정점이 옮겨지고 둘레가 넓어진 뒤라 면과 음영이 어긋나 얼굴이 얼룩진다).
function normalsAngle(P, I) {
  const N = new Float32Array(P.length), e = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let t = 0; t < I.length; t += 3) {
    const v = [I[t] * 3, I[t + 1] * 3, I[t + 2] * 3];
    const ux = P[v[1]] - P[v[0]], uy = P[v[1] + 1] - P[v[0] + 1], uz = P[v[1] + 2] - P[v[0] + 2], wx = P[v[2]] - P[v[0]], wy = P[v[2] + 1] - P[v[0] + 1], wz = P[v[2] + 2] - P[v[0] + 2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const nl = Math.hypot(nx, ny, nz); if (!nl) continue; nx /= nl; ny /= nl; nz /= nl;
    for (let c = 0; c < 3; c++) {
      const a = v[c], b = v[(c + 1) % 3], d = v[(c + 2) % 3];
      const x1 = P[b] - P[a], y1 = P[b + 1] - P[a + 1], z1 = P[b + 2] - P[a + 2], x2 = P[d] - P[a], y2 = P[d + 1] - P[a + 1], z2 = P[d + 2] - P[a + 2];
      const l = Math.hypot(x1, y1, z1) * Math.hypot(x2, y2, z2); if (!l) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, (x1 * x2 + y1 * y2 + z1 * z2) / l)));
      N[a] += nx * ang; N[a + 1] += ny * ang; N[a + 2] += nz * ang;
    }
  }
  for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
  return N;
}
// 근거리 단순화(T-80 2차): meshopt simplifyWithUpdate — 정점을 오차가 가장 작은 자리로 옮기며 접는다(원본 정점만 남기는 방식보다 얼굴·주름 모양이 덜 찌그러진다).
// 법선 가중은 아주 작게(NW): 크게 주면 스캔 잡음(작은 법선 요동)을 지키느라 모양 오차를 키운다 — 이전 0.6 에서 얼굴이 각지고 일그러진 까닭.
// e.detail(얼굴 등 [{c:[x,y,z], r}], 정규화된 좌표 m): 이 구 안의 삼각형은 따로, e.detailShare 몫의 삼각형으로 단순화한다(경계 정점은 잠가 두 부분이 틈 없이 맞물린다).
// 전체 단순화는 오차를 고르게 나눠 큰 옷 주름에 삼각형을 쓰고 작은 얼굴을 뭉갠다 — 얼굴은 몸 크기에 비해 작지만 보는 사람에게는 가장 중요하다.
const NW = 0.05, CW = 0.8;
function simplifyNear(e, w, color) {
  const nv = w.P.length / 3, nt = w.I.length / 3, k = color ? 6 : 3;
  const P = Float32Array.from(w.P), A = new Float32Array(nv * k), Nh = normals(w.P, w.I);
  for (let i = 0; i < nv; i++) { A.set(Nh.subarray(i * 3, i * 3 + 3), i * k); if (color) A.set(w.C.subarray(i * 3, i * 3 + 3), i * k + 3); }
  const wts = color ? [NW, NW, NW, CW, CW, CW] : [NW, NW, NW], regions = e.detail || [];
  const inR = (x, y, z) => regions.some((r) => (x - r.c[0]) ** 2 + (y - r.c[1]) ** 2 + (z - r.c[2]) ** 2 < r.r * r.r);
  const tag = new Uint8Array(nt);
  for (let t = 0; t < nt; t++) {
    const a = w.I[t * 3] * 3, b = w.I[t * 3 + 1] * 3, c = w.I[t * 3 + 2] * 3;
    tag[t] = regions.length && inR((P[a] + P[b] + P[c]) / 3, (P[a + 1] + P[b + 1] + P[c + 1]) / 3, (P[a + 2] + P[b + 2] + P[c + 2]) / 3) ? 1 : 0;
  }
  const seen = [new Uint8Array(nv), new Uint8Array(nv)];
  for (let t = 0; t < nt; t++) for (let j = 0; j < 3; j++) seen[tag[t]][w.I[t * 3 + j]] = 1;
  const lock = new Uint8Array(nv); for (let v = 0; v < nv; v++) lock[v] = seen[0][v] && seen[1][v] ? 1 : 0;
  const parts = [[], []]; for (let t = 0; t < nt; t++) parts[tag[t]].push(w.I[t * 3], w.I[t * 3 + 1], w.I[t * 3 + 2]);
  const dt = parts[1].length ? Math.min(parts[1].length / 3, Math.round(e.near * (e.detailShare || 0.25))) : 0;
  const out = [];
  for (const [j, tg] of [[1, dt], [0, e.near - dt]]) {
    if (!parts[j].length) continue;
    const ix = Uint32Array.from(parts[j]);
    const tc = Math.min(ix.length, Math.floor(tg) * 3);
    const [n, err] = MeshoptSimplifier.simplifyWithUpdate(ix, P, 3, A, k, wts, lock, tc, 0.05, regions.length ? ['Sparse'] : ['Prune']);
    out.push(ix.slice(0, n));
    console.log(`[${e.key}] ${j ? 'detail' : 'body'} tris`, ix.length / 3, '->', n / 3, 'err', err.toFixed(5));
  }
  const I = new Uint32Array(out.reduce((s, a) => s + a.length, 0)); let o = 0; for (const a of out) { I.set(a, o); o += a.length; }
  const r = compact(I, P, null, color ? (() => { const C = new Float32Array(nv * 3); for (let i = 0; i < nv; i++) C.set(A.subarray(i * k + 3, i * k + 6), i * 3); return C; })() : null);
  if (r.C) for (let i = 0; i < r.C.length; i++) r.C[i] = Math.max(0, Math.min(1, r.C[i]));
  r.N = normalsAngle(r.P, r.I);
  {   // 뒤집힌 삼각형(면 법선이 세 꼭짓점 법선 모두와 반대) — 단순화가 얇은 곳을 접어 생기는 틈·흰 점
    let flip = 0; const P2 = r.P, N2 = r.N, I2 = r.I;
    for (let t = 0; t < I2.length; t += 3) {
      const a = I2[t] * 3, b = I2[t + 1] * 3, c = I2[t + 2] * 3;
      const ux = P2[b] - P2[a], uy = P2[b + 1] - P2[a + 1], uz = P2[b + 2] - P2[a + 2], wx = P2[c] - P2[a], wy = P2[c + 1] - P2[a + 1], wz = P2[c + 2] - P2[a + 2];
      const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      if ([a, b, c].every((v) => nx * N2[v] + ny * N2[v + 1] + nz * N2[v + 2] < 0)) flip++;
    }
    r.flips = flip;
    console.log(`[${e.key}] flipped tris`, flip);
  }
  return r;
}

// ---------------------------------------------------------------- 팩
let decoderJs = null;
async function decoder() {
  if (decoderJs) return decoderJs;
  const dec = await build({ stdin: { contents: "export { MeshoptDecoder } from 'meshoptimizer/decoder';", resolveDir: path.join(here, '../avatar_glb'), loader: 'js' }, bundle: true, format: 'iife', globalName: 'MD', minify: true, target: 'es2019', write: false, legalComments: 'none' });
  return (decoderJs = dec.outputFiles[0].text.trim());
}
async function makePack(e) {
  const t0 = Date.now(), file = path.join(SRC, e.src), color = e.kind === 'color';
  let m = e.src.endsWith('.stl') ? readStl(file) : await readGlb(file, color);
  console.log(`[${e.key}] read`, e.src, 'tris', m.I.length / 3);
  rotate(m.P, e.rot);
  let w = weld(m.P, m.I, m.C);
  // 크기·자리: 높이 h(m), 바닥 y=0, 경계상자 가운데 x=z=0(+ 설정 offset)
  let bb = bbox(w.P); const s = e.h / (bb.mx[1] - bb.mn[1]), off = e.offset || [0, 0];
  const cx = (bb.mn[0] + bb.mx[0]) / 2, cz = (bb.mn[2] + bb.mx[2]) / 2;
  for (let i = 0; i < w.P.length; i += 3) { w.P[i] = (w.P[i] - cx) * s + off[0]; w.P[i + 1] = (w.P[i + 1] - bb.mn[1]) * s; w.P[i + 2] = (w.P[i + 2] - cz) * s + off[1]; }
  console.log(`[${e.key}] welded verts`, w.P.length / 3, 'tris', w.I.length / 3);
  const near = simplifyNear(e, w, color);
  // 원거리: 근거리를 다시 단순화(정점은 옮기지 않는다 — 정점 버퍼를 함께 쓴다)
  const k = color ? 6 : 3, Ak = new Float32Array((near.P.length / 3) * k);
  for (let i = 0; i < near.P.length / 3; i++) { Ak.set(near.N.subarray(i * 3, i * 3 + 3), i * k); if (color) Ak.set(near.C.subarray(i * 3, i * 3 + 3), i * k + 3); }
  const [farI, errF] = MeshoptSimplifier.simplifyWithAttributes(near.I, near.P, 3, Ak, k, color ? [NW, NW, NW, CW, CW, CW] : [NW, NW, NW], null, Math.floor(e.far * 3), 0.1, ['Prune']);
  console.log(`[${e.key}] near tris`, near.I.length / 3, 'far tris', farI.length / 3, 'err', errF.toFixed(5));
  // 캐시 순서 + 정점 재배열(두 인덱스 같은 리맵)
  const nv = near.P.length / 3, ri = Uint32Array.from(near.I);
  const [remap, nu] = MeshoptEncoder.reorderMesh(ri, true, false);
  if (nu > 65535) throw new Error('정점이 u16 을 넘음: ' + nu);
  const rp = new Float32Array(nu * 3), rc = color ? new Float32Array(nu * 3) : null, rf = new Uint32Array(farI.length);
  for (let i = 0; i < nv; i++) if (remap[i] !== 0xffffffff) { const j = remap[i]; rp.set(near.P.subarray(i * 3, i * 3 + 3), j * 3); if (color) rc.set(near.C.subarray(i * 3, i * 3 + 3), j * 3); }
  for (let i = 0; i < farI.length; i++) rf[i] = remap[farI[i]];
  {   // 원거리 삼각형 순서도 캐시 순서로(정점 번호는 근거리 것 그대로 — 압축률만 좋아진다)
    const t = Uint32Array.from(rf), [r2, n2] = MeshoptEncoder.reorderMesh(t, true, false), inv = new Uint32Array(n2);
    for (let i = 0; i < r2.length; i++) if (r2[i] !== 0xffffffff) inv[r2[i]] = i;
    for (let i = 0; i < t.length; i++) rf[i] = inv[t[i]];
  }
  const { mn, mx } = bbox(rp);
  const q = new Uint16Array(nu * 4);
  for (let i = 0; i < nu; i++) for (let c = 0; c < 3; c++) q[i * 4 + c] = Math.round((rp[i * 3 + c] - mn[c]) / ((mx[c] - mn[c]) || 1) * 65535);
  {   // 양자화 오차(위치 uint16) — 찌그러짐이 양자화 탓이 아님을 늘 기록한다(경계상자 2.5m 에서도 0.02mm 아래)
    let pe = 0; for (let i = 0; i < nu; i++) for (let c = 0; c < 3; c++) pe = Math.max(pe, Math.abs(mn[c] + q[i * 4 + c] / 65535 * (mx[c] - mn[c]) - rp[i * 3 + c]));
    console.log(`[${e.key}] quantization max pos err ${(pe * 1000).toFixed(3)} mm`);
  }
  const u16 = (a) => new Uint8Array(Uint16Array.from(a).buffer), b64 = (u) => Buffer.from(u).toString('base64');
  const enc = {
    pos: MeshoptEncoder.encodeGltfBuffer(new Uint8Array(q.buffer), nu, 8, 'ATTRIBUTES', 1),   // v1 부호화(디코더가 머리 바이트로 알아본다) — v0 보다 작다
    idx: MeshoptEncoder.encodeGltfBuffer(u16(ri), ri.length, 2, 'TRIANGLES'),
    far: MeshoptEncoder.encodeGltfBuffer(u16(rf), rf.length, 2, 'TRIANGLES'),
  };
  if (color) {
    const c8 = new Uint8Array(nu * 4);
    for (let i = 0; i < nu; i++) { for (let c = 0; c < 3; c++) c8[i * 4 + c] = Math.max(0, Math.min(255, Math.round(rc[i * 3 + c] * 255))); c8[i * 4 + 3] = 255; }
    enc.col = MeshoptEncoder.encodeGltfBuffer(c8, nu, 4, 'ATTRIBUTES', 1);
  }
  const bytes = Object.fromEntries(Object.entries(enc).map(([k2, v]) => [k2, v.length]));
  const meta = { key: e.key, kind: e.kind, w: +(mx[0] - mn[0]).toFixed(4), h: +(mx[1] - mn[1]).toFixed(4), d: +(mx[2] - mn[2]).toFixed(4), min: mn.map((v) => +v.toFixed(5)), max: mx.map((v) => +v.toFixed(5)), verts: nu, tris: ri.length / 3, farTris: rf.length / 3, color: color, src: e.credit };
  const A64 = Object.fromEntries(Object.entries(enc).map(([k2, v]) => [k2, b64(v)]));
  const js = `/* scan3d_${e.key}.js — 생성 파일(tools/statues/make_scan_pack.mjs, 설정 tools/statues/scan_packs.json). ${e.label_ko}
   원본: ${e.credit.title} — ${e.credit.author} — ${e.credit.license} — ${e.credit.url}
   ${m.I.length / 3} 삼각형 → ${meta.tris}(근거리) / ${meta.farTris}(원거리). 삼각형 수를 줄이고 재질을 바꿈(${color ? '질감 → 정점 색' : '질감 없음 → 공용 대리석 재질'}).
   좌표: Y 위, 앞 +Z, 바닥 y=0, 높이 ${meta.h}m·너비 ${meta.w}m·깊이 ${meta.d}m. 위치 uint16${color ? ' + 색 uint8(sRGB)' : ''} + meshopt 압축. 법선은 싣지 않고 load() 가 근거리 메쉬에서 모서리 각 가중으로 계산한다.
   포함: MeshoptDecoder(meshoptimizer, MIT). load(THREE) → Promise<{near, far, meta}>(BufferGeometry 둘, 정점 공유). 출처는 meta.src — 지우지 말 것. */
(function () {
  ${await decoder()}
  var A = ${JSON.stringify(A64)};
  var M = ${JSON.stringify(meta).replace(/[\u007f-\uffff]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))};
  function bytes(s) { var r = atob(s), u = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) u[i] = r.charCodeAt(i); return u; }
  // 정점 법선: 근거리 메쉬에서 모서리 각 가중(make_scan_pack.mjs normalsAngle 과 같은 셈) — 원거리도 같은 정점·법선을 쓴다.
  // 각은 둘만 acos 로(셋째 = π − 둘), Math 함수는 지역 변수로(100k 삼각형 ≈ 10–20ms).
  function normals(P, I) {
    var N = new Float32Array(P.length), n = I.length, acos = Math.acos, sqrt = Math.sqrt, PI = Math.PI, t, a, b, c;
    function ang(ax, ay, az, bx, by, bz) { var l = sqrt((ax * ax + ay * ay + az * az) * (bx * bx + by * by + bz * bz)); if (!(l > 0)) return 0; var q = (ax * bx + ay * by + az * bz) / l; return acos(q > 1 ? 1 : q < -1 ? -1 : q); }
    for (t = 0; t < n; t += 3) {
      a = I[t] * 3; b = I[t + 1] * 3; c = I[t + 2] * 3;
      var abx = P[b] - P[a], aby = P[b + 1] - P[a + 1], abz = P[b + 2] - P[a + 2], acx = P[c] - P[a], acy = P[c + 1] - P[a + 1], acz = P[c + 2] - P[a + 2];
      var nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx, nl = sqrt(nx * nx + ny * ny + nz * nz);
      if (!(nl > 0)) continue;
      nx /= nl; ny /= nl; nz /= nl;
      var ga = ang(abx, aby, abz, acx, acy, acz), gb = ang(-abx, -aby, -abz, P[c] - P[b], P[c + 1] - P[b + 1], P[c + 2] - P[b + 2]), gc = PI - ga - gb;
      N[a] += nx * ga; N[a + 1] += ny * ga; N[a + 2] += nz * ga;
      N[b] += nx * gb; N[b + 1] += ny * gb; N[b + 2] += nz * gb;
      N[c] += nx * gc; N[c + 1] += ny * gc; N[c + 2] += nz * gc;
    }
    for (t = 0; t < N.length; t += 3) { var q = sqrt(N[t] * N[t] + N[t + 1] * N[t + 1] + N[t + 2] * N[t + 2]); if (!(q > 0)) { N[t + 1] = 1; continue; } N[t] /= q; N[t + 1] /= q; N[t + 2] /= q; }
    return N;
  }
  function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function load(T) {
    var D = MD.MeshoptDecoder;
    return D.ready.then(function () {
      var n = M.verts, pq = new Uint8Array(n * 8), ni = new Uint8Array(M.tris * 6), nf = new Uint8Array(M.farTris * 6);
      D.decodeGltfBuffer(pq, n, 8, bytes(A.pos), 'ATTRIBUTES');
      D.decodeGltfBuffer(ni, M.tris * 3, 2, bytes(A.idx), 'TRIANGLES'); D.decodeGltfBuffer(nf, M.farTris * 3, 2, bytes(A.far), 'TRIANGLES');
      var p16 = new Uint16Array(pq.buffer), pos = new Float32Array(n * 3), i, k;
      for (i = 0; i < n; i++) for (k = 0; k < 3; k++) pos[i * 3 + k] = M.min[k] + p16[i * 4 + k] / 65535 * (M.max[k] - M.min[k]);
      var nor = normals(pos, new Uint16Array(ni.buffer));
      var pa = new T.BufferAttribute(pos, 3), na = new T.BufferAttribute(nor, 3), ca = null;
      if (A.col) {
        var cq = new Uint8Array(n * 4), col = new Float32Array(n * 3), L = new Float32Array(256);
        D.decodeGltfBuffer(cq, n, 4, bytes(A.col), 'ATTRIBUTES');
        for (i = 0; i < 256; i++) L[i] = lin(i);   // 선형 작업공간(geo.js ColorManagement)
        for (i = 0; i < n; i++) for (k = 0; k < 3; k++) col[i * 3 + k] = L[cq[i * 4 + k]];
        ca = new T.BufferAttribute(col, 3);
      }
      function geo(ix) { var g = new T.BufferGeometry(); g.setAttribute('position', pa); g.setAttribute('normal', na); if (ca) g.setAttribute('color', ca); g.setIndex(new T.BufferAttribute(new Uint16Array(ix.buffer), 1)); return g; }
      var near = geo(ni), far = geo(nf); near.computeBoundingSphere(); far.boundingSphere = near.boundingSphere; near.computeBoundingBox(); far.boundingBox = near.boundingBox;
      return { near: near, far: far, meta: M };
    });
  }
  ((window.ChurchArt = window.ChurchArt || {}).scans3d = window.ChurchArt.scans3d || {})[M.key] = { mesh: true, meta: M, load: load };
})();
`;
  const out = path.join(OUT, `scan3d_${e.key}.js`);
  fs.writeFileSync(out, js);
  console.log(`[${e.key}] wrote`, path.relative(repo, out), (js.length / 1024).toFixed(0) + 'KB', 'bytes', JSON.stringify(bytes), 'size', [meta.w, meta.h, meta.d].join('x'), (Date.now() - t0) + 'ms');
}

export { readStl, readGlb, rotate, bbox, weld, normals, cfg, SRC };
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const want = process.argv.slice(2);
  if (!SRC) { console.error('원본 폴더가 없다(art/statue_handoff/received). SCAN_SRC 로 지정'); process.exit(1); }
  for (const e of cfg.packs) if (!want.length || want.includes(e.key)) await makePack(e);
}
