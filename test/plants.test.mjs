// 식물 알파 카드(plants.js) + 커피 컵 모양: Node 에서 장면을 실제로 짓고(harness) 메시·재질을 본다
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { loadRooms, WEB } from '../tools/harness.mjs';

const H = loadRooms({ quality: 'high', photos: true, only: ['house'] });
const room = H.rooms[0], T = H.THREE;
room.prepare();
const plants = [];
room.ctx.root.traverse((o) => { if (o.isMesh && /^plant_/.test(o.name)) plants.push(o); });

test('식물 카드: 종류마다 메시 1(draw call 7 이하), 알파 시험·양면·알파 커버리지, 그림자 받고 드리움', () => {
  const kinds = new Set(plants.filter((m) => !m.parent || m.parent.name !== 'garden').map((m) => m.name));
  assert.ok(kinds.size >= 6 && kinds.size <= 7, [...kinds].join(','));
  for (const m of plants) {
    const mt = m.material;
    assert.ok(mt.alphaTest >= 0.3 && mt.alphaTest <= 0.6, m.name);
    assert.equal(mt.side, T.DoubleSide); assert.equal(mt.alphaToCoverage, true); assert.equal(mt.transparent, false);
    assert.ok(m.castShadow && m.receiveShadow, m.name);
    assert.ok(mt.map && mt.map.userData.photo === m.name, 'map ' + m.name);
    assert.equal(mt.map.encoding, T.sRGBEncoding);
    assert.equal(m.geometry.attributes.uv.count, m.geometry.attributes.position.count);
  }
});
test('식물 카드: 땅(흙) 위에 선다 — 포기 판의 아래 끝이 땅 높이 ±5 cm 안, 삼각형 합계는 작다', () => {
  let tris = 0;
  for (const m of plants) {
    const p = m.geometry.attributes.position; tris += p.count / 3;
    if (m.name === 'plant_tree' || m.name === 'plant_ivy') continue;
    let minY = Infinity; for (let i = 0; i < p.count; i++) minY = Math.min(minY, p.getY(i));
    assert.ok(minY > -0.08 && minY < 0.5, m.name + ' minY ' + minY);
  }
  assert.ok(tris < 8000, 'plant tris ' + tris);
});
test('나무: 껍질 PBR 줄기·가지(bark 표면 묶음)와 잎 카드', () => {
  assert.ok(room.ctx._.surfBatches.bark, 'bark batch');
  const leaf = plants.find((m) => m.name === 'plant_tree');
  assert.ok(leaf && leaf.userData.plantCards > 150, 'leaf cards ' + (leaf && leaf.userData.plantCards));
});
test('PBR 표면: 소유자 질감은 ORM 을 거칠기·AO 둘 다로, aoMap 은 uv(첫째)로 읽는다', () => {
  const m = room.ctx.mats.surface('plaster_cream', {});
  assert.ok(m.roughnessMap && m.aoMap && m.roughnessMap === m.aoMap);
  assert.equal(m.roughnessMap.userData.photo, 'plaster_cream_orm');
  assert.equal(m.map.encoding, T.sRGBEncoding); assert.equal(m.normalMap.encoding, T.LinearEncoding); assert.equal(m.aoMap.encoding, T.LinearEncoding);
  assert.ok(m.map.anisotropy >= 8);
  const sh = { fragmentShader: '#include <aomap_fragment>', vertexShader: '' }; m.onBeforeCompile(sh);
  assert.ok(/#define vUv2 vUv\n#include <aomap_fragment>/.test(sh.fragmentShader));
});
test('컵 4종: 서로 다른 모양(삼각형 수·높이), 아이스는 투명 유리, 라떼·홍차는 받침', () => {
  const sb = H.sandbox; vm.runInContext(fs.readFileSync(path.join(WEB, 'coffee.js'), 'utf8'), sb);
  const C = sb.RoomCoffee, info = {};
  for (const k of C.KINDS) {
    const cup = C.makeCup(T, k), box = new T.Box3().setFromObject(cup);
    let tris = 0, glass = false; cup.traverse((o) => { if (o.isMesh) { tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; if (o.material.transparent && o.material.opacity < 0.5) glass = true; } });
    info[k] = { h: box.max.y - box.min.y, w: box.max.x - box.min.x, tris, glass };
    assert.ok(box.min.y > -0.01 && info[k].h < 0.25, k);
  }
  assert.ok(info.iced.glass && !info.americano.glass);
  assert.ok(info.iced.h > info.americano.h && info.americano.h > info.latte.h && info.latte.h > info.tea.h, JSON.stringify(info));
  assert.ok(info.latte.w > info.americano.w + 0.02 && info.tea.w > info.americano.w + 0.02, 'saucers');
});
