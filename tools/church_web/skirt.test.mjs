// 사용: node --test tools/church_web/skirt.test.mjs — 원피스(여성 아바타)를 입고 걸을 때 다리가 자락을 뚫고 나오지 않는다(2026-11-23 사용자 신고,
// 여의도 안내 투어에서 4 m/s 로 걸을 때 오른다리가 치마 밖으로). 측정: skirt_lib.mjs(다리 세로줄이 자락 천을 지나는 횟수), 보고: skirt_report.mjs, 그림: skirt_shots.mjs.
// 고치기 전: 4 m/s 근거리 120프레임에 616회(96프레임, 최대 205mm), 1.2 m/s 218회. 고친 뒤 0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAvatar } from './gait_lib.mjs';
import { skirtScenario, SCENARIOS } from './skirt_report.mjs';

const WALKS = ['walk 0.8', 'walk 1.2', 'walk 2.0', 'walk 3.0', 'walk 4.0', 'start/stop 4.0', 'walk+turn', 'turn in place', 'idle'];

test('원피스: 걷기(0.8~4 m/s)·출발/멈춤·걸으며 돌기·제자리 돌기에서 다리가 자락 천을 뚫지 않는다(근거리 LOD, 옷 색 3가지)', () => {
  for (const outfit of [0, 3, 6]) for (const name of WALKS) {
    const r = skirtScenario(undefined, { ...SCENARIOS[name](), outfit });
    assert.equal(r.sum, 0, `outfit ${outfit} ${name}: ${r.sum} crossings in ${r.hit} frames, max ${r.maxMm} mm (t ${r.worstT})`);
  }
});

test('원피스: 중거리 LOD(자락 줄이 성김)도 곧게 걸을 때는 겉면에 1mm 넘게 뚫지 않는다(고치기 전 4 m/s 455회·220mm)', () => {
  for (const name of ['walk 1.2', 'walk 2.0', 'walk 4.0']) {
    const r = skirtScenario(undefined, { ...SCENARIOS[name](), level: 'mid' });
    assert.ok(r.sum <= 16 && r.maxMm <= 1, `mid ${name}: ${r.sum} crossings, max ${r.maxMm} mm`);
  }
});

test('앉기·무릎 꿇기의 자락은 걷기 수정으로 나빠지지 않는다(앉은 고관절 주름은 원래 값 이하)', () => {
  // 고치기 전: sit 709회 / 최대 109.3mm, kneel 347회 / 112.3mm(앉은 자세에서 허벅지 위 접힌 앞자락이 고관절 주름에 파묻히는 것 — 걷기와 별개)
  for (const [name, n0, mm0] of [['sit', 709, 109.3], ['kneel', 347, 112.3], ['kneel->stand', 519, 112.3]]) {
    const r = skirtScenario(undefined, SCENARIOS[name]());
    assert.ok(r.sum <= n0 && r.maxMm <= mm0 + 0.5, `${name}: ${r.sum} (<= ${n0}), ${r.maxMm} mm (<= ${mm0})`);
  }
});

test('남성(바지)은 원피스 뒷자락 뼈(cbL/cbR)를 쓰지 않고, 걷는 동안 그 뼈는 돌지 않는다', () => {
  const { A } = loadAvatar();
  const av = new A.Avatar({ g: 1, skin: 0, style: 0, hair: 0, outfit: 0, name: 0, nv: 2 }, { showTag: false });
  av.setLod(0);
  const geo = av.meshes.near.cloth.geometry, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
  const CB = [21, 22];   // avatar.js BN: ..., 'skirt', 'ckL', 'ckR', 'cbL', 'cbR'
  for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++) if (CB.includes(si.array[i * 4 + k])) assert.ok(sw.array[i * 4 + k] < 1e-6, `male vertex ${i} weighted to cb`);
  const fem = new A.Avatar({ g: 0, skin: 0, style: 0, hair: 0, outfit: 0, name: 0, nv: 2 }, { showTag: false });
  fem.setLod(0);
  const fg = fem.meshes.near.cloth.geometry; let used = 0;
  for (let i = 0; i < fg.attributes.skinIndex.count; i++) for (let k = 0; k < 4; k++) if (CB.includes(fg.attributes.skinIndex.array[i * 4 + k]) && fg.attributes.skinWeight.array[i * 4 + k] > 0.1) used++;
  assert.ok(used > 50, `female back panel uses cb bones (${used})`);
  let z = 0;
  av.setPose(0, 0, 0, 0); av.update(1 / 60, 0);
  for (let t = 0; t < 2; t += 1 / 60) { z -= 4 * (1 / 60); av.setWalk(1); av.setPose(0, 0, z, 0); av.update(1 / 60, t); }
  for (const b of CB) assert.ok(Math.abs(av.bones[b].quaternion.w) > 0.99999, 'male cb bone rotated');
});
