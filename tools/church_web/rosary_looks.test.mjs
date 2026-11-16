// 사용: node --test tools/church_web/rosary_looks.test.mjs — 성당 아바타가 든 묵주의 모습(T-86):
// 생성 표(rosary_looks.js · church_rosary_looks.g.dart)가 defs.js 와 같고, 16종이 모두 올바른 모습이며,
// 모습이 든 묵주(알 재질·끈/십자가 색)에 적용되고, 기도 중에 바꾸면 바로 바뀌고, 다른 사람(rs)도 같은 색으로 보인다. DOM·WebGL 불필요.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { js, dart, looks as built } from './build_rosary_looks.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../assets/church');
const D = require('../../assets/rosary3d/defs.js');
const fake2d = new Proxy({}, { get: (t, k) => (k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 }) : () => {}), set: () => true });
let now = 1000;
const ctx = vm.createContext({ console, Math, Date, Float32Array, Float64Array, Uint16Array, Uint8Array, Map, Set, performance: { now: () => now },
  document: { createElement: () => ({ width: 0, height: 0, getContext: () => fake2d }) } });
ctx.window = ctx;
for (const f of ['three.min.js', 'palette.js', 'baptismal_names.js', 'geo.js', 'label_fit.js', 'layouts.js', 'shrine_places.js', 'shrine.js', 'scene_logic.js', 'rosary_looks.js', 'avatar.js', 'net_view.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const A = ctx.ChurchAvatar, T = ctx.THREE, RL = ctx.ChurchRosaryLooks;
const CFG = { g: 0, skin: 1, style: 0, hair: 2, outfit: 6, name: 0, nv: 2 };
const ws = (s) => s.replace(/\s+/g, '').replace(/,([\])}])/g, '$1');   // 공백·꼬리 쉼표 차이(dart format)는 무시
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

test('생성 표: 파일이 defs.js 에서 만든 것과 같다(손으로 고치지 않는다) — 낡았으면 node tools/church_web/build_rosary_looks.mjs', () => {
  assert.equal(fs.readFileSync(path.join(root, 'rosary_looks.js'), 'utf8'), js);
  assert.equal(ws(fs.readFileSync(path.join(here, '../../lib/church/church_rosary_looks.g.dart'), 'utf8')), ws(dart));
});

test('16종 모두 올바른 모습: 색은 #rrggbb, 수치는 범위 안, 순서·id 는 defs 와 같다', () => {
  assert.ok(same(RL.ORDER, D.ORDER));
  assert.equal(RL.ORDER.length, 16);
  const hex = /^#[0-9a-f]{6}$/i, unit = (v) => typeof v === 'number' && v >= 0 && v <= 1;
  for (const id of D.ORDER) {
    const l = RL.get(id);
    assert.equal(l.id, id);
    for (const k of ['bead', 'cord', 'cross']) assert.match(l[k], hex, `${id}.${k}`);
    assert.ok(l.emissive === '' || hex.test(l.emissive), `${id}.emissive`);
    assert.ok(unit(l.rough) && unit(l.metal) && unit(l.crossMetal) && unit(l.crossRough), id);
    assert.ok(l.opacity >= 0.5 && l.opacity <= 1 && l.emissiveI >= 0 && l.emissiveI <= 1.5, id);
    assert.ok(same(A.normRosaryLook(l), l), `${id} 는 검사를 그대로 통과한다`);
    assert.ok(A.rosaryParts(l).beadMat, id);
  }
  // 정의의 재질이 모습에 반영된다
  assert.ok(RL.get('pearl').metal > 0 && RL.get('pearl').rough < 0.4 && RL.get('pearl').emissiveI > 0, '진주: 윤기 + 은은한 광');
  assert.ok(RL.get('crystal').opacity < 1 && RL.get('crystal').emissiveI > 0.3 && RL.get('crystal').facet === 1, '수정: 살짝 투명 + 발광 + 각진 면');
  assert.equal(RL.get('olive').metal, 0);
  assert.ok(RL.get('olive').rough > 0.4, '나무: 무광');
  assert.ok(RL.get('gold').metal >= 0.8, '금: 금속');
  assert.equal(RL.get('olive').chain, 0); assert.equal(RL.get('crystal').chain, 1);
  assert.equal(RL.get('pastel').bead, D.get('pastel').bead.palette[0]);
  // 모르는 id 는 옛 모습(기본)
  assert.equal(RL.get('nope'), RL.DEFAULT); assert.equal(RL.get(undefined), RL.DEFAULT); assert.equal(RL.get('constructor'), RL.DEFAULT);
  assert.equal(Object.keys(built).length, 16);
});

test('잘못된 모습 값은 안전한 값으로 고쳐 쓴다', () => {
  const n = A.normRosaryLook({ bead: 'red', rough: 'x', metal: 5, emissive: 'zzz', emissiveI: -1, opacity: 0, cord: 12, cross: null, crossMetal: 9, crossRough: NaN });
  assert.match(n.bead, /^#[0-9a-f]{6}$/i); assert.equal(n.metal, 1); assert.equal(n.emissive, ''); assert.equal(n.emissiveI, 0);
  assert.equal(n.opacity, 0.5); assert.equal(n.crossMetal, 1); assert.ok(n.rough > 0 && n.crossRough > 0);
  assert.ok(same(A.normRosaryLook(null), A.normRosaryLook(undefined)));
});

const hexOf = (c) => '#' + c.getHexString();
const isHex = (c, hex) => { const w = new T.Color(hex); return Math.abs(c.r - w.r) < 1e-4 && Math.abs(c.g - w.g) < 1e-4 && Math.abs(c.b - w.b) < 1e-4; };
function held(look) {
  const av = new A.Avatar(CFG, {});
  av.setSeated(true); av.setPray(true); av.setRosary(true, look); av.snapPose();
  av.update(0.016, 1); av.update(0.016, 1.016);
  return av;
}
const rosaryMeshes = (av) => { const o = []; av.root.traverse((m) => { if (m.isMesh && (m.userData.rosary || m.userData.rosaryTrim)) o.push(m); }); return o; };

test('모습이 든 묵주에 적용된다: 알 색·재질, 끈·십자가 색, 메시는 2개 이하', () => {
  for (const id of ['olive', 'pearl', 'crystal', 'gold']) {
    const l = RL.get(id), av = held(l), [beads, trim] = rosaryMeshes(av);
    assert.equal(rosaryMeshes(av).length, 2, id);
    assert.ok(isHex(beads.material.color, l.bead), `${id} 알 색`);
    assert.ok(Math.abs(beads.material.roughness - l.rough) < 1e-6 && Math.abs(beads.material.metalness - l.metal) < 1e-6, `${id} 재질`);
    assert.equal(beads.material.transparent, l.opacity < 1, `${id} 투명`);
    assert.equal(beads.material.emissive.getHex() !== 0 && beads.material.emissiveIntensity > 0, l.emissiveI > 0, `${id} 발광`);
    // 끈·십자가: 정점색(앞쪽 = 끈, 뒤쪽 = 십자가)
    const col = trim.geometry.attributes.color, c = new T.Color(l.cord), x = new T.Color(l.cross), last = col.count - 1;
    assert.ok(Math.abs(col.getX(0) - c.r) < 1e-5 && Math.abs(col.getY(0) - c.g) < 1e-5 && Math.abs(col.getZ(0) - c.b) < 1e-5, `${id} 끈 색`);
    assert.ok(Math.abs(col.getX(last) - x.r) < 1e-5 && Math.abs(col.getZ(last) - x.b) < 1e-5, `${id} 십자가 색`);
    assert.equal(trim.material.metalness > 0.4, l.crossMetal > 0.5, `${id} 십자가 금속`);
  }
});

test('같은 모습은 재질·지오메트리를 모든 아바타가 나눠 쓰고, 다른 모습은 서로 다른 재질', () => {
  const a = held(RL.get('pearl')), b = held(RL.get('pearl')), c = held(RL.get('olive'));
  const [ba, ta] = rosaryMeshes(a), [bb, tb] = rosaryMeshes(b), [bc, tc] = rosaryMeshes(c);
  assert.equal(ba.geometry, bb.geometry); assert.equal(ba.geometry, bc.geometry);   // 알 지오메트리는 전부 공유
  assert.equal(ba.material, bb.material); assert.notEqual(ba.material, bc.material);
  assert.equal(ta.geometry, tb.geometry); assert.equal(ta.material, tb.material); assert.notEqual(ta.geometry, tc.geometry);
});

test('look 을 안 주면 옛 모습, 주지 않은 setRosary 는 지금 모습을 유지', () => {
  const av = new A.Avatar(CFG, {});
  av.setRosary(true);
  assert.ok(isHex(rosaryMeshes(av)[0].material.color, '#6b4226'));
  av.setRosary(true, RL.get('gold'));
  const gold = rosaryMeshes(av)[0].material;
  av.setRosary(false); av.setRosary(true);
  assert.equal(rosaryMeshes(av)[0].material, gold);
});

test('기도 중 묵주 바꾸기: 든 채로 look 을 다시 주면 같은 메시의 재질이 바로 바뀐다', () => {
  const av = held(RL.get('olive')), [beads, trim] = rosaryMeshes(av), before = beads.material;
  av.setRosary(true, RL.get('crystal'));
  const [b2, t2] = rosaryMeshes(av);
  assert.equal(b2, beads); assert.equal(t2, trim);                       // 새로 만들지 않는다
  assert.notEqual(beads.material, before);
  assert.ok(isHex(beads.material.color, RL.get('crystal').bead));
  assert.equal(beads.material.transparent, true);
  assert.equal(rosaryMeshes(av).length, 2);
  for (let i = 0; i < 40; i++) av.update(0.016, 2 + i * 0.016);
  assert.equal(beads.visible, true);                                     // 계속 보인다
});

test('다른 사람: PeerView ro + rs / peerPraying rs 가 그 사람의 묵주 색이 되고, rs 가 없거나 모르면 기본 모습', () => {
  const scene = new T.Scene(), net = ctx.ChurchNetView.create(scene);
  net.setLogic(ctx.ChurchLogic.create(ctx.ChurchLayouts.get('basic'), { colliders: [], zones: [] }));
  net.setFocus(0, 0);
  net.setPeers([
    { id: 'a', avatar: CFG, x: 0, z: 0, r: 0, st: 'p', seat: 'L03-2', ms: 1, ro: 1, rs: 'crystal' },
    { id: 'b', avatar: CFG, x: 0, z: 0, r: 0, st: 'p', seat: 'L03-3', ms: 1, ro: 1 },                 // 옛 서버: rs 없음
    { id: 'c', avatar: CFG, x: 0, z: 0, r: 0, st: 'p', seat: 'L03-4', ms: 1, ro: 1, rs: 'nope' }     // 모르는 id
  ], {});
  const step = (n = 3) => { for (let i = 0; i < n; i++) { now += 16; net.update(0.016, now / 1000, now); } };
  step(30);
  const avs = scene.children.filter((o) => o.userData.avatar);
  const colorOf = (i) => { let m = null; avs[i].traverse((o) => { if (o.userData.rosary) m = o.material; }); return m && m.color; };
  const count = (hex) => [0, 1, 2].filter((i) => colorOf(i) && isHex(colorOf(i), hex)).length;
  assert.equal(count(RL.get('crystal').bead), 1);
  assert.equal(count('#6b4226'), 2);
  // 기도 중 바꿔 보내면(peerPraying 의 rs) 바로 바뀐다
  net.peerPraying('b', true, 1, 0, 1, 'gold'); step(5);
  assert.equal(count(RL.get('gold').bead), 1);
  // 묵주 없이 보내면 rs 도 무시
  net.peerPraying('b', true, 1, 0, 0, 'gold'); step(60);
  let n = 0; avs.forEach((o) => o.traverse((m) => { if (m.userData.rosary && m.visible) n++; }));
  assert.equal(n, 2);
});
