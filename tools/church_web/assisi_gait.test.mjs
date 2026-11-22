// 아시시 계단 걸음 시험: 층을 잇는 계단(하부 → 상부 36단, 하부 → 묘소 18단)을 걸어 오르내릴 때
// 코드로 그린 아바타(avatar.js Gait)의 발이 단 위에 디뎌지고(단에 파묻히지 않음), 디딘 발이 미끄러지지 않는다(밑창 속도 / 몸 속도 < 0.05).
// 몸은 main.js 와 같은 규칙: 발 높이 fy = floorY(x, z, fy), 루트 높이는 그 바닥으로 부드럽게 따라간다(× dt·14). 발 디딜 높이 = main.js groundFn.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadChurches } from './church_harness.mjs';
import { loadAvatar, BI } from './gait_lib.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');

const { churches } = loadChurches({ only: ['assisi'] });
const c = churches[0], Bd = c.builder;
const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones });
const SOLE = [];
for (let i = 0; i <= 12; i++) { const th = -1.35 + 2.7 * i / 12; SOLE.push([0, 0.025 - 0.08 - 0.033 * Math.cos(th), -0.082 + 0.178 * Math.sin(th)]); }

// 직선(a → b, xz)을 속도 v 로 걷는다. 반환: 프레임마다 두 발 밑창의 가장 낮은 점·그 자리 바닥·속도
function walkStair(a, b, y0, v = 1.2) {
  const { A, T } = loadAvatar();
  const av = new A.Avatar({ g: 1, skin: 0, style: 0, hair: 0, outfit: 0, name: 0, nv: 2 }, { showTag: false });
  av.setLod(0); av.phase = 0.3;
  av.setGround((x, z, y) => L.floorY(x, z, y + 0.2));   // main.js groundFn 과 같다
  const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), yaw = Math.atan2(-dx, -dz), dt = 1 / 60;
  const me = { x: a.x, z: a.z, fy: L.floorY(a.x, a.z, y0) }; me.y = me.fy;
  av.setPose(me.x, me.y, me.z, yaw); av.update(dt, 0); if (av.snapPose) av.snapPose();
  const v3 = new T.Vector3(), prev = [null, null], frames = [];
  let s = 0, t = 0;
  while (s < len + 0.6) {
    const sp = Math.min(v, (t + dt) * 2.5 * v);   // 출발 가속
    s = Math.min(len, s + sp * dt);
    const px = me.x, pz = me.z;
    me.x = a.x + dx / len * s; me.z = a.z + dz / len * s;
    me.fy = L.floorY(me.x, me.z, me.fy);
    me.y += (me.fy - me.y) * Math.min(1, dt * 14);
    const bodyV = Math.hypot(me.x - px, me.z - pz) / dt;
    av.setWalk(Math.min(1, bodyV / Logic.C.WALK_SPEED * 1.05));
    av.setPose(me.x, me.y, me.z, yaw);
    av.update(dt, t);
    av.root.updateMatrixWorld(true);
    const feet = [];
    for (const [k, bi] of [[0, BI.ftL], [1, BI.ftR]]) {
      const bone = av.bones[bi];
      const pts = SOLE.map((p) => { v3.set(p[0], p[1], p[2]); bone.localToWorld(v3); return [v3.x, v3.y, v3.z]; });
      let lo = 0; for (let q = 1; q < pts.length; q++) if (pts[q][1] < pts[lo][1]) lo = q;
      // 밑창 점마다 그 자리 바닥(루트 높이 기준 층) — 가장 많이 파묻힌 점
      let sink = -1e9; for (const p of pts) sink = Math.max(sink, L.floorY(p[0], p[2], me.y + 0.2) - p[1]);
      const floor = L.floorY(pts[lo][0], pts[lo][2], me.y + 0.2);
      const pv = prev[k], vel = pv ? Math.hypot(pts[lo][0] - pv[lo][0], pts[lo][2] - pv[lo][2]) / dt : 0;
      feet.push({ y: pts[lo][1], floor, gap: pts[lo][1] - floor, sink, vel });
      prev[k] = pts;
    }
    frames.push({ t, bodyV, feet, fy: me.fy });
    t += dt;
    if (t > 40) break;
  }
  return frames;
}
function stats(frames, from = 1.0) {
  let slip = 0, body = 0, n = 0, maxSink = -1e9;
  for (const f of frames) {
    if (f.t < from) continue;
    for (const F of f.feet) maxSink = Math.max(maxSink, F.sink);
    const lo = f.feet[0].gap < f.feet[1].gap ? 0 : 1, F = f.feet[lo];
    if (F.gap > 0.02 || f.bodyV < 0.3) continue;   // 디딘 발(바닥 + 2cm 안)만, 걷는 동안
    slip += F.vel; body += f.bodyV; n++;
  }
  const r = { ratio: body ? slip / body : 0, n, maxSink, endY: frames[frames.length - 1].fy };
  console.log(`# 계단 걸음: 미끄러짐 ${r.ratio.toFixed(3)}, 가장 깊이 파묻힘 ${(r.maxSink * 100).toFixed(1)}cm, 디딘 프레임 ${r.n}`);
  return r;
}

const ST = Bd.stair, H = Bd.heights, WL = Bd.well;
const sx = (ST.x0 + ST.x1) / 2;
test('assisi 계단 걸음: 하부 → 상부 36단을 오른다 — 발이 단에 파묻히지 않고(≤ 2.5cm) 디딘 발이 미끄러지지 않는다(< 0.05)', () => {
  const f = walkStair({ x: sx, z: -6.9 }, { x: sx, z: ST.z1 - 0.9 }, H.lower);
  const s = stats(f);
  assert.ok(Math.abs(s.endY - H.upper) < 1e-6, '꼭대기 = 상부 높이 ' + s.endY);
  assert.ok(s.n > 200, '디딘 프레임 ' + s.n);
  assert.ok(s.maxSink < 0.025, '발이 단에 파묻힘 ' + s.maxSink.toFixed(3));
  assert.ok(s.ratio < 0.05, '미끄러짐 ' + s.ratio.toFixed(3));
});
test('assisi 계단 걸음: 상부 → 하부 36단을 내려간다 — 파묻히지 않고 미끄러지지 않는다', () => {
  const f = walkStair({ x: sx, z: ST.z1 - 0.9 }, { x: sx, z: -6.9 }, H.upper);
  const s = stats(f);
  assert.ok(Math.abs(s.endY - H.lower) < 1e-6, '끝 = 하부 높이 ' + s.endY);
  assert.ok(s.maxSink < 0.025, '발이 단에 파묻힘 ' + s.maxSink.toFixed(3));
  assert.ok(s.ratio < 0.05, '미끄러짐 ' + s.ratio.toFixed(3));
});
test('assisi 계단 걸음: 하부 신랑 → 묘소 두 줄 계단(18단)을 내려가고 다시 오른다', () => {
  const x = (WL.x0 + WL.x1) / 2;
  const down = stats(walkStair({ x, z: WL.zTop + 1.0 }, { x, z: Bd.landing.z0 + 0.6 }, H.lower));
  assert.ok(Math.abs(down.endY - H.crypt) < 1e-6 && down.maxSink < 0.025 && down.ratio < 0.05, JSON.stringify(down));
  const up = stats(walkStair({ x, z: Bd.landing.z0 + 0.6 }, { x, z: WL.zTop + 1.0 }, H.crypt));
  assert.ok(Math.abs(up.endY - H.lower) < 1e-6 && up.maxSink < 0.025 && up.ratio < 0.05, JSON.stringify(up));
});
