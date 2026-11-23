// 카메라 표본 시뮬레이터(docs/church/CAMERA_MODES.md §숫자): 성당 메시·카메라 가드를 Node 에서 짓고, main.js updateCamera 와 같은 순서로 매 프레임 돌린다.
//  지금(new): 피벗 스프링(controls.js createFollow) + 사용자 각도·거리 그대로의 팔(충돌 없음) → 잘라내기(cam_guard createCut).
//  예전(old, --old 옛cam_guard.js): 리그(createRig 스프링 암·자동 시점) → 자동 1인칭(createView) → 카메라 놓기(createCompose) + 원뿔 잘라내기(main.js seeEase).
// 시나리오: (1) 그 자리에 서서 화면을 끌어 한 바퀴 넘게 돌리고 위아래로도 끈다(rotate) (2) 계단·통로를 걸으며 뒤에서 따라간다(walk).
// 지표(3인칭 프레임):
//  jumps   = 튐: 한 프레임 카메라 이동이 (피벗 이동 + 팔 길이 × 각도 변화)보다 POP(0.35m) 넘게 크다 — 기하가 카메라를 밀거나 당긴 것
//  boomNI  = 사용자 입력(거리 D) 없이 카메라 → 피벗 거리가 1cm 넘게 바뀐 프레임(지금은 0 이어야 한다)
//  occ     = 아바타 가림: 카메라 → 머리·가슴 두 선이 모두 지우지 못한 면에 막힘(occAny = 둘 중 하나)
//  flicker = 잘라내기(또는 예전 원뿔)가 켜졌다 꺼졌다 하는 한 구간이 0.3초보다 짧았던 횟수
//  fpF     = 1인칭 프레임(아바타가 안 보인다 — 예전 자동 1인칭), us = 카메라 계산(JS) 프레임당 마이크로초
// CLI: node tools/church_web/cam_sim.mjs [--old 옛cam_guard.js] [--only assisi,yeouido] [--json]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const Stations = require('../../assets/church/stations.js');
const Controls = require('../../assets/church/controls.js');

export const DT = 1 / 30;
export const POP = 0.35;
export const FLICK = 0.3;
const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

let loaded = null;
export function load(only) {
  if (!loaded) loaded = loadChurches(only ? { only } : {});
  return loaded;
}

// 성당 하나의 시험 환경: world.js 와 같은 가드(여러 층 층 값) + 걷기 논리. Guard = 지금 또는 예전 cam_guard
export function makeEnv(id, Guard) {
  const { churches, Logic } = load();
  const c = churches.find((x) => x.id === id);
  if (!c.__built) {
    if (c.ret && c.ret.group) c.ctx.root.add(c.ret.group);
    c.prepare().forEach((it) => c.ctx.root.add(it.batch.build(it.material, it.name, { spatial: true })));
    c.__built = true;
  }
  const L = c.__L || (c.__L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones }));
  const S = c.ctx._, B = c.layout.bounds, cb0 = S.cameraBounds || {};
  const cb = { x0: cb0.x0 ?? B.x0, x1: cb0.x1 ?? B.x1, z0: cb0.z0 ?? B.z0, z1: cb0.z1 ?? B.z1, yMax: cb0.yMax || 9, pitchMax: cb0.pitchMax, tight: cb0.tight };
  const sp = c.layout.spawn || { x: 0, z: 0 };
  const so = Guard.spaceOpts(L, c.layout, c.zones), multi = L.multi && so.levelLow !== undefined;
  if (multi) so.spaceTop = cb.yMax;
  const guard = Guard.build(c.ctx.root, { bounds: cb, yLow: (multi ? so.levelLow : (L.floorY(sp.x, sp.z) || 0)) + 1.05, see: false, ...so });
  const floorAt = (x, z, y) => (L.multi ? L.floorY(x, z, y) : (L.floorY(x, z) || 0));
  return { id, c, L, cb, guard, floorAt, St: Stations.create(L), Guard };
}

// 누르기 이동 경로를 main.js 와 같은 걷기(moveCircle·floorY)로 따라간 프레임 [{x,z,foot,yaw}]
export function walkFrames(env, from, to, speed = 1.4) {
  const { L, St } = env;
  const p = St.findPath(from, to);
  if (!p) return [];
  const me = { x: from.x, z: from.z, fy: env.floorAt(from.x, from.z, from.y || 0) }, w = St.startWalk(p, to, 'tap'), out = {}, fr = [];
  for (let t = 0; t < 120; t += DT) {
    St.stepWalk(w, me, DT, out);
    if (out.done) break;
    const sp = Math.hypot(out.vx, out.vz), k = sp > speed ? speed / sp : 1;
    const q = { x: me.x, z: me.z };
    L.moveCircle(q, out.vx * k * DT, out.vz * k * DT, undefined, L.multi ? me.fy : undefined);
    const ny = env.floorAt(q.x, q.z, me.fy);
    const yaw = Math.atan2(-(q.x - me.x), -(q.z - me.z));
    if (Math.hypot(q.x - me.x, q.z - me.z) > 1e-4) fr.push({ x: q.x, z: q.z, foot: ny, yaw });
    me.x = q.x; me.z = q.z; me.fy = ny;
  }
  return fr;
}

// 그 자리에 서서(1초) 화면을 끈다: 5초 동안 초당 1.4rad 로 돌리고(한 바퀴 넘게), 이어 2초 동안 위아래로 끌며 계속 돌린다.
// p0 = 기본 팔 각도(지금 FEEL.pitchDefault, 예전 0.45)
export function rotateFrames(pt, yaw0 = 0, p0 = Controls.FEEL.pitchDefault) {
  const fr = [];
  for (let i = 0; i < 30; i++) fr.push({ x: pt.x, z: pt.z, foot: pt.foot, camYaw: yaw0, pitch: p0, drag: false });
  for (let i = 0; i < 150; i++) fr.push({ x: pt.x, z: pt.z, foot: pt.foot, camYaw: yaw0 + i * DT * 1.4, pitch: p0, drag: true });
  for (let i = 0; i < 60; i++) fr.push({ x: pt.x, z: pt.z, foot: pt.foot, camYaw: yaw0 + (150 + i) * DT * 1.4, pitch: p0 + 0.45 * Math.sin(i / 60 * Math.PI), drag: true });
  return fr;
}

function newStats() { return { n: 0, tp: 0, jumps: 0, maxJump: 0, boomNI: 0, occ: 0, occAny: 0, flicker: 0, toggles: 0, fpF: 0, us: 0 }; }
// 켜짐/꺼짐 구간 기록: 한 구간(켜진 채·꺼진 채)이 FLICK 초보다 짧게 끝나면 깜빡임
function trackFlick(st, ch, on, t) {
  const c = st._ch || (st._ch = {});
  const s = c[ch] || (c[ch] = { on: false, t: -9, n: 0 });
  if (on !== s.on) { if (s.n > 0 && t - s.t < FLICK) { st.flicker++; if (process.env.CAMSIM_FL) console.log("flick", ch, on, t.toFixed(2), (t - s.t).toFixed(2)); } s.on = on; s.t = t; s.n++; st.toggles++; }
}
// 한 프레임 공통 지표: 튐·입력 없는 거리 변화
function motion(st, prev, cam, piv, yaw, pitch, D, avx, avy, avz) {
  if (prev.ok) {
    const mv = Math.hypot(cam.x - prev.cx, cam.y - prev.cy, cam.z - prev.cz);
    const ang = Math.hypot(wrap(yaw - prev.yaw) * Math.cos(pitch), pitch - prev.pitch);
    const expect = Math.hypot(avx - prev.ax, avy - prev.ay, avz - prev.az) + D * ang + Math.abs(D - prev.D);
    const ex = mv - expect;
    if (ex > st.maxJump) st.maxJump = ex;
    if (ex > POP) st.jumps++;
    const d = Math.hypot(cam.x - piv.x, cam.y - piv.y, cam.z - piv.z);
    if (Math.abs(D - prev.D) < 1e-6 && Math.abs(d - prev.d) > 0.01) st.boomNI++;
    prev.d = d;
  } else prev.d = Math.hypot(cam.x - piv.x, cam.y - piv.y, cam.z - piv.z);
  prev.cx = cam.x; prev.cy = cam.y; prev.cz = cam.z; prev.yaw = yaw; prev.pitch = pitch; prev.D = D; prev.ax = avx; prev.ay = avy; prev.az = avz; prev.ok = true;
}

// 지금: 피벗 스프링 + 사용자 팔 + createCut. frames: [{x,z,foot, yaw(걷는 방향, walk) | camYaw(끄는 방향, rotate), pitch?}]. opts: {Guard, D, mode('tp'|'fp'), keep}
export function simulate(env, frames, opts) {
  const { Guard } = opts, D = opts.D || Controls.FEEL.boomDist, g = env.guard;
  const fol = Controls.createFollow(), cut = Guard.createCut(), CO = {}, st = newStats(), prev = { ok: false }, cam = { x: 0, y: 0, z: 0 };
  let camYaw = frames.length ? (frames[0].camYaw ?? frames[0].yaw) : 0;
  const fp = opts.mode === 'fp' ? 1 : 0;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i], t = i * DT, fy = f.foot + 1.0;
    if (f.camYaw !== undefined) camYaw = f.camYaw; else camYaw += wrap(f.yaw - camYaw) * (1 - Math.exp(-DT * 1.2));   // 누르기 이동: followStep(walkSt) 과 같은 뒤로 맞추기
    const pitch = Math.max(0.06, Math.min(1.25, f.pitch ?? Controls.FEEL.pitchDefault));
    const t0 = process.hrtime.bigint();
    const pv = fol.step(f.x, fy, f.z, DT, i === 0);
    const cp = Math.cos(pitch);
    cam.x = pv.x + Math.sin(camYaw) * cp * D; cam.y = pv.y + Math.sin(pitch) * D; cam.z = pv.z + Math.cos(camYaw) * cp * D;
    if (fp) { cam.x = f.x; cam.y = f.foot + 1.6; cam.z = f.z; }
    cut.step({ guard: g, cx: cam.x, cy: cam.y, cz: cam.z, mx: pv.x, my: pv.y, mz: pv.z, hy: f.foot + 1.55, foot: f.foot, low: false, fp }, DT, CO);
    st.us += Number(process.hrtime.bigint() - t0) / 1000;
    st.n++;
    if (fp) { st.fpF++; continue; }
    st.tp++;
    motion(st, prev, cam, pv, camYaw, pitch, D, f.x, fy, f.z);
    const bh = cut.blocked(g, f.x, f.foot + 1.55, f.z), bc = cut.blocked(g, f.x, fy, f.z);
    if (bh && bc) { st.occ++; if (process.env.CAMSIM_OCC === env.id) { const hx = f.x, hy = f.foot + 1.55, hz = f.z; const tt = g.clip(cam.x, cam.y, cam.z, hx, hy, hz, 0, (tr0, th) => cut.amount(g, tr0, cam.x + (hx - cam.x) * th, cam.y + (hy - cam.y) * th, cam.z + (hz - cam.z) * th) >= 0.5); const tr = g.out.tri, P = tr >= 0 ? g.triPoint(tr, {}) : {}; console.log('occ', i, f.x.toFixed(1), f.z.toFixed(1), f.foot.toFixed(1), 'cam', cam.x.toFixed(1), cam.y.toFixed(1), cam.z.toFixed(1), 'hit', tt.toFixed(2), tr, tr >= 0 ? [g.isThin(tr), g.isFlat(tr), g.levelOf(tr).toFixed(1), P.x.toFixed(1), P.y.toFixed(1), P.z.toFixed(1)].join(' ') : '', 'k', Array.from(cut.k).map((v) => v.toFixed(2)).join(','), 'pd', cut.pd.toFixed(2), 'thr', cut.thr.toFixed(2)); } }
    if (bh || bc) st.occAny++;
    for (let k = 0; k < 6; k++) trackFlick(st, k, !!cut.on[k], t);
    if (opts.keep) (st.samples || (st.samples = [])).push({ t, x: cam.x, y: cam.y, z: cam.z, occ: bh && bc, k: Array.from(cut.k) });
  }
  delete st._ch;
  return st;
}

// 예전: 리그(스프링 암·자동 시점) → 자동 1인칭 → 카메라 놓기 + 원뿔 잘라내기(seeEase: 켜기 초당 10, 끄기 초당 4). 아바타 가림 = 원뿔 세기 < 0.5 인 면에 막힘
export function simulateOld(env, frames, opts) {
  const { Guard } = opts, cb = env.cb, D = opts.D || 7.2, g = env.guard;
  const rig = Guard.createRig(), O = {}, view = Guard.createView(), VO = {}, comp = Guard.createCompose(), CO = {}, st = newStats(), prev = { ok: false }, cam = { x: 0, y: 0, z: 0 };
  let camYaw = frames.length ? (frames[0].camYaw ?? frames[0].yaw) : 0, yawOff = 0, pitchAdj = 0, init = false, seeK = 0, seeW = 0;
  const ease = (cur, on) => { const v = cur + ((on ? 1 : 0) - cur) * Math.min(1, DT * (on ? 10 : 4)); return v < 0.003 ? 0 : v; };
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i], t = i * DT, mx = f.x, mz = f.z, fy = f.foot + 1.0;
    if (f.camYaw !== undefined) camYaw = f.camYaw + yawOff; else camYaw += wrap(f.yaw - camYaw) * (1 - Math.exp(-DT * 1.6));
    const pitch = Math.max(0.06, Math.min(1.25, (f.pitch ?? 0.45) + pitchAdj));
    const t0 = process.hrtime.bigint();
    rig.solve({ mx, fy, mz, yaw: camYaw, pitch, D, cb, guard: g, auto: true, minD: 2.8, drag: !!f.drag }, DT, O);
    if (O.baked) { yawOff += O.bakeYaw; pitchAdj = O.bakePitch - (f.pitch ?? 0.45); if (f.camYaw === undefined) camYaw += O.bakeYaw; }
    const cx = O.x, cy = Math.min(cb.yMax, Math.max(env.L.multi ? f.foot + 0.7 : 0.7, O.y)), cz = O.z;
    view.step({ guard: g, floorAt: env.floorAt, mx, mz, foot: f.foot, cb, boom: O.avail, rigFp: !!O.fpOn, mode: opts.mode || 'auto', block: false }, DT, VO);
    const fp = VO.f;
    comp.step({ mx, fy, mz, cx, cy, cz, ex: mx, ey: f.foot + 1.6, ez: mz, fp, cut: O.cut, init: !init }, DT, CO);
    cam.x = CO.x; cam.y = CO.y; cam.z = CO.z; init = true;
    // 예전 원뿔 잘라내기(main.js): 가슴·머리 → 카메라 선이 면을 지나면
    let occT = false, occW = false;
    if (fp < 0.5) {
      const t1 = g.clip(mx, fy, mz, cam.x, cam.y, cam.z, 0), th1 = g.out.thin, t2 = g.clip(mx, f.foot + 1.55, mz, cam.x, cam.y, cam.z, 0), th2 = g.out.thin;
      occW = t1 < 1 || t2 < 1; occT = occW || th1 < 1 || th2 < 1;
    }
    seeK = ease(seeK, occT); seeW = ease(seeW, occW);
    st.us += Number(process.hrtime.bigint() - t0) / 1000;
    st.n++;
    if (fp > 0.5) { st.fpF++; prev.ok = false; continue; }
    st.tp++;
    const piv = { x: CO.px ?? mx, y: CO.py ?? fy, z: CO.pz ?? mz };
    motion(st, prev, cam, piv, O.yaw, O.pitch, D, mx, fy, mz);
    // 머리·가슴 선이 원뿔 세기 < 0.5 인 면에 막혔나(원뿔 축 위라 세기 = seeK(가는 면)·seeW(넓은 면))
    const blocked = (py) => { const tt = g.clip(cam.x, cam.y, cam.z, mx, py, mz, 0), th = g.out.thin; return (tt < 1 && seeW < 0.5) || (th < 1 && seeK < 0.5); };
    const bh = blocked(f.foot + 1.55), bc = blocked(fy);
    if (bh && bc) st.occ++;
    if (bh || bc) st.occAny++;
    trackFlick(st, 0, occT, t); trackFlick(st, 1, occW, t);
  }
  delete st._ch;
  return st;
}

// 사용자가 「좁다」고 한 곳들(표본 자리). foot = 그 자리 바닥 높이(여러 층). 걷기 경로(walk)는 계단·통로를 지난다.
export function samplePlaces(env) {
  const id = env.id, pts = [], walks = [];
  const at = (x, z, y, tag) => { const foot = env.floorAt(x, z, y); if (!env.L.moveCircle({ x, z }, 0, 0, undefined, env.L.multi ? foot : undefined)) pts.push({ x, z, foot, tag }); };
  if (id === 'assisi') {
    const B = env.c.builder, C = B.crypt;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; at(C.x + Math.sin(a) * 2.25, C.z + Math.cos(a) * 2.25, 0, 'crypt'); }
    at(0, 0.8, 0, 'crypt'); at(1.0, 2.6, 0, 'crypt');
    const W = B.well, xm = (W.x0 + W.x1) / 2;
    for (let z = W.zBot + 0.5; z < W.zTop - 0.3; z += 1.4) { const y = (z - W.zBot) / (W.zTop - W.zBot) * B.heights.lower; at(xm, z, y + 0.3, 'crypt_stairs'); }
    const S = B.stair, sx = (S.x0 + S.x1) / 2;
    for (let z = S.z0 - 0.8; z > S.z1 + 0.8; z -= 2.4) { const y = B.heights.lower + (S.z0 - z) / (S.z0 - S.z1) * (B.heights.upper - B.heights.lower); at(sx, z, y + 0.3, 'lower_stairs'); }
    walks.push({ tag: 'crypt_stairs', from: { x: 0, z: 16, y: B.heights.lower }, to: { x: 0, z: 1.2, y: 0 } });
    walks.push({ tag: 'lower_stairs', from: { x: 0, z: 9, y: B.heights.lower }, to: { x: 7.4, z: -20.6, y: B.heights.upper } });
    at(0, 16, B.heights.upper, 'open_nave'); at(0, 20, B.heights.upper, 'open_nave');
  } else if (id === 'yeouido') {
    const B = env.c.builder, h = B.stairHall, Lf = B.loft;
    for (let deg = 70; deg >= -80; deg -= 25) {
      const x = h.cx + 0.85 * h.a * Math.cos(deg * Math.PI / 180), z = h.cz + 0.85 * h.b * Math.sin(deg * Math.PI / 180);
      const y = Lf.y * (78 - deg) / 168; at(x, z, y + 0.3, 'stairs');
    }
    for (const x of [-4, 0, 4]) for (const z of [13.5, 16.5, 19.5]) at(x, z, 0, 'under_loft');
    walks.push({ tag: 'stairs', from: { x: 0, z: 11, y: 0 }, to: { x: 7, z: 12.6, y: Lf.y } });
    walks.push({ tag: 'stairs', from: { x: 0, z: 11, y: 0 }, to: { x: -6.5, z: 25.6, y: B.floors.F1 } });
    at(0, 2, 0, 'open_nave'); at(0, -4, 0, 'open_nave');
  } else if (id === 'myeongdong') {
    for (const [x, z] of [[7.6, -20.4], [6.0, -19.0], [-7.6, -20.4], [-6.0, -19.0], [10, -12], [-10, -12], [8.3, 14], [-8.3, 4]]) at(x, z, 0, 'upper_aisle');
    walks.push({ tag: 'upper_aisle', from: { x: 7.6, z: 0 }, to: { x: 7.6, z: -20.4 } });
    at(0, 5, 0, 'open_nave'); at(0, 15, 0, 'open_nave');
  } else if (id === 'milan') {
    for (const [x, z] of [[0, -32.5], [-3.5, -30.5], [3.5, -30.5], [-6.5, -25], [6.5, -25]]) at(x, z, 0, 'ambulatory');
    walks.push({ tag: 'ambulatory', from: { x: -6.5, z: -25 }, to: { x: 6.5, z: -25 } });
    at(0, 0, 0, 'open_nave'); at(0, 10, 0, 'open_nave');
  } else if (id === 'stpaul') {
    for (const [x, z] of [[0, -24.5], [-14, -30.6], [-9.5, -30.6], [9.5, -30.6], [14, -30.6]]) at(x, z, 0, 'ambulatory');
    walks.push({ tag: 'ambulatory', from: { x: -15, z: -20 }, to: { x: 15, z: -20 } });
    at(0, 0, 0, 'open_nave'); at(0, 12, 0, 'open_nave');
  }
  return { pts, walks };
}

export const SAMPLE_CHURCHES = ['assisi', 'yeouido', 'myeongdong', 'milan', 'stpaul'];

// 모든 표본: 자리마다 네 방향에서 시작해 돌리기 + 걷기 경로. 꼬리표(tag)별로 합친다. opts.old = true 면 예전 흐름(opts.Guard 는 옛 cam_guard)
export function runSamples(Guard, opts = {}) {
  const out = {}, sim = opts.old ? simulateOld : simulate;
  const add = (tag, s) => {
    const o = out[tag] || (out[tag] = newStats());
    for (const k of Object.keys(o)) if (k !== 'maxJump') o[k] += s[k];
    o.maxJump = Math.max(o.maxJump, s.maxJump);
  };
  for (const id of opts.only || SAMPLE_CHURCHES) {
    const env = makeEnv(id, Guard), { pts, walks } = samplePlaces(env);
    const p0 = opts.old ? 0.45 : Controls.FEEL.pitchDefault;   // 그때의 기본 구도(예전 26°·7.2m)
    for (const p of pts) for (const y0 of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) add(id + ':' + p.tag, sim(env, rotateFrames(p, y0, p0), { ...opts, Guard }));
    for (const w of walks) { const fr = walkFrames(env, w.from, w.to); if (fr.length) add(id + ':' + w.tag + '(walk)', sim(env, fr, { ...opts, Guard })); }
  }
  return out;
}

export function total(res) {
  const t = newStats();
  for (const o of Object.values(res)) { for (const k of Object.keys(t)) if (k !== 'maxJump') t[k] += o[k]; t.maxJump = Math.max(t.maxJump, o.maxJump); }
  return t;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2), opt = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
  const old = !!opt('old'), gp = old ? path.resolve(opt('old')) : path.resolve(here, '../../assets/church/cam_guard.js');
  const Guard = require(gp);
  const res = runSamples(Guard, { old, mode: opt('mode'), only: opt('only') ? opt('only').split(',') : undefined });
  if (argv.includes('--json')) { console.log(JSON.stringify(res)); process.exit(0); }
  console.log((old ? '예전' : '지금') + ' (' + gp + ')');
  const row = (k, o) => console.log(k.padEnd(30), String(o.n).padStart(6), String(o.jumps).padStart(5), o.maxJump.toFixed(2).padStart(6), String(o.boomNI).padStart(6), String(o.occ).padStart(5), String(o.occAny).padStart(6), String(o.flicker).padStart(5), (o.fpF / o.n * 100).toFixed(1).padStart(6), (o.us / o.n).toFixed(0).padStart(5));
  console.log('표본'.padEnd(30), '프레임', '튐', '최대초과', '입력없는거리', '가림', '가림일부', '깜빡', '1인칭%', 'µs/f');
  for (const [k, o] of Object.entries(res)) row(k, o);
  row('합', total(res));
}
