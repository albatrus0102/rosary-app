// 걸음(보행) 측정 도구: 코드로 그린 아바타(avatar.js)를 Node(vm)에서 실제 update 로 돌리며 몸(루트)을 main.js·net_view.js 와 같은 규칙으로 움직이고,
// 디딘 발 밑창의 세계 좌표 속도(미끄러짐)·걸음 주기·관절 각도를 잰다. gait.test.mjs 와 gait_report.mjs 가 쓴다. 결과 해석: docs/church/WALK_GAIT.md
//   dir: assets/church 와 같은 배치의 폴더(고치기 전 사본과 비교할 때 다른 폴더를 준다)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
export const ASSETS = path.resolve(here, '../../assets/church');

const cache = {};
/** avatar.js(+avatar_glb.js)를 실은 vm 문맥. {A: ChurchAvatar, Glb: ChurchGlb, T: THREE} */
export function loadAvatar(dir = ASSETS) {
  if (cache[dir]) return cache[dir];
  const ctx = vm.createContext({ console, Math, Date, Float32Array, Float64Array, Uint16Array, Uint32Array, Uint8Array, Int32Array, Array, Object, JSON });
  ctx.window = ctx;
  const noop = () => {};
  const g2d = new Proxy(noop, { get: (t, k) => (k === 'canvas' ? {} : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k === 'getImageData' || k === 'createImageData') ? (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }) : noop), set: () => true });
  ctx.Uint8ClampedArray = Uint8ClampedArray;
  ctx.document = { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => g2d, addEventListener: noop }) };
  for (const f of ['three.min.js', 'palette.js', 'baptismal_names.js', 'geo.js', 'label_fit.js', 'avatar.js', 'avatar_glb.js']) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f });
  }
  return (cache[dir] = { A: ctx.ChurchAvatar, Glb: ctx.ChurchGlb, T: ctx.THREE, ctx });
}

// 뼈 번호(avatar.js BN 순서)
export const BI = { root: 0, hips: 1, spine: 2, chest: 3, neck: 4, head: 5, uaL: 6, faL: 7, haL: 8, uaR: 9, faR: 10, haR: 11, ulL: 12, llL: 13, ftL: 14, ulR: 15, llR: 16, ftR: 17 };
// 밑창(avatar.js buildShoes 의 SOLE 덩어리: 중심 (±HX, 0.025, -0.082), 반지름 (0.063, 0.033, 0.178))의 아래쪽 윤곽 — 발 뼈(발목, 높이 0.08) 기준
const SOLE = [];
for (let i = 0; i <= 12; i++) { const th = -1.35 + 2.7 * i / 12; SOLE.push([0, 0.025 - 0.08 - 0.033 * Math.cos(th), -0.082 + 0.178 * Math.sin(th)]); }

/** 몸 움직임 시나리오를 돌리고 프레임마다 잰다.
 *  scen: {dur, dt|dts(배열), drive(t, st) -> 이번 프레임의 {jx, jy} 또는 {walkTo:true} ... } 대신 아래 make* 를 쓴다. */
export function runScenario(dir, scen) {
  const { A, T } = loadAvatar(dir);
  const av = new A.Avatar({ g: scen.g === undefined ? 1 : scen.g, skin: 0, style: 0, hair: 0, outfit: 0, name: 0, nv: 2 }, { showTag: false });
  av.setLod(0);
  if (av.phase !== undefined) av.phase = 0.3;   // 결정적(처음 걸음 위상)
  if (scen.off !== undefined) av.off = scen.off;   // 숨쉬기·서 있을 때 체중 이동의 위상(기본은 무작위)
  if (scen.ground && av.setGround) av.setGround(scen.ground);   // 여러 층(계단): main.js groundFn 과 같은 바닥 함수
  const v3 = new T.Vector3();
  const body = { x: scen.x0 || 0, z: scen.z0 || 0, yaw: scen.yaw0 || 0, vx: 0, vz: 0, y: scen.y0 || 0, fy: scen.y0 || 0 };
  av.setPose(body.x, body.y, body.z, body.yaw); av.update(1 / 60, 0); av.snapPose && av.snapPose();
  const frames = [];
  let t = 0, i = 0;
  const prev = [null, null];
  while (t < scen.dur) {
    const dt = scen.dts ? scen.dts[i % scen.dts.length] : (scen.dt || 1 / 60);
    const px = body.x, pz = body.z;
    const walkV = scen.step(body, dt, t, av);   // 몸을 옮기고 setWalk 에 줄 값을 돌려준다
    av.setWalk(walkV);
    av.setPose(body.x, body.y || 0, body.z, body.yaw);
    av.update(dt, t);
    av.root.updateMatrixWorld(true);
    // 발 밑창(같은 물질점의 이전 위치와 비교)
    const feet = [];
    for (const [k, ft] of [[0, BI.ftL], [1, BI.ftR]]) {
      const b = av.bones[ft];
      const pts = SOLE.map((p) => { v3.set(p[0], p[1], p[2]); b.localToWorld(v3); return [v3.x, v3.y, v3.z]; });
      let lo = 0; for (let q = 1; q < pts.length; q++) if (pts[q][1] < pts[lo][1]) lo = q;
      const pv = prev[k];
      const vel = pv ? Math.hypot(pts[lo][0] - pv[lo][0], pts[lo][2] - pv[lo][2]) / dt : 0;
      const fw = new T.Vector3(0, 0, -1).transformDirection(b.matrixWorld);
      const gf = av.gait && av.gait.f ? av.gait.f[k] : null;
      // ikErr: 발목 뼈가 걸음이 정한 발목 자리(gait.f[k].ax/ay/az)에서 떨어진 거리(m) — 다리가 닿지 않아 IK 가 길이를 자르면 커진다
      b.getWorldPosition(v3);
      const ikErr = gf && gf.ax !== undefined ? Math.hypot(v3.x - gf.ax, v3.y - gf.ay, v3.z - gf.az) : 0;
      feet.push({ y: pts[lo][1], vel, vy: pv ? (pts[lo][1] - pv[lo][1]) / dt : 0, pts, yaw: Math.atan2(-fw.x, -fw.z), pitch: Math.asin(Math.max(-1, Math.min(1, fw.y))), st: gf ? gf.st : (pts[lo][1] < 0.012 ? 1 : 0), ikErr, u: gf ? gf.u : 0 });
      prev[k] = pts;
    }
    const wp = (bi) => { av.bones[bi].getWorldPosition(v3); return [v3.x, v3.y, v3.z]; };
    const J = {}; for (const n of ['hips', 'chest', 'neck', 'head', 'ulL', 'llL', 'ftL', 'ulR', 'llR', 'ftR', 'uaL', 'faL', 'uaR', 'faR']) J[n] = wp(BI[n]);
    const hq = av.bones[BI.hips].quaternion; const hipsYaw = 2 * Math.atan2(hq.y, hq.w);
    // ev: 이 프레임에 디딘 발(avatar.takeStep 이 돌려줄 값 — main.js 가 발소리를 낸다), rate: 걸음 위상 속도(주기/초)
    const ev = av.gait && av.gait.ev ? Object.assign({}, av.gait.ev) : null;
    frames.push({ t, dt, bodyV: Math.hypot(body.x - px, body.z - pz) / dt, x: body.x, y: body.y || 0, z: body.z, yaw: body.yaw, feet, J, hipsYaw, walkTarget: walkV, ev, rate: av.gait ? av.gait.rate : 0 });
    t += dt; i++;
  }
  return frames;
}

/** 프레임 목록 → 미끄러짐 요약. 디딘 발 = 두 발 중 낮은 발(바닥 + 1.5cm 안). from/to(s)로 구간을 자른다. */
export function slipStats(frames, from = 0, to = 1e9, minBody = 0.05) {
  let slip = 0, body = 0, n = 0, nAll = 0, slipStill = 0, nStill = 0, maxSlip = 0;
  for (let i = 1; i < frames.length; i++) {
    const f = frames[i];
    if (f.t < from || f.t > to) continue;
    const lo = f.feet[0].y < f.feet[1].y ? 0 : 1, F = f.feet[lo];
    if (F.y > 0.015) continue;   // 두 발이 다 떠 있다(달리기 체공·뛰어오름)
    nAll++;
    if (f.bodyV > minBody) { slip += F.vel; body += f.bodyV; n++; maxSlip = Math.max(maxSlip, F.vel); }
    else { slipStill += F.vel; nStill++; }
  }
  return { ratio: body > 0 ? slip / body : 0, slip: n ? slip / n : 0, body: n ? body / n : 0, maxSlip, n, stillSlip: nStill ? slipStill / nStill : 0, nStill };
}

/** glb 아바타(avatar_glb.js): 제자리 걷기 클립(만든 속도 clipSpeed 에서 발이 딱 붙는 클립)을 재생할 때 디딘 발이 바닥에서 미끄러지는 속도
 *  = |몸 속도 − 걷기 가중치 × timeScale × clipSpeed|. old=true 면 고치기 전 식(입력 walkTarget 을 따라가는 walkAmt, timeScale 0.5~2.2 자르기).
 *  새 식은 avatar_glb.js 의 ChurchGlb.walkPlayback(실제 이동 속도). 몸 속도는 프레임의 실제 이동량. */
export function glbSlip(frames, { old = false, clipSpeed = 1.3, from = 0, to = 1e9, Glb = null } = {}) {
  const sm = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  let walkAmt = 0, moveV = 0, slip = 0, body = 0, legs = 0, n = 0;
  for (const f of frames) {
    walkAmt += (f.walkTarget - walkAmt) * Math.min(1, f.dt * 10);
    moveV += (f.bodyV - moveV) * Math.min(1, f.dt * 14);
    let w, ts;
    if (old) { w = sm(walkAmt * 4); ts = Math.max(0.5, Math.min(2.2, walkAmt * 4.0 / clipSpeed)); }
    else { const p = Glb.walkPlayback(moveV, clipSpeed); w = p.weight; ts = p.timeScale; }
    if (f.t < from || f.t > to) continue;
    const foot = w * ts * clipSpeed;   // 클립 속 디딘 발이 몸 기준으로 뒤로 가는 속도
    legs += foot;
    if (f.bodyV > 0.05) { slip += Math.abs(f.bodyV - foot); body += f.bodyV; n++; }
  }
  return { ratio: body > 0 ? slip / body : 0, n, legFootV: legs / Math.max(1, frames.filter((f) => f.t >= from && f.t <= to).length) };
}

/** 제자리 돌기: 디딘 발이 바닥에서 비틀린 각(도, 합) 과 발을 디딘 횟수 */
export function turnStats(frames, from = 0, to = 1e9) {
  let twist = 0, strikes = 0; const last = [true, true];
  for (let i = 1; i < frames.length; i++) {
    const f = frames[i], g = frames[i - 1];
    if (f.t < from || f.t > to) continue;
    for (const k of [0, 1]) {
      const on = f.feet[k].y < 0.012;
      // 발바닥이 바닥에 눌려 있는 동안만(흔들며 스치는 발은 빼고)
      if (f.feet[k].y < -0.004 && g.feet[k].y < -0.004) { let d = f.feet[k].yaw - g.feet[k].yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); twist += Math.abs(d); }
      if (on && !last[k]) strikes++;
      last[k] = on;
    }
  }
  return { twistDeg: twist * 180 / Math.PI, strikes };
}

/** 다리가 움직이는 정도: 발 밑창의 몸 기준(루트 기준) 상대 속도 평균. 막혔을 때 다리가 멈추는지 본다. */
export function legMotion(frames, from = 0, to = 1e9) {
  let s = 0, n = 0;
  for (let i = 1; i < frames.length; i++) {
    const f = frames[i], g = frames[i - 1];
    if (f.t < from || f.t > to) continue;
    for (const k of [0, 1]) {
      // 몸(루트) 이동을 뺀 발의 움직임
      const a = f.J[k ? 'ftR' : 'ftL'], b = g.J[k ? 'ftR' : 'ftL'];
      const dx = (a[0] - f.x) - (b[0] - g.x), dz = (a[2] - f.z) - (b[2] - g.z), dy = a[1] - b[1];
      s += Math.hypot(dx, dy, dz) / f.dt; n++;
    }
  }
  return n ? s / n : 0;
}

function ang(a, b, c) {   // b 에서 a·c 사이 각(도)
  const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
  const d = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v));
  return Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI;
}
// 몸 기준 앞(= -z 를 yaw 로 돌린 방향) 성분과 옆 성분
function localXZ(f, p) { const dx = p[0] - f.x, dz = p[2] - f.z, c = Math.cos(f.yaw), s = Math.sin(f.yaw); return { side: dx * c - dz * s, fwd: -(dx * s + dz * c) }; }

/** 자세 수치: 한 구간(정상 보행)에서 걸음 수·보폭·무릎·팔·몸통 기울기·골반 회전·발 들림·보폭 폭·골반 상하 흔들림 */
export function postureStats(frames, from, to) {
  const F = frames.filter((f) => f.t >= from && f.t <= to);
  let strikes = 0, last = [true, true];
  const kneeL = [], kneeR = [], armR = [], lean = [], pel = [], lift = [], width = [], hipY = [], stanceKnee = [], hipFlex = [], loadKnee = [];
  const since = [1e9, 1e9]; let minY = 1e9;
  let dist = 0;
  for (let i = 0; i < F.length; i++) {
    const f = F[i];
    if (i) dist += Math.hypot(f.x - F[i - 1].x, f.z - F[i - 1].z);
    const kL = 180 - ang(f.J.ulL, f.J.llL, f.J.ftL), kR = 180 - ang(f.J.ulR, f.J.llR, f.J.ftR);
    kneeL.push(kL); kneeR.push(kR);
    for (const k of [0, 1]) {
      const on = f.feet[k].y < 0.012;
      minY = Math.min(minY, f.feet[k].y);
      if (on && !last[k]) { strikes++; since[k] = 0; }
      if (on) { stanceKnee.push(k ? kR : kL); since[k] += f.dt; if (since[k] < 0.12) loadKnee.push(k ? kR : kL); } else lift.push(f.feet[k].y);
      last[k] = on;
    }
    const sh = localXZ(f, f.J.uaR), el = localXZ(f, f.J.faR);
    armR.push(Math.atan2(el.fwd - sh.fwd, f.J.uaR[1] - f.J.faR[1]) * 180 / Math.PI);
    const hp = localXZ(f, f.J.hips), nk = localXZ(f, f.J.neck);
    lean.push(Math.atan2(nk.fwd - hp.fwd, f.J.neck[1] - f.J.hips[1]) * 180 / Math.PI);
    pel.push(f.hipsYaw * 180 / Math.PI);
    const a = localXZ(f, f.J.ftL), b = localXZ(f, f.J.ftR);
    width.push(Math.abs(a.side - b.side));
    hipY.push(f.J.hips[1]);
    const th = localXZ(f, f.J.llR), tt = localXZ(f, f.J.ulR);
    hipFlex.push(Math.atan2(th.fwd - tt.fwd, f.J.ulR[1] - f.J.llR[1]) * 180 / Math.PI);
  }
  const T = F.length ? F[F.length - 1].t - F[0].t : 1;
  const corr = (x, y) => { const n = x.length, mxx = x.reduce((s, v) => s + v, 0) / n, myy = y.reduce((s, v) => s + v, 0) / n; let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { a += (x[i] - mxx) * (y[i] - myy); b += (x[i] - mxx) ** 2; c += (y[i] - myy) ** 2; } return a / Math.sqrt(b * c || 1); };
  const mx = (a) => Math.max(...a), mn = (a) => Math.min(...a), avg = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
  const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor((s.length - 1) * p)] || 0; };
  return {
    speed: dist / T, cadence: strikes / T * 60, stepLen: strikes ? dist / strikes : 0, strideOverH: strikes ? 2 * dist / strikes / 1.7 : 0,
    kneeSwingMax: Math.max(mx(kneeL), mx(kneeR)), kneeStanceMax: pct(stanceKnee, 0.9), kneeLoad: loadKnee.length ? mx(loadKnee) : 0, kneeMin: Math.min(mn(kneeL), mn(kneeR)), minFootY: minY,
    hipFlexRange: mx(hipFlex) - mn(hipFlex), armRange: mx(armR) - mn(armR), lean: avg(lean), pelvisRange: mx(pel) - mn(pel),
    armLegCorr: corr(armR, hipFlex), pelvisLegCorr: corr(pel, hipFlex),
    liftMax: lift.length ? mx(lift) : 0, widthAvg: avg(width), widthMin: mn(width), bob: mx(hipY) - mn(hipY)
  };
}

// ------------------------------------------------------------------ 몸 움직임(main.js updateMe 의 걷기와 같은 규칙)
const Logic = require(path.join(ASSETS, 'scene_logic.js'));
const Ctl = require(path.join(ASSETS, 'controls.js'));   // 손맛(FEEL): 손잡이 곡선·가속·감속(main.js updateMe 와 같은 함수)
// scene_logic.js joyToVelocity 와 같은 식(성당 없이 쓰려고 옮겨 둠; 속도 상수는 그쪽 것을 읽는다)
function joyToVelocity(jx, jy, camYaw, out) {
  const mag = Math.hypot(jx, jy);
  if (mag < 0.05) { out.vx = out.vz = out.speed = 0; return out; }
  const m = Math.min(1, mag), fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
  let dx = fx * jy + rx * jx, dz = fz * jy + rz * jx; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
  out.speed = Logic.C.WALK_SPEED * m; out.vx = dx * out.speed; out.vz = dz * out.speed; out.yaw = Math.atan2(-dx, -dz);
  return out;
}
/** 조이스틱 걷기. L: ChurchLogic(충돌체 있음) 또는 null(빈 바닥). joy(t) -> {x, y}. setWalk 는 main.js 처럼 명령 속도(me.vx) 기준. */
export function joyWalker(L, joy, camYaw = 0) {
  const vel = { vx: 0, vz: 0, speed: 0, yaw: 0 }, pp = { x: 0, z: 0 };
  const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
  return (me, dt, t) => {
    const j = joy(t);   // 시험의 손잡이 값 = 속도 비율(앱의 손잡이 곡선 FEEL.joy* 는 입력 감도라 걸음 시험에서는 빼고, 가속·감속은 main.js 와 같게)
    joyToVelocity(j.x, j.y, j.cam === undefined ? camYaw : j.cam, vel);
    Ctl.moveStep(me, vel.vx, vel.vz, dt, false);
    let sp = Math.sqrt(me.vx * me.vx + me.vz * me.vz);
    if (sp > 0.02 || me.mvx * me.mvx + me.mvz * me.mvz > 4e-4) {
      pp.x = me.x; pp.z = me.z;
      if (L) L.moveCircle(pp, me.mvx * dt, me.mvz * dt); else { pp.x += me.mvx * dt; pp.z += me.mvz * dt; }
      me.x = pp.x; me.z = pp.z;
    } else { me.vx = me.vz = 0; sp = 0; }
    if (vel.speed > 0.05) me.yaw += wrap(vel.yaw - me.yaw) * (1 - Math.exp(-dt * Ctl.FEEL.turnRate));
    else if (j.turnTo !== undefined) me.yaw += wrap(j.turnTo - me.yaw) * (1 - Math.exp(-dt * 8));
    return Math.min(1, sp / Logic.C.WALK_SPEED * 1.05);
  };
}
/** 자동 걷기(stations.stepWalk 경로). */
export function autoWalker(L, S, target) {
  const wv = {}, pp = { x: 0, z: 0 }; let w = null;
  const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
  return (me, dt) => {
    if (!w) { const p = S.findPath(me, target); w = p ? S.startWalk(p, target, 'x') : null; }
    let vx = 0, vz = 0, speed = 0, yaw = me.yaw;
    if (w) { S.stepWalk(w, me, dt, wv); if (wv.done) w = false; else { vx = wv.vx; vz = wv.vz; speed = wv.speed; yaw = wv.yaw; } }
    Ctl.moveStep(me, vx, vz, dt, true);
    let sp = Math.hypot(me.vx, me.vz);
    if (sp > 0.02 || me.mvx * me.mvx + me.mvz * me.mvz > 4e-4) { pp.x = me.x; pp.z = me.z; L.moveCircle(pp, me.mvx * dt, me.mvz * dt); me.x = pp.x; me.z = pp.z; } else { me.vx = me.vz = 0; sp = 0; }
    if (speed > 0.05) me.yaw += wrap(yaw - me.yaw) * (1 - Math.exp(-dt * Ctl.FEEL.turnRate));
    return Math.min(1, sp / Logic.C.WALK_SPEED * 1.05);
  };
}
/** 다른 사람(net_view.js): 0.1초마다 받은 위치를 200ms 늦춰 선형 보간하고 그 이동으로 걸음 값을 정한다. walkOf(speed) = net_view 의 식. */
export function remoteWalker(joy, walkOf) {
  const src = { x: 0, z: 0, yaw: 0, vx: 0, vz: 0 }, inner = joyWalker(null, joy), samples = [];
  let posT = 1, rspeed = 0, last = { x: 0, z: 0 };
  return (me, dt, t) => {
    inner(src, dt, t);
    posT += dt;
    if (posT >= 0.1) { posT = 0; samples.push({ t, x: src.x, z: src.z, r: src.yaw }); }
    const rt = t - 0.2;
    let x = samples.length ? samples[0].x : 0, z = samples.length ? samples[0].z : 0, r = 0;
    for (let a = 0; a + 1 < samples.length; a++) {
      const s0 = samples[a], s1 = samples[a + 1];
      if (rt >= s0.t && rt <= s1.t) { const f = (rt - s0.t) / (s1.t - s0.t); x = s0.x + (s1.x - s0.x) * f; z = s0.z + (s1.z - s0.z) * f; r = s0.r + (s1.r - s0.r) * f; break; }
      if (rt > s1.t) { x = s1.x; z = s1.z; r = s1.r; }
    }
    const sp2 = Math.hypot(x - last.x, z - last.z) / Math.max(dt, 1e-3);
    rspeed += (sp2 - rspeed) * Math.min(1, dt * 8);
    last = { x, z };
    const walk = walkOf(rspeed);
    if (walk > 0) me.yaw += (r - me.yaw) * Math.min(1, dt * 12);
    me.x = x; me.z = z;
    return walk;
  };
}
/** 혼자 모드 배경 신자(net_view.js createCrowd): 0.8 m/s 로 걷는다. walkVal = setWalk 에 주는 값. */
export function crowdWalker(walkVal) {
  return (me, dt) => { me.z -= 0.8 * dt; me.yaw = 0; return walkVal; };
}

// ------------------------------------------------------------------ 「터덜거림」 측정(2026-11-22 2차, docs/church/WALK_GAIT.md §6)
/** 일정 속도로 곧게 걷는 몸(main.js 관성 dt*12 과 같다). v(t) -> m/s. 조이스틱 상한과 상관없이 같은 속도로 옛 코드·새 코드를 비교할 때 쓴다. */
export function speedWalker(v) {
  const vf = typeof v === 'function' ? v : () => v;
  return (me, dt, t) => {
    const k = Math.min(1, dt * 12);
    me.vz += (-vf(t) - me.vz) * k; me.vx = 0;
    me.z += me.vz * dt; me.yaw = 0;
    return Math.min(1, Math.abs(me.vz) / Logic.C.WALK_SPEED * 1.05);
  };
}
/** 매끄러움 수치(정상 보행 구간):
 *  hipBob/headBob(m): 골반·머리 세계 높이의 폭(루트 높이를 뺀 값), bobPhase: 골반이 가장 높은 때가 한 걸음(디딤→다음 디딤)의 어디인가(0..1, 사람은 디딤 가운데 ≈ 0.4~0.6),
 *  footSnapDps: 디딘 발 기울기(발등 방향의 pitch) 변화 속도 최대(°/s — 뒤꿈치 닿고 발바닥이 바닥에 「철썩」 닿는 빠르기), landPitchDeg: 닿는 순간 발끝 든 각,
 *  kneeMid: 디딘 다리가 골반 바로 아래 올 때 무릎 굽힘 평균(°), flightFrames: 두 발이 다 떠 있는 프레임 수(gait 상태와 밑창 높이 둘 다),
 *  acc: 관절별 프레임 간 가속도 최대(m/s², 두 번 차분), jerk: 가속도의 프레임 간 변화 최대(m/s³) — 디딘 발 바꿈·IK 닿는 길이 자르기에서 튀면 커진다. */
export function smoothStats(frames, from, to) {
  const F = frames.filter((f) => f.t >= from && f.t <= to);
  const hy = F.map((f) => f.J.hips[1] - f.y), hd = F.map((f) => f.J.head[1] - f.y);
  const mx = (a) => Math.max(...a), mn = (a) => Math.min(...a);
  const strikes = [];
  for (let i = 1; i < F.length; i++) for (const k of [0, 1]) if (F[i].feet[k].st && !F[i - 1].feet[k].st) strikes.push({ i, k });
  const phases = [], landPitch = [];
  for (let s = 0; s + 1 < strikes.length; s++) {
    const a = strikes[s].i, b = strikes[s + 1].i; if (b - a < 4) continue;
    let best = a; for (let i = a; i < b; i++) if (hy[i] > hy[best]) best = i;
    phases.push((best - a) / (b - a));
  }
  for (const s of strikes) landPitch.push(F[s.i].feet[s.k].pitch * 180 / Math.PI);
  // 닿기 직전 0.05초(3프레임) 동안 흔드는 발(밑창 가장 낮은 점)이 내려오는 속도 최대(m/s) — 크면 발을 「쿵」 내려찍는다(사람 뒤꿈치는 닿을 때 0.1~0.4 m/s)
  let strikeVy = 0;
  for (const s of strikes) for (let i = s.i; i >= 0 && F[s.i].t - F[i].t <= 0.05; i--) strikeVy = Math.max(strikeVy, -F[i].feet[s.k].vy);
  // 걸음 수(분당): gait 디딤 순간 사이 시간으로(밑창 높이로 세는 postureStats.cadence 보다 덜 흔들린다)
  const cadence = strikes.length > 2 ? (strikes.length - 1) / (F[strikes[strikes.length - 1].i].t - F[strikes[0].i].t) * 60 : 0;
  let ikErr = 0;
  for (const f of F) for (const k of [0, 1]) ikErr = Math.max(ikErr, f.feet[k].ikErr || 0);
  // 발바닥 닿기(뒤꿈치 닿은 뒤 0.15초 안): 디딘 발 기울기 변화 속도 최대(°/s) — 「철썩」. 뒤꿈치 들어 떼기(앞꿈치로 구르기)는 빼고 따로(pushDps)
  let snap = 0, push = 0, flightSt = 0, flightGeo = 0;
  const since = [1e9, 1e9];
  for (let i = 1; i < F.length; i++) {
    for (const k of [0, 1]) {
      if (F[i].feet[k].st && !F[i - 1].feet[k].st) since[k] = 0; else since[k] += F[i].dt;
      if (!(F[i].feet[k].st && F[i - 1].feet[k].st)) continue;
      const r = Math.abs(F[i].feet[k].pitch - F[i - 1].feet[k].pitch) / F[i].dt * 180 / Math.PI;
      if (since[k] < 0.15) snap = Math.max(snap, r); else push = Math.max(push, r);
    }
    if (!F[i].feet[0].st && !F[i].feet[1].st) flightSt++;
    if (F[i].feet[0].y - F[i].y > 0.012 && F[i].feet[1].y - F[i].y > 0.012) flightGeo++;
  }
  const kneeMid = [];
  const fwdOf = (f, p) => { const dx = p[0] - f.x, dz = p[2] - f.z, c = Math.cos(f.yaw), s = Math.sin(f.yaw); return -(dx * s + dz * c); };
  for (const f of F) for (const k of [0, 1]) {
    if (!f.feet[k].st) continue;
    const u = f.J[k ? 'ulR' : 'ulL'], l = f.J[k ? 'llR' : 'llL'], a = f.J[k ? 'ftR' : 'ftL'];
    if (Math.abs(fwdOf(f, a) - fwdOf(f, u)) < 0.04) kneeMid.push(180 - ang(u, l, a));
  }
  const acc = {}, jerk = {};
  for (const n of ['hips', 'head', 'chest', 'llL', 'llR', 'ftL', 'ftR', 'faL', 'faR']) {
    let am = 0, jm = 0, pa = null;
    for (let i = 1; i + 1 < F.length; i++) {
      const p0 = F[i - 1].J[n], p1 = F[i].J[n], p2 = F[i + 1].J[n], d0 = F[i].dt, d1 = F[i + 1].dt;
      const y0 = p0[1] - F[i - 1].y, y1 = p1[1] - F[i].y, y2 = p2[1] - F[i + 1].y;   // 루트 높이(계단)를 뺀다
      const v0 = [(p1[0] - p0[0]) / d0, (y1 - y0) / d0, (p1[2] - p0[2]) / d0], v1 = [(p2[0] - p1[0]) / d1, (y2 - y1) / d1, (p2[2] - p1[2]) / d1];
      const a = [0, 1, 2].map((q) => (v1[q] - v0[q]) * 2 / (d0 + d1));
      am = Math.max(am, Math.hypot(...a));
      if (pa) jm = Math.max(jm, Math.hypot(a[0] - pa[0], a[1] - pa[1], a[2] - pa[2]) / d1);
      pa = a;
    }
    acc[n] = am; jerk[n] = jm;
  }
  const avg = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
  return {
    hipBob: mx(hy) - mn(hy), headBob: mx(hd) - mn(hd), bobPhase: avg(phases), footSnapDps: snap, landPitchDeg: avg(landPitch),
    kneeMid: avg(kneeMid), kneeMidN: kneeMid.length, flightFrames: flightSt, flightGeoFrames: flightGeo, frames: F.length, acc, jerk, strikeVy, ikErr, cadence, pushDps: push
  };
}
/** main.js updateCamera 의 높이: 보는 점 fy = me.y + 1.0(루트 — 골반이 아니다), 카메라 위치는 1 - exp(-dt·7) 로 따라간다(평지 리그는 거리·각도가 일정).
 *  rootY(frame) = 그 프레임의 me.y. 돌려주는 값: 카메라 높이 폭(m), 프레임 간 높이 가속도 최대(m/s²). */
export function cameraTrack(frames, from, to, rootY = (f) => f.y) {
  let cy = null, pv = null, ymin = 1e9, ymax = -1e9, am = 0, py = null;
  for (const f of frames) {
    const target = rootY(f) + 1.0;
    if (cy === null) cy = target;
    cy += (target - cy) * (1 - Math.exp(-f.dt * 7));
    if (f.t < from || f.t > to) { py = cy; pv = null; continue; }
    ymin = Math.min(ymin, cy); ymax = Math.max(ymax, cy);
    if (py !== null) { const v = (cy - py) / f.dt; if (pv !== null) am = Math.max(am, Math.abs(v - pv) / f.dt); pv = v; }
    py = cy;
  }
  return { range: ymax - ymin, accMax: am };
}

// ------------------------------------------------------------------ 계단·꺾은 길·좌우 대칭(2026-11-23 3차, 「절뚝거림」 — WALK_GAIT.md §7)
/** 꺾은선(pts, xz)을 속도 v 로 걷는 몸: 몸 방향은 main.js 처럼 × dt·11 로 돌고, 여러 층이면 발 높이 fy = L.floorY, 루트 높이는 L.bodyY(계단을 비탈처럼)를 × dt·14 로 따른다.
 *  runScenario 에 { ground: (x, z, y) => L.floorY(x, z, y + 0.2), x0, z0, y0, yaw0 } 와 함께 준다. 끝에 닿으면 선다. */
export function lineWalker(L, pts, v) {
  const segs = []; let len = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); if (d > 1e-6) { segs.push({ a: pts[i - 1], b: pts[i], s0: len, d }); len += d; } }
  const at = (s) => { let g = segs[segs.length - 1]; for (const q of segs) if (s <= q.s0 + q.d) { g = q; break; } const f = Math.min(1, Math.max(0, (s - g.s0) / g.d)); return { x: g.a.x + (g.b.x - g.a.x) * f, z: g.a.z + (g.b.z - g.a.z) * f, yaw: Math.atan2(-(g.b.x - g.a.x), -(g.b.z - g.a.z)) }; };
  let s = 0, sp = 0;
  return (me, dt) => {
    sp += (v - sp) * Math.min(1, dt * 12);
    const px = me.x, pz = me.z;
    s = Math.min(len, s + sp * dt);
    const P = at(s); me.x = P.x; me.z = P.z;
    me.yaw += Math.atan2(Math.sin(P.yaw - me.yaw), Math.cos(P.yaw - me.yaw)) * Math.min(1, dt * 11);
    if (L && L.floorY) {
      me.fy = L.floorY(me.x, me.z, me.fy);
      const mx = me.x - px, mz = me.z - pz, md = Math.hypot(mx, mz);
      me.y += ((md > 1e-5 && L.bodyY ? L.bodyY(me.x, me.z, me.fy, mx / md, mz / md) : me.fy) - me.y) * Math.min(1, dt * 14);
    }
    return Math.min(1, Math.hypot(me.x - px, me.z - pz) / dt / Logic.C.WALK_SPEED * 1.05);
  };
}
/** 좌우 대칭(절뚝거림) 수치. 디딤(gait 상태)마다 그 발의 무릎 최소(°, 디딤에서 다리를 펴는가)·최대, 흔들기 무릎 최대, 디딤·흔들기 시간, 흔들 때 밑창 최고(m),
 *  착지 사이 시간·거리: tLR/dLR = 왼발 착지 → 오른발 착지(오른발이 내딛는 걸음), tRL/dRL 은 반대. 사람 걸음의 좌우 차는 보통 2~5% 안.
 *  soundLR/soundRL/soundAsym: main.js 가 내는 발소리 사이 간격(ev.lag 로 프레임 안 착지 시각을 맞춘다) — 옛 코드는 프레임 경계라 엇갈렸다. */
export function symmetryStats(frames, from, to) {
  const F = frames.filter((f) => f.t >= from && f.t <= to);
  const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const avg = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  const side = [0, 1].map(() => ({ stMin: [], stMax: [], swMax: [], stT: [], swT: [], clear: [], cur: null }));
  const strikes = [];
  for (let i = 1; i < F.length; i++) {
    const f = F[i], g = F[i - 1];
    for (const k of [0, 1]) {
      const n = k ? 'R' : 'L', kn = 180 - ang(f.J['ul' + n], f.J['ll' + n], f.J['ft' + n]), S = side[k];
      const st = f.feet[k].st, was = g.feet[k].st;
      if (st && !was) {   // 착지: 흔들기 끝, 디딤 시작
        if (S.cur && S.cur.kind === 'sw') { S.swMax.push(S.cur.max); S.swT.push(f.t - S.cur.t0); S.clear.push(S.cur.clear); }
        S.cur = { kind: 'st', t0: f.t, min: kn, max: kn };
        // 실제 닿은 때: 착지는 프레임 경계에서만 알 수 있어, 위상이 한 바퀴를 넘은 만큼(u / rate) 앞으로 당긴다(프레임 수가 홀수인 주기에서 한 프레임씩 엇갈리는 측정 오차를 뺀다)
        const lag = f.rate > 0 ? Math.min(f.dt, f.feet[k].u / f.rate) : 0;
        strikes.push({ k, t: f.t - lag, p: f.J['ft' + n] });
      } else if (!st && was) {   // 떼기
        if (S.cur && S.cur.kind === 'st') { S.stMin.push(S.cur.min); S.stMax.push(S.cur.max); S.stT.push(f.t - S.cur.t0); }
        S.cur = { kind: 'sw', t0: f.t, max: kn, clear: 0 };
      } else if (S.cur) {
        S.cur.min = Math.min(S.cur.min, kn); S.cur.max = Math.max(S.cur.max, kn);
        if (S.cur.kind === 'sw') S.cur.clear = Math.max(S.cur.clear, f.feet[k].y - f.y);
      }
    }
  }
  // 발소리 시각: main.js 와 같이 이 프레임 + (dt − ev.lag) 에 낸다(lag 가 없던 옛 코드는 프레임 시각 그대로)
  const snd = [];
  for (const f of F) if (f.ev) snd.push({ k: f.ev.side > 0 ? 1 : 0, t: f.t + (f.ev.lag === undefined ? 0 : Math.max(0, f.dt - f.ev.lag)) });
  const st2 = [[], []];
  for (let i = 1; i < snd.length; i++) if (snd[i].k !== snd[i - 1].k) st2[snd[i].k].push(snd[i].t - snd[i - 1].t);
  const t = [[], []], d = [[], []];
  for (let i = 1; i < strikes.length; i++) {
    const a = strikes[i - 1], b = strikes[i];
    if (a.k === b.k) continue;
    t[b.k].push(b.t - a.t); d[b.k].push(Math.hypot(b.p[0] - a.p[0], b.p[2] - a.p[2]));
  }
  const out = (S) => ({ stanceKneeMin: med(S.stMin), stanceKneeMax: med(S.stMax), swingKneeMax: med(S.swMax), stanceT: avg(S.stT), swingT: avg(S.swT), clear: med(S.clear), n: S.stMin.length });
  const tLR = avg(t[1]), tRL = avg(t[0]), dLR = avg(d[1]), dRL = avg(d[0]);
  return { L: out(side[0]), R: out(side[1]), tLR, tRL, dLR, dRL, nSteps: t[0].length + t[1].length,
    timeAsym: Math.abs(tLR - tRL) / Math.max(1e-9, (tLR + tRL) / 2), lenAsym: Math.abs(dLR - dRL) / Math.max(1e-9, (dLR + dRL) / 2),
    soundLR: avg(st2[1]), soundRL: avg(st2[0]), soundAsym: Math.abs(avg(st2[1]) - avg(st2[0])) / Math.max(1e-9, (avg(st2[1]) + avg(st2[0])) / 2) };
}
