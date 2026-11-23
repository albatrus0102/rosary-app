// 3인칭 카메라 가림 시험(cam_guard.js 가는 장애물 · 가림 잘라내기(cutaway) · 아바타 근접 흐리기 · 기도 자리 시점).
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
  const e = { c, L, guard: Guard.build(c.ctx.root, { yLow, THREE, space: false, floorTop: Math.max(0, ...c.zones.map((z) => z.y)) }), old: Guard.build(c.ctx.root, { yLow, thinPass: false, see: false, space: false }) };
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

test('넓은 면(벽)은 clip 이 막힘으로 알린다(잘라내기가 원뿔·단면을 켠다 — 카메라는 그대로)', () => {
  const { guard } = env('florence');
  // 신랑 가운데에서 측랑 바깥벽(x≈8.55) 너머로
  const t = guard.clip(6.5, 1.0, 11.4, 14, 3.0, 11.4, 0.35);
  assert.ok(t < 0.4, `벽 너머로 나갔다(${t})`);
  assert.equal(guard.out.thin, 1);
});

test('가림 잘라내기: 메시에 seeThru 칸 값을 달고 재질 셰이더를 잇는다(공유 균일값, 원래 onBeforeCompile 보존, 원뿔 안은 전부 지움)', () => {
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
  assert.match(sh.vertexShader, /attribute float seeLvl/);
  assert.match(sh.fragmentShader, /if \(sN < sF\) discard/, '세기 1 이면 구역 안쪽 전부(디더 망점이 아니라 구멍)');
  assert.equal(sh.uniforms.uSeeK, guard.see.k, '균일값 객체를 나눠 쓴다');
  assert.equal(sh.uniforms.uSeeP, guard.see.p); assert.equal(sh.uniforms.uSeeQ, guard.see.q);
  assert.match(mat.customProgramCacheKey(), /\|see3$/);
  // 매 프레임 갱신은 숫자만 바꾼다(같은 배열) — 재컴파일·할당 없음
  const a0 = guard.see.a.value, k0 = guard.see.k.value;
  guard.see.set(1, 2, 3, 4, 5, 6, 0.7, 0.4, 0.2, 1.5);
  assert.equal(guard.see.a.value, a0); assert.equal(guard.see.k.value, k0); assert.equal(a0[2], 3);
  assert.deepEqual(Array.from(k0).map((v) => +v.toFixed(2)), [0.7, 0.4, 0.2, 1.5]);
  const p0 = guard.see.p.value; guard.see.setCut(1.7, 1, 6, 0.5, 0.7, 1, 3.3, 2.0);
  assert.equal(guard.see.p.value, p0); assert.deepEqual(Array.from(p0).map((v) => +v.toFixed(2)), [1.7, 1, 6, 0.5]);
  // 반사 탐침 굽기 동안 끄고 되돌린다
  guard.see.mute(); assert.equal(guard.see.k.value[1], 0); assert.equal(guard.see.p.value[1], 0);
  guard.see.unmute(); assert.ok(Math.abs(guard.see.k.value[1] - 0.4) < 1e-6 && guard.see.p.value[1] === 1);
});

test('잘라내기 칸: 바닥은 원뿔·단면으로 지우지 않고(42 — 위층 잘라내기·머리 위만), 의자 같은 낮은 물체(85)·넓은 면(170)·가는 면(255)으로 나뉜다', () => {
  for (const id of ['myeongdong', 'stpeter']) {
    const { c, guard } = env(id);
    assert.ok(guard.lowTriangles > 1000, `${id}: 낮은 물체 ${guard.lowTriangles}`);
    const cnt = { 0: 0, 42: 0, 85: 0, 170: 0, 255: 0 };
    let floorBad = 0, floorN = 0;
    c.ctx.root.updateMatrixWorld(true);
    const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
    c.ctx.root.traverse((m) => {
      const g = m.isMesh && m.geometry, a = g && g.attributes.seeThru, no = g && g.attributes.normal;
      if (!a) return;
      nm.getNormalMatrix(m.matrixWorld);
      for (let i = 0; i < a.count; i++) {
        cnt[a.array[i]] = (cnt[a.array[i]] || 0) + 1;
        if (!no) continue;
        v.fromBufferAttribute(g.attributes.position, i).applyMatrix4(m.matrixWorld);
        n.fromBufferAttribute(no, i).applyMatrix3(nm).normalize();
        if (n.y > 0.9 && v.y < 0.1) { floorN++; if (a.array[i] && a.array[i] !== 42) floorBad++; }   // 걷는 바닥(위를 보는 면, 바닥 높이)
      }
    });
    assert.ok(cnt[85] > 0 && cnt[170] > 0 && cnt[255] > 0, `${id}: 칸 ${JSON.stringify(cnt)}`);
    assert.ok(floorN > 100 && floorBad === 0, `${id}: 바닥 정점 ${floorN} 중 ${floorBad} 개가 원뿔·단면으로 지울 수 있게 되어 있다`);
  }
});

test('기도(앉기·무릎) 시점: 앞옆 45°(뒤에서 135°)에서, 가림이 적은 쪽을 고른다', () => {
  // 가짜 가드: 막힌 쪽(카메라 x 부호가 -side)으로 쏜 선은 가까이에서 벽에 닿는다
  const sp = (ok) => { const out = { thin: 1 }; return { out, clip: (ax, ay, az, bx, by, bz) => { out.thin = 1; return ok(bx, by, bz) ? 1 : 0.2; } }; };
  const seatYaw = 0;   // 아바타는 -z 를 본다. 카메라 방위 yaw: 카메라는 (+sin, +cos) 쪽
  for (const side of [1, -1]) {
    const g = sp((x) => x * side > -0.5), yaw = Guard.prayYaw(g, null, 0, 1.25, 0, seatYaw, 3.7, Guard.PRAY.pitch);
    assert.ok(Math.abs(Math.abs(yaw - seatYaw) - Guard.PRAY.side) < 1e-6, `yaw ${yaw}`);
    assert.ok(Math.sin(yaw) * side > 0, `트인 쪽(${side > 0 ? '+x' : '-x'})을 고르지 않았다(${yaw.toFixed(2)})`);
    assert.ok(Math.cos(yaw) < -0.5, '앞쪽(아바타가 보는 쪽)에서 비스듬히');
  }
  // 시점 섞기: PRAY 는 아바타 자체를 본다(앞으로 비켜 보지 않음)
  const o = {}; Guard.spotBlend(0.45, 4.4, 4.4, 1, o, Guard.PRAY);
  assert.equal(o.fwd, 0); assert.ok(Math.abs(o.pitch - Guard.PRAY.pitch) < 1e-9 && Math.abs(o.D - 4.4 * Guard.PRAY.zoom) < 1e-9);
});

test('여러 성당에서 홀로 선 기둥은 가늘고, 기존 벽 가드 시험은 cam_guard.test 가 지킨다', () => {
  for (const id of ['florence', 'milan', 'stpeter', 'maggiore', 'lateran']) {
    const { guard } = env(id);
    assert.ok(guard.thinTriangles > 50, `${id}: 가는 면 ${guard.thinTriangles}`);
    assert.ok(guard.thinTriangles < guard.triangles * 0.25, `${id}: 가는 면이 너무 많다 ${guard.thinTriangles}/${guard.triangles}`);
  }
});

test('근접 흐리기: 카메라–머리 1.7m 이상 불투명, 가까울수록 흐리되 최소 불투명도(0.35)는 지킨다(캐릭터가 사라지지 않음), 단조', () => {
  assert.equal(Guard.avatarAlpha(1.7), 1);
  assert.equal(Guard.avatarAlpha(3), 1);
  assert.ok(Guard.avatarAlpha(1.3) < 0.8);
  assert.ok(Math.abs(Guard.avatarAlpha(0.7) - Guard.MIN_ALPHA) < 1e-9 && Guard.avatarAlpha(0.1) >= Guard.MIN_ALPHA);
  let p = 0;
  for (let d = 0.4; d <= 1.8; d += 0.05) { const a = Guard.avatarAlpha(d); assert.ok(a >= p - 1e-9); p = a; }
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
