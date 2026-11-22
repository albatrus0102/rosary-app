// 앉기·기도·무릎 꿇기·이모트·성호경 자세가 걸음 수정 전후로 같은지: node tools/church_web/gait_pose_compare.mjs <고치기 전 assets 사본 폴더>
// 같은 설정·같은 시간 흐름으로 두 아바타를 돌려 뼈 회전(쿼터니언 각도 차, 도)·골반 위치(m) 최대 차이를 낸다. 서 있는 이모트는 팔·몸통만 본다(다리는 걸음 IK 가 맡는다).
import { loadAvatar, ASSETS } from './gait_lib.mjs';

const BN = ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'uaL', 'faL', 'haL', 'uaR', 'faR', 'haR', 'ulL', 'llL', 'ftL', 'ulR', 'llR', 'ftR', 'skirt', 'ckL', 'ckR'];
const UPPER = ['spine', 'chest', 'neck', 'head', 'uaL', 'faL', 'haL', 'uaR', 'faR', 'haR'];
const SPOT = { fwd: 1.22, y: 0.145, rail: true };

export function comparePoses(oldDir, newDir = ASSETS) {
  const mk = (dir, g) => { const { A } = loadAvatar(dir); const a = new A.Avatar({ g, skin: 0, style: 0, hair: 0, outfit: 0, name: 0, nv: 2 }, { showTag: false }); a.setLod(0); a.off = 1.0; a.nodPh = 0.5; if (a.phase !== undefined) a.phase = 0; return a; };
  const cases = [
    ['앉기', false, (a) => { a.setSeated(true); }],
    ['앉아 기도(성호경 포함)', false, (a) => { a.setSeated(true); a.setPray(true); }],
    ['무릎 꿇고 기도', false, (a) => { a.setSeated(true); a.setKneel(true, SPOT); a.setPray(true); }],
    ['앉아 묵주', false, (a) => { a.setSeated(true); a.setPray(true); a.setRosary(true); }],
    ['서서 인사', true, (a) => { a.playEmote(0); }],
    ['서서 성호', true, (a) => { a.playEmote(1); }],
    ['서서 절', true, (a) => { a.playEmote(2); }],
    ['초 켜기 동작', true, (a) => { a.playLightGesture(); }],
    ['서서 기도', true, (a) => { a.setPray(true, true); }]
  ];
  const rows = [];
  for (const g of [0, 1]) for (const [name, standing, setup] of cases) {
    const A = mk(oldDir, g), B = mk(newDir, g);
    for (const a of [A, B]) { a.setPose(0, 0, 0, 0); a.update(1 / 60, 0); setup(a); }
    let maxDeg = 0, maxHip = 0, t = 0, worst = '';
    for (let i = 0; i < 60 * 7; i++) {
      t += 1 / 60;
      A.update(1 / 60, t); B.update(1 / 60, t);
      if (i < 60) continue;   // 처음 1초(옮겨 가는 동안)는 빼고 자세가 잡힌 뒤를 본다
      const names = standing ? UPPER : BN;
      for (const n of names) {
        const qa = A.bones[BN.indexOf(n)].quaternion, qb = B.bones[BN.indexOf(n)].quaternion;
        const d = Math.min(1, Math.abs(qa.x * qb.x + qa.y * qb.y + qa.z * qb.z + qa.w * qb.w));
        const deg = 2 * Math.acos(d) * 180 / Math.PI;
        if (deg > maxDeg) { maxDeg = deg; worst = n; }
      }
      if (!standing) { const pa = A.bones[1].position, pb = B.bones[1].position; maxHip = Math.max(maxHip, Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z)); }
    }
    rows.push({ g, name, maxDeg: +maxDeg.toFixed(3), worst, maxHipM: +maxHip.toFixed(4) });
  }
  return rows;
}

if (process.argv[1] && process.argv[1].endsWith('gait_pose_compare.mjs')) {
  for (const r of comparePoses(process.argv[2])) console.log(JSON.stringify(r));
}
