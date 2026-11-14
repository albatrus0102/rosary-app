// 사용: node --test tools/church_web/rosary.test.mjs — 손에 든 묵주(SPEC §32): 지오메트리 예산·공유, 표시/해제, LOD,
// 자세별(서기·앉아 기도·무릎 꿇기) 손 위치와 비침투, 다른 사람의 묵주(net_view 의 ro / peerPraying r). DOM·WebGL 불필요.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/church');
const fake2d = new Proxy({}, { get: (t, k) => (k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 }) : () => {}), set: () => true });
let now = 1000;
const ctx = vm.createContext({ console, Math, Date, Float32Array, Float64Array, Uint16Array, Uint8Array, Map, Set, performance: { now: () => now },
  document: { createElement: () => ({ width: 0, height: 0, getContext: () => fake2d }) } });
ctx.window = ctx;
for (const f of ['three.min.js', 'palette.js', 'baptismal_names.js', 'geo.js', 'label_fit.js', 'layouts.js', 'scene_logic.js', 'avatar.js', 'net_view.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const A = ctx.ChurchAvatar, T = ctx.THREE, RO = A.ROSARY;
const CFG = { g: 0, skin: 1, style: 0, hair: 2, outfit: 6, name: 0, nv: 2 };
const RAIL = { fwd: 1.22, y: 0.145, rail: true };   // 줄 간격 1.9m 의 무릎틀(scene_logic.kneelSpot)

function posed(setup, cfg = CFG) {
  const av = new A.Avatar(cfg, {});
  setup(av); av.setRosary(true); av.snapPose();
  av.update(0.016, 1.0); av.update(0.016, 1.016);
  av.root.updateMatrixWorld(true);
  const b = {};
  av.bones.forEach((x) => { b[x.name] = new T.Vector3().setFromMatrixPosition(x.matrixWorld); });
  const g = av.rosary.geometry; g.computeBoundingBox();
  const bb = g.boundingBox.clone().applyMatrix4(av.rosary.matrixWorld);
  return { av, b, bb, ro: av.rosary };
}
const meshes = (av) => { let n = 0; av.root.traverse((o) => { if (o.isMesh && o.visible && o.userData.rosary) n++; }); return n; };

test('묵주 지오메트리: 새 에셋 없이 한 덩어리, 삼각형 1200 이하, 모든 아바타가 공유', () => {
  const g = A.rosaryGeometry();
  assert.equal(g, A.rosaryGeometry());
  assert.ok(RO.TRIS > 300 && RO.TRIS <= 1200, `tris ${RO.TRIS}`);
  assert.equal(g.attributes.position.count, RO.TRIS * 3);
  assert.ok(g.attributes.color && g.attributes.normal);
  g.computeBoundingBox();
  const bb = g.boundingBox;
  // 쥔 곳(원점)에서 아래로만 늘어진다: 길이 = LEN, 폭은 고리 폭
  assert.ok(bb.max.y <= 0.01 && Math.abs(-bb.min.y - RO.LEN) < 0.01, `y ${bb.min.y}..${bb.max.y}`);
  assert.ok(bb.max.x <= RO.HALF_W + 0.01 && bb.min.x >= -RO.HALF_W - 0.01);
  assert.ok(RO.LEN < 0.26);
});

test('setRosary: 처음 들 때 메시 1개(공유 지오메트리·기존 재질), 내려놓으면 사라지고 다시 들면 재사용', () => {
  const a = new A.Avatar(CFG, {}), b = new A.Avatar({ ...CFG, g: 1 }, {});
  assert.equal(a.rosary, null);
  a.update(0.016, 1); assert.equal(meshes(a), 0);
  a.setRosary(true); b.setRosary(true);
  assert.equal(a.rosary.geometry, b.rosary.geometry);
  assert.equal(a.rosary.material, b.rosary.material);
  assert.equal(a.rosary.material.vertexColors, true);
  assert.equal(a.rosary.castShadow, false);
  for (let i = 0; i < 40; i++) a.update(0.016, 1 + i * 0.016);
  assert.equal(meshes(a), 1); assert.equal(a.rosary.scale.x, 1);
  const m = a.rosary;
  a.setRosary(false);
  for (let i = 0; i < 60; i++) a.update(0.016, 2 + i * 0.016);
  assert.equal(meshes(a), 0);
  a.setRosary(true); assert.equal(a.rosary, m);   // 메시를 다시 만들지 않는다
  a.snapPose(); a.update(0.016, 4);
  assert.equal(meshes(a), 1);
  let n = 0; a.root.traverse((o) => { if (o.userData.rosary) n++; });
  assert.equal(n, 1);
});

test('LOD: 가까운 아바타(LOD0)만 묵주를 그린다', () => {
  const { av } = posed((a) => { a.setSeated(true); a.setPray(true); });
  assert.equal(meshes(av), 1);
  av.setLod(1); av.update(0.016, 2); assert.equal(meshes(av), 0);
  av.setLod(2); av.update(0.016, 2.1);
  assert.equal(av.body.parent, null);          // 임포스터: 몸(과 묵주)을 장면에서 뺀다
  assert.equal(meshes(av), 0);
  av.setLod(0); av.update(0.016, 2.2); assert.equal(meshes(av), 1);
});

test('서기: 오른손에서 늘어지고 다리·바닥에 닿지 않는다', () => {
  for (const g of [0, 1]) {
    const { b, bb, ro } = posed(() => {}, { ...CFG, g });
    const hand = b.haR;
    assert.ok(Math.hypot(ro.position.x - hand.x, ro.position.z - hand.z) < 0.03 && hand.y - ro.position.y > 0 && hand.y - ro.position.y < 0.08, 'held in the right hand');
    assert.ok(bb.min.x > b.ulR.x + 0.10, `outside the leg: ${bb.min.x} vs hip ${b.ulR.x}`);   // 허벅지 반지름 약 0.08
    assert.ok(bb.max.x - bb.min.x < 0.03, 'loop is parallel to the body side');
    assert.ok(bb.min.y > 0.45, `well above the floor: ${bb.min.y}`);
  }
});

test('앉아 기도: 모은 두 손 사이에서 늘어지고 무릎·배에 닿지 않는다', () => {
  const { b, bb, ro } = posed((a) => { a.setSeated(true); a.setPray(true); });
  assert.ok(Math.abs(ro.position.x) < 0.005, 'centred between the palms');
  const midY = (b.haR.y + b.haL.y) / 2, midZ = (b.haR.z + b.haL.z) / 2;
  assert.ok(Math.abs(ro.position.y - midY) < 0.06 && Math.abs(ro.position.z - midZ) < 0.07, 'at the joined hands');
  // 허벅지 윗면(고관절~무릎 선 + 반지름 0.09)보다 위
  const f = (bb.min.z - b.ulR.z) / (b.llR.z - b.ulR.z), thighY = b.ulR.y + (b.llR.y - b.ulR.y) * Math.min(1, Math.max(0, f));
  assert.ok(bb.min.y > thighY + 0.09 + 0.02, `above the lap: ${bb.min.y} vs ${thighY}`);
  assert.ok(bb.max.z < b.chest.z - 0.17, `in front of the torso: ${bb.max.z} vs chest ${b.chest.z}`);
  assert.ok(bb.max.x - bb.min.x > 0.05, 'loop faces forward');
});

test('무릎 꿇기(앞 등받이에 손): 묵주는 등받이 뒷면과 몸 사이, 책 선반 위', () => {
  const { b, bb } = posed((a) => { a.setSeated(true); a.setPray(true); a.setKneel(true, RAIL); });
  const L = ctx.ChurchLogic, PEW = L.PEW, pitch = 1.9;
  assert.ok(PEW && L.pewAhead, 'scene_logic exports PEW/pewAhead');
  const tilt = Math.tan(PEW.BACK_TILT);
  // 좌석 중심에서 앞으로(-z) 잰 거리. 등받이 뒷면은 아래로 갈수록 앞으로 물러난다 → 윗단이 가장 가깝다.
  const backTop = L.pewAhead(pitch).backFace, fwdMax = -bb.min.z, fwdMin = -bb.max.z;
  assert.ok(fwdMax < backTop - 0.01, `behind the pew back: ${fwdMax} vs ${backTop}`);
  assert.ok(fwdMin > -b.chest.z + 0.12, `in front of the chest: ${fwdMin} vs ${-b.chest.z}`);
  assert.ok(bb.min.y > PEW.SHELF_Y + PEW.SHELF_LIP, `above the book shelf: ${bb.min.y}`);
  assert.ok(bb.max.y < b.haR.y + 0.06);
  assert.ok(tilt > 0);
  // 가림판 없는 맨 앞줄(바닥에 무릎): 바닥에 닿지 않는다
  const fl = posed((a) => { a.setSeated(true); a.setPray(true); a.setKneel(true, { fwd: 0.5, y: 0, rail: false }); });
  assert.ok(fl.bb.min.y > 0.3, `floor kneel: ${fl.bb.min.y}`);
});

test('net_view: PeerView 의 ro 와 peerPraying 의 r 이 다른 사람 아바타의 묵주가 된다', () => {
  const scene = new T.Scene(), net = ctx.ChurchNetView.create(scene);
  net.setLogic(ctx.ChurchLogic.create(ctx.ChurchLayouts.get('basic'), { colliders: [], zones: [] }));
  net.setFocus(0, 0);
  net.setPeers([
    { id: 'a', avatar: CFG, x: 0, z: 0, r: 0, st: 'p', seat: 'L03-2', ms: 1, ro: 1 },
    { id: 'b', avatar: CFG, x: 0, z: 0, r: 1, st: 'p', seat: 'L03-3', ms: 1 },          // r(방향)은 묵주가 아니다
    { id: 'c', avatar: CFG, x: 1, z: 1, r: 0, st: 'w', seat: null, ms: -1 }
  ], {});
  const step = (n = 3) => { for (let i = 0; i < n; i++) { now += 16; net.update(0.016, now / 1000, now); } };
  step();
  const avs = scene.children.filter((o) => o.userData.avatar);
  assert.equal(avs.length, 3);
  const holding = () => avs.filter((o) => { let n = 0; o.traverse((m) => { if (m.userData.rosary && m.visible) n++; }); return n > 0; }).length;
  assert.equal(holding(), 1);
  net.peerPraying('b', true, 1, 0, 1); step(30);
  assert.equal(holding(), 2);
  net.peerPraying('a', false, -1, 0, 1); step(60);     // 기도를 멈추면 r 을 보내도 내려놓는다
  assert.equal(holding(), 1);
  net.peerStand('b'); step(60);
  assert.equal(holding(), 0);
  net.peerPraying('c', true, 1, 0, 1); step(30);       // 서 있는 사람(좌석 없음)은 기도 상태가 그려지지 않는다
  assert.equal(holding(), 0);
});
