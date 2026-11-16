// meshy_decimate.mjs 가 만든 저폴리 .bin → assets/church/statue3d_<key>.js (meshopt 압축 + 양자화, 디코더 동봉).
// 사용: node tools/statues/make_statue_meshy_pack.mjs <near.bin> <out.js> [key=mary_meshy] [farTris=8000]
//   - 위치 uint16×3(+패딩, 경계상자 정규화), 법선 팔면체 16비트(12비트 정밀) → meshopt 필터/압축, 인덱스 u16 meshopt TRIANGLES.
//   - 원거리 LOD: 근거리 메쉬를 다시 단순화한 인덱스만 따로(정점 공유 → 정점 버퍼 1개).
//   - 정점/삼각형 순서는 meshopt reorder 로 캐시·압축에 맞춘다.
//   - 파일 하나에 디코더(MeshoptDecoder, MIT)와 load(THREE) 함수를 같이 넣어 shrine.js 가 별도 GLTFLoader 없이 쓴다.
//   - 좌표: 원본 GLB 그대로(Y 위, 원점 중심, 앞 +Z). meta.min/max = 정규화 경계상자(미터 단위 원본 크기).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../avatar_glb/package.json'));
const { MeshoptEncoder, MeshoptSimplifier } = await import(require.resolve('meshoptimizer'));
const { build } = await import(require.resolve('esbuild'));
const [, , inp, outp, key = 'mary_meshy', farArg = '8000'] = process.argv;
const b = fs.readFileSync(inp), nv = b.readUInt32LE(0), nt = b.readUInt32LE(4);
const cp = (o, n, T) => new T(b.buffer.slice(b.byteOffset + o, b.byteOffset + o + n * T.BYTES_PER_ELEMENT));
let P = cp(8, nv * 3, Float32Array), N = cp(8 + nv * 12, nv * 3, Float32Array), I = cp(8 + nv * 24, nt * 3, Uint32Array);
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
// 원거리 LOD(근거리 정점의 부분집합)
const [farI] = MeshoptSimplifier.simplifyWithAttributes(I, P, 3, N, 3, [0.6, 0.6, 0.6], null, +farArg * 3, 0.1, ['Prune']);
// 캐시 순서 + 정점 재배열(두 인덱스 모두 같은 리맵)
const [remap, nu] = MeshoptEncoder.reorderMesh(I, true, false);
const rp = new Float32Array(nu * 3), rn = new Float32Array(nu * 3), ri = new Uint32Array(I.length), rf = new Uint32Array(farI.length);
for (let i = 0; i < nv; i++) if (remap[i] !== 0xffffffff) { rp.set(P.subarray(i * 3, i * 3 + 3), remap[i] * 3); rn.set(N.subarray(i * 3, i * 3 + 3), remap[i] * 3); }
ri.set(I);   // reorderMesh 는 인덱스를 제자리에서 새 정점 번호로 바꾼다
for (let i = 0; i < farI.length; i++) rf[i] = remap[farI[i]];
// 위치 양자화(uint16)
const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
for (let i = 0; i < nu; i++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], rp[i * 3 + k]); mx[k] = Math.max(mx[k], rp[i * 3 + k]); }
const q = new Uint16Array(nu * 4);
for (let i = 0; i < nu; i++) for (let k = 0; k < 3; k++) q[i * 4 + k] = Math.round((rp[i * 3 + k] - mn[k]) / (mx[k] - mn[k]) * 65535);
const n4 = new Float32Array(nu * 4); for (let i = 0; i < nu; i++) { const l = Math.hypot(rn[i * 3], rn[i * 3 + 1], rn[i * 3 + 2]) || 1; for (let k = 0; k < 3; k++) n4[i * 4 + k] = rn[i * 3 + k] / l; n4[i * 4 + 3] = 1; }
const posEnc = MeshoptEncoder.encodeGltfBuffer(new Uint8Array(q.buffer), nu, 8, 'ATTRIBUTES');
const nrmEnc = MeshoptEncoder.encodeGltfBuffer(MeshoptEncoder.encodeFilterOct(n4, nu, 8, 12), nu, 8, 'ATTRIBUTES');
const u16 = (a) => new Uint8Array(Uint16Array.from(a).buffer);
const idxEnc = MeshoptEncoder.encodeGltfBuffer(u16(ri), ri.length, 2, 'TRIANGLES');
const farEnc = MeshoptEncoder.encodeGltfBuffer(u16(rf), rf.length, 2, 'TRIANGLES');
const b64 = (u) => Buffer.from(u).toString('base64');
console.log('verts', nu, 'near tris', ri.length / 3, 'far tris', rf.length / 3, 'bytes pos/nrm/idx/far', posEnc.length, nrmEnc.length, idxEnc.length, farEnc.length);
// 디코더 번들
const dec = await build({ stdin: { contents: "export { MeshoptDecoder } from 'meshoptimizer/decoder';", resolveDir: path.join(here, '../avatar_glb'), loader: 'js' }, bundle: true, format: 'iife', globalName: 'MD', minify: true, target: 'es2019', write: false, legalComments: 'none' });
const meta = { w: +(mx[0] - mn[0]).toFixed(4), h: +(mx[1] - mn[1]).toFixed(4), d: +(mx[2] - mn[2]).toFixed(4), min: mn.map((v) => +v.toFixed(5)), max: mx.map((v) => +v.toFixed(5)), verts: nu, tris: ri.length / 3, farTris: rf.length / 3 };
// Meshy 약관 2.4(AI 식별 표지 보존): 원본 GLB 의 asset.generator("xpostprocessing", Meshy 후처리기)와 출처·라이선스를 팩의 meta.src 로 남긴다.
// 원본 GLB 에는 그 밖의 extras·저작권·워터마크 필드가 없다(2026-11-16 확인, licenses/MESHY_STATUE.md). 다른 모델을 쓸 때는 원본의 asset 블록을 다시 확인해 고친다.
meta.src = {"generator":"Meshy AI","gltfAssetGenerator":"xpostprocessing","model":"Marian_Serenity","url":"https://www.meshy.ai","license":"CC BY 4.0","licenseUrl":"https://creativecommons.org/licenses/by/4.0/","attribution":"Meshy AI","aiGenerated":true,"note":"AI-generated 3D model (Meshy AI); original glTF asset.generator preserved; geometry simplified and quantized"};
const js = `/* statue3d_${key}.js — 생성 파일(tools/statues/meshy_decimate.mjs + make_statue_meshy_pack.mjs). 흰 대리석 성모상(입체) — 모든 성당 성모 자리(명동·마조레 제외).
   원본: Meshy AI 로 생성(CC BY 4.0 — 'Meshy AI'; 사용자가 직접 만든 그림에서 생성), 739,044 삼각형 → ${meta.tris} 삼각형(근거리) / ${meta.farTris}(원거리).
   좌표 = 원본 GLB 그대로(Y 위, 원점 중심, 앞 +Z, 위 ${meta.h}m·너비 ${meta.w}m·깊이 ${meta.d}m, 팔각 받침 포함). 위치 uint16 양자화 + 법선 팔면체 + meshopt 압축.
   식별: meta.src = Meshy AI 생성 표지(원본 glTF asset.generator "xpostprocessing", CC BY 4.0, https://www.meshy.ai) — 지우지 말 것(Meshy 약관 2.4).
   포함: MeshoptDecoder(meshoptimizer, MIT). load(THREE) → Promise<{near, far}>(BufferGeometry 둘, 정점 공유). */
(function () {
  ${dec.outputFiles[0].text.trim()}
  var A = { pos: '${b64(posEnc)}', nrm: '${b64(nrmEnc)}', idx: '${b64(idxEnc)}', far: '${b64(farEnc)}' };
  var M = ${JSON.stringify(meta)};
  function bytes(s) { var r = atob(s), u = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) u[i] = r.charCodeAt(i); return u; }
  function load(T) {
    var D = MD.MeshoptDecoder;
    return D.ready.then(function () {
      var n = M.verts, pq = new Uint8Array(n * 8), nq = new Uint8Array(n * 8), ni = new Uint8Array(M.tris * 6), nf = new Uint8Array(M.farTris * 6);
      D.decodeGltfBuffer(pq, n, 8, bytes(A.pos), 'ATTRIBUTES'); D.decodeGltfBuffer(nq, n, 8, bytes(A.nrm), 'ATTRIBUTES', 'OCTAHEDRAL');
      D.decodeGltfBuffer(ni, M.tris * 3, 2, bytes(A.idx), 'TRIANGLES'); D.decodeGltfBuffer(nf, M.farTris * 3, 2, bytes(A.far), 'TRIANGLES');
      var p16 = new Uint16Array(pq.buffer), n16 = new Int16Array(nq.buffer), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), i, k;
      for (i = 0; i < n; i++) for (k = 0; k < 3; k++) { pos[i * 3 + k] = M.min[k] + p16[i * 4 + k] / 65535 * (M.max[k] - M.min[k]); nor[i * 3 + k] = n16[i * 4 + k] / 32767; }
      var pa = new T.BufferAttribute(pos, 3), na = new T.BufferAttribute(nor, 3);
      function geo(ix) { var g = new T.BufferGeometry(); g.setAttribute('position', pa); g.setAttribute('normal', na); g.setIndex(new T.BufferAttribute(new Uint16Array(ix.buffer), 1)); return g; }
      var near = geo(ni), far = geo(nf); near.computeBoundingSphere(); far.boundingSphere = near.boundingSphere; near.computeBoundingBox(); far.boundingBox = near.boundingBox;
      return { near: near, far: far, meta: M };
    });
  }
  ((window.ChurchArt = window.ChurchArt || {}).statues3d = window.ChurchArt.statues3d || {}).${key} = { mesh: true, meta: M, load: load };
})();
`;
fs.writeFileSync(outp, js);
console.log('wrote', outp, (js.length / 1024).toFixed(0) + 'KB', JSON.stringify(meta));
