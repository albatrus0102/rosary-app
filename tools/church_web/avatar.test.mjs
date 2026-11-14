// 사용: node --test tools/church_web/avatar.test.mjs — 아바타(클레이 스타일) 지오메트리 예산(삼각형 수)과 색상표 모양을 확인한다(DOM·WebGL 불필요).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/church');
const ctx = vm.createContext({ console, Math, Date, Float32Array, Uint16Array, Uint8Array });
ctx.window = ctx;
for (const f of ['three.min.js', 'palette.js', 'baptismal_names.js', 'geo.js', 'label_fit.js', 'avatar.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const A = ctx.ChurchAvatar, P = ctx.ChurchPalette, N = ctx.ChurchNames;
const known = JSON.parse(fs.readFileSync(path.resolve(root, '../../tools/names/known_names.json'), 'utf8'));

test('palette sizes and HEX format', () => {
  assert.equal(P.skin.length, 4);
  assert.equal(P.stylesF.length, 4);
  assert.equal(P.stylesM.length, 4);
  assert.equal(P.hair.length, 10);
  assert.equal(P.outfit.length, 12);
  assert.equal(P.pants.length, 12);
  for (const c of [...P.skin, ...P.hair, ...P.outfit, ...P.pants]) assert.match(c, /^#[0-9A-F]{6}$/);
});

test('baptismal names: one unified list within the wire cap, old lists map into it by name', () => {
  const CAP = 4096; // 서버 NAME_MAX(4095) + 1
  const list = Array.from(N.list);
  assert.ok(list.length >= 3774 && list.length <= CAP, `length ${list.length}`);
  assert.equal(new Set(list).size, list.length);
  for (const n of list) assert.ok(n.length >= 1 && n === n.trim() && !/[|\t\n]/.test(n), n);
  assert.equal(list[N.def], '마리아');
  assert.equal(P.namesF, undefined);
  // 옛 성별별 목록·옛 40개 목록의 모든 이름이 같은 이름의 새 인덱스를 갖는다
  assert.deepEqual(Array.from(N.oldF).map((i) => list[i]), known.female);
  assert.deepEqual(Array.from(N.oldM).map((i) => list[i]), known.male);
  assert.deepEqual(Array.from(N.legacy).map((i) => list[i]), known.legacy);
  assert.deepEqual(Array.from(N.oldF.slice(0, 3)).map((i) => list[i]), ['마리아', '안나', '엘리사벳']);
  assert.deepEqual(Array.from(N.oldM.slice(0, 3)).map((i) => list[i]), ['요셉', '베드로', '바오로']);
});

test('avatar triangle budgets per LOD for all 8 gender/style combinations', () => {
  const s = A.stats();
  for (let g = 0; g < 2; g++) {
    for (let i = 0; i < 4; i++) {
      assert.ok(s.near[`g${g}s${i}`] <= 6000, `near g${g} style ${i}: ${s.near[`g${g}s${i}`]}`);
      assert.ok(s.mid[`g${g}s${i}`] <= 1500, `mid g${g} style ${i}: ${s.mid[`g${g}s${i}`]}`);
    }
  }
  for (let i = 0; i < 4; i++) {
    assert.ok(s.near['style' + i] <= 6000 && s.mid['style' + i] <= 1500);
  }
  for (const n of s.far) assert.ok(n <= 400, `far impostor: ${n}`);
});

test('normalizeCfg: nv 2 keeps the unified name index, older formats are migrated by name', () => {
  const n = A.normalizeCfg, list = N.list;
  assert.deepEqual({ ...n({ g: 1, skin: 2, style: 3, hair: 9, outfit: 11, name: 3700, nv: 2 }) }, { g: 1, skin: 2, style: 3, hair: 9, outfit: 11, name: 3700, nv: 2 });
  assert.equal(n({ g: 0, skin: 0, style: 0, hair: 0, outfit: 0, name: list.length - 1, nv: 2 }).name, list.length - 1);
  assert.equal(n({ skin: 0, style: 0, hair: 0, outfit: 0, name: 5, nv: 2 }).g, 0);
  // 이미 옮긴 값을 다시 넣어도 그대로다
  const once = n({ g: 1, skin: 1, style: 1, hair: 1, outfit: 1, name: 3 });
  assert.deepEqual({ ...n(once) }, { ...once });
  // 옛 성별별 형식(nv 없음, g 있음): 여 4 = 아녜스, 남 3 = 요한, 남 70 = 파트리치오
  assert.equal(list[n({ g: 0, skin: 0, style: 0, hair: 0, outfit: 0, name: 4 }).name], '아녜스');
  assert.equal(list[n({ g: 1, skin: 0, style: 0, hair: 0, outfit: 0, name: 3 }).name], '요한');
  assert.equal(list[n({ g: 1, skin: 0, style: 0, hair: 0, outfit: 0, name: 70 }).name], '파트리치오');
  for (let i = 0; i < known.female.length; i++) assert.equal(list[n({ g: 0, name: i }).name], known.female[i]);
  for (let i = 0; i < known.male.length; i++) assert.equal(list[n({ g: 1, name: i }).name], known.male[i]);
  // 가장 옛 형식(g 없음): name 22 = 요한(남성), 머리 모양 3(곱슬) → 웨이브(2)
  const old = n({ skin: 1, style: 3, hair: 2, outfit: 5, name: 22 });
  assert.equal(old.g, 1);
  assert.equal(list[old.name], '요한');
  assert.equal(old.style, 2);
  const oldF = n({ skin: 1, style: 2, hair: 2, outfit: 5, name: 4 });
  assert.equal(oldF.g, 0);
  assert.equal(list[oldF.name], '데레사');
  assert.equal(oldF.style, 3);
  // 범위를 벗어난 값은 허용 범위로 맞춘다(이름은 기본 이름 마리아)
  const wild = n({ g: 1, skin: 99, style: -3, hair: 123, outfit: 77, name: 1000 });
  assert.ok(wild.skin < 4 && wild.style < 4 && wild.hair < 10 && wild.outfit < 12);
  assert.equal(list[wild.name], '마리아');
  assert.equal(list[n({ g: 0, name: 99999, nv: 2 }).name], '마리아');
  assert.equal(list[n({ g: 0, name: -5, nv: 2 }).name], list[0]);
  assert.equal(n({ g: 0, name: 7, nv: 3 }).name, N.oldF[7]);
  assert.equal(n(undefined).g, 0);
});

test('realistic adult proportions', () => {
  assert.equal(A.HEIGHT, 1.7);
});

// ---------------------------------------------------------------- 신자석 정합·무릎 꿇기(SPEC §28)
vm.runInContext(fs.readFileSync(path.join(root, 'scene_logic.js'), 'utf8'), ctx, { filename: 'scene_logic.js' });
// 그림자·옷감 텍스처용 가짜 캔버스(그리기 호출은 모두 무시)
const g2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => g2d), set: (t, k, v) => { t[k] = v; return true; } });
g2d.getImageData = (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
g2d.createImageData = g2d.getImageData;
g2d.measureText = () => ({ width: 10 });
ctx.document = { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => g2d }) };
const PEW = ctx.ChurchLogic.PEW, AH = ctx.ChurchLogic.pewAhead(1.9), LC = ctx.ChurchLogic.C;
const SPOT = { fwd: AH.kneel, y: PEW.KNEEL_TOP, rail: true };
// 좌석 중심(원점)에 앉아 -z(제대 쪽)를 보는 아바타. u = 제대 쪽 거리 = -z.
function seatedAvatar() {
  const av = new A.Avatar({}, { showTag: false });
  av.setPose(0, 0, 0, 0); av.setSeated(true); av.snapPose(); av.update(1 / 60, 0);
  return av;
}
function joint(av, name) {
  av.root.updateMatrixWorld(true);
  const i = av.skeleton.bones.findIndex((b) => b.name === name);
  assert.ok(i >= 0, 'bone ' + name);
  const e = av.skeleton.bones[i].matrixWorld.elements;
  return { x: e[12], y: e[13], u: -e[14] };
}
function run(av, sec, each) { const n = Math.round(sec * 60); for (let i = 1; i <= n; i++) { av.update(1 / 60, i / 60); if (each) each(i / 60); } }
// 앞줄 등받이 뒷면(뒷줄 사람 쪽)의 u — 높이 y 에서
const backRear = (y) => 1.9 + PEW.BACK_U - PEW.BACK_T - Math.tan(PEW.BACK_TILT) * (y - PEW.SEAT_TOP);

test('seated: hips on the seat board, knees and feet in the legroom, praying head clear of the row ahead', () => {
  const av = seatedAvatar();
  const hip = joint(av, 'ulR'), knee = joint(av, 'llR'), foot = joint(av, 'ftR');
  // 엉덩이: 좌석판 위(앞뒤 범위 안), 좌석 윗면보다 조금 위
  assert.ok(hip.u > PEW.SEAT_REAR && hip.u < PEW.SEAT_FRONT, 'hip u ' + hip.u);
  assert.ok(hip.y > PEW.SEAT_TOP && hip.y < PEW.SEAT_TOP + 0.2, 'hip y ' + hip.y);
  // 등은 등받이 앞면보다 앞
  assert.ok(hip.u - 0.13 >= PEW.BACK_U - 0.02, 'back vs backrest');
  // 무릎·발: 좌석 앞끝 근처에서 앞줄 무릎틀 전까지(겹치지 않는다)
  assert.ok(knee.u + A.KNEEL.KNEE_R < 1.9 + PEW.KNEEL_U0 - 0.3, 'knee u ' + knee.u);
  assert.ok(foot.u + 0.2 < 1.9 + PEW.KNEEL_U0, 'toe vs kneeler');
  assert.ok(foot.y > 0.04 && foot.y < 0.14, 'ankle on the floor ' + foot.y);
  // 기도(고개 숙임 + 손 모음): 머리·손이 앞줄 선반/등받이에 닿지 않는다
  av.setPray(true); run(av, 2);
  const head = joint(av, 'head'), hand = joint(av, 'haR');
  assert.ok(head.u + 0.2 < 1.9 + PEW.SHELF_U0, 'head ' + head.u);
  assert.ok(hand.u + 0.12 < 1.9 + PEW.SHELF_U0, 'hand ' + hand.u);
  assert.ok(hand.y > PEW.SEAT_TOP + 0.15, 'hands above the lap ' + hand.y);
});

test('kneelPose: knees rest on the kneeler top, ankles on the floor', () => {
  const kp = A.kneelPose(PEW.KNEEL_TOP);
  assert.ok(Math.abs(kp.kneeY - A.KNEEL.KNEE_R - PEW.KNEEL_TOP) < 1e-9);
  assert.ok(kp.hipY > kp.kneeY + 0.35 && kp.shinBack > 0.3 && kp.shinBack < 0.41);
  // 바닥(무릎틀 없음)에서도 유효
  const k0 = A.kneelPose(0);
  assert.ok(Math.abs(k0.kneeY - A.KNEEL.KNEE_R) < 0.01 && k0.hipY < kp.hipY);
});

test('kneel transition: smooth 0.6~0.8 s both ways, only while seated', () => {
  const av = seatedAvatar();
  assert.ok(A.KNEEL.DUR >= 0.6 && A.KNEEL.DUR <= 0.8);
  av.setKneel(true, SPOT);
  let prev = 0, maxStep = 0, tDone = -1, prevHipU = joint(av, 'ulR').u, maxMove = 0;
  run(av, 1.0, (t) => {
    assert.ok(av.kneelAmt >= prev - 1e-9, 'monotonic');
    maxStep = Math.max(maxStep, av.kneelAmt - prev); prev = av.kneelAmt;
    const hu = joint(av, 'ulR').u; maxMove = Math.max(maxMove, Math.abs(hu - prevHipU)); prevHipU = hu;
    if (tDone < 0 && av.kneelAmt === 1) tDone = t;
  });
  assert.ok(tDone >= 0.6 && tDone <= 0.8, 'done at ' + tDone);
  assert.ok(maxStep < 0.06, 'no jump: ' + maxStep);
  assert.ok(maxMove < 0.06, 'body moves < 6 cm per frame: ' + maxMove);
  assert.ok(Math.abs(av.kneelOffset() - SPOT.fwd) < 1e-9);
  av.setKneel(false); prev = 1; tDone = -1;
  run(av, 1.0, (t) => { assert.ok(av.kneelAmt <= prev + 1e-9); prev = av.kneelAmt; if (tDone < 0 && av.kneelAmt === 0) tDone = t; });
  assert.ok(tDone >= 0.6 && tDone <= 0.8, 'back at ' + tDone);
  assert.equal(av.kneelOffset(), 0);
  // 서 있으면 무릎 꿇기는 보이지 않는다(sitAmt 로 가린다)
  const st = new A.Avatar({}, { showTag: false });
  st.setPose(0, 0, 0, 0); st.setKneel(true, SPOT); run(st, 1);
  assert.equal(st.kneelOffset(), 0);
  assert.ok(joint(st, 'ulR').y > 0.8);
});

test('kneeling: knees on the kneeler, nothing inside the back of the row ahead, hands on its top rail', () => {
  const av = seatedAvatar();
  av.setPray(true); av.setKneel(true, SPOT); run(av, 2.5);
  const hip = joint(av, 'ulR'), knee = joint(av, 'llR'), kneeL = joint(av, 'llL'), ankle = joint(av, 'ftR');
  // 무릎: 무릎틀 위(앞뒤 범위 안, 윗면에 닿음)
  for (const k of [knee, kneeL]) {
    assert.ok(k.u > 1.9 + PEW.KNEEL_U0 && k.u < 1.9 + PEW.KNEEL_U1, 'knee u ' + k.u);
    assert.ok(Math.abs(k.y - A.KNEEL.KNEE_R - PEW.KNEEL_TOP) < 0.01, 'knee y ' + k.y);
    // 무릎 앞면이 앞줄 등받이(다리 받침) 뒷면을 넘지 않는다
    assert.ok(k.u + A.KNEEL.KNEE_R <= 1.9 + PEW.BACK_U - PEW.BACK_T, 'knee vs board');
  }
  // 정강이·발은 뒤로(바닥 위), 내 좌석 앞끝보다 앞
  assert.ok(ankle.u < knee.u - 0.3 && ankle.u > PEW.SEAT_FRONT + 0.1, 'ankle u ' + ankle.u);
  assert.ok(ankle.y > 0.03 && ankle.y < 0.16, 'ankle y ' + ankle.y);
  // 상체는 세운다: 고관절이 무릎 위쪽·조금 뒤
  assert.ok(hip.y > knee.y + 0.33 && hip.u < knee.u && hip.u > knee.u - 0.15);
  // 몸통·머리가 앞줄 등받이 뒷면/선반을 파고들지 않는다
  const chest = joint(av, 'chest'), head = joint(av, 'head');
  assert.ok(chest.u + A.KNEEL.TORSO_HALF <= backRear(Math.min(chest.y, PEW.BACK_TOP)) + 0.02, 'chest ' + chest.u + ' vs ' + backRear(chest.y));
  assert.ok(hip.u + 0.11 <= 1.9 + PEW.SHELF_U0 + 0.02 || hip.y > PEW.SHELF_Y + 0.12 || hip.y < PEW.SHELF_Y - 0.12, 'belly vs shelf');
  assert.ok(head.y > PEW.BACK_TOP + 0.25, 'head above the rail ' + head.y);
  // 모은 손: 등받이 윗단 위(높이·앞뒤)
  const hR = joint(av, 'haR'), hL = joint(av, 'haL');
  const railU = 1.9 + PEW.BACK_U - PEW.BACK_T / 2 - Math.tan(PEW.BACK_TILT) * (PEW.BACK_TOP - PEW.SEAT_TOP);
  for (const h of [hR, hL]) {
    assert.ok(h.y >= PEW.BACK_TOP + 0.01 && h.y <= PEW.BACK_TOP + 0.14, 'hand y ' + h.y);   // 손목이 윗단 위(파고들지 않는다)
    assert.ok(Math.abs(h.u - railU) < 0.14, 'hand u ' + h.u + ' rail ' + railU);
  }
  assert.ok(Math.abs(hR.x - hL.x) < 0.09, 'hands together');
  void LC;
});

// ---------------------------------------------------------------- 새 실루엣(큰 머리·종 모양 원피스)의 메시 비침투(docs/church/AVATAR_LOOK.md §5)
// 뼈 위치가 아니라 '실제 스키닝된 정점'으로 확인한다: 좌석판·등받이·앞줄 등받이·책 선반·무릎틀을 옷과 머리가 파고들지 않는다.
function skinned(av, level = 'near') {
  av.root.updateMatrixWorld(true);
  const bones = av.skeleton.bones, inv = av.skeleton.boneInverses, mats = bones.map((b, i) => b.matrixWorld.clone().multiply(inv[i]));
  const out = [];
  for (const kind of ['smooth', 'cloth']) {
    const g = av.meshes[level][kind].geometry, p = g.attributes.position.array, si = g.attributes.skinIndex.array, sw = g.attributes.skinWeight.array;
    for (let v = 0; v < p.length / 3; v++) {
      let x = 0, y = 0, z = 0;
      for (let k = 0; k < 4; k++) {
        const w = sw[v * 4 + k]; if (!w) continue;
        const e = mats[si[v * 4 + k]].elements, px = p[v * 3], py = p[v * 3 + 1], pz = p[v * 3 + 2];
        x += w * (e[0] * px + e[4] * py + e[8] * pz + e[12]); y += w * (e[1] * px + e[5] * py + e[9] * pz + e[13]); z += w * (e[2] * px + e[6] * py + e[10] * pz + e[14]);
      }
      out.push({ x, y, u: -z, kind, ry: p[v * 3 + 1] });   // ry = 휴식 자세 높이(부위 구분용)
    }
  }
  return out;
}
const cfgOf = (g, style) => ({ g, skin: 0, style, hair: 0, outfit: 0, name: 0, nv: 2 });
const TILT = Math.tan(PEW.BACK_TILT), EPS = 0.02;

test('look: big head, same skeleton; name tag sits above the hair', () => {
  assert.ok(A.HEAD.S >= 1.4 && A.HEAD.S <= 1.7);
  for (const g of [0, 1]) for (let s = 0; s < 4; s++) {
    const av = new A.Avatar(cfgOf(g, s), { showTag: false }); av.setPose(0, 0, 0, 0); av.snapPose(); av.update(1 / 60, 0);
    const vs = skinned(av), top = Math.max(...vs.map((v) => v.y)), wide = Math.max(...vs.map((v) => Math.abs(v.x)));
    assert.ok(top > 1.80 && top < 1.88 + A.HEAD.UP - 0.03, `g${g}s${s} top ${top}`);   // 이름표 기준 높이(1.88 + UP)보다 아래
    assert.ok(wide < 0.30, `g${g}s${s} half width ${wide}`);                           // 충돌 반지름(0.3) 안
    const feet = Math.min(...vs.map((v) => v.y)); assert.ok(feet > -0.01 && feet < 0.03, 'feet ' + feet);
  }
  assert.deepEqual(Array.from(A.HEM), [0.52, 0.76]);
});

test('look: seated mesh stays above the seat board, in front of the backrest and clear of the row ahead', () => {
  for (const g of [0, 1]) for (const pray of [false, true]) {
    const av = new A.Avatar(cfgOf(g, 1), { showTag: false });
    av.setPose(0, 0, 0, 0); av.setSeated(true); av.setPray(pray); av.snapPose(); run(av, 1.5);
    const tag = `g${g} pray ${pray}`;
    for (const v of skinned(av)) {
      // 좌석판(윗면 SEAT_TOP) 위: 판 앞끝 안쪽에서는 윗면 아래로 내려가지 않는다
      // (웃옷·원피스 자락 = 휴식 높이 0.5 위의 옷. 종아리·신발은 판 앞끝 아래 공간에 있다)
      if (v.u > PEW.SEAT_REAR && v.u < PEW.SEAT_FRONT - 0.03 && v.kind === 'cloth' && v.ry > 0.5) assert.ok(v.y > PEW.SEAT_TOP - 0.045,   /* 허벅지 밑면은 판에 조금 눌린다(예전과 같음). 자락은 판 위 */ `${tag} below seat ${v.kind} y ${v.y} u ${v.u}`);
      // 등받이 앞면(뒤로 기울어짐)보다 앞
      if (v.y > PEW.SEAT_TOP && v.y < PEW.BACK_TOP) assert.ok(v.u > PEW.BACK_U - TILT * (v.y - PEW.SEAT_TOP) - EPS, `${tag} into backrest ${v.kind} y ${v.y} u ${v.u}`);
      // 앞줄: 등받이 뒷면·책 선반·무릎틀에 닿지 않는다
      if (v.y < PEW.BACK_TOP) assert.ok(v.u < backRear(Math.max(v.y, PEW.SEAT_TOP)), `${tag} row ahead`);
      if (Math.abs(v.y - PEW.SHELF_Y) < 0.05) assert.ok(v.u < 1.9 + PEW.SHELF_U0, `${tag} shelf`);
      if (v.y < PEW.KNEEL_TOP) assert.ok(v.u < 1.9 + PEW.KNEEL_U0, `${tag} kneeler u ${v.u}`);
      // 옆자리(좌석 간격 1.0m)의 절반을 넘지 않는다
      assert.ok(Math.abs(v.x) < 0.34, `${tag} sideways ${v.kind} x ${v.x} y ${v.y}`);
    }
  }
});

test('look: kneeling mesh (dress hem, belly, big head) stays behind the back of the row ahead and its shelf', () => {
  for (const g of [0, 1]) {
    const av = new A.Avatar(cfgOf(g, 1), { showTag: false });
    av.setPose(0, 0, 0, 0); av.setSeated(true); av.setPray(true); av.snapPose(); av.setKneel(true, SPOT); run(av, 2.5);
    for (const v of skinned(av)) {
      const hand = v.kind === 'smooth' && v.y > PEW.BACK_TOP - 0.02;   // 등받이 윗단에 얹은 손·머리는 윗단 위
      if (!hand && v.y < PEW.BACK_TOP - 0.06 && v.y > PEW.KNEEL_TOP + 0.02)   /* 윗단 근처는 얹은 팔 */ assert.ok(v.u < backRear(Math.max(v.y, PEW.SEAT_TOP)) + 0.005, `g${g} into the back ahead: ${v.kind} y ${v.y} u ${v.u}`);
      if (Math.abs(v.y - PEW.SHELF_Y) < PEW.SHELF_T + 0.01) assert.ok(v.u < 1.9 + PEW.SHELF_U0 + 0.005, `g${g} into the shelf: ${v.kind} u ${v.u}`);
      if (v.u > 1.9 + PEW.KNEEL_U0 && v.u < 1.9 + PEW.KNEEL_U1) assert.ok(v.y > PEW.KNEEL_TOP - 0.03, `g${g} into the kneeler y ${v.y}`);   // 무릎은 방석에 조금 눌린다
      assert.ok(v.y > -0.05, `g${g} under the floor ${v.y}`);   // 발끝(발등을 편 신발 코)은 예전과 같이 바닥에 살짝 묻힌다
    }
  }
});

test('look: LOD silhouettes match (mid mesh and far impostor keep the big head and the hem)', () => {
  for (const g of [0, 1]) {
    const av = new A.Avatar(cfgOf(g, 0), { showTag: false }); av.setPose(0, 0, 0, 0); av.snapPose(); av.update(1 / 60, 0);
    const near = skinned(av); av.setLod(1); av.update(1 / 60, 0); const mid = skinned(av, 'mid');
    av.setLod(2); av.update(1 / 60, 0);
    const fp = av.imp.geometry.attributes.position.array, far = [];
    for (let i = 0; i < fp.length; i += 3) far.push({ x: fp[i], y: fp[i + 1] });
    const box = (vs) => ({ top: Math.max(...vs.map((v) => v.y)), headW: Math.max(...vs.filter((v) => v.y > 1.55).map((v) => Math.abs(v.x))), hemW: g ? 0 : Math.max(...vs.filter((v) => Math.abs(v.y - (A.HEM[g] + 0.03)) < 0.05).map((v) => Math.abs(v.x))), shW: Math.max(...vs.filter((v) => v.y > 1.05 && v.y < 1.45).map((v) => Math.abs(v.x))) });
    const a = box(near), b = box(mid), c = box(far);
    for (const o of [b, c]) {
      assert.ok(Math.abs(o.top - a.top) < 0.05, `g${g} top ${o.top} vs ${a.top}`);
      assert.ok(Math.abs(o.headW - a.headW) < 0.04, `g${g} head ${o.headW} vs ${a.headW}`);
      assert.ok(Math.abs(o.hemW - a.hemW) < 0.05, `g${g} hem ${o.hemW} vs ${a.hemW}`);
      assert.ok(Math.abs(o.shW - a.shW) < 0.05, `g${g} shoulders ${o.shW} vs ${a.shW}`);
    }
  }
});
