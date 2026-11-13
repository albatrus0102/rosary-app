// glTF 문서 조작(gltf-transform 4): FBX 변환, 단위(스케일) 굽기, 뼈 이름 정규화, 스킨 합치기, LOD 단순화, 텍스처, 동작 정리, 요약.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, meshopt, textureCompress, resample, joinPrimitives, compactPrimitive, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { normalizeBoneName, tintSlotFor, CLIPS, MIXAMO_65, stripRootMotion, LIMITS } from './rules.mjs';
import { m4mul, m4point, m4compose, qmul, qrot, nlerpq, qangle } from './mathx.mjs';

const require = createRequire(import.meta.url);
export const TOOL_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

let _io = null;
export async function getIO() {
  if (_io) return _io;
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
  _io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
  return _io;
}

// ------------------------------------------------------------------ FBX → glb
/** fbx2gltf(npm 패키지에 든 Autodesk FBX SDK 기반 바이너리) 위치. 없으면 null. */
export function fbx2gltfBin() {
  try {
    const dir = path.dirname(require.resolve('fbx2gltf/package.json'));
    const plat = { linux: 'Linux', darwin: 'Darwin', win32: 'Windows_NT' }[process.platform];
    const bin = path.join(dir, 'bin', plat, process.platform === 'win32' ? 'FBX2glTF.exe' : 'FBX2glTF');
    return fs.existsSync(bin) ? bin : null;
  } catch { return null; }
}
/** FBX 를 glb 로. via: 'fbx2gltf'(기본) | 'three'(Playwright chromium 안에서 three r149 FBXLoader → GLTFExporter). 반환 {file, log, via} */
export async function convertFbx(file, workDir, via = 'fbx2gltf') {
  fs.mkdirSync(workDir, { recursive: true });
  const base = path.join(workDir, path.basename(file).replace(/\.fbx$/i, '') + '.' + via);
  if (via === 'three') {
    const { convertFbxWithThree } = await import('./three_convert.mjs');
    const log = await convertFbxWithThree(file, base + '.glb');
    return { file: base + '.glb', log, via };
  }
  const bin = fbx2gltfBin();
  if (!bin) throw new Error('fbx2gltf 바이너리 없음: (cd tools/avatar_glb && npm install) 또는 --via three');
  // 30fps 로 굽는다(Mixamo 내려받기 설정과 같다). 노드 이름에 'mixamorig:' 접두가 그대로 남는다(뒤에서 정규화).
  const r = spawnSync(bin, ['-b', '--anim-framerate', 'bake30', '-i', file, '-o', base], { encoding: 'utf8' });
  const log = ((r.stdout || '') + (r.stderr || '')).trim();
  if (r.status !== 0 || !fs.existsSync(base + '.glb')) throw new Error('fbx2gltf 실패: ' + log.slice(-800));
  return { file: base + '.glb', log, via };
}
/** .fbx/.glb/.gltf 를 읽어 Document 로. FBX 는 먼저 변환. */
export async function readAny(file, { via = 'fbx2gltf', workDir } = {}) {
  const io = await getIO();
  let src = file, log = '';
  if (/\.fbx$/i.test(file)) {
    const r = await convertFbx(file, workDir || fs.mkdtempSync(path.join(os.tmpdir(), 'avglb-')), via);
    src = r.file; log = r.log;
  }
  const doc = await io.read(src);
  return { doc, log, src };
}

// ------------------------------------------------------------------ 수학: 월드 행렬, 스키닝된 휴식 자세 정점
function worldMatrix(node) { return node.getWorldMatrix(); }
/** 스키닝을 적용한 휴식 자세 정점들(월드). 콜백 cb(x,y,z, jointIndexDominant, prim, node). */
export function forEachRestVertex(doc, cb) {
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const skin = node.getSkin();
    let jm = null, joints = null;
    if (skin) {
      joints = skin.listJoints();
      const ibm = skin.getInverseBindMatrices();
      jm = joints.map((j, i) => m4mul(worldMatrix(j), ibm ? ibm.getElement(i, new Array(16)) : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
    }
    const nm = worldMatrix(node);
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'); if (!pos) continue;
      const J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
      const p = [0, 0, 0], j4 = [0, 0, 0, 0], w4 = [0, 0, 0, 0];
      for (let i = 0, n = pos.getCount(); i < n; i++) {
        pos.getElement(i, p);
        if (jm && J && W) {
          J.getElement(i, j4); W.getElement(i, w4);
          let x = 0, y = 0, z = 0, best = 0, bi = j4[0];
          for (let k = 0; k < 4; k++) {
            const w = w4[k]; if (!w) continue;
            const q = m4point(jm[j4[k]], p[0], p[1], p[2]);
            x += q[0] * w; y += q[1] * w; z += q[2] * w;
            if (w > best) { best = w; bi = j4[k]; }
          }
          const ws = w4[0] + w4[1] + w4[2] + w4[3] || 1;
          cb(x / ws, y / ws, z / ws, joints[bi], prim, node);
        } else {
          const q = m4point(nm, p[0], p[1], p[2]);
          cb(q[0], q[1], q[2], null, prim, node);
        }
      }
    }
  }
}
export function restBounds(doc) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  forEachRestVertex(doc, (x, y, z) => { if (x < mn[0]) mn[0] = x; if (y < mn[1]) mn[1] = y; if (z < mn[2]) mn[2] = z; if (x > mx[0]) mx[0] = x; if (y > mx[1]) mx[1] = y; if (z > mx[2]) mx[2] = z; });
  if (mn[0] === Infinity) { const b = getBounds(doc.getRoot().listScenes()[0]); return b; }
  return { min: mn, max: mx };
}

// ------------------------------------------------------------------ 정규화
/** 'mixamorig:' 등 접두를 지운다. 바뀐 이름 수. */
export function normalizeNames(doc) {
  let n = 0;
  for (const node of doc.getRoot().listNodes()) {
    const a = node.getName(), b = normalizeBoneName(a);
    if (a !== b) { node.setName(b); n++; }
  }
  return n;
}
export function findNode(doc, name) { return doc.getRoot().listNodes().find((n) => n.getName() === name) || null; }

/** 뼈대 위쪽 노드에 균일 스케일(예: Blender/three 내보내기의 Armature 0.01)이 있으면 그 스케일을 아래로 구워 미터 단위 뼈대로 만든다.
 *  - 그 노드 아래 모든 노드 이동값 × s, 그 아래 메시 정점 × s, 이동 애니메이션 × s
 *  - 스킨 IBM: 메시가 같은 노드 아래면 S·IBM·S⁻¹, 아니면 S·IBM (월드 결과가 같도록) */
export function bakeRootScale(doc) {
  const root = doc.getRoot();
  const hips = findNode(doc, 'Hips'); if (!hips) return 0;
  const chain = []; for (let p = hips.getParentNode(); p; p = p.getParentNode()) chain.push(p);
  let baked = 0;
  for (const anc of chain) {
    const s = anc.getScale();
    if (Math.abs(s[0] - 1) < 1e-6 && Math.abs(s[1] - 1) < 1e-6 && Math.abs(s[2] - 1) < 1e-6) continue;
    if (Math.abs(s[0] - s[1]) > 1e-5 || Math.abs(s[0] - s[2]) > 1e-5) throw new Error(`비균일 스케일 ${s} (${anc.getName()}) 은 지원하지 않음`);
    const k = s[0]; baked = k;
    const under = new Set();
    (function walk(n) { for (const c of n.listChildren()) { under.add(c); walk(c); } })(anc);
    anc.setScale([1, 1, 1]);
    for (const n of under) { const t = n.getTranslation(); n.setTranslation([t[0] * k, t[1] * k, t[2] * k]); }
    const scaledAcc = new Set();
    for (const n of under) {
      const m = n.getMesh(); if (!m) continue;
      for (const prim of m.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        if (!pos || scaledAcc.has(pos)) continue; scaledAcc.add(pos);
        const a = pos.getArray().slice(); for (let i = 0; i < a.length; i++) a[i] *= k; pos.setArray(a);
      }
    }
    for (const skin of root.listSkins()) {
      const ibm = skin.getInverseBindMatrices(); if (!ibm) continue;
      const users = skin.listParents().filter((p) => p.propertyType === 'Node');
      const meshUnder = users.some((u) => under.has(u));
      const a = ibm.getArray().slice();
      for (let i = 0; i < a.length; i += 16) {
        // S·IBM : 첫 3행 × k (회전·이동 모두) / ·S⁻¹ : 첫 3열 ÷ k → 회전 그대로, 이동만 × k
        if (meshUnder) { a[i + 12] *= k; a[i + 13] *= k; a[i + 14] *= k; }
        else { for (const c of [0, 4, 8, 12]) { a[i + c] *= k; a[i + c + 1] *= k; a[i + c + 2] *= k; } }
      }
      ibm.setArray(a);
    }
    for (const anim of root.listAnimations()) for (const ch of anim.listChannels()) {
      if (ch.getTargetPath() !== 'translation' || !under.has(ch.getTargetNode())) continue;
      const out = ch.getSampler().getOutput(); if (scaledAcc.has(out)) continue; scaledAcc.add(out);
      const a = out.getArray().slice(); for (let i = 0; i < a.length; i++) a[i] *= k; out.setArray(a);
    }
  }
  return baked;
}

/** 같은 관절 목록을 가진 스킨을 하나로(fbx2gltf 는 메시마다 스킨을 따로 만든다). */
export function mergeSkins(doc) {
  const skins = doc.getRoot().listSkins();
  if (skins.length < 2) return 0;
  const key = (s) => s.listJoints().map((j) => j.getName()).join('|');
  const sameIbm = (a, b) => { const x = a.getInverseBindMatrices()?.getArray(), y = b.getInverseBindMatrices()?.getArray(); if (!x || !y || x.length !== y.length) return false; for (let i = 0; i < x.length; i++) if (Math.abs(x[i] - y[i]) > 1e-4) return false; return true; };
  let merged = 0;
  for (let i = 1; i < skins.length; i++) {
    const keep = skins.slice(0, i).find((s) => !s.isDisposed() && key(s) === key(skins[i]) && sameIbm(s, skins[i]));
    if (!keep) continue;
    for (const p of skins[i].listParents()) if (p.propertyType === 'Node') p.setSkin(keep);
    skins[i].dispose(); merged++;
  }
  return merged;
}

// ------------------------------------------------------------------ LOD 단순화(meshoptimizer)
function triCount(prim) { const idx = prim.getIndices(); return idx ? idx.getCount() / 3 : prim.getAttribute('POSITION').getCount() / 3; }
/** prim 을 목표 삼각형 수 근처로 단순화(제자리). 오차 한도를 늘려 가며 시도하고, 끝까지 안 되면 sloppy. */
function simplifyTo(doc, prim, target) {
  const src = triCount(prim);
  if (src <= target) return src;
  const pos = prim.getAttribute('POSITION');
  let posArr = pos.getArray(); if (!(posArr instanceof Float32Array)) posArr = Float32Array.from(posArr);
  const idx = Uint32Array.from(prim.getIndices().getArray());
  const tgtIdx = Math.max(3, Math.floor(target) * 3);
  let best = null;
  for (const err of [0.01, 0.03, 0.08, 0.2, 0.5, 1]) {
    const [out] = MeshoptSimplifier.simplify(idx, posArr, 3, tgtIdx, err, []);
    best = out;
    if (out.length <= tgtIdx * LIMITS.trisSlack) break;
  }
  if (best.length > tgtIdx * LIMITS.trisSlack) best = MeshoptSimplifier.simplifySloppy(idx, posArr, 3, null, tgtIdx, 1)[0];
  const acc = doc.createAccessor().setType('SCALAR').setArray(best).setBuffer(prim.getIndices().getBuffer());
  prim.setIndices(acc);
  compactPrimitive(prim);
  if (prim.getAttribute('POSITION').getCount() <= 65534) acc.setArray(new Uint16Array(prim.getIndices().getArray()));
  return best.length / 3;
}

// ------------------------------------------------------------------ 캐릭터 빌드
/**
 * 캐릭터(With Skin) → 최적화 glb.
 * opts: { input, out, id, via, tex(1024), lods([8000,4000,1500]), matMap({원래이름: 'skin'|'hair'|'cloth'|새이름}), textures(서비스 glb: 텍스처 없을 때 가져옴),
 *         mask(틴트 마스크 png: R=피부, G=머리), quality(82), meshopt(true), workDir }
 * 반환 { summary, report, bytes }
 */
export async function buildCharacter(opts) {
  const io = await getIO();
  const warnings = [];
  const { doc, log } = await readAny(opts.input, { via: opts.via, workDir: opts.workDir });
  if (/eInheritRrs/.test(log)) warnings.push('fbx2gltf: 일부 뼈(눈 등)의 eInheritRrs 상속 경고 — Mixamo 에서 흔함, 스케일 없는 뼈라 영향 없음');
  const root = doc.getRoot();
  const renamed = normalizeNames(doc);
  const baked = bakeRootScale(doc);
  if (baked) warnings.push(`뼈대 위 노드 스케일 ${baked} 를 미터 단위로 구움`);
  for (const a of root.listAnimations()) a.dispose();
  mergeSkins(doc);
  // 재질 이름 바꾸기(틴트 슬롯 규약: skin / hair)
  for (const m of root.listMaterials()) {
    const to = opts.matMap && opts.matMap[m.getName()];
    if (to) m.setName(to);
  }
  // 텍스처가 없는 재질에 서비스 glb 의 baseColor 텍스처를 붙인다(Mixamo FBX 가 텍스처를 잃었을 때; UV 는 Mixamo 가 보존)
  if (opts.textures) {
    const tdoc = await io.read(opts.textures);
    const tmats = tdoc.getRoot().listMaterials().filter((m) => m.getBaseColorTexture());
    if (tmats.length) {
      const tt = tmats[0].getBaseColorTexture();
      let tex = null;
      for (const m of root.listMaterials()) if (!m.getBaseColorTexture()) {
        if (!tex) tex = doc.createTexture(tt.getName() || 'base').setImage(tt.getImage()).setMimeType(tt.getMimeType());
        m.setBaseColorTexture(tex); m.setBaseColorFactor([1, 1, 1, 1]);
      }
    } else warnings.push('--textures glb 에 baseColor 텍스처가 없음');
  }
  await doc.transform(weld(), dedup());
  // 스킨된 메시 노드 수집 → 재질별로 프리미티브 합치기
  const meshNodes = root.listNodes().filter((n) => n.getMesh());
  const skinned = meshNodes.filter((n) => n.getSkin());
  if (!skinned.length) throw new Error('스킨된 메시가 없음(Mixamo 에서 With Skin 으로 받았는지 확인)');
  const skin = skinned[0].getSkin();
  for (const n of skinned) if (n.getSkin() !== skin) warnings.push(`메시 ${n.getName()} 의 스킨이 달라 첫 스킨으로 묶음`);
  for (const n of meshNodes) if (!n.getSkin()) warnings.push(`스킨 없는 메시 ${n.getName()} 버림(뼈를 따라 움직이지 않음)`);
  const byMat = new Map();
  for (const n of skinned) for (const p of n.getMesh().listPrimitives()) {
    const m = p.getMaterial(); if (!byMat.has(m)) byMat.set(m, []); byMat.get(m).push(p);
  }
  const base = [];
  for (const [mat, prims] of byMat) {
    let p = prims.length > 1 ? joinPrimitives(prims) : prims[0].clone();
    p.setMaterial(mat);
    // 쓰지 않는 속성 정리(TEXCOORD_1, COLOR_0 등은 남기지 않는다; 탄젠트는 노멀맵을 쓰지 않으므로 버림)
    for (const sem of p.listSemantics()) if (!/^(POSITION|NORMAL|TEXCOORD_0|JOINTS_0|WEIGHTS_0)$/.test(sem)) p.setAttribute(sem, null);
    base.push(p);
  }
  const scene = root.listScenes()[0] || root.getDefaultScene();
  const meta = characterMeta(doc, skin);   // 휴식 자세 기준 키·좌석 수치(LOD 를 만들기 전에)
  for (const n of meshNodes) { n.setMesh(null); n.setSkin(null); }
  const total0 = base.reduce((s, p) => s + triCount(p), 0);
  const lodT = opts.lods || LIMITS.tris;
  const lods = [];
  for (let k = 0; k < lodT.length; k++) {
    const mesh = doc.createMesh('LOD' + k);
    const ratio = Math.min(1, lodT[k] / total0);
    let t = 0;
    for (const p of base) {
      const q = p.clone();
      t += ratio < 1 ? simplifyTo(doc, q, Math.max(12, Math.floor(triCount(p) * ratio))) : triCount(q);
      mesh.addPrimitive(q);
    }
    const node = doc.createNode('LOD' + k).setMesh(mesh).setSkin(skin);
    scene.addChild(node);
    lods.push(Math.round(t));
  }
  for (const p of base) p.dispose();
  // 끝 뼈·눈 등 무게 없는 잎 노드와 원래 메시 노드 정리
  await doc.transform(prune({ keepLeaves: false, keepAttributes: false }), dedup());
  // 텍스처: 긴 변 tex 로 줄이고 WebP
  const tex = opts.tex || LIMITS.texture;
  if (root.listTextures().length) await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [tex, tex], quality: opts.quality || 82 }));
  // 틴트 마스크(쓰지 않는 재질 '__tintmask' 의 baseColor 로 싣는다; 런타임이 parser.getDependency 로 읽는다)
  let tintMask = false;
  if (opts.mask) {
    const buf = await sharp(opts.mask).resize(512, 512, { fit: 'fill' }).webp({ quality: 90 }).toBuffer();
    const t = doc.createTexture('__tintmask').setImage(new Uint8Array(buf)).setMimeType('image/webp');
    doc.createMaterial('__tintmask').setBaseColorTexture(t);
    tintMask = true;
  }
  scene.setExtras({ ...(scene.getExtras() || {}), rosary: { v: 1, kind: 'character', id: opts.id || path.basename(opts.input).replace(/\.\w+$/, ''), ...meta, lods, tintMask } });
  if (opts.meshopt !== false) await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high', quantizationVolume: 'scene' }));
  if (tintMask && !root.listMaterials().some((m) => m.getName() === '__tintmask')) warnings.push('틴트 마스크 재질이 정리 과정에서 사라짐');
  const bin = await io.writeBinary(doc);
  if (opts.out) { fs.mkdirSync(path.dirname(opts.out), { recursive: true }); fs.writeFileSync(opts.out, bin); }
  const summary = summarize(doc, bin.byteLength);
  summary.renamed = renamed; summary.inputTris = total0;
  return { summary, warnings, bytes: bin.byteLength, doc };
}

/** 휴식(T/A) 자세에서 키·엉덩이·무릎 수치. 앞 = +Z(Mixamo). 런타임 좌석 정합에 쓴다(scene.extras.rosary). */
export function characterMeta(doc, skin) {
  const b = restBounds(doc);
  const W = (name) => { const n = findNode(doc, name); return n ? m4point(n.getWorldMatrix(), 0, 0, 0) : null; };
  const hips = W('Hips'), upL = W('LeftUpLeg'), upR = W('RightUpLeg'), kneeL = W('LeftLeg'), footL = W('LeftFoot'), head = W('Head');
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const meta = { height: r3(b.max[1] - b.min[1]), floor: r3(b.min[1]), front: r3(b.max[2]) };
  if (hips) meta.hipsY = r3(hips[1]);
  if (upL) meta.hipJointY = r3(upL[1]);
  if (footL) meta.ankleY = r3(footL[1] - b.min[1]);
  if (head) meta.headY = r3(head[1]);
  if (upL && kneeL) { meta.thigh = r3(Math.hypot(upL[0] - kneeL[0], upL[1] - kneeL[1], upL[2] - kneeL[2])); }
  if (kneeL && footL) meta.shin = r3(Math.hypot(kneeL[0] - footL[0], kneeL[1] - footL[1], kneeL[2] - footL[2]));
  // 앉을 때 고관절 아래 살 두께(= 고관절에서 엉덩이·허벅지 뒷면까지): 고관절 높이 부근 정점의 뒤(-Z) 끝
  if (upL && upR) {
    let back = 0, kneeFront = 0;
    const names = new Set(['Hips', 'LeftUpLeg', 'RightUpLeg']);
    forEachRestVertex(doc, (x, y, z, j) => {
      if (j && names.has(j.getName()) && y > upL[1] - 0.12 && y < upL[1] + 0.04 && Math.abs(Math.abs(x) - Math.abs(upL[0])) < 0.12) back = Math.max(back, upL[2] - z);
      if (kneeL && j && /^(Left|Right)(UpLeg|Leg)$/.test(j.getName()) && Math.abs(y - kneeL[1]) < 0.05) kneeFront = Math.max(kneeFront, z - kneeL[2]);
    });
    meta.seatDrop = r3(Math.min(0.25, back));     // 앉은 자세에서 고관절이 좌석 윗면보다 이만큼 위
    meta.kneeFront = r3(Math.min(0.15, kneeFront)); // 무릎 꿇을 때 무릎 관절이 받침 윗면보다 이만큼 위
  }
  return meta;
}

// ------------------------------------------------------------------ 동작 빌드
function sampleAt(sampler, t, size) {
  const inp = sampler.getInput().getArray(), out = sampler.getOutput().getArray(), n = inp.length;
  const cubic = sampler.getInterpolation() === 'CUBICSPLINE', stride = cubic ? size * 3 : size, off = cubic ? size : 0;
  const get = (i) => Array.from(out.subarray ? out.subarray(i * stride + off, i * stride + off + size) : out.slice(i * stride + off, i * stride + off + size));
  if (t <= inp[0]) return get(0);
  if (t >= inp[n - 1]) return get(n - 1);
  let i = 0; while (i < n - 2 && inp[i + 1] < t) i++;
  const f = (t - inp[i]) / (inp[i + 1] - inp[i] || 1), a = get(i), b = get(i + 1);
  if (sampler.getInterpolation() === 'STEP') return a;
  if (size === 4) return nlerpq(a, b, f);
  return a.map((v, k) => v + (b[k] - v) * f);
}
function clipDuration(anim) { let d = 0; for (const s of anim.listSamplers()) { const a = s.getInput().getArray(); d = Math.max(d, a[a.length - 1]); } return d; }
/** 동작 하나의 FK: 시간 t 에서 bone 의 월드 위치(조상 체인은 휴식값 + 애니메이션). */
function fkPos(doc, anim, boneName, t) {
  const node = findNode(doc, boneName); if (!node) return null;
  const chain = []; for (let n = node; n; n = n.getParentNode()) chain.unshift(n);
  const tracks = new Map();
  for (const ch of anim.listChannels()) tracks.set(ch.getTargetNode().getName() + '/' + ch.getTargetPath(), ch.getSampler());
  let m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const n of chain) {
    const tr = tracks.get(n.getName() + '/translation'), rot = tracks.get(n.getName() + '/rotation');
    m = m4mul(m, m4compose(tr ? sampleAt(tr, t, 3) : n.getTranslation(), rot ? sampleAt(rot, t, 4) : n.getRotation(), n.getScale()));
  }
  return m4point(m, 0, 0, 0);
}
/** 걷기 속도(m/s, timeScale 1 기준): 발이 바닥에 닿아 있는 동안 엉덩이에 대한 발의 뒤로 가는 속도의 중앙값. */
export function walkSpeed(doc, anim) {
  const d = clipDuration(anim), N = 90, ys = [], zs = [];
  for (const side of ['Left', 'Right']) for (let i = 0; i <= N; i++) {
    const t = d * i / N, f = fkPos(doc, anim, side + 'Foot', t), h = fkPos(doc, anim, 'Hips', t);
    if (!f || !h) return 0;
    ys.push(f[1]); zs.push([side, i, f[2] - h[2]]);
  }
  const minY = Math.min(...ys), v = [];
  for (let k = 1; k < zs.length; k++) {
    if (zs[k][0] !== zs[k - 1][0]) continue;
    if (ys[k] < minY + 0.03 && ys[k - 1] < minY + 0.03) v.push(-(zs[k][2] - zs[k - 1][2]) / (d / N));
  }
  v.sort((a, b) => a - b);
  return v.length ? Math.max(0, v[v.length >> 1]) : 0;
}

/**
 * 동작(Without Skin) 여러 개 → 하나의 anims glb(뼈대 1벌 + 정규 이름 클립들, 메시 없음).
 * inputs: [{file, name?}] (name 없으면 파일 이름으로 매핑). opts: { out, via, workDir, meshopt(true), fps }
 */
export async function buildAnims(inputs, opts = {}) {
  const io = await getIO();
  const warnings = [], clipsMeta = {};
  let baseDoc = null;
  const seen = new Set();
  for (const inp of inputs) {
    const { doc, log } = await readAny(inp.file, { via: opts.via, workDir: opts.workDir });
    normalizeNames(doc); bakeRootScale(doc);
    const anims = doc.getRoot().listAnimations().filter((a) => a.listChannels().length);
    if (!anims.length) { warnings.push(`${path.basename(inp.file)}: 애니메이션 없음(건너뜀)`); continue; }
    const anim = anims.sort((a, b) => b.listChannels().length - a.listChannels().length)[0];
    const { clipNameFor } = await import('./rules.mjs');
    const name = inp.name || clipNameFor(inp.file) || clipNameFor(anim.getName());
    if (!name || !CLIPS[name]) { warnings.push(`${path.basename(inp.file)}: 동작 이름을 정할 수 없음(name=파일 형식으로 지정) — 건너뜀`); continue; }
    if (seen.has(name)) { warnings.push(`${name}: 중복(${path.basename(inp.file)} 무시)`); continue; }
    seen.add(name);
    // 트랙 정리: 스케일 트랙과 Hips 외 이동 트랙 제거(캐릭터마다 뼈 길이가 달라도 같은 클립을 쓰게), Mixamo 65 밖 뼈 제거
    const keep = new Set(MIXAMO_65);
    for (const ch of anim.listChannels()) {
      const tn = ch.getTargetNode(), p = ch.getTargetPath();
      if (!tn || !keep.has(tn.getName()) || p === 'scale' || p === 'weights' || (p === 'translation' && tn.getName() !== 'Hips')) { const s = ch.getSampler(); ch.dispose(); s.dispose(); }
    }
    // 루트 모션
    let drift = 0;
    const hipsT = anim.listChannels().find((c) => c.getTargetNode().getName() === 'Hips' && c.getTargetPath() === 'translation');
    const mode = CLIPS[name].root;
    if (hipsT) {
      const out = hipsT.getSampler().getOutput();
      const r = stripRootMotion(out.getArray(), mode);
      drift = r.drift;
      out.setArray(r.values);
    }
    const hips = findNode(doc, 'Hips');
    const meta = { duration: Math.round(clipDuration(anim) * 1000) / 1000, loop: CLIPS[name].loop, drift: Math.round(drift * 1000) / 1000, src: path.basename(inp.file) };
    if (name === 'walk') meta.speed = Math.round(walkSpeed(doc, anim) * 1000) / 1000;
    clipsMeta[name] = meta;
    anim.setName(name);
    for (const a of doc.getRoot().listAnimations()) if (a !== anim) a.dispose();
    if (!baseDoc) {
      baseDoc = doc;
      for (const n of doc.getRoot().listNodes()) { n.setMesh(null); n.setSkin(null); }
      for (const m of doc.getRoot().listMeshes()) m.dispose();
      for (const s of doc.getRoot().listSkins()) s.dispose();
      clipsMeta.__restHipsY = hips ? Math.round(hips.getWorldMatrix()[13] * 1000) / 1000 : 0;
      continue;
    }
    // 기준 뼈대로 옮겨 붙이기(이름으로)
    const bufB = baseDoc.getRoot().listBuffers()[0] || baseDoc.createBuffer();
    const dst = baseDoc.createAnimation(name);
    for (const ch of anim.listChannels()) {
      const bn = findNode(baseDoc, ch.getTargetNode().getName());
      if (!bn) { warnings.push(`${name}: 기준 뼈대에 ${ch.getTargetNode().getName()} 없음`); continue; }
      const s = ch.getSampler();
      const inA = baseDoc.createAccessor().setType('SCALAR').setArray(Float32Array.from(s.getInput().getArray())).setBuffer(bufB);
      const outA = baseDoc.createAccessor().setType(s.getOutput().getType()).setArray(Float32Array.from(s.getOutput().getArray())).setBuffer(bufB);
      const ds = baseDoc.createAnimationSampler().setInput(inA).setOutput(outA).setInterpolation(s.getInterpolation());
      dst.addSampler(ds).addChannel(baseDoc.createAnimationChannel().setTargetNode(bn).setTargetPath(ch.getTargetPath()).setSampler(ds));
    }
    // 다른 캐릭터에서 받은 동작이면 휴식 자세 차이를 경고(Mixamo 는 업로드한 캐릭터에 맞춰 내보낸다)
    let maxA = 0;
    for (const bnm of ['LeftArm', 'RightArm', 'LeftUpLeg', 'Spine']) {
      const a = findNode(doc, bnm), b = findNode(baseDoc, bnm);
      if (a && b) maxA = Math.max(maxA, qangle(a.getRotation(), b.getRotation()));
    }
    if (maxA > 0.17) warnings.push(`${name}: 다른 동작 파일과 휴식 자세가 ${(maxA * 57.3).toFixed(0)}° 다름(다른 캐릭터로 받은 동작?)`);
  }
  if (!baseDoc) throw new Error('쓸 수 있는 동작이 없음');
  await baseDoc.transform(resample({ tolerance: 1e-4 }), prune({ keepLeaves: true }), dedup());
  const scene = baseDoc.getRoot().listScenes()[0];
  const restHipsY = clipsMeta.__restHipsY; delete clipsMeta.__restHipsY;
  scene.setExtras({ rosary: { v: 1, kind: 'anims', restHipsY, clips: clipsMeta } });
  if (opts.meshopt !== false) await baseDoc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  const bin = await io.writeBinary(baseDoc);
  if (opts.out) { fs.mkdirSync(path.dirname(opts.out), { recursive: true }); fs.writeFileSync(opts.out, bin); }
  const summary = summarize(baseDoc, bin.byteLength);
  return { summary, warnings, bytes: bin.byteLength, doc: baseDoc };
}

// ------------------------------------------------------------------ 요약·검증 입력
/** 문서 요약(validateSummary 입력). */
export function summarize(doc, bytes) {
  const root = doc.getRoot();
  const scene = root.listScenes()[0];
  const ex = (scene && scene.getExtras() && scene.getExtras().rosary) || {};
  const lodNodes = ['LOD0', 'LOD1', 'LOD2'].map((n) => findNode(doc, n)).filter(Boolean);
  const kind = ex.kind || (root.listMeshes().length ? 'character' : 'anims');
  const skins = root.listSkins();
  const skinJoints = skins.length ? Math.max(...skins.map((s) => s.listJoints().length)) : 0;
  const joints = kind === 'character' && skins.length ? skins[0].listJoints().map((j) => j.getName()) : root.listNodes().map((n) => n.getName());
  const lods = lodNodes.length ? lodNodes.map((n) => n.getMesh().listPrimitives().reduce((s, p) => s + triCount(p), 0)) : root.listMeshes().map((m) => m.listPrimitives().reduce((s, p) => s + triCount(p), 0));
  const textures = root.listTextures().filter((t) => t.getName() !== '__tintmask').map((t) => { const sz = t.getSize() || [0, 0]; return { name: t.getName(), w: sz[0], h: sz[1], mime: t.getMimeType(), bytes: t.getImage() ? t.getImage().byteLength : 0 }; });
  const materials = root.listMaterials().map((m) => m.getName()).filter((n) => n !== '__tintmask');
  const clips = root.listAnimations().map((a) => ({ name: a.getName(), duration: clipDuration(a), channels: a.listChannels().length, drift: ex.clips && ex.clips[a.getName()] ? ex.clips[a.getName()].drift : 0 }));
  return { kind, bytes, joints, skinJoints, lods, textures, materials, clips, height: ex.height != null ? ex.height : undefined, tintMask: !!ex.tintMask, meta: ex, tintSlots: materials.map((m) => [m, tintSlotFor(m)]) };
}
export async function inspectFile(file) {
  const io = await getIO();
  const doc = await io.read(file);
  return summarize(doc, fs.statSync(file).size);
}
