// 화질 단계 표(render.js ChurchRender.TIERS)·프레임 박자(frame_pace.js) 시험 — docs/church/RENDER_V3.md §1, §5.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const A = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/church');

function load(files, sb = {}) {
  sb.window = sb; vm.createContext(sb);
  files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(A, f), 'utf8'), sb, { filename: f }));
  return sb;
}

test('화질 단계: low 는 예전 비용(후처리·그림자·구운 AO·MSAA 없음), mid 는 high 의 부분집합, high 는 전부', () => {
  const T = load(['render.js'], { THREE: {} }).ChurchRender.TIERS;
  assert.deepEqual(Object.keys(T).sort(), ['high', 'low', 'mid']);
  const L = T.low, M = T.mid, H = T.high;
  assert.equal(L.msaa, 0); assert.equal(L.ssao, false); assert.equal(L.bloomDiv, 0); assert.equal(L.reflect, false);
  assert.equal(L.shadow, false); assert.equal(L.aoBake, false); assert.equal(L.specAA, 0); assert.ok(L.maxDpr <= 1.5);
  for (const k of ['ssao', 'reflect', 'shadow', 'aoBake']) assert.ok(!M[k] || H[k], 'mid 의 ' + k + ' 는 high 에도');
  assert.ok(M.msaa <= H.msaa && M.maxDpr <= H.maxDpr);
  assert.ok(H.ssao && H.reflect && H.shadow && H.aoBake && H.msaa >= 4 && H.specAA > 0);
  assert.ok(M.aoBake && !M.ssao, '보통: SSAO 대신 구운 AO');
  assert.ok(H.aoK > 0 && H.aoK <= M.aoK, 'high 는 SSAO 와 겹치므로 구운 AO 를 mid 이하로');
  assert.ok(M.bloomDiv > H.bloomDiv, '보통 블룸은 더 작은 해상도');
});

test('render.js 는 단계 표로 패스를 짓는다(하드코딩된 단계 분기가 다시 생기지 않게)', () => {
  const src = fs.readFileSync(path.join(A, 'render.js'), 'utf8');
  assert.match(src, /samples: [^\n]*TC\.msaa/);
  assert.match(src, /if \(TC\.ssao && X\.SSAOPass/);
  assert.match(src, /TC\.bloomDiv > 1/);
  assert.doesNotMatch(src, /hiT \? 4 : 2/);
  const w = fs.readFileSync(path.join(A, 'world.js'), 'utf8');
  assert.match(w, /aoDefer = !low && !builder\.viewing/);
  const html = fs.readFileSync(path.join(A, 'index.html'), 'utf8');
  for (const f of ['ao_fx.js', 'frame_pace.js']) assert.ok(html.includes('<script src="' + f + '">'), f);
  assert.ok(html.indexOf('ao_fx.js') < html.indexOf('cam_guard.js'), 'ao_fx 재질 고치기가 cam_guard 보다 먼저 실려야 한다');
});

function run(P, hz, frames, renderMs, startT = 1000) {
  // hz 화면에서 frames 번 rAF. renderMs: 그리는 프레임의 GPU 비용(ms) → 그 시간이 vsync 를 넘으면 다음 vsync 를 놓친다.
  // renderMs 가 배열이면 차례로 돌려 쓴다(들쭉날쭉한 비용: 어떤 프레임은 맞추고 어떤 프레임은 놓친다)
  const vs = 1000 / hz, costs = [].concat(renderMs); let t = startT, busyUntil = 0, drawn = 0;
  for (let i = 0; i < frames; i++) {
    t += vs;
    if (t < busyUntil - 0.01) continue;   // GPU 가 바빠 이 vsync 의 rAF 가 오지 않는다
    P.tick(t, true);
    if (P.skip()) continue;
    const ms = costs[drawn % costs.length];
    drawn++; P.work(ms * 0.3); busyUntil = t + ms;
  }
  return { t, drawn };
}

test('프레임 박자: 120Hz 를 못 따라가면 고른 60fps(div 2)로, 60Hz 는 건드리지 않는다, 여유가 생기면 다시 120', () => {
  const FP = load(['frame_pace.js']).ChurchFramePace;
  const P = FP.create();
  let r = run(P, 120, 60, 3);      // 처음엔 가볍다(120Hz 로 잰다)
  r = run(P, 120, 600, [7, 11, 9.5, 12, 7.5, 10], r.t);   // 7~12ms: 120Hz(8.3ms)를 들쭉날쭉 놓친다
  assert.equal(P.div, 2, '못 따라가면 절반 주기');
  assert.ok(Math.abs(P.vsync - 1000 / 120) < 0.5, 'vsync ' + P.vsync);
  r = run(P, 120, 2400, 3, r.t);   // 가벼워졌다(3ms) → 버티는 시간(5초) 뒤 다시 매 vsync
  assert.equal(P.div, 1, '여유가 생기면 120 으로');
  const Q = FP.create();
  run(Q, 60, 600, [12, 20, 25, 14]);
  assert.equal(Q.div, 1, '60Hz 화면은 그대로(자동 화질 하향이 맡는다)');
  const Z = FP.create({ enabled: false });
  run(Z, 120, 600, [7, 11, 9.5, 12]);
  assert.equal(Z.div, 1, '?pace=0');
});

test('프레임 박자: dt 를 vsync 배수로 맞춘다(배수에서 20% 넘게 벗어나면 그대로)', () => {
  const P = load(['frame_pace.js']).ChurchFramePace.create();
  let t = 0; for (let i = 0; i < 90; i++) { t += 1000 / 60 + (i % 2 ? 0.7 : -0.7); P.tick(t, true); }
  assert.ok(Math.abs(P.snap(0.0174) - 1 / 60) < 2e-4, String(P.snap(0.0174)));
  assert.ok(Math.abs(P.snap(0.0329) - 2 / 60) < 2e-4);
  assert.equal(P.snap(0.025), 0.025);
});
