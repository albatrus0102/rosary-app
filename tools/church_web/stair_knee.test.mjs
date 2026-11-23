// 계단 흔들기 시험(4차, docs/church/WALK_GAIT.md §9): 계단을 오르내릴 때 흔드는 다리가 뒤로 한 바퀴 돌지 않고(허벅지 각 t1 이 ±π 를 넘지 않음),
// 무릎이 130° 넘게 접히지 않으며, 흔드는 발목이 디딜 단(뗀 단·디딜 단 가운데 높은 쪽) 위로 25cm 넘게 오르지 않는다.
// 옛 코드: 가짜 계단 1.2 m/s 오르기에서 t1 −3.0 → +3.1(한 바퀴), 무릎 151°, 발목이 단 위 0.65m(골반 관절보다 0.44m 위).
// GAIT_ASSETS=<옛 assets 사본> 으로 돌리면 실패한다(확인용).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadAvatar, lineWalker } from './gait_lib.mjs';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const DIR = process.env.GAIT_ASSETS || undefined;

function stairRun({ ground, Lg, pts, v, y0 = 0, dur = 30 }) {
  const { A } = loadAvatar(DIR);
  const av = new A.Avatar({ g: 0, skin: 0, style: 0, hair: 0, outfit: 0, name: 0, nv: 2 }, { showTag: false });
  av.setLod(0); av.phase = 0.3; av.off = 1; av.setGround(ground);
  const fy0 = Lg.floorY(pts[0].x, pts[0].z, y0);
  const body = { x: pts[0].x, z: pts[0].z, yaw: Math.atan2(-(pts[1].x - pts[0].x), -(pts[1].z - pts[0].z)), y: fy0, fy: fy0 };
  av.setPose(body.x, body.y, body.z, body.yaw); av.update(1 / 60, 0); av.snapPose && av.snapPose();
  const step = lineWalker(Lg, pts, v), dt = 1 / 60, end = pts[pts.length - 1];
  const r = { knee: 0, wrap: 0, back: 0, lift: 0 };
  let last = null, t = 0;
  while (t < dur && Math.hypot(body.x - end.x, body.z - end.z) > 0.05) {
    av.setWalk(step(body, dt, t, av)); av.setPose(body.x, body.y, body.z, body.yaw); av.update(dt, t);
    const G = av.gait;
    for (let k = 0; k < 2; k++) {
      const lg = G.leg[k], F = G.f[k];
      r.knee = Math.max(r.knee, -lg.t2 * 180 / Math.PI);
      if (last && Math.abs(lg.t1 - last[k]) > 1.5) r.wrap++;
      if (!F.st) { r.back = Math.min(r.back, lg.t1); r.lift = Math.max(r.lift, F.ay - Math.max(F.sy, F.ty + 0.08)); }
    }
    last = [G.leg[0].t1, G.leg[1].t1]; t += dt;
  }
  return r;
}
const check = (r, tag) => {
  assert.equal(r.wrap, 0, `${tag}: 허벅지가 한 바퀴 돈다(t1 이 한 프레임에 1.5 rad 넘게 뛴 횟수 ${r.wrap})`);
  assert.ok(r.back > -1.2, `${tag}: 흔드는 허벅지가 뒤로 ${r.back.toFixed(2)} rad`);
  assert.ok(r.knee <= 131, `${tag}: 무릎 최대 ${r.knee.toFixed(0)}°`);
  assert.ok(r.lift < 0.25, `${tag}: 흔드는 발목이 디딜 단 위 ${r.lift.toFixed(2)}m`);
};

test('가짜 계단(단 0.30 × 0.17m, 8단)을 1.2·4 m/s 로 오르내릴 때 흔드는 다리가 앞으로 들리고(뒤로 돌지 않음) 무릎 ≤ 130°, 발목은 단 위 25cm 안', () => {
  const gy = (z) => { const d = -z - 1; return d <= 0 ? 0 : Math.min(8, Math.floor(d / 0.3) + 1) * 0.17; };
  const Lg = { floorY: (x, z) => gy(z), bodyY: (x, z, fy, dx, dz) => { let q = 0; for (let i = -3; i <= 3; i++) q += gy(z + dz * 0.15 * i); return q / 7; } };
  for (const v of [1.2, 4]) for (const up of [true, false]) {
    const pts = up ? [{ x: 0, z: 0 }, { x: 0, z: -6.4 }] : [{ x: 0, z: -6.4 }, { x: 0, z: 0 }];
    check(stairRun({ ground: (x, z) => gy(z), Lg, pts, v, y0: up ? 0 : 1.36, dur: 12 }), `fake ${up ? 'up' : 'down'} ${v} m/s`);
  }
});
test('아시시 36단을 1.2·4 m/s 로 오르내릴 때도 같다', () => {
  const c = loadChurches({ only: ['assisi'] }).churches[0], Bd = c.builder, ST = Bd.stair, H = Bd.heights, sx = (ST.x0 + ST.x1) / 2;
  const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones });
  for (const v of [1.2, 4]) for (const [nm, pts, y0] of [['up', [{ x: sx, z: -6.9 }, { x: sx, z: ST.z1 - 0.9 }], H.lower], ['down', [{ x: sx, z: ST.z1 - 0.9 }, { x: sx, z: -6.9 }], H.upper]]) {
    check(stairRun({ ground: (x, z, y) => L.floorY(x, z, y + 0.2), Lg: L, pts, v, y0 }), `assisi ${nm} ${v} m/s`);
  }
});
