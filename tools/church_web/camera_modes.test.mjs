// 카메라 시점·잘라내기 시험(docs/church/CAMERA_MODES.md). 2026-11-23 3차 사용자 결정:
// 「그냥 뷰를 벽을 개의치 않고 보여주면 안 되나? … 보여지는 쪽만 충실하면 될 거 같은데 … 1인칭도 굳이 쓸 필요가 없고 … 아시시를 해 보니 아직도 덜컹거리는 곳이」
// 1) 카메라는 벽을 개의치 않는다: 사용자 입력 없이 팔 길이가 바뀌는 프레임 0, 튐 0(좁은 곳 표본 전체 — 아시시 묘소·계단, 여의도동 계단·성가대석 아래,
//    명동 성단 옆, 밀라노·성 바오로 주보랑, 트인 신랑) 2) 아바타는 보인다: 지우지 못한 면에 가려진 프레임 ≈ 0 3) 깜빡이지 않는다: 잘라내기가 0.3초 안에
//    켰다 껐다 하는 일이 드물다 4) 자동 1인칭 없음(「시점」 단추로 고를 때만) 5) 잘라내기 단위(원뿔·단면·위층·카메라 둘레)·셰이더 6) 다리(bridge.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeEnv, samplePlaces, simulate, rotateFrames, runSamples, total, DT } from './cam_sim.mjs';
const require = createRequire(import.meta.url);
const Guard = require('../../assets/church/cam_guard.js');
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');

const res = runSamples(Guard, {});
const tot = total(res);

test('카메라 표본: 사용자 입력 없이 팔 길이가 바뀌지 않고(0), 튀지 않는다(0) — 벽이 카메라를 밀거나 당기지 않는다', () => {
  if (process.env.CAMMODE_REPORT) console.log(JSON.stringify(res));
  assert.ok(tot.n > 60000, `표본 프레임 ${tot.n}`);
  assert.equal(tot.boomNI, 0, '입력 없는 팔 길이 변화');
  assert.equal(tot.jumps, 0, '튐');
  assert.ok(tot.maxJump < 0.15, `한 프레임 초과 이동 최대 ${tot.maxJump.toFixed(2)}m`);
  assert.equal(tot.fpF, 0, '자동 1인칭(뒤에서 보기가 기본)');
});

test('카메라 표본: 아바타가 지우지 못한 면에 가려진 프레임이 거의 없다(0.1% 이하, 표본마다 1% 이하)', () => {
  assert.ok(tot.occ <= tot.tp * 0.001, `가림 ${tot.occ}/${tot.tp}`);
  for (const [tag, o] of Object.entries(res)) assert.ok(o.occ <= o.tp * 0.01, `${tag}: 가림 ${o.occ}/${o.tp}`);
});

test('카메라 표본: 잘라내기가 0.3초 안에 켰다 껐다 하는 일이 드물다(돌리는 1분에 2번 이하)', () => {
  const mins = tot.n * DT / 60;
  assert.ok(tot.flicker <= mins * 2, `깜빡 ${tot.flicker}번 / ${mins.toFixed(1)}분`);
});

// 가짜 가드: 아바타(0,0,0) 앞뒤 z = wall 에 벽 하나(넓은 면), 여러 층이면 levelYs
function fakeWall(wall, o = {}) {
  const out = { thin: 1, tri: -1, wideTri: -1 };
  return {
    out, fy0: 0, levelYs: o.levels || null,
    isThin: () => false, isFlat: () => false, levelOf: () => o.lb || 0,
    clip(ax, ay, az, bx, by, bz, m, skip) {
      out.thin = 1; out.tri = -1; out.wideTri = -1;
      // 위층 바닥 판(o.slab 높이의 수평면)을 지나면 그 면(층 값 o.lb)
      if (o.slab !== undefined && (ay - o.slab) * (by - o.slab) < 0) { const ts = (o.slab - ay) / (by - ay); if (!(skip && skip(0, ts))) { out.tri = 0; out.wideTri = 0; return ts; } }
      if ((az - wall) * (bz - wall) >= 0) return 1;
      const th = (wall - az) / (bz - az);
      if (skip && skip(0, th)) return 1;
      out.tri = 0; out.wideTri = 0; return th;
    }
  };
}

test('잘라내기: 벽 뒤 카메라 → 원뿔·단면이 0.08초에 켜지고, 단면은 아바타 쪽 벽 면에서 0.3m 카메라 쪽, 풀리면 hold 뒤 0.15초에 돌아온다', () => {
  const C = Guard.createCut(), O = {}, g = fakeWall(2.0);
  const I = { guard: g, cx: 0, cy: 4, cz: 6.5, mx: 0, my: 1, mz: 0, hy: 1.55, foot: 0, low: false, fp: 0 };
  C.step({ ...I, cz: 1.5 }, DT, O);   // 첫 프레임: 벽 앞
  assert.equal(O.k[1], 0);
  let n = 0; for (; n < 10 && C.k[1] < 1; n++) C.step(I, DT, O);
  assert.ok(n * DT <= Guard.CUT.fadeIn + DT + 1e-9, `켜지는 데 ${(n * DT).toFixed(2)}초`);
  assert.equal(O.k[3], 1, '단면');
  assert.ok(Math.abs(O.pd - (2.0 - Guard.CUT.planeBack)) < 0.05, `단면 자리 ${O.pd.toFixed(2)}`);
  // 셰이더와 같은 식: 벽(카메라 쪽 z=2)은 지우고, 아바타 앞(z=-1)·아바타 옆 가구(z=0.2)는 남긴다
  assert.equal(C.amount(g, 0, 3, 2, 2.0), 1);
  assert.equal(C.amount(g, 0, 3, 1, -1), 0);
  assert.equal(C.amount(g, 0, 3, 1, 0.2), 0);
  // 풀림: hold 동안은 켠 채, 그 뒤 fadeOut 안에 돌아온다(0.3초 안에 켰다 껐다 하지 않는다)
  const free = { ...I, cz: 1.5 };
  let t = 0; while (C.on[1] && t < 3) { C.step(free, DT, O); t += DT; }
  assert.ok(t >= Guard.CUT.hold - 1e-9, `끄기까지 ${t.toFixed(2)}초(hold ${Guard.CUT.hold})`);
  let t2 = 0; while (C.k[1] > 0 && t2 < 1) { C.step(free, DT, O); t2 += DT; }
  assert.ok(t2 <= Guard.CUT.fadeOut + DT + 1e-9 && Guard.CUT.fadeOut <= 0.15, `돌아오는 데 ${t2.toFixed(2)}초`);
});

test('잘라내기: 위층 — 카메라가 위층 바닥 아래 1.3m 까지 오르면 그 층(바닥 − 0.3m 위)을 아바타 앞 먼 평면까지 지운다, 그 아래는 남긴다', () => {
  const C = Guard.createCut(), O = {}, g = fakeWall(99, { levels: [3.6, 10.2], lb: 3.6, slab: 3.4 });
  const I = { guard: g, cx: 0, cy: 4.1, cz: 6.5, mx: 0, my: 1, mz: 0, hy: 1.55, foot: 0, low: false, fp: 0 };
  for (let i = 0; i < 5; i++) C.step(I, DT, O);
  assert.equal(O.k[4], 1, '위층(하부 성당) 지움');
  assert.ok(Math.abs(O.thr - 3.3) < 1e-6, `기준 ${O.thr}`);
  assert.equal(C.amount(g, 0, 0, 3.6, 3), 1, '카메라 쪽 위층 바닥 판');
  assert.equal(C.amount(g, 0, 0, 3.6, -O.fd - 1), 0, '먼 평면 너머는 남긴다');
  const g2 = fakeWall(99, { levels: [3.6, 10.2], lb: 0 });
  assert.equal(C.amount(g2, 0, 3, 1.0, 3), 0, '아바타 층(묘소 벽)은 위층 잘라내기로 지우지 않는다');
  // 카메라가 낮으면(위층 바닥 아래 1.3m 밑) 켜지 않는다
  const C2 = Guard.createCut(); C2.step({ ...I, cy: 2.0 }, DT, O);
  assert.equal(O.k[4], 0);
  // 위층 바닥에 뚫린 구멍(계단 우물)으로 보이면(그 층 면을 지나지 않으면) 지우지 않는다 — 우물 둘레 바닥이 그대로
  const C4 = Guard.createCut(); for (let i = 0; i < 5; i++) C4.step({ ...I, guard: fakeWall(99, { levels: [3.6, 10.2], lb: 3.6 }) }, DT, O);
  assert.equal(O.k[4], 0, '우물로 보이는 위층은 남긴다');
  // 1인칭: 잘라내기 없음
  const C3 = Guard.createCut(); C3.step({ ...I, fp: 1 }, DT, O);
  assert.ok(Array.from(O.k).every((v) => v === 0), '1인칭에서는 지우지 않는다');
});

test('셰이더: 칸(가는 255·넓은 170·낮은 85·바닥 42)·층 값(seeLvl)·균일값 다섯을 공유하고, 원래 onBeforeCompile 를 잇는다', () => {
  const src = fs.readFileSync(path.join(assets, 'cam_guard.js'), 'utf8');
  for (const k of ['attribute float seeThru', 'attribute float seeLvl', 'uniform vec4 uSeeP', 'uniform vec4 uSeeQ', 'if (sN < sF) discard', "'|see3'"]) assert.ok(src.includes(k), k);
  assert.ok(!/createRig|createView|buildSpace|reachOn/.test(src), '예전 충돌 리그·자동 1인칭·카메라 공간이 남았다');
});

test('main.js: 카메라는 사용자 각도·거리 그대로(리그·자동 1인칭·벽 당기기 없음), 잘라내기는 createCut, 시점 기본 tp', () => {
  const main = fs.readFileSync(path.join(assets, 'main.js'), 'utf8');
  assert.ok(!/createRig|createView|createCompose|clipWide|rig\.solve/.test(main), '예전 리그 흔적');
  assert.ok(main.includes('CG.createCut()') && main.includes('cutS.step(cutI, dt, cutO)'));
  assert.match(main, /var VIEW_MODES = \{ fp: 1, tp: 1 \};/);
  assert.match(main, /App\.camCfg\.view = VIEW_MODES\[m\] \? m : 'tp'/, "예전 'auto' 는 뒤에서 보기로");
});

test('1인칭은 고를 때만: fp 모드면 모든 프레임 1인칭, 뒤에서 보기면 묘소에서도 3인칭', () => {
  const env = makeEnv('assisi', Guard), { pts } = samplePlaces(env);
  const crypt = pts.find((p) => p.tag === 'crypt'), nave = pts.find((p) => p.tag === 'open_nave');
  const tp = simulate(env, rotateFrames(crypt, 0), { Guard, mode: 'tp' });
  assert.equal(tp.fpF, 0); assert.equal(tp.jumps, 0); assert.equal(tp.boomNI, 0);
  const fp = simulate(env, rotateFrames(nave, 0), { Guard, mode: 'fp' });
  assert.equal(fp.fpF, fp.n);
});

test('다리: setViewMode 가 bridge.js METHODS·main.js api 에 있고, Flutter 가 부른다', () => {
  const win = { console }; win.window = win;
  vm.runInNewContext(fs.readFileSync(path.join(assets, 'bridge.js'), 'utf8'), win);
  assert.ok(win.ChurchAPI._methods.includes('setViewMode'), 'bridge.js METHODS 에 setViewMode 없음 — 기기에서 조용히 버려진다');
  assert.equal(typeof win.ChurchAPI.setViewMode, 'function');
  const main = fs.readFileSync(path.join(assets, 'main.js'), 'utf8');
  assert.match(main, /setViewMode: function \(o\) \{ setViewMode\(o && o\.mode\); \}/);
  const dart = fs.readFileSync(path.resolve(here, '../../lib/church/church_scene_controller.dart'), 'utf8');
  assert.match(dart, /_call\('setViewMode', \{'mode': mode\}\)/);
});
