// 계단 걸음 시험(아시시·여의도동): 층을 잇는 계단(아시시 하부 → 상부 36단, 하부 → 묘소 18단, 여의도동 곡선 계단)을 걸어 오르내릴 때
// — 보통 걸음(1.2 m/s)과 최고 속도(scene_logic WALK_SPEED, 2026-11-22부터 4 m/s 빠른 걸음) 둘 다
// 코드로 그린 아바타(avatar.js Gait)의 발이 단 위에 디뎌지고(단에 파묻히지 않음), 디딘 발이 미끄러지지 않는다(밑창 속도 / 몸 속도 < 0.05).
// 몸은 main.js 와 같은 규칙: 발 높이 fy = floorY(x, z, fy), 루트 높이는 그 바닥으로 부드럽게 따라간다(× dt·14). 발 디딜 높이 = main.js groundFn.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadChurches } from './church_harness.mjs';
import { loadAvatar, BI, cameraTrack } from './gait_lib.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');

const { churches } = loadChurches({ only: ['assisi'] });
const c = churches[0], Bd = c.builder;
const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones });
const SOLE = [];
for (let i = 0; i <= 12; i++) { const th = -1.35 + 2.7 * i / 12; SOLE.push([0, 0.025 - 0.08 - 0.033 * Math.cos(th), -0.082 + 0.178 * Math.sin(th)]); }

// 직선(a → b, xz)을 속도 v 로 걷는다. 반환: 프레임마다 두 발 밑창의 가장 낮은 점·그 자리 바닥·속도
function walkStair(a, b, y0, v = 1.2) { return walkLine(L, [a, b], y0, v); }
// 꺾은선(pts, xz)을 따라 속도 v 로 걷는다(꺾이는 곳에서 몸 방향은 main.js 처럼 × dt·11 로 돈다). Lg: ChurchLogic
function walkLine(Lg, pts, y0, v = 1.2) {
  const segs = []; let len = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); if (d > 1e-6) { segs.push({ a: pts[i - 1], b: pts[i], s0: len, d }); len += d; } }
  const at = (s) => { let g = segs[segs.length - 1]; for (const q of segs) if (s <= q.s0 + q.d) { g = q; break; } const f = Math.min(1, Math.max(0, (s - g.s0) / g.d)); return { x: g.a.x + (g.b.x - g.a.x) * f, z: g.a.z + (g.b.z - g.a.z) * f, yaw: Math.atan2(-(g.b.x - g.a.x), -(g.b.z - g.a.z)) }; };
  const L = Lg, a = pts[0];
  const { A, T } = loadAvatar();
  const av = new A.Avatar({ g: 1, skin: 0, style: 0, hair: 0, outfit: 0, name: 0, nv: 2 }, { showTag: false });
  av.setLod(0); av.phase = 0.3;
  av.setGround((x, z, y) => L.floorY(x, z, y + 0.2));   // main.js groundFn 과 같다
  const dt = 1 / 60;
  let yaw = at(0).yaw;
  const me = { x: a.x, z: a.z, fy: L.floorY(a.x, a.z, y0) }; me.y = me.fy;
  av.setPose(me.x, me.y, me.z, yaw); av.update(dt, 0); if (av.snapPose) av.snapPose();
  const v3 = new T.Vector3(), prev = [null, null], frames = [];
  let s = 0, t = 0;
  while (s < len + 0.6) {
    const sp = Math.min(v, (t + dt) * 2.5 * v);   // 출발 가속
    s = Math.min(len, s + sp * dt);
    const px = me.x, pz = me.z;
    const P = at(s); me.x = P.x; me.z = P.z;
    yaw += Math.atan2(Math.sin(P.yaw - yaw), Math.cos(P.yaw - yaw)) * Math.min(1, dt * 11);
    me.fy = L.floorY(me.x, me.z, me.fy);
    const mvx = me.x - px, mvz = me.z - pz, mvd = Math.hypot(mvx, mvz);
    me.y += ((mvd > 1e-5 ? L.bodyY(me.x, me.z, me.fy, mvx / mvd, mvz / mvd) : me.fy) - me.y) * Math.min(1, dt * 14);   // main.js 와 같다(계단은 비탈처럼)
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
      feet.push({ y: pts[lo][1], floor, gap: pts[lo][1] - floor, sink, vel, st: av.gait ? av.gait.f[k].st : 1 });
      prev[k] = pts;
    }
    frames.push({ t, dt, y: me.y, bodyV, feet, fy: me.fy });
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
    // 디딘 발 = 걸음이 디딤으로 둔 발(gait.f[k].st) 가운데 바닥 + 2cm 안인 낮은 발, 걷는 동안. 옛 식(두 발 가운데 낮은 발)은 4 m/s 로 오를 때
    // 단 위를 1cm 로 스쳐 지나가는 흔드는 발(15 m/s)을 디딘 발로 잘못 세었다(디딘 발이 단 끝에 걸쳐 밑창 가장 낮은 점이 아랫단 위에 떠 있을 때).
    const c = [0, 1].filter((k) => f.feet[k].st && f.feet[k].gap <= 0.02);
    if (!c.length || f.bodyV < 0.3) continue;
    const F = f.feet[c.length > 1 && f.feet[1].gap < f.feet[0].gap ? 1 : c[0]];
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

// 최고 속도(조이스틱 끝·「가기」 자동 걷기)로 계단을 지나도 디딘 발이 미끄러지지 않는다. 4 m/s 에서는 발을 더 세워 떼므로(앞꿈치가 밑창 모형보다 조금 더 눌림) 파묻힘 한도 3cm.
const TOP = Logic.C.WALK_SPEED, SINK_TOP = 0.03;
test(`assisi 계단 걸음(최고 속도 ${TOP} m/s): 36단 오르내리기·묘소 계단 — 미끄러짐 < 0.05, 파묻힘 ≤ 3cm`, () => {
  const runs = [
    walkStair({ x: sx, z: -6.9 }, { x: sx, z: ST.z1 - 0.9 }, H.lower, TOP), walkStair({ x: sx, z: ST.z1 - 0.9 }, { x: sx, z: -6.9 }, H.upper, TOP),
    walkStair({ x: (WL.x0 + WL.x1) / 2, z: WL.zTop + 1.0 }, { x: (WL.x0 + WL.x1) / 2, z: Bd.landing.z0 + 0.6 }, H.lower, TOP),
    walkStair({ x: (WL.x0 + WL.x1) / 2, z: Bd.landing.z0 + 0.6 }, { x: (WL.x0 + WL.x1) / 2, z: WL.zTop + 1.0 }, H.crypt, TOP)
  ].map((f) => stats(f));
  for (const r of runs) { assert.ok(r.ratio < 0.05, '미끄러짐 ' + JSON.stringify(r)); assert.ok(r.maxSink < SINK_TOP, '파묻힘 ' + JSON.stringify(r)); assert.ok(r.n > 30, '디딘 프레임 ' + r.n); }
});

// 여의도동 곡선 계단(성당·2층 로비 0 → 1층 로비 −4.2): stations 경로(main.js 누르기 이동과 같은 길)를 따라 보통 걸음·최고 속도로 내려갔다 올라온다
const Y = loadChurches({ only: ['yeouido'] }).churches[0], YL = Logic.create(Y.layout, { colliders: Y.colliders, zones: Y.zones }), YS = Stations.create(YL);
test(`yeouido 곡선 계단 걸음(1.2 m/s · ${TOP} m/s): 1층 로비로 내려갔다 올라온다 — 미끄러짐 < 0.05, 파묻힘 ≤ 3cm`, () => {
  const F1 = Y.builder.floors.F1, sp = { x: Y.layout.spawn.x, z: Y.layout.spawn.z, y: 0 }, lob = { x: -6.5, z: 25.6, y: F1 };
  const down = YS.findPath(sp, lob), up = YS.findPath(lob, sp);
  assert.ok(down && up, '경로');
  for (const v of [1.2, TOP]) {
    const d = stats(walkLine(YL, down.pts, 0, v)), u = stats(walkLine(YL, up.pts, F1, v));
    assert.ok(Math.abs(d.endY - F1) < 1e-6 && Math.abs(u.endY) < 1e-6, `층 ${d.endY} ${u.endY}`);
    for (const r of [d, u]) { assert.ok(r.ratio < 0.05, v + ' 미끄러짐 ' + JSON.stringify(r)); assert.ok(r.maxSink < SINK_TOP, v + ' 파묻힘 ' + JSON.stringify(r)); }
  }
});

// 카메라·몸 높이(main.js: 보는 점 = 루트 높이 me.y + 1.0 → 카메라 × (1 − e^(−7·dt))): 계단을 비탈처럼 따라가 단마다 툭툭 튀지 않는다.
// 고치기 전(단 높이를 × dt·14 로 바로 따라감): 루트 높이 가속도 최대 154 m/s², 카메라 높이 가속도 16 m/s²(1.2 m/s, 36단 오르기)
test('assisi 계단: 몸(루트)·카메라 높이가 단마다 튀지 않는다(1.2 m/s·최고 속도)', () => {
  for (const v of [1.2, TOP]) {
    const f = walkStair({ x: sx, z: -6.9 }, { x: sx, z: ST.z1 - 0.9 }, H.lower, v), end = f[f.length - 1].t - 0.5;
    let am = 0; for (let i = 1; i + 1 < f.length; i++) if (f[i].t > 1 && f[i].t < end) am = Math.max(am, Math.abs(f[i + 1].y - 2 * f[i].y + f[i - 1].y) / (f[i].dt * f[i].dt));
    const c = cameraTrack(f, 1.0, end);
    console.log(`# 계단 높이: ${v} m/s 루트 가속도 최대 ${am.toFixed(1)} m/s², 카메라 ${c.accMax.toFixed(2)} m/s²`);
    assert.ok(am < 60, 'root accel ' + am);
    assert.ok(c.accMax < 6, 'camera accel ' + c.accMax);
  }
});
