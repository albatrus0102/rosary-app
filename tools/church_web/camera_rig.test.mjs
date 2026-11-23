// 3인칭 카메라 따라가기 시험(docs/church/CAMERA_MODES.md, 2026-11-23 3차 — 카메라는 벽을 개의치 않는다).
// 예전(createRig 리그)은 벽에 맞춰 거리·각도를 바꿨고 그것이 '정신없는 자동 줌'·'덜컹거림'이었다. 지금은:
// 1) 기둥 많은 성당의 신랑을 입구 → 제대 → 촛불대 → 입구로 걸을 때(뒤에서·옆에서) 카메라 → 피벗 거리가 사용자 거리 그대로(바뀜 0)이고,
//    아바타가 화면을 덮지 않으며, 지우지 못한 면에 가려진 프레임이 거의 없다(잘라내기가 사이를 지운다)
// 2) 입장 시점은 넓게(아바타는 화면 아래쪽에 작게~중간, 성당 안쪽을 본다)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { makeEnv, simulate, load, DT } from './cam_sim.mjs';
const require = createRequire(import.meta.url);
const Guard = require('../../assets/church/cam_guard.js');
const Stations = require('../../assets/church/stations.js');
const FEEL = require('../../assets/church/controls.js').FEEL;

const SPEED = 1.4;
// 입구 → 제대 앞 → 촛불대들 → 입구: 실제 걷기 경로를 일정 속도로 따라가며 매 프레임 (x,z,발,걷는 방향)
function walkFrames(env, side) {
  const St = Stations.create(env.L), st = St.stations(), sp = env.c.layout.spawn;
  const goals = [st.altar, ...st.candle.slice(0, 3), { x: sp.x, z: sp.z }];
  const frames = [];
  let cur = { x: sp.x, z: sp.z };
  for (const g of goals) {
    const p = St.findPath(cur, g);
    if (!p) continue;
    for (let i = 0; i + 1 < p.pts.length; i++) {
      const a = p.pts[i], b = p.pts[i + 1], len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(len / (SPEED * DT)));
      const yaw = Math.atan2(-(b.x - a.x), -(b.z - a.z)) + (side ? Math.PI / 2 : 0);
      for (let k = 0; k < n; k++) { const x = a.x + (b.x - a.x) * k / n, z = a.z + (b.z - a.z) * k / n; frames.push({ x, z, foot: env.floorAt(x, z, 0), yaw }); }
    }
    cur = g;
  }
  return frames;
}

for (const id of ['stpeter', 'milan', 'florence', 'myeongdong']) {
  test(`카메라 따라가기 ${id}: 걷는 동안 거리가 사용자 거리 그대로(자동 줌 0), 튐 0, 아바타가 가려지지 않는다`, () => {
    const env = makeEnv(id, Guard);
    for (const side of [false, true]) {
      const frames = walkFrames(env, side);
      assert.ok(frames.length > 300, 'walk frames');
      const s = simulate(env, frames, { Guard });
      const tag = `${id} ${side ? '옆' : '뒤'}`;
      assert.equal(s.boomNI, 0, `${tag}: 입력 없이 거리가 바뀐 프레임`);
      assert.equal(s.jumps, 0, `${tag}: 튐`);
      assert.ok(s.occ <= s.tp * 0.005, `${tag}: 가림 ${s.occ}/${s.tp}`);
    }
  });
}

test('입장 시점(기본 구도 FEEL.boomDist·pitchDefault·lookDrop): 모든 성당에서 아바타는 작게~중간, 시선은 8~25° 아래(바닥만 보지 않고 신랑·벽·제대 쪽), 성당 안쪽을 본다', () => {
  const { THREE } = load();
  const cam = new THREE.PerspectiveCamera(62, 9 / 19.5, 0.3, 700), v = new THREE.Vector3(), f = new THREE.Vector3();
  for (const id of load().churches.map((c) => c.id)) {
    const env = makeEnv(id, Guard), sp = env.c.layout.spawn || { x: 0, z: 0, r: 0 }, fy = env.floorAt(sp.x, sp.z, sp.y || 0) + 1.0, yaw = sp.r || 0, pitch = FEEL.pitchDefault, D = FEEL.boomDist;
    // main.js: 카메라 = 피벗 + 사용자 각도·거리(입장 첫 프레임은 바로)
    const cp = Math.cos(pitch);
    cam.position.set(sp.x + Math.sin(yaw) * cp * D, fy + Math.sin(pitch) * D, sp.z + Math.cos(yaw) * cp * D);
    cam.lookAt(sp.x, fy - FEEL.lookDrop, sp.z); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    v.set(sp.x, fy - 1.0, sp.z).project(cam); const yF = v.y; v.set(sp.x, fy + 0.75, sp.z).project(cam); const yH = v.y;
    const tag = id;
    assert.ok(Math.abs(yH - yF) / 2 < 0.4 && Math.abs(yH - yF) / 2 > 0.12, tag + ` — 아바타 크기(${((yH - yF) / 2).toFixed(2)})`);
    assert.ok(yH < 0.5 && yF > -1, tag + ` — 아바타 위치(${yF.toFixed(2)}..${yH.toFixed(2)})`);
    cam.getWorldDirection(f);
    const down = Math.asin(-f.y) * 180 / Math.PI;
    assert.ok(down > 8 && down < 25, tag + ` — 시선 ${down.toFixed(1)}° 아래(8~25°)`);
    assert.ok(cam.position.y - (fy - 1) > 1.5 && cam.position.y - (fy - 1) < 2.6, tag + ` — 카메라 높이 ${(cam.position.y - fy + 1).toFixed(2)}m(어깨~머리 조금 위)`);
    assert.ok(-Math.sin(yaw) * f.x - Math.cos(yaw) * f.z > 0.7, tag + ' — 입장 방향(성당 안쪽)을 보지 않는다');
    // 입장 첫 프레임: 잘라내기가 사이를 지워 아바타가 보인다
    const C = Guard.createCut(), O = {};
    C.step({ guard: env.guard, cx: cam.position.x, cy: cam.position.y, cz: cam.position.z, mx: sp.x, my: fy, mz: sp.z, hy: fy + 0.55, foot: fy - 1, low: false, fp: 0 }, DT, O);
    assert.ok(!(C.blocked(env.guard, sp.x, fy + 0.55, sp.z) && C.blocked(env.guard, sp.x, fy, sp.z)), tag + ' — 입장 첫 프레임에 아바타가 가려졌다');
  }
});
