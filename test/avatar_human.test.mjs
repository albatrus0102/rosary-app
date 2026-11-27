// 반실사 아바타(avatar_human.js + avatar.js): 번호 → 설정, LOD 바꾸기, 삼각형 예산, 앉은 다리 IK, 브리지(setMe 번호·setPeers avatar), 라이트맵 노이즈 제거·세기
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web');
function sandbox() {
  const ctx = vm.createContext({ console, Math, Date, Float32Array, Float64Array, Uint16Array, Uint32Array, Uint8Array, Int8Array, Int16Array, Int32Array, Uint8ClampedArray, Array, Object, JSON, Map, Promise, setTimeout, clearTimeout });
  ctx.window = ctx; ctx.RoomHumanOn = true;
  const noop = () => {};
  const g2d = new Proxy(noop, { get: (t, k) => (k === 'canvas' ? {} : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k === 'getImageData' || k === 'createImageData') ? (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }) : noop), set: () => true });
  ctx.document = { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => g2d, addEventListener: noop }) };
  for (const f of ['three.min.js', 'palette.js', 'geo.js', 'label_fit.js', 'avatar_human.js', 'avatar.js', 'avatar_glb.js', 'lightmap.js', 'looks.js']) vm.runInContext(fs.readFileSync(path.join(WEB, f), 'utf8'), ctx, { filename: f });
  const meta = JSON.parse(fs.readFileSync(path.join(WEB, 'avatar/human.json'), 'utf8'));
  const b = fs.readFileSync(path.join(WEB, 'avatar/human.bin'));
  ctx.RoomHuman.loadFrom(meta, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  return ctx;
}
const S = sandbox(), Hm = S.RoomHuman, A = S.RoomAvatar;

test('번호 0..7 → F1..F4·M1..M4(성별·머리 모양·머리색·옷색이 정해진다), 범위 밖은 감싸고, 바꾸기(hairColor·outfitColor) 가 먹는다', () => {
  const ids = [...Array(8).keys()].map((n) => Hm.cfgFor(n).id);
  assert.deepEqual(ids, ['F1', 'F2', 'F3', 'F4', 'M1', 'M2', 'M3', 'M4']);
  assert.deepEqual([...Array(8).keys()].map((n) => Hm.cfgFor(n).g), [0, 0, 0, 0, 1, 1, 1, 1]);
  const hairs = new Set(Hm.meta().avatars.map((a) => a.hair)); assert.equal(hairs.size, 8, '머리 모양 8가지');
  assert.equal(Hm.cfgFor(9).id, 'F2'); assert.equal(Hm.cfgFor(-1).id, 'M4');
  const o = Hm.cfgFor(0, { hairColor: '#7a4a2a', outfitColor: 0x335577 });
  assert.equal(o.hairColor, 0x7a4a2a); assert.equal(o.outfit.card, 0x335577);
  assert.equal(Hm.cfgFor(0).outfit.card, Hm.meta().avatars[0].outfit.card, '원래 표는 그대로');
  // avatar.js normalizeCfg: 숫자·{n}·예전 cfg(g·style)
  assert.equal(A.normalizeCfg(3).n, 3); assert.equal(A.normalizeCfg('6').n, 6); assert.equal(A.normalizeCfg({ n: 5 }).g, 1);
  assert.equal(A.normalizeCfg({ g: 1, style: 2 }).n, 6, '예전 cfg → 번호');
  assert.equal(Hm.meta().avatars[7].glasses, 1, 'M4 안경');
});
test('삼각형 예산: 가까이(LOD0) 한 사람 15k 이하 · LOD1 4k 이하 · 6명 가까이 90k 이하 · 파일 6 MB 이하', () => {
  let worst = 0;
  for (let n = 0; n < 8; n++) {
    const t0 = A.humanTris(n, 0), t1 = A.humanTris(n, 1);
    assert.ok(t0 > 8000 && t0 <= 15000, 'LOD0 ' + n + ' = ' + t0);
    assert.ok(t1 > 1000 && t1 <= 4000, 'LOD1 ' + n + ' = ' + t1);
    worst = Math.max(worst, t0);
  }
  assert.ok(worst * 6 <= 90000);
  const dir = path.join(WEB, 'avatar'), total = fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
  assert.ok(total <= 6 * 1024 * 1024, 'avatar files ' + (total / 1048576).toFixed(2) + ' MB');
});
test('LOD 바꾸기: 0 = 살·눈·옷·머리카락(+안경), 1 = 줄인 몸(눈·안경 없음), 2 = 임포스터(몸 떼어냄) — 반실사 메시는 같은 뼈대에 묶인다', () => {
  const av = new A.Avatar({ n: 7 }, { showTag: false });
  av.setLod(0);
  const vis = (l) => (av.hum[l] || []).filter((m) => m.visible).length;
  assert.equal(vis(0), 5, 'skin·eyes·cloth·hair·glasses');
  for (const m of av.hum[0]) if (m.isSkinnedMesh) assert.equal(m.skeleton, av.skeleton);
  av.setLod(1); assert.equal(vis(1), 3); assert.equal(vis(0), 0);
  av.setLod(2); assert.equal(av.body.parent, null); assert.ok(av.imp && av.imp.visible);
  av.setLod(0); assert.equal(vis(0), 5);
  // 예전 몸(장난감) 메시는 보이지 않는다
  ['near', 'mid'].forEach((lv) => ['smooth', 'cloth'].forEach((k) => { const m = av.meshes[lv][k]; if (m) assert.equal(m.visible, false); }));
  // 설정 바꾸기: 다른 번호면 새 메시
  const first = av.hum[0][0]; av.setConfig({ n: 2 }); av.setLod(1); av.setLod(0); assert.notEqual(av.hum[0][0], first);
});
test('앉은 다리 IK(setSeatFit): 의자·바 스툴(발 받침)·그네에서 발목이 정한 높이·앞 거리에 닿는다', () => {
  const T = S.THREE, v = new T.Vector3(), w = new T.Vector3();
  for (const [hip, foot] of [[0.375, 0.4], [0.495, 0.2], [0.555, 0.42]]) {
    const av = new A.Avatar({ n: 1 }, { showTag: false }); av.setLod(0);
    av.setSeatFit({ hip, foot }); av.setSeated(true); av.setSitProgress(1);
    av.setPose(0, 0, 0, 0); av.update(1 / 60, 0); av.root.updateMatrixWorld(true);
    av.bones[16].getWorldPosition(v); av.bones[17].getWorldPosition(w);   // llR(무릎) · ftR(발목)
    assert.ok(Math.abs(w.y - 0.08) < 0.01, 'ankle height ' + w.y.toFixed(3) + ' hip ' + hip);
    av.bones[15].getWorldPosition(v);   // ulR(고관절)
    assert.ok(Math.abs(v.y - hip) < 0.012, 'hip joint ' + v.y.toFixed(3) + ' vs ' + hip);
    assert.ok(Math.abs((v.z - w.z) - foot) < 0.02, 'foot forward ' + (v.z - w.z).toFixed(3));
  }
});
test('읽기 자세: 펴면 책이 가슴 앞 두 손 사이, 약 20초마다 한 장 넘기고, 덮으면 책상 자리(세계 좌표)에', () => {
  const T = S.THREE, av = new A.Avatar({ n: 0 }, { showTag: false }); av.setLod(0);
  av.setSeatFit({ hip: 0.375, foot: 0.4 }); av.setSeated(true); av.setSitProgress(1); av.setPose(0, 0, 0, 0);
  av.setRead('read');
  let turned = false;
  for (let t = 0; t < 26; t += 1 / 30) { av.update(1 / 30, t); if (av.book.userData.leaf.visible) turned = true; }
  assert.ok(turned, '한 장 넘김');
  av.root.updateMatrixWorld(true);
  const b = new T.Vector3(), hl = new T.Vector3(), hr = new T.Vector3();
  av.book.getWorldPosition(b); av.bones[8].getWorldPosition(hl); av.bones[11].getWorldPosition(hr);
  const hp = new T.Vector3(); av.bones[1].getWorldPosition(hp);
  assert.ok(hp.z - b.z > 0.25 && b.y - hp.y > 0.2 && b.y - hp.y < 0.45, 'book in front of chest ' + b.toArray().map((x) => x.toFixed(2)) + ' hips ' + hp.toArray().map((x) => x.toFixed(2)));
  assert.ok(Math.hypot(hl.x - b.x, hl.z - b.z) < 0.25 && Math.hypot(hr.x - b.x, hr.z - b.z) < 0.25, 'hands at the book');
  av.setRead('closed', { x: 0.1, y: 0.74, z: -0.5 }); av.update(1 / 30, 30); av.root.updateMatrixWorld(true);
  av.book.getWorldPosition(b); assert.ok(Math.abs(b.y - 0.744) < 0.01 && Math.abs(b.z + 0.5) < 0.02, 'closed on the desk');
});
test('라이트맵: 노이즈 제거는 빈 텍셀을 건드리지 않고 반점을 줄이며 경계는 지킨다 · 룩 lmK 낮 3 / 밤 1', () => {
  const L = S.RoomLightmap, w = 32, h = 16, d = new Uint8ClampedArray(w * h * 4), rng = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, base = x < 16 ? 60 : 200, n = (rng() - 0.5) * 50;
    d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, base + n)); d[i + 3] = x === 31 ? 0 : 255;
  }
  const o = L.denoise(d, w, h, { encoding: 'rgbm', range: 1, gamma: 1 });
  const sd = (a, x0, x1) => { const v = []; for (let y = 2; y < h - 2; y++) for (let x = x0; x < x1; x++) v.push(a[(y * w + x) * 4] * a[(y * w + x) * 4 + 3] / 255); const m = v.reduce((s, q) => s + q, 0) / v.length; return [m, Math.sqrt(v.reduce((s, q) => s + (q - m) ** 2, 0) / v.length)]; };
  const [m0, s0] = sd(d, 2, 13), [m1, s1] = sd(o, 2, 13);
  assert.ok(s1 < s0 * 0.6, 'speckle ' + s0.toFixed(1) + ' → ' + s1.toFixed(1));
  assert.ok(Math.abs(m1 - m0) < 4, 'mean kept');
  assert.ok(sd(o, 18, 30)[0] > 180 && sd(o, 2, 13)[0] < 80, 'edge kept');
  for (let y = 0; y < h; y++) assert.equal(o[(y * w + 31) * 4 + 3], 0, 'empty texel untouched');
  const Lk = S.RoomLooks, lk = Lk.get('house');
  assert.equal(Lk.blend(lk, 0).lmK, 3); assert.equal(Lk.blend(lk, 1).lmK, 1); assert.equal(Lk.blend(Lk.get('nope'), 0).lmK, 1);
});
test('브리지: setMe({avatar: 번호}) · setPeers avatar 번호/{n, hairColor} 가 아바타 설정으로 간다(정적 확인)', () => {
  const main = fs.readFileSync(path.join(WEB, 'main.js'), 'utf8'), nv = fs.readFileSync(path.join(WEB, 'net_view.js'), 'utf8');
  assert.match(main, /setMe: function \(o\) \{ var a = o\.avatar !== undefined \? o\.avatar : o;/);
  assert.match(nv, /a\.setConfig\(cfg\)/);
  const av = new A.Avatar(4, { showTag: false }); assert.equal(av.cfg.n, 4);
  av.setConfig({ n: 1, hairColor: '#aa5533' }); assert.equal(av.cfg.hairColor, '#aa5533'); assert.equal(av.cfg.n, 1);
});
test('GLB 몸 리타깃(4절 B 길): T 자 휴식의 Mixamo 이름 뼈대가 우리 뼈를 따라 — 앉아 읽는 자세에서 손·발·머리가 1.5 cm 안', () => {
  const T = S.THREE, Gb = S.RoomGlb;
  const scene = new T.Group(), mk = (name, x, y, z, par) => { const b = new T.Bone(); b.name = 'mixamorig:' + name; b.position.set(x, y, z); (par || scene).add(b); return b; };
  // 모델 공간(앞 +Z, 왼쪽 +X), 세계 좌표를 부모 기준으로 넣는다
  const hips = mk('Hips', 0, 0.93, 0), sp = mk('Spine', 0, 0.10, 0, hips), sp1 = mk('Spine1', 0, 0.08, 0, sp), sp2 = mk('Spine2', 0, 0.09, 0, sp1), nk = mk('Neck', 0, 0.22, 0.012 * -1, sp2), hd = mk('Head', 0, 0.08, 0.012, nk);
  for (const [sd, sx] of [['Left', 1], ['Right', -1]]) {
    const sh = mk(sd + 'Shoulder', sx * 0.05, 0.18, 0, sp2), ua = mk(sd + 'Arm', sx * 0.12, 0.02, 0, sh), fa = mk(sd + 'ForeArm', sx * 0.29, 0, 0, ua); mk(sd + 'Hand', sx * 0.26, 0, 0, fa);
    const ul = mk(sd + 'UpLeg', sx * 0.095, -0.05, 0, hips), ll = mk(sd + 'Leg', 0, -0.39, 0, ul); mk(sd + 'Foot', 0, -0.41, 0, ll);
  }
  assert.equal(Object.keys(Gb.findBones(scene)).length, 17, '이름 17개 모두 찾음');
  const av = new A.Avatar({ n: 4 }, { showTag: false }); av.setLod(0);
  const R = Gb.attach(av, scene, {});
  assert.ok(R && Math.abs(R.scale - 1) < 0.02, 'scale ' + (R && R.scale));
  av.setSeatFit({ hip: 0.375, foot: 0.4 }); av.setSeated(true); av.setSitProgress(1); av.setRead('read'); av.setPose(0, 0, 0, 0.7);
  for (let t = 0; t < 1.5; t += 1 / 30) av.update(1 / 30, t);
  R.sync(); av.root.updateMatrixWorld(true);
  const w = (o) => o.getWorldPosition(new T.Vector3());
  const pairs = [['LeftHand', 8], ['RightHand', 11], ['LeftFoot', 14], ['RightFoot', 17], ['Head', 5], ['LeftLeg', 13]];
  for (const [g, i] of pairs) {
    const d = w(scene.getObjectByName('mixamorig:' + g)).distanceTo(w(av.bones[i]));
    assert.ok(d < 0.015, g + ' off by ' + d.toFixed(3));
  }
});
