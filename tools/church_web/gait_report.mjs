// 걸음 측정 표: node tools/church_web/gait_report.mjs [assets/church 와 같은 배치의 폴더(고치기 전 사본 비교용)] [--json out.json]
// 시나리오(조이스틱 0.2/0.5/1.0 · 벽 밀기 · 벽 따라 미끄러짐 · 자동 걷기 · 출발/정지 · 제자리 돌기 · 다른 사람 · 배경 신자 · 들쭉날쭉한 프레임)를
// 성 베드로(37%)·명동(100%)·당고개(100%) 충돌체로 돌려 디딘 발 미끄러짐 비율(발 밑창 속도 / 몸 속도)과 자세 수치를 낸다. 해석: docs/church/WALK_GAIT.md
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { loadChurches } from './church_harness.mjs';
import { runScenario, slipStats, postureStats, legMotion, turnStats, glbSlip, loadAvatar, joyWalker, autoWalker, remoteWalker, crowdWalker, ASSETS } from './gait_lib.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');

export function scenarios(dir = ASSETS, opts = {}) {
  const ids = opts.churches || ['stpeter', 'myeongdong', 'danggogae'];
  const { churches } = loadChurches({ only: ids });
  const rows = [];
  const Glb = loadAvatar(dir).Glb, old = !!opts.old;
  const add = (church, name, fr, from, to, extra = {}) => {
    const s = slipStats(fr, from, to), g = glbSlip(fr, { old, from, to, Glb });
    rows.push({ church, name, slip: +s.ratio.toFixed(3), glbSlip: +g.ratio.toFixed(3), bodyV: +s.body.toFixed(2), footV: +s.slip.toFixed(3), ...extra });
    if (extra.legWhileBlocked !== undefined) rows[rows.length - 1].glbLegWhileBlocked = +glbSlip(fr, { old, from: extra.blockedAt + 0.4, to: extra.blockedAt + 2.4, Glb }).legFootV.toFixed(3);
    return s;
  };
  // 빈 바닥(성당 없이) — 자세·주기 기준
  for (const m of [0.2, 0.3, 0.5, 1.0]) {
    const fr = runScenario(dir, { dur: 5, step: joyWalker(null, () => ({ x: 0, y: m })) });
    const s = add('-', `조이스틱 ${m}`, fr, 1.5, 5);
    const p = postureStats(fr, 1.5, 5);
    rows[rows.length - 1].posture = p;
    void s;
  }
  // 출발·정지(0~2초 걷고 2~3.5초 놓음)
  {
    const fr = runScenario(dir, { dur: 3.5, step: joyWalker(null, (t) => ({ x: 0, y: t < 2 ? 1 : 0 })) });
    add('-', '출발 0~0.6초', fr, 0, 0.6);
    add('-', '정지 2~3.5초', fr, 2, 3.5, { legAfterStop: +legMotion(fr, 3.0, 3.5).toFixed(3) });
  }
  // 제자리 돌기(멈춘 채 90° 돌기: 도착해서 대상 바라보기 App.turn 과 같은 규칙)
  {
    const fr = runScenario(dir, { dur: 2.0, step: joyWalker(null, () => ({ x: 0, y: 0, turnTo: Math.PI / 2 })) });
    const ts = turnStats(fr, 0, 2);
    add('-', '제자리 90° 돌기', fr, 0, 2, { footTwistDeg: +ts.twistDeg.toFixed(1), steps: ts.strikes });
  }
  // 들쭉날쭉한 프레임(frame_pace: 16.7/33/50ms 섞임)
  {
    const fr = runScenario(dir, { dur: 5, dts: [1 / 60, 1 / 30, 1 / 60, 1 / 20, 1 / 60, 1 / 60, 1 / 30], step: joyWalker(null, () => ({ x: 0, y: 0.5 })) });
    add('-', '프레임 간격 흔들림(0.5)', fr, 1.5, 5);
  }
  // 다른 사람(0.1초마다 위치 → 200ms 늦춘 보간) — net_view.js 의 걸음 값 식은 opts.remoteWalk 로 준다
  const rw = opts.remoteWalk || ((sp) => (sp > 0.12 ? Math.min(1, sp / 4.0) : 0));
  for (const m of [0.3, 1.0]) {
    const fr = runScenario(dir, { dur: 5, step: remoteWalker(() => ({ x: 0, y: m }), rw) });
    add('-', `다른 사람 ${m}`, fr, 1.5, 5);
  }
  // 배경 신자(0.8 m/s): 옛 코드는 setWalk(1)
  {
    const fr = runScenario(dir, { dur: 5, step: crowdWalker(opts.crowdWalk === undefined ? 0.8 / 4.0 : opts.crowdWalk) });
    add('-', '배경 신자 0.8m/s', fr, 1.5, 5);
  }
  for (const c of churches) {
    const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones }), S = Stations.create(L);
    const sp = c.layout.spawn, base = { x0: sp.x, z0: sp.z, yaw0: 0 };
    for (const m of [0.2, 0.5, 1.0]) {
      const fr = runScenario(dir, { ...base, dur: 4, step: joyWalker(L, () => ({ x: 0, y: m })) });
      add(c.id, `조이스틱 ${m}`, fr, 1.2, 4);
    }
    // 벽(또는 의자 줄)으로 계속 민다: 막히면 다리가 멈춰야 한다
    {
      const fr = runScenario(dir, { ...base, dur: 12, step: joyWalker(L, () => ({ x: 1, y: 0 })) });
      let tb = -1;   // 막힌 뒤(몸 속도 < 0.05가 0.5초 이어진 첫 시각)
      for (let i = 0, run = 0; i < fr.length; i++) { run = fr[i].bodyV < 0.05 ? run + fr[i].dt : 0; if (run > 0.5) { tb = fr[i].t; break; } }
      const lm = tb > 0 ? legMotion(fr, tb + 0.4, Math.min(12, tb + 2.4)) : -1;
      add(c.id, '옆으로 벽 밀기', fr, 0, tb > 0 ? tb : 12, { blockedAt: +tb.toFixed(2), legWhileBlocked: +lm.toFixed(3), walkInput: +fr[fr.length - 1].walkTarget.toFixed(2) });
    }
    // 벽을 비스듬히(앞+옆) 밀며 미끄러짐
    {
      const fr = runScenario(dir, { ...base, dur: 10, step: joyWalker(L, () => ({ x: 0.8, y: 0.6 })) });
      add(c.id, '비스듬히 벽 따라', fr, 1, 10);
    }
    // 자동 걷기(제대 앞으로)
    {
      const st = S.stations().altar;
      const fr = runScenario(dir, { ...base, dur: 25, step: autoWalker(L, S, st) });
      add(c.id, '자동 걷기(제대)', fr, 0.5, 25);
    }
  }
  return rows;
}

if (process.argv[1] && process.argv[1].endsWith('gait_report.mjs')) {
  const a = process.argv.slice(2), ji = a.indexOf('--json');
  const out = ji >= 0 ? a.splice(ji, 2)[1] : null;
  const dir = a[0] || ASSETS;
  const old = dir !== ASSETS;
  // 옛 코드 비교: net_view.js 옛 걸음 값 식, 배경 신자 setWalk(1)
  const rows = scenarios(dir, old ? { old: true, remoteWalk: (sp) => (sp > 0.35 ? Math.min(1, sp / 3.2 + 0.2) : 0), crowdWalk: 1 } : {});
  for (const r of rows) {
    const { posture, ...rest } = r;
    console.log(JSON.stringify(rest));
    if (posture) console.log('   자세', JSON.stringify(posture, (k, v) => (typeof v === 'number' ? +v.toFixed(3) : v)));
  }
  if (out) fs.writeFileSync(out, JSON.stringify(rows, null, 1));
}
