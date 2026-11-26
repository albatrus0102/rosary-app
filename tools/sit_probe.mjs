// 앉기 재기(실제 페이지, 그리기는 끄고 로직·아바타만 60Hz): 좌석마다 3m 떨어진 곳에서 sit({i}) → 걸어가기·돌아서기·내려앉기 → 앉음 → 일어서기.
// 0.2초마다 루트·골반 관절·무릎·발목 세계 좌표를 적고, 판정: 골반 관절 - 앉는 면(0.085 ± 0.03), 발목이 바닥/발 받침 위(± 0.04),
// 순간 이동 없음(한 프레임 0.15 m 넘게 옮기지 않음), 앉는 중 골반이 등받이 면을 넘지 않음, 앉은 시간까지의 걸린 시간.
// 사용: node tools/sit_probe.mjs [--json out.json] [--seats 0,3,4]   → 표 + 실패 수(종료 코드 1)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { serve } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SEATS = opt('--seats', '0,1,2,3,4,5').split(',').map(Number);
const { srv, url } = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 320, height: 180 }, deviceScaleFactor: 1 });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(url + 'test.html?hideui=1&autotier=0&quiet=1&quality=low&markers=0');
await p.waitForFunction(() => window.__room && window.__room.world && window.__room.me, null, { timeout: 90000 });
const res = await p.evaluate(async (SEATS) => {
  const A = window.__room, T = window.THREE, v = new T.Vector3(), av = A.meAv, me = A.me, L = A.logic, lay = A.world.layout;
  A.R.render = function () { return null; };   // 그리기 끔(로직·아바타 update 는 그대로)
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = [];
  for (const i of SEATS) {
    const s = lay.seats[i], id = L.seatAt(i), st = L.standPos(id);
    // 시작: 서는 자리에서 2.5m 쯤 떨어진, 갈 수 있는 곳(좌석 앞 방향 + 옆)
    const cands = [[2.5, 0], [0, 2.5], [-2.5, 0], [0, -2.5], [1.8, 1.8], [-1.8, 1.8], [1.8, -1.8], [-1.8, -1.8]];
    let sx = st.x, sz = st.z;
    for (const c of cands) { const q = { x: st.x + c[0], z: st.z + c[1] }; if (!L.moveCircle({ x: q.x, z: q.z }, 0, 0) && A.stations.findPath(q, st)) { sx = q.x; sz = q.z; break; } }
    if (me.mode !== 'walk') { window.Room3D.stand(); await wait(2500); }
    me.x = sx; me.z = sz; me.fy = me.y = L.floorY(sx, sz); av.setPose(me.x, me.y, me.z, me.yaw); av.snapPose();
    await wait(300);
    const rec = []; let t = 0, lastX = me.x, lastZ = me.z, maxJump = 0;
    const orig = av.update;
    av.update = function (dt, tt) {
      orig.call(this, dt, tt); t += dt;
      const j = Math.hypot(me.x - lastX, me.z - lastZ); if (j > maxJump) maxJump = j; lastX = me.x; lastZ = me.z;
      if (!rec.length || t - rec[rec.length - 1].t >= 0.2) {
        this.root.updateMatrixWorld(true);
        const w = (k) => { this.bones[k].getWorldPosition(v); return [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)]; };
        rec.push({ t: +t.toFixed(2), mode: me.mode, sa: +this.sitAmt.toFixed(2), root: [+me.x.toFixed(3), +me.y.toFixed(3), +me.z.toFixed(3)], yaw: +me.yaw.toFixed(2), hipL: w(12), hipR: w(15), kneeL: w(13), ftL: w(14), ftR: w(17) });
      }
    };
    window.Room3D.sit({ i });
    let satT = -1;
    for (let k = 0; k < 400 && satT < 0; k++) { await wait(50); if (me.mode === 'seated') satT = t; }
    await wait(400);
    const seated = rec[rec.length - 1];
    const so = A.world.seatOffset(id);
    window.Room3D.stand();
    let stoodT = -1; const t0 = t;
    for (let k = 0; k < 100 && stoodT < 0; k++) { await wait(50); if (me.mode === 'walk') stoodT = t - t0; }
    av.update = orig;
    // 등받이 면: 의자 0~2 = 등받이 앞면 x -1.55 + 0.225, 그네 = 등 쿠션 앞면(눌린 뒤) z -2.5 - 0.2. 골반 관절 뒤 0.11 m 가 엉덩이 뒤끝
    const back = i <= 2 ? { nx: 1, nz: 0, d: -1.55 + 0.225 } : (i >= 4 ? { nx: 0, nz: -1, d: -(-2.5 - 0.2) } : null);
    let backPen = 0;
    for (const r of rec) { if (!back || r.sa < 0.05) continue; for (const h of [r.hipL, r.hipR]) { const pen = h[0] * back.nx + h[2] * back.nz - back.d + 0.11; if (pen > backPen) backPen = pen; } }
    const hipY = (seated.hipL[1] + seated.hipR[1]) / 2 - (so ? so.y : 0), foot = Math.min(seated.ftL[1], seated.ftR[1]) - (so ? so.y : 0);
    out.push({ i, start: [+sx.toFixed(2), +sz.toFixed(2)], satT: +satT.toFixed(2), stoodT: +stoodT.toFixed(2), maxJump: +maxJump.toFixed(3), hipOverTop: +(hipY - s.top).toFixed(3), ankleOverFoot: +(foot - L.seatFloor(id) - 0.08).toFixed(3), backPen: +backPen.toFixed(3), rec });
  }
  return out;
}, SEATS);
let fail = 0;
console.log('좌석 | 앉기까지(s) | 일어서기(s) | 최대 한 프레임 이동(m) | 골반관절-앉는면(m) | 발목-발판(m) | 등받이 넘음(m)');
for (const r of res) {
  const bad = [];
  if (r.satT < 0) bad.push('앉지 못함');
  if (r.maxJump > 0.15) bad.push('순간 이동');
  if (Math.abs(r.hipOverTop - 0.085) > 0.03) bad.push('골반 높이');
  if (Math.abs(r.ankleOverFoot) > 0.04) bad.push('발 높이');
  if (r.backPen > 0.02) bad.push('등받이');
  if (bad.length) fail++;
  console.log([r.i, r.satT, r.stoodT, r.maxJump, r.hipOverTop, r.ankleOverFoot, r.backPen, bad.join(',') || 'OK'].join(' | '));
}
if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(res, null, 1));
if (errs.length) { console.log('ERRORS', errs.slice(0, 5)); fail++; }
await b.close(); srv.close();
process.exit(fail ? 1 : 0);
