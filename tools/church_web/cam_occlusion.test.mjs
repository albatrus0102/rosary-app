// 3인칭 카메라 가림 시험(cam_guard.js 가는 장애물 · 가림 디더 · 아바타 근접 흐리기 · 기도 자리 시점).
// 사용자 제보(피렌체 성모 기도 자리 앞): 뒤 기둥에 카메라가 아바타 등까지 당겨져 화면이 검은 옷으로 가득 찼다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Guard = require('../../assets/church/cam_guard.js');
const Stations = require('../../assets/church/stations.js');

const { churches, Logic, THREE } = loadChurches();
const envs = new Map();
function env(id) {
  if (envs.has(id)) return envs.get(id);
  const c = churches.find((x) => x.id === id);
  if (c.ret && c.ret.group) c.ctx.root.add(c.ret.group);
  c.prepare().forEach((it) => c.ctx.root.add(it.batch.build(it.material, it.name, { spatial: true })));
  const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones });
  const sp = c.layout.spawn || { x: 0, z: 0 }, yLow = (L.floorY(sp.x, sp.z) || 0) + 1.05;
  const e = { c, L, guard: Guard.build(c.ctx.root, { yLow, THREE }), old: Guard.build(c.ctx.root, { yLow, thinPass: false, see: false }) };
  envs.set(id, e);
  return e;
}

test('가는 장애물: 피렌체 신랑 기둥 뒤에서 카메라 거리를 유지하고, 가림을 알린다', () => {
  const { guard, old } = env('florence');
  assert.ok(guard.thinTriangles > 200, `가는 면 ${guard.thinTriangles}`);
  // 기둥(4.3, 15.85) 을 사이에 두고 신랑 쪽 머리 → 측랑 쪽 카메라
  for (const z of [6.95, 15.85, 24.75]) {
    const t = guard.clip(2.4, 1.0, z, 7.2, 3.0, z, 0.35);
    assert.equal(t, 1, `z=${z}: 기둥에 카메라가 당겨졌다(${t})`);
    assert.ok(guard.out.thin < 1, `z=${z}: 가는 면 가림을 못 찾았다`);
    assert.ok(old.clip(2.4, 1.0, z, 7.2, 3.0, z, 0.35) < 0.5, '예전 방식은 당긴다(시험 자리 확인)');
  }
});

test('넓은 면(벽)은 예전처럼 카메라를 당긴다', () => {
  const { guard } = env('florence');
  // 신랑 가운데에서 측랑 바깥벽(x≈8.55) 너머로
  const t = guard.clip(6.5, 1.0, 11.4, 14, 3.0, 11.4, 0.35);
  assert.ok(t < 0.4, `벽 너머로 나갔다(${t})`);
  assert.equal(guard.out.thin, 1);
});

test('가림 디더: 가는 면 메시에 seeThru 값을 달고 재질 셰이더를 잇는다(공유 균일값, 원래 onBeforeCompile 보존)', () => {
  const { c, guard } = env('florence');
  assert.ok(guard.see && guard.see.materials > 0, 'see 균일값');
  let marked = 0, meshes = 0, mat = null;
  c.ctx.root.traverse((m) => {
    const a = m.isMesh && m.geometry && m.geometry.attributes && m.geometry.attributes.seeThru;
    if (!a) return;
    meshes++;
    for (let i = 0; i < a.count; i++) if (a.array[i]) { marked++; if (!mat) mat = Array.isArray(m.material) ? m.material[0] : m.material; break; }
  });
  assert.ok(meshes > 0 && marked > 0 && mat, 'seeThru 붙은 메시');
  const sh = { uniforms: {}, vertexShader: 'void main() {\n#include <project_vertex>\n}', fragmentShader: 'void main() {\ngl_FragColor = vec4(1.0);\n}' };
  mat.onBeforeCompile(sh, null);
  assert.match(sh.vertexShader, /attribute float seeThru/);
  assert.match(sh.fragmentShader, /discard/);
  assert.equal(sh.uniforms.uSeeK, guard.see.k, '균일값 객체를 나눠 쓴다');
  assert.match(mat.customProgramCacheKey(), /\|see$/);
  // 매 프레임 갱신은 숫자만 바꾼다(같은 배열)
  const a0 = guard.see.a.value;
  guard.see.set(1, 2, 3, 4, 5, 6, 0.7);
  assert.equal(guard.see.a.value, a0); assert.equal(guard.see.k.value, 0.7); assert.equal(a0[2], 3);
});

test('여러 성당에서 홀로 선 기둥은 가늘고, 기존 벽 가드 시험은 cam_guard.test 가 지킨다', () => {
  for (const id of ['florence', 'milan', 'stpeter', 'maggiore', 'lateran']) {
    const { guard } = env(id);
    assert.ok(guard.thinTriangles > 50, `${id}: 가는 면 ${guard.thinTriangles}`);
    assert.ok(guard.thinTriangles < guard.triangles * 0.25, `${id}: 가는 면이 너무 많다 ${guard.thinTriangles}/${guard.triangles}`);
  }
});

test('근접 흐리기: 카메라–머리 1.3m 이상 불투명, 0.6m 이하 거의 투명, 단조', () => {
  assert.equal(Guard.avatarAlpha(1.3), 1);
  assert.equal(Guard.avatarAlpha(3), 1);
  assert.ok(Guard.avatarAlpha(0.6) < 0.1 && Guard.avatarAlpha(0.3) < 0.1);
  let p = 0;
  for (let d = 0.4; d <= 1.4; d += 0.05) { const a = Guard.avatarAlpha(d); assert.ok(a >= p - 1e-9); p = a; }
});

test('자리 시점: 봉헌초·성모 기도 자리·제대 앞에 도착하면 목표물이 화면 가운데~위, 아바타는 아래', () => {
  const cam = new THREE.PerspectiveCamera(62, 9 / 19.5, 0.3, 700), o = {}, v = new THREE.Vector3();
  let n = 0;
  for (const id of ['florence', 'stpeter', 'milan']) {
    const { c, L } = env(id), S = Stations.create(L), st = S.stations();
    const list = st.candle.map((s) => ({ s, tx: s.stand.x, tz: s.stand.z }));
    list.push({ s: st.altar, tx: st.altar.x - Math.sin(st.altar.yaw) * 2.5, tz: st.altar.z - Math.cos(st.altar.yaw) * 2.5 });
    for (const { s, tx, tz } of list) {
      const y0 = L.floorY(s.x, s.z) || 0, fy = y0 + 1.0, base = 7.2;
      Guard.spotBlend(0.45, base, base, 1, o);
      assert.ok(Math.abs(o.pitch - Guard.SPOT.pitch) < 1e-9 && Math.abs(o.D - base * Guard.SPOT.zoom) < 1e-9);
      const yaw = s.yaw + Guard.SPOT.side, dx = Math.sin(yaw), dz = Math.cos(yaw);
      cam.position.set(s.x + dx * Math.cos(o.pitch) * o.D, fy + Math.sin(o.pitch) * o.D, s.z + dz * Math.cos(o.pitch) * o.D);
      cam.lookAt(s.x - Math.sin(s.yaw) * o.fwd, fy + o.up, s.z - Math.cos(s.yaw) * o.fwd);
      cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      v.set(tx, y0 + 1.4, tz).project(cam); const tY = v.y, tX = v.x;
      v.set(s.x, y0 + 1.0, s.z).project(cam); const aY = v.y, aX = v.x;
      assert.ok(Math.abs(tX) < 0.6 && tY > -0.25 && tY < 0.9, `${id} 목표물 화면 (${tX.toFixed(2)},${tY.toFixed(2)})`);
      assert.ok(aY < tY && aY < -0.05, `${id} 아바타가 아래가 아니다 (${aX.toFixed(2)},${aY.toFixed(2)})`);
      assert.ok(Math.abs(aX) > 0.05, `${id} 아바타가 한편으로 비켜 있지 않다`);
      n++;
    }
  }
  assert.ok(n >= 6);
});
