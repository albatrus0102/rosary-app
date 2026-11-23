// 카메라 표본 시뮬레이터(docs/church/CAMERA_MODES.md): 성당 메시·카메라 가드를 Node 에서 짓고, main.js updateCamera 와 같은 순서로
// 리그(cam_guard createRig) → 시점 모드(createView: 좁으면 자동 1인칭) → 카메라 놓기(composeCam)를 매 프레임 돌린다.
// 시나리오: (1) 그 자리에 서서 화면을 끌어 한 바퀴 넘게 돌리고 위아래로도 끈다(rotate) (2) 계단·통로를 걸으며 뒤에서 따라간다(walk).
// 지표: 카메라가 면 안(가까운 면까지 near 평면보다 가깝다) · 튐(한 프레임 거리 변화 > POP) · 되튐(튐 뒤 0.6초 안에 반대쪽 튐) · 1인칭 비율.
// legacy=true 면 예전 main.js(직교 좌표 7/s 따라가기 + 벽 속이면 곧장 목표로 + rig.fp 만) — 고치기 전 숫자를 같은 자로 잰다.
// CLI: node tools/church_web/cam_sim.mjs [--guard 옛cam_guard.js] [--legacy] [--json]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const Stations = require('../../assets/church/stations.js');

export const DT = 1 / 30;
export const POP = 0.35;   // 한 프레임(1/30초)에 카메라 → 아바타 거리가 이보다 많이 바뀌면 '튐'(초당 10.5m)
const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

let loaded = null;
export function load(only) {
  if (!loaded) loaded = loadChurches(only ? { only } : {});
  return loaded;
}

// 성당 하나의 시험 환경: world.js 와 같은 카메라 가드(공간 복셀·여러 층) + 면 탐침(모든 면) + 걷기 논리
export function makeEnv(id, Guard) {
  const { churches, Logic } = load();
  const c = churches.find((x) => x.id === id);
  if (!c.__built) {
    if (c.ret && c.ret.group) c.ctx.root.add(c.ret.group);
    c.prepare().forEach((it) => c.ctx.root.add(it.batch.build(it.material, it.name, { spatial: true })));
    c.__built = true;
  }
  const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones });
  const S = c.ctx._, B = c.layout.bounds, cb0 = S.cameraBounds || {};
  const cb = { x0: cb0.x0 ?? B.x0, x1: cb0.x1 ?? B.x1, z0: cb0.z0 ?? B.z0, z1: cb0.z1 ?? B.z1, yMax: cb0.yMax || 9, pitchMax: cb0.pitchMax, tight: cb0.tight };
  const sp = c.layout.spawn || { x: 0, z: 0 };
  const so = Guard.spaceOpts(L, c.layout, c.zones), multi = L.multi && so.levelLow !== undefined;
  if (multi) so.spaceTop = cb.yMax;
  const guard = Guard.build(c.ctx.root, { bounds: cb, yLow: (multi ? so.levelLow : (L.floorY(sp.x, sp.z) || 0)) + 1.05, see: false, ...so });
  const probe = Guard.build(c.ctx.root, { bounds: { x0: cb.x0 - 20, x1: cb.x1 + 20, z0: cb.z0 - 20, z1: cb.z1 + 20 }, minArea: 0, see: false, space: false });
  const floorAt = (x, z, y) => (L.multi ? L.floorY(x, z, y) : (L.floorY(x, z) || 0));
  return { id, c, L, cb, guard, probe, floorAt, St: Stations.create(L) };
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
export function rotateFrames(pt, yaw0 = 0) {
  const fr = [];
  for (let i = 0; i < 30; i++) fr.push({ x: pt.x, z: pt.z, foot: pt.foot, camYaw: yaw0, pitch: 0.45, drag: false });
  for (let i = 0; i < 150; i++) fr.push({ x: pt.x, z: pt.z, foot: pt.foot, camYaw: yaw0 + i * DT * 1.4, pitch: 0.45, drag: true });
  for (let i = 0; i < 60; i++) fr.push({ x: pt.x, z: pt.z, foot: pt.foot, camYaw: yaw0 + (150 + i) * DT * 1.4, pitch: 0.45 + 0.45 * Math.sin(i / 60 * Math.PI), drag: true });
  return fr;
}

// 면에 가까움(카메라 near 평면보다 가까운 면이 6방향 중 하나라도) = 화면에 벽 속·면 단면이 보인다
function inside(probe, x, y, z, r) {
  return probe.clip(x, y, z, x + r, y, z, 0) < 1 || probe.clip(x, y, z, x - r, y, z, 0) < 1 || probe.clip(x, y, z, x, y, z + r, 0) < 1 ||
    probe.clip(x, y, z, x, y, z - r, 0) < 1 || probe.clip(x, y, z, x, y + r, z, 0) < 1 || probe.clip(x, y, z, x, y - r, z, 0) < 1;
}

// frames: [{x,z,foot, yaw(걷는 방향, walk) | camYaw(끄는 방향, rotate), pitch?, drag?}]. opts: {Guard, legacy, mode('auto'|'fp'|'tp'), D}
export function simulate(env, frames, opts) {
  const { Guard } = opts, legacy = !!opts.legacy, cb = env.cb, D = opts.D || 7.2;
  const rig = Guard.createRig(), O = {}, view = !legacy && Guard.createView ? Guard.createView() : null, VO = {}, comp = !legacy && Guard.createCompose ? Guard.createCompose() : null, CO = {};
  const pos = { x: 0, y: 0, z: 0 };
  let init = false, camYaw = frames.length ? (frames[0].camYaw ?? frames[0].yaw) : 0, prevD = -1, prevFp = 0;
  const st = { n: 0, tp: 0, inside: 0, pops: 0, rebounds: 0, fpF: 0, flips: 0, maxJump: 0, lastPopT: -9, lastPopDir: 0, fpOn: false, fpOnT: [], trans: 0, cuts: 0, samples: [] };
  let pitch = 0.45, yawOff = 0, pitchAdj = 0;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i], t = i * DT, mx = f.x, mz = f.z, fy = f.foot + 1.0;
    if (f.camYaw !== undefined) camYaw = f.camYaw + yawOff; else camYaw += wrap(f.yaw - camYaw) * (1 - Math.exp(-DT * 1.6));
    pitch = Math.max(0.06, Math.min(1.25, (f.pitch ?? 0.45) + pitchAdj));
    const I = { mx, fy, mz, yaw: camYaw, pitch, D, cb, guard: env.guard, auto: true, minD: 2.8, drag: !!f.drag, foot: f.foot };
    rig.solve(I, DT, O);
    if (O.baked && !legacy) { yawOff += O.bakeYaw; pitchAdj = O.bakePitch - (f.pitch ?? 0.45); if (f.camYaw === undefined) camYaw += O.bakeYaw; }   // main.js: 끌기 시작 = 리그 각도를 사용자 각도로
    let cx = O.x, cy = Math.min(cb.yMax, Math.max(env.L.multi ? f.foot + 0.7 : 0.7, O.y)), cz = O.z, fp = O.fp || 0, near = 0.3;
    const dx = Math.sin(O.yaw), dz = Math.cos(O.yaw);
    const ex = mx, ey = f.foot + 1.6, ez = mz;
    if (view) {
      view.step({ guard: env.guard, floorAt: env.floorAt, mx, mz, foot: f.foot, cb, boom: O.avail, rigFp: !!O.fpOn, mode: opts.mode || 'auto', block: false }, DT, VO);
      fp = VO.f;
      comp.step({ mx, fy, mz, cx, cy, cz, ex, ey, ez, fp, yaw: O.yaw, cut: O.cut, rig, auto: true, init: !init }, DT, CO);
      pos.x = CO.x; pos.y = CO.y; pos.z = CO.z; init = true;
      near = fp > 0.5 ? 0.1 : 0.3;
    } else {
      if (fp > 0) { const fdx = -dx, fdz = -dz, e2x = mx + fdx * 0.15, e2z = mz + fdz * 0.15; cx += (e2x - cx) * fp; cy += (ey - cy) * fp; cz += (e2z - cz) * fp; }
      if (!init || O.cut) { pos.x = cx; pos.y = cy; pos.z = cz; init = true; }
      const kp = 1 - Math.exp(-DT * (fp > 0 ? 12 : 7));
      pos.x += (cx - pos.x) * kp; pos.y += (cy - pos.y) * kp; pos.z += (cz - pos.z) * kp;
      if (fp < 0.5 && !rig.ok(pos.x, pos.y, pos.z) && rig.ok(cx, cy, cz)) { pos.x = cx; pos.y = cy; pos.z = cz; }
    }
    st.n++;
    const isFp = fp > 0.5;
    if (isFp) st.fpF++;
    if (isFp !== st.fpOn) { st.fpOn = isFp; st.flips++; st.fpOnT.push(t); }
    const moving = Math.abs(fp - prevFp) > 1e-4;   // 1인칭 ↔ 3인칭 전환 중(부드럽게 옮기는 중): 튐에서 빼고 따로 센다
    prevFp = fp;
    if (inside(env.probe, pos.x, pos.y, pos.z, near)) { st.inside++; if (process.env.CAMSIM_IN && env.id === process.env.CAMSIM_IN) console.log('in', i, mx.toFixed(2), mz.toFixed(2), f.foot.toFixed(2), 'cam', pos.x.toFixed(2), pos.y.toFixed(2), pos.z.toFixed(2), 'fp', fp.toFixed(2), 'rig', O.dist.toFixed(2), 'pe', O.pitch.toFixed(2)); }
    const d = Math.hypot(pos.x - mx, pos.y - fy, pos.z - mz);
    if (O.cut) st.cuts++;
    if (!isFp && !moving && !O.cut) {
      st.tp++;
      if (prevD >= 0) {
        const dd = d - prevD, a = Math.abs(dd);
        if (a > st.maxJump) st.maxJump = a;
        if (a > POP) {
          st.pops++;
          if (process.env.CAMSIM_DBG && env.id === process.env.CAMSIM_DBG) console.log('pop', i, mx.toFixed(2), mz.toFixed(2), 'd', prevD.toFixed(2), '->', d.toFixed(2), 'rig', O.dist.toFixed(2), 'tg', (O.tg || 0).toFixed(2), 'opt', O.opt, 'pe', O.pitch.toFixed(2), 'cut', O.cut, 'yaw', (O.yaw % 6.283).toFixed(2), 'fp', fp.toFixed(2), 'drag', !!f.drag);
          const dir = Math.sign(dd);
          if (t - st.lastPopT < 0.6 && dir !== st.lastPopDir) st.rebounds++;
          st.lastPopT = t; st.lastPopDir = dir;
        }
      }
      prevD = d;
    } else { prevD = -1; if (moving) st.trans++; }
    if (opts.keep) st.samples.push({ t, x: pos.x, y: pos.y, z: pos.z, d, fp });
  }
  // 1인칭 ↔ 3인칭이 1초 안에 다시 바뀐 횟수(왔다 갔다)
  let ff = 0; for (let k = 1; k < st.fpOnT.length; k++) if (st.fpOnT[k] - st.fpOnT[k - 1] < 1.0) ff++;
  st.flipFlop = ff;
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

// 모든 표본: 자리마다 네 방향에서 시작해 돌리기 + 걷기 경로. 꼬리표(tag)별로 합친다.
export function runSamples(Guard, opts = {}) {
  const out = {};
  const add = (tag, s) => {
    const o = out[tag] || (out[tag] = { n: 0, tp: 0, inside: 0, pops: 0, rebounds: 0, fpF: 0, flipFlop: 0, maxJump: 0, trans: 0, cuts: 0 });
    for (const k of ['n', 'tp', 'inside', 'pops', 'rebounds', 'fpF', 'flipFlop', 'trans', 'cuts']) o[k] += s[k];
    o.maxJump = Math.max(o.maxJump, s.maxJump);
  };
  for (const id of opts.only || SAMPLE_CHURCHES) {
    const env = makeEnv(id, Guard), { pts, walks } = samplePlaces(env);
    for (const p of pts) for (const y0 of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) add(id + ':' + p.tag, simulate(env, rotateFrames(p, y0), { ...opts, Guard }));
    for (const w of walks) { const fr = walkFrames(env, w.from, w.to); if (fr.length) add(id + ':' + w.tag + '(walk)', simulate(env, fr, { ...opts, Guard })); }
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2), opt = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
  const gp = opt('guard') ? path.resolve(opt('guard')) : path.resolve(here, '../../assets/church/cam_guard.js');
  const Guard = require(gp);
  const legacy = argv.includes('--legacy') || !Guard.createView;
  const res = runSamples(Guard, { legacy, mode: opt('mode') || 'auto', only: opt('only') ? opt('only').split(',') : undefined });
  if (argv.includes('--json')) { console.log(JSON.stringify(res)); process.exit(0); }
  console.log((legacy ? '예전' : '지금') + ' (' + gp + ')');
  console.log('표본'.padEnd(34), '프레임', '면안', '튐', '되튐', '최대튐', '1인칭%', '왔다갔다');
  const tot = { n: 0, inside: 0, pops: 0, rebounds: 0, fpF: 0, flipFlop: 0 };
  for (const [k, o] of Object.entries(res)) {
    console.log(k.padEnd(34), String(o.n).padStart(5), String(o.inside).padStart(5), String(o.pops).padStart(4), String(o.rebounds).padStart(4), o.maxJump.toFixed(2).padStart(6), (o.fpF / o.n * 100).toFixed(1).padStart(6), String(o.flipFlop).padStart(5));
    for (const kk of Object.keys(tot)) tot[kk] += o[kk];
  }
  console.log('합'.padEnd(34), String(tot.n).padStart(5), String(tot.inside).padStart(5), String(tot.pops).padStart(4), String(tot.rebounds).padStart(4), ''.padStart(6), (tot.fpF / tot.n * 100).toFixed(1).padStart(6), String(tot.flipFlop).padStart(5));
}
