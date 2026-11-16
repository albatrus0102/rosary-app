// Meshy 성모상 GLB(739k 삼각형, 위치+법선만) → 모바일용 저폴리 자료(.bin).
// 사용: node tools/statues/meshy_decimate.mjs <in.glb> <out.bin> [목표삼각형=35000]
// 위치 용접 → meshopt 단순화(법선 가중) → 살아남은 정점은 원본 정점이므로 **원본(739k) 법선을 그대로 유지**한다
// (주름의 음영이 저폴리에서도 남는다 — 법선맵 없이 같은 효과). 출력: u32 verts, u32 tris, f32 위치, f32 법선, u32 인덱스.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../avatar_glb/package.json', import.meta.url));
const { MeshoptSimplifier } = await import(require.resolve('meshoptimizer'));
const [, , inp, outp, tgtArg] = process.argv, target = +(tgtArg || 35000);
const b = fs.readFileSync(inp), jl = b.readUInt32LE(12), json = JSON.parse(b.slice(20, 20 + jl).toString()), bin = b.slice(20 + jl + 8);
const prim = json.meshes[0].primitives[0];
function acc(i) {
  const a = json.accessors[i], v = json.bufferViews[a.bufferView], off = (v.byteOffset || 0) + (a.byteOffset || 0);
  const T = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[a.componentType], n = a.count * { SCALAR: 1, VEC3: 3 }[a.type];
  return new T(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + n * T.BYTES_PER_ELEMENT));
}
const P = acc(prim.attributes.POSITION), N = acc(prim.attributes.NORMAL), I = acc(prim.indices);
console.log('verts', P.length / 3, 'tris', I.length / 3);
await MeshoptSimplifier.ready;
const remap = MeshoptSimplifier.generatePositionRemap(P, 3);
const idx = new Uint32Array(I.length); for (let i = 0; i < I.length; i++) idx[i] = remap[I[i]];
console.log('welded verts', new Set(remap).size);
const t0 = Date.now();
const [out, err] = MeshoptSimplifier.simplifyWithAttributes(idx, P, 3, N, 3, [0.6, 0.6, 0.6], null, Math.floor(target * 3), 0.05, ['Prune']);
console.log('simplified tris', out.length / 3, 'rel err', err, (Date.now() - t0) + 'ms');
const map = new Int32Array(P.length / 3).fill(-1), verts = [], oi = new Uint32Array(out.length);
for (let i = 0; i < out.length; i++) { const v = out[i]; if (map[v] < 0) { map[v] = verts.length; verts.push(v); } oi[i] = map[v]; }
const pos = new Float32Array(verts.length * 3), nrm = new Float32Array(verts.length * 3);
verts.forEach((v, k) => { pos.set(P.subarray(v * 3, v * 3 + 3), k * 3); nrm.set(N.subarray(v * 3, v * 3 + 3), k * 3); });
fs.writeFileSync(outp, Buffer.concat([Buffer.from(new Uint32Array([verts.length, oi.length / 3]).buffer), Buffer.from(pos.buffer), Buffer.from(nrm.buffer), Buffer.from(oi.buffer)]));
console.log('wrote', outp, verts.length, 'verts', oi.length / 3, 'tris');
