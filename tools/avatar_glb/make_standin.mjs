#!/usr/bin/env node
// 스탠드인 캐릭터 생성기: 실제 캐릭터 에셋 없이 도구·런타임 파이프라인을 끝까지 시험하기 위한 단순 스킨드 휴머노이드.
//   node tools/avatar_glb/make_standin.mjs [출력 폴더=tools/avatar_glb/work/standin_pack]
// 결과(사용자가 줄 character_pack 과 같은 배치, FBX 대신 glb):
//   S01_standin/S01_standin.glb   재질 3개(skin/hair/cloth), 텍스처 1장(1024 PNG), 'mixamorig:' 접두 이름, Armature 노드 스케일 0.01 + cm 뼈대
//                                  (Blender/three 로 내보낸 Mixamo 와 같은 모양 → 이름 정규화·스케일 굽기를 시험)
//   S02_single/S02_single.glb     재질 1개(Body_MAT) + tint_mask.png(R 피부, G 머리) → 마스크 틴트 경로 시험
//   anim/Idle.glb, Walking.glb(루트 모션 켬 = In Place 끔), Stand To Sit.glb, Sitting Idle.glb, Sit To Stand.glb   (Without Skin: 뼈대 + 동작만)
// 뼈대: Mixamo Standard Skeleton 65 관절과 같은 이름·계층, 뼈 로컬 +Y 가 자식 쪽(Mixamo 규약), T 포즈, 앞 = +Z.
// 이 파일들은 번들에 넣지 않는다(.gitignore: work/).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import { MIXAMO_65 } from './lib/rules.mjs';
import { m4compose, m4mul, m4invert, qmul, qinv, qfromUnit, qfromEuler, qrot } from './lib/mathx.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

// ------------------------------------------------------------------ 뼈대(미터, 앞 +Z, 왼쪽 +X)
const P = { Hips: [0, 1.0, 0], Spine: [0, 1.1, -0.005], Spine1: [0, 1.22, -0.01], Spine2: [0, 1.35, -0.01], Neck: [0, 1.5, 0], Head: [0, 1.585, 0.012], HeadTop_End: [0, 1.79, 0.012],
  LeftEye: [0.032, 1.665, 0.09], RightEye: [-0.032, 1.665, 0.09] };
const PAR = { Hips: null, Spine: 'Hips', Spine1: 'Spine', Spine2: 'Spine1', Neck: 'Spine2', Head: 'Neck', HeadTop_End: 'Head', LeftEye: 'Head', RightEye: 'Head' };
for (const [S, sx] of [['Left', 1], ['Right', -1]]) {
  const X = (v) => [v[0] * sx, v[1], v[2]];
  Object.assign(P, {
    [S + 'Shoulder']: X([0.06, 1.45, -0.005]), [S + 'Arm']: X([0.175, 1.44, -0.01]), [S + 'ForeArm']: X([0.455, 1.44, -0.01]), [S + 'Hand']: X([0.705, 1.44, -0.01]),
    [S + 'UpLeg']: X([0.09, 0.95, 0]), [S + 'Leg']: X([0.09, 0.52, 0.005]), [S + 'Foot']: X([0.09, 0.09, -0.02]), [S + 'ToeBase']: X([0.09, 0.02, 0.105]), [S + 'Toe_End']: X([0.09, 0.02, 0.17])
  });
  Object.assign(PAR, { [S + 'Shoulder']: 'Spine2', [S + 'Arm']: S + 'Shoulder', [S + 'ForeArm']: S + 'Arm', [S + 'Hand']: S + 'ForeArm', [S + 'UpLeg']: 'Hips', [S + 'Leg']: S + 'UpLeg', [S + 'Foot']: S + 'Leg', [S + 'ToeBase']: S + 'Foot', [S + 'Toe_End']: S + 'ToeBase' });
  const F = { Thumb: [[0.725, 1.43, 0.025], 0.03, [0.6, -0.2, 0.75]], Index: [[0.795, 1.442, 0.026], 0.033, [1, 0, 0]], Middle: [[0.8, 1.442, 0.004], 0.036, [1, 0, 0]], Ring: [[0.795, 1.44, -0.016], 0.033, [1, 0, -0.05]], Pinky: [[0.785, 1.437, -0.034], 0.026, [1, 0, -0.12]] };
  for (const [f, [b, len, d]] of Object.entries(F)) {
    let prev = S + 'Hand', p = b;
    const dl = Math.hypot(...d);
    for (let k = 1; k <= 4; k++) {
      const n = `${S}Hand${f}${k}`; P[n] = X(p); PAR[n] = prev; prev = n;
      const l = len * (k === 1 ? 1 : k === 2 ? 0.75 : 0.62);
      p = [p[0] + d[0] / dl * l, p[1] + d[1] / dl * l, p[2] + d[2] / dl * l];
    }
  }
}
const BONES = MIXAMO_65.slice();
for (const b of BONES) if (!P[b]) throw new Error('missing ' + b);
const CHILD = {}; for (const b of BONES) { const p = PAR[b]; if (p && CHILD[p] === undefined && !/End|Eye|Shoulder$/.test(b)) CHILD[p] = b; }
CHILD.Hips = 'Spine'; CHILD.Spine2 = 'Neck'; CHILD.Head = 'HeadTop_End';
for (const S of ['Left', 'Right']) CHILD[S + 'Hand'] = S + 'HandMiddle1';
// 휴식 월드 회전: 로컬 +Y 가 자식 쪽(Mixamo 규약). 잎 뼈는 부모와 같은 방향.
const RW = {};
for (const b of BONES) {
  const c = CHILD[b];
  if (c) { const d = P[c].map((v, i) => v - P[b][i]), l = Math.hypot(...d); RW[b] = qfromUnit([0, 1, 0], d.map((v) => v / l)); }
  else RW[b] = PAR[b] ? RW[PAR[b]] : [0, 0, 0, 1];
}
const restLocal = (b) => {
  const p = PAR[b];
  if (!p) return { t: P[b], r: RW[b] };
  const ip = qinv(RW[p]);
  return { t: qrot(ip, P[b].map((v, i) => v - P[p][i])), r: qmul(ip, RW[b]) };
};

const CM = 100;   // 뼈대는 cm(Armature 0.01)
function addSkeleton(doc, scene) {
  const arm = doc.createNode('Armature').setScale([0.01, 0.01, 0.01]);
  scene.addChild(arm);
  const nodes = {};
  for (const b of BONES) {
    const { t, r } = restLocal(b);
    const n = doc.createNode('mixamorig:' + b).setTranslation(t.map((v) => v * CM)).setRotation(r);
    nodes[b] = n;
    (PAR[b] ? nodes[PAR[b]] : arm).addChild(n);
  }
  return { arm, nodes };
}

// ------------------------------------------------------------------ 메시(테이퍼 캡슐을 뼈에 붙인다)
const SLOT_U = { skin: 0, hair: 1 / 3, cloth: 2 / 3 };
function capsule(acc, a, b, r0, r1, bone, child, slot, o = {}) {
  const nu = o.nu || 16, nv = o.nv || 10, d = b.map((v, i) => v - a[i]), L = Math.hypot(...d), dir = d.map((v) => v / L);
  let hint = o.hint || (Math.abs(dir[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0]);
  const hd = hint[0] * dir[0] + hint[1] * dir[1] + hint[2] * dir[2];
  let e1 = hint.map((v, i) => v - hd * dir[i]); const l1 = Math.hypot(...e1); e1 = e1.map((v) => v / l1);
  const e2 = [dir[1] * e1[2] - dir[2] * e1[1], dir[2] * e1[0] - dir[0] * e1[2], dir[0] * e1[1] - dir[1] * e1[0]];
  const sx = o.sx || 1, sz = o.sz || 1, base = acc.pos.length / 3;
  const s0 = -r0 * (o.cap0 === false ? 0 : 1), s1 = L + r1 * (o.cap1 === false ? 0 : 1);
  for (let j = 0; j <= nv; j++) {
    const s = s0 + (s1 - s0) * j / nv;
    let rad = s < 0 ? Math.sqrt(Math.max(0, r0 * r0 - s * s)) : s > L ? Math.sqrt(Math.max(0, r1 * r1 - (s - L) * (s - L))) : r0 + (r1 - r0) * s / L;
    if (j === 0 && o.cap0 !== false) rad = 0; if (j === nv && o.cap1 !== false) rad = 0;
    const c = a.map((v, i) => v + dir[i] * Math.max(0, Math.min(L, s)) + dir[i] * (s < 0 ? s : s > L ? s - L : 0));
    const f = Math.max(0, Math.min(1, s / L));
    const wc = child ? 0.5 * Math.max(0, Math.min(1, (f - 0.8) / 0.25)) ** 2 * (3 - 2 * Math.max(0, Math.min(1, (f - 0.8) / 0.25))) : 0;
    for (let i = 0; i <= nu; i++) {
      const th = 2 * Math.PI * i / nu, cx = Math.cos(th) * sx, cz = Math.sin(th) * sz;
      const nrm = e1.map((v, k) => v * cx + e2[k] * cz);
      acc.pos.push(c[0] + nrm[0] * rad, c[1] + nrm[1] * rad, c[2] + nrm[2] * rad);
      const ax = s < 0 ? -1 : s > L ? 1 : 0, nn = rad > 0 ? nrm.map((v, k) => v * (ax ? Math.sqrt(1 - Math.min(1, ((s < 0 ? s : s - L) / (s < 0 ? r0 : r1)) ** 2)) : 1) + dir[k] * (ax ? (s < 0 ? s / r0 : (s - L) / r1) : 0)) : dir.map((v) => v * (j === 0 ? -1 : 1));
      const nl = Math.hypot(...nn) || 1; acc.nor.push(nn[0] / nl, nn[1] / nl, nn[2] / nl);
      acc.uv.push(SLOT_U[slot] + (i / nu) * 0.32 + 0.005, 0.02 + 0.96 * j / nv);
      acc.j.push(BONES.indexOf(bone), child ? BONES.indexOf(child) : 0, 0, 0);
      acc.w.push(1 - wc, wc, 0, 0);
    }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const p0 = base + j * (nu + 1) + i, p1 = p0 + 1, p2 = p0 + nu + 1, p3 = p2 + 1;
    acc.idx[slot].push(p0, p2, p1, p1, p2, p3);
  }
}
function sphere(acc, c, r, bone, slot, o = {}) { capsule(acc, [c[0], c[1] - 1e-4, c[2]], [c[0], c[1] + 1e-4, c[2]], r, r, bone, null, slot, { nu: o.nu || 20, nv: o.nv || 14, sx: o.sx, sz: o.sz, hint: [0, 0, 1] }); }

function buildMesh() {
  const acc = { pos: [], nor: [], uv: [], j: [], w: [], idx: { skin: [], hair: [], cloth: [] } };
  const p = (b) => P[b], mid = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  // 몸통(옷)
  capsule(acc, p('Hips'), p('Spine'), 0.15, 0.145, 'Hips', 'Spine', 'cloth', { sx: 1.15, sz: 0.8, nu: 24, cap1: false });
  capsule(acc, p('Spine'), p('Spine1'), 0.145, 0.15, 'Spine', 'Spine1', 'cloth', { sx: 1.1, sz: 0.78, nu: 24, cap0: false, cap1: false });
  capsule(acc, p('Spine1'), p('Spine2'), 0.15, 0.16, 'Spine1', 'Spine2', 'cloth', { sx: 1.1, sz: 0.75, nu: 24, cap0: false, cap1: false });
  capsule(acc, p('Spine2'), p('Neck'), 0.16, 0.07, 'Spine2', 'Neck', 'cloth', { sx: 1.15, sz: 0.72, nu: 24, cap0: false });
  capsule(acc, p('Neck'), p('Head'), 0.05, 0.05, 'Neck', 'Head', 'skin', { nu: 14, nv: 6 });
  // 머리·얼굴(코로 앞을 보이게), 머리카락(위·뒤를 덮는 껍질), 눈
  const hc = [0, 1.675, 0.012];
  sphere(acc, hc, 0.105, 'Head', 'skin', { sx: 0.92, sz: 1.0, nu: 24, nv: 16 });
  sphere(acc, [0, 1.655, 0.115], 0.018, 'Head', 'skin', { nu: 10, nv: 6 });
  capsule(acc, [0, 1.70, -0.005], [0, 1.73, 0.0], 0.112, 0.105, 'Head', null, 'hair', { nu: 24, nv: 12, sx: 0.95 });
  sphere(acc, [0.035, 1.68, 0.098], 0.012, 'Head', 'hair', { nu: 8, nv: 6 });
  sphere(acc, [-0.035, 1.68, 0.098], 0.012, 'Head', 'hair', { nu: 8, nv: 6 });
  for (const S of ['Left', 'Right']) {
    capsule(acc, p(S + 'Shoulder'), p(S + 'Arm'), 0.06, 0.055, S + 'Shoulder', S + 'Arm', 'cloth', { nu: 14, nv: 6 });
    capsule(acc, p(S + 'Arm'), p(S + 'ForeArm'), 0.052, 0.045, S + 'Arm', S + 'ForeArm', 'cloth', { nu: 16 });
    capsule(acc, p(S + 'ForeArm'), p(S + 'Hand'), 0.044, 0.034, S + 'ForeArm', S + 'Hand', 'cloth', { nu: 16 });
    capsule(acc, p(S + 'Hand'), mid(p(S + 'Hand'), p(S + 'HandMiddle1'), 0.95), 0.026, 0.028, S + 'Hand', null, 'skin', { nu: 12, nv: 6, hint: [0, 0, 1], sx: 1.5, sz: 0.55 });
    for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (let k = 1; k <= 3; k++) {
      const b = `${S}Hand${f}${k}`, c = `${S}Hand${f}${k + 1}`;
      capsule(acc, p(b), p(c), f === 'Thumb' ? 0.011 : 0.009, f === 'Thumb' ? 0.010 : 0.008, b, k < 3 ? c : null, 'skin', { nu: 8, nv: 5 });
    }
    capsule(acc, p(S + 'UpLeg'), p(S + 'Leg'), 0.085, 0.058, S + 'UpLeg', S + 'Leg', 'cloth', { nu: 18, nv: 12 });
    capsule(acc, p(S + 'Leg'), p(S + 'Foot'), 0.056, 0.042, S + 'Leg', S + 'Foot', 'cloth', { nu: 16, nv: 12 });
    capsule(acc, p(S + 'Foot'), p(S + 'ToeBase'), 0.045, 0.04, S + 'Foot', S + 'ToeBase', 'hair', { nu: 12, nv: 6, sx: 1.0, sz: 0.7, hint: [1, 0, 0] });
    capsule(acc, p(S + 'ToeBase'), p(S + 'Toe_End'), 0.04, 0.035, S + 'ToeBase', null, 'hair', { nu: 12, nv: 4, sz: 0.6, hint: [1, 0, 0] });
  }
  return acc;
}

async function makeTexture(file, mask) {
  const W = 1024, H = 1024, px = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, o = (y * W + x) * 3; let c;
    if (mask) c = u < 1 / 3 ? [255, 0, 0] : u < 2 / 3 ? [0, 255, 0] : [0, 0, 0];
    else if (u < 1 / 3) c = [236 - (y / H) * 20, 214 - (y / H) * 20, 200 - (y / H) * 20];                 // 피부(밝은 중성; 틴트로 곱한다)
    else if (u < 2 / 3) c = [205, 205, 205];                                                                    // 머리(중간 회색; 틴트로 곱한다)
    else { const s = ((x >> 5) + (y >> 5)) & 1; c = s ? [70, 96, 150] : [92, 120, 176]; if (y % 128 < 6) c = [230, 220, 190]; }   // 옷(체크 + 줄)
    px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
  }
  return sharp(px, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer().then((b) => { if (file) fs.writeFileSync(file, b); return b; });
}

async function writeCharacter(file, single) {
  const doc = new Document(); const buf = doc.createBuffer();
  const scene = doc.createScene('Scene'); doc.getRoot().setDefaultScene(scene);
  const { arm, nodes } = addSkeleton(doc, scene);
  const acc = buildMesh();
  const A = (type, arr) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
  const pos = A('VEC3', new Float32Array(acc.pos)), nor = A('VEC3', new Float32Array(acc.nor)), uv = A('VEC2', new Float32Array(acc.uv.map((v, i) => (i & 1 ? 1 - v : v))));
  const jn = A('VEC4', new Uint16Array(acc.j)), wt = A('VEC4', new Float32Array(acc.w));
  const tex = doc.createTexture('standin_base').setImage(new Uint8Array(await makeTexture(null, false))).setMimeType('image/png');
  const mats = {}, mesh = doc.createMesh('Body');
  for (const slot of single ? ['body'] : ['skin', 'hair', 'cloth']) {
    mats[slot] = doc.createMaterial(single ? 'Body_MAT' : slot).setBaseColorTexture(tex).setRoughnessFactor(0.8).setMetallicFactor(0);
    const ids = single ? [...acc.idx.skin, ...acc.idx.hair, ...acc.idx.cloth] : acc.idx[slot];
    mesh.addPrimitive(doc.createPrimitive().setAttribute('POSITION', pos).setAttribute('NORMAL', nor).setAttribute('TEXCOORD_0', uv)
      .setAttribute('JOINTS_0', jn).setAttribute('WEIGHTS_0', wt).setIndices(A('SCALAR', new Uint32Array(ids))).setMaterial(mats[slot]));
  }
  // 스킨: 무게가 있는 뼈만(Mixamo 처럼 끝 뼈·눈 제외) — 정점 JOINTS 는 BONES 인덱스이므로 그대로 쓰려고 65개 모두 넣고 나중 단계가 정리하게 한다
  const skin = doc.createSkin('Armature');
  const worldOf = (b) => { let m = m4compose([0, 0, 0], [0, 0, 0, 1], [0.01, 0.01, 0.01]); const chain = []; for (let x = b; x; x = PAR[x]) chain.unshift(x); for (const c of chain) { const n = nodes[c]; m = m4mul(m, m4compose(n.getTranslation(), n.getRotation(), n.getScale())); } return m; };
  const ibm = new Float32Array(BONES.length * 16);
  BONES.forEach((b, i) => { skin.addJoint(nodes[b]); ibm.set(m4invert(worldOf(b)), i * 16); });
  skin.setInverseBindMatrices(A('MAT4', ibm)).setSkeleton(nodes.Hips);
  scene.addChild(doc.createNode('Body').setMesh(mesh).setSkin(skin));
  void arm;
  await new NodeIO().write(file, doc);
  return { tris: acc.idx.skin.length / 3 + acc.idx.hair.length / 3 + acc.idx.cloth.length / 3 };
}

// ------------------------------------------------------------------ 동작(휴식 자세 축 기준 회전 E 를 뼈 로컬로: local = rest · (RW⁻¹ E RW))
const rx = (a) => qfromEuler(a, 0, 0), ry = (a) => qfromEuler(0, a, 0), rz = (a) => qfromEuler(0, 0, a);
const Q = (...qs) => qs.reduce((a, b) => qmul(a, b), [0, 0, 0, 1]);
const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
function standPose(t, o = {}) {
  const br = Math.sin(t * 2.2) * 0.015, sw = o.swing || 0, ph = o.ph || 0, w = o.walk || 0;
  const E = {
    Spine: rx(br), Spine2: rx(br * 0.5), Neck: rx(-0.02), Head: rx(0.03 + 0.01 * Math.sin(t * 0.9)),
    LeftArm: Q(rx(-sw * Math.sin(ph) * 0.6), rz(-1.27)), RightArm: Q(rx(sw * Math.sin(ph) * 0.6), rz(1.27)),
    LeftForeArm: ry(-0.18 - 0.25 * w), RightForeArm: ry(0.18 + 0.25 * w),
    LeftUpLeg: rx(-0.42 * w * Math.sin(ph)), RightUpLeg: rx(0.42 * w * Math.sin(ph)),
    LeftLeg: rx(0.06 + 0.75 * w * Math.max(0, Math.sin(ph + 1.9))), RightLeg: rx(0.06 + 0.75 * w * Math.max(0, Math.sin(ph + 1.9 + Math.PI))),
    LeftFoot: rx(-0.1 * w * Math.sin(ph)), RightFoot: rx(0.1 * w * Math.sin(ph))
  };
  for (const S of ['Left', 'Right']) for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (let k = 1; k <= 3; k++) E[`${S}Hand${f}${k}`] = rz((S === 'Left' ? -1 : 1) * 0.25);
  return { E, hips: [0.01 * Math.sin(t * 0.7), 1.0 + br * 0.2 - 0.025 * w * Math.abs(Math.cos(ph)), 0] };
}
function sitPose(t) {
  const br = Math.sin(t * 2.0) * 0.012;
  const E = {
    Spine: rx(0.06 + br), Spine2: rx(0.04), Neck: rx(0.05), Head: rx(0.08),
    LeftUpLeg: rx(-1.52), RightUpLeg: rx(-1.52), LeftLeg: rx(1.52), RightLeg: rx(1.52),
    LeftArm: Q(rx(-0.55), rz(-1.15)), RightArm: Q(rx(-0.55), rz(1.15)), LeftForeArm: ry(-1.05), RightForeArm: ry(1.05)
  };
  for (const S of ['Left', 'Right']) for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (let k = 1; k <= 3; k++) E[`${S}Hand${f}${k}`] = rz((S === 'Left' ? -1 : 1) * 0.3);
  return { E, hips: [0, 0.56, -0.22] };
}
function mixPose(a, b, f) {
  const E = {};
  for (const k of new Set([...Object.keys(a.E), ...Object.keys(b.E)])) {
    const x = a.E[k] || [0, 0, 0, 1], y = b.E[k] || [0, 0, 0, 1], d = x[0] * y[0] + x[1] * y[1] + x[2] * y[2] + x[3] * y[3], s = d < 0 ? -1 : 1;
    const q = x.map((v, i) => v + (y[i] * s - v) * f), l = Math.hypot(...q); E[k] = q.map((v) => v / l);
  }
  return { E, hips: a.hips.map((v, i) => v + (b.hips[i] - v) * f) };
}
const CLIPS = {
  'Idle': { dur: 4, pose: (t) => standPose(t) },
  'Walking': { dur: 1.1, pose: (t) => { const p = standPose(t, { walk: 1, swing: 1, ph: 2 * Math.PI * t / 1.1 }); p.hips[2] += 1.3 * t; return p; } },   // In Place 끔(앞으로 1.3m/s)
  'Stand To Sit': { dur: 1.4, pose: (t) => mixPose(standPose(t), sitPose(t), sm(t / 1.4)) },
  'Sitting Idle': { dur: 4, pose: (t) => sitPose(t) },
  'Sit To Stand': { dur: 1.4, pose: (t) => mixPose(sitPose(t), standPose(t), sm(t / 1.4)) }
};
async function writeAnim(file, clip) {
  const doc = new Document(); const buf = doc.createBuffer();
  const scene = doc.createScene('Scene'); doc.getRoot().setDefaultScene(scene);
  const { nodes } = addSkeleton(doc, scene);
  const fps = 30, n = Math.round(clip.dur * fps) + 1, times = new Float32Array(n);
  for (let i = 0; i < n; i++) times[i] = i / fps;
  const input = doc.createAccessor().setType('SCALAR').setArray(times).setBuffer(buf);
  const anim = doc.createAnimation('mixamo.com');
  const rot = {}; for (const b of BONES) rot[b] = new Float32Array(n * 4);
  const hips = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const { E, hips: h } = clip.pose(times[i]);
    for (const b of BONES) {
      const e = E[b] || [0, 0, 0, 1], rl = restLocal(b).r, d = qmul(qinv(RW[b]), qmul(e, RW[b]));
      rot[b].set(qmul(rl, d), i * 4);
    }
    hips.set(h.map((v) => v * CM), i * 3);
  }
  const add = (node, pathName, type, arr) => {
    const s = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType(type).setArray(arr).setBuffer(buf)).setInterpolation('LINEAR');
    anim.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(pathName).setSampler(s));
  };
  for (const b of BONES) add(nodes[b], 'rotation', 'VEC4', rot[b]);
  add(nodes.Hips, 'translation', 'VEC3', hips);
  await new NodeIO().write(file, doc);
}

export async function makeStandin(outDir) {
  fs.mkdirSync(path.join(outDir, 'S01_standin'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'S02_single'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'anim'), { recursive: true });
  const a = await writeCharacter(path.join(outDir, 'S01_standin', 'S01_standin.glb'), false);
  await writeCharacter(path.join(outDir, 'S02_single', 'S02_single.glb'), true);
  await makeTexture(path.join(outDir, 'S02_single', 'tint_mask.png'), true);
  for (const [name, clip] of Object.entries(CLIPS)) await writeAnim(path.join(outDir, 'anim', name + '.glb'), clip);
  return { tris: a.tris, bones: BONES.length, clips: Object.keys(CLIPS) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = path.resolve(process.argv[2] || path.join(here, 'work/standin_pack'));
  makeStandin(out).then((r) => console.log(`standin → ${out}: ${r.tris} tris, ${r.bones} bones, clips ${r.clips.join(', ')}`));
}
