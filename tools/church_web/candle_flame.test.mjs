// 촛불 불꽃 한 덩어리(kit.js createFlameBatch, world.js 가 봉헌초 + 제단·촛대 불꽃을 모두 이것으로 그린다):
//  - 켠 초와 안 켠 초가 눈에 띄게 다르다(켜면 불꽃 인스턴스가 살고, 끄면 배율 0 으로 사라진다)
//  - 켜고 꺼도 draw call 이 늘지 않는다(InstancedMesh 하나·자식 추가 없음) — 촛불마다 스프라이트를 만들던 옛 방식 폐지
//  - 불꽃·후광·깜박임·내 초 고리는 셰이더(uniform 하나), 움직임 줄이기에서는 깜박임 0
//  - 제단 불꽃(ctx.addFlame)은 스프라이트를 만들지 않고 핸들만 돌려준다
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChurches } from './church_harness.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const { churches, Kit, THREE } = loadChurches();

function scaleOf(fb, i) {
  const m = new THREE.Matrix4(); fb.mesh.getMatrixAt(i, m);
  const e = m.elements; return Math.hypot(e[0], e[1], e[2]);
}

test('불꽃 한 덩어리: 켜면 보이고 끄면 사라진다(배율 0), 하나의 InstancedMesh', () => {
  const fb = Kit.createFlameBatch(8);
  assert.ok(fb.mesh.isInstancedMesh);
  assert.equal(fb.mesh.visible, false, '아무 초도 안 켜졌으면 그리지 않는다');
  for (let i = 0; i < 8; i++) assert.equal(fb.alloc(), i);
  assert.equal(fb.alloc(), -1);
  for (let i = 0; i < 8; i++) assert.equal(scaleOf(fb, i), 0, '안 켠 칸은 불꽃 없음');
  fb.set(3, 1, 2, 3, 0.85, 1.5, 0.36, 0.33, 0, 0);
  assert.equal(fb.mesh.visible, true);
  assert.ok(scaleOf(fb, 3) > 0.8, '켠 칸은 불꽃이 산다');
  assert.equal(scaleOf(fb, 2), 0, '이웃 안 켠 칸은 그대로');
  assert.equal(fb.litCount(), 1);
  fb.clear(3);
  assert.equal(scaleOf(fb, 3), 0);
  assert.equal(fb.mesh.visible, false);
});

test('draw call: 초를 몇 개 켜도 메쉬 수·재질 수가 그대로(+0)', () => {
  const fb = Kit.createFlameBatch(96);
  const root = new THREE.Group(); root.add(fb.mesh);
  const count = () => { let n = 0; root.traverse((o) => { if (o.isMesh || o.isSprite || o.isPoints) n++; }); return n; };
  const before = count();
  for (let i = 0; i < 96; i++) fb.alloc();
  for (let i = 0; i < 96; i++) fb.set(i, i * 0.1, 1, 0, 0.85, i, 0.36, 0.33, 0, i % 2 ? 1 : 0);
  assert.equal(count(), before, '96개를 켜도 그려지는 객체 수는 같다');
  assert.equal(before, 1);
  assert.equal(fb.mesh.count, 96);
  assert.equal(fb.mesh.material.transparent, true);
  assert.equal(fb.mesh.material.depthWrite, false);
  assert.equal(fb.mesh.material.blending, THREE.AdditiveBlending);
});

test('셰이더: 겹 불꽃·후광·바닥 빛무리·번쩍임·내 초 고리가 들어 있고, 깜박임은 uniform 으로 끈다', () => {
  const fb = Kit.createFlameBatch(2);
  const fs_ = fb.mesh.material.fragmentShader;
  for (const k of ['core', 'mid', 'inside', 'h1', 'h2', 'vMine', 'vT0', 'ring', 'pulse']) assert.ok(fs_.includes(k), k);
  assert.equal(fb.uniforms.uFlick.value, 1);
  fb.setReducedMotion(true);
  assert.equal(fb.uniforms.uFlick.value, 0, '움직임 줄이기: 깜박임 없음');
  fb.setReducedMotion(false);
  assert.equal(fb.uniforms.uFlick.value, 1);
  fb.setNight(0); const day = fb.uniforms.uHalo.value;
  fb.setNight(1); const night = fb.uniforms.uHalo.value;
  assert.ok(night > day * 1.5, '밤에 후광이 더 크게 번진다');
  fb.setTime(12.5); assert.equal(fb.uniforms.uTime.value, 12.5);
});

test('내 초 표시·켠 순간: 인스턴스 속성(aMine, aT0)으로만 — 속성 추가만 있고 draw call 없음', () => {
  const fb = Kit.createFlameBatch(4);
  fb.alloc(); fb.alloc();
  fb.set(0, 0, 1, 0, 0.85, 0, 0.36, 0.33, 5.0, 2);
  fb.set(1, 1, 1, 0, 0.85, 0, 0.36, 0.33, -100, 0);
  const g = fb.mesh.geometry;
  assert.equal(g.getAttribute('aMine').array[0], 2);
  assert.equal(g.getAttribute('aMine').array[1], 0);
  assert.equal(g.getAttribute('aT0').array[0], 5);
  assert.ok(g.getAttribute('aT0').array[1] < 0);
});

test('모든 성당: 제단·촛대 불꽃(addFlame)은 스프라이트 없이 핸들만(켜고 끌 수 있다)', () => {
  let total = 0;
  for (const c of churches) {
    const fl = c.ctx._.flames;
    total += fl.length;
    for (const h of fl) {
      assert.equal(typeof h.visible, 'boolean');
      assert.ok(!h.isSprite && !h.position, c.id + ': 스프라이트가 아니다');
      assert.ok(Number.isFinite(h.x) && Number.isFinite(h.y) && Number.isFinite(h.z));
    }
    let sprites = 0; c.ctx.root.traverse((o) => { if (o.isSprite) sprites++; });
    assert.ok(sprites <= (c.ctx._.glows || []).length + 2, c.id + ': 불꽃용 스프라이트가 남아 있지 않다');
  }
  assert.ok(total > 10, '여러 성당에 제단 불꽃이 있다: ' + total);
});

test('world.js 연결: 봉헌초는 한 덩어리 불꽃 + 색·내 초 인스턴스 속성을 쓴다(스프라이트 새로 만들지 않음)', () => {
  const src = fs.readFileSync(path.join(here, '../../assets/church/world.js'), 'utf8');
  assert.ok(src.includes('createFlameBatch'));
  assert.ok(!/new T\.Sprite\(flameMat\)/.test(src), '켤 때마다 스프라이트를 만들지 않는다');
  assert.ok(src.includes('CANDLE_COLORS') && src.includes('cups.setColorAt'), '초 색(컵·촛농)은 인스턴스 색');
  assert.ok(/mineMap/.test(src) && /aMine|ml\)/.test(src), '내 초 표시');
  assert.ok(src.includes('prefers-reduced-motion'), '움직임 줄이기 존중');
  const av = fs.readFileSync(path.join(here, '../../assets/church/avatar.js'), 'utf8');
  assert.ok(av.includes('playLightGesture') && av.includes('CROSS[Math.min(3, ic)]'), '초 켜기 동작: 손 뻗기 → 성호경');
});
