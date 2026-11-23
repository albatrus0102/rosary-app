// 사용: node tools/church_web/skirt_report.mjs [assets 폴더] — 여성 아바타(원피스)가 걷기(0.8~4 m/s)·돌기·계단·앉기·무릎 꿇기에서
// 다리가 자락을 뚫고 나온 점 수(프레임 합)·최대 깊이(mm)를 잰다(skirt_lib.mjs). 고치기 전 사본 폴더를 주면 비교할 수 있다.
import { loadAvatar, joyWalker, speedWalker, lineWalker, ASSETS } from './gait_lib.mjs';
import { skirtPenetration } from './skirt_lib.mjs';

/** 시나리오를 돌리며 프레임마다(from 초부터) 관통을 잰다. setup(av) 로 앉기·무릎 꿇기를 켠다. */
export function skirtScenario(dir, { g = 0, outfit = 0, style = 0, dur = 4, dt = 1 / 60, from = 0, step, setup, ground, level = 'near', every = 1 } = {}) {
  const { A } = loadAvatar(dir);
  const av = new A.Avatar({ g, skin: 0, style, hair: 0, outfit, name: 0, nv: 2 }, { showTag: false });
  av.setLod(level === 'near' ? 0 : 1);
  av.off = 1; av.phase = 0.3;
  if (ground && av.setGround) av.setGround(ground);
  const body = { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, y: 0, fy: 0 };
  av.setPose(0, 0, 0, 0); av.update(1 / 60, 0); av.snapPose && av.snapPose();
  let t = 0, i = 0, sum = 0, frames = 0, hit = 0, maxDepth = 0, worstT = -1;
  while (t < dur) {
    if (setup) setup(av, t);
    const wv = step ? step(body, dt, t, av) : 0;
    av.setWalk(wv);
    av.setPose(body.x, body.y || 0, body.z, body.yaw);
    av.update(dt, t);
    if (t >= from && i % every === 0) {
      const r = skirtPenetration(av, { dir, level });
      sum += r.cross; frames++; if (r.cross) hit++;
      if (r.maxDepth > maxDepth) { maxDepth = r.maxDepth; worstT = t; }
    }
    t += dt; i++;
  }
  return { sum, frames, hit, maxMm: +(maxDepth * 1000).toFixed(1), worstT: +worstT.toFixed(2) };
}

// 시나리오 만들기(걷기 함수에 상태가 있어 돌릴 때마다 새로 만든다)
const stairs = (v, start) => {
  const gy = (z) => { const d = -z - start; return d <= 0 ? 0 : Math.min(8, Math.floor(d / 0.3) + 1) * 0.17; };
  const Lg = { floorY: (x, z) => gy(z), bodyY: (x, z, fy, dx, dz) => { let q = 0; for (let i = -3; i <= 3; i++) q += gy(z + dz * 0.15 * i); return q / 7; } };
  return { dur: v > 2 ? 4 : 5, from: 0.3, ground: (x, z) => gy(z), step: lineWalker(Lg, [{ x: 0, z: 0 }, { x: 0, z: -80 }], v) };
};
export const SCENARIOS = {
  'walk 0.8': () => ({ dur: 4, from: 2, step: speedWalker(0.8) }),
  'walk 1.2': () => ({ dur: 4, from: 2, step: speedWalker(1.2) }),
  'walk 2.0': () => ({ dur: 4, from: 2, step: speedWalker(2.0) }),
  'walk 3.0': () => ({ dur: 4, from: 2, step: speedWalker(3.0) }),
  'walk 4.0': () => ({ dur: 4, from: 2, step: speedWalker(4.0) }),
  'start/stop 4.0': () => ({ dur: 5, from: 0, step: speedWalker((t) => (t < 2.5 ? 4 : 0)) }),
  'turn in place': () => ({ dur: 2.5, from: 0, step: joyWalker(null, () => ({ x: 0, y: 0, turnTo: Math.PI / 2 })) }),
  'walk+turn': () => ({ dur: 5, from: 0.5, step: joyWalker(null, (t) => ({ x: Math.sin(t * 1.3), y: 1 })) }),
  'stairs 4.0': () => stairs(4.0, 2),
  'stairs 1.2': () => stairs(1.2, 1),
  'idle': () => ({ dur: 3, from: 0 }),
  'sit': () => ({ dur: 3, from: 0, setup: (av, t) => av.setSeated(t > 0.2) }),
  'sit+pray': () => ({ dur: 3, from: 0, setup: (av, t) => { av.setSeated(t > 0.2); if (t > 1) av.setPray(true); } }),
  'kneel': () => ({ dur: 4, from: 0, setup: (av, t) => { av.setSeated(t > 0.1); if (t > 1.2) av.setKneel(true); } }),
  'kneel->stand': () => ({ dur: 6, from: 0, setup: (av, t) => { av.setSeated(t > 0.1 && t < 3.6); av.setKneel(t > 1.2 && t < 2.6); } })
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] || ASSETS;
  const rows = [];
  for (const level of ['near', 'mid']) for (const [name, mk] of Object.entries(SCENARIOS)) {
    const r = skirtScenario(dir, { ...mk(), level, every: level === 'mid' ? 2 : 1 });
    rows.push({ level, name, ...r });
  }
  console.table(rows);
}
