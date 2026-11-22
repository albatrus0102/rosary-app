// 걸음(보행) 시험: node --test tools/church_web/gait.test.mjs — 디딘 발이 미끄러지지 않는지(발 밑창 속도 / 몸 속도), 막히면 다리가 멈추는지,
// 출발·정지가 자연스러운지, 제자리에서 돌면 발을 디디는지, 자세 수치가 사람 보행 범위인지, 발소리가 음악보다 작은지. 근거: docs/church/WALK_GAIT.md
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadChurches } from './church_harness.mjs';
import fs from 'node:fs';
import { runScenario, slipStats, postureStats, smoothStats, cameraTrack, legMotion, turnStats, glbSlip, loadAvatar, joyWalker, autoWalker, remoteWalker, crowdWalker, speedWalker, ASSETS } from './gait_lib.mjs';
import { loadAudio, stepLevels, stepTimbres } from './footstep_levels.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');

const WS = Logic.C.WALK_SPEED;   // 조이스틱 끝까지 = WS m/s (2026-11-22: 4.0 → 2.0 → 사용자 「지난 번 고치기 전 속도 유지」로 4.0. 뛰지 않고 빠르게 걷는다)
const J = (v) => v / WS;          // 원하는 속도(m/s) → 조이스틱 크기
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
  const fr12 = straight(J(1.2)), p = postureStats(fr12, 1.5, 5);   // 1.2 m/s: 보통 걸음
  const cad = smoothStats(fr12, 1.5, 5).cadence;   // 걸음 수는 디딤 순간 사이 시간으로(밑창 높이로 세면 착지 직전 낮게 스치는 발을 두 번 셀 수 있다)
  assert.ok(cad > 95 && cad < 120, 'cadence/min ' + cad);
  assert.ok(p.strideOverH > 0.7 && p.strideOverH < 0.9, 'stride/height ' + p.strideOverH);
  assert.ok(p.kneeSwingMax > 55 && p.kneeSwingMax < 78, 'swing knee ' + p.kneeSwingMax);
  assert.ok(p.kneeLoad > 10 && p.kneeLoad < 25, 'loading knee ' + p.kneeLoad);
  assert.ok(p.kneeMin > 0, 'no hyperextension ' + p.kneeMin);
  assert.ok(p.armRange > 25 && p.armRange < 45, 'arm swing ' + p.armRange);
  assert.ok(p.armLegCorr < -0.5, 'arms counter-swing ' + p.armLegCorr);
  assert.ok(p.lean > 2 && p.lean < 5, 'trunk lean ' + p.lean);
  assert.ok(p.pelvisRange > 5 && p.pelvisRange < 12, 'pelvis rotation ' + p.pelvisRange);
  assert.ok(p.widthMin > 0.08 && p.widthAvg < 0.16, 'step width ' + p.widthAvg);
  assert.ok(p.bob > 0.02 && p.bob < 0.04, 'hip bob ' + p.bob);   // 사람 몸 중심 2~4cm(고치기 전 5.0cm)
  assert.ok(p.minFootY > -0.025, 'feet do not sink ' + p.minFootY);
  // 느리면 보폭도 짧고 걸음도 느리다
  const slow = postureStats(straight(J(0.8)), 1.5, 5), fast = postureStats(straight(J(2.0)), 1.5, 5);
  assert.ok(slow.stepLen < p.stepLen && p.stepLen < fast.stepLen, 'stride grows with speed');
  const cadOf = (v) => smoothStats(straight(J(v)), 1.5, 5).cadence;
  assert.ok(cadOf(0.8) < cad && cad < cadOf(2.0), 'cadence grows with speed');
});

test('출발·정지: 약 0.3초에 걸쳐 걷기 시작하고, 멈추면 발을 모으고 다리가 선다', () => {
  const fr = runScenario(undefined, { dur: 4.0, step: joyWalker(null, (t) => ({ x: 0, y: t < 2 ? 1 : 0 })) });
  assert.ok(slipStats(fr, 0, 0.6).ratio < SLIP_MAX, 'start slip');
  assert.ok(slipStats(fr, 2, 4.0).ratio < SLIP_MAX, 'stop slip');
  // 몸(main.js 관성)은 약 0.25초에 거의 다 빨라지고, 다리는 실제 이동을 따라 같은 시각에 빨라진다(입력이 아니라 이동량)
  const at = (t) => fr.find((f) => f.t >= t);
  assert.ok(at(0.03).bodyV < 0.5 * WS && at(0.3).bodyV > 0.9 * WS, 'body ramp');
  const legs = runScenario(undefined, { dur: 0.6, step: joyWalker(null, () => ({ x: 0, y: 1 })) });
  const strikes = postureStats(legs, 0, 0.6).cadence * 0.6 / 60;
  assert.ok(strikes >= 1, 'first step within 0.6 s');
  assert.ok(legMotion(fr, 3.3, 4.0) < 0.02, 'legs still after stop');   // 4 m/s 에서 멈추면 1m 벌어진 발을 두 걸음에 모은다(약 1.2초)
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
    const fr = runScenario(undefined, { dur: 5, step: remoteWalker(() => ({ x: 0, y: m }), (sp) => (sp > 0.12 ? Math.min(1, sp / WS) : 0)) });
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
    const push = runScenario(undefined, { ...base, dur: 24, step: joyWalker(L, () => ({ x: 1, y: 0 })) });
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
  for (const v of [0.4, 0.8, 1.2, 2.0]) {
    const m = J(v), fr = straight(m);
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

// ------------------------------------------------------------------ 2026-11-22 2차: 「터덜거림」과 빠른 걸음(WALK_GAIT.md §6)
// 고치기 전(같은 시나리오, 1.2 m/s): 골반이 닿기 직전 0.05초에 4.7cm 뚝 떨어지고(골반 가속도 101 m/s²), 흔드는 발이 닿을 다리가 못 미쳐(IK 4.1cm 모자람)
// 떠 있다가 1.9 m/s 로 내리찍혔다. 골반 가장 높은 때가 한 걸음의 0.91(닿기 직전 — 사람은 디딤 가운데 0.4~0.6), 오르내림 5.0cm.
const at = (v, dur = 6) => runScenario(undefined, { dur, step: speedWalker(v) });
test('터덜거림: 골반은 디딤 가운데 가장 높고 매끄럽게 오르내린다(2~4cm), 발은 사뿐히 닿는다(1.2 m/s)', () => {
  const s = smoothStats(at(1.2), 2, 6);
  assert.ok(s.hipBob > 0.02 && s.hipBob < 0.04, 'hip bob ' + s.hipBob);
  assert.ok(s.bobPhase > 0.3 && s.bobPhase < 0.65, 'bob phase ' + s.bobPhase);
  assert.ok(s.kneeMid > 5 && s.kneeMid < 20, 'mid-stance knee ' + s.kneeMid);
  assert.ok(s.strikeVy < 0.4, 'heel strike vertical speed ' + s.strikeVy);
  assert.ok(s.ikErr < 0.01, 'leg reaches its target ' + s.ikErr);
  assert.ok(s.footSnapDps < 300, 'foot-flat rate ' + s.footSnapDps);
  assert.ok(s.acc.hips < 10 && s.acc.head < 10, 'pelvis/head accel ' + s.acc.hips);
});
test('흔들림 없음: 0.4~4 m/s 모든 속도에서 프레임 사이 관절 가속도가 튀지 않고 IK 가 닿는다', () => {
  // 고치기 전 1.2 m/s: 골반 101, 발목 169 m/s²(디딜 때 「툭」), 4 m/s: 골반 103, 발목 332
  for (const [v, hip, ankle] of [[0.4, 8, 60], [0.8, 8, 60], [1.2, 10, 70], [2.0, 16, 110], [3.0, 26, 170], [WS, 35, 220]]) {
    const s = smoothStats(at(v), 2, 6);
    assert.ok(s.acc.hips < hip, `${v}: hips ${s.acc.hips}`);
    assert.ok(Math.max(s.acc.ftL, s.acc.ftR) < ankle, `${v}: ankle ${Math.max(s.acc.ftL, s.acc.ftR)}`);
    assert.ok(Math.max(s.acc.llL, s.acc.llR) < 2 * ankle, `${v}: knee ${Math.max(s.acc.llL, s.acc.llR)}`);
    assert.ok(s.ikErr < 0.01, `${v}: ik ${s.ikErr}`);
    assert.ok(s.strikeVy < 0.6, `${v}: strike ${s.strikeVy}`);
    assert.ok(s.bobPhase > 0.3 && s.bobPhase < 0.65, `${v}: bob phase ${s.bobPhase}`);
  }
});
test(`빠른 걸음(최고 ${WS} m/s): 뛰지 않는다 — 한 발은 늘 땅에, 경보 걸음 수·보폭, 골반 오르내림 ≤ 7cm, 미끄러짐 < 5%`, () => {
  const fr = straight(1.0, 6), s = smoothStats(fr, 2, 6), p = postureStats(fr, 2, 6);
  assert.ok(s.frames > 200);
  assert.equal(s.flightFrames, 0, 'both feet in swing');
  assert.equal(s.flightGeoFrames, 0, 'both soles off the floor');
  for (const f of fr.filter((g) => g.t > 2)) assert.ok(f.feet[0].st || f.feet[1].st, 'a foot planted at ' + f.t);
  // 사람 경보(약 4 m/s)는 분당 190~200걸음·한 걸음 1.2m 이지만 다리 0.8m 인 이 아바타는 1.2m 걸음이면 골반이 12~16cm 오르내린다 — 1.05m·분당 약 228걸음
  assert.ok(s.cadence > 200 && s.cadence < 245, 'cadence ' + s.cadence);
  const L = s.speedLen = WS / (s.cadence / 60);
  assert.ok(L > 0.95 && L < 1.15, 'step ' + L);
  assert.ok(s.hipBob < 0.07, 'hip bob ' + s.hipBob);
  assert.ok(slipStats(fr, 2, 6).ratio < SLIP_MAX, 'slip');
  assert.ok(p.armRange > 40, 'arm swing ' + p.armRange);
  // 가운데 속도들도 늘 걷는다
  for (const v of [2.0, 2.5, 3.0, 3.5]) { const q = smoothStats(at(v), 2, 6); assert.equal(q.flightFrames + q.flightGeoFrames, 0, 'flight at ' + v); }
  // 낮은 속도는 그대로(고치기 전과 같은 보폭·걸음 수: 0.8 m/s 88, 1.2 m/s 106 걸음/분)
  assert.ok(Math.abs(smoothStats(at(0.8), 2, 6).cadence - 88.3) < 2 && Math.abs(smoothStats(at(1.2), 2, 6).cadence - 105.9) < 2, 'low speeds unchanged');
});
test('최고 속도 상수 하나: scene_logic WALK_SPEED = avatar.js 걸음 최고 속도 = 자동 걷기(stations) = main.js·net_view.js·avatar_glb.js 걸음 값 기준', () => {
  const { A } = loadAvatar();
  assert.equal(A.GAIT_V_TOP, WS);
  const src = (f) => fs.readFileSync(ASSETS + '/' + f, 'utf8');
  assert.match(src('main.js'), /av\.setWalk\(Math\.min\(1, sp \/ logic\.C\.WALK_SPEED \* 1\.05\)\)/);
  assert.doesNotMatch(src('net_view.js'), /\/ 4\.0\b|\/ 2\.0\b/);
  assert.match(src('avatar_glb.js'), /walkMax: \(root\.ChurchLogic && root\.ChurchLogic\.C && root\.ChurchLogic\.C\.WALK_SPEED\) \|\| 4\.0/);
  const { churches } = loadChurches({ only: ['myeongdong'] }), c = churches[0];
  const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones }), S = Stations.create(L), st = S.stations().altar;
  const me = { x: c.layout.spawn.x, z: c.layout.spawn.z }, w = S.startWalk(S.findPath(me, st), st, 'altar'), out = {};
  S.stepWalk(w, me, 1 / 60, out);
  assert.ok(Math.abs(out.speed - WS) < 1e-9, 'walkTo speed ' + out.speed);
});
test('카메라는 골반이 아니라 루트(몸 위치)를 따른다: 평지에서 걸어도 카메라 높이가 오르내리지 않는다', () => {
  const src = fs.readFileSync(ASSETS + '/main.js', 'utf8');
  assert.match(src, /var fy = me\.y \+ 1\.0 \+ sf \* \(0\.45 - 0\.2\);/, '카메라 보는 점 = 루트 높이(me.y)');
  assert.doesNotMatch(src.slice(src.indexOf('function updateCamera'), src.indexOf('function myTagRect')), /bones|hips/, '카메라가 뼈를 읽지 않는다');
  for (const v of [1.2, WS]) {
    const fr = at(v), c = cameraTrack(fr, 2, 6), s = smoothStats(fr, 2, 6);
    assert.ok(c.range < 1e-9 && c.accMax < 1e-6, 'camera vertical ' + JSON.stringify(c));
    assert.ok(s.hipBob > 0.01, 'the hips do bob (camera ignores it)');
  }
});
test('발소리: 가볍고 짧은 돌바닥 「톡」 — 200 Hz 아래 에너지 < 10%, 울림(-20 dB) ≤ 25 ms, 길이 ≤ 100 ms, 6가지로 다르게', () => {
  // 고치기 전: 200 Hz 아래 19~52%, 무게중심 315~367 Hz, -20 dB 까지 30~55 ms, -40 dB 꼬리 115~130 ms, 길이 160 ms(낮은 사인 「툭」)
  const A = loadAudio(), T = stepTimbres(A);
  for (const t of T) {
    assert.ok(t.lowFrac < 0.1, 'low energy ' + t.lowFrac);
    assert.ok(t.centroidHz > 900, 'centroid ' + t.centroidHz);
    assert.ok(t.decay20_ms <= 25, 'decay ' + t.decay20_ms);
    assert.ok(t.tail40_ms <= 90 && t.len_ms <= 100, 'length ' + t.tail40_ms + ' ' + t.len_ms);
  }
  const six = A.synthSteps(44100, 6);
  for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) { let d = 0; for (let i = 0; i < 2000; i++) d += Math.abs(six[a][i] - six[b][i]); assert.ok(d > 50, 'variants differ ' + a + b); }
  // 같은 표본을 잇달아 내지 않는다(기계적으로 들리지 않게)
  assert.match(fs.readFileSync(ASSETS + '/audio.js', 'utf8'), /k = \(A\.stepIdx \+ 1 \+ Math\.floor\(Math\.random\(\) \* \(nb - 1\)\)\) % nb/);
  // 귀로 느끼는 크기(A 가중 에너지)가 옛 발소리보다 작다: 표본 차이 + STEP_TRIM_DB
  const avg = T.reduce((q, t) => q + t.aExpDb, 0) / T.length;
  assert.ok(avg + A.LEVELS.STEP_TRIM_DB < -31.0, 'A-weighted energy (old avg -31.0 dB) ' + (avg + A.LEVELS.STEP_TRIM_DB));
});
