// 여의도동성당(ch_yeouido.js) 전용 시험: 설계서(docs/church/interiors/yeouido.md §6)의 좌표가 실제 빌더에서 그대로 나오는지.
//  좌석 162 · 걷기(입구 → 제대 앞·성모상 앞·14처·좌석, 누르기 이동으로 끝까지 걸어감) · 제단 출입 금지 구역 · 후진 바깥·뒷벽 막힘 ·
//  14처 14곳(1처 = 왼쪽 벽 제대 쪽, 높은 창과 겹치지 않음, 푸겔 연작) · 전례 장식 12상태 · 성능 예산 상한 · 권리 지킴(사진·작품 모사 없음).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');

const here = path.dirname(fileURLToPath(import.meta.url));
const { churches, Kit, WayCross, Liturgy, CrossData } = loadChurches();
const c = churches.find((x) => x.id === 'yeouido');
const lay = c.layout, B = lay.bounds;
const L = Logic.create(lay, { colliders: c.colliders, zones: c.zones }), S = Stations.create(L), rv = L.reverence;
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const free = (x, z) => { const p = { x, z }; return !L.moveCircle(p, 0, 0); };

// 누르기 이동(stations 경로 + 걷기 물리 moveCircle, main.js 와 같은 걷기)으로 끝까지 걸어 본다(ambulatory.test.mjs 와 같은 방식)
function walkTo(from, to) {
  const p = S.findPath(from, to);
  if (!p) return { ok: false, pts: [], end: null };
  const me = { x: from.x, z: from.z, vx: 0, vz: 0 }, w = S.startWalk(p, to, 'tap'), out = {}, m = { x: 0, z: 0 }, pts = [];
  for (let t = 0; t < 240; t += 1 / 30) {
    S.stepWalk(w, me, 1 / 30, out);
    if (out.done) break;
    m.x = me.x; m.z = me.z; L.moveCircle(m, out.vx / 30, out.vz / 30); me.x = m.x; me.z = m.z;
    pts.push({ x: me.x, z: me.z });
  }
  return { ok: Math.hypot(me.x - to.x, me.z - to.z) < 0.7, pts, end: me };
}

test('yeouido: 레이아웃 — 162석, 경계, 입구 스폰(정문 안쪽, 성가대석 아래 앞)', () => {
  assert.equal(lay.id, 'yeouido'); assert.equal(lay.scalePercent, 100);
  assert.deepEqual({ ...B }, { x0: -11, x1: 11, z0: -15.5, z1: 21 });
  assert.deepEqual([lay.spawn.x, lay.spawn.z, lay.spawn.r], [0, 16.5, 0]);
  assert.equal(L.seats.length, 162);
  for (const g of ['L', 'R']) assert.equal(L.seats.filter((s) => s.g === g).length, 81);
  const zs = [...new Set(L.seats.map((s) => +s.z.toFixed(2)))].sort((a, b) => a - b);
  assert.deepEqual(zs, [-3.2, -1.3, 0.6, 2.5, 4.4, 6.3, 8.2, 10.1, 12.0]);
  for (const s of L.seats) {
    assert.ok(s.x > B.x0 && s.x < B.x1 && s.z > B.z0 && s.z < B.z1, s.id);
    assert.ok(/^[LR]\d\d-\d+$/.test(s.id), s.id);
    const sp = L.standPos(s.id);
    assert.ok(S.isReachable(sp.x, sp.z), s.id + ' 닿지 않음');
  }
  assert.equal(lay.candles.stands.length, 1, '봉헌초 = 성모상 앞 받침 하나(shrine.js)');
  assert.ok(lay.candles.stands[0].shrine);
});

test('yeouido: 걷기 — 입구에서 제대 앞·성모상 앞·옆 통로 앞까지 걸어서 가고, 후진 바깥·뒷벽·제대는 막힌다', () => {
  assert.ok(free(lay.spawn.x, lay.spawn.z), '스폰');
  const st = S.stations();
  // 입구 → 제대 앞 / 성모상 앞 / 양쪽 옆 통로 제단 쪽 끝 / 맨 앞줄 끝: 누르기 이동으로 끝까지 걸어간다
  const goals = [[st.altar.x, st.altar.z, '제대 앞'], [st.candle[0].x, st.candle[0].z, '성모상 앞'], [-9.5, -7.5, '왼쪽 제단 옆(정면 큰 창 앞)'], [9.5, -7.5, '오른쪽 제단 옆'], [-9.6, 18.5, '왼쪽 뒤 구석(성가대석 아래)']];
  for (const [x, z, what] of goals) {
    assert.ok(S.isReachable(x, z), what + ' 에 닿지 않는다');
    const r = walkTo(lay.spawn, { x, z });
    assert.ok(r.ok, `입구에서 ${what} 까지 걸어가지 못한다(끝 ${r.end ? r.end.x.toFixed(2) + ',' + r.end.z.toFixed(2) : '경로 없음'})`);
    assert.ok(r.pts.every((q) => !rv.inZone(q.x, q.z, 0)), what + ' 가는 길이 제단 금지 구역을 지난다');
  }
  // 왼쪽 → 오른쪽 옆 통로: 맨 앞(제단 계단 앞)과 맨 뒤(정문 앞) 두 길로 건넌다
  for (const [from, to] of [[{ x: -9.5, z: -4.5 }, { x: 9.5, z: -4.5 }], [{ x: -9.5, z: 15 }, { x: 9.5, z: 15 }]]) assert.ok(walkTo(from, to).ok, `${from.x},${from.z} → ${to.x},${to.z}`);
  // 막힌 곳: 뒷벽(입구 문은 닫힘 — 밖으로 나가지 않는다), 후진 바깥 모서리, 정면 벽 뒤, 제대·감실·독서대·성수대
  for (const [x, z, what] of [[0, 21.2, '뒷벽'], [-7, -12, '왼쪽 후진 바깥'], [7, -12, '오른쪽 후진 바깥'], [-5.2, -14.8, '후진 원 밖'], [0, -8.4, '제대'], [0, -12.7, '감실'], [-3.8, -7.6, '독서대'], [-2.4, 20.45, '성수대']]) assert.ok(!free(x, z), what);
  for (const [x, z] of [[-6.5, -11], [6.5, -11], [-5.2, -14.8]]) assert.ok(!S.isReachable(x, z), `${x},${z} 에 닿는다`);
  // 제단 높이 0.6(3단), 신자석 홀은 0
  assert.ok(near(L.floorY(0, -8.0), 0.6)); assert.ok(near(L.floorY(0, -4.0), 0));
  const y = L.floorY(0, -6.0); assert.ok(y > 0.1 && y < 0.6, '계단 단 ' + y);
  assert.ok(c.colliders.length <= 60, '충돌체 ' + c.colliders.length);
});

test('yeouido: 제단 출입 금지 구역 — 제단·후진(제대·감실·십자가)은 막고, 제대 앞 자리는 첫 계단 앞', () => {
  assert.ok(rv && rv.zone, '구역');
  for (const [x, z, what] of [[0, -8.4, '제대'], [0, -12.7, '감실'], [-3.8, -7.6, '독서대'], [3.4, -10.4, '사제석'], [0, -14.8, '후진 끝'], [-6.8, -8, '제단 왼쪽 끝']]) assert.ok(rv.inZone(x, z, 0) || !free(x, z), `${what} (${x},${z}) 가 구역 밖`);
  const st = S.stations();
  assert.equal(st.altar.how, 'axis');
  assert.ok(near(st.altar.x, 0), JSON.stringify(st.altar));
  assert.ok(st.altar.z > -5.4 && st.altar.z < -3.9, '제대 앞 자리 z ' + st.altar.z + '(첫 계단 -5.4 앞, 맨 앞줄 -3.8 뒤)');
  assert.ok(near(L.floorY(st.altar.x, st.altar.z), 0), '제대 앞 자리는 신자석 바닥 높이');
  assert.ok(!rv.inZone(st.altar.x, st.altar.z, 0.2));
  // 제단 양옆(정면 큰 창 앞, |x| > 7.5)은 신자가 걷는 곳
  for (const x of [-9.5, 9.5]) assert.ok(!rv.inZone(x, -8, 0.3), '제단 옆 ' + x);
});

test('yeouido: 스테이션 — 봉헌초 = 오른쪽 벽 입구 쪽 성모상 앞(Meshy 3D 성모상), 성수대 기도 자리는 없다', () => {
  const st = S.stations();
  assert.equal(st.candle.length, 1);
  const k = st.candle[0];
  assert.ok(k.shrine && k.x > 8.6 && k.x < 9.6 && near(k.z, 14.5, 0.3), JSON.stringify(k));
  assert.ok(S.free(k.x, k.z) && S.isReachable(k.x, k.z));
  assert.notEqual(L.nearestCandleSlot(k.x, k.z, null), null);
  assert.equal(L.slots.length, 14);
  assert.equal(st.font.length, 0);
  const P = require('../../assets/church/shrine_places.js').yeouido;
  assert.equal(P.kind, 'mary'); assert.equal(P.mesh, 'mary_meshy'); assert.equal(P.yaw, 270);
  assert.ok(!free(10.7, 14.5), '성상 받침');
});

test('yeouido: 십자가의 길 14곳 — 1처 = 왼쪽 벽 제대 쪽, 14처 = 오른쪽 벽 제대 쪽, 높은 창 아래, 푸겔 연작(우리 본당과 공유)', () => {
  const r = WayCross.derive({ layout: lay, logic: L, stations: S, walls: c.walls, windows: c.windows, roses: c.roses, glassSlots: c.glassSlots });
  assert.equal(r.why, 'ok');
  assert.equal(r.plaques.length, 14);
  r.plaques.forEach((p, i) => {
    const left = i < 7;
    assert.equal(p.side, left ? 'L' : 'R', p.n + '처 벽');
    assert.ok(near(Math.abs(p.x), 10.93, 0.05), p.n + '처 x ' + p.x);
    assert.ok(p.z > -6 && p.z < 14, p.n + '처 z ' + p.z);
    assert.ok(S.free(p.stand.x, p.stand.z) && S.isReachable(p.stand.x, p.stand.z), p.n + '처 서는 자리');
  });
  // 1처가 제대 쪽: 왼쪽 벽 z 가 입구 쪽으로 커진다
  const lz = r.plaques.slice(0, 7).map((p) => p.z);
  assert.ok(lz.every((z, i) => i === 0 || z > lz[i - 1]), '왼쪽 1→7처가 제대 쪽에서 입구 쪽으로');
  // 판 위 끝(약 2.9m)이 옆벽 창 아래 끝(창턱 3.6m)보다 낮다
  for (const w of c.windows.filter((q) => Math.abs(q.x) > 10)) assert.ok(w.y >= 3.5, '옆벽 창턱 ' + w.y);
  assert.equal(lay.crossWay.start, 'L');
  assert.equal(CrossData.series.churches.yeouido, 'fugel');
});

test('yeouido: 창 14(옆벽 6 × 2 + 정면 큰 창 2), 무늬 없는 옅은 빛 유리 — 사진 창·장미창·빛줄기 없음, 작품 모사 없음', () => {
  assert.equal(c.windows.length, 14);
  for (const s of [-1, 1]) {
    const ws = c.windows.filter((w) => Math.sign(w.x) === s && Math.abs(w.x) > 10);
    assert.equal(ws.length, 6);
    assert.deepEqual([...ws.map((w) => w.z)], [...c.builder.sideWindows]);
    for (const w of ws) assert.ok(w.F.nx === -s && w.beam === false && !w.photo && w.pattern === 'grid');
  }
  const front = c.windows.filter((w) => near(w.z, -10));
  assert.equal(front.length, 2);
  // 유리 색은 모두 옅은 무채색(채도 낮음): 실제 유리화의 색·그림을 옮기지 않는다
  for (const w of c.windows) for (const col of w.colors) {
    const r = (col >> 16) & 255, g = (col >> 8) & 255, b = col & 255;
    assert.ok(Math.max(r, g, b) - Math.min(r, g, b) < 50 && Math.min(r, g, b) > 180, '옅은 빛 유리 ' + col.toString(16));
  }
  assert.equal(c.roses.length, 0); assert.equal(c.glassSlots.length, 0);
  assert.equal(c.ctx._.beams.length, 0);
  const src = fs.readFileSync(path.resolve(here, '../../assets/church/ch_yeouido.js'), 'utf8');
  assert.ok(!/https?:\/\//.test(src) && !/loadTexture|glassPhoto|glassSlot\(|statue\(|statueNiche/.test(src), '사진·외부 그림·성상 도형을 쓰지 않는다');
  assert.ok(!fs.existsSync(path.resolve(here, '../../assets/church/tex_pack_yeouido.js')), '전용 사진 묶음 없음(절차 생성)');
});

test('yeouido: 전례 장식 — 상태 12개가 제단 위 자리에 놓이고 스테이션·14처를 바꾸지 않는다', () => {
  const P = Liturgy.PLACES.yeouido;
  assert.deepEqual([P.altar.x, P.altar.z, P.altar.y], [0, -8.4, 0.6]);
  const STATES = {
    advent1: { season: 'advent', color: 'violet', week: 1 }, advent3: { season: 'advent', color: 'rose', week: 3 }, advent4: { season: 'advent', color: 'violet', week: 4 },
    christmas: { season: 'christmas', color: 'white', feast: 'christmas' }, lent: { season: 'lent', color: 'violet' }, laetare: { season: 'lent', color: 'rose', week: 4 },
    goodfriday: { season: 'triduum', color: 'red', feast: 'goodFriday' }, easter: { season: 'easter', color: 'white', feast: 'easter' }, pentecost: { season: 'easter', color: 'red', feast: 'pentecost' },
    ordinary: { season: 'ordinary', color: 'green' }, souls: { season: 'ordinary', color: 'violet', memorial: true }, allsaints: { season: 'ordinary', color: 'white', memorial: true, feast: 'allSaints' }
  };
  const st = S.stations();
  for (const n of Object.keys(STATES)) {
    const pl = Liturgy.plan('yeouido', STATES[n]);
    assert.ok(pl.items.length >= 1, n);
    for (const it of pl.items) {
      assert.ok(it.z < -6.6 && it.z > -15.5 && Math.abs(it.x) < 7.2, `${n} ${it.kind} 제단 위`);
      if (it.kind !== 'veil') assert.ok(near(it.y, 0.6), `${n} ${it.kind} 높이 ${it.y}`);
    }
    const L2 = Logic.create(lay, { colliders: c.colliders.concat(pl.colliders), zones: c.zones }), S2 = Stations.create(L2), st2 = S2.stations();
    assert.ok(near(st2.altar.x, st.altar.x) && near(st2.altar.z, st.altar.z), n + ' 제대 앞');
    const r2 = WayCross.derive({ layout: lay, logic: L2, stations: S2, walls: c.walls, windows: c.windows, roses: c.roses, glassSlots: c.glassSlots });
    assert.equal(r2.plaques.length, 14, n);
  }
  const v = Liturgy.plan('yeouido', STATES.lent).items.find((i) => i.kind === 'veil');
  assert.deepEqual([v.x, v.y, v.z, v.h], [0, 6.35, -15.43, 2.8], '가림천 = 빌더 십자가 자리');
});

test('yeouido: 성능 예산(고화질 빌드) — 묶음 메시·삼각형·점광원 1·스프라이트 0·반사 바닥 0', () => {
  const ctx = Kit.createContext({ layout: lay, quality: 'high' });
  c.builder.build(ctx);
  const items = ctx._prepare();
  let tris = 0;
  for (const it of items) tris += it.batch.p.length / 9;
  let own = 0;
  ctx.root.traverse((o) => { if (o.isMesh) { own++; tris += o.geometry.attributes.position.count / 3; } });
  const meshes = items.length + own;
  assert.equal(own, 0, '전용 메시 없음: 모두 kit 묶음');
  assert.equal(ctx.stats.meshes, 0, 'ctx.plane·ctx.mesh 를 쓰지 않는다');
  assert.ok(meshes <= 16, '빌더 메시 ' + meshes);
  assert.ok(tris <= 45000, '삼각형 ' + tris);
  assert.ok(tris >= 15000, '삼각형이 너무 적다(빌드가 비었나) ' + tris);
  assert.equal(ctx._.lights.length, 1, '점광원 1개');
  assert.equal(ctx._.glows.length + ctx._.flames.length, 0, '스프라이트(개별 draw call) 없음: 빛은 발광 면으로');
  assert.equal(ctx._.floors.length, 0, '바닥 반사 없음');
  assert.ok(ctx._.cameraBounds && ctx._.cameraBounds.yMax <= 9, '카메라 yMax(천장 10m 아래)');
  const lo = Kit.createContext({ layout: lay, quality: 'low' });
  c.builder.build(lo);
  let lt = 0; for (const it of lo._prepare()) lt += it.batch.p.length / 9;
  assert.ok(lt < tris, 'low ' + lt + ' < high ' + tris);
  console.log(`# yeouido 고화질: 빌더 메시 ${meshes}(묶음 ${items.length} + 전용 ${own}), 삼각형 ${Math.round(tris)}, 충돌체 ${ctx._.colliders.length} / 간단: 삼각형 ${Math.round(lt)}`);
});
