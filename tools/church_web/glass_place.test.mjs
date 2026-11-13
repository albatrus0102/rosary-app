// 성당 안 진본 창(G-29) 순수 시험: 대응표(glass_placements.js) ↔ 카탈로그, 빌더가 알리는 창 자리(비율·개수·위치), 재질 규칙.
// 렌더 시험(걷기 프로필 ΔE·fps·깜박임·폴백·메모리·이벤트)은 tools/church_web/glassplace.mjs (헤드리스, node --test 밖).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const GP = require('../../assets/church/glass_placements.js');
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');
const cat = JSON.parse(fs.readFileSync(path.join(assets, 'glass_catalog.json'), 'utf8'));
const byId = Object.fromEntries(cat.windows.map((w) => [w.id, w]));

// world.js glassSlots() 와 같은 계산(시험용 사본)
function slotsOf(ch) {
  const out = [];
  for (const o of ch.windows) {
    if (o.painted || !o.photo) continue;
    const rise = o.top === 'pointed' ? o.w * 0.72 : (o.top === 'round' || o.top === 'trefoil' ? o.w / 2 : 0);
    out.push({ win: o.photo.win, slot: o.photo.slot, index: o.photo.index, x: o.x, y: o.y + (o.h + rise) / 2, z: o.z, nx: o.F.nx, nz: o.F.nz, w: o.w, h: o.h + rise });
  }
  for (const o of ch.roses) if (o.photo) out.push({ win: o.photo.win, slot: o.photo.slot, index: o.photo.index, x: o.x, y: o.y, z: o.z, nx: o.F.nx, nz: o.F.nz, w: o.r * 2, h: o.r * 2 });
  for (const s of ch.glassSlots) out.push(s);
  return out;
}
const { churches } = loadChurches();
const church = (id) => churches.find((c) => c.id === id);

test('placement table: only bundled, authentic windows of that church; aspects equal the catalog', () => {
  const placed = new Set();
  for (const [cid, list] of Object.entries(GP.churches)) {
    assert.ok(church(cid), 'church exists: ' + cid);
    const slots = new Set();
    for (const e of list) {
      assert.equal(e.use, 'authentic', cid + '/' + e.slot);
      assert.ok(['catalog', 'literature', 'assumed'].includes(e.certainty), e.slot);
      assert.ok(e.where_ko && e.where_ko.length > 5, e.slot);
      assert.ok(!slots.has(e.slot), 'duplicate slot ' + e.slot); slots.add(e.slot);
      assert.ok(e.wins.length >= 1 && (e.repeat || e.wins.length === 1), e.slot);
      for (const w of e.wins) {
        const c = byId[w.id];
        assert.ok(c, 'in catalog: ' + w.id);
        assert.equal(c.files['1k'].bundled, true, 'bundled: ' + w.id);
        assert.ok(fs.existsSync(path.join(assets, `gpack_${w.id}_1k.js`)), 'pack file: ' + w.id);
        assert.ok(Math.abs(w.aspect - c.aspect_w_over_h) < 1e-4, `aspect ${w.id}: ${w.aspect} vs ${c.aspect_w_over_h}`);
        const use = (c.suggestedChurches || []).find((s) => s.church === cid);
        assert.ok(use && use.use === 'authentic', `${w.id} must be authentic for ${cid} (catalog suggestedChurches)`);
        placed.add(w.id);
      }
    }
  }
  // 번들 8점 중 진본 자리가 있는 7점은 모두 걸린다. 라벤나 석판(다른 성당 창 = reference)은 성당 안에 걸지 않는다.
  const bundled = cat.windows.filter((w) => w.files['1k'].bundled !== false).map((w) => w.id);
  const authentic = bundled.filter((id) => (byId[id].suggestedChurches || []).some((s) => s.use === 'authentic'));
  assert.deepEqual([...placed].sort(), authentic.sort());
  assert.ok(!placed.has('alabaster_slab'));
  assert.deepEqual(Object.keys(GP.churches).sort(), ['florence', 'milan', 'stpaul', 'stpeter']);
});

test('forSlot / winsOf / contain', () => {
  assert.deepEqual(GP.forSlot('stpeter', 'gloria', 0), { win: 'dove_stpeter', aspect: 0.6904, slot: 'gloria', index: 0, shape: 'ellipse' });
  assert.equal(GP.forSlot('stpeter', 'gloria', 1), null, 'single slot does not repeat');
  assert.equal(GP.forSlot('stpeter', 'nope', 0), null);
  assert.equal(GP.forSlot('lateran', 'gloria', 0), null);
  assert.equal(GP.forSlot('stpaul', 'aisle', 0).win, 'alabaster_stpaul_1');
  assert.equal(GP.forSlot('stpaul', 'aisle', 1).win, 'alabaster_stpaul_2');
  assert.equal(GP.forSlot('stpaul', 'aisle', 7).win, 'alabaster_stpaul_2');
  assert.equal(GP.forSlot('stpaul', 'aisle', -1), null);
  assert.deepEqual(GP.winsOf('florence').sort(), ['oculus_florence_donatello', 'oculus_florence_ghiberti_1', 'oculus_florence_ghiberti_2']);
  assert.deepEqual(GP.winsOf('basic'), []);
  for (const id of Object.keys(GP.churches)) assert.ok(GP.winsOf(id).length <= 3, 'at most 3 textures resident per church: ' + id);
  const a = GP.contain(1.75, 4.8, 5.5); assert.ok(Math.abs(a.w - 4.8) < 1e-9 && Math.abs(a.h - 4.8 / 1.75) < 1e-9);
  const b = GP.contain(0.5, 4, 4); assert.ok(Math.abs(b.w - 2) < 1e-9 && Math.abs(b.h - 4) < 1e-9);
});

test('builders announce photo slots with the photo aspect (no distortion, no gap) inside the building', () => {
  const want = { florence: 3, stpeter: 1, stpaul: 64, milan: 1 };
  for (const ch of churches) {
    const slots = slotsOf(ch);
    assert.equal(slots.length, want[ch.id] || 0, ch.id + ' slot count');
    const b = ch.layout.bounds;
    for (const s of slots) {
      const e = GP.forSlot(ch.id, s.slot, s.index);
      assert.ok(e && e.win === s.win, `${ch.id}/${s.slot}#${s.index}`);
      assert.ok(Math.abs(s.w / s.h - e.aspect) / e.aspect < 0.002, `${ch.id}/${s.slot}#${s.index} aspect ${(s.w / s.h).toFixed(4)} vs ${e.aspect}`);
      assert.ok(Math.abs(Math.hypot(s.nx, s.nz) - 1) < 1e-6, 'unit normal');
      assert.ok(s.w > 0.5 && s.h > 0.5 && s.y - s.h / 2 > 0.5, 'above the floor, not tiny');
      assert.ok(s.x > b.x0 - 3 && s.x < b.x1 + 3 && s.z > b.z0 - 3 && s.z < b.z1 + 3, `${ch.id}/${s.slot} near the building`);
      // 실내 방향(법선)으로 2m 가면 걸을 수 있는 범위 쪽이다(창이 바깥을 보고 있지 않다)
      const px = s.x + s.nx * 2, pz = s.z + s.nz * 2;
      assert.ok(px > b.x0 - 1 && px < b.x1 + 1 && pz > b.z0 - 1 && pz < b.z1 + 1, `${ch.id}/${s.slot} faces inside`);
    }
  }
  // 피렌체: 정면 오큘러스는 입구 벽(+z)에서 제대 쪽(-z)을 보고, 드럼 동쪽 창(대관)은 제대 위에서 신랑 쪽(+z)을 본다
  const fl = slotsOf(church('florence'));
  const fac = fl.find((s) => s.slot === 'facade_center'), de = fl.find((s) => s.slot === 'drum_e'), dn = fl.find((s) => s.slot === 'drum_ne');
  assert.ok(fac.nz < -0.99 && Math.abs(fac.x) < 1e-6 && fac.z > 30);
  assert.ok(de.nz > 0.99 && Math.abs(de.x) < 1e-6 && de.z < -20 && de.y > 20);
  assert.ok(dn.x < -3 && dn.nx > 0.5 && dn.nz > 0.5 && Math.abs(dn.y - de.y) < 1e-6);
  // 성 베드로: 후진 중앙(-z 끝), 밀라노: 후진 가운데 창의 아랫부분(창턱 2.0m 에서 시작)
  const sp = slotsOf(church('stpeter'))[0];
  assert.ok(Math.abs(sp.x) < 1e-6 && sp.z < -33 && sp.nz > 0.99 && sp.shape === 'ellipse' && sp.fallback.length === 4 && sp.glows.length === 1);
  const mi = slotsOf(church('milan'))[0];
  assert.ok(Math.abs(mi.x) < 0.01 && mi.nz > 0.99 && Math.abs(mi.y - mi.h / 2 - 2.0) < 1e-6 && Math.abs(mi.w - 4.8) < 1e-6);
  // 성 바오로: 두 사진이 번갈아, 좌우 대칭
  const pa = slotsOf(church('stpaul'));
  const n1 = pa.filter((s) => s.win === 'alabaster_stpaul_1').length, n2 = pa.filter((s) => s.win === 'alabaster_stpaul_2').length;
  assert.equal(n1 + n2, 64); assert.ok(Math.abs(n1 - n2) <= 4);
  assert.equal(pa.filter((s) => s.x > 0).length, 32);
  assert.equal(pa.filter((s) => s.slot === 'clerestory').length, 42);
});

test('?photoglass=0 turns the table off: builders fall back to the old procedural windows', () => {
  const off = loadChurches({ search: '?photoglass=0' }).churches;
  for (const ch of off) assert.equal(slotsOf(ch).length, 0, ch.id);
  // 성 바오로 고창은 예전 치수(폭 0.92)로 돌아간다
  const hi = off.find((c) => c.id === 'stpaul').windows.filter((w) => w.y > 9 && Math.abs(w.w - 0.92) < 1e-6);
  assert.equal(hi.length, 42);
  // 다른 성당(대응표에 없는 곳)은 켜든 끄든 창 목록이 같다
  for (const id of ['lateran', 'maggiore', 'myeongdong', 'basic']) {
    const a = church(id), b = off.find((c) => c.id === id);
    assert.equal(a.windows.length, b.windows.length, id); assert.equal(a.roses.length, b.roses.length, id);
    assert.equal(a.colliders.length, b.colliders.length, id);
  }
  // 대응표가 있는 성당도 충돌체(걷는 길)는 그대로다
  for (const id of ['florence', 'stpeter', 'stpaul', 'milan']) assert.equal(church(id).colliders.length, off.find((c) => c.id === id).colliders.length, id);
});

test('builders with photo slots still prepare (walls, windows, AO bake) without throwing', () => {
  for (const id of ['florence', 'stpeter', 'stpaul', 'milan']) assert.doesNotThrow(() => church(id).prepare(), id);
});

test('photo plane material rules: same glass shader, no fog/lights/tone mapping/AO/shadows, safe fallback', () => {
  const src = fs.readFileSync(path.join(assets, 'glass_place.js'), 'utf8');
  for (const need of ['fog: false', 'lights: false', 'toneMapped: false', 'userData.noAO = true', 'castShadow = false', 'ChurchGlassView.shaders', 'ClampToEdgeWrapping', 'LinearMipmapLinearFilter', 'getMaxAnisotropy', "state = 'error'"]) assert.ok(src.includes(need), need);
  for (const bad of ['Math.random', 'noise', 'hue']) assert.ok(!src.includes(bad), bad);
  const view = fs.readFileSync(path.join(assets, 'glass_view.js'), 'utf8');
  assert.ok(view.includes('uniform float uFade') && view.includes('* uFade'), 'cross-fade uniform in the shared glass shader');
  const render = fs.readFileSync(path.join(assets, 'render.js'), 'utf8');
  assert.ok(render.includes('DstAlphaFactor') && render.includes('tBeauty'), 'bloom and AO skip photo glass pixels');
  for (const html of ['index.html', 'test.html']) {
    const h = fs.readFileSync(path.join(assets, html), 'utf8');
    const i = (s) => h.indexOf(`<script src="${s}"></script>`);
    assert.ok(i('glass_placements.js') > i('kit.js') && i('glass_placements.js') < i('ch_florence.js'), html + ': table before builders');
    assert.ok(i('glass_place.js') > i('glass_view.js') && i('glass_place.js') < i('main.js'), html + ': glass_place after glass_view, before main');
  }
});
