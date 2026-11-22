// 걸음(보행) 시험: node --test tools/church_web/gait.test.mjs — 디딘 발이 미끄러지지 않는지(발 밑창 속도 / 몸 속도), 막히면 다리가 멈추는지,
// 출발·정지가 자연스러운지, 제자리에서 돌면 발을 디디는지, 자세 수치가 사람 보행 범위인지, 발소리가 음악보다 작은지. 근거: docs/church/WALK_GAIT.md
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadChurches } from './church_harness.mjs';
import { runScenario, slipStats, postureStats, legMotion, turnStats, glbSlip, loadAvatar, joyWalker, autoWalker, remoteWalker, crowdWalker } from './gait_lib.mjs';
import { loadAudio, stepLevels } from './footstep_levels.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');

const SLIP_MAX = 0.05;   // 디딘 발 미끄러짐 / 몸 속도 (고치기 전 0.38~0.56, 배경 신자 5.25)
const straight = (m, dur = 5) => runScenario(undefined, { dur, step: joyWalker(null, () => ({ x: 0, y: m })) });

test('조이스틱 0.2/0.5/1.0: 디딘 발이 바닥에 붙어 있다(미끄러짐 < 5%)', () => {
  for (const m of [0.2, 0.5, 1.0]) {
    const s = slipStats(straight(m), 1.5, 5);
    assert.ok(s.n > 100, 'stance frames ' + s.n);
    assert.ok(s.ratio < SLIP_MAX, `joy ${m}: slip ratio ${s.ratio.toFixed(3)}`);
  }
});

test('보행 자세: 사람 보행 범위(걸음 수·보폭·무릎·팔·몸통·골반·발 폭)', () => {
  const p = postureStats(straight(0.3), 1.5, 5);   // 1.2 m/s: 보통 걸음
  assert.ok(p.cadence > 95 && p.cadence < 120, 'cadence/min ' + p.cadence);
  assert.ok(p.strideOverH > 0.7 && p.strideOverH < 0.9, 'stride/height ' + p.strideOverH);
  assert.ok(p.kneeSwingMax > 55 && p.kneeSwingMax < 78, 'swing knee ' + p.kneeSwingMax);
  assert.ok(p.kneeLoad > 10 && p.kneeLoad < 25, 'loading knee ' + p.kneeLoad);
  assert.ok(p.kneeMin > 0, 'no hyperextension ' + p.kneeMin);
  assert.ok(p.armRange > 25 && p.armRange < 45, 'arm swing ' + p.armRange);
  assert.ok(p.armLegCorr < -0.5, 'arms counter-swing ' + p.armLegCorr);
  assert.ok(p.lean > 2 && p.lean < 5, 'trunk lean ' + p.lean);
  assert.ok(p.pelvisRange > 5 && p.pelvisRange < 12, 'pelvis rotation ' + p.pelvisRange);
  assert.ok(p.widthMin > 0.08 && p.widthAvg < 0.16, 'step width ' + p.widthAvg);
  assert.ok(p.bob > 0.015 && p.bob < 0.06, 'hip bob ' + p.bob);
  assert.ok(p.minFootY > -0.025, 'feet do not sink ' + p.minFootY);
  // 느리면 보폭도 짧고 걸음도 느리다
  const slow = postureStats(straight(0.2), 1.5, 5), fast = postureStats(straight(0.5), 1.5, 5);
  assert.ok(slow.stepLen < p.stepLen && p.stepLen < fast.stepLen, 'stride grows with speed');
  assert.ok(slow.cadence < p.cadence && p.cadence < fast.cadence, 'cadence grows with speed');
});

test('출발·정지: 약 0.3초에 걸쳐 걷기 시작하고, 멈추면 발을 모으고 다리가 선다', () => {
  const fr = runScenario(undefined, { dur: 3.5, step: joyWalker(null, (t) => ({ x: 0, y: t < 2 ? 1 : 0 })) });
  assert.ok(slipStats(fr, 0, 0.6).ratio < SLIP_MAX, 'start slip');
  assert.ok(slipStats(fr, 2, 3.5).ratio < SLIP_MAX, 'stop slip');
  // 몸(main.js 관성)은 약 0.25초에 거의 다 빨라지고, 다리는 실제 이동을 따라 같은 시각에 빨라진다(입력이 아니라 이동량)
  const at = (t) => fr.find((f) => f.t >= t);
  assert.ok(at(0.03).bodyV < 0.5 * 4 && at(0.3).bodyV > 0.9 * 4, 'body ramp');
  const legs = runScenario(undefined, { dur: 0.6, step: joyWalker(null, () => ({ x: 0, y: 1 })) });
  const strikes = postureStats(legs, 0, 0.6).cadence * 0.6 / 60;
  assert.ok(strikes >= 1, 'first step within 0.6 s');
  assert.ok(legMotion(fr, 3.0, 3.5) < 0.02, 'legs still after stop');
  const end = fr[fr.length - 1];
  assert.ok(end.feet[0].y < 0.012 && end.feet[1].y < 0.012, 'both feet down at the end');
});

test('제자리에서 돌면 발을 디뎌 따라 돈다(바닥에서 발을 비틀지 않는다)', () => {
  const fr = runScenario(undefined, { dur: 2.5, step: joyWalker(null, () => ({ x: 0, y: 0, turnTo: Math.PI / 2 })) });
  const ts = turnStats(fr, 0, 2.5);
  assert.ok(ts.strikes >= 2, 'steps ' + ts.strikes);
  assert.ok(ts.twistDeg < 15, 'planted-foot twist ' + ts.twistDeg);
  const end = fr[fr.length - 1];
  for (const F of end.feet) assert.ok(Math.abs(Math.atan2(Math.sin(F.yaw - end.yaw), Math.cos(F.yaw - end.yaw))) < 0.35, 'feet face the new way');
});

test('다른 사람(0.1초 간격 위치 보간)과 배경 신자(0.8 m/s)도 발이 미끄러지지 않는다', () => {
  for (const m of [0.3, 1.0]) {
    const fr = runScenario(undefined, { dur: 5, step: remoteWalker(() => ({ x: 0, y: m }), (sp) => (sp > 0.12 ? Math.min(1, sp / 4) : 0)) });
    assert.ok(slipStats(fr, 1.5, 5).ratio < SLIP_MAX, 'remote ' + m);
  }
  // 입력(setWalk)이 실제와 달라도(옛 배경 신자는 setWalk(1)) 다리는 실제 이동을 따른다
  const fr = runScenario(undefined, { dur: 5, step: crowdWalker(1) });
  assert.ok(slipStats(fr, 1.5, 5).ratio < SLIP_MAX, 'crowd with wrong walk input');
});

test('들쭉날쭉한 프레임 간격에서도 미끄러지지 않는다', () => {
  const fr = runScenario(undefined, { dur: 5, dts: [1 / 60, 1 / 30, 1 / 60, 1 / 20, 1 / 60, 1 / 60, 1 / 30], step: joyWalker(null, () => ({ x: 0, y: 0.5 })) });
  assert.ok(slipStats(fr, 1.5, 5).ratio < SLIP_MAX);
});

const { churches } = loadChurches({ only: ['stpeter', 'myeongdong', 'danggogae'] });
for (const c of churches) {
  test(`${c.id}(축척 ${c.layout.scalePercent || 100}%): 벽에 막히면 다리가 멈추고, 벽을 따라·자동 걷기도 미끄러지지 않는다`, () => {
    const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones }), S = Stations.create(L);
    const base = { x0: c.layout.spawn.x, z0: c.layout.spawn.z, yaw0: 0 };
    const push = runScenario(undefined, { ...base, dur: 12, step: joyWalker(L, () => ({ x: 1, y: 0 })) });
    let tb = -1;
    for (let i = 0, run = 0; i < push.length; i++) { run = push[i].bodyV < 0.05 ? run + push[i].dt : 0; if (run > 0.5) { tb = push[i].t; break; } }
    assert.ok(tb > 0, 'reached a wall');
    assert.equal(push[push.length - 1].walkTarget > 0.9, true, 'input still says walk');
    assert.ok(legMotion(push, tb + 0.4, tb + 2.4) < 0.02, 'legs stop when blocked');
    assert.ok(glbSlip(push, { from: tb + 0.4, to: tb + 2.4, Glb: loadAvatar().Glb }).legFootV < 0.02, 'glb legs stop when blocked');
    assert.ok(slipStats(push, 0, tb).ratio < SLIP_MAX, 'approach slip');
    const slide = runScenario(undefined, { ...base, dur: 10, step: joyWalker(L, () => ({ x: 0.8, y: 0.6 })) });
    assert.ok(slipStats(slide, 1, 10).ratio < SLIP_MAX, 'wall slide slip');
    const auto = runScenario(undefined, { ...base, dur: 25, step: autoWalker(L, S, S.stations().altar) });
    assert.ok(slipStats(auto, 0.5, 25).ratio < SLIP_MAX, 'walkTo slip');
  });
}

test('glb 걷기 클립: 실제 속도로 재생(느린 걸음에서 발이 몸보다 빨리 돌지 않는다)', () => {
  const Glb = loadAvatar().Glb;
  for (const m of [0.1, 0.2, 0.3, 0.5]) {
    const fr = straight(m);
    assert.ok(glbSlip(fr, { from: 1.5, to: 5, Glb }).ratio < 0.02, 'glb ' + m);
    assert.ok(glbSlip(fr, { from: 1.5, to: 5, Glb, old: true }).ratio > glbSlip(fr, { from: 1.5, to: 5, Glb }).ratio - 1e-9);
  }
  assert.equal(Glb.walkPlayback(0, 1.3).weight, 0);
  assert.ok(Math.abs(Glb.walkPlayback(0.4, 1.3).timeScale - 0.4 / 1.3) < 1e-9, 'no 0.5 floor');
});

test('발소리: 늘 음악보다 작다(성가·오르간·음량 설정 전 구간), 음량을 낮추면 같이 낮아진다', () => {
  const A = loadAudio(), L = A.LEVELS, db = (x) => 20 * Math.log10(x);
  for (const d of stepLevels(A)) { assert.ok(Math.abs(d.peakDb) < 0.01, 'samples peak-normalised'); assert.ok(d.len_ms <= 200); }
  let prev = -1e9;
  for (let vol = 0.05; vol <= 1.0001; vol += 0.05) {
    const chantRef = L.CHANT_RMS_DB + db(vol);
    const gc = db(A.stepGain({ chant: true, vol })), go = db(A.stepGain({ organ: true, vol })), gq = db(A.stepGain({ vol }));
    assert.ok(gc <= chantRef - 18 + 1e-9, `chant vol ${vol}: step ${gc} vs music ${chantRef}`);      // 음악이 울리면 18 dB 아래(= 12 dB + 6 dB 더)
    assert.ok(go <= L.ORGAN_RMS_DB - 18 + 1e-9, `organ vol ${vol}`);
    assert.ok(gq <= chantRef - 12 + 1e-9, `no music vol ${vol}`);
    assert.ok(Math.pow(10, gc / 20) <= 0.25 * Math.pow(10, chantRef / 20), '≤ 25% of the music gain');
    assert.ok(gc >= prev - 1e-9, 'follows the volume setting'); prev = gc;
  }
  assert.ok(db(A.stepGain({ organ: true, vol: 0.1 })) < db(A.stepGain({ organ: true, vol: 0.3 })), 'lowering the music lowers the steps (organ)');
  // 소리 설정을 따른다: 꺼져 있으면(또는 컨텍스트가 없으면) 소리를 만들지 않는다
  A.setSteps({ on: false, chant: false, vol: 0.3 });
  assert.doesNotThrow(() => A.footstep(true, 1.2));
});
